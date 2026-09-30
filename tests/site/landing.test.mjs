// The landing («Entra por una pregunta», site/js/portada.js), tested in a real headless browser: it paints first, its
// box answers with the site's own search, every control lands where it says with one history entry and one Back
// returns to it, «Seguir donde lo dejaste» and «Olvidar», the reading settings, and what it does before the data and
// when the data fails.
//
// Run from the root of the repository, one browser at a time:
//   node --test --test-concurrency=1 tests/site/landing.test.mjs
// Needs playwright-core with a Chromium (importable, or PLAYWRIGHT_CORE=<path to playwright-core>). It uses
// site/data.json when it exists, BE_DATA_FILE=<data.json> when given, or builds the data into a temporary directory
// with python3 scripts/build.py. BE_SITE_DIR=<dir> tests another copy of the site (a checkout of main is the control).
// Hosts other than the local server are blocked, so the map itself does not load: the map's framing is checked by
// hand (site/README.md, «Portada»).
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
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-landing-'));
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

async function openPage(screen = DESKTOP, { hash = '', storage = null, route = null, wait = true } = {}) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...screen });
  context.setDefaultTimeout(8000);
  // A slow device on demand: with window.__lento = ms, every frame is painted that much later (the map loading, a
  // mid-range phone).
  await context.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => raf(() => { if (window.__lento) setTimeout(() => cb(performance.now()), window.__lento); else cb(performance.now()); });
  });
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
const state = (page) => page.evaluate(() => ({
  up: document.documentElement.classList.contains('be-con-portada'), hash: decodeURIComponent(location.hash), hist: history.length,
  sel: window.BE.E?.sel ? `${window.BE.E.sel.tipo}:${window.BE.E.sel.id}` : null, t: window.BE.E?.t,
  focus: document.activeElement?.dataset?.p || document.activeElement?.id || '', q: document.querySelector('#portada-q').value,
  inert: document.querySelectorAll('#app > [inert]').length,
}));
const rows = (page) => page.$$eval('#portada-lista [role="option"]', (ls) => ls.map((l) => ({ forma: l.querySelector('use')?.getAttribute('href'), tit: l.querySelector('.portada-op__tit').textContent, meta: l.querySelector('.portada-op__meta')?.textContent || '', fecha: l.querySelector('.portada-fecha')?.textContent || '' })));
async function type(page, text) {
  const q = page.locator('#portada-q');
  await q.fill('');
  await q.pressSequentially(text, { delay: 5 });
  await page.waitForTimeout(100);
}
/** Waits for the page to settle after a press or a Back: two painted frames (every painter, the history's too, has seen
    the change) and base.js's address written. It waits on those, never on a fixed time; the assertions come after. */
async function settle(page) {
  // Two frames asked for now run after the frames the press already asked for, slow or not.
  await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
  await page.waitForFunction(() => window.BE?.D && location.hash === `#${window.BE.textoHash()}`, null, { timeout: 3000 }).catch(() => {});
}

test('a cold open shows the landing over an inert site; an address opens its view and no landing', async () => {
  const page = await openPage();
  const s = await state(page);
  assert.equal(s.up, true);
  assert.match(s.hash, /portada=1/);
  assert.ok(s.inert >= 5, `only ${s.inert} parts of the site are inert`);
  assert.equal(await page.locator('#vista-portada h1').count(), 1);
  assert.equal((await page.locator('#vista-portada h1').textContent()).trim(), '¿Dónde y cuándo pasó lo que estás leyendo?');
  assert.ok(await page.locator('#vista-portada').isVisible());
  const shared = await openPage(DESKTOP, { hash: 'sel=persona:pedro&t=30.5000' });
  const t = await state(shared);
  assert.equal(t.up, false);
  assert.equal(t.sel, 'persona:pedro');
  assert.equal(t.inert, 0);
  assert.equal(await shared.locator('#vista-portada').isVisible(), false);
  assert.deepEqual([...page.pageErrors, ...shared.pageErrors], []);
});

test('on a cold open the keys scroll the landing and never drive the site behind it', async () => {
  const page = await openPage();
  const t0 = (await state(page)).t;
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'vista-portada');
  await page.keyboard.press('PageDown');
  await page.waitForFunction(() => document.querySelector('#vista-portada').scrollTop > 0);
  for (const k of ['Space', 'ArrowRight', 't', 'Escape']) await page.keyboard.press(k);
  await page.waitForTimeout(300);
  const s = await page.evaluate(() => ({ play: window.BE.E.play, t: window.BE.E.t, grande: /linea=grande/.test(location.hash), up: document.documentElement.classList.contains('be-con-portada') }));
  assert.deepEqual(s, { play: false, t: t0, grande: false, up: true });
});

test('the box answers with the shape, the type word and the date of each result', async () => {
  const page = await openPage();
  await type(page, 'Corin');
  const rs = await rows(page);
  assert.ok(rs.length >= 3 && rs.length <= 7, `${rs.length} rows`);
  assert.deepEqual([rs[0].tit, rs[0].forma], ['Corinto', '#f-lugar']);
  assert.match(rs[0].meta, /^lugar/);
  for (const r of rs.filter((x) => !/^Ver los/.test(x.tit))) { assert.ok(r.forma, `${r.tit} has no shape`); assert.match(r.meta, /^(persona|lugar|suceso|periodo|capítulo|libro|carta|viaje|hallazgo|recorrido|parada|fecha|pregunta|mes hebreo)\b/, r.tit); }
  assert.ok(rs.some((r) => r.fecha), 'no row has a date');
  assert.match(await page.locator('#portada-estado').textContent(), /^\d+ sugerencias?$/);
  assert.equal(await page.locator('#portada-q').getAttribute('aria-expanded'), 'true');
  // The date goes once, in its pill: an event's line does not repeat it in other words («36 e.c.» and «c. 36 e.c.»).
  for (const q of ['Pedro', 'última plaga']) {
    await type(page, q);
    const sucesos = (await rows(page)).filter((r) => /^suceso/.test(r.meta));
    assert.ok(sucesos.length, `${q}: no event rows`);
    for (const r of sucesos) { assert.ok(r.fecha, `${r.tit} has no pill`); assert.doesNotMatch(r.meta, /\d/, `${r.tit}: «${r.meta}» and «${r.fecha}»`); }
  }
  await type(page, 'Jerusalén 33');
  assert.equal((await rows(page))[0].tit, 'Jerusalén en 33 e.c.');
  await type(page, 'Juan 3');
  assert.deepEqual([(await rows(page))[0].tit, (await rows(page))[0].forma], ['Juan 3', '#f-texto']);
  await type(page, '607');
  assert.equal((await rows(page))[0].tit, 'Ir a 607 a.e.c.');
  // A place with a year and no era: the year is before Christ when it only fits there, as the bare year.
  for (const q of ['Jerusalén en 607', 'Jerusalén 607']) {
    await type(page, q);
    assert.equal((await rows(page))[0].tit, 'Jerusalén en 607 a.e.c.', q);
  }
  await type(page, 'Jerusalén en 33');
  assert.equal((await rows(page))[0].tit, 'Jerusalén en 33 e.c.');
});

test('a book row shows one date, and choosing it lands on that date', async () => {
  for (const [q, fecha, anio] of [['Romanos', 'c. 56 e.c.', 56], ['éxodo', '1657 a.e.c. - 1512 a.e.c.', -1656], ['Hechos', 'c. 33-61 e.c.', 33]]) {
    const page = await openPage();
    await type(page, q);
    const r = (await rows(page))[0];
    assert.equal(r.forma, '#f-texto', q);
    assert.equal(r.fecha, fecha, `${q}: pill ${r.fecha}`);
    assert.doesNotMatch(r.meta, /e\.c\./, `${q}: the line repeats a date: ${r.meta}`);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.BE.E.sel?.tipo === 'libro');
    assert.equal(Math.floor((await state(page)).t), anio, q);
  }
});

test('the keyboard: arrows move, Escape closes the list and then clears the box, and neither enters the map', async () => {
  const page = await openPage();
  await type(page, 'Pablo');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowUp');
  assert.equal(await page.locator('#portada-lista .portada-op--activa').getAttribute('data-i'), '1');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#portada-lista').isVisible(), false);
  assert.equal(await page.locator('#portada-q').inputValue(), 'Pablo');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#portada-q').inputValue(), '');
  assert.equal((await state(page)).up, true);
  const before = await state(page);
  await type(page, 'zzzz');
  await page.keyboard.press('Enter');
  await settle(page);
  const s = await state(page);
  assert.equal(s.up, true);
  assert.equal(s.hist, before.hist);
  assert.match(await page.locator('#portada-lista').textContent(), /No encontramos «zzzz»/);
});

test('the list is a real listbox: the active option exists, no options is no listbox, and the phone counts what it shows', async () => {
  const page = await openPage();
  await type(page, 'Pablo');
  await page.keyboard.press('ArrowDown');
  const id = await page.locator('#portada-q').getAttribute('aria-activedescendant');
  assert.equal(await page.locator(`#${id}[role="option"][aria-selected="true"]`).count(), 1, id);
  await type(page, 'zzzz');
  assert.equal(await page.locator('#portada-q').getAttribute('aria-activedescendant'), null);
  assert.equal(await page.locator('#portada-q').getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('#portada-lista').getAttribute('role'), 'none');
  // Leaving the box and coming back before the blur timer ends keeps the list open.
  await type(page, 'Corin');
  await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await page.keyboard.type('t');
  await page.waitForTimeout(300);
  assert.ok(await page.locator('#portada-lista').isVisible());
  assert.equal(await page.locator('#portada-q').getAttribute('aria-expanded'), 'true');
  const phone = await openPage(PHONE);
  await type(phone, 'Corin');
  const n = await phone.locator('#portada-lista [role="option"]').count();
  assert.match(await phone.locator('#portada-estado').textContent(), new RegExp(`^${n} de \\d+ sugerencias$`));
});

test('each example chip gives what typing it and pressing Enter gives', async () => {
  for (const [p, text] of [['ej-pedro', 'Pedro'], ['ej-hechos-16', 'Hechos 16'], ['ej-607', '607 a.e.c.']]) {
    const a = await openPage();
    await a.locator(`[data-p="${p}"]`).click();
    await settle(a);
    const b = await openPage();
    await type(b, text);
    await b.keyboard.press('Enter');
    await settle(b);
    const [sa, sb] = [await state(a), await state(b)];
    assert.equal(sa.up, false, p);
    assert.equal(sa.sel, sb.sel, `${p}: ${sa.sel} vs ${sb.sel}`);
    assert.equal(Math.floor(sa.t), Math.floor(sb.t), p);
  }
});

test('every kind of control lands where it says, adds one entry, and one Back returns with the focus on it', async () => {
  const cases = [
    ['abrir', (s) => s.sel === null && Math.floor(s.t) === 50],
    ['ej-pedro', (s) => s.sel === 'persona:pedro'],
    ['tarjeta-1', (s) => s.sel === 'lugar:jerusalen' && Math.floor(s.t) === -519],
    ['tarjeta-2', (s) => /conexion=persona:loida~persona:pablo/.test(s.hash)],
    ['tarjeta-3', (s) => /leer=hch-16/.test(s.hash)],
    ['mas-2', (s) => s.sel === 'carta:1-tesalonicenses' && /cartas=todas/.test(s.hash)],
    ['era-destierro-y-regreso', (s) => s.sel === 'periodo:destierro-y-regreso' && Math.floor(s.t) === -606],
    ['linea-completa', (s) => /v=4125/.test(s.hash)],
    ['rec-pedro', (s) => s.sel === 'recorrido:pedro' && /paso=1/.test(s.hash)],
  ];
  for (const [p, ok] of cases) {
    const page = await openPage();
    if (p.startsWith('mas-')) await page.locator('.portada-mas summary').click();
    await page.evaluate(() => { document.querySelector('#portada-q').value = 'texto'; });   // typed earlier, list closed
    const before = await state(page);
    await page.locator(`[data-p="${p}"]`).click();
    await settle(page);
    const s = await state(page);
    assert.equal(s.up, false, p);
    assert.ok(ok(s), `${p} landed on ${JSON.stringify(s)}`);
    assert.equal(s.hist, before.hist + 1, `${p} added ${s.hist - before.hist} entries`);
    await page.goBack();
    await settle(page);
    const b = await state(page);
    assert.equal(b.up, true, `${p}: one Back did not return to the landing`);
    assert.equal(b.focus, p, `${p}: focus on ${b.focus}`);
    assert.equal(b.q, 'texto', p);
    assert.equal(b.inert, before.inert, p);
    if (p === 'rec-pedro') assert.match(await (await openPage(DESKTOP, { hash: 'sel=recorrido:pedro&paso=1' })).locator('body').innerText(), /[Pp]arada 1 de \d+/);
    assert.deepEqual(page.pageErrors, [], p);
  }
});

test('a search row enters with one entry; Back gives the box back with its text, and the phone gives its button', async () => {
  for (const screen of [DESKTOP, PHONE]) {
    const page = await openPage(screen);
    await type(page, 'Corin');
    const before = await state(page);
    await page.keyboard.press('Enter');
    await settle(page);
    const s = await state(page);
    assert.equal(s.sel, 'lugar:corinto');
    assert.equal(s.hist, before.hist + 1);
    await page.goBack();
    await settle(page);
    const b = await state(page);
    assert.equal(b.up, true);
    assert.equal(b.q, 'Corin');
    assert.equal(b.focus, screen === PHONE ? 'ir' : 'portada-q');
  }
});

test('clicking or tapping any row enters that row, not the first', async () => {
  for (const screen of [DESKTOP, PHONE]) {
    const page = await openPage(screen);
    await type(page, 'Corin');
    const r = (await rows(page))[1];
    const row = page.locator('#portada-lista [data-i="1"]');
    if (screen === PHONE) await row.tap(); else await row.click();
    await settle(page);
    const s = await state(page);
    assert.equal(s.up, false);
    assert.equal(await page.evaluate(() => window.BE.nombreSel(window.BE.E.sel)), r.tit, `${screen === PHONE ? 'tap' : 'click'} on row 2`);
  }
});

test('on a slow device one press still adds one entry, and one Back returns', async () => {
  // Every frame 1 s late: the first frame of the destination comes long after the press, as with the map loading.
  const cases = [
    ['ej-pedro', (s) => s.sel === 'persona:pedro'],
    ['tarjeta-1', (s) => s.sel === 'lugar:jerusalen'],
    ['tarjeta-2', (s) => /conexion=persona:loida~persona:pablo/.test(s.hash)],
    ['era-destierro-y-regreso', (s) => s.sel === 'periodo:destierro-y-regreso'],
    ['rec-pedro', (s) => s.sel === 'recorrido:pedro' && /paso=1/.test(s.hash)],
    ['q:Pedro', (s) => s.sel === 'persona:pedro'],
  ];
  for (const [p, ok] of cases) {
    const page = await openPage(PHONE);
    const before = await state(page);
    await page.evaluate(() => { window.__lento = 1000; });
    if (p.startsWith('q:')) { await type(page, p.slice(2)); await page.keyboard.press('Enter'); }
    else await page.locator(`[data-p="${p}"]`).tap();
    await settle(page);
    const s = await state(page);
    assert.ok(ok(s), `${p} landed on ${JSON.stringify(s)}`);
    assert.equal(s.hist, before.hist + 1, `${p} added ${s.hist - before.hist} entries`);
    await page.goBack();
    await settle(page);
    assert.equal((await state(page)).up, true, `${p}: one Back did not return to the landing`);
    assert.deepEqual(page.pageErrors, [], p);
  }
  // The logo from a view with a selection: one entry, and one Back gives the selection again.
  const page = await openPage(DESKTOP, { hash: 'sel=persona:pablo&t=34.5000' });
  const before = await state(page);
  await page.evaluate(() => { window.__lento = 1000; });
  await page.locator('#inicio').click();
  await settle(page);
  assert.equal((await state(page)).up, true);
  assert.equal((await state(page)).hist, before.hist + 1, 'the logo added more than one entry');
  await page.goBack();
  await settle(page);
  const b = await state(page);
  assert.deepEqual([b.up, b.sel], [false, 'persona:pablo']);
});

test('Back before the data: the landing comes back without «Abriendo el mapa…», and nothing throws', async () => {
  let release;
  const gate = new Promise((ok) => { release = ok; });
  const page = await openPage(DESKTOP, { wait: false, route: async (r) => { await gate; await r.continue(); } });
  await page.locator('[data-p="ej-pedro"]').click();
  assert.match(await page.locator('#portada-aviso').textContent(), /Abriendo el mapa/);
  await page.goBack();
  await page.waitForFunction(() => /portada=1/.test(location.hash));
  await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
  assert.deepEqual(page.pageErrors, [], 'Back before the data applied an address with no data');
  assert.equal(await page.locator('#portada-aviso').textContent(), '');
  assert.equal(await page.locator('[aria-busy="true"]').count(), 0);
  release();
  await page.waitForFunction(() => window.BE?.D && window.__be, null, { timeout: 30000 });
  await settle(page);
  const s = await state(page);
  assert.deepEqual([s.up, s.sel], [true, null]);
  assert.equal(await page.locator('#portada-aviso').textContent(), '');
  assert.deepEqual(page.pageErrors, []);
});

test('«Seguir donde lo dejaste» holds the last view, applies it exactly, and «Olvidar» forgets it', async () => {
  const page = await openPage(DESKTOP, { hash: 'sel=lugar:corinto&t=50.5000' });
  await page.evaluate(() => { window.BE.seleccionar({ tipo: 'persona', id: 'pablo' }, { mover: false, encuadrar: false }); });
  await page.waitForFunction(() => /sel=persona:pablo/.test(localStorage.getItem('biblical-earth:ultima') || ''));
  const guardado = JSON.parse(await page.evaluate(() => localStorage.getItem('biblical-earth:ultima')));
  assert.match(guardado.hash, /sel=persona:pablo/);
  assert.match(guardado.texto, /Pablo/);
  const back = await page.context().newPage();
  await back.route((url) => !url.href.startsWith(base), (r) => r.abort());
  await back.goto(`${base}index.html`);
  await back.waitForFunction(() => window.BE?.D && window.__be, null, { timeout: 30000 });
  const seguir = back.locator('[data-p="seguir"]');
  assert.ok(await seguir.isVisible());
  assert.match(await seguir.textContent(), /Seguir donde lo dejaste/);
  await seguir.click();
  await settle(back);
  assert.equal(`#${decodeURIComponent(await back.evaluate(() => window.BE.textoHash()))}`.includes('sel=persona:pablo'), true);
  assert.equal((await state(back)).sel, 'persona:pablo');
  await back.goBack();
  await settle(back);
  await back.locator('[data-p="olvidar"]').click();
  assert.equal(await back.evaluate(() => localStorage.getItem('biblical-earth:ultima')), null);
  assert.equal(await back.locator('#portada-seguir').isVisible(), false);
});

test('«Aa» and the moon share their keys with the site, both ways', async () => {
  const page = await openPage();
  await page.locator('#portada-letra').click();
  await page.locator('#portada-reunion').click();
  const k = await page.evaluate(() => [localStorage.getItem('biblical-earth:pref:letra-grande'), localStorage.getItem('biblical-earth:pref:reunion'), document.documentElement.className]);
  assert.deepEqual(k.slice(0, 2), ['1', '1']);
  assert.match(k[2], /be-letra-grande/); assert.match(k[2], /be-reunion/);
  assert.equal(await page.locator('#portada-letra').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#reunion-boton').getAttribute('aria-pressed'), 'true');
  await page.locator('[data-p="abrir"]').click();
  await settle(page);
  await page.locator('#reunion-boton').click();
  await page.goBack();
  await settle(page);
  assert.equal(await page.locator('#portada-reunion').getAttribute('aria-pressed'), 'false');
  // The first frame of the next visit already has them.
  const next = await openPage(DESKTOP, { storage: { 'biblical-earth:pref:letra-grande': '1' }, wait: false });
  assert.match(await next.evaluate(() => document.documentElement.className), /be-letra-grande/);
});

test('before the data: a year answers, a name waits and fills, and an early press waits on the landing', async () => {
  let release;
  const gate = new Promise((ok) => { release = ok; });
  const page = await openPage(PHONE, { wait: false, route: async (r) => { await gate; await r.continue(); } });
  await page.locator('#portada-q').waitFor();
  assert.equal((await state(page)).up, true);
  await type(page, '607');
  assert.equal((await rows(page))[0]?.tit, 'Ir a 607 a.e.c.');
  await type(page, 'Pedr');
  assert.match(await page.locator('#portada-lista').textContent(), /Cargando los nombres/);
  await page.locator('#portada-q').fill('');
  await page.locator('[data-p="ej-pedro"]').tap();
  assert.match(await page.locator('#portada-aviso').textContent(), /Abriendo el mapa/);
  assert.equal((await state(page)).up, true);
  release();
  await page.waitForFunction(() => window.BE?.D && !document.documentElement.classList.contains('be-con-portada'), null, { timeout: 30000 });
  const s = await state(page);
  assert.equal(s.sel, 'persona:pedro');
  await page.goBack();
  await settle(page);
  assert.equal((await state(page)).up, true);
  assert.deepEqual(page.pageErrors, []);
});

test('a name typed before the data fills in when the data arrives, without typing again', async () => {
  let release;
  const gate = new Promise((ok) => { release = ok; });
  const page = await openPage(DESKTOP, { wait: false, route: async (r) => { await gate; await r.continue(); } });
  await page.locator('#portada-q').waitFor();
  await type(page, 'Pedr');
  assert.match(await page.locator('#portada-lista').textContent(), /Cargando los nombres/);
  release();
  await page.waitForFunction(() => window.BE?.D, null, { timeout: 30000 });
  await page.waitForTimeout(300);
  assert.ok((await rows(page)).some((r) => r.tit === 'Pedro'), JSON.stringify(await rows(page)));
});

test('without the data the landing stays, says so and offers to try again', async () => {
  const page = await openPage(DESKTOP, { wait: false, route: (r) => r.abort() });
  const retry = page.locator('#portada-aviso [data-p="reintentar"]');
  await retry.waitFor({ timeout: 15000 });
  assert.match(await page.locator('#portada-aviso').textContent(), /No se ha podido abrir el mapa\./);
  assert.ok((await retry.boundingBox()).height >= 44);
  assert.equal((await state(page)).up, true);
  await page.locator('[data-p="ej-pedro"]').click();
  assert.equal((await state(page)).up, true);
});
