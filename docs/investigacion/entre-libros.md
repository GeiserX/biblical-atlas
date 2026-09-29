# Pendientes entre libros

Cosas que un libro deja decididas o a medias y que otro libro tiene que respetar o cerrar. El lector y el escritor de cada libro leen esta lista antes de empezar y quitan lo que cierran.

## Para Juan

- **El padre de Pedro.** La ficha es `jonas-padre-de-pedro`, con la clave `1200002503#2` («Jonás», núm. 2). Perspicacia lo trata también en «Juan», núm. 2 (`1200002489#2`); esa segunda clave no lo funde, así que Juan 1:42 y 21:15-17 usan ese id.
- **Natanael y Bartolomé.** Son dos fichas unidas por `mismo_que` pendiente, porque Perspicacia da la identidad como probable. Donde el texto dice Natanael (Jn 1 y 21) va `natanael`; en las listas de los once sin nombres (Jn 20:26-29, `aparicion-a-tomas`) va `bartolome`, como en los sinópticos. El lector de Juan lo confirma o lo corrige.
- **Anás.** `anas` no tiene clave `perspicacia`. Marcos no lo nombra, así que se la pone el lector de Juan 18 (Perspicacia «Anás»).
- **El orden del 16 de nisán.** Lucas 24 lo fijó en la serie `a7`: `resurreccion-de-jesus` 124, `aparicion-a-las-mujeres` 125, `aparicion-a-maria-magdalena` 126, `aparicion-a-pedro` 127, `camino-de-emaus` 128 y `aparicion-a-los-discipulos-sin-tomas` 129. `aparicion-a-tomas`, `aparicion-junto-al-mar-de-galilea` y `mandato-de-hacer-discipulos` pasan a 130 y `ascension-de-jesus` a 131. Juan añade sus pasajes y no cambia esos `orden`.
- **Claves que ya puso Lucas.** `lazaro` lleva `1200002698#1` (Lu 16) y `marta` `1200002917` (Lu 10). Juan 11 y 12 no vuelven a proponer esas claves: un `cambiar` desde `null` chocaría.
- **Escenas del templo.** Un suceso que pasa entero en el templo lleva `monte-moria` primero y `jerusalen` después, como `cuestionan-su-autoridad` y, desde Lucas, los de Lu 1:8-23, 2:22-38 y 2:41-50. Si recorre también la ciudad, `jerusalen` va primero. `primera-limpieza-del-templo` (Jn 2:13-25) solo lleva `jerusalen`: Juan decide si le añade `monte-moria`.

## Para 2 Reyes y 2 Crónicas

- **Jehoiadá y Baraquías.** Cuando se cree a Jehoiadá, falta un `mismo_que` entre `baraquias` y su id, con `deducido: true` y `estado: pendiente` (Perspicacia «Baraquías»: Jehoiadá pudo tener dos nombres; Mt 23:35).
- **Zacarías, hijo de Jehoiadá.** Su muerte (2Cr 24:20-22) va en `monte-moria`, el patio del templo, como la puso Mateo. Si Crónicas prefiere `jerusalen`, que se acuerde una sola relación `murio_en`. Su parentesco con Jehoás también es de Crónicas.

## Para Esdras, Hageo y 1 Crónicas

- **Zorobabel.** Su relación con David es `antepasado` (antes decía «descendiente de David», al revés). Abiud va como antepasado suyo, no como hijo, porque Perspicacia «Abiud» lo deja abierto.
- **Resá, Sealtiel y Nerí.** `resa` (Lu 3:27) va como descendiente de Zorobabel, con la relación `antepasado`, igual que Abiud. `sealtiel` lleva a `neri` como pariente sin grado, porque Perspicacia solo ve posible que fuera su yerno.
- **Janai el gadita (1Cr 5:12).** Perspicacia «Janai» (`1200002318`) no es el Janaí de Lu 3:24, que ya existe como `janai-hijo-de-jose` (`1200002320`) con la fuente `it-janai-hijo-de-jose`. El gadita puede llevar `janai`, que queda libre; su propuesta añade `no_confundir_con` en las dos fichas.

## Para 1 Samuel

- **Abiatar y su padre.** `abiatar` ya existe (clave `1200000030`), creado desde Mr 2:26. Le falta la relación `pariente` con su padre Ahimélec, en la ficha de Abiatar (1Sa 22:20; Perspicacia «Abiatar»). Si la propuesta del Salmo 52 ya creó `ahimelec-hijo-de-ahitub`, se reutiliza ese id.
- **Nob.** La nota de estudio de Mr 2:26 pone allí la casa de Dios donde David comió los panes. Ni Mateo 12 ni Marcos 2 nombran Nob, así que no tiene ficha: la crea 1 Samuel 21.

## Para Éxodo

- **La zarza que ardía (Éx 3).** Mt 22:32 y Mr 12:26 la citan, y la nota de Mr 12:26 la sitúa hacia 1514 a.e.c. Cuando Éxodo cree el evento, se añade a `menciona` de los tramos Mateo 22:23-33, Marcos 12:18-27 y Lucas 20:27-40, que hoy lo explican en su nota.

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
