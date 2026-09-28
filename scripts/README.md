# Scripts

Necesitan Python 3.12 y PyYAML:

```bash
pip install -r requirements.txt
```

## Compilar

```bash
python3 scripts/build.py
python3 scripts/build.py --salida /tmp/prueba   # escribe en otra carpeta y no toca site/, dist/ ni docs/
```

Lee [`data/`](../data/) (las fuentes de `data/fuentes/*.yaml`, `data/libros.yaml`, `data/calendario.yaml` y una carpeta por tipo; `data/_propuestas/` no) y escribe:

- `dist/data.json`: todos los datos en un fichero, con el formato `biblical-earth/v0`. Además de las entidades lleva `libros` (la lista de `data/libros.yaml`) y `calendario`.
- `site/data.json`: el mismo contenido, que es lo que lee la web.
- `site/data.js`: el mismo objeto envuelto en `window.BIBLICAL_EARTH_DATA = …;`, para abrir la web desde `file://`.
- `dist/biblical-earth.sqlite`: las mismas tablas en SQLite, más `hechos_fuentes(tipo, id, fuente_id)` para saber qué fuente sostiene cada hecho.
- [`docs/investigacion/registro/`](../docs/investigacion/registro/README.md): el registro de investigación, un fichero por tipo de entidad. Borra los `.md` que ya no genera.

Con `--salida DIR` escribe `data.json`, `data.js`, `biblical-earth.sqlite` y `registro/` dentro de `DIR`. Sirve para probar datos sin pisar lo que compila otro: el sitio carga ese `data.json` con `index.html?datos=_local/<nombre>/data.json` si `DIR` es `site/_local/<nombre>/`. `--data DIR` compila otra copia de los datos.

Antes de escribir comprueba que cada lugar, persona, selección y fuente citada existe. Los capítulos de la Biblia (`mateo-26`) que ninguna fuente escribe los crea a partir de `data/libros.yaml`. Si falta algo, no escribe nada y sale con error.

Todo lo que genera es derivado. Para cambiar un dato, edita el YAML y vuelve a compilar.

## Validar

```bash
python3 scripts/validate.py            # esquema
python3 scripts/validate.py --links    # esquema y, además, cada URL
```

Comprueba los campos obligatorios, la forma de cada `fecha` (`desde` no puede ser posterior a `hasta`, el año del texto tiene que coincidir con `desde` o `hasta`, un texto de un solo año pide `desde == hasta` o `aprox: true`, una fecha `derivada` necesita su cuenta y `estado: pendiente`), que cada candidato dice de dónde sale su punto (`openbible:<id>`, o `calculo` con la cuenta en `nota`), que los identificadores son slugs ASCII en minúsculas iguales al nombre del fichero, que ningún hecho tiene `fuentes` ni `razon` vacías y que todas las referencias existen: relaciones, candidatos, escritores, portadores, hallazgos y paradas de recorridos. También marca cualquier `resumen`, `razon`, `nota`, `texto` u otro campo de texto (`cambio`, `explicacion`, `desambiguacion`, `no_sabemos`, `donde_hoy` en los hallazgos, y `clima` y `campo` en los meses) de más de 40 palabras: un texto tan largo suele ser una cita, y aquí solo escribimos resúmenes propios. El esquema completo está en [`docs/investigacion/README.md`](../docs/investigacion/README.md).

Con `--links` pide cada URL una vez, con medio segundo entre peticiones, y falla si alguna no responde 200.

Sale con código 1 ante cualquier error. `--data DIR` valida otra copia de los datos. Así se valida un cambio sin el trabajo a medias de otros:

```bash
T=$(mktemp -d /tmp/be-prueba.XXXX)
git archive HEAD data | tar -x -C "$T"
rsync -a --relative <tus ficheros bajo data/> "$T/"
python3 scripts/validate.py --data "$T/data"
```

## Revisar lo antiguo

```bash
python3 scripts/revisar.py             # más de 365 días sin releer
python3 scripts/revisar.py --dias 180
python3 scripts/revisar.py --fallar    # sale con código 1 si hay algo que revisar
```

Lista cada hecho y cada fuente consultados hace N días o más (`--dias 0` lista todo lo consultado hasta hoy), con una búsqueda en wol.jw.org para ver si hay algo más reciente. Los capítulos que `build.py` crea solos no salen: se releen con el hecho que los cita. Si no hay nada, imprime «nada que revisar». Sin `--fallar` siempre sale con código 0; con `--fallar`, la revisión semanal de la CI se pone en rojo cuando hay datos por releer. El procedimiento completo está en [`docs/investigacion/README.md`](../docs/investigacion/README.md).

## Vídeos de jw.org

```bash
export BE_VTT_DIR=/ruta/a/la/carpeta/privada
python3 scripts/videos/indexar.py            # lugares y personas
python3 scripts/videos/pasajes.py            # capítulos
python3 scripts/videos/indexar.py --fugas    # tiene que acabar con «hallazgos: 0»
```

- [`videos/indexar.py`](videos/indexar.py) cuenta en los subtítulos los nombres de [`videos/nombres/`](videos/nombres/) (lugares) y [`videos/personas/`](videos/personas/) (personas), un fichero por tema. Escribe `data/videos/<id>.yaml` y `site/videos.json` para los lugares, y `data/videos-personas/<id>.yaml` y `site/videos-personas.json` para las personas. Pide a jw.org la página y la fecha de cada vídeo, con un segundo entre peticiones, y guarda las respuestas en una caché dentro de la carpeta privada.
- [`videos/pasajes.py`](videos/pasajes.py) busca citas de capítulos en los subtítulos y en los títulos del catálogo, y asigna cada vídeo de la serie «Información sobre…» a su libro. Escribe `data/videos-pasajes/<libro>.yaml` y `site/videos-pasajes.json`. No usa la red.
- `indexar.py --fugas` falla si el repositorio lleva 8 palabras seguidas de algún subtítulo o el nombre de un fichero `.vtt`.

Los dos aceptan `--salida DIR` para escribir en otra carpeta. Las reglas y las opciones están en [`docs/investigacion/videos-jw.md`](../docs/investigacion/videos-jw.md).
