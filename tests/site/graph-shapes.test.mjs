// Shapes by node type (ideas doc, «Frontal»: in the light theme a person and an event are two greens, so a node's type
// must not depend on colour alone). In the light theme, in meeting mode and with the system asking for a dark scheme:
// - the six node types (persona, lugar, evento, periodo, hallazgo, texto) have six different shapes;
// - every node drawn in the graph, its centre and its breadcrumbs have the shape of their type;
// - the legend shows the shape of every type on the canvas, also on the phone (430 x 932, touch);
// - each type's fill has 3:1 against the view and the legend, and its letter 4.5:1 against the fill, uncertain nodes
//   included;
// - every node shape as it is drawn (nodes of other dates, uncertain ones, breadcrumbs and the rows of a «+N» list
//   included, with the opacity of everything above it) keeps 3:1 against what is behind it, by its fill or by a ring of
//   at least 2 px inside it, and its letter 4.5:1 against its fill.
//
// Run from the repository root:
//   node --test --test-concurrency=1 tests/site/graph-*.test.mjs
// Needs python3 with requirements.txt (the data is built into a temporary directory) and playwright-core with a
// Chromium: either importable, or PLAYWRIGHT_MODULE_DIR=<a node_modules directory that holds it>. CHROME_PATH picks
// another Chromium binary. BE_ROOT=<a checkout> tests that checkout's site instead of this one (the control).
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
const KINDS = ['persona', 'lugar', 'evento', 'periodo', 'hallazgo', 'texto'];
const THEMES = [
  { name: 'light', meeting: false, scheme: 'light' },
  { name: 'meeting', meeting: true, scheme: 'light' },
  { name: 'dark scheme', meeting: false, scheme: 'dark' },
];
// Pablo with every date shows persons, places, events and letters; Jerusalén shows periods and a find.
const VIEWS = ['grafo=pablo&gvista=grafo&gtodo=1', 'grafo=pablo.bernabe.lugar:jerusalen&gvista=grafo&gtodo=1', 'grafo=moises.aaron&gvista=grafo&gtodo=1'];

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
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-graph-shapes-'));
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

async function openGraph(screen, theme, hash) {
  const context = await browser.newContext({ viewport: { width: screen.width, height: screen.height }, deviceScaleFactor: 1, isMobile: screen.touch, hasTouch: screen.touch, colorScheme: theme.scheme });
  const page = await context.newPage();
  page.pageErrors = [];
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  // Meeting mode is a saved preference, read before the first paint.
  if (theme.meeting) await page.addInitScript(() => localStorage.setItem('biblical-earth:pref:reunion', '1'));
  // Only the local site: map tiles and fonts from other hosts are not needed to lay out the graph.
  await page.route((url) => !url.href.startsWith(base.slice(0, base.lastIndexOf('/'))), (route) => route.abort());
  await page.goto(`${base}#${hash}`);
  await page.waitForFunction(() => window.BE?.D && document.querySelector('#vista-grafo:not([hidden])'), null, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  return page;
}

/** In the page: the shape of every node type, of every drawn node and legend mark, and the contrasts. */
function inspect(kinds) {
  const v = document.querySelector('#vista-grafo');
  const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  // A node's shape and fill live on the element or, when the site draws it there, on its ::before.
  const paint = (el) => {
    const b = getComputedStyle(el, '::before'), own = getComputedStyle(el);
    const s = b.content && b.content !== 'none' ? b : own;
    return { shape: `${s.borderRadius} | ${s.transform}`, fill: s.backgroundColor, letter: own.color };
  };
  const kindOf = (el) => (el.className.match(/be-node--(persona|lugar|evento|periodo|hallazgo|texto)\b/) || [])[1];
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.innerHTML = kinds.map((k) => `<span class="be-node be-node--${k}">A</span>`).join('');
  v.append(probe);
  const ref = Object.fromEntries([...probe.children].map((el) => [kindOf(el), paint(el)]));
  probe.remove();
  const drawn = [...v.querySelectorAll('.grafo-lienzo .be-node, .migas-grafo .be-node')].filter((el) => kindOf(el))
    .map((el) => ({ kind: kindOf(el), uncertain: !!el.closest('.gnodo--incierto'), ...paint(el), text: (el.closest('.be-gnode')?.querySelector('.be-gnode__label') || el.closest('.miga') || el).textContent.trim() }));
  // Each shape as it is seen: fill and ring over what is behind it, with the opacity of everything above it.
  const parse = (c) => {
    let m = String(c).match(/color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.]+))?\)/);
    if (m) return { r: m[1] * 255, g: m[2] * 255, b: m[3] * 255, a: m[4] == null ? 1 : +m[4] };
    m = String(c).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4] } : null;
  };
  const L = ({ r, g, b }) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const R = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const over = (c, bg, a) => ({ r: c.r * a + bg.r * (1 - a), g: c.g * a + bg.g * (1 - a), b: c.b * a + bg.b * (1 - a) });
  const behind = (el) => { for (let e = el.parentElement; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.5) return c; } return { r: 255, g: 255, b: 255 }; };
  const opacity = (el) => { let o = 1; for (let e = el; e && e !== document.documentElement; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
  const seen = [...v.querySelectorAll('.grafo-lienzo .be-node, .migas-grafo .be-node, #grafo-tarjeta .grafo-resto .be-node')].filter((el) => kindOf(el) && el.checkVisibility()).map((el) => {
    const b = getComputedStyle(el, '::before'), own = getComputedStyle(el);
    const src = b.content && b.content !== 'none' ? b : own;
    const bg = behind(el), op = opacity(el), f0 = parse(src.backgroundColor) || { r: 0, g: 0, b: 0, a: 0 };
    const fill = over(f0, bg, f0.a * op);
    const ring = String(src.boxShadow).match(/^(rgba?\([^)]*\)) 0px 0px 0px ([\d.]+)px inset/);
    const rc = ring && +ring[2] >= 2 ? parse(ring[1]) : null;
    const edge = Math.max(R(fill, bg), rc ? R(over(rc, bg, rc.a * op), bg) : 0);
    const lc = parse(own.color);
    const where = el.closest('.miga') ? 'breadcrumb' : el.closest('.grafo-resto') ? '«+N» row' : 'canvas';
    const text = (el.closest('.be-gnode, .miga, .grafo-resto__fila')?.querySelector('.be-gnode__label, .grafo-resto__nombre') || el.closest('.miga') || el).textContent.trim();
    return { kind: kindOf(el), where, text, edge, letter: R(over(lc, fill, lc.a * op), fill) };
  });
  const legend = v.querySelector('.grafo-leyenda');
  if (legend && !legend.open) legend.open = true;
  const marks = legend && legend.checkVisibility() ? [...legend.querySelectorAll('.leyenda-nodo')].map((el) => ({ kind: kindOf(el), ...paint(el) })) : null;
  return {
    ref, drawn, marks, seen,
    background: getComputedStyle(v).backgroundColor,
    legendBackground: legend ? getComputedStyle(legend).backgroundColor : null,
    contrasts: kinds.map((k) => ({ kind: k, view: ratio(ref[k].fill, getComputedStyle(v).backgroundColor), legend: legend ? ratio(ref[k].fill, getComputedStyle(legend).backgroundColor) : null, letter: ratio(ref[k].letter, ref[k].fill) })),
    uncertainLetters: drawn.filter((d) => d.uncertain).map((d) => ({ text: d.text, kind: d.kind, letter: ratio(d.letter, d.fill) })),
  };
}

test('each node type has its own shape, in the graph and in the legend, in every theme', async (t) => {
  const failures = [];
  for (const theme of THEMES) {
    for (const hash of VIEWS) {
      const view = `${theme.name} ${hash.split('&')[0]}`;
      const page = await openGraph({ width: 1440, height: 900, touch: false }, theme, hash);
      // A «+N» list open, so its rows are measured too.
      await page.evaluate(() => document.querySelector('#vista-grafo [data-grafo-abrir]')?.click());
      await page.waitForTimeout(150);
      const r = await page.evaluate(inspect, KINDS);
      await page.context().close();
      const shapes = new Map();
      for (const k of KINDS) shapes.set(r.ref[k].shape, [...(shapes.get(r.ref[k].shape) || []), k]);
      for (const ks of shapes.values()) if (ks.length > 1) failures.push(`${view}: ${ks.join(' and ')} share one shape (${r.ref[ks[0]].shape})`);
      for (const d of r.drawn) if (d.shape !== r.ref[d.kind].shape) failures.push(`${view}: «${d.text}» (${d.kind}) is drawn as ${d.shape}, not as its type`);
      const onCanvas = [...new Set(r.drawn.map((d) => d.kind))];
      if (!r.marks) failures.push(`${view}: no legend`);
      else {
        for (const k of onCanvas) if (!r.marks.some((m) => m.kind === k)) failures.push(`${view}: the legend does not show ${k}`);
        for (const m of r.marks) if (m.shape !== r.ref[m.kind].shape) failures.push(`${view}: the legend draws ${m.kind} as ${m.shape}, the graph as ${r.ref[m.kind].shape}`);
      }
      for (const c of r.contrasts) {
        if (c.view < 3) failures.push(`${view}: ${c.kind} fill has ${c.view.toFixed(2)}:1 against the view`);
        if (c.legend != null && c.legend < 3) failures.push(`${view}: ${c.kind} fill has ${c.legend.toFixed(2)}:1 against the legend`);
        if (c.letter < 4.5) failures.push(`${view}: ${c.kind} letter has ${c.letter.toFixed(2)}:1 against its fill`);
      }
      for (const u of r.uncertainLetters) if (u.letter < 4.5) failures.push(`${view}: the letter of uncertain «${u.text}» (${u.kind}) has ${u.letter.toFixed(2)}:1`);
      for (const d of r.seen) {
        if (d.edge < 3) failures.push(`${view}: the ${d.where} shape of «${d.text}» (${d.kind}) has ${d.edge.toFixed(2)}:1 against what is behind it`);
        if (d.letter < 4.5) failures.push(`${view}: the letter of the ${d.where} node «${d.text}» (${d.kind}) has ${d.letter.toFixed(2)}:1`);
      }
      if (!r.seen.some((d) => d.where === 'breadcrumb') || !r.seen.some((d) => d.where === '«+N» row')) failures.push(`${view}: breadcrumbs or «+N» rows were not measured`);
      t.diagnostic(`${view}: ${shapes.size} shapes for ${KINDS.length} types; on the canvas ${onCanvas.join(', ')}; ${r.drawn.length} nodes, ${r.uncertainLetters.length} uncertain; legend ${r.marks ? r.marks.map((m) => m.kind).join(', ') : 'missing'}; lowest fill ${Math.min(...r.contrasts.map((c) => Math.min(c.view, c.legend ?? 99))).toFixed(2)}:1; ${r.seen.length} shapes as drawn, lowest ${Math.min(...r.seen.map((d) => d.edge)).toFixed(2)}:1, lowest letter ${Math.min(...r.seen.map((d) => d.letter)).toFixed(2)}:1`);
    }
  }
  assert.deepEqual(failures, []);
});

test('on the phone the legend is there and shows the shapes', async (t) => {
  const failures = [];
  for (const theme of THEMES.slice(0, 2)) {
    const view = `430 ${theme.name}`;
    const page = await openGraph({ width: 430, height: 932, touch: true }, theme, 'grafo=pablo&gvista=grafo');
    const summary = await page.evaluate(() => {
      const s = document.querySelector('#vista-grafo .grafo-leyenda > summary');
      if (!s || !s.checkVisibility()) return null;
      const b = s.getBoundingClientRect();
      const hit = document.elementFromPoint(b.left + 20, b.top + b.height / 2);
      return { x: b.left + 20, y: b.top + b.height / 2, reachable: !!hit?.closest('.grafo-leyenda') };
    });
    if (!summary) { failures.push(`${view}: no legend`); await page.context().close(); continue; }
    if (!summary.reachable) failures.push(`${view}: the legend is under another element`);
    else await page.touchscreen.tap(summary.x, summary.y);
    await page.waitForTimeout(400);
    const r = await page.evaluate(inspect, KINDS);
    const legendBox = await page.evaluate(() => {
      const v = document.querySelector('#vista-grafo'), l = v.querySelector('.grafo-leyenda');
      const bottom = v.getBoundingClientRect().bottom - parseFloat(getComputedStyle(v).paddingBottom);
      return { bottom: l.getBoundingClientRect().bottom, limit: bottom };
    });
    await page.context().close();
    if (legendBox.bottom > legendBox.limit + 1) failures.push(`${view}: the open legend runs ${Math.round(legendBox.bottom - legendBox.limit)} px under the folded sheet`);
    const onCanvas = [...new Set(r.drawn.map((d) => d.kind))];
    for (const k of onCanvas) if (!r.marks?.some((m) => m.kind === k && m.shape === r.ref[k].shape)) failures.push(`${view}: the legend does not show the shape of ${k}`);
    t.diagnostic(`${view}: legend ${r.marks ? r.marks.map((m) => m.kind).join(', ') : 'missing'}; on the canvas ${onCanvas.join(', ')}`);
  }
  assert.deepEqual(failures, []);
});
