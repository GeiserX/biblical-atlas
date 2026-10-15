# Pendientes entre libros

Cosas que un libro deja decididas o a medias y que otro libro tiene que respetar o cerrar. El lector y el escritor de cada libro leen esta lista antes de empezar y quitan lo que cierran.

Los campos, los tipos de relación y sus palabras se nombran como en el esquema en inglés ([`modelo.md`](modelo.md) y [`data/vocabulary.yaml`](../../data/vocabulary.yaml)). Una propuesta de formato 1 puede escribirlos así o con el nombre antiguo: `apply.py` traduce los dos.

## Para todos los libros

- **Nombres que solo dan las notas de estudio.** Van en `mentions` cuando la nota los identifica con lo que dice el versículo: a quién se refiere, dónde o cuándo pasó, qué suceso recuerda (en 1Co 15:5-8, Tomás, Galilea y Damasco). No van los que la nota usa para explicar una palabra, comparar o poner ejemplos de otras historias, ni los escritores de los relatos paralelos.
- **El autor de una cita.** Si el texto bíblico no lo nombra, se queda en la `note` del tramo aunque la nota de estudio lo nombre (Elifaz en 1Co 3:19, Isaías en 1Co 14:21), como en Romanos. Si el texto lo nombra, va en `mentions`.
- **Una referencia marginal sola** no pone un suceso en `mentions`, igual que no da nombre a una persona (`versiculos.md`, sección 4). Hace falta que el texto cuente el suceso o que una publicación ligue ese versículo a él. Jeremías lo aplicó en todo el libro.
- **Una identificación que la nota solo ve posible** («podría ser la misma ocasión») deja el suceso en `mentions`, sin añadirle el pasaje. Si la da por probable o «al parecer», el pasaje entra.

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

## Para Nehemías y Hechos

- **Pasajes paralelos ya puestos.** Ne 9:18 y Hch 7:40, 41 en `becerro-de-oro`. Hch 7:17-19 en `egipto-esclaviza-a-israel`; Hch 7:19 en `el-faraon-manda-echar-al-nilo-a-los-ninos`; Hch 7:20-22 en `nacimiento-de-moises`; Hch 7:23, 24 en `moises-mata-a-un-egipcio`; Hch 7:25-29 en `moises-huye-a-madian`; Hch 7:29 en `nacimiento-de-guersom`; Hch 7:30-35 en `moises-ante-la-zarza-ardiente`.

## Para Tito (desde 1 y 2 Timoteo)

- **El cargo de superintendente.** El vocabulario no tiene `overseer`. Las notas de 1Ti 1:3 y 4:14 llaman superintendente a Timoteo, y Tit 1:5 encarga a Tito nombrar ancianos: ninguno lleva `holds_office`, como Eliaquim y Sebná desde Isaías. El resumen de `timoteo` lo dice. Si se añade el cargo, la relación cita 1Ti 1 y 4.
- **El orden de las cartas a Timoteo.** En la serie `hechos`, `pablo-expulsa-a-himeneo-y-alejandro` lleva el 2844, `pablo-deja-a-timoteo-en-efeso` el 2845 y `pablo-escribe-1-timoteo` el 2850 (Macedonia, c. 61-64). 2 Timoteo tomó el 2852 (`pablo-deja-su-capa-en-troas`), el 2853 (`pablo-deja-a-trofimo-enfermo-en-mileto`), el 2855 (`segundo-encierro-en-roma`), el 2857 (`primera-defensa-de-pablo`) y el 2860 (`pablo-escribe-2-timoteo`, Roma, c. 65). Ninguna fuente ordena 1 Timoteo frente a Tito: los sucesos de Tito toman otros números y su `note` dice por qué.
- **Las paradas de `ultimos-anos-de-pablo`.** Son ocho: Roma (1), Creta (2) y Éfeso (3), las dos con «orden incierto», Macedonia (4), Nicópolis (5), de orden incierto y hasta c. 65, Troas (6) y Mileto (7), estas dos pendientes y de orden incierto (2Ti 4:13, 20), y Roma (8). `trofimo/accompanies/pablo@61` va de 61 a 65, como la parada de Mileto. Un cambio de Tito a `stops` parte de esa lista.

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

## Para los demás profetas (desde Oseas)

- **Profecías sin escena.** Oseas 4-14 lleva un solo suceso, `juicios-profeticos-contra-efrain-y-juda` (Os 4:1-14:9, la sección de «Toda Escritura»), con fecha narrativa de la obra del profeta y `present: []`. Cada tramo lo pone en `entities`.
- **«David su rey».** Os 3:5 lleva `person:david` y `person:jesus` en `mentions`: el nombre es el del rey histórico, y La Atalaya de 1991 lo aplica a Jesucristo, descendiente de David. Am 9:11 la sigue: Perspicacia «Cabaña» une la cabaña de David a Jesús, rey de su línea. Jer 30:9 y Ez 34:23, 24 y 37:24, 25 la siguieron.
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

## Para quien reabra Éxodo, Números o Deuteronomio

- **El fin del maná.** Éx 16:35 no está en `cesa-el-mana` (Jos 5:12) porque Éxodo 16 ya estaba cerrado: al reabrirlo, se añade el pasaje y el suceso va al tramo.
- **Anac en Deuteronomio.** Dt 9:2 cita el dicho sobre los hijos de Anac. Desde Josué existe la persona `anac` (Jos 15:13): al reabrir Deuteronomio, va en `mentions` del tramo Dt 9:1-6.
- **Janes y Jambres (desde 2 Timoteo).** `janes` y `jambres` existen desde 2Ti 3:8. La nota y Perspicacia solo ven posible que encabezaran a los magos de Éx 7:11, 22; 8:7, 18, 19 y 9:11: al reabrir Éxodo 7, el tramo 8-13 los pone en `mentions`, sin añadirlos a `people` de los sucesos.

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
- **Pasajes que aún no están en ningún suceso.** Hch 7:36 y 13:18 y Jud 5 van a `jehova-condena-a-israel-a-40-anos-en-el-desierto`; Ap 2:14 y Os 9:10 a `israel-adora-al-baal-de-peor`; 2Pe 2:15, 16 a `la-burra-de-balaam-habla`. Miq 6:5 nombra `balac`, `balaam` y `sitim`.

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
- **Timoteo en Listra (desde 2 Timoteo).** La nota de 2Ti 3:11 ve probable que Timoteo estuviera entre los discípulos que rodearon a Pablo apedreado (Hch 14:20). `apedrean-a-pablo-en-listra` ya lleva «2Ti 3:11»; si se reabre Hechos 14, Timoteo puede entrar en `people` de ese suceso, con esa nota, y en el tramo 19-20.

## Para 1 Corintios (si se relee)

- **El peligro de Asia.** 2 Corintios hizo de la tribulación de 2Co 1:8-11 un suceso propio, `pablo-en-peligro-de-muerte-en-asia`, y sacó «2Co 1:8» de `motin-de-efeso`: la nota de estudio solo ve posible que fuera el motín o las fieras de Éfeso. El tramo de 1Co 15:32 lo puede poner en `mentions`, sin añadirle el pasaje.
- **Áquila y Priscila con Pablo.** Su relación `accompanies` con `pablo` va de c. 50 a 65 (Ro 16:3, 4; Perspicacia «Prisca»), con la palabra `fellow_worker`. 1Co 16:19 añade su capítulo a las fuentes de esa relación, sin crear otra; 2Ti 4:19 ya lo hizo.

## Para Filemón, Tito y Hebreos (desde 2 Timoteo)

- **Pablo en Roma, dos tramos.** `pablo/lived_in/roma` tiene dos tramos: c. 59-61 (primer encierro, Hch 28:16, 30) y c. 65 (segundo, 2Ti 1:8, 17). La cobertura los cita como `relation:pablo/lived_in/roma@59` y `relation:pablo/lived_in/roma@65`; al integrar 2 Timoteo, `apply.py` reescribe así las citas de Hechos, Efesios, Filipenses y Colosenses.
- **El último encierro.** `segundo-encierro-en-roma` (c. 65, orden 2855) es de 2 Timoteo y lleva a Lucas, Onesíforo, Eubulo, Pudente, Lino y Claudia. Un libro que lo recuerde añade su pasaje con `anadir`.

## Para quien toque `ultimos-anos-de-pablo` o la serie `hechos` tras 61 (desde Tito)

- **Paradas 4 y 5 de `ultimos-anos-de-pablo`.** La razón de la parada 4 dice que Perspicacia cree que Pablo escribió 1 Timoteo y Tito desde Macedonia; para Tito, Perspicacia «Tito, Carta a» solo lo ve posible y la Tabla pone «Macedonia (?)». La nota de la parada 5 atribuye a «algunos» el arresto en Nicópolis, que es Perspicacia «Nicópolis» quien ve posible. Tito no las cambió para no chocar con 2 Timoteo: se corrigen con un `cambiar` de la lista de ocho paradas.
- **El orden de Tito.** En la serie `hechos`, `tito-queda-en-creta` lleva el 2842 y `pablo-escribe-tito` el 2851, tras 1 Timoteo (2850) y antes de Troas (2852) y Mileto (2853). Ninguna fuente lo fija: es elección nuestra y la `note` de cada suceso lo dice. `pablo-escribe-tito` va con `present: []`, porque la Tabla duda de Macedonia.
- **Apolos tras 1 Corintios.** `apolos` va de 52 a 64 y cita Tit 3, pero solo tiene un tramo `accompanies` con `pablo`, el de c. 55: ninguna fuente los pone juntos en 61-64. Una relación con `caption` para Tit 3:13 está en las preguntas de Tito.
- **Ártemas y Zenas.** `artemas` (`1200000390`) y `zenas` (`1200004695`) existen desde Tit 3:12, 13. Zenas es experto en la Ley; el vocabulario no tiene ese cargo y queda en su resumen y en las preguntas de Tito.
- **Lo que deja 2 Timoteo para Tito.** Al integrar el PR 157, sus puntos «El orden de las cartas a Timoteo» y «Las paradas de `ultimos-anos-de-pablo`» quedan cerrados por Tito y se quitan, salvo las paradas 4 y 5 de arriba. «El cargo de superintendente» pasa a las preguntas de Tito.

## Para Nehemías (desde Josué)

- **Ciudades de Judá y Benjamín (Ne 11:25-36).** Reutilizan los ids de Jos 15 y 18: `cabzeel`, `molada`, `bet-pelet`, `hazar-sual`, `ziclag`, `zanoah`, `adulam`, `lakis`, `azeca`, `zora`, `jarmut`, `gueba` y los demás.

## Para Oseas (desde Josué)

- **Bet-Aven.** La de Jos 7:2 y 18:12 es `bet-aven` (Perspicacia núm. 1). La de Os 4:15; 5:8; 10:5 (núm. 2) sigue como nombre de `betel`.

## Para Hechos y Santiago (desde Josué)

- **Pasajes sin poner.** Hch 7:44, 45 (el tabernáculo entra con Josué) puede ir en `entrada-en-canaan`; Hch 7:15, 16, en `entierran-los-huesos-de-jose-en-siquem`.

## Para Nehemías (desde 1 Samuel)

- **Nob (Ne 11:32).** Usa `nob`.

## Para 2 Crónicas (desde Jueces)

- **Etam.** `penasco-de-etam` es Perspicacia «Etam», núm. 2 (Jue 15). La Etam de 2Cr 11:6 (núm. 3) es `etam-de-juda`, que creó 1Cr 4:3; la de Simeón (1Cr 4:32, núm. 1) es `etam-de-simeon`.

## Para Salmos (desde 2 Samuel)

- **Cus el benjaminita.** Existe (`cus-el-benjaminita`) desde el Salmo 7. Perspicacia duda entre la corte de Saúl y Simeí, y 2 Samuel no lo aclara: ningún tramo lo nombra. Si otro libro lo decide, se añade la relación.

## Para Génesis y Éxodo (si se releen, desde Gálatas)

- **El pacto con Abrahán y el Éufrates.** La nota de Gál 3:17 y Perspicacia «Pacto» dicen que el pacto entró en vigor cuando Abrahán cruzó el Éufrates, en 1943 a.e.c. `pacto-con-abrahan` solo lleva `haran` en `places`; Génesis 12 puede añadir `rio-eufrates`.
- **El mes del pacto de la Ley.** Gálatas corrigió el resumen de `pacto-de-la-ley`: los 430 años se cumplieron el día del éxodo, y el pacto llegó en el tercer mes (Éx 19:1). Éxodo 19 o 24 puede darle `date.detail` con `month: sivan`.
- **Sara e Ismael en Gál 4.** El texto no los nombra, solo las notas: van en `mentions` y sus fichas no citan Gálatas 4. Isaac, Agar y Abrahán sí se nombran.

## Para Colosenses (si se relee, desde Filemón)

- **Apfia.** `apfia` (clave `1200000313`) existe desde Flm 2. La nota de Col 4:17 la nombra junto a Filemón y Arquipo, y el tramo 17 ya pone a `filemon` en `mentions`: si se reabre Colosenses 4, ese tramo puede poner también `person:apfia`.
- **Epafras, compañero de prisión.** `epafras/accompanies/pablo` (c. 60-61) lleva ahora el texto «compañero de prisión» (Flm 23), que ya está en `outside` del vocabulario. Su clave no cambia, así que la cita del tramo 12-13 sigue valiendo.

## Para Efesios, Filipenses y Colosenses (si se releen, desde Filemón)

- **Los sucesos de escritura.** `pablo-escribe-filemon` lleva `type: writing` y `roles: {pablo: wrote}`, como pide la sección 6 de `versiculos.md` y como 1 Timoteo y 2 Tesalonicenses. `pablo-escribe-efesios`, `pablo-escribe-filipenses` y `pablo-escribe-colosenses` aún no los llevan, igual que los de Romanos, 1 y 2 Corintios y Gálatas: quien reabra esos libros se los pone con un `cambiar` (`antes: null`), o un cambio único para todos.
- **El orden en Roma.** En la serie `hechos`, `onesimo-se-hace-cristiano-en-roma` (c. 59-61) comparte el 2831 con Efesios y con el informe de Epafras, y `pablo-escribe-filemon` usa el 2833: antes del viaje de Tíquico (2834), en el que Onésimo llevó la carta, y junto a Colosenses (2832). Ninguna fuente dice cuál de las dos cartas se escribió antes.

## Para 2 Timoteo (desde Filemón)

- **Demas y Lucas.** `demas/accompanies/pablo` (c. 60-61) y `lucas/accompanies/pablo` de 56-61 llevan ya la palabra `fellow_worker` y citan `filemon-1` (Flm 24), por un `cambiar` de la lista entera en `data/_proposals/filemon.json`. Las relaciones de c. 65 (2Ti 4:10, 11) no cambian; un cambio posterior a esas listas parte de ellas.
- **Pablo en Roma.** El tramo 1-3 de Filemón 1 cita `relation:pablo/lived_in/roma`, la única forma válida mientras Pablo tenga una sola relación `lived_in` con Roma. 2 Timoteo (PR 157) crea la de 65 y cambia esa cita a `@59` en Hechos, Efesios, Filipenses y Colosenses, pero no en Filemón. La rama que se integre segunda cambia ese tramo a `relation:pablo/lived_in/roma@59` y vuelve a validar; si se integra antes 2 Timoteo, el cambio va en `biblia-filemon`.

## Para el vocabulario (desde Filemón)

- **«Compañero de armas» (Flm 2).** Pablo llama así a Arquipo, y la nota de estudio ve en ello lo unidos que estaban y lo fiel que le era. Ninguna palabra de `accompanies` lo dice y `outside` no tiene el texto, así que la relación no se escribió y Filemón 1 sigue `pending`. Está lista para entrar cuando `outside` reciba el texto en un cambio revisado: en `data/people/arquipo.yaml`, `type: accompanies`, `person: pablo`, `caption` e `inverse_caption` «compañero de armas», fecha c. 60-61 (`anchored`, como la carta), `inferred: false`, `sources` `filemon-1`, `it-arquipo` y `tnm-tabla`, y `reason` con Flm 2 y su nota. El tramo 1-3 la cita como `relation:arquipo/accompanies/pablo` y el capítulo pasa a `complete`.
- **Epafrodito (Flp 2:25).** El texto le da los dos títulos, colaborador y compañero de armas. Filipenses escribió `fellow_worker` y dejó el segundo en la `reason`. Si el texto entra en `outside`, Filipenses 2 decide si Epafrodito lleva también esa relación, con la misma respuesta que Arquipo.
- **Anfitrión de una congregación (Flm 2).** La congregación se reúne en casa de Filemón. `host` es de persona a persona y una congregación no tiene ficha, así que queda en el resumen de `filemon`. Si el vocabulario lo recoge, cita Flm 2 (y Ro 16:5, Col 4:15, 1Co 16:19 para Priscila y Áquila y Ninfa).

## Para Salmos (si se relee, desde Efesios)

- **Sl 68:18.** La nota del tramo 15-18 sigue a La Atalaya de 2006: los cautivos serían de la conquista de Canaán, y el tramo lleva `conquista-de-canaan` en `mentions`. La nota de estudio de Ef 4:8, más reciente, dice que el salmo celebra la toma de Jerusalén (Sion) por David, y la referencia de Sl 68:18 lleva a 2Sa 5:7. Manda la más reciente: se corrige la nota, se quita esa mención y se pone `david-rey-de-todo-israel` (2Sa 5:1-10, 1070 a.e.c.), que ya existe y lleva la toma de Jerusalén. Ef 4:7-10 ya lo tiene en `mentions`.

## Para Hechos (si se relee, desde Efesios)

- **Las cartas escritas en Roma.** El tramo Hch 28:30, 31 ya nombra `letter:efesios` y `letter:colosenses` en `mentions`; puede nombrar también `pablo-escribe-efesios`, `pablo-escribe-colosenses` y `epafras-informa-a-pablo-en-roma` (c. 59-61, durante esos dos años). Desde Filemón, también `letter:filemon`, `pablo-escribe-filemon` y `onesimo-se-hace-cristiano-en-roma`.

## Para Hechos (si se relee, desde 2 Tesalonicenses)

- **Las cartas desde Corinto.** `pablo-escribe-2-tesalonicenses` (c. 51) lleva el orden 1807 de la serie `hechos`, justo tras `primera-carta-de-pablo` (1806): Perspicacia «Tesalonicenses» y «Testimonio completo», cap. 19, la ponen poco después de la primera, y ninguna fuente la sitúa frente a la visión de Hch 18:9, 10 (1809). El tramo Hch 18:5-8 ya nombra `letter:2-tesalonicenses` en `mentions`; si se reabre Hechos 18, ese tramo puede nombrar también los dos sucesos.
- **El trabajo en Tesalónica.** `alboroto-en-tesalonica` lleva ya 2Te 2:5 y 3:7-10 en `passages`, y su resumen dice que Pablo y Silas trabajaron para mantenerse (Perspicacia «Tesalónica», párr. 3). Si se reabre Hechos 17, se parte de ese resumen.

## Para Josué, Jueces, 1 Samuel y 2 Samuel (desde Amós)

- **Ciudades filisteas.** `asquelon` y `ecron` existen desde Am 1:8 (Perspicacia escribe Eqrón, que va en `names`). Gaza, Asdod y Gat ya existían.
- **Harmón.** `harmon` (Am 4:3) lleva como único candidato el peñasco de Rimón, en Rammun. Si Jueces 20:45-47 crea ese peñasco, el candidato de `harmon` puede remitir a él.

## Para Deuteronomio, Números y Hechos (desde Amós)

- **Creta es Caftor.** `creta` lleva Caftor en `names`, y Jer 47:4 la usa: también Dt 2:23 cuando habla del lugar.
- **Israel es José.** `israel` lleva «José» en `names` para el reino del norte (Am 5:6, 15; 6:6), como Efraín.
- **Hechos 7 y 15.** Los tramos Amós 5:25-27 y 9:11-12 llevan `discurso-de-esteban` y `concilio-de-jerusalen-49` en `mentions`. Hechos no nombra a Amós, así que sus tramos no lo llevan.
- **Los cuarenta años en el desierto.** Cuando exista el suceso de Números (el andar de Israel por el desierto), va en `mentions` de los tramos Amós 2:9-12 y 5:25-27.

## Para Malaquías (desde Abdías)

- **Edom y Nabonido.** Perspicacia «Edom» y «Toda Escritura» ven cumplido Abd 7 en la conquista de Edom por Nabonido, que no es un suceso del relato. Abdías, Jer 49:7-11, Ez 25:12-14 y Ez 35:5-9 ponen `nabonido` en `mentions`; Mal 1:3, 4 puede hacer lo mismo.

## Para Deuteronomio, Josué y Jueces (desde Abdías)

- **Sefelá.** `sefela` existe desde Abd 19 (OpenBible af084cf). Usan ese id los pasajes que cita Perspicacia «Sefelá»: Deuteronomio 1:7; Josué 9:1, 10:40, 11:2 y 12:8, más 15:33-44, que da sus ciudades; Jueces 1:9, como ya Jeremías 17:26, 32:44 y 33:13 y 2 Crónicas 1:15, 9:27, 26:10 y 28:18. Jos 11:16 nombra además la Sefelá de la región montañosa de Israel, que Perspicacia sitúa quizá entre Samaria y Sarón: Josué decide si es otra ficha.
- **Benjamín en Abd 19.** «Benjamín conquistará Galaad» nombra a la tribu como pueblo, sin persona; su territorio no tiene ficha, mientras que `juda` sí va en `mentions` de Abd 10-14. Cuando Josué (18:11-28) cree `territorio-de-benjamin`, lo añade a `mentions` del tramo Abdías 1:19-20.
- **Región montañosa de Esaú.** Está en `names` de `edom` (Abd 8, 9, 19, 21). `seir` sigue siendo la región montañosa de Gé 14:6 y 36:8.
- **Sefarad.** `sefarad` (Abd 20) no tiene punto: un solo candidato, Saparda de Media, que Perspicacia da como probable.

## Para Amós (desde Abdías)

- **Isaac como pueblo.** La regla de `versiculos.md` sección 4 deja fuera de `mentions` al patriarca cuando su nombre designa al pueblo. Los tramos Amós 7:7-9 y 7:10-17 llevan `person:isaac` por «lugares altos de Isaac» y «casa de Isaac», el pueblo de Israel: sobra en los dos. «Dios de Jacob» (Sl 20) y «descendencia de Jacob» (Sl 22) nombran al hombre y se quedan.

## Para Josué y Nehemías (desde Miqueas)

- **Zenán y Maarat.** `zaanan` (Miq 1:11) y `marot` (Miq 1:12) no llevan Zenán ni Maarat en `names`: Perspicacia solo dice que hay quien las iguala, y las dos lo dejan en `not_claimed`. Josué ya creó `zenan` (Jos 15:37) y `maarat` (Jos 15:59) con los mismos puntos: ʽAraq el-Kharba (31.599435, 34.803939) y Beit Ummar (31.621389, 35.102222). Allí la duda solo está en el `summary`; la integración les añade el `not_claimed` simétrico (que Zenán sea la Zaanán de Miq 1:11; que Maarat sea la Marot de Miq 1:12). Las dos `coord_note` describen bien su punto aunque digan cosas distintas: en la ficha Zaanan de OpenBible (a4e7fa8) ʽAraq el-Kharba es la segunda resolución de la primera identificación, y en la ficha Zenan (a5e1150), la segunda identificación.
- **Ofel.** Está en `names` de `jerusalen` desde Is 32:14. Ne 3:26 usa esa ficha, como ya 2Cr 27:3, y Perspicacia «Ofel» compara con él el «montículo» de Miq 4:8, que el tramo Miqueas 4:6-8 puede nombrar en su `note`.
- **La montaña de la Casa.** `monte-moria` lleva ese nombre (Miq 3:12, cuya nota dice «el monte del templo»).

## Para Daniel (desde Nahúm)

- **Nabopolasar y Ciaxares.** `nabopolasar` y `ciaxares` existen, con `perspicacia: null` porque Perspicacia no les dedica artículo. La integración de Nahúm puso a `nabucodonosor-ii` las relaciones `kin` `nabopolasar` con la palabra `father` y `succeeds` `nabopolasar`, y añadió `nabopolasar` a `nabopolasar-funda-dinastia`. Daniel reutiliza esos ids.

## Para quien nombre Elqós (desde Nahúm)

- **Elqós.** `elqos` existe sin punto (Beit Jibrin favorecido; Galilea como alternativa, en el punto de El Kauzeh de OpenBible). La TNM solo da el gentilicio «elcosita»; Elqós es la única grafía del lugar en jw.org.

## Para Josué y Jueces (desde Habacuc)

- **Sucesos que recuerda Habacuc 3.** La Atalaya del 1 de febrero de 2000 (`w00-gozosos-en-dios`) une la oración a la toma de Jericó (Jos 6), al sol que se detiene sobre Gabaón (Jos 10:12-14, la referencia de Hab 3:11) y a la crecida del Cisón contra Sísara (Jue 5:21). Jericó, Gabaón y el Cisón ya van en `mentions` de Habacuc 3:1-2 y 3:8-11.
- **Cusán no es Cusán-risataim.** `cusan` (Hab 3:7) es un lugar sin punto, quizá otro nombre de Madián o un país vecino (Perspicacia «Cusán»). El rey de Jue 3:8-10 es una persona aparte, con su propio artículo.

## Para Nehemías (desde Sofonías)

- **Claves ya puestas.** La integración de Sofonías puso a `guedalias`, el gobernador, la clave `1200001632#4` y el `distinct_from` hacia `guedalias-hijo-de-amarias` (núm. 2), y a `ezequias` su `disambiguation`. Nadie vuelve a proponerlas: un `cambiar` desde `null` chocaría.
- **El Ezequías de Sof 1:1.** Es `ezequias-antepasado-de-sofonias` (Perspicacia «Ezequías», núm. 2), y la ficha `ezequias` lleva el `same_as` hacia él, deducido y con `certainty: possible`: Perspicacia «Ezequías», la publicación más reciente, dice «quizás». Se funden solo si una publicación lo afirma. El de Esd 2:16 es el núm. 3, `ezequias-cabeza-de-familia` (`1200002011#3`), con `distinct_from` hacia los dos; Ne 7:21 usa ese id.
- **Otros Sofonías.** `sofonias-profeta` es el núm. 2 de Perspicacia. El sacerdote hijo de Maaseya (Jer 21:1; 29:25; 37:3; 2Re 25:18) es el núm. 3, ya creado como `sofonias-hijo-de-maaseya`; el levita de 1Cr 6:36 el núm. 1, y el padre de Josías o Hen (Zac 6:10) el núm. 4, que ya es `sofonias-padre-de-josias`. Cada uno lleva su id y `distinct_from` con `sofonias-profeta`.
- **Barrios y puertas.** Puerta del Pescado, Segundo Barrio y Mactés están en `names` de `jerusalen`. Ne 3:3 y 12:39 usan esa ficha, como ya 2Cr 33:14 y 34:22.

## Para Nehemías (desde 1 Reyes)

- **Homónimos de 1 Reyes 4.** El Hur de Ne 3:9 (núm. 5) no es `hur-padre-del-comisario-de-efrain`.

## Para Nehemías (desde 1 Crónicas)

- **Ids que reutilizan.** Ne 11 y 12 repiten 1Cr 9, como ya Esd 2:42: `salu-hijo-de-mesulam`, `mesulam-hijo-de-hodavias`, `jedaya-sacerdote-repatriado`, `jehoiarib` (Joiarib), `jakin-sacerdote`, `azarias-sacerdote-repatriado` (el Seraya de Ne 11:11 va a `names`), `adaya-hijo-de-jeroham`, `malkias-padre-de-pasjur`, `pasjur-hijo-de-malkias`, `semaya-hijo-de-hasub`, `hasub-hijo-de-azricam`, `azricam-hijo-de-hasabias`, `hasabias-padre-de-azricam`, `matanias-hijo-de-mica`, `mica-hijo-de-zicri`, `zicri-hijo-de-asaf` (Zabdí), `abdias-hijo-de-semaya` (Abdá), `galal-hijo-de-jedutun`, `salum-jefe-de-los-porteros`, `acub-portero` y `talmon`.
- **`same_as` que quedan por escribir.** Perspicacia los ve posibles: Abdías núm. 9 (`abdias-hijo-de-semaya`) con el portero núm. 13 de Ne 12:25; Jahzerá (`jahzera`) con Ahzai de Ne 11:13. Mesilemit (`mesilemit`) con Mesilemot de Ne 11:13 es probable. Asaya y el Maaseya de Ne 11:5 no: Perspicacia solo dice que hay quien lo piensa. Esdras ya puso los de Azarías núm. 23 con el núm. 22 (`seraya-repatriado`, Azarías en Ne 7:7) y los de Baní núm. 3 a 6 (`bani-cabeza-de-familia`, Binuí en Ne 7:15).

## Para Jeremías (desde 1 Crónicas)

- **Homónimos con fichas de 1 Crónicas.** Cuando existan las de Jeremías, cada par lleva `distinct_from` en las dos fichas: `guedalias-hijo-de-jedutun`; `hananias-hijo-de-heman`, `hananias-hijo-de-zorobabel` y `hananias-hijo-de-sasac`; `netanias-hijo-de-asaf`; `selemias-portero`; `semaya-hijo-de-obed-edom` y los demás Semaya de 1 Crónicas; `hilquias-hijo-de-hosa` e `hilquias-hijo-de-amzi`; `imer-de-tiempos-de-david` (turno 16) e `imer-padre-de-mesilemit`; `malkiya-de-tiempos-de-david`; `delaya-de-tiempos-de-david` y `delaya-hijo-de-elioenai`; `jerahmeel-hijo-de-hezron` y `jerahmeel-hijo-de-quis`. `malkias-padre-de-pasjur` y `pasjur-hijo-de-malkias` los creó 1Cr 9:12 con los ids y las claves de la propuesta de Jeremías: se funden.

## Para quien reabra Génesis o 2 Samuel (desde 1 Crónicas)

- **Queturá y Agar.** `abrahan/kin/quetura` pasa a `secondary_wife` (1Cr 1:32; Perspicacia «Queturá»). Agar sigue con `wife`, aunque Perspicacia «Agar» también la llama concubina: lo decide Génesis.
- **Lahmí y Jaír.** El tramo 2Sa 21:19 puede poner `person:lahmi` y `person:jair-padre-de-elhanan` en `mentions`, como anunciaba su nota; 1 Crónicas no los hace citar 2 Samuel 21.
- **Esbaal y Merib-Baal.** Son nombres de `is-boset` y `mefiboset-hijo-de-jonatan`, no fichas aparte: las notas de la edición de estudio a 1Cr 8:33, 34 dicen que son la misma persona.

## Para Hebreos, Romanos y Gálatas (desde Santiago)

- **El orden de las cartas de 61-62.** `santiago-escribe-santiago` lleva el 2843 de la serie `hechos`. El estudio 3 la lista detrás de Hebreos (c. 61) y delante de 1 Timoteo y Tito (c. 61-64), y «Toda Escritura», libro 59, párr. 4, la ve tardía, quizás poco antes de 62: por eso va tras `pablo-escribe-hebreos` (2841) y antes de `pablo-escribe-1-timoteo` (2850) y `pablo-escribe-tito` (2851). Que vaya también tras `tito-queda-en-creta` (2842) es decisión nuestra, porque entre 2841 y 2842 no hay número libre; ninguna fuente la ordena frente a ese suceso. Si se quiere delante, Santiago toma el 2842 y `tito-queda-en-creta` pasa al 2843. Si Hebreos cambia su número, Santiago sigue detrás.
- **Le 19:18 como ley en vigor.** Snt 2:8 entró en `jehova-da-leyes-para-que-israel-sea-santo`. Ro 13:9 y Gál 5:14 citan el mismo mandato y no lo pusieron: quien reabra Romanos 13 o Gálatas 5 puede añadir su pasaje y poner el suceso en el tramo.
- **Cargos sin palabra (pregunta abierta).** Snt 3:1 cuenta a Santiago entre los maestros y Snt 5:14 nombra a los ancianos de la congregación; Perspicacia «Santiago», núm. 4, lo hace superintendente en Jerusalén y, al parecer, «apóstol» de esa congregación. `santiago-hermano-de-jesus` no lleva `holds_office` hasta que el dueño responda la pregunta de `data/_proposals/santiago.json`: `apostle` con `inferred: true`, o palabras nuevas para maestro y anciano o superintendente. Con la respuesta, la ficha recibe el cargo con `santiago-3`, `santiago-5` o `hch-15` como fuente, y se releen Santiago 3 y 5 para ponerlo en sus tramos.

## Para Nehemías (desde Ageo)

- **Josué y Jehozadac.** `josue-sumo-sacerdote` lleva la clave `1200002446#4` (Perspicacia «Jesúa», núm. 4); «Josué», núm. 4 (`1200002523`), es el mismo hombre con los pasajes de Ageo y Zacarías y no se usa como clave. Nadie vuelve a proponer la clave de Josué: un `cambiar` desde `null` chocaría. Su padre es `jehozadac` (`1200002400`, con Jozadac y Jehozadaq en `names`). Esdras ya añadió sus capítulos a la relación `josue-sumo-sacerdote/kin/jehozadac`; Ne 12:26 añade el suyo.
- **Darío el medo.** `dario-el-medo` sigue sin clave: le corresponde `1200001124#1` (Perspicacia «Darío», núm. 1), porque `dario-i` ya lleva `#2`. La pone Daniel.
- **Hebreos 12.** Heb 12:26, 27 cita Ag 2:6: su tramo lleva `segundo-mensaje-de-ageo` (21 de tisri de 520, Ag 2:1-9) en `mentions`, sin añadir el pasaje.

## Para todos los libros (desde 2 Reyes y 2 Crónicas)

- **Muertes que el texto da por el entierro.** «Descansó con sus antepasados y lo enterraron en X» no dice dónde murió. 1 y 2 Reyes y 2 Crónicas ponen `died_in` en X con `inferred: true` y lo explican en `reason`. Manasés y Amón no lo llevan: los enterraron en el jardín de Uzá, que no tiene sitio. Los demás libros siguen la misma regla.

## Para el vocabulario (desde 2 Crónicas)

- **Cargos sin palabra.** 2 Crónicas nombra cargos que `offices` no tiene, y esas personas van sin `holds_office`: vidente u hombre de visiones (Hananí, 16:7; Asaf, 29:30; Jedutún, 35:15), secretario (Jeiel, 26:11), jefe de cien (23:1), al mando del palacio y segundo del rey (Azricam y Elcaná, 28:7), supervisor y comisionado de las contribuciones (31:12, 13), portero (Coré, 31:14), jefe de la ciudad (Maaseya, 34:8) y registrador (Joá, 34:8; también Is 36:3 y 2Re 18:18, con mayordomo y secretario). Gad lleva `prophet` porque 29:25 lo cuenta entre los profetas, e Idó porque 13:22 lo llama profeta. Si se añade un cargo, sus fichas citan esos capítulos.
- **Mando en el ejército.** «Bajo su mando» (2Cr 17:14-19; 26:11) va como `tie` con la palabra `master`, como en Samuel y Reyes.
- **Consejera.** `adviser` dice consejero. Ocozías y Atalía (2Cr 22:3) llevan `caption` «aconsejado por ella» e `inverse_caption` «su consejera»; si se añade la forma femenina, esa relación pasa a usarla.
- **Sacerdote principal.** «Sacerdote principal» es `high_priest` con `inferred: false`, porque Perspicacia «Sumo sacerdote» lo da como uno de los nombres del cargo: Amarías (2Cr 19:11), Azarías (26:20) y Seraya (2Re 25:18). «El sacerdote» a secas depende del contexto y va con `inferred: true`.

## Para 1 Reyes y 2 Reyes (si se releen, desde 2 Crónicas)

- **Muertes que Crónicas cuenta y Reyes solo informa.** `muerte-de-jeroboan` (1Re 14:20), `muerte-de-asa` (1Re 15:23, 24) y `muerte-de-jehoram-de-juda` (2Re 8:24) son de 2 Crónicas y no citan Reyes, para no tocar su cobertura cerrada. Quien la reabra puede añadir el pasaje y ponerlas en `mentions`. Las muertes de Jehoiadá (2Cr 24:15, 16) y de Ezequías (32:33) no tienen escena y quedan solo en `died_in`.
- **Servicio del templo.** `salomon-organiza-el-servicio-del-templo` (2Cr 8:12-16) es de 2 Crónicas. 1Re 9:25 cuenta las mismas ofrendas de tres veces al año: quien reabra 1 Reyes 9 puede añadir «1Re 9:25» a sus `passages` y ponerlo en `entities` del tramo 9:25, como hace un libro con el suceso de su dueño.
- **Jakín y Boaz.** Están en `names` de `monte-moria` (2Cr 3:17); el tramo 1 Reyes 7:15-22 puede añadir `place:monte-moria`.

## Para Nehemías, Ageo, Job, Joel y Mateo (desde Zacarías)

- **El profeta y su linaje.** `zacarias-profeta` lleva la clave `1200004681#20` (Perspicacia «Zacarías», núm. 20); su padre es `berekias-hijo-de-ido` (`1200000650#7`, con `distinct_from` hacia `baraquias`) y su abuelo, `ido-padre-de-berekias` (`1200002135#4`). Esd 5:1 y 6:14 ya los usan; nadie vuelve a proponer la clave del profeta.
- **Idó el sacerdote (Ne 12:4, 16).** Es Perspicacia «Idó», núm. 5, que ve posible que sea el núm. 4. Nehemías lo crea con su propio id y un `same_as` hacia `ido-padre-de-berekias`, con `inferred: true` y `certainty: possible`, en la ficha cuyo id va primero. Si el Zacarías de la casa de Idó (Ne 12:16) es el profeta, lo decide Nehemías con Perspicacia «Zacarías».
- **Sucesos de Zacarías.** Serie `zacarias`: `primer-mensaje-de-zacarias` (hesván de 520), `visiones-nocturnas-de-zacarias` (24 de sebat de 519, Zac 1:7-6:8), `zacarias-corona-a-josue` (Zac 6:9-15), `betel-consulta-sobre-el-ayuno` (4 de kislev de 518, Zac 7:1-8:23), `zacarias-profetiza-contra-las-naciones` (c. 518, Zac 9:1-11:17), `zacarias-pastorea-el-rebano-destinado-al-matadero` (Zac 11:4-14) y `zacarias-anuncia-que-jehova-guerreara-y-reinara` (c. 518, Zac 12:1-14:21). Los mensajes llevan `type: speech` y `roles: {zacarias-profeta: spoke}`, y `present: [zacarias-profeta]` en Jerusalén. Las visiones y Zac 9-14 no dicen dónde habló: ese sitio se deduce de Esd 5:1 y Zac 7, y la `reason` lo dice.
- **Los mensajes de Ageo.** Los cuatro no llevan `type: speech` ni `roles: {ageo: spoke}`, que pide `versiculos.md`, sección 6. Zacarías no pudo ponérselos porque `apply.py` no traducía un `cambiar` del campo `roles`; el mapa de `scripts/migration/migrate.py` ya lo traduce. Quien reabra Ageo los pone.
- **Profecías que cita un Evangelio.** Zacarías añade el versículo a `passages` del suceso que lo cumple y lo deja en `mentions` de su tramo: Zac 9:9 en `entrada-triunfal-en-jerusalen`, 11:12 en `judas-acuerda-la-traicion` (el precio, Mt 26:15), 11:12, 13 en `muerte-de-judas`, 12:10 en `entierro-de-jesus` y 13:7 en `predice-las-negaciones-de-pedro` y en `arresto-en-getsemani` (la huida, Mt 26:56). Joel 2:28-32 no lo hizo con `pentecostes-33`: quien reabra Joel decide si lo iguala.
- **El templo.** Zac 4:9, 10 está en `passages` de `fundamento-del-templo-536` y de `templo-terminado-515` (Perspicacia «Plomada»). Esdras 3 y 6 no tienen que añadir nada por Zacarías.
- **Llanura de Meguidó y Hadadrimón.** «Llanura de Meguidó» está en `names` de `valle-de-jezreel`, con 2Cr 35:22 en su nota: el tramo 2 Crónicas 35:20-24 ya lo pone. `hadadrimon` existe; `muerte-de-josias` va solo en `mentions` de Zac 12:10-11, porque Perspicacia ve posible, no seguro, que el duelo fuera por Josías.
- **Puertas y torre de Jerusalén.** Puerta de Benjamín, Primera Puerta, Puerta de la Esquina y Torre de Hananel están en `names` de `jerusalen` (Zac 14:10). Ne 3:1 y 12:39 usan esa ficha, como ya 2Cr 26:9 y Jer 31:38, 37:13 y 38:7.
- **Josías hijo de Sofonías.** `josias-hijo-de-sofonias` (`1200002525#2`) y `hen` (`1200001984`) llevan un `same_as` probable, en la ficha de `hen`. `josias` recibe su `disambiguation` desde `null` y el `distinct_from`: nadie vuelve a proponerla.
- **Alejandro en Tiro.** `alejandro-destruye-tiro` (julio de 332 a.e.c., en `potencia-griega`) cita Eze 26:4, 12 en su `reason`: los tramos Ezequiel 26:1-6 y 26:7-14 lo ponen en `mentions`. Alejandro sigue sin ficha, como decidió Joel. Tiro y `alejandro-conquista-egipto` comparten año, así que van en la serie `alejandro` (órdenes 1 y 2, como los cuenta Perspicacia «Alejandro»); un suceso nuevo de Alejandro en 332 toma su número en esa serie.
- **Satanás en una visión.** Zac 3:1, 2 muestra a Satanás oponiéndose a Josué dentro de la cuarta visión. Lo visto en una visión no es suceso (`versiculos.md`, sección 6) y tampoco relación: no hay `tie` hacia `satanas`, y la oposición queda en la `note` del tramo. Job 1-2 y Mt 4 narran escenas, no visiones: ahí vale la sección 7, y quien los reabra apunta la relación que el texto afirme.
- **«La casa de X» (Zac 12:10-13:1).** La casa de un hombre cuyo linaje se nombra lleva a ese hombre en `mentions`: David y `natan-hijo-de-david`, este con la condición de Perspicacia «Natán», núm. 4. La casa de una tribu (Leví, José, Judá) y un clan (los simeítas) son pueblo, sin `person`.

## Para Nehemías (desde Malaquías)

- **El suceso de Malaquías cuelga de Nehemías 13.** `malaquias-reprende-a-sacerdotes-y-pueblo` (Mal 1:1-4:6, después de 443 a.e.c.) lleva `after: nehemias-vuelve-a-la-corte-443`, porque Perspicacia «Malaquías, Libro de» y «Toda Escritura», libro 39, lo ponen tras la vuelta de Nehemías a Jerusalén. Si Nehemías separa ese regreso en un suceso propio (Ne 13:6, 7), el `after` pasa a ese suceso con un `cambiar`, y los tramos Malaquías 1:1, 2:5-9, 2:10-12 y 3:6-12, que nombran el suceso actual por sus referencias a Ne 13, lo añaden a `mentions`.
- **El gobernador de Mal 1:8.** El texto no lo nombra; «Toda Escritura», libro 39, párr. 3, deduce que era Nehemías. Por la sección 4 de `versiculos.md` va solo en la `note` del tramo 1:6-9, sin `mentions` ni relación. Nehemías no lo usa como pasaje suyo.

## Para Daniel (desde Malaquías)

- **El suceso de todo un libro profético no sitúa a nadie.** Como Joel, Abdías, Nahúm, Habacuc, Sofonías, Malaquías y los mensajes sin fecha de Ezequiel, va sin `type` ni `roles` y con `present: []`, aunque la tabla diga dónde se escribió; la residencia deducida va en `lived_in`. Solo un mensaje que el texto fecha y sitúa, como los de Zacarías, lleva `type: speech`, `spoke` y `present`. Ezequiel tiene una excepción: un gesto o una visita que el texto pone ante los desterrados (Eze 4; 5; 8:1; 12; 14:1; 20:1; 37:15-20) sitúa a Ezequiel en Tel-Abib, con el sitio deducido de Perspicacia «Ezequiel» en `reason`.

## Para Daniel y los profetas que faltan (desde Isaías)

- **Profecía y cumplimiento.** Isaías deja en `mentions`, sin pasaje, los sucesos cuyo cumplimiento solo identifica una publicación, como Joel, Miqueas y Ezequiel, aunque el texto nombre a Babilonia o a Asiria (Is 13:17-19; 21:1-9; 31:4-9; 47; 48:14, 20). Solo entra el pasaje cuando el texto nombra a Ciro (Is 44:28; 45:1, 2) o cuando un Evangelio o Hechos lo cita en la escena.

## Para Isaías (desde Esdras)

- **La madera de Tiro (Esd 3:7).** «Las profecías de Isaías I» ve cumplido Is 23:18 en el cedro que Tiro vende para el templo. Ese suceso es `sidonios-y-tirios-llevan-cedro-a-jope`, de Esdras: va en `mentions` del tramo Isaías 23:15-18. Esdras no toca la cobertura de otro libro, así que lo pone la integración o quien reabra Isaías.

## Para Mateo, Lucas, Hechos y Romanos (desde Isaías)

- **Jesús y Jesé.** `jesus` lleva `kin` `jese` con la palabra `ancestor`, deducida, desde Is 11:1, 10. Mt 1:5, 6, Lu 3:32 y Ro 15:12 añaden su capítulo a esa relación si se reabren.
- **Pasajes de Isaías en sucesos de los Evangelios.** Por la regla de Zacarías llevan un versículo de Isaías `jose-lleva-a-maria-a-su-casa` (Is 7:14), `hijo-del-funcionario-y-sinagoga-de-nazaret` (9:1, 2; 61:1, 2), `parabolas-del-reino` (6:9, 10), `jehova-habla-desde-el-cielo` (6:10; 53:1), `tradiciones-humanas` (29:13), `juan-comienza-su-ministerio` (40:3-5), `juan-niega-ser-el-cristo` (40:3), `mano-paralizada-en-sabado` (42:1-4), `curaciones-en-capernaum` (53:4), `predice-las-negaciones-de-pedro` (53:12), `pan-de-la-vida` (54:13), `higuera-maldita-y-limpieza-del-templo` (56:7), `entrada-triunfal-en-jerusalen` (62:11), `felipe-y-el-funcionario-etiope` (53:7, 8), `discurso-de-esteban` (66:1, 2), `discurso-en-antioquia-de-pisidia` (55:3), `expulsados-de-antioquia-de-pisidia` (49:6) y `pablo-da-testimonio-a-los-judios-de-roma` (6:9, 10). `regreso-a-nazaret` no lleva Is 11:1: Mt 2:23 no cita el versículo y solo la nota de estudio lo relaciona, así que va en `mentions` del tramo Isaías 11:1-5.

## Para quien reabra Deuteronomio o Salmos (desde Malaquías)

- **Horeb como región.** Perspicacia «Horeb» pone Mal 4:4, Dt 1:6, 19; 4:10, 15; 5:2; 9:8; 18:16; 29:1 y Sl 106:19 entre los pasajes en que el nombre designa la región del Sinaí. Mal 4:4, Dt 18:16 y 29:1 usan `desierto-de-sinai`; los tramos Dt 1:6-8, 1:19-21, 4:9-14, 4:15-24, 5:2-5 y Sl 106:19-23 usan `monte-sinai`, porque sus sucesos pasan en el monte. Quien los reabra decide si añade `desierto-de-sinai` a sus `mentions`.

## Para quien reabra Isaías o Miqueas (desde Jeremías)

- **Sucesos que ya existen.** La huida a Egipto es `el-resto-de-juda-huye-a-egipto` (de 2 Reyes, con Jer 43:4-7): va en `mentions` del tramo Isaías 19:18-22. El castigo de Edom es `jeremias-anuncia-la-ruina-de-edom` (Jer 49:7-22): va en `mentions` de Isaías 34:5-8 y 34:9-15.
- **Ezequías y el aviso de Miqueas.** `ezequias-hace-caso-al-aviso-de-miqueas` (Jer 26:18, 19) existe, y `miqueas-profetiza-contra-samaria-y-jerusalen` lleva Jer 26:18 en `passages`: el suceso nuevo va en `mentions` del tramo Miqueas 3:9-12.

## Para Daniel (desde Jeremías)

- **Lugares nuevos.** `pecod` (Jer 50:21) es el de Ez 23:23. `askenaz`, el reino, y `mini` (Jer 51:27) no tienen punto, solo zonas candidatas; el lugar `askenaz` comparte id con la persona, como `put`. `ufaz` (Jer 10:9) no tiene punto ni candidatos: Da 10:5 usa ese id. `hai-de-ammon` (Jer 49:3) es otro lugar que `hai`.
- **Nabucodonosor contra Egipto.** Jer 46:13-26 deja `nabucodonosor-contra-egipto` en `mentions`, sin pasaje, porque Perspicacia no sabe si la campaña de 588 fue la conquista anunciada. Ezequiel 29 y 30 deciden con lo que diga su publicación.
- **Lugares nuevos.** `askenaz`, el reino, y `mini` (Jer 51:27) no tienen punto, solo zonas candidatas; el lugar `askenaz` comparte id con la persona, como `put`. `ufaz` (Jer 10:9) no tiene punto ni candidatos: Da 10:5 usa ese id. `hai-de-ammon` (Jer 49:3) es otro lugar que `hai`.
- **Hananías y Sadrac.** `sadrac` lleva ya `disambiguation` y `distinct_from` hacia `hananias-hijo-de-azur`, `hananias-padre-de-sedequias` y `hananias-abuelo-de-iriya`, pero sigue sin clave `perspicacia`: la pone quien relea Daniel 1. Un Hananías nuevo cambia esa frase y añade su `distinct_from` en las dos fichas.

## Para 1 Crónicas y Nehemías (desde Jeremías)

- **Homónimos que creó Jeremías.** Al integrar, cada par que comparte nombre lleva `distinct_from` en las dos fichas, o `same_as` si Perspicacia ve posible que sean el mismo. Hilquías: `hilquias-padre-de-jeremias` (núm. 5) y `hilquias-padre-de-guemarias` (núm. 6). Imer: `imer-padre-de-pasjur` (núm. 3), que Perspicacia ve posible que sea el núm. 1 de 1Cr 24:14, así que va un `same_as` posible. Malkiya: `malkias-padre-de-pasjur` lleva la clave `1200002866#3`, que 1Cr 9:12 y Ne 11:12 reutilizan; `malkiya-hijo-del-rey` es el núm. 4. Salum: `salum-padre-de-maaseya` (Jer 35:4) va con `perspicacia: null`, porque Perspicacia lo nombra dentro del núm. 4 sin decir si es él. También los Maaseya, Hanán, Jaazanías, Delayá, Azriel, Jerahmeel, Elisamá, Netanías, Hananías, Semaya, Selemías, Jonatán, Sedequías y Seraya nuevos.
- **Puertas de Jerusalén.** `jerusalen` lleva en `names` la Puerta de los Tiestos (Jer 19:2), que Perspicacia «Puerta» iguala con la Puerta de los Montones de Ceniza (Ne 2:13; 3:13, 14; 12:31), la Puerta del Medio (Jer 39:3), la Puerta de los hijos del pueblo (Jer 17:19), la Puerta de los Caballos y el Patio de la Guardia. Nehemías añade a la nota de la Puerta de los Tiestos su otro nombre. La colina de Gareb y Goá (Jer 31:39) no van en `names`: son lugares sin punto, `colina-de-gareb` y `goa`, con una zona candidata junto a la ciudad.
- **Bet-Hakerem.** `bet-hakerem` existe desde Jer 6:1, sin punto y con dos candidatos: Ne 3:14 usa ese id.

## Para todos los libros (desde Jeremías)

- **Gentilicios.** El de una ciudad o una tierra de Israel (Efái el netofatita, Hélez el paltita) da `lived_in` hacia ese lugar; el de un pueblo extranjero (Ébed-Mélec el etíope, Naamá la ammonita) da `born_in`. Las dos, con `inferred: true` y el gentilicio en `reason`.
- **Nombres proféticos de una ciudad.** Jer 33:16 puso «Jehová Es Nuestra Justicia» en `names` de `jerusalen`, con su nota. Is 62:4 (Hefzibá) puede seguirla. Ez 48:35 no: La adoración pura, cap. 21, dice que esa ciudad de la visión no es la Jerusalén reconstruida, y «Jehová Está Allí» queda en la nota del tramo.
- **Cargos que el vocabulario no tiene.** Secretario (Baruc, Elisamá, Jehonatán), príncipe (Pasjur hijo de Malkías, Jehucal, Sefatías, Guedalías hijo de Pasjur y los de Jer 36), supervisor de la casa de Jehová (Pasjur hijo de Imer, Jer 20:1; Sofonías, Jer 29:26), profeta falso (Hananías, Jer 28; Sedequías hijo de Kenaaná), jefe de las fuerzas militares (Johanán, Jaazanías, Ismael), oficial de la guardia (Iriya), funcionario de la corte (Ébed-Mélec) comisario del rey (Seraya hijo de Nerías), atalaya o centinela (Ezequiel, Eze 3:17; 33:7) y anciano (Jaazanías hijo de Safán, Eze 8:11). No llevan `holds_office`; si el vocabulario los añade, van a esas fichas con su capítulo como fuente, como los cargos de Is 22 y 36.

## Para Hechos (desde 1 Tesalonicenses)

- **Jasón, anfitrión.** `pablo/tie/jason`, con la palabra `host` y c. 50, nace de la nota de 1Te 1:6 y de Perspicacia «Tesalónica» y «Jasón», y cita solo `1-tesalonicenses-1`. Lo dice el texto de Hechos, así que va con `inferred: false`, pero su `reason` nombra Hechos sin capítulo, porque citar Hch 17:7 obliga a ponerla en un tramo de Hechos 17, que está cerrado. Si se reabre Hch 17:5-9, el tramo añade `hch-17` a sus fuentes, «Hch 17:7» a su `reason` y la pone en `entities`; Perspicacia «Jasón» dice que acogió también a Silas, así que puede crear `silas/tie/jason` con la misma palabra.
- **La primera carta y lo que va antes.** `primera-carta-de-pablo` lleva ahora el orden 1806 de la serie `hechos`, tras `crispo-cree` (Hch 18:5), y dice que probablemente es su primera carta (nota de 1Te 2:13). Antes van `pablo-intenta-volver-a-tesalonica` (1713, 1Te 2:17, 18) y `pablo-envia-a-timoteo-a-tesalonica` (1716, 1Te 3:1-5: al empezar la espera de Atenas, porque ninguna fuente lo ordena frente al Areópago, que es 1722).
- **Filipos en 1Te 2:2.** Va en `mentions`: `filipos` lleva bloque `en` y `validate.py` no le deja citar `1-tesalonicenses-2` mientras el libro no tenga el suyo en `data/books.yaml`. Cuando lo tenga, el tramo 1-2 puede pasarla a `entities`.

## Para 2 Pedro (desde 1 Pedro)

- **El orden en la serie `hechos`.** `pedro-escribe-1-pedro` (Babilonia, c. 62-64) lleva el 2854: tras Tito (2851) y Troas y Mileto (2852, 2853, de 2 Timoteo), antes de `segundo-encierro-en-roma` (2855). No queda entero libre antes del 2855: el suceso de 2 Pedro (c. 64) puede compartir el 2854, porque `build.py` ordena primero por fecha, como Efesios y Epafras comparten el 2831.
- **Pedro en Babilonia.** Es `pedro/lived_in/babilonia` (c. 62-64, deducida), no un viaje: Perspicacia «Pedro» habla de su estancia allí y no da ruta, y la `reason` de la relación lo dice. Cita `it-pedro`, `it-babilonia` y 1Pe 5:13. Marcos y Silvano no llevan `lived_in` allí: los sitúa `present` de `pedro-escribe-1-pedro`. Perspicacia «Pedro, Cartas de» solo ve posible que escribiera también la segunda allí; si 2 Pedro lo dice, añade su capítulo a esa relación con un `anadir`.
- **Silvano es `silas`.** La nota al pie de 1Pe 5:12 lo llama también Silas, así que es una sola ficha. Que fuera el amanuense de Pedro, «Silas, Silvano» solo lo ve posible: el suceso, la carta y la ficha lo dicen así. El `inverse_caption` de `pedro/accompanies/silas` («amanuense de 1 Pedro», en `outside` del vocabulario) aún no, y está en las preguntas de 1 Pedro.

## Para 2 Pedro y Judas (desde 1 Pedro)

- **Los ángeles de días de Noé.** `angeles-toman-esposas` lleva «1Pe 3:19, 20» y la fuente `it-tartaro` (Perspicacia «Tártaro»), que liga esos versículos con Gé 6:1-4. Su resumen dice ya que Dios los recluyó en el Tártaro, al parecer en días de Noé, así que 2Pe 2:4 y Jud 6 van al mismo suceso, sin crear otro. La fecha sigue siendo todos los días de Noé: «Nefilim» pone a sus hijos en la tierra ya en 2490 a.e.c. y la `reason` lo explica.

## Para quien reabra Romanos (desde 1 Pedro)

- **La Sion de Is 28:16.** La nota del tramo Romanos 9:30-33 dice que la Sion donde se pone la piedra es Jerusalén y pone `place:jerusalen` en `mentions`. La nota de estudio de Ro 9:33 no lo dice, y Perspicacia «Sión» pone esa piedra en la Sion celestial (Ro 9:33; 1Pe 2:6). Se corrige la nota y se quita la mención; 1 Pedro 2:4-8 no lleva lugar.

## Para Nehemías (desde Esdras)

- **Más allá del Río.** La provincia persa al oeste del Éufrates es `region-al-oeste-del-eufrates` (Esd 4:10-8:36). Ne 2:7, 9 y 3:7 usan ese id: un lugar no se funde por clave, así que otro id sería un duplicado.
- **Claves ya puestas.** Esdras puso las de `esdras` (`1200001475#1`), `artajerjes-i` (`1200000389#2`), `nehemias` (`1200003212#3`), `mardoqueo` (`1200003111#2`) y `sesbazar` (`1200004025`). Nadie las vuelve a proponer: un `cambiar` desde `null` chocaría.
- **Gente de Esdras que vuelve en Nehemías.** Ne 7 repite Esd 2: los jefes de Esd 2:2 (`nehemias-repatriado`, `seraya-repatriado`, `reelaya`, `mardoqueo-repatriado`, `bilsan`, `mispar`, `bigvai-repatriado`, `rehum-repatriado`, `baana-repatriado`) y las cabezas de familia (`paros`, `pahat-moab`, `elam-cabeza-de-familia`, `zatu`, `bani-cabeza-de-familia`, `azgad`, `adonicam`, `bigvai-cabeza-de-familia`, `adin`, `ater-cabeza-de-familia`, `harim-cabeza-de-familia` y las demás) ya existen con su clave. Los levitas `jesua-cabeza-de-casa-levita`, `cadmiel`, `hodavias-levita` y `binui-levita` también. Antes de crear, se busca la clave. Los netineos de Ne 7:46-56 son los de Esd 2:43-54 (`ziha-netineo` es Ziha núm. 1; el superintendente de Ne 11:21 es el núm. 2, otro id con `distinct_from`). El sacerdote `meremot-hijo-de-uriya` (Perspicacia «Meremot», núm. 2) y su padre `uriya-hijo-de-hacoz` («Uriya», núm. 3) son los que reparan el muro en Ne 3:4, 21: mismo id. `hasum` es la familia cuyo representante, o alguien de ese nombre, está junto a Esdras en Ne 8:4 (Perspicacia «Hasum»).
- **Posibles identidades.** Perspicacia ve posible que `quelita-levita-de-tiempos-de-esdras`, `petahias-levita-de-tiempos-de-esdras`, `sabetai` y `jozabad-levita-de-tiempos-de-esdras` (Esd 10:15, 23) sean los levitas de Ne 8 a 11, y probable que `zabai` (Esd 10:28) sea el padre de Baruc (Ne 3:20). Nehemías pone el `same_as` que diga cada artículo.
- **Más identidades posibles, todas `certainty: possible`.** Perspicacia ve posible que `hasabias-jefe-de-los-sacerdotes` («Hasabías», núm. 7) sea el núm. 9 (Ne 12:21); `serebias-descendiente-de-mahli` («Serebías», núm. 2), el núm. 3 (Ne 8:7; 9:4); `mesulam-enviado-a-casifia` («Mesulam», núm. 13), el núm. 16, 17, 20 o 21 (Ne 3:4, 6, 30; 10:20; 12:33); `daniel-descendiente-de-itamar` («Daniel», núm. 3), el firmante de Ne 10:6; `jozabad-hijo-de-jesua` y `jozabad-levita-de-tiempos-de-esdras` («Jozabad», núm. 6 y 8), los núm. 9 y 10 (Ne 8:7; 11:16); `netanel-descendiente-de-pasjur` («Netanel», núm. 9), el músico núm. 10 (Ne 12:36); `malkiya-descendiente-de-harim` («Malkiya», núm. 7), el núm. 8 (Ne 3:11), y `benjamin-descendiente-de-harim` («Benjamín», núm. 4), el de Ne 3:23 y 12:34. Nehemías crea su ficha y pone el `same_as` en la que va primero por orden alfabético.

## Para Ester (desde Esdras)

- **Los Asuero.** El de Esd 4:6 es `asuero-de-esdras` (Perspicacia «Asuero», núm. 2), con `same_as` probable hacia `cambises-ii`. El de Ester es `jerjes-i`, que ya lleva su `disambiguation` y el `distinct_from` hacia él, pero aún no su clave (`1200000142#3`): la pone Ester.
- **Mardoqueo.** `mardoqueo` lleva la clave `1200003111#2` y `distinct_from` hacia `mardoqueo-repatriado` (núm. 1, Esd 2:2).

## Para el vocabulario (desde Esdras)

- **Cargos sin palabra.** Esdras nombra cargos que `offices` no tiene, y esas personas van sin `holds_office`: copista o escriba (Esdras, Esd 7:6, 11; Simsái, 4:8), principal funcionario del gobierno (Rehúm, 4:8), maestro (Joiarib y Elnatán, 8:16), cabeza de casa paterna (8:1), sátrapa (8:36), levita, cantor y portero (2:40-42; 10:23, 24). Si se añade un cargo, sus fichas citan esos capítulos.

## Para Daniel (desde Hebreos)

- **Heb 11:33, 34.** El tramo 32-34 de Hebreos 11 lleva a `daniel` en `mentions`, porque Perspicacia «Daniel» liga el v. 33 a él. En la rama de Daniel, `daniel-sale-ileso-del-foso-de-los-leones` lleva «Heb 11:33» en `passages`: el libro que se integre segundo pone ese suceso en `entities` de ese tramo, o `validate.py` da error. Si una publicación liga Heb 11:34 a `sadrac-mesac-y-abednego-en-el-horno-de-fuego`, se hace igual.

## Para las Escrituras Griegas (desde Hebreos)

- **Jesús, sumo sacerdote.** `jesus/holds_office/-` lleva `office: high_priest`, sin fecha ni lugar: las notas de Heb 1:9 y 5:5 lo nombran al bautizarse, en 29, y Perspicacia «Sumo sacerdote» lo pone a servir desde que entró en el cielo. Otro libro que lo llame sumo sacerdote añade su capítulo con un `anadir` de la misma relación, sin `date`, para que se funda.
- **Apóstol por enviado.** Heb 3:1 llama apóstol a Jesús en el sentido básico de enviado de Dios, no como uno de los doce (Perspicacia «Apóstol»). Por eso `jesus` no lleva `holds_office` `apostle`; la nota del tramo Heb 3:1-6 lo explica.
- **Pablo y Timoteo en 61.** `pablo-escribe-hebreos` (c. 61, Roma) y `timoteo-queda-libre` (c. 60-61, Roma, Heb 13:23) comparten el orden 2841 de la serie `hechos`, entre Filipenses (2839, 2840) y `tito-queda-en-creta` (2842). Hebreos no cuenta la liberación de Pablo: Perspicacia «Italia» pone la carta al final del primer encierro o poco después, así que `pablo-queda-libre` no suma pasajes de Hebreos y va en `mentions` de Heb 13:17-19 y 13:22-25. `timoteo/lived_in/roma` tampoco cita Hebreos; va en `mentions` de 13:22-25.
- **Jesús, rey.** Heb 1:8, 9 le da trono y cetro, y la nota de 1:9 pone su unción como rey al acabar los tiempos de los gentiles. `jesus` no lleva `holds_office` `king`: es pregunta para el dueño (si se pone, y con esa fecha o sin ella). Hasta entonces queda en la nota del tramo Heb 1:7-12.

## Para quien reabra Salmos (desde Hebreos)

- **Citas de Hebreos 1.** Las notas de cobertura de Sl 8, 22, 45, 102 y 104 dicen que Hebreos los cita; las de Sl 2:7-12 y Sl 97:1-7 no dicen que los citan Heb 1:5 y 1:6. Al reabrir Salmos se pueden igualar.

## Para el vocabulario (desde Hebreos)

- **Mediador y garantía.** Hebreos llama a Jesús mediador de un pacto mejor (Heb 8:6; 9:15; 12:24) y garantía de ese pacto (7:22); Perspicacia «Mediador» da ese papel a Moisés en el pacto de la Ley (Gál 3:19; Heb 9:19, 20). `offices` no tiene esos cargos, así que quedan en las notas de los tramos, como en Gál 3 y 1Ti 2. Si se añade `mediator`, sus relaciones citan esos pasajes.

## Para Ezequiel y quien toque `exodo` (desde Hebreos)

- **«Nú 33:3-5» repetido.** En `main`, `passages` de `exodo` lleva «Nú 33:3-5» dos veces. Hebreos no lo quita, para no chocar con la rama de Ezequiel, que añade «Eze 20:9, 10» a esa lista. Quien toque `exodo` después (Ezequiel o la integración) quita la segunda copia, con una entrada de `history` cuya fuente sea `numeros-33`.

## Para 2 Juan, 3 Juan y las demás cartas (desde 1 Juan)

- **Jesús en `entities`.** Va donde la carta cuenta un hecho concreto de su vida en la tierra: lo que Juan oyó, vio y tocó (1Jn 1:1-4) y el bautismo que La Atalaya del 15-12-2008 ve en el agua de 1Jn 5:6. Lo que la carta enseña de él (ayudante, sacrificio, Hijo enviado, venido en la carne) lo deja en `mentions`, como Efesios, 2 Corintios, 1 Timoteo y Tito.
- **`muerte-de-jesus` en las cartas.** Su pasaje entra solo si la carta cuenta la escena (el madero, lo que padeció). La sangre, el sacrificio o el rescate como enseñanza dejan el suceso en `mentions`, sin pasaje: en 1Jn 5:6-8 el agua da su pasaje a `bautismo-de-jesus` y la sangre, que La Atalaya de 2008 explica como la vida dada en rescate, no lo da.
- **El suceso de escritura.** `juan-escribe-1-juan` cita el prólogo y cada versículo donde Juan dice que escribe. Lleva el orden 2980 de `hechos`, elegido por nosotros; sigue a Patmos solo por la fecha. Perspicacia «Juan, Cartas de», párr. 1, pone las cartas después del Evangelio: el suceso que escriba el Evangelio va antes de 2980, y los de 2 y 3 Juan después. Si `hechos` es la serie correcta para 98 es pregunta abierta de 1 Juan.

## Para Hebreos (desde Daniel)

- **Hebreos 11:33, 34.** `daniel-sale-ileso-del-foso-de-los-leones` lleva «Heb 11:33» en `passages` («Profecías de Daniel», cap. 8, lo ve como alusión a Daniel) y `sadrac-mesac-y-abednego-en-el-horno-de-fuego`, «Heb 11:34»: el tramo de Heb 11 que los recuerda los pone en `entities`.

## Para 2 Reyes, Ezequiel y Mateo (desde Daniel)

- **La deportación de 617 son dos escenas.** `nabucodonosor-se-lleva-a-joaquin-a-babilonia` es el sitio y el destierro, y lleva ya Da 1:1, 2 y a Daniel, Sadrac, Mesac y Abednego en `people` (Perspicacia «Jehoiaquim» y «Daniel», núm. 2). `daniel-llevado-a-babilonia` queda en la escena de Babilonia (Da 1:3-7): Aspenaz escoge a los jóvenes y les cambia el nombre (Perspicacia «Daniel», núm. 2, «Bajo el dominio babilonio», y «Sadrac»). Su id no cambia, porque lo citan 2 Reyes, Isaías 39 y Mateo. Ya no lleva 2Re 24:12-16, ni a Joaquín ni a Ezequiel.
- **Mateo 1:11, 12.** El tramo que nombra la deportación a Babilonia lleva `event:daniel-llevado-a-babilonia` en `mentions`: quien reabra Mateo pone en su lugar `nabucodonosor-se-lleva-a-joaquin-a-babilonia`.
- **Dos viajes del mismo convoy.** `daniel-a-babilonia` y `joaquin-llevado-a-babilonia` dibujan el mismo trayecto de 617. Por la regla de los viajes bastaría uno, con Daniel y sus tres compañeros en `companions`; quitar `daniel-a-babilonia` toca la cobertura de 2 Reyes y de Ezequiel, así que lo decide la integración.

## Para Esdras, Nehemías y 2 Crónicas (desde Daniel)

- **Asuero.** `asuero-padre-de-dario-el-medo` (Perspicacia «Asuero», núm. 1, `1200000142#1`) y `jerjes-i` (núm. 3, `1200000142#3`, que puso Daniel) llevan `distinct_from` entre sí. El Asuero de Esd 4:6 (núm. 2) es ficha nueva con `distinct_from` hacia los dos, o un nombre de `cambises-ii` si Perspicacia lo da por el mismo.
- **Miguel.** `jesus` lleva Miguel en `names` (Perspicacia «Miguel», núm. 1) y `distinct_from` con los ocho Miguel que existen. Quien cree el núm. 7 (2Cr 21:2) o el núm. 11 (Esd 8:8) añade `distinct_from` `jesus` en las dos fichas.
- **La provincia de Babilonia.** Es un lugar propio, `provincia-de-babilonia` (Da 2:48, 49; 3:1), con el punto de la ciudad. Perspicacia «Distrito jurisdiccional» ve posible que «hijos del distrito jurisdiccional» (Esd 2:1; Ne 7:6) aluda a ella, o a Judá: si la publicación del tramo lo decide, va en `mentions`.
- **Claves que ya puso Daniel.** `dario-el-medo` (`1200001124#1`), `belsasar` (`1200000628`), `mesac` (`1200003007`), `abednego` (`1200000017`) y `jerjes-i`: nadie las vuelve a proponer.

## Para quien reabra Isaías (desde Daniel)

- **El banquete de Belsasar.** `caida-de-babilonia` ya no cubre Da 5:1-29: el banquete y la escritura en la pared son `daniel-lee-la-escritura-en-la-pared`. «Profecías de Daniel», cap. 7, liga Is 21:5 al banquete, así que va en `mentions` del tramo Isaías 21:1-5, sin pasaje.

## Para la integración de Ezequiel (desde Daniel)

- **Gog de Magog.** La Atalaya de mayo de 2020 ve probable que Da 11:44-12:1 y Eze 38 hablen de lo mismo. Cuando `ezequiel-profetiza-contra-gog-de-magog` esté en `main`, va en `mentions` del tramo Daniel 11:44-45, sin pasaje.

## Para todos los libros (desde Daniel)

- **Más cargos que el vocabulario no tiene.** Jefe de los funcionarios de la corte (Aspenaz, Da 1:3), jefe de la guardia (Arioc, Da 2:14), gobernante de toda la provincia de Babilonia (Daniel, Da 2:48), prefecto de los sabios o jefe de los sacerdotes-magos (Daniel, Da 2:48; 4:9; 5:11), administrador de una provincia (Sadrac, Mesac y Abednego, Da 2:49; 3:12, 30), tercer gobernante del reino (Daniel, Da 5:29), sátrapa y alto funcionario (Da 6:1-4) y príncipe (Miguel, Da 10:13, 21; 12:1). No llevan `holds_office`; el vínculo con el rey va como `tie` `master`. `governor`, que lleva Guedalías en Judá, tampoco se usa para el gobernador de una provincia hasta que el dueño lo decida: si lo acepta, Daniel lo lleva sobre `provincia-de-babilonia` desde 606-605 (dp, cap. 4) con fecha final, porque dp, cap. 6, lo mantiene en el puesto durante la locura del rey.

## Para Isaías, Joel y Jeremías (desde Ezequiel)

- **El sitio de Tiro.** `nabucodonosor-sitia-tiro` existe (entre 607 y 591 a.e.c., Eze 26:7-12; 29:17-20; trece años, la ciudad de tierra firme y no la isla). Va en `mentions` de los tramos Isaías 23:1-7, 8-12 y 13-14 y Joel 3:7-8. Perspicacia «Tiro» une al mismo castigo Jer 25:22; 27:3 y 47:4: quien reabra Jeremías lo pone en `mentions` de esos tramos.

## Para quien relea Jerusalén o el monte Moria (desde Ezequiel)

- **Puertas del templo.** `jerusalen` lleva en `names` dos puertas del templo, la Puerta superior de la casa de Jehová (2Re 15:35) y la Puerta del Rey (1Cr 9:18), y `monte-moria` lleva las demás. Ezequiel 9 y 10 no las movieron: hace falta decidir si pasan a `monte-moria`.

## Para 3 Juan y Judas (desde 2 Juan)

- **El suceso de escritura.** `juan-escribe-2-juan` copia el modelo de `juan-escribe-1-juan`: `type: writing`, papel `wrote`, `efeso`, c. 98 anclado y orden 2981 de `hechos`, elegido por nosotros. El de 3 Juan toma el siguiente libre, 2982, y cita el saludo y cada versículo donde Juan habla de escribir. Si `hechos` vale para 98 sigue siendo pregunta abierta.
- **«El anciano».** `juan-apostol` ya lleva ese nombre en `names` (2Jn 1; «Toda Escritura», libro 63, párr. 2). 3 Juan 1 solo añade su capítulo a `sources`. Si el vocabulario gana el cargo `elder`, la relación `holds_office` cita los dos capítulos.
- **Juan en Éfeso.** La relación `lived_in` `efeso` de 98 cita 1 Juan 1 y 2 Juan 1 y va en el primer tramo de las dos, aunque ninguna carta nombra Éfeso. Es pregunta abierta al dueño: si la acepta, 3 Juan hace lo mismo; si no, se quita el capítulo de las tres y Éfeso queda en el suceso de escritura y en `written_in`.
- **Fuente común.** `w08-cartas-de-juan-y-judas` está en las fuentes de 1 Juan y de 2 Juan con los mismos datos. 3 Juan y Judas usan ese mismo id.
