# Leer la Biblia versículo a versículo

El protocolo que sigue un agente para leer unos capítulos de la Traducción del Nuevo Mundo y dejarlos apuntados en el atlas. La meta es que cada versículo de los 66 libros (1189 capítulos) esté leído y rendido en cuentas: cada persona con nombre es una `persona`, cada lugar con nombre un `lugar`, cada suceso del relato un `evento` y cada relación que el texto afirma una `relación`, todo con su fuente y con palabras nuestras. Lo que ya existe se relee contra el texto y se corrige.

Antes de empezar se leen el esquema, [`README.md`](README.md), y el formato de la cobertura, [`data/cobertura/README.md`](../../data/cobertura/README.md). Todas sus reglas siguen valiendo aquí.

## 1. Quién hace qué

- **Lectores.** Cada agente recibe unos capítulos de un libro. Lee, busca y **devuelve una propuesta** en JSON (sección 11). No escribe en `data/`.
- **Un escritor por libro.** Recibe las propuestas de su libro y las aplica con [`scripts/aplicar.py`](../../scripts/aplicar.py), que escribe `data/cobertura/<libro>.yaml`, `data/fuentes/cobertura-<libro>.yaml` y las fichas. Después valida. Es el único que toca los ficheros de ese libro.
- **Un solo libro en marcha.** Si el encargo lo dice, el escritor aplica sin más opciones: `aplicar.py` edita también las fichas que ya existían.
- **Varios libros a la vez.** El escritor aplica con `aplicar.py --paralelo`. Así solo escribe su cobertura, sus fuentes y las fichas nuevas, que crea en modo exclusivo (`open(ruta, "x")`). Los cambios a fichas que ya existían, y el `crear` de una ficha que otro escritor creó antes, quedan como operaciones en `data/_propuestas/<libro>.json`. La integración aplica esas operaciones con el mismo `aplicar.py`, en lugar de las copias completas que usan los demás carriles ([README.md](README.md#propuestas-sobre-ficheros-ajenos)). Añadir fuentes o relaciones es una unión, así que las operaciones de libros distintos no chocan entre sí.
- **El encargo no propone ids ni grafías.** Los nombres salen de la TNM (Boaz, Kilión y Orpá, no Booz, Quilión ni Orfá) y los ids, de la sección 4.
- Nadie hace `git add`, commit ni push: eso es del orquestador.

## 2. Qué se lee

1. **El capítulo en la edición de estudio**: `https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/<número del libro>/<capítulo>` (el número está en `num` de [`data/libros.yaml`](../../data/libros.yaml)). Los ayudantes viven fuera del repo, porque las condiciones de jw.org no permiten herramientas de extracción dentro del proyecto:

   ```bash
   python3 /tmp/be-wol/estudio.py 8 1        # Rut 1: texto, y por versículo notas de estudio, notas al pie y referencias
   python3 /tmp/be-wol/wol.py search "Elimélec"
   python3 /tmp/be-wol/wol.py text https://wol.jw.org/es/wol/d/r4/lp-s/1200001310
   python3 /tmp/be-wol/ochos.py propuesta.json   # 8 palabras seguidas copiadas de las páginas citadas
   ```

   Comparten un candado de un segundo entre peticiones y una caché. No se lanzan lecturas en paralelo dentro de un mismo agente.
2. **Todo el capítulo, versículo a versículo**, con sus notas de estudio (abundantes en los Evangelios y Hechos), sus notas al pie (otros nombres, significados, «o» y «lit.») y sus referencias marginales, que llevan a los relatos paralelos y a los otros pasajes de la misma persona o el mismo lugar.
3. **Perspicacia** para cada persona y cada lugar nuevos, y para los que ya existen si el capítulo dice algo que su ficha no dice. Se confirma el título con `wol.py title <url>`.
4. **Fechas**: el estudio 3 «Sucesos fechados» (`si-3`), la tabla de los libros (`tnm-tabla`), las tablas A6 (reyes y profetas) y A7 (vida de Jesús) del apéndice, y lo que Perspicacia fecha. Los ids de esas fuentes ya están en `data/fuentes/`.
5. **Antes de devolver la propuesta**, `python3 /tmp/be-wol/ochos.py <propuesta.json>` tiene que dar 0 coincidencias. Compara cada texto con las páginas que la propuesta cita (sus fuentes, sus enlaces y sus capítulos). Con `--control "<frase copiada de una de esas páginas>"` se ve que la comprobación puede fallar.

Solo valen fuentes de nivel 1 (la TNM y wol.jw.org). Las coordenadas salen de OpenBible (`/tmp/be-wol/ancient.jsonl`) y solo se toma el punto, nunca la identificación. Las notas de trabajo van a `/tmp/be-wol/notas/<etapa>/`. Nunca entra texto de jw.org en el repo: palabras nuestras, 40 como mucho por campo y ninguna secuencia de 8 palabras igual a la fuente. `consultado` y `revisado` son el día real de lectura.

## 3. Partir el capítulo en tramos

Un tramo es una unidad de sentido: una escena, un discurso, una lista, un poema. No un versículo por tramo, ni un capítulo entero si cambia de escena. Cada tramo lleva su `tipo` (`narracion`, `genealogia`, `ley`, `poesia`, `profecia`, `discurso`, `carta`, `lista`, `vision`; la tabla está en [`data/cobertura/README.md`](../../data/cobertura/README.md#tipos-de-pasaje)), sus `entidades` y lo que solo `menciona`. Los tramos van seguidos y cubren todos los versículos del capítulo salvo los que la TNM no incluye (`omitidos` de `data/libros.yaml`).

**El encabezamiento de un salmo** («Salmo de David, cuando…»), que la TNM pone antes del versículo 1, es parte del primer tramo del salmo. No hay versículo 0. Sus nombres y su suceso siguen las reglas de siempre (sección 8).

## 4. Personas

**Cada individuo con nombre es una persona**, aunque salga una sola vez en una genealogía. Excepciones:

- Jehová no lleva ficha: el atlas sitúa personas en la tierra y en el tiempo. Tampoco va en `menciona`.
- Los personajes de una parábola, una alegoría o una visión (el hombre rico y Lázaro, Oholá y Oholibá) no son personas. Van en la `nota` del tramo.
- Un pueblo o una tribu (moabitas, levitas, fariseos) no es una persona. Su territorio, si tiene nombre, es un lugar.
- Alguien sin nombre («el faraón», «el carcelero de Filipos») no lleva ficha, salvo que jw.org le dé nombre. Una referencia marginal que remite a otro pasaje no le da nombre: si el tramo la recoge, va en su `nota`, no en `menciona`. Las dos fichas de personas sin nombre que ya existían, `suegra-de-pedro` y `eunuco-etiope`, se quedan, porque su id está en las direcciones del sitio; no se crean más.
- Los ángeles con nombre y Satanás llevan ficha cuando actúan en un momento y un lugar del relato, como ya la tiene Gabriel.

**Nombres que no son personas ni lugares.** La misma tabla vale para la sección 5:

| Lo que nombra el texto | Qué se hace |
|---|---|
| Un dios o un ídolo (Baal, Dagón, Moloc, Ártemis, Zeus, Hermes) | Sin ficha. Va en la `nota` del tramo. Su templo o su ciudad, si el suceso pasa allí, es el lugar. |
| Un título (Faraón, César, Candace) | Sin ficha. Si jw.org dice quién era (Faraón Nekó, César Augusto), va esa persona, en `entidades` o en `menciona`. Un nombre que Perspicacia trata como persona con número (Abimélec) es una persona. |
| Un nombre simbólico o poético (Rahab por Egipto en Sal 87:4) | Lo que simboliza, en `menciona`, si tiene ficha (`lugar:egipto`). Si no, la `nota`. |
| Un lugar que solo sale en una visión o una profecía simbólica (Babilonia la Grande, Armagedón) | Sin ficha. Va en la `nota`. |
| Una construcción con nombre dentro de una ciudad (una puerta de Jerusalén, el estanque de Siloam, un altar con nombre, Ebenezer) | En `nombres` de su ciudad, con una nota. Solo lleva ficha propia si allí pasa un suceso y OpenBible tiene su punto; entonces su `tipo` es el más cercano de la lista (`ciudad` no, `region` si es un barrio) y `coord_nota` dice qué es. |
| Israel | Como pueblo, sin ficha. Como tierra o como reino del norte, el lugar `israel`, uno solo, igual que `juda` cubre el territorio de la tribu y el reino del sur. Lo crea el primer libro que lo necesita como lugar. Jacob, cuando el texto lo llama Israel, es `persona:jacob`. |
| Una tribu (la tribu de Judá) | Como pueblo, sin ficha. Su territorio es el lugar (`lugar:juda`); el patriarca (`persona:juda-hijo-de-jacob`) solo cuando el texto habla del hombre. |
| Un patriarca cuyo nombre designa a su pueblo o a su tierra («la casa de Jacob», «tu hermano Jacob» en Abd 10, Esaú por Edom, «los lugares altos de Isaac») | Sin `persona`, ni en `entidades` ni en `menciona`; la `nota` dice que es el pueblo, y la tierra, si la nombra, es su lugar (`lugar:edom`). El patriarca va solo cuando el texto habla del hombre, también como antepasado o por su Dios («descendencia de Jacob», «Dios de Jacob»). |

**Antes de crear**, se busca si ya existe: `ls data/personas | grep -i <nombre>`, `grep -l "^perspicacia: .*<documento>" data/personas/*.yaml` y una búsqueda en Perspicacia. El artículo de Perspicacia numera a los homónimos («1.», «2.») con los pasajes de cada uno; el individuo del capítulo es el número cuyos pasajes incluyen este capítulo.

**La clave `perspicacia`.** Cada persona que sale en `entidades` lleva la clave de su artículo: el número del documento de la URL de Perspicacia y, si el artículo trata de varias personas, `#` y el número de la entrada (`perspicacia: '1200003629#1'` es Ram hijo de Hezrón). Si el artículo trata de una sola, solo el documento (`'1200001310'`, Elimélec). Si Perspicacia no tiene artículo, `perspicacia: null`. Un documento solo va entre comillas, para que YAML lo lea como texto. `validate.py` exige que sea única entre las personas: dos fichas con la misma clave son la misma persona. `aplicar.py` lo usa al crear: si la clave ya es de otra ficha, la propuesta pasa a usar ese id y las dos se funden.

**Ids.** Slug ASCII del nombre TNM más conocido.

1. Si Perspicacia tiene una sola persona con ese nombre, el id es el nombre solo (`elimelec`).
2. Si tiene varias, el id es el mismo que elegiría cualquier otro lector, en este orden:
   - un rey de Judá o de Israel: `<nombre>-de-juda` o `<nombre>-de-israel` (`jehoram-de-juda`), como los periodos;
   - si se sabe quién era su padre: `<nombre>-hijo-de-<padre>` o `<nombre>-hija-de-<padre>` (`hezron-hijo-de-perez`, `obed-hijo-de-boaz`);
   - si no: el rasgo con que Perspicacia la distingue (`tamar-nuera-de-juda`, `ananias-de-damasco`, `zacarias-profeta`).
3. Un id que ya existe no se cambia nunca, porque las direcciones del sitio lo usan: si aparece un homónimo de `pedro`, el nuevo lleva el rasgo y los dos llevan `desambiguacion` y `no_confundir_con`.

**Fundir o separar.** Dos nombres son una sola ficha (con los dos en `nombres`) solo si jw.org dice que son la misma persona: Jesúa y Josué el sumo sacerdote. Si jw.org solo lo da como probable, van dos fichas y una relación `mismo_que` con `deducido: true` y `estado: pendiente`.

## 5. Lugares

**Cada lugar con nombre es un lugar**: ciudades, regiones, países, montes, ríos, mares, valles, desiertos, y también los que solo salen en una lista de fronteras o de etapas. Los dioses, las visiones y las construcciones siguen la tabla de la sección 4. Un lugar con varios nombres es una sola ficha, con los demás en `nombres` y su época si la fuente la da (Luz y Betel).

- **Punto de OpenBible.** Se busca por su nombre en inglés (`grep -i '"friendly_id":"Moab' /tmp/be-wol/ancient.jsonl`) Cada ficha de OpenBible trae una o varias identificaciones (los sitios actuales que se proponen) y cada identificación, una o varias resoluciones (sus puntos). Se toma la primera resolución de la primera identificación. Si jw.org nombra un sitio, aunque sea como propuesta («hay quien lo identifica con…»), y es otra identificación de la misma ficha, se toma la primera resolución de esa identificación, con `precision: incierto`, y `coord_nota` dice qué identificación es y qué sitio nombra jw.org. Si jw.org duda entre varios sitios, vale el punto siguiente. `coord_fuente: openbible:<id>` y `coord_url: https://www.openbible.info/geo/ancient/<id>/<nombre-en-inglés>`. Una región o un país lleva `precision: zona` y dice en `coord_nota` qué representa su punto.
- **Sin punto seguro.** Si jw.org no lo sitúa y OpenBible no tiene punto, o jw.org duda entre sitios, `lat` y `lon` van a `null` con `candidatos` (sección «Lugares» de [README.md](README.md#campos-por-tipo)): una zona alrededor de lo que dice el texto («en el Négueb de Judá») con `coord_fuente: calculo` y la cuenta en `nota`. Si ni eso, `candidatos: []` y `estado: pendiente`. Nunca un punto inventado.

## 6. Eventos

**Cada suceso del relato es un evento.** Un evento es una escena: cambia cuando cambian el lugar, el momento o los protagonistas. No cada verbo. Un discurso dentro del relato es un evento (el Sermón del Monte) y su contenido es un tramo `discurso`. Una aparición (Jesús resucitado se aparece a los once) es un evento con `personas` y `presentes`, no una relación. Una muerte que el texto solo informa, sin escena («murió Elimélec»), no es un evento aparte: queda en la relación `murio_en` y en el resumen del suceso que la contiene. Lleva su propio «Muere…» cuando el texto la cuenta como escena.

`lugares` va en orden, con el sitio principal primero; `personas` lleva a todos los que actúan, y en un nacimiento o una muerte la primera es quien nace o muere. Si el suceso pasa en un sitio que el texto no nombra (en el camino de Moab a Judá), `lugares` lleva los que nombra y `presentes: []`: el sitio no sitúa a nadie y `razon` lo explica. `pasajes` cita los versículos (`Rut 1:1-5`) y los relatos paralelos.

**Sucesos que cuentan dos libros.** Los crea un solo libro, el dueño: el de número más bajo que lo narra (Samuel y Reyes antes que Crónicas; Reyes antes que Isaías 36-39 y Jeremías 52; Hechos antes que las cartas). La vida de Jesús usa la armonía A7 (serie `a7`), cuyos sucesos ya existen. Los demás libros solo añaden su pasaje a `pasajes` del evento del dueño (`anadir`) y lo ponen en `entidades`. Si el dueño aún no lo ha creado, el tramo lo dice en su `nota` («suceso de 1Re 1; lo crea Reyes») y, cuando el dueño añada este pasaje a `pasajes`, `validate.py` pedirá ponerlo en el tramo.

**Cómo se fecha:**

1. **Anclada** (`tipo: anclada`): cuando el estudio 3, una tabla del apéndice o Perspicacia dan el año. Se cita esa fuente en `fuentes` y el párrafo en `razon`. Si el texto da mes y día, van en `detalle` (`{mes: adar, dia: 3}`).
2. **Narrativa** (`tipo: narrativa`): cuando nadie da el año. El suceso queda entre los límites más estrechos que dé jw.org: dos sucesos anclados, y también un siglo o una generación («Boaz vivió hacia el siglo XIV a.e.c.»), no solo los límites de la época. Va con `precision: rango`, `aprox: true` y un `texto` que lo dice («entre 1473 y 1301 a.e.c. (tiempo narrativo: en tiempos de los jueces y en vida de Boaz)»). La `razon` nombra los límites y `fuentes` lleva sus fuentes.
3. **Derivada** (`tipo: derivada`): cuando el año sale de una cuenta nuestra («año séptimo de Asuero, contando 495 como el primero»). Lleva la cuenta en `fecha.nota` y `estado: pendiente`.

**`detalle` solo en una fecha de un año** (`desde == hasta`). En un tramo de años el sitio leería el mes en el primero de ellos; `validate.py` lo rechaza. El mes de un suceso de fecha narrativa («al empezar la cosecha de la cebada») va en `razon`.

**El orden del relato es el orden de los sucesos, no el del libro.** `orden_relato: {serie: <libro>, orden: <capítulo × 1000 + primer versículo>}` (Rut 1:1 es `1001`) solo vale cuando el libro cuenta las cosas en el orden en que pasaron. Cuando jw.org o el propio texto sitúan un capítulo en otro momento, el suceso lleva un `orden` ajustado o `tras: <id>` (engancha el suceso a otro de cualquier serie), y la `razon` dice por qué. Libros y pasajes que ya sabemos que no van en orden:

- Génesis 10-11: el capítulo 10 da las naciones ya repartidas y 11:1-9 cuenta cómo se dispersaron en Babel, en días de Péleg (Gé 10:25; Perspicacia «Babel»).
- Jueces 1:1-3:6 mezcla sucesos de antes y de después de la muerte de Josué, y los capítulos 17-21 pasan mucho antes que Sansón (Perspicacia «Jueces, Libro de», «Orden del libro»).
- Jeremías: sus capítulos van por temas; cada uno se fecha por el rey que nombra (Jer 21 es de Sedequías y Jer 25, del año cuarto de Jehoiaquim).
- Daniel 7 y 8 son de los años primero y tercero de Belsasar, antes de Daniel 5.
- Ezequiel 29:17-21 es del año 27 del destierro, posterior a los capítulos que lo siguen (40:1 es del año 25).
- Salmos: cada salmo con encabezamiento se ordena por el suceso que nombra; los demás no son sucesos.
- 1473 a.e.c., de la victoria sobre Og al cruce del Jordán: Números, Deuteronomio y Josué 1-5 van en la serie `numeros`, porque `build.py` ordena las series de un mismo año por su nombre y `deuteronomio` o `josue` saldrían antes que Números. Números usa su capítulo y versículo; Deuteronomio les suma 100000 (`primer-discurso-de-moises` es 101001) y Josué, 200000 (`entrada-en-canaan` es 203014).

Las series `a7` y `hechos` ya tienen su propia numeración.

**Todo evento lleva fecha.** Si un suceso no se puede acotar ni con los sucesos anclados ni con lo que `data/libros.yaml` dice que abarca el libro, no es un evento: va en la `nota` del tramo. Tampoco son eventos las parábolas, los casos hipotéticos de la Ley ni lo que se ve en una visión.

Los años van en numeración astronómica: 537 a.e.c. es −536, y 1 a.e.c. es 0.

## 7. Relaciones

Se apunta cada relación que el texto afirma, con el capítulo en sus `fuentes`. Una relación `pariente` escrita en la ficha X con `persona: Y` y `relacion: R` dice «Y es el R de X»: en la ficha de Elimélec, `persona: noemi` y `relacion: esposa`.

**En qué ficha va.** Una sola regla, para que dos lectores la pongan en el mismo sitio:

- **Generaciones distintas** (padres e hijos, abuelos y nietos, suegros y nueras, tíos y sobrinos, antepasados): en la ficha de la persona más joven. En la de David va `persona: jese`, `relacion: padre`. La otra dirección no hace falta.
- **Esposos**: en la ficha del esposo (`relacion: esposa`).
- **Hermanos y parientes sin grado**: en la ficha del primero que nombra el texto (`mahlon` lleva a `kilion`), o en la de la persona de quien el texto lo dice («Boaz, de la familia de Elimélec», en la de Boaz).
- **Maestro y discípulo, compañeros**: en la ficha del discípulo o del que acompaña.

Si esa ficha ya existe, la relación se añade con `anadir` (el escritor la integra).

| Lo que dice el texto | `tipo` | `relacion` |
|---|---|---|
| Padres, hijos, hermanos, esposos, suegros, abuelos, tíos | `pariente` | `padre`, `madre`, `hijo`, `hija`, `esposo`, `esposa`, `hermano`, `hermana`, `suegra`, `nuera`, `abuelo`, `nieto`, `tío`, `sobrino`… |
| «De la familia de», «pariente nuestro», sin grado | `pariente` | sin `relacion` (vale así) |
| Descendiente lejano de una genealogía | `pariente` | `antepasado` o `descendiente` |
| Maestro y discípulo | `acompana` | `maestro` o `discípulo` |
| Compañeros de viaje o de trabajo | `acompana` | `compañero` (o nada) |
| Sucesor en un cargo | `sucede_a` | |
| Dónde vivió, nació o murió | `vivio_en`, `nacio_en`, `murio_en` | (con `lugar`, no `persona`) |
| Dos nombres que quizá son la misma persona | `mismo_que` | `deducido: true`, `estado: pendiente` |

`deducido` es `false` si lo dice el texto bíblico y `true` si lo deduce la publicación. Si las dos fichas declaran la relación con palabras de padres e hijos, una lleva la de padre y la otra la de hijo; `validate.py` lo comprueba.

## 8. Tramos sin entidades nuevas

Una ley, un salmo, un proverbio o un discurso sin nombres nuevos se apuntan igual, para que sus versículos cuenten: el tramo lleva su `tipo` y una `nota` breve con palabras nuestras («Leyes sobre las ofrendas de paz»). Los nombres que aparecen de pasada (Jerusalén en un saludo) van en `menciona`. Si el pasaje dice algo nuevo de una persona o un lugar, deja de ser mención: va en `entidades` y su ficha cita el capítulo.

**El encabezamiento de un salmo** va en el primer tramo del salmo. Si solo nombra al autor («De David»), el autor va en `menciona`. Si sitúa el salmo en un suceso (Sal 51: después de que Natán fuera a ver a David por lo de Bat-Seba; Sal 3: cuando David huía de Absalón), ese suceso va en `menciona` si ya existe como evento; si no, en la `nota` del tramo, y lo crea el libro que lo narra. Las personas y los lugares que nombra siguen la sección 4 y la 5.

## 9. Lo que ya existe

Cada entidad que el capítulo toca se relee contra el texto:

- **Si el capítulo cuenta algo de ella**, va en `entidades` y su ficha tiene que citar el capítulo: el id del capítulo (`rut-1`) en `fuentes`, o la cita escrita en su `razon`. Se propone con `anadir`.
- **Si su ficha dice algo que el texto contradice**, se corrige con `cambiar`, que lleva una entrada de `historial` (`fecha`, `cambio`, `fuente`) con el capítulo como fuente. Nada se borra sin dejar rastro.
- **Si el texto y una publicación de jw.org no coinciden en cómo leerlo**, manda la publicación más reciente, como en [README.md](README.md#lo-más-reciente-de-jworg-gana). Si no está claro, va a `preguntas` y no se toca.
- **Lo que cita un capítulo cerrado sale en su cobertura.** Cualquier entidad o relación que cite un capítulo `completo` (en `fuentes`, en `razon` o en `pasajes`) tiene que estar en uno de sus tramos, en `entidades` o en `menciona`. `validate.py` lo comprueba en las dos direcciones.

## 10. Campos mínimos

Lo que necesita una ficha nueva para pasar [`scripts/validate.py`](../../scripts/validate.py). Son copias de los ficheros de Rut del 29-09-2026; si cambian, manda el fichero.

**Persona**, con sus relaciones:

```yaml
# biblical-earth: un fichero por persona. Esquema en docs/investigacion/README.md.
id: elimelec
nombre: Elimélec
nombres:
- nombre: Elimélec
perspicacia: '1200001310'
resumen: Hombre de Belén de Judá que, en una época de hambre en tiempos de los jueces, se trasladó a Moab con Noemí y sus
  dos hijos. Murió allí.
razon: Perspicacia «Elimélec»; Rut 1:1-3.
fuentes:
- it-elimelec
- rut-1
enlaces:
- titulo: 'Perspicacia: «Elimélec»'
  url: https://wol.jw.org/es/wol/d/r4/lp-s/1200001310
  tipo: perspicacia
relaciones:
- tipo: pariente
  persona: noemi
  relacion: esposa
  deducido: false
  fuentes:
  - rut-1
  razon: Rut 1:2 da a Noemí como su esposa.
  estado: verificado
- tipo: vivio_en
  lugar: belen
  deducido: false
  fuentes:
  - rut-1
  razon: 'Rut 1:1, 2: la familia era de Belén de Judá, llamada también Efrata.'
  estado: verificado
- tipo: vivio_en
  lugar: moab
  deducido: false
  fuentes:
  - rut-1
  razon: 'Rut 1:1, 2: se fue a residir como extranjero en Moab.'
  estado: verificado
- tipo: murio_en
  lugar: moab
  deducido: false
  fuentes:
  - rut-1
  - it-elimelec
  razon: 'Rut 1:2, 3: murió después de instalarse en Moab.'
  estado: verificado
consultado: '2026-09-29'
estado: verificado
```

**Lugar**:

```yaml
# biblical-earth: un fichero por lugar. Esquema en docs/investigacion/README.md.
id: moab
nombre: Moab
nombres:
- nombre: Moab
- nombre: Campos de Moab
  nota: Lectura literal que da la nota de Rut 1:1; Perspicacia la recoge como otro nombre del territorio.
tipo: pais
lat: 31.180556
lon: 35.701389
precision: zona
coord_fuente: openbible:aa0b1d6
coord_url: https://www.openbible.info/geo/ancient/aa0b1d6/moab-1
coord_nota: Punto representativo de OpenBible para todo el territorio.
resumen: Meseta al este del mar Muerto, entre los torrentes de Zered y Arnón, tierra de los moabitas, que descendían de Moab,
  hijo de Lot.
razon: 'Perspicacia «Moab, moabitas», núm. 1 y 2, párr. 1. Coordenada de OpenBible: solo tomamos el punto.'
fuentes:
- it-moab
- openbible-geo
- rut-1
enlaces:
- titulo: 'Perspicacia: «Moab, moabitas»'
  url: https://wol.jw.org/es/wol/d/r4/lp-s/1200003097
  tipo: perspicacia
consultado: '2026-09-29'
estado: verificado
```

**Evento** con fecha narrativa:

```yaml
# biblical-earth: un fichero por evento. Esquema en docs/investigacion/README.md.
id: elimelec-se-va-a-moab
titulo: Elimélec se va a Moab con su familia
fecha:
  desde: -1472
  hasta: -1300
  precision: rango
  aprox: true
  tipo: narrativa
  cronologia: tnm
  texto: 'entre 1473 y 1301 a.e.c. (tiempo narrativo: en tiempos de los jueces y en vida de Boaz)'
orden_relato:
  serie: rut
  orden: 1001
lugares:
- moab
- belen
personas:
- elimelec
- noemi
- mahlon
- kilion
- orpa
- rut
pasajes:
- Rut 1:1-5
resumen: Por el hambre, Elimélec deja Belén con Noemí y sus hijos. En Moab muere él; sus hijos se casan con Orpá y Rut, dos
  moabitas, y al cabo de unos diez años mueren también.
razon: Rut 1:1 lo pone cuando juzgaban los jueces, tras la entrada en Canaán (1473 a.e.c., estudio 3). Boaz, que vive aún
  en el capítulo 4, es del siglo XIV a.e.c. según Perspicacia «Boaz, I».
fuentes:
- rut-1
- si-3
- it-elimelec
- it-rut-libro
- it-boaz
enlaces:
- titulo: Rut 1 (TNM)
  url: https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/8/1
  tipo: biblia
consultado: '2026-09-29'
estado: verificado
```

**Fuente** nueva, en `data/fuentes/cobertura-<libro>.yaml`. Los capítulos (`rut-1`) no se escriben: los crea `build.py`.

```yaml
it-elimelec:
  titulo: Elimélec
  obra: Perspicacia para comprender las Escrituras
  url: https://wol.jw.org/es/wol/d/r4/lp-s/1200001310
  nivel: 1
  publicado: null
  consultado: '2026-09-29'
```

**Entrada de cobertura** (recortada al primer tramo):

```yaml
# biblical-earth: cobertura de un libro. Formato en data/cobertura/README.md.
libro: rut
capitulos:
  1:
    estado: completo
    revisado: 2026-09-29
    tramos:
    - {v: 1-5, tipo: narracion, entidades: [evento:elimelec-se-va-a-moab, persona:elimelec, persona:noemi, persona:mahlon, persona:kilion, persona:orpa, persona:rut, lugar:belen, lugar:moab, relacion:elimelec/pariente/noemi, relacion:elimelec/vivio_en/belen, relacion:elimelec/vivio_en/moab, relacion:elimelec/murio_en/moab, relacion:noemi/vivio_en/moab, relacion:mahlon/pariente/elimelec, relacion:mahlon/pariente/noemi, relacion:mahlon/pariente/kilion, relacion:mahlon/murio_en/moab, relacion:kilion/pariente/elimelec, relacion:kilion/pariente/noemi, relacion:kilion/pariente/orpa, relacion:kilion/murio_en/moab, relacion:orpa/vivio_en/moab, relacion:rut/nacio_en/moab], menciona: [lugar:juda]}
```

## 11. La propuesta

Cada lector devuelve un JSON por encargo. Con ella, el escritor aplica los cambios sin volver a leer los capítulos.

```json
{
  "formato": "biblical-earth/propuesta-cobertura/1",
  "libro": "rut",
  "capitulos": [1],
  "agente": "rut-1-2",
  "leido": "2026-09-29",
  "cobertura": {
    "1": {"estado": "completo", "revisado": "2026-09-29", "tramos": [
      {"v": "1-5", "tipo": "narracion", "entidades": ["persona:elimelec", "lugar:moab", "lugar:belen",
        "evento:elimelec-se-va-a-moab", "relacion:elimelec/pariente/noemi"]}
    ]}
  },
  "fuentes": {
    "it-elimelec": {"titulo": "Elimélec", "obra": "Perspicacia para comprender las Escrituras",
      "url": "https://wol.jw.org/es/wol/d/r4/lp-s/1200001310", "nivel": 1, "publicado": null,
      "consultado": "2026-09-29"}
  },
  "cambios": [
    {"op": "crear", "tipo": "personas", "id": "elimelec", "datos": {"id": "elimelec", "nombre": "Elimélec", "...": "..."}},
    {"op": "anadir", "tipo": "lugares", "id": "belen", "campo": "fuentes", "valores": ["rut-1"]},
    {"op": "cambiar", "tipo": "lugares", "id": "belen", "campo": "resumen", "antes": "<valor actual exacto>",
      "despues": "<valor nuevo>", "historial": {"fecha": "2026-09-29", "cambio": "Qué se corrigió y por qué.",
      "fuente": "rut-1"}}
  ],
  "preguntas": ["Dudas que tiene que decidir el escritor o el dueño, cada una con su pasaje."]
}
```

| Campo | Qué es |
|---|---|
| `cobertura` | Las entradas de sus capítulos, con la misma forma que en `data/cobertura/<libro>.yaml` y el capítulo como texto. |
| `fuentes` | Las fuentes nuevas, con la misma forma que en `data/fuentes/`. |
| `cambios` | Lista ordenada de operaciones. `tipo` es la carpeta de `data/` (`personas`, `lugares`, `eventos`, `periodos`…). |
| `crear` | `datos` es la ficha completa como objeto. |
| `anadir` | Añade `valores` a la lista `campo` (`fuentes`, `nombres`, `relaciones`, `pasajes`, `personas`, `lugares`) sin repetir lo que ya está. |
| `cambiar` | Pone `despues` en `campo` solo si el valor actual es igual a `antes`. Lleva siempre `historial`, salvo cuando el campo no existía (`antes: null`), como al poner la clave `perspicacia` a una ficha antigua. `campo` puede ser un objeto entero (`fecha`). |
| `preguntas` | Lo que el lector no pudo decidir. No se aplica nada de ahí sin respuesta. |

**Cómo aplica el escritor:**

```bash
python3 scripts/aplicar.py --seco propuestas/*.json        # qué escribiría
python3 scripts/aplicar.py propuestas/*.json               # un solo libro en marcha
python3 scripts/aplicar.py --paralelo propuestas/*.json    # varios libros a la vez
```

1. Las propuestas, en orden de capítulo; dentro de cada una, los cambios en orden.
2. `crear` de un id que ya existe (porque otro lector lo creó antes), o de una persona cuya clave `perspicacia` ya tiene otra ficha: se funde. Las listas se unen, sin repetir; una relación con el mismo `tipo` y la misma persona o lugar junta sus `fuentes`. Si un campo de texto no coincide, se queda el que había y la diferencia va al informe.
3. `anadir` de una relación que ya existe junta sus `fuentes`.
4. `cambiar` cuyo `antes` ya no coincide es un choque: no se aplica, se relee la ficha y va al informe (código de salida 2).
5. Cada ficha que recibe un hecho nuevo o una fuente nueva pone `consultado` al día `leido` de la propuesta.
6. En `data/cobertura/<libro>.yaml` se sustituyen solo los capítulos que traen las propuestas; los demás se quedan. Las fuentes se unen a `data/fuentes/cobertura-<libro>.yaml`; un id que ya existe con otros datos es un error y no se escribe nada.
7. Una ficha que ya existía cambia solo en las líneas de los campos que cambian.
8. Se valida con los datos de `main` más lo suyo, en una copia (como en [`scripts/README.md`](../../scripts/README.md#validar)). Con `--paralelo`, en la copia se aplican también sus operaciones: `python3 scripts/aplicar.py --data "$T/data" data/_propuestas/<libro>.json`, y luego `python3 scripts/validate.py --data "$T/data"` con 0 errores.

## 12. Cerrar un capítulo

Un capítulo pasa a `estado: completo` cuando:

- sus tramos cubren todos sus versículos, salvo los omitidos ([`scripts/cobertura.py`](../../scripts/cobertura.py) `--faltan <libro>` no lo lista);
- cada persona y cada lugar con nombre del capítulo está en `entidades` o en `menciona`, salvo las excepciones de la sección 4;
- cada suceso del relato es un evento o está explicado en una `nota`;
- cada entidad de `entidades` cita el capítulo, y cada persona de `entidades` lleva su clave `perspicacia`;
- cada entidad o relación que cita el capítulo está en uno de sus tramos;
- `ochos.py` da 0 coincidencias;
- `validate.py` da 0 errores.

Si algo queda sin decidir, el capítulo se queda `pendiente` y la duda va a `preguntas`.
