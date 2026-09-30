# Línea de tiempo: prototipos de diseño

Prototipos que funcionan de varias formas de dibujar y usar la línea de tiempo, para comparar y elegir. No cambian el sitio: nada de aquí toca `site/`. La comparación está en [`../../linea-de-tiempo-disenos.md`](../../linea-de-tiempo-disenos.md) y las capturas, en [`../../img/linea/`](../../img/linea/).

## Abrir un prototipo

Desde la raíz del repositorio:

```bash
python3 -m http.server 8000 --bind 127.0.0.1 -d docs/ideas
```

y abrir `http://127.0.0.1:8000/mockups/linea/`, el índice de los cinco, o `http://127.0.0.1:8000/mockups/linea/<nombre>/`, donde `<nombre>` es `lanes`, `overview`, `list`, `clusters` o `minimal`. Se sirve `docs/ideas` entero para que el prototipo alcance la letra del kit (`../../kit/fonts.css` desde su carpeta); si se sirve otra carpeta, la página lo dice arriba y se ve con la letra del sistema.

Los cinco comparten `comun.js`: los enlaces de arriba abren el otro diseño en la misma fecha, escala, vista, marca elegida y tema; el tema sigue al del sistema si la dirección no dice otro; «Ir a» lee una fecha escrita; las barras de mandos son una sola parada de tabulador. La dirección usa las mismas claves en los cinco: `t` (el cursor), `escala` (una escala o un ancho en años), `desde` (el principio de la vista), `sel` (la marca elegida) y `tema`.

Para una captura: `node docs/ideas/mockups/kit/render.mjs --size 1440x900 --out docs/ideas/img/linea/<nombre> docs/ideas/mockups/linea/<nombre>/index.html`. Sale como `index.png`, al doble de resolución.

## Los datos: `datos.js`

Un script normal que pone `window.TIMELINE_DATA`. Todos los prototipos dibujan lo mismo: 1159 marcas (945 sucesos, 95 paradas, 74 reyes, emperadores, gobernadores y sumos sacerdotes, 22 cartas, 15 eras e imperios y 8 viajes), unos 640 KB.

- `marks`: una marca por cosa, con `id` (`event:…`, `stop:…`), `kind`, `lane` (el carril donde va hoy), `name`, `start` y `end`, `date` (la fecha como la escriben los datos), `precision` (`day`, `month`, `season`, `year`, `years`), `certainty` (`exact`, `approx`, `computed`, `uncertain`), `places`, `people` y `summary` (la primera frase del resumen). Si el sitio la coloca dentro de su fecha (una parada, el orden del relato), lleva `placed` y `stated`, la ventana que da la fecha sola. Una parada con `start` igual a `end` es un instante: la fuente no le da duración.
- `scales` y `lanes`: las seis escalas y los carriles de hoy, con sus nombres.
- `calendar`: los meses hebreos (`months`) y, para cada año con algo de menos de un año, dónde empieza y acaba cada mes (`years`).

El tiempo va en años decimales, como en el sitio: el año `y` va de `y` a `y + 1` (1 es 1 e.c., 0 es 1 a.e.c., -606 es 607 a.e.c.) y un día es 1 / 365.2425.

`certainty`: `uncertain` si falta un extremo o la fecha duda («antes de 62», «quizás 36», «31 o 32»); `computed` si la fecha es un cálculo nuestro o sale del orden del relato; `approx` si lleva «c.»; `exact` en el resto.

`seq`: los sucesos que comparten la misma ventana (el 14 de nisán del 33 tiene 13) llevan su orden en el relato, 0, 1, 2... Los datos no lo traen: lo deducimos de sus pasajes (si dos comparten un libro, va antes el que empieza antes en él; con varios libros manda la mayoría) y, donde no dicen nada, del orden en que `site/data.json` trae los sucesos. `datos.js` ya va en ese orden.

## Regenerar

```bash
python3 scripts/build.py                        # site/data.json
node docs/ideas/mockups/linea/ventanas.mjs      # ventanas.json: las ventanas que calcula el sitio, con Chrome
python3 docs/ideas/mockups/linea/extract.py     # datos.js
```

`ventanas.mjs` abre el sitio real en Chrome sin ventana y lee las ventanas de `site/js/trayectorias.js` tal como las calcula (paradas de Pablo, reparto por el orden del relato, meses hebreos), y los carriles del menú de la línea. `extract.py` solo usa la biblioteca estándar y da los mismos bytes con la misma entrada. `datos.js` no lleva la fecha de la construcción, así que volver a generarlo otro día con los mismos datos da el mismo fichero.
