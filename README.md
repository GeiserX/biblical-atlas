<p align="center">
  <img src="docs/images/banner.svg" alt="biblical-earth, la Biblia en el mapa y en el tiempo: el nombre, la rama de olivo sobre el mar del Mediterráneo oriental y una línea del tiempo de 4026 a.e.c. al año 100" width="900">
</p>

<h1 align="center">biblical-earth</h1>

<p align="center"><b>La Biblia en el mapa y en el tiempo</b></p>

<p align="center">Un mapa y una línea de tiempo movidos por una sola fecha, para estudiar la Biblia con cada relato en su lugar y en su tiempo.</p>

<p align="center"><a href="https://biblical-earth.geiser.cloud/">Sitio</a> · <a href="https://biblical-earth.geiser.cloud/acerca.html">Acerca de</a> · <a href="docs/ideas/">Ideas y maquetas</a> · <a href="docs/decisiones.md">Decisiones</a> · <a href="docs/hoja-de-ruta.md">Hoja de ruta</a> · <a href="docs/investigacion/">Investigación</a> · <a href="CONTRIBUTING.md">Contribuir</a></p>

## Qué hay

El sitio cubre de Adán a Juan en Patmos: los viajes y las cartas de Pablo, Pedro y todo Hechos, la vida de Jesús en armonía con la tabla A7 de la TNM de estudio, los reyes de Judá e Israel, Judá bajo los medos y los persas, y Babilonia a lo largo de los siglos. Hay grafo de personas, lugares inciertos dibujados como zonas o candidatos, cuatro recorridos guiados, modo lectura y modo presentación.

| Datos | Cuántos |
|---|---|
| Lugares | 166 |
| Personas | 222 |
| Sucesos | 315 |
| Periodos | 87 |
| Cartas | 22 |
| Viajes | 8 |
| Hallazgos | 7 |
| Recorridos | 4 |
| Fuentes | 898 |

Cada hecho lleva su fuente, su razón y su fecha de consulta, y cada arista del grafo lleva su verbo y el pasaje que la sostiene. Lo que está hecho y lo que queda está en la [hoja de ruta](docs/hoja-de-ruta.md).

- [`site/`](site/): el sitio estático, con MapLibre GL y sin servidor. La aplicación está en `site/js/`, partida en scripts clásicos que comparten `window.BE`: `base.js` crea el estado y el bucle de pintado; `mapa.js`, `linea.js`, `trayectorias.js` y `ahora.js` pintan el mapa y el tiempo; `buscar.js`, `grafo.js`, `lectura.js`, `recorridos.js` y `portada.js` son las vistas de estudio; `tipos/` tiene un fichero por tipo de entidad. Los detalles están en [`site/README.md`](site/README.md).
- [`data/`](data/): los datos, un YAML por entidad, más las fuentes en `data/sources/`, los 66 libros en `data/books.yaml`, los meses hebreos en `data/calendar.yaml` y el vocabulario de las relaciones en `data/vocabulary.yaml`. Las claves y los valores cerrados van en inglés; los nombres y los textos, en español.
- [`scripts/`](scripts/): compilación a `data.json` y SQLite, validación de esquema y enlaces, la revisión anual y los índices de vídeos de jw.org. Ver [`scripts/README.md`](scripts/README.md).
- [`docs/`](docs/): ideas, maquetas, modelo de datos, decisiones y el registro de investigación.

## Fuentes

La fuente principal es jw.org y la Traducción del Nuevo Mundo; se enlaza, nunca se copia. Las fuentes externas entran solo cuando jw.org las ha usado. Los mapas son propios, hechos con datos abiertos (Natural Earth, OpenBible). Los créditos completos, con la licencia de cada fuente, están en la página [Acerca de](site/acerca.html) ([en el sitio](https://biblical-earth.geiser.cloud/acerca.html#gracias)).

## Ejecutar en local

```bash
pip install -r requirements.txt
python3 scripts/build.py
python3 scripts/validate.py
cd site && python3 -m http.server 8080
```

Abre <http://localhost:8080>. `site/index.html` también abre con doble clic, pero sin cortina ni vídeos: el navegador no deja leer ficheros locales.
