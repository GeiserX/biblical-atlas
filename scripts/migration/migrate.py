#!/usr/bin/env python3
"""La migración del núcleo al inglés: deja un checkout del esquema antiguo en el esquema nuevo.

La especificación es docs/investigacion/modelo.md, sección 15. Este script solo aplica scripts/migration/map.yaml,
el vocabulario (data/vocabulary.yaml) y los ficheros de decisiones (scripts/migration/decisions/*.yaml). Es
determinista y, ejecutado otra vez sobre datos ya migrados, no cambia nada.

Uso:
  python3 scripts/migration/migrate.py                       el checkout de este script, entero
  python3 scripts/migration/migrate.py --root <checkout>     otro checkout, entero
  python3 scripts/migration/migrate.py --data <carpeta>      solo una carpeta de datos, por ejemplo una copia de data/
  python3 scripts/migration/migrate.py --check ...           no escribe nada; sale con 1 si algo cambiaría
  python3 scripts/migration/migrate.py --baseline <ref|carpeta> ...
                                                             rama de libro: P, el último commit de main en el esquema
                                                             antiguo (un ref de git o la carpeta data/ de P)
  python3 scripts/migration/migrate.py --proposal p.json [--data <carpeta>] [--out q.json]
                                                             traduce una propuesta de formato 1 (versiculos.md, 11)

Qué hace, por tokens y sin cargar y volcar: cambia el nombre de una clave o de un valor cerrado en su sitio e inserta
líneas, sin tocar un texto, un comentario, el orden de las claves ni las comillas. Cada fichero reescrito se vuelve a
leer y tiene que decir exactamente lo que la migración quería; si no, se para sin escribir nada.

  1. Renombra las carpetas y los ficheros de data/ (`directories`, `files`). Con el checkout entero, también los
     scripts, las carpetas de scripts/videos/ y las claves de su configuración (`scripts`, `video_config_keys`).
  2. Renombra las claves (`keys`) y los valores cerrados por su ruta (`enums`, `at`).
  3. Pasa al inglés las selecciones de hallazgos y recorridos y los prefijos de la cobertura.
  4. Reescribe cada relación con la primera regla de `relation_rewrites` que casa; si ninguna casa, su texto pasa a
     `caption` (y `relacion_inversa` a `inverse_caption`) y se lista. Cada referencia `relacion:` de la cobertura
     sigue a su relación y se escribe en su forma canónica; la que casa con varios tramos se queda con los tramos cuya
     razón o cuyas fuentes citan su capítulo (la función de citas de la cobertura).
  5. Pone `checked_on` en cada hecho anidado que no lo lleva (relaciones, paradas, candidatos, nombres y fiestas de
     un mes), justo antes de `status` o al final: la del hecho que lo contiene, el más cercano. Con --baseline, un
     hecho que está igual en P toma la fecha que tenía allí su fichero.
  6. Pone `type` y `roles` a los sucesos que nombra `events` del mapa, justo después de `people`.
  7. Reescribe las rutas de las líneas de comentario de cada fichero de datos (la especificación pide la primera;
     las demás que nombran una ruta también, para que no quede un nombre antiguo) y, con el checkout entero, las de
     la configuración de scripts/videos/ y los ficheros de `references.rewrite` (rutas, scripts y opciones).
  8. Aplica las decisiones y vuelve a escribir las referencias de la cobertura en su forma canónica.
  9. Con el checkout entero trae de M lo que M escribe a mano en data/ y la migración no produce: data/vocabulary.yaml
     y data/coverage/README.md. M es el árbol de este script si migra otro checkout, o MERGE_HEAD si migra el suyo con
     --baseline durante la fusión con M. Un README que la rama cambió respecto a P no se pisa: se lista.
 10. Con el checkout entero crea scripts/migration/redirects.yaml si falta y escribe el informe en
     scripts/migration/reports/<commit>.yaml, sin pisar uno que ya exista. Con --data, el informe va a --report.

Se para sin escribir nada (código 2) ante: una clave, un valor cerrado, un prefijo o una carpeta que no están en el
mapa; un hecho anidado sin fecha que copiar; una cita con varios tramos que ninguno reclama; una decisión mal
escrita o que no casa; o un fichero cuya reescritura no dice lo esperado. No adivina. Lo que no para, se lista y se
deja como está: una palabra de relación sin regla (pasa a caption), una cita que no casa con ninguna relación, un
suceso del mapa que no existe.

Códigos de salida: 0 hecho o nada que hacer; 1 con --check, si algo cambiaría; 2 si se paró.

FICHEROS DE DECISIONES (scripts/migration/decisions/*.yaml)

Lo que pide leer el texto (sección 16 de modelo.md) no está en el mapa: va en un fichero por decisión. Se aplican
después de la migración mecánica, por orden de nombre de fichero y de entrada, sobre los datos ya en inglés:

  format: biblical-earth/migration-decisions/1
  decision: K1                       # el código de la decisión en docs/investigacion/modelo.md
  checked_on: '2026-09-29'           # día en que se leyeron las fuentes de esta decisión
  entries:
  - file: people/artajerjes-i        # carpeta nueva y id, sin .yaml
    relation: artajerjes-i/kin/jerjes-i   # la clave escrita (sección 6), en una forma que case con una sola
    set: {word: father}              # campos que pone, en el esquema nuevo
    unset: [caption]                 # campos que quita
    sources: [it-artajerjes]         # las fuentes que sostienen el cambio: se unen a las del hecho
    reason: Perspicacia «Artajerjes» lo llama hijo de Jerjes I.   # por qué; palabras propias, 40 como máximo
  - file: people/cambises-ii
    add: {type: kin, person: ciro, word: father, inferred: false, sources: [it-ciro], reason: ..., status: verified}
    sources: [it-ciro]
    reason: ...
  - file: people/ciro
    relation: ciro/kin/cambises-ii
    remove: true
    redirect_to: cambises-ii/kin/ciro/father  # la clave que queda: fila nueva de redirects.yaml; al final, la que
                                              # queda une las fuentes de la quitada, también las que la entrada no nombra
    sources: [it-ciro]
    reason: ...
  - file: events/muerte-de-jesus     # sin `relation`, set y unset tocan los campos del fichero
    set: {type: death, roles: {jesus: died}}
    sources: [mateo-27]
    reason: ...

  - file: coverage/genesis          # con `chapter`, cita en un tramo de la cobertura lo que otra entrada añade
    chapter: 36
    span: 31-39                      # el `v` del tramo
    entities: [relation:bela-hijo-de-beor/holds_office/edom]   # en su forma canónica; también `mentions`
    sources: [genesis-36]
    reason: ...

Cada entrada lleva `sources` (ids que existen, o capítulos <libro>-<n>) y `reason`. El hecho tocado (la relación o
el fichero) une esas fuentes a las suyas y pone su `checked_on` al día de la decisión; un tramo de la cobertura no
lleva fuentes, y en él solo se añaden las referencias. Una entrada ya aplicada no cambia nada: un `add` cuya clave
ya existe, un `remove` cuya relación ya no está o una referencia que el tramo ya cita se saltan.
"""
import argparse
import collections
import copy
import datetime
import importlib
import io
import json
import re
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

import yaml
from yaml.nodes import MappingNode, ScalarNode, SequenceNode

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
MAP_PATH = HERE / "map.yaml"
LOADER = getattr(yaml, "CSafeLoader", yaml.SafeLoader)
DECISIONS_FORMAT = "biblical-earth/migration-decisions/1"
REPORT_FORMAT = "biblical-earth/migration-report/1"
DATE_KEYS = ("consultado", "checked_on")
STATUS_KEYS = ("estado", "status")
# Hechos anidados (sección 4): la ruta antigua y de dónde copian la fecha.
NESTED = {
    "personas.relaciones[]": "file",
    "viajes.paradas[]": "file",
    "lugares.candidatos[]": "file",
    "calendario.meses[].nombres[]": "month",
    "calendario.meses[].fiestas[]": "month",
}
RELATION_PATH = "personas.relaciones[]"


class Stop(Exception):
    pass


def load(path):
    return yaml.load(Path(path).read_text(encoding="utf-8"), Loader=LOADER)


def construct(node):
    return yaml.constructor.SafeConstructor().construct_object(node, deep=True)


def dump(obj):
    return yaml.safe_dump(obj, allow_unicode=True, sort_keys=False, width=120, default_flow_style=False)


def iso(v):
    return v.isoformat()[:10] if isinstance(v, (datetime.date, datetime.datetime)) else str(v)


def last_index(node):
    """Fin real de un nodo: el del último escalar que contiene (el de una colección en bloque no es fiable)."""
    if isinstance(node, ScalarNode) or node.flow_style or not node.value:
        return node.end_mark.index
    last = node.value[-1]
    return last_index(last[1] if isinstance(node, MappingNode) else last)


class Many(list):
    """Un escalar que se convierte en varios elementos de su lista (una cita con varios tramos)."""


# ---------------------------------------------------------------- el mapa y el vocabulario

class Model:
    def __init__(self, map_path=MAP_PATH, vocabulary_path=None, vocabulary=None):
        m = load(map_path)
        self.map = m
        self.voc = vocabulary if vocabulary is not None else (load(vocabulary_path) if vocabulary_path else None)
        self.keys = dict(m["keys"])
        self.rkeys = {v: k for k, v in self.keys.items()}
        self.relation_keys = m["relation_keys"]
        for old, news in self.relation_keys.items():
            for n in news:
                self.rkeys[n] = old
        new_keys = {k for ks in m["new_keys"].values() for k in ks}
        for k in new_keys:
            self.rkeys.setdefault(k, k)
        self.known = (set(self.keys) | set(self.keys.values()) | set(self.relation_keys) | new_keys
                      | {n for ns in self.relation_keys.values() for n in ns})
        self.id_maps = set(m["id_maps"]) | {"eventos.roles"}
        self.enums = []
        for e in m["enums"]:
            if e.get("at") is None:
                continue
            table = m[e["values_from"]] if e.get("values_from") else e["values"]
            news = set(table.values())
            if e.get("values_from") == "relation_types" and self.voc:
                news |= set(self.voc["types"])
            self.enums.append({"rx": re.compile(e["at"]), "field": e["field"], "table": table, "news": news,
                               "prefix": bool(e.get("value_is"))})
        self._enum_cache = {}
        self.relation_types = m["relation_types"]
        self.rewrites = m["relation_rewrites"]
        self.selection_types = m["selection_types"]
        self.coverage_prefixes = m["coverage_prefixes"]
        self.selection_at = [re.compile(x) for x in m["selection_at"]]
        self.video_keys = m["video_config_keys"]
        self.video_values = next((e["values"] for e in m["enums"] if e["field"] == "video_config.accents"), {})
        self.proposal_types = m["proposal"]["proposal_types"]
        # Carpeta o fichero raíz de data/: nombre nuevo o antiguo -> nombre antiguo (el de las rutas del mapa).
        self.data_dirs = {}
        for old, new in m["directories"].items():
            if old.startswith("data/"):
                self.data_dirs[old[5:]] = new[5:]
        self.data_files = {Path(o).stem: Path(n).stem for o, n in m["files"].items()
                           if o.count("/") == 1 and o.endswith(".yaml")}
        self.root_old = {}
        for old, new in list(self.data_dirs.items()) + list(self.data_files.items()):
            self.root_old[old] = old
            self.root_old[new] = old
        self.events = {}
        for etype, spec in m["events"].items():
            for eid in spec["ids"]:
                roles = {"__first__": spec["role"]}
                roles.update((spec.get("also") or {}).get(eid) or {})
                self.events[eid] = (etype, roles, spec.get("who"))

    def old_key(self, k):
        return self.rkeys.get(k, k)

    def enum_at(self, path):
        if path not in self._enum_cache:
            self._enum_cache[path] = [e for e in self.enums if e["rx"].search(path)]
        return self._enum_cache[path]

    def is_selection(self, path):
        return any(rx.search(path) for rx in self.selection_at)

    def rule(self, tipo, rel, inv):
        for r in self.rewrites:
            f = r["from"]
            if f["tipo"] == tipo and f.get("relacion") == rel and inv in r.get("inverse_was", [None]):
                return r
        return None

    def relation_target(self, d):
        """Lo que la migración mecánica hace de una relación antigua: ({type, word?, caption?, inverse_caption?,
        certainty?}, regla o None). (None, None) si su tipo no está en el mapa."""
        tipo, rel, inv = d.get("tipo"), d.get("relacion"), d.get("relacion_inversa")
        r = self.rule(tipo, rel, inv)
        if r:
            return dict(r["to"]), r
        if tipo in self.relation_types:
            to = {"type": self.relation_types[tipo]}
            if rel is not None:
                to["caption"] = rel
            if inv is not None:
                to["inverse_caption"] = inv
            return to, None
        return None, None

    def key_field(self, rtype):
        return ((self.voc or {}).get("types", {}).get(rtype) or {}).get("key_field", "word")

    def legacy(self, rtype):
        return ((self.voc or {}).get("types", {}).get(rtype) or {}).get("legacy")


# ---------------------------------------------------------------- relaciones: índice, claves y citas

class Rel:
    __slots__ = ("file", "i", "type", "target", "word", "office", "frm", "legacy", "raw", "caption")

    def __init__(self, model, file, i, d):
        self.file, self.i, self.raw = file, i, d
        if "tipo" in d and "type" not in d:
            to, _ = model.relation_target(d)
            to = to or {}
            self.type, self.word, self.office = to.get("type"), to.get("word"), None
            self.caption = to.get("caption")
            self.target = d.get("persona") or d.get("lugar")
            fecha = d.get("fecha")
            self.frm = fecha.get("desde") if isinstance(fecha, dict) else None
            self.legacy = d.get("tipo")
        else:
            self.type, self.word, self.office = d.get("type"), d.get("word"), d.get("office")
            self.caption = d.get("caption")
            self.target = d.get("person") or d.get("place")
            date = d.get("date")
            self.frm = date.get("from") if isinstance(date, dict) else None
            self.legacy = model.legacy(self.type)

    def kf(self, model):
        return self.office if model.key_field(self.type) == "office" else self.word


def parse_key(body):
    """«x/type/y[/kf][@from]» -> (x, type, y, kf o None, from o None), o None si no tiene esa forma."""
    frm = None
    if "@" in body:
        body, _, f = body.rpartition("@")
        try:
            frm = int(f)
        except ValueError:
            return None
    parts = body.split("/")
    if len(parts) not in (3, 4) or not all(parts):
        return None
    return parts[0], parts[1], parts[2], parts[3] if len(parts) == 4 else None, frm


def matches(model, r, parsed):
    x, t, y, kf, frm = parsed
    return (r.file == x and r.type == t and (r.target or "-") == y and (kf is None or r.kf(model) == kf)
            and (frm is None or r.frm == frm))


def full_key(model, r):
    s = f"{r.file}/{r.type}/{r.target or '-'}"
    if r.kf(model):
        s += f"/{r.kf(model)}"
    if r.frm is not None:
        s += f"@{r.frm}"
    return s


def canonical(model, r, siblings):
    """La forma más corta que casa con una sola relación: sin nada; con @from; con /word u office; con los dos."""
    base = f"{r.file}/{r.type}/{r.target or '-'}"
    kf = r.kf(model)
    forms = [(base, (None, None))]
    if r.frm is not None:
        forms.append((f"{base}@{r.frm}", (None, r.frm)))
    if kf:
        forms.append((f"{base}/{kf}", (kf, None)))
        if r.frm is not None:
            forms.append((f"{base}/{kf}@{r.frm}", (kf, r.frm)))
    for text, (k, f) in forms:
        parsed = (r.file, r.type, r.target or "-", k, f)
        if sum(1 for s in siblings if matches(model, s, parsed)) == 1:
            return "relation:" + text
    return None


class ChapterCiter:
    """Los capítulos que cita una relación, con la función de citas de la cobertura (scripts/cobertura.py o, cuando
    ya se llame así, scripts/bible_coverage.py). Le pasa los objetos con las claves de los dos esquemas."""

    def __init__(self, scripts_dir, books, sources):
        mod = None
        sys.path.insert(0, str(scripts_dir))
        try:
            for name in ("cobertura", "bible_coverage"):
                try:
                    mod = importlib.import_module(name)
                    break
                except ImportError:
                    continue
        finally:
            sys.path.pop(0)
        if mod is None or not hasattr(mod, "citas"):
            raise Stop(f"no encuentro la función de citas de la cobertura en {scripts_dir}")
        self.mod = mod
        both = []
        for b in books:
            b = dict(b)
            for old, new in (("abr", "abbr"), ("nombre", "name"), ("formas", "forms"), ("capitulos", "chapters")):
                if old in b:
                    b[new] = b[old]
                elif new in b:
                    b[old] = b[new]
            both.append(b)
        srcs = {}
        for fid, s in sources.items():
            s = dict(s or {})
            srcs[fid] = s
        by_slug = {b["slug"]: b for b in both}
        self.implicit = (by_slug, srcs)
        self.datos = {"libros": both, "books": both, "fuentes": srcs, "sources": srcs}
        textos = getattr(mod, "TEXTOS_CITA", {})
        self.carpeta = "relation" if "relation" in textos else "relacion"
        self.finder = mod.Citas(both)

    def chapters(self, raw):
        by_slug, srcs = self.implicit
        fuentes = raw.get("fuentes", raw.get("sources")) or []
        for fid in fuentes:                     # capítulos <libro>-<n> que build.py crea solos
            m = re.match(r"^(.+)-(\d+)$", str(fid))
            if fid not in srcs and m and m.group(1) in by_slug:
                num = by_slug[m.group(1)].get("num")
                srcs[fid] = {"url": f"https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/{num}/{m.group(2)}"}
        razon = raw.get("razon", raw.get("reason"))
        o = {"razon": razon, "reason": razon, "fuentes": fuentes, "sources": fuentes}
        return self.mod.citas(o, self.datos, self.carpeta, self.finder)


# ---------------------------------------------------------------- reescribir un fichero por tokens

class Rewriter:
    def __init__(self, run, text, where, root, stem, mode="data"):
        self.run, self.m = run, run.model
        self.text, self.where, self.root, self.stem, self.mode = text, where, root, stem, mode
        self.edits = []                     # (inicio, fin, texto nuevo, líneas añadidas)
        self.stack = []
        self.chapter = None
        self.book = None
        self.doc = None
        self.seen = {}

    # -- utilidades de texto
    def line_start(self, i):
        return self.text.rfind("\n", 0, i) + 1

    def line_end(self, i):
        if i > 0 and self.text[i - 1] == "\n":
            return i
        j = self.text.find("\n", i)
        return len(self.text) if j < 0 else j + 1

    def edit(self, start, end, new, added=0):
        self.edits.append((start, end, new, added))

    def put(self, node, new):
        """Cambia el texto de un escalar conservando su estilo."""
        s = str(new)
        if node.style == "'":
            t = "'" + s.replace("'", "''") + "'"
        elif node.style == '"':
            t = json.dumps(s, ensure_ascii=False)
        elif self.run.plain_ok(s):
            t = s
        else:
            t = "'" + s.replace("'", "''") + "'"
        if self.text[node.start_mark.index:node.end_mark.index] != t:
            self.edit(node.start_mark.index, node.end_mark.index, t)

    def insert_key(self, node, key, value_text, before=STATUS_KEYS):
        if node.flow_style or not node.value:
            self.run.stop(f"{self.where}: no sé insertar «{key}» en un objeto en línea")
            return
        col = node.value[0][0].start_mark.column
        for k, v in node.value:
            if isinstance(k, ScalarNode) and k.value in before:
                pos = k.start_mark.index
                self.edit(pos, pos, f"{key}: {value_text}\n" + " " * col, 1)
                return
        pos = self.line_end(last_index(node.value[-1][1]))
        pre = "" if pos == 0 or self.text[pos - 1] == "\n" else "\n"
        self.edit(pos, pos, pre + " " * col + f"{key}: {value_text}\n", 1)

    def delete_key(self, node, k, v):
        i = next(n for n, (a, _) in enumerate(node.value) if a is k)
        if i + 1 < len(node.value):
            self.edit(k.start_mark.index, node.value[i + 1][0].start_mark.index, "")
            return
        ls = self.line_start(k.start_mark.index)
        if self.text[ls:k.start_mark.index].strip():
            self.run.stop(f"{self.where}: no sé quitar «{k.value}», última clave de un elemento de una sola línea")
            return
        self.edit(ls, self.line_end(last_index(v)), "")

    def result(self):
        """(texto nuevo, [líneas añadidas en el texto nuevo], [líneas quitadas del texto antiguo])."""
        out, cur, lines_out, added, removed = [], 0, 0, [], []
        prev_end = -1
        for s, e, t, n in sorted(self.edits, key=lambda x: (x[0], x[1])):
            if s < prev_end:
                raise Stop(f"{self.where}: dos cambios se pisan en la posición {s}")
            chunk = self.text[cur:s]
            out.append(chunk)
            lines_out += chunk.count("\n")
            gone = self.text[s:e]
            if not t and gone.count("\n"):
                first = self.text.count("\n", 0, s) + 1
                removed += list(range(first, first + gone.count("\n")))
            if n:
                lead = 1 if t.startswith("\n") else 0
                first = lines_out + 1 + lead
                added += list(range(first, first + t.count("\n") - lead))
            out.append(t)
            lines_out += t.count("\n")
            cur, prev_end = e, e
        out.append(self.text[cur:])
        return "".join(out), added, removed

    # -- el recorrido
    def go(self):
        node = yaml.compose(self.text, Loader=LOADER)
        if node is None:
            return None, None
        self.run.flow_parent = {}
        mark_flow(node, self.run.flow_parent)
        self.doc = construct(node)
        if isinstance(self.doc, dict):
            self.book = self.doc.get("libro") or self.doc.get("book") or self.stem
        return node, self.walk(node, self.root)

    def walk(self, node, path):
        # Un alias (*id001) es el mismo nodo que su ancla: se recorre una vez, y su cambio vale para los dos.
        if id(node) in self.seen:
            return copy.deepcopy(self.seen[id(node)])
        value = self._walk(node, path)
        self.seen[id(node)] = value
        return value

    def _walk(self, node, path):
        if isinstance(node, MappingNode):
            return self.walk_map(node, path)
        if isinstance(node, SequenceNode):
            out = []
            coverage_list = path.startswith("cobertura.") and self.m.is_selection(path + "[]")
            for item in node.value:
                v = self.walk(item, path + "[]")
                if isinstance(v, Many):
                    out.extend(v)
                elif coverage_list and isinstance(v, str) and v in out:
                    self.drop_item(node, item)      # dos citas que ahora nombran la misma relación: queda una
                else:
                    out.append(v)
            return out
        return self.walk_scalar(node, path)

    def drop_item(self, seq, item):
        """Quita un elemento repetido de una lista de la cobertura (y el cambio que ya se le hubiera apuntado)."""
        self.edits = [e for e in self.edits if (e[0], e[1]) != (item.start_mark.index, item.end_mark.index)]
        i = seq.value.index(item)
        if seq.flow_style:
            self.edit(seq.value[i - 1].end_mark.index, item.end_mark.index, "")
        else:
            self.edit(self.line_start(item.start_mark.index), self.line_end(last_index(item)), "")
        self.run.count("citas repetidas quitadas")

    def walk_map(self, node, path):
        if path in self.m.id_maps:
            out = {}
            for k, v in node.value:
                kv = construct(k)
                saved = self.chapter
                if path == "cobertura.capitulos":
                    self.chapter = int(kv) if str(kv).strip().isdigit() else kv
                out[kv] = self.walk(v, path + ".<id>")
                self.chapter = saved
            return out
        keys = [k.value for k, _ in node.value if isinstance(k, ScalarNode)]
        if path == RELATION_PATH and "tipo" in keys and "type" not in keys:
            return self.walk_relation(node, path)
        self.stack.append((path, node))
        out = {}
        for k, v in node.value:
            out.update(self.walk_key(k, v, path))
        self.after_map(node, path, out)
        self.stack.pop()
        return out

    def walk_key(self, k, v, path):
        name = construct(k)
        if not isinstance(name, str) or name not in self.m.known:
            self.run.stop(f"{self.where}: la clave «{name}» ({path}) no está en el mapa")
            return {name: construct(v)}
        old = self.m.old_key(name)
        if name in self.m.relation_keys:
            self.run.stop(f"{self.where}: «{name}» fuera de una relación del esquema antiguo ({path})")
            return {name: construct(v)}
        new = self.m.keys.get(old, name)
        if new != name:
            self.put(k, new)
            self.run.count("claves renombradas")
        return {new: self.walk(v, path + "." + old)}

    def walk_scalar(self, node, path):
        v = construct(node)
        enums = self.m.enum_at(path)
        if len(enums) > 1:
            self.run.stop(f"{self.where}: la ruta {path} casa con varios `at`: {[e['field'] for e in enums]}")
            return v
        if enums and v is not None:
            e = enums[0]
            head, sep, rest = str(v).partition(":") if e["prefix"] else (v, "", "")
            if head in e["table"]:
                new = e["table"][head] + (sep + rest if e["prefix"] else "")
            elif head in e["news"]:
                return v
            else:
                self.run.stop(f"{self.where}: el valor «{v}» de {path} no está en el enum {e['field']}")
                return v
            if new != v:
                self.put(node, new)
                self.run.count("valores cerrados renombrados")
            return new
        if isinstance(v, str) and self.m.is_selection(path):
            return self.selection(node, v, path)
        return v

    def selection(self, node, v, path):
        coverage = path.startswith("cobertura.")
        prefix, _, rest = v.partition(":")
        if coverage and prefix in ("relacion", "relation"):
            return self.relation_ref(node, v)
        table = self.m.coverage_prefixes if coverage else self.m.selection_types
        if prefix in table:
            new = f"{table[prefix]}:{rest}"
            if new != v:
                self.put(node, new)
                self.run.count("selecciones y prefijos")
            return new
        if prefix in table.values():
            return v
        self.run.stop(f"{self.where}: el prefijo de «{v}» ({path}) no está en el mapa")
        return v

    def relation_ref(self, node, v):
        refs = self.run.resolve_ref(v, self.book, self.chapter, self.where)
        if not refs or refs == [v]:
            return v
        self.run.note_ref(self.where, self.chapter, v, refs)
        if len(refs) == 1:
            self.put(node, refs[0])
            return refs[0]
        quote = (lambda s: "'" + s.replace("'", "''") + "'") if node.style == "'" else (
            (lambda s: json.dumps(s, ensure_ascii=False)) if node.style == '"' else (lambda s: s))
        if self.run.flow_parent.get(id(node)):
            text = ", ".join(quote(r) for r in refs)
        else:
            col = node.start_mark.column - 2
            text = quote(refs[0]) + "".join("\n" + " " * col + "- " + quote(r) for r in refs[1:])
        self.edit(node.start_mark.index, node.end_mark.index, text, 0)
        return Many(refs)

    # -- una relación del esquema antiguo
    def walk_relation(self, node, path):
        d = construct(node)
        to, rule = self.m.relation_target(d)
        if to is None:
            self.run.stop(f"{self.where}: el tipo de relación «{d.get('tipo')}» no está en el mapa")
            return d
        self.stack.append((path, node))
        out = {}
        for k, v in node.value:
            name = k.value
            if name == "tipo":
                self.put(k, "type")
                self.put(v, to["type"])
                out["type"] = to["type"]
            elif name == "relacion":
                if to.get("word"):
                    self.put(k, "word")
                    self.put(v, to["word"])
                    out["word"] = to["word"]
                elif to.get("caption") is not None:
                    self.put(k, "caption")
                    out["caption"] = construct(v)
                elif to.get("certainty"):
                    self.put(k, "certainty")
                    self.put(v, to["certainty"])
                    out["certainty"] = to["certainty"]
                else:
                    self.delete_key(node, k, v)
            elif name == "relacion_inversa":
                if to.get("inverse_caption") is not None:
                    self.put(k, "inverse_caption")
                    out["inverse_caption"] = construct(v)
                else:
                    self.delete_key(node, k, v)
            else:
                out.update(self.walk_key(k, v, path))
        if to.get("certainty") and "relacion" not in d:
            self.run.stop(f"{self.where}: la regla pone certainty a una relación sin «relacion»")
        self.after_map(node, path, out)
        self.stack.pop()
        self.run.note_relation(self.where, d, to, rule)
        return out

    # -- lo que se añade al salir de un objeto
    def after_map(self, node, path, out):
        if self.mode != "data":
            return
        kind = NESTED.get(path)
        if kind and not any(k in out for k in DATE_KEYS):
            if kind == "file":
                container = self.stack[0][1]
            else:
                container = next((n for p, n in reversed(self.stack) if p == "calendario.meses[]"), None)
            date_node = None
            for k, v in (container.value if container is not None else []):
                if isinstance(k, ScalarNode) and k.value in DATE_KEYS:
                    date_node = v
            if date_node is None:
                self.run.stop(f"{self.where}: un hecho anidado en {path} no tiene fecha que copiar")
                return
            text = self.text[date_node.start_mark.index:date_node.end_mark.index]
            if self.run.baseline:
                month = construct(container).get("id") if kind == "month" else None
                old = self.run.baseline.lookup(self.root, self.stem, path, month, construct(node))
                if old is not None:
                    self.run.count("checked_on tomado de P")
                    text = old
            self.insert_key(node, "checked_on", text)
            out["checked_on"] = yaml.load(f"x: {text}", Loader=LOADER)["x"]
            self.run.count(f"checked_on en {path}")
        if path == "eventos" and self.stack and self.stack[0][1] is node:
            self.type_event(node, out)

    def type_event(self, node, out):
        eid = self.doc.get("id") or self.stem
        spec = self.m.events.get(eid)
        if not spec:
            return
        etype, roles_spec, who = spec
        people = self.doc.get("personas") or self.doc.get("people") or []
        if who != "first_of_people" or not people:
            self.run.unmapped(f"{self.where}: el mapa tipa el suceso y no tiene una primera persona")
            return
        roles = {}
        for pid, role in roles_spec.items():
            roles[people[0] if pid == "__first__" else pid] = role
        for pid in roles:
            if pid not in people:
                self.run.unmapped(f"{self.where}: el papel de «{pid}» es de alguien que no está en people")
                return
        has_type, has_roles = "type" in out, "roles" in out
        if has_type or has_roles:
            if (has_type and out["type"] != etype) or (has_roles and out["roles"] != roles):
                self.run.unmapped(f"{self.where}: ya lleva type o roles distintos de los del mapa; no se tocan")
            if has_type and has_roles:
                return
        text = ""
        if not has_type:
            text += f"type: {etype}\n"
            out["type"] = etype
        if not has_roles:
            text += "roles:\n" + "".join(f"  {pid}: {role}\n" for pid, role in roles.items())
            out["roles"] = roles
        anchor = next((v for k, v in node.value if isinstance(k, ScalarNode) and k.value in ("personas", "people")),
                      node.value[-1][1])
        pos = self.line_end(last_index(anchor))
        pre = "" if pos == 0 or self.text[pos - 1] == "\n" else "\n"
        self.edit(pos, pos, pre + text, 1)
        self.run.count("sucesos tipados")
        self.run.report["events"].append({"file": self.run.new_path(self.where), "type": etype, "roles": roles})


# ---------------------------------------------------------------- P, para las ramas de libro

class Baseline:
    def __init__(self, src, repo):
        p = Path(src)
        self.tmp = None
        if p.is_dir():
            self.data = p / "data" if (p / "data").is_dir() and not (p / "personas").is_dir() else p
        else:
            self.tmp = tempfile.TemporaryDirectory()
            try:
                top = subprocess.run(["git", "-C", str(repo), "rev-parse", "--show-toplevel"], capture_output=True,
                                     text=True, check=True).stdout.strip()
                tar = subprocess.run(["git", "-C", top, "archive", "--format=tar", src, "data"],
                                     capture_output=True, check=True).stdout
            except (subprocess.CalledProcessError, FileNotFoundError) as e:
                raise Stop(f"--baseline {src}: no es una carpeta ni un ref de git de {repo} ({e})")
            with tarfile.open(fileobj=io.BytesIO(tar)) as t:
                t.extractall(self.tmp.name, filter="data")
            self.data = Path(self.tmp.name) / "data"
        self.cache = {}

    def doc(self, root, stem):
        k = (root, stem)
        if k not in self.cache:
            path = self.data / (f"{root}.yaml" if root == "calendario" else f"{root}/{stem}.yaml")
            self.cache[k] = load(path) if path.exists() else None
        return self.cache[k]

    def lookup(self, root, stem, path, month, fact):
        d = self.doc(root, stem)
        if not isinstance(d, dict):
            return None
        field = path.rsplit(".", 1)[-1].rstrip("[]")
        if month is not None:
            d = next((m for m in d.get("meses") or [] if isinstance(m, dict) and m.get("id") == month), None)
            if d is None:
                return None
        if fact in (d.get(field) or []) and d.get("consultado"):
            return f"'{iso(d['consultado'])}'"
        return None


# ---------------------------------------------------------------- la migración

class Migration:
    def __init__(self, data, model, root=None, baseline=None, decisions_dir=None):
        self.data = Path(data)
        self.model = model
        self.root = Path(root) if root else None
        self.baseline = baseline
        self.decisions_dir = Path(decisions_dir) if decisions_dir else None
        self.stops, self.unmapped_list = [], []
        self.counts = collections.Counter()
        self.report = fresh_report()
        self.index = {}
        self.redirects = []
        self._plain = {}
        self._citer = None
        self.flow_parent = {}

    # -- avisos
    def stop(self, msg):
        if msg not in self.stops:
            self.stops.append(msg)

    def unmapped(self, msg):
        if msg not in self.unmapped_list:
            self.unmapped_list.append(msg)

    def count(self, what, n=1):
        self.counts[what] += n

    def plain_ok(self, s):
        if s not in self._plain:
            try:
                self._plain[s] = yaml.load(f"x: {s}\n", Loader=LOADER) == {"x": s} and "#" not in s
            except yaml.YAMLError:
                self._plain[s] = False
        return self._plain[s]

    def new_path(self, rel):
        parts = Path(rel).parts
        if len(parts) > 1:
            return "/".join((self.model.data_dirs.get(parts[0], parts[0]),) + parts[1:])
        stem = Path(rel).stem
        return f"{self.model.data_files.get(stem, stem)}.yaml"

    # -- notas para el informe
    def note_relation(self, where, d, to, rule):
        old = f"{d.get('tipo')}/{d.get('relacion')}" + (f" <- {d.get('relacion_inversa')}"
                                                         if d.get("relacion_inversa") is not None else "")
        new = to["type"] + "/" + str(to.get("word") or to.get("caption") or to.get("certainty") or "-")
        self.report["relations"]["by_rule"][f"{old} -> {new}"] += 1
        self.count("relaciones reescritas")
        target = d.get("persona") or d.get("lugar")
        entry = {"file": self.new_path(where), "target": target, "from": {k: d.get(k) for k in
                 ("tipo", "relacion", "relacion_inversa") if d.get(k) is not None},
                 "to": {k: v for k, v in to.items() if v is not None}}
        if rule is None:
            self.report["relations"]["fallback"].append(entry)
            self.unmapped(f"{self.new_path(where)}: relación {d.get('tipo')} hacia {target} con «{d.get('relacion')}»"
                          f" sin regla: pasa a caption (unlisted_caption)")
            return
        notes = []
        if d.get("relacion") is not None and not any(to.get(k) for k in ("word", "caption", "certainty")):
            notes.append("la palabra se quita: el tipo lo dice")
        if to.get("certainty"):
            notes.append("la palabra pasa a certainty")
        if rule.get("reversed"):
            notes.append("reversed: la palabra dice lo mismo desde el destino")
        if d.get("relacion_inversa") is not None and to.get("inverse_caption") is None:
            notes.append("se quita relacion_inversa: la inversa sale del vocabulario")
        if to["type"] != self.model.relation_types.get(d.get("tipo")):
            notes.append(f"cambia de tipo: {d.get('tipo')} -> {to['type']}")
        if notes:
            entry["note"] = "; ".join(notes)
            self.report["relations"]["changed"].append(entry)

    def note_ref(self, where, chapter, old, new):
        self.count("citas de la cobertura reescritas")
        if len(new) > 1:
            self.count("citas partidas en varios tramos")
        self.report["references"].append({"file": self.new_path(where), "chapter": chapter, "from": old,
                                          "to": new[0] if len(new) == 1 else new})

    # -- índice de relaciones y citas
    def build_index(self, docs):
        self.index = {}
        for rel, d in docs.items():
            parts = Path(rel).parts
            if len(parts) != 2 or self.model.root_old.get(parts[0]) != "personas" or not isinstance(d, dict):
                continue
            rels = d.get("relaciones", d.get("relations")) or []
            self.index[Path(rel).stem] = [Rel(self.model, Path(rel).stem, i, r) for i, r in enumerate(rels)
                                          if isinstance(r, dict)]
        self._docs = docs

    def citer(self):
        if self._citer is None:
            books, sources = [], {}
            for rel, d in self._docs.items():
                parts = Path(rel).parts
                if len(parts) == 1 and self.model.root_old.get(Path(rel).stem) == "libros" and isinstance(d, dict):
                    books = d.get("libros", d.get("books")) or []
                elif len(parts) == 2 and self.model.root_old.get(parts[0]) == "fuentes" and isinstance(d, dict):
                    for fid, s in d.items():
                        sources.setdefault(fid, s)
            scripts = (self.root or ROOT) / "scripts"
            if not ((scripts / "cobertura.py").exists() or (scripts / "bible_coverage.py").exists()):
                scripts = ROOT / "scripts"
            self._citer = ChapterCiter(scripts, books, sources)
        return self._citer

    def resolve_ref(self, ref, book, chapter, where):
        prefix, _, body = ref.partition(":")
        m = self.model
        if prefix == "relacion":
            parts = body.split("/")
            if len(parts) != 3 or not all(parts):
                self.unmapped(f"{self.new_path(where)}: la cita «{ref}» no tiene la forma relacion:<persona>/<tipo>/<otro>")
                return None
            x, t, y = parts
            cands = [r for r in self.index.get(x, []) if r.legacy == t and r.target == y]
            if not cands:
                self.unmapped(f"{self.new_path(where)}: la cita «{ref}» no casa con ninguna relación; se deja")
                return None
            if len(cands) > 1:
                chosen = [r for r in cands if (book, chapter) in self.citer().chapters(r.raw)]
                if not chosen:
                    self.stop(f"{self.new_path(where)} capítulo {chapter}: la cita «{ref}» casa con {len(cands)} "
                              f"relaciones y ninguna cita el capítulo; hay que leer el tramo")
                    return None
                cands = chosen
                self.count("citas con varios tramos resueltas por su capítulo")
        elif prefix == "relation":
            parsed = parse_key(body)
            if parsed is None:
                self.unmapped(f"{self.new_path(where)}: la cita «{ref}» no tiene la forma de una clave")
                return None
            cands = [r for r in self.index.get(parsed[0], []) if matches(m, r, parsed)]
            if not cands:
                row = [r for r in self.redirects if (parse_key(r["from"]) or ())[:3] == parsed[:3]
                       and all(a is None or a == b for a, b in zip(parsed[3:], parse_key(r["from"])[3:]))]
                if len(row) == 1:
                    to = parse_key(row[0]["to"])
                    cands = [r for r in self.index.get(to[0], []) if matches(m, r, to)] if to else []
            if len(cands) != 1:
                self.unmapped(f"{self.new_path(where)}: la cita «{ref}» casa con {len(cands)} relaciones; se deja")
                return None
        else:
            return None
        out = []
        for r in cands:
            c = canonical(m, r, self.index.get(r.file, []))
            if c is None:
                self.unmapped(f"{self.new_path(where)}: la cita «{ref}» no tiene forma que case con una sola relación")
                return None
            out.append(c)
        return out

    # -- una pasada sobre todos los ficheros
    def files(self):
        out = []
        for p in sorted(self.data.rglob("*.yaml")):
            rel = p.relative_to(self.data)
            if rel.name == "vocabulary.yaml" and len(rel.parts) == 1:
                continue
            out.append(str(rel))
        return out

    def root_of(self, rel):
        parts = Path(rel).parts
        name = parts[0] if len(parts) > 1 else Path(rel).stem
        old = self.model.root_old.get(name)
        if old is None or (len(parts) > 1) != (name in self.model.data_dirs or name in self.model.data_dirs.values()):
            self.stop(f"{rel}: {'la carpeta' if len(parts) > 1 else 'el fichero'} «{name}» no está en el mapa")
            return None
        return old

    def first_line(self, text):
        """Las rutas de las líneas de comentario (la primera, y cualquier otra que nombre una ruta). Solo rutas y
        nombres de script: la prosa del comentario no se toca."""
        out = []
        for line in text.splitlines(keepends=True):
            if line.lstrip().startswith("#"):
                line = rewrite_paths(self.model, line, scripts=True, flags=False)
            out.append(line)
        return "".join(out)

    def one_pass(self, texts):
        docs = {}
        for rel, t in texts.items():
            try:
                docs[rel] = yaml.load(t, Loader=LOADER)
            except yaml.YAMLError as e:
                self.stop(f"{rel}: no es YAML válido ({e})")
        self.build_index(docs)
        out, lines = {}, {}
        for rel, text in texts.items():
            root = self.root_of(rel)
            if root is None or rel not in docs:
                continue
            rw = Rewriter(self, text, rel, root, Path(rel).stem)
            try:
                node, want = rw.go()
            except yaml.YAMLError as e:
                self.stop(f"{rel}: no es YAML válido ({e})")
                continue
            if node is None:
                continue
            try:
                new, added, removed = rw.result()
            except Stop as e:
                self.stop(str(e))
                continue
            new = self.first_line(new)
            if new == text and docs[rel] != want:
                self.stop(f"{rel}: la migración quería cambiarlo y no hay ningún cambio de texto")
            if new != text:
                try:
                    got = yaml.load(new, Loader=LOADER)
                except yaml.YAMLError as e:
                    self.stop(f"{rel}: la reescritura no es YAML válido ({e})")
                    continue
                if got != want:
                    self.stop(f"{rel}: la reescritura no dice lo que la migración quería; no se escribe")
                    continue
                out[rel] = new
                if added or removed:
                    lines[rel] = (added, removed)
        return out, lines

    # -- decisiones
    def load_decisions(self):
        if not self.decisions_dir or not self.decisions_dir.is_dir():
            return []
        out = []
        for p in sorted(self.decisions_dir.glob("*.yaml")):
            d = load(p)
            if not isinstance(d, dict) or d.get("format") != DECISIONS_FORMAT:
                self.stop(f"{p.name}: format no es {DECISIONS_FORMAT}")
                continue
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", iso(d.get("checked_on") or "")):
                self.stop(f"{p.name}: checked_on tiene que ser un día AAAA-MM-DD")
                continue
            for i, e in enumerate(d.get("entries") or []):
                out.append((f"{p.name} entries[{i}]", d.get("decision"), iso(d["checked_on"]), e))
        return out

    def known_sources(self, docs):
        ids, slugs = set(), {}
        for rel, d in docs.items():
            parts = Path(rel).parts
            if len(parts) == 2 and self.model.root_old.get(parts[0]) == "fuentes" and isinstance(d, dict):
                ids |= set(d)
            if len(parts) == 1 and self.model.root_old.get(Path(rel).stem) == "libros" and isinstance(d, dict):
                for b in d.get("books", d.get("libros")) or []:
                    slugs[b.get("slug")] = int(b.get("chapters", b.get("capitulos")) or 0)
        return ids, slugs

    def apply_decisions(self, texts):
        """texts: {ruta antigua: texto ya migrado}. Devuelve los textos cambiados."""
        entries = self.load_decisions()
        if not entries:
            return {}
        docs = {rel: yaml.load(t, Loader=LOADER) for rel, t in texts.items()}
        ids, slugs = self.known_sources(docs)
        by_new = {}
        for rel in texts:
            parts = Path(rel).parts
            if len(parts) == 2:
                by_new[f"{self.model.data_dirs.get(parts[0], parts[0])}/{Path(rel).stem}"] = rel
        changed, unions = {}, []
        for where, code, day, e in entries:
            err = check_entry(e, ids, slugs)
            if err:
                self.stop(f"{where}: {err}")
                continue
            rel = by_new.get(e["file"])
            if rel is None:
                self.stop(f"{where}: el fichero {e['file']} no existe")
                continue
            text = changed.get(rel, texts[rel])
            try:
                new, did = apply_entry(self.model, text, Path(rel).stem, e, day)
            except Stop as x:
                self.stop(f"{where}: {x}")
                continue
            if did.get("redirect"):
                self.redirects.append(did["redirect"])
                self.report["redirects"].append(did["redirect"])
                # La copia que queda se lleva las fuentes de la que se quita, también las que la entrada no nombra
                # porque llegaron después (una rama de libro fusionada): así ninguna fuente se pierde al quitar.
                # Se une al final, cuando ya están todas las entradas: la que queda puede añadirse después.
                target = parse_key(e["redirect_to"])
                trel = by_new.get(f"people/{target[0]}") if target else None
                if trel is None:
                    self.stop(f"{where}: redirect_to «{e['redirect_to']}» no es una clave de una ficha que exista")
                    continue
                unions.append((where, trel, target[0], e["redirect_to"], did.get("dropped_sources") or [], day))
            self.report["decisions"].append({"entry": where, "decision": code, "file": e["file"],
                                             "changed": new != text, "what": did.get("what"),
                                             "sources": e["sources"], "reason": e["reason"]})
            if new != text:
                changed[rel] = new
                self.count("decisiones aplicadas")
        for where, trel, stem, key, sources, day in unions:
            text = changed.get(trel, texts[trel])
            try:
                new, _ = union_sources(self.model, text, stem, key, sources, day)
            except Stop as x:
                self.stop(f"{where}: {x}")
                continue
            if new != text:
                changed[trel] = new
                self.count("fuentes unidas a la relación que queda")
        return changed

    # -- todo
    def plan(self):
        """Calcula todo sin escribir: ({ruta antigua: texto nuevo}, renombres, líneas)."""
        texts = {rel: (self.data / rel).read_text(encoding="utf-8") for rel in self.files()}
        new1, lines = self.one_pass(texts)
        if self.stops:
            return {}, [], {}
        merged = dict(texts)
        merged.update(new1)
        dec = self.apply_decisions(merged)
        if self.stops:
            return {}, [], {}
        merged.update(dec)
        # Segunda pasada, sobre lo ya migrado. Sin decisiones no puede cambiar nada (es la prueba de que la
        # migración es idempotente); con ellas, solo reescribe las citas de las relaciones que movieron.
        saved_counts, saved_report = self.counts, self.report
        self.counts = collections.Counter()
        self.report = fresh_report()
        new2, _ = self.one_pass(merged)
        counts2, refs2 = self.counts, self.report["references"]
        self.counts, self.report = saved_counts, saved_report
        self.report["references"] += refs2
        self.counts["citas reescritas tras las decisiones"] += counts2.get("citas de la cobertura reescritas", 0)
        if not dec and (new2 or counts2):
            self.stop(f"la migración no es idempotente: una segunda pasada cambiaría {sorted(new2)[:5]} "
                      f"{dict(counts2)}")
        if self.stops:
            return {}, [], {}
        merged.update(new2)
        final = {rel: t for rel, t in merged.items() if t != texts[rel]}
        return final, self.renames(), lines

    def renames(self):
        out = []
        for old, new in self.model.data_dirs.items():
            if old == new:
                continue
            a, b = self.data / old, self.data / new
            if a.exists() and b.exists():
                self.stop(f"no puedo renombrar {old} a {new}: existen las dos carpetas")
            elif a.exists():
                out.append((a, b))
        for old, new in self.model.data_files.items():
            a, b = self.data / f"{old}.yaml", self.data / f"{new}.yaml"
            if a.exists() and b.exists():
                self.stop(f"no puedo renombrar {old}.yaml a {new}.yaml: existen los dos")
            elif a.exists():
                out.append((a, b))
        return out


def fresh_report():
    return {"relations": {"by_rule": collections.Counter(), "changed": [], "fallback": []},
            "references": [], "events": [], "decisions": [], "redirects": []}


def mark_flow(node, out):
    """{id(escalar): True} de los escalares que son elementos de una lista en línea."""
    if isinstance(node, SequenceNode):
        for item in node.value:
            if node.flow_style and isinstance(item, ScalarNode):
                out[id(item)] = True
            mark_flow(item, out)
    elif isinstance(node, MappingNode):
        for k, v in node.value:
            mark_flow(v, out)


# ---------------------------------------------------------------- aplicar una decisión

ENTRY_KEYS = {"file", "relation", "set", "unset", "add", "remove", "redirect_to", "sources", "reason"}
COVERAGE_ENTRY_KEYS = {"file", "chapter", "span", "entities", "mentions", "sources", "reason"}


def check_entry(e, ids, slugs):
    if not isinstance(e, dict):
        return "una entrada tiene que ser un objeto"
    coverage = "chapter" in e
    extra = set(e) - (COVERAGE_ENTRY_KEYS if coverage else ENTRY_KEYS)
    if extra:
        return f"claves que no existen: {sorted(extra)}"
    if not isinstance(e.get("file"), str) or e["file"].count("/") != 1:
        return "file tiene que ser <carpeta>/<id>"
    ops = []
    if coverage:
        if not e["file"].startswith("coverage/"):
            return "chapter solo vale en un fichero de coverage/"
        if not isinstance(e.get("chapter"), int) or e.get("span") in (None, ""):
            return "una entrada de cobertura lleva chapter (un número) y span (el v del tramo)"
        refs = [*(e.get("entities") or []), *(e.get("mentions") or [])]
        if not refs or not all(isinstance(x, str) and ":" in x for x in refs):
            return "una entrada de cobertura lleva entities o mentions, cada una <prefijo>:<id>"
    else:
        ops = [k for k in ("set", "unset", "add", "remove") if e.get(k)]
        if not ops or ("add" in ops and len(ops) > 1) or ("remove" in ops and len(ops) > 1):
            return "lleva set y unset, o add, o remove"
    if "remove" in ops and not e.get("relation"):
        return "remove necesita relation"
    if "remove" in ops and not e.get("redirect_to"):
        return "remove necesita redirect_to, la clave que queda"
    srcs = e.get("sources")
    if not isinstance(srcs, list) or not srcs:
        return "sources es una lista no vacía"
    for s in srcs:
        m = re.match(r"^(.+)-(\d+)$", str(s))
        if s not in ids and not (m and m.group(1) in slugs and 1 <= int(m.group(2)) <= slugs[m.group(1)]):
            return f"la fuente «{s}» no existe"
    reason = e.get("reason")
    if not isinstance(reason, str) or not reason.strip():
        return "reason es obligatorio"
    if len(reason.split()) > 40:
        return f"reason tiene {len(reason.split())} palabras; el máximo es 40"
    return None


def _spans(text, seq):
    """[(inicio, fin)] del texto de cada elemento de una lista en bloque."""
    def ls(i):
        return text.rfind("\n", 0, i) + 1

    def le(i):
        if i > 0 and text[i - 1] == "\n":
            return i
        j = text.find("\n", i)
        return len(text) if j < 0 else j + 1
    out = []
    for n, item in enumerate(seq.value):
        start = ls(item.start_mark.index)
        end = ls(seq.value[n + 1].start_mark.index) if n + 1 < len(seq.value) else le(last_index(item))
        out.append((start, end))
    return out


def _indent(block, col):
    return "".join((" " * col + ln) if ln.strip() else ln for ln in block.splitlines(keepends=True))


def _merge_sources(fact, sources):
    fact["sources"] = list(fact.get("sources") or [])
    fact["sources"] += [s for s in sources if s not in fact["sources"]]


def apply_coverage_entry(text, e):
    """Añade referencias a entities o mentions de un tramo de la cobertura, en su sitio y sin tocar lo demás. El tramo
    se nombra por su capítulo y su `v`. Una referencia que el tramo ya lleva se salta."""
    root = yaml.compose(text, Loader=LOADER)
    top = {k.value: v for k, v in root.value}
    chapters = top.get("chapters")
    cap = next((v for k, v in (chapters.value if isinstance(chapters, MappingNode) else [])
                if str(k.value) == str(e["chapter"])), None)
    spans = next((v for k, v in cap.value if k.value == "spans"), None) if isinstance(cap, MappingNode) else None
    found = [t for t in (spans.value if isinstance(spans, SequenceNode) else [])
             if isinstance(t, MappingNode) and any(k.value == "v" and str(v.value) == str(e["span"]) for k, v in t.value)]
    if len(found) != 1:
        raise Stop(f"el capítulo {e['chapter']} no tiene un tramo con v {e['span']}")
    span = found[0]
    fields = {k.value: v for k, v in span.value}
    edits, added = [], []
    for field in ("entities", "mentions"):
        want = [x for x in e.get(field) or []]
        node = fields.get(field)
        have = [x.value for x in node.value] if isinstance(node, SequenceNode) else []
        new = [x for x in dict.fromkeys(want) if x not in have]
        if not new:
            continue
        added += new
        if isinstance(node, SequenceNode) and node.flow_style:
            end = node.end_mark.index - 1                       # justo antes de «]»
            edits.append((end, (", " if node.value else "") + ", ".join(new)))
        elif node is None and span.flow_style:
            end = span.end_mark.index - 1                       # justo antes de «}»
            edits.append((end, f", {field}: [{', '.join(new)}]"))
        else:
            raise Stop(f"el tramo {e['span']} del capítulo {e['chapter']} no está escrito en línea")
    if not edits:
        return text, {"what": "ya lo cita"}
    for pos, ins in sorted(edits, reverse=True):
        text = text[:pos] + ins + text[pos:]
    return text, {"what": "cita " + ", ".join(added)}


def apply_entry(model, text, stem, e, day):
    if "chapter" in e:
        return apply_coverage_entry(text, e)
    root = yaml.compose(text, Loader=LOADER)
    doc = construct(root)
    top = {k.value: (k, v) for k, v in root.value}
    if e.get("relation") or e.get("add"):
        if "relations" not in top and not e.get("add"):
            raise Stop("el fichero no tiene relations")
        seq = top.get("relations", (None, None))[1]
        rels = [Rel(model, stem, i, r) for i, r in enumerate(doc.get("relations") or [])]
        if e.get("add"):
            new = dict(e["add"])
            new.setdefault("checked_on", day)
            _merge_sources(new, e["sources"])
            r = Rel(model, stem, len(rels), new)
            if any(full_key(model, x) == full_key(model, r) for x in rels):
                return text, {"what": f"ya existe {full_key(model, r)}"}
            block = dump([new])
            if seq is None:
                pre = "" if text.endswith("\n") else "\n"
                return text + pre + "relations:\n" + block, {"what": f"añade {full_key(model, r)}"}
            if not seq.value:                        # relations: [] pasa a ser una lista en bloque
                k = top["relations"][0]
                s = text.rfind("\n", 0, k.start_mark.index) + 1
                t = text.find("\n", seq.end_mark.index)
                t = len(text) if t < 0 else t + 1
                return text[:s] + "relations:\n" + block + text[t:], {"what": f"añade {full_key(model, r)}"}
            col = seq.value[0].start_mark.column - 2 if seq.value else 0
            end = _spans(text, seq)[-1][1]
            pre = "" if end == 0 or text[end - 1] == "\n" else "\n"
            return text[:end] + pre + _indent(block, col) + text[end:], {"what": f"añade {full_key(model, r)}"}
        parsed = parse_key(e["relation"])
        if parsed is None or parsed[0] != stem:
            raise Stop(f"relation «{e['relation']}» no es una clave de {stem}")
        found = [r for r in rels if matches(model, r, parsed)]
        if e.get("remove"):
            if not found:
                return text, {"what": "ya no está"}
            if len(found) > 1:
                raise Stop(f"relation «{e['relation']}» casa con {len(found)} relaciones")
            r = found[0]
            s, t = _spans(text, seq)[r.i]
            redirect = {"from": full_key(model, r), "to": e["redirect_to"], "removed_on": day, "reason": e["reason"]}
            what = {"what": f"quita {full_key(model, r)}", "redirect": redirect,
                    "dropped_sources": list(r.raw.get("sources") or [])}
            if len(seq.value) == 1:                  # la lista se queda vacía: relations: []
                k = top["relations"][0]
                s = text.rfind("\n", 0, k.start_mark.index) + 1
                return text[:s] + "relations: []\n" + text[t:], what
            return text[:s] + text[t:], what
        if len(found) > 1 and e.get("set"):         # ya aplicada: la que lleva lo que pone es la de la entrada
            found = [r for r in found if all(r.raw.get(k) == v for k, v in e["set"].items())] or found
        if len(found) != 1:
            raise Stop(f"relation «{e['relation']}» casa con {len(found)} relaciones")
        r = found[0]
        item = copy.deepcopy(r.raw)
        before = copy.deepcopy(item)
        for k, v in (e.get("set") or {}).items():
            item[k] = v
        for k in e.get("unset") or []:
            item.pop(k, None)
        if item != before:
            _merge_sources(item, e["sources"])
            item["checked_on"] = day
            if "status" in item:                     # checked_on y status siguen al final
                item["status"] = item.pop("status")
        if item == before:
            return text, {"what": "nada que cambiar"}
        s, t = _spans(text, seq)[r.i]
        col = seq.value[r.i].start_mark.column - 2
        return text[:s] + _indent(dump([item]), col) + text[t:], {"what": f"cambia {full_key(model, r)}"}
    # campos del fichero
    new = dict(doc)
    for k, v in (e.get("set") or {}).items():
        new[k] = v
    for k in e.get("unset") or []:
        new.pop(k, None)
    if new == doc:
        return text, {"what": "nada que cambiar"}
    _merge_sources(new, e["sources"])
    new["checked_on"] = day
    return rewrite_top(text, root, doc, new), {"what": "cambia " + ", ".join(sorted((e.get("set") or {}).keys())
                                                                            + sorted(e.get("unset") or []))}


def union_sources(model, text, stem, key, sources, day):
    """Une `sources` a las de la relación `key` de la ficha, en su sitio. Si gana alguna, su checked_on pasa al día de
    la decisión. La relación tiene que existir: es la que queda de un par o la que recibe una relación movida."""
    root = yaml.compose(text, Loader=LOADER)
    doc = construct(root)
    top = {k.value: (k, v) for k, v in root.value}
    seq = top.get("relations", (None, None))[1]
    rels = [Rel(model, stem, i, r) for i, r in enumerate(doc.get("relations") or [])]
    parsed = parse_key(key)
    found = [r for r in rels if matches(model, r, parsed)] if parsed else []
    if len(found) != 1:
        raise Stop(f"la clave que queda «{key}» casa con {len(found)} relaciones")
    r = found[0]
    missing = [x for x in sources if x not in (r.raw.get("sources") or [])]
    if not missing:
        return text, False
    item = copy.deepcopy(r.raw)
    _merge_sources(item, missing)
    item["checked_on"] = day
    if "status" in item:
        item["status"] = item.pop("status")
    s, t = _spans(text, seq)[r.i]
    col = seq.value[r.i].start_mark.column - 2
    return text[:s] + _indent(dump([item]), col) + text[t:], True


def rewrite_top(text, root, old, new):
    """Reescribe solo las claves de primer nivel que cambian. Una clave nueva va tras `people` si es type o roles de
    un suceso, y si no, antes de `sources`."""
    def ls(i):
        return text.rfind("\n", 0, i) + 1
    pairs = root.value
    spans = {}
    for n, (k, v) in enumerate(pairs):
        start = ls(k.start_mark.index)
        end = ls(pairs[n + 1][0].start_mark.index) if n + 1 < len(pairs) else len(text)
        spans[k.value] = (start, end)
    edits = []
    for k in old:
        if k not in new:
            edits.append((*spans[k], ""))
        elif new[k] != old[k]:
            edits.append((*spans[k], dump({k: new[k]})))
    added = [k for k in new if k not in old]
    if added:
        if set(added) <= {"type", "roles"} and "people" in spans:
            pos = spans["people"][1]
        elif "sources" in spans:
            pos = spans["sources"][0]
        else:
            pos = len(text)
        edits.append((pos, pos, dump({k: new[k] for k in added})))
    for s, e_, t in sorted(edits, key=lambda x: (x[0], x[1]), reverse=True):
        text = text[:s] + t + text[e_:]
    return text


# ---------------------------------------------------------------- rutas y opciones en textos

def rewrite_paths(model, text, scripts=True, flags=True):
    m = model.map
    pairs = [(o, n) for o, n in list(m["directories"].items()) + list(m["files"].items()) if o != n]
    if scripts:
        pairs += [(o, n) for o, n in m["scripts"].items() if o != n]
    # También las formas relativas que conservan una barra: «videos/nombres/» desde scripts/README.md.
    for o, n in list(pairs):
        a, b = o.split("/"), n.split("/")
        for i in range(1, len(a) - 1):
            if a[:i] == b[:i]:
                pairs.append(("/".join(a[i:]), "/".join(b[i:])))
    for old, new in sorted(set(pairs), key=lambda p: (-len(p[0]), p[0])):
        text = re.sub(rf"(?<![\w-]){re.escape(old)}(?![\w-])", new, text)
    if scripts:
        for old, new in sorted(m["scripts"].items(), key=lambda p: -len(p[0])):
            a, b = Path(old).name, Path(new).name
            if a != b:
                text = re.sub(rf"(?<![\w.-]){re.escape(a)}(?![\w-])", b, text)
    if flags:
        for old, new in m["flags"].items():
            if old != new:
                text = re.sub(rf"(?<![\w-]){re.escape(old)}(?![\w-])", new, text)
    return text


# ---------------------------------------------------------------- el checkout entero

def checkout_steps(model, root, run):
    """Scripts, carpetas de scripts/videos/, su configuración y los ficheros de `references`. [(ruta, texto)] y
    [(de, a)] de lo que haría."""
    writes, moves = [], []
    m = model.map
    for old, new in list(m["scripts"].items()) + [(o, n) for o, n in m["directories"].items()
                                                  if not o.startswith("data/")]:
        if old == new:
            continue
        a, b = root / old, root / new
        if a.exists() and b.exists():
            run.unmapped(f"{old} y {new} existen los dos; no se renombra")
        elif a.exists():
            moves.append((a, b))
    for sub in ("nombres", "personas", "place_names", "people_names"):
        d = root / "scripts" / "videos" / sub
        for p in sorted(d.glob("*.yaml")) if d.is_dir() else []:
            text = p.read_text(encoding="utf-8")
            new = video_config(model, text, str(p.relative_to(root)), run)
            new = run.first_line(new)
            if new != text:
                writes.append((p, new))
    done = {str(a.relative_to(root)): str(b.relative_to(root)) for a, b in moves}
    for rel in m["references"]["rewrite"]:
        if " " in rel:
            continue                                  # las dos entradas que describen, no nombran un fichero
        now = root / rel
        if not now.exists():
            before = next((a for a, b in done.items() if b == rel), None)
            now = root / before if before else now
        if not now.exists():
            for o, n in list(m["directories"].items()):
                if rel.startswith(n + "/") and (root / (o + rel[len(n):])).exists():
                    now = root / (o + rel[len(n):])
        if not now.exists():
            run.unmapped(f"{rel}: está en references y no existe")
            continue
        text = now.read_text(encoding="utf-8")
        new = rewrite_paths(model, text)
        if new != text:
            writes.append((now, new))
    red = root / "scripts" / "migration" / "redirects.yaml"
    if not red.exists():
        rows = run.redirects
        writes.append((red, "# biblical-earth: claves de relación que desaparecen y la que queda. Una fila por clave: "
                            "{from, to, removed_on, reason}.\n# Formato en docs/investigacion/modelo.md, sección 5. "
                            "Lo leen apply.py y bible_coverage.py.\n" + (dump(rows) if rows else "[]\n")))
    return writes, moves


def video_config(model, text, where, run):
    node = yaml.compose(text, Loader=LOADER)
    if not isinstance(node, MappingNode):
        return text
    rw = Rewriter(run, text, where, "videos-config", Path(where).stem, mode="video")
    for _, v in node.value:
        if not isinstance(v, MappingNode):
            continue
        for k, x in v.value:
            name = k.value
            if name in model.video_keys:
                rw.put(k, model.video_keys[name])
            elif name not in model.video_keys.values():
                run.stop(f"{where}: la clave «{name}» no está en video_config_keys")
            if name in ("acentos", "accents") and isinstance(x, ScalarNode):
                if x.value in model.video_values:
                    rw.put(x, model.video_values[x.value])
                elif x.value not in model.video_values.values():
                    run.stop(f"{where}: el valor «{x.value}» de acentos no está en el mapa")
    new, _, _ = rw.result()
    return new


# ---------------------------------------------------------------- propuestas

def translate_proposal(p, run):
    """La propuesta `p` (formato 1) con lo que lleva de una ficha en inglés. El sobre no cambia (sección 15)."""
    m = run.model
    out = copy.deepcopy(p)
    rtypes = {v: k for k, v in m.proposal_types.items()}
    extra = collections.defaultdict(list)
    for ch in out.get("cambios") or []:           # las relaciones que trae la propuesta también se pueden citar
        tipo = rtypes.get(ch.get("tipo"), ch.get("tipo"))
        if tipo != "personas":
            continue
        rels = []
        if ch.get("op") == "crear":
            rels = (ch.get("datos") or {}).get("relaciones") or []
        elif ch.get("op") == "anadir" and m.old_key(ch.get("campo") or "") == "relaciones":
            rels = ch.get("valores") or []
        extra[ch.get("id")] += [r for r in rels if isinstance(r, dict)]
    for pid, rels in extra.items():
        base = run.index.get(pid, [])
        run.index[pid] = base + [Rel(m, pid, len(base) + i, r) for i, r in enumerate(rels)]

    def tr(obj, path):
        text = json.dumps(obj, ensure_ascii=False)
        rw = Rewriter(run, text, f"propuesta {p.get('agente') or ''} {path}".strip(), path.split(".")[0], "",
                      mode="proposal")
        rw.book = p.get("libro")
        node = yaml.compose(text, Loader=LOADER)
        run.flow_parent = {}
        mark_flow(node, run.flow_parent)
        return rw.walk(node, path)

    for ch in out.get("cambios") or []:
        tipo = rtypes.get(ch.get("tipo"), ch.get("tipo"))
        if tipo not in m.proposal_types:
            run.stop(f"propuesta: el tipo «{ch.get('tipo')}» no está en proposal_types")
            continue
        ch["tipo"] = m.proposal_types[tipo]
        if "datos" in ch:
            ch["datos"] = tr(ch["datos"], tipo)
        if "campo" in ch:
            old = m.old_key(ch["campo"])
            if old not in m.keys:
                run.stop(f"propuesta: el campo «{ch['campo']}» no está en el mapa")
                continue
            ch["campo"] = m.keys[old]
            path = f"{tipo}.{old}"
            if "valores" in ch:
                ch["valores"] = tr(ch["valores"], path)
            for k in ("antes", "despues"):
                if k in ch and ch[k] is not None:
                    ch[k] = tr(ch[k], path)
        if ch.get("historial"):
            ch["historial"] = tr(ch["historial"], f"{tipo}.historial[]")
    if out.get("cobertura"):
        out["cobertura"] = tr(out["cobertura"], "cobertura.capitulos")
    if out.get("fuentes"):
        out["fuentes"] = tr(out["fuentes"], "fuentes")
    return out


# ---------------------------------------------------------------- informe y main

def commit_of(repo):
    try:
        return subprocess.run(["git", "-C", str(repo), "rev-parse", "--short=7", "HEAD"], capture_output=True,
                              text=True, check=True).stdout.strip() or None
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def vocabulary_path(data):
    for p in (Path(data) / "vocabulary.yaml", ROOT / "data" / "vocabulary.yaml"):
        if p.exists():
            return p
    raise Stop("no encuentro data/vocabulary.yaml: tráelo de M antes de migrar, o migra con --baseline durante la "
               "fusión con M (sección 15), que lo trae solo")


# Lo que M escribe a mano en data/ y la migración no produce: sin ellos, una rama migrada no acaba con los mismos
# bytes que M. Ruta nueva dentro de data/ -> ruta antigua, si la tiene.
FROM_M = {"vocabulary.yaml": None, "coverage/README.md": "cobertura/README.md"}


def m_files(root, baseline):
    """{ruta nueva en data/: texto de M}. M es el árbol de este script cuando migra otro checkout, o MERGE_HEAD
    cuando migra su propio checkout con --baseline, que es el paso 4 de una rama de libro (sección 15): la fusión
    con M está abierta. En otro caso no hay M que leer y no se trae nada."""
    out = {}
    if Path(root).resolve() != ROOT.resolve():
        for rel in FROM_M:
            p = ROOT / "data" / rel
            if p.exists():
                out[rel] = p.read_text(encoding="utf-8")
        return out
    if not baseline:
        return out
    try:
        subprocess.run(["git", "-C", str(root), "rev-parse", "-q", "--verify", "MERGE_HEAD"], capture_output=True,
                       check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        return out
    for rel in FROM_M:
        r = subprocess.run(["git", "-C", str(root), "show", f"MERGE_HEAD:data/{rel}"], capture_output=True)
        if r.returncode == 0:
            out[rel] = r.stdout.decode("utf-8")
    return out


def from_m_writes(from_m, data, base, run, writes):
    """Pone en data/ lo que M escribe a mano, antes de los renombres: en la carpeta antigua si aún existe. Un fichero
    que la rama cambió respecto a P no se pisa: se lista, para resolverlo a mano (sección 15, paso 3)."""
    out = []
    for rel, text in sorted(from_m.items()):
        old = FROM_M[rel]
        target = data / old if old and (data / Path(old).parent).is_dir() else data / rel
        if old and base is not None and target.exists():
            p_text = base.data / old
            if not p_text.exists() or p_text.read_bytes() != target.read_bytes():
                run.unmapped(f"data/{old}: la rama lo cambió respecto a P; no se trae el de M, resuélvelo a mano")
                continue
        writes[:] = [(p, t) for p, t in writes if p != target]
        if not target.exists() or target.read_text(encoding="utf-8") != text:
            out.append((target, text, f"data/{rel}"))
    return out


def print_summary(run, final, moves, lines, check, writes=(), from_m=()):
    print("MIGRACIÓN" + (" (--check: no se escribe nada)" if check else ""))
    print(f"  ficheros que cambian: {len(final)}; carpetas y ficheros que se renombran: {len(moves)}")
    for path, _ in writes:
        print(f"  fuera de data/, se reescribe: {path}")
    for path in from_m:
        print(f"  se trae de M, escrito a mano: {path}")
    for k, v in sorted(run.counts.items()):
        print(f"  {k}: {v}")
    print(f"  líneas añadidas: {sum(len(a) for a, _ in lines.values())}; "
          f"líneas quitadas: {sum(len(r) for _, r in lines.values())}")
    br = run.report["relations"]["by_rule"]
    if br:
        print("  relaciones por regla:")
        for k, v in sorted(br.items(), key=lambda x: (-x[1], x[0])):
            print(f"    {v:5d}  {k}")
    if run.unmapped_list:
        print(f"\nLO QUE NO SE PUDO MAPEAR ({len(run.unmapped_list)}), que se deja como está:")
        for u in run.unmapped_list:
            print("  " + u)


def repo_path(p, root, data):
    """La ruta de p tal como se escribe en el repositorio (data/lugares), nunca la de esta máquina."""
    p = Path(p)
    if root is not None:
        try:
            return p.relative_to(root).as_posix()
        except ValueError:
            pass
    return (Path("data") / p.relative_to(data)).as_posix()


def build_report(run, commit, final, moves, lines, root=None, data=None):
    rep = run.report
    return {
        "format": REPORT_FORMAT,
        "from_commit": commit,
        "counts": dict(sorted(run.counts.items())),
        "renamed": [{"from": repo_path(a, root, data), "to": repo_path(b, root, data)} for a, b in moves],
        "files_changed": sorted(run.new_path(r) for r in final),
        "relations": {"by_rule": dict(sorted(rep["relations"]["by_rule"].items())),
                      "changed": rep["relations"]["changed"], "fallback": rep["relations"]["fallback"]},
        "references": rep["references"],
        "events": rep["events"],
        "decisions": rep["decisions"],
        "redirects": rep["redirects"],
        "lines": {run.new_path(r): {"added": a, "removed": rm} for r, (a, rm) in sorted(lines.items())},
        "unmapped": run.unmapped_list,
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description="Migra un checkout del esquema antiguo al esquema en inglés.")
    ap.add_argument("--root", help="checkout que se migra entero (por defecto, el de este script)")
    ap.add_argument("--data", help="migra solo esta carpeta de datos (una copia de data/)")
    ap.add_argument("--check", action="store_true", help="no escribe; sale con 1 si algo cambiaría")
    ap.add_argument("--baseline", help="P: ref de git o carpeta data/ del último main en el esquema antiguo")
    ap.add_argument("--decisions", help="carpeta de decisiones (por defecto scripts/migration/decisions)")
    ap.add_argument("--report", help="dónde escribir el informe (con --data no se escribe si no se da)")
    ap.add_argument("--proposal", nargs="+", help="traduce estas propuestas de formato 1 y no migra nada")
    ap.add_argument("--out", help="con --proposal y una sola propuesta: fichero de salida (si no, la salida estándar)")
    a = ap.parse_args(argv)

    root = Path(a.root).resolve() if a.root else ROOT
    data = Path(a.data).resolve() if a.data else root / "data"
    whole = not a.data
    from_m = m_files(root, a.baseline) if whole and not a.proposal else {}
    try:
        if "vocabulary.yaml" in from_m:
            model = Model(MAP_PATH, vocabulary=yaml.load(from_m["vocabulary.yaml"], Loader=LOADER))
        else:
            model = Model(MAP_PATH, vocabulary_path(data))
        decisions = Path(a.decisions) if a.decisions else (root / "scripts" / "migration" / "decisions"
                                                             if whole else HERE / "decisions")
        repo = root if whole else data
        base = Baseline(a.baseline, repo) if a.baseline else None
        run = Migration(data, model, root=root if whole else None, baseline=base, decisions_dir=decisions)
    except Stop as e:
        print(f"migrate: PARADA: {e}", file=sys.stderr)
        return 2

    if a.proposal:
        texts = {rel: (data / rel).read_text(encoding="utf-8") for rel in run.files()}
        run.build_index({rel: yaml.load(t, Loader=LOADER) for rel, t in texts.items()})
        outs = []
        for path in a.proposal:
            try:
                outs.append(translate_proposal(json.loads(Path(path).read_text(encoding="utf-8")), run))
            except Stop as e:
                run.stop(str(e))
        for u in run.unmapped_list:
            print("sin mapear: " + u, file=sys.stderr)
        if run.stops:
            for s in run.stops:
                print("PARADA: " + s, file=sys.stderr)
            return 2
        text = "\n".join(json.dumps(o, ensure_ascii=False, indent=1) for o in outs) + "\n"
        if a.out:
            Path(a.out).write_text(text, encoding="utf-8")
        else:
            sys.stdout.write(text)
        return 0

    final, moves, lines, writes, more, m_writes = {}, [], {}, [], [], []
    try:
        final, moves, lines = run.plan()
        if whole and not run.stops:
            writes, more = checkout_steps(model, root, run)
            m_writes = from_m_writes(from_m, data, base, run, writes)
    except Stop as e:
        run.stop(str(e))
    if run.stops:
        print("migrate: PARADA, no se ha escrito nada:", file=sys.stderr)
        for s in run.stops:
            print("  " + s, file=sys.stderr)
        return 2
    moves = moves + more
    commit = commit_of(root if whole else data)
    print_summary(run, final, moves, lines, a.check, [(p.relative_to(root), t) for p, t in writes],
                  [r for _, _, r in m_writes])
    writes = writes + [(p, t) for p, t, _ in m_writes]
    something = bool(final or moves or writes)
    if a.check:
        return 1 if something else 0
    if not something:
        print("\nNada que cambiar: los datos ya están en el esquema nuevo.")
        return 0
    for rel, text in sorted(final.items()):
        (data / rel).write_text(text, encoding="utf-8")
    for path, text in writes:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    for src, dst in sorted(moves, key=lambda x: -len(x[0].parts)):
        dst.parent.mkdir(parents=True, exist_ok=True)
        src.rename(dst)
    report = build_report(run, commit, final, moves, lines, root if whole else None, data)
    report["from_m"] = [r for _, _, r in m_writes]
    rpath = Path(a.report) if a.report else (root / "scripts" / "migration" / "reports" / f"{commit or 'sin-commit'}.yaml"
                                             if whole else None)
    if rpath:
        if rpath.exists():
            print(f"\nEl informe {rpath} ya existe y no se pisa.")
        else:
            rpath.parent.mkdir(parents=True, exist_ok=True)
            rpath.write_text(f"# biblical-earth: informe de la migración al esquema en inglés, desde {commit}.\n"
                             + dump(report), encoding="utf-8")
            print(f"\nInforme: {rpath}")
    if run.redirects and not whole:
        print("\nFilas para scripts/migration/redirects.yaml:\n" + dump(run.redirects))
    return 0


if __name__ == "__main__":
    sys.exit(main())
