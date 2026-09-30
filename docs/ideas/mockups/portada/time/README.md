# Portada «Entra por el tiempo» (diseño 3 de 6)

La primera pantalla es la línea de seis fechas del banner hecha control. Se arrastra por 4.125 años. El año elegido sale en grande, en pino, y debajo va una frase con lo que pasa ese año y quién vivía entonces. Al soltar, el mapa de detrás enseña dónde pasó. «Entrar en 1513 a.e.c.» quita la portada y deja el sitio en esa fecha.

Capturas en [`docs/ideas/img/portada/time/`](../../../img/portada/time/).

## Cómo abrirla

Desde la raíz del repositorio, con `site/data.json` ya compilado:

```bash
python3 -m http.server 8912 --bind 127.0.0.1
# y abrir http://127.0.0.1:8912/docs/ideas/mockups/portada/time/
```

El sitio de detrás se carga en un marco desde `/site/` cuando la página se sirve desde la raíz del repositorio, y desde el sitio publicado en cualquier otro caso (por ejemplo, con la carpeta de los prototipos servida sola); `?site=<dirección>` elige otro. El tema va copiado en `../assets/kit`, así que se ve igual en los dos casos. Si el sitio no carga, la portada se queda puesta y dice «No se ha podido abrir el mapa», con un botón para volver a intentarlo. Con el sitio en el mismo origen la portada lo controla del todo: oculta su interfaz mientras está puesta, lee sus datos, usa su buscador y encuadra el mapa. Con el sitio en otro origen solo le cambia la dirección.

`data.js` es una copia pequeña (98 KB) de lo que la portada pinta, para no esperar a los 5,6 MB de `data.json`. La escribe `build-data.mjs` con `compact.js`:

```bash
node docs/ideas/mockups/portada/time/build-data.mjs
```

En cuanto el sitio de detrás termina de cargar, la portada vuelve a leer todo de sus datos con la misma función.

## Zonas

1. **Cabecera.** La rama y el nombre (enlace a la portada), la luna del modo reunión y «Qué es». Arriba a la derecha, el paso a los otros cinco diseños, que es del prototipo y no del diseño.
2. **El momento.** El lema del banner, el título quieto y una línea que dice qué hacer. Debajo, el año en grande, la época con su potencia mundial, una frase con el suceso más citado de ese año y «Viven:» con cuatro nombres. Si la persona ya estuvo, «Seguir donde lo dejé». Después, la búsqueda, en segundo lugar, con tres ejemplos.
3. **La línea**, que se queda pegada abajo al bajar la página. Tiene seis marcas de pino con sus fechas, que son botones de 44 px, y un cursor con bandera. El cursor se mueve con las flechas (un año, diez con Mayúsculas), con Re Pág y Av Pág (una época) y con Inicio y Fin. Un interruptor cambia entre «A escala real» y «A partes iguales» (nueve épocas del mismo ancho). En partes iguales, encima va la raya a escala real como referencia. A la derecha, el único botón principal: «Entrar en …».
4. **Empieza por una pregunta.** Tres preguntas. La primera pulsación lleva el cursor a su fecha y la segunda entra.
5. **Nueve épocas.** Una regla en una sola tinta, las seis potencias en gris pizarra con su nombre escrito y nueve tarjetas con número, fechas y «Lo cuentan: …». Cada época abre donde ocurrió.
6. **Recorridos guiados.** Cada uno marca su tramo en la línea al señalarlo y dice por qué parada va quien lo dejó a medias. Entrar sigue en esa parada, no la borra.
7. **De dónde sale cada dato.** Las cifras del atlas y los tres niveles.
8. **Pie.** Los créditos del relieve y de las coordenadas, el idioma, la licencia, el calendario y «Qué es».

## Qué es texto nuestro escrito para el prototipo

- Las nueve líneas de libros de `compact.js` (`LIBROS`) salen de los libros que nombra el resumen de cada época. «Los patriarcas» no los nombra, así que «Génesis 9 a 50» sale de la línea de la época anterior. Hay que revisarlas.
- Los resúmenes de tres recorridos que no lo tienen en los datos (`RESUMEN_RECORRIDO`) salen de su título, de su primera y su última parada y de su razón. Hay que revisarlos.
- La pregunta de Judá cae en 520 a.e.c. (en la portada de hoy cae en 521). La de las cartas abre `cartas=todas`.

## Créditos

El fondo mientras carga el mapa es una captura de nuestro propio mapa ([`../assets/CREDITS.md`](../assets/CREDITS.md)). Detrás va el mapa del sitio, con su crédito en la esquina: «Relieve: Natural Earth, USGS, NOAA, Copernicus, Mapzen · Coordenadas: OpenBible.info (CC BY 4.0)». En el teléfono va la forma corta del banner. La rama es `site/logo.svg`. No hay más imágenes.
