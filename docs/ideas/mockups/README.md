# Maquetas: cómo crearlas y renderizarlas

Las maquetas de `docs/ideas/` son páginas HTML que se capturan como PNG con Chrome. Usan un kit común para que parezcan pantallas reales y no bocetos: mapa con relieve real, ciudades en su sitio exacto, tipografía, componentes e iconos propios.

![Demostración del kit](../img/00-kit-demo.png)

*Demostración del kit ([`src/00-kit-demo.html`](src/00-kit-demo.html)): segundo viaje de Pablo en el otoño del 50 e.c., Pablo en Corinto, 1 Tesalonicenses con sus dos extremos, destinatarios de Gálatas como zona sin punto exacto y línea de tiempo con carriles.*

## Estructura

```
mockups/
├── README.md            este archivo
├── src/                 una maqueta por archivo: NN-nombre.html
├── data/                datos de ejemplo ya comprobados (ver data/README.md)
└── kit/
    ├── tokens.css       paleta, tipografías, tamaños, sombras
    ├── components.css   componentes (clases be-*)
    ├── fonts.css        @font-face de las fuentes del kit
    ├── fonts/           EB Garamond, Inter y Noto Serif Hebrew (licencia OFL)
    ├── icons.js         iconos SVG propios: <i data-icon="ship"></i>
    ├── geo.js           proyección, mapa, rutas, zonas, línea de tiempo (window.BE)
    ├── places.json      168 lugares con coordenadas, nombre en la TNM, nombre y país actuales
    ├── maps/            mapas base en estilo antiguo y actual (+ CREDITS.md)
    ├── photos/          fotos reales con licencia libre (+ CREDITS.md)
    ├── build/           scripts que generan los mapas base
    ├── render.mjs       HTML → PNG con Chrome
    └── quantize.py      compresión PNG sin pérdida visible (la usa render.mjs)
```

Las imágenes resultantes van a `docs/ideas/img/<nombre>.png`, con el mismo nombre que el HTML.

## Renderizar

```bash
node docs/ideas/mockups/kit/render.mjs 00-kit-demo                  # → docs/ideas/img/00-kit-demo.png
node docs/ideas/mockups/kit/render.mjs 03-grafo 04-cartas            # varias en un solo Chrome
node docs/ideas/mockups/kit/render.mjs --mobile 10-movil             # 430x932 a escala 2
node docs/ideas/mockups/kit/render.mjs --size 1440x900 --full larga  # tamaño propio y página entera
node docs/ideas/mockups/kit/render.mjs --out /tmp/pruebas 00-kit-demo # prueba sin tocar docs/ideas/img
```

- Por defecto: 1600x1000 a escala 2 (PNG de 3200x2000).
- Una maqueta puede fijar su tamaño en el `<head>`: `<meta name="mockup-size" content="1440x900">`, `<meta name="mockup-mobile" content="true">`, `<meta name="mockup-full" content="true">`.
- Sin dependencias npm: Node 22 o más y Google Chrome. Varios renders en paralelo no chocan: cada uno abre su propio Chrome y su propio servidor.
- El render espera a fuentes, imágenes y a `BE.ready(...)`. Los errores de JavaScript, los avisos y los archivos no encontrados (404) salen en la terminal. **Léelos**: un aviso de mapa borroso o un lugar que no existe se ven ahí antes que en la imagen.
- **Compresión.** Cada PNG queda por debajo de 1,5 MB (`--max-kb` lo cambia). Primero se prueba PNG sin pérdida; si no basta, una paleta de libimagequant, que no deja manchas en el mar ni en el relieve. libimagequant se instala sola la primera vez en un venv fuera del repo (`$TMPDIR/biblical-earth-imagequant`, o `node kit/render.mjs --setup`). Si no se puede instalar, se usa la paleta de ImageMagick, que sí puede dejar manchas en degradados suaves. En último caso reduce la resolución y lo dice en la terminal.
- **Mira siempre la imagen** antes de darla por buena: ciudades en su sitio, textos sin cortar, nada tapado.

## Plantilla mínima (escritorio)

Copia esto en `src/NN-nombre.html`:

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>NN · Título de la maqueta</title>
<meta name="mockup-size" content="1600x1000">
<link rel="stylesheet" href="../kit/tokens.css">
<link rel="stylesheet" href="../kit/components.css">
<script src="../kit/icons.js"></script>
<script src="../kit/geo.js"></script>
</head>
<body>
<div class="be-app">
  <header class="be-topbar">
    <div class="be-logo"><span class="be-logo__mark"></span>biblical-earth</div>
    <div class="be-search"><i data-icon="search"></i><span class="be-search__text">Busca persona, lugar, capítulo o año</span><span class="be-kbd">/</span></div>
    <div class="be-spacer"></div>
    <div class="be-date"><span class="be-date__value">49 e.c.</span><span class="be-date__hint">cronología TNM</span></div>
    <div class="be-seg"><span class="be-seg__opt be-seg__opt--on"><i class="be-i be-i--sm" data-icon="scroll"></i>Mapa antiguo</span><span class="be-seg__opt"><i class="be-i be-i--sm" data-icon="globe"></i>Actual</span></div>
  </header>

  <main class="be-map" id="map"></main>

  <aside class="be-panel">
    <div class="be-panel__head"><div class="be-crumbs"><span>Pablo</span><span class="be-sep">›</span><span>Filipos</span></div></div>
    <div class="be-panel__body">
      <article class="be-card">
        <div class="be-card__pad">
          <div class="be-card__eyebrow"><i class="be-i be-i--sm" data-icon="place"></i>Lugar</div>
          <h2 class="be-card__title">Filipos</h2>
          <div class="be-card__body">Resumen escrito por nosotros, nunca texto copiado de la TNM.</div>
          <div style="display:flex;gap:6px;margin-top:10px"><a class="be-ref">Hch 16:12</a></div>
        </div>
        <div class="be-card__foot"><span class="be-tier be-tier--1" data-n="1">TNM</span><span class="be-spacer"></span><a class="be-wol" href="https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/44/16">Leer en wol.jw.org</a></div>
      </article>
    </div>
  </aside>

  <section class="be-timeline" id="timeline"></section>
</div>
<script>
BE.ready(async () => {
  // bounds: [oeste, sur, este, norte] en grados. fit: 'contain' enseña todo el encuadre; por defecto 'cover' lo llena y recorta.
  const map = BE.createMap(document.getElementById('map'), { base: 'mediterraneo', style: 'antiguo', bounds: [21, 38.5, 28, 41.7], fit: 'contain' });
  map.route(['troas', 'samotracia', 'neapolis'], { kind: 'sea', curve: -0.1 });
  map.route(['neapolis', 'filipos'], { kind: 'done' });
  map.city('troas', { variant: 'visited', side: 'left' });
  map.city('filipos', { variant: 'current', side: 'top' });
  BE.timeline(document.getElementById('timeline'), {
    from: 45, to: 58, tick: 1, cursor: 49.8, cursorLabel: '49 e.c.',
    lanes: [{ label: 'Pablo', icon: 'person', color: 'var(--node-persona)',
              items: [{ from: 49, to: 52.4, label: '2.º viaje · c. 49-52', fuzzy: 'both', active: true }] }],
  });
});
</script>
</body>
</html>
```

La rejilla `.be-app` pone barra superior, mapa, panel lateral y línea de tiempo. Sus medidas son variables de `tokens.css` (`--topbar-h`, `--panel-w`, `--timeline-h`) y cada maqueta puede cambiarlas en su `<style>`; por ejemplo, con un solo carril, `:root { --timeline-h: 130px; }`. Una maqueta sin mapa (un grafo, una ficha) puede usar la misma rejilla con otro contenido en `<main>` o su propio diseño con los mismos componentes.

## Plantilla móvil

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="mockup-mobile" content="true">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="../kit/tokens.css">
<link rel="stylesheet" href="../kit/components.css">
<script src="../kit/icons.js"></script>
<script src="../kit/geo.js"></script>
</head>
<body>
<div class="be-phone">
  <main class="be-map" id="map"></main>
  <div class="be-statusbar"><span>9:41</span><span><i data-icon="wifi"></i> <i data-icon="battery"></i></span></div>
  <div class="be-mtop"><div class="be-search"><i data-icon="search"></i><span class="be-search__text">Busca persona, lugar o año</span></div></div>
  <div class="be-sheet">
    <div class="be-sheet__grip"></div>
    <div class="be-card__eyebrow"><i class="be-i be-i--sm" data-icon="place"></i>Dónde está Pablo</div>
    <h2 class="be-card__title">Filipos</h2>
    <div class="be-card__body">Resumen escrito por nosotros.</div>
  </div>
  <div class="be-homebar"></div>
</div>
<script>
BE.ready(async () => {
  // Pantalla alta: encuadre alto (más latitud que longitud) con el 'cover' por defecto.
  const map = BE.createMap(document.getElementById('map'), { base: 'mediterraneo', style: 'antiguo', bounds: [22, 36, 26, 43.5] });
  map.route(['neapolis', 'filipos'], { kind: 'done' });
  map.city('filipos', { variant: 'current', side: 'left' });
  map.city('neapolis', { variant: 'visited', side: 'bottom' });
});
</script>
</body>
</html>
```

Pon siempre el `<meta name="viewport">`. Sin él, Chrome maqueta el móvil a 980 px de ancho y todo sale diminuto; `render.mjs` lo corrige, pero el HTML debe ser correcto.

## Mapa: `BE.createMap(elemento, opciones)`

| Opción | Valores |
|---|---|
| `base` | `'mundo'` (lon −10..72, lat 12..50: Egipto, Mesopotamia, Persia), `'mediterraneo'` (lon 10..44, lat 28..44: viajes de Pablo), `'israel'` (lon 33,9..36,9, lat 29,4..33,7: Israel y Judá con detalle) |
| `style` | `'antiguo'` (pergamino, sin fronteras modernas) o `'actual'` (colores de atlas, fronteras de hoy) |
| `bounds` | `[oeste, sur, este, norte]` en grados |
| `fit` | `'cover'` (por defecto, llena y recorta) o `'contain'` (enseña todo el encuadre) |
| `center`, `scale` | alternativa a `bounds` |
| `attribution` | `false` oculta la línea de atribución. No lo hagas en maquetas: los datos del relieve la exigen |

**Resolución.** Cada base tiene un detalle máximo: `mundo` unos 45 px por grado de latitud, `mediterraneo` unos 145 e `israel` unos 780. Si el encuadre pide ampliar la base más de 1,6 veces, el relieve se ve borroso y la terminal avisa: usa una base más detallada o un encuadre más amplio.

Métodos del mapa que devuelve:

| Método | Para qué |
|---|---|
| `map.city(ref, { variant, side, label, sub })` | Marcador de ciudad. `ref` es un id de `places.json` (`'antioquia-de-pisidia'`), su nombre (`'Antioquía de Pisidia'`) o `[lon, lat]`. `variant`: `current` (dónde está ahora), `visited`, `future`, `dest` (destinataria de una carta), `major`, `minor`, `past`, `uncertain`; se combinan en lista. `side`: `left`, `top`, `bottom` (por defecto a la derecha). En estilo `actual`, la etiqueta es el nombre moderno y debajo el antiguo |
| `map.route(refs, { kind, curve, smooth, arrows, trim })` | Ruta. `kind`: `done` (hecho), `todo` (lo que falta), `sea`, `sea-todo`, `approx` (tramo hecho sin ruta conocida; se dibuja en el color de incertidumbre, con su leyenda `be-legend__line--approx`), `letter` (carta enviada), `ghost` (rastro tenue del pasado). `refs` mezcla ids y puntos de paso `[lon, lat]` (útil en el mar) |
| `map.zone(refs, { padKm, label, labelAt, soft, candidates })` | Zona de incertidumbre alrededor de varios candidatos, con sus puntos huecos. Un lugar incierto nunca se dibuja como un punto |
| `map.label(texto, lon, lat, { kind, rotate, size })` | Rótulo: `region`, `province`, `sea`, `country`, `empire` |
| `map.pop(ref, html, { dx, dy })` | Globo anclado a un punto (qué pasó aquí en esta fecha) |
| `map.countries()` | Nombres de países actuales (estilo `actual`) |
| `map.curtain(fracción, { leftLabel, rightLabel })` | Cortina: la otra mitad del mapa en el otro estilo |
| `map.scaleBar(px)` | Barra de escala en km; añádela a `.be-mapctl--br` |
| `map.project(lon, lat)`, `map.at(ref)`, `map.kmToPx(km)` | Coordenadas en px dentro del mapa para dibujar lo que haga falta |
| `map.setStyle('actual')` | Cambia el estilo del mapa base |

**Proyección exacta.** Los mapas base son equirectangulares con un paralelo estándar φ0 por base: `x = (lon − lon0) · cos φ0 · k`, `y = (lat1 − lat) · k`, con `k = ancho / ((lon1 − lon0) · cos φ0)`. `BE.project(lon, lat, base)` devuelve la posición en px de la imagen base; los mismos números están en `kit/maps/extents.json` y en los scripts de `kit/build/`. Por eso Corinto cae en el istmo, Éfeso en la costa de Asia Menor y Jerusalén al oeste del mar Muerto.

## Línea de tiempo: `BE.timeline(elemento, config)`

```js
BE.timeline(el, {
  from: 45, to: 58, tick: 1, minor: 0.25,        // años astronómicos: 1 a.e.c. = 0, 607 a.e.c. = −606
  cursor: 50.8, cursorLabel: 'otoño del 50 e.c.',
  uncertain: [{ from: 50, to: 52 }],              // franja sombreada de fecha incierta
  zoomLevel: 'Años', speed: '1 mes por segundo',  // barra de controles por defecto; bar: '<html>' la sustituye, bar: false la quita
  lanes: [
    { label: 'Pablo', icon: 'person', color: 'var(--node-persona)', items: [
      { from: 49, to: 52.4, label: '2.º viaje · c. 49-52', fuzzy: 'both', active: true },  // fuzzy: extremos difuminados
      { at: 50.85, label: '1 Tesalonicenses' },                                              // hito puntual
      { from: 50, to: 52.9, label: 'Gálatas · c. 50-52', soft: true } ] },                   // soft: tramo incierto
  ],
  fmt: (y) => BE.fmtYear(y),                      // formato de las marcas del eje
});
```

`BE.fmtYear(−606)` devuelve `"607 a.e.c."` y `BE.parseYear('607 a.e.c.')` devuelve `−606`.

## Componentes (`components.css`)

| Bloque | Clases |
|---|---|
| Esqueleto | `be-app`, `be-topbar`, `be-map`, `be-panel` (`__head`, `__body`), `be-timeline`, `be-phone` |
| Barra superior | `be-logo`, `be-search` (`--focus`, `__text`), `be-kbd`, `be-date` (`__value`, `__hint`), `be-seg` (`__opt`, `__opt--on`): conmutador mapa antiguo/actual |
| Botones y chips | `be-btn` (`--primary`, `--accent`, `--ghost`, `--icon`, `--round`, `--sm`), `be-chip` (`--active`) |
| Fuentes y fechas | `be-tier--1` (TNM y jw.org), `be-tier--2` (arqueología e investigación), `be-tier--unverified` (sin verificar); `be-chrono--tnm`, `be-chrono--secular` (cuando difiere), `be-chrono--approx`; `be-ref` (cita bíblica), `be-wol` (enlace «Leer en wol.jw.org ↗») |
| Panel | `be-crumbs`, `be-tabs`/`be-tab--on`, `be-card` (`--accent`, `--compact`, `__pad`, `__eyebrow`, `__title`, `__sub`, `__body`, `__foot`), `be-ends`/`be-end` (carta: desde → para), `be-kv`, `be-list`, `be-note` (`--uncertain`, `--warn`), `be-results`/`be-result--active` |
| Fotos | `be-photo` con `<img>`, `be-photo__badge` y `<figcaption>` con `be-photo__credit`. **Toda foto lleva su crédito visible** |
| Nodos del grafo | `be-node--persona`, `--lugar`, `--evento`, `--periodo`, `--hallazgo`, `--texto` (`--sm`, `--lg`); lienzo `be-graph` con `be-gnode` (`--center`, `--dim`, `__label`, `__meta`) y aristas SVG `be-edge` (`--strong`, `--new`) |
| Mapa | `be-mapctl--tl/tr/bl/br`, `be-float`, `be-zoombtns`, `be-legend`, `be-scalebar`, `be-pop`, `be-curtain`, `be-attrib` |
| Línea de tiempo | `be-play`, `be-speed`, `be-zoomscale`, `be-minimap`, `be-lane`, `be-span`, `be-point`, `be-cursor`, `be-uncertain-band` |
| Móvil | `be-statusbar`, `be-mtop`, `be-sheet` (`__grip`), `be-mtimeline`, `be-homebar` |
| Utilidades | `be-serif`, `be-caps`, `be-muted`, `be-num`, `be-spacer`, `be-row`, `be-he` (texto hebreo) |

Iconos disponibles: `Object.keys(BE_ICONS)` en la consola, o la lista al principio de `kit/icons.js`. Se usan con `<i data-icon="nombre"></i>`, y `be-i--sm` / `be-i--lg` cambian el tamaño.

## Reglas para el contenido de las maquetas

- **Nada de jw.org dentro del repo**: ni texto de la TNM, ni imágenes, ni capturas. Sólo referencias (`Hch 13:6-12`), resúmenes escritos por nosotros y enlaces «Leer en wol.jw.org ↗».
- **Cada dato bíblico o cronológico, comprobado en wol.jw.org** (TNM, notas de estudio, *Perspicacia*). Pon las URL en un comentario HTML al principio de la maqueta, como en `00-kit-demo.html`. Si no se ha podido comprobar, márcalo en pantalla con `be-tier--unverified`.
- **Cronología TNM primero.** La secular aparece como nota (`be-chrono--secular`) cuando difiere, por ejemplo 607 a.e.c. frente a 587/586 a.e.c.
- **La incertidumbre se ve**: zonas para lugares sin identificar, extremos difuminados para fechas aproximadas, «tiempo narrativo» en viajes sin fechas exactas.
- **Fotos**: sólo las de `kit/photos/` (u otras con licencia libre añadidas a su `CREDITS.md`), con el crédito visible. No hay fotos de la época: la fotografía nace hacia 1826; lo que hay son ruinas actuales y objetos de museo.

## Créditos del kit

- Mapas: Natural Earth (dominio público) y Terrain Tiles (atribución en [`kit/maps/CREDITS.md`](kit/maps/CREDITS.md)).
- Lugares: *Bible geocoding data by OpenBible.info*, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); Wikidata (CC0) para lugares fuera de la Biblia; país actual de Natural Earth.
- Fotos: autores y licencias en [`kit/photos/CREDITS.md`](kit/photos/CREDITS.md).
- Fuentes tipográficas: EB Garamond, Inter y Noto Serif Hebrew, [SIL Open Font License 1.1](https://openfontlicense.org) (textos en `kit/fonts/`).
