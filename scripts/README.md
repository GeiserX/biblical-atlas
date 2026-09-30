# Scripts

Necesitan Python 3.12 y PyYAML:

```bash
pip install -r requirements.txt
```

## Compilar

```bash
python3 scripts/build.py
python3 scripts/build.py --out /tmp/prueba   # escribe en otra carpeta y no toca site/, dist/ ni docs/
python3 scripts/test_build.py                # sus pruebas: lo que compila de un par escrito en las dos fichas
```

Lee [`data/`](../data/) (las fuentes de `data/sources/*.yaml`, `data/books.yaml`, `data/calendar.yaml` y una carpeta por tipo; `data/_proposals/` no) y escribe:

- `dist/data.json`: todos los datos en un fichero, con el formato `biblical-earth/v0`. Además de las entidades lleva `libros` (la lista de `data/books.yaml`) y `calendario`.
- `site/data.json`: el mismo contenido, que es lo que lee la web.
- `site/stats.json`: cuántas fichas hay de cada tipo y la fecha de compilación. Lo leen las insignias del README, así que los números de la portada del repositorio nunca se quedan atrás.
- `site/data.js`: el mismo objeto envuelto en `window.BIBLICAL_EARTH_DATA = …;`, para abrir la web desde `file://`.
- `dist/biblical-earth.sqlite`: las mismas tablas en SQLite, más `hechos_fuentes(tipo, id, fuente_id)` para saber qué fuente sostiene cada hecho.
- [`docs/investigacion/registro/`](../docs/investigacion/registro/README.md): el registro de investigación, un fichero por tipo de entidad. Borra los `.md` que ya no genera.

Con `--out DIR` escribe `data.json`, `data.js`, `stats.json`, `biblical-earth.sqlite` y `registro/` dentro de `DIR`. Sirve para probar datos sin pisar lo que compila otro: el sitio carga ese `data.json` con `index.html?datos=_local/<nombre>/data.json` si `DIR` es `site/_local/<nombre>/`. `--data DIR` compila otra copia de los datos.

Antes de escribir comprueba que cada lugar, persona, selección y fuente citada existe. Los capítulos de la Biblia (`mateo-26`) que ninguna fuente escribe los crea a partir de `data/books.yaml`. Si falta algo, no escribe nada y sale con error.

Todo lo que genera es derivado. Para cambiar un dato, edita el YAML y vuelve a compilar.

## Validar

```bash
python3 scripts/validate.py            # esquema
python3 scripts/validate.py --links    # esquema y, además, cada URL
python3 scripts/validate.py --strict   # esquema, y los avisos también fallan
```

Comprueba los campos obligatorios, la forma de cada `date` (`from` no puede ser posterior a `to`, el año del texto tiene que coincidir con `from` o `to`, un texto de un solo año pide `from == to` o `approx: true`, una fecha de `type: derived` necesita su cuenta en `note` y que el hecho vaya con `status: pending`), que cada candidato dice de dónde sale su punto (`openbible:<id>`, o `calculation` con la cuenta en `note`), que los identificadores son slugs ASCII en minúsculas iguales al nombre del fichero, que ningún hecho tiene `sources` ni `reason` vacías y que todas las referencias existen: relaciones, candidatos, escritores, portadores, hallazgos y paradas de recorridos. También marca cualquier `summary`, `reason`, `note`, `text` u otro campo de texto (`change`, `explanation`, `disambiguation`, `unknown`, `kept_at` en los hallazgos, `weather` y `harvest` en los meses, y `caption` e `inverse_caption` en las relaciones) de más de 40 palabras: un texto tan largo suele ser una cita, y aquí solo escribimos resúmenes propios. El esquema completo está en [`docs/investigacion/README.md`](../docs/investigacion/README.md).

También comprueba que `date.detail` solo va en una fecha de un año, que la clave `perspicacia` de cada persona tiene la forma `<documento>` o `<documento>#<entrada>`, lleva a un enlace o una fuente de la ficha y no se repite, que cada pasaje de `passages` de un suceso cae en un capítulo y un versículo que existen según `verses` de `data/books.yaml` («Mal 3:19» es un error: Malaquías 3 tiene 18), y las reglas de la cobertura de la Biblia ([`data/coverage/README.md`](../data/coverage/README.md#reglas)), en las dos direcciones.

Rechaza además lo que delata el esquema antiguo o una relación mal escrita ([`docs/investigacion/modelo.md`](../docs/investigacion/modelo.md), sección 13): una clave del esquema antiguo (`razon`, `consultado`...) en cualquier fichero de `data/`; un hecho anidado (relación, parada, candidato, nombre o fiesta de un mes) sin `sources`, `reason` o `checked_on`; un `type`, una `word`, un `office` o una `certainty` que no están en [`data/vocabulary.yaml`](../data/vocabulary.yaml) o que no van con ese tipo; `word` y `caption` a la vez; dos relaciones de una ficha con la misma clave (tipo, destino, palabra o cargo, y `date.from`); una referencia `relation:` de la cobertura que no casa con una sola relación o que no está en su forma canónica, con la forma que toca; y un suceso con un `type` o un papel que no existen, o con un papel para alguien que no está en su `people`.

Lo que pide leer el texto no es un error sino un aviso: escribe `AVISO [código]` y sale con 0. Los códigos son `wrong_owner`, `pair_twice`, `outside_pending`, `unlisted_caption`, `kin_without_word`, `bare_company`, `no_office`, `no_certainty`, `same_as_owner`, `no_reference`, `title_type` y `type_without_role`; qué dice cada uno y qué decisión lo quita está en la sección 13 de `modelo.md`. La última línea cuenta los avisos por código. Con `--strict` los avisos también fallan. Cuando `main` llega a 0 avisos de un código, ese código pasa a error en `validate.py`.

Con `--links` pide cada URL una vez, con medio segundo entre peticiones, y falla si alguna no responde 200.

Sale con código 1 ante cualquier error. `--data DIR` valida otra copia de los datos. Así se valida un cambio sin el trabajo a medias de otros:

```bash
T=$(mktemp -d /tmp/be-prueba.XXXX)
git archive HEAD data | tar -x -C "$T"
rsync -a --relative <tus ficheros bajo data/> "$T/"
python3 scripts/validate.py --data "$T/data"
```

## Aplicar las propuestas de lectura

```bash
python3 scripts/apply.py --dry-run propuestas/*.json       # qué escribiría, sin escribir
python3 scripts/apply.py propuestas/*.json              # un solo libro en marcha
python3 scripts/apply.py --parallel propuestas/*.json   # varios libros a la vez
python3 scripts/test_apply.py                           # sus pruebas
```

[`apply.py`](apply.py) es el escritor de un libro: aplica las propuestas JSON de los lectores (formato en [`docs/investigacion/versiculos.md`](../docs/investigacion/versiculos.md#11-la-propuesta)) en orden de capítulo. Crea las fichas nuevas en modo exclusivo, funde un `crear` repetido o con una clave `perspicacia` que ya tiene otra persona, une listas y relaciones, y no aplica un `cambiar` cuyo `antes` ya no coincide. En `data/coverage/<libro>.yaml` sustituye solo los capítulos que traen las propuestas, y une las fuentes en `data/sources/cobertura-<libro>.yaml`: un id que ya existe con otros datos es un error y entonces no escribe nada. Una ficha que ya existía cambia solo en las líneas de los campos que cambian.

Con `--parallel` no toca ninguna ficha que ya existía: esos cambios van a `data/_proposals/<libro>.json`, que se aplica después con el mismo script. Sale con 0 si todo fue bien, 2 si hubo choques (lo demás se aplica) y 1 si hubo un error. No usa la red.

## Revisar lo antiguo

```bash
python3 scripts/review.py             # más de 365 días sin releer
python3 scripts/review.py --days 180
python3 scripts/review.py --fail    # sale con código 1 si hay algo que revisar
```

Lista cada hecho y cada fuente consultados hace N días o más (`--days 0` lista todo lo consultado hasta hoy), con una búsqueda en wol.jw.org para ver si hay algo más reciente. Entran también los meses y los hechos de «El calendario» de `data/calendar.yaml`. Los capítulos que `build.py` crea solos no salen: se releen con el hecho que los cita. Si no hay nada, imprime «nada que revisar». Sin `--fail` siempre sale con código 0; con `--fail`, la revisión semanal de la CI se pone en rojo cuando hay datos por releer. El procedimiento completo está en [`docs/investigacion/README.md`](../docs/investigacion/README.md).

## Vídeos de jw.org

```bash
export BE_VTT_DIR=/ruta/a/la/carpeta/privada
python3 scripts/videos/index.py            # lugares y personas
python3 scripts/videos/passages.py            # capítulos
python3 scripts/videos/index.py --leaks    # tiene que acabar con «hallazgos: 0»
python3 scripts/videos/test_videos.py      # los dos scripts leen el esquema en inglés, sin red
```

- [`videos/index.py`](videos/index.py) cuenta en los subtítulos los nombres de [`videos/place_names/`](videos/place_names/) (lugares) y [`videos/people_names/`](videos/people_names/) (personas), un fichero por tema. Escribe `data/videos/<id>.yaml` y `site/videos.json` para los lugares, y `data/videos-people/<id>.yaml` y `site/videos-personas.json` para las personas. Pide a jw.org la página y la fecha de cada vídeo, con un segundo entre peticiones, y guarda las respuestas en una caché dentro de la carpeta privada.
- [`videos/passages.py`](videos/passages.py) busca citas de capítulos en los subtítulos y en los títulos del catálogo, y asigna cada vídeo de la serie «Información sobre…» a su libro. Escribe `data/videos-passages/<libro>.yaml` y `site/videos-pasajes.json`. No usa la red.
- `index.py --leaks` falla si el repositorio lleva 8 palabras seguidas de algún subtítulo o el nombre de un fichero `.vtt`.

Los dos aceptan `--out DIR` para escribir en otra carpeta. Las reglas y las opciones están en [`docs/investigacion/videos-jw.md`](../docs/investigacion/videos-jw.md).
