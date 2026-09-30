# Leer la Biblia versículo a versículo

El protocolo que sigue un agente para leer unos capítulos de la Traducción del Nuevo Mundo y dejarlos apuntados en el atlas. La meta es que cada versículo de los 66 libros (1189 capítulos) esté leído y rendido en cuentas: cada persona con nombre es una ficha de `data/people/`, cada lugar con nombre una de `data/places/`, cada suceso del relato una de `data/events/` y cada relación que el texto afirma una relación, todo con su fuente y con palabras nuestras. Lo que ya existe se relee contra el texto y se corrige.

Antes de empezar se leen el esquema, [`README.md`](README.md), y el formato de la cobertura, [`data/coverage/README.md`](../../data/coverage/README.md). Todas sus reglas siguen valiendo aquí. Las claves y los valores cerrados van en inglés; los nombres, los textos y los ids, en español.

## 1. Quién hace qué

- **Lectores.** Cada agente recibe unos capítulos de un libro. Lee, busca y **devuelve una propuesta** en JSON (sección 11). No escribe en `data/`.
- **Un escritor por libro.** Recibe las propuestas de su libro y las aplica con [`scripts/apply.py`](../../scripts/apply.py), que escribe `data/coverage/<libro>.yaml`, `data/sources/cobertura-<libro>.yaml` y las fichas. Después valida. Es el único que toca los ficheros de ese libro.
- **Un solo libro en marcha.** Si el encargo lo dice, el escritor aplica sin más opciones: `apply.py` edita también las fichas que ya existían.
- **Varios libros a la vez.** El escritor aplica con `apply.py --parallel`. Así solo escribe su cobertura, sus fuentes y las fichas nuevas, que crea en modo exclusivo (`open(ruta, "x")`). Los cambios a fichas que ya existían, y el `crear` de una ficha que otro escritor creó antes, quedan como operaciones en `data/_proposals/<libro>.json`. La integración aplica esas operaciones con el mismo `apply.py`, en lugar de las copias completas que usan los demás carriles ([README.md](README.md#propuestas-sobre-ficheros-ajenos)). Añadir fuentes o relaciones es una unión, así que las operaciones de libros distintos no chocan entre sí.
- **El encargo no propone ids ni grafías.** Los nombres salen de la TNM (Boaz, Kilión y Orpá, no Booz, Quilión ni Orfá) y los ids, de la sección 4.
- Nadie hace `git add`, commit ni push: eso es del orquestador.

## 2. Qué se lee

1. **El capítulo en la edición de estudio**: `https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/<número del libro>/<capítulo>` (el número está en `num` de [`data/books.yaml`](../../data/books.yaml)). Los ayudantes viven fuera del repo, porque las condiciones de jw.org no permiten herramientas de extracción dentro del proyecto:

   ```bash
   python3 /tmp/be-wol/estudio.py 8 1        # Rut 1: texto, y por versículo notas de estudio, notas al pie y referencias
   python3 /tmp/be-wol/wol.py search "Elimélec"
   python3 /tmp/be-wol/wol.py text https://wol.jw.org/es/wol/d/r4/lp-s/1200001310
   python3 /tmp/be-wol/ochos.py propuesta.json   # 8 palabras seguidas copiadas de las páginas citadas
   ```

   Comparten un candado de un segundo entre peticiones y una caché. No se lanzan lecturas en paralelo dentro de un mismo agente.
2. **Todo el capítulo, versículo a versículo**, con sus notas de estudio (abundantes en los Evangelios y Hechos), sus notas al pie (otros nombres, significados, «o» y «lit.») y sus referencias marginales, que llevan a los relatos paralelos y a los otros pasajes de la misma persona o el mismo lugar.
3. **Perspicacia** para cada persona y cada lugar nuevos, y para los que ya existen si el capítulo dice algo que su ficha no dice. Se confirma el título con `wol.py title <url>`.
4. **Fechas**: el estudio 3 «Sucesos fechados» (`si-3`), la tabla de los libros (`tnm-tabla`), las tablas A6 (reyes y profetas) y A7 (vida de Jesús) del apéndice, y lo que Perspicacia fecha. Los ids de esas fuentes ya están en `data/sources/`.
5. **Antes de devolver la propuesta**, `python3 /tmp/be-wol/ochos.py <propuesta.json>` tiene que dar 0 coincidencias. Compara cada texto con las páginas que la propuesta cita (sus fuentes, sus enlaces y sus capítulos). El `title` de una fuente no se compara, porque es el nombre exacto de su página y no prosa nuestra. Con `--control "<frase copiada de una de esas páginas>"` se ve que la comprobación puede fallar.

Solo valen fuentes de nivel 1 (la TNM y wol.jw.org). Las coordenadas salen de OpenBible (`/tmp/be-wol/ancient.jsonl`) y solo se toma el punto, nunca la identificación. Las notas de trabajo van a `/tmp/be-wol/notas/<etapa>/`. Nunca entra texto de jw.org en el repo: palabras nuestras, 40 como mucho por campo y ninguna secuencia de 8 palabras igual a la fuente. `checked_on` y `reviewed_on` son el día real de lectura.

## 3. Partir el capítulo en tramos

Un tramo es una unidad de sentido: una escena, un discurso, una lista, un poema. No un versículo por tramo, ni un capítulo entero si cambia de escena. Cada tramo lleva su `type` (`narration`, `genealogy`, `law`, `poetry`, `prophecy`, `speech`, `letter`, `list`, `vision`; la tabla está en [`data/coverage/README.md`](../../data/coverage/README.md#tipos-de-pasaje)), sus `entities` y lo que solo `mentions`. Los tramos van seguidos y cubren todos los versículos del capítulo salvo los que la TNM no incluye (`omitted` de `data/books.yaml`).

**El encabezamiento de un salmo** («Salmo de David, cuando…»), que la TNM pone antes del versículo 1, es parte del primer tramo del salmo. No hay versículo 0. Sus nombres y su suceso siguen las reglas de siempre (sección 8).

## 4. Personas

**Cada individuo con nombre es una persona**, aunque salga una sola vez en una genealogía. Excepciones:

- Jehová no lleva ficha: el atlas sitúa personas en la tierra y en el tiempo. Tampoco va en `mentions`.
- Los personajes de una parábola, una alegoría o una visión (el hombre rico y Lázaro, Oholá y Oholibá) no son personas. Van en la `note` del tramo.
- Un pueblo o una tribu (moabitas, levitas, fariseos) no es una persona. Su territorio, si tiene nombre, es un lugar.
- Alguien sin nombre («el faraón», «el carcelero de Filipos») no lleva ficha, salvo que jw.org le dé nombre. Tampoco cuando Perspicacia dice quién era sin darle nombre: no va en `entities` ni en `mentions`, y si el tramo lo recoge, va en su `note`. Una referencia marginal que remite a otro pasaje no le da nombre. Las dos fichas de personas sin nombre que ya existían, `suegra-de-pedro` y `eunuco-etiope`, se quedan, porque su id está en las direcciones del sitio; no se crean más.
- Los ángeles con nombre y Satanás llevan ficha cuando actúan en un momento y un lugar del relato, como ya la tiene Gabriel.

**Nombres que no son personas ni lugares.** La misma tabla vale para la sección 5:

| Lo que nombra el texto | Qué se hace |
|---|---|
| Un dios o un ídolo (Baal, Dagón, Moloc, Ártemis, Zeus, Hermes) | Sin ficha. Va en la `note` del tramo. Su templo o su ciudad, si el suceso pasa allí, es el lugar. |
| Un título (Faraón, César, Candace) | Sin ficha. Si jw.org dice quién era (Faraón Nekó, César Augusto), va esa persona, en `entities` o en `mentions`. Un nombre que Perspicacia trata como persona con número (Abimélec) es una persona. |
| Un nombre histórico dicho de su heredero («David su rey», dicho del Mesías en Os 3:5) | La persona histórica va en `mentions`, junto al Mesías (`person:jesus`), y la `note` del tramo dice de quién habla según jw.org. |
| Un nombre simbólico o poético (Rahab por Egipto en Sal 87:4) | Lo que simboliza, en `mentions`, si tiene ficha (`place:egipto`). Si no, la `note`. |
| Un lugar que solo sale en una visión o una profecía simbólica (Babilonia la Grande, Armagedón) | Sin ficha. Va en la `note`. |
| Una construcción con nombre dentro de una ciudad (una puerta de Jerusalén, el estanque de Siloam, un altar con nombre, Ebenezer) | En `names` de su ciudad, con una nota. Solo lleva ficha propia si allí pasa un suceso y OpenBible tiene su punto; entonces su `type` es el más cercano de la lista (`city` no, `region` si es un barrio) y `coord_note` dice qué es. |
| Israel | Como pueblo, sin ficha. Como tierra o como reino del norte, el lugar `israel`, uno solo, igual que `juda` cubre el territorio de la tribu y el reino del sur. Lo crea el primer libro que lo necesita como lugar. Jacob, cuando el texto lo llama Israel, es `person:jacob`. |
| Una tribu (la tribu de Judá) | Como pueblo, sin ficha. Su territorio es el lugar (`place:juda`); el patriarca (`person:juda-hijo-de-jacob`) solo cuando el texto habla del hombre. |
| Un patriarca cuyo nombre designa a su pueblo o a su tierra («la casa de Jacob», «tu hermano Jacob» en Abd 10, Esaú por Edom, «los lugares altos de Isaac») | Sin `person`, ni en `entities` ni en `mentions`; la `note` dice que es el pueblo, y la tierra, si la nombra, es su lugar (`place:edom`). El patriarca va solo cuando el texto habla del hombre, también como antepasado o por su Dios («descendencia de Jacob», «Dios de Jacob»). |

**Antes de crear**, se busca si ya existe: `ls data/people | grep -i <nombre>`, `grep -l "^perspicacia: .*<documento>" data/people/*.yaml` y una búsqueda en Perspicacia. El artículo de Perspicacia numera a los homónimos («1.», «2.») con los pasajes de cada uno; el individuo del capítulo es el número cuyos pasajes incluyen este capítulo.

**La clave `perspicacia`.** Cada persona que sale en `entities` lleva la clave de su artículo: el número del documento de la URL de Perspicacia y, si el artículo trata de varias personas, `#` y el número de la entrada (`perspicacia: '1200003629#1'` es Ram hijo de Hezrón). Si el artículo trata de una sola, solo el documento (`'1200001310'`, Elimélec). Si Perspicacia no tiene artículo, `perspicacia: null`. Un documento solo va entre comillas, para que YAML lo lea como texto. `validate.py` exige que sea única entre las personas: dos fichas con la misma clave son la misma persona. `apply.py` lo usa al crear: si la clave ya es de otra ficha, la propuesta pasa a usar ese id y las dos se funden.

**Ids.** Slug ASCII del nombre TNM más conocido.

1. Si Perspicacia tiene una sola persona con ese nombre, el id es el nombre solo (`elimelec`).
2. Si tiene varias, el id es el mismo que elegiría cualquier otro lector, en este orden:
   - un rey de Judá o de Israel: `<nombre>-de-juda` o `<nombre>-de-israel` (`jehoram-de-juda`), como los periodos;
   - si se sabe quién era su padre: `<nombre>-hijo-de-<padre>` o `<nombre>-hija-de-<padre>` (`hezron-hijo-de-perez`, `obed-hijo-de-boaz`);
   - si no: el rasgo con que Perspicacia la distingue (`tamar-nuera-de-juda`, `ananias-de-damasco`, `zacarias-profeta`).
3. Un id que ya existe no se cambia nunca, porque las direcciones del sitio lo usan: si aparece un homónimo de `pedro`, el nuevo lleva el rasgo y los dos llevan `disambiguation` y `distinct_from`.

**Fundir o separar.** Dos nombres son una sola ficha (con los dos en `names`) solo si jw.org dice que son la misma persona: Jesúa y Josué el sumo sacerdote. Si jw.org solo lo da como probable o posible, van dos fichas y una relación `same_as` con `inferred: true` y `certainty`: `probable` si la fuente la da por probable, `possible` si solo la da por posible. Va en la ficha cuyo id va primero por orden alfabético. Su `status` dice, como en todo hecho, si alguien abrió la fuente y dice eso.

## 5. Lugares

**Cada lugar con nombre es un lugar**: ciudades, regiones, países, montes, ríos, mares, valles, desiertos, y también los que solo salen en una lista de fronteras o de etapas. Los dioses, las visiones y las construcciones siguen la tabla de la sección 4. Un lugar con varios nombres es una sola ficha, con los demás en `names` y su época si la fuente la da (Luz y Betel).

- **Punto de OpenBible.** Se busca por su nombre en inglés (`grep -i '"friendly_id":"Moab' /tmp/be-wol/ancient.jsonl`) Cada ficha de OpenBible trae una o varias identificaciones (los sitios actuales que se proponen) y cada identificación, una o varias resoluciones (sus puntos). Se toma la primera resolución de la primera identificación. Si jw.org nombra un sitio, aunque sea como propuesta («hay quien lo identifica con…»), y es otra identificación de la misma ficha, se toma la primera resolución de esa identificación, con `precision: uncertain`, y `coord_note` dice qué identificación es y qué sitio nombra jw.org. Si jw.org duda entre varios sitios, vale el punto siguiente. `coord_source: openbible:<id>` y `coord_url: https://www.openbible.info/geo/ancient/<id>/<nombre-en-inglés>`. Una región o un país lleva `precision: zone` y dice en `coord_note` qué representa su punto.
- **Sin punto seguro.** Si jw.org no lo sitúa y OpenBible no tiene punto, o jw.org duda entre sitios, `lat` y `lon` van a `null` con `candidates` (sección «Lugares» de [README.md](README.md#campos-por-tipo)): una zona alrededor de lo que dice el texto («en el Négueb de Judá») con `coord_source: calculation` y la cuenta en `note`. Si ni eso, `candidates: []` y `status: pending`. Nunca un punto inventado.

## 6. Sucesos

**Cada suceso del relato es un suceso de `data/events/`.** Un suceso es una escena: cambia cuando cambian el lugar, el momento o los protagonistas. No cada verbo. Un discurso dentro del relato es un suceso (el Sermón del Monte) y su contenido es un tramo `speech`. Una aparición (Jesús resucitado se aparece a los once) es un suceso con `people` y `present`, no una relación. Una muerte que el texto solo informa, sin escena («murió Elimélec»), no es un suceso aparte: queda en la relación `died_in`, en el resumen del suceso que la contiene y en sus `roles`. Es un suceso propio, con `type: death`, cuando el texto la cuenta como escena.

`places` va en orden, con el sitio principal primero; `people` lleva a todos los que actúan. Si el suceso pasa en un sitio que el texto no nombra (en el camino de Moab a Judá), `places` lleva los que nombra y `present: []`: el sitio no sitúa a nadie y `reason` lo explica. `passages` cita los versículos (`Rut 1:1-5`) y los relatos paralelos.

**Quién nace, muere, escribe o habla lo dicen `type` y `roles`**, nunca el título:

```yaml
type: death                  # birth, death, writing o speech: lo que es sobre todo la escena
roles:
  raquel: died               # born, died, wrote, spoke o raised
  benjamin-hijo-de-jacob: born
```

- Un suceso que es sobre todo un nacimiento, una muerte, la escritura de un libro o un discurso lleva `type`, y la persona que nace, muere, escribe o habla lleva ese papel en `roles`. Cada id de `roles` está en `people`.
- Un suceso que es sobre todo otra cosa y cuenta de paso un nacimiento o una muerte no lleva `type`, pero quien nace o muere lleva su papel: en la marcha a Moab mueren Elimélec y sus dos hijos. Una muerte que el suceso solo recuerda, porque pasó antes, no lleva papel.
- Si esa persona no tiene ficha, el suceso lleva `roles: {}` y la `reason` lo dice.
- Quien vuelve a la vida (Lázaro, Dorcas, Eutico) lleva `raised`, y no `died`, aunque muera en el mismo suceso.
- Un papel no sitúa a nadie: eso lo dice `present`. Si el suceso dura años y el nacimiento o la muerte cae en un momento que el texto fecha, el papel lleva su propia fecha: `{role: died, date: {...}}`, y `place` si el texto dice dónde.
- El sitio aún calcula la edad con la primera persona de `people` de un suceso cuyo título empieza por «Nace», «Nacimiento», «Muere» o «Muerte». Hasta que lea `roles`, quien nace o muere va también primero en `people`.

**Sucesos que cuentan dos libros.** Los crea un solo libro, el dueño: el de número más bajo que lo narra (Samuel y Reyes antes que Crónicas; Reyes antes que Isaías 36-39 y Jeremías 52; Hechos antes que las cartas). La vida de Jesús usa la armonía A7 (serie `a7`), cuyos sucesos ya existen. Los demás libros solo añaden su pasaje a `passages` del suceso del dueño (`anadir`) y lo ponen en `entities`. Si el dueño aún no lo ha creado, el tramo lo dice en su `note` («suceso de 1Re 1; lo crea Reyes») y, cuando el dueño añada este pasaje a `passages`, `validate.py` pedirá ponerlo en el tramo.

**Cómo se fecha:**

1. **Anclada** (`type: anchored`): cuando el estudio 3, una tabla del apéndice o Perspicacia dan el año. Se cita esa fuente en `sources` y el párrafo en `reason`. Si el texto da mes y día, van en `detail` (`{month: adar, day: 3}`).
2. **Narrativa** (`type: narrative`): cuando nadie da el año. El suceso queda entre los límites más estrechos que dé jw.org: dos sucesos anclados, y también un siglo o una generación («Boaz vivió hacia el siglo XIV a.e.c.»), no solo los límites de la época. Va con `precision: range`, `approx: true` y un `text` que lo dice («entre 1473 y 1301 a.e.c. (tiempo narrativo: en tiempos de los jueces y en vida de Boaz)»). La `reason` nombra los límites y `sources` lleva sus fuentes.
3. **Derivada** (`type: derived`): cuando el año sale de una cuenta nuestra («año séptimo de Asuero, contando 495 como el primero»). Lleva la cuenta en `date.note` y `status: pending`.

**`detail` solo en una fecha de un año** (`from == to`). En un tramo de años el sitio leería el mes en el primero de ellos; `validate.py` lo rechaza. El mes de un suceso de fecha narrativa («al empezar la cosecha de la cebada») va en `reason`.

**El orden del relato es el orden de los sucesos, no el del libro.** `narrative_order: {series: <libro>, order: <capítulo × 1000 + primer versículo>}` (Rut 1:1 es `1001`) solo vale cuando el libro cuenta las cosas en el orden en que pasaron. Cuando jw.org o el propio texto sitúan un capítulo en otro momento, el suceso lleva un `order` ajustado o `after: <id>` (engancha el suceso a otro de cualquier serie), y la `reason` dice por qué. Libros y pasajes que ya sabemos que no van en orden:

- Génesis 10-11: el capítulo 10 da las naciones ya repartidas y 11:1-9 cuenta cómo se dispersaron en Babel, en días de Péleg (Gé 10:25; Perspicacia «Babel»).
- Jueces 1:1-3:6 mezcla sucesos de antes y de después de la muerte de Josué, y los capítulos 17-21 pasan mucho antes que Sansón (Perspicacia «Jueces, Libro de», «Orden del libro»). Los capítulos 19 a 21 van en su propia serie, `jueces-apendice`: en la serie `jueces`, su fecha, más temprana, dejaba antes de c. 1400 a.e.c. todo lo que el libro cuenta antes que ellos.
- Jeremías: sus capítulos van por temas; cada uno se fecha por el rey que nombra (Jer 21 es de Sedequías y Jer 25, del año cuarto de Jehoiaquim).
- Daniel 7 y 8 son de los años primero y tercero de Belsasar, antes de Daniel 5.
- Ezequiel 29:17-21 es del año 27 del destierro, posterior a los capítulos que lo siguen (40:1 es del año 25).
- Salmos: cada salmo con encabezamiento se ordena por el suceso que nombra; los demás no son sucesos.
- 1473 a.e.c., de la victoria sobre Og al cruce del Jordán: Números, Deuteronomio y Josué 1-5 van en la serie `numeros`, porque `build.py` ordena las series de un mismo año por su nombre y `deuteronomio` o `josue` saldrían antes que Números. Números usa su capítulo y versículo; Deuteronomio les suma 100000 (`primer-discurso-de-moises` es 101001) y Josué, 200000 (`entrada-en-canaan` es 203014).

Las series `a7` y `hechos` ya tienen su propia numeración.

**Todo suceso lleva fecha.** Si un suceso no se puede acotar ni con los sucesos anclados ni con lo que `data/books.yaml` dice que abarca el libro, no es un suceso: va en la `note` del tramo. Tampoco son sucesos las parábolas, los casos hipotéticos de la Ley ni lo que se ve en una visión.

Los años van en numeración astronómica: 537 a.e.c. es −536, y 1 a.e.c. es 0.

**El suceso de todo un libro profético no sitúa a nadie.** Va sin `type` ni `roles` y con `present: []`, aunque la tabla diga dónde se escribió; la residencia deducida del profeta va en su relación `lived_in`. Solo un mensaje que el texto fecha y sitúa, como los de Zacarías, lleva `type: speech`, el papel `spoke` y `present`.

## 7. Relaciones

Se apunta cada relación que el texto afirma, con el capítulo en sus `sources` y el pasaje en su `reason`. Sin un pasaje, la relación no se dibuja en el sitio.

**Una sola dirección.** Una relación escrita en la ficha X con `person: Y` y `word: W` dice «Y es el W de X», sea del tipo que sea. En la ficha de Elimélec van `person: noemi` y `word: wife`: Noemí es su esposa. La relación se escribe una vez; la ficha de Noemí no la repite, y el sitio la muestra en las dos.

**En qué ficha va.** Cada palabra de [`data/vocabulary.yaml`](../../data/vocabulary.yaml) dice dónde, para que dos lectores la pongan en el mismo sitio:

| Lo que dice el texto | `type` | `word` u otro campo | En qué ficha |
|---|---|---|---|
| Padre o madre | `kin` | `father`, `mother`; `parent` si no se sabe cuál | la del hijo o la hija |
| Abuelos y antepasados | `kin` | `grandfather`, `grandmother`, `great_grandfather`, `ancestor` | la del descendiente |
| Tíos | `kin` | `uncle`, `aunt`, `great_uncle` | la del sobrino o la sobrina |
| Suegros | `kin` | `father_in_law`, `mother_in_law` | la del yerno o la nuera |
| Padre adoptivo, padrastro | `kin` | `adoptive_father`, `stepfather` | la del hijo |
| Esposos | `kin` | `wife`, `secondary_wife`, `concubine` | la del esposo |
| Hermanos, primos, cuñados | `kin` | `brother`, `sister`, `half_brother`, `twin_brother`, `cousin`, `brother_in_law` | la del primero que nombra el texto (`mahlon` lleva a `kilion`) |
| «De la familia de», «pariente nuestro», sin grado | `kin` | `relative` | la del primero que nombra el texto, o la de quien el texto lo dice («Boaz, de la familia de Elimélec», en la de Boaz) |
| Maestro y discípulo | `disciple_of` | ninguna | la del discípulo |
| Compañeros de viaje o de trabajo | `accompanies` | `companion`, `female_companion`, `fellow_worker`; o ninguna, con `date` | la de quien acompaña |
| Amigos, enemigos, aliados | `tie` | `friend`, `enemy`, `ally` | la del primero que nombra el texto |
| Señor y siervo | `tie` | `master`, `mistress` | la de quien sirve |
| Anfitrión, custodio, consejero | `tie` | `host`, `custodian`, `adviser` | la de quien se hospeda, va custodiado o recibe el consejo |
| Sucesor en un cargo | `succeeds` | `office` | la de quien sucede |
| Un cargo de quien no tiene periodo (profeta, juez, apóstol) | `holds_office` | `office`; `place` y `date` si el texto los da | la de la persona |
| Dónde vivió, nació o murió | `lived_in`, `born_in`, `died_in` | `place` en vez de `person` | la de la persona |
| Dos nombres que quizá son la misma persona | `same_as` | `certainty` e `inferred: true` (sección 4) | la de id primero por orden alfabético |
| Se aparece o habla en una visión (Jesús a Pablo camino de Damasco) | `appears_to` | un `caption` de `outside`, opcional | la de quien se aparece |

- **Las palabras de la otra dirección no se escriben.** `son`, `daughter`, `adopted_son`, `grandson`, `nephew`, `son_in_law`, `husband` y `servant` están en el vocabulario para leer la relación desde el otro lado. Una propuesta que las usa no se aplica: `apply.py` se para y dice en qué ficha va la relación y con qué palabra.
- **Una palabra dice el sexo del destino**, como en español: la ficha de Bilhá lleva `person: raquel` con `word: mistress`.
- **Un cargo** es un valor de `offices` del vocabulario (`king`, `queen`, `prophet`, `prophetess`, `judge`, `apostle`, `high_priest`...). Una sucesión dice el cargo que toma quien sucede: Arquelao sucede a Herodes el Grande como `ethnarch`. Quien tiene un periodo con `person` no lleva `holds_office` de ese cargo, porque `build.py` lo saca del periodo. Quien tuvo dos cargos lleva dos relaciones. Si la fuente llama a alguien con un cargo que el vocabulario no tiene, o con otra palabra para el mismo, va a `preguntas`.
- **Varios tramos con la misma persona** son varias relaciones, cada una con su `date`: Lucas acompaña a Pablo en tres.
- **Si ninguna palabra dice lo que dice el texto**, no se inventa una ni se fuerza la más cercana. La relación lleva el texto en `caption` y, visto desde el destino, en `inverse_caption`, y la duda va a `preguntas`: la palabra o el texto nuevo se añade al vocabulario en un cambio revisado.
- **Estar de paso no es una relación.** Que alguien estuvo en un lugar lo dicen la parada de un viaje o `present` de un suceso.

`inferred` es `false` si lo dice el texto bíblico y `true` si lo deduce la publicación. Cada relación lleva sus `sources`, su `reason`, su `checked_on` y su `status`. Si la ficha ya existe, la relación se añade con `anadir` (el escritor la integra).

**La cobertura cita la relación** con `relation:<persona>/<type>/<destino>`, donde `<persona>` es la ficha que la lleva. Si esa ficha tiene otra relación con el mismo tipo y destino, se añade `/<word u office>` o `@<date.from>`, lo que baste para que case con una sola: `relation:lucas/accompanies/pablo@50`. `validate.py` dice la forma que toca.

## 8. Tramos sin entidades nuevas

Una ley, un salmo, un proverbio o un discurso sin nombres nuevos se apuntan igual, para que sus versículos cuenten: el tramo lleva su `type` y una `note` breve con palabras nuestras («Leyes sobre las ofrendas de paz»). Los nombres que aparecen de pasada (Jerusalén en un saludo) van en `mentions`. Si el pasaje dice algo nuevo de una persona o un lugar, deja de ser mención: va en `entities` y su ficha cita el capítulo.

**El encabezamiento de un salmo** va en el primer tramo del salmo. Si solo nombra al autor («De David»), el autor va en `mentions`. Si sitúa el salmo en un suceso (Sal 51: después de que Natán fuera a ver a David por lo de Bat-Seba; Sal 3: cuando David huía de Absalón), ese suceso va en `mentions` si ya existe; si no, en la `note` del tramo, y lo crea el libro que lo narra. Las personas y los lugares que nombra siguen la sección 4 y la 5.

## 9. Lo que ya existe

Cada entidad que el capítulo toca se relee contra el texto:

- **Si el capítulo cuenta algo de ella**, va en `entities` y su ficha tiene que citar el capítulo: el id del capítulo (`rut-1`) en `sources`, o la cita escrita en su `reason`. Se propone con `anadir`.
- **Si su ficha dice algo que el texto contradice**, se corrige con `cambiar`, que lleva una entrada de `history` (`date`, `change`, `source`) con el capítulo como fuente. Nada se borra sin dejar rastro.
- **Si el texto y una publicación de jw.org no coinciden en cómo leerlo**, manda la publicación más reciente, como en [README.md](README.md#lo-más-reciente-de-jworg-gana). Si no está claro, va a `preguntas` y no se toca.
- **Lo que cita un capítulo cerrado sale en su cobertura.** Cualquier entidad o relación que cite un capítulo `complete` (en `sources`, en `reason` o en `passages`) tiene que estar en uno de sus tramos, en `entities` o en `mentions`. `validate.py` lo comprueba en las dos direcciones.

## 10. Campos mínimos

Lo que necesita una ficha nueva para pasar [`scripts/validate.py`](../../scripts/validate.py). Son copias de los ficheros de Rut del 29-09-2026, salvo los `roles` del suceso, que el fichero aún no lleva (Rut 1:3, 5; decisión E1 de [`modelo.md`](modelo.md#sucesos)). Si cambian, manda el fichero.

**Persona**, con sus relaciones:

```yaml
# biblical-earth: un fichero por persona. Esquema en docs/investigacion/README.md.
id: elimelec
name: Elimélec
names:
- name: Elimélec
perspicacia: '1200001310'
summary: Hombre de Belén de Judá que, en una época de hambre en tiempos de los jueces, se trasladó a Moab con Noemí y sus
  dos hijos. Murió allí.
reason: Perspicacia «Elimélec»; Rut 1:1-3.
sources:
- it-elimelec
- rut-1
links:
- title: 'Perspicacia: «Elimélec»'
  url: https://wol.jw.org/es/wol/d/r4/lp-s/1200001310
  type: perspicacia
relations:
- type: kin
  person: noemi
  word: wife
  inferred: false
  sources:
  - rut-1
  reason: Rut 1:2 da a Noemí como su esposa.
  checked_on: '2026-09-29'
  status: verified
- type: lived_in
  place: belen
  inferred: false
  sources:
  - rut-1
  reason: 'Rut 1:1, 2: la familia era de Belén de Judá, llamada también Efrata.'
  checked_on: '2026-09-29'
  status: verified
- type: lived_in
  place: moab
  inferred: false
  sources:
  - rut-1
  reason: 'Rut 1:1, 2: se fue a residir como extranjero en Moab.'
  checked_on: '2026-09-29'
  status: verified
- type: died_in
  place: moab
  inferred: false
  sources:
  - rut-1
  - it-elimelec
  reason: 'Rut 1:2, 3: murió después de instalarse en Moab.'
  checked_on: '2026-09-29'
  status: verified
checked_on: '2026-09-29'
status: verified
```

**Lugar**:

```yaml
# biblical-earth: un fichero por lugar. Esquema en docs/investigacion/README.md.
id: moab
name: Moab
names:
- name: Moab
- name: Campos de Moab
  note: Lectura literal que da la nota de Rut 1:1; Perspicacia la recoge como otro nombre del territorio.
type: country
lat: 31.180556
lon: 35.701389
precision: zone
coord_source: openbible:aa0b1d6
coord_url: https://www.openbible.info/geo/ancient/aa0b1d6/moab-1
coord_note: Punto representativo de OpenBible para todo el territorio.
summary: Meseta al este del mar Muerto, entre los torrentes de Zered y Arnón, tierra de los moabitas, que descendían de Moab,
  hijo de Lot.
reason: 'Perspicacia «Moab, moabitas», núm. 1 y 2, párr. 1. Coordenada de OpenBible: solo tomamos el punto.'
sources:
- it-moab
- openbible-geo
- rut-1
links:
- title: 'Perspicacia: «Moab, moabitas»'
  url: https://wol.jw.org/es/wol/d/r4/lp-s/1200003097
  type: perspicacia
checked_on: '2026-09-29'
status: verified
```

**Suceso** con fecha narrativa:

```yaml
# biblical-earth: un fichero por evento. Esquema en docs/investigacion/README.md.
id: elimelec-se-va-a-moab
title: Elimélec se va a Moab con su familia
date:
  from: -1472
  to: -1300
  precision: range
  approx: true
  type: narrative
  chronology: tnm
  text: 'entre 1473 y 1301 a.e.c. (tiempo narrativo: en tiempos de los jueces y en vida de Boaz)'
narrative_order:
  series: rut
  order: 1001
places:
- moab
- belen
people:
- elimelec
- noemi
- mahlon
- kilion
- orpa
- rut
roles:
  elimelec: died
  mahlon: died
  kilion: died
passages:
- Rut 1:1-5
summary: Por el hambre, Elimélec deja Belén con Noemí y sus hijos. En Moab muere él; sus hijos se casan con Orpá y Rut, dos
  moabitas, y al cabo de unos diez años mueren también.
reason: Rut 1:1 lo pone cuando juzgaban los jueces, tras la entrada en Canaán (1473 a.e.c., estudio 3). Boaz, que vive aún
  en el capítulo 4, es del siglo XIV a.e.c. según Perspicacia «Boaz, I».
sources:
- rut-1
- si-3
- it-elimelec
- it-rut-libro
- it-boaz
links:
- title: Rut 1 (TNM)
  url: https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/8/1
  type: bible
checked_on: '2026-09-29'
status: verified
```

**Fuente** nueva, en `data/sources/cobertura-<libro>.yaml`. Los capítulos (`rut-1`) no se escriben: los crea `build.py`.

```yaml
it-elimelec:
  title: Elimélec
  work: Perspicacia para comprender las Escrituras
  url: https://wol.jw.org/es/wol/d/r4/lp-s/1200001310
  level: 1
  published: null
  checked_on: '2026-09-29'
```

**Entrada de cobertura** (recortada al primer tramo):

```yaml
# biblical-earth: cobertura de un libro. Formato en data/coverage/README.md.
book: rut
chapters:
  1:
    status: complete
    reviewed_on: 2026-09-29
    spans:
    - {v: 1-5, type: narration, entities: [event:elimelec-se-va-a-moab, person:elimelec, person:noemi, person:mahlon, person:kilion, person:orpa, person:rut, place:belen, place:moab, relation:elimelec/kin/noemi, relation:elimelec/lived_in/belen, relation:elimelec/lived_in/moab, relation:elimelec/died_in/moab, relation:noemi/lived_in/moab, relation:mahlon/kin/elimelec, relation:mahlon/kin/noemi, relation:mahlon/kin/kilion, relation:mahlon/died_in/moab, relation:kilion/kin/elimelec, relation:kilion/kin/noemi, relation:kilion/kin/orpa, relation:kilion/died_in/moab, relation:orpa/lived_in/moab, relation:rut/born_in/moab], mentions: [place:juda]}
```

## 11. La propuesta

Cada lector devuelve un JSON por encargo. Con ella, el escritor aplica los cambios sin volver a leer los capítulos.

El sobre de la propuesta tiene sus propias claves, que no cambian: `formato`, `libro`, `capitulos`, `agente`, `leido`, `cobertura`, `fuentes`, `cambios` (con `op`, `tipo`, `id`, `datos`, `campo`, `valores`, `antes`, `despues` e `historial`) y `preguntas`, con las operaciones `crear`, `anadir` y `cambiar`. Todo lo que va dentro y acabará en una ficha, en la cobertura o en las fuentes se escribe como en `data/`, con las claves y los valores cerrados de las secciones anteriores. Un ejemplo completo, del encargo que leyó Rut 1:

```json
{
  "formato": "biblical-earth/propuesta-cobertura/1",
  "libro": "rut",
  "capitulos": [1],
  "agente": "rut-1-2",
  "leido": "2026-09-29",
  "cobertura": {
    "1": {"status": "complete", "reviewed_on": "2026-09-29", "spans": [
      {"v": "1-5", "type": "narration",
        "entities": ["event:elimelec-se-va-a-moab", "person:elimelec", "person:noemi", "place:moab", "place:belen",
          "relation:elimelec/kin/noemi", "relation:elimelec/died_in/moab", "relation:noemi/lived_in/moab"],
        "mentions": ["place:juda"]}
    ]}
  },
  "fuentes": {
    "it-elimelec": {"title": "Elimélec", "work": "Perspicacia para comprender las Escrituras",
      "url": "https://wol.jw.org/es/wol/d/r4/lp-s/1200001310", "level": 1, "published": null,
      "checked_on": "2026-09-29"}
  },
  "cambios": [
    {"op": "crear", "tipo": "people", "id": "elimelec", "datos": {
      "id": "elimelec", "name": "Elimélec", "names": [{"name": "Elimélec"}], "perspicacia": "1200001310",
      "summary": "Hombre de Belén de Judá que, en una época de hambre, se trasladó a Moab con su familia. Murió allí.",
      "reason": "Perspicacia «Elimélec»; Rut 1:1-3.", "sources": ["it-elimelec", "rut-1"],
      "links": [{"title": "Perspicacia: «Elimélec»", "url": "https://wol.jw.org/es/wol/d/r4/lp-s/1200001310",
        "type": "perspicacia"}],
      "relations": [
        {"type": "kin", "person": "noemi", "word": "wife", "inferred": false, "sources": ["rut-1"],
          "reason": "Rut 1:2 da a Noemí como su esposa.", "checked_on": "2026-09-29", "status": "verified"},
        {"type": "died_in", "place": "moab", "inferred": false, "sources": ["rut-1", "it-elimelec"],
          "reason": "Rut 1:2, 3: murió después de instalarse en Moab.", "checked_on": "2026-09-29",
          "status": "verified"}
      ],
      "checked_on": "2026-09-29", "status": "verified"}},
    {"op": "crear", "tipo": "events", "id": "elimelec-se-va-a-moab", "datos": {
      "id": "elimelec-se-va-a-moab", "title": "Elimélec se va a Moab con su familia",
      "date": {"from": -1472, "to": -1300, "precision": "range", "approx": true, "type": "narrative",
        "chronology": "tnm", "text": "entre 1473 y 1301 a.e.c. (tiempo narrativo: en tiempos de los jueces)"},
      "narrative_order": {"series": "rut", "order": 1001}, "places": ["moab", "belen"],
      "people": ["elimelec", "noemi"], "roles": {"elimelec": "died"}, "passages": ["Rut 1:1-5"],
      "summary": "Por el hambre, Elimélec deja Belén con Noemí y sus hijos y se va a Moab, donde muere.",
      "reason": "Rut 1:1 lo pone cuando juzgaban los jueces, tras la entrada en Canaán (1473 a.e.c., estudio 3).",
      "sources": ["rut-1", "si-3"], "checked_on": "2026-09-29", "status": "verified"}},
    {"op": "anadir", "tipo": "places", "id": "belen", "campo": "sources", "valores": ["rut-1"]},
    {"op": "anadir", "tipo": "people", "id": "noemi", "campo": "relations", "valores": [
      {"type": "lived_in", "place": "moab", "inferred": false, "sources": ["rut-1"],
        "reason": "Rut 1:1, 2: fue a Moab con Elimélec y sus hijos.", "checked_on": "2026-09-29",
        "status": "verified"}]},
    {"op": "cambiar", "tipo": "places", "id": "belen", "campo": "summary", "antes": "<valor actual exacto>",
      "despues": "<valor nuevo>", "historial": {"date": "2026-09-29", "change": "Qué se corrigió y por qué.",
        "source": "rut-1"}}
  ],
  "preguntas": ["Dudas que tiene que decidir el escritor o el dueño, cada una con su pasaje."]
}
```

| Campo | Qué es |
|---|---|
| `formato` | Siempre `biblical-earth/propuesta-cobertura/1`. |
| `libro`, `capitulos` | El slug del libro y los capítulos leídos. |
| `agente`, `leido` | Quién leyó y el día de la lectura. `apply.py` pone ese día en el `checked_on` de lo que toca. |
| `cobertura` | Las entradas de sus capítulos, con la misma forma que en `data/coverage/<libro>.yaml` y el capítulo como texto. |
| `fuentes` | Las fuentes nuevas, con la misma forma que en `data/sources/`. |
| `cambios` | Lista ordenada de operaciones. `tipo` es la carpeta de `data/` (`people`, `places`, `events`, `periods`…). |
| `crear` | `datos` es la ficha completa como objeto. |
| `anadir` | Añade `valores` a la lista `campo` (`sources`, `names`, `relations`, `passages`, `people`, `places`) sin repetir lo que ya está. |
| `cambiar` | Pone `despues` en `campo` solo si el valor actual es igual a `antes`. Lleva siempre `historial`, una entrada de `history` con `date`, `change` y `source`, salvo cuando el campo no existía (`antes: null`), como al poner la clave `perspicacia` a una ficha antigua. `campo` puede ser un objeto entero (`date`). |
| `preguntas` | Lo que el lector no pudo decidir. No se aplica nada de ahí sin respuesta. |

`apply.py` también acepta una propuesta cuyo contenido lleve las claves en español de antes del modelo, y la traduce al aplicarla.

**Cómo aplica el escritor:**

```bash
python3 scripts/apply.py --dry-run propuestas/*.json      # qué escribiría
python3 scripts/apply.py propuestas/*.json                # un solo libro en marcha
python3 scripts/apply.py --parallel propuestas/*.json     # varios libros a la vez
```

1. Las propuestas, en orden de capítulo; dentro de cada una, los cambios en orden.
2. `crear` de un id que ya existe (porque otro lector lo creó antes), o de una persona cuya clave `perspicacia` ya tiene otra ficha: se funde. Las listas se unen, sin repetir. Dos relaciones con la misma clave (tipo, destino, palabra o cargo, y `date.from`) juntan sus `sources`; con otro `date.from` son dos tramos y se quedan las dos. Si un campo de texto no coincide, se queda el que había y la diferencia va al informe.
3. **Candidatos de dos creaciones.** Si las dos traen el mismo candidato de un lugar con otras palabras, la unión deja dos. El escritor deja uno, con las fuentes de los dos, antes de validar.
4. `anadir` de una relación que ya existe con la misma clave junta sus `sources` y pone su `checked_on` al día `leido`. Una relación nueva entra con ese `checked_on`.
5. `anadir` de una relación con una palabra de la otra dirección (`son`, `husband`, `servant`...) no se aplica: `apply.py` se para y dice en qué ficha va y con qué palabra.
6. Una propuesta que cita una relación quitada o movida llega a la que queda, por su fila de `scripts/migration/redirects.yaml`.
7. `cambiar` cuyo `antes` ya no coincide es un choque: no se aplica, se relee la ficha y va al informe (código de salida 2).
8. Cada ficha que recibe un hecho nuevo o una fuente nueva pone `checked_on` al día `leido` de la propuesta.
9. En `data/coverage/<libro>.yaml` se sustituyen solo los capítulos que traen las propuestas; los demás se quedan. Las fuentes se unen a `data/sources/cobertura-<libro>.yaml`; un id que ya existe con otros datos es un error y no se escribe nada.
10. Una ficha que ya existía cambia solo en las líneas de los campos que cambian.
11. Se valida con los datos de `main` más lo suyo, en una copia (como en [`scripts/README.md`](../../scripts/README.md#validar)). Con `--parallel`, en la copia se aplican también sus operaciones: `python3 scripts/apply.py --data "$T/data" data/_proposals/<libro>.json`, y luego `python3 scripts/validate.py --data "$T/data"` con 0 errores.

## 12. Cerrar un capítulo

Un capítulo pasa a `status: complete` cuando:

- sus tramos cubren todos sus versículos, salvo los omitidos ([`scripts/bible_coverage.py`](../../scripts/bible_coverage.py) `--missing <libro>` no lo lista);
- cada persona y cada lugar con nombre del capítulo está en `entities` o en `mentions`, salvo las excepciones de la sección 4;
- cada suceso del relato es un suceso de `data/events/` o está explicado en una `note`;
- cada entidad de `entities` cita el capítulo, y cada persona de `entities` lleva su clave `perspicacia`;
- cada entidad o relación que cita el capítulo está en uno de sus tramos;
- cada relación nueva cita su pasaje en `reason`;
- `ochos.py` da 0 coincidencias;
- `validate.py` da 0 errores.

Si algo queda sin decidir, el capítulo se queda `pending` y la duda va a `preguntas`.
