# Scripts

Necesitan Python 3.12 y PyYAML:

```bash
pip install -r requirements.txt
```

## Compilar

```bash
python3 scripts/build.py
```

Lee [`data/`](../data/) y escribe:

- `dist/data.json`: todos los datos en un fichero, con el formato `biblical-earth/v0`.
- `site/data.json`: el mismo contenido, que es lo que lee la web.
- `site/data.js`: el mismo objeto envuelto en `window.BIBLICAL_EARTH_DATA = …;`, para abrir la web desde `file://`.
- `dist/biblical-earth.sqlite`: las mismas tablas en SQLite, más `hechos_fuentes(tipo, id, fuente_id)` para saber qué fuente sostiene cada hecho.
- [`docs/investigacion/viajes-de-pablo.md`](../docs/investigacion/viajes-de-pablo.md): el registro de investigación, una tabla por tipo de entidad.

Antes de escribir comprueba que cada lugar, persona y fuente citada existe. Si falta alguno, no escribe nada y sale con error.

Todo lo que genera es derivado. Para cambiar un dato, edita el YAML y vuelve a compilar.

## Validar

```bash
python3 scripts/validate.py            # esquema
python3 scripts/validate.py --links    # esquema y, además, cada URL
```

Comprueba los campos obligatorios, la forma de cada `fecha` (`desde` no puede ser posterior a `hasta`), que los identificadores son slugs ASCII en minúsculas iguales al nombre del fichero, que ningún hecho tiene `fuentes` ni `razon` vacías y que todas las referencias existen. También marca cualquier `resumen`, `razon` o `nota` de más de 40 palabras: un texto tan largo suele ser una cita, y aquí solo escribimos resúmenes propios.

Con `--links` pide cada URL una vez, con medio segundo entre peticiones, y falla si alguna no responde 200.

Sale con código 1 ante cualquier error. `--data DIR` valida otra copia de los datos.

## Revisar lo antiguo

```bash
python3 scripts/revisar.py             # más de 365 días sin releer
python3 scripts/revisar.py --dias 180
python3 scripts/revisar.py --fallar    # sale con código 1 si hay algo que revisar
```

Lista cada hecho y cada fuente consultados hace N días o más (`--dias 0` lista todo lo consultado hasta hoy), con una búsqueda en wol.jw.org para ver si hay algo más reciente. Si no hay nada, imprime «nada que revisar». Sin `--fallar` siempre sale con código 0; con `--fallar`, la revisión semanal de la CI se pone en rojo cuando hay datos por releer. El procedimiento completo está en [`docs/investigacion/README.md`](../docs/investigacion/README.md).
