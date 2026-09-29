# Grafo y relaciones: qué proponemos

Propuestas para el grafo, las relaciones, la compilación y el estudio de un capítulo. Todo está medido y anclado sobre `main` en `caa8d3a` (PR 24), con `build.py --salida` fuera de `site/`: 722 personas, 306 lugares, 558 sucesos, 1435 relaciones.

## Las cinco más fuertes

1. **Una tabla de afirmaciones compilada** (propuesta 7).
2. **Vocabulario cerrado de relaciones con inversa y clave con fecha** (1 a 3).
3. **Que el otro lado de un vínculo no diga «viajan juntos»** (4).
4. **El capítulo por tramos desde `data/cobertura`** (9 y 13).
5. **Un solo estado de foco** (10).

## Reglas escritas que el sitio o los datos no cumplen

- **A quién va dirigido.** El sitio no se presenta como ayuda «en familia»: quien estudia puede hacerlo solo. La frase seguía en la página «Acerca de», en decisiones.md, en la hoja de ruta y en el índice de esta carpeta; se quita en un PR aparte. Queda por decidir si A-10 «Modo familia» y el perfil «Una familia» del catálogo se renombran («varias personas ante una pantalla») o se quitan.
- **`consultado` en los hechos anidados.** CLAUDE.md:26 y [investigacion/README.md:16-22](../investigacion/README.md) lo piden en cada hecho, relaciones incluidas, y docs/decisiones.md:32 dice que sin él no se valida. Es falso hoy: ninguna de las 1435 relaciones lo lleva y `validar_hecho` ([validate.py:185-192](../../scripts/validate.py)) no lo pide. Decide el dueño: (a) exigirlo y migrar con una pasada de `aplicar.py` que copie el `consultado` del fichero a cada relación, o (b) relajar la regla y reescribir los tres textos.
- **Cada arista lleva verbo, fecha y referencia.** Está en [pantallas-grafo-y-contexto.md:17](pantallas-grafo-y-contexto.md), no en CLAUDE.md. `aristasSel` ([grafo.js:107](../../site/js/grafo.js)) y `calcularAristas` ([persona.js:73](../../site/js/tipos/persona.js)) la cumplen; grafo.js:167 la rompe con «está aquí ahora» (`fuentes: [], ref: ''`). Añadirla junto a CLAUDE.md:26 y que esa arista tome la referencia de la estancia o no se dibuje (horas).

## Modelo conceptual

Las migraciones de datos de esta sección van en las rondas de be-isk.2, libro por libro, con fuente y razón revisadas; mientras, `validate.py` avisa sin fallar.

### 1. Vocabulario cerrado con inversa y cada par escrito una vez

**Problema.** `relacion` es texto libre: 56 valores, más 17 `relacion_inversa` que validate.py:633-635 solo admite en `acompana` y `se_aparece_a`. `pariente` dice «Y es el R de X» ([investigacion/README.md:82](../investigacion/README.md)) y `acompana`, qué es X para Y (:80); los datos usan las dos: 19 «maestro» (andres.yaml:66) y 2 «discípulo de» (matias.yaml:42, pablo.yaml:117). Seis `pariente` están al revés: artajerjes-i.yaml:34 («hijo de Jerjes I»), jerjes-i.yaml:32, belsasar.yaml:34, ciro.yaml:37, ester.yaml:32 y :41. 37 pares están en las dos fichas ([versiculos.md:120-125](../investigacion/versiculos.md)).

**Propuesta.** `data/relaciones.yaml`, una entrada por palabra: `padre: {tipo: pariente, inversa: hijo, verbo: su padre, ficha: menor}`, con una sola dirección para todos los tipos. La inversa sale del vocabulario; `relacion_inversa` queda para lo que no esté en él. `validate.py` avisa si existen (X, Y, tipo) e (Y, X, tipo) salvo con fechas distintas.

**Coste.** Días. **Cómo sabremos que funciona.** 43 avisos hoy, 0 tras migrar; Jerjes I deja de decir «es su hijo de Jerjes I».

### 2. Arreglo inmediato de los seis y los 37

**Propuesta.** Sin esperar al vocabulario: `validate.py` avisa de un `pariente` cuya `relacion` acaba en «de <Nombre>», y `build.py` deja una sola copia de cada par (X, Y, tipo)/(Y, X, tipo), la de la ficha que manda versiculos.md:120-125.

**Coste.** Horas. **Cómo sabremos que funciona.** El aviso sale en los 6; ninguna ficha muestra un vínculo dos veces.

### 3. La clave de una relación incluye la fecha

**Problema.** `clave_rel` ([aplicar.py:118-119](../../scripts/aplicar.py)) identifica una relación por (tipo, destino). Lucas acompaña a Pablo en tres tramos (lucas.yaml:28, :46, :64); un `anadir` con un tramo nuevo se funde con el primero y pierde fecha y razón sin aviso. Hay 7 claves repetidas, y la cobertura cita `relacion:<persona>/<tipo>/<otro>` ([data/cobertura/README.md:59](../../data/cobertura/README.md)) sin distinguir tramos.

**Propuesta.** `clave_rel = (tipo, destino, relacion, fecha.desde)`; la cobertura admite `@56` y `validate.py` rechaza una clave ambigua.

**Coste.** Horas. **Cómo sabremos que funciona.** Un caso en `test_aplicar.py`: añadir el tramo 56-61 a Lucas deja dos entradas.

### 4. Cerrar el trato de `acompana` en el vocabulario

**Problema.** `verboRelacion` (persona.js:48-52) lee `relacion` y `relacion_inversa`, pero sin inversa y sin «de» final cae en «viajan juntos» (:57 y :34): 35 de las 50 `acompana` con `relacion`, entre ellas los 18 discípulos que escriben «maestro» hacia Jesús. No hay enemigos ni alianzas.

**Propuesta.** Tipos `discipulo_de` (verbo «su maestro», inversa «su discípulo») y `trato` con `relacion` del vocabulario (amigo, enemigo, aliado, señor/siervo, custodio, consejero), con `fecha` opcional. Migración: 21 a `discipulo_de` (19 «maestro», 2 «discípulo de») y 7 a `trato` (amigo 2, señora 2, señor, consejero, custodio).

**Coste.** Días. **Cómo sabremos que funciona.** En el grafo de Jesús ningún discípulo sale como «viajan juntos».

### 5. `cargo` en `sucede_a`, `certeza` en `mismo_que`

**Problema.** `sucede_a` (57) no dice qué cargo pasa, y profeta, juez y apóstol no existen como dato (README.md:88). `mismo_que` manda `estado: pendiente` (versiculos.md:76 y :138), y 7 de 8 lo están.

**Propuesta.** `sucede_a` lleva `cargo` obligatorio y un tipo `ejerce` (persona → lugar, con `cargo` y `fecha`) que `build.py` también deriva de los 61 periodos con `persona`. `mismo_que` lleva `certeza: probable | posible`, va en la ficha cuyo id es primero y el grafo lo muestra como alias.

**Coste.** Días. **Cómo sabremos que funciona.** Eliseo «sucede a Elías como profeta»; Bartolomé y Natanael salen como alias.

### 6. Papel en un suceso y estancias como dato, sin caso aparte de Pablo

**Problema.** Quién nace o muere se lee del título: `sucesoDe` ([trayectorias.js:440](../../site/js/trayectorias.js)) busca «Nace…» o «Muerte…» y README.md:86 lo hace regla. Pablo tiene su propio camino (trayectorias.js:145, :327, :350, :413, :416; lugar.js:30).

**Propuesta.** En eventos, `tipo` opcional (nacimiento, muerte, escritura, discurso) y `roles: {persona: rol}`; sin `tipo`, se lee del título con aviso. Cada parada se compila como afirmación `estuvo_en` (propuesta 7) y `estancias(persona)` es un único filtro.

**Coste.** Semanas, en dos beads: `tipo` y `roles` (días); después quitar el caso Pablo (`ventanaPablo`, `dondeEsta`, `BE.P`). **Cómo sabremos que funciona.** `grep pablo site/js/trayectorias.js` solo devuelve comentarios.

## Pipeline

### 7. Una tabla de afirmaciones compilada, índices en memoria y presupuesto en CI

**Problema.** Cada vista reconstruye las afirmaciones: `hechosDe` ([lugar.js:17](../../site/js/tipos/lugar.js)), `calcularAristas` (persona.js:71), `estancias` (trayectorias.js:349) e `indiceReferencias` ([pasaje.js:66](../../site/js/tipos/pasaje.js)). Ya no coinciden: `implicados` de un lugar (lugar.js:339-346) deja fuera a quien vivió allí y `calcularHechos` (:42-45) lo cuenta. `calcularAristas` recorre todas las personas y sucesos (persona.js:79 y :97) y `red()` (grafo.js:469-470) lo repite por persona. Una réplica en node de esos dos bucles para todas las personas tarda 17 ms, y 162 ms con los datos ×4.

**Propuesta.** `build.py` escribe `hechos`: `{id, p, s, o, rol?, fecha, pasajes, fuentes, estado, deducido, nivel, consultado, origen}`, con inversas del vocabulario. `pasajes` sale de la cobertura, que cita 1684 veces una `relacion:` con sus versículos; con ella cada arista recibe la fecha aproximada de los sucesos de su capítulo, marcada `deducido`. Tras cargar (base.js:607), `BE.idx` con Maps por id y por sel (0,7 ms; 2,2 ms ×4, misma réplica) más el índice de la propuesta 9. `hechosDe`, `aristas`, `estancias` e `implicados` quedan como filtros. La réplica, en `validar.yml` con datos ×4, falla por encima de 20 ms.

**Coste.** Semanas, en beads de días: primero `hechos` en `build.py` leído solo por `lugar.js`; medir; luego ficha, grafo, estancias y SQLite (build.py:367-482). **Cómo sabremos que funciona.** `implicados` y `hechosDe` coinciden por lugar; la prueba de CI falla hoy y pasa con los índices.

### 8. Núcleo al arrancar y detalle a demanda

**Problema.** Se descarga y analiza todo al arrancar ([base.js:127](../../site/js/base.js)): 3,04 MB con sangría (build.py:351), 460 KB en gzip -9.

**Propuesta.** Un `nucleo.json` sin el catálogo de fuentes ni `razon`, `fuentes`, `consultado`, `estado`, `deducido`, `resumen`, `nota`, `candidatos` y `relaciones`: 931 KB compacto, 142 KB en gzip -9 (con `resumen`, que el buscador usa como texto secundario en persona.js:324: 1,22 MB y 251 KB). `hechos` va fuera, en trozos por tipo que la ficha pide como ya hace con los vídeos (pasaje.js:104-118).

**Coste.** Días. **Cómo sabremos que funciona.** Con red limitada el mapa pinta antes de 1 s y abrir una ficha pide un solo fichero.

### 9. Índice por capítulo desde la cobertura

**Problema.** El navegador analiza las citas de toda la razón en JS ([pasaje.js:25-33](../../site/js/tipos/pasaje.js) y :66) con un gemelo en Python ([cobertura.py:217](../../scripts/cobertura.py)); cobertura.py:263-264 pide cambiarlos a la vez y ya divergen (be-isk.5). Los 1449 tramos no llegan al sitio: `para_el_sitio` (cobertura.py:610-614) manda recuentos.

**Propuesta.** Un solo índice por capítulo, el de la cobertura, que es dato revisado: 385 capítulos, 2512 pares (3198 con `menciona`), 66 KB compacto, unos 13 KB en gzip -9. `build.py` lo escribe junto a `site/cobertura/<libro>.json` con los tramos (`{v, tipo, entidades, menciona}`); la propuesta 7 lo consume.

**Coste.** Horas el índice, días los tramos. **Cómo sabremos que funciona.** Génesis 12 muestra sus entidades sin expresiones regulares sobre `razon`.

## Frontal

Hecho en el PR 24: cualquier selección en el centro (grafo.js:5-6, :97-159, :719), el interruptor «Solo lo vigente» (:230), la leyenda y que cada botón abra su nodo (:347-349). Falta: formas por tipo, porque en el tema claro persona y suceso son dos verdes ([tokens.css:65 y :67](../../site/kit/tokens.css), que valen `#4a6f57` y `#1f3b30`, :40 y :43); y una prueba sin cabeza que compare el rótulo de cada botón con la cabecera de su tarjeta.

### 10. Un solo estado de foco

**Problema.** `E` (base.js:103-106) tiene `t`, `vista`, `sel` y `resaltado`, pero tres resaltados no pasan por él: `resaltadoMapa` ([mapa.js:43](../../site/js/mapa.js)), `L.grupo` ([linea.js:29](../../site/js/linea.js), puesto en :1601) y el capítulo de lectura.

**Propuesta.** `E = {t, vista, sel, foco}`: `foco` es el conjunto de afirmaciones que tocan la selección (de `BE.idx`). Mapa, línea, ficha y grafo son cuatro dibujos del mismo conjunto filtrado por `t`.

**Coste.** Semanas: toca mapa.js, linea.js (2018 líneas), grafo.js y la ficha. **Cómo sabremos que funciona.** Para Creta, mapa, línea y grafo resaltan el mismo conjunto.

### 11. Radial sin solapes y tacto

**Problema.** Dos anillos alternos (grafo.js:321-324) y la línea meta en todos los nodos vigentes (:344) se pisan: antes del PR 24 medimos de 4 a 11 pares solapados por vista, con la misma disposición. La tarjeta sale en `pointerover` (:723-725): en táctil el primer toque ya cambia el centro y Mayúsculas+clic (:718) no existe. Esc cierra la vista entera (:781-784).

**Propuesta.** Meta solo en el nodo enfocado y en las aristas fuertes; una pasada que mida cajas y pliegue en «+N». Primer toque o Enter fija la tarjeta con «Poner en el centro» y «¿Cómo se relaciona con X?»; el segundo centra; Esc cierra antes la tarjeta.

**Coste.** Días. **Cómo sabremos que funciona.** Una prueba sin cabeza falla con cualquier solape.

### 12. Conexión honesta y barata

**Problema.** «301 caminos» es el tope de la búsqueda (grafo.js:516), no el número real, y el orden por solidez (:531-533) solo compara esos. `opcionesConexion` (:552) rehace la lista en cada llamada, y el datalist en cada `pintarConexion` (:588); `RED = null` en cada apertura (:639).

**Propuesta.** k caminos más sólidos con los mismos pesos y «más de 300» cuando se corte; opciones una vez por carga; `RED` se conserva.

**Coste.** Días. **Cómo sabremos que funciona.** Abrahán y Pablo no dicen «301 caminos».

## Estudio

### 13. El capítulo por tramos, con el mapa y un grafo pequeño

**Problema.** La lectura lista sucesos y paradas ([lectura.js:36-50](../../site/js/lectura.js)), nada más. En `data/cobertura`, 163 de 385 capítulos no tienen `evento:` en `entidades` y 209 no tienen `lugar:` (154 y 164 contando `menciona`).

**Propuesta.** Con los ficheros de la propuesta 9: una fila por tramo («v. 4-9 · Abrán sale de Harán · Siquem, Betel»). Al abrir un tramo, el mapa numera sus lugares, el cursor va a su fecha y bajo la fila un grafo de 3 a 8 nodos con las personas del tramo y sus relaciones.

**Coste.** Días. **Cómo sabremos que funciona.** Salmos 23 muestra a David y Proverbios 31 a Lemuel; Hechos 16 sale de la cobertura.

### 14. Preguntas desde los datos y notas privadas

**Problema.** Hay 11 preguntas escritas a mano en 4 recorridos y ningún capítulo tiene ninguna. El sitio guarda leídos, marcadores y preferencias (lectura.js:12-17, linea.js:1145-1146, recorridos.js:186-187), pero no notas. El modo reunión ya tiene botón ([site/index.html:92](../../site/index.html)) y sus contrastes son be-68c.3.

**Propuesta.** Tarjeta «Para pensar» al final del tramo, con plantillas sobre hechos verificados y no deducidos; nada se puntúa ni sale del navegador. Un lápiz en cada ficha y tramo, «Mis notas» con exportar e importar a JSON, nunca en el enlace compartido. Letra grande y presentación siguen en el menú Estudio (recorridos.js:225) salvo que el dueño pida otro icono.

**Coste.** Días cada una. **Cómo sabremos que funciona.** Tres preguntas correctas por capítulo con cobertura; una nota sobrevive a recargar.

## Lo que no proponemos y por qué

- **Un fichero de aristas aparte de las fichas**: las relaciones se revisan con su razón en el YAML de la persona.
- **Adyacencias en `build.py`**: se compila la lista y se indexa en el navegador; dos lógicas es lo que ya tenemos.
- **Decidir aquí los índices por tiempo**: los pide be-oan. Creemos, sin haberlo medido, que los 470 ms están en el dibujo; lo decide un perfil del repintado con Abrahán que separe cálculo y DOM.
- **Compactar `data.json` solo**: baja el fichero un 20 % y el gzip -9 un 5 % (de 460 a 437 KB).
- **Todavía no**: grupos como nodos ([modelo-de-datos.md:97](modelo-de-datos.md)), planes de lectura (falta fecha por capítulo en Salmos y Proverbios), sin conexión (tras la 8) y «qué cambió entre dos fechas», que espera a las fechas aproximadas de la 7 (hoy 103 de 1435 relaciones tienen fecha).

## Beads que saldrían de aquí

Tipo y prioridad entre paréntesis; 20 beads en total.

- **Reglas:** A-10 y el perfil «Una familia», renombrar o quitar (task, 3); `consultado` en relaciones, exigir o relajar, decide el dueño (task, 2); «está aquí ahora» con referencia (bug, 3).
- **Modelo:** aviso de relaciones al revés y pares dobles una vez (task, 2); vocabulario cerrado con inversa (feature, 1); clave de relación con fecha (bug, 1); `discipulo_de` y `trato` (feature, 2); `cargo` y `certeza` (feature, 3); papel en sucesos y `estuvo_en`, dos beads (feature, 3).
- **Pipeline:** tabla `hechos` e índices, la primera solo para `lugar.js` (feature, 1); núcleo y detalle a demanda, hija de be-oan (feature, 2); índice por capítulo y cobertura por libro (feature, 2).
- **Frontal:** formas por tipo y prueba de los nodos (task, 3); un solo estado de foco (feature, 2); radial sin solapes y tacto (feature, 3); conexión con k caminos y opciones una vez (feature, 3).
- **Estudio:** capítulo por tramos con grafo pequeño (feature, 2); preguntas y notas privadas, dos beads (feature, 3).
