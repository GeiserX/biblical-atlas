// The rules of a passage link (#p=Hch16:1, site/js/passage-link.js) without a browser: how a link names a passage, how
// a reference of the data splits into stretches, when two stretches share a verse, and how a link writes a passage
// back. They follow lookup_passage of the atlas MCP server (internal/atlas/reference.go), so the site and the server
// answer the same. Runs the real base.js, tipos/libro.js and passage-link.js in a vm.
//
//   node --test tests/site/enlaces-pasaje-reglas.test.mjs
// With site/data.json (or BE_DATA_FILE=<data.json>) it also reads every reference of the data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// base.js touches the page while it loads; a stub that answers any property or call with itself stands in for it.
const nada = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : nada), apply: () => nada, construct: () => nada });
const window = {};
const ctx = { window, document: nada, location: { protocol: 'https:', hash: '', href: '', origin: 'https://x', pathname: '/' }, console,
  encodeURIComponent, setTimeout, ResizeObserver: nada, matchMedia: nada, localStorage: nada, sessionStorage: nada,
  navigator: nada, requestAnimationFrame: nada, addEventListener: nada };
for (const f of ['base.js', 'tipos/libro.js', 'passage-link.js']) {
  vm.runInNewContext(fs.readFileSync(new URL(`../../site/js/${f}`, import.meta.url), 'utf8'), ctx, { filename: f });
}
const { BE } = window;
const P = BE.pasajeEnlace;
const books = [
  { slug: 'genesis', num: 1, nombre: 'Génesis', abr: 'Gé', formas: ['ge', 'gen', 'genesis'], habladas: ['Génesis'], capitulos: 50,
    versiculos: Object.assign(Array(50).fill(30), { 5: 22 }) },
  { slug: '2-reyes', num: 12, nombre: '2 Reyes', abr: '2Re', formas: ['2re', '2reyes'], capitulos: 25, versiculos: Array(25).fill(41) },
  { slug: 'el-cantar-de-los-cantares', num: 22, nombre: 'El Cantar de los Cantares', abr: 'Can', formas: ['can', 'cantar', 'cantardeloscantares'], capitulos: 8, versiculos: Array(8).fill(17) },
  { slug: 'hechos', num: 44, nombre: 'Hechos', abr: 'Hch', formas: ['hch', 'hech', 'hechos', 'he'], capitulos: 28,
    versiculos: [26, 47, 26, 37, 42, 15, 60, 40, 43, 48, 30, 25, 52, 28, 41, 40, 34, 28, 41, 38, 40, 30, 35, 27, 27, 32, 44, 31] },
  { slug: 'filemon', num: 57, nombre: 'Filemón', abr: 'Flm', formas: ['flm', 'filemon'], capitulos: 1, versiculos: [25] },
];
BE.ponerLibros(books.map((b) => ({ ...b })));
const span = (r) => r && [r.book.abr, r.c1, r.v1, r.c2, r.v2];
const one = (s) => { const p = P.parsePassage(s); return p.ok ? span(p.stretch) : p.why; };

test('a link names a book by its abbreviation, its name or its slug, with or without accents and spaces', () => {
  for (const s of ['Hch16:1', 'hch16:1', 'Hch 16:1', 'Hch. 16:1', 'Hechos 16:1', 'hechos16:1', 'He16:1']) assert.deepEqual(one(s), ['Hch', 16, 1, 16, 1], s);
  for (const s of ['Gé12:1', 'Ge12:1', 'Génesis 12:1', 'genesis12:1', 'GÉNESIS12:1']) assert.deepEqual(one(s), ['Gé', 12, 1, 12, 1], s);
  for (const s of ['2Re17:6', '2 Re 17:6', '2 Reyes 17:6', '2-reyes 17:6', '2reyes17:6']) assert.deepEqual(one(s), ['2Re', 17, 6, 17, 6], s);
  assert.deepEqual(one('El Cantar de los Cantares 2:1'), ['Can', 2, 1, 2, 1]);
});
test('a chapter, chapters, verses in a chapter and verses across chapters', () => {
  assert.deepEqual(one('Hch16'), ['Hch', 16, 0, 16, 40]);
  assert.deepEqual(one('Hch16-17'), ['Hch', 16, 0, 17, 34]);
  assert.deepEqual(one('Hch16:1-5'), ['Hch', 16, 1, 16, 5]);
  assert.deepEqual(one('Hch16:1–5'), ['Hch', 16, 1, 16, 5]);
  assert.deepEqual(one('Hch13:1-14:28'), ['Hch', 13, 1, 14, 28]);
});
test('a one-chapter book is cited by verse', () => {
  assert.deepEqual(one('Flm10'), ['Flm', 1, 10, 1, 10]);
  assert.deepEqual(one('Flm 10-12'), ['Flm', 1, 10, 1, 12]);
  assert.deepEqual(one('Flm1:10'), ['Flm', 1, 10, 1, 10]);
});
test('what is not one passage of an existing chapter and verse is refused, and says why', () => {
  assert.equal(one('Xyz3:4'), 'book');
  assert.equal(one('16:1'), 'book');
  assert.equal(one(''), 'book');
  for (const s of ['Hch29:1', 'Hch16:41', 'Hch0:1', 'Hch16:5-1', 'Hch16:1, 5', 'Hch', 'Hch16:1x']) assert.equal(one(s), 'numbers', s);
});
test('a reference of the data splits like the server splits it', () => {
  const r = (s) => [...P.parseRefs(s)].map(span);
  // Each comma item is its own stretch: verse 3 is not cited.
  assert.deepEqual(r('Gé 6:1, 2, 4'), [['Gé', 6, 1, 6, 2], ['Gé', 6, 4, 6, 4]]);
  // Items that touch join; a part with no book is of the book before it.
  assert.deepEqual(r('Gé 2:7, 8; 5:1-5'), [['Gé', 2, 7, 2, 8], ['Gé', 5, 1, 5, 5]]);
  // The last verse of a chapter touches the first of the next; parts split by «;» never join.
  assert.deepEqual(r('Hch 16:40, 17:1'), [['Hch', 16, 40, 17, 1]]);
  assert.deepEqual(r('Hch 16:40; 17:1'), [['Hch', 16, 40, 16, 40], ['Hch', 17, 1, 17, 1]]);
  // A bare number after a verse is another verse of that chapter; a bare chapter is the whole chapter.
  assert.deepEqual(r('Hch 16:1, 3'), [['Hch', 16, 1, 16, 1], ['Hch', 16, 3, 16, 3]]);
  assert.deepEqual(r('Hch 16'), [['Hch', 16, 0, 16, 40]]);
  assert.deepEqual(r('Flm 1, 2, 10-12'), [['Flm', 1, 1, 1, 2], ['Flm', 1, 10, 1, 12]]);
  // A reference that does not read, or names a verse its book lacks, gives nothing.
  assert.deepEqual(r('Hch 16:99'), []);
  assert.deepEqual(r('Xyz 1:1'), []);
  assert.deepEqual(r('Hch 16:1 (nota)'), []);
});
test('two stretches match when they share a verse, and only then', () => {
  const s = (x) => P.parsePassage(x).stretch;
  const hits = (x, ref) => P.parseRefs(ref).some((r) => P.overlaps(r, s(x)));
  assert.equal(hits('Gé6:3', 'Gé 6:1, 2, 4'), false);
  assert.equal(hits('Gé6:4', 'Gé 6:1, 2, 4'), true);
  assert.equal(hits('Gé6:2-3', 'Gé 6:1, 2, 4'), true);
  assert.equal(hits('Hch16', 'Hch 15:36-16:5'), true);
  assert.equal(hits('Hch16:6', 'Hch 15:36-16:5'), false);
  assert.equal(hits('Hch17:1', 'Hch 16:40'), false);
  assert.equal(hits('Gé16:1', 'Hch 16:1'), false);
});
test('a link writes a passage without accents or spaces, and reads back the same passage', () => {
  for (const [x, w, read] of [['Génesis 12:1', 'Ge12:1', 'Génesis 12:1'], ['2 Reyes 17:6', '2Re17:6', '2 Reyes 17:6'], ['Hechos 16', 'Hch16', 'Hechos 16'],
    ['Hch 13:1-14:28', 'Hch13:1-14:28', 'Hechos 13:1-14:28'], ['Filemón 10', 'Flm10', 'Filemón 10'], ['Hch16:1-5', 'Hch16:1-5', 'Hechos 16:1-5']]) {
    const st = P.parsePassage(x).stretch;
    assert.equal(P.compact(st), w, x);
    assert.equal(P.readable(st), read, x);
    assert.deepEqual(span(P.parsePassage(P.compact(st)).stretch), span(st), x);
  }
});

const dataFile = process.env.BE_DATA_FILE || new URL('../../site/data.json', import.meta.url);
test('every passage and every reference of the data reads', { skip: !fs.existsSync(dataFile) && 'no site/data.json' }, () => {
  const D = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  BE.ponerLibros(D.libros.map((l) => ({ ...l, formas: l.formas || [] })));
  const bad = [];
  for (const e of D.eventos) for (const p of e.pasajes || []) if (!P.parseRefs(p).length) bad.push(`${e.id}: ${p}`);
  for (const v of D.viajes) {
    if (!P.parseRefs(v.referencia).length) bad.push(`${v.id}: ${v.referencia}`);
    for (const p of v.paradas) if (!P.parseRefs(p.referencia).length) bad.push(`${v.id}/${p.orden}: ${p.referencia}`);
  }
  for (const c of D.cartas) if (!P.parseRefs(c.referencia).length) bad.push(`${c.id}: ${c.referencia}`);
  assert.deepEqual(bad, []);
});
