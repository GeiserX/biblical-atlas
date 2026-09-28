#!/usr/bin/env python3
"""Valida data/: esquema, fechas, identificadores, fuentes y razones.

Uso:  python3 scripts/validate.py [--data DIR] [--links]

--data DIR valida otra copia de los datos (por ejemplo, HEAD más los ficheros de un carril, en /tmp).
--links descarga cada URL una sola vez (GET, 0,5 s entre peticiones) y falla si alguna no da 200.
Sale con código distinto de cero ante cualquier error. El esquema está en docs/investigacion/README.md.
"""
import argparse
import math
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

ID = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
DIA = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MAX_PALABRAS = 40
PRECISIONES = {"día", "mes", "estación", "año", "rango"}
TIPOS_FECHA = {"anclada", "narrativa", "derivada"}
ESTACIONES = {"primavera", "verano", "otoño", "invierno"}
ESTADOS = {"verificado", "pendiente"}
TIPOS_LUGAR = {"ciudad", "region", "isla", "provincia", "puerto", "cabo",
               "monte", "rio", "mar", "lago", "desierto", "valle", "llanura", "pais", "reino"}
PRECISION_LUGAR = {"punto", "zona", "incierto"}
GEOMETRIAS = {"punto", "zona", "franja"}
ESTADOS_CANDIDATO = {"seguro", "favorecido_nivel_1", "tradicion", "alternativa", "solo_nivel_2", "descartado_nivel_1"}
TIPOS_RELACION = {"pariente", "acompana", "vivio_en", "nacio_en", "murio_en", "sucede_a", "mismo_que"}
RELACION_CON_LUGAR = {"vivio_en", "nacio_en", "murio_en"}
TIPOS_ENLACE = {"perspicacia", "biblia", "video", "externo"}
TIPOS_PERIODO = {"emperador", "gobernador", "potencia", "rey", "era", "sumo-sacerdote"}
CAMPOS_TEXTO = {"resumen", "razon", "nota", "cambio", "texto", "explicacion", "desambiguacion", "no_sabemos",
                "clima", "campo", "donde_hoy"}
IDENTIFICACIONES = {"segura", "incierta"}
# Un año con su era: «537 a.e.c.», «c. 49-52 e.c.», «33 E.C.».
RE_ANIO = re.compile(r"(?<![\d-])(\d{1,4})(?:\s*[-–]\s*(\d{1,4}))?\s*(a\.\s*e\.\s*c\.|e\.\s*c\.)", re.I)

REQUERIDOS = {
    "lugares": ["id", "nombre", "nombres", "tipo", "lat", "lon", "precision", "coord_fuente", "coord_url",
                "resumen", "razon", "fuentes", "enlaces", "consultado", "estado"],
    "personas": ["id", "nombre", "nombres", "resumen", "razon", "fuentes", "enlaces", "consultado", "estado"],
    "viajes": ["id", "nombre", "persona", "referencia", "fecha", "companeros", "resumen", "razon", "fuentes",
               "consultado", "estado", "paradas"],
    "cartas": ["id", "libro", "escritor", "referencia", "escrita_en", "fecha", "destinatarios", "contexto_origen",
               "contexto_destino", "razon", "fuentes", "enlaces", "consultado", "estado"],
    "eventos": ["id", "titulo", "fecha", "lugares", "personas", "pasajes", "resumen", "razon", "fuentes",
                "consultado", "estado"],
    "periodos": ["id", "nombre", "tipo", "fecha", "resumen", "razon", "fuentes", "consultado", "estado"],
    "hallazgos": ["id", "nombre", "lugar_hallazgo", "relaciona", "fecha_objeto", "resumen", "razon", "fuentes",
                  "consultado", "estado"],
    "recorridos": ["id", "titulo", "paradas", "fuentes", "razon", "consultado", "estado"],
}
REQ_PARADA = ["orden", "lugar", "referencia", "fecha", "nota", "razon", "fuentes", "estado"]
REQ_PARADA_RECORRIDO = ["sel", "t", "texto", "pasajes"]
REQ_FUENTE = ["titulo", "obra", "url", "nivel", "publicado", "consultado"]
ESTRUCTURA_LIBRO = {"slug", "num", "nombre", "abr", "formas", "habladas", "capitulos"}
HECHOS_LIBRO = {"escritor", "lugar", "fecha", "abarca"}
ESTRUCTURA_MES = {"id", "orden", "nombre", "otros_nombres", "nombres"}
CAMPOS_NOMBRE_MES = {"nombre", "desde", "hasta", "nota", "fuentes", "razon"}
CAMPOS_EXPLICACION = {"id", "titulo", "texto", "fuentes", "razon", "consultado", "estado", "historial"}
SECCIONES_CALENDARIO = {"meses", "explicacion"}
CAMPOS_FIESTA = {"nombre", "desde", "hasta", "instituida", "fuentes", "razon", "estado"}


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
        err(f"{donde}: fecha debe ser un objeto")
        return
    for k in ("desde", "hasta", "precision", "aprox", "tipo", "cronologia", "texto"):
        if k not in f:
            err(f"{donde}: fecha sin '{k}'")
    d, h = f.get("desde"), f.get("hasta")
    for k, v in (("desde", d), ("hasta", h)):
        if v is not None and not _entero(v):
            err(f"{donde}: fecha.{k} debe ser un entero (año astronómico) o null, no {v!r}")
    if _entero(d) and _entero(h) and d > h:
        err(f"{donde}: fecha.desde ({d}) es posterior a fecha.hasta ({h})")
    for k, v in (("desde", d), ("hasta", h)):
        if _entero(v) and not -4100 <= v <= 2100:
            err(f"{donde}: fecha.{k} = {v} fuera de rango")
    if f.get("precision") not in PRECISIONES:
        err(f"{donde}: fecha.precision '{f.get('precision')}' no es una de {sorted(PRECISIONES)}")
    if not isinstance(f.get("aprox"), bool):
        err(f"{donde}: fecha.aprox debe ser true o false")
    if f.get("tipo") not in TIPOS_FECHA:
        err(f"{donde}: fecha.tipo debe ser anclada, narrativa o derivada")
    if f.get("tipo") == "derivada":
        if not str(f.get("nota") or "").strip():
            err(f"{donde}: fecha derivada sin 'nota' con la cuenta que la sostiene")
        if estado != "pendiente":
            err(f"{donde}: una fecha derivada es un cálculo nuestro; el hecho tiene que ir con estado: pendiente")
    if f.get("cronologia") not in ("tnm", "secular"):
        err(f"{donde}: fecha.cronologia debe ser tnm o secular")
    texto = str(f.get("texto") or "").strip()
    if not texto:
        err(f"{donde}: fecha.texto vacío")
    # Comprobación año/texto: el primer año con era del texto tiene que ser desde o hasta (537 a.e.c. = −536).
    m = RE_ANIO.search(texto)
    if m and (_entero(d) or _entero(h)):
        for n in (m.group(1), m.group(2)):
            if n is None:
                continue
            a = _astronomico(int(n), m.group(3))
            if a not in (d, h):
                err(f"{donde}: fecha.texto dice «{m.group(0)}», que en años astronómicos es {a}, "
                    f"pero desde/hasta son {d}/{h} (1 a.e.c. = 0, 537 a.e.c. = -536)")
    # Un texto de un solo año («c. 56 e.c.», «14 de nisán de 33 e.c.») exige desde == hasta, o aprox: true.
    if _entero(d) and _entero(h) and d != h and f.get("aprox") is not True and _un_solo_anio(texto):
        err(f"{donde}: fecha.texto «{texto}» da un solo año, pero desde/hasta son {d}/{h}; "
            f"pon desde == hasta, aprox: true o el tramo en el texto")
    det = f.get("detalle")
    if det is not None:
        if not isinstance(det, dict) or not det:
            err(f"{donde}: fecha.detalle debe ser un objeto como {{mes: nisan, dia: 14}} o {{estacion: otoño}}")
        else:
            for k in det:
                if k not in ("mes", "dia", "estacion"):
                    err(f"{donde}: fecha.detalle.{k} no se conoce (mes, dia, estacion)")
            if "mes" in det and det["mes"] not in meses:
                err(f"{donde}: fecha.detalle.mes '{det['mes']}' no está en data/calendario.yaml")
            if "dia" in det and (not _entero(det["dia"]) or not 1 <= det["dia"] <= 30 or "mes" not in det):
                err(f"{donde}: fecha.detalle.dia debe ser un entero de 1 a 30 y llevar mes")
            if "estacion" in det and det["estacion"] not in ESTACIONES:
                err(f"{donde}: fecha.detalle.estacion '{det['estacion']}' no es una de {sorted(ESTACIONES)}")


def validar_comun(o, donde, err, fuentes):
    fs = o.get("fuentes")
    if not isinstance(fs, list) or not fs:
        err(f"{donde}: 'fuentes' vacío")
    if not str(o.get("razon") or "").strip():
        err(f"{donde}: 'razon' vacía")
    if "estado" in o and o["estado"] not in ESTADOS:
        err(f"{donde}: estado '{o['estado']}' no es verificado ni pendiente")
    if "consultado" in o and not DIA.match(str(o["consultado"])):
        err(f"{donde}: consultado '{o['consultado']}' no es AAAA-MM-DD")
    for i, e in enumerate(o.get("enlaces") or []):
        if e.get("tipo") not in TIPOS_ENLACE:
            err(f"{donde}: enlaces[{i}].tipo '{e.get('tipo')}' no válido")
        if not str(e.get("url", "")).startswith("https://") or not e.get("titulo"):
            err(f"{donde}: enlaces[{i}] necesita titulo y url https")
    for i, h in enumerate(o.get("historial") or []):
        for k in ("fecha", "cambio", "fuente"):
            if not h.get(k):
                err(f"{donde}: historial[{i}] sin '{k}'")
        if h.get("fecha") and not DIA.match(str(h["fecha"])):
            err(f"{donde}: historial[{i}].fecha no es AAAA-MM-DD")


def validar_hecho(o, donde, err, fuentes):
    """Un hecho suelto dentro de otro (relación, candidato): fuentes, razon y estado."""
    if not isinstance(o.get("fuentes"), list) or not o.get("fuentes"):
        err(f"{donde}: 'fuentes' vacío")
    if not str(o.get("razon") or "").strip():
        err(f"{donde}: 'razon' vacía")
    if o.get("estado") not in ESTADOS:
        err(f"{donde}: estado '{o.get('estado')}' no es verificado ni pendiente")


def textos_largos(x, camino, err):
    """Heurística «no copiar de jw.org»: ningún resumen, razón o nota pasa de MAX_PALABRAS palabras."""
    if isinstance(x, dict):
        for k, v in x.items():
            if k in CAMPOS_TEXTO and isinstance(v, str) and len(v.split()) > MAX_PALABRAS:
                err(f"{camino}.{k}: {len(v.split())} palabras (máximo {MAX_PALABRAS}); ¿texto copiado? Resúmelo con palabras propias")
            elif k == "no_afirmamos" and isinstance(v, list):
                for i, s in enumerate(v):
                    if not isinstance(s, str) or not s.strip():
                        err(f"{camino}.no_afirmamos[{i}]: debe ser una frase")
                    elif len(s.split()) > MAX_PALABRAS:
                        err(f"{camino}.no_afirmamos[{i}]: {len(s.split())} palabras (máximo {MAX_PALABRAS})")
            else:
                textos_largos(v, f"{camino}.{k}", err)
    elif isinstance(x, list):
        for i, v in enumerate(x):
            textos_largos(v, f"{camino}[{i}]", err)


def pablo_en_su_sitio(datos):
    """Una carta o un suceso de Pablo fechado dentro de sus viajes tiene que coincidir con una parada en uno de sus
    lugares. Si no, el mapa dibujaría la carta en un sitio mientras pone a Pablo en otro."""
    paradas = []
    for v in datos["viajes"]:
        if v.get("persona") != "pablo":
            continue
        for p in v.get("paradas") or []:
            f = p.get("fecha") or {}
            if isinstance(f.get("desde"), int) and isinstance(f.get("hasta"), int):
                paradas.append((p.get("lugar"), f["desde"], f["hasta"]))
    if not paradas:
        return []
    ini, fin = min(p[1] for p in paradas), max(p[2] for p in paradas)
    casos = [(c["_fichero"], c.get("escrita_en") or [], c.get("fecha") or {})
             for c in datos["cartas"] if c.get("escritor", "pablo") == "pablo"]
    casos += [(e["_fichero"], e.get("lugares") or [], e.get("fecha") or {})
              for e in datos["eventos"] if "pablo" in (e.get("personas") or [])]
    errores = []
    for donde, lugares, f in casos:
        d, h = f.get("desde"), f.get("hasta")
        if not isinstance(d, int) or not isinstance(h, int) or d < ini or h > fin:
            continue                      # fuera de los viajes no sabemos dónde estaba: nada que comparar
        if not any(lugar in lugares and pd <= h and d <= ph for lugar, pd, ph in paradas):
            errores.append(f"{donde}: {f.get('texto')} cae dentro de los viajes, pero ninguna parada de Pablo en "
                           f"{', '.join(lugares)} coincide con esas fechas")
    return errores


def _modelo_meses():
    """Las constantes del cálculo de meses hebreos, leídas de site/js/trayectorias.js para no tenerlas dos veces."""
    js = (build.RAIZ / "site" / "js" / "trayectorias.js").read_text(encoding="utf-8")
    dia = 1 / 365.2425
    c = {}
    for nombre in ("MES_LUNAR", "LUNA_0", "EQUINOCCIO"):
        m = re.search(rf"^const {nombre} = ([\d\s.+*/()DIA-]+);", js, re.M)
        if not m:
            return None
        c[nombre] = eval(m.group(1), {"__builtins__": {}}, {"DIA": dia})  # solo cifras, operadores y DIA
    c["DIA"] = dia
    return c


def inicio_mes(c, y, orden):
    """(meses del año hebreo, comienzo del mes `orden`) para una fecha del año y de nuestro calendario, como inicioMes.
    Sin ese mes en el año (veadar en un año de doce), (None, comienzo del nisán siguiente)."""
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
    return n, puesta(luna(a) + (orden - 1) * ml)


def meses_en_su_anio(datos):
    """Una fecha con detalle.mes tiene que empezar dentro de su año: «3 de sebat de 520 a.e.c.» no puede caer en
    diciembre de 521 a.e.c. Y un «veadar» solo vale en un año que, según el cálculo, lleva Veadar. Es el cálculo de
    inicioMes y anioHebreo de site/js/trayectorias.js, con sus constantes: si cambia allí, cambia aquí."""
    c = _modelo_meses()
    if c is None:
        return ["site/js/trayectorias.js: no encuentro MES_LUNAR, LUNA_0 o EQUINOCCIO para comprobar los meses"]
    dia = c["DIA"]
    ordenes = {m.get("id"): m.get("orden") for m in datos["calendario"].get("meses") or []}

    def inicio(y, orden):
        return inicio_mes(c, y, orden)

    errores = []

    def mirar(x, donde):
        if isinstance(x, list):
            for v in x:
                mirar(v, donde)
            return
        if not isinstance(x, dict):
            return
        det = x.get("detalle")
        if isinstance(det, dict) and det.get("mes") in ordenes and _entero(ordenes[det["mes"]]):
            d, h = x.get("desde"), x.get("hasta")
            y0 = d if _entero(d) else h
            y1 = (h if _entero(h) else d)
            if _entero(y0) and _entero(y1):
                n, a = inicio(y0, ordenes[det["mes"]])
                if n is None:
                    errores.append(f"{donde}: «{x.get('texto')}» pone {det['mes']}, pero según el cálculo de la línea "
                                   f"ese año hebreo no lleva ese mes; la fecha caería en nisán")
                t = a + (det["dia"] - 1) * dia if _entero(det.get("dia")) else a
                if not y0 <= t < y1 + 1:
                    errores.append(f"{donde}: «{x.get('texto')}» ({det['mes']} {det.get('dia', '')}) empieza en "
                                   f"{t:.3f}, fuera de su tramo [{y0}, {y1 + 1}): el día cae en otro año")
        for k, v in x.items():
            if k != "detalle":
                mirar(v, donde)

    for tipo in build.TIPOS:
        for o in datos[tipo]:
            mirar(build.limpio(o), o["_fichero"])
    return errores


def validar_fuentes(datos, err):
    origen = datos.get("_origen_fuentes") or {}
    for fid, f in datos["fuentes"].items():
        donde = origen.get(fid, "data/fuentes/")
        if not ID.match(str(fid)):
            err(f"{donde}: id '{fid}' no es un slug ASCII en minúsculas")
        for k in REQ_FUENTE:
            if k not in (f or {}):
                err(f"{donde}: {fid} sin '{k}'")
        if (f or {}).get("nivel") not in (1, 2):
            err(f"{donde}: {fid}.nivel debe ser 1 o 2")
        if not str((f or {}).get("url", "")).startswith("https://"):
            err(f"{donde}: {fid}.url debe ser https")
        if (f or {}).get("consultado") and not DIA.match(str(f["consultado"])):
            err(f"{donde}: {fid}.consultado no es AAAA-MM-DD")
        textos_largos(f or {}, f"{donde} ({fid})", err)


def validar_libros(datos, err, meses):
    libros = datos["libros"]
    if len(libros) != 66:
        err(f"data/libros.yaml: tiene {len(libros)} libros; deben ser 66")
    slugs, nums, formas = set(), set(), {}
    for i, l in enumerate(libros):
        donde = f"data/libros.yaml ({l.get('slug', i)})"
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
        if not _entero(l.get("capitulos")) or l["capitulos"] < 1:
            err(f"{donde}: capitulos debe ser un entero positivo")
        for fm in l.get("formas") or []:
            if fm in formas:
                err(f"{donde}: la forma de búsqueda '{fm}' ya es de {formas[fm]}")
            formas[fm] = l.get("slug")
        extra = set(l) - ESTRUCTURA_LIBRO
        if extra - HECHOS_LIBRO - {"fuentes", "razon", "consultado", "estado", "historial", "nota"}:
            err(f"{donde}: campos desconocidos {sorted(extra - HECHOS_LIBRO - {'fuentes', 'razon', 'consultado', 'estado', 'historial', 'nota'})}")
        if extra:
            validar_comun(l, donde, err, datos["fuentes"])
            for k in ("consultado", "estado"):
                if k not in l:
                    err(f"{donde}: un hecho del libro necesita '{k}'")
            for k in ("fecha", "abarca"):
                if k in l:
                    validar_fecha(l[k], f"{donde} {k}", err, meses, l.get("estado"))
            textos_largos(l, donde, err)


def validar_calendario(datos, err):
    meses = datos["calendario"].get("meses") or []
    ids = set()
    for i, m in enumerate(meses):
        donde = f"data/calendario.yaml ({m.get('id', i)})"
        if not ID.match(str(m.get("id"))):
            err(f"{donde}: id '{m.get('id')}' no es un slug ASCII en minúsculas")
        if m.get("id") in ids:
            err(f"{donde}: id repetido")
        ids.add(m.get("id"))
        if not m.get("nombre") or not _entero(m.get("orden")):
            err(f"{donde}: necesita nombre y orden")
        if set(m) - ESTRUCTURA_MES:
            validar_comun(m, donde, err, datos["fuentes"])
            for k in ("consultado", "estado"):
                if k not in m:
                    err(f"{donde}: un hecho del mes necesita '{k}'")
        textos_largos(m, donde, err)
        validar_nombres_mes(m, donde, err)
        validar_fiestas(m, donde, err)
    validar_explicacion(datos["calendario"], err)
    otras = set(datos["calendario"]) - SECCIONES_CALENDARIO
    if otras:
        err(f"data/calendario.yaml: secciones desconocidas {sorted(otras)} (se esperan {sorted(SECCIONES_CALENDARIO)})")
    return ids


def validar_nombres_mes(m, donde, err):
    """Los nombres de un mes por época: como los de un lugar, cada uno con su nota, sus fuentes y su razón."""
    if "nombres" not in m:
        return
    ns = m["nombres"]
    if not isinstance(ns, list) or not ns:
        err(f"{donde}: 'nombres' debe ser una lista no vacía")
        return
    vistos = set()
    for i, n in enumerate(ns):
        nd = f"{donde} nombres[{i}]"
        if not isinstance(n, dict):
            err(f"{nd}: debe ser un objeto {{nombre, desde, hasta, nota, fuentes, razon}}")
            continue
        if set(n) - CAMPOS_NOMBRE_MES:
            err(f"{nd}: campos desconocidos {sorted(set(n) - CAMPOS_NOMBRE_MES)}")
        if not isinstance(n.get("nombre"), str) or not n["nombre"].strip():
            err(f"{nd}: sin 'nombre'")
        elif n["nombre"] in vistos:
            err(f"{nd}: el nombre '{n['nombre']}' está repetido")
        vistos.add(n.get("nombre"))
        for k in ("nota", "razon"):
            if not isinstance(n.get(k), str) or not n[k].strip():
                err(f"{nd}: '{k}' vacía")
        if not isinstance(n.get("fuentes"), list) or not n["fuentes"]:
            err(f"{nd}: 'fuentes' vacío")
        for k in ("desde", "hasta"):
            if k in n and not _entero(n[k]):
                err(f"{nd}.{k} debe ser un año astronómico entero")
        if _entero(n.get("desde")) and _entero(n.get("hasta")) and n["desde"] > n["hasta"]:
            err(f"{nd}: desde ({n['desde']}) es posterior a hasta ({n['hasta']})")
    # Dos épocas distintas solo comparten el año frontera (Abib hasta -536, Nisán desde -536). En ese año gana el nombre
    # que empieza (el de desde), sea cual sea el orden de la lista: así lo hace nombreMes en site/js/trayectorias.js.
    # Dos nombres con la misma época exacta son formas del mismo nombre (Hesván y Marhesván): la línea usa el primero.
    epocas = [(n["nombre"], n.get("desde"), n.get("hasta")) for n in ns
              if isinstance(n, dict) and isinstance(n.get("nombre"), str)
              and all(k not in n or _entero(n[k]) for k in ("desde", "hasta"))]
    for i, (a, ad, ah) in enumerate(epocas):
        for b, bd, bh in epocas[i + 1:]:
            if (ad, ah) == (bd, bh):
                continue
            ini = max(x for x in (ad, bd, float("-inf")) if x is not None)
            fin = min(x for x in (ah, bh, float("inf")) if x is not None)
            if fin - ini > 0:
                err(f"{donde}: las épocas de '{a}' y '{b}' se solapan más de un año (de {ini} a {fin}); "
                    f"solo pueden compartir el año frontera")
    # El mismo nombre vive en dos sitios: otros_nombres (lo usa la fecha escrita) y nombres. Tienen que coincidir.
    if m.get("nombre") not in vistos:
        err(f"{donde}: el nombre principal '{m.get('nombre')}' no está en 'nombres'")
    otros = set(m.get("otros_nombres") or [])
    for o in sorted(otros - vistos):
        err(f"{donde}: '{o}' está en otros_nombres pero no en nombres")
    for o in sorted(vistos - otros - {m.get("nombre")}):
        err(f"{donde}: '{o}' está en nombres pero no en otros_nombres, y la fecha escrita («14 abib 1513 a.e.c.») "
            f"no lo entendería")


def validar_fiestas(m, donde, err):
    """Las fiestas de un mes: sus días y el año desde el que se celebran, con fuentes y razón. Sin 'instituida', la
    línea de tiempo pondría la Pascua antes del éxodo o la Dedicación en tiempos de Nehemías."""
    fs = m.get("fiestas")
    if fs is None:
        return
    if not isinstance(fs, list) or not fs:
        err(f"{donde}: 'fiestas' debe ser una lista no vacía")
        return
    for i, f in enumerate(fs):
        fd = f"{donde} fiestas[{i}]"
        if not isinstance(f, dict):
            err(f"{fd}: debe ser un objeto {{nombre, desde, hasta, instituida, fuentes, razon}}")
            continue
        if set(f) - CAMPOS_FIESTA:
            err(f"{fd}: campos desconocidos {sorted(set(f) - CAMPOS_FIESTA)}")
        if not isinstance(f.get("nombre"), str) or not f["nombre"].strip():
            err(f"{fd}: sin 'nombre'")
        for k in ("desde", "hasta"):
            if not _entero(f.get(k)) or not 1 <= f[k] <= 30:
                err(f"{fd}.{k} debe ser un día del mes, de 1 a 30")
        if _entero(f.get("desde")) and _entero(f.get("hasta")) and f["desde"] > f["hasta"]:
            err(f"{fd}: el día {f['desde']} es posterior al {f['hasta']}")
        if not _entero(f.get("instituida")):
            err(f"{fd}.instituida debe ser el año astronómico desde el que se celebra")
        if not isinstance(f.get("fuentes"), list) or not f["fuentes"]:
            err(f"{fd}: 'fuentes' vacío")
        if not isinstance(f.get("razon"), str) or not f["razon"].strip():
            err(f"{fd}: 'razon' vacía")
        if "estado" in f and f["estado"] not in ESTADOS:
            err(f"{fd}.estado debe ser uno de {sorted(ESTADOS)}")


def validar_explicacion(cal, err):
    """Los hechos de la página «El calendario»: cada uno con id, título, texto y los cuatro campos de siempre."""
    if "explicacion" not in cal:
        return
    lista = cal["explicacion"]
    if not isinstance(lista, list) or not lista:
        err("data/calendario.yaml: 'explicacion' debe ser una lista no vacía")
        return
    ids = set()
    for i, e in enumerate(lista):
        donde = f"data/calendario.yaml (explicacion {e.get('id', i) if isinstance(e, dict) else i})"
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
        for k in ("titulo", "texto"):
            if not isinstance(e.get(k), str) or not e[k].strip():
                err(f"{donde}: '{k}' vacío")
        for k in ("consultado", "estado"):
            if k not in e:
                err(f"{donde}: falta '{k}'")
        validar_comun(e, donde, err, None)
        textos_largos(e, donde, err)


def validar_lugar(o, donde, err, fuentes):
    if o.get("tipo") not in TIPOS_LUGAR:
        err(f"{donde}: tipo '{o.get('tipo')}' no es uno de {sorted(TIPOS_LUGAR)}")
    if o.get("precision") not in PRECISION_LUGAR:
        err(f"{donde}: precision '{o.get('precision')}' no válida")
    cands = o.get("candidatos")
    lat, lon = o.get("lat"), o.get("lon")
    sin_punto = cands is not None and lat is None and lon is None
    if not sin_punto:
        if not _numero(lat) or not -90 <= lat <= 90:
            err(f"{donde}: lat fuera de rango" + ("" if cands is not None else " (solo con candidatos puede ser null)"))
        if not _numero(lon) or not -180 <= lon <= 180:
            err(f"{donde}: lon fuera de rango" + ("" if cands is not None else " (solo con candidatos puede ser null)"))
    if cands is not None:
        if not isinstance(cands, list):
            err(f"{donde}: candidatos debe ser una lista")
            cands = []
        if o.get("precision") not in ("zona", "incierto"):
            err(f"{donde}: con candidatos, precision debe ser zona o incierto")
        if not cands and o.get("estado") != "pendiente":
            err(f"{donde}: candidatos vacío solo vale con estado: pendiente")
        for i, c in enumerate(cands):
            cd = f"{donde} candidatos[{i}]"
            if not isinstance(c, dict):
                err(f"{cd}: debe ser un objeto")
                continue
            if not str(c.get("nombre") or "").strip():
                err(f"{cd}: sin nombre")
            if c.get("estado") not in ESTADOS_CANDIDATO:
                err(f"{cd}: estado '{c.get('estado')}' no es uno de {sorted(ESTADOS_CANDIDATO)}")
            if not isinstance(c.get("fuentes"), list) or not c.get("fuentes"):
                err(f"{cd}: 'fuentes' vacío")
            if not str(c.get("razon") or "").strip():
                err(f"{cd}: 'razon' vacía")
            g = c.get("geometria")
            if not isinstance(g, dict) or g.get("tipo") not in GEOMETRIAS:
                err(f"{cd}: geometria.tipo debe ser uno de {sorted(GEOMETRIAS)}")
                continue
            for p, nombre in ((g, "geometria"), (g.get("hasta"), "geometria.hasta")):
                if p is None and nombre == "geometria.hasta":
                    continue
                if not isinstance(p, dict) or not _numero(p.get("lat")) or not _numero(p.get("lon")) \
                        or not -90 <= p["lat"] <= 90 or not -180 <= p["lon"] <= 180:
                    err(f"{cd}: {nombre} necesita lat y lon dentro de rango")
            if g["tipo"] == "zona" and (not _numero(g.get("radio_km")) or g["radio_km"] <= 0):
                err(f"{cd}: una zona necesita radio_km mayor que 0")
            if g["tipo"] == "franja" and g.get("hasta") is None:
                err(f"{cd}: una franja necesita hasta: {{lat, lon}}")
            cf = str(c.get("coord_fuente") or "")
            if cf == "calculo":
                if not str(c.get("nota") or "").strip():
                    err(f"{cd}: coord_fuente calculo necesita nota con la cuenta del punto")
            elif cf.startswith("openbible:") and cf[10:]:
                if not str(c.get("coord_url") or "").startswith(f"https://www.openbible.info/geo/ancient/{cf[10:]}/"):
                    err(f"{cd}: coord_url debe ser la ficha de OpenBible de {cf}")
            else:
                err(f"{cd}: coord_fuente debe ser openbible:<id> o calculo (de dónde sale el punto)")
    if not any(e.get("tipo") == "perspicacia" for e in o.get("enlaces") or []) and o.get("estado") != "pendiente":
        err(f"{donde}: sin enlace a Perspicacia debe llevar estado: pendiente")


def validar_persona(o, donde, err, fuentes, meses):
    if "desambiguacion" in o and not str(o.get("desambiguacion") or "").strip():
        err(f"{donde}: desambiguacion vacía")
    ncc = o.get("no_confundir_con")
    if ncc is not None and (not isinstance(ncc, list) or not all(ID.match(str(x)) for x in ncc)):
        err(f"{donde}: no_confundir_con debe ser una lista de ids de personas")
    na = o.get("no_afirmamos")
    if na is not None and not isinstance(na, list):
        err(f"{donde}: no_afirmamos debe ser una lista de frases")
    rels = o.get("relaciones")
    if rels is None:
        return
    if not isinstance(rels, list):
        err(f"{donde}: relaciones debe ser una lista")
        return
    for i, r in enumerate(rels):
        rd = f"{donde} relaciones[{i}]"
        if not isinstance(r, dict):
            err(f"{rd}: debe ser un objeto")
            continue
        t = r.get("tipo")
        if t not in TIPOS_RELACION:
            err(f"{rd}: tipo '{t}' no es uno de {sorted(TIPOS_RELACION)}")
        elif t in RELACION_CON_LUGAR:
            if not r.get("lugar") or r.get("persona"):
                err(f"{rd}: {t} lleva 'lugar' (y no 'persona')")
        else:
            if not r.get("persona") or r.get("lugar"):
                err(f"{rd}: {t} lleva 'persona' (y no 'lugar')")
            if r.get("persona") == o.get("id"):
                err(f"{rd}: una persona no se relaciona consigo misma")
        if "relacion" in r and not str(r.get("relacion") or "").strip():
            err(f"{rd}: relacion vacía")
        if not isinstance(r.get("deducido"), bool):
            err(f"{rd}: deducido debe ser true o false")
        validar_hecho(r, rd, err, fuentes)
        if "fecha" in r:
            validar_fecha(r["fecha"], rd, err, meses, r.get("estado"))


def validar_alternativas(o, donde, err, meses):
    alts = o.get("alternativas")
    if alts is None:
        return
    if not isinstance(alts, list):
        err(f"{donde}: alternativas debe ser una lista")
        return
    for i, a in enumerate(alts):
        ad = f"{donde} alternativas[{i}]"
        if not isinstance(a, dict):
            err(f"{ad}: debe ser un objeto {{fecha, fuentes, nota}}")
            continue
        if not isinstance(a.get("fuentes"), list) or not a.get("fuentes"):
            err(f"{ad}: 'fuentes' vacío (solo con una fuente que jw.org haya usado)")
        if not str(a.get("nota") or "").strip():
            err(f"{ad}: 'nota' vacía")
        if "fecha" not in a:
            err(f"{ad}: sin fecha")
        else:
            validar_fecha(a["fecha"], ad, err, meses, o.get("estado"))
            if (a.get("fecha") or {}).get("cronologia") != "secular":
                err(f"{ad}: una alternativa lleva fecha.cronologia: secular")


def validar_recorrido(o, donde, err):
    paradas = o.get("paradas")
    if not isinstance(paradas, list) or not paradas:
        err(f"{donde}: paradas vacío")
        return
    for i, p in enumerate(paradas):
        pd = f"{donde} paradas[{i}]"
        if not isinstance(p, dict):
            err(f"{pd}: debe ser un objeto")
            continue
        for k in REQ_PARADA_RECORRIDO:
            if k not in p:
                err(f"{pd}: falta '{k}'")
        if "t" in p and (not _numero(p["t"]) or not -4100 <= p["t"] <= 2100):
            err(f"{pd}: t debe ser un año (número, astronómico) entre -4100 y 2100")
        if not str(p.get("texto") or "").strip():
            err(f"{pd}: texto vacío")
        if not isinstance(p.get("pasajes"), list):
            err(f"{pd}: pasajes debe ser una lista")
        if "no_sabemos" in p and not str(p.get("no_sabemos") or "").strip():
            err(f"{pd}: no_sabemos vacío")
        q = p.get("pregunta")
        if q is not None:
            if not isinstance(q, dict):
                err(f"{pd}: pregunta debe ser un objeto {{texto, opciones, respuesta, explicacion}}")
                continue
            for k in ("texto", "opciones", "respuesta", "explicacion"):
                if not q.get(k):
                    err(f"{pd}: pregunta sin '{k}'")
            ops = q.get("opciones")
            if not isinstance(ops, list) or len(ops) < 2:
                err(f"{pd}: pregunta.opciones necesita al menos dos opciones")
            elif q.get("respuesta") not in ops:
                err(f"{pd}: pregunta.respuesta tiene que ser una de las opciones")


def validar_hallazgo(o, donde, err, fuentes):
    if not isinstance(o.get("relaciona"), list):
        err(f"{donde}: relaciona debe ser una lista de selecciones tipo:id")
    if "identificacion" in o and o["identificacion"] not in IDENTIFICACIONES:
        err(f"{donde}: identificacion '{o['identificacion']}' no es una de {sorted(IDENTIFICACIONES)}")
    if "donde_hoy" in o and (not isinstance(o["donde_hoy"], str) or not o["donde_hoy"].strip()):
        err(f"{donde}: donde_hoy debe ser un texto")
    if "no_afirmamos" in o and not isinstance(o["no_afirmamos"], list):
        err(f"{donde}: no_afirmamos debe ser una lista de frases")
    niveles = {(fuentes.get(fid) or {}).get("nivel") for fid in o.get("fuentes") or []}
    if 2 in niveles and 1 not in niveles:
        err(f"{donde}: una fuente de nivel 2 solo vale junto a una de nivel 1 que la cite")


def validar(datos):
    errores = []
    err = errores.append
    fuentes = datos["fuentes"]
    validar_fuentes(datos, err)
    meses = validar_calendario(datos, err)
    validar_libros(datos, err, meses)

    for tipo in build.TIPOS:
        vistos = set()
        for o in datos[tipo]:
            donde = o["_fichero"]
            limpio = build.limpio(o)
            for k in REQUERIDOS[tipo]:
                if k not in limpio:
                    err(f"{donde}: falta '{k}'")
            oid = o.get("id")
            if not ID.match(str(oid)):
                err(f"{donde}: id '{oid}' no es un slug ASCII en minúsculas")
            if oid != o["_nombre_fichero"]:
                err(f"{donde}: id '{oid}' no coincide con el nombre del fichero")
            if oid in vistos:
                err(f"{donde}: id '{oid}' repetido")
            vistos.add(oid)
            validar_comun(limpio, donde, err, fuentes)
            for campo in ("fecha", "fecha_objeto"):
                if campo in limpio:
                    validar_fecha(limpio[campo], donde, err, meses, limpio.get("estado"))
            validar_alternativas(limpio, donde, err, meses)
            orden = limpio.get("orden_relato")
            if orden is not None and (not isinstance(orden, dict) or not ID.match(str(orden.get("serie")))
                                      or not _entero(orden.get("orden")) or orden["orden"] < 0):
                err(f"{donde}: orden_relato debe ser {{serie: <slug>, orden: <entero>}}")
            # Un tras que no es texto lo cuenta build.integridad, que también lo necesita sin validate.
            if isinstance(orden, dict) and isinstance(orden.get("tras"), str) and not ID.match(orden["tras"]):
                err(f"{donde}: orden_relato.tras debe ser el id de un evento")
            textos_largos(limpio, donde, err)
            if tipo == "lugares":
                validar_lugar(limpio, donde, err, fuentes)
            if tipo in ("lugares", "personas"):
                for i, n in enumerate(limpio.get("nombres") or []):
                    if not n.get("nombre"):
                        err(f"{donde}: nombres[{i}] sin 'nombre'")
                    for k in ("desde", "hasta"):
                        if k in n and not isinstance(n[k], int):
                            err(f"{donde}: nombres[{i}].{k} debe ser un año entero")
                if not limpio.get("nombres"):
                    err(f"{donde}: 'nombres' vacío")
            if tipo == "personas":
                validar_persona(limpio, donde, err, fuentes, meses)
            if tipo == "viajes":
                ordenes = []
                for i, p in enumerate(limpio.get("paradas") or []):
                    pd = f"{donde} parada {p.get('orden', i)}"
                    for k in REQ_PARADA:
                        if k not in p:
                            err(f"{pd}: falta '{k}'")
                    validar_comun(p, pd, err, fuentes)
                    if "fecha" in p:
                        validar_fecha(p["fecha"], pd, err, meses, p.get("estado"))
                    ordenes.append(p.get("orden"))
                if ordenes != list(range(1, len(ordenes) + 1)):
                    err(f"{donde}: las paradas deben numerarse 1, 2, 3... sin huecos")
            if tipo == "cartas":
                for k in ("contexto_origen", "contexto_destino"):
                    c = limpio.get(k) or {}
                    if not c.get("resumen") or not c.get("fuentes"):
                        err(f"{donde}: {k} necesita resumen y fuentes")
                if not (limpio.get("destinatarios") or {}).get("texto"):
                    err(f"{donde}: destinatarios.texto vacío")
                for k in ("portadores",):
                    if k in limpio and not isinstance(limpio[k], list):
                        err(f"{donde}: {k} debe ser una lista de ids de personas")
                if "personas" in (limpio.get("destinatarios") or {}) and not isinstance(limpio["destinatarios"]["personas"], list):
                    err(f"{donde}: destinatarios.personas debe ser una lista de ids de personas")
            if tipo == "eventos" and "presentes" in limpio and not (
                    isinstance(limpio["presentes"], list) and limpio["presentes"]):
                err(f"{donde}: presentes debe ser una lista no vacía de ids de personas")
            if tipo == "periodos" and "consta_desde" in limpio:
                cd, fd = limpio["consta_desde"], limpio.get("fecha") or {}
                if limpio.get("tipo") != "potencia" or fd.get("desde") is not None:
                    err(f"{donde}: consta_desde solo vale en una potencia sin fecha.desde")
                elif not _entero(cd) or (_entero(fd.get("hasta")) and cd > fd["hasta"]):
                    err(f"{donde}: consta_desde debe ser un año astronómico entero anterior a fecha.hasta")
            if tipo == "periodos" and limpio.get("tipo") not in TIPOS_PERIODO:
                err(f"{donde}: tipo '{limpio.get('tipo')}' no es uno de {sorted(TIPOS_PERIODO)}")
            if tipo == "hallazgos":
                validar_hallazgo(limpio, donde, err, fuentes)
            if tipo == "recorridos":
                validar_recorrido(limpio, donde, err)
    validar_consta_desde(datos, err)
    validar_padres_hijos(datos, err)
    errores.extend(build.integridad(datos))
    errores.extend(pablo_en_su_sitio(datos))
    errores.extend(meses_en_su_anio(datos))
    return errores


# Las mismas palabras que agrupa la tarjeta Familia (site/js/tipos/persona.js).
PALABRAS_PADRE = {"padre", "madre", "padre adoptivo", "madre adoptiva"}
PALABRAS_HIJO = {"hijo", "hija", "hijo adoptivo", "hija adoptiva", "hijastro", "hijastra", "hijastro e hijo adoptivo"}


def validar_padres_hijos(datos, err):
    """Una relación pariente escrita en X con persona Y y relacion R dice «Y es el R de X». Si X e Y la declaran los
    dos con palabras de padres o hijos, uno pone una palabra de padre y el otro una de hijo."""
    dichas = {}
    for o in datos["personas"]:
        for r in o.get("relaciones") or []:
            if isinstance(r, dict) and r.get("tipo") == "pariente" and isinstance(r.get("persona"), str):
                palabra = str(r.get("relacion") or "").strip()
                if palabra in PALABRAS_PADRE or palabra in PALABRAS_HIJO:
                    dichas[(o.get("id"), r["persona"])] = (palabra, o["_fichero"])
    for (x, y), (px, fx) in sorted(dichas.items()):
        if x > y or (y, x) not in dichas:
            continue
        py, fy = dichas[(y, x)]
        if (px in PALABRAS_PADRE) == (py in PALABRAS_PADRE):
            err(f"{fx}: {x} llama a {y} «{px}» y {fy} llama a {x} «{py}»; una relación pariente dice «persona es "
                f"el R de esta ficha», así que un lado lleva palabra de padre y el otro de hijo")


def validar_consta_desde(datos, err):
    """consta_desde tiene que caer después del ascenso de la potencia anterior, en el mismo orden que usa el sitio
    (BE.tramoPotencia: por fecha.desde; la que solo tiene fin va justo antes de la que empieza ese año)."""
    def clave(p):
        f = p.get("fecha") or {}
        return f["desde"] if _numero(f.get("desde")) else f["hasta"] - 0.5
    ps = [p for p in datos["periodos"] if p.get("tipo") == "potencia" and isinstance(p.get("fecha"), dict)
          and (_numero(p["fecha"].get("desde")) or _numero(p["fecha"].get("hasta")))]
    ps.sort(key=clave)
    for i, p in enumerate(ps):
        cd = p.get("consta_desde")
        if not _entero(cd) or i == 0:
            continue
        ant = ps[i - 1]
        desde = (ant.get("fecha") or {}).get("desde")
        if _numero(desde) and cd <= desde:
            err(f"{p['_fichero']}: consta_desde {cd} no es posterior al ascenso de la potencia anterior, "
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

    rec(datos["fuentes"])
    for t in build.TIPOS:
        rec([build.limpio(o) for o in datos[t]])
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
    ap = argparse.ArgumentParser(description="Valida los datos de biblical-earth.")
    ap.add_argument("--data", default=str(build.RAIZ / "data"), help="directorio de datos (por defecto data/)")
    ap.add_argument("--links", action="store_true", help="comprueba que cada URL responde 200")
    args = ap.parse_args(argv)
    datos, _ = build.cargar(args.data)
    errores = validar(datos)
    for e in errores:
        print("ERROR", e)
    n = sum(len(datos[t]) for t in build.TIPOS)
    n_impl = sum(1 for f in datos["fuentes"].values() if f.get("implicita"))
    print(f"validate: {n} ficheros de entidades, {len(datos['fuentes'])} fuentes ({n_impl} capítulos implícitos) y "
          f"{len(datos['libros'])} libros; {len(errores)} errores de esquema.")
    fallos = []
    if args.links:
        lista = urls(datos)
        fallos = comprobar_enlaces(lista)
        for f in fallos:
            print("ENLACE ROTO", f)
        print(f"validate --links: {len(lista)} enlaces comprobados, {len(fallos)} fallos.")
    return 1 if errores or fallos else 0


if __name__ == "__main__":
    sys.exit(main())
