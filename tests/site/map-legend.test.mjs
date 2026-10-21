// The map's legend folds. With a journey and its letters it ran to fifteen rows and covered half the map, so it opens
// folded to one row, its title and an arrow, unless it is short (three rows or fewer). The title is a button
// (aria-expanded) that unfolds it; an arrow at the bottom folds it again and gives the focus back to the title. The
// choice lasts for the tab (sessionStorage). On the phone the «Leyenda» button of the sheet opens it, unfolded, and both
// arrows close it. Every row stays in the page while folded: whoever reads the legend's text reads all of it. On a touch
// screen the title and the arrow are 44 px tall.
//
// Run from the repository root, one browser at a time:
//   node --test --test-concurrency=1 tests/site/map-legend.test.mjs
// Needs network access for MapLibre (unpkg.com) and playwright-core with a Chromium: either importable, or
// PLAYWRIGHT_MODULE_DIR=<a node_modules directory that holds it>. CHROME_PATH picks another Chromium binary. It uses
// site/data.json when it exists, BE_DATA_FILE=<data.json> when given, or builds the data into a temporary directory.
// BE_ROOT=<a checkout> tests that checkout's site (the control: before the legend folded, every test fails).
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
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

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
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-map-legend-'));
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

async function open(context, hash) {
  const page = await context.newPage();
  page.pageErrors = [];
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  await page.route((u) => !u.href.startsWith(base) && !u.hostname.endsWith('unpkg.com'), (r) => r.abort());
  await page.goto(`${base}index.html#${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__be?.map?.loaded?.() && document.querySelector('#leyenda .leyenda-cabecera'), null, { timeout: 60000 });
  await page.waitForTimeout(300);
  return page;
}
const state = (page) => page.evaluate(() => {
  const ley = document.querySelector('#leyenda'), cab = ley.querySelector('.leyenda-cabecera'), filas = ley.querySelector('.leyenda-filas');
  const r = ley.getBoundingClientRect(), c = cab.getBoundingClientRect(), p = ley.querySelector('.leyenda-plegar').getBoundingClientRect();
  return { expanded: cab.getAttribute('aria-expanded'), controls: cab.getAttribute('aria-controls') === filas.id, rows: ley.querySelectorAll('.be-legend__row').length,
    shown: filas.checkVisibility(), height: Math.round(r.height), visible: ley.checkVisibility(), title: c.height, arrow: [p.width, p.height],
    text: ley.textContent.replace(/\s+/g, ' ').trim(), focus: document.activeElement === cab };
});

test('1440: a long legend opens folded; the title unfolds it, the arrow folds it, and the tab remembers', async () => {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...DESKTOP });
  // The second journey at c. 50, with its letters and the other journeys of the time: many rows.
  const page = await open(context, 't=50.3000');
  const a = await state(page);
  console.log(`folded: ${a.rows} rows, ${a.height} px tall, «${a.text.slice(0, 60)}…»`);
  assert.ok(a.rows > 3, `only ${a.rows} rows`);
  assert.deepEqual([a.expanded, a.shown, a.controls], ['false', false, true]);
  assert.ok(a.height <= 48, `folded, the legend is ${a.height} px tall`);
  assert.match(a.text, /Recorrido hasta esta fecha/, 'the rows stay in the page');
  // With the keyboard: the title is a button.
  await page.focus('#leyenda .leyenda-cabecera');
  await page.keyboard.press('Enter');
  const b = await state(page);
  assert.deepEqual([b.expanded, b.shown], ['true', true]);
  assert.ok(b.height > a.height + 100, `unfolded, ${b.height} px`);
  await page.click('#leyenda .leyenda-plegar');
  const c = await state(page);
  assert.deepEqual([c.expanded, c.shown, c.focus], ['false', false, true]);
  // Unfolded once more, a reload in the same tab opens it unfolded.
  await page.click('#leyenda .leyenda-cabecera');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__be?.map?.loaded?.() && document.querySelector('#leyenda .leyenda-cabecera'), null, { timeout: 60000 });
  await page.waitForTimeout(300);
  const d = await state(page);
  assert.deepEqual([d.expanded, d.shown], ['true', true]);
  assert.deepEqual(page.pageErrors, []);
  await context.close();
});

test('1440: a short legend opens unfolded', async () => {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...DESKTOP });
  // 3000 a.e.c., before the Flood: no journey near, one row or two.
  const page = await open(context, 't=-3000.0000');
  const a = await state(page);
  console.log(`short: ${a.rows} rows, «${a.text}»`);
  assert.ok(a.rows <= 3, `${a.rows} rows`);
  assert.deepEqual([a.expanded, a.shown], ['true', true]);
  assert.deepEqual(page.pageErrors, []);
  await context.close();
});

test('phone: «Leyenda» opens it unfolded, both arrows close it, each 44 px tall', async () => {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...PHONE });
  const page = await open(context, 't=50.3000');
  assert.equal((await state(page)).visible, false, 'closed until «Leyenda» is pressed');
  for (const arrow of ['.leyenda-plegar', '.leyenda-cabecera']) {
    await page.tap('#leyenda-boton');
    const a = await state(page);
    assert.deepEqual([a.visible, a.expanded, a.shown], [true, 'true', true]);
    assert.ok(a.title >= 44 && a.arrow[0] >= 44 && a.arrow[1] >= 44, `targets: title ${a.title} px, arrow ${a.arrow.join(' × ')} px`);
    await page.tap(`#leyenda ${arrow}`);
    const b = await state(page);
    assert.equal(b.visible, false, `${arrow} closes it`);
    assert.equal(await page.getAttribute('#leyenda-boton', 'aria-expanded'), 'false');
  }
  assert.deepEqual(page.pageErrors, []);
  await context.close();
});
