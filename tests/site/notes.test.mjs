// Private notes (proposal 14 of the ideas on the graph and relations), tested in a real headless browser.
//
// Run from the root of the repository, after `python3 scripts/build.py` has written site/data.json:
//
//   npx -y -p playwright-core@1 node --test tests/site/notes.test.mjs
//
// It serves site/ itself on a free local port. It needs Chrome installed, or a Chromium downloaded by Playwright.
// Optional: BE_SITE_DIR=<dir> tests another copy of the site (a checkout of main, to see these tests fail there);
// BE_DATA=_local/<x>/data.json loads another data file through the site's ?datos=; PLAYWRIGHT_CORE=<path> points at
// an installed playwright-core.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SITE_DIR = path.resolve(process.env.BE_SITE_DIR || path.join(ROOT, 'site'));
const DATA = process.env.BE_DATA || '';
const WAIT = 5000;   // what a control or button gets to appear; the site without notes fails fast
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true };

// ---------------------------------------------------------------------------
// Browser and server
// ---------------------------------------------------------------------------
function loadChromium() {
  const req = createRequire(import.meta.url);
  const tries = [process.env.PLAYWRIGHT_CORE, 'playwright-core', 'playwright'].filter(Boolean);
  // `npx -p playwright-core` puts <cache>/node_modules/.bin on PATH: its package sits next to that folder.
  for (const dir of String(process.env.PATH || '').split(path.delimiter)) {
    if (dir.endsWith(path.join('node_modules', '.bin'))) tries.push(path.join(dir, '..', 'playwright-core'), path.join(dir, '..', 'playwright'));
  }
  for (const t of tries) {
    try { const m = req(t); if (m.chromium) return m.chromium; } catch { /* next */ }
  }
  throw new Error('playwright-core not found: run the tests with `npx -y -p playwright-core@1 node --test tests/site/notes.test.mjs`.');
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.pmtiles': 'application/octet-stream' };
function serve(dir) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(dir, rel.endsWith('/') ? `${rel}index.html` : rel);
    if (!file.startsWith(dir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    const body = fs.readFileSync(file);
    const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
    if (range) {
      const a = +range[1], b = range[2] ? Math.min(+range[2], body.length - 1) : body.length - 1;
      res.writeHead(206, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'content-range': `bytes ${a}-${b}/${body.length}`, 'accept-ranges': 'bytes' });
      res.end(body.subarray(a, b + 1));
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'accept-ranges': 'bytes' });
    res.end(body);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

let browser, server, base;
before(async () => {
  if (!DATA && !fs.existsSync(path.join(SITE_DIR, 'data.json'))) throw new Error(`${SITE_DIR}/data.json is missing: run python3 scripts/build.py first.`);
  server = await serve(SITE_DIR);
  base = `http://127.0.0.1:${server.address().port}/`;
  const chromium = loadChromium();
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  try { browser = await chromium.launch({ headless: true, args }); }
  catch { browser = await chromium.launch({ headless: true, args, channel: 'chrome' }); }
});
after(async () => { await browser?.close(); server?.close(); });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const url = (hash = '') => `${base}index.html${DATA ? `?datos=${DATA}` : ''}${hash ? `#${hash}` : ''}`;
async function newContext(opts = DESKTOP) {
  const context = await browser.newContext({ deviceScaleFactor: 1, acceptDownloads: true, ...opts });
  context.setDefaultTimeout(WAIT);
  return context;
}
async function ready(page) {
  await page.waitForFunction(() => window.BE?.D && window.__be, null, { timeout: 30000 });
  await page.waitForTimeout(600);
}
async function openSite(context, hash = '') {
  const page = await context.newPage();
  page.pageErrors = [];
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  await page.goto(url(hash));
  await ready(page);
  return page;
}
async function reload(page) { await page.reload(); await ready(page); }
/** Opens the editor with the pencil, writes the text as a person types it and closes with «Listo». */
async function writeNote(page, pencil, text) {
  await page.locator(pencil).first().click();
  const box = page.locator('#note-editor #note-text');
  await box.fill('');
  await box.pressSequentially(text, { delay: 5 });
  await page.locator('#note-editor button[type="submit"]').click();
  await page.locator('#note-editor').waitFor({ state: 'hidden' });
}
async function openMyNotes(page) {
  await page.locator('#estudio-boton').click();
  await page.locator('[data-menu="notas"]').click();
  await page.locator('#notes-list').waitFor({ state: 'visible' });
}
async function importFile(page, name, content) {
  await page.locator('#notes-list [data-notes-file]').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(content) });
  await page.waitForTimeout(300);
}
const storage = (page) => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort())));
const token = () => `nota${Math.random().toString(36).slice(2, 10)}`;

const KEY = 'biblical-earth:notes';
const note = (text, when = '2026-01-01T00:00:00.000Z', label = '') => ({ text, label, created: when, updated: when });
const store = (notes, version = 1) => JSON.stringify({ format: 'biblical-earth-notes', version, notes });
/** Puts a store in localStorage and reloads, so the site reads it as it would on a later visit. */
async function setStore(page, raw) { await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, raw]); await reload(page); }
const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null')?.notes || null, KEY);
/** What has the keyboard focus. */
const active = (page) => page.evaluate(() => {
  const a = document.activeElement;
  return { id: a?.id || '', tag: a?.tagName || '', key: a?.dataset?.noteKey || '', text: (a?.textContent || '').trim().slice(0, 40),
    inPanel: !!a?.closest?.('#panel-cuerpo'), inReading: !!a?.closest?.('#vista-lectura'), visible: !!a?.checkVisibility?.() };
});
const settle = (page) => page.waitForTimeout(400);   // the card and the reading repaint on the next frames
/** Waits (up to 3 s: frames are slow while the map draws in a headless browser) until the focus rests on something. */
const focusSettles = (page, key = '') => page.waitForFunction((k) => {
  const a = document.activeElement;
  return a && a !== document.body && !a.closest('dialog:not([open])') && (!k || a.dataset.noteKey === k);
}, key, { timeout: 3000 }).catch(() => {});
/** Waits (up to 3 s) until the note of key is stored with text: the save runs 400 ms after the last key, later on a busy page. */
const savedSoon = (page, key, text) => page.waitForFunction(([k, n, t]) => JSON.parse(localStorage.getItem(k) || 'null')?.notes?.[n]?.text === t,
  [KEY, key, text], { timeout: 3000 }).catch(() => {});
const sel = (page) => page.evaluate(() => (window.BE.E.sel ? window.BE.selTexto(window.BE.E.sel) : null));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
test('a note survives a reload (1440 x 900)', { timeout: 90000 }, async () => {
  const context = await newContext(DESKTOP);
  try {
    const page = await openSite(context, 'sel=persona:pablo');
    const text = `Leer Hechos 9 otra vez, ${token()}: ¿por qué Damasco?`;
    await writeNote(page, '#panel-cuerpo .note-pencil', text);
    await reload(page);
    const pencil = page.locator('#panel-cuerpo .note-pencil').first();
    assert.match(await pencil.textContent(), /Tu nota/);
    await pencil.click();
    assert.equal(await page.locator('#note-text').inputValue(), text);
    assert.deepEqual(page.pageErrors, []);
  } finally { await context.close(); }
});

test('430 wide with touch: a tap by the pencil writes a note that survives a reload, and every control is 44 px tall', { timeout: 90000 }, async () => {
  const context = await newContext(PHONE);
  try {
    const page = await openSite(context, 'sel=persona:pablo');
    const tapNear = async (locator, dy = 0) => { const b = await locator.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2 + dy); };
    const tall = async (scope) => {
      const small = await page.locator(`${scope} button:visible, ${scope} .notes-choice:visible`).evaluateAll((els) => els
        .map((e) => [e.textContent.trim().slice(0, 30), Math.round(e.getBoundingClientRect().height)]).filter(([, h]) => h < 44));
      assert.deepEqual(small, [], `controls under 44 px in ${scope}`);
    };
    // The pencil is 28 px tall; tactil.css gives it a 44 px zone, so a tap 20 px above its centre still opens it.
    await tapNear(page.locator('#panel-cuerpo .note-pencil').first(), -20);
    await page.locator('#note-editor').waitFor();
    const text = `Desde el móvil ${token()}`;
    await page.locator('#note-text').pressSequentially(text, { delay: 5 });
    await savedSoon(page, 'persona:pablo', text);
    await page.locator('#note-editor [data-note-delete]').waitFor({ state: 'visible', timeout: 3000 });
    await tall('#note-editor');
    await page.locator('#note-editor [data-note-delete]').tap();
    await tall('#note-editor');
    await page.locator('#note-editor [data-note-keep]').tap();
    await page.locator('#note-editor button[type="submit"]').tap();
    await page.locator('#note-editor').waitFor({ state: 'hidden' });
    await reload(page);
    await page.locator('#panel-cuerpo .note-pencil').first().tap();
    assert.equal(await page.locator('#note-text').inputValue(), text);
    await page.locator('#note-editor button[type="submit"]').tap();
    await page.locator('#estudio-boton').tap();
    await page.locator('[data-menu="notas"]').tap();
    await page.locator('#notes-list').waitFor();
    await tall('#notes-list');
    assert.deepEqual(page.pageErrors, []);
  } finally { await context.close(); }
});

test('the keyboard reaches the pencil, Escape saves and closes, and the focus comes back to the pencil', { timeout: 90000 }, async () => {
  const context = await newContext(DESKTOP);
  try {
    const page = await openSite(context, 'sel=persona:pablo');
    await page.locator('#panel-cuerpo').focus();
    let a;
    for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); a = await active(page); if (a.key) break; }
    assert.equal(a.key, 'persona:pablo', 'Tab never reached the pencil of the card');
    const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    assert.notEqual(ring, 'none', 'the pencil has no visible focus');
    await page.keyboard.press('Enter');
    assert.equal((await active(page)).id, 'note-text', 'Enter did not open the editor with the focus in the text');
    const text = `Con el teclado ${token()}`;
    await page.keyboard.type(text, { delay: 5 });
    await page.keyboard.press('Escape');
    await page.locator('#note-editor').waitFor({ state: 'hidden' });
    assert.equal((await stored(page))['persona:pablo'].text, text, 'Escape did not save');
    assert.match(await page.evaluate(() => window.BE.textoHash()), /sel=persona:pablo/, 'Escape cleared the selection underneath');
    a = await active(page);
    assert.equal(a.key, 'persona:pablo', `the focus went to ${JSON.stringify(a)}, not to the pencil`);
  } finally { await context.close(); }
});

test('back and forward close the editor and keep the note under its own card', { timeout: 90000 }, async () => {
  const context = await newContext(DESKTOP);
  try {
    const page = await openSite(context, 'sel=persona:pablo');
    await page.evaluate(() => window.BE.seleccionar({ tipo: 'persona', id: 'timoteo' }));   // as a click on Timoteo: a new entry of the history
    await settle(page);
    await page.locator('#panel-cuerpo .note-pencil').first().click();
    const text = `Sobre Timoteo ${token()}`;
    await page.locator('#note-text').pressSequentially(text, { delay: 5 });
    await page.goBack();
    await focusSettles(page);
    assert.equal(await page.locator('#note-editor').isVisible(), false, 'the editor stayed open over another card');
    assert.equal(await sel(page), 'persona:pablo');
    const notes = await stored(page);
    assert.equal(notes?.['persona:timoteo']?.text, text);
    assert.equal(notes?.['persona:pablo'], undefined);
    assert.notEqual((await active(page)).tag, 'BODY', 'the focus fell to the page');
  } finally { await context.close(); }
});

test('the note saves itself while typing and when the page goes away, and says so once', { timeout: 90000 }, async () => {
  const context = await newContext(DESKTOP);
  try {
    const page = await openSite(context, 'sel=persona:pablo');
    await page.locator('#panel-cuerpo .note-pencil').first().click();
    await page.evaluate(() => {
      window.__said = [];
      new MutationObserver(() => window.__said.push(document.getElementById('note-status').textContent))
        .observe(document.getElementById('note-status'), { childList: true, characterData: true, subtree: true });
    });
    const t = token();
    let typed = '';
    for (const part of [`Uno ${t}`, ' dos', ' tres']) {
      await page.locator('#note-text').pressSequentially(part, { delay: 5 });
      typed += part;
      await savedSoon(page, 'persona:pablo', typed);
    }
    assert.equal((await stored(page))?.['persona:pablo']?.text, `Uno ${t} dos tres`, 'the 400 ms save did not write');
    const said = await page.evaluate(() => window.__said.filter((x) => x === 'Guardada en este navegador.').length);
    assert.equal(said, 1, 'the status line announced the save more than once');
    await reload(page);   // no «Listo»: the 400 ms save already wrote it
    assert.equal((await stored(page))['persona:pablo'].text, `Uno ${t} dos tres`);
    await page.locator('#panel-cuerpo .note-pencil').first().click();
    await page.locator('#note-text').pressSequentially(' cuatro', { delay: 1 });
    await reload(page);   // at once: pagehide saves what the 400 ms timer had not
    assert.equal((await stored(page))['persona:pablo'].text, `Uno ${t} dos tres cuatro`);
  } finally { await context.close(); }
});

test('deleting takes two different buttons: a double click or an emptied box never deletes', { timeout: 90000 }, async () => {
  const context = await newContext(DESKTOP);
  try {
    const page = await openSite(context, 'sel=persona:bernabe');
    await page.locator('#panel-cuerpo .note-pencil').first().click();
    const del = page.locator('#note-editor [data-note-delete]');
    assert.equal(await del.isVisible(), false, '«Borrar la nota» shows before there is a note');
    const text = `Una nota que no quiero perder ${token()}.`;
    await page.locator('#note-text').pressSequentially(text, { delay: 5 });
    await savedSoon(page, 'persona:bernabe', text);
    await del.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    assert.equal(await del.isVisible(), true, '«Borrar la nota» does not show once the note exists');
    await del.dblclick();
    await page.waitForTimeout(700);
    assert.equal((await stored(page))?.['persona:bernabe']?.text, text, 'a double click deleted the note');
    // Emptying the box keeps the note.
    await page.locator('#note-text').fill('');
    await page.locator('#note-text').dispatchEvent('input');
    await page.waitForFunction(() => /se conserva/.test(document.getElementById('note-status').textContent), null, { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(200);
    assert.equal((await stored(page))?.['persona:bernabe']?.text, text, 'emptying the box deleted the note');
    assert.match(await page.locator('#note-status').textContent(), /se conserva/);
    await page.locator('#note-text').fill(text);
    await page.locator('#note-text').dispatchEvent('input');
    // One press asks; «Sí, borrar la nota» deletes.
    await del.click();
    assert.equal((await stored(page))?.['persona:bernabe']?.text, text, 'one press deleted the note');
    await page.waitForTimeout(600);
    await page.locator('#note-editor [data-note-delete-yes]').click();
    await page.locator('#note-editor').waitFor({ state: 'hidden' });
    assert.equal((await stored(page))?.['persona:bernabe'], undefined, '«Sí, borrar la nota» did not delete');
    assert.doesNotMatch(await page.locator('#panel-cuerpo .note-pencil').first().textContent(), /Tu nota/);
  } finally { await context.close(); }
});

test('the shared link, the address bar, the console and every request carry no text of the note', { timeout: 90000 }, async () => {
  const context = await newContext();
  try {
    const secret = token();
    const seen = [];
    context.on('request', (r) => seen.push([r.url(), r.postData() || '', JSON.stringify(r.headers())].join('\n')));
    const logs = [];
    const page = await openSite(context, 'sel=persona:pablo');
    page.on('console', (m) => logs.push(m.text()));
    await writeNote(page, '#panel-cuerpo .note-pencil', `Privado ${secret} sobre Pablo`);
    await page.goto(url('leer=hch-16'));
    await ready(page);
    await writeNote(page, '#vista-lectura .note-pencil', `Privado ${secret} sobre Hechos 16`);
    await page.waitForTimeout(700);   // the address is written 250 ms after a change
    const shared = await page.evaluate(() => [location.href, window.BE.textoHash()]);
    for (const s of shared) assert.ok(!decodeURIComponent(s).includes(secret), `the link carries the note: ${s}`);
    assert.ok(seen.length > 0, 'no request seen: the check would pass by accident');
    for (const r of seen) assert.ok(!decodeURIComponent(r).includes(secret), `a request carries the note: ${r.slice(0, 200)}`);
    for (const l of logs) assert.ok(!l.includes(secret), `the console shows the note: ${l}`);
    assert.ok((await storage(page)).includes(secret), 'the note was not saved: the check would pass by accident');
  } finally { await context.close(); }
});

test('export, clear the storage and import restores every note', { timeout: 120000 }, async () => {
  const context = await newContext();
  try {
    const t = token();
    const page = await openSite(context, 'sel=persona:pablo');
    const place = await page.evaluate(() => Object.keys(window.BE.L).find((id) => window.BE.existe('lugar', id)));
    const notes = [`Pablo ${t}`, `Lugar ${t}`, `Capítulo ${t}\ncon dos líneas`];
    await writeNote(page, '#panel-cuerpo .note-pencil', notes[0]);
    await page.evaluate((id) => window.BE.seleccionar({ tipo: 'lugar', id }), place);
    await writeNote(page, '#panel-cuerpo .note-pencil', notes[1]);
    await page.goto(url('leer=hch-16'));
    await ready(page);
    await writeNote(page, '#vista-lectura .note-pencil', notes[2]);

    await openMyNotes(page);
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#notes-list [data-notes-export]').click()]);
    const file = fs.readFileSync(await download.path(), 'utf8');
    for (const n of notes) assert.ok(file.includes(JSON.stringify(n).slice(1, -1)), `the export lacks «${n}»`);

    await page.evaluate(() => localStorage.clear());
    await reload(page);
    await openMyNotes(page);
    await page.locator('#notes-list .notes-empty').waitFor();
    await importFile(page, download.suggestedFilename(), file);
    assert.match(await page.locator('#notes-list .notes-message').textContent(), /3 notas nuevas/);
    const listed = await page.locator('#notes-list .notes-item-text').allTextContents();
    assert.deepEqual([...listed].sort(), [...notes].sort());
    await page.locator('#notes-list [data-notes-close]').click();
    await page.evaluate(() => window.BE.seleccionar({ tipo: 'persona', id: 'pablo' }));
    await page.locator('#panel-cuerpo .note-pencil').first().click();
    assert.equal(await page.locator('#note-text').inputValue(), notes[0]);
    assert.deepEqual(page.pageErrors, []);
  } finally { await context.close(); }
});

test('importing a file that is not notes fails with a message in Spanish and changes nothing', { timeout: 90000 }, async () => {
  const context = await newContext();
  try {
    const page = await openSite(context, 'sel=persona:pablo');
    await writeNote(page, '#panel-cuerpo .note-pencil', `Una nota ${token()}`);
    const before = await storage(page);
    await openMyNotes(page);
    const message = page.locator('#notes-list .notes-message');
    for (const [name, content, expected] of [
      ['datos.json', JSON.stringify({ personas: { pablo: { nombre: 'Pablo' } } }), /Este fichero no son notas de biblical-earth\. No ha cambiado nada\./],
      ['otro.json', JSON.stringify({ format: 'otra-cosa', version: 1, notes: {} }), /Este fichero no son notas de biblical-earth\. No ha cambiado nada\./],
      ['texto.json', 'esto no es JSON', /No se pudo leer el fichero: no es un fichero de notas\. No ha cambiado nada\./],
    ]) {
      await importFile(page, name, content);
      assert.match(await message.textContent(), expected);
      assert.equal(await storage(page), before, `importing ${name} changed the storage`);
    }
    assert.equal(await page.locator('#notes-list .notes-item').count(), 1);
  } finally { await context.close(); }
});

test('an import never silently overwrites a newer note: the person chooses, and joining keeps both texts whole', { timeout: 90000 }, async () => {
  const context = await newContext();
  try {
    const page = await openSite(context, 'sel=persona:pablo');
    const mine = `La mía, más reciente ${token()}`;
    const theirs = `La del fichero, más vieja ${token()}`;
    await writeNote(page, '#panel-cuerpo .note-pencil', mine);
    const file = store({ 'persona:pablo': note(theirs, '2020-01-01T00:00:00.000Z', 'Pablo') });
    await openMyNotes(page);
    const before = await storage(page);

    await importFile(page, 'viejas.json', file);
    const clash = page.locator('#notes-list .note-clash');
    await clash.waitFor();
    assert.ok((await clash.textContent()).includes(mine) && (await clash.textContent()).includes(theirs), 'the clash does not show both notes');
    assert.equal(await clash.locator('input[value="local"]').isChecked(), true, 'the newer note is not the default');
    assert.equal(await storage(page), before, 'the storage changed before the person chose');
    await page.locator('#notes-list [data-notes-cancel]').click();
    assert.equal(await storage(page), before, 'cancel changed the storage');
    assert.match((await active(page)).text, /Importar un fichero/, 'after «Cancelar» the focus is not on «Importar un fichero»');

    await importFile(page, 'viejas.json', file);
    await clash.locator('input[value="file"]').check();
    await page.locator('#notes-list [data-notes-apply]').click();
    assert.deepEqual(await page.locator('#notes-list .notes-item-text').allTextContents(), [theirs]);
    assert.match((await active(page)).text, /Importar un fichero/, 'after «Aplicar» the focus is not on «Importar un fichero»');

    // Two long notes joined, and a new note longer than the note box allows: nothing is cut.
    const long = (end) => `${'x'.repeat(6000)} ${end}`;
    await page.locator('#notes-list [data-notes-close]').click();
    await setStore(page, store({ 'persona:pablo': note(long('FIN-LOCAL'), '2026-09-01T00:00:00.000Z') }));
    await openMyNotes(page);
    await importFile(page, 'largas.json', store({ 'persona:pablo': note(long('FIN-FICHERO'), '2026-01-01T00:00:00.000Z'), 'persona:timoteo': note(`${'y'.repeat(12000)} FIN-NUEVA`) }));
    await clash.locator('input[value="both"]').check();
    await page.locator('#notes-list [data-notes-apply]').click();
    const notes = await stored(page);
    assert.ok(notes['persona:pablo'].text.includes('FIN-LOCAL') && notes['persona:pablo'].text.endsWith('FIN-FICHERO'), '«Juntar las dos en una» lost the end of a note');
    assert.equal(notes['persona:timoteo'].text.length, 12010, 'a long imported note was cut');
    assert.match(await page.locator('#notes-list .notes-message').textContent(), /1 nota nueva, 1 con las dos juntas/);
  } finally { await context.close(); }
});

test('«Mis notas»: «Abrir» shows the card and focuses its pencil, «Editar» edits, and closing gives the focus back', { timeout: 120000 }, async () => {
  const context = await newContext(DESKTOP);
  try {
    const page = await openSite(context, 'sel=persona:bernabe');
    await setStore(page, store({ 'persona:pablo': note('Nota de Pablo', '2026-02-01T00:00:00.000Z', 'Pablo'), 'chapter:44:16': note('Nota de Hechos 16', '2026-01-01T00:00:00.000Z') }));
    await openMyNotes(page);
    const open = page.locator('#notes-list [data-notes-open="persona:pablo"]');
    assert.equal(await open.getAttribute('aria-label'), 'Abrir persona: Pablo');
    await page.locator('#notes-list [data-notes-close]').click();
    assert.equal((await active(page)).id, 'estudio-boton', '«Cerrar» left the focus nowhere');
    await openMyNotes(page);
    await page.keyboard.press('Escape');
    await focusSettles(page);   // the close event of a dialog comes after the key
    assert.equal((await active(page)).id, 'estudio-boton', 'Escape left the focus nowhere');

    await openMyNotes(page);
    await page.locator('#notes-list [data-notes-edit="persona:pablo"]').click();
    assert.equal(await page.locator('#note-text').inputValue().catch(() => null), 'Nota de Pablo', '«Editar» did not open the note');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#notes-list').isVisible(), true);

    await open.click();
    await focusSettles(page, 'persona:pablo');
    await settle(page);   // and it stays there after the card repaints
    assert.equal(await sel(page), 'persona:pablo', '«Abrir» did not open the card');
    let a = await active(page);
    assert.ok(a.key === 'persona:pablo' && a.inPanel && a.visible, `after «Abrir» the focus is on ${JSON.stringify(a)}`);

    await openMyNotes(page);
    await page.locator('#notes-list [data-notes-open="chapter:44:16"]').click();
    await focusSettles(page, 'chapter:44:16');
    await settle(page);
    a = await active(page);
    assert.ok(a.key === 'chapter:44:16' && a.inReading && a.visible, `after «Abrir capítulo» the focus is on ${JSON.stringify(a)}`);
    assert.deepEqual(page.pageErrors, []);
  } finally { await context.close(); }
});

test('430 wide: «Abrir» from «Mis notas» with the reading open shows the card, not the reading', { timeout: 90000 }, async () => {
  const context = await newContext(PHONE);
  try {
    const page = await openSite(context, 'leer=hch-16');
    await setStore(page, store({ 'persona:pablo': note('Nota de Pablo', '2026-02-01T00:00:00.000Z', 'Pablo') }));
    await page.locator('#estudio-boton').tap();
    await page.locator('[data-menu="notas"]').tap();
    await page.locator('#notes-list [data-notes-open="persona:pablo"]').tap();
    await focusSettles(page, 'persona:pablo');
    await settle(page);
    assert.equal(await sel(page), 'persona:pablo');
    assert.equal(await page.evaluate(() => window.BE.estudio.vistas.lectura.abierta()), false, 'the reading still covers the card');
    const seen = await page.evaluate(() => {
      const a = document.activeElement, r = a.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { key: a.dataset.noteKey || '', onTop: !!hit && a.contains(hit) };
    });
    assert.deepEqual(seen, { key: 'persona:pablo', onTop: true }, 'the focused pencil is not the one on top');
  } finally { await context.close(); }
});

test('in presentation mode the arrows and page keys inside «Mis notas» do not move the presentation', { timeout: 90000 }, async () => {
  const context = await newContext(DESKTOP);
  try {
    const page = await openSite(context, 'sel=persona:pablo');
    await setStore(page, store({ 'persona:pablo': note('Nota de Pablo') }));
    await page.evaluate(() => document.documentElement.classList.add('be-presentando'));
    const t0 = await page.evaluate(() => window.BE.E.t);
    await openMyNotes(page);
    for (const k of ['ArrowDown', 'PageDown', 'ArrowRight', 'ArrowUp']) await page.keyboard.press(k);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.BE.E.t), t0, 'a key inside the dialog moved the presentation');
    assert.equal(await page.locator('#notes-list').isVisible(), true);
  } finally { await context.close(); }
});

test('with the site in two tabs, a save in one never silently overwrites the other', { timeout: 90000 }, async () => {
  const context = await newContext(DESKTOP);
  try {
    const a = await openSite(context, 'sel=persona:pablo');
    await writeNote(a, '#panel-cuerpo .note-pencil', 'Primera versión');
    await a.locator('#panel-cuerpo .note-pencil').first().click();   // tab A opens the editor on the old text
    const b = await openSite(context, 'sel=persona:pablo');
    const fromB = `Escrita en la pestaña B ${token()}`;
    await writeNote(b, '#panel-cuerpo .note-pencil', fromB);
    await a.bringToFront();
    await a.waitForTimeout(300);
    assert.equal(await a.locator('#note-text').inputValue(), fromB, 'an editor with nothing typed still shows the old text');
    // Tab A types while tab B saves again: both versions stay.
    await a.locator('#note-text').press('End');
    await a.locator('#note-text').pressSequentially(' y más', { delay: 1 });
    const again = `Otra vez desde B ${token()}`;
    await b.evaluate(([k, t]) => localStorage.setItem(k, JSON.stringify({ format: 'biblical-earth-notes', version: 1,
      notes: { 'persona:pablo': { text: t, label: 'Pablo', created: new Date().toISOString(), updated: new Date().toISOString() } } })), [KEY, again]);
    await a.waitForFunction(() => /otra pestaña/.test(document.getElementById('note-status').textContent), null, { timeout: 3000 }).catch(() => {});
    const text = (await stored(a))['persona:pablo'].text;
    assert.ok(text.includes(again) && text.includes(`${fromB} y más`), `one version was lost: ${text}`);
    assert.match(await a.locator('#note-status').textContent(), /otra pestaña/);
  } finally { await context.close(); }
});

test('when the browser refuses to save, «Listo» keeps the editor open and offers to copy the text', { timeout: 90000 }, async () => {
  const context = await newContext(DESKTOP);
  try {
    const page = await openSite(context, 'sel=persona:pablo');
    await page.evaluate((k) => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, v) { if (key === k) throw new DOMException('full', 'QuotaExceededError'); return set.call(this, key, v); };
    }, KEY);
    await page.locator('#panel-cuerpo .note-pencil').first().click();
    await page.locator('#note-text').pressSequentially('No cabe', { delay: 5 });
    await page.locator('#note-editor button[type="submit"]').click();
    assert.equal(await page.locator('#note-editor').isVisible(), true, '«Listo» closed the editor and the text is gone');
    assert.equal(await page.locator('#note-editor [data-note-copy]').isVisible(), true);
    assert.equal(await page.locator('#note-text').inputValue(), 'No cabe');
    await page.locator('#note-editor button[type="submit"]').click();
    assert.equal(await page.locator('#note-editor').isVisible(), false, 'a second «Listo» does not close');
  } finally { await context.close(); }
});

test('every one of the 11 kinds of card keys its pencil by its own sel, and every chapter of the reading by its book and chapter', { timeout: 120000 }, async () => {
  const context = await newContext();
  try {
    const page = await openSite(context);
    const sels = await page.evaluate(() => {
      const { BE } = window, D = BE.D;
      const first = (tipo, ids) => { const id = ids.find((x) => BE.existe(tipo, x)); return id ? `${tipo}:${id}` : `${tipo}: none found`; };
      return [
        first('persona', Object.keys(BE.PERS)), first('lugar', Object.keys(BE.L)), first('evento', D.eventos.map((x) => x.id)),
        first('carta', D.cartas.map((x) => x.id)), first('viaje', D.viajes.map((x) => x.id)), first('parada', BE.P.map((x) => x.key)),
        first('periodo', D.periodos.map((x) => x.id)), first('hallazgo', (D.hallazgos || []).map((x) => x.id)),
        first('libro', (BE.LIBROS || []).map((x) => x.slug).filter(Boolean)), 'pasaje:hch-16', first('recorrido', (D.recorridos || []).map((x) => x.id)),
      ];
    });
    assert.deepEqual(sels.filter((s) => s.endsWith('none found')), [], 'a kind of card has nothing to test');
    assert.equal(new Set(sels.map((s) => s.split(':')[0])).size, 11);
    for (const s of sels) {
      await page.evaluate((x) => window.BE.seleccionar(window.BE.parseSel(x)), s);
      const key = await page.locator('#panel-cuerpo .note-pencil').first().getAttribute('data-note-key', { timeout: WAIT }).catch(() => null);
      assert.ok(key, `no pencil on the card of ${s}`);
      if (!s.startsWith('pasaje:')) assert.equal(key, s, `the pencil of ${s} keeps its note under ${key}`);
    }
    const chapters = await page.evaluate(() => {
      const { BE } = window, other = BE.LIBROS.find((l) => l.slug && l.num !== 44 && BE.idPasaje(l, 1) && BE.pasajeDeId(BE.idPasaje(l, 1)));
      return ['hch-16', 'hch-17', BE.idPasaje(other, 1)].map((id) => { const p = BE.pasajeDeId(id); return [id, `chapter:${p.libro.num}:${p.cap}`]; });
    });
    for (const [id, expected] of chapters) {
      await page.goto(url(`leer=${id}`));
      await ready(page);
      assert.equal(await page.locator('#vista-lectura .note-pencil').getAttribute('data-note-key').catch(() => null), expected, `no pencil, or another key, in the reading of ${id}`);
      await page.evaluate((x) => window.BE.seleccionar({ tipo: 'pasaje', id: x }), id);
      assert.equal(await page.locator('#panel-cuerpo .note-pencil').first().getAttribute('data-note-key'), expected, `the chapter card of ${id} keeps another note`);
    }
  } finally { await context.close(); }
});

test('notes survive a change of the data, and entries of a type this version does not know are kept', { timeout: 90000 }, async () => {
  const context = await newContext();
  try {
    const page = await openSite(context, 'sel=persona:pablo');   // with a hash the front page does not cover the site
    // A note about something the data no longer has stays, with the name it had.
    await setStore(page, store({ 'persona:ya-no-existe': note('Nota de alguien que se fue de los datos', '2026-01-01T00:00:00.000Z', 'Alguien de antes') }));
    await openMyNotes(page);
    const item = page.locator('#notes-list .notes-item');
    assert.match(await item.textContent(), /Alguien de antes/);
    assert.match(await item.textContent(), /Ya no está en los datos del sitio; la nota se conserva\./);
    await page.locator('#notes-list [data-notes-close]').click();

    // Keys of a type this version does not know are written back untouched, and a name from Object.prototype is no kind.
    const odd = { 'tipo2:x': note('dos'), 'mi-tipo:x': note('guion'), 'Persona:x': note('mayúscula'), 'constructor:prototype': note('prototipo') };
    await setStore(page, store({ 'persona:pablo': note('Pablo'), ...odd }));
    await writeNote(page, '#panel-cuerpo .note-pencil', 'Pablo, otra vez');
    const after = await stored(page);
    for (const k of Object.keys(odd)) assert.equal(after?.[k]?.text, odd[k].text, `saving another note dropped ${k}`);
    await openMyNotes(page);
    const kinds = await page.locator('#notes-list .note-kind').allTextContents();
    assert.equal(kinds.length, 5, `«Mis notas» lists ${kinds.length} of the 5 notes`);
    assert.ok(!kinds.some((k) => /function|native/.test(k)), `a kind shows code: ${kinds}`);
    // A chapter written as a card's sel («pasaje:hch-17») joins the note of that chapter, the one its pencils open.
    await importFile(page, 'pasaje.json', store({ 'pasaje:hch-17': note('Hechos 17 escrito a mano') }));
    const keys = Object.keys(await stored(page));
    assert.ok(keys.includes('chapter:44:17') && !keys.includes('pasaje:hch-17'), `imported under ${keys}`);
  } finally { await context.close(); }
});

test('an unreadable store goes aside under its own date, a second one never replaces the first, and «Mis notas» offers both', { timeout: 90000 }, async () => {
  const context = await newContext();
  try {
    const page = await openSite(context, 'sel=persona:pablo');
    for (const raw of ['{"format":"biblical-earth-notes","version":1,"notes":{"persona:pablo":{"text":"ROTO-1 con notas', 'ROTO-2 {']) await setStore(page, raw);
    const copies = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('biblical-earth:notes:unreadable')).map((k) => localStorage.getItem(k)));
    assert.equal(copies.length, 2, `copies kept aside: ${copies.length}`);
    assert.ok(copies.some((c) => c.includes('ROTO-1')) && copies.some((c) => c.includes('ROTO-2')));
    assert.equal(await page.evaluate((k) => localStorage.getItem(k), KEY), null);
    await openMyNotes(page);
    assert.equal(await page.locator('#notes-list [data-notes-raw]').count(), 2, '«Mis notas» does not offer the copies');
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#notes-list [data-notes-raw]').first().click()]);
    assert.ok(copies.includes(fs.readFileSync(await download.path(), 'utf8')), 'the download is not the copy kept aside');
  } finally { await context.close(); }
});

test('notes saved by a newer version of the site are shown read only, never overwritten, and can be taken away', { timeout: 90000 }, async () => {
  const context = await newContext();
  try {
    const page = await openSite(context, 'sel=persona:pablo');
    const newer = store({ 'persona:pablo': { text: 'del futuro' } }, 99);
    await setStore(page, newer);
    await page.locator('#panel-cuerpo .note-pencil').first().click();
    assert.equal(await page.locator('#note-text').getAttribute('readonly'), '');
    assert.match(await page.locator('#note-status').textContent(), /versión más nueva/);
    assert.equal(await page.locator('#note-text').inputValue(), 'del futuro', 'the notes of a newer version do not show');
    await page.evaluate(() => { const t = document.getElementById('note-text'); t.value = 'escrito encima'; t.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.locator('#note-editor button[type="submit"]').click();
    assert.equal(await page.evaluate((k) => localStorage.getItem(k), KEY), newer, 'a write reached a newer store');
    await openMyNotes(page);
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#notes-list [data-notes-export]').click()]);
    assert.equal(fs.readFileSync(await download.path(), 'utf8'), newer, 'the newer store cannot be taken away');
  } finally { await context.close(); }
});

test('an unreadable store is never destroyed, even with no room to keep a copy aside', { timeout: 90000 }, async () => {
  const context = await newContext();
  try {
    await context.addInitScript(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, v) { if (String(key).startsWith('biblical-earth:notes:unreadable')) throw new DOMException('full', 'QuotaExceededError'); return set.call(this, key, v); };
    });
    const page = await openSite(context, 'sel=persona:pablo');
    const raw = '{"format":"biblical-earth-notes","version":1,"notes":{"persona:pablo":{"text":"ROTO sin sitio';
    await setStore(page, raw);
    await page.locator('#panel-cuerpo .note-pencil').first().click();
    await page.evaluate(() => { const t = document.getElementById('note-text'); t.value = 'nueva'; t.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.locator('#note-editor button[type="submit"]').click();
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate((k) => localStorage.getItem(k), KEY), raw, 'the unreadable store was replaced');
  } finally { await context.close(); }
});

test('layout: with «Letra grande» the crumbs never run under the pencil, and the pencil keeps the row of the reading', { timeout: 120000 }, async () => {
  for (const opts of [DESKTOP, PHONE]) {
    const context = await newContext(opts);
    try {
      const page = await openSite(context, 'sel=persona:pablo');
      await page.evaluate(() => document.documentElement.classList.add('be-letra-grande'));
      for (const s of ['recorrido:cartas-y-ciudades', 'lugar:monte-de-la-transfiguracion', 'viaje:visita-a-jerusalen-49', 'periodo:bardiya-o-gaumata']) {
        const overlap = await page.evaluate(async (x) => {
          const { BE } = window, y = BE.parseSel(x);
          if (!y) return `missing ${x}`;
          BE.seleccionar(y, { mover: false, encuadrar: false });
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const pc = document.getElementById('panel-cuerpo'), tools = pc.querySelector('.card-tools').getBoundingClientRect();
          const rg = document.createRange(); rg.selectNodeContents(pc.querySelector('.be-crumbs'));
          return [...rg.getClientRects()].some((r) => Math.min(r.right, tools.right) - Math.max(r.left, tools.left) > 0.5 && Math.min(r.bottom, tools.bottom) - Math.max(r.top, tools.top) > 0.5) ? `overlap ${x}` : '';
        }, s);
        assert.equal(overlap, '', `with «Letra grande» at ${opts.viewport.width}`);
      }
      if (opts === DESKTOP) {
        await page.evaluate(() => document.documentElement.classList.remove('be-letra-grande'));
        await page.goto(url('leer=hch-16'));
        await ready(page);
        const h = await page.locator('#vista-lectura .lectura-controles').evaluate((e) => e.getBoundingClientRect().height);
        assert.ok(h < 24, `the pencil makes the row of the reading ${h} px tall`);
      }
      assert.deepEqual(page.pageErrors, []);
    } finally { await context.close(); }
  }
});

test('the edge of the note box has 3:1 contrast in both themes, and on a phone the editor sits at the top with 16 px letters', { timeout: 90000 }, async () => {
  for (const opts of [DESKTOP, PHONE]) {
    const context = await newContext(opts);
    try {
      const page = await openSite(context, 'sel=persona:pablo');
      for (const theme of ['', 'be-reunion']) {
        await page.evaluate((t) => { document.documentElement.classList.toggle('be-reunion', !!t); }, theme);
        await page.evaluate(() => window.BE.notes.openEditor('persona:pablo', 'Pablo'));
        const ratio = await page.evaluate(() => {
          const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
          const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
          const a = lum(rgb(getComputedStyle(document.getElementById('note-text')).borderTopColor)), b = lum(rgb(getComputedStyle(document.getElementById('note-editor')).backgroundColor));
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        });
        assert.ok(ratio >= 3, `the edge of the note box has a contrast of ${ratio.toFixed(2)} (${theme || 'light'})`);
        if (opts === PHONE) {
          const geo = await page.evaluate(() => ({ top: document.getElementById('note-editor').getBoundingClientRect().top, font: parseFloat(getComputedStyle(document.getElementById('note-text')).fontSize) }));
          assert.ok(geo.top <= 16 && geo.font >= 16, `on a phone the editor starts at ${geo.top} px with ${geo.font} px letters`);
        }
        await page.keyboard.press('Escape');
      }
    } finally { await context.close(); }
  }
});

test('a long «Mis notas» scrolls inside: the title and «Cerrar» stay in view', { timeout: 90000 }, async () => {
  for (const opts of [DESKTOP, PHONE]) {
    const context = await newContext(opts);
    try {
      const page = await openSite(context, 'sel=persona:pablo');
      await setStore(page, store(Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`persona:p${i}`, note(`Nota ${i}\ncon\nvarias\nlíneas`)]))));
      await openMyNotes(page);
      await page.locator('#notes-list').evaluate((d) => { d.scrollTop = 5000; const b = d.querySelector('.notes-body'); if (b) b.scrollTop = 5000; });
      const close = await page.locator('#notes-list [data-notes-close]').boundingBox();
      assert.ok(close && close.y >= 0 && close.y + close.height <= opts.viewport.height, `«Cerrar» left the screen: ${JSON.stringify(close)}`);
      assert.deepEqual(page.pageErrors, []);
    } finally { await context.close(); }
  }
});
