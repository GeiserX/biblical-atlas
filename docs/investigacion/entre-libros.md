# Pendientes entre libros

Cosas que un libro deja decididas o a medias y que otro libro tiene que respetar o cerrar. El lector y el escritor de cada libro leen esta lista antes de empezar y quitan lo que cierran.

## Para Génesis

- **Elifaz.** Cuando se cree a Elifaz, primogénito de Esaú (Gé 36), va `no_confundir_con` en su ficha y en `elifaz-el-temanita`. Perspicacia dice que el temanita de Job quizá descendía de él.
- **Súah.** Ya existe (`suah`, clave `1200004088`), creado desde Job 2. Gé 25:2 lo nombra; se reutiliza.
- **Satanás.** Ya existe (`satanas`). Gé 3 no lo nombra, pero Perspicacia lo identifica con la serpiente; si Génesis lo enlaza, se añade a la ficha existente.

## Para Juan

- **El padre de Pedro.** La ficha es `jonas-padre-de-pedro`, con la clave `1200002503#2` («Jonás», núm. 2). Perspicacia lo trata también en «Juan», núm. 2 (`1200002489#2`); esa segunda clave no lo funde, así que Juan 1:42 y 21:15-17 usan ese id.
- **Natanael y Bartolomé.** Son dos fichas unidas por `mismo_que` pendiente, porque Perspicacia da la identidad como probable. Donde el texto dice Natanael (Jn 1 y 21) va `natanael`; en las listas de los once sin nombres (Jn 20:26-29, `aparicion-a-tomas`) va `bartolome`, como en los sinópticos. El lector de Juan lo confirma o lo corrige.
- **Anás.** `anas` no tiene clave `perspicacia`. Marcos no lo nombra, así que se la pone el lector de Juan 18 (Perspicacia «Anás»).

## Para 2 Reyes y 2 Crónicas

- **Jehoiadá y Baraquías.** Cuando se cree a Jehoiadá, falta un `mismo_que` entre `baraquias` y su id, con `deducido: true` y `estado: pendiente` (Perspicacia «Baraquías»: Jehoiadá pudo tener dos nombres; Mt 23:35).
- **Zacarías, hijo de Jehoiadá.** Su muerte (2Cr 24:20-22) va en `monte-moria`, el patio del templo, como la puso Mateo. Si Crónicas prefiere `jerusalen`, que se acuerde una sola relación `murio_en`. Su parentesco con Jehoás también es de Crónicas.

## Para Esdras, Hageo y 1 Crónicas

- **Zorobabel.** Su relación con David es `antepasado` (antes decía «descendiente de David», al revés). Abiud va como antepasado suyo, no como hijo, porque Perspicacia «Abiud» lo deja abierto.

## Para 1 Samuel

- **Abiatar y su padre.** `abiatar` ya existe (clave `1200000030`), creado desde Mr 2:26. Le falta la relación `pariente` con su padre Ahimélec, en la ficha de Abiatar (1Sa 22:20; Perspicacia «Abiatar»). Si la propuesta del Salmo 52 ya creó `ahimelec-hijo-de-ahitub`, se reutiliza ese id.
- **Nob.** La nota de estudio de Mr 2:26 pone allí la casa de Dios donde David comió los panes. Ni Mateo 12 ni Marcos 2 nombran Nob, así que no tiene ficha: la crea 1 Samuel 21.

## Para Éxodo

- **La zarza que ardía (Éx 3).** Mt 22:32 y Mr 12:26 la citan, y la nota de Mr 12:26 la sitúa hacia 1514 a.e.c. Cuando Éxodo cree el evento, se añade a `menciona` de los tramos Mateo 22:23-33 y Marcos 12:18-27, que hoy lo explican en su nota.

## Para Lucas y Juan

- **El orden del 16 de nisán.** `compran-especias`, `aparicion-a-las-mujeres`, `aparicion-a-pedro`, `camino-de-emaus`, `aparicion-a-maria-magdalena` y `aparicion-a-los-discipulos-sin-tomas` llevan fecha 16 de nisán del 33 sin `orden_relato`, y `resurreccion-de-jesus` lleva `a7`/124. `build.py` ordena por año, luego por serie y orden, luego por id, y no mira `detalle`: todo suceso del 33 sin serie sale antes que los de `a7`, así que las apariciones quedan antes de la resurrección en `data.json`. Cada aparición necesita `orden_relato` en la serie `a7` con un orden entre el de `resurreccion-de-jesus` (124) y el de `aparicion-a-tomas` (125); `tras` solo no basta, porque `orden_en_serie` no lo lee. `compran-especias` ya va bien antes.

## Para Lucas

- **Belcebú.** El resumen de `dedo-de-dios-y-senal-de-jonas` (Lu 11) escribe «Beelzebub»; la TNM escribe Belcebú (Mt 12:24; Mr 3:22). `satanas` ya lleva Belcebú en `nombres` desde Marcos 3.

## Para Romanos

- **Rufo.** `rufo-hijo-de-simon` (clave `1200003769#1`, Mr 15:21) ya existe. El Rufo de Ro 16:13 es la entrada núm. 2 de Perspicacia «Rufo» (`1200003769#2`): va en ficha aparte, con `no_confundir_con` en las dos.

## Para Hechos, 1 Timoteo y 2 Timoteo

- **Alejandro.** `alejandro-hijo-de-simon` (clave `1200000192#2`, Mr 15:21) ya existe. Los Alejandros de Hch 4:6, Hch 19:33, 1Ti 1:20 y 2Ti 4:14 son otras entradas de Perspicacia «Alejandro»: cada uno lleva `no_confundir_con` hacia él, y él hacia cada uno.
