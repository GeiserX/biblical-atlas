/* biblical-earth · portada «Una imagen a pantalla completa» (prototipo).
   La primera pantalla es una imagen de nuestro relieve (Egipto a Mesopotamia) con el nombre, el lema, la búsqueda,
   «Entrar al mapa» y la línea de seis fechas. Debajo, la página: quien vuelve, una pregunta, las épocas como recortes del
   relieve, los recorridos, un dato con su fuente y el pie.
   El sitio de verdad vive en un marco detrás de la imagen. Cuando está listo, se pone en el mismo encuadre que la imagen
   y la sustituye con un fundido. Entrar le quita la portada de encima y le da el teclado y el puntero; Atrás, o el logo
   del sitio, la vuelven a poner. Con el sitio en otro origen (la dirección pública) no se puede tocar su mapa: entrar
   abre el sitio en la dirección que corresponde, si responde.
   Dónde está el sitio, el aviso si no carga y la letra grande vienen de ../assets/sitio.js. */
'use strict';
(() => {
const D = window.FB_DATA;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const raiz = document.documentElement;
const params = new URLSearchParams(location.search);
// Dónde está el sitio: site/ al lado (la raíz del repositorio servida), el publicado si no, y ?site= manda (sitio.js).
const P = window.PORTADA_SITIO;
const BASE = new URL(P.base);
const MISMO_ORIGEN = P.mismoOrigen;
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches || raiz.classList.contains('be-reunion');
const estrecha = () => matchMedia('(max-width: 760px)').matches;
const fmtAnio = (y) => (y > 0 ? `${y} e.c.` : `${1 - y} a.e.c.`);
const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const latDe = (y) => (Math.atan(Math.exp(y)) * 360) / Math.PI - 90;
const T0 = -4025, T1 = 100;   // de la creación de Adán (4026 a.e.c.) a 100 e.c., como el banner
const DEFECTO = 't=50.3000&v=40&mapa=antiguo';
const OCULTO = `${DEFECTO}&ocultas=viajes,cartas,inciertos,hallazgos,pendientes`;
const anunciar = (t) => { const a = $('#fb-anuncio'); a.textContent = ''; setTimeout(() => { a.textContent = t; }, 30); };

// ---------------------------------------------------------------------------------------------------------------
// Lo que el navegador guarda: la última vista, los recorridos a medias y los capítulos leídos (las mismas claves del sitio)
// ---------------------------------------------------------------------------------------------------------------
const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
function historial() {
  let ultima = null, leidos = [];
  try { ultima = JSON.parse(leer('biblical-earth:ultima') || 'null'); } catch { /* nada */ }
  try { leidos = JSON.parse(leer('biblical-earth:leidos') || '[]'); } catch { /* nada */ }
  let recs = D.recorridos.map((r) => ({ r, paso: Math.max(0, +(leer(`biblical-earth:recorrido:${r.id}`) || 0)) })).filter((x) => x.paso > 0);
  let simulado = false;
  if (!ultima?.hash && !recs.length && !leidos.length && params.get('estado') === 'vuelve') {
    simulado = true;
    ultima = { hash: '#t=50.8000&v=15&sel=carta:1-tesalonicenses&mapa=antiguo', texto: '1 Tesalonicenses · 50 e.c.' };
    recs = [{ r: D.recorridos.find((r) => r.id === 'pedro') || D.recorridos[0], paso: 5 }];
    leidos = Array.from({ length: 12 }, (_, i) => `44-${i + 1}`);
  }
  // La lectura: el libro con más capítulos leídos y el primero que falta.
  const porLibro = {};
  for (const k of leidos) { const [n, c] = String(k).split('-').map(Number); if (D.libros[n]) (porLibro[n] ||= new Set()).add(c); }
  const [num, caps] = Object.entries(porLibro).sort((a, b) => b[1].size - a[1].size)[0] || [];
  let lectura = null;
  if (num) {
    const l = D.libros[num];
    let sig = 1; while (caps.has(sig) && sig < l.capitulos) sig++;
    lectura = { libro: l, leidos: caps.size, sig };
  }
  const tUltima = ultima?.hash ? parseFloat(new URLSearchParams(ultima.hash.slice(1)).get('t')) : NaN;
  return { ultima: ultima?.hash ? ultima : null, recs, lectura, simulado, tUltima };
}
const H = historial();

// ---------------------------------------------------------------------------------------------------------------
// La imagen: Egipto a Mesopotamia; la de los viajes de Pablo como comparación, o cuando la última vista es de esa época
// (A7, con las dos únicas imágenes que tenemos).
// ---------------------------------------------------------------------------------------------------------------
const IMG = {
  'bible-lands': { ...D.imagenes['bible-lands'], s1: '../assets/img/bible-lands-wide-1280.webp', s2: '../assets/img/bible-lands-wide.webp' },
  'paul-journeys': { ...D.imagenes['paul-journeys'], s1: '../assets/img/paul-journeys-wide-1280.webp', s2: '../assets/img/paul-journeys-wide.webp' },
};
const heroe = $('#fb-heroe');
let clave = 'bible-lands', porA7 = false;
if (params.get('imagen') === 'pablo') clave = 'paul-journeys';
else if (Number.isFinite(H.tUltima) && H.tUltima >= -2) { clave = 'paul-journeys'; porA7 = true; }
if (clave !== 'bible-lands') {
  const img = $('#fb-img'), c = IMG[clave];
  img.src = c.s1; img.srcset = `${c.s1} 1280w, ${c.s2} 2560w`;
  heroe.dataset.img = clave;
}
$('#fb-proto-nota').textContent = porA7
  ? 'A7: la imagen es la de la época de tu última vista (Pablo). Solo existen dos capturas; las demás épocas necesitan la suya.'
  : (clave === 'paul-journeys' ? 'Comparación: la imagen de los viajes de Pablo, que coincide con el encuadre del mapa de hoy.' : '');

/** De un punto de la pantalla (relativo al marco del mapa) a [lon, lat], con la imagen tal como está puesta. */
function geo(px, py, marcoRect) {
  const c = IMG[clave], r = $('#fb-lienzo').getBoundingClientRect();
  const cx = r.left - marcoRect.left + r.width / 2, cy = r.top - marcoRect.top + r.height / 2;
  const radPorPx = (c.span * Math.PI / 180) / r.width;
  return [c.c[0] + (px - cx) * c.span / r.width, latDe(merc(c.c[1]) - (py - cy) * radPorPx)];
}
/** Lo que se ve del relieve en la primera pantalla: al entrar, el mapa abre en ese mismo encuadre. */
function encuadreVisible() {
  const m = $('#fb-marco').getBoundingClientRect();
  const w = m.width, h = estrecha() ? m.height : m.height - 130;
  const x0 = estrecha() ? 0 : Math.min(w * 0.6, $('.fb-heroe__palabras').getBoundingClientRect().right - m.left + 24);
  const a = geo(x0, 0, m), b = geo(w, h, m);
  return [[a[0], b[1]], [b[0], a[1]]];
}

// ---------------------------------------------------------------------------------------------------------------
// El sitio en su marco
// ---------------------------------------------------------------------------------------------------------------
let modo = 'puntero';
addEventListener('keydown', (e) => { if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ') modo = 'teclado'; }, true);
addEventListener('pointerdown', () => { modo = 'puntero'; }, true);
const M = { marco: null, win: null, BE: null, listo: false, dentro: false, pendiente: null, padding: null, maxBounds: null, origen: null };
const OCULTA_CSS = `body > *:not(#app), #app > *:not(#mapa), #mapa > *:not(#mapa-gl) { display: none !important; }
  #mapa-gl { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; }
  #mapa-gl > *:not(.maplibregl-canvas-container), .maplibregl-marker, .maplibregl-popup { display: none !important; }`;

function crearMarco() {
  if (M.marco || !MISMO_ORIGEN) return;
  const cont = $('#fb-marco');
  cont.hidden = false;
  const f = document.createElement('iframe');
  f.title = 'biblical-earth: el mapa y la línea de tiempo';
  f.tabIndex = -1; f.inert = true; f.setAttribute('aria-hidden', 'true');
  f.src = new URL(`index.html#${OCULTO}`, BASE).href;
  P.vigilar(f);   // si lo que carga no es el sitio (o le falta el mapa), entrar lo dice en vez de enseñar un marco muerto
  cont.append(f);
  M.marco = f;
  const inicio = performance.now();
  const sondeo = setInterval(() => {
    let w;
    try { w = f.contentWindow; if (!w?.BE?.D || !w.BE.mapa?.gl) return; } catch { clearInterval(sondeo); return; }
    clearInterval(sondeo);
    preparar(w, inicio);
  }, 200);
}
function ponerOculta(on) {
  const doc = M.win.document;
  let s = doc.getElementById('fb-oculta');
  if (on && !s) { s = doc.createElement('style'); s.id = 'fb-oculta'; s.textContent = OCULTA_CSS; doc.head.append(s); }
  if (!on && s) s.remove();
  M.BE.mapa.gl.resize();
}
function preparar(w, inicio) {
  M.win = w; M.BE = w.BE;
  const map = w.BE.mapa.gl;
  // Mientras se entra y durante el primer paseo, lo que el sitio apile en su historial se convierte en sustitución: un
  // solo Atrás vuelve a la portada.
  const Hp = w.History.prototype, push = Hp.pushState;
  Hp.pushState = function (...a) { return M.silencio || paso >= 0 ? this.replaceState(...a) : push.apply(this, a); };
  // El logo del sitio y «Estudio → Portada» traen esta portada, no la de hoy.
  w.document.addEventListener('click', (e) => {
    if (e.target.closest?.('#inicio')) { e.preventDefault(); e.stopImmediatePropagation(); volverAPortada(); }
  }, true);
  if (w.BE.portada) w.BE.portada.abrir = () => volverAPortada();
  sincronizarReunion();
  refrescar(w.BE.D);
  const seguir = () => {
    M.padding = map.getPadding(); M.maxBounds = map.getMaxBounds();
    if (M.dentro) { M.listo = true; M.pendiente?.(); M.pendiente = null; return; }
    ponerOculta(true);
    map.setMaxBounds(null);
    igualar();
    // Mientras la portada está puesta, el mapa no se mueve: si el sitio termina su encuadre de arranque (o cualquier
    // otro) después, se vuelve a poner debajo de la imagen.
    map.on('moveend', () => { if (!M.dentro && !M.igualando) igualar(); });
    map.once('idle', () => {
      M.listo = true;
      window.FB_TIEMPOS = { ...(window.FB_TIEMPOS || {}), mapaVivo: Math.round(performance.now() - inicio) };
      if (M.pendiente) { M.pendiente(); M.pendiente = null; return; }
      // K1: el mapa vivo queda listo y en el mismo encuadre, debajo de la imagen. No la sustituye por defecto: a esta
      // escala el relieve vivo cruza el borde entre dos de sus capas (mundo y Mediterráneo) y se ve un rectángulo que la
      // captura, hecha a más aumento, no tiene. ?fundir=1 enseña el fundido para compararlo.
      if (!M.dentro && params.has('fundir')) raiz.classList.add('fb-vivo');
    });
  };
  if (map.loaded()) seguir(); else map.once('load', seguir);
}
/** Pone el mapa vivo exactamente debajo de la imagen: el mismo centro y la misma escala. */
function igualar() {
  if (!M.BE || M.dentro) return;
  const map = M.BE.mapa.gl, c = IMG[clave];
  const m = $('#fb-marco').getBoundingClientRect(), r = $('#fb-lienzo').getBoundingClientRect();
  M.igualando = true;
  map.stop();
  map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
  map.jumpTo({ center: c.c, zoom: Math.log2((r.width * 360) / (c.span * 512)), bearing: 0, pitch: 0 });
  const dx = r.left - m.left + r.width / 2 - m.width / 2, dy = r.top - m.top + r.height / 2 - m.height / 2;
  map.panBy([-dx, -dy], { animate: false });
  M.igualando = false;
}
/** La ayuda de la caja, entera si cabe; si no, su forma corta (como BE.ajustarAyuda en el sitio). */
function ajustarAyuda() {
  ajustarAyuda.f ||= P.ajustarAyuda(q, ['Busca una persona, un lugar, un capítulo o un año', 'Persona, lugar, capítulo o año', 'Persona, lugar o año', 'Buscar']);
  ajustarAyuda.f();
}
let resizeT = 0;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (M.listo && !M.dentro) { M.BE.mapa.gl.resize(); igualar(); } pintarFechas(); ajustarAyuda(); }, 120); });

/** Entrar: la acción es { hash, encuadre, luego }. hash es la dirección del sitio (base.js); encuadre, la caja del mapa
    (undefined: lo que se veía en la imagen; null: la que elija el sitio para la selección); luego, lo que hace falta
    y la dirección no guarda (la línea en el tramo de una época, el mapa en el recorte de su tarjeta, una búsqueda). */
let entrando = false;
async function entrar(accion, origen) {
  if (!MISMO_ORIGEN) { P.ir(new URL(`index.html#${accion.hash}`, BASE).href); return; }
  if (M.dentro || entrando) return;
  const encuadre = accion.encuadre === undefined ? encuadreVisible() : accion.encuadre;
  M.origen = origen || document.activeElement;
  crearMarco();
  if (!M.listo) {
    // Antes de tiempo: «Abriendo el mapa…» sobre la portada, que sigue puesta; si el sitio no llega, lo dice.
    entrando = true;
    const ok = await P.esperar(() => M.listo);
    for (let i = 0; ok && !M.listo && i < 600; i++) await new Promise((r) => setTimeout(r, 100));
    entrando = false;
    if (!ok || !M.listo) { if (ok) P.avisar(); return; }
  }
  M.dentro = true;
  if (history.state?.fb !== 'mapa') history.pushState({ fb: 'mapa' }, '', '#mapa');
  mostrarMarco();
  const aplicar = () => {
    const w = M.win, BE = M.BE, map = BE.mapa.gl;
    ponerOculta(false);
    if (M.padding) map.setPadding(M.padding);
    if (M.maxBounds) map.setMaxBounds(M.maxBounds);
    map.resize();
    // La dirección nueva entra como si se hubiera navegado: así el sitio no apila una entrada de historial de más.
    M.silencio = true;
    w.history.replaceState(null, '', `#${accion.hash}`);
    w.dispatchEvent(new w.PopStateEvent('popstate'));
    if (encuadre) map.fitBounds(encuadre, { padding: relleno(), duration: 0 });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      M.marco.focus();   // antes de «luego»: si «luego» pone el foco en la búsqueda del sitio, que no se lo quite
      accion.luego?.(BE, map);
      if (accion.encuadrarSel) encuadrarSeleccion(BE, map);
      setTimeout(() => { M.silencio = false; }, 600);
      // El foco pasa al sitio: con el teclado, al título de la ficha (así se oye qué se abrió y el teléfono no saca el
      // teclado); con el ratón o el dedo, al documento, sin anillo de foco sobre un título que nadie tabuló.
      const t = w.document.querySelector('#panel-cuerpo h1, #panel-cuerpo h2, #panel-cuerpo h3');
      if (t && !accion.sinFoco && modo === 'teclado') { t.tabIndex = -1; t.focus({ preventScroll: true }); }
    }));
  };
  if (M.listo) aplicar(); else M.pendiente = aplicar;
}
/** Encuadra lo elegido donde ocurre: sus lugares con coordenada (sin los extremos cuando son muchos), como hace el
    sitio al elegir en su búsqueda. Sin esto, una fecha, una pregunta o un resultado abrían en el encuadre de siempre. */
function encuadrarSeleccion(BE, map) {
  let ids = [];
  try { ids = [...BE.implicados(BE.E.sel).lugares]; } catch { return; }
  // Un lugar sin punto seguro (el Gólgota) se encuadra en sus candidatos, que es donde el mapa dibuja su zona incierta.
  const pts = [...new Set(ids)].map((id) => BE.D.lugares[id]).filter(Boolean).flatMap((l) => (l.lat != null && l.lon != null && l.precision !== 'incierto'
    ? [[l.lon, l.lat]] : (l.candidatos || []).map((c) => c.geometria).filter((g) => g?.tipo === 'punto' && g.lat != null).map((g) => [g.lon, g.lat])));
  if (!pts.length) return;
  if (pts.length === 1) { map.jumpTo({ center: pts[0], zoom: 6.5 }); return; }
  const q = (xs, f) => xs[Math.min(xs.length - 1, Math.max(0, Math.round(f * (xs.length - 1))))];
  const lons = pts.map((p) => p[0]).sort((a, b) => a - b), lats = pts.map((p) => p[1]).sort((a, b) => a - b), f = pts.length > 8 ? 0.1 : 0;
  map.fitBounds([[q(lons, f), q(lats, f)], [q(lons, 1 - f), q(lats, 1 - f)]], { padding: relleno(), maxZoom: 7, duration: 0 });
}
/** El relleno para encuadrar dentro de lo que se ve del mapa: en el teléfono, la hoja de la ficha tapa su parte baja. */
function relleno() {
  const w = M.win, mapa = w.document.getElementById('mapa-gl') || w.document.getElementById('mapa'), hoja = w.document.getElementById('panel');
  const r = mapa?.getBoundingClientRect(), h = hoja?.getBoundingClientRect();
  const tapa = r && h && estrecha() && h.top < r.bottom && h.top > r.top ? r.bottom - h.top : 0;
  return { top: 12, left: 12, right: 12, bottom: 12 + Math.max(0, tapa) };
}
function mostrarMarco() {
  const c = $('#fb-marco'), f = M.marco;
  f.inert = false; f.removeAttribute('aria-hidden'); f.tabIndex = 0;
  c.classList.add('fb-marco--entero');
  const fin = () => { raiz.classList.add('fb-dentro'); $('#fb-portada').inert = true; $('.fb-proto').inert = true; };
  if (reducido()) { c.style.opacity = '1'; fin(); return; }
  c.style.transition = 'none'; c.style.opacity = '0';
  requestAnimationFrame(() => { c.style.transition = 'opacity .26s ease'; c.style.opacity = '1'; });
  setTimeout(fin, 280);
}
/** Volver a la portada: el mapa se queda como estaba, debajo de la imagen. */
function volverAPortada({ desdeHistoria = false } = {}) {
  if (!M.dentro) return;
  M.dentro = false;
  cerrarPaseo();
  const c = $('#fb-marco');
  c.classList.remove('fb-marco--entero'); c.style.opacity = ''; c.style.transition = '';
  raiz.classList.remove('fb-dentro', 'fb-vivo');   // la imagen otra vez: el mapa ya tiene su selección y sus rutas
  $('#fb-portada').inert = false; $('.fb-proto').inert = false;
  M.marco.inert = true; M.marco.setAttribute('aria-hidden', 'true'); M.marco.tabIndex = -1;
  if (M.listo) { ponerOculta(true); igualar(); }
  if (!desdeHistoria) history.pushState({ fb: 'portada' }, '', location.pathname + location.search);
  pintarBoton();   // lo escrito se queda en la caja
  Object.assign(H, historial());
  pintarVuelves();
  const o = M.origen && document.contains(M.origen) && !M.origen.closest('[hidden]') ? M.origen : $('#fb-nombre');
  if (o === $('#fb-nombre')) o.tabIndex = -1;
  sinSugerir = true;   // volver a la caja no abre la lista por sí solo
  o.focus({ preventScroll: false });
  sinSugerir = false;
  anunciar('Portada de biblical-earth');
}
window.addEventListener('popstate', (e) => {
  if (e.state?.fb === 'mapa' && !M.dentro && M.marco) { M.dentro = true; mostrarMarco(); if (M.listo) { ponerOculta(false); M.BE.mapa.gl.setPadding(M.padding || {}); M.BE.mapa.gl.resize(); } }
  else if (e.state?.fb !== 'mapa' && M.dentro) volverAPortada({ desdeHistoria: true });
});

// ---------------------------------------------------------------------------------------------------------------
// Las acciones
// ---------------------------------------------------------------------------------------------------------------
// «Entrar al mapa» abre en lo que se veía y en una fecha que ocurre ahí: con Egipto a Mesopotamia, 537 a.e.c. (la vuelta
// de Babilonia a Jerusalén cruza la imagen entera); con los viajes de Pablo, la vista de siempre del sitio (50 e.c.).
const ENTRADA = { 'bible-lands': 't=-535.5000&v=120&mapa=antiguo', 'paul-journeys': DEFECTO };
const A = {
  mapa: () => ({ hash: ENTRADA[clave] }),
  fecha: (f) => ({ hash: `sel=${f.sel}&v=${Math.round((f.b - f.a) * 1.16)}&mapa=antiguo`, encuadre: null, encuadrarSel: true }),
  epoca: (e) => ({ hash: `sel=periodo:${e.id}&t=${(e.a + 0.01).toFixed(4)}&v=${Math.round((e.b - e.a) * 1.16)}&mapa=antiguo`, encuadre: null,
    luego: (BE, map) => { BE.verTramo?.(e.a, e.b); map.fitBounds(e.caja, { padding: relleno(), duration: 0 }); } }),
  completa: () => ({ hash: ENTRADA[clave], luego: (BE) => { BE.E.vista = [BE.T_MIN, BE.T_MAX]; BE.sucio.linea = true; BE.programar(); } }),
  pregunta: (q) => ({ hash: `sel=${q.sel}&t=${q.t.toFixed(4)}&mapa=antiguo${q.extra ? `&${q.extra}` : ''}`, encuadre: null, encuadrarSel: true, luego: (BE) => BE.asegurarVisible?.(BE.E.t, true) }),
  recorrido: (r, desdeInicio) => {
    if (desdeInicio) { try { localStorage.setItem(`biblical-earth:recorrido:${r.id}`, '0'); } catch { /* sin almacenamiento */ } }
    return { hash: `sel=recorrido:${r.id}&mapa=antiguo`, encuadre: null };
  },
  seguir: (u) => ({ hash: u.hash.replace(/^#/, ''), encuadre: null }),
  lectura: (l) => ({ hash: `leer=${l.libro.slug}-${l.sig}&mapa=antiguo`, encuadre: null }),
  dato: () => ({ hash: `sel=${D.dato.sel}&v=190&mapa=antiguo`, encuadre: null }),
  buscar: (texto) => ({ hash: ENTRADA[clave], encuadre: undefined, sinFoco: true, luego: (BE) => BE.buscarTexto(texto) }),
  resultado: (r) => (r.sel && !r.accion
    ? { hash: `sel=${r.sel.tipo}:${r.sel.id}&v=120&mapa=antiguo`, encuadre: null, encuadrarSel: true }
    : { hash: ENTRADA[clave], luego: () => r.accion?.() }),
};

// ---------------------------------------------------------------------------------------------------------------
// La búsqueda: combobox con ejemplos al enfocarla vacía y resultados del sitio mientras se escribe
// ---------------------------------------------------------------------------------------------------------------
const q = $('#fb-q'), lista = $('#fb-lista');
let ops = [], activo = -1;
const EJEMPLOS = [['Pedro', 'una persona'], ['Hch 16', 'un capítulo'], ['607 a.e.c.', 'un año']];
const TIPO = { persona: 'Persona', lugar: 'Lugar', evento: 'Suceso', periodo: 'Época', carta: 'Carta', libro: 'Libro', recorrido: 'Recorrido', pasaje: 'Capítulo', hallazgo: 'Hallazgo', viaje: 'Viaje' };
function pintarLista(grupo, items) {
  ops = items; activo = items.length ? 0 : -1;
  lista.innerHTML = `<div class="fb-lista__grupo fb-caps" role="presentation">${esc(grupo)}</div>${items.map((o, i) => `<div class="fb-op" role="option" id="fb-op-${i}" aria-selected="${i === activo}" data-i="${i}"><span class="fb-op__tit">${o.html || esc(o.tit)}</span>${o.meta ? `<span class="fb-op__meta">${esc(o.meta)}</span>` : ''}</div>`).join('')}`;
  lista.hidden = false;
  q.setAttribute('aria-expanded', 'true');
  q.setAttribute('aria-activedescendant', activo >= 0 ? `fb-op-${activo}` : '');
}
function cerrarLista() { lista.hidden = true; q.setAttribute('aria-expanded', 'false'); q.removeAttribute('aria-activedescendant'); ops = []; activo = -1; }
function marcar(t, texto) {
  const n = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const i = n(t).indexOf(n(texto));
  return i < 0 ? esc(t) : `${esc(t.slice(0, i))}<mark>${esc(t.slice(i, i + texto.length))}</mark>${esc(t.slice(i + texto.length))}`;
}
function sugerir() {
  const texto = q.value.trim();
  if (!texto) {
    pintarLista('Prueba con', EJEMPLOS.map(([t, m]) => ({ tit: t, meta: m, hacer: () => ejemplo(t) })));
    return;
  }
  if (!M.listo) {
    pintarLista('Buscar', [{ tit: `Buscar «${texto}» en el mapa`, hacer: () => entrar(A.buscar(texto)) }]);
    return;
  }
  const rs = (M.BE.buscar(texto) || []).slice(0, 5);
  if (!rs.length) { pintarLista('Sin resultados', [{ tit: `No encontramos «${texto}». Ver sugerencias en el mapa`, hacer: () => entrar(A.buscar(texto)) }]); return; }
  const items = rs.map((r) => ({ tit: r.titulo, html: marcar(r.titulo, texto), meta: [r.sel && TIPO[r.sel.tipo], r.fechaTexto].filter(Boolean).join(' · ') || r.grupo, hacer: () => entrar(A.resultado(r), q) }));
  items.push({ tit: 'Ver todos los resultados en el mapa', meta: '', hacer: () => entrar(A.buscar(texto)) });
  pintarLista('Resultados', items);
}
function ejemplo(t, origen = q) {
  q.value = t; pintarBoton();
  if (M.listo) { const r = (M.BE.buscar(t) || [])[0]; if (r) { cerrarLista(); entrar(A.resultado(r), origen); return; } }
  cerrarLista(); entrar(A.buscar(t), origen);
}
function mover(d) {
  if (!ops.length) return;
  activo = (activo + d + ops.length) % ops.length;
  lista.querySelectorAll('.fb-op').forEach((el, i) => el.setAttribute('aria-selected', String(i === activo)));
  q.setAttribute('aria-activedescendant', `fb-op-${activo}`);
  $(`#fb-op-${activo}`)?.scrollIntoView({ block: 'nearest' });
}
let sinSugerir = false;
q.addEventListener('focus', () => { if (!sinSugerir && !q.value.trim()) sugerir(); });
q.addEventListener('input', () => { sugerir(); pintarBoton(); });
/** El botón dice lo que hará: sin texto entra al mapa; con texto, busca. */
function pintarBoton() { $('#fb-entrar').textContent = q.value.trim() ? 'Buscar' : 'Entrar al mapa'; }
document.querySelector('.fb-ejemplos').addEventListener('click', (e) => { const b = e.target.closest('[data-ejemplo]'); if (b) ejemplo(b.dataset.ejemplo, b); });
q.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); if (lista.hidden) sugerir(); else mover(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); mover(-1); }
  // Intro con la lista abierta elige la opción activa, sin la segunda lista de hoy. (El envío del formulario no sirve
  // para distinguirlo: al pulsar Intro en la caja, el navegador pone como «submitter» el botón «Entrar al mapa».)
  else if (e.key === 'Enter' && !lista.hidden && ops[activo] && q.value.trim()) { e.preventDefault(); const op = ops[activo]; cerrarLista(); op.hacer(); }
  else if (e.key === 'Escape') { if (!lista.hidden) { e.preventDefault(); cerrarLista(); } else if (q.value) { e.preventDefault(); q.value = ''; pintarBoton(); } }
});
q.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== q) cerrarLista(); }, 150));
lista.addEventListener('pointerdown', (e) => { const o = e.target.closest('[data-i]'); if (o) { e.preventDefault(); const op = ops[+o.dataset.i]; cerrarLista(); op.hacer(); } });
$('#fb-accion').addEventListener('submit', (e) => {
  e.preventDefault();
  const texto = q.value.trim();
  // El botón, o Intro sin lista: con texto, entra y busca (la lista del sitio); sin texto, entra al mapa.
  cerrarLista();
  entrar(texto ? A.buscar(texto) : A.mapa(), $('#fb-entrar'));
});

// ---------------------------------------------------------------------------------------------------------------
// La línea de seis fechas (C1)
// ---------------------------------------------------------------------------------------------------------------
const PIE = 'Seis fechas a escala real. Toca una para entrar en ese momento.';
const fx = (y) => (y - T0) / (T1 - T0);
function pintarFechas() {
  const cont = $('#fb-fechas-linea');
  const menores = D.epocas.map((e) => e.a).filter((a) => !D.fechas.some((f) => Math.abs(f.anio - a) < 2));
  if (!cont.dataset.pintada) {
    cont.innerHTML = `<div class="fb-fechas__eje" aria-hidden="true"></div>
      ${menores.map((a) => `<span class="fb-tic" style="left:${(fx(a) * 100).toFixed(3)}%" aria-hidden="true"></span>`).join('')}
      ${D.fechas.map((f, i) => `<span class="fb-tic fb-tic--mayor" data-tic="${i}" style="left:${(fx(f.anio) * 100).toFixed(3)}%" aria-hidden="true"></span>`).join('')}
      ${D.fechas.map((f, i) => `<button type="button" class="fb-fecha" data-fecha="${i}" aria-label="${esc(`${f.etiqueta}: ${f.suceso}. Entrar al mapa en esa fecha`)}"><span>${esc(f.etiqueta)}</span></button>`).join('')}`;
    cont.dataset.pintada = '1';
  }
  // Cada fecha va centrada en su marca. Donde dos no caben (33 y 100 e.c., y en el teléfono también 607), una sube
  // sobre la línea y, si hace falta, se aparta de su marca; la marca de pino se queda en su año.
  const W = cont.clientWidth, gap = 8;
  const bs = [...cont.querySelectorAll('.fb-fecha')];
  const filas = { abajo: Infinity, arriba: Infinity };
  for (let i = bs.length - 1; i >= 0; i--) {
    const b = bs[i], f = D.fechas[i], x = fx(f.anio) * W, w = b.offsetWidth;
    b.classList.remove('fb-fecha--arriba');
    let izq = i === 0 ? x - 8 : (i === bs.length - 1 ? x - w + 8 : x - w / 2);
    let fila = 'abajo';
    if (izq + w > filas.abajo - gap) fila = izq + w <= filas.arriba - gap ? 'arriba' : (filas.arriba > filas.abajo ? 'arriba' : 'abajo');
    izq = Math.max(-8, Math.min(izq, filas[fila] - gap - w, W + 8 - w));   // nunca fuera de la línea
    filas[fila] = izq;
    b.style.left = `${izq}px`;
    if (fila === 'arriba') b.classList.add('fb-fecha--arriba');
  }
}
$('#fb-fechas-linea').addEventListener('click', (e) => { const b = e.target.closest('[data-fecha]'); if (b) entrar(A.fecha(D.fechas[+b.dataset.fecha]), b); });
const pie = $('#fb-fechas-pie');
const decir = (b) => {
  const i = +b.dataset.fecha, f = D.fechas[i];
  document.querySelectorAll('.fb-tic--activa').forEach((t) => t.classList.remove('fb-tic--activa'));
  $(`[data-tic="${i}"]`)?.classList.add('fb-tic--activa');
  pie.innerHTML = `<b>${esc(f.etiqueta)}</b> · ${esc(f.suceso)} · entrar al mapa en esa fecha`; };
$('#fb-fechas-linea').addEventListener('pointerover', (e) => { const b = e.target.closest('[data-fecha]'); if (b) decir(b); });
$('#fb-fechas-linea').addEventListener('focusin', (e) => { const b = e.target.closest('[data-fecha]'); if (b) decir(b); });
const callar = () => { if (!$('#fb-fechas-linea').contains(document.activeElement)) { pie.textContent = PIE; document.querySelectorAll('.fb-tic--activa').forEach((t) => t.classList.remove('fb-tic--activa')); } };
$('#fb-fechas-linea').addEventListener('pointerleave', callar);
$('#fb-fechas-linea').addEventListener('focusout', () => setTimeout(callar, 0));

// ---------------------------------------------------------------------------------------------------------------
// La página de abajo
// ---------------------------------------------------------------------------------------------------------------
function pintarVuelves() {
  const items = [];
  if (H.ultima) items.push({ que: 'Seguir donde lo dejé', tit: H.ultima.texto || 'Tu última vista', meta: 'Lo último que elegiste en el mapa', hacer: () => A.seguir(H.ultima) });
  const rec = H.recs.sort((a, b) => b.paso / b.r.paradas - a.paso / a.r.paradas)[0];
  if (rec) items.push({ que: 'Recorrido a medias', tit: rec.r.titulo, meta: `Vas por la parada ${Math.min(rec.paso + 1, rec.r.paradas)} de ${rec.r.paradas}`, hacer: () => A.recorrido(rec.r, false) });
  if (H.lectura) items.push({ que: 'Tu lectura', tit: `${H.lectura.libro.nombre}: ${H.lectura.leidos} de ${H.lectura.libro.capitulos} capítulos leídos`, meta: `Seguir en el capítulo ${H.lectura.sig}`, hacer: () => A.lectura(H.lectura) });
  const z = $('#fb-vuelves');
  z.hidden = !items.length;
  pintarVuelves.items = items;
  $('#fb-vuelves-lista').innerHTML = items.map((x, i) => `<li><button type="button" class="fb-seguir" data-vuelve="${i}"><span class="fb-seguir__que">${esc(x.que)}</span><span class="fb-seguir__tit">${esc(x.tit)}</span><span class="fb-seguir__meta">${esc(x.meta)}</span><span class="fb-seguir__ir" aria-hidden="true">Seguir →</span></button></li>`).join('');
}
$('#fb-vuelves-lista').addEventListener('click', (e) => { const b = e.target.closest('[data-vuelve]'); if (b) entrar(pintarVuelves.items[+b.dataset.vuelve].hacer(), b); });
$('#fb-olvidar').addEventListener('click', () => {
  try {
    localStorage.removeItem('biblical-earth:ultima');
    for (const r of D.recorridos) localStorage.removeItem(`biblical-earth:recorrido:${r.id}`);
  } catch { /* sin almacenamiento */ }
  H.ultima = null; H.recs = []; H.lectura = null;
  pintarVuelves();
  $('#fb-pregunta-tit').tabIndex = -1; $('#fb-pregunta-tit').focus();
  anunciar('Lista olvidada. Los capítulos leídos se quedan en la lectura.');
});

function pintarPregunta() {
  const [p, ...otras] = D.preguntas;
  $('#fb-pregunta').innerHTML = `<button type="button" class="fb-preg" data-pregunta="0"><span class="fb-preg__texto">${esc(p.texto)}</span><span class="fb-pildora">${esc(p.pista)}</span><span class="fb-preg__ir" aria-hidden="true">Verlo en el mapa →</span></button>
    <details class="fb-mas"><summary>Dos preguntas más</summary><ul>${otras.map((x, i) => `<li><button type="button" data-pregunta="${i + 1}"><span>${esc(x.texto)}</span><span>${esc(x.pista)}</span></button></li>`).join('')}</ul></details>`;
}
$('#fb-pregunta').addEventListener('click', (e) => { const b = e.target.closest('[data-pregunta]'); if (b) entrar(A.pregunta(D.preguntas[+b.dataset.pregunta]), b); });

function pintarEpocas() {
  $('#fb-epocas').innerHTML = D.epocas.map((e, i) => {
    const img = D.imagenes[e.img];
    const [size, px, py] = e.fondo;
    // Los tres lugares de la línea llevan su número en el recorte, para saber qué punto es cada uno.
    const numerados = e.puntos.slice(0, 3).map((p) => p.nombre);
    const lugares = e.lugares.map((l) => { const k = numerados.indexOf(l); return k < 0 ? esc(l) : `<span class="fb-epoca__k" aria-hidden="true">${k + 1}</span>${esc(l)}`; }).join(', ');
    const zonas = e.zonas?.length ? `${e.zonas.join(' y ')}: zonas sin punto en el mapa` : '';
    return `<li><button type="button" class="fb-epoca${e.sinLibro ? ' fb-epoca--sin-libro' : ''}" data-epoca="${i}">
      <span class="fb-recorte" aria-hidden="true" data-fondo="${esc(img.src)}" style="background-size:${size}% auto;background-position:${px}% ${py}%">${e.puntos.map((p, k) => k < 3 && e.lugares.includes(p.nombre) ? `<span class="fb-punto fb-punto--n" style="left:${p.x}%;top:${p.y}%">${k + 1}</span>` : `<span class="fb-punto" style="left:${p.x}%;top:${p.y}%"></span>`).join('')}</span>
      <span class="fb-epoca__texto"><span class="fb-epoca__n">${e.n}</span><span class="fb-epoca__nombre">${esc(e.nombre)}</span><span class="fb-epoca__fecha">${esc(e.texto)}</span><span class="fb-epoca__lugares">${[lugares, esc(zonas), e.sinLibro ? 'Sin libro bíblico' : ''].filter(Boolean).join(' · ')}</span></span>
    </button></li>`;
  }).join('');
}
// Los recortes piden su imagen cuando la zona se acerca a la pantalla: no compiten con la de la primera pantalla.
const verRecortes = new IntersectionObserver((es) => {
  for (const e of es) if (e.isIntersecting) { e.target.style.backgroundImage = `url('${e.target.dataset.fondo}')`; verRecortes.unobserve(e.target); }
}, { rootMargin: '600px 0px' });
const observarRecortes = () => document.querySelectorAll('.fb-recorte[data-fondo]').forEach((r) => { if (!r.style.backgroundImage) verRecortes.observe(r); });
$('#fb-epocas').addEventListener('click', (e) => { const b = e.target.closest('[data-epoca]'); if (b) entrar(A.epoca(D.epocas[+b.dataset.epoca]), b); });
$('#fb-linea-completa').addEventListener('click', (e) => entrar(A.completa(), e.currentTarget));

function pintarRecorridos() {
  $('#fb-recorridos').innerHTML = D.recorridos.map((r, i) => {
    const paso = H.recs.find((x) => x.r.id === r.id)?.paso || 0;
    const vas = paso > 0 ? Math.min(paso + 1, r.paradas) : 0;
    return `<li class="fb-rec">
      <p class="fb-caps">${r.paradas} paradas · ${esc(r.fechas)}</p>
      <h3 class="fb-rec__tit">${esc(r.titulo)}</h3>
      <p class="fb-rec__texto">${esc(r.resumen || r.empieza)}</p>
      ${vas ? `<div class="fb-avance" aria-hidden="true"><span style="width:${(vas / r.paradas) * 100}%"></span></div>` : ''}
      <div class="fb-rec__pie">
        <button type="button" class="fb-rec__ir" data-recorrido="${i}" aria-label="${esc(`${vas ? 'Seguir' : 'Empezar'} el recorrido «${r.titulo}»${vas ? `, parada ${vas} de ${r.paradas}` : ''}`)}">${vas ? `Seguir en la parada ${vas} de ${r.paradas} →` : 'Empezar →'}</button>
        ${vas ? `<button type="button" class="fb-enlace fb-rec__desde" data-recorrido="${i}" data-desde="1">Desde el principio</button>` : ''}
      </div></li>`;
  }).join('');
}
$('#fb-recorridos').addEventListener('click', (e) => { const b = e.target.closest('[data-recorrido]'); if (b) entrar(A.recorrido(D.recorridos[+b.dataset.recorrido], !!b.dataset.desde), b); });

function urlCap(ref) {
  const m = String(ref).match(/^\s*([123]?\s?[A-Za-zÁÉÍÓÚáéíóúÑñ]+)\.?\s+(\d+)/);
  if (!m) return null;
  const abr = m[1].replace(/\s/g, '');
  const n = Object.keys(D.libros).find((k) => D.libros[k].abr.replace(/\s/g, '') === abr);
  return n ? `https://wol.jw.org/es/wol/b/r4/lp-s/nwt/${n}/${m[2]}` : null;
}
function pintarDato() {
  const d = D.dato, f = d.fuente;
  $('#fb-dato').innerHTML = `<span class="fb-pildora">${esc(d.fecha)}</span>
    <h3>${esc(d.titulo)}</h3>
    <p>${esc(d.resumen)}</p>
    <ul class="fb-refs" aria-label="Pasajes, en wol.jw.org">${d.pasajes.map((p) => { const u = urlCap(p); return `<li>${u ? `<a href="${u}" target="_blank" rel="noopener">${esc(p)}</a>` : esc(p)}</li>`; }).join('')}</ul>
    <p class="fb-fuente"><span class="fb-nivel fb-nivel--${f.nivel === 1 ? 1 : 2}" role="img" aria-label="Nivel ${f.nivel}"></span><span>Fuente: <a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.titulo)}</a>, en ${esc(f.obra)}.</span></p>
    ${d.otra?.fecha ? `<p class="fb-otra">Otra fecha que verás citada: ${esc(d.otra.fecha)}${/\.$/.test(d.otra.fecha) ? '' : '.'} ${esc(d.otra.nota)}</p>` : ''}
    <div class="fb-dato__acciones"><button type="button" class="fb-boton" id="fb-dato-ir">Verlo en el mapa</button></div>`;
  const c = D.cifras;
  $('#fb-cifras').textContent = `${miles(c.sucesos)} sucesos, ${miles(c.lugares)} lugares y ${miles(c.personas)} personas, con ${miles(c.fuentes)} fuentes citadas. Este es uno de ellos, tal como lo enseña su ficha.`;
  if (c.generado) {
    const [y, m, dd] = c.generado.split('-').map(Number);
    const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    $('#fb-fecha-datos').textContent = `Datos del ${dd} de ${MES[m - 1]} de ${y}`;
  }
}
$('#fb-dato').addEventListener('click', (e) => { if (e.target.closest('#fb-dato-ir')) entrar(A.dato(), e.target.closest('#fb-dato-ir')); });

/** Con el sitio cargado, sus datos mandan: nombres, fechas, paradas y cifras salen de su data.json. */
function refrescar(S) {
  try {
    for (const e of D.epocas) { const p = (S.periodos || []).find((x) => x.id === e.id); if (p) { e.nombre = p.nombre; e.texto = p.fecha?.texto || e.texto; } }
    for (const r of D.recorridos) { const x = (S.recorridos || []).find((y) => y.id === r.id); if (x) { r.titulo = x.titulo; r.paradas = x.paradas.length; r.resumen = x.resumen || r.resumen; } }
    Object.assign(D.cifras, { sucesos: S.eventos.length, lugares: Object.keys(S.lugares).length, personas: Object.keys(S.personas).length, fuentes: Object.keys(S.fuentes).length, generado: S.generado || D.cifras.generado });
    pintarEpocas(); pintarRecorridos(); pintarDato(); observarRecortes();
  } catch { /* se quedan los de la copia */ }
}

// ---------------------------------------------------------------------------------------------------------------
// El primer paseo (A8): tres pasos sobre el mapa vivo, definidos por lo que se elige y no por su posición
// ---------------------------------------------------------------------------------------------------------------
const PASOS = [
  { sel: 'evento:caida-de-babilonia', tit: 'Una fecha y su mapa', texto: 'El mapa y la línea de tiempo van juntos. La fecha está en 539 a.e.c., la noche en que el ejército de Ciro entra en Babilonia. La ficha cuenta qué pasó y de dónde sale cada dato.' },
  { sel: 'evento:regreso-de-537', tit: 'Mueve la fecha', texto: 'Dos años después, en 537 a.e.c., miles de judíos salen de Babilonia hacia Jerusalén. Al cambiar la fecha cambian con ella el mapa, la ficha y la línea de tiempo.' },
  { sel: 'lugar:jerusalen', mover: false, tit: 'Toca un lugar', texto: 'Cada lugar tiene su ficha, con lo que pasó allí y cuándo. Esta es Jerusalén en 537 a.e.c. En el mapa, toca cualquier nombre para ver la suya.' },
];
let paso = -1;
function empezarPaseo(origen) {
  // Con el sitio en otro origen no se puede poner nada sobre su mapa: el paseo es el recorrido que ya existe.
  if (!MISMO_ORIGEN) { entrar(A.recorrido({ id: 'de-babilonia-a-jerusalen' }, true)); return; }
  entrar({ hash: 't=-538.0000&v=120&mapa=antiguo', sinFoco: true, luego: () => pasoPaseo(0) }, origen);
}
function pasoPaseo(i) {
  paso = i;
  const BE = M.BE, p = PASOS[i], card = $('#fb-paseo');
  card.hidden = false;
  if (p) {
    const s = BE.parseSel(p.sel);
    if (s) BE.seleccionar(s, { mover: p.mover !== false, encuadrar: true });
    $('#fb-paseo-paso').textContent = `Paso ${i + 1} de ${PASOS.length}`;
    $('#fb-paseo-tit').textContent = p.tit;
    $('#fb-paseo-texto').textContent = p.texto;
    $('#fb-paseo-sigue').textContent = i < PASOS.length - 1 ? 'Siguiente' : 'Terminar el paseo';
    $('#fb-paseo-sale').textContent = 'Salir del paseo';
  } else {
    $('#fb-paseo-paso').textContent = 'Fin del paseo';
    $('#fb-paseo-tit').textContent = 'Ahora tú';
    $('#fb-paseo-texto').textContent = 'Busca a alguien en la caja de arriba, o elige una fecha en la línea de tiempo. El logo te devuelve a la portada.';
    $('#fb-paseo-sigue').textContent = 'Buscar';
    $('#fb-paseo-sale').textContent = 'Cerrar';
  }
  $('#fb-paseo-tit').focus();
}
function cerrarPaseo() { $('#fb-paseo').hidden = true; paso = -1; }
$('#fb-paseo-enlace').addEventListener('click', (e) => { e.preventDefault(); empezarPaseo(e.currentTarget); });
$('#fb-paseo-sigue').addEventListener('click', () => {
  if (paso < PASOS.length) { pasoPaseo(paso + 1); return; }
  cerrarPaseo(); M.marco.focus(); M.win.document.getElementById('q')?.focus();
});
$('#fb-paseo-sale').addEventListener('click', () => { cerrarPaseo(); M.marco.focus(); });
$('#fb-paseo').addEventListener('keydown', (e) => { if (e.key === 'Escape') { cerrarPaseo(); M.marco.focus(); } });

// ---------------------------------------------------------------------------------------------------------------
// Modo reunión: el mismo que el sitio, en los dos documentos
// ---------------------------------------------------------------------------------------------------------------
const lunaBtn = $('#fb-reunion');
const pintarLuna = () => lunaBtn.setAttribute('aria-pressed', String(raiz.classList.contains('be-reunion')));
function sincronizarReunion() {
  if (!M.win) return;
  const on = raiz.classList.contains('be-reunion');
  if (M.win.document.documentElement.classList.contains('be-reunion') !== on) M.win.document.getElementById('reunion-boton')?.click();
}
lunaBtn.addEventListener('click', () => {
  const on = !raiz.classList.contains('be-reunion');
  raiz.classList.toggle('be-reunion', on);
  try { localStorage.setItem('biblical-earth:pref:reunion', on ? '1' : '0'); } catch { /* sin almacenamiento */ }
  pintarLuna(); sincronizarReunion();
});
pintarLuna();
P.letraGrande($('#fb-letra'), () => M.win);

// ---------------------------------------------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------------------------------------------
pintarVuelves(); pintarPregunta(); pintarEpocas(); pintarRecorridos(); pintarDato(); pintarFechas(); observarRecortes();
ajustarAyuda(); pintarBoton();
document.fonts?.ready.then(() => { pintarFechas(); ajustarAyuda(); });
if (location.hash === '#mapa') history.replaceState(null, '', location.pathname + location.search);
// K1: el mapa vivo se carga cuando la página está quieta, nunca antes de la imagen; con ahorro de datos, al entrar.
const ahorro = navigator.connection?.saveData;
if (!params.has('sinmapa') && !ahorro && MISMO_ORIGEN) {
  const pedir = () => (window.requestIdleCallback ? requestIdleCallback(crearMarco, { timeout: 2500 }) : setTimeout(crearMarco, 800));
  if (document.readyState === 'complete') pedir(); else window.addEventListener('load', pedir);
}
// Quien muestra intención de entrar adelanta la carga.
for (const el of [q, $('#fb-entrar')]) { el.addEventListener('pointerenter', crearMarco, { once: true }); el.addEventListener('focus', crearMarco, { once: true }); }
window.FB = { M, entrar, A, volverAPortada, igualar, encuadreVisible, geo };
})();
