/* biblical-earth · mapa: MapLibre, relieve antiguo y actual, cortina, rutas, arcos de cartas, marcas de lugar, marcador
   de Pablo, etiquetas sin solapes, leyenda y tarjeta «Mientras tanto». Dueño durante el reparto: app-mapa.
   Interfaz fija para los demás: BE.mapa.resaltar(ids) y BE.mapa.encuadrar(ids). */
'use strict';
(() => {
const BE = window.BE;
const { E, sucio, programar, esc, $, clamp, tramo, fechaCorta, mercY, latDeY, ES_FILE, seleccionar, setT, asegurarVisible, guardarHash, avisar } = BE;

const EXT = { oeste: 10, este: 44, sur: 28, norte: 44 };   // extensión de las imágenes de relieve
const ESQUINAS = [[EXT.oeste, EXT.norte], [EXT.este, EXT.norte], [EXT.este, EXT.sur], [EXT.oeste, EXT.sur]];
const MAPA_ANTIGUO = 'maps/mediterraneo-antiguo.webp';
const MAPA_ACTUAL = 'maps/mediterraneo-actual.webp';
const ESTILO_ACTUAL = 'https://tiles.openfreemap.org/styles/positron';
const ATRIBUCION = 'Relieve: Natural Earth, USGS SRTM/GMTED2010, NOAA ETOPO1, Copernicus EU-DEM, Mapzen · Costas y ríos: Natural Earth · Coordenadas: <a href="https://www.openbible.info/geo/" target="_blank" rel="noopener">OpenBible.info</a> (CC BY 4.0)';
const MAYORES = new Set(['roma', 'jerusalen', 'antioquia-de-siria', 'efeso', 'corinto', 'atenas', 'filipos', 'tesalonica']);
let map = null, mapaListo = false, capasBase = [], estiloReserva = false;

const ENCUADRE_INICIAL = [[19.2, 34.0], [37.2, 42.2]];
let resaltadoMapa = null;           // Set de ids que pide BE.mapa.resaltar; null: manda la selección

const OCULTAR_EN_ACTUAL = /^(highway|road_|airport|label_other|label_village|label_town|label_city|label_state|poi|housenumber|aeroway|building)/;
const marcasLugar = new Map();       // id → { marker, el }
const marcasCarta = new Map();       // clave de arco → { marker, el }
let marcaPablo = null, marcaProxima = null, imgDom = null;
let cortina = null;                  // { canvas, ctx, img, fuente }

function crearMapa() {
  map = new maplibregl.Map({
    container: 'mapa-gl',
    style: ESTILO_ACTUAL,
    bounds: ENCUADRE_INICIAL,
    maxBounds: [[7, 25.5], [47, 46]],
    minZoom: 3, maxZoom: 11,
    dragRotate: false, pitchWithRotate: false, touchPitch: false,
    renderWorldCopies: false, fadeDuration: 0,
    // En pantallas estrechas la atribución se pliega en un botón (i) para no tapar el mapa.
    attributionControl: { compact: matchMedia('(max-width: 760px)').matches, customAttribution: ATRIBUCION },
  });
  map.touchZoomRotate.disableRotation();
  // MapLibre abre la atribución compacta al cargar; en móvil empieza plegada y se abre con su botón (i).
  map.once('load', () => {
    map.getContainer().querySelector('.maplibregl-compact-show')?.classList.remove('maplibregl-compact-show');
    // En el mapa actual la atribución ocupa dos líneas: la leyenda sube lo que haga falta para no taparla.
    const attrib = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
    if (attrib) new ResizeObserver(() => { $('#leyenda').style.bottom = `${Math.max(28, attrib.offsetHeight + 10)}px`; }).observe(attrib);
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-right');
  let cargado = false, reintentado = false;
  map.on('error', (e) => {
    // Si el estilo de OpenFreeMap no llega, el mapa «actual» usa nuestro relieve con colores de atlas.
    const url = String(e?.error?.url || '');
    if (!cargado && !estiloReserva && url.includes('/styles/')) {
      if (!reintentado) { reintentado = true; setTimeout(() => map.setStyle(ESTILO_ACTUAL, { diff: false }), 1000); return; }
      console.warn('El estilo de OpenFreeMap no respondió; el mapa actual usa nuestro relieve.', e?.error?.message);
      estiloReserva = true; map.setStyle(estiloSinTeselas(), { diff: false }); return;
    }
    if (e?.error?.message) console.warn('Mapa:', e.error.message, url);
  });
  map.on('style.load', () => { cargado = true; montarCapas(); });
  map.on('moveend', () => { sucio.etiquetas = true; programar(); if (E.mapa === 'cortina') pintarCortina(); });
  map.on('move', () => { if (imgDom) colocarImgDom(); if (E.mapa === 'cortina') pintarCortina(); });
  map.on('resize', () => { if (imgDom) colocarImgDom(); });
  // Un clic en una marca HTML (lugar, píldora) también llega a MapLibre: esa marca ya lo gestiona el delegado general.
  const enMarca = (e) => !!e.originalEvent?.target?.closest?.('.maplibregl-marker');
  for (const capa of ['be-cartas-toque']) {
    map.on('click', capa, (e) => { if (enMarca(e)) return; const id = e.features?.[0]?.properties?.id; if (id) seleccionar({ tipo: 'carta', id }); });
    map.on('mouseenter', capa, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', capa, () => { map.getCanvas().style.cursor = ''; });
  }
  for (const capa of ['be-hecho', 'be-falta']) {
    map.on('click', capa, (e) => { if (enMarca(e)) return; const id = e.features?.[0]?.properties?.viaje; if (id) seleccionar({ tipo: 'viaje', id }, { mover: false }); });
  }
}
function estiloSinTeselas() {
  return {
    version: 8, sources: {},
    layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#dfe8ec' } }],
  };
}
function montarCapas() {
  capasBase = map.getStyle().layers.map((l) => l.id);
  // Etiquetas de países y mares en español cuando las teselas las traen.
  for (const l of map.getStyle().layers) {
    if (l.type === 'symbol' && /^(label_country|water_name)/.test(l.id)) {
      map.setLayoutProperty(l.id, 'text-field', ['coalesce', ['get', 'name:es'], ['get', 'name:latin'], ['get', 'name']]);
    }
    // Los países de hoy chocan con nuestras regiones antiguas («Macedonia del Norte» sobre MACEDONIA), que se ven por
    // debajo del zoom 8: los países solo aparecen a partir de ahí.
    if (/^label_country/.test(l.id)) map.setLayerZoomRange(l.id, Math.max(8, l.minzoom ?? 0), l.maxzoom ?? 24);
  }
  if (estiloReserva && !ES_FILE) {
    map.addSource('be-actual', { type: 'image', url: MAPA_ACTUAL, coordinates: ESQUINAS });
    map.addLayer({ id: 'be-actual', type: 'raster', source: 'be-actual', paint: { 'raster-fade-duration': 0 } });
    capasBase.push('be-actual');
  }
  if (!ES_FILE) {
    map.addSource('be-antiguo', { type: 'image', url: MAPA_ANTIGUO, coordinates: ESQUINAS });
    map.addLayer({ id: 'be-antiguo', type: 'raster', source: 'be-antiguo', paint: { 'raster-fade-duration': 0 } });
  } else if (!imgDom) {
    // Desde file:// MapLibre no puede leer la imagen (CORS). La ponemos como <img> bajo el lienzo, alineada a mano.
    imgDom = document.createElement('img');
    imgDom.className = 'antiguo-dom'; imgDom.alt = ''; imgDom.src = MAPA_ANTIGUO;
    map.getContainer().prepend(imgDom);
    colocarImgDom();
  }
  const vacio = { type: 'FeatureCollection', features: [] };
  for (const id of ['be-rastro', 'be-hecho', 'be-falta', 'be-cartas', 'be-halo']) map.addSource(id, { type: 'geojson', data: vacio });
  const lineas = { 'line-cap': 'round', 'line-join': 'round' };
  for (const [id, color] of Object.entries(COLOR_VIAJE)) map.addImage(`be-flecha-${id}`, imagenFlecha(color));
  const flecha = (placement, opacity, spacing) => ({ type: 'symbol', layout: { 'symbol-placement': placement, 'symbol-spacing': spacing, 'icon-image': ['concat', 'be-flecha-', ['get', 'viaje']], 'icon-size': 0.5, 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true }, paint: { 'icon-opacity': opacity } });
  map.addLayer({ id: 'be-rastro', type: 'line', source: 'be-rastro', layout: lineas, paint: { 'line-color': colorPorViaje(), 'line-width': 2.2, 'line-opacity': ['case', ['get', 'futuro'], 0.3, 0.55] } });
  map.addLayer({ id: 'be-rastro-flechas', source: 'be-rastro', ...flecha('line', ['case', ['get', 'futuro'], 0.35, 0.6], 90) });
  map.addLayer({ id: 'be-cartas-pendiente', type: 'line', source: 'be-cartas', filter: ['==', ['get', 'estado'], 'pendiente'], layout: lineas, paint: { 'line-color': '#b8892f', 'line-width': 1.6, 'line-dasharray': [0.5, 2.5], 'line-opacity': 0.8 } });
  map.addLayer({ id: 'be-cartas-escrita', type: 'line', source: 'be-cartas', filter: ['==', ['get', 'estado'], 'escrita'], layout: { 'line-join': 'round' }, paint: { 'line-color': '#b8892f', 'line-width': 1.8, 'line-dasharray': [3, 2.5], 'line-opacity': 0.85 } });
  map.addLayer({ id: 'be-cartas-sel-casing', type: 'line', source: 'be-cartas', filter: ['==', ['get', 'estado'], 'sel'], layout: lineas, paint: { 'line-color': '#fffdf8', 'line-width': 7, 'line-opacity': 0.85 } });
  map.addLayer({ id: 'be-cartas-sel', type: 'line', source: 'be-cartas', filter: ['==', ['get', 'estado'], 'sel'], layout: { 'line-join': 'round' }, paint: { 'line-color': '#b8892f', 'line-width': 4, 'line-dasharray': [2.2, 1] } });
  map.addLayer({ id: 'be-halo', type: 'circle', source: 'be-halo', paint: { 'circle-radius': 16, 'circle-color': 'rgba(184,137,47,0.12)', 'circle-stroke-color': '#b8892f', 'circle-stroke-width': 1.5 } });
  map.addLayer({ id: 'be-falta', type: 'line', source: 'be-falta', layout: lineas, paint: { 'line-color': colorPorViaje(), 'line-width': 2.5, 'line-dasharray': [0.3, 2.6], 'line-opacity': 0.75 } });
  map.addLayer({ id: 'be-hecho-casing', type: 'line', source: 'be-hecho', layout: lineas, paint: { 'line-color': '#fffcf4', 'line-width': 7, 'line-opacity': 0.8 } });
  map.addLayer({ id: 'be-hecho', type: 'line', source: 'be-hecho', filter: ['!', ['get', 'incierto']], layout: lineas, paint: { 'line-color': colorPorViaje(), 'line-width': 3.5 } });
  map.addLayer({ id: 'be-hecho-incierto', type: 'line', source: 'be-hecho', filter: ['get', 'incierto'], layout: { 'line-join': 'round' }, paint: { 'line-color': colorPorViaje(), 'line-width': 3, 'line-dasharray': [3, 2], 'line-opacity': 0.9 } });
  map.addLayer({ id: 'be-falta-flechas', source: 'be-falta', ...flecha('line-center', 0.6, 80) });
  map.addLayer({ id: 'be-hecho-flechas', source: 'be-hecho', ...flecha('line-center', 1, 80) });
  map.addLayer({ id: 'be-cartas-toque', type: 'line', source: 'be-cartas', layout: lineas, paint: { 'line-color': '#000', 'line-width': 16, 'line-opacity': 0 } });
  mapaListo = true;
  if (cortina) { cortina = null; }
  aplicarModoMapa();
  sucio.mapa = sucio.etiquetas = true;
  programar();
}
function colocarImgDom() {
  const a = map.project([EXT.oeste, EXT.norte]), b = map.project([EXT.este, EXT.sur]);
  Object.assign(imgDom.style, { left: `${a.x}px`, top: `${a.y}px`, width: `${b.x - a.x}px`, height: `${b.y - a.y}px` });
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
  if (guardar) guardarHash();
}
function aplicarModoMapa() {
  const antiguo = E.mapa === 'antiguo';
  for (const id of capasBase) {
    if (!map.getLayer(id)) continue;
    const ver = !antiguo && !(OCULTAR_EN_ACTUAL.test(id));
    map.setLayoutProperty(id, 'visibility', ver ? 'visible' : 'none');
  }
  if (map.getLayer('be-antiguo')) map.setLayoutProperty('be-antiguo', 'visibility', antiguo ? 'visible' : 'none');
  if (imgDom) imgDom.hidden = !antiguo;
  if (E.mapa === 'cortina') montarCortina(); else if (cortina && map.getLayer('be-cortina')) map.setLayoutProperty('be-cortina', 'visibility', 'none');
}
/** Cortina: el relieve antiguo se pinta en un lienzo solo a la izquierda del asa. En Mercator la longitud es lineal en x, así que el recorte es exacto. */
async function montarCortina() {
  if (!cortina) {
    const img = new Image();
    img.src = MAPA_ANTIGUO;
    try { await img.decode(); } catch { return; }
    if (cortina) return;
    const canvas = document.createElement('canvas');
    canvas.width = 2048; canvas.height = Math.round(2048 * img.naturalHeight / img.naturalWidth);
    cortina = { canvas, ctx: canvas.getContext('2d'), img };
    map.addSource('be-cortina', { type: 'canvas', canvas, coordinates: ESQUINAS, animate: false });
    map.addLayer({ id: 'be-cortina', type: 'raster', source: 'be-cortina', paint: { 'raster-fade-duration': 0 } }, 'be-rastro');
  }
  if (E.mapa !== 'cortina') return;
  map.setLayoutProperty('be-cortina', 'visibility', 'visible');
  pintarCortina();
}
let cortinaPausa = 0;
function pintarCortina() {
  const el = $('#cortina');
  const w = map.getContainer().clientWidth;
  const x = E.cortinaX * w;
  el.style.setProperty('--x', `${x}px`);
  if (!cortina) return;
  const lon = map.unproject([x, map.getContainer().clientHeight / 2]).lng;
  const f = clamp((lon - EXT.oeste) / (EXT.este - EXT.oeste), 0, 1);
  const { canvas, ctx, img } = cortina;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (f > 0) ctx.drawImage(img, 0, 0, f * img.naturalWidth, img.naturalHeight, 0, 0, f * canvas.width, canvas.height);
  const fuente = map.getSource('be-cortina');
  if (!fuente) return;
  fuente.play();                       // sube el lienzo a la GPU en los próximos fotogramas
  clearTimeout(cortinaPausa);
  cortinaPausa = setTimeout(() => fuente.pause(), 120);
}
function iniciarCortina() {
  const el = $('#cortina'), asa = $('#cortina-asa');
  let arrastre = false;
  const mover = (clientX) => {
    const r = map.getContainer().getBoundingClientRect();
    E.cortinaX = clamp((clientX - r.left) / r.width, 0.03, 0.97);
    pintarCortina();
  };
  asa.addEventListener('pointerdown', (e) => { arrastre = true; asa.setPointerCapture(e.pointerId); e.preventDefault(); });
  asa.addEventListener('pointermove', (e) => { if (arrastre) mover(e.clientX); });
  asa.addEventListener('pointerup', () => { arrastre = false; });
  asa.addEventListener('dblclick', () => { E.cortinaX = 0.5; pintarCortina(); });
  asa.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault(); e.stopPropagation();
      E.cortinaX = clamp(E.cortinaX + (e.key === 'ArrowLeft' ? -0.04 : 0.04), 0.03, 0.97);
      pintarCortina();
    }
  });
  el.hidden = E.mapa !== 'cortina';
}

// ---- Rutas y cartas ----
const coord = (l) => [l.lon, l.lat];
function geoRutas(w) {
  const V = BE.viajeActual(w);
  const hecho = [], falta = [], rastro = [];
  if (V) {
    const ps = BE.P.filter((s) => s.viaje === V);
    const corte = w.parada ? w.en.i : (w.en.viaje === V ? w.en.i : -1);
    for (let k = 0; k < ps.length - 1; k++) {
      const A = ps[k], B = ps[k + 1];
      const incierto = A.lugar.precision === 'zona' || B.lugar.precision === 'zona';
      const props = { viaje: V.id, incierto };
      if (k < corte) hecho.push(linea([coord(A.lugar), coord(B.lugar)], props));
      else if (k === corte && !w.parada) {
        hecho.push(linea([coord(A.lugar), w.pos], props));
        falta.push(linea([w.pos, coord(B.lugar)], props));
      } else falta.push(linea([coord(A.lugar), coord(B.lugar)], props));
    }
    if (!w.parada && w.en.viaje !== V) {             // tramo de enlace entre dos viajes
      hecho.push(linea([coord(w.en.lugar), w.pos], { viaje: V.id, incierto: false }));
      falta.push(linea([w.pos, coord(w.sig.lugar)], { viaje: V.id, incierto: false }));
    }
  }
  // Los demás viajes se dibujan siempre como rastro, con su color: más claro si aún no ha ocurrido.
  for (const v of BE.D.viajes) {
    if (v === V) continue;
    const vs = BE.P.filter((s) => s.viaje === v);
    if (vs.length > 1) rastro.push(linea(vs.map((s) => coord(s.lugar)), { viaje: v.id, futuro: vs[0].a > E.t }));
  }
  return { hecho, falta, rastro, V };
}
const linea = (coordinates, properties) => ({ type: 'Feature', properties, geometry: { type: 'LineString', coordinates } });
/** Punta de flecha (apunta a la derecha; MapLibre la gira según la línea) con borde claro para que se lea sobre el relieve. */
function imagenFlecha(color) {
  const s = 28, c = document.createElement('canvas');
  c.width = s; c.height = s;
  const g = c.getContext('2d');
  g.beginPath(); g.moveTo(6, 5); g.lineTo(23, 14); g.lineTo(6, 23); g.lineTo(11, 14); g.closePath();
  g.lineJoin = 'round'; g.strokeStyle = 'rgba(255,252,244,0.95)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = color; g.fill();
  return g.getImageData(0, 0, s, s);
}
/** Arco curvo entre dos lugares (curva cuadrática en el plano de Mercator). */
function arco(a, b) {
  const ax = a.lon, ay = mercY(a.lat) * 57.2958, bx = b.lon, by = mercY(b.lat) * 57.2958;
  const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay;
  const cx = mx - dy * 0.18, cy = my + dx * 0.18;
  const pts = [];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32, u = 1 - t;
    const x = u * u * ax + 2 * u * t * cx + t * t * bx, y = u * u * ay + 2 * u * t * cy + t * t * by;
    pts.push([x, latDeY(y / 57.2958)]);
  }
  return pts;
}
function cartaVisible(c, t) {
  if (E.sel?.tipo === 'carta' && E.sel.id === c.id) return true;
  const tr = tramo(c.fecha);
  return !!tr && t >= tr[0] - 1 && t < tr[1] + 1;
}
function estadoCarta(c, t) {
  if (E.sel?.tipo === 'carta' && E.sel.id === c.id) return 'sel';
  return t >= BE.ventanaCarta(c)[0] ? 'escrita' : 'pendiente';
}
function geoCartas(t) {
  const arcos = [], halos = [], grupos = new Map();
  for (const c of BE.cartasOrdenadas()) {
    if (!cartaVisible(c, t)) continue;
    const estado = estadoCarta(c, t);
    const os = BE.origenesCarta(c), ds = BE.destinosCarta(c);
    for (const o of os) {
      if (!ds.length) {
        halos.push({ type: 'Feature', properties: { id: c.id }, geometry: { type: 'Point', coordinates: coord(BE.L[o]) } });
        const k = `${o}|`;
        if (!grupos.has(k)) grupos.set(k, { cartas: [], pos: coord(BE.L[o]), sinDestino: true });
        grupos.get(k).cartas.push({ c, estado });
        continue;
      }
      for (const d of ds) {
        const pts = arco(BE.L[o], BE.L[d]);
        arcos.push(linea(pts, { id: c.id, estado }));
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
  return { arcos, halos, grupos };
}

// ---- Marcas HTML: lugares, Pablo, próxima parada, etiquetas de cartas ----
function crearMarcas() {
  const usados = new Set([...BE.P.map((s) => s.lugar.id), ...BE.D.cartas.flatMap((c) => [...BE.origenesCarta(c), ...BE.destinosCarta(c)]), ...(BE.D.eventos || []).flatMap((e) => e.lugares || [])]);
  for (const id of usados) {
    const l = BE.L[id];
    if (!l || l.lat == null) continue;
    const el = document.createElement('button');
    el.type = 'button';
    el.dataset.sel = `lugar:${id}`;
    const region = l.tipo === 'region' || l.tipo === 'provincia';
    el.className = region ? 'marca-region' : 'marca-lugar';
    el.setAttribute('aria-label', `${l.nombre}: abrir ficha`);
    el.innerHTML = region ? `<span class="region-texto">${esc(l.nombre)}</span>` : `<span class="punto"></span><span class="etiqueta"><span class="nombre-a">${esc(l.nombre)}</span></span>`;
    const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([l.lon, l.lat]).addTo(map);
    marcasLugar.set(id, { marker, el, l, region, hoy: nombreHoy(l) });
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
  const n = (l.nombres || []).find((x) => /\bhoy\b|actual|modern/i.test(x.nota || ''));
  return n ? n.nombre : null;
}
// Un color por viaje, el mismo en el mapa, la línea de tiempo, la leyenda y el marcador.
const COLOR_VIAJE = { 'primer-viaje': '#a3432b', 'segundo-viaje': '#2f6f73', 'tercer-viaje': '#6b4c8a', 'visita-a-jerusalen-49': '#8a6d1f', 'custodia-en-cesarea': '#7b6f60', 'viaje-a-roma': '#2c5f8a' };
const colorViaje = (id) => COLOR_VIAJE[id] || '#a3432b';
const colorPorViaje = () => ['match', ['get', 'viaje'], ...Object.entries(COLOR_VIAJE).flat(), '#a3432b'];
let clavePablo = '';
function pintarMapa() {
  if (!mapaListo || !marcaPablo) return;
  const t = E.t;
  const w = BE.dondeEsta(t);
  const g = geoRutas(w);
  const V = g.V;
  const soloViaje = E.sel?.tipo === 'viaje' ? E.sel.id : null;     // un viaje seleccionado oculta los demás
  const filtra = (fs) => (soloViaje ? fs.filter((f) => f.properties.viaje === soloViaje) : fs);
  map.getSource('be-hecho').setData({ type: 'FeatureCollection', features: filtra(g.hecho) });
  map.getSource('be-falta').setData({ type: 'FeatureCollection', features: filtra(g.falta) });
  map.getSource('be-rastro').setData({ type: 'FeatureCollection', features: filtra(g.rastro) });
  const { arcos, halos, grupos } = geoCartas(t);
  const claveCartas = [...grupos.keys()].join(',') + arcos.map((a) => a.properties.estado).join('');
  if (claveCartas !== pintarMapa.claveCartas) {
    pintarMapa.claveCartas = claveCartas;
    map.getSource('be-cartas').setData({ type: 'FeatureCollection', features: arcos });
    map.getSource('be-halo').setData({ type: 'FeatureCollection', features: halos });
    pintarEtiquetasCartas(grupos);
    sucio.etiquetas = true;
  }
  // Pablo
  if (w) {
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
  const clave = `${V?.id}|${w?.en.key}|${w?.parada}`;
  if (clave !== clavePablo) { clavePablo = clave; sucio.etiquetas = true; }
  pintarLeyenda(V, w);
  pintarMientras(t);
  if (E.play && w) seguir(w.pos);
}
/** Alto que tapa la hoja inferior en pantallas estrechas, contando la fila del suceso y la leyenda que va encima. */
function altoHoja() {
  if (!matchMedia('(max-width: 760px)').matches) return 0;
  return (E.hojaPlegada ? 0 : $('#panel').offsetHeight) + 44;
}
/** Si Pablo se acerca al borde (12 %) o queda bajo la hoja inferior, el mapa lo recentra en la parte visible.
    Al reproducir no interrumpe un movimiento en curso; tras un salto (forzar) sí. */
function seguir(pos, forzar = false) {
  if (!mapaListo || (!forzar && map.isMoving())) return;
  const hoja = altoHoja();
  const c = map.getContainer(), p = map.project(pos);
  const ancho = c.clientWidth, alto = c.clientHeight - hoja, m = 0.12;
  if (p.x < ancho * m || p.x > ancho * (1 - m) || p.y < alto * m || p.y > alto * (1 - m)) {
    map.easeTo({ center: pos, offset: [0, -hoja / 2], duration: 900 });
  }
}
/** Tras un salto en el tiempo (anterior/siguiente, Mayús+flechas, cambio de dirección), Pablo no puede quedar fuera. */
function seguirPablo() {
  const w = BE.dondeEsta(E.t);
  if (w) seguir(w.pos, true);
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
    m.el.dataset.sel = `carta:${principal.id}`;
    m.el.className = `pildora-carta${sel ? ' pildora-carta--sel' : ''}${g.cartas.every((x) => x.estado === 'pendiente') ? ' pildora-carta--pendiente' : ''}`;
    m.el.innerHTML = `${esc(sel ? principal.libro : texto)} · ${esc(fecha)}${g.sinDestino ? ' · destino no indicado' : ''}`;
    m.el.setAttribute('aria-label', `Carta: ${g.cartas.map(({ c }) => c.libro).join(', ')}`);
  }
}
/** Estados de las etiquetas de lugar y reparto sin solapes (primero lo importante). */
function pintarEtiquetas() {
  if (!mapaListo) return;
  const w = BE.dondeEsta(E.t);
  const V = BE.viajeActual(w);
  const psV = V ? BE.P.filter((s) => s.viaje === V) : [];
  const corte = w ? (w.parada ? w.en.i : w.en.i) : -1;
  const visitados = new Set(), futuros = new Set();
  psV.forEach((s) => { (w && w.en.viaje === V && s.i <= corte ? visitados : futuros).add(s.lugar.id); });
  visitados.forEach((id) => futuros.delete(id));
  const actual = w && w.parada ? w.en.lugar.id : null;
  const deCartas = new Set();
  for (const c of BE.D.cartas) if (cartaVisible(c, E.t)) { BE.origenesCarta(c).forEach((x) => deCartas.add(x)); BE.destinosCarta(c).forEach((x) => deCartas.add(x)); }
  const res = resaltadoMapa ?? E.resaltado?.lugares;
  const zoom = map.getZoom();
  const actualModo = E.mapa === 'actual';
  const lista = [];
  for (const [id, m] of marcasLugar) {
    const cls = m.el.classList;
    const enRes = res ? res.has(id) : false;
    cls.toggle('es-actual', id === actual);
    cls.toggle('visitado', visitados.has(id));
    cls.toggle('futuro', futuros.has(id));
    cls.toggle('de-carta', deCartas.has(id));
    cls.toggle('resaltado', enRes);
    cls.toggle('atenuado', !!res && !enRes);
    cls.toggle('menor', !MAYORES.has(id) && !visitados.has(id) && !futuros.has(id) && !deCartas.has(id) && !enRes);
    if (!m.region) {
      const hoy = m.hoy;
      const html = actualModo && hoy
        ? `<span class="nombre-a">${esc(hoy)}</span><small class="nombre-b">${esc(m.l.nombre)}</small>`
        : `<span class="nombre-a">${esc(m.l.nombre)}</span>${E.mapa !== 'antiguo' && hoy ? `<small class="nombre-b">hoy ${esc(hoy)}</small>` : ''}`;
      const et = m.el.querySelector('.etiqueta');
      if (et.dataset.html !== html) { et.innerHTML = html; et.dataset.html = html; }
    }
    let prio = 0;
    if (id === actual) prio = 100;
    else if (E.sel?.tipo === 'lugar' && E.sel.id === id) prio = 95;
    else if (enRes) prio = 80;
    else if (visitados.has(id) || futuros.has(id)) prio = 60;
    else if (deCartas.has(id)) prio = 50;
    else if (MAYORES.has(id)) prio = 40;
    else prio = zoom >= 6.3 ? 20 : -1;
    if (m.region) prio = zoom < 8 ? 10 : -1;
    lista.push({ m, prio });
  }
  lista.sort((a, b) => b.prio - a.prio);
  // El rótulo de Pablo y la píldora «Próxima» también ocupan sitio: van justo después del lugar actual.
  const extras = [];
  if (marcaPablo?.puesta) extras.push({ el: marcaPablo.getElement(), sel: '.pablo-rotulo', prio: 99 });
  if (marcaProxima?.puesta) extras.push({ el: marcaProxima.getElement(), sel: null, prio: 70 });
  const cajas = [];
  const libre = (r) => cajas.every((c) => r.right < c.left || r.left > c.right || r.bottom < c.top || r.top > c.bottom);
  // Primero medimos todas, después ocultamos: así no forzamos un reflujo por etiqueta.
  const todos = [
    ...lista.map((x) => ({ el: x.m.el, medir: x.m.el.querySelector(x.m.region ? '.region-texto' : '.etiqueta'), prio: x.prio })),
    ...extras.map((x) => ({ el: x.el, medir: x.sel ? x.el.querySelector(x.sel) : x.el, prio: x.prio })),
  ].sort((a, b) => b.prio - a.prio);
  todos.forEach((x) => x.el.classList.remove('sin-etiqueta'));
  const medidas = todos.map((x) => x.medir.getBoundingClientRect());
  todos.forEach((x, i) => {
    const r = medidas[i];
    const ok = x.prio >= 0 && libre(r);
    if (ok) cajas.push({ left: r.left - 3, right: r.right + 3, top: r.top - 1, bottom: r.bottom + 1 });
    x.el.classList.toggle('sin-etiqueta', !ok);
  });
}
function pintarLeyenda(V, w) {
  const pendiente = BE.D.cartas.some((c) => cartaVisible(c, E.t) && estadoCarta(c, E.t) === 'pendiente');
  const clave = `${V?.id}|${w?.estimada}|${E.sel?.tipo}|${E.sel?.id}|${pendiente}`;
  if (clave === pintarLeyenda.clave) return;
  pintarLeyenda.clave = clave;
  const filas = [];
  const S = E.sel?.tipo === 'viaje' ? BE.D.viajes.find((v) => v.id === E.sel.id) : null;   // viaje seleccionado abajo
  const titulo = S || V;
  if (V && (!S || S === V)) {
    filas.push('<div class="be-legend__row"><span class="be-legend__line"></span>Recorrido hasta esta fecha</div>');
    if (BE.P.some((s) => s.viaje === V && s.lugar.precision === 'zona')) filas.push('<div class="be-legend__row"><span class="be-legend__line be-legend__line--approx"></span>Ruta sin trazado conocido (región)</div>');
    filas.push('<div class="be-legend__row"><span class="be-legend__line be-legend__line--todo"></span>Lo que falta del viaje</div>');
  }
  if (S) filas.push(`<div class="be-legend__row"><span class="be-legend__line${S === V ? ' be-legend__line--todo' : ''}"></span>${S === V ? 'Solo este viaje' : 'Solo este viaje, completo'}; vuelve a pulsarlo abajo para ver todos</div>`);
  else filas.push('<div class="be-legend__row"><span class="leyenda-rastro"></span>Otros viajes, cada uno con su color (más claro: aún por hacer)</div>');
  filas.push('<div class="be-legend__row"><span class="be-legend__line be-legend__line--letter"></span>Carta escrita cerca de esta fecha</div>');
  if (pendiente) filas.push('<div class="be-legend__row"><span class="be-legend__line be-legend__line--pendiente"></span>Carta que escribirá poco después</div>');
  filas.push('<div class="be-legend__row"><span class="leyenda-estimada"></span>Posición estimada (tiempo narrativo)</div>');
  $('#leyenda').innerHTML = `<div class="be-card__eyebrow">${titulo ? `${esc(titulo.nombre)} · ${esc(fechaCorta(titulo.fecha))}` : 'Viajes de Pablo'}</div>${filas.join('')}`;
  $('#leyenda').style.setProperty('--accent', titulo ? colorViaje(titulo.id) : '');
  if (marcaPablo) marcaPablo.getElement().style.setProperty('--accent', V ? colorViaje(V.id) : '');
}
function pintarMientras(t) {
  const ev = (BE.D.eventos || []).find((e) => { const v = BE.ventanaEvento(e); return v && t >= v[0] && t < v[1]; });
  const el = $('#mientras'), tira = $('#tira-suceso');
  const clave = ev ? ev.id : '';
  if (clave === pintarMientras.clave) return;
  pintarMientras.clave = clave;
  if (!ev) { el.hidden = true; tira.hidden = true; return; }
  const lugar = (ev.lugares || []).map((id) => BE.L[id]?.nombre).filter(Boolean)[0];
  const dePablo = (ev.personas || []).includes('pablo');
  el.hidden = false;
  // En pantallas estrechas la tarjeta no cabe: una línea encima de la hoja, que abre el suceso.
  tira.hidden = false;
  tira.dataset.sel = `evento:${ev.id}`;
  tira.innerHTML = `<span class="tira-suceso__tipo">${dePablo ? 'Suceso' : 'Mientras tanto'}${lugar ? ` · ${esc(lugar)}` : ''}</span> ${esc(ev.titulo)}`;
  el.innerHTML = `<div class="be-card__eyebrow">${dePablo ? 'Suceso' : 'Mientras tanto'}${lugar ? ` · ${esc(lugar)}` : ''}</div>
    <button type="button" class="mientras-titulo" data-sel="evento:${esc(ev.id)}">${esc(ev.titulo)}</button>
    <p>${esc(ev.resumen)}</p>
    <div class="fila-chips">${BE.chipsCitas((ev.pasajes || []).join('; '))}<span class="be-chrono be-chrono--tnm">${esc(ev.fecha?.texto || fechaCorta(ev.fecha))}</span></div>`;
}
/** Al abrir sin selección, si Pablo queda fuera de la vista o bajo la hoja inferior, centra el mapa en él. */
function mostrarPablo() {
  const w = E.sel ? null : BE.dondeEsta(E.t);
  if (!w) return;
  const estrecha = matchMedia('(max-width: 760px)').matches;
  const hoja = altoHoja();
  const c = map.getContainer(), q = map.project(w.pos), m = 40;
  if (q.x > m && q.x < c.clientWidth - m && q.y > m && q.y < c.clientHeight - hoja - m) return;
  // Pablo en el centro de la parte visible: se centra en él y se baja el centro medio alto de la hoja.
  // En móvil hace falta acercar (zoom 5,5): más lejos, maxBounds no deja bajar el centro lo suficiente.
  map.jumpTo({ center: w.pos, zoom: estrecha ? Math.max(map.getZoom(), 5.5) : map.getZoom() });
  const cq = map.project(w.pos);
  map.jumpTo({ center: map.unproject([cq.x, cq.y + hoja / 2]) });
}
function encuadrarLugares(ids) {
  const pts = ids.map((id) => BE.L[id]).filter((l) => l && l.lat != null);
  if (!pts.length || !map) return;
  // En pantallas estrechas la hoja inferior tapa la parte baja del mapa: se descuenta.
  const estrecha = matchMedia('(max-width: 760px)').matches;
  const hoja = altoHoja();
  const alto = map.getContainer().clientHeight;
  const padding = { top: estrecha ? 56 : 80, bottom: Math.min(hoja + 50, alto * 0.6), left: estrecha ? 30 : 70, right: estrecha ? 50 : 80 };
  if (pts.length === 1) {   // fitBounds no deja el relleno fijado en el mapa, easeTo sí
    const [x, y] = [pts[0].lon, pts[0].lat];
    map.fitBounds([[x - 0.01, y - 0.01], [x + 0.01, y + 0.01]], { padding, maxZoom: Math.max(map.getZoom(), 5.5), duration: 700 });
    return;
  }
  const lons = pts.map((p) => p.lon), lats = pts.map((p) => p.lat);
  map.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding, maxZoom: 7, duration: 700 });
}

/** Resalta en el mapa estos lugares por encima de lo que implique la selección. resaltar(null) vuelve a la selección. */
function resaltar(ids) {
  resaltadoMapa = ids ? new Set(ids) : null;
  sucio.etiquetas = true; programar();
}
function volverAlInicio() { map?.fitBounds(ENCUADRE_INICIAL, { duration: 600 }); }
/** Arranque del mapa: MapLibre, marcas al cargar, cortina y modo inicial. Sin MapLibre, la línea y las fichas siguen. */
function iniciar() {
  if (!window.maplibregl) {
    $('#mapa').insertAdjacentHTML('beforeend', '<p class="sin-mapa">No se pudo cargar MapLibre desde unpkg.com. La línea de tiempo y las fichas funcionan sin mapa.</p>');
  } else {
    crearMapa();
    // mostrarPablo espera a que se pinte la ficha: en móvil su alto decide qué parte del mapa queda a la vista.
    map.once('load', () => { crearMarcas(); sucio.mapa = sucio.etiquetas = true; programar(); requestAnimationFrame(() => requestAnimationFrame(mostrarPablo)); });
  }
  iniciarCortina();
  ponerMapa(E.mapa, false);
}

BE.mapa = { resaltar, encuadrar: encuadrarLugares, volverAlInicio, iniciar, get gl() { return map; } };
Object.assign(BE, { ponerMapa, pintarMapa, pintarEtiquetas, seguirPablo, cartaVisible, estadoCarta, colorViaje, nombreHoy });
})();
