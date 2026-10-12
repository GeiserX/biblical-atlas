// Deep links by passage (#p=Hch16:1, site/js/passage-link.js), tested in a real headless browser: a passage cited by
// one record opens that record's card at its date; cited by several, it opens the first (events first, those whose
// principal passage cites it before the rest, then by date) and the card lists the others to switch to; cited by none,
// its chapter card opens with a line that says so; a book alone opens the book card; what does not read as one passage
// gets a notice and selects nothing; a range and a book written with an accent read like their abbreviation; Back after
// a passage link goes back to the view before it and Forward returns to the passage with its list, and with nothing
// selected the notice has its own entry named by the passage; «Enlace al pasaje» copies the link. The rules without a
// browser are in enlaces-pasaje-reglas.test.mjs.
//
// Run from the root of the repository, one browser at a time:
//   node --test --test-concurrency=1 tests/site/enlaces-pasaje.test.mjs
// Needs playwright-core with a Chromium (importable, or PLAYWRIGHT_CORE=<path to playwright-core>). It uses
// site/data.json when it exists, BE_DATA_FILE=<data.json> when given, or builds the data into a temporary directory
// with python3 scripts/build.py. BE_SITE_DIR=<dir> tests another copy of the site (a checkout of main is the control,
// and fails: it has no passage links). Hosts other than the local server are blocked, so the map itself does not load.
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

let browser, server, base, tmp, dataFile;
before(async () => {
  let data = process.env.BE_DATA_FILE ? path.resolve(process.env.BE_DATA_FILE) : path.join(SITE_DIR, 'data.json');
  if (!fs.existsSync(data)) {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-enlaces-pasaje-'));
    execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--salida', tmp], { cwd: ROOT, stdio: 'pipe' });
    data = path.join(tmp, 'data.json');
  }
  dataFile = data;
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
  if (route) await page.route(/\/data(\.core|\.detail)?\.json/, route);   // data.json, or its two chunks
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



const view = (page) => page.evaluate(() => {
  const BE = window.BE, box = document.querySelector('#panel-cuerpo .pasaje-enlace');
  return {
    hash: decodeURIComponent(location.hash), sel: BE.E.sel ? BE.selTexto(BE.E.sel) : null, t: BE.E.t,
    title: document.querySelector('#panel-cuerpo .be-card__title')?.textContent.trim() || null,
    box: box ? { text: box.innerText, status: box.getAttribute('role'), rows: [...box.querySelectorAll('[data-sel]')].map((b) => b.dataset.sel),
      current: box.querySelector('[aria-current="true"] .be-row__title')?.textContent || null } : null,
    places: BE.E.resaltado ? [...BE.E.resaltado.lugares] : [],
  };
});
/** Does the principal passage of a record (the first of an event's `pasajes`, the first part of a `referencia`) cite
    the passage? Read from the data here, not from passage-link.js, so a broken rule there shows. */
const principal = (page, p, sels) => page.evaluate(([p, sels]) => {
  const BE = window.BE, D = BE.D, P = BE.pasajeEnlace, r = P.parsePassage(p).stretch;
  return sels.map((sel) => {
    const [k, id] = [sel.slice(0, sel.indexOf(':')), sel.slice(sel.indexOf(':') + 1)];
    let first = null;
    if (k === 'evento') first = D.eventos.find((e) => e.id === id).pasajes[0];
    else if (k === 'parada') { const [v, o] = id.split('/'); first = D.viajes.find((x) => x.id === v).paradas.find((x) => String(x.orden) === o).referencia; }
    else first = (k === 'carta' ? D.cartas : D.viajes).find((x) => x.id === id).referencia;
    return P.parseRefs(String(first).split(';')[0]).some((s) => P.overlaps(s, r));
  });
}, [p, sels]);
/** The records that cite a passage, as the page finds them, and the date the timeline gives the first one. */
const found = (page, p) => page.evaluate((p) => {
  const r = window.BE.pasajeEnlace.resolve(p);
  return { list: r.found || null, t0: r.found?.length ? window.BE.momentoDe(window.BE.parseSel(r.found[0])) : null };
}, p);

test('a passage cited by one record opens its card at its date, with its places', async () => {
  const page = await openPage(DESKTOP, { hash: 'p=Ge12:1' });
  const v = await view(page);
  assert.equal(v.sel, 'evento:pacto-con-abrahan');
  const f = await found(page, 'Ge12:1');
  assert.deepEqual(f.list, ['evento:pacto-con-abrahan']);
  assert.ok(Math.abs(v.t - f.t0) < 1e-6, `the cursor is at ${v.t}, the event at ${f.t0}`);
  assert.ok(v.places.length > 0, 'nothing to frame');
  assert.match(v.box.text, /Génesis 12:1/);
  assert.match(v.box.text, /Lo cita esta ficha/);
  assert.match(v.hash, /[#&]p=Ge12:1(&|$)/, 'the address dropped the passage');
  assert.match(v.hash, /sel=evento:pacto-con-abrahan/);
  assert.deepEqual(page.pageErrors, []);
});

test('a passage cited by several opens the first by date and lists the others to switch to', async () => {
  const page = await openPage(DESKTOP, { hash: 'p=2Re17:6' });
  const f = await found(page, '2Re17:6');
  assert.ok(f.list.length >= 3, `only ${f.list.length} records cite 2 Reyes 17:6`);
  const v = await view(page);
  assert.equal(v.sel, f.list[0]);
  // Events first, each group by its date.
  const when = await page.evaluate((l) => l.map((s) => [s.split(':')[0], window.BE.momentoDe(window.BE.parseSel(s))]), f.list);
  const events = when.filter(([k]) => k === 'evento').map(([, t]) => t);
  assert.ok(when.findIndex(([k]) => k !== 'evento') >= events.length, 'an event comes after another kind');
  assert.deepEqual(events, [...events].sort((a, b) => a - b), 'the events are not by date');
  assert.equal(v.box.rows.length, f.list.length - 1, 'the list does not offer every other record');
  assert.ok(v.box.current, 'the open record is not marked in the list');
  // Switching to another keeps the list, with the new one marked and the passage in the address.
  await page.locator(`#panel-cuerpo .pasaje-enlace [data-sel="${f.list[1]}"]`).click();
  await settle(page);
  const w = await view(page);
  assert.equal(w.sel, f.list[1]);
  assert.ok(w.box, 'the list went away after switching');
  assert.ok(w.box.rows.includes(f.list[0]));
  assert.match(w.hash, /[#&]p=2Re17:6(&|$)/);
  // Something else from the search ends the passage: no list, no «p».
  await page.locator('#q').fill('Pablo');
  await page.waitForFunction(() => !document.querySelector('#resultados').hidden);
  await page.keyboard.press('Enter');
  await settle(page);
  const x = await view(page);
  assert.equal(x.box, null);
  assert.doesNotMatch(x.hash, /[#&]p=/);
  assert.deepEqual(page.pageErrors, []);
});

test('a passage cited by none opens its chapter card, with a line inside that nothing cites it', async () => {
  // The chapter card paints itself again when its list of videos arrives (tipos/pasaje.js): held back here until the card
  // is up, so the test sees the line survive that repaint.
  const page = await openPage(DESKTOP, { hash: 'p=Snt1:5', init: () => {
    const f = window.fetch.bind(window);
    window.__videos = new Promise((ok) => { window.__soltarVideos = ok; });
    window.fetch = (u, o) => (String(u).includes('videos-pasajes.json') ? window.__videos.then(() => f(u, o)) : f(u, o));
  } });
  assert.deepEqual((await found(page, 'Snt1:5')).list, []);
  await page.evaluate(() => { document.querySelector('#panel-cuerpo > .be-card').dataset.antes = '1'; window.__soltarVideos(); });
  await page.waitForFunction(() => !document.querySelector('#panel-cuerpo [data-antes]'), null, { timeout: 15000 });
  await settle(page);
  assert.ok(await page.evaluate(() => !!document.querySelector('#panel-cuerpo .acciones-estudio')), 'the card lost its «Citar» row when it painted again');
  const v = await view(page);
  assert.equal(v.sel, 'pasaje:snt-1');
  assert.equal(v.title, 'Santiago 1');
  assert.equal(v.box?.status, 'status');
  assert.match(v.box.text, /^Ningún suceso, parada, carta ni viaje del atlas cita todavía Santiago 1:5\.$/);
  const where = await page.evaluate(() => {
    const line = document.querySelector('#panel-cuerpo .pasaje-enlace');
    return { inCard: line.closest('#panel-cuerpo > .be-card')?.querySelector('.be-card__title')?.textContent.trim() || null,
      cards: document.querySelectorAll('#panel-cuerpo .pasaje-enlace').length, href: line.querySelector('a')?.href || '' };
  });
  assert.equal(where.inCard, 'Santiago 1', 'the line is not inside the chapter card');
  assert.equal(where.cards, 1);
  assert.match(where.href, /jw\.org\/.*santiago\/1\/#v59001005$/i, 'the line does not link the verse on jw.org');
  assert.match(v.hash, /[#&]p=Snt1:5(&|$)/);
  assert.match(v.hash, /sel=pasaje:snt-1/);
  // The address it writes opens the same, line included.
  const again = await view(await openPage(DESKTOP, { hash: v.hash.slice(1) }));
  assert.equal(again.sel, 'pasaje:snt-1');
  assert.match(again.box?.text || '', /cita todavía Santiago 1:5/);
  // A range across chapters that nothing cites opens its first chapter, not its last.
  assert.deepEqual((await found(page, 'Snt1:5-2:3')).list, [], 'something cites Santiago 1:5-2:3 now, so this is no test');
  const across = await view(await openPage(DESKTOP, { hash: 'p=Snt1:5-2:3' }));
  assert.equal(across.sel, 'pasaje:snt-1', 'a range across chapters did not open its first chapter');
  assert.match(across.box?.text || '', /^Ningún suceso, parada, carta ni viaje del atlas cita todavía Santiago 1:5-2:3\.$/);
  // Choosing something else from the chapter card (its book) ends the passage.
  await page.locator('#panel-cuerpo .be-card__eyebrow [data-sel="libro:santiago"]').click();
  await settle(page);
  const x = await view(page);
  assert.equal(x.sel, 'libro:santiago');
  assert.equal(x.box, null);
  assert.doesNotMatch(x.hash, /[#&]p=/);
  assert.deepEqual(page.pageErrors, []);
});

test('what does not read as one passage keeps its notice, selects nothing and closes with Escape', async () => {
  // A book that does not exist.
  const bad = await openPage(DESKTOP, { hash: 'p=Xyz3:4' });
  const b = await view(bad);
  assert.equal(b.sel, null);
  assert.equal(b.box?.status, 'status');
  assert.match(b.box.text, /No reconozco «Xyz3:4»/);
  // The rest of the panel stays: what it shows with nothing selected (where Pablo is, or «Ahora mismo») is under the notice.
  const below = await bad.evaluate(() => { const b = document.querySelector('#panel-cuerpo'); return { first: b.firstElementChild?.classList.contains('pasaje-enlace'), more: b.querySelectorAll(':scope > .be-card:not(.pasaje-enlace)').length }; });
  assert.ok(below.first, 'the notice is not at the top of the panel');
  assert.ok(below.more > 0, 'the panel lost what it shows with nothing selected');
  await bad.keyboard.press('Escape');
  await settle(bad);
  assert.equal((await view(bad)).box, null);
  const late = await openPage(DESKTOP, { hash: 'p=Hch29:1' });
  assert.match((await view(late)).box.text, /Hechos no tiene ese capítulo o ese versículo/);
  // Two stretches apart say so, not that the verse is missing; two that touch are one, written back as a range.
  const apart = await openPage(DESKTOP, { hash: 'p=Hch16:1,5' });
  const ap = await view(apart);
  assert.equal(ap.sel, null);
  assert.match(ap.box.text, /junta tramos separados/);
  const joined = await openPage(DESKTOP, { hash: 'p=Hch16:1,2' });
  assert.match((await view(joined)).hash, /[#&]p=Hch16:1-2(&|$)/);
  assert.deepEqual([...bad.pageErrors, ...late.pageErrors, ...apart.pageErrors, ...joined.pageErrors], []);
});

test('a book alone opens the book card, and the address writes it by its abbreviation', async () => {
  for (const [h, sel, title, back] of [['p=Rut', 'libro:rut', 'Rut', 'Rut'], ['p=G%C3%A9nesis', 'libro:genesis', 'Génesis', 'Ge']]) {
    const page = await openPage(DESKTOP, { hash: h });
    const v = await view(page);
    assert.equal(v.sel, sel, h);
    assert.equal(v.title, title, h);
    assert.equal(v.box, null, `${h} still shows a notice`);
    assert.match(v.hash, new RegExp(`[#&]p=${back}(&|$)`), `${h} is not written back as p=${back}`);
    // A book is not a passage: its card has no «Enlace al pasaje», reached by the link or not.
    assert.equal(await page.locator('#panel-cuerpo [data-enlace-pasaje]').count(), 0, `${h}: the book card offers a passage link`);
    assert.deepEqual(page.pageErrors, []);
  }
  const plain = await openPage(DESKTOP, { hash: 'sel=libro:rut' });
  assert.equal((await view(plain)).sel, 'libro:rut');
  assert.ok(await plain.locator('#panel-cuerpo .acciones-estudio').count(), 'the book card has no «Citar» row, so this is no test');
  assert.equal(await plain.locator('#panel-cuerpo [data-enlace-pasaje]').count(), 0, 'the book card offers a passage link');
});

test('the links of the examples open their cards', async () => {
  const cases = [
    ['p=Hch13:1-14:28', 'evento:apartados-para-la-mision', 'Hch13:1-14:28'],
    ['p=2Ti4:10', 'evento:segundo-encierro-en-roma', '2Ti4:10'],
    ['p=Ge2:7,8', 'evento:creacion-de-adan', 'Ge2:7-8'],
    ['p=Rut', 'libro:rut', 'Rut'],
  ];
  for (const [h, sel, back] of cases) {
    for (const screen of [DESKTOP, PHONE]) {
      const page = await openPage(screen, { hash: h });
      const v = await view(page);
      assert.equal(v.sel, sel, `${h} at ${screen.viewport.width}`);
      assert.ok(v.title, `${h}: no card title`);
      assert.match(v.hash, new RegExp(`[#&]p=${back.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(&|$)`), h);
      assert.deepEqual(page.pageErrors, []);
    }
  }
});

test('the records whose principal passage cites it come first; a sermon that recalls the past does not open', async () => {
  // Hch 13:17-22 recalls the exodus, the conquest and the kings: «Nace Isaac» (1918 a.e.c.) cites Hch 13:17-20 in its
  // second passage, and by date alone it would open the first journey's range.
  const page = await openPage(DESKTOP, { hash: 'p=Hch13:1-14:28' });
  const v = await view(page);
  assert.equal(v.sel, 'evento:apartados-para-la-mision');
  const { list } = await found(page, 'Hch13:1-14:28');
  const events = list.filter((s) => s.startsWith('evento:'));
  assert.ok(events.includes('evento:nacimiento-de-isaac'), '«Nace Isaac» no longer cites Hch 13, so this is no test');
  const side = await principal(page, 'Hch13:1-14:28', events);
  const cut = side.indexOf(false);
  assert.ok(cut > 0 && side.slice(cut).every((x) => !x), `the events that cite it further down are mixed in: ${side.map(Number).join('')}`);
  // Inside each side, by date: the earliest of the sermon's recollections comes first among them.
  const when = await page.evaluate((l) => l.map((s) => window.BE.momentoDe(window.BE.parseSel(s))), events);
  for (const part of [when.slice(0, cut), when.slice(cut)]) assert.deepEqual(part, [...part].sort((a, b) => a - b), 'a side is not by date');
  assert.ok(when[cut] < when[0], 'the events further down are not earlier, so this is no test of the principal passage');
  // Stops come after events, as on the server, even when the event cites it further down and the stop first.
  const p2 = await openPage(DESKTOP, { hash: 'p=2Ti4:10' });
  const w = await view(p2);
  assert.equal(w.sel, 'evento:segundo-encierro-en-roma');
  assert.deepEqual(await principal(p2, '2Ti4:10', [w.sel]), [false], '2 Ti 4:10 is now the principal passage of the event, so this is no test');
  assert.ok(w.box.rows.some((s) => s.startsWith('parada:')), 'no stop cites 2 Ti 4:10');
  assert.deepEqual([...page.pageErrors, ...p2.pageErrors], []);
});

test('the order does not lean on the order of the data', async () => {
  // The events, letters and journeys of data.json come out of build.py already by date, which would hide a missing sort:
  // here they arrive reversed, and every group must still come out principal first, then by date.
  const D = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  for (const k of ['eventos', 'cartas', 'viajes']) D[k].reverse();
  const body = JSON.stringify(D);
  // The whole data goes as the core, and the detail adds nothing: its lists, by position, would not match reversed ones.
  const route = (r) => r.fulfill({ contentType: 'application/json', body: r.request().url().includes('/data.detail.json') ? '{}' : body });
  const page = await openPage(DESKTOP, { hash: 'p=2Ti4:10', route });
  for (const p of ['2Ti4:10', 'Hch13:1-14:28', '2Re17:6']) {
    const list = await page.evaluate((p) => window.BE.pasajeEnlace.resolve(p).found, p);
    const side = await principal(page, p, list);
    const groups = await page.evaluate(([list, side]) => {
      const BE = window.BE, out = {};
      // Principal first: its moments as they are; the others after every principal one.
      list.forEach((s, i) => (out[s.split(':')[0]] ||= []).push([side[i] ? 0 : 1, BE.momentoDe(BE.parseSel(s)) ?? 1e9]));
      return out;
    }, [list, side]);
    const order = Object.keys(groups);
    assert.deepEqual(order, ['evento', 'parada', 'carta', 'viaje'].filter((k) => order.includes(k)), `${p}: the groups are out of order`);
    assert.ok(Object.values(groups).some((ts) => ts.length > 1), `${p} is no test of the order`);
    const cmp = (a, b) => a[0] - b[0] || a[1] - b[1];
    for (const [k, ts] of Object.entries(groups)) assert.deepEqual(ts, [...ts].sort(cmp), `${p}: the ${k} group is not principal first, then by date`);
  }
  assert.equal((await view(page)).sel, 'evento:segundo-encierro-en-roma');
  assert.deepEqual(page.pageErrors, []);
});

test('a range opens what cites any verse of it', async () => {
  const page = await openPage(DESKTOP, { hash: 'p=Hch16:1-5' });
  const f = await found(page, 'Hch16:1-5');
  const one = await found(page, 'Hch16:1');
  assert.ok(f.list.length > one.list.length, 'the range finds no more than its first verse');
  assert.ok(f.list.includes('evento:pablo-entrega-las-decisiones-de-jerusalen'), 'Hch 16:4 is not in the range');
  const v = await view(page);
  assert.equal(v.sel, f.list[0]);
  assert.match(v.box.text, /Hechos 16:1-5/);
  assert.equal(v.box.rows.length, f.list.length - 1);
  assert.deepEqual(page.pageErrors, []);
});

test('a book written with its accent, its full name or spaces opens the same as its abbreviation', async () => {
  const a = await view(await openPage(DESKTOP, { hash: 'p=Ge12:1' }));
  for (const h of ['p=Génesis12:1', 'p=G%C3%A9nesis%2012:1', 'p=g%C3%A9+12:1', 'p=genesis12:1']) {
    const page = await openPage(DESKTOP, { hash: h });
    const v = await view(page);
    assert.equal(v.sel, a.sel, h);
    assert.match(v.hash, /[#&]p=Ge12:1(&|$)/, `${h} is not written back as Ge12:1`);
    assert.deepEqual(page.pageErrors, []);
  }
});

test('Back after a passage link returns to the view before it; Forward brings the passage and its list back', async () => {
  const page = await openPage(DESKTOP, { hash: 't=50.3000&sel=lugar:filipos' });
  const before = await view(page);
  assert.equal(before.sel, 'lugar:filipos');
  // What a «#p=» link or a typed address does.
  await page.evaluate(() => { location.hash = 'p=2Re17:6'; });
  await settle(page);
  const at = await view(page);
  assert.equal(at.sel, (await found(page, '2Re17:6')).list[0]);
  assert.ok(at.box);
  const back = await page.evaluate(() => document.getElementById('atras').getAttribute('aria-label'));
  assert.equal(back, 'Atrás: Filipos');
  await page.locator('#atras').click();
  await settle(page);
  const b = await view(page);
  assert.equal(b.sel, 'lugar:filipos');
  assert.equal(b.box, null, 'the passage list stayed on the view before it');
  assert.doesNotMatch(b.hash, /[#&]p=/);
  await page.goForward();
  await settle(page);
  const c = await view(page);
  assert.equal(c.sel, at.sel);
  assert.ok(c.box, 'Forward lost the passage list');
  assert.match(c.hash, /[#&]p=2Re17:6(&|$)/);
  assert.deepEqual(page.pageErrors, []);
});

test('a passage link with nothing selected is its own entry, named by the passage, and Back closes its notice', async () => {
  const page = await openPage(DESKTOP, { hash: 't=50.3000' });
  const before = await page.evaluate(() => document.title);
  await page.evaluate(() => { location.hash = 'p=Hch16:1,5'; });
  await settle(page);
  assert.ok((await view(page)).box, 'no notice');
  assert.equal(await page.evaluate(() => document.title), 'Enlace a Hch16:1,5 · biblical-atlas');
  assert.equal(await page.evaluate(() => document.getElementById('atras').getAttribute('aria-label')), `Atrás: ${before.replace(' · biblical-atlas', '')}`);
  await page.locator('#atras').click();
  await settle(page);
  const b = await view(page);
  assert.equal(b.box, null, 'the notice stayed on the view before it');
  assert.doesNotMatch(b.hash, /[#&]p=/);
  await page.goForward();
  await settle(page);
  assert.ok((await view(page)).box, 'Forward lost the notice');
  assert.equal(await page.evaluate(() => document.title), 'Enlace a Hch16:1,5 · biblical-atlas');
  // Closing the notice is another view, as closing «Ahora mismo» is: Back brings the notice back.
  await page.locator('#panel-cuerpo [data-pasaje-cerrar]').click();
  await settle(page);
  assert.equal((await view(page)).box, null);
  assert.equal(await page.evaluate(() => document.getElementById('atras').getAttribute('aria-label')), 'Atrás: Enlace a Hch16:1,5');
  await page.locator('#atras').click();
  await settle(page);
  assert.ok((await view(page)).box, 'Back after closing did not bring the notice back');
  assert.deepEqual(page.pageErrors, []);
});

test('«Enlace al pasaje» copies the link that opens the passage; for another match it carries the selection', async () => {
  const page = await openPage(DESKTOP, { hash: 'p=2Re17:6', init: () => {
    window.__copied = [];
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__copied.push(t); } } });
  } });
  await page.locator('#panel-cuerpo [data-enlace-pasaje]').click();
  await page.waitForFunction(() => window.__copied.length === 1);
  const origin = await page.evaluate(() => `${location.origin}${location.pathname}`);
  assert.equal(await page.evaluate(() => window.__copied[0]), `${origin}#p=2Re17:6`);
  const f = await found(page, '2Re17:6');
  await page.locator(`#panel-cuerpo .pasaje-enlace [data-sel="${f.list[1]}"]`).click();
  await settle(page);
  await page.locator('#panel-cuerpo [data-enlace-pasaje]').click();
  await page.waitForFunction(() => window.__copied.length === 2);
  assert.equal(await page.evaluate(() => window.__copied[1]), `${origin}#p=2Re17:6&sel=${f.list[1]}`);
  // That link opens the second one, with the list.
  const opened = await openPage(DESKTOP, { hash: `p=2Re17:6&sel=${f.list[1]}` });
  const v = await view(opened);
  assert.equal(v.sel, f.list[1]);
  assert.ok(v.box);
  // «Citar» carries the passage link too.
  await page.locator('#panel-cuerpo [data-citar]').click();
  await page.waitForFunction(() => window.__copied.length === 3);
  assert.match(await page.evaluate(() => window.__copied[2]), /Pasaje en biblical-atlas: .*#p=2Re17:6&sel=/);
  assert.deepEqual([...page.pageErrors, ...opened.pageErrors], []);
});
