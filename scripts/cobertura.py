#!/usr/bin/env python3
"""Cobertura de la Biblia: qué versículos de cada libro se han leído y qué produjo cada tramo.

Uso:  python3 scripts/cobertura.py [--data DIR] [--faltan LIBRO] [--fallar]

Sin opciones imprime, por libro y en total, los capítulos completos y los versículos leídos.
--faltan LIBRO lista los versículos que faltan por leer de ese libro (slug de data/libros.yaml), capítulo a capítulo.
--fallar sale con código 1 si algún capítulo de la Biblia no está completo.

Los ficheros son data/cobertura/<libro>.yaml; el formato está en data/cobertura/README.md y el protocolo de lectura
en docs/investigacion/versiculos.md. Este módulo tiene también las reglas que usan build.py y validate.py.
"""
import argparse
import datetime
import re
import sys
import unicodedata
from pathlib import Path

import yaml

ESTADOS_CAPITULO = {"pendiente", "completo"}
TIPOS_TRAMO = {"narracion", "genealogia", "ley", "poesia", "profecia", "discurso", "carta", "lista", "vision"}
CAMPOS_FICHERO = {"libro", "capitulos", "nota"}
CAMPOS_CAPITULO = {"estado", "revisado", "tramos", "nota"}
CAMPOS_TRAMO = {"v", "tipo", "entidades", "menciona", "nota", "revisado"}
# Prefijo de cada referencia de un tramo y la carpeta de data/ donde vive su id.
PREFIJOS = {"persona": "personas", "lugar": "lugares", "evento": "eventos", "periodo": "periodos",
            "viaje": "viajes", "carta": "cartas", "hallazgo": "hallazgos"}
DIA = re.compile(r"^\d{4}-\d{2}-\d{2}$")
RE_V = re.compile(r"^\s*(\d+)\s*(?:[-–]\s*(\d+)\s*)?$")
RE_NWTSTY = re.compile(r"/nwtsty/(\d+)/(\d+)(?:\D|$)")


# ---------------------------------------------------------------- lectura

def _texto(v):
    if isinstance(v, (datetime.date, datetime.datetime)):
        return v.isoformat()[:10]
    if isinstance(v, dict):
        return {k: _texto(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_texto(x) for x in v]
    return v


def cargar(data_dir, errores):
    """Lee data/cobertura/*.yaml (salvo README). Devuelve {slug: objeto} con _fichero y _nombre_fichero."""
    out = {}
    for ruta in sorted((Path(data_dir) / "cobertura").glob("*.yaml")):
        rel = f"data/cobertura/{ruta.name}"
        try:
            obj = _texto(yaml.safe_load(ruta.read_text(encoding="utf-8")))
        except yaml.YAMLError as e:
            errores.append(f"{rel}: YAML no válido: {e}")
            continue
        if not isinstance(obj, dict):
            errores.append(f"{rel}: el fichero no es un mapa YAML")
            continue
        obj["_fichero"], obj["_nombre_fichero"] = rel, ruta.stem
        out[ruta.stem] = obj
    return out


def _cap(k):
    """Clave de capítulo: 3 o «3» -> 3; otra cosa -> None."""
    if isinstance(k, int) and not isinstance(k, bool):
        return k
    if isinstance(k, str) and k.strip().isdigit():
        return int(k)
    return None


def rango(v):
    """«1-5», «1–5», 7 o «7» -> (1, 5) o (7, 7). Otra cosa -> None."""
    if isinstance(v, int) and not isinstance(v, bool):
        return (v, v)
    m = RE_V.match(str(v)) if isinstance(v, str) else None
    if not m:
        return None
    a = int(m.group(1))
    return (a, int(m.group(2)) if m.group(2) else a)


def versiculos(libro):
    """Lista con el último versículo de cada capítulo, o None si libros.yaml no la da."""
    vs = libro.get("versiculos")
    if isinstance(vs, list) and vs and all(isinstance(n, int) and not isinstance(n, bool) and n > 0 for n in vs):
        return vs
    return None


def omitidos(libro):
    """{capítulo: {versículos}} que la TNM no incluye (Mt 17:21). Acepta números y tramos «53-58»."""
    out = {}
    for k, vs in (libro.get("omitidos") or {}).items() if isinstance(libro.get("omitidos"), dict) else ():
        c = _cap(k)
        if c is None:
            continue
        for v in vs if isinstance(vs, list) else [vs]:
            r = rango(v)
            if r:
                out.setdefault(c, set()).update(range(r[0], r[1] + 1))
    return out


def requeridos(libro, cap):
    """Versículos que un capítulo tiene que cubrir: del 1 al último, sin los omitidos. None si no hay recuento."""
    vs = versiculos(libro)
    if not vs or not 1 <= cap <= len(vs):
        return None
    return set(range(1, vs[cap - 1] + 1)) - omitidos(libro).get(cap, set())


def tramos_de(capitulo):
    """[(a, b, tramo)] de los tramos con un «v» válido, en el orden del fichero."""
    out = []
    for t in (capitulo or {}).get("tramos") or [] if isinstance(capitulo, dict) else []:
        if isinstance(t, dict):
            r = rango(t.get("v"))
            if r:
                out.append((r[0], r[1], t))
    return out


def _capitulos(obj):
    caps = obj.get("capitulos") if isinstance(obj, dict) else None
    return {c: v for c, v in ((_cap(k), v) for k, v in caps.items()) if c is not None} if isinstance(caps, dict) else {}


def _tramos_de_numeros(ns):
    """{1, 2, 3, 7, 9, 10} -> [(1, 3), (7, 7), (9, 10)]."""
    out = []
    for n in sorted(ns):
        if out and n == out[-1][1] + 1:
            out[-1] = (out[-1][0], n)
        else:
            out.append((n, n))
    return out


def texto_tramos(ns):
    return ", ".join(f"{a}" if a == b else f"{a}-{b}" for a, b in _tramos_de_numeros(ns))


# ---------------------------------------------------------------- recuento

def resumen(datos):
    """Por libro, en el orden de libros.yaml: {slug, nombre, capitulos, completos, versiculos, leidos}.
    versiculos y leidos son None si libros.yaml no da el recuento del libro."""
    cob = datos.get("cobertura") or {}
    filas = []
    for l in datos["libros"]:
        caps = _capitulos(cob.get(l.get("slug")))
        n_caps = int(l.get("capitulos") or 0)
        completos = sum(1 for c, v in caps.items() if 1 <= c <= n_caps and isinstance(v, dict)
                        and v.get("estado") == "completo")
        total = leidos = None
        if versiculos(l) and len(versiculos(l)) == n_caps:
            total = leidos = 0
            for c in range(1, n_caps + 1):
                req = requeridos(l, c) or set()
                total += len(req)
                hechos = set()
                for a, b, _ in tramos_de(caps.get(c)):
                    hechos.update(range(a, b + 1))
                leidos += len(req & hechos)
        filas.append({"slug": l.get("slug"), "nombre": l.get("nombre"), "capitulos": n_caps, "completos": completos,
                      "versiculos": total, "leidos": leidos, "con_fichero": l.get("slug") in cob})
    return filas


def total(filas):
    con = [f for f in filas if f["versiculos"] is not None]
    return {"capitulos": sum(f["capitulos"] for f in filas), "completos": sum(f["completos"] for f in filas),
            "versiculos": sum(f["versiculos"] for f in con), "leidos": sum(f["leidos"] for f in con),
            "sin_recuento": len(filas) - len(con)}


def porcentaje(leidos, versiculos):
    if not versiculos:
        return "sin recuento" if versiculos is None else "0 %"
    p = 100 * leidos / versiculos
    return f"{p:.0f} %" if p == int(p) or p >= 1 else f"{p:.1f} %".replace(".", ",")


def faltan(datos, slug):
    """[(capítulo, estado, {versículos que faltan})] de un libro, solo los capítulos que no están completos.
    Con un capítulo completo que aún tenga huecos, validate.py ya da error; aquí sale igual."""
    libro = next((l for l in datos["libros"] if l.get("slug") == slug), None)
    if libro is None:
        return None
    caps = _capitulos((datos.get("cobertura") or {}).get(slug))
    out = []
    for c in range(1, int(libro.get("capitulos") or 0) + 1):
        req = requeridos(libro, c)
        cap = caps.get(c) if isinstance(caps.get(c), dict) else {}
        hechos = set()
        for a, b, _ in tramos_de(cap):
            hechos.update(range(a, b + 1))
        falta = (req - hechos) if req is not None else None
        if cap.get("estado") != "completo" or falta:
            out.append((c, cap.get("estado") or "pendiente", falta))
    return out


# ---------------------------------------------------------------- citas: qué capítulos cita una entidad

def _sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", str(s)) if unicodedata.category(c) != "Mn")


def _norm(s):
    return _sin_tildes(s).lower().replace(" ", "").replace(".", "")


class Citas:
    """Busca citas bíblicas en un texto libre, como citasEnTexto de site/js/tipos/pasaje.js: la misma expresión, los
    mismos nombres de libro (abr, nombre y formas de data/libros.yaml) y la misma cola «Hch 17:14; 18:5». Una
    diferencia a propósito: en un libro de un solo capítulo, «Flm 10» es el versículo 10 del capítulo 1."""

    def __init__(self, libros):
        self.por_forma = {}
        for l in libros:
            for f in [l.get("abr"), l.get("nombre"), *(l.get("formas") or [])]:
                if f:
                    self.por_forma.setdefault(_norm(f), l)
        formas = {str(f) for l in libros for f in [l.get("abr"), l.get("nombre"), *(l.get("formas") or [])] if f}
        alt = "|".join(re.escape(f) for f in sorted(formas, key=len, reverse=True))
        self.re = re.compile(rf"(?:^|[^\w])((?:[123]\s?)?(?:{alt}))\.?\s+(\d{{1,3}})(?::(\d{{1,3}}))?"
                             rf"(?:\s*[-–]\s*(\d{{1,3}})(?::(\d{{1,3}}))?)?"
                             rf"((?:\s*;\s*\d{{1,3}}:\d{{1,3}}(?:\s*[-–]\s*\d{{1,3}})?)*)", re.I)

    @staticmethod
    def forma_corta_ok(forma):
        """Una forma de dos o tres letras sin número delante (Da, He, Am, Mar, Col) también es una palabra española:
        solo cuenta con mayúscula inicial. Así «le da 2 hijos» no es Daniel 2, y «Hch 16» sigue siendo Hechos 16."""
        letras = forma.replace(".", "").strip()
        return bool(re.match(r"^[123]", letras)) or len(letras) > 3 or letras[:1].isupper()

    def capitulos(self, texto):
        """{(slug, capítulo)} de todas las citas del texto. Lo que no es una cita se ignora."""
        out = set()
        for m in self.re.finditer(str(texto or "")):
            libro = self.por_forma.get(_norm(m.group(1)))
            if not libro:
                continue
            n = int(libro.get("capitulos") or 0)
            if not self.forma_corta_ok(m.group(1)):
                continue
            if n == 1 and not m.group(3):
                out.add((libro["slug"], 1))           # «Flm 10», «Jud 3»: versículos del único capítulo
                continue
            cap = int(m.group(2))
            fin = int(m.group(4)) if m.group(5) or (not m.group(3) and m.group(4)) else cap
            out.update((libro["slug"], c) for c in range(cap, fin + 1) if 1 <= c <= n)
            for x in re.finditer(r"(\d{1,3}):\d", m.group(6) or ""):
                if 1 <= int(x.group(1)) <= n:
                    out.add((libro["slug"], int(x.group(1))))
        return out


# Qué textos y qué fuentes de cada tipo cuentan como «cita el capítulo»: los mismos que usa el índice «aparece en»
# de site/js/tipos/pasaje.js (indiceReferencias). Si cambia allí, cambia aquí.
TEXTOS_CITA = {
    "personas": lambda o: [o.get("razon"), o.get("desambiguacion"),
                           *[r.get("razon") for r in o.get("relaciones") or [] if isinstance(r, dict)]],
    "lugares": lambda o: [o.get("razon")],
    "eventos": lambda o: [*(o.get("pasajes") or []), o.get("razon")],
    "cartas": lambda o: [o.get("referencia"), o.get("razon")],
    "viajes": lambda o: [o.get("referencia")],
    "periodos": lambda o: [o.get("razon")],
    "hallazgos": lambda o: [o.get("razon"), o.get("resumen")],
    "relacion": lambda o: [o.get("razon")],
}


def _fuentes_cita(o, carpeta):
    fs = list(o.get("fuentes") or [])
    if carpeta == "personas":
        fs += [f for r in o.get("relaciones") or [] if isinstance(r, dict) for f in r.get("fuentes") or []]
    return fs


def citas(obj, datos, carpeta, buscador=None):
    """Capítulos que cita una entidad (o una relación, carpeta 'relacion'), tal como los ve la página de un capítulo
    en el sitio: sus fuentes que son capítulos de la TNM (rut-1, hch-16 o cualquier URL nwtsty/<num>/<cap>) y las
    citas escritas en los campos de TEXTOS_CITA. Una carta cita además todos los capítulos de su propio libro."""
    buscador = buscador or Citas(datos["libros"])
    por_num = {l.get("num"): l for l in datos["libros"]}
    out = set()
    for fid in _fuentes_cita(obj, carpeta):
        m = RE_NWTSTY.search(str((datos["fuentes"].get(fid) or {}).get("url") or ""))
        libro = por_num.get(int(m.group(1))) if m else None
        if libro:
            out.add((libro["slug"], int(m.group(2))))
    for t in TEXTOS_CITA.get(carpeta, lambda o: [])(obj):
        if isinstance(t, str):
            out |= buscador.capitulos(t)
    if carpeta == "cartas":
        libro = next((l for l in datos["libros"] if l.get("slug") == obj.get("id")), None)
        if libro:
            out.update((libro["slug"], c) for c in range(1, int(libro.get("capitulos") or 0) + 1))
    return out


# ---------------------------------------------------------------- referencias de un tramo

def _indices(datos):
    return {carpeta: {o.get("id"): o for o in datos.get(carpeta) or []} for carpeta in PREFIJOS.values()}


def resolver(ref, datos, idx=None):
    """«persona:rut» -> (carpeta, objeto) ; «relacion:rut/pariente/noemi» -> ('relacion', [relaciones que casan]).
    Devuelve (None, motivo) si no existe."""
    idx = idx or _indices(datos)
    tipo, _, oid = str(ref).partition(":")
    if not oid:
        return None, f"'{ref}' no tiene la forma tipo:id"
    if tipo in PREFIJOS:
        o = idx[PREFIJOS[tipo]].get(oid)
        return (PREFIJOS[tipo], o) if o else (None, f"'{ref}' no existe en data/{PREFIJOS[tipo]}/")
    if tipo == "relacion":
        partes = oid.split("/")
        if len(partes) != 3 or not all(partes):
            return None, f"'{ref}' debe ser relacion:<persona>/<tipo>/<persona o lugar>"
        pid, rtipo, otro = partes
        p = idx["personas"].get(pid)
        if not p:
            return None, f"'{ref}': la persona '{pid}' no existe en data/personas/"
        rels = [r for r in p.get("relaciones") or [] if isinstance(r, dict) and r.get("tipo") == rtipo
                and otro in (r.get("persona"), r.get("lugar"))]
        if not rels:
            return None, f"'{ref}': {p.get('_fichero', pid)} no tiene una relación {rtipo} con '{otro}'"
        return "relacion", rels
    return None, f"'{ref}': el tipo '{tipo}' no es uno de {sorted([*PREFIJOS, 'relacion'])}"


def errores_referencias(datos):
    """Cada id que nombra un tramo (entidades y menciona) existe. Lo usa build.integridad."""
    errores = []
    idx = _indices(datos)
    for slug, obj in sorted((datos.get("cobertura") or {}).items()):
        for c, cap in sorted(_capitulos(obj).items()):
            for i, t in enumerate((cap or {}).get("tramos") or [] if isinstance(cap, dict) else []):
                if not isinstance(t, dict):
                    continue
                for campo in ("entidades", "menciona"):
                    for ref in t.get(campo) or [] if isinstance(t.get(campo), list) else []:
                        carpeta, motivo = resolver(ref, datos, idx)
                        if carpeta is None:
                            errores.append(f"{obj['_fichero']} capítulo {c}, tramo {t.get('v')}: {campo}: {motivo}")
    return errores


# ---------------------------------------------------------------- reglas (validate.py)

def comprobar(datos, hoy=None):
    """Reglas de data/cobertura/: forma, tramos contiguos sin solapes dentro del capítulo, omitidos, completo sin
    huecos, fechas de lectura y que cada entidad producida cite el capítulo. Que los ids existan lo comprueba
    errores_referencias (vía build.integridad)."""
    hoy = hoy or datetime.date.today().isoformat()
    errores = []
    err = errores.append
    libros = {l.get("slug"): l for l in datos["libros"]}
    idx = _indices(datos)
    idx["_citas"] = Citas(datos["libros"])
    for slug, obj in sorted((datos.get("cobertura") or {}).items()):
        f = obj["_fichero"]
        if set(obj) - CAMPOS_FICHERO - {"_fichero", "_nombre_fichero"}:
            err(f"{f}: campos desconocidos {sorted(set(obj) - CAMPOS_FICHERO - {'_fichero', '_nombre_fichero'})}")
        if obj.get("libro") != obj["_nombre_fichero"]:
            err(f"{f}: libro '{obj.get('libro')}' no coincide con el nombre del fichero")
        libro = libros.get(obj["_nombre_fichero"])
        if libro is None:
            err(f"{f}: '{obj['_nombre_fichero']}' no es un slug de data/libros.yaml")
            continue
        if not versiculos(libro) or len(versiculos(libro)) != int(libro.get("capitulos") or 0):
            err(f"{f}: data/libros.yaml no da 'versiculos' de {libro.get('nombre')}, así que no se puede comprobar "
                f"qué versículos faltan")
            continue
        caps = obj.get("capitulos")
        if not isinstance(caps, dict) or not caps:
            err(f"{f}: 'capitulos' debe ser un mapa no vacío {{<número>: {{estado, tramos}}}}")
            continue
        n_caps = int(libro.get("capitulos"))
        vistos = {}
        for k, cap in caps.items():
            c = _cap(k)
            donde = f"{f} capítulo {k}"
            if c is None or not 1 <= c <= n_caps:
                err(f"{donde}: {libro['nombre']} tiene los capítulos 1 a {n_caps}")
                continue
            if c in vistos:
                err(f"{donde}: el capítulo {c} ya está como {vistos[c]!r}; cada capítulo va una sola vez (1 y '1' son "
                    f"el mismo)")
                continue
            vistos[c] = k
            comprobar_capitulo(datos, libro, c, cap, donde, hoy, err, idx)
    errores.extend(sin_apuntar(datos, idx))
    return errores


def sin_apuntar(datos, idx=None):
    """La comprobación inversa: cada entidad o relación que cita un capítulo completo tiene que salir en uno de sus
    tramos, en entidades o en menciona. Si no, el sitio la pone en la página del capítulo sin que la cobertura diga
    por qué, y el capítulo no está rendido en cuentas."""
    idx = idx or _indices(datos)
    buscador = idx.get("_citas") or Citas(datos["libros"])
    completos = {}                                   # (slug, capítulo) -> (fichero, {referencias de sus tramos})
    for slug, obj in (datos.get("cobertura") or {}).items():
        for c, cap in _capitulos(obj).items():
            if isinstance(cap, dict) and cap.get("estado") == "completo":
                refs = set()
                for t in cap.get("tramos") or [] if isinstance(cap.get("tramos"), list) else []:
                    if isinstance(t, dict):
                        for campo in ("entidades", "menciona"):
                            refs.update(x for x in t.get(campo) or [] if isinstance(x, str))
                completos[(slug, c)] = (obj["_fichero"], refs)
    if not completos:
        return []
    errores = []

    def mirar(ref, o, carpeta):
        for clave in sorted(citas(o, datos, carpeta, buscador) & completos.keys()):
            fichero, refs = completos[clave]
            if ref not in refs:
                errores.append(f"{fichero} capítulo {clave[1]}: {ref} cita el capítulo, pero no está en ningún tramo; "
                               f"ponlo en entidades o en menciona del tramo que lo nombra")

    for prefijo, carpeta in PREFIJOS.items():
        for o in datos.get(carpeta) or []:
            mirar(f"{prefijo}:{o.get('id')}", o, carpeta)
            if carpeta == "personas":
                for r in o.get("relaciones") or []:
                    if isinstance(r, dict) and r.get("tipo") and (r.get("persona") or r.get("lugar")):
                        mirar(f"relacion:{o.get('id')}/{r['tipo']}/{r.get('persona') or r.get('lugar')}", r, "relacion")
    return errores


def comprobar_capitulo(datos, libro, c, cap, donde, hoy, err, idx):
    if not isinstance(cap, dict):
        err(f"{donde}: debe ser un mapa {{estado, revisado, tramos}}")
        return
    if set(cap) - CAMPOS_CAPITULO:
        err(f"{donde}: campos desconocidos {sorted(set(cap) - CAMPOS_CAPITULO)}")
    estado = cap.get("estado")
    if estado not in ESTADOS_CAPITULO:
        err(f"{donde}: estado '{estado}' no es pendiente ni completo")
    if "revisado" in cap and not _dia_ok(cap["revisado"], hoy):
        err(f"{donde}: revisado '{cap['revisado']}' no es un día AAAA-MM-DD hasta hoy")
    tramos = cap.get("tramos")
    if tramos is None:
        tramos = []
    if not isinstance(tramos, list):
        err(f"{donde}: tramos debe ser una lista")
        return
    if estado == "completo" and not tramos:
        err(f"{donde}: completo sin tramos")
    req = requeridos(libro, c)
    ultimo = versiculos(libro)[c - 1]
    om = omitidos(libro).get(c, set())
    previo = None                                # (a, b) del tramo anterior
    cubiertos = set()
    for i, t in enumerate(tramos):
        td = f"{donde}, tramo {i + 1}"
        if not isinstance(t, dict):
            err(f"{td}: debe ser un mapa {{v, tipo, entidades, menciona, nota, revisado}}")
            continue
        td = f"{donde}, tramo {t.get('v')}"
        if set(t) - CAMPOS_TRAMO:
            err(f"{td}: campos desconocidos {sorted(set(t) - CAMPOS_TRAMO)}")
        r = rango(t.get("v"))
        if r is None:
            err(f"{td}: v debe ser un versículo (7) o un tramo «1-5»")
            continue
        a, b = r
        if a > b:
            err(f"{td}: el tramo empieza después de acabar")
            continue
        if a < 1 or b > ultimo:
            err(f"{td}: fuera del capítulo ({libro['nombre']} {c} tiene del 1 al {ultimo})")
        propios = set(range(a, b + 1)) & req
        if not propios and a >= 1 and b <= ultimo:
            err(f"{td}: solo cubre versículos que la TNM no incluye ({texto_tramos(om)}); quítalo")
        if previo is not None:
            if a <= previo[1]:
                err(f"{td}: se solapa con el tramo anterior ({previo[0]}-{previo[1]}) o va antes que él; "
                    f"los tramos van en orden y sin repetir versículos")
            else:
                hueco = set(range(previo[1] + 1, a)) & req
                if hueco:
                    err(f"{td}: hay un hueco entre este tramo y el anterior (faltan {texto_tramos(hueco)}); "
                        f"los tramos van seguidos")
        previo = (a, max(b, previo[1]) if previo else b)
        cubiertos |= propios
        if t.get("tipo") not in TIPOS_TRAMO:
            err(f"{td}: tipo '{t.get('tipo')}' no es uno de {sorted(TIPOS_TRAMO)}")
        rev = t.get("revisado", cap.get("revisado"))
        if rev is None:
            err(f"{td}: sin 'revisado' (en el tramo o en el capítulo): el día en que se leyó")
        elif "revisado" in t and not _dia_ok(t["revisado"], hoy):
            err(f"{td}: revisado '{t['revisado']}' no es un día AAAA-MM-DD hasta hoy")
        listas = {}
        for campo in ("entidades", "menciona"):
            v = t.get(campo)
            if v is None:
                listas[campo] = []
            elif not isinstance(v, list) or not all(isinstance(x, str) for x in v):
                err(f"{td}: {campo} debe ser una lista de referencias tipo:id")
                listas[campo] = []
            else:
                listas[campo] = v
                repes = sorted({x for x in v if v.count(x) > 1})
                if repes:
                    err(f"{td}: {campo} repite {', '.join(repes)}")
        ambas = sorted(set(listas["entidades"]) & set(listas["menciona"]))
        if ambas:
            err(f"{td}: {', '.join(ambas)} está en entidades y en menciona; va en una sola")
        if not listas["entidades"] and not str(t.get("nota") or "").strip():
            err(f"{td}: sin entidades hace falta una 'nota' que diga qué hay en estos versículos")
        for ref in listas["entidades"]:
            carpeta, obj = resolver(ref, datos, idx)
            if carpeta is None:
                continue                          # lo informa errores_referencias
            if carpeta == "personas" and "perspicacia" not in obj:
                err(f"{td}: {ref} no lleva la clave 'perspicacia' (<documento>#<entrada> de su artículo, o null si "
                    f"no tiene); con ella se ve que dos libros no crean a la misma persona dos veces")
            objs = obj if carpeta == "relacion" else [obj]
            if not any((libro["slug"], c) in citas(o, datos, carpeta, idx.get("_citas")) for o in objs):
                sugerencia = f"'{libro['slug']}-{c}'"
                err(f"{td}: {ref} no cita {libro['nombre']} {c}; añade {sugerencia} a sus fuentes o la cita a su "
                    f"razon (a pasajes en un evento), o pásalo a 'menciona' si el capítulo solo lo nombra")
    if estado == "completo":
        falta = req - cubiertos
        if falta:
            err(f"{donde}: dice completo, pero faltan los versículos {texto_tramos(falta)}")


def _dia_ok(v, hoy):
    return isinstance(v, str) and bool(DIA.match(v)) and v <= hoy


def validar_libro(l, donde, err):
    """versiculos y omitidos de una entrada de data/libros.yaml (estructura, sin fuentes)."""
    if "versiculos" in l:
        vs = l["versiculos"]
        if not isinstance(vs, list) or not all(isinstance(n, int) and not isinstance(n, bool) and n > 0 for n in vs):
            err(f"{donde}: versiculos debe ser una lista de enteros positivos, uno por capítulo")
        elif len(vs) != l.get("capitulos"):
            err(f"{donde}: versiculos tiene {len(vs)} capítulos y capitulos dice {l.get('capitulos')}")
    if "omitidos" in l:
        om = l["omitidos"]
        if not isinstance(om, dict):
            err(f"{donde}: omitidos debe ser un mapa {{<capítulo>: [versículos]}}")
            return
        vs = versiculos(l)
        if not vs:
            err(f"{donde}: omitidos necesita versiculos")
            return
        for k, lista in om.items():
            c = _cap(k)
            if c is None or not 1 <= c <= len(vs):
                err(f"{donde}: omitidos: el capítulo {k} no existe")
                continue
            for v in lista if isinstance(lista, list) else [lista]:
                r = rango(v)
                if r is None or r[0] < 1 or r[1] > vs[c - 1] or r[0] > r[1]:
                    err(f"{donde}: omitidos {c}: '{v}' no es un versículo del 1 al {vs[c - 1]}")


# ---------------------------------------------------------------- informe (build.py)

def informe(datos):
    """Líneas de docs/investigacion/registro/cobertura.md."""
    filas = resumen(datos)
    tot = total(filas)
    out = ["## Por libro", "",
           "| Libro | Capítulos completos | Versículos leídos | Porcentaje |", "|---|---|---|---|"]
    for f in filas:
        nombre = f"[{f['nombre']}](../../../data/cobertura/{f['slug']}.yaml)" if f["con_fichero"] else f["nombre"]
        leidos = f"{f['leidos']} de {f['versiculos']}" if f["versiculos"] is not None else "sin recuento"
        out.append(f"| {nombre} | {f['completos']} de {f['capitulos']} | {leidos} | "
                   f"{porcentaje(f['leidos'], f['versiculos'])} |")
    leidos = f"{tot['leidos']} de {tot['versiculos']}"
    if tot["sin_recuento"]:
        leidos += f" (sin contar {tot['sin_recuento']} libros sin recuento)"
    out.append(f"| **Total** | {tot['completos']} de {tot['capitulos']} | {leidos} | "
               f"{porcentaje(tot['leidos'], tot['versiculos'] if not tot['sin_recuento'] else None)} |")
    out.append("")
    medias = []
    for slug, obj in sorted((datos.get("cobertura") or {}).items(),
                            key=lambda x: next((l.get("num") for l in datos["libros"] if l.get("slug") == x[0]), 99)):
        libro = next((l for l in datos["libros"] if l.get("slug") == slug), None)
        if libro is None:
            continue
        for c, cap in sorted(_capitulos(obj).items()):
            if isinstance(cap, dict) and cap.get("estado") != "completo" and cap.get("tramos"):
                req = requeridos(libro, c) or set()
                hechos = set()
                for a, b, _ in tramos_de(cap):
                    hechos.update(range(a, b + 1))
                medias.append(f"- {libro['nombre']} {c}: faltan {texto_tramos(req - hechos) or 'ninguno (falta marcarlo completo)'}")
    out.extend(["## Capítulos empezados", ""])
    out.extend(medias or ["Ninguno."])
    out.append("")
    return out, tot


def para_el_sitio(datos):
    """Resumen corto para data.json: solo los libros con fichero de cobertura."""
    return {f["slug"]: {"capitulos": f["capitulos"], "completos": f["completos"], "versiculos": f["versiculos"],
                        "leidos": f["leidos"]}
            for f in resumen(datos) if f["con_fichero"]}


# ---------------------------------------------------------------- main

def main(argv=None):
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import build  # noqa: E402  (build importa este módulo; aquí solo hace falta para cargar los datos)
    ap = argparse.ArgumentParser(description="Cobertura de la Biblia por libro y en total.")
    ap.add_argument("--data", default=str(build.RAIZ / "data"), help="directorio de datos (por defecto data/)")
    ap.add_argument("--faltan", metavar="LIBRO", help="lista los versículos sin leer de ese libro (slug)")
    ap.add_argument("--fallar", action="store_true", help="código 1 si algún capítulo no está completo")
    args = ap.parse_args(argv)
    datos, _ = build.cargar(args.data)
    if args.faltan:
        lista = faltan(datos, args.faltan)
        if lista is None:
            print(f"cobertura: '{args.faltan}' no es un slug de data/libros.yaml", file=sys.stderr)
            return 2
        libro = next(l for l in datos["libros"] if l.get("slug") == args.faltan)
        for c, estado, falta in lista:
            if falta is None:
                print(f"{libro['nombre']} {c} ({estado}): sin recuento de versículos en data/libros.yaml")
            elif falta:
                print(f"{libro['nombre']} {c} ({estado}): faltan {texto_tramos(falta)}")
            else:
                print(f"{libro['nombre']} {c} ({estado}): todo leído, falta marcarlo completo")
        if not lista:
            print(f"{libro['nombre']}: completo")
    else:
        filas = resumen(datos)
        ancho = max(len(f["nombre"]) for f in filas)
        for f in filas:
            leidos = f"{f['leidos']}/{f['versiculos']}" if f["versiculos"] is not None else "sin recuento"
            print(f"{f['nombre']:<{ancho}}  {f['completos']:>3}/{f['capitulos']:<3} capítulos  {leidos:>13}  "
                  f"{porcentaje(f['leidos'], f['versiculos'])}")
        tot = total(filas)
        extra = f", {tot['sin_recuento']} libros sin recuento" if tot["sin_recuento"] else ""
        print(f"Total: {tot['completos']}/{tot['capitulos']} capítulos completos, {tot['leidos']}/{tot['versiculos']} "
              f"versículos leídos ({porcentaje(tot['leidos'], None if tot['sin_recuento'] else tot['versiculos'])}"
              f"{extra}).")
    if args.fallar:
        tot = total(resumen(datos))
        if tot["completos"] < tot["capitulos"]:
            print(f"cobertura --fallar: {tot['capitulos'] - tot['completos']} capítulos sin completar.", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
