# Decisiones

Lo que ya está decidido. Cada punto dice qué hacemos y por qué. Si algo cambia, se cambia aquí y en el sitio del repo que lo aplique.

## Fuentes

- **jw.org y la Traducción del Nuevo Mundo son la fuente principal, y la información más reciente de jw.org gana.** Cuando dos publicaciones de jw.org difieren, vale la más nueva. El cambio se anota en el `historial` del hecho, con la fecha, la fuente antigua y la nueva, para que dentro de un año se vea qué se revisó y por qué. El método está en [investigación](investigacion/README.md).
- **Enlazamos, no copiamos.** Para enlazar a jw.org no hace falta permiso. Cada hecho lleva un resumen escrito con nuestras palabras, de una o dos líneas, y el enlace a wol.jw.org donde se lee la fuente completa. Ningún párrafo, mapa ni imagen de jw.org entra en el repo.
- **Los mapas son nuestros, hechos con datos abiertos.** De jw.org tomamos los hechos, es decir, qué ciudades, qué rutas, qué fechas y qué límites. El dibujo sale de Natural Earth, de las coordenadas de OpenBible y de nuestros propios estilos. Así el mapa se puede publicar con licencia libre y no depende de una imagen ajena.
- **Nivel 2 solo si jw.org lo ha usado.** Arqueología, papers y fotos externas entran cuando jw.org ha citado esa fuente o afirma lo mismo. Se marcan como nivel 2 y nunca contradicen en pantalla a la fuente principal: la fecha secular aparece como nota, no como fecha. Nada de otras confesiones.
- **Fechas siempre con fuente.** Si jw.org da la fecha, es la fecha. Si no la da, se calcula a partir de datos de jw.org y se marca como cálculo nuestro, o se escribe «aprox.» y listo. Un hecho sin fuente no se publica.
- **Coordenadas.** Cuando jw.org no sitúa un lugar, se usa una fuente externa que jw.org haya mencionado alguna vez. Si nadie lo sitúa con seguridad, se dibuja una zona o varios candidatos, nunca un punto inventado.

## Nombres e identidad

- **Un lugar o una persona es una sola entidad con todos sus nombres.** Afec y Antípatris son el mismo lugar; Jesúa y Josué, el mismo sumo sacerdote. La ficha muestra primero el nombre más conocido y debajo los demás, cada uno con la época en que se usó cuando la fuente lo dice. Cuantos más nombres, mejor: cada nombre es una vía de entrada desde Perspicacia, desde un mapa moderno o desde un registro histórico.
- **El nombre que se ve en el mapa depende de la fecha del cursor.** En Hechos 23 se lee Antípatris; en Josué 12, Afec.
- **Los límites de las potencias mundiales siguen a jw.org.** Donde jw.org da fechas, se usan. Donde no, se escribe «aprox.» y se dibuja difuminado.

## Datos y código

- **La fuente de verdad son ficheros YAML, uno por entidad, en `data/`.** Se leen en un PR, se comentan línea a línea y su historia queda en git. De ahí salen, por compilación, el `data.json` que lee el sitio y una base SQLite para consultar y revisar con cualquier herramienta. Los dos son derivados: nunca se editan a mano y no se versionan.
- **Cada hecho lleva cuatro campos obligatorios.** `fuentes`, `razon` (por qué hacemos esa asociación), `consultado` (cuándo se leyó la fuente) y `estado` (`verificado` o `pendiente`). Un hecho sin estos campos no pasa la validación.
- **Sitio estático, sin servidor.** MapLibre GL para el mapa, un `data.json` cargado en el navegador, sin cuentas ni base de datos en línea. Se despliega en GitHub Pages desde `main`.
- **Se aceptan PR.** La guía está en [CONTRIBUTING.md](../CONTRIBUTING.md). El CI valida el esquema, la integridad de los ids y los enlaces.
- **Licencia GPL-3.0** para el código y los datos propios. Las coordenadas de OpenBible se citan con su licencia CC BY 4.0.

## Alcance

- **Solo en español.** Interfaz, datos y documentación en español. No se prepara nada para otros idiomas hasta que haga falta.
- **Se construye por rebanadas completas, no por capas.** Primero los viajes y las cartas de Pablo, de punta a punta: datos verificados, mapa, línea de tiempo, fichas y búsqueda. Después Pedro, después la vida de Jesús, después los reyes de Judá e Israel. Cada rebanada se publica cuando está completa.
- **Es una ayuda para el estudio en familia.** La aplicación sitúa el relato en su lugar y en su tiempo y lleva siempre a leer el pasaje. No explica ni interpreta.

## Vídeos de jw.org

- **Cada lugar enlaza a los vídeos de jw.org que lo mencionan.** El índice se construye a partir de una copia privada de los subtítulos, que no se publica. En el repo solo queda, por lugar, la lista de vídeos con su título, su URL pública en jw.org y el número de menciones. El método está en [investigación/videos-jw.md](investigacion/videos-jw.md).
