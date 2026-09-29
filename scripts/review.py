#!/usr/bin/env python3
"""Lista los datos que llevan más de N días sin releer en su fuente.

Uso:  python3 scripts/review.py [--days 365] [--today AAAA-MM-DD] [--data DIR] [--fail]

Para cada fichero consultado hace N días o más imprime su fichero y una búsqueda en wol.jw.org para ver si hay
material más reciente. Cuenta la fecha del fichero y la de cada hecho anidado (cada relación, parada, candidato, y
cada nombre y fiesta de un mes): un fichero sale una sola vez, con la más antigua. Con --days 0 lista todo lo
consultado hasta hoy. Con --fail sale con código 1 si hay algo que revisar. Los nombres antiguos de las opciones
(--dias, --hoy, --fallar) se aceptan todavía.
"""
import argparse
import datetime
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

# Hechos anidados de cada carpeta (docs/investigacion/modelo.md, sección 4): llevan su propio checked_on.
NESTED = {"people": ["relations"], "journeys": ["stops"], "places": ["candidates"]}
NESTED_MONTH = ["names", "festivals"]


def oldest(obj, nested):
    """La fecha más antigua entre la del objeto y la de sus hechos anidados, o None si alguna falta."""
    fechas = [obj.get("checked_on")]
    for campo in nested:
        fechas += [h.get("checked_on") for h in obj.get(campo) or [] if isinstance(h, dict)]
    if any(not f for f in fechas):
        return None
    return min(datetime.date.fromisoformat(str(f)) for f in fechas)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Datos que toca releer en la fuente.")
    ap.add_argument("--days", "--dias", dest="days", type=int, default=365,
                    help="antigüedad máxima en días (por defecto 365)")
    ap.add_argument("--today", "--hoy", dest="today", default=None,
                    help="fecha de referencia AAAA-MM-DD (por defecto, hoy)")
    ap.add_argument("--data", default=str(build.RAIZ / "data"), help="directorio de datos (por defecto data/)")
    ap.add_argument("--fail", "--fallar", dest="fail", action="store_true",
                    help="sale con código 1 si hay algo que revisar")
    args = ap.parse_args(argv)
    hoy = datetime.date.fromisoformat(args.today) if args.today else datetime.date.today()
    limite = hoy - datetime.timedelta(days=args.days)
    datos, _ = build.cargar(args.data)
    if datos["_errores"]:
        for e in datos["_errores"]:
            print("ERROR", e, file=sys.stderr)
        return 2

    pendientes = []

    def mirar(c, tipo, oid, fichero, termino, siempre=True):
        """c es la fecha más antigua (date) o None si falta alguna."""
        if c is None:
            if siempre:
                pendientes.append(("nunca", tipo, oid, fichero, termino))
        elif c <= limite:
            pendientes.append((c.isoformat(), tipo, oid, fichero, termino))

    origen = datos.get("_origen_fuentes") or {}
    for fid, f in sorted(datos["sources"].items()):
        if f.get("implicit"):
            continue                      # capítulo creado desde books.yaml: se relee con el hecho que lo cita
        mirar(oldest(f, []), "fuente", fid, origen.get(fid, "data/sources/"), f.get("title") or fid)
    for l in datos["books"]:
        if l.get("checked_on"):
            mirar(oldest(l, []), "libro", l["slug"], "data/books.yaml", l["name"])
    cal = datos.get("calendar") or {}
    for m in cal.get("months") or []:
        if m.get("sources"):
            mirar(oldest(m, NESTED_MONTH), "calendario", m["id"], "data/calendar.yaml", m.get("name") or m["id"])
    for e in cal.get("explanation") or []:
        if e.get("sources"):
            mirar(oldest(e, []), "calendario", e["id"], "data/calendar.yaml", e.get("title") or e["id"])
    for tipo in build.TYPES:
        for o in datos[tipo]:
            mirar(oldest(o, NESTED.get(tipo, [])), tipo, o["id"], o["_fichero"], build.termino(tipo, o))

    if not pendientes:
        print(f"nada que revisar (nada consultado el {limite.isoformat()} o antes)")
        return 0
    print(f"{len(pendientes)} datos consultados el {limite.isoformat()} o antes:")
    for c, tipo, oid, fichero, termino in sorted(pendientes):
        print(f"- {c}  {tipo}/{oid}  ({fichero})")
        print(f"    {build.buscar_url(termino)}")
    return 1 if args.fail else 0


if __name__ == "__main__":
    sys.exit(main())
