# Pendientes entre libros

Cosas que un libro deja decididas o a medias y que otro libro tiene que respetar o cerrar. El lector y el escritor de cada libro leen esta lista antes de empezar y quitan lo que cierran.

Los campos, los tipos de relación y sus palabras se nombran como en el esquema en inglés ([`modelo.md`](modelo.md) y [`data/vocabulary.yaml`](../../data/vocabulary.yaml)). Una propuesta de formato 1 puede escribirlos así o con el nombre antiguo: `apply.py` traduce los dos.

## Para todos los libros

- **Nombres que solo dan las notas de estudio.** Van en `mentions` cuando la nota los identifica con lo que dice el versículo: a quién se refiere, dónde o cuándo pasó, qué suceso recuerda (en 1Co 15:5-8, Tomás, Galilea y Damasco). No van los que la nota usa para explicar una palabra, comparar o poner ejemplos de otras historias, ni los escritores de los relatos paralelos.
- **El autor de una cita.** Si el texto bíblico no lo nombra, se queda en la `note` del tramo aunque la nota de estudio lo nombre (Elifaz en 1Co 3:19, Isaías en 1Co 14:21), como en Romanos. Si el texto lo nombra, va en `mentions`.
- **Una identificación que la nota solo ve posible** («podría ser la misma ocasión») deja el suceso en `mentions`, sin añadirle el pasaje. Si la da por probable o «al parecer», el pasaje entra.

## Para 2 Samuel

- **Rabá (2Sa 11:1; 12:26-31).** Es `raba`, con Filadelfia en `names`.
- **David huye de Absalón.** Cuando 2 Samuel cree el suceso (2Sa 15:13-17:22), añade «Sl 3» a sus pasajes y ese suceso al tramo 1-8 de `data/coverage/salmos.yaml`.
- **Cus el benjaminita.** Existe (`cus-el-benjaminita`) desde el Salmo 7. Perspicacia duda entre la corte de Saúl y Simeí; si 1 o 2 Samuel lo aclara, se añade la relación.
- **Rehob.** `rehob` (Nú 13:21) no lleva Bet-Rehob en `names`, porque Perspicacia solo lo ve probable. 2Sa 10:6, 8 decide.

## Para 2 Reyes y 2 Crónicas

- **Jehoiadá y Baraquías.** Cuando se cree a Jehoiadá, falta un `same_as` entre `baraquias` y su id, en la ficha cuyo id va primero, con `inferred: true` y `certainty: possible` (Perspicacia «Baraquías»: Jehoiadá pudo tener dos nombres; Mt 23:35).
- **Zacarías, hijo de Jehoiadá.** Su muerte (2Cr 24:20-22) va en `monte-moria`, el patio del templo, como la puso Mateo. Si Crónicas prefiere `jerusalen`, que se acuerde una sola relación `died_in`. Su parentesco con Jehoás también es de Crónicas.

## Para Esdras, Hageo y 1 Crónicas

- **Zorobabel.** Su relación con David es `kin` con la palabra `ancestor` (antes decía «descendiente de David», al revés). Abiud va como antepasado suyo, no como hijo, porque Perspicacia «Abiud» lo deja abierto.
- **Resá, Sealtiel y Nerí.** `resa` (Lu 3:27) va como descendiente de Zorobabel, con la palabra `ancestor`, igual que Abiud. `sealtiel` lleva a `neri` con la palabra `relative`, pariente sin grado, porque Perspicacia solo ve posible que fuera su yerno.
- **Janai el gadita (1Cr 5:12).** Perspicacia «Janai» (`1200002318`) no es el Janaí de Lu 3:24, que ya existe como `janai-hijo-de-jose` (`1200002320`) con la fuente `it-janai-hijo-de-jose`. El gadita puede llevar `janai`, que queda libre; su propuesta añade `distinct_from` en las dos fichas.

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

## Para 1 Crónicas

- **Nombres que Perspicacia solo da como probables.** Ladán (Libní), Aminadab hijo de Cohat (Izhar) y Ebiasaf (Abiasaf, que tiene artículo propio) llevan ficha aparte y un `same_as` con `inferred: true` y `certainty: probable` hacia `libni-hijo-de-guerson`, `izhar-hijo-de-cohat` y `abiasaf`.
- **Nun.** Su padre Elisamá y su tribu, Efraín (1Cr 7:20-27), faltan en `nun`. Elisamá es `elisama-hijo-de-amihud` y su padre, `amihud-hijo-de-ladan`; Ladán no tiene ficha y falta su relación con Amihud (1Cr 7:26).
- **Jaír y Segub.** `jair-hijo-de-segub` (Nú 32:41) no tiene padre en ficha: 1Cr 2:22 crea `segub` y la relación.
- **Manasés y Efraín en Números 26.** `asriel`, `semida`, `sutelah-hijo-de-efrain` y `tahan` existen; 1Cr 7:14-20 los reutiliza. La Mahlá de 1Cr 7:18 es otra persona que `mahla-hija-de-zelofehad`, y el Siquem de 1Cr 7:19 es otro que `siquem-hijo-de-galaad`: cada uno lleva `distinct_from` en las dos fichas.
- **Ahiram.** `ahiram` (Nú 26:38) tiene un `same_as` con `status: pending`, aún sin `certainty`, hacia `ehi`; 1Cr 8:1 lo llama Ahará.
- **Hur.** `hur-hijo-de-caleb` (1Cr 2:19, 20) ya existe, con un `same_as` de `certainty: probable` desde `hur-companero-de-moises`.
- **Nadab y Abihú.** 1Cr 24:2 añade su pasaje a `muerte-de-nadab-y-abihu`, el suceso que creó Levítico.

## Para 2 Timoteo

- **Áquila y Priscila con Pablo.** Su relación `accompanies` con `pablo` va de c. 50 a 65 (Ro 16:3, 4; Perspicacia «Prisca»), con la palabra `fellow_worker`, y ya cita 1Co 16. 2Ti 4:19 añade su capítulo a las fuentes de esa relación, sin crear otra.
- **Janes y Jambres.** Los magos del faraón (Éx 7:11, 22) no tienen ficha. Si 2Ti 3:8 los crea, el tramo 7:8-13 de Éxodo los puede poner en `mentions`.

## Para Jeremías y Ezequiel

- **Migdol.** `migdol` es el lugar de Éx 14:2 y Nú 33:7. La ciudad egipcia de Jer 44:1 y Ez 29:10 es la entrada núm. 2 de Perspicacia «Migdol» y lleva otro id.

## Para 1 Timoteo y 2 Timoteo

- **Alejandro.** Ya existen `alejandro-hijo-de-simon` (`1200000192#2`, Mr 15:21), `alejandro-pariente-de-anas` (`#3`, Hch 4:6) y `alejandro-de-efeso` (`#4`, Hch 19:33). El de 1Ti 1:20 es la entrada núm. 5 y el calderero de 2Ti 4:14, la núm. 6; Perspicacia ve posible que sean el mismo, así que van dos fichas y un `same_as` con `certainty: possible`. Todos llevan `distinct_from` entre sí.

## Para 2 Samuel y 1 Crónicas

- **Natán, hijo de David.** `natan-hijo-de-david` (clave `1200003184#4`) existe desde Lu 3:31. 2Sa 5:14, 1Cr 3:5 y 1Cr 14:4 usan ese id; `natan-profeta` sigue sin clave.
- **Abías, el de la división sacerdotal.** `abias-de-tiempos-de-david` (clave `1200000041#4`) existe desde Lu 1:5. 1Cr 24:10 usa ese id y añade su pasaje.
- **David quiere construir una casa a Dios (2Sa 7:1-3).** Hch 7:46 lo recuerda y `pacto-con-david` no incluye esos versículos. El suceso que cree 2 Samuel añade «Hch 7:46» a sus pasajes y va en el tramo 44-50 de Hechos 7.
- **Cainán y Selá.** `sela-hijo-de-arpaksad` lleva dos padres: Arpaksad (Gé 11:12) y, con `status: pending`, `cainan-hijo-de-arpaksad` (Lu 3:36), que falta en el texto hebreo. 1Cr 1:18 no cambia ninguno de los dos.

## Para 1 y 2 Reyes

- **Sarepta (1Re 17).** `sarepta` existe desde Lu 4:26. Faltan la relación `elias-profeta` `lived_in` `sarepta` (1Re 17:9, 10) y el suceso de la viuda; cuando exista, va en `mentions` del tramo Lucas 4:23-27.
- **Elat y Ramot-Galaad.** `elat` (Elot en `names`; 1Re 9:26; 2Re 14:22; 16:6) y `ramot-galaad` (1Re 22) ya existen.
- **La reina de Saba (1Re 10).** Lu 11:31 y Mt 12:42 la llaman reina del sur. El lugar `saba` es el de Job 6:19. El reino de Saba (Perspicacia «Seba», núm. 6) ya existe como `reino-de-saba`, desde Sl 72 y Joe 3:8: 1 Reyes lo usa y lo añade a `mentions` de los tramos Lucas 11:29-36 y Mateo 12:38-42.
- **Obras y riqueza de Salomón.** Ec 2:4-9 cuenta sus casas, viñas, estanques, siervos, oro y cantores, que narran 1Re 7:1-8, 9:17-19 y 10:14-29. Cuando 1 Reyes cree esos sucesos, añade «Ec 2:4-9» a sus `passages` y el suceso al tramo 1-11 de `data/coverage/eclesiastes.yaml`. El único que ya existe, `flota-de-salomon-a-ofir`, lleva Ec 2:8 desde Eclesiastés.

- **La muerte de David (1Re 2:10).** `david` ya lleva `died_in` `jerusalen`, deducida de Hch 2:29. Cuando 1 Reyes cuente su muerte, añade su capítulo a las fuentes de esa relación con un `anadir`, sin crear otra.
- **Elías en el Horeb (1Re 19:9-18).** Ro 11:2-4 recuerda su queja y los 7.000 que no se arrodillaron ante Baal. Cuando 1 Reyes cree ese suceso, añade «Ro 11:2-4» a sus pasajes y lo pone en el tramo 1-6 de Romanos 11, donde ahora `elias-profeta` está en `mentions`.

## Para 2 Reyes

- **Naamán el sirio (2Re 5).** `naaman-el-sirio` (clave `1200003149#2`) existe desde Lu 4:27. Falta el suceso de su curación; cuando exista, va en `mentions` del tramo Lucas 4:23-27.
- **Fronteras (también para Ezequiel).** 1Re 8:65 usa `lebo-hamat` y `torrente-de-egipto`; 1Re 9:26, `ezion-gueber`; Ez 47 y 48, `zedad`, `hazar-enan` (Hazar-Enón está en `names`) y `lebo-hamat`.
- **La serpiente de cobre.** 2Re 18:4 (Nehustán) y Jn 3:14 remiten a `moises-hace-la-serpiente-de-cobre`.

## Para Nehemías

- **Itiel.** `itiel-oyente-de-agur` (clave `1200002237#1`, Pr 30:1) ya existe. El benjamita de Ne 11:7 es la entrada núm. 2 de Perspicacia «Itiel» (`1200002237#2`): va en ficha aparte, con `distinct_from` en las dos.
- **La Puerta de las Ovejas (Ne 3:1, 32; 12:39).** Desde Jn 5:2 es un nombre de `jerusalen`, con su nota. Se reutiliza, sin ficha propia.

## Para 1 Reyes (Salomón)

- **Salomón.** Los cambios de Proverbios, Eclesiastés y El Cantar a su `summary` y a su `reason` ya están integrados en `salomon.yaml`. Un cambio posterior a esos campos parte del texto actual, con su `antes`. El resumen sigue en 40 palabras.
- **Congregador.** Eclesiastés añade ese nombre a `salomon` y las relaciones `lived_in` `jerusalen` y `kin` `david` con la palabra `father` con sus capítulos. No hace falta volver a proponerlos.
- **Abisag.** Es de `sunem`, que existe desde El Cantar. La `sulamita` dice en `not_claimed` que no la damos por Abisag: Perspicacia «Sulamita» solo compara 1Re 1:3 con Can 6:13.

## Para 2 Reyes (Sunem)

- **Sunem.** `sunem` existe desde El Cantar (OpenBible ac86af5, con Sulem en `names`). Jos 19:18 y 1Sa 28:4 ya lo usan; 2Re 4:8 también.

## Para Números, Deuteronomio y Josué

- **Hesbón.** `hesbon` existe desde Can 7:4, con su puerta Bat-Rabim en `names`. Falta en `sehon` la relación `lived_in` `hesbon` (Nú 21:26; Perspicacia «Hesbón», párr. 2), y los sucesos de su conquista.
- **Amaná y Senir.** Amaná es un nombre de `antilibano` (Can 4:8); Senir sigue en `monte-hermon`.

## Para Nehemías

- **La torre de David.** Está en `names` de `jerusalen` desde Can 4:4, con una nota: Perspicacia «Torre» recoge que quizá sea la torre de la Casa del Rey de Ne 3:25. Si Nehemías apunta esa torre, la relaciona con esta nota.

## Para 1 Reyes y 2 Reyes (desde Oseas)

- **Reyes de Os 1:1.** Oseas usa `uzias`, `jotan`, `acaz`, `ezequias`, `jeroboan-ii` y `jehoas-de-israel`, que ya existían. Deja en `data/_proposals/oseas.json` las claves de `jehu-de-israel` (`1200002401#3`), `jeroboan-ii` (`1200002431#2`), `jehoas-de-israel` (`1200002373#2`), `hosea-de-israel` (`1200002090#4`) y `salmanasar-v` (`1200003936#2`). Reyes no vuelve a proponerlas: un `cambiar` desde `null` chocaría. Siguen sin clave `menahem`, `zacarias-de-israel` y `salum-de-israel`.
- **El fin de la casa de Jehú.** Perspicacia «Jezreel», núm. 4, ve cumplido Os 1:4 cuando Salum mata a Zacarías (2Re 15:8-12). Cuando Reyes cree ese suceso, va en `mentions` de los tramos Oseas 1:2-5 y Amós 7:7-9 (Am 7:9 remite a 2Re 15:8-10; Perspicacia «Plomada»). `nacimiento-de-jezreel-hijo-de-oseas` acaba en 791 a.e.c. por él.
- **Sucesos que Oseas nombra y aún no existen.** El tributo de Menahem a Pul (2Re 15:19, 20) y el trato de Hosea con So de Egipto (2Re 17:4; Perspicacia «Asiria» lo une a Os 7:11) van a `mentions` de los tramos Oseas 7:8-12 y 12:1-2. Los becerros de Jeroboán (1Re 12:28-30) van a Oseas 8:1-6, 10:5-8 y 13:1-3, y a Amós 3:13-15, 4:4-5, 5:4-6 y 8:14. El altar de Betel que derriba Josías (2Re 23:15, 16) va también a Amós 3:13-15.
- **La caída de Samaria.** `caida-de-samaria` lleva `present: [salmanasar-v]`, pero Perspicacia «Salmanasar» dice que la Biblia no le atribuye la toma final (remite a «Sargón»). «Toda Escritura», libro 30, párr. 4, habla del sitio asirio bajo Salmanasar V. 2 Reyes 17 decide.
- **Guilgal cerca de Betel.** `guilgal-cerca-de-betel` (Perspicacia «Guilgal», núm. 2) es la de 2Re 2:1-5 y 4:38-41. Su `reason` cita esos capítulos, así que sus tramos la llevan al cerrarlos.
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

## Para Jeremías, Ezequiel y los demás profetas (desde Oseas)

- **Menfis.** `menfis` lleva Nof en `names`: Jer 2:16, 44:1, 46:14 y Ez 30 usan ese id, como ya Is 19:13.
- **Profecías sin escena.** Oseas 4-14 lleva un solo suceso, `juicios-profeticos-contra-efrain-y-juda` (Os 4:1-14:9, la sección de «Toda Escritura»), con fecha narrativa de la obra del profeta y `present: []`. Cada tramo lo pone en `entities`.
- **«David su rey».** Os 3:5 lleva `person:david` y `person:jesus` en `mentions`: el nombre es el del rey histórico, y La Atalaya de 1991 lo aplica a Jesucristo, descendiente de David. Am 9:11 la sigue: Perspicacia «Cabaña» une la cabaña de David a Jesús, rey de su línea. Jer 30:9, Ez 34:23, 24 y 37:24, 25 siguen la misma regla.
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

## Para Deuteronomio y 2 Reyes (desde Joel)

- **Mar Salado.** Joel añade «Mar oriental» (Joe 2:20) a `names` de `mar-salado`. Falta «mar del Arabá» (Dt 4:49; 2Re 14:25; Perspicacia «Mar Salado»).

## Para quien reabra Éxodo, Números o Deuteronomio

- **El fin del maná.** Éx 16:35 no está en `cesa-el-mana` (Jos 5:12) porque Éxodo 16 ya estaba cerrado: al reabrirlo, se añade el pasaje y el suceso va al tramo.
- **Anac en Deuteronomio.** Dt 9:2 cita el dicho sobre los hijos de Anac. Desde Josué existe la persona `anac` (Jos 15:13): al reabrir Deuteronomio, va en `mentions` del tramo Dt 9:1-6.

## Para quien reabra los Evangelios (desde Josué)

- **Queriyot-hezrón.** Existe `queriyot-hezron` (Jos 15:25). Perspicacia «Judas», núm. 4, solo ve probable que Judas Iscariote y su padre fueran de allí, y los Evangelios no lo dicen: `judas-iscariote` y `simon-iscariote` no llevan relación con ese lugar.

## Para Jeremías y Nehemías

- **Ciudades de Moab que ya existen.** `dibon`, `nebo` (la ciudad, no `monte-nebo`), `quiryataim`, `baal-meon`, `aroer`, `jahaz`, `hesbon`, `eleale`, `sibma`, `jazer`, `medeba`, `ar` y `arnon`. Perspicacia solo da como probable que Bet-Diblataim (Jer 48:22) sea `almon-diblataim`.
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

## Para Tito

- **Apolos y Pablo.** `apolos` lleva `accompanies` `pablo` con la palabra `fellow_worker`, c. 55 (1Co 3, 4 y 16): trabajaron el mismo campo en momentos distintos y solo se les ve cerca al escribirse 1 Corintios. Tit 3:13 añade su capítulo a las fuentes de esa relación con un `anadir` y puede alargar su fecha con un `cambiar` sobre esa relación.
- **Tito y Pablo.** `tito` lleva tres relaciones `accompanies` con `pablo`: c. 49 (Gál 2), c. 55 (2 Corintios, ya con la palabra `companion` y con 2Co 2, 7, 8 y 12) y c. 61-64 (Tito). `apply.py` funde un `anadir` de relación en la primera con el mismo tipo y persona, la de 49. Para tocar la de 55 o la de 61-64, 2 Corintios usó un `cambiar` de toda la lista `relations`, con su `antes`; si choca, va a `preguntas` para una edición a mano.

## Para 2 Samuel (desde Josué)

- **Ids de Josué.** `guilgal` es Perspicacia «Guilgal», núm. 1 (2Sa 19:15). 1 Samuel ya usa `bet-aven`, `bet-semes`, `quiryat-jearim`, `ecron`, `asquelon`, `ziclag`, `queila`, `maon`, `carmelo-de-juda`, `soco`, `estemoa`, `jatir` y `saaraim`; 2 Samuel reutiliza los que nombre.
- **Debir de Gad.** `debir-de-gad` (Jos 13:26); Perspicacia cree que es Lo-debar (2Sa 9:4; 17:27). 2 Samuel decide si crea `lo-debar` o la reutiliza.
- **Jafía.** El hijo de David (2Sa 5:15) es Perspicacia «Jafía», núm. 2: otro id y `distinct_from` con `jafia-rey-de-lakis`.
- **Gaas.** 2Sa 23:30 nombra los valles torrenciales de Gaas, junto a `monte-gaas`.
- **El libro de Jasar.** Jos 10:13 y 2Sa 1:18 lo citan; no lleva ficha.

## Para 1 Reyes (desde Josué)

- **Hiel (1Re 16:34).** La razón de `josue-maldice-al-que-reconstruya-jerico` cita 1Re 16:34: cuando 1 Reyes 16 se cierre, ese suceso va en su tramo y el de Hiel cumple la maldición.

## Para 1 y 2 Crónicas (desde Josué)

- **Ciudades levitas.** `los-levitas-reciben-48-ciudades` lleva 1Cr 6:54-81 en `passages`: va en el tramo. Josué funde en una ficha los nombres que Perspicacia da por la misma ciudad, aunque sea con «al parecer»: Hamón y Hamot-Dor están en `hammat`, Rimono y Dimná en `rimon-de-zabulon`, Ramot y Jarmut en `remet`, y Ain en `asan`. Hilén y Holón, Jocmeam y Quibzaim, y Anem y En-Ganim se deciden con ese mismo criterio y su artículo.
- **Ciudades de Simeón (1Cr 4:28-33).** Reutiliza `molada`, `hazar-sual`, `bala` (Bilhá en `names`), `ezem`, `eltolad` (Tolad), `betul` (Betuel), `horma`, `ziclag`, `madmana` (Bet-Marcabot en `names`), `hazar-susa`, `saaraim`, `ain-de-simeon`, `rimon-de-simeon`, `eter` (Token) y `asan`.
- **Acar y Carmí.** 1Cr 2:7 llama Acar a `acan-hijo-de-carmi` (ya en `names`); 1Cr 2:7 y 4:1 nombran a `carmi-hijo-de-zabdi`.
- **Naará.** `naara` (Jos 16:7); Perspicacia solo cree que es la Naarán de 1Cr 7:28.
- **Gaas.** 1Cr 11:32 nombra los valles torrenciales de Gaas, junto a `monte-gaas`.
- **Zaretán.** `zaretan` (Jos 3:16); Perspicacia no asegura que la Zeredá de 2Cr 4:17 sea otra grafía, así que no va en `names`.

## Para Nehemías (desde Josué)

- **Ciudades de Judá y Benjamín (Ne 11:25-36).** Reutilizan los ids de Jos 15 y 18: `cabzeel`, `molada`, `bet-pelet`, `hazar-sual`, `ziclag`, `zanoah`, `adulam`, `lakis`, `azeca`, `zora`, `jarmut`, `gueba` y los demás.

## Para Oseas (desde Josué)

- **Bet-Aven.** La de Jos 7:2 y 18:12 es `bet-aven` (Perspicacia núm. 1). La de Os 4:15; 5:8; 10:5 (núm. 2) sigue como nombre de `betel`.

## Para Hechos, Hebreos y Santiago (desde Josué)

- **Pasajes sin poner.** Hch 7:44, 45 (el tabernáculo entra con Josué) puede ir en `entrada-en-canaan`; Hch 7:15, 16 y Heb 11:22, en `entierran-los-huesos-de-jose-en-siquem`.

## Para 2 Samuel (desde 1 Samuel)

- **Nahás (2Sa 10:1, 2; 1Cr 19:1, 2).** `nahas-rey-de-ammon` es Perspicacia «Nahás», núm. 1, que pone en la misma entrada al de Jabés y al que trató bien a David, aunque ve posible que este fuera su hijo. 2 Samuel decide si lo reutiliza o crea otra ficha.
- **Familia de Saúl.** Existen `jonatan-hijo-de-saul`, `mical`, `merab`, `adriel`, `abner`, `ner`, `abinadab-hijo-de-saul`, `malki-sua` e `isvi-hijo-de-saul`. 2Sa 21:8 nombra a Barzilai el meholatita, padre de Adriel: se crea con su número de Perspicacia «Barzilai» y la relación va en `adriel`. 2Sa 3:15 usa `paltiel-hijo-de-lais` y `lais-de-galim`.
- **Esposas y hermanas de David.** 2Sa 2:2 y 3:2, 3 usan `ahinoam-esposa-de-david` y `abigail-esposa-de-david`. La Abigaíl hermana de David (2Sa 17:25; 1Cr 2:16) es la núm. 2 de Perspicacia «Abigail»: otro id y `distinct_from` en las dos. `zeruya` y `abisai` existen; falta la relación de Zeruyá con David.
- **Tras la muerte de Saúl.** El amalequita de 2Sa 1:1-16 (`saul` ya dice en `not_claimed` que mintió), David y los de Jabés (2Sa 2:4-7) y los huesos llevados a Zelá (2Sa 21:12-14) usan `muerte-de-saul`, `los-de-jabes-galaad-entierran-a-saul-y-a-sus-hijos` y `jabes-galaad`.
- **Otros ids.** `gad-profeta` (2Sa 24; 1Cr 21; 29:29), `goliat` (2Sa 21:19), `abiatar`, `ahimelec-hijo-de-ahitub` y la «Cueva de Adulam» de `adulam` (2Sa 23:13).

## Para 1 Reyes (desde 1 Samuel)

- **La casa de Elí.** Cuando 1 Reyes cree la destitución de Abiatar (1Re 2:26, 27, 35), `un-hombre-de-dios-anuncia-el-juicio-contra-la-casa-de-eli` va en su `mentions`. El sacerdote Sadoc (Perspicacia «Sadoc», núm. 1) aún no tiene ficha; `sadoc-hijo-de-azor` es el de Mt 1.

## Para 1 Crónicas (desde 1 Samuel)

- **Los antepasados de Samuel (1Cr 6:22-28, 33-38).** Reutilizan `elcana-hijo-de-jeroham`, `jeroham-hijo-de-elihu`, `elihu-hijo-de-tohu` (Eliab y Eliel en `names`), `tohu` y `zuf` (Zofai en `names`). Náhat y Tóah van en fichas aparte con un `same_as` con `status: pending`, aún sin `certainty`, hacia `tohu`. Falta la relación con `cohat`. `joel-hijo-de-samuel` es el padre de Hemán el cantor (1Cr 6:33): la relación va en la ficha de Hemán.
- **Abiel y Jeiel (1Cr 8:29; 9:35).** Perspicacia «Abiel», núm. 1, cree que son el mismo: un `same_as` con `status: pending`, aún sin `certainty`, entre Jeiel y `abiel-hijo-de-zeror`, en la ficha de Abiel, cuyo id va primero. La relación `quis-hijo-de-ner` con `ner` ya existe y sale de Crónicas: 1Cr 8:33 y 9:39 le añaden su capítulo.
- **Sucesos con pasaje de Crónicas.** `muerte-de-saul` (1Cr 10:1-7), `los-filisteos-cuelgan-a-saul-en-bet-san` (10:8-10), `los-de-jabes-galaad-entierran-a-saul-y-a-sus-hijos` (10:11, 12), `saul-consulta-a-la-medium-de-en-dor` (10:13) y `los-principes-filisteos-rechazan-a-david` (12:19) van en `entities` de sus tramos.
- **Hermanos de David (1Cr 2:13-16).** `eliab-hijo-de-jese`, `abinadab-hijo-de-jese` y `sama-hijo-de-jese` (Simeá en `names`). `abisai/kin/david/uncle` (tío) sale de Perspicacia y 1Cr 2:16 le añade su capítulo.
- **Bedán (1Cr 7:17).** Es Perspicacia «Bedán», núm. 2: otro id y `distinct_from` con `bedan-libertador`.

## Para Jeremías y Nehemías (desde 1 Samuel)

- **Siló abandonada (Jer 7:12, 14; 26:6, 9).** Recuerda lo que cuenta 1Sa 4: `los-filisteos-capturan-el-arca` va en `mentions` de esos tramos.
- **Nob (Ne 11:32).** Usa `nob`.

## Para 2 Samuel (desde Jueces)

- **La muerte de Abimélec.** `muerte-de-abimelec` lleva 2Sa 11:21 en `passages`: va en el tramo de 2 Samuel 11. Ese versículo llama Jerubeset a Gedeón; el nombre se añade a `names` de `gedeon`.
- **Lehí.** La razón de `lehi` cita 2Sa 23:11, la batalla de Samá: va en ese tramo.
- **Tob y Bet-Rehob (2Sa 10:6, 8).** Bet-Rehob es `bet-rehob`. Perspicacia solo cree que Istob sea `tob`: ficha aparte o mención, según su artículo.

## Para 1 y 2 Crónicas (desde Jueces)

- **Pua.** La TNM escribe Pua para tres personas (Perspicacia «Puá»): `puva`, el hijo de Isacar, que 1Cr 7:1 llama Pua; `pua-partera`, de Éx 1:15; y `pua-hijo-de-dodo`, padre del juez Tolá.
- **Baal-Hermón.** 1Cr 5:23 usa `baal-hermon`, junto a `monte-hermon`.
- **Etam.** `penasco-de-etam` es Perspicacia «Etam», núm. 2 (Jue 15). La de 1Cr 4:32 (núm. 1) y la de 2Cr 11:6 (núm. 3) llevan otro id.

## Para 2 Reyes (desde Jueces)

- **Sela.** `sela-de-los-amorreos` es la de Jue 1:36. La Sela de Edom (2Re 14:7), Perspicacia núm. 2, lleva otro id.

## Para Ezequiel (desde Jueces)

- **Minit.** El trigo de Minit (Ez 27:17) usa `minit`.

## Para Hebreos (desde Jueces)

- **Los jueces de Heb 11:32-34.** Gedeón, Barac, Sansón y Jefté son `gedeon`, `barac`, `sanson` y `jefte`; van en `mentions` del tramo.

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

## Para Filemón, 1 Tesalonicenses, 1 Timoteo y Hebreos (desde Filipenses)

- **Timoteo en Roma.** `timoteo/lived_in/roma`, c. 60-61, deducida de la nota de Flp 1:1 y de Perspicacia «Timoteo», párr. 5, que lo pone en el saludo de Filipenses, Colosenses y Filemón, ya está en la ficha, y Col 1:1 le añadió `colosenses-1`. Flm 1 añade `filemon-1` a sus fuentes con un `anadir`, sin crear otra.
- **La ayuda de Filipos en Tesalónica.** Es `los-filipenses-envian-ayuda-a-pablo-en-tesalonica` (Flp 4:15, 16, c. 50, orden 1702 de la serie `hechos`). Si 1 Tesalonicenses habla de esa estancia (1Te 2:9), puede nombrarlo en `mentions`.
- **Los azotes de Filipos.** Filipenses puso «Flp 1:30» en `pablo-y-silas-azotados-y-encarcelados`. La referencia marginal de ese versículo remite a Hch 16:22, 23 y a 1Te 2:2. 1Te 2:2 añade su pasaje a ese suceso con un `anadir`.
- **Colaboradores de Pablo.** Cuando el texto llama a alguien colaborador de Pablo, su `accompanies` lleva la palabra `fellow_worker`: Epafrodito (Flp 2:25) y Clemente (Flp 4:3). Evodia y Síntique (Flp 4:3) llevan `caption: colaboradora`, porque el vocabulario no tiene palabra femenina. Timoteo es la excepción: su `timoteo/accompanies/pablo`, que tocan muchos libros a la vez, sigue sin palabra. «Como un hijo con su padre» (Flp 2:22) es una comparación, no parentesco. Ponerle `fellow_worker` (Ro 16:21) es un solo `cambiar` sobre la lista entera, y lo hace 1 Timoteo cuando ninguna otra cola abierta toque `timoteo`.
- **Timoteo preso.** Perspicacia «Timoteo», párr. 5, dice que parece que estuvo preso en Roma entre Filipenses y Hebreos (Flp 2:19; Heb 13:23). Flp 2:19-23 solo cuenta que Pablo pensaba enviarlo a Filipos, sin suceso; Hebreos decide si su liberación es un suceso.

## Para Salmos (si se relee, desde Efesios)

- **Sl 68:18.** La nota del tramo 15-18 sigue a La Atalaya de 2006: los cautivos serían de la conquista de Canaán, y el tramo lleva `conquista-de-canaan` en `mentions`. La nota de estudio de Ef 4:8, más reciente, dice que el salmo celebra la toma de Jerusalén (Sion) por David, y la referencia de Sl 68:18 lleva a 2Sa 5:7. Manda la más reciente: se corrige la nota, se quita esa mención y se pone `david-rey-de-todo-israel` (2Sa 5:1-10, 1070 a.e.c.), que ya existe y lleva la toma de Jerusalén. Ef 4:7-10 ya lo tiene en `mentions`.

## Para Hechos (si se relee, desde Efesios)

- **Las cartas escritas en Roma.** El tramo Hch 28:30, 31 ya nombra `letter:efesios` y `letter:colosenses` en `mentions`; puede nombrar también `pablo-escribe-efesios`, `pablo-escribe-colosenses` y `epafras-informa-a-pablo-en-roma` (c. 59-61, durante esos dos años).

## Para 1 Reyes, 2 Reyes, 1 Crónicas y 2 Crónicas (desde Amós)

- **Hazael y los Ben-Hadad.** `hazael` (`1200001923`) y `ben-hadad-hijo-de-hazael` (`1200000636#3`) existen desde Am 1:4. Reyes crea Ben-Hadad I y II (núm. 1 y 2) con `distinct_from` en las tres fichas, y añade `hazael` `succeeds` Ben-Hadad II (2Re 8:15). La unción de 1Re 19:15 también es de Reyes.
- **Damasco y Quir.** Cuando Reyes cree la toma de Damasco por Tiglat-piléser III y el destierro a Quir (2Re 16:9), el suceso va en `mentions` de los tramos Amós 1:3-5 y 9:7-10. Los de Hazael contra Galaad (2Re 10:32, 33) van a Amós 1:3-5.
- **Amasías.** `amasias`, el rey de Judá, ya lleva la clave (`1200000224#2`) y su `disambiguation`, como la de `amos-profeta` (`1200000246#1`); el sacerdote de Betel es `amasias-sacerdote-de-betel` (`#3`). Reyes y Crónicas no vuelven a proponerlas.
- **Jeroboán II.** Su `summary` ya dice «desde Lebó-Hamat» (2Re 14:25), no «desde Hamat». Un cambio posterior parte de ese texto. `hamat` y `lebo-hamat` son dos fichas: 2Re 14:28 usa `hamat`.
- **Samaria.** Lleva «Montaña de Samaria» en `names` (Am 4:1; 6:1): el monte que Omrí compra en 1Re 16:24.
- **El terremoto.** `terremoto-en-dias-de-uzias` (Am 1:1; Zac 14:5) es de Amós. Si Crónicas lo nombra al hablar de Uzías, añade su pasaje.

## Para Josué, Jueces, 1 Samuel, 2 Samuel y Jeremías (desde Amós)

- **Ciudades filisteas.** `asquelon` y `ecron` existen desde Am 1:8 (Perspicacia escribe Eqrón, que va en `names`). Gaza, Asdod y Gat ya existían.
- **Queriyot.** `queriyot` (Am 2:2) no tiene punto: dos candidatos «alternativa», Ar y Saliyá. Jer 48:24, 41 usan ese id.
- **Harmón.** `harmon` (Am 4:3) lleva como único candidato el peñasco de Rimón, en Rammun. Si Jueces 20:45-47 crea ese peñasco, el candidato de `harmon` puede remitir a él.

## Para Jeremías, Ezequiel y Hechos (desde Amós)

- **Bet-Edén y Edén.** Los hijos de Edén de Is 37:12 y 2Re 19:12 son `eden-centro-comercial` (Perspicacia «Edén», núm. 2), que Ez 27:23 también usa. Perspicacia solo cree que sea una forma corta de Bet-Edén, así que `bet-eden` sigue aparte y lo dice `not_claimed`.
- **Hamat.** `hamat` existe (Hamat la Grande en `names`): Jer 49:23 lo usa, como ya Is 10:9, 11:11 y 36:19.
- **Creta es Caftor.** `creta` lleva Caftor en `names`: Jer 47:4 usa `creta`, y también Dt 2:23 cuando habla del lugar.
- **Israel es José.** `israel` lleva «José» en `names` para el reino del norte (Am 5:6, 15; 6:6), como Efraín.
- **Hechos 7 y 15.** Los tramos Amós 5:25-27 y 9:11-12 llevan `discurso-de-esteban` y `concilio-de-jerusalen-49` en `mentions`. Hechos no nombra a Amós, así que sus tramos no lo llevan.
- **Los cuarenta años en el desierto.** Cuando exista el suceso de Números (el andar de Israel por el desierto), va en `mentions` de los tramos Amós 2:9-12 y 5:25-27.

## Para 2 Reyes, Jeremías y Lamentaciones (desde Abdías)

- **Abd 11 y la deportación de 617.** Las referencias de Abd 11 remiten a 2Re 24:10, 16 y Jer 52:28 (Joaquín, 617 a.e.c.), pero Perspicacia «Abdías, Libro de» y «Toda Escritura» ponen la conducta de Edom en 607. Abd 11-14 está en `passages` de `destruccion-de-jerusalen-607`. Cuando Reyes cree la deportación de 617, decide si Abd 11 va también en sus `passages`.
- **El campo de Samaria.** Abd 19 lleva `israel` en `entities`, con «Samaria» en sus `names` (Perspicacia «Samaria», núm. 2: el nombre de la capital cubrió todo el reino), y `samaria` en `mentions`. Las referencias de Abd 19 remiten a 2Re 17:24 y Jer 31:5, que Perspicacia pone en ese mismo núm. 2: Jeremías 31 usa el mismo criterio.
- **Edom y Nabonido.** Perspicacia «Edom» y «Toda Escritura» ven cumplido Abd 7 en la conquista de Edom por Nabonido, que no es un suceso del relato. Abdías pone `nabonido` en `mentions`; Jer 49:7-22, Ez 25:12-14 y 35 y Mal 1:3, 4 pueden hacer lo mismo.

## Para Deuteronomio, Josué, Jueces, 1 Reyes, 1 Crónicas, 2 Crónicas y Jeremías (desde Abdías)

- **Sefelá.** `sefela` existe desde Abd 19 (OpenBible af084cf). Usan ese id los pasajes que cita Perspicacia «Sefelá»: Deuteronomio 1:7; Josué 9:1, 10:40, 11:2 y 12:8, más 15:33-44, que da sus ciudades; Jueces 1:9; 1 Reyes 10:27; 1 Crónicas 27:28; 2 Crónicas 1:15, 9:27, 26:10 y 28:18; y Jeremías 17:26, 32:44 y 33:13. Jos 11:16 nombra además la Sefelá de la región montañosa de Israel, que Perspicacia sitúa quizá entre Samaria y Sarón: Josué decide si es otra ficha.
- **Benjamín en Abd 19.** «Benjamín conquistará Galaad» nombra a la tribu como pueblo, sin persona; su territorio no tiene ficha, mientras que `juda` sí va en `mentions` de Abd 10-14. Cuando Josué (18:11-28) cree `territorio-de-benjamin`, lo añade a `mentions` del tramo Abdías 1:19-20.
- **Región montañosa de Esaú.** Está en `names` de `edom` (Abd 8, 9, 19, 21). `seir` sigue siendo la región montañosa de Gé 14:6 y 36:8.
- **Sefarad.** `sefarad` (Abd 20) no tiene punto: un solo candidato, Saparda de Media, que Perspicacia da como probable.

## Para Amós (desde Abdías)

- **Isaac como pueblo.** La regla de `versiculos.md` sección 4 deja fuera de `mentions` al patriarca cuando su nombre designa al pueblo. Los tramos Amós 7:7-9 y 7:10-17 llevan `person:isaac` por «lugares altos de Isaac» y «casa de Isaac», el pueblo de Israel: sobra en los dos. «Dios de Jacob» (Sl 20) y «descendencia de Jacob» (Sl 22) nombran al hombre y se quedan.

## Para 2 Reyes (desde Jonás)

- **Amitái.** `amitai` existe (clave `1200000231`), con `lived_in` `gat-hefer` deducido de Perspicacia «Amitai», y `jonas-profeta` lleva `kin` `amitai` con la palabra `father`. Las dos relaciones y la de `jonas-profeta` `lived_in` `gat-hefer` citan o pueden citar 2Re 14:25: el tramo de 2 Reyes 14 las lleva al cerrarse. La profecía de Jonás sobre Jeroboán II es un suceso de Reyes.
- **Fecha de Jonás.** Los sucesos de Jonás van en c. 844 a.e.c., serie `jonas`, como la ficha del profeta. Si Reyes fecha su profecía a Jeroboán II, no cambia esos sucesos.

## Para Josué, 2 Crónicas, Nehemías y Jeremías (desde Miqueas)

- **Zenán y Maarat.** `zaanan` (Miq 1:11) y `marot` (Miq 1:12) no llevan Zenán ni Maarat en `names`: Perspicacia solo dice que hay quien las iguala, y las dos lo dejan en `not_claimed`. Josué ya creó `zenan` (Jos 15:37) y `maarat` (Jos 15:59) con los mismos puntos: ʽAraq el-Kharba (31.599435, 34.803939) y Beit Ummar (31.621389, 35.102222). Allí la duda solo está en el `summary`; la integración les añade el `not_claimed` simétrico (que Zenán sea la Zaanán de Miq 1:11; que Maarat sea la Marot de Miq 1:12). Las dos `coord_note` describen bien su punto aunque digan cosas distintas: en la ficha Zaanan de OpenBible (a4e7fa8) ʽAraq el-Kharba es la segunda resolución de la primera identificación, y en la ficha Zenan (a5e1150), la segunda identificación.
- **Moréset.** `moreset` existe (Moréset-Gat en `names`) y `miqueas-profeta` vive allí. Jer 26:18 usa ese id. Cuando Jeremías cree el suceso de Jer 26:17-19, en que se recuerda Miq 3:12 y que Ezequías hizo caso, va en `mentions` del tramo Miqueas 3:9-12.
- **Ofel.** Está en `names` de `jerusalen` desde Is 32:14. 2Cr 27:3 y Ne 3:26 usan esa ficha, y Perspicacia «Ofel» compara con él el «montículo» de Miq 4:8, que el tramo Miqueas 4:6-8 puede nombrar en su `note`.
- **La montaña de la Casa.** `monte-moria` lleva ese nombre (Miq 3:12, cuya nota dice «el monte del templo»).

## Para 1 y 2 Reyes (desde Miqueas)

- **Claves de Omrí y Acab.** La integración de Miqueas puso a `omri` la clave `1200003324#3` y a `acab` la `1200000138#1`. Reyes no vuelve a proponerlas: un `cambiar` desde `null` chocaría.
- **Tierra de Nemrod.** Está en `names` de `asiria` (Miq 5:6). El tramo Miqueas 5:5-6 no lleva `person:nemrod`: su nombre designa la tierra.

## Para 2 Reyes, 2 Crónicas y Esdras (desde Nahúm)

- **Asurbanipal y Asnapar.** `asurbanipal` (clave `1200000430`) existe desde Na 3:8-10. Esa clave es a propósito la entrada «Asurbanipal» de Perspicacia, que solo remite a «Asnapar»: así la del artículo, `1200000404`, queda libre para `asnapar`. Perspicacia «Asnapar» solo ve muy probable que sea el Asnapar de Esd 4:10, así que Esdras crea `asnapar` (`1200000404`) con `same_as` `asurbanipal`, `inferred: true` y `status: pending`.
- **Esar-Hadón.** Existe desde Is 37:38 (`esar-hadon`, clave `1200001416`), hijo y sucesor de Senaquerib, y `asurbanipal` ya lleva `kin` `esar-hadon` con la palabra `father`. Esd 4:2 usa ese id.
- **Nabopolasar y Ciaxares.** `nabopolasar` y `ciaxares` existen, con `perspicacia: null` porque Perspicacia no les dedica artículo. La integración de Nahúm puso a `nabucodonosor-ii` las relaciones `kin` `nabopolasar` con la palabra `father` y `succeeds` `nabopolasar`, y añadió `nabopolasar` a `nabopolasar-funda-dinastia`. 2 Reyes, Jeremías y Daniel reutilizan esos ids.

## Para Jeremías y Ezequiel (desde Nahúm)

- **No-Amón.** `no-amon` existe (Tebas, OpenBible a9674fc), con No y Tebas en `names`: Jer 46:25 y Ez 30:14-16 usan ese id.
- **Put como tierra.** `put` existe también como lugar (el pueblo y su tierra; la persona `put` es el hijo de Cam), con precisión incierta en el punto de Libia y un `not_claimed` porque Na 3:9 separa Put de los libios. Jer 46:9 y Ez 27:10, 30:5 y 38:5 usan `place:put`, sin `person:put`. Is 66:19 no: la TNM dice Pul, que es otro lugar (`pul`).
- **Elqós.** `elqos` existe sin punto (Beit Jibrin favorecido; Galilea como alternativa, en el punto de El Kauzeh de OpenBible). La TNM solo da el gentilicio «elcosita»; Elqós es la única grafía del lugar en jw.org.

## Para Josué y Jueces (desde Habacuc)

- **Sucesos que recuerda Habacuc 3.** La Atalaya del 1 de febrero de 2000 (`w00-gozosos-en-dios`) une la oración a la toma de Jericó (Jos 6), al sol que se detiene sobre Gabaón (Jos 10:12-14, la referencia de Hab 3:11) y a la crecida del Cisón contra Sísara (Jue 5:21). Jericó, Gabaón y el Cisón ya van en `mentions` de Habacuc 3:1-2 y 3:8-11.
- **Cusán no es Cusán-risataim.** `cusan` (Hab 3:7) es un lugar sin punto, quizá otro nombre de Madián o un país vecino (Perspicacia «Cusán»). El rey de Jue 3:8-10 es una persona aparte, con su propio artículo.

## Para 2 Reyes, 2 Crónicas, Esdras, Nehemías y Jeremías (desde Sofonías)

- **La reforma de Josías.** Aún no es un suceso. Perspicacia «Sofonías, Libro de» pone el libro antes de ella (hacia 648 a.e.c.), y la referencia de Sof 1:4 remite a 2Re 23:5. Cuando Reyes o Crónicas cree la reforma (2Re 23:4-14; 2Cr 34:3-7), va en `mentions` de los tramos Sofonías 1:1 y 1:4-6.
- **Claves ya puestas.** La integración de Sofonías puso a `guedalias`, el gobernador, la clave `1200001632#4` y el `distinct_from` hacia `guedalias-hijo-de-amarias` (núm. 2), y a `ezequias` su `disambiguation`. Reyes y Jeremías no vuelven a proponerlas: un `cambiar` desde `null` chocaría.
- **El Ezequías de Sof 1:1.** Es `ezequias-antepasado-de-sofonias` (Perspicacia «Ezequías», núm. 2), y la ficha `ezequias` lleva el `same_as` hacia él, deducido y con `certainty: possible`: Perspicacia «Ezequías», la publicación más reciente, dice «quizás». Se funden solo si una publicación lo afirma. El de Esd 2:16 y Ne 7:21 es el núm. 3: otro id y `distinct_from` con los dos.
- **Otros Sofonías.** `sofonias-profeta` es el núm. 2 de Perspicacia. El sacerdote hijo de Maaseya (Jer 21:1; 29:25; 37:3; 2Re 25:18) es el núm. 3, el levita de 1Cr 6:36 el núm. 1 y el padre de Josías o Hen (Zac 6:10) el núm. 4, que ya es `sofonias-padre-de-josias`: cada uno con su id y `distinct_from` con `sofonias-profeta`.
- **Barrios y puertas.** Puerta del Pescado, Segundo Barrio y Mactés están en `names` de `jerusalen`. 2Re 22:14, 2Cr 33:14, 34:22 y Ne 3:3, 12:39 usan esa ficha.

## Para Esdras, Nehemías, 1 Crónicas, 2 Reyes, Daniel y Hebreos (desde Ageo)

- **Un suceso por mensaje.** Ageo lleva cuatro sucesos anclados al día en 520 a.e.c., serie `ageo`: `primer-mensaje-de-ageo` (1 de elul, Ag 1:1-11), `segundo-mensaje-de-ageo` (21 de tisri, Ag 2:1-9), `tercer-mensaje-de-ageo` y `cuarto-mensaje-de-ageo` (24 de kislev, Ag 2:10-19 y 2:20-23).
- **`se-reanuda-la-obra-del-templo-520` es de Esdras.** Desde Ageo es solo el 24 de elul de 520 (Ag 1:12-15): el título y el resumen hablan de Zorobabel, Josué y el pueblo, y `people` ya no lleva a `zacarias-profeta` ni `passages` a Zac 1:1, porque Zacarías empezó en el mes octavo (Zac 1:1; Perspicacia «Ageo»). Esdras (Esd 5:1, 2) lo pone en `entities` de su tramo; el primer mensaje de Zacarías es otro suceso, `primer-mensaje-de-zacarias`. El tramo Ageo 2:15-19 lo lleva en `mentions`: la referencia de Ag 2:18 remite a Esd 5:2.
- **Josué y Jehozadac.** `josue-sumo-sacerdote` lleva la clave `1200002446#4` (Perspicacia «Jesúa», núm. 4); «Josué», núm. 4 (`1200002523`), es el mismo hombre con los pasajes de Ageo y Zacarías y no se usa como clave. Nadie vuelve a proponer la clave de Josué: un `cambiar` desde `null` chocaría. Su padre es `jehozadac` (`1200002400`, con Jozadac y Jehozadaq en `names`). Esd 3:2, 8; 5:2; 10:18 y Ne 12:26 añaden su capítulo a la relación `josue-sumo-sacerdote/kin/jehozadac`.
- **Seraya.** `jehozadac` aún no lleva la relación con su padre, el sacerdote principal Seraya, que no tiene ficha. Quien lo cree (2Re 25:18; 1Cr 6:14) se la añade con `anadir`. Su `lived_in babilonia` (con `inferred: true`, porque Babilonia la nombra Perspicacia y no 1Cr 6:15) cita 1Cr 6:15 en la `reason`: el tramo de 1 Crónicas 6 la pone en `entities` y le añade `1-cronicas-6`.
- **Darío el medo.** `dario-el-medo` sigue sin clave: le corresponde `1200001124#1` (Perspicacia «Darío», núm. 1), porque `dario-i` ya lleva `#2`. La pone Daniel.
- **Hebreos 12.** Heb 12:26, 27 cita Ag 2:6: su tramo lleva `segundo-mensaje-de-ageo` en `mentions`, sin añadir el pasaje.

## Para Esdras, Nehemías, Ageo, 2 Reyes, 2 Crónicas, Job, Jeremías, Ezequiel, Joel y Mateo (desde Zacarías)

- **El profeta y su linaje.** `zacarias-profeta` lleva la clave `1200004681#20` (Perspicacia «Zacarías», núm. 20); su padre es `berekias-hijo-de-ido` (`1200000650#7`, con `distinct_from` hacia `baraquias`) y su abuelo, `ido-padre-de-berekias` (`1200002135#4`). Esd 5:1 y 6:14 («nieto de Idó») usan esos ids; nadie vuelve a proponer la clave del profeta.
- **Idó el sacerdote (Ne 12:4, 16).** Es Perspicacia «Idó», núm. 5, que ve posible que sea el núm. 4. Nehemías lo crea con su propio id y un `same_as` hacia `ido-padre-de-berekias`, con `inferred: true` y `certainty: possible`, en la ficha cuyo id va primero. Si el Zacarías de la casa de Idó (Ne 12:16) es el profeta, lo decide Nehemías con Perspicacia «Zacarías».
- **Sucesos de Zacarías.** Serie `zacarias`: `primer-mensaje-de-zacarias` (hesván de 520), `visiones-nocturnas-de-zacarias` (24 de sebat de 519, Zac 1:7-6:8), `zacarias-corona-a-josue` (Zac 6:9-15), `betel-consulta-sobre-el-ayuno` (4 de kislev de 518, Zac 7:1-8:23), `zacarias-profetiza-contra-las-naciones` (c. 518, Zac 9:1-11:17), `zacarias-pastorea-el-rebano-destinado-al-matadero` (Zac 11:4-14) y `zacarias-anuncia-que-jehova-guerreara-y-reinara` (c. 518, Zac 12:1-14:21). Los mensajes llevan `type: speech` y `roles: {zacarias-profeta: spoke}`, y `present: [zacarias-profeta]` en Jerusalén. Las visiones y Zac 9-14 no dicen dónde habló: ese sitio se deduce de Esd 5:1 y Zac 7, y la `reason` lo dice. Esd 5:1 y 6:14 los ponen en `mentions`.
- **Dónde vivía el profeta.** `zacarias-profeta/lived_in/jerusalen` es deducida (`inferred: true`) y lleva `esdras-5` en `sources`: el tramo de Esd 5:1 la pone en `entities` o en `mentions`.
- **Los mensajes de Ageo.** Los cuatro no llevan `type: speech` ni `roles: {ageo: spoke}`, que pide `versiculos.md`, sección 6. Zacarías no pudo ponérselos: `apply.py` no traduce un `cambiar` del campo `roles` (falta en el mapa de `scripts/migration/migrate.py`). Quien reabra Ageo o arregle el mapa lo hace.
- **Profecías que cita un Evangelio.** Zacarías añade el versículo a `passages` del suceso que lo cumple y lo deja en `mentions` de su tramo: Zac 9:9 en `entrada-triunfal-en-jerusalen`, 11:12 en `judas-acuerda-la-traicion` (el precio, Mt 26:15), 11:12, 13 en `muerte-de-judas`, 12:10 en `entierro-de-jesus` y 13:7 en `predice-las-negaciones-de-pedro` y en `arresto-en-getsemani` (la huida, Mt 26:56). Joel 2:28-32 no lo hizo con `pentecostes-33`: quien reabra Joel decide si lo iguala.
- **El templo.** Zac 4:9, 10 está en `passages` de `fundamento-del-templo-536` y de `templo-terminado-515` (Perspicacia «Plomada»). Esdras 3 y 6 no tienen que añadir nada por Zacarías.
- **Llanura de Meguidó y Hadadrimón.** «Llanura de Meguidó» está en `names` de `valle-de-jezreel`, con 2Cr 35:22 en su nota: el tramo 2 Crónicas 35:20-25 pone `valle-de-jezreel`. `hadadrimon` existe; `muerte-de-josias` va solo en `mentions` de Zac 12:10-11, porque Perspicacia ve posible, no seguro, que el duelo fuera por Josías.
- **Puertas y torre de Jerusalén.** Puerta de Benjamín, Primera Puerta, Puerta de la Esquina y Torre de Hananel están en `names` de `jerusalen` (Zac 14:10). 2Re 14:13, 2Cr 26:9, Jer 31:38, 37:13, 38:7 y Ne 3:1, 12:39 usan esa ficha.
- **Josías hijo de Sofonías.** `josias-hijo-de-sofonias` (`1200002525#2`) y `hen` (`1200001984`) llevan un `same_as` probable, en la ficha de `hen`. `josias` recibe su `disambiguation` desde `null` y el `distinct_from`: Reyes y Jeremías no vuelven a proponerla.
- **Alejandro en Tiro.** `alejandro-destruye-tiro` (julio de 332 a.e.c., en `potencia-griega`) cita Eze 26:4, 12 en su `reason`: el tramo de Ezequiel 26 lo pone en `mentions`. Alejandro sigue sin ficha, como decidió Joel. Tiro y `alejandro-conquista-egipto` comparten año, así que van en la serie `alejandro` (órdenes 1 y 2, como los cuenta Perspicacia «Alejandro»); un suceso nuevo de Alejandro en 332 toma su número en esa serie.
- **Satanás en una visión.** Zac 3:1, 2 muestra a Satanás oponiéndose a Josué dentro de la cuarta visión. Lo visto en una visión no es suceso (`versiculos.md`, sección 6) y tampoco relación: no hay `tie` hacia `satanas`, y la oposición queda en la `note` del tramo. Job 1-2 y Mt 4 narran escenas, no visiones: ahí vale la sección 7, y quien los reabra apunta la relación que el texto afirme.
- **«La casa de X» (Zac 12:10-13:1).** La casa de un hombre cuyo linaje se nombra lleva a ese hombre en `mentions`: David y `natan-hijo-de-david`, este con la condición de Perspicacia «Natán», núm. 4. La casa de una tribu (Leví, José, Judá) y un clan (los simeítas) son pueblo, sin `person`.

## Para 1 Reyes y 2 Reyes (desde Malaquías)

- **Elías ya tiene ficha.** Es `elias-profeta` (`1200001307#1`, Perspicacia «Elías», núm. 1), creada antes de la migración con 1Re 17 y 18 en sus fuentes. 1 y 2 Reyes la usan y no crean `elias`: una ficha nueva con la misma clave se fundiría en esta. Mal 4:5, 6 ya la lleva en `mentions` del tramo 4:5-6, junto a Juan el Bautista, a quien Jesús y el ángel aplican la profecía; no hace falta añadir nada más a Malaquías.

## Para Nehemías (desde Malaquías)

- **El suceso de Malaquías cuelga de Nehemías 13.** `malaquias-reprende-a-sacerdotes-y-pueblo` (Mal 1:1-4:6, después de 443 a.e.c.) lleva `after: nehemias-vuelve-a-la-corte-443`, porque Perspicacia «Malaquías, Libro de» y «Toda Escritura», libro 39, lo ponen tras la vuelta de Nehemías a Jerusalén. Si Nehemías separa ese regreso en un suceso propio (Ne 13:6, 7), el `after` pasa a ese suceso con un `cambiar`, y los tramos Malaquías 1:1, 2:5-9, 2:10-12 y 3:6-12, que nombran el suceso actual por sus referencias a Ne 13, lo añaden a `mentions`.
- **El gobernador de Mal 1:8.** El texto no lo nombra; «Toda Escritura», libro 39, párr. 3, deduce que era Nehemías. Por la sección 4 de `versiculos.md` va solo en la `note` del tramo 1:6-9, sin `mentions` ni relación. Nehemías no lo usa como pasaje suyo.

## Para Jeremías, Ezequiel y Daniel (desde Malaquías)

- **El suceso de todo un libro profético no sitúa a nadie.** Como Joel, Abdías, Nahúm, Habacuc, Sofonías y Malaquías, va sin `type` ni `roles` y con `present: []`, aunque la tabla diga dónde se escribió; la residencia deducida va en `lived_in`. Solo un mensaje que el texto fecha y sitúa, como los de Zacarías, lleva `type: speech`, `spoke` y `present`.

## Para 2 Reyes y 2 Crónicas (desde Isaías)

- **Personas que ya existen.** `amoz` (`1200000248`), `rezin-rey-de-siria` (Rezín, núm. 1, `1200003721#1`), `remalias` (`1200003688`), `tabeel-de-tiempos-de-acaz` (`1200004293#1`), `uriya-sacerdote-de-acaz` (`1200004523#1`, con Urías en `names`; 2Re 16:10-16), `sargon` (`1200003842`), `eliaquim-hijo-de-hilquias` (`1200001295#1`), `hilquias-padre-de-eliaquim` (`1200002026#3`), `sebna` (`1200003975`), `joa-hijo-de-asaf` (`1200002470#3`), `asaf-padre-de-joa` (`1200000400#3`), `tirhaca` (`1200004422`), `adramelec-hijo-de-senaquerib` (`1200000118#1`), `sarezer-hijo-de-senaquerib` (`1200003954#1`), `esar-hadon` (`1200001416`), `merodac-baladan` (`1200003002`, Berodac-Baladán en `names`) y `baladan` (`1200000544`). Isaías también puso las claves de `pecah` (`1200003415`), `senaquerib` (`1200003897`) y `ciro` (`1200001102`): nadie las vuelve a proponer.
- **Lugares que ya existen.** `campo-del-lavandero` (2Re 18:17), `sefarvaim` (2Re 17:24, 31; 18:34; 19:13), `hena`, `iva` y `arpad` (2Re 18:34; 19:13), `gozan`, `rezef`, `tel-asar` y `eden-centro-comercial` (2Re 19:12), y `quir-de-moab`, con Quir-Haréset en `names` (2Re 3:25). En `names` de `jerusalen` están el Estanque superior (2Re 18:17), Siloé, la Casa del Bosque del Líbano, el estanque inferior y el viejo, Ofel (2Cr 27:3) y la Escalera de Acaz (2Re 20:11).
- **Dos Selas.** `sela-de-la-profecia-contra-moab` es la Sela de Is 16:1, Perspicacia «Sela» núm. 3. La Sela de Edom que pasó a llamarse Jocteel (2Re 14:7) es la núm. 2: 2 Reyes le crea ficha propia, y cada una dice en `not_claimed` que Perspicacia no sabe si son la misma. `distinct_from` solo vale entre personas.
- **Sucesos de Isaías 36-39.** Isaías los creó con sus pasajes y los de 2 Reyes; 2 Reyes los pone en `entities` de sus tramos y 2 Crónicas añade los suyos: `senaquerib-contra-jerusalen` (2Re 18:13-19:36, ya sin la muerte del rey y con `present: [senaquerib]`), `el-rabsaque-desafia-a-jerusalen` (2Re 18:17-37; 2Cr 32:9-19), `ezequias-consulta-a-isaias` (2Re 19:1-7), `ezequias-ora-ante-las-cartas-de-senaquerib` (2Re 19:8-19; 2Cr 32:17, 20), `isaias-anuncia-la-derrota-de-senaquerib` (2Re 19:20-34), `el-angel-de-jehova-mata-a-185000-asirios` (2Re 19:35, 36; 2Cr 32:21), `muerte-de-senaquerib` (2Re 19:37; 2Cr 32:21), `ezequias-enferma-y-jehova-le-anade-quince-anos` (2Re 20:1-11; 2Cr 32:24) y `mensajeros-de-babilonia-visitan-a-ezequias` (2Re 20:12-19; 2Cr 32:31).
- **Relaciones que citan Reyes.** Varias relaciones nuevas citan 2Re 15-20 en su razón (Rezín, Pécah hijo de Remalías, los hijos de Senaquerib, Tirhacá, Eliaquim, Sebná y Joá): los tramos de 2 Reyes las llevan al cerrarse.
- **Mayordomo, secretario y registrador.** El vocabulario no tiene esos cargos (Is 22:15; 36:3; 2Re 18:18), así que Eliaquim, Sebná y Joá no llevan `holds_office`, ni Eliaquim `succeeds` a Sebná. Si se añaden, citan Is 22 y 36 y 2Re 18.
- **Sucesos que Isaías nombra y aún no existen.** Rezín y Pécah suben contra Jerusalén (2Re 16:5; Is 7:1): va en `entities` del tramo Isaías 7:1-2, con Is 7:1 en `passages`. Acaz paga a Tiglat-Piléser III, que toma Damasco (2Re 16:7-9): `mentions` de Isaías 7:18-25, 8:1-4, 10:5-11 y 17:1-3. La humillación de Galilea (2Re 15:29): Isaías 9:1-2. Ezequías vence a los filisteos hasta Gaza (2Re 18:8): Isaías 14:28-32. Quita los lugares altos (2Re 18:4): Isaías 36:4-10. El trato de Hosea con So de Egipto (2Re 17:4): Isaías 31:1-3. El destierro de Joaquín en 617 (2Re 24:10-16): Isaías 24:1-6.
- **Senaquerib.** La razón de su `died_in` `ninive` se reescribió con palabras propias y cita Is 37:37, 38 y 2Re 19:36, 37.

## Para Jeremías y Ezequiel (desde Isaías)

- **Lugares que ya existen.** `patros` (Jer 44:1, 15; Ez 29:14; 30:14), `lud`, el Lud camita (Jer 46:9; Ez 27:10; 30:5), `tubal`, el pueblo (Ez 27:13; 32:26; 38:2, 3; 39:1), `dedan` (Jer 25:23; 49:8; Ez 25:13; 27:20; 38:13), `eden-centro-comercial` (Ez 27:23), `quir-de-moab`, con Quir-Haréset en `names` (Jer 48:31, 36 dice Quir-heres), `horonaim` (Jer 48:3, 5, 34), `luhit` (Jer 48:5), `nimrim` y `eglat-selisiya` (Jer 48:34). `sinim` no es Siene: Ez 29:10 y 30:6 crean `siene` aparte.
- **Sucesos que Isaías nombra y aún no existen.** El sitio de Tiro por Nabucodonosor (Ez 29:17-20): `mentions` de los tramos Isaías 23:1-7, 8-12 y 13-14. La huida de los judíos a Egipto (Jer 43-44): Isaías 19:18-22. El castigo de Edom (Jer 49:7-22): Isaías 34:5-8 y 34:9-15.
- **Tófet.** El de Is 30:33 es simbólico y va en la `note`. El Tófet real del valle de Hinón (2Re 23:10; Jer 7:31, 32; 19) no tiene ficha ni está en `names` de `valle-de-hinon`.
- **El jardín de Dios.** `eden` lleva «Jardín de Jehová» en `names` (Is 51:3). Ezequiel decide si Ez 28:13 añade «jardín de Dios».
- **Profecía y cumplimiento.** Isaías deja en `mentions`, sin pasaje, los sucesos cuyo cumplimiento solo identifica una publicación, como Joel y Miqueas, aunque el texto nombre a Babilonia o a Asiria (Is 13:17-19; 21:1-9; 31:4-9; 47; 48:14, 20). Solo entra el pasaje cuando el texto nombra a Ciro (Is 44:28; 45:1, 2) o cuando un Evangelio o Hechos lo cita en la escena.

## Para Esdras y Nehemías (desde Isaías)

- **La madera de Tiro (Esd 3:7).** «Las profecías de Isaías» ve cumplido Is 23:18 en el cedro que Tiro vende para el templo. Cuando Esdras cree ese suceso, va en `mentions` del tramo Isaías 23:15-18.

## Para Daniel (desde Isaías)

- **La caída de Babilonia.** `caida-de-babilonia` nombra en su resumen las tropas de Ciro, pero `people` solo lleva a Belsasar y a Daniel. Perspicacia «Ciro» hace entrar al rey 17 días después: si Daniel lo añade, el suceso necesita `present`.

## Para Mateo, Lucas, Hechos y Romanos (desde Isaías)

- **Jesús y Jesé.** `jesus` lleva `kin` `jese` con la palabra `ancestor`, deducida, desde Is 11:1, 10. Mt 1:5, 6, Lu 3:32 y Ro 15:12 añaden su capítulo a esa relación si se reabren.
- **Pasajes de Isaías en sucesos de los Evangelios.** Por la regla de Zacarías llevan un versículo de Isaías `jose-lleva-a-maria-a-su-casa` (Is 7:14), `hijo-del-funcionario-y-sinagoga-de-nazaret` (9:1, 2; 61:1, 2), `parabolas-del-reino` (6:9, 10), `jehova-habla-desde-el-cielo` (6:10; 53:1), `tradiciones-humanas` (29:13), `juan-comienza-su-ministerio` (40:3-5), `juan-niega-ser-el-cristo` (40:3), `mano-paralizada-en-sabado` (42:1-4), `curaciones-en-capernaum` (53:4), `predice-las-negaciones-de-pedro` (53:12), `pan-de-la-vida` (54:13), `higuera-maldita-y-limpieza-del-templo` (56:7), `entrada-triunfal-en-jerusalen` (62:11), `felipe-y-el-funcionario-etiope` (53:7, 8), `discurso-de-esteban` (66:1, 2), `discurso-en-antioquia-de-pisidia` (55:3), `expulsados-de-antioquia-de-pisidia` (49:6) y `pablo-da-testimonio-a-los-judios-de-roma` (6:9, 10). `regreso-a-nazaret` no lleva Is 11:1: Mt 2:23 no cita el versículo y solo la nota de estudio lo relaciona, así que va en `mentions` del tramo Isaías 11:1-5.

## Para quien reabra Deuteronomio o Salmos (desde Malaquías)

- **Horeb como región.** Perspicacia «Horeb» pone Mal 4:4, Dt 1:6, 19; 4:10, 15; 5:2; 9:8; 18:16; 29:1 y Sl 106:19 entre los pasajes en que el nombre designa la región del Sinaí. Mal 4:4, Dt 18:16 y 29:1 usan `desierto-de-sinai`; los tramos Dt 1:6-8, 1:19-21, 4:9-14, 4:15-24, 5:2-5 y Sl 106:19-23 usan `monte-sinai`, porque sus sucesos pasan en el monte. Quien los reabra decide si añade `desierto-de-sinai` a sus `mentions`.
