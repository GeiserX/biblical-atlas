# Vídeos de jw.org por lugar, persona y pasaje

Guardamos qué vídeos públicos de jw.org hablan de cada lugar, de cada persona y de cada capítulo de la Biblia. Con eso, la ficha de Filipos enseña los vídeos que hablan de Filipos, y la de Hechos 16 y su modo lectura, los que citan ese capítulo, con enlace a cada uno. El índice de personas también está hecho, pero el sitio todavía no lo enseña.

Son tres índices. Cada uno está en dos sitios con el mismo contenido: un YAML por entidad para revisarlo y compararlo entre años, y un JSON para la web.

| Índice | YAML | JSON del sitio | Script |
|---|---|---|---|
| Lugares | `data/videos/<id>.yaml` | `site/videos.json` | `indexar.py` |
| Personas | `data/videos-personas/<id>.yaml` | `site/videos-personas.json` | `indexar.py` |
| Pasajes | `data/videos-pasajes/<libro>.yaml` | `site/videos-pasajes.json` | `pasajes.py` |

`site/videos.json` y `site/videos-personas.json` tienen la forma `{ "<id>": [ ... ] }`, con todos los ids de los nombres, también los que no tienen vídeos (lista vacía).

Cada vídeo de lugares y personas lleva:

| Campo | Qué es |
|---|---|
| `docid` | Identificador del vídeo en jw.org. Si el vídeo no tiene número de documento, su clave de publicación (por ejemplo `pub-apv_1_VIDEO`). |
| `titulo` | Título del vídeo según jw.org. |
| `url` | Página pública del vídeo en jw.org, la que devuelve el buscador `https://www.jw.org/finder?wtlocale=S&docid=<docid>`. |
| `publicado` | Fecha de primera publicación (`firstPublished` de la API de medios de jw.org), `AAAA-MM-DD`. |
| `menciones` | Veces que el lugar o la persona aparece en los subtítulos del vídeo. |
| `terminos` | Desglose de `menciones` por forma buscada, para saber por qué el vídeo está en la lista. |

`site/videos-pasajes.json` tiene la forma `{ "<libro>": { "serie": [ ... ], "capitulos": { "16": [ ... ] } } }`, con los 66 libros de [`data/libros.yaml`](../../data/libros.yaml). `serie` es el vídeo de «Información sobre los libros de la Biblia» de ese libro. Cada vídeo de pasajes lleva `docid`, `titulo`, `url` y `publicado` como arriba y, en los capítulos, dos campos más:

| Campo | Qué es |
|---|---|
| `por` | Por qué está: `titulo` (el título del catálogo cita el capítulo), `subtitulos` (los subtítulos lo citan) o los dos. |
| `citas` | Veces que los subtítulos citan el capítulo. 0 si solo entra por el título. |

## De dónde sale

El propietario del proyecto tiene una copia privada de los subtítulos en español (`.vtt`) de unos 2200 vídeos de jw.org, bajada con la herramienta de descarga del propietario. Esos subtítulos tienen derechos de autor de jw.org. **La carpeta vive fuera del repositorio y nunca se publica.** Al repositorio no llega ningún texto de los subtítulos, ni una frase, ni la lista de ficheros: solo nuestro índice (id, título, URL, fecha y recuentos).

El script [`scripts/videos/indexar.py`](../../scripts/videos/indexar.py) usa Python 3.12 y solo la biblioteca estándar. Hace esto:

1. Lee cada `.vtt` de la carpeta y le quita la cabecera, los tiempos y las etiquetas.
2. Cuenta las menciones de cada lugar y de cada persona con las reglas de más abajo. Este paso no usa la red.
3. Recorre los pares lugar-vídeo y persona-vídeo con 2 menciones o más, de mayor a menor. Para cada uno pide a jw.org la página pública del vídeo al buscador `finder` y la fecha de publicación a la API `mediator`, con un segundo de pausa entre peticiones.
4. Descarta el vídeo si el buscador lleva a la portada de jw.org, porque eso quiere decir que ya no está publicado.
5. Guarda los 12 vídeos con más menciones de cada lugar y de cada persona. Si el mismo vídeo aparece con y sin audiodescripciones, se queda uno: el de más menciones y, si empatan, el que no lleva audiodescripciones.

El script guarda las respuestas de jw.org en la caché `.biblical-earth-videos-cache.json`, dentro de la carpeta privada. Una segunda ejecución no hace peticiones de red.

[`scripts/videos/pasajes.py`](../../scripts/videos/pasajes.py) usa Python 3.12 y PyYAML, como [`build.py`](../../scripts/build.py), y no usa la red. El catálogo de medios de jw.org (`S.json`, que la herramienta de descarga deja en la misma carpeta) es la lista de lo publicado: da el título y la fecha, y un vídeo que ya no está en él no se enlaza. El enlace es el buscador público `https://www.jw.org/finder?wtlocale=S&lank=<clave>` (o `&docid=<docid>`), que lleva a la página del vídeo. Este script no añade ninguna consulta a jw.org.

## Cómo regenerarlo

Una sola vez, con todos los nombres ya fusionados, en este orden:

```sh
export BE_VTT_DIR=/ruta/a/la/carpeta/privada
python3 scripts/videos/indexar.py            # data/videos*, site/videos.json, site/videos-personas.json
python3 scripts/videos/pasajes.py            # data/videos-pasajes, site/videos-pasajes.json
python3 scripts/videos/indexar.py --fugas    # tiene que acabar con «hallazgos: 0»
git diff --stat data/videos data/videos-personas data/videos-pasajes site/videos*.json
```

Para probar sin tocar el repositorio, los dos scripts aceptan `--salida DIR` y escriben `data/` y `site/` debajo de `DIR`. `indexar.py` acepta además `--nombres DIR` y `--personas DIR` (otros ficheros de nombres), `--datos DIR` (otra carpeta `data/`) y `--sin-red`, que no pide nada a jw.org y usa, para lo que no está en la caché, el título y la fecha del catálogo local con el enlace del buscador. `pasajes.py` acepta `--libros RUTA` para probar otra tabla de libros. Con `--salida`, un id de nombres que no está en `data/` solo avisa; sin `--salida` es un error.

`BE_VTT_DIR` es obligatoria, porque el script no guarda ninguna ruta. La carpeta debe tener los `.vtt` y, si existen, los catálogos de la herramienta de descarga: `vtts.json` (el antiguo) y `jw_media.db` (el actual, tabla `downloaded_vtts`). De ellos el script solo lee la clave del vídeo y la fecha, y descarta el campo de texto de `vtts.json` nada más cargarlo. La clave de `jw_media.db` lleva el idioma (`pub-whbs_S_1_VIDEO`); el script lo quita (`pub-whbs_1_VIDEO`), la misma regla que cumplen los 1211 pares de `vtts.json`.

`indexar.py` borra y vuelve a escribir `data/videos/*.yaml`, `data/videos-personas/*.yaml`, `site/videos.json` y `site/videos-personas.json`; `pasajes.py`, `data/videos-pasajes/*.yaml` y `site/videos-pasajes.json`. Al terminar imprimen cuántos vídeos leyeron, cuántas entidades tienen vídeos y cuántas peticiones hicieron.

## Comprobación de fugas

`indexar.py --fugas` lee todos los ficheros de texto del repositorio (o de `--raiz DIR`) y falla si encuentra:

- 8 palabras seguidas que también están en algún subtítulo, comparadas sin tildes ni mayúsculas;
- el nombre de un fichero `.vtt` de la carpeta privada, con extensión o sin ella.

Los títulos no cuentan como fuga: los del catálogo de vídeos (son el índice), los de [`data/fuentes/*.yaml`](../../data/fuentes/) y una lista corta de nombres de publicaciones en el propio script. Se salta cualquier teja que está dentro de un título y cualquiera que toca un título entero de 4 palabras o más. La salida nombra el fichero del repositorio y las palabras, nunca el fichero `.vtt`.

La comprobación puede fallar: con una carpeta de prueba que lleva 12 palabras seguidas de un subtítulo real y el nombre de un `.vtt` con y sin extensión, da 7 hallazgos y termina con código 1; el fichero de control sin nada copiado no sale.

## Última ejecución (28 de septiembre de 2026)

Con los 2237 subtítulos, el catálogo de ese día, los 165 lugares de `data/lugares`, los nombres de personas de `scripts/videos/personas/` y la tabla de libros con «Salmo», «Revelación», «Isa» y «Rev» entre las formas (hacen falta para las citas de los subtítulos y de los títulos antiguos). La herramienta de descarga no encontró subtítulos nuevos: los 4985 medios del catálogo con número de pista ya estaban en su registro.

| Dato | Lugares | Personas |
|---|---|---|
| Con al menos un vídeo | 73 de 165 | 86 de 169 |
| Pares con 2 menciones o más | 975 | 1415 |
| Pares guardados (12 por id como máximo) | 393 | 417 |
| Vídeos distintos en el índice | 221 | 247 |

Ningún vídeo lleva a la portada. Los lugares sin vídeos aparecen en `site/videos.json` con una lista vacía. Los 29 lugares que ya tenían índice salen con los mismos vídeos que el 27 de septiembre. El título sale de la API `mediator`, porque la página del vídeo en la videoteca lleva el título genérico de la videoteca. Si `mediator` no conoce la clave, el buscador lleva a la portada de un idioma (`jw.org/en/`) y el vídeo se descarta.

Pasajes:

| Dato | Valor |
|---|---|
| Capítulos con al menos un vídeo | 802 de 1189 |
| Libros con su «Información sobre…» | 66 de 66 (Hechos recibe «Información sobre Hechos de los Apóstoles») |
| Entradas por la serie, por el título y por los subtítulos | 66, 604 y 4370 |
| Citas a capítulos que no existen | 0 |
| Vídeos con citas que ya no están en el catálogo | 6, no se enlazan |
| Tamaño de `site/videos-pasajes.json` | 1,1 MB, 139 KB con gzip |

Una cita inventada en una copia de un `.vtt` (un capítulo de Números que ningún vídeo cita) sale en ese capítulo con `por: [subtitulos]`; sin ella, el capítulo no tiene vídeos. Es la prueba de que el índice puede fallar.

## Reglas de búsqueda de lugares y personas

Los nombres están en [`scripts/videos/nombres/`](../../scripts/videos/nombres/) (lugares) y [`scripts/videos/personas/`](../../scripts/videos/personas/) (personas), un fichero por carril de trabajo ([`pablo.yaml`](../../scripts/videos/nombres/pablo.yaml) para los viajes de Pablo), con el mismo id que usa el resto de los datos. Un id que sale en dos ficheros es un error, y también un id que no está en `data/lugares` o `data/personas`. Son los nombres de la Traducción del Nuevo Mundo en español.

- **Palabra completa.** «Roma» no cuenta dentro de «romano» ni «Malta» dentro de «maltas». En los nombres de varias palabras se admiten comas entre ellas: «Mira en Licia» cuenta «Mira, en Licia».
- **Mira.** «Mira» suelto es casi siempre el verbo, así que Mira solo cuenta como «Mira en Licia» o «Mira de Licia» (Hechos 27:5).
- **Sin tildes, con mayúsculas.** «Efeso» y «Éfeso» cuentan igual. El nombre del lugar tiene que ir con mayúscula, así que «malta», el cereal, y «tiro», el disparo, no cuentan.
- **Tildes estrictas donde hace falta.** Atalia, el puerto de Hechos 14:25, se escribe sin tilde; Atalía, la reina de 2 Reyes 11, con tilde. Tiro se compara igual, para no contar «Tiró» a principio de frase.
- **Gentilicios.** «corintios», «filipenses», «efesios», «tesalonicenses», «colosenses», «gálatas», «atenienses», «bereanos», «cretenses» y «macedonios» cuentan para su lugar, salvo si van seguidos de un número. «Filipenses 4:13» cita un versículo y no habla de la ciudad.
- **Romanos no cuenta para Roma.** Fuera de las citas de la carta, «los romanos» casi siempre habla del imperio o de sus soldados.
- **Exclusiones.** «Cesarea de Filipo» no cuenta para Cesarea, que en los viajes de Pablo es el puerto. «Nueva Jerusalén» no cuenta para Jerusalén. «Macedonia del Norte» (el país actual) no cuenta para Macedonia.
- **Personas con nombre compartido.** Una persona no se busca por un nombre suelto que llevan varias: «Juan», «María», «Simón», «Santiago», «Judas», «José», «Herodes», «Felipe», «Zacarías», «Ananías», «Jacobo», «Lázaro», «Darío», «Agripa», «Artajerjes», «Asuero», «Jehoram», «Joás», «Jeroboán», «Azarías» o «Eleazar» es un error. Hace falta una forma calificada: «Juan el Bautista», «Herodes Agripa». Sí valen nombres que no se confunden, como «Nehemías», «Mardoqueo» o «Zorobabel».
- **Personas que dan nombre a un libro.** «Nehemías 8:10», «Timoteo, capítulo 3», «2 Timoteo», «Primera a Timoteo», «el capítulo 8 de Nehemías» y «el libro de Nehemías» citan el libro y no cuentan para la persona.
- **Antioquía.** «Antioquía de Siria» y «Antioquía de Pisidia» van a su lugar. Una «Antioquía» suelta se asigna mirando 250 caracteres a cada lado: Pisidia, Iconio, Listra, Derbe, Perga o Panfilia la llevan a Antioquía de Pisidia; Siria, Seleucia, cristianos, «Bernabé y Saulo» o Agabo, a Antioquía de Siria. Si no hay pistas o empatan, va a Antioquía de Siria, que es la congregación desde la que salen los tres viajes. El desglose la marca como `Antioquía (sin apellido)`.

## Reglas de pasajes

Las formas de cada libro salen de `nombre` y `habladas` en `data/libros.yaml`. Se comparan sin tildes y con mayúsculas.

- **Tres maneras de citar en los subtítulos.** «Hechos 16:14», «Hechos, capítulo 16» y «el capítulo 16 de Hechos» (también «del libro de»). Un nombre de libro sin número no cuenta.
- **Libros con número.** «1 Corintios 13:4» y también la forma hablada con ordinal: «Primera a los Corintios», «primera carta a los corintios», «Segundo de Reyes». «1 Juan 4:8» no cuenta para Juan.
- **Tramos y listas.** «Génesis 6:1-8:22» pone el vídeo en Génesis 6, 7 y 8. «Mateo 21:23-46; 22:15-46» sigue en el mismo libro: Mateo 21 y 22. «3:1-6, 10-13» son versículos del capítulo 3.
- **Libros de un capítulo.** En Abdías, Filemón, 2 Juan, 3 Juan y Judas el número suelto es el versículo: «Judas 3» es Judas 1.
- **Capítulos que no existen.** «Mateo 29» no cuenta y se suma en el recuento de descartadas.
- **Títulos del catálogo.** Además de las formas de arriba, cuentan las abreviaturas de la TNM con capítulo y versículo: «(2Ti 3:16)», «(Hch 24:15)». En los subtítulos no, porque «Da», «Le» o «Am» sueltas son palabras. Si la versión en vídeo de una publicación no lleva la cita y la de audio sí («Para esto he venido al mundo» y su audio con «(Mateo 21:23-46; 22:15-46)»), la del audio cuenta para el vídeo.
- **La serie.** «Información sobre Hechos de los Apóstoles» va a Hechos por la forma más larga con la que empieza el resto del título. «Información sobre la Biblia» no va a ningún libro.
- **Orden.** En cada capítulo van primero los vídeos cuyo título lo cita, después los demás por número de citas. Se guardan 12 como mucho. Un vídeo con y sin audiodescripciones sale una vez, sin ellas.

## Límites conocidos

- **Lugares que siguen existiendo.** Roma, Atenas, Damasco, Chipre, Creta y Malta salen también en noticias y experiencias actuales. Un vídeo sobre la sucursal de Grecia puede nombrar Atenas sin hablar de Pablo. El desglose y el título ayudan a separarlos, pero el índice no los filtra.
- **Antioquía.** La regla de contexto falla si un vídeo habla de las dos ciudades seguidas o de ninguna con pistas cerca. Los recuentos de `Antioquía (sin apellido)` son orientativos.
- **Jerusalén** aparece en cientos de vídeos del Antiguo y del Nuevo Testamento. Los 12 con más menciones no tienen por qué ser los que tratan de Pablo en Jerusalén.
- **Tiro** puede colarse como el verbo al principio de una frase, como en «Tiro la pelota».
- **Nombres de cartas.** «Gálatas y Efesios» dicho como nombres de libros cuenta aunque no lleve número detrás.
- **Un lugar por entrada de `data/lugares`.** `scripts/videos/nombres/` tiene una entrada por cada lugar de los datos y ninguna más. Un lugar nuevo necesita su entrada.
- **Solo los vídeos que tenemos.** Un vídeo sin subtítulos en la copia privada no entra, aunque hable del lugar. La herramienta de descarga no pide los subtítulos de los medios del catálogo sin número de pista: en septiembre de 2026 eran 50, entre ellos 16 lecturas dramatizadas de la Biblia, 9 relatos bíblicos y 6 películas de tiempos bíblicos. Esos vídeos entran en el índice de pasajes solo por su título.
- **Personas con nombres de hoy.** «Pablo», «Pedro» o «Esteban» también son nombres de personas de hoy que cuentan su experiencia en algunos vídeos. El recuento no los separa; el título ayuda.
- **Una persona seguida de un número.** «Timoteo, 2 veces» se toma por una cita del libro y no cuenta.
- **Citas con números sueltos.** «Mateo 24, 25 y 26» cuenta solo Mateo 24, porque los números que siguen pueden ser versículos.
- **Solo vídeos.** Las lecturas dramatizadas que solo están en audio (8 publicaciones con citas en septiembre de 2026) no entran en el índice de pasajes.

## Revisión anual

jw.org publica vídeos nuevos cada mes. Una vez al año:

1. Bajar los subtítulos nuevos con la herramienta de descarga del propietario a la misma carpeta privada.
2. Volver a ejecutar `indexar.py` y `pasajes.py`. `indexar.py` solo pide a jw.org los vídeos que no estén en la caché. Para comprobar también si los antiguos siguen publicados, borrar antes la caché.
3. Pasar `indexar.py --fugas`.
4. Revisar el cambio con `git diff data/videos data/videos-personas data/videos-pasajes`: vídeos nuevos, vídeos que desaparecen, recuentos que cambian.
5. Si un vídeo nuevo trae un dato o un entendimiento que afecte a un lugar, anotarlo en la ficha del lugar con su fuente.
