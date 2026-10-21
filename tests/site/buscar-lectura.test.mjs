// A book or a chapter chosen in the search opens the reading mode (BE.lectura.leerSel in site/js/lectura.js, called by
// elegirResultado in site/js/buscar.js), in a real headless browser. The book opens at chapter 1, or at the chapter of
// the last reading «Seguir donde lo dejaste» remembers when it was in that book, and the book stays chosen, with its
// card and its date; a chapter opens at itself. The reading sits beside the map, the focus goes to its title, «Cerrar»
// leaves the card of what was chosen, and the browser's Back returns to the view before the search and Forward brings
// the reading back. With the graph open, a book stays a card, as the graph follows what is chosen. On a phone the
// reading is on the screen and nothing scrolls sideways.
//
// Run from the root of the repository, one browser at a time:
//   node --test --test-concurrency=1 tests/site/buscar-lectura.test.mjs
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
// A view with a date and nothing chosen: the map, without the landing page.
const START = 't=30.0000';

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
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-buscar-lectura-'));
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
async function openPage(screen, { hash = START, ultima = null } = {}) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...screen });
  context.setDefaultTimeout(8000);
  // «Seguir donde lo dejaste»: the last view, as portada.js reads it.
  if (ultima) await context.addInitScript((u) => { try { localStorage.setItem('biblical-atlas:ultima', JSON.stringify(u)); } catch { /* none */ } }, ultima);
  const page = await context.newPage();
  page.pageErrors = [];
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  await page.route((url) => !url.href.startsWith(base), (r) => r.abort());
  await page.goto(`${base}index.html#${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.BE?.D && window.__be && window.BE.LIBROS?.some((l) => l.slug === 'marcos'), null, { timeout: 30000 });
  await frames(page);
  return page;
}
/** Types in the search box and chooses the first result whose row says `kind` («libro», «capítulo», «grafo»…). */
async function choose(page, text, kind) {
  await page.locator('#q').fill(text);
  const row = page.locator('#resultados [data-i]', { hasText: kind }).first();
  await row.waitFor();
  await row.dispatchEvent('pointerdown');
  await frames(page);
}
const param = (page, k) => page.evaluate((k) => new URLSearchParams(location.hash.slice(1)).get(k), k);
const waitParam = (page, k, v) => page.waitForFunction(([k, v]) => new URLSearchParams(location.hash.slice(1)).get(k) === v, [k, v]);
const view = (page) => page.evaluate(() => {
  const { BE } = window, r = document.getElementById('vista-lectura'), box = r.getBoundingClientRect(), map = document.getElementById('mapa').getBoundingClientRect();
  return {
    reading: !r.hidden && r.getClientRects().length > 0, title: r.querySelector('.lectura-titulo')?.textContent || null,
    focusInTitle: document.activeElement?.matches?.('#vista-lectura .lectura-titulo') || false,
    box: { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) },
    map: { x: Math.round(map.x), w: Math.round(map.width) }, sel: BE.E.sel ? BE.selTexto(BE.E.sel) : null,
    sideways: document.documentElement.scrollWidth > innerWidth,
  };
});

test('choosing a book in the search opens the reading at its chapter 1, beside the map, with the focus in it and the book chosen', { timeout: 120000 }, async () => {
  const page = await openPage(DESKTOP);
  await choose(page, 'Marcos', 'libro');
  await waitParam(page, 'leer', 'mr-1');
  const v = await view(page);
  assert.equal(v.reading, true, 'the reading did not open');
  assert.equal(v.title, 'Marcos 1');
  assert.equal(v.sel, 'libro:marcos', 'the book is not chosen');
  // The reading lies over the left of the map, which keeps most of its width to the right.
  assert.ok(v.box.x <= v.map.x + 1 && v.box.w < v.map.w / 2, `the reading is not at the left of the map: ${JSON.stringify(v)}`);
  assert.equal(v.focusInTitle, true, 'the focus did not go to the reading');
  assert.deepEqual(page.pageErrors, []);
});

test('choosing a chapter in the search opens the reading at that chapter', { timeout: 120000 }, async () => {
  const page = await openPage(DESKTOP);
  await choose(page, 'Marcos 4', 'capítulo');
  await waitParam(page, 'leer', 'mr-4');
  const v = await view(page);
  assert.equal(v.reading, true);
  assert.equal(v.title, 'Marcos 4');
  assert.deepEqual(page.pageErrors, []);
});

test('a book opens at the chapter of the last reading when it was in that book, and at 1 when it was in another', { timeout: 120000 }, async () => {
  const page = await openPage(DESKTOP, { ultima: { hash: '#t=29.5000&leer=mr-5&pas=2', texto: 'Lectura de Marcos 5' } });
  await choose(page, 'Marcos', 'libro');
  await waitParam(page, 'leer', 'mr-5');
  assert.equal((await view(page)).title, 'Marcos 5');
  await choose(page, 'Hechos', 'libro');
  await waitParam(page, 'leer', 'hch-1');
  assert.equal((await view(page)).title, 'Hechos 1');
  assert.deepEqual(page.pageErrors, []);
});

test('«Cerrar» leaves the book card; Back returns to the view before the search and Forward brings the reading back', { timeout: 120000 }, async () => {
  const page = await openPage(DESKTOP);
  await choose(page, 'Marcos', 'libro');
  await waitParam(page, 'leer', 'mr-1');
  await page.locator('[data-lectura-cerrar]').click();
  await waitParam(page, 'leer', null);
  let v = await view(page);
  assert.equal(v.reading, false, '«Cerrar» did not close the reading');
  assert.equal(v.sel, 'libro:marcos', 'closing the reading dropped the book');

  // Back: first the reading again, then the map as it was before the search.
  await page.goBack();
  await waitParam(page, 'leer', 'mr-1');
  assert.equal((await view(page)).reading, true, 'Back did not bring the reading back');
  await page.goBack();
  await waitParam(page, 'leer', null);
  await frames(page);
  v = await view(page);
  assert.equal(v.reading, false, 'Back left the reading open');
  assert.equal(v.sel, null, 'Back left something chosen');
  await page.goForward();
  await waitParam(page, 'leer', 'mr-1');
  await frames(page);
  v = await view(page);
  assert.equal(v.reading, true, 'Forward did not bring the reading back');
  assert.equal(v.title, 'Marcos 1');
  assert.deepEqual(page.pageErrors, []);
});

test('with the graph open, a book chosen in the search is a card the graph follows, not the reading', { timeout: 120000 }, async () => {
  const page = await openPage(DESKTOP, { hash: `${START}&sel=persona:pablo&grafo=pablo` });
  await page.waitForFunction(() => window.BE.estudio?.vistas?.grafo?.abierta());
  await choose(page, 'Marcos', 'libro');
  await frames(page);
  const v = await view(page);
  assert.equal(v.reading, false, 'the reading closed the graph');
  assert.equal(v.sel, 'libro:marcos');
  assert.equal(await param(page, 'leer'), null);
  assert.deepEqual(page.pageErrors, []);
});

for (const width of [390, 320]) {
  test(`on a phone ${width} wide a book chosen in the search opens the reading on the screen, and it closes`, { timeout: 120000 }, async () => {
    const page = await openPage(phone(width));
    await choose(page, 'Marcos', 'libro');
    await waitParam(page, 'leer', 'mr-1');
    const v = await view(page);
    assert.equal(v.reading, true);
    assert.equal(v.title, 'Marcos 1');
    assert.ok(v.box.x >= 0 && v.box.x + v.box.w <= width && v.box.y >= 0 && v.box.y < 844, `the reading is off the screen: ${JSON.stringify(v.box)}`);
    assert.equal(v.sideways, false, 'the page scrolls sideways');
    await page.locator('[data-lectura-cerrar]').click();
    await waitParam(page, 'leer', null);
    assert.equal((await view(page)).reading, false);
    assert.deepEqual(page.pageErrors, []);
  });
}
