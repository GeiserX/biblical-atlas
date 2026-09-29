# Catálogo de ideas: interfaz, experiencia, navegación y enlaces

Este documento reúne todas las ideas que tenemos para que biblical-earth sea fácil de usar y enseñe de verdad. No es un plan cerrado. Es el banco de ideas del que sacamos cada corte.

La aplicación tiene tres piezas: un **mapa**, una **línea de tiempo con zoom** y un **panel lateral**. Las tres obedecen a un único **cursor de tiempo**. Debajo hay un grafo: personas, lugares, hechos, viajes, cartas y hallazgos, unidos por relaciones con fecha y con fuente.

Cada idea lleva:

- **Qué ves y haces**: lo que aparece en pantalla y lo que el usuario toca, con un ejemplo bíblico real.
- **Por qué ayuda**: qué aprende el estudiante gracias a ella.
- **Coste**: S (días), M (una o dos semanas), L (más de un mes o dependencia de datos que aún no tenemos).
- **Prioridad**: *primer corte* (viajes de Pablo, Hch 9-28 y cartas), *después* o *quizá*.

Los ejemplos bíblicos se comprobaron en wol.jw.org. La lista de comprobaciones, con sus enlaces, está al final. Los textos de la Traducción del Nuevo Mundo (TNM) no se copian aquí ni en la aplicación: sólo referencias, resúmenes nuestros y el botón «Leer en wol.jw.org ↗».

## Índice

- [Para quién diseñamos](#para-quién-diseñamos)
- [Tres preguntas de prueba](#tres-preguntas-de-prueba)
- [1. Cursor y línea de tiempo (T)](#1-cursor-y-línea-de-tiempo-t)
- [2. Mapa (M)](#2-mapa-m)
- [3. Grafo (G)](#3-grafo-g)
- [4. Fichas y paneles (F)](#4-fichas-y-paneles-f)
- [5. Búsqueda y enlaces (B)](#5-búsqueda-y-enlaces-b)
- [6. Aprendizaje (A)](#6-aprendizaje-a)
- [7. Fuentes y confianza (C)](#7-fuentes-y-confianza-c)
- [8. Móvil, accesibilidad, idiomas, rendimiento, sin conexión e impresión (D)](#8-móvil-accesibilidad-idiomas-rendimiento-sin-conexión-e-impresión-d)
- [9. Contribución (P)](#9-contribución-p)
- [Las 15 ideas del primer corte](#las-15-ideas-del-primer-corte)
- [Diez principios de diseño](#diez-principios-de-diseño)
- [Hechos usados en los ejemplos y dónde los comprobamos](#hechos-usados-en-los-ejemplos-y-dónde-los-comprobamos)
- [Datos externos mencionados](#datos-externos-mencionados)

---

## Para quién diseñamos

| Perfil | Situación | Qué necesita en los primeros 10 segundos |
|---|---|---|
| **Quien empieza** | Lee Hechos por primera vez y no sabe dónde está Galacia. | Ver a Pablo moverse por un mapa que reconoce, con nombres antiguos y modernos. |
| **Quien prepara** | Prepara un discurso o la lectura de la semana. | Llegar a «Hch 18» en un paso, entender el contexto y copiar una referencia limpia. |
| **Un joven** | Aprende mejor tocando y probando. | Arrastrar el tiempo, ver qué cambia y ponerse a prueba. |
| **Varias personas ante una pantalla** | Estudian juntas frente a una pantalla grande. | Letra grande, un recorrido guiado y preguntas para cada edad. |
| **En el móvil, en la reunión** | Una mano, poca luz, sin sonido, quizá sin cobertura. | Buscar un capítulo y ver el mapa sin distracciones ni carga lenta. |

Cada idea de este catálogo debe servir a al menos uno de estos perfiles. Si no sirve a ninguno, sobra.

---

## Tres preguntas de prueba

La interfaz está bien diseñada si estas tres preguntas se responden sin leer una ayuda. Así se ve la respuesta en pantalla.

### «¿Qué pasaba en Babilonia en tiempos de Jesús?»

1. El usuario escribe «Babilonia» o pulsa la ciudad en el mapa.
2. El cursor está en 29-33 e. c. (ministerio de Jesús). El panel muestra **Babilonia en 30 e. c.**:
   - Gobierna el Imperio parto. Controla Babilonia desde mediados del siglo II a. e. c.
   - La ciudad existe, venida a menos. Tiene una comunidad judía.
   - El templo de Bel sigue en pie (hay inscripciones de hasta 75 e. c.).
   - En Pentecostés de 33 e. c. hay en Jerusalén partos, medos, elamitas y habitantes de Mesopotamia (Hch 2:9).
   - Unos 30 años después, Pedro escribe su primera carta desde Babilonia (1 Pe 5:13; c. 62-64 e. c.).
3. En el mapa, la frontera entre Roma y Partia aparece como tinte de fondo. Babilonia queda del lado parto.
4. Un botón «Babilonia a lo largo de los siglos» abre la tira de la ciudad desde Nabucodonosor hasta sus ruinas.

### «¿Quién había en Israel en la época de los medos y persas?»

1. El usuario escribe «Imperio persa» o arrastra el cursor hasta 539 a. e. c.
2. La línea de tiempo resalta el periodo medopersa. El mapa pinta el imperio.
3. El panel «Ahora mismo» lista por carriles:
   - **Judá**: regreso en 537 a. e. c.; Zorobabel, gobernador de Judá, y el sumo sacerdote Josué (Ag 1:1, 520 a. e. c.); los profetas Ageo y Zacarías (520-518 a. e. c.).
   - **Más tarde en Judá**: Esdras regresa en el reinado de Artajerjes (Esd 7:1); los muros se reconstruyen en 455 a. e. c.; Nehemías y Malaquías (después de 443 a. e. c.).
   - **En la capital persa**: Daniel en Babilonia (hasta c. 536 a. e. c.); Ester y Mardoqueo en Susa; Nehemías, en Susa en el año 20 de Artajerjes (Ne 1:1).
4. Al pasar el cursor por cada nombre, el mapa marca dónde estaba esa persona en esa fecha.

### «¿Dónde estaba Pablo en tal año, dónde escribió cada carta y qué pasaba en la ciudad destinataria?»

1. El usuario pone el cursor en 50 e. c.
2. El mapa muestra a Pablo en Corinto (segundo viaje, c. 49-52 e. c.). Una flecha sale de Corinto hacia Tesalónica: **1 Tesalonicenses, c. 50 e. c.**
3. La ficha de la carta tiene dos columnas: **Corinto en 50 e. c.** y **Tesalónica en 50 e. c.** Cada una resume qué pasaba allí y cómo había sido la visita de Pablo (Hch 17:1-9; 18:1-11).
4. Al avanzar a 51-52 e. c. aparece el procónsul Galión (Hch 18:12) y el hallazgo de Delfos que ayuda a fecharlo.

---

## 1. Cursor y línea de tiempo (T)

La referencia que vimos pone una banda de episodios («Creación», «Diluvio»…) encima de un deslizador sin nombres. Son dos líneas de tiempo para una sola cosa. Queremos **una sola línea** que cambia de nivel de detalle con el zoom.

```
 ZOOM: MILENIOS ───────────────────────────────────────────────────────────────────────
 │ Patriarcas │   Egipto y éxodo   │  Jueces  │ Reino │ Exilio │ Persia │ Grecia │ Roma │
 ─────────────────────────────────────────────────────────────────────────────▲─────────
                                                                         cursor 50 e. c.
 ZOOM: DÉCADAS (mismo carril, se abre en episodios) ────────────────────────────────────
 │ 33 Pentecostés │ Conversión de Saulo │ 1.er viaje │ Hch 15 │ 2.º viaje │ 3.er viaje │
 ────────────────────────────────────────────────────────────────▲──────────────────────
 ZOOM: MESES (el episodio se abre en eventos) ──────────────────────────────────────────
 │ Filipos · Tesalónica · Berea · Atenas │ Corinto: 1 año y 6 meses (Hch 18:11) ▒▒▒▒▒ │
 │                                        │  ✉ 1 Tes (c. 50)   ✉ 2 Tes (c. 51)        │
 ────────────────────────────────────────────────▲──────────────────────────────────────
                                   ▒ = fecha aproximada   ✉ = carta escrita aquí
```

#### T-01 · Un solo cursor de tiempo
- **Qué ves y haces:** una línea vertical cruza la línea de tiempo. Al arrastrarla, el mapa, el grafo y el panel cambian a la vez. Si la pones en 539 a. e. c., el mapa pinta el Imperio medopersa y el panel dice «Babilonia cae ante Ciro».
- **Por qué ayuda:** una sola fecha gobierna todo. El estudiante nunca ve un mapa de un siglo y un texto de otro.
- **Coste:** M · **Prioridad:** primer corte

#### T-02 · Niveles era → periodo → episodio → evento
- **Qué ves y haces:** con zoom lejano ves eras con nombre. Al acercarte, cada era se abre en episodios y cada episodio en eventos, **en el mismo carril**. «Roma» se abre en «Segundo viaje de Pablo», que se abre en «Filipos», «Tesalónica», «Berea»…
- **Por qué ayuda:** resuelve la banda duplicada. Los nombres están siempre donde está el tiempo.
- **Coste:** M · **Prioridad:** primer corte

#### T-03 · Etiquetas que nunca se pisan
- **Qué ves y haces:** si dos etiquetas no caben, la menos importante se oculta y deja un punto. Al acercarte, aparece. Nunca hay texto encima de texto.
- **Por qué ayuda:** la línea se lee a cualquier zoom.
- **Coste:** S · **Prioridad:** primer corte

#### T-04 · Minimapa temporal
- **Qué ves y haces:** una tira fina en la parte inferior con toda la historia bíblica. Un rectángulo marca el tramo visible. Si estás en los meses de Corinto, la tira te recuerda que estás en el siglo I e. c.
- **Por qué ayuda:** evita perderse al hacer zoom. Siempre sabes «en qué parte de la Biblia estoy».
- **Coste:** S · **Prioridad:** primer corte

#### T-05 · Densidad de hechos
- **Qué ves y haces:** bajo el eje, un histograma suave muestra cuántos hechos fechados tenemos por año. El periodo entre Malaquías y Mateo aparece casi vacío; Hechos 13-28, denso.
- **Por qué ayuda:** el estudiante ve dónde la Biblia da mucho detalle y dónde poco. Guía la exploración.
- **Coste:** S · **Prioridad:** después

#### T-06 · Carriles por persona
- **Qué ves y haces:** cada persona importante tiene un carril con su vida. Pablo, Bernabé, Silas, Timoteo y Lucas van en paralelo. Donde viajan juntos, los carriles se unen con una banda.
- **Por qué ayuda:** «¿quién estaba con Pablo en Filipos?» se ve sin leer.
- **Coste:** M · **Prioridad:** primer corte

#### T-07 · Carriles por imperio y gobernante
- **Qué ves y haces:** sobre los carriles de personas, un carril fijo dice qué imperio y qué gobernante mandaba. En 50 e. c. se lee «Roma · Claudio». Pulsar «Claudio» enlaza con Hch 18:2 (expulsión de los judíos de Roma).
- **Por qué ayuda:** conecta el relato bíblico con el poder político del momento.
- **Coste:** M · **Prioridad:** primer corte

#### T-08 · Fijar carriles para comparar
- **Qué ves y haces:** un alfiler en cada carril lo mantiene visible aunque cambies de búsqueda. Fijas Daniel y Ezequiel y ves que ambos están en Babilonia en los mismos años.
- **Por qué ayuda:** la sincronía entre personas es la pregunta más difícil de responder con un libro.
- **Coste:** S · **Prioridad:** después

#### T-09 · Panel «Ahora mismo»
- **Qué ves y haces:** una lista corta de todo lo vigente en la fecha del cursor, agrupada: gobernantes, personas activas, viajes en curso, cartas escritas ese año. En 50 e. c.: Claudio; Pablo, Silas y Timoteo en Corinto; 1 Tesalonicenses.
- **Por qué ayuda:** responde «¿qué pasa ahora?» sin tener que mirar el mapa entero.
- **Coste:** S · **Prioridad:** primer corte

#### T-10 · Reproducción con velocidad según el zoom
- **Qué ves y haces:** un botón ▶ avanza el cursor. Con zoom de siglos avanza 10 años por segundo; con zoom de meses, una semana por segundo. Un selector ofrece ½×, 1×, 2×.
- **Por qué ayuda:** ver moverse los viajes fija el orden en la memoria.
- **Coste:** S · **Prioridad:** primer corte

#### T-11 · Pausa automática en los eventos
- **Qué ves y haces:** durante la reproducción, el cursor se detiene un segundo en cada evento del foco y lo resalta. Al llegar a Pafos se detiene: «Sergio Paulo escucha; Elimas se opone (Hch 13:6-12)».
- **Por qué ayuda:** la animación no pasa por encima de lo importante.
- **Coste:** S · **Prioridad:** primer corte

#### T-12 · Bucle entre dos marcas
- **Qué ves y haces:** marcas un inicio y un fin (por ejemplo, el primer viaje, c. 47-48 e. c.) y la reproducción se repite en bucle.
- **Por qué ayuda:** sirve para enseñar un tramo en una clase sin tocar nada.
- **Coste:** S · **Prioridad:** después

#### T-13 · Saltar al evento siguiente, no al año siguiente
- **Qué ves y haces:** las teclas ← y → (o dos botones) saltan al evento anterior o siguiente de la persona o el viaje seleccionado. De Filipos a Tesalónica en un toque.
- **Por qué ayuda:** evita arrastrar el cursor por años vacíos.
- **Coste:** S · **Prioridad:** primer corte

#### T-14 · Marcadores de fecha
- **Qué ves y haces:** una estrella guarda la fecha y la vista actual. Aparece como un pequeño triángulo sobre la línea. «607 a. e. c.», «537 a. e. c.», «Corinto, 51 e. c.».
- **Por qué ayuda:** quien prepara un discurso vuelve a sus puntos sin buscarlos.
- **Coste:** S · **Prioridad:** después

#### T-15 · Regla temporal
- **Qué ves y haces:** arrastras entre dos fechas y aparece la distancia. De 607 a 537 a. e. c. marca 70 años. De la división del reino (997 a. e. c.) a la caída de Jerusalén (607 a. e. c.), 390 años.
- **Por qué ayuda:** los periodos proféticos y los intervalos se entienden al verlos.
- **Coste:** S · **Prioridad:** después
- **Nota técnica:** la regla usa la numeración astronómica interna (1 a. e. c. = 0), así que el cruce entre eras no suma un año de más.

#### T-16 · Fechas aproximadas como degradado
- **Qué ves y haces:** un evento con fecha «c.» se dibuja con los bordes difuminados. Uno con «a.» (antes de) se difumina hacia atrás. Uno con «d.» (después de), hacia delante. La tabla de libros de la TNM usa estas tres marcas.
- **Por qué ayuda:** la precisión se ve, no hay que leerla.
- **Coste:** S · **Prioridad:** primer corte

#### T-17 · Tiempo narrativo etiquetado
- **Qué ves y haces:** un tramo con orden conocido pero sin fechas exactas se dibuja rayado y dice «orden seguro, fechas aproximadas». Filipos → Anfípolis → Apolonia → Tesalónica (Hch 16:12; 17:1) tiene orden, no días.
- **Por qué ayuda:** el estudiante no confunde una animación con una cronología exacta.
- **Coste:** S · **Prioridad:** primer corte

#### T-18 · Edad en la fecha, si la Biblia la da
- **Qué ves y haces:** junto al nombre aparece la edad sólo cuando hay base. En 539 a. e. c.: «Darío el medo, unos 62 años (Dan 5:31)». Sin base, no hay número.
- **Por qué ayuda:** humaniza a las personas sin inventar.
- **Coste:** S · **Prioridad:** después

#### T-19 · Meses hebreos cuando el texto los da
- **Qué ves y haces:** al acercar el zoom a un año, bajo los meses aparecen los nombres hebreos. Ne 1:1 sitúa a Nehemías en Susa en el mes de kislev del año 20. Un segundo clic muestra la equivalencia aproximada.
- **Por qué ayuda:** el estudiante ve las fechas con los meses que usa el propio texto.
- **Coste:** M · **Prioridad:** quizá

#### T-20 · Escribir la fecha
- **Qué ves y haces:** pulsas en la fecha del cursor y escribes «607 a», «51», «c. 50». El cursor salta.
- **Por qué ayuda:** es más rápido que arrastrar, sobre todo en móvil.
- **Coste:** S · **Prioridad:** primer corte

#### T-21 · Tramos vacíos plegables
- **Qué ves y haces:** un botón pliega los años sin datos del foco actual y los marca con «≈ 14 años sin datos». La escala deja de ser lineal y lo dice.
- **Por qué ayuda:** en una vida larga, lo importante no queda aplastado.
- **Coste:** M · **Prioridad:** quizá

#### T-22 · Línea de tiempo vertical en móvil
- **Qué ves y haces:** en pantalla estrecha, la línea gira a vertical en el borde derecho. El pulgar la desliza arriba y abajo.
- **Por qué ayuda:** el pulgar llega con una mano y el mapa conserva el ancho.
- **Coste:** M · **Prioridad:** después

#### T-23 · Contexto del cursor en una frase
- **Qué ves y haces:** junto al cursor, una frase generada de los datos: «51 e. c. · Roma bajo Claudio · Pablo en Corinto · Galión, procónsul de Acaya».
- **Por qué ayuda:** con un vistazo sabes dónde estás en la historia.
- **Coste:** S · **Prioridad:** primer corte

---

## 2. Mapa (M)

El mapa sólo muestra lo vigente en la fecha del cursor. Lo pasado queda como rastro tenue. Lo incierto se dibuja como zona o como abanico de candidatos, nunca como un punto exacto. Los mapas son nuestros: dibujados con datos abiertos de coordenadas, costas y relieve. De jw.org sólo enlazamos.

```
 ┌──────────────────────────────────────────────── [ Antiguo | Actual | Cortina ] ─┐
 │                MACEDONIA                                                          │
 │      Filipos ●━━━━● Anfípolis ━━● Apolonia ━━● Tesalónica    ··· rastro 49 e. c.  │
 │                                              ╲                                    │
 │                                               ● Berea                             │
 │                     ACAYA                        ╲ (mar)                          │
 │                    Atenas ●  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─╯                               │
 │                 ◉ Corinto   ✉ → Tesalónica  (1 Tes, c. 50)                        │
 │    ━━ calzada   ─ ─ mar   ◉ Pablo ahora   ● ya visitado   ░ zona incierta         │
 │  ┌ escala ───────┐                                                                │
 │  0    100 km     │  a pie ≈ días (ritmo supuesto, editable)                        │
 └───────────────────────────────────────────────────────────────────────────────────┘
```

#### M-01 · Conmutador antiguo / actual
- **Qué ves y haces:** tres botones arriba: **Antiguo** (nombres, provincias y costas de la época), **Actual** (nombres y fronteras de hoy), **Cortina**. Cambian en un clic y conservan el encuadre.
- **Por qué ayuda:** un mapa sólo moderno desorienta; uno sólo antiguo no dice dónde queda hoy.
- **Coste:** M · **Prioridad:** primer corte

#### M-02 · Cortina
- **Qué ves y haces:** una barra vertical que arrastras sobre el mapa. A la izquierda, el mapa antiguo; a la derecha, el actual. Pasas la barra sobre Galacia y ves qué parte de la Turquía actual ocupaba.
- **Por qué ayuda:** relaciona los dos mundos en el mismo sitio de la pantalla.
- **Coste:** M · **Prioridad:** primer corte

#### M-03 · Etiqueta doble
- **Qué ves y haces:** en el mapa antiguo, bajo «Tesalónica» aparece en gris pequeño «hoy Salónica, Grecia». En el actual, al revés. Se puede apagar.
- **Por qué ayuda:** el estudiante que ha oído el nombre moderno encuentra el antiguo.
- **Coste:** S · **Prioridad:** primer corte

#### M-04 · Fronteras que cambian con la fecha
- **Qué ves y haces:** las provincias y los reinos cambian con el cursor. Acaya fue provincia senatorial entre 27 a. e. c. y 15 e. c., y otra vez desde 44 e. c. Al mover el cursor por esos años, la etiqueta de su régimen cambia.
- **Por qué ayuda:** explica por qué Lucas dice «procónsul» en Hch 18:12 y por qué ese detalle es exacto.
- **Coste:** L · **Prioridad:** después

#### M-05 · Imperio vigente como tinte de fondo
- **Qué ves y haces:** cada imperio tiene un tinte suave. En 30 e. c. el mundo romano y el parto tienen tintes distintos. Babilonia queda en el lado parto.
- **Por qué ayuda:** responde de un vistazo «¿quién mandaba aquí entonces?».
- **Coste:** M · **Prioridad:** después

#### M-06 · Costas antiguas con su incertidumbre
- **Qué ves y haces:** hoy las ruinas de Éfeso están a varios kilómetros del mar. Hay dos hipótesis sobre su costa antigua: un golfo que llegaba a la ciudad o una costa a unos 6,5 km. El mapa dibuja ambas líneas, una continua y otra discontinua, con su fuente.
- **Por qué ayuda:** la geografía de la época no es la de hoy, y la duda se ve.
- **Coste:** L · **Prioridad:** después

#### M-07 · Relieve sobrio
- **Qué ves y haces:** un sombreado de relieve suave, sin colores de satélite. Las montañas del Tauro se notan; las calzadas las rodean.
- **Por qué ayuda:** explica por qué las rutas van por donde van.
- **Coste:** M · **Prioridad:** primer corte

#### M-08 · Rutas por calzadas reales y por mar
- **Qué ves y haces:** los viajes siguen calzadas romanas (datos de Itiner-e) y rutas marítimas, no líneas rectas. Filipos → Anfípolis → Apolonia → Tesalónica sigue la calzada. Los tramos por mar van con línea discontinua.
- **Por qué ayuda:** el recorrido es creíble y las distancias son reales.
- **Coste:** M · **Prioridad:** primer corte

#### M-09 · Rastro tenue del pasado
- **Qué ves y haces:** lo ya recorrido queda en gris claro; lo que está pasando, en color. Al llegar Pablo a Corinto, el rastro de Macedonia sigue visible y tenue.
- **Por qué ayuda:** el mapa cuenta el orden sin texto.
- **Coste:** S · **Prioridad:** primer corte

#### M-10 · Incertidumbre como zona
- **Qué ves y haces:** un lugar de ubicación dudosa se dibuja como mancha difusa, con un texto «ubicación incierta» y un botón «ver por qué». No hay punto.
- **Por qué ayuda:** corrige el error que vimos en la referencia (un punto exacto para lugares que nadie puede situar).
- **Coste:** S · **Prioridad:** primer corte

#### M-11 · Abanico de candidatos
- **Qué ves y haces:** si hay varios lugares posibles, se dibujan todos, unidos por un arco fino, cada uno con su base documental. Gálatas se escribió en «Corinto o Antioquía de Siria» según la tabla de libros de la TNM: dos puntos, un arco y la referencia.
- **Por qué ayuda:** el estudiante ve la duda real, no una elección oculta.
- **Coste:** S · **Prioridad:** primer corte

#### M-12 · Pulsar un punto: «¿qué pasó aquí en esta fecha?»
- **Qué ves y haces:** pulsas Filipos con el cursor en 49-50 e. c. y el panel muestra: Lidia escucha y se bautiza (Hch 16:14, 15); Pablo y Silas en la prisión; el carcelero y su casa se bautizan (Hch 16:23-34).
- **Por qué ayuda:** el estudiante llega al relato desde el mapa, sin saber antes qué capítulo buscar.
- **Coste:** S · **Prioridad:** primer corte

#### M-13 · Vacío honesto
- **Qué ves y haces:** si pulsas un lugar sin datos en esa fecha, el panel dice «Nada registrado aquí en 51 e. c.» y ofrece «lo más cercano en el tiempo» y «lo más cercano en el mapa».
- **Por qué ayuda:** el silencio también informa, y el usuario no se queda sin salida.
- **Coste:** S · **Prioridad:** primer corte

#### M-14 · Etiquetas por importancia
- **Qué ves y haces:** con zoom lejano sólo se leen capitales y lugares del foco. Al acercarte aparecen los demás. El lugar seleccionado siempre se lee.
- **Por qué ayuda:** el mapa nunca se llena de texto ilegible.
- **Coste:** S · **Prioridad:** primer corte

#### M-15 · Agrupación de puntos cercanos
- **Qué ves y haces:** varios lugares juntos se agrupan en un círculo con un número. Pulsarlo acerca el zoom.
- **Por qué ayuda:** evita puntos amontonados en Judea o en Asia Menor.
- **Coste:** S · **Prioridad:** primer corte

#### M-16 · Mapa de situación
- **Qué ves y haces:** en una esquina, un mapa pequeño del mundo bíblico con un recuadro que marca el encuadre actual. Si estás muy cerca de Listra, el recuadro te dice que estás en el centro de Asia Menor.
- **Por qué ayuda:** evita perderse con el zoom.
- **Coste:** S · **Prioridad:** después

#### M-17 · Encuadre automático
- **Qué ves y haces:** al seleccionar una persona o un viaje, el mapa se mueve para mostrar todos sus lugares a la vez. Si seleccionas «tercer viaje», ves de Antioquía de Siria a Éfeso, Macedonia y Jerusalén.
- **Por qué ayuda:** el usuario no tiene que buscar dónde ocurre.
- **Coste:** S · **Prioridad:** primer corte

#### M-18 · Escala de distancias y días de viaje
- **Qué ves y haces:** una escala en km y, debajo, una estimación en días a pie o en barco. El ritmo es un supuesto visible y editable, no un dato bíblico. Donde la Biblia o Perspicacia dan duración, se muestra esa: el regreso de Babilonia a Jerusalén en 537 a. e. c. fue un viaje de unos cuatro meses.
- **Por qué ayuda:** el estudiante siente el esfuerzo de cada viaje.
- **Coste:** M · **Prioridad:** después

#### M-19 · Regla entre dos lugares
- **Qué ves y haces:** marcas dos lugares y ves la distancia por ruta real y en línea recta. Babilonia → Jerusalén por la ruta del Creciente Fértil, no a través del desierto.
- **Por qué ayuda:** explica por qué las rutas antiguas daban rodeos.
- **Coste:** M · **Prioridad:** después

#### M-20 · Capas activables
- **Qué ves y haces:** un menú de capas: personas, congregaciones, hallazgos, calzadas, fronteras, relieve, nombres modernos. Cada una con una casilla.
- **Por qué ayuda:** cada usuario ve lo que necesita y nada más.
- **Coste:** S · **Prioridad:** primer corte

#### M-21 · Temporada de navegación
- **Qué ves y haces:** en el viaje a Roma, una capa marca los meses peligrosos para navegar. Hch 27:9 dice que ya era peligroso porque había pasado el ayuno del Día de Expiación. El tramo aparece en naranja con esa referencia.
- **Por qué ayuda:** conecta el relato del naufragio (Hch 27; 28:1, Malta) con la realidad del mar.
- **Coste:** M · **Prioridad:** después

#### M-22 · Perfil de altitud de una ruta
- **Qué ves y haces:** bajo el mapa, un perfil de subidas y bajadas del tramo seleccionado.
- **Por qué ayuda:** se ve la dificultad física de cruzar montañas a pie.
- **Coste:** M · **Prioridad:** quizá

#### M-23 · Ríos y mares con nombre de época
- **Qué ves y haces:** el Éufrates, el Tigris, el Gran Mar (Mediterráneo) con nombre antiguo y moderno.
- **Por qué ayuda:** muchas ciudades se entienden por su río.
- **Coste:** S · **Prioridad:** después

#### M-24 · Vista inclinada suave
- **Qué ves y haces:** un botón inclina el mapa unos grados para ver el relieve en perspectiva. Siempre se puede volver a la vista plana.
- **Por qué ayuda:** ayuda a entender valles y pasos de montaña.
- **Coste:** M · **Prioridad:** quizá

---

## 3. Grafo (G)

Todo es un grafo. La forma de mostrarlo es la clave: el usuario nunca ve el grafo entero. Ve una **vista centrada** en una persona, un lugar o una carta, filtrada por la fecha del cursor, y salta de nodo en nodo.

```
                          ┌───────────────────── 50 e. c. ─────────────────────┐
                          │          LUGARES                                    │
                          │   Tesalónica ○        ○ Corinto (ahora)             │
                          │            ╲          ╱                              │
                          │ PERSONAS    ╲        ╱         HECHOS                │
                          │  Silas ○──── ( PABLO ) ────○ 1 Tesalonicenses        │
                          │ Timoteo ○───╱   │   ╲────○ Aquila y Priscila         │
                          │                 │                (Hch 18:2)          │
                          │          ○ Claudio expulsa a los judíos de Roma      │
                          │   + 14 más (agrupados: compañeros, autoridades…)     │
                          │  ◀ Atrás: Timoteo   ·   Camino: Timoteo → Loida      │
                          └─────────────────────────────────────────────────────┘
```

#### G-01 · Vista centrada, tipo red social
- **Qué ves y haces:** una persona en el centro y, alrededor, sus conexiones en esa fecha. Pulsas cualquier nodo y pasa al centro. Aparecen ramas nuevas.
- **Por qué ayuda:** el estudiante explora por curiosidad, un salto cada vez, sin perderse.
- **Coste:** M · **Prioridad:** primer corte

#### G-02 · Anillos o sectores por tipo
- **Qué ves y haces:** personas a la izquierda, lugares arriba, hechos a la derecha, cartas abajo. Siempre en la misma posición.
- **Por qué ayuda:** el ojo aprende dónde buscar cada tipo.
- **Coste:** S · **Prioridad:** primer corte

#### G-03 · Ramas que dependen de la fecha
- **Qué ves y haces:** al mover el cursor, las conexiones que aún no existen desaparecen y las nuevas aparecen con una animación corta. Timoteo se conecta con Pablo a partir de Hch 16:1-3, no antes.
- **Por qué ayuda:** el grafo enseña en qué orden se forman las relaciones.
- **Coste:** M · **Prioridad:** primer corte

#### G-04 · Historial de saltos
- **Qué ves y haces:** una fila de migas arriba: «Pablo › Timoteo › Eunice». Pulsas una y vuelves.
- **Por qué ayuda:** explorar sin miedo a perder el hilo.
- **Coste:** S · **Prioridad:** primer corte

#### G-05 · Camino entre dos nodos
- **Qué ves y haces:** escribes dos nombres y ves el camino más corto con cada relación y su texto. «Timoteo → hijo de → Eunice → hija de → Loida» (2 Tim 1:5; Hch 16:1).
- **Por qué ayuda:** responde «¿cómo se relaciona X con Y?» con pruebas.
- **Coste:** M · **Prioridad:** después

#### G-06 · Cada arista lleva verbo, fecha y referencia
- **Qué ves y haces:** al pasar sobre una línea, se lee «viajó con · c. 49-52 e. c. · Hch 16:1-3». No hay líneas sin explicación.
- **Por qué ayuda:** una línea sin fuente enseña poco; con fuente, enseña y se comprueba.
- **Coste:** S · **Prioridad:** primer corte

#### G-07 · Límite de vecinos y grupos
- **Qué ves y haces:** como mucho unos 12 vecinos a la vista. El resto se agrupa en burbujas por rol: «+ 9 compañeros», «+ 4 autoridades». Pulsar una burbuja la abre.
- **Por qué ayuda:** evita el grafo ilegible con cientos de nodos.
- **Coste:** S · **Prioridad:** primer corte

#### G-08 · Genealogías como árbol, no como red
- **Qué ves y haces:** las relaciones familiares se dibujan en árbol ordenado por generación, con la fecha a un lado. Loida arriba, Eunice en medio, Timoteo abajo.
- **Por qué ayuda:** un árbol se lee de arriba abajo; una red, no.
- **Coste:** M · **Prioridad:** después

#### G-09 · Grafo de cartas sobre el mapa
- **Qué ves y haces:** cada carta es una flecha curva de la ciudad de origen a la de destino, con su fecha. Desde Roma salen Efesios, Filipenses, Colosenses y Filemón (c. 60-61 e. c.). Desde Corinto, 1 y 2 Tesalonicenses y Romanos.
- **Por qué ayuda:** el estudiante ve la red de congregaciones que sostenían las cartas.
- **Coste:** M · **Prioridad:** primer corte

#### G-10 · Portadores de cartas
- **Qué ves y haces:** si el texto dice quién llevó la carta, la flecha lleva su nombre. Tíquico y Onésimo van a Colosas (Col 4:7-9).
- **Por qué ayuda:** las cartas se entienden como viajes de personas reales.
- **Coste:** S · **Prioridad:** después

#### G-11 · Lugares con dimensión de tiempo
- **Qué ves y haces:** «Babilonia» es un solo nodo, pero su ficha y sus conexiones cambian con el cursor. En 539 a. e. c. se conecta con Belsasar, Daniel y Ciro. En 62 e. c., con Pedro (1 Pe 5:13).
- **Por qué ayuda:** evita confundir «Babilonia la capital imperial» con «Babilonia bajo los partos».
- **Coste:** M · **Prioridad:** primer corte

#### G-12 · Personas con el mismo nombre
- **Qué ves y haces:** cuando un nombre corresponde a varias personas, la búsqueda las separa con un subtítulo. «Darío el medo», «Darío (rey persa)», y así cada uno. El grafo nunca las mezcla.
- **Por qué ayuda:** evita un error común de estudio. La Biblia aplica el nombre Darío a tres reyes.
- **Coste:** S · **Prioridad:** primer corte

#### G-13 · Profecía y cumplimiento
- **Qué ves y haces:** una arista especial une una profecía con su cumplimiento, cada uno con su fecha. Isa 45:1 (Ciro nombrado) → caída de Babilonia en 539 a. e. c. La línea cruza la línea de tiempo y muestra los años entre ambas.
- **Por qué ayuda:** el estudiante ve la distancia en el tiempo entre anuncio y cumplimiento.
- **Coste:** M · **Prioridad:** después

#### G-14 · Fuerza de la relación
- **Qué ves y haces:** línea continua si el texto lo dice. Discontinua si se deduce (por ejemplo, dos personas en la misma ciudad el mismo año sin que el texto diga que se conocieron).
- **Por qué ayuda:** separa lo que dice la Biblia de lo que deducimos.
- **Coste:** S · **Prioridad:** primer corte

#### G-15 · Dos vistas centradas lado a lado
- **Qué ves y haces:** divides la pantalla y pones a Pablo y a Pedro en 50 e. c. Las conexiones compartidas (Jerusalén, Hch 15) se resaltan en ambos.
- **Por qué ayuda:** comparar dos vidas en la misma fecha.
- **Coste:** M · **Prioridad:** quizá

#### G-16 · El grafo como lista
- **Qué ves y haces:** un botón convierte la vista en una lista agrupada por tipo, con las mismas conexiones y referencias.
- **Por qué ayuda:** en el móvil y con lector de pantalla, una lista funciona mejor.
- **Coste:** S · **Prioridad:** primer corte

#### G-17 · Resaltar en el mapa lo que tocas en el grafo
- **Qué ves y haces:** al pasar sobre un nodo de lugar en el grafo, el lugar parpadea en el mapa. Al pasar sobre una persona, su punto actual se resalta.
- **Por qué ayuda:** el grafo y el mapa son la misma información vista de dos formas.
- **Coste:** S · **Prioridad:** primer corte

#### G-18 · Exportar un subgrafo
- **Qué ves y haces:** «Exportar» guarda la vista centrada como imagen o como lista de referencias.
- **Por qué ayuda:** quien prepara una clase se lleva el esquema.
- **Coste:** S · **Prioridad:** quizá

#### G-19 · Congregaciones como nodos
- **Qué ves y haces:** cada congregación tiene su nodo, con fecha de fundación si se conoce, personas conocidas y cartas recibidas. Filipos: Lidia, el carcelero, Filipenses.
- **Por qué ayuda:** el destinatario de una carta deja de ser un nombre abstracto.
- **Coste:** S · **Prioridad:** primer corte

---

## 4. Fichas y paneles (F)

El panel lateral muestra fichas. Una ficha tiene tres alturas: **tarjeta** (al pasar el ratón), **panel** (al seleccionar) y **página** (al abrir a pantalla completa, con enlace propio).

```
 ┌─ CARTA · 1 Tesalonicenses ────────────────────────────── c. 50 e. c. ─┐
 │  Escritor: Pablo (con Silvano y Timoteo)      [Leer en wol.jw.org ↗] │
 │ ┌─ ORIGEN: Corinto en 50 e. c. ──────┐ ┌─ DESTINO: Tesalónica ───────┐│
 │ │ Pablo lleva unos meses aquí        │ │ Congregación joven.         ││
 │ │ (1 año y 6 meses en total,         │ │ Pablo tuvo que salir de     ││
 │ │ Hch 18:11). Trabaja con Aquila y   │ │ noche tras la oposición     ││
 │ │ Priscila, llegados de Roma por la  │ │ (Hch 17:5-10).              ││
 │ │ orden de Claudio (Hch 18:2).       │ │                             ││
 │ │ Provincia de Acaya.                │ │ Provincia de Macedonia.     ││
 │ └────────────────────────────────────┘ └─────────────────────────────┘│
 │  Mientras tanto: Roma · emperador Claudio (Hch 18:2)                  │
 │  Fuentes: [N1] Tabla de libros TNM · [N1] Hch 17-18 · [N2] mapas      │
 └───────────────────────────────────────────────────────────────────────┘
```

#### F-01 · Ficha de persona
- **Qué ves y haces:** nombre, significado si Perspicacia lo da, una barra de vida que se difumina donde no hay fechas, lugares por orden, relaciones principales y referencias. Timoteo: Listra, padre griego y madre judía creyente (Hch 16:1), madre Eunice y abuela Loida (2 Tim 1:5).
- **Por qué ayuda:** todo lo esencial de una persona en una pantalla.
- **Coste:** M · **Prioridad:** primer corte

#### F-02 · Ficha de lugar a lo largo de los siglos
- **Qué ves y haces:** una tira horizontal con la historia del lugar. Babilonia: cae ante Ciro el 5 de octubre de 539 a. e. c. (calendario gregoriano) → Alejandro Magno la toma en 331 a. e. c. → muere allí en 323 a. e. c. → Seleuco Nicátor la conquista en 312 a. e. c. y se lleva materiales para construir Seleucia → los partos la controlan desde mediados del siglo II a. e. c. → comunidad judía; Pedro escribe desde allí (1 Pe 5:13) → el templo de Bel sigue en 75 e. c. → en ruinas en el siglo IV e. c.
- **Por qué ayuda:** un lugar no es una foto fija. El estudiante ve su declive.
- **Coste:** M · **Prioridad:** después

#### F-03 · Ficha de lugar en una fecha
- **Qué ves y haces:** la misma ficha, filtrada por el cursor. «Babilonia en 30 e. c.»: quién gobierna, qué personas bíblicas hay, qué hallazgos son de esa época.
- **Por qué ayuda:** responde directamente «¿qué pasaba en X en tal fecha?».
- **Coste:** S · **Prioridad:** primer corte

#### F-04 · Ficha de carta con los dos extremos
- **Qué ves y haces:** dos columnas: la ciudad desde la que se escribe y la ciudad o congregación a la que va, cada una en la fecha de la carta. Debajo, «mientras tanto» con el contexto político.
- **Por qué ayuda:** la carta se lee sabiendo qué vivían el que escribe y los que reciben.
- **Coste:** M · **Prioridad:** primer corte

#### F-05 · Ficha de evento
- **Qué ves y haces:** título, fecha con su precisión, lugar, personas, resumen nuestro, referencias y «antes / después» para saltar al evento anterior o siguiente.
- **Por qué ayuda:** cada evento se entiende dentro de su secuencia.
- **Coste:** S · **Prioridad:** primer corte

#### F-06 · Ficha de viaje
- **Qué ves y haces:** lista de etapas con lugar, referencia y duración si se conoce. Primer viaje (c. 47-48 e. c.): Seleucia → Chipre (Salamina, Pafos) → Perga, donde Juan Marcos los deja (Hch 13:13) → Antioquía de Pisidia → … Cada etapa enciende su tramo en el mapa.
- **Por qué ayuda:** el viaje se estudia como una lista y como un mapa a la vez.
- **Coste:** M · **Prioridad:** primer corte

#### F-07 · Ficha de hallazgo arqueológico
- **Qué ves y haces:** qué es, dónde se encontró, dónde está hoy, qué fecha ayuda a fijar y con qué versículo conecta. La inscripción de Delfos con el nombre de Galión ayuda a fechar su proconsulado en Acaya (Hch 18:12). Una foto con licencia libre, con crédito visible, si existe.
- **Por qué ayuda:** el estudiante ve que el relato encaja con objetos reales.
- **Coste:** M · **Prioridad:** primer corte

#### F-08 · Aviso de identificación incierta
- **Qué ves y haces:** en Corinto se encontró en 1929 un pavimento con el nombre de un Erasto. No se sabe si es el Erasto de Ro 16:23. La ficha lo dice con una insignia «identificación incierta».
- **Por qué ayuda:** enseña a no exagerar lo que prueba un hallazgo.
- **Coste:** S · **Prioridad:** primer corte

#### F-09 · Ficha de periodo o imperio
- **Qué ves y haces:** fechas, capitales, gobernantes en orden, extensión en el mapa animada por el cursor y personas bíblicas que vivieron bajo ese imperio.
- **Por qué ayuda:** da el marco a todo lo demás.
- **Coste:** M · **Prioridad:** después

#### F-10 · Ficha de libro bíblico
- **Qué ves y haces:** escritor, lugar de escritura, fecha de terminación y periodo que abarca, según la tabla de libros de la TNM. Daniel: Babilonia, c. 536 a. e. c., abarca 618-c. 536 a. e. c. Pulsar el periodo lo marca en la línea de tiempo.
- **Por qué ayuda:** el estudiante sitúa cada libro en el tiempo y en el mapa.
- **Coste:** S · **Prioridad:** primer corte

#### F-11 · Ficha de congregación
- **Qué ves y haces:** fundación, personas conocidas, visitas de Pablo, cartas recibidas. «Las congregaciones de Galacia» (Gál 1:2) aparecen como un grupo con las ciudades candidatas.
- **Por qué ayuda:** el destinatario se vuelve un lugar con historia.
- **Coste:** S · **Prioridad:** primer corte

#### F-12 · Glosario en línea
- **Qué ves y haces:** términos como «procónsul» o «colonia» van subrayados. Al pasar el ratón, una definición corta nuestra y un enlace a la nota de estudio en wol.jw.org.
- **Por qué ayuda:** el estudiante que empieza no se atasca en una palabra.
- **Coste:** S · **Prioridad:** primer corte

#### F-13 · Cabecera con imagen libre y crédito
- **Qué ves y haces:** la ficha de Corinto lleva una foto actual de sus ruinas con licencia CC y el autor bajo la foto. Si no hay foto libre, un dibujo de nuestro mapa, nunca una imagen de jw.org. Un enlace lleva a la ilustración en jw.org.
- **Por qué ayuda:** una foto real ayuda a recordar el lugar, y el crédito respeta la licencia.
- **Coste:** M · **Prioridad:** después

#### F-14 · Referencias con botón de lectura
- **Qué ves y haces:** cada referencia de la ficha es un botón «Hch 16:14 · Leer en wol.jw.org ↗» que abre el versículo en la TNM.
- **Por qué ayuda:** el texto bíblico siempre está a un toque, en la fuente original.
- **Coste:** S · **Prioridad:** primer corte

#### F-15 · Qué cambió desde la última fecha
- **Qué ves y haces:** al mover el cursor con una ficha abierta, las líneas nuevas se resaltan un momento. Al pasar de 49 a 51 e. c., en la ficha de Pablo se resalta «Corinto».
- **Por qué ayuda:** el ojo capta el cambio sin releer todo.
- **Coste:** S · **Prioridad:** después

#### F-16 · Fichas apiladas y comparación
- **Qué ves y haces:** abrir una ficha nueva no cierra la anterior: se apila. Se pueden poner dos en paralelo, por ejemplo Corinto y Éfeso.
- **Por qué ayuda:** comparar sin perder el contexto.
- **Coste:** M · **Prioridad:** después

#### F-17 · Resumen «en una frase»
- **Qué ves y haces:** cada ficha empieza con una frase nuestra. «Lidia: vendedora de púrpura de Tiatira que escuchó a Pablo en Filipos y abrió su casa (Hch 16:14, 15)».
- **Por qué ayuda:** quien tiene prisa se queda con lo esencial.
- **Coste:** S · **Prioridad:** primer corte

---

## 5. Búsqueda y enlaces (B)

Buscar es seleccionar. El resultado de una búsqueda es un **nodo con sus vecinos**. Todo lo demás se atenúa. Buscar «Pedro» encuadra su vida en la línea de tiempo y sus lugares en el mapa.

#### B-01 · Nodo más vecinos, resto atenuado
- **Qué ves y haces:** escribes «Silas» y la línea de tiempo muestra su carril, el mapa sus lugares, el grafo sus conexiones. Lo demás queda en gris.
- **Por qué ayuda:** una búsqueda responde con contexto, no con una lista.
- **Coste:** M · **Prioridad:** primer corte

#### B-02 · Búsqueda por referencia
- **Qué ves y haces:** escribes «Hch 16» o «Hechos 18:12». El cursor salta a la fecha, el mapa al lugar y el panel muestra lo que pasa en ese capítulo.
- **Por qué ayuda:** el estudiante llega desde su lectura, que es como estudia.
- **Coste:** M · **Prioridad:** primer corte

#### B-03 · Búsqueda por año
- **Qué ves y haces:** escribes «607 a. e. c.» o «51». El cursor salta y el panel «Ahora mismo» se abre.
- **Por qué ayuda:** quien recuerda una fecha llega en un paso.
- **Coste:** S · **Prioridad:** primer corte

#### B-04 · Preguntas con forma fija
- **Qué ves y haces:** la búsqueda reconoce tres formas: «¿qué pasaba en [lugar] en [fecha o persona]?», «¿quién había en [lugar] en tiempos de [persona o imperio]?», «¿dónde estaba [persona] en [fecha]?». «¿Qué pasaba en Babilonia en tiempos de Jesús?» abre la ficha de Babilonia en 29-33 e. c.
- **Por qué ayuda:** el estudiante pregunta como piensa. Es una gramática fija sobre nuestros datos, sin respuestas inventadas.
- **Coste:** M · **Prioridad:** después

#### B-05 · Nombres modernos
- **Qué ves y haces:** escribes «Salónica» o «Irak» y aparece Tesalónica o Babilonia, con la aclaración «hoy».
- **Por qué ayuda:** conecta lo que el estudiante ya sabe con lo que busca.
- **Coste:** S · **Prioridad:** primer corte

#### B-06 · Autocompletado con tipo y fechas
- **Qué ves y haces:** cada sugerencia lleva un icono de tipo y su intervalo. «Darío el medo · persona · 539 a. e. c.» «Damasco · lugar».
- **Por qué ayuda:** distingue homónimos antes de elegir.
- **Coste:** S · **Prioridad:** primer corte

#### B-07 · Tolerancia a tildes y variantes
- **Qué ves y haces:** «galion», «Galión» y «Gallio» encuentran lo mismo. «Hch», «Hech» y «Hechos», también.
- **Por qué ayuda:** en el móvil nadie escribe tildes.
- **Coste:** S · **Prioridad:** primer corte

#### B-08 · Enlace profundo que guarda todo
- **Qué ves y haces:** la dirección de la página guarda fecha, vista, selección, capas y zoom. Por ejemplo: `/?t=51&sel=galion&mapa=antiguo&capas=hallazgos`. Copiarla y enviarla abre exactamente la misma pantalla.
- **Por qué ayuda:** quien recibe el enlace ve lo mismo que vio quien lo envió: fecha, selección y capas.
- **Coste:** S · **Prioridad:** primer corte

#### B-09 · Direcciones legibles
- **Qué ves y haces:** además del enlace completo, rutas simples que se pueden escribir a mano: `/hch/16`, `/persona/timoteo`, `/lugar/babilonia/30`.
- **Por qué ayuda:** se dictan en voz alta o se escriben en una pizarra.
- **Coste:** S · **Prioridad:** después

#### B-10 · «Leer en wol.jw.org ↗» en cada referencia
- **Qué ves y haces:** toda referencia bíblica abre wol.jw.org en la página y el idioma del usuario.
- **Por qué ayuda:** la fuente principal está a un toque y no la copiamos.
- **Coste:** S · **Prioridad:** primer corte

#### B-11 · Citar
- **Qué ves y haces:** un botón «Citar» copia una línea: resumen + referencias + enlace de wol.jw.org + enlace profundo a esta vista.
- **Por qué ayuda:** quien prepara un discurso pega la cita limpia en sus notas.
- **Coste:** S · **Prioridad:** después

#### B-12 · Referencias entrantes
- **Qué ves y haces:** en cualquier versículo, «aparece en»: todas las personas, lugares y eventos que lo citan. Hch 18:12 aparece en Galión, Corinto, Acaya y el hallazgo de Delfos.
- **Por qué ayuda:** un versículo lleva a todo su contexto.
- **Coste:** S · **Prioridad:** primer corte

#### B-13 · Una página por entidad
- **Qué ves y haces:** cada persona, lugar y evento tiene una página estática propia que abre la aplicación en su estado.
- **Por qué ayuda:** los buscadores encuentran las fichas y el sitio funciona sin servidor.
- **Coste:** M · **Prioridad:** después

#### B-14 · Código QR de la vista
- **Qué ves y haces:** «Compartir» muestra un QR del enlace profundo.
- **Por qué ayuda:** en una lámina impresa o una pantalla, el QR abre la vista en el móvil.
- **Coste:** S · **Prioridad:** después

#### B-15 · Atrás y adelante de verdad
- **Qué ves y haces:** los botones del navegador deshacen y rehacen cada salto de selección o de fecha.
- **Por qué ayuda:** explorar sin miedo.
- **Coste:** S · **Prioridad:** primer corte

#### B-16 · Paleta de órdenes
- **Qué ves y haces:** Ctrl+K (o Cmd+K) abre una caja para ir a cualquier cosa: «ir a 537», «capa hallazgos», «mapa actual».
- **Por qué ayuda:** los usuarios que repiten ganan velocidad.
- **Coste:** S · **Prioridad:** después

#### B-17 · Búsqueda por rango y región
- **Qué ves y haces:** «entre 49 y 52 en Grecia» filtra los eventos de ese intervalo en ese recuadro del mapa. También se puede dibujar el recuadro.
- **Por qué ayuda:** responde preguntas geográficas y temporales a la vez.
- **Coste:** M · **Prioridad:** quizá

#### B-18 · Enlaces a notas de estudio y Perspicacia
- **Qué ves y haces:** además del versículo, la ficha enlaza la nota de estudio de wol.jw.org y el artículo de Perspicacia. Galión enlaza su artículo, que explica la inscripción de Delfos.
- **Por qué ayuda:** el estudiante profundiza en la fuente de nivel 1.
- **Coste:** S · **Prioridad:** primer corte

---

## 6. Aprendizaje (A)

#### A-01 · Recorridos guiados
- **Qué ves y haces:** una historia en pasos. Cada paso mueve el cursor, el mapa y el panel, y trae un texto breve nuestro con su referencia. «Primer viaje de Pablo, en 9 pasos». Botones «siguiente» y «anterior».
- **Por qué ayuda:** el que empieza no sabe por dónde empezar. El recorrido se lo da.
- **Coste:** M · **Prioridad:** primer corte

#### A-02 · Modo lectura, capítulo a capítulo
- **Qué ves y haces:** eliges «Hechos» y la aplicación se pone al lado de tu lectura. Cada capítulo mueve mapa y tiempo. «Capítulo siguiente» avanza. El texto se lee en wol.jw.org o en la aplicación de la Biblia del usuario.
- **Por qué ayuda:** el mapa acompaña la lectura, en lugar de competir con ella.
- **Coste:** M · **Prioridad:** primer corte

#### A-03 · Lectura semanal elegida por el usuario
- **Qué ves y haces:** el usuario escribe los capítulos de su lectura de la semana («Hch 16-18») y obtiene un recorrido con esos capítulos.
- **Por qué ayuda:** prepara la lectura en minutos. No copiamos ningún programa: el usuario indica los capítulos.
- **Coste:** S · **Prioridad:** después

#### A-04 · Preguntas de repaso a partir de los datos
- **Qué ves y haces:** al final de un recorrido, cinco preguntas. «¿Desde qué ciudad escribió Pablo 1 Tesalonicenses?» con opciones en el mapa. La respuesta muestra la fuente.
- **Por qué ayuda:** recordar exige recuperar. Las preguntas salen de hechos con fuente, no se inventan.
- **Coste:** M · **Prioridad:** después

#### A-05 · Tarjetas «Mientras tanto»
- **Qué ves y haces:** en cualquier evento, una tarjeta muestra qué pasaba a la vez en otro sitio. Mientras Pablo está en Corinto, Claudio gobierna en Roma y ya ha expulsado a los judíos de la ciudad (Hch 18:2).
- **Por qué ayuda:** crea conexiones que ningún capítulo muestra solo.
- **Coste:** S · **Prioridad:** primer corte

#### A-06 · «¿Sabías que…?»
- **Qué ves y haces:** una nota breve y verificable en una esquina, siempre con fuente. «En Delfos se encontró una inscripción con el nombre del procónsul Galión.»
- **Por qué ayuda:** despierta curiosidad y enseña a pedir la fuente.
- **Coste:** S · **Prioridad:** después

#### A-07 · Mapa mudo para practicar
- **Qué ves y haces:** el mapa sin nombres. Arrastras «Filipos», «Tesalónica», «Berea» a su sitio. Si fallas, te muestra dónde era.
- **Por qué ayuda:** fija la geografía con práctica activa.
- **Coste:** M · **Prioridad:** después

#### A-08 · Ordenar eventos en la línea de tiempo
- **Qué ves y haces:** cinco tarjetas desordenadas (Pafos, Filipos, Corinto, Éfeso, Malta). Las arrastras a la línea. Al soltar, se colocan en su fecha real.
- **Por qué ayuda:** el orden de los hechos es lo primero que se olvida.
- **Coste:** M · **Prioridad:** después

#### A-09 · Progreso de lectura local
- **Qué ves y haces:** los capítulos ya recorridos se marcan en un mapa de progreso. Todo se guarda en el propio navegador, sin cuenta.
- **Por qué ayuda:** motiva sin recoger datos.
- **Coste:** S · **Prioridad:** después

#### A-10 · Modo pantalla compartida
- **Qué ves y haces:** letra grande, pocos controles, un recorrido y preguntas por nivel (niños, jóvenes, adultos). Un botón de turnos pasa la pregunta al siguiente.
- **Por qué ayuda:** varias personas estudian juntas frente a la televisión o un portátil.
- **Coste:** M · **Prioridad:** después

#### A-11 · Modo presentación
- **Qué ves y haces:** guardas una secuencia de vistas (fecha + selección + capas) y la reproduces a pantalla completa con las flechas del teclado.
- **Por qué ayuda:** quien da una clase o un discurso usa el mapa como apoyo sin improvisar.
- **Coste:** M · **Prioridad:** después

#### A-12 · Comparativa de sincronía
- **Qué ves y haces:** una tabla automática con dos o tres carriles y las mismas fechas. Daniel en Babilonia / Ezequiel en Babilonia / Jeremías en Judá y Egipto, con sus años según la tabla de libros.
- **Por qué ayuda:** responde «¿fueron contemporáneos?» con fechas.
- **Coste:** S · **Prioridad:** después

#### A-13 · Escala humana de un viaje
- **Qué ves y haces:** en un viaje largo, una línea de días. «Unos cuatro meses» para el regreso de Babilonia en 537 a. e. c., comparado con la duración de un viaje en barco del mismo mapa.
- **Por qué ayuda:** el estudiante siente cuánto costaba moverse.
- **Coste:** S · **Prioridad:** quizá

#### A-14 · Retos «Encuentra en el mapa»
- **Qué ves y haces:** una pregunta: «¿Dónde se juzgó a Pablo ante Galión?». Pulsas en el mapa. Acierto o fallo, con explicación.
- **Por qué ayuda:** estudio breve para jóvenes, en el móvil.
- **Coste:** S · **Prioridad:** quizá

#### A-15 · Repaso espaciado
- **Qué ves y haces:** las preguntas falladas vuelven días después. Se guarda en el navegador.
- **Por qué ayuda:** retener a largo plazo.
- **Coste:** M · **Prioridad:** quizá

#### A-16 · Resumen imprimible del recorrido
- **Qué ves y haces:** al terminar un recorrido, una hoja con el mapa final, la línea de tiempo del tramo y las referencias.
- **Por qué ayuda:** el estudio continúa en papel, en la mesa o en la reunión.
- **Coste:** S · **Prioridad:** después

#### A-17 · Iconos sencillos para niños
- **Qué ves y haces:** un conjunto de iconos propio (barco, calzada, carta, prisión) sustituye a los textos largos en el modo pantalla compartida.
- **Por qué ayuda:** los niños que aún no leen con soltura siguen la historia.
- **Coste:** M · **Prioridad:** quizá

#### A-18 · Discursos y cartas en su lugar
- **Qué ves y haces:** una capa marca dónde se pronunció cada discurso conocido. Pablo en el Areópago de Atenas (Hch 17:19).
- **Por qué ayuda:** el contenido del discurso se entiende mejor sabiendo ante quién y dónde.
- **Coste:** S · **Prioridad:** después

---

## 7. Fuentes y confianza (C)

Todo dato lleva su fuente. **Nivel 1**: la TNM y las publicaciones de wol.jw.org (Perspicacia, notas de estudio). **Nivel 2**: arqueología, investigación publicada y datos geográficos abiertos. Los conjuntos de datos abiertos de otros autores sólo aportan hechos neutros como coordenadas, nunca interpretación.

#### C-01 · Insignias de nivel
- **Qué ves y haces:** cada dato lleva una insignia pequeña: **N1** o **N2**. Al pulsarla, se ve la fuente exacta con su enlace.
- **Por qué ayuda:** el estudiante sabe qué dice la Biblia y qué dice la investigación.
- **Coste:** S · **Prioridad:** primer corte

#### C-02 · Cronología TNM principal y nota secular
- **Qué ves y haces:** la línea de tiempo usa la cronología TNM. Cuando la cronología secular difiere, aparece una marca secundaria con una nota: «Muchos historiadores sitúan la destrucción de Jerusalén en 587 o 586 a. e. c.; la cronología bíblica, en 607 a. e. c.», con enlace al artículo de wol.jw.org que lo explica.
- **Por qué ayuda:** el estudiante conoce la otra fecha y la razón de la nuestra.
- **Coste:** S · **Prioridad:** primer corte

#### C-03 · «Sin verificar» a la vista
- **Qué ves y haces:** un dato no comprobado en una fuente de nivel 1 o 2 lleva un borde rayado y la etiqueta «sin verificar». Un filtro los oculta.
- **Por qué ayuda:** nunca se presenta como seguro lo que no lo es.
- **Coste:** S · **Prioridad:** primer corte

#### C-04 · Cómo se ve una discrepancia
- **Qué ves y haces:** si dos fuentes dan fechas distintas, la línea muestra ambos tramos. Galión: verano de 51 a verano de 52 e. c. (el tramo principal que presenta Perspicacia) y 52-53 e. c. (el que prefieren algunos eruditos), en gris y con su fuente.
- **Por qué ayuda:** el estudiante ve el debate sin tener que leerlo entero.
- **Coste:** S · **Prioridad:** primer corte

#### C-05 · Precisión de la fecha con símbolos
- **Qué ves y haces:** junto a cada fecha, su marca: exacta, **c.** (alrededor de), **a.** (antes de), **d.** (después de). Son las mismas marcas que usa la tabla de libros de la TNM. «Nehemías: d. 443 a. e. c.»
- **Por qué ayuda:** coherencia con la fuente que el estudiante ya conoce.
- **Coste:** S · **Prioridad:** primer corte

#### C-06 · «¿De dónde sale esto?» en un clic
- **Qué ves y haces:** cualquier frase del panel tiene un icono ⓘ. Al pulsarlo, se ven la fuente, la fecha de comprobación y el historial del dato.
- **Por qué ayuda:** la confianza se gana mostrando el trabajo.
- **Coste:** S · **Prioridad:** primer corte

#### C-07 · Base documental de los candidatos
- **Qué ves y haces:** en un abanico de lugares candidatos, cada candidato dice por qué está ahí. «Corinto: tabla de libros TNM. Antioquía de Siria: tabla de libros TNM.»
- **Por qué ayuda:** el estudiante entiende por qué hay duda y de dónde sale cada candidato.
- **Coste:** S · **Prioridad:** primer corte

#### C-08 · Coordenadas de terceros señaladas
- **Qué ves y haces:** si una coordenada viene de un conjunto abierto, la ficha lo dice: «Coordenada: Pleiades». Nunca se muestran sus textos ni interpretaciones.
- **Por qué ayuda:** crédito correcto y separación clara entre dato y opinión.
- **Coste:** S · **Prioridad:** primer corte

#### C-09 · Filtro «sólo nivel 1»
- **Qué ves y haces:** un interruptor oculta todo lo que no sea nivel 1. El mapa se simplifica a lo que dice la Biblia y Perspicacia.
- **Por qué ayuda:** quien prepara un discurso sabe qué puede afirmar con la Biblia en la mano.
- **Coste:** S · **Prioridad:** después

#### C-10 · Fecha de comprobación
- **Qué ves y haces:** cada fuente web lleva la fecha en que la comprobamos y un aviso si el enlace dejó de funcionar.
- **Por qué ayuda:** los enlaces cambian. Así se detecta y se corrige.
- **Coste:** S · **Prioridad:** después

#### C-11 · Lo que no sabemos, dicho
- **Qué ves y haces:** en una ficha, una sección breve «Lo que el texto no dice». En Gálatas: no sabemos con seguridad desde qué ciudad se escribió.
- **Por qué ayuda:** evita rellenar huecos con suposiciones.
- **Coste:** S · **Prioridad:** después

#### C-12 · Año cero invisible
- **Qué ves y haces:** internamente usamos numeración astronómica (1 a. e. c. = 0). El usuario nunca ve un «año 0»: la línea pasa de 1 a. e. c. a 1 e. c.
- **Por qué ayuda:** los cálculos de intervalos son correctos y la interfaz no confunde.
- **Coste:** S · **Prioridad:** primer corte

---

## 8. Móvil, accesibilidad, idiomas, rendimiento, sin conexión e impresión (D)

```
 ┌─────────────────────────┐   Móvil, vertical
 │ Buscar: Hch 18    51 e.c│   · búsqueda y fecha arriba
 │                         │   · mapa en el centro
 │      MAPA               │   · la línea de tiempo en el borde
 │   ◉ Corinto           ▲ │     derecho, vertical, con el pulgar
 │                       │ │
 │                       ● │
 │                       │ │
 ├─────────────────────────┤   · hoja inferior con tres alturas:
 │ ▔▔▔  Corinto en 51 e. c.│     tarjeta · panel · página
 │ Galión, procónsul (N1)  │
 │ [Leer Hch 18 ↗] [Más ⌃] │
 └─────────────────────────┘
```

#### D-01 · Hoja inferior de tres alturas
- **Qué ves y haces:** en el móvil, el panel es una hoja que sube desde abajo: una línea, media pantalla o pantalla completa. El mapa sigue visible arriba.
- **Por qué ayuda:** el patrón que el usuario ya conoce de otras aplicaciones de mapas.
- **Coste:** M · **Prioridad:** primer corte

#### D-02 · Modo reunión
- **Qué ves y haces:** fondo oscuro, brillo bajo, sin animaciones ni sonido, controles grandes. Un botón lo activa.
- **Por qué ayuda:** se usa en la reunión sin molestar a nadie.
- **Coste:** S · **Prioridad:** primer corte

#### D-03 · Una mano
- **Qué ves y haces:** los controles principales están en la mitad inferior de la pantalla. La búsqueda se abre desde abajo.
- **Por qué ayuda:** se usa con la Biblia o una libreta en la otra mano.
- **Coste:** S · **Prioridad:** después

#### D-04 · Instalable y sin conexión
- **Qué ves y haces:** «Instalar» añade la aplicación a la pantalla de inicio. «Descargar para usar sin conexión» guarda un paquete por corte (por ejemplo, «Viajes de Pablo»: datos + teselas de esa región).
- **Por qué ayuda:** funciona en salas sin cobertura.
- **Coste:** M · **Prioridad:** después

#### D-05 · Carga rápida
- **Qué ves y haces:** la primera pantalla se ve en menos de 2 segundos en un móvil medio. Los datos se cargan por tramos de tiempo y región.
- **Por qué ayuda:** si tarda, no se usa.
- **Coste:** M · **Prioridad:** primer corte

#### D-06 · Modo ligero sin WebGL
- **Qué ves y haces:** en dispositivos antiguos, una versión con mapa estático por imagen y listas. Mismo contenido, menos animación.
- **Por qué ayuda:** nadie se queda fuera por tener un teléfono viejo.
- **Coste:** M · **Prioridad:** quizá

#### D-07 · Todo con teclado
- **Qué ves y haces:** Tab recorre controles en orden lógico. ← → mueven el cursor por eventos. Intro abre fichas. Esc cierra.
- **Por qué ayuda:** accesibilidad y velocidad.
- **Coste:** S · **Prioridad:** primer corte

#### D-08 · Estado descrito para lectores de pantalla
- **Qué ves y haces:** una región oculta anuncia cada cambio en texto: «51 e. c. Pablo en Corinto. Galión, procónsul de Acaya.»
- **Por qué ayuda:** una persona ciega puede usar el cursor de tiempo.
- **Coste:** S · **Prioridad:** primer corte

#### D-09 · Colores seguros y patrones
- **Qué ves y haces:** paletas legibles con daltonismo. Nunca sólo color: rayado para «sin verificar», discontinuo para mar o deducido.
- **Por qué ayuda:** la información no depende de ver colores.
- **Coste:** S · **Prioridad:** primer corte

#### D-10 · Movimiento reducido
- **Qué ves y haces:** si el sistema pide menos movimiento, los saltos de mapa son cortes y las ramas del grafo aparecen sin animar.
- **Por qué ayuda:** evita mareos.
- **Coste:** S · **Prioridad:** primer corte

#### D-11 · Texto grande
- **Qué ves y haces:** un control de tamaño de letra que afecta a paneles y etiquetas del mapa.
- **Por qué ayuda:** personas mayores y pantallas lejanas.
- **Coste:** S · **Prioridad:** primer corte

#### D-12 · Idiomas desde el primer día
- **Qué ves y haces:** español primero. Cada entidad guarda su nombre por idioma y cada referencia se enlaza a wol.jw.org en el idioma del usuario.
- **Por qué ayuda:** el mismo sitio sirve a congregaciones de muchos idiomas.
- **Coste:** M · **Prioridad:** primer corte (estructura) · después (traducciones)

#### D-13 · Abreviaturas de libros por idioma
- **Qué ves y haces:** «Hch» en español, «Ac» en inglés, reconocidas en la búsqueda y mostradas en el panel.
- **Por qué ayuda:** coincide con lo que el usuario ve en su Biblia.
- **Coste:** S · **Prioridad:** primer corte

#### D-14 · Lámina para imprimir
- **Qué ves y haces:** «Imprimir» genera una lámina A4 o A3 de la vista actual: mapa, línea de tiempo del tramo, leyenda, fecha, fuentes y QR.
- **Por qué ayuda:** una clase o un grupo sin pantalla sigue usando el material.
- **Coste:** M · **Prioridad:** después

#### D-15 · Exportar imagen vectorial
- **Qué ves y haces:** «Exportar SVG o PNG» de la vista, con créditos incluidos.
- **Por qué ayuda:** se usa en una presentación sin capturas de pantalla borrosas.
- **Coste:** S · **Prioridad:** después

#### D-16 · Modo proyector
- **Qué ves y haces:** alto contraste, etiquetas más gruesas y fondo claro para proyectar en una sala.
- **Por qué ayuda:** un mapa oscuro se pierde en un proyector.
- **Coste:** S · **Prioridad:** quizá

#### D-17 · Sin cuentas ni rastreo
- **Qué ves y haces:** no hay registro. Marcadores y progreso viven en el navegador. Un botón exporta e importa esos datos a un archivo.
- **Por qué ayuda:** privacidad y cero fricción para empezar.
- **Coste:** S · **Prioridad:** primer corte

---

## 9. Contribución (P)

El repositorio guarda un archivo YAML por entidad: persona, lugar, evento, viaje, periodo, hallazgo. Cada cambio es una solicitud de cambio (PR) revisable.

#### P-01 · Un archivo por entidad
- **Qué ves y haces:** `data/places/corinto.yaml` contiene coordenadas, nombres por idioma, periodos y fuentes. Un cambio en Corinto toca sólo ese archivo.
- **Por qué ayuda:** las revisiones son pequeñas y claras.
- **Coste:** S · **Prioridad:** primer corte

#### P-02 · «Proponer una corrección» en cada ficha
- **Qué ves y haces:** un botón abre una propuesta en GitHub con el archivo de la entidad ya indicado y una plantilla.
- **Por qué ayuda:** quien ve un error lo corrige sin saber dónde está el archivo.
- **Coste:** S · **Prioridad:** después

#### P-03 · Plantilla con comprobaciones
- **Qué ves y haces:** la plantilla pide: referencia bíblica, enlace de wol.jw.org, nivel de la fuente, y confirma que no se copia texto de la TNM ni imágenes de jw.org.
- **Por qué ayuda:** el revisor recibe todo lo necesario.
- **Coste:** S · **Prioridad:** primer corte

#### P-04 · Validación automática
- **Qué ves y haces:** cada propuesta pasa comprobaciones: esquema válido, referencias bien formadas, fechas coherentes (nadie viaja antes de nacer), enlaces que responden, coordenadas dentro del mapa.
- **Por qué ayuda:** los errores mecánicos no llegan a revisión humana.
- **Coste:** M · **Prioridad:** primer corte

#### P-05 · Vista previa en el mapa
- **Qué ves y haces:** cada propuesta genera una versión de prueba del sitio con el cambio aplicado y un enlace directo a la ficha tocada.
- **Por qué ayuda:** el revisor ve cómo queda la pantalla antes de aceptar el cambio.
- **Coste:** M · **Prioridad:** después

#### P-06 · Historial de un hecho
- **Qué ves y haces:** en la ficha, «Historial» muestra una lista con cada cambio del dato: fecha, qué cambió y por qué, con su fuente.
- **Por qué ayuda:** la confianza crece cuando se ve cómo se corrigió algo.
- **Coste:** S · **Prioridad:** después

#### P-07 · Doble revisión para nivel 1
- **Qué ves y haces:** los cambios en datos de nivel 1 necesitan dos aprobaciones.
- **Por qué ayuda:** los datos principales son los que más importan.
- **Coste:** S · **Prioridad:** después

#### P-08 · Cola de «necesita fuente»
- **Qué ves y haces:** una página lista los datos «sin verificar», ordenados por importancia. Un voluntario elige uno y lo comprueba.
- **Por qué ayuda:** convierte la deuda de verificación en tareas pequeñas.
- **Coste:** S · **Prioridad:** después

#### P-09 · Importar candidatos sin confiar en ellos
- **Qué ves y haces:** un importador trae coordenadas de conjuntos abiertos como borradores marcados «sin verificar». Nunca pasan a publicados sin revisión.
- **Por qué ayuda:** arrancamos rápido sin heredar interpretaciones ni errores.
- **Coste:** M · **Prioridad:** primer corte

#### P-10 · Guía de estilo para resúmenes
- **Qué ves y haces:** una guía corta: frases propias, sin copiar la TNM, con referencia siempre, tono neutro, tildes correctas.
- **Por qué ayuda:** textos coherentes entre muchos contribuidores.
- **Coste:** S · **Prioridad:** primer corte

#### P-11 · Editor visual
- **Qué ves y haces:** un formulario en el navegador que genera el YAML: pulsas en el mapa para poner la coordenada y eliges la fecha en la línea.
- **Por qué ayuda:** contribuir sin saber YAML.
- **Coste:** L · **Prioridad:** quizá

---

## Las 15 ideas del primer corte

El primer corte son los viajes de Pablo (Hch 9-28) y sus cartas. Estas 15 ideas lo harían excelente:

1. **T-01 · Un solo cursor de tiempo.** Todo lo demás depende de él.
2. **T-02 · Niveles era → episodio → evento en una sola línea.** Sustituye la banda duplicada.
3. **T-17 · Tiempo narrativo etiquetado.** Casi todo Hechos tiene orden seguro y fechas aproximadas.
4. **T-06 y T-07 · Carriles de personas e imperio.** Pablo, Bernabé, Silas, Timoteo, Lucas y el emperador en paralelo.
5. **M-01 y M-02 · Antiguo, actual y cortina.** Galacia deja de ser un nombre sin sitio.
6. **M-08 · Rutas por calzadas y por mar.** Recorridos creíbles con distancias reales.
7. **M-11 · Abanico de candidatos.** Gálatas: Corinto o Antioquía de Siria.
8. **M-12 · Pulsar un punto: qué pasó aquí.** Filipos en 49-50 e. c.: Lidia, la prisión, el carcelero.
9. **G-01 · Vista centrada con ramas por fecha.** Explorar Pablo → Timoteo → Loida.
10. **G-09 · Grafo de cartas sobre el mapa.** Todas las cartas como flechas de origen a destino.
11. **F-04 · Ficha de carta con los dos extremos.** Qué pasaba en la ciudad que escribe y en la que recibe.
12. **F-07 y F-08 · Hallazgos con su alcance real.** Galión en Delfos; Erasto con identificación incierta.
13. **B-02 y B-08 · Buscar por capítulo y compartir la vista exacta.** «Hch 18» y un enlace que abre lo mismo.
14. **A-01 y A-02 · Recorridos guiados y modo lectura.** El estudiante lee Hechos con el mapa al lado.
15. **C-01, C-02 y C-04 · Niveles, cronología TNM y discrepancias visibles.** Confianza desde el primer día.

---

## Diez principios de diseño

1. **Una fecha manda.** El cursor de tiempo gobierna mapa, línea, grafo y panel. Nunca muestran fechas distintas.
2. **Nunca el grafo entero.** Siempre una vista centrada, filtrada por fecha, con un límite de vecinos.
3. **La incertidumbre se dibuja.** Degradado para fechas, zona o abanico para lugares, rayado para lo no verificado. Nunca un punto falso.
4. **Cada dato tiene fuente a un clic.** Nivel 1 o nivel 2, con enlace. Sin fuente, «sin verificar».
5. **Leemos en la fuente, no la copiamos.** Referencias, resúmenes propios y «Leer en wol.jw.org ↗».
6. **Antiguo y moderno a la vez.** Nombres de la época con su equivalente actual, siempre a un clic.
7. **Una sola línea de tiempo con niveles.** El zoom abre los nombres; no hay bandas duplicadas.
8. **Buscar es seleccionar.** El resultado es un nodo con su contexto en el tiempo y en el mapa.
9. **Toda vista se puede compartir.** La dirección guarda fecha, selección y capas.
10. **Primero el móvil, el teclado y la lectura.** Si funciona con una mano en la reunión y con lector de pantalla, funciona para todos.

---

## Hechos usados en los ejemplos y dónde los comprobamos

Todo se leyó en wol.jw.org el 26 de septiembre de 2026. Aquí no se copia el texto bíblico; sólo se resume el dato.

| Dato | Fuente |
|---|---|
| Lugar y fecha de escritura de las cartas (1 Tes: Corinto, c. 50; 2 Tes: Corinto, c. 51; Gálatas: Corinto o Antioquía de Siria, c. 50-52; Romanos: Corinto, c. 56; 1 Cor: Éfeso, c. 55; 2 Cor: Macedonia, c. 55; Efesios, Filipenses, Colosenses y Filemón: Roma, c. 60-61; 2 Tim: Roma, c. 65; 1 Pedro: Babilonia, c. 62-64). Daniel: Babilonia, c. 536, abarca 618-c. 536. Ester: Susa, c. 475. Nehemías: Jerusalén, d. 443. Ageo: 520. Zacarías: 520-518. Mateo abarca 2 a. e. c.-33 e. c. Marcas «a.», «c.», «d.» | [Tabla de los libros de la Biblia](https://wol.jw.org/es/wol/d/r4/lp-s/1001070071) |
| Babilonia: cae el 5 de octubre de 539 a. e. c. (gregoriano); Alejandro la toma en 331 y muere en 323; Nicátor en 312 y Seleucia; partos desde mediados del siglo II a. e. c.; colonia judía y 1 Pe 5:13; templo de Bel en 75 e. c.; ruinas en el siglo IV e. c.; regreso de 42.360 israelitas | [Perspicacia, «Babilonia»](https://wol.jw.org/es/wol/d/r4/lp-s/1200000530) |
| Galión procónsul de Acaya; inscripción de Delfos; verano de 51 a verano de 52 e. c., algunos eruditos 52-53 | [Perspicacia, «Galión»](https://wol.jw.org/es/wol/d/r4/lp-s/1200001603) |
| Acaya, provincia senatorial 27 a. e. c.-15 e. c. y desde 44 e. c.; inscripción de Delfos | [Notas de estudio, Hechos 18](https://wol.jw.org/es/wol/d/r4/lp-s/1001070707) |
| 997 división del reino; 607 desolación de Judá; 537 regreso (viaje de unos cuatro meses); 455 muros; 29 e. c. bautismo de Jesús | [Perspicacia, «Cronología»](https://wol.jw.org/es/wol/d/r4/lp-s/1200000970) |
| Muchos historiadores sitúan la destrucción de Jerusalén en 586 o 587 a. e. c. | [«¿Cuándo fue destruida Jerusalén? Primera parte»](https://wol.jw.org/es/wol/d/r4/lp-s/2011736) |
| Viajes de Pablo: primero c. 47-48, segundo c. 49-52, tercero c. 52-56; Roma c. 59-61; 2 Tim c. 65; 33 e. c. como fundamento | [Perspicacia, «Pablo»](https://wol.jw.org/es/wol/d/r4/lp-s/1200003406) |
| Tres reyes llamados Darío: uno medo y dos persas | [Perspicacia, «Darío»](https://wol.jw.org/es/wol/d/r4/lp-s/1200001124) |
| Pavimento de Erasto en Corinto (1929); no se sabe si es el de Ro 16:23 | [Perspicacia, «Erasto»](https://wol.jw.org/es/wol/d/r4/lp-s/1200001413) |
| Costa de Éfeso: hipótesis del golfo y cálculo de unos 6,5 km al mar | [Perspicacia, «Éfeso»](https://wol.jw.org/es/wol/d/r4/lp-s/1200001387) |
| Pentecostés del año 33 e. c. (Hch 1:9-2:13) | [Notas de estudio, Hechos 2](https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/44/2) |
| Hch 2:9; 9:2; 13:6-8, 13; 15:2; 16:1-3, 12-15, 23-34; 17:1, 5-10, 19; 18:2, 11, 12; 19:24; 20:31; 22:3; 27:9; 28:1 | [Hechos en la TNM](https://wol.jw.org/es/wol/b/r4/lp-s/nwt/44/1) (capítulo a capítulo) |
| Hch 18:5 (Silas y Timoteo llegan a Corinto); 1 Tes 1:1 (Pablo, Silvano y Timoteo); Isa 45:1 (Ciro) | [Hechos 18](https://wol.jw.org/es/wol/b/r4/lp-s/nwt/44/18) · [1 Tesalonicenses 1](https://wol.jw.org/es/wol/b/r4/lp-s/nwt/52/1) · [Isaías 45](https://wol.jw.org/es/wol/b/r4/lp-s/nwt/23/45) |
| 2 Tim 1:5 (Loida y Eunice); Gál 1:2; Col 4:7-9; Ro 16:23; 1 Pe 5:13 | [2 Timoteo 1](https://wol.jw.org/es/wol/b/r4/lp-s/nwt/55/1) · [Gálatas 1](https://wol.jw.org/es/wol/b/r4/lp-s/nwt/48/1) · [Colosenses 4](https://wol.jw.org/es/wol/b/r4/lp-s/nwt/51/4) · [Romanos 16](https://wol.jw.org/es/wol/b/r4/lp-s/nwt/45/16) · [1 Pedro 5](https://wol.jw.org/es/wol/b/r4/lp-s/nwt/60/5) |
| Ne 1:1 (Susa, kislev, año 20); Est 1:2 (Susa); Dan 5:30, 31 (Darío el medo, unos 62 años); Ag 1:1 (Zorobabel, Josué); Esd 7:1 (Artajerjes) | [Nehemías 1](https://wol.jw.org/es/wol/b/r4/lp-s/nwt/16/1) · [Ester 1](https://wol.jw.org/es/wol/b/r4/lp-s/nwt/17/1) · [Daniel 5](https://wol.jw.org/es/wol/b/r4/lp-s/nwt/27/5) · [Ageo 1](https://wol.jw.org/es/wol/b/r4/lp-s/nwt/37/1) · [Esdras 7](https://wol.jw.org/es/wol/b/r4/lp-s/nwt/15/7) |

**Sin verificar en wol.jw.org** (datos geográficos de nivel 2 o supuestos de diseño):

- Nombres y países modernos («Salónica, Grecia»; Babilonia en el actual Irak; Galacia en la actual Turquía).
- El ritmo de viaje en días a pie o en barco (M-18). Es un supuesto editable, no un dato.
- La fecha de la estancia en Filipos (49-50 e. c.): se deduce del segundo viaje (c. 49-52 e. c.); la fecha exacta queda sin verificar.
- Los tramos exactos de las calzadas romanas dependen de los datos de Itiner-e.

---

## Datos externos mencionados

| Recurso | Para qué | Licencia |
|---|---|---|
| [Itiner-e](https://itiner-e.org/) | Trazado de calzadas romanas | Sin verificar; comprobar antes de incluir datos |
| [Pleiades](https://pleiades.stoa.org/) | Coordenadas de lugares antiguos | CC BY (comprobar versión antes de incluir) |
| [Natural Earth](https://www.naturalearthdata.com/) | Costas, ríos y relieve moderno | Dominio público |
| [Theographic Bible Metadata](https://github.com/robertrouse/theographic-bible-metadata) | Candidatos de hechos neutros para arrancar, nunca interpretación | CC BY-SA 4.0 (lo derivado conserva esa licencia) |
| [biblical-timeline-map](https://petersshane.github.io/biblical-timeline-map/) | Referencia de diseño vista; no usamos su código ni sus datos | No aplica |

Toda foto, fuente tipográfica o dato que entre en el repositorio lleva su licencia y su crédito en el propio archivo de la entidad.
