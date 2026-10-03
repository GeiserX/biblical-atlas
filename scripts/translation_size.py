#!/usr/bin/env python3
"""Cuánto texto hay que pasar a otro idioma: campos de texto y palabras de data/, por tipo de entidad y por clase.

Uso:  python3 scripts/translation_size.py [--data DIR] [--json]

Cuenta cada cadena de un campo de texto, también en los hechos anidados (nombres, candidatos, relaciones, paradas,
historial, enlaces). Las clases dicen cuánto trabajo pide cada una:

- names: `name` y `title` (nombres y títulos). Se cotejan con la grafía de la TNM del otro idioma.
- prose: resúmenes, notas, desambiguaciones, frases de `not_claimed` y el resto de textos para quien lee.
- reason: `reason`, por qué lo afirmamos, con la cita de la fuente del otro idioma.
- history: `change` de cada entrada del historial.
- link_titles: `title` de un enlace (`links`); sale del título de su fuente.
- date_text: `text` de un objeto fecha. Entre paréntesis, las que son solo años, «c.» y guiones con su era, que
  build.py escribe solas en el otro idioma (languages.written_date).
- search: el término de búsqueda de wol.jw.org de la revisión anual.

Las citas (`passages`, `reference`) no se cuentan como texto: se convierten con las abreviaturas de los libros. Las
fuentes, los libros, el calendario y el vocabulario van aparte, en sus filas.
"""
import argparse
import json
import re
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
import languages  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
TYPES = ["places", "people", "journeys", "letters", "events", "periods", "finds", "tours"]
PROSE = {"summary", "note", "disambiguation", "coord_note", "not_claimed", "unknown", "caption", "inverse_caption",
         "group", "options", "answer", "explanation", "words", "kept_at", "text", "weather", "harvest", "equivalent"}
DATE_KEYS = {"date", "object_date", "covers"}
REFERENCES = {"passages", "reference"}
CLASSES = ["names", "prose", "reason", "history", "link_titles", "date_text", "search"]


def words(s):
    return len(str(s).split())


class Tally:
    def __init__(self):
        self.fields = {c: 0 for c in CLASSES}
        self.words = {c: 0 for c in CLASSES}
        self.simple_dates = 0
        self.references = 0
        self.entities = 0

    def add(self, cls, s):
        self.fields[cls] += 1
        self.words[cls] += words(s)

    def total_fields(self):
        return sum(self.fields.values())

    def total_words(self):
        return sum(self.words.values())


def walk(x, tally, key=None, parent=None):
    """Recorre un objeto y apunta cada texto en su clase. `parent` es la clave del objeto que contiene a x."""
    if isinstance(x, dict):
        for k, v in x.items():
            if k == "en":
                continue  # lo ya escrito en inglés no es trabajo pendiente
            walk(v, tally, k, key)
        return
    if isinstance(x, list):
        for v in x:
            walk(v, tally, key, parent)
        return
    if not isinstance(x, str) or not x.strip():
        return
    if key in REFERENCES:
        tally.references += 1
    elif key == "text" and parent in DATE_KEYS:
        tally.add("date_text", x)
        tally.simple_dates += languages.written_date(x, "en") is not None
    elif key == "title" and parent == "links":
        tally.add("link_titles", x)
    elif key in ("name", "title"):
        tally.add("names", x)
    elif key == "reason":
        tally.add("reason", x)
    elif key == "change":
        tally.add("history", x)
    elif key == "search":
        tally.add("search", x)
    elif key in PROSE:
        tally.add("prose", x)


def measure(data_dir):
    data_dir = Path(data_dir)
    out = {}
    for t in TYPES:
        tally = Tally()
        for f in sorted((data_dir / t).glob("*.yaml")):
            tally.entities += 1
            walk(yaml.safe_load(f.read_text(encoding="utf-8")), tally)
        out[t] = tally
    # Fuentes: el título de cada una, sin repetir ids. Las de un capítulo de la Biblia se escriben solas desde los libros,
    # y las de Perspicacia tienen la dirección en inglés en la propia página (hreflang): se cuentan aparte.
    tally = Tally()
    chapter = re.compile(r"^https://www\.jw\.org/es/biblioteca/biblia/biblia-estudio/libros/[^/]+/\d+/?$")
    insight = "/Perspicacia-para-comprender-las-Escrituras/"
    tally.bible_chapters = tally.insight = 0
    seen = {}
    for f in sorted((data_dir / "sources").glob("*.yaml")):
        for sid, s in (yaml.safe_load(f.read_text(encoding="utf-8")) or {}).items():
            if isinstance(s, dict):
                seen.setdefault(sid, s)
    for s in seen.values():
        tally.entities += 1
        if chapter.match(str(s.get("url") or "")):
            tally.bible_chapters += 1
            continue
        tally.insight += insight in str(s.get("url") or "")
        tally.add("names", s.get("title") or "")
    out["sources"] = tally
    for name, path in (("books", "books.yaml"), ("calendar", "calendar.yaml"), ("vocabulary", "vocabulary.yaml")):
        tally = Tally()
        doc = yaml.safe_load((data_dir / path).read_text(encoding="utf-8")) or {}
        if name == "books":
            tally.entities = len(doc.get("books") or [])
            for b in doc.get("books") or []:
                for k in ("name", "writer", "place"):
                    if isinstance(b.get(k), str):
                        tally.add("names", b[k])
                walk({k: v for k, v in b.items() if k not in ("name", "writer", "place", "forms", "spoken", "abbr")}, tally)
        elif name == "calendar":
            tally.entities = len(doc.get("months") or []) + len(doc.get("explanation") or [])
            walk(doc, tally)
        else:
            # El vocabulario: el texto en español de cada palabra, cargo y tipo (`es`, `inverse_es`, `verb`...).
            def vocab(x):
                if isinstance(x, dict):
                    for k, v in x.items():
                        if isinstance(v, str) and (k.endswith("es") or k in ("verb", "inverse_verb", "text")) and k != "legacy":
                            tally.add("names", v)
                        else:
                            vocab(v)
                elif isinstance(x, list):
                    for v in x:
                        vocab(v)
            for k in ("types", "words", "offices", "certainty", "event_roles", "outside"):
                tally.entities += len(doc.get(k) or {})
            vocab(doc)
        out[name] = tally
    return out


def table(out):
    head = ("| Tipo | Fichas | Campos | Palabras | Nombres y títulos | Prosa | Razones | Historial | Títulos de enlace "
            "| Fechas escritas (simples) | Búsqueda |")
    lines = [head, "|" + "---|" * 11]
    tot = Tally()
    for t, x in out.items():
        cell = lambda c: f"{x.fields[c]} / {x.words[c]}"
        dates = f"{x.fields['date_text']} ({x.simple_dates})"
        lines.append(f"| {t} | {x.entities} | {x.total_fields()} | {x.total_words()} | {cell('names')} | {cell('prose')} "
                     f"| {cell('reason')} | {cell('history')} | {cell('link_titles')} | {dates} | {cell('search')} |")
        tot.entities += x.entities
        tot.simple_dates += x.simple_dates
        tot.references += x.references
        for c in CLASSES:
            tot.fields[c] += x.fields[c]
            tot.words[c] += x.words[c]
    cell = lambda c: f"{tot.fields[c]} / {tot.words[c]}"
    lines.append(f"| **total** | {tot.entities} | {tot.total_fields()} | {tot.total_words()} | {cell('names')} "
                 f"| {cell('prose')} | {cell('reason')} | {cell('history')} | {cell('link_titles')} "
                 f"| {tot.fields['date_text']} ({tot.simple_dates}) | {cell('search')} |")
    lines.append("")
    lines.append(f"Cada celda de clase es «campos / palabras». Citas que se convierten solas: {tot.references}. "
                 f"Fuentes escritas: {out['sources'].entities}; {out['sources'].bible_chapters} son un capítulo de la Biblia, sin "
                 f"texto que traducir, y {out['sources'].insight} son artículos de Perspicacia.")
    return "\n".join(lines)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--data", default=str(ROOT / "data"))
    ap.add_argument("--json", action="store_true", help="las cifras en JSON en vez de la tabla")
    a = ap.parse_args(argv)
    out = measure(a.data)
    if a.json:
        print(json.dumps({t: {"entities": x.entities, "fields": x.fields, "words": x.words,
                              "simple_dates": x.simple_dates, "references": x.references} for t, x in out.items()},
                         ensure_ascii=False, indent=1))
    else:
        print(table(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
