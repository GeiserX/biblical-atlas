// Pablo's journeys on the map, in a real headless browser: at a date inside one of his eight journeys the map draws
// that journey and none of the others, faded or not; after his last stop it draws nothing of his; each journey has its
// own colour and the legend names the one in course. A journey selected outside its date is drawn whole and in its
// colour. The «Viajes» layer switched off draws no journey. Other travellers keep their rule: Jesús in 32 and David in
// 1077 a.e.c. still draw their own journeys. Selecting a person adds no route (Pablo in 44: one of his, not eight), and a
// journey that repeated every year carries «↻ cada año» on its route and a legend row. The four choices of
// docs/ideas/viajes-modelo.md: a group journey (the Ark) is its own and not Pablo's (1B); a segment to a deduced stop is
// dotted (2D); a companion shows only on the stops of his range (3C); another traveller's journey is drawn only while
// its stops last, plus a grey year (4B).
//
// Run from the repository root, one browser at a time:
//   node --test --test-concurrency=1 tests/site/map-journeys.test.mjs
// Needs python3 with requirements.txt (the data is built into a temporary directory), network access for MapLibre
// (unpkg.com) and playwright-core with a Chromium: either importable, or PLAYWRIGHT_MODULE_DIR=<a node_modules directory
// that holds it>. CHROME_PATH picks another Chromium binary. BE_ROOT=<a checkout> tests that checkout's site instead of
// this one (the control: on a checkout where Pablo's other journeys are drawn faded, the first three tests fail).
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
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-map-journeys-'));
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

/** Puts the cursor (and the selection) and reads what the three journey sources draw and what the legend says. */
function drawnAt(page, t, sel = null) {
  return page.evaluate(async ({ t, sel }) => {
    const { map, BE, setT, seleccionar } = window.__be;
    if (sel !== undefined) seleccionar(sel, { mover: false, encuadrar: false });
    setT(t);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const read = async (id) => (await map.getSource(id).getData()).features.map((f) => f.properties);
    const [hecho, falta, rastro] = await Promise.all(['be-hecho', 'be-falta', 'be-rastro'].map(read));
    const quien = (id) => BE.duenoViaje(BE.D.viajes.find((v) => v.id === id));
    const ids = (fs) => [...new Set(fs.map((f) => f.viaje))].sort();
    return {
      V: BE.viajeActual(BE.dondeEsta(t))?.id ?? null,
      hecho: ids(hecho), falta: ids(falta), rastro: ids(rastro),
      pabloRastro: ids(rastro.filter((f) => quien(f.viaje) === 'pablo')),
      rastroEstados: rastro.map((f) => `${f.viaje}:${f.estado}:${f.color}`),
      otros: ids(rastro.filter((f) => quien(f.viaje) !== 'pablo')),
      todos: ids([...hecho, ...falta, ...rastro]),
      repite: [...document.querySelectorAll('.marca-repite')].map((m) => `${m.dataset.viaje}:${m.textContent}`).sort(),
      leyenda: document.querySelector('#leyenda')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
    };
  }, { t, sel });
}

/** Pablo's journeys in order, with a date in the middle of each (between its first and last stop on the map). */
function pabloJourneys(page) {
  return page.evaluate(() => {
    const { BE } = window.__be;
    const vs = [...new Set(BE.P.map((s) => s.viaje))];
    return vs.map((v) => {
      const ps = BE.P.filter((s) => s.viaje === v);
      return { id: v.id, nombre: v.nombre, t: (ps[0].a + ps.at(-1).a) / 2, color: window.BE.colorViaje(v.id) };
    });
  });
}

test('inside each of Pablo\'s journeys the map draws that one alone, in its own colour, and the legend names it', async () => {
  for (const screen of [DESKTOP, PHONE]) {
    const page = await openMap(screen);
    const js = await pabloJourneys(page);
    assert.equal(js.length, 8, `Pablo has eight journeys on the map: ${js.map((j) => j.id)}`);
    assert.equal(new Set(js.map((j) => j.color)).size, 8, `each journey has its own colour: ${js.map((j) => `${j.id} ${j.color}`)}`);
    for (const j of js) {
      const d = await drawnAt(page, j.t);
      assert.equal(d.V, j.id, `${j.t.toFixed(2)} is inside ${j.id}`);
      assert.deepEqual(d.pabloRastro, [], `${screen.width}px, ${j.id} at ${j.t.toFixed(2)}: no other journey of Pablo is drawn, got ${d.pabloRastro}`);
      assert.deepEqual([...new Set([...d.hecho, ...d.falta])], [j.id], `${j.id}: the journey in course is drawn`);
      assert.ok(d.leyenda.includes(j.nombre), `${j.id}: the legend names it: «${d.leyenda}»`);
      assert.ok(!/Otros viajes/.test(d.leyenda) || d.rastroEstados.some((s) => !/:actual:/.test(s)), `${j.id}: no legend row for faded journeys that are not drawn: «${d.leyenda}»`);
    }
    assert.deepEqual(page.pageErrors, []);
    await page.context().close();
  }
});

test('after Pablo\'s last stop the map draws nothing of his', async () => {
  const page = await openMap();
  const fin = await page.evaluate(() => window.__be.BE.P.at(-1).b);
  for (const t of [fin + 0.2, fin + 0.8]) {
    const d = await drawnAt(page, t);
    assert.equal(d.V, null);
    assert.deepEqual([...d.hecho, ...d.falta, ...d.pabloRastro], [], `${t.toFixed(2)}: nothing of Pablo, got ${d.pabloRastro}`);
  }
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('a journey selected outside its date is drawn alone, whole and in its colour', async () => {
  const page = await openMap();
  const js = await pabloJourneys(page);
  const primero = js.find((j) => j.id === 'primer-viaje'), tercero = js.find((j) => j.id === 'tercer-viaje');
  const d = await drawnAt(page, tercero.t, { tipo: 'viaje', id: 'primer-viaje' });
  assert.deepEqual([...d.hecho, ...d.falta], [], 'the journey in course is hidden while another is selected');
  assert.deepEqual(d.rastro, ['primer-viaje']);
  assert.ok(d.rastroEstados.every((s) => s === `primer-viaje:actual:${primero.color}`), `drawn in its own colour: ${d.rastroEstados}`);
  assert.ok(d.leyenda.includes('Primer viaje misional') && /completo/.test(d.leyenda), `«${d.leyenda}»`);
  // Unselected, the date shows its own journey again.
  const e = await drawnAt(page, tercero.t, null);
  assert.deepEqual([...new Set([...e.hecho, ...e.falta])], ['tercer-viaje']);
  assert.deepEqual(e.pabloRastro, []);
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('with the «Viajes» layer off no journey is drawn, and other travellers still draw theirs', async () => {
  const off = await openMap(DESKTOP, 't=50.5&ocultas=viajes');
  const d = await drawnAt(off, 50.5);
  assert.deepEqual([...d.hecho, ...d.falta, ...d.rastro], []);
  await off.context().close();
  const page = await openMap();
  const jesus = await drawnAt(page, 32.5);
  assert.ok(jesus.otros.length > 0 && jesus.pabloRastro.length === 0, `Jesús in 32: ${jesus.otros}`);
  const david = await drawnAt(page, -1076.5);
  assert.ok(david.otros.length > 0, `1077 a.e.c.: ${david.otros}`);
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('a selected person adds no route: the map draws the journey in course, as with nothing selected', async () => {
  const page = await openMap();
  const quien = (id) => page.evaluate((id) => { const { BE } = window.__be; return BE.duenoViaje(BE.D.viajes.find((v) => v.id === id)); }, id);
  const bad = [];
  // Abrahán at the middle of his first journey that has a date.
  const abrahan = await page.evaluate(() => { const v = window.__be.BE.D.viajes.find((x) => x.persona === 'abrahan' && x.fecha?.desde != null); return (v.fecha.desde + (v.fecha.hasta ?? v.fecha.desde)) / 2 + 0.5; });
  for (const [persona, t] of [['pablo', 44.5], ['pablo', 50.5], ['jesus', 32.5], ['david', -1076.5], ['abrahan', abrahan]]) {
    const nada = await drawnAt(page, t, null);
    const sel = await drawnAt(page, t, { tipo: 'persona', id: persona });
    const suyos = [];
    for (const v of sel.todos) if ((await quien(v)) === persona) suyos.push(v);
    console.log(`${persona} at ${t}: ${sel.todos.length} routes with the person selected (${suyos.length} of theirs), ${nada.todos.length} with nothing selected`);
    if (JSON.stringify(sel.todos) !== JSON.stringify(nada.todos)) bad.push(`${persona} at ${t}: ${sel.todos} selected, ${nada.todos} with nothing`);
    if (persona === 'pablo' && suyos.length !== (sel.V ? 1 : 0)) bad.push(`pablo at ${t}: ${suyos.length} of his routes, journey in course ${sel.V}`);
  }
  await drawnAt(page, 50.5, null);
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
  assert.deepEqual(bad, []);
});

test('a journey that repeated every year carries «↻ cada año» on its route and a legend row', async () => {
  for (const screen of [DESKTOP, PHONE]) {
    const page = await openMap(screen);
    // Each at the middle of the window its stops take on the timeline (4B): Samuel's circuit runs from c. 1173 to
    // c. 1080 a.e.c., but the map draws it only while its stops last.
    for (const viaje of ['elcana-sube-a-silo', 'recorrido-de-samuel', 'pascua-de-jesus-a-los-12']) {
      const t = await page.evaluate((id) => { const { BE } = window.__be; const w = BE.mapa.ventanaViaje(BE.D.viajes.find((v) => v.id === id)); return (w[0] + w[1]) / 2; }, viaje);
      const d = await drawnAt(page, t, null);
      const nombre = await page.evaluate((id) => window.__be.BE.D.viajes.find((v) => v.id === id).nombre, viaje);
      console.log(`${screen.width}px ${viaje} at ${t}: drawn ${d.todos.includes(viaje)}, marks ${d.repite.join(' ')}; legend «${d.leyenda}»`);
      assert.ok(d.todos.includes(viaje), `${viaje} is drawn at ${t}`);
      assert.ok(d.repite.includes(`${viaje}:↻ cada año`), `${viaje}: mark on its route, got ${d.repite}`);
      assert.ok(d.leyenda.includes('Se repite cada año') && d.leyenda.includes(nombre), `«${d.leyenda}»`);
    }
    // A date with no yearly journey: no mark and no legend row.
    const d = await drawnAt(page, 50.5, null);
    assert.deepEqual(d.repite, []);
    assert.ok(!/Se repite cada año/.test(d.leyenda), d.leyenda);
    assert.deepEqual(page.pageErrors, []);
    await page.context().close();
  }
});

test('1B: a group journey (the Ark) has its own owner, route, legend name and card, and no traveller marker', async () => {
  const page = await openMap();
  const r = await page.evaluate(() => {
    const { BE } = window.__be;
    const v = BE.D.viajes.find((x) => x.id === 'el-arca-en-filistea');
    const ps = BE.paradasDe(v);
    return { persona: v.persona, grupo: v.grupo, dueno: BE.duenoViaje(v), dePablo: BE.P.some((s) => s.viaje === v), n: ps.length,
      t: (ps[0].a + ps.at(-1).b) / 2, nombre: BE.nombreDeDueno(BE.duenoViaje(v)) };
  });
  assert.equal(r.persona, null);
  assert.equal(r.dueno, 'grupo:el-arca-en-filistea', 'a journey with no person and a group is not Pablo\'s');
  assert.equal(r.dePablo, false, 'none of its stops is among Pablo\'s');
  assert.ok(r.n >= 4, `its stops with a point are placed on the timeline (${r.n})`);
  assert.equal(r.nombre, 'El Arca del pacto', 'the legend names the group');
  const d = await drawnAt(page, r.t);
  assert.ok(d.otros.includes('el-arca-en-filistea'), `drawn at ${r.t.toFixed(2)} as another traveller's journey: ${d.otros}`);
  assert.ok(d.otros.length > 1 && d.leyenda.includes('El Arca del pacto'), `the legend row names the group: «${d.leyenda}»`);
  const g = await page.evaluate(() => {
    const { BE } = window.__be;
    const v = BE.D.viajes.find((x) => x.id === 'el-arca-en-filistea');
    const ps = BE.paradasDe(v);
    const s = ps.find((x) => x.lugar.id === 'ebenezer');
    const w = BE.ventanaEvento(BE.D.eventos.find((e) => e.id === 'los-filisteos-capturan-el-arca'));
    const s0 = ps.find((x) => x.p.orden === 1);
    const w0 = BE.ventanaEvento(BE.D.eventos.find((e) => e.id === 'israel-lleva-el-arca-al-campamento'));
    const lugar = BE.tipo('lugar').ficha('asdod').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    return { s: s && [s.a, s.b], w, s0: s0 && [s0.lugar.id, s0.a, s0.b], w0, lugar };
  });
  assert.ok(g.s && g.w && g.s[0] < g.w[1] && g.w[0] < g.s[1], `Ebenézer follows the capture of the Ark: stop ${g.s}, event ${g.w}`);
  // A window is [start, end): since the Ark's account is a block of days (narrative_order.elapsed), the stop at Siló can
  // be one instant at the very start of that event, which is inside it.
  assert.ok(g.s0 && g.s0[0] === 'silo' && g.w0 && g.s0[1] < g.w0[1] && g.w0[0] <= g.s0[2],
    `the Ark leaves Siló when Israel takes it to the camp (1Sa 4:3-5): stop ${g.s0}, event ${g.w0}`);
  assert.match(g.lugar, /El Arca del pacto · /, 'the Asdod card names the group in its journey row');
  assert.ok(!d.pabloRastro.includes('el-arca-en-filistea'));
  const marcas = await page.evaluate(() => [...document.querySelectorAll('.viajero')].map((e) => e.dataset.sel));
  assert.ok(!marcas.some((m) => /grupo|arca/i.test(m)), `no traveller marker for a group: ${marcas}`);
  await drawnAt(page, r.t, { tipo: 'viaje', id: 'el-arca-en-filistea' });
  const ficha = await page.evaluate(() => document.querySelector('#panel')?.textContent.replace(/\s+/g, ' ') ?? '');
  assert.ok(/Viaje del Arca del pacto/.test(ficha) && !/Pablo/.test(ficha.slice(0, 200)), `the card names the group: «${ficha.slice(0, 200)}»`);
  // Its reference, «1Sa 4:3-11; 5:1–7:2», keeps its second piece: a chip of its own and the journey in 1 Samuel 5 to 7.
  assert.match(ficha, /1Sa 5:1–7:2/);
  const enCap = await page.evaluate(() => { const { BE } = window.__be; const lib = BE.LIBROS.find((l) => l.num === 9); return [4, 5, 6, 7].map((c) => BE.implicados({ tipo: 'pasaje', id: BE.idPasaje(lib, c) }).claves.has('viaje:el-arca-en-filistea')); });
  assert.deepEqual(enCap, [true, true, true, true], '1 Samuel 4, 5, 6 and 7 name the journey');
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('1B: every group journey is its own, sits on the timeline, is drawn while its stops last and its card names its group', async () => {
  const page = await openMap();
  const gs = await page.evaluate(() => {
    const { BE } = window.__be;
    return BE.D.viajes.filter((v) => v.grupo).map((v) => {
      const ps = BE.paradasDe(v);
      return { id: v.id, grupo: v.grupo, dueno: BE.duenoViaje(v), dePablo: BE.P.some((s) => s.viaje === v), n: ps.length,
        t: ps.length ? (ps[0].a + ps.at(-1).b) / 2 : null, nombre: BE.nombreDeDueno(BE.duenoViaje(v)) };
    });
  });
  assert.ok(gs.length >= 15, `the group journeys reach the site: ${gs.map((g) => g.id)}`);
  for (const g of gs) {
    assert.equal(g.dueno, `grupo:${g.id}`, `${g.id} is its own owner`);
    assert.equal(g.dePablo, false, `${g.id} is not among Pablo's stops`);
    assert.ok(g.n >= 2, `${g.id} has its stops on the timeline (${g.n})`);
    assert.equal(g.nombre, g.grupo[0].toUpperCase() + g.grupo.slice(1), `${g.id}: the legend name is its group`);
    const d = await drawnAt(page, g.t);
    assert.ok(d.otros.includes(g.id), `${g.id} is drawn at ${g.t.toFixed(2)}: ${d.otros}`);
    // The legend names who travels only when it draws more than one traveller's journey.
    if (d.otros.length > 1) assert.ok(d.leyenda.includes(g.nombre), `${g.id}: the legend names «${g.nombre}»: «${d.leyenda}»`);
    await drawnAt(page, g.t, { tipo: 'viaje', id: g.id });
    const ficha = await page.evaluate(() => document.querySelector('#panel')?.textContent.replace(/\s+/g, ' ') ?? '');
    assert.ok(ficha.includes(g.grupo.replace(/^el /, '')) && !/Pablo/.test(ficha.slice(0, 200)), `${g.id}: the card names the group: «${ficha.slice(0, 200)}»`);
  }
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('2D: a segment that reaches or leaves a deduced stop is dotted, the verified ones keep their line, and the legend says so', async () => {
  const page = await openMap();
  const read = (id) => page.evaluate(async (id) => {
    const { map, BE, setT, seleccionar } = window.__be;
    seleccionar({ tipo: 'viaje', id }, { mover: false, encuadrar: false });
    setT(50.5);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const v = BE.D.viajes.find((x) => x.id === id);
    const pendientes = v.paradas.filter((p) => p.estado === 'pendiente').map((p) => BE.L[p.lugar]).filter((l) => l?.lat != null).map((l) => `${l.lon},${l.lat}`);
    const fs = (await map.getSource('be-rastro').getData()).features.filter((f) => f.properties.viaje === id);
    const toca = (f) => f.geometry.coordinates.some((c) => pendientes.includes(`${c[0]},${c[1]}`));
    const layer = map.getLayer('be-rastro-deducido');
    return { n: fs.length, mal: fs.filter((f) => !!f.properties.deducido !== toca(f)).map((f) => JSON.stringify(f.properties)),
      deducidos: fs.filter((f) => f.properties.deducido).length, dash: layer && map.getPaintProperty('be-rastro-deducido', 'line-dasharray'),
      leyenda: document.querySelector('#leyenda')?.textContent ?? '' };
  }, id);
  // Jacob sale de Hebrón, que jw.org da como probable (parada 1 pendiente); las demás paradas están verificadas.
  const jacob = await read('jacob-a-egipto');
  assert.ok(jacob.deducidos >= 1 && jacob.n > jacob.deducidos, `dotted and solid segments: ${jacob.deducidos} of ${jacob.n}`);
  assert.deepEqual(jacob.mal, [], 'dotted exactly where a segment touches a deduced stop');
  assert.ok(Array.isArray(jacob.dash) && jacob.dash[0] < 0.5, `the deduced layer is dotted: ${jacob.dash}`);
  assert.match(jacob.leyenda, /De puntos: tramo hacia una parada pendiente de verificar/);
  const moab = await read('campana-contra-moab');
  assert.equal(moab.deducidos, 0, 'a journey whose stops are all verified has no dotted segment');
  assert.doesNotMatch(moab.leyenda, /De puntos/);
  // Pablo's journey in course (be-hecho, be-falta): his last years, with Creta and Nicópolis pending.
  const pablo = await page.evaluate(async () => {
    const { map, BE, setT, seleccionar } = window.__be;
    seleccionar(null, { mover: false, encuadrar: false });
    setT(62.5);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const V = BE.viajeActual(BE.dondeEsta(62.5));
    const fs = [...(await map.getSource('be-hecho').getData()).features, ...(await map.getSource('be-falta').getData()).features].filter((f) => f.properties.viaje === V?.id);
    return { V: V?.id, n: fs.length, deducidos: fs.filter((f) => f.properties.deducido).length,
      filtros: Object.fromEntries(['be-rastro', 'be-rastro-incierto', 'be-hecho', 'be-hecho-incierto'].map((id) => [id, JSON.stringify(map.getFilter(id))])) };
  });
  assert.equal(pablo.V, 'ultimos-anos-de-pablo');
  assert.ok(pablo.deducidos >= 1 && pablo.n > pablo.deducidos, `Pablo's route has dotted and solid segments: ${pablo.deducidos} of ${pablo.n}`);
  for (const [id, f] of Object.entries(pablo.filtros)) assert.match(f, /deducido/, `${id} leaves the dotted segments to its dotted layer: ${f}`);
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('3C: a companion shows only on the stops of his range, in reading mode and in the stop card', async () => {
  const page = await openMap();
  const r = await page.evaluate(() => {
    const { BE } = window.__be;
    const lib = BE.LIBROS.find((l) => l.num === 44);
    const ps = [15, 16, 17, 18].flatMap((c) => BE.lectura.pasajes(lib, c)).filter((x) => x.sel.startsWith('parada:segundo-viaje/'));
    const ficha = (k) => BE.tipo('parada').ficha(`segundo-viaje/${k}`).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    return { en: Object.fromEntries(ps.map((x) => [x.sel.split('/')[1], x.personas])), atenas: ficha(15), corinto: ficha(16) };
  });
  const en = (k) => r.en[k] || [];
  assert.ok(!en(3).includes('timoteo') && en(4).includes('timoteo'), `Timoteo joins in Listra: Derbe ${en(3)}, Listra ${en(4)}`);
  assert.ok(!en(6).includes('lucas') && en(7).includes('lucas') && en(10).includes('lucas') && !en(13).includes('lucas'), 'Lucas from Troas to Filipos');
  assert.deepEqual(en(15), ['pablo'], 'Pablo reaches Atenas alone (Hch 17:14, 15)');
  for (const p of ['silas', 'timoteo', 'aquila', 'priscila']) assert.ok(en(16).includes(p), `${p} in Corinto: ${en(16)}`);
  assert.ok(!/Con Pablo en esta parada/.test(r.atenas), 'the Atenas card names no companion');
  const t = await page.evaluate(() => {
    const { BE } = window.__be;
    const lib = BE.LIBROS.find((l) => l.num === 44);
    const en20 = Object.fromEntries(BE.lectura.pasajes(lib, 20).filter((x) => x.sel.startsWith('parada:tercer-viaje/')).map((x) => [x.sel.split('/')[1], x.personas]));
    const viaje = BE.tipo('viaje').ficha('segundo-viaje').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const juntos = BE.aristas('lucas').filter((a) => a.sel.startsWith('persona:') && /^viajan juntos · Segundo viaje/.test(a.verbo)).map((a) => a.sel);
    return { en20, viaje, juntos };
  });
  assert.match(t.viaje, /Timoteo \(de Listra a Berea y en Corinto\)/, 'the journey card says where Timoteo goes');
  assert.ok(t.juntos.includes('persona:silas') && !t.juntos.includes('persona:aquila'), `Lucas travels with Silas, never with Áquila: ${t.juntos}`);
  assert.ok(t.en20[8] && !t.en20[8].includes('sopater') && t.en20[8].includes('lucas'), `in Filipos, Lucas and not the seven of Hch 20:4: ${t.en20[8]}`);
  assert.ok(t.en20[9]?.includes('sopater'), `Sópater waits in Troas: ${t.en20[9]}`);
  assert.match(r.corinto, /Con Pablo en esta parada.*Silas/);
  // Choosing Lucas, a companion, adds no route: the map draws what the date draws with nothing selected, and his journeys
  // stay off the map. It highlights only the stops of his range.
  for (const t of [30.5, 47.5]) {
    const nada = await drawnAt(page, t, null);
    const lucas = await drawnAt(page, t, { tipo: 'persona', id: 'lucas' });
    assert.deepEqual(lucas.todos, nada.todos, `${t}: selecting Lucas changed the routes: ${lucas.todos} with Lucas, ${nada.todos} with nothing`);
    assert.ok(!lucas.todos.includes('segundo-viaje') && !lucas.todos.includes('tercer-viaje'), `${t}: Lucas's journeys drawn: ${lucas.todos}`);
  }
  await drawnAt(page, 30.5, { tipo: 'persona', id: 'lucas' });
  const imp = await page.evaluate(() => { const r = window.__be.BE.implicados({ tipo: 'persona', id: 'lucas' }); return { claves: [...r.claves], lugares: [...r.lugares] }; });
  assert.ok(imp.claves.includes('parada:segundo-viaje/7') && imp.claves.includes('parada:tercer-viaje/8'), 'his stops are highlighted');
  assert.ok(!imp.claves.includes('parada:segundo-viaje/15') && !imp.claves.includes('parada:tercer-viaje/1'), `Atenas and Antioquía are not his: ${imp.claves.filter((k) => k.startsWith('parada:'))}`);
  assert.ok(!imp.lugares.includes('atenas'), 'Atenas is not highlighted for Lucas');
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('4B: another traveller\'s journey is drawn only while its stops last, plus a grey year', async () => {
  const page = await openMap();
  const out = {};
  // 1070 and 1051 a.e.c. (astronomical -1069 and -1050, mid-year): with the whole date of each journey, 20 and 17.
  for (const t of [-1068.5, -1049.5]) {
    const d = await drawnAt(page, t);
    const fuera = await page.evaluate((args) => {
      const { BE } = window.__be;
      return args.ids.filter((id) => { const ps = BE.paradasDe(BE.D.viajes.find((v) => v.id === id)); return !ps.length || args.t < Math.min(...ps.map((s) => s.a)) || args.t >= Math.max(...ps.map((s) => s.b)) + 1; });
    }, { ids: d.otros, t });
    out[t] = d.otros;
    assert.deepEqual(fuera, [], `${t}: every journey drawn has a stop window around the date`);
    assert.ok(d.otros.length <= 7, `${t}: ${d.otros.length} journeys drawn: ${d.otros}`);
  }
  assert.ok(!out[-1049.5].includes('joab-contra-ammon-y-siria'), 'Joab against Ammon is not drawn twenty years after it ended');
  // In colour while its stops last, grey the year after, gone after that: Joab against Ammon, whose date runs on for
  // decades after its stops.
  const w = await page.evaluate(() => { const { BE } = window.__be; const v = BE.D.viajes.find((x) => x.id === 'joab-contra-ammon-y-siria'); return { w: BE.mapa.ventanaViaje(v), tr: BE.tramo(v.fecha) }; });
  assert.ok(w.w[1] + 2 < w.tr[1], `its stops end long before its date: ${w.w} inside ${w.tr}`);
  const estado = async (t) => (await drawnAt(page, t)).rastroEstados.find((x) => x.startsWith('joab-contra-ammon-y-siria:'))?.split(':')[1] ?? null;
  assert.equal(await estado((w.w[0] + w.w[1]) / 2), 'actual');
  assert.equal(await estado(w.w[1] + 0.5), 'pasado', 'the grey year after its last stop');
  assert.equal(await estado(w.w[1] + 1.5), null, 'not drawn after the grey year');
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('4B: no journey is drawn outside its own date plus the grey year, even when its last stop lasts on', async () => {
  const page = await openMap();
  // The timeline keeps a traveller at his last stop until his next one: Moisés in Madián for forty years, Epafras in
  // Colosas from 33, Jesús in Nazaret after the Passover at twelve, José in Egipto. None of that is the journey.
  for (const [t, id] of [[-1530.5, 'huida-de-moises-a-madian'], [40.5, 'epafras-a-roma'], [20.5, 'pascua-de-jesus-a-los-12'], [-1740.5, 'jose-a-egipto']]) {
    const d = await drawnAt(page, t);
    const fuera = await page.evaluate((a) => {
      const { BE } = window.__be;
      return a.ids.filter((x) => { const tr = BE.tramo(BE.D.viajes.find((v) => v.id === x).fecha); return !tr || a.t < tr[0] || a.t >= tr[1] + 1; });
    }, { ids: d.otros, t });
    assert.deepEqual(fuera, [], `${t}: journeys drawn outside their date: ${fuera}`);
    assert.ok(!d.otros.includes(id), `${t}: ${id} is not drawn`);
  }
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});
