# Sitio web

Primer corte navegable de biblical-earth: los viajes de Pablo y sus cartas en un mapa, una línea de tiempo y una ficha. Un solo cursor de tiempo gobierna las tres piezas.

Es un sitio estático. No hay framework ni paso de compilación para la aplicación: `index.html`, `app.js` y `style.css` se sirven tal cual.

## Abrirlo en local

Con un servidor local (la forma recomendada):

```bash
cd site
python3 -m http.server 8000
```

y abre <http://localhost:8000>.

También funciona abriendo `site/index.html` con doble clic, desde `file://`, con tres límites. El navegador no deja a MapLibre leer ficheros locales, así que el relieve antiguo va como imagen bajo el mapa. La cortina no está disponible. La ficha no muestra la lista de vídeos.

En los dos casos hace falta conexión. MapLibre GL JS 6.11.2 llega desde unpkg.com con su huella SRI, y el mapa actual usa las teselas de [OpenFreeMap](https://openfreemap.org/) con el estilo Positron, que no pide clave. Si ese estilo no responde, el mapa actual pasa a `maps/mediterraneo-actual.webp`.

## De dónde salen los datos

- `data.json`: lo escribe [`scripts/build.py`](../scripts/build.py) a partir de los YAML de [`data/`](../data/). No se edita a mano: para cambiar un dato, edita el YAML y vuelve a compilar. El formato es `biblical-earth/v0` y está descrito en [`docs/ideas/modelo-de-datos.md`](../docs/ideas/modelo-de-datos.md).
- `data.js`: el mismo contenido que `data.json`, envuelto en `window.BIBLICAL_EARTH_DATA = …;`. Solo se usa al abrir el sitio desde `file://`, donde `fetch` no funciona. También lo escribe `scripts/build.py`, así que nunca se queda atrás.
- `videos.json`: vídeos de jw.org que nombran cada lugar, generados con [`scripts/videos/`](../scripts/videos/), con la forma `{ "<id de lugar>": [ { "titulo", "url", "publicado", "menciones" } ] }`. Si falta, la ficha no enseña esa sección.

No copiamos ni incrustamos texto de jw.org. La ficha enlaza cada pasaje a su capítulo en wol.jw.org y cada dato a su fuente, con la fecha en que se consultó.

## Mapas base

`maps/mediterraneo-antiguo.webp` y `maps/mediterraneo-actual.webp` son el relieve propio del [kit de maquetas](../docs/ideas/mockups/kit/build/README.md), hecho con Natural Earth y datos de elevación abiertos. Los créditos están en [`CREDITS.md`](../docs/ideas/mockups/kit/maps/CREDITS.md). El kit los dibuja en proyección equirrectangular; aquí están reproyectados a Web Mercator (EPSG:3857) para que MapLibre los ponga como `image source` con las esquinas exactas: longitud 10 a 44, latitud 28 a 44, 4096 × 2399 px.

La reproyección es un remuestreo por filas, porque en las dos proyecciones la longitud es lineal en x:

```python
import sys, numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]            # webp del kit, webp de salida
O, E, S, N, W = 10, 44, 28, 44, 4096           # extensión del kit (geo.js, EXTENTS.mediterraneo)
my = lambda lat: np.log(np.tan(np.pi / 4 + np.radians(lat) / 2))
H = round(W * (my(N) - my(S)) / np.radians(E - O))
im = np.asarray(Image.open(src).convert('RGB'))
h0, w0 = im.shape[:2]
lat = np.degrees(2 * np.arctan(np.exp(my(N) - (np.arange(H) + .5) / H * (my(N) - my(S)))) - np.pi / 2)
fil = np.clip(((N - lat) / (N - S) * h0 - .5).round().astype(int), 0, h0 - 1)
col = np.clip(((np.arange(W) + .5) / W * w0 - .5).round().astype(int), 0, w0 - 1)
Image.fromarray(im[fil][:, col]).save(dst, quality=82, method=6)
```

Para comprobar la alineación, Corinto (37,9058 N, 22,8787 E) debe caer en la costa del istmo y no tierra adentro.

## Cómo situamos a Pablo

- Una parada **anclada** va en su fecha. Si la fuente nombra la estación («primavera de 47», «Pascua de 56»), la usamos para situarla dentro del año.
- Las paradas en **tiempo narrativo**, de las que sabemos el orden pero no la fecha, se reparten por igual entre las dos anclas que las rodean.
- Entre dos paradas el marcador avanza en línea recta. Si una de las dos es narrativa, el marcador lleva un halo discontinuo, el rótulo «posición estimada» y la línea de tiempo raya el tramo que no sabemos fechar.
- Fuera de las fechas de los datos, la ficha dice que no sabemos dónde estaba y ofrece las paradas más cercanas. Nunca se inventa una posición.

## Dirección de la página

La dirección guarda la vista para poder compartirla:

```
#t=50.30&sel=carta:1-tesalonicenses&mapa=antiguo
```

- `t`: año con decimales, en numeración astronómica, donde 1 a.e.c. es 0.
- `sel`: `lugar:<id>`, `persona:<id>`, `carta:<id>`, `viaje:<id>`, `parada:<viaje>/<orden>`, `periodo:<id>`, `evento:<id>` o `pasaje:<libro>-<capítulo>`, como `pasaje:hch-16`.
- `mapa`: `antiguo`, `actual` o `cortina`.

## Teclado

| Tecla | Qué hace |
|---|---|
| `/` | Ir a la búsqueda |
| Espacio | Reproducir o pausar |
| ← → | Mover el cursor un paso (depende del zoom de la línea) |
| Mayúsculas + ← → | Saltar a la parada o carta anterior o siguiente |
| Esc | Borrar la búsqueda y la selección |

La rueda sobre la línea de tiempo cambia la escala, de décadas a meses. Con Mayúsculas, o con un gesto horizontal en el trackpad, la desplaza.

## Ficheros

| Fichero | Contenido |
|---|---|
| `index.html` | Estructura de la página y carga de MapLibre, con versión fija y SRI |
| `app.js` | Toda la lógica: datos, cursor, mapa, línea de tiempo, ficha, búsqueda y dirección |
| `style.css` | Estilos propios de la aplicación |
| `kit/` | Tokens, componentes y fuentes copiados del kit de maquetas. Las fuentes tienen licencia SIL OFL 1.1 |
| `maps/` | Relieve antiguo y actual en Web Mercator |
