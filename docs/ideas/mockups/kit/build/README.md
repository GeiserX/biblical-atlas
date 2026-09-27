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
