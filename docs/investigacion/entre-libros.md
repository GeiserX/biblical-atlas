# Pendientes entre libros

Cosas que un libro deja decididas o a medias y que otro libro tiene que respetar o cerrar. El lector y el escritor de cada libro leen esta lista antes de empezar y quitan lo que cierran.

Los campos, los tipos de relación y sus palabras se nombran como en el esquema en inglés ([`modelo.md`](modelo.md) y [`data/vocabulary.yaml`](../../data/vocabulary.yaml)). Una propuesta de formato 1 puede escribirlos así o con el nombre antiguo: `apply.py` traduce los dos.

## Para todos los libros

- **Nombres que solo dan las notas de estudio.** Van en `mentions` cuando la nota los identifica con lo que dice el versículo: a quién se refiere, dónde o cuándo pasó, qué suceso recuerda (en 1Co 15:5-8, Tomás, Galilea y Damasco). No van los que la nota usa para explicar una palabra, comparar o poner ejemplos de otras historias, ni los escritores de los relatos paralelos.
- **El autor de una cita.** Si el texto bíblico no lo nombra, se queda en la `note` del tramo aunque la nota de estudio lo nombre (Elifaz en 1Co 3:19, Isaías en 1Co 14:21), como en Romanos. Si el texto lo nombra, va en `mentions`.
- **Una identificación que la nota solo ve posible** («podría ser la misma ocasión») deja el suceso en `mentions`, sin añadirle el pasaje. Si la da por probable o «al parecer», el pasaje entra.

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
- **Jaír y Segub.** `jair-hijo-de-segub` (Nú 32:41) no tiene padre en ficha: 1Cr 2:22 crea `segub-hijo-de-hezron` y la relación: Perspicacia tiene dos Segub, y el hijo de Hiel es `segub-hijo-de-hiel` desde 1Re 16:34.
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

## Para 1 Crónicas (desde los Evangelios)

- **Natán, hijo de David.** `natan-hijo-de-david` (clave `1200003184#4`) existe desde Lu 3:31 y 2 Samuel 5 ya lo usa. 1Cr 3:5 y 14:4 usan ese id; el profeta es `natan-profeta` (clave `1200003184#2`).
- **Abías, el de la división sacerdotal.** `abias-de-tiempos-de-david` (clave `1200000041#4`) existe desde Lu 1:5. 1Cr 24:10 usa ese id y añade su pasaje.
- **Cainán y Selá.** `sela-hijo-de-arpaksad` lleva dos padres: Arpaksad (Gé 11:12) y, con `status: pending`, `cainan-hijo-de-arpaksad` (Lu 3:36), que falta en el texto hebreo. 1Cr 1:18 no cambia ninguno de los dos.
## Para 2 Reyes (desde 1 Reyes)

- **Elat y Ramot-Galaad.** `elat` (Elot en `names`; 1Re 9:26) y `ramot-galaad` (1Re 22) ya existen: 2Re 8:28-9:15, 14:22 y 16:6 los reutilizan.
- **Afec.** La de 1Re 20:26-30 es `afec-al-este-del-mar-de-galilea` (Perspicacia «Afeq», núm. 5), sin punto único. 2Re 13:17 la reutiliza; su `reason` ya cita ese versículo.
- **Hazael sucede a Ben-Hadad II.** `hazael` lleva ya `succeeds` `ben-hadad-ii`, con la fuente `1-reyes-19` (la unción de 1Re 19:15). 2Re 8:15 le añade su capítulo y la pone en su tramo; `ben-hadad-ii` ya existe (`1200000636#2`).
- **El altar de Betel (2Re 23:15-18).** Cuando Josías profane el altar y respete la tumba, el tramo lleva en `mentions` `un-hombre-de-dios-anuncia-el-fin-del-altar-de-betel` y `un-leon-mata-al-hombre-de-dios-de-juda` (1Re 13).
- **Nabot (2Re 9:21-26).** `jezabel-hace-matar-a-nabot` ya lleva «2Re 9:26» en `passages`: el tramo de 2 Reyes 9 lo pone en `entities`. `nabot` y su viña en Jezreel ya existen.
- **Tifsá (2Re 15:16).** Es Perspicacia «Tifsah», núm. 2, otra ficha que `tifsa-del-norte` (1Re 4:24), con `distinct_from` en las dos.
- **Elías y Eliseo.** `elias-profeta`, `tisbe` (Elías el tisbita, 2Re 1:3, 8), `eliseo` y `safat-padre-de-eliseo` (2Re 3:11) ya existen. `eliseo` ya empieza en c. 940 a.e.c.: sirvió a Elías desde el reinado de Acab.
- **Los reyes de 1 Reyes.** Jehosafat, Ocozías de Israel y Jehoram de Judá ya llevan su clave y sus relaciones de 1 Reyes. Sisaq se llama ya Sisac, como en la TNM: 2 Reyes no vuelve a cambiarlo.
- **Muertes que el texto da por el entierro.** «Descansó con sus antepasados y lo enterraron en X» no dice dónde murió. 1 Reyes pone `died_in` en X con `inferred: true` y lo explica en `reason` (Salomón, Rehoboam, Abías, Asá, Baasá, Omrí, Jehosafat). La regla espera al dueño; 2 Reyes y Crónicas hacen lo mismo hasta entonces.

## Para 2 Reyes

- **Naamán el sirio (2Re 5).** `naaman-el-sirio` (clave `1200003149#2`) existe desde Lu 4:27. Falta el suceso de su curación; cuando exista, va en `mentions` del tramo Lucas 4:23-27.
- **Fronteras (también para Ezequiel).** Ez 47 y 48 usan `zedad`, `hazar-enan` (Hazar-Enón está en `names`) y `lebo-hamat`.
- **La serpiente de cobre.** 2Re 18:4 (Nehustán) y Jn 3:14 remiten a `moises-hace-la-serpiente-de-cobre`.

## Para Nehemías

- **Itiel.** `itiel-oyente-de-agur` (clave `1200002237#1`, Pr 30:1) ya existe. El benjamita de Ne 11:7 es la entrada núm. 2 de Perspicacia «Itiel» (`1200002237#2`): va en ficha aparte, con `distinct_from` en las dos.
- **La Puerta de las Ovejas (Ne 3:1, 32; 12:39).** Desde Jn 5:2 es un nombre de `jerusalen`, con su nota. Se reutiliza, sin ficha propia.

## Para 2 Reyes (Sunem)

- **Sunem.** `sunem` existe desde El Cantar (OpenBible ac86af5, con Sulem en `names`). Jos 19:18 y 1Sa 28:4 ya lo usan; 2Re 4:8 también.

## Para Números, Deuteronomio y Josué

- **Hesbón.** `hesbon` existe desde Can 7:4, con su puerta Bat-Rabim en `names`. Falta en `sehon` la relación `lived_in` `hesbon` (Nú 21:26; Perspicacia «Hesbón», párr. 2), y los sucesos de su conquista.
- **Amaná y Senir.** Amaná es un nombre de `antilibano` (Can 4:8); Senir sigue en `monte-hermon`.

## Para Nehemías

- **La torre de David.** Está en `names` de `jerusalen` desde Can 4:4, con una nota: Perspicacia «Torre» recoge que quizá sea la torre de la Casa del Rey de Ne 3:25. Si Nehemías apunta esa torre, la relaciona con esta nota.

## Para 2 Reyes (desde Oseas)

- **Reyes de Os 1:1.** Oseas usa `uzias`, `jotan`, `acaz`, `ezequias`, `jeroboan-ii` y `jehoas-de-israel`, que ya existían. Deja en `data/_proposals/oseas.json` las claves de `jehu-de-israel` (`1200002401#3`), `jeroboan-ii` (`1200002431#2`), `jehoas-de-israel` (`1200002373#2`), `hosea-de-israel` (`1200002090#4`) y `salmanasar-v` (`1200003936#2`). Reyes no vuelve a proponerlas: un `cambiar` desde `null` chocaría. Siguen sin clave `menahem`, `zacarias-de-israel` y `salum-de-israel`.
- **El fin de la casa de Jehú.** Perspicacia «Jezreel», núm. 4, ve cumplido Os 1:4 cuando Salum mata a Zacarías (2Re 15:8-12). Cuando Reyes cree ese suceso, va en `mentions` de los tramos Oseas 1:2-5 y Amós 7:7-9 (Am 7:9 remite a 2Re 15:8-10; Perspicacia «Plomada»). `nacimiento-de-jezreel-hijo-de-oseas` acaba en 791 a.e.c. por él.
- **Sucesos que Oseas nombra y aún no existen.** El tributo de Menahem a Pul (2Re 15:19, 20) y el trato de Hosea con So de Egipto (2Re 17:4; Perspicacia «Asiria» lo une a Os 7:11) van a `mentions` de los tramos Oseas 7:8-12 y 12:1-2. El altar de Betel que derriba Josías (2Re 23:15, 16) va también a Amós 3:13-15.
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

## Para Isaías, Jeremías, Ezequiel y los demás profetas (desde Oseas)

- **Menfis.** `menfis` lleva Nof en `names`: Is 19:13, Jer 2:16, 44:1, 46:14 y Ez 30 usan ese id.
- **Profecías sin escena.** Oseas 4-14 lleva un solo suceso, `juicios-profeticos-contra-efrain-y-juda` (Os 4:1-14:9, la sección de «Toda Escritura»), con fecha narrativa de la obra del profeta y `present: []`. Cada tramo lo pone en `entities`.
- **«David su rey».** Os 3:5 lleva `person:david` y `person:jesus` en `mentions`: el nombre es el del rey histórico, y La Atalaya de 1991 lo aplica a Jesucristo, descendiente de David. Am 9:11 la sigue: Perspicacia «Cabaña» une la cabaña de David a Jesús, rey de su línea. Jer 30:9, Ez 34:23, 24 y 37:24, 25 siguen la misma regla.
- **Alusiones al éxodo.** Los versículos que Perspicacia da como alusión a la salida de Egipto (Os 2:15; 11:1; 12:13) van en `passages` de `exodo` y en `entities`. La fórmula «tu Dios desde la tierra de Egipto» (Os 12:9; 13:4) va solo en `mentions`. Amós añade un caso: los versículos que afirman con sus palabras que Jehová sacó a Israel de Egipto (Am 2:10; 3:1; 9:7) van en `passages`, aunque Perspicacia no los cite. Miqueas lo hizo con Miq 6:4. Míriam no entra en `people` de `exodo`: sus pasajes son la noche de la salida, y el canto de Éx 15:20, 21, que es lo que recuerda La Atalaya de 2003, ya es `israel-canta-junto-al-mar-rojo`. Si Éxodo la quiere en `exodo`, lo explica en la `reason` del suceso.
- **La fecha del libro.** `data/books.yaml` toma sus fechas solo de la tabla de libros (`tnm-tabla`), que pone Oseas «después de 745». Perspicacia «Oseas, Libro de» lo cierra entre 745 y 740: ese límite va en la `reason` de los sucesos, no en `books.yaml`.

## Para Hechos y Romanos (desde Joel)

- **Joel 2:28-32 en Pentecostés.** El tramo Joel 2:28-32 lleva `pentecostes-33` en `mentions`, y Joe 2 no está en sus `passages`. Hch 2:16 nombra al profeta: `joel-profeta` (clave `1200002481#9`) va en `mentions` de ese tramo de Hechos. Ro 10:13 aplica Joe 2:32.

## Para los demás profetas (desde Joel)

- **Un suceso por libro.** Amós lo siguió con `amos-profetiza-contra-israel` (Am 1:1-9:15), y su escena con Amasías en Betel es un suceso aparte. Joel lleva uno solo, `joel-anuncia-el-dia-de-jehova` (Joe 1:1-3:21), anclado en c. 820 a.e.c. (?) y con `present: []`, como Oseas 4-14.
- **Las langostas de Joel 1 y 2.** Manda La Atalaya de abril de 2020 (`w20-ataque-del-norte`): son el ejército babilonio que tomó Jerusalén en 607 a.e.c., y no son las langostas de Ap 9. Los tramos Joel 1:2-4, 1:5-12, 2:1-11 y 2:18-27 llevan `destruccion-de-jerusalen-607` en `mentions`.
- **Grecia.** `grecia` existe desde Joe 3:6 (OpenBible a4492a0, con Javán en `names`). Is 66:19, Ez 27:13, Da 8:21, 10:20, 11:2, Zac 9:13 y Hch 20:2 usan ese id cuando hablan de la tierra.
- **El valle de Jehosafat y el de la Decisión** (Joe 3:2, 12, 14) no llevan ficha: Perspicacia «Jehosafat, Llanura baja de» y La Atalaya de 2007 los llaman lugar simbólico.
- **Sitim.** `sitim` es Perspicacia «Sitim», núm. 1 (Nú 25:1; 33:49; Jos 2:1; 3:1; Miq 6:5) y `valle-de-las-acacias` el núm. 2 (Joe 3:18). Cada una dice en `not_claimed` que no es la otra.

## Para 2 Crónicas, Ezequiel y Zacarías (desde Joel)

- **Ríos que salen del templo.** La adoración pura, recuadro 19A (`rr-rios-de-bendiciones`), lee el manantial de Joe 3:18, el río de Ez 47 y las aguas de Zac 14:8 como figura de las bendiciones de Jehová. Ezequiel y Zacarías pueden citar esa fuente.
- **Sucesos que Joel 3 recuerda.** La victoria de Jehová en días de Jehosafat (2Cr 20) va en `mentions` del tramo Joel 3:1-3. El saqueo de filisteos y árabes (2Cr 21:16, 17) va en el tramo Joel 3:4-6. La caída de Tiro ante Nabucodonosor, y la de la isla ante Alejandro, en el tramo Joel 3:7-8.

## Para Deuteronomio y 2 Reyes (desde Joel)

- **Mar Salado.** Joel añade «Mar oriental» (Joe 2:20) a `names` de `mar-salado`. Falta «mar del Arabá» (Dt 4:49; 2Re 14:25; Perspicacia «Mar Salado»).

## Para quien reabra Éxodo, Números o Deuteronomio

- **El fin del maná.** Éx 16:35 no está en `cesa-el-mana` (Jos 5:12) porque Éxodo 16 ya estaba cerrado: al reabrirlo, se añade el pasaje y el suceso va al tramo.
- **Anac en Deuteronomio.** Dt 9:2 cita el dicho sobre los hijos de Anac. Desde Josué existe la persona `anac` (Jos 15:13): al reabrir Deuteronomio, va en `mentions` del tramo Dt 9:1-6.

## Para quien reabra los Evangelios (desde Josué)

- **Queriyot-hezrón.** Existe `queriyot-hezron` (Jos 15:25). Perspicacia «Judas», núm. 4, solo ve probable que Judas Iscariote y su padre fueran de allí, y los Evangelios no lo dicen: `judas-iscariote` y `simon-iscariote` no llevan relación con ese lugar.

## Para Isaías, Jeremías y Nehemías

- **Ciudades de Moab que ya existen.** `dibon`, `nebo` (la ciudad, no `monte-nebo`), `quiryataim`, `baal-meon`, `aroer`, `jahaz`, `hesbon`, `eleale`, `sibma`, `jazer`, `medeba`, `ar` y `arnon`. Perspicacia solo da como probable que Bet-Diblataim (Jer 48:22) sea `almon-diblataim`.
- **Dibón de Judá.** El Dibón de Ne 11:25 es la entrada núm. 2 de Perspicacia y lleva otro id que `dibon`.

## Para Ester

- **Abiháil.** `abihail-padre-de-zuriel` es la entrada núm. 1 de Perspicacia. El padre de Ester es la núm. 5: otro id y `distinct_from` en las dos.
- **Jaír.** `jair-hijo-de-segub` es la entrada núm. 1 de Perspicacia «Jaír». El padre de Mardoqueo (Est 2:5) es la núm. 3: otro id y `distinct_from` en las dos.

## Para las Escrituras Griegas

- **Pasaje ya puesto.** Jud 11 está en `muerte-de-core`.
- **Pasajes que aún no están en ningún suceso.** Hch 7:36 y 13:18, Heb 3:16-19 y Jud 5 van a `jehova-condena-a-israel-a-40-anos-en-el-desierto`; Ap 2:14 y Os 9:10 a `israel-adora-al-baal-de-peor`; 2Pe 2:15, 16 a `la-burra-de-balaam-habla`; Heb 9:4 nombra la vara de `la-vara-de-aaron-echa-brotes`. Miq 6:5 nombra `balac`, `balaam` y `sitim`.

## Para Gálatas y 1 Corintios

- **Pasajes ya puestos en sucesos de Hechos.** Gál 1:15, 16 en `conversion-de-pablo`; Gál 1:18, 19 en `pablo-visita-a-cefas`; Gál 2:1-10 en `concilio-de-jerusalen-49`. Van en los tramos de esos capítulos. Hechos es el dueño de estos sucesos (sección 6 de `versiculos.md`).

## Para Hechos

- **La colecta para Jerusalén.** `colecta-de-macedonia-y-acaya` existe desde Ro 15:25-28, 31, que es su dueño porque Hechos solo la recuerda en un discurso (Hch 24:17). 1 Corintios y 2 Corintios (1:16; 8:1-15; 9:1-15) ya pusieron sus pasajes. 2Co 8:10 y 9:2 adelantan su comienzo: la fecha es derivada, c. 54-56, y el suceso queda pendiente. Si se relee Hechos 24, «Hch 24:17» entra igual en el tramo 10-21.
- **La ayuda de Macedonia en Corinto.** `crispo-cree` (Hch 18:5-8) lleva «2Co 11:9», porque «Testimonio completo», cap. 19, párr. 8, dice que Silas y Timoteo trajeron esa ayuda. Si Hechos hace de su llegada un suceso propio, el pasaje pasa a él y el tramo 7-11 de 2 Corintios 11 lo nombra.
- **Troas camino de Macedonia (2Co 2:12, 13).** La parada tiene suceso propio, `pablo-predica-en-troas-y-no-encuentra-a-tito`, y es la parada 5 de `tercer-viaje` (las de después se renumeraron). `pablo-deja-efeso-hacia-macedonia` sigue con «2Co 2:12, 13» en `passages` y en su `reason`; Hechos 20 puede quitarlo con un `cambiar`, y entonces ese suceso pasa a `mentions` del tramo 12-13 de 2 Corintios 2.

## Para Filipenses

- **Los antepasados de Pablo.** `pablo` lleva `kin` con la palabra `ancestor` hacia `abrahan` (Ro 4:1; 11:1; 2Co 11:22), `isaac` (Ro 9:10) y `benjamin-hijo-de-jacob` (Ro 11:1). Flp 3:5 solo añade su capítulo a las fuentes de esas relaciones, sin crear otras.

## Para 1 Corintios (si se relee) y 2 Timoteo

- **El peligro de Asia.** 2 Corintios hizo de la tribulación de 2Co 1:8-11 un suceso propio, `pablo-en-peligro-de-muerte-en-asia`, y sacó «2Co 1:8» de `motin-de-efeso`: la nota de estudio solo ve posible que fuera el motín o las fieras de Éfeso. El tramo de 1Co 15:32 lo puede poner en `mentions`, sin añadirle el pasaje.
- **Áquila y Priscila con Pablo.** Su relación `accompanies` con `pablo` va de c. 50 a 65 (Ro 16:3, 4; Perspicacia «Prisca»), con la palabra `fellow_worker`. 1Co 16:19 y 2Ti 4:19 añaden su capítulo a las fuentes de esa relación, sin crear otra.

## Para Tito

- **Apolos y Pablo.** `apolos` lleva `accompanies` `pablo` con la palabra `fellow_worker`, c. 55 (1Co 3, 4 y 16): trabajaron el mismo campo en momentos distintos y solo se les ve cerca al escribirse 1 Corintios. Tit 3:13 añade su capítulo a las fuentes de esa relación con un `anadir` y puede alargar su fecha con un `cambiar` sobre esa relación.
- **Tito y Pablo.** `tito` lleva tres relaciones `accompanies` con `pablo`: c. 49 (Gál 2), c. 55 (2 Corintios, ya con la palabra `companion` y con 2Co 2, 7, 8 y 12) y c. 61-64 (Tito). `apply.py` funde un `anadir` de relación en la primera con el mismo tipo y persona, la de 49. Para tocar la de 55 o la de 61-64, 2 Corintios usó un `cambiar` de toda la lista `relations`, con su `antes`; si choca, va a `preguntas` para una edición a mano.

## Para 1 y 2 Crónicas (desde Josué)

- **Ciudades levitas.** `los-levitas-reciben-48-ciudades` lleva 1Cr 6:54-81 en `passages`: va en el tramo. Josué funde en una ficha los nombres que Perspicacia da por la misma ciudad, aunque sea con «al parecer»: Hamón y Hamot-Dor están en `hammat`, Rimono y Dimná en `rimon-de-zabulon`, Ramot y Jarmut en `remet`, y Ain en `asan`. Hilén y Holón, Jocmeam y Quibzaim, y Anem y En-Ganim se deciden con ese mismo criterio y su artículo.
- **Ciudades de Simeón (1Cr 4:28-33).** Reutiliza `molada`, `hazar-sual`, `bala` (Bilhá en `names`), `ezem`, `eltolad` (Tolad), `betul` (Betuel), `horma`, `ziclag`, `madmana` (Bet-Marcabot en `names`), `hazar-susa`, `saaraim`, `ain-de-simeon`, `rimon-de-simeon`, `eter` (Token) y `asan`.
- **Acar y Carmí.** 1Cr 2:7 llama Acar a `acan-hijo-de-carmi` (ya en `names`); 1Cr 2:7 y 4:1 nombran a `carmi-hijo-de-zabdi`.
- **Naará.** `naara` (Jos 16:7); Perspicacia solo cree que es la Naarán de 1Cr 7:28.
- **Gaas.** 1Cr 11:32 nombra los valles torrenciales de Gaas, junto a `monte-gaas`.
- **Zaretán.** `zaretan` (Jos 3:16); Perspicacia no asegura que la Zeredá de 2Cr 4:17 sea otra grafía, así que no va en `names`.

## Para Nehemías (desde Josué)

- **Ciudades de Judá y Benjamín (Ne 11:25-36).** Reutilizan los ids de Jos 15 y 18: `cabzeel`, `molada`, `bet-pelet`, `hazar-sual`, `ziclag`, `zanoah`, `adulam`, `lakis`, `azeca`, `zora`, `jarmut`, `gueba` y los demás.

## Para Isaías y Oseas (desde Josué)

- **Valle de Acor.** Is 65:10 y Os 2:15 usan `valle-de-acor`.
- **Bet-Aven.** La de Jos 7:2 y 18:12 es `bet-aven` (Perspicacia núm. 1). La de Os 4:15; 5:8; 10:5 (núm. 2) sigue como nombre de `betel`.

## Para Hechos, Hebreos y Santiago (desde Josué)

- **Pasajes sin poner.** Hch 7:44, 45 (el tabernáculo entra con Josué) puede ir en `entrada-en-canaan`; Hch 7:15, 16 y Heb 11:22, en `entierran-los-huesos-de-jose-en-siquem`.

## Para 1 Crónicas (desde 1 Samuel)

- **Los antepasados de Samuel (1Cr 6:22-28, 33-38).** Reutilizan `elcana-hijo-de-jeroham`, `jeroham-hijo-de-elihu`, `elihu-hijo-de-tohu` (Eliab y Eliel en `names`), `tohu` y `zuf` (Zofai en `names`). Náhat y Tóah van en fichas aparte con un `same_as` con `status: pending`, aún sin `certainty`, hacia `tohu`. Falta la relación con `cohat`. `joel-hijo-de-samuel` es el padre de Hemán el cantor (1Cr 6:33): la relación va en la ficha de Hemán.
- **Abiel y Jeiel (1Cr 8:29; 9:35).** Perspicacia «Abiel», núm. 1, cree que son el mismo: un `same_as` con `status: pending`, aún sin `certainty`, entre Jeiel y `abiel-hijo-de-zeror`, en la ficha de Abiel, cuyo id va primero. La relación `quis-hijo-de-ner` con `ner` ya existe y sale de Crónicas: 1Cr 8:33 y 9:39 le añaden su capítulo.
- **Sucesos con pasaje de Crónicas.** `muerte-de-saul` (1Cr 10:1-7), `los-filisteos-cuelgan-a-saul-en-bet-san` (10:8-10), `los-de-jabes-galaad-entierran-a-saul-y-a-sus-hijos` (10:11, 12), `saul-consulta-a-la-medium-de-en-dor` (10:13) y `los-principes-filisteos-rechazan-a-david` (12:19) van en `entities` de sus tramos.
- **Hermanos de David (1Cr 2:13-16).** `eliab-hijo-de-jese`, `abinadab-hijo-de-jese` y `sama-hijo-de-jese` (Simeá en `names`). `abisai/kin/david/uncle` (tío) sale de Perspicacia y 1Cr 2:16 le añade su capítulo.
- **Bedán (1Cr 7:17).** Es Perspicacia «Bedán», núm. 2: otro id y `distinct_from` con `bedan-libertador`.

## Para Isaías, Jeremías y Nehemías (desde 1 Samuel)

- **La marcha de Is 10:28-32.** Usa `micmash`, `migron`, `gueba`, `rama-de-benjamin` (no `ramataim-zofim`, la de Samuel), `guibea-de-benjamin` (Guibeá de Saúl en `names`) y `nob`. Perspicacia solo ve posible que la Galim de Is 10:30 sea `galim`.
- **Siló abandonada (Jer 7:12, 14; 26:6, 9).** Recuerda lo que cuenta 1Sa 4: `los-filisteos-capturan-el-arca` va en `mentions` de esos tramos.
- **Nob (Ne 11:32).** Usa `nob`.

## Para Esdras, Hageo y Zacarías (desde 1 Samuel)

- **La clave de Josué el sumo sacerdote.** `josue-sumo-sacerdote` no lleva `perspicacia`: es la núm. 4 de «Josué» (`1200002523`), pero su ficha enlaza «Jesúa» (`1200002446`). El libro que lo lea elige el documento.

## Para 1 y 2 Crónicas (desde Jueces)

- **Pua.** La TNM escribe Pua para tres personas (Perspicacia «Puá»): `puva`, el hijo de Isacar, que 1Cr 7:1 llama Pua; `pua-partera`, de Éx 1:15; y `pua-hijo-de-dodo`, padre del juez Tolá.
- **Baal-Hermón.** 1Cr 5:23 usa `baal-hermon`, junto a `monte-hermon`.
- **Etam.** `penasco-de-etam` es Perspicacia «Etam», núm. 2 (Jue 15). La de 1Cr 4:32 (núm. 1) y la de 2Cr 11:6 (núm. 3) llevan otro id.

## Para 2 Reyes (desde Jueces)

- **Sela.** `sela-de-los-amorreos` es la de Jue 1:36. La Sela de Edom (2Re 14:7), Perspicacia núm. 2, lleva otro id.

## Para Isaías (desde Jueces)

- **El día de Madián.** `gedeon-derrota-a-madian-con-300-hombres` lleva Is 9:4 y `los-efraimitas-capturan-a-oreb-y-zeeb`, Is 10:26, en `passages` (Perspicacia «Jueces, Libro de»): van en los tramos de Isaías 9 y 10. La razón de `roca-de-oreb` también cita Is 10:26.

## Para Ezequiel (desde Jueces)

- **Minit.** El trigo de Minit (Ez 27:17) usa `minit`.

## Para Hebreos (desde Jueces)

- **Los jueces de Heb 11:32-34.** Gedeón, Barac, Sansón y Jefté son `gedeon`, `barac`, `sanson` y `jefte`; van en `mentions` del tramo.

## Para 1 Crónicas (desde 2 Samuel)

- **Otros nombres que Perspicacia solo da por probables.** Esbaal (1Cr 8:33; 9:39) lleva ficha aparte y un `same_as` probable hacia `is-boset`, en la ficha de Esbaal. Merib-baal (1Cr 8:34; 9:40) también, pero el `same_as` va en `mefiboset-hijo-de-jonatan`, cuyo id va primero.
- **Hijos de David (1Cr 3:1-9; 14:3-7).** Reutilizan `amnon-hijo-de-david`, `kileab` (Daniel en `names`), `absalon`, `adonias-hijo-de-david`, `sefatias-hijo-de-david`, `itream`, `samua-hijo-de-david` (Simeá), `sobab-hijo-de-david`, `natan-hijo-de-david`, `salomon`, `ibhar`, `elisua` (el Elisamá de 1Cr 3:6), `nefeg-hijo-de-david`, `jafia-hijo-de-david`, `elisama-hijo-de-david`, `eliada-hijo-de-david` (Beeliadá) y `elifelet-hijo-de-david` (el núm. 3). El Elifélet núm. 2 (Elpélet) y Noga son fichas nuevas; el primero, con otro id y `distinct_from`. Las relaciones de Samúa y Sobab con `bat-seba` citan 1Cr 3:5.
- **Madres y abuelos.** Amiel, padre de Bat-Seba (1Cr 3:5), es `eliam-padre-de-bat-seba`: no se crea otra ficha con la clave `1200000233#3`. Maacá, madre de Absalón, es `maaca-hija-de-talmai`.
- **Hermanas de David (1Cr 2:16, 17).** `david/kin/zeruya` y `david/kin/abigail-hija-de-nahas` citan 1Cr 2:16 y van en su tramo. Jéter, padre de Amasá, es `itra` (Perspicacia «Itrá» remite a «Jéter», núm. 6) y Amasá es `amasa-hijo-de-itra`.
- **Zebadías (1Cr 27:7).** Hijo de `asahel-hijo-de-zeruya`: la relación `kin` `father` va en su ficha.
- **Obed-Edom (1Cr 15:18-24; 16:38).** Los núm. 2 y 3 de Perspicacia llevan ficha aparte y un `same_as` posible con `obed-edom-el-guitita`, en la ficha cuyo id va primero.
- **1Cr 18.** Tou es `toi`, Hadoram es `joram-hijo-de-toi` y Tibhat es `betah`. Cun no entra en `names` de `berota`. Savsá (1Cr 18:16) lleva ficha aparte y un `same_as` probable con `seraya-secretario-de-david`, en la ficha cuyo id va primero.
- **Los poderosos de David (1Cr 11:10-47; 27).** Reutilizan `joseb-basebet` (no otra ficha con la clave de Jasobeam núm. 2), `ittai-hijo-de-ribai` y los demás ids de 2 Samuel 23. Quedan por escribir los `same_as` de Zalmón con Ilai, Héleb con Heldai, Paarái con Naarai, Elifélet con Elifal y Azmávet núm. 1 con núm. 2, según diga cada artículo. Jonatán (1Cr 27:32) es probablemente `jonatan-hijo-de-sama`. Sagué (1Cr 11:34, clave `1200003928`) es ficha nueva con un `same_as` probable hacia `sama-hijo-de-ague` (Perspicacia «Sagué»); la relación `father` de `jonatan-hijo-de-sague` se decide allí, para que no tenga dos padres. Las hazañas de 1Cr 11:11, 20-23 ya son sucesos de 2 Samuel 23 (`joseb-basebet-mata-a-800-hombres-con-su-lanza`, que Perspicacia no iguala con los 300 de 1Cr 11:11; `abisai-mata-a-300-hombres-con-su-lanza` y las tres de Benaya): van en `entities` o, la de Jasobeam, en `mentions`.
- **Gigantes (1Cr 20:4-8).** Lahmí, hermano de Goliat, es ficha nueva. Jaír, padre de Elhanán, se crea con la clave `1200002305#4` y un `same_as` probable en `jaare-oreguim`. `sibecai-mata-a-saf-en-gob`, `elhanan-derriba-a-un-gigante-en-gob` y `jonatan-mata-al-gigante-de-gat` ya llevan esos versículos.
- **Sucesos con pasaje de Crónicas.** Los de 2 Samuel 5-8, 10-12, 21, 23 y 24 ya citan 1Cr 11-21 en `passages`: van en `entities` de sus tramos. 1Cr 15:1-24 y 16:4-43 pueden añadirse a `david-sube-el-arca-a-la-ciudad-de-david` o ser sucesos propios.

## Para Isaías, Jeremías y Ezequiel (desde 2 Samuel)

- **Monte Perazim (Is 28:21).** `baal-perazim` y `david-vence-a-los-filisteos-en-baal-perazim` van en `mentions` del tramo.
- **Kimham (Jer 41:17).** Perspicacia no sabe si el alojamiento de Kimham es de `kimham`: lo decide Jeremías.
- **Berotá (Ez 47:16).** Reutiliza `berota`.

## Para 2 Reyes, 1 Crónicas y 2 Crónicas (desde Amós)

- **Hazael y los Ben-Hadad.** `hazael` (`1200001923`) y `ben-hadad-hijo-de-hazael` (`1200000636#3`) existen desde Am 1:4; 1 Reyes creó `ben-hadad-hijo-de-tabrimon` (núm. 1) y `ben-hadad-ii` (núm. 2), con `distinct_from` en las tres. 2 Reyes y Crónicas los reutilizan.
- **Damasco y Quir.** Cuando Reyes cree la toma de Damasco por Tiglat-piléser III y el destierro a Quir (2Re 16:9), el suceso va en `mentions` de los tramos Amós 1:3-5 y 9:7-10. Los de Hazael contra Galaad (2Re 10:32, 33) van a Amós 1:3-5.
- **Amasías.** `amasias`, el rey de Judá, ya lleva la clave (`1200000224#2`) y su `disambiguation`, como la de `amos-profeta` (`1200000246#1`); el sacerdote de Betel es `amasias-sacerdote-de-betel` (`#3`). Reyes y Crónicas no vuelven a proponerlas.
- **Jeroboán II.** Su `summary` ya dice «desde Lebó-Hamat» (2Re 14:25), no «desde Hamat». Un cambio posterior parte de ese texto. `hamat` y `lebo-hamat` son dos fichas: 2Re 14:28 usa `hamat`.
- **El terremoto.** `terremoto-en-dias-de-uzias` (Am 1:1; Zac 14:5) es de Amós. Si Crónicas lo nombra al hablar de Uzías, añade su pasaje.

## Para Josué, Jueces, 1 Samuel, 2 Samuel y Jeremías (desde Amós)

- **Ciudades filisteas.** `asquelon` y `ecron` existen desde Am 1:8 (Perspicacia escribe Eqrón, que va en `names`). Gaza, Asdod y Gat ya existían.
- **Queriyot.** `queriyot` (Am 2:2) no tiene punto: dos candidatos «alternativa», Ar y Saliyá. Jer 48:24, 41 usan ese id.
- **Harmón.** `harmon` (Am 4:3) lleva como único candidato el peñasco de Rimón, en Rammun. Si Jueces 20:45-47 crea ese peñasco, el candidato de `harmon` puede remitir a él.

## Para Isaías, Jeremías, Ezequiel, Zacarías y Hechos (desde Amós)

- **Quir.** `quir` existe sin punto (Am 1:5; 9:7): Is 22:6 lo usa.
- **Bet-Edén.** `bet-eden` (Am 1:5) quizá sea la tierra de los hijos de Edén de 2Re 19:12 e Is 37:12; si Reyes o Isaías lo confirman con Perspicacia, lo apuntan.
- **Calné y Calnó.** `calne-de-siria` (Am 6:2; Perspicacia «Calné», núm. 2) no es `calne` (Gé 10:10). Isaías decide si la Calnó de Is 10:9 es la misma; por ahora solo lo dice `not_claimed`.
- **Hamat.** `hamat` existe (Hamat la Grande en `names`): Is 10:9, 11:11, Jer 49:23 y Zac 9:2 lo usan.
- **Creta es Caftor.** `creta` lleva Caftor en `names`: Jer 47:4 usa `creta`, y también Dt 2:23 cuando habla del lugar.
- **Israel es José.** `israel` lleva «José» en `names` para el reino del norte (Am 5:6, 15; 6:6), como Efraín.
- **Hechos 7 y 15.** Los tramos Amós 5:25-27 y 9:11-12 llevan `discurso-de-esteban` y `concilio-de-jerusalen-49` en `mentions`. Hechos no nombra a Amós, así que sus tramos no lo llevan.
- **Los cuarenta años en el desierto.** Cuando exista el suceso de Números (el andar de Israel por el desierto), va en `mentions` de los tramos Amós 2:9-12 y 5:25-27.

## Para 2 Reyes, Jeremías y Lamentaciones (desde Abdías)

- **Abd 11 y la deportación de 617.** Las referencias de Abd 11 remiten a 2Re 24:10, 16 y Jer 52:28 (Joaquín, 617 a.e.c.), pero Perspicacia «Abdías, Libro de» y «Toda Escritura» ponen la conducta de Edom en 607. Abd 11-14 está en `passages` de `destruccion-de-jerusalen-607`. Cuando Reyes cree la deportación de 617, decide si Abd 11 va también en sus `passages`.
- **El campo de Samaria.** Abd 19 lleva `israel` en `entities`, con «Samaria» en sus `names` (Perspicacia «Samaria», núm. 2: el nombre de la capital cubrió todo el reino), y `samaria` en `mentions`. Las referencias de Abd 19 remiten a 2Re 17:24 y Jer 31:5, que Perspicacia pone en ese mismo núm. 2: Jeremías 31 usa el mismo criterio.
- **Edom y Nabonido.** Perspicacia «Edom» y «Toda Escritura» ven cumplido Abd 7 en la conquista de Edom por Nabonido, que no es un suceso del relato. Abdías pone `nabonido` en `mentions`; Jer 49:7-22, Ez 25:12-14 y 35 y Mal 1:3, 4 pueden hacer lo mismo.

## Para Deuteronomio, Josué, Jueces, 1 Crónicas, 2 Crónicas, Jeremías y Zacarías (desde Abdías)

- **Sefelá.** `sefela` existe desde Abd 19 (OpenBible af084cf). Usan ese id los pasajes que cita Perspicacia «Sefelá»: Deuteronomio 1:7; Josué 9:1, 10:40, 11:2 y 12:8, más 15:33-44, que da sus ciudades; Jueces 1:9; 1 Crónicas 27:28; 2 Crónicas 1:15, 9:27, 26:10 y 28:18; Jeremías 17:26, 32:44 y 33:13, y Zacarías 7:7. Jos 11:16 nombra además la Sefelá de la región montañosa de Israel, que Perspicacia sitúa quizá entre Samaria y Sarón: Josué decide si es otra ficha.
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
- **Ofel.** Perspicacia «Ofel» compara el «montículo» de Miq 4:8 con Ofel, y `jerusalen` no lo lleva en `names`. 2Cr 27:3 o Ne 3:26 lo añaden con una nota; entonces el tramo Miqueas 4:6-8 puede ponerlo en su `note`.
- **La montaña de la Casa.** `monte-moria` lleva ese nombre (Miq 3:12, cuya nota dice «el monte del templo»).

## Para 2 Reyes (desde Miqueas)

- **Claves de Omrí y Acab.** La integración de Miqueas puso a `omri` la clave `1200003324#3` y a `acab` la `1200000138#1`. Reyes no vuelve a proponerlas: un `cambiar` desde `null` chocaría.
- **Tierra de Nemrod.** Está en `names` de `asiria` (Miq 5:6). El tramo Miqueas 5:5-6 no lleva `person:nemrod`: su nombre designa la tierra.

## Para 2 Reyes, 2 Crónicas y Esdras (desde Nahúm)

- **Asurbanipal y Asnapar.** `asurbanipal` (clave `1200000430`) existe desde Na 3:8-10. Esa clave es a propósito la entrada «Asurbanipal» de Perspicacia, que solo remite a «Asnapar»: así la del artículo, `1200000404`, queda libre para `asnapar`. Perspicacia «Asnapar» solo ve muy probable que sea el Asnapar de Esd 4:10, así que Esdras crea `asnapar` (`1200000404`) con `same_as` `asurbanipal`, `inferred: true` y `status: pending`.
- **Esar-Hadón.** No tiene ficha. Quien la cree (2Re 19:37; Esd 4:2) añade a `asurbanipal` la relación `kin` `esar-hadon` con la palabra `father`, con Perspicacia «Asnapar», párr. 2. `asurbanipal` ya lleva `senaquerib` como abuelo, deducido.
- **Nabopolasar y Ciaxares.** `nabopolasar` y `ciaxares` existen, con `perspicacia: null` porque Perspicacia no les dedica artículo. La integración de Nahúm puso a `nabucodonosor-ii` las relaciones `kin` `nabopolasar` con la palabra `father` y `succeeds` `nabopolasar`, y añadió `nabopolasar` a `nabopolasar-funda-dinastia`. 2 Reyes, Jeremías y Daniel reutilizan esos ids.

## Para Isaías, Jeremías y Ezequiel (desde Nahúm)

- **No-Amón.** `no-amon` existe (Tebas, OpenBible a9674fc), con No y Tebas en `names`: Jer 46:25 y Ez 30:14-16 usan ese id.
- **Put como tierra.** `put` existe también como lugar (el pueblo y su tierra; la persona `put` es el hijo de Cam), con precisión incierta en el punto de Libia y un `not_claimed` porque Na 3:9 separa Put de los libios. Is 66:19, Jer 46:9 y Ez 27:10, 30:5 y 38:5 usan `place:put`, sin `person:put`.
- **Elqós.** `elqos` existe sin punto (Beit Jibrin favorecido; Galilea como alternativa, en el punto de El Kauzeh de OpenBible). La TNM solo da el gentilicio «elcosita»; Elqós es la única grafía del lugar en jw.org.

## Para Josué y Jueces (desde Habacuc)

- **Sucesos que recuerda Habacuc 3.** La Atalaya del 1 de febrero de 2000 (`w00-gozosos-en-dios`) une la oración a la toma de Jericó (Jos 6), al sol que se detiene sobre Gabaón (Jos 10:12-14, la referencia de Hab 3:11) y a la crecida del Cisón contra Sísara (Jue 5:21). Jericó, Gabaón y el Cisón ya van en `mentions` de Habacuc 3:1-2 y 3:8-11.
- **Cusán no es Cusán-risataim.** `cusan` (Hab 3:7) es un lugar sin punto, quizá otro nombre de Madián o un país vecino (Perspicacia «Cusán»). El rey de Jue 3:8-10 es una persona aparte, con su propio artículo.

## Para 2 Reyes, 2 Crónicas, Esdras, Nehemías, Jeremías y Zacarías (desde Sofonías)

- **La reforma de Josías.** Aún no es un suceso. Perspicacia «Sofonías, Libro de» pone el libro antes de ella (hacia 648 a.e.c.), y la referencia de Sof 1:4 remite a 2Re 23:5. Cuando Reyes o Crónicas cree la reforma (2Re 23:4-14; 2Cr 34:3-7), va en `mentions` de los tramos Sofonías 1:1 y 1:4-6.
- **Claves ya puestas.** La integración de Sofonías puso a `guedalias`, el gobernador, la clave `1200001632#4` y el `distinct_from` hacia `guedalias-hijo-de-amarias` (núm. 2), y a `ezequias` su `disambiguation`. Reyes y Jeremías no vuelven a proponerlas: un `cambiar` desde `null` chocaría.
- **El Ezequías de Sof 1:1.** Es `ezequias-antepasado-de-sofonias` (Perspicacia «Ezequías», núm. 2), y la ficha `ezequias` lleva el `same_as` hacia él, deducido y con `certainty: possible`: Perspicacia «Ezequías», la publicación más reciente, dice «quizás». Se funden solo si una publicación lo afirma. El de Esd 2:16 y Ne 7:21 es el núm. 3: otro id y `distinct_from` con los dos.
- **Otros Sofonías.** `sofonias-profeta` es el núm. 2 de Perspicacia. El sacerdote hijo de Maaseya (Jer 21:1; 29:25; 37:3; 2Re 25:18) es el núm. 3, el levita de 1Cr 6:36 el núm. 1 y el padre de Josías o Hen (Zac 6:10) el núm. 4: cada uno con su id y `distinct_from` con `sofonias-profeta`.
- **Barrios y puertas.** Puerta del Pescado, Segundo Barrio y Mactés están en `names` de `jerusalen`. 2Re 22:14, 2Cr 33:14, 34:22 y Ne 3:3, 12:39 usan esa ficha.

## Para 1 Crónicas y 2 Crónicas (desde 1 Reyes)

- **Sucesos de 1 Reyes con su pasaje de Crónicas.** Ya llevan en `passages` el relato paralelo; el tramo de Crónicas los pone en `entities` y no los crea otra vez: `jehova-se-aparece-a-salomon-en-gabaon` (2Cr 1), `hiram-y-salomon-pactan-la-madera-del-templo` y `salomon-recluta-trabajadores-para-el-templo` (2Cr 2), `salomon-levanta-y-adorna-el-templo` y `templo-de-salomon-empieza` (2Cr 3), `hiram-hace-los-objetos-de-cobre-del-templo` y `salomon-hace-los-utensilios-de-oro-del-templo` (2Cr 2-4), `templo-de-salomon-terminado` y `el-arca-entra-en-el-templo` (2Cr 5), `oracion-de-salomon-en-la-inauguracion-del-templo` (2Cr 6), `inauguracion-del-templo-de-salomon` y `jehova-se-aparece-a-salomon-por-segunda-vez` (2Cr 7), `salomon-da-a-hiram-veinte-ciudades-de-galilea` y `salomon-construye-ciudades-en-todo-su-reino` (2Cr 8), `la-reina-de-saba-visita-a-salomon`, `flota-de-salomon-a-ofir`, `las-naves-de-tarsis-traen-riquezas-a-salomon`, `riqueza-de-salomon` y `muerte-de-salomon` (2Cr 1 y 9), `israel-mata-a-pedradas-a-adoram` (2Cr 10), `semaya-impide-la-guerra-contra-israel` (2Cr 11), los de Asá y Baasá (2Cr 14-16), los de Acab y Micaya (2Cr 18) y `las-naves-de-jehosafat-se-destrozan-en-ezion-gueber` (2Cr 20).
- **Lo que Crónicas añade.** 2Cr 2:16 nombra Jope como puerto de las balsas: `jope` entra en `places` de `hiram-y-salomon-pactan-la-madera-del-templo`. El fuego del cielo de 2Cr 7:1-3 no está en ningún suceso: Crónicas decide si va con la oración o con la inauguración. La batalla de Abías contra Jeroboán (2Cr 13) y la muerte de Jeroboán (2Cr 13:20) son de Crónicas; 1Re 14:20 y 15:7 solo las informan.
- **Personas que Crónicas reutiliza.** Naamá la ammonita es `naama-esposa-de-salomon` (2Cr 12:13); el profeta de Siló, `ahiya-profeta` (2Cr 9:29; 10:15); Semaya, `semaya-profeta` (2Cr 11:2; 12:5); Jehú hijo de Hananí, `jehu-hijo-de-hanani` (2Cr 19:2; 20:34), y su padre, `hanani-vidente` (2Cr 16:7); Maacá, `maaca-hija-de-uriel` (2Cr 11:20-22; 15:16). Uriel, su padre (2Cr 13:2), aún no tiene ficha.
- **Los sabios de 1Re 4:31.** 1Cr 2:6 usa `darda` (Dará en `names`), `calcol`, `heman-el-ezrahita` y `etan-el-ezrahita`.
- **Homónimos de 1 Reyes 4.** El Azarías de 1Cr 6:9 (núm. 3, hijo de Ahimáaz) no es `azarias-hijo-de-sadoc`; el Hur de Ne 3:9 (núm. 5) no es `hur-padre-del-comisario-de-efrain`; la Jocmeam de 1Cr 6:68 es `quibzaim`, no `region-de-jocmeam`.

## Para Hebreos y Santiago (desde 1 Reyes)

- **Elías.** `elias-resucita-al-hijo-de-la-viuda-de-sarepta` lleva «Heb 11:35» en `passages`: va en el tramo de Heb 11 que lo recuerda. `elias-anuncia-la-sequia-a-acab` y `elias-ora-y-jehova-envia-la-lluvia` llevan «Snt 5:17» y «Snt 5:18»: van en el tramo de Santiago 5.
