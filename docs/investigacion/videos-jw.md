# Videos de jw.org que nombran cada lugar

Para cada lugar de los viajes y las cartas de Pablo guardamos qué videos públicos de jw.org lo mencionan. Con él, la ficha de Filipos puede ofrecer «Videos que hablan de Filipos», con enlace a cada uno.

El índice está en dos sitios con el mismo contenido:

- `data/videos/<id del lugar>.yaml`, un fichero por lugar, para revisarlo y compararlo entre años.
- `site/videos.json`, el mismo índice en un solo fichero para la web, con la forma `{ "<id del lugar>": [ ... ] }`. Los lugares sin videos aparecen con una lista vacía.

Cada video lleva:

| Campo | Qué es |
|---|---|
| `docid` | Identificador del video en jw.org. Si el video no tiene número de documento, su clave de publicación (por ejemplo `pub-apv_1_VIDEO`). |
| `titulo` | Título del video según jw.org. |
| `url` | Página pública del video en jw.org, la que devuelve el buscador `https://www.jw.org/finder?wtlocale=S&docid=<docid>`. |
| `publicado` | Fecha de primera publicación (`firstPublished` de la API de medios de jw.org), `AAAA-MM-DD`. |
| `menciones` | Veces que el lugar aparece en los subtítulos del video. |
| `terminos` | Desglose de `menciones` por forma buscada, para saber por qué el video está en la lista. |

## De dónde sale

El propietario del proyecto tiene una copia privada de los subtítulos en español (`.vtt`) de unos 1200 videos de jw.org, bajada con la herramienta de descarga del propietario. Esos subtítulos tienen derechos de autor de jw.org. **La carpeta vive fuera del repositorio y nunca se publica.** Al repositorio no llega ningún texto de los subtítulos, ni una frase, ni la lista de ficheros: solo nuestro índice (id, título, URL, fecha y recuentos).

El script [`scripts/videos/indexar.py`](../../scripts/videos/indexar.py) usa Python 3.12 y solo la biblioteca estándar. Hace esto:

1. Lee cada `.vtt` de la carpeta y le quita la cabecera, los tiempos y las etiquetas.
2. Cuenta las menciones de cada lugar con las reglas de más abajo. Este paso no usa la red.
3. Recorre los pares lugar-video con 2 menciones o más, de mayor a menor. Para cada uno pide a jw.org la página pública del video al buscador `finder` y la fecha de publicación a la API `mediator`, con un segundo de pausa entre peticiones.
4. Descarta el video si el buscador lleva a la portada de jw.org, porque eso quiere decir que ya no está publicado.
5. Guarda los 12 videos con más menciones de cada lugar. Si el mismo video aparece con y sin audiodescripciones, se queda uno: el de más menciones y, si empatan, el que no lleva audiodescripciones.

El script guarda las respuestas de jw.org en la caché `.biblical-earth-videos-cache.json`, dentro de la carpeta privada. Una segunda ejecución no hace peticiones de red.

## Cómo regenerarlo

```sh
BE_VTT_DIR=/ruta/a/la/carpeta/privada python3 scripts/videos/indexar.py
```

`BE_VTT_DIR` es obligatoria, porque el script no guarda ninguna ruta. La carpeta debe tener los `.vtt` y, si existen, los catálogos de la herramienta de descarga: `vtts.json` (el antiguo) y `jw_media.db` (el actual, tabla `downloaded_vtts`). De ellos el script solo lee la clave del video y la fecha, y descarta el campo de texto de `vtts.json` nada más cargarlo. La clave de `jw_media.db` lleva el idioma (`pub-whbs_S_1_VIDEO`); el script lo quita (`pub-whbs_1_VIDEO`), la misma regla que cumplen los 1211 pares de `vtts.json`.

El script borra y vuelve a escribir `data/videos/*.yaml` y `site/videos.json`. Al terminar imprime cuántos videos leyó, cuántos lugares tienen videos y cuántas peticiones hizo.

## Última ejecución (27 de septiembre de 2026)

Con la descarga completa de subtítulos y los 58 lugares de `data/lugares`.

| Dato | Valor |
|---|---|
| Videos leídos | 2237, todos con clave |
| Lugares con al menos un video | 29 de 58 |
| Pares lugar-video con 2 menciones o más | 386 |
| Pares guardados (12 por lugar como máximo) | 166 |
| Videos distintos en el índice | 105, ninguno lleva a la portada |

Los 29 lugares sin videos (por ejemplo Anfípolis, Samotracia o Rodas) aparecen en `site/videos.json` con una lista vacía. El título sale de la API `mediator`, porque la página del video en la videoteca lleva el título genérico de la videoteca. Si `mediator` no conoce la clave, el buscador lleva a la portada de un idioma (`jw.org/en/`) y el video se descarta.

## Reglas de búsqueda

Los nombres están en [`scripts/videos/nombres/`](../../scripts/videos/nombres/), un fichero por carril de trabajo ([`pablo.yaml`](../../scripts/videos/nombres/pablo.yaml) para los viajes de Pablo), con el mismo id de lugar que usa el resto de los datos. Un id que sale en dos ficheros es un error. Son los nombres de la Traducción del Nuevo Mundo en español.

- **Palabra completa.** «Roma» no cuenta dentro de «romano» ni «Malta» dentro de «maltas». En los nombres de varias palabras se admiten comas entre ellas: «Mira en Licia» cuenta «Mira, en Licia».
- **Mira.** «Mira» suelto es casi siempre el verbo, así que Mira solo cuenta como «Mira en Licia» o «Mira de Licia» (Hechos 27:5).
- **Sin tildes, con mayúsculas.** «Efeso» y «Éfeso» cuentan igual. El nombre del lugar tiene que ir con mayúscula, así que «malta», el cereal, y «tiro», el disparo, no cuentan.
- **Tildes estrictas donde hace falta.** Atalia, el puerto de Hechos 14:25, se escribe sin tilde; Atalía, la reina de 2 Reyes 11, con tilde. Tiro se compara igual, para no contar «Tiró» a principio de frase.
- **Gentilicios.** «corintios», «filipenses», «efesios», «tesalonicenses», «colosenses», «gálatas», «atenienses», «bereanos», «cretenses» y «macedonios» cuentan para su lugar, salvo si van seguidos de un número. «Filipenses 4:13» cita un versículo y no habla de la ciudad.
- **Romanos no cuenta para Roma.** Fuera de las citas de la carta, «los romanos» casi siempre habla del imperio o de sus soldados.
- **Exclusiones.** «Cesarea de Filipo» no cuenta para Cesarea, que en los viajes de Pablo es el puerto. «Nueva Jerusalén» no cuenta para Jerusalén. «Macedonia del Norte» (el país actual) no cuenta para Macedonia.
- **Antioquía.** «Antioquía de Siria» y «Antioquía de Pisidia» van a su lugar. Una «Antioquía» suelta se asigna mirando 250 caracteres a cada lado: Pisidia, Iconio, Listra, Derbe, Perga o Panfilia la llevan a Antioquía de Pisidia; Siria, Seleucia, cristianos, «Bernabé y Saulo» o Agabo, a Antioquía de Siria. Si no hay pistas o empatan, va a Antioquía de Siria, que es la congregación desde la que salen los tres viajes. El desglose la marca como `Antioquía (sin apellido)`.

## Límites conocidos

- **Lugares que siguen existiendo.** Roma, Atenas, Damasco, Chipre, Creta y Malta salen también en noticias y experiencias actuales. Un video sobre la sucursal de Grecia puede nombrar Atenas sin hablar de Pablo. El desglose y el título ayudan a separarlos, pero el índice no los filtra.
- **Antioquía.** La regla de contexto falla si un video habla de las dos ciudades seguidas o de ninguna con pistas cerca. Los recuentos de `Antioquía (sin apellido)` son orientativos.
- **Jerusalén** aparece en cientos de videos del Antiguo y del Nuevo Testamento. Los 12 con más menciones no tienen por qué ser los que tratan de Pablo en Jerusalén.
- **Tiro** puede colarse como el verbo al principio de una frase, como en «Tiro la pelota».
- **Nombres de cartas.** «Gálatas y Efesios» dicho como nombres de libros cuenta aunque no lleve número detrás.
- **Un lugar por entrada de `data/lugares`.** `scripts/videos/nombres/` tiene una entrada por cada lugar de los datos y ninguna más. Un lugar nuevo necesita su entrada.
- **Solo los videos que tenemos.** Un video sin subtítulos en la copia privada no entra, aunque hable del lugar.

## Revisión anual

jw.org publica videos nuevos cada mes. Una vez al año:

1. Bajar los subtítulos nuevos con la herramienta de descarga del propietario a la misma carpeta privada.
2. Volver a ejecutar `indexar.py`. Solo pide a jw.org los videos que no estén en la caché. Para comprobar también si los antiguos siguen publicados, borrar antes la caché.
3. Revisar el cambio con `git diff data/videos/`: videos nuevos, videos que desaparecen, recuentos que cambian.
4. Si un video nuevo trae un dato o un entendimiento que afecte a un lugar, anotarlo en la ficha del lugar con su fuente.
