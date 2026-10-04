# El modelo: relaciones, sucesos y núcleo en inglés

Este documento es la especificación del modelo de datos. Desarrolla las propuestas 1 a 6 y las tres reglas de [`docs/ideas/grafo-y-relaciones.md`](../ideas/grafo-y-relaciones.md), con el núcleo en inglés. Lo acompañan dos ficheros que leen los scripts:

- [`data/vocabulary.yaml`](../../data/vocabulary.yaml): el vocabulario cerrado de tipos, palabras, cargos, certezas y papeles.
- [`scripts/migration/map.yaml`](../../scripts/migration/map.yaml): el mapa de renombres, de lo que hay hoy a lo que dice este documento.

Las cifras están medidas el 2026-09-29 sobre `14b6c01`: 722 personas, 306 lugares, 558 sucesos, 87 periodos, 8 viajes con 91 paradas, 22 cartas y 1435 relaciones, todas en fichas de persona. Las ramas de libro siguen añadiendo datos, así que cada puerta de la sección 15 vuelve a medir el día que se migra.

Mientras la migración no se ejecute, el esquema vigente sigue siendo el de [`README.md`](README.md). Cuando se ejecute, ese fichero, [`versiculos.md`](versiculos.md) y el [README de la cobertura](../../data/cobertura/README.md) se reescriben con los nombres de aquí, junto con los demás ficheros de `references` del mapa.

## 1. Qué va en inglés y qué no

Va en inglés el núcleo. Son las claves de los YAML, los tipos de relación y de suceso, cada valor cerrado, los identificadores del vocabulario, los prefijos de las referencias de la cobertura, los nombres de las carpetas de `data/` y de los scripts, las opciones de los scripts, los campos nuevos que compila [`build.py`](../../scripts/build.py) y los identificadores del código nuevo.

Se queda en español el contenido. Son los nombres, cada texto, los ids de las fichas, los slugs de los libros, los ids de los meses, las series de `narrative_order`, los ids y los nombres de fichero de las fuentes, la prosa de los documentos, los mensajes de los scripts y todo lo que lee quien usa el sitio, incluida su dirección.

Tres nombres propios no se traducen. `perspicacia`, que es la clave de identidad de una persona y un tipo de enlace, `tnm`, que es la cronología, y `openbible` nombran la obra que se consultó, en la edición que se consultó.

**Lo que el sitio ya lee no cambia.** `site/data.json` conserva sus claves y sus valores de hoy. `build.py` hace de adaptador. Lee los YAML en inglés y escribe los campos de siempre, con el mismo mapa leído al revés. Lo nuevo se añade al lado, en inglés (sección 11).

**El sobre de una propuesta espera.** Tres carriles escriben hoy propuestas en formato 1. En esta ola ese formato es el único que se escribe y su sobre no cambia. Lo que una propuesta lleva de una ficha se traduce al aplicarla (sección 15).

## 2. Claves del esquema

Cada clave vale lo mismo en cualquier fichero de `data/` donde aparezca. La lista para los scripts está en `keys` del mapa, y ninguna clave nueva sirve para dos antiguas.

### En todos los hechos

| Antes | Ahora | Qué es |
|---|---|---|
| `id` | `id` | Identificador, igual al nombre del fichero. |
| `nombre`, `nombres` | `name`, `names` | El nombre principal y la lista de todos, cada uno con su época si la fuente la da. |
| `titulo` | `title` | Título de un suceso, un recorrido, una fuente o un enlace. |
| `resumen` | `summary` | Qué es o qué pasó, con palabras nuestras. |
| `razon` | `reason` | Por qué lo afirmamos: qué pasaje o qué parte de la fuente lo sostiene. |
| `fuentes`, `fuente` | `sources`, `source` | Ids de las fuentes; `source` es la de una entrada del historial. |
| `consultado` | `checked_on` | Día en que se leyó la fuente, `AAAA-MM-DD`. |
| `estado` | `status` | Si alguien abrió la fuente y dice eso. |
| `historial`, `cambio` | `history`, `change` | Los cambios de entendimiento, cada uno con `date`, `change` y `source`. |
| `enlaces`, `url` | `links`, `url` | Enlaces de la ficha, cada uno con `title`, `url` y `type`. |
| `nota` | `note` | Aclaración breve. |
| `tipo` | `type` | La clase, de una lista cerrada que depende de dónde está (sección 3). |
| `buscar` | `search` | Texto de la búsqueda en wol.jw.org para la revisión anual. |
| `alternativas` | `alternatives` | Otras fechas, de la cronología secular, con su fuente. |
| `no_afirmamos` | `not_claimed` | Frases con lo que no decimos. |

### Fechas

| Antes | Ahora | Qué es |
|---|---|---|
| `fecha` | `date` | El objeto fecha. En el historial, el día del cambio. |
| `desde`, `hasta` | `from`, `to` | Años astronómicos de principio y de fin. En un nombre, su época; en una fiesta, sus días; en una franja, su otro extremo. |
| `precision` | `precision` | Finura de la fecha. En un lugar, la de su punto. |
| `aprox` | `approx` | `true` si la fecha es aproximada. |
| `cronologia` | `chronology` | De qué cronología sale. |
| `texto` | `text` | La fecha escrita como se lee. En otros sitios, un texto para quien lee. |
| `detalle` | `detail` | Mes y día, o estación, de una fecha de un solo año. |
| `mes`, `dia`, `estacion` | `month`, `day`, `season` | El mes (id del calendario), el día y la estación. |

Un objeto fecha vive bajo tres claves, que el mapa lista en `date_keys`: `fecha`, `fecha_objeto` y `abarca`.

### Lugares

| Antes | Ahora | Qué es |
|---|---|---|
| `lat`, `lon` | `lat`, `lon` | El punto. |
| `coord_fuente` | `coord_source` | De dónde sale el punto: `openbible:<id>` o `calculation`. |
| `coord_url` | `coord_url` | La ficha de OpenBible. |
| `coord_nota` | `coord_note` | Qué representa el punto. |
| `candidatos` | `candidates` | Ubicaciones posibles de un lugar que no se sabe dónde estaba. |
| `geometria`, `radio_km` | `geometry`, `radius_km` | La forma de un candidato y el radio de una zona. |

### Personas y relaciones

| Antes | Ahora | Qué es |
|---|---|---|
| `perspicacia` | `perspicacia` | La clave de identidad: el documento de su artículo y, si hace falta, la entrada. |
| `desambiguacion` | `disambiguation` | Qué la distingue de sus homónimos. |
| `no_confundir_con` | `distinct_from` | Ids de las personas con las que se confunde. |
| `relaciones` | `relations` | Las relaciones escritas en esta ficha (sección 5). |
| `persona`, `lugar` | `person`, `place` | El destino de una relación. En otros ficheros, la persona o el lugar del hecho. |
| `relacion` | `word` o `caption` | La palabra del vocabulario, o el texto propio de la relación si se queda fuera. |
| `relacion_inversa` | `inverse_caption` | El texto propio visto desde el destino. |
| `deducido` | `inferred` | `true` si lo deduce la publicación y no lo dice el texto bíblico. |
| (nueva) | `office` | El cargo, en una sucesión, en un cargo ejercido y en un periodo. |
| (nueva) | `certainty` | Cuánto de segura da la fuente una identidad. |

### Viajes, cartas, sucesos, periodos, hallazgos y recorridos

| Antes | Ahora | Qué es |
|---|---|---|
| `companeros` | `companions` | Quienes van en todo el viaje. |
| `referencia` | `reference` | Los pasajes de un viaje, una parada o una carta. |
| `paradas`, `orden` | `stops`, `order` | Las paradas y su número. En un mes, su orden en el año. |
| `libro` | `book` | El slug del libro. |
| `escritor` | `writer` | Quien escribe: un id en una carta, un texto en un libro. |
| `escrita_en` | `written_in` | Lugares desde los que pudo escribirse. |
| `destinatarios` | `recipients` | A quién va: `text`, `places` y `people`. |
| `portadores` | `carriers` | Quienes la llevaron. |
| `contexto_origen`, `contexto_destino` | `context_origin`, `context_destination` | Qué pasaba donde se escribió y donde se recibió. |
| `lugares`, `personas` | `places`, `people` | Listas de ids. En un suceso, el primer lugar es donde ocurre lo principal. |
| `presentes` | `present` | Quienes estaban en ese primer lugar. |
| `pasajes` | `passages` | Los versículos del suceso o de la parada de un recorrido. |
| `orden_relato` | `narrative_order` | `series`, `order` y `after` (antes `serie`, `orden`, `tras`). |
| (nuevas) | `type`, `roles` | La clase del suceso y el papel de cada persona (sección 7). |
| `consta_desde` | `attested_from` | Año desde el que las fuentes muestran mandando a una potencia sin fecha de ascenso. |
| `sucesos` | `events` | Sucesos de la historia de una potencia que pasan fuera de sus lugares. |
| `lugar_hallazgo` | `found_at` | Dónde se halló. |
| `relaciona` | `relates_to` | Selecciones con las que se relaciona el hallazgo. |
| `fecha_objeto` | `object_date` | La fecha del objeto. |
| `identificacion` | `identification` | Si la identificación es segura. |
| `donde_hoy` | `kept_at` | Dónde se guarda hoy. |
| `sel`, `t` | `sel`, `t` | La selección y el año de una parada de recorrido. |
| `no_sabemos` | `unknown` | Lo que no se sabe de esa parada. |
| `pregunta`, `opciones`, `respuesta`, `explicacion` | `question`, `options`, `answer`, `explanation` | La pregunta de una parada. `explanation` es también la sección del calendario. |

### Libros, calendario, fuentes, cobertura y vídeos

| Antes | Ahora | Qué es |
|---|---|---|
| `libros` | `books` | La lista de los 66 libros. |
| `slug`, `num` | `slug`, `num` | El slug y el número en wol.jw.org. |
| `abr` | `abbr` | La abreviatura de la TNM. |
| `formas`, `habladas` | `forms`, `spoken` | Las formas que acepta el buscador y las que salen en los subtítulos. |
| `capitulos` | `chapters` | El número de capítulos de un libro. En la cobertura y en los vídeos, el mapa por capítulo. |
| `versiculos`, `omitidos` | `verses`, `omitted` | El último versículo de cada capítulo y los que la TNM no incluye. |
| `abarca` | `covers` | El tiempo que abarca el libro. |
| `meses` | `months` | Los 13 meses. |
| `otros_nombres` | `other_names` | Los demás nombres del mes. |
| `equivale` | `equivalent` | Los meses de nuestro calendario. |
| `fiestas`, `instituida` | `festivals`, `instituted_in` | Las fiestas del mes y el año en que se instituyó cada una. |
| `clima`, `campo` | `weather`, `harvest` | El tiempo y las cosechas del mes. |
| `obra` | `work` | La obra a la que pertenece una fuente. |
| `nivel` | `level` | 1 o 2. |
| `publicado` | `published` | Año o día de publicación, si la página lo muestra. Lleva una cosa o la otra, y por eso no acaba en `_on` ni en `_in`. |
| `revisado` | `reviewed_on` | Día en que se leyó un capítulo o un tramo. |
| `tramos`, `v` | `spans`, `v` | Los tramos de versículos y sus versículos. |
| `entidades`, `menciona` | `entities`, `mentions` | Lo que el tramo cuenta y lo que solo nombra. |
| `generado` | `generated_on` | Día en que se generó un índice de vídeos. |
| `videos`, `docid` | `videos`, `docid` | Los vídeos y su id en jw.org. |
| `menciones`, `terminos` | `hits`, `terms` | Cuántas veces se nombra y con qué formas. |
| `serie` | `series` | Los vídeos de presentación del libro. |
| `por`, `citas` | `matched_by`, `citations` | Por qué casa el vídeo con el capítulo y cuántas veces lo cita. |

La configuración de los vídeos tiene sus claves en `video_config_keys` del mapa.

## 3. Valores cerrados

| Campo | Valores |
|---|---|
| `status` de un hecho | `verified`, `pending` |
| `status` de un capítulo de la cobertura | `pending`, `complete` |
| `status` de un candidato | `certain`, `favored_level_1`, `tradition`, `alternative`, `level_2_only`, `rejected_level_1` |
| `date.precision` | `day`, `month`, `season`, `year`, `range` |
| `date.type` | `anchored`, `narrative`, `derived` |
| `date.chronology` | `tnm`, `secular` |
| `date.detail.season` | `spring`, `summer`, `autumn`, `winter` |
| `type` de un lugar | `city`, `region`, `island`, `province`, `port`, `cape`, `mountain`, `river`, `sea`, `lake`, `desert`, `valley`, `plain`, `country`, `kingdom` |
| `precision` de un lugar | `point`, `zone`, `uncertain` |
| `geometry.type` | `point`, `zone`, `strip` |
| `coord_source` | `openbible:<id>`, `calculation` |
| `type` de un enlace | `perspicacia`, `bible`, `video`, `external` |
| `type` de un periodo | `emperor`, `governor`, `power`, `king`, `era`, `high_priest` |
| `identification` | `certain`, `uncertain` |
| `type` de un tramo | `narration`, `genealogy`, `law`, `poetry`, `prophecy`, `speech`, `letter`, `list`, `vision` |
| `type` de una relación | `kin`, `disciple_of`, `accompanies`, `tie`, `succeeds`, `same_as`, `appears_to`, `lived_in`, `born_in`, `died_in`, `holds_office` |
| `word` de una relación | las palabras de `words` del vocabulario |
| `office` | `king`, `queen`, `coregent`, `emperor`, `governor`, `proconsul`, `ethnarch`, `tetrarch`, `sheikh`, `high_priest`, `priest`, `prophet`, `prophetess`, `judge`, `apostle`, `leader` |
| `certainty` | `probable`, `possible` |
| `type` de un suceso | `birth`, `death`, `writing`, `speech` |
| papel en un suceso | `born`, `died`, `wrote`, `spoke`, `raised` |
| tipo de una selección o prefijo de una referencia | `person`, `place`, `event`, `period`, `journey`, `letter`, `find`, `tour`, `book`, `stop`, `passage`, `relation` |

Las listas de relación, cargo, certeza y suceso viven en `data/vocabulary.yaml` con el texto en español de cada valor. Añadir un valor es añadir allí su entrada, en un cambio revisado.

**Dónde vive cada valor cerrado está en el mapa.** Cada entrada de `enums` lleva `at`, una expresión regular sobre la ruta del dato en el esquema de hoy. La clave `tipo` lleva seis listas distintas según dónde está, y `at` dice cuál. La migración y su puerta leen esas rutas del mapa y de ningún otro sitio.

**Un cargo tiene un solo texto en español.** Si lo ejercen hombres y mujeres y el español los distingue, son dos cargos: `king` y `queen`, `prophet` y `prophetess`. El segundo se añade cuando una fuente llama así a alguien.

## 4. Hechos anidados, `checked_on` y `status`

Un hecho anidado es un objeto de una ficha que lleva `sources` y `reason` propios. Son cinco: cada relación, cada parada de un viaje, cada candidato de un lugar, y cada nombre y cada fiesta de un mes.

**Cada hecho anidado lleva su `checked_on`.** Es obligatorio y [`validate.py`](../../scripts/validate.py) rechaza el que falte. Hoy no lo lleva ninguno: 0 de 1435 relaciones, 0 de 91 paradas, 0 de 135 candidatos, 0 de 18 nombres de mes y 0 de 11 fiestas.

**La migración copia el del hecho que lo contiene, el más cercano.** Para una relación, una parada o un candidato es el del fichero. Para un nombre o una fiesta es el de su mes, porque `calendario.yaml` no lleva fecha de fichero: la lleva cada uno de sus 13 meses. Ningún hecho anidado se queda sin valor que copiar.

**En una rama de libro, la copia mira a `main`.** Cuando una propuesta toca una ficha, el escritor pone el día de la lectura en el `consultado` del fichero. Por eso la misma relación, sin tocar, tendría una fecha en `main` y otra en la rama, y la de la rama diría una lectura que no hubo. La migración recibe el último commit de `main` en el esquema antiguo. Un hecho anidado que está igual en ese commit toma la fecha que el fichero tenía allí. Solo uno que la rama añadió o cambió toma la fecha de la rama. Medido hoy, la diferencia afecta a 59 fichas en la rama de 1 Corintios y a 3 en la de Josué.

**`status` es obligatorio en relaciones, paradas y candidatos**, que ya lo llevan todos. En un nombre o una fiesta de un mes es opcional: 18 de 18 nombres y 10 de 11 fiestas no lo llevan, y valen con el de su mes. La migración no lo copia, porque diría una comprobación que nadie apuntó.

**Lo que no es un hecho anidado.** Tres clases de objeto llevan fuentes propias y no llevan `reason`: las 6 fechas de `alternatives`, los 44 `context_origin` y `context_destination` de las 22 cartas y las 199 entradas de `history`. Toman el `checked_on` y el `status` de la ficha que los contiene. Una entrada de `history` lleva además el día del cambio en su `date`.

**La revisión anual lee también las fechas anidadas.** [`review.py`](../../scripts/review.py) lista un fichero cuando su fecha o la de alguno de sus hechos anidados es más antigua que el límite, una vez por fichero y con la fecha más antigua. El día de la migración su salida es la de hoy, porque cada fecha anidada es copia de la de su fichero.

Después de la migración, [`apply.py`](../../scripts/apply.py) pone `checked_on` en cada relación que añade, con el día `leido` de la propuesta, y lo actualiza en la relación a la que añade una fuente.

## 5. Relaciones

### Una sola dirección

Una relación escrita en la ficha X con destino Y y palabra W dice **«Y es el W de X»**. Vale para todos los tipos. La ficha de David lleva `person: jese` con `word: father`, y la de Bilhá, `person: raquel` con `word: mistress`.

De ahí sale en qué ficha va: en la de la persona que «tiene» al otro como su padre, su esposa, su señora o su maestro. La otra ficha no la repite.

### Campos

La primera relación de la ficha de Lucas, ya migrada:

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
| `type` | sí | El tipo, del vocabulario. |
| `person` o `place` | sí, salvo `place` en `holds_office` | El destino, según el tipo. |
| `word` | según el tipo | La palabra del vocabulario. |
| `caption`, `inverse_caption` | no | Los dos textos de una relación que se queda fuera del vocabulario. Nunca junto a `word`. |
| `date` | cuando el texto o la fuente la dan | Desde cuándo y hasta cuándo. |
| `inferred` | sí | `true` si lo deduce la publicación. |
| `sources`, `reason`, `checked_on`, `status` | sí | Lo de todo hecho. |

`office` va solo en `succeeds` y `holds_office`; `certainty`, solo en `same_as`.

### Tipos

| `type` | Destino | Palabra | En qué ficha va | Pide además |
|---|---|---|---|---|
| `kin` | persona | `word`; sin ella, avisa | la que dice su palabra | |
| `disciple_of` | persona | ninguna | la del discípulo | |
| `accompanies` | persona | `word` o `date`; sin las dos, avisa | la de quien acompaña | `date` en cada una si hay varias hacia la misma persona |
| `tie` | persona | `word` | la que dice su palabra | |
| `succeeds` | persona | ninguna | la de quien sucede | `office` |
| `same_as` | persona | ninguna | aquella cuyo id va primero | `certainty`, e `inferred: true` |
| `appears_to` | persona | `caption` opcional | la de quien se aparece | |
| `lived_in`, `born_in`, `died_in` | lugar | ninguna | la de la persona | |
| `holds_office` | lugar, opcional | ninguna | la de la persona | `office` |

Qué cambia respecto a hoy:

- **`disciple_of`** recoge a los 21 que hoy son `acompana` con «maestro» (19) o «discípulo de» (2). El tipo lo dice todo y no lleva palabra.
- **`tie`** es el trato entre dos personas: amigo, enemigo, aliado, señor y siervo, anfitrión, custodio, consejero. La migración mecánica deja 7, 5 con su palabra y 2 con su texto hasta la decisión T1. Otras 18 relaciones que hoy son de compañía dicen un trato en su razón, y son la decisión T2.
- **`accompanies`** se queda con los compañeros, que son 96 relaciones. Una sin palabra y sin fecha solo dice que dos personas estuvieron juntas, y avisa: son 30.
- **`kin` sin palabra** dice «pariente» sin grado. Las 7 de hoy se quedan como están y avisan hasta la decisión K5.
- **`succeeds`** dice el cargo que toma quien sucede. Arquelao sucede a Herodes el Grande como etnarca, y Atalía a Ocozías como reina. Así el dato nunca dice de nadie un título que no tuvo.
- **`same_as`** deja de forzar `status: pending`. `status` dice si alguien abrió la fuente; `certainty`, cuánto de segura la da esa fuente. `inferred: true` sigue siendo obligatorio, como ya pide `versiculos.md`. Si jw.org dice que dos nombres son la misma persona, no hay relación, hay una sola ficha.
- **`holds_office`** dice el cargo de quien no tiene periodo, como un profeta, un juez o un apóstol. El lugar es opcional porque un apóstol no lo tiene. Quien tuvo dos cargos lleva dos relaciones. `build.py` deriva el mismo hecho de cada periodo con `person` (sección 8).

### El vocabulario

Cada palabra de `words` lleva su tipo, su texto en español (`es`), sus inversas, el verbo de cada dirección y quién manda:

| `owns` | En qué ficha va el par |
|---|---|
| `self` | En la de quien la escribe con esa palabra. `rule` dice quién es: la persona más joven, el esposo, quien sirve. |
| `target` | En la del destino, con la palabra inversa. Escrita así, la relación está en la ficha que no manda. |
| `first_named` | En la del primero que nombra el texto, o en la de la persona de quien el texto lo dice. Es la regla de hoy de `versiculos.md`, con la que escriben los carriles. |
| `first_id` | En la ficha cuyo id va primero por orden alfabético. Solo `same_as`. |

Las inversas sirven para saber si dos relaciones son el mismo par. `father` tiene por inversas `son` y `daughter`; `wife` tiene `husband`. Milcá llama a Nacor `uncle` y Nacor a Milcá `wife`. Ninguna es inversa de la otra, así que son dos hechos y los dos se quedan.

**Una palabra dice el sexo del destino, como en español.** Por eso hay `brother` y `sister`, `master` y `mistress`, `companion` y `female_companion`.

**El texto inverso nunca dice el sexo de quien escribe la relación.** La ficha de Dina lleva `word: father` hacia Jacob. En la ficha de Jacob, junto a Dina, se lee «Jacob es su padre», porque «su hijo» sería falso. Lo mismo pasa con los discípulos. Junto a Juana, en la ficha de Jesús, se lee «Jesús es su maestro». Solo `wife`, `husband` y `secondary_wife` dicen la palabra inversa, en `inverse_es`, porque la regla del esposo la hace segura. `concubine` no la dice: según el artículo «Concubina» de Perspicacia, solo algunas veces la llamaban esposa.

**Los textos con verbo van en pasado**: «vivió aquí», «fue profeta», «le sucedió como rey», «estuvo con Pablo». Los que son un nombre no llevan verbo: «su padre», «su amigo».

**`family`** dice en qué grupo de la tarjeta de familia sale el destino: `parents`, `spouses`, `children` o `siblings`. Son los mismos grupos y las mismas palabras que el sitio reconoce hoy.

**Lo que se queda fuera.** Una relación cuyo texto no es una palabra del vocabulario lo lleva en `caption` y, visto desde el destino, en `inverse_caption`. Cada texto admitido está en `outside` del vocabulario con su porqué. Hoy son 20, que se reparten en 6 de compañeros, 4 apariciones y 10 que esperan una decisión y llevan `fix`.

Hoy hay 56 valores distintos de `relacion`, y 13 de `relacion_inversa` en 17 relaciones. De los 56, 33 pasan a una palabra, 2 a un tipo sin palabra («maestro» y «discípulo de»), 1 a `certainty` y 20 se quedan como texto. Las 608 relaciones sin `relacion` siguen sin palabra.

El vocabulario tiene 43 palabras. Diez no las lleva ninguna relación de `14b6c01` después de la migración mecánica, y cada una está por algo: `brother_in_law`, `fellow_worker` y `host` las escriben ya las ramas de Josué y de 1 Corintios; `custodian` y `adviser` las pide la decisión T1, `ally` la T2, `aunt` la K2 y `parent` la K5; `servant` es la inversa de `master` y de `mistress`; y `enemy` está en la lista de tratos del documento de ideas.

### Cada par, una vez

37 pares están escritos en las dos fichas. Uno son dos hechos (Milcá y Nacor). De los otros 36:

- **20 tienen dueño por su palabra.** Son 11 de esposos, que van en la ficha del esposo, y 9 de padres e hijos, que van en la de la persona más joven.
- **16 piden leer el capítulo.** Son 12 de hermanos o parientes sin grado y 4 de compañeros, y forman la decisión K3.

**La migración no quita ninguna copia.** En 12 de los 20 pares con dueño, la copia que sobraría lleva algo que la otra no tiene: una fuente (9), un pasaje citado en su razón (5) o un `inferred` distinto (1). Las otras 8 no pierden nada hoy, pero la cuenta cambia en cada rama según lo que un carril haya añadido, y quitar en una rama lo que en `main` se queda haría chocar la fusión. Las 36 avisan como `pair_twice` y se resuelven leyendo (decisiones K3 y K4).

**El sitio dibuja una sola.** `build.py` compila las dos y marca con `duplicate_of` la copia que no manda: la de la ficha que no es dueña por su palabra o, si el dueño no se sabe, la de la ficha cuyo id va después. El sitio no da arista ni fila de familia a una relación marcada, y ninguna ficha muestra un vínculo dos veces.

**Quitar una copia deja rastro.** Quien quita o mueve una relación a mano añade una fila a `scripts/migration/redirects.yaml` con la clave que desaparece y la que queda. `apply.py` y la comprobación de la cobertura lo leen. Así una propuesta en marcha que cita la copia quitada llega a la que queda, en vez de romper la referencia o de escribir otra vez el par.

Poner `word`, `office` o `date.from` a una relación que no los llevaba no es quitarla ni moverla, y no lleva fila. Una fila sin ese campo casaría también con una propuesta que trae otra palabra, otro cargo u otro tramo, y `apply.py` le sumaría sus fuentes sin avisar. Una propuesta que la trae sin el campo se para sola: sin fecha junto a la fechada, `apply.py` da un choque; sin palabra o sin cargo, vuelve a avisar y el presupuesto de avisos la frena.

## 6. La clave de una relación y las referencias de la cobertura

**La clave** de una relación es (`type`, destino, `word` u `office`, `date.from`). El cuarto campo es el cargo en `succeeds` y en `holds_office`, y la palabra en los demás tipos; el vocabulario lo dice en `key_field`. Dos relaciones de una ficha no pueden compartir clave.

- Si una ficha lleva varias relaciones con el mismo tipo, destino y palabra, son tramos, y cada una lleva `date` con su `from`. Hoy son 7 casos, todos de compañeros de Pablo con 2 o 3 tramos, y los 7 cumplen.
- Dos cargos de una persona no chocan aunque no lleven lugar ni fecha, porque el cargo está en la clave: Samuel es profeta y juez, y Elí es sumo sacerdote y juez en el mismo lugar.
- El `caption` no entra en la clave. Dos relaciones con texto propio, el mismo tipo y el mismo destino solo valen si las dos llevan `date.from`. Hoy no hay ninguna, ni en `main` ni en las ramas.

`apply.py` usa esa clave. Un `anadir` con un tramo nuevo añade una relación, y solo une fuentes cuando la clave entera coincide.

Escrita, la clave es `<persona>/<type>/<destino>`, más `/<word u office>` y `@<from>`. Un cargo sin lugar escribe `-` en el destino:

```text
lucas/accompanies/pablo@56
david/kin/jese/father
eliseo/succeeds/elias-profeta/prophet
samuel/holds_office/-/judge
```

**Una referencia de la cobertura** es `relation:` y la clave, escrita de una sola manera: la más corta que casa con una sola relación. Se prueba en este orden: sin nada más; con `@<from>`; con `/<word u office>`; con los dos.

```text
relation:rut/kin/noemi
relation:lucas/accompanies/pablo@50
relation:samuel/holds_office/-/judge
```

`validate.py` rechaza una referencia que no casa con ninguna relación, que casa con más de una o que está escrita de otra manera, y dice la forma que toca. La comprobación de que cada relación que cita un capítulo está en algún tramo y el cambio de id de una persona comparan relaciones resueltas, no textos.

Las 1688 referencias de `14b6c01` casan cada una con una sola relación después de migrar, y 105 cambian de tipo a `disciple_of` o a `tie`.

**Una cita que casa con varios tramos** se resuelve por su capítulo. La cobertura de Hechos, que está en una rama, cita 16 veces a un compañero de Pablo que tiene 2 o 3 tramos. Para una cita del capítulo C, la migración se queda con las relaciones cuya razón o cuyas fuentes citan el capítulo C:

- Una: escribe la referencia con su `@<from>`.
- Varias: escribe una referencia por cada una, en el mismo tramo.
- Ninguna: se para y nombra la cita, para que alguien lea el tramo.

Medido en esa rama, las 16 se quedan con un solo tramo.

## 7. Sucesos: tipo y papeles

```yaml
type: death                  # opcional: birth, death, writing, speech
roles:
  raquel: died
  benjamin-hijo-de-jacob: born
```

- `roles` es un mapa de id de persona a papel. Cada id tiene que estar en `people` del suceso.
- `type` dice qué es sobre todo la escena. Un suceso con `type` lleva al menos una persona con el papel de ese tipo: `born`, `died`, `wrote` o `spoke`.
- Un suceso puede llevar papeles sin tipo, o papeles de otra clase, como el de arriba, donde Raquel muere al dar a luz a Benjamín.
- Quien no tiene ficha no tiene papel. Si quien nace, muere, escribe o habla no tiene ficha, el suceso lleva `roles: {}` y lo explica en `reason`, como `present: []` en un suceso que no sitúa a nadie.
- El orden de `people` deja de tener significado para los datos. El sitio lo sigue leyendo hasta que su carril pase a leer `roles`.

**La fecha de un papel es la del suceso, entera.** Si el suceso abarca varios años, el nacimiento o la muerte cae en algún momento de ese rango, y el sitio lo trata como una fecha aproximada. De los 39 sucesos que tipa la migración, 6 llevan un rango así. Cuando el rango es la duración del suceso y no una duda, el papel lleva su propia fecha:

```yaml
roles:                       # ejemplo de la forma; la fecha la pone quien lee el suceso
  job:
    role: died
    date: {from: -1472, to: -1472, precision: year, approx: true, type: derived, chronology: tnm, text: hacia 1473 a.e.c.}
```

**Un papel no sitúa a nadie.** Quien está en el primer lugar del suceso lo dice `present`, como hoy. Si quien nace o muere no está en `present`, o el suceso lleva `present: []`, el suceso no dice dónde nació o murió. Cuando el texto lo dice, el papel lleva `place`.

**Volver a la vida.** `died` cierra la vida de la persona para la edad. `raised` dice que volvió a la vida: una muerte suya de la misma fecha o anterior deja de cerrarla. Quien muere y vuelve a vivir en el mismo suceso, como Eutico, Dorcas y Lázaro, lleva solo `raised`. Un arrebatamiento o una muerte que el suceso solo menciona no llevan papel.

Hoy el sitio lee del título quién nace o muere. Acierta en 27 de los 28 títulos que reconoce, y no ve otros 9 nacimientos y 16 muertes. La migración pone tipo y papel a 39 sucesos en los que el título ya acertaba, nombrados uno a uno en el mapa. Son 15 nacimientos, 11 muertes y los 13 discursos de Job. En la muerte de Raquel pone además el papel de Benjamín. Los demás son las decisiones E1 a E6.

## 8. Cargos

`office` dice el cargo con un valor de `offices` del vocabulario. Va en tres sitios:

- En **`succeeds`**, el cargo que toma quien sucede. Obligatorio.
- En **`holds_office`**, el cargo que ejerce la persona, con `place` si el texto dice dónde y `date` si dice cuándo.
- En un **periodo**, opcional, cuando el cargo no es el de su `type`. El periodo de Atalía es de `type: king` y lleva `office: queen`, y el de Galión es de `type: governor` y lleva `office: proconsul`.

`build.py` deriva un cargo ejercido de cada periodo con `person`, que hoy son 61. El cargo es `office` o, si falta, el `type` del periodo. El lugar es el primero de `places`. La fecha, las fuentes y la razón son las del periodo. No se escribe a mano lo que ya dice un periodo.

Los resúmenes de las fichas ya nombran cargos que ningún dato recoge. La primera frase del resumen dice «jeque» en 35 fichas, «profeta» en 21, «sacerdote» en 20 (7 de ellas, «sumo sacerdote»), «profetisa» en 4, «tetrarca» en 2 y «corregente» en 2. No todas son de quien tuvo el cargo, porque algunas nombran el de un pariente. Cada cargo tiene su valor en el vocabulario, y escribirlo como `holds_office` es trabajo de lectura, libro por libro.

## 9. Estancias, sin caso aparte

Una estancia es una persona en un lugar durante un tiempo. Se escribe de tres maneras, las mismas para cualquiera:

1. Una relación `lived_in`, `born_in` o `died_in` con fecha.
2. Una parada de un viaje cuyo `person` es esa persona.
3. Un suceso en cuyo primer lugar está `present`.

No hay un tipo de relación para «estuvo en», porque una parada y un suceso ya lo dicen. Al compilar la tabla de afirmaciones, cada parada y cada presencia en un suceso dan una afirmación `was_in`, y las estancias de una persona son un único filtro sobre `lived_in`, `born_in`, `died_in` y `was_in`. Dos afirmaciones de la misma persona en el mismo lugar con tiempos que se pisan son una sola estancia con las fuentes de las dos. Así las cuatro `lived_in` con fecha de Pablo se funden con las paradas que repiten.

Pablo se escribe como los demás. Lo que lo trata aparte está en el sitio y en una comprobación de `validate.py`, y se quita en la ola siguiente.

## 10. La regla de la arista

**Cada arista que dibuja el sitio lleva un verbo, una fecha cuando se sabe y una referencia. Una arista sin referencia no se dibuja.**

- **El verbo** sale del vocabulario y nunca es un identificador. `build.py` lo compila en cada relación y no compila si a un tipo o a una palabra les falta un verbo.
- **La fecha** es la de la relación. Si no la tiene, la arista dice «sin fecha».
- **La referencia** es un pasaje. Sale, por este orden, de los pasajes que cita la `reason` de la relación, de los capítulos que hay entre sus fuentes y de los tramos de la cobertura que citan esa relación. `build.py` la compila en `reference`.

Las fuentes solas no son una referencia. Hoy 68 de las 1435 relaciones no citan ningún pasaje, no tienen un capítulo entre sus fuentes y ningún tramo de la cobertura las cita: 27 de parentesco, 26 de dónde vivió alguien, 7 de dónde nació, 4 sucesiones, 2 identidades, 1 muerte y 1 compañía. Avisan como `no_reference` y su arista deja de dibujarse hasta que alguien apunte el pasaje. Hoy se dibujan con las fuentes como única referencia.

La arista «está aquí ahora» toma la referencia y las fuentes de la estancia que la sitúa, o no se dibuja.

La regla se añade a las reglas de la casa de [`CLAUDE.md`](../../CLAUDE.md), junto a la de `sources`, `reason`, `checked_on` y `status`.

## 11. Lo que compila `build.py`

**Todo lo que el sitio lee hoy conserva nombre y valor.** Las claves de primer nivel de `data.json`, las claves de cada ficha, los valores cerrados y las selecciones salen en español, como hoy. `build.py` aplica `keys`, `enums`, `selection_types` y `relation_types` del mapa al revés.

**Las claves nuevas salen en inglés, en su ruta.** `type` de un suceso y `checked_on` de una parada salen con ese nombre, aunque `tipo` y `consultado` de un fichero salgan con el suyo de siempre. Un objeto fecha dentro de un campo nuevo sale con la forma que el sitio ya lee (`desde`, `hasta`, `precision`), para que sirvan sus funciones de fecha.

**`compiled.differences` del mapa es la lista entera** de lo que puede cambiar en `data.json` respecto al de antes de migrar. Lo que no está en ella sale igual, y eso es lo que comprueba la puerta «El sitio recibe lo mismo».

**Cada relación** sale con los campos de hoy y, al lado, los nuevos:

| Campo | Qué lleva |
|---|---|
| `tipo` | El tipo antiguo: `legacy` de su tipo en el vocabulario. `disciple_of` y `tie` salen como `acompana`. |
| `persona`, `lugar`, `fecha`, `deducido`, `estado`, `fuentes`, `razon` | Lo de siempre. |
| `relacion`, `relacion_inversa` | El `es` de la palabra o el `caption`, y el `inverse_caption`. |
| `type`, `word`, `office`, `certainty`, `checked_on` | Los del YAML. |
| `verb` | Lo que se lee en la ficha de quien la escribe, junto al destino. |
| `inverse_verb` | Lo que se lee en la ficha del destino, junto a quien la escribe. |
| `key` | La clave escrita de la sección 6. |
| `reference` | La referencia de la sección 10. Falta si no hay ninguna. |
| `family`, `inverse_family` | El grupo de la tarjeta de familia visto desde cada lado: `parents` y `children` se cruzan, `spouses` y `siblings` se repiten. |
| `inverse_label` | El `inverse_es` de la palabra, si lo lleva: «esposo» en la relación que llama a alguien `wife`. |
| `duplicate_of` | La clave de la copia que manda, en la copia que no manda de un par doble. |

Los dos verbos salen ya resueltos, con los nombres y el cargo puestos: «su padre» y «Jacob es su padre»; «Eliseo le sucedió como profeta» y «sucedió a Elías como profeta». En `same_as` el verbo es el de su `certainty`; sin ella, «¿la misma persona?».

**Con `caption`, el verbo es el texto.** `verb` es el `caption` e `inverse_verb` es el `inverse_caption`. Una relación con `caption` y sin texto inverso lleva en `inverse_verb` el del tipo. Las 8 de parentesco que esperan una decisión se leen «hijo de Jerjes I» en su ficha y «su pariente» en la otra, las dos verdaderas.

**Las relaciones `holds_office`** no salen en `relaciones`. Salen en `offices` de la persona, junto a los cargos derivados de los periodos. Así ningún fichero del sitio que mira el lugar de una relación las confunde con una estancia.

**Cada suceso** sale además con `type` y `roles`, y cada papel con su fecha y su lugar ya resueltos.

**La base SQLite y `dist/data.json`.** `dist/data.json` es el mismo fichero que `site/data.json`. La base conserva sus tablas y sus columnas de hoy, con los valores de siempre, y gana columnas: `type`, `word`, `office`, `certainty`, `checked_on` y `key` en `relaciones`; `checked_on` en `paradas` y en `candidatos`; `type` y `roles` en `eventos`; `office` en `periodos`. Su esquema pasa al inglés con la tabla de afirmaciones. Allí `from`, `to` y `order` necesitarán otro nombre, porque son palabras reservadas de SQL.

**[`site/js/tipos/persona.js`](../../site/js/tipos/persona.js)**, que es el único fichero del sitio que cambia esta ola:

- Lee `verb` en una relación escrita en el centro e `inverse_verb` en una escrita en el otro lado. No tiene tabla de verbos ni caso por defecto.
- No da arista a una relación sin `verb`, sin `reference` o con `duplicate_of`.
- La referencia de la arista es `reference`, no lo que encuentre en la razón.
- La tarjeta de familia agrupa por `family` o `inverse_family` y no tiene listas de palabras. El título de un grupo con una sola persona es `relacion` en una relación escrita en el centro e `inverse_label` en una escrita en el otro lado. Así la ficha de Sara sigue titulando «Esposo» cuando el par quede solo en la ficha de Abrahán.
- Sigue dando `tipoRel` con el tipo antiguo, que es lo que lee el grafo.

Que Bartolomé y Natanael salgan como alias en el grafo es trabajo del carril del grafo. Esta ola le deja el dato: `type: same_as`, `certainty` y su verbo.

El [registro](registro/index.md) escribe cada relación con su verbo en español y con su propio `checked_on`.

## 12. Enlaces compartidos

**La dirección del sitio no cambia.** Sus palabras son texto que ve y comparte quien usa el sitio, así que siguen en español. Son direcciones como `#sel=persona:pedro`, `#sel=parada:segundo-viaje/3`, `#sel=pasaje:hch-16`, `#grafo=pablo.timoteo.lugar:listra`, `#conexion=persona:abrahan~persona:pablo`, `#carriles=reyes`. Lo mismo vale para lo que guarda el navegador, que son los marcadores, la última dirección y los capítulos leídos.

Los formatos de hoy se leen como hoy porque nada de lo que leen cambia. Los tipos de selección llegan al sitio en español y los ids no se tocan. En los YAML las selecciones van en inglés (`relates_to: [person:ciro]`, `sel: event:maria-unge-a-jesus`) y `build.py` las devuelve con el tipo antiguo.

Ninguna dirección nombra una relación. Si una ola posterior lleva los tipos de selección en inglés al sitio, o pone una afirmación en la dirección, el sitio lee los dos nombres y escribe el nuevo, y los enlaces y marcadores antiguos siguen abriendo lo mismo.

## 13. Qué comprueba `validate.py`

### Rechaza

Sale con código 1, siempre:

- Una clave del esquema antiguo en cualquier fichero de `data/`. Es lo que delata una migración a medias, que de otro modo pasaría en verde.
- Un `type` que no está en el vocabulario; un destino que falta, que no existe, que es la propia ficha o que es persona donde toca lugar.
- Una `word` que no está en el vocabulario o que es de otro tipo; `word` y `caption` a la vez; `inverse_caption` sin `caption`.
- Un hecho anidado sin `sources`, `reason` o `checked_on`; una relación, una parada o un candidato sin `status`; una relación sin `inferred`.
- Un `office` o una `certainty` que no existen, o puestos en un tipo que no los lleva.
- Dos relaciones de una ficha con la misma clave; varias con el mismo tipo, destino y palabra cuando a alguna le falta `date.from`; dos con `caption`, el mismo tipo y el mismo destino cuando a alguna le falta `date.from`.
- Una referencia `relation:` de la cobertura que no casa con ninguna relación, que casa con más de una o que no está en su forma canónica.
- Un suceso con un `type` o un papel que no existen, o con un papel para alguien que no está en `people`.
- Todo lo que ya rechazaba: fechas, fuentes, textos de más de 40 palabras, cobertura.

### Avisa

Escribe el aviso y sale con 0. Cada aviso tiene un código:

| Código | Cuándo | Hoy, tras la migración mecánica |
|---|---|---:|
| `wrong_owner` | Una relación con una palabra `owns: target` y sin copia en la otra ficha. | 6 |
| `pair_twice` | El mismo par en las dos fichas: palabras inversas entre sí, o el mismo tipo sin palabra, salvo con fechas distintas. | 36 |
| `outside_pending` | Un `caption` que está en `outside` con `fix`. | 10 |
| `unlisted_caption` | Un `caption` que no está en `outside`. | 0 |
| `kin_without_word` | Una `kin` sin `word` ni `caption`. | 7 |
| `bare_company` | Una `accompanies` sin `word`, sin `caption` y sin `date`. | 30 |
| `no_office` | Una `succeeds` sin `office`. | 57 |
| `no_certainty` | Una `same_as` sin `certainty`. | 7 |
| `same_as_owner` | Una `same_as` en la ficha cuyo id va después. | 2 |
| `no_reference` | Una relación sin referencia (sección 10). | 68 |
| `title_type` | Un suceso sin `type` cuyo título empieza por «Nace», «Nacimiento», «Muere» o «Muerte»: el sitio lo lee del título. | 2 |
| `type_without_role` | Un suceso con `type` y sin el papel de ese tipo, salvo con `roles: {}`. | 0 |
| `shared_point` | Un río, un mar o un valle a menos de 0,5 km de otro lugar que no es una región, provincia, país, reino, desierto, llanura o valle (los que el mapa rotula aparte), y su `coord_note` no nombra a ese lugar. | 4 |

Son 225 avisos tras la migración; `shared_point` llegó después y entró con 4. Cada uno se va con una decisión de la sección 16.

Las ocho relaciones de parentesco que hoy están al revés salen todas. Seis salen como `outside_pending` y dos como `wrong_owner`, las de Áquila y Félix, que llaman «esposo» a su esposa. No hace falta comparar la palabra con el sexo de nadie, porque `husband` solo puede escribirse en la ficha que no manda.

### De aviso a error

Cuando `main` llega a 0 avisos de un código, ese código pasa a ser un error en `validate.py`, en un cambio revisado, y ya no vuelve atrás. Hasta entonces, [`scripts/avisos-presupuesto.txt`](../../scripts/avisos-presupuesto.txt) dice cuántos avisos admite cada código y `validate.py` falla cuando uno pasa de su número. El número solo baja: quien arregla un aviso lo baja en el mismo cambio. No hay un modo aparte: cada código sube por separado, y `unlisted_caption`, que ya está en 0, sube el día que se fusione la última rama de libro migrada.

### Lo que `validate.py` no puede comprobar

Estas reglas las comprueba quien lee, no el script:

- **Quién es la persona más joven, el esposo o quien sirve** en una palabra `owns: self`. `father` escrito en la ficha del padre pasa. La fecha de una ficha es la de su actividad, no la de su nacimiento, y compararlas da avisos falsos: de las 84 relaciones entre generaciones con fecha en las dos fichas, acusa a 2 que están bien, la de Ocozías con su madre Atalía y la de Pedro con su suegra.
- **Quién es el primero que nombra el texto** en una palabra `first_named`.
- **Que quien actúa no tiene ficha** cuando un suceso lleva `roles: {}`.
- **Un par doble cuyas dos copias llevan fechas distintas.** Pasa como dos tramos.

## 14. Las tres reglas escritas que no se cumplían

1. **A quién va dirigido.** El sitio nunca se presenta como ayuda «en familia», porque quien estudia puede hacerlo solo. En el [catálogo de ideas](../ideas/catalogo-de-ideas.md), el perfil «Una familia» pasa a llamarse «Varias personas ante una pantalla» y la idea A-10 «Modo familia», «Modo pantalla compartida». Cambian con ellos el texto de A-10 que habla de una familia ante la televisión, la idea de los iconos que nombra «el modo familia», la de los materiales impresos que nombra «una clase o una familia sin pantalla», y el punto «Modo familia» de [`pantallas-busqueda-y-estudio.md`](../ideas/pantallas-busqueda-y-estudio.md). La hoja de ruta nombra A-10 solo por su código y no cambia.
2. **`checked_on` en los hechos anidados.** Sección 4.
3. **Cada arista lleva verbo, fecha y referencia.** Sección 10.

## 15. La migración

`scripts/migration/migrate.py` es un script determinista que solo aplica el mapa. Ejecutado otra vez sobre datos ya migrados, no cambia nada.

**Reescribe por tokens, no carga y vuelca.** Cambia el nombre de una clave o un valor cerrado en su sitio e inserta líneas, sin tocar un solo texto, un comentario ni el orden de las claves. Un volcado de YAML cambiaría 535 de los 1745 ficheros de datos, que hoy no son iguales a su volcado, y perdería los comentarios de `calendario.yaml` y de `libros.yaml`.

En este orden:

1. Renombra carpetas, ficheros y scripts.
2. Renombra las claves y los valores cerrados de cada YAML.
3. Pasa al inglés los prefijos de la cobertura y las selecciones de hallazgos y recorridos.
4. Reescribe cada relación con la primera regla de `relation_rewrites` que casa, y escribe cada referencia de la cobertura en su forma canónica.
5. Pone `checked_on` en cada hecho anidado.
6. Pone `type` y `roles` a los 39 sucesos del mapa.
7. Reescribe los ficheros de `references`, que nombran lo que cambió de nombre: el flujo de validación, los README, `CLAUDE.md`, los documentos de investigación y la primera línea de comentario de cada fichero de datos.
8. Crea `redirects.yaml` vacío y escribe el informe en `scripts/migration/reports/<commit>.yaml`, con el commit del que partió. Si el informe ya existe, no lo pisa.

Ninguna regla cambia una relación de ficha ni la quita. La `reason` de una relación está escrita desde la ficha en la que está, y moverla pide volver a escribirla.

**Qué para la migración.** Una clave o un valor cerrado que no está en el mapa, un hecho anidado sin fecha que copiar y una cita con varios tramos que ninguno reclama. Se para sin escribir. No adivina.

**Qué no la para.** Una relación cuyo texto no casa con ninguna regla pasa a `caption` tal como está, con su `relacion_inversa` en `inverse_caption`, y avisa como `unlisted_caption`. El texto no se pierde ni se traduce a una palabra que nadie eligió. En `main` la puerta exige que no haya ninguna antes de migrar. En una rama de libro se cuentan y se deciden al leerla (decisión T3). Hoy son 2 en la rama de Josué y 7 en la de 1 Corintios.

**Las opciones de los scripts** pasan al inglés con el nombre antiguo como alias: `--out` y `--salida`, `--fail` y `--fallar`, `--dry-run` y `--seco`. El alias se quita cuando las ramas de libro en marcha estén fusionadas. La lista está en `flags` del mapa.

**Las propuestas en marcha.** Los carriles escriben propuestas en formato 1 y lo siguen haciendo. `apply.py` traduce lo que la propuesta lleva de una ficha antes de aplicarla: el valor de `tipo` y de `campo`, y el contenido de `datos`, `valores`, `antes`, `despues`, `historial` y `cobertura`, con las claves, los valores cerrados por su ruta, las reglas de relación y los prefijos. Un `anadir` de una relación cuya palabra lleva `owns: target` no se aplica: `apply.py` se para y dice en qué ficha va y con qué palabras.

### Una rama de libro

Migrar `main` y cada rama con el mismo script no basta para que se fusionen. El renombre cambia casi todas las líneas en los dos lados, y cualquier línea que el carril insertó queda dentro de un bloque que los dos cambiaron. Medido en la rama de 1 Corintios: de las 122 fichas de persona que la rama tocó y que ya existían, las 122 chocan si se migran los dos lados y después se fusiona, y las 122 se fusionan limpias sin migrar ninguno.

Sea P el último commit de `main` en el esquema antiguo y M su hijo, el de la migración. Entre P y M no entra en `main` ningún otro cambio de datos. Cada rama sigue estos pasos:

1. **Fusiona P en la rama**, en el esquema antiguo. Es una fusión normal.
2. **Abre una fusión con M sin tomar sus datos**, con la estrategia que conserva el árbol de la rama (`git merge --no-commit -s ours M`).
3. **Trae de M lo que cambió fuera de `data/`**: los scripts, el flujo, los documentos. Un documento que la rama también tocó, como `versiculos.md`, se resuelve a mano.
4. **Ejecuta `migrate.py` con P como referencia** sobre los datos de la rama.
5. **Compila, valida y cierra la fusión.** El commit tiene dos padres, la rama y M.

Desde ese commit la base común de la rama y `main` es M, y las fusiones siguientes ocurren en el esquema nuevo.

### Puertas, cada una con el control que la hace fallar

| Puerta | Pasa si | Control negativo |
|---|---|---|
| El mapa cubre los datos | Cada clave y cada valor cerrado de `data/` tiene su entrada, cada ruta que lleva un valor cerrado casa con un solo `at`, y en `main` cada palabra de relación tiene su regla. Se pasa en `main` y en cada rama antes de migrarla. | Quitar una clave, un valor, una regla o una ruta del mapa. La puerta nombra lo que falta. |
| El vocabulario es coherente | Cada inversa existe y vuelve, cada tipo y cada palabra tienen sus dos verbos, cada `caption` del mapa está en `outside`, dos cargos no comparten texto y dos cargos de una persona no chocan. | Quitar una inversa o un verbo; sacar el cargo de la clave. |
| Los hechos anidados tienen de dónde copiar | Cada uno tiene un hecho que lo contiene con `checked_on`. | Quitar la fecha de un mes. |
| La migración es la misma en todos lados | `migrate.py` sobre los datos de P da los datos de M, byte a byte. | Cambiar una regla del mapa. La puerta nombra el fichero. |
| Una relación, una fecha | Cada relación que está en `main` y en la rama lleva el mismo `checked_on` después de migrar las dos. | Migrar la rama sin P como referencia. |
| No se toca un solo texto | Aplicar el mapa al revés al texto migrado da los bytes del original, salvo las líneas que el informe lista como añadidas o cambiadas. | Partir de otra manera una `reason`. La puerta nombra el fichero. |
| El sitio recibe lo mismo | `data.json` compilado antes y después es igual fuera de `compiled.differences`. | Quitar una traducción del adaptador. La comparación la señala. |
| No queda nada a medias | `validate.py` da 0 errores. | Dejar una clave `razon` en un fichero migrado. |
| No queda un nombre antiguo | Buscar cada ruta, cada script y cada opción antiguos en el repositorio, fuera de `data/` y de las excepciones de `references`, no da nada. | Dejar `scripts/aplicar.py` en el flujo de validación. |
| Las referencias siguen | Cada tramo de la cobertura cita el mismo conjunto de relaciones antes y después, y cada referencia casa con una sola. | Cambiar el tipo de una referencia a mano. |
| Una cita con varios tramos | En la rama de Hechos, cada cita se queda con los tramos que citan su capítulo. | Una cita de un capítulo que ningún tramo cita. La migración se para. |
| Un tramo nuevo no pisa otro | En `test_apply.py`, añadir a Lucas el tramo de 56 a 61 deja dos relaciones. | Volver a la clave de dos campos. Quedan fundidas. |
| Una propuesta antigua se aplica | En `test_apply.py`, un `cambiar` de `fecha` en formato 1 se aplica sobre datos migrados. | Dejar `antes` sin traducir. El escritor dice que el valor ya no es el de la ficha. |
| Los enlaces antiguos abren | Una lista de direcciones de hoy abre la misma selección. | Una dirección con un tipo que no existe no abre nada. |

Las tres primeras y la de las citas con varios tramos ya se han pasado sobre los datos de hoy y de las tres ramas en marcha, con 26 controles negativos que saltan y un control del control que falla cuando se desactivan dos puertas. Las demás necesitan que la migración exista.

## 16. Decisiones que necesita la migración

Nada de esto está en el mapa, porque pide leer el texto. Cada cambio conserva su fuente y su razón, y una duda se investiga en jw.org o en wol.jw.org, nunca se adivina. Las propuestas de abajo salen de los inventarios y quien decide las comprueba contra el pasaje.

### Parentesco

**K1. Ocho `kin` al revés.** Ninguna tiene copia en la otra ficha.

| Dónde | Dice | Propuesta |
|---|---|---|
| `artajerjes-i` hacia `jerjes-i` | «hijo de Jerjes I» | `father` |
| `jerjes-i` hacia `dario-i` | «hijo de Darío I» | `father` |
| `belsasar` hacia `nabonido` | «hijo de Nabonido» | `father` |
| `aquila` hacia `priscila` | «esposo» | `wife` |
| `felix` hacia `drusila` | «esposo» | `wife` |
| `ciro` hacia `cambises-ii` | «padre de Cambises II» | Escribirla en `cambises-ii` como `father`. |
| `ester` hacia `jerjes-i` | «esposa de Asuero» | Escribirla en `jerjes-i` como `wife`. |
| `ester` hacia `mardoqueo` | «prima de Mardoqueo» | `cousin`. Hay que decidir además si la crianza de Ester es un segundo hecho. |

**K2. Seis `kin` en la ficha que no manda, sin copia en la otra.** Se escriben en la ficha de la persona más joven, con la palabra inversa que corresponda al sexo de la mayor y con la razón escrita desde esa ficha. Son `eunice` hacia `timoteo` («hijo»), `loida` hacia `eunice` («hija»), `loida` hacia `timoteo` («nieto»), `maria-madre-de-juan-marcos` hacia `bernabe` («sobrino», que en la ficha de Bernabé es `aunt`), `augusto` hacia `tiberio` («hijastro e hijo adoptivo», que son dos hechos con su fecha) y `arquipo` hacia `filemon` («quizás hijo»). En esta última hay que leer quién es hijo de quién, y la duda va en `inferred` y en `status`.

**K3. Dieciséis pares en las dos fichas que piden leer el capítulo.** Se queda la copia de la ficha del primero que nombra el texto, con las fuentes de las dos.

- Hermanos y parientes sin grado (12): `abrahan` y `nacor-hijo-de-tare`; `andres` y `pedro`; `elisabet` y `maria-madre-de-jesus`; `isaac` e `ismael-hijo-de-abrahan`; `jesus` y `judas-hermano-de-jesus`; `jesus` y `santiago-hermano-de-jesus`; `juan-apostol` y `santiago-hijo-de-zebedeo`; `judas-hermano-de-jesus` y `santiago-hermano-de-jesus`; `laban` y `rebeca`; `lazaro` y `maria-de-betania`; `lazaro` y `marta`; `maria-de-betania` y `marta`.
- Compañeros (4): `esteban` y `felipe-evangelizador`; `josue-sumo-sacerdote` y `zorobabel`; `juan-apostol` y `pedro`; `pedro` y `santiago-hijo-de-zebedeo`.

**K4. Veinte pares dobles con dueño por su palabra.** Se queda la copia de la ficha que manda. Quien la lee une las fuentes, reescribe la razón para que nombre lo que cita, pone de acuerdo `inferred`, corrige las referencias de la cobertura y añade la fila a `redirects.yaml`, todo en el mismo cambio. 24 referencias citan hoy la copia que se quitaría.

| La copia que sobra | Qué lleva que la otra no |
|---|---|
| `agar` hacia `abrahan`; `anas` hacia `caifas`; `elisabet` hacia `zacarias-padre-de-juan`; `herodes-el-grande` hacia `herodes-antipas`; `lea` hacia `jacob`; `maria-madre-de-jesus` hacia `jesus`; `safira` hacia `ananias-de-jerusalen`; `zacarias-padre-de-juan` hacia `juan-el-bautista` | Nada. |
| `herodes-agripa-i` hacia `herodes-agripa-ii` | `inferred: true`; la otra dice `false`. Hay que leer cuál es. |
| `eva` hacia `adan`; `herodes-el-grande` hacia `arquelao`; `jezabel` hacia `acab`; `jose-esposo-de-maria` hacia `jesus`; `maria-madre-de-juan-marcos` hacia `juan-marcos`; `rebeca` hacia `isaac` | Fuentes. |
| `elisabet` hacia `juan-el-bautista`; `herodias` hacia `herodes-antipas` | Un pasaje en su razón. |
| `maria-madre-de-jesus` hacia `jose-esposo-de-maria`; `raquel` hacia `jacob`; `sara` hacia `abrahan` | Fuentes y un pasaje en su razón. La de Sara dice que tenían el mismo padre (Gé 20:12), y la que queda no. |

**K5. Siete `kin` sin palabra.** Su razón dice algo más estrecho que «pariente» en cuatro.

| Dónde | Dice su razón | Propuesta |
|---|---|---|
| `matred` hacia `mezahab` | Hija de Mezahab, que no se sabe si era su padre o su madre. | `parent` |
| `ana-hijo-de-zibeon` hacia `seir`; `dison` hacia `seir` | «Hijos» de Seír, entendido como descendientes. | `ancestor` |
| `sealtiel` hacia `neri` | El texto lo llama hijo; la fuente cree posible que fuera yerno. | Leer. |
| `boaz` hacia `elimelec`; `job` hacia `abrahan`; `elihu-hijo-de-barakel` hacia `ram-antepasado-de-elihu` | De su familia, sin grado. | `relative` |

### Tratos y compañía

**T1. Dos tratos escritos desde el otro lado.** `julio` hacia `pablo` («custodio») y `elimas` hacia `sergio-paulo` («consejero») dicen lo que es la ficha. Con las palabras `custodian` y `adviser` van en `pablo` y en `sergio-paulo`, con la razón escrita desde allí.

**T2. Relaciones de compañía que dicen un trato.** La migración las deja en `accompanies`, porque cambiarlas pide leer. De las 30 sin palabra y sin fecha y de las 14 con «compañero» o «compañera», estas dicen en su razón otra cosa:

| Dónde | Dice su razón | Propuesta |
|---|---|---|
| `amrafel`, `arioc-de-elasar` y `tidal` hacia `kedorlaomer`; `aner`, `escol` y `mamre` hacia `abrahan`; `birsa`, `semeber` y `sinab` hacia `bera` | Reyes aliados; aliados de Abrán; unieron sus fuerzas. | `tie` con `ally` |
| `agar` hacia `sara` | Era su sierva. | `tie` con `mistress`, como `bilha` hacia `raquel` |
| `eliezer-de-damasco` hacia `abrahan`; `cuza` hacia `herodes-antipas` | Siervo de su casa; mayordomo de su casa. | `tie` con `master`, con el encargo en la razón |
| `ahuzat` hacia `abimelec-de-tiempos-de-isaac`; `ahitofel` hacia `david` | Su consejero. | `tie` con `adviser`, en la ficha de quien recibe el consejo |
| `bildad`, `elifaz-el-temanita` y `zofar` hacia `job`; `hira` hacia `juda-hijo-de-jacob` | Uno de sus tres amigos; el texto lo llama amigo. | `tie` con `friend` |
| `elias-profeta` hacia `eliseo` | Eliseo lo siguió como servidor. | Leer: el trato va en la ficha de Eliseo. |
| `eli` hacia `samuel` | Samuel servía en el tabernáculo en sus días. | Leer. |
| `itiel-oyente-de-agur` y `ucal` hacia `agur` | Agur les dirigió su mensaje. | Leer: no es compañía. |
| `tercio` hacia `pablo` | Escribe Romanos al dictado de Pablo. | Un texto propio como el del amanuense de 1 Pedro, hasta que las cartas lleven papeles. |

Las demás relaciones con `bare_company` se leen una a una: o llevan `companion`, o llevan su fecha, o son otra cosa. Con T2 resuelta, `ally` deja de tener 0 relaciones.

**T3. Textos de las ramas que no son una palabra.** Pasan a `caption` y avisan como `unlisted_caption`.

| Dónde | Dice | Propuesta |
|---|---|---|
| `eldad` y `medad` hacia `moises` | «ayudante de» | Leer: dice lo que es la ficha, y quizá es un suceso y no un trato. |
| `acaico` y `fortunato` hacia `estefanas` | «compañero de viaje» | `companion`, con su fecha. |
| `andronico` y `junias` hacia `pablo` | «compañero de prisión» | Un texto en `outside`: dice una circunstancia. |
| `manaen` hacia `herodes-antipas` | «compañero de crianza» | Un texto en `outside`. |
| `blasto` hacia `herodes-agripa-i` | «encargado de su casa», con inversa «señor» | `tie` con `master`, con el encargo en la razón. |
| `rode` hacia `maria-madre-de-juan-marcos` | «sirvienta», con inversa «señora» | `tie` con `mistress`. |

«Cuñado», «colaborador» y «huésped de», que también vienen de las ramas, sí tienen palabra y regla: `brother_in_law`, `fellow_worker` y `host`.

### Cargos e identidades

**O1. El cargo de las 57 sucesiones.** Ninguna lleva palabra y el cargo sale de su razón. El inventario propone `king` en 50 (18 del reino del norte, 18 de Judá, 7 de Edom, 3 de Persia, Darío el medo, y David, Salomón y Rehoboam, que reinan sobre todo Israel o ven partirse el reino), `queen` en Atalía, `ethnarch` en Arquelao, `emperor` en Tiberio, `governor` en Festo, `prophet` en Eliseo, `apostle` en Matías y `leader` en Josué. Perspicacia «Josué» lo llama caudillo y dice que sucede a Moisés en dirigir la nación.

**O2. La certeza de 7 identidades.** El inventario la lee de la palabra de cada razón y propone `probable` en `bartolome` y `hur-companero-de-moises`, y `possible` en `ada-hija-de-elon`, `basemat-hija-de-ismael`, `oholibama-hija-de-ana`, `timna-hija-de-seir` y `zerah-de-bozra`. Al revisarlas se decide también su `status`.

**O3. Dos identidades en la ficha cuyo id va después.** `oholibama-hija-de-ana` hacia `judit` y `timna-hija-de-seir` hacia `timna-concubina-de-elifaz` pasan a la otra ficha, con la razón escrita desde allí.

**O4. El lugar de un cargo.** Los periodos dan la sede (Jerusalén, Samaria, Tirza), no el reino. `israel` es toda la tierra y no hay lugar para el reino del norte. Hasta que se decida, el cargo derivado toma el primer lugar del periodo tal como está.

**O5. Quién falta.** 13 sucesores no tienen periodo y 11 titulares de un periodo no están en ninguna sucesión. 11 periodos nombran a un gobernante sin ficha, entre ellos Claudio y Nerón.

**O6. Quien tuvo dos cargos.** Los resúmenes de `samuel`, `melquisedec`, `eli`, `esdras` y `debora-profetisa` nombran dos. Cada uno se escribe como una relación `holds_office` con su fuente. En Débora, `prophetess` está claro; que juzgaba a Israel lo dice el texto, y el cargo `judge` se lee «juez», así que antes hay que ver cómo la llama la fuente.

### Sucesos

**E1. Nacimientos y muertes que ningún título delata.** Son 9 nacimientos y 16 muertes. En 13 de los 25, quien nace o muere no es el primero de `people`. Tres abarcan muchos años y piden la fecha en el papel: `jehova-restablece-a-job` (140 años, y Job muere al final), `elimelec-se-va-a-moab` (mueren Elimélec y, unos diez años después, sus dos hijos) y `lea-da-a-luz-cuatro-hijos` (cuatro nacimientos). En cuatro con `present: []` y en `juda-se-casa-con-la-hija-de-sua`, quien nace o muere no está situado, y el papel lleva `place` solo si el texto lo dice.

**E2. Dos muertes con título que la migración no toca.** En `muerte-de-ananias-y-safira` mueren dos, y en `muerte-de-alejandro` quien muere no tiene ficha.

**E3. Catorce que lo parecen y no lo son, o son dudosos.** Son las creaciones de Adán y de Eva, tres muertes colectivas, tres resurrecciones, Elías, y muertes de quien no tiene ficha o que ocurren en otro momento. Un suceso en el que alguien vuelve a la vida lleva `raised` para esa persona, si tiene ficha: `resurreccion-de-lazaro`, `resurreccion-en-nain`, `pedro-resucita-a-dorcas`, `eutico-vuelve-a-la-vida` y `resurreccion-de-jesus`. `muerte-de-jesus` lleva `died` desde la migración.

**E4. Escritura.** Hay un suceso por título, que repite lo que ya dice su carta, y 7 por contenido, 5 de ellos dudosos.

**E5. Discurso.** Hay 28 por contenido, 5 de ellos dudosos, y otros 26 sucesos que la cobertura cita en tramos de discurso, casi todos de enseñanza de Jesús con parábolas.

**E6. Nacimientos y muertes escritos dos veces.** 46 están como suceso y como `born_in` o `died_in`. En 7 el lugar no coincide, casi siempre porque uno dice la región y el otro la ciudad, como Canaán y Belén. El de Selá es un choque, porque la relación dice Aczib y el suceso ocurre en Adulam.

## 17. Para las olas siguientes

Esto se diseña aquí y no se construye en esta ola:

- **La tabla de afirmaciones.** `build.py` escribirá `facts`, cada una con `id`, `s`, `p`, `o`, `role`, `date`, `passages`, `sources`, `status`, `inferred`, `level`, `checked_on` y `origin`. El `id` de una relación es su `key`. `p` es un tipo de relación, `was_in` o un papel de suceso. Una afirmación que viene de un nacimiento o una muerte escritos dos veces es una sola, con las fuentes de las dos.
- **Las estancias** como un filtro sobre esa tabla, y el sitio sin caso aparte de Pablo.
- **Los ficheros del sitio** que leen relaciones por su nombre antiguo pasan a leer la tabla, y entonces `build.py` deja de escribir los campos antiguos.
- **El sobre de las propuestas en inglés**, cuando los tres carriles hayan terminado. «campo» es allí el nombre de un campo y en el calendario las cosechas del mes, y «despues» no puede llamarse `after`, que ya es el nombre de «tras».
- **El esquema de la base SQLite en inglés**, con la tabla de afirmaciones.
- **El flujo de validación** cambia de nombre cuando el dueño lo decida, porque puede ser una comprobación obligatoria de la rama.
