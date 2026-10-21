// The scroll bar of the timeline lanes stays when a change of scale makes the lanes fit, in a real headless browser.
//
// With Jesús selected around his birth, the lanes at «Meses» are shorter than at «Años» (fewer rows of events). With the
// line tall enough to hold the «Meses» lanes but not the «Años» ones, the bar used to vanish on «Años» -> «Meses» and come
// back on the way back, and the ruler and the lanes gained and lost its width (15 px), so every mark jumped sideways. The
// test sets the line to that height, measured on the page itself, and checks that neither the bar nor the width moves.
//
// Run from the repository root, one browser at a time:
//   node --test --test-concurrency=1 tests/site/timeline-scrollbar.test.mjs
// Needs python3 with requirements.txt (the data is built into a temporary directory) and playwright-core with a
// Chromium: either importable, or PLAYWRIGHT_MODULE_DIR=<a node_modules directory that holds it>. CHROME_PATH picks
// another Chromium binary. BE_ROOT=<a checkout> tests that checkout instead (the control: before the fix it fails).
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
const SCREEN = { viewport: { width: 1728, height: 1117 } };
const HASH = 'sel=persona:jesus';
const YEARS = 8, MONTHS = 1.5;

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

/** Opens the page with Jesús selected; `lineHeight` is a line height dragged earlier in the session, as the separator saves it. */
async function open(lineHeight) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...SCREEN });
  const p = await context.newPage();
  if (lineHeight) await p.addInitScript((v) => sessionStorage.setItem('biblical-atlas:marco:linea', String(v)), lineHeight);
  await p.goto(`${base}#${HASH}`);
  await p.waitForFunction(() => window.BE?.lineaMarcas && document.querySelector('#linea-filas .m'), null, { timeout: 25000 });
  await frames(p);
  return p;
}
/** Clicks a scale button, as a person does, and measures the lanes. */
async function scale(p, s) {
  await p.click(`.linea-barra [data-zoom="${s}"]`);
  await p.waitForFunction((v) => Math.abs(window.BE.E.vista[1] - window.BE.E.vista[0] - v) < 1e-6, s);
  await frames(p, 6);
  return p.evaluate(() => {
    const c = document.querySelector('#linea-cuerpo');
    return { bar: c.offsetWidth - c.clientWidth, content: c.scrollHeight, view: c.clientHeight, track: document.querySelector('#pista').clientWidth, line: document.querySelector('#linea').offsetHeight };
  });
}

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-timeline-scrollbar-'));
  execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--out', tmp], { cwd: ROOT, stdio: 'pipe' });
  server = await serve(path.join(ROOT, 'site'), tmp);
  base = `http://127.0.0.1:${server.address().port}/index.html`;
  const chromium = await loadChromium();
  // Headless Chromium hides scroll bars unless told not to (Playwright passes --hide-scrollbars): this test needs them.
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined, ignoreDefaultArgs: ['--hide-scrollbars'],
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
});
after(async () => {
  await browser?.close();
  server?.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

test('«Años» -> «Meses» -> «Años» with the lanes fitting only at «Meses»: the scroll bar and the width of the lanes stay', async (t) => {
  // 1. Measure the lanes at both scales, with the line as it opens.
  let p = await open();
  const years0 = await scale(p, YEARS), months0 = await scale(p, MONTHS);
  await p.context().close();
  // macOS draws overlay scroll bars that take no width, so there is nothing to measure there. Everywhere else (the Linux
  // runners) a bar of no width is a failure, never a skip: a skipped test would read as green.
  if (years0.bar === 0 && process.platform === 'darwin') { t.skip('macOS draws overlay scroll bars, which take no width: run it on Linux'); return; }
  assert.ok(years0.bar > 0, `at «Años» the lanes overflow (${years0.content}/${years0.view} px) but show no scroll bar`);
  assert.ok(years0.content > months0.content + 4, `the lanes at «Meses» (${months0.content} px) should be shorter than at «Años» (${years0.content} px); without that this test proves nothing`);

  // 2. A line whose lanes panel lies halfway between the two: «Años» overflows it, «Meses» fits.
  const chrome = years0.line - years0.view;
  const lineHeight = Math.round(chrome + (years0.content + months0.content) / 2);
  p = await open(lineHeight);
  const steps = [['Años', await scale(p, YEARS)], ['Meses', await scale(p, MONTHS)], ['Años again', await scale(p, YEARS)]];
  await p.context().close();
  console.log(steps.map(([n, m]) => `${n}: bar ${m.bar} px, lanes ${m.content}/${m.view} px, track ${m.track} px`).join('\n'));
  const [[, years], [, months]] = steps;
  assert.ok(years.content > years.view, `at «Años» the lanes (${years.content} px) should overflow the panel (${years.view} px): the line did not take ${lineHeight} px`);
  assert.ok(months.content <= months.view, `at «Meses» the lanes (${months.content} px) should fit the panel (${months.view} px)`);
  for (const [name, m] of steps) {
    assert.equal(m.bar, years0.bar, `at ${name} the scroll bar of the lanes is ${m.bar} px wide, not ${years0.bar}: it went away`);
    assert.equal(m.track, years.track, `at ${name} the track is ${m.track} px wide, not ${years.track}: the marks jumped sideways`);
  }
});
