#!/usr/bin/env python3
"""Compila data/*.yaml en dist/data.json, site/data.json, site/data.js,
dist/biblical-earth.sqlite y docs/investigacion/viajes-de-pablo.md.

Uso:  python3 scripts/build.py [--data DIR]

Todo lo que escribe es derivado: se edita el YAML y se vuelve a generar.
"""
import argparse
import datetime
import json
import sqlite3
import sys
import urllib.parse
from pathlib import Path

import yaml

RAIZ = Path(__file__).resolve().parent.parent
FORMATO = "biblical-earth/v0"
TIPOS = ["lugares", "personas", "viajes", "cartas", "eventos", "periodos"]
WOL_BUSCAR = "https://wol.jw.org/es/wol/s/r4/lp-s?q={q}&p=par&r=occ&st=a"
ORDEN_LIBROS = ["romanos", "1-corintios", "2-corintios", "galatas", "efesios", "filipenses", "colosenses",
                "1-tesalonicenses", "2-tesalonicenses", "1-timoteo", "2-timoteo", "tito", "filemon", "hebreos"]


# ---------------------------------------------------------------- carga

def _texto(v):
    """YAML convierte 2026-09-27 sin comillas en date; lo devolvemos como texto."""
    if isinstance(v, (datetime.date, datetime.datetime)):
        return v.isoformat()[:10]
    if isinstance(v, dict):
        return {k: _texto(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_texto(x) for x in v]
    return v


def cargar(data_dir):
    """Lee data/. Devuelve (datos, ficheros) donde ficheros[(tipo, id)] = ruta relativa."""
    data_dir = Path(data_dir)
    datos = {"fuentes": _texto(yaml.safe_load((data_dir / "fuentes.yaml").read_text(encoding="utf-8")) or {})}
    ficheros = {}
    for tipo in TIPOS:
        datos[tipo] = []
        for ruta in sorted((data_dir / tipo).glob("*.yaml")):
            obj = _texto(yaml.safe_load(ruta.read_text(encoding="utf-8")))
            obj["_fichero"] = f"data/{tipo}/{ruta.name}"
            obj["_nombre_fichero"] = ruta.stem
            datos[tipo].append(obj)
            ficheros[(tipo, obj.get("id"))] = obj["_fichero"]
    return datos, ficheros


# ---------------------------------------------------------------- integridad

def fuentes_de(obj):
    """Todas las listas de fuentes de un objeto, con la ruta donde están."""
    out = []

    def rec(x, camino):
        if isinstance(x, dict):
            for k, v in x.items():
                if k == "fuentes" and isinstance(v, list):
                    out.extend((camino + ".fuentes", f) for f in v)
                elif k == "fuente" and isinstance(v, str):
                    out.append((camino + ".fuente", v))
                else:
                    rec(v, f"{camino}.{k}")
        elif isinstance(x, list):
            for i, v in enumerate(x):
                rec(v, f"{camino}[{i}]")

    rec(obj, "")
    return out


def integridad(datos):
    """Comprueba que todo id referenciado existe. Devuelve una lista de errores."""
    errores = []
    fuentes = datos["fuentes"]
    ids = {t: {o.get("id") for o in datos[t]} for t in TIPOS}

    def ref(fichero, que, valor, tipo):
        if valor not in ids[tipo]:
            errores.append(f"{fichero}: {que} '{valor}' no existe en data/{tipo}/")

    for tipo in TIPOS:
        for o in datos[tipo]:
            f = o["_fichero"]
            for camino, fid in fuentes_de({k: v for k, v in o.items() if not k.startswith("_")}):
                if fid not in fuentes:
                    errores.append(f"{f}: fuente '{fid}' ({camino.lstrip('.')}) no existe en data/fuentes.yaml")
            if tipo == "viajes":
                ref(f, "persona", o.get("persona"), "personas")
                for p in o.get("companeros") or []:
                    ref(f, "compañero", p, "personas")
                for p in o.get("paradas") or []:
                    ref(f, f"parada {p.get('orden')}: lugar", p.get("lugar"), "lugares")
            elif tipo == "cartas":
                for lid in o.get("escrita_en") or []:
                    ref(f, "escrita_en", lid, "lugares")
                for lid in (o.get("destinatarios") or {}).get("lugares") or []:
                    ref(f, "destinatarios.lugares", lid, "lugares")
            elif tipo == "eventos":
                for lid in o.get("lugares") or []:
                    ref(f, "lugar", lid, "lugares")
                for pid in o.get("personas") or []:
                    ref(f, "persona", pid, "personas")
            elif tipo == "periodos":
                for lid in o.get("lugares") or []:
                    ref(f, "lugar", lid, "lugares")
    return errores


# ---------------------------------------------------------------- salida

def limpio(o):
    return {k: v for k, v in o.items() if not k.startswith("_")}


def clave_fecha(o):
    f = o.get("fecha") or {}
    d, h = f.get("desde"), f.get("hasta")
    return (d if d is not None else 10**6, h if h is not None else 10**6)


def componer(datos, hoy):
    cartas = sorted(datos["cartas"], key=lambda c: clave_fecha(c) + (
        ORDEN_LIBROS.index(c["id"]) if c["id"] in ORDEN_LIBROS else 99,))
    return {
        "formato": FORMATO,
        "generado": hoy,
        "fuentes": {k: datos["fuentes"][k] for k in sorted(datos["fuentes"])},
        "lugares": {o["id"]: limpio(o) for o in sorted(datos["lugares"], key=lambda o: o["id"])},
        "personas": {o["id"]: limpio(o) for o in sorted(datos["personas"], key=lambda o: o["id"])},
        "viajes": [limpio(o) for o in sorted(datos["viajes"], key=lambda o: clave_fecha(o) + (o["id"],))],
        "cartas": [limpio(o) for o in cartas],
        "eventos": [limpio(o) for o in sorted(datos["eventos"], key=lambda o: clave_fecha(o) + (o["id"],))],
        "periodos": [limpio(o) for o in sorted(datos["periodos"], key=lambda o: clave_fecha(o) + (o["id"],))],
    }


def escribir_json(salida, rutas, ruta_js):
    texto = json.dumps(salida, ensure_ascii=False, indent=1) + "\n"
    for r in rutas:
        r.parent.mkdir(parents=True, exist_ok=True)
        r.write_text(texto, encoding="utf-8")
    # Desde file:// el navegador no deja leer data.json; la web carga esta copia.
    js = ("// Copia de data.json para abrir el sitio desde file://. La genera scripts/build.py.\n"
          "window.BIBLICAL_EARTH_DATA = " + json.dumps(salida, ensure_ascii=False) + ";\n")
    ruta_js.write_text(js, encoding="utf-8")


def _fecha_cols(f):
    f = f or {}
    return (f.get("desde"), f.get("hasta"), f.get("precision"), int(bool(f.get("aprox"))), f.get("tipo"), f.get("texto"))


def escribir_sqlite(salida, ruta):
    ruta.parent.mkdir(parents=True, exist_ok=True)
    if ruta.exists():
        ruta.unlink()
    db = sqlite3.connect(ruta)
    fecha = "fecha_desde INTEGER, fecha_hasta INTEGER, fecha_precision TEXT, fecha_aprox INTEGER, fecha_tipo TEXT, fecha_texto TEXT"
    db.executescript(f"""
    CREATE TABLE fuentes (id TEXT PRIMARY KEY, titulo TEXT, obra TEXT, url TEXT, nivel INTEGER, publicado TEXT, consultado TEXT);
    CREATE TABLE lugares (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, lat REAL, lon REAL, precision TEXT,
        coord_fuente TEXT, coord_url TEXT, resumen TEXT, razon TEXT, consultado TEXT, estado TEXT);
    CREATE TABLE lugar_nombres (lugar_id TEXT REFERENCES lugares(id), orden INTEGER, nombre TEXT,
        desde INTEGER, hasta INTEGER, nota TEXT);
    CREATE TABLE personas (id TEXT PRIMARY KEY, nombre TEXT, nombres TEXT, resumen TEXT, razon TEXT, consultado TEXT, estado TEXT);
    CREATE TABLE viajes (id TEXT PRIMARY KEY, nombre TEXT, persona_id TEXT REFERENCES personas(id), referencia TEXT,
        {fecha}, companeros TEXT, resumen TEXT, razon TEXT, consultado TEXT, estado TEXT);
    CREATE TABLE paradas (viaje_id TEXT REFERENCES viajes(id), orden INTEGER, lugar_id TEXT REFERENCES lugares(id),
        referencia TEXT, {fecha}, nota TEXT, razon TEXT, estado TEXT, PRIMARY KEY (viaje_id, orden));
    CREATE TABLE cartas (id TEXT PRIMARY KEY, libro TEXT, referencia TEXT, escrita_en TEXT, {fecha},
        destinatarios_texto TEXT, destinatarios_lugares TEXT, contexto_origen TEXT, contexto_destino TEXT,
        razon TEXT, consultado TEXT, estado TEXT);
    CREATE TABLE eventos (id TEXT PRIMARY KEY, titulo TEXT, {fecha}, lugares TEXT, personas TEXT, pasajes TEXT,
        resumen TEXT, razon TEXT, consultado TEXT, estado TEXT);
    CREATE TABLE periodos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, {fecha}, lugares TEXT,
        resumen TEXT, razon TEXT, consultado TEXT, estado TEXT);
    CREATE TABLE hechos_fuentes (tipo TEXT, id TEXT, fuente_id TEXT REFERENCES fuentes(id));
    """)
    j = lambda x: json.dumps(x or [], ensure_ascii=False)

    def ins(tabla, valores):
        db.execute(f"INSERT INTO {tabla} VALUES ({','.join('?' * len(valores))})", valores)
    hf = []

    def fuentes_hecho(tipo, hid, obj):
        vistos = []
        for _, fid in fuentes_de(obj):
            if fid not in vistos:
                vistos.append(fid)
        hf.extend((tipo, hid, fid) for fid in vistos)

    for k, f in salida["fuentes"].items():
        ins("fuentes", (k, f["titulo"], f["obra"], f["url"], f["nivel"], f.get("publicado"), f.get("consultado")))
    for o in salida["lugares"].values():
        ins("lugares", (o["id"], o["nombre"], o["tipo"], o["lat"], o["lon"], o["precision"], o["coord_fuente"],
                    o["coord_url"], o["resumen"], o["razon"], o["consultado"], o["estado"]))
        for i, n in enumerate(o.get("nombres") or []):
            ins("lugar_nombres", (o["id"], i, n["nombre"], n.get("desde"), n.get("hasta"), n.get("nota")))
        fuentes_hecho("lugar", o["id"], o)
    for o in salida["personas"].values():
        ins("personas", (o["id"], o["nombre"], j(o.get("nombres")), o["resumen"], o["razon"], o["consultado"], o["estado"]))
        fuentes_hecho("persona", o["id"], o)
    for o in salida["viajes"]:
        ins("viajes", (o["id"], o["nombre"], o["persona"], o["referencia"], *_fecha_cols(o.get("fecha")),
                    j(o.get("companeros")), o["resumen"], o.get("razon"), o.get("consultado"), o.get("estado")))
        fuentes_hecho("viaje", o["id"], {k: v for k, v in o.items() if k != "paradas"})
        for p in o.get("paradas") or []:
            ins("paradas", (o["id"], p["orden"], p["lugar"], p["referencia"], *_fecha_cols(p.get("fecha")),
                        p.get("nota"), p["razon"], p["estado"]))
            fuentes_hecho("parada", f"{o['id']}#{p['orden']}", p)
    for o in salida["cartas"]:
        d = o.get("destinatarios") or {}
        ins("cartas", (o["id"], o["libro"], o["referencia"], j(o.get("escrita_en")), *_fecha_cols(o.get("fecha")),
                    d.get("texto"), j(d.get("lugares")), (o.get("contexto_origen") or {}).get("resumen"),
                    (o.get("contexto_destino") or {}).get("resumen"), o["razon"], o.get("consultado"), o["estado"]))
        fuentes_hecho("carta", o["id"], o)
    for o in salida["eventos"]:
        ins("eventos", (o["id"], o["titulo"], *_fecha_cols(o.get("fecha")), j(o.get("lugares")), j(o.get("personas")),
                    j(o.get("pasajes")), o["resumen"], o["razon"], o.get("consultado"), o["estado"]))
        fuentes_hecho("evento", o["id"], o)
    for o in salida["periodos"]:
        ins("periodos", (o["id"], o["nombre"], o["tipo"], *_fecha_cols(o.get("fecha")), j(o.get("lugares")),
                    o["resumen"], o["razon"], o.get("consultado"), o["estado"]))
        fuentes_hecho("periodo", o["id"], o)
    db.executemany("INSERT INTO hechos_fuentes VALUES (?,?,?)", hf)
    db.commit()
    db.close()
    return len(hf)


# ---------------------------------------------------------------- registro en markdown

def buscar_url(termino):
    return WOL_BUSCAR.format(q=urllib.parse.quote(termino))


def termino(tipo, o):
    if o.get("buscar"):
        return o["buscar"]
    return o.get("nombre") or o.get("libro") or o.get("titulo") or o["id"]


def _celda(s):
    return str(s if s is not None else "").replace("|", "\\|").replace("\n", " ")


def _fila(afirmacion, fichero, ids, fuentes, consultado, razon, estado):
    enlaces = ", ".join(f"[{i}]({fuentes[i]['url']})" if i in fuentes else i for i in ids)
    pub = sorted({str(fuentes[i]["publicado"]) for i in ids if i in fuentes and fuentes[i].get("publicado")})
    fich = f"[{fichero.removeprefix('data/')}](../../{fichero})"
    return "| " + " | ".join(_celda(x) for x in (afirmacion, fich, enlaces, ", ".join(pub) or "sin dato",
                                                   consultado, razon, estado)) + " |"


def escribir_markdown(salida, datos, ruta):
    F = salida["fuentes"]
    L = salida["lugares"]
    P = salida["personas"]
    fich = {(t, o["id"]): o["_fichero"] for t in TIPOS for o in datos[t]}
    cab = "| Afirmación | Fichero | Fuente | Publicado | Consultado | Por qué lo asociamos | Estado |\n|---|---|---|---|---|---|---|"
    out = [
        "<!-- Generado por scripts/build.py a partir de data/. No editar a mano. -->",
        "",
        "# Registro de investigación: viajes de Pablo",
        "",
        "> Este fichero lo genera `scripts/build.py` a partir de `data/`. No lo edites a mano: cambia el YAML y vuelve a generarlo.",
        "> El método está en [README.md](README.md).",
        "",
        f"Contiene {len(L)} lugares, {len(P)} personas, {len(salida['viajes'])} viajes con "
        f"{sum(len(v.get('paradas') or []) for v in salida['viajes'])} paradas, {len(salida['cartas'])} cartas, "
        f"{len(salida['eventos'])} eventos, {len(salida['periodos'])} periodos y {len(F)} fuentes.",
        "",
        "«Publicado» es el año de la publicación cuando la página de wol.jw.org lo muestra; si no lo muestra, pone «sin dato».",
        "",
    ]

    def seccion(titulo, filas):
        out.extend([f"## {titulo}", "", cab, *filas, ""])

    seccion("Lugares", [_fila(f"**{o['nombre']}** ({o['tipo']}, {o['precision']}): {o['resumen']}",
                              fich[("lugares", o["id"])], o["fuentes"], F, o["consultado"], o["razon"], o["estado"])
                        for o in L.values()])
    seccion("Personas", [_fila(f"**{o['nombre']}**: {o['resumen']}", fich[("personas", o["id"])], o["fuentes"], F,
                               o["consultado"], o["razon"], o["estado"]) for o in P.values()])
    seccion("Viajes", [_fila(f"**{o['nombre']}** ({o['referencia']}), {o['fecha']['texto']}: {o['resumen']}",
                             fich[("viajes", o["id"])], o["fuentes"], F, o.get("consultado"), o.get("razon"),
                             o.get("estado")) for o in salida["viajes"]])
    filas = []
    for v in salida["viajes"]:
        for p in v.get("paradas") or []:
            lug = L.get(p["lugar"], {}).get("nombre", p["lugar"])
            filas.append(_fila(f"{v['nombre']}, parada {p['orden']}: **{lug}** ({p['referencia']}), {p['fecha']['texto']}",
                               fich[("viajes", v["id"])], p["fuentes"], F, v.get("consultado"), p["razon"], p["estado"]))
    seccion("Paradas", filas)
    filas = []
    for o in salida["cartas"]:
        origen = " o ".join(L[i]["nombre"] for i in o["escrita_en"] if i in L)
        filas.append(_fila(f"**{o['libro']}** se escribió en {origen}, {o['fecha']['texto']}; "
                           f"destinatarios: {o['destinatarios']['texto']}",
                           fich[("cartas", o["id"])], o["fuentes"], F, o.get("consultado"), o["razon"], o["estado"]))
    seccion("Cartas", filas)
    filas = []
    for o in salida["eventos"]:
        donde = ", ".join(L[i]["nombre"] for i in o.get("lugares") or [] if i in L)
        filas.append(_fila(f"**{o['titulo']}** ({donde}; {'; '.join(o.get('pasajes') or [])}), {o['fecha']['texto']}",
                           fich[("eventos", o["id"])], o["fuentes"], F, o.get("consultado"), o["razon"], o["estado"]))
    seccion("Eventos", filas)
    seccion("Periodos", [_fila(f"**{o['nombre']}** ({o['tipo']}), {o['fecha']['texto']}", fich[("periodos", o["id"])],
                               o["fuentes"], F, o.get("consultado"), o["razon"], o["estado"]) for o in salida["periodos"]])

    out.extend(["## Fuentes", "", "| Id | Título | Obra | Nivel | Publicado | Consultado |", "|---|---|---|---|---|---|"])
    for k, f in F.items():
        out.append("| " + " | ".join(_celda(x) for x in (k, f"[{f['titulo']}]({f['url']})", f["obra"], f["nivel"],
                                                          f.get("publicado") or "sin dato", f.get("consultado"))) + " |")
    out.append("")

    out.extend(["## Qué revisar dentro de un año", "",
                "Una búsqueda en wol.jw.org por cada entidad, para ver si hay material más reciente. "
                "Si una publicación nueva dice otra cosa, gana la más reciente y el cambio se anota en `historial` "
                "(ver [README.md](README.md)).", ""])
    grupos = [("Lugares", "lugares", list(L.values())), ("Personas", "personas", list(P.values())),
              ("Viajes", "viajes", salida["viajes"]), ("Cartas", "cartas", salida["cartas"]),
              ("Eventos", "eventos", salida["eventos"]), ("Periodos", "periodos", salida["periodos"])]
    for titulo, tipo, objs in grupos:
        out.extend([f"### {titulo}", ""])
        for o in objs:
            t = termino(tipo, o)
            out.append(f"- {o.get('nombre') or o.get('libro') or o.get('titulo')}: [buscar «{t}»]({buscar_url(t)})")
        out.append("")
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text("\n".join(out), encoding="utf-8")


# ---------------------------------------------------------------- main

def main(argv=None):
    ap = argparse.ArgumentParser(description="Compila data/ en dist/, site/data.json, site/data.js y el registro de investigación.")
    ap.add_argument("--data", default=str(RAIZ / "data"), help="directorio de datos (por defecto data/)")
    args = ap.parse_args(argv)
    datos, _ = cargar(args.data)
    errores = integridad(datos)
    if errores:
        for e in errores:
            print("ERROR", e, file=sys.stderr)
        print(f"build: {len(errores)} errores de integridad; no se escribe nada.", file=sys.stderr)
        return 1
    salida = componer(datos, datetime.date.today().isoformat())
    escribir_json(salida, [RAIZ / "dist" / "data.json", RAIZ / "site" / "data.json"], RAIZ / "site" / "data.js")
    n_hf = escribir_sqlite(salida, RAIZ / "dist" / "biblical-earth.sqlite")
    escribir_markdown(salida, datos, RAIZ / "docs" / "investigacion" / "viajes-de-pablo.md")
    print(f"build: {len(salida['fuentes'])} fuentes, {len(salida['lugares'])} lugares, {len(salida['personas'])} personas, "
          f"{len(salida['viajes'])} viajes, {len(salida['cartas'])} cartas, {len(salida['eventos'])} eventos, "
          f"{len(salida['periodos'])} periodos, {n_hf} filas en hechos_fuentes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
