// Radial graph without overlaps (ideas doc, proposal 11): a headless test that fails with any overlap.
//
// Opens the graph of Jesús, Pablo, Abrahán, David, Moisés, Jerusalén and the node with the most relations in the data,
// at 1440 x 900 (mouse) and 430 x 932 (touch, graph view requested by hand), with "Solo lo vigente" on and off. In
// every view no two nodes, labels, meta lines or sector labels may overlap, and nothing may fall outside the canvas or
// under another element (the folded sheet on the phone). No edge may run through another node's shape, name or meta
// line, or through a sector label (more than 3 px inside its box). The meta line (verb and reference) goes on nodes
// whose edge is strong and current. A line that touches an event carries its word instead (a few words: «presente»,
// «estuvo aquí», «ocurre aquí»), and an event or a stop says also when it is against the cursor («ocurre ahora»,
// «3 meses antes»), which the rule for events asks for (events are shown by their distance to the cursor, not by the
// switch); so does a line between a person and a place that comes from an event. Any other node carries no meta line;
// nodes of other dates carry «ya pasó» or «aún no», or the time words of their event. No meta line and no «+N» label
// may be cut with an ellipsis.
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
const FIXED = ['jesus', 'pablo', 'abrahan', 'david', 'moises', 'lugar:jerusalen'];
const SCREENS = [
  { name: '1440', width: 1440, height: 900, touch: false },
  { name: '430', width: 430, height: 932, touch: true },
];

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
before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-graph-overlap-'));
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

async function openGraph(screen, hash) {
  const context = await browser.newContext({ viewport: { width: screen.width, height: screen.height }, deviceScaleFactor: 1, isMobile: screen.touch, hasTouch: screen.touch });
  const page = await context.newPage();
  page.pageErrors = [];
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  // Only the local site: map tiles and fonts from other hosts are not needed to lay out the graph.
  await page.route((url) => !url.href.startsWith(base.slice(0, base.lastIndexOf('/'))), (route) => route.abort());
  await page.goto(`${base}#${hash}`);
  await page.waitForFunction(() => window.BE?.D && document.querySelector('#vista-grafo:not([hidden])') && (!window.BE.chunks || window.BE.chunks.loaded.length), null, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  return page;
}

/** Every visible part of every graph node, plus the sector labels; pairs that overlap, parts outside, parts covered. */
function measure() {
  const v = document.querySelector('#vista-grafo');
  const canvas = v.querySelector('.grafo-lienzo');
  if (!canvas) return { mode: 'list' };
  const cs = getComputedStyle(v), V = v.getBoundingClientRect(), C = canvas.getBoundingClientRect();
  const inner = { l: V.left + parseFloat(cs.paddingLeft), t: V.top + parseFloat(cs.paddingTop), r: V.right - parseFloat(cs.paddingRight), b: V.bottom - parseFloat(cs.paddingBottom) };
  const parts = [];
  const add = (el, owner, node) => {
    if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: false })) return;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    parts.push({ owner, node, el, text: (el.textContent.trim() || el.className).slice(0, 30), l: r.left, t: r.top, r: r.right, b: r.bottom });
  };
  canvas.querySelectorAll('.be-gnode').forEach((n, i) => n.querySelectorAll('.be-node, .be-gnode__label, .be-gnode__meta').forEach((el) => add(el, `n${i}`, n)));
  canvas.querySelectorAll('.sector-rotulo').forEach((el, i) => add(el, `s${i}`, el));
  const overlaps = [];
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    const a = parts[i], b = parts[j];
    if (a.owner === b.owner) continue;
    if (Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 1) overlaps.push(`${a.text} × ${b.text}`);
  }
  const outside = parts.filter((p) => p.l < Math.max(C.left, inner.l) - 1 || p.r > Math.min(C.right, inner.r) + 1 || p.t < inner.t - 1 || p.b > inner.b + 1).map((p) => p.text);
  const covered = parts.filter((p) => {
    const hit = document.elementFromPoint((p.l + p.r) / 2, (p.t + p.b) / 2);
    return !hit || !(p.node === hit || p.node.contains(hit) || hit.closest?.('.grafo-lienzo') === canvas && !hit.closest('.be-gnode, .sector-rotulo'));
  }).map((p) => p.text);
  // Edges run from the centre's circle to each node's circle. The node an edge ends at and the centre do not count.
  const crossings = [];
  const inside = (x1, y1, x2, y2, p) => {
    const l = p.l + 3, r = p.r - 3, t = p.t + 3, b = p.b - 3;
    if (l >= r || t >= b) return false;
    let u0 = 0, u1 = 1;
    const dx = x2 - x1, dy = y2 - y1;
    for (const [q, d] of [[-dx, x1 - l], [dx, r - x1], [-dy, y1 - t], [dy, b - y1]]) {
      if (q === 0) { if (d < 0) return false; continue; }
      const u = d / q;
      if (q < 0) { if (u > u1) return false; if (u > u0) u0 = u; } else { if (u < u0) return false; if (u < u1) u1 = u; }
    }
    return u0 < u1;
  };
  for (const ln of canvas.querySelectorAll('svg g.arista > line:not(.arista-toque), svg line.arista--grupo')) {
    const x1 = C.left + ln.x1.baseVal.value, y1 = C.top + ln.y1.baseVal.value, x2 = C.left + ln.x2.baseVal.value, y2 = C.top + ln.y2.baseVal.value;
    const end = parts.find((p) => p.el.classList.contains('be-node') && x2 >= p.l - 1 && x2 <= p.r + 1 && y2 >= p.t - 1 && y2 <= p.b + 1)?.owner;
    for (const p of parts) {
      if (p.owner === end || p.node.classList.contains('gnodo-centro')) continue;
      if (inside(x1, y1, x2, y2, p)) crossings.push(`edge to ${parts.find((q) => q.owner === end && !q.el.classList.contains('be-node'))?.text || end} × ${p.text}`);
    }
  }
  // The meta line: strong and current edges; the word of a line that touches an event; an event's distance to the
  // cursor; other dates say so in words.
  const metas = [];
  const WHEN = /^(ocurre ahora|(menos de un día|\d+ (día|días|semanas|meses|año|años)|un siglo|unos \d+ siglos) (antes|después))$/;
  canvas.querySelectorAll('.gnodo[data-gnodo]').forEach((n) => {
    const meta = n.querySelector('.be-gnode__meta')?.textContent.trim() || '';
    const word = n.querySelector('.be-gnode__meta .gnodo-verbo')?.textContent.trim() || '';
    const when = n.querySelector('.be-gnode__meta .gnodo-cuando')?.textContent.trim() || '';
    const strong = !!canvas.querySelector(`svg g[data-arista="${n.dataset.gnodo}"].arista--fuerte`);
    const name = n.querySelector('.be-gnode__label')?.textContent.trim();
    if (n.classList.contains('gnodo--suceso')) {
      if (!word) metas.push(`event «${name}» without the word of its line`);
      if (!WHEN.test(when)) metas.push(`event «${name}» does not say when it is against the cursor: «${when}»`);
    } else if (n.classList.contains('gnodo--pasado') || n.classList.contains('gnodo--futuro')) {
      const past = n.classList.contains('gnodo--pasado'), other = past ? 'ya pasó' : 'aún no';
      const eventWords = word && WHEN.test(when) && when.endsWith(past ? ' antes' : ' después');
      if (meta !== other && when !== other && !eventWords) metas.push(`«${name}» of another date says «${meta}», not «${other}» nor when its event was`);
    } else if (strong) { if (!meta) metas.push(`«${name}»: a strong edge without its meta line`); }
    else if (meta && !(word && meta === word + when && word.split(/\s+/).length <= 4 && (!when || WHEN.test(when)))) metas.push(`«${name}»: a meta line «${meta}» on an edge that is not strong and is not the word of an event's line`);
  });
  const cut = [...canvas.querySelectorAll('.be-gnode__meta, .gnodo--grupo .be-gnode__label')]
    .filter((el) => el.checkVisibility() && el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent.trim().slice(0, 40));
  return { mode: 'graph', nodes: canvas.querySelectorAll('.gnodo').length, parts: parts.length, overlaps, outside, covered, crossings, metas, cut };
}

test('the graph never overlaps nodes or labels', async (t) => {
  // The node with the most relations, measured in the data the site loads.
  const probe = await openGraph(SCREENS[0], 'grafo=jesus&gvista=grafo');
  const most = await probe.evaluate(() => {
    let best = null;
    for (const id of Object.keys(BE.PERS)) { const n = BE.grafo.aristas(`persona:${id}`).length; if (!best || n > best[1]) best = [`persona:${id}`, n]; }
    for (const id of Object.keys(BE.L)) { const n = BE.grafo.aristas(`lugar:${id}`).length; if (n > best[1]) best = [`lugar:${id}`, n]; }
    return best;
  });
  const missing = await probe.evaluate((ids) => ids.filter((x) => !BE.objetoSel(BE.parseSel(x.includes(':') ? x : `persona:${x}`))), FIXED);
  await probe.context().close();
  assert.deepEqual(missing, [], 'every fixed entity exists in the data');
  const entities = [...new Set([...FIXED, most[0].replace(/^persona:/, '')])];
  t.diagnostic(`most relations: ${most[0]} (${most[1]})`);

  const failures = [];
  for (const screen of SCREENS) {
    for (const all of [false, true]) {
      for (const e of entities) {
        const view = `${screen.name} ${all ? 'all dates' : 'current'} ${e}`;
        const page = await openGraph(screen, `grafo=${e}&gvista=grafo${all ? '&gtodo=1' : ''}`);
        const m = await page.evaluate(measure);
        const errors = page.pageErrors;
        await page.context().close();
        if (m.mode !== 'graph' || m.nodes < 1) { failures.push(`${view}: no radial graph drawn (${m.mode})`); continue; }
        t.diagnostic(`${view}: ${m.nodes} nodes, ${m.parts} parts, ${m.overlaps.length} overlaps, ${m.outside.length} outside, ${m.covered.length} covered, ${m.crossings.length} edges through a node, ${m.cut.length} cut`);
        if (m.crossings.length) failures.push(`${view}: ${m.crossings.length} edges through a node: ${m.crossings.slice(0, 4).join(' | ')}`);
        if (m.metas.length) failures.push(`${view}: ${m.metas.slice(0, 4).join(' | ')}`);
        if (m.cut.length) failures.push(`${view}: cut with an ellipsis: ${m.cut.slice(0, 4).join(' | ')}`);
        if (m.overlaps.length) failures.push(`${view}: ${m.overlaps.length} overlaps: ${m.overlaps.slice(0, 4).join(' | ')}`);
        if (m.outside.length) failures.push(`${view}: outside the canvas: ${m.outside.slice(0, 4).join(' | ')}`);
        if (m.covered.length) failures.push(`${view}: covered by another element: ${m.covered.slice(0, 4).join(' | ')}`);
        if (errors.length) failures.push(`${view}: page errors: ${errors.join(' | ')}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});
