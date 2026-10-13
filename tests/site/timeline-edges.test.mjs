// What the edges of the timeline strip say, in a real headless browser. A bar, or the window of dates of a moment, that
// goes on past the left or the right edge of the strip carries an arrow at that edge, a lighter end under it and a text
// that says it goes on («Empieza antes de lo que se ve: 716-661 a.e.c.»); one that starts or ends inside the strip does
// not. Before this, a bar cut by the edge looked like it started or ended there: at a scale of centuries every era and
// every reign seemed to begin at the left edge.
//
// It walks the six scales around 50 e.c. and inside the reign of Manasseh (716-661 a.e.c.), at 1440x900 with a mouse and
// at 430x932 with touch, in the light theme, with the browser asking for a dark one and in meeting mode, and checks
// every mark the page draws: an arrow on exactly the sides that are cut, at the edge of the track, never under the
// name, and the text in its tooltip and its accessible name.
//
// Run from the repository root, one browser at a time:
//   node --test --test-concurrency=1 tests/site/timeline-edges.test.mjs
// Needs python3 with requirements.txt (the data is built into a temporary directory) and playwright-core with a
// Chromium: either importable, or PLAYWRIGHT_MODULE_DIR=<a node_modules directory that holds it>. CHROME_PATH picks
// another Chromium binary. BE_ROOT=<a checkout> tests that checkout's site instead of this one (the control: on a
// checkout from before the arrows, every cut mark is reported).
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
const SCREENS = {
  1440: { viewport: { width: 1440, height: 900 } },
  430: { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true },
};
const THEMES = ['claro', 'oscuro', 'reunión'];
const SCALES = [4125, 400, 40, 8, 1.5, 0.12];
// 50 e.c. and the middle of the reign of Manasseh: at years, months and days the view lies inside the reign.
const CENTERS = [50.5, -687.5];

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
const errors = [];
async function open(screen, theme, hash) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...SCREENS[screen], colorScheme: theme === 'oscuro' ? 'dark' : 'light' });
  if (theme === 'reunión') await context.addInitScript(() => { try { localStorage.setItem('biblical-atlas:pref:reunion', '1'); } catch { /* none */ } });
  const p = await context.newPage();
  p.on('pageerror', (e) => errors.push(`${screen} ${theme} pageerror: ${e.message}`));
  await p.goto(hash ? `${base}#${hash}` : base);
  await p.waitForFunction(() => window.BE?.lineaMarcas && document.querySelector('#linea-filas .m'), null, { timeout: 60000 });
  if (theme === 'reunión') assert.ok(await p.evaluate(() => document.documentElement.classList.contains('be-reunion')), 'meeting mode is on');
  await frames(p);
  return p;
}
const frames = (p, n = 3) => p.evaluate((k) => new Promise((r) => { const go = (i) => (i ? requestAnimationFrame(() => go(i - 1)) : r()); go(k); }), n);
async function goTo(p, t, span) {
  await p.evaluate(([t, s]) => {
    const BE = window.BE;
    BE.setT(t);
    const v0 = Math.max(BE.T_MIN, Math.min(BE.T_MAX - s, t - 0.5 * s));
    BE.E.vista = [v0, v0 + s];
    BE.sucio.linea = true; BE.programar();
    document.querySelector('#linea-cuerpo').scrollTop = 0;
  }, [t, span]);
  await frames(p);
}

/** Every mark the page draws, measured on the page: the sides where its bar or its window of dates passes the edge of
    the strip (from its dates and the view alone), the arrows it shows, where they are, and its texts. */
function edges(p) {
  return p.evaluate(() => {
    const BE = window.BE, [v0, v1] = BE.E.vista;
    const marks = new Map(BE.lineaMarcas().filter((m) => m.visible).map((m) => [m.id, m]));
    const out = { problems: [], cut: 0, whole: 0, both: 0, yielded: 0, dimmed: 0, samples: [] };
    // The colours an arrow may take: --ink-2, and --ink-3 on a mark dimmed by the selection, as its name.
    const tinta = (v) => { const e = document.createElement('i'); e.style.color = `var(${v})`; document.body.append(e); const c = getComputedStyle(e).color; e.remove(); return c; };
    const ink2 = tinta('--ink-2'), ink3 = tinta('--ink-3');
    const focus = !document.querySelector('#linea-filas').classList.contains('sin-foco');
    for (const b of document.querySelectorAll('#linea-filas .carril:not([hidden]) .carril-pista > .m')) {
      const m = marks.get(b.dataset.id);
      if (!m) continue;
      const pista = b.parentElement, pr = pista.getBoundingClientRect(), w = pista.clientWidth, ppy = w / (v1 - v0);
      const lane = b.closest('.carril').dataset.carril;
      // Only what is drawn can be cut: a moment whose window is too short to draw has none.
      const drawn = b.querySelector('.m-barra') || [...b.querySelectorAll('.m-ventana')].find((e) => !e.hidden);
      const x0 = (m.t0 - v0) * ppy, x1 = (m.t1 - v0) * ppy;
      const cut = drawn ? [x0 < -0.5, x1 > w + 0.5] : [false, false];
      const arrows = ['izq', 'der'].map((l) => { const e = b.querySelector(`.m-sigue.${l}`); return e && e.checkVisibility() ? e.getBoundingClientRect() : null; });
      const name = b.querySelector('.m-nombre .t').getBoundingClientRect();
      const who = `${lane}: «${m.name}» [${x0.toFixed(0)}, ${x1.toFixed(0)}] of ${w} px`;
      for (const i of [0, 1]) {
        const a = arrows[i];
        // The one cut side without an arrow: a name with no room beside its dot sits over the arrow's place (2 to 9 px
        // from the edge), and the name wins over the arrow, never over the dot. The lighter end and the text stay.
        const nameOver = i === 0 ? name.left < pr.left + 10 : name.right > pr.right - 10;
        if (cut[i] && !a && nameOver) { out.yielded++; continue; }
        if (cut[i] !== !!a) { out.problems.push(`${who}: ${cut[i] ? 'goes on' : 'ends inside'} at the ${i ? 'right' : 'left'} and ${a ? 'has' : 'has no'} arrow there`); continue; }
        if (!a) continue;
        const dim = focus && b.matches('.atenuado');
        const color = getComputedStyle(b.querySelector(`.m-sigue.${i ? 'der' : 'izq'}`)).backgroundColor;
        if (color !== (dim ? ink3 : ink2)) out.problems.push(`${who}: the ${i ? 'right' : 'left'} arrow is ${color} on a ${dim ? 'dimmed' : 'plain'} mark, want ${dim ? ink3 : ink2}`);
        if (dim) out.dimmed++;
        if (i === 0 ? a.left < pr.left - 0.5 || a.left > pr.left + 4 : a.right > pr.right + 0.5 || a.right < pr.right - 4) out.problems.push(`${who}: the ${i ? 'right' : 'left'} arrow is not at the edge (${(a.left - pr.left).toFixed(1)} px)`);
        const ar = b.getBoundingClientRect();
        if (Math.abs(a.top + a.height / 2 - (ar.top + ar.height / 2)) > 1.5) out.problems.push(`${who}: the arrow is not in the middle of its row`);
        if (Math.min(a.right, name.right) - Math.max(a.left, name.left) > 1 && Math.min(a.bottom, name.bottom) - Math.max(a.top, name.top) > 1) out.problems.push(`${who}: its name covers the ${i ? 'right' : 'left'} arrow`);
      }
      const says = cut[0] || cut[1];
      const want = !says ? '' : m.shape === 'moment' ? (cut[0] && cut[1] ? 'Pudo ser antes o después de lo que se ve' : cut[0] ? 'Pudo ser antes de lo que se ve' : 'Pudo ser después de lo que se ve')
        : (cut[0] && cut[1] ? 'Empieza antes y sigue después de lo que se ve' : cut[0] ? 'Empieza antes de lo que se ve' : 'Sigue después de lo que se ve');
      const title = b.getAttribute('title') || '';
      if (says ? !title.startsWith(want) : title) out.problems.push(`${who}: tooltip «${title}», want «${want}…»`);
      if (says && !b.getAttribute('aria-label').endsWith(title)) out.problems.push(`${who}: the accessible name does not say it goes on`);
      if (says) { out.cut++; if (cut[0] && cut[1]) out.both++; if (out.samples.length < 3) out.samples.push(`${lane}: ${title}`); } else out.whole++;
    }
    return out;
  });
}

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-timeline-edges-'));
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

for (const screen of Object.keys(SCREENS)) {
  test(`${screen}: in the range the atlas opens with, what goes on past an edge says so`, async () => {
    const p = await open(screen, 'claro');
    const r = await edges(p);
    const vista = await p.evaluate(() => window.BE.E.vista.map((x) => x.toFixed(2)).join(' – '));
    console.log(`${screen} default range ${vista}: ${r.cut} marks go on past an edge (${r.both} past both), ${r.whole} end inside. ${r.samples.join(' | ')}`);
    assert.deepEqual(r.problems, []);
    assert.ok(r.cut >= 2, `only ${r.cut} marks go on past an edge in the default range`);
    await p.context().close();
  });

  test(`${screen}: inside the reign of Manasseh its bar says it starts before and goes on after the strip`, async () => {
    const p = await open(screen, 'claro', 't=-690&v=8');
    const r = await edges(p);
    assert.deepEqual(r.problems, []);
    const m = await p.evaluate(() => {
      const b = document.querySelector('#linea-filas .m[data-id="periodo:manases-de-juda"]');
      return b && { title: b.title, izq: b.querySelector('.m-sigue.izq')?.checkVisibility(), der: b.querySelector('.m-sigue.der')?.checkVisibility() };
    });
    console.log(`${screen} Manasseh at 8 years: ${JSON.stringify(m)}`);
    assert.deepEqual(m, { title: 'Empieza antes y sigue después de lo que se ve: 716-661 a.e.c.', izq: true, der: true });
    // The same reign held whole at a scale of centuries: no arrow, no tooltip. On the phone its row falls below the strip
    // at that scale, and a row out of sight is not drawn: scroll to it first.
    await goTo(p, -687.5, 400);
    await p.evaluate(() => {
      const m = window.BE.lineaMarcas().find((x) => x.id === 'periodo:manases-de-juda');
      if (m?.visible) document.querySelector('#linea-cuerpo').scrollTop = Math.max(0, m.top - 40);
    });
    await frames(p);
    const whole = await p.evaluate(() => {
      const b = document.querySelector('#linea-filas .m[data-id="periodo:manases-de-juda"]');
      return b && { title: b.title, arrows: [...b.querySelectorAll('.m-sigue')].filter((e) => e.checkVisibility()).length };
    });
    assert.deepEqual(whole, { title: '', arrows: 0 });
    await p.context().close();
  });

  test(`${screen}: with Paul chosen, the arrow of a dimmed mark is as light as its name`, async () => {
    const p = await open(screen, 'claro', 'sel=persona:pablo&t=50.3000&v=8');
    const r = await edges(p);
    console.log(`${screen} Paul chosen at 8 years: ${r.cut} marks cut by an edge, ${r.dimmed} arrows on dimmed marks`);
    assert.deepEqual(r.problems, []);
    assert.ok(r.dimmed >= 1, 'no dimmed mark with an arrow in view');
    await p.context().close();
  });

  for (const theme of THEMES) {
    test(`${screen}, ${theme}: at the six scales every mark has an arrow on exactly the sides where it goes on`, async () => {
      const p = await open(screen, theme);
      let cut = 0, whole = 0, yielded = 0;
      const problems = [];
      for (const t of CENTERS) for (const s of SCALES) {
        await goTo(p, t, s);
        const r = await edges(p);
        cut += r.cut; whole += r.whole; yielded += r.yielded;
        problems.push(...r.problems.map((x) => `${s} years around ${t}: ${x}`));
      }
      console.log(`${screen} ${theme}: ${cut} marks cut by an edge and ${whole} whole, over ${CENTERS.length * SCALES.length} views; ${yielded} arrows under a name with no other room`);
      assert.deepEqual(problems.slice(0, 20), []);
      assert.ok(cut > 20 && whole > 20, `${cut} cut and ${whole} whole: the walk did not see both kinds`);
      await p.context().close();
    });
  }
}

test('no page error in the whole run', () => {
  assert.deepEqual(errors, []);
});
