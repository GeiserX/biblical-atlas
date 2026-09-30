# Portada «El sitio, funcionando»

Media pantalla son palabras y una acción. La otra media es el sitio de verdad, sin lavar, con su fecha a la vista, haciendo solo una escena corta: tres paradas del recorrido «De Babilonia a Jerusalén» (607 a.e.c., la fecha corre hasta 539, y 537 con Jerusalén y su fuente en la ficha). Enseña lo que hace el sitio en vez de contarlo.

![Primera pantalla en escritorio](../../../img/portada/live/first-desktop.webp)

## Cómo se abre

Desde la raíz del repositorio, con los datos ya compilados (`python3 scripts/build.py`):

```bash
python3 -m http.server 8914 --bind 127.0.0.1
```

y abre <http://127.0.0.1:8914/docs/ideas/mockups/portada/live/>. El marco carga el sitio de `/site/` del mismo servidor. Servida de otra forma (la carpeta de los prototipos sola, por ejemplo), la página usa el sitio publicado, y `?site=<dirección>` elige otro. El tema va copiado en `../assets/kit`. Si el sitio no carga, la portada se queda puesta y dice «No se ha podido abrir el mapa», con un botón para volver a intentarlo.

Para probar cada estado:

| Dirección | Qué enseña |
|---|---|
| `?estado=nuevo` | La primera visita, aunque este navegador ya tenga historial |
| `?estado=vuelve` | Quien vuelve: el sitio abre en el mapa con una tarjeta pequeña |
| `?estado=nuevo&cinta=1#sel=persona:pedro&t=30.5000` | Un enlace compartido, con la cinta de una línea |
| `?tema=reunion` | El modo reunión (el oscuro del sitio), sin guardarlo |
| `?lento=1` | Un teléfono con red lenta: la captura quieta y «Ver cómo funciona» |

El selector «Diseños», arriba a la derecha, lleva a los otros cinco diseños y a estos estados. Es del prototipo, no del diseño.

## Cómo se usa, de arriba abajo

1. **La primera pantalla.** A la izquierda (en el teléfono, debajo), el nombre, el título «La Biblia en el mapa y en el tiempo», una frase, la escena contada en tres pasos con su fecha, «Pausar», el botón «Tomar el mando», la búsqueda y «Más maneras de empezar». A la derecha (en el teléfono, una franja arriba), el sitio.
2. **La escena.** Arranca cuando el mapa está quieto, no antes. Pasa una sola vez y se para sola al final. «Pausar» la para; cualquier clic o tecla sobre el sitio la para y lo entrega a pantalla completa. Con movimiento reducido o en modo reunión no arranca: enseña la primera parada quieta con «Siguiente», y cada cambio es un fundido, sin mover la cámara.
3. **Entrar.** «Tomar el mando», un clic en el sitio, un resultado de la búsqueda o cualquier botón de abajo hacen crecer el sitio a toda la ventana. Es el mismo sitio, en el mismo estado: no se recarga nada. Atrás devuelve la portada, con el sitio donde lo dejaste.
4. **Recorridos guiados.** Los cuatro, con su ruta dibujada sobre nuestro relieve, sus paradas, sus fechas, unos minutos estimados y por dónde vas, con «Seguir en la parada N» o «Desde el principio».
5. **Empieza por una pregunta.** Las tres de la portada de hoy, con su fecha y su lugar.
6. **Las épocas, a escala real.** La línea de seis fechas del banner, con botones de 44 px, y las nueve épocas en una sola tinta: número, nombre, fechas y una frase. Cada época abre su propio encuadre del mapa.
7. **Cada dato, con su fuente.** Un suceso real con su fecha, su nivel, sus pasajes y sus fuentes, y las cifras del atlas.
8. **Pie.** Los créditos del relieve y de las coordenadas, «Letra grande», el calendario y «Qué es biblical-earth».

## Qué hace de verdad y qué es de prototipo

- El marco es el sitio sin cambios. La portada lo maneja con su dirección (`#t=…&sel=…&paso=…`), como un enlace compartido.
- Servida desde el mismo origen que el sitio, además: espera a que el mapa esté quieto, fija la cámara de la escena, usa la búsqueda del propio sitio (`BE.buscar`), lee sus datos, y evita que la escena deje entradas en el historial, en «Seguir donde lo dejé» o en el avance del recorrido de quien mira.
- Desde otro origen solo cambia la dirección: la escena corre, pero sin cámara fija, sin sugerencias al buscar y dejando sus pasos en el historial.
- El encuadre de cada época (idea D1) lo hace esta página desde fuera con la caja que calcula `extract.js`. En el sitio de verdad iría en `site/js/tipos/periodo.js`.

## Ficheros

| Fichero | Qué es |
|---|---|
| `index.html`, `live.css`, `live.js` | La página. Sin compilación ni dependencias |
| `extract.js` | Lo que la portada lee de `site/data.json`. Lo usan la página y `build-data.mjs` |
| `build-data.mjs` → `data.js` | La copia pequeña (14 KB) con la que la portada pinta antes de que llegue el sitio |
| `render-captures.mjs` → `img/` | Las capturas de la mitad viva en la primera parada (idea K1) |

Tres resúmenes de recorrido no existen en los datos («Las cartas de Pablo…», «La última semana…» y «Pedro…»). Los de esta página son borradores nuestros, escritos a partir de sus paradas, y están en `extract.js`.

## Créditos

Las capturas de `img/` son del propio sitio, con su interfaz. Su mapa lleva el relieve de Natural Earth y los datos de elevación de Mapzen (con USGS, NOAA y Copernicus) y las coordenadas de OpenBible.info (CC BY 4.0), como dice la lista completa de [`../assets/CREDITS.md`](../assets/CREDITS.md). Las rutas de los recorridos se dibujan sobre las imágenes de [`../assets/img/`](../assets/img/), sin cambiarlas. No hay fotografías, ilustraciones ni textos de nadie más.
