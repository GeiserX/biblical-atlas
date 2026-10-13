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

test('no page error in the whole run', () => {
  assert.deepEqual(errors, []);
});
