# Modelo de datos

Todo lo que mostramos es un grafo: personas, lugares, sucesos, periodos, obras y hallazgos unidos por relaciones. La interfaz sólo puede responder "¿qué pasaba en Corinto en 51?" si cada relación sabe **cuándo** fue cierta y **quién** lo dice. Este documento explica por qué no basta con el modelo de Theographic y qué modelo queremos.

Revisado el 26 de septiembre de 2026.

## En pocas palabras

- Theographic es un buen índice de nombres y versículos, pero sus relaciones no tienen fecha, sus fechas no tienen fuente y sigue una única cronología (la de Ussher). Sólo 75 de sus 3.067 personas tienen año de nacimiento.
- Queremos que **cada arista tenga su propia fecha y sus propias fuentes**: "Pablo estuvo en Corinto desde el otoño de 50 hasta la primavera de 52 (estudio 3 de *Toda Escritura*)".
- Una fecha es un rango con precisión, cronología y tipo (anclada o narrativa). La cronología TNM es la principal; la secular va al lado cuando difiere.
- Un lugar bíblico no es un punto: es una identidad con uno o varios candidatos de ubicación, cada uno con su estado ("favorecido por nivel 1", "tradición", "descartado").
- Una carta es una obra más un suceso de escritura con dos extremos: lugar de escritura y destinatarios.
- Guardamos un YAML por entidad en git. Un paso de compilación genera JSON para un sitio estático.

---

## 1. Qué hay en Theographic

Examinamos [robertrouse/theographic-bible-metadata](https://github.com/robertrouse/theographic-bible-metadata) en su último commit (`cfb1c48`, 21 de abril de 2026), licencia CC BY-SA 4.0. Lo descargamos fuera del repositorio y leímos los JSON directamente.

### 1.1 Estructura

Los datos vienen de una base de Airtable exportada con un script. Cada registro tiene `id`, `createdTime` y un objeto `fields`. Hay ocho tablas:

| Tabla | Registros | Qué guarda |
|---|---|---|
| `people.json` | 3.067 | Personas con nombre, familia, versículos, años de nacimiento y muerte. |
| `places.json` | 1.274 | Lugares con coordenadas de OpenBible y de Recogito (Pleiades, DARE, GeoNames). |
| `events.json` | 450 | Sucesos con fecha de inicio, duración, predecesor y participantes. |
| `books.json` | 66 | Libros con escritor, lugar y año de escritura. |
| `chapters.json`, `verses.json` | 1.189 y 31.102 | Índice de capítulos y versículos (texto de la KJV). |
| `peopleGroups.json` | 23 | Tribus, pueblos, grupos. |
| `easton.json` | 6.519 | Artículos del diccionario Easton de 1897. |

Las relaciones son listas de identificadores dentro de cada registro (`father`, `children`, `locations`, `participants`). Existe una versión para Neo4j que convierte esas listas en aristas, pero las aristas siguen sin propiedades.

### 1.2 Cómo fecha

- Personas: `birthYear` y `deathYear` como texto con numeración astronómica (`"-1853"` = 1854 a.C.). Igual que nosotros en el formato, pero sólo 75 de 3.067 personas los tienen.
- Sucesos: `startDate` como texto ISO (`"-2347"`, `"0049-10-01"`), `duration` (`"1D"`, `"4Y"`), `predecessor` + `lag` + `lagType` (inicio-inicio o fin-inicio). Es un modelo de diagrama de Gantt: un suceso se fecha respecto de otro.
- `rangeFlag` marca las fechas aproximadas. Sólo 6 de los 450 sucesos lo tienen activado.
- Libros: `yearWritten` es un texto (`"49"`); la documentación dice que el campo está roto y en los datos ya es un número. Los libros de las Escrituras Hebreas no tienen año.
- Cronología: la de Ussher. Creación de Adán en `-4003` (4004 a.C.), Diluvio en `-2347`, Éxodo en `-1490`.

### 1.3 Diez registros de muestra comparados con la TNM

| Registro de Theographic | Lo que dice | Lo que dice el nivel 1 | Problema |
|---|---|---|---|
| Suceso "Creation of Adam and Eve" | `-4003` (4004 a.C.) | 4026 a.e.c. ([estudio 3](https://wol.jw.org/es/wol/d/r4/lp-s/1101990130)) | Otra cronología; ninguna fuente por fecha. |
| Suceso "The Great Flood" | `-2347`, lugar "Ararat" | Las aguas caen en 2370 a.e.c. (estudio 3) | Otra cronología; el lugar del arca se asigna a un suceso de un año entero. |
| Suceso "Exodus from Egypt" | `-1490` | 1513 a.e.c. (estudio 3) | Otra cronología. |
| Suceso "Birth of Jesus" | `-3` (4 a.C.) | 2 a.e.c. (estudio 3) | Otra cronología. |
| Suceso "Crucifixion and Burial" | `0030-04-04`, lugar "Golgotha" | 14 de nisán de 33 e.c. (estudio 3) | Precisión de día sobre un año que no compartimos. |
| Suceso "Paul Writes Galatians" | `0049-10-01`, duración `1D` | c. 50-52 e.c., Corinto o Antioquía de Siria ([Tabla de los libros](https://wol.jw.org/es/wol/d/r4/lp-s/1001070071)) | Precisión falsa: un día exacto para algo que la fuente da como rango de tres años. |
| Libro "Romans" | `placeWritten`: "Greece" | Corinto, c. 56 (Tabla de los libros) | Una región en lugar de la ciudad. |
| Suceso "Paul's Journey to Rome" | `0056`, `4Y`; lugares: Alexandria, Cilicia, Pamphylia, Lycia, Asia, Italy… | Sale c. 58, llega c. 59 (estudio 3) | Mezcla lugares mencionados con lugares visitados: Pablo no pasó por Alejandría; el barco venía de allí (Hch 27:6). |
| Persona `daniel_975` | `status: wip`, `ambiguous: true`, sin fechas | Llevado a Babilonia en 617; activo hasta al menos 536 a.e.c. ([Perspicacia, "Daniel"](https://wol.jw.org/es/wol/d/r4/lp-s/1200001117)) | Un profeta central sin ningún dato temporal. |
| Persona `zerubbabel_3054` | `alsoCalled: "Sheshbazzar,Zorobabel"` | Perspicacia cree "más probable" que Sesbazar sea Zorobabel y expone la opinión contraria ([Perspicacia, "Sesbazar"](https://wol.jw.org/es/wol/d/r4/lp-s/1200004025)) | Una identidad discutida se guarda como un simple alias, sin estado ni fuente. |
| Lugar `sinai_1098` | Un punto (29.5, 34), `recogitoStatus: VERIFIED` | Ubicación no segura; Jebel Musa (tradición) o Ras Safsafa ([Perspicacia, "Sinaí"](https://wol.jw.org/es/wol/d/r4/lp-s/1200004135)) | "Verificado" significa "enlazado a Pleiades", no "ubicación segura". |
| Lugar `eden_354` | Sin coordenadas, `precision: Unlocated` | Zona montañosa al sur del lago Van, conjetural ([Perspicacia, "Edén"](https://wol.jw.org/es/wol/d/r4/lp-s/1200001256)) | Honesto, pero la interfaz no puede mostrar nada. |

Y un hueco de cobertura: entre 584 y 519 a.C. sólo hay sucesos del tipo "Prophecies of X". No existen la destrucción de Jerusalén, la caída de Babilonia, el decreto de Ciro, el regreso de los exiliados, Ester, Esdras ni los muros de Nehemías. Justo el periodo de la pregunta "¿quién había en Israel en tiempos de los medos y persas?".

El fichero `geo/pauls_journeys_all.geojson` también tiene errores de etiqueta: Seleucia lleva `"Place ID": "Acts.20.13"` (ese versículo habla de Asón) y Salamina lleva `"Acts.21.1"`.

### 1.4 Límites del modelo, no sólo de los datos

1. **Las relaciones no tienen fecha.** `hasBeenHere` en un lugar es una lista de texto con identificadores de personas: "Pablo estuvo en Corinto", sin cuándo. No se puede preguntar "¿quién estaba en Corinto en 51?".
2. **Las fechas no tienen fuente.** No sabemos de dónde sale `0049-10-01`. No se puede mostrar la cronología TNM junto a la secular.
3. **Una sola cronología.** No hay sitio para "607 según la TNM, 587/586 según la historia secular".
4. **Precisión falsa.** Formatos ISO con mes y día para sucesos que sólo tienen año aproximado.
5. **Un lugar es un punto.** El campo `precision` es texto libre ("Rough", "Related-Surrounding") y la mayoría de registros no lo tienen (732 de 1.274). No hay candidatos alternativos.
6. **Mención y presencia mezcladas.** Los lugares de un suceso incluyen los nombrados en los versículos, aunque nadie estuviera allí.
7. **Identidad plana.** Los homónimos se distinguen con un número (`simon_2747`) y 1.613 personas siguen marcadas como ambiguas. Las identidades discutidas son alias.
8. **Fuentes secundarias fijas.** La única explicación textual es el diccionario Easton de 1897.

Lo que sí aprovechamos: la lista de nombres y versículos, las claves hacia Pleiades, DARE y GeoNames, y la idea de fechar un suceso respecto de otro (`predecessor` + `lag`), que nos sirve para el tiempo narrativo. Todo lo que importemos entra con `estado: sin_verificar` y con su identificador de Theographic como clave externa.

---

## 2. Nuestro modelo

### 2.1 Principios

1. **Cada afirmación es un registro con fecha y fuentes.** Un nodo tiene atributos estables (nombre, tipo). Todo lo que cambia con el tiempo o puede discutirse es una afirmación.
2. **Las aristas son ciudadanas de primera.** Una arista tiene tipo, origen, destino, fecha, fuentes, estado y, si hace falta, rol.
3. **Nivel 1 manda; nivel 2 acompaña.** El nivel 2 nunca borra ni corrige una afirmación de nivel 1. Se muestran en bloques separados.
4. **Ninguna fecha más precisa que su fuente.**
5. **La incertidumbre es un dato**, no un comentario: candidatos con estado, rangos, fechas narrativas, identidades probables.

### 2.2 Tipos de nodo

| Tipo | Ejemplos | Atributos propios |
|---|---|---|
| `persona` | Pablo, Ester, Artajerjes I | nombres, sexo, desambiguación, claves externas |
| `grupo` | congregación de Tesalónica, partos, los doce | tipo de grupo, lugar base (arista) |
| `lugar` | Corinto, Edén, mar Rojo | tipo (ciudad, región, isla, monte, agua, ruta), nombres por época, candidatos de ubicación |
| `evento` | caída de Babilonia, escritura de Gálatas | tipo, referencias bíblicas |
| `periodo` | reinado de Artajerjes I, Imperio medopersa, primer viaje de Pablo | tipo (reinado, imperio, viaje, estancia), subperiodos |
| `obra` | Gálatas, 1 Pedro | libro, escritor (arista) |
| `hallazgo` | inscripción de Galión, cilindro de Ciro | museo, inventario, imagen con licencia |
| `fuente` | Perspicacia "Pablo", Tabla de los libros | título, obra, URL, nivel |

### 2.3 Tipos de arista

Todas llevan `fecha`, `fuentes` y `estado`.

| Arista | De → a | Ejemplo |
|---|---|---|
| `estuvo_en` | persona → lugar | Pablo → Corinto, otoño de 50 a primavera de 52 |
| `vivio_en` | persona → lugar | Pedro → Capernaúm |
| `nacio_en`, `murio_en` | persona → lugar | Pablo → Tarso |
| `participo_en` | persona/grupo → evento, con `rol` | Pedro → Pentecostés, rol "portavoz" |
| `ocurrio_en` | evento → lugar | caída de Babilonia → Babilonia |
| `gobierna` | persona → lugar/grupo, con `cargo` | Galión → Acaya, "procónsul", verano de 51 a verano de 52 |
| `forma_parte_de` | lugar → lugar | Iconio → provincia de Galacia (en el siglo I) |
| `pariente` | persona → persona, con `relacion` | Ester → Mardoqueo, "prima" |
| `acompana_a` | persona → persona/periodo | Silas → segundo viaje |
| `escribe` | persona → obra | Pablo → Gálatas |
| `escrita_en` | obra → lugar (candidatos) | Gálatas → Corinto (preferido), Antioquía de Siria (alternativo) |
| `dirigida_a` | obra → grupo/persona | Gálatas → congregaciones de Galacia |
| `lleva` | persona → obra | Tíquico → Efesios |
| `procede_de` | grupo → lugar, dentro de un evento | partos, medos, elamitas → Pentecostés de 33 |
| `sucede_a` | persona → persona, con `cargo` | Festo → Félix |
| `mismo_que` | persona → persona / lugar → lugar | Sesbazar → Zorobabel, "probable" |
| `menciona` | pasaje → entidad | Hch 27:6 → Alejandría (mención, no presencia) |

`contemporaneo_de` no se guarda: se calcula al consultar.

### 2.4 Fechas

```yaml
fecha:
  desde: 50          # año astronómico: 1 a.e.c. = 0, 2 a.e.c. = -1
  hasta: 52          # null = abierto o desconocido
  precision: rango   # dia | mes | estacion | año | rango
  aprox: true        # la fuente dice "c.", "probablemente"
  tipo: anclada      # anclada | narrativa | derivada
  cronologia: tnm    # tnm | secular
  texto: "c. 50-52 e.c."
  detalle:           # opcional, cuando la fuente es más fina
    desde: {año: 50, estacion: otoño}
    hasta: {año: 52, estacion: primavera}
  relativa:          # opcional: fecha calculada a partir de otra
    despues_de: evento/llegada-a-corinto
    intervalo: 18 meses
alternativas:
  - fecha: {desde: -586, hasta: -585, precision: rango, cronologia: secular, texto: "587/586 a.e.c."}
    fuentes: [wp-asedio-587]
```

- **Anclada**: la fuente da la fecha de ese suceso.
- **Narrativa**: sabemos el orden y el tramo que lo contiene, no el año. La interfaz dibuja el suceso dentro del tramo con trama rayada y la etiqueta "tiempo narrativo".
- **Derivada**: la calculamos nosotros a partir de datos de la fuente (Ester elegida reina en el año 7.º de Asuero; primer año reinante en 495 → 489 a.e.c.). Siempre lleva `nota` con el cálculo y `estado: derivado`.
- El año se guarda con numeración astronómica. Así `hasta − desde` es siempre la duración real. Ver [`mockups/data/README.md`](mockups/data/README.md).

### 2.5 Lugares con identificación incierta

Separamos el lugar bíblico (una identidad) de sus ubicaciones posibles (candidatos). La interfaz dibuja todos los candidatos con un peso visual según su estado.

```yaml
id: lugar/monte-sinai
tipo: monte
nombres:
  - {nombre: Sinaí, fuentes: [tnm]}
  - {nombre: Horeb, fuentes: [tnm]}
candidatos:
  - nombre: Ras Safsafa
    geometria: {tipo: punto, lat: 28.555556, lon: 33.967222}
    estado: favorecido_nivel_1        # "muchos eruditos" citados por Perspicacia
    fuentes: [it-sinai, openbible-modern-m5e6c65]
  - nombre: Jebel Musa
    geometria: {tipo: punto, lat: 28.539722, lon: 33.973333}
    estado: tradicion
    fuentes: [it-sinai]
  - nombre: Har Karkom
    geometria: {tipo: punto, lat: 30.283333, lon: 34.75}
    estado: solo_nivel_2
    fuentes: [openbible-mount-sinai]
```

Estados posibles, de más a menos peso visual: `seguro`, `favorecido_nivel_1`, `tradicion`, `alternativa`, `solo_nivel_2`, `descartado_nivel_1`. No usamos porcentajes: la fuente no los da, y un número daría una precisión que no existe. Las puntuaciones de OpenBible se guardan aparte (`puntuacion_openbible`) como dato de nivel 2.

Geometrías: `punto`, `zona` (centro + radio), `poligono`, `linea` (ríos, calzadas), `franja` (un cruce entre dos orillas). El Edén es una `zona`; el cruce del mar Rojo, una `franja` entre Jabal Ataqah y Uyun Musa.

Nombres y pertenencia cambian con el tiempo. Afec y Antípatris son el mismo sitio (Tell Ras el Ain) con nombres de épocas distintas:

```yaml
id: lugar/afec-antipatris
nombres:
  - {nombre: Afec, fecha: null, estado: sin_verificar, fuentes: [openbible-aphek-2]}
  - {nombre: Antípatris, fecha: null, estado: sin_verificar, fuentes: [openbible-aphek-2]}
# Falta verificar desde cuándo se usa cada nombre. Mientras tanto la interfaz
# muestra el nombre que usa el pasaje consultado (Hch 23:31 → Antípatris).
```

### 2.6 Fuentes por niveles en cada afirmación

```yaml
fuentes:
  - id: it-pablo          # registro en data/fuentes/
    ref: "Hch 18:1-17"    # opcional: pasaje en que se apoya
    parrafo: "Segundo viaje misional"   # opcional: dónde mirar en la fuente
estado: verificado        # verificado | derivado | sin_verificar | en_disputa
```

El registro de fuente vive una vez:

```yaml
id: it-pablo
titulo: Pablo
obra: Perspicacia para comprender las Escrituras
url: https://wol.jw.org/es/wol/d/r4/lp-s/1200003406
nivel: 1
revisado: 2026-09-26
```

Nunca guardamos texto de la fuente. Guardamos la URL, el pasaje y un resumen propio.

### 2.7 Identidad y homónimos

- **Identificador estable y legible**: `persona/zacarias-profeta`, `persona/zacarias-padre-de-juan`. El sufijo lo elegimos por el rasgo con el que la TNM o Perspicacia los distinguen.
- **`desambiguacion`**: una frase para el buscador ("Profeta del regreso del exilio, 520-518 a.e.c.").
- **`no_confundir_con`**: lista de identificadores. La búsqueda de "Zacarías" muestra todos, cada uno con su frase y su época en la línea de tiempo.
- **`mismo_que`** es una arista con estado: `seguro`, `probable`, `discutido`. Así, Sesbazar y Zorobabel aparecen unidos con una línea discontinua y la nota de Perspicacia.
- **Claves externas** para enlazar sin copiar: `openbible`, `theographic`, `stepbible` (TIPNR distingue individuos con el mismo nombre), `pleiades`, `wikidata`.

### 2.8 Cartas: una obra y un suceso con dos extremos

Una carta es una `obra`. Escribirla es un `evento` con dos extremos: dónde estaba el escritor y a quién iba. La interfaz dibuja un arco desde el lugar de escritura hasta el destino en la fecha del suceso, y al pulsar el arco abre los dos contextos: qué pasaba en la ciudad de origen y qué pasaba en la de destino en esa fecha.

```yaml
id: evento/escritura-de-galatas
tipo: escritura
obra: obra/galatas
escritor: persona/pablo
fecha: {desde: 50, hasta: 52, precision: rango, aprox: true, tipo: anclada, cronologia: tnm, texto: "c. 50-52 e.c."}
origen:
  - {lugar: lugar/corinto, estado: favorecido_nivel_1, fuentes: [tnm-tabla, it-galatas]}
  - {lugar: lugar/antioquia-de-siria, estado: alternativa, fuentes: [tnm-tabla]}
destino:
  - {grupo: grupo/congregaciones-de-galacia, fuentes: [it-galatas]}
referencias: ["Gál 1:1, 2"]
estado: verificado
```

El grupo destinatario tiene su propio lugar: `grupo/congregaciones-de-galacia` → `forma_parte_de` → `lugar/provincia-de-galacia`, que contiene Iconio, Listra, Derbe y Antioquía de Pisidia en el siglo I. Si una carta va a una persona (Filemón, Timoteo, Tito), el destino es la persona y su `estuvo_en` en esa fecha da el lugar. Si la fuente no dice dónde estaba (2 Timoteo), no hay arco: la carta aparece con la etiqueta "destino no indicado".

### 2.9 Viajes

Un viaje es un `periodo` de tipo `viaje` con una lista ordenada de aristas `estuvo_en`. Cada parada tiene su referencia y su fecha; las que no tienen fecha propia heredan el tramo del viaje con `tipo: narrativa`. La ruta entre dos paradas es un `lugar` de tipo `ruta` con geometría de línea: por calzada (Itiner-e) o por mar, con su propia certeza.

### 2.10 Hallazgos

```yaml
id: hallazgo/inscripcion-de-galion
tipo: inscripcion
lugar_hallazgo: lugar/delfos
fecha_objeto: {desde: 52, hasta: 52, precision: año, aprox: false, cronologia: secular, texto: "52 e.c.", fuentes: [wp-inscripcion-de-delfos]}
relaciona:
  - {arista: gobierna, persona: persona/galion, lugar: lugar/acaya, fecha: {desde: 51, hasta: 52, precision: rango, texto: "verano de 51 a verano de 52"}}
fuentes: [si-3, wp-inscripcion-de-delfos]   # https://en.wikipedia.org/wiki/Delphi_Inscription (nivel 2)
imagen:
  archivo: https://commons.wikimedia.org/wiki/File:Delphes_Gallion.jpg
  licencia: CC BY-SA 4.0
  autor: "Gérard (Wikimedia Commons)"
estado: verificado
```

El estudio 3 usa esta inscripción para fechar la estancia de Pablo en Corinto (otoño de 50 a primavera de 52). Es el tipo de enlace que queremos: un objeto real de museo que sostiene una fecha del relato.

---

## 3. Ejemplos completos en YAML

### 3.1 Persona

```yaml
# data/personas/pablo.yaml
id: persona/pablo
nombres:
  - {nombre: Pablo, fuentes: [it-pablo]}
  - {nombre: Saulo, fuentes: [it-pablo]}
desambiguacion: "Apóstol a las naciones, de Tarso; escribió 14 cartas."
claves: {theographic: paul_2479, openbible: null, stepbible: null}
aristas:
  - {tipo: nacio_en, lugar: lugar/tarso, fecha: null, fuentes: [it-pablo], estado: verificado}
  - {tipo: estuvo_en, lugar: lugar/corinto,
     fecha: {desde: 50, hasta: 52, precision: rango, aprox: true, tipo: anclada, cronologia: tnm,
             texto: "otoño de 50 a primavera de 52"},
     fuentes: [{id: si-3, parrafo: 24}, {id: si-3, parrafo: 25}], estado: verificado}
  - {tipo: estuvo_en, lugar: lugar/efeso,
     fecha: {desde: 52, hasta: 55, precision: rango, aprox: true, tipo: anclada, cronologia: tnm,
             texto: "invierno de 52-53 a 55"},
     fuentes: [{id: si-3, parrafo: 26}], estado: verificado}
  - {tipo: estuvo_en, lugar: lugar/roma,
     fecha: {desde: 59, hasta: 61, precision: rango, aprox: true, tipo: anclada, cronologia: tnm, texto: "c. 59-61"},
     fuentes: [it-pablo, si-3], estado: verificado}
```

### 3.2 Lugar incierto

```yaml
# data/lugares/eden.yaml
id: lugar/eden
tipo: region
nombres: [{nombre: Edén, fuentes: [it-eden]}]
nota_nivel_1: "Ubicación conjetural; desapareció con el Diluvio."
candidatos:
  - nombre: Tierras altas al sur del lago Van
    geometria: {tipo: zona, lat: 38.27, lon: 42.46, radio_km: 150, calculada: true}
    estado: favorecido_nivel_1
    fuentes: [it-eden]
    nota: "Centro calculado por nosotros: 225 km al suroeste del monte Ararat."
  - nombre: Baja Mesopotamia, cabecera del golfo Pérsico
    geometria: {tipo: zona, lat: 30.96, lon: 46.10, radio_km: 200}
    estado: alternativa
    fuentes: [it-eden, openbible-eden-1]
vigencia: {desde: null, hasta: null, nota: "Existe en el mapa sólo antes del Diluvio (2370 a.e.c.)."}
```

### 3.3 Periodo con dos cronologías

```yaml
# data/periodos/artajerjes-i.yaml
id: periodo/reinado-de-artajerjes-i
tipo: reinado
persona: persona/artajerjes-i
nombre_en_la_biblia: Artajerjes (Esd 7; Ne 2; 13:6)
fecha: {desde: -474, hasta: -423, precision: rango, aprox: false, tipo: anclada, cronologia: tnm,
        texto: "ascenso en 475; año 51.º en 424 a.e.c."}
alternativas:
  - fecha: {desde: -464, hasta: -423, precision: rango, cronologia: secular, texto: "ascenso en 465 a.e.c."}
    fuentes: [it-persia]
    nota: "Perspicacia expone esta fecha y las razones para preferir 475."
hitos:
  - {año_de_reinado: 7, suceso: evento/regreso-de-esdras, fecha: {desde: -467, hasta: -467, texto: "468 a.e.c."}}
  - {año_de_reinado: 20, suceso: evento/muros-de-nehemias, fecha: {desde: -454, hasta: -454, texto: "455 a.e.c."}}
  - {año_de_reinado: 32, suceso: evento/nehemias-vuelve-a-la-corte, fecha: {desde: -442, hasta: -442, texto: "443 a.e.c."}}
fuentes: [it-artajerjes, it-persia, si-3]
estado: verificado
```

### 3.4 Evento con procedencias

```yaml
# data/eventos/pentecostes-33.yaml
id: evento/pentecostes-33
fecha: {desde: 33, hasta: 33, precision: dia, aprox: false, tipo: anclada, cronologia: tnm, texto: "6 de siván de 33 e.c."}
ocurrio_en: lugar/jerusalen
referencias: ["Hch 2:1-41"]
participantes:
  - {persona: persona/pedro, rol: portavoz}
procedencias:     # aristas procede_de
  - {grupo: grupo/partos}
  - {grupo: grupo/medos, lugar: lugar/media}
  - {grupo: grupo/elamitas, lugar: lugar/elam}
  - {grupo: grupo/habitantes-de-mesopotamia, lugar: lugar/mesopotamia}
fuentes: [si-3, hch-2]
estado: verificado
```

---

## 4. Cómo se consulta

El sitio es estático: todo se resuelve en el navegador sobre JSON compilado. Las consultas son filtros sobre intervalos y recorridos cortos del grafo.

**Solape de intervalos.** Dos fechas se solapan si `a.desde <= b.hasta` y `b.desde <= a.hasta`. Un `null` en `hasta` cuenta como "abierto": se solapa con todo lo posterior, pero la interfaz lo dibuja con el borde difuminado.

### 4.1 "¿Qué pasaba en X en el año Y?"

1. Tomar el lugar X y los lugares que lo contienen en el año Y (`forma_parte_de` con fecha que incluye Y): Corinto → Acaya → Imperio romano.
2. Recoger las aristas cuya fecha incluye Y y que tocan esos lugares: `estuvo_en`, `ocurrio_en`, `gobierna`, `escrita_en`, `dirigida_a`.
3. Separar por nivel: nivel 1 arriba, nivel 2 debajo.
4. Ordenar por precisión (primero lo anclado, luego lo narrativo) y por cercanía en el grafo.

Ejemplo, Corinto en 51: Pablo está allí (anclado, estudio 3); escribe 2 Tesalonicenses (anclado, Tabla de los libros); Galión es procónsul de Acaya (anclado, estudio 3); los judíos llevan a Pablo ante Galión (Hch 18:12-17, dentro de la estancia).

### 4.2 "¿Quién vivía a la vez que Z?"

La vida de una persona es el intervalo de `nacio_en`/`murio_en` si existe; si no, el mínimo y el máximo de sus aristas con fecha. Buscar personas cuyo intervalo se solapa con el de Z y ordenarlas por solape y por distancia en el grafo. Las personas sin ninguna arista fechada no aparecen, y la interfaz lo dice con un contador ("N personas sin fecha no se muestran").

Ejemplo, Nehemías (456-443 a.e.c.): Artajerjes I; Esdras, que está con él en la lectura de la Ley (Ne 8), en 455; Malaquías, que escribe después de 443 (solape abierto). Ester y Mardoqueo quedan fuera: su periodo termina c. 475.

### 4.3 "¿Dónde estaba Pablo en el año Y?"

Las aristas `estuvo_en` de Pablo cuya fecha incluye Y, en el orden del viaje. En 50 salen ancladas Troas (primavera) y Corinto (desde el otoño). Las paradas sin fecha propia del segundo viaje salen como narrativas dentro de 49-52, en su orden: Filipos, Tesalónica, Berea y Atenas quedan entre Troas y Corinto.

### 4.4 Búsqueda por pasaje y por año

- "Hch 16" → las aristas cuyo `referencias` cae en ese capítulo → encuadre del mapa y del tiempo sobre esas entidades.
- "607 a.e.c." → cursor en −606. "587" → cursor en −586 y aviso: "la TNM fecha este suceso en 607 a.e.c.".

### 4.5 Compilación

- Entrada: `data/**/*.yaml` y `data/fuentes/*.yaml`.
- Validación: toda arista con `fecha` y `fuentes`; toda fuente existe; `desde <= hasta`; coordenadas en rango; ninguna URL rota. La validación tiene un caso de control que debe fallar.
- Salida: `grafo.json` (nodos y aristas), un índice por siglos para el cursor de tiempo y un índice por capítulos para la búsqueda.
