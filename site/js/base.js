/* biblical-earth · base: utilidades, estado, carga, registro de tipos, selección, cursor, reproducción, dirección,
   bucle de pintado, teclado y arranque. Todos los ficheros de site/js/ comparten un solo objeto, window.BE.
   Scripts clásicos con defer, sin módulos ES: así el sitio abre también desde file://.
   Congelado durante el reparto: ver la tabla de dueños en site/README.md. */
'use strict';
(() => {
const BE = window.BE = {};

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
BE.T_MIN = 0; BE.T_MAX = 100;       // rango del cursor; se leen siempre a través de BE
const VISTA_INICIAL = [30, 70];
const T_INICIAL = 50.3;
const ES_FILE = location.protocol === 'file:';
const MESES = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'];

// Libros de este corte: número en wol.jw.org, nombre, abreviatura TNM y formas que aceptamos al buscar.
let LIBRO_POR_FORMA = new Map();
function ponerLibros(lista) {
  BE.LIBROS = lista;
  LIBRO_POR_FORMA = new Map();
  for (const l of lista) for (const f of [...l.formas, norm(l.abr), norm(l.nombre)]) LIBRO_POR_FORMA.set(f.replace(/\s+/g, ''), l);
}
ponerLibros([
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
].map(([num, nombre, abr, formas]) => ({ num, nombre, abr, formas })));

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
// BE.D (datos), BE.L (lugares por id), BE.PERS (personas por id), BE.VIDEOS y BE.P (paradas de Pablo) se ponen al
// arrancar: léelos siempre como BE.D, nunca los copies en una variable al cargar el fichero.
const E = {
  t: T_INICIAL, vista: [...VISTA_INICIAL], sel: null, resaltado: null, mapa: 'antiguo',
  play: false, cortinaX: 0.5, hojaPlegada: false,
};

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------
/** ?datos=_local/<carril>/data.json carga otro data.json para probar. Solo vale una ruta dentro de _local/
    (ignorada en git) que acabe en .json. Cualquier otra cosa es un error, para no enseñar en silencio los datos de siempre. */
function rutaDatos() {
  const r = new URLSearchParams(location.search).get('datos');
  if (r == null) return 'data.json';
  if (/^_local\/[\w./-]+\.json$/.test(r) && !r.split('/').includes('..')) return r;
  throw new Error(`?datos=${r} no vale: solo se aceptan rutas dentro de _local/ que acaben en .json.`);
}
async function cargarDatos() {
  const ruta = rutaDatos();
  if (ES_FILE) {
    const js = ruta.replace(/\.json$/, '.js');
    if (!window.BIBLICAL_EARTH_DATA) await cargarScript(js);
    if (!window.BIBLICAL_EARTH_DATA) throw new Error(`No encuentro ${js} junto a index.html.`);
    return window.BIBLICAL_EARTH_DATA;
  }
  const r = await fetch(ruta, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${ruta} respondió ${r.status}`);
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

// ---------------------------------------------------------------------------
// Registro de tipos
// ---------------------------------------------------------------------------
/** BE.tipo('lugar', { existe, nombre, implicados, momento, momentoImplicado, ficha, buscar, nodo }) registra un tipo.
    BE.tipo('lugar') devuelve su definición. Cada tipo vive en su propio fichero de js/tipos/. */
const TIPOS = new Map();
function tipo(nombre, def) {
  if (def === undefined) return TIPOS.get(nombre);
  if (TIPOS.has(nombre)) throw new Error(`El tipo «${nombre}» ya está registrado.`);
  TIPOS.set(nombre, def);
  return def;
}

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
function existe(tipo, id) { return !!TIPOS.get(tipo)?.existe(id); }
const selTexto = (sel) => (sel ? `${sel.tipo}:${sel.id}` : '');

/** Todo lo que implica una selección: claves de la línea de tiempo y lugares del mapa. */
function implicados(sel) {
  const r = { claves: new Set(), lugares: new Set() };
  TIPOS.get(sel.tipo)?.implicados?.(sel.id, r);
  return r;
}
/** Fecha a la que salta el cursor al elegir algo: la del propio tipo si la tiene; si no, la primera de lo que implica. */
function momentoDe(sel) {
  const def = TIPOS.get(sel.tipo);
  if (def?.momento) return def.momento(sel.id);
  const ts = [];
  for (const k of implicados(sel).claves) {
    const i = k.indexOf(':');
    const d = TIPOS.get(k.slice(0, i));
    if (d?.momentoImplicado) ts.push(d.momentoImplicado(k.slice(i + 1)));
  }
  const validos = ts.filter((x) => x != null);
  return validos.length ? Math.min(...validos) : null;
}
function nombreSel(sel) {
  const def = TIPOS.get(sel.tipo);
  return def ? def.nombre(sel.id) : sel.id;
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
  if (sel && encuadrar) BE.mapa.encuadrar([...E.resaltado.lugares]);   // después de la ficha: en móvil su alto cuenta
  BE.pintarLineaFija();
  sucio.mapa = true; sucio.etiquetas = true;
  programar();
  guardarHash();
}
function limpiarSeleccion() {
  $('#q').value = '';
  BE.cerrarResultados();
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
  E.t = clamp(t, BE.T_MIN, BE.T_MAX);
  sucio.mapa = sucio.cursor = sucio.panel = true;
  programar();
  guardarHash();
}
const span = () => E.vista[1] - E.vista[0];
BE.velocidad = () => span() / 160;   // años por segundo: 1 año cada 4 s a escala de décadas
BE.textoVelocidad = () => {
  const cada4 = span() / 40;
  if (cada4 >= 0.95) { const n = Math.round(cada4); return `${n} ${n === 1 ? 'año' : 'años'} cada 4 s`; }
  const meses = cada4 * 12;
  if (meses >= 0.95) { const n = Math.round(meses); return `${n} ${n === 1 ? 'mes' : 'meses'} cada 4 s`; }
  const dias = Math.max(1, Math.round(meses * 30));
  return `${dias} ${dias === 1 ? 'día' : 'días'} cada 4 s`;
};
function asegurarVisible(t, centrar) {
  const s = span();
  if (centrar || t < E.vista[0] || t > E.vista[1]) {
    let v0 = centrar ? t - s * 0.4 : (t > E.vista[1] ? t - s * 0.3 : t - s * 0.7);
    v0 = clamp(v0, BE.T_MIN, BE.T_MAX - s);
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
  const t = E.t + dt * BE.velocidad();
  if (t >= BE.T_MAX) { setT(BE.T_MAX); reproducir(false); return; }
  setT(t);
  if (t > E.vista[1] - span() * 0.05) asegurarVisible(t, false);
  requestAnimationFrame(paso);
}
/** Momentos a los que saltan «anterior» y «siguiente»: paradas y cartas. */
BE.hitos = () => {
  const ts = BE.P.map((s) => (s.a + s.b) / 2).concat(BE.D.cartas.map(BE.momentoCarta).filter((x) => x != null));
  return [...new Set(ts.map((x) => Math.round(x * 1000) / 1000))].sort((a, b) => a - b);
};
function saltar(dir) {
  const hs = BE.hitos();
  const t = dir > 0 ? hs.find((h) => h > E.t + 1e-3) : [...hs].reverse().find((h) => h < E.t - 1e-3);
  if (t != null) { setT(t); asegurarVisible(t, false); BE.seguirPablo(); }
}

/** Parámetros extra de la dirección: { nombre, escribir() → texto o null, leer(texto o null, inicial) }. */
const parametros = [];
let hashTimer = 0, ultimoHash = '';
function guardarHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    const p = new URLSearchParams();
    p.set('t', E.t.toFixed(2));
    if (E.sel) p.set('sel', selTexto(E.sel));
    p.set('mapa', E.mapa);
    for (const x of parametros) { const v = x.escribir(); if (v != null && v !== '') p.set(x.nombre, v); }
    ultimoHash = '#' + p.toString().replace(/%3A/g, ':').replace(/%2F/g, '/').replace(/%2C/g, ',').replace(/%7E/g, '~');
    if (location.hash !== ultimoHash) history.replaceState(null, '', ultimoHash);
  }, 250);
}
function leerHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  const r = { p };
  const t = parseFloat(p.get('t'));
  if (Number.isFinite(t)) r.t = clamp(t, BE.T_MIN, BE.T_MAX);
  if (p.has('sel')) r.sel = parseSel(p.get('sel'));
  const m = p.get('mapa');
  if (['antiguo', 'actual', 'cortina'].includes(m)) r.mapa = m;
  return r;
}
function aplicarHash(inicial) {
  const h = leerHash();
  const tAntes = E.t;
  if (h.t != null) E.t = h.t;
  if (h.mapa) BE.ponerMapa(h.mapa, false);
  for (const x of parametros) x.leer(h.p.get(x.nombre), inicial);
  const s = h.sel ?? null;
  const otraSel = inicial || selTexto(s) !== selTexto(E.sel);
  if (otraSel) seleccionar(s, { mover: h.t == null, encuadrar: true });
  else if (E.t !== tAntes) BE.seguirPablo();   // al arrancar lo hace mostrarPablo; con otra selección, su encuadre
  asegurarVisible(E.t, inicial && h.t != null);
  sucio.mapa = sucio.cursor = sucio.panel = sucio.linea = true;
  programar();
}

// ---------------------------------------------------------------------------
// Ficha: sin selección la pinta ahora.js; con selección, el tipo registrado
// ---------------------------------------------------------------------------
let clavePanel = '';
function pintarPanel(forzar) {
  const clave = E.sel ? selTexto(E.sel) : BE.claveAhora();
  if (!forzar && clave === clavePanel) return;
  clavePanel = clave;
  const html = E.sel ? TIPOS.get(E.sel.tipo).ficha(E.sel.id) : BE.fichaAhora();
  const cuerpo = $('#panel-cuerpo');
  cuerpo.innerHTML = html;
  if (forzar) cuerpo.scrollTop = 0;
}

// ---------------------------------------------------------------------------
// Pintado por fotogramas
// ---------------------------------------------------------------------------
/** BE.pintores: funciones que el bucle llama en cada fotograma, después de las propias, con una copia de las marcas
    de lo que cambió ({ mapa, etiquetas, panel, linea, cursor }). Cada vista comprueba si le toca repintar. */
const pintores = [];
function pintar() {
  const cambios = { ...sucio };
  if (sucio.linea || (BE.pintarLineaFija.claveV !== BE.viajeActual(BE.dondeEsta(E.t))?.id)) { sucio.linea = false; BE.pintarLineaFija(); }
  if (sucio.cursor) { sucio.cursor = false; BE.pintarCursor(); }
  if (sucio.mapa) { sucio.mapa = false; BE.pintarMapa(); }
  if (sucio.panel) { sucio.panel = false; pintarPanel(false); }
  if (sucio.etiquetas && !E.play) { sucio.etiquetas = false; BE.pintarEtiquetas(); }
  else if (sucio.etiquetas && E.play) { pintarEtiquetasDiferido(); }
  for (const f of pintores) f(cambios);
}
let etiquetasTimer = 0;
function pintarEtiquetasDiferido() {
  if (etiquetasTimer) return;
  etiquetasTimer = setTimeout(() => { etiquetasTimer = 0; sucio.etiquetas = false; BE.pintarEtiquetas(); }, 150);
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
        if (E.sel && E.sel.tipo === sel.tipo && E.sel.id === sel.id) { seleccionar(null, { mover: false, encuadrar: false }); return; }   // segundo clic: se deselecciona
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
  document.querySelectorAll('[data-mapa]').forEach((b) => b.addEventListener('click', () => BE.ponerMapa(b.dataset.mapa)));
  $('#compartir').addEventListener('click', async () => {
    guardarHash();
    await new Promise((r) => setTimeout(r, 300));
    try { await navigator.clipboard.writeText(location.href); avisar('Enlace copiado: abre esta misma vista.'); }
    catch { avisar('Copia la dirección de la barra del navegador: guarda la fecha, la selección y el mapa.'); }
  });
  $('#inicio').addEventListener('click', (e) => { e.preventDefault(); limpiarSeleccion(); setT(T_INICIAL); E.vista = [...VISTA_INICIAL]; sucio.linea = true; BE.mapa.volverAlInicio(); });
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
/** BE.inicios: funciones que se llaman una vez, con los datos ya cargados, antes de leer la dirección. */
const inicios = [];
async function iniciar() {
  try {
    [BE.D, BE.VIDEOS] = await Promise.all([cargarDatos(), cargarVideos()]);
  } catch (err) {
    $('#panel-cuerpo').innerHTML = `<section class="be-card"><div class="be-card__pad"><h2 class="be-card__title">No se pudieron cargar los datos</h2><p class="be-card__body">${esc(err.message)} Mira site/README.md para abrir el sitio en local.</p></div></section>`;
    return;
  }
  const D = BE.D;
  BE.L = D.lugares || {}; BE.PERS = D.personas || {};
  D.eventos = D.eventos || []; D.periodos = D.periodos || [];
  BE.P = BE.prepararParadas();
  iniciarEventos();
  BE.iniciarBusqueda();
  BE.iniciarLinea();
  BE.mapa.iniciar();
  for (const f of inicios) f();
  if (matchMedia('(max-width: 760px)').matches) E.vista = [E.t - 5, E.t + 7];
  aplicarHash(true);
  window.__be = {
    E, P: BE.P, D, BE, dondeEsta: BE.dondeEsta, donde: BE.donde, ventana: BE.ventana, ventanaCarta: BE.ventanaCarta, ventanaEvento: BE.ventanaEvento,
    setT, seleccionar, ponerMapa: BE.ponerMapa, get map() { return BE.mapa.gl; },
  };
}

Object.assign(BE, {
  // utilidades
  MESES, ES_FILE, T_INICIAL, VISTA_INICIAL, EXTERNO, ponerLibros, norm, esc, $, clamp, fmtAnio, fmtCursor, fmtDia, tramo, fechaCorta,
  libro, citas, urlCapitulo, mercY, latDeY, interpolar,
  // estado, registro y selección
  E, tipo, tipos: TIPOS, existe, parseSel, selTexto, implicados, momentoDe, nombreSel, seleccionar, limpiarSeleccion,
  // cursor, reproducción, dirección y pintado
  sucio, programar, setT, span, asegurarVisible, reproducir, saltar, guardarHash, aplicarHash, parametros,
  pintarPanel, pintores, inicios, avisar,
});
// Con defer, DOMContentLoaded llega cuando ya se han ejecutado todos los scripts de site/js/: todos los tipos están registrados.
document.addEventListener('DOMContentLoaded', iniciar);
})();
