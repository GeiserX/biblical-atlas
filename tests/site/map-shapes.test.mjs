// Zone shapes on the map, in a real headless browser. A place with a point and a `shape` (Canaán, Galilea) draws its
// outline only while it is selected or highlighted, on a layer that takes no click, and the map frames the whole shape;
// a place without one draws nothing there. A candidate zone with a shape (the desert of Judah) draws its ellipse
// instead of its circle. The place card says what the shape is and where it comes from, and the outline takes its
// colour from --tier1, so the meeting theme repaints it.
//
// Run from the repository root, one browser at a time:
//   node --test --test-concurrency=1 tests/site/map-shapes.test.mjs
// Needs python3 with requirements.txt (the data is built into a temporary directory), network access for MapLibre
// (unpkg.com) and playwright-core with a Chromium: either importable, or PLAYWRIGHT_MODULE_DIR=<a node_modules directory
// that holds it>. CHROME_PATH picks another Chromium binary. BE_ROOT=<a checkout> tests that checkout's site instead of
// this one (the control: on a checkout without shapes, every test fails).
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
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-map-shapes-'));
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

/** Selects, waits two frames and reads what the shape sources draw, the legend, the card and the map's bounds. */
function shapesAt(page, sel) {
  return page.evaluate(async (sel) => {
    const { map, seleccionar } = window.__be;
    seleccionar(sel, { mover: false });
    await new Promise((r) => setTimeout(r, 900));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const formas = map.getSource('be-formas') ? (await map.getSource('be-formas').getData()).features : null;
    const zonas = (await map.getSource('be-zonas').getData()).features;
    const b = map.getBounds();
    return {
      formas: formas && formas.map((f) => ({ lugar: f.properties.lugar, color: f.properties.color, n: f.geometry.coordinates[0].length })),
      zonas: zonas.map((f) => ({ lugar: f.properties.lugar, ring: f.geometry.coordinates[0] })),
      leyenda: document.querySelector('#leyenda')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
      ficha: document.querySelector('#panel-cuerpo')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
      caja: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
    };
  }, sel);
}
const dentro = ([o, s, e, n], [lat, lon]) => lon >= o && lon <= e && lat >= s && lat <= n;

test('a place with a shape draws it while selected, frames all of it and its card says what it is', async () => {
  for (const screen of [DESKTOP, PHONE]) {
    const page = await openMap(screen, 't=-1900');
    const d = await shapesAt(page, { tipo: 'lugar', id: 'canaan' });
    assert.deepEqual(d.formas?.map((f) => `${f.lugar}:${f.n}`), ['canaan:8'], `${screen.width}px: Canaán draws its 7-vertex outline`);
    // Sidón (north) and Gaza (south-west) are both in view: the frame is the shape, not the point in Galilea.
    assert.ok(dentro(d.caja, [33.561, 35.372]) && dentro(d.caja, [31.504, 34.464]), `${screen.width}px: Sidón and Gaza in view, bounds ${d.caja}`);
    assert.match(d.ficha, /Qué abarca/);
    assert.match(d.ficha, /contorno de 7 vértices, por Sidón, Dan, .*Gaza y Jope/);
    assert.match(d.ficha, /no es una frontera trazada/);
    assert.match(d.leyenda, /Lo que abarca una región/);
    const g = await shapesAt(page, { tipo: 'lugar', id: 'galilea' });
    assert.deepEqual(g.formas?.map((f) => `${f.lugar}:${f.n}`), ['galilea:5']);
    assert.match(g.ficha, /rectángulo de unos 40 km de este a oeste y 60 de norte a sur/);
    const j = await shapesAt(page, { tipo: 'lugar', id: 'jerusalen' });
    assert.deepEqual(j.formas, [], 'a city without a shape draws none');
    assert.doesNotMatch(j.leyenda, /Lo que abarca una región/);
    assert.deepEqual(page.pageErrors, []);
    await page.context().close();
  }
});

test('the shape takes no click: a click inside Canaán, highlighted by an event, leaves the event selected', async () => {
  const page = await openMap(DESKTOP, 't=-1465.5');
  const sel = { tipo: 'evento', id: 'conquista-de-canaan' };
  const d = await shapesAt(page, sel);
  assert.ok(d.formas?.some((f) => f.lugar === 'canaan'), `the event highlights Canaán and draws its shape: ${JSON.stringify(d.formas)}`);
  const capas = await page.evaluate(() => window.__be.map.getStyle().layers.map((l) => l.id));
  assert.ok(capas.indexOf('be-formas-relleno') < capas.indexOf('be-zonas-relleno'), 'the shape sits under the candidate zones');
  // A pixel inside the outline with the bare map under it (no place name, no candidate zone).
  const xy = await page.evaluate(() => {
    const { map } = window.__be;
    for (let lat = 31.3; lat < 33.3; lat += 0.05) for (let lon = 34.8; lon < 35.5; lon += 0.05) {
      const p = map.project([lon, lat]);
      const el = document.elementFromPoint(p.x, p.y);
      if (el?.tagName === 'CANVAS' && !map.queryRenderedFeatures([p.x, p.y], { layers: ['be-zonas-relleno', 'be-rastro-toque', 'be-cartas-toque', 'be-hecho', 'be-falta'].filter((id) => map.getLayer(id)) }).length
        && map.queryRenderedFeatures([p.x, p.y], { layers: ['be-formas-relleno'] }).length) return [p.x, p.y];
    }
    return null;
  });
  assert.ok(xy, 'found a bare pixel inside the shape');
  await page.mouse.click(xy[0], xy[1]);
  await page.waitForTimeout(400);
  const ahora = await page.evaluate(() => window.__be.E.sel);
  assert.deepEqual({ tipo: ahora?.tipo, id: ahora?.id }, sel, 'the click went through the shape: the event is still selected');
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('a candidate zone with a shape draws its ellipse instead of its circle', async () => {
  const page = await openMap(DESKTOP, 't=29.5');
  const d = await shapesAt(page, { tipo: 'lugar', id: 'desierto-de-juda' });
  const z = d.zonas.find((x) => x.lugar === 'desierto-de-juda');
  assert.ok(z, 'the desert draws a zone');
  const lats = z.ring.map((p) => p[1]), lons = z.ring.map((p) => p[0]);
  const alto = (Math.max(...lats) - Math.min(...lats)) * 111.2, ancho = (Math.max(...lons) - Math.min(...lons)) * 111.2 * Math.cos(31.4 * Math.PI / 180);
  // 80 km along the Dead Sea and 20 across, not a 40 km circle (80 by 80).
  assert.ok(alto > 75 && alto < 85 && ancho < 30, `ellipse of ${alto.toFixed(1)} by ${ancho.toFixed(1)} km`);
  assert.match(d.ficha, /zona dibujada como una elipse de unos 80 × 20 km/);
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('the meeting theme repaints the outline with its own --tier1', async () => {
  const page = await openMap(DESKTOP, 't=-1900');
  const claro = await shapesAt(page, { tipo: 'lugar', id: 'canaan' });
  await page.evaluate(() => window.__be.BE.ponerPreferencia('reunion', true));
  const oscuro = await shapesAt(page, { tipo: 'lugar', id: 'canaan' });
  const tier1 = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tier1').trim());
  assert.notEqual(claro.formas[0].color, oscuro.formas[0].color);
  assert.equal(oscuro.formas[0].color, tier1);
  await page.evaluate(() => window.__be.BE.ponerPreferencia('reunion', false));
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});
