/* biblical-atlas · the reader's language (prototype of docs/ideas/ingles.md).

   Which language: «?lang=en» in the address wins, then the choice stored in this browser, then (once the English site
   is launched) the browser's own languages; otherwise Spanish. Once launched the address always carries «lang» (before
   launch, only when the page is not in Spanish), so a shared link opens in the same language. It lives in the query,
   not in the hash: the hash is the view (base.js, passage-link.js), this module never parses it, and a switch only
   hands the current view over to the other language.

   Two layers of text, kept apart:
   - Data: build.py writes site/data.<lang>.json, the texts of each translated record with the keys of data.json. apply()
     merges it over BE.D before anything reads the data (base.js awaits it). A record without its translation keeps its
     Spanish text and its card says so.
   - Interface: site/i18n/<lang>.js holds the strings of the site, keyed by their Spanish text. BE.t('Suceso') gives
     «Event» in English and the same Spanish text when there is no translation, so wrapping a string never breaks a page.

   The switch is a button in the top bar and an entry in the Estudio menu (the phone hides the bar button). Until the
   English site is launched (LAUNCHED), it only shows to someone already reading in English, so they can go back. */
'use strict';
(() => {
const BE = window.BE;
const { esc } = BE;

const SUPPORTED = ['es', 'en'];
const BASE = 'es';                 // the language of data.json and of every string in the code
const LAUNCHED = window.BE_LANGUAGE_LAUNCHED === true;   // false until the owner decides; tests set it to check detection
const OTHER = 'en';                // a reader whose browser asks for neither language, once launched
const PREF = 'biblical-atlas:pref:idioma';
const NAMES = { es: 'Español', en: 'English' };

const fromQuery = () => {
  const v = new URLSearchParams(location.search).get('lang');
  return SUPPORTED.includes(v) ? v : null;
};
const stored = () => { try { const v = localStorage.getItem(PREF); return SUPPORTED.includes(v) ? v : null; } catch { return null; } };
/** The first of the browser's languages that the atlas has, by its main subtag («en-GB» is en); OTHER if none. */
function detected() {
  for (const tag of navigator.languages?.length ? navigator.languages : [navigator.language]) {
    const main = String(tag || '').toLowerCase().split('-')[0];
    if (SUPPORTED.includes(main)) return main;
  }
  return OTHER;
}
const current = fromQuery() || stored() || (LAUNCHED ? detected() : BASE);
document.documentElement.lang = current;
// The page carries its language in the address from the first moment, without a new history entry. Before launch a
// Spanish page keeps the address of always.
if ((LAUNCHED || current !== BASE) && fromQuery() !== current) {
  const u = new URL(location.href);
  u.searchParams.set('lang', current);
  history.replaceState(history.state, '', u);
}

// ---------------------------------------------------------------------------
// Interface strings
// ---------------------------------------------------------------------------
let strings = {};
/** The interface string `es` in the reader's language, with «{name}» filled from vars. Without a translation, Spanish. */
function t(es, vars) {
  const s = (current !== BASE && Object.prototype.hasOwnProperty.call(strings, es)) ? strings[es] : es;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

// ---------------------------------------------------------------------------
// Data layer
// ---------------------------------------------------------------------------
function loadScript(src) {
  return new Promise((ok) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = ok;
    document.head.appendChild(s);
  });
}
async function loadLayer(lang) {
  if (location.protocol === 'file:') {
    const name = `BIBLICAL_ATLAS_DATA_${lang.toUpperCase()}`;
    if (!window[name]) await loadScript(`data.${lang}.js`);
    if (!window[name]) throw new Error(`data.${lang}.js is missing next to index.html`);
    return window[name];
  }
  const r = await fetch(`data.${lang}.json`, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`data.${lang}.json answered ${r.status}`);
  return r.json();
}
/** Merges `over` into `base` in place: objects key by key, lists element by element (null keeps the element). */
function merge(base, over) {
  if (Array.isArray(over) && Array.isArray(base)) {
    over.forEach((x, i) => {
      if (x == null || i >= base.length) return;
      if (x && typeof x === 'object' && base[i] && typeof base[i] === 'object') merge(base[i], x);
      else base[i] = x;
    });
    return base;
  }
  for (const [k, x] of Object.entries(over)) {
    if (x && typeof x === 'object' && base[k] && typeof base[k] === 'object') merge(base[k], x);
    else if (x != null) base[k] = x;
  }
  return base;
}
// The collections of data.json: the ones keyed by id and the ones that are lists of records with an id.
const BY_ID = ['lugares', 'personas'];
const LISTS = ['eventos', 'viajes', 'cartas', 'periodos', 'hallazgos', 'recorridos'];
let books = {};   // slug -> { nombre, abr, slug } in the reader's language

/** Puts the reader's language over the data. Called by base.js once data.json is loaded, before anything reads it. */
async function apply(D) {
  if (current === BASE) return;
  try {
    const [layer] = await Promise.all([loadLayer(current), loadScript(`i18n/${current}.js`)]);
    strings = window.BE_I18N?.[current] || {};
    for (const k of BY_ID) {
      for (const [id, over] of Object.entries(layer[k] || {})) if (D[k]?.[id]) { merge(D[k][id], over); D[k][id]._lang = current; }
    }
    for (const k of LISTS) {
      const byId = new Map((D[k] || []).map((o) => [o.id, o]));
      for (const [id, over] of Object.entries(layer[k] || {})) if (byId.has(id)) { merge(byId.get(id), over); byId.get(id)._lang = current; }
    }
    for (const [id, over] of Object.entries(layer.fuentes || {})) if (D.fuentes?.[id]) merge(D.fuentes[id], over);
    books = layer.libros || {};
    translateDisplay();
    markUntranslated();
  } catch (err) {
    // Without the layer the site stays usable in Spanish and says why.
    BE.idioma.failure = err;
    setTimeout(() => BE.avisar?.(`English texts could not be loaded (${err.message}); showing Spanish.`, 6000), 0);
  }
}

/** Book references and chapter links in the reader's language: «Hch 16:13-15» reads «Ac 16:13-15» and opens the
    English study Bible at the same verses (jw.org uses the same verse anchors in every language). Data keeps its
    Spanish references: they are keys, like ids, and the parser of base.js reads them. */
function translateDisplay() {
  const urlCapituloEs = BE.urlCapitulo;
  BE.urlCapitulo = (lib, cap) => {
    const b = books[lib?.slug];
    return b?.slug ? `https://www.jw.org/${current}/library/bible/study-bible/books/${b.slug}/${cap}/` : urlCapituloEs(lib, cap);
  };
  BE.chipsCitas = (ref) => BE.citas(ref).map((c) => {
    const label = refText(c);
    return `<a class="be-ref" href="${BE.urlCita(c)}" ${BE.EXTERNO} title="${esc(t('Leer {cita} en jw.org', { cita: label }))}">${esc(label)}</a>`;
  }).join('');
}
function refText(c) {
  const b = books[c.libro?.slug];
  return b?.abr ? String(c.texto).replace(/^\s*[123]?\s?[^\d\s]+\.?(?=\s)/, b.abr) : c.texto;
}
/** A card of a record that has no translation yet opens with a line that says so, in both languages' place. */
function markUntranslated() {
  const lookup = { lugar: (id) => BE.L[id], persona: (id) => BE.PERS[id], evento: (id) => BE.D.eventos.find((e) => e.id === id) };
  for (const [kind, find] of Object.entries(lookup)) {
    const def = BE.tipo(kind);
    if (!def?.ficha) continue;
    const card = def.ficha;
    def.ficha = (id, ...rest) => {
      const o = find(id);
      const note = o && !o._lang ? `<p class="be-muted idioma-pendiente" lang="${current}">${esc(t('Esta ficha aún no está traducida: la ves en español.'))}</p>` : '';
      return note + card(id, ...rest);
    };
  }
}

// ---------------------------------------------------------------------------
// The switch
// ---------------------------------------------------------------------------
const other = () => (current === 'es' ? 'en' : 'es');
const visible = () => LAUNCHED || current !== BASE;
/** Stores the choice and opens the same view in the other language. */
function switchTo(lang) {
  try { localStorage.setItem(PREF, lang); } catch { /* no storage: the address still carries it */ }
  const u = new URL(location.href);
  u.searchParams.set('lang', lang);
  if (BE.D) u.hash = BE.textoHash();
  location.replace(u);
}
const label = (lang) => (lang === 'en' ? 'Read in English' : 'Leer en español');
function addButton() {
  if (!visible() || document.getElementById('idioma-boton')) return;
  const b = document.createElement('button');
  const to = other();
  b.type = 'button';
  b.id = 'idioma-boton';
  b.className = 'be-btn be-btn--sm be-btn--ghost idioma-boton';
  b.lang = to;
  b.title = label(to);
  b.setAttribute('aria-label', label(to));
  b.innerHTML = `<span aria-hidden="true">${to.toUpperCase()}</span>`;
  b.addEventListener('click', () => switchTo(to));
  const acerca = document.getElementById('acerca');
  acerca?.parentNode.insertBefore(b, acerca);
}
/** The Estudio menu entry (recorridos.js paints the menu and asks for it). Empty while the switch is hidden. */
const menuItem = () => (visible()
  ? `<div class="be-caps menu-titulo">${esc(t('Idioma'))}</div><button type="button" role="menuitem" data-idioma="${other()}" lang="${other()}">${NAMES[other()]}</button>`
  : '');
document.addEventListener('click', (e) => {
  const b = e.target.closest?.('[data-idioma]');
  if (b) switchTo(b.dataset.idioma);
});
document.addEventListener('DOMContentLoaded', addButton);

BE.t = t;
BE.idioma = { current, apply, menuItem, switchTo, launched: LAUNCHED, merge };
})();
