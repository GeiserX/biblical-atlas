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

## Para 2 Reyes y 2 Crónicas

- **Jehoiadá y Baraquías.** Cuando se cree a Jehoiadá, falta un `mismo_que` entre `baraquias` y su id, con `deducido: true` y `estado: pendiente` (Perspicacia «Baraquías»: Jehoiadá pudo tener dos nombres; Mt 23:35).
- **Zacarías, hijo de Jehoiadá.** Su muerte (2Cr 24:20-22) va en `monte-moria`, el patio del templo, como la puso Mateo. Si Crónicas prefiere `jerusalen`, que se acuerde una sola relación `murio_en`. Su parentesco con Jehoás también es de Crónicas.

## Para Esdras, Hageo y 1 Crónicas

- **Zorobabel.** Su relación con David es `antepasado` (antes decía «descendiente de David», al revés). Abiud va como antepasado suyo, no como hijo, porque Perspicacia «Abiud» lo deja abierto.

## Para Levítico

- **Nadab y Abihú.** Existen `nadab-hijo-de-aaron` y `abihu`, con fecha hasta 1512 a.e.c. Su muerte por el fuego ilegítimo (Le 10:1, 2) la crea Levítico. Los que sacan los cuerpos son `misael-hijo-de-uziel` y `elizafan-hijo-de-uziel` (Le 10:4 escribe Elzafán, que ya está en `nombres`).

## Para Números

- **Jetró es Reuel.** Nú 10:29 lo llama Reuel: es `jetro` (clave `1200002454`), no `reuel-hijo-de-esau`.
- **Coré.** La rebelión y la muerte de `core-hijo-de-izhar` (Nú 16) las crea Números.
- **Masá y Meribá.** `masa` es el sitio de Refidim (Éx 17). La Meribá de Nú 20 es `meriba-de-cades`.
- **El tabernáculo.** Nú 7:1 está en los `pasajes` de `se-monta-el-tabernaculo`, y Nú 9:15, 16 en los de `la-gloria-de-jehova-llena-el-tabernaculo`: van en los tramos de esos capítulos.
- **Las etapas de Nú 33.** Los ids ya creados son `rameses`, `sucot-de-egipto`, `ezam`, `pihahirot`, `migdol`, `baal-zefon`, `cruce-del-mar-rojo`, `mara`, `elim`, `mar-rojo`, `desierto-de-sin`, `refidim` y `desierto-de-sinai`. Los sucesos son `exodo` (la salida), `israel-cruza-el-mar-rojo`, `jehova-endulza-el-agua-de-mara`, `israel-acampa-en-elim` y `codornices-y-mana-en-el-desierto-de-sin`.
- **El día de la salida.** Nú 33:3 dice que salieron de Ramesés el día 15. `exodo` se queda en el 14 de nisán: Perspicacia «Éxodo» pone el comienzo de la marcha hacia Sucot antes de que acabara el 14.

## Para Deuteronomio

- **Pasajes paralelos ya puestos en sucesos de Éxodo.** Dt 5:4-27 en `diez-mandamientos`; Dt 9:9 en `primeros-cuarenta-dias-de-moises-en-el-sinai`; Dt 9:10, 11 en `dios-da-a-moises-las-tablas-del-testimonio`; Dt 9:12-14, 19, 26-29 en `moises-ruega-por-el-pueblo`; Dt 9:15-17, 21 en `moises-rompe-las-tablas`; Dt 9:16 en `becerro-de-oro`; Dt 9:20 en `moises-pide-perdon-por-el-pueblo`; Dt 9:18, 25 y Dt 10:1-5, 10 en `moises-recibe-las-segundas-tablas`, porque los 40 días postrado de Dt 9:18 y 9:25 son los segundos (Éx 34:28). Cada uno va en el tramo de su capítulo.
- **Masá.** Dt 6:16, 9:22 y 33:8 hablan del sitio de Refidim: `masa`.

## Para Nehemías, Hechos y Hebreos

- **Pasajes paralelos ya puestos.** Ne 9:18 y Hch 7:40, 41 en `becerro-de-oro`. Hch 7:17-19 en `egipto-esclaviza-a-israel`; Hch 7:19 en `el-faraon-manda-echar-al-nilo-a-los-ninos`; Hch 7:20-22 y Heb 11:23 en `nacimiento-de-moises`; Hch 7:23, 24 y Heb 11:24-26 en `moises-mata-a-un-egipcio`; Hch 7:25-29 en `moises-huye-a-madian`; Hch 7:29 en `nacimiento-de-guersom`; Hch 7:30-35 en `moises-ante-la-zarza-ardiente`.

## Para 1 Crónicas

- **Nombres que Perspicacia solo da como probables.** Ladán (Libní), Aminadab hijo de Cohat (Izhar) y Ebiasaf (Abiasaf, que tiene artículo propio) llevan ficha aparte y un `mismo_que` con `deducido: true` y `estado: pendiente` hacia `libni-hijo-de-guerson`, `izhar-hijo-de-cohat` y `abiasaf`.
- **Nun.** Su padre Elisamá y su tribu, Efraín (1Cr 7:20-27), faltan en `nun`.
- **Hur.** `hur-hijo-de-caleb` (1Cr 2:19, 20) ya existe, con un `mismo_que` pendiente desde `hur-companero-de-moises`.

## Para 2 Timoteo

- **Janes y Jambres.** Los magos del faraón (Éx 7:11, 22) no tienen ficha. Si 2Ti 3:8 los crea, el tramo 7:8-13 de Éxodo los puede poner en `menciona`.

## Para Jueces y 1 Crónicas

- **Pua.** La TNM escribe Pua para tres personas (Perspicacia «Puá»): `puva`, el hijo de Isacar, así llamado en 1Cr 7:1; `pua-partera`, de Éx 1:15; y el padre del juez Tolá (Jue 10:1), núm. 3, que aún no tiene ficha y, como hijo de Dodó, lleva `pua-hijo-de-dodo`.

## Para Jeremías y Ezequiel

- **Migdol.** `migdol` es el lugar de Éx 14:2 y Nú 33:7. La ciudad egipcia de Jer 44:1 y Ez 29:10 es la entrada núm. 2 de Perspicacia «Migdol» y lleva otro id.

## Para 1 Samuel

- **Abiatar y su padre.** `abiatar` ya existe (clave `1200000030`), creado desde Mr 2:26. Le falta la relación `pariente` con su padre Ahimélec, en la ficha de Abiatar (1Sa 22:20; Perspicacia «Abiatar»). Si la propuesta del Salmo 52 ya creó `ahimelec-hijo-de-ahitub`, se reutiliza ese id.
- **Nob.** La nota de estudio de Mr 2:26 pone allí la casa de Dios donde David comió los panes. Ni Mateo 12 ni Marcos 2 nombran Nob, así que no tiene ficha: la crea 1 Samuel 21.

## Para Lucas y Juan

- **El orden del 16 de nisán.** `compran-especias`, `aparicion-a-las-mujeres`, `aparicion-a-pedro`, `camino-de-emaus`, `aparicion-a-maria-magdalena` y `aparicion-a-los-discipulos-sin-tomas` llevan fecha 16 de nisán del 33 sin `orden_relato`, y `resurreccion-de-jesus` lleva `a7`/124. `build.py` ordena por año, luego por serie y orden, luego por id, y no mira `detalle`: todo suceso del 33 sin serie sale antes que los de `a7`, así que las apariciones quedan antes de la resurrección en `data.json`. Cada aparición necesita `orden_relato` en la serie `a7` con un orden entre el de `resurreccion-de-jesus` (124) y el de `aparicion-a-tomas` (125); `tras` solo no basta, porque `orden_en_serie` no lo lee. `compran-especias` ya va bien antes.

## Para Lucas

- **Belcebú.** El resumen de `dedo-de-dios-y-senal-de-jonas` (Lu 11) escribe «Beelzebub»; la TNM escribe Belcebú (Mt 12:24; Mr 3:22). `satanas` ya lleva Belcebú en `nombres` desde Marcos 3.

## Para Romanos

- **Rufo.** `rufo-hijo-de-simon` (clave `1200003769#1`, Mr 15:21) ya existe. El Rufo de Ro 16:13 es la entrada núm. 2 de Perspicacia «Rufo» (`1200003769#2`): va en ficha aparte, con `no_confundir_con` en las dos.

## Para Hechos, 1 Timoteo y 2 Timoteo

- **Alejandro.** `alejandro-hijo-de-simon` (clave `1200000192#2`, Mr 15:21) ya existe. Los Alejandros de Hch 4:6, Hch 19:33, 1Ti 1:20 y 2Ti 4:14 son otras entradas de Perspicacia «Alejandro»: cada uno lleva `no_confundir_con` hacia él, y él hacia cada uno.

## Para Nehemías

- **Itiel.** `itiel-oyente-de-agur` (clave `1200002237#1`, Pr 30:1) ya existe. El benjamita de Ne 11:7 es la entrada núm. 2 de Perspicacia «Itiel» (`1200002237#2`): va en ficha aparte, con `no_confundir_con` en las dos.

## Para Eclesiastés, El Cantar de los Cantares y 1 Reyes

- **Salomón.** Proverbios deja en `data/_propuestas/proverbios.json` un cambio a su `resumen` y a su `razon` (compuso la mayor parte de Proverbios). Un cambio posterior a esos campos parte del texto que queda tras integrar Proverbios, no del de hoy.
