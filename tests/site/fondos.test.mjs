// The map's backgrounds (site/maps/*.webp, cargarFondos in site/js/mapa.js) are asked for when they show, not before.
// They weigh more than the data, and the first view only draws one of them: at 1440 by 900 the Mediterranean, which
// covers the whole view, and at 430 the world, because the map opens below the zoom where the Mediterranean fades in.
// Until the map first rests it asks for no other background, and stays under a byte budget. From then on it also asks
// for every image coarser than the finest one it draws (the world on the desktop, Israel, the Mediterranean and the world
// after a link to Getsemaní), so zooming out never shows bare paper; a finer one arrives when its zoom and its place are
// reached: the land of Israel in Galilee, Jerusalén close to the city. The map of today with the fallback style (no OpenFreeMap)
// asks for the «actual» images only when it is shown, and with the «Relieve» layer off nothing is asked for. Every
// image layer sits in its place: each extent above the coarser one, all below the data. A gesture (the wheel, the keys)
// asks for what it shows while it moves; a move asked by the site (flyTo) waits until it stops.
//
// Run from the repository root, one browser at a time:
//   node --test --test-concurrency=1 tests/site/fondos.test.mjs
// Needs network access for MapLibre (unpkg.com) and playwright-core with a Chromium: either importable, or
// PLAYWRIGHT_MODULE_DIR=<a node_modules directory that holds it>. CHROME_PATH picks another Chromium binary. It uses
// site/data.json when it exists, BE_DATA_FILE=<data.json> when given, or builds the data into a temporary directory.
// BE_ROOT=<a checkout> tests that checkout's site (the control: before this change the first view asked for all four
// old-style images, 1.8 MB, and with the fallback style for the four of today as well).
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
const DESKTOP = { name: '1440', viewport: { width: 1440, height: 900 } };
const PHONE = { name: '430', viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true };
// What the first view may ask for, per screen: the one image of the old style it draws, and nothing else.
const FIRST_VIEW = { 1440: 'mediterraneo', 430: 'mundo' };
// What it asks for once the map has rested: the first view and every image coarser than it.
const AT_REST = { 1440: ['mediterraneo-antiguo.webp', 'mundo-antiguo.webp'], 430: ['mundo-antiguo.webp'] };
// Bytes of backgrounds until the map first rests. Before the lazy loading it asked for all four, 1,824,877 bytes.
// At quality 82 the one image alone broke it too: the Mediterranean weighed 575,830 bytes and the world 880,494; at
// quality 70 they weigh 393,250 and 530,802.
const FIRST_VIEW_BUDGET = 550_000;

async function loadChromium() {
  for (const name of ['playwright-core', 'playwright']) {
    try { return (await import(name)).chromium; } catch { /* next */ }
    if (process.env.PLAYWRIGHT_MODULE_DIR) {
      try { return createRequire(path.join(path.resolve(process.env.PLAYWRIGHT_MODULE_DIR), 'index.js'))(name).chromium; } catch { /* next */ }
    }
  }
  throw new Error('playwright-core not found: install it or set PLAYWRIGHT_MODULE_DIR to a node_modules directory that holds it');
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webp': 'image/webp' };
function serve(siteDir, dataFile) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).slice(1) || 'index.html';
    const chunk = /^data\.[a-z]+\.json$/.test(rel) ? path.join(path.dirname(dataFile), rel) : null;
    const file = rel === 'data.json' ? dataFile : chunk || path.join(siteDir, rel);
    if (file !== dataFile && file !== chunk && !file.startsWith(siteDir)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(body);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

let browser, server, base, tmp;
before(async () => {
  const site = path.join(ROOT, 'site');
  let data = process.env.BE_DATA_FILE ? path.resolve(process.env.BE_DATA_FILE) : path.join(site, 'data.json');
  if (!fs.existsSync(data)) {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-fondos-'));
    execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--salida', tmp], { cwd: ROOT, stdio: 'pipe' });
    data = path.join(tmp, 'data.json');
  }
  server = await serve(site, data);
  base = `http://127.0.0.1:${server.address().port}/`;
  const chromium = await loadChromium();
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
});
after(async () => {
  await browser?.close();
  server?.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

/** Opens the map (no landing) with every other host but unpkg.com cut, so the map runs on its fallback style, the one
    that draws the images of today too. `fondos` lists each background asked for, with its bytes once it arrived. */
async function open(screen, hash = 't=50.3000') {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...screen });
  context.setDefaultTimeout(60000);
  const page = await context.newPage();
  page.pageErrors = [];
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  page.fondos = new Map();
  page.on('request', (r) => { const m = r.url().match(/\/maps\/([\w-]+\.webp)$/); if (m) page.fondos.set(m[1], null); });
  // r.sizes() resolves after the event: the budget check waits for all of them, so no image counts as 0 bytes. An
  // answer that is not a 200 (a missing file) counts as never arrived.
  page.pendientes = [];
  page.on('requestfinished', (r) => {
    const m = r.url().match(/\/maps\/([\w-]+\.webp)$/);
    if (m) page.pendientes.push(Promise.all([r.sizes(), r.response()]).then(([s, res]) => page.fondos.set(m[1], res?.ok() ? s.responseBodySize : 0)));
  });
  // The image sources on the map at its first rest (idle), before the site asks for the coarser ones: MapLibre runs the
  // `on` listeners of an event before the `once` ones, and the site asks for them in a `once`.
  await context.addInitScript(() => {
    const t = setInterval(() => {
      const m = window.BE?.mapa?.gl;
      if (!m) return;
      clearInterval(t);
      const h = () => { m.off('idle', h); window.__primeraVista = Object.keys(m.getStyle().sources).filter((id) => /^be-(antiguo|actual)-/.test(id)).sort(); };
      m.on('idle', h);
    }, 0);
  });
  await page.route((u) => !u.href.startsWith(base) && !u.hostname.endsWith('unpkg.com'), (r) => r.abort());
  await page.goto(`${base}index.html#${hash}`, { waitUntil: 'domcontentloaded' });
  await still(page);
  return page;
}
async function still(page) {
  await page.waitForFunction(() => { const m = window.__be?.map; return !!m && m.loaded() && !m.isMoving(); }, null, { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.waitForFunction(() => { const m = window.__be.map; return m.loaded() && !m.isMoving(); }, null, { timeout: 60000 });
}
const asked = (page) => [...page.fondos.keys()].filter((f) => f !== 'mundo-mini.webp').sort();
/** Jumps the map there and waits until it has loaded what it asked for. */
async function go(page, lon, lat, zoom) {
  await page.evaluate(([lon, lat, zoom]) => window.__be.map.jumpTo({ center: [lon, lat], zoom }), [lon, lat, zoom]);
  await still(page);
}
/** The image layers on the map, bottom to top, each with its visibility and whether its image has arrived. */
const imageLayers = (page) => page.evaluate(() => {
  const m = window.__be.map, layers = m.getStyle().layers.map((l) => l.id);
  return { order: layers.filter((id) => /^be-(antiguo|actual)-/.test(id) || id === 'be-formas-relleno'),
    loaded: layers.filter((id) => /^be-(antiguo|actual)-/.test(id)).filter((id) => m.getSource(id)?.loaded()),
    visible: layers.filter((id) => /^be-(antiguo|actual)-/.test(id) && m.getLayoutProperty(id, 'visibility') !== 'none') };
});
const ORDER = ['actual', 'antiguo'].flatMap((s) => ['mundo', 'mediterraneo', 'israel', 'jerusalen'].map((b) => `be-${s}-${b}`)).concat('be-formas-relleno');
function assertOrder(order) {
  const pos = order.map((id) => ORDER.indexOf(id));
  assert.deepEqual(pos, [...pos].sort((a, b) => a - b), `image layers out of order: ${order.join(', ')}`);
  assert.equal(order.at(-1), 'be-formas-relleno', 'an image layer sits above the data');
}

/** From now on, notes for each of `ids` the first event after which its source was on the map: `antes` if it already
    was, `move` if it was asked for while the map was still moving, `moveend` if only once it stopped. The site's
    listeners run before these. */
const watch = (page, ids) => page.evaluate((ids) => {
  const m = window.__be.map;
  window.__aparece = {};
  const mira = (ev) => () => { for (const id of ids) if (!(id in window.__aparece) && m.getSource(id)) window.__aparece[id] = ev; };
  mira('antes')();
  m.on('move', mira('move'));
  m.on('moveend', mira('moveend'));
}, ids);
const appeared = (page) => page.evaluate(() => window.__aparece);
// Close to Jerusalén at zoom 6.5, the land of Israel is not drawn yet: it fades in from 6.7.
const BEFORE_ISRAEL = [35.2, 31.8, 6.5];

test('the first view asks only for the image it draws, under the budget, at 1440 by 900 and at 430', async () => {
  for (const screen of [DESKTOP, PHONE]) {
    const page = await open(screen);
    await Promise.all(page.pendientes);
    const first = await page.evaluate(() => window.__primeraVista);
    const fondos = first.map((id) => `${id.slice(3).replace(/^(antiguo|actual)-(.+)$/, '$2-$1')}.webp`);
    const bytes = fondos.reduce((s, f) => s + page.fondos.get(f), 0);
    for (const f of asked(page)) assert.ok(page.fondos.get(f) > 0, `${screen.name}: ${f} was asked for and never arrived`);
    const zoom = await page.evaluate(() => +window.__be.map.getZoom().toFixed(2));
    console.log(`${screen.name}: zoom ${zoom}, first view ${fondos.join(', ') || 'nothing'}, ${bytes} bytes; then ${asked(page).join(', ')}`);
    assert.deepEqual(fondos, [`${FIRST_VIEW[screen.name]}-antiguo.webp`], `${screen.name}: the first view asked for other backgrounds`);
    assert.ok(bytes <= FIRST_VIEW_BUDGET, `${screen.name}: ${bytes} bytes of backgrounds, budget ${FIRST_VIEW_BUDGET}`);
    // Once at rest, the coarser ones: the world under the Mediterranean on the desktop, nothing under the world.
    assert.deepEqual(asked(page), AT_REST[screen.name], `${screen.name}: at rest`);
    const l = await imageLayers(page);
    assert.deepEqual(l.loaded.sort(), AT_REST[screen.name].map((f) => `be-antiguo-${f.replace('-antiguo.webp', '')}`).sort());
    assertOrder(l.order);
    assert.deepEqual(page.pageErrors, []);
    await page.context().close();
  }
});

test('a finer background arrives where it shows: Galilee, Jerusalén; the coarser ones are there before; the layers keep their order', async () => {
  const page = await open(DESKTOP);
  // Galilee at zoom 8: the land of Israel, and not Jerusalén, which is out of view.
  await go(page, 35.5, 32.8, 8);
  assert.deepEqual(asked(page), ['israel-antiguo.webp', 'mediterraneo-antiguo.webp', 'mundo-antiguo.webp']);
  // Babilonia at zoom 7.5, east of the Mediterranean image, draws the world: it was already there, at rest since the
  // first view, so the map never shows bare paper on the way.
  await watch(page, ['be-antiguo-mundo']);
  await go(page, 44.42, 32.54, 7.5);
  assert.equal((await appeared(page))['be-antiguo-mundo'], 'antes', 'the world was not there before Babilonia');
  // Jerusalén at zoom 13.
  await go(page, 35.23, 31.78, 13);
  assert.ok(asked(page).includes('jerusalen-antiguo.webp'), `at Jerusalén: ${asked(page).join(', ')}`);
  const l = await imageLayers(page);
  assert.deepEqual(l.loaded.sort(), ['be-antiguo-israel', 'be-antiguo-jerusalen', 'be-antiguo-mediterraneo', 'be-antiguo-mundo']);
  assertOrder(l.order);
  assert.ok(asked(page).every((f) => f.endsWith('-antiguo.webp')), `the old map asked for images of today: ${asked(page).join(', ')}`);
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('a shared link to Getsemaní first asks only for Jerusalén, and once at rest for the coarser ones under it', async () => {
  const page = await open(PHONE, 'sel=lugar:getsemani&t=33.2500');
  const first = await page.evaluate(() => window.__primeraVista);
  console.log(`430, Getsemaní: zoom ${await page.evaluate(() => +window.__be.map.getZoom().toFixed(2))}, first view ${first.join(', ')}; then ${asked(page).join(', ')}`);
  assert.deepEqual(first, ['be-antiguo-jerusalen'], 'the flight to Getsemaní asked for what it crossed');
  assert.deepEqual(asked(page), ['israel-antiguo.webp', 'jerusalen-antiguo.webp', 'mediterraneo-antiguo.webp', 'mundo-antiguo.webp']);
  await page.context().close();
});

test('a gesture asks for what it shows while it moves; a move asked by the site waits until it stops', async () => {
  // The wheel: MapLibre starts it with no originalEvent, like a move of the site, and it still is a gesture.
  let page = await open(DESKTOP);
  await go(page, ...BEFORE_ISRAEL);
  await watch(page, ['be-antiguo-israel', 'be-antiguo-jerusalen']);
  await page.mouse.move(720, 400);
  await page.mouse.wheel(0, -600);
  await still(page);
  assert.ok((await page.evaluate(() => window.__be.map.getZoom())) > 6.8, 'the wheel did not zoom in');
  assert.equal((await appeared(page))['be-antiguo-israel'], 'move', 'the wheel asked for Israel only once it stopped');
  // A flight of the site (flyTo, with no event): nothing on the way, Jerusalén once it stops.
  await page.evaluate(() => window.__be.map.flyTo({ center: [35.23, 31.78], zoom: 13, duration: 2000 }));
  await still(page);
  assert.equal((await appeared(page))['be-antiguo-jerusalen'], 'moveend', 'the flight asked for Jerusalén on the way');
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
  // The keys (and the double click, the inertia and the buttons): MapLibre eases them with their own event.
  page = await open(DESKTOP);
  await go(page, ...BEFORE_ISRAEL);
  await watch(page, ['be-antiguo-israel']);
  await page.focus('canvas.maplibregl-canvas');
  await page.keyboard.press('Equal');
  await still(page);
  assert.equal((await appeared(page))['be-antiguo-israel'], 'move', 'the + key asked for Israel only once it stopped');
  await page.context().close();
});

test('the map of today asks for its images only when shown, and with «Relieve» off nothing more is asked for', async () => {
  const page = await open(DESKTOP);
  assert.ok(asked(page).every((f) => f.endsWith('-antiguo.webp')));
  await page.evaluate(() => window.__be.ponerMapa('actual'));
  await still(page);
  assert.deepEqual(asked(page).filter((f) => f.endsWith('-actual.webp')), ['mediterraneo-actual.webp', 'mundo-actual.webp']);
  let l = await imageLayers(page);
  assertOrder(l.order);
  assert.deepEqual(l.visible, ['be-actual-mundo', 'be-actual-mediterraneo'], `visible in the map of today: ${l.visible.join(', ')}`);
  // Back to the old map, without the «Relieve» layer: Jerusalén is not asked for, in either style.
  await page.evaluate(() => {
    window.__be.ponerMapa('antiguo');
    const caja = document.querySelector('#capas-menu input[name="capa"][value="relieve"]');
    caja.checked = false;
    caja.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await go(page, 35.23, 31.78, 13);
  assert.ok(!asked(page).some((f) => f.startsWith('jerusalen')), `with «Relieve» off: ${asked(page).join(', ')}`);
  l = await imageLayers(page);
  assert.deepEqual(l.visible, [], `with «Relieve» off these show: ${l.visible.join(', ')}`);
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});
