# Área desconocida: de dónde viene un viaje cuando la fuente no lo sitúa

## El problema

> Cuando jw.org no lo especifica y dice que no sabe dónde está ese «Oriente», que se quede como está, con un «área desconocida». Luego podemos animar esa área, como si sus paredes se vinieran abajo mientras se mueve hacia el destino, bastante rápido, para ser completos y fieles a los hechos. Creo que se puede hacer en muchas cosas, por ejemplo cuando no sabes dónde acaba de verdad un viaje.

> No lo pongas en un sitio neutro, en ninguna parte: haz una conjetura con fundamento de dónde pudo estar, investigando en jw.org y en otras fuentes.

Hasta ahora, un viaje cuyo texto nombra una salida o una vuelta sin situarla empezaba o acababa en el primer lugar con ficha. Los astrólogos salían de Jerusalén, aunque Mateo dice que vienen de Oriente, y su vuelta «a su país» no se dibujaba. Los 12.000 salían de Jabés-Galaad, aunque Jueces los manda desde el campamento. El mapa no mentía, pero callaba la mitad del relato.

## Qué hemos hecho

**Los datos.** Una parada puede ser un área desconocida: `place: null` y una sola clave nueva, `unknown_area`, con las palabras de la fuente (`words`, 7 como mucho, para que nunca formen una racha de 8 copiadas) y, solo si la fuente lo da, el rumbo (`direction`, uno de los ocho de la rosa). No hay coordenadas ni ficha de lugar inventada. Lo demás es lo de cualquier parada: `reference`, `date`, `note`, `sources`, `reason`, `checked_on` y `status`. Solo puede ir primera o última, y el viaje necesita al menos una parada con lugar. Si una publicación deja adivinar dónde estaba, el área lleva `guesses`: una o varias zonas, la preferida primero, cada una una forma (elipse, círculo, caja o polígono) con su nombre corto, su nota, sus fuentes, su razón con nuestras palabras y `status: conjecture`, que dice que es una conjetura y no lo que dice el texto. `validate.py` lo comprueba y `build.py` la pasa a `data.json` igual que en el YAML, con `lugar: null` y `unknown_area`; el servidor MCP del atlas lee el fichero sin cambios y enseña la parada sin lugar. El esquema está en [la investigación](../investigacion/README.md), apartado «Viajes».

**El mapa.** Un área con zona conjeturada se dibuja en esa zona, con el aspecto de lo incierto (contorno de trazos, relleno claro y halo) en el color del viaje, un hilo de puntos hasta la parada vecina y un rótulo con las palabras de la fuente y «zona probable: Babilonia». Las otras zonas van más claras, con «o Media». La leyenda dice «Origen de los astrólogos de Oriente: Oriente; zona probable: Babilonia, según Perspicacia «Este»», y la ficha de la parada da cada zona con su razón, sus fuentes y «No es lo que dice el texto». Nadie se sitúa en la zona: `BE.donde` no da posición y el marcador de la persona no se dibuja allí. Al elegir el viaje, o la parada del área, el encuadre cuenta la zona preferida, que es una conjetura con fuente; las otras no alejan el mapa. Un área sin zona (hoy, solo un lugar sin punto ni candidato) se dibuja como antes: un óvalo de trazos en píxeles de pantalla junto a la parada vecina, hacia el rumbo de la fuente o como un anillo, que el encuadre no cuenta. En los dos casos, pulsarla abre la ficha de su parada, nunca la de un lugar.

**La animación.** El área depende solo de la fecha. La de origen se ve hasta que el viaje llega a su vecina; al cruzar ese momento, cada vértice de la zona va hacia la parada mientras se apaga, así que el contorno se cierra a la vez que entra en ella. La de destino hace lo contrario al salir de la última parada: se abre desde ella hacia su zona. Dura 0,45 s de reloj, sea cual sea la velocidad, y es la misma al arrastrar el cursor, hacia delante y hacia atrás, porque el estado sale de la fecha y no del movimiento. Con «reducir movimiento», o en el modo reunión, que en el sitio quita todo movimiento, solo hay los dos estados. Sin biblioteca: `requestAnimationFrame` y la fuente de datos del mapa para la zona, y una transición de CSS para el óvalo de un área sin zona.

**El tiempo.** El área no entra en el reparto de las paradas: va pegada a su vecina, un tramo de camino (0,04 años) antes de la llegada o después de la salida, como estimada. Si la fecha del viaje no deja sitio, el área sale de ella y el viaje se dibuja también ese rato, porque sin eso el origen de los astrólogos, que están en Jerusalén desde el primer día de su fecha, nunca se vería abierto. Mientras el viaje está en un área, nadie lo sitúa: `BE.donde` no da posición y el marcador de la persona no se dibuja.

**Las fichas, la línea y la lectura.** La ficha del área dice su orden («Parada 1 de 4 · Origen»), que la fuente no dice dónde, el rumbo si lo hay, la nota, el pasaje y un botón a la parada vecina. La ficha del viaje la lista como las demás. En el carril de una persona (Balaam, Lot) el área es una marca más de su viaje. En el modo lectura, cada área es un pasaje propio: el origen va antes que lo demás de su versículo y el destino después, y al pisarlo el mapa no se mueve si la parada vecina ya se ve; si no se ve, va a ella, nunca a la época.

## Dónde se ha usado

Leímos cada viaje cuya primera o última parada se quedó fuera porque el texto no la sitúa. El área entra solo cuando el texto cuenta esa salida o esa vuelta con palabras propias para el sitio, y su zona sale de lo que dicen las publicaciones. Todas las zonas son conjeturas.

| Viaje y área | Qué dice el texto | Qué dicen las fuentes | Zona dibujada y cuán segura |
|---|---|---|---|
| Astrólogos, origen «Oriente» (rumbo este) | Vienen de Oriente; allí vieron la estrella (Mt 2:1, 2). | Perspicacia «Este»: llegaron desde el lado de Babilonia, desde el este. «Astrólogos»: los estudios hacen de Babilonia el centro de esa magia; Heródoto los hacía tribu meda. *Jesús: el camino*, cap. 7: siguieron la estrella cientos de kilómetros desde su país. | Babilonia, elipse de 480 × 220 km sobre la llanura del Éufrates y el Tigris: la conjetura más fundada, porque una fuente nombra la dirección. Media, elipse de 520 × 300 km: otra propuesta que recoge «Astrólogos», más débil. |
| Astrólogos, destino «su país» (rumbo este) | Vuelven a su país por otro camino (Mt 2:12). | *Jesús: el camino*, cap. 7: su país es donde vieron la estrella, en Oriente. | Las mismas dos zonas y la misma confianza. |
| Los 12.000, origen «el campamento» | El pueblo los manda desde el campamento donde se había reunido (Jue 21:8-10). | El texto pone la asamblea en Mizpá (Jue 20:1; 21:5, 8), al pueblo en Betel (21:2) y el campamento en Siló a la vuelta (21:12). Perspicacia «Mizpá» pone allí la reunión de los guerreros y «Siló», la llegada de las 400; ninguna sitúa el campamento al enviarlos. | Elipse de 26 × 12 km que abarca Mizpá, Betel y Siló: bastante segura en la región, nada en el punto. |
| Lot, destino «la región montañosa» | Por miedo deja Zóar y vive con sus hijas en una cueva de la región montañosa (Gé 19:30). | Perspicacia «Zóar»: la ciudad estaba en Moab o cerca, junto a los montes moabitas, al sudeste del mar Muerto, y la cueva en la región montañosa cercana. «Lot»: de las hijas descienden Moab y Ammón. | Montes de Moab junto a Zóar, elipse de 64 × 20 km al este del sur del mar Muerto: conjetura razonable, porque la fuente dice «cercana» y Zóar misma es incierta. |
| Balaam, destino «su lugar» | Se va a su lugar (Nú 24:25); más tarde muere con los jefes madianitas (Nú 31:8; Jos 13:21, 22). | Perspicacia «Balaam»: la expresión solo dice que dejó Peor, no que volviera a Petor, y cita que se quedó entre los madianitas. «Madián»: en tiempos de Moisés muchos madianitas vivían junto a Moab y al reino de Sehón. | Madianitas junto a Moab, elipse de 100 × 60 km en la meseta al este de Peor: la preferida. Petor, círculo de 60 km alrededor de su punto incierto: posible, porque la fuente no la descarta. |
| Correos de Ezequías | Van hasta Zabulón (2Cr 30:10); no cuenta la vuelta. Gente de Aser también acude (30:11). | Perspicacia «Ezequías» y «Zabulón» no cuentan la vuelta. | Ninguna: el texto no cuenta ese movimiento, así que no hay área. Una vuelta a Jerusalén sería una parada deducida. |
| `abimelec-va-a-ver-a-isaac` | Se van en paz (Gé 26:31), sin palabras para el sitio. | Venían de Guerar (26:26). | Ninguna: la vuelta a Guerar sería una parada deducida. |
| `amos-a-betel` | Amasías le manda huir a Judá (Am 7:12); el texto no dice que fuera. | | Ninguna: no se cuenta la vuelta. |
| `campana-contra-moab` | Vuelven a su tierra (2Re 3:27). | Su tierra se sabe: Israel, que sale de Samaria (3:6). | Ninguna: sería una vuelta deducida, no un área. |
| `israel-contra-benjamin` | Cada uno se va a su tribu y a su herencia (Jue 21:24). | | Ninguna: es cada territorio, no un sitio. |
| `regreso-del-funcionario-etiope` | Sigue su camino (Hch 8:39); su tierra es Etiopía (8:27). | Etiopía tiene ficha. | Ninguna: sería una llegada deducida. |
| `juda-y-simeon-contra-los-cananeos`, `ehud-libra-a-israel-de-moab`, `campana-del-norte-de-josue`, `joab-en-gabaon`, `pedro-de-lida-a-cesarea`, `juda-a-timna`, `nabucodonosor-contra-jerusalen-617`, `abner-lleva-a-mical-a-hebron` | Salen sin que el texto nombre de dónde. | Algunos tienen una salida deducible (Guilgal para Josué, Hebrón para Joab). | Ninguna: sin palabras para el sitio. |
| `apolos-de-efeso-a-corinto`, `bernabe-y-marcos-a-chipre`, `elias-huye-al-horeb` | El texto no narra ese tramo. | | Ninguna. |

**Un lugar sin punto ni candidato** en un extremo del viaje se dibuja como un área sin zona, con su nombre y «sin ubicación conocida». Hoy ninguna parada de viaje cae en un lugar así; la prueba lo comprueba quitando en una copia de los datos los candidatos de Mahanaim, que abre y cierra `abner-en-gabaon`. La conjetura de un lugar así ya tiene su sitio en el esquema: un candidato de zona en su ficha. Son trece (Enoc, Nod, Elasar, Goyim, Pitom, Pul y otros) y ninguno es parada de un viaje; investigarlos es trabajo de las fichas de lugar, no de este cambio.

**Dónde no encaja.** Un sitio sin nombre en medio de un viaje (el campamento amalequita de 1Sa 30, el lugar del primer encuentro de Elías con Abdías) no tiene una sola parada vecina de la que salir o a la que llegar, así que no se dibuja como área; sigue en la nota de la parada. Un lugar sin punto en medio del viaje tampoco.

## Capturas

La llegada de los astrólogos a Jerusalén, en 1440 de ancho y tema claro, a 0, 110, 225, 340 y 450 ms de la transición: la zona de Babilonia se va hacia Jerusalén mientras se cierra y se apaga, y Media se apaga con ella.

![0 ms: Oriente abierto en su zona probable, Babilonia](img/area-desconocida/cierre-1440-1.png)
![110 ms](img/area-desconocida/cierre-1440-2.png)
![225 ms](img/area-desconocida/cierre-1440-3.png)
![340 ms](img/area-desconocida/cierre-1440-4.png)
![450 ms: ya dentro de Jerusalén](img/area-desconocida/cierre-1440-5.png)

Lo mismo en un teléfono de 430 de ancho:

![430 de ancho, 0 a 450 ms](img/area-desconocida/cierre-430.png)

En el modo reunión no hay transición, como en todo el sitio: antes y después de la llegada.

![Modo reunión, antes de llegar](img/area-desconocida/reunion-abierta-1440.png)
![Modo reunión, ya en Jerusalén](img/area-desconocida/reunion-cerrada-1440.png)

![El origen con la leyenda: «Origen de los astrólogos de Oriente: Oriente; zona probable: Babilonia, según Perspicacia «Este»»](img/area-desconocida/origen-1440.png)
![La vuelta: su país, abierto de nuevo en Babilonia](img/area-desconocida/vuelta-1440.png)
![La ficha de la parada 1: Oriente, la fuente no dice dónde, y la conjetura con sus fuentes](img/area-desconocida/ficha-1440.png)
![Modo lectura de Mateo 2 en el pasaje del origen](img/area-desconocida/lectura-1440.png)
![Balaam deja Peor hacia «su lugar»: los madianitas junto a Moab, o Petor; en un teléfono y en modo reunión](img/area-desconocida/balaam-430-reunion.png)

## Lo que queda por decidir

1. **Los viajes de grupo no tienen carril.** Por la decisión 1B de [viajes-modelo.md](viajes-modelo.md), un grupo no lleva marcador ni carril, así que el origen de los astrólogos y el de los 12.000 no tienen marca en la línea de tiempo; sí su ficha, su fila en la ficha del viaje, su pasaje en la lectura y su zona en el mapa. Las áreas de Balaam y de Lot sí van en su carril. ¿Damos a los viajes de grupo un carril propio cuando se eligen?
2. **¿Media se queda?** Es la propuesta que «Astrólogos» recoge y deja atrás. Si sobra, la conjetura queda solo en Babilonia.
3. **El modo reunión no anima.** El sitio quita en él todo movimiento, y el área solo cambia de estado. ¿Lo dejamos así o el área es la excepción?
4. **El modo lectura no se mueve hacia la zona.** Al pisar el pasaje del área, el mapa se queda si la parada vecina ya se ve, así que Babilonia puede quedar fuera. Elegir la parada o el viaje sí la encuadra.
5. **Vueltas que se saben pero no se dibujan.** La campaña contra Moab, el funcionario etíope y la campaña del norte de Josué podrían llevar una parada deducida y pendiente. Es otra regla, la de las paradas deducidas, y aquí no se toca.
6. **Los trece lugares sin punto ni candidato** se quedan para las fichas de lugar: su conjetura es un candidato de zona, y ninguno es parada de un viaje.
