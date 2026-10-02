# Área desconocida: de dónde viene un viaje cuando la fuente no lo sitúa

## El problema

> Cuando jw.org no lo especifica y dice que no sabe dónde está ese «Oriente», que se quede como está, con un «área desconocida». Luego podemos animar esa área, como si sus paredes se vinieran abajo mientras se mueve hacia el destino, bastante rápido, para ser completos y fieles a los hechos. Creo que se puede hacer en muchas cosas, por ejemplo cuando no sabes dónde acaba de verdad un viaje.

Hasta ahora, un viaje cuyo texto nombra una salida o una vuelta sin situarla empezaba o acababa en el primer lugar con ficha. Los astrólogos salían de Jerusalén, aunque Mateo dice que vienen de Oriente, y su vuelta «a su país» no se dibujaba. Los 12.000 salían de Jabés-Galaad, aunque Jueces los manda desde el campamento. El mapa no mentía, pero callaba la mitad del relato.

## Qué hemos hecho

**Los datos.** Una parada puede ser un área desconocida: `place: null` y una sola clave nueva, `unknown_area`, con las palabras de la fuente (`words`, 7 como mucho, para que nunca formen una racha de 8 copiadas) y, solo si la fuente lo da, el rumbo (`direction`, uno de los ocho de la rosa). No hay coordenadas ni ficha de lugar inventada. Lo demás es lo de cualquier parada: `reference`, `date`, `note`, `sources`, `reason`, `checked_on` y `status`. Solo puede ir primera o última, y el viaje necesita al menos una parada con lugar. `validate.py` lo comprueba y `build.py` la pasa a `data.json` igual que en el YAML, con `lugar: null` y `unknown_area`; el servidor MCP del atlas lee el fichero sin cambios y enseña la parada sin lugar. El esquema está en [la investigación](../investigacion/README.md), apartado «Viajes».

**El mapa.** El área es la posición estimada en grande: un óvalo de trazos en el color del viaje, con un relleno claro que tapa el relieve y los nombres de debajo, y dentro las palabras de la fuente y «la fuente no dice dónde». Va junto a la parada vecina con lugar, en píxeles de la pantalla: no crece ni encoge con el zoom, así que no dice ninguna distancia, y el encuadre no la cuenta. Con rumbo, va hacia él, unida a la parada por un hilo de trazos con una flecha (hacia la parada si el viaje viene del área, hacia el área si va allí). Sin rumbo, es un anillo alrededor de la parada vecina, que no señala ningún sitio, con las palabras encima. Pulsarla abre la ficha de su parada, nunca la de un lugar. La leyenda nombra cada área: «Origen de los astrólogos de Oriente: Oriente, la fuente no dice dónde».

**La animación.** El área depende solo de la fecha. El área de origen se ve hasta que el viaje llega a su vecina; al cruzar ese momento se encoge y entra en la parada. El área de destino aparece al salir de la última parada: se abre desde ella, con el contorno marcado, y se queda en su trazo suave. La transición dura 0,45 s de reloj, sea cual sea la velocidad de reproducción, y es la misma al arrastrar el cursor, hacia delante y hacia atrás, porque el estado sale de la fecha y no del movimiento. Con «reducir movimiento» no hay transición, solo los dos estados, y el modo reunión hace lo mismo porque el sitio quita en él todo movimiento. No hay biblioteca de animación: un marcador de MapLibre y una transición de CSS.

**El tiempo.** El área no entra en el reparto de las paradas: va pegada a su vecina, un tramo de camino (0,04 años) antes de la llegada o después de la salida, como estimada. Si la fecha del viaje no deja sitio, el área sale de ella y el viaje se dibuja también ese rato, porque sin eso el origen de los astrólogos, que están en Jerusalén desde el primer día de su fecha, nunca se vería abierto. Mientras el viaje está en un área, nadie lo sitúa: `BE.donde` no da posición y el marcador de la persona no se dibuja.

**Las fichas, la línea y la lectura.** La ficha del área dice su orden («Parada 1 de 4 · Origen»), que la fuente no dice dónde, el rumbo si lo hay, la nota, el pasaje y un botón a la parada vecina. La ficha del viaje la lista como las demás. En el carril de una persona (Balaam, Lot) el área es una marca más de su viaje. En el modo lectura, cada área es un pasaje propio: el origen va antes que lo demás de su versículo y el destino después, y al pisarlo el mapa no se mueve si la parada vecina ya se ve; si no se ve, va a ella, nunca a la época.

## Dónde se ha usado

Leímos cada viaje cuya primera o última parada se quedó fuera porque el texto no la sitúa. El área entra solo cuando el texto cuenta esa salida o esa vuelta con palabras propias para el sitio.

| Viaje | Qué dice el texto | Qué hemos hecho |
|---|---|---|
| `los-astrologos-de-oriente` | Vienen de Oriente (Mt 2:1, 2) y vuelven a su país por otro camino (Mt 2:12). | Origen «Oriente», rumbo este; destino «su país», sin rumbo. |
| `los-12000-contra-jabes-galaad` | El pueblo los envía desde el campamento donde se había reunido (Jue 21:8-10), sin decir dónde estaba. | Origen «el campamento», sin rumbo. |
| `huida-de-lot` | Por miedo deja Zóar y se va a vivir a una cueva de la región montañosa (Gé 19:30); Perspicacia la llama cercana. | Destino «la región montañosa», sin rumbo. |
| `viaje-de-balaam` | Se va «a su lugar» (Nú 24:25); Perspicacia «Balaam» dice que eso solo indica que dejó Peor, no que volviera a Petor. | Destino «su lugar», sin rumbo. |
| `los-correos-de-ezequias` | Van de ciudad en ciudad hasta Zabulón (2Cr 30:10). No cuenta la vuelta. | Nada: el texto no la cuenta. |
| `abimelec-va-a-ver-a-isaac` | Se van en paz (Gé 26:31), sin palabras para el sitio; venían de Guerar. | Nada: sin palabras de la fuente, y la vuelta a Guerar sería una parada deducida. |
| `amos-a-betel` | Amasías le manda huir a Judá (Am 7:12); el texto no dice que fuera. | Nada: no se cuenta la vuelta. |
| `campana-contra-moab` | Vuelven a su tierra (2Re 3:27). | Nada: su tierra se sabe (Israel); sería una vuelta deducida, no un área. |
| `israel-contra-benjamin` | Cada uno se va a su tribu y a su herencia (Jue 21:24). | Nada: no es un sitio sino cada territorio; un área junto a Siló diría un solo destino. |
| `regreso-del-funcionario-etiope` | Sigue su camino (Hch 8:39); su tierra es Etiopía (8:27). | Nada: el lugar tiene ficha; sería una llegada deducida. |
| `juda-y-simeon-contra-los-cananeos` | Judá sube (Jue 1:4), sin decir desde dónde. | Nada: sin palabras de la fuente para el sitio. |
| `ehud-libra-a-israel-de-moab` | Los israelitas mandan el tributo por medio de él (Jue 3:15), sin decir desde dónde. | Nada: sin palabras para el sitio. |
| `campana-del-norte-de-josue` | Josué cae sobre los reyes (Jos 11:7) sin decir desde dónde; Jos 10:43 lo deja en Guilgal. | Nada: sin palabras, y Guilgal sería una salida deducida. |
| `joab-en-gabaon`, `pedro-de-lida-a-cesarea`, `juda-a-timna`, `nabucodonosor-contra-jerusalen-617`, `abner-lleva-a-mical-a-hebron` | Salen sin que el texto nombre de dónde. | Nada: sin palabras para el sitio; algunos tienen una salida deducible. |
| `apolos-de-efeso-a-corinto`, `bernabe-y-marcos-a-chipre`, `elias-huye-al-horeb` | El texto no narra ese tramo (Alejandría, el resto de Chipre, el desierto de Damasco). | Nada: no se cuenta el movimiento. |

**Un lugar sin punto ni candidato** en un extremo del viaje se dibuja igual, con su nombre y «sin ubicación conocida». Hoy ninguna parada de viaje cae en un lugar así; la prueba lo comprueba quitando en una copia de los datos los candidatos de Mahanaim, que abre y cierra `abner-en-gabaon`.

**Dónde no encaja.** Un sitio sin nombre en medio de un viaje (el campamento amalequita de 1Sa 30, el lugar del primer encuentro de Elías con Abdías) no tiene una sola parada vecina de la que salir o a la que llegar, así que no se dibuja como área; sigue en la nota de la parada. Un lugar sin punto en medio del viaje tampoco.

## Capturas

La llegada de los astrólogos a Jerusalén, en 1440 de ancho y tema claro, a 0, 110, 225, 340 y 450 ms de la transición: el óvalo de Oriente se acerca a Jerusalén, se encoge y desaparece dentro de la parada.

![0 ms: Oriente abierto al este de Jerusalén](img/area-desconocida/cierre-1440-1.png)
![110 ms](img/area-desconocida/cierre-1440-2.png)
![225 ms](img/area-desconocida/cierre-1440-3.png)
![340 ms](img/area-desconocida/cierre-1440-4.png)
![450 ms: ya dentro de Jerusalén](img/area-desconocida/cierre-1440-5.png)

Lo mismo en un teléfono de 430 de ancho:

![430 de ancho, 0 a 450 ms](img/area-desconocida/cierre-430.png)

En el modo reunión no hay transición, como en todo el sitio: antes y después de la llegada.

![Modo reunión, antes de llegar](img/area-desconocida/reunion-abierta-1440.png)
![Modo reunión, ya en Jerusalén](img/area-desconocida/reunion-cerrada-1440.png)

![El origen con la leyenda: «Origen de los astrólogos de Oriente: Oriente, la fuente no dice dónde»](img/area-desconocida/origen-1440.png)
![La vuelta: un anillo alrededor de Belén, «su país, la fuente no dice dónde»](img/area-desconocida/vuelta-1440.png)
![La ficha de la parada 1: Oriente, la fuente no dice dónde, rumbo este](img/area-desconocida/ficha-1440.png)
![Modo lectura de Mateo 2 en el pasaje del origen](img/area-desconocida/lectura-1440.png)
![Balaam deja Peor hacia «su lugar», en un teléfono y en modo reunión](img/area-desconocida/balaam-430-reunion.png)

## Lo que queda por decidir

1. **Los viajes de grupo no tienen carril.** Por la decisión 1B de [viajes-modelo.md](viajes-modelo.md), un grupo no lleva marcador ni carril, así que el origen de los astrólogos y el de los 12.000 no tienen marca en la línea de tiempo; sí su ficha, su fila en la ficha del viaje, su pasaje en la lectura y su área en el mapa. Las áreas de Balaam y de Lot sí van en su carril. ¿Damos a los viajes de grupo un carril propio cuando se eligen?
2. **El rumbo de la vuelta de los astrólogos.** Mt 2:12 dice «su país» sin rumbo, aunque Mt 2:2 dice que vieron la estrella en Oriente. Lo dejamos sin rumbo, como un anillo en Belén. ¿Lo ponemos al este, con esa deducción escrita?
3. **El modo reunión no anima.** El sitio quita en él todo movimiento, y el área solo cambia de estado. ¿Lo dejamos así o el área es la excepción?
4. **Vueltas que se saben pero no se dibujan.** La campaña contra Moab (vuelven a su tierra, Israel), el funcionario etíope (sigue hacia Etiopía) y la campaña del norte de Josué (sale de Guilgal) podrían llevar una parada deducida y pendiente. Es otra regla, la de las paradas deducidas, y aquí no se toca.
5. **Un área junto al borde.** En el teléfono, si la parada vecina queda en el borde del mapa, el área puede caer bajo los botones; el encuadre no le hace sitio a propósito, para no alejar el mapa por algo que no tiene distancia.
