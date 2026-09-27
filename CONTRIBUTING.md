# Cómo contribuir

Se aceptan PR. Lo que más ayuda es corregir o ampliar datos con su fuente. Lo segundo, mejorar el sitio. Las decisiones tomadas están en [docs/decisiones.md](docs/decisiones.md); léelas antes de proponer algo que las contradiga.

## Proponer o corregir un dato

1. Los datos viven en `data/`, un YAML por entidad (`lugares/`, `personas/`, `viajes/`, `cartas/`, `eventos/`, `periodos/`) y las fuentes en `data/fuentes.yaml`.
2. Cada hecho lleva `fuentes` (ids de `fuentes.yaml`), `razon` (por qué hacemos esa asociación, con nuestras palabras), `consultado` (la fecha en que leíste la fuente) y `estado` (`verificado` si abriste la fuente y lo dice; `pendiente` si no).
3. La fuente principal es jw.org y la Traducción del Nuevo Mundo. Si dos publicaciones de jw.org difieren, vale la más reciente y el cambio se anota en `historial`. Una fuente externa solo entra si jw.org la ha usado, y se marca `nivel: 2`.
4. Escribe resúmenes cortos, con tus palabras, en español con tildes. No copies texto de jw.org: la validación rechaza resúmenes largos y en la revisión se comprueba contra la página enlazada.
5. Antes de abrir el PR:

```bash
pip install -r requirements.txt
python3 scripts/build.py
python3 scripts/validate.py --links
```

El CI ejecuta lo mismo. Un enlace caído o un id que no existe bloquean el PR.

## Mejorar el sitio

El sitio es estático y vive en `site/`. Léete [`site/README.md`](site/README.md). Sirve la carpeta con `python3 -m http.server` desde `site/` después de compilar los datos. No añadas dependencias que necesiten un servidor.

## Lo que no entra

- Texto, mapas o imágenes copiados de jw.org.
- Datos de otras confesiones.
- Fechas sin fuente. Si la calculas tú a partir de datos de jw.org, dilo en `razon` y marca `aprox: true`.
- Nombres de personas reales, direcciones o rutas de máquinas.

## Revisión

Un PR de datos lo revisa una persona abriendo cada fuente enlazada. Un PR del sitio se prueba en el navegador con los datos compilados. Los commits siguen Conventional Commits y explican el porqué.
