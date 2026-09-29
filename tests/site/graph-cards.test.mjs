// Each node button opens its own card (ideas doc, «Frontal»: a headless test that compares the label of every node
// button with the header of the card it opens). Over the selections of the overlap test (Jesús, Pablo, Abrahán, David,
// Moisés, Jerusalén and the node with the most relations), at 1440 x 900 with a mouse (hover) and at 430 x 932 with
// touch (a tap, then Esc), with «Solo lo vigente» on and off:
// - the card's header reads «<centre> · <label of the button>», and the button's accessible name starts with its label;
// - every connection in the card has a verb and a reference (a passage chip or a source);
// - every node counted in the sector filters is on the canvas or inside a «+N» bubble: none is lost. Also at 390 x 844
//   (touch) and at a short desktop window of 1280 x 720, where a sector used to vanish; if the canvas has no room at all
//   the view falls back to the list, which must then show every counted node. There every node and bubble on the canvas
//   must also be within reach: a finger on its shape lands on it, not on the folded sheet or on another node.
// - an edge whose group word this file does not know (the data may move to English) is still drawn: on the canvas, in
//   a «+N» list and in the list view, and it is counted.
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
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-graph-cards-'));
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
  page.setDefaultTimeout(4000);
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

/** In the page: the centre, the node buttons, and what the sector filters count against what the canvas shows. */
function snapshot() {
  const v = document.querySelector('#vista-grafo');
  const num = (s) => +(String(s).match(/\d+/) || [0])[0];
  const counted = [...v.querySelectorAll('[data-grafo-sector][aria-pressed="true"]')].reduce((x, b) => x + num(b.textContent), 0);
  const nodes = [...v.querySelectorAll('.grafo-lienzo .gnodo[data-gnodo]')].map((b) => ({ i: b.dataset.gnodo, label: b.querySelector('.be-gnode__label')?.textContent.trim() || '', name: b.getAttribute('aria-label') || '' }));
  const folded = [...v.querySelectorAll('.grafo-lienzo [data-grafo-abrir] .burbuja')].reduce((x, b) => x + num(b.textContent), 0);
  return { graph: !!v.querySelector('.grafo-lienzo'), centre: v.querySelector('.gnodo-centro .be-gnode__label')?.textContent.trim() || '', counted, folded, nodes };
}
/** In the page: the visible card, its header and its connections. */
function readCard() {
  const c = document.querySelector('#grafo-tarjeta');
  if (!c || c.hidden) return null;
  return {
    header: c.querySelector('.be-card__eyebrow')?.textContent.trim() || '',
    rows: [...c.querySelectorAll('.tarjeta-arista')].map((r) => ({ verb: r.querySelector('.tarjeta-verbo b')?.textContent.trim() || '', refs: r.querySelectorAll('.be-ref').length, sources: r.querySelectorAll('.be-tier').length })),
  };
}

test('every node button opens the card of its own node, with verb and reference', async (t) => {
  const probe = await openGraph(SCREENS[0], 'grafo=jesus&gvista=grafo');
  const most = await probe.evaluate(() => {
    let best = null;
    for (const id of Object.keys(BE.PERS)) { const n = BE.grafo.aristas(`persona:${id}`).length; if (!best || n > best[1]) best = [`persona:${id}`, n]; }
    for (const id of Object.keys(BE.L)) { const n = BE.grafo.aristas(`lugar:${id}`).length; if (n > best[1]) best = [`lugar:${id}`, n]; }
    return best[0];
  });
  await probe.context().close();
  const entities = [...new Set([...FIXED, most.replace(/^persona:/, '')])];

  const failures = [];
  let opened = 0;
  for (const screen of SCREENS) {
    for (const all of [false, true]) {
      for (const e of entities) {
        const view = `${screen.name} ${all ? 'all dates' : 'current'} ${e}`;
        const page = await openGraph(screen, `grafo=${e}&gvista=grafo${all ? '&gtodo=1' : ''}`);
        const s = await page.evaluate(snapshot);
        if (!s.graph || !s.nodes.length) { failures.push(`${view}: no radial graph drawn`); await page.context().close(); continue; }
        if (s.nodes.length + s.folded !== s.counted) failures.push(`${view}: the filters count ${s.counted}, the canvas shows ${s.nodes.length} nodes and ${s.folded} folded`);
        let seen = 0;
        for (const n of s.nodes) {
          const where = `${view} «${n.label}»`;
          if (!n.name.startsWith(n.label)) failures.push(`${where}: accessible name «${n.name.slice(0, 60)}» does not start with the label`);
          const el = page.locator(`#vista-grafo .gnodo[data-gnodo="${n.i}"]`);
          try {
            if (screen.touch) await el.tap(); else { await page.mouse.move(2, 2); await el.hover(); }
            await page.waitForFunction(() => { const c = document.querySelector('#grafo-tarjeta'); return c && !c.hidden; }, null, { timeout: 1500 });
          } catch { failures.push(`${where}: no card opens`); }
          const card = await page.evaluate(readCard);
          const now = await page.evaluate(() => document.querySelector('#vista-grafo .gnodo-centro .be-gnode__label')?.textContent.trim() || '');
          if (now !== s.centre) { failures.push(`${where}: the ${screen.touch ? 'tap' : 'hover'} changed the centre to «${now}» instead of opening a card`); break; }
          if (!card) continue;
          seen++;
          const expected = `${s.centre} · ${n.label}`;
          if (card.header !== expected) failures.push(`${where}: the card says «${card.header}», expected «${expected}»`);
          card.rows.forEach((r, k) => {
            if (!r.verb) failures.push(`${where}: connection ${k + 1} has no verb`);
            if (!r.refs && !r.sources) failures.push(`${where}: connection ${k + 1} «${r.verb}» has no reference`);
          });
          if (screen.touch) await page.keyboard.press('Escape');
        }
        opened += seen;
        t.diagnostic(`${view}: ${s.nodes.length} nodes, ${seen} cards read, ${s.folded} folded of ${s.counted}`);
        if (page.pageErrors.length) failures.push(`${view}: page errors: ${page.pageErrors.join(' | ')}`);
        await page.context().close();
      }
    }
  }
  assert.ok(opened > 0, 'no card was read');
  assert.deepEqual(failures, []);
});

test('no sector is lost at 390 x 844 or in a short desktop window', async (t) => {
  const failures = [];
  for (const screen of [{ name: '390', width: 390, height: 844, touch: true }, { name: '1280x720', width: 1280, height: 720, touch: false }]) {
    for (const all of [false, true]) {
      for (const e of [...FIXED, 'judas-hermano-de-jesus', 'ananias-de-damasco']) {
        const view = `${screen.name} ${all ? 'all dates' : 'current'} ${e}`;
        const page = await openGraph(screen, `grafo=${e}&gvista=grafo${all ? '&gtodo=1' : ''}`);
        const s = await page.evaluate(() => {
          const v = document.querySelector('#vista-grafo');
          const num = (x) => +(String(x).match(/\d+/) || [0])[0];
          const counted = [...v.querySelectorAll('[data-grafo-sector][aria-pressed="true"]')].reduce((x, b) => x + num(b.textContent), 0);
          if (v.classList.contains('vista-grafo--lista')) return { list: true, counted, rows: v.querySelectorAll('.grafo-lista .lista-fila').length };
          // Reachable: a finger or a pointer on the shape of each node or bubble lands on it (not on the folded sheet,
          // not on another node, not outside the window).
          const unreachable = [...v.querySelectorAll('.grafo-lienzo .gnodo')].filter((b) => {
            const r = b.querySelector('.be-node').getBoundingClientRect();
            return !b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
          }).map((b) => b.textContent.trim().slice(0, 30));
          return { counted, unreachable, nodes: v.querySelectorAll('.grafo-lienzo .gnodo[data-gnodo]').length, folded: [...v.querySelectorAll('.grafo-lienzo [data-grafo-abrir] .burbuja')].reduce((x, b) => x + num(b.textContent), 0) };
        });
        t.diagnostic(`${view}: ${s.list ? `list, ${s.rows} rows` : `${s.nodes} nodes, ${s.folded} folded, ${s.unreachable.length} out of reach`} of ${s.counted}`);
        if (s.list ? s.rows !== s.counted : s.nodes + s.folded !== s.counted) failures.push(`${view}: the filters count ${s.counted}, the view shows ${s.list ? `${s.rows} rows` : `${s.nodes} nodes and ${s.folded} folded`}`);
        if (s.unreachable?.length) failures.push(`${view}: ${s.unreachable.length} nodes out of reach: ${s.unreachable.slice(0, 3).join(' | ')}`);
        if (page.pageErrors.length) failures.push(`${view}: page errors: ${page.pageErrors.join(' | ')}`);
        await page.context().close();
      }
    }
  }
  assert.deepEqual(failures, []);
});

test('an edge with a group word the graph does not know is still drawn and counted', async () => {
  const found = {};
  for (const mode of ['grafo', 'lista']) {
    const page = await openGraph(SCREENS[0], 'grafo=jesus&gvista=grafo');
    found[mode] = await page.evaluate(async (mode) => {
      const real = BE.aristas;
      // Another relation type and another group word, as a data model in English could send them.
      BE.aristas = (id) => (id === 'pablo' ? [...real(id), { sel: 'persona:aaron', grupo: 'People', verbo: 'lo enseña', tipoRel: 'mentor_of', origen: 'relation', tr: null, ref: 'Hch 22:3', fuentes: ['x'], razon: '', estado: 'verificado', deducido: false }] : real(id));
      BE.grafo.abrir('pablo');
      const sw = document.querySelector('[data-grafo-vigente]');
      if (sw.getAttribute('aria-checked') === 'true') sw.click();   // all dates: the new edge has no date span
      if (mode === 'lista') document.querySelector('[data-grafo-modo="lista"]').click();
      const v = document.querySelector('#vista-grafo');
      const num = (x) => +(String(x).match(/\d+/) || [0])[0];
      const counted = [...v.querySelectorAll('[data-grafo-sector]')].reduce((x, b) => x + num(b.textContent), 0);
      const said = num(v.querySelector('.sr-only')?.textContent.split(':').pop());
      let where = '';
      if (v.querySelector('[data-gnodo-sel="persona:aaron"], .grafo-lista [data-grafo-centro="persona:aaron"]')) where = mode === 'lista' ? 'list' : 'canvas';
      else {
        for (const b of v.querySelectorAll('[data-grafo-abrir]')) {
          b.click();
          await new Promise((r) => setTimeout(r, 50));
          if (document.querySelector('#grafo-tarjeta [data-grafo-centro="persona:aaron"]')) { where = `«+N» ${b.dataset.grafoAbrir}`; break; }
          b.click();
        }
      }
      return { where, counted, said };
    }, mode);
    assert.deepEqual(page.pageErrors, []);
    await page.context().close();
  }
  assert.ok(found.grafo.where, 'Aarón is not on the canvas nor in any «+N» list');
  assert.equal(found.lista.where, 'list', 'Aarón is not in the list view');
  assert.equal(found.grafo.counted, found.grafo.said, `the filters count ${found.grafo.counted}, the summary for screen readers says ${found.grafo.said}`);
});
