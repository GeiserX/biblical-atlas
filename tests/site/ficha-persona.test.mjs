// The person card (site/js/tipos/persona.js), in a real headless browser:
//  - «Familia y cargo» sits inside the first card, right under the summary: parents, spouses, children, siblings if few,
//    predecessor and successor in an office (the vocabulary's `succeeds`, both ways) and the offices with their period,
//    each person a button that selects it. Nabucodonosor shows his successor Evil-Merodac and his reign.
//  - The other relations come in groups by kind. A group of more than three is folded behind a button with its count
//    (aria-expanded, aria-controls, Enter opens it) and opens to the same rows as before: verb, name, passage chip and
//    caption. A group of three or fewer stays open. What was opened stays open when the card is painted again.
//  - Nothing is lost: over every person in the data, every person or place a relation of theirs names is still in the
//    card, the group counts add up to the header, and only groups of more than three are folded.
//  - On a phone (390 x 844, touch) a group's button is at least 44 px tall.
//
// Run from the root of the repository, one browser at a time:
//   node --test --test-concurrency=1 tests/site/ficha-persona.test.mjs
// Needs playwright-core with a Chromium (importable, or PLAYWRIGHT_CORE=<path to playwright-core>). It uses
// site/data.json when it exists, BE_DATA_FILE=<data.json> when given, or builds the data into a temporary directory
// with python3 scripts/build.py. BE_SITE_DIR=<dir> tests another copy of the site (a checkout of main is the control,
// and fails: it has one flat list and no «Familia y cargo»).
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SITE_DIR = path.resolve(process.env.BE_SITE_DIR || path.join(ROOT, 'site'));
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

function loadChromium() {
  const req = createRequire(import.meta.url);
  const tries = [process.env.PLAYWRIGHT_CORE, 'playwright-core', 'playwright'].filter(Boolean);
  for (const dir of String(process.env.PATH || '').split(path.delimiter)) {
    if (dir.endsWith(path.join('node_modules', '.bin'))) tries.push(path.join(dir, '..', 'playwright-core'), path.join(dir, '..', 'playwright'));
  }
  if (process.env.PLAYWRIGHT_MODULE_DIR) tries.push(path.join(process.env.PLAYWRIGHT_MODULE_DIR, 'playwright-core'), path.join(process.env.PLAYWRIGHT_MODULE_DIR, 'playwright'));
  for (const t of tries) { try { const m = req(t); if (m.chromium) return m.chromium; } catch { /* next */ } }
  throw new Error('playwright-core not found: run with `npx -y -p playwright-core@1 node --test tests/site/ficha-persona.test.mjs`.');
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
function serve(dir, dataFile) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const chunk = /^\/data\.[a-z]+\.json$/.test(rel) ? path.join(path.dirname(dataFile), rel) : null;
    const file = rel === '/data.json' ? dataFile : chunk || path.join(dir, rel.endsWith('/') ? `${rel}index.html` : rel);
    if (!file.startsWith(dir) && file !== dataFile && file !== chunk) { res.writeHead(404); res.end(); return; }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

let browser, server, base, tmp;
before(async () => {
  let data = process.env.BE_DATA_FILE ? path.resolve(process.env.BE_DATA_FILE) : path.join(SITE_DIR, 'data.json');
  if (!fs.existsSync(data)) {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-ficha-persona-'));
    execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--salida', tmp], { cwd: ROOT, stdio: 'pipe' });
    data = path.join(tmp, 'data.json');
  }
  server = await serve(SITE_DIR, data);
  base = `http://127.0.0.1:${server.address().port}/`;
  const chromium = loadChromium();
  try { browser = await chromium.launch({ headless: true }); }
  catch { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
});
afterEach(async () => { for (const c of browser?.contexts() || []) await c.close().catch(() => {}); });
after(async () => { await browser?.close(); server?.close(); if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); });

/** The map page with a person's card open and painted (the detail chunk loaded). The map itself never loads: every
    host but the local server is blocked. */
async function openCard(id, screen = DESKTOP) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...screen });
  context.setDefaultTimeout(15000);
  const page = await context.newPage();
  page.pageErrors = [];
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  await page.route((url) => !url.href.startsWith(base), (r) => r.abort());
  await page.goto(`${base}index.html#t=-600&v=40&sel=persona:${id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction((id) => window.BE?.D && window.BE.E.sel?.id === id && document.querySelector('#panel-cuerpo h2'), id, { timeout: 30000 });
  return page;
}
const frames = (page) => page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));

test('Nabucodonosor: «Familia y cargo» under the summary names his successor and his reign, and each is a button', async () => {
  const page = await openCard('nabucodonosor-ii');
  const block = await page.evaluate(() => {
    const cuerpo = document.querySelector('#panel-cuerpo');
    const b = cuerpo.querySelector('.familia-cargo');
    if (!b) return null;
    const first = cuerpo.querySelector('.be-card');
    const summary = first.querySelector('.en-una-frase');
    const rows = [...b.querySelectorAll('dt')].map((dt) => ({ dt: dt.textContent.trim(), sels: [...dt.nextElementSibling.querySelectorAll('[data-sel]')].map((x) => x.dataset.sel) }));
    return {
      inFirstCard: first.contains(b),
      afterSummary: !!summary && !!(summary.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING),
      heading: b.querySelector('.be-card__eyebrow')?.textContent.trim(), rows,
    };
  });
  assert.ok(block, 'the card has a «Familia y cargo» block');
  assert.ok(block.inFirstCard && block.afterSummary, 'the block sits in the first card, under the summary');
  assert.equal(block.heading, 'Familia y cargo');
  const row = (t) => block.rows.find((r) => r.dt === t);
  assert.deepEqual(row('Hijos')?.sels || row('Hijo')?.sels, ['persona:evil-merodac']);
  assert.deepEqual(row('Sucesor')?.sels, ['persona:evil-merodac'], 'his successor in office, from the vocabulary\'s succeeds');
  assert.deepEqual(row('Cargo')?.sels, ['periodo:nabucodonosor-ii'], 'his office links its period');
  // The chip selects that person, by the same path as any data-sel button.
  await page.locator('.familia-cargo dt:text-is("Sucesor") + dd [data-sel="persona:evil-merodac"]').click();
  await page.waitForFunction(() => window.BE.E.sel?.id === 'evil-merodac');
  assert.deepEqual(page.pageErrors, []);
});

test('Nabucodonosor: the relations come in groups; a big one is folded and opens to the same rows, by mouse and by keyboard', async () => {
  const page = await openCard('nabucodonosor-ii');
  const groups = await page.evaluate(() => [...document.querySelectorAll('#panel-cuerpo .rel-grupo')].map((g) => {
    const btn = g.querySelector('.rel-grupo__boton');
    const list = g.querySelector('.relaciones');
    return { title: g.querySelector('.rel-grupo__titulo').textContent.replace(/\s+/g, ' ').trim(), button: !!btn, expanded: btn?.getAttribute('aria-expanded') ?? null,
      controls: btn ? document.getElementById(btn.getAttribute('aria-controls')) === list : null, hidden: list.hidden, visible: list.getClientRects().length > 0, n: list.children.length };
  }));
  const servicio = groups.find((g) => g.title.startsWith('A su servicio'));
  assert.ok(servicio, `a group of those who served him: ${JSON.stringify(groups.map((g) => g.title))}`);
  assert.equal(servicio.n, 14);
  assert.deepEqual([servicio.button, servicio.expanded, servicio.controls, servicio.hidden, servicio.visible], [true, 'false', true, true, false], 'folded behind its button');
  for (const g of groups) assert.equal(g.button, g.n > 3, `${g.title}: folded only when it has more than three`);
  for (const g of groups.filter((x) => !x.button)) assert.ok(g.visible, `${g.title}: a small group stays open`);
  const header = await page.evaluate(() => [...document.querySelectorAll('#panel-cuerpo .ficha-sec h3')].find((h) => /^Relaciones/.test(h.textContent))?.querySelector('.cuenta')?.textContent);
  assert.equal(Number(header), groups.reduce((s, g) => s + g.n, 0), 'the header counts every row of the groups');
  // Keyboard: focus the button and press Enter.
  const btn = page.locator('.rel-grupo__boton', { hasText: 'A su servicio' });
  await btn.focus();
  await page.keyboard.press('Enter');
  assert.equal(await btn.getAttribute('aria-expanded'), 'true');
  const rows = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.rel-grupo__boton')].find((x) => x.textContent.includes('A su servicio'));
    const list = document.getElementById(b.getAttribute('aria-controls'));
    return { visible: list.getClientRects().length > 0, rows: [...list.children].map((li) => ({ verb: li.querySelector('.rel-verbo')?.textContent.trim(), sel: li.querySelector('[data-sel]')?.dataset.sel, ref: !!li.querySelector('.be-ref'), caption: !!li.querySelector('.rel-razon') })) };
  });
  assert.ok(rows.visible);
  const abednego = rows.rows.find((r) => r.sel === 'persona:abednego');
  assert.ok(abednego, 'Abednego is in the group');
  assert.match(abednego.verb, /Nabucodonosor es su señor/);
  assert.ok(rows.rows.every((r) => r.ref && r.caption), 'each row keeps its passage chip and its caption');
  // A repaint of the same card (the videos arriving) keeps it open; the mouse closes it again.
  await page.evaluate(() => window.BE.pintarPanel(true));
  await frames(page);
  assert.equal(await page.locator('.rel-grupo__boton', { hasText: 'A su servicio' }).getAttribute('aria-expanded'), 'true', 'still open after a repaint');
  await page.locator('.rel-grupo__boton', { hasText: 'A su servicio' }).click();
  assert.equal(await page.locator('.rel-grupo__boton', { hasText: 'A su servicio' }).getAttribute('aria-expanded'), 'false');
  // The name in a row selects that person.
  await page.locator('.rel-grupo__boton', { hasText: 'A su servicio' }).click();
  await page.locator('.rel-grupo [data-sel="persona:abednego"]').click();
  await page.waitForFunction(() => window.BE.E.sel?.id === 'abednego');
  assert.deepEqual(page.pageErrors, []);
});

test('every person: no relation is lost, the counts add up and only groups of more than three fold', async () => {
  const page = await openCard('jesus');
  const bad = await page.evaluate(() => {
    const BE = window.BE;
    const out = [];
    const div = document.createElement('div');
    for (const id of Object.keys(BE.PERS)) {
      div.innerHTML = BE.tipo('persona').ficha(id);
      const shown = new Set([...div.querySelectorAll('.familia-cargo [data-sel], .relaciones [data-sel]')].map((x) => x.dataset.sel));
      for (const a of BE.aristas(id)) {
        if (a.origen === 'relacion' && !shown.has(a.sel)) { out.push(`${id}: ${a.verbo} ${a.sel} is not in the card`); break; }
      }
      const groups = [...div.querySelectorAll('.rel-grupo')];
      const n = groups.reduce((s, g) => s + g.querySelector('.relaciones').children.length, 0);
      const header = [...div.querySelectorAll('.ficha-sec h3')].find((h) => /^Relaciones/.test(h.textContent))?.querySelector('.cuenta');
      if (n && Number(header?.textContent) !== n) out.push(`${id}: header ${header?.textContent} for ${n} rows`);
      for (const g of groups) {
        const k = g.querySelector('.relaciones').children.length;
        if (!!g.querySelector('.rel-grupo__boton') !== k > 3) out.push(`${id}: a group of ${k} is ${k > 3 ? 'open' : 'folded'}`);
      }
      // Nobody is listed twice inside «Familia y cargo» under the same row.
      for (const dd of div.querySelectorAll('.familia-cargo dd')) {
        const sels = [...dd.querySelectorAll('[data-sel]')].map((x) => x.dataset.sel);
        if (new Set(sels).size !== sels.length) out.push(`${id}: a «Familia y cargo» row repeats someone`);
      }
      if (out.length > 20) break;
    }
    return out;
  });
  assert.deepEqual(bad, []);
});

test('big and small cards render the block and the groups; on a phone the group buttons are 44 px tall', async () => {
  for (const id of ['jesus', 'pablo', 'david', 'pedro', 'moises']) {
    const page = await openCard(id, PHONE);
    const r = await page.evaluate(() => ({
      groups: document.querySelectorAll('#panel-cuerpo .rel-grupo').length,
      heights: [...document.querySelectorAll('#panel-cuerpo .rel-grupo__boton')].map((b) => b.getBoundingClientRect().height).filter((h) => h > 0),
    }));
    assert.ok(r.groups > 0, `${id}: the relations come in groups`);
    for (const h of r.heights) assert.ok(h >= 44, `${id}: a group button ${h} px tall on a phone`);
    assert.deepEqual(page.pageErrors, []);
    await page.context().close();
  }
  // David: his children are many, so they go in one wrapping row; his nine brothers go below, folded.
  const page = await openCard('david');
  const d = await page.evaluate(() => ({
    children: document.querySelector('.familia-cargo dt:nth-of-type(n)') && [...document.querySelectorAll('.familia-cargo dt')].find((dt) => dt.textContent === 'Hijos')?.nextElementSibling.querySelector('ul').className,
    brothers: [...document.querySelectorAll('.rel-grupo__boton')].some((b) => b.textContent.startsWith('Hermanos')),
  }));
  assert.equal(d.children, 'fam-fila');
  assert.ok(d.brothers, 'many brothers fold below');
});
