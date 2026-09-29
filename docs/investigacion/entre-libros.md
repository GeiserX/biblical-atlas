# Pendientes entre libros

Cosas que un libro deja decididas o a medias y que otro libro tiene que respetar o cerrar. El lector y el escritor de cada libro leen esta lista antes de empezar y quitan lo que cierran.

## Para 1 y 2 Samuel

- **David huye de Absalón.** Cuando 2 Samuel cree el suceso (2Sa 15:13-17:22), añade «Sl 3» a sus pasajes y ese suceso al tramo 1-8 de `data/cobertura/salmos.yaml`.
- **La cueva del Salmo 142.** El encabezamiento remite a 1Sa 22:1 (Adulam) y a 1Sa 24:3 (En-guedí), y Perspicacia «Cueva» no elige. 1 Samuel decide a cuál de los dos sucesos se añade «Sl 142».
- **Cus el benjaminita.** Existe (`cus-el-benjaminita`) desde el Salmo 7. Perspicacia duda entre la corte de Saúl y Simeí; si 1 o 2 Samuel lo aclara, se añade la relación.

## Para 2 Reyes y 2 Crónicas

- **Jehoiadá y Baraquías.** Cuando se cree a Jehoiadá, falta un `mismo_que` entre `baraquias` y su id, con `deducido: true` y `estado: pendiente` (Perspicacia «Baraquías»: Jehoiadá pudo tener dos nombres; Mt 23:35).
- **Zacarías, hijo de Jehoiadá.** Su muerte (2Cr 24:20-22) va en `monte-moria`, el patio del templo, como la puso Mateo. Si Crónicas prefiere `jerusalen`, que se acuerde una sola relación `murio_en`. Su parentesco con Jehoás también es de Crónicas.

## Para Esdras, Hageo y 1 Crónicas

- **Zorobabel.** Su relación con David es `antepasado` (antes decía «descendiente de David», al revés). Abiud va como antepasado suyo, no como hijo, porque Perspicacia «Abiud» lo deja abierto.
- **Resá, Sealtiel y Nerí.** `resa` (Lu 3:27) va como descendiente de Zorobabel, con la relación `antepasado`, igual que Abiud. `sealtiel` lleva a `neri` como pariente sin grado, porque Perspicacia solo ve posible que fuera su yerno.
- **Janai el gadita (1Cr 5:12).** Perspicacia «Janai» (`1200002318`) no es el Janaí de Lu 3:24, que ya existe como `janai-hijo-de-jose` (`1200002320`) con la fuente `it-janai-hijo-de-jose`. El gadita puede llevar `janai`, que queda libre; su propuesta añade `no_confundir_con` en las dos fichas.

## Para Levítico

- **Nadab y Abihú.** Existen `nadab-hijo-de-aaron` y `abihu`, con fecha hasta 1512 a.e.c. Su muerte por el fuego ilegítimo (Le 10:1, 2) la crea Levítico. Los que sacan los cuerpos son `misael-hijo-de-uziel` y `elizafan-hijo-de-uziel` (Le 10:4 escribe Elzafán, que ya está en `nombres`).

## Para Números

- **Jetró es Reuel.** Nú 10:29 lo llama Reuel: es `jetro` (clave `1200002454`), no `reuel-hijo-de-esau`.
- **Coré.** La rebelión y la muerte de `core-hijo-de-izhar` (Nú 16) las crea Números.
- **Masá y Meribá.** `masa` es el sitio de Refidim (Éx 17). La Meribá de Nú 20 es `meriba-de-cades`.
- **El tabernáculo.** Nú 7:1 está en los `pasajes` de `se-monta-el-tabernaculo`, y Nú 9:15, 16 en los de `la-gloria-de-jehova-llena-el-tabernaculo`: van en los tramos de esos capítulos.
- **Quieren volver a Egipto (Nú 14:3, 4).** Hch 7:39 lo recuerda. El suceso que cree Números añade «Hch 7:39» a sus pasajes y va en el tramo 39-43 de Hechos 7.
- **Las etapas de Nú 33.** Los ids ya creados son `rameses`, `sucot-de-egipto`, `ezam`, `pihahirot`, `migdol`, `baal-zefon`, `cruce-del-mar-rojo`, `mara`, `elim`, `mar-rojo`, `desierto-de-sin`, `refidim` y `desierto-de-sinai`. Los sucesos son `exodo` (la salida), `israel-cruza-el-mar-rojo`, `jehova-endulza-el-agua-de-mara`, `israel-acampa-en-elim` y `codornices-y-mana-en-el-desierto-de-sin`.
- **El día de la salida.** Nú 33:3 dice que salieron de Ramesés el día 15. `exodo` se queda en el 14 de nisán: Perspicacia «Éxodo» pone el comienzo de la marcha hacia Sucot antes de que acabara el 14.
- **La serpiente de cobre (Nú 21:8, 9).** Jn 3:14 la recuerda. Cuando Números cree el suceso, va en `menciona` del tramo Juan 3:11-21.

## Para Deuteronomio

- **Pasajes paralelos ya puestos en sucesos de Éxodo.** Dt 5:4-27 en `diez-mandamientos`; Dt 9:9 en `primeros-cuarenta-dias-de-moises-en-el-sinai`; Dt 9:10, 11 en `dios-da-a-moises-las-tablas-del-testimonio`; Dt 9:12-14, 19, 26-29 en `moises-ruega-por-el-pueblo`; Dt 9:15-17, 21 en `moises-rompe-las-tablas`; Dt 9:16 en `becerro-de-oro`; Dt 9:20 en `moises-pide-perdon-por-el-pueblo`; Dt 9:18, 25 y Dt 10:1-5, 10 en `moises-recibe-las-segundas-tablas`, porque los 40 días postrado de Dt 9:18 y 9:25 son los segundos (Éx 34:28). Cada uno va en el tramo de su capítulo.
- **Masá.** Dt 6:16, 9:22 y 33:8 hablan del sitio de Refidim: `masa`.

## Para Nehemías y Hebreos

- **Pasajes paralelos ya puestos.** Ne 9:18 en `becerro-de-oro`; Heb 11:23 en `nacimiento-de-moises`; Heb 11:24-26 en `moises-mata-a-un-egipcio`. Cada uno va en el tramo de su capítulo.

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
- **La unción de David (1Sa 16).** Hch 13:22 la recuerda. Cuando 1 Samuel cree el suceso, añade «Hch 13:22» a sus pasajes y lo pone en el tramo 16-22 de Hechos 13 (`data/cobertura/hechos.yaml`).
- **Nob.** La nota de estudio de Mr 2:26 pone allí la casa de Dios donde David comió los panes. Ni Mateo 12 ni Marcos 2 nombran Nob, así que no tiene ficha: la crea 1 Samuel 21.

## Para 1 Timoteo y 2 Timoteo

- **Alejandro.** Ya existen `alejandro-hijo-de-simon` (`1200000192#2`, Mr 15:21), `alejandro-pariente-de-anas` (`#3`, Hch 4:6) y `alejandro-de-efeso` (`#4`, Hch 19:33). El de 1Ti 1:20 es la entrada núm. 5 y el calderero de 2Ti 4:14, la núm. 6; Perspicacia ve posible que sean el mismo, así que van dos fichas y un `mismo_que` pendiente. Todos llevan `no_confundir_con` entre sí.

## Para 2 Samuel y 1 Crónicas

- **Natán, hijo de David.** `natan-hijo-de-david` (clave `1200003184#4`) existe desde Lu 3:31. 2Sa 5:14, 1Cr 3:5 y 1Cr 14:4 usan ese id; `natan-profeta` sigue sin clave.
- **Abías, el de la división sacerdotal.** `abias-de-tiempos-de-david` (clave `1200000041#4`) existe desde Lu 1:5. 1Cr 24:10 usa ese id y añade su pasaje.
- **David quiere construir una casa a Dios (2Sa 7:1-3).** Hch 7:46 lo recuerda y `pacto-con-david` no incluye esos versículos. El suceso que cree 2 Samuel añade «Hch 7:46» a sus pasajes y va en el tramo 44-50 de Hechos 7.
- **Cainán y Selá.** `sela-hijo-de-arpaksad` lleva dos padres: Arpaksad (Gé 11:12) y, con `estado: pendiente`, `cainan-hijo-de-arpaksad` (Lu 3:36), que falta en el texto hebreo. 1Cr 1:18 no cambia ninguno de los dos.

## Para 1 Reyes

- **Sarepta (1Re 17).** `sarepta` existe desde Lu 4:26. Faltan la relación `elias-profeta` `vivio_en` `sarepta` (1Re 17:9, 10) y el suceso de la viuda; cuando exista, va en `menciona` del tramo Lucas 4:23-27.
- **La reina de Saba (1Re 10).** Lu 11:31 y Mt 12:42 la llaman reina del sur. El lugar `saba` es el de Job 6:19. Si 1 Reyes crea el reino de Saba (Perspicacia «Seba», núm. 6), se añade a `menciona` de los tramos Lucas 11:29-36 y Mateo 12:38-42.

- **La muerte de David (1Re 2:10).** `david` ya lleva `murio_en` `jerusalen`, deducida de Hch 2:29. Cuando 1 Reyes cuente su muerte, añade su capítulo a las fuentes de esa relación con un `anadir`, sin crear otra.
- **Elías en el Horeb (1Re 19:9-18).** Ro 11:2-4 recuerda su queja y los 7.000 que no se arrodillaron ante Baal. Cuando 1 Reyes cree ese suceso, añade «Ro 11:2-4» a sus pasajes y lo pone en el tramo 1-6 de Romanos 11, donde ahora `elias-profeta` está en `menciona`.

## Para 2 Reyes

- **Naamán el sirio (2Re 5).** `naaman-el-sirio` (clave `1200003149#2`) existe desde Lu 4:27. Falta el suceso de su curación; cuando exista, va en `menciona` del tramo Lucas 4:23-27.

## Para Nehemías

- **Itiel.** `itiel-oyente-de-agur` (clave `1200002237#1`, Pr 30:1) ya existe. El benjamita de Ne 11:7 es la entrada núm. 2 de Perspicacia «Itiel» (`1200002237#2`): va en ficha aparte, con `no_confundir_con` en las dos.
- **La Puerta de las Ovejas (Ne 3:1, 32; 12:39).** Desde Jn 5:2 es un nombre de `jerusalen`, con su nota. Se reutiliza, sin ficha propia.

## Para Eclesiastés, El Cantar de los Cantares y 1 Reyes

- **Salomón.** El cambio de Proverbios a su `resumen` y a su `razon` (compuso la mayor parte de Proverbios) ya está integrado en `salomon.yaml`. Un cambio posterior a esos campos parte del texto actual, con su `antes`.
## Para Deuteronomio, Josué y Jueces

- **El monte Guerizim.** Existe `monte-guerizim` desde Jn 4:20 (punto de OpenBible `a30e967`). Dt 11:29, 27:12, Jos 8:33 y Jue 9:7 usan ese id.

## Para Josué

- **Los huesos de José (Jos 24:32).** Hch 7:16 dice que los llevaron a Siquem. Cuando Josué cree ese entierro, añade «Hch 7:16» a sus pasajes y lo pone en el tramo 9-16 de Hechos 7.
- **Queriyot-hezrón (Jos 15:25).** Perspicacia «Judas», núm. 4, dice que el apelativo Iscariote suele leerse como procedencia de ese lugar y que Judas y su padre probablemente eran de allí. Juan no lo nombra, así que `judas-iscariote` y `simon-iscariote` no llevan relación con él; Josué decide si la añade como deducida y pendiente.

## Para Gálatas y 1 Corintios

- **Pasajes ya puestos en sucesos de Hechos.** Gál 1:15, 16 y 1Co 15:8 en `conversion-de-pablo`; Gál 1:18, 19 en `pablo-visita-a-cefas`; Gál 2:1-10 en `concilio-de-jerusalen-49`; 1Co 1:14 en `crispo-cree`. Van en los tramos de esos capítulos. Hechos es el dueño de estos sucesos (sección 6 de `versiculos.md`).

## Para 1 Corintios, 2 Corintios y Hechos

- **La colecta para Jerusalén.** `colecta-de-macedonia-y-acaya` existe desde Ro 15:25-28, 31, que es su dueño porque Hechos solo la recuerda en un discurso (Hch 24:17). 1Co 16:1-4 y 2Co 8 y 9 añaden su pasaje con un `anadir` y ponen el suceso en su tramo. Si se relee Hechos 24, «Hch 24:17» entra igual en el tramo 10-21.

## Para 2 Corintios y Filipenses

- **Los antepasados de Pablo.** `pablo` lleva `pariente` `antepasado` hacia `abrahan` (Ro 4:1; 11:1), `isaac` (Ro 9:10) y `benjamin-hijo-de-jacob` (Ro 11:1). 2Co 11:22 y Flp 3:5 solo añaden su capítulo a las fuentes de esas relaciones, sin crear otras.

## Para 1 Corintios y 2 Timoteo

- **Áquila y Priscila con Pablo.** Su relación `acompana` con `pablo` va de c. 50 a 65 (Ro 16:3, 4; Perspicacia «Prisca»), como `colaborador`. 1Co 16:19 y 2Ti 4:19 añaden su capítulo a las fuentes de esa relación, sin crear otra.
