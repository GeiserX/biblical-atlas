#!/usr/bin/env python3
"""El escritor de la cobertura: aplica propuestas de lectura (docs/investigacion/versiculos.md, sección 11) sobre data/.

Uso:  python3 scripts/aplicar.py [--data DIR] [--seco] [--paralelo] propuesta.json [...]

Aplica las propuestas de cada libro en orden de capítulo y, dentro de cada una, los cambios en orden:
- crear: ficha nueva, en modo exclusivo. Si la ficha ya existe (u otra persona tiene la misma clave `perspicacia`), se
  funde con ella: las listas se unen sin repetir, una relación con el mismo tipo y la misma persona o lugar junta sus
  fuentes, y un texto distinto se queda como estaba y va al informe.
- anadir: une valores a una lista. cambiar: solo si el valor actual es igual a «antes»; si no, es un choque.
- Cada ficha tocada pone `consultado` al día `leido` de la propuesta.
- data/cobertura/<libro>.yaml: sustituye solo los capítulos de las propuestas y deja los demás.
- data/fuentes/cobertura-<libro>.yaml: une las fuentes nuevas. Un id que ya existe con otros datos es un error.

Una ficha existente se reescribe clave a clave: solo cambian las líneas de los campos que cambian, y lo escrito se
vuelve a leer para comprobar que dice exactamente lo aplicado.

--paralelo: varios libros a la vez. Los ficheros que ya existían no se tocan: sus cambios van, como operaciones, a
data/_propuestas/<libro>.json, que la integración aplica después con este mismo script. Las fichas nuevas se crean
con open(ruta, "x"); si otro escritor la creó antes, el `crear` también pasa a operaciones.
--seco: no escribe nada; dice qué escribiría.

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

RAIZ = Path(__file__).resolve().parent.parent
FORMATO = "biblical-earth/propuesta-cobertura/1"
SINGULAR = {"lugares": "lugar", "personas": "persona", "viajes": "viaje", "cartas": "carta", "eventos": "evento",
            "periodos": "periodo", "hallazgos": "hallazgo", "recorridos": "recorrido"}
CLAVE = re.compile(r"^([^\s#\-][^:]*):(?:\s|$)")


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


def reescribir(texto, viejo, nuevo):
    """Texto de la ficha con los datos `nuevo`, cambiando solo las regiones de las claves que cambian. Una lista a la
    que solo se le añaden elementos al final conserva sus líneas y suma las nuevas."""
    partes = regiones(texto)
    previo = {k: lineas for k, lineas in partes if k is not None}
    out = list(partes[0][1])
    for k, v in nuevo.items():
        if k in previo and viejo.get(k) == v:
            out += previo[k]
        elif (k in previo and isinstance(v, list) and isinstance(viejo.get(k), list) and viejo[k]
              and v[:len(viejo[k])] == viejo[k] and previo[k][0].rstrip().endswith(":")):
            lineas = previo[k]
            fin = len(lineas)
            while fin > 1 and not lineas[fin - 1].strip():      # las líneas en blanco del final siguen al final
                fin -= 1
            out += lineas[:fin] + volcar(v[len(viejo[k]):]).splitlines(keepends=True) + lineas[fin:]
        else:
            out += volcar({k: v}).splitlines(keepends=True)
    texto_nuevo = "".join(out)
    if _texto(yaml.safe_load(texto_nuevo)) != nuevo:
        cab = partes[0][1]
        return "".join(cab) + volcar(nuevo), False
    return texto_nuevo, True


def con_clave_antes(d, clave, valor, antes="consultado"):
    """Pone una clave nueva justo antes de `antes` (consultado y estado quedan al final)."""
    if clave in d or antes not in d:
        d[clave] = valor
        return d
    out = {}
    for k, v in d.items():
        if k == antes:
            out[clave] = valor
        out[k] = v
    return out


# ---------------------------------------------------------------- fundir listas

def clave_rel(r):
    return (r.get("tipo"), r.get("persona") or r.get("lugar"))


def unir_lista(campo, actual, nuevos, informe, donde):
    actual = copy.deepcopy(list(actual or []))
    for v in nuevos:
        if campo == "relaciones" and isinstance(v, dict):
            m = next((r for r in actual if isinstance(r, dict) and clave_rel(r) == clave_rel(v)), None)
            if m is None:
                actual.append(copy.deepcopy(v))
                continue
            m["fuentes"] = list(m.get("fuentes") or [])
            m["fuentes"] += [f for f in v.get("fuentes") or [] if f not in m["fuentes"]]
            if m.get("relacion") != v.get("relacion"):
                informe.append(f"{donde}: la relación {clave_rel(v)} ya estaba con relacion «{m.get('relacion')}» y "
                               f"llega con «{v.get('relacion')}»; se queda la primera")
        elif campo == "nombres" and isinstance(v, dict):
            if not any(isinstance(n, dict) and n.get("nombre") == v.get("nombre") for n in actual):
                actual.append(copy.deepcopy(v))
        elif v not in actual:
            actual.append(copy.deepcopy(v))
    return actual


def fundir(existente, datos, informe, donde):
    for k, v in datos.items():
        if k in ("id", "consultado"):
            continue
        if isinstance(v, list):
            existente[k] = unir_lista(k, existente.get(k), v, informe, donde)
        elif k not in existente:
            existente[k] = copy.deepcopy(v)
        elif existente[k] != v:
            informe.append(f"{donde}: «{k}» ya tenía otro valor; se queda el que había")
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
    lineas = ["# biblical-earth: cobertura de un libro. Formato en data/cobertura/README.md.", f"libro: {libro}"]
    if obj.get("nota"):
        lineas.append(f"nota: {_escalar(obj['nota'])}")
    lineas.append("capitulos:")
    for c in sorted(obj["capitulos"]):
        cap = obj["capitulos"][c]
        lineas.append(f"  {c}:")
        for k in ("estado", "revisado", "nota"):
            if cap.get(k):
                lineas.append(f"    {k}: {_escalar(cap[k])}")
        lineas.append("    tramos:")
        for t in cap.get("tramos") or []:
            partes = [f"v: {_escalar(t['v'])}", f"tipo: {t['tipo']}"]
            for k in ("entidades", "menciona"):
                if t.get(k):
                    partes.append(f"{k}: [{', '.join(t[k])}]")
            for k in ("nota", "revisado"):
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
    return {k: v for k, v in f.items() if k != "consultado"}


# ---------------------------------------------------------------- renombrar un id en las propuestas

def renombrar(x, viejo, nuevo):
    """Cambia el id de persona `viejo` por `nuevo` en una propuesta: ids sueltos, persona:<id> y relacion:<id>/…/<id>."""
    if isinstance(x, dict):
        return {k: renombrar(v, viejo, nuevo) for k, v in x.items()}
    if isinstance(x, list):
        return [renombrar(v, viejo, nuevo) for v in x]
    if x == viejo:
        return nuevo
    if x == f"persona:{viejo}":
        return f"persona:{nuevo}"
    if isinstance(x, str) and x.startswith("relacion:"):
        partes = x[len("relacion:"):].split("/")
        if len(partes) == 3:
            return "relacion:" + "/".join(nuevo if p == viejo and i != 1 else p for i, p in enumerate(partes))
    return x


# ---------------------------------------------------------------- el escritor

class Escritor:
    def __init__(self, data, paralelo=False):
        self.data = Path(data)
        self.paralelo = paralelo
        self.fichas = {}        # (tipo, id) -> {datos, original, texto, nueva, tocada}
        self.informe = []
        self.choques = 0
        self.operaciones = {}   # libro -> [cambios que van a data/_propuestas/<libro>.json]
        self.escritos = []

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
        for ruta in sorted((self.data / "personas").glob("*.yaml")):
            k = (yaml.safe_load(ruta.read_text(encoding="utf-8")) or {}).get("perspicacia")
            if isinstance(k, str):
                out.setdefault(k, ruta.stem)
        return out

    def unificar(self, props):
        """Dos personas con la misma clave perspicacia son la misma: la que llega después toma el id de la que ya
        estaba (en data/ o antes en las propuestas), en todas las propuestas."""
        base = self.claves_perspicacia()
        while True:
            claves, choque = dict(base), None
            for p in props:
                for ch in p.get("cambios") or []:
                    k = (ch.get("datos") or {}).get("perspicacia") if ch.get("op") == "crear" else None
                    if ch.get("tipo") != "personas" or not isinstance(k, str):
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
            self.informe.append(f"{agente}: personas/{viejo} tiene la clave perspicacia {k}, que ya es de "
                                f"personas/{dueno}; es la misma persona y se usa el id {dueno}")
            props = [renombrar(p, viejo, dueno) for p in props]

    def a_operaciones(self, libro, ch):
        self.operaciones.setdefault(libro, []).append(ch)

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
            if f is None:
                self.fichas[(tipo, oid)] = {"datos": datos, "nueva": True, "tocada": True, "cambios": [ch],
                                            "libro": p["libro"]}
                return
            fundir(f["datos"], datos, self.informe, donde)
        elif f is None:
            raise Error(f"{donde}: la ficha no existe; usa crear")
        elif op == "anadir":
            if not isinstance(ch.get("valores"), list):
                raise Error(f"{donde}: anadir necesita 'valores' (una lista)")
            f["datos"][ch["campo"]] = unir_lista(ch["campo"], f["datos"].get(ch["campo"]), ch["valores"], self.informe,
                                                 donde)
        elif op == "cambiar":
            campo = ch["campo"]
            if f["datos"].get(campo) != ch.get("antes"):
                self.informe.append(f"{donde}: CHOQUE en «{campo}»: «antes» ya no es el valor de la ficha; no se aplica. "
                                    f"Relee la ficha")
                self.choques += 1
                return
            if ch.get("antes") is not None and not ch.get("historial"):
                raise Error(f"{donde}: cambiar lleva historial salvo cuando el campo no existía (antes: null)")
            if campo in f["datos"]:
                f["datos"][campo] = ch["despues"]
            else:
                f["datos"] = con_clave_antes(f["datos"], campo, ch["despues"])
            if ch.get("historial"):
                if "historial" not in f["datos"]:
                    f["datos"] = con_clave_antes(f["datos"], "historial", [])
                f["datos"]["historial"] = list(f["datos"]["historial"] or []) + [ch["historial"]]
        else:
            raise Error(f"{donde}: op '{op}' no es crear, anadir ni cambiar")
        f["tocada"] = True
        if f["nueva"]:
            f["cambios"].append(ch)                         # por si otro escritor la crea antes (ver _escribir)
        leido = p["leido"]
        if str(f["datos"].get("consultado") or "") < leido:
            f["datos"]["consultado"] = leido

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
        props = self.unificar(props)
        cob, fue = {}, {}
        for p in props:
            for c, cap in (p.get("cobertura") or {}).items():
                cob.setdefault(p["libro"], {})[_cap(c)] = cap
            for fid, f in (p.get("fuentes") or {}).items():
                previa = fue.setdefault(p["libro"], {}).get(fid)
                if previa is not None and sin_consultado(previa) != sin_consultado(f):
                    raise Error(f"fuente {fid}: dos propuestas la traen con datos distintos")
                if previa is None or str(f.get("consultado")) > str(previa.get("consultado")):
                    fue[p["libro"]][fid] = f
            for ch in p.get("cambios") or []:
                self.aplicar_cambio(p, ch)
            for q in p.get("preguntas") or []:
                self.informe.append(f"PREGUNTA {p.get('agente')}: {q}")
        return cob, fue, props

    # -- escribir
    def plan(self, cob, fue, props):
        """[(ruta, texto, exclusivo)] de todo lo que hay que escribir salvo data/_propuestas/, que depende de si las
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
        for ruta in sorted((self.data / "fuentes").glob("*.yaml")):
            for fid, f in (leer_yaml(ruta) or {}).items():
                fuentes_existentes.setdefault(fid, (ruta, f))
        for libro, nuevas in fue.items():
            ruta = self.data / "fuentes" / f"cobertura-{libro}.yaml"
            actual = leer_yaml(ruta) or {}
            for fid, f in nuevas.items():
                if fid in fuentes_existentes:
                    otra_ruta, otra = fuentes_existentes[fid]
                    if sin_consultado(otra) != sin_consultado(f):
                        raise Error(f"fuente {fid}: ya está en {otra_ruta.name} con otros datos")
                    if otra_ruta != ruta:
                        continue                         # ya existe igual en otro fichero: build.py la funde
                    if str(otra.get("consultado")) >= str(f.get("consultado")):
                        continue
                actual[fid] = f
            if actual != (leer_yaml(ruta) or {}):
                salida.append((ruta, f"# biblical-earth: fuentes de la cobertura de {libro}. Esquema en "
                                     f"docs/investigacion/README.md.\n" + volcar(actual), False))
        for libro, caps in cob.items():
            ruta = self.data / "cobertura" / f"{libro}.yaml"
            actual = leer_yaml(ruta) or {"libro": libro, "capitulos": {}}
            capitulos = {}
            for k, v in (actual.get("capitulos") or {}).items():
                if _cap(k) in capitulos:
                    raise Error(f"{ruta}: el capítulo {k} está dos veces")
                capitulos[_cap(k)] = v
            capitulos.update(caps)
            actual["capitulos"] = capitulos
            salida.append((ruta, texto_cobertura(libro, actual), False))
        return salida

    def plan_operaciones(self):
        salida = []
        for libro, cambios in self.operaciones.items():
            ruta = self.data / "_propuestas" / f"{libro}.json"
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
                                        f"data/_propuestas/{f['libro']}.json")
                    continue
            else:
                ruta.write_text(texto, encoding="utf-8")
            self.escritos.append(str(rel))


def main(argv=None):
    ap = argparse.ArgumentParser(description="Aplica propuestas de cobertura sobre data/.")
    ap.add_argument("--data", default=str(RAIZ / "data"), help="directorio de datos (por defecto data/)")
    ap.add_argument("--seco", action="store_true", help="no escribe nada")
    ap.add_argument("--paralelo", action="store_true",
                    help="los ficheros que ya existían no se tocan: sus cambios van a data/_propuestas/<libro>.json")
    ap.add_argument("propuestas", nargs="+")
    a = ap.parse_args(argv)
    props = []
    for r in a.propuestas:
        p = json.loads(Path(r).read_text(encoding="utf-8"))
        p["_ruta"] = r
        props.append(p)
    e = Escritor(a.data, a.paralelo)
    try:
        cob, fue, props = e.aplicar(props)
        salida = e.plan(cob, fue, props)
    except Error as x:
        print(f"aplicar: ERROR {x}; no se ha escrito nada", file=sys.stderr)
        return 1
    e.escribir(salida, a.seco)
    print("\n".join(e.escritos) or "(nada que escribir)")
    print("\nINFORME:\n" + ("\n".join(e.informe) or "(sin choques ni diferencias)"))
    return 2 if e.choques else 0


if __name__ == "__main__":
    sys.exit(main())
