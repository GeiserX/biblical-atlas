# Homónimos: cerrar los pares, la forma de `distinct_from` y el sitio

Dos personas con el mismo nombre se distinguen con dos campos de su ficha: `disambiguation`, un texto que dice qué la separa de sus homónimos, y `distinct_from`, la lista de ids de los homónimos. Este documento cuenta los pares que todavía no se nombran, propone cómo cerrarlos y cómo evitar que salgan más, y responde si cada entrada de `distinct_from` debe llevar su propia razón y sus fuentes. No cambia nada de `data/`, `site/` ni `scripts/`.

## Elegido

- **Pregunta 1: A, C y E.** Los pares sin marcar se marcan en las dos fichas y una regla de `validate.py` da error si vuelve a salir uno, si `distinct_from` va en una sola dirección o si un par lleva `distinct_from` y `same_as`. De los 77, 76 llevan ya `distinct_from`. El que queda, Juan y Santiago, solo comparte el sobrenombre Boanerges, que Jesús les dio a los dos juntos: no son homónimos y van en `scripts/homonym_exceptions.yaml` con su porqué. Sóstenes y su posible doble se quedan solo con `same_as`. Los lugares siguen como están.
- **Pregunta 2: A.** Una razón por ficha, la de `disambiguation`. Llevar `distinct_from` sin `disambiguation` es error, y las seis fichas que fallaban tienen ya su texto.
- **Pregunta 3:** el sitio no cambia.
- **Para cuando haya más idiomas:** dos nombres que coinciden en español pueden ser distintos en otro idioma, y al revés. Ese día la regla comparará los nombres dentro de cada idioma; la clave del nombre ya sale de una sola función, `clave_nombre`, para que entonces reciba el idioma.

## Cómo se marcan hoy

- **El esquema** ([README de la investigación](../investigacion/README.md#campos-por-tipo)) da a cada persona un solo `disambiguation` y una lista `distinct_from` de ids. Los lugares no tienen `distinct_from`: el aviso va en la `note` del nombre.
- **El protocolo** ([versiculos.md](../investigacion/versiculos.md#4-personas), sección 4) solo mira los homónimos al crear una ficha: «si aparece un homónimo, los dos llevan `disambiguation` y `distinct_from`». Al citar una ficha que ya existe nadie compara.
- **`scripts/validate.py`** comprueba que `distinct_from` es una lista de ids y que cada id existe. No mira si el homónimo nombra de vuelta, ni si falta algún par.
- **Hoy:** 478 personas llevan `distinct_from`, con 964 entradas que forman 482 pares. Todos van en las dos direcciones desde que la PR 88 cerró los 25 que iban en una sola. Además hay 29 pares con `same_as`, la relación que dice que quizá son la misma persona.

## Pregunta 1. Los pares que no se nombran

### Cómo contamos

Dos personas forman un par sin marcar si comparten una entrada exacta de `name` o de `names` y ninguna de las dos nombra a la otra en `distinct_from`. Lo cuenta un script fuera del repositorio que lee `data/people` y `data/places`.

- **Personas: 86 pares**, los mismos que contó la PR 88. Contando solo `name` salen 34, también como en la PR 88. Sin tildes ni mayúsculas salen 87: el par de más es Aná, hijo de Zibeón, y Ana, la profetisa, que no se llaman igual. La regla exacta es la buena.
- **Asimétricos:** 0.
- **Lugares: 146 pares** entre 179 fichas. Como los lugares no tienen `distinct_from`, cuentan todos los que comparten nombre.

### Qué son los 86

- **41 son homónimos que Perspicacia numera aparte** en el mismo artículo. La clave `perspicacia` ya lo prueba: el mismo documento con otro número detrás de `#`. Los tres Uz (`'1200004527#1'`, `#2` y `#3`) se nombran entre sí en `disambiguation` («Uz hijo de Aram; no Uz hijo de Nacor ni el horeo hijo de Disán»), pero ninguno lleva `distinct_from`, así que su ficha no tiene «No confundir con».
- **36 comparten un nombre que una de las dos lleva en `names`**, como otro nombre o como título. Son personas distintas, con artículos o entradas distintas de Perspicacia: Bernabé, que se llamaba José, con los siete José (8 pares, contando a Jesús hijo de Eliezer); la variante José de Jesús hijo de Eliezer con los José (7); Jonás, el padre de Pedro, al que Jn 1:42 llama Juan, con los Juan (4); Zóhar hijo de Simeón, llamado también Zérah, con los Zérah (3); Elihú hijo de Tohu, llamado Eliab, con los Eliab (3); Ocozías de Judá, llamado Jehoacaz, con los dos Jehoacaz (2); Akís, llamado Abimélec en el Salmo 34, con los dos Abimélec de Guerar (2), y un par cada uno: César (Claudio y Nerón), Boanerges (Juan y Santiago), Hosea (el rey y Josué), Hadad (el hijo de Ismael y Hadar), Misael (Mesac y el hijo de Uziel), Simón (Pedro y Simón de Cirene) y Simeí (Samá hijo de Jesé y Simeí hijo de Elá).
- **9 ya llevan `same_as`**, porque Perspicacia ve posible o probable que sean uno: los Eliam, los Ezequías, los Gayo, los Guéber, los Hur, los Natán, Simeí hijo de Elá y el partidario de David, las Timná y Zérah de Bozrá con Zérah hijo de Reuel. Estos no deben llevar `distinct_from`: la ficha diría a la vez «No confundir con» y «¿la misma persona?».
- **Ninguno es la misma persona dos veces.** En ningún par dice jw.org que sean la misma persona.

Quedan **77 pares por marcar, en 83 fichas**. De paso encontramos un par que dice las dos cosas: `sostenes` y `sostenes-companero-de-pablo` llevan `distinct_from` y `same_as` a la vez.

**Lugares.** De los 146 pares, 100 son dos ciudades, y el id las separa por la tribu o la región, como `aczib-de-aser` y `aczib-de-juda`. En 62 una ficha cita el id de la otra. Dos pueden ser el mismo sitio: `bet-rehob` y `rehob` (Perspicacia ve probable que el Rehob de Nú 13:21 sea Bet-Rehob, y las dos tienen el mismo punto) y `atarot-addar` y `atarot-de-los-arkitas` (Perspicacia lo ve posible; están a 1 km). Las dos fichas de cada par ya lo dicen en su texto.

La lista completa está en las [tablas del final](#las-tablas).

### Opciones

**A. Marcar los 77 en una PR de datos.** Un script añade las 154 entradas en las 83 fichas. A mano, como en la PR 88: `disambiguation` donde no cubre al homónimo nuevo (José hijo de Jacob no dice nada de Bernabé), el artículo de Perspicacia en `sources` si falta y `checked_on`. Bernabé, Juan Marcos y Mesac no tienen `disambiguation` y la necesitan. Las dos fichas de Sóstenes pierden `distinct_from`. En muchos de los 41 numerados aparte basta con los ids, porque su texto ya nombra al otro (los Uz, los Hanok, los Hezrón); en los Simón, no. La PR 88 cerró 17 pares antiguos, además de los de las personas nuevas; estos son 77.

**B. Marcarlos libro a libro, cuando la lectura llegue a ellos.** No cuesta nada hoy, pero no pasará solo: el protocolo solo compara al crear una ficha. 1 Crónicas 1 vuelve a nombrar a casi todos los del Génesis (Uz, Dedán, Seba, Jobab, Zérah), y al leerlo se citarán con su id, sin crear ninguna ficha. Los pares de los Evangelios y de Hechos (los José, los Simón, los Juan, las María) son de libros ya leídos.

**C. Una regla de `validate.py` que da error.** Un par de personas que comparten nombre necesita `distinct_from` en las dos direcciones o un `same_as` entre ellas. Son error también `distinct_from` en una sola dirección, que la PR 88 encontró 25 veces, y `distinct_from` con `same_as` en el mismo par. Son unas 30 líneas en `validate.py` y tres casos en `test_validate.py`, cada uno visto fallar. Con 77 errores `main` no pasa, así que la regla entra en la misma PR que A.

**D. La misma regla como aviso** (`AVISO [unmarked_homonym]`), como los 127 avisos de hoy. Entra sola, sin tocar datos, pero 77 avisos más se pierden entre los 127, y la asimetría debería ser error de todos modos.

**Lugares.** **E.** Siguen como hoy, con el aviso en la `note` del nombre y fuera de la regla. **F.** `distinct_from` también para lugares, con la misma regla: 146 pares en 179 fichas y un cambio de esquema.

### Qué recomendamos

**A y C en la misma PR, y E para los lugares.** La regla sin datos no puede entrar, y los datos sin la regla se vuelven a abrir: los 25 pares asimétricos que cerró la PR 88 se crearon con el protocolo ya escrito. Los lugares ya se separan en el mapa por su punto o su zona, y el id dice la tribu o la región. Los dos que quizá son el mismo sitio ya lo dicen en su texto.

## Pregunta 2. Una razón y unas fuentes por cada homónimo

### Cómo es hoy

Un extracto de una ficha real con seis homónimos, [`data/people/azarias-hijo-de-jehohanan.yaml`](../../data/people/azarias-hijo-de-jehohanan.yaml):

```yaml
id: azarias-hijo-de-jehohanan
name: Azarías
perspicacia: 1200000486#15
disambiguation: Azarías hijo de Jehohanán, jefe de Efraín en días de Acaz y Pécah; no el rey Azarías (Uzías) ni los demás
  Azarías de Perspicacia.
distinct_from:
- azarias-hijo-de-natan
- azarias-hijo-de-sadoc
- uzias
- abednego
- ocozias-de-juda
- jaazanias-jefe-militar
sources:
- it-azarias
- 2-cronicas-28
- tnm-a6-b
```

El texto nombra a Uzías y deja a los otros cinco en «los demás». Pero la ficha del sitio no se queda en ese texto. En «No confundir con» pone un botón por cada id, y bajo cada uno el `disambiguation` de ese homónimo: «Azarías hijo de Natán, jefe de los comisarios de Salomón…», «Azarías, compañero de Daniel, al que en Babilonia pusieron el nombre de Abednego…». Lo que separa a dos homónimos se lee en sus dos textos, uno junto al otro. La fuente también está: en 352 de los 482 pares las dos claves `perspicacia` son el mismo artículo con números distintos, y ese artículo va en `sources` de las dos fichas.

### Opciones

**A. Una razón por ficha, como hoy.** Se añade una comprobación: quien lleva `distinct_from` lleva `disambiguation`. Hoy fallan 6 (`juan-marcos`, `lucas`, `adoniram`, `claudio-lisias`, `abi-albon` y `jemuel`). Cuesta una línea en `validate.py` y seis textos.

**B. Cada entrada, un objeto en las dos fichas.**

```yaml
distinct_from:
- person: uzias
  reason: Uzías es el rey de Judá, al que también llaman Azarías; este es un jefe de Efraín en días de Acaz.
  sources: [it-azarias]
  checked_on: '2026-10-01'
  status: verified
```

Cada entrada es un hecho anidado, así que lleva `sources`, `reason`, `checked_on` y `status`, como pide la regla de la casa. La migración toca 478 fichas y 964 entradas. Un script cambia la forma y pone en `sources` el artículo común en los 352 pares que lo comparten. Las 964 razones se escriben a mano: copiar `disambiguation` repetiría el mismo texto en cada entrada. Cada par queda escrito dos veces, y las dos razones pueden contradecirse. Cambian `validar_persona` en `validate.py` (la forma nueva, el límite de 40 palabras, las fuentes), la comprobación de ids de `validate.py` y `build.py`, que pasan a leer `person`, y la sección «No confundir con» de [`site/js/tipos/persona.js`](../../site/js/tipos/persona.js), que enseña la razón del par.

**C. Una relación por par, escrita una sola vez.** `distinct_from` pasa a `relations`, como `same_as`: va en la ficha cuyo id va primero y `build.py` la pone en las dos.

```yaml
relations:
- type: distinct_from
  person: uzias
  inferred: false
  reason: Uzías es el rey de Judá, al que también llaman Azarías; este es un jefe de Efraín en días de Acaz.
  sources: [it-azarias]
  checked_on: '2026-10-01'
  status: verified
```

Son 482 razones en vez de 964, y la asimetría deja de ser posible. `distinct_from` y `same_as` en el mismo par se comprueban en un solo sitio. Cuesta una palabra nueva en [`data/vocabulary.yaml`](../../data/vocabulary.yaml), con `owns: first_id`. Como toda relación lleva `inferred`, y el aviso `no_reference` no debe contarla, porque no cita pasaje. `persona.js` la saca de «Relaciones» y la pone en «No confundir con». Los seis homónimos de este Azarías quedan repartidos: el par con `abednego` va en la ficha de Abednego, porque su id va antes.

### Qué recomendamos

**A.** La pregunta «qué separa a este de cada uno de sus homónimos» ya tiene respuesta en la ficha, con el texto propio de cada homónimo, y la fuente es el artículo de Perspicacia que los numera. B y C piden entre 482 y 964 textos nuevos de hasta 40 palabras, cada uno comprobado contra jw.org, para decir lo que ya dicen dos `disambiguation` juntos. Si se quiere una razón por par, C es mejor que B: la mitad de textos y ningún par escrito dos veces.

## Pregunta 3. Cómo enseña el sitio a los homónimos

El sitio ya usa los dos campos, en [`site/js/tipos/persona.js`](../../site/js/tipos/persona.js):

- **La ficha** enseña `disambiguation` bajo el resumen, con el signo ≠, y una sección «No confundir con» con un botón por cada id de `distinct_from` y el texto de ese homónimo debajo.
- **La búsqueda** da un resultado por persona, con su `disambiguation` debajo del nombre y la etiqueta «3 con este nombre» cuando varias comparten el `name`.
- **«Relacionar con…»** en [`site/js/grafo.js`](../../site/js/grafo.js) añade a los nombres repetidos el principio de su `disambiguation`.

A los 86 pares no les falta código, les faltan datos. Las tres fichas de Uz no tienen «No confundir con» porque ninguna lleva `distinct_from`, y la opción A de la pregunta 1 lo arregla sin tocar el sitio.

**Recomendamos no cambiar el sitio.** Solo si la pregunta 2 sale B o C, «No confundir con» enseña la razón del par en vez del texto del homónimo, y es un cambio de una línea en `persona.js`.

## Las preguntas

1. **Pares sin marcar:** ¿A, B, C, D, o A y C juntas? ¿Y para los lugares, E o F?
2. **Forma de `distinct_from`:** ¿A, B o C?
3. **El sitio:** ¿lo dejamos como está?

## Las tablas

Las genera el script del recuento. En «Lo que ya los separa» va la entrada de Perspicacia de cada uno, según su clave `perspicacia` y el título de su enlace. «Sin clave» quiere decir `perspicacia: null`.

### Personas: 86 pares

| # | Par | Nombre | Lo que ya los separa | Clase |
|---|---|---|---|---|
| 1 | `abimelec-de-tiempos-de-abrahan`, `akis` | Abimélec | «Abimélec» núm. 1; «Akís» | Homónimos; el nombre va en `names` de `akis` |
| 2 | `abimelec-de-tiempos-de-isaac`, `akis` | Abimélec | «Abimélec» núm. 2; «Akís» | Homónimos; el nombre va en `names` de `akis` |
| 3 | `ada-esposa-de-lamec`, `ada-hija-de-elon` | Adá | «Adá» núm. 1; «Adá» núm. 2 | Homónimos, numerados aparte |
| 4 | `aram-hijo-de-quemuel`, `aram-hijo-de-sem` | Aram | «Aram» núm. 2; «Aram» núm. 1 | Homónimos, numerados aparte |
| 5 | `basemat-hija-de-elon`, `basemat-hija-de-ismael` | Basemat | «Basemat» núm. 1; «Basemat» núm. 2 | Homónimos, numerados aparte |
| 6 | `bela-hijo-de-benjamin`, `bela-hijo-de-beor` | Bela | «Bela» núm. 1; «Bela» núm. 2 | Homónimos, numerados aparte |
| 7 | `bernabe`, `jesus-hijo-de-eliezer` | José | «Bernabé»; «Jesús» núm. 2; `bernabe` sin `disambiguation` | Homónimos; el nombre va en `names` de `bernabe`, `jesus-hijo-de-eliezer` |
| 8 | `bernabe`, `jose-de-arimatea` | José | «Bernabé»; «José» núm. 10; `bernabe` sin `disambiguation` | Homónimos; el nombre va en `names` de `bernabe`, `jose-de-arimatea` |
| 9 | `bernabe`, `jose-esposo-de-maria` | José | «Bernabé»; «José» núm. 8; `bernabe` sin `disambiguation` | Homónimos; el nombre va en `names` de `bernabe` |
| 10 | `bernabe`, `jose-hijo-de-jacob` | José | «Bernabé»; «José» núm. 1; `bernabe` sin `disambiguation` | Homónimos; el nombre va en `names` de `bernabe` |
| 11 | `bernabe`, `jose-hijo-de-jonam` | José | «Bernabé»; «José» núm. 4; `bernabe` sin `disambiguation` | Homónimos; el nombre va en `names` de `bernabe` |
| 12 | `bernabe`, `jose-hijo-de-jose` | José | «Bernabé»; «José» núm. 9; `bernabe` sin `disambiguation` | Homónimos; el nombre va en `names` de `bernabe` |
| 13 | `bernabe`, `jose-hijo-de-matatias` | José | «Bernabé»; «José» núm. 7; `bernabe` sin `disambiguation` | Homónimos; el nombre va en `names` de `bernabe` |
| 14 | `bernabe`, `jose-padre-de-igal` | José | «Bernabé»; «José» núm. 2; `bernabe` sin `disambiguation` | Homónimos; el nombre va en `names` de `bernabe` |
| 15 | `claudio`, `neron` | César | «Claudio»; «Nerón» | Homónimos; el nombre va en `names` de `claudio`, `neron` |
| 16 | `dedan-hijo-de-jocsan`, `dedan-hijo-de-raama` | Dedán | «Dedán» núm. 2; «Dedán» núm. 1 | Homónimos, numerados aparte |
| 17 | `eliab-hijo-de-helon`, `elihu-hijo-de-tohu` | Eliab | «Eliab» núm. 1; «Elihú» núm. 2 | Homónimos; el nombre va en `names` de `elihu-hijo-de-tohu` |
| 18 | `eliab-hijo-de-jese`, `elihu-hijo-de-tohu` | Eliab | «Eliab» núm. 4; «Elihú» núm. 2 | Homónimos; el nombre va en `names` de `elihu-hijo-de-tohu` |
| 19 | `eliab-hijo-de-palu`, `elihu-hijo-de-tohu` | Eliab | «Eliab» núm. 2; «Elihú» núm. 2 | Homónimos; el nombre va en `names` de `elihu-hijo-de-tohu` |
| 20 | `eliam-hijo-de-ahitofel`, `eliam-padre-de-bat-seba` | Eliam | «Eliam» núm. 2; «Eliam» núm. 1 | Quizá la misma; ya llevan `same_as` (possible) |
| 21 | `eliezer-hijo-de-jorim`, `eliezer-hijo-de-moises` | Eliezer | «Eliezer» núm. 11; «Eliezer» núm. 2 | Homónimos, numerados aparte |
| 22 | `elon-el-hitita`, `elon-hijo-de-zabulon` | Elón | «Elón» núm. 1; «Elón» núm. 2 | Homónimos, numerados aparte |
| 23 | `ezequias`, `ezequias-antepasado-de-sofonias` | Ezequías | «Ezequías» núm. 1; «Ezequías» núm. 2 | Quizá la misma; ya llevan `same_as` (possible) |
| 24 | `gayo-de-derbe`, `gayo-de-macedonia` | Gayo | «Gayo» núm. 2; «Gayo» núm. 1 | Quizá la misma; ya llevan `same_as` (sin `certainty`) |
| 25 | `gueber`, `gueber-padre-del-comisario-de-ramot-galaad` | Guéber | «Guéber»; sin clave | Quizá la misma; ya llevan `same_as` (probable) |
| 26 | `hadad-hijo-de-bedad`, `hadad-hijo-de-ismael` | Hadad | «Hadad» núm. 2; «Hadad» núm. 1 | Homónimos, numerados aparte |
| 27 | `hadad-hijo-de-ismael`, `hadar` | Hadad | «Hadad» núm. 1; «Hadar» | Homónimos; el nombre va en `names` de `hadar` |
| 28 | `hanok-hijo-de-madian`, `hanok-hijo-de-ruben` | Hanok | «Hanok» núm. 1; «Hanok» núm. 2 | Homónimos, numerados aparte |
| 29 | `hezron-hijo-de-perez`, `hezron-hijo-de-ruben` | Hezrón | «Hezrón» núm. 2; «Hezrón» núm. 1 | Homónimos, numerados aparte |
| 30 | `hosea-de-israel`, `josue-hijo-de-nun` | Hosea | «Hosea» núm. 4; «Josué» núm. 1 | Homónimos; el nombre va en `names` de `josue-hijo-de-nun` |
| 31 | `hur-companero-de-moises`, `hur-hijo-de-caleb` | Hur | «Hur» núm. 2; «Hur» núm. 1 | Quizá la misma; ya llevan `same_as` (probable) |
| 32 | `ido-padre-de-ahinadab`, `ido-padre-de-berekias` | Idó | «Idó» núm. 2; «Idó» núm. 4 | Homónimos, numerados aparte |
| 33 | `jehoacaz-de-israel`, `ocozias-de-juda` | Jehoacaz | «Jehoacaz» núm. 2; «Ocozías» núm. 2 | Homónimos; el nombre va en `names` de `ocozias-de-juda` |
| 34 | `jehoacaz-de-juda`, `ocozias-de-juda` | Jehoacaz | «Jehoacaz» núm. 3; «Ocozías» núm. 2 | Homónimos; el nombre va en `names` de `ocozias-de-juda` |
| 35 | `jesus-hijo-de-eliezer`, `jose-de-arimatea` | José | «Jesús» núm. 2; «José» núm. 10 | Homónimos; el nombre va en `names` de `jesus-hijo-de-eliezer`, `jose-de-arimatea` |
| 36 | `jesus-hijo-de-eliezer`, `jose-esposo-de-maria` | José | «Jesús» núm. 2; «José» núm. 8 | Homónimos; el nombre va en `names` de `jesus-hijo-de-eliezer` |
| 37 | `jesus-hijo-de-eliezer`, `jose-hijo-de-jacob` | José | «Jesús» núm. 2; «José» núm. 1 | Homónimos; el nombre va en `names` de `jesus-hijo-de-eliezer` |
| 38 | `jesus-hijo-de-eliezer`, `jose-hijo-de-jonam` | José | «Jesús» núm. 2; «José» núm. 4 | Homónimos; el nombre va en `names` de `jesus-hijo-de-eliezer` |
| 39 | `jesus-hijo-de-eliezer`, `jose-hijo-de-jose` | José | «Jesús» núm. 2; «José» núm. 9 | Homónimos; el nombre va en `names` de `jesus-hijo-de-eliezer` |
| 40 | `jesus-hijo-de-eliezer`, `jose-hijo-de-matatias` | José | «Jesús» núm. 2; «José» núm. 7 | Homónimos; el nombre va en `names` de `jesus-hijo-de-eliezer` |
| 41 | `jesus-hijo-de-eliezer`, `jose-padre-de-igal` | José | «Jesús» núm. 2; «José» núm. 2 | Homónimos; el nombre va en `names` de `jesus-hijo-de-eliezer` |
| 42 | `jobab-hijo-de-joctan`, `jobab-hijo-de-zerah` | Jobab | «Jobab» núm. 1; «Jobab» núm. 2 | Homónimos, numerados aparte |
| 43 | `jonas-padre-de-pedro`, `juan-apostol` | Juan | «Jonás» núm. 2; «Juan» núm. 3 | Homónimos; el nombre va en `names` de `jonas-padre-de-pedro`, `juan-apostol` |
| 44 | `jonas-padre-de-pedro`, `juan-el-bautista` | Juan | «Jonás» núm. 2; «Juan» núm. 1 | Homónimos; el nombre va en `names` de `jonas-padre-de-pedro`, `juan-el-bautista` |
| 45 | `jonas-padre-de-pedro`, `juan-gobernante-judio` | Juan | «Jonás» núm. 2; «Juan» núm. 5 | Homónimos; el nombre va en `names` de `jonas-padre-de-pedro` |
| 46 | `jonas-padre-de-pedro`, `juan-marcos` | Juan | «Jonás» núm. 2; «Marcos»; `juan-marcos` sin `disambiguation` | Homónimos; el nombre va en `names` de `jonas-padre-de-pedro`, `juan-marcos` |
| 47 | `jose-de-arimatea`, `jose-hijo-de-jonam` | José | «José» núm. 10; «José» núm. 4 | Homónimos, numerados aparte |
| 48 | `jose-de-arimatea`, `jose-hijo-de-matatias` | José | «José» núm. 10; «José» núm. 7 | Homónimos, numerados aparte |
| 49 | `jose-hijo-de-jacob`, `jose-hijo-de-jonam` | José | «José» núm. 1; «José» núm. 4 | Homónimos, numerados aparte |
| 50 | `jose-hijo-de-jacob`, `jose-hijo-de-matatias` | José | «José» núm. 1; «José» núm. 7 | Homónimos, numerados aparte |
| 51 | `jose-hijo-de-jonam`, `jose-hijo-de-jose` | José | «José» núm. 4; «José» núm. 9 | Homónimos, numerados aparte |
| 52 | `jose-hijo-de-jose`, `jose-hijo-de-matatias` | José | «José» núm. 9; «José» núm. 7 | Homónimos, numerados aparte |
| 53 | `juan-apostol`, `santiago-hijo-de-zebedeo` | Boanerges | «Juan» núm. 3; «Santiago» núm. 2 | Homónimos; el nombre va en `names` de `juan-apostol`, `santiago-hijo-de-zebedeo` |
| 54 | `maria-de-betania`, `maria-madre-de-juan-marcos` | María | «María» núm. 2; «María» núm. 5 | Homónimos, numerados aparte |
| 55 | `maria-esposa-de-clopas`, `maria-madre-de-juan-marcos` | María | «María» núm. 4; «María» núm. 5 | Homónimos, numerados aparte |
| 56 | `mesac`, `misael-hijo-de-uziel` | Misael | sin clave; «Misael» núm. 1; `mesac` sin `disambiguation` | Homónimos; el nombre va en `names` de `mesac` |
| 57 | `natan-padre-de-zabud`, `natan-profeta` | Natán | sin clave; «Natán» núm. 2 | Quizá la misma; ya llevan `same_as` (possible) |
| 58 | `pedro`, `simon-de-cirene` | Simón | «Pedro»; «Simón» núm. 7 | Homónimos; el nombre va en `names` de `pedro`, `simon-de-cirene` |
| 59 | `sama-hijo-de-jese`, `simei-hijo-de-ela` | Simeí | «Samah» núm. 2; sin clave | Homónimos; el nombre va en `names` de `sama-hijo-de-jese` |
| 60 | `seba-hijo-de-jocsan`, `seba-hijo-de-joctan` | Seba | «Seba» núm. 3; «Seba» núm. 2 | Homónimos, numerados aparte |
| 61 | `seba-hijo-de-jocsan`, `seba-hijo-de-raama` | Seba | «Seba» núm. 3; «Seba» núm. 1 | Homónimos, numerados aparte |
| 62 | `sela-hijo-de-arpaksad`, `sela-hijo-de-juda` | Selah / Selá | «Selah» núm. 1; «Selah» núm. 2 | Homónimos, numerados aparte |
| 63 | `shaul-de-edom`, `shaul-hijo-de-simeon` | Shaúl | «Shaúl» núm. 1; «Shaúl» núm. 2 | Homónimos, numerados aparte |
| 64 | `simei-hijo-de-ela`, `simei-partidario-de-david` | Simeí | sin clave; «Simeí» núm. 11 | Quizá la misma; ya llevan `same_as` (probable) |
| 65 | `simon-de-cirene`, `simon-el-curtidor` | Simón | «Simón» núm. 7; «Simón» núm. 9 | Homónimos, numerados aparte |
| 66 | `simon-de-cirene`, `simon-el-fariseo` | Simón | «Simón» núm. 7; «Simón» núm. 5 | Homónimos, numerados aparte |
| 67 | `simon-de-cirene`, `simon-el-mago` | Simón | «Simón» núm. 7; «Simón» núm. 8 | Homónimos, numerados aparte |
| 68 | `simon-de-cirene`, `simon-iscariote` | Simón | «Simón» núm. 7; «Simón» núm. 1 | Homónimos, numerados aparte |
| 69 | `simon-el-curtidor`, `simon-el-fariseo` | Simón | «Simón» núm. 9; «Simón» núm. 5 | Homónimos, numerados aparte |
| 70 | `simon-el-curtidor`, `simon-iscariote` | Simón | «Simón» núm. 9; «Simón» núm. 1 | Homónimos, numerados aparte |
| 71 | `simon-el-fariseo`, `simon-el-mago` | Simón | «Simón» núm. 5; «Simón» núm. 8 | Homónimos, numerados aparte |
| 72 | `simon-el-fariseo`, `simon-hijo-de-jose` | Simón | «Simón» núm. 5; «Simón» núm. 4 | Homónimos, numerados aparte |
| 73 | `simon-el-fariseo`, `simon-iscariote` | Simón | «Simón» núm. 5; «Simón» núm. 1 | Homónimos, numerados aparte |
| 74 | `simon-el-mago`, `simon-iscariote` | Simón | «Simón» núm. 8; «Simón» núm. 1 | Homónimos, numerados aparte |
| 75 | `simon-hijo-de-jose`, `simon-iscariote` | Simón | «Simón» núm. 4; «Simón» núm. 1 | Homónimos, numerados aparte |
| 76 | `timna-concubina-de-elifaz`, `timna-hija-de-seir` | Timná | «Timná» núm. 1; «Timná» núm. 2 | Quizá la misma; ya llevan `same_as` (possible) |
| 77 | `uz-hijo-de-aram`, `uz-hijo-de-disan` | Uz | «Uz» núm. 1; «Uz» núm. 3 | Homónimos, numerados aparte |
| 78 | `uz-hijo-de-aram`, `uz-hijo-de-nacor` | Uz | «Uz» núm. 1; «Uz» núm. 2 | Homónimos, numerados aparte |
| 79 | `uz-hijo-de-disan`, `uz-hijo-de-nacor` | Uz | «Uz» núm. 3; «Uz» núm. 2 | Homónimos, numerados aparte |
| 80 | `zerah-de-bozra`, `zerah-hijo-de-juda` | Zérah | «Zérah» núm. 2; «Zérah» núm. 3 | Homónimos, numerados aparte |
| 81 | `zerah-de-bozra`, `zerah-hijo-de-reuel` | Zérah | «Zérah» núm. 2; «Zérah» núm. 1 | Quizá la misma; ya llevan `same_as` (possible) |
| 82 | `zerah-de-bozra`, `zohar-hijo-de-simeon` | Zérah | «Zérah» núm. 2; «Zóhar» núm. 2 | Homónimos; el nombre va en `names` de `zohar-hijo-de-simeon` |
| 83 | `zerah-hijo-de-juda`, `zerah-hijo-de-reuel` | Zérah | «Zérah» núm. 3; «Zérah» núm. 1 | Homónimos, numerados aparte |
| 84 | `zerah-hijo-de-juda`, `zohar-hijo-de-simeon` | Zérah | «Zérah» núm. 3; «Zóhar» núm. 2 | Homónimos; el nombre va en `names` de `zohar-hijo-de-simeon` |
| 85 | `zerah-hijo-de-reuel`, `zohar-hijo-de-simeon` | Zérah | «Zérah» núm. 1; «Zóhar» núm. 2 | Homónimos; el nombre va en `names` de `zohar-hijo-de-simeon` |
| 86 | `zohar-hijo-de-simeon`, `zohar-padre-de-efron` | Zóhar | «Zóhar» núm. 2; «Zóhar» núm. 1 | Homónimos, numerados aparte |

### Lugares: 146 pares

«Cita a la otra» quiere decir que el id de una ficha aparece en el texto de la otra. La distancia sale de los dos puntos, cuando los dos tienen punto.

| # | Par | Nombre | Lo que ya los separa | Clase |
|---|---|---|---|---|
| 1 | `aczib-de-aser`, `aczib-de-juda` | Aczib | dos ciudades; a 157 km | Homónimos |
| 2 | `afec-al-este-del-mar-de-galilea`, `afec-al-norte-de-sidon` | Afec / Afeq | dos ciudades | Homónimos |
| 3 | `afec-al-este-del-mar-de-galilea`, `afec-cerca-de-jezreel` | Afec / Afeq | dos ciudades | Homónimos |
| 4 | `afec-al-este-del-mar-de-galilea`, `afec-de-aser` | Afec | dos ciudades | Homónimos |
| 5 | `afec-al-este-del-mar-de-galilea`, `antipatris` | Afec | dos ciudades | Homónimos (en `names` de `antipatris`) |
| 6 | `afec-al-norte-de-sidon`, `afec-cerca-de-jezreel` | Afec / Afeq | dos ciudades | Homónimos |
| 7 | `afec-al-norte-de-sidon`, `afec-de-aser` | Afec | dos ciudades; a 154 km | Homónimos |
| 8 | `afec-al-norte-de-sidon`, `antipatris` | Afec | dos ciudades; a 236 km | Homónimos (en `names` de `antipatris`) |
| 9 | `afec-cerca-de-jezreel`, `afec-de-aser` | Afec | dos ciudades | Homónimos |
| 10 | `afec-cerca-de-jezreel`, `antipatris` | Afec | dos ciudades | Homónimos (en `names` de `antipatris`) |
| 11 | `afec-de-aser`, `antipatris` | Afec | dos ciudades; a 84 km | Homónimos (en `names` de `antipatris`) |
| 12 | `ain-de-la-frontera-oriental`, `ain-de-simeon` | Ain | región y ciudad | Homónimos |
| 13 | `ain-de-la-frontera-oriental`, `asan` | Ain | región y ciudad | Homónimos (en `names` de `asan`) |
| 14 | `ain-de-simeon`, `asan` | Ain | dos ciudades | Homónimos (en `names` de `asan`) |
| 15 | `aroer`, `aroer-de-gad` | Aroer | dos ciudades; cita a la otra: `aroer-de-gad` | Homónimos |
| 16 | `aroer`, `aroer-de-juda` | Aroer | dos ciudades; a 87 km; cita a la otra: `aroer-de-juda` | Homónimos |
| 17 | `aroer-de-gad`, `aroer-de-juda` | Aroer | dos ciudades | Homónimos |
| 18 | `asna`, `asna-del-sur` | Asnah / Asná | dos ciudades; a 25 km; cita a la otra: `asna-del-sur` | Homónimos |
| 19 | `atarot`, `atarot-addar` | Atarot | dos ciudades; a 54 km; cita a la otra: `atarot-addar` | Homónimos (en `names` de `atarot-addar`) |
| 20 | `atarot`, `atarot-de-los-arkitas` | Atarot | dos ciudades; a 54 km; cita a la otra: `atarot-de-los-arkitas` | Homónimos |
| 21 | `atarot`, `atarot-del-noreste-de-efrain` | Atarot | dos ciudades; cita a la otra: `atarot-del-noreste-de-efrain` | Homónimos |
| 22 | `atarot-addar`, `atarot-de-los-arkitas` | Atarot | dos ciudades; a 1 km | Quizá el mismo: Perspicacia lo ve posible; a 1 km |
| 23 | `atarot-addar`, `atarot-del-noreste-de-efrain` | Atarot | dos ciudades | Homónimos (en `names` de `atarot-addar`) |
| 24 | `atarot-de-los-arkitas`, `atarot-del-noreste-de-efrain` | Atarot | dos ciudades | Homónimos |
| 25 | `ayalon`, `ayalon-de-zabulon` | Ayalón | dos ciudades; cita a la otra: `ayalon-de-zabulon` | Homónimos |
| 26 | `bala`, `quiryat-jearim` | Baalá | dos ciudades; a 76 km | Homónimos (en `names` de `bala`, `quiryat-jearim`) |
| 27 | `bealot`, `bealot-junto-a-aser` | Bealot | ciudad y región; cita a la otra: `bealot`, `bealot-junto-a-aser` | Homónimos |
| 28 | `beer`, `beer-de-jotan` | Beer | región y ciudad; cita a la otra: `beer-de-jotan` | Homónimos |
| 29 | `belen`, `belen-de-zabulon` | Belén | dos ciudades; a 115 km; cita a la otra: `belen-de-zabulon` | Homónimos |
| 30 | `belen`, `jerusalen` | Ciudad de David | dos ciudades; a 8 km | Homónimos (en `names` de `belen`, `jerusalen`) |
| 31 | `bet-aven`, `betel` | Bet-Aven | dos ciudades; a 6 km; cita a la otra: `betel` | Homónimos (en `names` de `betel`) |
| 32 | `bet-dagon`, `bet-dagon-de-aser` | Bet-Dagón | dos ciudades; a 86 km; cita a la otra: `bet-dagon-de-aser` | Homónimos |
| 33 | `bet-horon-alta`, `bet-horon-baja` | Bet-Horón | dos ciudades; a 3 km | Homónimos (en `names` de `bet-horon-alta`, `bet-horon-baja`) |
| 34 | `bet-rehob`, `rehob` | Rehob | reino y ciudad; a 0 km; cita a la otra: `bet-rehob`, `rehob` | Quizá el mismo: Perspicacia ve probable que el Rehob de Nú 13:21 sea Bet-Rehob; mismo punto |
| 35 | `bet-rehob`, `rehob-de-aser` | Rehob | reino y ciudad; a 153 km | Homónimos (en `names` de `bet-rehob`) |
| 36 | `bet-rehob`, `rehob-de-aser-junto-a-aczib` | Rehob | reino y ciudad | Homónimos (en `names` de `bet-rehob`) |
| 37 | `bet-semes`, `bet-semes-de-isacar` | Bet-Semes | dos ciudades; a 118 km; cita a la otra: `bet-semes-de-isacar` | Homónimos |
| 38 | `bet-semes`, `bet-semes-de-neftali` | Bet-Semes | dos ciudades; a 147 km; cita a la otra: `bet-semes-de-neftali` | Homónimos |
| 39 | `bet-semes-de-isacar`, `bet-semes-de-neftali` | Bet-Semes | dos ciudades; a 45 km | Homónimos |
| 40 | `betel`, `betul` | Betel | dos ciudades | Homónimos (en `names` de `betul`) |
| 41 | `betel`, `luz-de-los-hititas` | Luz | dos ciudades; a 173 km | Homónimos (en `names` de `betel`) |
| 42 | `bezec`, `bezec-cerca-de-siquem` | Bézec / Bézeq | dos ciudades; a 68 km; cita a la otra: `bezec-cerca-de-siquem` | Homónimos |
| 43 | `calne`, `calne-de-siria` | Calné | dos ciudades; cita a la otra: `calne-de-siria` | Homónimos |
| 44 | `cana`, `cana-de-aser` | Caná | dos ciudades; a 43 km; cita a la otra: `cana-de-aser` | Homónimos |
| 45 | `cana-de-aser`, `torrente-de-cana` | Qaná | ciudad y río; a 126 km | Homónimos (en `names` de `cana-de-aser`, `torrente-de-cana`) |
| 46 | `carmelo-de-juda`, `monte-carmelo` | Carmelo | ciudad y monte; a 139 km | Homónimos (en `names` de `monte-carmelo`) |
| 47 | `dan`, `territorio-de-dan` | Dan | ciudad y región; cita a la otra: `territorio-de-dan` | Homónimos |
| 48 | `debir`, `debir-de-acor` | Debir | ciudad y región; a 53 km; cita a la otra: `debir-de-acor` | Homónimos |
| 49 | `debir`, `debir-de-gad` | Debir | dos ciudades; a 138 km; cita a la otra: `debir-de-gad` | Homónimos |
| 50 | `debir-de-acor`, `debir-de-gad` | Debir | región y ciudad; a 87 km | Homónimos |
| 51 | `desierto-de-sinai`, `monte-sinai` | Horeb | desierto y monte | Homónimos (en `names` de `desierto-de-sinai`, `monte-sinai`) |
| 52 | `distrito-de-kineret`, `kineret` | Kinéret | región y ciudad; cita a la otra: `distrito-de-kineret` | Homónimos |
| 53 | `distrito-de-kineret`, `mar-de-galilea` | Kinéret | región y lago | Homónimos (en `names` de `mar-de-galilea`) |
| 54 | `ebenezer`, `mizpa-de-benjamin` | Ebenézer | dos ciudades; cita a la otra: `mizpa-de-benjamin` | Homónimos (en `names` de `mizpa-de-benjamin`) |
| 55 | `eden`, `eden-centro-comercial` | Edén | dos regiones; cita a la otra: `eden-centro-comercial` | Homónimos |
| 56 | `edrei`, `edrei-de-neftali` | Edréi | dos ciudades; a 74 km; cita a la otra: `edrei-de-neftali` | Homónimos |
| 57 | `efrain`, `israel` | Efraín | ciudad y país; cita a la otra: `israel` | Homónimos (en `names` de `israel`) |
| 58 | `efrain`, `territorio-de-efrain` | Efraín | ciudad y región; cita a la otra: `territorio-de-efrain` | Homónimos |
| 59 | `en-ganim`, `en-ganim-de-isacar` | En-Ganim | dos ciudades; a 87 km; cita a la otra: `en-ganim-de-isacar` | Homónimos |
| 60 | `filadelfia`, `raba` | Filadelfia | dos ciudades; a 979 km | Homónimos (en `names` de `raba`) |
| 61 | `gat-rimon-de-dan`, `gat-rimon-de-manases` | Gat-Rimón | dos ciudades; a 60 km | Homónimos |
| 62 | `gosen`, `gosen-de-juda` | Gosén | dos regiones; cita a la otra: `gosen-de-juda` | Homónimos |
| 63 | `goyim`, `goyim-en-guilgal` | Goyim | dos reinos; cita a la otra: `goyim-en-guilgal` | Homónimos |
| 64 | `guebal`, `guebal-del-sur` | Guebal | ciudad y región; cita a la otra: `guebal`, `guebal-del-sur` | Homónimos |
| 65 | `guedor-de-juda`, `guedor-de-simeon` | Guedor | dos ciudades | Homónimos |
| 66 | `guelilot`, `guilgal` | Guilgal | región y ciudad; cita a la otra: `guelilot` | Homónimos (en `names` de `guelilot`) |
| 67 | `guelilot`, `guilgal-cerca-de-betel` | Guilgal | región y ciudad | Homónimos (en `names` de `guelilot`) |
| 68 | `guelilot`, `guilgal-de-goyim` | Guilgal | región y ciudad | Homónimos (en `names` de `guelilot`) |
| 69 | `guelilot`, `guilgal-frente-a-guerizim-y-ebal` | Guilgal | región y ciudad | Homónimos (en `names` de `guelilot`) |
| 70 | `guibea-de-benjamin`, `guibea-de-juda` | Guibeah / Guibeá | dos ciudades | Homónimos |
| 71 | `guilgal`, `guilgal-cerca-de-betel` | Guilgal | dos ciudades; a 28 km; cita a la otra: `guilgal`, `guilgal-cerca-de-betel` | Homónimos |
| 72 | `guilgal`, `guilgal-de-goyim` | Guilgal | dos ciudades; cita a la otra: `guilgal-de-goyim` | Homónimos |
| 73 | `guilgal`, `guilgal-frente-a-guerizim-y-ebal` | Guilgal | dos ciudades; cita a la otra: `guilgal-frente-a-guerizim-y-ebal` | Homónimos |
| 74 | `guilgal-cerca-de-betel`, `guilgal-de-goyim` | Guilgal | dos ciudades | Homónimos |
| 75 | `guilgal-cerca-de-betel`, `guilgal-frente-a-guerizim-y-ebal` | Guilgal | dos ciudades | Homónimos |
| 76 | `guilgal-de-goyim`, `guilgal-frente-a-guerizim-y-ebal` | Guilgal | dos ciudades | Homónimos |
| 77 | `hammat`, `hamon` | Hamón | dos ciudades; a 55 km; cita a la otra: `hammat` | Homónimos (en `names` de `hammat`) |
| 78 | `havila`, `havila-cerca-de-sur` | Havilá | dos regiones; cita a la otra: `havila-cerca-de-sur` | Homónimos |
| 79 | `hazor`, `hazor-del-negueb` | Hazor | dos ciudades; a 270 km; cita a la otra: `hazor-del-negueb` | Homónimos |
| 80 | `hazor`, `queriyot-hezron` | Hazor | dos ciudades; a 191 km; cita a la otra: `queriyot-hezron` | Homónimos (en `names` de `queriyot-hezron`) |
| 81 | `hazor-del-negueb`, `queriyot-hezron` | Hazor | dos ciudades; a 83 km | Homónimos (en `names` de `queriyot-hezron`) |
| 82 | `helcat`, `hucoc` | Hucoc | dos ciudades | Homónimos (en `names` de `helcat`) |
| 83 | `israel`, `region-de-samaria` | Samaria | país y región | Homónimos (en `names` de `israel`, `region-de-samaria`) |
| 84 | `israel`, `samaria` | Samaria | país y ciudad; cita a la otra: `israel` | Homónimos (en `names` de `israel`) |
| 85 | `israel`, `territorio-de-efrain` | Efraín | país y región | Homónimos (en `names` de `israel`) |
| 86 | `iye-abarim`, `iyim-de-juda` | Iyim | región y ciudad; a 94 km | Homónimos (en `names` de `iye-abarim`) |
| 87 | `jabneel`, `jabneel-de-neftali` | Jabneel | dos ciudades; a 119 km; cita a la otra: `jabneel-de-neftali` | Homónimos |
| 88 | `janoah-de-efrain`, `janoah-del-norte` | Janóah | dos ciudades; a 115 km | Homónimos |
| 89 | `jarmut`, `remet` | Jarmut | dos ciudades; a 111 km; cita a la otra: `remet` | Homónimos (en `names` de `remet`) |
| 90 | `jerusalen`, `samaria` | Ofel | dos ciudades; a 56 km | Homónimos (en `names` de `jerusalen`, `samaria`) |
| 91 | `jesimon`, `jesimon-de-juda` | Jesimón | dos desiertos; cita a la otra: `jesimon-de-juda` | Homónimos |
| 92 | `jezreel`, `jezreel-de-juda` | Jezreel | dos ciudades; cita a la otra: `jezreel-de-juda` | Homónimos |
| 93 | `jocteel`, `sela-de-edom` | Jocteel / Joqteel | dos ciudades | Homónimos (en `names` de `sela-de-edom`) |
| 94 | `kineret`, `mar-de-galilea` | Kinéret | ciudad y lago; a 7 km; cita a la otra: `mar-de-galilea` | Homónimos (en `names` de `mar-de-galilea`) |
| 95 | `libna`, `libna-del-desierto` | Libná | ciudad y región; cita a la otra: `libna-del-desierto` | Homónimos |
| 96 | `manantial-de-guihon`, `rio-guihon` | Guihón | lago y río | Homónimos (en `names` de `manantial-de-guihon`, `rio-guihon`) |
| 97 | `masa`, `meriba-de-cades` | Meribá | dos regiones | Homónimos (en `names` de `masa`) |
| 98 | `mizpa-de-benjamin`, `mizpa-de-galaad` | Mizpá | dos ciudades | Homónimos |
| 99 | `mizpa-de-benjamin`, `mizpe-de-juda` | Mizpé | dos ciudades | Homónimos (en `names` de `mizpa-de-benjamin`) |
| 100 | `monte-heres`, `paso-de-heres` | Heres | dos montes | Homónimos (en `names` de `monte-heres`, `paso-de-heres`) |
| 101 | `monte-hor`, `monte-hor-del-norte` | Monte Hor | dos montes; cita a la otra: `monte-hor-del-norte` | Homónimos |
| 102 | `monte-seir-de-juda`, `seir` | Monte Seír | monte y región; a 181 km; cita a la otra: `monte-seir-de-juda` | Homónimos (en `names` de `seir`) |
| 103 | `nobah-de-gad`, `quenat` | Nóbah | dos ciudades | Homónimos (en `names` de `quenat`) |
| 104 | `ofra-de-benjamin`, `ofra-de-gedeon` | Ofrá | dos ciudades; a 72 km | Homónimos |
| 105 | `quedes-de-juda`, `quedes-de-neftali` | Quedes | dos ciudades; a 293 km | Homónimos |
| 106 | `quedes-de-juda`, `quision` | Quedes | dos ciudades; a 242 km | Homónimos (en `names` de `quision`) |
| 107 | `quedes-de-neftali`, `quision` | Quedes | dos ciudades; a 52 km | Homónimos (en `names` de `quision`) |
| 108 | `raba`, `raba-de-juda` | Rabá | dos ciudades; a 90 km; cita a la otra: `raba-de-juda` | Homónimos |
| 109 | `rama-de-aser`, `rama-de-benjamin` | Ramá | dos ciudades; a 140 km | Homónimos |
| 110 | `rama-de-aser`, `rama-de-neftali` | Ramá | dos ciudades; a 22 km | Homónimos |
| 111 | `rama-de-aser`, `ramataim-zofim` | Ramá | dos ciudades; a 123 km | Homónimos |
| 112 | `rama-de-aser`, `ramot-galaad` | Ramá | dos ciudades; a 95 km | Homónimos (en `names` de `ramot-galaad`) |
| 113 | `rama-de-benjamin`, `rama-de-neftali` | Ramá | dos ciudades; a 120 km | Homónimos |
| 114 | `rama-de-benjamin`, `ramataim-zofim` | Ramá | dos ciudades; a 28 km | Homónimos |
| 115 | `rama-de-benjamin`, `ramot-galaad` | Ramá | dos ciudades; a 103 km | Homónimos (en `names` de `ramot-galaad`) |
| 116 | `rama-de-neftali`, `ramataim-zofim` | Ramá | dos ciudades; a 106 km | Homónimos |
| 117 | `rama-de-neftali`, `ramot-galaad` | Ramá | dos ciudades; a 74 km | Homónimos (en `names` de `ramot-galaad`) |
| 118 | `ramataim-zofim`, `ramot-galaad` | Ramá | dos ciudades; a 107 km | Homónimos (en `names` de `ramot-galaad`) |
| 119 | `ramot-galaad`, `remet` | Ramot | dos ciudades; a 47 km | Homónimos (en `names` de `ramot-galaad`, `remet`) |
| 120 | `region-de-samaria`, `samaria` | Samaria | región y ciudad; a 0 km; cita a la otra: `region-de-samaria` | Homónimos (en `names` de `region-de-samaria`) |
| 121 | `rehob`, `rehob-de-aser` | Rehob | dos ciudades; a 153 km; cita a la otra: `rehob-de-aser` | Homónimos |
| 122 | `rehob`, `rehob-de-aser-junto-a-aczib` | Rehob | dos ciudades; cita a la otra: `rehob-de-aser-junto-a-aczib` | Homónimos |
| 123 | `rehob-de-aser`, `rehob-de-aser-junto-a-aczib` | Rehob | dos ciudades; cita a la otra: `rehob-de-aser-junto-a-aczib` | Homónimos |
| 124 | `reino-de-saba`, `saba` | Saba / Seba | reino y región; cita a la otra: `reino-de-saba` | Homónimos |
| 125 | `reino-de-saba`, `seba-de-simeon` | Seba | reino y ciudad | Homónimos (en `names` de `reino-de-saba`) |
| 126 | `ribla`, `ribla-de-la-frontera-oriental` | Riblá | dos ciudades; cita a la otra: `ribla-de-la-frontera-oriental` | Homónimos |
| 127 | `rimon-de-simeon`, `rimon-de-zabulon` | Rimón | dos ciudades; a 163 km | Homónimos |
| 128 | `saaraim`, `saruhen` | Saaraim | dos ciudades; a 72 km | Homónimos (en `names` de `saruhen`) |
| 129 | `saba`, `seba-de-simeon` | Seba | región y ciudad | Homónimos (en `names` de `saba`) |
| 130 | `samir-de-efrain`, `samir-de-juda` | Samir | dos ciudades; a 97 km | Homónimos |
| 131 | `sela-de-edom`, `sela-de-la-profecia-contra-moab` | Sela | dos ciudades | Homónimos |
| 132 | `sela-de-edom`, `sela-de-los-amorreos` | Sela | ciudad y región | Homónimos |
| 133 | `sela-de-la-profecia-contra-moab`, `sela-de-los-amorreos` | Sela | ciudad y región | Homónimos |
| 134 | `sitim`, `valle-de-las-acacias` | Sitim | ciudad y valle; cita a la otra: `sitim`, `valle-de-las-acacias` | Homónimos (en `names` de `valle-de-las-acacias`) |
| 135 | `soco`, `soco-cerca-de-arubot` | Socoh / Socó | dos ciudades; a 74 km; cita a la otra: `soco-cerca-de-arubot` | Homónimos |
| 136 | `soco`, `soco-de-la-region-montanosa` | Socoh / Socó | dos ciudades; a 31 km; cita a la otra: `soco-de-la-region-montanosa` | Homónimos |
| 137 | `soco-cerca-de-arubot`, `soco-de-la-region-montanosa` | Socoh / Socó | dos ciudades; a 105 km | Homónimos |
| 138 | `sucot`, `sucot-de-egipto` | Sucot | ciudad y región; cita a la otra: `sucot-de-egipto` | Homónimos |
| 139 | `tapuah-de-efrain`, `tapuah-de-juda` | Tapúah | dos ciudades; a 51 km | Homónimos |
| 140 | `tifsa-cerca-de-tirza`, `tifsa-del-norte` | Tifsah / Tifsá | dos ciudades | Homónimos |
| 141 | `timna-de-dan`, `timna-de-la-region-montanosa` | Timnah / Timná | dos ciudades; a 17 km | Homónimos |
| 142 | `zanoah`, `zanoah-de-la-region-montanosa` | Zanóah | dos ciudades; a 30 km; cita a la otra: `zanoah-de-la-region-montanosa` | Homónimos |
| 143 | `zaretan`, `zereda` | Zeredá | dos ciudades | Homónimos (en `names` de `zaretan`) |
| 144 | `zaretan`, `zerera` | Zeredá | dos ciudades; cita a la otra: `zerera` | Homónimos (en `names` de `zaretan`, `zerera`) |
| 145 | `zereda`, `zerera` | Zeredá | dos ciudades | Homónimos (en `names` de `zerera`) |
| 146 | `zif`, `zif-del-negueb` | Zif | dos ciudades; a 55 km; cita a la otra: `zif-del-negueb` | Homónimos |
