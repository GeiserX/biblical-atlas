# Cómo contribuir

Se aceptan PR. Lo que más ayuda es corregir o ampliar datos con su fuente. Lo segundo, mejorar el sitio. Las decisiones tomadas están en [docs/decisiones.md](docs/decisiones.md); léelas antes de proponer algo que las contradiga. Qué es el proyecto, cómo trata las fuentes y a quién da las gracias está en la página [Acerca de](site/acerca.html).

## Proponer o corregir un dato

1. Los datos viven en [`data/`](data/), un YAML por entidad: `places/`, `people/`, `journeys/`, `letters/`, `events/`, `periods/`, `finds/` y `tours/`. Las claves y los valores cerrados van en inglés; los nombres, los textos y los ids, en español. El esquema de cada tipo está en [docs/investigacion/README.md](docs/investigacion/README.md) y el de las relaciones y los sucesos, en [docs/investigacion/modelo.md](docs/investigacion/modelo.md).
2. Las fuentes van en `data/sources/<tema>.yaml`. Añade las tuyas al fichero del tema o crea uno nuevo. Un id repetido con los mismos datos se funde; con datos distintos es un error. Los capítulos de la Biblia no hace falta escribirlos: un id como `mateo-26` sale solo de [`data/books.yaml`](data/books.yaml).
3. `data/books.yaml` tiene los 66 libros, con escritor, lugar y fecha de cada uno. [`data/calendar.yaml`](data/calendar.yaml) tiene los meses hebreos que usan las fechas con `detail`.
4. Cada hecho lleva `sources` (ids de `data/sources/`), `reason` (por qué hacemos esa asociación, con nuestras palabras), `checked_on` (la fecha en que leíste la fuente) y `status` (`verified` si abriste la fuente y lo dice; `pending` si no). Cada relación, cada parada de un viaje y cada candidato de un lugar llevan su propio `checked_on` y su `status`, y cada nombre y cada fiesta de un mes, su `checked_on`. El tipo y la palabra de una relación salen de [`data/vocabulary.yaml`](data/vocabulary.yaml): si lo que quieres decir no está allí, dilo en el PR en vez de inventar una palabra.
5. La fuente principal es jw.org y la Traducción del Nuevo Mundo. Si dos publicaciones de jw.org difieren, vale la más reciente y el cambio se anota en `history`. Una fuente externa solo entra si jw.org la ha usado, se marca `level: 2` y va junto a la fuente de nivel 1 que la cita.
6. Si no se sabe dónde estaba un lugar, no le pongas un punto: pon `candidates` (zona, punto o franja, cada uno con su `status` y su base). Los hallazgos arqueológicos van en `finds/`, y los recorridos guiados en `tours/`, con paradas de 40 palabras como mucho.
7. Escribe resúmenes cortos, con tus palabras, en español con tildes. No copies texto de jw.org: la validación rechaza textos de más de 40 palabras y en la revisión se comprueba contra la página enlazada.
8. Si añades un lugar o una persona, añade también cómo se nombra en los vídeos: los lugares en `scripts/videos/place_names/<tema>.yaml` y las personas en `scripts/videos/people_names/<tema>.yaml`. Cada lugar necesita su entrada, aunque sea `names: []` con una línea que diga por qué. Las reglas están en [videos-jw.md](docs/investigacion/videos-jw.md).
9. Antes de abrir el PR:

```bash
pip install -r requirements.txt
python3 scripts/build.py
python3 scripts/validate.py --links
```

Para probar sin tocar lo compilado, `build.py --out DIR` escribe en otra carpeta, y `build.py --data DIR` y `validate.py --data DIR` leen otra copia de `data/`. Los detalles están en [scripts/README.md](scripts/README.md).

En cada PR, el CI compila, valida el esquema y corre las pruebas del sitio en un navegador. Un id que no existe, un hecho sin fuente o una prueba que falla dejan el PR en rojo. También lo deja en rojo un aviso nuevo: [`scripts/avisos-presupuesto.txt`](scripts/avisos-presupuesto.txt) dice cuántos avisos admite cada código, y `validate.py` falla si alguno pasa de su número. Si tu cambio arregla un aviso, baja ese número en el mismo PR; nunca lo subas. Los enlaces se comprueban en `main` y cada semana, así que pasa `--links` tú antes de abrirlo.

## Mejorar el sitio

El sitio es estático y vive en [`site/`](site/). Léete [`site/README.md`](site/README.md): explica los módulos de `site/js/`, cómo se registra un tipo y cómo cargar datos de prueba con `?datos=_local/<nombre>/data.json`. Sirve la carpeta con `python3 -m http.server` desde `site/` después de compilar los datos. Las pruebas de `tests/site/` corren en CI en cada PR; cómo correrlas en local está en [docs/development.md](docs/development.md). No añadas dependencias que necesiten un servidor, y comprueba que la página sigue abriendo desde `file://`. Si añades datos, mapas, código o letras de otros, añádelos a «Gracias» en [`site/acerca.html`](site/acerca.html) con su enlace y su licencia.

## Lo que no entra

- Texto, mapas o imágenes copiados de jw.org.
- Texto de los subtítulos de los vídeos, ni los nombres de sus ficheros.
- Datos de otras confesiones.
- Fechas sin fuente. Si la calculas tú a partir de datos de jw.org, usa `type: derived`, escribe la cuenta en `note` y deja `status: pending`.
- Nombres de personas reales, direcciones o rutas de máquinas.

## Revisión

Un PR de menos de 100 ficheros recibe una revisión automática. Uno de 100 ficheros o más necesita la revisión de una persona. En los dos casos, un PR de datos se revisa abriendo cada fuente enlazada, y uno del sitio se prueba en el navegador con los datos compilados. Los commits siguen Conventional Commits y explican el porqué.
