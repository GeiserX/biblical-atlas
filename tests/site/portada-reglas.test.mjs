// The landing's pure rules (site/js/portada.js, BE.portada.reglas), loaded in node:vm without a browser: the flat order
// of the landing's suggestions, the addresses of the eras, tours and the whole line, which stored «Seguir donde lo
// dejaste» is valid, when the view is stored, and the book line of each era.
//
//   node --test tests/site/portada-reglas.test.mjs
//
// No browser, no data: it runs anywhere, and in CI (.github/workflows/validar.yml).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync(new URL('../../site/js/portada.js', import.meta.url), 'utf8');
const window = { BE: {} };
vm.runInNewContext(code, { window });
const R = window.BE.portada?.reglas;

test('the file loads without a document and publishes its rules', () => {
  assert.ok(R, 'BE.portada.reglas is missing');
  for (const k of ['ordenPortada', 'dirPeriodo', 'dirRecorrido', 'dirLineaCompleta', 'vueltaValida', 'debeGuardar', 'lineaEpoca']) assert.equal(typeof R[k], 'function', k);
});

test('the landing list: the exact name first, then points, then the site order', () => {
  // As BE.buscar returns «Corin»: people before places, but the place starts with the text (80) and the person only has
  // a later word that does (60).
  const rs = [
    { grupo: 'Personas', titulo: 'Gayo de Corinto', sel: { tipo: 'persona', id: 'gayo' }, puntos: 60 },
    { grupo: 'Personas', titulo: 'Erasto, mayordomo de Corinto', sel: { tipo: 'persona', id: 'erasto' }, puntos: 60 },
    { grupo: 'Lugares', titulo: 'Corinto', sel: { tipo: 'lugar', id: 'corinto' }, puntos: 80 },
  ];
  assert.deepEqual(R.ordenPortada(rs, 'corin').map((r) => r.titulo), ['Corinto', 'Gayo de Corinto', 'Erasto, mayordomo de Corinto']);
  // Same points keep the order they came in (the site's group order).
  const iguales = [{ titulo: 'B', puntos: 60 }, { titulo: 'A', puntos: 60 }];
  assert.deepEqual(R.ordenPortada(iguales, 'x').map((r) => r.titulo), ['B', 'A']);
  // An exact name beats more points.
  const exacta = [{ titulo: 'Ir a 30 e.c.', puntos: 900 }, { titulo: 'Jerusalén', sel: { tipo: 'lugar', id: 'jerusalen' }, puntos: 100 }];
  assert.equal(R.ordenPortada(exacta, 'jerusalen')[0].titulo, 'Jerusalén');
});

test('the addresses of an era, a tour and the whole line', () => {
  const era = { id: 'destierro-y-regreso', fecha: { desde: -606, hasta: -442 } };
  assert.equal(R.dirPeriodo(era, -4025, 100), 'sel=periodo:destierro-y-regreso&t=-605.9900&v=275');
  // A long era is framed by the whole line at most.
  assert.equal(R.dirPeriodo({ id: 'larga', fecha: { desde: -4025, hasta: 99 } }, -4025, 100), 'sel=periodo:larga&t=-4024.9900&v=4125');
  assert.equal(R.dirRecorrido({ id: 'pedro' }), 'sel=recorrido:pedro&paso=1');
  assert.equal(R.dirLineaCompleta(-4025, 100), 't=50.3000&v=4125');
});

test('«Seguir donde lo dejaste» only takes an address of the site that is not the landing', () => {
  assert.equal(R.vueltaValida({ hash: '#t=50.3000&sel=persona:pablo', texto: 'Pablo · 50 e.c.' }), true);
  for (const u of [null, undefined, 'x', {}, { hash: 7 }, { hash: '' }, { hash: '#' }, { hash: 't=50' }, { hash: '#portada=1' }, { hash: '#t=5&portada=1' }, { hash: '#portada=1&t=5' }]) {
    assert.equal(R.vueltaValida(u), false, JSON.stringify(u));
  }
});

test('the view is stored with something chosen or reading mode open, never with the landing up', () => {
  assert.equal(R.debeGuardar({ abierta: false, sel: { tipo: 'lugar', id: 'x' }, lectura: false }), true);
  assert.equal(R.debeGuardar({ abierta: false, sel: null, lectura: true }), true);
  assert.equal(R.debeGuardar({ abierta: false, sel: null, lectura: false }), false);
  assert.equal(R.debeGuardar({ abierta: true, sel: { tipo: 'lugar', id: 'x' }, lectura: true }), false);
});

test('an era shows its last sentence that names a book, or its first', () => {
  const libros = ['Génesis', 'Josué', 'Jueces', 'Rut', 'Juan', 'Mateo', 'Marcos', 'Lucas', 'Hechos', 'Apocalipsis'];
  assert.equal(R.lineaEpoca('Josué conquista y reparte Canaán. Después gobiernan los jueces. Lo cuentan Josué, Jueces y Rut.', libros), 'Lo cuentan Josué, Jueces y Rut.');
  // «Juan» is a person in the first sentence and a book in the last: the last wins.
  assert.equal(R.lineaEpoca('Nacen Juan el Bautista y Jesús. Lo cuentan Mateo, Marcos, Lucas y Juan.', libros), 'Lo cuentan Mateo, Marcos, Lucas y Juan.');
  assert.equal(R.lineaEpoca('Cuatro siglos sin libro bíblico. Grecia y después Roma dominan Judea.', libros), 'Cuatro siglos sin libro bíblico.');
  assert.equal(R.lineaEpoca('', libros), '');
});
