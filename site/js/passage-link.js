/* biblical-atlas · deep links by passage: «#p=Hch16:1» opens the atlas at what the passage tells.

   The parsing and the matching follow lookup_passage of the atlas MCP server (internal/atlas/reference.go), so both
   find the same events for the same passage. The order is the site's own: the server keeps the order of the data (by
   date), the site puts the principal passage first (below):
   - A book is found by any of its written forms (name, TNM abbreviation, slug, search forms, spoken forms), compared
     without accents, case, spaces, dots or hyphens: «Hch», «Hechos», «2Re», «2 Reyes», «2-reyes» and «Génesis» all work.
   - A passage is one book and one stretch: a chapter («Hch16»), chapters («Hch16-17»), a verse («Hch16:1»), verses in a
     chapter («Hch16:1-5») or verses across chapters («Hch13:1-14:28»). A one-chapter book is cited by verse («Flm10»).
     Comma items that join into one stretch are that stretch («Hch16:1, 2» is «Hch16:1-2»); items that do not join are
     refused with their own notice.
   - A reference in the data is split like the server splits it: «;» separates parts, a part with no book is of the book
     before it, each comma item is its own stretch («Gé 6:1, 2, 4» never covers verse 3) and items that touch join.
   - A record matches when one of its stretches shares at least one verse with the passage.

   Lookup order (docs/usage.md and docs/how-it-works.md say it for readers): events by their `pasajes`, the same rule as
   lookup_passage; then journey stops, letters and journeys by their `referencia`. Inside each group, the records whose
   principal passage (the first of `pasajes`, the first part of `referencia`) cites it come first, then by the date the
   timeline gives them, and on the same date by the narrative order and the id. The first match opens; the card lists
   every match so the reader can switch. With no match the chapter card opens, with a line that nothing cites the
   passage. A book alone («#p=Rut») opens the book card. What does not read as one passage (an unknown book, a verse
   its book lacks, «Hch16:1, 5») gets a notice and selects nothing.

   The pure part (parsePassage, parseRefs, overlaps, compact) runs in node:vm in tests/site/enlaces-pasaje-reglas.test.mjs; the
   wiring below it needs the page. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, norm } = BE;

// ---------------------------------------------------------------------------
// Books
// ---------------------------------------------------------------------------
const bookKey = (s) => norm(s).replace(/[\s.\-]+/g, '');
let booksFor = null, byKey = new Map();
/** The book of any written form, or null. The first book to claim a form keeps it, as on the server. */
function bookOf(s) {
  if (booksFor !== BE.LIBROS) {
    booksFor = BE.LIBROS;
    byKey = new Map();
    for (const b of BE.LIBROS || []) {
      for (const f of [b.abr, b.nombre, b.slug, ...(b.formas || []), ...(b.habladas || [])]) {
        const k = f == null ? '' : bookKey(f);
        if (k && !byKey.has(k)) byKey.set(k, b);
      }
    }
  }
  return byKey.get(bookKey(s)) || null;
}
const chaptersOf = (b) => b.capitulos || b.versiculos?.length || 0;
const lastVerse = (b, c) => b.versiculos?.[c - 1] || 999;

// ---------------------------------------------------------------------------
// Stretches: { book, c1, v1, c2, v2 }, v1 = 0 for the start of a whole chapter, v2 always a real verse
// ---------------------------------------------------------------------------
const before = (c1, v1, c2, v2) => c1 < c2 || (c1 === c2 && v1 < v2);
/** Do two stretches share at least one verse? */
const overlaps = (a, b) => a.book.num === b.book.num && !before(a.c2, a.v2, b.c1, b.v1) && !before(b.c2, b.v2, a.c1, a.v1);
/** Does `next`, written after `prev`, start inside it or on the verse right after it? */
function touches(prev, next) {
  if (before(next.c1, next.v1, prev.c1, prev.v1)) return false;
  let c = prev.c2, v = prev.v2 + 1;
  if (prev.v2 >= lastVerse(prev.book, prev.c2)) { c = prev.c2 + 1; v = 1; }
  return !before(c, v, next.c1, next.v1);
}
/** Every stretch exists in its book and ends after it starts. */
function valid(r) {
  const n = chaptersOf(r.book);
  if (r.c1 < 1 || r.c2 < 1 || (n && (r.c1 > n || r.c2 > n))) return false;
  if (r.verses && [[r.c1, r.v1], [r.c2, r.v2]].some(([c, v]) => v < 1 || v > lastVerse(r.book, c))) return false;
  return !before(r.c2, r.v2, r.c1, r.v1);
}

const ITEM = /^(\d{1,4})(?:\s*:\s*(\d{1,4}))?(?:\s*[-\u2013\u2014]\s*(\d{1,4})(?:\s*:\s*(\d{1,4}))?)?$/;
/** The chapter and verse part of one reference: every comma item a stretch, joined to the one before when they touch.
    null when an item is not numbers. */
function numbers(book, s) {
  const items = [];
  for (const raw of s.split(',')) {
    const m = raw.trim().match(ITEM);
    if (!m) return null;
    items.push({ a: +m[1], b: m[2] != null ? +m[2] : null, c: m[3] != null ? +m[3] : null, d: m[4] != null ? +m[4] : null });
  }
  const single = chaptersOf(book) === 1 && items[0].b == null;
  const out = [];
  let chapter = 0;
  items.forEach((it, i) => {
    const r = { book, verses: true };
    if (single) Object.assign(r, { c1: 1, v1: it.a, c2: 1, v2: it.c ?? it.a });
    else if (it.b != null) {
      chapter = it.a;
      Object.assign(r, { c1: it.a, v1: it.b });
      if (it.c != null && it.d != null) { r.c2 = it.c; r.v2 = it.d; chapter = it.c; } else { r.c2 = it.a; r.v2 = it.c ?? it.b; }
    } else if (chapter > 0 && i > 0) Object.assign(r, { c1: chapter, v1: it.a, c2: chapter, v2: it.c ?? it.a });
    else {
      r.c1 = it.a;
      if (it.c != null && it.d != null) { r.c2 = it.c; r.v2 = it.d; } else { r.verses = false; r.c2 = it.c ?? it.a; r.v2 = lastVerse(book, r.c2); }
      r.v1 = 0;
    }
    const prev = out.at(-1);
    if (prev && touches(prev, r)) {
      if (before(prev.c2, prev.v2, r.c2, r.v2)) { prev.c2 = r.c2; prev.v2 = r.v2; }
      prev.verses = prev.verses || r.verses;
      return;
    }
    out.push(r);
  });
  for (const r of out) { if (r.verses && r.v1 === 0) r.v1 = 1; if (!r.verses) r.v1 = 0; }
  return out;
}
const HEAD = /^(?:[123][\s-]*)?\p{L}+/u, WORD = /^[\s-]+\p{L}+/u;
/** The book name at the front of a part: the longest run of leading words that names a book. */
function splitBook(part) {
  const head = part.match(HEAD)?.[0];
  if (!head) return null;
  const ends = [head.length];
  for (let pos = head.length; ;) {
    const w = part.slice(pos).match(WORD)?.[0];
    if (!w) break;
    pos += w.length;
    ends.push(pos);
  }
  for (let i = ends.length - 1; i >= 0; i--) {
    const b = bookOf(part.slice(0, ends[i]));
    if (b) return { book: b, rest: part.slice(ends[i]) };
  }
  return { book: null, rest: '' };
}
/** A reference of the data («Gé 2:7, 8; 5:1-5») → its stretches. A reference that does not read, or names a chapter or
    a verse its book lacks, gives none, as on the server. */
function parseRefs(s) {
  const out = [];
  let book = null;
  for (let part of String(s || '').split(';')) {
    part = part.trim();
    if (!part) continue;
    const sp = splitBook(part);
    if (sp && !sp.book) return [];
    if (sp) book = sp.book;
    if (!book) return [];
    const rest = (sp ? sp.rest : part).trim().replace(/^\./, '').trim();
    if (!rest) return [];   // a book alone is not a stretch the data uses
    const rs = numbers(book, rest);
    if (!rs || !rs.every(valid)) return [];
    out.push(...rs);
  }
  return out;
}
/** One passage of a link («Hch16:1», «2 Reyes 17:6», «Génesis 12», «Hch13:1-14:28») → { ok, stretch } or
    { ok: false, why }: 'book' when no book is named, 'numbers' when the chapter or verse does not exist or does not read,
    'stretches' when its comma items do not join into one stretch («Hch16:1, 5»), 'chapter' when it names a book alone. */
function parsePassage(text) {
  const s = String(text || '').trim();
  const m = s.match(/^((?:[123][\s-]*)?\p{L}[\p{L}\s.\-]*?)\s*\.?\s*(\d.*)$/u);
  if (!m) { const book = bookOf(s); return book ? { ok: false, why: 'chapter', book } : { ok: false, why: 'book' }; }
  const book = bookOf(m[1]);
  if (!book) return { ok: false, why: 'book' };
  const rs = numbers(book, m[2].replace(/\s+/g, ''));
  if (!rs || !rs.every(valid)) return { ok: false, why: 'numbers', book };
  if (rs.length !== 1) return { ok: false, why: 'stretches', book };
  return { ok: true, stretch: rs[0] };
}
/** A stretch as a link writes it: the abbreviation without accents and no spaces, «Hch16:1-5», «Ge12», «Flm10». */
const abbr = (b) => b.abr.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function compact(r) {
  const a = abbr(r.book);
  if (!r.verses) return r.c1 === r.c2 ? `${a}${r.c1}` : `${a}${r.c1}-${r.c2}`;
  if (chaptersOf(r.book) === 1) return r.v1 === r.v2 ? `${a}${r.v1}` : `${a}${r.v1}-${r.v2}`;
  if (r.c1 === r.c2) return r.v1 === r.v2 ? `${a}${r.c1}:${r.v1}` : `${a}${r.c1}:${r.v1}-${r.v2}`;
  return `${a}${r.c1}:${r.v1}-${r.c2}:${r.v2}`;
}
/** A stretch as a reader reads it: «Hechos 16:1-5», «Filemón 10», «Hechos 13:1-14:28». */
function readable(r) {
  const n = r.book.nombre;
  if (!r.verses) return r.c1 === r.c2 ? `${n} ${r.c1}` : `${n} ${r.c1}-${r.c2}`;
  if (chaptersOf(r.book) === 1) return r.v1 === r.v2 ? `${n} ${r.v1}` : `${n} ${r.v1}-${r.v2}`;
  if (r.c1 === r.c2) return r.v1 === r.v2 ? `${n} ${r.c1}:${r.v1}` : `${n} ${r.c1}:${r.v1}-${r.v2}`;
  return `${n} ${r.c1}:${r.v1}-${r.c2}:${r.v2}`;
}

// ---------------------------------------------------------------------------
// Matching against the data
// ---------------------------------------------------------------------------
const GROUPS = [
  ['evento', 'Suceso'], ['parada', 'Parada'], ['carta', 'Carta'], ['viaje', 'Viaje'],
];
let index = null;
/** Every record that carries a passage, with its stretches, in lookup order: [{ sel, stretches, first }]. `first` are the
    stretches of its principal passage: the first of an event's `pasajes`, the first part («;») of a `referencia`.
    Built once per data. */
function records() {
  if (index && index.D === BE.D && index.books === BE.LIBROS) return index.list;
  const D = BE.D, list = [];
  // The narrative order, as build.py's orden_en_serie: [series, order]; a stop goes by its order in the journey.
  const rel = (o) => [o?.serie || '', o?.orden ?? 1e9];
  const ref = (sel, s, r = rel()) => list.push({ sel, stretches: parseRefs(s), first: parseRefs(String(s || '').split(';')[0]), rel: r });
  for (const e of D.eventos || []) list.push({ sel: `evento:${e.id}`, stretches: (e.pasajes || []).flatMap(parseRefs), first: parseRefs(e.pasajes?.[0]), rel: rel(e.orden_relato) });
  for (const v of D.viajes || []) {
    for (const p of v.paradas || []) ref(`parada:${v.id}/${p.orden}`, p.referencia, rel({ orden: p.orden }));
  }
  for (const c of D.cartas || []) ref(`carta:${c.id}`, c.referencia);
  for (const v of D.viajes || []) ref(`viaje:${v.id}`, v.referencia, rel(v.orden_relato));
  index = { D, books: BE.LIBROS, list: list.filter((x) => x.stretches.length) };
  return index.list;
}
const kind = (sel) => sel.slice(0, sel.indexOf(':'));
/** The records that cite a stretch, in lookup order: by group (events first, as on the server); inside a group, those
    whose principal passage cites it before those that cite it further down their list (a sermon in Hch 13 that recalls
    the birth of Isaac), then by the date the timeline gives them; on the same date, by the narrative order and then the
    id, as build.py sorts them, so the order never leans on the order of the data. */
function matches(r) {
  const rank = new Map(GROUPS.map(([k], i) => [k, i]));
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const found = records().filter((x) => x.stretches.some((s) => overlaps(s, r)) && BE.parseSel(x.sel))
    .map((x) => ({ s: x.sel, rel: x.rel, side: x.first.some((s) => overlaps(s, r)) ? 0 : 1, t: BE.momentoDe(BE.parseSel(x.sel)) ?? Infinity }));
  return found.sort((a, b) => rank.get(kind(a.s)) - rank.get(kind(b.s)) || a.side - b.side || a.t - b.t
    || cmp(a.rel[0], b.rel[0]) || a.rel[1] - b.rel[1] || cmp(a.s, b.s)).map((x) => x.s);
}
/** The chapter card of a stretch: its first chapter. */
function chapterSel(r) {
  const id = BE.idPasaje?.(r.book, r.c1);
  return id && BE.existe('pasaje', id) ? `pasaje:${id}` : null;
}
/** A passage of a link → { text, readable, stretch, found, opens } or { text, error }. `opens` is what the link selects,
    first the one it opens: the records that cite it; with none, the card of its chapter; for a book alone, the card of
    the book. */
function resolve(text) {
  const p = parsePassage(text);
  if (!p.ok && p.why === 'chapter' && BE.existe('libro', p.book.slug)) {
    return { text: abbr(p.book), readable: p.book.nombre, book: p.book, found: [], opens: [`libro:${p.book.slug}`] };
  }
  if (!p.ok) return { text, error: p.why, book: p.book || null };
  const found = matches(p.stretch), chapter = found.length ? null : chapterSel(p.stretch);
  return { text: compact(p.stretch), readable: readable(p.stretch), stretch: p.stretch, found, opens: found.length ? found : chapter ? [chapter] : [] };
}

// ---------------------------------------------------------------------------
// The page: the «p» parameter, the list of matches on the card, the notice with no match and «Enlace al pasaje»
// ---------------------------------------------------------------------------
/** The passage of the link that opened this view, while the view still shows it: what resolve gives. */
let active = null;
const opens = () => active?.opens || [];
const showing = () => !!active && (opens().length ? !!E.sel && opens().includes(BE.selTexto(E.sel)) : !E.sel);

// historia: a passage link is a view of its own, also with nothing selected (its notice), and the history names it.
BE.parametros.push({
  nombre: 'p',
  historia: true,
  escribir: () => (showing() ? active.text : null),
  leer(v) { active = v ? resolve(v) : null; },
});
/** base.js, reading the address: with a passage and no selection, the first record that cites it, or the card of its
    chapter or its book. */
BE.selDePasaje = () => (opens().length ? BE.parseSel(opens()[0]) : null);

const label = (sel) => GROUPS.find(([k]) => k === kind(sel))?.[1] || '';
function dateOf(sel) {
  const s = BE.parseSel(sel);
  const t = BE.fechaSel?.(s);
  if (t) return t;
  const m = BE.momentoDe(s);
  return m != null ? BE.fmtAnio(Math.floor(m)) : '';
}
const SHOWN = 8;   // rows before «Ver las otras N»: a long range (Hch 13:1-14:28) is cited by 42 records
function listHtml() {
  const a = active, cur = BE.selTexto(E.sel), n = a.found.length;
  const rows = a.found.map((s) => {
    const meta = esc([label(s), dateOf(s)].filter(Boolean).join(' · '));
    if (s === cur) return `<div class="be-row fila-actual" aria-current="true"><span><span class="be-row__title">${esc(BE.nombreSel(BE.parseSel(s)))}</span><span class="be-row__meta">${meta} · abierto</span></span></div>`;
    return BE.botonSel(s, BE.nombreSel(BE.parseSel(s)), meta);
  });
  const read = `<a class="be-wol" href="${BE.urlCita(cita(a.stretch))}" ${BE.EXTERNO}>Leer ${esc(a.readable)} en jw.org</a>`;
  return `<section class="be-card pasaje-enlace" aria-label="${esc(`Lo que cita ${a.readable}`)}"><div class="be-card__pad">
    <div class="be-card__eyebrow">Enlace al pasaje · ${esc(a.readable)}</div>
    <p class="be-card__body">${n === 1 ? 'Lo cita esta ficha del atlas.' : `Lo citan ${n} fichas del atlas. Se abre la primera.`}</p>
    ${n > 1 ? `<div class="be-list">${rows.slice(0, SHOWN).join('')}</div>` : ''}
    ${n > SHOWN ? `<details class="pasaje-enlace__mas"${a.found.indexOf(cur) >= SHOWN ? " open" : ""}><summary>Ver las otras ${n - SHOWN}</summary><div class="be-list">${rows.slice(SHOWN).join('')}</div></details>` : ''}
  </div><div class="be-card__foot"><span class="be-spacer"></span>${read}</div></section>`;
}
/** The notice of a link that opens nothing: a book it does not know, a chapter or a verse its book lacks, two stretches. */
function noticeHtml() {
  const a = active;
  const what = a.error === 'book' ? `No reconozco «${esc(a.text)}» como pasaje de la Biblia.`
    : a.error === 'stretches' ? `«${esc(a.text)}» junta tramos separados, y un enlace lleva uno solo.`
      : a.error === 'chapter' ? `«${esc(a.text)}» nombra ${esc(a.book.nombre)}, pero le falta el capítulo.`
      : `${esc(a.book?.nombre || 'Ese libro')} no tiene ese capítulo o ese versículo: «${esc(a.text)}».`;
  return `<section class="be-card pasaje-enlace" role="status"><div class="be-card__pad">
    <div class="be-card__eyebrow">Enlace al pasaje</div><p class="be-card__body">${what} Se escribe el libro y el capítulo, con el versículo si hace falta: <code>#p=Hch16:1</code> o <code>#p=Génesis12</code>.</p>
  </div><div class="be-card__foot"><span class="be-spacer"></span><button type="button" class="be-btn be-btn--sm" data-pasaje-cerrar>Cerrar</button></div></section>`;
}
/** The line a chapter card opened by a passage that nothing cites carries: says so and links the passage on jw.org. */
const noneHtml = (a) => `<p class="be-card__body pasaje-enlace" role="status">Ningún suceso, parada, carta ni viaje del atlas cita todavía <a href="${BE.urlCita(cita(a.stretch))}" ${BE.EXTERNO}>${esc(a.readable)}</a>.</p>`;
/** A stretch in the shape BE.urlCita reads. */
const cita = (r) => ({ libro: r.book, cap: r.c1, capFin: r.c2, verso: r.verses ? r.v1 : null, versoFin: r.verses ? r.v2 : null });

let painted = '';
function paint() {
  const body = BE.$('#panel-cuerpo');
  if (!body) return;
  if (active && !showing()) { active = null; BE.guardarHash(); }
  const old = body.querySelector('.pasaje-enlace');
  const key = active ? `${active.text}|${BE.selTexto(E.sel)}` : '';
  if (!active) { old?.remove(); painted = ''; return; }
  if (old && key === painted) return;
  old?.remove();
  painted = key;
  // The list goes under the card it opened (and its «Citar» row); the line that nothing cites the passage, inside the
  // chapter card it opened; a book card goes as it is; the notice, with nothing selected, above «Ahora mismo».
  if (active.found?.length) {
    const after = body.querySelector(':scope > .acciones-estudio') || body.querySelector(':scope > .be-card');
    if (after) after.insertAdjacentHTML('afterend', listHtml()); else body.insertAdjacentHTML('afterbegin', listHtml());
  } else if (E.sel?.tipo === 'pasaje') body.querySelector(':scope > .be-card .be-card__pad')?.insertAdjacentHTML('beforeend', noneHtml(active));
  else if (!E.sel) body.insertAdjacentHTML('afterbegin', noticeHtml());
}
BE.pintores.push(paint);

/** The passage link of a selection: the passage that opened it, or its own first reference. «&sel=» goes with it when
    the passage would open something else first. null when the selection has no reference, and for a book: «#p=Rut»
    opens its card, but a book is not a passage, so its card has no «Enlace al pasaje» however it was reached. */
function linkFor(sel) {
  if (!sel || !BE.D || sel.tipo === 'libro') return null;
  const s = BE.selTexto(sel);
  let text = showing() && opens().includes(s) ? active.text : null;
  if (!text) {
    const own = records().find((x) => x.sel === s)?.stretches[0];
    const chapter = sel.tipo === 'pasaje' && BE.pasajeDeId(sel.id);
    const r = own || (chapter && { book: chapter.libro, c1: chapter.cap, c2: chapter.cap, v1: 0, v2: lastVerse(chapter.libro, chapter.cap), verses: false });
    if (!r) return null;
    text = compact(r);
  }
  const first = resolve(text).opens?.[0];
  const hash = `p=${encodeURIComponent(text).replace(/%3A/g, ':')}${first && first !== s && sel.tipo !== 'pasaje' ? `&sel=${s}` : ''}`;
  return { text, url: `${location.origin}${location.pathname}#${hash}` };
}

/** «Enlace al pasaje» next to «Citar», on every card whose selection has a passage. */
function shareButton() {
  const row = BE.$('#panel-cuerpo .acciones-estudio');
  if (!row || row.querySelector('[data-enlace-pasaje]') || !E.sel) return;
  const l = linkFor(E.sel);
  if (!l) return;
  row.insertAdjacentHTML('beforeend', `<button type="button" class="be-btn be-btn--sm be-btn--ghost" data-enlace-pasaje title="${esc(`Copia el enlace que abre ${l.text} en el atlas`)}">Enlace al pasaje</button>`);
}
BE.pintores.push(shareButton);

document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-pasaje-cerrar]')) { active = null; BE.guardarHash(); BE.pintarPanel(true); BE.programar(); return; }
  if (!e.target.closest('[data-enlace-pasaje]')) return;
  const l = linkFor(E.sel);
  if (!l) return;
  try { await navigator.clipboard.writeText(l.url); BE.avisar(`Enlace al pasaje copiado: abre ${l.text} en el atlas.`); }
  catch { window.prompt('Copia el enlace al pasaje:', l.url); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && active && !E.sel) { active = null; BE.guardarHash(); BE.programar(); }
});

BE.pasajeEnlace = { parsePassage, parseRefs, overlaps, compact, readable, resolve, matches, linkFor, get active() { return active; } };
})();
