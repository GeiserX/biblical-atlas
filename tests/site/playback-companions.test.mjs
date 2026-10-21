// What blinked during playback: the marker of someone who travels with Paul. Bernabé, on the first journey, had his own
// marker on the map, placed by the events that name him and not by Paul's stops: on every leg he ran ahead of Paul and
// at every stop he slid back under Paul's marker, so while the timeline played his dot and his name came and went at
// every stop. Now whoever travels with Paul (the companions of the journey at that stop, or at both ends of the leg) has
// no marker of his own while he does: Paul's marks where they are. His own marker shows only when the data put him
// somewhere else.
//
// It walks the first journey and the visit to Jerusalem that follows it (Bernabé goes on with Paul from Antioch, so
// the leg that joins the two journeys counts too) frame by frame, as playback does, at two speeds (about three months
// and one year per second at 60 frames a second), and counts how many times each traveller's marker turns visible
// apart from Paul's and hides again.
//
// Run from the repository root, one browser at a time:
//   node --test --test-concurrency=1 tests/site/playback-companions.test.mjs
// Needs python3 with requirements.txt and playwright-core with a Chromium (PLAYWRIGHT_MODULE_DIR, as the other files).
// BE_ROOT=<a checkout> tests that checkout's site instead (the control: on a checkout from before, Bernabé blinks).
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
    const file = /^data(\.[a-z]+)?\.json$|^data\.js$/.test(rel) ? path.join(dataDir, rel) : path.join(siteDir, rel);
    if (!file.startsWith(siteDir) && !file.startsWith(dataDir)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(body);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

let browser, server, origin, tmp, page;
const errors = [];
before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-playback-companions-'));
  execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--out', tmp], { cwd: ROOT, stdio: 'pipe' });
  server = await serve(path.join(ROOT, 'site'), tmp);
  origin = `http://127.0.0.1:${server.address().port}`;
  const chromium = await loadChromium();
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1440, height: 900 } });
  page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  // Tiles from other hosts are not needed; MapLibre from unpkg is.
  await page.route((url) => !url.href.startsWith(origin) && !url.hostname.endsWith('unpkg.com'), (route) => route.abort());
  await page.goto(`${origin}/index.html#t=47`);
  await page.waitForFunction(() => window.__be?.map?.loaded?.() && document.querySelector('.pablo'), null, { timeout: 60000 });
});
after(async () => {
  await browser?.close();
  server?.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

/** Walks the first journey and the visit to Jerusalem of 49 in steps of `paso` years, one frame each, and counts for every traveller how many times his
    marker turns visible apart from Paul's (present, and its dot more than 8 px from Paul's or its name showing) and how
    many frames it stays so. */
function walk(paso) {
  return page.evaluate(async (paso) => {
    const { BE, map, setT } = window.__be;
    const ps = BE.P.filter((s) => s.viaje.id === 'primer-viaje'), visita = BE.P.filter((s) => s.viaje.id === 'visita-a-jerusalen-49');
    const [a, b] = [ps[0].a, visita.at(-1).b];
    // The whole journey in view, as the map follows Paul while it plays.
    map.jumpTo({ center: [33.6, 36.6], zoom: 5.4 });
    const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    const centro = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const seen = new Map(), steps = { frames: 0, conPablo: new Set() };
    for (let t = a; t <= b; t += paso) {
      setT(t);
      await frame();
      steps.frames++;
      const pablo = document.querySelector('.pablo .pablo-punto');
      const pc = pablo?.isConnected ? centro(pablo) : null;
      for (const p of [...BE.acompanantes(ps[0].viaje), ...BE.acompanantes(visita[0].viaje)]) steps.conPablo.add(p);
      const shown = new Set();
      for (const el of document.querySelectorAll('.viajero')) {
        if (!el.isConnected || !el.checkVisibility()) continue;
        const dot = centro(el.querySelector('.viajero-punto'));
        const name = el.querySelector('.viajero-rotulo').checkVisibility({ visibilityProperty: true });
        if (name || !pc || Math.hypot(dot[0] - pc[0], dot[1] - pc[1]) > 8) shown.add(el.dataset.sel.slice(8));
      }
      for (const p of new Set([...seen.keys(), ...shown])) {
        const s = seen.get(p) || { on: false, shows: 0, toggles: 0, frames: 0 };
        const on = shown.has(p);
        if (on !== s.on) s.toggles++;
        if (on && !s.on) s.shows++;
        if (on) s.frames++;
        s.on = on;
        seen.set(p, s);
      }
    }
    return { frames: steps.frames, companions: [...steps.conPablo], seen: Object.fromEntries([...seen].map(([p, s]) => [p, { shows: s.shows, toggles: s.toggles, frames: s.frames }])) };
  }, paso);
}

for (const [speed, paso] of [['three months a second', 0.25 / 60], ['one year a second', 1 / 60]]) {
  test(`playing the first journey and the visit to Jerusalem at ${speed}, no one who travels with Paul blinks on the map`, async () => {
    const r = await walk(paso);
    console.log(`${speed}: ${r.frames} frames; companions ${r.companions.join(', ')}; markers apart from Paul's: ${JSON.stringify(r.seen)}`);
    assert.ok(r.frames > 30, `only ${r.frames} frames`);
    assert.ok(r.companions.includes('bernabe'), 'Bernabé travels with Paul on the first journey');
    // Bernabé goes the whole journey with Paul, and then to Jerusalem and back: his own marker never shows apart from Paul's.
    assert.equal(r.seen.bernabe?.toggles ?? 0, 0, `Bernabé's marker turned visible or hidden ${r.seen.bernabe?.toggles} times`);
    // Juan Marcos leaves at Perga (Hch 13:13) and goes home on a journey of his own: his marker shows once, while the data
    // put him on that road. No traveller's marker comes back after hiding.
    assert.ok(r.seen['juan-marcos']?.shows === 1, `Juan Marcos's marker showed ${r.seen['juan-marcos']?.shows ?? 0} times`);
    for (const [p, s] of Object.entries(r.seen)) assert.ok(s.shows <= 1, `${p}'s marker showed ${s.shows} times`);
  });
}

test('a companion who is the chosen person keeps his own marker while he travels with Paul', async () => {
  const r = await page.evaluate(async () => {
    const { BE, setT, seleccionar } = window.__be;
    const frame = () => new Promise((res) => requestAnimationFrame(() => setTimeout(res, 0)));
    // A stop of the first journey where Bernabé is with Paul and the data place him.
    const s = BE.P.find((x) => x.viaje.id === 'primer-viaje' && BE.acompanantes(x.viaje, x.p.orden).includes('bernabe') && BE.donde('bernabe', (x.a + x.b) / 2)?.pos);
    const t = (s.a + s.b) / 2;
    const shown = () => !!document.querySelector('.viajero[data-sel="persona:bernabe"]')?.isConnected;
    seleccionar(null, { mover: false, encuadrar: false }); setT(t); await frame();
    const plain = shown();
    seleccionar({ tipo: 'persona', id: 'bernabe' }, { mover: false, encuadrar: false }); setT(t); await frame();
    const chosen = shown();
    seleccionar(null, { mover: false, encuadrar: false }); await frame();
    return { at: s.lugar.nombre, plain, chosen };
  });
  console.log(`Bernabé at ${r.at}: marker ${r.plain ? 'shown' : 'hidden'} with nothing chosen, ${r.chosen ? 'shown' : 'hidden'} when he is chosen`);
  assert.deepEqual([r.plain, r.chosen], [false, true]);
});

// Sergio chose Timoteo while Paul was in Rome and only ever saw Paul: Timoteo's marker sat under Paul's, its name lost
// to Paul's and to Roma's, nothing on the map traced where Timoteo had been, and playback followed Paul. Now the chosen
// companion's marker goes on top of Paul's with its name and «con Pablo», the map draws the companion's own route
// (be-persona: travelled so far, still to go, a dot on each place) and playback follows the companion.
test('a chosen companion travelling with Paul shows on top of Paul, named, with his own route drawn', async () => {
  const r = await page.evaluate(async () => {
    const { BE, setT, seleccionar, map } = window.__be;
    const frame = () => new Promise((res) => requestAnimationFrame(() => setTimeout(res, 0)));
    const centro = (el) => { const q = el.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; };
    // Troas on the second journey: Timoteo goes with Paul (Hch 16:8).
    const s = BE.P.find((x) => x.viaje.id === 'segundo-viaje' && x.lugar.id === 'troas' && BE.acompanantes(x.viaje, x.p.orden).includes('timoteo'));
    const t = (s.a + s.b) / 2;
    seleccionar({ tipo: 'persona', id: 'timoteo' }, { mover: false, encuadrar: false }); setT(t);
    map.jumpTo({ center: [s.lugar.lon, s.lugar.lat], zoom: 6 });
    await frame(); await frame();
    window.BE.pintarEtiquetas(); await frame();
    const el = document.querySelector('.viajero[data-sel="persona:timoteo"]');
    const pablo = document.querySelector('.pablo .pablo-punto');
    const out = { at: s.lugar.nombre, marker: !!el?.isConnected };
    if (el?.isConnected) {
      const [x, y] = centro(el.querySelector('.viajero-punto')), [px, py] = centro(pablo);
      out.apart = Math.round(Math.hypot(x - px, y - py));
      out.onTop = !!document.elementFromPoint(x, y)?.closest('.viajero[data-sel="persona:timoteo"]');
      out.name = el.querySelector('.viajero-rotulo').checkVisibility({ visibilityProperty: true });
      out.conPablo = !!el.querySelector('.viajero-rotulo small')?.checkVisibility({ visibilityProperty: true });
    }
    const src = map.getSource('be-persona');
    const fs = src ? (await src.getData()).features : null;
    out.route = fs && { hecho: fs.filter((f) => f.geometry.type === 'LineString' && f.properties.estado === 'hecho').length,
      falta: fs.filter((f) => f.geometry.type === 'LineString' && f.properties.estado === 'falta').length,
      places: [...new Set(fs.filter((f) => f.geometry.type === 'Point').map((f) => f.properties.lugar))] };
    // Choosing nothing takes the route and the marker away again.
    seleccionar(null, { mover: false, encuadrar: false }); await frame(); await frame();
    out.after = { marker: !!document.querySelector('.viajero[data-sel="persona:timoteo"]')?.isConnected, route: src ? (await src.getData()).features.length : null };
    return out;
  });
  console.log(`Timoteo at ${r.at}: ${JSON.stringify(r)}`);
  assert.ok(r.marker, 'Timoteo has a marker while he is chosen');
  assert.ok(r.apart <= 2, `Timoteo's dot is ${r.apart} px from Paul's, they travel together`);
  assert.ok(r.onTop, 'Timoteo\'s dot is on top of Paul\'s');
  assert.ok(r.name && r.conPablo, 'his name and «con Pablo» show');
  assert.ok(r.route, 'the map has a source for the chosen person\'s route');
  assert.ok(r.route.hecho >= 1 && r.route.falta >= 1, `his route so far and still to go: ${JSON.stringify(r.route)}`);
  for (const id of ['listra', 'troas', 'filipos', 'berea', 'corinto', 'efeso', 'roma']) assert.ok(r.route.places.includes(id), `his route passes ${id}: ${r.route.places.join(', ')}`);
  assert.deepEqual(r.after, { marker: false, route: 0 });
});

test('playing with a companion chosen, the map follows him and not Paul', async () => {
  const r = await page.evaluate(async () => {
    const { BE, E, setT, seleccionar, map } = window.__be;
    const frame = () => new Promise((res) => requestAnimationFrame(() => setTimeout(res, 0)));
    // A moment when the data put Timoteo far from Paul (Macedonia while Paul is still around Éfeso, Hch 19:22).
    let t = null;
    for (let x = 54.9; x < 56; x += 0.01) {
      const a = BE.donde('timoteo', x), b = BE.dondeEsta(x);
      if (a?.pos && b?.pos && Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1]) > 3) { t = x; break; }
    }
    seleccionar({ tipo: 'persona', id: 'timoteo' }, { mover: false, encuadrar: false }); setT(t);
    await frame();
    // The map on Paul, close enough that Timoteo is off it.
    map.jumpTo({ center: BE.dondeEsta(t).pos, zoom: 7 });
    await frame();
    const dentro = () => {
      const el = document.querySelector('.viajero[data-sel="persona:timoteo"]');
      if (!el?.isConnected) return null;
      const q = el.getBoundingClientRect(), c = map.getContainer().getBoundingClientRect();
      return q.left >= c.left && q.right <= c.right && q.top >= c.top && q.bottom <= c.bottom;
    };
    const antes = dentro();
    E.play = true;
    for (let k = 0; k < 5; k++) { setT(t + k * 0.0005); await frame(); }
    E.play = false;
    await new Promise((res) => setTimeout(res, 1300));
    const despues = dentro();
    seleccionar(null, { mover: false, encuadrar: false }); await frame();
    return { t, antes, despues };
  });
  console.log(`playing at ${r.t?.toFixed(2)} with Timoteo chosen: in view before ${r.antes}, after ${r.despues}`);
  assert.ok(r.t != null, 'no moment with Timoteo apart from Paul');
  assert.equal(r.antes, false, 'Timoteo starts off the map');
  assert.equal(r.despues, true, 'playback brought Timoteo into view');
});

test('no page error in the whole run', () => {
  assert.deepEqual(errors, []);
});
