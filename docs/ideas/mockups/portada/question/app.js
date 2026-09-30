/* biblical-earth · portada «Entra por una pregunta» (maqueta). La primera pantalla pregunta y el sitio contesta en el
   mapa: la búsqueda que ya contesta, tres preguntas con su respuesta asomando y, debajo, otras maneras de preguntar.
   El sitio real vive detrás en un marco; entrar quita la portada, pone el marco en la dirección de la respuesta y se lo
   da a la persona. Atrás vuelve a la portada. Datos: data.js (primera pantalla) e indice.js (la caja, al tocarla),
   generados por make-data.py a partir de site/data.json. */
'use strict';
(() => {
const QD = window.QD;
const params = new URLSearchParams(location.search);
// (../assets/sitio.js: site/ al lado si se sirve la raíz del repositorio, el sitio publicado si no.)
const P = window.PORTADA_SITIO;
const SITE = P.base;
const KEY_LAST = 'biblical-earth:ultima';
const KEY_WEEK = 'biblical-earth:lectura-semana';
const KEY_THEME = 'biblical-earth:pref:reunion';
const KEY_RIBBON = 'biblical-earth:cinta-vista';
const DEFAULT_DIR = 't=50.3000&v=40&mapa=antiguo';
const state = params.get('estado');   // nuevo | vuelve | null (lo que haya guardado)

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fmtYear = (y) => (y > 0 ? `${y} e.c.` : `${1 - y} a.e.c.`);
const siteUrl = (dir) => `${SITE}#${dir}`;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('be-reunion');
const narrow = () => matchMedia('(max-width: 760px)').matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
};

// ---------------------------------------------------------------------------
// Formas de cada tipo: la forma y la palabra dicen el tipo; el color solo acompaña.
// ---------------------------------------------------------------------------
const SHAPES = {
  persona: '<circle cx="8" cy="8" r="5.5" fill="var(--node-persona)"/>',
  lugar: '<path d="M8 15s5-5.2 5-8.8A5 5 0 0 0 3 6.2C3 9.8 8 15 8 15Z" fill="var(--node-lugar)"/><circle cx="8" cy="6.3" r="1.8" fill="var(--surface)"/>',
  suceso: '<rect x="3.6" y="3.6" width="8.8" height="8.8" rx="1.2" transform="rotate(45 8 8)" fill="var(--node-evento)"/>',
  periodo: '<rect x="1.5" y="5" width="13" height="6" rx="3" fill="var(--node-periodo)"/>',
  texto: '<rect x="3.5" y="2" width="9" height="12" rx="1.3" fill="var(--node-texto)"/><path d="M5.8 6h4.4M5.8 8.5h4.4M5.8 11h2.8" stroke="var(--surface)" stroke-width="1.1" stroke-linecap="round"/>',
  ruta: '<path d="M2.5 12.5 7 6.5l3 4 3.5-7" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="2.2 1.8"/><circle cx="2.5" cy="12.5" r="1.8" fill="var(--accent)"/><circle cx="13.5" cy="3.5" r="1.8" fill="var(--accent)"/>',
  anio: '<path d="M6 1.5v13" stroke="var(--gold)" stroke-width="1.8" stroke-linecap="round"/><path d="M6 2h7l-2 2.5 2 2.5H6Z" fill="var(--gold)"/>',
  conexion: '<circle cx="3.5" cy="8" r="2.8" fill="var(--node-persona)"/><circle cx="12.5" cy="8" r="2.8" fill="var(--node-persona)"/><path d="M6.3 8h3.4" stroke="var(--node-persona)" stroke-width="1.6"/>',
};
const shape = (k) => `<svg class="shape" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${SHAPES[k] || SHAPES.texto}</svg>`;
const KIND = { p: ['persona', 'persona'], l: ['lugar', 'lugar'], e: ['suceso', 'suceso'], o: ['periodo', 'periodo'], c: ['texto', 'carta'], r: ['ruta', 'recorrido'], v: ['ruta', 'viaje'] };
const SEL = { p: 'persona', l: 'lugar', e: 'evento', o: 'periodo', c: 'carta', r: 'recorrido', v: 'viaje' };

// ---------------------------------------------------------------------------
// El marco con el sitio real
// ---------------------------------------------------------------------------
const site = $('#site'), landing = $('#landing');
let frame = null, entered = false, returnFocus = null, frameReady = false;

function sameOrigin() { try { return !!frame?.contentWindow?.document; } catch { return false; } }
function frameBE() { try { return frame?.contentWindow?.BE || null; } catch { return null; } }

function makeFrame(dir) {
  frame = document.createElement('iframe');
  frame.className = 'site__frame';
  frame.title = 'biblical-earth: el mapa y la línea de tiempo';
  frame.src = siteUrl(dir);
  frame.addEventListener('load', onFrameLoad);
  P.vigilar(frame);   // si lo que carga no es el sitio (o le falta el mapa), entrar lo dice en vez de abrir un marco muerto
  site.appendChild(frame);
}
function onFrameLoad() {
  frameReady = true;
  if (!sameOrigin()) return;
  const doc = frame.contentDocument;
  // El logo del sitio vuelve a esta portada, no a la del sitio (solo cuando el marco es del mismo origen).
  doc.addEventListener('click', (e) => {
    if (e.target.closest?.('#inicio')) { e.preventDefault(); e.stopImmediatePropagation(); showLanding({ push: true }); }
  }, true);
  syncThemeInto();
  // Con los datos del sitio cargados, las preguntas comprueban que su destino existe (los datos manda site/data.json).
  const wait = setInterval(() => {
    const BE = frameBE();
    if (!BE?.D) return;
    clearInterval(wait);
    if (!BE.L?.jerusalen || !BE.PERS?.loida) console.warn('portada: falta un destino de las preguntas en site/data.json');
  }, 400);
}
function goFrame(dir, { quiet = false } = {}) {
  if (!frame) { makeFrame(dir); return; }
  // Entrar desde la portada ya crea su entrada de historial (la de la portada). El sitio crea otra cada vez que cambia la
  // selección; para que Atrás vuelva a la portada de una vez, se le avisa como si navegara por el historial. Solo se
  // puede con el marco del mismo origen; en el sitio de verdad lo haría la propia portada.
  if (quiet && sameOrigin()) { try { frame.contentWindow.dispatchEvent(new PopStateEvent('popstate')); } catch { /* sin acceso */ } }
  try { frame.contentWindow.location.replace(siteUrl(dir)); } catch { frame.src = siteUrl(dir); }
}
function preloadFrame() {
  if (frame || navigator.connection?.saveData) return;
  const last = readLast();
  makeFrame(last ? last.hash.replace(/^#/, '') : DEFAULT_DIR);
}

// ---------------------------------------------------------------------------
// Entrar y volver
// ---------------------------------------------------------------------------
let waiting = false;
async function enter(dir, { invite = null, label = '', from = null, push = true } = {}) {
  if ((entered && push) || waiting) return;   // un segundo toque mientras se funde la portada no crea otra entrada
  returnFocus = from || document.activeElement;
  closeSuggest();
  // Antes de tiempo, o sin sitio: la portada se queda con «Abriendo el mapa…» y, si el sitio no llega, lo dice.
  const fresh = !frame;
  if (fresh) makeFrame(dir);
  if (P.estado !== 'listo') {
    waiting = true;
    const ok = await P.esperar();
    waiting = false;
    if (!ok || entered) return;
  }
  if (!fresh) goFrame(dir, { quiet: true });
  entered = true;
  document.documentElement.classList.add('in-site');
  site.inert = false;
  site.removeAttribute('aria-hidden');
  const hide = () => { landing.hidden = true; landing.classList.remove('landing--leaving'); };
  if (reduced()) hide();
  else { landing.classList.add('landing--leaving'); setTimeout(hide, 260); }
  showInvite(invite);
  if (push) history.pushState({ en: dir }, '', `${location.pathname}${location.search}#en=${encodeURIComponent(dir)}`);
  frame.focus({ preventScroll: true });
  $('#announce').textContent = label ? `Mapa abierto: ${label}.` : 'Mapa abierto.';
}
function showLanding({ push = false } = {}) {
  if (!entered) return;
  entered = false;
  syncThemeFrom();
  document.documentElement.classList.remove('in-site');
  site.inert = true;
  site.setAttribute('aria-hidden', 'true');
  landing.hidden = false;
  $('#invite').hidden = true;
  $('#ribbon').hidden = true;
  site.classList.remove('site--ribbon');
  if (push) history.pushState(null, '', `${location.pathname}${location.search}`);
  const wasMine = returnFocus?.classList?.contains('mine__item') ? [...document.querySelectorAll('.mine__item')].indexOf(returnFocus) : -1;
  renderMine();
  if (wasMine >= 0) returnFocus = document.querySelectorAll('.mine__item')[wasMine] || null;
  let f = returnFocus && document.contains(returnFocus) && !returnFocus.closest('[hidden]') ? returnFocus : $('#title');
  // En el teléfono, volver a la caja sacaría el teclado: el foco va a su botón.
  if (f === input && narrow()) f = $('.search__go');
  f.focus({ preventScroll: false });
  $('#announce').textContent = 'Portada.';
}
window.addEventListener('popstate', (e) => {
  if (e.state?.en) { if (!entered) enter(e.state.en, { push: false }); }
  else showLanding();
});

// Cualquier enlace o botón con data-dir entra en el sitio. Con Ctrl, Cmd o el botón central se abre aparte, como un
// enlace normal: por eso cada destino es también un href de verdad.
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-dir]');
  if (a && !(e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1)) {
    e.preventDefault();
    const q = a.dataset.question ? QD.preguntas.find((x) => x.id === a.dataset.question) : null;
    enter(a.dataset.dir, { invite: q, label: a.dataset.label || a.textContent.trim().split('\n')[0], from: a });
    return;
  }
  if (e.target.closest('[data-enter-plain]')) { e.preventDefault(); enter(DEFAULT_DIR, { label: 'el mapa', from: e.target.closest('a') }); return; }
  if (e.target.closest('[data-landing]')) { e.preventDefault(); showLanding({ push: true }); return; }
  if (e.target.closest('[data-invite-close]')) { $('#invite').hidden = true; frame?.focus(); return; }
  if (e.target.closest('[data-ribbon-close]')) { $('#ribbon').hidden = true; site.classList.remove('site--ribbon'); frame?.focus(); }
});
const link = (dir, { question = '', label = '' } = {}) => `href="${esc(siteUrl(dir))}" data-dir="${esc(dir)}"${question ? ` data-question="${esc(question)}"` : ''}${label ? ` data-label="${esc(label)}"` : ''}`;

// ---------------------------------------------------------------------------
// «Ahora tú»: cada respuesta acaba dentro del mapa con algo que hacer
// ---------------------------------------------------------------------------
let inviteTimer = 0;
function showInvite(q) {
  const box = $('#invite');
  clearInterval(inviteTimer);
  if (!q?.invita) { box.hidden = true; return; }
  $('#invite-text').textContent = q.invita;
  const go = $('#invite-go');
  go.href = siteUrl(q.llevame);
  go.onclick = (e) => { e.preventDefault(); goFrame(q.llevame); frame.focus(); };
  box.hidden = false;
  placeInvite(); setTimeout(placeInvite, 400); setTimeout(placeInvite, 1500);
  // Con el marco del mismo origen, la invitación nota cuándo el cursor llega a la fecha.
  inviteTimer = setInterval(() => {
    const BE = frameBE();
    if (!BE?.E || box.hidden) return;
    const sel = BE.E.sel ? `${BE.E.sel.tipo}:${BE.E.sel.id}` : '';
    if (q.metaSel ? sel === q.metaSel : Math.floor(BE.E.t) === q.meta) {
      $('#invite-text').textContent = q.metaSel ? 'Ahí está, en el mapa y en la ficha. Sigue por donde quieras.' : `Ya estás en ${fmtYear(q.meta)}: mira qué ha cambiado en el mapa y en la ficha.`;
      clearInterval(inviteTimer);
    }
  }, 500);
}

/** En pantalla ancha, la invitación va sobre el mapa del sitio, abajo, y no sobre su texto (en «¿Qué une a Loida con
    Pablo?» tapaba los primeros pasos del camino). Sin acceso al marco se queda donde la pone la hoja de estilo. */
function placeInvite() {
  const box = $('#invite');
  for (const k of ['left', 'top', 'bottom', 'width', 'transform']) box.style[k] = '';
  if (box.hidden || narrow() || !sameOrigin()) return;
  const d = frame.contentDocument, m = d.getElementById('mapa-gl') || d.getElementById('mapa');
  const r = m?.getBoundingClientRect();
  if (!r || r.width < 320 || r.height < 280) return;
  // La parte del mapa que se ve de verdad a la altura de la tarjeta: un panel del sitio (el de la conexión, a la
  // izquierda) puede taparle medio mapa, y la tarjeta se centra en lo que queda.
  const y = r.bottom - 120;
  let x0 = null, x1 = null;
  for (let x = r.left + 4; x < r.right - 4; x += 16) {
    const e = d.elementFromPoint(x, y);
    if (e && (e === m || m.contains(e))) { if (x0 === null) x0 = x; x1 = x; }
  }
  const left = x0 !== null && x1 - x0 >= 320 ? x0 : r.left, span = x0 !== null && x1 - x0 >= 320 ? x1 - x0 : r.width;
  const w = Math.min(span - 24, 480);
  Object.assign(box.style, { width: `${w}px`, left: `${Math.round(left + (span - w) / 2)}px`, transform: 'none', top: 'auto', bottom: `${Math.round(innerHeight - r.bottom + 34)}px` });
}
addEventListener('resize', placeInvite);

// ---------------------------------------------------------------------------
// Tema: el mismo interruptor y la misma preferencia que el sitio
// ---------------------------------------------------------------------------
const themeBtn = $('#theme');
function paintTheme() { themeBtn.setAttribute('aria-pressed', String(document.documentElement.classList.contains('be-reunion'))); }
themeBtn.addEventListener('click', () => {
  const on = !document.documentElement.classList.contains('be-reunion');
  document.documentElement.classList.toggle('be-reunion', on);
  store.set(KEY_THEME, on ? '1' : '0');
  syncThemeInto();
  paintTheme();
});
function syncThemeInto() {
  if (!sameOrigin()) return;
  frame.contentDocument.documentElement.classList.toggle('be-reunion', document.documentElement.classList.contains('be-reunion'));
}
function syncThemeFrom() {
  if (!sameOrigin()) return;
  document.documentElement.classList.toggle('be-reunion', frame.contentDocument.documentElement.classList.contains('be-reunion'));
  paintTheme();
}
paintTheme();
P.letraGrande($('#letra'), () => (sameOrigin() ? frame.contentWindow : null));
// La ayuda de la caja, entera si cabe (en la barra del teléfono se cortaba en «…607 a»).
P.ajustarAyuda($('#q'), ['Pedro, Babilonia, Hechos 16, 607 a.e.c.', 'Pedro, Hechos 16, 607 a.e.c.', 'Pedro, Hechos 16…', 'Pregunta aquí']);

// ---------------------------------------------------------------------------
// Datos guardados en este navegador: la última vista del sitio y la lectura de la semana
// ---------------------------------------------------------------------------
// ?estado=nuevo hace como si no hubiera nada guardado al abrir; lo que se guarde después sí sale.
const atLoad = { last: store.get(KEY_LAST), week: store.get(KEY_WEEK) };
const fresh = (k, v) => state === 'nuevo' && v === atLoad[k];
function readLast() {
  if (state === 'vuelve') return { hash: '#t=50.3000&v=40&sel=persona:pablo&mapa=antiguo', texto: 'Pablo · 50 e.c.' };
  const raw = store.get(KEY_LAST);
  if (fresh('last', raw)) return null;
  try { const u = JSON.parse(raw || 'null'); return u?.hash ? u : null; } catch { return null; }
}
const readLastDir = () => readLast()?.hash.replace(/^#/, '') || null;
let weekDemo = state === 'vuelve' ? 'Hechos 16-17' : null;
function readWeek() {
  if (weekDemo) return parseReading(weekDemo);
  const raw = store.get(KEY_WEEK);
  if (fresh('week', raw)) return null;
  try { const w = JSON.parse(raw || 'null'); return w?.texto ? parseReading(w.texto) : null; } catch { return null; }
}

function renderMine() {
  const last = readLast(), week = readWeek();
  const items = [];
  if (last) items.push(`<li><a class="mine__item" ${link(last.hash.replace(/^#/, ''), { label: last.texto })}><span class="mine__what">Seguir donde lo dejé</span><span class="mine__detail">${esc(last.texto || 'tu última vista')}</span></a></li>`);
  if (week) items.push(`<li><a class="mine__item" ${link(week.dirs[0], { label: week.label })}><span class="mine__what">Tu lectura de la semana</span><span class="mine__detail">${esc(week.label)}</span></a></li>`);
  $('#mine-list').innerHTML = items.join('');
  $('#mine').hidden = !items.length;
}

// ---------------------------------------------------------------------------
// Libros y capítulos (para la caja y para «¿Qué lees esta semana?»)
// ---------------------------------------------------------------------------
const BOOK_FORMS = new Map();
for (const b of QD.libros) {
  const [slug, num, nombre, abr, caps, formas, conDatos] = b;
  const book = { slug, num, nombre, abr, caps, conDatos: new Set(conDatos) };
  for (const f of [...formas, norm(abr), norm(nombre)]) BOOK_FORMS.set(f.replace(/\s+/g, ''), book);
}
const readId = (book, cap) => `${norm(book.abr)}-${cap}`;
const wolUrl = (book, cap) => `https://wol.jw.org/es/wol/b/r4/lp-s/nwt/${book.num}/${cap}`;
function parseChapter(text) {
  const m = norm(text).trim().match(/^(.+?)\s*(\d{1,3})(?:\s*(?:-|–|a|al)\s*(\d{1,3}))?$/);
  if (!m) return null;
  const book = BOOK_FORMS.get(m[1].replace(/[\s.]+/g, ''));
  if (!book) return null;
  const a = +m[2], b = m[3] ? +m[3] : a;
  if (a < 1 || a > book.caps || b < a || b > book.caps) return { book, bad: true };
  return { book, a, b: Math.min(b, a + 9) };
}
function parseReading(text) {
  const c = parseChapter(text);
  if (!c || c.bad) return null;
  const caps = [];
  for (let i = c.a; i <= c.b; i++) caps.push(i);
  return { texto: text, book: c.book, caps, label: `${c.book.nombre} ${c.a}${c.b > c.a ? `-${c.b}` : ''}`, dirs: caps.map((n) => `leer=${readId(c.book, n)}&mapa=antiguo`) };
}

// ---------------------------------------------------------------------------
// La caja de búsqueda que ya contesta (B1)
// ---------------------------------------------------------------------------
const input = $('#q'), list = $('#suggest'), status = $('#search-status');
let index = null, loading = null, results = [], active = -1;
function loadIndex() {
  if (index || loading) return loading;
  loading = new Promise((ok) => {
    const s = document.createElement('script');
    s.src = 'indice.js';
    s.onload = () => { index = (window.QI || []).map((r) => ({ k: r[0], id: r[1], name: r[2], n: norm(r[2]), alts: r[3] ? r[3].split('|').map(norm) : [], date: r[4], extra: r[5], w: r[6] || 0 })); ok(index); };
    s.onerror = () => ok(null);
    document.head.appendChild(s);
  });
  return loading;
}
function readYear(s) {
  const m = norm(s).trim().replace(/[¿?]/g, '').match(/^(?:c\.?\s*|hacia\s+|en\s+|ano\s+)*(\d{1,4})\s*(a\.?\s*e\.?\s*c\.?|a\.?\s*c\.?|e\.?\s*c\.?|d\.?\s*c\.?)?$/);
  if (!m) return null;
  const n = +m[1];
  const before = m[2] && /^a/.test(m[2].replace(/[\s.]/g, ''));
  const y = before ? 1 - n : n;
  return y >= -4025 && y <= 100 ? y : null;
}
function score(entry, nq) {
  let best = 0;
  for (const t of [entry.n, ...entry.alts]) {
    if (t === nq) best = Math.max(best, 100);
    else if (t.startsWith(nq)) best = Math.max(best, 80);
    else if (t.split(/[\s-]+/).some((p) => p.startsWith(nq))) best = Math.max(best, 60);
    else if (nq.length >= 3 && t.includes(nq)) best = Math.max(best, 30);
  }
  return best;
}
const ORDER = ['p', 'l', 'c', 'v', 'r', 'o', 'e'];
function findEntity(text, kinds = ['p', 'l']) {
  const nq = norm(text).trim();
  let best = null;
  for (const e of index || []) {
    if (!kinds.includes(e.k)) continue;
    const s = score(e, nq);
    if (s >= 80 && (!best || s > best.s)) best = { e, s };
  }
  return best?.e || null;
}
function dirFor(e) {
  if (e.k === 'o' && e.extra) {
    const [a, b] = e.extra.split(',').map(Number);
    const v = Math.min(4125, Math.max(2, (b - a) / 0.6));
    return `t=${(a + 0.01).toFixed(4)}&v=${+v.toPrecision(4)}&sel=periodo:${e.id}&mapa=antiguo`;
  }
  if (e.k === 'r') return `sel=recorrido:${e.id}&paso=1&mapa=antiguo`;
  if (e.k === 'c') return `sel=carta:${e.id}&cartas=todas&mapa=antiguo`;
  return `sel=${SEL[e.k]}:${e.id}&mapa=antiguo`;
}
function search(q) {
  const nq = norm(q).trim().replace(/[¿?]/g, '').replace(/\s+/g, ' ');
  if (!nq) return [];
  const out = [];
  const y = readYear(q);
  if (y != null) out.push({ shape: 'anio', kind: 'fecha', title: `Ir a ${fmtYear(y)}`, date: '', meta: 'el mapa en esa fecha, con quién había', dir: `t=${(y + 0.5).toFixed(4)}&v=40&mapa=antiguo` });
  const ch = parseChapter(q);
  if (ch && !ch.bad) {
    const has = ch.book.conDatos.has(ch.a);
    out.push({ shape: 'texto', kind: 'capítulo', title: `${ch.book.nombre} ${ch.a}`, date: '', meta: has ? 'modo lectura, con el mapa al lado' : 'modo lectura; todavía sin datos en el mapa', dir: `leer=${readId(ch.book, ch.a)}&mapa=antiguo` });
  }
  if (index) {
    let m = nq.match(/^(?:como se relaciona\s+)?(.+?)\s+(?:y|con)\s+(.+)$/);
    if (m) {
      const a = findEntity(m[1]), b = findEntity(m[2]);
      if (a && b && a !== b) out.push({ shape: 'conexion', kind: 'pregunta', title: `¿Cómo se relaciona ${a.name} con ${b.name}?`, date: '', meta: 'los caminos, paso a paso, con su referencia', dir: `conexion=${SEL[a.k]}:${a.id}~${SEL[b.k]}:${b.id}&mapa=antiguo` });
    }
    m = nq.match(/^(?:que pasaba en |quien habia en |donde estaba )?(.+?) en (?:el (?:ano )?)?(.+)$/);
    if (m) {
      const a = findEntity(m[1], ['p', 'l']), y2 = readYear(m[2]);
      if (a && y2 != null) out.push({ shape: a.k === 'l' ? 'lugar' : 'persona', kind: 'pregunta', title: `${a.name} en ${fmtYear(y2)}`, date: fmtYear(y2), meta: 'la ficha con el cursor en esa fecha', dir: `sel=${SEL[a.k]}:${a.id}&t=${(y2 + 0.5).toFixed(4)}&v=40&mapa=antiguo` });
    }
    const scored = [];
    for (const e of index) { const s = score(e, nq); if (s) scored.push({ e, s }); }
    scored.sort((a, b) => (b.e.n === nq) - (a.e.n === nq) || b.s - a.s || Math.min(b.e.w, 20) - Math.min(a.e.w, 20) || ORDER.indexOf(a.e.k) - ORDER.indexOf(b.e.k) || a.e.name.localeCompare(b.e.name, 'es'));
    for (const { e } of scored.slice(0, 12)) {
      const [sh, word] = KIND[e.k];
      out.push({ shape: sh, kind: word, title: e.name, date: e.date, meta: e.extra && e.k !== 'o' ? e.extra : '', dir: dirFor(e), nq });
    }
  }
  return out;
}
function highlight(title, q) {
  const nq = norm(q).trim();
  const i = nq ? norm(title).indexOf(nq) : -1;
  if (i < 0) return esc(title);
  return `${esc(title.slice(0, i))}<mark>${esc(title.slice(i, i + nq.length))}</mark>${esc(title.slice(i + nq.length))}`;
}
function renderSuggest() {
  const q = input.value;
  const max = narrow() ? 4 : 6;
  const shown = results.slice(0, max);
  if (!q.trim()) { closeSuggest(); return; }
  let html = shown.map((r, i) => `<li role="option" id="opt-${i}" class="opt${i === active ? ' opt--active' : ''}" aria-selected="${i === active}" data-i="${i}">
      ${shape(r.shape)}<span class="opt__main"><span class="opt__title">${highlight(r.title, q)}</span><span class="opt__meta">${esc(r.kind)}${r.meta ? ` · ${esc(r.meta)}` : ''}</span></span>${r.date ? `<span class="date">${esc(r.date)}</span>` : ''}</li>`).join('');
  if (!shown.length) html = `<li class="opt opt--empty" role="presentation">${index ? 'Nada con ese nombre. Prueba con otro, o con un año como «607 a.e.c.».' : 'Cargando los nombres…'}</li>`;
  else if (results.length > max && !narrow() && sameOrigin() && frameBE()) html += `<li role="option" id="opt-all" class="opt opt--all${active === max ? ' opt--active' : ''}" aria-selected="${active === max}" data-all="1"><span class="opt__main"><span class="opt__title">Ver los ${results.length} resultados en el mapa</span></span></li>`;
  list.innerHTML = html;
  list.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  input.setAttribute('aria-activedescendant', active >= 0 && active < shown.length ? `opt-${active}` : (active === max ? 'opt-all' : ''));
  status.textContent = shown.length ? `${results.length} ${results.length === 1 ? 'sugerencia' : 'sugerencias'}` : '';
}
function closeSuggest() {
  list.hidden = true;
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
}
function choose(i) {
  const max = narrow() ? 4 : 6;
  if (i === max && results.length > max) {   // la lista completa del sitio, con su propia caja
    const q = input.value;
    enter(readLastDir() || DEFAULT_DIR, { label: `resultados de «${q}»` });
    setTimeout(() => frameBE()?.buscarTexto?.(q), 300);
    return;
  }
  const r = results[i];
  if (!r) return;
  enter(r.dir, { label: r.title, from: input });
}
async function update() {
  if (!index) { renderSuggest(); await loadIndex(); }
  results = search(input.value);
  active = results.length ? 0 : -1;
  renderSuggest();
}
input.addEventListener('focus', () => { loadIndex(); preloadFrame(); if (input.value.trim()) update(); });
input.addEventListener('input', update);
input.addEventListener('keydown', (e) => {
  const max = narrow() ? 4 : 6;
  const last = Math.min(results.length, max) - 1 + (results.length > max && !narrow() && sameOrigin() && frameBE() ? 1 : 0);
  if (e.key === 'ArrowDown' && !list.hidden) { e.preventDefault(); active = Math.min(active + 1, last); renderSuggest(); }
  else if (e.key === 'ArrowUp' && !list.hidden) { e.preventDefault(); active = Math.max(active - 1, 0); renderSuggest(); }
  else if (e.key === 'Escape') {
    if (!list.hidden) { e.preventDefault(); closeSuggest(); }
    else if (input.value) { e.preventDefault(); input.value = ''; }
  }
});
input.addEventListener('blur', () => setTimeout(() => { if (!list.contains(document.activeElement)) closeSuggest(); }, 150));
let swallowClick = false;
document.addEventListener('click', (e) => { if (swallowClick) { swallowClick = false; e.preventDefault(); e.stopPropagation(); } }, true);
list.addEventListener('pointerdown', (e) => {
  const o = e.target.closest('[data-i], [data-all]');
  if (!o) return;
  e.preventDefault();
  // Al elegir se cierra la lista; el clic que sigue al toque caería en la tarjeta de debajo.
  swallowClick = true;
  setTimeout(() => { swallowClick = false; }, 600);
  choose(o.dataset.all ? (narrow() ? 4 : 6) : +o.dataset.i);
});
$('#search').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!input.value.trim()) { enter(DEFAULT_DIR, { label: 'el mapa', from: input }); return; }
  if (!index) await loadIndex();
  if (!results.length) results = search(input.value);
  if (results.length) choose(Math.max(0, active));
  else renderSuggest();
});

// ---------------------------------------------------------------------------
// Primera pantalla: ejemplos y las tres preguntas (E1, E2)
// ---------------------------------------------------------------------------
const EX_SHAPE = { persona: 'persona', capitulo: 'texto', anio: 'anio' };
$('#examples').innerHTML = QD.ejemplos.map((x) => `<li><a class="chip" ${link(x.dir, { label: x.texto })} aria-label="${esc(`${x.texto}, ${x.ayuda}`)}">${shape(EX_SHAPE[x.k])}<span>${esc(x.texto)}</span></a></li>`).join('');

const [main3, more] = [QD.preguntas.slice(0, 3), QD.preguntas.slice(3)];
$('#cards').innerHTML = main3.map((q, i) => `<li>
  <a class="card" ${link(q.dir, { question: q.id, label: q.texto })}>
    <span class="card__img" aria-hidden="true"><img src="${esc(q.img)}" alt="" width="800" height="400" decoding="async"></span>
    <span class="card__body">
      <span class="card__row"><span class="date">${esc(q.fecha)}</span><span class="card__view">${esc(q.vistaTexto)}</span></span>
      <span class="card__q">${esc(q.texto)}</span>
      <span class="card__line">${esc(q.linea)}</span>
      <span class="card__go" aria-hidden="true">Ver la respuesta</span>
    </span>
  </a></li>`).join('');
$('#more-list').innerHTML = more.map((q) => `<li><a class="more__item" ${link(q.dir, { question: q.id, label: q.texto })}><span class="date">${esc(q.fecha)}</span><span class="more__q">${esc(q.texto)}</span><span class="more__line">${esc(q.linea)}</span></a></li>`).join('');
$('#more summary').textContent = `Más preguntas (${more.length})`;

// ---------------------------------------------------------------------------
// ¿En qué época pasó? (D2 en lista)
// ---------------------------------------------------------------------------
function eraDir(e) {
  const v = Math.min(4125, (e.hasta - e.desde) / 0.6);
  return `t=${(e.desde + 0.01).toFixed(4)}&v=${+v.toPrecision(4)}&sel=periodo:${e.id}&mapa=antiguo`;
}
$('#eras').innerHTML = QD.eras.map((e) => `<li><a class="era${e.sinLibro ? ' era--nobook' : ''}" ${link(eraDir(e), { label: e.nombre })}>
  <span class="era__n">${e.n}</span>
  <span class="era__main"><span class="era__name">${esc(e.nombre)}</span><span class="era__date">${esc(e.fecha)}</span>
  <span class="era__books">${e.sinLibro ? '<span class="era__hatch" aria-hidden="true"></span>' : ''}${e.sinLibro ? esc(e.libros) : `Lo cuentan: ${esc(e.libros)}`}</span></span></a></li>`).join('');

// ---------------------------------------------------------------------------
// ¿Prefieres que te lo cuenten paso a paso? (recorridos)
// ---------------------------------------------------------------------------
$('#tours').innerHTML = QD.recorridos.map((r) => `<li><a class="tour" ${link(`sel=recorrido:${r.id}&paso=1&mapa=antiguo`, { label: r.titulo })}>
  <span class="tour__caps">${shape('ruta')}Recorrido · ${r.paradas} paradas</span>
  <span class="tour__title">${esc(r.titulo)}</span>
  <span class="date">${esc(r.fecha)}</span>
  <span class="tour__line">${esc(r.linea)}</span>
  <span class="tour__go" aria-hidden="true">Empezar</span></a></li>`).join('');

// ---------------------------------------------------------------------------
// ¿Qué lees esta semana? (G3)
// ---------------------------------------------------------------------------
function renderWeek() {
  const w = readWeek(), card = $('#week-card'), form = $('#week-form');
  if (!w) { card.hidden = true; form.hidden = false; return; }
  const withData = w.caps.filter((c) => w.book.conDatos.has(c));
  const note = withData.length === w.caps.length ? 'Todos estos capítulos tienen lugares y fechas en el mapa.'
    : withData.length ? `En el mapa hay datos de ${withData.length === 1 ? 'el capítulo' : 'los capítulos'} ${withData.join(', ')}; los demás se leen en wol.jw.org y el mapa lo dirá.`
      : 'Todavía no hay datos de estos capítulos en el mapa: se leen en wol.jw.org, y el mapa lo dice al abrirlos.';
  card.innerHTML = `<p class="caps">Tu lectura de la semana</p>
    <p class="week-card__title">${esc(w.label)}</p>
    <ul class="week-card__caps">${w.caps.map((c, i) => `<li><a class="capbtn${w.book.conDatos.has(c) ? ' capbtn--data' : ''}" ${link(w.dirs[i], { label: `${w.book.nombre} ${c}` })} aria-label="${esc(`${w.book.nombre} ${c}${w.book.conDatos.has(c) ? ', con datos en el mapa' : ', sin datos en el mapa todavía'}`)}">${c}${w.book.conDatos.has(c) ? '<span class="capbtn__dot" aria-hidden="true"></span>' : ''}</a></li>`).join('')}</ul>
    <p class="week-card__note">${esc(note)}${withData.length && withData.length < w.caps.length ? ' Los que tienen datos llevan un punto.' : ''}</p>
    <div class="week-card__actions">
      <a class="btn btn--primary" ${link(w.dirs[0], { label: w.label })}>Abrir ${esc(`${w.book.nombre} ${w.caps[0]}`)} con el mapa</a>
      <a class="btn" href="${esc(wolUrl(w.book, w.caps[0]))}" target="_blank" rel="noopener">Leer en wol.jw.org<span class="sr-only"> (se abre aparte)</span></a>
      <button type="button" class="btn btn--ghost" data-week-change>Cambiar</button>
      <button type="button" class="btn btn--ghost" data-week-forget>Olvidar</button>
    </div>`;
  card.hidden = false;
  form.hidden = true;
}
$('#week-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('#week-input').value.trim();
  const c = parseChapter(text);
  const msg = $('#week-msg');
  if (!c) { msg.textContent = 'No reconozco ese libro. Escribe el nombre y el capítulo, por ejemplo «Isaías 40».'; return; }
  if (c.bad) { msg.textContent = `${c.book.nombre} tiene ${c.book.caps} capítulos.`; return; }
  msg.textContent = '';
  weekDemo = null;
  store.set(KEY_WEEK, JSON.stringify({ texto: text, guardado: new Date().toISOString().slice(0, 10) }));
  renderWeek(); renderMine();
  $('#week-card .btn--primary').focus();
});
$('#week-card').addEventListener('click', (e) => {
  if (e.target.closest('[data-week-change]')) { $('#week-input').value = readWeek()?.label || ''; $('#week-card').hidden = true; $('#week-form').hidden = false; $('#week-input').focus(); }
  if (e.target.closest('[data-week-forget]')) { weekDemo = null; store.set(KEY_WEEK, null); renderWeek(); renderMine(); $('#week-input').value = ''; $('#week-input').focus(); $('#week-msg').textContent = 'Olvidado.'; }
});

// ---------------------------------------------------------------------------
// ¿Y si empiezas por cualquier momento? (B2 y A6)
// ---------------------------------------------------------------------------
let momentIdx = Math.floor(Math.random() * QD.momentos.length);
function renderMoment() {
  const [id, title, date, place, line] = QD.momentos[momentIdx];
  $('#moment').innerHTML = `<p class="moment__row"><span class="date">${esc(date)}</span><span class="moment__place">${shape('lugar')}${esc(place)}</span></p>
    <p class="moment__title">${esc(title)}</p><p class="moment__line">${esc(line)}</p>`;
  const go = $('#moment-go');
  go.href = siteUrl(`sel=evento:${id}&mapa=antiguo`);
  go.dataset.dir = `sel=evento:${id}&mapa=antiguo`;
  go.dataset.label = title;
}
$('#moment-next').addEventListener('click', () => { momentIdx = (momentIdx + 1 + Math.floor(Math.random() * (QD.momentos.length - 1))) % QD.momentos.length; renderMoment(); });

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function renderSeason() {
  const today = params.get('hoy') ? new Date(`${params.get('hoy')}T12:00:00`) : new Date();
  const m = MONTHS[today.getMonth()], d = today.getDate();
  // Un mes hebreo empieza con la luna nueva, hacia la segunda mitad de uno de los nuestros: desde el día 15 se toma el
  // que empieza en este mes; antes, el que acaba en él. Es aproximado y la línea lo dice.
  const hit = QD.meses.find((x) => (d >= 15 ? x.equivale.split('-')[0] : x.equivale.split('-').pop()) === m);
  if (!hit) return;
  const tour = hit.recorrido ? ` Un recorrido de ${hit.recorrido} paradas.` : '';
  $('#season-body').innerHTML = `<p class="moment__lead">Hoy, ${d} de ${m}, cae más o menos en <b>${esc(hit.nombre.toLowerCase())}</b>, el mes hebreo que va aproximadamente de ${esc(hit.equivale.replace('-', ' a '))}.</p>
    <p class="moment__row"><span class="date">${esc(hit.fecha)}</span><span class="moment__place">${shape('lugar')}${esc(hit.lugar)}</span></p>
    <p class="moment__title">${esc(hit.titulo)}</p><p class="moment__line">${hit.n > 1 ? `Uno de los ${hit.n} sucesos de ${esc(hit.nombre.toLowerCase())} en los datos.` : `El único suceso de ${esc(hit.nombre.toLowerCase())} en los datos.`}${tour}</p>`;
  const go = $('#season-go');
  go.href = siteUrl(hit.dir);
  go.dataset.dir = hit.dir;
  go.dataset.label = hit.titulo;
  $('#season').hidden = false;
}

// ---------------------------------------------------------------------------
// ¿Sabrías contestar esta? (E3): una pregunta, tres respuestas, sin puntos
// ---------------------------------------------------------------------------
const dayOfYear = (() => { const n = new Date(); return Math.floor((n - new Date(n.getFullYear(), 0, 0)) / 864e5); })();
let quizIdx = dayOfYear % QD.preguntasRecorrido.length;
function renderQuiz(answer = null) {
  const q = QD.preguntasRecorrido[quizIdx];
  const done = answer != null;
  $('#quiz').innerHTML = `<p class="caps">Del recorrido «${esc(q.tituloRecorrido)}», parada ${q.paso}</p>
    <p class="quiz__q" id="quiz-q">${esc(q.texto)}</p>
    <ul class="quiz__opts" role="list" aria-labelledby="quiz-q">${q.opciones.map((o) => {
      const right = o === q.respuesta, mine = o === answer;
      const tag = done ? (right ? 'La respuesta' : (mine ? 'Tu respuesta' : '')) : '';
      return `<li><button type="button" class="opt-btn${done && right ? ' opt-btn--right' : ''}${done && mine && !right ? ' opt-btn--mine' : ''}" data-answer="${esc(o)}" ${done ? 'aria-disabled="true"' : ''}>
        ${done && right ? '<svg class="opt-btn__mark" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8.5 3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
        <span>${esc(o)}</span>${tag ? `<span class="opt-btn__tag">${tag}</span>` : ''}</button></li>`;
    }).join('')}</ul>
    <div class="quiz__result" aria-live="polite">${done ? `<p><b>${answer === q.respuesta ? 'Eso es.' : `Es ${esc(q.respuesta)}.`}</b> ${esc(q.explicacion)}</p>
      <div class="quiz__actions"><a class="btn btn--primary" ${link(q.dir, { label: q.texto })}>Verlo en el mapa</a><a class="btn" ${link(q.dirRecorrido, { label: q.tituloRecorrido })}>Seguir el recorrido desde aquí</a><button type="button" class="btn btn--ghost" data-quiz-next>Otra pregunta</button></div>` : ''}</div>`;
}
$('#quiz').addEventListener('click', (e) => {
  const b = e.target.closest('[data-answer]');
  if (b && b.getAttribute('aria-disabled') !== 'true') {
    renderQuiz(b.dataset.answer);
    $('#quiz .quiz__actions .btn')?.focus();
    return;
  }
  if (e.target.closest('[data-quiz-next]')) { quizIdx = (quizIdx + 1) % QD.preguntasRecorrido.length; renderQuiz(); $('#quiz .opt-btn').focus(); }
});

// ---------------------------------------------------------------------------
// Fuentes, pie y enlaces al sitio
// ---------------------------------------------------------------------------
const c = QD.cifras;
const nf = (n) => n.toLocaleString('es-ES');
$('#counts').textContent = `${nf(c.sucesos)} sucesos, ${nf(c.lugares)} lugares y ${nf(c.personas)} personas, cada uno con su fuente: ${nf(c.fuentes)} citadas. De los ${c.libros} libros, ${c.revisados} tienen ya la cobertura revisada.`;
const [gy, gm, gd] = c.generado.split('-').map(Number);
$('#generated').textContent = `Datos del ${gd} de ${MONTHS[gm - 1]} de ${gy}`;
for (const a of document.querySelectorAll('[data-site-href]')) a.href = SITE + a.dataset.siteHref;

// ---------------------------------------------------------------------------
// Arranque: imagen del relieve, estado de quien vuelve, enlace compartido (H1) y el marco en segundo plano
// ---------------------------------------------------------------------------
const band = $('.band'), img = $('.band img');
const loaded = () => band.removeAttribute('data-loading');
if (img.complete) loaded(); else { img.addEventListener('load', loaded); img.addEventListener('error', loaded); }

renderMine();
renderWeek();
renderMoment();
renderSeason();
renderQuiz();

async function sharedRibbon(dir) {
  const seen = store.get(KEY_RIBBON) === '1' && params.get('cinta') !== 'siempre';
  enter(dir, { push: false, label: 'la vista compartida' });
  history.replaceState({ en: dir }, '', `${location.pathname}${location.search}`);
  if (seen) return;
  await loadIndex();
  const p = new URLSearchParams(dir);
  const [tipo, id] = (p.get('sel') || '').split(':');
  const k = Object.keys(SEL).find((x) => SEL[x] === tipo);
  const e = k && index?.find((x) => x.k === k && x.id === id);
  const t = parseFloat(p.get('t'));
  const what = e ? `${e.k === 'p' ? 'a ' : ''}${e.name}${Number.isFinite(t) ? ` en ${fmtYear(Math.floor(t))}` : ''}` : 'una vista del mapa';
  const short = e ? `${e.name}${Number.isFinite(t) ? `, ${fmtYear(Math.floor(t))}` : ''}` : 'Vista compartida';
  $('#ribbon-text').innerHTML = `<span class="ribbon__long">Estás viendo ${esc(what)} en <b>biblical-earth</b>, la Biblia en el mapa y en el tiempo.</span><span class="ribbon__short"><b>biblical-earth</b> · ${esc(short)}</span>`;
  $('#ribbon').hidden = false;
  site.classList.add('site--ribbon');
  store.set(KEY_RIBBON, '1');
}

const shared = params.get('compartido');
const hashDir = location.hash.startsWith('#en=') ? decodeURIComponent(location.hash.slice(4)) : null;
if (shared) sharedRibbon(shared);
else if (hashDir) { history.replaceState({ en: hashDir }, '', location.href); enter(hashDir, { push: false }); }
else {
  // El marco se carga cuando la portada ya está pintada, para no quitarle red; tocar la caja lo adelanta.
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
  addEventListener('load', () => idle(preloadFrame, { timeout: 2500 }));
}
})();
