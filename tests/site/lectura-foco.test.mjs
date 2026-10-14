// «Ocultar la línea y la ficha» in reading mode (site/js/lectura.js, PR 141), in a real headless browser: the option
// hides the timeline, the ficha, «Mientras tanto» and the legend and gives their room to the map; the address keeps it
// as foco=1 and a reload or a shared link opens the same way; the box keeps the keyboard focus when pressed; a place or a
// person of the passage brings the panels back to show its ficha; closing the reading turns the option off, so the
// panels stay when it opens again; foco=1 without leer does nothing; on the phone the reading sheet goes down to the
// bottom of the screen and nothing overflows.
//
// Run from the root of the repository, one browser at a time:
//   node --test --test-concurrency=1 tests/site/lectura-foco.test.mjs
// Needs playwright-core with a Chromium (importable, or PLAYWRIGHT_CORE=<path to playwright-core>). It uses
// site/data.json when it exists, BE_DATA_FILE=<data.json> when given, or builds the data into a temporary directory
// with python3 scripts/build.py. BE_SITE_DIR=<dir> tests another copy of the site (a checkout of main is the control,
// and fails: it has no option). Hosts other than the local server are blocked, so MapLibre does not load: the test
// measures the map's frame, not its canvas.
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
const PHONE = { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true };
const CONTEXT = ['#linea', '#panel', '#leyenda'];   // «Mientras tanto» (#mientras) is hidden by its own attribute when empty

function loadChromium() {
  const req = createRequire(import.meta.url);
  const tries = [process.env.PLAYWRIGHT_CORE, 'playwright-core', 'playwright'].filter(Boolean);
  if (process.env.PLAYWRIGHT_MODULE_DIR) tries.push(path.join(path.resolve(process.env.PLAYWRIGHT_MODULE_DIR), 'playwright-core'));
  for (const t of tries) { try { const m = req(t); if (m.chromium) return m.chromium; } catch { /* next */ } }
  throw new Error('playwright-core not found: install it or set PLAYWRIGHT_CORE to its directory');
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
function serve(dir, dataFile) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
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
    execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--salida', tmp], { cwd: ROOT, stdio: 'pipe' });
    data = path.join(tmp, 'data.json');
  }
  server = await serve(SITE_DIR, data);
  base = `http://127.0.0.1:${server.address().port}/`;
  browser = await loadChromium().launch({ headless: true });
});
afterEach(async () => { for (const c of browser?.contexts() || []) await c.close().catch(() => {}); });
after(async () => { await browser?.close(); server?.close(); if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); });

async function openPage(screen, hash) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...screen });
  context.setDefaultTimeout(8000);
  const page = await context.newPage();
  page.pageErrors = [];
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  await page.route((url) => !url.href.startsWith(base), (r) => r.abort());
  await page.goto(`${base}index.html#${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.BE?.D && window.__be, null, { timeout: 30000 });
  await settle(page);
  return page;
}
/** Two painted frames and base.js's address written: every change of the press is on screen and in the address. */
async function settle(page) {
  await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
  await page.waitForFunction(() => location.hash === `#${window.BE.textoHash()}`, null, { timeout: 3000 }).catch(() => {});
}
const state = (page) => page.evaluate((ids) => {
  const box = (s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r && { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom }; };
  const p = new URLSearchParams(location.hash.slice(1));
  return { foco: p.get('foco'), leer: p.get('leer'), shown: ids.filter((s) => document.querySelector(s)?.checkVisibility()),
    reading: !document.querySelector('#vista-lectura').hidden, box: document.querySelector('[data-lectura-foco]')?.checked ?? null,
    map: box('#mapa'), sheet: box('#vista-lectura'), inner: [innerWidth, innerHeight], overflow: document.documentElement.scrollWidth > innerWidth };
}, CONTEXT);

test('a link with foco=1 opens the reading with only the map beside it, and the box keeps the keyboard focus', async () => {
  const page = await openPage(DESKTOP, 'leer=hch-16&foco=1');
  let s = await state(page);
  assert.equal(s.box, true, 'the box is checked');
  assert.deepEqual(s.shown, [], 'timeline, ficha and legend are hidden');
  assert.equal(s.foco, '1');
  assert.equal(s.map.w, 1440, 'the map takes the ficha\'s width');
  assert.equal(s.map.y + s.map.h, 900, 'and the timeline\'s height');

  await page.locator('[data-lectura-foco]').focus();
  await page.keyboard.press('Space');
  await settle(page);
  s = await state(page);
  assert.equal(s.box, false);
  assert.deepEqual(s.shown, CONTEXT, 'the panels come back');
  assert.equal(s.foco, null, 'and the address forgets the option');
  assert.ok(s.map.w < 1440);
  assert.ok(await page.evaluate(() => document.activeElement?.matches('[data-lectura-foco]')), 'the box keeps the focus');

  await page.keyboard.press('Space');
  await settle(page);
  s = await state(page);
  assert.deepEqual([s.box, s.shown, s.foco], [true, [], '1']);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.BE?.D && window.__be, null, { timeout: 30000 });
  await settle(page);
  s = await state(page);
  assert.deepEqual([s.reading, s.box, s.shown, s.foco], [true, true, [], '1'], 'a reload opens the same way');
  assert.deepEqual(page.pageErrors, []);
});

test('a place of the passage brings the panels back to show its ficha', async () => {
  const page = await openPage(DESKTOP, 'leer=hch-16&foco=1');
  await page.locator('[data-lectura-pasaje="0"]').click();
  await settle(page);
  const chip = page.locator('#vista-lectura .pasaje-detalle [data-sel^="lugar:"]').first();
  const sel = await chip.getAttribute('data-sel');
  await chip.click();
  await settle(page);
  const s = await state(page);
  assert.equal(await page.evaluate(() => window.BE.selTexto(window.BE.E.sel)), sel);
  assert.ok(s.shown.includes('#panel'), 'the ficha is on screen');
  assert.equal(s.box, false);
  assert.equal(s.foco, null);
  assert.deepEqual(page.pageErrors, []);
});

test('closing the reading brings the panels back and turns the option off; foco=1 without leer does nothing', async () => {
  const page = await openPage(DESKTOP, 'leer=hch-16&foco=1');
  await page.locator('[data-lectura-cerrar]').click();
  await settle(page);
  let s = await state(page);
  assert.deepEqual([s.reading, s.shown, s.foco], [false, CONTEXT, null]);
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('be-lectura-foco')), false);
  await page.evaluate(() => window.BE.lectura.abrir('hch-17'));
  await settle(page);
  s = await state(page);
  assert.deepEqual([s.reading, s.box, s.shown, s.foco], [true, false, CONTEXT, null], 'opened again, the panels stay');

  const other = await openPage(DESKTOP, 't=50.3000&foco=1');
  s = await state(other);
  assert.deepEqual([s.reading, s.shown, s.foco], [false, CONTEXT, null]);
  await other.evaluate(() => window.BE.lectura.abrir('hch-16'));
  await settle(other);
  s = await state(other);
  assert.deepEqual([s.box, s.shown, s.foco], [false, CONTEXT, null], 'the link\'s foco=1 did not wait for the reading');
  assert.deepEqual([...page.pageErrors, ...other.pageErrors], []);
});

test('on the phone the reading sheet goes down to the bottom, the box is a 44 px target and nothing overflows', async () => {
  const page = await openPage(PHONE, 'leer=hch-16&foco=1');
  let s = await state(page);
  assert.deepEqual(s.shown, []);
  assert.equal(Math.round(s.sheet.bottom), 932, 'no gap where the timeline was');
  assert.equal(s.overflow, false);
  const label = await page.locator('label:has([data-lectura-foco])').boundingBox();
  assert.ok(label.height >= 44 && label.width >= 44, `the box's label is ${label.width} × ${label.height}`);
  await page.locator('[data-lectura-foco]').tap();
  await settle(page);
  s = await state(page);
  assert.ok(s.shown.includes('#linea'));
  const linea = await page.locator('#linea').boundingBox();
  assert.ok(s.sheet.bottom <= linea.y + 1, 'the sheet goes back above the timeline');
  assert.equal(s.overflow, false);
  assert.deepEqual(page.pageErrors, []);
});
