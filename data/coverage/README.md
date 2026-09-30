# Cobertura de la Biblia

Un fichero por libro, `data/coverage/<libro>.yaml`, con el slug de [`data/books.yaml`](../books.yaml) como nombre. Dice qué versículos de la Traducción del Nuevo Mundo (edición de estudio) se han leído, qué clase de pasaje es cada tramo y qué entidades salieron de él. Con él se demuestra que cada versículo se leyó y quedó apuntado en el atlas.

El protocolo para leer un capítulo y rellenar su entrada está en [`docs/investigacion/versiculos.md`](../../docs/investigacion/versiculos.md). El estado de toda la Biblia está en [`docs/investigacion/registro/cobertura.md`](../../docs/investigacion/registro/cobertura.md), que genera `scripts/build.py`.

## Formato

```yaml
# biblical-atlas: cobertura de un libro. Formato en data/coverage/README.md.
book: filemon
chapters:
  1:
    status: complete
    reviewed_on: 2026-09-29
    spans:
    - {v: 1-3, type: letter, entities: [letter:filemon, person:filemon, person:apia], mentions: [person:pablo, person:timoteo, person:arquipo]}
    - {v: 4-9, type: letter, note: Pablo da gracias por el amor y la fe de Filemón y prefiere rogarle antes que mandarle.}
    - {v: 10-21, type: letter, entities: [person:onesimo, relation:filemon/lived_in/colosas]}
    - {v: 22-25, type: letter, entities: [person:epafras], mentions: [person:juan-marcos, person:aristarco, person:demas, person:lucas]}
```

Un tramo por línea, en forma `{...}`, para que un libro entero se lea de un vistazo.

| Campo | Dónde | Qué es |
|---|---|---|
| `book` | fichero | Slug del libro. Igual que el nombre del fichero. |
| `chapters` | fichero | Mapa `<número>: {...}`. Un capítulo que no está cuenta como pendiente y sin leer. |
| `status` | capítulo | `pending` o `complete`. |
| `reviewed_on` | capítulo o tramo | Día en que se leyó, `AAAA-MM-DD`, nunca posterior a hoy. El del capítulo vale para todos sus tramos; un tramo leído otro día lleva el suyo. |
| `spans` | capítulo | Lista de tramos, en orden. |
| `note` | fichero, capítulo o tramo | Opcional salvo en un tramo sin entidades. Palabras nuestras, 40 como mucho. |
| `v` | tramo | Un versículo (`7`) o un tramo (`1-5`). |
| `type` | tramo | Qué clase de pasaje es (tabla de abajo). |
| `entities` | tramo | Lo que el tramo produjo o confirmó: cada una tiene que citar este capítulo. |
| `mentions` | tramo | Lo que el tramo solo nombra de pasada: tiene que existir, pero no hace falta que cite el capítulo. |

## Tipos de pasaje

Pocos a propósito. Si un tramo mezcla dos, se parte o se pone el que domina.

| `type` | Para |
|---|---|
| `narration` | Relato de hechos: quién hizo qué, dónde. |
| `genealogy` | Listas de padres e hijos. |
| `law` | Mandatos, normas, instrucciones del culto o del tabernáculo. |
| `poetry` | Salmos, cantos, proverbios, lamentos, oraciones en verso. También los libros sapienciales que la TNM imprime en prosa (Eclesiastés). |
| `prophecy` | Mensajes de un profeta sobre el futuro o contra una nación. |
| `speech` | Un discurso largo o un sermón dentro de un relato (Moisés en Deuteronomio, el Sermón del Monte). |
| `letter` | El cuerpo de una carta. |
| `list` | Censos, fronteras, ciudades, etapas de un viaje, repartos de tierra. |
| `vision` | Lo que un profeta ve en una visión o un sueño (Daniel, Ezequiel, Apocalipsis). |

## Referencias

Cada elemento de `entities` y de `mentions` es `tipo:id`, con el tipo en inglés:

- `person:<id>`, `place:<id>`, `event:<id>`, `period:<id>`, `journey:<id>`, `letter:<id>`, `find:<id>`.
- `relation:<clave>` para una relación escrita en la ficha de una persona. La clave es `<persona>/<type>/<destino>`, donde `<persona>` es la ficha que la lleva, `<type>` su tipo y `<destino>` la persona o el lugar de la relación, o `-` si no tiene: `relation:rut/kin/noemi`, `relation:filemon/lived_in/colosas`, `relation:samuel/holds_office/-/judge`.

**Una referencia a una relación se escribe de una sola manera**: la más corta que casa con una sola relación de esa ficha. Se prueba en este orden: la clave sola; con `@<date.from>`; con `/<word u office>`; con los dos. Lucas acompaña a Pablo en tres tramos, y cada uno se cita con su año: `relation:lucas/accompanies/pablo@50`. `validate.py` rechaza una referencia que no casa con ninguna relación, que casa con más de una o que está escrita de otra manera, y dice la forma que toca. Si una relación se quita o se mueve, su fila de `scripts/migration/redirects.yaml` dice a qué clave pasa la cita.

**Qué es «citar el capítulo».** Lo mismo que usa el sitio para poner una entidad en la página de un capítulo: una fuente que es ese capítulo (`filemon-1`, `hch-16`), o una cita escrita en su `reason` (en una persona también en `disambiguation` y en la `reason` de sus relaciones; en un suceso, en `passages`; en una carta o un viaje, en `reference`). Una relación cita el capítulo con sus propias `sources` o su `reason`. Una carta cita siempre todos los capítulos de su propio libro. Una abreviatura de dos o tres letras sin número delante solo cuenta con mayúscula inicial (`Da 3`, `Hch 16`), porque en minúscula también es una palabra: «le da 2 hijos» no cita Daniel 2.

**`entities` o `mentions`.** Va en `entities` lo que el tramo cuenta: una persona que actúa o de la que se dice algo, un lugar donde pasa algo, el suceso, la relación que el texto afirma. Va en `mentions` lo que solo se nombra, como David en una genealogía de Rut 4 o Jerusalén en un saludo. Así una figura que sale en cien capítulos no necesita cien fuentes. `mentions` es la respuesta a «por qué esta entidad no cita el capítulo».

## Los encabezamientos de los salmos

La TNM pone el encabezamiento de muchos salmos («Salmo de David, cuando…») antes del versículo 1. No hay versículo 0: el encabezamiento es parte del primer tramo del salmo, y sus nombres y su suceso van en ese tramo según el protocolo ([`versiculos.md`](../../docs/investigacion/versiculos.md#8-tramos-sin-entidades-nuevas), sección 8).

## Versículos y omitidos

`data/books.yaml` da en cada libro `verses`, una lista con el último versículo de cada capítulo, y `omitted`, un mapa `<capítulo>: [versículos]` con los números que la TNM no incluye (como Mt 17:21), en números sueltos o en tramos `"53-58"`. Los omitidos nunca hacen falta: un tramo puede saltarlos (`14-20` y luego `22-27`) o pasar por encima (`14-27`). Un tramo que solo tiene omitidos es un error.

## Reglas

[`scripts/validate.py`](../../scripts/validate.py) comprueba:

- `book` coincide con el nombre del fichero y es un slug de `data/books.yaml`, que tiene que dar `verses` de ese libro.
- Los capítulos existen en el libro, cada uno una sola vez (`1` y `'1'` son el mismo), y solo llevan campos conocidos, igual que los tramos.
- Cada `v` cae entre 1 y el último versículo del capítulo.
- Los tramos van en orden, sin solaparse y seguidos: entre dos tramos no queda ningún versículo sin leer (los omitidos no cuentan).
- Un capítulo `complete` cubre todos sus versículos, del primero al último, salvo los omitidos. Uno `pending` puede dejar sin leer el principio o el final.
- Cada tramo tiene `type` de la tabla, un `reviewed_on` suyo o del capítulo, y `entities` o una `note`.
- Cada referencia de `entities` y de `mentions` existe (`build.py` tampoco compila si no), ninguna se repite y ninguna está en las dos listas. Cada referencia `relation:` casa con una sola relación y está en su forma canónica.
- Cada entidad de `entities` cita el capítulo, y cada persona de `entities` lleva su clave `perspicacia`.
- Al revés: cada entidad o relación que cita un capítulo `complete` sale en uno de sus tramos, en `entities` o en `mentions`. Si no, el sitio la pondría en la página del capítulo sin que la cobertura diga por qué.
- Las notas tienen 40 palabras como mucho.

Para ver el estado, [`scripts/bible_coverage.py`](../../scripts/bible_coverage.py):

```bash
python3 scripts/bible_coverage.py                  # por libro y en total
python3 scripts/bible_coverage.py --missing rut    # los versículos que faltan de un libro
python3 scripts/bible_coverage.py --fail           # código 1 si algún capítulo no está completo
```
