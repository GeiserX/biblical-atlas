// nombreHoy reads curated affirmative note forms, not incidental words. The aliases remain unchanged.
// Run after scripts/build.py: node --test tests/site/map-modern-names.test.mjs
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
const data = JSON.parse(fs.readFileSync(new URL('site/data.json', root), 'utf8'));
const places = data.lugares;
for (const id of ['jerusalen', 'antilibano', 'hamat', 'zelza', 'arnon', 'sirte', 'manantial-de-guihon']) {
  test(`${id}: an incidental present-day mention is not a modern alias`, () => {
    const before = JSON.stringify(places[id]);
    assert.equal(nombreHoy(places[id]), null);
    assert.equal(JSON.stringify(places[id]), before, 'no data or alias is mutated');
    assert.ok(places[id].nombres.length > 0, 'aliases remain');
  });
}
for (const [id, expected] of [['alejandria','Al-Iskandariyya'],['antioquia-de-siria','Antakya'],['jope','Yafo (Jaffa)'],['tesalonica','Salónica (Thessaloníki)'],['mar-grande','Mediterráneo'],['mar-salado','Mar Muerto'],['no-amon','Tebas'],['lida','el-Ludd'],['bellos-puertos','Kalo-Limiones']]) {
  test(`${id}: affirmative modern name is retained`, () => assert.equal(nombreHoy(places[id]), expected));
}
test('a dated alias is not used as the modern subtitle', () => assert.equal(nombreHoy({nombres:[{nombre:'X', desde:1, nota:'Nombre actual.'}]}),null));
test('missing data or an unrecognized note does not invent a subtitle', () => {
  assert.equal(nombreHoy(null),null);
  assert.equal(nombreHoy({nombres:[{nombre:'X',nota:'No es la ciudad moderna.'}]}),null);
  assert.equal(nombreHoy({nombres:[{nombre:'X',nota:'Nombre no actual.'}]}),null);
});

test('all 38 affirmative subtitles in the current corpus are unchanged', () => {
  const expected = {
  "alejandria": "Al-Iskandariyya",
  "antioquia-de-siria": "Antakya",
  "antipatris": "Ras el-ʽAin (Tel Afeq)",
  "arvad": "Arwad",
  "ason": "Behramkale",
  "atalia": "Antalya",
  "bellos-puertos": "Kalo-Limiones",
  "berea": "Verria",
  "betania": "el-ʽAzariyeh (El ʽEizariya)",
  "calah": "Nimrud",
  "cauda": "Gaudos",
  "cesarea": "Horvat Qesari",
  "cesarea-de-filipo": "Banias",
  "derbe": "Kerti Hüyük",
  "erec": "Warka",
  "esmirna": "Izmir",
  "filadelfia": "Alaşehir",
  "helbon": "Halbun",
  "iconio": "Konya",
  "jope": "Yafo (Jaffa)",
  "lida": "el-Ludd",
  "mar-grande": "Mediterráneo",
  "mar-salado": "Mar Muerto",
  "mira": "Demre",
  "neapolis": "Kavala",
  "no-amon": "Tebas",
  "patara": "Gelemis",
  "penasco-de-rimon": "Rammun",
  "pergamo": "Bergama",
  "puteoli": "Pozzuoli",
  "raba": "Ammán",
  "regio": "Reggio di Calabria",
  "samotracia": "Samothráki",
  "sidon": "Saida",
  "tesalonica": "Salónica (Thessaloníki)",
  "tiatira": "Akhisar",
  "tiro": "Sour",
  "valle-de-cedron": "Nahal Qidron"
};
  for (const [id, name] of Object.entries(expected)) assert.equal(nombreHoy(places[id]), name, id);
});
