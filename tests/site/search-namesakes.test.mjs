// Namesakes in the search lists (site/js/buscar.js, distinguishingLine), tested in a real headless browser: when two
// rows of a list have the same name, each one says what tells it apart, taken from its own record, in the search on
// top and in the landing's box, on the desktop and on a 430-wide phone, where the line is cut: the cut must leave the
// two rows different, and the row keeps the height of any other row. Typed before the detail arrives, the rows get
// their line when it does. When the record says the kinship, that is the line. The last test reads every group of
// namesakes in data/ from scripts/homonyms.py and checks that the built site tells each group apart.
//
// Run from the root of the repository, one browser at a time:
//   node --test --test-concurrency=1 tests/site/search-namesakes.test.mjs
// Needs playwright-core with a Chromium (importable, or PLAYWRIGHT_CORE / PLAYWRIGHT_MODULE_DIR) and the data built
// into site/ with python3 scripts/build.py. BE_SITE_DIR=<dir> tests another copy of the site (a checkout of main is the
// control). Every host but the local server is blocked: the map does not load, the lists do not need it.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SITE_DIR = path.resolve(process.env.BE_SITE_DIR || path.join(ROOT, 'site'));
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true };
// The two lists: the box on top of the site (with an address, so no landing) and the landing's box (a cold open).
const LISTS = [
  { name: 'top', hash: 't=50.3000', box: '#q', row: '#resultados .be-result', meta: '.be-row__meta' },
  { name: 'landing', hash: '', box: '#portada-q', row: '#portada-lista .portada-op[data-i]', meta: '.portada-op__meta' },
];

function loadChromium() {
  const req = createRequire(import.meta.url);
  const tries = [process.env.PLAYWRIGHT_CORE, process.env.PLAYWRIGHT_MODULE_DIR && path.join(process.env.PLAYWRIGHT_MODULE_DIR, 'playwright-core'),
    'playwright-core', 'playwright'].filter(Boolean);
  for (const t of tries) { try { const m = req(t); if (m.chromium) return m.chromium; } catch { /* next */ } }
  throw new Error('playwright-core not found: run with `npx -y -p playwright-core@1 node --test tests/site/search-namesakes.test.mjs`.');
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
function serve(dir) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(dir, rel.endsWith('/') ? `${rel}index.html` : rel);
    if (!file.startsWith(dir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

let browser, server, base;
before(async () => {
  for (const f of ['data.json', 'data.core.json', 'data.detail.json']) {
    assert.ok(fs.existsSync(path.join(SITE_DIR, f)), `${SITE_DIR}/${f} is missing: run python3 scripts/build.py first.`);
  }
  server = await serve(SITE_DIR);
  base = `http://127.0.0.1:${server.address().port}/`;
  const chromium = loadChromium();
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  try { browser = await chromium.launch({ headless: true, args }); }
  catch { browser = await chromium.launch({ headless: true, args, channel: 'chrome' }); }
});
afterEach(async () => { for (const c of browser?.contexts() || []) await c.close().catch(() => {}); });
after(async () => { await browser?.close(); server?.close(); });

/** Opens the site. The line comes with the detail: by default it is loaded before typing, so the list is painted once
    with it; `slowDetail` holds data.detail.json back instead, as on a slow phone, and leaves it loading. */
async function openPage(screen, hash, { slowDetail = false } = {}) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...screen });
  context.setDefaultTimeout(15000);
  const page = await context.newPage();
  page.pageErrors = [];
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  await page.route((u) => !u.href.startsWith(base), (r) => r.abort());
  if (slowDetail) {
    page.releaseDetail = null;
    const held = new Promise((ok) => { page.releaseDetail = ok; });
    await page.route(/data\.detail\.json/, async (r) => { await held; await r.continue(); });
  }
  await page.goto(`${base}index.html${hash ? `#${hash}` : ''}`);
  await page.waitForFunction(() => window.BE?.D && window.__be, null, { timeout: 30000 });
  // ready() answers true and calls nobody back when the detail is already there.
  if (!slowDetail) await page.evaluate(() => new Promise((ok) => { if (window.BE.chunks.ready(ok)) ok(); }));
  return page;
}

/** What a row's line shows on screen: the characters inside its box, less the room the ellipsis takes when cut. */
function visibleText(el) {
  const box = el.getBoundingClientRect();
  const right = box.right - (el.scrollWidth > el.clientWidth ? 14 : -0.5);
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), range = document.createRange();
  let out = '';
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    for (let i = 0; i < n.length; i++) {
      range.setStart(n, i); range.setEnd(n, i + 1);
      const r = range.getBoundingClientRect();
      if (r.right <= right) out += n.data[i];
    }
  }
  return out;
}

/** Types `name` in a list's box and returns, for the rows with exactly that title, what their line shows on screen,
    its distinguishing part, the row height and the height of the first row for «Pablo», one name with no namesake. */
async function rowsFor(page, list, name) {
  const box = page.locator(list.box);
  await box.fill('Pablo');
  await page.locator(list.row).first().waitFor();
  const plain = (await page.locator(list.row).first().boundingBox()).height;
  await box.fill(name);
  await page.waitForFunction(({ sel, n }) => [...document.querySelectorAll(sel)]
    .filter((r) => (r.querySelector('.be-result__title, .portada-op__tit')?.textContent || '').trim().startsWith(n)).length >= 2, { sel: list.row, n: name });
  const rows = await page.locator(list.row).evaluateAll((els, { name, meta, fn }) => {
    const visible = new Function(`return (${fn})`)();
    return els.filter((r) => r.querySelector('.be-result__title, .portada-op__tit').textContent.replace(/\d+ con este nombre/, '').trim() === name)
      .map((r) => ({ shown: visible(r.querySelector(meta)), line: r.querySelector('.be-distinguisher')?.textContent || '', height: r.getBoundingClientRect().height }));
  }, { name, meta: list.meta, fn: visibleText.toString() });
  return { rows, plain };
}

/** The checks shared by a person and a place: two rows, each line showing on screen the word that tells it apart, the
    two lines different where the phone cuts them, and rows no taller than a row with no namesake. */
async function checkNamesakes(name, words) {
  for (const screen of [DESKTOP, PHONE]) {
    for (const list of LISTS) {
      const where = `${list.name} at ${screen.viewport.width}`;
      const page = await openPage(screen, list.hash);
      const { rows, plain } = await rowsFor(page, list, name);
      assert.equal(rows.length, 2, `${where}: ${rows.length} rows named ${name}`);
      for (const w of words) {
        assert.ok(rows.some((r) => r.line.includes(w) && r.shown.includes(w)), `${where}: no row shows «${w}» (${rows.map((r) => r.shown).join(' / ')})`);
      }
      assert.notEqual(rows[0].shown, rows[1].shown, `${where}: the two rows look the same on screen: «${rows[0].shown}»`);
      for (const r of rows) assert.ok(r.height <= plain + 1, `${where}: a namesake row is ${r.height}px tall, a plain one ${plain}px`);
      assert.deepEqual(page.pageErrors, [], where);
      await page.context().close();
    }
  }
}

test('Mefibóset: each of the two rows says whose son it is, on top and on the landing, on the desktop and the phone', async () => {
  // data/people/mefiboset-hijo-de-jonatan.yaml and mefiboset-hijo-de-saul.yaml: the line comes from the head of each
  // one's `disambiguation`.
  await checkNamesakes('Mefibóset', ['Jonatán', 'Saúl']);
});

test('Mefibóset typed before the detail arrives: the two rows get their line when it does, on the phone', async () => {
  // A cold open on a slow phone, as in the demo: the list answers with the core and is painted again with the detail.
  for (const list of LISTS) {
    const page = await openPage(PHONE, list.hash, { slowDetail: true });
    await page.locator(list.box).fill('Mefibóset');
    await page.locator(list.row).nth(1).waitFor();
    assert.equal(await page.locator(`${list.row} .be-distinguisher`).count(), 0, `${list.name}: a line before the detail`);
    page.releaseDetail();
    await page.waitForFunction((sel) => document.querySelectorAll(`${sel} .be-distinguisher`).length >= 2, list.row);
    const lines = await page.locator(`${list.row} .be-distinguisher`).allTextContents();
    assert.ok(lines.some((l) => l.includes('Jonatán')) && lines.some((l) => l.includes('Saúl')), `${list.name}: ${lines.join(' / ')}`);
    assert.deepEqual(page.pageErrors, [], list.name);
    await page.context().close();
  }
});

test('Ocozías and Jehoacaz: the kinship goes first, even when only the summary starts with it', async () => {
  // data/people/ocozias-de-israel.yaml and ocozias-de-juda.yaml: both `disambiguation` texts open with the reign
  // («Rey de Israel», «Rey de Judá»); the summaries open with the parents, and docs/ideas/homonimos.md puts them first.
  // On a 430-wide phone with Linux fonts the landing cuts the other one at «Hijo de Jehora»: still told apart.
  await checkNamesakes('Ocozías', ['Acab']);
  // Jehoacaz de Israel carries a long date («c. 876 a.e.c. - 859 a.e.c.»): with «2 con este nombre» in the title, the
  // title took two lines on the phone.
  await checkNamesakes('Jehoacaz', ['Jehú', 'Josías']);
});

test('Acán: the kinship right after a short first piece is the line', async () => {
  // data/people/acan-hijo-de-carmi.yaml: «Acán de Judá, hijo de Carmí, …». The first piece, «de Judá», says less than
  // the kinship that follows it, which tells him from the Acán son of Ézer.
  await checkNamesakes('Acán', ['Carmí', 'Ézer']);
});

test('Mizpá: each of the two places says where it was, from its own summary', async () => {
  // Places carry no `disambiguation`: the line is the head of the summary, «Ciudad de Benjamín» and «Ciudad de Galaad».
  await checkNamesakes('Mizpá', ['Benjamín', 'Galaad']);
});

test('Labán: a person named like a place is not a namesake, and keeps its whole line in both lists', async () => {
  // data/people/laban.yaml and data/places/laban.yaml: «persona» and «lugar» already tell the two rows apart, so the
  // person keeps its `disambiguation` («…suegro de Jacob…») and gets no distinguishing line.
  for (const list of LISTS) {
    const page = await openPage(DESKTOP, list.hash);
    await page.locator(list.box).fill('Labán');
    await page.waitForFunction((sel) => [...document.querySelectorAll(sel)].some((r) => /suegro de Jacob/.test(r.textContent)), list.row);
    assert.equal(await page.locator(`${list.row} .be-distinguisher`).count(), 0, `${list.name}: a distinguishing line for Labán`);
    assert.deepEqual(page.pageErrors, [], list.name);
    await page.context().close();
  }
});

test('the line does not end a sentence at the «c.» of a date, and keeps the dot of «e.c.»', async () => {
  // data/people/caifas.yaml opens «Sumo sacerdote de c. 18 a c. 36 e.c.»: cut at the first «c.», the line was
  // «Sumo sacerdote de c». data/people/esdras.yaml: «… de 468 a.e.c.», whose last dot closes the sentence too.
  const page = await openPage(DESKTOP, 't=50.3000');
  const line = (id) => page.evaluate((id) => window.BE.distinguishingLine({ tipo: 'persona', id }), id);
  assert.match(await line('caifas'), /^Sumo sacerdote de c\. 18 a c\. 36 e\.c\./);
  assert.match(await line('esdras'), /468 a\.e\.c\.$/);
  assert.deepEqual(page.pageErrors, []);
});

test('after «padre de X», the apposition that says who X is stays in the line; after «hijo de X» it does not', async () => {
  // data/people/jacob-hijo-de-mattan.yaml: «Jacob padre de José, el esposo de María». «padre de José» alone fits the
  // patriarch Jacob too. data/people/seba-hijo-de-bicri.yaml: «Seba hijo de Bicrí, el benjaminita que se sublevó…»: the
  // apposition is about Seba, and glued to «hijo de Bicrí» it would read as about his father.
  const page = await openPage(DESKTOP, 't=50.3000');
  const line = (id) => page.evaluate((id) => window.BE.distinguishingLine({ tipo: 'persona', id }), id);
  assert.equal(await line('jacob-hijo-de-mattan'), 'padre de José, el esposo de María');
  assert.equal(await line('seba-hijo-de-bicri'), 'hijo de Bicrí');
  assert.deepEqual(page.pageErrors, []);
});

test('every group of namesakes in data/ (scripts/homonyms.py) is told apart in the built site', async () => {
  const groups = JSON.parse(execFileSync('python3', [path.join(ROOT, 'scripts/homonyms.py'), '--json'], { cwd: ROOT, encoding: 'utf8' }));
  const total = Object.values(groups).reduce((n, gs) => n + gs.length, 0);
  assert.ok(total > 100, `scripts/homonyms.py found only ${total} groups`);
  const page = await openPage(DESKTOP, 't=50.3000');
  const fails = await page.evaluate((groups) => {
    const BE = window.BE, kinds = { person: 'persona', place: 'lugar', event: 'evento' }, out = [];
    const repeated = (ls) => ls.some((l, i) => !l || ls.map(BE.norm).indexOf(BE.norm(l)) !== i);
    for (const [kind, gs] of Object.entries(groups)) {
      for (const g of gs) {
        const tipo = kinds[kind];
        // The line of every member, and the lines the search really paints for the members it lists (6 at most).
        const lines = g.ids.map((id) => BE.distinguishingLine({ tipo, id }));
        if (repeated(lines)) out.push(`${tipo} ${g.name}: ${lines.map((l) => l || '(nada)').join(' | ')}`);
        const rs = BE.buscar(g.name), mine = rs.filter((r) => r.sel?.tipo === tipo && g.ids.includes(r.sel.id));
        const shown = mine.map((r) => BE.filaResultado(r, rs).distinguisher);
        if (mine.length < Math.min(g.ids.length, 6)) out.push(`${tipo} ${g.name}: la búsqueda lista ${mine.length} de ${g.ids.length}`);
        if (repeated(shown)) out.push(`${tipo} ${g.name}, en la lista: ${shown.map((l) => l || '(nada)').join(' | ')}`);
      }
    }
    return out;
  }, groups);
  console.log(`# ${total} groups: ${Object.entries(groups).map(([k, gs]) => `${gs.length} ${k}`).join(', ')}; ${fails.length} not told apart`);
  assert.deepEqual(fails, []);
  assert.deepEqual(page.pageErrors, []);
});
