// The data in two chunks (site/js/data-chunks.js, docs/development.md «Los trozos de los datos»), tested in a real
// headless browser: the site opens with data.core.json and asks for data.detail.json once, whoever needs it first; a
// card waits for the detail and says so, while the map, the timeline and the search do not; a failed detail is said in
// the card, not thrown; in English the detail gets its English too; file:// and a folder with no core still load the
// whole data.json; and the map, the timeline,
// «Mientras tanto», «Ahora» and the landing painted from the core alone are the same as painted from the whole
// data.json. The last test opens every view with the chunks and counts the console errors.
// MapLibre comes from unpkg.com, so the map tests need the network for it; every other host is blocked.
//
// Run from the root of the repository, one browser at a time:
//   node --test --test-concurrency=1 tests/site/data-chunks.test.mjs
// Needs playwright-core with a Chromium (importable, or PLAYWRIGHT_CORE=<path to playwright-core>) and the data built
// into site/ with python3 scripts/build.py (data.json, data.js, data.core.json, data.detail.json, stats.json).
// BE_SITE_DIR=<dir> tests another copy of the site. Hosts other than the local server and unpkg.com are blocked.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SITE_DIR = path.resolve(process.env.BE_SITE_DIR || path.join(ROOT, 'site'));
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 430, height: 900 }, isMobile: true, hasTouch: true };
// A folder with only data.json, as one compiled before the chunks: served at _local/entero/.
const WHOLE = '_local/entero/data.json';

function loadChromium() {
  const req = createRequire(import.meta.url);
  const tries = [process.env.PLAYWRIGHT_CORE, process.env.PLAYWRIGHT_MODULE_DIR, 'playwright-core', 'playwright'].filter(Boolean);
  for (const t of tries) { try { const m = req(t); if (m.chromium) return m.chromium; } catch { /* next */ } }
  throw new Error('playwright-core not found: run with `npx -y -p playwright-core@1 node --test tests/site/data-chunks.test.mjs`.');
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
function serve(dir) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = rel === `/${WHOLE}` ? path.join(dir, 'data.json') : path.join(dir, rel.endsWith('/') ? `${rel}index.html` : rel);
    if (!file.startsWith(dir) || rel.startsWith('/_local/') && rel !== `/${WHOLE}`) { res.writeHead(404); res.end(); return; }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

let browser, server, base, D;
before(async () => {
  for (const f of ['data.json', 'data.js', 'data.core.json', 'data.detail.json']) {
    assert.ok(fs.existsSync(path.join(SITE_DIR, f)), `${SITE_DIR}/${f} is missing: run python3 scripts/build.py first.`);
  }
  D = JSON.parse(fs.readFileSync(path.join(SITE_DIR, 'data.json'), 'utf8'));
  server = await serve(SITE_DIR);
  base = `http://127.0.0.1:${server.address().port}/`;
  const chromium = loadChromium();
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'];
  try { browser = await chromium.launch({ headless: true, args }); }
  catch { browser = await chromium.launch({ headless: true, args, channel: 'chrome' }); }
});
afterEach(async () => { for (const c of browser?.contexts() || []) await c.close().catch(() => {}); });
after(async () => { await browser?.close(); server?.close(); });

/** Opens the site with a request log, page errors and console errors from our own files. `detail` decides what the
    detail request gets: 'pass', 'abort' or a promise that releases it. */
async function openPage({ screen = DESKTOP, url = 'index.html', hash = '', detail = 'pass', wait = true } = {}) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...screen });
  context.setDefaultTimeout(10000);
  const page = await context.newPage();
  page.requests = [];
  page.pageErrors = [];
  page.consoleErrors = [];
  page.events = [];   // «ask /data.core.json», «got /data.core.json», in the order they happen
  page.on('request', (r) => { page.requests.push(new URL(r.url()).pathname); page.events.push(`ask ${new URL(r.url()).pathname}`); });
  page.on('requestfinished', (r) => page.events.push(`got ${new URL(r.url()).pathname}`));
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && (m.location().url || '').startsWith(base)) page.consoleErrors.push(m.text()); });
  await page.route((u) => !u.href.startsWith(base) && !u.hostname.endsWith('unpkg.com'), (r) => r.abort());   // MapLibre comes from unpkg
  if (detail !== 'pass') {
    await page.route('**/data.detail.json', async (r) => {
      if (detail === 'abort') return r.abort();
      await detail;
      return r.continue();
    });
  }
  await page.goto(`${base}${url}${hash ? `#${hash}` : ''}`);
  if (wait) await page.waitForFunction(() => window.BE?.D && window.__be, null, { timeout: 30000 });
  return page;
}
const frames = (page, n = 3) => page.evaluate((k) => new Promise((ok) => { const f = () => (k-- ? requestAnimationFrame(f) : ok()); f(); }), n);
/** Waits until the map stands still: a jump in time reframes it 300 ms later, and the labels and groups are laid out
    when it stops. */
const settle = async (page) => {
  await page.waitForTimeout(400);
  await page.waitForFunction(() => { const m = window.__be.map; return !m || (!m.isMoving() && m.loaded()); }, null, { timeout: 30000 });
  await frames(page, 6);
};
const count = (page, file) => page.requests.filter((p) => p.endsWith(`/${file}`)).length;
const panelText = (page) => page.locator('#panel-cuerpo').textContent();

test('the site opens with the core and asks for the detail once, whoever needs it first', async () => {
  // The detail is held back, so every requester asks while it is still on its way: the address, the card, the graph,
  // two direct calls and the search on top.
  let release;
  const held = new Promise((ok) => { release = ok; });
  const page = await openPage({ hash: 'sel=persona:pablo&t=50.3000', detail: held });
  await page.evaluate(() => { window.BE.grafo.abrir('pablo'); window.BE.chunks.load(); window.BE.chunks.load(); });
  await page.locator('#vista-grafo [role="status"]', { hasText: 'Cargando el grafo' }).waitFor();
  await page.locator('#q').fill('Bernabé');
  await page.locator('#resultados [data-i]').first().waitFor();
  await frames(page);
  assert.deepEqual(await page.evaluate(() => window.BE.chunks.loaded), [], 'the detail arrived before it was released');
  release();
  await page.locator('#panel-cuerpo .razon', { hasText: D.personas.pablo.razon.slice(0, 40) }).first().waitFor();
  await page.locator('#vista-grafo [data-gnodo-sel], #vista-grafo [data-grafo-centro]').first().waitFor();
  await page.evaluate(() => window.BE.conexion.abrir('persona:pablo', 'persona:bernabe'));
  await frames(page);
  assert.equal(count(page, 'data.core.json'), 1);
  assert.equal(count(page, 'data.detail.json'), 1, page.requests.filter((p) => p.includes('data')).join(', '));
  assert.equal(count(page, 'data.json'), 0);
  assert.deepEqual(await page.evaluate(() => window.BE.chunks.loaded), ['detail']);
  assert.deepEqual([...page.pageErrors, ...page.consoleErrors], []);
});

test('an address that opens a card asks for the detail at the same time as the core', async () => {
  const page = await openPage({ hash: 'sel=persona:pablo&t=50.3000' });
  await page.locator('#panel-cuerpo .razon', { hasText: D.personas.pablo.razon.slice(0, 40) }).first().waitFor();
  const at = (p, e) => p.events.indexOf(e);
  assert.ok(at(page, 'ask /data.detail.json') >= 0 && at(page, 'ask /data.detail.json') < at(page, 'got /data.core.json'), page.events.join(', '));
  // Without a card in the address, the detail waits for the map (or for whoever needs it first): never before the core.
  const map = await openPage({ hash: 't=50.3000' });
  await map.waitForFunction(() => window.BE.chunks.loaded.length, null, { timeout: 30000 });
  assert.ok(at(map, 'ask /data.detail.json') > at(map, 'got /data.core.json'), map.events.join(', '));
  // A passage link (#p=, passage-link.js) opens the first card that cites it: the same rule.
  const passage = await openPage({ hash: 'p=Hch16:1' });
  await passage.waitForFunction(() => window.BE.chunks.loaded.length, null, { timeout: 30000 });
  assert.ok(at(passage, 'ask /data.detail.json') >= 0 && at(passage, 'ask /data.detail.json') < at(passage, 'got /data.core.json'), passage.events.join(', '));
  assert.deepEqual([...page.pageErrors, ...page.consoleErrors, ...map.pageErrors, ...passage.pageErrors, ...passage.consoleErrors], []);
});

test('a card waits for the detail, says so, and paints when it arrives; the search does not wait', async () => {
  let release;
  const held = new Promise((ok) => { release = ok; });
  const page = await openPage({ hash: 'sel=persona:pablo&t=50.3000', detail: held });
  await frames(page);
  const busy = page.locator('#panel-cuerpo [role="status"][aria-busy="true"]');
  assert.equal((await busy.textContent()).trim(), 'Cargando la ficha…');
  assert.ok(!(await panelText(page)).includes(D.personas.pablo.razon), 'the reason showed before the detail arrived');
  // The map and the timeline did not wait: Pablo is already highlighted.
  assert.equal(await page.evaluate(() => window.BE.E.sel?.id), 'pablo');
  assert.ok(await page.locator('#linea-filas .m').count() > 0);
  // Nor does the search: it answers with the core, and the line that tells two namesakes apart comes with the detail.
  await page.locator('#q').fill('Zacarías');
  await page.locator('#resultados [data-i]').first().waitFor();
  assert.equal(count(page, 'data.detail.json'), 1);
  release();
  await page.locator('#panel-cuerpo .razon', { hasText: D.personas.pablo.razon.slice(0, 40) }).first().waitFor();
  assert.equal(await busy.count(), 0);
  assert.ok((await panelText(page)).includes(D.personas.pablo.resumen), 'the summary of the card is missing');
  assert.equal(count(page, 'data.detail.json'), 1);
  assert.deepEqual([...page.pageErrors, ...page.consoleErrors], []);
});

test('a detail that fails is said in the card, with no page error, and the map keeps working', async () => {
  const page = await openPage({ hash: 'sel=lugar:corinto&t=50.3000', detail: 'abort' });
  await page.locator('#panel-cuerpo [role="status"]', { hasText: 'No se pudo cargar la ficha' }).waitFor();
  await page.evaluate(() => window.BE.setT(60));
  await frames(page);
  assert.ok(await page.locator('#linea-filas .m').count() > 0);
  assert.deepEqual(page.pageErrors, []);
});

test('in English, the detail that arrives after the core gets its English too', async () => {
  // language.js puts data.en.json over the core; the summary and the reason of Filipos come later, in Spanish, with
  // the detail, and the loader has to apply the layer again after merging it. The detail is held until the layer is
  // on the core, or it could be merged first and the test would pass without the second apply.
  const EN = JSON.parse(fs.readFileSync(path.join(SITE_DIR, 'data.en.json'), 'utf8')).lugares.filipos;
  let release;
  const held = new Promise((ok) => { release = ok; });
  const page = await openPage({ url: 'index.html?lang=en', hash: 'sel=lugar:filipos&t=50.3000', detail: held });
  await page.waitForFunction((name) => window.BE.D.lugares.filipos.nombre === name, EN.nombre);
  assert.deepEqual(await page.evaluate(() => window.BE.chunks.loaded), []);
  release();
  await page.locator('#panel-cuerpo .be-card__body', { hasText: EN.resumen.slice(0, 40) }).first().waitFor();
  const f = await page.evaluate(() => { const l = window.BE.D.lugares.filipos; return { resumen: l.resumen, razon: l.razon }; });
  assert.deepEqual(f, { resumen: EN.resumen, razon: EN.razon });
  assert.equal(count(page, 'data.detail.json'), 1);
  assert.deepEqual([...page.pageErrors, ...page.consoleErrors], []);
});

test('from file:// the site loads data.js whole and a card opens with its texts', async () => {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...DESKTOP });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/^https?:/, (r) => r.abort());
  await page.goto(`${pathToFileURL(path.join(SITE_DIR, 'index.html')).href}#sel=persona:pablo&t=50.3000`);
  await page.waitForFunction(() => window.BE?.D && window.__be, null, { timeout: 30000 });
  assert.deepEqual(await page.evaluate(() => window.BE.chunks.loaded), ['whole']);
  await page.locator('#panel-cuerpo .razon', { hasText: D.personas.pablo.razon.slice(0, 40) }).first().waitFor();
  assert.deepEqual(errors, []);
});

test('a ?datos= folder with no core loads its data.json whole', async () => {
  const page = await openPage({ url: `index.html?datos=${WHOLE}`, hash: 't=50.3000' });
  assert.deepEqual(await page.evaluate(() => window.BE.chunks.loaded), ['whole']);
  await page.evaluate(() => window.BE.seleccionar(window.BE.parseSel('persona:pablo')));
  await page.locator('#panel-cuerpo .razon', { hasText: D.personas.pablo.razon.slice(0, 40) }).first().waitFor();
  assert.equal(count(page, 'data.core.json'), 1);   // asked, 404
  assert.equal(count(page, 'data.json'), 1);
  assert.equal(count(page, 'data.detail.json'), 0);
  assert.deepEqual(page.pageErrors, []);
});

/** What the views that open first paint: the timeline marks, the map's GeoJSON sources and markers, «Mientras tanto»,
    the «Ahora» panel when nothing is chosen, and the landing. */
const snapshot = (page) => page.evaluate(() => {
  const map = window.__be.map;
  const sources = {};
  for (const [id, s] of Object.entries(map?.getStyle?.()?.sources || {})) {
    if (s.type === 'geojson') sources[id] = JSON.stringify(map.getSource(id).serialize().data);
  }
  const text = (q) => document.querySelector(q)?.textContent.replace(/\s+/g, ' ').trim() || '';
  return {
    timeline: document.querySelector('#linea-filas')?.innerHTML || '',
    sources,
    markers: [...document.querySelectorAll('.maplibregl-marker')].map((m) => `${m.textContent.trim()}|${m.getAttribute('aria-label') || m.querySelector('[aria-label]')?.getAttribute('aria-label') || ''}`).sort(),
    mientras: text('#mientras'),
    panel: window.BE.E.sel ? '' : text('#panel-cuerpo'),
    landing: `${text('#portada-cifras')}|${text('#portada-epocas')}|${text('#portada-recorridos')}`,
  };
});

for (const [name, screen] of [['desktop', DESKTOP], ['phone', PHONE]]) {
  test(`${name}: the map, the timeline and the landing painted from the core are the ones painted from the whole data`, async () => {
    // core: the detail never arrives. whole: data.json from the start, as before the chunks.
    const core = await openPage({ screen, detail: 'abort' });
    const whole = await openPage({ screen, url: `index.html?datos=${WHOLE}` });
    await frames(core); await frames(whole);
    assert.equal((await snapshot(core)).landing, (await snapshot(whole)).landing);
    assert.match((await snapshot(core)).landing, /enlazados a [\d.]+ fuentes/);
    for (const p of [core, whole]) {
      await p.evaluate(() => { window.location.hash = 't=50.3000'; });
      await p.waitForFunction(() => !window.BE.portada?.abierta);
      await p.waitForFunction(() => window.__be.map?.loaded?.() && window.__be.map.getSource('be-rastro'), null, { timeout: 60000 });
    }
    const [t0, t1] = await core.evaluate(() => [window.BE.T_MIN, window.BE.T_MAX]);
    const views = [
      [null, 0.08], [null, 0.35], [null, 0.5031], [null, 0.97],
      ['persona:pablo', null], ['lugar:jerusalen', null], ['persona:abrahan', null], ['viaje:primer-viaje', null],
    ];
    const seen = { sources: 0, mientras: 0 };   // a comparison of two empty maps would prove nothing
    for (const [sel, f] of views) {
      for (const p of [core, whole]) {
        await p.evaluate(([s, t]) => {
          window.BE.seleccionar(s ? window.BE.parseSel(s) : null, { mover: true, encuadrar: false });
          if (t != null) window.BE.setT(t);
        }, [sel, f == null ? null : t0 + f * (t1 - t0)]);
      }
      await settle(core); await settle(whole);
      const a = await snapshot(core), b = await snapshot(whole);
      for (const k of ['timeline', 'mientras', 'panel']) assert.equal(a[k], b[k], `${sel || f}: ${k} differs`);
      assert.deepEqual(a.markers, b.markers, `${sel || f}: map markers differ`);
      assert.deepEqual(Object.keys(a.sources).sort(), Object.keys(b.sources).sort());
      for (const id of Object.keys(a.sources)) assert.equal(a.sources[id], b.sources[id], `${sel || f}: map source ${id} differs`);
      seen.sources += Object.keys(a.sources).length;
      if (a.mientras) seen.mientras++;
    }
    assert.ok(seen.sources > 0, 'the map painted no source: MapLibre did not load');
    assert.ok(seen.mientras > 0, '«Mientras tanto» never showed: the comparison did not cover it');
    assert.deepEqual([...core.pageErrors, ...whole.pageErrors], []);
  });
}

test('every view opens with the chunks, with no console error', async () => {
  const st = JSON.parse(fs.readFileSync(path.join(SITE_DIR, 'stats.json'), 'utf8'));
  const page = await openPage();
  // The landing figures: the ones build.py writes for the README badges.
  const n = (k) => st[k].toLocaleString('es');
  assert.equal((await page.locator('#portada-cifras').textContent()).trim(),
    `${n('eventos')} sucesos, ${n('lugares')} lugares y ${n('personas')} personas, enlazados a ${n('fuentes')} fuentes y a ${n('capitulos')} capítulos de la Biblia.`);
  // The landing box answers once the detail is there.
  await page.locator('#portada-q').fill('Timoteo');
  await page.locator('#portada-lista [role="option"]').first().waitFor();
  // The map at several dates.
  await page.evaluate(() => { window.location.hash = 't=50.3000'; });
  for (const t of [10, 30, 50.3, 70, 95]) { await page.evaluate((x) => window.BE.setT(x), t); await frames(page); }
  // A person card with its graph.
  await page.evaluate(() => { window.location.hash = 'sel=persona:pedro&grafo=pedro'; });
  await page.locator('#panel-cuerpo .razon', { hasText: D.personas.pedro.razon.slice(0, 40) }).first().waitFor();
  await page.locator('#vista-grafo:not([hidden])').waitFor();
  assert.ok(await page.locator('#vista-grafo [data-gnodo-sel], #vista-grafo [data-grafo-centro]').count() > 0, 'the graph has no nodes');
  // The search on top.
  await page.evaluate(() => { window.location.hash = 't=50.3000'; });
  await page.locator('#q').fill('Filipos');
  await page.locator('#resultados [data-i]').first().waitFor();
  // A journey in reading mode.
  await page.evaluate(() => { window.location.hash = 'sel=viaje:primer-viaje&leer=hch-13'; });
  await page.locator('#vista-lectura:not([hidden])').waitFor();
  await page.locator('#panel-cuerpo .razon', { hasText: D.viajes.find((v) => v.id === 'primer-viaje').razon.slice(0, 30) }).first().waitFor();
  // A guided tour.
  await page.evaluate(() => { window.location.hash = 'sel=recorrido:cartas-y-ciudades&paso=1'; });
  await page.locator('#panel-cuerpo .recorrido .be-card__eyebrow', { hasText: 'parada 1 de' }).waitFor();
  await page.locator('#panel-cuerpo .por-que').waitFor();
  assert.equal(count(page, 'data.detail.json'), 1);
  assert.deepEqual([...page.pageErrors, ...page.consoleErrors], []);
  // The calendar page.
  const cal = await openPage({ url: 'calendario.html', wait: false });
  await cal.locator('.cal-fuentes a').first().waitFor();
  assert.deepEqual([...cal.pageErrors, ...cal.consoleErrors], []);
});
