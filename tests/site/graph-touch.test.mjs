// Touch and keyboard on the graph (ideas doc, proposal 11). The first tap or Enter on a node pins its card with the
// actions «Poner en el centro» and «¿Cómo se relaciona con X?»; the second tap or Enter centres it; Esc closes the card
// first and the view only after. The «+N» node opens what it folds. Nodes, card actions, «+N» rows and the legend's
// summary are touch targets of at least 44 x 44 px.
// On the phone the folded sheet sits in the bottom padding of the view: every pinned card, of every node, must keep its
// actions under the finger (a tap by coordinates, after elementFromPoint says what is there) and end above the sheet,
// and every «+N» list must be readable to its last row, which a tap then centres. A repaint (a resize) keeps the pinned
// card and the focus on its node.
// The fonts come from the site itself (site/kit/fonts), so boxes are measured with the fonts a reader gets; only map
// tiles from other hosts are blocked.
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
const PHONE = { width: 430, height: 932, touch: true };
const DESKTOP = { width: 1440, height: 900, touch: false };

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
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-graph-touch-'));
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
  page.setDefaultTimeout(8000);
  page.pageErrors = [];
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  // Only the local site: map tiles and fonts from other hosts are not needed to lay out the graph.
  await page.route((url) => !url.href.startsWith(base.slice(0, base.lastIndexOf('/'))), (route) => route.abort());
  await page.goto(`${base}#${hash}`);
  await page.waitForFunction(() => window.BE?.D && document.querySelector('#vista-grafo:not([hidden])'), null, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  return page;
}


const centre = (page) => page.evaluate(() => BE.grafo.ruta.at(-1));
const card = (page) => page.evaluate(() => {
  const t = document.querySelector('#grafo-tarjeta');
  if (!t || t.hidden) return null;
  return { buttons: [...t.querySelectorAll('button')].map((b) => b.textContent.trim()), rows: t.querySelectorAll('[data-grafo-centro]').length };
});
/** The first person node on the canvas that a finger can reach (nothing on top of its circle): name and locator. */
async function firstPerson(page) {
  const name = await page.evaluate(() => {
    const reachable = (b) => { const r = b.querySelector('.be-node').getBoundingClientRect(); return b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); };
    const el = [...document.querySelectorAll('#vista-grafo .gnodo[data-gnodo]')].find((b) => b.querySelector('.be-node--persona') && reachable(b));
    el?.setAttribute('data-test-node', '1');
    return el?.querySelector('.be-gnode__label')?.textContent.trim();
  });
  const node = page.locator('[data-test-node="1"]');
  return { name, node, dot: node.locator('.be-node') };   // the finger goes on the circle, which is what it checked
}

test('a tap pins the card, a second tap centres the node', async () => {
  const page = await openGraph(PHONE, 'grafo=pablo&gvista=grafo');
  const { name, dot } = await firstPerson(page);
  assert.ok(name, 'a person node is on the canvas');
  await dot.tap();
  await page.waitForTimeout(250);
  assert.equal(await centre(page), 'persona:pablo', 'the first tap does not change the centre');
  const c = await card(page);
  assert.ok(c, 'the first tap shows the card');
  assert.ok(c.buttons.includes('Poner en el centro'), `card actions: ${c.buttons.join(' | ')}`);
  assert.ok(c.buttons.includes(`¿Cómo se relaciona con ${name}?`), `card actions: ${c.buttons.join(' | ')}`);
  await dot.tap();
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => BE.nombreDeSel(BE.grafo.ruta.at(-1))), name, 'the second tap centres the node');
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('the card actions work: centre, and how it relates', async () => {
  const page = await openGraph(PHONE, 'grafo=pablo&gvista=grafo');
  const { name, dot } = await firstPerson(page);
  await dot.tap();
  await page.waitForTimeout(250);
  await page.locator('#grafo-tarjeta button', { hasText: `¿Cómo se relaciona con ${name}?` }).tap();
  await page.waitForTimeout(400);
  const ends = await page.evaluate(() => BE.conexion.extremos.map((x) => x && BE.nombreDeSel(x)));
  assert.deepEqual(ends, ['Pablo', name], 'the connection opens between the centre and the node');
  await page.context().close();

  const page2 = await openGraph(PHONE, 'grafo=pablo&gvista=grafo');
  const second = await firstPerson(page2);
  await second.dot.tap();
  await page2.waitForTimeout(250);
  await page2.locator('#grafo-tarjeta button', { hasText: 'Poner en el centro' }).tap();
  await page2.waitForTimeout(300);
  assert.equal(await page2.evaluate(() => BE.nombreDeSel(BE.grafo.ruta.at(-1))), second.name);
  await page2.context().close();
});

test('Enter pins, Enter centres, Esc closes the card before the view', async () => {
  const page = await openGraph(DESKTOP, 'grafo=pablo&gvista=grafo');
  const { name, node } = await firstPerson(page);
  await node.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  assert.equal(await centre(page), 'persona:pablo', 'Enter does not centre at once');
  assert.ok((await card(page))?.buttons.includes('Poner en el centro'), 'Enter pins the card with its actions');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  assert.equal(await card(page), null, 'the first Esc closes the card');
  assert.equal(await page.evaluate(() => !document.querySelector('#vista-grafo').hidden), true, 'the view stays open');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-test-node')), '1', 'focus stays on the node');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => BE.nombreDeSel(BE.grafo.ruta.at(-1))), name, 'the second Enter centres the node');
  assert.equal(await page.evaluate(() => document.querySelector('#vista-grafo').contains(document.activeElement)), true, 'focus stays in the graph after centring');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => document.querySelector('#vista-grafo').hidden), true, 'with no card, Esc closes the view');
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('the +N node opens what it folds', async () => {
  const page = await openGraph(PHONE, 'grafo=lugar:jerusalen&gvista=grafo&gtodo=1');
  const bubble = page.locator('#vista-grafo [data-grafo-abrir]').first();
  assert.ok(await bubble.count(), 'a +N node is on the canvas');
  const n = Number((await bubble.locator('.burbuja').textContent()).replace(/\D/g, ''));
  await bubble.tap();
  await page.waitForTimeout(250);
  const c = await card(page);
  assert.equal(c?.rows, n, `the card lists the ${n} folded nodes`);
  const row = page.locator('#grafo-tarjeta [data-grafo-centro]').first();
  const sel = await row.getAttribute('data-grafo-centro');
  await row.tap();
  await page.waitForTimeout(300);
  assert.equal(await centre(page), sel, 'a row of the list centres its node');
  await page.context().close();
});

test('nodes and card actions are touch targets of at least 44 px', async () => {
  const page = await openGraph(PHONE, 'grafo=pablo&gvista=grafo');
  const { dot } = await firstPerson(page);
  await dot.tap();
  await page.waitForTimeout(250);
  assert.ok((await card(page))?.buttons.length >= 2, 'the pinned card and its actions are measured too');
  const small = await page.evaluate(() => [...document.querySelectorAll('#vista-grafo .gnodo, #grafo-tarjeta button')]
    .map((el) => ({ t: el.textContent.trim().slice(0, 30), r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width < 44 || r.height < 44).map(({ t, r }) => `${t} ${Math.round(r.width)}x${Math.round(r.height)}`));
  assert.deepEqual(small, []);
  await page.context().close();
});

/** In the page: the centre of node i's shape if a finger there lands on that node, else null. */
function fingerOn(i) {
  const b = document.querySelector(`#vista-grafo .gnodo[data-gnodo="${i}"]`);
  if (!b) return null;
  const r = b.querySelector('.be-node').getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  return b.contains(document.elementFromPoint(x, y)) ? { x, y, label: b.querySelector('.be-gnode__label')?.textContent.trim() } : null;
}
/** In the page: the pinned card as a finger meets it. Each action must be the element under its own centre without
    scrolling the card; the card must end above the view's bottom padding (the folded sheet); and once scrolled to its
    end, its last line must still be the card's. */
function pinnedCard() {
  const v = document.querySelector('#vista-grafo'), t = document.querySelector('#grafo-tarjeta');
  if (!t || t.hidden) return null;
  const free = v.getBoundingClientRect().bottom - parseFloat(getComputedStyle(v).paddingBottom);
  const actions = [...t.querySelectorAll('.grafo-tarjeta__acciones button')].map((b) => {
    const r = b.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { text: b.textContent.trim(), ok: b.contains(hit), under: hit && !b.contains(hit) ? (hit.id || hit.getAttribute('class') || hit.tagName).slice(0, 40) : '' };
  });
  t.scrollTop = t.scrollHeight;
  const tr = t.getBoundingClientRect();
  const end = document.elementFromPoint(tr.left + 20, tr.bottom - 6);
  return { header: t.querySelector('.be-card__eyebrow')?.textContent.trim(), actions, bottom: Math.round(tr.bottom), free: Math.round(free), endOk: !!end && t.contains(end) };
}

test('on the phone every pinned card keeps its actions under the finger, above the folded sheet', async () => {
  const failures = [];
  let cards = 0;
  for (const hash of ['grafo=pablo', 'grafo=moises', 'grafo=pablo&gtodo=1', 'grafo=moises&gtodo=1']) {
    const page = await openGraph(PHONE, `${hash}&gvista=grafo`);
    const start = await centre(page);
    const ids = await page.evaluate(() => [...document.querySelectorAll('#vista-grafo .gnodo[data-gnodo]')].map((b) => b.dataset.gnodo));
    for (const i of ids) {
      const pt = await page.evaluate(fingerOn, i);
      if (!pt) { failures.push(`${hash} node ${i}: something else is under the finger`); continue; }
      await page.touchscreen.tap(pt.x, pt.y);
      await page.waitForTimeout(150);
      const where = `${hash} «${pt.label}»`;
      const now = await centre(page);
      if (now !== start) { failures.push(`${where}: the tap changed the centre to ${now}`); break; }
      const c = await page.evaluate(pinnedCard);
      if (!c) { failures.push(`${where}: no card`); continue; }
      cards++;
      if (c.actions.length < 1) failures.push(`${where}: the card has no actions`);
      for (const a of c.actions) if (!a.ok) failures.push(`${where}: «${a.text}» is under ${a.under}`);
      if (c.bottom > c.free + 1) failures.push(`${where}: the card ends ${c.bottom - c.free} px under the folded sheet`);
      if (!c.endOk) failures.push(`${where}: the end of the card cannot be reached`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(60);
    }
    if (page.pageErrors.length) failures.push(`${hash}: page errors: ${page.pageErrors.join(' | ')}`);
    await page.context().close();
  }
  assert.ok(cards >= 20, `only ${cards} cards were pinned`);
  assert.deepEqual(failures.slice(0, 20), []);
});

test('on the phone every «+N» list reads to its last row, and a tap on it centres its node', async () => {
  const failures = [];
  let lists = 0, longest = 0;
  for (const hash of ['grafo=lugar:jerusalen&gtodo=1', 'grafo=jesus&gtodo=1', 'grafo=pablo&gtodo=1']) {
    let page = await openGraph(PHONE, `${hash}&gvista=grafo`);
    const groups = await page.evaluate(() => [...document.querySelectorAll('#vista-grafo [data-grafo-abrir]')].map((b) => b.dataset.grafoAbrir));
    if (!groups.length) failures.push(`${hash}: no «+N» node`);
    for (const g of groups) {
      await page.context().close();
      page = await openGraph(PHONE, `${hash}&gvista=grafo`);
      const pt = await page.evaluate((g) => {
        const b = document.querySelector(`[data-grafo-abrir="${g}"]`);
        if (!b) return null;
        const r = b.querySelector('.burbuja').getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
        return b.contains(document.elementFromPoint(x, y)) ? { x, y } : { covered: true };
      }, g);
      if (!pt || pt.covered) { failures.push(`${hash} +N ${g}: ${pt ? 'something else is under the finger' : 'gone after reloading'}`); continue; }
      await page.touchscreen.tap(pt.x, pt.y);
      await page.waitForTimeout(150);
      const r = await page.evaluate(() => {
        const v = document.querySelector('#vista-grafo'), t = document.querySelector('#grafo-tarjeta');
        if (!t || t.hidden) return null;
        const rows = [...t.querySelectorAll('.grafo-resto__fila')];
        t.scrollTop = t.scrollHeight;
        const last = rows.at(-1), lr = last.getBoundingClientRect();
        const hit = document.elementFromPoint(lr.left + lr.width / 2, lr.top + lr.height / 2);
        const free = v.getBoundingClientRect().bottom - parseFloat(getComputedStyle(v).paddingBottom);
        return {
          n: rows.length, ok: last.contains(hit), under: hit && !last.contains(hit) ? (hit.id || hit.getAttribute('class') || hit.tagName).slice(0, 40) : '',
          x: lr.left + lr.width / 2, y: lr.top + lr.height / 2, sel: last.dataset.grafoCentro, name: last.querySelector('.grafo-resto__nombre')?.textContent,
          bottom: Math.round(t.getBoundingClientRect().bottom), free: Math.round(free),
          cut: rows.filter((x) => [...x.querySelectorAll('.grafo-resto__nombre, .grafo-resto__meta')].some((m) => m.scrollWidth > m.clientWidth + 1)).map((x) => x.textContent.trim().slice(0, 40)),
          small: rows.filter((x) => x.getBoundingClientRect().height < 44).length,
        };
      });
      const where = `${hash} +N ${g}`;
      if (!r) { failures.push(`${where}: no list`); continue; }
      lists++; longest = Math.max(longest, r.n);
      if (!r.ok) { failures.push(`${where}: the last row «${r.name}» is under ${r.under}`); continue; }
      if (r.bottom > r.free + 1) failures.push(`${where}: the list ends ${r.bottom - r.free} px under the folded sheet`);
      if (r.cut.length) failures.push(`${where}: ${r.cut.length} rows cut with an ellipsis: ${r.cut.slice(0, 3).join(' | ')}`);
      if (r.small) failures.push(`${where}: ${r.small} rows under 44 px`);
      await page.touchscreen.tap(r.x, r.y);
      await page.waitForTimeout(250);
      const now = await centre(page);
      if (now !== r.sel) failures.push(`${where}: a tap on the last row «${r.name}» left the centre at ${now}`);
    }
    if (page.pageErrors.length) failures.push(`${hash}: page errors: ${page.pageErrors.join(' | ')}`);
    await page.context().close();
  }
  assert.ok(lists >= 5 && longest > 50, `only ${lists} lists, the longest of ${longest} rows`);
  assert.deepEqual(failures, []);
});

test('the legend and the «+N» rows are touch targets of at least 44 px', async () => {
  const page = await openGraph(PHONE, 'grafo=lugar:jerusalen&gvista=grafo&gtodo=1');
  const summary = await page.evaluate(() => { const s = document.querySelector('#vista-grafo .grafo-leyenda > summary'); if (!s) return null; const r = s.getBoundingClientRect(); return { w: r.width, h: r.height }; });
  assert.ok(summary, 'the legend is on the phone');
  assert.ok(summary.h >= 44 && summary.w >= 44, `the legend's summary is ${Math.round(summary.w)}x${Math.round(summary.h)}`);
  await page.locator('#vista-grafo [data-grafo-abrir]').first().tap();
  await page.waitForTimeout(250);
  const rows = await page.evaluate(() => [...document.querySelectorAll('#grafo-tarjeta .grafo-resto__fila')].map((el) => Math.round(el.getBoundingClientRect().height)));
  assert.ok(rows.length > 0, 'the «+N» list opens');
  assert.deepEqual(rows.filter((h) => h < 44), [], 'rows under 44 px');
  await page.context().close();
});

test('a repaint keeps the pinned card and the focus on its node', async () => {
  const page = await openGraph(DESKTOP, 'grafo=pablo&gvista=grafo');
  const { name, node } = await firstPerson(page);
  await node.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  assert.equal(await centre(page), 'persona:pablo', 'Enter pins the card and does not centre');
  await page.setViewportSize({ width: 1360, height: 860 });   // small enough that the node stays on the canvas
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const t = document.querySelector('#grafo-tarjeta'), f = document.activeElement;
    return { card: t && !t.hidden ? t.querySelector('.be-card__eyebrow')?.textContent.trim() : null, expanded: [...document.querySelectorAll('#vista-grafo .gnodo[aria-expanded="true"] .be-gnode__label')].map((x) => x.textContent.trim()), focus: f?.closest('.gnodo')?.querySelector('.be-gnode__label')?.textContent.trim() || f?.className || '' };
  });
  assert.equal(r.card, `Pablo · ${name}`, 'the card is still pinned to its node after the resize');
  assert.deepEqual(r.expanded, [name]);
  assert.equal(r.focus, name, 'focus is still on the node');

  // A pinned «+N» list too.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(600);
  await page.keyboard.press('Escape');
  const bubble = page.locator('#vista-grafo [data-grafo-abrir]').first();
  const group = await bubble.getAttribute('data-grafo-abrir');
  await bubble.click();
  await page.waitForTimeout(200);
  await page.setViewportSize({ width: 1300, height: 880 });
  await page.waitForTimeout(600);
  const list = await page.evaluate((g) => { const t = document.querySelector('#grafo-tarjeta'); return { open: !!t && !t.hidden && !!t.querySelector('.grafo-resto'), still: !!document.querySelector(`[data-grafo-abrir="${g}"]`) }; }, group);
  assert.ok(list.still, `the «+${group}» node is still on the canvas after the resize`);
  assert.ok(list.open, 'the «+N» list is still open after the resize');
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});
