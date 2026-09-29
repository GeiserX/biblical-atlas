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
- **La reina de Saba (1Re 10).** Lu 11:31 y Mt 12:42 la llaman reina del sur. El lugar `saba` es el de Job 6:19. Si 1 Reyes crea el reino de Saba (Perspicacia «Seba», núm. 6), se añade a `menciona` de los tramos Lucas 11:29-36 y Mateo 12:38-42.

## Para 2 Reyes

- **Naamán el sirio (2Re 5).** `naaman-el-sirio` (clave `1200003149#2`) existe desde Lu 4:27. Falta el suceso de su curación; cuando exista, va en `menciona` del tramo Lucas 4:23-27.

## Para Hechos

- **Ids que ya existen.** `teofilo` (Lu 1:3; Hch 1:1), `santiago-padre-de-tadeo` (clave `1200002313#1`, Lu 6:16; Hch 1:13) y `quirinio` (Lu 2:2), si Hch 5:37 lo nombra por el censo.

## Para Nehemías

- **Itiel.** `itiel-oyente-de-agur` (clave `1200002237#1`, Pr 30:1) ya existe. El benjamita de Ne 11:7 es la entrada núm. 2 de Perspicacia «Itiel» (`1200002237#2`): va en ficha aparte, con `no_confundir_con` en las dos.

## Para Eclesiastés, El Cantar de los Cantares y 1 Reyes

- **Salomón.** Proverbios deja en `data/_propuestas/proverbios.json` un cambio a su `resumen` y a su `razon` (compuso la mayor parte de Proverbios). Un cambio posterior a esos campos parte del texto que queda tras integrar Proverbios, no del de hoy.

## Para Josué

- **Pasaje ya puesto.** Jos 13:21, 22 está en `israel-se-venga-de-madian`: va en el tramo de Josué 13.
- **Ids que ya existen.** `sitim` (Jos 2:1; 3:1), `zur-rey-de-madian`, `evi`, `requem-rey-de-madian`, `hur-rey-de-madian`, `reba` y `balaam` (Jos 13:21, 22), `peor` (Jos 22:17), las hijas de Zelofehad y los hijos de Galaad (Jos 17:1-6), y los lugares de la frontera sur de Nú 34 (`subida-de-acrabim`, `hazar-addar`, `azmon`, `torrente-de-egipto`, `desierto-de-zin`) para Jos 15:1-4.
- **Anac.** No tiene ficha: Perspicacia «Anaq» lo trata sobre todo como el nombre del pueblo. Jos 15:13 lo llama hijo de Arbá, así que Josué decide. `ahiman-hijo-de-anac`, `sesai` y `talmai-hijo-de-anac` ya existen.
- **Sumo sacerdocio de Eleazar.** Existe `sumo-sacerdocio-de-aaron` (1512-1474 a.e.c.). El de Eleazar empieza en `muerte-de-aaron`; no se creó porque Perspicacia no fecha su muerte (Jos 24:33).
- **Territorios de Gad y Rubén.** Nú 32 los reparte como tribus y no creó lugares `gad` ni `ruben`; si Josué 13 los necesita, los crea como `juda` o `manases`.
- **Ciudades de refugio y de los levitas (Jos 20 y 21).** La ley está en `jehova-manda-dar-ciudades-a-los-levitas` y `jehova-da-la-ley-de-las-ciudades-de-refugio` (Nú 35).

## Para Jueces

- **Pasajes ya puestos.** Jue 11:17 en `edom-niega-el-paso-a-israel` y Jue 11:19-22 en `israel-vence-a-sehon`.
- **Hobab.** `hobab` lleva a Moisés como cuñado (deducido, Perspicacia «Hobab») y a `jetro` como padre. Jue 4:11 lo llama suegro de Moisés: Jueces lo relee sin cambiar a quién es el suegro.
- **Hormá y la subida de Acrabim.** Jue 1:17 usa `horma` (Zefat ya está en `nombres`) y Jue 1:36, `subida-de-acrabim`. La Beer de Jue 9:21 es la entrada núm. 2 de Perspicacia y lleva otro id que `beer`.
- **Abí-ézer y Jaír.** Jue 6 reutiliza `abi-ezer-hijo-de-galaad`. El juez Jaír (Jue 10:3) es otro que `jair-hijo-de-segub`: `no_confundir_con` en las dos fichas.

## Para 1 Samuel y 2 Samuel

- **Agag.** `agag-de-tiempos-de-balaam` es la entrada núm. 1 de Perspicacia «Agag». El de 1Sa 15 es la núm. 2: otro id y `no_confundir_con` en las dos.
- **Jesimón.** `jesimon` es el de Nú 21:20 y 23:28, junto al mar Muerto. El de 1Sa 23:19 y 26:1, cerca de Zif, es otro lugar.
- **Rehob.** `rehob` (Nú 13:21) no lleva Bet-Rehob en `nombres`, porque Perspicacia solo lo ve probable. 2Sa 10:6, 8 decide.

## Para 1 Reyes, 2 Reyes y Ezequiel

- **Fronteras.** 1Re 8:65 usa `lebo-hamat` y `torrente-de-egipto`; 1Re 9:26, `ezion-gueber`; Ez 47 y 48, `zedad`, `hazar-enan` (Hazar-Enón está en `nombres`) y `lebo-hamat`.
- **La serpiente de cobre.** 2Re 18:4 (Nehustán) y Jn 3:14 remiten a `moises-hace-la-serpiente-de-cobre`.

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
