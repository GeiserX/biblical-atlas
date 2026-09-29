# Cobertura de la Biblia

Un fichero por libro, `data/cobertura/<libro>.yaml`, con el slug de [`data/libros.yaml`](../libros.yaml) como nombre. Dice qué versículos de la Traducción del Nuevo Mundo (edición de estudio) se han leído, qué clase de pasaje es cada tramo y qué entidades salieron de él. Con él se demuestra que cada versículo se leyó y quedó apuntado en el atlas.

El protocolo para leer un capítulo y rellenar su entrada está en [`docs/investigacion/versiculos.md`](../../docs/investigacion/versiculos.md). El estado de toda la Biblia está en [`docs/investigacion/registro/cobertura.md`](../../docs/investigacion/registro/cobertura.md), que genera `scripts/build.py`.

## Formato

```yaml
# biblical-earth: cobertura de un libro. Formato en data/cobertura/README.md.
libro: filemon
capitulos:
  1:
    estado: completo
    revisado: 2026-09-29
    tramos:
    - {v: 1-3, tipo: carta, entidades: [carta:filemon, persona:filemon, persona:apia], menciona: [persona:pablo, persona:timoteo, persona:arquipo]}
    - {v: 4-9, tipo: carta, nota: Pablo da gracias por el amor y la fe de Filemón y prefiere rogarle antes que mandarle.}
    - {v: 10-21, tipo: carta, entidades: [persona:onesimo, relacion:filemon/vivio_en/colosas]}
    - {v: 22-25, tipo: carta, entidades: [persona:epafras], menciona: [persona:juan-marcos, persona:aristarco, persona:demas, persona:lucas]}
```

Un tramo por línea, en forma `{...}`, para que un libro entero se lea de un vistazo.

| Campo | Dónde | Qué es |
|---|---|---|
| `libro` | fichero | Slug del libro. Igual que el nombre del fichero. |
| `capitulos` | fichero | Mapa `<número>: {...}`. Un capítulo que no está cuenta como pendiente y sin leer. |
| `estado` | capítulo | `pendiente` o `completo`. |
| `revisado` | capítulo o tramo | Día en que se leyó, `AAAA-MM-DD`, nunca posterior a hoy. El del capítulo vale para todos sus tramos; un tramo leído otro día lleva el suyo. |
| `tramos` | capítulo | Lista de tramos, en orden. |
| `nota` | fichero, capítulo o tramo | Opcional salvo en un tramo sin entidades. Palabras nuestras, 40 como mucho. |
| `v` | tramo | Un versículo (`7`) o un tramo (`1-5`). |
| `tipo` | tramo | Qué clase de pasaje es (tabla de abajo). |
| `entidades` | tramo | Lo que el tramo produjo o confirmó: cada una tiene que citar este capítulo. |
| `menciona` | tramo | Lo que el tramo solo nombra de pasada: tiene que existir, pero no hace falta que cite el capítulo. |

## Tipos de pasaje

Pocos a propósito. Si un tramo mezcla dos, se parte o se pone el que domina.

| `tipo` | Para |
|---|---|
| `narracion` | Relato de hechos: quién hizo qué, dónde. |
| `genealogia` | Listas de padres e hijos. |
| `ley` | Mandatos, normas, instrucciones del culto o del tabernáculo. |
| `poesia` | Salmos, cantos, proverbios, lamentos, oraciones en verso. |
| `profecia` | Mensajes de un profeta sobre el futuro o contra una nación. |
| `discurso` | Un discurso largo o un sermón dentro de un relato (Moisés en Deuteronomio, el Sermón del Monte). |
| `carta` | El cuerpo de una carta. |
| `lista` | Censos, fronteras, ciudades, etapas de un viaje, repartos de tierra. |
| `vision` | Lo que un profeta ve en una visión o un sueño (Daniel, Ezequiel, Apocalipsis). |

## Referencias

Cada elemento de `entidades` y de `menciona` es `tipo:id`, como en la dirección del sitio:

- `persona:<id>`, `lugar:<id>`, `evento:<id>`, `periodo:<id>`, `viaje:<id>`, `carta:<id>`, `hallazgo:<id>`.
- `relacion:<persona>/<tipo>/<otro>` para una relación escrita en la ficha de esa persona: `relacion:rut/pariente/noemi`, `relacion:filemon/vivio_en/colosas`. `<tipo>` es uno de los de `relaciones` y `<otro>` es la persona o el lugar de la relación.

**Qué es «citar el capítulo».** Lo mismo que usa el sitio para poner una entidad en la página de un capítulo: una fuente que es ese capítulo (`filemon-1`, `hch-16`), o una cita escrita en su `razon` (en una persona también en `desambiguacion` y en la `razon` de sus relaciones; en un evento, en `pasajes`; en una carta o un viaje, en `referencia`). Una relación cita el capítulo con sus propias `fuentes` o su `razon`. Una carta cita siempre todos los capítulos de su propio libro. Una abreviatura de dos o tres letras sin número delante solo cuenta con mayúscula inicial (`Da 3`, `Hch 16`), porque en minúscula también es una palabra: «le da 2 hijos» no cita Daniel 2.

**`entidades` o `menciona`.** Va en `entidades` lo que el tramo cuenta: una persona que actúa o de la que se dice algo, un lugar donde pasa algo, el suceso, la relación que el texto afirma. Va en `menciona` lo que solo se nombra, como David en una genealogía de Rut 4 o Jerusalén en un saludo. Así una figura que sale en cien capítulos no necesita cien fuentes. `menciona` es la respuesta a «por qué esta entidad no cita el capítulo».

## Los encabezamientos de los salmos

La TNM pone el encabezamiento de muchos salmos («Salmo de David, cuando…») antes del versículo 1. No hay versículo 0: el encabezamiento es parte del primer tramo del salmo, y sus nombres y su suceso van en ese tramo según el protocolo ([`versiculos.md`](../../docs/investigacion/versiculos.md#8-tramos-sin-entidades-nuevas), sección 8).

## Versículos y omitidos

`data/libros.yaml` da en cada libro `versiculos`, una lista con el último versículo de cada capítulo, y `omitidos`, un mapa `<capítulo>: [versículos]` con los números que la TNM no incluye (como Mt 17:21), en números sueltos o en tramos `"53-58"`. Los omitidos nunca hacen falta: un tramo puede saltarlos (`14-20` y luego `22-27`) o pasar por encima (`14-27`). Un tramo que solo tiene omitidos es un error.

## Reglas

[`scripts/validate.py`](../../scripts/validate.py) comprueba:

- `libro` coincide con el nombre del fichero y es un slug de `data/libros.yaml`, que tiene que dar `versiculos` de ese libro.
- Los capítulos existen en el libro, cada uno una sola vez (`1` y `'1'` son el mismo), y solo llevan campos conocidos, igual que los tramos.
- Cada `v` cae entre 1 y el último versículo del capítulo.
- Los tramos van en orden, sin solaparse y seguidos: entre dos tramos no queda ningún versículo sin leer (los omitidos no cuentan).
- Un capítulo `completo` cubre todos sus versículos, del primero al último, salvo los omitidos. Uno `pendiente` puede dejar sin leer el principio o el final.
- Cada tramo tiene `tipo` de la tabla, un `revisado` suyo o del capítulo, y `entidades` o una `nota`.
- Cada referencia de `entidades` y de `menciona` existe (`build.py` tampoco compila si no), ninguna se repite y ninguna está en las dos listas.
- Cada entidad de `entidades` cita el capítulo, y cada persona de `entidades` lleva su clave `perspicacia`.
- Al revés: cada entidad o relación que cita un capítulo `completo` sale en uno de sus tramos, en `entidades` o en `menciona`. Si no, el sitio la pondría en la página del capítulo sin que la cobertura diga por qué.
- Las notas tienen 40 palabras como mucho.

Para ver el estado, [`scripts/cobertura.py`](../../scripts/cobertura.py):

```bash
python3 scripts/cobertura.py                  # por libro y en total
python3 scripts/cobertura.py --faltan rut     # los versículos que faltan de un libro
python3 scripts/cobertura.py --fallar         # código 1 si algún capítulo no está completo
```
