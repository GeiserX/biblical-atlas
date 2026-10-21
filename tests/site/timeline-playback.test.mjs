// Playback on the timeline, in a real headless browser, with Jesús selected during his ministry.
//  - At «Décadas» (and up) a stop is earned: it comes only after 3 s of playback since the last one and lasts about
//    2.5 s; the events in between do not stop it, the bottom message names them as they pass and their marks stay
//    highlighted (.de-paso).
//  - At «Años» (and down) every event stops playback for about 1.5 s, as always, and nothing is highlighted.
//  - «Pausar un momento en cada suceso» off: no stop at all. A pause by hand stays paused until play is pressed again.
//
// Run from the repository root, one browser at a time:
//   node --test --test-concurrency=1 tests/site/timeline-playback.test.mjs
// Needs python3 with requirements.txt (the data is built into a temporary directory) and playwright-core with a
// Chromium: either importable, or PLAYWRIGHT_MODULE_DIR=<a node_modules directory that holds it>. CHROME_PATH picks
// another Chromium binary. BE_ROOT=<a checkout> tests that checkout instead (the control: before the change, the
// «Décadas» test fails).
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
const SCREEN = { viewport: { width: 1440, height: 900 } };

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

let browser, server, base, tmp;
const frames = (p, n = 4) => p.evaluate((k) => new Promise((r) => { const go = (i) => (i ? requestAnimationFrame(() => go(i - 1)) : r()); go(k); }), n);

async function open(hash) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...SCREEN });
  const p = await context.newPage();
  await p.goto(`${base}#${hash}`);
  await p.waitForFunction(() => window.BE?.lineaMarcas && document.querySelector('#linea-filas .m'), null, { timeout: 25000 });
  await frames(p);
  return p;
}

/** Records every frame (time, cursor, playing) and every bottom message, then presses play and lets it run `ms`. */
async function run(p, ms) {
  await p.evaluate(() => {
    const BE = window.BE, log = (window.__frames = []), msgs = (window.__msgs = []);
    const avisar = BE.avisar;
    BE.avisar = (texto, d) => { msgs.push({ now: performance.now(), texto, play: BE.E.play }); return avisar(texto, d); };
    const f = () => { log.push({ now: performance.now(), t: BE.E.t, play: BE.E.play, v: BE.velocidad() }); if (!window.__stop) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  await p.click('#reproducir');
  await p.waitForTimeout(ms);
  return p.evaluate(async () => {
    window.__stop = true;
    if (window.BE.E.play) document.querySelector('#reproducir').click();
    // Only the marks near the visible rows are in the page: walk the lanes top to bottom to see every highlighted one.
    const cuerpo = document.querySelector('#linea-cuerpo'), dePaso = new Set();
    const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (let y = 0; ; y += Math.max(100, cuerpo.clientHeight)) {
      cuerpo.scrollTop = y; await raf();
      for (const e of document.querySelectorAll('#linea-filas .m.de-paso .m-nombre .t')) dePaso.add(e.textContent);
      if (y + cuerpo.clientHeight >= cuerpo.scrollHeight) break;
    }
    return { frames: window.__frames, msgs: window.__msgs, dePaso: [...dePaso] };
  });
}

/** The stops of a run: when playback went from playing to stopped, the seconds of playback before it (since the last
    stop or since play), and how long it stayed stopped. The last frames (stopped by the test) do not count. */
function stops({ frames }) {
  const out = [];
  let played = 0, since = null;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1], b = frames[i];
    if (a.play && b.play) played += (b.t - a.t) / b.v;
    if (a.play && !b.play) { since = { at: b.now, t: b.t, played }; played = 0; }
    if (!a.play && b.play && since) { out.push({ ...since, lasted: (b.now - since.at) / 1000 }); since = null; }
  }
  return out;
}

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-timeline-playback-'));
  execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--out', tmp], { cwd: ROOT, stdio: 'pipe' });
  server = await serve(path.join(ROOT, 'site'), tmp);
  base = `http://127.0.0.1:${server.address().port}/index.html`;
  const chromium = await loadChromium();
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
});
after(async () => {
  await browser?.close();
  server?.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

test('«Décadas»: a stop comes only after 3 s of playback and lasts about 2.5 s; the events in between pass in the message and stay highlighted', async () => {
  const p = await open('t=29.8&v=40&sel=persona:jesus&vel=3-meses');
  const r = await run(p, 16000);
  await p.context().close();
  const s = stops(r);
  const passing = r.msgs.filter((m) => m.play);
  console.log(`Décadas: ${s.length} stops (${s.map((x) => `${x.played.toFixed(2)} s played, ${x.lasted.toFixed(2)} s stopped`).join('; ')}), ${passing.length} events named in passing, ${r.dePaso.length} highlighted`);
  assert.ok(s.length >= 1, 'playback never stopped at an event');
  for (const x of s) {
    assert.ok(x.played >= 2.9, `a stop came after only ${x.played.toFixed(2)} s of playback`);
    assert.ok(x.lasted >= 2.3 && x.lasted <= 3.5, `a stop lasted ${x.lasted.toFixed(2)} s, not about 2.5`);
  }
  assert.ok(passing.length >= 2, `only ${passing.length} events were named while playback went on`);
  assert.ok(r.dePaso.length >= 1, 'no event passed in playback is highlighted on the timeline');
});

test('«Años»: every event stops playback for about 1.5 s, and nothing is highlighted', async () => {
  const p = await open('t=30.6&v=8&sel=persona:jesus');
  const r = await run(p, 9000);
  await p.context().close();
  const s = stops(r);
  console.log(`Años: ${s.length} stops (${s.map((x) => `${x.played.toFixed(2)} s played, ${x.lasted.toFixed(2)} s stopped`).join('; ')}), messages ${r.msgs.length}`);
  assert.ok(s.length >= 1, 'playback never stopped at an event');
  for (const x of s) assert.ok(x.lasted >= 1.3 && x.lasted <= 2.2, `a stop lasted ${x.lasted.toFixed(2)} s, not about 1.5`);
  assert.deepEqual(r.msgs.filter((m) => m.play).map((m) => m.texto), [], 'an event was named without stopping playback');
  assert.deepEqual(r.dePaso, [], 'marks were highlighted at «Años»');
});

test('«Pausar un momento en cada suceso» off: «Décadas» never stops; a pause by hand stays until play is pressed', async () => {
  let p = await open('t=29.8&v=40&sel=persona:jesus&vel=3-meses&pausa=0');
  let r = await run(p, 6000);
  await p.context().close();
  assert.equal(stops(r).length, 0, 'playback stopped with the pause off');
  assert.deepEqual(r.dePaso, [], 'marks were highlighted with the pause off');

  p = await open('t=29.8&v=40&sel=persona:jesus&vel=3-meses');
  await p.click('#reproducir');
  await p.waitForTimeout(1000);
  // Pause while it plays, in one go: a stop at an event between a check and a click would turn the click into a resume.
  await p.waitForFunction(() => window.BE.E.play && (document.querySelector('#reproducir').click(), true));
  const t0 = await p.evaluate(() => window.BE.E.t);
  await p.waitForTimeout(3500);
  const quieto = await p.evaluate(() => ({ play: window.BE.E.play, t: window.BE.E.t }));
  assert.equal(quieto.play, false, 'a pause by hand resumed by itself');
  assert.equal(quieto.t, t0, 'the cursor moved while paused by hand');
  await p.click('#reproducir');
  await p.waitForTimeout(800);
  const sigue = await p.evaluate(() => ({ play: window.BE.E.play, t: window.BE.E.t }));
  await p.context().close();
  assert.ok(sigue.t > t0, 'play after a pause by hand did not move the cursor');
});
