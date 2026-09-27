# Hoja de ruta

Rebanadas completas, cada una publicada cuando está entera. El orden puede cambiar según lo que la familia esté leyendo.

## v0: los viajes y las cartas de Pablo

- Datos verificados en wol.jw.org: los tres viajes misionales, la visita a Jerusalén del 49, la custodia en Cesarea, el viaje a Roma, las catorce cartas, los compañeros de viaje, los emperadores Claudio y Nerón y el procónsul Galión.
- Mapa antiguo propio y mapa actual, con conmutador.
- Cursor de tiempo único, línea de tiempo con zoom y reproducción, marcador de Pablo interpolado sobre la ruta.
- Cartas como arcos con ficha doble (origen y destino).
- Fichas con «Por qué lo decimos», fuentes, fecha de consulta y vídeos de jw.org que mencionan el lugar.
- Búsqueda por nombre y por pasaje, con la cronología de la entidad resaltada.
- Estado en la URL para compartir una vista.
- Compilación a `data.json` y SQLite, validación y comprobación de enlaces en CI, despliegue en GitHub Pages.

## v1: Pedro y el libro de Hechos completo

- Pedro de punta a punta (ya hay datos de ejemplo en [`pedro.json`](ideas/mockups/data/pedro.json)).
- Todos los sucesos de Hechos con sus pasajes, para que la lectura capítulo a capítulo tenga su mapa.
- Grafo de personas: quién viaja con quién y quién escribe a quién.
- Carriles configurables en la línea de tiempo.

## v2: la vida de Jesús e Israel bajo medos y persas

- Los cuatro evangelios en armonía, con la tabla de jw.org como guía.
- «¿Quién había en Judá bajo los medos y persas?» y «Babilonia en tiempos de Jesús» con datos verificados.
- Lugares inciertos como zonas (Edén, Ararat, Sinaí).
- Cortina entre mapa antiguo y actual.

## Más adelante

- Reyes de Judá e Israel con las dos cronologías en pantalla.
- Recorridos guiados para el estudio en familia y un modo presentación para tablet o televisor.
- Revisión anual: lo que [`scripts/revisar.py`](../scripts/revisar.py) marque como leído hace más de un año.
