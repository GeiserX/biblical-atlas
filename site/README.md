# Sitio web

Primer corte navegable de biblical-earth: los viajes de Pablo y sus cartas en un mapa, una línea de tiempo y una ficha. Un solo cursor de tiempo gobierna las tres piezas.

Es un sitio estático. No hay framework ni paso de compilación para la aplicación: `index.html`, los scripts de `js/` y las hojas de `css/` se sirven tal cual.

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
| `index.html` | Estructura de la página, puntos de montaje de las vistas y carga de MapLibre, con versión fija y SRI |
| [`js/`](js/) | La aplicación, partida en módulos (ver abajo) |
| [`css/`](css/) | Estilos propios: `base.css`, `mapa.css`, `linea.css` y `estudio.css` |
| `kit/` | Tokens, componentes y fuentes copiados del kit de maquetas. Las fuentes tienen licencia SIL OFL 1.1 |
| `maps/` | Relieve antiguo y actual en Web Mercator |
| `_local/` | Datos de prueba de cada carril. No va a git |

## Módulos

La aplicación son scripts clásicos con `defer`, no módulos ES. Desde `file://` el navegador bloquea los `import` locales, y el sitio tiene que abrir con doble clic. `index.html` los carga en un orden fijo y todos comparten un solo objeto, `window.BE`. [`js/base.js`](js/base.js) va primero y crea `BE`. El arranque espera a `DOMContentLoaded`, que llega cuando ya se han ejecutado todos los scripts, así que un fichero puede usar cualquier función de otro siempre que la llame a través de `BE` en el momento de usarla.

Tres reglas para escribir un módulo:

- Cada fichero es un IIFE que empieza con `const BE = window.BE;` y publica lo suyo con `Object.assign(BE, { … })`.
- Las utilidades de `base.js` (`esc`, `norm`, `tramo`, `fechaCorta`, `citas`, `E`, `sucio`, `programar`…) se pueden copiar al cargar: `const { esc, tramo } = BE;`.
- Los datos se leen siempre como `BE.D`, `BE.L` (lugares por id), `BE.PERS` (personas por id), `BE.P` (paradas de Pablo) y `BE.VIDEOS`, porque se cargan después. Lo mismo vale para las funciones de otros ficheros, que se llaman como `BE.dondeEsta(t)` y nunca se copian al cargar.

### Registro de tipos

Cada tipo de entidad vive en `js/tipos/<tipo>.js` y se registra así:

```js
BE.tipo('lugar', {
  nodo: 'lugar',                        // icono en la lista de resultados
  existe: (id) => …,                    // ¿vale «lugar:<id>» en la dirección?
  nombre: (id) => …,                    // texto del filtro de arriba
  implicados(id, r) { … },              // añade claves («carta:romanos») a r.claves e ids a r.lugares
  momento: (id) => …,                   // fecha a la que salta el cursor al elegirlo; si falta, la primera de lo implicado
  momentoImplicado: (id) => …,          // su fecha cuando lo implica otra selección; si falta, no cuenta
  ficha: (id) => '<html>',              // la ficha del panel
  buscar: (q, nq, puntuar) => [ … ],    // resultados { grupo, sel, titulo, meta, puntos }
});
```

`BE.tipo('lugar')` devuelve la definición. Registrar dos veces el mismo tipo es un error. `BE.anadirParada(r, parada)` y `BE.anadirCarta(r, carta)` ayudan a rellenar `implicados`.

### Interfaces fijas

| Interfaz | Qué hace hoy |
|---|---|
| `BE.donde(persona, t)` | Para `'pablo'`, lo mismo que `BE.dondeEsta(t)`. Para otra persona, `null` hasta que app-tiempo la generalice |
| `BE.ventana(persona, fecha, lugares)` | Para `'pablo'`, la parte de la fecha en que las paradas lo ponen en uno de esos lugares. Para otra persona, `null` |
| `BE.mapa.resaltar(ids)` | Resalta esos lugares en el mapa por encima de la selección. `resaltar(null)` vuelve a la selección |
| `BE.mapa.encuadrar(ids)` | Encuadra el mapa en esos lugares, descontando la hoja inferior en el móvil |
| `BE.pintores` | Lista de funciones que el bucle de pintado llama en cada fotograma, después de las suyas, con las marcas de lo que cambió (`{ mapa, etiquetas, panel, linea, cursor }`) |
| `BE.inicios` | Funciones que se llaman una vez con los datos ya cargados, antes de leer la dirección |
| `BE.parametros` | Parámetros extra de la dirección: `{ nombre, escribir() → texto o null, leer(texto, inicial) }` |

`base.js` lee a través de `BE` estos valores, que su dueño puede cambiar desde su propio fichero sin tocar `base.js`: `BE.T_MIN` y `BE.T_MAX` (rango del cursor), `BE.velocidad()`, `BE.textoVelocidad()` y `BE.hitos()` (app-tiempo); `BE.urlCapitulo(libro, cap)` y `BE.ponerLibros(lista)`, que cambia la lista de libros que entienden `citas` y la búsqueda (app-estudio, desde `tipos/libro.js`).

`window.__be` expone lo necesario para las pruebas en Chrome sin interfaz: `E`, `P`, `D`, `BE`, `dondeEsta`, `donde`, `ventana`, `ventanaCarta`, `ventanaEvento`, `setT`, `seleccionar`, `ponerMapa` y `map`.

### Puntos de montaje

`index.html` ya trae, vacíos y con `hidden`, los contenedores de las vistas previstas: `#vista-grafo`, `#vista-conexion`, `#vista-recorrido` y `#vista-ahora` dentro del mapa; `#vista-sincronia` dentro de la línea de tiempo; `#vista-lectura` y `#vista-portada` dentro de `#app`. Las rellenan app-estudio (grafo, conexión, recorrido, lectura y portada) y app-tiempo («Ahora mismo» y sincronía), cada una desde su fichero. Si necesita otro sitio en la página, su módulo la mueve con JavaScript, sin tocar `index.html`.

### Datos de prueba

`index.html?datos=_local/<carril>/data.json` carga otro `data.json`. Solo acepta rutas dentro de `_local/` que acaben en `.json`; cualquier otra cosa enseña un error en la ficha. Desde `file://` carga el `data.js` de la misma carpeta. Para compilar ahí sin pisar `site/data.json`:

```bash
python3 scripts/build.py --salida site/_local/<carril>/
```

## Quién toca qué durante el reparto

Mientras los tres carriles del sitio trabajan en paralelo, cada fichero tiene un solo dueño. Nadie edita un fichero de otro. Si un carril necesita un cambio en `base.js`, `base.css` o `index.html`, lo describe en su informe como propuesta y lo aplica el orquestador al integrar.

| Fichero | Dueño |
|---|---|
| `js/base.js` (utilidades, estado, carga, registro, selección, cursor, reproducción, dirección, bucle de pintado, teclado, arranque), `css/base.css`, `index.html` | Congelado |
| `js/mapa.js`, `js/ficha.js` (ayudas de ficha: citas, fuentes, estado, «por qué», nombres, vídeos), `js/tipos/lugar.js`, `js/tipos/carta.js`, `js/tipos/hallazgo.js`, `css/mapa.css`, `maps/*` | app-mapa |
| `js/trayectorias.js`, `js/linea.js`, `js/ahora.js`, `js/tipos/viaje.js`, `js/tipos/parada.js`, `js/tipos/evento.js`, `js/tipos/periodo.js`, `css/linea.css` | app-tiempo |
| `js/buscar.js`, `js/grafo.js`, `js/lectura.js`, `js/recorridos.js`, `js/portada.js`, `js/tipos/persona.js`, `js/tipos/pasaje.js`, `js/tipos/libro.js`, `js/tipos/recorrido.js`, `css/estudio.css` | app-estudio |

`data.json`, `data.js` y `videos.json` son derivados y ningún carril los edita.
