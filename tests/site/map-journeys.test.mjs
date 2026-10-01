// Pablo's journeys on the map, in a real headless browser: at a date inside one of his eight journeys the map draws
// that journey and none of the others, faded or not; after his last stop it draws nothing of his; each journey has its
// own colour and the legend names the one in course. A journey selected outside its date is drawn whole and in its
// colour. The «Viajes» layer switched off draws no journey. Other travellers keep their rule: Jesús in 32 and David in
// 1077 a.e.c. still draw their own journeys.
//
// Run from the repository root, one browser at a time:
//   node --test --test-concurrency=1 tests/site/map-journeys.test.mjs
// Needs python3 with requirements.txt (the data is built into a temporary directory), network access for MapLibre
// (unpkg.com) and playwright-core with a Chromium: either importable, or PLAYWRIGHT_MODULE_DIR=<a node_modules directory
// that holds it>. CHROME_PATH picks another Chromium binary. BE_ROOT=<a checkout> tests that checkout's site instead of
// this one (the control: on a checkout where Pablo's other journeys are drawn faded, the first three tests fail).
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
const PHONE = { width: 430, height: 932, touch: true };
const DESKTOP = { width: 1440, height: 900, touch: false };

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
function serve(siteDir, dataDir) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const rel = url === '/' ? 'index.html' : url.slice(1);
    const file = ['data.json', 'data.js'].includes(rel) ? path.join(dataDir, rel) : path.join(siteDir, rel);
    if (!file.startsWith(siteDir) && !file.startsWith(dataDir)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(body);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

let browser, server, base, tmp;
before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-map-journeys-'));
  execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--salida', tmp], { cwd: ROOT, stdio: 'pipe' });
  server = await serve(path.join(ROOT, 'site'), tmp);
  base = `http://127.0.0.1:${server.address().port}/index.html`;
  const chromium = await loadChromium();
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
});
after(async () => {
  await browser?.close();
  server?.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

/** A page with the data and the map loaded. Tiles from other hosts are not needed; MapLibre from unpkg is. */
async function openMap(screen = DESKTOP, hash = 't=50.5') {
  const context = await browser.newContext({ viewport: { width: screen.width, height: screen.height }, deviceScaleFactor: 1, isMobile: screen.touch, hasTouch: screen.touch });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.pageErrors = [];
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  const local = base.slice(0, base.lastIndexOf('/'));
  await page.route((url) => !url.href.startsWith(local) && !url.hostname.endsWith('unpkg.com'), (route) => route.abort());
  await page.goto(`${base}#${hash}`);
  await page.waitForFunction(() => window.__be?.map?.loaded?.() && window.__be.map.getSource('be-rastro') && document.querySelector('.maplibregl-marker'), null, { timeout: 30000 });
  await page.waitForTimeout(300);
  return page;
}

/** Puts the cursor (and the selection) and reads what the three journey sources draw and what the legend says. */
function drawnAt(page, t, sel = null) {
  return page.evaluate(async ({ t, sel }) => {
    const { map, BE, setT, seleccionar } = window.__be;
    if (sel !== undefined) seleccionar(sel, { mover: false, encuadrar: false });
    setT(t);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const read = async (id) => (await map.getSource(id).getData()).features.map((f) => f.properties);
    const [hecho, falta, rastro] = await Promise.all(['be-hecho', 'be-falta', 'be-rastro'].map(read));
    const quien = (id) => BE.D.viajes.find((v) => v.id === id)?.persona || 'pablo';
    const ids = (fs) => [...new Set(fs.map((f) => f.viaje))].sort();
    return {
      V: BE.viajeActual(BE.dondeEsta(t))?.id ?? null,
      hecho: ids(hecho), falta: ids(falta), rastro: ids(rastro),
      pabloRastro: ids(rastro.filter((f) => quien(f.viaje) === 'pablo')),
      rastroEstados: rastro.map((f) => `${f.viaje}:${f.estado}:${f.color}`),
      otros: ids(rastro.filter((f) => quien(f.viaje) !== 'pablo')),
      leyenda: document.querySelector('#leyenda')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
    };
  }, { t, sel });
}

/** Pablo's journeys in order, with a date in the middle of each (between its first and last stop on the map). */
function pabloJourneys(page) {
  return page.evaluate(() => {
    const { BE } = window.__be;
    const vs = [...new Set(BE.P.map((s) => s.viaje))];
    return vs.map((v) => {
      const ps = BE.P.filter((s) => s.viaje === v);
      return { id: v.id, nombre: v.nombre, t: (ps[0].a + ps.at(-1).a) / 2, color: window.BE.colorViaje(v.id) };
    });
  });
}

test('inside each of Pablo\'s journeys the map draws that one alone, in its own colour, and the legend names it', async () => {
  for (const screen of [DESKTOP, PHONE]) {
    const page = await openMap(screen);
    const js = await pabloJourneys(page);
    assert.equal(js.length, 8, `Pablo has eight journeys on the map: ${js.map((j) => j.id)}`);
    assert.equal(new Set(js.map((j) => j.color)).size, 8, `each journey has its own colour: ${js.map((j) => `${j.id} ${j.color}`)}`);
    for (const j of js) {
      const d = await drawnAt(page, j.t);
      assert.equal(d.V, j.id, `${j.t.toFixed(2)} is inside ${j.id}`);
      assert.deepEqual(d.pabloRastro, [], `${screen.width}px, ${j.id} at ${j.t.toFixed(2)}: no other journey of Pablo is drawn, got ${d.pabloRastro}`);
      assert.deepEqual([...new Set([...d.hecho, ...d.falta])], [j.id], `${j.id}: the journey in course is drawn`);
      assert.ok(d.leyenda.includes(j.nombre), `${j.id}: the legend names it: «${d.leyenda}»`);
      assert.ok(!/Otros viajes/.test(d.leyenda) || d.rastroEstados.some((s) => !/:actual:/.test(s)), `${j.id}: no legend row for faded journeys that are not drawn: «${d.leyenda}»`);
    }
    assert.deepEqual(page.pageErrors, []);
    await page.context().close();
  }
});

test('after Pablo\'s last stop the map draws nothing of his', async () => {
  const page = await openMap();
  const fin = await page.evaluate(() => window.__be.BE.P.at(-1).b);
  for (const t of [fin + 0.2, fin + 0.8]) {
    const d = await drawnAt(page, t);
    assert.equal(d.V, null);
    assert.deepEqual([...d.hecho, ...d.falta, ...d.pabloRastro], [], `${t.toFixed(2)}: nothing of Pablo, got ${d.pabloRastro}`);
  }
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('a journey selected outside its date is drawn alone, whole and in its colour', async () => {
  const page = await openMap();
  const js = await pabloJourneys(page);
  const primero = js.find((j) => j.id === 'primer-viaje'), tercero = js.find((j) => j.id === 'tercer-viaje');
  const d = await drawnAt(page, tercero.t, { tipo: 'viaje', id: 'primer-viaje' });
  assert.deepEqual([...d.hecho, ...d.falta], [], 'the journey in course is hidden while another is selected');
  assert.deepEqual(d.rastro, ['primer-viaje']);
  assert.ok(d.rastroEstados.every((s) => s === `primer-viaje:actual:${primero.color}`), `drawn in its own colour: ${d.rastroEstados}`);
  assert.ok(d.leyenda.includes('Primer viaje misional') && /completo/.test(d.leyenda), `«${d.leyenda}»`);
  // Unselected, the date shows its own journey again.
  const e = await drawnAt(page, tercero.t, null);
  assert.deepEqual([...new Set([...e.hecho, ...e.falta])], ['tercer-viaje']);
  assert.deepEqual(e.pabloRastro, []);
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('with the «Viajes» layer off no journey is drawn, and other travellers still draw theirs', async () => {
  const off = await openMap(DESKTOP, 't=50.5&ocultas=viajes');
  const d = await drawnAt(off, 50.5);
  assert.deepEqual([...d.hecho, ...d.falta, ...d.rastro], []);
  await off.context().close();
  const page = await openMap();
  const jesus = await drawnAt(page, 32.5);
  assert.ok(jesus.otros.length > 0 && jesus.pabloRastro.length === 0, `Jesús in 32: ${jesus.otros}`);
  const david = await drawnAt(page, -1076.5);
  assert.ok(david.otros.length > 0, `1077 a.e.c.: ${david.otros}`);
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});
