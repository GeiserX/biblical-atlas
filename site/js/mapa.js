/* biblical-earth · mapa: MapLibre, relieve antiguo y actual en tres extensiones (mundo, Mediterráneo, Israel), cortina,
   rutas de todos los viajes, arcos de cartas con un color por escritor, lugares inciertos como zonas y candidatos,
   hallazgos, marcas de lugar con nombre por época y agrupación, marcador de Pablo, etiquetas sin solapes, capas y
   filtros guardados en la dirección, nombres del encuadre, mapa de situación, leyenda y tarjeta «Mientras tanto».
   Dueño durante el reparto: app-mapa. Interfaz fija para los demás: BE.mapa.resaltar(ids) y BE.mapa.encuadrar(ids). */
'use strict';
(() => {
const BE = window.BE;
const { E, sucio, programar, esc, $, clamp, tramo, fechaCorta, mercY, latDeY, ES_FILE, seleccionar, setT, asegurarVisible, guardarHash, avisar } = BE;

// ---------------------------------------------------------------------------
// Mapas base: tres extensiones del kit reproyectadas a Web Mercator (ver site/README.md). De menos a más detalle:
// el mundo bíblico siempre; el Mediterráneo y la tierra de Israel aparecen al acercarse, encima del anterior.
// ---------------------------------------------------------------------------
const BASES = [
  { id: 'mundo', ext: { oeste: -10, este: 72, sur: 12, norte: 50 }, zoom: null },
  { id: 'mediterraneo', ext: { oeste: 10, este: 44, sur: 28, norte: 44 }, zoom: [4.3, 5] },
  { id: 'israel', ext: { oeste: 33.9, este: 36.9, sur: 29.4, norte: 33.7 }, zoom: [6.7, 7.4] },
];
const esquinas = (e) => [[e.oeste, e.norte], [e.este, e.norte], [e.este, e.sur], [e.oeste, e.sur]];
const urlBase = (b, estilo) => `maps/${b.id}-${estilo}.webp`;
const opacidadGL = (b) => (b.zoom ? ['interpolate', ['linear'], ['zoom'], b.zoom[0], 0, b.zoom[1], 1] : 1);
const opacidadEn = (b, z) => (b.zoom ? clamp((z - b.zoom[0]) / (b.zoom[1] - b.zoom[0]), 0, 1) : 1);
const MUNDO = BASES[0].ext;
const ESTILO_ACTUAL = 'https://tiles.openfreemap.org/styles/positron';
const ATRIBUCION = 'Relieve: Natural Earth, USGS SRTM/GMTED2010, NOAA ETOPO1, Copernicus EU-DEM, Mapzen · Costas y ríos: Natural Earth · Coordenadas: <a href="https://www.openbible.info/geo/" target="_blank" rel="noopener">OpenBible.info</a> (CC BY 4.0)';
const MAYORES = new Set(['roma', 'jerusalen', 'antioquia-de-siria', 'efeso', 'corinto', 'atenas', 'filipos', 'tesalonica', 'babilonia']);
const REGION = new Set(['region', 'provincia', 'pais', 'reino', 'desierto', 'llanura', 'valle']);
const AGUA = new Set(['mar', 'lago', 'rio']);
const estrecha = () => matchMedia('(max-width: 760px)').matches;
let map = null, mapaListo = false, capasBase = [], estiloReserva = false;

const ENCUADRE_INICIAL = [[19.2, 34.0], [37.2, 42.2]];
let resaltadoMapa = null;           // Set de ids que pide BE.mapa.resaltar; null: manda la selección

const OCULTAR_EN_ACTUAL = /^(highway|road_|airport|label_other|label_village|label_town|label_city|label_state|poi|housenumber|aeroway|building)/;
const marcasLugar = new Map();       // id → { marker, el, l, clase, hoy }
const marcasCarta = new Map();       // clave de arco → { marker, el }
const marcasCand = new Map();        // 'lugar|i' o 'lugar|' (rótulo de la zona) → { marker, el }
const marcasHallazgo = new Map();    // lugar → { marker, el }
const marcasViajero = new Map();     // persona → { marker, el }
const marcasGrupo = [];              // burbujas de agrupación
let marcaPablo = null, marcaProxima = null;
let imgsDom = [];                    // desde file://: [{ img, base }]
let cortina = null;                  // [{ base, canvas, ctx, img, fuente }]

// ---------------------------------------------------------------------------
// Capas y filtros (M-20, M-03, C-03, C-09): se guardan en la dirección
// ---------------------------------------------------------------------------
const CAPAS = [
  ['viajes', 'Viajes'], ['cartas', 'Cartas'], ['inciertos', 'Lugares inciertos'], ['hallazgos', 'Hallazgos'],
  ['pendientes', 'Datos sin verificar'], ['relieve', 'Relieve'],
];
const NOMBRES = [['ambos', 'Los dos donde ayuda'], ['antiguos', 'Solo antiguos'], ['actuales', 'Solo actuales']];
const FILTRO_CARTAS = [['cerca', 'Cerca de esta fecha'], ['hasta', 'Escritas hasta esta fecha'], ['todas', 'Todas'], ['personas', 'Solo a personas']];
const F = BE.filtros = { capas: Object.fromEntries(CAPAS.map(([k]) => [k, true])), nombres: 'ambos', nivel1: false, cartas: 'cerca' };
BE.parametros.push(
  { nombre: 'ocultas', escribir: () => CAPAS.filter(([k]) => !F.capas[k]).map(([k]) => k).join(','), leer: (v) => { const off = new Set(String(v || '').split(',')); for (const [k] of CAPAS) F.capas[k] = !off.has(k); filtrosCambiados(false); } },
  { nombre: 'nombres', escribir: () => (F.nombres === 'ambos' ? null : F.nombres), leer: (v) => { F.nombres = NOMBRES.some(([k]) => k === v) ? v : 'ambos'; filtrosCambiados(false); } },
  { nombre: 'nivel', escribir: () => (F.nivel1 ? '1' : null), leer: (v) => { F.nivel1 = v === '1'; filtrosCambiados(false); } },
  { nombre: 'cartas', escribir: () => (F.cartas === 'cerca' ? null : F.cartas), leer: (v) => { F.cartas = FILTRO_CARTAS.some(([k]) => k === v) ? v : 'cerca'; filtrosCambiados(false); } },
);
/** Tras cambiar un filtro: repinta el mapa, la ficha y el menú, y lo guarda en la dirección. */
function filtrosCambiados(guardar = true) {
  pintarMapa.claveCartas = null; claveInciertos = ''; pintarLeyenda.clave = null; pintarHallazgos.clave = null;
  sucio.mapa = sucio.etiquetas = true;
  if (mapaListo) aplicarRelieve();
  pintarMenuCapas();
  if (guardar) { BE.pintarPanel(true); guardarHash(); }
  programar();
}

// ---------------------------------------------------------------------------
// Colores calculados (D-09): viajes por persona y orden, cartas por escritor. Tonos con claridad distinta y
// nunca solos: lo incierto va rayado o discontinuo, lo pendiente con borde de trazos.
// ---------------------------------------------------------------------------
const PALETA = ['#a3432b', '#8a6d1f', '#2f6f73', '#6b4c8a', '#7b6f60', '#2c5f8a', '#62743a', '#9b3d5a', '#56657a', '#c47a2c'];
const PALETA_ESCRITOR = ['#b8892f', '#2c5f8a', '#62743a', '#9b3d5a', '#6b4c8a', '#2f6f73', '#56657a'];
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const claveFecha = (f) => [f?.desde ?? 1e6, f?.hasta ?? 1e6];
let coloresViaje = null, coloresEscritor = null;
function calcularColores() {
  coloresViaje = new Map();
  const porPersona = new Map();
  for (const v of BE.D.viajes) { const p = v.persona || 'pablo'; if (!porPersona.has(p)) porPersona.set(p, []); porPersona.get(p).push(v); }
  for (const [p, vs] of porPersona) {
    vs.sort((a, b) => claveFecha(a.fecha)[0] - claveFecha(b.fecha)[0] || claveFecha(a.fecha)[1] - claveFecha(b.fecha)[1] || a.id.localeCompare(b.id));
    const base = p === 'pablo' ? 0 : 3 + (hash(p) % (PALETA.length - 3));
    vs.forEach((v, i) => coloresViaje.set(v.id, PALETA[(base + i) % PALETA.length]));
  }
  // Escritores por la fecha de su primera carta; Pablo, el primero, conserva el dorado de v0.
  coloresEscritor = new Map();
  const primera = new Map();
  for (const c of BE.D.cartas) { const e = c.escritor || 'pablo'; const d = claveFecha(c.fecha)[0]; if (!primera.has(e) || d < primera.get(e)) primera.set(e, d); }
  [...primera.entries()].sort((a, b) => (a[0] === 'pablo' ? -1 : b[0] === 'pablo' ? 1 : a[1] - b[1] || a[0].localeCompare(b[0])))
    .forEach(([e], i) => coloresEscritor.set(e, PALETA_ESCRITOR[i % PALETA_ESCRITOR.length]));
}
const colorViaje = (id) => { if (!coloresViaje) calcularColores(); return coloresViaje.get(id) || PALETA[0]; };
const colorEscritor = (id) => { if (!coloresEscritor) calcularColores(); return coloresEscritor.get(id || 'pablo') || PALETA_ESCRITOR[0]; };
const colorPersona = (id) => { const v = BE.D.viajes.find((x) => (x.persona || 'pablo') === id); return v ? colorViaje(v.id) : PALETA[hash(id) % PALETA.length]; };
/** Mezcla un color con el gris del papel: el rastro de un viaje ya hecho (M-09). */
function apagar(hex, f = 0.5) {
  const n = parseInt(hex.slice(1), 16), g = [0x9a, 0x90, 0x83];
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x, i) => Math.round(x * (1 - f) + g[i] * f));
  return `#${c.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

// ---------------------------------------------------------------------------
// Estados de los candidatos de ubicación (M-10, M-11, C-07): color y patrón
// ---------------------------------------------------------------------------
const CAND = {
  seguro: { color: '#2f5d50', rotulo: 'Seguro', corto: 'seguro', trazo: 'solido' },
  favorecido_nivel_1: { color: '#7a5c8e', rotulo: 'Favorecido por el nivel 1', corto: 'favorecido · N1', trazo: 'raya' },
  tradicion: { color: '#86601c', rotulo: 'Tradición que cita el nivel 1', corto: 'tradición · N1', trazo: 'raya' },
  alternativa: { color: '#8a8295', rotulo: 'Otra propuesta que cita el nivel 1', corto: 'otra propuesta', trazo: 'raya' },
  solo_nivel_2: { color: '#86601c', rotulo: 'Solo lo propone el nivel 2', corto: 'solo nivel 2', trazo: 'punto' },
  descartado_nivel_1: { color: '#7b6f60', rotulo: 'Descartado por el nivel 1', corto: 'descartado · N1', trazo: 'punto' },
};
const candidatosDe = (l) => (Array.isArray(l?.candidatos) ? l.candidatos : null);
/** Candidatos que se ven con los filtros actuales, con su índice original. */
const candidatosVisibles = (l) => (candidatosDe(l) || []).map((c, i) => ({ c, i })).filter(({ c }) => !(F.nivel1 && c.estado === 'solo_nivel_2'));
let candFoco = null;                 // { lugar, i }

// ---------------------------------------------------------------------------
// Creación del mapa
// ---------------------------------------------------------------------------
function crearMapa() {
  map = new maplibregl.Map({
    container: 'mapa-gl',
    style: ESTILO_ACTUAL,
    bounds: ENCUADRE_INICIAL,
    maxBounds: [[MUNDO.oeste - 4, MUNDO.sur - 3], [MUNDO.este + 4, MUNDO.norte + 3]],
    minZoom: 2.5, maxZoom: 11,
    dragRotate: false, pitchWithRotate: false, touchPitch: false,
    renderWorldCopies: false, fadeDuration: 0,
    // En pantallas estrechas la atribución se pliega en un botón (i) para no tapar el mapa.
    attributionControl: { compact: estrecha(), customAttribution: ATRIBUCION },
  });
  map.touchZoomRotate.disableRotation();
  map.once('load', () => {
    map.getContainer().querySelector('.maplibregl-compact-show')?.classList.remove('maplibregl-compact-show');
    const attrib = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
    if (attrib) new ResizeObserver(() => { $('#leyenda').style.bottom = `${Math.max(28, attrib.offsetHeight + 10)}px`; }).observe(attrib);
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(new ControlCapas(), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-right');
  let cargado = false, reintentado = false;
  map.on('error', (e) => {
    const url = String(e?.error?.url || '');
    if (!cargado && !estiloReserva && url.includes('/styles/')) {
      if (!reintentado) { reintentado = true; setTimeout(() => map.setStyle(ESTILO_ACTUAL, { diff: false }), 1000); return; }
      console.warn('El estilo de OpenFreeMap no respondió; el mapa actual usa nuestro relieve.', e?.error?.message);
      estiloReserva = true; map.setStyle(estiloSinTeselas(), { diff: false }); return;
    }
    if (e?.error?.message) console.warn('Mapa:', e.error.message, url);
  });
  map.on('style.load', () => { cargado = true; montarCapas(); });
  map.on('moveend', () => { sucio.etiquetas = true; programar(); if (E.mapa === 'cortina') pintarCortina(); pintarNombresEncuadre(); });
  map.on('move', () => { if (imgsDom.length) colocarImgsDom(); if (E.mapa === 'cortina') pintarCortina(); pintarSituacion(); });
  map.on('resize', () => { if (imgsDom.length) colocarImgsDom(); });
  // Un clic en una marca HTML también llega a MapLibre: esa marca ya lo gestiona su propio manejador.
  const enMarca = (e) => !!e.originalEvent?.target?.closest?.('.maplibregl-marker');
  const puntero = (capa) => { map.on('mouseenter', capa, () => { map.getCanvas().style.cursor = 'pointer'; }); map.on('mouseleave', capa, () => { map.getCanvas().style.cursor = ''; }); };
  map.on('click', 'be-cartas-toque', (e) => { if (enMarca(e)) return; const id = e.features?.[0]?.properties?.id; if (id) alternar({ tipo: 'carta', id }); });
  puntero('be-cartas-toque');
  // La línea de un viaje: el primer clic lo selecciona y el segundo lo deselecciona, igual que en la línea de tiempo.
  for (const capa of ['be-hecho', 'be-falta', 'be-rastro-toque']) {
    map.on('click', capa, (e) => { if (enMarca(e) || e.defaultPrevented) return; e.preventDefault(); const id = e.features?.[0]?.properties?.viaje; if (id) alternar({ tipo: 'viaje', id }, { mover: false }); });
    puntero(capa);
  }
  map.on('click', 'be-zonas-relleno', (e) => {
    if (enMarca(e) || e.defaultPrevented) return;
    e.preventDefault();
    const p = e.features?.[0]?.properties;
    if (p?.lugar) elegirCandidato(p.lugar, p.i);
  });
  puntero('be-zonas-relleno');
}
/** Selecciona, o deselecciona si ya estaba seleccionado. */
function alternar(sel, opciones = {}) {
  if (E.sel && E.sel.tipo === sel.tipo && E.sel.id === sel.id) { seleccionar(null, { mover: false, encuadrar: false }); return; }
  seleccionar(sel, opciones);
}
function estiloSinTeselas() {
  return { version: 8, sources: {}, layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#dfe8ec' } }] };
}
function montarCapas() {
  capasBase = map.getStyle().layers.map((l) => l.id);
  for (const l of map.getStyle().layers) {
    if (l.type === 'symbol' && /^(label_country|water_name)/.test(l.id)) {
      map.setLayoutProperty(l.id, 'text-field', ['coalesce', ['get', 'name:es'], ['get', 'name:latin'], ['get', 'name']]);
    }
    // Los países de hoy chocan con nuestras regiones antiguas: solo aparecen a partir del zoom 8.
    if (/^label_country/.test(l.id)) map.setLayerZoomRange(l.id, Math.max(8, l.minzoom ?? 0), l.maxzoom ?? 24);
  }
  if (estiloReserva && !ES_FILE) {
    for (const b of BASES) {
      map.addSource(`be-actual-${b.id}`, { type: 'image', url: urlBase(b, 'actual'), coordinates: esquinas(b.ext) });
      map.addLayer({ id: `be-actual-${b.id}`, type: 'raster', source: `be-actual-${b.id}`, paint: { 'raster-fade-duration': 0, 'raster-opacity': opacidadGL(b) } });
      capasBase.push(`be-actual-${b.id}`);
    }
  }
  if (!ES_FILE) {
    for (const b of BASES) {
      map.addSource(`be-antiguo-${b.id}`, { type: 'image', url: urlBase(b, 'antiguo'), coordinates: esquinas(b.ext) });
      map.addLayer({ id: `be-antiguo-${b.id}`, type: 'raster', source: `be-antiguo-${b.id}`, paint: { 'raster-fade-duration': 0, 'raster-opacity': opacidadGL(b) } });
    }
  } else if (!imgsDom.length) {
    // Desde file:// MapLibre no puede leer las imágenes (CORS). Van como <img> bajo el lienzo, alineadas a mano.
    for (const b of [...BASES].reverse()) {
      const img = document.createElement('img');
      img.className = 'antiguo-dom'; img.alt = ''; img.src = urlBase(b, 'antiguo');
      map.getContainer().prepend(img);
      imgsDom.push({ img, base: b });
    }
    colocarImgsDom();
  }
  const vacio = { type: 'FeatureCollection', features: [] };
  for (const id of ['be-rastro', 'be-hecho', 'be-falta', 'be-cartas', 'be-cartas-o', 'be-halo', 'be-zonas', 'be-cand-lineas', 'be-zonas-carta']) map.addSource(id, { type: 'geojson', data: vacio });
  const lineas = { 'line-cap': 'round', 'line-join': 'round' };
  for (const v of BE.D.viajes) map.addImage(`be-flecha-${v.id}`, imagenFlecha(colorViaje(v.id)));
  for (const [k, s] of Object.entries(CAND)) map.addImage(`be-rayado-${k}`, imagenRayado(s.color, k));
  map.addImage('be-rayado-carta', imagenRayado('#b8892f', 'alternativa'));
  const color = ['get', 'color'];
  const flecha = (placement, opacity, spacing) => ({ type: 'symbol', layout: { 'symbol-placement': placement, 'symbol-spacing': spacing, 'icon-image': ['concat', 'be-flecha-', ['get', 'viaje']], 'icon-size': 0.5, 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true }, paint: { 'icon-opacity': opacity } });
  // Lugares inciertos: zonas rayadas con borde difuminado, franjas y el abanico que une a los candidatos.
  map.addLayer({ id: 'be-zonas-relleno', type: 'fill', source: 'be-zonas', paint: { 'fill-pattern': ['concat', 'be-rayado-', ['get', 'estado']], 'fill-opacity': ['get', 'opacidad'] } });
  map.addLayer({ id: 'be-zonas-halo', type: 'line', source: 'be-zonas', paint: { 'line-color': color, 'line-width': 10, 'line-blur': 8, 'line-opacity': ['*', 0.35, ['get', 'opacidad']] } });
  map.addLayer({ id: 'be-zonas-solido', type: 'line', source: 'be-zonas', filter: ['==', ['get', 'trazo'], 'solido'], paint: { 'line-color': color, 'line-width': 1.8, 'line-opacity': ['get', 'opacidad'] } });
  map.addLayer({ id: 'be-zonas-raya', type: 'line', source: 'be-zonas', filter: ['==', ['get', 'trazo'], 'raya'], paint: { 'line-color': color, 'line-width': 1.8, 'line-dasharray': [4, 3], 'line-opacity': ['get', 'opacidad'] } });
  map.addLayer({ id: 'be-zonas-punto', type: 'line', source: 'be-zonas', filter: ['==', ['get', 'trazo'], 'punto'], layout: lineas, paint: { 'line-color': color, 'line-width': 1.8, 'line-dasharray': [0.2, 2.4], 'line-opacity': ['get', 'opacidad'] } });
  map.addLayer({ id: 'be-cand-abanico', type: 'line', source: 'be-cand-lineas', filter: ['==', ['get', 'clase'], 'abanico'], layout: lineas, paint: { 'line-color': '#7a5c8e', 'line-width': 1.2, 'line-dasharray': [1, 3], 'line-opacity': ['get', 'opacidad'] } });
  map.addLayer({ id: 'be-cand-franja', type: 'line', source: 'be-cand-lineas', filter: ['==', ['get', 'clase'], 'franja'], layout: lineas, paint: { 'line-color': color, 'line-width': 5, 'line-opacity': ['*', 0.85, ['get', 'opacidad']] } });
  map.addLayer({ id: 'be-zonas-carta', type: 'fill', source: 'be-zonas-carta', paint: { 'fill-pattern': 'be-rayado-carta', 'fill-opacity': 0.8 } });
  map.addLayer({ id: 'be-zonas-carta-borde', type: 'line', source: 'be-zonas-carta', paint: { 'line-color': color, 'line-width': 1.4, 'line-dasharray': [3, 3], 'line-opacity': 0.8 } });
  // Viajes
  map.addLayer({ id: 'be-rastro', type: 'line', source: 'be-rastro', layout: lineas, paint: { 'line-color': color, 'line-width': ['case', ['==', ['get', 'estado'], 'actual'], 3, 2.2], 'line-opacity': ['match', ['get', 'estado'], 'futuro', 0.3, 'actual', 0.9, 0.6] } });
  map.addLayer({ id: 'be-rastro-flechas', source: 'be-rastro', ...flecha('line', ['match', ['get', 'estado'], 'futuro', 0.35, 'actual', 0.9, 0.5], 90) });
  // Cartas: un color por escritor; pendientes punteadas, escritas discontinuas, la seleccionada gruesa.
  map.addLayer({ id: 'be-cartas-o', type: 'line', source: 'be-cartas-o', layout: lineas, paint: { 'line-color': color, 'line-width': 1.4, 'line-dasharray': [0.4, 2.2], 'line-opacity': 0.9 } });
  map.addLayer({ id: 'be-cartas-pendiente', type: 'line', source: 'be-cartas', filter: ['==', ['get', 'estado'], 'pendiente'], layout: lineas, paint: { 'line-color': color, 'line-width': 1.6, 'line-dasharray': [0.5, 2.5], 'line-opacity': 0.8 } });
  map.addLayer({ id: 'be-cartas-escrita', type: 'line', source: 'be-cartas', filter: ['==', ['get', 'estado'], 'escrita'], layout: { 'line-join': 'round' }, paint: { 'line-color': color, 'line-width': 1.8, 'line-dasharray': [3, 2.5], 'line-opacity': 0.85 } });
  map.addLayer({ id: 'be-cartas-sel-casing', type: 'line', source: 'be-cartas', filter: ['==', ['get', 'estado'], 'sel'], layout: lineas, paint: { 'line-color': '#fffdf8', 'line-width': 7, 'line-opacity': 0.85 } });
  map.addLayer({ id: 'be-cartas-sel', type: 'line', source: 'be-cartas', filter: ['==', ['get', 'estado'], 'sel'], layout: { 'line-join': 'round' }, paint: { 'line-color': color, 'line-width': 4, 'line-dasharray': [2.2, 1] } });
  map.addLayer({ id: 'be-halo', type: 'circle', source: 'be-halo', paint: { 'circle-radius': 16, 'circle-color': 'rgba(184,137,47,0.12)', 'circle-stroke-color': color, 'circle-stroke-width': 1.5 } });
  map.addLayer({ id: 'be-falta', type: 'line', source: 'be-falta', layout: lineas, paint: { 'line-color': color, 'line-width': 2.5, 'line-dasharray': [0.3, 2.6], 'line-opacity': 0.75 } });
  map.addLayer({ id: 'be-hecho-casing', type: 'line', source: 'be-hecho', layout: lineas, paint: { 'line-color': '#fffcf4', 'line-width': 7, 'line-opacity': 0.8 } });
  map.addLayer({ id: 'be-hecho', type: 'line', source: 'be-hecho', filter: ['!', ['get', 'incierto']], layout: lineas, paint: { 'line-color': color, 'line-width': 3.5 } });
  map.addLayer({ id: 'be-hecho-incierto', type: 'line', source: 'be-hecho', filter: ['get', 'incierto'], layout: { 'line-join': 'round' }, paint: { 'line-color': color, 'line-width': 3, 'line-dasharray': [3, 2], 'line-opacity': 0.9 } });
  map.addLayer({ id: 'be-falta-flechas', source: 'be-falta', ...flecha('line-center', 0.6, 80) });
  map.addLayer({ id: 'be-hecho-flechas', source: 'be-hecho', ...flecha('line-center', 1, 80) });
  map.addLayer({ id: 'be-rastro-toque', type: 'line', source: 'be-rastro', layout: lineas, paint: { 'line-color': '#000', 'line-width': 12, 'line-opacity': 0 } });
  map.addLayer({ id: 'be-cartas-toque', type: 'line', source: 'be-cartas', layout: lineas, paint: { 'line-color': '#000', 'line-width': 16, 'line-opacity': 0 } });
  mapaListo = true;
  cortina = null;
  aplicarModoMapa();
  aplicarRelieve();
  claveInciertos = ''; pintarMapa.claveCartas = null;
  sucio.mapa = sucio.etiquetas = true;
  programar();
}
function colocarImgsDom() {
  const z = map.getZoom();
  for (const { img, base } of imgsDom) {
    const a = map.project([base.ext.oeste, base.ext.norte]), b = map.project([base.ext.este, base.ext.sur]);
    Object.assign(img.style, { left: `${a.x}px`, top: `${a.y}px`, width: `${b.x - a.x}px`, height: `${b.y - a.y}px`, opacity: String(opacidadEn(base, z)) });
  }
}
function ponerMapa(modo, guardar = true) {
  if (modo === 'cortina' && ES_FILE) { avisar('La cortina necesita abrir el sitio con un servidor local (ver README).'); modo = 'antiguo'; }
  E.mapa = modo;
  document.querySelectorAll('[data-mapa]').forEach((b) => {
    const on = b.dataset.mapa === modo;
    b.classList.toggle('be-seg__opt--on', on); b.setAttribute('aria-checked', String(on));
  });
  $('#app').dataset.mapa = modo;
  $('#cortina').hidden = modo !== 'cortina';
  if (mapaListo) aplicarModoMapa();
  sucio.etiquetas = true; programar();
  pintarNombresEncuadre();
  if (guardar) guardarHash();
}
function aplicarModoMapa() {
  const antiguo = E.mapa === 'antiguo';
  for (const id of capasBase) {
    if (!map.getLayer(id)) continue;
    const ver = !antiguo && !(OCULTAR_EN_ACTUAL.test(id));
    map.setLayoutProperty(id, 'visibility', ver ? 'visible' : 'none');
  }
  aplicarRelieve();
  if (E.mapa === 'cortina') montarCortina();
  else if (cortina) for (const c of cortina) if (map.getLayer(`be-cortina-${c.base.id}`)) map.setLayoutProperty(`be-cortina-${c.base.id}`, 'visibility', 'none');
}
/** Capa «Relieve»: sin ella, el mapa antiguo queda en papel liso. */
function aplicarRelieve() {
  if (!mapaListo) return;
  const ver = E.mapa === 'antiguo' && F.capas.relieve;
  for (const b of BASES) if (map.getLayer(`be-antiguo-${b.id}`)) map.setLayoutProperty(`be-antiguo-${b.id}`, 'visibility', ver ? 'visible' : 'none');
  for (const { img } of imgsDom) img.hidden = !ver;
  $('#app').classList.toggle('sin-relieve', !F.capas.relieve);
}

// ---------------------------------------------------------------------------
// Cortina: el relieve antiguo se pinta en un lienzo por extensión, solo a un lado del asa. En Mercator la longitud es
// lineal en x y la latitud de Mercator en y, así que el recorte es exacto. En pantallas estrechas la cortina es
// horizontal: arriba el mapa antiguo, abajo el actual.
// ---------------------------------------------------------------------------
async function montarCortina() {
  if (!cortina) {
    const piezas = [];
    for (const b of BASES) {
      const img = new Image();
      img.src = urlBase(b, 'antiguo');
      try { await img.decode(); } catch { return; }
      piezas.push({ base: b, img });
    }
    if (cortina || !mapaListo) return;
    cortina = piezas.map(({ base, img }) => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(2048, img.naturalWidth); canvas.height = Math.round(canvas.width * img.naturalHeight / img.naturalWidth);
      const id = `be-cortina-${base.id}`;
      map.addSource(id, { type: 'canvas', canvas, coordinates: esquinas(base.ext), animate: false });
      map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-fade-duration': 0, 'raster-opacity': opacidadGL(base) } }, 'be-zonas-relleno');
      return { base, img, canvas, ctx: canvas.getContext('2d') };
    });
  }
  if (E.mapa !== 'cortina') return;
  for (const c of cortina) map.setLayoutProperty(`be-cortina-${c.base.id}`, 'visibility', 'visible');
  pintarCortina();
}
let cortinaPausa = 0;
function pintarCortina() {
  const el = $('#cortina');
  const cont = map.getContainer();
  const h = estrecha();
  el.classList.toggle('cortina--h', h);
  // En horizontal la cortina reparte la parte del mapa que no tapa la hoja inferior.
  const pos = E.cortinaX * (h ? Math.max(120, cont.clientHeight - altoHoja()) : cont.clientWidth);
  el.style.setProperty(h ? '--y' : '--x', `${pos}px`);
  if (!cortina) return;
  for (const c of cortina) {
    const { canvas, ctx, img, base } = c;
    const e = base.ext;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (h) {
      const lat = map.unproject([cont.clientWidth / 2, pos]).lat;
      const f = clamp((mercY(e.norte) - mercY(lat)) / (mercY(e.norte) - mercY(e.sur)), 0, 1);
      if (f > 0) ctx.drawImage(img, 0, 0, img.naturalWidth, f * img.naturalHeight, 0, 0, canvas.width, f * canvas.height);
    } else {
      const lon = map.unproject([pos, cont.clientHeight / 2]).lng;
      const f = clamp((lon - e.oeste) / (e.este - e.oeste), 0, 1);
      if (f > 0) ctx.drawImage(img, 0, 0, f * img.naturalWidth, img.naturalHeight, 0, 0, f * canvas.width, canvas.height);
    }
    const fuente = map.getSource(`be-cortina-${base.id}`);
    fuente?.play();                     // sube el lienzo a la GPU en los próximos fotogramas
  }
  clearTimeout(cortinaPausa);
  cortinaPausa = setTimeout(() => { for (const c of cortina || []) map.getSource(`be-cortina-${c.base.id}`)?.pause(); }, 120);
}
function iniciarCortina() {
  const el = $('#cortina'), asa = $('#cortina-asa');
  let arrastre = false;
  const mover = (e) => {
    const r = map.getContainer().getBoundingClientRect();
    E.cortinaX = estrecha() ? clamp((e.clientY - r.top) / Math.max(120, r.height - altoHoja()), 0.05, 0.95) : clamp((e.clientX - r.left) / r.width, 0.03, 0.97);
    pintarCortina();
  };
  asa.addEventListener('pointerdown', (e) => { arrastre = true; asa.setPointerCapture(e.pointerId); e.preventDefault(); });
  asa.addEventListener('pointermove', (e) => { if (arrastre) mover(e); });
  asa.addEventListener('pointerup', () => { arrastre = false; });
  asa.addEventListener('dblclick', () => { E.cortinaX = 0.5; pintarCortina(); });
  asa.addEventListener('keydown', (e) => {
    const menos = e.key === 'ArrowLeft' || e.key === 'ArrowUp', mas = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    if (menos || mas) {
      e.preventDefault(); e.stopPropagation();
      E.cortinaX = clamp(E.cortinaX + (menos ? -0.04 : 0.04), 0.03, 0.97);
      pintarCortina();
    }
  });
  // Los rótulos de cada lado ponen todo el mapa en ese estilo.
  el.querySelector('.cortina-tag--izq')?.addEventListener('click', () => ponerMapa('antiguo'));
  el.querySelector('.cortina-tag--der')?.addEventListener('click', () => ponerMapa('actual'));
  for (const t of el.querySelectorAll('.cortina-tag')) { t.setAttribute('role', 'button'); t.tabIndex = 0; t.title = 'Poner todo el mapa en este estilo'; t.addEventListener('keydown', (e) => { if (e.key === 'Enter') t.click(); }); }
  el.hidden = E.mapa !== 'cortina';
}

// ---------------------------------------------------------------------------
// Geometría
// ---------------------------------------------------------------------------
/** Cambia las clases propias de una marca sin quitar las de MapLibre (maplibregl-marker…), que la posicionan. */
const conMarcador = (el, clases) => [clases, ...[...el.classList].filter((c) => c.startsWith('maplibregl-'))].join(' ');
const coord = (l) => [l.lon, l.lat];
const linea = (coordinates, properties) => ({ type: 'Feature', properties, geometry: { type: 'LineString', coordinates } });
const conPunto = (l) => !!l && l.lat != null && l.lon != null && !candidatosDe(l);
/** Polígono de un círculo de radio km alrededor de un punto. */
function circulo(lat, lon, km, n = 72) {
  const R = 6371, d = km / R, f1 = (lat * Math.PI) / 180, l1 = (lon * Math.PI) / 180, pts = [];
  for (let k = 0; k <= n; k++) {
    const b = (2 * Math.PI * k) / n;
    const f2 = Math.asin(Math.sin(f1) * Math.cos(d) + Math.cos(f1) * Math.sin(d) * Math.cos(b));
    const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(f1), Math.cos(d) - Math.sin(f1) * Math.sin(f2));
    pts.push([(l2 * 180) / Math.PI, (f2 * 180) / Math.PI]);
  }
  return pts;
}
/** Arco curvo entre dos puntos [lon, lat] (curva cuadrática en el plano de Mercator). */
function arcoPts(a, b, curva = 0.18) {
  const ax = a[0], ay = mercY(a[1]) * 57.2958, bx = b[0], by = mercY(b[1]) * 57.2958;
  const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay;
  const cx = mx - dy * curva, cy = my + dx * curva;
  const pts = [];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32, u = 1 - t;
    pts.push([u * u * ax + 2 * u * t * cx + t * t * bx, latDeY((u * u * ay + 2 * u * t * cy + t * t * by) / 57.2958)]);
  }
  return pts;
}
const arco = (a, b) => arcoPts(coord(a), coord(b));
/** Punta de flecha (apunta a la derecha; MapLibre la gira según la línea) con borde claro. */
function imagenFlecha(color) {
  const s = 28, c = document.createElement('canvas');
  c.width = s; c.height = s;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.beginPath(); g.moveTo(6, 5); g.lineTo(23, 14); g.lineTo(6, 23); g.lineTo(11, 14); g.closePath();
  g.lineJoin = 'round'; g.strokeStyle = 'rgba(255,252,244,0.95)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = color; g.fill();
  return g.getImageData(0, 0, s, s);
}
/** Patrón de relleno por estado (D-09): rayado denso, rayado claro, puntos o cuadrícula, además del color. */
function imagenRayado(color, estado) {
  const s = 12, c = document.createElement('canvas');
  c.width = s; c.height = s;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.strokeStyle = color; g.fillStyle = color;
  const diagonal = (ancho, alfa) => { g.globalAlpha = alfa; g.lineWidth = ancho; g.beginPath(); g.moveTo(-2, s + 2); g.lineTo(s + 2, -2); g.moveTo(-2, 2); g.lineTo(2, -2); g.moveTo(s - 2, s + 2); g.lineTo(s + 2, s - 2); g.stroke(); };
  if (estado === 'seguro') { g.globalAlpha = 0.16; g.fillRect(0, 0, s, s); }
  else if (estado === 'favorecido_nivel_1') { diagonal(1.6, 0.55); }
  else if (estado === 'alternativa') { diagonal(1, 0.3); }
  else if (estado === 'tradicion') { g.globalAlpha = 0.5; g.beginPath(); g.arc(3, 3, 1.3, 0, 7); g.arc(9, 9, 1.3, 0, 7); g.fill(); }
  else if (estado === 'solo_nivel_2') { g.globalAlpha = 0.35; g.beginPath(); g.arc(6, 6, 1, 0, 7); g.fill(); }
  else { diagonal(0.8, 0.25); g.beginPath(); g.moveTo(-2, -2); g.lineTo(s + 2, s + 2); g.stroke(); }
  return g.getImageData(0, 0, s, s);
}

// ---------------------------------------------------------------------------
// Viajes (M-09): el que Pablo recorre en esta fecha se parte en hecho y falta; los demás, de cualquier persona,
// se ven como rastro: en color si están ocurriendo, gris claro si ya pasaron y más claro si aún no han empezado.
// ---------------------------------------------------------------------------
/** ¿Cae t cerca de algún viaje (25 años antes, 10 después)? Es la regla con que «Ahora mismo» decide si hablar de Pablo.
    Lejos de todos, el mapa ni dibuja los viajes ni los explica en la leyenda. */
function viajesCerca(t) {
  if (BE.P.length && t > BE.P[0].a - 25 && t < BE.P.at(-1).b + 10) return true;
  return BE.D.viajes.some((v) => { if ((v.persona || 'pablo') === 'pablo') return false; const tr = tramo(v.fecha); return !!tr && t > tr[0] - 25 && t < tr[1] + 10; });
}
function geoRutas(w) {
  const V = BE.viajeActual(w);
  const hecho = [], falta = [], rastro = [];
  if (V) {
    const ps = BE.P.filter((s) => s.viaje === V);
    const corte = w.parada ? w.en.i : (w.en.viaje === V ? w.en.i : -1);
    const color = colorViaje(V.id);
    for (let k = 0; k < ps.length - 1; k++) {
      const A = ps[k], B = ps[k + 1];
      const incierto = A.lugar.precision === 'zona' || B.lugar.precision === 'zona';
      const props = { viaje: V.id, incierto, color };
      if (k < corte) hecho.push(linea([coord(A.lugar), coord(B.lugar)], props));
      else if (k === corte && !w.parada) {
        hecho.push(linea([coord(A.lugar), w.pos], props));
        falta.push(linea([w.pos, coord(B.lugar)], props));
      } else falta.push(linea([coord(A.lugar), coord(B.lugar)], props));
    }
    if (!w.parada && w.en.viaje !== V) {             // tramo de enlace entre dos viajes
      hecho.push(linea([coord(w.en.lugar), w.pos], { viaje: V.id, incierto: false, color }));
      falta.push(linea([w.pos, coord(w.sig.lugar)], { viaje: V.id, incierto: false, color }));
    }
  }
  if ((F.capas.viajes && viajesCerca(E.t)) || E.sel?.tipo === 'viaje') {
    for (const v of BE.D.viajes) {
      if (v === V) continue;
      const pts = [...(v.paradas || [])].sort((a, b) => a.orden - b.orden).map((p) => BE.L[p.lugar]).filter(conPunto).map(coord);
      if (pts.length < 2) continue;
      let estado;
      const dePablo = (v.persona || 'pablo') === 'pablo';
      const ps = dePablo ? BE.P.filter((s) => s.viaje === v) : [];
      if (ps.length) estado = ps[0].a > E.t ? 'futuro' : 'pasado';
      else {
        const tr = tramo(v.fecha);
        estado = !tr ? 'pasado' : E.t < tr[0] ? 'futuro' : E.t >= tr[1] ? 'pasado' : 'actual';
      }
      const c = colorViaje(v.id);
      rastro.push(linea(pts, { viaje: v.id, estado, color: estado === 'pasado' ? apagar(c, 0.45) : c }));
    }
  }
  return { hecho, falta, rastro, V };
}

// ---------------------------------------------------------------------------
// Cartas
// ---------------------------------------------------------------------------
/** ¿Se dibuja esta carta con el filtro de cartas actual? La selección siempre se ve. */
function cartaEnMapa(c, t) {
  if (E.sel?.tipo === 'carta' && E.sel.id === c.id) return true;
  if (!F.capas.cartas) return false;
  if (F.cartas === 'todas') return true;
  if (F.cartas === 'hasta') { const tr = tramo(c.fecha); return !!tr && tr[0] <= t; }
  if (F.cartas === 'personas') return !!(c.destinatarios?.personas?.length);
  return cartaVisible(c, t);
}
/** Semántica de v0 («cerca de esta fecha»), que usan también otras vistas. */
function cartaVisible(c, t) {
  if (E.sel?.tipo === 'carta' && E.sel.id === c.id) return true;
  const tr = tramo(c.fecha);
  return !!tr && t >= tr[0] - 1 && t < tr[1] + 1;
}
const ventanaDeCarta = (c) => ((c.escritor || 'pablo') === 'pablo' ? BE.ventanaCarta(c) : (BE.ventana(c.escritor, c.fecha, c.escrita_en) || tramo(c.fecha)));
function estadoCarta(c, t) {
  if (E.sel?.tipo === 'carta' && E.sel.id === c.id) return 'sel';
  const v = ventanaDeCarta(c);
  return v && t >= v[0] ? 'escrita' : 'pendiente';
}
const nombrePersona = (id) => BE.PERS[id]?.nombre || id;
function geoCartas(t) {
  const arcos = [], halos = [], oes = [], zonas = [], grupos = new Map(), zonasVistas = new Set();
  const zona = (id, color) => {
    const l = BE.L[id];
    if (zonasVistas.has(id) || !conPunto(l) || !(REGION.has(l.tipo) || l.precision === 'zona')) return;
    zonasVistas.add(id);
    zonas.push({ type: 'Feature', properties: { color }, geometry: { type: 'Polygon', coordinates: [circulo(l.lat, l.lon, l.tipo === 'provincia' || l.tipo === 'region' ? 70 : 45)] } });
  };
  for (const c of BE.cartasOrdenadas()) {
    if (!cartaEnMapa(c, t)) continue;
    const estado = estadoCarta(c, t);
    const color = colorEscritor(c.escritor);
    const os = BE.origenesCarta(c).filter((id) => conPunto(BE.L[id])), ds = BE.destinosCarta(c).filter((id) => conPunto(BE.L[id]));
    os.forEach((id) => zona(id, color)); ds.forEach((id) => zona(id, color));
    // Varios lugares de escritura posibles (M-11): un arco fino y punteado los une.
    for (let i = 1; i < os.length; i++) oes.push(linea(arcoPts(coord(BE.L[os[0]]), coord(BE.L[os[i]]), 0.25), { color, id: c.id }));
    for (const o of os) {
      if (!ds.length) {
        halos.push({ type: 'Feature', properties: { id: c.id, color }, geometry: { type: 'Point', coordinates: coord(BE.L[o]) } });
        const k = `${o}|`;
        if (!grupos.has(k)) grupos.set(k, { cartas: [], pos: coord(BE.L[o]), sinDestino: true });
        grupos.get(k).cartas.push({ c, estado });
        continue;
      }
      for (const d of ds) {
        const pts = arco(BE.L[o], BE.L[d]);
        arcos.push(linea(pts, { id: c.id, estado, color }));
        const k = `${o}|${d}`;
        if (!grupos.has(k)) grupos.set(k, { cartas: [], pos: pts[16] });
        grupos.get(k).cartas.push({ c, estado });
      }
    }
  }
  // Cuando una carta tiene varios destinos, solo el primero lleva etiqueta.
  const vistos = new Set();
  for (const [k, g] of grupos) {
    g.cartas = g.cartas.filter(({ c }) => { const kk = `${c.id}@${k.split('|')[0]}`; if (vistos.has(kk)) return false; vistos.add(kk); return true; });
    if (!g.cartas.length) grupos.delete(k);
  }
  return { arcos, halos, oes, zonas, grupos };
}
function pintarEtiquetasCartas(grupos) {
  for (const [k, m] of marcasCarta) if (!grupos.has(k)) { m.marker.remove(); marcasCarta.delete(k); }
  for (const [k, g] of grupos) {
    let m = marcasCarta.get(k);
    if (!m) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'pildora-carta';
      const marker = new maplibregl.Marker({ element: el, anchor: g.sinDestino ? 'top' : 'center', offset: g.sinDestino ? [0, 14] : [0, 0] }).setLngLat(g.pos).addTo(map);
      m = { marker, el };
      marcasCarta.set(k, m);
    }
    const sel = g.cartas.find((x) => x.estado === 'sel');
    const principal = sel?.c || g.cartas[0].c;
    const texto = g.cartas.map(({ c }) => BE.abrCarta(c)).join(' · ');
    const fecha = fechaCorta(principal.fecha).replace(' e.c.', '');
    // Portadores (G-10): la flecha lleva su nombre cuando el texto dice quién llevó la carta.
    const lleva = (sel || g.cartas.length === 1) && principal.portadores?.length ? ` · la lleva${principal.portadores.length > 1 ? 'n' : ''} ${principal.portadores.map(nombrePersona).join(' y ')}` : '';
    m.el.dataset.sel = `carta:${principal.id}`;
    m.el.className = conMarcador(m.el, `pildora-carta${sel ? ' pildora-carta--sel' : ''}${g.cartas.every((x) => x.estado === 'pendiente') ? ' pildora-carta--pendiente' : ''}`);
    m.el.style.setProperty('--carta', colorEscritor(principal.escritor));
    m.el.innerHTML = `${esc(sel ? principal.libro : texto)} · ${esc(fecha)}${esc(lleva)}${g.sinDestino ? ' · destino no indicado' : ''}`;
    m.el.setAttribute('aria-label', `Carta: ${g.cartas.map(({ c }) => c.libro).join(', ')}${lleva}`);
  }
}

// ---------------------------------------------------------------------------
// Lugares inciertos (M-10, M-11, C-07, C-09): zonas, franjas, puntos candidatos con su estado y el abanico que los une.
// Sin selección, la capa no filtra por fecha: cada lugar se ilumina cuando uno de sus sucesos cae en el cursor.
// ---------------------------------------------------------------------------
let claveInciertos = '';
const lugaresInciertos = () => Object.values(BE.L).filter((l) => candidatosDe(l));
function activoEnFecha(id, t) {
  return (BE.D.eventos || []).some((e) => (e.lugares || []).includes(id) && (() => { const v = BE.ventanaEvento(e); return v && t >= v[0] - 0.5 && t < v[1] + 0.5; })());
}
function centroCandidato(c) { const g = c.geometria; return g.tipo === 'franja' ? [(g.lon + g.hasta.lon) / 2, (g.lat + g.hasta.lat) / 2] : [g.lon, g.lat]; }
function pintarInciertos() {
  const selL = E.sel?.tipo === 'lugar' ? E.sel.id : null;
  const res = resaltadoMapa ?? E.resaltado?.lugares;
  const lista = lugaresInciertos().filter((l) => F.capas.inciertos || l.id === selL || res?.has(l.id));
  const activos = new Set(lista.filter((l) => activoEnFecha(l.id, E.t)).map((l) => l.id));
  const clave = `${lista.map((l) => l.id)}|${selL}|${[...activos]}|${F.nivel1}|${F.capas.pendientes}|${candFoco?.lugar}:${candFoco?.i}|${res ? [...res].join(',') : ''}`;
  if (clave === claveInciertos) return;
  claveInciertos = clave;
  const zonas = [], lineasC = [], vivas = new Set();
  for (const l of lista) {
    const foco = l.id === selL || res?.has(l.id);
    const op = foco || activos.has(l.id) ? 1 : (selL || res ? 0.3 : 0.6);
    const cs = candidatosVisibles(l);
    for (const { c, i } of cs) {
      const g = c.geometria, s = CAND[c.estado] || CAND.alternativa;
      const enfocado = candFoco && candFoco.lugar === l.id && candFoco.i === i;
      const props = { lugar: l.id, i, estado: c.estado, color: s.color, trazo: s.trazo, opacidad: enfocado ? 1 : op };
      if (g.tipo === 'zona') zonas.push({ type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [circulo(g.lat, g.lon, g.radio_km)] } });
      else if (g.tipo === 'franja') lineasC.push(linea([[g.lon, g.lat], [g.hasta.lon, g.hasta.lat]], { ...props, clase: 'franja' }));
      if (g.tipo !== 'zona') {
        const k = `${l.id}|${i}`; vivas.add(k);
        marcaCandidato(k, l, c, i, g.tipo === 'franja' ? centroCandidato(c) : [g.lon, g.lat], op, enfocado, foco);
      }
    }
    const vivos = cs.filter(({ c }) => c.estado !== 'descartado_nivel_1');
    for (let k = 1; k < vivos.length; k++) lineasC.push(linea(arcoPts(centroCandidato(vivos[0].c), centroCandidato(vivos[k].c), 0.2), { clase: 'abanico', opacidad: op * 0.9, color: '#7a5c8e' }));
    // Rótulo de la zona: nombre y cuántos candidatos, en el candidato preferido.
    if (cs.length) {
      const k = `${l.id}|`; vivas.add(k);
      rotuloZona(k, l, cs, op, foco);
    }
  }
  for (const [k, m] of marcasCand) if (!vivas.has(k)) { m.marker.remove(); marcasCand.delete(k); }
  map.getSource('be-zonas').setData({ type: 'FeatureCollection', features: zonas });
  map.getSource('be-cand-lineas').setData({ type: 'FeatureCollection', features: lineasC });
  sucio.etiquetas = true;
}
function marcaCandidato(k, l, c, i, pos, op, enfocado, foco = false) {
  let m = marcasCand.get(k);
  if (!m) {
    const el = document.createElement('button');
    el.type = 'button';
    el.addEventListener('click', (e) => { e.stopPropagation(); elegirCandidato(l.id, i); });
    m = { el, marker: new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(pos).addTo(map) };
    marcasCand.set(k, m);
  }
  m.marker.setLngLat(pos);
  const s = CAND[c.estado] || CAND.alternativa;
  m.el.className = conMarcador(m.el, `cand cand--${c.estado}${enfocado ? ' cand--foco' : ''}${foco ? ' cand--del-foco' : ''}`);
  m.el.style.setProperty('--cand', s.color);
  m.el.style.opacity = String(Math.max(op, 0.45));
  m.el.setAttribute('aria-label', `${l.nombre}, candidato: ${c.nombre} (${s.rotulo})`);
  const html = `<span class="cand-punto" aria-hidden="true"></span><span class="cand-rotulo"><b>${esc(c.nombre)}</b><small>${esc(s.corto)}</small></span>`;
  if (m.el.dataset.html !== html) { m.el.innerHTML = html; m.el.dataset.html = html; }
}
function rotuloZona(k, l, cs, op, foco) {
  let m = marcasCand.get(k);
  const favorito = cs.find(({ c }) => c.estado === 'seguro' || c.estado === 'favorecido_nivel_1') || cs[0];
  const pos = centroCandidato(favorito.c);
  if (!m) {
    const el = document.createElement('button');
    el.type = 'button';
    el.addEventListener('click', (e) => { e.stopPropagation(); if (!(E.sel?.tipo === 'lugar' && E.sel.id === l.id)) seleccionar({ tipo: 'lugar', id: l.id }); });
    m = { el, marker: new maplibregl.Marker({ element: el, anchor: 'top', offset: [0, 10] }).setLngLat(pos).addTo(map) };
    marcasCand.set(k, m);
  }
  m.marker.setLngLat(pos);
  m.el.className = conMarcador(m.el, `be-zone-label rotulo-zona${foco ? ' rotulo-zona--foco' : ''}`);
  m.el.style.opacity = String(Math.max(op, 0.5));
  m.el.innerHTML = `${esc(nombreEn(l, E.t))} · ${cs.length > 1 ? `${cs.length} candidatos` : 'ubicación incierta'}`;
  m.el.setAttribute('aria-label', `${l.nombre}: ubicación incierta, ver por qué`);
}
/** Pulsar una zona o un candidato: abre la ficha del lugar y marca ese candidato en ella y en el mapa. */
function elegirCandidato(lugar, i) {
  if (!(E.sel?.tipo === 'lugar' && E.sel.id === lugar)) seleccionar({ tipo: 'lugar', id: lugar }, { mover: false, encuadrar: false });
  enfocarCandidato(lugar, i, false);
}
/** Marca un candidato (desde su fila en la ficha o desde el mapa). Con volar, el mapa va hasta él. */
function enfocarCandidato(lugar, i, volar = true) {
  candFoco = { lugar, i: +i };
  claveInciertos = '';
  const c = candidatosDe(BE.L[lugar])?.[+i];
  if (c && volar && map) {
    const g = c.geometria;
    if (g.tipo === 'zona') map.fitBounds(cajaDe([[g.lon, g.lat]], g.radio_km), { padding: rellenoEncuadre(), maxZoom: 8, duration: 700 });
    else map.easeTo({ center: centroCandidato(c), zoom: Math.max(map.getZoom(), 7), duration: 700 });
  }
  document.querySelectorAll('#panel-cuerpo [data-cand]').forEach((el) => {
    const on = el.dataset.cand === `${lugar}|${i}`;
    el.classList.toggle('candidato--foco', on);
    if (on && !volar) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  sucio.mapa = true; programar();
}

// ---------------------------------------------------------------------------
// Hallazgos (F-07): una marca por lugar de hallazgo, con cuántos hay
// ---------------------------------------------------------------------------
function pintarHallazgos() {
  const hs = (BE.D.hallazgos || []).filter((h) => conPunto(BE.L[h.lugar_hallazgo]) && (F.capas.pendientes || h.estado !== 'pendiente'));
  const selH = E.sel?.tipo === 'hallazgo' ? E.sel.id : null;
  const ver = F.capas.hallazgos || selH;
  const clave = `${hs.length}|${selH}|${F.capas.hallazgos}|${F.capas.pendientes}`;
  if (clave === pintarHallazgos.clave) return;
  pintarHallazgos.clave = clave;
  const porLugar = new Map();
  if (ver) for (const h of hs) { if (!F.capas.hallazgos && h.id !== selH) continue; if (!porLugar.has(h.lugar_hallazgo)) porLugar.set(h.lugar_hallazgo, []); porLugar.get(h.lugar_hallazgo).push(h); }
  for (const [k, m] of marcasHallazgo) if (!porLugar.has(k)) { m.marker.remove(); marcasHallazgo.delete(k); }
  for (const [lid, lista] of porLugar) {
    let m = marcasHallazgo.get(lid);
    if (!m) {
      const el = document.createElement('button');
      el.type = 'button';
      m = { el, marker: new maplibregl.Marker({ element: el, anchor: 'bottom-left', offset: [5, -5] }).setLngLat(coord(BE.L[lid])).addTo(map) };
      marcasHallazgo.set(lid, m);
    }
    m.el.className = conMarcador(m.el, `marca-hallazgo${lista.some((h) => h.id === selH) ? ' marca-hallazgo--sel' : ''}`);
    m.el.dataset.sel = lista.length === 1 ? `hallazgo:${lista[0].id}` : `lugar:${lid}`;
    m.el.innerHTML = `<span aria-hidden="true"></span>${lista.length > 1 ? `<b>${lista.length}</b>` : ''}`;
    m.el.setAttribute('aria-label', lista.length === 1 ? `Hallazgo: ${lista[0].nombre}` : `${lista.length} hallazgos en ${BE.L[lid].nombre}`);
    m.el.title = lista.map((h) => h.nombre).join(' · ');
  }
}

// ---------------------------------------------------------------------------
// Marcas de lugar
// ---------------------------------------------------------------------------
function claseLugar(l) {
  if (REGION.has(l.tipo)) return 'region';
  if (AGUA.has(l.tipo)) return 'agua';
  if (l.precision === 'incierto') return 'difuso';
  if (l.tipo === 'monte') return 'monte';
  return 'punto';
}
function crearMarcas() {
  for (const l of Object.values(BE.L)) {
    if (!conPunto(l)) continue;
    const id = l.id, clase = claseLugar(l);
    const el = document.createElement('button');
    el.type = 'button';
    el.dataset.sel = `lugar:${id}`;
    el.className = clase === 'region' ? 'marca-region' : clase === 'agua' ? 'marca-agua' : `marca-lugar${clase === 'punto' ? '' : ` marca-lugar--${clase}`}`;
    el.setAttribute('aria-label', `${l.nombre}: abrir ficha`);
    el.innerHTML = clase === 'region' ? `<span class="region-texto">${esc(l.nombre)}</span>` : clase === 'agua' ? `<span class="etiqueta agua-texto"><span class="nombre-a">${esc(l.nombre)}</span></span>` : `<span class="punto"></span><span class="etiqueta"><span class="nombre-a">${esc(l.nombre)}</span></span>`;
    const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([l.lon, l.lat]).addTo(map);
    marcasLugar.set(id, { marker, el, l, clase, region: clase === 'region', hoy: nombreHoy(l) });
  }
  const p = document.createElement('div');
  p.className = 'pablo';
  p.innerHTML = '<span class="pablo-halo"></span><span class="pablo-punto"></span><span class="pablo-rotulo">Pablo<small>posición estimada</small></span>';
  marcaPablo = new maplibregl.Marker({ element: p, anchor: 'center' }).setLngLat([0, 0]);
  const q = document.createElement('button');
  q.type = 'button'; q.className = 'proxima';
  marcaProxima = new maplibregl.Marker({ element: q, anchor: 'bottom', offset: [0, -14] }).setLngLat([0, 0]);
  q.addEventListener('click', (e) => { e.stopPropagation(); const s = BE.P.find((x) => x.key === q.dataset.key); if (s) { setT((s.a + s.b) / 2); asegurarVisible(E.t, false); } });
}
function nombreHoy(l) {
  // Los datos marcan el nombre moderno solo en la nota («Nombre actual…», «Ciudad moderna…», «…identifica hoy»).
  const n = (l?.nombres || []).find((x) => x.desde == null && x.hasta == null && /\bhoy\b|actual|modern/i.test(x.nota || ''));
  return n ? n.nombre : null;
}
/** Nombre del lugar en la fecha t (G-11): el de `nombres` cuya época la cubre; si ninguno, el nombre principal. */
/** Nombre del lugar en la fecha t. Un nombre con fechas dice que se usaba entonces, no que sustituyera al principal
    («Ciudad de David» desde 1070 a.e.c. no deja de ser Jerusalén). Solo se cambia de nombre cuando los datos fechan
    también el principal y t cae fuera de su época (Afec antes de Antípatris). */
const enEpoca = (x, t) => (x.desde == null || t >= x.desde) && (x.hasta == null || t < x.hasta + 1);
function nombreEn(l, t) {
  const fechados = (l?.nombres || []).filter((x) => x.desde != null || x.hasta != null);
  const propio = fechados.filter((x) => x.nombre === l.nombre);
  if (!propio.length || propio.some((x) => enEpoca(x, t))) return l.nombre;
  const n = fechados.find((x) => x.nombre !== l.nombre && enEpoca(x, t));
  return n ? n.nombre : l.nombre;
}
const lugaresConEpoca = () => Object.values(BE.L).filter((l) => (l.nombres || []).some((n) => n.desde != null || n.hasta != null));

let clavePablo = '', claveEpocas = '';
function pintarMapa() {
  if (!mapaListo || !marcaPablo) return;
  const t = E.t;
  const w = BE.dondeEsta(t);
  const g = geoRutas(w);
  const V = g.V;
  const soloViaje = E.sel?.tipo === 'viaje' ? E.sel.id : null;     // un viaje seleccionado oculta los demás
  const verViajes = F.capas.viajes || soloViaje;
  const filtra = (fs) => (!verViajes ? [] : soloViaje ? fs.filter((f) => f.properties.viaje === soloViaje) : fs);
  map.getSource('be-hecho').setData({ type: 'FeatureCollection', features: filtra(g.hecho) });
  map.getSource('be-falta').setData({ type: 'FeatureCollection', features: filtra(g.falta) });
  map.getSource('be-rastro').setData({ type: 'FeatureCollection', features: filtra(g.rastro) });
  const { arcos, halos, oes, zonas, grupos } = geoCartas(t);
  const claveCartas = [...grupos.keys()].join(',') + arcos.map((a) => a.properties.estado).join('') + E.sel?.id;
  if (claveCartas !== pintarMapa.claveCartas) {
    pintarMapa.claveCartas = claveCartas;
    map.getSource('be-cartas').setData({ type: 'FeatureCollection', features: arcos });
    map.getSource('be-cartas-o').setData({ type: 'FeatureCollection', features: oes });
    map.getSource('be-halo').setData({ type: 'FeatureCollection', features: halos });
    map.getSource('be-zonas-carta').setData({ type: 'FeatureCollection', features: zonas });
    pintarEtiquetasCartas(grupos);
    sucio.etiquetas = true;
  }
  pintarInciertos();
  pintarHallazgos();
  // Pablo
  if (w && verViajes && (!soloViaje || soloViaje === V?.id)) {
    marcaPablo.setLngLat(w.pos);
    if (!marcaPablo.puesta) { marcaPablo.addTo(map); marcaPablo.puesta = true; }
    marcaPablo.getElement().classList.toggle('estimada', w.estimada);
    const sig = w.parada ? BE.P[w.en.g + 1] : w.sig;
    if (sig && sig.viaje === V) {
      const q = marcaProxima.getElement();
      if (q.dataset.key !== sig.key) {
        q.dataset.key = sig.key;
        q.innerHTML = `<span class="proxima-icono" aria-hidden="true">›</span>Próxima: <b>${esc(sig.lugar.nombre)}</b> <span class="proxima-ref">${esc(sig.p.referencia)}</span>`;
        q.setAttribute('aria-label', `Ir a la próxima parada: ${sig.lugar.nombre}`);
        marcaProxima.setLngLat(coord(sig.lugar));
      }
      if (!marcaProxima.puesta) { marcaProxima.addTo(map); marcaProxima.puesta = true; }
    } else if (marcaProxima.puesta) { marcaProxima.remove(); marcaProxima.puesta = false; }
  } else {
    if (marcaPablo.puesta) { marcaPablo.remove(); marcaPablo.puesta = false; }
    if (marcaProxima.puesta) { marcaProxima.remove(); marcaProxima.puesta = false; }
  }
  pintarViajeros(verViajes);
  const clave = `${V?.id}|${w?.en.key}|${w?.parada}`;
  if (clave !== clavePablo) { clavePablo = clave; sucio.etiquetas = true; }
  // El nombre de un lugar cambia con la fecha (G-11): si cambia alguno, se reescriben las etiquetas.
  const ep = lugaresConEpoca().map((l) => nombreEn(l, t)).join('|');
  if (ep !== claveEpocas) { claveEpocas = ep; sucio.etiquetas = true; }
  pintarLeyenda(V, w);
  pintarMientras(t);
  if (E.play && w) seguir(w.pos);
}
/** Marcadores de otras personas con viajes (Pedro, Jesús…) cuando BE.donde sabe dónde están. */
function pintarViajeros(ver) {
  const personas = new Set(BE.D.viajes.map((v) => v.persona || 'pablo'));
  personas.delete('pablo');
  for (const p of personas) {
    const w = ver ? BE.donde(p, E.t) : null;
    let m = marcasViajero.get(p);
    if (!w?.pos) { if (m?.puesta) { m.marker.remove(); m.puesta = false; } continue; }
    if (!m) {
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'viajero'; el.dataset.sel = `persona:${p}`;
      el.innerHTML = `<span class="viajero-punto"></span><span class="viajero-rotulo">${esc(nombrePersona(p))}</span>`;
      el.style.setProperty('--accent', colorPersona(p));
      m = { el, marker: new maplibregl.Marker({ element: el, anchor: 'center' }), puesta: false };
      marcasViajero.set(p, m);
    }
    m.marker.setLngLat(w.pos);
    m.el.classList.toggle('estimada', !!w.estimada);
    if (!m.puesta) { m.marker.addTo(map); m.puesta = true; }
  }
}
/** Alto que tapa la hoja inferior en pantallas estrechas, contando la fila del suceso y la leyenda que va encima. */
function altoHoja() {
  if (!estrecha()) return 0;
  return (E.hojaPlegada ? 0 : $('#panel').offsetHeight) + 44;
}
/** Si Pablo se acerca al borde (12 %) o queda bajo la hoja inferior, el mapa lo recentra en la parte visible. */
function seguir(pos, forzar = false) {
  if (!mapaListo || (!forzar && map.isMoving())) return;
  const hoja = altoHoja();
  const c = map.getContainer(), p = map.project(pos);
  const ancho = c.clientWidth, alto = c.clientHeight - hoja, m = 0.12;
  if (p.x < ancho * m || p.x > ancho * (1 - m) || p.y < alto * m || p.y > alto * (1 - m)) {
    map.easeTo({ center: pos, offset: [0, -hoja / 2], duration: 900 });
  }
}
/** Tras un salto en el tiempo, Pablo no puede quedar fuera. */
function seguirPablo() {
  const w = BE.dondeEsta(E.t);
  if (w) seguir(w.pos, true);
}

// ---------------------------------------------------------------------------
// Etiquetas: estados, nombres por época y de hoy (M-03, G-11), reparto sin solapes por importancia (M-14) y
// agrupación de puntos cercanos (M-15)
// ---------------------------------------------------------------------------
function etiquetaHtml(m) {
  const l = m.l;
  const antiguo = nombreEn(l, E.t), hoy = m.hoy;
  let a = antiguo, b = '';
  if (F.nombres === 'actuales') a = hoy || antiguo;
  else if (F.nombres === 'ambos' && hoy) {
    if (E.mapa === 'actual') { a = hoy; b = antiguo; } else b = `hoy ${hoy}`;
  }
  if (m.clase === 'difuso') b = 'ubicación incierta';
  return `<span class="nombre-a">${esc(a)}</span>${b ? `<small class="nombre-b">${esc(b)}</small>` : ''}`;
}
function pintarEtiquetas() {
  if (!mapaListo) return;
  const w = BE.dondeEsta(E.t);
  const V = BE.viajeActual(w);
  const psV = V ? BE.P.filter((s) => s.viaje === V) : [];
  const corte = w ? w.en.i : -1;
  const visitados = new Set(), futuros = new Set();
  if (F.capas.viajes) psV.forEach((s) => { (w && w.en.viaje === V && s.i <= corte ? visitados : futuros).add(s.lugar.id); });
  visitados.forEach((id) => futuros.delete(id));
  const actual = w && w.parada && F.capas.viajes ? w.en.lugar.id : null;
  const deCartas = new Set();
  for (const c of BE.D.cartas) if (cartaEnMapa(c, E.t)) { BE.origenesCarta(c).forEach((x) => deCartas.add(x)); BE.destinosCarta(c).forEach((x) => deCartas.add(x)); }
  const res = resaltadoMapa ?? E.resaltado?.lugares;
  const zoom = map.getZoom();
  const lista = [];
  for (const [id, m] of marcasLugar) {
    const cls = m.el.classList;
    const enRes = res ? res.has(id) : false;
    const esSel = E.sel?.tipo === 'lugar' && E.sel.id === id;
    const oculto = !F.capas.pendientes && m.l.estado === 'pendiente' && !enRes;
    cls.toggle('oculto', oculto);
    cls.toggle('pendiente', m.l.estado === 'pendiente');
    cls.toggle('es-actual', id === actual);
    cls.toggle('visitado', visitados.has(id));
    cls.toggle('futuro', futuros.has(id));
    cls.toggle('de-carta', deCartas.has(id));
    cls.toggle('resaltado', enRes);
    cls.toggle('atenuado', !!res && !enRes);
    const principal = MAYORES.has(id) || visitados.has(id) || futuros.has(id) || deCartas.has(id) || enRes;
    cls.toggle('menor', !principal);
    if (!m.region) {
      const html = etiquetaHtml(m);
      const et = m.el.querySelector('.etiqueta');
      if (et.dataset.html !== html) { et.innerHTML = html; et.dataset.html = html; }
    } else {
      const n = nombreEn(m.l, E.t);
      const rt = m.el.querySelector('.region-texto');
      if (rt.textContent !== n) rt.textContent = n;
    }
    let prio;
    if (oculto) prio = -2;
    else if (id === actual) prio = 100;
    else if (esSel) prio = 95;
    else if (enRes) prio = 80;
    else if (visitados.has(id) || futuros.has(id)) prio = 60;
    else if (deCartas.has(id)) prio = 50;
    else if (MAYORES.has(id)) prio = zoom >= 4.3 ? 40 : -1;
    else prio = zoom >= 6.3 ? 20 : -1;
    if (m.region) prio = oculto ? -2 : esSel || enRes ? 90 : zoom < 8 && zoom >= 3.6 ? 10 : -1;
    if (m.clase === 'agua') prio = oculto ? -2 : esSel || enRes ? 90 : zoom >= (m.l.tipo === 'mar' ? 4 : 6.5) ? 12 : -1;
    lista.push({ m, prio });
  }
  // Agrupación (M-15): los puntos menores que se tocan en pantalla se juntan en una burbuja con su número.
  agrupar(lista.filter((x) => x.m.clase !== 'region' && x.m.clase !== 'agua' && x.prio > -2 && x.prio < 40), zoom);
  const extras = [];
  if (marcaPablo?.puesta) extras.push({ el: marcaPablo.getElement(), sel: '.pablo-rotulo', prio: 99 });
  if (marcaProxima?.puesta) extras.push({ el: marcaProxima.getElement(), sel: null, prio: 70 });
  for (const m of marcasViajero.values()) if (m.puesta) extras.push({ el: m.el, sel: '.viajero-rotulo', prio: 90 });
  // Lugares inciertos: los rótulos del lugar seleccionado (o resaltado) siempre; los de los demás, solo de cerca, porque
  // alrededor de Jerusalén a zoom 7 se pisan entre ellos y con las burbujas.
  for (const [k, m] of marcasCand) {
    const lid = k.slice(0, k.indexOf('|'));
    const suyo = (E.sel?.tipo === 'lugar' && E.sel.id === lid) || !!res?.has(lid);
    const lejos = zoom < 7.5 && !suyo;
    if (!k.endsWith('|')) extras.push({ el: m.el, sel: '.cand-rotulo', prio: m.el.classList.contains('cand--foco') ? 97 : suyo ? 60 : lejos ? -1 : 30 });
    else extras.push({ el: m.el, sel: null, prio: m.el.classList.contains('rotulo-zona--foco') ? 96 : lejos ? -1 : 35 });
  }
  for (const m of marcasCarta.values()) extras.push({ el: m.el, sel: null, prio: m.el.classList.contains('pildora-carta--sel') ? 98 : 45 });
  const cajas = [];
  const choca = (r, c) => !(r.right < c.left || r.left > c.right || r.bottom < c.top || r.top > c.bottom);
  const libre = (r) => cajas.every((c) => !choca(r, c));
  // Lo que un rótulo secundario (prioridad < 90) no puede tapar ni dejar cortado: las tarjetas que flotan sobre el mapa
  // y el borde del mapa. Las burbujas de grupo, que siempre se ven, tampoco (ver abajo).
  const marco = map.getContainer().getBoundingClientRect();
  const caja = (el) => el.getBoundingClientRect();
  const burbujas = marcasGrupo.map((g) => caja(g.el)).filter((r) => r.width > 0);
  const tapas = [$('#mientras'), $('#leyenda')].filter((el) => el && !el.hidden && el.offsetParent).map(caja).filter((r) => r.width > 0);
  const dentro = (r) => r.left >= marco.left && r.right <= marco.right && r.top >= marco.top && r.bottom <= marco.bottom;
  const todos = [
    ...lista.filter((x) => !x.m.el.classList.contains('agrupado')).map((x) => ({ el: x.m.el, medir: x.m.el.querySelector(x.m.region ? '.region-texto' : '.etiqueta'), prio: x.prio })),
    ...extras.map((x) => ({ el: x.el, medir: x.sel ? x.el.querySelector(x.sel) : x.el, prio: x.prio })),
  ].filter((x) => x.medir).sort((a, b) => b.prio - a.prio);
  todos.forEach((x) => x.el.classList.remove('sin-etiqueta'));
  const medidas = todos.map((x) => x.medir.getBoundingClientRect());
  todos.forEach((x, i) => {
    const r = medidas[i];
    // Las burbujas solo apartan a lo secundario (< 50); lo del viaje o de la selección se dibuja encima de ellas.
    const ok = x.prio >= 0 && r.width > 0 && libre(r) && (x.prio >= 90 || (dentro(r) && !tapas.some((c) => choca(r, c))))
      && (x.prio >= 50 || !burbujas.some((c) => choca(r, c)));
    if (ok) cajas.push({ left: r.left - 3, right: r.right + 3, top: r.top - 1, bottom: r.bottom + 1 });
    x.el.classList.toggle('sin-etiqueta', !ok);
  });
}
function agrupar(cands, zoom) {
  for (const x of cands) x.m.el.classList.remove('agrupado');
  const grupos = [];
  if (zoom < 8.5) {
    const pts = cands.map((x) => ({ x, p: map.project([x.m.l.lon, x.m.l.lat]) }));
    const usado = new Set();
    for (let i = 0; i < pts.length; i++) {
      if (usado.has(i)) continue;
      const g = [i];
      for (let j = i + 1; j < pts.length; j++) if (!usado.has(j) && Math.hypot(pts[i].p.x - pts[j].p.x, pts[i].p.y - pts[j].p.y) < 16) g.push(j);
      if (g.length >= 3) { g.forEach((k) => usado.add(k)); grupos.push(g.map((k) => pts[k].x.m)); }
    }
  }
  while (marcasGrupo.length > grupos.length) marcasGrupo.pop().marker.remove();
  grupos.forEach((ms, i) => {
    ms.forEach((m) => m.el.classList.add('agrupado'));
    const lon = ms.reduce((s, m) => s + m.l.lon, 0) / ms.length, lat = ms.reduce((s, m) => s + m.l.lat, 0) / ms.length;
    let g = marcasGrupo[i];
    if (!g) {
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'grupo-lugares';
      el.addEventListener('click', (e) => { e.stopPropagation(); const ids = JSON.parse(el.dataset.ids); map.fitBounds(cajaDe(ids.map((id) => coord(BE.L[id]))), { padding: 80, maxZoom: Math.min(11, map.getZoom() + 3), duration: 600 }); });
      g = { el, marker: new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([lon, lat]).addTo(map) };
      marcasGrupo.push(g);
    }
    g.marker.setLngLat([lon, lat]);
    g.el.textContent = String(ms.length);
    g.el.dataset.ids = JSON.stringify(ms.map((m) => m.l.id));
    g.el.setAttribute('aria-label', `${ms.length} lugares juntos: ${ms.map((m) => m.l.nombre).join(', ')}. Pulsa para acercarte.`);
    g.el.title = ms.map((m) => m.l.nombre).join(' · ');
  });
}

// ---------------------------------------------------------------------------
// Leyenda y «Mientras tanto»
// ---------------------------------------------------------------------------
function pintarLeyenda(V, w) {
  const pendiente = BE.D.cartas.some((c) => cartaEnMapa(c, E.t) && estadoCarta(c, E.t) === 'pendiente');
  const escritores = [...new Set(BE.D.cartas.filter((c) => cartaEnMapa(c, E.t)).map((c) => c.escritor || 'pablo'))];
  const inciertos = claveInciertos.split('|')[0];
  const hallazgos = marcasHallazgo.size > 0;
  const cerca = viajesCerca(E.t);
  const clave = `${V?.id}|${w?.estimada}|${E.sel?.tipo}|${E.sel?.id}|${pendiente}|${escritores}|${inciertos}|${hallazgos}|${F.capas.viajes}|${F.nivel1}|${cerca}`;
  if (clave === pintarLeyenda.clave) return;
  pintarLeyenda.clave = clave;
  const filas = [];
  const S = E.sel?.tipo === 'viaje' ? BE.D.viajes.find((v) => v.id === E.sel.id) : null;   // viaje seleccionado abajo
  const titulo = S || (F.capas.viajes ? V : null);
  if ((F.capas.viajes && cerca) || S) {
    if (V && (!S || S === V)) {
      filas.push('<div class="be-legend__row"><span class="be-legend__line"></span>Recorrido hasta esta fecha</div>');
      if (BE.P.some((s) => s.viaje === V && s.lugar.precision === 'zona')) filas.push('<div class="be-legend__row"><span class="be-legend__line be-legend__line--approx"></span>Ruta sin trazado conocido (región)</div>');
      filas.push('<div class="be-legend__row"><span class="be-legend__line be-legend__line--todo"></span>Lo que falta del viaje</div>');
    }
    if (S) filas.push(`<div class="be-legend__row"><span class="be-legend__line${S === V ? ' be-legend__line--todo' : ''}"></span>${S === V ? 'Solo este viaje' : 'Solo este viaje, completo'}; vuelve a pulsarlo para ver todos</div>`);
    else filas.push('<div class="be-legend__row"><span class="leyenda-rastro"></span>Otros viajes: gris claro si ya pasaron, más claro si aún no</div>');
  }
  if (escritores.length) {
    filas.push(`<div class="be-legend__row"><span class="be-legend__line be-legend__line--letter" style="--carta:${colorEscritor(escritores[0])}"></span>Carta ${escritores.length > 1 ? `de ${esc(nombrePersona(escritores[0]))}` : 'escrita cerca de esta fecha'}</div>`);
    for (const e of escritores.slice(1)) filas.push(`<div class="be-legend__row"><span class="be-legend__line be-legend__line--letter" style="--carta:${colorEscritor(e)}"></span>Carta de ${esc(nombrePersona(e))}</div>`);
  }
  if (pendiente) filas.push('<div class="be-legend__row"><span class="be-legend__line be-legend__line--pendiente"></span>Carta que escribirá poco después</div>');
  // Lo incierto: con un lugar incierto seleccionado, cada estado de sus candidatos; si no, una sola fila.
  const selIncierto = E.sel?.tipo === 'lugar' && candidatosDe(BE.L[E.sel.id]) ? BE.L[E.sel.id] : null;
  if (selIncierto) {
    const estados = new Set(candidatosVisibles(selIncierto).map(({ c }) => c.estado));
    for (const [k, s] of Object.entries(CAND)) if (estados.has(k)) filas.push(`<div class="be-legend__row"><span class="leyenda-cand leyenda-cand--${k}" style="--cand:${s.color}"></span>${esc(s.rotulo)}</div>`);
  } else if (inciertos) filas.push(`<div class="be-legend__row"><span class="leyenda-cand leyenda-cand--favorecido_nivel_1" style="--cand:${CAND.favorecido_nivel_1.color}"></span>Lugar incierto: zona o candidatos, nunca un punto</div>`);
  if (hallazgos) filas.push('<div class="be-legend__row"><span class="leyenda-hallazgo"></span>Hallazgo arqueológico</div>');
  if (F.capas.viajes && cerca) filas.push('<div class="be-legend__row"><span class="leyenda-estimada"></span>Posición estimada (tiempo narrativo)</div>');
  else if (F.capas.viajes && !S) filas.push('<div class="be-legend__row be-muted">Ningún viaje cerca de esta fecha</div>');
  if (F.nivel1) filas.push('<div class="be-legend__row"><span class="be-tier be-tier--1" data-n="1">Solo nivel 1</span></div>');
  const cabecera = titulo ? `${esc(titulo.nombre)} · ${esc(fechaCorta(titulo.fecha))}` : selIncierto ? `${esc(selIncierto.nombre)} · cómo dibujamos lo incierto` : F.capas.viajes && cerca ? 'Viajes de Pablo' : 'Leyenda';
  $('#leyenda').innerHTML = `<div class="be-card__eyebrow">${cabecera}</div>${filas.join('')}`;
  $('#leyenda').style.setProperty('--accent', titulo ? colorViaje(titulo.id) : '');
  if (marcaPablo) marcaPablo.getElement().style.setProperty('--accent', V ? colorViaje(V.id) : '');
}
/** El suceso más concreto de esta fecha: con cientos de sucesos, el primero de la lista suele ser uno de todo un siglo.
    Uno que dura más de cinco años y más que el tramo a la vista no es «mientras tanto» sino el fondo: no se enseña. */
function sucesoMientras(t) {
  let ev = null, ancho = Infinity;
  for (const e of BE.D.eventos || []) { const v = BE.ventanaEvento(e); if (v && t >= v[0] && t < v[1] && v[1] - v[0] < ancho) { ev = e; ancho = v[1] - v[0]; } }
  return ev && ancho <= Math.max(5, BE.span()) ? ev : null;
}
function pintarMientras(t) {
  const ev = sucesoMientras(t);
  const el = $('#mientras'), tira = $('#tira-suceso');
  const clave = ev ? ev.id : '';
  if (clave === pintarMientras.clave) return;
  pintarMientras.clave = clave;
  if (!ev) { el.hidden = true; tira.hidden = true; return; }
  const lugar = (ev.lugares || []).map((id) => BE.L[id]?.nombre).filter(Boolean)[0];
  const dePablo = (ev.personas || []).includes('pablo');
  el.hidden = false;
  tira.hidden = false;
  tira.dataset.sel = `evento:${ev.id}`;
  tira.innerHTML = `<span class="tira-suceso__tipo">${dePablo ? 'Suceso' : 'Mientras tanto'}${lugar ? ` · ${esc(lugar)}` : ''}</span> ${esc(ev.titulo)}`;
  el.innerHTML = `<div class="be-card__eyebrow">${dePablo ? 'Suceso' : 'Mientras tanto'}${lugar ? ` · ${esc(lugar)}` : ''}</div>
    <button type="button" class="mientras-titulo" data-sel="evento:${esc(ev.id)}">${esc(ev.titulo)}</button>
    <p>${esc(ev.resumen)}</p>
    <div class="fila-chips">${BE.chipsCitas((ev.pasajes || []).join('; '))}<span class="be-chrono be-chrono--tnm">${esc(ev.fecha?.texto || fechaCorta(ev.fecha))}</span></div>`;
}

// ---------------------------------------------------------------------------
// Menú de capas y filtros (M-20) y «Nombres de este encuadre» (pantalla 02)
// ---------------------------------------------------------------------------
class ControlCapas {
  onAdd() {
    const d = document.createElement('div');
    d.className = 'maplibregl-ctrl maplibregl-ctrl-group control-capas';
    d.innerHTML = `<button type="button" id="capas-boton" aria-expanded="false" aria-controls="capas-menu" title="Capas y filtros" aria-label="Capas y filtros"><svg class="be-i" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 4 9 5-9 5-9-5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m3 13.5 9 5 9-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>
      <button type="button" id="nombres-boton" aria-expanded="false" aria-controls="nombres-encuadre" title="Nombres de este encuadre: antiguo y de hoy" aria-label="Nombres de este encuadre"><span class="aa" aria-hidden="true">Aa</span></button>`;
    d.querySelector('#capas-boton').addEventListener('click', () => abrirPanelMapa('capas'));
    d.querySelector('#nombres-boton').addEventListener('click', () => abrirPanelMapa('nombres'));
    return d;
  }
  onRemove() {}
}
function crearPanelesMapa() {
  const mapa = $('#mapa');
  mapa.insertAdjacentHTML('beforeend', `<div class="be-float panel-mapa capas-menu" id="capas-menu" role="dialog" aria-label="Capas y filtros" hidden></div>
    <div class="be-float panel-mapa nombres-encuadre" id="nombres-encuadre" role="dialog" aria-label="Nombres de este encuadre" hidden></div>
    <button type="button" class="be-float situacion" id="situacion" aria-label="Mapa de situación: pulsa para ir a ese punto" title="Dónde estás en el mundo bíblico" hidden><img src="maps/mundo-mini.webp" alt=""><span class="situacion-recuadro"></span></button>`);
  const menu = $('#capas-menu');
  menu.addEventListener('change', (e) => {
    const x = e.target;
    if (x.name === 'capa') F.capas[x.value] = x.checked;
    else if (x.name === 'nombres') F.nombres = x.value;
    else if (x.name === 'cartas') F.cartas = x.value;
    else if (x.name === 'nivel1') F.nivel1 = x.checked;
    filtrosCambiados();
    pintarNombresEncuadre();
  });
  const nom = $('#nombres-encuadre');
  nom.addEventListener('change', (e) => { if (e.target.name === 'nombres-2') { F.nombres = e.target.value; filtrosCambiados(); pintarNombresEncuadre(); } });
  nom.addEventListener('click', (e) => {
    const f = e.target.closest('[data-lugar]');
    if (!f) return;
    const id = f.dataset.lugar;
    resaltar([id]);
    encuadrarLugares([id]);
    nom.querySelectorAll('[data-lugar]').forEach((x) => x.classList.toggle('fila--foco', x === f));
  });
  for (const p of [menu, nom]) p.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); abrirPanelMapa(null); } });
  $('#situacion').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    const lon = MUNDO.oeste + fx * (MUNDO.este - MUNDO.oeste);
    const lat = latDeY(mercY(MUNDO.norte) - fy * (mercY(MUNDO.norte) - mercY(MUNDO.sur)));
    map.easeTo({ center: [lon, lat], duration: 700 });
  });
  pintarMenuCapas();
}
let panelAbierto = null;
function abrirPanelMapa(cual) {
  panelAbierto = panelAbierto === cual ? null : cual;
  $('#capas-menu').hidden = panelAbierto !== 'capas';
  $('#nombres-encuadre').hidden = panelAbierto !== 'nombres';
  $('#capas-boton')?.setAttribute('aria-expanded', String(panelAbierto === 'capas'));
  $('#nombres-boton')?.setAttribute('aria-expanded', String(panelAbierto === 'nombres'));
  if (panelAbierto !== 'nombres' && resaltadoMapa) resaltar(null);
  pintarNombresEncuadre();
  if (panelAbierto) (panelAbierto === 'capas' ? $('#capas-menu') : $('#nombres-encuadre')).querySelector('input, button')?.focus();
}
function pintarMenuCapas() {
  const menu = $('#capas-menu');
  if (!menu) return;
  const radio = (grupo, [k, t], actual) => `<label class="capa-opcion"><input type="radio" name="${grupo}" value="${k}"${actual === k ? ' checked' : ''}> ${esc(t)}</label>`;
  menu.innerHTML = `<fieldset><legend class="be-card__eyebrow">Capas</legend>${CAPAS.map(([k, t]) => `<label class="capa-opcion"><input type="checkbox" name="capa" value="${k}"${F.capas[k] ? ' checked' : ''}> ${esc(t)}${k === 'pendientes' ? ' <span class="muestra-pendiente" aria-hidden="true"></span>' : ''}</label>`).join('')}</fieldset>
    <fieldset><legend class="be-card__eyebrow">Fuentes</legend><label class="capa-opcion"><input type="checkbox" name="nivel1"${F.nivel1 ? ' checked' : ''}> Solo nivel 1 <span class="be-muted">(Biblia y jw.org)</span></label></fieldset>
    <fieldset><legend class="be-card__eyebrow">Nombres en el mapa</legend>${NOMBRES.map((o) => radio('nombres', o, F.nombres)).join('')}</fieldset>
    <fieldset><legend class="be-card__eyebrow">Cartas</legend>${FILTRO_CARTAS.map((o) => radio('cartas', o, F.cartas)).join('')}</fieldset>`;
  document.querySelector('#capas-boton')?.classList.toggle('con-filtros', CAPAS.some(([k]) => !F.capas[k]) || F.nivel1 || F.cartas !== 'cerca');
}
function pintarNombresEncuadre() {
  const el = $('#nombres-encuadre');
  if (!el || el.hidden || !map) return;
  const b = map.getBounds();
  const filas = [];
  for (const l of Object.values(BE.L)) {
    const cs = candidatosDe(l);
    const p = cs ? (candidatosVisibles(l)[0] && centroCandidato(candidatosVisibles(l)[0].c)) : conPunto(l) ? coord(l) : null;
    if (!p || !b.contains(p)) continue;
    const hoy = nombreHoy(l);
    if (!hoy && !cs) continue;
    filas.push({ l, hoy, cs });
  }
  filas.sort((a, b2) => a.l.nombre.localeCompare(b2.l.nombre, 'es'));
  const epoca = (l) => (l.nombres || []).filter((n) => n.desde != null || n.hasta != null).map((n) => `${n.nombre} (${n.desde != null ? BE.fmtAnio(n.desde) : '…'} - ${n.hasta != null ? BE.fmtAnio(n.hasta) : '…'})`).join(' · ');
  el.innerHTML = `<div class="nombres-cab"><h3 class="be-card__eyebrow">Nombres de este encuadre <b class="cuenta">${filas.length}</b></h3>
      <div class="be-seg nombres-seg" role="radiogroup" aria-label="Nombres en el mapa">${NOMBRES.map(([k, t]) => `<label class="be-seg__opt${F.nombres === k ? ' be-seg__opt--on' : ''}"><input class="sr-only" type="radio" name="nombres-2" value="${k}"${F.nombres === k ? ' checked' : ''}>${esc(t.replace('Los dos donde ayuda', 'Los dos'))}</label>`).join('')}</div></div>
    ${filas.length ? `<table class="tabla-nombres"><thead><tr><th scope="col">TNM</th><th scope="col">Hoy</th></tr></thead><tbody>${filas.map(({ l, hoy, cs }) => `<tr><td colspan="2"><button type="button" class="fila-nombre" data-lugar="${esc(l.id)}"><span><b>${esc(l.nombre)}</b>${epoca(l) ? `<small>${esc(epoca(l))}</small>` : ''}</span><span>${cs ? '<i class="be-muted">sin identificar</i>' : esc(hoy)}</span></button></td></tr>`).join('')}</tbody></table>` : '<p class="be-muted">Ningún lugar de este encuadre tiene nombre de hoy en los datos. Aléjate o muévete.</p>'}
    <p class="nota-nombres">Las provincias antiguas, como Asia (Ap 1:4), no coinciden con los países de hoy: no las traducimos, las superponemos.</p>
    <p class="nota-nombres"><span class="be-tier be-tier--2" data-n="2">OpenBible.info</span> Coordenadas de OpenBible.info (CC BY 4.0): solo tomamos el punto, nunca su identificación.</p>`;
}
/** Mapa de situación (M-16): el mundo bíblico en pequeño con el recuadro de lo que se ve. */
function pintarSituacion() {
  const el = $('#situacion');
  if (!el || !map) return;
  const ver = !estrecha() && map.getZoom() >= 6.6;
  if (el.hidden === ver) el.hidden = !ver;
  if (!ver) return;
  const b = map.getBounds();
  const W = el.clientWidth, H = el.clientHeight;
  const x = (lon) => ((lon - MUNDO.oeste) / (MUNDO.este - MUNDO.oeste)) * W;
  const y = (lat) => ((mercY(MUNDO.norte) - mercY(lat)) / (mercY(MUNDO.norte) - mercY(MUNDO.sur))) * H;
  const r = el.querySelector('.situacion-recuadro');
  const x0 = clamp(x(b.getWest()), 0, W), x1 = clamp(x(b.getEast()), 0, W), y0 = clamp(y(b.getNorth()), 0, H), y1 = clamp(y(b.getSouth()), 0, H);
  Object.assign(r.style, { left: `${x0}px`, top: `${y0}px`, width: `${Math.max(4, x1 - x0)}px`, height: `${Math.max(4, y1 - y0)}px` });
}

// ---------------------------------------------------------------------------
// Encuadre y resaltado
// ---------------------------------------------------------------------------
/** Al abrir sin selección, si Pablo queda fuera de la vista o bajo la hoja inferior, centra el mapa en él. Si los datos
    no lo sitúan en esta fecha, encuadra los lugares de «Ahora mismo» (quién está dónde) o, si no hay, los del suceso de
    «Mientras tanto» o, si tampoco, la capital de quien gobierna, para que el mapa no se quede en el Egeo hablando de
    otra época. */
function mostrarPablo() {
  if (E.sel) return;
  const w = BE.dondeEsta(E.t);
  if (!w) {
    const r = BE.resumenAhora?.(E.t);
    let ids = r ? r.lugares.map((g) => g.lugar.id) : [];
    if (!ids.length) ids = (sucesoMientras(E.t)?.lugares || []).filter((id) => BE.L[id]);
    if (!ids.length && r) ids = [...new Set(r.gobierno.flatMap((p) => p.lugares || []))].filter((id) => BE.L[id]);   // la corte de esa fecha
    const pts = ids.flatMap(puntosDe);
    if (!pts.length) return;
    const b = map.getBounds();
    if (pts.every(([x, y]) => b.contains([x, y]))) return;
    // Como encuadrarLugares, pero sin dejar nada bajo la tarjeta «Mientras tanto» (arriba a la derecha en escritorio).
    const padding = rellenoEncuadre(), mi = $('#mientras');
    if (!estrecha() && mi && !mi.hidden && mi.offsetParent) padding.right = Math.max(padding.right, mi.offsetWidth + 40);
    map.fitBounds(cajaDe(pts), { padding, maxZoom: pts.length > 1 ? 7 : Math.max(map.getZoom(), 5.5), duration: 700 });
    return;
  }
  const hoja = altoHoja();
  const c = map.getContainer(), q = map.project(w.pos), m = 40;
  if (q.x > m && q.x < c.clientWidth - m && q.y > m && q.y < c.clientHeight - hoja - m) return;
  map.jumpTo({ center: w.pos, zoom: estrecha() ? Math.max(map.getZoom(), 5.5) : map.getZoom() });
  const cq = map.project(w.pos);
  map.jumpTo({ center: map.unproject([cq.x, cq.y + hoja / 2]) });
}
/** Caja [[oeste, sur], [este, norte]] de unos puntos, ensanchada km a cada lado si se pide. */
function cajaDe(pts, km = 0) {
  const lons = pts.map((p) => p[0]), lats = pts.map((p) => p[1]);
  const dLat = km / 111, dLon = km / (111 * Math.cos((lats[0] * Math.PI) / 180));
  return [[Math.min(...lons) - dLon, Math.min(...lats) - dLat], [Math.max(...lons) + dLon, Math.max(...lats) + dLat]];
}
function rellenoEncuadre() {
  const hoja = altoHoja(), alto = map.getContainer().clientHeight;
  // En escritorio la leyenda ocupa la esquina de abajo a la izquierda: lo encuadrado no queda debajo de ella. Al
  // encuadrar, la leyenda aún puede tener el contenido de antes, así que se cuenta al menos su alto habitual.
  const ley = $('#leyenda'), bajoLeyenda = !estrecha() && ley && ley.offsetParent ? Math.max(ley.offsetHeight, 210) + 40 : 0;
  return { top: estrecha() ? 56 : 80, bottom: Math.min(Math.max(hoja + 50, bajoLeyenda), alto * 0.6), left: estrecha() ? 30 : 70, right: estrecha() ? 50 : 80 };
}
/** Puntos que ocupa un lugar: su coordenada o, si es incierto, sus candidatos con el borde de cada zona. */
function puntosDe(id) {
  const l = BE.L[id];
  if (!l) return [];
  if (!candidatosDe(l)) return l.lat != null ? [[l.lon, l.lat]] : [];
  const out = [];
  for (const { c } of candidatosVisibles(l)) {
    const g = c.geometria;
    if (g.tipo === 'zona') out.push(...cajaDe([[g.lon, g.lat]], g.radio_km));
    else { out.push([g.lon, g.lat]); if (g.hasta) out.push([g.hasta.lon, g.hasta.lat]); }
  }
  return out;
}
function encuadrarLugares(ids) {
  const pts = ids.flatMap(puntosDe);
  if (!pts.length || !map) return;
  const padding = rellenoEncuadre();
  if (pts.length === 1) {   // fitBounds no deja el relleno fijado en el mapa, easeTo sí
    const [x, y] = pts[0];
    map.fitBounds([[x - 0.01, y - 0.01], [x + 0.01, y + 0.01]], { padding, maxZoom: Math.max(map.getZoom(), 5.5), duration: 700 });
    return;
  }
  map.fitBounds(cajaDe(pts), { padding, maxZoom: 7, duration: 700 });
}
/** Resalta en el mapa estos lugares por encima de lo que implique la selección. resaltar(null) vuelve a la selección. */
function resaltar(ids) {
  resaltadoMapa = ids ? new Set(ids) : null;
  sucio.etiquetas = sucio.mapa = true; programar();
}
function volverAlInicio() { map?.fitBounds(ENCUADRE_INICIAL, { duration: 600 }); }
/** Arranque del mapa: MapLibre, marcas al cargar, cortina y modo inicial. Sin MapLibre, la línea y las fichas siguen. */
function iniciar() {
  calcularColores();
  if (!window.maplibregl) {
    $('#mapa').insertAdjacentHTML('beforeend', '<p class="sin-mapa">No se pudo cargar MapLibre desde unpkg.com. La línea de tiempo y las fichas funcionan sin mapa.</p>');
  } else {
    crearPanelesMapa();
    crearMapa();
    map.once('load', () => { crearMarcas(); sucio.mapa = sucio.etiquetas = true; programar(); pintarSituacion(); requestAnimationFrame(() => requestAnimationFrame(mostrarPablo)); });
  }
  iniciarCortina();
  ponerMapa(E.mapa, false);
  // «Mientras tanto» depende también del tramo a la vista: al cambiar el zoom de la línea se revisa.
  BE.pintores.push((c) => { if (c.linea && !c.mapa && mapaListo) pintarMientras(E.t); });
  // Al cambiar de selección, el candidato marcado deja de valer.
  BE.pintores.push(() => { if (candFoco && !(E.sel?.tipo === 'lugar' && E.sel.id === candFoco.lugar)) { candFoco = null; claveInciertos = ''; sucio.mapa = true; } });
  document.addEventListener('click', (e) => {
    if (!panelAbierto) return;
    if (e.target.closest('#capas-menu, #nombres-encuadre, .control-capas')) return;
    abrirPanelMapa(null);
  });
}

BE.mapa = { resaltar, encuadrar: encuadrarLugares, volverAlInicio, iniciar, enfocarCandidato, get candidatoFoco() { return candFoco; }, get gl() { return map; } };
Object.assign(BE, {
  ponerMapa, pintarMapa, pintarEtiquetas, seguirPablo, cartaVisible, cartaEnMapa, estadoCarta, colorViaje, colorEscritor, colorPersona,
  nombreHoy, nombreEn, candidatosDe, candidatosVisibles, CANDIDATO: CAND, ventanaDeCarta,
});
})();
