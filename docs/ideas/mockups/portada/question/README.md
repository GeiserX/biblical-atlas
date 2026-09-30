# Portada «Entra por una pregunta»

La primera pantalla pregunta y el sitio contesta en el mapa. El título es una pregunta de estudio con palabras nuestras, «¿Dónde y cuándo pasó lo que estás leyendo?», y justo debajo está la caja para hacer la tuya. Al lado, tres preguntas de verdad, cada una con un recorte de su respuesta tomado del sitio. Debajo, otras maneras de preguntar: por época, por recorrido, por capítulo, por azar y una pregunta con tres respuestas.

Es una maqueta que funciona: [`index.html`](index.html) con su [`style.css`](style.css) y su [`app.js`](app.js), sin compilar nada. El sitio real vive detrás, en un marco. Entrar quita la portada y deja el marco en la dirección de la respuesta, y Atrás devuelve a la portada.

![Primera pantalla en el ordenador](../../../img/portada/question/first-desktop.webp)

## Cómo se usa, zona por zona

1. **La franja de arriba.** Tiene el nombre y el lema del banner, «La Biblia en el mapa y en el tiempo», con la raya salvia de 64 × 2. Debajo van el título en pregunta, una frase y la caja. Detrás, el relieve lavado hacia el papel como en el banner; en el ordenador ocupa la parte derecha, con la costa de Canaán donde se abre el velo. A la derecha, solo para quien vuelve, sale «Para ti»: «Seguir donde lo dejé» y «Tu lectura de la semana».
2. **La caja que ya contesta.** Al escribir salen sugerencias con la forma de su tipo (círculo de persona, chincheta de lugar, rombo de suceso, página de capítulo, cursor de año) y su fecha en la píldora de pino. Lee años («607 a.e.c.»), capítulos («Hch 16»), dos nombres («Loida y Pablo») y un lugar con año («Babilonia en 30»). Intro entra en la sugerencia marcada, sin una segunda lista. Debajo hay tres ejemplos de tres clases (una persona, un capítulo y un año), y cada uno va directo a su destino.
3. **Tres preguntas, tres maneras de mirar.** Cada tarjeta lleva su fecha, lo que vas a ver y un recorte fijo del sitio: el mapa en una fecha (Judá en 520 a.e.c.), las relaciones (Loida y Pablo) y un capítulo con su mapa (Hechos 16). Al entrar, una tarjeta «Ahora tú» propone el paso siguiente, por ejemplo «Mueve el cursor hasta 515 a.e.c.», y ofrece «Llévame allí». «Más preguntas» guarda las otras dos de la portada de hoy, ya corregidas: Babilonia en tiempos de Jesús, y las cartas de Pablo abiertas de verdad.
4. **¿En qué época pasó?** Las nueve épocas en una lista de una sola tinta. Cada una lleva su número, su nombre, sus fechas y los libros que la cuentan. «Entre Malaquías y Mateo» lleva trama y dice «Sin libro bíblico».
5. **¿Prefieres que te lo cuenten paso a paso?** Los cuatro recorridos, con sus paradas, sus fechas y la primera frase de lo que cuentan.
6. **¿Qué lees esta semana?** Lo escribe quien lee («Isaías 40-42»). Desde entonces la portada lo ofrece arriba, con cada capítulo a un toque y el enlace a wol.jw.org. Dice sin rodeos qué capítulos tienen todavía datos en el mapa.
7. **¿Y si empiezas por cualquier momento?** «Un momento cualquiera» enseña un suceso verificado con su fecha y su lugar, con «Verlo en el mapa» y «Otro momento». «Por estas fechas» busca el mes hebreo que cae más o menos hoy y propone uno de sus sucesos.
8. **¿Sabrías contestar esta?** Una de las preguntas de los recorridos, con tres respuestas y sin puntos. La respuesta se dice con texto y con una marca, no solo con color, y lleva a su parada.
9. **¿De dónde sale cada dato?** Los tres niveles, cada uno con su forma, y las cifras del atlas.
10. **Pie.** Los créditos del relieve y de las coordenadas, la licencia, el calendario, «acerca» y la fecha de los datos.

En el teléfono, la caja baja a una barra fija al alcance del pulgar, con «Mapa» al lado, y su lista sube desde la barra con cuatro filas como máximo. El relieve queda arriba, en una franja, y el texto va debajo, nunca encima.

Quien llega por un enlace compartido ve la vista compartida, como hoy, y encima una cinta de una línea: «Estás viendo a Pedro en 30 e.c. en biblical-earth…», con «Ver la portada». La cinta sale una sola vez por navegador.

## Estados para probar

- `./?estado=nuevo`: la primera visita, sin nada guardado.
- `./?estado=vuelve`: quien vuelve, con «Seguir donde lo dejé» y una lectura de la semana de ejemplo.
- `./?compartido=<dirección del sitio>&cinta=siempre`: quien llega por un enlace.
- `./?tema=reunion` y `./?tema=claro`: el tema, que por lo demás sigue la preferencia del sitio.
- `./?hoy=2027-04-02`: otra fecha para «Por estas fechas».
- `./?site=<dirección>`: otro sitio detrás. Sin ella, `/site/` si la página se sirve desde la raíz del repositorio, y el sitio publicado en cualquier otro caso. El tema va copiado en `../assets/kit`. Si el sitio no carga, la portada se queda puesta y lo dice, con un botón para volver a intentarlo.

## Datos e imágenes

- [`data.js`](data.js) y [`indice.js`](indice.js) salen de `site/data.json` con [`make-data.py`](make-data.py). La caja carga `indice.js` (190 KB, 52 KB comprimido) al tocarla, no antes. Los libros de cada época van escritos a mano en el guion, sacados del resumen de cada época. La 2 no lo dice, y se escribe «Génesis 9 a 50 y el principio de Éxodo».
- Las tres miniaturas de [`img/`](img/) son recortes de capturas del sitio real en la dirección de cada pregunta ([`make-thumbs.mjs`](make-thumbs.mjs)). El relieve de la franja es [`bible-lands`](../assets/img/) de las imágenes comunes. No hay nada dibujado ni tomado de nadie. Créditos: relieve de Natural Earth, USGS, NOAA, Copernicus y Mapzen; coordenadas de OpenBible.info (CC BY 4.0).
- `?estado`, `?compartido`, `?tema`, `?hoy` y el paso entre diseños de la esquina son del prototipo, no del diseño.
