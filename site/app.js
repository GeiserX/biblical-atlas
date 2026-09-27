/* biblical-earth · primer corte: los viajes de Pablo y sus cartas.
   Un solo cursor de tiempo gobierna el mapa, la línea de tiempo y la ficha.
   Sin framework ni paso de compilación: script clásico que usa window.maplibregl (lo carga index.html). */
'use strict';
(() => {

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const EXT = { oeste: 10, este: 44, sur: 28, norte: 44 };   // extensión de las imágenes de relieve
const ESQUINAS = [[EXT.oeste, EXT.norte], [EXT.este, EXT.norte], [EXT.este, EXT.sur], [EXT.oeste, EXT.sur]];
const MAPA_ANTIGUO = 'maps/mediterraneo-antiguo.webp';
const MAPA_ACTUAL = 'maps/mediterraneo-actual.webp';
const ESTILO_ACTUAL = 'https://tiles.openfreemap.org/styles/positron';
const T_MIN = 0, T_MAX = 100;
const VISTA_INICIAL = [30, 70];
const T_INICIAL = 50.3;
const ES_FILE = location.protocol === 'file:';
const ATRIBUCION = 'Relieve: Natural Earth, USGS SRTM/GMTED2010, NOAA ETOPO1, Copernicus EU-DEM, Mapzen · Costas y ríos: Natural Earth · Coordenadas: <a href="https://www.openbible.info/geo/" target="_blank" rel="noopener">OpenBible.info</a> (CC BY 4.0)';
const MESES = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'];
const MAYORES = new Set(['roma', 'jerusalen', 'antioquia-de-siria', 'efeso', 'corinto', 'atenas', 'filipos', 'tesalonica']);

// Libros de este corte: número en wol.jw.org, nombre, abreviatura TNM y formas que aceptamos al buscar.
const LIBROS = [
  [44, 'Hechos', 'Hch', ['hch', 'hech', 'hechos', 'he']],
  [45, 'Romanos', 'Ro', ['ro', 'rom', 'romanos']],
  [46, '1 Corintios', '1Co', ['1co', '1cor', '1corintios']],
  [47, '2 Corintios', '2Co', ['2co', '2cor', '2corintios']],
  [48, 'Gálatas', 'Gál', ['gal', 'ga', 'galatas']],
  [49, 'Efesios', 'Ef', ['ef', 'efe', 'efesios']],
  [50, 'Filipenses', 'Flp', ['flp', 'fil', 'filip', 'filipenses']],
  [51, 'Colosenses', 'Col', ['col', 'colosenses']],
  [52, '1 Tesalonicenses', '1Te', ['1te', '1tes', '1ts', '1tesalonicenses']],
  [53, '2 Tesalonicenses', '2Te', ['2te', '2tes', '2ts', '2tesalonicenses']],
  [54, '1 Timoteo', '1Ti', ['1ti', '1tim', '1timoteo']],
  [55, '2 Timoteo', '2Ti', ['2ti', '2tim', '2timoteo']],
  [56, 'Tito', 'Tit', ['tit', 'tito']],
  [57, 'Filemón', 'Flm', ['flm', 'filem', 'filemon']],
  [58, 'Hebreos', 'Heb', ['heb', 'hebreos']],
].map(([num, nombre, abr, formas]) => ({ num, nombre, abr, formas }));
const LIBRO_POR_FORMA = new Map();
for (const l of LIBROS) for (const f of [...l.formas, norm(l.abr), norm(l.nombre)]) LIBRO_POR_FORMA.set(f.replace(/\s+/g, ''), l);

// Momento del año que damos a cada estación cuando la fuente la nombra: [si abre el tramo, si lo cierra].
const ESTACIONES = {
  'finales del verano': [0.68, 0.68], 'principios del otono': [0.75, 0.75], primavera: [0.25, 0.4],
  verano: [0.55, 0.65], otono: [0.8, 0.85], invierno: [0.9, 0.15], pascua: [0.28, 0.28], pentecostes: [0.42, 0.42],
};
const RE_ESTACION = /finales del verano|principios del otono|primavera|verano|otono|invierno|pascua|pentecostes/g;

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtAnio = (y) => (y > 0 ? `${y} e.c.` : `${1 - y} a.e.c.`);
function fmtCursor(t, fino) {
  const y = Math.floor(t);
  if (fino) return `${MESES[clamp(Math.floor((t - y) * 12), 0, 11)]} ${fmtAnio(y)}`;
  return fmtAnio(y);
}
function fmtDia(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${+m[3]} ${MESES[+m[2] - 1]} ${m[1]}` : (iso || 'sin fecha');
}
/** Tramo [inicio, fin) en años decimales de un objeto FECHA. */
function tramo(f) {
  if (!f) return null;
  const a = f.desde ?? f.hasta, b = f.hasta ?? f.desde;
  return a == null ? null : [a, b + 1];
}
function fechaCorta(f) {
  if (!f) return '';
  const a = f.desde ?? f.hasta, b = f.hasta ?? f.desde;
  const c = f.aprox ? 'c. ' : '';
  return a === b ? `${c}${fmtAnio(a)}` : `${c}${a > 0 && b > 0 ? `${a}-${b} e.c.` : `${fmtAnio(a)} - ${fmtAnio(b)}`}`;
}
/** Momentos [inicio, fin] (años decimales) en que situamos una parada anclada. */
function momentos(f) {
  const d = f.desde ?? f.hasta, h = f.hasta ?? f.desde;
  if (d == null) return null;
  const hits = [...norm(f.texto).matchAll(RE_ESTACION)].map((m) => ESTACIONES[m[0]]);
  if (d === h) {
    if (hits.length >= 2) return [d + hits[0][0], d + hits[hits.length - 1][1]];
    if (hits.length === 1) return [d + hits[0][0], d + hits[0][0]];
    return [d + 0.5, d + 0.5];
  }
  const ini = d + (hits.length ? hits[0][0] : 0.5);
  let fin = h + 0.5;
  if (hits.length >= 2) fin = h + hits[hits.length - 1][1];
  else if (hits.length === 1 && hits[0] === ESTACIONES.invierno) fin = h + 0.15;
  return [ini, Math.max(ini, fin)];
}
function libro(s) { return LIBRO_POR_FORMA.get(norm(s).replace(/[\s.]+/g, '')) || null; }
/** "Hch 15:1-3; Gál 2:1-10" → [{ libro, cap, capFin, texto }] */
function citas(s) {
  const out = [];
  for (const parte of String(s || '').split(/\s*;\s*/)) {
    const m = parte.match(/^\s*([123]?\s?[A-Za-zÁÉÍÓÚáéíóúÑñ]+)\.?\s+(\d+)(?::(\d+))?(?:\s*[-–]\s*(\d+)(?::(\d+))?)?/);
    if (!m) continue;
    const lib = libro(m[1]);
    if (!lib) continue;
    const cap = +m[2];
    let capFin = cap;
    if (m[5]) capFin = +m[4]; else if (!m[3] && m[4]) capFin = +m[4];
    out.push({ libro: lib, cap, capFin, texto: parte.trim() });
  }
  return out;
}
const urlCapitulo = (lib, cap) => `https://wol.jw.org/es/wol/b/r4/lp-s/nwt/${lib.num}/${cap}`;
const EXTERNO = 'target="_blank" rel="noopener"';

// Proyección de Mercator para interpolar sobre la línea tal como la dibuja el mapa.
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const latDeY = (y) => (Math.atan(Math.exp(y)) * 360) / Math.PI - 90;
function interpolar(a, b, f) {
  return [a.lon + (b.lon - a.lon) * f, latDeY(mercY(a.lat) + (mercY(b.lat) - mercY(a.lat)) * f)];
}

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------
let D, L, PERS, VIDEOS = null;
let P = [];                         // paradas de Pablo en orden, con su momento
const E = {
  t: T_INICIAL, vista: [...VISTA_INICIAL], sel: null, resaltado: null, mapa: 'antiguo',
  play: false, cortinaX: 0.5, hojaPlegada: false,
};
let map = null, mapaListo = false, capasBase = [], estiloReserva = false;

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------
async function cargarDatos() {
  if (ES_FILE) {
    if (!window.BIBLICAL_EARTH_DATA) await cargarScript('data.js');
    if (!window.BIBLICAL_EARTH_DATA) throw new Error('No encuentro data.js junto a index.html.');
    return window.BIBLICAL_EARTH_DATA;
  }
  const r = await fetch('data.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error(`data.json respondió ${r.status}`);
  return r.json();
}
function cargarScript(src) {
  return new Promise((ok) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = ok;
    document.head.appendChild(s);
  });
}
async function cargarVideos() {
  if (ES_FILE) return null;           // fetch no funciona desde file://; la ficha lo explica
  try { const r = await fetch('videos.json', { cache: 'no-cache' }); return r.ok ? await r.json() : {}; } catch { return {}; }
}

/** Ordena todas las paradas de Pablo y les da un momento.
    Paradas ancladas: su fecha. Paradas en tiempo narrativo: repartidas por igual entre las dos anclas que las rodean. */
function prepararParadas() {
  const viajes = [...D.viajes].sort((a, b) => (a.fecha?.desde ?? 0) - (b.fecha?.desde ?? 0));
  const out = [];
  for (const v of viajes) {
    const ps = [...v.paradas].sort((a, b) => a.orden - b.orden);
    ps.forEach((p, i) => {
      const lugar = L[p.lugar];
      if (!lugar || lugar.lat == null) return;
      out.push({ key: `${v.id}/${p.orden}`, viaje: v, p, lugar, i, n: ps.length, narrativa: p.fecha?.tipo === 'narrativa' || !momentos(p.fecha || {}) });
    });
  }
  let prev = -1;
  const anclas = out.map((s, i) => (s.narrativa ? -1 : i)).filter((i) => i >= 0);
  for (let k = 0; k <= anclas.length; k++) {
    const j = k < anclas.length ? anclas[k] : out.length;
    const nNar = j - prev - 1;
    if (j < out.length) {
      let [a, b] = momentos(out[j].p.fecha);
      if (prev >= 0) {
        const minA = out[prev].b + 0.04 * (nNar + 1);
        if (a < minA) { a = minA; b = Math.max(b, a); }
      }
      out[j].a = a; out[j].b = b;
    }
    if (nNar > 0) {
      const primero = out[prev + 1], ultimo = out[j - 1];
      const t0 = prev >= 0 ? out[prev].b : (primero.viaje.fecha?.desde ?? 0);
      const t1 = j < out.length ? out[j].a : ((ultimo.viaje.fecha?.hasta ?? t0) + 1);
      const hueco = (t1 - t0) / (nNar + 1);
      for (let m = 1; m <= nNar; m++) {
        const s = out[prev + m], c = t0 + m * hueco;
        s.a = c - hueco * 0.2; s.b = c + hueco * 0.2; s.banda = [t0, t1];
      }
    }
    prev = j;
  }
  out.forEach((s, i) => { s.g = i; });
  return out;
}

/** ¿Dónde está Pablo en t? null si ninguna parada lo cubre. */
function dondeEsta(t) {
  if (!P.length || t < P[0].a || t > P[P.length - 1].b) return null;
  let lo = 0, hi = P.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (P[m].a <= t) lo = m; else hi = m - 1; }
  const s = P[lo];
  if (t <= s.b || lo === P.length - 1) {
    return { en: s, sig: P[lo + 1] || null, parada: true, estimada: s.narrativa, pos: [s.lugar.lon, s.lugar.lat], banda: s.banda || null };
  }
  const n = P[lo + 1];
  const f = (t - s.b) / Math.max(1e-6, n.a - s.b);
  const banda = s.narrativa ? s.banda : (n.narrativa ? n.banda : null);
  return { en: s, sig: n, parada: false, f, estimada: s.narrativa || n.narrativa, pos: interpolar(s.lugar, n.lugar, f), banda };
}
function viajeActual(w) {
  if (!w) return null;
  if (!w.parada && w.en.i === w.en.n - 1 && w.sig) return w.sig.viaje;
  return w.en.viaje;
}
/** Parte de la fecha f en que las paradas de este modelo ponen a Pablo en uno de los lugares.
    Se prueba cada lugar en orden (el primero es el preferido) y, dentro de él, gana la estancia más larga.
    Una parada sin duración cuenta desde que sale de la anterior hasta que llega a la siguiente.
    Si ninguna parada encaja, se queda la parte de la fecha que cae fuera de los viajes, donde no sabemos dónde estaba. */
function ventanaPablo(f, lugares) {
  const tr = tramo(f);
  if (!tr) return null;
  for (const id of lugares || []) {
    let mejor = null;
    for (const s of P) {
      if (s.lugar.id !== id) continue;
      let a = s.a, b = s.b;
      if (b - a < 1e-3) { a = s.g > 0 ? P[s.g - 1].b + 1e-3 : a; b = s.g < P.length - 1 ? P[s.g + 1].a : b; }
      a = Math.max(a, tr[0]); b = Math.min(b, tr[1]);
      if (b > a && (!mejor || b - a > mejor[1] - mejor[0])) mejor = [a, b];
    }
    if (mejor) return mejor;
  }
  const ini = P[0]?.a ?? Infinity, fin = P.at(-1)?.b ?? -Infinity;
  if (tr[0] < fin && fin < tr[1]) return [fin + 1e-3, tr[1]];
  if (tr[0] < ini && ini < tr[1]) return [tr[0], ini];
  return tr;
}
const ventanas = new Map();
const ventanaCarta = (c) => { if (!ventanas.has(c)) ventanas.set(c, ventanaPablo(c.fecha, c.escrita_en)); return ventanas.get(c); };
/** Los sucesos de Pablo siguen sus paradas; los demás, su fecha. */
const ventanaEvento = (e) => { if (!ventanas.has(e)) ventanas.set(e, (e.personas || []).includes('pablo') ? ventanaPablo(e.fecha, e.lugares) : tramo(e.fecha)); return ventanas.get(e); };
const cartasOrdenadas = () => [...D.cartas].sort((a, b) => (a.fecha?.desde ?? 0) - (b.fecha?.desde ?? 0));
const momentoCarta = (c) => { const v = ventanaCarta(c); return v ? (v[0] + v[1]) / 2 : null; };
const momentoEvento = (e) => { const v = ventanaEvento(e); return v ? (v[0] + v[1]) / 2 : null; };
const abrCarta = (c) => (citas(c.referencia)[0]?.libro.abr) || c.libro;
const destinosCarta = (c) => (c.destinatarios?.lugares || []).filter((id) => L[id]);
const origenesCarta = (c) => (c.escrita_en || []).filter((id) => L[id]);

// ---------------------------------------------------------------------------
// Selección y resaltado
// ---------------------------------------------------------------------------
function parseSel(s) {
  if (!s) return null;
  const i = s.indexOf(':');
  if (i < 0) return null;
  const tipo = s.slice(0, i), id = s.slice(i + 1);
  if (!existe(tipo, id)) return null;
  return { tipo, id };
}
function existe(tipo, id) {
  switch (tipo) {
    case 'lugar': return !!L[id];
    case 'persona': return !!PERS[id];
    case 'carta': return D.cartas.some((c) => c.id === id);
    case 'viaje': return D.viajes.some((v) => v.id === id);
    case 'parada': return P.some((s) => s.key === id);
    case 'periodo': return (D.periodos || []).some((p) => p.id === id);
    case 'evento': return (D.eventos || []).some((e) => e.id === id);
    case 'pasaje': return !!pasajeDeId(id);
    default: return false;
  }
}
const selTexto = (sel) => (sel ? `${sel.tipo}:${sel.id}` : '');
function pasajeDeId(id) {
  const m = String(id).match(/^([123]?[a-z]+)-(\d+)$/);
  if (!m) return null;
  const lib = LIBROS.find((l) => norm(l.abr) === m[1]);
  return lib ? { libro: lib, cap: +m[2] } : null;
}
const idPasaje = (lib, cap) => `${norm(lib.abr)}-${cap}`;
function citaCubre(cs, lib, cap) { return cs.some((c) => c.libro === lib && cap >= c.cap && cap <= c.capFin); }

/** Todo lo que implica una selección: claves de la línea de tiempo y lugares del mapa. */
function implicados(sel) {
  const claves = new Set(), lugares = new Set();
  const addParada = (s) => { claves.add(`parada:${s.key}`); lugares.add(s.lugar.id); };
  const addCarta = (c) => { claves.add(`carta:${c.id}`); origenesCarta(c).forEach((x) => lugares.add(x)); destinosCarta(c).forEach((x) => lugares.add(x)); };
  const { tipo, id } = sel;
  if (tipo === 'lugar') {
    lugares.add(id);
    P.filter((s) => s.lugar.id === id).forEach(addParada);
    D.cartas.filter((c) => origenesCarta(c).includes(id) || destinosCarta(c).includes(id)).forEach(addCarta);
    (D.eventos || []).filter((e) => (e.lugares || []).includes(id)).forEach((e) => claves.add(`evento:${e.id}`));
    (D.periodos || []).filter((p) => (p.lugares || []).includes(id)).forEach((p) => claves.add(`periodo:${p.id}`));
  } else if (tipo === 'parada') {
    const s = P.find((x) => x.key === id);
    addParada(s); claves.add(`viaje:${s.viaje.id}`);
  } else if (tipo === 'viaje') {
    claves.add(`viaje:${id}`);
    P.filter((s) => s.viaje.id === id).forEach(addParada);
  } else if (tipo === 'carta') {
    const c = D.cartas.find((x) => x.id === id);
    addCarta(c);
    const tr = tramo(c.fecha);
    if (tr) P.filter((s) => origenesCarta(c).includes(s.lugar.id) && s.b >= tr[0] - 0.5 && s.a <= tr[1] + 0.5).forEach(addParada);
  } else if (tipo === 'persona') {
    const viajes = D.viajes.filter((v) => v.persona === id || (v.companeros || []).includes(id));
    viajes.forEach((v) => { claves.add(`viaje:${v.id}`); P.filter((s) => s.viaje === v).forEach(addParada); });
    if (id === 'pablo') D.cartas.forEach(addCarta);
    (D.eventos || []).filter((e) => (e.personas || []).includes(id)).forEach((e) => claves.add(`evento:${e.id}`));
  } else if (tipo === 'periodo') {
    const p = D.periodos.find((x) => x.id === id);
    claves.add(`periodo:${id}`); (p.lugares || []).forEach((x) => lugares.add(x));
  } else if (tipo === 'evento') {
    const e = D.eventos.find((x) => x.id === id);
    claves.add(`evento:${id}`); (e.lugares || []).forEach((x) => lugares.add(x));
  } else if (tipo === 'pasaje') {
    const { libro: lib, cap } = pasajeDeId(id);
    P.filter((s) => citaCubre(citas(s.p.referencia), lib, cap)).forEach(addParada);
    D.viajes.filter((v) => citaCubre(citas(v.referencia), lib, cap)).forEach((v) => claves.add(`viaje:${v.id}`));
    D.cartas.filter((c) => citas(c.referencia)[0]?.libro === lib).forEach(addCarta);
    (D.eventos || []).filter((e) => citaCubre(citas((e.pasajes || []).join('; ')), lib, cap)).forEach((e) => { claves.add(`evento:${e.id}`); (e.lugares || []).forEach((x) => lugares.add(x)); });
  }
  return { claves, lugares };
}
/** Fecha a la que salta el cursor al elegir algo. */
function momentoDe(sel) {
  const r = implicados(sel);
  const { tipo, id } = sel;
  if (tipo === 'parada') { const s = P.find((x) => x.key === id); return (s.a + s.b) / 2; }
  if (tipo === 'carta') return momentoCarta(D.cartas.find((c) => c.id === id));
  if (tipo === 'periodo') { const tr = tramo(D.periodos.find((p) => p.id === id).fecha); return tr ? tr[0] + 0.01 : null; }
  if (tipo === 'evento') return momentoEvento(D.eventos.find((e) => e.id === id));
  const ts = [];
  for (const k of r.claves) {
    if (k.startsWith('parada:')) { const s = P.find((x) => `parada:${x.key}` === k); ts.push((s.a + s.b) / 2); }
    if (k.startsWith('carta:')) ts.push(momentoCarta(D.cartas.find((c) => `carta:${c.id}` === k)));
    if (k.startsWith('evento:')) ts.push(momentoEvento(D.eventos.find((e) => `evento:${e.id}` === k)));
  }
  const validos = ts.filter((x) => x != null);
  return validos.length ? Math.min(...validos) : null;
}
function nombreSel(sel) {
  const { tipo, id } = sel;
  if (tipo === 'lugar') return L[id].nombre;
  if (tipo === 'persona') return PERS[id].nombre;
  if (tipo === 'carta') return D.cartas.find((c) => c.id === id).libro;
  if (tipo === 'viaje') return D.viajes.find((v) => v.id === id).nombre;
  if (tipo === 'parada') { const s = P.find((x) => x.key === id); return `${s.lugar.nombre} (${s.p.referencia})`; }
  if (tipo === 'periodo') return D.periodos.find((p) => p.id === id).nombre;
  if (tipo === 'evento') return D.eventos.find((e) => e.id === id).titulo;
  if (tipo === 'pasaje') { const p = pasajeDeId(id); return `${p.libro.nombre} ${p.cap}`; }
  return id;
}

function seleccionar(sel, { mover = true, encuadrar = true } = {}) {
  E.sel = sel;
  E.resaltado = sel ? implicados(sel) : null;
  const filtro = $('#filtro');
  if (sel) {
    filtro.hidden = false;
    filtro.innerHTML = `<span>${esc(nombreSel(sel))} y su cronología</span><span class="filtro-x" aria-hidden="true">×</span>`;
    filtro.setAttribute('aria-label', `Quitar el resaltado de ${nombreSel(sel)}`);
  } else {
    filtro.hidden = true;
  }
  if (sel && mover) {
    const t = momentoDe(sel);
    if (t != null) { setT(t); asegurarVisible(t, true); }
  }
  pintarPanel(true);
  if (sel && encuadrar) encuadrarLugares([...E.resaltado.lugares]);   // después de la ficha: en móvil su alto cuenta
  pintarLineaFija();
  sucio.mapa = true; sucio.etiquetas = true;
  programar();
  guardarHash();
}
function limpiarSeleccion() {
  $('#q').value = '';
  cerrarResultados();
  if (E.sel) seleccionar(null, { mover: false, encuadrar: false });
}

// ---------------------------------------------------------------------------
// Cursor de tiempo, reproducción y dirección
// ---------------------------------------------------------------------------
const sucio = { mapa: true, etiquetas: true, panel: true, linea: true, cursor: true };
let rafPendiente = false;
function programar() {
  if (rafPendiente) return;
  rafPendiente = true;
  requestAnimationFrame(() => { rafPendiente = false; pintar(); });
}
function setT(t) {
  E.t = clamp(t, T_MIN, T_MAX);
  sucio.mapa = sucio.cursor = sucio.panel = true;
  programar();
  guardarHash();
}
const span = () => E.vista[1] - E.vista[0];
const velocidad = () => span() / 160;   // años por segundo: 1 año cada 4 s a escala de décadas
function textoVelocidad() {
  const cada4 = span() / 40;
  if (cada4 >= 0.95) { const n = Math.round(cada4); return `${n} ${n === 1 ? 'año' : 'años'} cada 4 s`; }
  const meses = cada4 * 12;
  if (meses >= 0.95) { const n = Math.round(meses); return `${n} ${n === 1 ? 'mes' : 'meses'} cada 4 s`; }
  const dias = Math.max(1, Math.round(meses * 30));
  return `${dias} ${dias === 1 ? 'día' : 'días'} cada 4 s`;
}
function asegurarVisible(t, centrar) {
  const s = span();
  if (centrar || t < E.vista[0] || t > E.vista[1]) {
    let v0 = centrar ? t - s * 0.4 : (t > E.vista[1] ? t - s * 0.3 : t - s * 0.7);
    v0 = clamp(v0, T_MIN, T_MAX - s);
    E.vista = [v0, v0 + s];
    sucio.linea = true; programar();
  }
}
let ultimoFrame = 0;
function reproducir(on) {
  E.play = on;
  $('#reproducir').classList.toggle('en-marcha', on);
  $('#reproducir').setAttribute('aria-label', on ? 'Pausar (barra espaciadora)' : 'Reproducir (barra espaciadora)');
  if (on) { ultimoFrame = performance.now(); requestAnimationFrame(paso); }
  sucio.panel = true; programar();
}
function paso(ahora) {
  if (!E.play) return;
  const dt = Math.min(0.1, (ahora - ultimoFrame) / 1000);
  ultimoFrame = ahora;
  const t = E.t + dt * velocidad();
  if (t >= T_MAX) { setT(T_MAX); reproducir(false); return; }
  setT(t);
  if (t > E.vista[1] - span() * 0.05) asegurarVisible(t, false);
  requestAnimationFrame(paso);
}
/** Momentos a los que saltan «anterior» y «siguiente»: paradas y cartas. */
function hitos() {
  const ts = P.map((s) => (s.a + s.b) / 2).concat(D.cartas.map(momentoCarta).filter((x) => x != null));
  return [...new Set(ts.map((x) => Math.round(x * 1000) / 1000))].sort((a, b) => a - b);
}
function saltar(dir) {
  const hs = hitos();
  const t = dir > 0 ? hs.find((h) => h > E.t + 1e-3) : [...hs].reverse().find((h) => h < E.t - 1e-3);
  if (t != null) { setT(t); asegurarVisible(t, false); seguirPablo(); }
}

let hashTimer = 0, ultimoHash = '';
function guardarHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    const p = new URLSearchParams();
    p.set('t', E.t.toFixed(2));
    if (E.sel) p.set('sel', selTexto(E.sel));
    p.set('mapa', E.mapa);
    ultimoHash = '#' + p.toString().replace(/%3A/g, ':').replace(/%2F/g, '/');
    if (location.hash !== ultimoHash) history.replaceState(null, '', ultimoHash);
  }, 250);
}
function leerHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  const r = {};
  const t = parseFloat(p.get('t'));
  if (Number.isFinite(t)) r.t = clamp(t, T_MIN, T_MAX);
  if (p.has('sel')) r.sel = parseSel(p.get('sel'));
  const m = p.get('mapa');
  if (['antiguo', 'actual', 'cortina'].includes(m)) r.mapa = m;
  return r;
}
function aplicarHash(inicial) {
  const h = leerHash();
  const tAntes = E.t;
  if (h.t != null) E.t = h.t;
  if (h.mapa) ponerMapa(h.mapa, false);
  const s = h.sel ?? null;
  const otraSel = inicial || selTexto(s) !== selTexto(E.sel);
  if (otraSel) seleccionar(s, { mover: h.t == null, encuadrar: true });
  else if (E.t !== tAntes) seguirPablo();   // al arrancar lo hace mostrarPablo; con otra selección, su encuadre
  asegurarVisible(E.t, inicial && h.t != null);
  sucio.mapa = sucio.cursor = sucio.panel = sucio.linea = true;
  programar();
}

// ---------------------------------------------------------------------------
// Mapa
// ---------------------------------------------------------------------------
const OCULTAR_EN_ACTUAL = /^(highway|road_|airport|label_other|label_village|label_town|label_city|label_state|poi|housenumber|aeroway|building)/;
const marcasLugar = new Map();       // id → { marker, el }
const marcasCarta = new Map();       // clave de arco → { marker, el }
let marcaPablo = null, marcaProxima = null, imgDom = null;
let cortina = null;                  // { canvas, ctx, img, fuente }

function crearMapa() {
  map = new maplibregl.Map({
    container: 'mapa-gl',
    style: ESTILO_ACTUAL,
    bounds: [[19.2, 34.0], [37.2, 42.2]],
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
  map.addLayer({ id: 'be-rastro', type: 'line', source: 'be-rastro', layout: lineas, paint: { 'line-color': colorPorViaje(), 'line-width': 2, 'line-opacity': 0.35 } });
  map.addLayer({ id: 'be-cartas-pendiente', type: 'line', source: 'be-cartas', filter: ['==', ['get', 'estado'], 'pendiente'], layout: lineas, paint: { 'line-color': '#b8892f', 'line-width': 1.6, 'line-dasharray': [0.5, 2.5], 'line-opacity': 0.8 } });
  map.addLayer({ id: 'be-cartas-escrita', type: 'line', source: 'be-cartas', filter: ['==', ['get', 'estado'], 'escrita'], layout: { 'line-join': 'round' }, paint: { 'line-color': '#b8892f', 'line-width': 1.8, 'line-dasharray': [3, 2.5], 'line-opacity': 0.85 } });
  map.addLayer({ id: 'be-cartas-sel-casing', type: 'line', source: 'be-cartas', filter: ['==', ['get', 'estado'], 'sel'], layout: lineas, paint: { 'line-color': '#fffdf8', 'line-width': 7, 'line-opacity': 0.85 } });
  map.addLayer({ id: 'be-cartas-sel', type: 'line', source: 'be-cartas', filter: ['==', ['get', 'estado'], 'sel'], layout: { 'line-join': 'round' }, paint: { 'line-color': '#b8892f', 'line-width': 4, 'line-dasharray': [2.2, 1] } });
  map.addLayer({ id: 'be-halo', type: 'circle', source: 'be-halo', paint: { 'circle-radius': 16, 'circle-color': 'rgba(184,137,47,0.12)', 'circle-stroke-color': '#b8892f', 'circle-stroke-width': 1.5 } });
  map.addLayer({ id: 'be-falta', type: 'line', source: 'be-falta', layout: lineas, paint: { 'line-color': colorPorViaje(), 'line-width': 2.5, 'line-dasharray': [0.3, 2.6], 'line-opacity': 0.75 } });
  map.addLayer({ id: 'be-hecho-casing', type: 'line', source: 'be-hecho', layout: lineas, paint: { 'line-color': '#fffcf4', 'line-width': 7, 'line-opacity': 0.8 } });
  map.addLayer({ id: 'be-hecho', type: 'line', source: 'be-hecho', filter: ['!', ['get', 'incierto']], layout: lineas, paint: { 'line-color': colorPorViaje(), 'line-width': 3.5 } });
  map.addLayer({ id: 'be-hecho-incierto', type: 'line', source: 'be-hecho', filter: ['get', 'incierto'], layout: { 'line-join': 'round' }, paint: { 'line-color': '#7a5c8e', 'line-width': 3, 'line-dasharray': [3, 2], 'line-opacity': 0.9 } });
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
  const V = viajeActual(w);
  const hecho = [], falta = [], rastro = [];
  if (V) {
    const ps = P.filter((s) => s.viaje === V);
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
    const inicio = ps[0].a;
    for (const v of D.viajes) {
      if (v === V) continue;
      const vs = P.filter((s) => s.viaje === v);
      if (vs.length > 1 && vs[vs.length - 1].b <= inicio + 1e-6) rastro.push(linea(vs.map((s) => coord(s.lugar)), { viaje: v.id }));
    }
  }
  return { hecho, falta, rastro, V };
}
const linea = (coordinates, properties) => ({ type: 'Feature', properties, geometry: { type: 'LineString', coordinates } });
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
  return t >= ventanaCarta(c)[0] ? 'escrita' : 'pendiente';
}
function geoCartas(t) {
  const arcos = [], halos = [], grupos = new Map();
  for (const c of cartasOrdenadas()) {
    if (!cartaVisible(c, t)) continue;
    const estado = estadoCarta(c, t);
    const os = origenesCarta(c), ds = destinosCarta(c);
    for (const o of os) {
      if (!ds.length) {
        halos.push({ type: 'Feature', properties: { id: c.id }, geometry: { type: 'Point', coordinates: coord(L[o]) } });
        const k = `${o}|`;
        if (!grupos.has(k)) grupos.set(k, { cartas: [], pos: coord(L[o]), sinDestino: true });
        grupos.get(k).cartas.push({ c, estado });
        continue;
      }
      for (const d of ds) {
        const pts = arco(L[o], L[d]);
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
  const usados = new Set([...P.map((s) => s.lugar.id), ...D.cartas.flatMap((c) => [...origenesCarta(c), ...destinosCarta(c)]), ...(D.eventos || []).flatMap((e) => e.lugares || [])]);
  for (const id of usados) {
    const l = L[id];
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
  q.addEventListener('click', (e) => { e.stopPropagation(); const s = P.find((x) => x.key === q.dataset.key); if (s) { setT((s.a + s.b) / 2); asegurarVisible(E.t, false); } });
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
  const w = dondeEsta(t);
  const { hecho, falta, rastro, V } = geoRutas(w);
  map.getSource('be-hecho').setData({ type: 'FeatureCollection', features: hecho });
  map.getSource('be-falta').setData({ type: 'FeatureCollection', features: falta });
  map.getSource('be-rastro').setData({ type: 'FeatureCollection', features: rastro });
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
    const sig = w.parada ? P[w.en.g + 1] : w.sig;
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
  const w = dondeEsta(E.t);
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
    const texto = g.cartas.map(({ c }) => abrCarta(c)).join(' · ');
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
  const w = dondeEsta(E.t);
  const V = viajeActual(w);
  const psV = V ? P.filter((s) => s.viaje === V) : [];
  const corte = w ? (w.parada ? w.en.i : w.en.i) : -1;
  const visitados = new Set(), futuros = new Set();
  psV.forEach((s) => { (w && w.en.viaje === V && s.i <= corte ? visitados : futuros).add(s.lugar.id); });
  visitados.forEach((id) => futuros.delete(id));
  const actual = w && w.parada ? w.en.lugar.id : null;
  const deCartas = new Set();
  for (const c of D.cartas) if (cartaVisible(c, E.t)) { origenesCarta(c).forEach((x) => deCartas.add(x)); destinosCarta(c).forEach((x) => deCartas.add(x)); }
  const res = E.resaltado?.lugares;
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
  const pendiente = D.cartas.some((c) => cartaVisible(c, E.t) && estadoCarta(c, E.t) === 'pendiente');
  const clave = `${V?.id}|${w?.estimada}|${E.sel?.tipo === 'carta'}|${pendiente}`;
  if (clave === pintarLeyenda.clave) return;
  pintarLeyenda.clave = clave;
  const filas = [];
  if (V) {
    filas.push('<div class="be-legend__row"><span class="be-legend__line"></span>Recorrido hasta esta fecha</div>');
    if (P.some((s) => s.viaje === V && s.lugar.precision === 'zona')) filas.push('<div class="be-legend__row"><span class="be-legend__line be-legend__line--approx"></span>Ruta sin trazado conocido (región)</div>');
    filas.push('<div class="be-legend__row"><span class="be-legend__line be-legend__line--todo"></span>Lo que falta del viaje</div>');
    filas.push('<div class="be-legend__row"><span class="leyenda-rastro"></span>Rastro de los viajes anteriores</div>');
  }
  filas.push('<div class="be-legend__row"><span class="be-legend__line be-legend__line--letter"></span>Carta escrita cerca de esta fecha</div>');
  if (pendiente) filas.push('<div class="be-legend__row"><span class="be-legend__line be-legend__line--pendiente"></span>Carta que escribirá poco después</div>');
  filas.push('<div class="be-legend__row"><span class="leyenda-estimada"></span>Posición estimada (tiempo narrativo)</div>');
  $('#leyenda').innerHTML = `<div class="be-card__eyebrow">${V ? `${esc(V.nombre)} · ${esc(fechaCorta(V.fecha))}` : 'Viajes de Pablo'}</div>${filas.join('')}`;
  $('#leyenda').style.setProperty('--accent', V ? colorViaje(V.id) : '');
  if (marcaPablo) marcaPablo.getElement().style.setProperty('--accent', V ? colorViaje(V.id) : '');
}
function pintarMientras(t) {
  const ev = (D.eventos || []).find((e) => { const v = ventanaEvento(e); return v && t >= v[0] && t < v[1]; });
  const el = $('#mientras'), tira = $('#tira-suceso');
  const clave = ev ? ev.id : '';
  if (clave === pintarMientras.clave) return;
  pintarMientras.clave = clave;
  if (!ev) { el.hidden = true; tira.hidden = true; return; }
  const lugar = (ev.lugares || []).map((id) => L[id]?.nombre).filter(Boolean)[0];
  const dePablo = (ev.personas || []).includes('pablo');
  el.hidden = false;
  // En pantallas estrechas la tarjeta no cabe: una línea encima de la hoja, que abre el suceso.
  tira.hidden = false;
  tira.dataset.sel = `evento:${ev.id}`;
  tira.innerHTML = `<span class="tira-suceso__tipo">${dePablo ? 'Suceso' : 'Mientras tanto'}${lugar ? ` · ${esc(lugar)}` : ''}</span> ${esc(ev.titulo)}`;
  el.innerHTML = `<div class="be-card__eyebrow">${dePablo ? 'Suceso' : 'Mientras tanto'}${lugar ? ` · ${esc(lugar)}` : ''}</div>
    <button type="button" class="mientras-titulo" data-sel="evento:${esc(ev.id)}">${esc(ev.titulo)}</button>
    <p>${esc(ev.resumen)}</p>
    <div class="fila-chips">${chipsCitas((ev.pasajes || []).join('; '))}<span class="be-chrono be-chrono--tnm">${esc(ev.fecha?.texto || fechaCorta(ev.fecha))}</span></div>`;
}
/** Al abrir sin selección, si Pablo queda fuera de la vista o bajo la hoja inferior, centra el mapa en él. */
function mostrarPablo() {
  const w = E.sel ? null : dondeEsta(E.t);
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
  const pts = ids.map((id) => L[id]).filter((l) => l && l.lat != null);
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

// ---------------------------------------------------------------------------
// Ficha (panel lateral u hoja inferior)
// ---------------------------------------------------------------------------
function chipsCitas(ref) {
  return citas(ref).map((c) => `<a class="be-ref" href="${urlCapitulo(c.libro, c.cap)}" ${EXTERNO} title="Leer ${esc(c.libro.nombre)} ${c.cap} en wol.jw.org">${esc(c.texto)}</a>`).join('');
}
function estadoHtml(estado) {
  const v = estado === 'verificado';
  return `<span class="estado estado--${v ? 'verificado' : 'pendiente'}" title="${v ? 'Alguien abrió la fuente enlazada y lo dice.' : 'Todavía nadie lo ha comprobado en la fuente.'}">${v ? 'Verificado' : 'Pendiente de verificar'}</span>`;
}
function fuentesHtml(ids) {
  const fs = (ids || []).map((id) => [id, D.fuentes[id]]).filter(([, f]) => f);
  if (!fs.length) return '<p class="be-muted">Sin fuente todavía.</p>';
  return `<ul class="fuentes">${fs.map(([id, f]) => `<li>
    <span class="be-tier be-tier--${f.nivel === 1 ? 1 : 2}" data-n="${f.nivel}">Nivel ${f.nivel}</span>
    <div><a href="${esc(f.url)}" ${EXTERNO}>${esc(f.titulo)}</a><span class="fuente-obra">${esc(f.obra)}${f.publicado ? ` · ${esc(f.publicado)}` : ''}</span>
    <span class="fuente-fecha">Consultado el ${esc(fmtDia(f.consultado))}</span></div></li>`).join('')}</ul>`;
}
function porQueHtml(obj, extra = '') {
  return `<section class="be-card ficha-sec"><div class="be-card__pad">
    <h3 class="be-card__eyebrow">Por qué lo decimos</h3>
    ${obj.razon ? `<p class="razon">${esc(obj.razon)}</p>` : ''}${extra}
    ${fuentesHtml(obj.fuentes)}
    ${obj.consultado ? `<p class="fuente-fecha">Ficha revisada el ${esc(fmtDia(obj.consultado))}</p>` : ''}
  </div></section>`;
}
function enlacesHtml(enlaces) {
  if (!enlaces?.length) return '';
  return `<div class="enlaces">${enlaces.map((e) => `<a class="be-wol" href="${esc(e.url)}" ${EXTERNO}>${esc(e.titulo)}</a>`).join('')}</div>`;
}
function videosHtml(lugarId) {
  if (VIDEOS === null) {
    return ES_FILE ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Vídeos de jw.org</h3><p class="be-muted">La lista de vídeos se ve al abrir el sitio con un servidor local (ver README).</p></div></section>` : '';
  }
  const vs = [...(VIDEOS[lugarId] || [])].sort((a, b) => (b.menciones || 0) - (a.menciones || 0));
  if (!vs.length) return '';
  const max = 6;
  return `<section class="be-card ficha-sec"><div class="be-card__pad">
    <h3 class="be-card__eyebrow">Vídeos de jw.org <b class="cuenta">${vs.length}</b></h3>
    <ul class="videos">${vs.slice(0, max).map((v) => `<li><a href="${esc(v.url)}" ${EXTERNO}>${esc(v.titulo)}</a><span class="be-row__meta">${v.publicado ? esc(fmtDia(v.publicado)) : ''}${v.menciones ? ` · lo nombra ${v.menciones} ${v.menciones === 1 ? 'vez' : 'veces'}` : ''}</span></li>`).join('')}</ul>
    ${vs.length > max ? `<p class="be-muted">Y ${vs.length - max} más en jw.org.</p>` : ''}
  </div></section>`;
}
function nombresHtml(obj) {
  const otros = (obj.nombres || []).filter((n) => n.nombre !== obj.nombre);
  if (!otros.length) return '';
  return `<ul class="nombres">${otros.map((n) => {
    const fechas = n.desde != null || n.hasta != null ? ` (${n.desde != null ? fmtAnio(n.desde) : '…'} - ${n.hasta != null ? fmtAnio(n.hasta) : '…'})` : '';
    const nota = n.nota ? String(n.nota).replace(/\.\s*$/, '') : '';
    return `<li><b>${esc(n.nombre)}</b>${fechas}${nota ? `<span class="be-muted">: ${esc(nota.charAt(0).toLowerCase() + nota.slice(1))}</span>` : ''}</li>`;
  }).join('')}</ul>`;
}
const botonSel = (sel, titulo, meta = '') => `<button type="button" class="be-row fila-boton" data-sel="${esc(sel)}"><span><span class="be-row__title">${esc(titulo)}</span>${meta ? `<span class="be-row__meta">${meta}</span>` : ''}</span><span class="be-row__end" aria-hidden="true">›</span></button>`;
const migas = (...xs) => `<nav class="be-crumbs" aria-label="Ruta">${xs.map((x) => `<span>${esc(x)}</span>`).join('<span class="be-sep" aria-hidden="true">›</span>')}</nav>`;
const cerrarHtml = () => '<button type="button" class="be-btn be-btn--sm cerrar-ficha" data-accion="cerrar">Cerrar ficha <span aria-hidden="true">×</span></button>';

function fichaAhora() {
  const w = dondeEsta(E.t);
  if (!w) {
    const antes = [...P].reverse().find((s) => s.b < E.t), despues = P.find((s) => s.a > E.t);
    return `${migas('Pablo', 'Aquí y ahora')}
      <section class="be-card"><div class="be-card__pad">
        <div class="be-card__eyebrow">${esc(fmtCursor(E.t))}</div>
        <h2 class="be-card__title">No sabemos dónde estaba Pablo en esta fecha</h2>
        <p class="be-card__body">Los datos de este corte no lo sitúan en ${esc(fmtCursor(E.t))}. No inventamos una posición: estas son las paradas con fecha más cercanas.</p>
        <div class="be-list">${antes ? botonSel(`parada:${antes.key}`, `Antes: ${antes.lugar.nombre}`, esc(antes.p.referencia)) : ''}${despues ? botonSel(`parada:${despues.key}`, `Después: ${despues.lugar.nombre}`, esc(despues.p.referencia)) : ''}</div>
      </div></section>${cartasCercaHtml()}`;
  }
  return fichaParada(w.en, w);
}
function cartasCercaHtml() {
  const cs = D.cartas.filter((c) => cartaVisible(c, E.t));
  if (!cs.length) return '';
  return `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Cartas cerca de esta fecha</h3>
    <div class="be-list">${cs.map((c) => botonSel(`carta:${c.id}`, c.libro, `${esc(origenesCarta(c).map((id) => L[id].nombre).join(' o '))} → ${esc(destinosCarta(c).map((id) => L[id].nombre).join(', ') || 'destino no indicado')} · ${esc(fechaCorta(c.fecha))}`)).join('')}</div></div></section>`;
}
function fichaParada(s, w) {
  const v = s.viaje;
  const ordinal = `Parada ${s.i + 1} de ${s.n}`;
  const enCamino = w && !w.parada && w.sig;
  const eyebrow = w ? (enCamino ? `${ordinal} · De camino a ${w.sig.lugar.nombre}` : `${ordinal} · Dónde está Pablo`) : ordinal;
  const f = s.p.fecha || {};
  const comp = (v.companeros || []).map((id) => PERS[id]).filter(Boolean);
  return `${migas('Pablo', v.nombre, s.lugar.nombre)}${E.sel ? cerrarHtml() : ''}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow"><span class="icono-lugar" aria-hidden="true"></span>${esc(eyebrow)}</div>
      <h2 class="be-card__title"><button type="button" class="enlace-titulo" data-sel="lugar:${esc(s.lugar.id)}">${esc(s.lugar.nombre)}</button></h2>
      ${nombresHtml(s.lugar)}
      ${s.p.nota ? `<p class="be-card__body">${esc(s.p.nota)}</p>` : ''}
      ${s.lugar.resumen ? `<p class="be-card__body be-muted">${esc(s.lugar.resumen)}</p>` : ''}
      <div class="fila-chips">${chipsCitas(s.p.referencia)}<span class="be-chrono be-chrono--tnm">${esc(s.narrativa ? fechaCorta(f) : (f.texto || fechaCorta(f)))}</span>
      ${s.narrativa ? '<span class="be-chrono be-chrono--approx">orden seguro, fecha aproximada</span>' : ''}</div>
      ${enCamino ? `<div class="be-list">${botonSel(`parada:${w.sig.key}`, `Siguiente: ${w.sig.lugar.nombre}`, esc(w.sig.p.referencia))}</div>` : ''}
    </div><div class="be-card__foot">${estadoHtml(s.p.estado)}<span class="be-spacer"></span>${citas(s.p.referencia)[0] ? `<a class="be-wol" href="${urlCapitulo(citas(s.p.referencia)[0].libro, citas(s.p.referencia)[0].cap)}" ${EXTERNO}>Leer en wol.jw.org</a>` : ''}</div></section>
    ${comp.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Con Pablo en este viaje</h3>
      <div class="companeros">${comp.map((p) => `<button type="button" class="companero" data-sel="persona:${esc(p.id)}"><span class="be-node be-node--persona be-node--sm">${esc(p.nombre[0])}</span><span><b>${esc(p.nombre)}</b><span class="be-row__meta">${esc(p.resumen)}</span></span></button>`).join('')}</div></div></section>` : ''}
    ${porQueHtml(s.p)}
    ${videosHtml(s.lugar.id)}
    ${!E.sel ? cartasCercaHtml() : ''}`;
}
function fichaLugar(id) {
  const l = L[id];
  const paradas = P.filter((s) => s.lugar.id === id);
  const cartasDe = D.cartas.filter((c) => origenesCarta(c).includes(id));
  const cartasA = D.cartas.filter((c) => destinosCarta(c).includes(id));
  const tipo = { ciudad: 'Ciudad', region: 'Región', isla: 'Isla', provincia: 'Provincia', puerto: 'Puerto', cabo: 'Cabo' }[l.tipo] || l.tipo;
  const prec = { punto: '', zona: ' · región: el punto solo la representa', incierto: ' · ubicación incierta' }[l.precision] || '';
  return `${migas('Lugares', l.nombre)}${cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow"><span class="icono-lugar" aria-hidden="true"></span>${esc(tipo + prec)}</div>
      <h2 class="be-card__title">${esc(l.nombre)}</h2>
      ${nombresHtml(l)}
      ${l.resumen ? `<p class="be-card__body">${esc(l.resumen)}</p>` : ''}
      ${enlacesHtml(l.enlaces)}
    </div><div class="be-card__foot">${estadoHtml(l.estado)}<span class="be-spacer"></span>${l.coord_url ? `<a class="be-wol" href="${esc(l.coord_url)}" ${EXTERNO}>Coordenada: ${/^openbible/.test(l.coord_fuente || '') ? 'OpenBible.info' : esc(String(l.coord_fuente || 'fuente').split(':')[0])}</a>` : ''}</div></section>
    ${paradas.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Pablo estuvo aquí <b class="cuenta">${paradas.length}</b></h3>
      <div class="be-list">${paradas.map((s) => botonSel(`parada:${s.key}`, s.viaje.nombre, `${esc(s.p.referencia)} · ${esc(s.narrativa ? `${fechaCorta(s.p.fecha)}, fecha aproximada` : (s.p.fecha?.texto || ''))}`)).join('')}</div></div></section>` : ''}
    ${cartasDe.length || cartasA.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Cartas</h3>
      <div class="be-list">${cartasDe.map((c) => botonSel(`carta:${c.id}`, `${c.libro}, escrita aquí`, esc(fechaCorta(c.fecha)))).join('')}${cartasA.map((c) => botonSel(`carta:${c.id}`, `${c.libro}, enviada aquí`, esc(fechaCorta(c.fecha)))).join('')}</div></div></section>` : ''}
    ${porQueHtml(l)}
    ${videosHtml(id)}`;
}
function fichaCarta(id) {
  const c = D.cartas.find((x) => x.id === id);
  const orden = cartasOrdenadas().indexOf(c) + 1;
  const os = origenesCarta(c), ds = destinosCarta(c);
  const extremo = (etiqueta, ids, ctx, vacio) => `<div class="be-end">
      <div class="be-end__label">${etiqueta}</div>
      <div class="be-end__place">${ids.length ? ids.map((x) => `<button type="button" class="enlace-titulo" data-sel="lugar:${esc(x)}">${esc(L[x].nombre)}</button>`).join(' <span class="be-muted">o</span> ') : esc(vacio)}</div>
      ${ctx?.resumen ? `<p class="be-end__text">${esc(ctx.resumen)}</p>` : ''}
      ${ctx?.fuentes?.length ? `<div class="fuentes-mini">${ctx.fuentes.map((f) => D.fuentes[f]).filter(Boolean).map((f) => `<a href="${esc(f.url)}" ${EXTERNO}>${esc(f.titulo)}</a>`).join('')}</div>` : ''}
    </div>`;
  const cita = citas(c.referencia)[0];
  return `${migas('Pablo', 'Cartas', c.libro)}${cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="cabecera-carta"><span class="be-node be-node--texto be-node--lg" aria-hidden="true"><span class="icono-carta"></span></span>
        <div><h2 class="be-card__title">${esc(c.libro)}</h2><p class="be-card__sub">${orden}.ª de ${D.cartas.length} por fecha · ${c.destinatarios?.texto ? `Destinatarios: ${esc(c.destinatarios.texto)}` : 'Destinatarios no indicados'}</p></div>
        <span class="be-chrono be-chrono--tnm">${esc(fechaCorta(c.fecha))}</span></div>
      <h3 class="be-card__eyebrow extremos-titulo">Qué pasaba en cada extremo en esta fecha</h3>
      <div class="be-ends">${extremo('Desde · escrita en', os, c.contexto_origen, 'sin lugar')}<div class="be-ends__arrow" aria-hidden="true">→</div>${extremo('Para · destino', ds, c.contexto_destino, 'destino no indicado')}</div>
      ${c.nota ? `<p class="be-card__body be-muted nota-carta">${esc(c.nota)}</p>` : ''}
      <div class="fila-chips">${chipsCitas(c.referencia)}${c.fecha?.texto && c.fecha.texto !== fechaCorta(c.fecha) ? `<span class="be-chrono be-chrono--approx">${esc(c.fecha.texto)}</span>` : ''}</div>
      ${enlacesHtml(c.enlaces)}
    </div><div class="be-card__foot">${estadoHtml(c.estado)}<span class="be-spacer"></span>${cita ? `<a class="be-wol" href="${urlCapitulo(cita.libro, 1)}" ${EXTERNO}>Leer ${esc(c.libro)} en wol.jw.org</a>` : ''}</div></section>
    ${porQueHtml(c)}`;
}
function fichaPersona(id) {
  const p = PERS[id];
  const viajes = D.viajes.filter((v) => v.persona === id || (v.companeros || []).includes(id));
  return `${migas('Personas', p.nombre)}${cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="cabecera-carta"><span class="be-node be-node--persona be-node--lg" aria-hidden="true">${esc(p.nombre[0])}</span>
      <div><h2 class="be-card__title">${esc(p.nombre)}</h2>${nombresHtml(p)}</div></div>
      ${p.resumen ? `<p class="be-card__body">${esc(p.resumen)}</p>` : ''}
      ${enlacesHtml(p.enlaces)}
    </div><div class="be-card__foot">${estadoHtml(p.estado)}</div></section>
    ${viajes.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">${id === 'pablo' ? 'Sus viajes' : 'Con Pablo'}</h3>
      <div class="be-list">${viajes.map((v) => botonSel(`viaje:${v.id}`, v.nombre, `${esc(v.referencia)} · ${esc(fechaCorta(v.fecha))}`)).join('')}</div></div></section>` : ''}
    ${id === 'pablo' ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Sus cartas <b class="cuenta">${D.cartas.length}</b></h3>
      <div class="be-list">${cartasOrdenadas().map((c) => botonSel(`carta:${c.id}`, c.libro, esc(fechaCorta(c.fecha)))).join('')}</div></div></section>` : ''}
    ${porQueHtml(p)}`;
}
function fichaViaje(id) {
  const v = D.viajes.find((x) => x.id === id);
  const ps = P.filter((s) => s.viaje === v);
  const comp = (v.companeros || []).map((x) => PERS[x]).filter(Boolean);
  return `${migas('Pablo', v.nombre)}${cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow">Viaje · ${ps.length} paradas</div>
      <h2 class="be-card__title">${esc(v.nombre)}</h2>
      ${v.resumen ? `<p class="be-card__body">${esc(v.resumen)}</p>` : ''}
      ${comp.length ? `<p class="be-card__sub">Con ${comp.map((p) => `<button type="button" class="enlace-titulo" data-sel="persona:${esc(p.id)}">${esc(p.nombre)}</button>`).join(', ')}</p>` : ''}
      <div class="fila-chips">${chipsCitas(v.referencia)}<span class="be-chrono be-chrono--tnm">${esc(v.fecha?.texto || fechaCorta(v.fecha))}</span></div>
    </div></section>
    <section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Paradas</h3>
      <ol class="be-list paradas">${ps.map((s) => `<li>${botonSel(`parada:${s.key}`, `${s.i + 1}. ${s.lugar.nombre}`, `${esc(s.p.referencia)}${s.narrativa ? ' · fecha aproximada' : ` · ${esc(s.p.fecha?.texto || '')}`}`)}</li>`).join('')}</ol></div></section>
    ${porQueHtml({ razon: v.razon || 'La referencia del viaje enlaza el relato; cada parada lleva su propia fuente.', fuentes: v.fuentes })}`;
}
function fichaPeriodo(id) {
  const p = D.periodos.find((x) => x.id === id);
  const tipo = { emperador: 'Emperador', gobernador: 'Gobernador', potencia: 'Potencia' }[p.tipo] || p.tipo;
  return `${migas('Periodos', p.nombre)}${cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow">${esc(tipo)}</div>
      <h2 class="be-card__title">${esc(p.nombre)}</h2>
      ${p.resumen ? `<p class="be-card__body">${esc(p.resumen)}</p>` : ''}
      <div class="fila-chips"><span class="be-chrono be-chrono--tnm">${esc(p.fecha?.texto || fechaCorta(p.fecha))}</span>${(p.lugares || []).map((x) => L[x] ? `<button type="button" class="be-chip" data-sel="lugar:${esc(x)}">${esc(L[x].nombre)}</button>` : '').join('')}</div>
    </div><div class="be-card__foot">${estadoHtml(p.estado)}</div></section>
    ${porQueHtml(p)}`;
}
function fichaEvento(id) {
  const e = D.eventos.find((x) => x.id === id);
  return `${migas('Sucesos', e.titulo)}${cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow">Suceso</div>
      <h2 class="be-card__title">${esc(e.titulo)}</h2>
      ${e.resumen ? `<p class="be-card__body">${esc(e.resumen)}</p>` : ''}
      <div class="fila-chips">${chipsCitas((e.pasajes || []).join('; '))}<span class="be-chrono be-chrono--tnm">${esc(e.fecha?.texto || fechaCorta(e.fecha))}</span>${(e.lugares || []).map((x) => L[x] ? `<button type="button" class="be-chip" data-sel="lugar:${esc(x)}">${esc(L[x].nombre)}</button>` : '').join('')}</div>
    </div><div class="be-card__foot">${estadoHtml(e.estado)}</div></section>
    ${porQueHtml(e)}`;
}
function fichaPasaje(id) {
  const { libro: lib, cap } = pasajeDeId(id);
  const r = implicados({ tipo: 'pasaje', id });
  const paradas = P.filter((s) => r.claves.has(`parada:${s.key}`));
  const cartas = D.cartas.filter((c) => r.claves.has(`carta:${c.id}`));
  const eventos = (D.eventos || []).filter((e) => r.claves.has(`evento:${e.id}`));
  return `${migas('Pasajes', `${lib.nombre} ${cap}`)}${cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow">Pasaje</div>
      <h2 class="be-card__title">${esc(lib.nombre)} ${cap}</h2>
      <p class="be-card__body">El texto no se copia aquí: se lee en wol.jw.org. En el mapa y en la línea de tiempo queda resaltado lo que cuenta este capítulo.</p>
    </div><div class="be-card__foot"><span class="be-spacer"></span><a class="be-wol" href="${urlCapitulo(lib, cap)}" ${EXTERNO}>Leer ${esc(lib.nombre)} ${cap} en wol.jw.org</a></div></section>
    ${paradas.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Paradas de Pablo <b class="cuenta">${paradas.length}</b></h3>
      <div class="be-list">${paradas.map((s) => botonSel(`parada:${s.key}`, s.lugar.nombre, `${esc(s.p.referencia)} · ${esc(s.viaje.nombre)}`)).join('')}</div></div></section>` : ''}
    ${cartas.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Carta</h3><div class="be-list">${cartas.map((c) => botonSel(`carta:${c.id}`, c.libro, esc(fechaCorta(c.fecha)))).join('')}</div></div></section>` : ''}
    ${eventos.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Sucesos</h3><div class="be-list">${eventos.map((e) => botonSel(`evento:${e.id}`, e.titulo, esc(e.fecha?.texto || ''))).join('')}</div></div></section>` : ''}
    ${!paradas.length && !cartas.length && !eventos.length ? '<p class="be-muted">Este corte todavía no tiene datos de este capítulo.</p>' : ''}`;
}
let clavePanel = '';
function pintarPanel(forzar) {
  let clave;
  if (E.sel) clave = selTexto(E.sel);
  else {
    const w = dondeEsta(E.t);
    clave = w ? `ahora|${w.en.key}|${w.parada ? '' : w.sig?.key}|${D.cartas.filter((c) => cartaVisible(c, E.t)).map((c) => c.id)}` : `nada|${Math.floor(E.t)}`;
  }
  if (!forzar && clave === clavePanel) return;
  clavePanel = clave;
  let html;
  if (!E.sel) html = fichaAhora();
  else {
    const { tipo, id } = E.sel;
    html = {
      lugar: fichaLugar, carta: fichaCarta, persona: fichaPersona, viaje: fichaViaje, periodo: fichaPeriodo, evento: fichaEvento, pasaje: fichaPasaje,
      parada: (k) => fichaParada(P.find((s) => s.key === k), null),
    }[tipo](id);
  }
  const cuerpo = $('#panel-cuerpo');
  cuerpo.innerHTML = html;
  if (forzar) cuerpo.scrollTop = 0;
}

// ---------------------------------------------------------------------------
// Línea de tiempo (SVG propio)
// ---------------------------------------------------------------------------
const EJE = 26, CARRIL = 30;
const CARRILES = [
  { id: 'pablo', nombre: 'Pablo', icono: 'persona' },
  { id: 'cartas', nombre: 'Cartas', icono: 'carta' },
  { id: 'cartas2', nombre: 'Más cartas', icono: 'carta' },
  { id: 'mientras', nombre: 'Sucesos', icono: 'reloj' },
  { id: 'emperador', nombre: 'Emperadores', icono: 'corona' },
  { id: 'gobernador', nombre: 'Gobernadores', icono: 'corona' },
];
const ICONOS = {
  persona: '<svg class="be-i be-i--sm" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  carta: '<svg class="be-i be-i--sm" viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 11h6M9 15h6" stroke="currentColor" stroke-width="1.6"/></svg>',
  reloj: '<svg class="be-i be-i--sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  corona: '<svg class="be-i be-i--sm" viewBox="0 0 24 24"><path d="m4 17-1-9 5 4 4-6 4 6 5-4-1 9Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
};
let anchoLinea = 800;
const xDe = (t) => ((t - E.vista[0]) / span()) * anchoLinea;
const tDe = (x) => E.vista[0] + (x / anchoLinea) * span();
const yCarril = (id) => EJE + CARRILES.findIndex((c) => c.id === id) * CARRIL;
const anchoTexto = (s, px = 10.5) => s.length * px * 0.6 + 4;
function nivelFuentes(ids) { return Math.min(...(ids || []).map((id) => D.fuentes[id]?.nivel || 2)); }
function pintarCarriles() {
  $('#carriles').innerHTML = `<div class="carriles-eje"></div>${CARRILES.map((c) => {
    let extra = '';
    if (c.id === 'emperador' || c.id === 'gobernador') {
      const ps = (D.periodos || []).filter((p) => p.tipo === c.id);
      if (ps.length && ps.every((p) => nivelFuentes(p.fuentes) > 1)) extra = '<span class="be-tier be-tier--2 nivel-carril" data-n="2">N2</span>';
    }
    return `<div class="be-lane-label">${ICONOS[c.icono]}<span>${esc(c.nombre)}</span>${extra}</div>`;
  }).join('')}`;
}
function dim(clave) {
  const r = E.resaltado;
  if (!r) return '';
  return r.claves.has(clave) ? ' resaltado' : ' atenuado';
}
function pintarLineaFija() {
  const svg = $('#linea-svg');
  const pista = $('#pista');
  anchoLinea = pista.clientWidth || 800;
  const alto = pista.clientHeight || 200;
  svg.setAttribute('width', anchoLinea); svg.setAttribute('height', alto);
  svg.setAttribute('viewBox', `0 0 ${anchoLinea} ${alto}`);
  const s = span(), pxAnio = anchoLinea / s;
  const partes = [];
  partes.push(`<defs>
    <linearGradient id="g-difuso" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".05" stop-color="#fff" stop-opacity="1"/><stop offset=".95" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="m-difuso" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#g-difuso)"/></mask>
    <pattern id="p-rayas" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(135)"><rect width="3" height="8" fill="rgba(122,92,142,.13)"/></pattern>
  </defs>`);
  // Filas alternas
  CARRILES.forEach((c, i) => { if (i % 2) partes.push(`<rect class="fila-par" x="0" y="${EJE + i * CARRIL}" width="${anchoLinea}" height="${CARRIL}"/>`); });
  partes.push(`<g class="eje">${marcasEje(pxAnio)}</g>`);
  // Pablo: un tramo por viaje, con sus paradas como marcas.
  const yP = yCarril('pablo');
  const V = viajeActual(dondeEsta(E.t));
  for (const v of D.viajes) {
    const ps = P.filter((x) => x.viaje === v);
    if (!ps.length) continue;
    const a = ps[0].a, b = ps[ps.length - 1].b;
    if (b < E.vista[0] || a > E.vista[1]) continue;
    const x0 = xDe(a), x1 = Math.max(xDe(b), x0 + 4);
    const algunaRes = E.resaltado && ps.some((x) => E.resaltado.claves.has(`parada:${x.key}`));
    const cls = E.resaltado ? (E.resaltado.claves.has(`viaje:${v.id}`) || algunaRes ? ' resaltado' : ' atenuado') : '';
    const w = x1 - x0;
    const etiqueta = recortar(`${v.nombre} · ${fechaCorta(v.fecha)}`, w - 14);
    partes.push(`<g class="item viaje${v === V ? ' activo' : ''}${cls}" data-sel="viaje:${esc(v.id)}" tabindex="0" role="button" aria-label="${esc(v.nombre)}, ${esc(fechaCorta(v.fecha))}">
      <rect x="${x0}" y="${yP + 5}" width="${w}" height="20" rx="5" class="barra-viaje" style="fill:${colorViaje(v.id)}"${v.fecha?.aprox ? ' mask="url(#m-difuso)"' : ''}/>
      ${etiqueta ? `<text x="${x0 + Math.min(12, w * 0.06) + 4}" y="${yP + 19}" class="texto-barra">${esc(etiqueta)}</text>` : ''}</g>`);
    if (pxAnio > 45) {
      for (const st of ps) {
        const x = xDe(st.a);
        const c2 = dim(`parada:${st.key}`);
        partes.push(`<g class="item parada${c2}" data-sel="parada:${esc(st.key)}"><title>${esc(st.lugar.nombre)} · ${esc(st.p.referencia)}</title>
          <rect x="${x - 1}" y="${yP + 7}" width="${Math.max(2, xDe(st.b) - x + 2)}" height="16" rx="1" class="marca-parada${st.narrativa ? ' narrativa' : ''}"/></g>`);
      }
    }
  }
  // Cartas: las que comparten fechas van juntas. Tramo si la fecha abarca varios años; si no, rombo en el momento
  // en que el modelo pone a Pablo donde la escribió. Los rombos a menos de 24 px se funden en uno. Dos filas sin solapes.
  const grupos = new Map(), rombos = [];
  for (const c of cartasOrdenadas()) {
    const tr = tramo(c.fecha);
    if (!tr) continue;
    if (tr[1] - tr[0] > 1) {
      const k = `${tr[0]}|${tr[1]}`;
      if (!grupos.has(k)) grupos.set(k, { tr, cartas: [] });
      grupos.get(k).cartas.push(c);
    } else rombos.push({ tr, x: xDe(momentoCarta(c)), c });
  }
  rombos.sort((a, b) => a.x - b.x);
  const gruposRombo = [];
  for (const r of rombos) {
    const g = gruposRombo.at(-1);
    if (g && r.x - g.x < 24) g.cartas.push(r.c);
    else gruposRombo.push({ tr: r.tr, x: r.x, cartas: [r.c] });
  }
  const itemsCartas = [...grupos.values(), ...gruposRombo].map(({ tr, cartas, x }) => {
    const esTramo = x == null;
    const cortas = cartas.map(abrCarta).join(' · ');
    const nombre = cartas.length > 1 ? cortas : cartas[0].libro;
    const etiqueta = `${nombre}${esTramo ? ` · ${fechaCorta(cartas[0].fecha).replace(' e.c.', '')}` : ''}`;
    const x0 = esTramo ? xDe(tr[0]) : x - 7;
    const x1 = esTramo ? Math.max(xDe(tr[1]), x0 + 6) : x0 + 14;
    const lx = esTramo ? x0 + 8 : x0 + 19;
    return { tr, cartas, esTramo, etiqueta, corto: cortas, x0, x1, lx, lw: anchoTexto(etiqueta) };
  }).filter((it) => it.x1 > -300 && it.x0 < anchoLinea + 50);
  empaquetar(itemsCartas, ['cartas', 'cartas2']);
  for (const it of itemsCartas) {
    const y = yCarril(it.fila);
    const sel = E.sel?.tipo === 'carta' && it.cartas.some((c) => c.id === E.sel.id);
    const principal = sel ? it.cartas.find((c) => c.id === E.sel.id) : it.cartas[0];
    const res = E.resaltado ? (it.cartas.some((c) => E.resaltado.claves.has(`carta:${c.id}`)) ? ' resaltado' : ' atenuado') : '';
    const cls = `item carta${sel ? ' seleccionada' : ''}${res}`;
    const nombres = it.cartas.map((c) => c.libro).join(', ');
    const aria = `aria-label="${esc(nombres)}, ${esc(fechaCorta(principal.fecha))}"`;
    const forma = it.esTramo
      ? `<rect x="${it.x0}" y="${y + 6}" width="${it.x1 - it.x0}" height="18" rx="5" class="tramo-carta"/>`
      : `<rect x="${it.x0 + 1}" y="${y + 9}" width="12" height="12" rx="2" transform="rotate(45 ${it.x0 + 7} ${y + 15})" class="rombo"/>`;
    partes.push(`<g class="${cls}" data-sel="carta:${esc(principal.id)}" tabindex="0" role="button" ${aria}><title>${esc(nombres)} · ${esc(fechaCorta(principal.fecha))}</title>${forma}${textoItem(it, y, it.esTramo ? 'texto-carta' : 'texto-punto')}</g>`);
  }
  // Sucesos: un tramo por suceso; la etiqueta se corta antes del siguiente.
  const itemsEv = (D.eventos || []).map((e) => {
    const tr = tramo(e.fecha);
    if (!tr) return null;
    const x0 = xDe(tr[0]), x1 = Math.max(xDe(tr[1]), x0 + 6);
    // Código corto: el libro si el suceso es una carta («1Te»); si no, lugar y año («Jerusalén 49»).
    const lib = citas((e.pasajes || []).join('; '))[0]?.libro;
    const lugar = L[(e.lugares || [])[0]]?.nombre;
    const corto = lib && lib.num !== 44 ? lib.abr : `${lugar || e.titulo.split(/[\s:,]/)[0]} ${fmtAnio(tr[0]).replace(' e.c.', '')}`;
    return { e, tr, x0, x1, lx: x0 + 7, etiqueta: e.titulo, corto, lw: anchoTexto(e.titulo) };
  }).filter((it) => it && it.x1 > -300 && it.x0 < anchoLinea + 50).sort((a, b) => a.x0 - b.x0);
  empaquetar(itemsEv, ['mientras']);
  for (const it of itemsEv) {
    const y = yCarril('mientras');
    partes.push(`<g class="item evento${dim(`evento:${it.e.id}`)}" data-sel="evento:${esc(it.e.id)}" tabindex="0" role="button" aria-label="${esc(it.e.titulo)}, ${esc(it.e.fecha.texto || '')}"><title>${esc(it.e.titulo)} · ${esc(it.e.fecha.texto || '')}</title>
      <rect x="${it.x0}" y="${y + 6}" width="${it.x1 - it.x0}" height="18" rx="5" class="tramo-evento"/>${textoItem(it, y, 'texto-evento')}</g>`);
  }
  // Periodos: emperadores y gobernadores.
  for (const p of D.periodos || []) {
    const carril = p.tipo === 'gobernador' ? 'gobernador' : (p.tipo === 'emperador' ? 'emperador' : null);
    const tr = tramo(p.fecha);
    if (!carril || !tr) continue;
    const y = yCarril(carril), x0 = xDe(tr[0]), x1 = xDe(tr[1]);
    const etiqueta = recortar(`${p.nombre} · ${String(p.fecha.texto || fechaCorta(p.fecha)).replace(' e.c.', '')}`, x1 - x0 - 14);
    partes.push(`<g class="item periodo periodo--${carril}${dim(`periodo:${p.id}`)}" data-sel="periodo:${esc(p.id)}" tabindex="0" role="button" aria-label="${esc(p.nombre)}, ${esc(p.fecha.texto || '')}">
      <rect x="${x0}" y="${y + 5}" width="${Math.max(x1 - x0 - 1, 3)}" height="20" rx="4" class="barra-periodo"/>${etiqueta ? `<text x="${Math.max(x0, 0) + 8}" y="${y + 19}" class="texto-barra">${esc(etiqueta)}</text>` : ''}</g>`);
  }
  partes.push('<g id="linea-cursor"></g>');
  svg.innerHTML = partes.join('');
  sucio.cursor = true;
  $('#velocidad').textContent = textoVelocidad();
  document.querySelectorAll('[data-zoom]').forEach((b) => {
    const z = +b.dataset.zoom;
    const on = Math.abs(Math.log(s / z)) < Math.log(2.2);
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
  });
  pintarLineaFija.claveV = V?.id;
}
/** Reparte elementos en filas: primero la fila libre; si no hay, la menos ocupada. Luego calcula cuánto sitio tiene cada etiqueta. */
function empaquetar(items, filas) {
  items.sort((a, b) => a.x0 - b.x0);
  const finTodo = filas.map(() => -1e9), finForma = filas.map(() => -1e9);
  for (const it of items) {
    let i = finTodo.findIndex((f) => f <= it.x0 - 3);                 // cabe con su etiqueta
    if (i < 0) i = finForma.findIndex((f) => f <= it.x0 - 3);          // cabe la forma; se recorta la etiqueta anterior
    if (i < 0) i = finForma.indexOf(Math.min(...finForma));
    it.fila = filas[i];
    finForma[i] = it.x1;
    finTodo[i] = Math.max(it.x1, it.lx + it.lw);
  }
  rotular(items);
}
/** Coloca la etiqueta de cada elemento sin pisar a sus vecinos de fila. Por orden: entera a la derecha, entera a la
    izquierda, recortada si queda sitio para algo legible, el código corto («1Te», «Jerusalén 49») a un lado o centrado
    dentro de su propio tramo y, si no cabe nada, recortada en el hueco mayor. */
function rotular(items) {
  const libre = new Map();          // fila → x donde acaba lo ya dibujado
  items.forEach((it, i) => {
    const sig = items.slice(i + 1).find((o) => o.fila === it.fila);
    const desde = libre.get(it.fila) ?? -Infinity;
    const der = (sig ? sig.x0 - 6 : Infinity) - it.lx;
    const finIzq = it.x0 - 5;
    const izq = finIzq - Math.max(desde + 6, 0);
    const ancho = (t) => anchoTexto(t);
    const opciones = [
      [it.etiqueta, der, 'der'], [it.etiqueta, izq, 'izq'],
      ...(Math.max(der, izq) >= 60 ? [[it.etiqueta, Math.max(der, izq), der >= izq ? 'der' : 'izq', true]] : []),
      ...(it.corto ? [[it.corto, der, 'der'], [it.corto, izq, 'izq'], [it.corto, it.x1 - it.x0, 'dentro']] : []),
      [it.etiqueta, Math.max(der, izq), der >= izq ? 'der' : 'izq', true],
    ];
    it.texto = ''; it.lado = 'der';
    for (const [t, px, lado, cortar] of opciones) {
      const texto = cortar ? recortar(t, px) : (ancho(t) <= px ? t : '');
      if (texto) { it.texto = texto; it.lado = lado; break; }
    }
    const finTexto = it.texto && it.lado === 'der' ? it.lx + ancho(it.texto) : -Infinity;
    libre.set(it.fila, Math.max(it.x1, finTexto));
  });
}
function textoItem(it, y, clase) {
  if (!it.texto) return '';
  if (it.lado === 'izq') return `<text x="${it.x0 - 5}" y="${y + 19}" text-anchor="end" class="${clase}">${esc(it.texto)}</text>`;
  if (it.lado === 'dentro') return `<text x="${(it.x0 + it.x1) / 2}" y="${y + 19}" text-anchor="middle" class="${clase}">${esc(it.texto)}</text>`;
  return `<text x="${it.lx}" y="${y + 19}" class="${clase}">${esc(it.texto)}</text>`;
}
function recortar(texto, px) {
  if (!(px >= 24)) return px === Infinity ? texto : '';
  const max = Math.floor(px / 6.3);
  return texto.length <= max ? texto : `${texto.slice(0, Math.max(1, max - 1))}…`;
}
function marcasEje(pxAnio) {
  const pasos = [10, 5, 2, 1, 0.5, 0.25, 1 / 12];
  let mayor = pasos.find((p, i) => p * pxAnio < 70 ? false : (i === pasos.length - 1 || pasos[i + 1] * pxAnio < 70)) || 1 / 12;
  if (mayor * pxAnio < 70) mayor = pasos.find((p) => p * pxAnio >= 70) || 10;
  const menor = mayor >= 5 ? 1 : mayor >= 1 ? (pxAnio > 140 ? 1 / 12 : 0.25) : 1 / 12;
  const out = [];
  const inicio = Math.floor(E.vista[0] / menor) * menor;
  for (let t = inicio; t <= E.vista[1] + menor; t += menor) {
    const tt = Math.round(t * 12) / 12;
    const x = xDe(tt);
    const esMayor = Math.abs(tt / mayor - Math.round(tt / mayor)) < 1e-6;
    if (esMayor) {
      const y = Math.floor(tt + 1e-9), mes = Math.round((tt - y) * 12);
      const texto = mayor >= 1 ? fmtAnio(y) : (mes === 0 ? `${MESES[0]} ${fmtAnio(y)}` : MESES[mes]);
      out.push(`<line x1="${x}" x2="${x}" y1="0" y2="${EJE}" class="tick-mayor"/><line x1="${x}" x2="${x}" y1="${EJE}" y2="400" class="rejilla"/><text x="${x + 5}" y="16" class="tick-texto">${esc(texto)}</text>`);
    } else {
      out.push(`<line x1="${x}" x2="${x}" y1="${EJE - 6}" y2="${EJE}" class="tick-menor"/>`);
    }
  }
  out.push(`<line x1="0" x2="${anchoLinea}" y1="${EJE}" y2="${EJE}" class="linea-eje"/>`);
  return out.join('');
}
function pintarCursor() {
  const g = $('#linea-cursor');
  if (!g) return;
  const x = xDe(E.t);
  const w = dondeEsta(E.t);
  const alto = $('#pista').clientHeight || 200;
  const fino = span() < 4;
  const lugar = w ? (w.parada ? w.en.lugar.nombre : `hacia ${w.sig.lugar.nombre}`) : '';
  const bandera = `${w?.estimada || !fino ? 'c. ' : ''}${fmtCursor(E.t, fino)}${lugar ? ` · ${lugar}` : ''}`;
  const anchoB = anchoTexto(bandera, 10.5) + 14;
  const bx = clamp(x - anchoB / 2, 0, anchoLinea - anchoB);
  let banda = '';
  if (w?.estimada && w.banda) {
    const b0 = xDe(w.banda[0]), b1 = xDe(w.banda[1]);
    banda = `<rect x="${b0}" y="${EJE}" width="${Math.max(0, b1 - b0)}" height="${alto - EJE}" fill="url(#p-rayas)" class="banda-incierta"><title>Tiempo narrativo: sabemos el orden de las paradas, no la fecha de cada una</title></rect>`;
  }
  g.innerHTML = `${banda}<line x1="${x}" x2="${x}" y1="0" y2="${alto}" class="cursor-linea"/>
    <rect x="${bx}" y="3" width="${anchoB}" height="20" rx="5" class="cursor-bandera"/><text x="${bx + anchoB / 2}" y="17" text-anchor="middle" class="cursor-texto">${esc(bandera)}</text>`;
  const pista = $('#pista');
  pista.setAttribute('aria-valuenow', E.t.toFixed(2));
  pista.setAttribute('aria-valuetext', bandera);
  // Barra superior y estado
  $('#fecha-valor').textContent = `${w?.estimada || !fino ? 'c. ' : ''}${fmtCursor(E.t, fino)}`;
  $('#fecha-pista').textContent = w?.estimada ? 'tiempo narrativo · TNM' : 'cronología TNM';
  const emp = (D.periodos || []).find((p) => p.tipo === 'emperador' && (() => { const tr = tramo(p.fecha); return tr && E.t >= tr[0] && E.t < tr[1]; })());
  $('#linea-estado').textContent = [emp ? emp.nombre : '', w ? `Pablo ${w.parada ? 'en' : 'hacia'} ${w.parada ? w.en.lugar.nombre : w.sig.lugar.nombre}` : 'Sin datos de Pablo'].filter(Boolean).join(' · ');
}
function marcasEjeZoom(factor, tAncla) {
  const s = clamp(span() * factor, 0.25, 120);
  const f = (tAncla - E.vista[0]) / span();
  let v0 = tAncla - f * s;
  v0 = clamp(v0, T_MIN, T_MAX - s);
  E.vista = [v0, v0 + s];
  sucio.linea = true; programar();
}
function iniciarLinea() {
  pintarCarriles();
  const pista = $('#pista');
  const punteros = new Map();
  let arrastre = null, pinza = null;
  pista.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = pista.getBoundingClientRect();
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
      const d = (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) / anchoLinea * span();
      const v0 = clamp(E.vista[0] + d, T_MIN, T_MAX - span());
      E.vista = [v0, v0 + span()]; sucio.linea = true; programar();
    } else {
      marcasEjeZoom(Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), tDe(e.clientX - r.left));
    }
  }, { passive: false });
  pista.addEventListener('pointerdown', (e) => {
    const r = pista.getBoundingClientRect();
    punteros.set(e.pointerId, e.clientX);
    if (punteros.size === 2) {
      const xs = [...punteros.values()];
      pinza = { d: Math.abs(xs[0] - xs[1]), s: span(), t: tDe((xs[0] + xs[1]) / 2 - r.left) };
      arrastre = null; return;
    }
    if (e.target.closest('[data-sel]')) return;   // el clic en un elemento lo gestiona el delegado general
    arrastre = { x: e.clientX };
    pista.setPointerCapture(e.pointerId);
    setT(tDe(e.clientX - r.left));
  });
  pista.addEventListener('pointermove', (e) => {
    const r = pista.getBoundingClientRect();
    if (punteros.has(e.pointerId)) punteros.set(e.pointerId, e.clientX);
    if (pinza && punteros.size === 2) {
      const xs = [...punteros.values()];
      const d = Math.max(10, Math.abs(xs[0] - xs[1]));
      const s = clamp(pinza.s * pinza.d / d, 0.25, 120);
      marcasEjeZoom(s / span(), pinza.t);
      return;
    }
    if (arrastre) setT(tDe(e.clientX - r.left));
  });
  const fin = (e) => {
    punteros.delete(e.pointerId);
    if (punteros.size < 2) pinza = null;
    arrastre = null;
  };
  pista.addEventListener('pointerup', fin);
  pista.addEventListener('pointercancel', (e) => { punteros.delete(e.pointerId); pinza = null; arrastre = null; });
  document.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
    const s = +b.dataset.zoom;
    let v0 = clamp(E.t - s * 0.4, T_MIN, T_MAX - s);
    E.vista = [v0, v0 + s]; sucio.linea = true; programar();
  }));
  $('#reproducir').addEventListener('click', () => reproducir(!E.play));
  $('#anterior').addEventListener('click', () => saltar(-1));
  $('#siguiente').addEventListener('click', () => saltar(1));
  new ResizeObserver(() => { sucio.linea = true; programar(); }).observe(pista);
}

// ---------------------------------------------------------------------------
// Búsqueda
// ---------------------------------------------------------------------------
let resultados = [], activo = 0;
function buscar(q) {
  const nq = norm(q).trim();
  if (!nq) return [];
  const out = [];
  // Pasaje: «Hch 16», «Hechos 16:12», «1Co 5»
  const m = q.trim().match(/^([123]?\s?[A-Za-zÁÉÍÓÚáéíóúÑñ]+)\.?\s*(\d+)(?:\s*[:.,]\s*(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
  if (m) {
    const lib = libro(m[1]);
    if (lib) {
      const cap = +m[2];
      const id = idPasaje(lib, cap);
      const n = implicados({ tipo: 'pasaje', id }).claves.size;
      out.push({ grupo: 'Pasajes', sel: { tipo: 'pasaje', id }, titulo: `${lib.nombre} ${cap}${m[3] ? `:${m[3]}${m[4] ? `-${m[4]}` : ''}` : ''}`, meta: n ? `${n} ${n === 1 ? 'dato' : 'datos'} en el mapa` : 'sin datos en este corte', puntos: 1000 });
    }
  }
  const puntuar = (textos) => {
    let mejor = 0;
    for (const t of textos) {
      const n = norm(t);
      if (!n) continue;
      if (n === nq) mejor = Math.max(mejor, 100);
      else if (n.startsWith(nq)) mejor = Math.max(mejor, 80);
      else if (n.split(/[\s-]+/).some((p) => p.startsWith(nq))) mejor = Math.max(mejor, 60);
      else if (nq.length >= 3 && n.includes(nq)) mejor = Math.max(mejor, 30);
    }
    return mejor;
  };
  for (const l of Object.values(L)) {
    const p = puntuar([l.nombre, ...(l.nombres || []).map((n) => n.nombre)]);
    if (p) out.push({ grupo: 'Lugares', sel: { tipo: 'lugar', id: l.id }, titulo: l.nombre, meta: [nombreHoy(l) ? `hoy ${nombreHoy(l)}` : '', `${P.filter((s) => s.lugar.id === l.id).length} paradas`].filter(Boolean).join(' · '), puntos: p });
  }
  for (const p of Object.values(PERS)) {
    const pp = puntuar([p.nombre, ...(p.nombres || []).map((n) => n.nombre)]);
    if (pp) out.push({ grupo: 'Personas', sel: { tipo: 'persona', id: p.id }, titulo: p.nombre, meta: p.resumen, puntos: pp });
  }
  for (const c of D.cartas) {
    const cita = citas(c.referencia)[0];
    const pp = puntuar([c.libro, cita?.libro.abr, ...(cita?.libro.formas || [])]);
    if (pp) out.push({ grupo: 'Cartas', sel: { tipo: 'carta', id: c.id }, titulo: c.libro, meta: `${origenesCarta(c).map((x) => L[x].nombre).join(' o ')} → ${destinosCarta(c).map((x) => L[x].nombre).join(', ') || 'destino no indicado'} · ${fechaCorta(c.fecha)}`, puntos: pp });
  }
  for (const v of D.viajes) {
    const pp = puntuar([v.nombre]);
    if (pp) out.push({ grupo: 'Viajes', sel: { tipo: 'viaje', id: v.id }, titulo: v.nombre, meta: `${v.referencia} · ${fechaCorta(v.fecha)}`, puntos: pp });
  }
  for (const e of D.eventos || []) {
    const pp = puntuar([e.titulo]);
    if (pp) out.push({ grupo: 'Sucesos', sel: { tipo: 'evento', id: e.id }, titulo: e.titulo, meta: e.fecha?.texto || '', puntos: pp });
  }
  for (const p of D.periodos || []) {
    const pp = puntuar([p.nombre]);
    if (pp) out.push({ grupo: 'Periodos', sel: { tipo: 'periodo', id: p.id }, titulo: p.nombre, meta: p.fecha?.texto || '', puntos: pp });
  }
  const ordenGrupos = ['Pasajes', 'Personas', 'Lugares', 'Cartas', 'Viajes', 'Sucesos', 'Periodos'];
  out.sort((a, b) => ordenGrupos.indexOf(a.grupo) - ordenGrupos.indexOf(b.grupo) || b.puntos - a.puntos || a.titulo.localeCompare(b.titulo, 'es'));
  // Máximo 6 por grupo
  const cuenta = {};
  return out.filter((r) => (cuenta[r.grupo] = (cuenta[r.grupo] || 0) + 1) <= 6);
}
function pintarResultados() {
  const caja = $('#resultados'), q = $('#q');
  if (!q.value.trim()) { cerrarResultados(); return; }
  if (!resultados.length) {
    caja.innerHTML = '<div class="sin-resultados">Nada con ese nombre en este corte. Prueba con un lugar («Filipos»), una carta («Romanos») o un capítulo («Hch 16»).</div>';
  } else {
    let grupo = '';
    caja.innerHTML = resultados.map((r, i) => {
      const cab = r.grupo !== grupo ? `<div class="be-results__group be-caps" role="presentation">${esc(r.grupo)}</div>` : '';
      grupo = r.grupo;
      const tipoNodo = { persona: 'persona', lugar: 'lugar', carta: 'texto', viaje: 'persona', evento: 'evento', periodo: 'periodo', pasaje: 'evento' }[r.sel.tipo];
      return `${cab}<div class="be-result${i === activo ? ' be-result--active' : ''}" role="option" id="res-${i}" aria-selected="${i === activo}" data-i="${i}">
        <span class="be-node be-node--${tipoNodo} be-node--sm" aria-hidden="true">${esc(r.titulo[0])}</span>
        <span class="res-texto"><span class="be-result__title">${marcar(r.titulo)}</span><span class="be-row__meta">${esc(r.meta || '')}</span></span></div>`;
    }).join('');
  }
  caja.hidden = false;
  q.setAttribute('aria-expanded', 'true');
  q.setAttribute('aria-activedescendant', resultados.length ? `res-${activo}` : '');
  $('#caja-busqueda').classList.add('be-search--focus');
}
function marcar(titulo) {
  const nq = norm($('#q').value).trim();
  const n = norm(titulo);
  const i = nq ? n.indexOf(nq) : -1;
  if (i < 0) return esc(titulo);
  return `${esc(titulo.slice(0, i))}<mark>${esc(titulo.slice(i, i + nq.length))}</mark>${esc(titulo.slice(i + nq.length))}`;
}
function cerrarResultados() {
  const caja = $('#resultados');
  caja.hidden = true;
  $('#q').setAttribute('aria-expanded', 'false');
  $('#caja-busqueda').classList.remove('be-search--focus');
}
function elegir(i) {
  const r = resultados[i];
  if (!r) return;
  $('#q').value = r.titulo;
  cerrarResultados();
  seleccionar(r.sel);
  $('#q').blur();
}
function iniciarBusqueda() {
  const q = $('#q');
  q.addEventListener('input', () => { resultados = buscar(q.value); activo = 0; pintarResultados(); });
  q.addEventListener('focus', () => { if (q.value.trim()) { resultados = buscar(q.value); pintarResultados(); } });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); activo = Math.min(activo + 1, resultados.length - 1); pintarResultados(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activo = Math.max(activo - 1, 0); pintarResultados(); }
    else if (e.key === 'Enter') { e.preventDefault(); elegir(activo); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); limpiarSeleccion(); q.blur(); }
  });
  q.addEventListener('blur', () => setTimeout(cerrarResultados, 150));
  $('#resultados').addEventListener('pointerdown', (e) => {
    const o = e.target.closest('[data-i]');
    if (o) { e.preventDefault(); elegir(+o.dataset.i); }
  });
  $('#filtro').addEventListener('click', limpiarSeleccion);
}

// ---------------------------------------------------------------------------
// Pintado por fotogramas
// ---------------------------------------------------------------------------
function pintar() {
  if (sucio.linea || (pintarLineaFija.claveV !== viajeActual(dondeEsta(E.t))?.id)) { sucio.linea = false; pintarLineaFija(); }
  if (sucio.cursor) { sucio.cursor = false; pintarCursor(); }
  if (sucio.mapa) { sucio.mapa = false; pintarMapa(); }
  if (sucio.panel) { sucio.panel = false; pintarPanel(false); }
  if (sucio.etiquetas && !E.play) { sucio.etiquetas = false; pintarEtiquetas(); }
  else if (sucio.etiquetas && E.play) { pintarEtiquetasDiferido(); }
}
let etiquetasTimer = 0;
function pintarEtiquetasDiferido() {
  if (etiquetasTimer) return;
  etiquetasTimer = setTimeout(() => { etiquetasTimer = 0; sucio.etiquetas = false; pintarEtiquetas(); }, 150);
}

let avisoTimer = 0;
function avisar(texto) {
  const a = $('#aviso');
  a.textContent = texto; a.hidden = false;
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => { a.hidden = true; }, 3500);
}

// ---------------------------------------------------------------------------
// Teclado y eventos generales
// ---------------------------------------------------------------------------
function iniciarEventos() {
  document.addEventListener('click', (e) => {
    const cerrar = e.target.closest('[data-accion="cerrar"]');
    if (cerrar) { limpiarSeleccion(); return; }
    const s = e.target.closest('[data-sel]');
    if (s && !s.closest('#resultados')) {
      const sel = parseSel(s.dataset.sel);
      if (sel) {
        e.preventDefault();
        const enMapa = sel.tipo === 'lugar' && s.closest('.maplibregl-marker');
        seleccionar(sel, enMapa ? { mover: false, encuadrar: false } : {});
      }
    }
  });
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    const enCampo = t.matches?.('input, textarea, select');
    if (e.key === 'Escape') { limpiarSeleccion(); return; }
    if (enCampo) return;
    if (e.key === 'Enter' && t.matches?.('g[data-sel]')) { e.preventDefault(); t.dispatchEvent(new MouseEvent('click', { bubbles: true })); return; }
    if (e.key === '/' ) { e.preventDefault(); $('#q').focus(); return; }
    if (t.closest?.('.maplibregl-map') && !t.closest('.maplibregl-marker')) return;   // el mapa usa sus flechas
    if (e.key === ' ' || e.code === 'Space') {
      if (t.matches?.('button, a, [role="button"]')) return;
      e.preventDefault(); reproducir(!E.play); return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      if (e.shiftKey) saltar(dir);
      else { setT(E.t + dir * span() / 40); asegurarVisible(E.t, false); }
    }
  });
  document.querySelectorAll('[data-mapa]').forEach((b) => b.addEventListener('click', () => ponerMapa(b.dataset.mapa)));
  $('#compartir').addEventListener('click', async () => {
    guardarHash();
    await new Promise((r) => setTimeout(r, 300));
    try { await navigator.clipboard.writeText(location.href); avisar('Enlace copiado: abre esta misma vista.'); }
    catch { avisar('Copia la dirección de la barra del navegador: guarda la fecha, la selección y el mapa.'); }
  });
  $('#inicio').addEventListener('click', (e) => { e.preventDefault(); limpiarSeleccion(); setT(T_INICIAL); E.vista = [...VISTA_INICIAL]; sucio.linea = true; map?.fitBounds([[19.2, 34.0], [37.2, 42.2]], { duration: 600 }); });
  $('#leyenda-boton').addEventListener('click', () => {
    const abierta = $('#leyenda').classList.toggle('abierta');
    $('#leyenda-boton').setAttribute('aria-expanded', String(abierta));
  });
  $('#hoja-asa').addEventListener('click', () => {
    E.hojaPlegada = !E.hojaPlegada;
    $('#panel').classList.toggle('plegada', E.hojaPlegada);
    $('#hoja-asa').setAttribute('aria-expanded', String(!E.hojaPlegada));
  });
  window.addEventListener('hashchange', () => { if (location.hash !== ultimoHash) aplicarHash(false); });
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
async function iniciar() {
  try {
    [D, VIDEOS] = await Promise.all([cargarDatos(), cargarVideos()]);
  } catch (err) {
    $('#panel-cuerpo').innerHTML = `<section class="be-card"><div class="be-card__pad"><h2 class="be-card__title">No se pudieron cargar los datos</h2><p class="be-card__body">${esc(err.message)} Mira site/README.md para abrir el sitio en local.</p></div></section>`;
    return;
  }
  L = D.lugares || {}; PERS = D.personas || {};
  D.eventos = D.eventos || []; D.periodos = D.periodos || [];
  P = prepararParadas();
  iniciarEventos();
  iniciarBusqueda();
  iniciarLinea();
  if (!window.maplibregl) {
    $('#mapa').insertAdjacentHTML('beforeend', '<p class="sin-mapa">No se pudo cargar MapLibre desde unpkg.com. La línea de tiempo y las fichas funcionan sin mapa.</p>');
  } else {
    crearMapa();
    // mostrarPablo espera a que se pinte la ficha: en móvil su alto decide qué parte del mapa queda a la vista.
    map.once('load', () => { crearMarcas(); sucio.mapa = sucio.etiquetas = true; programar(); requestAnimationFrame(() => requestAnimationFrame(mostrarPablo)); });
  }
  iniciarCortina();
  ponerMapa(E.mapa, false);
  if (matchMedia('(max-width: 760px)').matches) E.vista = [E.t - 5, E.t + 7];
  aplicarHash(true);
  window.__be = { E, P, D, dondeEsta, ventanaCarta, ventanaEvento, setT, seleccionar, ponerMapa, get map() { return map; } };
}
iniciar();

})();
