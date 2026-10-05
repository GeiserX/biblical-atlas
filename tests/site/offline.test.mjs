// The site offline (site/sw.js, site/js/offline.js, docs/development.md «Sin conexión»), tested in a real headless
// browser. After one online visit the site opens with no network: the map, the timeline and a card, with no console
// error. The detail works offline once it was fetched online, and a detail from another version is refused, not
// merged. A new deploy shows the notice and waits for the click. file:// opens as before, with no worker. And every
// file the three pages ask for when they open is in the precache list.
//
// "No network" is three things at once, so that no path can reach the server by mistake: the context is offline, the
// local server cuts every connection, and every other host is aborted (also for the worker's own requests).
//
// Run from the root of the repository, one browser at a time:
//   node --test --test-concurrency=1 tests/site/offline.test.mjs
// Needs playwright-core with a Chromium (importable, or PLAYWRIGHT_MODULE_DIR / PLAYWRIGHT_CORE) and the data built
// into site/ with python3 scripts/build.py (it also writes site/sw-manifest.js). BE_SITE_DIR=<dir> tests another copy.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SITE_DIR = path.resolve(process.env.BE_SITE_DIR || path.join(ROOT, 'site'));
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const CARD = 'sel=persona:pablo&t=50.3000';
// The style of the map of today: a tiny stand-in, so that the worker's tile cache can be seen at work without the network.
const STYLE = 'https://tiles.openfreemap.org/styles/positron';
const FAKE_STYLE = { version: 8, sources: {}, layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#dfe8ec' } }] };

function loadChromium() {
  const req = createRequire(import.meta.url);
  const tries = [process.env.PLAYWRIGHT_MODULE_DIR && path.join(process.env.PLAYWRIGHT_MODULE_DIR, 'playwright-core'),
    process.env.PLAYWRIGHT_CORE, 'playwright-core', 'playwright'].filter(Boolean);
  for (const t of tries) { try { const m = req(t); if (m.chromium) return m.chromium; } catch { /* next */ } }
  throw new Error('playwright-core not found: set PLAYWRIGHT_MODULE_DIR or PLAYWRIGHT_CORE.');
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };

// What the server answers differently: `down` cuts every connection, `overrides` replaces a file («/sw-manifest.js»
// for a new deploy, «/data.detail.json» for a detail from another version).
const server = { down: false, overrides: new Map() };
function serve(dir) {
  const s = http.createServer((req, res) => {
    if (server.down) { req.socket.destroy(); return; }
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (server.overrides.has(rel)) {
      res.writeHead(200, { 'content-type': TYPES[path.extname(rel)] || 'application/octet-stream' });
      res.end(server.overrides.get(rel));
      return;
    }
    const file = path.join(dir, rel.endsWith('/') ? `${rel}index.html` : rel);
    if (!file.startsWith(dir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  return new Promise((ok) => s.listen(0, '127.0.0.1', () => ok(s)));
}

/** PRECACHE and LIBS of site/sw.js, read by running its top in a sandbox. */
function workerLists() {
  const src = fs.readFileSync(path.join(SITE_DIR, 'sw.js'), 'utf8');
  const self = { location: 'http://x/sw.js', addEventListener() {} };
  const box = { self, importScripts() { self.SW_MANIFEST = { version: 't', files: {} }; }, URL, Response, console };
  vm.runInNewContext(`${src}\n;globalThis.__lists = { PRECACHE, LIBS };`, box);
  return box.__lists;
}

let browser, http_, base, D;
before(async () => {
  for (const f of ['data.json', 'data.js', 'data.core.json', 'data.detail.json', 'sw-manifest.js']) {
    assert.ok(fs.existsSync(path.join(SITE_DIR, f)), `${SITE_DIR}/${f} is missing: run python3 scripts/build.py first.`);
  }
  D = JSON.parse(fs.readFileSync(path.join(SITE_DIR, 'data.json'), 'utf8'));
  http_ = await serve(SITE_DIR);
  base = `http://127.0.0.1:${http_.address().port}/`;
  const chromium = loadChromium();
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'];
  try { browser = await chromium.launch({ headless: true, args }); }
  catch { browser = await chromium.launch({ headless: true, args, channel: 'chrome' }); }
});
afterEach(async () => {
  server.down = false;
  server.overrides.clear();
  for (const c of browser?.contexts() || []) await c.close().catch(() => {});
});
after(async () => { await browser?.close(); http_?.close(); });

/** A context with the worker switched on (it only registers by itself over https). */
async function newContext({ worker = true } = {}) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...DESKTOP });
  context.setDefaultTimeout(15000);
  context.offline = false;
  context.requests = [];
  context.on('request', (r) => context.requests.push(r.url()));
  if (worker) await context.addInitScript(() => { try { localStorage.setItem('biblical-atlas:sin-conexion', '1'); } catch { /* none */ } });
  await context.route((u) => !u.href.startsWith(base), (r) => {
    const url = r.request().url();
    if (context.offline) return r.abort('internetdisconnected');
    if (new URL(url).hostname.endsWith('unpkg.com')) return r.continue();   // MapLibre
    if (url === STYLE) return r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(FAKE_STYLE) });
    return r.abort();
  });
  return context;
}
async function offline(context, on = true) {
  context.offline = on;
  server.down = on;
  await context.setOffline(on);
}
/** A page with its page errors, its console errors and its console warnings. */
async function newPage(context) {
  const page = await context.newPage();
  page.errors = [];
  page.warnings = [];
  page.on('pageerror', (e) => page.errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') page.errors.push(`${m.text()} (${m.location().url})`);
    if (m.type() === 'warning') page.warnings.push(m.text());
  });
  return page;
}
const started = (page) => page.waitForFunction(() => window.BE?.D && window.__be, null, { timeout: 30000 });
const controlled = (page) => page.waitForFunction(() => navigator.serviceWorker?.controller?.state === 'activated', null, { timeout: 60000 });
/** Is `rel` in the cache of the version? */
const cached = (page, rel) => page.evaluate(async (r) => {
  for (const k of await caches.keys()) {
    if (k.startsWith('biblical-atlas-v-') && await (await caches.open(k)).match(new URL(r, location.href).href)) return true;
  }
  return false;
}, rel);
const waitCached = async (page, rel) => {
  for (let i = 0; i < 100 && !(await cached(page, rel)); i++) await page.waitForTimeout(200);
  assert.ok(await cached(page, rel), `${rel} never reached the cache`);
};
/** The map, the timeline and a person's card with its texts from the detail. */
async function seesTheSite(page, who = 'pablo') {
  await started(page);
  await page.waitForFunction(() => { const m = window.__be.map; return m && m.loaded() && !m.isMoving(); }, null, { timeout: 30000 });
  assert.ok(await page.locator('#mapa-gl canvas').count() > 0, 'no map canvas');
  assert.ok(await page.locator('#mapa-gl .maplibregl-marker').count() > 0, 'no places on the map');
  assert.ok(await page.locator('#linea-filas .m').count() > 0, 'no timeline marks');
  await page.locator('#panel-cuerpo .razon', { hasText: D.personas[who].razon.slice(0, 40) }).first().waitFor();
}

test('after one online visit the site opens offline: map, timeline and a card, with no console error', async (t) => {
  const context = await newContext();
  const page = await newPage(context);
  // A reader opens Pablo's card. The detail, the map backgrounds, the style of the map of today and the list of videos
  // of people were asked for before the worker took the page: they reach the cache through the «seen» message.
  await page.goto(`${base}index.html#${CARD}`);
  await started(page);
  await controlled(page);
  await waitCached(page, 'data.detail.json');
  await waitCached(page, 'maps/mundo-antiguo.webp');
  await waitCached(page, 'videos-personas.json');
  const tiles = async () => page.evaluate(async () => (await (await caches.open('biblical-atlas-teselas')).keys()).map((r) => r.url));
  for (let i = 0; i < 50 && !(await tiles()).includes(STYLE); i++) await page.waitForTimeout(200);
  assert.ok((await tiles()).includes(STYLE), `the map style is not in the tile cache: ${(await tiles()).join(', ')}`);
  const size = await page.evaluate(async (precache) => {
    const keys = await caches.keys();
    const c = await caches.open(keys.find((k) => k.startsWith('biblical-atlas-v-')));
    let total = 0;
    for (const u of precache) total += (await (await c.match(u)).arrayBuffer()).byteLength;
    return total;
  }, [...workerLists().PRECACHE.map((r) => base + r), ...workerLists().LIBS]);
  t.diagnostic(`precache: ${(size / 1e6).toFixed(2)} MB`);

  // Offline, another card: Bernabé's, whose texts come from the same detail.
  await offline(context);
  const back = await newPage(context);
  await back.goto(`${base}index.html#sel=persona:bernabe&t=47`);
  await seesTheSite(back, 'bernabe');
  // The map of today came from the tile cache: no fallback to our own relief.
  assert.ok(!back.warnings.some((w) => w.includes('El estilo de OpenFreeMap no respondió')), back.warnings.join('\n'));
  // The two other pages too.
  await back.goto(`${base}acerca.html`);
  await back.locator('h1').first().waitFor();
  assert.deepEqual([...page.errors, ...back.errors], []);
});

test('the detail works offline once it was fetched online, and not before', async () => {
  const context = await newContext();
  const page = await newPage(context);
  await page.goto(`${base}index.html`);
  await started(page);
  await controlled(page);
  await waitCached(page, 'data.detail.json');
  // Forget it, as if the first visit had never asked for it: offline, the card says it could not load it.
  await page.evaluate(async () => {
    for (const k of await caches.keys()) if (k.startsWith('biblical-atlas-v-')) await (await caches.open(k)).delete(new URL('data.detail.json', location.href).href);
  });
  await offline(context);
  const cut = await newPage(context);
  await cut.goto(`${base}index.html#${CARD}`);
  await started(cut);
  await cut.locator('#panel-cuerpo [role="status"]', { hasText: 'No se pudo cargar la ficha' }).waitFor();
  // Online it is fetched once, through the worker, and kept; offline again, the card opens.
  await offline(context, false);
  const online = await newPage(context);
  await online.goto(`${base}index.html#${CARD}`);
  await seesTheSite(online);
  assert.ok(await cached(online, 'data.detail.json'));
  await offline(context);
  const again = await newPage(context);
  await again.goto(`${base}index.html#${CARD}`);
  await seesTheSite(again);
  assert.deepEqual([...page.errors, ...online.errors, ...again.errors], []);
});

test('a detail from another version is refused, not merged with the core of this one', async () => {
  const context = await newContext();
  const page = await newPage(context);
  await page.goto(`${base}index.html`);
  await started(page);
  await controlled(page);
  await waitCached(page, 'data.detail.json');
  await page.evaluate(async () => {
    for (const k of await caches.keys()) if (k.startsWith('biblical-atlas-v-')) await (await caches.open(k)).delete(new URL('data.detail.json', location.href).href);
  });
  // The server already has another deploy: its detail is valid JSON, with Pablo's reason changed.
  const other = JSON.parse(fs.readFileSync(path.join(SITE_DIR, 'data.detail.json'), 'utf8'));
  other.personas.pablo.razon = 'Un texto de otra versión.';
  server.overrides.set('/data.detail.json', JSON.stringify(other));
  const next = await newPage(context);
  await next.goto(`${base}index.html#${CARD}`);
  await started(next);
  await next.locator('#panel-cuerpo [role="status"]', { hasText: 'No se pudo cargar la ficha' }).waitFor();
  assert.ok(!(await next.locator('#panel-cuerpo').textContent()).includes('otra versión'), 'the detail of another version was merged');
  assert.equal(await cached(next, 'data.detail.json'), false);
});

test('a new deploy shows the notice and waits for the click to reload', async () => {
  const context = await newContext();
  const page = await newPage(context);
  await page.goto(`${base}index.html#${CARD}`);
  await started(page);
  await controlled(page);
  const second = await newPage(context);
  await second.goto(`${base}acerca.html`);
  await controlled(second);
  const before = await page.evaluate(() => caches.keys());
  // A new deploy: the same files under another version.
  const manifest = fs.readFileSync(path.join(SITE_DIR, 'sw-manifest.js'), 'utf8');
  server.overrides.set('/sw-manifest.js', manifest.replace(/"version": "([0-9a-f]+)"/, '"version": "$1-2"'));
  for (const p of [page, second]) await p.evaluate(() => { window.__same = true; });
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  const notice = page.locator('#nueva-version[role="status"]');
  await notice.waitFor();
  assert.match(await notice.textContent(), /Hay una versión nueva/);
  // It covers no control of the map, on a phone or on a desktop: only what scrolls (the rows of the timeline).
  for (const width of [430, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const covered = await page.evaluate(() => {
      const box = document.getElementById('nueva-version');
      const r = box.getBoundingClientRect();
      const hit = new Set();
      for (let x = r.left + 2; x < r.right; x += 6) {
        for (let y = r.top + 2; y < r.bottom; y += 6) {
          for (const el of document.elementsFromPoint(x, y)) {
            const c = el.closest('button:not(#linea-filas *), a, input, select, h1');
            if (c && !box.contains(c)) hit.add(c.id || c.className || c.textContent.trim().slice(0, 30));
          }
        }
      }
      return [...hit];
    });
    assert.deepEqual(covered, [], `at ${width} px the notice covers: ${covered.join(', ')}`);
  }
  await page.setViewportSize(DESKTOP.viewport);
  // Nothing reloads by itself: five seconds later, both pages are still the same documents, under the old worker.
  await page.waitForTimeout(5000);
  assert.equal(await page.evaluate(() => window.__same), true, 'the page reloaded by itself');
  assert.equal(await second.evaluate(() => window.__same), true, 'the other page reloaded by itself');
  assert.equal((await page.evaluate(() => caches.keys())).filter((k) => k.startsWith('biblical-atlas-v-')).length, 2);
  // The click takes it: this page and the other one reload, and only the new version's cache is left.
  await Promise.all([page.waitForEvent('load'), second.waitForEvent('load'), notice.getByRole('button', { name: 'Recargar' }).click()]);
  await started(page);
  assert.equal(await page.evaluate(() => window.__same), undefined);
  assert.equal(await second.evaluate(() => window.__same), undefined);
  const after = (await page.evaluate(() => caches.keys())).filter((k) => k.startsWith('biblical-atlas-v-'));
  assert.equal(after.length, 1);
  assert.ok(after[0].endsWith('-2') && !before.includes(after[0]), after.join());
  assert.equal(await page.locator('#nueva-version').count(), 0);
  assert.deepEqual(page.errors, []);
});

test('from file:// the site opens as before, with no worker', async () => {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...DESKTOP });
  await context.addInitScript(() => { try { localStorage.setItem('biblical-atlas:sin-conexion', '1'); } catch { /* none */ } });
  await context.route(/^https?:/, (r) => (new URL(r.request().url()).hostname.endsWith('unpkg.com') ? r.continue() : r.abort()));
  const page = await newPage(context);
  await page.goto(`${pathToFileURL(path.join(SITE_DIR, 'index.html')).href}#${CARD}`);
  await started(page);
  assert.deepEqual(await page.evaluate(() => window.BE.chunks.loaded), ['whole']);
  await page.locator('#panel-cuerpo .razon', { hasText: D.personas.pablo.razon.slice(0, 40) }).first().waitFor();
  assert.ok(await page.locator('#linea-filas .m').count() > 0);
  await page.waitForTimeout(1000);
  assert.equal(await page.evaluate(() => !!navigator.serviceWorker?.controller), false);
  assert.ok(!page.warnings.some((w) => w.includes('Sin conexión')), page.warnings.join('\n'));
  assert.deepEqual(page.errors.filter((e) => !/tiles\.openfreemap|ERR_FAILED/.test(e)), []);
});

test('every file the three pages ask for when they open is in the precache list', async () => {
  const { PRECACHE, LIBS } = workerLists();
  for (const rel of PRECACHE) assert.ok(fs.existsSync(path.join(SITE_DIR, rel)), `PRECACHE names ${rel}, which does not exist`);
  // Fetched when first needed, not to open: the detail, the English, the videos, the maps, data.json (the calendar).
  const RUNTIME = /^(data\.detail\.json|data\.[a-z]{2}\.json|data\.json|videos[\w-]*\.json|maps\/.+|i18n\/.+|sw\.js|sw-manifest\.js)$/;
  const context = await newContext({ worker: false });
  const page = await newPage(context);
  for (const url of ['index.html', `index.html#${CARD}`, 'acerca.html', 'calendario.html']) {
    await page.goto(base + url);
    if (url.startsWith('index')) await started(page);
    await page.waitForLoadState('networkidle');
  }
  const asked = new Set(context.requests.map((u) => (u.startsWith(base) ? decodeURIComponent(new URL(u).pathname.slice(1)) || 'index.html' : u.split('?')[0])));
  const missing = [...asked].filter((u) => (u.startsWith('https://unpkg.com/') ? !LIBS.includes(u) : !u.startsWith('http') && !RUNTIME.test(u) && !PRECACHE.includes(u)));
  assert.deepEqual(missing, [], `asked for when a page opens, but not precached: ${missing.join(', ')}`);
  assert.ok(asked.has('data.core.json') && asked.has('js/base.js') && LIBS.every((u) => asked.has(u)), [...asked].join('\n'));
});
