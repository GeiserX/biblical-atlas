// The landing's written-out controls (site/index.html, #vista-portada) against the built data: every address uses only
// parameters the site reads, every id it names exists, and the dates on the labels are the dates the addresses set.
//
//   BE_DATA_FILE=site/data.json node --test tests/site/portada-destinos.test.mjs
//
// No browser. Without BE_DATA_FILE it uses site/data.json, or builds the data into a temporary directory with
// python3 scripts/build.py (needs requirements.txt).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
let D, tmp, html, controles, statsFile;
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fmtAnio = (y) => (y > 0 ? `${y} e.c.` : `${1 - y} a.e.c.`);
// Every parameter some module of the site reads (base.js and each BE.parametros.push in site/js).
const LEIDOS = new Set(['t', 'v', 'sel', 'mapa']);

before(() => {
  let file = process.env.BE_DATA_FILE || path.join(ROOT, 'site/data.json');
  if (!fs.existsSync(file)) {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-portada-'));
    execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--salida', tmp], { cwd: ROOT, stdio: 'pipe' });
    file = path.join(tmp, 'data.json');
  }
  D = JSON.parse(fs.readFileSync(file, 'utf8'));
  statsFile = path.join(path.dirname(file), 'stats.json');   // build.py writes it beside data.json
  for (const f of fs.readdirSync(path.join(ROOT, 'site/js'), { recursive: true })) {
    if (!String(f).endsWith('.js')) continue;
    const js = fs.readFileSync(path.join(ROOT, 'site/js', f), 'utf8');
    for (const m of js.matchAll(/nombre: '([a-z]+)'/g)) LEIDOS.add(m[1]);
  }
  const all = fs.readFileSync(path.join(ROOT, 'site/index.html'), 'utf8');
  const a = all.indexOf('id="vista-portada"'), b = all.indexOf('</section>\n</div>', a);
  html = all.slice(a, b);
  // The text a screen reader gives each link: the card's drawing (aria-hidden, before the body) does not count.
  const leido = (h) => (h.includes('portada-tarjeta__cuerpo') ? h.slice(h.indexOf('portada-tarjeta__cuerpo')).replace(/^[^>]*>/, '') : h);
  controles = [...html.matchAll(/<a class="([^"]+)" href="(#[^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ clase: m[1], href: m[2].replace(/&amp;/g, '&'), texto: leido(m[3]).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }));
});
after(() => { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); });

function existe(sel) {
  const [tipo, id] = sel.split(':');
  switch (tipo) {
    case 'lugar': return !!D.lugares[id];
    case 'persona': return !!D.personas[id];
    case 'carta': return D.cartas.some((c) => c.id === id);
    case 'pasaje': return pasaje(id);
    default: return false;
  }
}
function pasaje(id) {
  const m = id.match(/^(.+)-(\d+)$/);
  const l = m && D.libros.find((x) => norm(x.abr) === m[1]);
  return !!l && +m[2] >= 1 && +m[2] <= l.capitulos;
}

test('the landing writes out its controls: the plain entry, three examples, three cards and two more', () => {
  const clases = controles.map((c) => c.clase);
  assert.equal(clases.filter((c) => c === 'portada-abrir').length, 1);
  assert.equal(clases.filter((c) => c === 'portada-chip').length, 3);
  assert.equal(clases.filter((c) => c === 'portada-tarjeta').length, 3);
  assert.equal(clases.filter((c) => c === 'portada-mas__item').length, 2);
});

test('every address uses parameters the site reads, and every id it names is in the data', () => {
  assert.ok(controles.length >= 9);
  for (const c of controles) {
    const p = new URLSearchParams(c.href.slice(1));
    for (const k of p.keys()) assert.ok(LEIDOS.has(k), `${c.href}: the site does not read «${k}»`);
    if (p.has('sel')) assert.ok(existe(p.get('sel')), `${c.href}: ${p.get('sel')} is not in the data`);
    if (p.has('leer')) assert.ok(pasaje(p.get('leer')), `${c.href}: ${p.get('leer')} is not a chapter`);
    if (p.has('conexion')) for (const s of p.get('conexion').split('~')) assert.ok(existe(s), `${c.href}: ${s} is not in the data`);
    if (p.has('t')) assert.ok(Number.isFinite(+p.get('t')), c.href);
  }
});

test('the dates on the labels are the dates their addresses set', () => {
  const t = (c) => Math.floor(+new URLSearchParams(c.href.slice(1)).get('t'));
  const por = (cls, trozo) => controles.find((c) => c.clase === cls && c.texto.includes(trozo));
  const abrir = por('portada-abrir', 'Abrir el mapa');
  assert.match(abrir.texto, new RegExp(`\\(c\\. ${fmtAnio(t(abrir)).replace(/\./g, '\\.')}\\)`));
  const y607 = por('portada-chip', '607');
  assert.ok(y607.texto.includes(fmtAnio(t(y607))), `${y607.texto} vs ${fmtAnio(t(y607))}`);
  for (const c of controles.filter((x) => /portada-(tarjeta|mas__item)/.test(x.clase) && new URLSearchParams(x.href.slice(1)).has('t'))) {
    const fecha = c.texto.match(/^c\. ([^ ]+(?: a\.e\.c\.| e\.c\.))/)?.[1] || '';
    if (/-/.test(fecha)) continue;   // a span: the address sits inside it
    assert.equal(`c. ${fecha}`, `c. ${fmtAnio(t(c))}`, c.href);
  }
});

test('each card and question starts its link text with the date and the question', () => {
  for (const c of controles.filter((x) => /portada-(tarjeta|mas__item)/.test(x.clase))) {
    assert.match(c.texto, /^c\. [\d-]+ (a\.)?e\.c\. /, c.texto);
    assert.match(c.texto, /¿[^?]+\?/, c.texto);
  }
});

test('the example chips are what typing them gives: a person, a chapter and a year', () => {
  const chips = controles.filter((c) => c.clase === 'portada-chip');
  const pedro = chips.find((c) => c.texto === 'Pedro'), cap = chips.find((c) => c.texto === 'Hechos 16'), anio = chips.find((c) => c.texto === '607 a.e.c.');
  assert.equal(pedro.href, '#sel=persona:pedro');
  assert.equal(cap.href, '#sel=pasaje:hch-16');
  assert.equal(anio.href, '#t=-605.5000');
});

test('the era count in the text is the count in the data', () => {
  const eras = D.periodos.filter((p) => p.tipo === 'era');
  const palabras = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'];
  assert.match(html, new RegExp(`${palabras[eras.length][0].toUpperCase()}${palabras[eras.length].slice(1)} épocas`));
});

test('the landing counts its sources as build.py does for the README badges (stats.json)', () => {
  // site/js/portada.js and scripts/build.py each count the written sources some fact cites and the Bible chapters the
  // build adds; the landing and the badges must say the same numbers.
  assert.ok(fs.existsSync(statsFile), `${statsFile} is missing: build the data with python3 scripts/build.py`);
  const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
  const window = { BE: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'site/js/portada.js'), 'utf8'), { window });
  const c = { ...window.BE.portada.reglas.cifrasFuentes(D) };   // a plain object, not one from the vm realm
  assert.deepEqual(c, { enlazadas: stats.fuentes, capitulos: stats.capitulos });
  const escritas = Object.values(D.fuentes).filter((f) => !f.implicita).length;
  assert.ok(c.enlazadas > 0 && c.enlazadas <= escritas, `${c.enlazadas} cited of ${escritas} written`);
  assert.equal(c.enlazadas + c.capitulos <= Object.keys(D.fuentes).length, true);
});
