// The connection between two (ideas doc, proposal 12): the count never shows the search limit as if it were the real
// number («301 caminos»); past 300 it says «más de 300». The paths shown are the most solid of all the paths, not of the
// first 301 found: on a small network where the answer is known, with the tie rule (fewer steps first) deciding one
// place and the weight of a shared place another, and each option («Incluir deducciones», «Incluir lugares
// compartidos») changing the answer even when the same pair is asked again at once. The network is built once per load
// and kept between openings of different pairs, and the list of names for the two boxes is built once, not on every
// paint.
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
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-graph-paths-'));
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

/** A fresh page with the data loaded and nothing open yet: the connection has not built its network. */
async function openSite(screen = DESKTOP) {
  const context = await browser.newContext({ viewport: { width: screen.width, height: screen.height }, deviceScaleFactor: 1, isMobile: screen.touch, hasTouch: screen.touch });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.pageErrors = [];
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  // Only the local site: map tiles and fonts from other hosts are not needed.
  await page.route((url) => !url.href.startsWith(base.slice(0, base.lastIndexOf('/'))), (route) => route.abort());
  await page.goto(base);
  await page.waitForFunction(() => window.BE?.D && window.BE?.conexion && (!window.BE.chunks || window.BE.chunks.loaded.length), null, { timeout: 30000 });
  return page;
}

/** Opens the connection between two selections, with or without shared places, and reads what the view says. */
function connect(page, a, b, places = false) {
  return page.evaluate(({ a, b, places }) => {
    BE.conexion.abrir(a, b);
    const box = document.querySelector('#vista-conexion [data-conexion-opcion="lugares"]');
    if (box.checked !== places) { box.checked = places; box.dispatchEvent(new Event('change', { bubbles: true })); }
    return {
      count: document.querySelector('#vista-conexion .grafo-filtros .be-muted')?.textContent.trim() ?? '',
      tabs: [...document.querySelectorAll('#vista-conexion [data-conexion-camino]')].map((t) => t.textContent.trim()),
    };
  }, { a, b, places });
}

test('Abrahán and Pablo never say «301 caminos»; a search that is cut says «más de 300»', async () => {
  for (const screen of [DESKTOP, PHONE]) {
    const page = await openSite(screen);
    const seen = [];
    for (const [a, b] of [['abrahan', 'pablo'], ['moises', 'pedro'], ['david', 'pablo'], ['abrahan', 'pedro'], ['loida', 'pablo']]) {
      for (const places of [false, true]) {
        const { count, tabs } = await connect(page, `persona:${a}`, `persona:${b}`, places);
        seen.push(`${a}~${b}${places ? ' (lugares)' : ''}: ${count}`);
        assert.ok(tabs.length > 0, `${a} and ${b} have paths: ${count}`);
        const n = /^(\d+) caminos?/.exec(count);
        assert.ok(n || /^más de 300 caminos, los 3 más sólidos a la vista$/i.test(count), `${a}~${b}: «${count}»`);
        assert.ok(!n || +n[1] <= 300, `${a}~${b}${places ? ' with shared places' : ''} shows the search limit as a count: «${count}»`);
      }
    }
    // The check must be able to bite: at least one of these searches is cut today.
    assert.ok(seen.some((s) => /más de 300/i.test(s)), `no search was cut, so nothing here tests the cut:\n${seen.join('\n')}`);
    assert.deepEqual(page.pageErrors, []);
    await page.context().close();
  }
});

/** A small network where the answer is known. From a to b there are 400 weak paths a-m-n-b (three steps, each a
    coincidence in a suceso: 3 x 1.6 = 4.8), listed first so a depth-first search meets them first, and three solid
    ones listed last: a-s1-b (two written relations: 2.0), a-s4-b (a deduced one plus a written one: 3.0 in two steps)
    and a-s2-s3-b (three written relations: 3.0 in three steps). a-s2-s3-b is listed before a-s4-b, so only the tie
    rule (fewer steps first) puts a-s4-b ahead of it. One more path goes through a shared place, a-lugar-b (two written
    relations plus the weight of a shared place: 4.5): with shared places on it is a path, and its weight keeps it out
    of the three shown. With the weights of the site the three most solid are exactly those, in that order, and there
    are 403 paths (404 with shared places). */
function smallNetwork(page, weak) {
  return page.evaluate((weak) => {
    const id = (x) => `zz-test-${x}`;
    const edges = {};
    const edge = (x, y, props) => {
      for (const [p, q] of [[x, y], [y, x]]) (edges[id(p)] ||= []).push({ sel: `persona:${id(q)}`, grupo: 'Personas', verbo: 'prueba', tr: null, ref: 'Gén 1:1', fuentes: [], razon: '', deducido: false, estado: 'verificado', ...props });
    };
    const names = ['a', 'b', 's1', 's2', 's3', 's4'];
    for (let i = 0; i < weak; i++) names.push(`m${i}`, `n${i}`);
    for (const x of names) BE.PERS[id(x)] = { id: id(x), nombre: `Prueba ${x}`, relaciones: [] };
    BE.L[id('lugar')] = { id: id('lugar'), nombre: 'Lugar de prueba', relaciones: [] };
    for (let i = 0; i < weak; i++) edge('a', `m${i}`, { origen: 'evento' });
    for (let i = 0; i < weak; i++) for (let j = 0; j < weak; j++) edge(`m${i}`, `n${j}`, { origen: 'evento' });
    for (let j = 0; j < weak; j++) edge(`n${j}`, 'b', { origen: 'evento' });
    edge('a', 's2', { origen: 'relacion', tipoRel: 'acompana' });
    edge('s2', 's3', { origen: 'relacion', tipoRel: 'acompana' });
    edge('s3', 'b', { origen: 'relacion', tipoRel: 'acompana' });
    edge('a', 's4', { origen: 'relacion', tipoRel: 'acompana', deducido: true });
    edge('s4', 'b', { origen: 'relacion', tipoRel: 'acompana' });
    edge('a', 's1', { origen: 'relacion', tipoRel: 'acompana' });
    edge('s1', 'b', { origen: 'relacion', tipoRel: 'acompana' });
    // A person-to-place edge lives only in the person's list: the place's side comes from the network itself.
    for (const x of ['a', 'b']) edges[id(x)].push({ sel: `lugar:${id('lugar')}`, grupo: 'Lugares', verbo: 'vivió en', tr: null, ref: 'Gén 1:1', fuentes: [], razon: '', deducido: false, estado: 'verificado', origen: 'relacion', tipoRel: 'vivio_en' });
    // Only this network: every real person has no connection.
    BE.aristas = (x) => edges[x] || [];
    return BE.conexion.caminos(`persona:${id('a')}`, `persona:${id('b')}`).slice(0, 3).map((c) => c.nodos.map((x) => x.replace(/^(persona|lugar):zz-test-/, '')).join('-'));
  }, weak);
}

test('the paths shown are the most solid of all, on a small network where the answer is known', async () => {
  const expected = ['a-s1-b', 'a-s4-b', 'a-s2-s3-b'];
  // 400 weak paths: the search is cut, and the solid paths come after the first 301 found.
  const page = await openSite();
  assert.deepEqual(await smallNetwork(page, 20), expected, 'the three most solid paths, in order');
  const cut = await connect(page, 'persona:zz-test-a', 'persona:zz-test-b');
  assert.equal(cut.count, 'Más de 300 caminos, los 3 más sólidos a la vista');
  assert.deepEqual(cut.tabs, ['El más corto · 2 pasos', 'El más corto · 2 pasos · 1 deducido', 'Camino 3 · 3 pasos']);
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();

  // 100 weak paths: nothing is cut, and the count is exact.
  const page2 = await openSite();
  assert.deepEqual(await smallNetwork(page2, 10), expected);
  assert.equal((await connect(page2, 'persona:zz-test-a', 'persona:zz-test-b')).count, '103 caminos, los 3 más sólidos a la vista');
  // Each option changes the answer, also when the same pair is asked again at once (the last search is kept, so its
  // key must hold both options): shared places add the path through the place, and without deductions a-s4-b goes.
  const counts = [];
  for (const places of [true, false, true]) counts.push((await connect(page2, 'persona:zz-test-a', 'persona:zz-test-b', places)).count);
  assert.deepEqual(counts, ['104 caminos, los 3 más sólidos a la vista', '103 caminos, los 3 más sólidos a la vista', '104 caminos, los 3 más sólidos a la vista']);
  const noDeductions = await page2.evaluate(() => {
    const box = document.querySelector('#vista-conexion [data-conexion-opcion="deducciones"]');
    box.checked = false; box.dispatchEvent(new Event('change', { bubbles: true }));
    return document.querySelector('#vista-conexion .grafo-filtros .be-muted')?.textContent.trim();
  });
  assert.equal(noDeductions, '103 caminos, los 3 más sólidos a la vista', 'without deductions a-s4-b is not a path, the place path still is');
  // With shared places on, the place path is counted but is not among the three most solid: its place weighs.
  const withPlaces = await page2.evaluate(() => {
    const box = document.querySelector('#vista-conexion [data-conexion-opcion="deducciones"]');
    box.checked = true; box.dispatchEvent(new Event('change', { bubbles: true }));
    return BE.conexion.caminos('persona:zz-test-a', 'persona:zz-test-b').map((c) => c.nodos.map((x) => x.replace(/^(persona|lugar):zz-test-/, '')).join('-'));
  });
  assert.deepEqual(withPlaces, expected, 'a shared place weighs more than a written relation');
  assert.deepEqual(page2.pageErrors, []);
  await page2.context().close();
});

test('the network is kept between openings and the list of names is built once', async () => {
  const page = await openSite();
  const r = await page.evaluate(async () => {
    const real = BE.aristas;
    let calls = 0;
    BE.aristas = (x) => { calls++; return real(x); };
    BE.conexion.abrir('persona:abrahan', 'persona:pablo');
    const first = calls;
    const list = document.getElementById('conexion-opciones');
    document.querySelector('#vista-conexion [data-conexion-camino="1"]').click();
    const sameList = document.getElementById('conexion-opciones') === list;
    BE.conexion.cerrar();
    await new Promise((r) => setTimeout(r, 50));
    calls = 0;
    // Another pair: the last search is kept, so the same pair again would not need the network at all.
    BE.conexion.abrir('persona:moises', 'persona:pedro');
    return { first, second: calls, sameList, options: list?.options.length ?? 0, stillThere: document.getElementById('conexion-opciones') === list };
  });
  assert.ok(r.first > 0, 'the first opening builds the network');
  assert.equal(r.second, 0, 'the second opening rebuilds the network');
  assert.ok(r.options > 500, `the list offers the names: ${r.options}`);
  assert.ok(r.sameList, 'a repaint (another tab) rebuilds the list of names');
  assert.ok(r.stillThere, 'reopening rebuilds the list of names');
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});
