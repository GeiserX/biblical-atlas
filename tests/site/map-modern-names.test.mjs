// nombreHoy returns the name the data flags as today's (`modern: true` in the YAML, `actual` in data.json), and
// nothing it would have to guess from a note. Run after scripts/build.py: node --test tests/site/map-modern-names.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('../../', import.meta.url);
const source = fs.readFileSync(new URL('site/js/mapa.js', root), 'utf8');
// Test the actual function, without starting MapLibre. It has no external dependencies.
const fn = source.match(/function nombreHoy\(l\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(fn, 'nombreHoy must exist');
const nombreHoy = vm.runInNewContext(`(${fn})`);
const data = JSON.parse(fs.readFileSync(new URL(process.env.BE_DATA_FILE || 'site/data.json', root), 'utf8'));
const places = data.lugares;

// Aliases whose note mentions the present without being today's name. PR 179 removed them as labels.
for (const [id, alias] of [['antilibano', 'Amaná'], ['arnon', 'Valle torrencial de Arnón'], ['hamat', 'Epifanía'],
  ['jerusalen', 'Torre de David'], ['manantial-de-guihon', 'Guihón'], ['sirte', 'Gran Sirte'], ['zelza', 'Tumba de Raquel']]) {
  test(`${id}: «${alias}» is not today's name`, () => {
    const before = JSON.stringify(places[id]);
    assert.ok(places[id].nombres.some((n) => n.nombre === alias), 'the alias remains');
    assert.notEqual(nombreHoy(places[id]), alias);
    assert.equal(JSON.stringify(places[id]), before, 'no data or alias is mutated');
  });
}

// Names that only lived in prose or in a differently worded note, now flagged in the data after reading jw.org.
for (const [id, name] of [['asdod', 'Esdud (Tel Ashdod)'], ['asquelon', 'Tel Ashqelon'], ['ur', 'Al-Muqayyar'],
  ['jerico', 'Tell es-Sultan (Tel Yeriho)'], ['salmone', 'cabo Sidero'], ['arnon', 'Wadi Mujib (Nahal Arnon)'],
  ['hamat', 'Hama'], ['manantial-de-guihon', 'Ha Guihón']]) {
  test(`${id}: today's name is «${name}»`, () => assert.equal(nombreHoy(places[id]), name));
}

test('the flag decides, not the wording of the note', () => {
  assert.equal(nombreHoy(null), null);
  assert.equal(nombreHoy({ nombres: [{ nombre: 'X', nota: 'Nombre actual.' }] }), null);
  assert.equal(nombreHoy({ nombres: [{ nombre: 'X', nota: 'Así la llamaba Plinio.', actual: true }] }), 'X');
  assert.equal(nombreHoy({ nombres: [{ nombre: 'X', actual: 'true' }] }), null);
});

test('today\'s names in the built data are exactly these', () => {
  const expected = {
    alejandria: 'Al-Iskandariyya',
    'antioquia-de-siria': 'Antakya',
    antipatris: 'Ras el-ʽAin (Tel Afeq)',
    arnon: 'Wadi Mujib (Nahal Arnon)',
    arvad: 'Arwad',
    asdod: 'Esdud (Tel Ashdod)',
    ason: 'Behramkale',
    asquelon: 'Tel Ashqelon',
    atalia: 'Antalya',
    'bellos-puertos': 'Kalo-Limiones',
    berea: 'Verria',
    betania: 'el-ʽAzariyeh (El ʽEizariya)',
    calah: 'Nimrud',
    cauda: 'Gaudos',
    cesarea: 'Horvat Qesari',
    'cesarea-de-filipo': 'Banias',
    derbe: 'Kerti Hüyük',
    erec: 'Warka',
    esmirna: 'Izmir',
    filadelfia: 'Alaşehir',
    hamat: 'Hama',
    helbon: 'Halbun',
    iconio: 'Konya',
    jerico: 'Tell es-Sultan (Tel Yeriho)',
    jope: 'Yafo (Jaffa)',
    lida: 'el-Ludd',
    'manantial-de-guihon': 'Ha Guihón',
    'mar-grande': 'Mediterráneo',
    'mar-salado': 'Mar Muerto',
    mira: 'Demre',
    neapolis: 'Kavala',
    'no-amon': 'Tebas',
    patara: 'Gelemis',
    'penasco-de-rimon': 'Rammun',
    pergamo: 'Bergama',
    puteoli: 'Pozzuoli',
    raba: 'Ammán',
    regio: 'Reggio di Calabria',
    salmone: 'cabo Sidero',
    samotracia: 'Samothráki',
    sidon: 'Saida',
    tesalonica: 'Salónica (Thessaloníki)',
    tiatira: 'Akhisar',
    tiro: 'Sour',
    ur: 'Al-Muqayyar',
    'valle-de-cedron': 'Nahal Qidron',
  };
  const actual = Object.fromEntries(Object.entries(places).map(([id, l]) => [id, nombreHoy(l)]).filter(([, n]) => n));
  assert.deepEqual(actual, expected);
});
