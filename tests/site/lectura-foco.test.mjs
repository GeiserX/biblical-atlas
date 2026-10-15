// «Solo lectura y mapa» in reading mode (site/js/lectura.js, the .be-lectura-foco rules in site/css/estudio.css), in a
// real headless browser. The switch hides the timeline, the card, «Mientras tanto» and the map legend, and gives their
// room to the map; it never moves the cursor or the selection. The link keeps it as foco=1 while the reading is open,
// a reload keeps it, and closing the reading brings the panels back and drops it from the link. On a phone the switch
// can be reached and pressed at 390 and at 320 wide, and the page never scrolls sideways.
//
// Run from the root of the repository, one browser at a time:
//   node --test --test-concurrency=1 tests/site/lectura-foco.test.mjs
// Needs playwright-core with a Chromium (importable, or PLAYWRIGHT_CORE=<path to playwright-core>). It uses
// site/data.json when it exists, BE_DATA_FILE=<data.json> when given, or builds the data into a temporary directory
// with python3 scripts/build.py. BE_SITE_DIR=<dir> tests another copy of the site. Hosts other than the local server
// are blocked, so MapLibre does not load: what is measured is the map's box, not its drawing.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SITE_DIR = path.resolve(process.env.BE_SITE_DIR || path.join(ROOT, 'site'));
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const phone = (width) => ({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
const PANELS = ['#linea', '#panel', '#mientras', '#leyenda'];

function loadChromium() {
  const req = createRequire(import.meta.url);
  const tries = [process.env.PLAYWRIGHT_CORE, 'playwright-core', 'playwright'].filter(Boolean);
  for (const dir of String(process.env.PATH || '').split(path.delimiter)) {
    if (dir.endsWith(path.join('node_modules', '.bin'))) tries.push(path.join(dir, '..', 'playwright-core'), path.join(dir, '..', 'playwright'));
  }
  for (const t of tries) { try { const m = req(t); if (m.chromium) return m.chromium; } catch { /* next */ } }
  throw new Error('playwright-core not found: set PLAYWRIGHT_CORE=<path to playwright-core>.');
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
function serve(dir, dataFile) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    // The chunks of the data (data.core.json, data.detail.json) live beside data.json.
    const chunk = /^\/data\.[a-z]+\.json$/.test(rel) ? path.join(path.dirname(dataFile), rel) : null;
    const file = rel === '/data.json' ? dataFile : chunk || path.join(dir, rel.endsWith('/') ? `${rel}index.html` : rel);
    if (!file.startsWith(dir) && file !== dataFile && file !== chunk) { res.writeHead(404); res.end(); return; }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

let browser, server, base, tmp;
before(async () => {
  let data = process.env.BE_DATA_FILE ? path.resolve(process.env.BE_DATA_FILE) : path.join(SITE_DIR, 'data.json');
  if (!fs.existsSync(data)) {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-lectura-foco-'));
    execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--out', tmp], { cwd: ROOT, stdio: 'pipe' });
    data = path.join(tmp, 'data.json');
  }
  server = await serve(SITE_DIR, data);
  base = `http://127.0.0.1:${server.address().port}/`;
  const chromium = loadChromium();
  try { browser = await chromium.launch({ headless: true }); }
  catch { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
});
afterEach(async () => { for (const c of browser?.contexts() || []) await c.close().catch(() => {}); });
after(async () => { await browser?.close(); server?.close(); if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); });

/** Two painted frames: every painter has seen the last change. */
const frames = (page) => page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
/** The map page with its data and the reading drawn. */
async function ready(page) {
  await page.waitForFunction(() => window.BE?.D && window.__be && !document.getElementById('vista-lectura').hidden, null, { timeout: 30000 });
  await frames(page);
}
async function openPage(screen, hash) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...screen });
  context.setDefaultTimeout(8000);
  const page = await context.newPage();
  page.pageErrors = [];
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  await page.route((url) => !url.href.startsWith(base), (r) => r.abort());
  await page.goto(`${base}index.html#${hash}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  return page;
}
/** foco in the address as the site wrote it: '1' or null. */
const focoInLink = (page) => page.evaluate(() => new URLSearchParams(location.hash.slice(1)).get('foco'));
const waitFocoInLink = (page, v) => page.waitForFunction((v) => new URLSearchParams(location.hash.slice(1)).get('foco') === v, v);
/** What the switch must change, and what it must leave alone. */
const view = (page) => page.evaluate((panels) => {
  const { BE } = window, box = document.getElementById('mapa').getBoundingClientRect();
  const shown = (s) => { const e = document.querySelector(s); return !!e && !e.hidden && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  return {
    foco: document.documentElement.classList.contains('be-lectura-foco'),
    checked: !!document.querySelector('[data-lectura-foco]')?.checked,
    panels: Object.fromEntries(panels.map((s) => [s, shown(s)])),
    reading: shown('#vista-lectura'), map: shown('#mapa'),
    mapW: Math.round(box.width), mapH: Math.round(box.height),
    t: BE.E.t, sel: BE.E.sel ? BE.selTexto(BE.E.sel) : null,
    sideways: document.documentElement.scrollWidth > innerWidth,
  };
}, PANELS);
const noPanels = () => Object.fromEntries(PANELS.map((s) => [s, false]));

test('a link with foco=1 opens the reading with only the reading and the map', { timeout: 120000 }, async () => {
  const page = await openPage(DESKTOP, 'leer=hch-16&foco=1');
  const v = await view(page);
  assert.equal(v.checked, true, 'the switch is not on');
  assert.equal(v.foco, true);
  assert.deepEqual(v.panels, noPanels(), 'a context panel is still shown');
  assert.equal(v.reading, true, 'the reading is hidden');
  assert.equal(v.map, true, 'the map is hidden');
  assert.equal(await focoInLink(page), '1');
  assert.deepEqual(page.pageErrors, []);
});

test('the switch hides and brings back the panels, gives their room to the map, and moves neither the cursor nor the selection', { timeout: 120000 }, async () => {
  const page = await openPage(DESKTOP, 'leer=hch-16');
  const before = await view(page);
  assert.equal(before.checked, false);
  assert.equal(before.panels['#linea'], true, 'without the switch the timeline is shown');
  assert.equal(before.panels['#panel'], true, 'without the switch the card is shown');
  assert.equal(before.panels['#leyenda'], true, 'without the switch the legend is shown');
  assert.equal(await focoInLink(page), null);

  await page.locator('[data-lectura-foco]').check();
  await waitFocoInLink(page, '1');
  await frames(page);
  const on = await view(page);
  assert.deepEqual(on.panels, noPanels(), 'a context panel is still shown');
  assert.ok(on.mapW > before.mapW, `the map did not widen: ${before.mapW} -> ${on.mapW} px`);
  assert.ok(on.mapH > before.mapH, `the map did not grow taller: ${before.mapH} -> ${on.mapH} px`);
  assert.equal(on.t, before.t, 'the switch moved the cursor');
  assert.equal(on.sel, before.sel, 'the switch changed the selection');
  assert.equal(await page.locator('#vista-lectura .lectura-controles [data-lectura-foco]').count(), 0, 'the switch went back into the row of «Leído» and the pencil');

  await page.locator('[data-lectura-foco]').uncheck();
  await waitFocoInLink(page, null);
  await frames(page);
  const off = await view(page);
  assert.deepEqual(off.panels, before.panels, 'unchecking did not bring the panels back');
  assert.equal(off.mapW, before.mapW);
  assert.equal(off.mapH, before.mapH);
  assert.equal(off.t, before.t);
  assert.equal(off.sel, before.sel);
  assert.deepEqual(page.pageErrors, []);
});

test('a reload keeps the choice; closing the reading brings the panels back and drops foco from the link', { timeout: 120000 }, async () => {
  const page = await openPage(DESKTOP, 'leer=hch-16');
  await page.locator('[data-lectura-foco]').check();
  await waitFocoInLink(page, '1');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page);
  const v = await view(page);
  assert.equal(v.checked, true, 'the reload lost the switch');
  assert.equal(v.panels['#linea'], false, 'the reload brought the timeline back');

  await page.locator('[data-lectura-cerrar]').click();
  await waitFocoInLink(page, null);
  await frames(page);
  const closed = await view(page);
  assert.equal(closed.foco, false, 'the page is still in focus mode');
  assert.equal(closed.reading, false);
  assert.equal(closed.panels['#linea'], true, 'closing the reading did not bring the timeline back');
  assert.equal(closed.panels['#leyenda'], true, 'closing the reading did not bring the legend back');
  assert.deepEqual(page.pageErrors, []);
});

for (const width of [390, 320]) {
  test(`on a phone ${width} wide the switch can be reached and pressed, and nothing scrolls sideways`, { timeout: 120000 }, async () => {
    const page = await openPage(phone(width), 'leer=hch-16');
    assert.equal((await view(page)).sideways, false, 'the reading scrolls sideways');
    const sw = page.locator('[data-lectura-foco]');
    await sw.scrollIntoViewIfNeeded();
    const box = await sw.boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= 844, `the switch is off the screen: ${JSON.stringify(box)}`);
    await sw.check();
    await waitFocoInLink(page, '1');
    await frames(page);
    const v = await view(page);
    assert.equal(v.panels['#linea'], false, 'the timeline is still shown');
    assert.equal(v.reading, true);
    assert.equal(v.map, true);
    assert.equal(v.sideways, false, 'focus mode scrolls sideways');
    assert.deepEqual(page.pageErrors, []);
  });
}
