# Ideas de biblical-atlas

Aquí están las ideas de producto, las maquetas y el modelo de datos de biblical-atlas. Describen qué queremos construir y por qué. Lo construido está en [`site/`](../../site/) y en la [hoja de ruta](../hoja-de-ruta.md).

## Qué queremos

Una web abierta para estudiar la Biblia con un **mapa**, una **línea de tiempo con zoom** y un **panel lateral**. Las tres piezas obedecen a una sola fecha, el **cursor de tiempo**. Mueves el cursor y el mapa enseña lo que existía en ese momento, la línea marca quién vivía y el panel cuenta qué pasaba.

Por debajo hay un grafo: personas, lugares, hechos, viajes, cartas y hallazgos, unidos por relaciones que tienen su fecha y su fuente. El estudiante nunca ve el grafo entero. Ve una persona, un lugar o un hecho en el centro y, a su alrededor, lo que estaba conectado con él en esa fecha. Desde ahí salta de nodo en nodo.

La fuente principal (nivel 1) es la Traducción del Nuevo Mundo (TNM) y wol.jw.org, con su cronología. La arqueología y la investigación (nivel 2) acompañan y nunca corrigen. De jw.org solo enlazamos: no copiamos textos ni imágenes.

## Preguntas que el producto responde de forma obvia

- ¿Qué pasaba en Babilonia en tiempos de Jesús? → [pantalla 08](pantallas-grafo-y-contexto.md#08--babilonia-en-tiempos-de-jesús)
- ¿Quién había en Israel en la época de los medos y persas? → [pantalla 09](pantallas-grafo-y-contexto.md#09--israel-en-la-época-de-los-medos-y-persas) y [pantalla 05](pantallas-mapa-y-tiempo.md#05--línea-de-tiempo)
- ¿Dónde estaba Pablo en tal año, desde dónde escribió cada carta y qué pasaba en la ciudad que la recibía? → [pantalla 01](pantallas-mapa-y-tiempo.md#01--pantalla-principal) y [pantalla 03](pantallas-mapa-y-tiempo.md#03--cartas-de-pablo)
- ¿Qué pasó en este punto del mapa en esta fecha? → [pantalla 13](pantallas-busqueda-y-estudio.md#13--fuentes-y-cronología)
- ¿Cómo se relaciona esta persona con aquella? → [pantalla 10](pantallas-grafo-y-contexto.md#10--conexión-entre-dos)
- ¿Dónde queda hoy este lugar bíblico? → [pantalla 02](pantallas-mapa-y-tiempo.md#02--mapa-antiguo-frente-a-actual)
- ¿Dónde estaba el Edén? ¿Por qué no hay un punto? → [pantalla 04](pantallas-mapa-y-tiempo.md#04--lugares-inciertos)
- ¿Por qué 607 a.e.c. y no 587? → [pantalla 13b](pantallas-busqueda-y-estudio.md#13b--cronología-tnm-y-fecha-secular-607-aec)

## Principios de diseño

1. **Una fecha manda.** El cursor gobierna el mapa, la línea, el grafo y el panel. Nunca enseñan fechas distintas.
2. **Nunca el grafo entero.** Siempre una vista centrada, filtrada por fecha y con un límite de vecinos.
3. **La incertidumbre se dibuja.** Un lugar incierto es una zona o un abanico de candidatos, cada uno con su base. Una fecha incierta tiene los bordes difuminados. Un cálculo nuestro se ve distinto. En la línea de tiempo va hueco, y su ficha dice «cálculo nuestro, sin verificar» y explica la cuenta. Nunca ponemos un punto falso.
4. **Cada dato tiene su fuente a un clic.** Nivel 1 o nivel 2, con enlace. Lo que no tiene fuente dice «sin verificar».
5. **Leemos en la fuente, no la copiamos.** Referencias como «Hch 16:12-15», resúmenes nuestros y el botón «Leer en wol.jw.org ↗».
6. **Lo antiguo y lo moderno a la vez.** Cada nombre de la época lleva su equivalente actual, a un clic o con cortina.
7. **Una sola línea de tiempo con niveles.** El zoom abre los nombres. No hay una segunda banda de episodios encima.
8. **Buscar es seleccionar.** El resultado es un nodo con su contexto en el tiempo y en el mapa. Lo demás se atenúa.
9. **Toda vista se puede compartir.** La dirección guarda la fecha, la selección y las capas.
10. **Primero el móvil, el teclado y la lectura.** Si funciona con una mano y con lector de pantalla, funciona para todos.

## Galería de maquetas

Son capturas de maquetas HTML hechas con el [kit](mockups/README.md), con datos comprobados en wol.jw.org. Cada imagen lleva a su ficha: qué pregunta responde, cómo se llega, qué se puede pulsar y sus estados alternativos.

<table>
<tr>
<td width="50%"><a href="pantallas-mapa-y-tiempo.md#01--pantalla-principal"><img src="img/01-principal.png" alt="Pantalla principal: segundo viaje de Pablo con el cursor en c. 50 e.c., Pablo en Filipos"></a><br><b>01 · Pantalla principal.</b> Pablo en Filipos hacia el 50 e.c., con el viaje hecho, lo que falta y qué pasaba en Roma.</td>
<td width="50%"><a href="pantallas-mapa-y-tiempo.md#02--mapa-antiguo-frente-a-actual"><img src="img/02-antiguo-vs-actual.png" alt="Mapa antiguo y actual con cortina: Patmos y las siete congregaciones"></a><br><b>02 · Antiguo frente a actual.</b> Cortina entre el mapa de la época y el de hoy, con la tabla de nombres.</td>
</tr>
<tr>
<td><a href="pantallas-mapa-y-tiempo.md#03--cartas-de-pablo"><img src="img/03-cartas-de-pablo.png" alt="Cartas de Pablo como flechas de origen a destino, 1 Corintios seleccionada"></a><br><b>03 · Cartas de Pablo.</b> Cada carta es una flecha de origen a destino y la ficha cuenta qué pasaba en los dos extremos.</td>
<td><a href="pantallas-mapa-y-tiempo.md#04--lugares-inciertos"><img src="img/04-lugares-inciertos.png" alt="Lugares inciertos: zona del Edén y candidatos del Sinaí"></a><br><b>04 · Lugares inciertos.</b> El Edén es una zona y el Sinaí tiene cuatro candidatos, cada uno con su base.</td>
</tr>
<tr>
<td><a href="pantallas-mapa-y-tiempo.md#05--línea-de-tiempo"><img src="img/05-linea-de-tiempo.png" alt="Línea de tiempo en tres zooms: milenios, décadas medopersas y días de la primavera del 33"></a><br><b>05 · Línea de tiempo.</b> Tres zooms en una sola línea: milenios, décadas del periodo persa y días de nisán del 33.</td>
<td><a href="pantallas-mapa-y-tiempo.md#06--móvil"><img src="img/06-movil.png" alt="Móvil: mapa arriba y hoja inferior con la línea de tiempo y la ficha de Filipos" width="48%"></a> <a href="pantallas-mapa-y-tiempo.md#06--móvil"><img src="img/06b-movil-hoja-abierta.png" alt="Móvil con la hoja abierta: el segundo viaje como lista vertical" width="48%"></a><br><b>06 y 06b · Móvil.</b> La hoja inferior a media altura y abierta del todo, con el viaje en vertical.</td>
</tr>
<tr>
<td><a href="pantallas-grafo-y-contexto.md#07--grafo-centrado-en-pablo"><img src="img/07-grafo-pablo.png" alt="Grafo centrado en Pablo a mediados del 51 e.c. con la rama de Timoteo abierta"></a><br><b>07 · Grafo centrado en Pablo.</b> Personas, lugares, cartas y hechos conectados con Pablo a mediados del 51.</td>
<td><a href="pantallas-grafo-y-contexto.md#08--babilonia-en-tiempos-de-jesús"><img src="img/08-babilonia-en-tiempos-de-jesus.png" alt="Ficha de Babilonia en 30 e.c. con su historia plegada y lo que pasaba allí"></a><br><b>08 · Babilonia en tiempos de Jesús.</b> La ciudad a lo largo del tiempo y qué pasaba allí en el 30 e.c.</td>
</tr>
<tr>
<td><a href="pantallas-grafo-y-contexto.md#09--israel-en-la-época-de-los-medos-y-persas"><img src="img/09-israel-medos-y-persas.png" alt="Quién había en Judá en la época de los medos y persas, con el cursor en 520 a.e.c."></a><br><b>09 · Israel con los medos y persas.</b> Quién había en Judá, en Babilonia y en Susa, con el cursor en 520 a.e.c.</td>
<td><a href="pantallas-grafo-y-contexto.md#10--conexión-entre-dos"><img src="img/10-conexion-entre-dos.png" alt="Tres caminos que unen a Loida con Pablo, ordenados por solidez"></a><br><b>10 · Conexión entre dos.</b> Tres caminos de Loida a Pablo, ordenados por lo sólidos que son.</td>
</tr>
<tr>
<td><a href="pantallas-busqueda-y-estudio.md#11--búsqueda-pedro"><img src="img/11-busqueda-pedro.png" alt="Búsqueda de Pedro: resultados, su vida en el mapa y en la línea de tiempo"></a><br><b>11 · Búsqueda.</b> Buscar «Pedro» enmarca su vida en el tiempo y sus lugares en el mapa.</td>
<td><a href="pantallas-busqueda-y-estudio.md#12--modo-lectura-hechos-16"><img src="img/12-lectura-hechos-16.png" alt="Modo lectura de Hechos 16 con el mapa siguiendo cada pasaje"></a><br><b>12 · Modo lectura.</b> Hechos 16 pasaje a pasaje, con el mapa siguiendo la lectura.</td>
</tr>
<tr>
<td><a href="pantallas-busqueda-y-estudio.md#13--fuentes-y-cronología"><img src="img/13-fuentes-y-cronologia.png" alt="Ficha de Pablo ante Galión con fuentes por niveles y fechas en discrepancia"></a><br><b>13 · Fuentes y cronología.</b> Pablo ante Galión: nivel 1, nivel 2, la otra propuesta de fecha y lo que no está verificado.</td>
<td><a href="pantallas-busqueda-y-estudio.md#13b--cronología-tnm-y-fecha-secular-607-aec"><img src="img/13b-cronologia-607.png" alt="Destrucción de Jerusalén en 607 a.e.c. con la fecha secular como nota"></a><br><b>13b · 607 frente a 587/586.</b> La fecha TNM manda y la secular aparece como nota, con el razonamiento de los 70 años.</td>
</tr>
<tr>
<td><a href="pantallas-busqueda-y-estudio.md#14--recorrido-guiado-de-babilonia-a-jerusalén"><img src="img/14-recorrido-guiado.png" alt="Recorrido guiado del regreso de Babilonia a Jerusalén, parada 4 de 8"></a><br><b>14 · Recorrido guiado.</b> El regreso de 537 a.e.c. en ocho paradas, con cifras, lo que no sabemos y una pregunta de repaso.</td>
<td><a href="pantallas-busqueda-y-estudio.md#15--portada"><img src="img/15-portada.png" alt="Portada con búsqueda, épocas y recorridos"></a><br><b>15 · Portada.</b> Búsqueda, nueve épocas a escala real, recorridos y de dónde salen los datos.</td>
</tr>
<tr>
<td><a href="mockups/README.md"><img src="img/00-kit-demo.png" alt="Demostración del kit de maquetas: Pablo en Corinto en el otoño del 50"></a><br><b>00 · Demostración del kit.</b> La maqueta que prueba el kit: mapa, rutas, zona incierta, línea de tiempo y ficha.</td>
<td></td>
</tr>
</table>

## Documentos

| Documento | Qué contiene |
|---|---|
| [Catálogo de ideas](catalogo-de-ideas.md) | 159 ideas numeradas en 9 áreas (tiempo, mapa, grafo, fichas, búsqueda, aprendizaje, fuentes, móvil y contribución), cinco perfiles de estudiante, las 15 ideas del primer corte y la lista de hechos comprobados. |
| [Pantallas: mapa y tiempo](pantallas-mapa-y-tiempo.md) | Pantallas 01 a 06b. |
| [Pantallas: grafo y contexto](pantallas-grafo-y-contexto.md) | Pantallas 07 a 10. |
| [Pantallas: búsqueda y estudio](pantallas-busqueda-y-estudio.md) | Pantallas 11 a 15. |
| [Modelo de datos](modelo-de-datos.md) | Por qué Theographic no basta y nuestro modelo: aristas con fecha, fechas ancladas y narrativas, candidatos de ubicación, cartas con dos extremos y ejemplos YAML. |
| [Grafo y relaciones: qué proponemos](grafo-y-relaciones.md) | Catorce propuestas medidas sobre `main`: vocabulario cerrado de relaciones, tabla de afirmaciones compilada, capítulo por tramos y notas privadas, con coste y prueba de cada una. |
| [Línea de tiempo: cinco diseños para elegir](linea-de-tiempo-disenos.md) | Qué falla en la línea de hoy, las seis reglas de un diseño nuevo y cinco [prototipos que funcionan](mockups/linea/README.md), comparados regla por regla, con capturas, lo que recomendamos y lo que queda por decidir. |
| [La portada: seis diseños para elegir](portada-disenos.md) | Seis prototipos de la portada que funcionan, con sus capturas, el veredicto de tres jueces regla por regla, las ideas por zona para mezclarlos y lo que recomendamos. |
| [Atrás y adelante: cinco sitios para elegir](atras-adelante.md) | Qué recorre hoy el Atrás del navegador y lo que sorprende, cinco sitios para un par de botones de atrás y adelante con su maqueta sobre el sitio de verdad, lo que comparten y lo que recomendamos. |
| [Homónimos: pares, forma y sitio](homonimos.md) | Los 86 pares de personas y los 146 de lugares que comparten nombre sin nombrarse en `distinct_from`, cómo cerrarlos y que no salgan más, si cada homónimo necesita su propia razón y sus fuentes, qué enseña hoy el sitio y lo que recomendamos. |
| [Atrás y adelante: lo que queda por decidir](atras-adelante-flecos.md) | Cinco preguntas tras los botones, medidas en un navegador real: «Volver al mapa» que empieza otra visita, el encuadre del mapa al volver, el recorrido que crea dos entradas, la marca que tras Atrás necesita dos clics y qué cuenta «3321 fuentes citadas» en la portada. Cada una con sus opciones y lo que recomendamos. |
| [Viajes: ocho decisiones del modelo](viajes-modelo.md) | Lo que dejaron abierto los 223 viajes: grupos y objetos que viajan, paradas deducidas, acompañantes, tramos largos, sucesos y paradas, viajes dobles, cinco dudas de datos y ocho lugares y viajes dudosos, con opciones por letras, cifras de los datos, dos capturas del mapa y lo que recomendamos. |
| [Viajes en la línea y en el mapa: cuatro preguntas](linea-viajes.md) | Los viajes de los demás viajeros como barras en su carril, una regla para los nombres de carril largos, qué pinta el mapa con Pablo elegido y cómo enseñar los viajes que se repiten cada año. Cada pregunta con sus opciones, una maqueta por opción sobre el sitio de verdad, su coste y lo que recomendamos. |
| [Ríos y lugares largos: dónde va su punto](rios.md) | El Éufrates encima de Tifsá, el punto del Tigris y la regla para ríos, mares y valles: cuatro, tres y tres opciones con maquetas sobre el sitio de verdad, lo que cuesta cada una y lo que recomendamos. |
| [Fuentes y proyectos](fuentes-y-proyectos.md) | Publicaciones de nivel 1 que enlazamos, términos de uso de jw.org, proyectos parecidos, datos abiertos, geografía antigua, imágenes con licencia y herramientas. |
| [Kit de maquetas](mockups/README.md) | Cómo crear y renderizar una maqueta: mapas base, proyección, componentes, [fuentes tipográficas](mockups/kit/fonts/) (EB Garamond, Inter y Noto Serif Hebrew, licencia OFL) y [créditos de las fotos](mockups/kit/photos/CREDITS.md). |
| [Datos de ejemplo](mockups/data/README.md) | Los JSON comprobados que usan las maquetas y el formato de fechas (años astronómicos: 1 a.e.c. = 0). |

## Decisiones tomadas

- **Un cursor de tiempo único** mueve el mapa, la línea de tiempo con zoom (de milenios a días) y el panel. La velocidad de reproducción se adapta al zoom.
- **Carriles por persona y por imperio** en la línea de tiempo. El mapa solo enseña lo vigente en la fecha y deja un rastro tenue de lo anterior.
- **Pablo en cada momento.** Al mover la línea se ve dónde estaba, dónde escribió cada carta, a quién iba y qué pasaba en la ciudad que escribe y en la que recibe.
- **Pulsar un punto del mapa** en la fecha elegida enseña qué pasó allí.
- **Navegación como grafo.** Una persona en el centro, su contexto alrededor y ramas nuevas en cada salto, filtradas por fecha.
- **Mapa antiguo y mapa actual** a un clic, o superpuestos con cortina. Un mapa solo moderno desorienta.
- **Cartografía propia.** Dibujamos nuestros mapas a partir de hechos (coordenadas, costas, relieve) con diseño propio. De jw.org solo enlazamos. Más adelante podemos pedir permiso para usar su material.
- **Incertidumbre visible.** Vidas que se difuminan donde no hay fechas, viajes en «tiempo narrativo» rotulado como aproximado y lugares inciertos como zonas o abanicos de candidatos.
- **Búsqueda por nodo y vecinos**, por capítulo («Hch 16») y por año («607 a.e.c.»).
- **Cronología TNM como principal.** La secular aparece como nota cuando difiere (607 frente a 587/586 a.e.c.). Internamente usamos años astronómicos (1 a.e.c. = 0).
- **Un YAML por entidad en git** (persona, lugar, suceso, viaje, periodo, hallazgo), con fuentes por niveles. Un paso de compilación genera JSON.
- **Sitio estático.** MapLibre GL, teselas propias, JSON en el navegador y ningún servidor.
- **Rutas por calzadas reales** con los datos de Itiner-e, y por mar cuando el texto lo dice.
- **Fotos.** No existen fotos de la época. Usamos objetos de museo y ruinas actuales con licencia libre y el crédito a la vista, y enlazamos a las ilustraciones de jw.org.
- **Theographic** sirve para arrancar el índice de nombres y versículos, no como modelo. Los datos abiertos de otros autores solo aportan hechos neutros, como coordenadas.
- **Primer corte.** Los viajes de Pablo (Hch 9-28) y sus cartas.

## Preguntas abiertas

Las respuestas a las preguntas de la primera ronda (permiso, licencia, coordenadas, nombres, límites, fechas, contribuciones) están en [decisiones](../decisiones.md). La construcción de v1 y v2 respondió tres más: los partos entran solo con lo que dice Perspicacia, el tope de 40 palabras por texto se queda y el orden es por rebanadas de relato. Estas son las que quedan:

- **¿Cómo sabremos dentro de un año qué ha cambiado en jw.org?** Cada hecho guarda la fecha de consulta y una búsqueda en WOL preparada, y [`scripts/review.py`](../../scripts/review.py) lista lo que lleva más de un año sin releer. Falta decidir si ese repaso lo hace una persona, o si un aviso automático abre un issue por cada hecho vencido. Cuando una publicación nueva cambia un dato, la ficha ya enseña el `history` plegado.
- **¿Dónde está Pablo el 15 de marzo del 48?** La Biblia da el orden de las paradas, no el día. Hoy el marcador se interpola entre paradas y se dibuja con halo discontinuo, «posición estimada». ¿Es honesto mostrar una posición que nadie afirma, o el marcador debe saltar de parada en parada y quedarse quieto entre fechas ancladas? Es la decisión que más condiciona la animación.
- **No podemos mostrar el texto bíblico.** La TNM no se puede copiar, así que cada versículo abre en wol.jw.org en otra pestaña, y la lectura «versículo a versículo» se hace con el pasaje en una ventana y el mapa en otra. ¿Pedimos permiso a la organización para incrustar el texto, o diseñamos la lectura a dos ventanas desde el principio, con el mapa siguiendo al capítulo que se lee?
- **¿Dibujamos fronteras de imperios?** Un polígono por año es caro, discutible y casi nunca lo da jw.org. La alternativa es una «esfera» difuminada con la lista de provincias que jw.org sí nombra, y fronteras solo en los años en que una publicación las describe. ¿Basta con eso para «quién mandaba aquí en tal año»?
- **¿Para qué dispositivo diseñamos el estudio en grupo?** Un portátil en la mesa, una tablet que pasa de mano en mano o el televisor con mando. Cada uno pide tamaños, gestos y navegación distintos, y el modo presentación solo tiene sentido en el tercero.

## Siguiente paso

v0, v1 y v2 están hechas, con los reyes, los recorridos guiados y el modo presentación. Lo que falta, las 50 ideas que quedaron fuera y las preguntas que decide el dueño están en la [hoja de ruta](../hoja-de-ruta.md#qué-queda). La siguiente rebanada sale de esa lista.
