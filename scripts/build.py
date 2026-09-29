#!/usr/bin/env python3
"""Compila data/ en dist/data.json, site/data.json, site/data.js, dist/biblical-earth.sqlite
y el registro de investigación de docs/investigacion/registro/.

Uso:  python3 scripts/build.py [--data DIR] [--salida DIR]

Con --salida DIR escribe data.json, data.js, biblical-earth.sqlite y registro/ dentro de DIR y no toca
site/, dist/ ni docs/. Sirve para probar datos sin pisar lo que compila otro.

Todo lo que escribe es derivado: se edita el YAML y se vuelve a generar.
"""
import argparse
import datetime
import json
import re
import sqlite3
import sys
import unicodedata
import urllib.parse
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
import cobertura  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
FORMATO = "biblical-earth/v0"
TIPOS = ["lugares", "personas", "viajes", "cartas", "eventos", "periodos", "hallazgos", "recorridos"]
# Tipo de cada carpeta en singular, tal como lo usa el sitio en la dirección (#sel=lugar:filipos).
SINGULAR = {"lugares": "lugar", "personas": "persona", "viajes": "viaje", "cartas": "carta", "eventos": "evento",
            "periodos": "periodo", "hallazgos": "hallazgo", "recorridos": "recorrido"}
WOL_BUSCAR = "https://wol.jw.org/es/wol/s/r4/lp-s?q={q}&p=par&r=occ&st=a"
WOL_CAPITULO = "https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/{num}/{cap}"
OBRA_TNM = "La Biblia. Traducción del Nuevo Mundo (edición de estudio)"
ORDEN_LIBROS = ["romanos", "1-corintios", "2-corintios", "galatas", "efesios", "filipenses", "colosenses",
                "1-tesalonicenses", "2-tesalonicenses", "1-timoteo", "2-timoteo", "tito", "filemon", "hebreos"]
CAPITULO = re.compile(r"^([a-z0-9]+(?:-[a-z0-9]+)*)-(\d+)$")


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


def _leer(ruta):
    return _texto(yaml.safe_load(ruta.read_text(encoding="utf-8")))


def _fundir_fuentes(data_dir, errores):
    """Junta data/fuentes/*.yaml. Un id repetido con la misma url y el mismo titulo se funde (gana el
    `consultado` más reciente); con datos distintos es un error que nombra los dos ficheros."""
    fuentes, origen = {}, {}
    for ruta in sorted((data_dir / "fuentes").glob("*.yaml")):
        rel = f"data/fuentes/{ruta.name}"
        contenido = _leer(ruta) or {}
        if not isinstance(contenido, dict):
            errores.append(f"{rel}: debe ser un mapa id: {{titulo, obra, url, ...}}")
            continue
        for fid, f in contenido.items():
            if f is not None and not isinstance(f, dict):
                errores.append(f"{rel}: la fuente '{fid}' debe ser un mapa {{titulo, obra, url, ...}}, no {f!r}")
                continue
            f = dict(f or {})
            if fid not in fuentes:
                fuentes[fid], origen[fid] = f, rel
                continue
            previa, choque = fuentes[fid], []
            for k in ("url", "titulo"):
                if previa.get(k) != f.get(k):
                    choque.append(k)
            for k in set(previa) | set(f):
                a, b = previa.get(k), f.get(k)
                if k in ("url", "titulo") or a == b or a is None or b is None:
                    continue
                if k == "consultado":
                    continue
                choque.append(k)
            if choque:
                errores.append(f"{origen[fid]} y {rel}: la fuente '{fid}' está en los dos con datos distintos "
                               f"({', '.join(sorted(set(choque)))}); unifícala o usa otro id")
                continue
            for k, b in f.items():
                a = previa.get(k)
                if a is None or (k == "consultado" and b is not None and str(b) > str(a)):
                    previa[k] = b
            origen[fid] = f"{origen[fid]}, {rel}"
    return fuentes, origen


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


def capitulo_de(fid, libros):
    """('mateo', 26) -> (libro, 26) si el id tiene forma <slug>-<cap> y el slug es un libro; si no, None."""
    m = CAPITULO.match(str(fid))
    if not m:
        return None
    libro = next((l for l in libros if l.get("slug") == m.group(1)), None)
    return (libro, int(m.group(2))) if libro else None


def fuente_capitulo(libro, cap):
    return {"titulo": f"{libro['nombre']} {cap}", "obra": OBRA_TNM,
            "url": WOL_CAPITULO.format(num=libro["num"], cap=cap), "nivel": 1, "publicado": None,
            "consultado": None, "implicita": True}


def cargar(data_dir):
    """Lee data/. Devuelve (datos, ficheros) donde ficheros[(tipo, id)] = ruta relativa.

    Solo recorre data/fuentes/*.yaml, data/libros.yaml, data/calendario.yaml, data/<tipo>/*.yaml y
    data/cobertura/*.yaml (que va a datos["cobertura"]): data/_propuestas/ y cualquier otra carpeta quedan fuera. Los errores de carga (fuentes repetidas con datos
    distintos) van a datos["_errores"] y los informa integridad().
    """
    data_dir = Path(data_dir)
    errores = []
    fuentes, origen = _fundir_fuentes(data_dir, errores)
    libros = ((_leer(data_dir / "libros.yaml") or {}).get("libros") or []) if (data_dir / "libros.yaml").exists() else []
    calendario = (_leer(data_dir / "calendario.yaml") or {}) if (data_dir / "calendario.yaml").exists() else {}
    datos = {"fuentes": fuentes, "libros": libros, "calendario": calendario, "_errores": errores,
             "_origen_fuentes": origen}
    ficheros = {}
    for tipo in TIPOS:
        datos[tipo] = []
        for ruta in sorted((data_dir / tipo).glob("*.yaml")):
            obj = _leer(ruta)
            if not isinstance(obj, dict):
                errores.append(f"data/{tipo}/{ruta.name}: el fichero no es un mapa YAML")
                continue
            obj["_fichero"] = f"data/{tipo}/{ruta.name}"
            obj["_nombre_fichero"] = ruta.stem
            datos[tipo].append(obj)
            ficheros[(tipo, obj.get("id"))] = obj["_fichero"]
    datos["cobertura"] = cobertura.cargar(data_dir, errores)

    # Capítulos de la Biblia como fuentes implícitas: <slug>-<cap> que nadie ha escrito se crea desde libros.yaml.
    citadas = [fid for t in TIPOS for o in datos[t] for _, fid in fuentes_de(limpio(o))]
    citadas += [fid for l in libros for _, fid in fuentes_de(l)]
    citadas += [fid for m in calendario.get("meses") or [] for _, fid in fuentes_de(m)]
    citadas += [fid for e in calendario.get("explicacion") or [] for _, fid in fuentes_de(e)]
    for fid in citadas:
        if fid in fuentes:
            continue
        cap = capitulo_de(fid, libros)
        if cap and 1 <= cap[1] <= int(cap[0].get("capitulos") or 0):
            fuentes[fid] = fuente_capitulo(*cap)
            origen[fid] = "data/libros.yaml (capítulo implícito)"
    return datos, ficheros


# ---------------------------------------------------------------- integridad

def ids_por_tipo(datos):
    return {t: {o.get("id") for o in datos[t]} for t in TIPOS}


def existe_sel(datos, sel, ids=None):
    """¿Existe la selección «tipo:id» del sitio? tipo en singular (lugar, persona, carta, viaje, parada, evento,
    periodo, hallazgo, recorrido, pasaje, libro). Parada: «viaje/orden». Pasaje: «<abr sin tildes>-<cap>» (hch-16)."""
    ids = ids or ids_por_tipo(datos)
    tipo, _, oid = str(sel).partition(":")
    if not oid:
        return False
    plural = {v: k for k, v in SINGULAR.items()}
    if tipo in plural:
        return oid in ids[plural[tipo]]
    if tipo == "parada":
        viaje, _, orden = oid.partition("/")
        v = next((v for v in datos["viajes"] if v.get("id") == viaje), None)
        return bool(v) and any(str(p.get("orden")) == orden for p in v.get("paradas") or [])
    if tipo == "libro":
        return any(l.get("slug") == oid for l in datos["libros"])
    if tipo == "pasaje":
        m = re.match(r"^([1-3]?[a-z]+)-(\d+)$", oid)
        if not m:
            return False
        libro = next((l for l in datos["libros"] if _sin_tildes(l.get("abr", "")).lower() == m.group(1)), None)
        return bool(libro) and 1 <= int(m.group(2)) <= int(libro.get("capitulos") or 0)
    return False


def _sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", str(s)) if unicodedata.category(c) != "Mn")


def integridad(datos):
    """Comprueba que todo id referenciado existe. Devuelve una lista de errores."""
    errores = list(datos.get("_errores") or [])
    fuentes = datos["fuentes"]
    ids = ids_por_tipo(datos)

    def ref(fichero, que, valor, tipo):
        if valor not in ids[tipo]:
            errores.append(f"{fichero}: {que} '{valor}' no existe en data/{tipo}/")

    def fuente(fichero, camino, fid):
        if fid in fuentes:
            return
        cap = capitulo_de(fid, datos["libros"])
        if cap:
            errores.append(f"{fichero}: fuente '{fid}' ({camino.lstrip('.')}): {cap[0]['nombre']} no tiene "
                           f"capítulo {cap[1]} (tiene {cap[0].get('capitulos')})")
        else:
            errores.append(f"{fichero}: fuente '{fid}' ({camino.lstrip('.')}) no existe en data/fuentes/")

    for l in datos["libros"]:
        for camino, fid in fuentes_de(l):
            fuente(f"data/libros.yaml ({l.get('slug')})", camino, fid)
    for m in datos["calendario"].get("meses") or []:
        for camino, fid in fuentes_de(m):
            fuente(f"data/calendario.yaml ({m.get('id')})", camino, fid)
    for e in datos["calendario"].get("explicacion") or []:
        for camino, fid in fuentes_de(e):
            fuente(f"data/calendario.yaml (explicacion {e.get('id')})", camino, fid)

    for tipo in TIPOS:
        for o in datos[tipo]:
            f = o["_fichero"]
            for camino, fid in fuentes_de(limpio(o)):
                fuente(f, camino, fid)
            for i, r in enumerate(o.get("relaciones") or []):
                if not isinstance(r, dict):
                    continue
                if r.get("persona") is not None:
                    ref(f, f"relaciones[{i}].persona", r["persona"], "personas")
                if r.get("lugar") is not None:
                    ref(f, f"relaciones[{i}].lugar", r["lugar"], "lugares")
            for pid in o.get("no_confundir_con") or []:
                ref(f, "no_confundir_con", pid, "personas")
            if tipo == "viajes":
                ref(f, "persona", o.get("persona"), "personas")
                for p in o.get("companeros") or []:
                    ref(f, "compañero", p, "personas")
                for p in o.get("paradas") or []:
                    ref(f, f"parada {p.get('orden')}: lugar", p.get("lugar"), "lugares")
            elif tipo == "cartas":
                ref(f, "escritor", o.get("escritor"), "personas")
                for lid in o.get("escrita_en") or []:
                    ref(f, "escrita_en", lid, "lugares")
                for lid in (o.get("destinatarios") or {}).get("lugares") or []:
                    ref(f, "destinatarios.lugares", lid, "lugares")
                for pid in (o.get("destinatarios") or {}).get("personas") or []:
                    ref(f, "destinatarios.personas", pid, "personas")
                for pid in o.get("portadores") or []:
                    ref(f, "portadores", pid, "personas")
                for pid in o.get("personas") or []:
                    ref(f, "personas", pid, "personas")
            elif tipo == "eventos":
                for lid in o.get("lugares") or []:
                    ref(f, "lugar", lid, "lugares")
                for pid in o.get("personas") or []:
                    ref(f, "persona", pid, "personas")
                orden = o.get("orden_relato")
                tras = orden.get("tras") if isinstance(orden, dict) else None
                if isinstance(tras, str):
                    ref(f, "orden_relato.tras", tras, "eventos")
                elif tras is not None:
                    errores.append(f"{f}: orden_relato.tras debe ser el id de un evento, no {type(tras).__name__}")
                for pid in o.get("presentes") or []:
                    if pid not in (o.get("personas") or []):
                        errores.append(f"{f}: presentes nombra a '{pid}', que no está en personas")
            elif tipo == "periodos":
                for lid in o.get("lugares") or []:
                    ref(f, "lugar", lid, "lugares")
                if o.get("persona") is not None:
                    ref(f, "persona", o["persona"], "personas")
            elif tipo == "hallazgos":
                ref(f, "lugar_hallazgo", o.get("lugar_hallazgo"), "lugares")
                for sel in o.get("relaciona") or []:
                    if not existe_sel(datos, sel, ids):
                        errores.append(f"{f}: relaciona '{sel}' no existe (formato tipo:id, p. ej. lugar:corinto)")
            elif tipo == "recorridos":
                for i, p in enumerate(o.get("paradas") or []):
                    sel = (p or {}).get("sel")
                    if not existe_sel(datos, sel, ids):
                        errores.append(f"{f}: paradas[{i}].sel '{sel}' no existe (formato tipo:id, p. ej. lugar:corinto)")
    errores.extend(cobertura.errores_referencias(datos))
    return errores


# ---------------------------------------------------------------- salida

def limpio(o):
    return {k: v for k, v in o.items() if not k.startswith("_")}


def clave_fecha(o, campo="fecha"):
    f = o.get(campo) or {}
    d, h = f.get("desde"), f.get("hasta")
    return (d if d is not None else 10**6, h if h is not None else 10**6)


def componer(datos, hoy):
    cartas = sorted(datos["cartas"], key=lambda c: clave_fecha(c) + (
        ORDEN_LIBROS.index(c["id"]) if c["id"] in ORDEN_LIBROS else 99, c["id"]))
    return {
        "formato": FORMATO,
        "generado": hoy,
        "fuentes": {k: datos["fuentes"][k] for k in sorted(datos["fuentes"])},
        "libros": datos["libros"],
        "calendario": datos["calendario"],
        "lugares": {o["id"]: limpio(o) for o in sorted(datos["lugares"], key=lambda o: o["id"])},
        "personas": {o["id"]: limpio(o) for o in sorted(datos["personas"], key=lambda o: o["id"])},
        "viajes": [limpio(o) for o in sorted(datos["viajes"], key=lambda o: clave_fecha(o) + (o["id"],))],
        "cartas": [limpio(o) for o in cartas],
        "eventos": [limpio(o) for o in sorted(datos["eventos"], key=lambda o: clave_fecha(o) + (o["id"],))],
        "periodos": [limpio(o) for o in sorted(datos["periodos"], key=lambda o: clave_fecha(o) + (o["id"],))],
        "hallazgos": [limpio(o) for o in sorted(datos["hallazgos"],
                                                key=lambda o: clave_fecha(o, "fecha_objeto") + (o["id"],))],
        "recorridos": [limpio(o) for o in sorted(datos["recorridos"], key=lambda o: o["id"])],
        # Resumen de data/cobertura/: solo los libros que tienen fichero. El sitio todavía no lo muestra.
        "cobertura": cobertura.para_el_sitio(datos),
    }


def escribir_json(salida, rutas, ruta_js):
    texto = json.dumps(salida, ensure_ascii=False, indent=1) + "\n"
    for r in rutas:
        r.parent.mkdir(parents=True, exist_ok=True)
        r.write_text(texto, encoding="utf-8")
    # Desde file:// el navegador no deja leer data.json; la web carga esta copia.
    js = ("// Copia de data.json para abrir el sitio desde file://. La genera scripts/build.py.\n"
          "window.BIBLICAL_EARTH_DATA = " + json.dumps(salida, ensure_ascii=False) + ";\n")
    ruta_js.parent.mkdir(parents=True, exist_ok=True)
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
    CREATE TABLE fuentes (id TEXT PRIMARY KEY, titulo TEXT, obra TEXT, url TEXT, nivel INTEGER, publicado TEXT, consultado TEXT,
        implicita INTEGER);
    CREATE TABLE libros (slug TEXT PRIMARY KEY, num INTEGER, nombre TEXT, abr TEXT, capitulos INTEGER, escritor TEXT,
        lugar TEXT, {fecha}, abarca_texto TEXT, razon TEXT, consultado TEXT, estado TEXT);
    CREATE TABLE meses (id TEXT PRIMARY KEY, orden INTEGER, nombre TEXT, otros_nombres TEXT);
    CREATE TABLE lugares (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, lat REAL, lon REAL, precision TEXT,
        coord_fuente TEXT, coord_url TEXT, resumen TEXT, razon TEXT, consultado TEXT, estado TEXT);
    CREATE TABLE lugar_nombres (lugar_id TEXT REFERENCES lugares(id), orden INTEGER, nombre TEXT,
        desde INTEGER, hasta INTEGER, nota TEXT);
    CREATE TABLE candidatos (lugar_id TEXT REFERENCES lugares(id), orden INTEGER, nombre TEXT, geometria TEXT,
        estado TEXT, razon TEXT);
    CREATE TABLE personas (id TEXT PRIMARY KEY, nombre TEXT, nombres TEXT, {fecha}, desambiguacion TEXT,
        resumen TEXT, razon TEXT, consultado TEXT, estado TEXT);
    CREATE TABLE relaciones (persona_id TEXT REFERENCES personas(id), orden INTEGER, tipo TEXT, persona TEXT,
        lugar TEXT, relacion TEXT, {fecha}, deducido INTEGER, razon TEXT, estado TEXT);
    CREATE TABLE viajes (id TEXT PRIMARY KEY, nombre TEXT, persona_id TEXT REFERENCES personas(id), referencia TEXT,
        {fecha}, companeros TEXT, resumen TEXT, razon TEXT, consultado TEXT, estado TEXT);
    CREATE TABLE paradas (viaje_id TEXT REFERENCES viajes(id), orden INTEGER, lugar_id TEXT REFERENCES lugares(id),
        referencia TEXT, {fecha}, nota TEXT, razon TEXT, estado TEXT, PRIMARY KEY (viaje_id, orden));
    CREATE TABLE cartas (id TEXT PRIMARY KEY, libro TEXT, escritor TEXT, referencia TEXT, escrita_en TEXT, {fecha},
        destinatarios_texto TEXT, destinatarios_lugares TEXT, destinatarios_personas TEXT, portadores TEXT,
        contexto_origen TEXT, contexto_destino TEXT, razon TEXT, consultado TEXT, estado TEXT);
    CREATE TABLE eventos (id TEXT PRIMARY KEY, titulo TEXT, {fecha}, lugares TEXT, personas TEXT, pasajes TEXT,
        orden_serie TEXT, orden_num INTEGER, resumen TEXT, razon TEXT, consultado TEXT, estado TEXT);
    CREATE TABLE periodos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, persona_id TEXT, {fecha}, lugares TEXT,
        resumen TEXT, razon TEXT, consultado TEXT, estado TEXT);
    CREATE TABLE hallazgos (id TEXT PRIMARY KEY, nombre TEXT, lugar_hallazgo TEXT, relaciona TEXT, {fecha},
        resumen TEXT, razon TEXT, consultado TEXT, estado TEXT);
    CREATE TABLE recorridos (id TEXT PRIMARY KEY, titulo TEXT, paradas TEXT, razon TEXT, consultado TEXT, estado TEXT);
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
        ins("fuentes", (k, f["titulo"], f["obra"], f["url"], f["nivel"], f.get("publicado"), f.get("consultado"),
                        int(bool(f.get("implicita")))))
    for l in salida["libros"]:
        ins("libros", (l["slug"], l["num"], l["nombre"], l["abr"], l["capitulos"], l.get("escritor"), l.get("lugar"),
                       *_fecha_cols(l.get("fecha")), (l.get("abarca") or {}).get("texto"), l.get("razon"),
                       l.get("consultado"), l.get("estado")))
        fuentes_hecho("libro", l["slug"], l)
    for m in salida["calendario"].get("meses") or []:
        ins("meses", (m["id"], m.get("orden"), m.get("nombre"), j(m.get("otros_nombres"))))
        fuentes_hecho("mes", m["id"], m)
    for o in salida["lugares"].values():
        ins("lugares", (o["id"], o["nombre"], o["tipo"], o["lat"], o["lon"], o["precision"], o["coord_fuente"],
                        o["coord_url"], o["resumen"], o["razon"], o["consultado"], o["estado"]))
        for i, n in enumerate(o.get("nombres") or []):
            ins("lugar_nombres", (o["id"], i, n["nombre"], n.get("desde"), n.get("hasta"), n.get("nota")))
        for i, c in enumerate(o.get("candidatos") or []):
            ins("candidatos", (o["id"], i, c.get("nombre"), json.dumps(c.get("geometria"), ensure_ascii=False),
                               c.get("estado"), c.get("razon")))
        fuentes_hecho("lugar", o["id"], o)
    for o in salida["personas"].values():
        ins("personas", (o["id"], o["nombre"], j(o.get("nombres")), *_fecha_cols(o.get("fecha")),
                         o.get("desambiguacion"), o["resumen"], o["razon"], o["consultado"], o["estado"]))
        for i, r in enumerate(o.get("relaciones") or []):
            ins("relaciones", (o["id"], i, r.get("tipo"), r.get("persona"), r.get("lugar"), r.get("relacion"),
                               *_fecha_cols(r.get("fecha")), int(bool(r.get("deducido"))), r.get("razon"), r.get("estado")))
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
        ins("cartas", (o["id"], o["libro"], o.get("escritor"), o["referencia"], j(o.get("escrita_en")),
                       *_fecha_cols(o.get("fecha")), d.get("texto"), j(d.get("lugares")), j(d.get("personas")),
                       j(o.get("portadores")), (o.get("contexto_origen") or {}).get("resumen"),
                       (o.get("contexto_destino") or {}).get("resumen"), o["razon"], o.get("consultado"), o["estado"]))
        fuentes_hecho("carta", o["id"], o)
    for o in salida["eventos"]:
        orden = o.get("orden_relato") or {}
        ins("eventos", (o["id"], o["titulo"], *_fecha_cols(o.get("fecha")), j(o.get("lugares")), j(o.get("personas")),
                        j(o.get("pasajes")), orden.get("serie"), orden.get("orden"), o["resumen"], o["razon"],
                        o.get("consultado"), o["estado"]))
        fuentes_hecho("evento", o["id"], o)
    for o in salida["periodos"]:
        ins("periodos", (o["id"], o["nombre"], o["tipo"], o.get("persona"), *_fecha_cols(o.get("fecha")),
                         j(o.get("lugares")), o["resumen"], o["razon"], o.get("consultado"), o["estado"]))
        fuentes_hecho("periodo", o["id"], o)
    for o in salida["hallazgos"]:
        ins("hallazgos", (o["id"], o["nombre"], o["lugar_hallazgo"], j(o.get("relaciona")),
                          *_fecha_cols(o.get("fecha_objeto")), o["resumen"], o["razon"], o.get("consultado"), o["estado"]))
        fuentes_hecho("hallazgo", o["id"], o)
    for o in salida["recorridos"]:
        ins("recorridos", (o["id"], o["titulo"], j(o.get("paradas")), o["razon"], o.get("consultado"), o["estado"]))
        fuentes_hecho("recorrido", o["id"], o)
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
    enlaces = ", ".join(f"[{i}]({fuentes[i]['url']})" if i in fuentes else i for i in ids or [])
    pub = sorted({str(fuentes[i]["publicado"]) for i in ids or [] if i in fuentes and fuentes[i].get("publicado")})
    fich = f"[{fichero.removeprefix('data/')}](../../../{fichero})"
    return "| " + " | ".join(_celda(x) for x in (afirmacion, fich, enlaces, ", ".join(pub) or "sin dato",
                                                   consultado, razon, estado)) + " |"


def _texto_fecha(f):
    return (f or {}).get("texto") or "sin fecha"


CABECERA = "| Afirmación | Fichero | Fuente | Publicado | Consultado | Por qué lo asociamos | Estado |\n|---|---|---|---|---|---|---|"
NOTA_PUBLICADO = "«Publicado» es el año de la publicación cuando la página de wol.jw.org lo muestra; si no lo muestra, pone «sin dato»."
REGISTROS = [  # (fichero, título)
    ("lugares", "Lugares"), ("personas", "Personas"), ("viajes", "Viajes y paradas"), ("cartas", "Cartas"),
    ("eventos", "Eventos"), ("periodos", "Periodos"), ("hallazgos", "Hallazgos"), ("recorridos", "Recorridos"),
    ("libros", "Libros y calendario"), ("cobertura", "Cobertura de la Biblia"), ("fuentes", "Fuentes"),
]


def _cabeza(titulo):
    return ["<!-- Generado por scripts/build.py a partir de data/. No editar a mano. -->", "",
            f"# Registro de investigación: {titulo.lower()}", "",
            "> Este fichero lo genera `scripts/build.py` a partir de `data/`. No lo edites a mano: cambia el YAML y "
            "vuelve a generarlo.",
            "> El método está en [../README.md](../README.md) y el índice del registro en [README.md](README.md).", "",
            NOTA_PUBLICADO, ""]


def _seccion(out, titulo, filas):
    out.extend([f"## {titulo}", ""])
    out.extend([CABECERA, *filas] if filas else ["Ninguno todavía."])
    out.append("")


def _revisar(out, tipo, objs):
    if not objs:
        return
    out.extend(["## Qué revisar dentro de un año", "",
                "Una búsqueda en wol.jw.org por cada entidad, para ver si hay material más reciente. "
                "Si una publicación nueva dice otra cosa, gana la más reciente y el cambio se anota en `historial` "
                "(ver [../README.md](../README.md)).", ""])
    for o in objs:
        t = termino(tipo, o)
        out.append(f"- {o.get('nombre') or o.get('libro') or o.get('titulo')}: [buscar «{t}»]({buscar_url(t)})")
    out.append("")


def _alternativas(o, fich, F):
    return [_fila(f"Cronología secular para **{o.get('nombre') or o.get('titulo') or o.get('libro')}**: "
                  f"{_texto_fecha(a.get('fecha'))}. {a.get('nota') or ''}", fich, a.get("fuentes"), F,
                  o.get("consultado"), a.get("nota"), o.get("estado"))
            for a in o.get("alternativas") or []]


def _anio_era(y):
    """Año astronómico a texto con era: -164 → «165 a.e.c.»."""
    return f"{1 - y} a.e.c." if isinstance(y, int) and y <= 0 else f"{y} e.c."


def registros(salida, datos):
    """Devuelve {nombre_fichero: texto} con el registro partido por tipo."""
    F = salida["fuentes"]
    L = salida["lugares"]
    P = salida["personas"]
    fich = {(t, o["id"]): o["_fichero"] for t in TIPOS for o in datos[t]}
    docs = {}

    out = _cabeza("Lugares")
    filas, cands, alts = [], [], []
    for o in L.values():
        f = fich[("lugares", o["id"])]
        filas.append(_fila(f"**{o['nombre']}** ({o['tipo']}, {o['precision']}): {o['resumen']}", f, o["fuentes"], F,
                           o["consultado"], o["razon"], o["estado"]))
        for c in o.get("candidatos") or []:
            g = c.get("geometria") or {}
            cands.append(_fila(f"**{o['nombre']}**, candidato «{c.get('nombre')}» ({g.get('tipo')}, {c.get('estado')})",
                               f, c.get("fuentes"), F, o["consultado"], c.get("razon"), o["estado"]))
        alts += _alternativas(o, f, F)
    _seccion(out, "Lugares", filas)
    _seccion(out, "Candidatos de ubicación", cands)
    if alts:
        _seccion(out, "Cronología secular", alts)
    _revisar(out, "lugares", list(L.values()))
    docs["lugares"] = out

    out = _cabeza("Personas")
    filas, rels, alts = [], [], []
    for o in P.values():
        f = fich[("personas", o["id"])]
        cuando = f" ({_texto_fecha(o['fecha'])})" if o.get("fecha") else ""
        filas.append(_fila(f"**{o['nombre']}**{cuando}: {o['resumen']}", f, o["fuentes"], F, o["consultado"],
                           o["razon"], o["estado"]))
        for r in o.get("relaciones") or []:
            otro = r.get("persona") or r.get("lugar")
            nombre = (P.get(otro) or L.get(otro) or {}).get("nombre", otro)
            extra = f" ({r['relacion']})" if r.get("relacion") else ""
            ded = ", deducido" if r.get("deducido") else ""
            rels.append(_fila(f"**{o['nombre']}** {r.get('tipo')} **{nombre}**{extra}{ded}", f, r.get("fuentes"), F,
                              o["consultado"], r.get("razon"), r.get("estado")))
        alts += _alternativas(o, f, F)
    _seccion(out, "Personas", filas)
    _seccion(out, "Relaciones", rels)
    if alts:
        _seccion(out, "Cronología secular", alts)
    _revisar(out, "personas", list(P.values()))
    docs["personas"] = out

    out = _cabeza("Viajes y paradas")
    _seccion(out, "Viajes", [_fila(f"**{o['nombre']}** ({o['referencia']}), {_texto_fecha(o.get('fecha'))}: {o['resumen']}",
                                   fich[("viajes", o["id"])], o["fuentes"], F, o.get("consultado"), o.get("razon"),
                                   o.get("estado")) for o in salida["viajes"]])
    filas = []
    for v in salida["viajes"]:
        for p in v.get("paradas") or []:
            lug = L.get(p["lugar"], {}).get("nombre", p["lugar"])
            filas.append(_fila(f"{v['nombre']}, parada {p['orden']}: **{lug}** ({p['referencia']}), {_texto_fecha(p.get('fecha'))}",
                               fich[("viajes", v["id"])], p["fuentes"], F, v.get("consultado"), p["razon"], p["estado"]))
    _seccion(out, "Paradas", filas)
    _revisar(out, "viajes", salida["viajes"])
    docs["viajes"] = out

    out = _cabeza("Cartas")
    filas = []
    for o in salida["cartas"]:
        origen = " o ".join(L[i]["nombre"] for i in o["escrita_en"] if i in L)
        autor = P.get(o.get("escritor"), {}).get("nombre", o.get("escritor"))
        filas.append(_fila(f"**{o['libro']}** ({autor}) se escribió en {origen}, {_texto_fecha(o.get('fecha'))}; "
                           f"destinatarios: {o['destinatarios']['texto']}",
                           fich[("cartas", o["id"])], o["fuentes"], F, o.get("consultado"), o["razon"], o["estado"]))
    _seccion(out, "Cartas", filas)
    _revisar(out, "cartas", salida["cartas"])
    docs["cartas"] = out

    out = _cabeza("Eventos")
    filas, alts = [], []
    for o in salida["eventos"]:
        donde = ", ".join(L[i]["nombre"] for i in o.get("lugares") or [] if i in L)
        f = fich[("eventos", o["id"])]
        filas.append(_fila(f"**{o['titulo']}** ({donde}; {'; '.join(o.get('pasajes') or [])}), {_texto_fecha(o.get('fecha'))}",
                           f, o["fuentes"], F, o.get("consultado"), o["razon"], o["estado"]))
        alts += _alternativas(o, f, F)
    _seccion(out, "Eventos", filas)
    if alts:
        _seccion(out, "Cronología secular", alts)
    _revisar(out, "eventos", salida["eventos"])
    docs["eventos"] = out

    out = _cabeza("Periodos")
    filas, alts = [], []
    for o in salida["periodos"]:
        f = fich[("periodos", o["id"])]
        filas.append(_fila(f"**{o['nombre']}** ({o['tipo']}), {_texto_fecha(o.get('fecha'))}", f, o["fuentes"], F,
                           o.get("consultado"), o["razon"], o["estado"]))
        alts += _alternativas(o, f, F)
    _seccion(out, "Periodos", filas)
    if alts:
        _seccion(out, "Cronología secular", alts)
    _revisar(out, "periodos", salida["periodos"])
    docs["periodos"] = out

    out = _cabeza("Hallazgos")
    _seccion(out, "Hallazgos", [_fila(f"**{o['nombre']}** (hallado en {L.get(o['lugar_hallazgo'], {}).get('nombre', o['lugar_hallazgo'])}, "
                                      f"{_texto_fecha(o.get('fecha_objeto'))}): {o['resumen']}",
                                      fich[("hallazgos", o["id"])], o["fuentes"], F, o.get("consultado"), o["razon"],
                                      o["estado"]) for o in salida["hallazgos"]])
    _revisar(out, "hallazgos", salida["hallazgos"])
    docs["hallazgos"] = out

    out = _cabeza("Recorridos")
    _seccion(out, "Recorridos", [_fila(f"**{o['titulo']}** ({len(o.get('paradas') or [])} paradas)",
                                       fich[("recorridos", o["id"])], o["fuentes"], F, o.get("consultado"), o["razon"],
                                       o["estado"]) for o in salida["recorridos"]])
    docs["recorridos"] = out

    out = _cabeza("Libros y calendario")
    out.extend(["`data/libros.yaml` y `data/calendario.yaml` son estructura (nombres, abreviaturas, capítulos, meses). "
                "Aquí solo salen los hechos que llevan fuente.", ""])
    filas = []
    for l in salida["libros"]:
        if not any(k in l for k in ("escritor", "lugar", "fecha", "abarca")):
            continue
        partes = [f"escrito por {l['escritor']}" if l.get("escritor") else "",
                  f"en {l['lugar']}" if l.get("lugar") else "",
                  f"terminado {_texto_fecha(l['fecha'])}" if l.get("fecha") else "",
                  f"abarca {_texto_fecha(l['abarca'])}" if l.get("abarca") else ""]
        filas.append(_fila(f"**{l['nombre']}**: " + ", ".join(p for p in partes if p), "data/libros.yaml",
                           l.get("fuentes"), F, l.get("consultado"), l.get("razon"), l.get("estado")))
    _seccion(out, "Libros", filas)
    filas = [_fila(f"**{m.get('nombre')}**", "data/calendario.yaml", m.get("fuentes"), F, m.get("consultado"),
                   m.get("razon"), m.get("estado"))
             for m in salida["calendario"].get("meses") or [] if m.get("fuentes")]
    _seccion(out, "Meses", filas)
    filas = [_fila(f"**{n.get('nombre')}** ({m.get('nombre')}): {n.get('nota')}", "data/calendario.yaml",
                   n.get("fuentes"), F, m.get("consultado"), n.get("razon"), m.get("estado"))
             for m in salida["calendario"].get("meses") or [] for n in m.get("nombres") or []]
    _seccion(out, "Nombres de los meses por época", filas)
    filas = [_fila(f"**{f.get('nombre')}** ({m.get('nombre')}), se celebra desde {_anio_era(f.get('instituida'))}", "data/calendario.yaml",
                   f.get("fuentes"), F, m.get("consultado"), f.get("razon"), f.get("estado") or m.get("estado"))
             for m in salida["calendario"].get("meses") or [] for f in m.get("fiestas") or []]
    _seccion(out, "Fiestas y desde cuándo se celebran", filas)
    filas = [_fila(f"**{e.get('titulo')}**: {e.get('texto')}", "data/calendario.yaml", e.get("fuentes"), F,
                   e.get("consultado"), e.get("razon"), e.get("estado"))
             for e in salida["calendario"].get("explicacion") or []]
    _seccion(out, "El calendario", filas)
    docs["libros"] = out

    out = _cabeza("Cobertura")
    out.extend(["Qué versículos de la TNM se han leído y apuntado en `data/cobertura/<libro>.yaml`. Un capítulo cuenta "
                "como completo cuando sus tramos cubren todos sus versículos, salvo los que la TNM no incluye. "
                "El formato está en [data/cobertura/README.md](../../../data/cobertura/README.md) y el protocolo en "
                "[../versiculos.md](../versiculos.md).", ""])
    lineas, tot_cob = cobertura.informe(datos)
    out.extend(lineas)
    docs["cobertura"] = out

    out = _cabeza("Fuentes")
    out.extend(["Las fuentes de `data/fuentes/*.yaml`. Los capítulos de la Biblia que nadie escribió a mano los crea "
                "`build.py` a partir de `data/libros.yaml` y salen marcados como «implícita».", "",
                "| Id | Título | Obra | Nivel | Publicado | Consultado |", "|---|---|---|---|---|---|"])
    for k, f in F.items():
        consultado = "implícita" if f.get("implicita") else f.get("consultado")
        out.append("| " + " | ".join(_celda(x) for x in (k, f"[{f['titulo']}]({f['url']})", f["obra"], f["nivel"],
                                                          f.get("publicado") or "sin dato", consultado)) + " |")
    out.append("")
    docs["fuentes"] = out

    n_paradas = sum(len(v.get("paradas") or []) for v in salida["viajes"])
    cuentas = {"lugares": len(L), "personas": len(P), "viajes": f"{len(salida['viajes'])} ({n_paradas} paradas)",
               "cartas": len(salida["cartas"]), "eventos": len(salida["eventos"]), "periodos": len(salida["periodos"]),
               "hallazgos": len(salida["hallazgos"]), "recorridos": len(salida["recorridos"]),
               "libros": f"{len(salida['libros'])} libros, {len(salida['calendario'].get('meses') or [])} meses",
               "cobertura": f"{tot_cob['completos']} de {tot_cob['capitulos']} capítulos completos",
               "fuentes": len(F)}
    indice = ["<!-- Generado por scripts/build.py a partir de data/. No editar a mano. -->", "",
              "# Registro de investigación", "",
              "> Lo genera `scripts/build.py` a partir de `data/`, un fichero por tipo. No se edita a mano.",
              "> El método y el esquema están en [../README.md](../README.md).", "",
              "Cada fila es una afirmación con su fichero, su fuente, el día en que se leyó, por qué la asociamos "
              "y su estado.", "",
              "| Registro | Cuántos |", "|---|---|"]
    indice += [f"| [{titulo}]({nombre}.md) | {cuentas[nombre]} |" for nombre, titulo in REGISTROS]
    indice.append("")
    docs["README"] = indice
    return {nombre: "\n".join(lineas) for nombre, lineas in docs.items()}


def escribir_registro(salida, datos, carpeta):
    carpeta.mkdir(parents=True, exist_ok=True)
    textos = registros(salida, datos)
    for nombre, texto in textos.items():
        (carpeta / f"{nombre}.md").write_text(texto, encoding="utf-8")
    for viejo in carpeta.glob("*.md"):
        if viejo.stem not in textos:
            viejo.unlink()
    return len(textos)


# ---------------------------------------------------------------- main

def main(argv=None):
    ap = argparse.ArgumentParser(description="Compila data/ en dist/, site/data.json, site/data.js y el registro de investigación.")
    ap.add_argument("--data", default=str(RAIZ / "data"), help="directorio de datos (por defecto data/)")
    ap.add_argument("--salida", default=None,
                    help="escribe data.json, data.js, biblical-earth.sqlite y registro/ en DIR en vez de site/, dist/ y docs/")
    args = ap.parse_args(argv)
    datos, _ = cargar(args.data)
    errores = integridad(datos)
    if errores:
        for e in errores:
            print("ERROR", e, file=sys.stderr)
        print(f"build: {len(errores)} errores de integridad; no se escribe nada.", file=sys.stderr)
        return 1
    salida = componer(datos, datetime.date.today().isoformat())
    if args.salida:
        destino = Path(args.salida).resolve()
        escribir_json(salida, [destino / "data.json"], destino / "data.js")
        n_hf = escribir_sqlite(salida, destino / "biblical-earth.sqlite")
        escribir_registro(salida, datos, destino / "registro")
        donde = f" en {destino}"
    else:
        escribir_json(salida, [RAIZ / "dist" / "data.json", RAIZ / "site" / "data.json"], RAIZ / "site" / "data.js")
        n_hf = escribir_sqlite(salida, RAIZ / "dist" / "biblical-earth.sqlite")
        escribir_registro(salida, datos, RAIZ / "docs" / "investigacion" / "registro")
        donde = ""
    n_impl = sum(1 for f in salida["fuentes"].values() if f.get("implicita"))
    print(f"build{donde}: {len(salida['fuentes'])} fuentes ({n_impl} capítulos implícitos), {len(salida['libros'])} libros, "
          f"{len(salida['lugares'])} lugares, {len(salida['personas'])} personas, {len(salida['viajes'])} viajes, "
          f"{len(salida['cartas'])} cartas, {len(salida['eventos'])} eventos, {len(salida['periodos'])} periodos, "
          f"{len(salida['hallazgos'])} hallazgos, {len(salida['recorridos'])} recorridos, {n_hf} filas en hechos_fuentes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
