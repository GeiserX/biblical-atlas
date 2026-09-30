/* biblical-earth · portada «El sitio, funcionando».
   La mitad de la primera pantalla es el sitio de verdad en un marco (<iframe>), que hace solo una escena de tres paradas
   del recorrido «De Babilonia a Jerusalén». Cualquier toque o tecla sobre él, o «Tomar el mando», para la escena y deja
   el marco a pantalla completa: eso es entrar. Atrás vuelve a la portada.

   Estados (history.state.be): 'portada' (primera visita), 'vuelve' (quien tiene historial: el mapa y una tarjeta),
   'enlace' (un enlace compartido: el mapa y una cinta) y 'dentro' (el mapa, sin nada encima).

   El marco se maneja por su dirección (#t=…&sel=…&paso=…), igual que un enlace del sitio. Si es del mismo origen, la
   portada además lee sus datos, espera a que el mapa esté quieto, usa su propia búsqueda y evita que la escena deje
   entradas en el historial o en «seguir donde lo dejé». Desde otro origen solo cambia la dirección. */
'use strict';
(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const html = document.documentElement;
const Q = new URLSearchParams(location.search);

// ---------------------------------------------------------------------------
// Dónde está el sitio: /site/ servido desde aquí, el sitio publicado, o ?site=<dirección>
// ---------------------------------------------------------------------------
// (../assets/sitio.js: site/ al lado si se sirve la raíz del repositorio, el sitio publicado si no.)
const P = window.PORTADA_SITIO;
const BASE = P.base;
const CLAVE_ULTIMA = 'biblical-earth:ultima';
const CLAVE_CINTA = 'biblical-earth:cinta-vista';
const CLAVE_RC = 'biblical-earth:recorrido:';
const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const escribir = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };
for (const a of $$('[data-sitio]')) a.href = BASE + a.dataset.sitio;

let D = window.LIVE_DATA;
html.dataset.fuente = 'copia';
const reunion = () => html.classList.contains('be-reunion');
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches || reunion();
const estrecha = () => matchMedia('(max-width: 1199px)').matches;
const anunciar = (t) => { const a = $('#anuncio'); a.textContent = ''; setTimeout(() => { a.textContent = t; }, 60); };

// ---------------------------------------------------------------------------
// El marco
// ---------------------------------------------------------------------------
const marco = $('#marco'), vivo = $('#vivo');
const M = { cargando: false, fw: null, mismo: false, listo: false, esperas: [], sinPush: 0 };
const esc0 = D.escena;
const hashPaso = (k) => { const p = esc0.pasos[k]; return `t=${p.t.toFixed(4)}&sel=recorrido:${esc0.recorrido}&mapa=antiguo&paso=${p.paso}`; };
const HASH_INICIO = 't=50.3000&v=40&mapa=antiguo';

// Del mismo origen, el marco abre sin selección y la dirección pedida se pone cuando la portada ya vigila su historial:
// al elegir, el sitio apila una entrada (buscar.js, recorridos.js) y la portada nacía con una entrada de más.
const sinSeleccion = (hash) => hash.split('&').filter((x) => !/^(sel|paso|cartas)=/.test(x)).join('&');
function cargarMarco(hash) {
  if (M.cargando) return;
  M.cargando = true;
  marco.addEventListener('load', alCargar, { once: true });
  P.vigilar(marco);   // si lo que carga no es el sitio (o le falta el mapa), entrar lo dice en vez de abrir un marco muerto
  const diferir = P.mismoOrigen && sinSeleccion(hash) !== hash;
  M.pendiente = diferir ? hash : null;
  marco.src = `${BASE}#${diferir ? sinSeleccion(hash) : hash}`;
}
function cuandoListo() { return M.listo ? Promise.resolve() : new Promise((ok) => M.esperas.push(ok)); }
function alCargar() {
  try { M.fw = marco.contentWindow; void M.fw.document.body; M.mismo = true; } catch { M.mismo = false; }
  // Otro origen: no se sabe cuándo está quieto el mapa; solo si el sitio responde (si no, la portada se queda con la captura).
  if (!M.mismo) { P.listo.then((ok) => { if (ok) setTimeout(listo, 3000); }); return; }
  const fw = M.fw, t0 = performance.now();
  (function mirar() {
    if (P.estado === 'fallo') return;   // no es el sitio, o no tiene mapa: la captura se queda
    const BE = fw.BE;
    if (BE?.D && BE.mapa?.gl) {
      prepararMismo();
      if (M.pendiente) { const h = M.pendiente; M.pendiente = null; aplicar(h); M.sinPush = performance.now() + 6000; }
      quieto(8000).then(listo); return;
    }
    if (performance.now() - t0 > 30000) { listo(); return; }
    setTimeout(mirar, 120);
  })();
}
/** Mientras el sitio va en la mitad (portada), su tarjeta del recorrido baja por debajo de los botones de modo si estos
    caen dentro del mapa (a unos 800 px de ancho el sitio los pone uno encima del otro) y su leyenda no tapa el mapa.
    Al tomar el mando el sitio vuelve a ser como es. */
function ajustarMitad() {
  if (!M.mismo || !M.fw?.document?.head) return;
  const d = M.fw.document, h = d.documentElement;
  if (!d.getElementById('lv-mitad-css')) {
    const st = d.createElement('style'); st.id = 'lv-mitad-css';
    st.textContent = 'html.lv-mitad #leyenda { display: none !important; } html.lv-mitad .vista-recorrido { top: var(--lv-top, 14px) !important; }';
    d.head.append(st);
  }
  const on = estado() === 'portada';
  h.classList.toggle('lv-mitad', on);
  h.style.removeProperty('--lv-top');
  const card = d.querySelector('.vista-recorrido'), modos = d.querySelector('.modos');
  if (!on || !card?.parentElement || !modos?.offsetParent) return;
  const c = card.parentElement.getBoundingClientRect(), b = modos.getBoundingClientRect();
  if (b.top >= c.top && b.bottom <= c.bottom && b.left < c.left + 320) h.style.setProperty('--lv-top', `${Math.round(b.bottom - c.top + 8)}px`);
}
addEventListener('resize', () => ajustarMitad());
function listo() {
  if (M.listo) return;
  M.listo = true;
  ajustarMitad();
  guardarCamara();
  vivo.classList.add('vivo--listo');
  for (const ok of M.esperas.splice(0)) ok();
  if (M.mismo) releerDatos();
  pintarBuscasEstado();
}
/** Promesa que se cumple cuando el mapa del marco termina de pintar (o a los ms). */
function quieto(ms = 2500) {
  return new Promise((ok) => {
    const gl = M.mismo && M.fw.BE?.mapa?.gl;
    if (!gl) { setTimeout(ok, Math.min(ms, 900)); return; }
    let hecho = false;
    const fin = () => { if (!hecho) { hecho = true; ok(); } };
    setTimeout(fin, ms);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (gl.loaded() && gl.areTilesLoaded() && !gl.isMoving()) setTimeout(fin, 150);
      else gl.once('idle', fin);
    }));
  });
}
/** Mismo origen: la escena no guarda nada en el navegador de quien mira, y el logo del sitio reabre la tarjeta. */
let escenaManda = false, tocado = false;   // tocado: quien mira ya ha usado el sitio con su mano
const deEscena = (v) => { try { return new URLSearchParams(JSON.parse(v).hash.slice(1)).get('sel') === `recorrido:${esc0.recorrido}`; } catch { return false; } };
// El sitio escribe «seguir donde lo dejé» en su primer pintado, antes de que la portada pueda tocar su almacenamiento.
// La portada comparte el navegador con el marco: recibe el aviso y deja lo que había.
const guardadoAntes = { [CLAVE_ULTIMA]: leer(CLAVE_ULTIMA), [CLAVE_RC + esc0.recorrido]: leer(CLAVE_RC + esc0.recorrido) };
window.addEventListener('storage', (e) => {
  if (tocado || !(e.key in guardadoAntes)) return;
  if (e.key === CLAVE_ULTIMA && !deEscena(e.newValue)) return;
  const antes = guardadoAntes[e.key];
  try { if (antes == null) localStorage.removeItem(e.key); else localStorage.setItem(e.key, antes); } catch { /* sin almacenamiento */ }
});
function prepararMismo() {
  const fw = M.fw, S = fw.Storage.prototype, orig = S.setItem;
  // Tampoco después, mientras el sitio siga en una parada de la escena que nadie ha tocado: «Seguir donde lo dejé»
  // no debe apuntar a algo que solo se miró.
  S.setItem = function (k, v) {
    if (escenaManda && (k === CLAVE_ULTIMA || k === CLAVE_RC + esc0.recorrido)) return undefined;
    if (!tocado && ((k === CLAVE_ULTIMA && deEscena(v)) || k === CLAVE_RC + esc0.recorrido)) return undefined;
    return orig.call(this, k, v);
  };
  for (const ev of ['pointerdown', 'keydown', 'wheel']) fw.document.addEventListener(ev, () => { tocado = true; }, { capture: true, passive: true });
  // El sitio guarda la vista de antes con pushState cuando cambia la selección (buscar.js, B-15). Lo que cambia la
  // portada no es un paso de quien mira: durante un momento, esas copias sustituyen la entrada en vez de añadir otra.
  const push = fw.history.pushState.bind(fw.history), repl = fw.history.replaceState.bind(fw.history);
  fw.history.pushState = (...a) => (performance.now() < M.sinPush ? repl(...a) : push(...a));
  sincronizarTema();
  fw.document.getElementById('inicio')?.addEventListener('click', () => {
    if (estado() === 'vuelve' || estado() === 'dentro') setTimeout(() => abrirTarjeta(true), 0);
  });
}
/** La escena mantiene quieta la cámara de la primera parada (de Egipto a Babilonia): cambian la fecha, las marcas y la
    ficha, pero el mapa no salta de una ciudad a otra ni se acerca hasta verse borroso. */
let camara = null;
function guardarCamara() {
  if (!M.mismo) return;
  const gl = M.fw.BE?.mapa?.gl;
  // En la franja del teléfono solo se ve la parte de arriba del marco: Jerusalén y Babilonia, bajo la tarjeta del recorrido.
  if (gl && M.fw.innerWidth > 760 && estado() === 'portada') {
    const cam = gl.cameraForBounds([[34.2, 30.4], [45.0, 34.7]], { padding: { top: 70, bottom: 130, left: 40, right: 70 } });
    if (cam) gl.jumpTo(cam);
  }
  if (gl && M.fw.innerWidth <= 760 && estado() === 'portada') {
    const caja = gl.getContainer().getBoundingClientRect(), franja = vivo.getBoundingClientRect().height;
    const arriba = 226, abajo = franja - 60;   // bajo la tarjeta flotante del recorrido y sobre la barra de la franja
    const padding = { top: Math.max(0, arriba - caja.top), bottom: Math.max(0, caja.bottom - abajo), left: 34, right: 44 };
    if (caja.height - padding.top - padding.bottom > 60) { const cam = gl.cameraForBounds([[34.6, 31.2], [44.9, 33.3]], { padding }); if (cam) gl.jumpTo(cam); }
  }
  if (gl) camara = { center: gl.getCenter(), zoom: gl.getZoom(), bearing: 0, pitch: 0 };
}
function fijarCamara() {
  if (!M.mismo || !camara) return;
  try { M.fw.BE.mapa.gl.jumpTo(camara); } catch { /* sin mapa */ }
}
/** El marco lleva el mismo modo que la página (?tema= lo fuerza en las dos sin guardarlo). */
function sincronizarTema() {
  if (!M.mismo) return;
  const fh = M.fw.document.documentElement;
  for (const c of ['be-reunion', 'be-letra-grande']) if (fh.classList.contains(c) !== html.classList.contains(c)) fh.classList.toggle(c, html.classList.contains(c));
  const BE = M.fw.BE;
  if (BE?.sucio) { const s = BE.sucio; s.etiquetas = s.panel = s.linea = s.mapa = true; BE.programar(); }
}
/** Cambia la vista del marco sin dejar entradas en su historial: como si fuera Atrás (el sitio no guarda al volver). */
function aplicar(hash) {
  if (!M.cargando) { cargarMarco(hash); return; }
  if (M.mismo) {
    const fw = M.fw;
    M.sinPush = performance.now() + 2500;
    fw.history.replaceState(fw.history.state, '', `#${hash}`);
    fw.dispatchEvent(new fw.PopStateEvent('popstate', { state: fw.history.state }));
  } else marco.contentWindow.location.replace(`${BASE}#${hash}`);
}
/** Ejecuta fn en el sitio sin que su historial guarde la vista de antes (mismo origen). */
function sinHistoria(fn) {
  const fw = M.fw;
  M.sinPush = performance.now() + 2500;
  fw.dispatchEvent(new fw.PopStateEvent('popstate', { state: fw.history.state }));
  fn(fw.BE);
}
function releerDatos() {
  try {
    const nuevo = window.LiveExtract.extraer(M.fw.BE.D);
    html.dataset.fuente = 'sitio';
    if (JSON.stringify(nuevo) !== JSON.stringify(D)) { D = nuevo; pintarZonas(); }
  } catch { /* se quedan los de data.js */ }
}

// ---------------------------------------------------------------------------
// La escena: tres paradas, la fecha moviéndose entre ellas. Una sola vez, nunca en bucle.
// ---------------------------------------------------------------------------
const S = { i: 0, modo: 'espera', pausa: false, token: 0 };
// modo: 'espera' (el mapa aún no está), 'corre', 'pausa', 'pasos' (a mano: movimiento reducido o reunión),
//       'quieto' (teléfono lento: la captura y «Ver cómo funciona»), 'fin', 'tomado'
function pintarPasos() {
  $('#pasos').innerHTML = esc0.pasos.map((p, k) => `<li class="paso" data-k="${k}"><span class="paso-num"><span>${k + 1}</span></span><span class="paso-fecha">${esc(p.anio)}</span><span class="paso-tit">${esc(p.titulo)}</span></li>`).join('');
  $('#escena-que').textContent = `Recorrido «${esc0.titulo}», tres de sus ${esc0.n === 8 ? 'ocho' : esc0.n} paradas.`;
}
function marcarPaso(k, { hablar = true } = {}) {
  S.i = k;
  $$('#pasos .paso').forEach((li, j) => {
    li.classList.toggle('paso--visto', j < k || (S.modo === 'fin' && j <= k));
    li.classList.toggle('paso--ahora', j === k && S.modo !== 'fin');
    if (j === k) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
  const p = esc0.pasos[k];
  $('#rotulo').innerHTML = `${k + 1} de ${esc0.pasos.length} · ${esc(p.anio)}<br><b>${esc(p.titulo)}</b>`;
  if (hablar) anunciar(`Paso ${k + 1} de ${esc0.pasos.length}: ${p.anio}, ${p.titulo}.`);
}
const ICONOS = {
  pausa: '<path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  sig: '<path d="M5 12h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  otra: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
};
function control(texto, icono, estadoTexto) {
  for (const b of [$('#control'), $('#control2')]) {
    b.querySelector('span').textContent = texto;
    b.querySelector('svg').innerHTML = ICONOS[icono];
    b.setAttribute('aria-pressed', String(icono === 'play' && S.modo === 'pausa'));
    if (icono !== 'play' && icono !== 'pausa') b.removeAttribute('aria-pressed');
  }
  $('#escena-estado').textContent = estadoTexto;
}
function pintarControl() {
  const n = esc0.pasos.length;
  if (S.modo === 'espera') control('Pausar', 'pausa', 'Preparando el mapa…');
  else if (S.modo === 'corre') control('Pausar', 'pausa', `Paso ${S.i + 1} de ${n}. Se para sola al final.`);
  else if (S.modo === 'pausa') control('Reanudar', 'play', `En pausa en el paso ${S.i + 1} de ${n}.`);
  else if (S.modo === 'pasos') control(S.i < n - 1 ? 'Siguiente' : 'Desde el principio', S.i < n - 1 ? 'sig' : 'otra', `Paso ${S.i + 1} de ${n}. Avanza tú.`);
  else if (S.modo === 'quieto') control('Ver cómo funciona', 'play', 'Mira tres paradas de un recorrido.');
  else if (S.modo === 'fin') control('Verla otra vez', 'otra', 'Así funciona: una fecha lo mueve todo. Ahora tú.');
  else if (S.modo === 'tomado') control('Ver la escena', 'play', 'La escena está parada. Puedes verla desde el principio.');
}
/** Tiempo de reloj que no corre en pausa; se rompe si la escena se cancela. */
function tiempo(ms, token) {
  return new Promise((ok, ko) => {
    let resta = ms, t0 = performance.now();
    (function tic(ahora = performance.now()) {
      if (token !== S.token) { ko(new Error('cancelada')); return; }
      if (!S.pausa) resta -= ahora - t0;
      t0 = ahora;
      if (resta <= 0) ok(); else requestAnimationFrame(tic);
    })();
  });
}
/** La fecha del sitio se mueve de a hasta b: el cursor, la línea y la ficha a la vez. */
function moverFecha(a, b, ms, token) {
  return new Promise((ok, ko) => {
    let hecho = 0, t0 = performance.now(), ultimo = 0;
    const suave = (x) => (x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2);
    (function tic(ahora = performance.now()) {
      if (token !== S.token) { ko(new Error('cancelada')); return; }
      if (!S.pausa) hecho += ahora - t0;
      t0 = ahora;
      const f = Math.min(1, hecho / ms), t = a + (b - a) * suave(f);
      if (M.mismo) { const BE = M.fw.BE; BE.setT(t); BE.asegurarVisible(t, true); }
      else if (ahora - ultimo > 150 || f >= 1) { ultimo = ahora; marco.contentWindow.location.replace(`${BASE}#t=${t.toFixed(4)}&sel=recorrido:${esc0.recorrido}&mapa=antiguo&paso=${esc0.pasos[S.i].paso}`); }
      if (f >= 1) ok(); else requestAnimationFrame(tic);
    })();
  });
}
async function correr() {
  const token = ++S.token;
  S.modo = 'corre'; S.pausa = false; escenaManda = true; tocado = false;
  const P = esc0.pasos;
  try {
    if (S.i !== 0) { await fundido(hashPaso(0)); }
    marcarPaso(0); pintarControl();
    await tiempo(4500, token);
    for (let k = 1; k < P.length; k++) {
      await moverFecha(P[k - 1].t, P[k].t, k === 1 ? 2400 : 1300, token);
      aplicar(hashPaso(k)); fijarCamara();
      marcarPaso(k); pintarControl();
      await quieto(2500);
      await tiempo(k === P.length - 1 ? 2500 : 4200, token);
    }
    S.modo = 'fin'; marcarPaso(P.length - 1, { hablar: false }); pintarControl();
    anunciar('Fin de la escena. Pulsa «Tomar el mando» para usar el mapa tú.');
  } catch { /* cancelada: la tomó quien mira */ }
}
async function fundido(hash) {
  const c = $('#cubre');
  c.classList.add('on');
  await new Promise((r) => setTimeout(r, reunion() ? 0 : 230));
  aplicar(hash);
  if (escenaManda) fijarCamara();
  await quieto(2500);
  c.classList.remove('on');
}
async function pasoAMano(k) {
  S.modo = 'pasos'; escenaManda = true;
  await fundido(hashPaso(k));
  marcarPaso(k); pintarControl();
}
function pulsarControl() {
  const n = esc0.pasos.length;
  if (S.modo === 'corre') { S.pausa = true; S.modo = 'pausa'; pintarControl(); anunciar('Escena en pausa.'); }
  else if (S.modo === 'pausa') { S.pausa = false; S.modo = 'corre'; pintarControl(); anunciar('Sigue la escena.'); }
  else if (S.modo === 'pasos') pasoAMano(S.i < n - 1 ? S.i + 1 : 0);
  else if (S.modo === 'quieto' || S.modo === 'espera' || S.modo === 'fin' || S.modo === 'tomado') {
    if (!M.cargando) cargarMarco(hashPaso(0));
    S.modo = 'espera'; pintarControl();
    cuandoListo().then(() => { if (reducido()) pasoAMano(0); else { S.i = S.i || 0; correr(); } });
  }
}
function pararEscena() {
  S.token++;
  S.pausa = false;
  escenaManda = false;
  if (['corre', 'pausa', 'pasos', 'fin', 'espera', 'quieto'].includes(S.modo)) S.modo = 'tomado';
  pintarControl();
}

// ---------------------------------------------------------------------------
// Estados de la página: portada, vuelve, enlace, dentro. Atrás los recorre.
// ---------------------------------------------------------------------------
const estado = () => html.dataset.estado;
const APARTAR = () => [$('#palabras'), ...$$('.zona'), $('#pie'), $('.proto')];
let scrollGuardado = 0, plegada = false;
function ponerEstado(e, { foco = true } = {}) {
  const antes = estado();
  html.dataset.estado = e;
  ajustarMitad();
  const mapa = e !== 'portada';
  if (mapa && antes === 'portada') scrollGuardado = scrollY;
  html.classList.toggle('dentro', mapa);
  marco.inert = !mapa;
  marco.tabIndex = mapa ? 0 : -1;
  for (const el of APARTAR()) if (el) el.inert = mapa;
  $('#velo').inert = mapa;
  $('#vuelve').hidden = e !== 'vuelve' || plegada;
  $('#vuelve-plegada').hidden = e !== 'vuelve' || !plegada;
  const cinta = e === 'enlace' && !$('#cinta').dataset.cerrada;
  $('#cinta').hidden = !cinta;
  html.classList.toggle('con-cinta', cinta);
  if (!mapa) {
    if (antes && antes !== 'portada') requestAnimationFrame(() => scrollTo({ top: scrollGuardado, behavior: 'instant' }));
    if (foco && antes && antes !== 'portada') {
      const n = origenFoco && document.querySelector(origenFoco);
      const f = () => (n && n.offsetParent ? n : $('#tomar')).focus({ preventScroll: true });
      f(); requestAnimationFrame(f); setTimeout(f, 120);
    }
    if (S.modo === 'tomado') pintarControl();
    return;
  }
  if (foco) cuandoListo().then(() => enfocarSitio(e));
}
function enfocarSitio(e) {
  if (e === 'vuelve' && !plegada) { $('#vuelve-seguir').hidden ? $('#q2').focus({ preventScroll: true }) : $('#vuelve-seguir').focus(); return; }
  if (e === 'enlace' && !$('#cinta').hidden) { $('#cinta-portada').focus(); return; }
  marco.focus();
  if (M.mismo) {
    const d = M.fw.document;
    const h = d.querySelector('#panel-cuerpo h2, #panel-cuerpo h1, #panel-cuerpo .be-card__title');
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }
}
/** Entrar: la mitad viva crece a toda la ventana. Atrás la devuelve a su sitio. */
let origenFoco = null, esperando = false;
async function entrar({ hash = null, luego = null } = {}) {
  if (esperando || estado() === 'dentro') return;
  // El control por el que se entra: al volver, el foco va a él (se guarda por su id o sus data-*: las zonas se repintan).
  const a = document.activeElement;
  origenFoco = a && a !== document.body ? (a.id ? `#${a.id}` : Object.keys(a.dataset || {}).length
    ? a.tagName.toLowerCase() + Object.entries(a.dataset).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}="${CSS.escape(v)}"]`).join('') : null) : null;
  // Tomar el mando a media escena deja el sitio en la parada que enseña su ficha, no en un año entre dos paradas.
  const aMedias = !hash && ['corre', 'pausa'].includes(S.modo) && M.mismo && M.listo;
  pararEscena();
  if (!M.cargando) cargarMarco(hash || hashPaso(0));
  else hash = hash || (aMedias ? hashPaso(S.i) : null);
  // Antes de tiempo, o sin sitio: la portada se queda con «Abriendo el mapa…»; si el sitio no llega, lo dice.
  if (P.estado !== 'listo') {
    esperando = true;
    const ok = await P.esperar();
    esperando = false;
    if (!ok) return;
  }
  history.pushState({ be: 'dentro' }, '');
  ponerEstado('dentro', { foco: false });
  // Primero crece el marco; después el sitio encuadra con su tamaño nuevo.
  cuandoListo().then(() => dosFotogramas()).then(() => {
    if (hash && M.mismo) aplicar(hash); else if (hash && !marco.src.endsWith(hash)) aplicar(hash);
    const propio = luego && M.mismo ? luego(M.fw.BE) : false;   // la lista de resultados del sitio se queda su foco
    return dosFotogramas().then(() => propio);
  }).then((propio) => { if (!propio) enfocarSitio('dentro'); });
}
const dosFotogramas = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 30))));
window.addEventListener('popstate', (ev) => {
  const e = ev.state?.be || inicial;
  if (e === 'portada' && S.modo === 'tomado') pintarControl();
  ponerEstado(e);
});

// ---------------------------------------------------------------------------
// Quien vuelve: la tarjeta pequeña sobre el mapa
// ---------------------------------------------------------------------------
function ultima() { try { return JSON.parse(leer(CLAVE_ULTIMA) || 'null'); } catch { return null; } }
function abrirTarjeta(abrir) {
  plegada = !abrir;
  $('#vuelve').hidden = !abrir;
  $('#vuelve-plegada').hidden = abrir;
  $('#vuelve-plegar').setAttribute('aria-expanded', 'true');
  $('#vuelve-plegada').setAttribute('aria-expanded', 'false');
  if (estado() === 'dentro' && abrir) { html.dataset.estado = 'vuelve'; }
  if (abrir) ($('#vuelve-seguir').hidden ? $('#q2') : $('#vuelve-seguir')).focus(); else $('#vuelve-plegada').focus();
}

// ---------------------------------------------------------------------------
// Búsqueda: la del propio sitio, en cuanto el marco tiene sus datos
// ---------------------------------------------------------------------------
const EJEMPLOS = ['Pedro', 'Hch 16', '607 a.e.c.'];
const FORMA = { persona: 'persona', lugar: 'lugar', evento: 'evento', periodo: 'periodo', libro: 'texto', pasaje: 'texto', carta: 'texto', recorrido: 'recorrido', viaje: 'recorrido', hallazgo: 'evento' };
const buscas = [];
const sinTildes = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
/** Lo que se busca desde la portada empieza limpio: sin la selección de la escena ni de otra visita. */
function limpiar(BE) { if (BE.E.sel) BE.seleccionar(null, { mover: false, encuadrar: false }); }
function montarBusca(form) {
  const input = $('input', form), lista = $('.sugerencias', form), estadoEl = $('.busca-estado', form);
  const B = { form, input, lista, estadoEl, rs: [], activo: -1 };
  buscas.push(B);
  const cerrarLista = () => { lista.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); B.activo = -1; };
  function pintar() {
    const q = input.value.trim();
    if (!M.listo || !M.mismo) {
      if (!M.cargando) cargarMarco(hashPaso(0));
      estadoEl.textContent = !M.listo ? 'Cargando los datos del atlas… Puedes escribir y pulsar Intro.' : '';
      if (!q) { pintarEjemplos(); return; }
      cerrarLista(); return;
    }
    estadoEl.textContent = '';
    if (!q) { pintarEjemplos(); return; }
    let rs = [];
    try { rs = M.fw.BE.buscar(q); } catch { rs = []; }
    B.rs = rs.slice(0, 5);
    const total = rs.length;
    if (!B.rs.length) {
      lista.innerHTML = `<p class="sug-nota">Nada con «${esc(q)}». Prueba con otro nombre, un capítulo («Hch 16») o un año («607 a.e.c.»).</p>`;
      lista.hidden = false; input.setAttribute('aria-expanded', 'true'); B.activo = -1; return;
    }
    const id = lista.id;
    lista.innerHTML = B.rs.map((r, i) => {
      const tipo = r.sel?.tipo || (r.grupo === 'Fechas' ? 'fecha' : '');
      const forma = FORMA[tipo] || (tipo === 'fecha' ? 'fecha' : 'texto');
      const meta = [r.grupo, r.fechaTexto || r.meta].filter(Boolean).join(' · ');
      return `<div class="sug" role="option" id="${id}-${i}" data-i="${i}" aria-selected="false"><span class="sug-forma forma-${forma}" aria-hidden="true"></span><span class="sug-tit">${esc(r.titulo)}</span><span class="sug-meta">${esc(meta)}</span></div>`;
    }).join('') + (total > B.rs.length ? `<div class="sug" role="option" id="${id}-mas" data-i="todos" aria-selected="false"><span class="sug-forma" aria-hidden="true"></span><span class="sug-tit">Ver los ${total} resultados en el sitio</span></div>` : '');
    lista.hidden = false; input.setAttribute('aria-expanded', 'true');
    B.activo = -1; input.removeAttribute('aria-activedescendant');
    verLista();
  }
  // La lista se abre debajo de la caja: si queda fuera de la pantalla, la página sube lo justo para verla.
  function verLista() { requestAnimationFrame(() => { const r = lista.getBoundingClientRect(); if (r.bottom > innerHeight - 8) scrollBy({ top: Math.min(r.bottom - innerHeight + 16, r.top - 72), behavior: reducido() ? 'instant' : 'smooth' }); }); }
  function pintarEjemplos() {
    B.rs = [];
    const id = lista.id;
    lista.innerHTML = `<p class="sug-nota" id="${id}-prueba">Prueba:</p><div class="sug-ejemplos" role="group" aria-labelledby="${id}-prueba">${EJEMPLOS.map((x, i) => `<div class="sug" role="option" id="${id}-e${i}" data-ejemplo="${esc(x)}" aria-selected="false">${esc(x)}</div>`).join('')}</div>`;
    lista.hidden = false; input.setAttribute('aria-expanded', 'true'); B.activo = -1; input.removeAttribute('aria-activedescendant');
  }
  function activar(i) {
    const ops = $$('[role="option"]', lista);
    if (!ops.length) return;
    B.activo = (i + ops.length) % ops.length;
    ops.forEach((o, j) => o.setAttribute('aria-selected', String(j === B.activo)));
    input.setAttribute('aria-activedescendant', ops[B.activo].id);
    ops[B.activo].scrollIntoView({ block: 'nearest' });
  }
  function elegirOp(op) {
    if (!op) return;
    if (op.dataset.ejemplo) {   // un ejemplo lleva a su destino: el primer resultado del sitio para ese texto
      const ej = op.dataset.ejemplo;
      input.value = ej; cerrarLista();
      entrar({ luego: (BE) => sinHistoria(() => { limpiar(BE); const r = BE.buscar(ej)[0]; if (!r) BE.buscarTexto(ej); else if (r.accion) r.accion(); else BE.seleccionar(r.sel); }) });
      return;
    }
    const q = input.value.trim();
    if (op.dataset.i === 'todos') { cerrarLista(); entrar({ luego: (BE) => { sinHistoria(() => { limpiar(BE); BE.buscarTexto(q); }); return true; } }); return; }
    const r = B.rs[+op.dataset.i];
    if (!r) return;
    cerrarLista();
    entrar({ luego: (BE) => sinHistoria(() => { limpiar(BE); if (r.accion) r.accion(); else BE.seleccionar(r.sel); }) });
  }
  input.addEventListener('focus', pintar);
  input.addEventListener('input', pintar);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (lista.hidden) pintar(); else activar(B.activo + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activar(B.activo - 1); }
    else if (e.key === 'Escape') { if (!lista.hidden) { e.preventDefault(); e.stopPropagation(); cerrarLista(); } }
  });
  lista.addEventListener('mousedown', (e) => e.preventDefault());
  lista.addEventListener('click', (e) => elegirOp(e.target.closest('[role="option"]')));
  form.addEventListener('focusout', () => setTimeout(() => { if (!form.contains(document.activeElement)) cerrarLista(); }, 0));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    const ops = $$('[role="option"]', lista);
    if (!lista.hidden && B.activo >= 0 && ops[B.activo]) { elegirOp(ops[B.activo]); return; }
    if (!q) { input.focus(); return; }
    // Intro elige solo si el sitio da una respuesta directa: el mismo nombre, un año o una pregunta que entiende.
    const nq = sinTildes(q);
    let directa = B.rs.findIndex((r) => sinTildes(r.titulo) === nq);
    if (directa < 0 && B.rs[0] && B.rs[0].puntos >= 900 && ['Fechas', 'Preguntas'].includes(B.rs[0].grupo)) directa = 0;
    if (directa >= 0 && ops[directa]) { elegirOp(ops[directa]); return; }
    cerrarLista();
    entrar({ luego: (BE) => { sinHistoria(() => { limpiar(BE); BE.buscarTexto(q); }); return true; } });
  });
  B.pintar = pintar;
}
function pintarBuscasEstado() { for (const B of buscas) if (document.activeElement === B.input) B.pintar(); }

// ---------------------------------------------------------------------------
// Las zonas de abajo
// ---------------------------------------------------------------------------
/** «607 a.e.c.» y «515 a.e.c.» → «607 a 515 a.e.c.»; si cambia de era, las dos enteras. */
function rangoAnios(a, b) {
  if (a === b) return a;
  const era = (x) => x.replace(/^\d+\s*/, '');
  return era(a) === era(b) ? `${a.replace(/\s.*$/, '')} a ${b}` : `${a} a ${b}`;
}
function progresoDe(id) { const v = leer(CLAVE_RC + id); return v == null ? null : Math.max(0, +v || 0); }
function rutaSvg(r) {
  const d = r.dibujo;
  if (!d) return '';
  const xs = d.pts.map((p) => p.xy[0]), ys = d.pts.map((p) => p.xy[1]);
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let w = Math.max(x1 - x0, 60), h = Math.max(y1 - y0, 34);
  w *= 1.5; h *= 1.6;
  if (w / h > 16 / 9) h = w * 9 / 16; else w = h * 16 / 9;
  if (w > d.w) { w = d.w; h = w * 9 / 16; }       // nunca más allá del borde del relieve
  if (h > d.h) { h = d.h; w = Math.min(d.w, h * 16 / 9); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let vx = cx - w / 2, vy = cy - h / 2;
  vx = Math.max(0, Math.min(d.w - w, vx)); vy = Math.max(0, Math.min(d.h - h, vy));
  const k = w / 320;   // unidades del dibujo por píxel de la tarjeta (unos 320 px de ancho)
  const pts = d.pts.map((p) => p.xy.join(',')).join(' ');
  const grupos = new Map();
  for (const p of d.pts) { const key = p.xy.join(','); if (!grupos.has(key)) grupos.set(key, { xy: p.xy, ns: [], nombre: p.nombre }); grupos.get(key).ns.push(p.n); }
  const puntos = [...grupos.values()].map((g) => {
    const txt = g.ns.length > 3 ? `${g.ns.slice(0, 2).join('·')}…` : g.ns.join('·');
    return `<circle class="rc-punto${g.ns.includes(1) ? ' rc-punto--1' : ''}" cx="${g.xy[0]}" cy="${g.xy[1]}" r="${4.2 * k}" stroke-width="${2 * k}"/><text class="rc-num" x="${g.xy[0] + 7 * k}" y="${g.xy[1] - 6 * k}" style="font-size:${11 * k}px" stroke-width="${3 * k}">${esc(txt)}</text>`;
  }).join('');
  return `<svg class="rc-mapa" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <image data-href="${esc(d.src)}" x="0" y="0" width="${d.w}" height="${d.h}"/>
    <polyline class="rc-casco" points="${pts}" stroke-width="${6 * k}"/><polyline class="rc-ruta" points="${pts}" stroke-width="${2.6 * k}" stroke-dasharray="${7 * k} ${4 * k}"/>${puntos}</svg>`;
}
function pintarZonas() {
  // Recorridos: su ruta, sus fechas, sus minutos y por dónde vas.
  $('#lista-recorridos').innerHTML = D.recorridos.map((r) => {
    const pr = progresoDe(r.id);
    const va = pr != null && pr > 0 && pr < r.n;
    const rango = rangoAnios(r.desde, r.hasta);
    return `<article class="rc" aria-labelledby="rc-${r.id}">${rutaSvg(r)}<div class="rc-cuerpo">
      <p class="rc-meta">${r.n} paradas · ${esc(rango)} · unos ${r.minutos} minutos</p>
      <h3 id="rc-${r.id}">${esc(r.titulo)}</h3>
      ${r.resumen ? `<p class="rc-resumen">${esc(r.resumen)}</p>` : ''}
      ${va ? `<div class="rc-avance"><span>Vas por la parada ${pr + 1} de ${r.n}: ${esc(r.paradas[pr]?.nombre || '')}</span><span class="rc-barra" aria-hidden="true">${r.paradas.map((_, k) => `<span class="${k <= pr ? 'hecho' : ''}"></span>`).join('')}</span></div>` : ''}
      <div class="rc-acciones">${va
        ? `<button type="button" class="btn btn--primario" data-rc="${esc(r.id)}" data-paso="${pr + 1}">Seguir en la parada ${pr + 1}</button><button type="button" class="enlace" data-rc="${esc(r.id)}" data-paso="1" data-desde-cero>Desde el principio</button>`
        : `<button type="button" class="btn" data-rc="${esc(r.id)}" data-paso="1" aria-label="${esc(`Empezar el recorrido «${r.titulo}»`)}">Empezar el recorrido</button>`}</div>
    </div></article>`;
  }).join('');
  cargarRelievesPerezoso();

  $('#lista-preguntas').innerHTML = D.preguntas.map((q, i) => `<button type="button" class="pregunta" data-pregunta="${i}">
    <span class="pregunta-meta"><span class="pildora">${esc(q.fecha)}</span><span>${esc(q.donde)}</span></span>
    <span class="pregunta-texto">${esc(q.texto)}</span><span class="pregunta-ir">Abrir en el mapa <span aria-hidden="true">→</span></span></button>`).join('');

  // La línea del banner: 4026 a.e.c. a 100 e.c. a escala real, seis fechas mayores y las otras épocas como marcas menores.
  const T0 = -4025, T1 = 101, x = (t) => ((t - T0) / (T1 - T0)) * 100;
  const mayores = new Set(D.fechas.map((f) => Math.floor(f.t)));
  const menores = D.eras.map((e) => e.desde).filter((t) => ![...mayores].some((m) => Math.abs(m - t) < 2));
  $('#linea-fechas').innerHTML = `<span class="lf-eje"></span>${menores.map((t) => `<span class="lf-menor" style="left:${x(t).toFixed(2)}%"></span>`).join('')}
    ${D.fechas.map((f, i) => {
      const n = D.fechas.length, pos = i === 0 ? ' lf-boton--inicio' : (i === n - 1 ? ' lf-boton--fin' : '');
      const arriba = i === n - 2 ? ' lf-boton--arriba' : ' lf-boton--abajo';
      return `<span class="lf-mayor" style="left:${x(Math.floor(f.t)).toFixed(2)}%"></span><button type="button" class="lf-boton${arriba}${pos}" style="left:${x(Math.floor(f.t)).toFixed(2)}%" data-fecha="${i}" aria-label="${esc(`${f.texto}: ${f.titulo}. Abrir en el mapa`)}">${esc(f.texto)}</button>`;
    }).join('')}`;
  $('#lista-eras').innerHTML = D.eras.map((e) => `<li><button type="button" class="era${e.sinLibro ? ' era--sin-libro' : ''}" data-era="${esc(e.id)}">
    <span class="era-num">${e.n}</span><span class="era-nombre">${esc(e.nombre)}</span><span class="era-fecha">${esc(e.fecha)}</span><span class="era-frase">${esc(e.frase)}</span></button></li>`).join('');

  // Un dato con su fuente, y las cifras del atlas.
  const d = D.dato, c = D.cifras;
  $('#caja-dato').innerHTML = `${d ? `<article class="ficha" aria-labelledby="dato-h">
      <p class="ficha-cab"><span class="pildora">${esc(d.fecha)}</span><span class="marca-nivel" role="img" aria-label="Fuente de nivel 1: Biblia o publicación de jw.org"></span><span>Biblia o publicación de jw.org</span>${d.estado === 'verificado' ? '<span class="estado">Verificado</span>' : ''}</p>
      <h3 id="dato-h">${esc(d.titulo)}</h3>
      <p class="ficha-texto">${esc(d.resumen)}</p>
      <p class="refs"><span>Lee el relato:</span>${d.pasajes.filter((p) => p.url).map((p) => `<a class="ref" href="${esc(p.url)}" target="_blank" rel="noopener" aria-label="${esc(`${p.texto}, leer en wol.jw.org (abre otra pestaña)`)}">${esc(p.texto)}</a>`).join('')}</p>
      <div><p class="caps">Fuentes</p><div class="fuentes">${d.fuentes.map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener"><span class="marca-nivel${f.nivel === 2 ? ' marca-nivel--2' : ''}" role="img" aria-label="${f.nivel === 1 ? 'Nivel 1' : 'Nivel 2'}"></span><span>${esc(f.titulo)} <span class="obra">· ${esc(f.obra)}</span></span></a>`).join('')}</div></div>
      <div class="ficha-pie"><button type="button" class="btn" data-dato>Verlo en el mapa</button></div>
    </article>` : ''}
    <div class="cifras">
      <p>${c.sucesos} sucesos, ${c.lugares} lugares y ${c.personas} personas, con ${c.fuentes} fuentes citadas. Cada uno dice de dónde sale.</p>
      <ul class="niveles">
        <li><span class="marca-nivel" aria-hidden="true"></span><span><b>Nivel 1.</b> La Traducción del Nuevo Mundo y wol.jw.org. Enlazamos; no copiamos sus textos.</span></li>
        <li><span class="marca-nivel marca-nivel--2" aria-hidden="true"></span><span><b>Nivel 2.</b> Arqueología e investigación, solo cuando jw.org las usa, y siempre con su fuente.</span></li>
        <li><span class="sin-verificar">Sin verificar</span><span>Se ve marcado, nunca escondido.</span></li>
      </ul>
      <p>La cobertura de ${c.revisados} de los ${c.libros} libros está revisada capítulo a capítulo; la del resto, todavía no.</p>
      <p><a class="enlace-44" href="${esc(BASE)}acerca.html#datos">Cómo trabajamos con los datos</a></p>
    </div>`;
  if (D.generado) {
    const [y, m, dd] = D.generado.split('-').map(Number);
    const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    if (y && m && dd) $('#pie-fecha').textContent = `Datos del ${dd} de ${MES[m - 1]} de ${y}`;
  }
}
/** Los relieves de las tarjetas llegan cuando la zona se acerca a la pantalla. */
function cargarRelievesPerezoso() {
  const imgs = $$('#lista-recorridos image[data-href]');
  const poner = (im) => { im.setAttribute('href', im.dataset.href); im.removeAttribute('data-href'); };
  if (!('IntersectionObserver' in window)) { imgs.forEach(poner); return; }
  // Se observa cada svg entero, no la imagen de dentro.
  const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { const im = e.target.querySelector('image[data-href]'); if (im) poner(im); io.unobserve(e.target); } }, { rootMargin: '400px' });
  $$('#lista-recorridos svg').forEach((sv) => io.observe(sv));
}

// Cada botón de las zonas entra en el sitio con su dirección.
document.addEventListener('click', (e) => {
  const t = e.target;
  const rc = t.closest('[data-rc]');
  if (rc) {
    const id = rc.dataset.rc, paso = +rc.dataset.paso;
    if (rc.hasAttribute('data-desde-cero')) escribir(CLAVE_RC + id, '0');
    entrar({ hash: `sel=recorrido:${id}&mapa=antiguo&paso=${paso}` });
    return;
  }
  const pq = t.closest('[data-pregunta]');
  if (pq) { const q = D.preguntas[+pq.dataset.pregunta]; entrar({ hash: `t=${q.t.toFixed(4)}&sel=${q.sel}&mapa=antiguo${q.extra ? `&${q.extra}` : ''}` }); return; }
  const fe = t.closest('[data-fecha]');
  if (fe) { const f = D.fechas[+fe.dataset.fecha]; entrar({ hash: `sel=${f.sel}&mapa=antiguo` }); return; }
  const er = t.closest('[data-era]');
  if (er) {
    const era = D.eras.find((x) => x.id === er.dataset.era);
    entrar({ hash: `t=${(era.desde + 0.01).toFixed(4)}&v=${era.hasta - era.desde}&sel=periodo:${era.id}&mapa=antiguo` });
    if (era.caja) cuandoListo().then(() => setTimeout(() => encuadrarEra(era.caja), 350));
    return;
  }
  if (t.closest('#linea-completa')) { entrar({ hash: 't=50.3000&v=4126&mapa=antiguo' }); return; }
  if (t.closest('[data-dato]')) { entrar({ hash: `sel=${D.dato.sel}&mapa=antiguo` }); }
});
/** Idea D1, hecha desde fuera: la época abre donde ocurrió (el sitio de hoy la encuadra siempre sobre el Egeo). */
function encuadrarEra(caja) {
  if (!M.mismo) return;
  const gl = M.fw.BE.mapa.gl, w = M.fw.innerWidth, h = M.fw.innerHeight;
  const ancho = w > 760;
  const padding = ancho ? { top: 90, bottom: 280, left: 60, right: 440 } : { top: 130, bottom: Math.round(h * 0.55), left: 30, right: 30 };
  try { gl.fitBounds([[caja[0], caja[1]], [caja[2], caja[3]]], { padding, maxZoom: 7.5, duration: reducido() ? 0 : 700 }); } catch { /* ventana demasiado pequeña */ }
}
const fechaPie = $('#fecha-pie');
$('#linea-fechas').addEventListener('pointerover', (e) => { const b = e.target.closest('[data-fecha]'); if (b) fechaPie.textContent = D.fechas[+b.dataset.fecha].titulo; });
$('#linea-fechas').addEventListener('focusin', (e) => { const b = e.target.closest('[data-fecha]'); if (b) fechaPie.textContent = D.fechas[+b.dataset.fecha].titulo; });

// ---------------------------------------------------------------------------
// Ajustes: modo reunión y letra grande, compartidos con el sitio
// ---------------------------------------------------------------------------
function pintarAjustes() {
  $('#reunion').setAttribute('aria-pressed', String(reunion()));
  $('#letra').setAttribute('aria-pressed', String(html.classList.contains('be-letra-grande')));
  const img = $('#captura'), src = $('#vivo source');
  img.src = reunion() ? img.dataset.reunion : 'img/captura-escritorio.webp';
  src.srcset = reunion() ? src.dataset.reunion : 'img/captura-movil.webp';
}
$('#reunion').addEventListener('click', () => {
  const on = !reunion();
  html.classList.toggle('be-reunion', on);
  escribir('biblical-earth:pref:reunion', on ? '1' : '0');
  if (M.mismo) { const b = M.fw.document.getElementById('reunion-boton'); if (b && M.fw.document.documentElement.classList.contains('be-reunion') !== on) b.click(); }
  pintarAjustes();
  if (on && (S.modo === 'corre' || S.modo === 'pausa')) { S.token++; S.pausa = false; S.modo = 'pasos'; pintarControl(); }
});
$('#letra').addEventListener('click', () => {
  const on = !html.classList.contains('be-letra-grande');
  html.classList.toggle('be-letra-grande', on);
  escribir('biblical-earth:pref:letra-grande', on ? '1' : '0');
  if (M.mismo) {
    M.fw.document.documentElement.classList.toggle('be-letra-grande', on);
    const s = M.fw.BE.sucio; s.etiquetas = s.panel = s.linea = s.mapa = true; M.fw.BE.programar();
  }
  pintarAjustes();
});

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
let inicial = 'portada';
function arrancar() {
  pintarPasos();
  pintarZonas();
  pintarAjustes();
  $$('form[data-busca]').forEach(montarBusca);
  // La ayuda de cada caja, la más larga que cabe entera (a 320 px se cortaba).
  for (const i of $$('form[data-busca] input')) P.ajustarAyuda(i, ['Persona, lugar, capítulo o año', 'Persona, lugar o año', 'Buscar']);
  for (const b of [$('#control'), $('#control2')]) b.addEventListener('click', pulsarControl);
  $('#tomar').addEventListener('click', () => entrar());
  const velo = $('#velo');
  velo.addEventListener('click', () => entrar());
  velo.addEventListener('keydown', (e) => {
    if (['Tab', 'Shift', 'Alt', 'Control', 'Meta', 'CapsLock'].includes(e.key) || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault(); entrar();
  });

  const u = ultima();
  const hashSitio = location.hash.length > 1 && /(^|&)(sel|t|leer|grafo|conexion)=/.test(location.hash.slice(1)) ? location.hash.slice(1) : null;
  const pedido = Q.get('estado');
  inicial = hashSitio ? 'enlace' : (pedido === 'nuevo' ? 'portada' : (pedido === 'vuelve' || u?.hash ? 'vuelve' : 'portada'));
  if (u?.hash) {
    const texto = u.texto || 'tu última vista';
    for (const [b, t] of [[$('#seguir'), $('#seguir-texto')], [$('#vuelve-seguir'), $('#vuelve-seguir-texto')]]) { b.hidden = false; t.textContent = texto; }
    const irUltima = () => { const h = u.hash.replace(/^#/, ''); if (estado() === 'portada') entrar({ hash: h }); else { aplicar(h); history.pushState({ be: 'dentro' }, ''); ponerEstado('dentro'); } };
    $('#seguir').addEventListener('click', irUltima);
    $('#vuelve-seguir').addEventListener('click', irUltima);
  }
  $('#vuelve-plegar').addEventListener('click', () => abrirTarjeta(false));
  $('#vuelve-plegada').addEventListener('click', () => abrirTarjeta(true));
  $('#vuelve-mas').addEventListener('click', () => { history.pushState({ be: 'portada' }, ''); ponerEstado('portada', { foco: false }); if (S.modo === 'espera') S.modo = 'tomado'; pintarControl(); $('#titulo').scrollIntoView(); $('#tomar').focus({ preventScroll: true }); });
  $('#cinta-cerrar').addEventListener('click', () => { $('#cinta').dataset.cerrada = '1'; $('#cinta').hidden = true; html.classList.remove('con-cinta'); marco.focus(); });
  $('#cinta-portada').addEventListener('click', () => { $('#cinta').dataset.cerrada = '1'; history.pushState({ be: 'portada' }, ''); ponerEstado('portada'); S.modo = 'tomado'; pintarControl(); });
  $$('[data-proto-estado]').forEach((a) => a.addEventListener('click', () => { if (/cinta=1/.test(a.href)) try { localStorage.removeItem(CLAVE_CINTA); } catch { /* nada */ } }));

  history.replaceState({ be: inicial }, '', location.pathname + location.search);
  if (inicial === 'enlace') {
    const visto = leer(CLAVE_CINTA) && Q.get('cinta') !== '1';
    if (visto) $('#cinta').dataset.cerrada = '1'; else escribir(CLAVE_CINTA, '1');
    cargarMarco(hashSitio);
    S.modo = 'tomado'; pintarControl();
    ponerEstado('enlace');
    cuandoListo().then(() => {
      if (!M.mismo) return;
      const BE = M.fw.BE, sel = BE.parseSel(new URLSearchParams(hashSitio).get('sel'));
      if (sel) $('#cinta-texto').textContent = `Estás viendo ${BE.nombreSel(sel)} en ${BE.fmtCursor(BE.E.t)}`;
    });
    return;
  }
  if (inicial === 'vuelve') {
    // Detrás de la tarjeta, la vista que ofrece «Seguir donde lo dejé», no la de siempre.
    cargarMarco(u?.hash ? u.hash.replace(/^#/, '') : HASH_INICIO);
    S.modo = 'tomado'; pintarControl();
    ponerEstado('vuelve', { foco: false });
    return;
  }
  // Primera visita: la escena, si hay red y nada pide quietud.
  ponerEstado('portada', { foco: false });
  if (Q.get('captura') === '1') { html.classList.add('captura'); cargarMarco(hashPaso(0)); cuandoListo().then(() => quieto(6000)).then(() => { html.dataset.capturaLista = '1'; }); return; }
  const con = navigator.connection;
  const lenta = Q.get('lento') === '1' || (!!con && (con.saveData || /(^|-)(2g|3g)$/.test(con.effectiveType || '')));
  marcarPaso(0, { hablar: false });
  if (lenta) { S.modo = 'quieto'; pintarControl(); return; }
  S.modo = 'espera'; pintarControl();
  cargarMarco(hashPaso(0));
  const plazo = setTimeout(() => { if (!M.listo && S.modo === 'espera') { S.modo = 'quieto'; pintarControl(); } }, 9000);
  cuandoListo().then(() => {
    clearTimeout(plazo);
    if (S.modo !== 'espera') return;          // tardó demasiado, o ya la tomó quien mira
    if (reducido()) { S.modo = 'pasos'; escenaManda = true; marcarPaso(0, { hablar: false }); pintarControl(); return; }
    correr();
  });
}
arrancar();
})();
