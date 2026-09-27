<p align="center">
  <img src="docs/images/banner.svg" alt="biblical-earth banner" width="900">
</p>

<h1 align="center">biblical-earth</h1>

<p align="center">Biblical geography and earth sciences</p>

<p align="center">Un mapa y una línea de tiempo movidos por una sola fecha, para estudiar la Biblia con cada relato en su lugar y en su tiempo.</p>

<p align="center"><a href="https://geiserx.github.io/biblical-earth/">Sitio</a> · <a href="docs/ideas/">Ideas y maquetas</a> · <a href="docs/decisiones.md">Decisiones</a> · <a href="docs/hoja-de-ruta.md">Hoja de ruta</a> · <a href="docs/investigacion/">Investigación</a> · <a href="CONTRIBUTING.md">Contribuir</a></p>

## Qué hay

- `site/`: el sitio estático (MapLibre GL, sin servidor). Primer corte: los viajes y las cartas de Pablo.
- `data/`: los datos, un YAML por entidad, cada hecho con su fuente, su razón y su fecha de consulta.
- `scripts/`: compilación a `data.json` y SQLite, validación de esquema y enlaces, y la revisión anual.
- `docs/`: ideas, maquetas, modelo de datos, decisiones y el registro de investigación.

## Fuentes

La fuente principal es jw.org y la Traducción del Nuevo Mundo; se enlaza, nunca se copia. Las fuentes externas entran solo cuando jw.org las ha usado. Los mapas son propios, hechos con datos abiertos (Natural Earth, OpenBible).

## Ejecutar en local

```bash
pip install -r requirements.txt
python3 scripts/build.py
cd site && python3 -m http.server 8080
```

---