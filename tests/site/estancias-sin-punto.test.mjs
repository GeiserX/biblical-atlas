// A stay at a place without a point (the source says its site is unknown), tested in a real headless browser through
// what the site exposes on window.BE and through the map.
//
//  - The stay exists: the person is «in Mahanaim» (BE.donde), and the map draws the person at the place's favoured
//    candidate (BE.puntoLugar: the centre of its zone or the favoured proposed site) with the look of an estimated
//    position, even when the date is exact (Lot in Sodoma). David is in Mahanaim in 1050 a.e.c.; Abner in Mahanaim in
//    1075.5 a.e.c. (2Sa 2:8-12), not in Gabaon.
//  - Six people whose only stays are at such places keep them.
//  - A journey with such a stop keeps the stop as a stay, so its neighbours do not stretch over it, and its line goes
//    to the same estimated position, dashed (the journey that ends at Tahpanhés).
//  - A place with no candidate at all keeps the stay (card, timeline), and the map draws nothing for it: Caín at Enoc,
//    and Mahanaim with its candidates removed in a temporary copy of the data.
//  - Selecting such a place frames its zone.
//  - A region, whose point stands for the whole region, also looks estimated (Paul in Galatia).
//
// Run from the repository root, one browser at a time:
//   node --test --test-concurrency=1 tests/site/estancias-sin-punto.test.mjs
// Needs python3 with requirements.txt (the data is built into a temporary directory), network access for MapLibre
// (unpkg.com) and playwright-core with a Chromium: either importable, or PLAYWRIGHT_MODULE_DIR=<a node_modules directory
// that holds it>. CHROME_PATH picks another Chromium binary. BE_ROOT=<a checkout> tests that checkout's site instead of
// this one (the control: on a checkout where a stay at a place without a point is dropped, the first six tests fail).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.BE_ROOT ? path.resolve(process.env.BE_ROOT) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const SIX = ['is-boset', 'jael', 'makir-hijo-de-amiel', 'nahas-rey-de-ammon', 'sobi', 'beera-hijo-de-baal'];

async function loadChromium() {
  for (const name of ['playwright-core', 'playwright']) {
    try { return (await import(name)).chromium; } catch { /* next */ }
    if (process.env.PLAYWRIGHT_MODULE_DIR) {
      try { return createRequire(path.join(path.resolve(process.env.PLAYWRIGHT_MODULE_DIR), 'index.js'))(name).chromium; } catch { /* next */ }
    }
  }
  throw new Error('playwright-core not found: install it or set PLAYWRIGHT_MODULE_DIR to a node_modules directory that holds it');
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.pbf': 'application/x-protobuf', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
/** Serves the site with the built data; under /<variant>/ the same site runs with that variant's data. */
const variants = {};
function serve(siteDir, dataDir) {
  const server = http.createServer((req, res) => {
    let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const name = url.split('/')[1];
    const v = variants[name];
    if (v) url = url.slice(name.length + 1);
    const rel = url === '/' ? 'index.html' : url.slice(1);
    const data = v?.data || dataDir;
    const file = ['data.json', 'data.js'].includes(rel) ? path.join(data, rel) : path.join(siteDir, rel);
    if (!file.startsWith(siteDir) && !file.startsWith(dataDir)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(body);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}
/** A copy of the built data, changed by `change`, served under /<name>/. */
function variant(name, change) {
  const D = JSON.parse(fs.readFileSync(path.join(tmp, 'data.json'), 'utf8'));
  change(D);
  const dir = path.join(tmp, name);
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'data.json'), JSON.stringify(D));
  fs.writeFileSync(path.join(dir, 'data.js'), `window.BIBLICAL_ATLAS_DATA = ${JSON.stringify(D)};\n`);
  variants[name] = { data: dir };
}

let browser, server, origin, tmp, page;
const errors = [];
/** A page with the data and the map loaded. Tiles from other hosts are not needed; MapLibre from unpkg is. */
async function open(prefix = '', hash = 't=50.5') {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...DESKTOP });
  const p = await context.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await p.route((url) => !url.href.startsWith(origin) && !url.hostname.endsWith('unpkg.com'), (route) => route.abort());
  await p.goto(`${origin}${prefix}/index.html#${hash}`);
  await p.waitForFunction(() => window.__be?.map?.loaded?.() && window.__be.map.getSource('be-rastro'), null, { timeout: 30000 });
  return p;
}
before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-estancias-sin-punto-'));
  execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--out', tmp], { cwd: ROOT, stdio: 'pipe' });
  variant('sin-candidatos', (D) => { delete D.lugares.mahanaim.candidatos; });
  server = await serve(path.join(ROOT, 'site'), tmp);
  origin = `http://127.0.0.1:${server.address().port}`;
  const chromium = await loadChromium();
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  page = await open();
});
after(async () => {
  await browser?.close();
  server?.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

/** Puts the cursor and the selection, then reads where the person is and how the map draws the person's marker. */
function at(p, persona, t, sel = `persona:${persona}`) {
  return p.evaluate(async ({ persona, t, sel }) => {
    const { BE, map, setT, seleccionar } = window.__be;
    seleccionar(BE.parseSel(sel), { mover: false, encuadrar: false });
    setT(t);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const w = BE.donde(persona, t);
    // The favoured candidate, read from the data: seguro, favorecido_nivel_1, tradición, alternativa, solo_nivel_2.
    const orden = ['seguro', 'favorecido_nivel_1', 'tradicion', 'alternativa', 'solo_nivel_2'];
    const l = w ? BE.L[w.en.lugar.id] : null;
    const c = (l?.candidatos || []).filter((x) => orden.includes(x.estado)).sort((a, b) => orden.indexOf(a.estado) - orden.indexOf(b.estado))[0];
    const esperado = c ? [c.geometria.lon, c.geometria.lat] : null;
    const el = document.querySelector(`.viajero[data-sel="persona:${persona}"]`);
    let marca = null;
    if (el?.isConnected) {
      const r = el.querySelector('.viajero-punto').getBoundingClientRect(), m = map.getContainer().getBoundingClientRect();
      const q = esperado && map.project(esperado);
      marca = { estimada: el.classList.contains('estimada'), dx: q ? Math.round(r.left + r.width / 2 - m.left - q.x) : null, dy: q ? Math.round(r.top + r.height / 2 - m.top - q.y) : null };
    }
    return { lugar: w?.en.lugar.id ?? null, parada: w?.parada ?? null, pos: w?.pos ?? null, esperado, punto: l ? l.lat != null : null, marca };
  }, { persona, t, sel });
}
const cerca = (a, b) => !!a && !!b && Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;

test('David is in Mahanaim in 1050 a.e.c., drawn at its favoured candidate as an estimated position', async () => {
  const r = await at(page, 'david', -1050);
  assert.equal(r.lugar, 'mahanaim', JSON.stringify(r));
  assert.equal(r.parada, true);
  assert.equal(r.punto, false, 'Mahanaim has no point in the data');
  assert.ok(cerca(r.pos, r.esperado), `David is drawn at Mahanaim's favoured candidate: ${JSON.stringify(r)}`);
  assert.ok(r.marca, 'the map draws David');
  assert.equal(r.marca.estimada, true, 'with the look of an estimated position');
  assert.ok(Math.abs(r.marca.dx) <= 3 && Math.abs(r.marca.dy) <= 3, `the marker sits on the candidate: ${JSON.stringify(r.marca)}`);
});

test('a stay with an exact date at a place without a point still looks estimated on the map (Lot in Sodoma)', async () => {
  const t = await page.evaluate(() => { const s = window.BE.estancias('lot').find((x) => x.key === 'huida-de-lot/1'); return (s.a + s.b) / 2; });
  const r = await at(page, 'lot', t);
  assert.equal(r.lugar, 'sodoma', JSON.stringify(r));
  assert.equal(r.punto, false, 'Sodoma has no point in the data');
  const w = await page.evaluate((t) => window.BE.donde('lot', t).estimada, t);
  assert.equal(w, false, 'the case under test: the date is not estimated');
  assert.ok(r.marca && r.marca.estimada, `the place is: ${JSON.stringify(r)}`);
  assert.ok(Math.abs(r.marca.dx) <= 3 && Math.abs(r.marca.dy) <= 3, `the marker sits on the candidate: ${JSON.stringify(r.marca)}`);
});

test('Abner is in Mahanaim in 1075.5 a.e.c. (2Sa 2:8-12), not in Gabaon', async () => {
  const r = await at(page, 'abner', -1075.5);
  assert.equal(r.lugar, 'mahanaim', JSON.stringify(r));
  assert.ok(cerca(r.pos, r.esperado), JSON.stringify(r));
});

test('the six people whose stays are all at places without a point keep them', async () => {
  const r = await page.evaluate((ids) => {
    const BE = window.BE;
    return ids.map((id) => {
      const L = BE.estancias(id);
      const s = L[0];
      const w = s && BE.donde(id, (s.a + s.b) / 2);
      return { id, n: L.length, lugar: s?.lugar.id, punto: s ? s.lugar.lat != null : null, donde: w?.en.lugar.id ?? null, pos: !!w?.pos };
    });
  }, SIX);
  for (const x of r) {
    assert.ok(x.n > 0, `${x.id} has stays: ${JSON.stringify(x)}`);
    assert.equal(x.donde, x.lugar, `${x.id} is placed at his first stay: ${JSON.stringify(x)}`);
    assert.ok(x.pos, `${x.id} is drawn somewhere: ${JSON.stringify(x)}`);
  }
  assert.ok(r.some((x) => x.punto === false), 'the case under test: a stay at a place without a point');
});

test('a journey keeps its stops without a point, and the one that ends at Tahpanhés is drawn there, dashed', async () => {
  const r = await page.evaluate(async () => {
    const { BE, map, setT, seleccionar } = window.__be;
    const viaje = (id) => BE.D.viajes.find((v) => v.id === id);
    const paradas = (v) => BE.estancias(v.persona).filter((s) => s.viaje === v).map((s) => ({ lugar: s.lugar.id, a: s.a, b: s.b }));
    const abner = viaje('abner-en-gabaon'), resto = viaje('el-resto-huye-a-egipto');
    seleccionar({ tipo: 'viaje', id: resto.id }, { mover: false, encuadrar: false });
    setT(-607);
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    const rastro = (await map.getSource('be-rastro').getData()).features.filter((f) => f.properties.viaje === resto.id);
    const ultimo = rastro.at(-1);
    const fin = BE.estancias(resto.persona).find((s) => s.viaje === resto && s.lugar.id === 'tahpanhes');
    const w = fin && BE.donde(resto.persona, (fin.a + fin.b) / 2);
    const c = BE.L.tahpanhes.candidatos[0].geometria;
    return {
      abner: { datos: abner.paradas.length, estancias: paradas(abner) },
      resto: { datos: resto.paradas.length, estancias: paradas(resto) },
      linea: ultimo && { fin: ultimo.geometry.coordinates.at(-1), incierto: ultimo.properties.incierto },
      donde: w && { lugar: w.en.lugar.id, pos: w.pos }, candidato: [c.lon, c.lat],
    };
  });
  for (const k of ['abner', 'resto']) {
    const x = r[k];
    assert.equal(x.estancias.length, x.datos, `${k}: every stop is a stay: ${JSON.stringify(x)}`);
    x.estancias.forEach((s, i) => { if (i) assert.ok(x.estancias[i - 1].b <= s.a + 1e-9, `${k}: stop ${i} does not overlap the one before: ${JSON.stringify(x)}`); });
  }
  assert.ok(r.linea && cerca(r.linea.fin, r.candidato), `the line ends at Tell Defneh, the candidate of Tahpanhés: ${JSON.stringify(r.linea)}`);
  assert.equal(r.linea.incierto, true, 'and the leg that reaches it is dashed');
  assert.equal(r.donde?.lugar, 'tahpanhes', JSON.stringify(r.donde));
  assert.ok(cerca(r.donde.pos, r.candidato), `Johanán is drawn at the same estimated position: ${JSON.stringify(r.donde)}`);
});

test('a place with no candidate keeps the stay, never stretches a neighbour over it, and the map draws nothing for it', async () => {
  // Real data: Enoc, the city Caín builds, has no point and no candidate.
  const cain = await page.evaluate(() => {
    const BE = window.BE;
    const s = BE.estancias('cain').find((x) => x.key === 'evento:cain-edifica-enoc');
    const w = s && BE.donde('cain', (s.a + s.b) / 2);
    return { candidatos: BE.L.enoc.candidatos?.length ?? 0, punto: BE.L.enoc.lat != null, estancia: !!s, lugar: w?.en.lugar.id ?? null, pos: w ? w.pos : 'sin w' };
  });
  assert.deepEqual(cain, { candidatos: 0, punto: false, estancia: true, lugar: 'enoc', pos: null });
  // Mahanaim with its candidates removed: David is still in Mahanaim, Abner too, and the map draws neither of them.
  const p = await open('/sin-candidatos');
  const david = await at(p, 'david', -1050), abner = await at(p, 'abner', -1075.5);
  assert.equal(david.lugar, 'mahanaim', JSON.stringify(david));
  assert.equal(david.pos, null, 'nowhere to draw');
  assert.equal(david.marca, null, 'the map draws no marker for David');
  assert.equal(abner.lugar, 'mahanaim', `the Gabaon stop does not stretch over Mahanaim: ${JSON.stringify(abner)}`);
  const ficha = await p.evaluate(() => {
    const { BE, seleccionar } = window.__be;
    const v = BE.D.viajes.find((x) => x.id === 'huida-de-david-de-absalon');
    const ultima = [...v.paradas].sort((a, b) => a.orden - b.orden).at(-1);
    seleccionar({ tipo: 'viaje', id: v.id }, { mover: false, encuadrar: false });
    return { existe: BE.existe('parada', `${v.id}/${ultima.orden}`), fila: !!document.querySelector(`#panel-cuerpo [data-sel="parada:${v.id}/${ultima.orden}"]`) };
  });
  assert.deepEqual(ficha, { existe: true, fila: true }, 'the journey card opens the Mahanaim stop like any other');
  await p.context().close();
});

test('selecting a place without a point frames its zone', async () => {
  const r = await page.evaluate(async () => {
    const { BE, map, seleccionar } = window.__be;
    map.jumpTo({ center: [12, 42], zoom: 4 });
    seleccionar({ tipo: 'lugar', id: 'hakila' });
    await new Promise((res) => { const t0 = performance.now(); const f = () => (!map.isMoving() && performance.now() - t0 > 300) || performance.now() - t0 > 5000 ? res() : requestAnimationFrame(f); f(); });
    const g = BE.L.hakila.candidatos[0].geometria, b = map.getBounds();
    return { dentro: b.contains([g.lon, g.lat]), ancho: b.getEast() - b.getWest(), radio: g.radio_km };
  });
  assert.ok(r.dentro, JSON.stringify(r));
  assert.ok(r.ancho < 3, `the map is framed on the zone, not left on the Mediterranean: ${JSON.stringify(r)}`);
});

/** Puts the cursor in the middle of one of Paul's stops and reads his marker and the legend. */
function pabloEn(p, key) {
  return p.evaluate(async (key) => {
    const { BE, setT, seleccionar } = window.__be;
    const s = BE.P.find((x) => x.key === key);
    const t = (s.a + s.b) / 2;
    seleccionar(null, { mover: false, encuadrar: false });
    setT(t);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const w = BE.dondeEsta(t), el = document.querySelector('.pablo');
    return { lugar: w?.en.lugar.id, precision: s.lugar.precision, estimada: !!w?.estimada, incierto: !!w?.incierto,
      marca: el?.isConnected ? el.classList.contains('estimada') : null, leyenda: document.querySelector('#leyenda')?.textContent.replace(/\s+/g, ' ') ?? '' };
  }, key);
}

test('a stay at a region, whose point stands for the whole region, looks estimated even with an exact date (Paul in Galatia)', async () => {
  const r = await pabloEn(page, 'tercer-viaje/2');
  assert.equal(r.lugar, 'galacia', JSON.stringify(r));
  assert.equal(r.precision, 'zona', 'the point of Galatia stands for the whole region');
  assert.equal(r.estimada, false, 'the case under test: the date is not estimated');
  assert.equal(r.incierto, true, `BE.donde says the place is uncertain: ${JSON.stringify(r)}`);
  assert.equal(r.marca, true, 'and the marker has the look of an estimated position');
});

test('no page errors', () => {
  assert.deepEqual(errors, []);
});
