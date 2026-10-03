// Parallel destinations (`branches_from`, docs/ideas/destinos-paralelos.md), in a real headless browser. The two exiles
// to Assyria (2Re 17:6; 1Cr 5:26) leave from one stop to several destinations at once: the map draws one segment from
// the shared stop to each destination and none between destinations, with the rules of every route kept on each
// branch (window, dashed to a place without a point, dotted to a pending stop, arrows, «↻ cada año», legend, no
// marker for a group, the selected-person rule); the destinations share one moment on the timeline; the journey card
// and the stop cards say they are reached in parallel; a companion's range follows one branch; reading mode draws the
// fan, not a chain; Back and Forward bring a destination back like any other stop.
//
// Run from the repository root, one browser at a time:
//   node --test --test-concurrency=1 tests/site/destinos-paralelos.test.mjs
// Needs python3 with requirements.txt (the data is built into a temporary directory), network access for MapLibre
// (unpkg.com) and playwright-core with a Chromium: either importable, or PLAYWRIGHT_MODULE_DIR=<a node_modules directory
// that holds it>. CHROME_PATH picks another Chromium binary. BE_ROOT=<a checkout> tests that checkout's site instead of
// this one (the control: on a checkout without parallel destinations every test fails).
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
const ISRAEL = 'destierro-de-israel-en-740', ESTE = 'destierro-de-beera';

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
/** Serves the site with the built data; under /<variant>/ the same site runs with that variant's data. */
const variants = {};
function serve(siteDir, dataDir) {
  const server = http.createServer((req, res) => {
    let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const name = url.split('/')[1];
    const v = variants[name];
    if (v) url = url.slice(name.length + 1);
    const rel = url === '/' ? 'index.html' : url.slice(1);
    const data = v?.data || dataDir;
    const file = ['data.json', 'data.js'].includes(rel) ? path.join(data, rel) : path.join(siteDir, rel);
    if (!file.startsWith(siteDir) && !file.startsWith(dataDir)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(body);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}
/** A copy of the built data, changed by `change`, served under /<name>/. */
function variant(name, change) {
  const D = JSON.parse(fs.readFileSync(path.join(tmp, 'data.json'), 'utf8'));
  change(D);
  const dir = path.join(tmp, name);
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'data.json'), JSON.stringify(D));
  fs.writeFileSync(path.join(dir, 'data.js'), `window.BIBLICAL_ATLAS_DATA = ${JSON.stringify(D)};\n`);
  variants[name] = { data: dir };
}

let browser, server, origin, tmp;
async function open(prefix = '', hash = 't=50.5') {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...DESKTOP });
  const p = await context.newPage();
  p.setDefaultTimeout(8000);
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(`pageerror: ${e.message}`));
  // Tiles from other hosts are aborted on purpose (below): their «Failed to load resource» is ours, not the site's.
  p.on('console', (m) => { if (m.type() === 'error' && !/^Failed to load resource: net::ERR_FAILED/.test(m.text())) p.errors.push(`console: ${m.text()}`); });
  await p.route((url) => !url.href.startsWith(origin) && !url.hostname.endsWith('unpkg.com'), (route) => route.abort());
  // A loaded machine takes more than the 8 s default to serve the first page: the same 30 s as the map below.
  await p.goto(`${origin}${prefix}/index.html#${hash}`, { timeout: 30000 });
  await p.waitForFunction(() => window.__be?.map?.loaded?.() && window.__be.map.getSource('be-rastro'), null, { timeout: 30000 });
  return p;
}
before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-destinos-paralelos-'));
  execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--out', tmp], { cwd: ROOT, stdio: 'pipe' });
  const viaje = (D, id) => D.viajes.find((v) => v.id === id);
  // A companion who goes from Samaria to Habor only (stops 1 and 3), and the journey as if it repeated every year.
  variant('tramo', (D) => {
    const v = viaje(D, ISRAEL);
    v.companeros = ['hosea-de-israel'];
    v.tramos_companeros = [{ persona: 'hosea-de-israel', desde: 1, hasta: 3 }];
    v.repeats = 'yearly';
  });
  // Habor pending: its segment, and only its segment, is dotted.
  variant('pendiente', (D) => { viaje(D, ISRAEL).paradas.find((p) => p.orden === 3).estado = 'pendiente'; });
  server = await serve(path.join(ROOT, 'site'), tmp);
  origin = `http://127.0.0.1:${server.address().port}`;
  const chromium = await loadChromium();
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
});
after(async () => {
  await browser?.close();
  server?.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

/** The journey's stops on the timeline and, at t (the middle of its window if not given) with that selection, what the
    map draws of it, its vertices and the legend. */
function lee(p, id, { t = null, sel = null } = {}) {
  return p.evaluate(async ({ id, t, sel }) => {
    const { BE, map, setT, seleccionar } = window.__be;
    const v = BE.D.viajes.find((x) => x.id === id);
    const w = BE.mapa.ventanaViaje(v);
    const cuando = t ?? (w[0] + w[1]) / 2;
    if (sel !== 'mantener') seleccionar(sel, { mover: false, encuadrar: false });
    setT(cuando);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const fs = (await map.getSource('be-rastro').getData()).features.filter((f) => f.properties.viaje === id);
    const punto = (orden) => { const p = v.paradas.find((x) => x.orden === orden); return BE.puntoLugar(BE.L[p.lugar]); };
    const clave = (c) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
    const vertices = Object.fromEntries(v.paradas.map((p) => [p.orden, punto(p.orden) ? { c: clave(punto(p.orden).c), incierto: !!punto(p.orden).incierto } : null]));
    return {
      t: cuando, w,
      paradas: BE.paradasDe(v).map((s) => ({ orden: s.p.orden, a: s.a, b: s.b, desde: s.p.branches_from ?? null })),
      trazos: fs.map((f) => ({ coords: f.geometry.coordinates.map(clave), incierto: !!f.properties.incierto, deducido: !!f.properties.deducido, rama: f.properties.rama ?? null, estado: f.properties.estado })),
      vertices,
      leyenda: document.querySelector('#leyenda')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
      repite: [...document.querySelectorAll('.marca-repite')].filter((m) => m.dataset.viaje === id).map((m) => m.textContent),
      marcaRepite: (() => { const m = [...document.querySelectorAll('.marca-repite')].find((x) => x.dataset.viaje === id); if (!m) return null; const r = m.getBoundingClientRect(); const q = map.unproject([r.left + r.width / 2 - map.getContainer().getBoundingClientRect().left, r.bottom + 6 - map.getContainer().getBoundingClientRect().top]); return [q.lng, q.lat]; })(),
      viajeros: [...document.querySelectorAll('.viajero')].map((e) => e.dataset.sel),
    };
  }, { id, t, sel });
}
/** The segments of a fan: one per destination with a point, from the departure; none between two destinations. */
function abanico(r, salida, destinos) {
  const desde = r.vertices[salida].c;
  const conPunto = destinos.filter((o) => r.vertices[o]);
  const ramas = r.trazos.filter((x) => x.rama != null);
  assert.equal(ramas.length, conPunto.length, `one segment per destination with a point: ${JSON.stringify(r.trazos)}`);
  for (const o of conPunto) {
    const x = ramas.find((y) => y.coords.at(-1) === r.vertices[o].c);
    assert.ok(x, `a segment reaches destination ${o}`);
    assert.deepEqual(x.coords, [desde, r.vertices[o].c], `destination ${o} is reached from stop ${salida}, in that direction (the arrows follow it)`);
    assert.equal(x.incierto, r.vertices[salida].incierto || r.vertices[o].incierto, `destination ${o}: dashed exactly when a place has no point of its own`);
  }
  const lugares = new Set(conPunto.map((o) => r.vertices[o].c));
  for (const x of r.trazos) {
    assert.ok(x.coords.filter((c) => lugares.has(c)).length <= 1, `no line joins two destinations: ${JSON.stringify(x.coords)}`);
  }
}

test('the map draws each exile as a fan from its departure, with no line between destinations, and the legend says so', async () => {
  const p = await open();
  // 2Re 17:6 gives three destinations (the Gozán is the river by Habor); 1Cr 5:26 gives four.
  for (const [id, salida, n] of [[ISRAEL, 1, 3], [ESTE, 1, 4]]) {
    const r = await lee(p, id);
    const destinos = r.paradas.filter((s) => s.desde === salida).map((s) => s.orden);
    assert.equal(destinos.length, n, `${id}: ${n} destinations branch from stop ${salida}: ${JSON.stringify(r.paradas)}`);
    abanico(r, salida, destinos);
    assert.ok(r.trazos.every((x) => x.estado === 'actual'), `${id}: in colour while its stops last`);
    assert.match(r.leyenda, /En abanico: destinos a los que el grupo llega a la vez, sin orden entre ellos/, `${id}: «${r.leyenda}»`);
    assert.deepEqual(r.viajeros.filter((s) => /grupo|destierro/.test(s)), [], `${id}: a group has no traveller marker`);
  }
  // A branch is dashed exactly when its destination is drawn on a candidate or a region's centre. Counted from the
  // vertices, not fixed: a place that loses its candidate loses its branch, and the count follows the data.
  const r = await lee(p, ISRAEL);
  const conPunto = r.paradas.filter((s) => s.desde === 1).map((s) => s.orden).filter((o) => r.vertices[o]);
  assert.ok(conPunto.some((o) => r.vertices[o].incierto), `some destination of ${ISRAEL} has no point of its own`);
  assert.equal(r.trazos.filter((x) => x.rama != null && x.incierto).length, conPunto.filter((o) => r.vertices[o].incierto).length);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('the destinations share one moment on the timeline and one window on the map, after their departure', async () => {
  const p = await open();
  for (const id of [ISRAEL, ESTE]) {
    const r = await lee(p, id);
    const salida = r.paradas.find((s) => s.desde == null), destinos = r.paradas.filter((s) => s.desde != null);
    assert.equal(new Set(destinos.map((s) => `${s.a}|${s.b}`)).size, 1, `${id}: the destinations are at the same time, not one after another: ${JSON.stringify(destinos)}`);
    assert.ok(salida.b <= destinos[0].a, `${id}: they come after the departure: ${JSON.stringify(r.paradas)}`);
    assert.deepEqual(r.w, [Math.min(...r.paradas.map((s) => s.a)), Math.max(...r.paradas.map((s) => s.b))], `${id}: the window spans the departure and the shared moment`);
    // Drawn while its stops last, grey the year after, not before nor after that.
    const estado = async (t) => (await lee(p, id, { t })).trazos.map((x) => x.estado);
    assert.ok((await estado(r.w[0] - 0.5)).length === 0, `${id}: not drawn before its window`);
    assert.ok((await estado(r.w[1] + 0.5)).every((e) => e === 'pasado') && (await estado(r.w[1] + 0.5)).length > 0, `${id}: grey the year after`);
    assert.equal((await estado(r.w[1] + 1.5)).length, 0, `${id}: gone after the grey year`);
  }
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('selected, the journey is drawn whole as a fan; selecting a person adds no route', async () => {
  const p = await open();
  const r = await lee(p, ISRAEL, { t: -1000, sel: { tipo: 'viaje', id: ISRAEL } });
  abanico(r, 1, [2, 3, 4]);
  assert.match(r.leyenda, /Solo este viaje, completo/);
  assert.match(r.leyenda, /En abanico/);
  // Hosea, the last king of Israel (2Re 17:1-6): the map draws what the date draws with nothing selected.
  const persona = 'hosea-de-israel';
  assert.ok(await p.evaluate((id) => !!window.__be.BE.PERS[id], persona), `${persona} is a person of the data`);
  const nada = await lee(p, ISRAEL);
  const con = await lee(p, ISRAEL, { t: nada.t, sel: { tipo: 'persona', id: persona } });
  assert.deepEqual(con.trazos, nada.trazos, `selecting ${persona} changed the exile's segments`);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('the journey card and the stop cards say the destinations are reached in parallel', async () => {
  const p = await open('', `sel=viaje:${ISRAEL}&t=-738.5`);
  const r = await p.evaluate(({ id }) => {
    const { BE } = window.__be;
    const texto = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    return { viaje: texto(BE.tipo('viaje').ficha(id)), habor: texto(BE.tipo('parada').ficha(`${id}/3`)), samaria: texto(BE.tipo('parada').ficha(`${id}/1`)) };
  }, { id: ISRAEL });
  assert.match(r.viaje, /Desde Samaria se llega a la vez a Halá, Habor y Media: el grupo se reparte y el texto no da orden entre esos destinos\./);
  assert.match(r.viaje, /3\. Habor en paralelo desde Samaria · 2Re 17:6; 18:11/);
  assert.doesNotMatch(r.viaje, /1\. Samaria en paralelo/);
  assert.match(r.habor, /Destino en paralelo desde Samaria/);
  assert.doesNotMatch(r.habor, /Parada 3 de 4/);
  assert.match(r.habor, /Desde Samaria se llega a la vez a Halá, Habor y Media/);
  assert.match(r.samaria, /Parada 1 de 4/);
  assert.doesNotMatch(r.samaria, /en paralelo/);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('a companion\'s range follows one branch: Samaria to Habor is stops 1 and 3, not 2; «↻ cada año» sits on a branch', async () => {
  const p = await open('/tramo');
  const r = await p.evaluate(({ id }) => {
    const { BE } = window.__be;
    const v = BE.D.viajes.find((x) => x.id === id);
    const texto = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    return { en: [1, 2, 3, 4].map((o) => BE.acompanantes(v, o).includes('hosea-de-israel')), viaje: texto(BE.tipo('viaje').ficha(id)),
      habor: texto(BE.tipo('parada').ficha(`${id}/3`)), hala: texto(BE.tipo('parada').ficha(`${id}/2`)) };
  }, { id: ISRAEL });
  assert.deepEqual(r.en, [true, false, true, false], 'the range is the route from Samaria to Habor');
  assert.match(r.viaje, /\(de Samaria a Habor\)/);
  assert.match(r.habor, /en esta parada/);
  assert.doesNotMatch(r.hala, /en esta parada/);
  const d = await lee(p, ISRAEL);
  assert.deepEqual(d.repite, ['↻ cada año']);
  assert.match(d.leyenda, /Se repite cada año/);
  assert.ok(d.marcaRepite, 'the mark is on the map');
  // The mark is at the middle of the longest segment, which is one of the branches.
  const enRama = await p.evaluate(({ id, q }) => {
    const { BE } = window.__be;
    const v = BE.D.viajes.find((x) => x.id === id);
    const s = BE.puntoLugar(BE.L.samaria).c;
    return v.paradas.filter((x) => x.branches_from != null).map((x) => BE.puntoLugar(BE.L[x.lugar])?.c).filter(Boolean)
      .some((c) => Math.hypot((s[0] + c[0]) / 2 - q[0], (s[1] + c[1]) / 2 - q[1]) < 0.6);
  }, { id: ISRAEL, q: d.marcaRepite });
  assert.ok(enRama, `«↻ cada año» at the middle of a branch: ${d.marcaRepite}`);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('a pending destination is dotted on its own branch only', async () => {
  const p = await open('/pendiente');
  const r = await lee(p, ISRAEL);
  const habor = r.vertices[3].c;
  assert.equal(r.trazos.filter((y) => y.rama != null).length, 3, 'one segment per destination');
  assert.equal(r.trazos.filter((y) => y.deducido).length, 1, 'only one segment is dotted');
  for (const x of r.trazos.filter((y) => y.rama != null)) assert.equal(x.deducido, x.coords.at(-1) === habor, JSON.stringify(x));
  assert.match(r.leyenda, /De puntos: tramo hacia una parada pendiente de verificar/);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('reading mode on 2 Kings 17 draws the fan, never a line between destinations', async () => {
  const p = await open();
  const pasos = await p.evaluate(async () => {
    const { BE } = window.__be;
    const lib = BE.LIBROS.find((l) => l.num === 12);
    BE.lectura.abrir(BE.idPasaje(lib, 17));
    await new Promise((r) => setTimeout(r, 300));
    return BE.lectura.pasajes(lib, 17).length;
  });
  assert.ok(pasos >= 2, `2 Kings 17 has passages: ${pasos}`);
  let visto = 0;
  for (let i = 0; i < pasos; i++) {
    const r = await p.evaluate(async ({ i, id }) => {
      const { BE, map } = window.__be;
      document.querySelector(`[data-lectura-pasaje="${i}"]`)?.click();
      await new Promise((r) => setTimeout(r, 250));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const v = BE.D.viajes.find((x) => x.id === id);
      const clave = (c) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
      // Halá, Habor and Media (stops 2 to 4), named here and not read from branches_from.
      const destinos = new Set(v.paradas.filter((x) => x.orden > 1).map((x) => BE.puntoLugar(BE.L[x.lugar])).filter(Boolean).map((x) => clave(x.c)));
      const fs = (await map.getSource('be-rastro').getData()).features.filter((f) => f.properties.viaje === id);
      return { n: fs.length, juntos: fs.filter((f) => f.geometry.coordinates.filter((c) => destinos.has(clave(c))).length > 1).length, abierta: BE.lectura.abierta };
    }, { i, id: ISRAEL });
    assert.ok(r.abierta, 'reading mode stays open');
    assert.equal(r.juntos, 0, `passage ${i + 1}: a line joins two destinations`);
    if (r.n) visto++;
  }
  assert.ok(visto >= 1, 'some passage of 2 Kings 17 shows the exile on the map');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('Back and Forward bring a destination back like any other stop', async () => {
  const p = await open('', `sel=viaje:${ISRAEL}&t=-738.5`);
  const estado = () => p.evaluate(() => ({ sel: window.__be.BE.selTexto(window.__be.E.sel), panel: document.querySelector('#panel')?.textContent.replace(/\s+/g, ' ') ?? '' }));
  await p.locator(`#panel [data-sel="parada:${ISRAEL}/3"]`).first().click();
  await p.waitForTimeout(400);
  let s = await estado();
  assert.equal(s.sel, `parada:${ISRAEL}/3`);
  assert.match(s.panel, /Destino en paralelo desde Samaria/);
  await p.evaluate((sel) => window.__be.seleccionar(window.__be.BE.parseSel(sel)), `parada:${ISRAEL}/4`);
  await p.waitForTimeout(400);
  assert.equal((await estado()).sel, `parada:${ISRAEL}/4`);
  await p.goBack();
  await p.waitForTimeout(500);
  s = await estado();
  assert.equal(s.sel, `parada:${ISRAEL}/3`, 'Back returns to Habor');
  assert.match(s.panel, /Destino en paralelo desde Samaria/);
  const r = await lee(p, ISRAEL, { t: await p.evaluate(() => window.__be.E.t), sel: 'mantener' });
  assert.equal(r.trazos.filter((x) => x.rama != null).length, 3, 'the map still draws the fan');
  await p.goForward();
  await p.waitForTimeout(500);
  assert.equal((await estado()).sel, `parada:${ISRAEL}/4`, 'Forward returns to Media');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});
