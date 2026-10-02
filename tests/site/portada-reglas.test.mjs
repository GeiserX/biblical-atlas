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
  for (const k of ['ordenPortada', 'dirPeriodo', 'dirRecorrido', 'dirLineaCompleta', 'vueltaValida', 'debeGuardar', 'lineaEpoca', 'cifrasFuentes', 'fraseCifras']) assert.equal(typeof R[k], 'function', k);
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

test('«Juan»: the name up to its first comma is exact too, and among exact names the one with more facts goes first', () => {
  // As BE.buscar returns «Juan» (every one of these has «Juan» among its names, so all score 100); weights are the
  // number of facts each selection implies.
  const rs = [
    { grupo: 'Personas', titulo: 'Juan', sel: { tipo: 'persona', id: 'juan-gobernante-judio' }, puntos: 100 },
    { grupo: 'Personas', titulo: 'Juan el Bautista', sel: { tipo: 'persona', id: 'juan-el-bautista' }, puntos: 100 },
    { grupo: 'Personas', titulo: 'Juan, el apóstol', sel: { tipo: 'persona', id: 'juan-apostol' }, puntos: 100 },
    { grupo: 'Libros', titulo: 'Juan', sel: { tipo: 'libro', id: 'juan' }, puntos: 100 },
  ];
  const hechos = { 'juan-gobernante-judio': 2, 'juan-el-bautista': 30, 'juan-apostol': 60, juan: 40 };
  const orden = R.ordenPortada(rs, 'juan', (r) => hechos[r.sel.id] || 0).map((r) => r.sel.id);
  assert.deepEqual(orden, ['juan-apostol', 'juan', 'juan-gobernante-judio', 'juan-el-bautista']);
  // Without weights the exact ones keep the site's order.
  assert.deepEqual(R.ordenPortada(rs, 'juan').map((r) => r.sel.id), ['juan-gobernante-judio', 'juan-apostol', 'juan', 'juan-el-bautista']);
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

test('the source figures: written sources some fact cites, and the Bible chapters the build adds, apart', () => {
  // «u» is written but nothing cites it; «mateo-26» and «mateo-27» are chapters the build adds (implicita), cited or
  // not; a loose «fuente» and a list nested at any depth both count, and an id cited twice counts once. «w» is cited
  // only by an office, which the build compiles with «sources».
  const D = {
    fuentes: { s: {}, t: {}, u: {}, v: {}, w: {}, 'mateo-26': { implicita: true }, 'mateo-27': { implicita: true } },
    personas: { p: { offices: [{ office: 'king', sources: ['w'] }] } },
    eventos: [{ fuentes: ['s', 't'] }],
    lugares: { a: { candidatos: [{ fuentes: ['t', 'mateo-26'] }] } },
    recorridos: [{ paradas: [{ fuente: 'v' }] }],
    calendario: { explicacion: [{ fuentes: ['s'] }] },
  };
  assert.deepEqual({ ...R.cifrasFuentes(D) }, { enlazadas: 4, capitulos: 2 });
  assert.deepEqual({ ...R.cifrasFuentes({}) }, { enlazadas: 0, capitulos: 0 });
});

test('the figures sentence names the sources it links, and leaves out what is zero', () => {
  assert.equal(R.fraseCifras({ sucesos: 1439, lugares: 934, personas: 1312, enlazadas: 2463, capitulos: 834 }),
    '1439 sucesos, 934 lugares y 1312 personas, enlazados a 2463 fuentes y a 834 capítulos de la Biblia.');
  assert.equal(R.fraseCifras({ sucesos: 12345, lugares: 2, personas: 3, enlazadas: 4, capitulos: 0 }),
    '12.345 sucesos, 2 lugares y 3 personas, enlazados a 4 fuentes.');
  assert.equal(R.fraseCifras({ sucesos: 0, lugares: 5, personas: 0, enlazadas: 0, capitulos: 7 }),
    '5 lugares, enlazados a 7 capítulos de la Biblia.');
  assert.equal(R.fraseCifras({ sucesos: 3, lugares: 0, personas: 0 }), '3 sucesos.');
  assert.equal(R.fraseCifras({}), '');
  assert.doesNotMatch(R.fraseCifras({ sucesos: 1, enlazadas: 2, capitulos: 3 }), /jw\.org|citadas/);
});
