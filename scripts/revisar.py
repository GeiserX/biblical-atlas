#!/usr/bin/env python3
"""Lista los datos que llevan más de N días sin releer en su fuente.

Uso:  python3 scripts/revisar.py [--dias 365] [--hoy AAAA-MM-DD] [--data DIR] [--fallar]

Para cada hecho consultado hace N días o más imprime su fichero y una búsqueda
en wol.jw.org para ver si hay material más reciente. Con --dias 0 lista todo lo
consultado hasta hoy. Con --fallar sale con código 1 si hay algo que revisar.
"""
import argparse
import datetime
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402


def main(argv=None):
    ap = argparse.ArgumentParser(description="Datos que toca releer en la fuente.")
    ap.add_argument("--dias", "--days", type=int, default=365, help="antigüedad máxima en días (por defecto 365)")
    ap.add_argument("--hoy", default=None, help="fecha de referencia AAAA-MM-DD (por defecto, hoy)")
    ap.add_argument("--data", default=str(build.RAIZ / "data"), help="directorio de datos (por defecto data/)")
    ap.add_argument("--fallar", action="store_true", help="sale con código 1 si hay algo que revisar")
    args = ap.parse_args(argv)
    hoy = datetime.date.fromisoformat(args.hoy) if args.hoy else datetime.date.today()
    limite = hoy - datetime.timedelta(days=args.dias)
    datos, _ = build.cargar(args.data)

    pendientes = []
    for fid, f in sorted(datos["fuentes"].items()):
        c = f.get("consultado")
        if not c or datetime.date.fromisoformat(str(c)) <= limite:
            pendientes.append((c or "nunca", "fuente", fid, "data/fuentes.yaml", f.get("titulo") or fid))
    for tipo in build.TIPOS:
        for o in datos[tipo]:
            c = o.get("consultado")
            if not c or datetime.date.fromisoformat(str(c)) <= limite:
                pendientes.append((c or "nunca", tipo, o["id"], o["_fichero"], build.termino(tipo, o)))

    if not pendientes:
        print(f"nada que revisar (nada consultado el {limite.isoformat()} o antes)")
        return 0
    print(f"{len(pendientes)} datos consultados el {limite.isoformat()} o antes:")
    for c, tipo, oid, fichero, termino in sorted(pendientes):
        print(f"- {c}  {tipo}/{oid}  ({fichero})")
        print(f"    {build.buscar_url(termino)}")
    return 1 if args.fallar else 0


if __name__ == "__main__":
    sys.exit(main())
