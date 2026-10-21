// Playback on the timeline, in a real headless browser, with Jesús selected during his ministry.
//  - At «Décadas» (and up) a stop is earned: it comes only after 3 s of playback since the last one and lasts about
//    2.5 s; the events in between do not stop it, the bottom message names them as they pass and their marks stay
//    highlighted (.de-paso).
//  - At «Años» (and down) every event stops playback for about 1.5 s, as always, and nothing is highlighted.
//  - «Pausar un momento en cada suceso» off: no stop at all. A pause by hand stays paused until play is pressed again.
//  - The strip slides under the cursor, held near a third of the track, instead of jumping at the right edge; no lane
//    shrinks while playing, and a pause lays the rows out again. At «Meses» the month rows appear above the lane being
//    read without pushing it down.
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
    // The pause is sampled, so on a loaded runner its start can be seen a few hundred ms late (2.25 s measured for a
    // 2.5 s stop). 2.0 still tells it apart from the 1.5 s stop of the finer scales, which is what this guards.
    assert.ok(x.lasted >= 2.0 && x.lasted <= 3.5, `a stop lasted ${x.lasted.toFixed(2)} s, not about 2.5`);
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

/** Plays with the bottom message's stops off and records, on every frame while playing, how far the view moved (px),
    where the cursor is (fraction of the track), and which lanes shrank. */
async function slide(p, ms) {
  await p.evaluate(() => {
    const BE = window.BE, R = (window.__slide = { frames: 0, jump: 0, frac: [], shrinks: [] });
    let prev = null;
    const f = () => {
      const w = document.querySelector('#pista').clientWidth;
      const lanes = new Map([...document.querySelectorAll('#linea-filas .carril')].map((e) => [e.dataset.carril, e.hidden ? 0 : e.offsetHeight]));
      const cur = { v0: BE.E.vista[0], s: BE.E.vista[1] - BE.E.vista[0], t: BE.E.t, play: BE.E.play, lanes };
      if (prev?.play && cur.play) {
        R.frames++;
        R.jump = Math.max(R.jump, Math.abs(cur.v0 - prev.v0) / cur.s * w);
        R.frac.push((cur.t - cur.v0) / cur.s);
        for (const [id, h] of lanes) if (prev.lanes.has(id) && h < prev.lanes.get(id)) R.shrinks.push(`${id} ${prev.lanes.get(id)} -> ${h}`);
      }
      prev = cur;
      if (!window.__slideStop) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  await p.click('#reproducir');
  await p.waitForTimeout(ms);
  return p.evaluate(() => {
    window.__slideStop = true;
    if (window.BE.E.play) document.querySelector('#reproducir').click();
    return window.__slide;
  });
}
const laneHeights = (p) => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#linea-filas .carril')].map((e) => [e.dataset.carril, e.hidden ? 0 : e.offsetHeight])));

test('while playing the strip slides under a cursor held near a third, never jumps, and no lane shrinks; a pause lays the rows out again', async () => {
  // Six months per second at «Años»: in 12 s the cursor crosses most of the 8-year view, past where the view used to jump.
  const p = await open('t=29.5&v=8&sel=persona:jesus&pausa=0&vel=6-meses');
  const w = await p.evaluate(() => document.querySelector('#pista').clientWidth);
  const r = await slide(p, 12000);
  const last = r.frac.slice(-20);
  console.log(`slide: ${r.frames} frames, largest move ${r.jump.toFixed(1)} px, cursor from ${(r.frac[0] * 100).toFixed(0)} % to ${(r.frac[r.frac.length - 1] * 100).toFixed(0)} %, shrinks ${r.shrinks.length}`);
  assert.ok(r.frames >= 20, `only ${r.frames} frames played`);
  // One frame of six months per second moves the view a few px; the old jump moved it about 70 % of the track at once.
  assert.ok(r.jump < w * 0.05, `the view jumped ${r.jump.toFixed(0)} px in one frame (track ${w} px)`);
  assert.ok(Math.max(...r.frac) <= 0.45, `the cursor went as far as ${(Math.max(...r.frac) * 100).toFixed(0)} % of the track`);
  for (const f of last) assert.ok(Math.abs(f - 1 / 3) < 0.03, `after a while the cursor should sit at a third, not at ${(f * 100).toFixed(0)} %`);
  assert.deepEqual(r.shrinks, [], 'a lane shrank while playing');

  // Paused: the rows are laid out again, as a fresh page with the same view lays them out.
  await p.waitForTimeout(400);
  const held = await laneHeights(p);
  const view = await p.evaluate(() => ({ t: window.BE.E.t, vista: [...window.BE.E.vista] }));
  const q = await open('t=29.5&v=8&sel=persona:jesus&pausa=0&vel=6-meses');
  await q.evaluate(({ t, vista }) => { const BE = window.BE; BE.setT(t); BE.E.vista = vista; BE.sucio.linea = true; BE.programar(); }, view);
  await frames(q, 8);
  const fresh = await laneHeights(q);
  await p.context().close(); await q.context().close();
  assert.deepEqual(held, fresh, 'after the pause the lanes keep the rows frozen while playing');
});

test('«Años» -> «Meses»: the month rows appear above without pushing down the lane being read', async () => {
  const p = await open('sel=persona:jesus');
  const top = () => p.evaluate(() => {
    const c = document.querySelector('#linea-cuerpo'), y0 = c.getBoundingClientRect().top;
    const lanes = [...document.querySelectorAll('#linea-filas .carril:not([hidden])')].map((e) => ({ id: e.dataset.carril, y: e.getBoundingClientRect().top - y0, h: e.offsetHeight }));
    return { scroll: c.scrollTop, lanes };
  });
  await p.click('.linea-barra [data-zoom="8"]'); await frames(p, 8);
  const a = await top();
  await p.click('.linea-barra [data-zoom="1.5"]'); await frames(p, 8);
  const b = await top();
  const months = await p.evaluate(() => [...document.querySelectorAll('#linea-filas .carril--meses:not([hidden])')].length);
  await p.context().close();
  assert.ok(a.scroll > 0, 'the lanes should start scrolled down to Jesús; without that this test proves nothing');
  assert.ok(months > 0, 'no month rows at «Meses»');
  const lane = a.lanes.find((x) => x.y + x.h > 27 && b.lanes.some((y) => y.id === x.id));
  const after = b.lanes.find((x) => x.id === lane.id);
  console.log(`read lane ${lane.id}: ${lane.y.toFixed(0)} px -> ${after.y.toFixed(0)} px (scroll ${a.scroll} -> ${b.scroll})`);
  assert.ok(Math.abs(after.y - lane.y) <= 1, `the lane «${lane.id}» moved from ${lane.y.toFixed(0)} to ${after.y.toFixed(0)} px`);
});
