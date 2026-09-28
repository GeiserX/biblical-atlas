# Cómo se generan los mapas base del kit

Los seis mapas de `kit/maps/` (`mundo`, `mediterraneo`, `israel`, cada uno en estilo `antiguo` y `actual`) salen de estos scripts. No hace falta regenerarlos para hacer maquetas; esto sirve para cambiar una extensión, un color o añadir un recorte nuevo.

Todo el trabajo pesado (teselas, GeoJSON, PNG intermedios de cientos de MB) va en una carpeta temporal. Al repo sólo se copian los `.webp` finales.

## Requisitos

- Python 3 con `numpy` y `Pillow`.
- ImageMagick (`magick`), `cwebp` y Google Chrome (lo usa `render.mjs`).

## Pasos

Desde `docs/ideas/mockups/kit/build/`:

```bash
W=$(mktemp -d)                     # carpeta de trabajo, fuera del repo
export TILE_CACHE=$W/tiles

# 1. Datos de Natural Earth 10m (dominio público), en GeoJSON
for n in land lakes coastline rivers_lake_centerlines admin_0_boundary_lines_land admin_0_countries; do
  curl -sL "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_$n.geojson" -o "$W/ne_10m_$n.geojson"
done

# 2. Relieve sombreado de Natural Earth (NE1_HR_LC_SR_W, 21600x10800, 60 px por grado),
#    recortado a lon -14..76, lat 8..54 (el recorte que espera raster.py)
curl -sL https://naciscdn.org/naturalearth/10m/raster/NE1_HR_LC_SR_W.zip -o $W/ne1.zip
unzip -o -q $W/ne1.zip -d $W
magick $W/NE1_HR_LC_SR_W.tif -crop 5400x2760+9960+2160 +repage $W/ne_crop.png

# 3. Elevación (teselas Terrarium) remuestreada a la cuadrícula de cada extensión
python3 elevacion.py $W

# 4. Relieve sombreado en los dos estilos
python3 raster.py $W

# 5. Costas, ríos, lagos y fronteras encima del relieve, como HTML a tamaño nativo;
#    también escribe paises-actuales.json (etiquetas de países del estilo actual)
python3 overlay.py $W $W

# 6. Captura de cada HTML a PNG y compresión a WebP
for m in mundo:3000x1697 mediterraneo:4000x2327 israel:2000x3362; do
  n=${m%%:*}; size=${m##*:}
  for s in antiguo actual; do
    node ../render.mjs --size $size --scale 1 --no-compress --out $W $W/map_${n}_${s}.html
    cwebp -quiet -q 82 $W/map_${n}_${s}.png -o ../maps/$n-$s.webp
  done
done
cp $W/paises-actuales.json ../maps/
```

## Extensiones del sitio

El sitio (`site/maps/`) usa las extensiones `mediterraneo` e `israel` de este kit tal cual y dos propias, que no están en `extents.json` para no mover las maquetas:

```json
"mundo":     {"lon0": -20, "lon1": 100, "lat0": -40, "lat1": 58, "phi": 35, "width": 4096, "zoom": 6, "zfac": 9},
"jerusalen": {"lon0": 35.10, "lon1": 35.36, "lat0": 31.68, "lat1": 31.86, "phi": 31.77, "width": 2400, "zoom": 14, "zfac": 0.8, "gen": 12, "suave": 1.5}
```

El `mundo` del sitio cubre todos los lugares y zonas candidatas de los datos, de la península ibérica a la India y hasta Somalia, con al menos 10° de margen, y por el sur llega a 40° S para que en el móvil lo que queda bajo la hoja de la ficha también sea relieve. `jerusalen` cubre Jerusalén, Getsemaní, el Gólgota, el monte de los Olivos, Betania, Betfagué, Akéldama y Belén.

Se generan con los mismos pasos, en una carpeta de trabajo con una copia de los scripts y ese `extents.json`, con tres cambios:

- El recorte de Natural Earth del paso 2 pasa a lon −24..104, lat −44..62 (`-crop 7680x6360+9360+1680`), y en `ne_color` de `raster.py` el origen del recorte pasa de `lons + 14` y `54 - lats` a `lons + 24` y `62 - lats`.
- `raster.py` suaviza la elevación antes de sombrear cuando la extensión trae `suave` (`el = blur1(el, ext['suave'])` justo después de cargar `elev_<nombre>.npy`). Sin eso, la elevación de 30 m remuestreada a 10 m por píxel se ve en facetas.
- `jerusalen` no pasa por `overlay.py`: no tiene costa ni ríos de Natural Earth, y las fronteras de 1:10 millones se desvían cientos de píxeles a esa escala. Su `relief_jerusalen_<estilo>.png` va directo a la reproyección.

Para `mundo`, el paso 6 es `--size 4096x4084`. Después, [`reproyectar.py`](../../../../../site/README.md#mapas-base) pasa cada imagen a Web Mercator con las órdenes que da `site/README.md`, y `mundo-mini.webp` es el `mundo-antiguo.webp` de −8 a 58 reducido a 240 px de ancho (el mapa de situación no baja al sur).

## Qué hace cada script

| Script | Qué hace |
|---|---|
| `extents.json` | Extensiones: límites lon/lat, paralelo estándar `phi`, ancho en px, nivel de teselas `zoom` y exageración del relieve `zfac`. Debe coincidir con `EXTENTS` de `geo.js` y con `maps/extents.json`. |
| `terrain.py` | Descarga teselas Terrarium y remuestrea la elevación a la proyección equirectangular de la extensión. |
| `elevacion.py` | Guarda la elevación de cada extensión en `elev_<nombre>.npy`. |
| `raster.py` | Máscara de tierra y lagos de Natural Earth, sombreado de relieve con varias luces, colores del estilo `actual` (color de Natural Earth) y del estilo `antiguo` (tonos pergamino y textura de papel). |
| `overlay.py` | Dibuja en SVG costas, ríos, lagos y, en el estilo `actual`, fronteras de países. |

La proyección es la misma en todos los pasos: `x = (lon − lon0) · cos(phi) · k`, `y = (lat1 − lat) · k`, con `k = ancho / ((lon1 − lon0) · cos(phi))`. Por eso un punto que `geo.js` proyecta cae exactamente sobre la costa dibujada.

Fuentes y licencias de los datos: [`../maps/CREDITS.md`](../maps/CREDITS.md).
