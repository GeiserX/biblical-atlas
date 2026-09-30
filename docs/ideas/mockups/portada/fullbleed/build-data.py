#!/usr/bin/env python3
"""Copia pequeña de los datos que usa la portada «Una imagen a pantalla completa».

Lee site/data.json (lo compila scripts/build.py) y escribe data.js a su lado: las nueve épocas con su recorte del
relieve, los recorridos, las tres preguntas, las seis fechas del banner, un dato con su fuente y las cifras del atlas.
La página lee /site/data.json cuando está; esta copia sirve cuando se abre sin el sitio.

    python3 docs/ideas/mockups/portada/fullbleed/build-data.py        # desde la raíz del repositorio
"""
import json
import math
import pathlib

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parents[4]
D = json.loads((RAIZ / "site" / "data.json").read_text(encoding="utf-8"))

# Las capturas del relieve (assets/render-backdrops.mjs): centro, grados de longitud a lo ancho y tamaño en píxeles.
IMAGENES = {
    "bible-lands": {"c": [36.2, 31.4], "span": 28, "w": 2560, "h": 1440, "src": "../assets/img/bible-lands-wide.webp"},
    "paul-journeys": {"c": [24.6, 36.4], "span": 25, "w": 2560, "h": 1440, "src": "../assets/img/paul-journeys-wide-1280.webp"},
    "bible-lands-tall": {"c": [37.4, 31.2], "span": 20, "w": 860, "h": 1800, "src": "../assets/img/bible-lands-tall.webp"},
}
ASPECTO = 3 / 2  # ancho / alto de cada recorte en la tarjeta


def merc(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def lat_de(y):
    return math.degrees(2 * math.atan(math.exp(y)) - math.pi / 2)


def extension(im):
    """Caja de la imagen en coordenadas de Mercator (radianes): x0, x1, y0 (sur), y1 (norte)."""
    px_rad = im["w"] / math.radians(im["span"])
    cx, cy = math.radians(im["c"][0]), merc(im["c"][1])
    return cx - im["w"] / 2 / px_rad, cx + im["w"] / 2 / px_rad, cy - im["h"] / 2 / px_rad, cy + im["h"] / 2 / px_rad


for k, im in IMAGENES.items():
    x0, x1, y0, y1 = extension(im)
    im["bounds"] = [[round(math.degrees(x0), 4), round(lat_de(y0), 4)], [round(math.degrees(x1), 4), round(lat_de(y1), 4)]]

L = D["lugares"]
seguro = lambda i: i in L and L[i].get("precision") == "punto"


def tramo(f):
    a = f.get("desde") if f.get("desde") is not None else f.get("hasta")
    b = f.get("hasta") if f.get("hasta") is not None else f.get("desde")
    return (a, b + 1) if a is not None else None


def cuantil(xs, q):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, max(0, int(round(q * (len(xs) - 1)))))]


# Un encuadre escrito a mano gana al calculado. Antes del Diluvio ningún lugar tiene punto: Edén y Ararat son zonas
# sin coordenadas, así que el recorte enseña Mesopotamia y los montes del norte y el texto nombra las zonas.
# En la de los patriarcas, el cálculo recortaba Ur y Harán por quedar lejos: el camino de Abrahán es lo que se ve.
A_MANO = {"de-adan-al-diluvio": {"caja": [[40.5, 29.8], [48.4, 35.6]], "zonas": ["Edén", "Ararat"]},
          "los-patriarcas": {"caja": [[31.0, 29.6], [47.2, 37.6]], "puntos": ["ur", "haran", "hebron"]}}


def recorte(peso, caja=None):
    """Recorte 3:2 que abarca los lugares de más peso (del 8 al 92 %), dentro de una de las imágenes."""
    if caja:
        (a, s), (b, n) = caja
    else:
        pts = []
        for i, k in peso.items():
            pts += [(L[i]["lon"], L[i]["lat"])] * k
        lons, lats = [p[0] for p in pts], [p[1] for p in pts]
        a, b = cuantil(lons, 0.08), cuantil(lons, 0.92)
        s, n = cuantil(lats, 0.08), cuantil(lats, 0.92)
    x0, x1, y0, y1 = math.radians(a), math.radians(b), merc(s), merc(n)
    # Margen del 18 % y un tamaño mínimo (unos 4 grados), para que se lea la tierra alrededor.
    w, h = max(x1 - x0, math.radians(4)), max(y1 - y0, math.radians(2.6))
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    if not caja:
        w, h = w * 1.36, h * 1.36
    if w / h < ASPECTO:
        w = h * ASPECTO
    else:
        h = w / ASPECTO
    for clave in ("bible-lands", "paul-journeys", "bible-lands-tall"):
        im = IMAGENES[clave]
        e0, e1, f0, f1 = extension(im)
        k = min(1, (e1 - e0) / w, (f1 - f0) / h)   # hasta un 20 % más cerca si no cabe entero
        if k >= 0.8:
            ww, hh = w * k, h * k
            ccx = min(max(cx, e0 + ww / 2), e1 - ww / 2)
            ccy = min(max(cy, f0 + hh / 2), f1 - hh / 2)
            if abs(ccx - cx) < ww * 0.25 and abs(ccy - cy) < hh * 0.25:
                cx, cy, w, h = ccx, ccy, ww, hh
                break
    else:
        raise SystemExit(f"ningún relieve contiene el recorte {math.degrees(cx):.2f},{lat_de(cy):.2f} {math.degrees(w):.2f}")
    X0, X1, Y0, Y1 = cx - w / 2, cx + w / 2, cy - h / 2, cy + h / 2
    # background-size y background-position en % para que el recorte llene su caja sin JavaScript.
    size = (e1 - e0) / w * 100
    posx = 0 if (e1 - e0) == w else (X0 - e0) / ((e1 - e0) - w) * 100
    posy = 0 if (f1 - f0) == h else (f1 - Y1) / ((f1 - f0) - h) * 100
    caja = [[round(math.degrees(X0), 4), round(lat_de(Y0), 4)], [round(math.degrees(X1), 4), round(lat_de(Y1), 4)]]
    return clave, caja, [round(size, 3), round(posx, 3), round(posy, 3)], (X0, X1, Y0, Y1)


eras = sorted([p for p in D["periodos"] if p.get("tipo") == "era" and tramo(p["fecha"])], key=lambda p: tramo(p["fecha"])[0])
epocas = []
for n, p in enumerate(eras, 1):
    a, b = tramo(p["fecha"])
    fin = tramo(eras[n]["fecha"])[0] if n < len(eras) else b   # las épocas comparten el año de la frontera
    # El recorte abarca los lugares con punto o con zona; los inciertos no cuentan y nada se dibuja como punto falso.
    peso = {}
    for e in D["eventos"]:
        t = tramo(e.get("fecha") or {})
        if not t or not (a <= t[0] < fin):
            continue
        for i in e.get("lugares", []):
            if i in L and L[i].get("precision") in ("punto", "zona") and L[i].get("lon") is not None:
                peso[i] = peso.get(i, 0) + 1
    if not peso:   # una época sin lugares con punto ni zona: su recorte sale de los inciertos, que tampoco se dibujan
        for e in D["eventos"]:
            t = tramo(e.get("fecha") or {})
            if t and a <= t[0] < fin:
                for i in e.get("lugares", []):
                    if i in L and L[i].get("lon") is not None:
                        peso[i] = peso.get(i, 0) + 1
    mano = A_MANO.get(p["id"], {})
    img, caja, fondo, (X0, X1, Y0, Y1) = recorte(peso, mano.get("caja"))
    principales = mano.get("puntos", []) + [i for i, _ in sorted(peso.items(), key=lambda kv: -kv[1]) if i not in mano.get("puntos", [])]
    puntos = []
    for i in principales:
        x, y = math.radians(L[i]["lon"]), merc(L[i]["lat"])
        px, py = (x - X0) / (X1 - X0) * 100, (Y1 - y) / (Y1 - Y0) * 100
        cerca = any(abs(px - q["x"]) < 7 and abs(py - q["y"]) < 9 for q in puntos)
        if 4 < px < 96 and 6 < py < 94 and seguro(i) and not cerca:
            puntos.append({"id": i, "nombre": L[i]["nombre"], "x": round(px, 2), "y": round(py, 2)})
        if len(puntos) == 4:
            break
    epocas.append({
        "n": n, "id": p["id"], "nombre": p["nombre"], "texto": p["fecha"].get("texto"), "a": a, "b": b,
        "sinLibro": "sin libro" in (p.get("resumen") or "").lower(),
        "img": img, "caja": caja, "fondo": fondo, "puntos": puntos,
        "lugares": [q["nombre"] for q in puntos][:3] or [L[i]["nombre"] for i in principales][:3],
        "zonas": mano.get("zonas") or ([L[i]["nombre"] for i in principales if L[i].get("precision") == "zona"][:2] if not puntos else []),
    })


def primera_frase(t, maximo=120):
    t = " ".join(t.split())
    if len(t) <= maximo:
        return t
    corte = t[:maximo].rsplit(" ", 1)[0].rstrip(",;:")
    return corte + "…"


def fmt_anio(y):
    return f"{y} e.c." if y > 0 else f"{1 - y} a.e.c."


recorridos = []
for r in D["recorridos"]:
    ts = [p["t"] for p in r["paradas"]]
    a, b = math.floor(min(ts)), math.floor(max(ts))
    if a > 0 and b > 0:
        fechas = f"{a} e.c." if a == b else f"{a} a {b} e.c."
    else:
        fechas = f"{fmt_anio(a)} a {fmt_anio(b)}" if a != b else fmt_anio(a)
    recorridos.append({"id": r["id"], "titulo": r["titulo"], "paradas": len(r["paradas"]), "fechas": fechas,
                       "resumen": r.get("resumen"), "empieza": None if r.get("resumen") else primera_frase(r["paradas"][0]["texto"])})

EV = {e["id"]: e for e in D["eventos"]}
# Las seis fechas del banner (docs/images/banner.svg). Cada una lleva a un suceso real y a la época en que cae.
SEIS = [("creacion-de-adan", "4026 a.e.c."), ("diluvio", "2370 a.e.c."), ("exodo", "1513 a.e.c."),
        ("destruccion-de-jerusalen-607", "607 a.e.c."), ("muerte-de-jesus", "33 e.c."), ("muerte-del-apostol-juan", "100 e.c.")]
# La época de cada fecha: 2370 abre la de los patriarcas y 33 cierra la de Jesús (las fronteras son de las dos).
ERA_DE = {"creacion-de-adan": "de-adan-al-diluvio", "diluvio": "los-patriarcas", "exodo": "exodo-y-desierto",
          "destruccion-de-jerusalen-607": "destierro-y-regreso", "muerte-de-jesus": "jesus-en-la-tierra",
          "muerte-del-apostol-juan": "congregacion-cristiana"}
fechas = []
for eid, etiqueta in SEIS:
    e = EV[eid]
    y = e["fecha"]["desde"]
    era = next(x for x in epocas if x["id"] == ERA_DE[eid])
    fechas.append({"sel": f"evento:{eid}", "etiqueta": etiqueta, "anio": y, "suceso": e["titulo"], "era": era["id"],
                   "a": era["a"], "b": era["b"]})

e607 = EV["destruccion-de-jerusalen-607"]
fuente = D["fuentes"][e607["fuentes"][0]]
alt = (e607.get("alternativas") or [{}])[0]
dato = {
    "sel": "evento:destruccion-de-jerusalen-607", "titulo": e607["titulo"], "fecha": e607["fecha"]["texto"],
    "resumen": e607["resumen"], "pasajes": e607["pasajes"][:3], "estado": e607.get("estado"),
    "fuente": {"titulo": fuente["titulo"], "obra": fuente["obra"], "url": fuente["url"], "nivel": fuente["nivel"]},
    "otra": {"fecha": alt.get("fecha", {}).get("texto"), "nota": alt.get("nota")} if alt else None,
}

cifras = {"sucesos": len(D["eventos"]), "lugares": len(D["lugares"]), "personas": len(D["personas"]),
          "fuentes": len(D["fuentes"]), "generado": D.get("generado")}
libros = {str(l["num"]): {"nombre": l["nombre"], "slug": l["slug"], "abr": l["abr"], "capitulos": l["capitulos"]} for l in D["libros"]}

preguntas = [
    {"texto": "¿Qué pasaba en Babilonia en tiempos de Jesús?", "sel": "lugar:babilonia", "t": 30.5, "pista": "Babilonia · c. 30 e.c."},
    {"texto": "¿Quién había en Judá con los medos y persas?", "sel": "lugar:jerusalen", "t": -518.5, "pista": "Jerusalén · c. 520 a.e.c."},
    {"texto": "¿Desde dónde escribió Pablo cada carta?", "sel": "persona:pablo", "t": 50.3, "extra": "cartas=todas", "pista": "Pablo · 50 a 65 e.c."},
]

salida = {"imagenes": IMAGENES, "epocas": epocas, "recorridos": recorridos, "fechas": fechas, "dato": dato,
          "cifras": cifras, "libros": libros, "preguntas": preguntas}
texto = json.dumps(salida, ensure_ascii=False, separators=(",", ":"))
(AQUI / "data.js").write_text(
    "/* Copia pequeña de site/data.json para la portada «Una imagen a pantalla completa». La escribe build-data.py; "
    "no se edita a mano. */\nwindow.FB_DATA = " + texto + ";\n", encoding="utf-8")
print(f"data.js: {len(texto) // 1024} KB, {len(epocas)} épocas, {len(recorridos)} recorridos")
for x in epocas:
    print(x["n"], x["nombre"], x["img"], x["caja"], [p["nombre"] for p in x["puntos"]])
