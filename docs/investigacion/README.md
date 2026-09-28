# Investigación: cómo sabemos lo que afirmamos

Cada dato del mapa dice de dónde sale, por qué lo asociamos y cuándo lo comprobamos. Esta carpeta explica el método y es el esquema que citan las cabeceras de los YAML. El registro completo, dato a dato, está en [`registro/`](registro/README.md), un fichero por tipo.

## Dónde vive cada cosa

- [`data/fuentes/`](../../data/fuentes/): las fuentes, repartidas en ficheros (`comun.yaml` y uno por carril de trabajo). Cada fuente lleva su identificador, título, obra, URL, nivel, año de publicación (`publicado`, solo si la página lo muestra) y fecha de consulta.
- [`data/libros.yaml`](../../data/libros.yaml): los 66 libros de la Biblia con su slug, número en wol.jw.org, nombre, abreviatura TNM, formas de búsqueda, formas escritas en los subtítulos y número de capítulos.
- [`data/calendario.yaml`](../../data/calendario.yaml): los 13 meses del calendario hebreo, con el id que usa `fecha.detalle.mes`.
- `data/lugares/`, `data/personas/`, `data/viajes/`, `data/cartas/`, `data/eventos/`, `data/periodos/`, `data/hallazgos/`, `data/recorridos/`: un YAML por entidad. El nombre del fichero es su identificador.
- `data/_propuestas/`: cambios propuestos a ficheros de otro carril. `build.py` y `validate.py` no la leen.
- [`registro/`](registro/README.md): el registro. Lo genera [`scripts/build.py`](../../scripts/build.py) y nadie lo edita a mano.

## Qué lleva cada afirmación

Dentro de su YAML, cada hecho (un lugar, una persona, un viaje y cada una de sus paradas, una carta, un evento, un periodo, un hallazgo, un recorrido, una relación entre personas, un candidato de ubicación) lleva:

| Campo | Qué es |
|---|---|
| `fuentes` | Lista de identificadores de `data/fuentes/`. Nunca vacía. |
| `razon` | Por qué hacemos esta asociación: qué pasaje o qué parte de la fuente la sostiene, con palabras nuestras («párr. 25»). Nunca vacía. |
| `consultado` | Día en que se leyó la fuente, `AAAA-MM-DD`. |
| `estado` | `verificado` solo si alguien abrió la fuente enlazada y dice eso. Si no, `pendiente`, con el motivo en `razon`. |
| `historial` | Opcional. Los cambios de entendimiento, explicados más abajo. |

Las fuentes son de dos niveles. Nivel 1: la Traducción del Nuevo Mundo y las publicaciones de wol.jw.org y jw.org. Nivel 2: arqueología o investigación, y solo cuando jw.org las ha usado; nunca en contra del nivel 1. De OpenBible tomamos únicamente coordenadas. Nunca copiamos texto de jw.org: `resumen`, `razon`, `nota`, `texto`, `explicacion`, `desambiguacion`, `no_sabemos` y cada frase de `no_afirmamos` tienen 40 palabras como mucho (`scripts/validate.py` lo comprueba) y se escriben con nuestras palabras, siempre con enlace.

## Fuentes

- Cada carril escribe solo `data/fuentes/<carril>.yaml`. `build.py` junta todos los ficheros.
- Un id repetido con la misma `url` y el mismo `titulo` se funde en uno y se queda el `consultado` más reciente. Un id repetido con datos distintos es un error que nombra los dos ficheros.
- **Los capítulos de la Biblia son fuentes implícitas.** Un id `<slug>-<capítulo>` (`mateo-26`, `esdras-7`) que no esté en ningún fichero lo crea `build.py` a partir de `data/libros.yaml`: título «Mateo 26», obra TNM de estudio, URL `https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/40/26`, nivel 1. Un capítulo que no existe (`mateo-29`) es un error. Los `hch-N` y los capítulos de cartas que ya estaban escritos se quedan como están.

## Fechas

Las fechas siguen el objeto `fecha` de [`docs/ideas/mockups/data/README.md`](../ideas/mockups/data/README.md): `desde` y `hasta` en años astronómicos con signo (1 a.e.c. = 0, 537 a.e.c. = −536), `precision` (`día`, `mes`, `estación`, `año`, `rango`, con tilde), `aprox`, `tipo`, `cronologia` (`tnm` o `secular`) y `texto`. Además:

| Campo | Qué es |
|---|---|
| `tipo: derivada` | Cálculo nuestro, no de la fuente. Exige `fecha.nota` con la cuenta y `estado: pendiente` en el hecho. Los otros tipos son `anclada` y `narrativa`. |
| `detalle` | Opcional: `{mes: nisan, dia: 14}` o `{estacion: otoño}`. El mes es un id de `data/calendario.yaml`; el día va de 1 a 30 y necesita mes; las estaciones son `primavera`, `verano`, `otoño` e `invierno`. |
| `alternativas` | Opcional, en cualquier entidad: lista de `{fecha, fuentes, nota}` cuya `fecha` lleva `cronologia: secular`. Solo con una fuente que jw.org haya usado. |
| `orden_relato` | Opcional, en eventos: `{serie: a7, orden: 57}` para ordenar sucesos sin fecha fina (la armonía de la tabla A7, los capítulos de Hechos). |

**Comprobación año/texto.** Si `fecha.texto` dice «537 a.e.c.», `desde` o `hasta` tiene que ser −536. Se mira el primer año con era del texto (y los dos de un rango como «c. 49-52 e.c.»). Caza el error de un año que se comete al olvidar que no hubo año cero.

## Campos por tipo

Los campos obligatorios de siempre siguen igual. Lo nuevo es opcional salvo donde se dice.

**Lugares.** `tipo` es uno de `ciudad`, `region`, `isla`, `provincia`, `puerto`, `cabo`, `monte`, `rio`, `mar`, `lago`, `desierto`, `valle`, `llanura`, `pais` o `reino`. `precision` es `punto`, `zona` o `incierto`. Un lugar cuya ubicación no se conoce lleva `candidatos`:

```yaml
candidatos:
  - nombre: Tierras altas al sur del lago Van
    geometria: {tipo: zona, lat: 38.27, lon: 42.46, radio_km: 150}   # punto, zona (con radio_km) o franja (con hasta: {lat, lon})
    estado: favorecido_nivel_1   # seguro, favorecido_nivel_1, tradicion, alternativa, solo_nivel_2, descartado_nivel_1
    fuentes: [it-eden]
    razon: Perspicacia la da como ubicación tradicional.
```

Con `candidatos`, `lat`, `lon`, `coord_fuente` y `coord_url` pueden ser `null` y `precision` tiene que ser `zona` o `incierto`. Una lista de candidatos vacía solo vale con `estado: pendiente`. Sin candidatos, `lat` y `lon` son obligatorios. Si jw.org no sitúa un lugar y nadie lo sitúa con seguridad, van candidatos o una zona, nunca un punto inventado.

**Personas.** `fecha` (actividad conocida, con fuente), `desambiguacion` (qué la distingue de sus homónimos), `no_confundir_con` (ids de personas), `no_afirmamos` (frases con lo que no decimos, como «Pedro murió en Roma») y `relaciones`:

```yaml
relaciones:
  - tipo: pariente        # pariente, acompana, vivio_en, nacio_en, murio_en, sucede_a, mismo_que
    persona: pedro        # vivio_en, nacio_en y murio_en llevan lugar: <id> en vez de persona
    relacion: hermano     # opcional
    fecha: {...}          # opcional
    deducido: false       # obligatorio: true si la fuente lo deduce y no lo dice el texto bíblico
    fuentes: [it-andres]
    razon: Jn 1:40 lo llama hermano de Simón Pedro.
    estado: verificado
```

**Cartas.** `escritor` es obligatorio (id de persona; las 14 de Pablo llevan `escritor: pablo`). Opcionales: `destinatarios.personas` y `portadores`, listas de ids de personas. La comprobación de que una carta cae en una parada de Pablo solo mira las cartas de Pablo.

**Periodos.** `tipo` es `emperador`, `gobernador`, `potencia`, `rey`, `era` o `sumo-sacerdote`. `persona` es opcional (id de persona).

**Hallazgos** (`data/hallazgos/<id>.yaml`): `nombre`, `lugar_hallazgo` (id de lugar), `relaciona` (lista de selecciones `tipo:id`), `fecha_objeto` (objeto `fecha`), `resumen`, `razon`, `fuentes`, `consultado`, `estado`. Una fuente de nivel 2 solo vale junto a una de nivel 1 que la cite. Sin imágenes en esta tanda.

**Recorridos** (`data/recorridos/<id>.yaml`): `titulo`, `fuentes`, `razon`, `consultado`, `estado` y `paradas`, cada una con `sel` (la selección del sitio), `t` (año astronómico, puede llevar decimales), `texto` (40 palabras como mucho), `pasajes`, y opcionalmente `no_sabemos` y `pregunta: {texto, opciones, respuesta, explicacion}`, donde `respuesta` es una de las `opciones`.

**Selecciones `tipo:id`.** Las mismas que usa la dirección del sitio (`#sel=lugar:filipos`): `lugar`, `persona`, `carta`, `viaje`, `evento`, `periodo`, `hallazgo`, `recorrido` y `libro` con su id; `parada:<viaje>/<orden>` (`parada:segundo-viaje/3`); `pasaje:<abreviatura sin tildes en minúsculas>-<capítulo>` (`pasaje:hch-16`, `pasaje:1co-13`). `build.py` comprueba que existen.

**Libros y meses.** `data/libros.yaml` y `data/calendario.yaml` son estructura y no llevan fuentes. Los hechos de un libro (`escritor` y `lugar` como texto, `fecha` en que se terminó y `abarca`, los dos objetos `fecha`) y los de un mes son campos opcionales de su entrada; en cuanto hay uno, la entrada necesita `fuentes`, `razon`, `consultado` y `estado`.

## Identificadores

- Slug del nombre TNM más conocido, ASCII y en minúsculas: `mar-de-galilea`, `herodes-antipas`.
- Los homónimos llevan el rasgo con que los distingue Perspicacia: `jehoram-de-juda`, `jehoram-de-israel`, `dario-el-medo`, `dario-i`, `zacarias-profeta`, `zacarias-padre-de-juan`, `felipe-apostol`.
- Un lugar lleva un solo id aunque tenga varios nombres. Los otros van en `nombres`, con `desde` y `hasta` si la fuente da la época.
- Antes de crear un fichero se comprueba que no existe y se crea en modo exclusivo (`open(ruta, "x")`). Si otro carril ya lo creó, se cita su id y los añadidos van a propuestas.

## Fichas mínimas

Las entidades que varios carriles citan se crean antes con su id definitivo y un dueño. Una ficha mínima lleva su artículo de Perspicacia confirmado por el título de la página, `resumen: "Ficha en preparación."`, `estado: pendiente`, una `razon` que dice qué carril la completa y, si es un lugar, la coordenada de OpenBible. Solo el dueño la rellena; los demás solo citan el id. Antes de publicar, `grep -rl "Ficha en preparación" data/` tiene que dar 0.

## Propuestas sobre ficheros ajenos

Un carril que quiere cambiar un fichero que no es suyo escribe la versión completa en `data/_propuestas/<carril>/<tipo>/<id>.yaml`. `build.py` y `validate.py` no leen esa carpeta porque solo recorren `data/fuentes/` y `data/<tipo>/`. Al integrar, con una sola propuesta se revisa el diff y se copia. Con varias se hace una fusión a tres bandas con `git merge-file`, usando como base el original de `main`. Al terminar, `data/_propuestas/` queda vacía y se borra.

## Cuando cambia el entendimiento

Si una publicación explica algo de otra forma, lo anterior no se borra. Se hace así:

1. Se añade una entrada a `historial` del hecho:

   ```yaml
   historial:
     - fecha: "2027-10-02"
       cambio: "La fecha de la carta pasa de c. 50 a c. 51 según la nueva edición."
       fuente: it-tesalonicenses-2027
   ```

2. Se actualiza el `resumen` (y la `fecha` o lo que haya cambiado).
3. La fuente nueva entra en `fuentes`. La antigua se queda en `data/fuentes/` con `nota: sustituida`, para que el historial siga teniendo enlace.

`validate.py` exige que cada entrada de `historial` tenga `fecha`, `cambio` y `fuente`, y que la fuente exista.

## Lo más reciente de jw.org gana

Cuando dos fuentes de nivel 1 no coinciden, manda la publicación más reciente. El desacuerdo se anota en `historial` con las dos fuentes, para que se vea qué cambió y cuándo. Una fuente de nivel 2 nunca corrige a una de nivel 1.

## Revisión anual

Una vez al año (el flujo `validar` también lo hace cada lunes):

1. [`scripts/revisar.py`](../../scripts/revisar.py) lista lo que lleva 365 días o más sin releer, con una búsqueda en wol.jw.org para cada entidad. Con `--fallar` sale con código 1 si la lista no está vacía. Las mismas búsquedas están al final de cada fichero de [`registro/`](registro/README.md).
2. Se abre cada búsqueda. Si hay material más reciente, se lee y, si cambia algo, se sigue el procedimiento de arriba.
3. Se actualiza `consultado` de lo que se ha releído, aunque no haya cambiado nada.
4. `python3 scripts/validate.py --links` comprueba que todas las URL siguen respondiendo.
5. `python3 scripts/build.py` regenera el registro, y se sube el cambio.
