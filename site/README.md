# Sitio web

El sitio de biblical-atlas: un mapa, una línea de tiempo de 4026 a.e.c. al año 100 y una ficha, gobernados por un solo cursor de tiempo. Encima van las vistas de estudio: grafo de personas, conexión entre dos, modo lectura, recorridos guiados, portada, «Ahora mismo» y sincronía.

Al lado hay dos páginas sueltas. [`acerca.html`](acerca.html) explica el proyecto, cómo se lee y cómo tratamos las fuentes, y da las gracias, con su licencia, a quienes ponen los datos y los enlaces. [`calendario.html`](calendario.html) explica los meses de la Biblia con los hechos de `data/calendar.yaml`. Las dos enlazan de vuelta al mapa, a la vista desde la que se llegó, y abren igual con servidor que desde `file://`. El mapa les pasa esa vista al pulsar el enlace: al calendario en `#desde=…` y a «Acerca de» en `?desde=…`, porque su `#` es la sección (`#gracias`).

Es un sitio estático. No hay framework ni paso de compilación para la aplicación: `index.html`, `acerca.html`, `calendario.html`, los scripts de `js/` y las hojas de `css/` se sirven tal cual.

## Abrirlo en local

Con un servidor local (la forma recomendada):

```bash
cd site
python3 -m http.server 8000
```

y abre <http://localhost:8000>.

También funciona abriendo `site/index.html` con doble clic, desde `file://`, con tres límites. El navegador no deja a MapLibre leer ficheros locales, así que el relieve antiguo va como imagen bajo el mapa. La cortina no está disponible. Las fichas no muestran vídeos, ni de lugares, ni de personas, ni de capítulos.

En los dos casos hace falta conexión. MapLibre GL JS 6.11.2 llega desde unpkg.com con su huella SRI, y el mapa actual usa las teselas de [OpenFreeMap](https://openfreemap.org/) con el estilo Positron, que no pide clave. Si ese estilo no responde, el mapa actual pasa a `maps/mediterraneo-actual.webp`.

El mapa lleva solo la atribución que piden las licencias (OpenBible.info, el relieve y, en el mapa actual, OpenFreeMap, OpenMapTiles y OpenStreetMap, que añade MapLibre) y un enlace «Créditos» a `acerca.html#gracias`, donde está la lista entera con cada licencia. En el móvil se pliega en un botón (i) bajo los botones del mapa, porque abajo la taparía la hoja de la ficha. Lo que se añada de fuera va también a esa lista.

## De dónde salen los datos

- `data.json`: lo escribe [`scripts/build.py`](../scripts/build.py) a partir de los YAML de [`data/`](../data/). No se edita a mano: para cambiar un dato, edita el YAML y vuelve a compilar. El formato es `biblical-atlas/v0` y está descrito en [`docs/ideas/modelo-de-datos.md`](../docs/ideas/modelo-de-datos.md).
- `data.js`: el mismo contenido que `data.json`, envuelto en `window.BIBLICAL_ATLAS_DATA = …;`. Solo se usa al abrir el sitio desde `file://`, donde `fetch` no funciona. También lo escribe `scripts/build.py`, así que nunca se queda atrás.
- `stats.json`: cuántas fichas hay de cada tipo. También lo escribe `scripts/build.py`; el README del repositorio lo lee para sus insignias.
- `videos.json`: vídeos de jw.org que nombran cada lugar, con la forma `{ "<id de lugar>": [ { "titulo", "url", "publicado", "menciones" } ] }`. Lo escribe [`scripts/videos/index.py`](../scripts/videos/index.py). Si falta, la ficha de lugar no enseña esa sección.
- `videos-pasajes.json`: vídeos que citan cada capítulo, con la forma `{ "<libro>": { "serie": [ … ], "capitulos": { "16": [ … ] } } }`. Lo escribe [`scripts/videos/passages.py`](../scripts/videos/passages.py) y lo leen la ficha de pasaje y el modo lectura. Si falta, la sección no sale.
- `videos-personas.json`: vídeos que nombran cada persona, con la misma forma que `videos.json`. Lo escribe `index.py` y lo lee la ficha de persona. Si falta, o desde `file://`, la sección no sale.

El método de los tres índices está en [`docs/investigacion/videos-jw.md`](../docs/investigacion/videos-jw.md).

No copiamos ni incrustamos texto de jw.org. La ficha enlaza cada pasaje a su capítulo en jw.org, con los versículos citados resaltados, y cada dato a su fuente. La fecha de consulta queda en los YAML, en la SQLite y en el registro, no en la ficha.

## Mapas base

`maps/` tiene el relieve propio del [kit de maquetas](../docs/ideas/mockups/kit/build/README.md), hecho con Natural Earth y datos de elevación abiertos, en cuatro extensiones, cada una en versión antigua y actual. Los créditos están en [`CREDITS.md`](../docs/ideas/mockups/kit/maps/CREDITS.md).

| Extensión | Longitud | Latitud | Tamaño |
|---|---|---|---|
| `mundo` | −20 a 100 | −40 a 58 | 4096 × 3935 px |
| `mediterraneo` | 10 a 44 | 28 a 44 | 4096 × 2399 px |
| `israel` | 33,9 a 36,9 | 29,4 a 33,7 | 2000 × 3365 px |
| `jerusalen` | 35,10 a 35,36 | 31,68 a 31,86 | 2400 × 1954 px |

El mapa las pone una encima de otra, de menos a más detalle: el mundo siempre, el Mediterráneo a partir del zoom 4,3, la tierra de Israel a partir del 6,7 y Jerusalén con sus alrededores (Betania, Betfagué, el monte de los Olivos, Belén) a partir del 10, cada una fundida con la de debajo. Los bordes del Mediterráneo, de Israel y de Jerusalén se funden a transparente (70, 90 y 120 px) para que no se vea la costura. `maps/mundo-mini.webp` (240 × 159 px) es el mapa de situación de la esquina: cubre −20 a 100 y −8 a 58, porque más al sur solo hay mar y el sur de África.

`maps/portada-relieve.webp` (1280 × 720 px, 27.294 bytes) es el fondo de la portada: una captura de nuestro propio mapa en su estilo antiguo, sin interfaz ni capas de datos, de 22,2 a 50,2 E y de 24,4 a 37,9 N (centro en 36,2 E y 31,4 N, 28° de longitud a lo ancho, zoom 6,0, con el mundo y el Mediterráneo). Se captura a 2560 × 1440 con [`render-backdrops.mjs`](../docs/ideas/mockups/portada/assets/render-backdrops.mjs) (encuadre `bible-lands`, forma `wide`), se reduce a 1280 × 720 con Lanczos y se comprime con `cwebp -q 60 -m 6 -sharp_yuv`: va lavada y desaturada, así que la calidad 60 no se nota. Si cambian las imágenes del mundo o del Mediterráneo, hay que volver a capturarla.

El mundo cubre todos los lugares y zonas candidatas de los datos con al menos 10° de margen (de Tarsis en la península ibérica a la zona de Ofir en la India, y hasta la zona de Ofir en Somalia por el sur). Por el sur llega hasta 40° S: en el móvil, con la hoja de la ficha abierta, lo que cae bajo la hoja también tiene que ser relieve, y así las tres zonas de Ofir caben por encima de ella. Si un lugar nuevo cae cerca del borde, hay que ampliar la extensión y regenerar las dos imágenes del mundo (y la del mapa de situación si el lugar queda fuera de ella). El mapa no deja salir de esa extensión, así que nunca se ve el borde del relieve.

El relieve de Jerusalén sale de teselas Terrarium al zoom 14 (unos 10 m por píxel). El dato de origen es SRTM de 30 m, así que a partir del zoom 13 el relieve se ve suave, sin píxeles.

Al encuadrar una selección, el mapa no se acerca más de lo que aguanta el relieve más fino de esa zona (`topeRelieve` en `js/mapa.js`): zoom 14 en Jerusalén, 10 en la tierra de Israel, 8 en el Mediterráneo y 7,5 en el resto. Si ya estaba más cerca, se aleja hasta ese tope. Sin selección, un salto grande en el tiempo (una fecha escrita, un año buscado, un clic lejano en la pista) reencuadra a Pablo o, si los datos no lo sitúan, la época. Reproducir o arrastrar el cursor poco a poco no reencuadra, por muchos años que recorra.

El kit dibuja en proyección equirrectangular. Aquí las imágenes están reproyectadas a Web Mercator (EPSG:3857) para que MapLibre las ponga como `image source` con las esquinas exactas. La reproyección es un remuestreo por filas, porque en las dos proyecciones la longitud es lineal en x:

```python
# python3 reproyectar.py <kit.webp> <salida.webp> <oeste> <este> <sur> <norte> <ancho> [--borde=N]
import sys, numpy as np
from PIL import Image
args = [a for a in sys.argv[1:] if not a.startswith('--borde=')]
borde = next((int(a.split('=')[1]) for a in sys.argv[1:] if a.startswith('--borde=')), 0)
src, dst = args[0], args[1]
O, E, S, N, W = (float(x) for x in args[2:7]); W = int(W)
my = lambda lat: np.log(np.tan(np.pi / 4 + np.radians(lat) / 2))
H = round(W * (my(N) - my(S)) / np.radians(E - O))
im = np.asarray(Image.open(src).convert('RGB'))
h0, w0 = im.shape[:2]
lat = np.degrees(2 * np.arctan(np.exp(my(N) - (np.arange(H) + .5) / H * (my(N) - my(S)))) - np.pi / 2)
fil = np.clip(((N - lat) / (N - S) * h0 - .5).round().astype(int), 0, h0 - 1)
col = np.clip(((np.arange(W) + .5) / W * w0 - .5).round().astype(int), 0, w0 - 1)
out = im[fil][:, col]
if borde:
    y = np.minimum(np.arange(H), H - 1 - np.arange(H))[:, None]
    x = np.minimum(np.arange(W), W - 1 - np.arange(W))[None, :]
    a = np.clip(np.minimum(y, x) / borde, 0, 1)
    a = (a * a * (3 - 2 * a) * 255).astype(np.uint8)
    Image.fromarray(np.dstack([out, a]), 'RGBA').save(dst, quality=82, method=6, alpha_quality=60)
else:
    Image.fromarray(out).save(dst, quality=82, method=6)
```

Órdenes usadas, para `antiguo` y `actual`: `mundo -20 100 -40 58 4096`, `mediterraneo 10 44 28 44 4096 --borde=70`, `israel 33.9 36.9 29.4 33.7 2000 --borde=90` y `jerusalen 35.10 35.36 31.68 31.86 2400 --borde=120`. El mundo y Jerusalén usan las extensiones propias del sitio que describe el [README del kit](../docs/ideas/mockups/kit/build/README.md#extensiones-del-sitio).

Para comprobar la alineación, Corinto (37,9058 N, 22,8787 E) debe caer en la costa del istmo y no tierra adentro.

## Cómo situamos a Pablo

- Una parada **anclada** va en su fecha. Si la fuente nombra la estación («primavera de 47», «Pascua de 56»), la usamos para situarla dentro del año.
- Las paradas en **tiempo narrativo**, de las que sabemos el orden pero no la fecha, se reparten por igual entre las dos anclas que las rodean.
- Entre dos paradas el marcador avanza en línea recta. Si una de las dos es narrativa, el marcador lleva un halo discontinuo, el rótulo «posición estimada» y la línea de tiempo raya el tramo que no sabemos fechar.
- Fuera de las fechas de los datos, la ficha dice que no sabemos dónde estaba y ofrece las paradas más cercanas. Nunca se inventa una posición.
- El mapa dibuja un solo viaje de Pablo, el que recorre en esa fecha, cada uno en su color: lo hecho en firme, lo que falta punteado y la región sin ruta conocida a trazos. Sus otros viajes no se dibujan. Sus ocho viajes van seguidos, de 34 a 65: mientras se queda en la última parada de uno, como Antioquía o Roma, se ve ese viaje entero. Antes de 34 y después de 65 no se dibuja nada de Pablo, igual que con cualquier otra persona fuera de las fechas de sus viajes.
- Un viaje seleccionado se ve solo, entero y en su color, aunque la fecha caiga fuera de él. Seleccionar a una persona dibuja todos sus viajes: el de esa fecha en color y los demás en gris.

## Dirección de la página

La dirección guarda la vista para poder compartirla:

```
#t=50.3000&v=40&sel=carta:1-tesalonicenses&mapa=antiguo
```

- `t`: año con decimales, en numeración astronómica, donde 1 a.e.c. es 0. Lleva cuatro decimales, así que a escala de días vuelve al mismo día.
- `v`: años que abarca la línea de tiempo, con cuatro cifras significativas (`0.25` es un trimestre). Una dirección sin `v` conserva la escala que había.
- `sel`: `lugar:<id>`, `persona:<id>`, `carta:<id>`, `viaje:<id>`, `parada:<viaje>/<orden>`, `periodo:<id>`, `evento:<id>`, `hallazgo:<id>`, `recorrido:<id>`, `libro:<slug>` o `pasaje:<libro>-<capítulo>`, como `pasaje:hch-16`.
- `mapa`: `antiguo`, `actual` o `cortina`.

Los demás parámetros solo aparecen cuando no valen lo de siempre:

| Parámetro | Valores | Qué hace |
|---|---|---|
| `ocultas` | lista de `viajes,cartas,inciertos,hallazgos,pendientes,relieve` | Capas apagadas en el menú de capas |
| `nombres` | `antiguos`, `actuales` | Nombres del mapa; sin él, los dos donde ayuda |
| `nivel` | `1` | Filtro «Solo la Biblia y jw.org» |
| `cartas` | `todas`, `hasta`, `personas` | Qué cartas se dibujan; sin él, las cercanas a la fecha |
| `carriles` | lista de ids de carril o de persona | Carriles fijados en la línea de tiempo. El carril «Viajes de Pablo» conserva el id `pablo`, el mismo que tenía cuando se llamaba «Pablo» |
| `secular` | `0` | Oculta las fechas seculares |
| `pausa` | `0` | No se para en los sucesos al reproducir |
| `regla`, `bucle` | `a~b` | Regla entre dos fechas; tramo que se repite al reproducir |
| `linea` | `normal`, `grande` | Alto de la línea de tiempo cuando no es el de siempre: en la pantalla ancha de 840 px de alto o más abre alta y `normal` la baja; en el móvil o en una pantalla más baja `grande` la sube |
| `meses` | `ambos`, `nuestros`, `hebreos` | Filas de meses de la línea a escala de meses y de días, y qué fecha va primero arriba. Sin él, ambos |
| `ahora`, `sinc` | `1`; `<lugar>~<periodo>` | Vista «Ahora mismo»; sincronía de un lugar en un periodo |
| `grafo`, `gvista`, `gtodo` | ids unidos por `.`; una persona va por su id y lo demás con su tipo (`pablo.lugar:listra.evento:concilio-de-jerusalen-49`); `lista` o `grafo`; `1` | Grafo (el último es el centro; cualquier selección puede serlo, y con el grafo abierto lo seleccionado pasa al centro), su vista y si enseña todas las fechas |
| `vel` | `1-hora` … `2-dias` … `3-meses` … `1-anio` … `250-anios` | Velocidad de reproducción elegida a mano, en tiempo por segundo. Sin él, sigue a la escala |
| `conexion`, `camino` | `<tipo>:<id>~<tipo>:<id>`; número | Conexión entre dos y el camino elegido |
| `leer`, `pas` | `<libro>-<capítulo>`; número | Modo lectura y pasaje |
| `paso` | número | Parada del recorrido guiado |
| `portada` | `1` | Portada, con su propia entrada de historial. Sin nada en la dirección, el sitio abre en ella |

## Teclado

| Tecla | Qué hace |
|---|---|
| `/` | Ir a la búsqueda |
| Espacio | Reproducir o pausar |
| ← → | Mover el cursor un paso (depende del zoom de la línea). Con el foco en una marca de la línea, ir a la marca de al lado sin mover el cursor |
| ↑ ↓, Inicio, Fin | Con el foco en una marca de la línea: a la fila de arriba o de abajo, a la primera o a la última de su fila |
| Intro | Con el foco en una marca de la línea: elegirla; el cursor entra en ella por el punto más cercano |
| Mayúsculas + ← → | Saltar a la parada o carta anterior o siguiente |
| Esc | Borrar la búsqueda y la selección |
| `T` | Ampliar o reducir la línea de tiempo |
| Alt + arrastrar sobre la línea | Regla entre dos fechas |

Las marcas de la línea son una sola parada del tabulador. La rueda sobre la regla o los carriles cambia la escala en el puntero, de milenios a días, igual que Ctrl o ⌘ con la rueda y la pinza del trackpad; con Mayúsculas, o con un gesto horizontal en el trackpad, desplaza la vista. Cuando la línea es alta, los carriles se recorren de arriba abajo con la rueda sobre sus nombres, con la barra de desplazamiento o arrastrando en vertical. Arrastrar los carriles de lado mueve el tiempo; pulsar o arrastrar en la regla mueve el cursor.

El carril «Viajes de Pablo» enseña solo los viajes de Pablo: un tramo por viaje y, debajo, sus paradas. Las demás personas no tienen carril propio hasta que se eligen o se fijan desde el menú de la línea. Entonces sale uno con su nombre (la persona elegida, justo antes de «Viajes de Pablo»; la fijada, arriba) con sus paradas, los sucesos que la sitúan y dónde vivió. Cuando el nombre no cabe en una línea (en el móvil, con el carril fijado o con «Letra grande»), «Viajes de Pablo» va en dos líneas para no cortarse.

## Ficheros

| Fichero | Contenido |
|---|---|
| `index.html` | Estructura de la página, puntos de montaje de las vistas y carga de MapLibre, con versión fija y SRI |
| `acerca.html` | Qué es el proyecto, cómo se lee, cómo tratamos las fuentes, gracias con cada licencia y cómo proponer una corrección. Su único script apunta «Volver al mapa» a la vista de `?desde=…` |
| `calendario.html` | «El calendario de la Biblia»: los hechos de `explicacion` y la tabla de los trece meses, leídos de `data.json` (o de `data.js` desde `file://`). Acepta `?datos=_local/…` como `index.html` |
| [`js/`](js/) | La aplicación, partida en módulos (ver abajo) |
| [`css/`](css/) | Estilos propios: `base.css`, `mapa.css`, `linea.css`, `estudio.css` y `tactil.css` (el último: pantallas táctiles), y `acerca.css` y `calendario.css` para las dos páginas sueltas |
| `kit/` | Tokens, componentes y fuentes copiados del kit de maquetas. Las fuentes tienen licencia SIL OFL 1.1 |
| `maps/` | Relieve antiguo y actual en Web Mercator |
| `_local/` | Datos de prueba. No va a git |

## Módulos

| Fichero | Qué hace |
|---|---|
| `js/fundir-claves.js` | Script clásico sin `defer` y sin efectos: define `fundirClaves`, la regla para juntar dos juegos de claves guardadas. Lo de aquí manda, las notas se juntan por ficha y marcadores y capítulos leídos se unen. La usan `migrar-claves.js` y `traer.js` |
| `js/migrar-claves.js` | Script clásico sin `defer`, antes que ningún otro que lea el almacenamiento: junta las claves guardadas con el prefijo anterior con las del nuevo, `biblical-atlas:`, con `fundirClaves`. Nunca borra ni pisa. La marca `biblical-atlas:migrado` guarda una huella de cada clave antigua ya juntada: solo vuelve a juntar una que haya cambiado desde entonces |
| `js/base.js` | Utilidades, estado, carga de datos, registro de tipos, selección, cursor, reproducción, dirección, bucle de pintado, teclado y arranque |
| `js/mapa.js` | MapLibre, relieve en cuatro extensiones, cortina, rutas, arcos de cartas, lugares inciertos, hallazgos, etiquetas, capas, leyenda y «Mientras tanto» |
| `js/ficha.js` | Piezas comunes de las fichas: citas, fuentes y su marca (punto o aro), estado, «Por qué lo decimos», historial, «Proponer una corrección», nombres y vídeos |
| `js/trayectorias.js` | Dónde está cada persona en cada momento, ventanas de fecha de cartas y sucesos, y el calendario hebreo: meses de luna nueva a luna nueva, Veadar y nombres por época |
| `js/linea-filas.js` | Filas de la línea de tiempo, sin DOM: cada marca reserva el sitio de su dibujo y de su nombre entero, la primera fila libre de su carril se la queda, y ningún nombre se tapa ni se corta. También dónde entra el cursor al pulsar una marca, la certeza de una fecha y el orden del relato de los sucesos del mismo día (`BE.filas`) |
| `js/linea.js` | Línea de tiempo en seis escalas: carriles que crecen en filas, una marca por botón, filas de nuestros meses, meses hebreos y fiestas, selector «Meses», densidad, minimapa, regla, bucle y marcadores |
| `js/datepicker.js` | El panel de la fecha de arriba: qué quiere decir esta fecha, sucesos cercanos y momentos clave, y elegir era, año, mes hebreo y día sin escribir |
| `js/ahora.js` | «Ahora mismo», la frase de contexto de la línea y la sincronía por lugar |
| `js/buscar.js` | Búsqueda, preguntas de forma fija, años y atrás y adelante |
| `js/grafo.js` | Grafo de personas y conexión entre dos |
| `js/lectura.js` | Modo lectura de cualquier capítulo con datos |
| `js/recorridos.js` | Recorridos guiados, preguntas de repaso, hoja de impresión, modo presentación, modo reunión y letra grande |
| `js/portada.js` | Portada «Entra por una pregunta»: la caja que contesta, entrar en cada destino, «Seguir donde lo dejaste», épocas y recorridos |
| `js/tipos/*.js` | Un fichero por tipo de entidad: `lugar`, `persona`, `viaje`, `parada`, `carta`, `evento`, `periodo`, `hallazgo`, `recorrido`, `libro` y `pasaje` |

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
| `BE.donde(persona, t)` | Para `'pablo'`, lo mismo que `BE.dondeEsta(t)`. Para otra persona, sale de sus viajes, de los sucesos que la nombran con lugar y de sus relaciones fechadas `vivio_en`, `nacio_en` y `murio_en`. `null` si los datos no la sitúan |
| `BE.ventana(persona, fecha, lugares)` | La parte de la fecha en que los datos ponen a la persona en uno de esos lugares |
| `BE.mapa.resaltar(ids)` | Resalta esos lugares en el mapa por encima de la selección. `resaltar(null)` vuelve a la selección |
| `BE.mapa.encuadrar(ids)` | Encuadra el mapa en esos lugares, descontando la hoja inferior en el móvil |
| `BE.pintores` | Lista de funciones que el bucle de pintado llama en cada fotograma, después de las suyas, con las marcas de lo que cambió (`{ mapa, etiquetas, panel, linea, cursor }`) |
| `BE.inicios` | Funciones que se llaman una vez con los datos ya cargados, antes de leer la dirección |
| `BE.parametros` | Parámetros extra de la dirección: `{ nombre, escribir() → texto o null, leer(texto, inicial) }` |

`base.js` lee a través de `BE` estos valores, que su dueño puede cambiar desde su propio fichero sin tocar `base.js`: `BE.T_MIN` y `BE.T_MAX` (rango del cursor), `BE.velocidad()`, `BE.textoVelocidad()` y `BE.hitos()`, que pone `linea.js` (redondea la velocidad a un escalón con nombre, «3 meses por segundo», y deja elegirla con − y +); `BE.urlCapitulo(libro, cap)`, `BE.urlCita(cita)` (el capítulo en jw.org con el versículo o el tramo resaltado) y `BE.ponerLibros(lista)`, que cambia la lista de libros que entienden `citas` y la búsqueda, y que pone `tipos/libro.js`.

`trayectorias.js`, `linea.js` y `ahora.js` publican además `BE.estancias(persona)`, `BE.sucesoEn(persona, t)` (el suceso del que sale el lugar que da `BE.donde`; de ahí sale el de «Mientras tanto»), `BE.presentes(t)`, `BE.edad(persona, t)`, `BE.ventanaFecha(fecha)`, `BE.diaHebreo(t)`, `BE.anioHebreo(y)` (los 12 o 13 meses del año hebreo que empieza en la primavera de `y`), `BE.nombreMes(mes, y)` (el nombre del mes en esa época), `BE.fmtMes(t, fino)` (como `fmtCursor`, con la duración real de nuestros meses), `BE.irA(t, escala)`, `BE.encuadrarTiempo(a, b)`, `BE.inicioPeriodo(p)` (el principio conocido de un periodo: su `desde`; si no tiene, `consta_desde`; si tampoco, el principio del tramo dibujado), `BE.resumenAhora(t)`, `BE.fraseAhora(t)` y `BE.sincronia.alternar(on, { lugar, periodo })`.

`ficha.js` publica `BE.marcaNivel(n)`, la marca del tipo de fuente que usan las fichas y los carriles (la portada escribe las mismas en su HTML): punto lleno para la Biblia y jw.org, aro para otra fuente que jw.org ha usado. El nombre va en el texto emergente y para los lectores de pantalla.

`window.__be` expone lo necesario para las pruebas en Chrome sin interfaz: `E`, `P`, `D`, `BE`, `dondeEsta`, `donde`, `ventana`, `ventanaCarta`, `ventanaEvento`, `setT`, `seleccionar`, `ponerMapa` y `map`.

### Marcos que cambian de tamaño

Dos separadores (`base.js`, `iniciarMarcos`): `#sep-panel` entre el mapa y la ficha cambia `--panel-w`, y `#sep-linea` entre el mapa y la línea cambia `--timeline-h`. Se arrastran, se mueven con las flechas (20 px; 80 con Mayúsculas; Inicio y Fin, el mínimo y el máximo) y vuelven a su tamaño con doble clic o Intro. En el móvil el asa de la hoja cambia su alto (`--hoja-h`) y, pulsada, la pliega. Los tamaños se guardan en la sesión, en `biblical-atlas:marco:panel`, `:linea` y `:hoja`, y se recortan a lo que cabe al cambiar la ventana. En la pantalla ancha la línea abre alta (`min(62vh, 600px)`) si la ventana mide 840 px de alto o más, para que al mapa le queden unos 260 px; en una pantalla más baja abre con su alto normal y la T, el botón o el separador la suben. Con el grafo o la conexión abiertos, la línea alta de inicio les deja su sitio; pedida con la T, se ve alta también con ellos. Un alto arrastrado en esta sesión gana al recargar.

### Móvil, tableta y dedo

El sitio se prueba a 390 × 844 y 430 × 932 (móvil) y a 768 × 1024 y 1024 × 768 (tableta), con toque. La página no se desplaza nunca: cada marco desplaza lo suyo.

- **Por ancho.** Hasta 760 px la ficha es una hoja inferior sobre el mapa, con su asa arriba y, justo debajo, la fila del suceso de esta fecha y el botón «Leyenda»; las seis escalas de la línea van en un desplegable (`#zoom-select`, `linea.js`). Hasta 900 px los tres mapas y el modo reunión bajan a la esquina del mapa, el grafo y la conexión tapan el mapa entero, y la lectura va encima de la ficha para que el mapa la siga. El grafo y la conexión miden su propia vista (consultas `@container`), no la ventana: estrechos, la cadena va de arriba abajo y el grafo sale en lista salvo que se pida en círculo.
- **Con el dedo** (`@media (pointer: coarse)`, `css/tactil.css`). Cada control ofrece una diana de al menos 44 × 44 px: crece, o un `::after` transparente agranda la zona que recibe el toque sin cambiar el dibujo (los puntos del mapa, las píldoras, los enlaces sueltos). La raya de 10 px entre el mapa y la línea se sustituye por un asa de 44 px en la barra de la línea (`#linea-alto`): se arrastra igual y, pulsada, amplía la línea o la devuelve. En la línea las filas miden 44 px y ninguna marca mide menos de 44 de ancho; un nombre largo va en dos o tres líneas. Un toque elige la marca que hay bajo el dedo o la de esa fila a menos de 12 px; un arrastre de lado mueve el tiempo aunque empiece encima de una marca, y uno vertical recorre los carriles (`linea.js`).
- `BE.ajustarAyuda(input, ...cortos)` (`buscar.js`) pone en una caja de búsqueda el texto de ayuda más largo que quepa entero, en vez de cortarlo a media palabra.

Lo que queda por debajo de 44 px tiene su equivalente de 44: «Carriles +N» y «¿Qué meses son estos?» están en el menú (…) de la línea, y los tramos del progreso de un recorrido tienen «anterior» y «siguiente». Los puntos del mapa muy juntos se pisan sus zonas: se separan al acercar el mapa.

### Puntos de montaje

`index.html` trae, vacíos y con `hidden`, los contenedores de las vistas: `#vista-grafo`, `#vista-conexion`, `#vista-recorrido` y `#vista-ahora` dentro del mapa; `#vista-sincronia` dentro de la línea de tiempo; `#vista-lectura` dentro de `#app`. Las rellenan `grafo.js` (grafo y conexión), `recorridos.js`, `lectura.js` y `ahora.js` («Ahora mismo» y sincronía), cada una desde su fichero. Si necesita otro sitio en la página, su módulo la mueve con JavaScript, sin tocar `index.html`. `#vista-portada` es la excepción: ver «Portada».

### Portada

La portada es la hoja `#vista-portada`, dentro de `#app`, y la mueve [`js/portada.js`](js/portada.js). Su primera pantalla (título, caja, ejemplos, las tres preguntas y «Más preguntas») está escrita en `index.html`, con las formas de cada tipo en un solo `<svg>` (`#f-persona`, `#f-lugar`…), y pinta antes que los guiones y que `data.json`. La enseña la clase `be-con-portada` de `<html>`, que pone el guion de la cabecera cuando la dirección está vacía o lleva `portada=1`; ese guion pone también `be-reunion`, `be-letra-grande` y `be-vuelve` antes del primer pintado. Mientras está puesta, lo demás de `#app` va `inert`. El relieve (`maps/portada-relieve.webp`) solo se descarga cuando la portada sale.

- **Cada control es un enlace** a una dirección que el sitio ya entiende (`#sel=persona:pedro`, `#leer=hch-16`…), así que Ctrl o Cmd lo abren aparte. Un clic normal entra con `BE.historia.entrar(fn)` (`buscar.js`): una sola entrada de historial y la dirección aplicada con `BE.aplicarHash(false)`, como un enlace compartido. No depende del reloj: lo que cambie la vista después (el primer fotograma tarde, con el mapa cargando o en un teléfono lento; la parada de un recorrido, que llega un fotograma más tarde) es parte de la misma entrada hasta que la persona vuelve a pulsar o a teclear. Atrás y Adelante funcionan igual, y el logo pasa por `entrar` para que quitar la selección y abrir la portada sean un solo paso. Un Atrás vuelve a la portada con el foco en lo que se pulsó, el mismo desplazamiento y lo escrito en la caja.
- **La caja** usa la búsqueda del sitio: `BE.buscar`, `BE.filaResultado` (forma, palabra del tipo, título, línea y fecha), `BE.marcar`, `BE.elegirResultado` y `BE.sugerencias`. La lista de la portada es plana y va por puntos (`BE.portada.reglas.ordenPortada`); la de arriba sigue por grupos. En las dos, lo que se llama exactamente así va primero (también el nombre hasta la primera coma: «Juan, el apóstol» es «Juan»), y entre esos el que más hechos implica. La fecha de cada fila va una sola vez, en su píldora.
- **Antes de los datos**, un año ya contesta y un nombre dice «Cargando los nombres…». Un control pulsado deja la portada con «Abriendo el mapa…» y el arranque lee su dirección; Atrás antes de los datos quita la espera. Si la carga falla, `base.js` llama a `BE.alFallar(err)` y la portada dice «No se ha podido abrir el mapa.» con un botón para volver a intentarlo.
- **«Seguir donde lo dejaste»** lee `biblical-atlas:ultima` (`{ hash, texto }`), que se escribe 400 ms después de cada vista con algo elegido o con el modo lectura, con `BE.textoHash()`. «Olvidar» lo borra.
- **«Aa» y la luna** llaman a `BE.ponerPreferencia(nombre, on)` (`base.js`), la única que escribe `biblical-atlas:pref:letra-grande` y `:reunion`; el menú «Estudio» y la luna de la barra también pasan por ella.
- **Las épocas, los recorridos y las cifras** se pintan con los datos. Cada época abre con el cursor en su principio y la línea con toda la época, así que el mapa se encuadra en su fecha; su línea es la última frase de su resumen que nombra un libro.

[`portada-reglas.test.mjs`](../tests/site/portada-reglas.test.mjs) y [`portada-destinos.test.mjs`](../tests/site/portada-destinos.test.mjs) van sin navegador, también en [`validar.yml`](../.github/workflows/validar.yml). [`landing.test.mjs`](../tests/site/landing.test.mjs) usa Chromium. El encuadre del mapa de cada época se comprueba a mano, con el mapa cargado: «Destierro y regreso» abre sobre Mesopotamia y Judá.

### Datos de prueba

`index.html?datos=_local/<nombre>/data.json` carga otro `data.json`. Solo acepta rutas dentro de `_local/` que acaben en `.json`; cualquier otra cosa enseña un error en la ficha. Desde `file://` carga el `data.js` de la misma carpeta. Para compilar ahí sin pisar `site/data.json`:

```bash
python3 scripts/build.py --out site/_local/<nombre>/
```

## Cómo se repartió el trabajo

El sitio está partido en módulos para que varias personas puedan trabajar en él a la vez sin pisarse. Mientras construimos v1 y v2, cada fichero tuvo un solo dueño, y los cambios en `base.js`, `base.css` o `index.html` se pedían por escrito y se aplicaban al integrar. El reparto fue este:

| Ficheros | Trabajo |
|---|---|
| `js/base.js`, `css/base.css`, `index.html` | Congelados |
| `js/mapa.js`, `js/ficha.js`, `js/tipos/lugar.js`, `js/tipos/carta.js`, `js/tipos/hallazgo.js`, `css/mapa.css`, `maps/*` | Mapa |
| `js/trayectorias.js`, `js/linea-filas.js`, `js/linea.js`, `js/ahora.js`, `js/tipos/viaje.js`, `js/tipos/parada.js`, `js/tipos/evento.js`, `js/tipos/periodo.js`, `css/linea.css` | Tiempo |
| `js/buscar.js`, `js/grafo.js`, `js/lectura.js`, `js/recorridos.js`, `js/portada.js`, `js/tipos/persona.js`, `js/tipos/pasaje.js`, `js/tipos/libro.js`, `js/tipos/recorrido.js`, `css/estudio.css` | Estudio |

`data.json`, `data.js` y los tres índices de vídeos son derivados y nadie los edita a mano.
