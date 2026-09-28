#!/usr/bin/env python3
"""Índice de videos de jw.org por libro y capítulo de la Biblia.

Tres entradas, de más a menos directa:

  serie       la serie «Información sobre los libros de la Biblia» (pub-nwtsv): «Información sobre Hechos de los
              Apóstoles» va a Hechos entero. Se asigna por el título, sin leer subtítulos.
  titulo      las citas del título del catálogo: «(Mateo 21:23-46; 22:15-46)» pone el video en Mateo 21 y 22.
              Si la versión en video no lleva la cita y la de audio sí, cuenta la del audio.
  subtitulos  las citas dichas en los subtítulos: «Hechos 16:14», «Hechos, capítulo 16», «capítulo 16 de Hechos»,
              «Primera a los Corintios 13:4».

Las formas de cada libro salen de data/libros.yaml (nombre y habladas). Para los libros con número se aceptan
también las formas habladas con ordinal («Primera a los Corintios», «Segundo de Reyes»). Un capítulo que no existe
(«Mateo 29») no cuenta. En los libros de un solo capítulo, «Judas 3» es el versículo 3 del capítulo 1.

Los subtítulos tienen derechos de autor de jw.org: la carpeta vive fuera del repositorio y ningún texto suyo sale
de ella. Al repositorio solo llega el índice: id del video, título, URL pública, fecha y recuentos.

No usa la red. El catálogo de medios de jw.org (S.json, que la herramienta de descarga deja en la carpeta privada)
es la lista de lo publicado: da el título y la fecha, y un video que ya no está en él no se enlaza. El enlace es el
buscador público de jw.org (https://www.jw.org/finder?wtlocale=S&lank=...), que lleva a la página del video.

Uso:
    BE_VTT_DIR=/ruta/privada python3 scripts/videos/pasajes.py
    BE_VTT_DIR=/ruta/privada python3 scripts/videos/pasajes.py --salida /tmp/prueba --libros otra/libros.yaml

Escribe data/videos-pasajes/<libro>.yaml y site/videos-pasajes.json (debajo de --salida si se da).
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from indexar import (RAIZ, carpeta_privada, clave_natural, con_audiodescripcion, leer_catalogo,  # noqa: E402
                     sin_tildes, texto_de_vtt, titulo_base, yaml_escalar)

LIBROS = RAIZ / "data" / "libros.yaml"
SALIDA_YAML = "data/videos-pasajes"
SALIDA_SITE = "site/videos-pasajes.json"
SERIE = re.compile(r"pub-nwtsv_\d+_VIDEO")  # «Información sobre los libros de la Biblia»
PREFIJO_SERIE = "Información sobre "
MINIMO = 1   # citas de un capítulo para que un video entre por sus subtítulos
MAXIMO = 12  # videos por capítulo
ORDEN_POR = {"serie": 0, "titulo": 1, "subtitulos": 2}

ORDINALES = {1: "primer[oa]?", 2: "segund[oa]", 3: "tercer[oa]?"}
N = r"\d{1,3}"


# ---------------------------------------------------------------- libros

class Libros:
    """Reconoce citas de capítulos con las formas de data/libros.yaml."""

    def __init__(self, ruta: Path):
        self.libros = yaml.safe_load(ruta.read_text(encoding="utf-8"))["libros"]
        self.por_slug = {b["slug"]: b for b in self.libros}
        self.forma: dict[str, str] = {}      # forma sin tildes -> slug
        self.abrev: dict[str, str] = {}      # abreviatura TNM sin tildes ni espacios -> slug
        self.base: dict[tuple[int, str], str] = {}  # (número, nombre sin número en minúsculas) -> slug
        for b in self.libros:
            for f in [b["nombre"], *b.get("habladas", [])]:
                self.forma[sin_tildes(f)] = b["slug"]
            self.abrev[sin_tildes(b["abr"]).replace(" ", "")] = b["slug"]
            m = re.fullmatch(r"([123]) (.+)", b["nombre"])
            if m:
                self.base[(int(m.group(1)), sin_tildes(m.group(2)).casefold())] = b["slug"]
        planas = "|".join(re.escape(f).replace(r"\ ", r"\s+") for f in sorted(self.forma, key=len, reverse=True))
        bases = "|".join(re.escape(n) for n in sorted({n for _, n in self.base}, key=len, reverse=True))
        ords = "|".join(ORDINALES.values())
        # La forma con ordinal no distingue mayúsculas («primera carta a los corintios»); las demás sí.
        libro = (rf"(?P<ord>(?i:{ords}))\s+(?i:carta\s+)?(?i:a|de)\s+(?i:(?:los|las)\s+)?(?P<base>(?i:{bases}))"
                 rf"|(?P<plana>{planas})")
        # «Hechos 16», «Hechos 16:14», «Génesis 6:1-8:22» (fin: último capítulo de un tramo), «Hechos, capítulo 16».
        self.cita = re.compile(
            rf"(?<!\w)(?:{libro})(?!\w)"
            rf"(?:\s+(?P<cap>{N})(?::(?P<ver>{N})(?:\s*[-–]\s*(?:(?P<fin>{N}):)?{N})?)?(?![\d:])"
            rf"|,?\s+(?i:cap[ií]tulos?)\s+(?P<capx>{N})(?:\s+(?:y|al?)\s+(?P<capy>{N}))?(?![\d:]))")
        # «capítulo 16 de Hechos», «capítulo 3 del libro de Daniel».
        self.cita_inversa = re.compile(
            rf"(?i:cap[ií]tulos?)\s+(?P<capx>{N})\s+(?i:del?)\s+(?i:(?:el\s+)?libro\s+de\s+)?(?:{libro})(?!\w)")
        # Abreviaturas TNM de los títulos: «(2Ti 3:16)», «(2 Ti 3:16)», «(Hch 24:15)». Piden capítulo y versículo,
        # porque «Da», «Le» o «Am» sueltas son palabras; solo se usan en los títulos, no en los subtítulos.
        abrs = "|".join(re.sub(r"^([123])", r"\1\\s?", re.escape(a))
                        for a in sorted(self.abrev, key=len, reverse=True))
        self.cita_abr = re.compile(
            rf"(?<!\w)(?P<abr>{abrs})\.?\s+(?P<cap>{N}):(?P<ver>{N})(?:\s*[-–]\s*(?:(?P<fin>{N}):)?{N})?(?![\d:])")
        # Lo que sigue a una cita en el mismo libro: «; 22:15-46» es otro capítulo, «, 10-13» son versículos.
        self.sigue = re.compile(rf"\s*[;,]\s*(?:y\s+)?(?P<cap>{N}):{N}(?:\s*[-–]\s*(?:(?P<fin>{N}):)?{N})?(?![\d:])")
        self.versos = re.compile(rf"\s*[,;]\s*{N}(?:\s*[-–]\s*{N})?(?![\d:])")

    def slug_de(self, m: re.Match) -> str | None:
        if "abr" in m.re.groupindex:
            return self.abrev.get(re.sub(r"\s+", "", m.group("abr")))
        if m.group("ord"):
            ordinal = m.group("ord").casefold()
            n = next(k for k, v in ORDINALES.items() if re.fullmatch(v, ordinal))
            return self.base.get((n, re.sub(r"\s+", " ", m.group("base")).casefold()))
        return self.forma.get(re.sub(r"\s+", " ", m.group("plana")))

    def capitulos(self, slug: str, desde: int, hasta: int | None, solo_numero: bool) -> list[int]:
        """Capítulos válidos de una cita. En un libro de un capítulo, el número suelto de «Judas 3» es el versículo."""
        total = self.por_slug[slug]["capitulos"]
        if total == 1:
            return [1] if solo_numero or desde == 1 else []
        hasta = hasta if hasta and desde < hasta <= total and hasta - desde <= 30 else desde
        return list(range(desde, hasta + 1)) if 1 <= desde <= total else []

    def citas(self, texto: str, abreviaturas: bool = False) -> tuple[dict[tuple[str, int], int], int]:
        """Devuelve ({(libro, capítulo): veces}, citas descartadas por capítulo inexistente).
        Con `abreviaturas` (títulos del catálogo) también cuenta «Hch 24:15»."""
        plano = sin_tildes(texto.replace("​", "").replace(" ", " "))
        cuenta: dict[tuple[str, int], int] = {}
        descartadas = 0

        def sumar(slug: str | None, desde: str, hasta: str | None, solo_numero: bool = False) -> None:
            nonlocal descartadas
            if not slug:
                return
            caps = self.capitulos(slug, int(desde), int(hasta) if hasta else None, solo_numero)
            if not caps:
                descartadas += 1
            for c in caps:
                cuenta[(slug, c)] = cuenta.get((slug, c), 0) + 1

        encontradas = list(self.cita.finditer(plano))
        if abreviaturas:
            encontradas += self.cita_abr.finditer(plano)
        for m in encontradas:
            slug = self.slug_de(m)
            if m.group("cap"):
                sumar(slug, m.group("cap"), m.group("fin"), solo_numero=m.group("ver") is None)
            else:
                sumar(slug, m.group("capx"), m.group("capy"))
            # Continuaciones del mismo libro: «Esdras 1:1-6; 3:1-6, 10-13; 4:1-7».
            pos = m.end()
            while True:
                s = self.sigue.match(plano, pos)
                if s:
                    sumar(slug, s.group("cap"), s.group("fin"))
                    pos = s.end()
                    continue
                v = self.versos.match(plano, pos)
                if v:
                    pos = v.end()
                    continue
                break
        for m in self.cita_inversa.finditer(plano):
            sumar(self.slug_de(m), m.group("capx"), None)
        return cuenta, descartadas

    def libro_de_serie(self, titulo: str) -> str | None:
        """«Información sobre Hechos de los Apóstoles» -> hechos: la forma más larga con la que empieza el resto."""
        if not titulo.startswith(PREFIJO_SERIE):
            return None
        resto = sin_tildes(titulo[len(PREFIJO_SERIE):]).casefold()
        mejor = None
        for forma, slug in self.forma.items():
            f = forma.casefold()
            if re.match(rf"{re.escape(f)}(?!\w)", resto) and (mejor is None or len(f) > len(mejor[0])):
                mejor = (f, slug)
        return mejor[1] if mejor else None


# ---------------------------------------------------------------- catálogo

def leer_s_json(carpeta: Path) -> list[dict]:
    ruta = carpeta / "S.json"
    if not ruta.exists():
        return []
    items = []
    for linea in ruta.read_text(encoding="utf-8").splitlines():
        d = json.loads(linea)
        if d.get("type") == "media-item":
            items.append(d["o"])
    return items


def enlace(lank: str) -> str:
    """Página pública del video a través del buscador de jw.org, el mismo que usa indexar.py."""
    if lank.startswith("docid-"):
        return f"https://www.jw.org/finder?wtlocale=S&docid={lank.split('-')[1].split('_')[0]}"
    return f"https://www.jw.org/finder?wtlocale=S&lank={lank}"


def grupo(lank: str) -> str:
    """Clave común de las versiones en audio y en video de una misma publicación."""
    return re.sub(r"_(VIDEO|AUDIO)$", "", lank)


# ---------------------------------------------------------------- salida

def escribir_yaml(carpeta: Path, slug: str, hoy: str, entrada: dict) -> None:
    lineas = [
        "# Generado por scripts/videos/pasajes.py. No editar a mano.",
        "# Videos públicos de jw.org sobre este libro y sus capítulos; ver docs/investigacion/videos-jw.md.",
        f"libro: {slug}",
        f"generado: {yaml_escalar(hoy)}",
    ]

    def video(v: dict, sangria: str) -> None:
        lineas.append(f"{sangria}- docid: {yaml_escalar(v['docid'])}")
        for k in ("titulo", "url", "publicado"):
            lineas.append(f"{sangria}  {k}: {yaml_escalar(v[k])}")
        if "por" in v:
            lineas.append(f"{sangria}  por: [{', '.join(v['por'])}]")
            lineas.append(f"{sangria}  citas: {v['citas']}")

    if entrada["serie"]:
        lineas.append("serie:")
        for v in entrada["serie"]:
            video(v, "  ")
    if entrada["capitulos"]:
        lineas.append("capitulos:")
        for cap, videos in entrada["capitulos"].items():
            lineas.append(f"  {cap}:")
            for v in videos:
                video(v, "    ")
    (carpeta / f"{slug}.yaml").write_text("\n".join(lineas) + "\n", encoding="utf-8")


def sin_duplicar_ad(videos: list[dict]) -> list[dict]:
    """El mismo video con y sin audiodescripciones: se queda uno, en su puesto, y el que no las lleva."""
    fuera: list[dict] = []
    for v in videos:
        previo = next((e for e in fuera if titulo_base(e["titulo"]) == titulo_base(v["titulo"])), None)
        if previo is None:
            fuera.append(v)
        elif con_audiodescripcion(previo["titulo"]) and not con_audiodescripcion(v["titulo"]):
            fuera[fuera.index(previo)] = v
    return fuera


# ---------------------------------------------------------------- principal

def argumentos() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Índice de videos de jw.org por libro y capítulo.")
    p.add_argument("--salida", help="carpeta donde escribir data/ y site/ en vez del repositorio (prueba)")
    p.add_argument("--libros", default=str(LIBROS), help="tabla de libros (por defecto data/libros.yaml)")
    return p.parse_args()


def main() -> None:
    args = argumentos()
    libros = Libros(Path(args.libros))
    carpeta = carpeta_privada()
    ficheros = sorted(carpeta.glob("*.vtt"))
    if not ficheros:
        sys.exit("No hay ficheros .vtt en BE_VTT_DIR.")
    catalogo = leer_catalogo(carpeta)
    items = leer_s_json(carpeta)
    if not items:
        sys.exit("No hay catálogo S.json en BE_VTT_DIR: sin él no hay títulos ni serie.")

    # clave natural -> {docid}; (libro, capítulo) -> clave -> {por, citas}
    videos: dict[str, dict] = {}
    capitulos: dict[tuple[str, int], dict[str, dict]] = {}
    serie: dict[str, list[str]] = {}
    sin_libro: list[str] = []

    def anotar(slug: str, cap: int, lank: str, por: str, citas: int) -> None:
        e = capitulos.setdefault((slug, cap), {}).setdefault(lank, {"por": set(), "citas": 0})
        e["por"].add(por)
        e["citas"] += citas

    # 1. Subtítulos.
    descartadas = sin_clave = 0
    for f in ficheros:
        clave = clave_natural(f.name, catalogo)
        if not clave:
            sin_clave += 1
            continue
        docid, lank = clave
        videos.setdefault(lank, {"docid": docid})
        cuenta, malas = libros.citas(texto_de_vtt(f))
        descartadas += malas
        for (slug, cap), n in cuenta.items():
            if n >= MINIMO:
                anotar(slug, cap, lank, "subtitulos", n)

    # 2. Títulos del catálogo: todos los títulos de la publicación (audio y video) cuentan para su versión en video.
    titulos: dict[str, set[str]] = {}
    for o in items:
        titulos.setdefault(grupo(o["languageAgnosticNaturalKey"]), set()).add(o.get("title") or "")
    for d in catalogo.values():
        if d.get("languageAgnosticNaturalKey") and d.get("title"):
            titulos.setdefault(grupo(d["languageAgnosticNaturalKey"]), set()).add(d["title"])
    solo_audio = 0
    en_video = {o["languageAgnosticNaturalKey"]: o for o in items if o["keyParts"].get("formatCode") == "VIDEO"}
    for o in list(en_video.values()):
        lank = o["languageAgnosticNaturalKey"]
        videos.setdefault(lank, {"docid": str(o["keyParts"].get("docID") or lank)})
        vistos: set[tuple[str, int]] = set()
        for t in titulos.get(grupo(lank), ()):
            cuenta, _ = libros.citas(t, abreviaturas=True)
            vistos |= set(cuenta)
        for slug, cap in vistos:
            anotar(slug, cap, lank, "titulo", 0)
        if SERIE.fullmatch(lank):
            slug = libros.libro_de_serie(o.get("title") or "")
            if slug:
                serie.setdefault(slug, []).append(lank)
            else:
                sin_libro.append(o.get("title") or lank)
    for g, ts in titulos.items():
        if f"{g}_VIDEO" not in en_video and any(libros.citas(t, abreviaturas=True)[0] for t in ts):
            solo_audio += 1

    # 3. Elegir. Lo que no está en el catálogo actual ya no está publicado y no se enlaza.
    hoy = dt.date.today().isoformat()
    indice: dict[str, dict] = {b["slug"]: {"serie": [], "capitulos": {}} for b in libros.libros}
    fuera_de_catalogo: set[str] = set()

    def ficha(lank: str) -> dict | None:
        o = en_video.get(lank)
        if not o:
            fuera_de_catalogo.add(lank)
            return None
        publicado = o.get("firstPublished")
        return {"docid": videos[lank]["docid"], "titulo": (o.get("title") or lank).strip(), "url": enlace(lank),
                "publicado": publicado[:10] if publicado else None}

    for slug, lanks in serie.items():
        elegidos = [x for x in (ficha(lank) for lank in sorted(lanks)) if x]
        indice[slug]["serie"] = sin_duplicar_ad(elegidos)
    for (slug, cap) in sorted(capitulos, key=lambda k: (libros.por_slug[k[0]]["num"], k[1])):
        orden = sorted(capitulos[(slug, cap)].items(),
                       key=lambda kv: (min(ORDEN_POR[p] for p in kv[1]["por"]), -kv[1]["citas"],
                                       videos[kv[0]]["docid"]))
        elegidos: list[dict] = []
        for lank, e in orden:
            if len(elegidos) == MAXIMO:
                break
            x = ficha(lank)
            if not x:
                continue
            x["por"] = sorted(e["por"], key=ORDEN_POR.get)
            x["citas"] = e["citas"]
            elegidos = sin_duplicar_ad([*elegidos, x])
        if elegidos:
            indice[slug]["capitulos"][str(cap)] = elegidos

    base = Path(args.salida) if args.salida else RAIZ
    salida_yaml, salida_site = base / SALIDA_YAML, base / SALIDA_SITE
    salida_yaml.mkdir(parents=True, exist_ok=True)
    for viejo in salida_yaml.glob("*.yaml"):
        viejo.unlink()
    for slug, entrada in indice.items():
        if entrada["serie"] or entrada["capitulos"]:
            escribir_yaml(salida_yaml, slug, hoy, entrada)
    salida_site.parent.mkdir(parents=True, exist_ok=True)
    salida_site.write_text(json.dumps(indice, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

    por = {"serie": 0, "titulo": 0, "subtitulos": 0}
    for entrada in indice.values():
        por["serie"] += len(entrada["serie"])
        for vs in entrada["capitulos"].values():
            for v in vs:
                for p in v["por"]:
                    por[p] += 1
    total_caps = sum(b["capitulos"] for b in libros.libros)
    con_videos = sum(len(e["capitulos"]) for e in indice.values())
    sin_serie = [slug for slug, e in indice.items() if not e["serie"]]
    print(f"videos leídos: {len(ficheros)} (sin clave: {sin_clave}); títulos del catálogo: {len(en_video)} en video")
    print(f"capítulos con videos: {con_videos} de {total_caps}; libros con «{PREFIJO_SERIE.strip()}»: "
          f"{len(indice) - len(sin_serie)} de {len(indice)}")
    print(f"entradas guardadas por serie {por['serie']}, por título {por['titulo']}, por subtítulos "
          f"{por['subtitulos']} (máx. {MAXIMO} por capítulo)")
    print(f"citas descartadas por capítulo inexistente: {descartadas}; publicaciones con citas solo en audio: "
          f"{solo_audio}")
    if sin_serie:
        print(f"libros sin video de la serie: {', '.join(sin_serie)}")
    if sin_libro:
        print(f"videos de la serie sin libro: {', '.join(sin_libro)}")
    print(f"videos con citas que ya no están en el catálogo (no se enlazan): {len(fuera_de_catalogo)}")


if __name__ == "__main__":
    main()
