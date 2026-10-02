# Relatos de días repartidos por decenios

En la línea de tiempo, relatos que el texto cuenta en días o meses ocupaban decenios. El levita de Jueces 19 viajaba durante 17 años, la guerra contra Benjamín duraba 36 y el Arca pasaba 28 años entre Siló y Quiryat-Jearim, aunque 1 Samuel 6:1 dice que estuvo siete meses en Filistea. Como un viaje se dibuja mientras duran sus paradas y las paradas siguen a sus sucesos, el error salía también en el mapa.

## De dónde salía

Un suceso con `narrative_order` y una fecha de años (un tramo sin anclar) no tiene sitio propio en la línea: `repartoRelato` (`site/js/trayectorias.js`) junta los de una serie que van entre dos anclas y `colocar` los reparte por igual en el tramo libre. Jueces 19 a 21 son 18 sucesos con la misma fecha, «entre c. 1450 y c. 1400 a.e.c.», que Perspicacia («Jueces, Libro de», «Orden del libro») sitúa poco después de morir Josué. Repartidos por igual, cada uno se lleva 2,8 años, y el relato entero, 50.

El reparto no sabe qué sucesos cuenta el texto seguidos. Para él, Jueces 19 a 21 es lo mismo que Jueces 2 a 11, que sí abarca siglos.

Con Epafras pasaba otra cosa. Su parada de Colosas, fechada c. 59-61, cuenta el mismo versículo que el suceso «Epafras da a conocer las buenas noticias en Colosas», de tiempo narrativo entre 33 y 61, y la parada tomaba la ventana entera de ese suceso: de 33 a 61.

## Los casos peores

`node scripts/relato_spans.mjs` corre el código del sitio sobre los datos compilados y lista cuánto ocupa cada tanda de una serie (sucesos seguidos con la misma fecha sin anclar) y cada viaje. Antes del cambio, los más largos:

| Años | Qué | Lo que dice el texto |
|---:|---|---|
| 183,3 | Jueces 2 a 11 (49 sucesos) | Siglos de jueces; abarcarlos es correcto |
| 173,0 | Rut 1 a 4 (7) | Unos diez años en Moab (Rut 1:4) y después una cosecha |
| 63,6 | Viaje: campaña de Gedeón | Una noche y la persecución que sigue (Jue 7 y 8) |
| 54,4 | Viaje: Noemí vuelve a Belén | Un viaje |
| 53,7 | Viaje: Judá y Simeón contra los cananeos | Una campaña |
| 50,0 | Jueces 19 a 21 (18) | Cinco días en Belén, una noche en Guibeá, tres días de guerra y cuatro meses en Rimón |
| 39,8 | 1 Samuel 3 a 7 (17) | Siete meses en Filistea (6:1) y veinte años en Quiryat-Jearim (7:2) |
| 39,5 | Viaje: huida de Moisés a Madián | La huida; la parada en Madián tomaba los 40 años que vivió allí |
| 36,1 | Viaje: Israel contra Benjamín | Tres días de batalla (Jue 20:22-30) y cuatro meses (20:47) |
| 28,5 | Viaje: Epafras a Roma | Un viaje dentro del primer encierro de Pablo, c. 59-61 |
| 28,1 | Viaje: el Arca, de Siló a Quiryat-Jearim | Siete meses en Filistea |
| 19,4 | Viaje: los 600 benjaminitas | Cuatro meses en el peñasco (Jue 20:47) |
| 17,2 | Viaje: Jesús a los 12 años en la Pascua | Un viaje; la parada de Nazaret tomaba los 17 años de Lucas 2:51 |
| 16,7 | Viaje: el levita y su concubina | Unos seis días |

Lo que dicen las fuentes de los tres casos medidos:

- **Jueces 19 a 21.** El suegro retiene al levita tres días, un cuarto y lo deja salir de tarde el quinto (19:4-10); llegan a Guibeá al ponerse el sol y esa noche ocurre el crimen (19:14-26). Israel lucha «el segundo día» (20:24) y vence «el tercer día» (20:30), después de que Jehová prometiera la victoria «mañana» (20:28). Los 600 pasan cuatro meses en el peñasco de Rimón (20:47) y vuelven cuando Israel les ofrece la paz (21:13, 14). Finehás sirve ante el Arca (20:28): Perspicacia («Jueces, Libro de») pone estos capítulos poco después de morir Josué, hacia 1450 a.e.c. No dice cuánto tardan el levita en llegar a casa, Israel en reunirse en Mizpá ni la fiesta anual de Siló.
- **1 Samuel 4 a 7.** El mensajero llega a Siló el mismo día de la batalla (4:12); el Arca está siete meses en tierra filistea (6:1), y Perspicacia («Arca del pacto») dice que en esos meses pasó de una ciudad a otra; desde que llega a Quiryat-Jearim pasan veinte años hasta que Samuel habla a Israel (7:2, 3). Perspicacia («Arca del pacto» y «Quiryat-jearim») dice que el Arca siguió allí unos setenta años, hasta que David la llevó a Jerusalén.
- **Epafras.** Perspicacia («Epafras») pone su viaje a Roma en el primer encierro de Pablo, c. 59-61. Cuándo enseñó en Colosas no lo dice.

## Lo que decidimos y por qué

El arreglo es de datos y de motor a la vez.

- **Datos.** `narrative_order.elapsed` dice el tiempo que el texto da desde el suceso anterior de la serie, o desde `since`: `days`, `months` (meses lunares) o `years`, con su `reason` y el versículo. Si el texto ata dos sucesos sin dar plazo («a raíz de eso», «al llegar a su casa»), `elapsed` va sin cifra y su `reason` lo dice. Ningún año se inventa: el plazo es relativo, y la fecha de cada suceso sigue siendo su tramo de siempre. `validate.py` exige la razón, una cifra como mucho, un `since` anterior de la misma serie y fechas que se tocan.
- **Motor.** Los sucesos atados forman un bloque tan largo como dice el texto. Los que van entre dos plazos sin `elapsed` propio se reparten por igual entre ellos, como antes entre dos anclas: Asdod, Gat y Ecrón quedan dentro de los siete meses sin que pongamos cifra a cada uno. Un paso sin cifra se dibuja de un día, lo mínimo que se ve, y dos sucesos del mismo día van con seis horas entre ellos para que se vea su orden. Dentro de su grupo, el bloque cuenta como un suceso más que necesita además su largo, y va al principio de lo que le toca. Si no cabe en sus fechas, sus sucesos se reparten como antes.
- **Una parada con fecha anclada no sale de ella** aunque la cuente un suceso de tiempo narrativo más largo: la fecha anclada es la que da la fuente para esa parada.

Por qué así. Un bloque compacto con aspecto de fecha exacta mentiría sobre el año, y un relato de días repartido en 36 años miente sobre lo que dura. Lo que sabemos de verdad son dos cosas distintas: el tramo de años en que cae el relato, que lo da la fuente, y los plazos internos, que los da el texto. El bloque respeta las dos: nunca sale del tramo, y por dentro sigue los plazos. Su sitio dentro del tramo es el que ya daba el orden del relato a su primer suceso, así que no afirmamos nada nuevo sobre el año. Sus marcas siguen siendo huecas y «situadas por el orden del relato», el aspecto que ya tiene el tiempo narrativo, y la ficha sigue diciendo «entre c. 1450 y c. 1400 a.e.c.».

El paso de un día donde el texto no da plazo es una convención del dibujo, no un dato: lo dice el `reason` de cada uno («el texto no dice cuánto tardan») y lo dice este documento. Es el mínimo que se puede dibujar, y queda lejos del error de antes. Cuando una fuente dé un plazo, basta con escribirlo.

Una comprobación independiente: con estos plazos, el Arca llega a Quiryat-Jearim hacia 1142 a.e.c., y David la sube a Jerusalén en 1070. Son 72 años, y Perspicacia dice «unos setenta». El motor no usa esa cifra.

## Qué se movió

Medido con `relato_spans.mjs --compare` sobre cada suceso, carta y parada, antes y después: 95 posiciones, ninguna carta.

| Qué | Antes | Después |
|---|---:|---:|
| Jueces 19 a 21, los 18 sucesos | 50,0 años | 4,3 meses |
| Viaje del levita y su concubina | 16,7 años | 7 días |
| Viaje de Israel contra Benjamín | 36,1 años | 4,1 meses |
| Viaje de los 600 benjaminitas | 19,4 años | 4,0 meses |
| Viaje de los 12.000 contra Jabés-Galaad | 2,8 años | 1,0 mes |
| 1 Samuel 4 a 6: de la batalla de Ebenézer a la vuelta del Arca | 25,7 años | 7 meses |
| Viaje del Arca, de Siló a Quiryat-Jearim | 28,1 años | 7 meses en Filistea y 20 años en Quiryat-Jearim |
| Viaje de Epafras a Roma | 28,5 años | 2,5 años (su fecha, c. 59-61) |
| Viaje de la huida de Moisés a Madián | 39,5 años | 1,0 año |
| Viaje de Jesús a los 12 años | 17,2 años | 0,8 años |
| Viaje de José a Egipto | 12,0 años | 1,0 año |

Cada suceso y cada parada que se mueve, y por qué:

- **Jueces 19 a 21** (18 sucesos) y las paradas de sus cuatro viajes (el levita, Israel contra Benjamín, los 600, los 12.000): el bloque nuevo. Su primer suceso sigue empezando donde empezaba, tras la muerte de Josué.
- **1 Samuel 1 a 8** (26 sucesos) y las paradas del Arca, de Ana con Samuel a Siló y del recorrido anual de Samuel: el bloque de 1 Samuel 4 a 7 deja de contar como 16 sucesos y pasa a contar como uno con su largo, así que los seis sucesos de 1 Samuel 1 a 3 se reparten un tramo mayor (de 3,6 a 5,7 años cada uno) y 1 Samuel 7:15 a 8:22 se corre unos meses.
- **Trece paradas de otros viajes**: siete tomaban la ventana entera de un suceso narrativo más largo que su propia fecha anclada (Epafras en Colosas, Moisés en Madián, José en Egipto, Jefté al volver de Tob, Eliseo al volver del Jordán, Jesús en Nazaret a los 12 años, Timoteo en Corinto) y ahora quedan dentro de esa fecha; las otras seis son paradas vecinas de la misma persona, que se corren con ellas (tres de José, dos de la vuelta de Moisés a Egipto y una de Eliseo).

## Lo que queda

- **Más relatos del mismo tipo.** La campaña de Gedeón (63,6 años), Barac y Sísara (18,7), la guerra de Abimelec (15,0) y Sansón están dentro de la tanda de Jueces 2 a 11 o de 12 a 16, que abarca siglos de verdad. Atarlos con `elapsed` es barato en datos, pero cada bloque libera sitio en una tanda de 49 sucesos y mueve la era de los jueces entera; conviene hacerlo en un cambio aparte, mirando a la vez los años que el libro sí da (veinte de Jabín, cuarenta de paz, siete de Madián, tres de Abimelec).
- **Rut** (173 años) necesita una deducción para el nacimiento de Obed, que el texto no fecha tras la boda; con un paso de un día parecería del día siguiente. Pide un plazo derivado con su cuenta, que hoy el esquema no tiene para `elapsed`.
- **1 Samuel 1 a 3** sigue repartido por igual: con el bloque del Arca, Jehová llama a Samuel hacia 1150 a.e.c., más tarde que antes.
- **Las paradas cuya duración se pierde al empujarlas** (`prepararParadas`): Epafras en Roma queda en un instante al final de c. 61 porque su parada se calcula después del empujón. Arreglarlo mueve cientos de paradas y es otro cambio.
