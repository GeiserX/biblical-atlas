// «Atrás» and «Adelante» (docs/ideas/atras-adelante.md, option E; BE.historia in site/js/buscar.js, rules in
// site/js/visit-history.js), tested in a real headless browser: the buttons go where the browser's own Back and Forward
// go, never add entries, say where they go and switch off at the ends; each entry has its number, its name and a tab
// title; «Ahora mismo» has its entry; a link with a «#» and a reload keep the count; Alt, ⌘ and Ctrl with an arrow
// are left to the browser; on the phone the pair sits in the sheet's row, left of «Leyenda».
//
// Run from the root of the repository, one browser at a time:
//   node --test --test-concurrency=1 tests/site/historia.test.mjs
// Needs playwright-core with a Chromium (importable, or PLAYWRIGHT_CORE=<path to playwright-core>). It uses
// site/data.json when it exists, BE_DATA_FILE=<data.json> when given, or builds the data into a temporary directory
// with python3 scripts/build.py. BE_SITE_DIR=<dir> tests another copy of the site (a checkout of main is the control,
// and fails: it has no buttons). Hosts other than the local server are blocked, so the map itself does not load, except
// in the test of the map's frame, which lets MapLibre come from unpkg.com.
//
// Chromium runs without SwiftShader: no test here draws WebGL through it, and with it every frame is drawn on the CPU
// (a selection took up to 1.7 s of frames on an idle Mac mini, 40 ms without it), so on a loaded machine the frames,
// and every wait that polls on them, fell behind the page's timers.
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
const PHONE = { viewport: { width: 430, height: 900 }, isMobile: true, hasTouch: true };

function loadChromium() {
  const req = createRequire(import.meta.url);
  const tries = [process.env.PLAYWRIGHT_CORE, 'playwright-core', 'playwright'].filter(Boolean);
  for (const dir of String(process.env.PATH || '').split(path.delimiter)) {
    if (dir.endsWith(path.join('node_modules', '.bin'))) tries.push(path.join(dir, '..', 'playwright-core'), path.join(dir, '..', 'playwright'));
  }
  for (const t of tries) { try { const m = req(t); if (m.chromium) return m.chromium; } catch { /* next */ } }
  throw new Error('playwright-core not found: run with `npx -y -p playwright-core@1 node --test tests/site/landing.test.mjs`.');
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
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-historia-'));
    execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--salida', tmp], { cwd: ROOT, stdio: 'pipe' });
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

async function openPage(screen = DESKTOP, { hash = '', storage = null, route = null, wait = true, init = null, map = false, page: file = 'index.html' } = {}) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...screen });
  context.setDefaultTimeout(8000);
  // A slow device on demand: with window.__lento = ms, every frame is painted that much later (the map loading, a
  // mid-range phone).
  await context.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => raf(() => { if (window.__lento) setTimeout(() => cb(performance.now()), window.__lento); else cb(performance.now()); });
  });
  if (init) await context.addInitScript(init);
  if (storage) await context.addInitScript((s) => { if (!sessionStorage.getItem('be-init')) { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); sessionStorage.setItem('be-init', '1'); } }, storage);
  const page = await context.newPage();
  page.pageErrors = [];
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  await page.route((url) => !url.href.startsWith(base) && !(map && url.hostname.endsWith('unpkg.com')), (r) => r.abort());
  if (route) await page.route(/\/data(\.core)?\.json/, route);   // the core, or data.json when there is no core
  // Not until «load»: that waits for every image of the page too, which a loaded machine took more than 8 s to serve.
  // What a test needs, the data and the first frames, ready() waits for.
  await page.goto(`${base}${file}${hash ? `#${hash}` : ''}`, { waitUntil: 'domcontentloaded' });
  if (wait && file === 'index.html') await ready(page, { map });
  return page;
}
/** The map page has its data, its first frames painted and its address written; with `map`, MapLibre has loaded and
    stopped moving. */
async function ready(page, { map = false } = {}) {
  await page.waitForFunction(() => window.BE?.D && window.__be, null, { timeout: 30000 });
  if (map) await still(page);
  await settle(page);
}
/** The map has loaded and is not moving: the frame it stopped at is the entry's. */
async function still(page) {
  await page.waitForFunction(() => { const m = window.__be?.map; return !!m && m.loaded() && !m.isMoving(); }, null, { timeout: 30000 });
  await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
}
/** Waits for the page to settle after a press or a Back: two painted frames (every painter, the history's too, has seen
    the change) and base.js's address written. It waits on those, never on a fixed time; the assertions come after. */
async function settle(page) {
  // Two frames asked for now run after the frames the press already asked for, slow or not.
  await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
  await page.waitForFunction(() => window.BE?.D && location.hash === `#${window.BE.textoHash()}`, null, { timeout: 3000 }).catch(() => {});
}


/** What a view is: the address (date, scale, selection, map and every view parameter), the selection, the date and
    which study views are open. Two presses that land on the same entry give the same snapshot. */
const snap = (page) => page.evaluate(() => ({
  hash: decodeURIComponent(location.hash), sel: window.BE.E.sel ? window.BE.selTexto(window.BE.E.sel) : null, t: window.BE.E.t.toFixed(4),
  landing: document.documentElement.classList.contains('be-con-portada'),
  open: ['#vista-ahora', '#vista-grafo', '#vista-lectura', '#vista-conexion', '#vista-sincronia'].filter((s) => !document.querySelector(s)?.hidden),
}));
/** The history as the site keeps it, and the buttons as a person sees them. */
const hist = (page, pre = '') => page.evaluate((pre) => {
  const b = (id) => { const x = document.getElementById(`${pre}${id}`); return { off: x.disabled, label: x.getAttribute('aria-label'), title: x.title }; };
  return { state: history.state, length: history.length, title: document.title, back: b('atras'), forward: b('adelante') };
}, pre);
async function search(page, text) {
  await page.locator('#q').fill(text);
  // A search takes a few milliseconds. What made this wait run out on a loaded machine was the site closing the list:
  // the previous Enter left the box, and 150 ms later the list closed even with the box focused again and the next
  // search shown. This wait polls on frames, which a loaded machine delays more than timers, so it lost that race.
  await page.waitForFunction((t) => { const r = document.querySelector('#resultados'); return !r.hidden && r.innerText.includes(t); }, text);
  await page.keyboard.press('Enter');
  await settle(page);
}
const name = (page) => page.evaluate(() => history.state?.name);

/** Pablo, Corinto and Samotracia from the search box, a relation followed inside Samotracia's card, and «Ahora mismo».
    Returns the snapshot and the name of each of the six entries. */
async function walk(page) {
  const views = [await snap(page)], names = [await name(page)];
  for (const q of ['Pablo', 'Corinto', 'Samotracia']) { await search(page, q); views.push(await snap(page)); names.push(await name(page)); }
  const rel = page.locator('#panel-cuerpo [data-sel]:not([data-sel="lugar:samotracia"])').first();
  await rel.scrollIntoViewIfNeeded();
  await rel.click();
  await settle(page);
  views.push(await snap(page)); names.push(await name(page));
  await page.locator('#ahora-boton').click();
  await settle(page);
  views.push(await snap(page)); names.push(await name(page));
  return { views, names };
}

test('the buttons step through what the browser steps through, say where they go and switch off at the ends', async () => {
  for (const [screen, pre] of [[DESKTOP, ''], [PHONE, 'hoja-']]) {
    const page = await openPage(screen, { hash: 't=50.3000' });
    const first = await hist(page, pre);
    assert.equal(first.back.off, true, 'Back is on in the first view of the visit');
    assert.equal(first.back.label, 'No hay nada atrás');
    assert.equal(first.forward.label, 'No hay nada adelante');
    const { views, names } = await walk(page);
    const n = views.length - 1;
    assert.equal(new Set(views.map((v) => v.hash)).size, views.length, 'two steps gave the same view');
    assert.equal(names[0], 'El mapa en c. 50 e.c.');
    assert.deepEqual(names.slice(1, 4), ['Pablo', 'Corinto', 'Samotracia']);
    assert.match(names[5], /^Ahora mismo en /);
    assert.deepEqual(views[5].open, ['#vista-ahora'], '«Ahora mismo» is not open in its own entry');
    const end = await hist(page, pre);
    assert.equal(end.state.step, n);
    assert.equal(end.back.label, `Atrás: ${names[n - 1]}`);
    assert.equal(end.forward.off, true);
    const length = end.length;
    // The site's Back, down to the first view: each press lands where the step before was.
    const viaSite = [];
    for (let i = n - 1; i >= 0; i--) {
      await page.locator(`#${pre}atras`).click();
      await settle(page);
      const s = await snap(page), h = await hist(page, pre);
      viaSite[i] = s;
      assert.deepEqual(s, views[i], `site Back to step ${i}`);
      assert.equal(h.state.step, i);
      assert.equal(h.length, length, 'a press added an entry');
      assert.equal(h.title, names[i] === 'la portada' ? h.title : `${names[i]} · biblical-atlas`);
      assert.equal(h.back.off, i === 0);
      assert.equal(h.back.label, i === 0 ? 'No hay nada atrás' : `Atrás: ${names[i - 1]}`);
      assert.equal(h.forward.label, `Adelante: ${names[i + 1]}`);
    }
    // And Forward, up to the last.
    for (let i = 1; i <= n; i++) {
      await page.locator(`#${pre}adelante`).click();
      await settle(page);
      const h = await hist(page, pre);
      assert.deepEqual(await snap(page), views[i], `site Forward to step ${i}`);
      assert.equal(h.length, length);
      assert.equal(h.forward.off, i === n);
      assert.equal(h.forward.label, i === n ? 'No hay nada adelante' : `Adelante: ${names[i + 1]}`);
    }
    // The browser's own Back gives the same views as the site's.
    for (let i = n - 1; i >= 0; i--) {
      await page.goBack();
      await settle(page);
      assert.deepEqual(await snap(page), viaSite[i], `browser Back to step ${i}`);
      assert.equal((await hist(page, pre)).back.off, i === 0);
    }
    assert.deepEqual(page.pageErrors, []);
  }
});

test('entering from the landing: Back names it, goes back to it, and the landing hides the buttons', async () => {
  // Before the data the landing's entry already has its number and name: portada.js keeps them when it writes #portada=1.
  let release;
  const held = new Promise((ok) => { release = ok; });
  const early = await openPage(DESKTOP, { wait: false, route: async (r) => { await held; await r.continue(); } });
  await early.waitForFunction(() => /portada=1/.test(location.hash));
  const s0 = await early.evaluate(() => history.state);
  release();
  assert.equal(s0?.step, 0, `before the data the landing's entry had ${JSON.stringify(s0)}`);
  assert.equal(s0?.name, 'la portada');
  const page = await openPage();
  assert.equal(await name(page), 'la portada');
  await page.locator('[data-p="ej-pedro"]').click();
  await settle(page);
  const h = await hist(page);
  assert.equal(h.state.step, 1);
  assert.equal(h.back.label, 'Atrás: la portada');
  assert.equal(h.title, 'Pedro · biblical-atlas');
  await page.locator('#atras').click();
  await settle(page);
  const b = await hist(page);
  assert.equal((await snap(page)).landing, true);
  assert.equal(b.state.step, 0);
  assert.equal(b.title, 'biblical-atlas · ¿Dónde y cuándo pasó lo que estás leyendo?');
  assert.equal(await page.locator('#atras').isVisible(), false, 'the buttons show over the landing');
  assert.equal(b.forward.label, 'Adelante: Pedro');
});

test('Alt, ⌘ and Ctrl with an arrow are left to the browser; the arrow alone still moves the date', async () => {
  const page = await openPage(DESKTOP, { hash: 't=50.3000' });
  await page.evaluate(() => {
    window.__prevented = [];
    window.addEventListener('keydown', (e) => /^Arrow/.test(e.key) && window.__prevented.push(`${e.altKey ? 'Alt+' : ''}${e.metaKey ? 'Meta+' : ''}${e.ctrlKey ? 'Control+' : ''}${e.key}:${e.defaultPrevented}`));
    document.activeElement?.blur();
  });
  const t0 = await page.evaluate(() => window.BE.E.t);
  for (const k of ['Alt+ArrowLeft', 'Meta+ArrowLeft', 'Control+ArrowLeft', 'Alt+ArrowRight', 'Meta+ArrowRight']) await page.keyboard.press(k);
  assert.equal(await page.evaluate(() => window.BE.E.t), t0, 'a browser shortcut moved the date');
  await page.keyboard.press('ArrowLeft');
  const t1 = await page.evaluate(() => window.BE.E.t);
  assert.ok(t1 < t0, 'the arrow alone no longer moves the date');
  assert.deepEqual(await page.evaluate(() => window.__prevented), ['Alt+ArrowLeft:false', 'Meta+ArrowLeft:false', 'Control+ArrowLeft:false', 'Alt+ArrowRight:false', 'Meta+ArrowRight:false', 'ArrowLeft:true']);
});

test('a link with a «#» takes the next number, a reload keeps it, and going back and forth never grows the list', async () => {
  const page = await openPage(DESKTOP, { hash: 't=50.3000' });
  await search(page, 'Pablo');
  // What a «#» link or a typed address does. The new entry has its number at once, not only when the address is next
  // written (250 ms later): a reload in between keeps it.
  const soon = await page.evaluate(async () => { location.hash = 'sel=persona:pedro&t=30.5000'; await new Promise((ok) => setTimeout(ok, 50)); return history.state; });
  assert.equal(soon?.step, 2, `the new entry had ${JSON.stringify(soon)} before the address was written`);
  await settle(page);
  let h = await hist(page);
  assert.equal(h.state.step, 2);
  assert.equal(h.state.name, 'Pedro');
  assert.equal(h.back.label, 'Atrás: Pablo');
  const visits = () => page.evaluate(() => sessionStorage.getItem('biblical-atlas:visitas'));
  const kept = await visits();
  assert.equal(JSON.parse(kept).at(-1)[1].length, 3);
  for (let i = 0; i < 2; i++) { await page.locator('#atras').click(); await settle(page); }
  for (let i = 0; i < 2; i++) { await page.locator('#adelante').click(); await settle(page); }
  assert.equal(await visits(), kept, 'Back and Forward changed the list');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page);
  h = await hist(page);
  assert.equal(h.state.step, 2, 'a reload lost the number');
  assert.equal(h.back.off, false);
  assert.equal(h.back.label, 'Atrás: Pablo');
  await page.locator('#atras').click();
  await settle(page);
  assert.equal((await snap(page)).sel, 'persona:pablo');
  // A shared link opened fresh starts its own visit: nothing behind.
  const fresh = await openPage(DESKTOP, { hash: 'sel=persona:pedro' });
  assert.equal((await hist(fresh)).back.off, true);
});

test('on the phone the pair sits in the sheet row, left of «Leyenda», also with the sheet folded', async () => {
  const page = await openPage(PHONE, { hash: 't=50.3000' });
  await search(page, 'Pablo');
  const box = (sel) => page.locator(sel).boundingBox();
  assert.equal(await page.locator('.be-topbar .atras-adelante').isVisible(), false, 'the top bar pair shows on the phone');
  for (const folded of [false, true]) {
    if (folded) { await page.locator('#hoja-asa').click(); await settle(page); }
    const a = await box('#hoja-atras'), f = await box('#hoja-adelante'), l = await box('#leyenda-boton');
    assert.ok(a && f && l, `folded=${folded}: a button is not visible`);
    assert.ok(a.x + a.width <= f.x && f.x + f.width <= l.x, `folded=${folded}: the order is not ← → «Leyenda»`);
    assert.ok(Math.abs(a.y + a.height / 2 - (l.y + l.height / 2)) < 2, `folded=${folded}: not on Leyenda's row`);
    assert.equal(a.width, 44); assert.equal(a.height, 44);
  }
  assert.equal(await page.locator('#hoja-atras').getAttribute('aria-label'), 'Atrás: El mapa en c. 50 e.c.');
  assert.equal(await page.locator('.atras-adelante--hoja').getAttribute('role'), 'group');
  assert.equal(await page.locator('.atras-adelante--hoja').getAttribute('aria-label'), 'Historial de la visita');
});

test('focus stays on the pressed button, and moves to the other one when its own switches off', async () => {
  const page = await openPage(DESKTOP, { hash: 't=50.3000' });
  await search(page, 'Pablo');
  await search(page, 'Corinto');
  await page.locator('#atras').focus();
  await page.keyboard.press('Enter');
  await settle(page);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'atras');
  await page.keyboard.press('Enter');
  await settle(page);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'adelante', 'focus was lost when Back switched off');
  // A visit of two entries: Forward is still off when Back switches off, and is switched on in the same paint.
  for (const [screen, pre] of [[DESKTOP, ''], [PHONE, 'hoja-']]) {
    const two = await openPage(screen, { hash: 't=50.3000' });
    await search(two, 'Pablo');
    await two.locator(`#${pre}atras`).focus();
    await two.keyboard.press('Enter');
    await settle(two);
    assert.equal((await hist(two, pre)).state.step, 0);
    assert.equal(await two.evaluate(() => document.activeElement.id), `${pre}adelante`, `${pre || 'desktop'}: focus fell to the page in a visit of two`);
  }
});

test('with sessionStorage blocked, Back and Forward still know where they go', async () => {
  // Blocked storage (cookies off, a privacy mode): reading sessionStorage throws. The names live in memory too.
  const page = await openPage(DESKTOP, { hash: 't=50.3000', init: () => {
    Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); } });
  } });
  await search(page, 'Pablo');
  await search(page, 'Corinto');
  await page.locator('#atras').click();
  await settle(page);
  const h = await hist(page);
  assert.equal(h.state.step, 1);
  assert.equal(h.forward.off, false, 'Forward stayed off after Back');
  assert.equal(h.forward.label, 'Adelante: Corinto');
  assert.equal(h.back.label, 'Atrás: El mapa en c. 50 e.c.');
  await page.locator('#adelante').click();
  await settle(page);
  assert.equal((await snap(page)).sel, 'lugar:corinto');
  assert.deepEqual(page.pageErrors, []);
});

test('presses in a burst never leave the site, and stop at the last view', async () => {
  const page = await openPage(DESKTOP, { hash: 't=50.3000' });
  await search(page, 'Pablo');
  const centre = async (sel) => { const b = await page.locator(sel).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  // One entry behind and a double click: the second press has nowhere to go.
  await page.locator('#atras').dblclick();
  await page.waitForTimeout(600);
  await settle(page);
  assert.ok(page.url().startsWith(`${base}index.html`), `a double click left the site: ${page.url()}`);
  assert.equal((await hist(page)).state.step, 0);
  for (const q of ['Corinto', 'Samotracia', 'Pedro']) await search(page, q);
  const length = await page.evaluate(() => history.length);
  // Three entries behind, ten clicks with no pause, before the first Back has arrived.
  const [x, y] = await centre('#atras');
  for (let i = 0; i < 10; i++) await page.mouse.click(x, y);
  await page.waitForTimeout(800);
  await settle(page);
  assert.ok(page.url().startsWith(`${base}index.html`), `ten clicks left the site: ${page.url()}`);
  let h = await hist(page);
  assert.equal(h.state.step, 0);
  assert.equal(h.length, length);
  // And ten on Forward end on the last view.
  const [fx, fy] = await centre('#adelante');
  for (let i = 0; i < 10; i++) await page.mouse.click(fx, fy);
  await page.waitForTimeout(800);
  await settle(page);
  h = await hist(page);
  assert.equal(h.state.step, 3);
  assert.equal((await snap(page)).sel, 'persona:pedro');
  assert.deepEqual(page.pageErrors, []);
});

test('Back and Forward right after choosing keep the view just chosen, and two quick choices keep both', async () => {
  const page = await openPage(DESKTOP, { hash: 't=50.3000' });
  await search(page, 'Pablo');
  await search(page, 'Corinto');
  // Roma chosen and Back pressed in the same instant: no frame painted yet, no address written.
  await page.evaluate(() => { window.BE.seleccionar(window.BE.parseSel('lugar:roma')); document.getElementById('atras').click(); });
  await settle(page);
  let h = await hist(page);
  assert.equal((await snap(page)).sel, 'lugar:corinto', 'Back skipped the view before Roma');
  assert.equal(h.forward.label, 'Adelante: Roma');
  await page.locator('#adelante').click();
  await settle(page);
  assert.equal((await snap(page)).sel, 'lugar:roma', 'Forward did not go back to Roma');
  // Two choices inside base.js's 250 ms: each keeps its own entry and address. A press first, as a click would: after
  // Forward the next change without one is part of the same step.
  await page.evaluate(async () => {
    const BE = window.BE, frame = () => new Promise((ok) => requestAnimationFrame(ok));
    window.dispatchEvent(new PointerEvent('pointerdown'));
    BE.seleccionar(BE.parseSel('lugar:atenas')); await frame(); await frame();
    BE.seleccionar(BE.parseSel('lugar:samotracia'));
  });
  await settle(page);
  h = await hist(page);
  assert.equal(h.back.label, 'Atrás: Atenas');
  await page.locator('#atras').click();
  await settle(page);
  assert.equal((await snap(page)).sel, 'lugar:atenas');
  assert.equal((await hist(page)).back.label, 'Atrás: Roma');
});

test('a shared tour link opened fresh is one entry; the logo\'s landing keeps the page\'s title', async () => {
  const title = 'biblical-atlas · ¿Dónde y cuándo pasó lo que estás leyendo?';
  for (const hash of ['sel=recorrido:pedro&paso=1', 'sel=recorrido:pedro&paso=3', 'sel=recorrido:pedro']) {
    const page = await openPage(DESKTOP, { hash });
    await page.waitForTimeout(400);
    await settle(page);
    const h = await hist(page);
    assert.equal(h.state.step, 0, `${hash}: the stop placed after the load made an entry`);
    assert.equal(h.back.off, true);
    assert.match(h.state.name, /^Pedro/);
    assert.notEqual(h.title, title, `${hash}: the tour has the landing's title`);
    await page.context().close();
  }
  const page = await openPage(DESKTOP, { hash: 't=50.3000' });
  await search(page, 'Pablo');
  await page.locator('#inicio').click();
  await settle(page);
  assert.equal(await page.evaluate(() => document.title), title, 'the landing opened with the logo has another title');
});

test('a stateless entry reached by going back starts a visit there, and another page ahead switches Forward off', async () => {
  const page = await openPage(DESKTOP, { hash: 't=50.3000' });
  for (const q of ['Pablo', 'Corinto', 'Samotracia']) await search(page, q);
  await page.locator('#atras').click();
  await settle(page);
  // The state erased on Corinto's entry (a tab open before the buttons existed), then Forward and the browser's Back.
  const visit = await page.evaluate(() => { const v = history.state.visit; history.replaceState(null, '', location.href); return v; });
  await page.goForward();
  await settle(page);
  await page.goBack();
  await settle(page);
  let h = await hist(page);
  assert.equal((await snap(page)).sel, 'lugar:corinto');
  assert.notEqual(h.state.visit, visit, 'the entry was counted as a new one after Samotracia');
  assert.equal(h.state.step, 0);
  assert.equal(h.back.off, true);
  assert.equal(h.back.label, 'No hay nada atrás');
  assert.equal(h.state.name, 'Corinto', 'the entry that arrived without state has no name');
  assert.equal(h.title, 'Corinto · biblical-atlas');
  // Another page of the site reached by a typed address, not a link, while something was ahead.
  const p2 = await openPage(DESKTOP, { hash: 't=50.3000' });
  for (const q of ['Pablo', 'Corinto', 'Samotracia']) await search(p2, q);
  await p2.locator('#atras').click();
  await settle(p2);
  assert.equal((await hist(p2)).forward.label, 'Adelante: Samotracia');
  await p2.goto(`${base}acerca.html`, { waitUntil: 'domcontentloaded' });
  await p2.goBack({ waitUntil: 'domcontentloaded' });
  await ready(p2);
  h = await hist(p2);
  assert.equal(h.state.step, 2);
  assert.equal(h.forward.off, true, 'Forward offers Samotracia but goes to acerca.html');
  assert.equal(h.forward.label, 'No hay nada adelante');
  assert.equal(h.back.label, 'Atrás: Pablo');
});

test('only a link that unloads the page in this tab cuts what is ahead: mailto, a new tab or a modified click keep Forward', async () => {
  const page = await openPage(DESKTOP, { hash: 't=50.3000' });
  for (const q of ['Pablo', 'Corinto', 'Samotracia']) await search(page, q);
  await page.locator('#atras').click();
  await settle(page);
  assert.equal((await hist(page)).forward.label, 'Adelante: Samotracia');
  // Links that do not unload this document. A listener added after the site's cancels them once the site has seen the
  // click, so nothing opens; the site sees each click as a person's.
  await page.evaluate(() => {
    const links = [['mailto:alguien@example.org', ''], ['tel:+34900000000', ''], ['javascript:void 0', ''],
      ['acerca.html', '_blank'], ['https://wol.jw.org/es/', '_blank'], ['acerca.html', '']];
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;background:#fff';
    box.innerHTML = links.map(([href, target], i) => `<a data-prueba="${i}" href="${href}"${target ? ` target="${target}"` : ''}>enlace ${i}</a> `).join('');
    document.body.append(box);
    window.addEventListener('click', (e) => { if (e.target.closest?.('[data-prueba]')) e.preventDefault(); });
  });
  const stored = () => page.evaluate(() => sessionStorage.getItem('biblical-atlas:visitas'));
  const before = await stored();
  assert.match(before, /Samotracia/);
  for (const i of [0, 1, 2, 3, 4]) await page.locator(`[data-prueba="${i}"]`).click();
  for (const modifiers of [['Control'], ['Meta'], ['Shift'], ['Alt']]) await page.locator('[data-prueba="5"]').click({ modifiers });
  assert.equal(await stored(), before, 'a click that keeps this page cut the names ahead');
  // Forward still goes to Samotracia, and says so.
  assert.equal((await hist(page)).forward.label, 'Adelante: Samotracia');
  await page.locator('#adelante').click();
  await settle(page);
  assert.equal((await snap(page)).sel, 'lugar:samotracia', 'Forward did nothing after those clicks');
  // A plain click on a same-tab link to another page («Acerca de», in the bar) still cuts, as the browser does.
  await page.locator('#atras').click();
  await settle(page);
  await Promise.all([page.waitForURL(/acerca\.html/, { waitUntil: 'domcontentloaded' }), page.locator('#acerca').click()]);
  // Read on the other page, before coming back: there the Navigation API would cut it too, and hide a link that did not.
  assert.doesNotMatch(await stored(), /Samotracia/, 'the link to another page left Samotracia ahead');
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await ready(page);
  const h = await hist(page);
  assert.equal(h.state.step, 2);
  assert.equal(h.forward.off, true, 'a same-tab link to another page left Samotracia ahead');
  assert.equal(h.forward.label, 'No hay nada adelante');
  assert.deepEqual(page.pageErrors, []);
});

test('a second click on a timeline mark releases it in its own entry; Back brings the mark back, once, with the right labels', async () => {
  for (const [screen, pre] of [[DESKTOP, ''], [PHONE, 'hoja-']]) {
    const page = await openPage(screen, { hash: 't=50.5000&v=8' });
    await page.waitForFunction(() => document.querySelector('#linea-filas .m[data-id]'), null, { timeout: 25000 });
    await settle(page);
    // A mark whose name is in view and not covered: the point a person would press.
    const target = await page.evaluate(() => {
      for (const b of document.querySelectorAll('#linea-filas .m[data-id]')) {
        const r = b.querySelector('.m-nombre .t')?.getBoundingClientRect();
        if (!r || r.width < 8 || r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight) continue;
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        if (document.elementFromPoint(x, y)?.closest('.m[data-id]') === b) return { x, y, sel: b.dataset.sel, id: b.dataset.id };
      }
      return null;
    });
    assert.ok(target, `${pre || 'desktop'}: no mark of the timeline can be pressed`);
    const press = async () => {
      if (screen.hasTouch) await page.touchscreen.tap(target.x, target.y); else await page.mouse.click(target.x, target.y);
      await settle(page);
    };
    const h0 = await hist(page, pre), v0 = await snap(page);
    await press();
    const h1 = await hist(page, pre), v1 = await snap(page);
    assert.equal(v1.sel, target.sel, 'the first press selects the mark');
    assert.equal(h1.state.step, h0.state.step + 1, 'selecting a mark is one entry');
    await press();
    const h2 = await hist(page, pre), v2 = await snap(page);
    assert.equal(v2.sel, null, 'the second press on the same mark releases it');
    assert.equal(h2.state.step, h1.state.step + 1, 'releasing is one entry, as closing the card is');
    assert.equal(h2.length, h0.length + 2, 'a press made more than one entry');
    assert.equal(h2.back.label, `Atrás: ${h1.state.name}`);
    assert.equal(h2.forward.off, true);
    // The site's Back brings the mark back, selected, with the same address; Forward releases it again.
    await page.locator(`#${pre}atras`).click();
    await settle(page);
    let h = await hist(page, pre);
    assert.deepEqual(await snap(page), v1, 'Back after the release is not the view with the mark selected');
    assert.equal(h.state.step, h1.state.step);
    assert.equal(h.length, h2.length, 'Back added an entry');
    assert.equal(h.back.label, `Atrás: ${h0.state.name}`);
    assert.equal(h.forward.label, `Adelante: ${h2.state.name}`);
    assert.ok(await page.evaluate((id) => !!document.querySelector(`#linea-filas .m[data-id="${CSS.escape(id)}"]`), target.id), 'the mark is not on the strip after Back');
    await page.locator(`#${pre}adelante`).click();
    await settle(page);
    h = await hist(page, pre);
    assert.deepEqual(await snap(page), v2);
    assert.equal(h.forward.off, true);
    // The browser's Back agrees, and one more reaches the view before the mark.
    await page.goBack();
    await settle(page);
    assert.deepEqual(await snap(page), v1, 'the browser\'s Back after the release');
    await page.goBack();
    await settle(page);
    assert.deepEqual(await snap(page), v0);
    assert.equal((await hist(page, pre)).length, h2.length);
    assert.deepEqual(page.pageErrors, []);
  }
});

test('on the phone the reading has its own pair, beside «Cerrar», that a finger reaches', async () => {
  const page = await openPage(PHONE, { hash: 'leer=hch-16' });
  await page.locator('#vista-lectura [data-lectura-pasaje="1"]').click();
  await settle(page);
  assert.equal((await hist(page, 'hoja-')).state.step, 1);
  const atras = page.locator('#vista-lectura [data-historia="atras"]');
  assert.equal(await atras.isVisible(), true, 'no Back in the reading');
  assert.equal(await atras.getAttribute('aria-label'), (await hist(page, 'hoja-')).back.label);
  const hit = await atras.evaluate((b) => { const r = b.getBoundingClientRect(); return b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); });
  assert.equal(hit, true, 'something covers the reading\'s Back');
  const box = await atras.boundingBox();
  assert.equal(box.width, 44); assert.equal(box.height, 44);
  await atras.click();
  await settle(page);
  assert.equal((await hist(page, 'hoja-')).state.step, 0);
  assert.equal(await page.locator('#vista-lectura [data-historia="adelante"]').isEnabled(), true);
  // On the computer the reading has none: the top bar's pair is there.
  const desk = await openPage(DESKTOP, { hash: 'leer=hch-16' });
  assert.equal(await desk.locator('#vista-lectura [data-historia="atras"]').isVisible(), false);
  assert.deepEqual(page.pageErrors, []);
});

test('on a slow device a tap while the tour from the landing paints still makes one entry', async () => {
  const page = await openPage();
  const length = await page.evaluate(() => history.length);
  await page.evaluate(() => { window.__lento = 600; });
  await page.locator('[data-p="rec-pedro"]').click();
  await page.waitForTimeout(350);
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerdown')));
  await page.waitForTimeout(2000);
  await page.evaluate(() => { window.__lento = 0; });
  await settle(page);
  const h = await hist(page);
  assert.equal(h.length, length + 1, 'a tap between the address and the first frame made a second entry');
  assert.equal(h.state.step, 1);
  assert.equal(h.back.label, 'Atrás: la portada');
});

test('Alt, ⌘ and Ctrl with an arrow are the browser\'s on the panel separator, the curtain, «Meses» and the date panel', async () => {
  const page = await openPage(DESKTOP, { hash: 't=50.3000&sel=persona:pablo&mapa=cortina' });
  await page.evaluate(() => {
    window.__prevented = [];
    // Capture, then read once every handler has run: the date panel stops the key from bubbling.
    window.addEventListener('keydown', (e) => { if (/^Arrow/.test(e.key) && (e.altKey || e.metaKey || e.ctrlKey)) setTimeout(() => window.__prevented.push(`${document.activeElement.id || document.activeElement.dataset.meses || document.activeElement.getAttribute('role')}:${e.defaultPrevented}`)); }, true);
  });
  const keys = ['Alt+ArrowLeft', 'Meta+ArrowLeft', 'Control+ArrowLeft', 'Alt+ArrowRight'];
  const press = async () => { for (const k of keys) await page.keyboard.press(k); await page.waitForTimeout(50); };
  const width = () => page.evaluate(() => document.getElementById('panel').getBoundingClientRect().width);
  const w0 = await width();
  await page.locator('#sep-panel').click();
  await press();
  assert.equal(await width(), w0, 'the panel width moved');
  const c0 = await page.evaluate(() => window.BE.E.cortinaX);
  await page.locator('#cortina-asa').focus();
  await press();
  assert.equal(await page.evaluate(() => window.BE.E.cortinaX), c0, 'the curtain moved');
  await page.evaluate(() => { const m = document.getElementById('meses-control'); m.hidden = false; m.querySelector('[data-meses]').focus(); });
  await press();
  await page.locator('#fecha').click();
  await page.locator('[role="dialog"] [role="radio"], dialog [role="radio"]').first().focus();
  await press();
  const got = await page.evaluate(() => window.__prevented);
  assert.equal(got.length, keys.length * 4, JSON.stringify(got));
  assert.deepEqual(got.filter((x) => x.endsWith(':true')), [], 'a handler took a browser shortcut');
});

test('entries that would read the same are told apart: a year searched over a reading, then «Ahora mismo»', async () => {
  const page = await openPage(DESKTOP, { hash: 'leer=hch-1&t=33.4000' });
  assert.equal(await name(page), 'Lectura de Hechos 1');
  await search(page, '607 a.e.c.');
  let h = await hist(page);
  assert.equal(h.state.step, 1);
  assert.equal(h.state.name, 'Lectura de Hechos 1 en c. 607 a.e.c.', 'the year searched kept the reading\'s name, or the date before the jump');
  assert.equal(h.title, 'Lectura de Hechos 1 en c. 607 a.e.c. · biblical-atlas');
  assert.equal(h.back.label, 'Atrás: Lectura de Hechos 1');
  await page.locator('#ahora-boton').click();
  await settle(page);
  h = await hist(page);
  assert.equal(h.state.name, 'Ahora mismo en c. 607 a.e.c.', '«Ahora mismo» over a reading has the reading\'s name');
  assert.equal(h.back.label, 'Atrás: Lectura de Hechos 1 en c. 607 a.e.c.');
});

test('a search typed right after choosing a result keeps its list open', async () => {
  // Choosing a result leaves the box, and the list closes 150 ms later. A search typed in that time (a fast person, or a
  // test on a loaded machine) had its list closed under it.
  const page = await openPage(DESKTOP, { hash: 't=50.3000' });
  const r = await page.evaluate(async () => {
    const q = document.getElementById('q');
    const type = (text) => { q.focus(); q.value = text; q.dispatchEvent(new Event('input', { bubbles: true })); };
    type('Pablo');
    q.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    type('Corinto');
    await new Promise((ok) => setTimeout(ok, 400));
    return { hidden: document.getElementById('resultados').hidden, focus: document.activeElement.id, sel: window.BE.selTexto(window.BE.E.sel) };
  });
  assert.equal(r.sel, 'persona:pablo', 'Enter did not choose Pablo');
  assert.equal(r.focus, 'q');
  assert.equal(r.hidden, false, 'the list of the second search closed while the box had the focus');
});

const TOUR = 'Las cartas de Pablo y las ciudades que las recibieron';
test('a tour opened from the search or from a card link is one entry, and one Back leaves it; paso=4 still opens at stop 4', async () => {
  for (const [screen, pre] of [[DESKTOP, ''], [PHONE, 'hoja-']]) {
    const page = await openPage(screen, { hash: 't=50.3000' });
    await search(page, 'Pablo');
    const h0 = await hist(page, pre);
    await search(page, 'Las cartas de Pablo y las ciudades');
    await settle(page);   // the second entry, when there was one, came a frame after the first
    const h1 = await hist(page, pre);
    assert.equal(h1.length, h0.length + 1, `${pre || 'desktop'}: opening the tour from the search made ${h1.length - h0.length} entries`);
    assert.equal(h1.state.step, h0.state.step + 1);
    assert.equal(h1.state.name, `${TOUR}, parada 1`);
    assert.equal(h1.back.label, 'Atrás: Pablo');
    await page.locator(`#${pre}atras`).click();
    await settle(page);
    assert.equal((await snap(page)).sel, 'persona:pablo', `${pre || 'desktop'}: one Back did not leave the tour`);
    assert.deepEqual(page.pageErrors, []);
  }
  // From a card: the last stop of Pedro's tour links the other tours.
  const page = await openPage(DESKTOP, { hash: 'sel=recorrido:pedro&paso=16' });
  const h0 = await hist(page);
  await page.locator('#panel-cuerpo [data-sel="recorrido:cartas-y-ciudades"]').click();
  await settle(page);
  await settle(page);
  const h1 = await hist(page);
  assert.equal(h1.length, h0.length + 1, `opening the tour from a card link made ${h1.length - h0.length} entries`);
  assert.equal(h1.state.name, `${TOUR}, parada 1`);
  await page.locator('#atras').click();
  await settle(page);
  assert.equal((await snap(page)).sel, 'recorrido:pedro', 'one Back did not leave the tour opened from the card');
  // A shared link with paso=4 opens at stop 4, in one entry.
  const four = await openPage(DESKTOP, { hash: 'sel=recorrido:cartas-y-ciudades&paso=4' });
  assert.match(await four.locator('#panel-cuerpo .recorrido .be-card__eyebrow').textContent(), /parada 4 de 14/);
  assert.match((await snap(four)).hash, /paso=4/);
  assert.equal((await hist(four)).state.step, 0);
  assert.equal((await hist(four)).state.name, `${TOUR}, parada 4`);
});

/** Where the map is: its centre and zoom. */
const frame = (page) => page.evaluate(() => { const m = window.__be.map, c = m.getCenter(); return { lon: c.lng, lat: c.lat, zoom: m.getZoom() }; });
/** Two frames are the same map: the entry keeps the centre to about a metre and the zoom to a hundredth. */
function sameFrame(a, b, what) {
  assert.ok(Math.abs(a.zoom - b.zoom) < 0.01 && Math.abs(a.lon - b.lon) < 1e-4 && Math.abs(a.lat - b.lat) < 1e-4,
    `${what}: the map is at ${JSON.stringify(a)}, it was left at ${JSON.stringify(b)}`);
}

test('each entry keeps the map where it was left: Back, Forward and a reload bring it back; moving it makes no entry; a shared link frames its selection', async () => {
  for (const [screen, pre] of [[DESKTOP, ''], [PHONE, 'hoja-']]) {
    const who = pre || 'desktop';
    const page = await openPage(screen, { hash: 't=50.3000', map: true });
    await search(page, 'Filipos');
    await still(page);
    const framed = await frame(page);
    const h0 = await hist(page, pre), url0 = page.url();
    // Moved by hand to zoom 9.5, to the north-east. A drag with Playwright's mouse starts and never ends in headless
    // Chromium (MapLibre fires dragstart and nothing more, on main too), so the move is MapLibre's own: it ends in the
    // same moveend a hand's does.
    await page.evaluate(({ lon, lat }) => window.__be.map.jumpTo({ center: [lon + 0.3, lat + 0.2], zoom: 9.5 }), framed);
    await still(page);
    const left = await frame(page);
    const h1 = await hist(page, pre);
    assert.equal(h1.length, h0.length, `${who}: moving the map made an entry`);
    assert.equal(h1.state.step, h0.state.step);
    assert.equal(page.url(), url0, `${who}: moving the map changed the address`);
    await search(page, 'Corinto');
    await still(page);
    const corinto = await frame(page);
    await page.locator(`#${pre}atras`).click();
    await settle(page);
    await still(page);
    assert.equal((await snap(page)).sel, 'lugar:filipos');
    sameFrame(await frame(page), left, `${who}, Back to Filipos`);
    await page.locator(`#${pre}adelante`).click();
    await settle(page);
    await still(page);
    sameFrame(await frame(page), corinto, `${who}, Forward to Corinto`);
    await page.goBack();
    await settle(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ready(page, { map: true });
    sameFrame(await frame(page), left, `${who}, reload of Filipos`);
    // The same address in a new tab has no frame of its own: it frames Filipos as a shared link always did.
    const shared = await openPage(screen, { hash: (await snap(page)).hash.slice(1), map: true });
    sameFrame(await frame(shared), framed, `${who}, a shared link to Filipos`);
    assert.deepEqual(page.pageErrors, []);
  }
});

test('with no selection the map stays where it was left: a reload does not recentre on Pablo, and Back over a jump in time does not reframe it', async () => {
  const page = await openPage(DESKTOP, { hash: 't=50.3000', map: true });
  const pablo = await frame(page);
  // Away from Pablo by hand, far enough that his frame is not this one.
  await page.evaluate(({ lon, lat }) => window.__be.map.jumpTo({ center: [lon + 9, lat - 4], zoom: 6 }), pablo);
  await still(page);
  const left = await frame(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page, { map: true });
  // MapLibre's load arrives after the first frame: Pablo was put there then.
  await page.waitForTimeout(1500);
  await still(page);
  sameFrame(await frame(page), left, 'reload with no selection');
  // A year searched more than 20 years away asks for Pablo's frame 300 ms later; Back to the entry of before must
  // cancel the one that Back's own jump asks for.
  await search(page, '607 a.e.c.');
  await page.waitForTimeout(1500);
  await still(page);
  await page.goBack();
  await settle(page);
  await page.waitForTimeout(1500);
  await still(page);
  assert.equal((await snap(page)).t, '50.3000');
  sameFrame(await frame(page), left, 'Back over a jump in time');
  assert.deepEqual(page.pageErrors, []);
});

test('a tour entry keeps the map where it was left: Back into it from another selection and a reload do not reframe its stop', async () => {
  // The tour opens one frame after its entry is read, and framing its stop then overwrote the frame the entry kept. The
  // browser's Back showed it on every run; the site's button did not always.
  for (const [screen, pre] of [[DESKTOP, ''], [PHONE, 'hoja-']]) {
    const who = pre || 'desktop';
    const page = await openPage(screen, { hash: 't=50.3000', map: true });
    await search(page, 'Pablo');
    await search(page, 'Las cartas de Pablo y las ciudades');
    await still(page);
    const framed = await frame(page);
    await page.evaluate(({ lon, lat }) => window.__be.map.jumpTo({ center: [lon + 0.3, lat + 0.2], zoom: 9.5 }), framed);
    await still(page);
    const left = await frame(page);
    await search(page, 'Corinto');
    await still(page);
    await page.goBack();
    await settle(page);
    await still(page);
    assert.equal((await snap(page)).sel, 'recorrido:cartas-y-ciudades');
    sameFrame(await frame(page), left, `${who}, Back into the tour`);
    sameFrame((await hist(page, pre)).state.frame, left, `${who}, the entry's frame after Back`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ready(page, { map: true });
    assert.equal((await snap(page)).sel, 'recorrido:cartas-y-ciudades');
    sameFrame(await frame(page), left, `${who}, reload of the tour entry`);
    assert.deepEqual(page.pageErrors, []);
  }
});

test('resizing the window writes nothing to the history: a map that stops where it was keeps its entry as it is', async () => {
  // Safari refuses more than 100 history writes in 10 seconds, and then the site's own entries are lost. A resize ends in
  // MapLibre's moveend with the same centre and zoom: one write per resize event filled that budget while dragging an edge.
  const page = await openPage(DESKTOP, { hash: 't=50.3000&sel=lugar:corinto', map: true });
  await page.evaluate(() => {
    window.__escrituras = 0;
    window.__paradas = 0;
    for (const k of ['pushState', 'replaceState']) {
      const f = history[k].bind(history);
      history[k] = (...a) => { window.__escrituras++; return f(...a); };
    }
    window.__be.map.on('moveend', () => { window.__paradas++; });
  });
  for (let i = 0; i < 30; i++) {
    await page.setViewportSize({ width: 1440 - (i % 2) * 37 - i, height: 900 - (i % 3) * 11 });
    await page.evaluate(() => new Promise((ok) => requestAnimationFrame(ok)));
  }
  await still(page);
  const r = await page.evaluate(() => ({ escrituras: window.__escrituras, paradas: window.__paradas }));
  assert.ok(r.paradas > 0, 'no resize ended in moveend: this test checks nothing');
  assert.equal(r.escrituras, 0, `${r.paradas} resizes wrote ${r.escrituras} times to the history`);
  // Past the limit Safari throws: the map still stops and moves, without an error out of its moveend.
  await page.evaluate(() => {
    history.replaceState = () => { throw new DOMException('Attempt to use history.replaceState() more than 100 times per 10 seconds', 'SecurityError'); };
    const m = window.__be.map, c = m.getCenter();
    m.jumpTo({ center: [c.lng + 0.5, c.lat], zoom: m.getZoom() + 1 });
  });
  await still(page);
  assert.deepEqual(page.pageErrors, []);
});

test('«Volver al mapa» goes back to the entry the map was on, with its Back; from the landing, a shared link or a section it stays a link', async () => {
  const volver = (page) => Promise.all([page.waitForURL(/index\.html/, { waitUntil: 'domcontentloaded' }), page.locator('a.be-btn[data-volver]').click()]);
  const page = await openPage(DESKTOP, { hash: 't=50.3000' });
  await search(page, 'Pablo');
  await search(page, 'Corinto');
  const before = await hist(page);
  // «Acerca de», from the top bar, and the calendar, from the date panel.
  const ways = [['Acerca de', /acerca\.html/, async () => page.locator('#acerca').click()],
    ['the calendar', /calendario\.html/, async () => { await page.locator('#fecha').click(); await page.locator('a.date-picker__link[data-calendario]').click(); }]];
  const copied = [];
  for (const [what, url, go] of ways) {
    await Promise.all([page.waitForURL(url, { waitUntil: 'domcontentloaded' }), go()]);
    // The mark lives in the entry, not in the address a person copies or bookmarks.
    await page.waitForFunction(() => history.state?.volverAlMapa === true);
    assert.doesNotMatch(page.url(), /volver=/, `${what}: the address still says volver=atras`);
    copied.push(page.url());
    await volver(page);
    await ready(page);
    const h = await hist(page);
    assert.equal((await snap(page)).sel, 'lugar:corinto', what);
    assert.equal(h.state.visit, before.state.visit, `${what}: «Volver al mapa» started a new visit`);
    assert.equal(h.state.step, before.state.step);
    assert.equal(h.back.label, 'Atrás: Pablo');
    assert.equal(h.length, before.length + 1, `${what}: «Volver al mapa» added an entry instead of going back`);
  }
  // Ctrl or ⌘ with the click opens the map in a new tab, as a link does, and this tab stays on «Acerca de».
  await Promise.all([page.waitForURL(/acerca\.html/, { waitUntil: 'domcontentloaded' }), page.locator('#acerca').click()]);
  const [tab] = await Promise.all([page.context().waitForEvent('page'), page.locator('a.be-btn[data-volver]').click({ modifiers: ['ControlOrMeta'] })]);
  await tab.waitForLoadState('domcontentloaded');
  assert.match(tab.url(), /index\.html#.*sel=lugar:corinto/);
  assert.match(page.url(), /acerca\.html/, 'a modified click went back in this tab');
  await tab.close();
  await volver(page);
  await ready(page);
  // From a section of the page (#gracias, an entry of its own) Back is not the map: the button stays a link.
  await Promise.all([page.waitForURL(/acerca\.html/, { waitUntil: 'domcontentloaded' }), page.locator('#acerca').click()]);
  await page.evaluate(() => { location.hash = 'gracias'; });
  await volver(page);
  await ready(page);
  assert.match(page.url(), /index\.html#.*sel=lugar:corinto/);
  assert.equal((await hist(page)).state.step, 0, 'from a section the button went back to the page');
  // From the landing, Back would be the landing: the button leads to the map, as a link.
  const land = await openPage(DESKTOP);
  assert.equal((await snap(land)).landing, true);
  await Promise.all([land.waitForURL(/acerca\.html/, { waitUntil: 'domcontentloaded' }), land.locator('a[href^="acerca.html"]', { hasText: 'Qué es biblical-atlas' }).click()]);
  await volver(land);
  await ready(land);
  assert.equal((await snap(land)).landing, false, 'from the landing «Volver al mapa» went back to the landing');
  // A shared link to «Acerca de», even one that says volver=atras, has nothing behind: a link.
  const shared = await openPage(DESKTOP, { page: `acerca.html?desde=${encodeURIComponent('t=50.3000&sel=lugar:corinto')}&volver=atras` });
  await volver(shared);
  await ready(shared);
  assert.equal((await snap(shared)).sel, 'lugar:corinto');
  assert.equal((await hist(shared)).state.step, 0);
  // The address copied from either page, pasted over the landing in the same tab: the button leads to the map's view,
  // never back to the landing behind it.
  for (const url of copied) {
    const over = await openPage(DESKTOP);
    assert.equal((await snap(over)).landing, true);
    await over.goto(url, { waitUntil: 'domcontentloaded' });
    await volver(over);
    await ready(over);
    const v = await snap(over);
    assert.equal(v.landing, false, `${url}: pasted over the landing, «Volver al mapa» went back to the landing`);
    assert.equal(v.sel, 'lugar:corinto');
  }
  // Without the Navigation API (document.referrer instead), a reload of a section of «Acerca de» still has the map as
  // its referrer: the button stays a link and does not go back to the page.
  const sinApi = await openPage(DESKTOP, { hash: 't=50.3000', init: () => { Object.defineProperty(window, 'navigation', { value: undefined, configurable: true }); } });
  await search(sinApi, 'Corinto');
  await Promise.all([sinApi.waitForURL(/acerca\.html/, { waitUntil: 'domcontentloaded' }), sinApi.locator('#acerca').click()]);
  assert.equal(await sinApi.evaluate(() => window.navigation), undefined, 'the Navigation API is still there: this case checks nothing');
  assert.equal(await sinApi.evaluate(() => history.state?.volverAlMapa), true, 'without the API the referrer did not mark the entry');
  await sinApi.evaluate(() => { location.hash = 'gracias'; });
  await sinApi.reload({ waitUntil: 'domcontentloaded' });
  await volver(sinApi);
  await ready(sinApi);
  assert.match(sinApi.url(), /index\.html#.*sel=lugar:corinto/);
  assert.deepEqual([page.pageErrors, sinApi.pageErrors], [[], []]);
});
