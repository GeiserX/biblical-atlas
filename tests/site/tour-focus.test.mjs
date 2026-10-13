// What the map names and frames while following a route (docs/ideas/rotulos-movil.md), in a real headless browser with
// MapLibre loaded:
//
// - On every stop of every guided tour, and on every stop of Pablo's four journeys, the stop and the stops before and
//   after it go before every other label: at low zoom on the phone the names of a whole route collide, and those three
//   win over the rest, the other stops' numbers and the travellers' names included. A name of the route that is still
//   hidden touches only labels of the route (another of the three names, their numbers, Pablo's label) and does not
//   fit at the left of its point either; there, a name outside the route gives way to it.
// - Leaving the tour gives the names back: the map names what it named before the tour, at the same date and frame.
// - The first framing of a tour leaves out a place whose location is unknown (its candidates) unless it belongs to the
//   first stop: «La última semana» opens on Jerusalén, without the three candidates of Emaús to the west, and frames
//   them when it reaches their stop. Every other stop of every tour stays in view on opening.
//
// Run from the repository root, one browser at a time:
//   node --test --test-concurrency=1 tests/site/tour-focus.test.mjs
// Needs network access for MapLibre (unpkg.com) and playwright-core with a Chromium: either importable, or
// PLAYWRIGHT_MODULE_DIR=<a node_modules directory that holds it>. CHROME_PATH picks another Chromium binary. It uses
// site/data.json when it exists, BE_DATA_FILE=<data.json> when given, or builds the data into a temporary directory.
// BE_ROOT=<a checkout> tests that checkout's site (the control: on main before this change the tours, the journeys and
// «La última semana» fail). It prints how many stops in focus are named.
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
const JOURNEYS = ['primer-viaje', 'segundo-viaje', 'tercer-viaje', 'viaje-a-roma'];

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
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-tour-focus-'));
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

async function open(screen, hash = 't=50.3000') {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...screen });
  context.setDefaultTimeout(30000);
  const page = await context.newPage();
  page.pageErrors = [];
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  await page.route((u) => !u.href.startsWith(base) && !u.hostname.endsWith('unpkg.com'), (r) => r.abort());
  // With an address the landing does not open (portada.js): the map is in view, as after a search.
  await page.goto(`${base}index.html#${hash}`, { waitUntil: 'domcontentloaded' });
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

/** The stops in focus now (on a tour, the stop and the ones before and after it; on a journey of Pablo, the stop where
    he is and the nearest ones before and after it in another place) whose point is in view and free of every card,
    control and sheet; those of them named; and those whose name is hidden although one of its sides is free of all
    that does not give way to a stop in focus (free). What gives way is every label that is not of the route: the name
    of another place, the number of another stop, a traveller's name (Pablo's too), a region, a letter. What does not:
    the edge of the map, the cards and controls, the names of the stops in focus and their numbers (without their lower
    4 px, as in the map), the points of the candidates of these places, and, at the left, the points of every place,
    candidate and finding and the bubbles. Regions count only
    when nothing else is left. */
const focus = (page) => page.evaluate(() => {
  const { BE } = window.__be, E = BE.E, m = window.__be.map, sel = E.sel, mc = m.getContainer(), c = mc.getBoundingClientRect();
  const vivo = (el) => el && !el.hidden && el.offsetParent;
  const cards = ['#leyenda', '#mientras', '#vista-recorrido > *', '#vista-ahora', '#situacion', '#mapa .maplibregl-ctrl-top-right', '.modos', '#tira-suceso', '#leyenda-boton', ...(innerWidth <= 760 ? ['#panel', '#vista-lectura'] : [])]
    .flatMap((q) => [...document.querySelectorAll(q)]).filter(vivo).map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0);
  const places = (p) => { const s = BE.parseSel(p?.sel); return !s ? [] : s.tipo === 'lugar' ? [s.id] : [...BE.implicados(s).lugares]; };
  let ids = [];
  if (sel?.tipo === 'recorrido') {
    const rc = BE.D.recorridos.find((r) => r.id === sel.id), i = BE.recorridos.pasoDe(sel.id);
    ids = [rc.paradas[i - 1], rc.paradas[i], rc.paradas[i + 1]].flatMap(places);
  } else if (sel?.tipo === 'viaje') {
    const w = BE.dondeEsta(E.t);
    if (w?.parada && w.en.viaje?.id === sel.id) {
      const ps = BE.P.filter((x) => x.viaje === w.en.viaje), k = ps.indexOf(w.en), aqui = w.en.lugar.id;
      ids = [aqui];
      for (const d of [-1, 1]) for (let j = k + d; j >= 0 && j < ps.length; j += d) if (ps[j].lugar.id !== aqui) { ids.push(ps[j].lugar.id); break; }
    }
  }
  ids = [...new Set(ids)].filter((id) => BE.L[id]?.lat != null);
  const route = new Set(ids);
  const REGION = ['region', 'provincia', 'pais', 'reino', 'desierto', 'llanura', 'valle'];
  const towns = ids.filter((id) => !REGION.includes(BE.L[id].tipo) && BE.L[id].precision !== 'zona');
  if (towns.length) ids = towns;
  const shown = (e) => e.checkVisibility({ visibilityProperty: true, opacityProperty: true }) && !e.closest('.sin-etiqueta');
  const box = (r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
  // The labels of the route that are drawn: the names of these places and the numbers of their stops.
  const ofRoute = [...mc.querySelectorAll('.marca-lugar .etiqueta, .marca-lugar .region-texto, .marca-num')].filter(shown).map((e) => {
    const num = e.classList.contains('marca-num'), lugar = num ? e.dataset.lugar : e.closest('[data-sel^="lugar:"]')?.dataset.sel.slice(6);
    const r = box(e.getBoundingClientRect());
    return { ...r, bottom: r.bottom - (num ? 4 : 0), what: num ? `num:${lugar}` : `lugar:${lugar}`, lugar };
  }).filter((o) => route.has(o.lugar));
  const points = [...mc.querySelectorAll('.marca-lugar')].filter((e) => e.checkVisibility() && !e.classList.contains('agrupado')
    && !e.classList.contains('region') && !e.classList.contains('agua')).map((e) => {
    const l = BE.L[e.dataset.sel.slice(6)], p = m.project([l.lon, l.lat]), r = e.classList.contains('es-actual') ? 7 : 5;
    return { left: c.left + p.x - r, right: c.left + p.x + r, top: c.top + p.y - r, bottom: c.top + p.y + r, what: `punto:${l.id}`, lugar: l.id };
  }).concat([...mc.querySelectorAll('.cand-punto, .grupo-lugares, .marca-hallazgo')].filter((e) => !e.closest('.cand--junto') && e.checkVisibility()).map((e) => ({ ...box(e.getBoundingClientRect()), what: e.className.split(' ')[0], focus: !!e.closest('.cand--del-foco') })));
  const touch = (r, o) => !(r.right + 3 <= o.left || r.left - 3 >= o.right || r.bottom + 1 <= o.top || r.top - 1 >= o.bottom);
  const inMap = (r) => r.left >= c.left && r.right <= c.right && r.top >= c.top && r.bottom <= c.bottom && !cards.some((o) => touch(r, o));
  // The points of the candidates of a place of the route go before the names, as in the map: they count at the right too.
  const ofRouteCands = points.filter((o) => o.focus);
  const inView = [], named = [], free = [];
  for (const id of ids) {
    const p = m.project([BE.L[id].lon, BE.L[id].lat]), x = c.left + p.x, y = c.top + p.y;
    if (x < c.left || x > c.right || y < c.top || y > c.bottom || cards.some((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)) continue;
    inView.push(id);
    const mk = mc.querySelector(`.marca-lugar[data-sel="lugar:${CSS.escape(id)}"]`);
    if (mk && mk.checkVisibility() && !mk.classList.contains('sin-etiqueta')) { named.push(id); continue; }
    if (!mk || mk.classList.contains('agrupado')) continue;
    // Not named: the name on its own side (the right) and mirrored to the left of its point.
    const et = box(mk.querySelector('.etiqueta, .region-texto').getBoundingClientRect());
    const right = mk.classList.contains('rotulo-izq') ? { ...et, left: 2 * x - et.right, right: 2 * x - et.left } : et;
    const left = { ...right, left: 2 * x - right.right, right: 2 * x - right.left };
    const blocked = (r, more) => !inMap(r) || [...ofRoute, ...more].some((o) => o.what !== `lugar:${id}` && o.what !== `punto:${id}` && touch(r, o));
    if (!blocked(right, ofRouteCands)) free.push(`${id} fits at the right`);
    else if (!blocked(left, points)) free.push(`${id} fits at the left`);
  }
  return { inView, named, free, zoom: +m.getZoom().toFixed(2) };
});

test('430: on every stop of every guided tour, the stop and the ones before and after it are named unless only the route is in the way', async () => {
  const page = await open(PHONE);
  const tours = await page.evaluate(() => window.BE.D.recorridos.map((r) => [r.id, r.paradas.length]));
  assert.ok(tours.length >= 4, 'the tours are there');
  const bad = [];
  let seen = 0, nNamed = 0;
  for (const [id, n] of tours) {
    await choose(page, `recorrido:${id}`);
    await still(page);
    for (let i = 0; i < n; i++) {
      if (i) { await page.evaluate((k) => window.BE.recorridos.irA(k), i); await still(page); }
      const f = await focus(page);
      seen += f.inView.length; nNamed += f.named.length;
      if (f.free.length) bad.push(`${id} ${i + 1} (zoom ${f.zoom}): ${f.free.join(', ')}`);
    }
    await choose(page, null);
  }
  assert.ok(seen > 100, `stops in focus checked: ${seen}`);
  console.log(`named stops in focus: ${nNamed}/${seen}`);
  assert.deepEqual(bad, [], 'stops in focus without a name although only labels outside the route are in the way');
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('430: on every stop of Pablo\'s four journeys, the stop where he is and the ones before and after it are named unless only the route is in the way', async () => {
  const page = await open(PHONE);
  const bad = [];
  let seen = 0, nNamed = 0;
  for (const id of JOURNEYS) {
    await choose(page, `viaje:${id}`);
    await still(page);
    const ts = await page.evaluate((x) => window.BE.P.filter((s) => s.viaje?.id === x).map((s) => (s.a + s.b) / 2), id);
    for (const [k, t] of ts.entries()) {
      await page.evaluate((x) => window.BE.setT(x), t);
      await still(page);
      const f = await focus(page);
      seen += f.inView.length; nNamed += f.named.length;
      if (f.free.length) bad.push(`${id} ${k + 1} (zoom ${f.zoom}): ${f.free.join(', ')}`);
    }
  }
  assert.ok(seen > 100, `stops in focus checked: ${seen}`);
  console.log(`named stops in focus: ${nNamed}/${seen}`);
  assert.deepEqual(bad, [], 'stops in focus without a name although only labels outside the route are in the way');
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

/** The place names drawn now. */
const named = (page) => page.evaluate(() => [...window.__be.map.getContainer().querySelectorAll('.marca-lugar, .marca-num')]
  .filter((el) => el.checkVisibility() && !el.classList.contains('sin-etiqueta')).map((el) => el.dataset.sel || `num:${el.dataset.lugar}`).sort());

test('430: leaving a tour gives the names back, as they are without it at the same date and frame', async () => {
  const page = await open(PHONE);
  await choose(page, 'recorrido:pedro');
  await still(page);
  await page.evaluate(() => window.BE.recorridos.irA(8));
  await still(page);
  await page.evaluate(() => window.BE.recorridos.salir());
  await still(page);
  const after = await named(page);
  const scene = await page.evaluate(() => { const m = window.__be.map; return { hash: location.hash.slice(1), center: m.getCenter().toArray(), zoom: m.getZoom() }; });
  assert.doesNotMatch(scene.hash, /recorrido/, 'the tour is left');
  await page.context().close();
  const fresh = await open(PHONE, scene.hash);
  await fresh.evaluate(({ center, zoom }) => window.__be.map.jumpTo({ center, zoom }), scene);
  await still(fresh);
  const without = await named(fresh);
  assert.deepEqual(after, without, 'the names after leaving the tour and without it');
  assert.ok(without.length > 3, `enough names to compare: ${without.join(', ')}`);
  assert.deepEqual(fresh.pageErrors, []);
  await fresh.context().close();
});

/** What the map shows now of a tour's places: the known ones off the map, and the candidates of a place in view. */
const framing = (page, tour) => page.evaluate((id) => {
  const { BE } = window.__be, m = window.__be.map, b = m.getBounds();
  const rc = BE.D.recorridos.find((r) => r.id === id);
  const places = (p) => { const s = BE.parseSel(p?.sel); return !s ? [] : s.tipo === 'lugar' ? [s.id] : [...BE.implicados(s).lugares]; };
  const all = [...new Set(rc.paradas.flatMap(places))].filter((x) => BE.L[x]);
  const known = all.filter((x) => BE.L[x].lat != null && !BE.candidatosDe(BE.L[x]));
  const REGION = ['region', 'provincia', 'pais', 'reino', 'desierto', 'llanura', 'valle'];
  const towns = known.filter((x) => !REGION.includes(BE.L[x].tipo) && BE.L[x].precision !== 'zona');
  const cands = (x) => BE.candidatosVisibles(BE.L[x]).map(({ c }) => c.geometria).filter((g) => g.lat != null);
  const inside = (g) => b.contains([g.lon, g.lat]);
  return { off: (towns.length ? towns : known).filter((x) => !inside(BE.L[x])),
    cands: Object.fromEntries(all.filter((x) => BE.candidatosDe(BE.L[x])).map((x) => [x, `${cands(x).filter(inside).length}/${cands(x).length}`])),
    zoom: +m.getZoom().toFixed(2) };
}, tour);

for (const screen of [PHONE, DESKTOP]) {
  test(`${screen.name}: «La última semana» opens on Jerusalén without the candidates of Emaús, and frames them at their stop`, async () => {
    const page = await open(screen);
    await choose(page, 'recorrido:la-ultima-semana');
    await still(page);
    let f = await framing(page, 'la-ultima-semana');
    assert.deepEqual(f.off, [], `places of the tour off the map on opening, zoom ${f.zoom}`);
    assert.match(f.cands.emaus ?? '', /^0\/[1-9]/, `the candidates of Emaús in view on opening, zoom ${f.zoom}`);
    const k = await page.evaluate(() => window.BE.D.recorridos.find((r) => r.id === 'la-ultima-semana').paradas.findIndex((p) => p.sel.endsWith('camino-de-emaus')));
    assert.ok(k > 0, 'the stop of Emaús');
    await page.evaluate((i) => window.BE.recorridos.irA(i), k);
    await still(page);
    f = await framing(page, 'la-ultima-semana');
    const [inView, all] = f.cands.emaus.split('/').map(Number);
    assert.equal(inView, all, `the candidates of Emaús in view at their stop: ${f.cands.emaus}, zoom ${f.zoom}`);
    assert.deepEqual(page.pageErrors, []);
    await page.context().close();
  });
}

test('430 and 1440: every tour opens with all its known places in view', async () => {
  for (const screen of [PHONE, DESKTOP]) {
    const page = await open(screen);
    const tours = await page.evaluate(() => window.BE.D.recorridos.map((r) => r.id));
    for (const id of tours) {
      await page.evaluate((x) => { localStorage.removeItem(`biblical-atlas:recorrido:${x}`); }, id);
      await choose(page, `recorrido:${id}`);
      await still(page);
      const f = await framing(page, id);
      assert.deepEqual(f.off, [], `${screen.name}, ${id}: places off the map on opening, zoom ${f.zoom}`);
      await choose(page, null);
    }
    assert.deepEqual(page.pageErrors, []);
    await page.context().close();
  }
});
