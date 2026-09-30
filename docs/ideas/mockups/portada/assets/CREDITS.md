# Créditos de los fondos de la portada

Las imágenes de [`img/`](img/) son capturas del mapa del propio sitio en su estilo antiguo, tomadas en el navegador con la interfaz y todas las capas de datos ocultas: sin lugares, rutas, nombres ni controles. Solo queda el relieve propio que dibuja `site/js/mapa.js` con las imágenes de `site/maps/`. No hay fotografías, ilustraciones ni mapas de nadie más.

## De dónde sale cada capa

| Capa | Fuente | Licencia |
|---|---|---|
| Costas, tierra, lagos y ríos | [Natural Earth](https://www.naturalearthdata.com/) 1:10m | Dominio público |
| Sombreado del relieve y profundidad del mar | [Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) (AWS Open Data), compiladas por Mapzen | Piden atribución (abajo) |
| Colores de pergamino y textura de papel | Nuestros ([`kit/build/raster.py`](../../kit/build/README.md)) | La del repositorio |

Las fuentes de elevación que combinan las teselas para esta zona, con la atribución que piden:

- Global ETOPO1 terrain data U.S. National Oceanic and Atmospheric Administration.
- United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey.
- Europe terrain data produced using Copernicus data and information funded by the European Union - EU-DEM layers.
- Mapzen.

No entran las coordenadas de OpenBible.info (no se dibuja ningún lugar) ni las teselas de OpenFreeMap y OpenStreetMap (el estilo antiguo las oculta). Si un diseño pone lugares o el mapa actual encima del fondo, esos créditos vuelven, como en el mapa.

## El crédito que lleva la página

La misma línea corta que el mapa del sitio, visible sobre el fondo y con enlace a la lista completa:

> Relieve: Natural Earth, USGS, NOAA, Copernicus, Mapzen · [Créditos](../../../../../site/acerca.html#gracias)

En [`treatments.css`](treatments.css) es `.be-backdrop__credit`: esquina inferior derecha, sobre un chip de papel para que se lea en cualquier zona del relieve (contraste medido de 4,7:1 o más en todas las combinaciones), con el enlace ampliado a 44 px de zona de toque. El banner del README usa una versión más corta («Relieve: Natural Earth y datos de elevación de Mapzen») porque es una imagen fija; en la página va la del mapa, que nombra a todas las fuentes que piden atribución.

## Las imágenes

Todas son WebP de calidad 80. La ancha de 1280 es la de 2560 reducida (Lanczos), para pantallas de densidad 1×.

| Fichero | Encuadre (lon, lat) | Zoom | Capas del relieve | Peso |
|---|---|---|---|---|
| `bible-lands-wide.webp` (2560 × 1440) | 22,2 a 50,2 E · 24,4 a 37,9 N | 6,0 | mundo, Mediterráneo | 111 KB |
| `bible-lands-wide-1280.webp` | igual | | | 43 KB |
| `bible-lands-tall.webp` (860 × 1800) | 27,4 a 47,4 E · 11,9 a 47,3 N | 4,9 | mundo, Mediterráneo | 96 KB |
| `paul-journeys-wide.webp` | 12,1 a 37,1 E · 30,5 a 41,9 N | 6,2 | mundo, Mediterráneo | 178 KB |
| `paul-journeys-wide-1280.webp` | igual | | | 64 KB |
| `paul-journeys-tall.webp` | 24,1 a 35,1 E · 26,4 a 44,9 N | 5,8 | mundo, Mediterráneo | 82 KB |
| `galilee-judea-wide.webp` | 34,05 a 36,75 E · 31,58 a 32,86 N | 9,4 | mundo, Mediterráneo, Israel | 70 KB |
| `galilee-judea-wide-1280.webp` | igual | | | 30 KB |
| `galilee-judea-tall.webp` | 34,71 a 36,01 E · 31,04 a 33,34 N | 8,9 | mundo, Mediterráneo, Israel | 65 KB |
| `jerusalem-wide.webp` | 35,110 a 35,350 E · 31,713 a 31,827 N | 12,9 | las cuatro, sobre todo Jerusalén | 75 KB |
| `jerusalem-wide-1280.webp` | igual | | | 31 KB |
| `jerusalem-tall.webp` | 35,187 a 35,277 E · 31,692 a 31,852 N | 12,7 | las cuatro, sobre todo Jerusalén | 31 KB |

Las miniaturas desenfocadas de `treatments.css` (32 × 18 y 14 × 30 píxeles, unos 130 bytes cada una) salen de las mismas capturas. Las imágenes de [`previews/`](previews/) son capturas de [`index.html`](index.html) y llevan la misma línea de crédito.

## Cómo se rehacen

```bash
python3 -m http.server 8903 --bind 127.0.0.1                     # desde la raíz del repositorio
PLAYWRIGHT_DIR=<carpeta con playwright-core> \
  node docs/ideas/mockups/portada/assets/render-backdrops.mjs /tmp/fondos 8903
for f in /tmp/fondos/*-wide.png; do magick "$f" -filter Lanczos -resize 1280x720 "${f%.png}-1280.png"; done
for f in /tmp/fondos/*.png; do cwebp -q 80 -m 6 -sharp_yuv "$f" -o "docs/ideas/mockups/portada/assets/img/$(basename "${f%.png}").webp"; done
```

Los encuadres están en `FRAMES` de [`render-backdrops.mjs`](render-backdrops.mjs). Si cambian las imágenes de `site/maps/`, hay que volver a capturar.
