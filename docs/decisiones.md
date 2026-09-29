# Decisiones

Lo que ya está decidido. Cada punto dice qué hacemos y por qué. Si algo cambia, se cambia aquí y en el sitio del repo que lo aplique.

## Fuentes

- **jw.org y la Traducción del Nuevo Mundo son la fuente principal, y la información más reciente de jw.org gana.** Cuando dos publicaciones de jw.org difieren, vale la más nueva. El cambio se anota en el `historial` del hecho, con la fecha, la fuente antigua y la nueva, para que dentro de un año se vea qué se revisó y por qué. El método está en [investigación](investigacion/README.md).
- **Enlazamos, no copiamos.** Para enlazar a jw.org no hace falta permiso. Cada hecho lleva un resumen escrito con nuestras palabras, de una o dos líneas, y el enlace a wol.jw.org donde se lee la fuente completa. Ningún párrafo, mapa ni imagen de jw.org entra en el repo.
- **Los mapas son nuestros, hechos con datos abiertos.** De jw.org tomamos los hechos, es decir, qué ciudades, qué rutas, qué fechas y qué límites. El dibujo sale de Natural Earth, de las coordenadas de OpenBible y de nuestros propios estilos. Así el mapa se puede publicar con licencia libre y no depende de una imagen ajena.
- **Nivel 2 solo si jw.org lo ha usado.** Arqueología, papers y fotos externas entran cuando jw.org ha citado esa fuente o afirma lo mismo. Una fuente de nivel 2 solo vale junto a una de nivel 1 que la cite. Se marcan como nivel 2 y nunca contradicen en pantalla a la fuente principal: la fecha secular aparece como nota, no como fecha. Nada de otras confesiones.
- **Fecha secular solo donde jw.org la da.** Una fecha secular va en `alternativas` únicamente si una publicación de jw.org la menciona, como 587/586 frente a 607 a.e.c. o 465 frente a 475 para Artajerjes. Si ninguna publicación la da, no la ponemos.
- **Los partos entran solo con lo que dice Perspicacia.** «Babilonia» los pone al frente de la ciudad con Mitrídates I, a mediados del siglo II a.e.c., y «Partos» dice que seguían independientes en el siglo I. Por eso ese suceso es de nivel 1. Ningún otro rey ni suceso parto entra sin otra fuente de jw.org.
- **Fechas siempre con fuente.** Si jw.org da la fecha, es la fecha. Si no la da, se calcula a partir de datos de jw.org y se marca como cálculo nuestro, o se escribe «aprox.» y listo. Un hecho sin fuente no se publica.
- **Una fecha calculada lleva su cuenta y queda pendiente.** Una fecha `derivada` explica en `nota` de dónde sale, por ejemplo «año séptimo de Asuero, contando 495 como primer año», y lleva `estado: pendiente` hasta que una publicación la dé. Si el año sale de otro suceso, la ficha cita la fuente de ese suceso y lo dice en `razon`.
- **Coordenadas.** Cuando jw.org no sitúa un lugar, se usa una fuente externa que jw.org haya mencionado alguna vez. Si nadie lo sitúa con seguridad, se dibuja una zona o varios candidatos, nunca un punto inventado.
- **Un lugar incierto lleva candidatos, no un punto.** Cada candidato es una zona, un punto o una franja, con su estado (`seguro`, `favorecido_nivel_1`, `tradicion`, `alternativa`, `solo_nivel_2` o `descartado_nivel_1`), su fuente y su razón. El lugar queda sin `lat` ni `lon`. Cada punto dice de dónde sale: un registro de OpenBible (`openbible:<id>`) o un cálculo nuestro con la cuenta en `nota`, como «225 km al SO del Ararat». OpenBible solo da el punto, nunca la identificación.
- **Los capítulos de la Biblia son fuentes implícitas.** Un id como `mateo-26` que ningún fichero escribe lo crea la compilación a partir de [`data/libros.yaml`](../data/libros.yaml), con su enlace a la TNM de estudio. Un capítulo que no existe, como `mateo-29`, es un error. Así nadie teclea cientos de entradas iguales.
- **Un fichero de fuentes por tema.** Las fuentes viven en `data/fuentes/<tema>.yaml` y la compilación las junta. Un id repetido con los mismos datos se funde; con datos distintos es un error que nombra los dos ficheros. Así varias personas pueden añadir fuentes a la vez sin pisarse.

## Nombres e identidad

- **Un lugar o una persona es una sola entidad con todos sus nombres.** Afec y Antípatris son el mismo lugar; Jesúa y Josué, el mismo sumo sacerdote. La ficha muestra primero el nombre más conocido y debajo los demás, cada uno con la época en que se usó cuando la fuente lo dice. Cuantos más nombres, mejor: cada nombre es una vía de entrada desde Perspicacia, desde un mapa moderno o desde un registro histórico.
- **Los nombres por época llevan sus años o una nota.** Cada nombre de `nombres` puede llevar `desde` y `hasta` cuando la fuente da la época, y si no, una `nota` que dice cuándo se usó. Jebús llega hasta 1070 a.e.c.; Salem solo lleva nota.
- **El nombre que se ve en el mapa depende de la fecha del cursor.** En Hechos 23 se lee Antípatris; en Josué 12, Afec. Un nombre con fechas sustituye al principal solo cuando el principal también tiene fechas y el cursor queda fuera de ellas. Por eso Jerusalén no pasa a llamarse «Ciudad de David».
- **Una persona se reconoce por su entrada de Perspicacia.** Cada persona que sale al leer la Biblia lleva la clave `perspicacia`: el documento de su artículo y el número de la entrada si el artículo trata de varias. Dos fichas con la misma clave son la misma persona y se funden. El id de un homónimo nuevo es fijo (`<nombre>-hijo-de-<padre>`, o el reino en un rey), para que dos lectores que trabajan a la vez elijan el mismo.
- **Solo llevan ficha las personas y los lugares de la tierra.** Un dios, un título sin nombre, un lugar que solo sale en una visión o una construcción dentro de una ciudad no llevan ficha propia; van en la nota del pasaje o en los nombres de su ciudad. Israel es un solo lugar para la tierra y el reino del norte, igual que Judá; como pueblo no tiene ficha.
- **Los límites de las potencias mundiales siguen a jw.org.** Donde jw.org da fechas, se usan. Donde no, se escribe «aprox.» y se dibuja difuminado.

## Datos y código

- **La fuente de verdad son ficheros YAML, uno por entidad, en `data/`.** Se leen en un PR, se comentan línea a línea y su historia queda en git. De ahí salen, por compilación, el `data.json` que lee el sitio y una base SQLite para consultar y revisar con cualquier herramienta. Los dos son derivados: nunca se editan a mano y no se versionan.
- **Cada hecho lleva cuatro campos obligatorios.** `fuentes`, `razon` (por qué hacemos esa asociación), `consultado` (cuándo se leyó la fuente) y `estado` (`verificado` o `pendiente`). Un hecho sin estos campos no pasa la validación.
- **Textos de 40 palabras como mucho, con nuestras palabras.** `resumen`, `razon`, `nota` y los textos de los recorridos no pasan de 40 palabras y no repiten ocho palabras seguidas de la fuente. La validación mide la longitud; la copia se comprueba contra las páginas leídas.
- **La revisión anual recorre el registro.** `build.py` escribe un fichero por tipo en [`docs/investigacion/registro/`](investigacion/registro/README.md), y [`scripts/revisar.py`](../scripts/revisar.py) lista lo que lleva más de un año sin releer.
- **El sitio son scripts clásicos que comparten `window.BE`.** No usamos módulos ES porque desde `file://` el navegador bloquea los `import` locales, y el sitio tiene que abrir con doble clic. Cada tipo de entidad se registra en su propio fichero, así que varias personas pueden trabajar en el sitio a la vez.
- **Sitio estático, sin servidor.** MapLibre GL para el mapa, un `data.json` cargado en el navegador, sin cuentas ni base de datos en línea. Se despliega en GitHub Pages desde `main`.
- **Se aceptan PR.** La guía está en [CONTRIBUTING.md](../CONTRIBUTING.md). El CI valida el esquema, la integridad de los ids y los enlaces.
- **Licencia GPL-3.0** para el código y los datos propios. Las coordenadas de OpenBible se citan con su licencia CC BY 4.0.

## Alcance

- **Solo en español.** Interfaz, datos y documentación en español. No se prepara nada para otros idiomas hasta que haga falta.
- **Se construye por rebanadas completas, no por capas.** Primero los viajes y las cartas de Pablo, de punta a punta: datos verificados, mapa, línea de tiempo, fichas y búsqueda. Después Pedro y Hechos, la vida de Jesús, Judá bajo los persas y los reyes de Judá e Israel. Cada rebanada se publica cuando está completa. Lo hecho y lo que queda está en la [hoja de ruta](hoja-de-ruta.md).
- **Es una ayuda para el estudio en familia.** La aplicación sitúa el relato en su lugar y en su tiempo y lleva siempre a leer el pasaje. No explica ni interpreta.

## Vídeos de jw.org

- **Cada lugar, cada persona y cada capítulo tiene su lista de vídeos de jw.org que lo mencionan.** El índice se construye a partir de una copia privada de los subtítulos, que no se publica. En el repo solo queda la lista de vídeos con su título, su URL pública en jw.org y el número de menciones o de citas. El método está en [investigación/videos-jw.md](investigacion/videos-jw.md).
