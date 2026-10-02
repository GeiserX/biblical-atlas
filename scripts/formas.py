"""La forma de una zona (`shape`): su contorno en coordenadas, para validate.py y build.py.

Un solo sitio hace la cuenta: validate.py comprueba con ella que el punto del lugar cae dentro y build.py escribe el
contorno (`ring`) y su caja (`bbox`) en data.json, que el sitio dibuja tal cual. Esquema en docs/investigacion/README.md.
"""
import math

TIPOS = ("circle", "ellipse", "box", "polygon")
MAX_VERTICES = 12
PASOS = 72             # puntos de un círculo o una elipse
R = 6371.0             # radio de la Tierra, km
HOLGURA_KM = 0.5       # un punto a menos de esto del borde cuenta como dentro


def destino(lat, lon, rumbo, km):
    """El punto a km kilómetros de (lat, lon) con ese rumbo (grados desde el norte)."""
    d, b = km / R, math.radians(rumbo)
    f1, l1 = math.radians(lat), math.radians(lon)
    f2 = math.asin(math.sin(f1) * math.cos(d) + math.cos(f1) * math.sin(d) * math.cos(b))
    l2 = l1 + math.atan2(math.sin(b) * math.sin(d) * math.cos(f1), math.cos(d) - math.sin(f1) * math.sin(f2))
    return math.degrees(f2), math.degrees(l2)


def km_entre(a, b):
    """Distancia en km entre dos puntos (lat, lon)."""
    f1, f2 = math.radians(a[0]), math.radians(b[0])
    h = math.sin((f2 - f1) / 2) ** 2 + math.cos(f1) * math.cos(f2) * math.sin(math.radians(b[1] - a[1]) / 2) ** 2
    return 2 * R * math.asin(min(1, math.sqrt(h)))


def centro(forma, lat, lon):
    c = forma.get("center")
    return (c["lat"], c["lon"]) if isinstance(c, dict) else (lat, lon)


def puntos_de_vertices(lugares):
    """{id: (lat, lon)} de los lugares que un vértice puede nombrar: los de punto exacto (precision: point). El punto de
    una zona (un río, una región) solo la representa: si se moviera, cambiaría el contorno de otra ficha sin aviso."""
    num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
    return {o.get("id"): (o["lat"], o["lon"]) for o in lugares
            if num(o.get("lat")) and num(o.get("lon")) and o.get("candidates") is None and o.get("precision") == "point"}


def vertices(forma, puntos):
    """Los vértices de un polígono como (lat, lon): un par escrito o el punto del lugar que nombra el id."""
    out = []
    for v in forma.get("vertices") or []:
        out.append(tuple(puntos[v]) if isinstance(v, str) else (v[0], v[1]))
    return out


def anillo(forma, lat, lon, puntos=None):
    """Contorno cerrado [[lon, lat], ...] de la forma, alrededor del punto (lat, lon) si la forma no lleva center.
    puntos: {id de lugar: (lat, lon)} para los vértices que nombran un lugar."""
    t = forma.get("type")
    if t in ("circle", "ellipse"):
        clat, clon = centro(forma, lat, lon)
        a, b = (forma["radius_km"],) * 2 if t == "circle" else forma["radii_km"]
        rumbo = forma.get("bearing", 0) if t == "ellipse" else 0
        pts = []
        for k in range(PASOS + 1):
            u = 2 * math.pi * k / PASOS
            x, y = a * math.cos(u), b * math.sin(u)          # x a lo largo del eje, y de través (a su derecha)
            f, g = destino(clat, clon, rumbo + math.degrees(math.atan2(y, x)), math.hypot(x, y))
            pts.append([round(g, 5), round(f, 5)])
        return pts
    if t == "box":
        c = forma["bounds"]
        s, w, n, e = c["south"], c["west"], c["north"], c["east"]
        return [[w, s], [e, s], [e, n], [w, n], [w, s]]
    vs = vertices(forma, puntos or {})
    return [[round(g, 5), round(f, 5)] for f, g in vs + vs[:1]]


def caja(ring):
    """[[oeste, sur], [este, norte]] de un contorno."""
    lons, lats = [p[0] for p in ring], [p[1] for p in ring]
    return [[min(lons), min(lats)], [max(lons), max(lats)]]


def _km_al_segmento(p, a, b):
    """Distancia aproximada en km de p a un segmento, en un plano local (vale para zonas de pocos cientos de km)."""
    k = math.cos(math.radians(p[1]))
    ax, ay, bx, by, px, py = a[0] * k, a[1], b[0] * k, b[1], p[0] * k, p[1]
    dx, dy = bx - ax, by - ay
    t = 0 if dx == dy == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy) * 111.2


def dentro(ring, lat, lon, holgura_km=HOLGURA_KM):
    """¿Cae (lat, lon) dentro del contorno, o a menos de holgura_km de su borde?"""
    p, n, dentro_ = [lon, lat], len(ring) - 1, False
    for i in range(n):
        a, b = ring[i], ring[i + 1]
        if (a[1] > lat) != (b[1] > lat) and lon < a[0] + (lat - a[1]) * (b[0] - a[0]) / (b[1] - a[1]):
            dentro_ = not dentro_
    return dentro_ or any(_km_al_segmento(p, ring[i], ring[i + 1]) <= holgura_km for i in range(n))


def se_cruza(ring):
    """¿Se cortan dos lados no contiguos del contorno? Un polígono que se cruza no encierra una zona clara."""
    def cruce(p1, p2, p3, p4):
        d = lambda a, b, c: (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        return d(p3, p4, p1) * d(p3, p4, p2) < 0 and d(p1, p2, p3) * d(p1, p2, p4) < 0
    lados = [(ring[i], ring[i + 1]) for i in range(len(ring) - 1)]
    n = len(lados)
    return any(cruce(*lados[i], *lados[j]) for i in range(n) for j in range(i + 2, n) if not (i == 0 and j == n - 1))
