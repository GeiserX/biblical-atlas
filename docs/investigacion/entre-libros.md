# Pendientes entre libros

Cosas que un libro deja decididas o a medias y que otro libro tiene que respetar o cerrar. El lector y el escritor de cada libro leen esta lista antes de empezar y quitan lo que cierran.

## Para 1 y 2 Samuel

- **David huye de Absalón.** Cuando 2 Samuel cree el suceso (2Sa 15:13-17:22), añade «Sl 3» a sus pasajes y ese suceso al tramo 1-8 de `data/cobertura/salmos.yaml`.
- **La cueva del Salmo 142.** El encabezamiento remite a 1Sa 22:1 (Adulam) y a 1Sa 24:3 (En-guedí), y Perspicacia «Cueva» no elige. 1 Samuel decide a cuál de los dos sucesos se añade «Sl 142».
- **Cus el benjaminita.** Existe (`cus-el-benjaminita`) desde el Salmo 7. Perspicacia duda entre la corte de Saúl y Simeí; si 1 o 2 Samuel lo aclara, se añade la relación.
- **Agag.** `agag-de-tiempos-de-balaam` es la entrada núm. 1 de Perspicacia «Agag». El de 1Sa 15 es la núm. 2: otro id y `no_confundir_con` en las dos.
- **Jesimón.** `jesimon` es el de Nú 21:20 y 23:28, junto al mar Muerto. El de 1Sa 23:19 y 26:1, cerca de Zif, es otro lugar.
- **Rehob.** `rehob` (Nú 13:21) no lleva Bet-Rehob en `nombres`, porque Perspicacia solo lo ve probable. 2Sa 10:6, 8 decide.

## Para Juan

- **El padre de Pedro.** La ficha es `jonas-padre-de-pedro`, con la clave `1200002503#2` («Jonás», núm. 2). Perspicacia lo trata también en «Juan», núm. 2 (`1200002489#2`); esa segunda clave no lo funde, así que Juan 1:42 y 21:15-17 usan ese id.
- **Natanael y Bartolomé.** Son dos fichas unidas por `mismo_que` pendiente, porque Perspicacia da la identidad como probable. Donde el texto dice Natanael (Jn 1 y 21) va `natanael`; en las listas de los once sin nombres (Jn 20:26-29, `aparicion-a-tomas`) va `bartolome`, como en los sinópticos. El lector de Juan lo confirma o lo corrige.
- **Anás.** `anas` no tiene clave `perspicacia`. Marcos no lo nombra, así que se la pone el lector de Juan 18 (Perspicacia «Anás»).
- **El orden del 16 de nisán (Lucas no lo cerró).** Lucas 24 lo fijó en la serie `a7`: `resurreccion-de-jesus` 124, `aparicion-a-las-mujeres` 125, `aparicion-a-maria-magdalena` 126, `aparicion-a-pedro` 127, `camino-de-emaus` 128 y `aparicion-a-los-discipulos-sin-tomas` 129. `aparicion-a-tomas`, `aparicion-junto-al-mar-de-galilea` y `mandato-de-hacer-discipulos` pasan a 130 y `ascension-de-jesus` a 131. Juan añade sus pasajes y no cambia esos `orden`.
- **Claves que ya puso Lucas.** `lazaro` lleva `1200002698#1` (Lu 16) y `marta` `1200002917` (Lu 10). Juan 11 y 12 no vuelven a proponer esas claves: un `cambiar` desde `null` chocaría.
- **Escenas del templo.** Un suceso que pasa entero en el templo lleva `monte-moria` primero y `jerusalen` después, como `cuestionan-su-autoridad` y, desde Lucas, los de Lu 1:8-23, 2:22-38 y 2:41-50. Si recorre también la ciudad, `jerusalen` va primero. `primera-limpieza-del-templo` (Jn 2:13-25) solo lleva `jerusalen`: Juan decide si le añade `monte-moria`.

## Para 2 Reyes y 2 Crónicas

- **Jehoiadá y Baraquías.** Cuando se cree a Jehoiadá, falta un `mismo_que` entre `baraquias` y su id, con `deducido: true` y `estado: pendiente` (Perspicacia «Baraquías»: Jehoiadá pudo tener dos nombres; Mt 23:35).
- **Zacarías, hijo de Jehoiadá.** Su muerte (2Cr 24:20-22) va en `monte-moria`, el patio del templo, como la puso Mateo. Si Crónicas prefiere `jerusalen`, que se acuerde una sola relación `murio_en`. Su parentesco con Jehoás también es de Crónicas.

## Para Esdras, Hageo y 1 Crónicas

- **Zorobabel.** Su relación con David es `antepasado` (antes decía «descendiente de David», al revés). Abiud va como antepasado suyo, no como hijo, porque Perspicacia «Abiud» lo deja abierto.
- **Resá, Sealtiel y Nerí.** `resa` (Lu 3:27) va como descendiente de Zorobabel, con la relación `antepasado`, igual que Abiud. `sealtiel` lleva a `neri` como pariente sin grado, porque Perspicacia solo ve posible que fuera su yerno.
- **Janai el gadita (1Cr 5:12).** Perspicacia «Janai» (`1200002318`) no es el Janaí de Lu 3:24, que ya existe como `janai-hijo-de-jose` (`1200002320`) con la fuente `it-janai-hijo-de-jose`. El gadita puede llevar `janai`, que queda libre; su propuesta añade `no_confundir_con` en las dos fichas.

## Para Deuteronomio

- **Pasajes paralelos ya puestos en sucesos de Éxodo.** Dt 5:4-27 en `diez-mandamientos`; Dt 9:9 en `primeros-cuarenta-dias-de-moises-en-el-sinai`; Dt 9:10, 11 en `dios-da-a-moises-las-tablas-del-testimonio`; Dt 9:12-14, 19, 26-29 en `moises-ruega-por-el-pueblo`; Dt 9:15-17, 21 en `moises-rompe-las-tablas`; Dt 9:16 en `becerro-de-oro`; Dt 9:20 en `moises-pide-perdon-por-el-pueblo`; Dt 9:18, 25 y Dt 10:1-5, 10 en `moises-recibe-las-segundas-tablas`, porque los 40 días postrado de Dt 9:18 y 9:25 son los segundos (Éx 34:28). Cada uno va en el tramo de su capítulo.
- **Masá.** Dt 6:16, 9:22 y 33:8 hablan del sitio de Refidim: `masa`.
- **Sucesos de Números con pasaje de Deuteronomio ya puesto.** Dt 1:22, 23 en `moises-envia-a-los-doce-espias`; Dt 1:24, 25 en `los-espias-recorren-canaan`; Dt 1:26-33 en `israel-se-niega-a-entrar-en-canaan`; Dt 1:34-40 en `jehova-condena-a-israel-a-40-anos-en-el-desierto`; Dt 1:41-46 en `israel-es-derrotado-hasta-horma`; Dt 2:26-36 en `israel-vence-a-sehon`; Dt 3:1-7 en `israel-vence-a-og`; Dt 3:12-20 en `moises-da-a-gad-y-ruben-la-tierra-al-este-del-jordan`; Dt 3:14 en `jair-toma-havot-jair`; Dt 3:15 en `los-hijos-de-makir-toman-galaad`; Dt 9:22 en `fuego-de-jehova-en-tabera` y `el-pueblo-pide-carne`; Dt 10:6 en `muerte-de-aaron`; Dt 11:6 en `la-tierra-se-traga-a-datan-y-abiram`; Dt 24:9 en `miriam-y-aaron-hablan-contra-moises`. Cada uno va en el tramo de su capítulo.
- **Pasajes que aún no están en ningún suceso.** Dt 4:3 va a `israel-adora-al-baal-de-peor`; Dt 4:41-43 nombra ciudades de refugio (la ley es `jehova-da-la-ley-de-las-ciudades-de-refugio`); Dt 31:7, 8, 14, 23 decide si es un suceso propio o un pasaje más de `moises-nombra-a-josue-su-sucesor` (Nú 27:12-23).
- **Orden de 1473 a.e.c.** Desde la victoria sobre Og, los sucesos de Números llevan c. 1473 y la serie `numeros` (21021 a 36001). `muerte-de-moises` y `entrada-en-canaan`, del mismo año, no tienen `orden_relato`, y `build.py` pone la serie vacía antes que `numeros`: la muerte de Moisés sale antes que Sehón. Deuteronomio les da un orden que los ponga detrás; `tras` solo no basta.
- **Lugares de Números.** Tabera, Quibrot-Hataavá, Hazerot, Pisgá, Peor, Ezión-Guéber (Dt 2:8) y las llanuras de Moab ya existen: `tabera`, `quibrot-hataava`, `hazerot`, `pisga`, `peor`, `ezion-gueber`, `llanuras-deserticas-de-moab`. Moserá, Beerot Bene-Jaacán y Gudgodá (Dt 10:6, 7) son `moserot`, `bene-jaacan` y `hor-haguidgad`. `monte-nebo` ya no lleva Pisgá en `nombres`: Dt 3:27 y 34:1 citan las dos fichas.

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

- **Janes y Jambres.** Los magos del faraón (Éx 7:11, 22) no tienen ficha. Si 2Ti 3:8 los crea, el tramo 7:8-13 de Éxodo los puede poner en `menciona`.

## Para Jeremías y Ezequiel

- **Migdol.** `migdol` es el lugar de Éx 14:2 y Nú 33:7. La ciudad egipcia de Jer 44:1 y Ez 29:10 es la entrada núm. 2 de Perspicacia «Migdol» y lleva otro id.

## Para 1 Samuel

- **Abiatar y su padre.** `abiatar` ya existe (clave `1200000030`), creado desde Mr 2:26. Le falta la relación `pariente` con su padre Ahimélec, en la ficha de Abiatar (1Sa 22:20; Perspicacia «Abiatar»). Si la propuesta del Salmo 52 ya creó `ahimelec-hijo-de-ahitub`, se reutiliza ese id.
- **Nob.** La nota de estudio de Mr 2:26 pone allí la casa de Dios donde David comió los panes. Ni Mateo 12 ni Marcos 2 nombran Nob, así que no tiene ficha: la crea 1 Samuel 21.

## Para Juan

- **El orden del 16 de nisán (Lucas no lo cerró).** `compran-especias`, `aparicion-a-las-mujeres`, `aparicion-a-pedro`, `camino-de-emaus`, `aparicion-a-maria-magdalena` y `aparicion-a-los-discipulos-sin-tomas` llevan fecha 16 de nisán del 33 sin `orden_relato`, y `resurreccion-de-jesus` lleva `a7`/124. `build.py` ordena por año, luego por serie y orden, luego por id, y no mira `detalle`: todo suceso del 33 sin serie sale antes que los de `a7`, así que las apariciones quedan antes de la resurrección en `data.json`. Cada aparición necesita `orden_relato` en la serie `a7` con un orden entre el de `resurreccion-de-jesus` (124) y el de `aparicion-a-tomas` (125); `tras` solo no basta, porque `orden_en_serie` no lo lee. `compran-especias` ya va bien antes.

## Para Romanos

- **Rufo.** `rufo-hijo-de-simon` (clave `1200003769#1`, Mr 15:21) ya existe. El Rufo de Ro 16:13 es la entrada núm. 2 de Perspicacia «Rufo» (`1200003769#2`): va en ficha aparte, con `no_confundir_con` en las dos.

## Para Hechos, 1 Timoteo y 2 Timoteo

- **Alejandro.** `alejandro-hijo-de-simon` (clave `1200000192#2`, Mr 15:21) ya existe. Los Alejandros de Hch 4:6, Hch 19:33, 1Ti 1:20 y 2Ti 4:14 son otras entradas de Perspicacia «Alejandro»: cada uno lleva `no_confundir_con` hacia él, y él hacia cada uno.

## Para 2 Samuel y 1 Crónicas

- **Natán, hijo de David.** `natan-hijo-de-david` (clave `1200003184#4`) existe desde Lu 3:31. 2Sa 5:14, 1Cr 3:5 y 1Cr 14:4 usan ese id; `natan-profeta` sigue sin clave.
- **Abías, el de la división sacerdotal.** `abias-de-tiempos-de-david` (clave `1200000041#4`) existe desde Lu 1:5. 1Cr 24:10 usa ese id y añade su pasaje.
- **Cainán y Selá.** `sela-hijo-de-arpaksad` lleva dos padres: Arpaksad (Gé 11:12) y, con `estado: pendiente`, `cainan-hijo-de-arpaksad` (Lu 3:36), que falta en el texto hebreo. 1Cr 1:18 no cambia ninguno de los dos.

## Para 1 y 2 Reyes

- **Sarepta (1Re 17).** `sarepta` existe desde Lu 4:26. Faltan la relación `elias-profeta` `vivio_en` `sarepta` (1Re 17:9, 10) y el suceso de la viuda; cuando exista, va en `menciona` del tramo Lucas 4:23-27.
- **La reina de Saba (1Re 10).** Lu 11:31 y Mt 12:42 la llaman reina del sur. El lugar `saba` es el de Job 6:19. El reino de Saba (Perspicacia «Seba», núm. 6) ya existe como `reino-de-saba`, desde Sl 72 y Joe 3:8: 1 Reyes lo usa y lo añade a `menciona` de los tramos Lucas 11:29-36 y Mateo 12:38-42.
- **Obras y riqueza de Salomón.** Ec 2:4-9 cuenta sus casas, viñas, estanques, siervos, oro y cantores, que narran 1Re 7:1-8, 9:17-19 y 10:14-29. Cuando 1 Reyes cree esos sucesos, añade «Ec 2:4-9» a sus `pasajes` y el suceso al tramo 1-11 de `data/cobertura/eclesiastes.yaml`. El único que ya existe, `flota-de-salomon-a-ofir`, lleva Ec 2:8 desde Eclesiastés.

## Para 2 Reyes

- **Naamán el sirio (2Re 5).** `naaman-el-sirio` (clave `1200003149#2`) existe desde Lu 4:27. Falta el suceso de su curación; cuando exista, va en `menciona` del tramo Lucas 4:23-27.
- **Fronteras (también para Ezequiel).** 1Re 8:65 usa `lebo-hamat` y `torrente-de-egipto`; 1Re 9:26, `ezion-gueber`; Ez 47 y 48, `zedad`, `hazar-enan` (Hazar-Enón está en `nombres`) y `lebo-hamat`.
- **La serpiente de cobre.** 2Re 18:4 (Nehustán) y Jn 3:14 remiten a `moises-hace-la-serpiente-de-cobre`.

## Para Hechos

- **Ids que ya existen.** `teofilo` (Lu 1:3; Hch 1:1), `santiago-padre-de-tadeo` (clave `1200002313#1`, Lu 6:16; Hch 1:13) y `quirinio` (Lu 2:2), si Hch 5:37 lo nombra por el censo.

## Para Nehemías

- **Itiel.** `itiel-oyente-de-agur` (clave `1200002237#1`, Pr 30:1) ya existe. El benjamita de Ne 11:7 es la entrada núm. 2 de Perspicacia «Itiel» (`1200002237#2`): va en ficha aparte, con `no_confundir_con` en las dos.

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

- **Guilgal.** Am 4:4 y 5:5 ya usan `guilgal-cerca-de-betel`, y su `no_afirmamos` deja la misma duda que para Oseas. La Guilgal junto a Jericó (Perspicacia «Guilgal», núm. 1) no tiene ficha: la crea Josué con otro id, y las dos llevan `no_confundir_con`.
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
- **Alusiones al éxodo.** Los versículos que Perspicacia da como alusión a la salida de Egipto (Os 2:15; 11:1; 12:13) van en `pasajes` de `exodo` y en `entidades`. La fórmula «tu Dios desde la tierra de Egipto» (Os 12:9; 13:4) va solo en `menciona`. Amós añade un caso: los versículos que afirman con sus palabras que Jehová sacó a Israel de Egipto (Am 2:10; 3:1; 9:7) van en `pasajes`, aunque Perspicacia no los cite. Miqueas puede hacer lo mismo.
- **La fecha del libro.** `data/libros.yaml` toma sus fechas solo de la tabla de libros (`tnm-tabla`), que pone Oseas «después de 745». Perspicacia «Oseas, Libro de» lo cierra entre 745 y 740: ese límite va en la `razon` de los sucesos, no en `libros.yaml`.

## Para Hechos y Romanos (desde Joel)

- **Joel 2:28-32 en Pentecostés.** El tramo Joel 2:28-32 lleva `pentecostes-33` en `menciona`, y Joe 2 no está en sus `pasajes`. Hch 2:16 nombra al profeta: `joel-profeta` (clave `1200002481#9`) va en `menciona` de ese tramo de Hechos. Ro 10:13 aplica Joe 2:32.

## Para los demás profetas (desde Joel)

- **Un suceso por libro.** Amós lo siguió con `amos-profetiza-contra-israel` (Am 1:1-9:15), y su escena con Amasías en Betel es un suceso aparte. Joel lleva uno solo, `joel-anuncia-el-dia-de-jehova` (Joe 1:1-3:21), anclado en c. 820 a.e.c. (?) y con `presentes: []`, como Oseas 4-14.
- **Las langostas de Joel 1 y 2.** Manda La Atalaya de abril de 2020 (`w20-ataque-del-norte`): son el ejército babilonio que tomó Jerusalén en 607 a.e.c., y no son las langostas de Ap 9. Los tramos Joel 1:2-4, 1:5-12, 2:1-11 y 2:18-27 llevan `destruccion-de-jerusalen-607` en `menciona`.
- **Grecia.** `grecia` existe desde Joe 3:6 (OpenBible a4492a0, con Javán en `nombres`). Is 66:19, Ez 27:13, Da 8:21, 10:20, 11:2, Zac 9:13 y Hch 20:2 usan ese id cuando hablan de la tierra.
- **El valle de Jehosafat y el de la Decisión** (Joe 3:2, 12, 14) no llevan ficha: Perspicacia «Jehosafat, Llanura baja de» y La Atalaya de 2007 los llaman lugar simbólico.

## Para Números, Josué y Miqueas (desde Joel)

- **Sitim.** La Sitim del campamento en las llanuras de Moab (Miq 6:5; Jos 2:1; Nú 33:49; 25:1) es Perspicacia «Sitim», núm. 1, y lleva otro id. `valle-de-las-acacias` es el núm. 2 (Joe 3:18), con «Sitim» en `nombres`, sin punto propio y con un candidato en el curso bajo del Cedrón. Cuando exista la ficha del núm. 1, las dos llevan `no_confundir_con`.

## Para 2 Crónicas, Ezequiel y Zacarías (desde Joel)

- **Ríos que salen del templo.** La adoración pura, recuadro 19A (`rr-rios-de-bendiciones`), lee el manantial de Joe 3:18, el río de Ez 47 y las aguas de Zac 14:8 como figura de las bendiciones de Jehová. Ezequiel y Zacarías pueden citar esa fuente.
- **Sucesos que Joel 3 recuerda.** La victoria de Jehová en días de Jehosafat (2Cr 20) va en `menciona` del tramo Joel 3:1-3. El saqueo de filisteos y árabes (2Cr 21:16, 17) va en el tramo Joel 3:4-6. La caída de Tiro ante Nabucodonosor, y la de la isla ante Alejandro, en el tramo Joel 3:7-8.

## Para Deuteronomio y 2 Reyes (desde Joel)

- **Mar Salado.** Joel añade «Mar oriental» (Joe 2:20) a `nombres` de `mar-salado`. Falta «mar del Arabá» (Dt 4:49; 2Re 14:25; Perspicacia «Mar Salado»).

## Para Josué

- **Pasaje ya puesto.** Jos 13:21, 22 está en `israel-se-venga-de-madian`: va en el tramo de Josué 13.
- **Ids que ya existen.** `sitim` (Jos 2:1; 3:1), `zur-rey-de-madian`, `evi`, `requem-rey-de-madian`, `hur-rey-de-madian`, `reba` y `balaam` (Jos 13:21, 22), `peor` (Jos 22:17), las hijas de Zelofehad y los hijos de Galaad (Jos 17:1-6), y los lugares de la frontera sur de Nú 34 (`subida-de-acrabim`, `hazar-addar`, `azmon`, `torrente-de-egipto`, `desierto-de-zin`) para Jos 15:1-4.
- **Reyes de Madián y Balaam sin lugar.** `evi`, `requem-rey-de-madian`, `zur-rey-de-madian`, `hur-rey-de-madian`, `reba` y `balaam` no llevan `vivio_en` ni `murio_en`: el punto de `madian` está al este de ʽAqaba y ellos vivían junto a Moab y Sehón. Si Josué 13 crea el territorio de Rubén o el reino de Sehón (Jos 13:21), les añade esas relaciones.
- **Anac.** No tiene ficha: Perspicacia «Anaq» lo trata sobre todo como el nombre del pueblo. Jos 15:13 lo llama hijo de Arbá, así que Josué decide. `ahiman-hijo-de-anac`, `sesai` y `talmai-hijo-de-anac` ya existen.
- **Sumo sacerdocio de Eleazar.** Existe `sumo-sacerdocio-de-aaron` (1512-1474 a.e.c.). El de Eleazar empieza en `muerte-de-aaron`; no se creó porque Perspicacia no fecha su muerte (Jos 24:33).
- **Territorios de Gad y Rubén.** Nú 32 los reparte como tribus y no creó lugares `gad` ni `ruben`; si Josué 13 los necesita, los crea como `juda` o `manases`.
- **Ciudades de refugio y de los levitas (Jos 20 y 21).** La ley está en `jehova-manda-dar-ciudades-a-los-levitas` y `jehova-da-la-ley-de-las-ciudades-de-refugio` (Nú 35).

## Para Jueces

- **Pasajes ya puestos.** Jue 11:17 en `edom-niega-el-paso-a-israel` y Jue 11:19-22 en `israel-vence-a-sehon`.
- **Hobab.** `hobab` lleva a Moisés como cuñado (deducido, Perspicacia «Hobab») y a `jetro` como padre. Jue 4:11 lo llama suegro de Moisés: Jueces lo relee sin cambiar a quién es el suegro.
- **Hormá y la subida de Acrabim.** Jue 1:17 usa `horma` (Zefat ya está en `nombres`) y Jue 1:36, `subida-de-acrabim`. La Beer de Jue 9:21 es la entrada núm. 2 de Perspicacia y lleva otro id que `beer`.
- **Abí-ézer y Jaír.** Jue 6 reutiliza `abi-ezer-hijo-de-galaad`. El juez Jaír (Jue 10:3) es otro que `jair-hijo-de-segub`: `no_confundir_con` en las dos fichas.
- **Pua (también para 1 Crónicas).** La TNM escribe Pua para tres personas (Perspicacia «Puá»): `puva`, el hijo de Isacar, así llamado en 1Cr 7:1; `pua-partera`, de Éx 1:15; y el padre del juez Tolá (Jue 10:1), núm. 3, que aún no tiene ficha y, como hijo de Dodó, lleva `pua-hijo-de-dodo`.

## Para Isaías, Jeremías y Nehemías

- **Ciudades de Moab que ya existen.** `dibon`, `nebo` (la ciudad, no `monte-nebo`), `quiryataim`, `baal-meon`, `aroer`, `jahaz`, `hesbon`, `eleale`, `sibma`, `jazer`, `medeba`, `ar` y `arnon`. Perspicacia solo da como probable que Bet-Diblataim (Jer 48:22) sea `almon-diblataim`.
- **Dibón de Judá.** El Dibón de Ne 11:25 es la entrada núm. 2 de Perspicacia y lleva otro id que `dibon`.
- **Edrei de Neftalí.** El de Jos 19:37 es la entrada núm. 2: otro id que `edrei`.

## Para Ester

- **Abiháil.** `abihail-padre-de-zuriel` es la entrada núm. 1 de Perspicacia. El padre de Ester es la núm. 5: otro id y `no_confundir_con` en las dos.
- **Jaír.** `jair-hijo-de-segub` es la entrada núm. 1 de Perspicacia «Jaír». El padre de Mardoqueo (Est 2:5) es la núm. 3: otro id y `no_confundir_con` en las dos.

## Para las Escrituras Griegas

- **Pasaje ya puesto.** Jud 11 está en `muerte-de-core`.
- **Pasajes que aún no están en ningún suceso.** Hch 7:36 y 13:18, 1Co 10:5, 10, Heb 3:16-19 y Jud 5 van a `jehova-condena-a-israel-a-40-anos-en-el-desierto`; 1Co 10:8, Ap 2:14 y Os 9:10 a `israel-adora-al-baal-de-peor`; 2Pe 2:15, 16 a `la-burra-de-balaam-habla`; Heb 9:4 nombra la vara de `la-vara-de-aaron-echa-brotes`. Miq 6:5 nombra `balac`, `balaam` y `sitim`.

## Para 1 Reyes, 2 Reyes, 1 Crónicas y 2 Crónicas (desde Amós)

- **Hazael y los Ben-Hadad.** `hazael` (`1200001923`) y `ben-hadad-hijo-de-hazael` (`1200000636#3`) existen desde Am 1:4. Reyes crea Ben-Hadad I y II (núm. 1 y 2) con `no_confundir_con` en las tres fichas, y añade `hazael` `sucede_a` Ben-Hadad II (2Re 8:15). La unción de 1Re 19:15 también es de Reyes.
- **Damasco y Quir.** Cuando Reyes cree la toma de Damasco por Tiglat-piléser III y el destierro a Quir (2Re 16:9), el suceso va en `menciona` de los tramos Amós 1:3-5 y 9:7-10. Los de Hazael contra Galaad (2Re 10:32, 33) van a Amós 1:3-5.
- **Amasías.** Amós deja en `data/_propuestas/amos.json` la clave de `amasias`, el rey de Judá (`1200000224#2`), y su `desambiguacion`, como la de `amos-profeta` (`1200000246#1`); el sacerdote de Betel es `amasias-sacerdote-de-betel` (`#3`). Reyes y Crónicas no vuelven a proponerlas.
- **Jeroboán II.** `data/_propuestas/amos.json` corrige su `resumen`: «desde Lebó-Hamat» (2Re 14:25), no «desde Hamat». Un cambio posterior parte de ese texto. `hamat` y `lebo-hamat` son dos fichas: 2Re 14:28 usa `hamat`.
- **Samaria.** Lleva «Montaña de Samaria» en `nombres` (Am 4:1; 6:1): el monte que Omrí compra en 1Re 16:24.
- **El terremoto.** `terremoto-en-dias-de-uzias` (Am 1:1; Zac 14:5) es de Amós. Si Crónicas lo nombra al hablar de Uzías, añade su pasaje.

## Para Josué, Jueces, 1 Samuel, 2 Samuel y Jeremías (desde Amós)

- **Ciudades filisteas.** `asquelon` y `ecron` existen desde Am 1:8 (Perspicacia escribe Eqrón, que va en `nombres`). Gaza, Asdod y Gat ya existían.
- **Rabá.** `raba` es la capital ammonita (Perspicacia «Rabá», núm. 1), la de Dt 3:11 y Am 1:14: 2Sa 11-12, 1Cr 20, Jer 49:2, 3 y Ez 21:20 y 25:5 usan ese id. La Rabá de Judá (núm. 2) lleva otro.
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
