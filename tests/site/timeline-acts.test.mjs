// Where the timeline puts the people and events of Acts (the review of the Hechos reading), tested in a real headless
// browser through what the site exposes on window.BE and through the flag of the timeline cursor.
//
//  - Jesus is nowhere after the ascension, and his Jerusalén meeting of Acts 1:4, 5 falls between the resurrection and
//    the ascension instead of spreading over the whole of 33.
//  - The election of Matías falls between the ascension and Pentecost, and it does not keep Matías in Jerusalén all year.
//  - The death of Herod Agrippa I comes after the Passover of 44 (Acts 12), not anywhere in 44.
//  - On the second journey Paul does not go south to Damascus on his way from Antioch to Troas.
//  - Paul's events land on the right visit: the preaching in Perga on the way back (Acts 14:25), the delivery of the
//    decisions of Jerusalem after Timothy joins in Lystra and before the spirit closes Asia (Acts 16:1-6), the arrest in
//    the temple in the custody (Acts 21:27) and the sailing to Rome after the defence before Agrippa (Acts 27:1).
//  - The account of Philip in Samaria (Acts 8) is not squeezed into the days before Saul's conversion (Acts 9): an
//    event of Acts dated with a range of years keeps a window of days, not hours.
//
// Run from the repository root, one browser at a time:
//   node --test --test-concurrency=1 tests/site/timeline-*.test.mjs
// Needs python3 with requirements.txt (the data is built into a temporary directory) and playwright-core with a
// Chromium: either importable, or PLAYWRIGHT_MODULE_DIR=<a node_modules directory that holds it>. CHROME_PATH picks
// another Chromium binary. BE_ROOT=<a checkout> tests that checkout's data and site instead of this one (the control).
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
const PHONE = { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true };

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

let browser, server, base, tmp, page;
const errors = [];
async function open(hash = '', opts = DESKTOP) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...opts });
  const p = await context.newPage();
  p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver Message|ReadPixels/.test(m.text())) errors.push(`console: ${m.text()}`); });
  await p.goto(`${base}${hash ? `#${hash}` : ''}`);
  await p.waitForFunction(() => window.BE && window.BE.D && Array.isArray(window.BE.P) && window.BE.P.length, null, { timeout: 20000 });
  return p;
}
before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-timeline-hechos-'));
  execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--salida', tmp], { cwd: ROOT, stdio: 'pipe' });
  server = await serve(path.join(ROOT, 'site'), tmp);
  base = `http://127.0.0.1:${server.address().port}/index.html`;
  const chromium = await loadChromium();
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  page = await open();
});
after(async () => {
  await browser?.close();
  server?.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

/** Window [a, b) the site gives an event, by id. */
const windowOf = (id) => page.evaluate((id) => {
  const e = window.BE.D.eventos.find((x) => x.id === id);
  return e ? window.BE.ventanaEvento(e) : null;
}, id);
const momentOf = async (id) => { const w = await windowOf(id); return w && (w[0] + w[1]) / 2; };
const DAY = 1 / 365.2425;

test('Jesus is nowhere after the ascension, and the Jerusalén meeting of Acts 1:4, 5 is before it', async () => {
  const up = await windowOf('ascension-de-jesus');
  const risen = await windowOf('resurreccion-de-jesus');
  const meeting = await windowOf('manda-esperar-en-jerusalen');
  assert.ok(up && risen && meeting, 'the ascension, the resurrection and the meeting exist');
  assert.ok(meeting[0] >= risen[1] - 1e-9 && meeting[1] <= up[0] + 1e-9,
    `the Jerusalén meeting falls between the resurrection (${risen[1].toFixed(4)}) and the ascension (${up[0].toFixed(4)}), got ${meeting.map((x) => x.toFixed(4)).join(' to ')}`);
  const placed = await page.evaluate(([from]) => {
    const out = [];
    for (let t = from + 0.001; t < 34; t += 0.01) {
      const w = window.BE.donde('jesus', t);
      if (w) out.push(`${t.toFixed(3)} ${w.parada ? 'en' : 'hacia'} ${(w.parada ? w.en : w.sig).lugar.id}`);
    }
    return out;
  }, [up[1]]);
  assert.deepEqual(placed, [], 'after the ascension no moment of 33 places Jesus anywhere');
});

test('the timeline flag does not put Jesus in Jerusalén after the ascension, on a desktop and on a phone', async () => {
  // Positive control: during the Jerusalén meeting the same flag does name him, so a silent flag is not a pass.
  const meeting = await windowOf('manda-esperar-en-jerusalen');
  const during = ((meeting[0] + meeting[1]) / 2).toFixed(4);
  for (const opts of [DESKTOP, PHONE]) {
    const p = await open(`t=${during}&sel=persona:jesus`, opts);
    await p.waitForFunction(() => document.querySelector('#pista')?.getAttribute('aria-valuetext'), null, { timeout: 10000 });
    const flagDuring = await p.getAttribute('#pista', 'aria-valuetext');
    assert.match(flagDuring, /Jesús en Jerusalén/, `${opts.viewport.width} px at ${during}, during the meeting: the flag says «${flagDuring}»`);
    await p.context().close();
    const q = await open('t=33.5000&sel=persona:jesus', opts);
    await q.waitForFunction(() => document.querySelector('#pista')?.getAttribute('aria-valuetext'), null, { timeout: 10000 });
    const flag = await q.getAttribute('#pista', 'aria-valuetext');
    assert.doesNotMatch(flag, /Jesús (en|hacia) /, `${opts.viewport.width} px: the flag says «${flag}»`);
    await q.context().close();
  }
  assert.deepEqual(errors, [], 'no page error or console error while the pages loaded');
});

test('the election of Matías falls between the ascension and Pentecost', async () => {
  const up = await windowOf('ascension-de-jesus');
  const pentecost = await windowOf('pentecostes-33');
  const vote = await windowOf('eleccion-de-matias');
  assert.ok(up && pentecost && vote, 'the three events exist');
  assert.ok(vote[0] >= up[1] - 1e-9 && vote[1] <= pentecost[0] + 1e-9,
    `the election is between ${up[1].toFixed(4)} and ${pentecost[0].toFixed(4)}, got ${vote.map((x) => x.toFixed(4)).join(' to ')}`);
  const matias = await page.evaluate(() => [33.2, 33.9].map((t) => window.BE.donde('matias', t)?.en?.sel || null));
  assert.deepEqual(matias, [null, null], 'before the ascension and late in 33 nothing places Matías; his election does not last the year');
});

test('Herod Agrippa I dies after the Passover of 44, not anywhere in 44', async () => {
  const freed = await windowOf('pedro-liberado-de-la-carcel');
  const death = await windowOf('muerte-de-herodes-agripa-i');
  assert.ok(freed && death, 'both events exist');
  assert.ok(death[0] >= freed[1] - 1e-9, `the death starts after Peter is freed (${freed[1].toFixed(4)}), got ${death[0].toFixed(4)}`);
});

test('on the second journey Paul does not go south to Damascus between Antioch and Troas', async () => {
  const r = await page.evaluate(() => {
    const BE = window.BE, dam = BE.L.damasco;
    const stops = BE.P.filter((s) => s.viaje.id === 'segundo-viaje');
    const troas = stops.find((s) => s.lugar.id === 'troas');
    const early = stops.slice(0, stops.indexOf(troas) + 1);
    const atDamascus = early.filter((s) => Math.abs(s.lugar.lat - dam.lat) < 1e-6 && Math.abs(s.lugar.lon - dam.lon) < 1e-6).map((s) => `${s.key} ${s.lugar.id}`);
    const south = [];
    for (let t = early[0].b; t <= troas.a; t += 1 / 365.2425) {
      const w = BE.dondeEsta(t);
      if (w && w.pos[1] < 35.5) south.push(`${t.toFixed(3)} ${w.pos[1].toFixed(2)} N`);
    }
    return { atDamascus, south: south.slice(0, 5), n: south.length };
  });
  assert.deepEqual(r.atDamascus, [], 'no stop before Troas sits on the point of Damascus');
  assert.equal(r.n, 0, `Paul stays north of 35.5 N (Antioch is at 36.2 N) until Troas; first moments south: ${r.south.join(', ')}`);
});

test('Paul preaches in Perga on the way back, after the elders are appointed (Acts 14:23-25)', async () => {
  const elders = await momentOf('nombran-ancianos-en-galacia');
  const perga = await momentOf('predican-en-perga');
  assert.ok(elders != null && perga != null, 'both events exist');
  assert.ok(perga > elders, `Perga (${perga.toFixed(3)}) comes after the elders (${elders.toFixed(3)})`);
});

test('the decisions of Jerusalem are delivered after Timothy joins and before the spirit closes Asia (Acts 16:1-6)', async () => {
  const timothy = await momentOf('timoteo-se-une-a-pablo');
  const decisions = await momentOf('pablo-entrega-las-decisiones-de-jerusalen');
  const asia = await momentOf('el-espiritu-cierra-asia-y-bitinia');
  assert.ok(timothy != null && decisions != null && asia != null, 'the three events exist');
  assert.ok(decisions >= timothy - DAY && decisions < asia,
    `Timothy ${timothy.toFixed(3)} <= decisions ${decisions.toFixed(3)} < Asia closed ${asia.toFixed(3)}`);
});

test('Philip in Samaria (Acts 8) keeps days, not hours, and may run past Saul\'s conversion (Acts 9)', async () => {
  const conversion = await windowOf('conversion-de-pablo');
  assert.ok(conversion, 'the conversion exists');
  const ids = ['felipe-predica-en-samaria', 'pedro-y-juan-en-samaria', 'felipe-y-el-funcionario-etiope', 'felipe-de-asdod-a-cesarea'];
  const windows = await Promise.all(ids.map(windowOf));
  windows.forEach((w, i) => {
    assert.ok(w, `${ids[i]} exists`);
    assert.ok(w[1] - w[0] >= 7 * DAY, `${ids[i]} lasts ${((w[1] - w[0]) / DAY).toFixed(2)} days, at least 7`);
  });
  assert.ok(windows.at(-1)[1] > conversion[1], `Acts 8 may end after the conversion (${conversion[1].toFixed(4)}): the last one ends at ${windows.at(-1)[1].toFixed(4)}`);
  // The same floor for every event of Acts dated with a range of years: the account does not squeeze it into hours.
  const short = await page.evaluate((day) => window.BE.D.eventos.filter((e) => {
    const f = e.fecha;
    if (!(e.pasajes || []).some((p) => /^\s*Hch\b/.test(p)) || !(f && f.desde != null && f.hasta != null && f.hasta > f.desde)) return false;
    const w = window.BE.ventanaEvento(e);
    return !w || w[1] - w[0] < 5 * day;
  }).map((e) => e.id), DAY);
  assert.deepEqual(short, [], 'no event of Acts dated with a range of years gets a window under 5 days');
});

test('the arrest in the temple is placed in the custody, and the ship to Rome sails after the defence before Agrippa', async () => {
  const r = await page.evaluate(() => {
    const BE = window.BE, w = (id) => BE.ventanaEvento(BE.D.eventos.find((e) => e.id === id));
    const arrest = w('arresto-en-el-templo'), defence = w('defensa-ante-agripa'), sail = w('zarpan-hacia-roma');
    const at = BE.dondeEsta((arrest[0] + arrest[1]) / 2);
    return { journey: BE.viajeActual(at)?.id, where: at?.parada ? at.en.lugar.id : null, defence, sail };
  });
  assert.equal(r.journey, 'custodia-en-cesarea', 'Acts 21:27 happens in the custody, the stop whose reference holds it');
  assert.equal(r.where, 'jerusalen', 'the arrest is in Jerusalén');
  assert.ok(r.sail[0] >= r.defence[1] - 1e-9, `the ship leaves (${r.sail[0].toFixed(4)}) after the defence ends (${r.defence[1].toFixed(4)})`);
});
