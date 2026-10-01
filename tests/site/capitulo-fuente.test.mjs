// capituloDeFuente (site/js/tipos/pasaje.js) reads the chapter of a source from its URL, in both shapes: the
// wol.jw.org study Bible (nwtsty/<num>/<cap>) and the jw.org study Bible (biblia-estudio/libros/<Libro>/<cap>/), where
// jw.org names the book as it writes it («G%C3%A9nesis», «el-cantar-de-los-cantares»). An old data.json with wol
// URLs and a new one with jw.org URLs both have to parse. Runs the real script in a vm, no browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const LIBROS = [
  { num: 1, nombre: 'Génesis', slug: 'genesis', abr: 'Gé' },
  { num: 22, nombre: 'El Cantar de los Cantares', slug: 'cantar-de-los-cantares', abr: 'Can' },
  { num: 44, nombre: 'Hechos', slug: 'hechos', abr: 'Hch' },
];
const JW = 'https://www.jw.org/es/biblioteca/biblia/biblia-estudio/libros/';
const fuentes = {
  'x-wol': { url: 'https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/44/16' },
  'x-jw': { url: `${JW}hechos/17/` },
  'x-tilde': { url: `${JW}G%C3%A9nesis/3/` },
  'x-cantar': { url: `${JW}el-cantar-de-los-cantares/2/` },
  'x-perspicacia': { url: 'https://www.jw.org/es/biblioteca/libros/Perspicacia-para-comprender-las-Escrituras/%C3%81gabo/' },
  'x-libro-que-no-hay': { url: `${JW}tobias/1/` },
};
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const BE = { esc: (s) => s, EXTERNO: '', fechaCorta: () => '', norm, citas: () => [], libro: () => null,
  implicados: () => [], ES_FILE: false, tipo() {}, D: { fuentes }, LIBROS };
const src = fs.readFileSync(new URL('../../site/js/tipos/pasaje.js', import.meta.url), 'utf8');
vm.runInNewContext(src, { window: { BE }, decodeURIComponent });
const cap = (id) => { const r = BE.capituloDeFuente(id); return r ? [r.libro.num, r.cap] : null; };

test('wol.jw.org nwtsty URL', () => assert.deepEqual(cap('x-wol'), [44, 16]));
test('jw.org study Bible URL', () => assert.deepEqual(cap('x-jw'), [44, 17]));
test('jw.org book name with an accent, percent-encoded', () => assert.deepEqual(cap('x-tilde'), [1, 3]));
test('jw.org book name that is not the slug', () => assert.deepEqual(cap('x-cantar'), [22, 2]));
test('a source that is not a chapter', () => {
  assert.equal(cap('x-perspicacia'), null);
  assert.equal(cap('x-libro-que-no-hay'), null);
});
