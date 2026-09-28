#!/usr/bin/env python3
"""Índice de videos de jw.org que mencionan cada lugar y cada persona.

Lee una copia privada de los subtítulos en español (.vtt) de los videos de
jw.org, cuenta cuántas veces aparece cada nombre de scripts/videos/nombres/*.yaml
(lugares) y de scripts/videos/personas/*.yaml (personas) y guarda, por lugar y
por persona, los videos públicos que lo mencionan al menos dos veces.

Los nombres están repartidos en un fichero por carril (nombres/pablo.yaml, ...);
un mismo id en dos ficheros es un error, y también lo es un id que no está en
data/lugares o data/personas. Una persona no puede buscarse por un nombre suelto
que llevan varias personas («Juan», «María»): hace falta una forma calificada.

Los subtítulos tienen derechos de autor de jw.org: la carpeta vive fuera del
repositorio y ningún texto suyo sale de ella. Al repositorio solo llega nuestro
índice: id del video, título, URL pública, fecha de publicación y recuentos.

Uso:
    BE_VTT_DIR=/ruta/privada python3 scripts/videos/indexar.py
    BE_VTT_DIR=/ruta/privada python3 scripts/videos/indexar.py --salida /tmp/prueba --sin-red
    BE_VTT_DIR=/ruta/privada python3 scripts/videos/indexar.py --fugas

--salida DIR escribe data/videos*, site/videos*.json debajo de DIR en vez del
repositorio. --sin-red no pide nada a jw.org: usa la caché y, para lo que no
está en ella, el título y la fecha del catálogo local con el enlace del buscador
(solo para pruebas). --fugas no indexa: comprueba que el repositorio no contiene
texto de los subtítulos (8 palabras seguidas) ni nombres de sus ficheros.

La carpeta de BE_VTT_DIR contiene los .vtt y, si existe, vtts.json (el catálogo
de la herramienta de descarga, con la clave natural de cada fichero). La caché de
las consultas a jw.org se guarda en esa misma carpeta, así que una segunda
ejecución no hace ninguna petición de red.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import os
import re
import sqlite3
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
NOMBRES = Path(__file__).with_name("nombres")
PERSONAS = Path(__file__).with_name("personas")
# tipo -> (carpeta de datos con sus ids, carpeta YAML de salida, JSON del sitio), rutas relativas a la raíz
SALIDAS = {
    "lugar": ("data/lugares", "data/videos", "site/videos.json"),
    "persona": ("data/personas", "data/videos-personas", "site/videos-personas.json"),
}
CACHE = ".biblical-earth-videos-cache.json"

MINIMO = 2  # menciones mínimas para que un video entre en el índice
MAXIMO = 12  # videos por lugar
VENTANA = 250  # caracteres a cada lado para desambiguar "Antioquía"
AGENTE = "Mozilla/5.0"
TITULO_PORTADA = "Sitio oficial de los testigos de Jehová"

# Nombres que llevan varias personas de la Biblia (o muchas personas de hoy en las experiencias). Una persona no
# se busca por uno de ellos suelto: hace falta una forma calificada («Juan el Bautista», «Herodes Agripa»).
AMBIGUOS = {"juan", "maria", "simon", "santiago", "judas", "jose", "herodes", "felipe", "zacarias", "ananias",
            "jacobo", "lazaro", "dario", "agripa", "artajerjes", "asuero", "jehoram", "joas", "jeroboan", "azarias",
            "eleazar"}

# Una persona que da nombre a un libro («Nehemías 8:10», «Primera a Timoteo») no cuenta cuando el nombre cita el libro.
CITA_DESPUES = re.compile(r"[\s,]*(?:\d|cap[ií]tulo)", re.I)
CITA_ANTES = re.compile(r"(?:(?<!\w)[123]\s+|(?:primer[oa]?|segund[oa]|tercer[oa]?)\s+(?:carta\s+)?(?:a|de)\s+(?:los\s+)?"
                        r"|cap[ií]tulos?\s+\d+\s+de\s+(?:el\s+libro\s+de\s+)?|libro\s+de\s+)$", re.I)


# ---------------------------------------------------------------- nombres/*.yaml

def leer_nombres(ruta: Path) -> dict[str, dict]:
    """Lee el subconjunto de YAML de un fichero de nombres: claves de primer nivel,
    y debajo `clave: valor` o `clave: [a, b]`. Un id repetido en el fichero es un error."""
    lugares: dict[str, dict] = {}
    actual = None
    for n, linea in enumerate(ruta.read_text(encoding="utf-8").splitlines(), 1):
        if not linea.strip() or linea.lstrip().startswith("#"):
            continue
        if not linea.startswith(" "):
            actual = linea.rstrip().rstrip(":")
            if actual in lugares:
                sys.exit(f"{ruta.name}:{n}: el id '{actual}' sale dos veces")
            lugares[actual] = {}
            continue
        clave, _, valor = linea.strip().partition(":")
        valor = valor.strip()
        if actual is None or not clave:
            sys.exit(f"{ruta.name}:{n}: línea no reconocida")
        if valor.startswith("["):
            valor = [v.strip().strip("\"'") for v in valor.strip("[]").split(",") if v.strip()]
        lugares[actual][clave] = valor
    return lugares


def leer_carpeta(carpeta: Path, vetados: set[str] = frozenset()) -> dict[str, dict]:
    """Junta todos los *.yaml de una carpeta de nombres. Un id en dos ficheros es un error que nombra los dos.
    Un nombre de `vetados` (comparado sin tildes ni mayúsculas) usado suelto también es un error."""
    todo: dict[str, dict] = {}
    origen: dict[str, str] = {}
    for ruta in sorted(carpeta.glob("*.yaml")):
        for oid, d in leer_nombres(ruta).items():
            if oid in todo:
                sys.exit(f"{carpeta.name}/{origen[oid]} y {carpeta.name}/{ruta.name}: el id '{oid}' sale dos veces")
            for nombre in d.get("nombres", []):
                if sin_tildes(nombre).casefold() in vetados:
                    sys.exit(f"{carpeta.name}/{ruta.name}: '{oid}' busca «{nombre}» suelto, que nombra a varias "
                             "personas; usa una forma calificada («Juan el Bautista»)")
            todo[oid], origen[oid] = d, ruta.name
    return todo


def comprobar_ids(tipos: dict[str, dict[str, dict]], carpetas: dict[str, Path], prueba: bool) -> None:
    """Cada id de nombres/ y personas/ tiene que existir en data/. En una prueba (--salida) solo avisa."""
    for tipo, entidades in tipos.items():
        conocidos = {p.stem for p in carpetas[tipo].glob("*.yaml")}
        sueltos = sorted(set(entidades) - conocidos)
        sin_nombres = sorted(conocidos - set(entidades))
        if sueltos:
            aviso = f"{tipo}: ids sin fichero en {SALIDAS[tipo][0]}: {', '.join(sueltos)}"
            if not prueba:
                sys.exit(aviso)
            print(f"  aviso (prueba): {aviso}", file=sys.stderr)
        if sin_nombres:
            print(f"  {tipo}: {len(sin_nombres)} ids de {SALIDAS[tipo][0]} sin nombres que buscar: "
                  f"{', '.join(sin_nombres)}", file=sys.stderr)


# ---------------------------------------------------------------- texto

def sin_tildes(texto: str) -> str:
    descompuesto = unicodedata.normalize("NFD", texto)
    return unicodedata.normalize("NFC", "".join(c for c in descompuesto if unicodedata.category(c) != "Mn"))


def texto_de_vtt(ruta: Path) -> str:
    """Devuelve el texto hablado de un .vtt: sin cabecera, tiempos, ids ni etiquetas."""
    lineas = []
    bloque_nota = False
    for linea in ruta.read_text(encoding="utf-8", errors="replace").splitlines():
        s = linea.strip()
        if not s:
            bloque_nota = False
            continue
        if s.startswith("WEBVTT") or s.startswith(("NOTE", "STYLE", "REGION")):
            bloque_nota = not s.startswith("WEBVTT")
            continue
        if bloque_nota or "-->" in s or s.isdigit():
            continue
        lineas.append(re.sub(r"<[^>]*>", "", s))
    texto = html.unescape(" ".join(lineas)).replace(" ", " ")
    return unicodedata.normalize("NFC", re.sub(r"\s+", " ", texto))


def patron(frase: str, flags: int = 0) -> re.Pattern:
    """Palabra o frase completa. Entre palabras admite espacios y comas: «Mira en Licia» casa con «Mira, en Licia»."""
    cuerpo = r"[\s,]+".join(re.escape(p) for p in frase.split())
    return re.compile(rf"(?<!\w){cuerpo}(?!\w)", flags)


def solapa(tramo: tuple[int, int], tramos: list[tuple[int, int]]) -> bool:
    return any(tramo[0] < b and a < tramo[1] for a, b in tramos)


class Buscador:
    """Cuenta menciones de cada lugar en un texto."""

    def __init__(self, lugares: dict[str, dict], citas: bool = False):
        self.lugares = lugares
        self.citas = citas  # personas: un nombre que cita un libro de la Biblia no cuenta
        self.grupos: dict[str, list[str]] = {}
        for lid, d in lugares.items():
            if d.get("ambiguo"):
                self.grupos.setdefault(d["ambiguo"], []).append(lid)
        self.compilado = {}
        for lid, d in lugares.items():
            estricto = d.get("acentos") == "estricto"
            prep = (lambda s: s) if estricto else sin_tildes
            self.compilado[lid] = {
                "estricto": estricto,
                "nombres": [(n, patron(prep(n))) for n in d.get("nombres", [])],
                "gentilicios": [(g, patron(prep(g), re.I)) for g in d.get("gentilicios", [])],
                "excluir": [patron(prep(e), re.I) for e in d.get("excluir", [])],
                "contexto": [patron(sin_tildes(c), re.I) for c in d.get("contexto", [])],
            }

    def contar(self, texto: str) -> dict[str, dict[str, int]]:
        plano = sin_tildes(texto)
        resultado: dict[str, dict[str, int]] = {}
        tramos_explicitos: list[tuple[int, int]] = []

        def sumar(lid: str, termino: str) -> None:
            resultado.setdefault(lid, {}).setdefault(termino, 0)
            resultado[lid][termino] += 1

        for lid, c in self.compilado.items():
            t = texto if c["estricto"] else plano
            excluidos = [m.span() for p in c["excluir"] for m in p.finditer(t)]
            for termino, p in c["nombres"]:
                for m in p.finditer(t):
                    if solapa(m.span(), excluidos):
                        continue
                    if self.citas and (CITA_DESPUES.match(t, m.end(), m.end() + 12)
                                       or CITA_ANTES.search(t[max(0, m.start() - 40):m.start()])):
                        continue
                    sumar(lid, termino)
                    if self.lugares[lid].get("ambiguo"):
                        tramos_explicitos.append(m.span())
            for termino, p in c["gentilicios"]:
                for m in p.finditer(t):
                    if solapa(m.span(), excluidos) or re.match(r"\s*\d", t[m.end():m.end() + 3]):
                        continue
                    sumar(lid, termino)

        for palabra, candidatos in self.grupos.items():
            for m in patron(sin_tildes(palabra)).finditer(plano):
                if solapa(m.span(), tramos_explicitos):
                    continue
                entorno = plano[max(0, m.start() - VENTANA):m.end() + VENTANA]
                puntos = {lid: sum(len(p.findall(entorno)) for p in self.compilado[lid]["contexto"])
                          for lid in candidatos}
                mejor = max(puntos.values())
                empatados = [lid for lid in candidatos if puntos[lid] == mejor]
                if len(empatados) > 1:
                    defecto = [lid for lid in empatados if self.lugares[lid].get("por_defecto")]
                    empatados = defecto or empatados
                sumar(empatados[0], f"{palabra} (sin apellido)")
        return resultado


# ---------------------------------------------------------------- catálogo local

def clave_natural(nombre_fichero: str, catalogo: dict[str, dict]) -> tuple[str, str] | None:
    """Devuelve (id mostrado, clave natural sin idioma) de un fichero .vtt."""
    item = catalogo.get(nombre_fichero)
    if item and item.get("languageAgnosticNaturalKey"):
        lank = item["languageAgnosticNaturalKey"]
        m = re.fullmatch(r"docid-(\d+)_\d+_VIDEO", lank)
        return (m.group(1) if m else lank), lank
    m = re.fullmatch(r"(\d+)_S_cnt_(\d+)(?:_r\d+P)?\.vtt", nombre_fichero)
    if m:
        return m.group(1), f"docid-{m.group(1)}_{m.group(2)}_VIDEO"
    return None


def leer_catalogo(carpeta: Path) -> dict[str, dict]:
    catalogo: dict[str, dict] = {}
    ruta = carpeta / "vtts.json"
    if ruta.exists():
        datos = json.loads(ruta.read_text(encoding="utf-8"))
        # Solo se guardan metadatos; el campo de texto se descarta aquí mismo.
        catalogo = {d["filename"]: {k: v for k, v in d.items() if k != "text"} for d in datos if "filename" in d}
    # La herramienta de descarga actual lleva su registro en jw_media.db (tabla downloaded_vtts). Su natural_key
    # lleva el idioma tras el símbolo («pub-whbs_S_1_VIDEO», «pub-jwb_S_201703_12_VIDEO»); la clave sin idioma
    # se obtiene quitándolo («pub-whbs_1_VIDEO», «pub-jwb_201703_12_VIDEO»), la misma regla que cumplen los 1211
    # pares de vtts.json.
    db = carpeta / "jw_media.db"
    if db.exists():
        con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
        filas = con.execute("SELECT filename, natural_key, first_published, title FROM downloaded_vtts "
                            "WHERE status = 'success' AND filename <> '' AND natural_key IS NOT NULL "
                            "ORDER BY formatCode = 'VIDEO'").fetchall()   # VIDEO al final: gana si hay las dos
        con.close()
        for fichero, clave, publicado, titulo in filas:
            if fichero in catalogo and "naturalKey" in catalogo[fichero]:
                continue                  # vtts.json manda
            catalogo[fichero] = {"languageAgnosticNaturalKey": re.sub(r"^((?:pub|docid)-[^_]+)_S_", r"\1_", clave),
                                 "firstPublished": publicado, "title": titulo}
    return catalogo


# ---------------------------------------------------------------- red

class Resolutor:
    """Obtiene URL pública, título y fecha de un video, con caché en disco."""

    def __init__(self, carpeta: Path, sin_red: bool = False):
        self.ruta = carpeta / CACHE
        self.cache = json.loads(self.ruta.read_text(encoding="utf-8")) if self.ruta.exists() else {}
        self.peticiones = 0
        self.sin_red = sin_red
        self.provisionales = 0  # videos que --sin-red da con datos del catálogo local, sin comprobar en jw.org

    def _get(self, url: str) -> tuple[str, bytes]:
        if self.peticiones:
            time.sleep(1)
        self.peticiones += 1
        req = urllib.request.Request(url, headers={"User-Agent": AGENTE})
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.geturl(), r.read()

    def resolver(self, lank: str, local: dict) -> dict | None:
        if lank in self.cache:
            e = self.cache[lank]
            return e if e.get("ok") else None
        parametro = f"docid={lank.split('-')[1].split('_')[0]}" if lank.startswith("docid-") else f"lank={lank}"
        if self.sin_red:
            self.provisionales += 1
            publicado = local.get("firstPublished")
            return {"ok": True, "url": f"https://www.jw.org/finder?wtlocale=S&{parametro}",
                    "titulo": (local.get("title") or lank).strip(), "publicado": publicado[:10] if publicado else None}
        try:
            url, cuerpo = self._get(f"https://www.jw.org/finder?wtlocale=S&{parametro}")
            m = re.search(r"<title>(.*?)</title>", cuerpo.decode("utf-8", "replace"), re.S)
            titulo_pagina = html.unescape(m.group(1)).strip() if m else ""
            # Portada: título genérico o una URL que es solo la raíz de un idioma (jw.org/es/, jw.org/en/).
            portada = re.fullmatch(r"https://www\.jw\.org(/[a-z-]+)?/?", url) is not None
            if not titulo_pagina or titulo_pagina.startswith(TITULO_PORTADA) or portada:
                self.cache[lank] = {"ok": False, "motivo": "el buscador lleva a la portada"}
                self.guardar()
                return None
            _, api = self._get(f"https://b.jw-cdn.org/apis/mediator/v1/media-items/S/{lank}")
            medios = json.loads(api).get("media") or [{}]
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as err:
            print(f"  aviso: {lank} sin resolver ({err}); se reintentará", file=sys.stderr)
            return None
        titulo = medios[0].get("title") or re.sub(r"\s*\|[^|]*jw\.org\s*$", "", titulo_pagina)
        publicado = medios[0].get("firstPublished") or local.get("firstPublished")
        self.cache[lank] = {
            "ok": True,
            "url": url,
            "titulo": titulo.strip(),
            "publicado": publicado[:10] if publicado else None,
        }
        self.guardar()  # así una ejecución cortada no repite peticiones
        return self.cache[lank]

    def guardar(self) -> None:
        if self.sin_red:
            return
        self.ruta.write_text(json.dumps(self.cache, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")


def titulo_base(titulo: str) -> str:
    """Título sin la marca de la versión con audiodescripciones, para no listar dos veces el mismo video."""
    return re.sub(r"\s*\(con audiodescripci[oó]n(es)?\)\s*$", "", titulo, flags=re.I).strip().casefold()


def con_audiodescripcion(titulo: str) -> bool:
    return titulo_base(titulo) != titulo.strip().casefold()


# ---------------------------------------------------------------- salida

def yaml_escalar(v) -> str:
    if v is None:
        return "null"
    if isinstance(v, int):
        return str(v)
    return json.dumps(v, ensure_ascii=False)  # una cadena JSON es YAML válido


def escribir_yaml(carpeta: Path, tipo: str, oid: str, hoy: str, videos: list[dict]) -> None:
    quien = "este lugar" if tipo == "lugar" else "a esta persona"
    lineas = [
        "# Generado por scripts/videos/indexar.py. No editar a mano.",
        f"# Videos públicos de jw.org que nombran {quien}; ver docs/investigacion/videos-jw.md.",
        f"{tipo}: {oid}",
        f"generado: {yaml_escalar(hoy)}",
        "videos:",
    ]
    for v in videos:
        lineas.append(f"  - docid: {yaml_escalar(v['docid'])}")
        for k in ("titulo", "url", "publicado", "menciones"):
            lineas.append(f"    {k}: {yaml_escalar(v[k])}")
        lineas.append("    terminos:")
        for termino, n in v["terminos"].items():
            lineas.append(f"      {yaml_escalar(termino)}: {n}")
    (carpeta / f"{oid}.yaml").write_text("\n".join(lineas) + "\n", encoding="utf-8")


def elegir(hallazgos: dict[str, dict], resolutor: Resolutor, locales: dict[str, dict]) -> list[dict]:
    """Los MAXIMO videos con más menciones de un lugar o persona, publicados y sin duplicar audiodescripciones."""
    orden = sorted(hallazgos.items(), key=lambda kv: (-kv[1]["menciones"], kv[1]["docid"]))
    elegidos: list[dict] = []
    for lank, h in orden:
        if len(elegidos) == MAXIMO:
            break
        info = resolutor.resolver(lank, locales.get(lank, {}))
        if not info:
            continue
        nuevo = {"docid": h["docid"], "titulo": info["titulo"], "url": info["url"],
                 "publicado": info["publicado"], "menciones": h["menciones"], "terminos": h["terminos"]}
        # El mismo video con y sin audiodescripciones: se queda uno, el de más menciones y, si empatan,
        # el que no lleva audiodescripciones.
        previo = next((e for e in elegidos if titulo_base(e["titulo"]) == titulo_base(nuevo["titulo"])), None)
        if previo is None:
            elegidos.append(nuevo)
        elif (previo["menciones"] == nuevo["menciones"] and con_audiodescripcion(previo["titulo"])
              and not con_audiodescripcion(nuevo["titulo"])):
            elegidos[elegidos.index(previo)] = nuevo
    return elegidos


# ---------------------------------------------------------------- fugas

EXT_BINARIAS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".pdf", ".woff", ".woff2", ".ttf", ".otf",
                ".mp4", ".webm", ".mp3", ".zip", ".gz", ".db", ".sqlite", ".pbf", ".mbtiles", ".pyc"}
N_FUGA = 8  # palabras seguidas que cuentan como texto copiado
# Nombres de publicaciones de jw.org que el repositorio cita y que también se dicen en algún video. Son títulos,
# no texto copiado. Los títulos de data/fuentes/*.yaml y los del catálogo de videos ya se permiten solos.
PERMITIDAS = ("La última semana de Jesús en la tierra",)  # apéndice B12 de la TNM de estudio


def palabras(texto: str) -> list[str]:
    return re.findall(r"\w+", sin_tildes(texto).casefold())


def tejas(lista: list[str]) -> set[str]:
    return {" ".join(lista[i:i + N_FUGA]) for i in range(len(lista) - N_FUGA + 1)}


def textos_del_repo(raiz: Path):
    for ruta in sorted(raiz.rglob("*")):
        partes = set(ruta.relative_to(raiz).parts)
        if not ruta.is_file() or partes & {".git", "__pycache__", "node_modules"} or ruta.suffix.lower() in EXT_BINARIAS:
            continue
        if ruta.stat().st_size > 20_000_000:
            continue
        try:
            yield ruta, ruta.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue


def fugas(carpeta: Path, raiz: Path) -> int:
    """Busca en `raiz` texto de los subtítulos (N_FUGA palabras seguidas) y nombres de ficheros .vtt.
    Los títulos sí pueden estar: los de los videos (son el índice), los de data/fuentes/*.yaml y PERMITIDAS.
    Devuelve el número de hallazgos; solo imprime la ruta del repositorio y las palabras que coinciden."""
    ficheros = sorted(carpeta.glob("*.vtt"))
    if not ficheros:
        sys.exit("No hay ficheros .vtt en BE_VTT_DIR.")
    nombres = {f.name for f in ficheros}
    raices = {f.stem for f in ficheros}
    titulos = [d.get("title") or "" for d in leer_catalogo(carpeta).values()]
    catalogo_json = carpeta / "S.json"
    if catalogo_json.exists():
        for linea in catalogo_json.read_text(encoding="utf-8").splitlines():
            item = json.loads(linea)
            if item.get("type") == "media-item":
                titulos.append(item["o"].get("title") or "")
    try:
        import yaml
        for ruta in sorted((raiz / "data" / "fuentes").glob("*.yaml")):
            for fuente in (yaml.safe_load(ruta.read_text(encoding="utf-8")) or {}).values():
                if isinstance(fuente, dict):
                    titulos.append(str(fuente.get("titulo") or ""))
    except ImportError:
        print("  aviso: sin PyYAML no se leen los títulos de data/fuentes", file=sys.stderr)
    titulos += PERMITIDAS
    # Dos maneras de que un título no cuente como fuga: una teja que está dentro de un título («de la Traducción del
    # Nuevo Mundo en español») y una teja que toca un título entero de 4 palabras o más, que se tapa antes de cortar
    # el texto en tejas («la Tabla de los libros de la Biblia»).
    permitidas: set[str] = set()
    por_inicio: dict[str, set[tuple[str, ...]]] = {}
    for t in titulos:
        pt = tuple(palabras(t))
        permitidas |= tejas(list(pt))
        if len(pt) >= 4:
            por_inicio.setdefault(pt[0], set()).add(pt)

    def tejas_sin_titulos(lista: list[str]) -> set[str]:
        tapado = [False] * len(lista)
        for i, w in enumerate(lista):
            for pt in por_inicio.get(w, ()):
                if tuple(lista[i:i + len(pt)]) == pt:
                    tapado[i:i + len(pt)] = [True] * len(pt)
        return {" ".join(lista[i:i + N_FUGA]) for i in range(len(lista) - N_FUGA + 1)
                if not any(tapado[i:i + N_FUGA])}

    hallazgos = 0
    repo: dict[str, str] = {}
    leidos = 0
    for ruta, texto in textos_del_repo(raiz):
        leidos += 1
        rel = ruta.relative_to(raiz)
        for m in re.finditer(r"[\w.\-]+\.vtt\b|[\w\-]+_S_[\w\-]+", texto):
            if m.group(0) in nombres or m.group(0) in raices:
                hallazgos += 1
                print(f"FUGA nombre de fichero: {rel}: {m.group(0)}")
        for teja in tejas_sin_titulos(palabras(texto)) - permitidas:
            repo.setdefault(teja, str(rel))
    vistas: set[str] = set()
    for f in ficheros:
        for teja in tejas(palabras(texto_de_vtt(f))):
            if teja in repo and teja not in vistas:
                vistas.add(teja)
                hallazgos += 1
                print(f"FUGA texto: {repo[teja]}: «{teja}»")
    print(f"ficheros del repositorio leídos: {leidos}; subtítulos comparados: {len(ficheros)}; "
          f"hallazgos: {hallazgos}")
    return hallazgos


# ---------------------------------------------------------------- principal

def argumentos() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Índice de videos de jw.org por lugar y por persona.")
    p.add_argument("--salida", help="carpeta donde escribir data/ y site/ en vez del repositorio (prueba)")
    p.add_argument("--nombres", default=str(NOMBRES), help="carpeta de nombres de lugares")
    p.add_argument("--personas", default=str(PERSONAS), help="carpeta de nombres de personas")
    p.add_argument("--datos", default=str(RAIZ / "data"), help="carpeta data/ con los ids de lugares y personas")
    p.add_argument("--sin-red", action="store_true", help="no pedir nada a jw.org (solo para pruebas)")
    p.add_argument("--fugas", action="store_true", help="comprobar que el repositorio no lleva texto de subtítulos")
    p.add_argument("--raiz", default=str(RAIZ), help="con --fugas, carpeta que se revisa")
    return p.parse_args()


def carpeta_privada() -> Path:
    if not os.environ.get("BE_VTT_DIR"):
        sys.exit("Falta BE_VTT_DIR: la carpeta privada con los .vtt (fuera del repositorio).")
    return Path(os.environ["BE_VTT_DIR"]).expanduser()


def main() -> None:
    args = argumentos()
    if args.fugas:
        sys.exit(1 if fugas(carpeta_privada(), Path(args.raiz)) else 0)

    # Los nombres se leen antes que los subtítulos: un id repetido falla aunque no haya carpeta privada.
    tipos = {"lugar": leer_carpeta(Path(args.nombres)), "persona": leer_carpeta(Path(args.personas), AMBIGUOS)}
    datos = Path(args.datos)
    comprobar_ids(tipos, {t: datos / Path(SALIDAS[t][0]).name for t in tipos}, prueba=bool(args.salida))
    carpeta = carpeta_privada()
    ficheros = sorted(carpeta.glob("*.vtt"))
    if not ficheros:
        sys.exit("No hay ficheros .vtt en BE_VTT_DIR.")

    buscadores = {"lugar": Buscador(tipos["lugar"]), "persona": Buscador(tipos["persona"], citas=True)}
    catalogo = leer_catalogo(carpeta)

    # tipo -> id -> clave natural -> {docid, menciones, terminos}
    hallazgos: dict[str, dict[str, dict[str, dict]]] = {t: {oid: {} for oid in e} for t, e in tipos.items()}
    locales: dict[str, dict] = {}
    sin_clave = 0
    for f in ficheros:
        clave = clave_natural(f.name, catalogo)
        if not clave:
            sin_clave += 1
            continue
        docid, lank = clave
        locales[lank] = catalogo.get(f.name, {})
        texto = texto_de_vtt(f)
        for tipo, buscador in buscadores.items():
            for oid, terminos in buscador.contar(texto).items():
                total = sum(terminos.values())
                previo = hallazgos[tipo][oid].get(lank)
                if total >= MINIMO and (not previo or total > previo["menciones"]):
                    hallazgos[tipo][oid][lank] = {"docid": docid, "menciones": total,
                                                  "terminos": dict(sorted(terminos.items()))}

    if args.sin_red and not args.salida:
        sys.exit("--sin-red solo vale con --salida: sin comprobar en jw.org no se escribe en data/ ni en site/.")
    resolutor = Resolutor(carpeta, sin_red=args.sin_red)
    hoy = dt.date.today().isoformat()
    indices: dict[str, dict[str, list[dict]]] = {}
    try:
        for tipo, entidades in tipos.items():
            indices[tipo] = {oid: elegir(hallazgos[tipo][oid], resolutor, locales) for oid in entidades}
    finally:
        resolutor.guardar()

    base = Path(args.salida) if args.salida else RAIZ
    print(f"videos leídos: {len(ficheros)} (sin clave: {sin_clave})")
    for tipo, indice in indices.items():
        _, carpeta_yaml, json_site = SALIDAS[tipo]
        salida_yaml, salida_site = base / carpeta_yaml, base / json_site
        salida_yaml.mkdir(parents=True, exist_ok=True)
        for viejo in salida_yaml.glob("*.yaml"):
            viejo.unlink()
        for oid, videos in indice.items():
            if videos:
                escribir_yaml(salida_yaml, tipo, oid, hoy, videos)
        salida_site.parent.mkdir(parents=True, exist_ok=True)
        salida_site.write_text(json.dumps(indice, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        con_videos = [oid for oid, v in indice.items() if v]
        print(f"{tipo}: con videos {len(con_videos)} de {len(indice)}; "
              f"pares con {MINIMO}+ menciones {sum(len(h) for h in hallazgos[tipo].values())}; "
              f"guardados (máx. {MAXIMO} por id) {sum(len(v) for v in indice.values())}")
    print(f"peticiones de red: {resolutor.peticiones}"
          + (f"; videos sin comprobar en jw.org (--sin-red): {resolutor.provisionales}" if args.sin_red else ""))


if __name__ == "__main__":
    main()
