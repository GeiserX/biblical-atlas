#!/usr/bin/env python3
"""Valida data/: esquema, fechas, identificadores, fuentes, razones, relaciones, sucesos y cobertura.

Uso:  python3 scripts/validate.py [--data DIR] [--links] [--strict]

--data DIR valida otra copia de los datos (por ejemplo, HEAD más los ficheros de un carril, en /tmp).
--links descarga cada URL una sola vez (GET, 0,5 s entre peticiones) y falla si alguna no da 200.
--strict hace que los avisos también fallen.

Un error sale con código 1. Un aviso (AVISO [código]) se escribe y sale con 0, salvo con --strict. Los códigos de
aviso y cuándo pasan a ser errores están en docs/investigacion/modelo.md, sección 13; el esquema, en ese mismo
documento y en docs/investigacion/README.md. El vocabulario de las relaciones es data/vocabulary.yaml.
"""
import argparse
import collections
import datetime
import math
import re
import string
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bible_coverage  # noqa: E402
import formas  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
MAP = RAIZ / "scripts" / "migration" / "map.yaml"
TYPES = ["places", "people", "journeys", "letters", "events", "periods", "finds", "tours"]
OBRA_TNM = "La Biblia. Traducción del Nuevo Mundo (edición de estudio)"
CAPITULO = re.compile(r"^([a-z0-9]+(?:-[a-z0-9]+)*)-(\d+)$")

ID = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
DIA = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MAX_PALABRAS = 40
PRECISIONES = {"day", "month", "season", "year", "range"}
TIPOS_FECHA = {"anchored", "narrative", "derived"}
ESTACIONES = {"spring", "summer", "autumn", "winter"}
ESTADOS = {"verified", "pending"}
TIPOS_LUGAR = {"city", "region", "island", "province", "port", "cape", "mountain", "river", "sea", "lake", "desert",
               "valley", "plain", "country", "kingdom"}
PRECISION_LUGAR = {"point", "zone", "uncertain"}
GEOMETRIAS = {"point", "zone", "strip"}
ESTADOS_CANDIDATO = {"certain", "favored_level_1", "tradition", "alternative", "level_2_only", "rejected_level_1"}
TIPOS_ENLACE = {"perspicacia", "bible", "video", "external"}
TIPOS_PERIODO = {"emperor", "governor", "power", "king", "era", "high_priest"}
CAMPOS_TEXTO = {"summary", "reason", "note", "change", "text", "explanation", "disambiguation", "unknown",
                "weather", "harvest", "kept_at", "caption", "inverse_caption"}
IDENTIFICACIONES = {"certain", "uncertain"}
# Un año con su era: «537 a.e.c.», «c. 49-52 e.c.», «33 E.C.».
RE_ANIO = re.compile(r"(?<![\d-])(\d{1,4})(?:\s*[-–]\s*(\d{1,4}))?\s*(a\.\s*e\.\s*c\.|e\.\s*c\.)", re.I)

REQUERIDOS = {
    "places": ["id", "name", "names", "type", "lat", "lon", "precision", "coord_source", "coord_url",
               "summary", "reason", "sources", "links", "checked_on", "status"],
    "people": ["id", "name", "names", "summary", "reason", "sources", "links", "checked_on", "status"],
    "journeys": ["id", "name", "person", "reference", "date", "companions", "summary", "reason", "sources",
                 "checked_on", "status", "stops"],
    "letters": ["id", "book", "writer", "reference", "written_in", "date", "recipients", "context_origin",
                "context_destination", "reason", "sources", "links", "checked_on", "status"],
    "events": ["id", "title", "date", "places", "people", "passages", "summary", "reason", "sources",
               "checked_on", "status"],
    "periods": ["id", "name", "type", "date", "summary", "reason", "sources", "checked_on", "status"],
    "finds": ["id", "name", "found_at", "relates_to", "object_date", "summary", "reason", "sources",
              "checked_on", "status"],
    "tours": ["id", "title", "stops", "sources", "reason", "checked_on", "status"],
}
REQ_PARADA = ["order", "place", "reference", "date", "note", "reason", "sources", "checked_on", "status"]
REQ_PARADA_RECORRIDO = ["sel", "t", "text", "passages"]
REQ_FUENTE = ["title", "work", "url", "level", "published", "checked_on"]
ESTRUCTURA_LIBRO = {"slug", "num", "name", "abbr", "forms", "spoken", "chapters"}
# Estructura opcional: el último versículo de cada capítulo y los que la TNM no incluye. No son hechos: sin fuentes.
ESTRUCTURA_LIBRO_OPCIONAL = {"verses", "omitted"}
HECHOS_LIBRO = {"writer", "place", "date", "covers"}
ESTRUCTURA_MES = {"id", "order", "name", "other_names", "names"}
CAMPOS_NOMBRE_MES = {"name", "from", "to", "note", "sources", "reason", "checked_on", "status"}
CAMPOS_EXPLICACION = {"id", "title", "text", "sources", "reason", "checked_on", "status", "history"}
SECCIONES_CALENDARIO = {"months", "explanation"}
CAMPOS_FIESTA = {"name", "from", "to", "instituted_in", "sources", "reason", "status", "checked_on"}
CAMPOS_PAPEL = {"role", "date", "place"}

# Avisos (modelo.md, sección 13). Escriben y salen con 0; con --strict, fallan.
WARNING_CODES = ("wrong_owner", "pair_twice", "outside_pending", "unlisted_caption", "kin_without_word",
                 "bare_company", "no_office", "no_certainty", "same_as_owner", "no_reference", "title_type",
                 "type_without_role")
# «De aviso a error»: cuando main llega a 0 avisos de un código, el código se añade aquí, en un cambio revisado, y ya
# no vuelve atrás. Un código de esta lista sale como error.
PROMOTED = set()
# Un campo que su tipo pide y que falta: estos dos avisan hasta sus decisiones (O1 y O2); cualquier otro es un error.
MISSING_WARNS = {("succeeds", "office"): "no_office", ("same_as", "certainty"): "no_certainty"}
RE_TITULO_PAPEL = re.compile(r"^(Nace|Nacimiento|Muere|Muerte)\b")


# ---------------------------------------------------------------- carga

def _text(v):
    """YAML convierte 2026-09-27 sin comillas en date; lo devolvemos como texto."""
    if isinstance(v, (datetime.date, datetime.datetime)):
        return v.isoformat()[:10]
    if isinstance(v, dict):
        return {k: _text(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_text(x) for x in v]
    return v


def _read(ruta):
    return _text(yaml.safe_load(ruta.read_text(encoding="utf-8")))


def merge_sources(data_dir, errores):
    """Junta data/sources/*.yaml. Un id repetido con la misma url y el mismo title se funde (gana el checked_on más
    reciente); con datos distintos es un error que nombra los dos ficheros."""
    fuentes, origen = {}, {}
    for ruta in sorted((data_dir / "sources").glob("*.yaml")):
        rel = f"data/sources/{ruta.name}"
        contenido = _read(ruta) or {}
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
                if k in ("url", "title", "checked_on") or a == b or a is None or b is None:
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


def sources_of(obj):
    """Todas las fuentes que cita un objeto, con la ruta donde están: listas `sources` y la `source` del historial."""
    out = []

    def rec(x, camino):
        if isinstance(x, dict):
            for k, v in x.items():
                if k == "sources" and isinstance(v, list):
                    out.extend((camino + ".sources", f) for f in v)
                elif k == "source" and isinstance(v, str):
                    out.append((camino + ".source", v))
                else:
                    rec(v, f"{camino}.{k}")
        elif isinstance(x, list):
            for i, v in enumerate(x):
                rec(v, f"{camino}[{i}]")

    rec(obj, "")
    return out


def chapter_of(fid, books):
    """('rut-1') -> (libro, 1) si el id tiene forma <slug>-<cap> y el slug es un libro; si no, None."""
    m = CAPITULO.match(str(fid))
    if not m:
        return None
    libro = next((l for l in books if l.get("slug") == m.group(1)), None)
    return (libro, int(m.group(2))) if libro else None


def load(data_dir):
    """Lee data/ en el esquema de docs/investigacion/modelo.md. Devuelve un dict con sources, books, calendar,
    vocabulary, coverage y una lista de fichas por cada carpeta de TYPES (cada una con _fichero y _nombre_fichero).
    Los errores de carga van a _errores. Sin data/vocabulary.yaml en DIR, toma el del repositorio."""
    data_dir = Path(data_dir)
    errores = []
    fuentes, origen = merge_sources(data_dir, errores)
    books = ((_read(data_dir / "books.yaml") or {}).get("books") or []) if (data_dir / "books.yaml").exists() else []
    calendar = (_read(data_dir / "calendar.yaml") or {}) if (data_dir / "calendar.yaml").exists() else {}
    voc_path = data_dir / "vocabulary.yaml"
    if not voc_path.exists():
        voc_path = RAIZ / "data" / "vocabulary.yaml"
    vocabulary = (_read(voc_path) or {}) if voc_path.exists() else {}
    if not vocabulary:
        errores.append("data/vocabulary.yaml: no existe o está vacío; sin él no se pueden validar las relaciones")
    datos = {"sources": fuentes, "books": books, "calendar": calendar, "vocabulary": vocabulary,
             "_errores": errores, "_origen_fuentes": origen}
    for tipo in TYPES:
        datos[tipo] = []
        for ruta in sorted((data_dir / tipo).glob("*.yaml")):
            obj = _read(ruta)
            if not isinstance(obj, dict):
                errores.append(f"data/{tipo}/{ruta.name}: el fichero no es un mapa YAML")
                continue
            obj["_fichero"] = f"data/{tipo}/{ruta.name}"
            obj["_nombre_fichero"] = ruta.stem
            datos[tipo].append(obj)
    datos["coverage"] = bible_coverage.cargar(data_dir, errores)

    # Capítulos de la Biblia como fuentes implícitas: <slug>-<cap> que nadie ha escrito se crea desde books.yaml.
    citadas = [fid for t in TYPES for o in datos[t] for _, fid in sources_of(clean(o))]
    citadas += [fid for l in books for _, fid in sources_of(l)]
    citadas += [fid for m in calendar.get("months") or [] for _, fid in sources_of(m)]
    citadas += [fid for e in calendar.get("explanation") or [] for _, fid in sources_of(e)]
    for fid in citadas:
        if fid in fuentes:
            continue
        cap = chapter_of(fid, books)
        if cap and 1 <= cap[1] <= int(cap[0].get("chapters") or 0):
            libro, n = cap
            fuentes[fid] = {"title": f"{libro['name']} {n}", "work": OBRA_TNM,
                            "url": bible_coverage.url_capitulo(libro, n), "level": 1, "published": None,
                            "checked_on": None, "_implicit": True}
            origen[fid] = "data/books.yaml (capítulo implícito)"
    return datos


def clean(o):
    return {k: v for k, v in o.items() if not k.startswith("_")}


# ---------------------------------------------------------------- el esquema antiguo

def old_schema(data_dir):
    """Una clave del esquema antiguo en cualquier fichero de data/, o una carpeta o un fichero con su nombre antiguo:
    es lo que delata una migración a medias. Los nombres salen de scripts/migration/map.yaml. No mira dentro de los
    mapas de ids (las fuentes, los capítulos, los papeles de un suceso...), cuyas claves son contenido."""
    data_dir = Path(data_dir)
    if not MAP.exists():
        return [f"{MAP.relative_to(RAIZ)}: no existe; sin él no se puede comprobar que no quede el esquema antiguo"]
    m = yaml.safe_load(MAP.read_text(encoding="utf-8"))
    nuevas = (set(m["keys"].values()) | {n for ns in m["relation_keys"].values() for n in ns}
              | {k for ks in m["new_keys"].values() for k in ks})
    antiguas = ({k: v for k, v in m["keys"].items() if k != v}
                | {k: " o ".join(v) for k, v in m["relation_keys"].items()})
    antiguas = {k: v for k, v in antiguas.items() if k not in nuevas}
    raices = {o[5:]: n[5:] for o, n in m["directories"].items() if o.startswith("data/")}
    raices.update({Path(o).stem: Path(n).stem for o, n in m["files"].items()
                   if o.startswith("data/") and o.endswith(".yaml") and o.count("/") == 1})
    errores = []
    for viejo, nuevo in sorted({**{o: n for o, n in m["directories"].items() if o.startswith("data/")},
                                **{o: n for o, n in m["files"].items() if o.startswith("data/")}}.items()):
        rel = viejo[5:]
        if viejo != nuevo and (data_dir / rel).exists():
            errores.append(f"data/{rel}: nombre del esquema antiguo; ahora es {nuevo}")

    def new_path(ruta):
        partes = []
        for i, p in enumerate(ruta.split(".")):
            lista = p.endswith("[]")
            p = p[:-2] if lista else p
            p = raices.get(p, p) if i == 0 else m["keys"].get(p, p)
            partes.append(p + ("[]" if lista else ""))
        return ".".join(partes)

    mapas_de_ids = {new_path(r) for r in m["id_maps"]} | {"events.roles"}

    def mirar(x, ruta, fichero):
        if isinstance(x, dict):
            de_ids = ruta in mapas_de_ids
            for k, v in x.items():
                if not de_ids and k in antiguas:
                    errores.append(f"{fichero}: clave '{k}' del esquema antiguo en {ruta or 'la raíz'}; "
                                   f"ahora es '{antiguas[k]}'")
                mirar(v, f"{ruta}.<id>" if de_ids else (f"{ruta}.{k}" if ruta else str(k)), fichero)
        elif isinstance(x, list):
            for v in x:
                mirar(v, f"{ruta}[]", fichero)

    for ruta in sorted(data_dir.rglob("*.yaml")):
        rel = ruta.relative_to(data_dir)
        if rel.parts[0].startswith("_") or rel.as_posix() == "vocabulary.yaml":
            continue                         # propuestas en su formato 1 y el vocabulario, que no es una ficha
        try:
            obj = yaml.safe_load(ruta.read_text(encoding="utf-8"))
        except yaml.YAMLError:
            continue                         # lo dice la carga
        raiz = rel.parts[0] if len(rel.parts) > 1 else rel.stem
        mirar(obj, raiz, f"data/{rel.as_posix()}")
    return errores


# ---------------------------------------------------------------- piezas comunes

def _entero(v):
    return isinstance(v, int) and not isinstance(v, bool)


def _numero(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _astronomico(n, era):
    return 1 - n if era.lower().replace(" ", "").startswith("a.") else n


RE_DIA = re.compile(r"\b\d{1,2}\s+de\s+(?!\d)[a-záéíóúñü]+", re.I)


def _un_solo_anio(texto):
    """True si el texto nombra un único año con era y ningún otro número salvo días («14 de nisán»)."""
    ms = list(RE_ANIO.finditer(texto))
    if len(ms) != 1 or ms[0].group(2):
        return False
    return len(re.findall(r"\d+", RE_DIA.sub("", texto))) == 1


def validar_fecha(f, donde, err, meses=(), estado=None):
    if not isinstance(f, dict):
        err(f"{donde}: date debe ser un objeto")
        return
    for k in ("from", "to", "precision", "approx", "type", "chronology", "text"):
        if k not in f:
            err(f"{donde}: date sin '{k}'")
    d, h = f.get("from"), f.get("to")
    for k, v in (("from", d), ("to", h)):
        if v is not None and not _entero(v):
            err(f"{donde}: date.{k} debe ser un entero (año astronómico) o null, no {v!r}")
    if _entero(d) and _entero(h) and d > h:
        err(f"{donde}: date.from ({d}) es posterior a date.to ({h})")
    for k, v in (("from", d), ("to", h)):
        if _entero(v) and not -4100 <= v <= 2100:
            err(f"{donde}: date.{k} = {v} fuera de rango")
    if f.get("precision") not in PRECISIONES:
        err(f"{donde}: date.precision '{f.get('precision')}' no es una de {sorted(PRECISIONES)}")
    if not isinstance(f.get("approx"), bool):
        err(f"{donde}: date.approx debe ser true o false")
    if f.get("type") not in TIPOS_FECHA:
        err(f"{donde}: date.type debe ser anchored, narrative o derived")
    if f.get("type") == "derived":
        if not str(f.get("note") or "").strip():
            err(f"{donde}: fecha derivada sin 'note' con la cuenta que la sostiene")
        if estado != "pending":
            err(f"{donde}: una fecha derivada es un cálculo nuestro; el hecho tiene que ir con status: pending")
    if f.get("chronology") not in ("tnm", "secular"):
        err(f"{donde}: date.chronology debe ser tnm o secular")
    texto = str(f.get("text") or "").strip()
    if not texto:
        err(f"{donde}: date.text vacío")
    # Comprobación año/texto: el primer año con era del texto tiene que ser from o to (537 a.e.c. = −536).
    m = RE_ANIO.search(texto)
    if m and (_entero(d) or _entero(h)):
        for n in (m.group(1), m.group(2)):
            if n is None:
                continue
            a = _astronomico(int(n), m.group(3))
            if a not in (d, h):
                err(f"{donde}: date.text dice «{m.group(0)}», que en años astronómicos es {a}, "
                    f"pero from/to son {d}/{h} (1 a.e.c. = 0, 537 a.e.c. = -536)")
    # Un texto de un solo año («c. 56 e.c.», «14 de nisán de 33 e.c.») exige from == to, o approx: true.
    if _entero(d) and _entero(h) and d != h and f.get("approx") is not True and _un_solo_anio(texto):
        err(f"{donde}: date.text «{texto}» da un solo año, pero from/to son {d}/{h}; "
            f"pon from == to, approx: true o el tramo en el texto")
    det = f.get("detail")
    if det is not None and _entero(d) and _entero(h) and d != h:
        err(f"{donde}: date.detail solo vale en una fecha de un año (from == to); en un tramo {d}/{h} el sitio "
            f"leería el mes en el primer año. Pon el mes en la reason")
    if det is not None:
        if not isinstance(det, dict) or not det:
            err(f"{donde}: date.detail debe ser un objeto como {{month: nisan, day: 14}} o {{season: autumn}}")
        else:
            for k in det:
                if k not in ("month", "day", "season"):
                    err(f"{donde}: date.detail.{k} no se conoce (month, day, season)")
            if "month" in det and det["month"] not in meses:
                err(f"{donde}: date.detail.month '{det['month']}' no está en data/calendar.yaml")
            if "day" in det and (not _entero(det["day"]) or not 1 <= det["day"] <= 30 or "month" not in det):
                err(f"{donde}: date.detail.day debe ser un entero de 1 a 30 y llevar month")
            if "season" in det and det["season"] not in ESTACIONES:
                err(f"{donde}: date.detail.season '{det['season']}' no es una de {sorted(ESTACIONES)}")


def validar_comun(o, donde, err, fuentes):
    fs = o.get("sources")
    if not isinstance(fs, list) or not fs:
        err(f"{donde}: 'sources' vacío")
    if not str(o.get("reason") or "").strip():
        err(f"{donde}: 'reason' vacía")
    if "status" in o and o["status"] not in ESTADOS:
        err(f"{donde}: status '{o['status']}' no es verified ni pending")
    if "checked_on" in o and not DIA.match(str(o["checked_on"])):
        err(f"{donde}: checked_on '{o['checked_on']}' no es AAAA-MM-DD")
    for i, e in enumerate(o.get("links") or []):
        if e.get("type") not in TIPOS_ENLACE:
            err(f"{donde}: links[{i}].type '{e.get('type')}' no válido")
        if not str(e.get("url", "")).startswith("https://") or not e.get("title"):
            err(f"{donde}: links[{i}] necesita title y url https")
    for i, h in enumerate(o.get("history") or []):
        for k in ("date", "change", "source"):
            if not h.get(k):
                err(f"{donde}: history[{i}] sin '{k}'")
        if h.get("date") and not DIA.match(str(h["date"])):
            err(f"{donde}: history[{i}].date no es AAAA-MM-DD")


def validar_hecho(o, donde, err, estados=ESTADOS, estado_obligatorio=True):
    """Un hecho anidado dentro de una ficha (relación, parada, candidato, nombre o fiesta de un mes): sources,
    reason y checked_on siempre; status donde el esquema lo pide (modelo.md, sección 4)."""
    if not isinstance(o.get("sources"), list) or not o.get("sources"):
        err(f"{donde}: 'sources' vacío")
    if not str(o.get("reason") or "").strip():
        err(f"{donde}: 'reason' vacía")
    if "checked_on" not in o:
        err(f"{donde}: falta 'checked_on', el día en que se leyó la fuente de este hecho")
    elif not DIA.match(str(o["checked_on"])):
        err(f"{donde}: checked_on '{o['checked_on']}' no es AAAA-MM-DD")
    if estado_obligatorio or "status" in o:
        if o.get("status") not in estados:
            err(f"{donde}: status '{o.get('status')}' no es uno de {sorted(estados)}")


def textos_largos(x, camino, err):
    """Heurística «no copiar de jw.org»: ningún resumen, razón o nota pasa de MAX_PALABRAS palabras."""
    if isinstance(x, dict):
        for k, v in x.items():
            if k in CAMPOS_TEXTO and isinstance(v, str) and len(v.split()) > MAX_PALABRAS:
                err(f"{camino}.{k}: {len(v.split())} palabras (máximo {MAX_PALABRAS}); ¿texto copiado? Resúmelo con palabras propias")
            elif k == "not_claimed" and isinstance(v, list):
                for i, s in enumerate(v):
                    if not isinstance(s, str) or not s.strip():
                        err(f"{camino}.not_claimed[{i}]: debe ser una frase")
                    elif len(s.split()) > MAX_PALABRAS:
                        err(f"{camino}.not_claimed[{i}]: {len(s.split())} palabras (máximo {MAX_PALABRAS})")
            else:
                textos_largos(v, f"{camino}.{k}", err)
    elif isinstance(x, list):
        for i, v in enumerate(x):
            textos_largos(v, f"{camino}[{i}]", err)


def pablo_en_su_sitio(datos):
    """Una carta o un suceso de Pablo fechado dentro de sus viajes tiene que coincidir con una parada en uno de sus
    lugares. Si no, el mapa dibujaría la carta en un sitio mientras pone a Pablo en otro. Es el caso aparte de Pablo
    que el sitio aún tiene; se quita con él (modelo.md, sección 9)."""
    paradas = []
    for v in datos["journeys"]:
        if v.get("person") != "pablo":
            continue
        for p in v.get("stops") or []:
            f = p.get("date") or {}
            if isinstance(f.get("from"), int) and isinstance(f.get("to"), int):
                paradas.append((p.get("place"), f["from"], f["to"]))
    if not paradas:
        return []
    ini, fin = min(p[1] for p in paradas), max(p[2] for p in paradas)
    casos = [(c["_fichero"], c.get("written_in") or [], c.get("date") or {})
             for c in datos["letters"] if c.get("writer", "pablo") == "pablo"]
    casos += [(e["_fichero"], e.get("places") or [], e.get("date") or {})
              for e in datos["events"] if "pablo" in (e.get("people") or [])]
    errores = []
    for donde, lugares, f in casos:
        d, h = f.get("from"), f.get("to")
        if not isinstance(d, int) or not isinstance(h, int) or d < ini or h > fin:
            continue                      # fuera de los viajes no sabemos dónde estaba: nada que comparar
        if not any(lugar in lugares and pd <= h and d <= ph for lugar, pd, ph in paradas):
            errores.append(f"{donde}: {f.get('text')} cae dentro de los viajes, pero ninguna parada de Pablo en "
                           f"{', '.join(lugares)} coincide con esas fechas")
    return errores


def _modelo_meses():
    """Las constantes del cálculo de meses hebreos, leídas de site/js/trayectorias.js para no tenerlas dos veces."""
    js = (RAIZ / "site" / "js" / "trayectorias.js").read_text(encoding="utf-8")
    dia = 1 / 365.2425
    c = {}
    for nombre in ("MES_LUNAR", "LUNA_0", "EQUINOCCIO"):
        m = re.search(rf"^const {nombre} = ([\d\s.+*/()DIA-]+);", js, re.M)
        if not m:
            return None
        c[nombre] = eval(m.group(1), {"__builtins__": {}}, {"DIA": dia})  # solo cifras, operadores y DIA
    c["DIA"] = dia
    return c


def inicio_mes(c, y, orden, siguiente=False):
    """(meses del año hebreo, comienzo del mes `orden`) para una fecha del año y de nuestro calendario, como inicioMes.
    Sin ese mes en el año (veadar en un año de doce), (None, comienzo del nisán siguiente). Con siguiente=True, el
    comienzo es el del mes que sigue a `orden` en el mismo año hebreo: el límite donde acaba `orden`."""
    dia, ml, l0, eq = c["DIA"], c["MES_LUNAR"], c["LUNA_0"], c["EQUINOCCIO"]

    def redondo(x):
        return math.floor(x + 0.5)  # Math.round de JavaScript

    def luna(anio):
        return l0 + redondo((anio + eq - l0) / ml) * ml

    def puesta(t):
        yy = math.floor(t)
        return yy + (math.ceil((t - yy) / dia - 0.75) + 0.75) * dia

    a = y - 1 if orden >= 11 else y
    n = redondo((luna(a + 1) - luna(a)) / ml)
    if orden > n:
        return None, puesta(luna(a + 1))
    return n, puesta(luna(a) + (orden if siguiente else orden - 1) * ml)


def meses_en_su_anio(datos):
    """Una fecha con detail.month tiene que empezar dentro de su año: «3 de sebat de 520 a.e.c.» no puede caer en
    diciembre de 521 a.e.c. Y un «veadar» solo vale en un año que, según el cálculo, lleva Veadar. Es el cálculo de
    inicioMes y anioHebreo de site/js/trayectorias.js, con sus constantes: si cambia allí, cambia aquí."""
    c = _modelo_meses()
    if c is None:
        return ["site/js/trayectorias.js: no encuentro MES_LUNAR, LUNA_0 o EQUINOCCIO para comprobar los meses"]
    dia = c["DIA"]
    ordenes = {m.get("id"): m.get("order") for m in datos["calendar"].get("months") or []}

    def inicio(y, orden, siguiente=False):
        return inicio_mes(c, y, orden, siguiente)

    def redondo(x):
        return math.floor(x + 0.5)

    errores = []

    def mirar(x, donde):
        if isinstance(x, list):
            for v in x:
                mirar(v, donde)
            return
        if not isinstance(x, dict):
            return
        det = x.get("detail")
        if isinstance(det, dict) and det.get("month") in ordenes and _entero(ordenes[det["month"]]):
            d, h = x.get("from"), x.get("to")
            y0 = d if _entero(d) else h
            y1 = (h if _entero(h) else d)
            if _entero(y0) and _entero(y1):
                n, a = inicio(y0, ordenes[det["month"]])
                if n is None:
                    errores.append(f"{donde}: «{x.get('text')}» pone {det['month']}, pero según el cálculo de la "
                                   f"línea ese año hebreo no lleva ese mes; la fecha caería en nisán")
                t = a + (det["day"] - 1) * dia if _entero(det.get("day")) else a
                if n is not None and _entero(det.get("day")):
                    _, fin = inicio(y0, ordenes[det["month"]], True)
                    if t >= fin:
                        errores.append(f"{donde}: «{x.get('text')}» pone el día {det['day']} de {det['month']}, pero "
                                       f"ese año el mes tiene {redondo((fin - a) / dia)} días: la fecha caería en el "
                                       f"mes siguiente")
                if not y0 <= t < y1 + 1:
                    errores.append(f"{donde}: «{x.get('text')}» ({det['month']} {det.get('day', '')}) empieza en "
                                   f"{t:.3f}, fuera de su tramo [{y0}, {y1 + 1}): el día cae en otro año")
        for k, v in x.items():
            if k != "detail":
                mirar(v, donde)

    for tipo in TYPES:
        for o in datos[tipo]:
            mirar(clean(o), o["_fichero"])
    return errores


def validar_fuentes(datos, err):
    origen = datos.get("_origen_fuentes") or {}
    for fid, f in datos["sources"].items():
        donde = origen.get(fid, "data/sources/")
        if not ID.match(str(fid)):
            err(f"{donde}: id '{fid}' no es un slug ASCII en minúsculas")
        for k in REQ_FUENTE:
            if k not in (f or {}):
                err(f"{donde}: {fid} sin '{k}'")
        if (f or {}).get("level") not in (1, 2):
            err(f"{donde}: {fid}.level debe ser 1 o 2")
        if not str((f or {}).get("url", "")).startswith("https://"):
            err(f"{donde}: {fid}.url debe ser https")
        if (f or {}).get("checked_on") and not DIA.match(str(f["checked_on"])):
            err(f"{donde}: {fid}.checked_on no es AAAA-MM-DD")
        textos_largos(f or {}, f"{donde} ({fid})", err)


def validar_libros(datos, err, meses):
    libros = datos["books"]
    if len(libros) != 66:
        err(f"data/books.yaml: tiene {len(libros)} libros; deben ser 66")
    slugs, nums, formas = set(), set(), {}
    comunes = {"sources", "reason", "checked_on", "status", "history", "note"}
    for i, l in enumerate(libros):
        donde = f"data/books.yaml ({l.get('slug', i)})"
        for k in ESTRUCTURA_LIBRO:
            if k not in l:
                err(f"{donde}: falta '{k}'")
        if not ID.match(str(l.get("slug"))):
            err(f"{donde}: slug '{l.get('slug')}' no es un slug ASCII en minúsculas")
        if l.get("slug") in slugs:
            err(f"{donde}: slug repetido")
        slugs.add(l.get("slug"))
        if not _entero(l.get("num")) or not 1 <= l["num"] <= 66 or l["num"] in nums:
            err(f"{donde}: num debe ser un entero de 1 a 66 sin repetir")
        nums.add(l.get("num"))
        if not _entero(l.get("chapters")) or l["chapters"] < 1:
            err(f"{donde}: chapters debe ser un entero positivo")
        for fm in l.get("forms") or []:
            if fm in formas:
                err(f"{donde}: la forma de búsqueda '{fm}' ya es de {formas[fm]}")
            formas[fm] = l.get("slug")
        bible_coverage.validar_libro(l, donde, err)
        extra = set(l) - ESTRUCTURA_LIBRO - ESTRUCTURA_LIBRO_OPCIONAL
        if extra - HECHOS_LIBRO - comunes:
            err(f"{donde}: campos desconocidos {sorted(extra - HECHOS_LIBRO - comunes)}")
        if extra:
            validar_comun(l, donde, err, datos["sources"])
            for k in ("checked_on", "status"):
                if k not in l:
                    err(f"{donde}: un hecho del libro necesita '{k}'")
            for k in ("date", "covers"):
                if k in l:
                    validar_fecha(l[k], f"{donde} {k}", err, meses, l.get("status"))
            textos_largos(l, donde, err)


def validar_calendario(datos, err):
    meses = datos["calendar"].get("months") or []
    ids = set()
    for i, m in enumerate(meses):
        donde = f"data/calendar.yaml ({m.get('id', i)})"
        if not ID.match(str(m.get("id"))):
            err(f"{donde}: id '{m.get('id')}' no es un slug ASCII en minúsculas")
        if m.get("id") in ids:
            err(f"{donde}: id repetido")
        ids.add(m.get("id"))
        if not m.get("name") or not _entero(m.get("order")):
            err(f"{donde}: necesita name y order")
        if set(m) - ESTRUCTURA_MES:
            validar_comun(m, donde, err, datos["sources"])
            for k in ("checked_on", "status"):
                if k not in m:
                    err(f"{donde}: un hecho del mes necesita '{k}'")
        textos_largos(m, donde, err)
        validar_nombres_mes(m, donde, err)
        validar_fiestas(m, donde, err)
    validar_explicacion(datos["calendar"], err)
    otras = set(datos["calendar"]) - SECCIONES_CALENDARIO
    if otras:
        err(f"data/calendar.yaml: secciones desconocidas {sorted(otras)} (se esperan {sorted(SECCIONES_CALENDARIO)})")
    return ids


def validar_nombres_mes(m, donde, err):
    """Los nombres de un mes por época: como los de un lugar, cada uno con su nota, sus fuentes, su razón y su
    checked_on. Es un hecho anidado; status es opcional y, si falta, vale el del mes."""
    if "names" not in m:
        return
    ns = m["names"]
    if not isinstance(ns, list) or not ns:
        err(f"{donde}: 'names' debe ser una lista no vacía")
        return
    vistos = set()
    for i, n in enumerate(ns):
        nd = f"{donde} names[{i}]"
        if not isinstance(n, dict):
            err(f"{nd}: debe ser un objeto {{name, from, to, note, sources, reason, checked_on}}")
            continue
        if set(n) - CAMPOS_NOMBRE_MES:
            err(f"{nd}: campos desconocidos {sorted(set(n) - CAMPOS_NOMBRE_MES)}")
        if not isinstance(n.get("name"), str) or not n["name"].strip():
            err(f"{nd}: sin 'name'")
        elif n["name"] in vistos:
            err(f"{nd}: el nombre '{n['name']}' está repetido")
        vistos.add(n.get("name"))
        if not isinstance(n.get("note"), str) or not n["note"].strip():
            err(f"{nd}: 'note' vacía")
        validar_hecho(n, nd, err, estado_obligatorio=False)
        for k in ("from", "to"):
            if k in n and not _entero(n[k]):
                err(f"{nd}.{k} debe ser un año astronómico entero")
        if _entero(n.get("from")) and _entero(n.get("to")) and n["from"] > n["to"]:
            err(f"{nd}: from ({n['from']}) es posterior a to ({n['to']})")
    # Dos épocas distintas solo comparten el año frontera (Abib hasta -536, Nisán desde -536). En ese año gana el nombre
    # que empieza (el de from), sea cual sea el orden de la lista: así lo hace nombreMes en site/js/trayectorias.js.
    # Dos nombres con la misma época exacta son formas del mismo nombre (Hesván y Marhesván): la línea usa el primero.
    epocas = [(n["name"], n.get("from"), n.get("to")) for n in ns
              if isinstance(n, dict) and isinstance(n.get("name"), str)
              and all(k not in n or _entero(n[k]) for k in ("from", "to"))]
    for i, (a, ad, ah) in enumerate(epocas):
        for b, bd, bh in epocas[i + 1:]:
            if (ad, ah) == (bd, bh):
                continue
            ini = max(x for x in (ad, bd, float("-inf")) if x is not None)
            fin = min(x for x in (ah, bh, float("inf")) if x is not None)
            if fin - ini > 0:
                err(f"{donde}: las épocas de '{a}' y '{b}' se solapan más de un año (de {ini} a {fin}); "
                    f"solo pueden compartir el año frontera")
    # El mismo nombre vive en dos sitios: other_names (lo usa la fecha escrita) y names. Tienen que coincidir.
    if m.get("name") not in vistos:
        err(f"{donde}: el nombre principal '{m.get('name')}' no está en 'names'")
    otros = set(m.get("other_names") or [])
    for o in sorted(otros - vistos):
        err(f"{donde}: '{o}' está en other_names pero no en names")
    for o in sorted(vistos - otros - {m.get("name")}):
        err(f"{donde}: '{o}' está en names pero no en other_names, y la fecha escrita («14 abib 1513 a.e.c.») "
            f"no lo entendería")


def validar_fiestas(m, donde, err):
    """Las fiestas de un mes: sus días y el año desde el que se celebran, con fuentes, razón y checked_on. Sin
    'instituted_in', la línea de tiempo pondría la Pascua antes del éxodo o la Dedicación en tiempos de Nehemías."""
    fs = m.get("festivals")
    if fs is None:
        return
    if not isinstance(fs, list) or not fs:
        err(f"{donde}: 'festivals' debe ser una lista no vacía")
        return
    for i, f in enumerate(fs):
        fd = f"{donde} festivals[{i}]"
        if not isinstance(f, dict):
            err(f"{fd}: debe ser un objeto {{name, from, to, instituted_in, sources, reason, checked_on}}")
            continue
        if set(f) - CAMPOS_FIESTA:
            err(f"{fd}: campos desconocidos {sorted(set(f) - CAMPOS_FIESTA)}")
        if not isinstance(f.get("name"), str) or not f["name"].strip():
            err(f"{fd}: sin 'name'")
        for k in ("from", "to"):
            if not _entero(f.get(k)) or not 1 <= f[k] <= 30:
                err(f"{fd}.{k} debe ser un día del mes, de 1 a 30")
        if _entero(f.get("from")) and _entero(f.get("to")) and f["from"] > f["to"]:
            err(f"{fd}: el día {f['from']} es posterior al {f['to']}")
        if not _entero(f.get("instituted_in")):
            err(f"{fd}.instituted_in debe ser el año astronómico desde el que se celebra")
        validar_hecho(f, fd, err, estado_obligatorio=False)


def validar_explicacion(cal, err):
    """Los hechos de la página «El calendario»: cada uno con id, título, texto y los cuatro campos de siempre."""
    if "explanation" not in cal:
        return
    lista = cal["explanation"]
    if not isinstance(lista, list) or not lista:
        err("data/calendar.yaml: 'explanation' debe ser una lista no vacía")
        return
    ids = set()
    for i, e in enumerate(lista):
        donde = f"data/calendar.yaml (explanation {e.get('id', i) if isinstance(e, dict) else i})"
        if not isinstance(e, dict):
            err(f"{donde}: debe ser un objeto")
            continue
        if set(e) - CAMPOS_EXPLICACION:
            err(f"{donde}: campos desconocidos {sorted(set(e) - CAMPOS_EXPLICACION)}")
        if not ID.match(str(e.get("id"))):
            err(f"{donde}: id '{e.get('id')}' no es un slug ASCII en minúsculas")
        elif e["id"] in ids:
            err(f"{donde}: id repetido")
        ids.add(e.get("id"))
        for k in ("title", "text"):
            if not isinstance(e.get(k), str) or not e[k].strip():
                err(f"{donde}: '{k}' vacío")
        for k in ("checked_on", "status"):
            if k not in e:
                err(f"{donde}: falta '{k}'")
        validar_comun(e, donde, err, None)
        textos_largos(e, donde, err)


CAMPOS_FORMA = {"type", "center", "note", "sources", "reason", "checked_on", "status"}
PARAMETROS_FORMA = {"circle": {"radius_km"}, "ellipse": {"radii_km", "bearing"}, "box": {"bounds"},
                    "polygon": {"vertices"}}


def _par(p):
    return isinstance(p, list) and len(p) == 2 and all(_numero(x) and math.isfinite(x) for x in p) \
        and -90 <= p[0] <= 90 and -180 <= p[1] <= 180


def _radio(x):
    """Un radio de forma: un número finito, mayor que 0 y no mayor que formas.MAX_RADIO_KM."""
    return _numero(x) and math.isfinite(x) and 0 < x <= formas.MAX_RADIO_KM


def validar_forma(f, donde, err, lat, lon, puntos, en_candidato=False):
    """La forma de una zona (`shape`): un hecho con su fuente y su razón, de un vocabulario cerrado, que contiene el punto
    del lugar o del candidato. Devuelve el contorno, o None si la forma no se puede dibujar."""
    donde = f"{donde} shape"
    if not isinstance(f, dict):
        err(f"{donde}: debe ser un objeto")
        return None
    t = f.get("type")
    if t not in formas.TIPOS:
        err(f"{donde}: type '{t}' no es uno de {list(formas.TIPOS)}")
        return None
    if en_candidato and t == "circle":
        err(f"{donde}: un candidato ya es un círculo (geometry.radius_km); su forma es ellipse, box o polygon")
    validar_hecho(f, donde, err)
    if not str(f.get("note") or "").strip():
        err(f"{donde}: falta note, cómo se calculó el contorno con lo que dice la fuente")
    sobran = set(f) - CAMPOS_FORMA - PARAMETROS_FORMA[t]
    if sobran:
        err(f"{donde}: campos que no son de un {t}: {sorted(sobran)}")
    if "center" in f and (t not in ("circle", "ellipse") or not isinstance(f["center"], dict)
                          or not _par([f["center"].get("lat"), f["center"].get("lon")])):
        err(f"{donde}: center solo va en circle o ellipse, como {{lat, lon}} dentro de rango")
        return None
    bien = True
    if t == "circle" and not _radio(f.get("radius_km")):
        err(f"{donde}: un circle necesita radius_km mayor que 0 y no mayor que {formas.MAX_RADIO_KM}")
        bien = False
    if t == "ellipse":
        r = f.get("radii_km")
        if not (isinstance(r, list) and len(r) == 2 and all(_radio(x) for x in r) and r[0] >= r[1]):
            err(f"{donde}: una ellipse necesita radii_km: [a lo largo, de través], mayores que 0, no mayores que "
                f"{formas.MAX_RADIO_KM} y el primero el mayor")
            bien = False
        if not _numero(f.get("bearing")) or not 0 <= f["bearing"] < 180:
            err(f"{donde}: una ellipse necesita bearing, el rumbo del eje largo en grados, de 0 a menos de 180")
            bien = False
    if t == "box":
        c = f.get("bounds")
        if not (isinstance(c, dict) and set(c) == {"south", "west", "north", "east"}
                and _par([c["south"], c["west"]]) and _par([c["north"], c["east"]])
                and c["south"] < c["north"] and c["west"] < c["east"]):
            err(f"{donde}: un box necesita bounds: {{south, west, north, east}}, con south < north y west < east")
            bien = False
    if t == "polygon":
        vs = f.get("vertices")
        if not isinstance(vs, list) or not 3 <= len(vs) <= formas.MAX_VERTICES:
            err(f"{donde}: un polygon necesita de 3 a {formas.MAX_VERTICES} vertices")
            return None
        for i, v in enumerate(vs):
            if isinstance(v, str):
                if v not in puntos:
                    err(f"{donde}: vertices[{i}] '{v}' no es un lugar con punto exacto (precision: point); escribe [lat, lon]")
                    bien = False
            elif not _par(v):
                err(f"{donde}: vertices[{i}] debe ser [lat, lon] dentro de rango o el id de un lugar con precision: point")
                bien = False
        if bien and len({tuple(p) for p in formas.vertices(f, puntos)}) != len(vs):
            err(f"{donde}: dos vértices caen en el mismo punto")
            bien = False
    if not bien:
        return None
    ring = formas.anillo(f, lat, lon, puntos)
    if t == "polygon" and formas.se_cruza(ring):
        err(f"{donde}: el contorno se cruza o se toca consigo mismo; ordena los vértices alrededor de la zona")
    if not formas.dentro(ring, lat, lon):
        err(f"{donde}: el punto ({lat}, {lon}) queda fuera de la forma; la forma rodea el punto que la representa")
    return ring


def validar_lugar(o, donde, err, fuentes, puntos=None):
    puntos = puntos or {}
    if o.get("type") not in TIPOS_LUGAR:
        err(f"{donde}: type '{o.get('type')}' no es uno de {sorted(TIPOS_LUGAR)}")
    if o.get("precision") not in PRECISION_LUGAR:
        err(f"{donde}: precision '{o.get('precision')}' no válida")
    cands = o.get("candidates")
    lat, lon = o.get("lat"), o.get("lon")
    sin_punto = cands is not None and lat is None and lon is None
    if not sin_punto:
        if not _numero(lat) or not -90 <= lat <= 90:
            err(f"{donde}: lat fuera de rango" + ("" if cands is not None else " (solo con candidates puede ser null)"))
        if not _numero(lon) or not -180 <= lon <= 180:
            err(f"{donde}: lon fuera de rango" + ("" if cands is not None else " (solo con candidates puede ser null)"))
    if cands is not None:
        if not isinstance(cands, list):
            err(f"{donde}: candidates debe ser una lista")
            cands = []
        if o.get("precision") not in ("zone", "uncertain"):
            err(f"{donde}: con candidates, precision debe ser zone o uncertain")
        if not cands and o.get("status") != "pending":
            err(f"{donde}: candidates vacío solo vale con status: pending")
        for i, c in enumerate(cands):
            cd = f"{donde} candidates[{i}]"
            if not isinstance(c, dict):
                err(f"{cd}: debe ser un objeto")
                continue
            if not str(c.get("name") or "").strip():
                err(f"{cd}: sin name")
            validar_hecho(c, cd, err, estados=ESTADOS_CANDIDATO)
            g = c.get("geometry")
            if not isinstance(g, dict) or g.get("type") not in GEOMETRIAS:
                err(f"{cd}: geometry.type debe ser uno de {sorted(GEOMETRIAS)}")
                continue
            for p, nombre in ((g, "geometry"), (g.get("to"), "geometry.to")):
                if p is None and nombre == "geometry.to":
                    continue
                if not isinstance(p, dict) or not _numero(p.get("lat")) or not _numero(p.get("lon")) \
                        or not -90 <= p["lat"] <= 90 or not -180 <= p["lon"] <= 180:
                    err(f"{cd}: {nombre} necesita lat y lon dentro de rango")
            if g["type"] == "zone" and (not _numero(g.get("radius_km")) or g["radius_km"] <= 0):
                err(f"{cd}: una zona necesita radius_km mayor que 0")
            if g["type"] == "strip" and g.get("to") is None:
                err(f"{cd}: una franja necesita to: {{lat, lon}}")
            if "shape" in c:
                if g["type"] != "zone":
                    err(f"{cd}: shape solo va en un candidato de geometry.type zone")
                elif _numero(g.get("lat")) and _numero(g.get("lon")):
                    validar_forma(c["shape"], cd, err, g["lat"], g["lon"], puntos, en_candidato=True)
            cf = str(c.get("coord_source") or "")
            if cf == "calculation":
                if not str(c.get("note") or "").strip():
                    err(f"{cd}: coord_source calculation necesita note con la cuenta del punto")
            elif cf.startswith("openbible:") and cf[10:]:
                if not str(c.get("coord_url") or "").startswith(f"https://www.openbible.info/geo/ancient/{cf[10:]}/"):
                    err(f"{cd}: coord_url debe ser la ficha de OpenBible de {cf}")
            else:
                err(f"{cd}: coord_source debe ser openbible:<id> o calculation (de dónde sale el punto)")
    if "shape" in o:
        if cands is not None or o.get("precision") != "zone" or sin_punto:
            err(f"{donde}: shape solo va en un lugar con punto y precision: zone; en un lugar incierto va en su candidato")
        elif _numero(lat) and _numero(lon):
            validar_forma(o["shape"], donde, err, lat, lon, puntos)
    if not any(e.get("type") == "perspicacia" for e in o.get("links") or []) and o.get("status") != "pending":
        err(f"{donde}: sin enlace a Perspicacia debe llevar status: pending")


def validar_persona(o, donde, err):
    if "disambiguation" in o and not str(o.get("disambiguation") or "").strip():
        err(f"{donde}: disambiguation vacía")
    ncc = o.get("distinct_from")
    if ncc is not None and (not isinstance(ncc, list) or not all(ID.match(str(x)) for x in ncc)):
        err(f"{donde}: distinct_from debe ser una lista de ids de personas")
    na = o.get("not_claimed")
    if na is not None and not isinstance(na, list):
        err(f"{donde}: not_claimed debe ser una lista de frases")
    if "relations" in o and not isinstance(o["relations"], list):
        err(f"{donde}: relations debe ser una lista")


def validar_alternativas(o, donde, err, meses):
    alts = o.get("alternatives")
    if alts is None:
        return
    if not isinstance(alts, list):
        err(f"{donde}: alternatives debe ser una lista")
        return
    for i, a in enumerate(alts):
        ad = f"{donde} alternatives[{i}]"
        if not isinstance(a, dict):
            err(f"{ad}: debe ser un objeto {{date, sources, note}}")
            continue
        if not isinstance(a.get("sources"), list) or not a.get("sources"):
            err(f"{ad}: 'sources' vacío (solo con una fuente que jw.org haya usado)")
        if not str(a.get("note") or "").strip():
            err(f"{ad}: 'note' vacía")
        if "date" not in a:
            err(f"{ad}: sin date")
        else:
            validar_fecha(a["date"], ad, err, meses, o.get("status"))
            if (a.get("date") or {}).get("chronology") != "secular":
                err(f"{ad}: una alternativa lleva date.chronology: secular")


def validar_recorrido(o, donde, err):
    paradas = o.get("stops")
    if not isinstance(paradas, list) or not paradas:
        err(f"{donde}: stops vacío")
        return
    for i, p in enumerate(paradas):
        pd = f"{donde} stops[{i}]"
        if not isinstance(p, dict):
            err(f"{pd}: debe ser un objeto")
            continue
        for k in REQ_PARADA_RECORRIDO:
            if k not in p:
                err(f"{pd}: falta '{k}'")
        if "t" in p and (not _numero(p["t"]) or not -4100 <= p["t"] <= 2100):
            err(f"{pd}: t debe ser un año (número, astronómico) entre -4100 y 2100")
        if not str(p.get("text") or "").strip():
            err(f"{pd}: text vacío")
        if not isinstance(p.get("passages"), list):
            err(f"{pd}: passages debe ser una lista")
        if "unknown" in p and not str(p.get("unknown") or "").strip():
            err(f"{pd}: unknown vacío")
        q = p.get("question")
        if q is not None:
            if not isinstance(q, dict):
                err(f"{pd}: question debe ser un objeto {{text, options, answer, explanation}}")
                continue
            for k in ("text", "options", "answer", "explanation"):
                if not q.get(k):
                    err(f"{pd}: question sin '{k}'")
            ops = q.get("options")
            if not isinstance(ops, list) or len(ops) < 2:
                err(f"{pd}: question.options necesita al menos dos opciones")
            elif q.get("answer") not in ops:
                err(f"{pd}: question.answer tiene que ser una de las opciones")


def validar_hallazgo(o, donde, err, fuentes):
    if not isinstance(o.get("relates_to"), list):
        err(f"{donde}: relates_to debe ser una lista de selecciones tipo:id")
    if "identification" in o and o["identification"] not in IDENTIFICACIONES:
        err(f"{donde}: identification '{o['identification']}' no es una de {sorted(IDENTIFICACIONES)}")
    if "kept_at" in o and (not isinstance(o["kept_at"], str) or not o["kept_at"].strip()):
        err(f"{donde}: kept_at debe ser un texto")
    if "not_claimed" in o and not isinstance(o["not_claimed"], list):
        err(f"{donde}: not_claimed debe ser una lista de frases")
    niveles = {(fuentes.get(fid) or {}).get("level") for fid in o.get("sources") or []}
    if 2 in niveles and 1 not in niveles:
        err(f"{donde}: una fuente de nivel 2 solo vale junto a una de nivel 1 que la cite")


# ---------------------------------------------------------------- el vocabulario (modelo.md, sección 5)

PLACEHOLDERS = {"owner", "target", "office"}
OWNS_TYPE = {"self", "first_id", "by_word"}
OWNS_WORD = {"self", "target", "first_named"}
FAMILIES = {"parents", "spouses", "children", "siblings"}


def check_vocabulary(voc, err):
    """El vocabulario es coherente: cada tipo y cada palabra tienen sus dos verbos, cada inversa existe, es del mismo
    tipo y vuelve, dos cargos no comparten texto, y cada papel de un tipo de suceso existe."""
    donde = "data/vocabulary.yaml"
    types, words = voc.get("types") or {}, voc.get("words") or {}
    offices, certainty = voc.get("offices") or {}, voc.get("certainty") or {}
    event_types, event_roles = voc.get("event_types") or {}, voc.get("event_roles") or {}

    def check_verb(texto, que):
        if not isinstance(texto, str) or not texto.strip():
            err(f"{donde}: {que} sin texto")
            return
        try:
            campos = {c for _, c, _, _ in string.Formatter().parse(texto) if c is not None}
        except ValueError:
            err(f"{donde}: {que} «{texto}» tiene llaves mal cerradas")
            return
        if campos - PLACEHOLDERS:
            err(f"{donde}: {que} «{texto}» usa {sorted(campos - PLACEHOLDERS)}; solo valen {sorted(PLACEHOLDERS)}")

    for t, d in types.items():
        if not isinstance(d, dict):
            err(f"{donde}: types.{t} debe ser un mapa")
            continue
        if d.get("target") not in ("person", "place"):
            err(f"{donde}: types.{t}.target debe ser person o place")
        if d.get("word") not in ("none", "optional", "required"):
            err(f"{donde}: types.{t}.word debe ser none, optional o required")
        if d.get("key_field") not in ("word", "office"):
            err(f"{donde}: types.{t}.key_field debe ser word u office")
        if d.get("owns") not in OWNS_TYPE:
            err(f"{donde}: types.{t}.owns debe ser uno de {sorted(OWNS_TYPE)}")
        for r in d.get("requires") or []:
            if r not in ("office", "certainty"):
                err(f"{donde}: types.{t}.requires nombra '{r}', que no es office ni certainty")
        if d.get("key_field") == "office" and "office" not in (d.get("requires") or []):
            err(f"{donde}: types.{t} tiene el cargo en la clave, así que requires lleva office")
        if "office" in (d.get("requires") or []) and d.get("key_field") != "office":
            err(f"{donde}: types.{t} lleva office, así que su key_field es office: si no, dos cargos de una persona "
                f"chocan (Samuel, profeta y juez)")
        check_verb(d.get("verb"), f"types.{t}.verb")
        check_verb(d.get("inverse_verb"), f"types.{t}.inverse_verb")
    for w, d in words.items():
        if not isinstance(d, dict):
            err(f"{donde}: words.{w} debe ser un mapa")
            continue
        t = d.get("type")
        if t not in types:
            err(f"{donde}: words.{w}.type '{t}' no es un tipo")
        elif (types[t] or {}).get("word") == "none":
            err(f"{donde}: words.{w} es de {t}, que no lleva palabra")
        if not str(d.get("es") or "").strip():
            err(f"{donde}: words.{w} sin 'es'")
        if d.get("owns") not in OWNS_WORD:
            err(f"{donde}: words.{w}.owns debe ser uno de {sorted(OWNS_WORD)}")
        if "family" in d and d["family"] not in FAMILIES:
            err(f"{donde}: words.{w}.family debe ser uno de {sorted(FAMILIES)}")
        check_verb(d.get("verb"), f"words.{w}.verb")
        check_verb(d.get("inverse_verb"), f"words.{w}.inverse_verb")
        inversas = d.get("inverse")
        if not isinstance(inversas, list):
            err(f"{donde}: words.{w}.inverse debe ser una lista (vacía si no tiene)")
            continue
        for inv in inversas:
            if inv not in words:
                err(f"{donde}: words.{w}.inverse nombra '{inv}', que no es una palabra")
            elif (words[inv] or {}).get("type") != t:
                err(f"{donde}: words.{w}.inverse nombra '{inv}', que es de otro tipo")
            elif w not in ((words[inv] or {}).get("inverse") or []):
                err(f"{donde}: words.{w}.inverse nombra '{inv}', pero la inversa de '{inv}' no vuelve a '{w}'")
    vistos = set()
    for i, o in enumerate(voc.get("outside") or []):
        if not isinstance(o, dict) or o.get("type") not in types or not str(o.get("caption") or "").strip() \
                or not str(o.get("why") or "").strip():
            err(f"{donde}: outside[{i}] necesita type (un tipo), caption y why")
            continue
        if (o["type"], o["caption"]) in vistos:
            err(f"{donde}: outside[{i}]: «{o['caption']}» ya está en outside para {o['type']}")
        vistos.add((o["type"], o["caption"]))
    textos = collections.Counter(str((d or {}).get("es") or "") for d in offices.values())
    for o, d in offices.items():
        if not str((d or {}).get("es") or "").strip():
            err(f"{donde}: offices.{o} sin 'es'")
        elif textos[d["es"]] > 1:
            err(f"{donde}: offices.{o}: el texto «{d['es']}» es de más de un cargo")
    for c, d in certainty.items():
        check_verb((d or {}).get("verb"), f"certainty.{c}.verb")
    for e, d in event_types.items():
        if (d or {}).get("role") not in event_roles:
            err(f"{donde}: event_types.{e}.role '{(d or {}).get('role')}' no es un papel de event_roles")
    for r, d in event_roles.items():
        check_verb((d or {}).get("verb"), f"event_roles.{r}.verb")


# ---------------------------------------------------------------- relaciones (modelo.md, secciones 5, 6 y 10)

def _same_date(r, s):
    """False si las dos llevan fecha y es distinta: entonces son dos tramos y no un par doble."""
    a, b = r.get("date"), s.get("date")
    if isinstance(a, dict) and isinstance(b, dict):
        return (a.get("from"), a.get("to")) == (b.get("from"), b.get("to"))
    return True


def _is_pair(r, s, words):
    """r en X hacia Y y s en Y hacia X son el mismo par: palabras inversas entre sí, o el mismo tipo sin palabra."""
    if r.get("type") != s.get("type") or not _same_date(r, s):
        return False
    wr, ws = r.get("word"), s.get("word")
    if wr and ws:
        return ws in ((words.get(wr) or {}).get("inverse") or []) or wr in ((words.get(ws) or {}).get("inverse") or [])
    return not wr and not ws


def check_relations(datos, err, warn):
    """Cada relación de cada persona contra el vocabulario: tipo, destino, palabra o texto propio, cargo, certeza,
    los campos de todo hecho anidado y la clave; y, entre fichas, el par escrito dos veces y la ficha que manda."""
    voc = datos["vocabulary"]
    types, words = voc.get("types") or {}, voc.get("words") or {}
    offices, certainty = voc.get("offices") or {}, voc.get("certainty") or {}
    outside = {(o.get("type"), o.get("caption")): o for o in voc.get("outside") or [] if isinstance(o, dict)}
    meses = {m.get("id") for m in datos["calendar"].get("months") or []}
    citadas = cited_relations(datos)
    buscador = bible_coverage.Citas(datos["books"])
    hacia = collections.defaultdict(list)        # (x, y) -> [(fichero, índice, relación)], solo destinos persona
    for o in datos["people"]:
        pid, donde = o.get("id"), o["_fichero"]
        rels = o.get("relations") or []
        if not isinstance(rels, list):
            continue
        for i, r in enumerate(rels):
            rd = f"{donde} relations[{i}]"
            if not isinstance(r, dict):
                err(f"{rd}: debe ser un objeto")
                continue
            t = r.get("type")
            tdef = types.get(t)
            if not isinstance(tdef, dict):
                err(f"{rd}: type '{t}' no es un tipo de data/vocabulary.yaml ({', '.join(types)})")
                validar_hecho(r, rd, err)
                continue
            # destino
            if tdef.get("target") == "person":
                if not r.get("person") or "place" in r:
                    err(f"{rd}: {t} lleva 'person' (y no 'place')")
                elif r["person"] == pid:
                    err(f"{rd}: una persona no se relaciona consigo misma")
                else:
                    hacia[(pid, r["person"])].append((donde, i, r))
            else:
                if "person" in r:
                    err(f"{rd}: {t} lleva 'place' (y no 'person')")
                if not r.get("place") and not tdef.get("target_optional"):
                    err(f"{rd}: {t} necesita 'place'")
            # palabra o texto propio
            w, cap = r.get("word"), r.get("caption")
            if "word" in r:
                if w not in words:
                    err(f"{rd}: word '{w}' no está en data/vocabulary.yaml")
                elif (words[w] or {}).get("type") != t:
                    err(f"{rd}: word '{w}' es de {(words[w] or {}).get('type')}, no de {t}")
                if "caption" in r:
                    err(f"{rd}: lleva word y caption a la vez; una relación dice una cosa o la otra")
            if "caption" in r and not str(cap or "").strip():
                err(f"{rd}: caption vacío")
            if "inverse_caption" in r and ("caption" not in r or not str(r["inverse_caption"] or "").strip()):
                err(f"{rd}: inverse_caption solo vale, no vacío, junto a un caption")
            if tdef.get("word") == "required" and not w and not cap:
                err(f"{rd}: una relación {t} lleva word (o caption mientras se decide su palabra)")
            if cap:
                fuera = outside.get((t, cap))
                if fuera is None:
                    warn("unlisted_caption", f"{rd}: el texto «{cap}» no es una palabra ni está en outside del "
                                             f"vocabulario; elige una palabra o añade el texto con su porqué")
                elif fuera.get("fix"):
                    warn("outside_pending", f"{rd}: «{cap}» espera la decisión {fuera['fix']} de modelo.md")
            if t == "kin" and not w and not cap:
                warn("kin_without_word", f"{rd}: kin sin word dice «pariente» sin grado (decisión K5)")
            if t == "accompanies" and not w and not cap and "date" not in r:
                warn("bare_company", f"{rd}: accompanies sin word, sin caption y sin date solo dice que estuvieron "
                                     f"juntos (decisión T2)")
            if w in words and (words[w] or {}).get("owns") == "target" and r.get("person"):
                r["_owns_target"] = True
            # cargo y certeza
            requiere = set(tdef.get("requires") or [])
            if "office" in r:
                if "office" not in requiere:
                    err(f"{rd}: office solo va en succeeds y holds_office, no en {t}")
                elif r["office"] not in offices:
                    err(f"{rd}: office '{r['office']}' no es un cargo de data/vocabulary.yaml")
            if "certainty" in r:
                if "certainty" not in requiere:
                    err(f"{rd}: certainty solo va en same_as, no en {t}")
                elif r["certainty"] not in certainty:
                    err(f"{rd}: certainty '{r['certainty']}' no es una de {sorted(certainty)}")
            for campo in sorted(requiere - set(r)):
                codigo = MISSING_WARNS.get((t, campo))
                if codigo:
                    warn(codigo, f"{rd}: {t} sin {campo}")
                else:
                    err(f"{rd}: {t} lleva {campo}")
            if t == "same_as":
                if r.get("inferred") is not True:
                    err(f"{rd}: same_as lleva inferred: true (la identidad la deduce la publicación)")
                if r.get("person") and str(pid) > str(r["person"]):
                    warn("same_as_owner", f"{rd}: same_as va en la ficha cuyo id va primero, la de "
                                          f"{r['person']} (decisión O3)")
            # lo de todo hecho anidado
            if not isinstance(r.get("inferred"), bool):
                err(f"{rd}: inferred debe ser true o false")
            validar_hecho(r, rd, err)
            if "date" in r:
                validar_fecha(r["date"], rd, err, meses, r.get("status"))
            # referencia (sección 10)
            if id(r) not in citadas and not bible_coverage.citas(r, datos, bible_coverage.RELATION, buscador):
                warn("no_reference", f"{rd}: {bible_coverage.relation_key(pid, r, voc)} no cita ningún pasaje, no "
                                     f"tiene un capítulo entre sus sources y ningún tramo de la cobertura la cita; "
                                     f"su arista no se dibuja")
        keys_of_one_file(pid, donde, rels, voc, err)
    pairs(hacia, words, warn)
    parents_children(hacia, words, err)


def cited_relations(datos):
    """id() de cada relación que cita algún tramo de la cobertura, en entities o en mentions."""
    idx = bible_coverage._indices(datos)
    out = set()
    for obj in (datos.get("coverage") or {}).values():
        for cap in bible_coverage._capitulos(obj).values():
            for t in (cap or {}).get("spans") or [] if isinstance(cap, dict) else []:
                for campo in ("entities", "mentions"):
                    for ref in (t.get(campo) or []) if isinstance(t, dict) and isinstance(t.get(campo), list) else []:
                        if str(ref).startswith(f"{bible_coverage.RELATION}:"):
                            carpeta, found = bible_coverage.resolver(ref, datos, idx)
                            if carpeta == bible_coverage.RELATION:
                                out.update(id(r) for r in found)
    return out


def keys_of_one_file(pid, donde, rels, voc, err):
    """Dos relaciones de una ficha no comparten clave (type, destino, word u office, date.from). Varias con el mismo
    tipo, destino y palabra son tramos: cada una lleva su date.from. Lo mismo dos con caption, el mismo tipo y el
    mismo destino, porque el caption no entra en la clave."""
    grupos = collections.defaultdict(list)
    con_texto = collections.defaultdict(list)
    for i, r in enumerate(rels):
        if not isinstance(r, dict) or not r.get("type"):
            continue
        destino = bible_coverage.relation_target(r) or "-"
        grupos[(r["type"], destino, bible_coverage.relation_kf(r, voc))].append((i, r))
        if r.get("caption"):
            con_texto[(r["type"], destino)].append((i, r))
    ya = set()
    for (t, destino, kf), lista in grupos.items():
        if len(lista) < 2:
            continue
        indices = ", ".join(str(i) for i, _ in lista)
        ya.add(frozenset(i for i, _ in lista))
        if any(bible_coverage.relation_from(r) is None for _, r in lista):
            err(f"{donde}: relations[{indices}] son {len(lista)} relaciones {t} hacia {destino}"
                f"{' con ' + kf if kf else ''}; como tramos, cada una lleva date.from, o son la misma y se funden")
            continue
        for frm, n in collections.Counter(bible_coverage.relation_from(r) for _, r in lista).items():
            if n > 1:
                err(f"{donde}: relations[{indices}]: {n} relaciones con la misma clave "
                    f"{pid}/{t}/{destino}{'/' + kf if kf else ''}@{frm}")
    for (t, destino), lista in con_texto.items():
        if len(lista) < 2 or frozenset(i for i, _ in lista) in ya:
            continue
        if any(bible_coverage.relation_from(r) is None for _, r in lista):
            err(f"{donde}: relations[{', '.join(str(i) for i, _ in lista)}] son {len(lista)} relaciones {t} con "
                f"caption hacia {destino}; el caption no entra en la clave, así que cada una lleva date.from")


def pairs(hacia, words, warn):
    """pair_twice: el mismo par escrito en las dos fichas. wrong_owner: una palabra owns: target sin copia en la
    otra ficha, es decir, escrita solo en la ficha que no manda."""
    for (x, y), lista in sorted(hacia.items()):
        otras = hacia.get((y, x)) or []
        for donde, i, r in lista:
            pareja = [(d2, j, s) for d2, j, s in otras if _is_pair(r, s, words)]
            if r.pop("_owns_target", False) and not pareja:
                warn("wrong_owner", f"{donde} relations[{i}]: word {r.get('word')} va en la ficha de {y}, con su "
                                    f"inversa ({', '.join((words.get(r.get('word')) or {}).get('inverse') or [])}); "
                                    f"escrita aquí está en la ficha que no manda (decisiones K1 y K2)")
            if x < y:
                for d2, j, s in pareja:
                    warn("pair_twice", f"{donde} relations[{i}] y {d2} relations[{j}]: el mismo par {r.get('type')} "
                                       f"entre {x} y {y} está en las dos fichas; se queda una (decisiones K3 y K4)")


def parents_children(hacia, words, err):
    """Una relación kin escrita en X con persona Y y palabra W dice «Y es el W de X». Si X e Y se la dicen los dos
    con palabras de padres o de hijos, uno pone una de padre y el otro una de hijo."""
    def family_of(r):
        return (words.get(r.get("word")) or {}).get("family") if r.get("type") == "kin" else None

    for (x, y), lista in sorted(hacia.items()):
        if x > y:
            continue
        for donde, _, r in lista:
            fx = family_of(r)
            if fx not in ("parents", "children"):
                continue
            for d2, _, s in hacia.get((y, x)) or []:
                fy = family_of(s)
                if fy in ("parents", "children") and fx == fy:
                    err(f"{donde}: {x} llama a {y} «{r.get('word')}» y {d2} llama a {x} «{s.get('word')}»; una "
                        f"relación kin dice «person es el word de esta ficha», así que un lado lleva palabra de padre "
                        f"y el otro de hijo")


# ---------------------------------------------------------------- sucesos (modelo.md, sección 7)

RE_PASAJE = re.compile(r"^\s*((?:[123]\s?)?[^\d\s][^\d]*?)\.?\s+(\d[\d:,;\s–-]*)$")
# Un tramo entre comas y puntos y comas: «v», «c:v», «v-v», «c:v-v» o «c:v-c:v». Nada vacío ni de más.
RE_TRAMO = re.compile(r"^\s*(\d+)(?::(\d+))?(?:\s*-\s*(\d+)(?::(\d+))?)?\s*$")
_FORMAS_LIBRO = {}


def check_passages(o, donde, err, libros):
    """Cada pasaje de passages cae en un capítulo del libro y en un versículo de ese capítulo (verses de
    data/books.yaml): «Mal 3:19» es un error, porque Malaquías 3 tiene 18. Formas: «Rut 1:1-5», «1Sa 15:32, 33»,
    «Joe 1:1-3:21», «Mt 26:30, 36-56», «Abd 11-14» (libro de un capítulo) y «Sl 34» (capítulos enteros)."""
    clave = id(libros)
    if clave not in _FORMAS_LIBRO:
        _FORMAS_LIBRO.clear()
        _FORMAS_LIBRO[clave] = bible_coverage.Citas(libros).por_forma
    por_forma = _FORMAS_LIBRO[clave]
    for i, pasaje in enumerate(o.get("passages") or []):
        pd = f"{donde} passages[{i}] «{pasaje}»"
        m = RE_PASAJE.match(str(pasaje))
        libro = por_forma.get(bible_coverage._norm(m.group(1))) if m else None
        if not libro:
            err(f"{pd}: no se entiende como «<libro> <capítulo>:<versículos>» de data/books.yaml")
            continue
        items = [item for seg in m.group(2).replace("–", "-").split(";") for item in seg.split(",")]
        malos = [item.strip() for item in items if not RE_TRAMO.match(item)]
        if malos:
            err(f"{pd}: {', '.join(f'«{x}»' for x in malos)} no es un tramo «v», «c:v», «v-v», «c:v-v» ni «c:v-c:v» "
                f"(sin huecos entre comas y puntos y comas, ni dos puntos o guiones de más)")
            continue
        n, versos = int(libro.get("chapters") or 0), libro.get("verses")
        tramos = [RE_TRAMO.match(item).groups() for item in items]
        solo_caps = n > 1 and tramos[0][1] is None
        cap = 1 if n == 1 else None
        puntos = []
        for x1, y1, x2, y2 in tramos:
            for x, y in ((x1, y1), (x2, y2)):
                if x is None:
                    continue
                if y is not None:
                    cap = int(x)
                    puntos.append((cap, int(y)))
                elif solo_caps:
                    puntos.append((int(x), None))
                elif cap is not None:
                    puntos.append((cap, int(x)))
        for c, v in puntos:
            if not 1 <= c <= n:
                err(f"{pd}: {libro.get('name')} no tiene capítulo {c} (tiene {n})")
            elif v is not None and isinstance(versos, list) and len(versos) == n and not 1 <= v <= versos[c - 1]:
                err(f"{pd}: {libro.get('name')} {c} no tiene versículo {v} (tiene {versos[c - 1]})")


def check_event(o, donde, err, warn, datos, meses):
    check_passages(o, donde, err, datos["books"])
    voc = datos["vocabulary"]
    event_types, event_roles = voc.get("event_types") or {}, voc.get("event_roles") or {}
    places = {p.get("id") for p in datos["places"]}
    t = o.get("type")
    if "type" in o and t not in event_types:
        err(f"{donde}: type '{t}' no es un tipo de suceso ({', '.join(event_types)})")
    roles = o.get("roles")
    papeles = []
    if roles is not None:
        if not isinstance(roles, dict):
            err(f"{donde}: roles debe ser un mapa {{<id de persona>: <papel>}}")
            roles = {}
        for pid, v in roles.items():
            rd = f"{donde} roles.{pid}"
            if pid not in (o.get("people") or []):
                err(f"{rd}: '{pid}' tiene papel pero no está en people")
            if isinstance(v, dict):
                if set(v) - CAMPOS_PAPEL:
                    err(f"{rd}: campos desconocidos {sorted(set(v) - CAMPOS_PAPEL)}")
                papel = v.get("role")
                if "date" in v:
                    validar_fecha(v["date"], rd, err, meses, o.get("status"))
                if "place" in v and v["place"] not in places:
                    err(f"{rd}: place '{v['place']}' no existe en data/places/")
            else:
                papel = v
            if papel not in event_roles:
                err(f"{rd}: papel '{papel}' no es uno de {sorted(event_roles)}")
            papeles.append(papel)
    if t in event_types:
        if roles != {} and (event_types[t] or {}).get("role") not in papeles:
            warn("type_without_role", f"{donde}: type {t} sin nadie con el papel "
                                      f"{(event_types[t] or {}).get('role')}; si quien lo hace no tiene ficha, "
                                      f"roles: {{}} y dilo en la reason")
    elif "type" not in o and RE_TITULO_PAPEL.match(str(o.get("title") or "")):
        warn("title_type", f"{donde}: «{o.get('title')}» sin type: el sitio lee del título quién nace o muere "
                           f"(decisiones E1 a E3)")


# ---------------------------------------------------------------- integridad: cada id nombrado existe

SELECTION_TYPES = {"person": "people", "place": "places", "event": "events", "period": "periods",
                   "journey": "journeys", "letter": "letters", "find": "finds", "tour": "tours"}


def _strip_accents(s):
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", str(s)) if unicodedata.category(c) != "Mn")


def selection_exists(datos, sel, ids):
    """¿Existe la selección «tipo:id»? tipo en inglés (person, place, event, period, journey, letter, find, tour,
    book, stop, passage). Parada: «journey/order». Pasaje: «<abbr sin tildes>-<cap>» (hch-16)."""
    tipo, _, oid = str(sel).partition(":")
    if not oid:
        return False
    if tipo in SELECTION_TYPES:
        return oid in ids[SELECTION_TYPES[tipo]]
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
        libro = next((l for l in datos["books"] if _strip_accents(l.get("abbr", "")).lower() == m.group(1)), None)
        return bool(libro) and 1 <= int(m.group(2)) <= int(libro.get("chapters") or 0)
    return False


def integrity(datos):
    """Cada id que nombra una ficha, una fuente o un tramo existe."""
    errores = list(datos.get("_errores") or [])
    fuentes = datos["sources"]
    ids = {t: {o.get("id") for o in datos[t]} for t in TYPES}

    def ref(fichero, que, valor, tipo):
        if valor not in ids[tipo]:
            errores.append(f"{fichero}: {que} '{valor}' no existe en data/{tipo}/")

    def check_source(fichero, camino, fid):
        if fid in fuentes:
            return
        cap = chapter_of(fid, datos["books"])
        if cap:
            errores.append(f"{fichero}: fuente '{fid}' ({camino.lstrip('.')}): {cap[0]['name']} no tiene "
                           f"capítulo {cap[1]} (tiene {cap[0].get('chapters')})")
        else:
            errores.append(f"{fichero}: fuente '{fid}' ({camino.lstrip('.')}) no existe en data/sources/")

    for l in datos["books"]:
        for camino, fid in sources_of(l):
            check_source(f"data/books.yaml ({l.get('slug')})", camino, fid)
    for m in datos["calendar"].get("months") or []:
        for camino, fid in sources_of(m):
            check_source(f"data/calendar.yaml ({m.get('id')})", camino, fid)
    for e in datos["calendar"].get("explanation") or []:
        for camino, fid in sources_of(e):
            check_source(f"data/calendar.yaml (explanation {e.get('id')})", camino, fid)

    for tipo in TYPES:
        for o in datos[tipo]:
            f = o["_fichero"]
            for camino, fid in sources_of(clean(o)):
                check_source(f, camino, fid)
            for i, r in enumerate(o.get("relations") or [] if isinstance(o.get("relations"), list) else []):
                if not isinstance(r, dict):
                    continue
                if r.get("person") is not None:
                    ref(f, f"relations[{i}].person", r["person"], "people")
                if r.get("place") is not None:
                    ref(f, f"relations[{i}].place", r["place"], "places")
            for pid in o.get("distinct_from") or []:
                ref(f, "distinct_from", pid, "people")
            if tipo == "journeys":
                ref(f, "person", o.get("person"), "people")
                for p in o.get("companions") or []:
                    ref(f, "companions", p, "people")
                for p in o.get("stops") or []:
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
            elif tipo == "periods":
                for lid in o.get("places") or []:
                    ref(f, "place", lid, "places")
                if o.get("person") is not None:
                    ref(f, "person", o["person"], "people")
            elif tipo == "finds":
                ref(f, "found_at", o.get("found_at"), "places")
                for sel in o.get("relates_to") or []:
                    if not selection_exists(datos, sel, ids):
                        errores.append(f"{f}: relates_to '{sel}' no existe (formato tipo:id, p. ej. place:corinto)")
            elif tipo == "tours":
                for i, p in enumerate(o.get("stops") or []):
                    sel = (p or {}).get("sel")
                    if not selection_exists(datos, sel, ids):
                        errores.append(f"{f}: stops[{i}].sel '{sel}' no existe (formato tipo:id, p. ej. place:corinto)")
    errores.extend(bible_coverage.errores_referencias(datos))
    return errores


# ---------------------------------------------------------------- todo junto

def validar(datos):
    """Devuelve (errores, avisos); cada aviso es (código, texto)."""
    errores, avisos = [], []
    err = errores.append

    def warn(codigo, texto):
        if codigo in PROMOTED:
            errores.append(f"[{codigo}] {texto}")
        else:
            avisos.append((codigo, texto))

    fuentes = datos["sources"]
    check_vocabulary(datos["vocabulary"], err)
    validar_fuentes(datos, err)
    meses = validar_calendario(datos, err)
    validar_libros(datos, err, meses)
    offices = (datos["vocabulary"].get("offices") or {})
    puntos = formas.puntos_de_vertices(datos["places"])

    for tipo in TYPES:
        vistos = set()
        for o in datos[tipo]:
            donde = o["_fichero"]
            limpio_ = clean(o)
            for k in REQUERIDOS[tipo]:
                if k not in limpio_:
                    err(f"{donde}: falta '{k}'")
            oid = o.get("id")
            if not ID.match(str(oid)):
                err(f"{donde}: id '{oid}' no es un slug ASCII en minúsculas")
            if oid != o["_nombre_fichero"]:
                err(f"{donde}: id '{oid}' no coincide con el nombre del fichero")
            if oid in vistos:
                err(f"{donde}: id '{oid}' repetido")
            vistos.add(oid)
            validar_comun(limpio_, donde, err, fuentes)
            for campo in ("date", "object_date"):
                if campo in limpio_:
                    validar_fecha(limpio_[campo], donde, err, meses, limpio_.get("status"))
            validar_alternativas(limpio_, donde, err, meses)
            orden = limpio_.get("narrative_order")
            if orden is not None and (not isinstance(orden, dict) or not ID.match(str(orden.get("series")))
                                      or not _entero(orden.get("order")) or orden["order"] < 0):
                err(f"{donde}: narrative_order debe ser {{series: <slug>, order: <entero>}}")
            if isinstance(orden, dict) and isinstance(orden.get("after"), str) and not ID.match(orden["after"]):
                err(f"{donde}: narrative_order.after debe ser el id de un suceso")
            textos_largos(limpio_, donde, err)
            if tipo == "places":
                validar_lugar(limpio_, donde, err, fuentes, puntos)
            if tipo in ("places", "people"):
                for i, n in enumerate(limpio_.get("names") or []):
                    if not n.get("name"):
                        err(f"{donde}: names[{i}] sin 'name'")
                    for k in ("from", "to"):
                        if k in n and not isinstance(n[k], int):
                            err(f"{donde}: names[{i}].{k} debe ser un año entero")
                if not limpio_.get("names"):
                    err(f"{donde}: 'names' vacío")
            if tipo == "people":
                validar_persona(limpio_, donde, err)
            if tipo == "journeys":
                ordenes = []
                for i, p in enumerate(limpio_.get("stops") or []):
                    pd = f"{donde} stop {p.get('order', i)}"
                    for k in REQ_PARADA:
                        if k not in p:
                            err(f"{pd}: falta '{k}'")
                    validar_comun(p, pd, err, fuentes)
                    validar_hecho(p, pd, err)
                    if "date" in p:
                        validar_fecha(p["date"], pd, err, meses, p.get("status"))
                    ordenes.append(p.get("order"))
                if ordenes != list(range(1, len(ordenes) + 1)):
                    err(f"{donde}: las paradas deben numerarse 1, 2, 3... sin huecos")
            if tipo == "letters":
                for k in ("context_origin", "context_destination"):
                    c = limpio_.get(k) or {}
                    if not c.get("summary") or not c.get("sources"):
                        err(f"{donde}: {k} necesita summary y sources")
                if not (limpio_.get("recipients") or {}).get("text"):
                    err(f"{donde}: recipients.text vacío")
                if "carriers" in limpio_ and not isinstance(limpio_["carriers"], list):
                    err(f"{donde}: carriers debe ser una lista de ids de personas")
                if "people" in (limpio_.get("recipients") or {}) and not isinstance(limpio_["recipients"]["people"], list):
                    err(f"{donde}: recipients.people debe ser una lista de ids de personas")
            # present: [] es un suceso que no sitúa a nadie (en el camino, sin lugar nombrado).
            if tipo == "events":
                if "present" in limpio_ and not isinstance(limpio_["present"], list):
                    err(f"{donde}: present debe ser una lista de ids de personas ([] si el suceso no sitúa a nadie)")
                check_event(limpio_, donde, err, warn, datos, meses)
            if tipo == "periods":
                if "attested_from" in limpio_:
                    cd, fd = limpio_["attested_from"], limpio_.get("date") or {}
                    if limpio_.get("type") != "power" or fd.get("from") is not None:
                        err(f"{donde}: attested_from solo vale en una potencia sin date.from")
                    elif not _entero(cd) or (_entero(fd.get("to")) and cd > fd["to"]):
                        err(f"{donde}: attested_from debe ser un año astronómico entero anterior a date.to")
                if "events" in limpio_:
                    ids_ev = {e.get("id") for e in datos.get("events") or []}
                    sc = limpio_["events"]
                    if limpio_.get("type") != "power" or not isinstance(sc, list) or not sc:
                        err(f"{donde}: events solo vale en una potencia, como lista no vacía de ids de sucesos")
                    else:
                        for e in sc:
                            if e not in ids_ev:
                                err(f"{donde}: events cita '{e}', que no es un suceso")
                if limpio_.get("type") not in TIPOS_PERIODO:
                    err(f"{donde}: type '{limpio_.get('type')}' no es uno de {sorted(TIPOS_PERIODO)}")
                if "office" in limpio_ and limpio_["office"] not in offices:
                    err(f"{donde}: office '{limpio_['office']}' no es un cargo de data/vocabulary.yaml")
            if tipo == "finds":
                validar_hallazgo(limpio_, donde, err, fuentes)
            if tipo == "tours":
                validar_recorrido(limpio_, donde, err)
    check_relations(datos, err, warn)
    validar_consta_desde(datos, err)
    validar_claves_perspicacia(datos, err)
    validar_wol(datos, err)
    errores.extend(integrity(datos))
    errores.extend(pablo_en_su_sitio(datos))
    errores.extend(meses_en_su_anio(datos))
    errores.extend(bible_coverage.comprobar(datos))
    for slug, obj in (datos.get("coverage") or {}).items():
        textos_largos(clean(obj), obj["_fichero"], err)
    return errores, avisos


EXCEPCIONES_WOL = RAIZ / "scripts" / "wol_exceptions.yaml"


def validar_wol(datos, err, excepciones=None):
    """Una URL de wol.jw.org en data/ es un error salvo las de scripts/wol_exceptions.yaml, que jw.org no tiene: la
    fuente se escribe con su página de www.jw.org, la que da el buscador de jw.org con el documento."""
    if excepciones is None:
        excepciones = set((_read(EXCEPCIONES_WOL) or {}) if EXCEPCIONES_WOL.exists() else {})

    def rec(x, donde):
        if isinstance(x, dict):
            for k, v in x.items():
                if k in ("url", "coord_url") and isinstance(v, str):
                    if v.startswith(("https://wol.jw.org/", "http://wol.jw.org/")) and v not in excepciones:
                        err(f"{donde}: {v} es de wol.jw.org; escribe la página de www.jw.org que da "
                            f"https://www.jw.org/finder?wtlocale=S&docid=<documento> (las que jw.org no tiene van "
                            f"en scripts/wol_exceptions.yaml con su porqué)")
                else:
                    rec(v, donde)
        elif isinstance(x, list):
            for v in x:
                rec(v, donde)

    origen = datos.get("_origen_fuentes") or {}
    for fid, f in (datos.get("sources") or {}).items():
        rec(f, f"{origen.get(fid, 'data/sources/')} ({fid})")
    for t in TYPES:
        for o in datos.get(t) or []:
            rec(clean(o), o.get("_fichero", f"data/{t}"))
    rec(datos.get("calendar") or {}, "data/calendar.yaml")
    rec(datos.get("books") or [], "data/books.yaml")


RE_PERSPICACIA = re.compile(r"^(\d{10})(?:#([1-9]\d?))?$")
# La URL de un artículo de Perspicacia en jw.org lleva su nombre, no el documento.
RE_JW_PERSPICACIA = re.compile(r"^https://www\.jw\.org/es/biblioteca/libros/Perspicacia-para-comprender-las-Escrituras/[^/?#]+/$")


def validar_claves_perspicacia(datos, err):
    """perspicacia: la clave de identidad de una persona, «<documento>#<entrada>» del artículo de Perspicacia
    (1200003629#1 es Ram, núm. 1), o solo el documento si el artículo trata de una sola persona. null dice que
    Perspicacia no tiene artículo. Dos personas con la misma clave son la misma: se funden en una ficha."""
    vistas = {}
    for o in datos["people"]:
        if "perspicacia" not in o:
            continue
        v = o["perspicacia"]
        if v is None:
            continue
        m = RE_PERSPICACIA.match(str(v)) if isinstance(v, str) else None
        if not m:
            err(f"{o['_fichero']}: perspicacia '{v}' debe ser '<documento de 10 cifras>' o '<documento>#<número de la "
                f"entrada>' (1200003629#1), o null si Perspicacia no tiene artículo")
            continue
        enlaces = [e for e in o.get("links") or [] if isinstance(e, dict)]
        urls_ = [str(e.get("url") or "") for e in enlaces]
        urls_ += [str((datos["sources"].get(f) or {}).get("url") or "") for f in o.get("sources") or []]
        # En wol.jw.org la URL termina en el documento. En jw.org no lo lleva: basta un enlace de tipo perspicacia
        # a un artículo de Perspicacia; que sea el del documento lo comprobó quien pasó la URL a jw.org.
        en_jw = any(e.get("type") == "perspicacia" and RE_JW_PERSPICACIA.match(str(e.get("url") or "")) for e in enlaces)
        if not en_jw and not any(u.rstrip("/").endswith("/" + m.group(1)) for u in urls_):
            err(f"{o['_fichero']}: perspicacia '{v}': ningún enlace ni fuente de la ficha lleva al documento {m.group(1)}")
        if v in vistas:
            err(f"{o['_fichero']}: perspicacia '{v}' es también la clave de {vistas[v]}; son la misma persona, "
                f"se funden en una sola ficha")
        else:
            vistas[v] = o["_fichero"]
    por_doc = {}
    for v in vistas:
        doc, _, n = v.partition("#")
        por_doc.setdefault(doc, set()).add(bool(n))
    for doc, formas in por_doc.items():
        if formas == {True, False}:
            err(f"data/people: el documento {doc} sale como clave sin número y con número; si el artículo trata de "
                f"varias personas, todas llevan su número de entrada")


def validar_consta_desde(datos, err):
    """attested_from tiene que caer después del ascenso de la potencia anterior, en el mismo orden que usa el sitio
    (BE.tramoPotencia: por date.from; la que solo tiene fin va justo antes de la que empieza ese año)."""
    def clave(p):
        f = p.get("date") or {}
        return f["from"] if _numero(f.get("from")) else f["to"] - 0.5
    ps = [p for p in datos["periods"] if p.get("type") == "power" and isinstance(p.get("date"), dict)
          and (_numero(p["date"].get("from")) or _numero(p["date"].get("to")))]
    ps.sort(key=clave)
    for i, p in enumerate(ps):
        cd = p.get("attested_from")
        if not _entero(cd) or i == 0:
            continue
        ant = ps[i - 1]
        desde = (ant.get("date") or {}).get("from")
        if _numero(desde) and cd <= desde:
            err(f"{p['_fichero']}: attested_from {cd} no es posterior al ascenso de la potencia anterior, "
                f"{ant.get('id')} ({desde})")


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

    rec(datos["sources"])
    for t in TYPES:
        rec([clean(o) for o in datos[t]])
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
    ap = argparse.ArgumentParser(description="Valida los datos de biblical-atlas.")
    ap.add_argument("--data", default=str(RAIZ / "data"), help="directorio de datos (por defecto data/)")
    ap.add_argument("--links", action="store_true", help="comprueba que cada URL responde 200")
    ap.add_argument("--strict", action="store_true", help="los avisos también hacen fallar")
    args = ap.parse_args(argv)
    datos = load(args.data)
    errores = old_schema(args.data)
    mas, avisos = validar(datos)
    errores += mas
    for e in errores:
        print("ERROR", e)
    for codigo, texto in avisos:
        print(f"AVISO [{codigo}] {texto}")
    n = sum(len(datos[t]) for t in TYPES)
    n_impl = sum(1 for f in datos["sources"].values() if f.get("_implicit"))
    cuenta = collections.Counter(c for c, _ in avisos)
    detalle = ", ".join(f"{c} {cuenta[c]}" for c in WARNING_CODES if cuenta[c])
    print(f"validate: {n} ficheros de entidades, {len(datos['sources'])} fuentes ({n_impl} capítulos implícitos), "
          f"{len(datos['books'])} libros y {len(datos.get('coverage') or {})} ficheros de cobertura; "
          f"{len(errores)} errores de esquema y {len(avisos)} avisos{' (' + detalle + ')' if detalle else ''}.")
    fallos = []
    if args.links:
        lista = urls(datos)
        fallos = comprobar_enlaces(lista)
        for f in fallos:
            print("ENLACE ROTO", f)
        print(f"validate --links: {len(lista)} enlaces comprobados, {len(fallos)} fallos.")
    return 1 if errores or fallos or (args.strict and avisos) else 0


if __name__ == "__main__":
    sys.exit(main())
