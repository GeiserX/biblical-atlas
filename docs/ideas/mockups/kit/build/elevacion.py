"""Paso 1: descarga la elevación (teselas Terrarium) de cada extensión y la guarda como elev_<nombre>.npy.

Uso (desde kit/build/): python elevacion.py <carpeta_de_trabajo> [mundo mediterraneo israel]
Las teselas se guardan en TILE_CACHE (por defecto /tmp/terrarium-cache) para no descargarlas dos veces.
"""
import json, sys
import numpy as np
import terrain

HERE = sys.argv[1]
E = json.load(open('extents.json'))
for name in (sys.argv[2:] or E.keys()):
    el = terrain.elevation(E[name]).astype(np.float32)
    np.save(f'{HERE}/elev_{name}.npy', el)
    print(name, el.shape, f'{el.min():.0f}..{el.max():.0f} m')
