# Hoja de ruta

Construimos por rebanadas completas y publicamos cada una cuando está entera. v0, v1 y v2 están hechas, y con ellas lo que antes estaba en «Más adelante». El orden de lo que queda puede cambiar según lo que se esté leyendo.

## Lo que hay ahora

Cifras del 28 de septiembre de 2026, sacadas de `python3 scripts/build.py` y de las carpetas de [`data/`](../data/):

| Tipo | Ficheros |
|---|---|
| Lugares | 170, de ellos 29 con candidatos en vez de un punto |
| Personas | 274, con 485 relaciones entre ellas y con lugares |
| Sucesos | 316 |
| Periodos | 87: 52 reinados, 11 emperadores, 9 eras, 6 potencias, 5 gobernadores y 4 sumos sacerdotes |
| Cartas | 22: las 14 de Pablo y 8 de otros escritores |
| Viajes | 8 |
| Hallazgos | 7 |
| Recorridos guiados | 4 |
| Libros de la Biblia | 66, cada uno con escritor y fecha |
| Meses hebreos | 13, con 18 nombres por época |
| Hechos del calendario | 14, los de la página «El calendario» |
| Fuentes | 984, de ellas 282 capítulos de la Biblia que se crean solos |

Quedan 7 hechos en `pendiente`, cada uno con su motivo (ver [Qué queda](#qué-queda)).

## v0: los viajes y las cartas de Pablo (hecha)

- Datos verificados en wol.jw.org: los tres viajes misionales, la visita a Jerusalén del 49, la custodia en Cesarea, el viaje a Roma, las catorce cartas, los compañeros de viaje, los emperadores Claudio y Nerón y el procónsul Galión.
- Mapa antiguo propio y mapa actual, con conmutador.
- Cursor de tiempo único, línea de tiempo con zoom y reproducción, marcador de Pablo interpolado sobre la ruta.
- Cartas como arcos con ficha doble, de origen y de destino.
- Fichas con «Por qué lo decimos», fuentes, fecha de consulta y vídeos de jw.org que mencionan el lugar.
- Búsqueda por nombre y por pasaje, con la cronología de la entidad resaltada.
- Estado en la dirección para compartir una vista.
- Compilación a `data.json` y SQLite, validación y comprobación de enlaces en CI, despliegue en GitHub Pages.

## v1: Pedro y el libro de Hechos completo (hecha)

- **Pedro de punta a punta.** Sus sucesos de Hechos 1 a 12, sus dos cartas escritas en Babilonia y lo que no afirmamos (Pedro en Roma, el año de su muerte). Tiene su recorrido guiado de 16 paradas.
- **Todo Hechos.** 83 sucesos ordenados por capítulo y versículo, con Pablo y sin él: Esteban, Felipe, Cornelio, el concilio de Jerusalén, el motín de Éfeso, el naufragio. Los primeros y los últimos años de Pablo van como dos viajes nuevos.
- **Cartas de otros escritores.** Santiago, 1 y 2 Pedro, 1, 2 y 3 Juan, Judas y Apocalipsis, con su escritor. Las cartas llevan destinatarios, portadores y las personas que nombran.
- **Grafo de personas.** Quién viaja con quién, quién es pariente de quién y quién escribe a quién, siempre en la fecha del cursor. La vista de conexión encuentra hasta tres caminos entre dos personas, por ejemplo de Loida a Pablo.
- **Carriles configurables.** Cada persona puede tener su carril en la línea de tiempo y la selección se guarda en la dirección. Hay también carriles de imperios, emperadores, reyes, gobernadores y sumos sacerdotes.

## v2: la vida de Jesús e Israel bajo medos y persas (hecha)

- **Los cuatro evangelios en armonía.** Cada fila de la tabla A7 de la TNM de estudio, de A7-A a A7-H, tiene al menos un suceso con los pasajes de los cuatro evangelios: 128 en total. La última semana va día a día de nisán, y tiene su recorrido de 18 paradas hasta Pentecostés.
- **Judá bajo los medos y los persas.** De Daniel llevado a Babilonia en 617 a.e.c. a Nehemías en 443: 24 personas, sus reinados y el recorrido «De Babilonia a Jerusalén» en ocho paradas. Con el cursor en 520 a.e.c., Jerusalén da Zorobabel, Josué, Ageo y Zacarías.
- **Babilonia a lo largo de los siglos.** De Nemrod a las ruinas, con Alejandro, los seléucidas, los partos y la colonia judía. La ficha tiene una tira con toda la historia de la ciudad y separa lo que dice la Biblia de lo que dice la historia.
- **Lugares inciertos como zonas.** Edén, Ararat, Sinaí, el cruce del mar Rojo, Gólgota, Emaús y otros 23 lugares llevan candidatos: una zona, un punto o una franja, cada uno con su estado y su base.
- **Nombres por época.** El nombre que se ve cambia con la fecha: Afec y Antípatris, Luz y Betel.
- **Cortina** entre el mapa antiguo y el actual, también en el móvil.

## Lo que estaba en «Más adelante» (hecho)

- **Reyes de Judá e Israel.** 43 reyes con su reinado, 16 profetas con su época de actividad y la destrucción de 607 a.e.c. con la fecha secular 587/586 como nota. La línea de tiempo los pone en paralelo, y la sincronía responde quién había en un lugar en la época de un rey.
- **Recorridos guiados.** Son cuatro: «De Babilonia a Jerusalén», «La última semana», «Pedro» y «Cartas y ciudades». Cada uno tiene preguntas de repaso, paradas de «no sabemos» y una hoja para imprimir.
- **Modo presentación.** Pantalla completa, letra grande y avance con flechas o con mando, para tablet o televisor. Hay también un modo reunión.
- **El marco.** Nueve eras, de Adán a la congregación cristiana, las seis potencias de Daniel 2 y los once emperadores de Augusto a Domiciano.
- **Vídeos por pasaje y por persona.** Además de los lugares, cada capítulo enlaza a los vídeos de jw.org que lo citan, en su ficha y en el modo lectura. La ficha de persona enseña también los suyos. El método está en [videos-jw.md](investigacion/videos-jw.md).

## La página «Acerca de» y el calendario (hecho)

- **La portada del mapa, sin jerga.** Arriba solo queda lo que hace falta para leer. En el mapa, la atribución que piden las licencias, corta y con un enlace «Créditos». Las marcas «Nivel 1» y «N1» pasan a ser un punto lleno (la Biblia o jw.org) o un aro (otra fuente que jw.org ha usado), con el nombre en el texto emergente. «Cronología TNM» pasa a la ayuda de la fecha. Las fuentes y «Por qué lo decimos» siguen en cada ficha.
- **[`acerca.html`](../site/acerca.html).** Qué es el proyecto y qué no es, cómo se lee, cómo tratamos las fuentes (enlazar y no copiar, lo más reciente de jw.org gana, por qué cada dato lleva su razón) y las gracias a quienes ponen los datos y los enlaces: wol.jw.org y jw.org, OpenBible.info, Natural Earth, los datos de elevación, OpenFreeMap, OpenMapTiles, OpenStreetMap, MapLibre y las letras, cada uno con su licencia. Cierra con la licencia GPL-3.0 y cómo proponer una corrección.
- **Nuestros meses y los hebreos, a la vez.** A escala de meses y de días la línea de tiempo enseña dos filas alineadas: nuestros meses (el calendario gregoriano aplicado hacia atrás, solo para orientar) y los meses hebreos, de luna nueva a luna nueva, con Veadar los años que lo llevan. A escala de días hay además una fila de fiestas. Un selector elige «Ambos», «Nuestros» o «Hebreos», y la fecha de arriba da las dos: «c. 14 de nisán de 33 e.c. · marzo-abril».
- **Los nombres de los meses cambian con la época.** Antes del exilio la línea dice Abib, Ziv, Etanim y Bul; después, Nisán, Iyar, Tisri y Hesván. Los meses que la Biblia de antes del exilio solo numera van en cursiva, con la nota.
- **[`calendario.html`](../site/calendario.html).** El mes lunar y Veadar, el año sagrado desde Nisán y el civil desde Tisri, el año antes del éxodo, el día de puesta a puesta de sol, los calendarios juliano y gregoriano, y los de Egipto y Babilonia, que la Biblia nombra. Cada hecho lleva su fuente y «Por qué lo decimos». Una tabla da los trece meses con sus nombres por época, su equivalencia aproximada, sus fiestas y el tiempo del campo.

## Qué queda

**Lo primero que se ve.** Al seleccionar a Jesús (o Jerusalén) el encuadre abarca hasta Egipto y Arabia, y los rótulos de Judea se apilan; en el móvil algunos se salen por la derecha. A la vez, con el cursor en el 33 e.c. la línea de tiempo dice «Galilea» mientras la tarjeta «Mientras tanto» dice Perea, y la leyenda sigue titulada «Viajes de Pablo». Son tres arreglos del sitio, no de datos.


### Ideas que dejamos fuera, y por qué

Del [catálogo de ideas](ideas/catalogo-de-ideas.md), 50 ideas quedaron fuera de esta tanda. Los motivos son estos:

- **jw.org no da el dato.** Fronteras y tinte de imperio (M-04, M-05) y costas antiguas (M-06). Un polígono inventado rompe la regla de no dibujar lo que no sabemos, y la pregunta de las fronteras sigue abierta en [ideas](ideas/README.md#preguntas-abiertas).
- **Dependen de ritmos supuestos o de datos que no tenemos.** Distancias y días de viaje (M-18, M-19, A-13), temporada de navegación (M-21), perfil de altitud (M-22) y vista inclinada (M-24).
- **Licencia sin confirmar.** Las calzadas de Itiner-e (M-08) y las imágenes con crédito (F-13), que piden revisar foto a foto.
- **Piden un tipo o una relación nueva con fuentes delicadas.** Genealogías en árbol (G-08), profecía y cumplimiento (G-13), y congregaciones como nodos (G-15, G-18, G-19). La ficha de lugar ya cubre en parte G-19 con su bloque de congregación.
- **Riesgo de copiar.** El glosario (F-12) son definiciones de texto.
- **GitHub Pages no enruta rutas.** Direcciones y páginas por entidad (B-09, B-13). El `#` ya comparte la vista.
- **Solo español.** Otros idiomas y el trabajo sin conexión (D-03, D-04, D-06, D-12, D-13).
- **Necesitan un dato que no tenemos.** La lectura semanal (A-03) pide el programa semanal.
- **Van después de la presentación.** Juegos y modos para niños y para grupos (A-06, A-07, A-08, A-10, A-14, A-15, A-17).
- **Lo urgente ya está cubierto.** Plegar tramos vacíos (T-21) y la línea vertical en el móvil (T-22), porque el minimapa y la densidad resuelven lo más urgente.
- **Aplazadas sin otro motivo.** Fichas apiladas y comparación (F-15, F-16), QR (B-14, que añade una dependencia), paleta de órdenes (B-16), búsqueda por rango y región (B-17), presupuesto de carga (D-05, que solo medimos) y D-14, D-15 y D-16.
- **Falta un campo en el esquema.** Los discursos en su lugar (A-18) necesitan que un suceso diga que es un discurso. Estaba en esta tanda y no se hizo.
- **Son del proceso, no del producto.** P-03, P-05, P-07, P-08, P-09, P-10 y P-11. P-10 ya está en [CONTRIBUTING.md](../CONTRIBUTING.md).

### Trabajo sin terminar

- La ficha de hallazgo no enseña `donde_hoy`. El esquema y la validación lo aceptan, pero ningún hallazgo lo usa todavía.
- La base SQLite no guarda todavía los nombres de los meses por época ni los hechos de «El calendario». Están en `data.json` y en el registro.

### Hechos pendientes

- Tres fechas calculadas por nosotros: Ester reina (489 a.e.c.), el decreto de Hamán (484) y el decreto de Ciro hallado en Ecbátana (c. 520-519).
- La fecha de la inscripción de Poncio Pilato, sacada de su gobierno.
- Perea: Perspicacia no tiene artículo y la zona es un cálculo nuestro.
- Dos paradas de los últimos años de Pablo, Creta y Nicópolis, cuyo orden no es seguro.

### Preguntas que decide el dueño

**Fechas y épocas**

- Egipto no tiene fecha de final ni Asiria de comienzo, porque ninguna fuente de jw.org las da. El sitio las funde y rotula el paso «cambio sin fechar». En ese tramo, la sincronía de un rey como Josías se abre en Egipto porque va primero en los datos. ¿Lo dejamos así?
- Grecia empieza en 332 a.e.c. y Medopersia acaba en 331, así que se solapan un año. El motivo está en la ficha. ¿Vale?
- Roma termina en 476 e.c., según Perspicacia «Roma». ¿Es el final que queremos?
- Los partos entran solo con lo que dice Perspicacia «Babilonia» y «Partos». Cualquier otro rey o suceso parto necesita otra fuente de jw.org.
- Los sucesos de Hechos 3 a 8 van como tramos del relato, verificados, anclados en Pentecostés de 33, la conversión de Saulo y Cornelio. ¿Los dejamos así o los pasamos a fechas derivadas pendientes?
- Los últimos años de Pablo tienen un orden probable con dos paradas pendientes. ¿Lo mantenemos, o quitamos el viaje y dejamos esos años sin trayectoria?
- Cada rey lleva la misma fecha en su ficha de persona y en su periodo. ¿La quitamos de la persona?
- El kislev de Nehemías 1:1 lo unimos al 456 a.e.c. en que la Tabla de los libros empieza el libro. Es el único enlace de este tipo.

**Personas**

- Adán, Noé, Abrahán, Isaac, Jacob, José, Moisés y Josué no tienen ficha de persona, y sus sucesos van sin personas. ¿Los hacemos en otra rebanada?
- ¿Hacemos fichas para Salomé y para los otros cinco de «los siete»?
- Juan en Éfeso va como deducido, porque las fuentes dicen «según se cree». ¿Lo dejamos o lo pasamos a lo que no afirmamos?
- La relación de Herodes Antipas con Herodes el Grande va como deducida, porque sale de la historia y de las notas. ¿Es el criterio que queremos?
- Los ids de reyes llevan sufijo solo donde hay un homónimo («jehoram-de-juda»). ¿Vale, o sufijo en todos?

**Lugares**

- El esquema no tiene tipo para estanque, jardín ni campo, ni uno neutro para Gólgota o Enón. ¿Añadimos tipos?
- Ecbátana, Media y Persia comparten el mismo punto de OpenBible, y Elam comparte el de Susa. Cada ficha lo explica. ¿Aceptamos el punto representativo?
- Jericó está en la ciudad antigua. La del siglo I, 2 km al sur, va en los nombres. ¿Queremos el punto del siglo I?
- Betsaida lleva sus dos candidatos como alternativas, porque Perspicacia no elige.
- Ofir lleva Arabia, África e India como alternativas, siguiendo a La Atalaya de 2010, que es más reciente que Perspicacia.
- El cruce del mar Rojo es un lugar propio. ¿Creamos también `mar-rojo` y colgamos de él los candidatos?
- Los estados de los candidatos: `descartado_nivel_1` cuando la fuente dice que no encaja, `alternativa` cuando solo duda. ¿Es el criterio?
- La inscripción de Galión está anclada en Acaya porque OpenBible no tiene Delfos.
- Usamos «Lakís», como la TNM y Perspicacia, no «Laquis».

**Textos y esquema**

- Nueve títulos de sucesos coinciden en exactamente 8 palabras con la fila de la tabla A7 o del libro «Jesús». ¿Los aceptamos como etiquetas cortas o los reescribimos?
- El campo nuevo de las cartas con las personas que nombran se llama `personas`. ¿O preferimos `mencionadas`?
- El capítulo 69 del libro «Jesús» no tiene página en wol.jw.org. Da 404.

**Vídeos**

- La herramienta de descarga no pide los subtítulos de 50 medios sin número de pista, entre ellos las lecturas dramatizadas y los relatos bíblicos. ¿La cambiamos?
- «Pablo», «Pedro» o «Esteban» también son nombres de personas de hoy, y «Jesús» sale en casi cualquier vídeo. ¿Aceptamos ese ruido o limitamos esas formas?

**Sitio**

- Sin nada en la dirección, el sitio abre en la portada y no en el mapa del año 50. ¿Vale?
- La línea de tiempo llega hasta 4026 a.e.c., pero sin `t` en la dirección la vista abre en 30-70 e.c. ¿Abrimos en toda la historia?
- En escritorio, el grafo y la conexión tapan el 64 % izquierdo del mapa.
- «Babilonia en tiempos de Jesús» abre en el punto medio de su vida. ¿Preferimos su ministerio, de 29 a 33?
- El mapa antiguo enseña por defecto el nombre moderno al lado («hoy Salónica»). ¿Lo queremos limpio, como en v0?
- Un rótulo que el borde del mapa cortaría ahora se oculta. ¿Vale?
- Los meses hebreos de la línea son un cálculo nuestro: lunas nuevas medias, Nisán con la luna nueva más cercana a mediados de marzo y el día desde las 18:00. Con él, el 14 de nisán de 33 cae hacia el 2 de abril y los 81 sucesos con mes hebreo se mueven hasta unas dos semanas respecto a la regla fija de antes, sin cambiar de año ni de orden. ¿Lo dejamos así?
- Con t = 36,0, `donde('pedro')` da Lida, que es lo que dicen los datos (Hch 9:32). La comprobación que esperaba Jope o Cesarea debería usar 36,5 o 36,8.

### Revisión anual

Una vez al año, lo que [`scripts/revisar.py`](../scripts/revisar.py) marque como leído hace más de un año se vuelve a leer, y los índices de vídeos se regeneran con los subtítulos nuevos.
