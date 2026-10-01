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
// and fails: it has no buttons). Hosts other than the local server are blocked, so the map itself does not load: the
// map's frame after each press is checked by hand (site/README.md, «Atrás y adelante»).
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
    const file = rel === '/data.json' ? dataFile : path.join(dir, rel.endsWith('/') ? `${rel}index.html` : rel);
    if (!file.startsWith(dir) && file !== dataFile) { res.writeHead(404); res.end(); return; }
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
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  try { browser = await chromium.launch({ headless: true, args }); }
  catch { browser = await chromium.launch({ headless: true, args, channel: 'chrome' }); }
});
afterEach(async () => { for (const c of browser?.contexts() || []) await c.close().catch(() => {}); });
after(async () => { await browser?.close(); server?.close(); if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); });

async function openPage(screen = DESKTOP, { hash = '', storage = null, route = null, wait = true, init = null } = {}) {
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
  await page.route((url) => !url.href.startsWith(base), (r) => r.abort());
  if (route) await page.route('**/data.json*', route);
  await page.goto(`${base}index.html${hash ? `#${hash}` : ''}`);
  if (wait) { await page.waitForFunction(() => window.BE?.D && window.__be, null, { timeout: 30000 }); await page.waitForTimeout(400); }
  return page;
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
  await page.reload();
  await page.waitForFunction(() => window.BE?.D && window.__be, null, { timeout: 30000 });
  await settle(page);
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
  await p2.goto(`${base}acerca.html`);
  await p2.goBack();
  await p2.waitForFunction(() => window.BE?.D && window.__be, null, { timeout: 30000 });
  await settle(p2);
  h = await hist(p2);
  assert.equal(h.state.step, 2);
  assert.equal(h.forward.off, true, 'Forward offers Samotracia but goes to acerca.html');
  assert.equal(h.forward.label, 'No hay nada adelante');
  assert.equal(h.back.label, 'Atrás: Pablo');
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
