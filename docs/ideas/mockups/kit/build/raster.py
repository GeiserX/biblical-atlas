"""Compone el relieve sombreado de cada extension en dos estilos: antiguo y actual."""
import json, math, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import terrain
Image.MAX_IMAGE_PIXELS = None
HERE = sys.argv[1] if len(sys.argv) > 1 else '..'
E = json.load(open('extents.json'))

def hexc(h): h = h.lstrip('#'); return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)], np.float32)
def ramp(v, stops):
    xs = np.array([s[0] for s in stops], np.float32); cs = np.stack([hexc(s[1]) for s in stops])
    out = np.empty(v.shape + (3,), np.float32)
    for i in range(3): out[..., i] = np.interp(v, xs, cs[:, i])
    return out

def polys(geo, keep=lambda p: True):
    for f in geo['features']:
        if not keep(f['properties']): continue
        g = f['geometry']; parts = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        for p in parts: yield p

def mask(ext, W, H, k, ss=3):
    c = math.cos(math.radians(ext['phi']))
    img = Image.new('L', (W * ss, H * ss), 0); d = ImageDraw.Draw(img)
    def pr(ring): return [((x - ext['lon0']) * c * k * ss, (ext['lat1'] - y) * k * ss) for x, y in ring]
    def inside(ring):
        xs = [p[0] for p in ring]; ys = [p[1] for p in ring]
        return not (max(xs) < ext['lon0'] - 1 or min(xs) > ext['lon1'] + 1 or max(ys) < ext['lat0'] - 1 or min(ys) > ext['lat1'] + 1)
    for p in polys(json.load(open(f'{HERE}/ne_10m_land.geojson'))):
        if not inside(p[0]): continue
        d.polygon(pr(p[0]), fill=255)
        for hole in p[1:]: d.polygon(pr(hole), fill=0)
    lakes = img.copy() if False else Image.new('L', img.size, 0); dl = ImageDraw.Draw(lakes)
    for p in polys(json.load(open(f'{HERE}/ne_10m_lakes.geojson'))):
        if not inside(p[0]): continue
        dl.polygon(pr(p[0]), fill=255)
        for hole in p[1:]: dl.polygon(pr(hole), fill=0)
    land = np.asarray(img.resize((W, H), Image.LANCZOS), np.float32) / 255
    lake = np.asarray(lakes.resize((W, H), Image.LANCZOS), np.float32) / 255
    return np.clip(land - lake, 0, 1), lake

def hillshade(el, lats, k, c, zfac):
    dy = 110574.0 / k
    dx = (111320.0 * np.cos(np.radians(lats)) / (k * c))[:, None]
    gy, gx = np.gradient(el * zfac)
    gx = gx / dx; gy = -gy / dy   # y crece hacia el sur en la imagen
    slope = np.arctan(np.hypot(gx, gy)); aspect = np.arctan2(gy, -gx)
    def one(az, alt=45):
        az = math.radians(360 - az + 90); alt = math.radians(alt)
        return np.clip(np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect), 0, 1)
    hs = 0.55 * one(315) + 0.2 * one(270) + 0.15 * one(0) + 0.1 * one(225)
    return hs / math.sin(math.radians(45)), slope

def _box(a, r, axis):
    r = int(r)
    if r < 1: return a
    pad = [(0, 0)] * a.ndim; pad[axis] = (r + 1, r)
    p = np.pad(a, pad, mode='edge'); cs = np.cumsum(p, axis=axis, dtype=np.float64)
    n = a.shape[axis]
    hi = np.take(cs, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis); lo = np.take(cs, np.arange(0, n), axis=axis)
    return ((hi - lo) / (2 * r + 1)).astype(np.float32)

def blur1(a, sigma):
    """Gaussiana aproximada con tres pasadas de caja."""
    if sigma < 0.5: return a
    r = max(1, int(round(math.sqrt(12 * sigma * sigma / 3 + 1) - 1) // 2))
    a = a.astype(np.float32)
    for _ in range(3): a = _box(_box(a, r, 0), r, 1)
    return a

def blur(a, sigma):
    if sigma < 0.5: return a
    return np.stack([blur1(a[..., i], sigma) for i in range(a.shape[2])], axis=2)

def ne_color(lons, lats, W, H):
    ne = np.asarray(Image.open(f'{HERE}/ne_crop.png').convert('RGB'), np.float32)
    fx = (lons + 14) * 60 - 0.5; fy = (54 - lats) * 60 - 0.5
    ix = np.clip(np.floor(fx).astype(int), 0, ne.shape[1] - 2); wx = (fx - ix)[None, :, None]
    iy = np.clip(np.floor(fy).astype(int), 0, ne.shape[0] - 2); wy = (fy - iy)[:, None, None]
    a = ne[iy][:, ix]; b = ne[iy][:, ix + 1]; cc = ne[iy + 1][:, ix]; d = ne[iy + 1][:, ix + 1]
    top = a + (b - a) * wx; bot = cc + (d - cc) * wx
    return top + (bot - top) * wy

def build(name, ext):
    lons, lats, W, H, k = terrain.grid(ext)
    c = math.cos(math.radians(ext['phi']))
    el = np.load(f'{HERE}/elev_{name}.npy')
    land, lake = mask(ext, W, H, k)
    sig = ext.get('gen', 5)
    def both(e):
        d, _ = hillshade(e, lats, k, c, ext['zfac'])
        g, _ = hillshade(blur1(e, sig), lats, k, c, ext['zfac'] * 2.2)
        return 0.5 * d + 0.5 * g
    # el relieve de tierra se sombrea sin batimetria (evita un reborde falso en la costa)
    hs_land = both(np.maximum(el, 0) * (land > 0.02) + np.maximum(el, 0) * (land <= 0.02) * 0)
    hs_sea = both(np.minimum(el, 0) * 0.35)
    hs = hs_land * land + hs_sea * (1 - land)
    hsl = np.clip(hs, 0, 1.4)[..., None]
    depth = np.clip(-el, 0, 6000)
    rng = np.random.default_rng(7)
    L = land[..., None]; LK = lake[..., None]
    # halo costero en el mar (mas claro junto a la costa)
    px_per_km = k / 111.0
    halo = np.clip(blur1(land, max(2, 6 * px_per_km ** 0.5)) * 2.2, 0, 1)[..., None] * (1 - L)

    # ---------- estilo actual ----------
    col = ne_color(lons, lats, W, H)
    scale_ne = (k / 60.0)
    col = blur(col, max(0.0, 0.9 * scale_ne))           # quita el sombreado grueso de NE al ampliar
    # desatura un poco y aclara para un atlas legible
    g = col.mean(axis=2, keepdims=True); col = g + (col - g) * 0.9; col = col * 0.96 + 255 * 0.04
    land_a = col * (0.26 + 0.72 * hsl)
    sea_a = ramp(np.sqrt(depth / 6000), [(0, '#CFE3EE'), (0.12, '#BBD6E6'), (0.5, '#9EC1D9'), (1, '#86AECB')])
    sea_a = sea_a * (0.94 + 0.06 * np.clip(hsl, 0, 1.2)) + halo * 14
    lake_a = hexc('#B9D5E6')
    out_a = land_a * L + sea_a * (1 - L - LK) + lake_a * LK
    # ---------- estilo antiguo ----------
    base = ramp(el, [(-500, '#EDE6CF'), (0, '#EEE6CE'), (200, '#EBE0C3'), (600, '#E3D2AE'), (1200, '#D8C29B'), (2000, '#CDB38A'), (3200, '#C4A983'), (5000, '#D2C2A8')])
    shade = np.clip(hsl, 0, 1.25)
    warm_shadow = hexc('#6B5236') / 255.0
    t = np.clip(1 - shade, 0, 1)
    land_o = base * (1 - t * 0.62) * (1 - t * 0.38 * (1 - warm_shadow)) + np.clip(shade - 1, 0, 1) * 40
    sea_o = ramp(np.sqrt(depth / 6000), [(0, '#D4DCD2'), (0.15, '#C8D3CB'), (0.6, '#B9C8C2'), (1, '#AEBFBA')])
    sea_o = sea_o + halo * 10
    lake_o = hexc('#C9D5CC')
    out_o = land_o * L + sea_o * (1 - L - LK) + lake_o * LK
    # textura de papel: ruido de baja frecuencia + grano fino
    low = blur1(rng.normal(0, 1, (H, W)).astype(np.float32), 40); low = low / (np.abs(low).max() + 1e-6)
    grain = rng.normal(0, 1, (H, W)).astype(np.float32)
    out_o = out_o * (1 + 0.035 * low[..., None]) + grain[..., None] * 2.2
    for style, arr in (('actual', out_a), ('antiguo', out_o)):
        Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(f'{HERE}/relief_{name}_{style}.png')
    print(name, W, H)

for n in (sys.argv[2:] or E.keys()): build(n, E[n])
