// The reader's language (docs/ideas/ingles.md, js/language.js), in a real headless browser, plus one check without it.
//
//  - Without «lang» and before launch, the site is the Spanish site of always, even in an English browser: no switch,
//    <html lang="es">, no «lang» in the address.
//  - «?lang=en» opens the English card of Filipos, Lidia and her baptism: the texts of site/data.en.json, the interface
//    strings of site/i18n/en.js, Acts with its English abbreviation and its link to the English study Bible at the same
//    verses, and the sources with their English pages. The view in the hash is kept.
//  - A record with no English yet keeps its Spanish text and says so.
//  - apply() can run again after a chunk of the data is merged: only what the data has gets its English.
//  - The switch (bar button, and the Estudio menu on a phone) stores the choice and opens the same view in Spanish;
//    the stored choice holds on the next visit; «?lang=» in a shared link wins over it.
//  - Once launched, the browser's language decides: en-GB is English, es-MX is Spanish, fr-FR gets English.
//  - Every key of site/i18n/en.js still appears in site/js, so a string changed in the code leaves no dead translation.
//
// Run from the repository root, one browser at a time:
//   node --test --test-concurrency=1 tests/site/language.test.mjs
// Needs python3 with requirements.txt (the data is built into a temporary directory), network access for MapLibre
// (unpkg.com) and playwright-core with a Chromium: either importable, or PLAYWRIGHT_MODULE_DIR=<a node_modules directory
// that holds it>. CHROME_PATH picks another Chromium binary.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SITE = path.join(ROOT, 'site');
const DATA_FILES = ['data.json', 'data.js', 'data.en.json', 'data.en.js'];

async function loadChromium() {
  for (const name of ['playwright-core', 'playwright']) {
    try { return (await import(name)).chromium; } catch { /* next */ }
    if (process.env.PLAYWRIGHT_MODULE_DIR) {
      try { return createRequire(path.join(path.resolve(process.env.PLAYWRIGHT_MODULE_DIR), 'index.js'))(name).chromium; } catch { /* next */ }
    }
  }
  throw new Error('playwright-core not found: install it or set PLAYWRIGHT_MODULE_DIR to a node_modules directory that holds it');
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webp': 'image/webp' };
function serve(dataDir) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const rel = url === '/' ? 'index.html' : url.slice(1);
    const file = DATA_FILES.includes(rel) ? path.join(dataDir, rel) : path.join(SITE, rel);
    if (!file.startsWith(SITE) && !file.startsWith(dataDir)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(body);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

let browser, server, origin, tmp;
const errors = [];
/** A page of the atlas with its data loaded. `launched` sets the flag that turns on the browser's language. */
async function open(query, hash, { locale = 'en-US', launched = false, width = 1440, height = 900, context = null } = {}) {
  const ctx = context || await browser.newContext({ locale, viewport: { width, height }, deviceScaleFactor: 1 });
  if (launched) await ctx.addInitScript(() => { window.BE_LANGUAGE_LAUNCHED = true; });
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await p.route((url) => !url.href.startsWith(origin) && !url.hostname.endsWith('unpkg.com'), (route) => route.abort());
  await p.goto(`${origin}/index.html${query}#${hash}`);
  await p.waitForFunction(() => window.__be?.D && document.querySelector('#panel-cuerpo .be-card__title'), null, { timeout: 30000 });
  return p;
}
const card = (p) => p.evaluate(() => ({
  title: document.querySelector('#panel-cuerpo .be-card__title')?.textContent.trim(),
  body: document.querySelector('#panel-cuerpo .be-card__body')?.textContent.trim(),
  eyebrow: document.querySelector('#panel-cuerpo .be-card__eyebrow')?.textContent.trim(),
  text: document.getElementById('panel-cuerpo').textContent,
  lang: document.documentElement.lang,
  search: location.search,
  hash: location.hash,
  button: document.getElementById('idioma-boton') && getComputedStyle(document.getElementById('idioma-boton')).display !== 'none'
    ? document.getElementById('idioma-boton').textContent.trim() : null,
}));

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-language-'));
  execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--out', tmp], { cwd: ROOT, stdio: 'pipe' });
  server = await serve(tmp);
  origin = `http://127.0.0.1:${server.address().port}`;
  const chromium = await loadChromium();
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
});
after(async () => {
  await browser?.close();
  server?.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

test('every key of the English catalog still appears in the site code', () => {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(SITE, 'i18n/en.js'), 'utf8'), ctx);
  const keys = Object.keys(ctx.window.BE_I18N.en);
  assert.ok(keys.length > 20, `only ${keys.length} keys`);
  const code = [];
  const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.js')) code.push(fs.readFileSync(p, 'utf8')); } };
  walk(path.join(SITE, 'js'));
  const all = code.join('\n');
  const dead = keys.filter((k) => !all.includes(`'${k}'`));
  assert.deepEqual(dead, [], 'keys of site/i18n/en.js that no longer appear in site/js');
});

test('without lang and before launch, an English browser gets the Spanish site of always', async () => {
  const p = await open('', 'sel=lugar:filipos&t=50.5');
  const c = await card(p);
  assert.equal(c.title, 'Filipos');
  assert.match(c.body, /^Colonia romana/);
  assert.equal(c.lang, 'es');
  assert.equal(c.search, '');
  assert.equal(c.button, null, 'no switch before launch');
  await p.context().close();
});

test('?lang=en shows the English cards of Filipos, Lidia and her baptism', async () => {
  const p = await open('?lang=en', 'sel=lugar:filipos&t=50.5');
  let c = await card(p);
  assert.equal(c.title, 'Philippi');
  assert.match(c.body, /^A Roman colony and the principal city/);
  assert.match(c.eyebrow, /^City/);
  assert.equal(c.lang, 'en');
  assert.equal(c.button, 'ES');
  assert.match(c.text, /Why we say this/);
  assert.match(c.text, /Insight: “Philippi”/);
  const src = await p.evaluate(() => [...document.querySelectorAll('#panel-cuerpo .fuentes a')].map((a) => [a.textContent.trim(), a.href]));
  assert.ok(src.some(([t, h]) => t === 'Philippi' && h === 'https://www.jw.org/en/library/books/Insight-on-the-Scriptures/Philippi/'), JSON.stringify(src));
  assert.ok(src.some(([t, h]) => t === 'Acts 16' && h === 'https://www.jw.org/en/library/bible/study-bible/books/acts/16/'), JSON.stringify(src));
  assert.ok(src.some(([t]) => t === 'Bible Geocoding Data'), 'a source that is not on jw.org stays as it is');

  await p.evaluate(() => window.__be.seleccionar(window.__be.BE.parseSel('persona:lidia')));
  await p.waitForFunction(() => document.querySelector('#panel-cuerpo .be-card__title')?.textContent.trim() === 'Lydia');
  c = await card(p);
  assert.match(c.body, /^A seller of purple from Thyatira/);
  assert.match(c.text, /Paul meets her by the river outside Philippi/);

  await p.evaluate(() => window.__be.seleccionar(window.__be.BE.parseSel('evento:lidia-se-bautiza')));
  await p.waitForFunction(() => document.querySelector('#panel-cuerpo .be-card__title')?.textContent.trim().startsWith('Lydia and'));
  c = await card(p);
  assert.equal(c.title, 'Lydia and her household are baptized in Philippi');
  assert.match(c.eyebrow, /^Event/);
  assert.match(c.text, /c\. 50 C\.E\./);
  const ref = await p.evaluate(() => { const a = document.querySelector('#panel-cuerpo .be-ref'); return [a.textContent, a.href]; });
  assert.deepEqual(ref, ['Ac 16:13-15', 'https://www.jw.org/en/library/bible/study-bible/books/acts/16/#v44016013-v44016015']);
  // Searching in English finds the English title.
  await p.fill('#q', 'Lydia and her household');
  await p.waitForFunction(() => document.querySelector('#resultados')?.textContent.includes('Lydia and her household'));
  assert.deepEqual(errors, []);
  await p.context().close();
});

test('apply() runs again after a chunk: a text that arrives later gets its English, one still missing is not added', async () => {
  const p = await open('?lang=en', 'sel=lugar:tiatira&t=50.5');
  const r = await p.evaluate(async () => {
    const { BE } = window.__be;
    const f = BE.D.lugares.filipos;
    // As a core chunk without the detail: no summary, no names. apply() must not invent them.
    const english = f.resumen;
    delete f.resumen;
    await BE.idioma.apply(BE.D);
    const absent = !('resumen' in f);
    // The detail chunk arrives with the Spanish summary (the loader merges it), then calls apply() again.
    f.resumen = 'Colonia romana y ciudad principal de su distrito de Macedonia.';
    await BE.idioma.apply(BE.D);
    return { absent, again: f.resumen === english, name: f.nombre };
  });
  assert.deepEqual(r, { absent: true, again: true, name: 'Philippi' });
  assert.deepEqual(errors, []);
  await p.context().close();
});

test('a record with no English yet keeps its Spanish text and says so', async () => {
  const p = await open('?lang=en', 'sel=lugar:tiatira&t=50.5');
  const c = await card(p);
  assert.equal(c.title, 'Tiatira');
  assert.match(c.text, /This card is not translated yet: you are reading it in Spanish\./);
  await p.context().close();
});

test('the switch keeps the view, stores the choice, and a shared link wins over it', async () => {
  const ctx = await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 900 } });
  let p = await open('?lang=en', 'sel=persona:lidia&t=50.5', { context: ctx });
  const before = await card(p);
  await Promise.all([p.waitForURL(/lang=es/), p.click('#idioma-boton')]);
  await p.waitForFunction(() => document.querySelector('#panel-cuerpo .be-card__title')?.textContent.trim() === 'Lidia', null, { timeout: 30000 });
  let c = await card(p);
  assert.equal(c.lang, 'es');
  assert.equal(new URLSearchParams(c.search).get('lang'), 'es');
  assert.equal(new URLSearchParams(c.hash.slice(1)).get('sel'), new URLSearchParams(before.hash.slice(1)).get('sel'));
  assert.equal(await p.evaluate(() => localStorage.getItem('biblical-atlas:pref:idioma')), 'es');
  // Next visit without lang: the stored Spanish; a link with lang=en: English, without changing what is stored.
  await p.close();
  p = await open('', 'sel=lugar:filipos&t=50.5', { context: ctx });
  assert.equal((await card(p)).title, 'Filipos');
  await p.close();
  p = await open('?lang=en', 'sel=lugar:filipos&t=50.5', { context: ctx });
  assert.equal((await card(p)).title, 'Philippi');
  assert.equal(await p.evaluate(() => localStorage.getItem('biblical-atlas:pref:idioma')), 'es');
  await ctx.close();
});

test('on a phone the switch is in the Estudio menu', async () => {
  const p = await open('?lang=en', 'sel=lugar:filipos&t=50.5', { width: 390, height: 844 });
  assert.equal((await card(p)).button, null, 'the bar has no room for it');
  await p.click('#estudio-boton');
  const item = p.locator('#estudio-menu [data-idioma="es"]');
  assert.equal((await item.textContent()).trim(), 'Español');
  await Promise.all([p.waitForURL(/lang=es/), item.click()]);
  await p.waitForFunction(() => document.querySelector('#panel-cuerpo .be-card__title')?.textContent.trim() === 'Filipos', null, { timeout: 30000 });
  await p.context().close();
});

test('once launched, the browser language decides and the address carries it', async () => {
  for (const [locale, title, lang] of [['en-GB', 'Philippi', 'en'], ['es-MX', 'Filipos', 'es'], ['fr-FR', 'Philippi', 'en']]) {
    const p = await open('', 'sel=lugar:filipos&t=50.5', { locale, launched: true });
    const c = await card(p);
    assert.equal(c.title, title, locale);
    assert.equal(new URLSearchParams(c.search).get('lang'), lang, locale);
    assert.ok(c.button, `${locale}: the switch shows once launched`);
    await p.context().close();
  }
});
