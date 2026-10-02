# Investigación: cómo sabemos lo que afirmamos

Cada dato del mapa dice de dónde sale, por qué lo asociamos y cuándo lo comprobamos. Esta carpeta explica el método y es el esquema que citan las cabeceras de los YAML. El registro completo, dato a dato, está en [`registro/`](registro/index.md), un fichero por tipo. La especificación del modelo, con cada regla de las relaciones, los sucesos y los cargos, está en [`modelo.md`](modelo.md).

## Núcleo en inglés, contenido en español

El núcleo de los datos va en inglés: las claves de los YAML, los tipos de relación y de suceso, cada valor cerrado, las palabras del vocabulario, los prefijos de la cobertura, los nombres de las carpetas de `data/` y de los scripts, y sus opciones. El contenido va en español: los nombres, cada texto, los ids de las fichas, los slugs de los libros, los ids de los meses, los ids de las fuentes y todo lo que lee quien usa el sitio, incluida su dirección.

Tres nombres propios no se traducen: `perspicacia`, `tnm` y `openbible`, porque nombran la obra que se consultó. El sitio sigue leyendo en `site/data.json` los nombres de siempre: [`scripts/build.py`](../../scripts/build.py) traduce al compilar.

## Dónde vive cada cosa

- [`data/sources/`](../../data/sources/): las fuentes, repartidas en ficheros (`comun.yaml` y uno por carril de trabajo). Cada fuente lleva su identificador, `title`, `work`, `url`, `level`, año o día de publicación (`published`, solo si la página lo muestra) y `checked_on`.
- [`data/books.yaml`](../../data/books.yaml): los 66 libros de la Biblia con su slug, número en wol.jw.org, nombre, abreviatura TNM, formas de búsqueda, formas escritas en los subtítulos y número de capítulos.
- [`data/calendar.yaml`](../../data/calendar.yaml): los 13 meses del calendario hebreo, con el id que usa `date.detail.month` y sus nombres por época, y los hechos de la página «El calendario».
- [`data/vocabulary.yaml`](../../data/vocabulary.yaml): el vocabulario cerrado de las relaciones, los cargos, la certeza y los papeles de un suceso, con el texto en español de cada valor.
- `data/places/`, `data/people/`, `data/journeys/`, `data/letters/`, `data/events/`, `data/periods/`, `data/finds/`, `data/tours/`: un YAML por entidad. El nombre del fichero es su identificador.
- `data/_proposals/`: cambios propuestos a ficheros de otro carril. `build.py` y `validate.py` no la leen.
- [`registro/`](registro/index.md): el registro. Lo genera [`scripts/build.py`](../../scripts/build.py) y nadie lo edita a mano.

## Qué lleva cada afirmación

Dentro de su YAML, cada hecho (un lugar, una persona, un viaje, una carta, un suceso, un periodo, un hallazgo, un recorrido) lleva:

| Campo | Qué es |
|---|---|
| `sources` | Lista de identificadores de `data/sources/`. Nunca vacía. |
| `reason` | Por qué hacemos esta asociación: qué pasaje o qué parte de la fuente la sostiene, con palabras nuestras («párr. 25»). Nunca vacía. |
| `checked_on` | Día en que se leyó la fuente, `AAAA-MM-DD`. |
| `status` | `verified` solo si alguien abrió la fuente enlazada y dice eso. Si no, `pending`, con el motivo en `reason`. |
| `history` | Opcional. Los cambios de entendimiento, explicados más abajo. |

**Los hechos anidados llevan los suyos.** Un hecho anidado es un objeto de una ficha con fuentes y razón propias: cada relación de una persona, cada parada de un viaje, cada candidato de un lugar, y cada nombre y cada fiesta de un mes. Cada uno lleva `sources`, `reason` y `checked_on`, y `validate.py` rechaza el que falte. `status` es obligatorio en relaciones, paradas y candidatos; en un nombre o una fiesta de un mes es opcional y, si falta, vale el del mes.

Tres clases de objeto llevan fuentes y no son hechos anidados, porque no llevan `reason`: las fechas de `alternatives`, los `context_origin` y `context_destination` de una carta y las entradas de `history`. Toman el `checked_on` y el `status` de la ficha que los contiene.

Las fuentes son de dos niveles. Nivel 1: la Traducción del Nuevo Mundo y las publicaciones de wol.jw.org y jw.org. Nivel 2: arqueología o investigación, y solo cuando jw.org las ha usado; nunca en contra del nivel 1. De OpenBible tomamos únicamente coordenadas. Nunca copiamos texto de jw.org: `summary`, `reason`, `note`, `text`, `explanation`, `disambiguation`, `unknown`, `weather`, `harvest` y cada frase de `not_claimed` tienen 40 palabras como mucho (`scripts/validate.py` lo comprueba) y se escriben con nuestras palabras, siempre con enlace.

## Fuentes

- Cada carril escribe solo `data/sources/<carril>.yaml`. `build.py` junta todos los ficheros.
- **La `url` es la página de www.jw.org.** Se saca del buscador de jw.org, `https://www.jw.org/finder?wtlocale=S&docid=<documento>`, sin lo que va detrás de `#`. Una URL de wol.jw.org es un error de `validate.py` salvo las de [`scripts/wol_exceptions.yaml`](../../scripts/wol_exceptions.yaml), que jw.org no tiene, cada una con su porqué. Los pasos y la forma exacta de un capítulo y de unos versículos están en [versiculos.md](versiculos.md#qué-dirección-se-escribe).
- Un id repetido con la misma `url` y el mismo `title` se funde en uno y se queda el `checked_on` más reciente. Un id repetido con datos distintos es un error que nombra los dos ficheros.
- **Los capítulos de la Biblia son fuentes implícitas.** Un id `<slug>-<capítulo>` (`mateo-26`, `esdras-7`) que no esté en ningún fichero lo crea `build.py` a partir de `data/books.yaml`: título «Mateo 26», obra TNM de estudio, URL `https://www.jw.org/es/biblioteca/biblia/biblia-estudio/libros/mateo/26/`, nivel 1. Un capítulo que no existe (`mateo-29`) es un error. Los `hch-N` y los capítulos de cartas que ya estaban escritos se quedan como están.

## Fechas

Un objeto fecha vive en `date`, en `object_date` de un hallazgo y en `covers` de un libro. Lleva `from` y `to` en años astronómicos con signo (1 a.e.c. = 0, 537 a.e.c. = −536), `precision` (`day`, `month`, `season`, `year` o `range`), `approx`, `type`, `chronology` (`tnm` o `secular`) y `text`, que es la fecha escrita como se lee. El objeto sale de la [maqueta de datos](../ideas/mockups/data/README.md), que lo escribe con los nombres de antes. Además:

| Campo | Qué es |
|---|---|
| `type: derived` | Cálculo nuestro, no de la fuente. Exige `date.note` con la cuenta y `status: pending` en el hecho. Los otros tipos son `anchored` y `narrative`. |
| `detail` | Opcional: `{month: nisan, day: 14}` o `{season: autumn}`. El mes es un id de `data/calendar.yaml`; el día va de 1 a 30 y necesita mes; las estaciones son `spring`, `summer`, `autumn` y `winter`. Solo en una fecha de un año (`from == to`): en un tramo de años el sitio leería el mes en el primero. |
| `alternatives` | Opcional, en cualquier entidad: lista de `{date, sources, note}` cuya `date` lleva `chronology: secular`. Solo con una fuente que jw.org haya usado. |
| `narrative_order` | Opcional, en sucesos: `{series: a7, order: 57}` para ordenar sucesos sin fecha fina (la armonía de la tabla A7, los capítulos de Hechos). Con `after: <id de suceso>`, el suceso va después de ese otro aunque sea de otra serie: la elección de Matías (Hechos) va tras la ascensión (A7). |

**Comprobación año/texto.** Si `date.text` dice «537 a.e.c.», `from` o `to` tiene que ser −536. Se mira el primer año con era del texto (y los dos de un rango como «c. 49-52 e.c.»). Caza el error de un año que se comete al olvidar que no hubo año cero.

## Campos por tipo

Los campos obligatorios de siempre siguen igual. Lo nuevo es opcional salvo donde se dice.

**Lugares.** `type` es uno de `city`, `region`, `island`, `province`, `port`, `cape`, `mountain`, `river`, `sea`, `lake`, `desert`, `valley`, `plain`, `country` o `kingdom`. `precision` es `point`, `zone` o `uncertain`. Un lugar cuya ubicación no se conoce lleva `candidates`:

```yaml
candidates:
  - name: Tierras altas al sur del lago Van
    geometry: {type: zone, lat: 38.27, lon: 42.46, radius_km: 150}   # point, zone (con radius_km) o strip (con to: {lat, lon})
    status: favored_level_1   # certain, favored_level_1, tradition, alternative, level_2_only, rejected_level_1
    sources: [it-eden]
    reason: Perspicacia la da como ubicación tradicional.
    checked_on: '2026-09-29'
```

Cada candidato dice de dónde sale su punto: `coord_source: openbible:<id>` con `coord_url` a esa ficha de OpenBible, o `coord_source: calculation` con `note` que da la cuenta del centro. Un lugar que comparte punto con otro, como una región con su capital, lo explica en `coord_note`. Un río, un mar o un valle a menos de 0,5 km de otro lugar que no sea una región, provincia, país, reino, desierto, llanura o valle (los que el mapa rotula aparte) avisa (`shared_point`) si su `coord_note` no nombra a ese lugar: o se mueve con su razón, o la nota dice por qué lo comparte.

Con `candidates`, `lat`, `lon`, `coord_source` y `coord_url` pueden ser `null` y `precision` tiene que ser `zone` o `uncertain`. Una lista de candidatos vacía solo vale con `status: pending`. Sin candidatos, `lat` y `lon` son obligatorios. Si jw.org no sitúa un lugar y nadie lo sitúa con seguridad, van candidatos o una zona, nunca un punto inventado.

**Personas.** `perspicacia` (la clave de identidad: el documento de su artículo de Perspicacia y, si el artículo trata de varias personas, `#` y el número de la entrada, como `'1200003629#1'`; `null` si no tiene artículo; única entre las personas y obligatoria para las que salen en `entities` de la cobertura), `date` (actividad conocida, con fuente), `disambiguation` (qué la distingue de sus homónimos), `distinct_from` (ids de personas), `not_claimed` (frases con lo que no decimos, como «Pedro murió en Roma») y `relations`, que tienen su sección más abajo.

**Viajes.** `person`, `reference`, `date`, `companions` (quienes van en todo el viaje) y `stops`. Cada parada lleva `order`, `place`, `reference` y `date`, y es un hecho anidado con sus `sources`, `reason`, `checked_on` y `status`.

Una parada es un lugar que el texto dice que se alcanzó o se pasó, en el orden del relato. Tres clases de parada deducida entran también, siempre con `status: pending` y la deducción escrita en `reason`:

- el lugar que jw.org da como salida o llegada (Perspicacia «Jacob» pone a Jacob en Hebrón);
- la salida de un viaje que solo cuenta una carta, que es el `written_in` de esa carta (Crescente sale de Roma en 2Ti 4:10);
- la salida o la vuelta que el relato deja ver sin nombrarla: la capital donde reina quien sale (Jerusalén en 2Sa 5:17), la casa adonde vuelve (Saúl a Guibeá en 1Sa 24:22) o el último lugar donde el relato dejó a quien sale (Eliseo en Samaria antes de 2Re 8:7).

Una deducción que el texto contradice no entra: si el relato pone la salida en otro sitio, manda el relato (el resto de Judá sale de Gabaón en Jer 41:12-16, no de Mizpá). Lo que solo se cruza o se anuncia (el Éufrates, Ofir adonde navega una flota) va en la `note` de la parada más cercana.

**Cartas.** `writer` es obligatorio (id de persona; las 14 de Pablo llevan `writer: pablo`). Opcionales: `recipients.people`, `carriers` y `people` (las nombradas en la carta), listas de ids de personas que `build.py` comprueba. La comprobación de que una carta cae en una parada de Pablo solo mira las cartas de Pablo.

**Sucesos.** `places` va en orden: el primero es donde ocurre lo principal, y es el único donde el sitio sitúa a las personas del suceso. Si ese lugar no tiene punto (un lugar incierto), el suceso no sitúa a nadie. `present` es opcional: lista de ids de `people` que estaban en ese primer lugar. Si está, solo ellas se sitúan allí y las demás solo se nombran, como Augusto en el nacimiento de Jesús. `present: []` es un suceso que no sitúa a nadie, porque pasa en un sitio que el texto no nombra (en el camino de Moab a Judá). `build.py` comprueba que cada id de `present` está también en `people`.

Quién nace, muere, escribe o habla lo dicen `type` y `roles`:

```yaml
type: death                  # opcional: birth, death, writing o speech
roles:
  raquel: died               # born, died, wrote, spoke o raised
  benjamin-hijo-de-jacob: born
```

- `roles` es un mapa de id de persona a papel, y cada id tiene que estar en `people`. Un suceso con `type` lleva al menos una persona con el papel de ese tipo. Puede llevar papeles sin tipo, o de otra clase, como Benjamín arriba.
- Quien no tiene ficha no tiene papel. Si quien nace, muere, escribe o habla no tiene ficha, el suceso lleva `roles: {}` y lo explica en `reason`.
- `raised` dice que la persona volvió a la vida: una muerte suya anterior deja de cerrar su edad. Quien muere y vuelve a vivir en el mismo suceso lleva solo `raised`.
- El papel toma la fecha del suceso. Si el suceso abarca años y el papel cae en uno, el papel lleva su forma larga, `{role: died, date: {...}}`, y `place` si el texto dice dónde. Un papel no sitúa a nadie: eso lo dice `present`.
- Un suceso sin `type` cuyo título empieza por «Nace», «Nacimiento», «Muere» o «Muerte» avisa. El sitio aún lee del título quién nace o muere, y calcula la edad con la primera persona de `people`, hasta que pase a leer `roles`. Mientras tanto, quien nace o muere va también primero en `people`.

**Periodos.** `type` es `emperor`, `governor`, `power`, `king`, `era` o `high_priest`. `person` es opcional (id de persona). `office` es opcional, cuando el cargo no es el de su `type`: el periodo de Atalía es de `type: king` y lleva `office: queen`. De cada periodo con `person`, `build.py` deriva el cargo que esa persona ejerció. Una potencia sin fecha de ascenso (`date.from: null`) puede llevar `attested_from`, el año desde el que las fuentes ya la muestran mandando: Asiria al tomar Samaria en 740 a.e.c. Tiene que caer después del ascenso de la potencia anterior (las potencias van por `date.from`). Antes de ese año el sitio dice «cambio sin fechar»; desde ese año, solo esa potencia. La `reason` del periodo dice de dónde sale. Una potencia puede llevar `events`, la lista de ids de sucesos de su historia que no ocurren en sus lugares (la caída de Samaria es de Asiria aunque pase en Samaria): al elegir la potencia se resaltan, y la reproducción se para en ellos.

**Hallazgos** (`data/finds/<id>.yaml`): `name`, `found_at` (id de lugar), `relates_to` (lista de selecciones `tipo:id`), `object_date` (objeto fecha), `summary`, `reason`, `sources`, `checked_on`, `status`. Una fuente de nivel 2 solo vale junto a una de nivel 1 que la cite. Sin imágenes en esta tanda. Campos opcionales: `identification` (`certain` o `uncertain`; con `uncertain` la ficha pone la insignia «identificación incierta» y lo dice en «Lo que el texto no dice»), `kept_at` (texto de 40 palabras como mucho: dónde se guarda hoy el objeto) y `not_claimed` (lista de frases de 40 palabras como mucho, como en las personas). `scripts/validate.py` comprueba los tres.

**Recorridos** (`data/tours/<id>.yaml`): `title`, `sources`, `reason`, `checked_on`, `status` y `stops`, cada una con `sel` (la selección), `t` (año astronómico, puede llevar decimales; tiene que caer dentro de la ventana que el sitio calcula para la fecha de `sel`, con su `detail` de mes y día), `text` (40 palabras como mucho), `passages`, y opcionalmente `unknown` y `question: {text, options, answer, explanation}`, donde `answer` es una de las `options`.

**Selecciones `tipo:id`.** En los YAML, el tipo va en inglés: `place`, `person`, `letter`, `journey`, `event`, `period`, `find`, `tour` y `book` con su id; `stop:<viaje>/<orden>` (`stop:segundo-viaje/3`); `passage:<abreviatura sin tildes en minúsculas>-<capítulo>` (`passage:hch-16`, `passage:1co-13`). `build.py` comprueba que existen y las devuelve al sitio con el nombre de su dirección, que sigue en español (`#sel=lugar:filipos`, `#sel=parada:segundo-viaje/3`).

**Libros y meses.** `data/books.yaml` y `data/calendar.yaml` son estructura y no llevan fuentes. Los hechos de un libro (`writer` y `place` como texto, `date` en que se terminó y `covers`, los dos objetos fecha) y los de un mes son campos opcionales de su entrada; en cuanto hay uno, la entrada necesita `sources`, `reason`, `checked_on` y `status`. Los hechos de un mes son `equivalent` (meses de nuestro calendario, «marzo-abril»), `festivals` (lista de `{from, to, name, instituted_in}` con los días del mes), `weather`, `harvest` (cosechas) y `note`. Cada fiesta es un hecho anidado.

**Nombres de los meses por época.** Cada mes lleva `names`, como un lugar: una lista de `{name, from, to, note, sources, reason, checked_on}`. `from` y `to` son años astronómicos y solo van cuando la fuente da la época; el año frontera se repite en los dos nombres, como en Jebús y Ciudad de David. `note`, `sources`, `reason` y `checked_on` son obligatorios.

```yaml
names:
  - name: Nisán
    from: -536          # tras el exilio, que acaba en 537 a.e.c.
    note: Nombre babilonio que los judíos usaron tras el exilio (Ne 2:1; Est 3:7). El año del cambio es aproximado.
    sources: [it-nisan, it-calendario, si-3]
    reason: Perspicacia «Nisán», párr. 1, y «Calendario», apartado «Calendario hebreo», párr. 7.
    checked_on: '2026-09-28'
  - name: Abib
    to: -536
    note: Nombre antiguo (Éx 13:4). Antes del éxodo era el séptimo mes del año; desde el éxodo, el primero.
    sources: [it-abib, it-nisan, it-calendario]
    reason: Perspicacia «Abib», párr. 1 y 2.
    checked_on: '2026-09-28'
```

Antes del exilio la Biblia solo nombra cuatro meses (Abib, Ziv, Etanim y Bul) y a los demás los llama por su número, así que el resto de los meses lleva un único nombre con `from: -536` y una `note` que dice su número. El nombre principal del mes tiene que estar en `names`, y `other_names`, que usa la fecha escrita de la barra de arriba («14 abib 1513 a.e.c.»), tiene que llevar exactamente los demás. Dos épocas solo pueden compartir el año frontera; en ese año la línea de tiempo da el nombre que empieza (el que lleva `from`), sea cual sea el orden de la lista. Dos nombres con la misma época exacta son formas del mismo nombre, como Hesván y Marhesván, y la línea usa el primero. `scripts/validate.py` comprueba todo esto.

**La página «El calendario».** La sección `explanation` de `data/calendar.yaml` es una lista de hechos cortos: `{id, title, text, sources, reason, checked_on, status}`, con `history` opcional. `id` es un slug único y `text` tiene 40 palabras como mucho. Solo entran calendarios de naciones que salen en la Biblia y que jw.org explica (Egipto, Babilonia, Roma), nada más.

## Relaciones

Las relaciones de una persona van en `relations` de su ficha. La especificación completa está en [`modelo.md`](modelo.md#5-relaciones), y las palabras con sus textos, en [`data/vocabulary.yaml`](../../data/vocabulary.yaml).

**Una sola dirección.** Una relación escrita en la ficha X con destino Y y palabra W dice **«Y es el W de X»**, en todos los tipos. La ficha de David lleva `person: jese` con `word: father`. Cada par se escribe una vez: la otra ficha no la repite, y el sitio la muestra en las dos con el texto inverso del vocabulario.

```yaml
relations:
- type: accompanies
  person: pablo
  date:
    from: 50
    to: 50
    precision: season
    approx: true
    type: anchored
    chronology: tnm
    text: primavera de 50 e.c.
  inferred: false
  sources:
  - it-lucas
  - hch-16
  - si-3
  reason: Los pasajes en «nosotros» empiezan en Troas y siguen hasta Filipos (Hch 16:10-17). Cruzan a Europa en la primavera
    de 50 (estudio 3, párr. 24).
  checked_on: '2026-09-29'
  status: verified
```

| Campo | Obligatorio | Qué es |
|---|---|---|
| `type` | sí | El tipo, de la tabla de abajo. |
| `person` o `place` | sí, salvo `place` en `holds_office` | El destino, según el tipo. |
| `word` | según el tipo | Una palabra de `words` del vocabulario, de ese tipo. |
| `caption`, `inverse_caption` | no | Los dos textos de una relación que se queda fuera del vocabulario. Nunca junto a `word`. |
| `office` | en `succeeds` y `holds_office` | Un cargo de `offices` del vocabulario. |
| `certainty` | en `same_as` | `probable` o `possible`: cuánto de segura da la fuente la identidad. |
| `date` | cuando el texto o la fuente la dan | Desde cuándo y hasta cuándo. |
| `inferred` | sí | `true` si lo deduce la publicación y no lo dice el texto bíblico. |
| `sources`, `reason`, `checked_on`, `status` | sí | Lo de todo hecho. |

| `type` | Destino | Palabra | En qué ficha va |
|---|---|---|---|
| `kin` | persona | `word` | La que dice su palabra: la persona más joven (`father`, `mother`, `uncle`...), el esposo (`wife`), o el primero que nombra el texto (`brother`, `sister`, `cousin`, `relative`...). |
| `disciple_of` | persona | ninguna | La del discípulo. |
| `accompanies` | persona | `companion`, `female_companion`, `fellow_worker`, o ninguna con `date` | La de quien acompaña. |
| `tie` | persona | `friend`, `enemy`, `ally`, `master`, `mistress`, `host`, `custodian`, `adviser` | La que dice su palabra: quien sirve, quien se hospeda, quien va custodiado, quien recibe el consejo, o el primero que nombra el texto. |
| `succeeds` | persona | ninguna; lleva `office` | La de quien sucede. |
| `same_as` | persona | ninguna; lleva `certainty` e `inferred: true` | Aquella cuyo id va primero por orden alfabético. |
| `appears_to` | persona | ninguna, o un `caption` | La de quien se aparece o habla en una visión. |
| `lived_in`, `born_in`, `died_in` | lugar | ninguna | La de la persona. |
| `holds_office` | lugar, opcional | ninguna; lleva `office` | La de la persona. |

- **Las palabras que dicen la otra dirección no se escriben.** `son`, `daughter`, `adopted_son`, `grandson`, `nephew`, `son_in_law`, `husband` y `servant` existen para leer, y escritas en una ficha avisan (`wrong_owner`): la relación va en la otra ficha con la palabra inversa.
- **Una palabra dice el sexo del destino**, como en español: `brother` y `sister`, `master` y `mistress`.
- **Lo que no cabe en el vocabulario** va en `caption`, con `inverse_caption` visto desde el destino, y tiene que estar en `outside` del vocabulario con su porqué. Un `caption` que no está allí avisa. Añadir una palabra, un cargo o un texto admitido es un cambio revisado de `data/vocabulary.yaml`.
- **Un cargo** va en `succeeds` (el que toma quien sucede), en `holds_office` (el que ejerció alguien sin periodo, como un profeta, un juez o un apóstol) y en un periodo. Quien tuvo dos cargos lleva dos relaciones.
- **La clave** de una relación es (`type`, destino, `word` u `office`, `date.from`), y dos relaciones de una ficha no pueden compartirla. Varias con el mismo tipo, destino y palabra son tramos: cada una lleva su `date.from`. Lucas acompaña a Pablo en tres tramos, y son tres relaciones.
- **Una relación se cita** como `relation:` y su clave escrita, `<persona>/<type>/<destino>`, con `/<word u office>` y `@<from>` solo si hacen falta para que case con una sola (`-` si no hay destino): `relation:rut/kin/noemi`, `relation:lucas/accompanies/pablo@50`, `relation:samuel/holds_office/-/judge`.
- **Quitar o mover una relación deja rastro.** Quien lo hace añade una fila a `scripts/migration/redirects.yaml` con la clave que desaparece y la que queda, para que una cita o una propuesta que nombra la antigua llegue a la nueva.

**Cada arista lleva verbo, fecha y referencia.** El verbo sale del vocabulario. La fecha es la de la relación, o «sin fecha». La referencia es un pasaje: el que cita su `reason`, un capítulo de sus `sources` o un tramo de la cobertura que la cita. Las fuentes solas no son una referencia: una relación sin pasaje avisa y el sitio no la dibuja.

## Identificadores

- Slug del nombre TNM más conocido, ASCII y en minúsculas: `mar-de-galilea`, `herodes-antipas`.
- Los homónimos llevan el rasgo con que los distingue Perspicacia: `jehoram-de-juda`, `jehoram-de-israel`, `dario-el-medo`, `dario-i`, `zacarias-profeta`, `zacarias-padre-de-juan`, `felipe-apostol`. Para las personas nuevas el rasgo es fijo, para que dos carriles elijan el mismo id: el reino en un rey, `<nombre>-hijo-de-<padre>` si se sabe el padre, y si no, el rasgo de Perspicacia ([`versiculos.md`](versiculos.md#4-personas), sección 4).
- Un lugar lleva un solo id aunque tenga varios nombres. Los otros van en `names`, con `from` y `to` si la fuente da la época.
- Antes de crear un fichero se comprueba que no existe y se crea en modo exclusivo (`open(ruta, "x")`). Si otro carril ya lo creó, se cita su id y los añadidos van a propuestas.

## Fichas mínimas

Las entidades que varios carriles citan se crean antes con su id definitivo y un dueño. Una ficha mínima lleva su artículo de Perspicacia confirmado por el título de la página, `summary: "Ficha en preparación."`, `status: pending`, una `reason` que dice qué carril la completa y, si es un lugar, la coordenada de OpenBible. Solo el dueño la rellena; los demás solo citan el id. Antes de publicar, `grep -rl "Ficha en preparación" data/` tiene que dar 0.

## Propuestas sobre ficheros ajenos

Un carril que quiere cambiar un fichero que no es suyo escribe la versión completa en `data/_proposals/<carril>/<carpeta>/<id>.yaml`. La lectura de la Biblia usa operaciones en vez de copias: `scripts/apply.py --parallel` deja en `data/_proposals/<libro>.json` los cambios a fichas ajenas (añadir fuentes, relaciones o pasajes, o cambiar un campo con su `antes`), y la integración los aplica con el mismo script, sin fusión a tres bandas. `build.py` y `validate.py` no leen esa carpeta porque solo recorren `data/sources/` y las carpetas de cada tipo. Al integrar, con una sola propuesta se revisa el diff y se copia. Con varias se hace una fusión a tres bandas con `git merge-file`, usando como base el original de `main`. Al terminar, `data/_proposals/` queda vacía y se borra.

## Cobertura de la Biblia

La meta es leer cada versículo de la TNM y dejarlo apuntado. `data/coverage/<libro>.yaml` lo demuestra libro a libro: cada capítulo tiene `status` (`pending` o `complete`) y una lista de `spans`, tramos de versículos seguidos, cada uno con su `type` de pasaje, el día en que se leyó (`reviewed_on`), las `entities` que produjo o confirmó y lo que solo `mentions`. `data/books.yaml` da el último versículo de cada capítulo (`verses`) y los que la TNM no incluye (`omitted`), que nunca hacen falta.

- El formato y las reglas que comprueba `scripts/validate.py` están en [`data/coverage/README.md`](../../data/coverage/README.md).
- El protocolo para leer unos capítulos, qué se convierte en persona, lugar, suceso o relación y cómo se devuelve una propuesta está en [`versiculos.md`](versiculos.md).
- Cada entidad de `entities` tiene que citar el capítulo, igual que la vería la página de ese capítulo en el sitio: el capítulo en sus `sources` (`rut-1`) o la cita escrita en su `reason` (en un suceso, en `passages`).
- [`scripts/build.py`](../../scripts/build.py) escribe el estado en [`registro/cobertura.md`](registro/cobertura.md) y un resumen en `cobertura` de `data.json`. [`scripts/bible_coverage.py`](../../scripts/bible_coverage.py) lo imprime; con `--missing <libro>` lista lo que falta y con `--fail` sale con código 1 si queda algún capítulo sin completar.

## Cuando cambia el entendimiento

Si una publicación explica algo de otra forma, lo anterior no se borra. Se hace así:

1. Se añade una entrada a `history` del hecho:

   ```yaml
   history:
     - date: "2027-10-02"
       change: "La fecha de la carta pasa de c. 50 a c. 51 según la nueva edición."
       source: it-tesalonicenses-2027
   ```

2. Se actualiza el `summary` (y la `date` o lo que haya cambiado).
3. La fuente nueva entra en `sources`. La antigua se queda en `data/sources/` con `note: sustituida`, para que el historial siga teniendo enlace.

`validate.py` exige que cada entrada de `history` tenga `date`, `change` y `source`, y que la fuente exista.

## Lo más reciente de jw.org gana

Cuando dos fuentes de nivel 1 no coinciden, manda la publicación más reciente. El desacuerdo se anota en `history` con las dos fuentes, para que se vea qué cambió y cuándo. Una fuente de nivel 2 nunca corrige a una de nivel 1.

## Revisión anual

Una vez al año (el flujo `validar` también lo hace cada lunes):

1. [`scripts/review.py`](../../scripts/review.py) lista lo que lleva 365 días o más sin releer, con una búsqueda en wol.jw.org para cada entidad. Mira el `checked_on` de cada fichero y el de cada uno de sus hechos anidados, y da una línea por fichero con la fecha más antigua. Con `--fail` sale con código 1 si la lista no está vacía. Las mismas búsquedas están al final de cada fichero de [`registro/`](registro/index.md).
2. Se abre cada búsqueda. Si hay material más reciente, se lee y, si cambia algo, se sigue el procedimiento de arriba.
3. Se actualiza `checked_on` de lo que se ha releído, en el fichero y en cada hecho anidado releído, aunque no haya cambiado nada.
4. `python3 scripts/validate.py --links` comprueba que todas las URL siguen respondiendo.
5. `python3 scripts/build.py` regenera el registro, y se sube el cambio.
