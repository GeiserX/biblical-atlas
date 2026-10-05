# Desarrollo

Cómo compilar, validar y proponer un cambio. Las reglas de la casa, completas, están en [CONTRIBUTING.md](https://github.com/GeiserX/biblical-atlas/blob/main/CONTRIBUTING.md); aquí va lo que se ejecuta.

## Compilar y comprobar

Python 3.12 o más nuevo y PyYAML:

```bash
pip install -r requirements.txt
python3 scripts/build.py          # data/ -> site/data.json, site/data.js, los dos trozos, site/stats.json, site/sw-manifest.js, dist/ y docs/investigacion/registro/
python3 scripts/validate.py       # esquema, fuentes, fechas, calendario; 0 errores y avisos dentro del presupuesto
python3 scripts/validate.py --links   # y además cada URL (lento: medio segundo por petición)
python3 scripts/review.py --fail  # lo que lleva más de un año sin releer
python3 -m http.server -d site    # y abrir http://localhost:8000
```

Los avisos (`AVISO [código]`) señalan lo que pide leer el texto y no bloquean, pero tienen un presupuesto: [`scripts/avisos-presupuesto.txt`](https://github.com/GeiserX/biblical-atlas/blob/main/scripts/avisos-presupuesto.txt) dice cuántos admite cada código. `validate.py` lo aplica siempre, en local y en el CI: si un código pasa de su número sale con 1 y escribe los avisos de ese código para encontrar el nuevo; si se queda por debajo, pide bajar el número. Quien arregla un aviso baja su número en el mismo cambio; el número nunca se sube para dejar pasar uno nuevo. Un código que no está en el fichero admite 0. `--budget FICHERO` lee otro presupuesto.

Las pruebas de los scripts:

```bash
python3 scripts/test_build.py
python3 scripts/test_apply.py
python3 scripts/test_validate.py
python3 scripts/migration/test_migrate.py
python3 scripts/videos/test_videos.py
python3 scripts/bible_coverage.py
```

Las pruebas del sitio (`tests/site/`) abren el sitio en un Chromium de verdad. En cada PR y en cada push a `main` las corre `sitio.yml` en los runners de GitHub, repartidas en seis trabajos; si una falla, sus trazas de Playwright quedan en el artefacto `trazas-<n>` del trabajo que falló (n, su número en la matriz), y se abren con `npx playwright-core show-trace <fichero>.zip`. Llevan capturas de pantalla, porque el mapa se pinta en un canvas que las instantáneas del DOM no guardan: las de `timeline-marks` pueden pasar de 1 GB. Para correrlas en local, tras `build.py`:

```bash
npm install --prefix /tmp/pw playwright-core@1.63.0
node /tmp/pw/node_modules/playwright-core/cli.js install --only-shell chromium
export PLAYWRIGHT_CORE=/tmp/pw/node_modules/playwright-core PLAYWRIGHT_MODULE_DIR=/tmp/pw/node_modules
node --test --test-concurrency=1 tests/site/notes.test.mjs   # un fichero; tests/site/*.test.mjs, todos
```

Un fichero detrás de otro: cada uno abre su navegador. Todas juntas tardan unos 50 minutos en una sola máquina. `BE_TIME_SCALE=<n>` multiplica los presupuestos de tiempo de `timeline-marks` en una máquina más lenta que un Mac mini.

`build.py --out DIR` escribe en otra carpeta sin tocar `site/`, `dist/` ni `docs/`; `build.py --data DIR` y `validate.py --data DIR` leen otra copia de `data/`. El sitio carga esa copia con `index.html?datos=_local/<nombre>/data.json`. Cada script está explicado en [`scripts/README.md`](https://github.com/GeiserX/biblical-atlas/blob/main/scripts/README.md).

## Los trozos de los datos

`build.py` escribe los datos enteros en `data.json` y, para el sitio, partidos en dos trozos. `data.json` no cambia: lo leen el servidor MCP y quien quiera los datos. El sitio no lo descarga. Abre con el núcleo y pide el detalle cuando hace falta ([`site/js/data-chunks.js`](https://github.com/GeiserX/biblical-atlas/blob/main/site/js/data-chunks.js)).

| Fichero | Qué lleva | Cuándo lo pide el sitio |
|---|---|---|
| `data.core.json` | Lo que pintan el mapa, la línea de tiempo y la portada. Los lugares con sus puntos, candidatos y formas. Las personas con sus nombres, fechas y relaciones, de cada relación solo `tipo`, `persona`, `lugar`, `fecha`, `fuentes`, `deducido` y `estado`. Los viajes con sus paradas. Los sucesos con sus fechas, lugares, personas y resumen. Los periodos, las cartas, los hallazgos, los recorridos, los libros, el calendario y la cobertura, enteros. De cada fuente, `nivel` e `implicita`, y también `titulo` y `obra` de las que proponen la zona de un lugar desconocido (`according_to`), que nombran la leyenda y las etiquetas del mapa. | Al arrancar. |
| `data.detail.json` | Los textos de las fichas: `razon`, `historial`, `enlaces`, `consultado` y `checked_on`. De las personas, también `resumen`, `desambiguacion`, `no_confundir_con`, `no_afirmamos`, `perspicacia` y `offices`. De los lugares, `resumen`, `no_afirmamos` y las coordenadas citadas (`coord_nota`, `coord_url`, `coord_fuente`). De los viajes, `resumen`. El resto de cada relación: verbos, referencia, palabra y razón. El resto de cada fuente: título, obra, enlace y fechas, salvo lo que el núcleo guarda para el mapa. | A la vez que el núcleo si la dirección ya abre una ficha (también un enlace a un pasaje, `#p=`), el grafo o la conexión, y entonces el sitio arranca cuando han llegado los dos, como con `data.json` entero: si el mapa arrancara antes, sus descargas se repartirían la línea con el detalle y la ficha tardaría más. Si no, la primera vez que lo necesita una ficha, el grafo, la conexión o la búsqueda, al entrar en una caja de búsqueda o cuando el mapa queda quieto por primera vez. Una sola vez. |

Una ficha, el grafo o la conexión dicen «Cargando…» mientras llega el detalle. «Ahora mismo», sin nada elegido, no espera: se pinta con el núcleo y otra vez cuando llega el detalle. La búsqueda no espera: contesta con el núcleo y rehace la lista al llegar el detalle, que añade la línea que distingue a dos personas del mismo nombre. El detalle se une sobre los mismos objetos del núcleo: un objeto clave a clave, una lista posición a posición, y un `null` del detalle no aporta nada.

**Un campo nuevo.** Va al núcleo sin hacer nada, y el sitio lo tiene desde el arranque. Va al detalle si se añade a `DETAIL_KEYS` en `scripts/build.py`, que dice qué claves de cada colección se mueven, a cualquier profundidad. En una relación o una fuente es al revés: va al detalle salvo que se añada a `RELATION_CORE_KEYS` o a `SOURCE_CORE_KEYS`. Solo puede ir al detalle lo que leen las fichas, el grafo, la conexión o la búsqueda. Lo que lee el mapa, la línea o la portada se queda en el núcleo, también de las fuentes: el mapa nombra la que propone una zona («según Perspicacia «Estrella»»), así que su título y su obra (`SOURCE_MAP_KEYS`) se quedan en el núcleo.

Tres comprobaciones lo vigilan. `build.py` no escribe nada si el núcleo y el detalle unidos no dan `data.json`, o si las cifras de las fuentes que la portada cuenta sobre el núcleo no son las de `data.json` (`scripts/test_build.py`, clase `Chunks`). Y [`tests/site/data-chunks.test.mjs`](https://github.com/GeiserX/biblical-atlas/blob/main/tests/site/data-chunks.test.mjs) compara el mapa con su leyenda, la línea, «Mientras tanto», «Ahora mismo» y la portada pintados con el núcleo solo y con `data.json` entero, en el escritorio y en el teléfono. «Ahora mismo» en una parada lee también textos del detalle: se pinta con el núcleo y otra vez al llegar el detalle, y la prueba mira que entonces es el de `data.json`.

**Desde `file://` y con `?datos=`.** Desde `file://` el sitio carga `data.js`, que sigue siendo `data.json` entero, así que no pide nada después. Con `?datos=_local/<nombre>/data.json` busca `data.core.json` y `data.detail.json` en esa carpeta y, si no hay núcleo, carga su `data.json` entero.

## Sin conexión

Publicado por https, el sitio abre sin conexión después de una visita con red. Lo hace un service worker, [`site/sw.js`](https://github.com/GeiserX/biblical-atlas/blob/main/site/sw.js), que registra [`site/js/offline.js`](https://github.com/GeiserX/biblical-atlas/blob/main/site/js/offline.js) desde las tres páginas.

| Qué guarda | Cuándo |
|---|---|
| Las tres páginas, el CSS, el JS, las fuentes, los iconos, `data.core.json` (`PRECACHE`) y MapLibre 6.11.2 de unpkg (`LIBS`) | Al instalarse, en la primera visita: 6,1 MB sin comprimir, 1,8 MB comprimidos. Casi todo ya está en la caché del navegador por la propia visita. |
| `data.detail.json`, `data.en.json`, `data.json` (lo lee el calendario), las listas de vídeos, `i18n/` y los mapas de fondo | La primera vez que el sitio los pide. Lo que la primera visita pidió antes de que el worker tomara la página se guarda al tomarla, desde la caché del navegador. |
| El estilo, las teselas y los iconos del mapa actual (OpenFreeMap) | Cuando se ven, en otra caché de 600 respuestas como mucho. Con red van siempre a la red; sin red, salen de lo ya visto. |

Nada más se descarga por adelantado. `stats.json` no se guarda: el sitio no lo pide, lo leen las insignias del README.

**Versiones.** `build.py` escribe `site/sw-manifest.js`, que no va a git: la huella SHA-256 de cada fichero publicado de `site/` (salvo `docs/`, `_local/`, los `.md` y el propio worker) y una versión que resume esas huellas y `sw.js`. La caché lleva el nombre de la versión. Un despliegue que cambia un fichero del sitio cambia la versión; uno que solo cambia la documentación, no.

- El navegador compara `sw.js` y `sw-manifest.js` con los publicados al abrir una página, al volver la red y al volver a la pestaña (como mucho una vez cada diez minutos). Si cambiaron, instala la versión nueva sin molestar: copia de la anterior lo que conserva su huella, descarga lo demás y espera.
- Mientras espera, la página sigue entera con su versión y un aviso dice «Hay una versión nueva del atlas», con «Recargar». Solo al pulsarlo se activa la nueva, se borra la caché anterior y la página recarga. Las otras pestañas abiertas recargan también, porque su worker ya es el nuevo. Si se cierran todas sin pulsar, la visita siguiente abre con la nueva.
- Todo se sirve de la caché de la versión, con red o sin ella, así que el código, el núcleo y el detalle de una pestaña son siempre de la misma versión. Lo que aún no está se pide a la red y solo se guarda si su huella es la del manifiesto. Si no lo es, el servidor ya tiene otra versión: el worker responde 503 (la ficha dice que no pudo cargarse) y busca la nueva, que avisa. Un detalle nuevo nunca se une a un núcleo viejo.

**Lo que no funciona sin conexión.** Las teselas del mapa actual que no se vieron; si ni siquiera se guardó su estilo, el mapa pasa a nuestro relieve, como cuando OpenFreeMap no responde. Los vídeos y los enlaces a jw.org y wol.jw.org. Y lo que nunca se pidió con red: una ficha cuya lista de vídeos no se guardó sale sin esa sección, y el calendario necesita `data.json`, que solo se guarda al abrirlo con red.

**En local y desde `file://`.** El worker solo se registra por https. Con `python3 -m http.server` no hay worker: un cambio se ve al recargar y las pruebas del sitio no tienen nada entre ellas y la red. Para probarlo en local, `localStorage.setItem('biblical-atlas:sin-conexion', '1')` en la consola, `build.py` y recargar; para quitarlo, «Unregister» en las herramientas del navegador (Aplicación, Service workers). Desde `file://` no puede haber worker y el sitio abre como siempre.

**Un fichero nuevo.** Si una de las tres páginas lo pide al abrir, se añade a `PRECACHE` en `site/sw.js`; una versión nueva de MapLibre se cambia en `LIBS`, la misma que en `index.html`. Si el sitio lo pide después, no hay que hacer nada: entra en el manifiesto y se guarda la primera vez. La versión no se toca a mano. [`tests/site/offline.test.mjs`](https://github.com/GeiserX/biblical-atlas/blob/main/tests/site/offline.test.mjs) abre las tres páginas y falla si piden algo que no está en `PRECACHE` ni entre lo que se guarda al pedirlo; también prueba la carga sin red, el detalle sin red, el detalle de otra versión, el aviso y `file://`.

## Esta documentación

Es un sitio [mkdocs-material](https://squidfunk.github.io/mkdocs-material/) que se publica en `/docs/` del mismo artefacto que la aplicación. `mkdocs.yml` fija `site_dir` en `site/docs`, así que una compilación suelta nunca borra la aplicación.

```bash
pip install -r docs/requirements-docs.txt
python3 scripts/build.py     # el registro de investigación lo escribe build.py
mkdocs build --strict        # escribe site/docs/; un enlace roto falla
mkdocs serve                 # http://127.0.0.1:8000/docs/
```

Las páginas del registro (`docs/investigacion/registro/`) las genera `build.py`: para cambiarlas se cambia el YAML o `build.py`, nunca el `.md`. El esquema, el protocolo de lectura y las notas de trabajo (`docs/investigacion/modelo.md`, `versiculos.md`, `entre-libros.md`, `videos-jw.md`, `docs/ideas/`, `docs/logo/`, `docs/verde/`) se leen en GitHub y no se publican en el sitio.

## Contribuir

Lo que más ayuda es corregir o ampliar datos con su fuente. Lo segundo, mejorar el sitio.

1. Los datos viven en `data/`, un YAML por entidad. Las claves y los valores cerrados van en inglés; los nombres, los textos y los ids, en español con tildes.
2. Cada hecho lleva `sources`, `reason`, `checked_on` y `status`, y cada hecho anidado también. Una fuente externa solo entra si jw.org la ha usado, marcada `level: 2` y junto a la de nivel 1 que la cita.
3. Resúmenes cortos, con tus palabras: la validación rechaza más de 40 palabras y la revisión comprueba que no hay ocho palabras seguidas de la fuente.
4. Un lugar sin ubicación segura lleva `candidates`, no un punto. Una fecha calculada lleva `type: derived`, la cuenta en `note` y `status: pending`.
5. Si añades un lugar o una persona, añade también cómo se nombra en los vídeos (`scripts/videos/place_names/`, `scripts/videos/people_names/`).
6. Antes del PR: `build.py`, `validate.py --links` y las pruebas de arriba. En cada PR el CI compila, valida el esquema, corre las pruebas del sitio en un navegador y construye esta documentación en modo estricto; los enlaces se comprueban en `main` y cada semana.

Lo que no entra: texto, mapas o imágenes copiados de jw.org; subtítulos de vídeos; datos de otras confesiones; fechas sin fuente; nombres de personas reales, direcciones o rutas de máquinas. Los commits siguen Conventional Commits y explican el porqué. Antes de proponer algo que contradiga lo decidido, lee [Decisiones](decisiones.md); lo que queda por hacer está en la [Hoja de ruta](hoja-de-ruta.md).

## Publicar

`pages.yml` corre en cada push a `main`: instala las dependencias, compila los datos, construye la documentación con `mkdocs build --strict`, comprueba que cada fichero de `site/` sigue en su sitio, también `sw-manifest.js`, y que `site/docs/index.html` existe, y sube `site/` a GitHub Pages. `validar.yml` corre en cada PR, en `main` y cada lunes (con `--links` y `review.py --fail`). `docs.yml` corre en cada PR y construye la documentación en modo estricto. `sitio.yml` corre en cada PR y en `main` las pruebas de `tests/site/` en Chromium.
