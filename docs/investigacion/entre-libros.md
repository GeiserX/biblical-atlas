# Pendientes entre libros

Cosas que un libro deja decididas o a medias y que otro libro tiene que respetar o cerrar. El lector y el escritor de cada libro leen esta lista antes de empezar y quitan lo que cierran.

Los campos, los tipos de relación y sus palabras se nombran como en el esquema en inglés ([`modelo.md`](modelo.md) y [`data/vocabulary.yaml`](../../data/vocabulary.yaml)). Una propuesta de formato 1 puede escribirlos así o con el nombre antiguo: `apply.py` traduce los dos.

## Para todos los libros

- **Nombres que solo dan las notas de estudio.** Van en `mentions` cuando la nota los identifica con lo que dice el versículo: a quién se refiere, dónde o cuándo pasó, qué suceso recuerda (en 1Co 15:5-8, Tomás, Galilea y Damasco). No van los que la nota usa para explicar una palabra, comparar o poner ejemplos de otras historias, ni los escritores de los relatos paralelos.
- **El autor de una cita.** Si el texto bíblico no lo nombra, se queda en la `note` del tramo aunque la nota de estudio lo nombre (Elifaz en 1Co 3:19, Isaías en 1Co 14:21), como en Romanos. Si el texto lo nombra, va en `mentions`.
- **Una referencia marginal sola** no pone un suceso en `mentions`, igual que no da nombre a una persona (`versiculos.md`, sección 4). Hace falta que el texto cuente el suceso o que una publicación ligue ese versículo a él. Jeremías lo aplicó en todo el libro.
- **Una identificación que la nota solo ve posible** («podría ser la misma ocasión») deja el suceso en `mentions`, sin añadirle el pasaje. Si la da por probable o «al parecer», el pasaje entra.

## Para 2 Crónicas

- **Zacarías, hijo de Jehoiadá.** Su muerte (2Cr 24:20-22) va en `monte-moria`, el patio del templo, como la puso Mateo. Si Crónicas prefiere `jerusalen`, que se acuerde una sola relación `died_in`. Su parentesco con Jehoás también es de Crónicas.

## Para Esdras y Hageo

- **Zorobabel.** Su relación con David es `kin` con la palabra `ancestor` (antes decía «descendiente de David», al revés). Abiud va como antepasado suyo, no como hijo, porque Perspicacia «Abiud» lo deja abierto.
- **Resá, Sealtiel y Nerí.** `resa` (Lu 3:27) va como descendiente de Zorobabel, con la palabra `ancestor`, igual que Abiud. `sealtiel` lleva a `neri` con la palabra `relative`, pariente sin grado, porque Perspicacia solo ve posible que fuera su yerno.

## Para Números

- **Jetró es Reuel.** Nú 10:29 lo llama Reuel: es `jetro` (clave `1200002454`), no `reuel-hijo-de-esau`.
- **Coré.** La rebelión y la muerte de `core-hijo-de-izhar` (Nú 16) las crea Números.
- **Masá y Meribá.** `masa` es el sitio de Refidim (Éx 17). La Meribá de Nú 20 es `meriba-de-cades`.
- **El tabernáculo.** Nú 7:1 está en los `passages` de `se-monta-el-tabernaculo`, y Nú 9:15, 16 en los de `la-gloria-de-jehova-llena-el-tabernaculo`: van en los tramos de esos capítulos.
- **Quieren volver a Egipto (Nú 14:3, 4).** Hch 7:39 lo recuerda. El suceso que cree Números añade «Hch 7:39» a sus pasajes y va en el tramo 39-43 de Hechos 7.
- **Las etapas de Nú 33.** Los ids ya creados son `rameses`, `sucot-de-egipto`, `ezam`, `pihahirot`, `migdol`, `baal-zefon`, `cruce-del-mar-rojo`, `mara`, `elim`, `mar-rojo`, `desierto-de-sin`, `refidim` y `desierto-de-sinai`. Los sucesos son `exodo` (la salida), `israel-cruza-el-mar-rojo`, `jehova-endulza-el-agua-de-mara`, `israel-acampa-en-elim` y `codornices-y-mana-en-el-desierto-de-sin`.
- **El día de la salida.** Nú 33:3 dice que salieron de Ramesés el día 15. `exodo` se queda en el 14 de nisán: Perspicacia «Éxodo» pone el comienzo de la marcha hacia Sucot antes de que acabara el 14.
- **La serpiente de cobre (Nú 21:8, 9).** Jn 3:14 la recuerda. Cuando Números cree el suceso, va en `mentions` del tramo Juan 3:11-21.

## Para Deuteronomio

- **Pasajes paralelos ya puestos en sucesos de Éxodo.** Dt 5:4-27 en `diez-mandamientos`; Dt 9:9 en `primeros-cuarenta-dias-de-moises-en-el-sinai`; Dt 9:10, 11 en `dios-da-a-moises-las-tablas-del-testimonio`; Dt 9:12-14, 19, 26-29 en `moises-ruega-por-el-pueblo`; Dt 9:15-17, 21 en `moises-rompe-las-tablas`; Dt 9:16 en `becerro-de-oro`; Dt 9:20 en `moises-pide-perdon-por-el-pueblo`; Dt 9:18, 25 y Dt 10:1-5, 10 en `moises-recibe-las-segundas-tablas`, porque los 40 días postrado de Dt 9:18 y 9:25 son los segundos (Éx 34:28). Cada uno va en el tramo de su capítulo.
- **Masá.** Dt 6:16, 9:22 y 33:8 hablan del sitio de Refidim: `masa`.

## Para Nehemías, Hechos y Hebreos

- **Pasajes paralelos ya puestos.** Ne 9:18 y Hch 7:40, 41 en `becerro-de-oro`. Hch 7:17-19 en `egipto-esclaviza-a-israel`; Hch 7:19 en `el-faraon-manda-echar-al-nilo-a-los-ninos`; Hch 7:20-22 y Heb 11:23 en `nacimiento-de-moises`; Hch 7:23, 24 y Heb 11:24-26 en `moises-mata-a-un-egipcio`; Hch 7:25-29 en `moises-huye-a-madian`; Hch 7:29 en `nacimiento-de-guersom`; Hch 7:30-35 en `moises-ante-la-zarza-ardiente`.

## Para 2 Timoteo

- **Áquila y Priscila con Pablo.** Su relación `accompanies` con `pablo` va de c. 50 a 65 (Ro 16:3, 4; Perspicacia «Prisca»), con la palabra `fellow_worker`, y ya cita 1Co 16. 2Ti 4:19 añade su capítulo a las fuentes de esa relación, sin crear otra.
- **Janes y Jambres.** Los magos del faraón (Éx 7:11, 22) no tienen ficha. Si 2Ti 3:8 los crea, el tramo 7:8-13 de Éxodo los puede poner en `mentions`.

## Para Ezequiel

- **Migdol.** `migdol` es el lugar de Éx 14:2 y Nú 33:7. La ciudad egipcia de Jer 44:1 y 46:14 es `migdol-de-los-profetas` (Perspicacia «Migdol», núm. 2), con el punto incierto de Tell el-Heir: Ez 29:10 y 30:6 usan ese id.

## Para 2 Timoteo y Tito (desde 1 Timoteo)

- **Alejandro.** Existen `alejandro-hijo-de-simon` (`1200000192#2`, Mr 15:21), `alejandro-pariente-de-anas` (`#3`, Hch 4:6), `alejandro-de-efeso` (`#4`, Hch 19:33) y, desde 1Ti 1:20, `alejandro-expulsado` (`#5`), con `distinct_from` entre los cuatro. El calderero de 2Ti 4:14 es la entrada núm. 6: ficha nueva (`alejandro-calderero`, el rasgo de Perspicacia), con `distinct_from` en las dos fichas hacia los tres primeros y un `same_as` hacia `alejandro-expulsado` con `inferred: true` y `certainty: possible` (Perspicacia «Alejandro», núm. 5, y la nota de 1Ti 1:20), en la ficha de `alejandro-calderero`, cuyo id va primero. Ese par no lleva `distinct_from`; la `disambiguation` de `alejandro-expulsado` ya nombra al calderero.
- **Himeneo.** `himeneo` (`1200002120`) existe desde 1Ti 1:20; 2Ti 2:17, 18 usa ese id y crea a Fileto. Su expulsión es `pablo-expulsa-a-himeneo-y-alejandro`, c. 56-64, `pending`: ni el texto ni las fuentes dicen dónde, va en Éfeso con `present: []`, y su orden 2844 de la serie `hechos` es deducción nuestra. `himeneo` y `alejandro-expulsado` llevan esa fecha, c. 56-64; si 2Ti 2:17 pone a Himeneo hacia 65, su `date.to` se alarga con un `cambiar`. 2Ti 2:17 no narra la expulsión; si su tramo la nombra, va en `mentions`.
- **Timoteo en Éfeso.** `timoteo/lived_in/efeso` va de c. 61 a 64 (1Ti 1:3; Perspicacia «Timoteo», párr. 6). Si 2 Timoteo lo sigue poniendo allí hacia 65, alarga `date.to` con un `cambiar` de la lista `relations`; `apply.py` funde un `anadir` con otro `date.from` como un tramo nuevo. `timoteo/accompanies/pablo` ya lleva `fellow_worker` y llega a 65.
- **El cargo de superintendente.** El vocabulario no tiene `overseer`. Las notas de 1Ti 1:3 y 4:14 llaman superintendente a Timoteo, y Tit 1:5 encarga a Tito nombrar ancianos: ninguno lleva `holds_office`, como Eliaquim y Sebná desde Isaías. El resumen de `timoteo` lo dice. Si se añade el cargo, la relación cita 1Ti 1 y 4.
- **El orden entre las dos cartas.** En la serie `hechos`, `pablo-expulsa-a-himeneo-y-alejandro` lleva el 2844, `pablo-deja-a-timoteo-en-efeso` el 2845 y `pablo-escribe-1-timoteo` el 2850 (Macedonia, c. 61-64). Ninguna fuente ordena 1 Timoteo frente a Tito: los sucesos de Tito toman otros números y su `note` dice por qué. Las paradas 2 (Creta) y 3 (Éfeso) de `ultimos-anos-de-pablo` dicen ahora «orden incierto». El suceso de 2 Timoteo (Roma, c. 65) va después del 2850.

## Para Ezequiel (fronteras)

- **Fronteras.** Ez 47 y 48 usan `zedad`, `hazar-enan` (Hazar-Enón está en `names`) y `lebo-hamat`.

## Para Nehemías

- **Itiel.** `itiel-oyente-de-agur` (clave `1200002237#1`, Pr 30:1) ya existe. El benjamita de Ne 11:7 es la entrada núm. 2 de Perspicacia «Itiel» (`1200002237#2`): va en ficha aparte, con `distinct_from` en las dos.
- **La Puerta de las Ovejas (Ne 3:1, 32; 12:39).** Desde Jn 5:2 es un nombre de `jerusalen`, con su nota. Se reutiliza, sin ficha propia.

## Para Números, Deuteronomio y Josué

- **Hesbón.** `hesbon` existe desde Can 7:4, con su puerta Bat-Rabim en `names`. Falta en `sehon` la relación `lived_in` `hesbon` (Nú 21:26; Perspicacia «Hesbón», párr. 2), y los sucesos de su conquista.
- **Amaná y Senir.** Amaná es un nombre de `antilibano` (Can 4:8); Senir sigue en `monte-hermon`.

## Para Nehemías

- **La torre de David.** Está en `names` de `jerusalen` desde Can 4:4, con una nota: Perspicacia «Torre» recoge que quizá sea la torre de la Casa del Rey de Ne 3:25. Si Nehemías apunta esa torre, la relaciona con esta nota.

## Para quien reabra Oseas

- **Salmán.** `salman` (Os 10:14) lleva un `same_as` con `status: pending`, aún sin `certainty`, hacia `salmanasar-v`: Perspicacia «Salmán» solo lo da como probable.

## Para Josué y Amós (desde Oseas)

- **Guilgal.** Am 4:4 y 5:5 usan `guilgal-cerca-de-betel`, cuya `reason` los cita. La Guilgal junto a Jericó (Perspicacia «Guilgal», núm. 1) no tiene ficha: la crea Josué con otro id, y las dos llevan `distinct_from`.

## Para Josué y Jueces (desde Oseas)

- **Mizpá de Galaad.** `mizpa-de-galaad` (Perspicacia «Mizpá, Mizpé», núm. 4) cita Jue 11:34 en su `reason`. Jueces 10-11 la usa y añade `jefte` `lived_in` `mizpa-de-galaad`.
- **Valles.** `valle-de-acor` (Os 2:15) es el de Acán (Jos 7:24-26; 15:7) y `valle-de-jezreel` (Os 1:5) el de Jos 17:16 y Jue 6:33.
- **Guibeá.** Os 9:9 y 10:9 aluden al crimen de Jue 19-20 (Perspicacia «Guibeah», núm. 2). Cuando Jueces cree el suceso, va en `mentions` de los tramos Oseas 9:7-9 y 10:9-10.

## Para Números y Deuteronomio (desde Oseas)

- **Baal de Peor.** Os 9:10 alude a Nú 25: el suceso va en `mentions` del tramo Oseas 9:10-14.
- **Admá y Zeboyim.** `destruccion-de-sodoma-y-gomorra` no las lleva en `places`, aunque Dt 29:23 las pone con Sodoma y Gomorra. Deuteronomio decide.

## Para Ezequiel y los demás profetas (desde Oseas)

- **Menfis.** `menfis` lleva Nof en `names`: Ez 30 usa ese id, como ya Is 19:13 y Jer 2:16, 44:1 y 46:14.
- **Profecías sin escena.** Oseas 4-14 lleva un solo suceso, `juicios-profeticos-contra-efrain-y-juda` (Os 4:1-14:9, la sección de «Toda Escritura»), con fecha narrativa de la obra del profeta y `present: []`. Cada tramo lo pone en `entities`.
- **«David su rey».** Os 3:5 lleva `person:david` y `person:jesus` en `mentions`: el nombre es el del rey histórico, y La Atalaya de 1991 lo aplica a Jesucristo, descendiente de David. Am 9:11 la sigue: Perspicacia «Cabaña» une la cabaña de David a Jesús, rey de su línea. Jer 30:9 la siguió; Ez 34:23, 24 y 37:24, 25 siguen la misma regla.
- **Alusiones al éxodo.** Los versículos que Perspicacia da como alusión a la salida de Egipto (Os 2:15; 11:1; 12:13) van en `passages` de `exodo` y en `entities`. La fórmula «tu Dios desde la tierra de Egipto» (Os 12:9; 13:4) va solo en `mentions`. Amós añade un caso: los versículos que afirman con sus palabras que Jehová sacó a Israel de Egipto (Am 2:10; 3:1; 9:7) van en `passages`, aunque Perspicacia no los cite. Miqueas lo hizo con Miq 6:4. Míriam no entra en `people` de `exodo`: sus pasajes son la noche de la salida, y el canto de Éx 15:20, 21, que es lo que recuerda La Atalaya de 2003, ya es `israel-canta-junto-al-mar-rojo`. Si Éxodo la quiere en `exodo`, lo explica en la `reason` del suceso.
- **La fecha del libro.** `data/books.yaml` toma sus fechas solo de la tabla de libros (`tnm-tabla`), que pone Oseas «después de 745». Perspicacia «Oseas, Libro de» lo cierra entre 745 y 740: ese límite va en la `reason` de los sucesos, no en `books.yaml`.

## Para Hechos y Romanos (desde Joel)

- **Joel 2:28-32 en Pentecostés.** El tramo Joel 2:28-32 lleva `pentecostes-33` en `mentions`, y Joe 2 no está en sus `passages`. Hch 2:16 nombra al profeta: `joel-profeta` (clave `1200002481#9`) va en `mentions` de ese tramo de Hechos. Ro 10:13 aplica Joe 2:32.

## Para los demás profetas (desde Joel)

- **Un suceso por libro.** Amós lo siguió con `amos-profetiza-contra-israel` (Am 1:1-9:15), y su escena con Amasías en Betel es un suceso aparte. Joel lleva uno solo, `joel-anuncia-el-dia-de-jehova` (Joe 1:1-3:21), anclado en c. 820 a.e.c. (?) y con `present: []`, como Oseas 4-14.
- **Las langostas de Joel 1 y 2.** Manda La Atalaya de abril de 2020 (`w20-ataque-del-norte`): son el ejército babilonio que tomó Jerusalén en 607 a.e.c., y no son las langostas de Ap 9. Los tramos Joel 1:2-4, 1:5-12, 2:1-11 y 2:18-27 llevan `destruccion-de-jerusalen-607` en `mentions`.
- **Grecia.** `grecia` existe desde Joe 3:6 (OpenBible a4492a0, con Javán en `names`). Ez 27:13, Da 8:21, 10:20, 11:2 y Hch 20:2 usan ese id cuando hablan de la tierra, como Is 66:19.
- **El valle de Jehosafat y el de la Decisión** (Joe 3:2, 12, 14) no llevan ficha: Perspicacia «Jehosafat, Llanura baja de» y La Atalaya de 2007 los llaman lugar simbólico.
- **Sitim.** `sitim` es Perspicacia «Sitim», núm. 1 (Nú 25:1; 33:49; Jos 2:1; 3:1; Miq 6:5) y `valle-de-las-acacias` el núm. 2 (Joe 3:18). Cada una dice en `not_claimed` que no es la otra.

## Para 2 Crónicas y Ezequiel (desde Joel)

- **Ríos que salen del templo.** La adoración pura, recuadro 19A (`rr-rios-de-bendiciones`), lee el manantial de Joe 3:18, el río de Ez 47 y las aguas de Zac 14:8 como figura de las bendiciones de Jehová. Zacarías ya la cita en `zacarias-anuncia-que-jehova-guerreara-y-reinara`; Ezequiel puede citarla.
- **Sucesos que Joel 3 recuerda.** La victoria de Jehová en días de Jehosafat (2Cr 20) va en `mentions` del tramo Joel 3:1-3. El saqueo de filisteos y árabes (2Cr 21:16, 17) va en el tramo Joel 3:4-6. La caída de Tiro ante Nabucodonosor, y la de la isla ante Alejandro, en el tramo Joel 3:7-8.

## Para quien reabra Éxodo, Números o Deuteronomio

- **El fin del maná.** Éx 16:35 no está en `cesa-el-mana` (Jos 5:12) porque Éxodo 16 ya estaba cerrado: al reabrirlo, se añade el pasaje y el suceso va al tramo.
- **Anac en Deuteronomio.** Dt 9:2 cita el dicho sobre los hijos de Anac. Desde Josué existe la persona `anac` (Jos 15:13): al reabrir Deuteronomio, va en `mentions` del tramo Dt 9:1-6.

## Para quien reabra los Evangelios (desde Josué)

- **Queriyot-hezrón.** Existe `queriyot-hezron` (Jos 15:25). Perspicacia «Judas», núm. 4, solo ve probable que Judas Iscariote y su padre fueran de allí, y los Evangelios no lo dicen: `judas-iscariote` y `simon-iscariote` no llevan relación con ese lugar.

## Para Nehemías

- **Dibón de Judá.** El Dibón de Ne 11:25 es la entrada núm. 2 de Perspicacia y lleva otro id que `dibon`.

## Para Ester

- **Abiháil.** `abihail-padre-de-zuriel` es la entrada núm. 1 de Perspicacia. El padre de Ester es la núm. 5: otro id y `distinct_from` en las dos.
- **Jaír.** `jair-hijo-de-segub` es la entrada núm. 1 de Perspicacia «Jaír». El padre de Mardoqueo (Est 2:5) es la núm. 3: otro id y `distinct_from` en las dos.

## Para las Escrituras Griegas

- **Pasaje ya puesto.** Jud 11 está en `muerte-de-core`.
- **Una cita literal de las Escrituras Hebreas.** Si la carta la usa como mandato que sigue en vigor o dice algo del propio texto citado, su pasaje entra en el suceso y el suceso en `entidades`: Ro 7:7, Ro 13:9 y Ef 6:2, 3 en `diez-mandamientos` (Ef 6:2 lo llama el primer mandato con promesa). Si solo toma la frase como apoyo de un consejo, el suceso va en `menciona` sin pasaje: Gé 2:24 en 1Co 6:16 y Ef 5:31, con `creacion-de-eva`.
- **Pasajes que aún no están en ningún suceso.** Hch 7:36 y 13:18, Heb 3:16-19 y Jud 5 van a `jehova-condena-a-israel-a-40-anos-en-el-desierto`; Ap 2:14 y Os 9:10 a `israel-adora-al-baal-de-peor`; 2Pe 2:15, 16 a `la-burra-de-balaam-habla`; Heb 9:4 nombra la vara de `la-vara-de-aaron-echa-brotes`. Miq 6:5 nombra `balac`, `balaam` y `sitim`.

## Para Deuteronomio, Josué y Jueces

- **El monte Guerizim.** Existe `monte-guerizim` desde Jn 4:20 (punto de OpenBible `a30e967`). Dt 11:29, 27:12, Jos 8:33 y Jue 9:7 usan ese id.

## Para Hechos

- **La colecta para Jerusalén.** `colecta-de-macedonia-y-acaya` existe desde Ro 15:25-28, 31, que es su dueño porque Hechos solo la recuerda en un discurso (Hch 24:17). 1 Corintios y 2 Corintios (1:16; 8:1-15; 9:1-15) ya pusieron sus pasajes. 2Co 8:10 y 9:2 adelantan su comienzo: la fecha es derivada, c. 54-56, y el suceso queda pendiente. Si se relee Hechos 24, «Hch 24:17» entra igual en el tramo 10-21.
- **La ayuda de Macedonia en Corinto.** `crispo-cree` (Hch 18:5-8) lleva «2Co 11:9», porque «Testimonio completo», cap. 19, párr. 8, dice que Silas y Timoteo trajeron esa ayuda. Si Hechos hace de su llegada un suceso propio, el pasaje pasa a él y el tramo 7-11 de 2 Corintios 11 lo nombra.
- **Troas camino de Macedonia (2Co 2:12, 13).** La parada tiene suceso propio, `pablo-predica-en-troas-y-no-encuentra-a-tito`, y es la parada 5 de `tercer-viaje` (las de después se renumeraron). `pablo-deja-efeso-hacia-macedonia` sigue con «2Co 2:12, 13» en `passages` y en su `reason`; Hechos 20 puede quitarlo con un `cambiar`, y entonces ese suceso pasa a `mentions` del tramo 12-13 de 2 Corintios 2.
- **Pablo en Siria y Cilicia (desde Gálatas).** Gálatas creó `pablo-predica-en-siria-y-cilicia` (Gál 1:21-24, c. 36-45, tras `pablo-enviado-a-tarso`), porque Hechos no cuenta esos años. Si se relee Hechos 15, las congregaciones de Siria y Cilicia de Hch 15:23, 41 pueden nombrarlo en `mentions`.
- **La llegada a Antioquía (desde Gálatas).** `cristianos-en-antioquia` va de 36 a 46. La nota de Gál 1:21 pone la llegada de Pablo y Bernabé hacia 45 y la de Hch 11:26 el nombre de cristianos quizás en 44. Si Hechos lo estrecha, cambian también las paradas 7 y 8 de `primeros-anos-de-pablo` y `pablo/lived_in/tarso` (36-46).
- **Juan en Jerusalén (desde Gálatas).** `juan-apostol` lleva `lived_in` `jerusalen`, c. 33-49, por Perspicacia «Juan», párr. 30, y Gál 2:9; no cita Hch 8:1. Hechos 8 puede añadir «hechos-8» a sus fuentes y ponerla en su tramo 1-3. Juan está en `concilio-de-jerusalen-49`, pero su ficha no cita Hechos 15.
- **Pedro corregido en Antioquía (desde Gálatas).** `pablo-corrige-a-pedro-en-antioquia` es de c. 49, anclado en la nota de Gál 2:12, con `narrative_order` 1535 tras `la-carta-de-jerusalen-llega-a-antioquia`. Está entre Hch 15:35 y la separación de Pablo y Bernabé.

## Para 1 Corintios (si se relee) y 2 Timoteo

- **El peligro de Asia.** 2 Corintios hizo de la tribulación de 2Co 1:8-11 un suceso propio, `pablo-en-peligro-de-muerte-en-asia`, y sacó «2Co 1:8» de `motin-de-efeso`: la nota de estudio solo ve posible que fuera el motín o las fieras de Éfeso. El tramo de 1Co 15:32 lo puede poner en `mentions`, sin añadirle el pasaje.
- **Áquila y Priscila con Pablo.** Su relación `accompanies` con `pablo` va de c. 50 a 65 (Ro 16:3, 4; Perspicacia «Prisca»), con la palabra `fellow_worker`. 1Co 16:19 y 2Ti 4:19 añaden su capítulo a las fuentes de esa relación, sin crear otra.

## Para quien toque `ultimos-anos-de-pablo` o la serie `hechos` tras 61 (desde Tito)

- **Paradas 4 y 5 de `ultimos-anos-de-pablo`.** La razón de la parada 4 dice que Perspicacia cree que Pablo escribió 1 Timoteo y Tito desde Macedonia; para Tito, Perspicacia «Tito, Carta a» solo lo ve posible y la Tabla pone «Macedonia (?)». La nota de la parada 5 atribuye a «algunos» el arresto en Nicópolis, que es Perspicacia «Nicópolis» quien ve posible. Tito no las cambió para no chocar con 2 Timoteo: se corrigen con un `cambiar` de la lista de ocho paradas.
- **El orden de Tito.** En la serie `hechos`, `tito-queda-en-creta` lleva el 2842 y `pablo-escribe-tito` el 2851, tras 1 Timoteo (2850) y antes de Troas (2852) y Mileto (2853). Ninguna fuente lo fija: es elección nuestra y la `note` de cada suceso lo dice. `pablo-escribe-tito` va con `present: []`, porque la Tabla duda de Macedonia.
- **Apolos tras 1 Corintios.** `apolos` va de 52 a 64 y cita Tit 3, pero solo tiene un tramo `accompanies` con `pablo`, el de c. 55: ninguna fuente los pone juntos en 61-64. Una relación con `caption` para Tit 3:13 está en las preguntas de Tito.
- **Ártemas y Zenas.** `artemas` (`1200000390`) y `zenas` (`1200004695`) existen desde Tit 3:12, 13. Zenas es experto en la Ley; el vocabulario no tiene ese cargo y queda en su resumen y en las preguntas de Tito.
- **Lo que deja 2 Timoteo para Tito.** Al integrar el PR 157, sus puntos «El orden de las cartas a Timoteo» y «Las paradas de `ultimos-anos-de-pablo`» quedan cerrados por Tito y se quitan, salvo las paradas 4 y 5 de arriba. «El cargo de superintendente» pasa a las preguntas de Tito.

## Para 2 Crónicas (desde Josué)

- **Zaretán.** `zaretan` (Jos 3:16); Perspicacia no asegura que la Zeredá de 2Cr 4:17 sea otra grafía, así que no va en `names`.

## Para Nehemías (desde Josué)

- **Ciudades de Judá y Benjamín (Ne 11:25-36).** Reutilizan los ids de Jos 15 y 18: `cabzeel`, `molada`, `bet-pelet`, `hazar-sual`, `ziclag`, `zanoah`, `adulam`, `lakis`, `azeca`, `zora`, `jarmut`, `gueba` y los demás.

## Para Oseas (desde Josué)

- **Bet-Aven.** La de Jos 7:2 y 18:12 es `bet-aven` (Perspicacia núm. 1). La de Os 4:15; 5:8; 10:5 (núm. 2) sigue como nombre de `betel`.

## Para Hechos, Hebreos y Santiago (desde Josué)

- **Pasajes sin poner.** Hch 7:44, 45 (el tabernáculo entra con Josué) puede ir en `entrada-en-canaan`; Hch 7:15, 16 y Heb 11:22, en `entierran-los-huesos-de-jose-en-siquem`.

## Para Nehemías (desde 1 Samuel)

- **Nob (Ne 11:32).** Usa `nob`.

## Para 2 Crónicas (desde Jueces)

- **Etam.** `penasco-de-etam` es Perspicacia «Etam», núm. 2 (Jue 15). La Etam de 2Cr 11:6 (núm. 3) es `etam-de-juda`, que creó 1Cr 4:3; la de Simeón (1Cr 4:32, núm. 1) es `etam-de-simeon`.

## Para Ezequiel (desde Jueces)

- **Minit.** El trigo de Minit (Ez 27:17) usa `minit`.

## Para Hebreos (desde Jueces)

- **Los jueces de Heb 11:32-34.** Gedeón, Barac, Sansón y Jefté son `gedeon`, `barac`, `sanson` y `jefte`; van en `mentions` del tramo.

## Para Salmos (desde 2 Samuel)

- **Cus el benjaminita.** Existe (`cus-el-benjaminita`) desde el Salmo 7. Perspicacia duda entre la corte de Saúl y Simeí, y 2 Samuel no lo aclara: ningún tramo lo nombra. Si otro libro lo decide, se añade la relación.

## Para Ezequiel (desde 2 Samuel)

- **Berotá (Ez 47:16).** Reutiliza `berota`.

## Para Génesis y Éxodo (si se releen, desde Gálatas)

- **El pacto con Abrahán y el Éufrates.** La nota de Gál 3:17 y Perspicacia «Pacto» dicen que el pacto entró en vigor cuando Abrahán cruzó el Éufrates, en 1943 a.e.c. `pacto-con-abrahan` solo lleva `haran` en `places`; Génesis 12 puede añadir `rio-eufrates`.
- **El mes del pacto de la Ley.** Gálatas corrigió el resumen de `pacto-de-la-ley`: los 430 años se cumplieron el día del éxodo, y el pacto llegó en el tercer mes (Éx 19:1). Éxodo 19 o 24 puede darle `date.detail` con `month: sivan`.
- **Sara e Ismael en Gál 4.** El texto no los nombra, solo las notas: van en `mentions` y sus fichas no citan Gálatas 4. Isaac, Agar y Abrahán sí se nombran.

## Para Filemón (desde Efesios y Colosenses)

- **El orden en Roma.** En la serie `hechos`, `pablo-escribe-efesios` lleva el 2831, `pablo-escribe-colosenses` el 2832 y el viaje de Tíquico el 2834. El suceso de escribir Filemón, que salió con Tíquico y Onésimo, usa el 2833. Filipenses tomó el 2835, el 2839 y el 2840. `epafras-informa-a-pablo-en-roma` (c. 59-61) comparte el 2831 con Efesios (c. 60-61): `build.py` ordena primero por fecha, así que ese número solo lo pone tras `pablo-predica-dos-anos-en-roma` (2830) y antes de `epafrodito-lleva-a-pablo-el-regalo-de-filipos` (2835), que tienen su misma fecha.
- **Epafras (Flm 23).** `epafras/accompanies/pablo` ya cita Filemón. Colosenses le dio `epafras/lived_in/roma` y su clave `1200001379`; Flm 23 añade `filemon-1` a esa relación con un `anadir`.
- **Claves y Arquipo.** Colosenses puso la clave `perspicacia` de `onesimo`, `filemon`, `demas` y `arquipo`, y corrigió la relación de Arquipo con Filemón, que decía «quizás hijo» al revés: pasó a «quizás padre», hoy `kin` con la palabra `father` y deducida (Perspicacia «Filemón», párr. 2). Un cambio posterior a las relaciones de `arquipo` parte de esa lista.
- **Colaboradores en Roma.** Col 4:11 llama colaboradores a Aristarco y a Marcos, y Flm 24 añade a Demas y a Lucas. Colosenses cambió las listas enteras de relaciones de `aristarco` y `juan-marcos` (su `accompanies` con `pablo` de Roma lleva la palabra `fellow_worker`) y la de `lucas`, cuya relación de 56-61 cita ya `colosenses-4`. Filemón hace lo mismo con `demas` (60-61) y con esa relación de `lucas`, que suma `filemon-1` y `fellow_worker`, partiendo de las listas de hoy. Un `anadir` no sirve: `apply.py` junta la relación con la primera del mismo tipo y la misma persona.
- **Personas que ya existen.** `jesus-justo` (clave `1200002450#4`) y `ninfa` (`1200003284`) los creó Colosenses. Apfia (Flm 2) no tiene ficha; cuando exista, puede ir en `mentions` del tramo 17 de Colosenses 4, cuya nota la nombra.
- **La carta a Laodicea (Col 4:16).** No es un suceso: el texto no dice cuándo ni desde dónde la escribió Pablo, y `validate.py` (`pablo_en_su_sitio`) no acepta un suceso de Pablo en un sitio donde no estaba. Queda como mención en la nota del tramo 15-16, sin suceso, hasta que una fuente diga desde dónde la escribió Pablo.

## Para Filemón y Hebreos (desde Filipenses)

- **Timoteo en Roma.** `timoteo/lived_in/roma`, c. 60-61, deducida de la nota de Flp 1:1 y de Perspicacia «Timoteo», párr. 5, que lo pone en el saludo de Filipenses, Colosenses y Filemón, ya está en la ficha, y Col 1:1 le añadió `colosenses-1`. Flm 1 añade `filemon-1` a sus fuentes con un `anadir`, sin crear otra.
- **Colaboradores de Pablo.** Cuando el texto llama a alguien colaborador de Pablo, su `accompanies` lleva la palabra `fellow_worker`: Epafrodito (Flp 2:25) y Clemente (Flp 4:3). Evodia y Síntique (Flp 4:3) llevan `caption: colaboradora`, porque el vocabulario no tiene palabra femenina. Desde 1 Timoteo, `timoteo/accompanies/pablo` (c. 49-65) también lleva `fellow_worker`, porque Ro 16:21 lo llama colaborador. «Como un hijo con su padre» (Flp 2:22) es una comparación, no parentesco.
- **Timoteo preso.** Perspicacia «Timoteo», párr. 5, dice que parece que estuvo preso en Roma entre Filipenses y Hebreos (Flp 2:19; Heb 13:23). Flp 2:19-23 solo cuenta que Pablo pensaba enviarlo a Filipos, sin suceso; Hebreos decide si su liberación es un suceso.

## Para Salmos (si se relee, desde Efesios)

- **Sl 68:18.** La nota del tramo 15-18 sigue a La Atalaya de 2006: los cautivos serían de la conquista de Canaán, y el tramo lleva `conquista-de-canaan` en `mentions`. La nota de estudio de Ef 4:8, más reciente, dice que el salmo celebra la toma de Jerusalén (Sion) por David, y la referencia de Sl 68:18 lleva a 2Sa 5:7. Manda la más reciente: se corrige la nota, se quita esa mención y se pone `david-rey-de-todo-israel` (2Sa 5:1-10, 1070 a.e.c.), que ya existe y lleva la toma de Jerusalén. Ef 4:7-10 ya lo tiene en `mentions`.

## Para Hechos (si se relee, desde Efesios)

- **Las cartas escritas en Roma.** El tramo Hch 28:30, 31 ya nombra `letter:efesios` y `letter:colosenses` en `mentions`; puede nombrar también `pablo-escribe-efesios`, `pablo-escribe-colosenses` y `epafras-informa-a-pablo-en-roma` (c. 59-61, durante esos dos años).

## Para Hechos (si se relee, desde 2 Tesalonicenses)

- **Las cartas desde Corinto.** `pablo-escribe-2-tesalonicenses` (c. 51) lleva el orden 1807 de la serie `hechos`, justo tras `primera-carta-de-pablo` (1806): Perspicacia «Tesalonicenses» y «Testimonio completo», cap. 19, la ponen poco después de la primera, y ninguna fuente la sitúa frente a la visión de Hch 18:9, 10 (1809). El tramo Hch 18:5-8 ya nombra `letter:2-tesalonicenses` en `mentions`; si se reabre Hechos 18, ese tramo puede nombrar también los dos sucesos.
- **El trabajo en Tesalónica.** `alboroto-en-tesalonica` lleva ya 2Te 2:5 y 3:7-10 en `passages`, y su resumen dice que Pablo y Silas trabajaron para mantenerse (Perspicacia «Tesalónica», párr. 3). Si se reabre Hechos 17, se parte de ese resumen.

## Para 2 Crónicas (desde Amós)

- **Hazael y los Ben-Hadad.** `hazael` (`1200001923`), `ben-hadad-hijo-de-hazael` (`1200000636#3`), `ben-hadad-hijo-de-tabrimon` (núm. 1) y `ben-hadad-ii` (núm. 2) existen, con `distinct_from` en las tres. Crónicas los reutiliza.
- **Amasías.** `amasias`, el rey de Judá, ya lleva la clave (`1200000224#2`) y su `disambiguation`, como la de `amos-profeta` (`1200000246#1`); el sacerdote de Betel es `amasias-sacerdote-de-betel` (`#3`). Crónicas no vuelve a proponerlas.
- **El terremoto.** `terremoto-en-dias-de-uzias` (Am 1:1; Zac 14:5) es de Amós. Si Crónicas lo nombra al hablar de Uzías, añade su pasaje.

## Para Josué, Jueces, 1 Samuel y 2 Samuel (desde Amós)

- **Ciudades filisteas.** `asquelon` y `ecron` existen desde Am 1:8 (Perspicacia escribe Eqrón, que va en `names`). Gaza, Asdod y Gat ya existían.
- **Harmón.** `harmon` (Am 4:3) lleva como único candidato el peñasco de Rimón, en Rammun. Si Jueces 20:45-47 crea ese peñasco, el candidato de `harmon` puede remitir a él.

## Para Ezequiel y Hechos (desde Amós)

- **Bet-Edén y Edén.** Los hijos de Edén de Is 37:12 y 2Re 19:12 son `eden-centro-comercial` (Perspicacia «Edén», núm. 2), que Ez 27:23 también usa. Perspicacia solo cree que sea una forma corta de Bet-Edén, así que `bet-eden` sigue aparte y lo dice `not_claimed`.
- **Creta es Caftor.** `creta` lleva Caftor en `names`, y Jer 47:4 la usa: también Dt 2:23 cuando habla del lugar.
- **Israel es José.** `israel` lleva «José» en `names` para el reino del norte (Am 5:6, 15; 6:6), como Efraín.
- **Hechos 7 y 15.** Los tramos Amós 5:25-27 y 9:11-12 llevan `discurso-de-esteban` y `concilio-de-jerusalen-49` en `mentions`. Hechos no nombra a Amós, así que sus tramos no lo llevan.
- **Los cuarenta años en el desierto.** Cuando exista el suceso de Números (el andar de Israel por el desierto), va en `mentions` de los tramos Amós 2:9-12 y 5:25-27.

## Para Ezequiel y Malaquías (desde Abdías)

- **Edom y Nabonido.** Perspicacia «Edom» y «Toda Escritura» ven cumplido Abd 7 en la conquista de Edom por Nabonido, que no es un suceso del relato. Abdías y Jer 49:7-11 ponen `nabonido` en `mentions`; Ez 25:12-14 y 35 y Mal 1:3, 4 pueden hacer lo mismo.

## Para Deuteronomio, Josué, Jueces y 2 Crónicas (desde Abdías)

- **Sefelá.** `sefela` existe desde Abd 19 (OpenBible af084cf). Usan ese id los pasajes que cita Perspicacia «Sefelá»: Deuteronomio 1:7; Josué 9:1, 10:40, 11:2 y 12:8, más 15:33-44, que da sus ciudades; Jueces 1:9; y 2 Crónicas 1:15, 9:27, 26:10 y 28:18, como ya Jeremías 17:26, 32:44 y 33:13. Jos 11:16 nombra además la Sefelá de la región montañosa de Israel, que Perspicacia sitúa quizá entre Samaria y Sarón: Josué decide si es otra ficha.
- **Benjamín en Abd 19.** «Benjamín conquistará Galaad» nombra a la tribu como pueblo, sin persona; su territorio no tiene ficha, mientras que `juda` sí va en `mentions` de Abd 10-14. Cuando Josué (18:11-28) cree `territorio-de-benjamin`, lo añade a `mentions` del tramo Abdías 1:19-20.
- **Región montañosa de Esaú.** Está en `names` de `edom` (Abd 8, 9, 19, 21). `seir` sigue siendo la región montañosa de Gé 14:6 y 36:8.
- **Sefarad.** `sefarad` (Abd 20) no tiene punto: un solo candidato, Saparda de Media, que Perspicacia da como probable.

## Para Amós (desde Abdías)

- **Isaac como pueblo.** La regla de `versiculos.md` sección 4 deja fuera de `mentions` al patriarca cuando su nombre designa al pueblo. Los tramos Amós 7:7-9 y 7:10-17 llevan `person:isaac` por «lugares altos de Isaac» y «casa de Isaac», el pueblo de Israel: sobra en los dos. «Dios de Jacob» (Sl 20) y «descendencia de Jacob» (Sl 22) nombran al hombre y se quedan.

## Para Josué, 2 Crónicas y Nehemías (desde Miqueas)

- **Zenán y Maarat.** `zaanan` (Miq 1:11) y `marot` (Miq 1:12) no llevan Zenán ni Maarat en `names`: Perspicacia solo dice que hay quien las iguala, y las dos lo dejan en `not_claimed`. Josué ya creó `zenan` (Jos 15:37) y `maarat` (Jos 15:59) con los mismos puntos: ʽAraq el-Kharba (31.599435, 34.803939) y Beit Ummar (31.621389, 35.102222). Allí la duda solo está en el `summary`; la integración les añade el `not_claimed` simétrico (que Zenán sea la Zaanán de Miq 1:11; que Maarat sea la Marot de Miq 1:12). Las dos `coord_note` describen bien su punto aunque digan cosas distintas: en la ficha Zaanan de OpenBible (a4e7fa8) ʽAraq el-Kharba es la segunda resolución de la primera identificación, y en la ficha Zenan (a5e1150), la segunda identificación.
- **Ofel.** Está en `names` de `jerusalen` desde Is 32:14. 2Cr 27:3 y Ne 3:26 usan esa ficha, y Perspicacia «Ofel» compara con él el «montículo» de Miq 4:8, que el tramo Miqueas 4:6-8 puede nombrar en su `note`.
- **La montaña de la Casa.** `monte-moria` lleva ese nombre (Miq 3:12, cuya nota dice «el monte del templo»).

## Para 2 Crónicas, Esdras y Daniel (desde Nahúm)

- **Asurbanipal y Asnapar.** `asurbanipal` (clave `1200000430`) existe desde Na 3:8-10. Esa clave es a propósito la entrada «Asurbanipal» de Perspicacia, que solo remite a «Asnapar»: así la del artículo, `1200000404`, queda libre para `asnapar`. Perspicacia «Asnapar» solo ve muy probable que sea el Asnapar de Esd 4:10, así que Esdras crea `asnapar` (`1200000404`) con `same_as` `asurbanipal`, `inferred: true` y `status: pending`.
- **Esar-Hadón.** Existe desde Is 37:38 (`esar-hadon`, clave `1200001416`), hijo y sucesor de Senaquerib, y `asurbanipal` ya lleva `kin` `esar-hadon` con la palabra `father`. Esd 4:2 usa ese id.
- **Nabopolasar y Ciaxares.** `nabopolasar` y `ciaxares` existen, con `perspicacia: null` porque Perspicacia no les dedica artículo. La integración de Nahúm puso a `nabucodonosor-ii` las relaciones `kin` `nabopolasar` con la palabra `father` y `succeeds` `nabopolasar`, y añadió `nabopolasar` a `nabopolasar-funda-dinastia`. Daniel reutiliza esos ids.

## Para Ezequiel (desde Nahúm)

- **No-Amón.** `no-amon` existe (Tebas, OpenBible a9674fc), con No y Tebas en `names`: Ez 30:14-16 usa ese id, como Jer 46:25.
- **Put como tierra.** `put` existe también como lugar (el pueblo y su tierra; la persona `put` es el hijo de Cam), con precisión incierta en el punto de Libia y un `not_claimed` porque Na 3:9 separa Put de los libios. Ez 27:10, 30:5 y 38:5 usan `place:put`, sin `person:put`, como Jer 46:9. Is 66:19 no: la TNM dice Pul, que es otro lugar (`pul`).
- **Elqós.** `elqos` existe sin punto (Beit Jibrin favorecido; Galilea como alternativa, en el punto de El Kauzeh de OpenBible). La TNM solo da el gentilicio «elcosita»; Elqós es la única grafía del lugar en jw.org.

## Para Josué y Jueces (desde Habacuc)

- **Sucesos que recuerda Habacuc 3.** La Atalaya del 1 de febrero de 2000 (`w00-gozosos-en-dios`) une la oración a la toma de Jericó (Jos 6), al sol que se detiene sobre Gabaón (Jos 10:12-14, la referencia de Hab 3:11) y a la crecida del Cisón contra Sísara (Jue 5:21). Jericó, Gabaón y el Cisón ya van en `mentions` de Habacuc 3:1-2 y 3:8-11.
- **Cusán no es Cusán-risataim.** `cusan` (Hab 3:7) es un lugar sin punto, quizá otro nombre de Madián o un país vecino (Perspicacia «Cusán»). El rey de Jue 3:8-10 es una persona aparte, con su propio artículo.

## Para 2 Crónicas, Esdras y Nehemías (desde Sofonías)

- **Claves ya puestas.** La integración de Sofonías puso a `guedalias`, el gobernador, la clave `1200001632#4` y el `distinct_from` hacia `guedalias-hijo-de-amarias` (núm. 2), y a `ezequias` su `disambiguation`. Nadie vuelve a proponerlas: un `cambiar` desde `null` chocaría.
- **El Ezequías de Sof 1:1.** Es `ezequias-antepasado-de-sofonias` (Perspicacia «Ezequías», núm. 2), y la ficha `ezequias` lleva el `same_as` hacia él, deducido y con `certainty: possible`: Perspicacia «Ezequías», la publicación más reciente, dice «quizás». Se funden solo si una publicación lo afirma. El de Esd 2:16 y Ne 7:21 es el núm. 3: otro id y `distinct_from` con los dos.
- **Otros Sofonías.** `sofonias-profeta` es el núm. 2 de Perspicacia. El sacerdote hijo de Maaseya (Jer 21:1; 29:25; 37:3; 2Re 25:18) es el núm. 3, ya creado como `sofonias-hijo-de-maaseya`; el levita de 1Cr 6:36 el núm. 1, y el padre de Josías o Hen (Zac 6:10) el núm. 4, que ya es `sofonias-padre-de-josias`. Cada uno lleva su id y `distinct_from` con `sofonias-profeta`.
- **Barrios y puertas.** Puerta del Pescado, Segundo Barrio y Mactés están en `names` de `jerusalen`. 2Cr 33:14, 34:22 y Ne 3:3, 12:39 usan esa ficha.

## Para 2 Crónicas (desde 1 Reyes)

- **Sucesos de 1 Reyes con su pasaje de Crónicas.** Ya llevan en `passages` el relato paralelo; el tramo de Crónicas los pone en `entities` y no los crea otra vez: `jehova-se-aparece-a-salomon-en-gabaon` (2Cr 1), `hiram-y-salomon-pactan-la-madera-del-templo` y `salomon-recluta-trabajadores-para-el-templo` (2Cr 2), `salomon-levanta-y-adorna-el-templo` y `templo-de-salomon-empieza` (2Cr 3), `hiram-hace-los-objetos-de-cobre-del-templo` y `salomon-hace-los-utensilios-de-oro-del-templo` (2Cr 2-4), `templo-de-salomon-terminado` y `el-arca-entra-en-el-templo` (2Cr 5), `oracion-de-salomon-en-la-inauguracion-del-templo` (2Cr 6), `inauguracion-del-templo-de-salomon` y `jehova-se-aparece-a-salomon-por-segunda-vez` (2Cr 7), `salomon-da-a-hiram-veinte-ciudades-de-galilea` y `salomon-construye-ciudades-en-todo-su-reino` (2Cr 8), `la-reina-de-saba-visita-a-salomon`, `flota-de-salomon-a-ofir`, `las-naves-de-tarsis-traen-riquezas-a-salomon`, `riqueza-de-salomon` y `muerte-de-salomon` (2Cr 1 y 9), `israel-mata-a-pedradas-a-adoram` (2Cr 10), `semaya-impide-la-guerra-contra-israel` (2Cr 11), los de Asá y Baasá (2Cr 14-16), los de Acab y Micaya (2Cr 18) y `las-naves-de-jehosafat-se-destrozan-en-ezion-gueber` (2Cr 20).
- **Lo que Crónicas añade.** 2Cr 2:16 nombra Jope como puerto de las balsas: `jope` entra en `places` de `hiram-y-salomon-pactan-la-madera-del-templo`. El fuego del cielo de 2Cr 7:1-3 no está en ningún suceso: Crónicas decide si va con la oración o con la inauguración. La batalla de Abías contra Jeroboán (2Cr 13) y la muerte de Jeroboán (2Cr 13:20) son de Crónicas; 1Re 14:20 y 15:7 solo las informan.
- **Personas que Crónicas reutiliza.** Naamá la ammonita es `naama-esposa-de-salomon` (2Cr 12:13); el profeta de Siló, `ahiya-profeta` (2Cr 9:29; 10:15); Semaya, `semaya-profeta` (2Cr 11:2; 12:5); Jehú hijo de Hananí, `jehu-hijo-de-hanani` (2Cr 19:2; 20:34), y su padre, `hanani-vidente` (2Cr 16:7); Maacá, `maaca-hija-de-uriel` (2Cr 11:20-22; 15:16). Uriel, su padre (2Cr 13:2), aún no tiene ficha.
- **Homónimos de 1 Reyes 4.** El Hur de Ne 3:9 (núm. 5) no es `hur-padre-del-comisario-de-efrain`.

## Para 2 Crónicas (desde 1 Crónicas)

- **Cargos de Sadoc y de Jehoiadá.** `sadoc-hijo-de-ahitub` lleva ahora dos `holds_office`, `priest` y `leader` (1Cr 27:17), y `jehoiada-padre-de-benaya` también (1Cr 12:27; 27:5). Sus citas se escriben con `/priest` o `/leader`.
- **Matanías hijo de Micá.** `matanias-hijo-de-mica` (1Cr 9:15) va sin clave; Perspicacia «Matanías», núm. 2 (2Cr 20:14), ve posible que sea el mismo: el lector de 2Cr 20 pone el `same_as` con `certainty: possible`.
- **Azarías hijo de Johanán.** `azarias-hijo-de-johanan` (1Cr 6:10) es, solo como posibilidad, el sacerdote que se enfrentó a Uzías: el suceso de 2Cr 26 lo lleva en `mentions`, sin `people`.

## Para Esdras y Nehemías (desde 1 Crónicas)

- **Ids que reutilizan.** Esd 7:1-5 repite la línea de sumos sacerdotes de 1Cr 6:4-15: de `abisua-hijo-de-finehas` a `azarias-hijo-de-hilquias` y `seraya-hijo-de-azarias`. Ne 11 y 12 y Esd 2:42 repiten 1Cr 9: `salu-hijo-de-mesulam`, `mesulam-hijo-de-hodavias`, `jedaya-sacerdote-repatriado`, `jehoiarib` (Joiarib), `jakin-sacerdote`, `azarias-sacerdote-repatriado` (el Seraya de Ne 11:11 va a `names`), `adaya-hijo-de-jeroham`, `malkias-padre-de-pasjur`, `pasjur-hijo-de-malkias`, `semaya-hijo-de-hasub`, `hasub-hijo-de-azricam`, `azricam-hijo-de-hasabias`, `hasabias-padre-de-azricam`, `matanias-hijo-de-mica`, `mica-hijo-de-zicri`, `zicri-hijo-de-asaf` (Zabdí), `abdias-hijo-de-semaya` (Abdá), `galal-hijo-de-jedutun`, `salum-jefe-de-los-porteros`, `acub-portero` y `talmon`.
- **`same_as` que quedan por escribir.** Perspicacia los ve posibles: Azarías núm. 23 (`azarias-sacerdote-repatriado`) con el núm. 22 de Ne 7:7; Baní núm. 3 (`bani-descendiente-de-perez`) con los núm. 4, 5 o 6; Abdías núm. 9 (`abdias-hijo-de-semaya`) con el portero núm. 13 de Ne 12:25; Jahzerá (`jahzera`) con Ahzai de Ne 11:13. Mesilemit (`mesilemit`) con Mesilemot de Ne 11:13 es probable. Asaya y el Maaseya de Ne 11:5 no: Perspicacia solo dice que hay quien lo piensa.

## Para Jeremías (desde 1 Crónicas)

- **Homónimos con fichas de 1 Crónicas.** Cuando existan las de Jeremías, cada par lleva `distinct_from` en las dos fichas: `guedalias-hijo-de-jedutun`; `hananias-hijo-de-heman`, `hananias-hijo-de-zorobabel` y `hananias-hijo-de-sasac`; `netanias-hijo-de-asaf`; `selemias-portero`; `semaya-hijo-de-obed-edom` y los demás Semaya de 1 Crónicas; `hilquias-hijo-de-hosa` e `hilquias-hijo-de-amzi`; `imer-de-tiempos-de-david` (turno 16) e `imer-padre-de-mesilemit`; `malkiya-de-tiempos-de-david`; `delaya-de-tiempos-de-david` y `delaya-hijo-de-elioenai`; `jerahmeel-hijo-de-hezron` y `jerahmeel-hijo-de-quis`. `malkias-padre-de-pasjur` y `pasjur-hijo-de-malkias` los creó 1Cr 9:12 con los ids y las claves de la propuesta de Jeremías: se funden.

## Para Daniel (desde 1 Crónicas)

- **Claves de Daniel y Sadrac.** `daniel` lleva ya la clave `1200001117#2` (núm. 1 es Kileab, llamado Daniel en 1Cr 3:1) y `sadrac`, `1200003927`, con su `disambiguation`. Daniel no las vuelve a proponer.

## Para quien reabra Génesis o 2 Samuel (desde 1 Crónicas)

- **Queturá y Agar.** `abrahan/kin/quetura` pasa a `secondary_wife` (1Cr 1:32; Perspicacia «Queturá»). Agar sigue con `wife`, aunque Perspicacia «Agar» también la llama concubina: lo decide Génesis.
- **Lahmí y Jaír.** El tramo 2Sa 21:19 puede poner `person:lahmi` y `person:jair-padre-de-elhanan` en `mentions`, como anunciaba su nota; 1 Crónicas no los hace citar 2 Samuel 21.
- **Esbaal y Merib-Baal.** Son nombres de `is-boset` y `mefiboset-hijo-de-jonatan`, no fichas aparte: las notas de la edición de estudio a 1Cr 8:33, 34 dicen que son la misma persona.

## Para Hebreos (desde 1 Reyes)

- **Elías.** `elias-resucita-al-hijo-de-la-viuda-de-sarepta` lleva «Heb 11:35» en `passages`: va en el tramo de Heb 11 que lo recuerda.

## Para Hebreos, Romanos y Gálatas (desde Santiago)

- **El orden de las cartas de 61-62.** `santiago-escribe-santiago` lleva el 2843 de la serie `hechos`. El estudio 3 la lista detrás de Hebreos (c. 61) y delante de 1 Timoteo y Tito (c. 61-64), y «Toda Escritura», libro 59, párr. 4, la ve tardía, quizás poco antes de 62: por eso va tras `pablo-escribe-hebreos` (2841) y antes de `pablo-escribe-1-timoteo` (2850) y `pablo-escribe-tito` (2851). Que vaya también tras `tito-queda-en-creta` (2842) es decisión nuestra, porque entre 2841 y 2842 no hay número libre; ninguna fuente la ordena frente a ese suceso. Si se quiere delante, Santiago toma el 2842 y `tito-queda-en-creta` pasa al 2843. Si Hebreos cambia su número, Santiago sigue detrás.
- **Le 19:18 como ley en vigor.** Snt 2:8 entró en `jehova-da-leyes-para-que-israel-sea-santo`. Ro 13:9 y Gál 5:14 citan el mismo mandato y no lo pusieron: quien reabra Romanos 13 o Gálatas 5 puede añadir su pasaje y poner el suceso en el tramo.
- **Cargos sin palabra (pregunta abierta).** Snt 3:1 cuenta a Santiago entre los maestros y Snt 5:14 nombra a los ancianos de la congregación; Perspicacia «Santiago», núm. 4, lo hace superintendente en Jerusalén y, al parecer, «apóstol» de esa congregación. `santiago-hermano-de-jesus` no lleva `holds_office` hasta que el dueño responda la pregunta de `data/_proposals/santiago.json`: `apostle` con `inferred: true`, o palabras nuevas para maestro y anciano o superintendente. Con la respuesta, la ficha recibe el cargo con `santiago-3`, `santiago-5` o `hch-15` como fuente, y se releen Santiago 3 y 5 para ponerlo en sus tramos.

## Para Esdras, Nehemías, Daniel y Hebreos (desde Ageo)

- **Un suceso por mensaje.** Ageo lleva cuatro sucesos anclados al día en 520 a.e.c., serie `ageo`: `primer-mensaje-de-ageo` (1 de elul, Ag 1:1-11), `segundo-mensaje-de-ageo` (21 de tisri, Ag 2:1-9), `tercer-mensaje-de-ageo` y `cuarto-mensaje-de-ageo` (24 de kislev, Ag 2:10-19 y 2:20-23).
- **`se-reanuda-la-obra-del-templo-520` es de Esdras.** Desde Ageo es solo el 24 de elul de 520 (Ag 1:12-15): el título y el resumen hablan de Zorobabel, Josué y el pueblo, y `people` ya no lleva a `zacarias-profeta` ni `passages` a Zac 1:1, porque Zacarías empezó en el mes octavo (Zac 1:1; Perspicacia «Ageo»). Esdras (Esd 5:1, 2) lo pone en `entities` de su tramo; el primer mensaje de Zacarías es otro suceso, `primer-mensaje-de-zacarias`. El tramo Ageo 2:15-19 lo lleva en `mentions`: la referencia de Ag 2:18 remite a Esd 5:2.
- **Josué y Jehozadac.** `josue-sumo-sacerdote` lleva la clave `1200002446#4` (Perspicacia «Jesúa», núm. 4); «Josué», núm. 4 (`1200002523`), es el mismo hombre con los pasajes de Ageo y Zacarías y no se usa como clave. Nadie vuelve a proponer la clave de Josué: un `cambiar` desde `null` chocaría. Su padre es `jehozadac` (`1200002400`, con Jozadac y Jehozadaq en `names`). Esd 3:2, 8; 5:2; 10:18 y Ne 12:26 añaden su capítulo a la relación `josue-sumo-sacerdote/kin/jehozadac`.
- **Darío el medo.** `dario-el-medo` sigue sin clave: le corresponde `1200001124#1` (Perspicacia «Darío», núm. 1), porque `dario-i` ya lleva `#2`. La pone Daniel.
- **Hebreos 12.** Heb 12:26, 27 cita Ag 2:6: su tramo lleva `segundo-mensaje-de-ageo` en `mentions`, sin añadir el pasaje.

## Para 2 Crónicas (desde 2 Reyes)

- **Sucesos de 2 Reyes con su pasaje de Crónicas.** Ya lo llevan en `passages`; el tramo de Crónicas los pone en `entities` y no los crea otra vez: `edom-y-libna-se-rebelan-contra-jehoram-de-juda` (2Cr 21:8-10), `jehoram-y-ocozias-luchan-contra-hazael-en-ramot-galaad` (22:5, 6), `muerte-de-ocozias-de-juda` (22:7-9), `jehu-mata-a-los-hermanos-de-ocozias` (22:8), `jehoiada-renueva-el-pacto-y-el-pueblo-derriba-el-templo-de-baal` (23:16-19), `jehoas-manda-recoger-dinero-para-reparar-el-templo` (24:4, 5), `jehoiada-pone-un-cofre-para-reparar-el-templo` (24:6-14), `hazael-toma-gat-y-jehoas-le-entrega-el-oro-del-templo` (24:23, 24), `muerte-de-jehoas-de-juda` (24:25-27), `amasias-ejecuta-a-los-asesinos-de-su-padre` (25:3, 4), `amasias-derrota-a-edom-en-el-valle-de-la-sal` (25:11, 12), `jehoas-vence-a-amasias-en-bet-semes` (25:17-23), `jehoas-abre-brecha-en-la-muralla-de-jerusalen` (25:23, 24), `conspiradores-matan-a-amasias-en-lakis` (25:25-28), `el-pueblo-de-juda-hace-rey-a-azarias` (26:1), `azarias-reconstruye-elat` (26:2), `jehova-hiere-a-uzias-con-lepra` (26:16-21), `jotan-construye-la-puerta-superior-del-templo` (27:3), `acaz-quema-a-su-hijo` (28:3), `acaz-soborna-a-tiglat-pileser` (28:16, 20, 21), `acaz-desmonta-objetos-del-templo` (28:24), `ezequias-quita-los-lugares-altos` (31:1), `ezequias-paga-tributo-a-senaquerib` (32:1), `el-rabsaque-desafia-a-jerusalen` (32:9-19), `senaquerib-envia-cartas-a-ezequias` (32:17), `ezequias-ora-ante-las-cartas-de-senaquerib` (32:20), `el-angel-de-jehova-mata-a-185000-asirios` y `muerte-de-senaquerib` (32:21), `ezequias-enferma-y-jehova-le-anade-quince-anos` (32:24), `ezequias-lleva-el-agua-a-la-ciudad` (32:30), `mensajeros-de-babilonia-visitan-a-ezequias` (32:31), `manases-llena-juda-de-idolatria` (33:2-9), `jehova-anuncia-por-sus-profetas-la-ruina-de-jerusalen` (33:10), `los-siervos-de-amon-lo-matan` (33:24, 25), `hulda-anuncia-la-calamidad-sobre-juda` (34:22-28), `josias-lee-el-libro-del-pacto` (34:29-32), `josias-limpia-juda-de-idolatria` (34:33), `pascua-de-josias` (35:1-19), `neko-destrona-a-jehoacaz` (36:2-4), `nabucodonosor-se-lleva-a-joaquin-a-babilonia` (36:9, 10) y `nabucodonosor-hace-rey-a-sedequias` (36:10).
- **Sucesos ya existentes que 2 Reyes recortó.** `jehoas-coronado` queda en 2Cr 23:1-15, 20, 21; `libro-de-la-ley-hallado`, en 2Cr 34:8-21; `destruccion-de-jerusalen-607` sigue con 2Cr 36:17-21.
- **Lo que es solo de Crónicas.** La primera campaña de Josías contra la idolatría, desde su año 12 (2Cr 34:3-7), la muerte y el entierro de Jehoiadá (24:15, 16) y la muerte de Zacarías (24:20-22). El tramo de 2Cr 22 lleva `relation:jehoiada-sumo-sacerdote/kin/jehoseba` (cita 2Cr 22:11), y `zacarias-hijo-de-jehoiada` recibe `kin` `jehoiada-sumo-sacerdote` con la palabra `father` (24:20). Ese tramo pone también `relation:baraquias/same_as/jehoiada-sumo-sacerdote`, que cita 2Cr 24:20.
- **Personas que Crónicas reutiliza.** `jehoiada-sumo-sacerdote`, `jehoseba` (Jehosabeat en `names`), `zibiah`, `jozacar` (Zabad en `names`), `simeat`, `jehozabad-hijo-de-somer` y `somer-padre-de-jehozabad` (24:26: su madre Simrit aún no tiene ficha), `jehoadin`, `jecolias`, `jerusa`, `abias-hija-de-zacarias`, `hefziba`, `mesulemet`, `jedida`, `hulda` y los enviados de 2Cr 34:20. Matán, padre de Sefatías (Jer 38:1), es Perspicacia «Matán», núm. 2: otro id que `matan-sacerdote-de-baal`. Los Jehozabad de 1Cr 26:4 y 2Cr 17:18 son los núm. 1 y 2.
- **Muertes que el texto da por el entierro.** «Descansó con sus antepasados y lo enterraron en X» no dice dónde murió. 1 y 2 Reyes ponen `died_in` en X con `inferred: true` y lo explican en `reason`. Manasés y Amón no lo llevan: los enterraron en el jardín de Uzá, que no tiene sitio. La regla espera al dueño; Crónicas hace lo mismo hasta entonces.

## Para Esdras (desde 2 Reyes)

- **Deportaciones asirias.** `asiria-repuebla-las-ciudades-de-samaria` y `un-sacerdote-desterrado-vuelve-a-betel` van de 740 hasta Esar-Hadón y citan Esd 4:2 en su `reason` (Perspicacia «Esar-hadón»: el traslado de gente a Samaria siguió hasta su reinado). El tramo de Esd 4:1-3 los pone en `mentions` y usa `esar-hadon`.
- **Sacerdotes.** `esdras` lleva `kin` `seraya-hijo-de-azarias` con la palabra `ancestor` y la fuente `esdras-7`: el tramo de Esdras 7 la pone en `entities` al cerrarse.

## Para Hebreos y Daniel (desde 2 Reyes)

- **Hebreos 11:35.** `eliseo-resucita-al-hijo-de-la-sunamita` lleva «Heb 11:35» en `passages`, como `elias-resucita-al-hijo-de-la-viuda-de-sarepta`: el tramo de Heb 11 lo pone en `entities`.
- **Daniel 1.** `daniel-llevado-a-babilonia` y `nabucodonosor-se-lleva-a-joaquin-a-babilonia` comparten 2Re 24:12-16: el de Daniel es el mismo destierro visto desde él. 2 Reyes lo deja en `mentions` de su tramo.

## Para Esdras, Nehemías, Ageo, 2 Crónicas, Job, Ezequiel, Joel y Mateo (desde Zacarías)

- **El profeta y su linaje.** `zacarias-profeta` lleva la clave `1200004681#20` (Perspicacia «Zacarías», núm. 20); su padre es `berekias-hijo-de-ido` (`1200000650#7`, con `distinct_from` hacia `baraquias`) y su abuelo, `ido-padre-de-berekias` (`1200002135#4`). Esd 5:1 y 6:14 («nieto de Idó») usan esos ids; nadie vuelve a proponer la clave del profeta.
- **Idó el sacerdote (Ne 12:4, 16).** Es Perspicacia «Idó», núm. 5, que ve posible que sea el núm. 4. Nehemías lo crea con su propio id y un `same_as` hacia `ido-padre-de-berekias`, con `inferred: true` y `certainty: possible`, en la ficha cuyo id va primero. Si el Zacarías de la casa de Idó (Ne 12:16) es el profeta, lo decide Nehemías con Perspicacia «Zacarías».
- **Sucesos de Zacarías.** Serie `zacarias`: `primer-mensaje-de-zacarias` (hesván de 520), `visiones-nocturnas-de-zacarias` (24 de sebat de 519, Zac 1:7-6:8), `zacarias-corona-a-josue` (Zac 6:9-15), `betel-consulta-sobre-el-ayuno` (4 de kislev de 518, Zac 7:1-8:23), `zacarias-profetiza-contra-las-naciones` (c. 518, Zac 9:1-11:17), `zacarias-pastorea-el-rebano-destinado-al-matadero` (Zac 11:4-14) y `zacarias-anuncia-que-jehova-guerreara-y-reinara` (c. 518, Zac 12:1-14:21). Los mensajes llevan `type: speech` y `roles: {zacarias-profeta: spoke}`, y `present: [zacarias-profeta]` en Jerusalén. Las visiones y Zac 9-14 no dicen dónde habló: ese sitio se deduce de Esd 5:1 y Zac 7, y la `reason` lo dice. Esd 5:1 y 6:14 los ponen en `mentions`.
- **Dónde vivía el profeta.** `zacarias-profeta/lived_in/jerusalen` es deducida (`inferred: true`) y lleva `esdras-5` en `sources`: el tramo de Esd 5:1 la pone en `entities` o en `mentions`.
- **Los mensajes de Ageo.** Los cuatro no llevan `type: speech` ni `roles: {ageo: spoke}`, que pide `versiculos.md`, sección 6. Zacarías no pudo ponérselos porque `apply.py` no traducía un `cambiar` del campo `roles`; el mapa de `scripts/migration/migrate.py` ya lo traduce. Quien reabra Ageo los pone.
- **Profecías que cita un Evangelio.** Zacarías añade el versículo a `passages` del suceso que lo cumple y lo deja en `mentions` de su tramo: Zac 9:9 en `entrada-triunfal-en-jerusalen`, 11:12 en `judas-acuerda-la-traicion` (el precio, Mt 26:15), 11:12, 13 en `muerte-de-judas`, 12:10 en `entierro-de-jesus` y 13:7 en `predice-las-negaciones-de-pedro` y en `arresto-en-getsemani` (la huida, Mt 26:56). Joel 2:28-32 no lo hizo con `pentecostes-33`: quien reabra Joel decide si lo iguala.
- **El templo.** Zac 4:9, 10 está en `passages` de `fundamento-del-templo-536` y de `templo-terminado-515` (Perspicacia «Plomada»). Esdras 3 y 6 no tienen que añadir nada por Zacarías.
- **Llanura de Meguidó y Hadadrimón.** «Llanura de Meguidó» está en `names` de `valle-de-jezreel`, con 2Cr 35:22 en su nota: el tramo 2 Crónicas 35:20-25 pone `valle-de-jezreel`. `hadadrimon` existe; `muerte-de-josias` va solo en `mentions` de Zac 12:10-11, porque Perspicacia ve posible, no seguro, que el duelo fuera por Josías.
- **Puertas y torre de Jerusalén.** Puerta de Benjamín, Primera Puerta, Puerta de la Esquina y Torre de Hananel están en `names` de `jerusalen` (Zac 14:10). 2Cr 26:9 y Ne 3:1, 12:39 usan esa ficha, como ya Jer 31:38, 37:13 y 38:7.
- **Josías hijo de Sofonías.** `josias-hijo-de-sofonias` (`1200002525#2`) y `hen` (`1200001984`) llevan un `same_as` probable, en la ficha de `hen`. `josias` recibe su `disambiguation` desde `null` y el `distinct_from`: nadie vuelve a proponerla.
- **Alejandro en Tiro.** `alejandro-destruye-tiro` (julio de 332 a.e.c., en `potencia-griega`) cita Eze 26:4, 12 en su `reason`: el tramo de Ezequiel 26 lo pone en `mentions`. Alejandro sigue sin ficha, como decidió Joel. Tiro y `alejandro-conquista-egipto` comparten año, así que van en la serie `alejandro` (órdenes 1 y 2, como los cuenta Perspicacia «Alejandro»); un suceso nuevo de Alejandro en 332 toma su número en esa serie.
- **Satanás en una visión.** Zac 3:1, 2 muestra a Satanás oponiéndose a Josué dentro de la cuarta visión. Lo visto en una visión no es suceso (`versiculos.md`, sección 6) y tampoco relación: no hay `tie` hacia `satanas`, y la oposición queda en la `note` del tramo. Job 1-2 y Mt 4 narran escenas, no visiones: ahí vale la sección 7, y quien los reabra apunta la relación que el texto afirme.
- **«La casa de X» (Zac 12:10-13:1).** La casa de un hombre cuyo linaje se nombra lleva a ese hombre en `mentions`: David y `natan-hijo-de-david`, este con la condición de Perspicacia «Natán», núm. 4. La casa de una tribu (Leví, José, Judá) y un clan (los simeítas) son pueblo, sin `person`.

## Para Nehemías (desde Malaquías)

- **El suceso de Malaquías cuelga de Nehemías 13.** `malaquias-reprende-a-sacerdotes-y-pueblo` (Mal 1:1-4:6, después de 443 a.e.c.) lleva `after: nehemias-vuelve-a-la-corte-443`, porque Perspicacia «Malaquías, Libro de» y «Toda Escritura», libro 39, lo ponen tras la vuelta de Nehemías a Jerusalén. Si Nehemías separa ese regreso en un suceso propio (Ne 13:6, 7), el `after` pasa a ese suceso con un `cambiar`, y los tramos Malaquías 1:1, 2:5-9, 2:10-12 y 3:6-12, que nombran el suceso actual por sus referencias a Ne 13, lo añaden a `mentions`.
- **El gobernador de Mal 1:8.** El texto no lo nombra; «Toda Escritura», libro 39, párr. 3, deduce que era Nehemías. Por la sección 4 de `versiculos.md` va solo en la `note` del tramo 1:6-9, sin `mentions` ni relación. Nehemías no lo usa como pasaje suyo.

## Para Ezequiel y Daniel (desde Malaquías)

- **El suceso de todo un libro profético no sitúa a nadie.** Como Joel, Abdías, Nahúm, Habacuc, Sofonías y Malaquías, va sin `type` ni `roles` y con `present: []`, aunque la tabla diga dónde se escribió; la residencia deducida va en `lived_in`. Solo un mensaje que el texto fecha y sitúa, como los de Zacarías, lleva `type: speech`, `spoke` y `present`.

## Para 2 Crónicas (desde Isaías)

- **Personas que ya existen.** `amoz` (`1200000248`), `rezin-rey-de-siria` (Rezín, núm. 1, `1200003721#1`), `remalias` (`1200003688`), `tabeel-de-tiempos-de-acaz` (`1200004293#1`), `uriya-sacerdote-de-acaz` (`1200004523#1`, con Urías en `names`; 2Re 16:10-16), `sargon` (`1200003842`), `eliaquim-hijo-de-hilquias` (`1200001295#1`), `hilquias-padre-de-eliaquim` (`1200002026#3`), `sebna` (`1200003975`), `joa-hijo-de-asaf` (`1200002470#3`), `asaf-padre-de-joa` (`1200000400#3`), `tirhaca` (`1200004422`), `adramelec-hijo-de-senaquerib` (`1200000118#1`), `sarezer-hijo-de-senaquerib` (`1200003954#1`), `esar-hadon` (`1200001416`), `merodac-baladan` (`1200003002`, Berodac-Baladán en `names`) y `baladan` (`1200000544`). Isaías también puso las claves de `pecah` (`1200003415`), `senaquerib` (`1200003897`) y `ciro` (`1200001102`): nadie las vuelve a proponer.
- **Lugares que ya existen.** `campo-del-lavandero` (2Re 18:17), `sefarvaim` (2Re 17:24, 31; 18:34; 19:13), `hena`, `iva` y `arpad` (2Re 18:34; 19:13), `gozan`, `rezef`, `tel-asar` y `eden-centro-comercial` (2Re 19:12), y `quir-de-moab`, con Quir-Haréset en `names` (2Re 3:25). En `names` de `jerusalen` están el Estanque superior (2Re 18:17), Siloé, el estanque inferior y el viejo, Ofel (2Cr 27:3) y la Escalera de Acaz (2Re 20:11). La Casa del Bosque del Líbano (Is 22:8) está en `names` de `monte-moria` desde 1 Reyes.
- **Mayordomo, secretario y registrador.** El vocabulario no tiene esos cargos (Is 22:15; 36:3; 2Re 18:18), así que Eliaquim, Sebná y Joá no llevan `holds_office`, ni Eliaquim `succeeds` a Sebná. Si se añaden, citan Is 22 y 36 y 2Re 18.

## Para Ezequiel (desde Isaías)

- **Lugares que ya existen.** `patros` (Ez 29:14; 30:14), `lud`, el Lud camita (Ez 27:10; 30:5), `tubal`, el pueblo (Ez 27:13; 32:26; 38:2, 3; 39:1), `dedan` (Ez 25:13; 27:20; 38:13) y `eden-centro-comercial` (Ez 27:23). `sinim` no es Siene: Ez 29:10 y 30:6 crean `siene` aparte.
- **Sucesos que Isaías nombra y aún no existen.** El sitio de Tiro por Nabucodonosor (Ez 29:17-20): `mentions` de los tramos Isaías 23:1-7, 8-12 y 13-14.
- **El jardín de Dios.** `eden` lleva «Jardín de Jehová» en `names` (Is 51:3). Ezequiel decide si Ez 28:13 añade «jardín de Dios».
- **Profecía y cumplimiento.** Isaías deja en `mentions`, sin pasaje, los sucesos cuyo cumplimiento solo identifica una publicación, como Joel y Miqueas, aunque el texto nombre a Babilonia o a Asiria (Is 13:17-19; 21:1-9; 31:4-9; 47; 48:14, 20). Solo entra el pasaje cuando el texto nombra a Ciro (Is 44:28; 45:1, 2) o cuando un Evangelio o Hechos lo cita en la escena.

## Para Esdras y Nehemías (desde Isaías)

- **La madera de Tiro (Esd 3:7).** «Las profecías de Isaías I» ve cumplido Is 23:18 en el cedro que Tiro vende para el templo. Cuando Esdras cree ese suceso, va en `mentions` del tramo Isaías 23:15-18.

## Para Daniel (desde Isaías)

- **La caída de Babilonia.** `caida-de-babilonia` nombra en su resumen las tropas de Ciro, pero `people` solo lleva a Belsasar y a Daniel. Perspicacia «Ciro» hace entrar al rey 17 días después: si Daniel lo añade, el suceso necesita `present`.

## Para Mateo, Lucas, Hechos y Romanos (desde Isaías)

- **Jesús y Jesé.** `jesus` lleva `kin` `jese` con la palabra `ancestor`, deducida, desde Is 11:1, 10. Mt 1:5, 6, Lu 3:32 y Ro 15:12 añaden su capítulo a esa relación si se reabren.
- **Pasajes de Isaías en sucesos de los Evangelios.** Por la regla de Zacarías llevan un versículo de Isaías `jose-lleva-a-maria-a-su-casa` (Is 7:14), `hijo-del-funcionario-y-sinagoga-de-nazaret` (9:1, 2; 61:1, 2), `parabolas-del-reino` (6:9, 10), `jehova-habla-desde-el-cielo` (6:10; 53:1), `tradiciones-humanas` (29:13), `juan-comienza-su-ministerio` (40:3-5), `juan-niega-ser-el-cristo` (40:3), `mano-paralizada-en-sabado` (42:1-4), `curaciones-en-capernaum` (53:4), `predice-las-negaciones-de-pedro` (53:12), `pan-de-la-vida` (54:13), `higuera-maldita-y-limpieza-del-templo` (56:7), `entrada-triunfal-en-jerusalen` (62:11), `felipe-y-el-funcionario-etiope` (53:7, 8), `discurso-de-esteban` (66:1, 2), `discurso-en-antioquia-de-pisidia` (55:3), `expulsados-de-antioquia-de-pisidia` (49:6) y `pablo-da-testimonio-a-los-judios-de-roma` (6:9, 10). `regreso-a-nazaret` no lleva Is 11:1: Mt 2:23 no cita el versículo y solo la nota de estudio lo relaciona, así que va en `mentions` del tramo Isaías 11:1-5.

## Para quien reabra Deuteronomio o Salmos (desde Malaquías)

- **Horeb como región.** Perspicacia «Horeb» pone Mal 4:4, Dt 1:6, 19; 4:10, 15; 5:2; 9:8; 18:16; 29:1 y Sl 106:19 entre los pasajes en que el nombre designa la región del Sinaí. Mal 4:4, Dt 18:16 y 29:1 usan `desierto-de-sinai`; los tramos Dt 1:6-8, 1:19-21, 4:9-14, 4:15-24, 5:2-5 y Sl 106:19-23 usan `monte-sinai`, porque sus sucesos pasan en el monte. Quien los reabra decide si añade `desierto-de-sinai` a sus `mentions`.

## Para quien reabra Isaías o Miqueas (desde Jeremías)

- **Sucesos que ya existen.** La huida a Egipto es `el-resto-de-juda-huye-a-egipto` (de 2 Reyes, con Jer 43:4-7): va en `mentions` del tramo Isaías 19:18-22. El castigo de Edom es `jeremias-anuncia-la-ruina-de-edom` (Jer 49:7-22): va en `mentions` de Isaías 34:5-8 y 34:9-15.
- **Ezequías y el aviso de Miqueas.** `ezequias-hace-caso-al-aviso-de-miqueas` (Jer 26:18, 19) existe, y `miqueas-profetiza-contra-samaria-y-jerusalen` lleva Jer 26:18 en `passages`: el suceso nuevo va en `mentions` del tramo Miqueas 3:9-12.

## Para Ezequiel y Daniel (desde Jeremías)

- **Lugares nuevos.** `pecod` (Jer 50:21) es el de Ez 23:23. `askenaz`, el reino, y `mini` (Jer 51:27) no tienen punto, solo zonas candidatas; el lugar `askenaz` comparte id con la persona, como `put`. `ufaz` (Jer 10:9) no tiene punto ni candidatos: Da 10:5 usa ese id. `hai-de-ammon` (Jer 49:3) es otro lugar que `hai`.
- **Nabucodonosor contra Egipto.** Jer 46:13-26 deja `nabucodonosor-contra-egipto` en `mentions`, sin pasaje, porque Perspicacia no sabe si la campaña de 588 fue la conquista anunciada. Ezequiel 29 y 30 deciden con lo que diga su publicación.
- **Hananías y Sadrac.** `sadrac` lleva ya `disambiguation` y `distinct_from` hacia `hananias-hijo-de-azur`, `hananias-padre-de-sedequias` y `hananias-abuelo-de-iriya`, pero sigue sin clave `perspicacia`: la pone quien relea Daniel 1. Un Hananías nuevo cambia esa frase y añade su `distinct_from` en las dos fichas.

## Para 1 Crónicas y Nehemías (desde Jeremías)

- **Homónimos que creó Jeremías.** Al integrar, cada par que comparte nombre lleva `distinct_from` en las dos fichas, o `same_as` si Perspicacia ve posible que sean el mismo. Hilquías: `hilquias-padre-de-jeremias` (núm. 5) y `hilquias-padre-de-guemarias` (núm. 6). Imer: `imer-padre-de-pasjur` (núm. 3), que Perspicacia ve posible que sea el núm. 1 de 1Cr 24:14, así que va un `same_as` posible. Malkiya: `malkias-padre-de-pasjur` lleva la clave `1200002866#3`, que 1Cr 9:12 y Ne 11:12 reutilizan; `malkiya-hijo-del-rey` es el núm. 4. Salum: `salum-padre-de-maaseya` (Jer 35:4) va con `perspicacia: null`, porque Perspicacia lo nombra dentro del núm. 4 sin decir si es él. También los Maaseya, Hanán, Jaazanías, Delayá, Azriel, Jerahmeel, Elisamá, Netanías, Hananías, Semaya, Selemías, Jonatán, Sedequías y Seraya nuevos.
- **Puertas de Jerusalén.** `jerusalen` lleva en `names` la Puerta de los Tiestos (Jer 19:2), que Perspicacia «Puerta» iguala con la Puerta de los Montones de Ceniza (Ne 2:13; 3:13, 14; 12:31), la Puerta del Medio (Jer 39:3), la Puerta de los hijos del pueblo (Jer 17:19), la Puerta de los Caballos y el Patio de la Guardia. Nehemías añade a la nota de la Puerta de los Tiestos su otro nombre. La colina de Gareb y Goá (Jer 31:39) no van en `names`: son lugares sin punto, `colina-de-gareb` y `goa`, con una zona candidata junto a la ciudad.
- **Bet-Hakerem.** `bet-hakerem` existe desde Jer 6:1, sin punto y con dos candidatos: Ne 3:14 usa ese id.

## Para todos los libros (desde Jeremías)

- **Gentilicios.** El de una ciudad o una tierra de Israel (Efái el netofatita, Hélez el paltita) da `lived_in` hacia ese lugar; el de un pueblo extranjero (Ébed-Mélec el etíope, Naamá la ammonita) da `born_in`. Las dos, con `inferred: true` y el gentilicio en `reason`.
- **Nombres proféticos de una ciudad.** Jer 33:16 puso «Jehová Es Nuestra Justicia» en `names` de `jerusalen`, con su nota. Is 62:4 (Hefzibá) y Ez 48:35 pueden seguir la misma regla.
- **Cargos que el vocabulario no tiene.** Secretario (Baruc, Elisamá, Jehonatán), príncipe (Pasjur hijo de Malkías, Jehucal, Sefatías, Guedalías hijo de Pasjur y los de Jer 36), supervisor de la casa de Jehová (Pasjur hijo de Imer, Jer 20:1; Sofonías, Jer 29:26), profeta falso (Hananías, Jer 28; Sedequías hijo de Kenaaná), jefe de las fuerzas militares (Johanán, Jaazanías, Ismael), oficial de la guardia (Iriya), funcionario de la corte (Ébed-Mélec) y comisario del rey (Seraya hijo de Nerías). No llevan `holds_office`; si el vocabulario los añade, van a esas fichas con su capítulo como fuente, como los cargos de Is 22 y 36.

## Para Hechos (desde 1 Tesalonicenses)

- **Jasón, anfitrión.** `pablo/tie/jason`, con la palabra `host` y c. 50, nace de la nota de 1Te 1:6 y de Perspicacia «Tesalónica» y «Jasón», y cita solo `1-tesalonicenses-1`. Lo dice el texto de Hechos, así que va con `inferred: false`, pero su `reason` nombra Hechos sin capítulo, porque citar Hch 17:7 obliga a ponerla en un tramo de Hechos 17, que está cerrado. Si se reabre Hch 17:5-9, el tramo añade `hch-17` a sus fuentes, «Hch 17:7» a su `reason` y la pone en `entities`; Perspicacia «Jasón» dice que acogió también a Silas, así que puede crear `silas/tie/jason` con la misma palabra.
- **La primera carta y lo que va antes.** `primera-carta-de-pablo` lleva ahora el orden 1806 de la serie `hechos`, tras `crispo-cree` (Hch 18:5), y dice que probablemente es su primera carta (nota de 1Te 2:13). Antes van `pablo-intenta-volver-a-tesalonica` (1713, 1Te 2:17, 18) y `pablo-envia-a-timoteo-a-tesalonica` (1716, 1Te 3:1-5: al empezar la espera de Atenas, porque ninguna fuente lo ordena frente al Areópago, que es 1722).
- **Filipos en 1Te 2:2.** Va en `mentions`: `filipos` lleva bloque `en` y `validate.py` no le deja citar `1-tesalonicenses-2` mientras el libro no tenga el suyo en `data/books.yaml`. Cuando lo tenga, el tramo 1-2 puede pasarla a `entities`.
