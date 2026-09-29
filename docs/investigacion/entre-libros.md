# Pendientes entre libros

Cosas que un libro deja decididas o a medias y que otro libro tiene que respetar o cerrar. El lector y el escritor de cada libro leen esta lista antes de empezar y quitan lo que cierran.

## Para 1 y 2 Samuel

- **David huye de Absalón.** Cuando 2 Samuel cree el suceso (2Sa 15:13-17:22), añade «Sl 3» a sus pasajes y ese suceso al tramo 1-8 de `data/cobertura/salmos.yaml`.
- **La cueva del Salmo 142.** El encabezamiento remite a 1Sa 22:1 (Adulam) y a 1Sa 24:3 (En-guedí), y Perspicacia «Cueva» no elige. 1 Samuel decide a cuál de los dos sucesos se añade «Sl 142».
- **Cus el benjaminita.** Existe (`cus-el-benjaminita`) desde el Salmo 7. Perspicacia duda entre la corte de Saúl y Simeí; si 1 o 2 Samuel lo aclara, se añade la relación.

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

## Para Números

- **Jetró es Reuel.** Nú 10:29 lo llama Reuel: es `jetro` (clave `1200002454`), no `reuel-hijo-de-esau`.
- **Coré.** La rebelión y la muerte de `core-hijo-de-izhar` (Nú 16) las crea Números.
- **Masá y Meribá.** `masa` es el sitio de Refidim (Éx 17). La Meribá de Nú 20 es `meriba-de-cades`.
- **El tabernáculo.** Nú 7:1 está en los `pasajes` de `se-monta-el-tabernaculo`, y Nú 9:15, 16 en los de `la-gloria-de-jehova-llena-el-tabernaculo`: van en los tramos de esos capítulos.
- **Las etapas de Nú 33.** Los ids ya creados son `rameses`, `sucot-de-egipto`, `ezam`, `pihahirot`, `migdol`, `baal-zefon`, `cruce-del-mar-rojo`, `mara`, `elim`, `mar-rojo`, `desierto-de-sin`, `refidim` y `desierto-de-sinai`. Los sucesos son `exodo` (la salida), `israel-cruza-el-mar-rojo`, `jehova-endulza-el-agua-de-mara`, `israel-acampa-en-elim` y `codornices-y-mana-en-el-desierto-de-sin`.
- **El día de la salida.** Nú 33:3 dice que salieron de Ramesés el día 15. `exodo` se queda en el 14 de nisán: Perspicacia «Éxodo» pone el comienzo de la marcha hacia Sucot antes de que acabara el 14.
- **Nadab y Abihú.** Levítico creó `muerte-de-nadab-y-abihu` (Le 10:1-11, con la ley del vino que sigue a la muerte) y la relación `murio_en` `desierto-de-sinai` de los dos, con `deducido: true`. Nú 3:4 y 26:61 añaden su pasaje al suceso; Nú 3:4 nombra el desierto de Sinaí, así que `numeros-3` va también en esas dos relaciones.
- **Aarón y Eleazar.** A `eleazar-hijo-de-aaron` le falta la relación `sucede_a` `aaron` (Nú 20:25-28). No hay periodo del sumo sacerdocio de Aarón: si Números lo crea, empieza en `instalacion-del-sacerdocio` (Le 8, abib de 1512 a.e.c.) y acaba con su muerte en el monte Hor.
- **Las leyes de Levítico.** Sus sucesos llevan la serie `levitico` y la fecha abib (nisán) de 1512 a.e.c., todos con `aprox: true`; los de Le 8-10 llevan además el día en `fecha.detalle`. Nú 1:1 es el día 1 del mes segundo, así que los sucesos de Números van después.
- **Cohat.** El `resumen` de `core-hijo-de-izhar` escribe «Qohat», la grafía de Perspicacia; la TNM escribe Cohat (Éx 6:16). Lo corrige Números, con su `historial`, cuando lea Nú 16.

## Para Deuteronomio

- **Pasajes paralelos ya puestos en sucesos de Éxodo.** Dt 5:4-27 en `diez-mandamientos`; Dt 9:9 en `primeros-cuarenta-dias-de-moises-en-el-sinai`; Dt 9:10, 11 en `dios-da-a-moises-las-tablas-del-testimonio`; Dt 9:12-14, 19, 26-29 en `moises-ruega-por-el-pueblo`; Dt 9:15-17, 21 en `moises-rompe-las-tablas`; Dt 9:16 en `becerro-de-oro`; Dt 9:20 en `moises-pide-perdon-por-el-pueblo`; Dt 9:18, 25 y Dt 10:1-5, 10 en `moises-recibe-las-segundas-tablas`, porque los 40 días postrado de Dt 9:18 y 9:25 son los segundos (Éx 34:28). Cada uno va en el tramo de su capítulo.
- **Masá.** Dt 6:16, 9:22 y 33:8 hablan del sitio de Refidim: `masa`.

## Para Nehemías, Hechos y Hebreos

- **Pasajes paralelos ya puestos.** Ne 9:18 y Hch 7:40, 41 en `becerro-de-oro`. Hch 7:17-19 en `egipto-esclaviza-a-israel`; Hch 7:19 en `el-faraon-manda-echar-al-nilo-a-los-ninos`; Hch 7:20-22 y Heb 11:23 en `nacimiento-de-moises`; Hch 7:23, 24 y Heb 11:24-26 en `moises-mata-a-un-egipcio`; Hch 7:25-29 en `moises-huye-a-madian`; Hch 7:29 en `nacimiento-de-guersom`; Hch 7:30-35 en `moises-ante-la-zarza-ardiente`.

## Para 1 Crónicas

- **Nombres que Perspicacia solo da como probables.** Ladán (Libní), Aminadab hijo de Cohat (Izhar) y Ebiasaf (Abiasaf, que tiene artículo propio) llevan ficha aparte y un `mismo_que` con `deducido: true` y `estado: pendiente` hacia `libni-hijo-de-guerson`, `izhar-hijo-de-cohat` y `abiasaf`.
- **Nun.** Su padre Elisamá y su tribu, Efraín (1Cr 7:20-27), faltan en `nun`.
- **Hur.** `hur-hijo-de-caleb` (1Cr 2:19, 20) ya existe, con un `mismo_que` pendiente desde `hur-companero-de-moises`.
- **Nadab y Abihú.** 1Cr 24:2 añade su pasaje a `muerte-de-nadab-y-abihu`, el suceso que creó Levítico.

## Para 2 Timoteo

- **Janes y Jambres.** Los magos del faraón (Éx 7:11, 22) no tienen ficha. Si 2Ti 3:8 los crea, el tramo 7:8-13 de Éxodo los puede poner en `menciona`.

## Para Jueces y 1 Crónicas

- **Pua.** La TNM escribe Pua para tres personas (Perspicacia «Puá»): `puva`, el hijo de Isacar, así llamado en 1Cr 7:1; `pua-partera`, de Éx 1:15; y el padre del juez Tolá (Jue 10:1), núm. 3, que aún no tiene ficha y, como hijo de Dodó, lleva `pua-hijo-de-dodo`.

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

## Para 1 Reyes

- **Sarepta (1Re 17).** `sarepta` existe desde Lu 4:26. Faltan la relación `elias-profeta` `vivio_en` `sarepta` (1Re 17:9, 10) y el suceso de la viuda; cuando exista, va en `menciona` del tramo Lucas 4:23-27.
- **La reina de Saba (1Re 10).** Lu 11:31 y Mt 12:42 la llaman reina del sur. El lugar `saba` es el de Job 6:19. El reino de Saba (Perspicacia «Seba», núm. 6) ya existe como `reino-de-saba`, desde Sl 72 y Joe 3:8: 1 Reyes lo usa y lo añade a `menciona` de los tramos Lucas 11:29-36 y Mateo 12:38-42.
- **Obras y riqueza de Salomón.** Ec 2:4-9 cuenta sus casas, viñas, estanques, siervos, oro y cantores, que narran 1Re 7:1-8, 9:17-19 y 10:14-29. Cuando 1 Reyes cree esos sucesos, añade «Ec 2:4-9» a sus `pasajes` y el suceso al tramo 1-11 de `data/cobertura/eclesiastes.yaml`. El único que ya existe, `flota-de-salomon-a-ofir`, lleva Ec 2:8 desde Eclesiastés.

## Para 2 Reyes

- **Naamán el sirio (2Re 5).** `naaman-el-sirio` (clave `1200003149#2`) existe desde Lu 4:27. Falta el suceso de su curación; cuando exista, va en `menciona` del tramo Lucas 4:23-27.

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
- **El fin de la casa de Jehú.** Perspicacia «Jezreel», núm. 4, ve cumplido Os 1:4 cuando Salum mata a Zacarías (2Re 15:8-12). Cuando Reyes cree ese suceso, va en `menciona` del tramo Oseas 1:2-5. `nacimiento-de-jezreel-hijo-de-oseas` acaba en 791 a.e.c. por él.
- **Sucesos que Oseas nombra y aún no existen.** El tributo de Menahem a Pul (2Re 15:19, 20) y el trato de Hosea con So de Egipto (2Re 17:4; Perspicacia «Asiria» lo une a Os 7:11) van a `menciona` de los tramos Oseas 7:8-12 y 12:1-2. Los becerros de Jeroboán (1Re 12:28-30) van a Oseas 8:1-6, 10:5-8 y 13:1-3.
- **La caída de Samaria.** `caida-de-samaria` lleva `presentes: [salmanasar-v]`, pero Perspicacia «Salmanasar» dice que la Biblia no le atribuye la toma final (remite a «Sargón»). 2 Reyes 17 decide.
- **Guilgal cerca de Betel.** `guilgal-cerca-de-betel` (Perspicacia «Guilgal», núm. 2) es la de 2Re 2:1-5 y 4:38-41. Su `razon` cita esos capítulos, así que sus tramos la llevan al cerrarlos.
- **Salmán.** `salman` (Os 10:14) lleva un `mismo_que` pendiente hacia `salmanasar-v`: Perspicacia «Salmán» solo lo da como probable.

## Para Josué, Jueces y Amós (desde Oseas)

- **Guilgal.** Am 4:4 y 5:5 usan `guilgal-cerca-de-betel`, cuya `razon` los cita. La Guilgal junto a Jericó (Perspicacia «Guilgal», núm. 1) no tiene ficha: la crea Josué con otro id, y las dos llevan `no_confundir_con`.
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
- **«David su rey».** Os 3:5 lleva `persona:david` y `persona:jesus` en `menciona`: el nombre es el del rey histórico, y La Atalaya de 1991 lo aplica a Jesucristo, descendiente de David. Jer 30:9, Ez 34:23, 24 y 37:24, 25 siguen la misma regla.
- **Alusiones al éxodo.** Los versículos que Perspicacia da como alusión a la salida de Egipto (Os 2:15; 11:1; 12:13) van en `pasajes` de `exodo` y en `entidades`. La fórmula «tu Dios desde la tierra de Egipto» (Os 12:9; 13:4) va solo en `menciona`. Amós y Miqueas pueden seguir la misma regla.
- **La fecha del libro.** `data/libros.yaml` toma sus fechas solo de la tabla de libros (`tnm-tabla`), que pone Oseas «después de 745». Perspicacia «Oseas, Libro de» lo cierra entre 745 y 740: ese límite va en la `razon` de los sucesos, no en `libros.yaml`.

## Para Hechos, Romanos y Abdías (desde Joel)

- **Joel 2:28-32 en Pentecostés.** El tramo Joel 2:28-32 lleva `pentecostes-33` en `menciona`, y Joe 2 no está en sus `pasajes`. Hch 2:16 nombra al profeta: `joel-profeta` (clave `1200002481#9`) va en `menciona` de ese tramo de Hechos. Ro 10:13 aplica Joe 2:32.
- **Abd 17 y Joe 2:32.** Dicen casi lo mismo, y Perspicacia «Joel, Libro de» no decide quién citó a quién. Abdías lo apunta en su nota sin tocar Joel.

## Para Amós y los demás profetas (desde Joel)

- **Un suceso por libro.** Joel lleva uno solo, `joel-anuncia-el-dia-de-jehova` (Joe 1:1-3:21), anclado en c. 820 a.e.c. (?) y con `presentes: []`, como Oseas 4-14.
- **Las langostas de Joel 1 y 2.** Manda La Atalaya de abril de 2020 (`w20-ataque-del-norte`): son el ejército babilonio que tomó Jerusalén en 607 a.e.c., y no son las langostas de Ap 9. Los tramos Joel 1:2-4, 1:5-12, 2:1-11 y 2:18-27 llevan `destruccion-de-jerusalen-607` en `menciona`.
- **Am 1:2 y Joe 3:16.** Son casi iguales; «Toda Escritura» lo usa para fechar Joel antes que Amós.
- **Grecia.** `grecia` existe desde Joe 3:6 (OpenBible a4492a0, con Javán en `nombres`). Is 66:19, Ez 27:13, Da 8:21, 10:20, 11:2, Zac 9:13 y Hch 20:2 usan ese id cuando hablan de la tierra.
- **El valle de Jehosafat y el de la Decisión** (Joe 3:2, 12, 14) no llevan ficha: Perspicacia «Jehosafat, Llanura baja de» y La Atalaya de 2007 los llaman lugar simbólico.

## Para Números, Josué y Miqueas (desde Joel)

- **Sitim.** La Sitim del campamento en las llanuras de Moab (Miq 6:5; Jos 2:1; Nú 33:49; 25:1) es Perspicacia «Sitim», núm. 1, y lleva otro id. `valle-de-las-acacias` es el núm. 2 (Joe 3:18), con «Sitim» en `nombres`, sin punto propio y con un candidato en el curso bajo del Cedrón. Cuando exista la ficha del núm. 1, las dos llevan `no_confundir_con`.

## Para 2 Crónicas, Ezequiel y Zacarías (desde Joel)

- **Ríos que salen del templo.** La adoración pura, recuadro 19A (`rr-rios-de-bendiciones`), lee el manantial de Joe 3:18, el río de Ez 47 y las aguas de Zac 14:8 como figura de las bendiciones de Jehová. Ezequiel y Zacarías pueden citar esa fuente.
- **Sucesos que Joel 3 recuerda.** La victoria de Jehová en días de Jehosafat (2Cr 20) va en `menciona` del tramo Joel 3:1-3. El saqueo de filisteos y árabes (2Cr 21:16, 17) va en el tramo Joel 3:4-6. La caída de Tiro ante Nabucodonosor, y la de la isla ante Alejandro, en el tramo Joel 3:7-8.

## Para Deuteronomio y 2 Reyes (desde Joel)

- **Mar Salado.** Joel añade «Mar oriental» (Joe 2:20) a `nombres` de `mar-salado`. Falta «mar del Arabá» (Dt 4:49; 2Re 14:25; Perspicacia «Mar Salado»).
