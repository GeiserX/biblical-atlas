#!/usr/bin/env python3
"""Valida data/*.yaml: esquema, fechas, identificadores, fuentes y razones.

Uso:  python3 scripts/validate.py [--data DIR] [--links]

--links descarga cada URL una sola vez (GET, 0,5 s entre peticiones) y falla si alguna no da 200.
Sale con código distinto de cero ante cualquier error.
"""
import argparse
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

ID = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
DIA = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MAX_PALABRAS = 40
PRECISIONES = {"día", "mes", "estación", "año", "rango"}
ESTADOS = {"verificado", "pendiente"}
TIPOS_LUGAR = {"ciudad", "region", "isla", "provincia", "puerto", "cabo"}
PRECISION_LUGAR = {"punto", "zona", "incierto"}
TIPOS_ENLACE = {"perspicacia", "biblia", "video", "externo"}
TIPOS_PERIODO = {"emperador", "gobernador", "potencia"}
CAMPOS_TEXTO = {"resumen", "razon", "nota", "cambio"}

REQUERIDOS = {
    "lugares": ["id", "nombre", "nombres", "tipo", "lat", "lon", "precision", "coord_fuente", "coord_url",
                "resumen", "razon", "fuentes", "enlaces", "consultado", "estado"],
    "personas": ["id", "nombre", "nombres", "resumen", "razon", "fuentes", "enlaces", "consultado", "estado"],
    "viajes": ["id", "nombre", "persona", "referencia", "fecha", "companeros", "resumen", "razon", "fuentes",
               "consultado", "estado", "paradas"],
    "cartas": ["id", "libro", "referencia", "escrita_en", "fecha", "destinatarios", "contexto_origen",
               "contexto_destino", "razon", "fuentes", "enlaces", "consultado", "estado"],
    "eventos": ["id", "titulo", "fecha", "lugares", "personas", "pasajes", "resumen", "razon", "fuentes",
                "consultado", "estado"],
    "periodos": ["id", "nombre", "tipo", "fecha", "resumen", "razon", "fuentes", "consultado", "estado"],
}
REQ_PARADA = ["orden", "lugar", "referencia", "fecha", "nota", "razon", "fuentes", "estado"]
REQ_FUENTE = ["titulo", "obra", "url", "nivel", "publicado", "consultado"]


def validar_fecha(f, donde, err):
    if not isinstance(f, dict):
        err(f"{donde}: fecha debe ser un objeto")
        return
    for k in ("desde", "hasta", "precision", "aprox", "tipo", "cronologia", "texto"):
        if k not in f:
            err(f"{donde}: fecha sin '{k}'")
    d, h = f.get("desde"), f.get("hasta")
    for k, v in (("desde", d), ("hasta", h)):
        if v is not None and (not isinstance(v, int) or isinstance(v, bool)):
            err(f"{donde}: fecha.{k} debe ser un entero (año astronómico) o null, no {v!r}")
    if isinstance(d, int) and isinstance(h, int) and d > h:
        err(f"{donde}: fecha.desde ({d}) es posterior a fecha.hasta ({h})")
    for k, v in (("desde", d), ("hasta", h)):
        if isinstance(v, int) and not -4100 <= v <= 2100:
            err(f"{donde}: fecha.{k} = {v} fuera de rango")
    if f.get("precision") not in PRECISIONES:
        err(f"{donde}: fecha.precision '{f.get('precision')}' no es una de {sorted(PRECISIONES)}")
    if not isinstance(f.get("aprox"), bool):
        err(f"{donde}: fecha.aprox debe ser true o false")
    if f.get("tipo") not in ("anclada", "narrativa"):
        err(f"{donde}: fecha.tipo debe ser anclada o narrativa")
    if f.get("cronologia") not in ("tnm", "secular"):
        err(f"{donde}: fecha.cronologia debe ser tnm o secular")
    if not str(f.get("texto") or "").strip():
        err(f"{donde}: fecha.texto vacío")


def validar_comun(o, donde, err, fuentes):
    fs = o.get("fuentes")
    if not isinstance(fs, list) or not fs:
        err(f"{donde}: 'fuentes' vacío")
    if not str(o.get("razon") or "").strip():
        err(f"{donde}: 'razon' vacía")
    if "estado" in o and o["estado"] not in ESTADOS:
        err(f"{donde}: estado '{o['estado']}' no es verificado ni pendiente")
    if "consultado" in o and not DIA.match(str(o["consultado"])):
        err(f"{donde}: consultado '{o['consultado']}' no es AAAA-MM-DD")
    for i, e in enumerate(o.get("enlaces") or []):
        if e.get("tipo") not in TIPOS_ENLACE:
            err(f"{donde}: enlaces[{i}].tipo '{e.get('tipo')}' no válido")
        if not str(e.get("url", "")).startswith("https://") or not e.get("titulo"):
            err(f"{donde}: enlaces[{i}] necesita titulo y url https")
    for i, h in enumerate(o.get("historial") or []):
        for k in ("fecha", "cambio", "fuente"):
            if not h.get(k):
                err(f"{donde}: historial[{i}] sin '{k}'")
        if h.get("fecha") and not DIA.match(str(h["fecha"])):
            err(f"{donde}: historial[{i}].fecha no es AAAA-MM-DD")


def textos_largos(x, camino, err):
    """Heurística «no copiar de jw.org»: ningún resumen, razón o nota pasa de MAX_PALABRAS palabras."""
    if isinstance(x, dict):
        for k, v in x.items():
            if k in CAMPOS_TEXTO and isinstance(v, str) and len(v.split()) > MAX_PALABRAS:
                err(f"{camino}.{k}: {len(v.split())} palabras (máximo {MAX_PALABRAS}); ¿texto copiado? Resúmelo con palabras propias")
            else:
                textos_largos(v, f"{camino}.{k}", err)
    elif isinstance(x, list):
        for i, v in enumerate(x):
            textos_largos(v, f"{camino}[{i}]", err)


def pablo_en_su_sitio(datos):
    """Una carta o un suceso de Pablo fechado dentro de sus viajes tiene que coincidir con una parada en uno de sus
    lugares. Si no, el mapa dibujaría la carta en un sitio mientras pone a Pablo en otro."""
    paradas = []
    for v in datos["viajes"]:
        if v.get("persona") != "pablo":
            continue
        for p in v.get("paradas") or []:
            f = p.get("fecha") or {}
            if isinstance(f.get("desde"), int) and isinstance(f.get("hasta"), int):
                paradas.append((p.get("lugar"), f["desde"], f["hasta"]))
    if not paradas:
        return []
    ini, fin = min(p[1] for p in paradas), max(p[2] for p in paradas)
    casos = [(c["_fichero"], c.get("escrita_en") or [], c.get("fecha") or {}) for c in datos["cartas"]]
    casos += [(e["_fichero"], e.get("lugares") or [], e.get("fecha") or {})
              for e in datos["eventos"] if "pablo" in (e.get("personas") or [])]
    errores = []
    for donde, lugares, f in casos:
        d, h = f.get("desde"), f.get("hasta")
        if not isinstance(d, int) or not isinstance(h, int) or d < ini or h > fin:
            continue                      # fuera de los viajes no sabemos dónde estaba: nada que comparar
        if not any(lugar in lugares and pd <= h and d <= ph for lugar, pd, ph in paradas):
            errores.append(f"{donde}: {f.get('texto')} cae dentro de los viajes, pero ninguna parada de Pablo en "
                           f"{', '.join(lugares)} coincide con esas fechas")
    return errores


def validar(datos):
    errores = []
    err = errores.append
    fuentes = datos["fuentes"]
    for fid, f in fuentes.items():
        if not ID.match(str(fid)):
            err(f"data/fuentes.yaml: id '{fid}' no es un slug ASCII en minúsculas")
        for k in REQ_FUENTE:
            if k not in (f or {}):
                err(f"data/fuentes.yaml: {fid} sin '{k}'")
        if (f or {}).get("nivel") not in (1, 2):
            err(f"data/fuentes.yaml: {fid}.nivel debe ser 1 o 2")
        if not str((f or {}).get("url", "")).startswith("https://"):
            err(f"data/fuentes.yaml: {fid}.url debe ser https")
        if (f or {}).get("consultado") and not DIA.match(str(f["consultado"])):
            err(f"data/fuentes.yaml: {fid}.consultado no es AAAA-MM-DD")
    textos_largos(fuentes, "data/fuentes.yaml", err)

    for tipo in build.TIPOS:
        vistos = set()
        for o in datos[tipo]:
            donde = o["_fichero"]
            limpio = {k: v for k, v in o.items() if not k.startswith("_")}
            for k in REQUERIDOS[tipo]:
                if k not in limpio:
                    err(f"{donde}: falta '{k}'")
            oid = o.get("id")
            if not ID.match(str(oid)):
                err(f"{donde}: id '{oid}' no es un slug ASCII en minúsculas")
            if oid != o["_nombre_fichero"]:
                err(f"{donde}: id '{oid}' no coincide con el nombre del fichero")
            if oid in vistos:
                err(f"{donde}: id '{oid}' repetido")
            vistos.add(oid)
            validar_comun(limpio, donde, err, fuentes)
            if "fecha" in limpio:
                validar_fecha(limpio["fecha"], donde, err)
            textos_largos(limpio, donde, err)
            if tipo == "lugares":
                if limpio.get("tipo") not in TIPOS_LUGAR:
                    err(f"{donde}: tipo '{limpio.get('tipo')}' no es uno de {sorted(TIPOS_LUGAR)}")
                if limpio.get("precision") not in PRECISION_LUGAR:
                    err(f"{donde}: precision '{limpio.get('precision')}' no válida")
                lat, lon = limpio.get("lat"), limpio.get("lon")
                if not isinstance(lat, (int, float)) or not -90 <= lat <= 90:
                    err(f"{donde}: lat fuera de rango")
                if not isinstance(lon, (int, float)) or not -180 <= lon <= 180:
                    err(f"{donde}: lon fuera de rango")
                if not any(e.get("tipo") == "perspicacia" for e in limpio.get("enlaces") or []) and limpio.get("estado") != "pendiente":
                    err(f"{donde}: sin enlace a Perspicacia debe llevar estado: pendiente")
            if tipo in ("lugares", "personas"):
                for i, n in enumerate(limpio.get("nombres") or []):
                    if not n.get("nombre"):
                        err(f"{donde}: nombres[{i}] sin 'nombre'")
                    for k in ("desde", "hasta"):
                        if k in n and not isinstance(n[k], int):
                            err(f"{donde}: nombres[{i}].{k} debe ser un año entero")
                if not limpio.get("nombres"):
                    err(f"{donde}: 'nombres' vacío")
            if tipo == "viajes":
                ordenes = []
                for i, p in enumerate(limpio.get("paradas") or []):
                    pd = f"{donde} parada {p.get('orden', i)}"
                    for k in REQ_PARADA:
                        if k not in p:
                            err(f"{pd}: falta '{k}'")
                    validar_comun(p, pd, err, fuentes)
                    if "fecha" in p:
                        validar_fecha(p["fecha"], pd, err)
                    ordenes.append(p.get("orden"))
                if ordenes != list(range(1, len(ordenes) + 1)):
                    err(f"{donde}: las paradas deben numerarse 1, 2, 3... sin huecos")
            if tipo == "cartas":
                for k in ("contexto_origen", "contexto_destino"):
                    c = limpio.get(k) or {}
                    if not c.get("resumen") or not c.get("fuentes"):
                        err(f"{donde}: {k} necesita resumen y fuentes")
                if not (limpio.get("destinatarios") or {}).get("texto"):
                    err(f"{donde}: destinatarios.texto vacío")
            if tipo == "periodos" and limpio.get("tipo") not in TIPOS_PERIODO:
                err(f"{donde}: tipo '{limpio.get('tipo')}' no es uno de {sorted(TIPOS_PERIODO)}")
    errores.extend(build.integridad(datos))
    errores.extend(pablo_en_su_sitio(datos))
    return errores


def urls(datos):
    vistas = []

    def rec(x):
        if isinstance(x, dict):
            for k, v in x.items():
                if k in ("url", "coord_url") and isinstance(v, str):
                    if v not in vistas:
                        vistas.append(v)
                else:
                    rec(v)
        elif isinstance(x, list):
            for v in x:
                rec(v)

    rec(datos["fuentes"])
    for t in build.TIPOS:
        rec([{k: v for k, v in o.items() if not k.startswith("_")} for o in datos[t]])
    return vistas


def comprobar_enlaces(lista):
    fallos = []
    for i, u in enumerate(lista):
        if i:
            time.sleep(0.5)
        req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                code = r.status
        except urllib.error.HTTPError as e:
            code = e.code
        except Exception as e:  # noqa: BLE001  (DNS, tiempo agotado...)
            code = f"{type(e).__name__}: {e}"
        if code != 200:
            fallos.append(f"{u} -> {code}")
    return fallos


def main(argv=None):
    ap = argparse.ArgumentParser(description="Valida los datos de biblical-earth.")
    ap.add_argument("--data", default=str(build.RAIZ / "data"), help="directorio de datos (por defecto data/)")
    ap.add_argument("--links", action="store_true", help="comprueba que cada URL responde 200")
    args = ap.parse_args(argv)
    datos, _ = build.cargar(args.data)
    errores = validar(datos)
    for e in errores:
        print("ERROR", e)
    n = sum(len(datos[t]) for t in build.TIPOS)
    print(f"validate: {n} ficheros de entidades y {len(datos['fuentes'])} fuentes; {len(errores)} errores de esquema.")
    fallos = []
    if args.links:
        lista = urls(datos)
        fallos = comprobar_enlaces(lista)
        for f in fallos:
            print("ENLACE ROTO", f)
        print(f"validate --links: {len(lista)} enlaces comprobados, {len(fallos)} fallos.")
    return 1 if errores or fallos else 0


if __name__ == "__main__":
    sys.exit(main())
