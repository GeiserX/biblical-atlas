/* biblical-earth · portada «La de hoy, afinada».
   La portada de hoy con sus zonas y su orden, y cada fallo medido arreglado. Encima del sitio de verdad, que carga en
   un marco fijo detrás: por la ventana del héroe se ve su mapa, y entrar es quitar el papel y darle el marco a quien lee
   (Atrás lo vuelve a poner). Las acciones usan la misma interfaz que site/js/portada.js (BE.seleccionar, BE.setT,
   BE.verTramo, BE.mapa.encuadrar, BE.buscar), así que llevarlas al sitio es cambiar «win.BE» por «BE». */
'use strict';
(() => {
const DATOS = window.PORTADA_DATOS;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fmtAnio = (y) => (y > 0 ? `${y} e.c.` : `${1 - y} a.e.c.`);
const miles = (n) => n.toLocaleString('es-ES').replace(/ /g, '.');

// ---------------------------------------------------------------------------
// Dónde está el sitio: /site/ en local, el sitio publicado fuera, y ?site=<dirección> manda sobre los dos.
// ---------------------------------------------------------------------------
// (../assets/sitio.js: site/ al lado si se sirve la raíz del repositorio, el sitio publicado si no.)
const params = new URLSearchParams(location.search);
const P = window.PORTADA_SITIO;
const SITIO = P.base;
// Solo en el mismo origen se puede quitar el velo y dar el marco a quien lee (y mirar su localStorage). Si no, entrar
// es ir al sitio con la dirección: el marco no se carga y la ventana enseña la imagen del relieve.
const MISMO_ORIGEN = P.mismoOrigen;
const INICIO = 't=50.3000&v=40&mapa=antiguo';
// Por la ventana se ve solo el relieve, como en el banner: sin rutas, cartas, zonas inciertas ni hallazgos. Al entrar,
// la dirección del destino no lleva «ocultas» y todo vuelve a verse.
const TRAS = `${INICIO}&ocultas=viajes,cartas,inciertos,hallazgos,pendientes`;
const urlSitio = (hash = '') => `${SITIO}index.html${hash ? `#${hash}` : ''}`;
for (const a of document.querySelectorAll('[data-sitio]')) a.href = SITIO + a.dataset.sitio;

const CLAVE = { ultima: 'biblical-earth:ultima', paso: 'biblical-earth:recorrido:', leidos: 'biblical-earth:leidos', pref: 'biblical-earth:pref:' };
const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const escribir = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };
const leerJSON = (k, def) => { try { return JSON.parse(leer(k) || 'null') ?? def; } catch { return def; } };

const raiz = document.documentElement;
const portada = $('#portada');
let marco = $('#sitio');
const ventana = $('#ventana');
const anunciar = (t) => { const a = $('#anuncio'); a.textContent = ''; setTimeout(() => { a.textContent = t; }, 50); };
const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches || raiz.classList.contains('be-reunion');

// ---------------------------------------------------------------------------
// Destinos. Cada uno con su dirección (para ir al sitio si el marco no está listo) y, si hace falta, lo que hay que
// hacer en él con la interfaz del sitio. Son los mismos que los de site/js/portada.js, con sus fallos arreglados.
// ---------------------------------------------------------------------------
const hashDe = ({ t, sel, extra = '' }) => [t != null ? `t=${t.toFixed(4)}` : '', sel ? `sel=${sel}` : '', 'mapa=antiguo', extra].filter(Boolean).join('&');
const EJEMPLOS = [
  { texto: 'Pablo', tipo: 'persona', hash: hashDe({ sel: 'persona:pablo' }), ayuda: 'Pablo: su vida y sus viajes en el mapa' },
  { texto: 'Hechos 16', tipo: 'capítulo', hash: hashDe({ extra: 'leer=hch-16' }), ayuda: 'Hechos 16: leer el capítulo con el mapa al lado' },
  { texto: '607 a.e.c.', tipo: 'año', hash: hashDe({ t: -605.4422, sel: 'evento:destruccion-de-jerusalen-607' }), ayuda: '607 a.e.c.: Babilonia destruye Jerusalén' },
];
// La segunda pregunta cae ahora en 520 a.e.c. (t=-518.5); hoy da -519.5, que el sitio enseña como «c. 521 a.e.c.».
// La tercera enseña todas las cartas en el mapa (cartas=todas), que es lo que pregunta.
const PREGUNTAS = [
  { texto: '¿Qué pasaba en Babilonia en tiempos de Jesús?', nota: 'Babilonia · c. 30 e.c.', hash: hashDe({ t: 30.5, sel: 'lugar:babilonia' }) },
  { texto: '¿Quién había en Judá con los medos y persas?', nota: 'Jerusalén · c. 520 a.e.c.', hash: hashDe({ t: -518.5, sel: 'lugar:jerusalen' }) },
  { texto: '¿Desde dónde escribió Pablo cada carta?', nota: 'Pablo · sus cartas en el mapa', hash: hashDe({ t: 50.3, sel: 'persona:pablo', extra: 'cartas=todas' }) },
];

// ---------------------------------------------------------------------------
// El marco: el sitio de verdad detrás de la portada
// ---------------------------------------------------------------------------
let win = null;          // la ventana del sitio, cuando es del mismo origen
let datosListos = false, mapaListo = false;
const esperandoDatos = [];
// Mientras la portada está puesta, el sitio enseña solo su mapa, a pantalla completa y sin marcas ni controles:
// es lo que se ve por la ventana. Al entrar se quita esta clase y el sitio vuelve a su forma de siempre.
const ESTILO_TRAS = `
html.tras-portada #app > *:not(#mapa), html.tras-portada #mapa > *:not(#mapa-gl),
html.tras-portada .maplibregl-marker, html.tras-portada .maplibregl-control-container { visibility: hidden !important; }
html.tras-portada #mapa, html.tras-portada #mapa-gl { position: fixed !important; inset: 0 !important; width: auto !important; height: auto !important; }`;

function cargarMarco() {
  if (!MISMO_ORIGEN) { marco.remove(); return; }
  // El marco se crea de nuevo: uno escrito en el HTML recupera, al volver con Atrás desde otra página (acerca.html), la
  // dirección que tenía y cargaba dos veces; la portada se quedaba con la ventana de la primera, ya sin datos.
  const f = marco.cloneNode(false);
  f.name = `portada-${Date.now()}`;
  f.addEventListener('load', alCargarMarco, { once: true });
  P.vigilar(f);
  f.src = urlSitio(TRAS);
  marco.replaceWith(f);
  marco = f;
}
function alCargarMarco() {
  try { win = marco.contentWindow; void win.document; if (!win.BE) throw new Error('no es el sitio'); } catch { win = null; return; }
  const d = win.document;
  const s = d.createElement('style'); s.id = 'portada-tras'; s.textContent = ESTILO_TRAS; d.head.append(s);
  d.documentElement.classList.add('tras-portada');
  parchearHistoria(win);
  // El logo del sitio vuelve a esta portada (en vez de abrir la portada vieja del sitio) y no borra la vista.
  d.addEventListener('click', (e) => {
    if (!e.target.closest?.('#inicio')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    history.pushState({ portada: 'portada' }, '', location.pathname + location.search);
    ponerVelo();
  }, true);
  vigilar();
}
function vigilar() {
  const B = win?.BE;
  if (B?.D && !datosListos) {
    datosListos = true;
    esperandoDatos.splice(0).forEach((f) => f());
    alLlegarDatos(B);
  }
  const gl = B?.mapa?.gl;
  if (!gl) { setTimeout(vigilar, 120); return; }
  const listo = () => {
    // El sitio encuadra a Pablo al cargar; se espera a que termine y entonces se pone el mapa en la ventana.
    setTimeout(() => {
      mapaListo = true;
      // La cámara del sitio al abrir (el Egeo con Pablo): «Explorar el mapa» la devuelve tal cual.
      camaraGuardada = { center: gl.getCenter(), zoom: gl.getZoom(), bearing: gl.getBearing(), pitch: gl.getPitch() };
      if (!raiz.classList.contains('dentro')) encuadrarVentana();
      ventana.classList.add('viva');
    }, 350);
  };
  if (gl.loaded() && gl.areTilesLoaded?.()) listo(); else gl.once('idle', listo);
}
// El mapa de detrás, puesto en el recuadro de la ventana y con el mismo encuadre que la imagen que la sustituye
// mientras carga (assets/img/paul-journeys: de 12,1 a 37,1 E, centrada en 36,2 N). «Cubrir» como la imagen: si la
// ventana es más ancha que la imagen manda el ancho, si no el alto. El marco se desplaza en vertical hasta que el
// centro del mapa cae en el centro de la ventana: así el mapa no choca con sus límites (en el teléfono la ventana va
// baja y, con relleno, el mapa no podía subir más allá del norte de su relieve).
function encuadrarVentana() {
  const gl = win?.BE?.mapa?.gl;
  if (!gl) return;
  const r = ventana.getBoundingClientRect();
  const vw = innerWidth, vh = innerHeight;
  const top = r.top + scrollY;
  if (r.width < 40) return;
  const dy = Math.round(top + r.height / 2 - vh / 2);
  marco.style.transform = `translateY(${dy}px)`;
  const v = Math.max(0, (vh - r.height) / 2);
  const padding = { top: v, bottom: v, left: r.left, right: vw - r.right };
  const ancha = r.width / r.height > 2560 / 1440;
  const caja = ancha ? [[12.1, 36.2], [37.1, 36.21]] : [[24.6, 30.5], [24.61, 41.9]];
  gl.fitBounds(caja, { padding, duration: 0 });
}
let redim = 0;
addEventListener('resize', () => { clearTimeout(redim); redim = setTimeout(() => { if (mapaListo && !raiz.classList.contains('dentro')) encuadrarVentana(); }, 200); });

// ---------------------------------------------------------------------------
// Entrar y volver (idea I1): entrar quita el velo y deja el mapa donde está; Atrás lo vuelve a poner.
// ---------------------------------------------------------------------------
let focoAlEntrar = null, scrollAlEntrar = 0, camaraGuardada = null;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
// El control que se pulsó, dicho por sus atributos data-*: al volver se busca de nuevo, aunque su zona se haya
// vuelto a pintar (los recorridos cambian de «Empezar» a «Seguir»).
function claveFoco(el) {
  if (!el || el === document.body) return null;
  if (el.id) return `#${el.id}`;
  const ds = Object.entries(el.dataset || {});
  return ds.length ? ds.map(([k, v]) => `[data-${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}="${v}"]`).join('') : null;
}
// Mientras se entra, el sitio no crea entradas de historial propias (las convierte en sustituciones): así el primer
// Atrás devuelve a la portada, y no a una vista intermedia. Hoy, tras una época, el primer Atrás no hacía nada y el
// segundo sacaba del sitio.
// El silencio dura hasta que el sitio ha pintado dos veces después de quitar el velo (su historial se escribe al
// pintar), y un poco más. Contarlo en tiempo desde el clic fallaba: con el mapa ocupado, el hilo tardaba segundos.
let silencio = false, turnoSilencio = 0;
function callarHistoriaDelSitio(on) {
  const t = ++turnoSilencio;
  if (on) { silencio = true; return; }
  win.requestAnimationFrame(() => win.requestAnimationFrame(() => setTimeout(() => { if (t === turnoSilencio) silencio = false; }, 600)));
}
function parchearHistoria(w) {
  const H = w.History.prototype, push = H.pushState;
  H.pushState = function (...a) { return silencio ? this.replaceState(...a) : push.apply(this, a); };
}

/** destino: { hash } para una dirección del sitio (null: el mapa tal como está), o { hacer(BE) } para usar la
    interfaz del sitio. */
let esperando = false;
async function entrar(destino, origen) {
  focoAlEntrar = claveFoco(origen || document.activeElement);
  // El sitio en otro origen: se va a él con la dirección, si responde. Atrás vuelve aquí igual.
  if (!MISMO_ORIGEN) { P.ir(urlSitio(destino.hash || INICIO)); return; }   // nunca con «ocultas»
  if (!win || !datosListos || !mapaListo) {
    // Antes de tiempo: «Abriendo el mapa…» y se entra en cuanto el marco está listo, sin volver a pedir el sitio en la
    // pestaña (eso cortaba las descargas del marco). Si el sitio no llega a cargar, la portada se queda y lo dice.
    if (esperando) return;
    esperando = true;
    const ok = await P.esperar(() => win && datosListos && mapaListo);
    for (let i = 0; ok && !(win && datosListos && mapaListo) && i < 600; i++) await esperar(100);
    esperando = false;
    if (!(win && datosListos && mapaListo)) { if (ok) P.avisar(); return; }
  }
  const B = win.BE;
  callarHistoriaDelSitio(true);
  history.pushState({ portada: 'mapa' }, '', '#mapa');
  const turno = empezarSalida();
  // Primero el sitio vuelve a su forma (barra, ficha, línea) y su mapa a su sitio, y después se va al destino: así
  // el encuadre se calcula con la ficha abierta. Pasa mientras el papel se desvanece.
  win.document.documentElement.classList.remove('tras-portada');
  marco.style.transform = '';
  B.mapa.gl.resize();
  // «Explorar el mapa» entra en el mapa tal como está; solo se quitan las capas que la ventana escondía.
  const ahora = win.location.hash.slice(1);
  const ir = destino.hacer ? INICIO : destino.hash || (/(^|&)ocultas=/.test(ahora) ? INICIO : null);
  if (ir && ir !== ahora) { win.location.replace(urlSitio(ir)); await esperar(60); }
  if (!destino.hash && camaraGuardada) B.mapa.gl.jumpTo(camaraGuardada);   // lo que no encuadra solo
  if (destino.hacer) destino.hacer(B);
  await esperar(sinMovimiento() ? 0 : 260);
  terminarSalida(turno);
}
// Cada salida lleva su turno: si Atrás llega antes de que termine (con el hilo ocupado puede pasar), la salida
// pendiente ya no quita el velo.
let turnoSalida = 0;
function empezarSalida() {
  scrollAlEntrar = scrollY;
  cerrarLista();
  if (!sinMovimiento()) portada.classList.add('saliendo');
  return ++turnoSalida;
}
function terminarSalida(turno) {
  if (turno !== turnoSalida) return;
  callarHistoriaDelSitio(false);
  raiz.classList.add('dentro');
  portada.classList.remove('saliendo');
  marco.inert = false; marco.removeAttribute('aria-hidden'); marco.removeAttribute('tabindex');
  marco.focus();
  // El foco va a la ficha, no a la búsqueda: en el teléfono no salta el teclado.
  const panel = win.document.getElementById('panel-cuerpo');
  (panel || win.document.body).focus({ preventScroll: true });
  if (win.document.title) document.title = win.document.title;
}
function ponerVelo() {
  if (!raiz.classList.contains('dentro') && !portada.classList.contains('saliendo')) return;
  turnoSalida++;
  portada.classList.remove('saliendo');
  raiz.classList.remove('dentro');
  marco.inert = true; marco.setAttribute('aria-hidden', 'true'); marco.setAttribute('tabindex', '-1');
  // La cámara de quien sale del mapa se guarda: la ventana enseña el encuadre de siempre, y «Explorar el mapa»
  // devuelve el mapa exactamente como estaba.
  const gl = win.BE.mapa.gl;
  camaraGuardada = { center: gl.getCenter(), zoom: gl.getZoom(), bearing: gl.getBearing(), pitch: gl.getPitch() };
  win.document.documentElement.classList.add('tras-portada');
  gl.resize();
  document.title = 'biblical-earth · Cada relato de la Biblia, en su lugar y en su tiempo';
  pintarVuelve(); pintarRecorridos();
  scrollTo(0, scrollAlEntrar);
  requestAnimationFrame(() => {
    encuadrarVentana();
    const el = (focoAlEntrar && document.querySelector(focoAlEntrar)) || $('#portada-titulo');
    sinSugerir = true;   // volver a la caja no vuelve a abrir la lista
    el.focus({ preventScroll: true });
    sinSugerir = false;
  });
}
addEventListener('popstate', () => {
  if (!win) return;
  // Adelante después de Atrás: vuelve a quitar el velo, sin cambiar nada del mapa.
  if (location.hash === '#mapa') { if (!raiz.classList.contains('dentro')) { win.document.documentElement.classList.remove('tras-portada'); marco.style.transform = ''; win.BE.mapa.gl.resize(); if (camaraGuardada) win.BE.mapa.gl.jumpTo(camaraGuardada); const turno = empezarSalida(); setTimeout(() => terminarSalida(turno), sinMovimiento() ? 0 : 260); } }
  else ponerVelo();
});
// Si alguien abre la portada con #mapa (una recarga dentro del mapa), se queda en la portada.
if (location.hash === '#mapa') history.replaceState(null, '', location.pathname + location.search);

// ---------------------------------------------------------------------------
// Pintar las zonas
// ---------------------------------------------------------------------------
function pintarEjemplos() {
  $('#ejemplos').insertAdjacentHTML('beforeend', EJEMPLOS.map((x, i) =>
    `<button type="button" class="ejemplo" data-ejemplo="${i}" aria-label="${esc(x.ayuda)}">${esc(x.texto)} <small aria-hidden="true">${esc(x.tipo)}</small></button>`).join(''));
}
function pintarPreguntas() {
  $('#preguntas').innerHTML = PREGUNTAS.map((p, i) => `<li><button type="button" class="pregunta" data-pregunta="${i}"><span>${esc(p.texto)}<small>${esc(p.nota)}</small></span><span class="pregunta-flecha" aria-hidden="true">→</span></button></li>`).join('');
}

// «Seguir donde lo dejé» (G1): arriba, en la primera línea, con la vista, el recorrido a medias y la lectura.
function recorridoAMedias() {
  let mejor = null;
  for (const r of DATOS.recorridos) {
    const n = +(leer(CLAVE.paso + r.id) || 0);
    if (n > 0 && n < r.paradas && (!mejor || n / r.paradas > mejor.n / mejor.r.paradas)) mejor = { r, n };
  }
  return mejor;
}
function lecturaReciente() {
  const ls = leerJSON(CLAVE.leidos, []);
  if (!ls.length) return null;
  const [num] = String(ls[ls.length - 1]).split('-');
  const libro = DATOS.libros[num];
  if (!libro) return null;
  const caps = new Set(ls.filter((k) => String(k).startsWith(`${num}-`)).map((k) => +String(k).split('-')[1]));
  let sig = 1; while (caps.has(sig) && sig < libro[1]) sig++;
  return { num: +num, nombre: libro[0], total: libro[1], leidos: caps.size, sig };
}
function pintarVuelve() {
  const u = leerJSON(CLAVE.ultima, null);
  const rc = recorridoAMedias();
  const lec = lecturaReciente();
  const v = $('#vuelve');
  const hay = !!(u?.hash || rc || lec);
  // Quien vuelve ya sabe qué es el sitio: su línea ocupa el sitio del antetítulo.
  $('.antetitulo').hidden = hay;
  if (!hay) { v.hidden = true; v.innerHTML = ''; return; }
  v.hidden = false;
  v.innerHTML = `<h2 class="be-caps vuelve-rotulo" id="vuelve-rotulo">Donde lo dejaste</h2>
    ${u?.hash ? `<button type="button" class="vuelve-ir vuelve-ir--prim" data-vuelve="vista">Seguir: ${esc(u.texto || 'tu última vista')} <span aria-hidden="true">→</span></button>` : ''}
    ${rc ? `<button type="button" class="vuelve-ir" data-vuelve="recorrido" data-id="${esc(rc.r.id)}" aria-label="Seguir el recorrido «${esc(rc.r.titulo)}» en la parada ${rc.n + 1} de ${rc.r.paradas}">${esc(rc.r.titulo.split(',')[0])} <small>${rc.n + 1}/${rc.r.paradas}</small></button>` : ''}
    ${lec ? `<button type="button" class="vuelve-ir" data-vuelve="lectura" data-num="${lec.num}" data-cap="${lec.sig}" aria-label="Leer ${esc(lec.nombre)} ${lec.sig}; llevas ${lec.leidos} de ${lec.total} capítulos">${esc(lec.nombre)} <small>${lec.leidos}/${lec.total} cap.</small></button>` : ''}
    <p class="vuelve-nota">Guardado solo en este navegador${u?.hash ? '<span aria-hidden="true">·</span><button type="button" class="vuelve-olvidar" data-vuelve="olvidar">Olvidar la última vista</button>' : '.'}</p>`;
}

// Las épocas (D2): una sola tinta, número, nombre, fechas y los libros que las cuentan; el dibujo a escala real encima.
function pintarEpocas() {
  const es = DATOS.eras;
  // La raya va de 4026 a.e.c. a 100 e.c., como la del banner (la última época acaba hacia 98 e.c.; el atlas llega a 100).
  const t0 = es[0].desde, t1 = Math.max(100, es[es.length - 1].hasta), total = t1 - t0;
  $('#lista-epocas').innerHTML = es.map((e) => {
    const sin = !e.libros;
    return `<li><button type="button" class="epoca${sin ? ' epoca--sin-libro' : ''}" data-epoca="${esc(e.id)}">
      <span class="epoca-num" aria-hidden="true">${e.num}</span>
      <span class="epoca-nombre"><span class="sr-only">Época ${e.num}: </span>${esc(e.nombre)}</span>
      <span class="epoca-fecha">${esc(e.fecha)}</span>
      <span class="epoca-libros">${sin ? 'Sin libro bíblico' : `Lo cuentan: ${esc(e.libros)}`}</span>
      <span class="epoca-ir" aria-hidden="true">→</span></button></li>`;
  }).join('');
  pintarEscala(es, t0, total);
  const ult2 = es.slice(-2).reduce((s, e) => s + (e.hasta - e.desde), 0);
  $('#escala-pie').textContent = `Las nueve épocas a escala real, de ${fmtAnio(t0)} a ${fmtAnio(t1)}: la raya rayada es la época sin libro bíblico. Las dos últimas, la vida de Jesús y la congregación, ocupan el ${Math.max(1, Math.round((ult2 / total) * 100))} % de la línea.`;
}
function pintarEscala(es, t0, total) {
  const dib = $('#escala-dibujo');
  const x = (t) => ((t - t0) / total) * 100;
  let html = '';
  for (const e of es) {
    html += `<span class="escala-tramo${e.libros ? '' : ' escala-tramo--sin-libro'}" data-tramo="${esc(e.id)}" style="left:calc(${x(e.desde)}% + 1px);width:max(2px, calc(${x(e.hasta) - x(e.desde)}% - 2px))"></span>`;
    html += `<span class="escala-num" data-num="${esc(e.id)}" style="left:${(x(e.desde) + x(e.hasta)) / 2}%">${e.num}</span>`;
  }
  // Las seis fechas del banner, con su marca de pino. Si dos chocan, gana la de más prioridad (los extremos y 607).
  const FECHAS = [[-4025, '4026 a.e.c.', 0], [t0 + total, '100 e.c.', 0], [-606, '607 a.e.c.', 1], [-1512, '1513', 2], [-2369, '2370', 3], [33, '33 e.c.', 4]];
  for (const [t, txt, p] of FECHAS) html += `<span class="escala-fecha" data-p="${p}" data-x="${x(t)}">${txt}</span>`;
  dib.innerHTML = html;
  colocarEscala();
}
// Números que chocan: el de la derecha sube un piso, con una guía hasta su tramo (como «33 e.c.» en el banner).
// Fechas que chocan: se quita la de menos prioridad. Se recalcula al cambiar el ancho.
function colocarEscala() {
  const dib = $('#escala-dibujo');
  const W = dib.clientWidth;
  if (!W) return;
  dib.querySelectorAll('.escala-guia').forEach((g) => g.remove());
  let prev = -1e9;
  for (const n of dib.querySelectorAll('.escala-num')) {
    n.classList.remove('escala-num--alto');
    const cx = (parseFloat(n.style.left) / 100) * W;
    if (cx - prev < 16) {
      n.classList.add('escala-num--alto');
      dib.insertAdjacentHTML('beforeend', `<span class="escala-guia" style="left:${cx}px;top:14px;height:20px"></span>`);
    }
    prev = cx;
  }
  const fechas = [...dib.querySelectorAll('.escala-fecha')].sort((a, b) => a.dataset.p - b.dataset.p);
  const puestas = [];
  for (const f of fechas) {
    f.hidden = false;
    const cx = (parseFloat(f.dataset.x) / 100) * W, w = f.offsetWidth;
    let izq = cx - w / 2; if (izq < 0) izq = 0; if (izq + w > W) izq = W - w;
    const choca = puestas.some(([a, b]) => izq < b + 10 && izq + w > a - 10);
    if (choca) { f.hidden = true; continue; }
    puestas.push([izq, izq + w]);
    f.style.left = `${izq}px`; f.style.setProperty('--tick', `${cx - izq - 1}px`);
  }
}
addEventListener('resize', () => requestAnimationFrame(colocarEscala));
// Con el ratón, un tramo de la raya abre su época, como su tarjeta (el teclado tiene las tarjetas: la raya es un dibujo).
$('#escala-dibujo').addEventListener('click', (e) => {
  const t = e.target.closest?.('[data-tramo], [data-num]');
  const id = t?.dataset.tramo || t?.dataset.num;
  if (id) document.querySelector(`[data-epoca="${id}"]`)?.click();
});
function resaltarTramo(id) {
  document.querySelectorAll('[data-tramo].activo, [data-num].activo').forEach((x) => x.classList.remove('activo'));
  if (!id) return;
  document.querySelectorAll(`[data-tramo="${id}"], [data-num="${id}"]`).forEach((x) => x.classList.add('activo'));
}

// Los recorridos (F1): su ruta dibujada, sus fechas, un resumen y su avance. Entrar no borra el paso guardado.
function dibujoRecorrido(r, n) {
  const hecho = (i) => i <= n;
  if (r.ruta.forma === 'ruta') {
    const pts = r.ruta.puntos.map((p, i) => (p ? { p, i } : null)).filter(Boolean);
    const linea = (ps, cls) => (ps.length > 1 ? `<polyline class="ruta-linea${cls}" points="${ps.map(({ p }) => p.join(',')).join(' ')}"/>` : '');
    const hechos = n > 0 ? pts.filter(({ i }) => i <= n) : [];
    const desde = hechos.length ? hechos[hechos.length - 1].i : -1;
    const resto = pts.filter(({ i }) => i >= desde);
    return `<svg class="recorrido-dibujo" viewBox="-4 -4 108 64" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      ${linea(hechos, '')}${linea(resto, ' ruta-linea--falta')}
      ${pts.map(({ p, i }) => `<circle class="ruta-punto${i === 0 ? ' ruta-punto--inicio' : hecho(i) && n > 0 ? '' : ' ruta-punto--falta'}" cx="${p[0]}" cy="${p[1]}" r="2.6"/>`).join('')}
      ${(r.ruta.nombres || []).map(([nom, x, y], k) => `<text class="ruta-nombre" x="${x}" y="${y > 14 ? y - 5 : y + 10}" text-anchor="${k ? 'end' : 'start'}">${esc(nom)}</text>`).join('')}</svg>`;
  }
  // Casi todo en un mismo sitio (la última semana en Jerusalén): los días, no el camino.
  const dias = r.dias || [];
  const unicos = [...new Set(dias)];
  let x = 4, ult = null;
  const puntos = dias.map((d, i) => { if (ult !== null) x += d === ult ? 5 : 9; ult = d; return { x, i, d }; });
  const esc2 = 100 / Math.max(100, x + 4);
  return `<svg class="recorrido-dibujo" viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <line class="ruta-linea ruta-linea--falta" x1="4" y1="30" x2="${(x) * esc2}" y2="30"/>
    ${puntos.map(({ x: px, i }) => `<circle class="ruta-punto${i === 0 ? ' ruta-punto--inicio' : hecho(i) && n > 0 ? '' : ' ruta-punto--falta'}" cx="${px * esc2}" cy="30" r="2.4"/>`).join('')}
    ${(r.puntas || []).map((t, k) => `<text class="ruta-nombre" x="${k ? x * esc2 : 4}" y="20" text-anchor="${k ? 'end' : 'start'}">${esc(t)}</text>`).join('')}
    <text class="ruta-nombre ruta-nombre--peq" x="${(x * esc2) / 2}" y="44" text-anchor="middle">${unicos.length} días con paradas</text></svg>`;
}
function pintarRecorridos() {
  $('#lista-recorridos').innerHTML = DATOS.recorridos.map((r) => {
    const n = Math.min(r.paradas - 1, +(leer(CLAVE.paso + r.id) || 0));
    const medias = n > 0;
    return `<li><article class="recorrido" aria-labelledby="rc-${esc(r.id)}">
      ${dibujoRecorrido(r, n)}
      <span class="recorrido-meta">${r.paradas} paradas · ${esc(r.fechas)} · unos ${r.minutos} min</span>
      <h3 class="recorrido-tit" id="rc-${esc(r.id)}">${esc(r.titulo)}</h3>
      ${r.resumen ? `<p class="recorrido-resumen">${esc(r.resumen)}</p>` : ''}
      ${medias ? `<p class="recorrido-avance">Vas por la parada ${n + 1} de ${r.paradas}</p><div class="recorrido-barra" aria-hidden="true"><span style="width:${((n + 1) / r.paradas) * 100}%"></span></div>` : ''}
      <div class="recorrido-acciones">
        <button type="button" class="be-btn ${medias ? 'be-btn--primary' : ''} recorrido-ir" data-recorrido="${esc(r.id)}" aria-label="${medias ? `Seguir «${esc(r.titulo)}» en la parada ${n + 1}` : `Empezar «${esc(r.titulo)}»`}">${medias ? 'Seguir' : 'Empezar'} <span aria-hidden="true">→</span></button>
        ${medias ? `<button type="button" class="enlace" data-recorrido="${esc(r.id)}" data-desde-cero="1" aria-label="Empezar «${esc(r.titulo)}» desde el principio">Desde el principio</button>` : ''}
      </div></article></li>`;
  }).join('');
}

// Las fuentes (L1): un dato de verdad con su fuente, y las cifras del atlas en texto normal.
function pintarFuentes() {
  const c = DATOS.cifras, ej = DATOS.ejemplo;
  $('#cifras').textContent = `${miles(c.sucesos)} sucesos, ${miles(c.lugares)} lugares y ${miles(c.personas)} personas, cada uno con su fuente: ${miles(c.fuentes)} citadas en total. La cobertura está revisada en ${c.revisados} de los ${c.libros} libros; los demás, todavía no.`;
  $('#dato').innerHTML = `<p class="be-caps dato-caps">Un dato, tal como sale en el sitio</p>
    <h3 class="dato-tit" id="dato-tit">${esc(ej.titulo)}</h3>
    <span class="dato-fecha">${esc(ej.fecha)}</span><span class="be-muted">${ej.pasajes.map(esc).join(' · ')}</span>
    <p class="dato-fuente"><span class="marca-nivel marca-nivel--1" role="img" aria-label="Fuente de la Biblia o de jw.org"></span><span>Fuente: <a href="${esc(ej.fuente.url)}" target="_blank" rel="noopener">${esc(ej.fuente.titulo)}</a></span></p>
    ${ej.secular ? `<p>Muchos historiadores la ponen en ${esc(ej.secular)}; el sitio sigue la cronología de la Biblia y enseña la otra fecha aparte, como nota con su fuente.</p>` : ''}
    <div class="dato-acciones"><button type="button" class="be-btn recorrido-ir" data-entrar="dato">Verlo en el mapa <span aria-hidden="true">→</span></button></div>`;
  const [a, m, d] = DATOS.generado.split('-').map(Number);
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  $('#pie-datos').textContent = `Datos del ${d} de ${MESES[m - 1]} de ${a}`;
}

// Cuando llegan los datos del sitio, las cifras y los nombres salen de ellos (data.js es su copia pequeña).
function alLlegarDatos(B) {
  const D = B.D;
  const c = DATOS.cifras;
  const nuevas = { sucesos: (D.eventos || []).length, lugares: Object.keys(D.lugares || {}).length, personas: Object.keys(D.personas || {}).length };
  if (nuevas.sucesos && (nuevas.sucesos !== c.sucesos || nuevas.lugares !== c.lugares || nuevas.personas !== c.personas)) { Object.assign(c, nuevas); pintarFuentes(); }
  if (norm($('#q').value).trim()) sugerir();
}

// ---------------------------------------------------------------------------
// La búsqueda que ya contesta (B1): el mismo buscador del sitio (BE.buscar), con la lista debajo de la caja.
// ---------------------------------------------------------------------------
const q = $('#q'), lista = $('#sugerencias');
let resultados = [], activo = -1, pendiente = false;
const TIPO = { persona: 'Persona', lugar: 'Lugar', evento: 'Suceso', periodo: 'Época', carta: 'Carta', viaje: 'Viaje', hallazgo: 'Hallazgo', recorrido: 'Recorrido', libro: 'Libro', pasaje: 'Capítulo', parada: 'Parada' };
const FORMA = { persona: 'persona', lugar: 'lugar', evento: 'evento', periodo: 'periodo' };
const MAX = 5;
function marcar(titulo) {
  const nq = norm(q.value).trim(), n = norm(titulo), i = nq ? n.indexOf(nq) : -1;
  return i < 0 ? esc(titulo) : `${esc(titulo.slice(0, i))}<mark>${esc(titulo.slice(i, i + nq.length))}</mark>${esc(titulo.slice(i + nq.length))}`;
}
function sugerir() {
  const t = q.value.trim();
  if (!t) { cerrarLista(); return; }
  if (!MISMO_ORIGEN) { pintarNota('Escribe y pulsa Intro: se abre el sitio con lo que buscas.'); return; }
  if (!datosListos) { pintarNota('Cargando los datos del atlas…'); if (!esperandoDatos.includes(sugerir)) esperandoDatos.push(sugerir); return; }
  resultados = win.BE.buscar(t);
  activo = resultados.length ? 0 : -1;
  pintarLista();
}
function pintarNota(texto) {
  resultados = []; activo = -1;
  lista.innerHTML = `<div class="sug sug--nota" role="option" aria-disabled="true" id="sug-nota">${esc(texto)}</div>`;
  abrirLista();
}
function pintarLista() {
  if (!resultados.length) {
    lista.innerHTML = `<div class="sug sug--nota" role="option" aria-disabled="true" id="sug-nota">No encontramos «${esc(q.value.trim())}». Prueba con una persona, un lugar, un capítulo («Hch 16») o un año («607 a.e.c.»).</div>`;
    abrirLista(); anunciar('Sin resultados'); return;
  }
  const vis = resultados.slice(0, MAX);
  lista.innerHTML = vis.map((r, i) => {
    const tipo = r.sel?.tipo;
    const meta = [r.sel && TIPO[tipo] && !r.accion ? TIPO[tipo] : r.grupo, r.meta].filter(Boolean).join(' · ');
    return `<div class="sug" role="option" id="sug-${i}" data-i="${i}" aria-selected="${i === activo}">
      <span class="forma forma--${FORMA[tipo] || 'otro'}" aria-hidden="true"></span>
      <span class="sug-texto"><span class="sug-tit">${marcar(r.titulo)}</span><span class="sug-meta">${esc(meta)}</span></span>
      ${r.fechaTexto && !norm(meta).includes(norm(r.fechaTexto)) ? `<span class="sug-fecha">${esc(r.fechaTexto)}</span>` : ''}</div>`;
  }).join('') + (resultados.length > MAX ? `<div class="sug sug--todo" role="option" id="sug-todo" data-i="todo" aria-selected="${activo === MAX}">Ver los ${resultados.length} resultados en el mapa</div>` : '');
  abrirLista();
  anunciar(`${resultados.length} ${resultados.length === 1 ? 'resultado' : 'resultados'}`);
}
function abrirLista() {
  lista.hidden = false; q.setAttribute('aria-expanded', 'true');
  q.setAttribute('aria-activedescendant', activo === MAX ? 'sug-todo' : activo >= 0 ? `sug-${activo}` : '');
}
function cerrarLista() { lista.hidden = true; lista.innerHTML = ''; q.setAttribute('aria-expanded', 'false'); q.removeAttribute('aria-activedescendant'); }
function mover(d) {
  const n = Math.min(resultados.length, MAX) + (resultados.length > MAX ? 1 : 0);
  if (!n) return;
  activo = (activo + d + n) % n;
  lista.querySelectorAll('[aria-selected]').forEach((o) => o.setAttribute('aria-selected', String(o.id === (activo === MAX ? 'sug-todo' : `sug-${activo}`))));
  q.setAttribute('aria-activedescendant', activo === MAX ? 'sug-todo' : `sug-${activo}`);
  lista.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}
function elegir(i) {
  const texto = q.value.trim();
  if (i === 'todo' || i === MAX) { entrar({ hash: INICIO, hacer: (B) => B.buscarTexto(texto) }, q); return; }
  const r = resultados[i];
  if (!r) return;
  entrar({ hash: r.sel ? hashDe({ sel: `${r.sel.tipo}:${r.sel.id}` }) : INICIO, hacer: (B) => { if (r.accion) r.accion(); else B.seleccionar(r.sel); B.cerrarResultados?.(); } }, q);
}
q.addEventListener('input', sugerir);
let sinSugerir = false;
q.addEventListener('focus', () => { if (!sinSugerir && q.value.trim()) sugerir(); });
q.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); if (lista.hidden) sugerir(); else mover(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); mover(-1); }
  else if (e.key === 'Escape' && !lista.hidden) { e.preventDefault(); e.stopPropagation(); cerrarLista(); }
});
q.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== q) cerrarLista(); }, 150));
lista.addEventListener('pointerdown', (e) => { const o = e.target.closest('[data-i]'); if (o) { e.preventDefault(); elegir(o.dataset.i === 'todo' ? 'todo' : +o.dataset.i); } });
$('#busca').addEventListener('submit', (e) => {
  e.preventDefault();
  const t = q.value.trim();
  if (!t) { q.focus(); return; }
  if (!MISMO_ORIGEN) { P.ir(urlSitio(INICIO)); return; }
  if (!datosListos) { pendiente = true; pintarNota('Cargando los datos del atlas…'); esperandoDatos.push(() => { if (pendiente) { pendiente = false; resultados = win.BE.buscar(t); if (resultados.length) elegir(0); else pintarLista(); } }); return; }
  if (lista.hidden || activo < 0) { resultados = win.BE.buscar(t); activo = resultados.length ? 0 : -1; }
  if (activo >= 0) elegir(activo); else pintarLista();
});

// ---------------------------------------------------------------------------
// Los clics de la portada
// ---------------------------------------------------------------------------
portada.addEventListener('click', (e) => {
  const t = e.target;
  const b = t.closest('button');
  if (!b) return;
  const ent = b.dataset.entrar;
  if (ent === 'explorar') { entrar({ hash: null }, b); return; }
  if (ent === 'linea') { entrar({ hash: INICIO, hacer: (B) => { B.E.vista = [B.T_MIN, B.T_MAX]; B.sucio.linea = true; B.programar(); } }, b); return; }
  if (ent === 'dato') { const ej = DATOS.ejemplo; entrar({ hash: hashDe({ t: ej.t, sel: ej.sel }) }, b); return; }
  if (b.dataset.ejemplo) { entrar({ hash: EJEMPLOS[+b.dataset.ejemplo].hash }, b); return; }
  if (b.dataset.pregunta) { entrar({ hash: PREGUNTAS[+b.dataset.pregunta].hash }, b); return; }
  if (b.dataset.epoca) {
    const ep = DATOS.eras.find((x) => x.id === b.dataset.epoca);
    // D1: la época se elige, la línea enseña su tramo y el mapa encuadra sus lugares (hoy acababan todas en el Egeo).
    entrar({ hash: hashDe({ t: ep.desde + 0.01, sel: `periodo:${ep.id}` }), hacer: (B) => {
      B.seleccionar({ tipo: 'periodo', id: ep.id }, { mover: false, encuadrar: false });
      B.verTramo(ep.desde, ep.hasta);
      if (ep.lugares.length) B.mapa.encuadrar(ep.lugares);
    } }, b);
    return;
  }
  if (b.dataset.recorrido) {
    const id = b.dataset.recorrido;
    if (b.dataset.desdeCero) escribir(CLAVE.paso + id, '0');
    // Sin borrar el paso guardado: el sitio retoma la parada donde se dejó.
    entrar({ hash: hashDe({ sel: `recorrido:${id}` }), hacer: (B) => B.seleccionar({ tipo: 'recorrido', id }) }, b);
    return;
  }
  const v = b.dataset.vuelve;
  if (v === 'vista') { const u = leerJSON(CLAVE.ultima, null); if (u?.hash) entrar({ hash: u.hash.replace(/^#/, '') }, b); return; }
  if (v === 'recorrido') { const id = b.dataset.id; entrar({ hash: hashDe({ sel: `recorrido:${id}` }), hacer: (B) => B.seleccionar({ tipo: 'recorrido', id }) }, b); return; }
  if (v === 'lectura') {
    const num = +b.dataset.num, cap = +b.dataset.cap;
    entrar({ hash: INICIO, hacer: (B) => { const lib = (B.LIBROS || []).find((l) => l.num === num); if (lib) B.lectura.abrir(B.idPasaje(lib, cap)); } }, b);
    return;
  }
  if (v === 'olvidar') { escribir(CLAVE.ultima, null); pintarVuelve(); $('#portada-titulo').focus(); anunciar('Última vista olvidada'); }
});
portada.addEventListener('pointerover', (e) => { const b = e.target.closest?.('[data-epoca]'); resaltarTramo(b?.dataset.epoca || null); });
portada.addEventListener('focusin', (e) => { const b = e.target.closest?.('[data-epoca]'); resaltarTramo(b?.dataset.epoca || null); });
portada.addEventListener('pointerleave', () => resaltarTramo(null));

// Escape, esté donde esté el foco en la portada: entra en el mapa; con texto en la caja, lo busca en vez de tirarlo.
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || raiz.classList.contains('dentro') || e.defaultPrevented) return;
  if ($('#proto').open) { $('#proto').open = false; $('#proto summary').focus(); return; }
  const t = q.value.trim();
  if (t) $('#busca').requestSubmit(); else entrar({ hash: null }, document.activeElement);
});

// ---------------------------------------------------------------------------
// Ajustes de lectura (M1): los mismos del sitio, con las mismas claves; valen también para el mapa de detrás.
// ---------------------------------------------------------------------------
function ajuste(boton, clase, pref) {
  const pintar = () => boton.setAttribute('aria-pressed', String(raiz.classList.contains(clase)));
  pintar();
  boton.addEventListener('click', () => {
    const on = !raiz.classList.contains(clase);
    raiz.classList.toggle(clase, on);
    escribir(CLAVE.pref + pref, on ? '1' : '0');
    pintar();
    const d = win?.document;
    if (d) {
      if (clase === 'be-reunion') { const rb = d.getElementById('reunion-boton'); if (d.documentElement.classList.contains(clase) !== on) rb ? rb.click() : d.documentElement.classList.toggle(clase, on); }
      else d.documentElement.classList.toggle(clase, on);
    }
    requestAnimationFrame(colocarEscala);
    anunciar(on ? 'Activado' : 'Desactivado');
  });
}
ajuste($('#ajuste-letra'), 'be-letra-grande', 'letra-grande');
ajuste($('#ajuste-reunion'), 'be-reunion', 'reunion');

// ---------------------------------------------------------------------------
// Arranque: la portada se pinta con data.js; el sitio empieza a cargar detrás cuando la portada ya está en pantalla.
// ---------------------------------------------------------------------------
pintarEjemplos();
P.ajustarAyuda(q, ['Persona, lugar, capítulo o año', 'Persona, lugar o año', 'Buscar']);   // la ayuda de la caja, la más larga que cabe entera
pintarPreguntas();
pintarVuelve();
pintarEpocas();
pintarRecorridos();
pintarFuentes();
window.__portada = { get marcoListo() { return datosListos && mapaListo; }, entrar, SITIO };
if (document.readyState === 'complete') cargarMarco(); else addEventListener('load', cargarMarco, { once: true });
})();
