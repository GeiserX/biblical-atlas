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
- [`docs/investigacion/registro/`](../docs/investigacion/registro/README.md): el registro de investigación, un fichero por tipo de entidad.

Con `--salida DIR` escribe `data.json`, `data.js`, `biblical-earth.sqlite` y `registro/` dentro de `DIR`. Sirve para probar datos sin pisar lo que compila otro: el sitio carga ese `data.json` con `index.html?datos=_local/<carril>/data.json` si `DIR` es `site/_local/<carril>/`. `--data DIR` compila otra copia de los datos.

Antes de escribir comprueba que cada lugar, persona, selección y fuente citada existe. Los capítulos de la Biblia (`mateo-26`) que ninguna fuente escribe los crea a partir de `data/libros.yaml`. Si falta algo, no escribe nada y sale con error.

Todo lo que genera es derivado. Para cambiar un dato, edita el YAML y vuelve a compilar.

## Validar

```bash
python3 scripts/validate.py            # esquema
python3 scripts/validate.py --links    # esquema y, además, cada URL
```

Comprueba los campos obligatorios, la forma de cada `fecha` (`desde` no puede ser posterior a `hasta`, el año del texto tiene que coincidir con `desde` o `hasta`, una fecha `derivada` necesita su cuenta y `estado: pendiente`), que los identificadores son slugs ASCII en minúsculas iguales al nombre del fichero, que ningún hecho tiene `fuentes` ni `razon` vacías y que todas las referencias existen: relaciones, candidatos, escritores, portadores, hallazgos y paradas de recorridos. También marca cualquier `resumen`, `razon`, `nota` o `texto` de más de 40 palabras: un texto tan largo suele ser una cita, y aquí solo escribimos resúmenes propios. El esquema completo está en [`docs/investigacion/README.md`](../docs/investigacion/README.md).

Con `--links` pide cada URL una vez, con medio segundo entre peticiones, y falla si alguna no responde 200.

Sale con código 1 ante cualquier error. `--data DIR` valida otra copia de los datos. Así valida un carril lo suyo sin el trabajo a medias de los demás:

```bash
C=<carril>; T=$(mktemp -d /tmp/be-$C.XXXX)
git archive HEAD data | tar -x -C "$T"
rsync -a --relative <sus ficheros bajo data/> "$T/"
python3 scripts/validate.py --data "$T/data"
```

## Revisar lo antiguo

```bash
python3 scripts/revisar.py             # más de 365 días sin releer
python3 scripts/revisar.py --dias 180
python3 scripts/revisar.py --fallar    # sale con código 1 si hay algo que revisar
```

Lista cada hecho y cada fuente consultados hace N días o más (`--dias 0` lista todo lo consultado hasta hoy), con una búsqueda en wol.jw.org para ver si hay algo más reciente. Los capítulos que `build.py` crea solos no salen: se releen con el hecho que los cita. Si no hay nada, imprime «nada que revisar». Sin `--fallar` siempre sale con código 0; con `--fallar`, la revisión semanal de la CI se pone en rojo cuando hay datos por releer. El procedimiento completo está en [`docs/investigacion/README.md`](../docs/investigacion/README.md).
