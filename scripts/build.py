#!/usr/bin/env python3
"""Compila data/ en dist/data.json, site/data.json, site/data.js, site/data.core.json, site/data.detail.json,
dist/biblical-atlas.sqlite y el registro de investigación de docs/investigacion/registro/. Al final escribe
site/sw-manifest.js, la versión del sitio para el service worker.

Uso:  python3 scripts/build.py [--data DIR] [--out DIR]

Con --out DIR (alias --salida) escribe data.json, data.js, los dos trozos del sitio (data.core.json y
data.detail.json), biblical-atlas.sqlite y registro/ dentro de DIR y no toca site/, dist/ ni docs/. Sirve para probar datos sin pisar lo que compila otro.

Los YAML de data/ tienen el núcleo en inglés (docs/investigacion/modelo.md). build.py hace de adaptador: lo que el
sitio ya leía sale con sus nombres y valores de siempre, con el mapa de scripts/migration/map.yaml leído al revés, y
lo nuevo sale al lado, en inglés. cargar() e integridad() trabajan sobre los datos tal como están en el YAML.

Todo lo que escribe es derivado: se edita el YAML y se vuelve a generar.
"""
import argparse
import datetime
import hashlib
import json
import re
import sqlite3
import sys
import unicodedata
import urllib.parse
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bible_coverage as cov  # noqa: E402
import formas  # noqa: E402
import languages  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
MAP_PATH = RAIZ / "scripts" / "migration" / "map.yaml"
VOCABULARY = "vocabulary.yaml"
FORMATO = "biblical-atlas/v0"  # el servidor MCP acepta este identificador y el anterior
TYPES = ["places", "people", "journeys", "letters", "events", "periods", "finds", "tours"]
# Tipo de cada carpeta en singular, tal como va en las selecciones de los YAML (person:ciro).
SINGULAR = {"places": "place", "people": "person", "journeys": "journey", "letters": "letter", "events": "event",
            "periods": "period", "finds": "find", "tours": "tour"}
WOL_BUSCAR = "https://wol.jw.org/es/wol/s/r4/lp-s?q={q}&p=par&r=occ&st=a"
OBRA_TNM = "La Biblia. Traducción del Nuevo Mundo (edición de estudio)"
ORDEN_LIBROS = ["romanos", "1-corintios", "2-corintios", "galatas", "efesios", "filipenses", "colosenses",
                "1-tesalonicenses", "2-tesalonicenses", "1-timoteo", "2-timoteo", "tito", "filemon", "hebreos"]
CAPITULO = re.compile(r"^([a-z0-9]+(?:-[a-z0-9]+)*)-(\d+)$")
# Claves que no vienen de ningún YAML: las añade build.py. Salen en data.json con su nombre de siempre.
BUILD_KEYS = {"implicit": "implicita"}
# Grupo de la tarjeta de familia visto desde el otro lado: padres e hijos se cruzan, cónyuges y hermanos se repiten.
FAMILY_ACROSS = {"parents": "children", "children": "parents"}


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


def load_map():
    return yaml.safe_load(MAP_PATH.read_text(encoding="utf-8"))


def load_vocabulary(data_dir):
    """data/vocabulary.yaml de esa copia de los datos o, si no lo lleva, el de este repositorio."""
    ruta = Path(data_dir) / VOCABULARY
    if not ruta.exists():
        ruta = RAIZ / "data" / VOCABULARY
    return yaml.safe_load(ruta.read_text(encoding="utf-8"))


def _fundir_fuentes(data_dir, errores):
    """Junta data/sources/*.yaml. Un id repetido con la misma url y el mismo title se funde (gana el
    `checked_on` más reciente); con datos distintos es un error que nombra los dos ficheros."""
    fuentes, origen = {}, {}
    for ruta in sorted((data_dir / "sources").glob("*.yaml")):
        rel = f"data/sources/{ruta.name}"
        contenido = _leer(ruta) or {}
        if not isinstance(contenido, dict):
            errores.append(f"{rel}: debe ser un mapa id: {{title, work, url, ...}}")
            continue
        for fid, f in contenido.items():
            if f is not None and not isinstance(f, dict):
                errores.append(f"{rel}: la fuente '{fid}' debe ser un mapa {{title, work, url, ...}}, no {f!r}")
                continue
            f = dict(f or {})
            if fid not in fuentes:
                fuentes[fid], origen[fid] = f, rel
                continue
            previa, choque = fuentes[fid], []
            for k in ("url", "title"):
                if previa.get(k) != f.get(k):
                    choque.append(k)
            for k in set(previa) | set(f):
                a, b = previa.get(k), f.get(k)
                if k in ("url", "title") or a == b or a is None or b is None:
                    continue
                if k == "checked_on":
                    continue
                choque.append(k)
            if choque:
                errores.append(f"{origen[fid]} y {rel}: la fuente '{fid}' está en los dos con datos distintos "
                               f"({', '.join(sorted(set(choque)))}); unifícala o usa otro id")
                continue
            for k, b in f.items():
                a = previa.get(k)
                if a is None or (k == "checked_on" and b is not None and str(b) > str(a)):
                    previa[k] = b
            origen[fid] = f"{origen[fid]}, {rel}"
    return fuentes, origen


def fuentes_de(obj, claves=("sources", "source")):
    """Todas las listas de fuentes de un objeto, con la ruta donde están. `claves` son el nombre de la lista y el de
    una fuente suelta: ("sources", "source") en los YAML y ("fuentes", "fuente") en lo que se compila para el sitio."""
    lista, suelta = claves
    out = []

    def rec(x, camino):
        if isinstance(x, dict):
            for k, v in x.items():
                if k == lista and isinstance(v, list):
                    out.extend((f"{camino}.{lista}", f) for f in v)
                elif k == suelta and isinstance(v, str):
                    out.append((f"{camino}.{suelta}", v))
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
    return {"title": f"{libro['name']} {cap}", "work": OBRA_TNM,
            "url": cov.url_capitulo(libro, cap), "level": 1, "published": None,
            "checked_on": None, "implicit": True}


def old_schema(data_dir, mapa=None):
    """[(ruta antigua, ruta nueva)] de las carpetas y los ficheros de data/ que siguen con su nombre de antes de la
    migración. Con cualquiera de ellos build.py no compila: escribiría un sitio vacío sin avisar."""
    mapa = mapa or load_map()
    out = []
    for grupo in ("directories", "files"):
        for viejo, nuevo in (mapa.get(grupo) or {}).items():
            if viejo != nuevo and viejo.startswith("data/") and (Path(data_dir) / viejo.removeprefix("data/")).exists():
                out.append((viejo, nuevo))
    return out


def cargar(data_dir):
    """Lee data/ tal como está, con el núcleo en inglés. Devuelve (datos, ficheros) donde ficheros[(tipo, id)] es la
    ruta relativa y tipo es el nombre de la carpeta (people, places...).

    datos lleva sources, books, calendar, coverage y una lista por carpeta de TYPES, más vocabulary (el de
    data/vocabulary.yaml). Solo recorre data/sources/*.yaml, data/books.yaml, data/calendar.yaml, data/<tipo>/*.yaml
    y data/coverage/*.yaml: data/_proposals/ y cualquier otra carpeta quedan fuera. Los errores de carga (fuentes
    repetidas con datos distintos) van a datos["_errores"] y los informa integridad().
    """
    data_dir = Path(data_dir)
    errores = []
    for viejo, nuevo in old_schema(data_dir):
        errores.append(f"{viejo} tiene el nombre del esquema antiguo (ahora {nuevo}): estos datos no están migrados; "
                       f"ejecuta scripts/migration/migrate.py")
    if not (data_dir / "books.yaml").exists():
        errores.append(f"books.yaml no existe en {data_dir}: sin la lista de libros no se compila nada")
    fuentes, origen = _fundir_fuentes(data_dir, errores)
    libros = ((_leer(data_dir / "books.yaml") or {}).get("books") or []) if (data_dir / "books.yaml").exists() else []
    calendario = (_leer(data_dir / "calendar.yaml") or {}) if (data_dir / "calendar.yaml").exists() else {}
    datos = {"sources": fuentes, "books": libros, "calendar": calendario, "_errores": errores,
             "_origen_fuentes": origen, "vocabulary": load_vocabulary(data_dir)}
    ficheros = {}
    for tipo in TYPES:
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
    datos["coverage"] = cov.cargar(data_dir, errores)

    # Capítulos de la Biblia como fuentes implícitas: <slug>-<cap> que nadie ha escrito se crea desde books.yaml.
    citadas = [fid for t in TYPES for o in datos[t] for _, fid in fuentes_de(limpio(o))]
    citadas += [fid for l in libros for _, fid in fuentes_de(l)]
    citadas += [fid for m in calendario.get("months") or [] for _, fid in fuentes_de(m)]
    citadas += [fid for e in calendario.get("explanation") or [] for _, fid in fuentes_de(e)]
    for fid in citadas:
        if fid in fuentes:
            continue
        cap = capitulo_de(fid, libros)
        if cap and 1 <= cap[1] <= int(cap[0].get("chapters") or 0):
            fuentes[fid] = fuente_capitulo(*cap)
            origen[fid] = "data/books.yaml (capítulo implícito)"
    return datos, ficheros


# ---------------------------------------------------------------- relaciones: vocabulario, clave y referencia

class Vocabulary:
    """data/vocabulary.yaml: tipos, palabras, cargos y certezas, con sus verbos."""

    def __init__(self, v):
        v = v or {}
        self.raw = v
        self.types = v.get("types") or {}
        self.words = v.get("words") or {}
        self.offices = v.get("offices") or {}
        self.certainty = v.get("certainty") or {}

    def errors(self):
        """Lo que impide compilar un verbo: un tipo o una palabra sin sus dos verbos."""
        out = []
        for t, d in self.types.items():
            for k in ("verb", "inverse_verb"):
                if not (d or {}).get(k):
                    out.append(f"data/{VOCABULARY}: al tipo {t} le falta {k}")
            if "{office}" in str((d or {}).get("verb")) and "office" not in ((d or {}).get("requires") or []):
                if not ((d or {}).get("verb_without_office") and (d or {}).get("inverse_verb_without_office")):
                    out.append(f"data/{VOCABULARY}: el tipo {t} nombra el cargo y no tiene verbo sin cargo")
        for w, d in self.words.items():
            for k in ("verb", "inverse_verb", "es"):
                if not (d or {}).get(k):
                    out.append(f"data/{VOCABULARY}: a la palabra {w} le falta {k}")
            if (d or {}).get("type") not in self.types:
                out.append(f"data/{VOCABULARY}: la palabra {w} es de un tipo que no existe: {(d or {}).get('type')}")
        for c, d in self.certainty.items():
            if not (d or {}).get("verb"):
                out.append(f"data/{VOCABULARY}: a la certeza {c} le falta verb")
        for o, d in self.offices.items():
            if not (d or {}).get("es"):
                out.append(f"data/{VOCABULARY}: al cargo {o} le falta es")
        return out

    def owns(self, r):
        """Quién manda en el par según la palabra o, sin ella, según el tipo: self, target, first_named o first_id."""
        w = self.words.get(r.get("word"))
        if w:
            return w.get("owns")
        t = self.types.get(r.get("type")) or {}
        return t.get("owns_without_word") or t.get("owns")


def relation_key(pid, r, voc):
    """La clave escrita de una relación (modelo.md, sección 6), con la misma función que usan validate.py y la
    cobertura: <persona>/<type>/<destino>[/<word u office>][@<from>]."""
    return cov.relation_key(pid, r, voc.raw)


def coverage_citations(datos):
    """{id() de la relación: [«Rut 1:1-5», ...]}: los tramos de la cobertura que citan cada relación, en entities o
    en mentions, en el orden de los libros y de los capítulos. Las referencias se resuelven con bible_coverage, como
    en validate.py."""
    libros = {l.get("slug"): l for l in datos["books"]}
    idx = cov._indices(datos)
    out = {}
    for slug, obj in sorted((datos.get("coverage") or {}).items(),
                            key=lambda x: (libros.get(x[1].get("book") or x[0]) or {}).get("num") or 99):
        libro = libros.get(obj.get("book") or slug)
        if not libro:
            continue
        for c, cap in sorted(cov._capitulos(obj).items()):
            for t in (cap or {}).get("spans") or [] if isinstance(cap, dict) else []:
                if not isinstance(t, dict):
                    continue
                for ref in [*(t.get("entities") or []), *(t.get("mentions") or [])]:
                    if not str(ref).startswith(f"{cov.RELATION}:"):
                        continue
                    carpeta, casan = cov.resolver(ref, datos, idx)
                    for r in casan if carpeta == cov.RELATION else []:
                        texto = f"{libro.get('abbr')} {c}:{t.get('v')}"
                        lista = out.setdefault(id(r), [])
                        if texto not in lista:
                            lista.append(texto)
    return out


def citation_texts(texto, citas):
    """Las citas de un texto libre tal como se escriben («Hch 16:10-17»), sin repetir, con el buscador de
    bible_coverage.Citas: la misma expresión que citasEnTexto de site/js/tipos/pasaje.js."""
    out = []
    for m in citas.re.finditer(str(texto or "")):
        if not citas.forma_corta_ok(m.group(1)):
            continue
        t = m.group(0)
        t = (t[1:] if t and not (t[0].isalnum()) else t).strip()
        if t and t not in out:
            out.append(t)
    return out


def source_chapters(fuentes_ids, datos):
    """Los capítulos de la TNM que hay entre las fuentes, escritos «Jn 1»."""
    out = []
    for fid in fuentes_ids or []:
        cap = capitulo_de(fid, datos["books"])
        if cap:
            libro, c = cap
        else:
            libro, c = cov.capitulo_de_url((datos["sources"].get(fid) or {}).get("url"), datos["books"]) or (None, None)
        if libro:
            t = f"{libro.get('abbr')} {c}"
            if t not in out:
                out.append(t)
    return out


def relation_reference(r, datos, citas, cobertura):
    """La referencia de la arista (modelo.md, sección 10), por este orden: los pasajes que cita su reason, los
    capítulos que hay entre sus fuentes y los tramos de la cobertura que la citan. None si no hay ninguna."""
    for lista in (citation_texts(r.get("reason"), citas), source_chapters(r.get("sources"), datos),
                  cobertura.get(id(r)) or []):
        if lista:
            return "; ".join(lista)
    return None


def same_pair(r, s, voc):
    """¿Son r (en X hacia Y) y s (en Y hacia X) el mismo par? Palabras inversas entre sí, o el mismo tipo sin
    palabra, salvo con fechas distintas."""
    if r.get("type") != s.get("type"):
        return False
    fr, fs = cov.relation_from(r), cov.relation_from(s)
    if fr is not None and fs is not None and fr != fs:
        return False
    wr, ws = r.get("word"), s.get("word")
    if wr or ws:
        if not (wr and ws):
            return False
        return ws in ((voc.words.get(wr) or {}).get("inverse") or []) or \
            wr in ((voc.words.get(ws) or {}).get("inverse") or [])
    return True


def duplicates(datos, voc, partners=None):
    """{(pid, índice): clave de la copia que manda} para la copia que no manda de cada par escrito en las dos
    fichas: la de la ficha que no es dueña por su palabra o, si el dueño no se sabe, la de la ficha cuyo id va
    después (modelo.md, sección 5). Con `partners`, lo llena con {(pid, índice) de la que no manda: (pid, índice)
    de la que manda}."""
    people = {o.get("id"): o for o in datos["people"]}
    out = {}
    partners = {} if partners is None else partners
    for x in sorted(people):
        for i, r in enumerate(people[x].get("relations") or []):
            y = r.get("person") if isinstance(r, dict) else None
            if not y or y not in people or y <= x or (x, i) in out:
                continue
            for j, s in enumerate(people[y].get("relations") or []):
                if not isinstance(s, dict) or s.get("person") != x or (y, j) in out or not same_pair(r, s, voc):
                    continue
                r_manda = voc.owns(r) == "self" or voc.owns(s) == "target"
                s_manda = voc.owns(s) == "self" or voc.owns(r) == "target"
                if s_manda and not r_manda:
                    out[(x, i)] = relation_key(y, s, voc)
                    partners[(x, i)] = (y, j)
                else:   # manda r por su palabra o, con el dueño desconocido, la ficha cuyo id va primero (x < y)
                    out[(y, j)] = relation_key(x, r, voc)
                    partners[(y, j)] = (x, i)
                break
    return out


def _fill(plantilla, owner, target, office):
    return str(plantilla).replace("{owner}", owner).replace("{target}", target).replace("{office}", office or "")


def relation_verbs(r, voc, owner, target):
    """(verb, inverse_verb) ya resueltos: el de la ficha de quien la escribe y el de la ficha del destino."""
    t = voc.types.get(r.get("type")) or {}
    office = (voc.offices.get(r.get("office")) or {}).get("es")
    if r.get("caption"):
        return r["caption"], r.get("inverse_caption") or _fill(t.get("inverse_verb"), owner, target, office)
    w = voc.words.get(r.get("word"))
    if w:
        verb, inv = w.get("verb"), w.get("inverse_verb")
    elif r.get("type") == "same_as" and r.get("certainty") in voc.certainty:
        verb = inv = voc.certainty[r["certainty"]].get("verb")
    elif not office and t.get("verb_without_office"):
        verb, inv = t.get("verb_without_office"), t.get("inverse_verb_without_office")
    else:
        verb, inv = t.get("verb"), t.get("inverse_verb")
    return _fill(verb, owner, target, office), _fill(inv, owner, target, office)


# ---------------------------------------------------------------- integridad

def ids_por_tipo(datos):
    return {t: {o.get("id") for o in datos[t]} for t in TYPES}


def existe_sel(datos, sel, ids=None):
    """¿Existe la selección «tipo:id» de un YAML? tipo en singular y en inglés (place, person, letter, journey,
    stop, event, period, find, tour, passage, book). Parada: «viaje/order». Pasaje: «<abbr sin tildes>-<cap>» (hch-16)."""
    ids = ids or ids_por_tipo(datos)
    tipo, _, oid = str(sel).partition(":")
    if not oid:
        return False
    plural = {v: k for k, v in SINGULAR.items()}
    if tipo in plural:
        return oid in ids[plural[tipo]]
    if tipo == "stop":
        viaje, _, orden = oid.partition("/")
        v = next((v for v in datos["journeys"] if v.get("id") == viaje), None)
        return bool(v) and any(str(p.get("order")) == orden for p in v.get("stops") or [])
    if tipo == "book":
        return any(l.get("slug") == oid for l in datos["books"])
    if tipo == "passage":
        m = re.match(r"^([1-3]?[a-z]+)-(\d+)$", oid)
        if not m:
            return False
        libro = next((l for l in datos["books"] if _sin_tildes(l.get("abbr", "")).lower() == m.group(1)), None)
        return bool(libro) and 1 <= int(m.group(2)) <= int(libro.get("chapters") or 0)
    return False


def _sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", str(s)) if unicodedata.category(c) != "Mn")


def _relation_errors(f, i, r, voc):
    """Lo que impide compilar una relación: un tipo, una palabra, un cargo o una certeza que el vocabulario no tiene."""
    out = []
    t = r.get("type")
    if t not in voc.types:
        return [f"{f}: relations[{i}].type '{t}' no está en data/{VOCABULARY}"]
    if r.get("word") is not None and r["word"] not in voc.words:
        out.append(f"{f}: relations[{i}].word '{r['word']}' no está en data/{VOCABULARY}")
    if r.get("office") is not None and r["office"] not in voc.offices:
        out.append(f"{f}: relations[{i}].office '{r['office']}' no está en data/{VOCABULARY}")
    if r.get("certainty") is not None and r["certainty"] not in voc.certainty:
        out.append(f"{f}: relations[{i}].certainty '{r['certainty']}' no está en data/{VOCABULARY}")
    if t == "holds_office" and not r.get("office"):
        out.append(f"{f}: relations[{i}] es holds_office y no lleva office")
    return out


def integridad(datos):
    """Comprueba que todo id referenciado existe y que cada relación se puede compilar con el vocabulario.
    Devuelve una lista de errores."""
    errores = list(datos.get("_errores") or [])
    fuentes = datos["sources"]
    ids = ids_por_tipo(datos)
    voc = Vocabulary(datos.get("vocabulary"))
    errores.extend(voc.errors())

    def ref(fichero, que, valor, tipo):
        if valor not in ids[tipo]:
            errores.append(f"{fichero}: {que} '{valor}' no existe en data/{tipo}/")

    def fuente(fichero, camino, fid):
        if fid in fuentes:
            return
        cap = capitulo_de(fid, datos["books"])
        if cap:
            errores.append(f"{fichero}: fuente '{fid}' ({camino.lstrip('.')}): {cap[0]['name']} no tiene "
                           f"capítulo {cap[1]} (tiene {cap[0].get('chapters')})")
        else:
            errores.append(f"{fichero}: fuente '{fid}' ({camino.lstrip('.')}) no existe en data/sources/")

    for l in datos["books"]:
        for camino, fid in fuentes_de(l):
            fuente(f"data/books.yaml ({l.get('slug')})", camino, fid)
    for m in datos["calendar"].get("months") or []:
        for camino, fid in fuentes_de(m):
            fuente(f"data/calendar.yaml ({m.get('id')})", camino, fid)
    for e in datos["calendar"].get("explanation") or []:
        for camino, fid in fuentes_de(e):
            fuente(f"data/calendar.yaml (explanation {e.get('id')})", camino, fid)

    for tipo in TYPES:
        for o in datos[tipo]:
            f = o["_fichero"]
            for camino, fid in fuentes_de(limpio(o)):
                fuente(f, camino, fid)
            for i, r in enumerate(o.get("relations") or []):
                if not isinstance(r, dict):
                    continue
                if r.get("person") is not None:
                    ref(f, f"relations[{i}].person", r["person"], "people")
                if r.get("place") is not None:
                    ref(f, f"relations[{i}].place", r["place"], "places")
                errores.extend(_relation_errors(f, i, r, voc))
            for pid in o.get("distinct_from") or []:
                ref(f, "distinct_from", pid, "people")
            if tipo == "journeys":
                # Un viaje de grupo lleva person: null y group (validate.py, validar_viaje).
                if o.get("person") is not None or not o.get("group"):
                    ref(f, "person", o.get("person"), "people")
                for p in o.get("companions") or []:
                    ref(f, "companions", p.get("person") if isinstance(p, dict) else p, "people")
                for p in o.get("stops") or []:
                    # Un área desconocida (`place: null` y `unknown_area`) no tiene lugar (validate.py, validar_areas).
                    if p.get("place") is not None or "unknown_area" not in p:
                        ref(f, f"stop {p.get('order')}: place", p.get("place"), "places")
            elif tipo == "letters":
                ref(f, "writer", o.get("writer"), "people")
                for lid in o.get("written_in") or []:
                    ref(f, "written_in", lid, "places")
                for lid in (o.get("recipients") or {}).get("places") or []:
                    ref(f, "recipients.places", lid, "places")
                for pid in (o.get("recipients") or {}).get("people") or []:
                    ref(f, "recipients.people", pid, "people")
                for pid in o.get("carriers") or []:
                    ref(f, "carriers", pid, "people")
                for pid in o.get("people") or []:
                    ref(f, "people", pid, "people")
            elif tipo == "events":
                for lid in o.get("places") or []:
                    ref(f, "place", lid, "places")
                for pid in o.get("people") or []:
                    ref(f, "person", pid, "people")
                orden = o.get("narrative_order")
                tras = orden.get("after") if isinstance(orden, dict) else None
                if isinstance(tras, str):
                    ref(f, "narrative_order.after", tras, "events")
                elif tras is not None:
                    errores.append(f"{f}: narrative_order.after debe ser el id de un suceso, no {type(tras).__name__}")
                for pid in o.get("present") or []:
                    if pid not in (o.get("people") or []):
                        errores.append(f"{f}: present nombra a '{pid}', que no está en people")
                roles = o.get("roles")
                if roles is not None and not isinstance(roles, dict):
                    errores.append(f"{f}: roles debe ser un mapa {{id de persona: papel}}")
                for pid, papel in (roles or {}).items() if isinstance(roles, dict) else ():
                    ref(f, "roles", pid, "people")
                    if isinstance(papel, dict) and papel.get("place") is not None:
                        ref(f, f"roles.{pid}.place", papel["place"], "places")
            elif tipo == "periods":
                for lid in o.get("places") or []:
                    ref(f, "place", lid, "places")
                if o.get("person") is not None:
                    ref(f, "person", o["person"], "people")
                oficio = o.get("office") or o.get("type")
                if o.get("person") is not None and oficio not in voc.offices:
                    errores.append(f"{f}: el periodo nombra a una persona y su cargo '{oficio}' no está en "
                                   f"offices de data/{VOCABULARY}; pon office")
            elif tipo == "finds":
                ref(f, "found_at", o.get("found_at"), "places")
                for sel in o.get("relates_to") or []:
                    if not existe_sel(datos, sel, ids):
                        errores.append(f"{f}: relates_to '{sel}' no existe (formato tipo:id, p. ej. place:corinto)")
            elif tipo == "tours":
                for i, p in enumerate(o.get("stops") or []):
                    sel = (p or {}).get("sel")
                    if not existe_sel(datos, sel, ids):
                        errores.append(f"{f}: stops[{i}].sel '{sel}' no existe (formato tipo:id, p. ej. place:corinto)")
    errores.extend(cov.errores_referencias(datos))
    return errores


# ---------------------------------------------------------------- el adaptador: de los YAML a lo que lee el sitio

class Legacy:
    """El mapa de la migración leído al revés: claves, valores cerrados y selecciones en inglés pasan al nombre y al
    valor que el sitio lee hoy. Las claves de `new_keys` se quedan en inglés en su ruta. Lo que no sabe traducir lo
    apunta en errors, y build.py no escribe nada."""

    def __init__(self, mapa):
        self.keys = {en: es for es, en in (mapa.get("keys") or {}).items()}
        self.keys.update(BUILD_KEYS)
        self.roots = {}
        for es, en in (mapa.get("directories") or {}).items():
            if es.startswith("data/"):
                self.roots[en.removeprefix("data/")] = es.removeprefix("data/")
        for es, en in (mapa.get("files") or {}).items():
            if es.startswith("data/") and es.endswith(".yaml") and "/" not in es.removeprefix("data/"):
                self.roots[Path(en).stem] = Path(es).stem
        self.enums = [(re.compile(e["at"]), {v: k for k, v in e["values"].items()}, bool(e.get("value_is")))
                      for e in mapa.get("enums") or [] if e.get("at") and isinstance(e.get("values"), dict)]
        self.selections = {en: es for es, en in (mapa.get("selection_types") or {}).items()}
        self.selection_at = [re.compile(p) for p in mapa.get("selection_at") or []]
        self.new_keys = {p: set(ks) for p, ks in (mapa.get("new_keys") or {}).items()}
        self.id_maps = set(mapa.get("id_maps") or [])
        self.relation_legacy = {}
        self.errors = []

    def is_new(self, new_path, k):
        return any(k in ks and (new_path == p or new_path.endswith("." + p)) for p, ks in self.new_keys.items())

    def key(self, k, old, new):
        """(nombre de salida, ruta antigua del hijo) de la clave k de un objeto en la ruta old / new."""
        if self.is_new(new, k):
            return k, f"{old}.{k}"
        es = self.keys.get(k)
        if es is None:
            self.errors.append(f"{new}.{k}: la clave no está en `keys` del mapa; build.py no sabe cómo la lee el sitio")
            es = k
        return es, f"{old}.{es}"

    def value(self, s, old):
        for rx, rev, prefijo in self.enums:
            if rx.search(old):
                if prefijo and ":" in s:
                    cabeza, _, cola = s.partition(":")
                    if cabeza in rev:
                        return f"{rev[cabeza]}:{cola}"
                elif s in rev:
                    return rev[s]
                self.errors.append(f"{old}: el valor «{s}» no está en `enums` del mapa")
                return s
        for rx in self.selection_at:
            if rx.search(old):
                tipo, _, oid = s.partition(":")
                if tipo in self.selections:
                    return f"{self.selections[tipo]}:{oid}"
                self.errors.append(f"{old}: el tipo de selección «{tipo}» no está en `selection_types` del mapa")
                return s
        return s

    def translate(self, v, old, new):
        if isinstance(v, dict):
            out = {}
            for k, x in v.items():
                if isinstance(k, str) and k.startswith("_"):
                    out[k] = x
                elif old in self.id_maps:
                    out[k] = self.translate(x, f"{old}.<id>", f"{new}.<id>")
                else:
                    es, hijo = self.key(k, old, new)
                    out[es] = self.translate(x, hijo, f"{new}.{k}")
            return out
        if isinstance(v, list):
            return [self.translate(x, f"{old}[]", f"{new}[]") for x in v]
        if isinstance(v, str):
            return self.value(v, old)
        return v


def compile_relation(pid, i, r, datos, voc, leg, citas, cobertura, dups, nombres):
    """Una relación tal como la lee el sitio: los campos de siempre y, al lado, los nuevos (modelo.md, sección 11)."""
    viejo, nuevo = "personas.relaciones[]", "people.relations[]"
    tipo = voc.types.get(r.get("type")) or {}
    out = {}
    for k, x in r.items():
        if k == "type":
            out["tipo"] = tipo.get("legacy")
        elif k == "person":
            out["persona"] = x
        elif k == "place":
            out["lugar"] = x
        elif k in ("word", "caption"):
            if "relacion" not in out:
                out["relacion"] = (voc.words.get(x) or {}).get("es") if k == "word" else x
        elif k == "inverse_caption":
            out["relacion_inversa"] = x
        elif k in ("office", "certainty", "checked_on"):
            continue
        else:
            es, hijo = leg.key(k, viejo, nuevo)
            out[es] = leg.translate(x, hijo, f"{nuevo}.{k}")
    owner = nombres.get(("person", pid), pid)
    destino = ("person", r["person"]) if r.get("person") else ("place", r.get("place"))
    verb, inverse_verb = relation_verbs(r, voc, owner, nombres.get(destino, destino[1] or ""))
    palabra = voc.words.get(r.get("word")) or {}
    familia = palabra.get("family")
    nuevos = {
        "type": r.get("type"), "word": r.get("word"), "office": r.get("office"), "certainty": r.get("certainty"),
        "checked_on": r.get("checked_on"), "verb": verb, "inverse_verb": inverse_verb,
        "key": relation_key(pid, r, voc), "reference": relation_reference(r, datos, citas, cobertura),
        "family": familia, "inverse_family": FAMILY_ACROSS.get(familia, familia),
        "inverse_label": palabra.get("inverse_es"), "duplicate_of": dups.get((pid, i)),
    }
    siempre = {"type", "checked_on", "verb", "inverse_verb", "key"}
    out.update({k: v for k, v in nuevos.items() if v is not None or k in siempre})
    return out


def _legacy_date(d, leg):
    return leg.translate(d, "x.fecha", "x.date") if isinstance(d, dict) else d


def compile_offices(datos, voc, leg):
    """{persona: [cargos]}: cada relación holds_office y cada periodo con person (modelo.md, sección 8)."""
    out = {}
    for p in datos["people"]:
        for r in p.get("relations") or []:
            if isinstance(r, dict) and r.get("type") == "holds_office":
                out.setdefault(p["id"], []).append({
                    "office": r.get("office"), "es": (voc.offices.get(r.get("office")) or {}).get("es"),
                    "place": r.get("place"), "date": _legacy_date(r.get("date"), leg),
                    "inferred": bool(r.get("inferred")), "sources": r.get("sources") or [], "reason": r.get("reason"),
                    "status": r.get("status"), "checked_on": r.get("checked_on"), "origin": "relation"})
    for pe in datos["periods"]:
        if not pe.get("person"):
            continue
        oficio = pe.get("office") or pe.get("type")
        out.setdefault(pe["person"], []).append({
            "office": oficio, "es": (voc.offices.get(oficio) or {}).get("es"), "place": (pe.get("places") or [None])[0],
            "date": _legacy_date(pe.get("date"), leg), "inferred": bool(pe.get("inferred")),
            "sources": pe.get("sources") or [], "reason": pe.get("reason"), "status": pe.get("status"),
            "checked_on": pe.get("checked_on"), "origin": f"period:{pe['id']}"})
    for lista in out.values():
        lista.sort(key=lambda c: ((c["date"] or {}).get("desde") if (c["date"] or {}).get("desde") is not None
                                  else 10**6, c["origin"]))
    return out


def compile_roles(e, leg):
    """Cada papel de un suceso como {role, date, place}, con la fecha y el lugar resueltos: los suyos o, si no los
    lleva, la fecha del suceso y su primer lugar cuando el suceso sitúa allí a esa persona (modelo.md, sección 7)."""
    out = {}
    presentes = e.get("present")
    primero = (e.get("places") or [None])[0]
    for pid, papel in (e.get("roles") or {}).items():
        papel = papel if isinstance(papel, dict) else {"role": papel}
        lugar = papel.get("place")
        if lugar is None and primero and (presentes is None or pid in presentes):
            lugar = primero
        out[pid] = {"role": papel.get("role"), "date": _legacy_date(papel.get("date") or e.get("date"), leg),
                    "place": lugar}
    return out


def legacy_data(datos, leg):
    """Los datos con los nombres y los valores de siempre, para componer data.json, la base y el registro."""
    voc = Vocabulary(datos.get("vocabulary"))
    citas = cov.Citas(datos["books"])
    cobertura = coverage_citations(datos)
    partners = {}
    dups = duplicates(datos, voc, partners)
    nombres = {("person", o.get("id")): o.get("name") for o in datos["people"]}
    nombres.update({("place", o.get("id")): o.get("name") for o in datos["places"]})
    oficios = compile_offices(datos, voc, leg)
    compiled = {}
    out = {"fuentes": leg.translate(datos["sources"], "fuentes", "sources"),
           "libros": leg.translate(datos["books"], "libros.libros", "books.books"),
           "calendario": leg.translate(datos["calendar"], "calendario", "calendar")}
    for t in TYPES:
        raiz = leg.roots[t]
        lista = []
        for o in datos[t]:
            obj = {}
            for k, x in o.items():
                if k.startswith("_"):
                    obj[k] = x
                elif t == "people" and k == "relations":
                    obj["relaciones"] = []
                    for i, r in enumerate(x or []):
                        if isinstance(r, dict) and r.get("type") != "holds_office":
                            c = compile_relation(o["id"], i, r, datos, voc, leg, citas, cobertura, dups, nombres)
                            compiled[(o["id"], i)] = c
                            obj["relaciones"].append(c)
                elif t == "events" and k == "roles":
                    obj["roles"] = compile_roles(o, leg)
                else:
                    es, hijo = leg.key(k, raiz, t)
                    obj[es] = leg.translate(x, hijo, f"{t}.{k}")
            if t == "people" and oficios.get(o.get("id")):
                obj["offices"] = oficios[o["id"]]
            lista.append(obj)
        out[raiz] = lista
    merge_pair_copies(compiled, partners, voc)
    compile_shapes(out[leg.roots["places"]], datos)
    compile_guesses(out[leg.roots["journeys"]], datos)
    return out


def compile_shapes(lugares, datos):
    """Añade a cada `shape` su contorno (`ring`, [[lon, lat], ...] cerrado) y su caja (`bbox`), que el sitio dibuja y
    encuadra tal cual. La forma de un lugar rodea su punto; la de un candidato, el de su zona."""
    puntos = formas.puntos_de_vertices(datos["places"])
    for o in lugares:
        hay = [(o.get("shape"), o.get("lat"), o.get("lon"))]
        hay += [(c.get("shape"), (c.get("geometria") or {}).get("lat"), (c.get("geometria") or {}).get("lon"))
                for c in o.get("candidatos") or []]
        for forma, lat, lon in hay:
            if forma and lat is not None and lon is not None:
                forma["ring"] = formas.anillo(forma, lat, lon, puntos)
                forma["bbox"] = formas.caja(forma["ring"])


def compile_guesses(viajes, datos):
    """Añade su contorno (`ring`) y su caja (`bbox`) a cada zona que conjeturamos para un área desconocida
    (`unknown_area.guesses`), como a la forma de una zona: el sitio la dibuja y la encuadra tal cual."""
    puntos = formas.puntos_de_vertices(datos["places"])
    for v in viajes:
        for p in v.get("paradas") or []:
            for z in (p.get("unknown_area") or {}).get("guesses") or []:
                c = z.get("center") or {}
                z["ring"] = formas.anillo(z, c.get("lat"), c.get("lon"), puntos)
                z["bbox"] = formas.caja(z["ring"])


def merge_pair_copies(compiled, partners, voc):
    """La copia que manda de un par doble recibe lo que la otra dice del mismo par y el sitio no dibuja: los pasajes de
    su referencia (la referencia es del par, no de la ficha) y, si ella no lo lleva, el nombre del vínculo visto desde
    el otro lado, que es el `es` de la palabra de la otra copia («hijo adoptivo», «hermano»)."""
    for drop, keep in partners.items():
        d, k = compiled.get(drop), compiled.get(keep)
        if d is None or k is None:
            continue
        refs = [x for x in (k.get("reference") or "").split("; ") if x]
        refs += [x for x in (d.get("reference") or "").split("; ") if x and x not in refs]
        if refs:
            k["reference"] = "; ".join(refs)
        palabra = (voc.words.get(d.get("word")) or {}).get("es")
        if palabra and not k.get("inverse_label"):
            k["inverse_label"] = palabra


# ---------------------------------------------------------------- salida

def limpio(o):
    return {k: v for k, v in o.items() if not k.startswith("_")}


def clave_fecha(o, campo="fecha"):
    f = o.get(campo) or {}
    d, h = f.get("desde"), f.get("hasta")
    return (d if d is not None else 10**6, h if h is not None else 10**6)


def orden_en_serie(o):
    """Con la misma fecha, los sucesos y los viajes de una serie van en el orden del relato y no por id."""
    r = o.get("orden_relato") or {}
    n = r.get("orden")
    return (r.get("serie") or "", n if isinstance(n, (int, float)) else 10**9)


def tramos_aparte(v):
    """En data.json, `companeros` es una lista de ids, como la lee el servidor MCP del atlas (formato v0). Un acompañante
    que va solo en un tramo de paradas deja su id allí y su tramo en `tramos_companeros`, {persona, desde, hasta}."""
    comps = v.get("companeros") or []
    if all(isinstance(c, str) for c in comps):
        return v
    ids, tramos = [], [c for c in comps if isinstance(c, dict)]
    for c in comps:
        pid = c.get("persona") if isinstance(c, dict) else c
        if pid not in ids:
            ids.append(pid)
    out = {}
    for k, x in v.items():
        out[k] = ids if k == "companeros" else x
        if k == "companeros":
            out["tramos_companeros"] = tramos
    return out


def componer(datos, hoy, leg=None):
    """data.json a partir de los datos en inglés. Devuelve (salida, legado, errores del adaptador)."""
    leg = leg or Legacy(load_map())
    # Los textos en otro idioma van en su propio fichero (capas_idioma); data.json sigue siendo el español de siempre.
    L = legacy_data(languages.strip(datos), leg)
    cartas = sorted(L["cartas"], key=lambda c: clave_fecha(c) + (
        ORDEN_LIBROS.index(c["id"]) if c["id"] in ORDEN_LIBROS else 99, c["id"]))
    salida = {
        "formato": FORMATO,
        "generado": hoy,
        "fuentes": {k: L["fuentes"][k] for k in sorted(L["fuentes"])},
        "libros": L["libros"],
        "calendario": L["calendario"],
        "lugares": {o["id"]: limpio(o) for o in sorted(L["lugares"], key=lambda o: o["id"])},
        "personas": {o["id"]: limpio(o) for o in sorted(L["personas"], key=lambda o: o["id"])},
        # Un viaje empieza donde acaba el anterior de su persona: con el mismo año de salida manda el orden
        # del relato, aunque sus anclas den a uno un final un año antes (Elías huye al Horeb tras el Carmelo).
        "viajes": [tramos_aparte(limpio(o)) for o in sorted(L["viajes"], key=lambda o: clave_fecha(o)[:1] + orden_en_serie(o)
                                             + clave_fecha(o)[1:] + (o["id"],))],
        "cartas": [limpio(o) for o in cartas],
        "eventos": [limpio(o) for o in sorted(L["eventos"], key=lambda o: clave_fecha(o) + orden_en_serie(o) + (o["id"],))],
        "periodos": [limpio(o) for o in sorted(L["periodos"], key=lambda o: clave_fecha(o) + (o["id"],))],
        "hallazgos": [limpio(o) for o in sorted(L["hallazgos"],
                                                key=lambda o: clave_fecha(o, "fecha_objeto") + (o["id"],))],
        "recorridos": [limpio(o) for o in sorted(L["recorridos"], key=lambda o: o["id"])],
        # Resumen de data/coverage/: solo los libros que tienen fichero. El sitio todavía no lo muestra.
        "cobertura": cov.para_el_sitio(datos),
    }
    return salida, L, list(leg.errors)


def capas_idioma(datos, leg=None):
    """{idioma: capa} con los textos de cada idioma de languages.LANGUAGES, para site/data.<idioma>.json.

    La capa tiene las claves y la forma de data.json: `lugares`, `personas` y `eventos` (y los demás tipos) por id, cada
    ficha con solo sus textos en ese idioma; `fuentes` por id con `titulo`, `obra` y `url`; `libros` por slug. Una lista
    de la ficha (nombres, enlaces, relaciones, historial) conserva su largo y su orden de data.json, con null donde no hay
    texto: el sitio funde la capa sobre data.json elemento a elemento. Los cargos de una persona van en `offices`, como
    en data.json, con los textos de sus relaciones holds_office y de sus periodos. Solo entran las fichas cuyo primer nivel lleva el
    idioma; validate.py ya ha comprobado que están enteras."""
    leg = leg or Legacy(load_map())
    voc = Vocabulary(datos.get("vocabulary"))
    cargos = compile_offices(datos, voc, leg)
    out = {}
    for lang in languages.LANGUAGES:
        capa = {"formato": FORMATO, "idioma": lang}
        # Los cargos (`offices` de data.json) salen de las relaciones holds_office y de los periodos con persona: se
        # compilan otra vez con los textos de este idioma en su sitio, en el mismo orden, y la capa lleva lo que cambia.
        cargos_lang = compile_offices({"people": languages.localized(datos["people"], lang),
                                       "periods": languages.localized(datos["periods"], lang)}, voc, leg)
        for t in TYPES:
            raiz = leg.roots[t]
            fichas = {}
            for o in datos[t]:
                if not isinstance(o.get(lang), dict):
                    continue
                o = limpio(o)
                if t == "people":
                    # data.json no lleva en `relaciones` las de holds_office (van en `offices`): mismo largo y orden.
                    o["relations"] = [r for r in o.get("relations") or [] if isinstance(r, dict) and r.get("type") != "holds_office"]
                fichas[o["id"]] = leg.translate(languages.layer(o, lang), raiz, t)
                if t == "people":
                    of = languages.changed_texts(cargos.get(o["id"]), cargos_lang.get(o["id"]))
                    if of:
                        fichas[o["id"]]["offices"] = of
            capa[raiz] = fichas
        capa["fuentes"] = {}
        for fid in sorted(datos["sources"]):
            f = datos["sources"][fid]
            x = languages.source_in(f, datos["books"], lang)
            if x and x.get("url") != f.get("url"):
                capa["fuentes"][fid] = {"titulo": x["title"], "obra": x["work"], "url": x["url"]}
        capa["libros"] = {b["slug"]: leg.translate(languages.layer(b, lang), "libros.libros[]", "books.books[]")
                          for b in datos["books"] if isinstance(b.get(lang), dict)}
        out[lang] = capa
    return out


def escribir_capa(capa, rutas, ruta_js):
    """data.<idioma>.json y su copia data.<idioma>.js para file://, como escribir_json."""
    texto = json.dumps(capa, ensure_ascii=False, indent=1) + "\n"
    for r in rutas:
        r.parent.mkdir(parents=True, exist_ok=True)
        r.write_text(texto, encoding="utf-8")
    js = (f"// Copia de data.{capa['idioma']}.json para abrir el sitio desde file://. La genera scripts/build.py.\n"
          f"window.BIBLICAL_ATLAS_DATA_{capa['idioma'].upper()} = " + json.dumps(capa, ensure_ascii=False) + ";\n")
    ruta_js.parent.mkdir(parents=True, exist_ok=True)
    ruta_js.write_text(js, encoding="utf-8")


def escribir_json(salida, rutas, ruta_js):
    texto = json.dumps(salida, ensure_ascii=False, indent=1) + "\n"
    for r in rutas:
        r.parent.mkdir(parents=True, exist_ok=True)
        r.write_text(texto, encoding="utf-8")
    # Desde file:// el navegador no deja leer data.json; la web carga esta copia.
    js = ("// Copia de data.json para abrir el sitio desde file://. La genera scripts/build.py.\n"
          "window.BIBLICAL_ATLAS_DATA = " + json.dumps(salida, ensure_ascii=False) + ";\n")
    ruta_js.parent.mkdir(parents=True, exist_ok=True)
    ruta_js.write_text(js, encoding="utf-8")


# ---------------------------------------------------------------- los dos trozos del sitio

# El sitio abre con data.core.json y pide data.detail.json cuando una ficha, el grafo o la búsqueda lo necesitan
# (site/js/data-chunks.js). data.json sigue entero para el servidor MCP y para quien lo lea de fuera. La regla está
# en docs/development.md, «Los trozos de los datos»: una clave de DETAIL_KEYS va al detalle, a cualquier profundidad
# dentro de cada ficha de su colección; las demás se quedan en el núcleo. Las relaciones y las fuentes van al revés:
# solo las claves de RELATION_CORE_KEYS y SOURCE_CORE_KEYS se quedan en el núcleo (y SOURCE_MAP_KEYS en las fuentes que
# nombra el mapa). Las demás colecciones van enteras en el núcleo.
DETAIL_KEYS = {
    "personas": {"razon", "historial", "enlaces", "consultado", "checked_on", "perspicacia", "no_afirmamos",
                 "no_confundir_con", "desambiguacion", "resumen", "offices"},
    "lugares": {"razon", "historial", "enlaces", "consultado", "checked_on", "coord_nota", "coord_url", "coord_fuente",
                "no_afirmamos", "resumen"},
    "eventos": {"razon", "historial", "enlaces", "consultado"},
    "viajes": {"razon", "historial", "consultado", "checked_on", "resumen"},
}
# Lo que leen el mapa y la línea de una relación: dónde y cuándo sitúa a alguien, si es deducida y sus fuentes.
RELATION_CORE_KEYS = {"tipo", "persona", "lugar", "fecha", "fuentes", "deducido", "estado"}
# De una fuente, el filtro «Solo fuentes principales» lee su nivel y las cifras de la portada, si es un capítulo.
SOURCE_CORE_KEYS = {"nivel", "implicita"}
# De la fuente que propone la zona de un lugar desconocido (`according_to`), la leyenda y las etiquetas del mapa leen
# también su título y su obra: «según Perspicacia «Estrella»».
SOURCE_MAP_KEYS = {"titulo", "obra"}
CHUNK_FILES = {"core": "data.core.json", "detail": "data.detail.json"}


def _strip_keys(value, keys):
    """(núcleo, detalle) de un valor: las claves de `keys` van enteras al detalle, a cualquier profundidad. Una lista
    deja en el detalle una lista igual de larga, con null donde no hay nada que mover; sin nada que mover, None."""
    if isinstance(value, dict):
        core, detail = {}, {}
        for k, v in value.items():
            if k in keys:
                detail[k] = v
                continue
            core[k], d = _strip_keys(v, keys)
            if d is not None:
                detail[k] = d
        return core, (detail or None)
    if isinstance(value, list):
        pairs = [_strip_keys(v, keys) for v in value]
        details = [d for _, d in pairs]
        return [c for c, _ in pairs], (details if any(d is not None for d in details) else None)
    return value, None


def _keep_keys(obj, keys):
    """(núcleo, detalle) de un objeto que solo deja en el núcleo las claves de `keys`."""
    core = {k: v for k, v in obj.items() if k in keys}
    detail = {k: v for k, v in obj.items() if k not in keys}
    return core, (detail or None)


def fuentes_del_mapa(salida):
    """Las fuentes que nombra el mapa: las que proponen la zona de un lugar desconocido (`according_to`)."""
    return {g["according_to"] for v in salida.get("viajes") or [] for p in v.get("paradas") or []
            for g in (p.get("unknown_area") or {}).get("guesses") or [] if g.get("according_to")}


def split_chunks(salida):
    """(núcleo, detalle) de data.json. Unir el detalle al núcleo con merge_chunks da data.json otra vez."""
    core, detail = {}, {}
    del_mapa = fuentes_del_mapa(salida)
    for name, value in salida.items():
        if name == "fuentes":
            core[name], detail[name] = {}, {}
            for fid, f in value.items():
                core[name][fid], d = _keep_keys(f, SOURCE_CORE_KEYS | (SOURCE_MAP_KEYS if fid in del_mapa else set()))
                if d:
                    detail[name][fid] = d
            continue
        if name not in DETAIL_KEYS:
            core[name] = value
            continue
        by_id = isinstance(value, dict)
        items = list(value.items()) if by_id else list(enumerate(value))
        cores, details = {}, {}
        for key, obj in items:
            obj = dict(obj)
            rel_detail = None
            if obj.get("relaciones"):
                pairs = [_keep_keys(r, RELATION_CORE_KEYS) for r in obj["relaciones"]]
                obj["relaciones"] = [c for c, _ in pairs]
                if any(d for _, d in pairs):
                    rel_detail = [d for _, d in pairs]
            c, d = _strip_keys(obj, DETAIL_KEYS[name])
            if rel_detail:
                d = {**(d or {}), "relaciones": rel_detail}
            cores[key] = c
            if d:
                details[key] = d
        if by_id:
            core[name], detail[name] = cores, details
        else:
            core[name] = [cores[i] for i in range(len(value))]
            detail[name] = [details.get(i) for i in range(len(value))]
    return core, detail


def merge_chunks(core, detail):
    """Une el detalle al núcleo, como hace el sitio (mergeInto en site/js/data-chunks.js): un objeto se une clave a
    clave, una lista posición a posición (null no aporta nada) y cualquier otro valor se pone. Cambia `core`."""
    if detail is None:
        return core
    if isinstance(core, dict) and isinstance(detail, dict):
        for k, v in detail.items():
            core[k] = merge_chunks(core[k], v) if k in core else v
        return core
    if isinstance(core, list) and isinstance(detail, list) and len(core) == len(detail):
        return [merge_chunks(c, d) for c, d in zip(core, detail)]
    return detail


def check_chunks(salida, core, detail):
    """Errores de los trozos: el núcleo más el detalle tienen que dar data.json, clave a clave, y las cifras de las
    fuentes de la portada (que cuenta sobre el núcleo) tienen que ser las de data.json."""
    errores = []
    union = merge_chunks(json.loads(json.dumps(core)), json.loads(json.dumps(detail)))
    if union != salida:
        perdidas = sorted(_diff_paths(salida, union))
        errores.append(f"núcleo + detalle no dan data.json: {len(perdidas)} diferencias, la primera en {perdidas[0]}")
    if cifras_fuentes(core) != cifras_fuentes(salida):
        errores.append(f"las cifras de las fuentes del núcleo {cifras_fuentes(core)} no son las de data.json "
                       f"{cifras_fuentes(salida)}: alguna fuente solo la cita una clave que va al detalle")
    return errores


def _diff_paths(a, b, path="$"):
    """Rutas donde a y b no coinciden: falta una clave, sobra o cambia un valor."""
    if isinstance(a, dict) and isinstance(b, dict):
        for k in a.keys() | b.keys():
            if k not in a or k not in b:
                yield f"{path}.{k}"
            else:
                yield from _diff_paths(a[k], b[k], f"{path}.{k}")
    elif isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        for i, (x, y) in enumerate(zip(a, b)):
            yield from _diff_paths(x, y, f"{path}[{i}]")
    elif a != b:
        yield path


def escribir_trozos(trozos, carpeta):
    """data.core.json y data.detail.json junto al data.json del sitio, sin espacios: el sitio no los lee a mano."""
    for nombre, valor in trozos.items():
        (carpeta / CHUNK_FILES[nombre]).write_text(json.dumps(valor, ensure_ascii=False, separators=(",", ":")) + "\n",
                                                  encoding="utf-8")


CONTADOS = ("lugares", "personas", "eventos", "periodos", "cartas", "viajes", "hallazgos", "recorridos", "fuentes", "libros")


def cifras_fuentes(salida):
    """(fuentes escritas que algún dato cita, capítulos de la Biblia que añade la compilación). Son las dos cifras de
    la portada (cifrasFuentes en site/js/portada.js cuenta igual) y de las insignias del README. Los cargos de una
    persona (`offices`) se compilan con sus fuentes en `sources`, así que se cuentan las dos claves."""
    F = salida["fuentes"]
    citadas = {fid for k, v in salida.items() if k != "fuentes"
               for claves in (("fuentes", "fuente"), ("sources", "source")) for _, fid in fuentes_de(v, claves)}
    return (sum(1 for fid, f in F.items() if not f.get("implicita") and fid in citadas),
            sum(1 for f in F.values() if f.get("implicita")))


def _cuenta_fuentes(salida):
    """La fila «Fuentes» del índice del registro: el total de su página y, dentro, las mismas dos cifras que la
    portada y las insignias del README, para que las tres no parezcan contar cosas distintas."""
    total = len(salida["fuentes"])
    enlazadas, capitulos = cifras_fuentes(salida)
    sin_citar = total - enlazadas - capitulos
    partes = [f"{enlazadas} enlazadas por algún dato", f"{capitulos} capítulos de la Biblia"]
    if sin_citar:
        partes.append(f"{sin_citar} sin citar")
    return f"{total}: {', '.join(partes[:-1])} y {partes[-1]}"


def resumen(salida):
    """Cuántas fichas hay de cada tipo. Lo leen las insignias del README a través de site/stats.json. `fuentes` son
    las escritas que algún dato cita y `capitulos`, los capítulos de la Biblia que la compilación crea como fuentes."""
    r = {"generado": salida["generado"]}
    r.update({k: len(salida[k]) for k in CONTADOS})
    r["fuentes"], r["capitulos"] = cifras_fuentes(salida)
    return r


def escribir_resumen(salida, ruta):
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(json.dumps(resumen(salida), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


# Lo que el service worker (site/sw.js) puede guardar: cada fichero publicado de site/ salvo la documentación, los
# datos de prueba, los textos para quien lee el repositorio y el propio worker. docs/development.md, «Sin conexión».
SW_SKIP = ("docs/", "_local/")
SW_SELF = ("sw.js", "sw-manifest.js")


def write_sw_manifest(sitio):
    """Escribe sitio/sw-manifest.js: la huella SHA-256 de cada fichero que el worker puede servir y la versión, que
    resume esas huellas y el propio sw.js. Un fichero cambiado da otra versión y el worker lo nota al buscar
    actualizaciones. Devuelve la versión."""
    files = {}
    for f in sorted(sitio.rglob("*")):
        rel = f.relative_to(sitio).as_posix()
        if (not f.is_file() or rel.startswith(SW_SKIP) or rel in SW_SELF or rel.endswith(".md")
                or any(p.startswith(".") for p in rel.split("/"))):
            continue
        files[rel] = hashlib.sha256(f.read_bytes()).hexdigest()
    worker = sitio / "sw.js"
    digest = json.dumps(files, sort_keys=True).encode() + (worker.read_bytes() if worker.exists() else b"")
    version = hashlib.sha256(digest).hexdigest()[:16]
    (sitio / "sw-manifest.js").write_text(
        "// Lo escribe scripts/build.py: la versión del sitio y la huella de cada fichero que site/sw.js puede servir.\n"
        f"self.SW_MANIFEST = {json.dumps({'version': version, 'files': files}, indent=1)};\n", encoding="utf-8")
    return version


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
        coord_fuente TEXT, coord_url TEXT, resumen TEXT, razon TEXT, consultado TEXT, estado TEXT, forma TEXT);
    CREATE TABLE lugar_nombres (lugar_id TEXT REFERENCES lugares(id), orden INTEGER, nombre TEXT,
        desde INTEGER, hasta INTEGER, nota TEXT);
    CREATE TABLE candidatos (lugar_id TEXT REFERENCES lugares(id), orden INTEGER, nombre TEXT, geometria TEXT,
        estado TEXT, razon TEXT, checked_on TEXT, forma TEXT);
    CREATE TABLE personas (id TEXT PRIMARY KEY, nombre TEXT, nombres TEXT, {fecha}, desambiguacion TEXT,
        resumen TEXT, razon TEXT, consultado TEXT, estado TEXT);
    CREATE TABLE relaciones (persona_id TEXT REFERENCES personas(id), orden INTEGER, tipo TEXT, persona TEXT,
        lugar TEXT, relacion TEXT, relacion_inversa TEXT, {fecha}, deducido INTEGER, razon TEXT, estado TEXT,
        type TEXT, word TEXT, office TEXT, certainty TEXT, checked_on TEXT, key TEXT);
    CREATE TABLE viajes (id TEXT PRIMARY KEY, nombre TEXT, persona_id TEXT REFERENCES personas(id), grupo TEXT,
        referencia TEXT, {fecha}, companeros TEXT, tramos_companeros TEXT, resumen TEXT, razon TEXT, consultado TEXT, estado TEXT,
        repeats TEXT);
    CREATE TABLE paradas (viaje_id TEXT REFERENCES viajes(id), orden INTEGER, lugar_id TEXT REFERENCES lugares(id),
        referencia TEXT, {fecha}, nota TEXT, razon TEXT, estado TEXT, checked_on TEXT, branches_from INTEGER, unknown_area TEXT,
        PRIMARY KEY (viaje_id, orden));
    CREATE TABLE cartas (id TEXT PRIMARY KEY, libro TEXT, escritor TEXT, referencia TEXT, escrita_en TEXT, {fecha},
        destinatarios_texto TEXT, destinatarios_lugares TEXT, destinatarios_personas TEXT, portadores TEXT,
        contexto_origen TEXT, contexto_destino TEXT, razon TEXT, consultado TEXT, estado TEXT);
    CREATE TABLE eventos (id TEXT PRIMARY KEY, titulo TEXT, {fecha}, lugares TEXT, personas TEXT, pasajes TEXT,
        orden_serie TEXT, orden_num INTEGER, resumen TEXT, razon TEXT, consultado TEXT, estado TEXT,
        type TEXT, roles TEXT);
    CREATE TABLE periodos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, persona_id TEXT, {fecha}, lugares TEXT,
        resumen TEXT, razon TEXT, consultado TEXT, estado TEXT, office TEXT);
    CREATE TABLE hallazgos (id TEXT PRIMARY KEY, nombre TEXT, lugar_hallazgo TEXT, relaciona TEXT, {fecha},
        resumen TEXT, razon TEXT, consultado TEXT, estado TEXT);
    CREATE TABLE recorridos (id TEXT PRIMARY KEY, titulo TEXT, paradas TEXT, razon TEXT, consultado TEXT, estado TEXT);
    CREATE TABLE hechos_fuentes (tipo TEXT, id TEXT, fuente_id TEXT REFERENCES fuentes(id));
    """)
    j = lambda x: json.dumps(x or [], ensure_ascii=False)
    forma = lambda o: json.dumps(o["shape"], ensure_ascii=False) if o.get("shape") else None
    fuentes_legado = ("fuentes", "fuente")

    def ins(tabla, valores):
        db.execute(f"INSERT INTO {tabla} VALUES ({','.join('?' * len(valores))})", valores)
    hf = []

    def fuentes_hecho(tipo, hid, obj):
        vistos = []
        for _, fid in fuentes_de(obj, fuentes_legado):
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
                        o["coord_url"], o["resumen"], o["razon"], o["consultado"], o["estado"], forma(o)))
        for i, n in enumerate(o.get("nombres") or []):
            ins("lugar_nombres", (o["id"], i, n["nombre"], n.get("desde"), n.get("hasta"), n.get("nota")))
        for i, c in enumerate(o.get("candidatos") or []):
            ins("candidatos", (o["id"], i, c.get("nombre"), json.dumps(c.get("geometria"), ensure_ascii=False),
                               c.get("estado"), c.get("razon"), c.get("checked_on"), forma(c)))
        fuentes_hecho("lugar", o["id"], o)
    for o in salida["personas"].values():
        ins("personas", (o["id"], o["nombre"], j(o.get("nombres")), *_fecha_cols(o.get("fecha")),
                         o.get("desambiguacion"), o["resumen"], o["razon"], o["consultado"], o["estado"]))
        for i, r in enumerate(o.get("relaciones") or []):
            ins("relaciones", (o["id"], i, r.get("tipo"), r.get("persona"), r.get("lugar"), r.get("relacion"),
                               r.get("relacion_inversa"), *_fecha_cols(r.get("fecha")), int(bool(r.get("deducido"))),
                               r.get("razon"), r.get("estado"), r.get("type"), r.get("word"), r.get("office"),
                               r.get("certainty"), r.get("checked_on"), r.get("key")))
        fuentes_hecho("persona", o["id"], {k: v for k, v in o.items() if k != "offices"})
    for o in salida["viajes"]:
        ins("viajes", (o["id"], o["nombre"], o["persona"], o.get("grupo"), o["referencia"], *_fecha_cols(o.get("fecha")),
                       j(o.get("companeros")), j(o.get("tramos_companeros")), o["resumen"], o.get("razon"), o.get("consultado"), o.get("estado"),
                       o.get("repeats")))
        fuentes_hecho("viaje", o["id"], {k: v for k, v in o.items() if k != "paradas"})
        for p in o.get("paradas") or []:
            ins("paradas", (o["id"], p["orden"], p["lugar"], p["referencia"], *_fecha_cols(p.get("fecha")),
                            p.get("nota"), p["razon"], p["estado"], p.get("checked_on"), p.get("branches_from"),
                            json.dumps(p["unknown_area"], ensure_ascii=False) if p.get("unknown_area") else None))
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
                        o.get("consultado"), o["estado"], o.get("type"),
                        json.dumps(o["roles"], ensure_ascii=False) if o.get("roles") is not None else None))
        fuentes_hecho("evento", o["id"], o)
    for o in salida["periodos"]:
        ins("periodos", (o["id"], o["nombre"], o["tipo"], o.get("persona"), *_fecha_cols(o.get("fecha")),
                         j(o.get("lugares")), o["resumen"], o["razon"], o.get("consultado"), o["estado"],
                         o.get("office")))
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
    """Qué buscar en wol.jw.org para releer un hecho de los YAML: su search o, si no lo lleva, su nombre."""
    if o.get("search"):
        return o["search"]
    return o.get("name") or o.get("book") or o.get("title") or o["id"]


def _legacy_term(o):
    if o.get("buscar"):
        return o["buscar"]
    return o.get("nombre") or o.get("libro") or o.get("titulo") or o["id"]


def _celda(s):
    return str(s if s is not None else "").replace("|", "\\|").replace("\n", " ")


def _fila(afirmacion, fichero, ids, fuentes, consultado, razon, estado):
    enlaces = ", ".join(f"[{i}]({fuentes[i]['url']})" if i in fuentes else i for i in ids or [])
    pub = sorted({str(fuentes[i]["publicado"]) for i in ids or [] if i in fuentes and fuentes[i].get("publicado")})
    fich = f"[{fichero.removeprefix('data/')}]({GITHUB}{fichero})"
    return "| " + " | ".join(_celda(x) for x in (afirmacion, fich, enlaces, ", ".join(pub) or "sin dato",
                                                   consultado, razon, estado)) + " |"


def _texto_fecha(f):
    return (f or {}).get("texto") or "sin fecha"


CABECERA = "| Afirmación | Fichero | Fuente | Publicado | Consultado | Por qué lo asociamos | Estado |\n|---|---|---|---|---|---|---|"
NOTA_PUBLICADO = "«Publicado» es el año de la publicación cuando la página de wol.jw.org lo muestra; si no lo muestra, pone «sin dato»."
# Los enlaces del registro a ficheros del repositorio son URL absolutas de GitHub: el registro se publica
# también en el sitio de la documentación (mkdocs), donde un enlace relativo fuera de docs/ no resuelve.
GITHUB = "https://github.com/GeiserX/biblical-atlas/blob/main/"
METODO = f"{GITHUB}docs/investigacion/README.md"
REGISTROS = [  # (fichero, título)
    ("lugares", "Lugares"), ("personas", "Personas"), ("viajes", "Viajes y paradas"), ("cartas", "Cartas"),
    ("eventos", "Eventos"), ("periodos", "Periodos"), ("hallazgos", "Hallazgos"), ("recorridos", "Recorridos"),
    ("libros", "Libros y calendario"), ("cobertura", "Cobertura de la Biblia"), ("fuentes", "Fuentes"),
]
ESTADOS_LEGADO = {"verified": "verificado", "pending": "pendiente"}
FORMAS_ES = {"circle": "círculo", "ellipse": "elipse", "box": "caja", "polygon": "polígono"}


def _cabeza(titulo):
    # El bloque de cabecera saca la página del buscador del sitio: las tablas suman varios MB.
    return ["---", "search:", "  exclude: true", "---", "",
            "<!-- Generado por scripts/build.py a partir de data/. No editar a mano. -->", "",
            f"# {titulo}", "",
            "> Este fichero lo genera `scripts/build.py` a partir de `data/`. No lo edites a mano: cambia el YAML y "
            "vuelve a generarlo.",
            f"> Registro de investigación. El método está en [docs/investigacion/README.md]({METODO}) y el índice "
            "del registro en [index.md](index.md).", "",
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
                "Si una publicación nueva dice otra cosa, gana la más reciente y el cambio se anota en `history` "
                f"(ver [docs/investigacion/README.md]({METODO})).", ""])
    for o in objs:
        t = _legacy_term(o)
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


def registros(salida, legado, datos):
    """Devuelve {nombre_fichero: texto} con el registro partido por tipo. legado son los objetos de legacy_datos
    (con su _fichero) y datos los del YAML, que usa el informe de la cobertura."""
    F = salida["fuentes"]
    L = salida["lugares"]
    P = salida["personas"]
    fich = {(t, o["id"]): o["_fichero"] for t in REGISTROS_TIPOS for o in legado[t]}
    docs = {}

    out = _cabeza("Lugares")
    filas, cands, alts, formas_ = [], [], [], []
    for o in L.values():
        f = fich[("lugares", o["id"])]
        filas.append(_fila(f"**{o['nombre']}** ({o['tipo']}, {o['precision']}): {o['resumen']}", f, o["fuentes"], F,
                           o["consultado"], o["razon"], o["estado"]))
        for c in o.get("candidatos") or []:
            g = c.get("geometria") or {}
            cands.append(_fila(f"**{o['nombre']}**, candidato «{c.get('nombre')}» ({g.get('tipo')}, {c.get('estado')})",
                               f, c.get("fuentes"), F, c.get("checked_on") or o["consultado"], c.get("razon"),
                               o["estado"]))
        for de, s in [("", o.get("shape"))] + [(f", candidato «{c.get('nombre')}»", c.get("shape"))
                                                for c in o.get("candidatos") or []]:
            if s:
                formas_.append(_fila(f"**{o['nombre']}**{de}: {FORMAS_ES.get(s['type'], s['type'])}. {s.get('note', '')}", f,
                                     s.get("sources"), F, s.get("checked_on"), s.get("reason"),
                                     ESTADOS_LEGADO.get(s.get("status"), s.get("status"))))
        alts += _alternativas(o, f, F)
    _seccion(out, "Lugares", filas)
    _seccion(out, "Candidatos de ubicación", cands)
    if formas_:
        _seccion(out, "Formas de las zonas", formas_)
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
            ded = ", deducido" if r.get("deducido") else ""
            rels.append(_fila(f"**{o['nombre']}** → **{nombre}**: {r.get('verb')}{ded}", f, r.get("fuentes"), F,
                              r.get("checked_on") or o["consultado"], r.get("razon"), r.get("estado")))
        for c in o.get("offices") or []:
            if c.get("origin") != "relation":
                continue
            donde = f" en **{(L.get(c.get('place')) or {}).get('nombre', c.get('place'))}**" if c.get("place") else ""
            ded = ", deducido" if c.get("inferred") else ""
            rels.append(_fila(f"**{o['nombre']}** fue {c.get('es')}{donde}{ded}", f, c.get("sources"), F,
                              c.get("checked_on") or o["consultado"], c.get("reason"),
                              ESTADOS_LEGADO.get(c.get("status"), c.get("status"))))
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
            # Un área desconocida no tiene lugar: va con las palabras de la fuente.
            area = p.get("unknown_area")
            lug = f"«{area['words']}» (área desconocida)" if area else L.get(p["lugar"], {}).get("nombre", p["lugar"])
            filas.append(_fila(f"{v['nombre']}, parada {p['orden']}: **{lug}** ({p['referencia']}), {_texto_fecha(p.get('fecha'))}",
                               fich[("viajes", v["id"])], p["fuentes"], F, p.get("checked_on") or v.get("consultado"),
                               p["razon"], p["estado"]))
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
        entre = "; ".join(x for x in [donde, "; ".join(o.get("pasajes") or [])] if x)
        filas.append(_fila(f"**{o['titulo']}** ({entre}), {_texto_fecha(o.get('fecha'))}",
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
    out.extend(["`data/books.yaml` y `data/calendar.yaml` son estructura (nombres, abreviaturas, capítulos, meses). "
                "Aquí solo salen los hechos que llevan fuente.", ""])
    filas = []
    for l in salida["libros"]:
        if not any(k in l for k in ("escritor", "lugar", "fecha", "abarca")):
            continue
        partes = [f"escrito por {l['escritor']}" if l.get("escritor") else "",
                  f"en {l['lugar']}" if l.get("lugar") else "",
                  f"terminado {_texto_fecha(l['fecha'])}" if l.get("fecha") else "",
                  f"abarca {_texto_fecha(l['abarca'])}" if l.get("abarca") else ""]
        filas.append(_fila(f"**{l['nombre']}**: " + ", ".join(p for p in partes if p), "data/books.yaml",
                           l.get("fuentes"), F, l.get("consultado"), l.get("razon"), l.get("estado")))
    _seccion(out, "Libros", filas)
    filas = [_fila(f"**{m.get('nombre')}**", "data/calendar.yaml", m.get("fuentes"), F, m.get("consultado"),
                   m.get("razon"), m.get("estado"))
             for m in salida["calendario"].get("meses") or [] if m.get("fuentes")]
    _seccion(out, "Meses", filas)
    filas = [_fila(f"**{n.get('nombre')}** ({m.get('nombre')}): {n.get('nota')}", "data/calendar.yaml",
                   n.get("fuentes"), F, n.get("checked_on") or m.get("consultado"), n.get("razon"), m.get("estado"))
             for m in salida["calendario"].get("meses") or [] for n in m.get("nombres") or []]
    _seccion(out, "Nombres de los meses por época", filas)
    filas = [_fila(f"**{f.get('nombre')}** ({m.get('nombre')}), se celebra desde {_anio_era(f.get('instituida'))}", "data/calendar.yaml",
                   f.get("fuentes"), F, f.get("checked_on") or m.get("consultado"), f.get("razon"),
                   f.get("estado") or m.get("estado"))
             for m in salida["calendario"].get("meses") or [] for f in m.get("fiestas") or []]
    _seccion(out, "Fiestas y desde cuándo se celebran", filas)
    filas = [_fila(f"**{e.get('titulo')}**: {e.get('texto')}", "data/calendar.yaml", e.get("fuentes"), F,
                   e.get("consultado"), e.get("razon"), e.get("estado"))
             for e in salida["calendario"].get("explicacion") or []]
    _seccion(out, "El calendario", filas)
    docs["libros"] = out

    out = _cabeza("Cobertura")
    out.extend(["Qué versículos de la TNM se han leído y apuntado en `data/coverage/<libro>.yaml`. Un capítulo cuenta "
                "como completo cuando sus tramos cubren todos sus versículos, salvo los que la TNM no incluye. "
                f"El formato está en [data/coverage/README.md]({GITHUB}data/coverage/README.md) y el protocolo en "
                f"[docs/investigacion/versiculos.md]({GITHUB}docs/investigacion/versiculos.md).", ""])
    lineas, tot_cob = cov.informe(datos)
    out.extend(lineas)
    docs["cobertura"] = out

    out = _cabeza("Fuentes")
    out.extend(["Las fuentes de `data/sources/*.yaml`. Los capítulos de la Biblia que nadie escribió a mano los crea "
                "`build.py` a partir de `data/books.yaml` y salen marcados como «implícita».", "",
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
               "fuentes": _cuenta_fuentes(salida)}
    indice = ["<!-- Generado por scripts/build.py a partir de data/. No editar a mano. -->", "",
              "# Registro de investigación", "",
              "> Lo genera `scripts/build.py` a partir de `data/`, un fichero por tipo. No se edita a mano.",
              f"> El método y el esquema están en [docs/investigacion/README.md]({METODO}).", "",
              "Cada fila es una afirmación con su fichero, su fuente, el día en que se leyó, por qué la asociamos "
              "y su estado.", "",
              "| Registro | Cuántos |", "|---|---|"]
    indice += [f"| [{titulo}]({nombre}.md) | {cuentas[nombre]} |" for nombre, titulo in REGISTROS]
    indice.append("")
    docs["index"] = indice
    return {nombre: "\n".join(lineas) for nombre, lineas in docs.items()}


REGISTROS_TIPOS = ["lugares", "personas", "viajes", "cartas", "eventos", "periodos", "hallazgos", "recorridos"]


def escribir_registro(salida, legado, datos, carpeta):
    carpeta.mkdir(parents=True, exist_ok=True)
    textos = registros(salida, legado, datos)
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
    ap.add_argument("--out", "--salida", dest="out", default=None,
                    help="escribe data.json, data.js, los dos trozos, stats.json, biblical-atlas.sqlite y registro/ en DIR "
                         "en vez de site/, dist/ y docs/")
    args = ap.parse_args(argv)
    datos, _ = cargar(args.data)
    errores = integridad(datos)
    salida = legado = capas = None
    if not errores:
        salida, legado, errores = componer(datos, datetime.date.today().isoformat())
    if not errores:
        leg = Legacy(load_map())
        capas = capas_idioma(datos, leg)
        errores = list(leg.errors)
        datos = languages.strip(datos)
    if not errores:
        core, detail = split_chunks(salida)
        trozos = {"core": core, "detail": detail}
        errores = check_chunks(salida, core, detail)
    if errores:
        for e in errores:
            print("ERROR", e, file=sys.stderr)
        print(f"build: {len(errores)} errores; no se escribe nada.", file=sys.stderr)
        return 1
    if args.out:
        destino = Path(args.out).resolve()
        escribir_json(salida, [destino / "data.json"], destino / "data.js")
        escribir_trozos(trozos, destino)
        for lang, capa in capas.items():
            escribir_capa(capa, [destino / f"data.{lang}.json"], destino / f"data.{lang}.js")
        escribir_resumen(salida, destino / "stats.json")
        n_hf = escribir_sqlite(salida, destino / "biblical-atlas.sqlite")
        escribir_registro(salida, legado, datos, destino / "registro")
        donde = f" en {destino}"
    else:
        escribir_json(salida, [RAIZ / "dist" / "data.json", RAIZ / "site" / "data.json"], RAIZ / "site" / "data.js")
        escribir_trozos(trozos, RAIZ / "site")
        for lang, capa in capas.items():
            escribir_capa(capa, [RAIZ / "dist" / f"data.{lang}.json", RAIZ / "site" / f"data.{lang}.json"],
                          RAIZ / "site" / f"data.{lang}.js")
        escribir_resumen(salida, RAIZ / "site" / "stats.json")
        n_hf = escribir_sqlite(salida, RAIZ / "dist" / "biblical-atlas.sqlite")
        escribir_registro(salida, legado, datos, RAIZ / "docs" / "investigacion" / "registro")
        write_sw_manifest(RAIZ / "site")   # al final: resume lo que se acaba de escribir en site/
        donde = ""
    n_impl = sum(1 for f in salida["fuentes"].values() if f.get("implicita"))
    rels = [r for p in salida["personas"].values() for r in p.get("relaciones") or []]
    print(f"build{donde}: {len(salida['fuentes'])} fuentes ({n_impl} capítulos implícitos), {len(salida['libros'])} libros, "
          f"{len(salida['lugares'])} lugares, {len(salida['personas'])} personas, {len(salida['viajes'])} viajes, "
          f"{len(salida['cartas'])} cartas, {len(salida['eventos'])} eventos, {len(salida['periodos'])} periodos, "
          f"{len(salida['hallazgos'])} hallazgos, {len(salida['recorridos'])} recorridos, {n_hf} filas en hechos_fuentes.")
    print(f"build: {len(rels)} relaciones, {sum(1 for r in rels if not r.get('reference'))} sin referencia, "
          f"{sum(1 for r in rels if r.get('duplicate_of'))} copias de un par que no mandan, "
          f"{sum(len(p.get('offices') or []) for p in salida['personas'].values())} cargos.")
    for lang, capa in capas.items():
        hay = [f"{len(capa[k])} {k}" for k in ("lugares", "personas", "eventos", "viajes", "cartas", "periodos", "hallazgos",
                                                "recorridos", "libros", "fuentes") if capa.get(k)]
        print(f"build: data.{lang}.json con {', '.join(hay) if hay else 'nada todavía'}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
