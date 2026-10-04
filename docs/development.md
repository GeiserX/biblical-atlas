# Desarrollo

Cómo compilar, validar y proponer un cambio. Las reglas de la casa, completas, están en [CONTRIBUTING.md](https://github.com/GeiserX/biblical-atlas/blob/main/CONTRIBUTING.md); aquí va lo que se ejecuta.

## Compilar y comprobar

Python 3.12 o más nuevo y PyYAML:

```bash
pip install -r requirements.txt
python3 scripts/build.py          # data/ -> site/data.json, site/data.js, site/stats.json, dist/ y docs/investigacion/registro/
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

`pages.yml` corre en cada push a `main`: instala las dependencias, compila los datos, construye la documentación con `mkdocs build --strict`, comprueba que cada fichero de `site/` sigue en su sitio y que `site/docs/index.html` existe, y sube `site/` a GitHub Pages. `validar.yml` corre en cada PR, en `main` y cada lunes (con `--links` y `review.py --fail`). `docs.yml` corre en cada PR y construye la documentación en modo estricto. `sitio.yml` corre en cada PR y en `main` las pruebas de `tests/site/` en Chromium.
