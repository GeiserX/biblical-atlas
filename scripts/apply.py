#!/usr/bin/env python3
"""El escritor de la cobertura: aplica propuestas de lectura (docs/investigacion/versiculos.md, sección 11) sobre data/.

Uso:  python3 scripts/apply.py [--data DIR] [--dry-run] [--parallel] propuesta.json [...]
      (--seco y --paralelo siguen valiendo como alias hasta que se fusionen las ramas de libro en marcha)

Los datos están en el esquema en inglés (docs/investigacion/modelo.md). Las propuestas siguen en el formato 1, con el
sobre en español. Antes de aplicar una, lo que lleva de una ficha (el valor de `tipo` y de `campo`, y `datos`,
`valores`, `antes`, `despues`, `historial`, `cobertura` y `fuentes`) se traduce con scripts/migration/migrate.py, el
mismo mapa que migró los datos. Una propuesta ya en inglés pasa igual.

Aplica las propuestas de cada libro en orden de capítulo y, dentro de cada una, los cambios en orden:
- crear: ficha nueva, en modo exclusivo. Si la ficha ya existe (u otra persona tiene la misma clave `perspicacia`), se
  funde con ella: las listas se unen sin repetir, una relación con la misma clave junta sus fuentes, un candidato con
  el mismo nombre o el mismo sitio (geometry) también, y un texto distinto se queda como estaba y va al informe.
- Una relación sin date.from junto a otra de la misma terna (type, destino, word u office) con fecha, o al revés, es
  ambigua (modelo.md, sección 6): no se aplica y es un choque.
- anadir: une valores a una lista. cambiar: solo si el valor actual es igual a «antes»; si no, es un choque.
- La clave de una relación es (type, destino, word u office, date.from) (modelo.md, sección 6): un tramo nuevo con
  otra fecha es otra relación, y solo se unen fuentes cuando la clave entera coincide.
- Cada ficha tocada pone `checked_on` al día `leido` de la propuesta. Cada hecho anidado que añade (relación, parada,
  candidato) lleva `checked_on` con ese día, y una relación o un candidato al que se le suma una fuente lo actualiza.
- Un `anadir` de una relación cuya palabra lleva owns: target en el vocabulario no se aplica: se para y dice en qué
  ficha va y con qué palabras.
- Una relación que nombra una clave quitada a mano (scripts/migration/redirects.yaml) llega a la que queda: le suma
  sus fuentes y no se escribe otra vez.
- data/coverage/<libro>.yaml: sustituye solo los capítulos de las propuestas y deja los demás. Cada referencia de
  relación se escribe en su forma canónica tras aplicar: significa la relación con la que casaba cuando se escribió,
  y un tramo nuevo alarga la forma de las que ya lo citaban, también en la cobertura de otros libros.
- data/sources/cobertura-<libro>.yaml: une las fuentes nuevas. Un id que ya existe con otros datos es un error.

Una ficha existente se reescribe clave a clave: solo cambian las líneas de los campos que cambian, y lo escrito se
vuelve a leer para comprobar que dice exactamente lo aplicado.

--parallel: varios libros a la vez. Los ficheros que ya existían no se tocan: sus cambios van, como operaciones, a
data/_proposals/<libro>.json, que la integración aplica después con este mismo script. Las fichas nuevas se crean
con open(ruta, "x"); si otro escritor la creó antes, el `crear` también pasa a operaciones.
--dry-run: no escribe nada; dice qué escribiría.

Código de salida: 0 sin choques, 2 si hubo choques (se aplicó lo demás), 1 si hubo un error (no se escribe nada).
"""
import argparse
import copy
import datetime
import json
import re
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent / "migration"))
import migrate  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
FORMATO = "biblical-earth/propuesta-cobertura/1"
SINGULAR = {"places": "lugar", "people": "persona", "journeys": "viaje", "letters": "carta", "events": "evento",
            "periods": "periodo", "finds": "hallazgo", "tours": "recorrido"}
CLAVE = re.compile(r"^([^\s#\-][^:]*):(?:\s|$)")
# Los hechos anidados que puede traer una propuesta: cada uno lleva su checked_on (modelo.md, sección 4).
NESTED = {("people", "relations"), ("journeys", "stops"), ("places", "candidates")}
REDIRECTS = Path("scripts") / "migration" / "redirects.yaml"
RELATION_REF = re.compile(r"relation:[^\s,\]\}'\"]+")


class Error(Exception):
    pass


def volcar(d):
    return yaml.safe_dump(d, allow_unicode=True, sort_keys=False, width=120, default_flow_style=False)


def _texto(v):
    if isinstance(v, (datetime.date, datetime.datetime)):
        return v.isoformat()[:10]
    if isinstance(v, dict):
        return {k: _texto(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_texto(x) for x in v]
    return v


def cabecera(tipo):
    return f"# biblical-earth: un fichero por {SINGULAR[tipo]}. Esquema en docs/investigacion/README.md.\n"


# ---------------------------------------------------------------- reescribir una ficha sin tocar lo que no cambia

def regiones(texto):
    """[(clave o None, [líneas])]: cada clave de primer nivel con sus líneas (valor, listas y continuaciones)."""
    out = [(None, [])]
    for linea in texto.splitlines(keepends=True):
        m = CLAVE.match(linea)
        if m:
            out.append((m.group(1).strip().strip("'\""), [linea]))
        else:
            out[-1][1].append(linea)
    return out


def list_item_lines(lineas, n):
    """Las líneas de cada elemento de la lista en bloque de una región (clave: y sus elementos «- » en la columna 0):
    [(inicio, fin)] por elemento, más el fin de la lista antes de las líneas en blanco del final. None si la región no
    tiene esa forma o no son n elementos."""
    if not lineas[0].rstrip().endswith(":"):
        return None
    try:
        root = yaml.compose("".join(lineas), Loader=getattr(yaml, "CSafeLoader", yaml.SafeLoader))
    except yaml.YAMLError:
        return None
    seq = root.value[0][1] if root is not None and root.value else None
    if not isinstance(seq, yaml.SequenceNode) or seq.flow_style or len(seq.value) != n:
        return None
    if any(item.start_mark.column != 2 for item in seq.value):
        return None
    fin = len(lineas)
    while fin > 1 and not lineas[fin - 1].strip():      # las líneas en blanco del final siguen al final
        fin -= 1
    starts = [item.start_mark.line for item in seq.value]
    return [(a, b) for a, b in zip(starts, starts[1:] + [fin])], fin


def reescribir(texto, viejo, nuevo):
    """Texto de la ficha con los datos `nuevo`, cambiando solo las regiones de las claves que cambian. En una lista
    en bloque que conserva sus elementos en su sitio, cada elemento igual conserva sus líneas y solo se escriben los
    que cambian y los que se añaden al final."""
    partes = regiones(texto)
    previo = {k: lineas for k, lineas in partes if k is not None}
    out = list(partes[0][1])
    for k, v in nuevo.items():
        antes = viejo.get(k)
        items = (list_item_lines(previo[k], len(antes)) if k in previo and isinstance(v, list)
                 and isinstance(antes, list) and antes and len(v) >= len(antes) else None)
        if k in previo and antes == v:
            out += previo[k]
        elif items:
            lineas = previo[k]
            spans, fin = items
            out += lineas[:spans[0][0]]
            for j, x in enumerate(v):
                if j < len(antes) and antes[j] == x:
                    out += lineas[spans[j][0]:spans[j][1]]
                else:
                    out += volcar([x]).splitlines(keepends=True)
            out += lineas[fin:]
        else:
            out += volcar({k: v}).splitlines(keepends=True)
    texto_nuevo = "".join(out)
    if _texto(yaml.safe_load(texto_nuevo)) != nuevo:
        cab = partes[0][1]
        return "".join(cab) + volcar(nuevo), False
    return texto_nuevo, True


def put_before(d, clave, valor, antes="status"):
    """Pone una clave en `d`, en su sitio, justo antes de `antes` (o al final si no está). Cambia `d` y lo devuelve."""
    if clave in d or antes not in d:
        d[clave] = valor
        return d
    items = list(d.items())
    d.clear()
    for k, v in items:
        if k == antes:
            d[clave] = valor
        d[k] = v
    return d


def con_clave_antes(d, clave, valor, antes="checked_on"):
    """Pone una clave nueva justo antes de `antes` (checked_on y status quedan al final)."""
    return put_before(d, clave, valor, antes)


def without_date(d):
    return {k: v for k, v in d.items() if k != "checked_on"} if isinstance(d, dict) else d


def same_before(actual, antes):
    """«antes» es el valor de la ficha. En una lista de hechos anidados no cuenta el checked_on que la ficha lleva y
    «antes» no: la propuesta se escribió antes de que la migración lo pusiera en cada hecho."""
    if actual == antes:
        return True
    if not (isinstance(actual, list) and isinstance(antes, list) and len(actual) == len(antes)):
        return False
    return all(a == b or (isinstance(a, dict) and isinstance(b, dict) and "checked_on" not in b
                          and without_date(a) == b) for a, b in zip(actual, antes))


# ---------------------------------------------------------------- relaciones: clave y referencias

def relation_key(model, r):
    """La clave de una relación (modelo.md, sección 6): tipo, destino, palabra o cargo según `key_field` del
    vocabulario, y date.from. El caption no entra."""
    date = r.get("date")
    start = date.get("from") if isinstance(date, dict) else None
    field = r.get("office") if model.key_field(r.get("type")) == "office" else r.get("word")
    return (r.get("type"), r.get("person") or r.get("place"), field, start)


class Translator(migrate.Migration):
    """La traducción de una propuesta con migrate.translate_proposal, contra los datos de hoy. Una relación que la
    propuesta trae y que ya estaba con la misma clave se cuenta una vez: si no, ninguna cita casaría con una sola."""

    def resolve_ref(self, ref, book, chapter, where):
        owner = ref.partition(":")[2].split("/")[0]
        seen, rels = set(), []
        for r in self.index.get(owner, []):
            k = migrate.full_key(self.model, r)
            if k not in seen:
                seen.add(k)
                rels.append(r)
        self.index[owner] = rels
        return super().resolve_ref(ref, book, chapter, where)


# ---------------------------------------------------------------- fundir listas

def fundir(escritor, tipo, oid, existente, datos, donde):
    for k, v in datos.items():
        if k in ("id", "checked_on"):
            continue
        if isinstance(v, list):
            existente[k] = escritor.unir_lista(tipo, oid, k, existente.get(k), v, donde)
        elif k not in existente:
            existente[k] = copy.deepcopy(v)
        elif existente[k] != v:
            escritor.informe.append(f"{donde}: «{k}» ya tenía otro valor; se queda el que había")
    return existente


# ---------------------------------------------------------------- cobertura y fuentes

def leer_yaml(ruta):
    if not ruta.exists():
        return None
    return _texto(yaml.safe_load(ruta.read_text(encoding="utf-8")))


def _escalar(v):
    """Un valor dentro de un mapa en línea: sin comillas si YAML lo lee igual, con comillas dobles si no."""
    s = str(v)
    if isinstance(v, int) or re.match(r"^\d{4}-\d{2}-\d{2}$", s) or (re.match(r"^[\w.:\-/áéíóúñü]+$", s, re.I) and yaml.safe_load(f"x: {s}")["x"] == s):
        return s
    return json.dumps(s, ensure_ascii=False)


def texto_cobertura(libro, obj):
    lineas = ["# biblical-earth: cobertura de un libro. Formato en data/coverage/README.md.", f"book: {libro}"]
    if obj.get("note"):
        lineas.append(f"note: {_escalar(obj['note'])}")
    lineas.append("chapters:")
    for c in sorted(obj["chapters"]):
        cap = obj["chapters"][c]
        lineas.append(f"  {c}:")
        for k in ("status", "reviewed_on", "note"):
            if cap.get(k):
                lineas.append(f"    {k}: {_escalar(cap[k])}")
        lineas.append("    spans:")
        for t in cap.get("spans") or []:
            partes = [f"v: {_escalar(t['v'])}", f"type: {t['type']}"]
            for k in ("entities", "mentions"):
                if t.get(k):
                    partes.append(f"{k}: [{', '.join(t[k])}]")
            for k in ("note", "reviewed_on"):
                if t.get(k):
                    partes.append(f"{k}: {_escalar(t[k])}")
            lineas.append("    - {" + ", ".join(partes) + "}")
    return "\n".join(lineas) + "\n"


def _cap(k):
    if isinstance(k, int) and not isinstance(k, bool):
        return k
    if isinstance(k, str) and k.strip().isdigit():
        return int(k)
    raise Error(f"capítulo '{k}' no es un número")


def sin_consultado(f):
    return without_date(f)


# ---------------------------------------------------------------- renombrar un id en las propuestas

def renombrar(x, viejo, nuevo):
    """Cambia el id de persona `viejo` por `nuevo` en una propuesta: ids sueltos, persona:<id> o person:<id>, y las
    referencias de relación de los dos esquemas (relacion:<id>/<tipo>/<id> y relation:<id>/<type>/<id>...)."""
    if isinstance(x, dict):
        return {k: renombrar(v, viejo, nuevo) for k, v in x.items()}
    if isinstance(x, list):
        return [renombrar(v, viejo, nuevo) for v in x]
    if x == viejo:
        return nuevo
    for prefijo in ("persona:", "person:"):
        if x == prefijo + viejo:
            return prefijo + nuevo
    if isinstance(x, str) and x.startswith(("relacion:", "relation:")):
        prefijo, _, cuerpo = x.partition(":")
        cuerpo, arroba, desde = cuerpo.partition("@")
        partes = cuerpo.split("/")
        if len(partes) in (3, 4):
            partes = [nuevo if p == viejo and i in (0, 2) else p for i, p in enumerate(partes)]
            return f"{prefijo}:" + "/".join(partes) + arroba + desde
    return x


# ---------------------------------------------------------------- el escritor

class Escritor:
    def __init__(self, data, paralelo=False):
        self.data = Path(data)
        self.paralelo = paralelo
        self.fichas = {}        # (tipo, id) -> {datos, original, texto, nueva, tocada}
        self.informe = []
        self.choques = 0
        self.operaciones = {}   # libro -> [cambios que van a data/_proposals/<libro>.json]
        self.escritos = []
        try:
            self.model = migrate.Model(migrate.MAP_PATH, migrate.vocabulary_path(self.data))
        except migrate.Stop as e:
            raise Error(str(e))
        self.words = (self.model.voc or {}).get("words") or {}
        self.redirects = self.load_redirects()
        self.born = {}          # (id de persona, clave) -> número de la propuesta que añadió la relación
        self.chapter_from = {}  # (libro, capítulo) -> número de la propuesta que lo trae
        self.k, self.leido = 0, None
        self._docs = None
        self._translator = None

    # -- lo que se lee una vez
    def load_redirects(self):
        ruta = self.data.parent / REDIRECTS
        filas = (yaml.safe_load(ruta.read_text(encoding="utf-8")) or []) if ruta.exists() else []
        for f in filas:
            if not (isinstance(f, dict) and migrate.parse_key(str(f.get("from", "")))
                    and migrate.parse_key(str(f.get("to", "")))):
                raise Error(f"{REDIRECTS}: la fila {f} no lleva `from` y `to` escritos como una clave")
        return filas

    def docs(self):
        """Las fichas de persona, el catálogo de libros y las fuentes de data/, como las lee la traducción."""
        if self._docs is None:
            loader = getattr(yaml, "CSafeLoader", yaml.SafeLoader)
            self._docs = {}
            rutas = sorted((self.data / "people").glob("*.yaml")) + sorted((self.data / "sources").glob("*.yaml"))
            rutas += [self.data / "books.yaml"] if (self.data / "books.yaml").exists() else []
            for ruta in rutas:
                self._docs[str(ruta.relative_to(self.data))] = yaml.load(ruta.read_text(encoding="utf-8"),
                                                                          Loader=loader)
        return self._docs

    def translator(self):
        if self._translator is None:
            run = Translator(self.data, self.model)
            run.build_index(self.docs())
            run.redirects = self.redirects
            self._translator = run
        return self._translator

    def translate(self, p):
        """La propuesta con lo que lleva de una ficha en el esquema nuevo (modelo.md, sección 15)."""
        run = self.translator()
        try:
            out = migrate.translate_proposal(p, run)
        except migrate.Stop as e:
            run.stop(str(e))
        if run.stops:
            error = f"{p.get('_ruta') or p.get('agente')}: no se puede traducir al esquema nuevo: " + "; ".join(run.stops)
            run.stops.clear()
            raise Error(error)
        for u in run.unmapped_list:
            self.informe.append(f"{p.get('agente')}: {u}")
        run.unmapped_list.clear()
        return out

    # -- fichas
    def ficha(self, tipo, oid):
        k = (tipo, oid)
        if k not in self.fichas:
            ruta = self.data / tipo / f"{oid}.yaml"
            if not ruta.exists():
                return None
            texto = ruta.read_text(encoding="utf-8")
            d = _texto(yaml.safe_load(texto))
            self.fichas[k] = {"datos": d, "original": copy.deepcopy(d), "texto": texto, "nueva": False}
        return self.fichas[k]

    def claves_perspicacia(self):
        out = {}
        for rel, d in sorted(self.docs().items()):
            if not rel.startswith("people/"):
                continue
            k = (d or {}).get("perspicacia")
            if isinstance(k, str):
                out.setdefault(k, Path(rel).stem)
        return out

    def unificar(self, props):
        """Dos personas con la misma clave perspicacia son la misma: la que llega después toma el id de la que ya
        estaba (en data/ o antes en las propuestas), en todas las propuestas."""
        base = self.claves_perspicacia()
        personas = {"personas", "people"}
        while True:
            claves, choque = dict(base), None
            for p in props:
                for ch in p.get("cambios") or []:
                    k = (ch.get("datos") or {}).get("perspicacia") if ch.get("op") == "crear" else None
                    if ch.get("tipo") not in personas or not isinstance(k, str):
                        continue
                    dueno = claves.setdefault(k, ch["id"])
                    if dueno != ch["id"]:
                        choque = (p.get("agente"), ch["id"], dueno, k)
                        break
                if choque:
                    break
            if not choque:
                return props
            agente, viejo, dueno, k = choque
            self.informe.append(f"{agente}: people/{viejo} tiene la clave perspicacia {k}, que ya es de "
                                f"people/{dueno}; es la misma persona y se usa el id {dueno}")
            props = [renombrar(p, viejo, dueno) for p in props]

    def a_operaciones(self, libro, ch):
        self.operaciones.setdefault(libro, []).append(ch)

    # -- hechos anidados
    def stamp(self, hecho):
        """Pone al hecho el checked_on del día leído si no lo lleva o si el suyo es anterior."""
        if str(hecho.get("checked_on") or "") < self.leido:
            put_before(hecho, "checked_on", self.leido)
        return hecho

    def date_new(self, tipo, campo, hecho):
        """Un hecho anidado que se añade sin checked_on lo lleva con el día leído."""
        if (tipo, campo) in NESTED and isinstance(hecho, dict) and "checked_on" not in hecho:
            put_before(hecho, "checked_on", self.leido)
        return hecho

    def merge_sources(self, hecho, nuevo):
        """Une las fuentes de `nuevo` a las de `hecho`; si alguna es nueva, el hecho se leyó ese día."""
        suyas = list(hecho.get("sources") or [])
        mas = [f for f in nuevo.get("sources") or [] if f not in suyas]
        hecho["sources"] = suyas + mas
        if mas:
            self.stamp(hecho)

    def unir_lista(self, tipo, oid, campo, actual, nuevos, donde):
        actual = copy.deepcopy(list(actual or []))
        for v in nuevos:
            if campo == "relations" and isinstance(v, dict):
                k = relation_key(self.model, v)
                m = next((r for r in actual if isinstance(r, dict) and relation_key(self.model, r) == k), None)
                if m is None:
                    tramos = [relation_key(self.model, r)[3] for r in actual
                              if isinstance(r, dict) and relation_key(self.model, r)[:3] == k[:3]]
                    if tramos and (k[3] is None or None in tramos):
                        # Una sin date.from junto a otra de la misma terna es ambigua (modelo.md, sección 6).
                        self.choques += 1
                        cual = (f"llega sin fecha y la ficha ya la tiene con fecha ({', '.join(map(str, tramos))}): "
                                f"di su tramo con date" if k[3] is None else
                                f"llega con fecha ({k[3]}) y la ficha ya la tiene sin fecha: pon la fecha a la que hay "
                                f"o di que es otro tramo")
                        self.informe.append(f"{donde}: CHOQUE en la relación {'/'.join(str(x) for x in k[:3] if x)}: "
                                            f"{cual}; no se aplica. Relee la ficha")
                        continue
                    actual.append(self.date_new(tipo, campo, copy.deepcopy(v)))
                    self.born[(oid, k)] = self.k
                    continue
                self.merge_sources(m, v)
                if m.get("caption") != v.get("caption"):
                    informe = f"{donde}: la relación {k} ya estaba con caption «{m.get('caption')}» y llega con " \
                              f"«{v.get('caption')}»; se queda la primera"
                    self.informe.append(informe)
            elif campo == "candidates" and isinstance(v, dict):
                # El mismo candidato: el mismo nombre, o el mismo sitio dicho con otras palabras.
                m = next((c for c in actual if isinstance(c, dict) and (
                    c.get("name") == v.get("name") or (v.get("geometry") and c.get("geometry") == v.get("geometry")))),
                    None)
                if m is None:
                    actual.append(self.date_new(tipo, campo, copy.deepcopy(v)))
                    continue
                self.merge_sources(m, v)
                otros = [c for c in v if c not in ("sources", "checked_on") and m.get(c) != v[c]]
                if otros:
                    self.informe.append(f"{donde}: el candidato «{v.get('name')}» ya estaba con otro valor en "
                                        f"{', '.join(otros)}; se queda el que había")
            elif campo == "names" and isinstance(v, dict):
                if not any(isinstance(n, dict) and n.get("name") == v.get("name") for n in actual):
                    actual.append(copy.deepcopy(v))
            elif v not in actual:
                actual.append(self.date_new(tipo, campo, copy.deepcopy(v)))
        return actual

    def carry_dates(self, tipo, campo, antes, despues):
        """Una lista de hechos anidados que un `cambiar` sustituye: el hecho que sigue igual conserva su checked_on y
        el que cambia o es nuevo lleva el día leído."""
        despues = copy.deepcopy(despues)
        if (tipo, campo) not in NESTED or not isinstance(despues, list):
            return despues
        previos = [h for h in antes or [] if isinstance(h, dict)]
        for h in despues:
            if not isinstance(h, dict) or "checked_on" in h:
                continue
            igual = next((a for a in previos if without_date(a) == h and "checked_on" in a), None)
            put_before(h, "checked_on", igual["checked_on"] if igual else self.leido)
        return despues

    # -- relaciones que no van en la ficha que las trae
    def redirect_of(self, oid, r):
        """La fila de redirects.yaml cuya clave quitada es la de esta relación, o None."""
        t, y, field, start = relation_key(self.model, r)
        for fila in self.redirects:
            x2, t2, y2, field2, start2 = migrate.parse_key(str(fila["from"]))
            if (x2, t2, y2) == (oid, t, y or "-") and field2 in (None, field) and start2 in (None, start):
                return fila
        return None

    def follow_redirects(self, tipo, oid, rels, donde):
        """Las relaciones que se quedan en la ficha. Una que nombra una clave quitada a mano llega a la relación que
        quedó: le suma sus fuentes y no se escribe otra vez (modelo.md, sección 5)."""
        if tipo != "people" or not self.redirects:
            return rels
        quedan = []
        for r in rels:
            fila = self.redirect_of(oid, r) if isinstance(r, dict) else None
            if fila is None:
                quedan.append(r)
                continue
            destino, vistas = str(fila["to"]), set()
            while True:
                x, t, y, field, start = migrate.parse_key(destino)
                f = self.ficha("people", x)
                if self.paralelo and f is not None and not f["nueva"]:
                    raise Error(f"{donde}: la relación va a people/{x} por redirects.yaml, que ya existe; aplícala "
                                f"sin --parallel")
                cands = [q for q in ((f or {}).get("datos") or {}).get("relations") or []
                         if isinstance(q, dict) and migrate.matches(self.model, migrate.Rel(self.model, x, 0, q),
                                                                     (x, t, y, field, start))]
                if len(cands) == 1:
                    break
                siguiente = next((str(g["to"]) for g in self.redirects if str(g["from"]) == destino), None)
                if siguiente is None or siguiente in vistas:
                    raise Error(f"{donde}: redirects.yaml lleva «{fila['from']}» a «{destino}», que no casa con una "
                                f"sola relación de people/{x}")
                vistas.add(destino)
                destino = siguiente
            self.merge_sources(cands[0], r)
            f["tocada"] = True
            if str(f["datos"].get("checked_on") or "") < self.leido:
                f["datos"]["checked_on"] = self.leido
            self.informe.append(f"{donde}: la relación {fila['from']} se quitó (redirects.yaml); sus fuentes van a "
                                f"{destino}")
        return quedan

    def check_owner(self, oid, r, donde):
        """Un `anadir` de una relación cuya palabra lleva owns: target no se aplica (map.yaml, proposal.owner_rule)."""
        w = self.words.get(r.get("word")) if isinstance(r, dict) else None
        if w and w.get("owns") == "target":
            raise Error(f"{donde}: «{r['word']}» ({w.get('es')}) se escribe en la otra ficha: la relación va en "
                        f"people/{r.get('person')}, hacia {oid}, con la palabra {' o '.join(w.get('inverse') or [])} "
                        f"y su razón escrita desde allí; no se aplica")

    # -- un cambio
    def aplicar_cambio(self, p, ch):
        tipo, oid, op = ch.get("tipo"), ch.get("id"), ch.get("op")
        donde = f"{p.get('agente')}: {op} {tipo}/{oid}"
        if tipo not in SINGULAR:
            raise Error(f"{donde}: tipo '{tipo}' no es una carpeta de data/ ({', '.join(SINGULAR)})")
        f = self.ficha(tipo, oid)
        if self.paralelo and f is not None and not f["nueva"]:
            self.a_operaciones(p["libro"], ch)             # un fichero que ya existía: lo aplica la integración
            return
        if op == "crear":
            datos = copy.deepcopy(ch["datos"])
            if datos.get("id") != oid:
                raise Error(f"{donde}: datos.id es '{datos.get('id')}'")
            if isinstance(datos.get("relations"), list):
                datos["relations"] = self.follow_redirects(tipo, oid, datos["relations"], donde)
            if f is None:
                for campo, lista in datos.items():
                    for h in lista if isinstance(lista, list) else []:
                        self.date_new(tipo, campo, h)
                        if (tipo, campo) == ("people", "relations") and isinstance(h, dict):
                            self.born[(oid, relation_key(self.model, h))] = self.k
                self.fichas[(tipo, oid)] = {"datos": datos, "nueva": True, "tocada": True, "cambios": [ch],
                                            "libro": p["libro"]}
                return
            fundir(self, tipo, oid, f["datos"], datos, donde)
        elif f is None:
            raise Error(f"{donde}: la ficha no existe; usa crear")
        elif op == "anadir":
            if not isinstance(ch.get("valores"), list):
                raise Error(f"{donde}: anadir necesita 'valores' (una lista)")
            valores = ch["valores"]
            if ch["campo"] == "relations":
                valores = self.follow_redirects(tipo, oid, valores, donde)
                for r in valores:
                    self.check_owner(oid, r, donde)
            f["datos"][ch["campo"]] = self.unir_lista(tipo, oid, ch["campo"], f["datos"].get(ch["campo"]), valores,
                                                      donde)
        elif op == "cambiar":
            campo = ch["campo"]
            actual = f["datos"].get(campo)
            if not same_before(actual, ch.get("antes")):
                self.informe.append(f"{donde}: CHOQUE en «{campo}»: «antes» ya no es el valor de la ficha; no se aplica. "
                                    f"Relee la ficha")
                self.choques += 1
                return
            if ch.get("antes") is not None and not ch.get("historial"):
                raise Error(f"{donde}: cambiar lleva historial salvo cuando el campo no existía (antes: null)")
            despues = self.carry_dates(tipo, campo, actual, ch["despues"])
            if (tipo, campo) == ("people", "relations") and isinstance(despues, list):
                previas = {relation_key(self.model, r) for r in actual or [] if isinstance(r, dict)}
                for r in despues:
                    if isinstance(r, dict) and relation_key(self.model, r) not in previas:
                        self.born[(oid, relation_key(self.model, r))] = self.k
            if campo in f["datos"]:
                f["datos"][campo] = despues
            else:
                f["datos"] = con_clave_antes(f["datos"], campo, despues)
            if ch.get("historial"):
                if "history" not in f["datos"]:
                    f["datos"] = con_clave_antes(f["datos"], "history", [])
                f["datos"]["history"] = list(f["datos"]["history"] or []) + [ch["historial"]]
        else:
            raise Error(f"{donde}: op '{op}' no es crear, anadir ni cambiar")
        f["tocada"] = True
        if f["nueva"]:
            f["cambios"].append(ch)                         # por si otro escritor la crea antes (ver _escribir)
        if str(f["datos"].get("checked_on") or "") < self.leido:
            f["datos"]["checked_on"] = self.leido

    # -- propuestas de un libro
    def aplicar(self, props):
        por_libro = {}
        for p in props:
            if p.get("formato") != FORMATO:
                raise Error(f"{p.get('_ruta')}: formato '{p.get('formato')}', se esperaba '{FORMATO}'")
            for k in ("libro", "leido"):
                if not p.get(k):
                    raise Error(f"{p.get('_ruta')}: falta '{k}'")
            por_libro.setdefault(p["libro"], []).append(p)
        props = [p for ps in por_libro.values()
                 for p in sorted(ps, key=lambda p: min([_cap(c) for c in p.get("cobertura") or {}] or [0]))]
        props = [self.translate(p) for p in self.unificar(props)]
        cob, fue = {}, {}
        for self.k, p in enumerate(props, 1):
            self.leido = p["leido"]
            for c, cap in (p.get("cobertura") or {}).items():
                cob.setdefault(p["libro"], {})[_cap(c)] = cap
                self.chapter_from[(p["libro"], _cap(c))] = self.k
            for fid, f in (p.get("fuentes") or {}).items():
                previa = fue.setdefault(p["libro"], {}).get(fid)
                if previa is not None and sin_consultado(previa) != sin_consultado(f):
                    raise Error(f"fuente {fid}: dos propuestas la traen con datos distintos")
                if previa is None or str(f.get("checked_on")) > str(previa.get("checked_on")):
                    fue[p["libro"]][fid] = f
            for ch in p.get("cambios") or []:
                self.aplicar_cambio(p, ch)
            for q in p.get("preguntas") or []:
                self.informe.append(f"PREGUNTA {p.get('agente')}: {q}")
        return cob, fue, props

    # -- referencias de relación, tras aplicar
    def relations_of(self, pid):
        f = self.ficha("people", pid)
        rels = ((f or {}).get("datos") or {}).get("relations") or []
        return [migrate.Rel(self.model, pid, i, r) for i, r in enumerate(rels) if isinstance(r, dict)]

    def birth(self, r):
        return self.born.get((r.file, relation_key(self.model, r.raw)), 0)

    def affected(self):
        """(persona, tipo, destino) de cada relación nueva: las citas que ya había de ese trío pueden necesitar una
        forma más larga."""
        return {(pid, k[0], k[1] or "-") for (pid, k), n in self.born.items() if n}

    def canonical_ref(self, ref, hasta):
        """La forma canónica de una referencia de relación tras aplicar, o None si no casa con una sola. La
        referencia significa la relación con la que casaba cuando se escribió: la cobertura de data/ (hasta=0) no ve
        las relaciones que traen las propuestas, y la de la propuesta n no ve las de las propuestas siguientes."""
        prefijo, _, cuerpo = ref.partition(":")
        if prefijo == "relation":
            clave = migrate.parse_key(cuerpo)
            if clave is None:
                return None
            casa = lambda r, c=clave: migrate.matches(self.model, r, c)  # noqa: E731
        elif prefijo == "relacion":
            partes = cuerpo.split("/")
            if len(partes) != 3:
                return None
            clave = (partes[0], None, partes[2], None, None)
            casa = lambda r, t=partes[1], y=partes[2]: r.legacy == t and (r.target or "-") == y  # noqa: E731
        else:
            return ref
        rels = self.relations_of(clave[0])
        cands = [r for r in rels if casa(r) and self.birth(r) <= hasta]
        if not cands and prefijo == "relation":
            fila = next((f for f in self.redirects if migrate.parse_key(str(f["from"])) == clave), None)
            if fila is not None:
                destino = migrate.parse_key(str(fila["to"]))
                rels = self.relations_of(destino[0])
                cands = [r for r in rels if migrate.matches(self.model, r, destino)]
        if len(cands) != 1:
            return None
        return migrate.canonical(self.model, cands[0], rels)

    def follow_refs(self, libro, c, cap, hasta, solo=None):
        """Escribe en forma canónica las referencias de relación de un capítulo. Con `solo`, únicamente las de esos
        tríos (persona, tipo, destino)."""
        for t in cap.get("spans") or []:
            for campo in ("entities", "mentions"):
                refs = []
                for ref in t.get(campo) or []:
                    if not isinstance(ref, str) or not ref.startswith(("relation:", "relacion:")):
                        refs.append(ref)
                        continue
                    trio = tuple(ref.partition(":")[2].split("@")[0].split("/")[:3])
                    if solo is not None and trio not in solo:
                        refs.append(ref)
                        continue
                    nueva = self.canonical_ref(ref, hasta)
                    if nueva is None:
                        self.informe.append(f"coverage/{libro} capítulo {c}: la cita «{ref}» no casa con una sola "
                                            f"relación; se deja como está")
                        nueva = ref
                    elif nueva != ref:
                        self.informe.append(f"coverage/{libro} capítulo {c}: «{ref}» se escribe «{nueva}»")
                    if nueva not in refs:
                        refs.append(nueva)
                if campo in t:
                    t[campo] = refs

    def follow_refs_text(self, ruta, solo):
        """La cobertura de un libro que ninguna propuesta trae: cambia en el texto solo las referencias de los tríos
        con una relación nueva, sin tocar nada más. None si no cambia nada."""
        texto = ruta.read_text(encoding="utf-8")

        def replace_ref(m):
            ref = m.group(0)
            if tuple(ref.partition(":")[2].split("@")[0].split("/")[:3]) not in solo:
                return ref
            nueva = self.canonical_ref(ref, 0)
            if nueva is None:
                self.informe.append(f"coverage/{ruta.stem}: la cita «{ref}» no casa con una sola relación; se deja")
                return ref
            if nueva != ref:
                self.informe.append(f"coverage/{ruta.stem}: «{ref}» se escribe «{nueva}»")
            return nueva

        nuevo = RELATION_REF.sub(replace_ref, texto)
        if nuevo == texto:
            return None
        antes, despues = yaml.safe_load(texto), yaml.safe_load(nuevo)
        if json.dumps(antes, default=str).count("relation:") != json.dumps(despues, default=str).count("relation:"):
            raise Error(f"{ruta}: cambiar las referencias no dejó el mismo número de citas")
        return nuevo

    # -- escribir
    def plan(self, cob, fue, props):
        """[(ruta, texto, exclusivo)] de todo lo que hay que escribir salvo data/_proposals/, que depende de si las
        fichas nuevas se pueden crear (plan_operaciones). No escribe nada."""
        self.props = props
        salida = []
        for (tipo, oid), f in sorted(self.fichas.items()):
            if not f.get("tocada"):
                continue
            ruta = self.data / tipo / f"{oid}.yaml"
            if f["nueva"]:
                salida.append((ruta, cabecera(tipo) + volcar(f["datos"]), True))
                continue
            texto, fiel = reescribir(f["texto"], f["original"], f["datos"])
            if not fiel:
                self.informe.append(f"{tipo}/{oid}: no se pudo cambiar solo lo necesario; la ficha se reescribe entera")
            salida.append((ruta, texto, False))
        fuentes_existentes = {}
        for ruta in sorted((self.data / "sources").glob("*.yaml")):
            for fid, f in (leer_yaml(ruta) or {}).items():
                fuentes_existentes.setdefault(fid, (ruta, f))
        for libro, nuevas in fue.items():
            ruta = self.data / "sources" / f"cobertura-{libro}.yaml"
            actual = leer_yaml(ruta) or {}
            for fid, f in nuevas.items():
                if fid in fuentes_existentes:
                    otra_ruta, otra = fuentes_existentes[fid]
                    if sin_consultado(otra) != sin_consultado(f):
                        raise Error(f"fuente {fid}: ya está en {otra_ruta.name} con otros datos")
                    if otra_ruta != ruta:
                        continue                         # ya existe igual en otro fichero: build.py la funde
                    if str(otra.get("checked_on")) >= str(f.get("checked_on")):
                        continue
                actual[fid] = f
            if actual != (leer_yaml(ruta) or {}):
                salida.append((ruta, f"# biblical-earth: fuentes de la cobertura de {libro}. Esquema en "
                                     f"docs/investigacion/README.md.\n" + volcar(actual), False))
        solo = self.affected()
        for libro, caps in cob.items():
            ruta = self.data / "coverage" / f"{libro}.yaml"
            actual = leer_yaml(ruta) or {"book": libro, "chapters": {}}
            capitulos = {}
            for k, v in (actual.get("chapters") or {}).items():
                if _cap(k) in capitulos:
                    raise Error(f"{ruta}: el capítulo {k} está dos veces")
                capitulos[_cap(k)] = v
            for c, cap in capitulos.items():
                if c not in caps and solo:
                    self.follow_refs(libro, c, cap, 0, solo)
            for c, cap in caps.items():
                self.follow_refs(libro, c, cap, self.chapter_from.get((libro, c), 0))
            capitulos.update(caps)
            actual["chapters"] = capitulos
            salida.append((ruta, texto_cobertura(libro, actual), False))
        if solo:
            for ruta in sorted((self.data / "coverage").glob("*.yaml")):
                if ruta.stem not in cob:
                    nuevo = self.follow_refs_text(ruta, solo)
                    if nuevo is not None:
                        salida.append((ruta, nuevo, False))
        return salida

    def plan_operaciones(self):
        salida = []
        for libro, cambios in self.operaciones.items():
            ruta = self.data / "_proposals" / f"{libro}.json"
            previa = json.loads(ruta.read_text(encoding="utf-8")) if ruta.exists() else {
                "formato": FORMATO, "libro": libro, "agente": f"escritor-{libro}", "leido": "0000-00-00",
                "cobertura": {}, "fuentes": {}, "cambios": [], "preguntas": []}
            previa["leido"] = max([previa["leido"]] + [p["leido"] for p in self.props if p["libro"] == libro])
            previa["cambios"] += cambios
            salida.append((ruta, json.dumps(previa, ensure_ascii=False, indent=1) + "\n", False))
        return salida

    def escribir(self, salida, seco=False):
        """Primero las fichas nuevas (en modo exclusivo), luego lo demás y, al final, las operaciones."""
        self._escribir([x for x in salida if x[2]], seco)
        self._escribir([x for x in salida if not x[2]], seco)
        self._escribir(self.plan_operaciones(), seco)

    def _escribir(self, salida, seco):
        for ruta, texto, exclusivo in salida:
            rel = ruta.relative_to(self.data.parent) if self.data.parent in ruta.parents else ruta
            if seco:
                self.escritos.append(f"(seco) {rel}")
                continue
            ruta.parent.mkdir(parents=True, exist_ok=True)
            if exclusivo:
                try:
                    with open(ruta, "x", encoding="utf-8") as fh:
                        fh.write(texto)
                except FileExistsError:
                    f = self.fichas[(ruta.parent.name, ruta.stem)]
                    for ch in f["cambios"]:
                        self.a_operaciones(f["libro"], ch)
                    self.informe.append(f"{rel}: otro escritor la creó mientras tanto; su crear pasa a "
                                        f"data/_proposals/{f['libro']}.json")
                    continue
            else:
                ruta.write_text(texto, encoding="utf-8")
            self.escritos.append(str(rel))


def main(argv=None):
    ap = argparse.ArgumentParser(description="Aplica propuestas de cobertura sobre data/.")
    ap.add_argument("--data", default=str(RAIZ / "data"), help="directorio de datos (por defecto data/)")
    ap.add_argument("--dry-run", "--seco", dest="dry_run", action="store_true", help="no escribe nada")
    ap.add_argument("--parallel", "--paralelo", dest="parallel", action="store_true",
                    help="los ficheros que ya existían no se tocan: sus cambios van a data/_proposals/<libro>.json")
    ap.add_argument("propuestas", nargs="+")
    a = ap.parse_args(argv)
    props = []
    for r in a.propuestas:
        p = json.loads(Path(r).read_text(encoding="utf-8"))
        p["_ruta"] = r
        props.append(p)
    try:
        e = Escritor(a.data, a.parallel)
        cob, fue, props = e.aplicar(props)
        salida = e.plan(cob, fue, props)
    except Error as x:
        print(f"apply: ERROR {x}; no se ha escrito nada", file=sys.stderr)
        return 1
    e.escribir(salida, a.dry_run)
    print("\n".join(e.escritos) or "(nada que escribir)")
    print("\nINFORME:\n" + ("\n".join(e.informe) or "(sin choques ni diferencias)"))
    return 2 if e.choques else 0


if __name__ == "__main__":
    sys.exit(main())
