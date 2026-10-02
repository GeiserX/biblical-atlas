/* biblical-atlas · base: utilidades, estado, carga, registro de tipos, selección, cursor, reproducción, dirección,
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
/** "Hch 15:1-3; Gál 2:1-10" → [{ libro, cap, capFin, verso, versoFin, texto }]. verso es el primero (null si la cita
    es de capítulos enteros) y versoFin el último, que es del capítulo capFin: «Hch 21:40–22:21» da verso 40, versoFin 21.
    Una lista en el mismo capítulo llega hasta su último versículo: «Mt 26:30, 36-56» da verso 30, versoFin 56.
    Un libro de un solo capítulo se cita por versículo: «Flm 23» es el capítulo 1, versículo 23. Un trozo sin libro es
    del libro del trozo anterior, como escribe la TNM: «1Sa 4:10, 11; 5:1–7:2» da también 1Sa 5:1–7:2. */
function citas(s) {
  const out = [];
  let previo = null;
  for (const parte of String(s || '').split(/\s*;\s*/)) {
    let m = parte.match(/^\s*([123]?\s?[A-Za-zÁÉÍÓÚáéíóúÑñ]+)\.?\s+(\d+)(?::(\d+))?(?:\s*[-–]\s*(\d+)(?::(\d+))?)?/);
    let lib = m && libro(m[1]), texto = parte.trim();
    if (!m && previo) {
      m = parte.match(/^\s*()(\d+)(?::(\d+))?(?:\s*[-–]\s*(\d+)(?::(\d+))?)?/);
      if (m) { lib = previo; texto = `${lib.abr} ${texto}`; }
    }
    if (!m || !lib) continue;
    previo = lib;
    let cap = +m[2];
    let capFin = cap;
    if (m[5]) capFin = +m[4]; else if (!m[3] && m[4]) capFin = +m[4];
    let verso = m[3] ? +m[3] : null;
    let versoFin = !verso ? null : m[5] ? +m[5] : m[4] ? +m[4] : verso;
    if (!m[3] && lib.capitulos === 1) { verso = cap; versoFin = capFin; cap = 1; capFin = 1; }
    const lista = verso && capFin === cap && parte.slice(m[0].length).match(/^(?:\s*,\s*\d+(?:\s*[-–]\s*\d+)?)+/);
    if (lista) versoFin = Math.max(versoFin, ...lista[0].match(/\d+/g).map(Number));
    out.push({ libro: lib, cap, capFin, verso, versoFin, texto });
  }
  return out;
}
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
    if (!window.BIBLICAL_ATLAS_DATA) await cargarScript(js);
    if (!window.BIBLICAL_ATLAS_DATA) throw new Error(`No encuentro ${js} junto a index.html.`);
    return window.BIBLICAL_ATLAS_DATA;
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
  // Elegir algo desde fuera de la línea (la búsqueda, una ficha, el grafo, un recorrido) lleva el cursor a su momento,
  // pero la escala no cambia y la vista solo se mueve si ese momento queda fuera. Una marca de la línea no pasa por
  // aquí con `mover`: linea.js pone el cursor donde se pulsó.
  if (sel && mover) {
    const t = momentoDe(sel);
    if (t != null) { setT(t); asegurarVisible(t, false); }
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
  const dt = clamp((ahora - ultimoFrame) / 1000, 0, 0.1);
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
let hashTimer = 0, ultimoHash = '', spanHash = null;
/** La dirección de la vista de ahora, sin el «#». t con cuatro decimales (una diezmilésima de año, menos de una hora:
    a escala de días vuelve al mismo día) y v, lo que abarca la línea, en años con cuatro cifras significativas. */
function textoHash() {
  const p = new URLSearchParams();
  p.set('t', E.t.toFixed(4));
  p.set('v', String(+span().toPrecision(4)));
  if (E.sel) p.set('sel', selTexto(E.sel));
  p.set('mapa', E.mapa);
  for (const x of parametros) { const v = x.escribir(); if (v != null && v !== '') p.set(x.nombre, v); }
  return p.toString().replace(/%3A/g, ':').replace(/%2F/g, '/').replace(/%2C/g, ',').replace(/%7E/g, '~');
}
function guardarHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(escribirHash, 250);
}
/** Escribe ya la dirección que guardarHash dejó para dentro de 250 ms. BE.historia la escribe al crear una entrada y
    antes de Atrás y Adelante: así cada entrada se queda con su vista aunque la siguiente llegue antes de tiempo. */
function escribirHash() {
  clearTimeout(hashTimer);
  spanHash = span();
  ultimoHash = '#' + textoHash();
  // Cada entrada lleva su número y el nombre de su vista (BE.historia, buscar.js): se escriben con la dirección y
  // nunca se pierden, porque de ellos salen atrás y adelante.
  const estado = BE.historia?.sello();
  if (location.hash !== ultimoHash || estado) history.replaceState(estado || history.state, '', ultimoHash);
}
function leerHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  const r = { p };
  const t = parseFloat(p.get('t'));
  if (Number.isFinite(t)) r.t = clamp(t, BE.T_MIN, BE.T_MAX);
  // Sin v (los enlaces de antes) la vista conserva lo que abarcaba.
  const v = parseFloat(p.get('v'));
  if (Number.isFinite(v) && v > 0) r.v = clamp(v, BE.SPAN_MIN ?? 0.03, BE.T_MAX - BE.T_MIN);
  if (p.has('sel')) r.sel = parseSel(p.get('sel'));
  const m = p.get('mapa');
  if (['antiguo', 'actual', 'cortina'].includes(m)) r.mapa = m;
  return r;
}
function aplicarHash(inicial) {
  const h = leerHash();
  const tAntes = E.t;
  // Una entrada a la que se vuelve con Atrás o Adelante guarda el encuadre en que se dejó el mapa (BE.historia): se
  // pone ese, no el de la selección. Se lee antes de nada: lo que mueva el mapa en esta vuelta lo reescribiría. Al
  // arrancar lo pone encuadreDeInicio.
  const encuadreGuardado = inicial ? null : BE.historia?.marco();
  if (h.t != null) E.t = h.t;
  if (h.mapa) BE.ponerMapa(h.mapa, false);
  for (const x of parametros) x.leer(h.p.get(x.nombre), inicial);
  const s = h.sel ?? null;
  const otraSel = inicial || selTexto(s) !== selTexto(E.sel);
  // Al arrancar, la selección la encuadra encuadreDeInicio, con el mapa ya a su tamaño: si no, un enlace compartido la
  // dejaba en el borde de abajo del mapa en vez de donde la pone un clic en la línea.
  if (otraSel) seleccionar(s, { mover: h.t == null, encuadrar: !inicial && !encuadreGuardado });
  else if (E.t !== tAntes && !encuadreGuardado) BE.seguirPablo();   // al arrancar lo hace mostrarPablo; con otra selección, su encuadre
  if (encuadreGuardado) BE.mapa.ponerMarco(encuadreGuardado);
  if (h.v != null) {
    const v0 = clamp(E.t - h.v * 0.4, BE.T_MIN, BE.T_MAX - h.v);
    E.vista = [v0, v0 + h.v];
    spanHash = h.v;
  } else asegurarVisible(E.t, inicial && h.t != null);
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
  // Un zoom sin mover el cursor también cambia la dirección: v guarda lo que abarca la línea.
  if (sucio.linea && (spanHash == null || Math.abs(span() - spanHash) > spanHash * 1e-4)) { spanHash = span(); guardarHash(); }
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
function avisar(texto, ms = 3500) {
  const a = $('#aviso');
  a.textContent = texto; a.hidden = false;
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => { a.hidden = true; }, ms);
}

// ---------------------------------------------------------------------------
// Teclado y eventos generales
// ---------------------------------------------------------------------------
function iniciarEventos() {
  document.addEventListener('click', (e) => {
    const cerrar = e.target.closest('[data-accion="cerrar"]');
    if (cerrar) { limpiarSeleccion(); return; }
    const s = e.target.closest('[data-sel]');
    // Las marcas de la línea de tiempo las elige linea.js: el cursor entra por donde se pulsó y un segundo clic suelta.
    // Se reconocen por su clase y su data-id, no por estar dentro de la línea: soltar una persona quita su carril, y la
    // marca pulsada ya no está en la página cuando el clic llega aquí.
    if (s && !s.closest('#resultados') && !s.matches('.m[data-id]')) {
      const sel = parseSel(s.dataset.sel);
      if (sel) {
        e.preventDefault();
        if (E.sel && E.sel.tipo === sel.tipo && E.sel.id === sel.id) { seleccionar(null, { mover: false, encuadrar: false }); return; }   // segundo clic: se deselecciona
        // Un lugar pulsado en el mapa no mueve el cursor ni el mapa, salvo que nada suyo caiga en la vista de la línea
        // (Edén pulsado en 1473 a.e.c.): entonces el cursor va a su primer hecho.
        const enMapa = sel.tipo === 'lugar' && s.closest('.maplibregl-marker');
        seleccionar(sel, enMapa ? { mover: !!BE.lugarFueraDeVista?.(sel.id), encuadrar: false } : {});
      }
    }
  });
  document.addEventListener('keydown', (e) => {
    if (BE.portada?.abierta) return;   // con la portada puesta, el sitio de detrás no recibe teclas
    const t = e.target;
    const enCampo = t.matches?.('input, textarea, select');
    if (e.key === 'Escape') { limpiarSeleccion(); return; }
    if (enCampo) return;
    if (e.key === '/' ) { e.preventDefault(); $('#q').focus(); return; }
    if (t.closest?.('.maplibregl-map') && !t.closest('.maplibregl-marker')) return;   // el mapa usa sus flechas
    if (e.key === ' ' || e.code === 'Space') {
      if (t.matches?.('button, a, [role="button"]')) return;
      e.preventDefault(); reproducir(!E.play); return;
    }
    // Con Alt, ⌘ o Ctrl las flechas son del navegador (Alt + ← y ⌘ + ←, atrás): no mueven el cursor.
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !e.altKey && !e.metaKey && !e.ctrlKey) {
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
// Marcos: la ficha y la línea de tiempo cambian de tamaño; el modo reunión tiene su botón
// ---------------------------------------------------------------------------
/** Cada tamaño es una variable de CSS en #app que se guarda en la sesión y se recorta a lo que cabe en la ventana.
    La línea ampliada y la sincronía (clases de #app, de linea.js y ahora.js) y la presentación ponen su propio tamaño:
    al activarlas manda el suyo; si después se arrastra, manda el arrastre; al quitarlas vuelve el guardado.
    En el móvil no hay ficha al lado: el asa de la hoja cambia su alto. */
const estrechaMarco = () => matchMedia('(max-width: 760px)').matches;
const altoLinea = () => $('#linea').offsetHeight || 250;
const MARCOS = {
  panel: { var: '--panel-w', sep: '#sep-panel', medir: () => $('#panel').offsetWidth, min: () => 300,
    // El mapa conserva al menos 480 px de ancho en escritorio (360 en la tableta), para que se lea lo que flota encima.
    max: () => Math.max(300, Math.min(760, innerWidth - (innerWidth > 900 ? 480 : 360))), texto: (v) => `Ficha de ${v} píxeles de ancho`,
    propio: () => document.documentElement.classList.contains('be-presentando') },
  linea: { var: '--timeline-h', sep: '#sep-linea', medir: altoLinea, min: () => 132,
    max: () => Math.max(132, innerHeight - (estrechaMarco() ? 56 + 150 : 60 + 280)), texto: (v) => `Línea de tiempo de ${v} píxeles de alto`,
    propio: () => /\b(linea-grande|con-sincronia)\b/.test($('#app').className) },
  hoja: { var: '--hoja-h', medir: () => $('#panel').offsetHeight, min: () => 96,
    max: () => Math.max(96, innerHeight - 56 - altoLinea() - 40), propio: () => false },
};
const CLAVE_MARCO = 'biblical-atlas:marco:';
// Con la línea y la ficha muy grandes, el mapa se queda sin sitio para la tarjeta del suceso y la leyenda a la vez: ni
// una encima de la otra (unos 400 px de alto) ni una al lado de la otra (unos 720 de ancho). Entonces la tarjeta se quita
// (mapa.css, .mapa-bajo): lo que cuenta ya está en la línea y en la ficha, y la leyenda hace falta para leer el mapa.
// El mapa de situación (arriba a la izquierda) se quita solo si la leyenda, que crece con un viaje, llega hasta él.
const vigilarTapas = () => {
  const m = $('#mapa').getBoundingClientRect(), ley = $('#leyenda').getBoundingClientRect(), sit = $('#situacion');
  $('#app').classList.toggle('mapa-bajo', m.height < 400 && m.width < 720);
  if (!sit) return;   // mapa.js lo crea al arrancar; la leyenda cambia de alto después y vuelve a mirar
  const cs = getComputedStyle(sit);
  $('#app').classList.toggle('situacion-tapada', ley.height > 0 && ley.top < m.top + parseFloat(cs.top) + parseFloat(cs.height) + 8);
};
const tapasObs = new ResizeObserver(vigilarTapas);
tapasObs.observe($('#mapa')); tapasObs.observe($('#leyenda'));
// arranque: al cargar la página, un tamaño arrastrado en esta sesión gana a la clase (la línea abre alta en la pantalla
// ancha, y recargar no debe tirar lo que se arrastró). Después, poner o quitar la clase vuelve a mandar, como siempre.
const marco = Object.fromEntries(Object.keys(MARCOS).map((k) => [k, { propio: false, manda: 'nuestro', arranque: true }]));
function leerMarco(k) { try { const v = parseFloat(sessionStorage.getItem(CLAVE_MARCO + k)); return Number.isFinite(v) ? v : null; } catch { return null; } }
function guardarMarco(k, v) { try { if (v == null) sessionStorage.removeItem(CLAVE_MARCO + k); else sessionStorage.setItem(CLAVE_MARCO + k, String(Math.round(v))); } catch { /* sin almacenamiento */ } }
/** Pone en #app el tamaño guardado, salvo que mande el de una clase, y actualiza el separador. */
function aplicarMarco(k) {
  const m = MARCOS[k], app = $('#app'), st = marco[k];
  const propio = m.propio();
  if (propio !== st.propio) { st.propio = propio; st.manda = propio && !(st.arranque && leerMarco(k) != null) ? 'clase' : 'nuestro'; }
  const v = leerMarco(k);
  if (v == null || st.manda === 'clase') app.style.removeProperty(m.var);
  else app.style.setProperty(m.var, `${Math.round(clamp(v, m.min(), m.max()))}px`);
  const sep = m.sep && $(m.sep);
  if (sep) {
    const ahora = Math.round(m.medir());
    sep.setAttribute('aria-valuemin', String(Math.round(m.min())));
    sep.setAttribute('aria-valuemax', String(Math.round(m.max())));
    sep.setAttribute('aria-valuenow', String(ahora));
    sep.setAttribute('aria-valuetext', m.texto(ahora));
  }
}
/** Tamaño elegido a mano (arrastre o teclado); null vuelve al de siempre. */
function ponerMarco(k, v) {
  const m = MARCOS[k];
  guardarMarco(k, v == null ? null : clamp(v, m.min(), m.max()));
  marco[k].manda = 'nuestro';
  aplicarMarco(k);
  sucio.linea = sucio.etiquetas = true; programar();
}
/** Arrastre con ratón, lápiz o dedo. Un arrastre de verdad no cuenta además como clic (el asa de la hoja pliega con un clic). */
function arrastrarMarco(asa, k) {
  const m = MARCOS[k];
  let inicio = null;
  asa.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    inicio = { x: e.clientX, y: e.clientY, v: m.medir(), movido: false };
    try { asa.setPointerCapture(e.pointerId); } catch { /* puntero sintético */ }
  });
  asa.addEventListener('pointermove', (e) => {
    if (!inicio) return;
    const dx = e.clientX - inicio.x, dy = e.clientY - inicio.y;
    if (!inicio.movido && Math.hypot(dx, dy) < 4) return;
    if (!inicio.movido) { inicio.movido = true; asa.classList.add('arrastrando'); document.documentElement.classList.add('marco-arrastrando'); }
    e.preventDefault();
    ponerMarco(k, inicio.v - (k === 'panel' ? dx : dy));   // hacia la izquierda, ficha más ancha; hacia arriba, más alto
  });
  const soltar = () => {
    if (!inicio) return;
    if (inicio.movido) { asa.dataset.arrastrado = '1'; setTimeout(() => { delete asa.dataset.arrastrado; }, 0); }
    inicio = null;
    asa.classList.remove('arrastrando'); document.documentElement.classList.remove('marco-arrastrando');
  };
  asa.addEventListener('pointerup', soltar);
  asa.addEventListener('pointercancel', soltar);
  asa.addEventListener('click', (e) => { if (asa.dataset.arrastrado) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
}
/** Flechas: 20 px (80 con Mayúsculas); Inicio y Fin, el mínimo y el máximo; Intro, el de siempre (en un botón, Intro
    lo pulsa). */
function teclaMarco(e, k, conIntro) {
  if (e.altKey || e.metaKey || e.ctrlKey) return;   // Alt + ← y ⌘ + ←: atrás del navegador
  const m = MARCOS[k];
  const flechas = k === 'panel' ? { ArrowLeft: 1, ArrowRight: -1 } : { ArrowUp: 1, ArrowDown: -1 };
  let v;
  if (e.key in flechas) v = m.medir() + flechas[e.key] * (e.shiftKey ? 80 : 20);
  else if (e.key === 'Home') v = m.min();
  else if (e.key === 'End') v = m.max();
  else if (e.key === 'Enter' && conIntro) v = null;
  else return;
  e.preventDefault(); e.stopPropagation();
  ponerMarco(k, v);
}
function iniciarMarcos() {
  for (const k of ['panel', 'linea']) {
    const m = MARCOS[k], sep = $(m.sep);
    arrastrarMarco(sep, k);
    sep.addEventListener('dblclick', () => { ponerMarco(k, null); avisar(k === 'panel' ? 'La ficha vuelve a su ancho de siempre.' : 'La línea de tiempo vuelve a su alto de siempre.', 2000); });
    sep.addEventListener('keydown', (e) => teclaMarco(e, k, true));
  }
  arrastrarMarco($('#hoja-asa'), 'hoja');
  // Con el dedo, la raya de 10 px entre el mapa y la línea no es una diana: en su lugar, un botón de 44 px en la barra
  // de la línea (css/tactil.css) que se arrastra igual y que, pulsado, amplía la línea o la devuelve (be-f1w).
  const alto = $('#linea-alto');
  if (alto) {
    arrastrarMarco(alto, 'linea');
    alto.addEventListener('click', () => BE.alternarGrande?.());
    alto.addEventListener('keydown', (e) => teclaMarco(e, 'linea', false));
  }
  const recalcular = () => { for (const k of Object.keys(MARCOS)) aplicarMarco(k); };
  recalcular();
  new MutationObserver(recalcular).observe($('#app'), { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(recalcular).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', recalcular);
  iniciarReunion();
}
/** Una preferencia de lectura (be-reunion, be-letra-grande): la clase en <html> y su clave en este navegador. Es la única
    que las escribe: la luna de la barra, el menú «Estudio» y la portada pasan por aquí. Sin datos todavía (la portada
    puede cambiarlas antes), no hay nada que repintar. */
function ponerPreferencia(nombre, on) {
  document.documentElement.classList.toggle(`be-${nombre}`, on);
  try { localStorage.setItem(`biblical-atlas:pref:${nombre}`, on ? '1' : '0'); } catch { /* sin almacenamiento */ }
  if (BE.D) { sucio.etiquetas = sucio.panel = sucio.linea = sucio.mapa = true; programar(); }
}
/** Modo reunión (D-02): solo el botón de la barra lo pone y lo quita (be-68c.2). recorridos.js lee la preferencia al arrancar. */
function iniciarReunion() {
  const b = $('#reunion-boton'), raiz = document.documentElement;
  const pintarBoton = () => {
    const on = raiz.classList.contains('be-reunion');
    b.setAttribute('aria-pressed', String(on));
    b.title = on ? 'Salir del modo reunión: vuelve el fondo claro' : 'Modo reunión: fondo oscuro, brillo bajo y sin animaciones';
  };
  b.addEventListener('click', () => {
    const on = !raiz.classList.contains('be-reunion');
    ponerPreferencia('reunion', on);
    avisar(on ? 'Modo reunión: fondo oscuro y sin animaciones.' : 'Fondo claro de nuevo.', 2000);
  });
  new MutationObserver(pintarBoton).observe(raiz, { attributes: true, attributeFilter: ['class'] });
  pintarBoton();
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
/** BE.inicios: funciones que se llaman una vez, con los datos ya cargados, antes de leer la dirección. */
const inicios = [];
async function iniciar() {
  iniciarMarcos();
  try {
    [BE.D, BE.VIDEOS] = await Promise.all([cargarDatos(), cargarVideos()]);
  } catch (err) {
    $('#panel-cuerpo').innerHTML = `<section class="be-card"><div class="be-card__pad"><h2 class="be-card__title">No se pudieron cargar los datos</h2><p class="be-card__body">${esc(err.message)} Mira site/README.md para abrir el sitio en local.</p></div></section>`;
    // La portada, si está puesta, lo dice en su sitio y ofrece volver a intentarlo (portada.js).
    BE.fallo = err;
    BE.alFallar?.(err);
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
  BE.historia?.llegar();   // una recarga o la vuelta desde otra página: la marca pulsada de esta entrada
  BE.mapa.encuadreDeInicio?.();
  setTimeout(() => { for (const st of Object.values(marco)) st.arranque = false; }, 0);
  window.__be = {
    E, P: BE.P, D, BE, dondeEsta: BE.dondeEsta, donde: BE.donde, ventana: BE.ventana, ventanaCarta: BE.ventanaCarta, ventanaEvento: BE.ventanaEvento,
    setT, seleccionar, ponerMapa: BE.ponerMapa, get map() { return BE.mapa.gl; },
  };
}

// ---------------------------------------------------------------------------
// Viajes: quién los hace y quién acompaña
// ---------------------------------------------------------------------------
// Quién hace cada viaje. Un viaje sin `persona` es de Pablo, como dice el esquema de los datos. Un viaje
// de grupo (`persona: null` y `grupo`, como el Arca por Filistea) es su propio dueño, `grupo:<id del viaje>`: sus
// paradas se calculan como las de una persona, pero no tiene ficha, marcador ni carril. Viven aquí, y no en
// trayectorias.js, porque el mapa y las fichas las usan y base.js se carga antes que todos.
const duenoViaje = (v) => v.persona || (v.grupo ? `grupo:${v.id}` : 'pablo');
const esGrupo = (dueno) => String(dueno).startsWith('grupo:');
/** Nombre de quien hace el viaje: la persona, el texto del grupo («el Arca del pacto») o Pablo. Con `mayuscula`, el
    del grupo empieza en mayúscula, para un rótulo. */
function nombreDueno(v, mayuscula = false) {
  if (v.persona) return BE.PERS[v.persona]?.nombre || v.persona;
  if (v.grupo) return mayuscula ? v.grupo[0].toUpperCase() + v.grupo.slice(1) : v.grupo;
  return 'Pablo';
}
/** Nombre de un dueño de viajes (una persona o `grupo:<id>`), para la leyenda del mapa. */
function nombreDeDueno(dueno) {
  if (!esGrupo(dueno)) return BE.PERS[dueno]?.nombre || dueno;
  const v = (BE.D.viajes || []).find((x) => x.id === dueno.slice(6));
  return v ? nombreDueno(v, true) : dueno;
}
/** Acompañantes de un viaje: los ids de `companeros`. Quien tiene tramos en `tramos_companeros` ({ persona, desde,
    hasta }) va solo de la parada desde a la parada hasta; los demás, en todo el viaje. Con `orden`, solo los que van
    en esa parada. Ids sin repetir, en el orden de los datos. */
function acompanantes(v, orden = null) {
  const tramos = v?.tramos_companeros || [];
  return [...new Set(v?.companeros || [])].filter((id) => {
    if (orden == null) return true;
    const ts = tramos.filter((c) => c.persona === id);
    return !ts.length || ts.some((c) => enTramo(v, c, orden));
  });
}
/** Destinos en paralelo (`branches_from`, README de la investigación, «Viajes»): Map(orden → orden de la parada de la
    que se llega a ella, o null en la primera). Una parada con `branches_from` sale de la que nombra; las demás siguen a
    la anterior que no lo lleva. Sin la clave, cada parada sigue a la anterior, como siempre. */
const conRamas = (v) => (v?.paradas || []).some((p) => p.branches_from != null);
function anterioresParada(v) {
  const out = new Map();
  let tronco = null;
  for (const p of [...(v?.paradas || [])].sort((a, b) => a.orden - b.orden)) {
    if (p.branches_from == null) { out.set(p.orden, tronco); tronco = p.orden; } else out.set(p.orden, p.branches_from);
  }
  return out;
}
/** ¿Va en la parada `orden` quien tiene el tramo {desde, hasta}? Sin destinos en paralelo, las paradas de desde a hasta;
    con ellos, las de la ruta de desde a hasta, que sigue una sola rama (validate.py, validar_viaje). */
function enTramo(v, c, orden) {
  if (!conRamas(v)) return c.desde <= orden && orden <= c.hasta;
  const ant = anterioresParada(v), vistas = new Set();
  for (let x = c.hasta; x != null && !vistas.has(x); x = ant.get(x)) {
    vistas.add(x);
    if (x === c.desde) return vistas.has(orden);
  }
  return false;
}
/** Los destinos en paralelo de un viaje, agrupados por la parada de la que salen: [{ desde, destinos }], con las paradas
    de los datos en su orden. Vacío en un viaje sin `branches_from`. */
function destinosParalelos(v) {
  const por = new Map();
  for (const p of [...(v?.paradas || [])].sort((a, b) => a.orden - b.orden)) {
    if (p.branches_from == null) continue;
    if (!por.has(p.branches_from)) por.set(p.branches_from, []);
    por.get(p.branches_from).push(p);
  }
  return [...por].map(([o, destinos]) => ({ desde: (v.paradas || []).find((p) => p.orden === o), destinos }));
}
/** «Desde Samaria se llega a la vez a Halá, Habor, Gozán y Media», una frase por cada parada de la que salen destinos en
    paralelo. Lo dicen la ficha del viaje y la de cada uno de esos destinos. */
function frasesParalelos(v) {
  const nombre = (p) => BE.L?.[p?.lugar]?.nombre || p?.lugar || '';
  const lista = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}` : xs[0] || '');
  return destinosParalelos(v).map(({ desde, destinos }) => ({ desde, destinos,
    texto: `Desde ${nombre(desde)} se llega a la vez a ${lista(destinos.map(nombre))}: el grupo se reparte y el texto no da orden entre esos destinos.` }));
}

Object.assign(BE, {
  // utilidades
  MESES, ES_FILE, T_INICIAL, VISTA_INICIAL, EXTERNO, ponerLibros, norm, esc, $, clamp, fmtAnio, fmtCursor, fmtDia, tramo, fechaCorta,
  libro, citas, mercY, latDeY, interpolar, duenoViaje, esGrupo, nombreDueno, nombreDeDueno, acompanantes,
  conRamas, anterioresParada, destinosParalelos, frasesParalelos,
  // estado, registro y selección
  E, tipo, tipos: TIPOS, existe, parseSel, selTexto, implicados, momentoDe, nombreSel, seleccionar, limpiarSeleccion,
  // cursor, reproducción, dirección y pintado
  sucio, programar, setT, span, asegurarVisible, reproducir, saltar, guardarHash, escribirHash, textoHash, aplicarHash, parametros,
  pintarPanel, pintores, inicios, avisar, ponerPreferencia,
});
// Con defer, DOMContentLoaded llega cuando ya se han ejecutado todos los scripts de site/js/: todos los tipos están registrados.
document.addEventListener('DOMContentLoaded', iniciar);
})();
