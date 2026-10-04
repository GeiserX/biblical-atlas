// The map's place names on the phone (docs/ideas/rotulos-movil.md), in a real headless browser with MapLibre loaded:
//
// - A name that would leave the map on the right, or fall under a card or a control, goes on the inner side of its
//   point when it fits there. The rules that already held still hold: no two names drawn touch, a name never covers
//   the point of another place, nothing drawn leaves the map or sits under a card, the selected place keeps its name,
//   in the light theme and in meeting mode.
// - On the phone the tour's card is one line (title, «n de m» and two arrows) that opens on a tap and closes with Escape;
//   the arrows move between stops. At 1440 the card is the one it was.
// - The phone frames the tour «Las cartas de Pablo y las ciudades» with its eleven stops clear of the card, the map's
//   controls and the sheet.
//
// Run from the repository root, one browser at a time:
//   node --test --test-concurrency=1 tests/site/map-labels.test.mjs
// Needs network access for MapLibre (unpkg.com) and playwright-core with a Chromium: either importable, or
// PLAYWRIGHT_MODULE_DIR=<a node_modules directory that holds it>. CHROME_PATH picks another Chromium binary. It uses
// site/data.json when it exists, BE_DATA_FILE=<data.json> when given, or builds the data into a temporary directory.
// BE_ROOT=<a checkout> tests that checkout's site (the control: on main the three tests fail).
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
    const file = rel === 'data.json' ? dataFile : path.join(siteDir, rel);
    if (file !== dataFile && !file.startsWith(siteDir)) { res.writeHead(403).end(); return; }
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
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-map-labels-'));
    execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--out', tmp], { cwd: ROOT, stdio: 'pipe' });
    data = path.join(tmp, 'data.json');
  }
  server = await serve(site, data);
  base = `http://127.0.0.1:${server.address().port}/`;
  browser = await (await loadChromium()).launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
});
after(async () => {
  await browser?.close();
  server?.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

async function open(screen, { reunion = false } = {}) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...screen });
  context.setDefaultTimeout(30000);
  if (reunion) await context.addInitScript(() => { try { localStorage.setItem('biblical-atlas:pref:reunion', '1'); } catch { /* none */ } });
  const page = await context.newPage();
  page.pageErrors = [];
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  await page.route((u) => !u.href.startsWith(base) && !u.hostname.endsWith('unpkg.com'), (r) => r.abort());
  // With an address the landing does not open (portada.js): the map is in view, as after a search.
  await page.goto(`${base}index.html#t=50.3000`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.BE?.D && window.__be, null, { timeout: 60000 });
  await still(page);
  return page;
}
async function still(page) {
  await page.waitForFunction(() => { const m = window.__be?.map; return !!m && m.loaded() && !m.isMoving(); }, null, { timeout: 60000 });
  await page.waitForTimeout(900);
  await page.waitForFunction(() => !window.__be.map.isMoving(), null, { timeout: 60000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}
const choose = (page, sel) => page.evaluate((s) => window.__be.seleccionar(window.BE.parseSel(s)), sel);

/** Every place name drawn now, and what breaks the rules: two names that touch, a name over the point of another place,
    a name off the map or under a card or a control. */
const audit = (page) => page.evaluate(() => {
  const m = window.__be.map, mc = m.getContainer(), c = mc.getBoundingClientRect();
  const vivo = (el) => el && !el.hidden && el.offsetParent;
  const cards = ['#leyenda', '#mientras', '#vista-recorrido > *', '#vista-ahora', '#situacion', '#mapa .maplibregl-ctrl-top-right', '.modos', '#tira-suceso', '#leyenda-boton']
    .flatMap((q) => [...document.querySelectorAll(q)]).filter(vivo).map((el) => ({ name: el.id || el.className.split(' ')[0], r: el.getBoundingClientRect() })).filter(({ r }) => r.width > 0);
  const touch = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
  const markers = [...mc.querySelectorAll('.marca-lugar')].filter((el) => el.checkVisibility());
  const names = markers.filter((el) => !el.classList.contains('sin-etiqueta')).map((el) => ({ el, id: el.dataset.sel.slice(6), r: el.querySelector('.etiqueta').getBoundingClientRect() }));
  const dots = markers.map((el) => ({ el, id: el.dataset.sel.slice(6), r: el.querySelector('.punto').getBoundingClientRect() }));
  // The points of candidates and finds are drawn always, even half under a card: a name on the inner side keeps off them.
  for (const el of mc.querySelectorAll('.cand, .marca-hallazgo')) {
    const d = el.classList.contains('cand') ? el.querySelector('.cand-punto') : el;
    if (d && el.checkVisibility({ visibilityProperty: true })) dots.push({ el, id: el.getAttribute('aria-label'), r: d.getBoundingClientRect() });
  }
  const sel = window.BE.E.sel?.tipo === 'lugar' ? window.BE.E.sel.id : null;
  const out = [];
  for (const [i, a] of names.entries()) {
    // The selected place keeps its name wherever it is; the rules are for the rest.
    if (a.id !== sel) {
      if (a.r.left < c.left || a.r.right > c.right || a.r.top < c.top || a.r.bottom > c.bottom) out.push(`${a.id} leaves the map`);
      const k = cards.find((x) => touch(a.r, x.r));
      if (k) out.push(`${a.id} under ${k.name}`);
    }
    for (const b of names.slice(i + 1)) if (touch(a.r, b.r)) out.push(`${a.id} touches ${b.id}`);
    // A name moves to the inner side only when the right side does not fit, and there it never covers a point; on the
    // right side the reparto rules stay as they were.
    if (a.el.classList.contains('rotulo-izq')) {
      for (const d of dots) if (d.el !== a.el && touch(a.r, d.r)) out.push(`${a.id} covers the point of ${d.id}`);
      const p = a.el.querySelector('.punto').getBoundingClientRect(), cx = (p.left + p.right) / 2;
      const right = { left: 2 * cx - a.r.right, right: 2 * cx - a.r.left, top: a.r.top, bottom: a.r.bottom };
      if (right.right <= c.right && !cards.some((x) => touch(right, x.r))) out.push(`${a.id} moved to the inner side with room on the right`);
    }
  }
  return { out, names: names.length, inner: names.filter((x) => x.el.classList.contains('rotulo-izq')).map((x) => x.id) };
});
/** Puts a place at x px from the left of the map, keeping the zoom. */
const placeAt = (page, id, x, y = null) => page.evaluate(([i, px, py]) => {
  const m = window.__be.map, l = window.BE.L[i], p = m.project([l.lon, l.lat]), c = m.getContainer();
  const target = [px, py ?? p.y];
  m.jumpTo({ center: m.unproject([c.clientWidth / 2 + p.x - target[0], c.clientHeight / 2 + p.y - target[1]]) });
}, [id, x, y]);
/** The name of a place: drawn or not, on which side of its point, and its box against the map. */
const nameOf = (page, id) => page.evaluate((i) => {
  const el = window.__be.map.getContainer().querySelector(`.marca-lugar[data-sel="lugar:${CSS.escape(i)}"]`);
  const c = window.__be.map.getContainer().getBoundingClientRect();
  const r = el.querySelector('.etiqueta').getBoundingClientRect(), d = el.querySelector('.punto').getBoundingClientRect();
  return { drawn: !el.classList.contains('sin-etiqueta') && el.checkVisibility(), inner: r.right <= d.left, inside: r.left >= c.left && r.right <= c.right };
}, id);

test('a stop next to the right edge keeps its name on the inner side, and the old rules still hold, in both themes', async () => {
  for (const reunion of [false, true]) {
    const theme = reunion ? 'meeting mode' : 'light';
    const page = await open(PHONE, { reunion });
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('be-reunion')), reunion);
    // The tour of the return from Babilonia, stop 1: Babilonia and Jerusalén are its stops.
    await choose(page, 'recorrido:de-babilonia-a-jerusalen');
    await still(page);
    const W = await page.evaluate(() => window.__be.map.getContainer().clientWidth);
    // Babilonia 30 px from the right edge, at the height it has: its name does not fit on the right.
    await placeAt(page, 'babilonia', W - 30);
    await still(page);
    const b = await nameOf(page, 'babilonia');
    assert.deepEqual(b, { drawn: true, inner: true, inside: true }, `${theme}: Babilonia at the right edge`);
    let a = await audit(page);
    assert.deepEqual(a.out, [], `${theme}: the rules, with Babilonia at the right edge`);
    // Away from the edge it goes back to the right of its point.
    await placeAt(page, 'babilonia', W / 2);
    await still(page);
    assert.deepEqual(await nameOf(page, 'babilonia'), { drawn: true, inner: false, inside: true }, `${theme}: Babilonia in the middle`);
    // The selected place keeps its name at the edge too, on the inner side.
    await choose(page, 'lugar:jerusalen');
    await still(page);
    await placeAt(page, 'jerusalen', W - 20);
    await still(page);
    assert.deepEqual(await nameOf(page, 'jerusalen'), { drawn: true, inner: true, inside: true }, `${theme}: Jerusalén selected at the right edge`);
    // A crowded corner: Pablo's second journey with Filipos at the edge; nothing drawn touches, nothing covers a point.
    await choose(page, 'viaje:segundo-viaje');
    await still(page);
    for (const id of ['filipos', 'tesalonica', 'corinto', 'efeso']) {
      await placeAt(page, id, W - 25);
      await still(page);
      a = await audit(page);
      assert.deepEqual(a.out, [], `${theme}: the rules, with ${id} at the right edge (inner: ${a.inner.join(', ')})`);
    }
    assert.deepEqual(page.pageErrors, []);
    await page.context().close();
  }
});

test('at 1440 the names follow the same rules, and one moves only where the right side does not fit', async () => {
  const page = await open(DESKTOP);
  for (const sel of ['recorrido:cartas-y-ciudades', 'recorrido:de-babilonia-a-jerusalen', 'viaje:segundo-viaje']) {
    await choose(page, sel);
    await still(page);
    const a = await audit(page);
    assert.deepEqual(a.out, [], `the rules at 1440, ${sel} (inner: ${a.inner.join(', ')})`);
  }
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('430: the tour card is one line with its arrows, opens on a tap and closes with Escape; at 1440 it is the full card', async () => {
  const page = await open(PHONE);
  await choose(page, 'recorrido:cartas-y-ciudades');
  await still(page);
  const card = () => page.evaluate(() => {
    const v = document.querySelector('#vista-recorrido'), line = v.querySelector('.recorrido-linea'), full = v.querySelector('.recorrido-flota');
    const t = v.querySelector('[data-recorrido-abrir]');
    const r = (el) => (el?.checkVisibility() ? el.getBoundingClientRect() : null);
    return { line: r(line) && { h: Math.round(r(line).height), w: Math.round(r(line).width) }, full: !!r(full), expanded: t?.getAttribute('aria-expanded'), text: t?.textContent.replace(/\s+/g, ' ').trim(),
      prev: v.querySelector('.recorrido-flecha')?.getAttribute('aria-label'), next: v.querySelectorAll('.recorrido-flecha')[1]?.getAttribute('aria-label'),
      step: window.BE.recorridos.pasoDe('cartas-y-ciudades') };
  });
  let k = await card();
  assert.ok(k.line, 'the one-line card is drawn');
  assert.ok(k.line.h <= 48, `the card is one line: ${k.line.h} px tall`);
  assert.equal(k.full, false, 'the full card stays folded');
  assert.equal(k.expanded, 'false');
  assert.match(k.text, /1 de 14$/);
  assert.equal(k.prev, 'Es la primera parada');
  assert.match(k.next, /^Parada siguiente, 2: /);
  // The arrow moves to the next stop; the card stays one line and the focus stays on the arrow.
  await page.locator('.recorrido-flecha').nth(1).tap();
  await still(page);
  k = await card();
  assert.equal(k.step, 1);
  assert.match(k.text, /2 de 14$/);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.foco), 'sig');
  // A tap on the title opens the full card, with «Salir y explorar»; Escape folds it and gives the focus back.
  await page.locator('[data-recorrido-abrir]').tap();
  k = await card();
  assert.equal(k.expanded, 'true');
  assert.equal(k.full, true);
  assert.ok(await page.locator('#recorrido-flota [data-recorrido-salir]').isVisible());
  await page.locator('[data-recorrido-abrir]').focus();
  await page.keyboard.press('Escape');
  k = await card();
  assert.equal(k.expanded, 'false');
  assert.equal(k.full, false);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.foco), 'abrir');
  // The arrow back, from the keyboard.
  await page.locator('.recorrido-flecha').first().focus();
  await page.keyboard.press('Enter');
  await still(page);
  assert.equal((await card()).step, 0);
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
  const desk = await open(DESKTOP);
  await choose(desk, 'recorrido:cartas-y-ciudades');
  await still(desk);
  const d = await desk.evaluate(() => ({ line: document.querySelector('.recorrido-linea').checkVisibility(), full: document.querySelector('.recorrido-flota').checkVisibility() }));
  assert.deepEqual(d, { line: false, full: true }, 'at 1440 the card is the full one, as before');
  await desk.context().close();
});

test('430: «Las cartas de Pablo» opens with its eleven stops clear of the card, the controls and the sheet', async () => {
  const page = await open(PHONE);
  await choose(page, 'recorrido:cartas-y-ciudades');
  await still(page);
  const r = await page.evaluate(() => {
    const { BE } = window.__be, m = window.__be.map, c = m.getContainer().getBoundingClientRect();
    const vivo = (el) => el && !el.hidden && el.offsetParent;
    const cards = ['#vista-recorrido > *', '#vista-ahora', '#situacion', '#mapa .maplibregl-ctrl-top-right', '.modos', '#tira-suceso', '#leyenda-boton', '#panel']
      .flatMap((q) => [...document.querySelectorAll(q)]).filter(vivo).map((el) => ({ name: el.id || el.className.split(' ')[0], r: el.getBoundingClientRect() }));
    const rc = BE.D.recorridos.find((x) => x.id === 'cartas-y-ciudades');
    const ids = [...new Set(rc.paradas.flatMap((p) => { const s = BE.parseSel(p.sel); return !s ? [] : s.tipo === 'lugar' ? [s.id] : [...BE.implicados(s).lugares]; }))]
      .filter((id) => BE.L[id]?.lat != null && !['region', 'provincia', 'pais', 'reino'].includes(BE.L[id].tipo));
    const out = [];
    for (const id of ids) {
      const p = m.project([BE.L[id].lon, BE.L[id].lat]), x = c.left + p.x, y = c.top + p.y;
      if (x < c.left || x > c.right || y < c.top || y > c.bottom) { out.push(`${id} off the map`); continue; }
      const k = cards.find(({ r }) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
      if (k) out.push(`${id} under ${k.name}`);
    }
    return { n: ids.length, out, zoom: +m.getZoom().toFixed(2) };
  });
  assert.equal(r.n, 11, 'the tour has eleven places');
  assert.deepEqual(r.out, [], `stops off the map or under a card at zoom ${r.zoom}`);
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});
