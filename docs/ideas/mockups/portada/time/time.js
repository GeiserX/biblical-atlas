/* Portada «Entra por el tiempo»: la línea de seis fechas del banner hecha control. Moverla cambia el texto al instante
   y, al soltar, el mapa de detrás (el sitio de verdad, en un marco). «Entrar» quita la portada y deja el sitio en la
   fecha elegida. Sin dependencias ni compilación. */
'use strict';
(() => {
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtAnio = (y) => (y > 0 ? `${y} e.c.` : `${1 - y} a.e.c.`);
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('be-reunion');
const estrecha = () => matchMedia('(max-width: 760px)').matches;

// ---------------------------------------------------------------------------
// Dónde está el sitio: /site/ en local, el publicado fuera, o ?site=<dirección>
// ---------------------------------------------------------------------------
// (../assets/sitio.js: site/ al lado si se sirve la raíz del repositorio, el sitio publicado si no.)
const qs = new URLSearchParams(location.search);
const P = window.PORTADA_SITIO;
const BASE = P.base;
const urlSitio = (pagina, hash = '') => P.url(pagina, hash);
// Atrás devuelve la portada donde estaba: el navegador no la sube arriba (al entrar, la portada se oculta y la
// posición que guardaba la entrada del historial era 0).
history.scrollRestoration = 'manual';

// ---------------------------------------------------------------------------
// Datos: la copia de data.js al instante; los del sitio en cuanto el marco los ha cargado
// ---------------------------------------------------------------------------
let M = window.TIME_DATA;
const CLAVE_ULTIMA = 'biblical-earth:ultima', CLAVE_PASO = 'biblical-earth:recorrido:', CLAVE_ESCALA = 'biblical-earth:portada:escala';
const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const escribir = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };
function ultima() {
  try {
    const u = JSON.parse(leer(CLAVE_ULTIMA) || 'null');
    if (!u?.hash) return null;
    const t = parseFloat(new URLSearchParams(u.hash.replace(/^#/, '')).get('t'));
    return Number.isFinite(t) ? { ...u, t } : null;
  } catch { return null; }
}
const pasoGuardado = (id) => Math.max(0, +(leer(CLAVE_PASO + id) || 0) || 0);

// Las seis fechas del banner.
const SEIS = [
  { y: -4025, largo: '4026 a.e.c.', corto: '4026' },
  { y: -2369, largo: '2370', corto: '2370' },
  { y: -1512, largo: '1513', corto: '1513' },
  { y: -606, largo: '607 a.e.c.', corto: '607' },
  { y: 33, largo: '33 e.c.', corto: '33 e.c.' },
  { y: 100, largo: '100 e.c.', corto: '100 e.c.' },
];

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------
const S = {
  y: 50,                 // año del cursor (años del sitio: 0 es 1 a.e.c.)
  escala: leer(CLAVE_ESCALA) || (estrecha() ? 'iguales' : 'real'),
  destino: null,         // lo que abre «Entrar» si no es solo la fecha: pregunta, recorrido, seguir
  armado: null,          // clave del elemento pulsado una vez («pulsa otra vez para entrar»)
  banda: null,           // tramo marcado en la línea (un recorrido)
  entrado: false,
};
const u0 = ultima();
if (u0) S.y = clamp(Math.floor(u0.t), M.T_MIN, M.T_MAX);

// ---------------------------------------------------------------------------
// Escalas: a escala real, o nueve épocas a partes iguales
// ---------------------------------------------------------------------------
const inicios = () => M.eras.map((e) => e.desde);
function eraDe(y) {
  let i = 0;
  M.eras.forEach((e, k) => { if (e.desde <= y) i = k; });
  return i;
}
function aX(y) {
  if (S.escala === 'real') return (y - M.T_MIN) / (M.T_MAX - M.T_MIN);
  const s = inicios(), i = eraDe(y), a = s[i], b = s[i + 1] ?? M.T_MAX;
  return (i + (b > a ? (y - a) / (b - a) : 0)) / s.length;
}
function deX(f) {
  f = clamp(f, 0, 1);
  if (S.escala === 'real') return Math.round(M.T_MIN + f * (M.T_MAX - M.T_MIN));
  const s = inicios(), n = s.length, i = Math.min(n - 1, Math.floor(f * n)), a = s[i], b = s[i + 1] ?? M.T_MAX;
  return Math.round(a + (f * n - i) * (b - a));
}
const realX = (y) => (y - M.T_MIN) / (M.T_MAX - M.T_MIN);
const finEra = (i) => M.eras[i + 1]?.desde ?? M.T_MAX;

// ---------------------------------------------------------------------------
// Qué pasa en un año: un suceso, la época, la potencia y quién vivía
// ---------------------------------------------------------------------------
function potenciaDe(y) {
  const t = y + 0.5;
  const ps = M.potencias.filter((p) => {
    const a = p.desde ?? p.consta ?? -Infinity, b = p.hasta != null ? p.hasta + 1 : Infinity;
    return t >= a && t < b && (p.desde != null || p.consta != null);
  });
  return ps.sort((a, b) => (b.desde ?? b.consta) - (a.desde ?? a.consta))[0] || null;
}
function momento(y) {
  const t = Math.min(y + 0.5, M.T_MAX + 0.5);
  const i = eraDe(y), era = M.eras[i];
  const ahora = M.eventos.filter((e) => e[0] <= t && t < e[1] && e[1] - e[0] <= 12)
    .sort((a, b) => b[7] - a[7] || (a[1] - a[0]) - (b[1] - b[0]) || a[4] - b[4]);
  const ancla = M.anclas?.[y] && ahora.find((e) => e[2] === M.anclas[y]);
  let ev = ancla || ahora[0] || null, cerca = null;
  if (!ev) {
    let mejor = null, d = Infinity;
    for (const e of M.eventos) {
      if (e[1] <= era.desde || e[0] >= finEra(i) + 1) continue;
      const dd = t < e[0] ? e[0] - t : t - e[1];
      if (dd < d || (dd === d && e[7] > mejor[7])) { d = dd; mejor = e; }
    }
    if (mejor && d <= 80) cerca = mejor;
  }
  const exacto = SEIS.some((x) => x.y === y) || (ev && !ev[5] && ev[4] <= 3 && ev[1] - ev[0] <= 1);
  // «Juan, el apóstol» pasa a «Juan (el apóstol)», como en el sitio, para que la coma no parta la lista.
  const viven = M.personas.filter((p) => p[0] <= t && t < p[1]).slice(0, 4).map((p) => p[2].replace(/^([^,]+), (.+)$/, '$1 ($2)'));
  return { y, i, era, ev, cerca, exacto, viven, potencia: potenciaDe(y) };
}
const textoAnio = (m) => `${m.exacto ? '' : 'c. '}${fmtAnio(m.y)}`;
function fraseTexto(m) {
  if (m.ev) return `${m.ev[2]}${m.ev[3] && !m.ev[2].includes(m.ev[3]) ? ` · ${m.ev[3]}` : ''}.`;
  if (m.cerca) return `Lo más cercano, ${m.cerca[6]}: ${m.cerca[2]}.`;
  return m.era.frase;
}

// ---------------------------------------------------------------------------
// Pintar la primera pantalla y la barra
// ---------------------------------------------------------------------------
const el = {
  anio: $('#momento-anio'), epoca: $('#momento-epoca'), frase: $('#momento-frase'), viven: $('#momento-viven'),
  cursor: $('#linea-cursor'), bandera: $('#cursor-bandera'), refCursor: $('#ref-cursor'), pista: $('#pista'),
  fechas: $('#fechas'), marcas: $('#marcas'), banda: $('#banda'), guardada: $('#guardada'), linea: $('#linea'),
  entrar: $('#entrar'), entrarTexto: $('#entrar-texto'), entrarNota: $('#entrar-nota'), anuncio: $('#anuncio'),
};
let mActual = null;
function pintarMomento() {
  const m = mActual = momento(S.y);
  el.anio.textContent = textoAnio(m);
  el.epoca.innerHTML = `Época ${m.i + 1} de ${M.eras.length} · <b>${esc(m.era.nombre)}</b>${m.potencia ? ` · ${esc(estrecha() ? m.potencia.corto : m.potencia.nombre)}` : ''}`;
  el.frase.innerHTML = m.ev ? `${esc(fraseTexto(m))}` : esc(fraseTexto(m));
  el.viven.innerHTML = m.viven.length ? `<b>Viven</b>${esc(m.viven.join(', '))}` : '';
  const f = aX(S.y);
  el.cursor.style.left = `${f * 100}%`;
  el.cursor.classList.toggle('bandera-izq', f > 0.86);
  el.bandera.textContent = fmtAnio(S.y);
  el.refCursor.style.left = `${realX(S.y) * 100}%`;
  el.cursor.setAttribute('aria-valuenow', String(S.y));
  el.cursor.setAttribute('aria-valuetext', `${textoAnio(m)}, época ${m.i + 1}: ${m.era.nombre}`);
  el.fechas.querySelectorAll('.fecha').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.y === S.y && !S.destino)));
  document.querySelectorAll('.epoca').forEach((b) => b.classList.toggle('es-ahora', +b.dataset.i === m.i));
  pintarBoton();
}
function pintarBoton() {
  const d = S.destino, m = mActual;
  if (d?.tipo === 'seguir') { el.entrarTexto.textContent = 'Seguir donde lo dejé'; el.entrarNota.textContent = d.texto; }
  else if (d?.tipo === 'recorrido') { el.entrarTexto.textContent = d.paso > 1 ? `Seguir en la parada ${d.paso}` : 'Empezar el recorrido'; el.entrarNota.textContent = d.titulo; }
  else if (d?.tipo === 'pregunta') { el.entrarTexto.textContent = `Entrar en ${textoAnio(m)}`; el.entrarNota.textContent = d.ver; }
  else { el.entrarTexto.textContent = `Entrar en ${fmtAnio(S.y)}`; el.entrarNota.textContent = m && !estrecha() ? `${m.era.nombre}` : ''; }
}

/** Marcas, fechas con sus botones de 44 px y la línea de referencia a escala real. */
function pintarLinea() {
  const iguales = S.escala === 'iguales';
  document.querySelectorAll('.escala__op').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.escala === S.escala)));
  $('#escala-corta').setAttribute('aria-pressed', String(S.escala === 'real'));
  $('#linea-ref').hidden = !iguales;
  const mayores = new Set(SEIS.map((x) => x.y));
  el.marcas.innerHTML = [...M.eras.map((e) => e.desde), M.T_MAX].map((y) => `<span class="tick${mayores.has(y) ? '' : ' tick--menor'}" style="left:${aX(y) * 100}%"></span>`).join('');
  $('#linea-ref').querySelectorAll('.linea__ref-tick').forEach((x) => x.remove());
  $('#linea-ref').insertAdjacentHTML('beforeend', SEIS.map((x) => `<span class="linea__ref-tick" style="left:${realX(x.y) * 100}%"></span>`).join(''));
  // Botones de fecha: en la fila de abajo; si chocan, en una segunda fila con una guía hasta su marca. El último,
  // 100 e.c., va a la derecha del final de la raya, como el final de un eje, y así nunca choca con 33 e.c.
  const W = el.pista.clientWidth || 1;
  const corto = W < 560;
  el.fechas.innerHTML = SEIS.map((x) => {
    const m = momento(x.y);
    return `<button type="button" class="fecha" data-y="${x.y}" aria-pressed="false" aria-label="${esc(`${fmtAnio(x.y)}: ${fraseTexto(m).replace(/\.$/, '')}`)}">${esc(corto ? x.corto : x.largo)}<span class="guia-fecha" aria-hidden="true"></span></button>`;
  }).join('');
  const filas = { bajo: -Infinity, fila2: -Infinity };
  let conFila2 = false;
  el.fechas.querySelectorAll('.fecha').forEach((b) => {
    const y = +b.dataset.y;
    if (y === M.T_MAX) { b.classList.add('fecha--fin'); b.style.left = `${W}px`; return; }
    const w = Math.max(44, b.offsetWidth);
    let cx = clamp(aX(y) * W, w / 2 - 24, W - w / 2);
    // Un choque de pocos píxeles se arregla corriendo el botón; uno mayor lo baja a la segunda fila.
    const choque = filas.bajo + 2 - (cx - w / 2);
    if (choque > 0 && choque <= 12) cx += choque;
    const izq = cx - w / 2;
    const fila = ['bajo', 'fila2'].find((f) => izq >= filas[f] + 2) || 'fila2';
    if (fila === 'fila2') cx = clamp(aX(y) * W, w / 2 - 24, W - w / 2);
    filas[fila] = cx + w / 2;
    if (fila === 'fila2') conFila2 = true;
    b.classList.toggle('fecha--fila2', fila === 'fila2');
    b.style.left = `${cx}px`;
  });
  el.linea.classList.toggle('con-fila2', conFila2);
  pintarBanda();
  const u = ultima();
  el.guardada.hidden = !u || Math.floor(u.t) === S.y;
  if (u) el.guardada.style.left = `${aX(Math.floor(u.t)) * 100}%`;
  pintarMomento();
}
function pintarBanda() {
  const b = S.banda;
  el.banda.hidden = !b;
  if (!b) return;
  const a = aX(Math.floor(b[0])), z = aX(Math.floor(b[1]));
  el.banda.style.left = `calc(${a * 100}% - 3px)`;
  el.banda.style.width = `calc(${(z - a) * 100}% + 6px)`;
}

// ---------------------------------------------------------------------------
// Mover el cursor: el texto cambia al instante, el mapa al soltar
// ---------------------------------------------------------------------------
let mapaTimer = 0;
function ponerAnio(y, { mapa = true, soltar = false, limpiar = true } = {}) {
  y = clamp(Math.round(y), M.T_MIN, M.T_MAX);
  if (limpiar) { S.destino = null; S.banda = null; desarmar(); pintarBanda(); }
  S.y = y;
  pintarMomento();
  el.guardada.hidden = el.guardada.hidden || Math.floor(ultima()?.t ?? NaN) === y;
  if (mapa) { clearTimeout(mapaTimer); mapaTimer = setTimeout(pintarMapa, soltar ? 0 : 450); }
}
function desarmar() {
  S.armado = null;
  document.querySelectorAll('.armado').forEach((x) => x.classList.remove('armado'));
}
function armar(clave, nodo, texto) {
  desarmar();
  S.armado = clave;
  nodo?.classList.add('armado');
  anunciar(`${texto} El cursor está en ${textoAnio(mActual)}. Pulsa otra vez, o «Entrar», para verlo en el mapa.`);
}
let anuncioTimer = 0;
function anunciar(t, ms = 0) {
  clearTimeout(anuncioTimer);
  anuncioTimer = setTimeout(() => { el.anuncio.textContent = ''; requestAnimationFrame(() => { el.anuncio.textContent = t; }); }, ms);
}

function iniciarCursor() {
  let arrastre = null;
  const yDe = (e) => { const r = el.pista.getBoundingClientRect(); return deX((e.clientX - r.left) / r.width); };
  el.pista.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('.fecha')) return;
    arrastre = { id: e.pointerId, x: e.clientX, y: e.clientY, movido: false, sobreCursor: !!e.target.closest('.cursor') };
    // Con el dedo, un toque en la raya salta a esa fecha; un gesto vertical sigue desplazando la página, también si
    // empieza sobre el cursor (que no se mueve hasta que el gesto es de lado).
    if (e.pointerType === 'mouse') { try { el.pista.setPointerCapture(e.pointerId); } catch { /* sintético */ } }
    if (e.pointerType === 'mouse') ponerAnio(yDe(e), { mapa: false });
    el.cursor.focus({ preventScroll: true });
  });
  el.pista.addEventListener('pointermove', (e) => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    if (!arrastre.movido && Math.hypot(e.clientX - arrastre.x, e.clientY - arrastre.y) < 3) return;
    if (!arrastre.movido && e.pointerType !== 'mouse' && Math.abs(e.clientY - arrastre.y) > Math.abs(e.clientX - arrastre.x)) { arrastre = null; return; }
    if (!arrastre.movido && e.pointerType !== 'mouse') { try { el.pista.setPointerCapture(e.pointerId); } catch { /* sintético */ } }
    arrastre.movido = true;
    el.pista.classList.add('arrastrando');
    ponerAnio(yDe(e), { mapa: false });
  });
  const soltar = (e) => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    if (!arrastre.movido && e.type === 'pointerup' && e.pointerType !== 'mouse' && !arrastre.sobreCursor) ponerAnio(yDe(e), { mapa: false });
    arrastre = null;
    el.pista.classList.remove('arrastrando');
    if (e.type === 'pointerup') ponerAnio(S.y, { soltar: true, limpiar: false });
  };
  el.pista.addEventListener('pointerup', soltar);
  el.pista.addEventListener('pointercancel', soltar);
  // Teclado: flechas un año (con Mayúsculas, diez), Re Pág y Av Pág una época, Inicio y Fin los extremos.
  el.cursor.addEventListener('keydown', (e) => {
    const i = eraDe(S.y);
    let y = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') y = S.y + (e.shiftKey ? 10 : 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') y = S.y - (e.shiftKey ? 10 : 1);
    else if (e.key === 'PageUp') y = finEra(i);
    else if (e.key === 'PageDown') y = S.y > M.eras[i].desde ? M.eras[i].desde : (M.eras[i - 1]?.desde ?? M.T_MIN);
    else if (e.key === 'Home') y = M.T_MIN;
    else if (e.key === 'End') y = M.T_MAX;
    else if (e.key === 'Enter') { e.preventDefault(); entrar(); return; }
    if (y == null) return;
    e.preventDefault();
    ponerAnio(y);
    anunciar(fraseTexto(mActual), 900);
  });
  el.fechas.addEventListener('click', (e) => {
    const b = e.target.closest('.fecha');
    if (!b) return;
    const y = +b.dataset.y;
    if (y === S.y && !S.destino) { entrar(); return; }
    ponerAnio(y, { soltar: true });
    anunciar(`${textoAnio(mActual)}. ${fraseTexto(mActual)} Pulsa otra vez para entrar.`);
  });
  const ponerEscala = (e) => { S.escala = e; escribir(CLAVE_ESCALA, S.escala); pintarLinea(); pintarRegla(); pintarRecorridos(); };
  document.querySelectorAll('.escala__op').forEach((b) => b.addEventListener('click', () => ponerEscala(b.dataset.escala)));
  // En el teléfono, un solo botón que se queda pulsado: «A escala real» sí o no.
  $('#escala-corta').addEventListener('click', () => ponerEscala(S.escala === 'real' ? 'iguales' : 'real'));
}

// ---------------------------------------------------------------------------
// Las zonas de abajo: preguntas, épocas, potencias, recorridos, fuentes
// ---------------------------------------------------------------------------
function pintarZonas() {
  $('#preguntas').innerHTML = M.preguntas.map((q, i) => `<li><button type="button" class="pregunta" data-pregunta="${i}">
    <span class="pastilla">${esc(fmtAnio(Math.floor(q.t)))}</span><span class="pregunta__texto">${esc(q.texto)}</span>
    <span class="pregunta__ver">Se abre en ${esc(q.ver)}</span><span class="armado__nota">Pulsa otra vez para entrar</span></button></li>`).join('');
  $('#epocas').innerHTML = M.eras.map((e, i) => `<li><button type="button" class="epoca${e.sinLibro ? ' epoca--sin' : ''}" data-i="${i}">
    <span class="epoca__num" aria-hidden="true">${i + 1}</span><span class="epoca__nombre"><span class="sr-only">Época ${i + 1}: </span>${esc(e.nombre)}</span>
    <span class="epoca__fecha">${esc(e.texto)}</span>
    <span class="epoca__libros">${e.sinLibro ? esc(e.libros) : `<b>Lo cuentan:</b> ${esc(e.libros)}`}</span>
    <span class="armado__nota">Pulsa otra vez para entrar</span></button></li>`).join('');
  $('#potencias-lista').textContent = `Las seis potencias mundiales: ${M.potencias.map((p) => `${p.corto} (${p.texto})`).join(', ')}.`;
  const c = M.cuentas, n = (x) => x.toLocaleString('es-ES');
  $('#cuentas').textContent = `${n(c.eventos)} sucesos, ${n(c.lugares)} lugares y ${n(c.personas)} personas, con ${n(c.fuentes)} fuentes citadas. De los ${c.libros} libros de la Biblia, ${c.revisados} tienen ya la cobertura revisada.`;
  const [a, mes, dia] = M.generado.split('-').map(Number);
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  $('#pie-datos').textContent = a ? `Datos del ${dia} de ${MESES[mes - 1]} de ${a}` : '';
  pintarRegla();
  pintarRecorridos();
}
function pintarRegla() {
  $('#regla').innerHTML = M.eras.map((e, i) => {
    const a = aX(e.desde), b = aX(finEra(i));
    return `<span class="regla__tramo${e.sinLibro ? ' regla__tramo--sin' : ''}" style="left:${a * 100}%;width:${(b - a) * 100}%">${(b - a) * ($('#regla').clientWidth || 800) > 18 ? `<span>${i + 1}</span>` : ''}</span>`;
  }).join('');
  // Las potencias en pizarra, con su nombre escrito. Entre Egipto y Asiria el cambio no tiene fecha: tramo rayado.
  const ps = M.potencias, w = $('#potencias').clientWidth || 800;
  const trozos = [];
  ps.forEach((p, k) => {
    const sig = ps[k + 1];
    const a = p.desde ?? p.consta, b = p.hasta != null ? p.hasta + 1 : (sig ? (sig.desde ?? sig.consta) : M.T_MAX);
    if (a == null) return;
    const incierto = p.hasta == null && sig && sig.desde == null;
    trozos.push({ a, b: Math.min(b, M.T_MAX), nombre: incierto ? `${p.corto} · ${sig.corto}` : p.corto, incierto });
  });
  $('#potencias').innerHTML = trozos.map((t) => {
    const x = aX(t.a), z = aX(t.b), ancho = (z - x) * w;
    return `<span class="potencia${t.incierto ? ' potencia--incierta' : ''}" style="left:${x * 100}%;width:${(z - x) * 100}%" title="${esc(t.nombre)}">${ancho > 40 ? `<span>${esc(t.nombre)}</span>` : ''}</span>`;
  }).join('');
}
function pintarRecorridos() {
  $('#recorridos').innerHTML = M.recorridos.map((r) => {
    const paso = pasoGuardado(r.id);
    const fechas = Math.floor(r.a) === Math.floor(r.b) ? fmtAnio(Math.floor(r.a)) : `${fmtAnio(Math.floor(r.a)).replace(/ (a\.)?e\.c\.$/, (x) => (Math.floor(r.a) > 0 === Math.floor(r.b) > 0 ? '' : x))} a ${fmtAnio(Math.floor(r.b))}`;
    const a = aX(Math.floor(r.a)), z = aX(Math.floor(r.b));
    return `<li><button type="button" class="recorrido" data-recorrido="${esc(r.id)}">
      <span class="recorrido__meta">${r.n} paradas · ${esc(fechas)}</span>
      <span class="recorrido__tit">${esc(r.titulo)}</span>
      ${r.resumen ? `<span class="recorrido__res">${esc(r.resumen)}</span>` : ''}
      ${paso > 0 ? `<span class="recorrido__paso">Vas por la parada ${paso + 1} de ${r.n}</span>` : ''}
      <span class="armado__nota">Pulsa otra vez para ${paso > 0 ? 'seguir' : 'empezar'}</span>
      <span class="mini" aria-hidden="true"><span class="mini__eje"></span><span class="mini__tramo" style="left:${a * 100}%;width:${(z - a) * 100}%"></span></span>
    </button></li>`;
  }).join('');
}
function iniciarZonas() {
  $('#hoja').addEventListener('click', (e) => {
    const q = e.target.closest('[data-pregunta]');
    if (q) {
      const p = M.preguntas[+q.dataset.pregunta], clave = `p:${q.dataset.pregunta}`;
      if (S.armado === clave) { entrar(); return; }
      ponerAnio(Math.floor(p.t), { soltar: true });
      S.destino = { tipo: 'pregunta', t: p.t, sel: p.sel, extra: p.extra, ver: p.ver };
      pintarMomento();
      armar(clave, q, p.texto);
      vistaPrevia(p.sel);
      return;
    }
    const ep = e.target.closest('.epoca');
    if (ep) {
      const i = +ep.dataset.i, clave = `e:${i}`;
      if (S.armado === clave) { entrar(); return; }
      ponerAnio(M.eras[i].desde, { soltar: true });
      S.destino = { tipo: 'epoca', i };
      pintarMomento();
      armar(clave, ep, `Época ${i + 1}: ${M.eras[i].nombre}.`);
      return;
    }
    const rc = e.target.closest('[data-recorrido]');
    if (rc) {
      const r = M.recorridos.find((x) => x.id === rc.dataset.recorrido), clave = `r:${r.id}`;
      if (S.armado === clave) { entrar(); return; }
      const paso = Math.min(pasoGuardado(r.id), r.n - 1);
      ponerAnio(Math.floor(r.ts[paso]), { soltar: true });
      S.destino = { tipo: 'recorrido', id: r.id, paso: paso + 1, t: r.ts[paso], titulo: r.titulo };
      S.banda = [r.a, r.b]; pintarBanda(); pintarMomento();
      armar(clave, rc, `${r.titulo}: ${r.n} paradas.`);
      return;
    }
    if (e.target.closest('#linea-completa')) entrar({ vista: 'completa' });
  });
  // Un recorrido marca su tramo en la línea mientras se señala.
  const marcar = (e) => {
    const rc = e.target.closest?.('[data-recorrido]');
    if (!rc) return;
    const r = M.recorridos.find((x) => x.id === rc.dataset.recorrido);
    S.banda = [r.a, r.b]; pintarBanda();
  };
  const desmarcar = (e) => {
    if (!e.target.closest?.('[data-recorrido]')) return;
    S.banda = S.destino?.tipo === 'recorrido' ? (() => { const r = M.recorridos.find((x) => x.id === S.destino.id); return [r.a, r.b]; })() : null;
    pintarBanda();
  };
  $('#recorridos').addEventListener('pointerover', marcar);
  $('#recorridos').addEventListener('focusin', marcar);
  $('#recorridos').addEventListener('pointerout', desmarcar);
  $('#recorridos').addEventListener('focusout', desmarcar);
}

// ---------------------------------------------------------------------------
// «Seguir donde lo dejé»: una fecha más en la línea y una línea arriba
// ---------------------------------------------------------------------------
function pintarSeguir() {
  const u = ultima();
  $('#seguir').hidden = !u;
  if (!u) return;
  $('#seguir-que').textContent = u.texto || fmtAnio(Math.floor(u.t));
}
$('#seguir-boton').addEventListener('click', () => {
  const u = ultima();
  if (!u) return;
  S.destino = { tipo: 'seguir', hash: u.hash.replace(/^#/, ''), texto: u.texto || '' };
  ponerAnio(Math.floor(u.t), { mapa: false, limpiar: false });
  entrar();
});

// ---------------------------------------------------------------------------
// El sitio de detrás
// ---------------------------------------------------------------------------
const marco = $('#sitio');
const F = { mismo: false, w: null, BE: null, map: null, listo: false, pendiente: null };
const vEra = (y) => { const i = eraDe(y); return clamp(Math.round((finEra(i) - M.eras[i].desde) * 1.1), 12, M.T_MAX - M.T_MIN); };
const tDe = (y) => Math.min(y + 0.5, M.T_MAX);
// Detrás de la portada, sin las zonas inciertas rayadas ni lo pendiente: en 1514 a.e.c. eran diez rayados bajo el texto.
// Al entrar, la dirección del destino no lleva «ocultas» y todo vuelve a verse.
function hashVista(y) { return `t=${tDe(y).toFixed(4)}&v=${vEra(y)}&mapa=antiguo&ocultas=inciertos,pendientes`; }
function hashDestino(opc = {}) {
  const d = S.destino;
  if (d?.tipo === 'seguir') return d.hash;
  const p = new URLSearchParams();
  const t = d?.t ?? tDe(S.y);
  p.set('t', t.toFixed(4));
  p.set('v', String(opc.vista === 'completa' ? M.T_MAX - M.T_MIN : vEra(S.y)));
  if (d?.sel) p.set('sel', d.sel);
  // Una fecha exacta (las seis del banner) entra con su suceso elegido, el que la portada acaba de nombrar.
  else if (!d && mActual?.ev && mActual.exacto && F.BE?.D) {
    const e = F.BE.D.eventos.find((x) => x.titulo === mActual.ev[2]);
    if (e) p.set('sel', `evento:${e.id}`);
  }
  if (d?.tipo === 'recorrido') { p.set('sel', `recorrido:${d.id}`); p.set('paso', String(d.paso)); }
  p.set('mapa', 'antiguo');
  for (const [k, v] of Object.entries(d?.extra || {})) p.set(k, v);
  return p.toString().replace(/%3A/g, ':').replace(/%2C/g, ',');
}
/** Encuadra una época donde ocurrió: los lugares de sus sucesos (cuantos más sucesos, más pesan), sin el 10 % de los
    extremos. No depende del encuadre que el sitio haga o no según su estado: tras volver de otra entrada, las nueve
    épocas acababan en el mismo encuadre ancho. */
function encuadrarEra(i) {
  const D = F.BE?.D, map = F.map;
  if (!D || !map) return;
  const a = M.eras[i].desde, b = finEra(i);
  const pts = [];
  for (const e of D.eventos || []) {
    const f = e.fecha;
    if (!f || f.desde == null || f.desde > b || (f.hasta ?? f.desde) < a) continue;
    for (const id of e.lugares || []) { const l = D.lugares[id]; if (l && l.lat != null && l.lon != null && l.precision !== 'incierto') pts.push([l.lon, l.lat]); }
  }
  if (pts.length < 2) return;
  const q = (xs, k) => xs[Math.min(xs.length - 1, Math.max(0, Math.round(k * (xs.length - 1))))];
  const lons = pts.map((p) => p[0]).sort((x, y) => x - y), lats = pts.map((p) => p[1]).sort((x, y) => x - y);
  map.stop();
  map.fitBounds([[q(lons, 0.1), q(lats, 0.1)], [q(lons, 0.9), q(lats, 0.9)]], { padding: 40, maxZoom: 6.5, duration: reducido() ? 0 : 600 });
}
/** Lleva el marco a una dirección sin crear entradas en el historial. */
function irMarco(hash) {
  const url = urlSitio('index.html', hash);
  try { marco.contentWindow.location.replace(url); } catch { marco.src = url; }
}
function pintarMapa() {
  if (S.entrado) return;
  irMarco(hashVista(S.y));
}
/** Encuadra un lugar detrás sin elegirlo (así no se crea historial en el sitio). Solo con el sitio en el mismo origen. */
function vistaPrevia(sel) {
  if (!F.listo || !sel?.startsWith('lugar:')) return;
  setTimeout(() => { try { F.BE.mapa.encuadrar([sel.slice(6)]); } catch { /* el sitio cambió */ } }, 700);
}

// Lo que se oculta del sitio mientras la portada está puesta: solo queda el mapa con sus nombres.
const CSS_BAJO = `html.bajo-portada #mapa { position: fixed !important; inset: 0 !important; z-index: 60 !important; }
html.bajo-portada #leyenda, html.bajo-portada #mientras, html.bajo-portada #situacion, html.bajo-portada #aviso,
html.bajo-portada .maplibregl-control-container, html.bajo-portada #panel, html.bajo-portada #vista-portada { display: none !important; }`;
function rellenoPortada() {
  const W = innerWidth, H = innerHeight;
  if (estrecha()) {
    const texto = $('.heroe__texto').getBoundingClientRect().top + scrollY;
    return { top: 64, left: 24, right: 24, bottom: Math.max(0, Math.round(H - texto + 8)) };
  }
  const col = $('.heroe__texto').getBoundingClientRect().right;
  const barra = $('#barra').offsetHeight;
  return { top: 80, left: Math.round(col + 40), right: 40, bottom: barra + 40 };
}
function prepararMarco() {
  try { F.w = marco.contentWindow; void F.w.document.body; F.mismo = true; } catch { F.mismo = false; }
  if (!F.mismo) { $('#fondo').classList.add('sitio-listo'); return; }   // sitio de otro origen: se enseña tal cual
  const d = F.w.document;
  if (!d.getElementById('bajo-portada-css')) {
    const s = d.createElement('style'); s.id = 'bajo-portada-css'; s.textContent = CSS_BAJO; d.head.appendChild(s);
  }
  d.documentElement.classList.toggle('bajo-portada', !S.entrado);
  d.documentElement.classList.toggle('be-reunion', document.documentElement.classList.contains('be-reunion'));
  // El logo del sitio vuelve a esta portada, no a la del sitio.
  d.addEventListener('click', (e) => {
    if (!S.entrado || !e.target.closest('#inicio')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    volver({ desdeLogo: true });
  }, true);
  const esperar = () => {
    const be = F.w.__be;
    if (!be?.map || !be.map.loaded()) { setTimeout(esperar, 150); return; }
    F.BE = be.BE; F.map = be.map;
    if (!S.entrado) F.map.setPadding(rellenoPortada());
    F.map.once('idle', () => {
      F.listo = true;
      $('#fondo').classList.add('sitio-listo');
      try { F.BE.seguirPablo(); } catch { /* sin función */ }
      // Los datos de verdad: los del sitio, que acaba de cargar data.json.
      try { M = window.TimeData.compact(be.D); pintarZonas(); pintarLinea(); } catch (err) { console.warn('Datos del sitio no leídos', err); }
      if (F.pendiente) { const f = F.pendiente; F.pendiente = null; f(); }
    });
    F.map.triggerRepaint();
  };
  esperar();
}
marco.addEventListener('load', prepararMarco);

// La imagen primero: el relieve de la época del cursor hasta que el mapa vivo está listo (captura de assets/).
function ponerImagen() {
  const i = eraDe(S.y);
  const nombre = i >= 8 ? 'paul-journeys' : i === 7 ? 'galilee-judea' : 'bible-lands';
  const img = $('#fondo-img');
  img.src = `../assets/img/${nombre}-${estrecha() ? 'tall' : (devicePixelRatio > 1.2 ? 'wide' : 'wide-1280')}.webp`;
}

// ---------------------------------------------------------------------------
// Entrar: la línea baja a su sitio y la portada se va; Atrás la vuelve a poner
// ---------------------------------------------------------------------------
let scrollAntes = 0;
let origenFoco = null, esperando = false;
async function entrar(opc = {}) {
  if (S.entrado || esperando) return;
  // El control por el que se entra (una pregunta, una época, un recorrido, el botón): al volver, el foco va a él.
  // Se guarda por sus atributos: al volver, la línea y los recorridos se pintan de nuevo y el nodo ya no es el mismo.
  const a = document.activeElement;
  if (a && a !== document.body) origenFoco = a.id ? `#${a.id}` : Object.keys(a.dataset || {}).length
    ? a.tagName.toLowerCase() + Object.entries(a.dataset).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}="${CSS.escape(v)}"]`).join('') : null;
  // Si el sitio de detrás aún no está (o no puede cargar), «Abriendo el mapa…»; si no llega, la portada se queda y
  // lo dice, en vez de entrar en un marco sin mapa.
  if (P.estado !== 'listo') {
    esperando = true;
    const ok = await P.esperar();
    esperando = false;
    if (!ok || S.entrado) return;
  }
  const hash = hashDestino(opc);
  const era = S.destino?.tipo === 'epoca' ? S.destino.i : null;
  const accion = opc.accion || (era != null ? () => setTimeout(() => encuadrarEra(era), 350) : null);
  S.entrado = true;
  scrollAntes = scrollY;
  const raiz = document.documentElement;
  if (!F.mismo) {
    irMarco(hash);
    raiz.classList.add('entrado');
    marco.inert = false; marco.tabIndex = 0; marco.focus();
    history.pushState({ entrado: 1 }, '', '#mapa');
    return;
  }
  const d = F.w.document;
  // 1. El sitio recupera su forma: sin relleno de portada y con su barra, su ficha y su línea.
  try { F.map?.setPadding({ top: 0, left: 0, right: 0, bottom: 0 }); } catch { /* aún sin mapa */ }
  d.documentElement.classList.remove('bajo-portada');
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  // 2. La dirección elegida.
  const antes = F.w.location.hash;
  irMarco(hash);
  setTimeout(() => {
    try {
      if (F.w.location.hash === antes && !S.destino) F.BE.seguirPablo();
      if (accion) { if (F.listo) accion(); else F.pendiente = accion; }
    } catch { /* el sitio cambió */ }
  }, 60);
  // 3. La línea viaja hasta la del sitio (o solo se funde).
  const destino = d.getElementById('pista')?.getBoundingClientRect();
  const origen = el.pista.getBoundingClientRect();
  raiz.classList.add('saliendo');
  const viaja = !reducido() && destino && destino.height > 20 && destino.width > 100 && destino.top < innerHeight;
  let dur = 220;
  if (viaja) {
    dur = 480;
    const dx = destino.left - origen.left, dy = (destino.top + 18) - origen.top, sx = destino.width / origen.width;
    el.pista.style.transformOrigin = '0 0';
    el.pista.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scaleX(${sx})`, opacity: 1, offset: 0.8 }, { transform: `translate(${dx}px, ${dy}px) scaleX(${sx})`, opacity: 0 }],
      { duration: dur, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' });
  }
  await new Promise((r) => setTimeout(r, dur + 20));
  raiz.classList.add('entrado');
  raiz.classList.remove('saliendo');
  el.pista.getAnimations().forEach((a) => a.cancel());
  marco.inert = false; marco.tabIndex = 0;
  // El foco va a la ficha, no a la búsqueda: en el teléfono no sale el teclado.
  marco.focus();
  // Con un texto buscado, el foco se queda en la caja del sitio, que tiene la lista abierta.
  try { d.getElementById(opc.foco === 'q' ? 'q' : 'panel-cuerpo')?.focus({ preventScroll: true }); } catch { /* sin ficha */ }
  history.pushState({ entrado: 1 }, '', '#mapa');
}
function volver({ desdeLogo = false } = {}) {
  if (!S.entrado) return;
  S.entrado = false;
  const raiz = document.documentElement;
  raiz.classList.remove('entrado', 'saliendo');
  marco.inert = true; marco.tabIndex = -1;
  if (F.mismo) {
    const d = F.w.document;
    d.documentElement.classList.add('bajo-portada');
    try { F.map.setPadding(rellenoPortada()); } catch { /* sin mapa */ }
    // La línea sigue donde está la persona ahora (lo último que miró queda detrás).
    try { S.y = clamp(Math.floor(F.w.__be.E.t), M.T_MIN, M.T_MAX); } catch { /* sin estado */ }
  }
  S.destino = null; S.banda = null; desarmar();
  pintarSeguir(); pintarRecorridos(); pintarLinea();
  if (desdeLogo) history.replaceState(null, '', location.pathname + location.search);
  scrollTo(0, scrollAntes);
  const n = origenFoco && document.querySelector(origenFoco);
  const o = n && n.offsetParent ? n : el.entrar;
  o.focus({ preventScroll: true });
  origenFoco = null;
}
addEventListener('popstate', (e) => {
  if (!e.state?.entrado && S.entrado) volver();
  else if (e.state?.entrado && !S.entrado) {
    S.entrado = true; document.documentElement.classList.add('entrado'); marco.inert = false; marco.tabIndex = 0;
    if (F.mismo) F.w.document.documentElement.classList.remove('bajo-portada');
  }
});
el.entrar.addEventListener('click', () => entrar());

// ---------------------------------------------------------------------------
// Búsqueda: la del sitio, cuando el sitio ha cargado; si no, entra y la escribe allí
// ---------------------------------------------------------------------------
const q = $('#q'), lista = $('#sugerencias');
let resultados = [], activo = -1;
function buscarEnSitio(texto) {
  if (!F.listo) return null;
  try { return F.BE.buscar(texto).slice(0, 5); } catch { return null; }
}
function pintarLista() {
  const texto = q.value.trim();
  if (!texto) { cerrarLista(); return; }
  const r = buscarEnSitio(texto);
  if (r == null) {
    resultados = [];
    lista.innerHTML = `<li class="r-nada" role="option" aria-disabled="true">${F.mismo || !F.w ? 'Cargando los datos del mapa… Pulsa Intro para buscar al entrar.' : 'Pulsa Intro para buscar en el mapa.'}</li>`;
  } else {
    resultados = r;
    if (r.length && activo < 0) activo = 0;   // Intro elige el primero de la lista, el que se ve marcado
    lista.innerHTML = r.length ? r.map((x, i) => `<li id="r-${i}" role="option" aria-selected="${i === activo}" data-i="${i}"><span class="r-tit">${esc(x.titulo)}</span><span class="r-meta">${esc(x.fechaTexto || x.grupo || '')}</span></li>`).join('')
      : '<li class="r-nada" role="option" aria-disabled="true">Nada con ese nombre. Prueba con otra forma o con un año.</li>';
  }
  lista.hidden = false; q.setAttribute('aria-expanded', 'true');
  if (activo >= 0) q.setAttribute('aria-activedescendant', `r-${activo}`); else q.removeAttribute('aria-activedescendant');
}
function cerrarLista() { lista.hidden = true; q.setAttribute('aria-expanded', 'false'); q.removeAttribute('aria-activedescendant'); activo = -1; }
/** Entra y deja en el sitio lo que se eligió, como si se hubiera elegido en su barra. */
function entrarConResultado(r, texto) {
  entrar({ foco: r ? null : 'q', accion: () => {
    const cq = F.w.document.getElementById('q');
    if (r) { if (cq) cq.value = r.titulo; if (r.accion) r.accion(); else F.BE.seleccionar(r.sel); }
    else if (texto) F.BE.buscarTexto(texto);
  } });
}
let movido = false;   // la persona movió la selección con las flechas
q.addEventListener('input', () => { activo = -1; movido = false; pintarLista(); });
q.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!resultados.length) return;
    e.preventDefault();
    activo = (activo + (e.key === 'ArrowDown' ? 1 : -1) + resultados.length) % resultados.length;
    movido = true;
    pintarLista();
  } else if (e.key === 'Escape') {
    if (!lista.hidden) { e.preventDefault(); cerrarLista(); } else q.value = '';
  }
});
q.addEventListener('blur', () => setTimeout(cerrarLista, 150));
lista.addEventListener('pointerdown', (e) => {
  const li = e.target.closest('[data-i]');
  if (!li) return;
  e.preventDefault();
  entrarConResultado(resultados[+li.dataset.i]);
});
$('#busca').addEventListener('submit', (e) => {
  e.preventDefault();
  const texto = q.value.trim();
  if (!texto) { q.focus(); return; }
  // Un año escrito mueve el cursor, como una fecha de la línea: el tiempo es la puerta de esta portada.
  const soloAnio = texto.match(/^(\d{1,4})\s*(a\.?\s*e\.?\s*c\.?|e\.?\s*c\.?)?$/i);
  if (!resultados.length && F.listo) { const rr = buscarEnSitio(texto); if (rr) resultados = rr; }
  const r = (soloAnio && !movido) ? null : (resultados[activo >= 0 ? activo : 0] || null);
  if (!r && soloAnio) {
    const n = +soloAnio[1], antes = /^a/i.test(soloAnio[2] || '');
    const y = antes ? 1 - n : n;
    if (y >= M.T_MIN && y <= M.T_MAX) { cerrarLista(); ponerAnio(y, { soltar: true }); el.cursor.focus(); anunciar(`${textoAnio(mActual)}. ${fraseTexto(mActual)}`); return; }
  }
  entrarConResultado(r, r ? null : texto);
});
document.querySelector('.busca__ejemplos').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.anio) { ponerAnio(+b.dataset.anio, { soltar: true }); el.cursor.focus(); anunciar(`${textoAnio(mActual)}. ${fraseTexto(mActual)}`); return; }
  const r = buscarEnSitio(b.dataset.ejemplo);
  if (r?.length) entrarConResultado(r[0]);
  else entrarConResultado(null, b.dataset.ejemplo);
});

// ---------------------------------------------------------------------------
// Cabecera: modo reunión y enlaces del sitio
// ---------------------------------------------------------------------------
const reunion = $('#reunion');
const pintarReunion = () => reunion.setAttribute('aria-pressed', String(document.documentElement.classList.contains('be-reunion')));
reunion.addEventListener('click', () => {
  const on = document.documentElement.classList.toggle('be-reunion');
  escribir('biblical-earth:pref:reunion', on ? '1' : '0');
  if (F.mismo) F.w.document.documentElement.classList.toggle('be-reunion', on);
  pintarReunion();
  anunciar(on ? 'Modo reunión: fondo oscuro y sin animaciones.' : 'Fondo claro de nuevo.');
});
pintarReunion();
P.letraGrande($('#letra'), () => (F.mismo ? F.w : null));
$('#enlace-acerca').href = urlSitio('acerca.html');
$('#enlace-acerca-pie').href = urlSitio('acerca.html');
$('#enlace-datos').href = urlSitio('acerca.html', 'datos');
$('#enlace-creditos').href = urlSitio('acerca.html', 'gracias');
$('#enlace-calendario').href = urlSitio('calendario.html');

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
function medirBarra() { document.documentElement.style.setProperty('--barra-h', `${$('#barra').offsetHeight}px`); }
let anchoVisto = 0;
function alCambiarTamano() {
  if (innerWidth === anchoVisto && !alCambiarTamano.forzar) { medirBarra(); return; }
  anchoVisto = innerWidth; alCambiarTamano.forzar = false;
  pintarLinea(); pintarRegla(); pintarRecorridos(); medirBarra();
  if (F.map && !S.entrado) { try { F.map.setPadding(rellenoPortada()); } catch { /* sin mapa */ } }
}
addEventListener('resize', alCambiarTamano);
// Las letras llegan después del primer pintado: los botones de fecha se miden otra vez con su ancho de verdad.
document.fonts?.ready.then(() => { alCambiarTamano.forzar = true; alCambiarTamano(); });
iniciarCursor();
iniciarZonas();
P.ajustarAyuda(q, ['O busca una persona, un lugar o un capítulo', 'Busca una persona, un lugar o un capítulo', 'Persona, lugar o capítulo', 'Buscar']);   // la ayuda de la caja, la más larga que cabe entera
pintarZonas();
pintarSeguir();
pintarLinea();
medirBarra();
ponerImagen();
if (history.state?.entrado) history.replaceState(null, '', location.pathname + location.search);
P.vigilar(marco);   // si lo que carga no es el sitio (o le falta el mapa), entrar lo dice en vez de enseñar un marco muerto
marco.src = urlSitio('index.html', hashVista(S.y));
})();
