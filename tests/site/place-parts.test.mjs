// The parts of a place (`parts` in the YAML, `partes` in data.json): the gates, towers and pools inside a city or
// beside it, which are not other names of the place. The card shows them in a section of their own (partesHtml,
// site/js/tipos/lugar.js) and the search gives each part without a record of its own as its own row that opens the
// place; the place itself is no longer found by them (buscar in lugar.js, resultadosTipos in buscar.js). In English the
// Spanish name of a part stays on the part (mergeRecord, site/js/language.js), so it finds the part, not the place.
//
// Loaded in node:vm on a small fixture, without a browser and without the built data (the real data has no parts yet):
//   node --test tests/site/place-parts.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (f) => fs.readFileSync(new URL(`../../site/js/${f}`, import.meta.url), 'utf8');
const pick = (src, rx, name) => { const m = src.match(rx)?.[0]; assert.ok(m, `${name} must exist`); return m; };
const base = read('base.js'), buscar = read('buscar.js'), language = read('language.js');
const FUNCS = [
  pick(base, /function norm\(s\) \{.*\}/, 'norm'),
  pick(base, /function esc\(s\) \{.*\}/, 'esc'),
  pick(buscar, /function puntuador\(nq\) \{[\s\S]*?\n\}/, 'puntuador'),
  pick(buscar, /function puntuadorEstricto\(nq\) \{[\s\S]*?\n\}/, 'puntuadorEstricto'),
  pick(buscar, /function resultadosTipos\(q, fabrica = puntuador\) \{[\s\S]*?\n\}/, 'resultadosTipos'),
  pick(buscar, /function entidad\(texto, tipos = [^)]*\]\) \{[\s\S]*?\n\}/, 'entidad'),
  pick(language, /function merge\(base, over\) \{[\s\S]*?\n\}/, 'merge'),
  pick(language, /function spanishNames\(o, over\) \{[\s\S]*?\n\}/, 'spanishNames'),
  pick(language, /function mergeRecord\(o, over\) \{[\s\S]*?\n\}/, 'mergeRecord'),
].join('\n');

const lugar = (id, nombre, tipo, extra = {}) => ({ id, nombre, tipo, precision: 'punto', nombres: [{ nombre }], ...extra });
function fixture() {
  return {
    jerusalen: lugar('jerusalen', 'Jerusalén', 'ciudad', {
      nombres: [{ nombre: 'Jerusalén' }, { nombre: 'Sion', nota: 'La fortaleza y la ciudad.' }],
      partes: [
        { nombre: 'Puerta de las Ovejas', nota: 'Puerta del norte, junto al templo.' },
        { nombre: 'Estanque de Siloam', nota: 'Tiene su ficha.', lugar: 'estanque-de-siloam' },
        { nombre: 'Jardín del rey', nota: 'Fuera del muro sudeste.', cerca: true },
        { nombre: 'Torre de Hananel', nota: 'Torre del muro norte' },
      ],
    }),
    'estanque-de-siloam': lugar('estanque-de-siloam', 'Estanque de Siloam', 'lago'),
    betel: lugar('betel', 'Betel', 'ciudad', { partes: [{ nombre: 'Árbol de Debora', nota: 'Al pie de Betel.', cerca: true }] }),
    'monte-de-los-olivos': lugar('monte-de-los-olivos', 'Monte de los Olivos', 'monte', { partes: [{ nombre: 'Getsemaní', nota: 'Un huerto.' }] }),
    'valle-de-cedron': lugar('valle-de-cedron', 'Valle de Cedrón', 'valle', { partes: [{ nombre: 'Tumba de prueba', nota: 'Una tumba.' }] }),
    tiro: lugar('tiro', 'Tiro', 'puerto', { partes: [{ nombre: 'Muelle de prueba', nota: 'Un muelle.' }] }),
    jope: lugar('jope', 'Jope', 'ciudad'),
  };
}

/** lugar.js and ficha.js loaded as the site loads them, over a BE with only what they read, and the search pipeline
    of buscar.js and the merge of language.js taken out of their files. */
function load(L = fixture()) {
  const tipos = new Map();
  const window = { BE: {} };
  const ctx = vm.createContext({ window, document: { addEventListener() {} }, location: { href: 'http://x/' } });
  vm.runInContext(`${FUNCS}\nthis.api = { norm, esc, puntuador, resultadosTipos, entidad, mergeRecord };`, ctx);
  const { norm, esc } = ctx.api;
  const vars = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m)) : s);
  Object.assign(window.BE, {
    E: {}, norm, esc, EXTERNO: '', ES_FILE: false, t: vars, citas: () => [], fmtDia: String, fmtAnio: String, fmtCursor: String,
    fechaCorta: () => '', tramo: () => null, clamp: (x) => x, pintores: [], L, PERS: {}, P: [],
    D: { eventos: [], periodos: [], viajes: [], cartas: [], hallazgos: [] },
    tipos, tipo: (n, def) => (def ? tipos.set(n, def) : tipos.get(n)), selTexto: (s) => (s ? `${s.tipo}:${s.id}` : ''),
    nombreHoy: () => null, candidatosDe: () => null,
  });
  ctx.BE = window.BE;
  ctx.current = 'en';
  vm.runInContext(read('ficha.js'), ctx);
  vm.runInContext(read('tipos/lugar.js'), ctx);
  return { BE: window.BE, api: ctx.api };
}
const plain = (x) => JSON.parse(JSON.stringify(x));
const rows = (api, q) => plain(api.resultadosTipos(q).map((r) => ({ titulo: r.titulo, meta: r.meta, sel: `${r.sel.tipo}:${r.sel.id}` })))
  .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));

test('a part without its own record is its own row, which opens its place', () => {
  const { api } = load();
  assert.deepEqual(rows(api, 'Puerta de las Ovejas'), [{ titulo: 'Puerta de las Ovejas', meta: 'en Jerusalén', sel: 'lugar:jerusalen' }]);
  assert.deepEqual(rows(api, 'Jardín'), [{ titulo: 'Jardín del rey', meta: 'junto a Jerusalén', sel: 'lugar:jerusalen' }]);
  assert.deepEqual(rows(api, 'Árbol'), [{ titulo: 'Árbol de Debora', meta: 'junto a Betel', sel: 'lugar:betel' }]);
});

test('two parts of one place are two rows, and the place keeps its own row', () => {
  const { api } = load();
  assert.deepEqual(rows(api, 'Torre'), [{ titulo: 'Torre de Hananel', meta: 'en Jerusalén', sel: 'lugar:jerusalen' }]);
  const r = rows(api, 'de');
  assert.ok(r.some((x) => x.titulo === 'Puerta de las Ovejas') && r.some((x) => x.titulo === 'Torre de Hananel'), JSON.stringify(r));
  assert.deepEqual(rows(api, 'Sion').map((x) => x.titulo), ['Jerusalén'], 'a real alias still finds the place');
});

test('the place is not found by its parts', () => {
  const { api } = load();
  assert.ok(!rows(api, 'Puerta de las Ovejas').some((x) => x.titulo === 'Jerusalén'));
  assert.ok(!rows(api, 'Getsemaní').some((x) => x.titulo === 'Monte de los Olivos'));
});

test('a part linked to its own record adds no row: the linked place has its own', () => {
  const { api } = load();
  assert.deepEqual(rows(api, 'Estanque de Siloam'), [{ titulo: 'Estanque de Siloam', meta: '', sel: 'lugar:estanque-de-siloam' }]);
});

test('a part is not an entity of the fixed-form questions', () => {
  const { api } = load();
  assert.equal(api.entidad('Puerta de las Ovejas'), null);
  assert.equal(plain(api.entidad('Jerusalén')).sel.id, 'jerusalen');
});

test('in English the Spanish name of a part finds the part, not the place', () => {
  const L = fixture();
  const { api } = load(L);
  api.mergeRecord(L.jerusalen, { nombre: 'Jerusalem', partes: [{ nombre: 'Sheep Gate', nota: 'A gate.' }, null, null, null] });
  assert.deepEqual(plain(L.jerusalen._es), ['Jerusalén']);
  assert.deepEqual(plain(L.jerusalen.partes[0]._es), ['Puerta de las Ovejas']);
  assert.equal(L.jerusalen.partes[0].nombre, 'Sheep Gate');
  assert.deepEqual(rows(api, 'Puerta de las Ovejas'), [{ titulo: 'Sheep Gate', meta: 'en Jerusalem', sel: 'lugar:jerusalen' }]);
  api.mergeRecord(L.jerusalen, { nombre: 'Jerusalem', partes: [{ nombre: 'Sheep Gate' }] });   // a second apply adds nothing
  assert.deepEqual(plain(L.jerusalen.partes[0]._es), ['Puerta de las Ovejas']);
});

test('the card: one section, headed by the type of place, with the near ones last under «Alrededor»', () => {
  const { BE } = load();
  const html = BE.partesHtml(BE.L.jerusalen);
  assert.match(html, /<h3 class="be-card__eyebrow">Dentro de la ciudad <b class="cuenta">4<\/b><\/h3>/);
  assert.match(html, /<li><b>Puerta de las Ovejas<\/b><span class="be-muted">: puerta del norte, junto al templo<\/span><\/li>/);
  assert.match(html, /<li><b>Torre de Hananel<\/b><span class="be-muted">: torre del muro norte<\/span><\/li>/);
  // A part with its own record is a row that opens it.
  assert.match(html, /<button type="button" class="be-row fila-boton" data-sel="lugar:estanque-de-siloam"><span><span class="be-row__title">Estanque de Siloam<\/span><span class="be-row__meta">tiene su ficha<\/span>/);
  const near = html.indexOf('Alrededor');
  assert.ok(near > html.indexOf('Torre de Hananel') && near < html.indexOf('Jardín del rey'), 'the near ones go last, after «Alrededor»');
  assert.equal(html.match(/<section /g).length, 1);
  // The rows keep the order of the data: Puerta, Estanque, Torre.
  assert.ok(html.indexOf('Puerta de las Ovejas') < html.indexOf('Estanque de Siloam') && html.indexOf('Estanque de Siloam') < html.indexOf('Torre de Hananel'));
});

test('the heading follows the type of place', () => {
  const { BE } = load();
  const heading = (id) => BE.partesHtml(BE.L[id]).match(/eyebrow">([^<]*) <b/)[1];
  assert.equal(heading('monte-de-los-olivos'), 'En el monte');
  assert.equal(heading('valle-de-cedron'), 'En el valle');
  assert.equal(heading('tiro'), 'En este lugar');
  assert.equal(heading('betel'), 'Dentro de la ciudad');
  assert.match(BE.partesHtml(BE.L.betel), /Alrededor<\/h4><ul class="nombres"><li><b>Árbol de Debora<\/b>/);
});

test('a place without parts has no section, and its names stay as they were', () => {
  const { BE } = load();
  assert.equal(BE.partesHtml(BE.L.jope), '');
  assert.equal(BE.nombresHtml(BE.L.jerusalen).includes('Puerta de las Ovejas'), false);
});

test('the card of a place opens with the parts right after its main card', () => {
  const { BE } = load();
  BE.migas = () => ''; BE.cerrarHtml = () => ''; BE.estadoHtml = () => '';
  BE.mapa = {}; BE.nombreEn = (l) => l.nombre; BE.noSabemosHtml = () => ''; BE.porQueHtml = () => ''; BE.videosHtml = () => '';
  const html = BE.tipo('lugar').ficha('jerusalen');
  const main = html.indexOf('</section>');
  assert.ok(main > 0 && html.indexOf('Dentro de la ciudad') > main, 'after the main card');
  assert.ok(html.indexOf('Dentro de la ciudad') < html.indexOf('Qué pasaba aquí ahora'), 'before the rest');
});
