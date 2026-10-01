// Every passage link opens jw.org's study Bible on the cited verse or range, highlighted and scrolled into view: the
// anchor is #v<book><ccc><vvv>, a range is #v<start>-v<end> in the same chapter. jw.org highlights nothing for a range
// that crosses into another chapter, so such a reference opens its first chapter highlighted to that chapter's last
// verse. It ignores a comma list too, so «Mt 26:30, 36-56» highlights 30 to 56. A whole chapter goes without an anchor. Runs the real base.js (citas) and tipos/libro.js (urlCita) in a vm.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// base.js touches the page while it loads; a stub that answers any property or call with itself stands in for it.
const nada = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : nada), apply: () => nada, construct: () => nada });
const window = {};
const ctx = { window, document: nada, location: { protocol: 'https:', hash: '', href: '' }, console, encodeURIComponent,
  setTimeout, ResizeObserver: nada, matchMedia: nada, localStorage: nada, sessionStorage: nada, navigator: nada,
  requestAnimationFrame: nada, addEventListener: nada };
for (const f of ['base.js', 'tipos/libro.js']) {
  vm.runInNewContext(fs.readFileSync(new URL(`../../site/js/${f}`, import.meta.url), 'utf8'), ctx, { filename: f });
}
const { BE } = window;
BE.ponerLibros([
  { num: 15, nombre: 'Esdras', abr: 'Esd', formas: ['esd', 'esdras'], versiculos: [11, 70, 13, 24, 17, 22, 28, 36, 15, 44] },
  { num: 1, nombre: 'Génesis', abr: 'Gé', formas: ['ge', 'genesis'], versiculos: [31, 25] },
  { num: 44, nombre: 'Hechos', abr: 'Hch', formas: ['hch', 'hechos'], versiculos: Array(28).fill(40) },
  { num: 19, nombre: 'Salmos', abr: 'Sl', formas: ['sl', 'salmos'], capitulos: 150,
    versiculos: Object.assign(Array(150).fill(10), { 118: 176 }) },
  { num: 31, nombre: 'Abdías', abr: 'Abd', formas: ['abd', 'abdias'], capitulos: 1, versiculos: [21] },
  { num: 57, nombre: 'Filemón', abr: 'Flm', formas: ['flm', 'filemon'], capitulos: 1, versiculos: [25] },
  { num: 63, nombre: '2 Juan', abr: '2Jn', formas: ['2jn', '2juan'], capitulos: 1, versiculos: [13] },
  { num: 64, nombre: '3 Juan', abr: '3Jn', formas: ['3jn', '3juan'], capitulos: 1, versiculos: [14] },
  { num: 65, nombre: 'Judas', abr: 'Jud', formas: ['jud', 'judas'], capitulos: 1, versiculos: [25] },
]);
const url = (ref) => BE.urlCita(BE.citas(ref)[0]);
const J = 'https://www.jw.org/es/biblioteca/biblia/biblia-estudio/libros/';

test('one verse', () => assert.equal(url('Esd 5:3'), `${J}esdras/5/#v15005003`));
test('a range in one chapter', () => assert.equal(url('Esd 5:3-17'), `${J}esdras/5/#v15005003-v15005017`));
test('a list in one chapter runs from its first to its last verse', () => {
  assert.equal(url('Esd 5:3, 4'), `${J}esdras/5/#v15005003-v15005004`);
  assert.equal(url('Hch 17:14, 15, 20-22'), `${J}hechos/17/#v44017014-v44017022`);
});
test('a book with an accent and a one-digit number', () => assert.equal(url('Gé 2:3-10'), `${J}G%C3%A9nesis/2/#v1002003-v1002010`));
test('a reference that crosses chapters opens the first one to its last verse', () => {
  assert.equal(url('Hch 21:38–22:5'), `${J}hechos/21/#v44021038-v44021040`);
});
test('a three-digit chapter', () => {
  assert.equal(url('Sl 119:105'), `${J}salmos/119/#v19119105`);
  assert.equal(url('Sl 119:97-105'), `${J}salmos/119/#v19119097-v19119105`);
});
test('a one-chapter book is cited by verse: chapter 1, that verse', () => {
  assert.equal(url('Flm 23'), `${J}Filem%C3%B3n/1/#v57001023`);
  assert.equal(url('Jud 9'), `${J}judas/1/#v65001009`);
  assert.equal(url('Abd 3'), `${J}Abd%C3%ADas/1/#v31001003`);
  assert.equal(url('Abd 11-14'), `${J}Abd%C3%ADas/1/#v31001011-v31001014`);
  assert.equal(url('2Jn 12'), `${J}2-juan/1/#v63001012`);
  assert.equal(url('3Jn 14'), `${J}3-juan/1/#v64001014`);
  assert.equal(url('Flm 1:23'), `${J}Filem%C3%B3n/1/#v57001023`);
});
test('a whole chapter has no anchor', () => {
  assert.equal(url('Sl 34'), `${J}salmos/34/`);
  assert.equal(url('Esd 5:1-17'), `${J}esdras/5/`);
});
