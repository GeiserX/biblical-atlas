# Créditos de los mapas base

Los mapas de esta carpeta son cartografía propia: los dibujamos a partir de datos geográficos abiertos, con nuestro diseño. No copian ningún mapa publicado. Cómo se generan: [`../build/README.md`](../build/README.md).

| Capa | Fuente | Licencia |
|---|---|---|
| Color del relieve (estilo actual) | [Natural Earth](https://www.naturalearthdata.com/) · *Natural Earth I with Shaded Relief, Water, and Drainages* (NE1_HR_LC_SR_W) | Dominio público |
| Costas, tierra, lagos, ríos, fronteras y nombres de países actuales | [Natural Earth](https://www.naturalearthdata.com/) 1:10m (`ne_10m_*`) | Dominio público |
| Elevación para el sombreado del relieve y la profundidad del mar | [Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) (formato Terrarium, AWS Open Data), compiladas por Mapzen a partir de las fuentes de abajo | Ver atribución |

## Atribución requerida por los datos de elevación

Para la zona de estos mapas, las teselas combinan:

- Global ETOPO1 terrain data U.S. National Oceanic and Atmospheric Administration.
- United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey.
- Europe terrain data produced using Copernicus data and information funded by the European Union - EU-DEM layers.
- Mapzen.

Texto completo de atribución: [tilezen/joerd, docs/attribution.md](https://github.com/tilezen/joerd/blob/master/docs/attribution.md).

Cada mapa que dibuja `geo.js` muestra una línea corta de atribución en la esquina inferior derecha. No la quites en las maquetas.

## Nombres de países

Los nombres y fronteras actuales salen de Natural Earth, que refleja el control de hecho de cada territorio. No es una postura política.
