"""Descarga teselas Terrarium (AWS Open Data, Mapzen/Tilezen) y devuelve la elevacion
remuestreada a la cuadricula equirectangular de una extension."""
import math, os, io, urllib.request, concurrent.futures as cf
import numpy as np
from PIL import Image

CACHE = os.environ.get('TILE_CACHE', '/tmp/terrarium-cache')
URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'

def merc_x(lon, z): return (lon + 180.0) / 360.0 * 256 * 2**z
def merc_y(lat, z):
    r = math.radians(lat)
    return (1 - math.log(math.tan(math.pi/4 + r/2)) / math.pi) / 2 * 256 * 2**z

def fetch(z, x, y):
    p = f'{CACHE}/{z}/{x}/{y}.png'
    if not os.path.exists(p):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        for _ in range(4):
            try:
                data = urllib.request.urlopen(URL.format(z=z, x=x, y=y), timeout=60).read(); break
            except Exception as e:
                err = e
        else:
            raise err
        open(p, 'wb').write(data)
    a = np.asarray(Image.open(p).convert('RGB'), dtype=np.float32)
    return a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768

def grid(ext):
    """Devuelve (lons por columna, lats por fila, W, H) de la proyeccion de la extension."""
    c = math.cos(math.radians(ext['phi']))
    k = ext['width'] / ((ext['lon1'] - ext['lon0']) * c)
    W = ext['width']; H = round((ext['lat1'] - ext['lat0']) * k)
    lons = ext['lon0'] + (np.arange(W) + 0.5) / (k * c)
    lats = ext['lat1'] - (np.arange(H) + 0.5) / k
    return lons, lats, W, H, k

def elevation(ext):
    z = ext['zoom']
    lons, lats, W, H, k = grid(ext)
    x0 = int(merc_x(ext['lon0'], z) // 256) - 1; x1 = int(merc_x(ext['lon1'], z) // 256) + 1
    y0 = int(merc_y(ext['lat1'], z) // 256) - 1; y1 = int(merc_y(ext['lat0'], z) // 256) + 1
    mosaic = np.zeros(((y1 - y0 + 1) * 256, (x1 - x0 + 1) * 256), np.float32)
    jobs = [(tx, ty) for tx in range(x0, x1 + 1) for ty in range(y0, y1 + 1)]
    with cf.ThreadPoolExecutor(16) as ex:
        for (tx, ty), a in zip(jobs, ex.map(lambda t: fetch(z, *t), jobs)):
            mosaic[(ty - y0) * 256:(ty - y0 + 1) * 256, (tx - x0) * 256:(tx - x0 + 1) * 256] = a
    # coordenadas fraccionarias (centro de pixel) en el mosaico
    fx = np.array([merc_x(l, z) for l in lons]) - x0 * 256 - 0.5
    fy = np.array([merc_y(l, z) for l in lats]) - y0 * 256 - 0.5
    ix = np.clip(np.floor(fx).astype(int), 0, mosaic.shape[1] - 2); wx = (fx - ix).astype(np.float32)
    iy = np.clip(np.floor(fy).astype(int), 0, mosaic.shape[0] - 2); wy = (fy - iy).astype(np.float32)[:, None]
    a = mosaic[iy][:, ix]; b = mosaic[iy][:, ix + 1]; c_ = mosaic[iy + 1][:, ix]; d = mosaic[iy + 1][:, ix + 1]
    top = a + (b - a) * wx; bot = c_ + (d - c_) * wx
    return top + (bot - top) * wy
