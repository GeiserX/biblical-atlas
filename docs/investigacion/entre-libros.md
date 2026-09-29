# Pendientes entre libros

Cosas que un libro deja decididas o a medias y que otro libro tiene que respetar o cerrar. El lector y el escritor de cada libro leen esta lista antes de empezar y quitan lo que cierran.

## Para todos los libros

- **Nombres que solo dan las notas de estudio.** Van en `menciona` cuando la nota los identifica con lo que dice el versículo: a quién se refiere, dónde o cuándo pasó, qué suceso recuerda (en 1Co 15:5-8, Tomás, Galilea y Damasco). No van los que la nota usa para explicar una palabra, comparar o poner ejemplos de otras historias, ni los escritores de los relatos paralelos.
- **El autor de una cita.** Si el texto bíblico no lo nombra, se queda en la `nota` del tramo aunque la nota de estudio lo nombre (Elifaz en 1Co 3:19, Isaías en 1Co 14:21), como en Romanos. Si el texto lo nombra, va en `menciona`.
- **Una identificación que la nota solo ve posible** («podría ser la misma ocasión») deja el suceso en `menciona`, sin añadirle el pasaje. Si la da por probable o «al parecer», el pasaje entra.

## Para 1 y 2 Samuel

- **Amalec (1Sa 15).** Dt 25:17-19 manda borrar a Amalec por lo de Refidim (`batalla-contra-amalec-en-refidim`); el suceso de Saúl lo pone en `menciona`.
- **Rabá (2Sa 11:1; 12:26-31).** Es `raba`, con Filadelfia en `nombres`.
- **David huye de Absalón.** Cuando 2 Samuel cree el suceso (2Sa 15:13-17:22), añade «Sl 3» a sus pasajes y ese suceso al tramo 1-8 de `data/cobertura/salmos.yaml`.
- **La cueva del Salmo 142.** El encabezamiento remite a 1Sa 22:1 (Adulam) y a 1Sa 24:3 (En-guedí), y Perspicacia «Cueva» no elige. 1 Samuel decide a cuál de los dos sucesos se añade «Sl 142».
- **Cus el benjaminita.** Existe (`cus-el-benjaminita`) desde el Salmo 7. Perspicacia duda entre la corte de Saúl y Simeí; si 1 o 2 Samuel lo aclara, se añade la relación.
- **Agag.** `agag-de-tiempos-de-balaam` es la entrada núm. 1 de Perspicacia «Agag». El de 1Sa 15 es la núm. 2: otro id y `no_confundir_con` en las dos.
- **Jesimón.** `jesimon` es el de Nú 21:20 y 23:28, junto al mar Muerto. El de 1Sa 23:19 y 26:1, cerca de Zif, es otro lugar.
- **Rehob.** `rehob` (Nú 13:21) no lleva Bet-Rehob en `nombres`, porque Perspicacia solo lo ve probable. 2Sa 10:6, 8 decide.

## Para 2 Reyes y 2 Crónicas

- **Jehoiadá y Baraquías.** Cuando se cree a Jehoiadá, falta un `mismo_que` entre `baraquias` y su id, con `deducido: true` y `estado: pendiente` (Perspicacia «Baraquías»: Jehoiadá pudo tener dos nombres; Mt 23:35).
- **Zacarías, hijo de Jehoiadá.** Su muerte (2Cr 24:20-22) va en `monte-moria`, el patio del templo, como la puso Mateo. Si Crónicas prefiere `jerusalen`, que se acuerde una sola relación `murio_en`. Su parentesco con Jehoás también es de Crónicas.

## Para Esdras, Hageo y 1 Crónicas

- **Zorobabel.** Su relación con David es `antepasado` (antes decía «descendiente de David», al revés). Abiud va como antepasado suyo, no como hijo, porque Perspicacia «Abiud» lo deja abierto.
- **Resá, Sealtiel y Nerí.** `resa` (Lu 3:27) va como descendiente de Zorobabel, con la relación `antepasado`, igual que Abiud. `sealtiel` lleva a `neri` como pariente sin grado, porque Perspicacia solo ve posible que fuera su yerno.
- **Janai el gadita (1Cr 5:12).** Perspicacia «Janai» (`1200002318`) no es el Janaí de Lu 3:24, que ya existe como `janai-hijo-de-jose` (`1200002320`) con la fuente `it-janai-hijo-de-jose`. El gadita puede llevar `janai`, que queda libre; su propuesta añade `no_confundir_con` en las dos fichas.

## Para Números

- **Jetró es Reuel.** Nú 10:29 lo llama Reuel: es `jetro` (clave `1200002454`), no `reuel-hijo-de-esau`.
- **Coré.** La rebelión y la muerte de `core-hijo-de-izhar` (Nú 16) las crea Números.
- **Masá y Meribá.** `masa` es el sitio de Refidim (Éx 17). La Meribá de Nú 20 es `meriba-de-cades`.
- **El tabernáculo.** Nú 7:1 está en los `pasajes` de `se-monta-el-tabernaculo`, y Nú 9:15, 16 en los de `la-gloria-de-jehova-llena-el-tabernaculo`: van en los tramos de esos capítulos.
- **Quieren volver a Egipto (Nú 14:3, 4).** Hch 7:39 lo recuerda. El suceso que cree Números añade «Hch 7:39» a sus pasajes y va en el tramo 39-43 de Hechos 7.
- **Las etapas de Nú 33.** Los ids ya creados son `rameses`, `sucot-de-egipto`, `ezam`, `pihahirot`, `migdol`, `baal-zefon`, `cruce-del-mar-rojo`, `mara`, `elim`, `mar-rojo`, `desierto-de-sin`, `refidim` y `desierto-de-sinai`. Los sucesos son `exodo` (la salida), `israel-cruza-el-mar-rojo`, `jehova-endulza-el-agua-de-mara`, `israel-acampa-en-elim` y `codornices-y-mana-en-el-desierto-de-sin`.
- **El día de la salida.** Nú 33:3 dice que salieron de Ramesés el día 15. `exodo` se queda en el 14 de nisán: Perspicacia «Éxodo» pone el comienzo de la marcha hacia Sucot antes de que acabara el 14.
- **La serpiente de cobre (Nú 21:8, 9).** Jn 3:14 la recuerda. Cuando Números cree el suceso, va en `menciona` del tramo Juan 3:11-21.

## Para Números y 1 Corintios

- **Los ejemplos de 1Co 10.** Números ya los tiene: `agua-del-penasco-en-meriba` «1Co 10:4»; `jehova-condena-a-israel-a-40-anos-en-el-desierto` «1Co 10:5» y «1Co 10:10» (Nú 14:36, 37); `el-pueblo-pide-carne` y `codornices-en-quibrot-hataava` «1Co 10:6»; `israel-adora-al-baal-de-peor` «1Co 10:8»; `moises-hace-la-serpiente-de-cobre` «1Co 10:9»; `israel-se-niega-a-entrar-en-canaan` y `aaron-detiene-la-plaga` «1Co 10:10». Quien integre el segundo de los dos libros añade a cada suceso su pasaje y la fuente `1-corintios-10`, y lo pone en `entidades` del tramo 1-5 (v. 4 y 5) o del 6-11 (los demás). En `menciona` del 6-11 van `lugar:sitim` (nota del v. 8), `rebelion-de-core` y `muerte-de-core` (nota del v. 10). Hasta entonces `validate.py` falla con los dos libros juntos, porque la razón de `israel-adora-al-baal-de-peor` ya cita 1Co 10:8. Ese suceso ya explica los 23.000 de 1Co 10:8 frente a los 24.000 de Nú 25:9.

## Para Deuteronomio

- **Pasajes paralelos ya puestos en sucesos de Éxodo.** Dt 5:4-27 en `diez-mandamientos`; Dt 9:9 en `primeros-cuarenta-dias-de-moises-en-el-sinai`; Dt 9:10, 11 en `dios-da-a-moises-las-tablas-del-testimonio`; Dt 9:12-14, 19, 26-29 en `moises-ruega-por-el-pueblo`; Dt 9:15-17, 21 en `moises-rompe-las-tablas`; Dt 9:16 en `becerro-de-oro`; Dt 9:20 en `moises-pide-perdon-por-el-pueblo`; Dt 9:18, 25 y Dt 10:1-5, 10 en `moises-recibe-las-segundas-tablas`, porque los 40 días postrado de Dt 9:18 y 9:25 son los segundos (Éx 34:28). Cada uno va en el tramo de su capítulo.
- **Masá.** Dt 6:16, 9:22 y 33:8 hablan del sitio de Refidim: `masa`.

## Para Nehemías, Hechos y Hebreos

- **Pasajes paralelos ya puestos.** Ne 9:18 y Hch 7:40, 41 en `becerro-de-oro`. Hch 7:17-19 en `egipto-esclaviza-a-israel`; Hch 7:19 en `el-faraon-manda-echar-al-nilo-a-los-ninos`; Hch 7:20-22 y Heb 11:23 en `nacimiento-de-moises`; Hch 7:23, 24 y Heb 11:24-26 en `moises-mata-a-un-egipcio`; Hch 7:25-29 en `moises-huye-a-madian`; Hch 7:29 en `nacimiento-de-guersom`; Hch 7:30-35 en `moises-ante-la-zarza-ardiente`.

## Para 1 Crónicas

- **Nombres que Perspicacia solo da como probables.** Ladán (Libní), Aminadab hijo de Cohat (Izhar) y Ebiasaf (Abiasaf, que tiene artículo propio) llevan ficha aparte y un `mismo_que` con `deducido: true` y `estado: pendiente` hacia `libni-hijo-de-guerson`, `izhar-hijo-de-cohat` y `abiasaf`.
- **Nun.** Su padre Elisamá y su tribu, Efraín (1Cr 7:20-27), faltan en `nun`. Elisamá es `elisama-hijo-de-amihud` y su padre, `amihud-hijo-de-ladan`; Ladán no tiene ficha y falta su relación con Amihud (1Cr 7:26).
- **Jaír y Segub.** `jair-hijo-de-segub` (Nú 32:41) no tiene padre en ficha: 1Cr 2:22 crea `segub` y la relación.
- **Manasés y Efraín en Números 26.** `asriel`, `semida`, `sutelah-hijo-de-efrain` y `tahan` existen; 1Cr 7:14-20 los reutiliza. La Mahlá de 1Cr 7:18 es otra persona que `mahla-hija-de-zelofehad`, y el Siquem de 1Cr 7:19 es otro que `siquem-hijo-de-galaad`: cada uno lleva `no_confundir_con` en las dos fichas.
- **Ahiram.** `ahiram` (Nú 26:38) tiene un `mismo_que` pendiente hacia `ehi`; 1Cr 8:1 lo llama Ahará.
- **Hur.** `hur-hijo-de-caleb` (1Cr 2:19, 20) ya existe, con un `mismo_que` pendiente desde `hur-companero-de-moises`.
- **Nadab y Abihú.** 1Cr 24:2 añade su pasaje a `muerte-de-nadab-y-abihu`, el suceso que creó Levítico.

## Para 2 Timoteo

- **Áquila y Priscila con Pablo.** Su relación `acompana` con `pablo` va de c. 50 a 65 (Ro 16:3, 4; Perspicacia «Prisca»), como `colaborador`, y ya cita 1Co 16. 2Ti 4:19 añade su capítulo a las fuentes de esa relación, sin crear otra.
- **Janes y Jambres.** Los magos del faraón (Éx 7:11, 22) no tienen ficha. Si 2Ti 3:8 los crea, el tramo 7:8-13 de Éxodo los puede poner en `menciona`.

## Para Jeremías y Ezequiel

- **Migdol.** `migdol` es el lugar de Éx 14:2 y Nú 33:7. La ciudad egipcia de Jer 44:1 y Ez 29:10 es la entrada núm. 2 de Perspicacia «Migdol» y lleva otro id.

## Para 1 Samuel

- **Abiatar y su padre.** `abiatar` ya existe (clave `1200000030`), creado desde Mr 2:26. Le falta la relación `pariente` con su padre Ahimélec, en la ficha de Abiatar (1Sa 22:20; Perspicacia «Abiatar»). Si la propuesta del Salmo 52 ya creó `ahimelec-hijo-de-ahitub`, se reutiliza ese id.
- **La unción de David (1Sa 16).** Hch 13:22 la recuerda. Cuando 1 Samuel cree el suceso, añade «Hch 13:22» a sus pasajes y lo pone en el tramo 16-22 de Hechos 13 (`data/cobertura/hechos.yaml`).
- **Nob.** La nota de estudio de Mr 2:26 pone allí la casa de Dios donde David comió los panes. Ni Mateo 12 ni Marcos 2 nombran Nob, así que no tiene ficha: la crea 1 Samuel 21.

## Para 1 Timoteo y 2 Timoteo

- **Alejandro.** Ya existen `alejandro-hijo-de-simon` (`1200000192#2`, Mr 15:21), `alejandro-pariente-de-anas` (`#3`, Hch 4:6) y `alejandro-de-efeso` (`#4`, Hch 19:33). El de 1Ti 1:20 es la entrada núm. 5 y el calderero de 2Ti 4:14, la núm. 6; Perspicacia ve posible que sean el mismo, así que van dos fichas y un `mismo_que` pendiente. Todos llevan `no_confundir_con` entre sí.

## Para 2 Samuel y 1 Crónicas

- **Natán, hijo de David.** `natan-hijo-de-david` (clave `1200003184#4`) existe desde Lu 3:31. 2Sa 5:14, 1Cr 3:5 y 1Cr 14:4 usan ese id; `natan-profeta` sigue sin clave.
- **Abías, el de la división sacerdotal.** `abias-de-tiempos-de-david` (clave `1200000041#4`) existe desde Lu 1:5. 1Cr 24:10 usa ese id y añade su pasaje.
- **David quiere construir una casa a Dios (2Sa 7:1-3).** Hch 7:46 lo recuerda y `pacto-con-david` no incluye esos versículos. El suceso que cree 2 Samuel añade «Hch 7:46» a sus pasajes y va en el tramo 44-50 de Hechos 7.
- **Cainán y Selá.** `sela-hijo-de-arpaksad` lleva dos padres: Arpaksad (Gé 11:12) y, con `estado: pendiente`, `cainan-hijo-de-arpaksad` (Lu 3:36), que falta en el texto hebreo. 1Cr 1:18 no cambia ninguno de los dos.

## Para 1 y 2 Reyes

- **Sarepta (1Re 17).** `sarepta` existe desde Lu 4:26. Faltan la relación `elias-profeta` `vivio_en` `sarepta` (1Re 17:9, 10) y el suceso de la viuda; cuando exista, va en `menciona` del tramo Lucas 4:23-27.
- **Elat y Ramot-Galaad.** `elat` (Elot en `nombres`; 1Re 9:26; 2Re 14:22; 16:6) y `ramot-galaad` (1Re 22) ya existen.
- **La reina de Saba (1Re 10).** Lu 11:31 y Mt 12:42 la llaman reina del sur. El lugar `saba` es el de Job 6:19. El reino de Saba (Perspicacia «Seba», núm. 6) ya existe como `reino-de-saba`, desde Sl 72 y Joe 3:8: 1 Reyes lo usa y lo añade a `menciona` de los tramos Lucas 11:29-36 y Mateo 12:38-42.
- **Obras y riqueza de Salomón.** Ec 2:4-9 cuenta sus casas, viñas, estanques, siervos, oro y cantores, que narran 1Re 7:1-8, 9:17-19 y 10:14-29. Cuando 1 Reyes cree esos sucesos, añade «Ec 2:4-9» a sus `pasajes` y el suceso al tramo 1-11 de `data/cobertura/eclesiastes.yaml`. El único que ya existe, `flota-de-salomon-a-ofir`, lleva Ec 2:8 desde Eclesiastés.

- **La muerte de David (1Re 2:10).** `david` ya lleva `murio_en` `jerusalen`, deducida de Hch 2:29. Cuando 1 Reyes cuente su muerte, añade su capítulo a las fuentes de esa relación con un `anadir`, sin crear otra.
- **Elías en el Horeb (1Re 19:9-18).** Ro 11:2-4 recuerda su queja y los 7.000 que no se arrodillaron ante Baal. Cuando 1 Reyes cree ese suceso, añade «Ro 11:2-4» a sus pasajes y lo pone en el tramo 1-6 de Romanos 11, donde ahora `elias-profeta` está en `menciona`.

## Para 2 Reyes

- **Naamán el sirio (2Re 5).** `naaman-el-sirio` (clave `1200003149#2`) existe desde Lu 4:27. Falta el suceso de su curación; cuando exista, va en `menciona` del tramo Lucas 4:23-27.
- **Fronteras (también para Ezequiel).** 1Re 8:65 usa `lebo-hamat` y `torrente-de-egipto`; 1Re 9:26, `ezion-gueber`; Ez 47 y 48, `zedad`, `hazar-enan` (Hazar-Enón está en `nombres`) y `lebo-hamat`.
- **La serpiente de cobre.** 2Re 18:4 (Nehustán) y Jn 3:14 remiten a `moises-hace-la-serpiente-de-cobre`.

## Para Nehemías

- **Itiel.** `itiel-oyente-de-agur` (clave `1200002237#1`, Pr 30:1) ya existe. El benjamita de Ne 11:7 es la entrada núm. 2 de Perspicacia «Itiel» (`1200002237#2`): va en ficha aparte, con `no_confundir_con` en las dos.
- **La Puerta de las Ovejas (Ne 3:1, 32; 12:39).** Desde Jn 5:2 es un nombre de `jerusalen`, con su nota. Se reutiliza, sin ficha propia.

## Para 1 Reyes (Salomón)

- **Salomón.** Los cambios de Proverbios, Eclesiastés y El Cantar a su `resumen` y a su `razon` ya están integrados en `salomon.yaml`. Un cambio posterior a esos campos parte del texto actual, con su `antes`. El resumen sigue en 40 palabras.
- **Congregador.** Eclesiastés añade ese nombre a `salomon` y las relaciones `vivio_en` `jerusalen` y `pariente` `david` con sus capítulos. No hace falta volver a proponerlos.
- **Abisag.** Es de `sunem`, que existe desde El Cantar. La `sulamita` dice en `no_afirmamos` que no la damos por Abisag: Perspicacia «Sulamita» solo compara 1Re 1:3 con Can 6:13.

## Para Josué, 1 Samuel y 2 Reyes

- **Sunem.** `sunem` existe desde El Cantar (OpenBible ac86af5, con Sulem en `nombres`). Jos 19:18, 1Sa 28:4 y 2Re 4:8 usan ese id.

## Para Números, Deuteronomio y Josué

- **Hesbón.** `hesbon` existe desde Can 7:4, con su puerta Bat-Rabim en `nombres`. Falta en `sehon` la relación `vivio_en` `hesbon` (Nú 21:26; Perspicacia «Hesbón», párr. 2), y los sucesos de su conquista.
- **Amaná y Senir.** Amaná es un nombre de `antilibano` (Can 4:8); Senir sigue en `monte-hermon`.

## Para Nehemías

- **La torre de David.** Está en `nombres` de `jerusalen` desde Can 4:4, con una nota: Perspicacia «Torre» recoge que quizá sea la torre de la Casa del Rey de Ne 3:25. Si Nehemías apunta esa torre, la relaciona con esta nota.

## Para 1 Reyes y 2 Reyes (desde Oseas)

- **Reyes de Os 1:1.** Oseas usa `uzias`, `jotan`, `acaz`, `ezequias`, `jeroboan-ii` y `jehoas-de-israel`, que ya existían. Deja en `data/_propuestas/oseas.json` las claves de `jehu-de-israel` (`1200002401#3`), `jeroboan-ii` (`1200002431#2`), `jehoas-de-israel` (`1200002373#2`), `hosea-de-israel` (`1200002090#4`) y `salmanasar-v` (`1200003936#2`). Reyes no vuelve a proponerlas: un `cambiar` desde `null` chocaría. Siguen sin clave `menahem`, `zacarias-de-israel` y `salum-de-israel`.
- **El fin de la casa de Jehú.** Perspicacia «Jezreel», núm. 4, ve cumplido Os 1:4 cuando Salum mata a Zacarías (2Re 15:8-12). Cuando Reyes cree ese suceso, va en `menciona` de los tramos Oseas 1:2-5 y Amós 7:7-9 (Am 7:9 remite a 2Re 15:8-10; Perspicacia «Plomada»). `nacimiento-de-jezreel-hijo-de-oseas` acaba en 791 a.e.c. por él.
- **Sucesos que Oseas nombra y aún no existen.** El tributo de Menahem a Pul (2Re 15:19, 20) y el trato de Hosea con So de Egipto (2Re 17:4; Perspicacia «Asiria» lo une a Os 7:11) van a `menciona` de los tramos Oseas 7:8-12 y 12:1-2. Los becerros de Jeroboán (1Re 12:28-30) van a Oseas 8:1-6, 10:5-8 y 13:1-3, y a Amós 3:13-15, 4:4-5, 5:4-6 y 8:14. El altar de Betel que derriba Josías (2Re 23:15, 16) va también a Amós 3:13-15.
- **La caída de Samaria.** `caida-de-samaria` lleva `presentes: [salmanasar-v]`, pero Perspicacia «Salmanasar» dice que la Biblia no le atribuye la toma final (remite a «Sargón»). «Toda Escritura», libro 30, párr. 4, habla del sitio asirio bajo Salmanasar V. 2 Reyes 17 decide.
- **Guilgal cerca de Betel.** `guilgal-cerca-de-betel` (Perspicacia «Guilgal», núm. 2) es la de 2Re 2:1-5 y 4:38-41. Su `razon` cita esos capítulos, así que sus tramos la llevan al cerrarlos.
- **Salmán.** `salman` (Os 10:14) lleva un `mismo_que` pendiente hacia `salmanasar-v`: Perspicacia «Salmán» solo lo da como probable.

## Para Josué y Jueces (desde Oseas)

- **Guilgal.** Am 4:4 y 5:5 ya usan `guilgal-cerca-de-betel`, y su `no_afirmamos` deja la misma duda que para Oseas. La Guilgal junto a Jericó (Perspicacia «Guilgal», núm. 1) es `guilgal`, creada a la vez por Josué y por Miqueas (Miq 6:5) con el mismo punto de OpenBible ab94aea. Khirbet el-Mefjir es la primera identificación de OpenBible, pero Perspicacia solo dice que «se ha propuesto»: por eso lleva `precision: incierto` en los dos carriles, como `moreset`. Los lugares no admiten `no_confundir_con`: la `razon` de `guilgal` dice que no es el núm. 2, y su `no_afirmamos` deja la duda simétrica a la de `guilgal-cerca-de-betel` (Os 4:15; 9:15; 12:11; Am 4:4; 5:5). Gane la ficha que gane al integrar, `data/_propuestas/miqueas.json` le añade `miqueas-6`, su enlace y ese `no_afirmamos`.
- **Mizpá de Galaad.** `mizpa-de-galaad` (Perspicacia «Mizpá, Mizpé», núm. 4) cita Jue 11:34 en su `razon`. Jueces 10-11 la usa y añade `jefte` `vivio_en` `mizpa-de-galaad`.
- **Valles.** `valle-de-acor` (Os 2:15) es el de Acán (Jos 7:24-26; 15:7) y `valle-de-jezreel` (Os 1:5) el de Jos 17:16 y Jue 6:33.
- **Guibeá.** Os 9:9 y 10:9 aluden al crimen de Jue 19-20 (Perspicacia «Guibeah», núm. 2). Cuando Jueces cree el suceso, va en `menciona` de los tramos Oseas 9:7-9 y 10:9-10.

## Para Números, Deuteronomio y 1 Samuel (desde Oseas)

- **Baal de Peor.** Os 9:10 alude a Nú 25: el suceso va en `menciona` del tramo Oseas 9:10-14.
- **Admá y Zeboyim.** `destruccion-de-sodoma-y-gomorra` no las lleva en `lugares`, aunque Dt 29:23 las pone con Sodoma y Gomorra. Deuteronomio decide.
- **Israel pide rey.** Os 13:10, 11 alude a 1Sa 8 (Perspicacia «Oseas, Libro de»): el suceso va en `menciona` del tramo Oseas 13:9-11.

## Para Isaías, Jeremías, Ezequiel y los demás profetas (desde Oseas)

- **Menfis.** `menfis` lleva Nof en `nombres`: Is 19:13, Jer 2:16, 44:1, 46:14 y Ez 30 usan ese id.
- **Profecías sin escena.** Oseas 4-14 lleva un solo suceso, `juicios-profeticos-contra-efrain-y-juda` (Os 4:1-14:9, la sección de «Toda Escritura»), con fecha narrativa de la obra del profeta y `presentes: []`. Cada tramo lo pone en `entidades`.
- **«David su rey».** Os 3:5 lleva `persona:david` y `persona:jesus` en `menciona`: el nombre es el del rey histórico, y La Atalaya de 1991 lo aplica a Jesucristo, descendiente de David. Am 9:11 la sigue: Perspicacia «Cabaña» une la cabaña de David a Jesús, rey de su línea. Jer 30:9, Ez 34:23, 24 y 37:24, 25 siguen la misma regla.
- **Alusiones al éxodo.** Los versículos que Perspicacia da como alusión a la salida de Egipto (Os 2:15; 11:1; 12:13) van en `pasajes` de `exodo` y en `entidades`. La fórmula «tu Dios desde la tierra de Egipto» (Os 12:9; 13:4) va solo en `menciona`. Amós añade un caso: los versículos que afirman con sus palabras que Jehová sacó a Israel de Egipto (Am 2:10; 3:1; 9:7) van en `pasajes`, aunque Perspicacia no los cite. Miqueas lo hizo con Miq 6:4. Míriam no entra en `personas` de `exodo`: sus pasajes son la noche de la salida, y el canto de Éx 15:20, 21, que es lo que recuerda La Atalaya de 2003, ya es `israel-canta-junto-al-mar-rojo`. Si Éxodo la quiere en `exodo`, lo explica en la `razon` del suceso.
- **La fecha del libro.** `data/libros.yaml` toma sus fechas solo de la tabla de libros (`tnm-tabla`), que pone Oseas «después de 745». Perspicacia «Oseas, Libro de» lo cierra entre 745 y 740: ese límite va en la `razon` de los sucesos, no en `libros.yaml`.

## Para Hechos y Romanos (desde Joel)

- **Joel 2:28-32 en Pentecostés.** El tramo Joel 2:28-32 lleva `pentecostes-33` en `menciona`, y Joe 2 no está en sus `pasajes`. Hch 2:16 nombra al profeta: `joel-profeta` (clave `1200002481#9`) va en `menciona` de ese tramo de Hechos. Ro 10:13 aplica Joe 2:32.

## Para los demás profetas (desde Joel)

- **Un suceso por libro.** Amós lo siguió con `amos-profetiza-contra-israel` (Am 1:1-9:15), y su escena con Amasías en Betel es un suceso aparte. Joel lleva uno solo, `joel-anuncia-el-dia-de-jehova` (Joe 1:1-3:21), anclado en c. 820 a.e.c. (?) y con `presentes: []`, como Oseas 4-14.
- **Las langostas de Joel 1 y 2.** Manda La Atalaya de abril de 2020 (`w20-ataque-del-norte`): son el ejército babilonio que tomó Jerusalén en 607 a.e.c., y no son las langostas de Ap 9. Los tramos Joel 1:2-4, 1:5-12, 2:1-11 y 2:18-27 llevan `destruccion-de-jerusalen-607` en `menciona`.
- **Grecia.** `grecia` existe desde Joe 3:6 (OpenBible a4492a0, con Javán en `nombres`). Is 66:19, Ez 27:13, Da 8:21, 10:20, 11:2, Zac 9:13 y Hch 20:2 usan ese id cuando hablan de la tierra.
- **El valle de Jehosafat y el de la Decisión** (Joe 3:2, 12, 14) no llevan ficha: Perspicacia «Jehosafat, Llanura baja de» y La Atalaya de 2007 los llaman lugar simbólico.

## Para 2 Crónicas, Ezequiel y Zacarías (desde Joel)

- **Ríos que salen del templo.** La adoración pura, recuadro 19A (`rr-rios-de-bendiciones`), lee el manantial de Joe 3:18, el río de Ez 47 y las aguas de Zac 14:8 como figura de las bendiciones de Jehová. Ezequiel y Zacarías pueden citar esa fuente.
- **Sucesos que Joel 3 recuerda.** La victoria de Jehová en días de Jehosafat (2Cr 20) va en `menciona` del tramo Joel 3:1-3. El saqueo de filisteos y árabes (2Cr 21:16, 17) va en el tramo Joel 3:4-6. La caída de Tiro ante Nabucodonosor, y la de la isla ante Alejandro, en el tramo Joel 3:7-8.

## Para Deuteronomio y 2 Reyes (desde Joel)

- **Mar Salado.** Joel añade «Mar oriental» (Joe 2:20) a `nombres` de `mar-salado`. Falta «mar del Arabá» (Dt 4:49; 2Re 14:25; Perspicacia «Mar Salado»).

## Para quien reabra Éxodo, Números o Deuteronomio

- **El fin del maná.** Éx 16:35 no está en `cesa-el-mana` (Jos 5:12) porque Éxodo 16 ya estaba cerrado: al reabrirlo, se añade el pasaje y el suceso va al tramo.
- **Anac en Deuteronomio.** Dt 9:2 cita el dicho sobre los hijos de Anac. Desde Josué existe la persona `anac` (Jos 15:13): al reabrir Deuteronomio, va en `menciona` del tramo Dt 9:1-6.

## Para quien reabra los Evangelios (desde Josué)

- **Queriyot-hezrón.** Existe `queriyot-hezron` (Jos 15:25). Perspicacia «Judas», núm. 4, solo ve probable que Judas Iscariote y su padre fueran de allí, y los Evangelios no lo dicen: `judas-iscariote` y `simon-iscariote` no llevan relación con ese lugar.

## Para Miqueas (desde Josué)

- **Maresá.** `maresa` existe desde Josué (Perspicacia «Maresá», núm. 3; OpenBible a5cda86, Tell Sandahannah). Miqueas funde su `maresa` con esta en una sola ficha.
- **Zaanán y Marot.** `zenan` (Jos 15:37) y `maarat` (Jos 15:59) existen desde Josué. Muchos toman Zenán por la Zaanán de Miq 1:11 y algunos Maarat por la Marot de Miq 1:12, sin certeza. Miqueas añade a `zenan` y `maarat` un `no_afirmamos` que diga que no damos por hecho que sean `zaanan` y `marot`.

## Para Jueces

- **Pasajes ya puestos.** Jue 11:17 en `edom-niega-el-paso-a-israel` y Jue 11:19-22 en `israel-vence-a-sehon`.
- **Hobab.** `hobab` lleva a Moisés como cuñado (deducido, Perspicacia «Hobab») y a `jetro` como padre. Jue 4:11 lo llama suegro de Moisés: Jueces lo relee sin cambiar a quién es el suegro.
- **Hormá y la subida de Acrabim.** Jue 1:17 usa `horma` (Zefat ya está en `nombres`) y Jue 1:36, `subida-de-acrabim`. La Beer de Jue 9:21 es la entrada núm. 2 de Perspicacia y lleva otro id que `beer`.
- **Abí-Ézer y Jaír.** Jue 6 reutiliza `abi-ezer-hijo-de-galaad`, que desde Josué 17 se escribe Abí-Ézer, como en la TNM. El juez Jaír (Jue 10:3) es otro que `jair-hijo-de-segub`: `no_confundir_con` en las dos fichas.
- **Pua (también para 1 Crónicas).** La TNM escribe Pua para tres personas (Perspicacia «Puá»): `puva`, el hijo de Isacar, así llamado en 1Cr 7:1; `pua-partera`, de Éx 1:15; y el padre del juez Tolá (Jue 10:1), núm. 3, que aún no tiene ficha y, como hijo de Dodó, lleva `pua-hijo-de-dodo`.
- **Sucesos de Josué con pasaje en Jueces.** `caleb-echa-a-los-hijos-de-anac-de-hebron` (Jue 1:10, 20), `otniel-toma-debir-y-se-casa-con-acsa` (Jue 1:11-13), `acsa-pide-a-caleb-gulot-maim` (Jue 1:14, 15) y `los-danitas-toman-lesem` (Jue 18:27-29) ya llevan ese pasaje: sus tramos los ponen en `entidades`.
- **Fecha de Otniel y Debir.** Esos tres sucesos de Caleb y Otniel van entre 1467 y c. 1450 a.e.c. Perspicacia «Debir», núm. 2, deja abierto si Otniel tomó la ciudad tras la muerte de Josué (Jue 1:1): Jueces decide si cambia el límite.
- **Muerte de Josué.** Jue 2:6-9 repite Jos 24:28-31: se añade «Jue 2:8, 9» a `muerte-de-josue`. Timnat-Heres ya está en `nombres` de `timnat-serah`.
- **Luz y Betel.** `betel` lleva Luz con `hasta` −1472, pero Jos 16:2 y 18:13 aún usan ese nombre y Perspicacia «Betel» liga el cambio a Jue 1:22-26. Jueces decide si mueve el año.
- **Ids de Josué.** Jue 1:27-35 usa `bet-sean`, `taanac`, `dor`, `ibleam`, `meguido`, `guezer`, `catat`, `nahalal`, `aczib-de-aser`, `afec-de-aser`, `rehob-de-aser`, `bet-semes-de-neftali`, `bet-anat`, `saalbim` y `ayalon`. Jue 4:6 usa `quedes-de-neftali`; Jue 4:11, `zaananim`; Jue 12:8, `belen-de-zabulon`; Jue 2:1, `guilgal`. La Aroer de Jue 11:33 quizá es `aroer-de-gad`.
- **El ángel de Bokim.** Perspicacia «Guilgal», núm. 1, ve posible que el ángel de Jue 2:1 sea el príncipe del ejército de Jos 5:13-15 (`el-principe-del-ejercito-de-jehova-se-aparece-a-josue`).
- **Jabín.** `jabin-rey-de-hazor` (Jos 11) y `jabin-rey-de-canaan` (Jue 4) son fichas distintas, con `no_confundir_con` y un parentesco `antepasado` pendiente, porque Perspicacia solo lo ve posible.
- **Finehás.** Jue 20:27, 28 lo muestra de sumo sacerdote; `finehas-hijo-de-eleazar` ya lleva `sucede_a` Eleazar y existe `sumo-sacerdocio-de-eleazar`.
- **Debir.** Perspicacia ve una segunda toma de Debir por Otniel (Jue 1:11-13) después de la de Josué (`josue-toma-debir`, Jos 10:38, 39).

## Para Isaías, Jeremías y Nehemías

- **Ciudades de Moab que ya existen.** `dibon`, `nebo` (la ciudad, no `monte-nebo`), `quiryataim`, `baal-meon`, `aroer`, `jahaz`, `hesbon`, `eleale`, `sibma`, `jazer`, `medeba`, `ar` y `arnon`. Perspicacia solo da como probable que Bet-Diblataim (Jer 48:22) sea `almon-diblataim`.
- **Dibón de Judá.** El Dibón de Ne 11:25 es la entrada núm. 2 de Perspicacia y lleva otro id que `dibon`.

## Para Ester

- **Abiháil.** `abihail-padre-de-zuriel` es la entrada núm. 1 de Perspicacia. El padre de Ester es la núm. 5: otro id y `no_confundir_con` en las dos.
- **Jaír.** `jair-hijo-de-segub` es la entrada núm. 1 de Perspicacia «Jaír». El padre de Mardoqueo (Est 2:5) es la núm. 3: otro id y `no_confundir_con` en las dos.

## Para las Escrituras Griegas

- **Pasaje ya puesto.** Jud 11 está en `muerte-de-core`.
- **Pasajes que aún no están en ningún suceso.** Hch 7:36 y 13:18, 1Co 10:5, 10, Heb 3:16-19 y Jud 5 van a `jehova-condena-a-israel-a-40-anos-en-el-desierto`; 1Co 10:8, Ap 2:14 y Os 9:10 a `israel-adora-al-baal-de-peor`; 2Pe 2:15, 16 a `la-burra-de-balaam-habla`; Heb 9:4 nombra la vara de `la-vara-de-aaron-echa-brotes`. Miq 6:5 nombra `balac`, `balaam` y `sitim`.

## Para Deuteronomio, Josué y Jueces

- **El monte Guerizim.** Existe `monte-guerizim` desde Jn 4:20 (punto de OpenBible `a30e967`). Dt 11:29, 27:12, Jos 8:33 y Jue 9:7 usan ese id.

## Para Gálatas y 1 Corintios

- **Pasajes ya puestos en sucesos de Hechos.** Gál 1:15, 16 en `conversion-de-pablo`; Gál 1:18, 19 en `pablo-visita-a-cefas`; Gál 2:1-10 en `concilio-de-jerusalen-49`. Van en los tramos de esos capítulos. Hechos es el dueño de estos sucesos (sección 6 de `versiculos.md`).

## Para Hechos

- **La colecta para Jerusalén.** `colecta-de-macedonia-y-acaya` existe desde Ro 15:25-28, 31, que es su dueño porque Hechos solo la recuerda en un discurso (Hch 24:17). 1 Corintios y 2 Corintios (1:16; 8:1-15; 9:1-15) ya pusieron sus pasajes. 2Co 8:10 y 9:2 adelantan su comienzo: la fecha es derivada, c. 54-56, y el suceso queda pendiente. Si se relee Hechos 24, «Hch 24:17» entra igual en el tramo 10-21.
- **La ayuda de Macedonia en Corinto.** `crispo-cree` (Hch 18:5-8) lleva «2Co 11:9», porque «Testimonio completo», cap. 19, párr. 8, dice que Silas y Timoteo trajeron esa ayuda. Si Hechos hace de su llegada un suceso propio, el pasaje pasa a él y el tramo 7-11 de 2 Corintios 11 lo nombra.
- **Troas camino de Macedonia (2Co 2:12, 13).** La parada tiene suceso propio, `pablo-predica-en-troas-y-no-encuentra-a-tito`, y es la parada 5 de `tercer-viaje` (las de después se renumeraron). `pablo-deja-efeso-hacia-macedonia` sigue con «2Co 2:12, 13» en `pasajes` y en su `razon`; Hechos 20 puede quitarlo con un `cambiar`, y entonces ese suceso pasa a `menciona` del tramo 12-13 de 2 Corintios 2.

## Para Filipenses

- **Los antepasados de Pablo.** `pablo` lleva `pariente` `antepasado` hacia `abrahan` (Ro 4:1; 11:1; 2Co 11:22), `isaac` (Ro 9:10) y `benjamin-hijo-de-jacob` (Ro 11:1). Flp 3:5 solo añade su capítulo a las fuentes de esas relaciones, sin crear otras.

## Para 1 Corintios (si se relee) y 2 Timoteo

- **El peligro de Asia.** 2 Corintios hizo de la tribulación de 2Co 1:8-11 un suceso propio, `pablo-en-peligro-de-muerte-en-asia`, y sacó «2Co 1:8» de `motin-de-efeso`: la nota de estudio solo ve posible que fuera el motín o las fieras de Éfeso. El tramo de 1Co 15:32 lo puede poner en `menciona`, sin añadirle el pasaje.
- **Áquila y Priscila con Pablo.** Su relación `acompana` con `pablo` va de c. 50 a 65 (Ro 16:3, 4; Perspicacia «Prisca»), como `colaborador`. 1Co 16:19 y 2Ti 4:19 añaden su capítulo a las fuentes de esa relación, sin crear otra.

## Para Tito

- **Apolos y Pablo.** `apolos` lleva `acompana` `pablo` como `colaborador`, c. 55 (1Co 3, 4 y 16): trabajaron el mismo campo en momentos distintos y solo se les ve cerca al escribirse 1 Corintios. Tit 3:13 añade su capítulo a las fuentes de esa relación con un `anadir` y puede alargar su fecha con un `cambiar` sobre esa relación.
- **Tito y Pablo.** `tito` lleva tres relaciones `acompana` con `pablo`: c. 49 (Gál 2), c. 55 (2 Corintios, ya como `compañero` y con 2Co 2, 7, 8 y 12) y c. 61-64 (Tito). `aplicar.py` funde un `anadir` de relación en la primera con el mismo tipo y persona, la de 49. Para tocar la de 55 o la de 61-64, 2 Corintios usó un `cambiar` de toda la lista `relaciones`, con su `antes`; si choca, va a `preguntas` para una edición a mano.

## Para 1 y 2 Samuel (desde Josué)

- **Ids de Josué.** `guilgal` es Perspicacia «Guilgal», núm. 1 (1Sa 10:8; 11:14, 15; 13; 15; 2Sa 19:15); Perspicacia duda si el de 1Sa 7:16 es este o el núm. 2. También `bet-aven` (1Sa 13:5; 14:23), `bet-semes` (1Sa 6), `quiryat-jearim` (1Sa 6:21; 7:1), `ecron`, `asquelon`, `ziclag`, `queila`, `maon`, `carmelo-de-juda`, `soco`, `estemoa`, `jatir` y `saaraim`.
- **Debir de Gad.** `debir-de-gad` (Jos 13:26); Perspicacia cree que es Lo-debar (2Sa 9:4; 17:27). 2 Samuel decide si crea `lo-debar` o la reutiliza.
- **Jafía.** El hijo de David (2Sa 5:15) es Perspicacia «Jafía», núm. 2: otro id y `no_confundir_con` con `jafia-rey-de-lakis`.
- **Gaas.** 2Sa 23:30 nombra los valles torrenciales de Gaas, junto a `monte-gaas`.
- **El libro de Jasar.** Jos 10:13 y 2Sa 1:18 lo citan; no lleva ficha.

## Para 1 Reyes (desde Josué)

- **Hiel (1Re 16:34).** La razón de `josue-maldice-al-que-reconstruya-jerico` cita 1Re 16:34: cuando 1 Reyes 16 se cierre, ese suceso va en su tramo y el de Hiel cumple la maldición.

## Para 1 y 2 Crónicas (desde Josué)

- **Ciudades levitas.** `los-levitas-reciben-48-ciudades` lleva 1Cr 6:54-81 en `pasajes`: va en el tramo. Josué funde en una ficha los nombres que Perspicacia da por la misma ciudad, aunque sea con «al parecer»: Hamón y Hamot-Dor están en `hammat`, Rimono y Dimná en `rimon-de-zabulon`, Ramot y Jarmut en `remet`, y Ain en `asan`. Hilén y Holón, Jocmeam y Quibzaim, y Anem y En-Ganim se deciden con ese mismo criterio y su artículo.
- **Ciudades de Simeón (1Cr 4:28-33).** Reutiliza `molada`, `hazar-sual`, `bala` (Bilhá en `nombres`), `ezem`, `eltolad` (Tolad), `betul` (Betuel), `horma`, `ziclag`, `madmana` (Bet-Marcabot en `nombres`), `hazar-susa`, `saaraim`, `ain-de-simeon`, `rimon-de-simeon`, `eter` (Token) y `asan`.
- **Acar y Carmí.** 1Cr 2:7 llama Acar a `acan-hijo-de-carmi` (ya en `nombres`); 1Cr 2:7 y 4:1 nombran a `carmi-hijo-de-zabdi`.
- **Naará.** `naara` (Jos 16:7); Perspicacia solo cree que es la Naarán de 1Cr 7:28.
- **Gaas.** 1Cr 11:32 nombra los valles torrenciales de Gaas, junto a `monte-gaas`.
- **Zaretán.** `zaretan` (Jos 3:16); Perspicacia no asegura que la Zeredá de 2Cr 4:17 sea otra grafía, así que no va en `nombres`.

## Para Nehemías (desde Josué)

- **Ciudades de Judá y Benjamín (Ne 11:25-36).** Reutilizan los ids de Jos 15 y 18: `cabzeel`, `molada`, `bet-pelet`, `hazar-sual`, `ziclag`, `zanoah`, `adulam`, `lakis`, `azeca`, `zora`, `jarmut`, `gueba` y los demás.

## Para Isaías y Oseas (desde Josué)

- **Valle de Acor.** Is 65:10 y Os 2:15 usan `valle-de-acor`.
- **Bet-Aven.** La de Jos 7:2 y 18:12 es `bet-aven` (Perspicacia núm. 1). La de Os 4:15; 5:8; 10:5 (núm. 2) sigue como nombre de `betel`.

## Para Hechos, Hebreos y Santiago (desde Josué)

- **Pasajes sin poner.** Hch 7:44, 45 (el tabernáculo entra con Josué) puede ir en `entrada-en-canaan`; Hch 7:15, 16 y Heb 11:22, en `entierran-los-huesos-de-jose-en-siquem`.

## Para 1 Reyes, 2 Reyes, 1 Crónicas y 2 Crónicas (desde Amós)

- **Hazael y los Ben-Hadad.** `hazael` (`1200001923`) y `ben-hadad-hijo-de-hazael` (`1200000636#3`) existen desde Am 1:4. Reyes crea Ben-Hadad I y II (núm. 1 y 2) con `no_confundir_con` en las tres fichas, y añade `hazael` `sucede_a` Ben-Hadad II (2Re 8:15). La unción de 1Re 19:15 también es de Reyes.
- **Damasco y Quir.** Cuando Reyes cree la toma de Damasco por Tiglat-piléser III y el destierro a Quir (2Re 16:9), el suceso va en `menciona` de los tramos Amós 1:3-5 y 9:7-10. Los de Hazael contra Galaad (2Re 10:32, 33) van a Amós 1:3-5.
- **Amasías.** `amasias`, el rey de Judá, ya lleva la clave (`1200000224#2`) y su `desambiguacion`, como la de `amos-profeta` (`1200000246#1`); el sacerdote de Betel es `amasias-sacerdote-de-betel` (`#3`). Reyes y Crónicas no vuelven a proponerlas.
- **Jeroboán II.** Su `resumen` ya dice «desde Lebó-Hamat» (2Re 14:25), no «desde Hamat». Un cambio posterior parte de ese texto. `hamat` y `lebo-hamat` son dos fichas: 2Re 14:28 usa `hamat`.
- **Samaria.** Lleva «Montaña de Samaria» en `nombres` (Am 4:1; 6:1): el monte que Omrí compra en 1Re 16:24.
- **El terremoto.** `terremoto-en-dias-de-uzias` (Am 1:1; Zac 14:5) es de Amós. Si Crónicas lo nombra al hablar de Uzías, añade su pasaje.

## Para Josué, Jueces, 1 Samuel, 2 Samuel y Jeremías (desde Amós)

- **Ciudades filisteas.** `asquelon` y `ecron` existen desde Am 1:8 (Perspicacia escribe Eqrón, que va en `nombres`). Gaza, Asdod y Gat ya existían.
- **Queriyot.** `queriyot` (Am 2:2) no tiene punto: dos candidatos «alternativa», Ar y Saliyá. Jer 48:24, 41 usan ese id.
- **Harmón.** `harmon` (Am 4:3) lleva como único candidato el peñasco de Rimón, en Rammun. Si Jueces 20:45-47 crea ese peñasco, el candidato de `harmon` puede remitir a él.

## Para Isaías, Jeremías, Ezequiel, Zacarías y Hechos (desde Amós)

- **Quir.** `quir` existe sin punto (Am 1:5; 9:7): Is 22:6 lo usa.
- **Bet-Edén.** `bet-eden` (Am 1:5) quizá sea la tierra de los hijos de Edén de 2Re 19:12 e Is 37:12; si Reyes o Isaías lo confirman con Perspicacia, lo apuntan.
- **Calné y Calnó.** `calne-de-siria` (Am 6:2; Perspicacia «Calné», núm. 2) no es `calne` (Gé 10:10). Isaías decide si la Calnó de Is 10:9 es la misma; por ahora solo lo dice `no_afirmamos`.
- **Hamat.** `hamat` existe (Hamat la Grande en `nombres`): Is 10:9, 11:11, Jer 49:23 y Zac 9:2 lo usan.
- **Creta es Caftor.** `creta` lleva Caftor en `nombres`: Jer 47:4 usa `creta`, y también Dt 2:23 cuando habla del lugar.
- **Israel es José.** `israel` lleva «José» en `nombres` para el reino del norte (Am 5:6, 15; 6:6), como Efraín.
- **Hechos 7 y 15.** Los tramos Amós 5:25-27 y 9:11-12 llevan `discurso-de-esteban` y `concilio-de-jerusalen-49` en `menciona`. Hechos no nombra a Amós, así que sus tramos no lo llevan.
- **Los cuarenta años en el desierto.** Cuando exista el suceso de Números (el andar de Israel por el desierto), va en `menciona` de los tramos Amós 2:9-12 y 5:25-27.

## Para 2 Reyes, Jeremías y Lamentaciones (desde Abdías)

- **Abd 11 y la deportación de 617.** Las referencias de Abd 11 remiten a 2Re 24:10, 16 y Jer 52:28 (Joaquín, 617 a.e.c.), pero Perspicacia «Abdías, Libro de» y «Toda Escritura» ponen la conducta de Edom en 607. Abd 11-14 está en `pasajes` de `destruccion-de-jerusalen-607`. Cuando Reyes cree la deportación de 617, decide si Abd 11 va también en sus `pasajes`.
- **El campo de Samaria.** Abd 19 lleva `israel` en `entidades`, con «Samaria» en sus `nombres` (Perspicacia «Samaria», núm. 2: el nombre de la capital cubrió todo el reino), y `samaria` en `menciona`. Las referencias de Abd 19 remiten a 2Re 17:24 y Jer 31:5, que Perspicacia pone en ese mismo núm. 2: Jeremías 31 usa el mismo criterio.
- **Edom y Nabonido.** Perspicacia «Edom» y «Toda Escritura» ven cumplido Abd 7 en la conquista de Edom por Nabonido, que no es un suceso del relato. Abdías pone `nabonido` en `menciona`; Jer 49:7-22, Ez 25:12-14 y 35 y Mal 1:3, 4 pueden hacer lo mismo.

## Para Deuteronomio, Josué, Jueces, 1 Reyes, 1 Crónicas, 2 Crónicas, Jeremías y Zacarías (desde Abdías)

- **Sefelá.** `sefela` existe desde Abd 19 (OpenBible af084cf). Usan ese id los pasajes que cita Perspicacia «Sefelá»: Deuteronomio 1:7; Josué 9:1, 10:40, 11:2 y 12:8, más 15:33-44, que da sus ciudades; Jueces 1:9; 1 Reyes 10:27; 1 Crónicas 27:28; 2 Crónicas 1:15, 9:27, 26:10 y 28:18; Jeremías 17:26, 32:44 y 33:13, y Zacarías 7:7. Jos 11:16 nombra además la Sefelá de la región montañosa de Israel, que Perspicacia sitúa quizá entre Samaria y Sarón: Josué decide si es otra ficha.
- **Benjamín en Abd 19.** «Benjamín conquistará Galaad» nombra a la tribu como pueblo, sin persona; su territorio no tiene ficha, mientras que `juda` sí va en `menciona` de Abd 10-14. Cuando Josué (18:11-28) cree `territorio-de-benjamin`, lo añade a `menciona` del tramo Abdías 1:19-20.
- **Región montañosa de Esaú.** Está en `nombres` de `edom` (Abd 8, 9, 19, 21). `seir` sigue siendo la región montañosa de Gé 14:6 y 36:8.
- **Sefarad.** `sefarad` (Abd 20) no tiene punto: un solo candidato, Saparda de Media, que Perspicacia da como probable.

## Para Amós (desde Abdías)

- **Isaac como pueblo.** La regla de `versiculos.md` sección 4 deja fuera de `menciona` al patriarca cuando su nombre designa al pueblo. Los tramos Amós 7:7-9 y 7:10-17 llevan `persona:isaac` por «lugares altos de Isaac» y «casa de Isaac», el pueblo de Israel: sobra en los dos. «Dios de Jacob» (Sl 20) y «descendencia de Jacob» (Sl 22) nombran al hombre y se quedan.

## Para Mateo y Lucas (desde Jonás, lo aplica la integración)

- **Jonás en el pez y en Nínive.** Jonás crea `un-gran-pez-se-traga-a-jonas` (Jon 1:17-2:10) y `ninive-se-arrepiente` (Jon 3:5-10). Jesús los recuerda: la señal de Jonás y el pez en Mt 12:39, 40, 16:4 y Lu 11:29, 30; el arrepentimiento de Nínive en Mt 12:41 y Lu 11:32 (Perspicacia «Nínive» los cita). Los dos sucesos van a `menciona` de los tramos Mateo 12:38-42 y Lucas 11:29-36, y el pez a `menciona` de Mateo 16:1-4. No van a `pasajes`: esos versículos recuerdan los sucesos, no los narran, y la sección 6 de `versiculos.md` reserva `pasajes` para los versículos del suceso y sus relatos paralelos. La nota de Mateo 12:38-42 que dice que Jonás en Nínive aún no es un suceso se corrige. Jonás, por su parte, ya pone `senal-de-jonas-en-galilea` y `dedo-de-dios-y-senal-de-jonas` en `menciona` de Jon 1:1-3, 1:17 y 3:5-10.

## Para 2 Reyes (desde Jonás)

- **Amitái.** `amitai` existe (clave `1200000231`), con `vivio_en` `gat-hefer` deducido de Perspicacia «Amitai», y `jonas-profeta` lleva `pariente` `amitai` (padre). Las dos relaciones y la de `jonas-profeta` `vivio_en` `gat-hefer` citan o pueden citar 2Re 14:25: el tramo de 2 Reyes 14 las lleva al cerrarse. La profecía de Jonás sobre Jeroboán II es un suceso de Reyes.
- **Fecha de Jonás.** Los sucesos de Jonás van en c. 844 a.e.c., serie `jonas`, como la ficha del profeta. Si Reyes fecha su profecía a Jeroboán II, no cambia esos sucesos.

## Para Josué, 2 Crónicas, Nehemías y Jeremías (desde Miqueas)

- **Zenán y Maarat.** `zaanan` (Miq 1:11) y `marot` (Miq 1:12) no llevan Zenán ni Maarat en `nombres`: Perspicacia solo dice que hay quien las iguala, y las dos lo dejan en `no_afirmamos`. Josué ya creó `zenan` (Jos 15:37) y `maarat` (Jos 15:59) con los mismos puntos: ʽAraq el-Kharba (31.599435, 34.803939) y Beit Ummar (31.621389, 35.102222). Allí la duda solo está en el `resumen`; la integración les añade el `no_afirmamos` simétrico (que Zenán sea la Zaanán de Miq 1:11; que Maarat sea la Marot de Miq 1:12). Las dos `coord_nota` describen bien su punto aunque digan cosas distintas: en la ficha Zaanan de OpenBible (a4e7fa8) ʽAraq el-Kharba es la segunda resolución de la primera identificación, y en la ficha Zenan (a5e1150), la segunda identificación.
- **Moréset.** `moreset` existe (Moréset-Gat en `nombres`) y `miqueas-profeta` vive allí. Jer 26:18 usa ese id. Cuando Jeremías cree el suceso de Jer 26:17-19, en que se recuerda Miq 3:12 y que Ezequías hizo caso, va en `menciona` del tramo Miqueas 3:9-12.
- **Ofel.** Perspicacia «Ofel» compara el «montículo» de Miq 4:8 con Ofel, y `jerusalen` no lo lleva en `nombres`. 2Cr 27:3 o Ne 3:26 lo añaden con una nota; entonces el tramo Miqueas 4:6-8 puede ponerlo en su `nota`.
- **La montaña de la Casa.** `monte-moria` lleva ese nombre (Miq 3:12, cuya nota dice «el monte del templo»).

## Para 1 y 2 Reyes (desde Miqueas)

- **Claves de Omrí y Acab.** `data/_propuestas/miqueas.json` pone a `omri` la clave `1200003324#3` y a `acab` la `1200000138#1`. Reyes no vuelve a proponerlas: un `cambiar` desde `null` chocaría.
- **Tierra de Nemrod.** Está en `nombres` de `asiria` (Miq 5:6). El tramo Miqueas 5:5-6 no lleva `persona:nemrod`: su nombre designa la tierra.

## Para Sofonías (desde Nahúm)

- **La caída de Nínive.** Nahúm la anuncia y no la narra, así que la pone en `menciona` de sus tramos, como Miqueas y Joel hacen con los sucesos que profetizan, y no toca sus `pasajes`, que siguen siendo «Na 3:1-7» y «Sof 2:13». Sofonías hace lo mismo con Sof 2:13-15. `data/_propuestas/nahum.json` le añade `nabopolasar`, `ciaxares` y `rio-tigris`.
- **Fuente compartida.** `w07-nahum-habacuc-y-sofonias` (La Atalaya del 15 de noviembre de 2007) ya existe en `data/fuentes/cobertura-nahum.yaml`: Habacuc ya lo usa y Sofonías usa ese id.

## Para 2 Reyes, 2 Crónicas y Esdras (desde Nahúm)

- **Asurbanipal y Asnapar.** `asurbanipal` (clave `1200000430`) existe desde Na 3:8-10. Esa clave es a propósito la entrada «Asurbanipal» de Perspicacia, que solo remite a «Asnapar»: así la del artículo, `1200000404`, queda libre para `asnapar`. Perspicacia «Asnapar» solo ve muy probable que sea el Asnapar de Esd 4:10, así que Esdras crea `asnapar` (`1200000404`) con `mismo_que` `asurbanipal`, `deducido: true` y `estado: pendiente`.
- **Esar-Hadón.** No tiene ficha. Quien la cree (2Re 19:37; Esd 4:2) añade a `asurbanipal` la relación `pariente` `esar-hadon` (padre), con Perspicacia «Asnapar», párr. 2. `asurbanipal` ya lleva `senaquerib` como abuelo, deducido.
- **Nabopolasar y Ciaxares.** `nabopolasar` y `ciaxares` existen, con `perspicacia: null` porque Perspicacia no les dedica artículo. `data/_propuestas/nahum.json` pone a `nabucodonosor-ii` las relaciones `pariente` `nabopolasar` (padre) y `sucede_a` `nabopolasar`, y añade `nabopolasar` a `nabopolasar-funda-dinastia`. 2 Reyes, Jeremías y Daniel reutilizan esos ids.

## Para Isaías, Jeremías y Ezequiel (desde Nahúm)

- **No-Amón.** `no-amon` existe (Tebas, OpenBible a9674fc), con No y Tebas en `nombres`: Jer 46:25 y Ez 30:14-16 usan ese id.
- **Put como tierra.** `put` existe también como lugar (el pueblo y su tierra; la persona `put` es el hijo de Cam), con precisión incierta en el punto de Libia y un `no_afirmamos` porque Na 3:9 separa Put de los libios. Is 66:19, Jer 46:9 y Ez 27:10, 30:5 y 38:5 usan `lugar:put`, sin `persona:put`.
- **Elqós.** `elqos` existe sin punto (Beit Jibrin favorecido; Galilea como alternativa, en el punto de El Kauzeh de OpenBible). La TNM solo da el gentilicio «elcosita»; Elqós es la única grafía del lugar en jw.org.

## Para Josué y Jueces (desde Habacuc)

- **Sucesos que recuerda Habacuc 3.** La Atalaya del 1 de febrero de 2000 (`w00-gozosos-en-dios`) une la oración a la toma de Jericó (Jos 6), al sol que se detiene sobre Gabaón (Jos 10:12-14, la referencia de Hab 3:11) y a la crecida del Cisón contra Sísara (Jue 5:21). Cuando existan, Jericó va en `menciona` del tramo Habacuc 3:1-2 y los otros dos en el de Habacuc 3:8-11, sin añadir Hab 3 a sus `pasajes`, como ya se hizo con `israel-cruza-el-mar-rojo`, `entrada-en-canaan` e `israel-adora-al-baal-de-peor`.
- **Cusán no es Cusán-risataim.** `cusan` (Hab 3:7) es un lugar sin punto, quizá otro nombre de Madián o un país vecino (Perspicacia «Cusán»). El rey de Jue 3:8-10 es una persona aparte, con su propio artículo.

