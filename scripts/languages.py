"""Los textos en otro idioma: qué es un texto, qué pareja necesita cada uno y de dónde sale lo que se escribe solo.

El español está donde siempre. El inglés de un objeto va a su lado, en un bloque `en` con las mismas claves de texto
(docs/ideas/ingles.md):

    summary: Colonia romana y ciudad principal de su distrito de Macedonia...
    en:
      summary: A Roman colony and the principal city of its district of Macedonia...

Cada objeto que tiene textos lleva su propio bloque: la ficha, cada nombre, cada enlace, cada relación, cada entrada del
historial. La ficha entera es la unidad: si su primer nivel lleva `en`, cada texto de dentro necesita su pareja. El `en`
de la ficha lleva además `checked_on` y `status`, el día en que se cotejó con la fuente en inglés y si se verificó.

Lo usan validate.py (las parejas y las direcciones), build.py (site/data.en.json) y translation_size.py.
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bible_coverage  # noqa: E402

# Los idiomas que se añaden al español. El código es la clave del bloque.
LANGUAGES = ("en",)

# Claves cuyo valor es texto para quien lee o revisa: necesitan pareja en cada idioma.
TEXT_KEYS = {"name", "title", "summary", "reason", "note", "text", "change", "disambiguation", "coord_note",
             "not_claimed", "unknown", "caption", "inverse_caption", "group", "words", "kept_at", "explanation",
             "weather", "harvest", "equivalent", "options", "answer", "search", "work"}
# En un libro, además: su nombre, su abreviatura y su slug en ese idioma, y quién y dónde lo escribió.
BOOK_KEYS = {"name", "abbr", "slug", "writer", "place"}
# Lo que solo lleva el `en` del primer nivel de una ficha, de un libro o de una fuente.
STAMP_KEYS = {"checked_on", "status"}
DATE_KEYS = {"date", "object_date", "covers"}

# Una fecha escrita que es solo años, «c.» y guiones con su era se escribe sola en el otro idioma.
SIMPLE_DATE = re.compile(r"^[\dc.\s\-–]*\d[\dc.\s\-–]*\s(a\.e\.c\.|e\.c\.)$")
ERAS = {"en": {"a.e.c.": "B.C.E.", "e.c.": "C.E."}}

# Un capítulo de la Biblia de estudio en jw.org en el otro idioma: `slug` es el del bloque `en` del libro.
CHAPTER_URL = {"en": "https://www.jw.org/en/library/bible/study-bible/books/{slug}/{cap}/"}
NWT_WORK = {"en": "New World Translation of the Holy Scriptures (Study Edition)"}
LANGUAGE_URL = {"en": ("https://www.jw.org/en/", "https://wol.jw.org/en/")}


def is_text(v):
    return (isinstance(v, str) and v.strip() != "") or (isinstance(v, list) and bool(v) and all(isinstance(x, str) for x in v))


def written_date(text, lang):
    """La fecha escrita en el otro idioma si es de las que se escriben solas («c. 50 e.c.» → «c. 50 C.E.»); si no, None."""
    if not isinstance(text, str) or not SIMPLE_DATE.match(text.strip()):
        return None
    t = text.strip()
    for es, other in ERAS[lang].items():
        if t.endswith(" " + es):
            return t[: -len(es)] + other
    return None


def needs_pair(obj, key, parent=None):
    """Si la clave key del objeto obj necesita su pareja en otro idioma. `parent` es la clave que contiene a obj."""
    v = obj.get(key)
    if key == "url":
        return isinstance(v, str) and "jw.org/" in v
    if key not in TEXT_KEYS or not is_text(v):
        return False
    if key == "text" and parent in DATE_KEYS and written_date(v, LANGUAGES[0]) is not None:
        return False   # la escribe build.py
    return True


def missing_pairs(obj, lang, path, parent=None, extra_keys=()):
    """[(camino, clave)] de cada texto de obj, también en sus hijos, que no tiene pareja en `lang`."""
    out = []
    if isinstance(obj, dict):
        block = obj.get(lang) if isinstance(obj.get(lang), dict) else {}
        for k in obj:
            if k in LANGUAGES or k.startswith("_"):
                continue
            if (needs_pair(obj, k, parent) or k in extra_keys and is_text(obj.get(k))) and k not in block:
                out.append((path, k))
        for k, v in obj.items():
            if k not in LANGUAGES and not k.startswith("_"):
                out += missing_pairs(v, lang, f"{path}.{k}", k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            out += missing_pairs(v, lang, f"{path}[{i}]", parent)
    return out


def blocks(obj, lang, path="", parent=None):
    """[(camino, objeto, bloque, clave padre)] de cada bloque `lang` dentro de obj, el del primer nivel incluido."""
    out = []
    if isinstance(obj, dict):
        if lang in obj:
            out.append((path, obj, obj[lang], parent))
        for k, v in obj.items():
            if k not in LANGUAGES and not str(k).startswith("_"):
                out += blocks(v, lang, f"{path}.{k}" if path else k, k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            out += blocks(v, lang, f"{path}[{i}]", parent)
    return out


def strip(obj):
    """obj sin ningún bloque de idioma, para lo que solo lee el español (data.json, la base, el registro)."""
    if isinstance(obj, dict):
        return {k: strip(v) for k, v in obj.items() if k not in LANGUAGES}
    if isinstance(obj, list):
        return [strip(v) for v in obj]
    return obj


def layer(obj, lang, parent=None):
    """La capa de `lang` de obj con las claves del YAML: el mismo árbol, solo con los textos de ese idioma. Una lista
    conserva su largo, con None donde no hay nada; las fechas que se escriben solas ya van escritas."""
    if isinstance(obj, dict):
        out = {}
        block = obj.get(lang)
        if isinstance(block, dict):
            out.update({k: v for k, v in block.items() if k not in STAMP_KEYS})
        if parent in DATE_KEYS and "text" not in out:
            w = written_date(obj.get("text"), lang)
            if w:
                out["text"] = w
        for k, v in obj.items():
            if k in LANGUAGES or str(k).startswith("_") or k in out:
                continue
            sub = layer(v, lang, k)
            if sub not in (None, {}, []) and not (isinstance(sub, list) and all(x is None for x in sub)):
                out[k] = sub
        return out or None
    if isinstance(obj, list):
        return [layer(v, lang, parent) for v in obj]
    return None


def localized(obj, lang, parent=None):
    """obj con los textos de `lang` en el sitio de los españoles y sin bloques: lo que lee una compilación que deriva
    textos (los cargos de una persona salen de sus relaciones y de los periodos) para escribirlos en ese idioma."""
    if isinstance(obj, dict):
        out = {k: localized(v, lang, k) for k, v in obj.items() if k not in LANGUAGES}
        block = obj.get(lang)
        if isinstance(block, dict):
            out.update({k: v for k, v in block.items() if k not in STAMP_KEYS})
        if parent in DATE_KEYS and not (isinstance(block, dict) and "text" in block):
            w = written_date(obj.get("text"), lang)
            if w:
                out["text"] = w
        return out
    if isinstance(obj, list):
        return [localized(v, lang, parent) for v in obj]
    return obj


def changed_texts(base, other):
    """Lo que cambia de base a other, solo en textos: el mismo árbol, una lista con su largo y None donde no cambia
    nada. None si no cambia ningún texto."""
    if isinstance(base, dict) and isinstance(other, dict):
        out = {k: d for k in other if (d := changed_texts(base.get(k), other[k])) is not None}
        return out or None
    if isinstance(base, list) and isinstance(other, list) and len(base) == len(other):
        out = [changed_texts(a, b) for a, b in zip(base, other)]
        return out if any(x is not None for x in out) else None
    return other if isinstance(other, str) and other != base else None


def book_slug(books, lang):
    """{slug en español: slug en `lang`} de los libros que ya lo tienen."""
    return {b["slug"]: b[lang]["slug"] for b in books if isinstance(b.get(lang), dict) and b[lang].get("slug")}


def chapter_source(slug, cap, books, lang):
    """La fuente de un capítulo de la Biblia en `lang`, o None si su libro aún no tiene el slug en ese idioma."""
    b = next((x for x in books if x.get("slug") == slug), None)
    other = (b or {}).get(lang) or {}
    if not other.get("slug") or not other.get("name"):
        return None
    return {"title": f"{other['name']} {cap}", "work": NWT_WORK[lang],
            "url": CHAPTER_URL[lang].format(slug=other["slug"], cap=cap)}


def source_in(src, books, lang):
    """{title, work, url} de una fuente en `lang`: su bloque, o el capítulo de la Biblia que se escribe solo. None si no
    lo tiene. Un capítulo implícito lleva ya la dirección del capítulo en español. Una fuente que no es de jw.org (OpenBible) no cambia con el idioma: devuelve la misma."""
    if isinstance(src.get(lang), dict):
        b = src[lang]
        return {"title": b.get("title"), "work": b.get("work", src.get("work")), "url": b.get("url")}
    url = str(src.get("url") or "")
    cap = bible_coverage.capitulo_de_url(url, books)
    if cap:
        return chapter_source(cap[0]["slug"], cap[1], books, lang)
    if "jw.org/" not in url:
        return {"title": src.get("title"), "work": src.get("work"), "url": src.get("url")}
    return None
