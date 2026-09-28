#!/usr/bin/env python3
"""Índice de videos de jw.org que mencionan cada lugar de los viajes de Pablo.

Lee una copia privada de los subtítulos en español (.vtt) de los videos de
jw.org, cuenta cuántas veces aparece cada nombre de scripts/videos/nombres/*.yaml
y guarda, por lugar, los videos públicos que lo mencionan al menos dos veces.

Los nombres están repartidos en un fichero por carril (nombres/pablo.yaml, ...);
un mismo id en dos ficheros es un error. scripts/videos/personas/*.yaml tiene el
mismo formato para personas y la misma comprobación de ids repetidos.

Los subtítulos tienen derechos de autor de jw.org: la carpeta vive fuera del
repositorio y ningún texto suyo sale de ella. Al repositorio solo llega nuestro
índice: id del video, título, URL pública, fecha de publicación y recuentos.

Uso:
    BE_VTT_DIR=/ruta/privada python3 scripts/videos/indexar.py

La carpeta de BE_VTT_DIR contiene los .vtt y, si existe, vtts.json (el catálogo
de la herramienta de descarga, con la clave natural de cada fichero). La caché de
las consultas a jw.org se guarda en esa misma carpeta, así que una segunda
ejecución no hace ninguna petición de red.
"""

from __future__ import annotations

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
SALIDA_YAML = RAIZ / "data" / "videos"
SALIDA_SITE = RAIZ / "site" / "videos.json"
CACHE = ".biblical-earth-videos-cache.json"

MINIMO = 2  # menciones mínimas para que un video entre en el índice
MAXIMO = 12  # videos por lugar
VENTANA = 250  # caracteres a cada lado para desambiguar "Antioquía"
AGENTE = "Mozilla/5.0"
TITULO_PORTADA = "Sitio oficial de los testigos de Jehová"


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


def leer_carpeta(carpeta: Path) -> dict[str, dict]:
    """Junta todos los *.yaml de una carpeta de nombres. Un id en dos ficheros es un error que nombra los dos."""
    todo: dict[str, dict] = {}
    origen: dict[str, str] = {}
    for ruta in sorted(carpeta.glob("*.yaml")):
        for oid, d in leer_nombres(ruta).items():
            if oid in todo:
                sys.exit(f"{carpeta.name}/{origen[oid]} y {carpeta.name}/{ruta.name}: el id '{oid}' sale dos veces")
            todo[oid], origen[oid] = d, ruta.name
    return todo


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

    def __init__(self, lugares: dict[str, dict]):
        self.lugares = lugares
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
        filas = con.execute("SELECT filename, natural_key, first_published FROM downloaded_vtts "
                            "WHERE status = 'success' AND filename <> '' AND natural_key IS NOT NULL "
                            "ORDER BY formatCode = 'VIDEO'").fetchall()   # VIDEO al final: gana si hay las dos
        con.close()
        for fichero, clave, publicado in filas:
            if fichero in catalogo and "naturalKey" in catalogo[fichero]:
                continue                  # vtts.json manda
            catalogo[fichero] = {"languageAgnosticNaturalKey": re.sub(r"^((?:pub|docid)-[^_]+)_S_", r"\1_", clave),
                                 "firstPublished": publicado}
    return catalogo


# ---------------------------------------------------------------- red

class Resolutor:
    """Obtiene URL pública, título y fecha de un video, con caché en disco."""

    def __init__(self, carpeta: Path):
        self.ruta = carpeta / CACHE
        self.cache = json.loads(self.ruta.read_text(encoding="utf-8")) if self.ruta.exists() else {}
        self.peticiones = 0

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
        try:
            parametro = f"docid={lank.split('-')[1].split('_')[0]}" if lank.startswith("docid-") else f"lank={lank}"
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


def escribir_yaml(lid: str, hoy: str, videos: list[dict]) -> None:
    lineas = [
        "# Generado por scripts/videos/indexar.py. No editar a mano.",
        "# Videos públicos de jw.org que nombran este lugar; ver docs/investigacion/videos-jw.md.",
        f"lugar: {lid}",
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
    (SALIDA_YAML / f"{lid}.yaml").write_text("\n".join(lineas) + "\n", encoding="utf-8")


def main() -> None:
    # Los nombres se leen antes que los subtítulos: un id repetido falla aunque no haya carpeta privada.
    lugares = leer_carpeta(NOMBRES)
    personas = leer_carpeta(PERSONAS)
    if not os.environ.get("BE_VTT_DIR"):
        sys.exit("Falta BE_VTT_DIR: la carpeta privada con los .vtt (fuera del repositorio).")
    carpeta = Path(os.environ["BE_VTT_DIR"]).expanduser()
    ficheros = sorted(carpeta.glob("*.vtt"))
    if not ficheros:
        sys.exit("No hay ficheros .vtt en BE_VTT_DIR.")

    buscador = Buscador(lugares)
    catalogo = leer_catalogo(carpeta)

    # lugar -> clave natural -> {docid, menciones, terminos}
    hallazgos: dict[str, dict[str, dict]] = {lid: {} for lid in lugares}
    locales: dict[str, dict] = {}
    sin_clave = 0
    for f in ficheros:
        clave = clave_natural(f.name, catalogo)
        if not clave:
            sin_clave += 1
            continue
        docid, lank = clave
        locales[lank] = catalogo.get(f.name, {})
        for lid, terminos in buscador.contar(texto_de_vtt(f)).items():
            total = sum(terminos.values())
            previo = hallazgos[lid].get(lank)
            if total >= MINIMO and (not previo or total > previo["menciones"]):
                hallazgos[lid][lank] = {"docid": docid, "menciones": total, "terminos": dict(sorted(terminos.items()))}

    resolutor = Resolutor(carpeta)
    hoy = dt.date.today().isoformat()
    indice: dict[str, list[dict]] = {}
    try:
        for lid in lugares:
            orden = sorted(hallazgos[lid].items(), key=lambda kv: (-kv[1]["menciones"], kv[1]["docid"]))
            elegidos = []
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
            indice[lid] = elegidos
    finally:
        resolutor.guardar()

    SALIDA_YAML.mkdir(parents=True, exist_ok=True)
    for viejo in SALIDA_YAML.glob("*.yaml"):
        viejo.unlink()
    for lid, videos in indice.items():
        if videos:
            escribir_yaml(lid, hoy, videos)
    SALIDA_SITE.parent.mkdir(parents=True, exist_ok=True)
    SALIDA_SITE.write_text(json.dumps(indice, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    con_videos = [lid for lid, v in indice.items() if v]
    print(f"videos leídos: {len(ficheros)} (sin clave: {sin_clave})")
    print(f"lugares con videos: {len(con_videos)} de {len(lugares)}")
    print(f"personas con nombres para buscar: {len(personas)} (su índice todavía no se genera)")
    print(f"pares lugar-video con {MINIMO}+ menciones: {sum(len(h) for h in hallazgos.values())}")
    print(f"pares guardados (máx. {MAXIMO} por lugar): {sum(len(v) for v in indice.values())}")
    print(f"peticiones de red: {resolutor.peticiones}")


if __name__ == "__main__":
    main()
