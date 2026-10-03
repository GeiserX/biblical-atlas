/* biblical-atlas · deep links by passage: «#p=Hch16:1» opens the atlas at what the passage tells.

   The parsing and the matching follow lookup_passage of the atlas MCP server (internal/atlas/reference.go), so both
   answer the same for the same passage:
   - A book is found by any of its written forms (name, TNM abbreviation, slug, search forms, spoken forms), compared
     without accents, case, spaces, dots or hyphens: «Hch», «Hechos», «2Re», «2 Reyes», «2-reyes» and «Génesis» all work.
   - A passage is one book and one stretch: a chapter («Hch16»), chapters («Hch16-17»), a verse («Hch16:1»), verses in a
     chapter («Hch16:1-5») or verses across chapters («Hch13:1-14:28»). A one-chapter book is cited by verse («Flm10»).
   - A reference in the data is split like the server splits it: «;» separates parts, a part with no book is of the book
     before it, each comma item is its own stretch («Gé 6:1, 2, 4» never covers verse 3) and items that touch join.
   - A record matches when one of its stretches shares at least one verse with the passage.

   Lookup order (docs/usage.md and docs/how-it-works.md say it for readers): events by their `pasajes`, the same rule as
   lookup_passage; then journey stops, letters and journeys by their `referencia`. Inside each group, by the date the
   timeline gives them. The first match opens; the card lists every match so the reader can switch. With no match the
   panel says so and offers the chapter's card when the chapter has data.

   The pure part (parsePassage, parseRefs, overlaps, compact) runs in node:vm in tests/site/passage-link.test.mjs; the
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

const ITEM = /^(\d{1,4})(?:\s*:\s*(\d{1,4}))?(?:\s*[-–—]\s*(\d{1,4})(?:\s*:\s*(\d{1,4}))?)?$/;
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
    { ok: false, why }: 'book' when no book is named, 'numbers' when the chapter or verse does not exist or does not read. */
function parsePassage(text) {
  const s = String(text || '').trim();
  const m = s.match(/^((?:[123][\s-]*)?\p{L}[\p{L}\s.\-]*?)\s*\.?\s*(\d.*)$/u);
  if (!m) { const book = bookOf(s); return book ? { ok: false, why: 'numbers', book } : { ok: false, why: 'book' }; }
  const book = bookOf(m[1]);
  if (!book) return { ok: false, why: 'book' };
  const rs = numbers(book, m[2].replace(/\s+/g, ''));
  if (!rs || rs.length !== 1 || !valid(rs[0]) || m[2].includes(',')) return { ok: false, why: 'numbers', book };
  return { ok: true, stretch: rs[0] };
}
/** A stretch as a link writes it: the abbreviation without accents and no spaces, «Hch16:1-5», «Ge12», «Flm10». */
function compact(r) {
  const a = r.book.abr.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
/** Every record that carries a passage, with its stretches, in lookup order: [{ sel, stretches }]. Built once per data. */
function records() {
  if (index && index.D === BE.D && index.books === BE.LIBROS) return index.list;
  const D = BE.D, list = [];
  for (const e of D.eventos || []) list.push({ sel: `evento:${e.id}`, stretches: (e.pasajes || []).flatMap(parseRefs) });
  for (const v of D.viajes || []) {
    for (const p of v.paradas || []) list.push({ sel: `parada:${v.id}/${p.orden}`, stretches: parseRefs(p.referencia) });
  }
  for (const c of D.cartas || []) list.push({ sel: `carta:${c.id}`, stretches: parseRefs(c.referencia) });
  for (const v of D.viajes || []) list.push({ sel: `viaje:${v.id}`, stretches: parseRefs(v.referencia) });
  index = { D, books: BE.LIBROS, list: list.filter((x) => x.stretches.length) };
  return index.list;
}
const kind = (sel) => sel.slice(0, sel.indexOf(':'));
/** The records that cite a stretch, in lookup order: by group, then by the date the timeline gives them. */
function matches(r) {
  const rank = new Map(GROUPS.map(([k], i) => [k, i]));
  const found = records().filter((x) => x.stretches.some((s) => overlaps(s, r))).map((x) => x.sel).filter((s) => BE.parseSel(s));
  const when = new Map(found.map((s) => [s, BE.momentoDe(BE.parseSel(s)) ?? Infinity]));
  return found.map((s, i) => ({ s, i })).sort((a, b) => rank.get(kind(a.s)) - rank.get(kind(b.s)) || when.get(a.s) - when.get(b.s) || a.i - b.i).map((x) => x.s);
}
/** A passage of a link → { text, readable, stretch, found } or { text, error }. */
function resolve(text) {
  const p = parsePassage(text);
  if (!p.ok) return { text, error: p.why, book: p.book || null };
  return { text: compact(p.stretch), readable: readable(p.stretch), stretch: p.stretch, found: matches(p.stretch) };
}

// ---------------------------------------------------------------------------
// The page: the «p» parameter, the list of matches on the card, the notice with no match and «Enlace al pasaje»
// ---------------------------------------------------------------------------
/** The passage of the link that opened this view, while the view still shows it: { text, readable, stretch, found }. */
let active = null;
const showing = () => !!active && (active.found?.length ? !!E.sel && active.found.includes(BE.selTexto(E.sel)) : !E.sel);

BE.parametros.push({
  nombre: 'p',
  escribir: () => (showing() ? active.text : null),
  leer(v) { active = v ? resolve(v) : null; },
});
/** base.js, reading the address: with a passage and no selection, the first record that cites it. */
BE.selDePasaje = () => (active?.found?.length ? BE.parseSel(active.found[0]) : null);

const label = (sel) => GROUPS.find(([k]) => k === kind(sel))?.[1] || '';
function dateOf(sel) {
  const s = BE.parseSel(sel);
  const t = BE.fechaSel?.(s);
  if (t) return t;
  const m = BE.momentoDe(s);
  return m != null ? BE.fmtAnio(Math.floor(m)) : '';
}
/** The chapter card a passage can fall back on, when that chapter has something in the atlas. */
function chapterSel(r) {
  const id = BE.idPasaje?.(r.book, r.c1);
  return id && BE.existe('pasaje', id) && BE.implicados({ tipo: 'pasaje', id }).claves.size ? `pasaje:${id}` : null;
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
    <p class="be-card__body">${n === 1 ? 'Lo cita esta ficha del atlas.' : `Lo citan ${n} fichas del atlas, por fecha. Se abre la primera.`}</p>
    ${n > 1 ? `<div class="be-list">${rows.slice(0, SHOWN).join('')}</div>` : ''}
    ${n > SHOWN ? `<details class="pasaje-enlace__mas"${a.found.indexOf(cur) >= SHOWN ? " open" : ""}><summary>Ver las otras ${n - SHOWN}</summary><div class="be-list">${rows.slice(SHOWN).join('')}</div></details>` : ''}
  </div><div class="be-card__foot"><span class="be-spacer"></span>${read}</div></section>`;
}
function noticeHtml() {
  const a = active;
  if (a.error) {
    const what = a.error === 'book' ? `No reconozco «${esc(a.text)}» como pasaje de la Biblia.` : `${esc(a.book?.nombre || 'Ese libro')} no tiene ese capítulo o ese versículo: «${esc(a.text)}».`;
    return `<section class="be-card pasaje-enlace" role="status"><div class="be-card__pad">
      <div class="be-card__eyebrow">Enlace al pasaje</div><p class="be-card__body">${what} Se escribe el libro y el capítulo, con el versículo si hace falta: <code>#p=Hch16:1</code> o <code>#p=Génesis12</code>.</p>
    </div><div class="be-card__foot"><span class="be-spacer"></span><button type="button" class="be-btn be-btn--sm" data-pasaje-cerrar>Cerrar</button></div></section>`;
  }
  const cap = chapterSel(a.stretch);
  return `<section class="be-card pasaje-enlace" role="status"><div class="be-card__pad">
    <div class="be-card__eyebrow">Enlace al pasaje · ${esc(a.readable)}</div>
    <p class="be-card__body">Ningún suceso, parada, carta ni viaje del atlas cita todavía ${esc(a.readable)}.${cap ? ` Del capítulo sí hay datos.` : ''}</p>
    ${cap ? `<div class="be-list">${BE.botonSel(cap, `Ver ${BE.nombreSel(BE.parseSel(cap))}`, 'lo que el atlas tiene de ese capítulo')}</div>` : ''}
  </div><div class="be-card__foot"><button type="button" class="be-btn be-btn--sm" data-pasaje-cerrar>Cerrar</button><span class="be-spacer"></span><a class="be-wol" href="${BE.urlCita(cita(a.stretch))}" ${BE.EXTERNO}>Leer ${esc(a.readable)} en jw.org</a></div></section>`;
}
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
  // The list goes under the card it opened (and its «Citar» row); the notice, with nothing selected, above «Ahora mismo».
  const after = active.found?.length && (body.querySelector(':scope > .acciones-estudio') || body.querySelector(':scope > .be-card'));
  if (after) after.insertAdjacentHTML('afterend', listHtml());
  else body.insertAdjacentHTML('afterbegin', active.found?.length ? listHtml() : noticeHtml());
}
BE.pintores.push(paint);

/** The passage link of a selection: the passage that opened it, or its own first reference. «&sel=» goes with it when
    the passage would open something else first. null when the selection has no reference. */
function linkFor(sel) {
  if (!sel || !BE.D) return null;
  const s = BE.selTexto(sel);
  let text = showing() && active.found?.includes(s) ? active.text : null;
  if (!text) {
    const own = records().find((x) => x.sel === s)?.stretches[0];
    const chapter = sel.tipo === 'pasaje' && BE.pasajeDeId(sel.id);
    const r = own || (chapter && { book: chapter.libro, c1: chapter.cap, c2: chapter.cap, v1: 0, v2: lastVerse(chapter.libro, chapter.cap), verses: false });
    if (!r) return null;
    text = compact(r);
  }
  const first = resolve(text).found?.[0];
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
