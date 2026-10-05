// Accessibility guard: axe-core (WCAG 2.2 A and AA rules) over every view of the site, at 1440 x 900 and 430 x 932, in
// the light theme, with the browser asking for a dark theme, and in meeting mode. Any violation fails, unless ALLOW
// below names it with its reason. Run from the root of the repository, after `python3 scripts/build.py`:
//
//   npm install --prefix /tmp/pw playwright-core@1.63.0 @axe-core/playwright@4.13.0 axe-core@4.13.0
//   PLAYWRIGHT_MODULE_DIR=/tmp/pw/node_modules node --test --test-concurrency=1 tests/site/accesibilidad.test.mjs
//
// PLAYWRIGHT_MODULE_DIR (or PLAYWRIGHT_CORE, whose parent folder is used) is the node_modules folder that holds both
// playwright-core and @axe-core/playwright. BE_SITE_DIR=<dir> tests another copy of the site. BE_AXE_REPORT=<file>
// writes every violation found, allowed or not, one JSON line each, for the tables of a review. Hosts other than the
// local server and unpkg.com (MapLibre) are blocked: the map draws its own relief, and its controls are scanned too.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SITE_DIR = path.resolve(process.env.BE_SITE_DIR || path.join(ROOT, 'site'));
const REPORT = process.env.BE_AXE_REPORT || '';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const SCREENS = {
  1440: { viewport: { width: 1440, height: 900 } },
  430: { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true },
};
// The site has one dark look, meeting mode. «oscuro» is a browser that asks for a dark theme (prefers-color-scheme):
// the site does not follow it, and the scan proves nothing breaks when it is asked.
const THEMES = ['claro', 'oscuro', 'reunión'];

/** What axe may report and the guard lets pass, each with its reason. `rule` is the axe rule id; `when` reads what
    the page says of the element (`facts`, below); `views` (optional) limits it to some views. Nothing else passes. */
const ALLOW = [
  { rule: 'target-size', when: (f) => f.marker,
    reason: 'A point, name or number on the map sits where the place is: its position is the information (the «essential» '
      + 'exception of WCAG 2.5.8). Every place, person and stop also opens from the search, its card and the timeline.' },
];

/** What an allowlist entry can ask of a reported element, measured in the page: `marker`, it is a MapLibre marker
    (a point, a name or a number drawn on the map). */
const facts = (page, targets) => page.evaluate((targets) => targets.map((t) => {
  const el = document.querySelector(t);
  return el ? { marker: !!el.closest('.maplibregl-marker') } : {};
}), targets);

// ---------------------------------------------------------------------------
// Browser, axe and server
// ---------------------------------------------------------------------------
function requireFrom() {
  const dirs = [process.env.PLAYWRIGHT_MODULE_DIR, process.env.PLAYWRIGHT_CORE && path.dirname(path.resolve(process.env.PLAYWRIGHT_CORE))].filter(Boolean);
  const reqs = dirs.map((d) => createRequire(path.join(path.resolve(d), 'index.js')));
  reqs.push(createRequire(import.meta.url));
  return (name) => {
    for (const r of reqs) { try { return r(name); } catch { /* next */ } }
    throw new Error(`${name} not found: set PLAYWRIGHT_MODULE_DIR to a node_modules folder that holds playwright-core and @axe-core/playwright`);
  };
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

let browser, server, base, AxeBuilder;
before(async () => {
  if (!fs.existsSync(path.join(SITE_DIR, 'data.json'))) throw new Error(`${SITE_DIR}/data.json is missing: run python3 scripts/build.py first`);
  const req = requireFrom();
  const { chromium } = req('playwright-core');
  ({ AxeBuilder } = req('@axe-core/playwright'));
  server = await serve(SITE_DIR);
  base = `http://127.0.0.1:${server.address().port}/`;
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  try { browser = await chromium.launch({ headless: true, args }); }
  catch { browser = await chromium.launch({ headless: true, args, channel: 'chrome' }); }
  if (REPORT) fs.writeFileSync(REPORT, '');
});
after(async () => { await browser?.close(); server?.close(); });

// ---------------------------------------------------------------------------
// The views
// ---------------------------------------------------------------------------
/** Waits for the app to settle: data in, map loaded and still, no card «Cargando…», two painted frames. */
async function settle(page) {
  await page.waitForFunction(() => window.BE?.D && window.__be, null, { timeout: 60000 });
  await page.waitForFunction(() => { const m = window.__be.map; return !m || (m.loaded() && !m.isMoving()); }, null, { timeout: 60000 }).catch(() => {});
  await page.waitForFunction(() => !document.querySelector('#panel-cuerpo [aria-busy="true"]'), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
}
const app = (hash, then) => async (page) => {
  await page.goto(`${base}index.html${hash ? `#${hash}` : ''}`, { waitUntil: 'domcontentloaded' });
  await settle(page);
  if (then) { await then(page); await settle(page); }
};
const plain = (file) => async (page) => {
  await page.goto(`${base}${file}`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
};
const TOUR = 'sel=recorrido:cartas-y-ciudades';
const VIEWS = [
  { name: 'portada', open: app('') },
  { name: 'ficha de persona', open: app('sel=persona:pablo&t=50.3000') },
  { name: 'ficha de lugar', open: app('sel=lugar:corinto&t=50.3000') },
  { name: 'línea de tiempo', open: app('sel=viaje:segundo-viaje&t=50.3000&linea=grande') },
  { name: 'grafo', open: app('grafo=pablo&t=50.3000') },
  { name: 'modo lectura', open: app('leer=hch-16') },
  // On the phone the tour card is one line, and a tap opens it whole; at 1440 it is always whole.
  { name: 'recorrido', open: app(TOUR) },
  { name: 'recorrido abierto', screens: ['430'], open: app(TOUR, (p) => p.locator('[data-recorrido-abrir]').click()) },
  { name: 'búsqueda', open: app('t=50.3000', async (p) => {
    await p.evaluate(() => document.querySelector('#q').focus());
    await p.keyboard.type('Pablo', { delay: 10 });
    await p.waitForFunction(() => document.querySelectorAll('#resultados [role="option"]').length > 2, null, { timeout: 10000 });
  }) },
  { name: 'pasaje sin coincidencias', open: app('p=Snt1:5') },
  { name: 'calendario', open: plain('calendario.html') },
  { name: 'acerca de', open: plain('acerca.html') },
];

// ---------------------------------------------------------------------------
// The scan
// ---------------------------------------------------------------------------
const used = new Set();
let scans = 0;
const allowedBy = (v, view, f) => ALLOW.find((a) => a.rule === v.id && (!a.views || a.views.includes(view)) && a.when(f));

/** axe leaves undecided the contrast of text whose background it cannot read: the cards that float over the map, the
    names of the map. This measures the HTML text among them: its colour over the background colours of the element and
    its ancestors, composited, and where they stay translucent down to the map, over white and over black, keeping the
    worse. Not measured: names on the map itself (MapLibre markers carry a halo, not a background), SVG text, whose
    background is another shape, text painted over a ::before or ::after (the shapes of the graph's nodes) or a
    gradient, and marks that are not letters or digits (a «·» in an empty cell). Returns every measure. */
const measure = (page, targets) => page.evaluate((targets) => {
  const parse = (c) => {
    let m = /^rgba?\(([^)]+)\)$/.exec(c);
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p[3] ?? 1]; }
    m = /^color\(srgb ([^)]+)\)$/.exec(c);
    if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] ?? 1]; }
    return null;
  };
  const over = (a, b) => { const al = a[3] + b[3] * (1 - a[3]); return al ? [0, 1, 2].map((i) => (a[i] * a[3] + b[i] * b[3] * (1 - a[3])) / al).concat(al) : [0, 0, 0, 0]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const canvas = document.querySelector('#mapa-gl canvas');
  const out = [];
  for (const t of targets) {
    const el = document.querySelector(t);
    if (!el || el instanceof SVGElement || el.closest('.maplibregl-marker') || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    if (!/[\p{L}\p{N}]/u.test(el.textContent)) continue;
    const cs = getComputedStyle(el);
    let fg = parse(cs.color);
    if (!fg) continue;
    const layers = [];
    let alpha = 1, base = null, unknown = false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (canvas && n !== el && n.contains(canvas)) break;   // under here is the map, of any colour
      const s = getComputedStyle(n);
      alpha *= parseFloat(s.opacity);
      if (s.backgroundImage !== 'none' && !s.backgroundImage.startsWith('url(')) { unknown = 'gradient'; break; }
      if (n === el && ['::before', '::after'].some((ps) => { const q = getComputedStyle(n, ps); return q.content !== 'none' && (parse(q.backgroundColor)?.[3] || 0) > 0; })) { unknown = 'pseudo'; break; }
      const bg = parse(s.backgroundColor);
      if (bg && bg[3] > 0) { layers.push(bg); if (bg[3] >= 1) { base = bg; break; } }
    }
    if (unknown) continue;
    fg = [fg[0], fg[1], fg[2], fg[3] * alpha];
    // layers run from the element down; with an opaque one it is the last, else white and black stand under them.
    const bases = base ? [layers[layers.length - 1]] : [[255, 255, 255, 1], [0, 0, 0, 1]];
    const rest = base ? layers.slice(0, -1) : layers;
    let worst = Infinity, at = null;
    for (const b of bases) {
      let bg = b;
      for (const l of [...rest].reverse()) bg = over(l, bg);
      const r = ratio(over(fg, bg), bg);
      if (r < worst) { worst = r; at = bg; }
    }
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    out.push({ target: t, ratio: Math.round(worst * 100) / 100, need, ok: worst >= need - 0.005, fg: fg.map(Math.round).join(','), bg: at.map(Math.round).join(','), translucent: !base });
  }
  return out;
}, targets);

async function scan(view, screen, theme) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...SCREENS[screen], colorScheme: theme === 'oscuro' ? 'dark' : 'light', reducedMotion: 'reduce' });
  context.setDefaultTimeout(15000);
  context.setDefaultNavigationTimeout(60000);   // MapLibre comes from unpkg.com, slow on a loaded machine
  if (theme === 'reunión') await context.addInitScript(() => { try { localStorage.setItem('biblical-atlas:pref:reunion', '1'); } catch { /* none */ } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route((u) => !u.href.startsWith(base) && !u.hostname.endsWith('unpkg.com'), (r) => r.abort());
  try {
    await view.open(page);
    const { violations, incomplete } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    // What axe could not decide (a contrast over the map or a gradient) is not a failure; the report keeps it for review.
    if (REPORT) for (const v of incomplete) for (const n of v.nodes) fs.appendFileSync(REPORT, `${JSON.stringify({ rule: v.id, view: view.name, screen, theme, target: n.target.flat().join(' '), incomplete: true, why: (n.any[0]?.message || '').slice(0, 160) })}\n`);
    const undecided = incomplete.filter((v) => v.id === 'color-contrast').flatMap((v) => v.nodes.map((n) => n.target.flat().join(' ')));
    for (const m of await measure(page, undecided)) {
      if (REPORT) fs.appendFileSync(REPORT, `${JSON.stringify({ rule: 'contrast-measured', view: view.name, screen, theme, ...m })}\n`);
      if (m.ok) continue;
      violations.push({ id: 'color-contrast', impact: 'serious', nodes: [{ target: [m.target],
        failureSummary: `measured\n${m.ratio}:1 for ${m.need}:1, text rgba(${m.fg}) on rgb(${m.bg})${m.translucent ? ', the worse over white or black under a translucent card' : ''}` }] });
    }
    const out = [];
    const known = await facts(page, violations.flatMap((v) => v.nodes.map((n) => n.target.flat().join(' '))));
    let k = 0;
    for (const v of violations) {
      for (const n of v.nodes) {
        const target = n.target.flat().join(' ');
        const f = known[k++];
        const allow = allowedBy(v, view.name, f);
        if (allow) used.add(allow);
        const row = { rule: v.id, impact: v.impact, view: view.name, screen, theme, target, allowed: !!allow, ...f,
          why: (n.failureSummary || '').split('\n').slice(1, 2).join('').trim() };
        if (REPORT) fs.appendFileSync(REPORT, `${JSON.stringify(row)}\n`);
        if (!allow) out.push(row);
      }
    }
    scans += 1;
    return { out, errors };
  } finally {
    await context.close();
  }
}

for (const view of VIEWS) {
  for (const screen of view.screens || Object.keys(SCREENS)) {
    test(`axe finds nothing outside the allowlist: ${view.name} at ${screen}`, { timeout: 300000 }, async () => {
      // One line per rule and element, with the themes it fails in.
      const found = new Map();
      for (const theme of THEMES) {
        const { out, errors } = await scan(view, screen, theme);
        for (const r of out) {
          const k = `${r.rule} (${r.impact}) on ${r.target}: ${r.why}`;
          found.set(k, [...(found.get(k) || []), theme]);
        }
        assert.deepEqual(errors, [], `page errors in ${view.name} at ${screen}, ${theme}`);
      }
      const lines = [...found].map(([k, themes]) => `[${themes.join(', ')}] ${k}`);
      assert.equal(lines.length, 0, `${lines.length} violations in ${view.name} at ${screen}:\n  ${lines.join('\n  ')}`);
    });
  }
}

const TOTAL = VIEWS.reduce((n, v) => n + (v.screens || Object.keys(SCREENS)).length * THEMES.length, 0);
test('every allowlist entry is still needed and says why', () => {
  for (const a of ALLOW) assert.ok(a.reason && a.reason.length > 20 && typeof a.when === 'function', `allowlist entry ${a.rule} without a reason or a condition`);
  // Only meaningful when every scan ran (a --test-name-pattern run skips the rest).
  if (scans < TOTAL) return;
  const stale = ALLOW.filter((a) => !used.has(a)).map((a) => `${a.rule}: ${a.reason}`);
  assert.deepEqual(stale, [], 'allowlist entries that no longer match anything: remove them');
});

// ---------------------------------------------------------------------------
// What axe cannot see: the keyboard
// ---------------------------------------------------------------------------
async function keyboardPage(screen, hash) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...SCREENS[screen], reducedMotion: 'reduce' });
  context.setDefaultTimeout(15000);
  context.setDefaultNavigationTimeout(60000);   // MapLibre comes from unpkg.com, slow on a loaded machine
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  await page.route((u) => !u.href.startsWith(base) && !u.hostname.endsWith('unpkg.com'), (r) => r.abort());
  await app(hash)(page);
  return page;
}
const focused = (page) => page.evaluate(() => {
  const a = document.activeElement;
  return { id: a?.id || '', foco: a?.dataset?.foco || '', salto: a?.dataset?.salto || '', text: (a?.getAttribute('aria-label') || a?.textContent || '').trim().slice(0, 60) };
});
const outline = (page) => page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
const where = (page) => page.evaluate(() => ({ t: window.BE.E.t, sel: window.BE.E.sel ? `${window.BE.E.sel.tipo}:${window.BE.E.sel.id}` : null, step: window.BE.recorridos.pasoDe('cartas-y-ciudades') }));

test('the first two Tab stops skip the map: «Ir a la ficha» and «Ir a la línea de tiempo»', async () => {
  const page = await keyboardPage('1440', 'sel=persona:pablo&t=50.3000');
  await page.keyboard.press('Tab');
  assert.equal((await focused(page)).salto, '#panel-cuerpo');
  await page.keyboard.press('Tab');
  assert.equal((await focused(page)).salto, '#pista');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  assert.equal((await focused(page)).id, 'panel-cuerpo', '«Ir a la ficha» did not move the focus to the card');
  assert.notEqual(await outline(page), 'none', 'the focus on the card is not drawn');
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

test('430: with the sheet folded, «Ir a la ficha» unfolds it and moves the focus to the card', async () => {
  const page = await keyboardPage('430', 'sel=persona:pablo&t=50.3000');
  await page.locator('#hoja-asa').click();
  assert.equal(await page.locator('#hoja-asa').getAttribute('aria-expanded'), 'false', 'the sheet did not fold');
  await page.locator('.salto[data-salto="#panel-cuerpo"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#hoja-asa').getAttribute('aria-expanded'), 'true', '«Ir a la ficha» left the sheet folded');
  assert.equal((await focused(page)).id, 'panel-cuerpo', '«Ir a la ficha» did not move the focus to the card');
  assert.notEqual(await outline(page), 'none', 'the focus on the card is not drawn');
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

test('choosing in the card or in the search keeps the focus in the card', async () => {
  const page = await keyboardPage('1440', 'sel=persona:pablo&t=50.3000');
  await page.locator('#panel-cuerpo [data-sel="lugar:tarso"]').first().focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.BE.E.sel?.id === 'tarso');
  await settle(page);
  assert.equal((await focused(page)).id, 'panel-cuerpo', 'a relation chosen from the card dropped the focus');
  await page.keyboard.press('/');
  await page.keyboard.type('Corinto', { delay: 10 });
  await page.waitForFunction(() => document.querySelectorAll('#resultados [role="option"]').length > 0);
  await page.keyboard.press('Enter');
  await settle(page);
  assert.equal((await focused(page)).id, 'panel-cuerpo', 'a search result dropped the focus');
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

test('a search result that opens no card («Pablo y Pedro», the connection) does not send the focus to the old card', async () => {
  const page = await keyboardPage('1440', 'sel=persona:pablo&t=50.3000');
  await page.keyboard.press('/');
  await page.keyboard.type('Pablo y Pedro', { delay: 10 });
  await page.waitForFunction(() => document.querySelectorAll('#resultados [role="option"]').length > 0);
  await page.keyboard.press('Enter');
  await settle(page);
  assert.ok(await page.evaluate(() => document.querySelector('#vista-conexion').checkVisibility()), 'the connection did not open');
  assert.notEqual((await focused(page)).id, 'panel-cuerpo', 'the focus went to the card of the previous selection');
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

test('Enter twice on «Parada siguiente» in the card goes two stops on, with the focus kept on that button', async () => {
  const page = await keyboardPage('1440', TOUR);
  await page.locator('#panel-cuerpo .recorrido-sig').focus();
  const a = await where(page);
  for (let k = 1; k <= 2; k += 1) {
    await page.keyboard.press('Enter');
    await page.waitForFunction((n) => window.BE.recorridos.pasoDe('cartas-y-ciudades') === n, a.step + k);
    await settle(page);
    assert.ok(await page.evaluate(() => document.activeElement.matches('#panel-cuerpo .recorrido-sig')), `after Enter ${k} the focus is not on «Parada siguiente»`);
  }
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

for (const screen of ['1440', '430']) {
  test(`${screen}: on the tour card ← and → change the stop, not the date`, async () => {
    const page = await keyboardPage(screen, TOUR);
    // At 1440 the card shows «Salir y explorar»; on the phone it is one line, with the title button.
    const button = screen === '1440' ? '[data-recorrido-salir]' : '[data-recorrido-abrir]';
    await page.locator(`#vista-recorrido ${button}`).focus();
    const a = await where(page);
    await page.keyboard.press('ArrowRight');
    await settle(page);
    const b = await where(page);
    assert.equal(b.step, a.step + 1, 'ArrowRight did not go to the next stop');
    assert.ok(await page.evaluate(() => document.querySelector('#vista-recorrido').contains(document.activeElement)), 'the focus left the card');
    await page.keyboard.press('ArrowLeft');
    await settle(page);
    const c = await where(page);
    assert.equal(c.step, a.step, 'ArrowLeft did not go back');
    assert.equal(c.t, a.t, 'the date is not the stop\'s own');
    assert.deepEqual(page.errors, []);
    await page.context().close();
  });
}

test('430: ← → from «Salir y explorar» on the open tour card leave the focus on the card\'s title button', async () => {
  const page = await keyboardPage('430', TOUR);
  await page.locator('#vista-recorrido [data-recorrido-abrir]').click();
  await settle(page);
  await page.locator('#vista-recorrido [data-recorrido-salir]').focus();
  await page.keyboard.press('ArrowRight');
  await settle(page);
  assert.ok(await page.evaluate(() => document.activeElement.matches('#vista-recorrido [data-recorrido-abrir]')), 'the focus fell out of the card');
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

test('the map speaks Spanish to a screen reader: «Mapa: …», «Acercar», «Alejar»', async () => {
  const page = await keyboardPage('1440', 't=50.3000');
  const names = await page.evaluate(() => ({
    canvas: document.querySelector('#mapa-gl canvas')?.getAttribute('aria-label') || '',
    zoomIn: document.querySelector('.maplibregl-ctrl-zoom-in')?.getAttribute('aria-label') || '',
    zoomOut: document.querySelector('.maplibregl-ctrl-zoom-out')?.getAttribute('aria-label') || '',
  }));
  assert.match(names.canvas, /^Mapa: /);
  assert.equal(names.zoomIn, 'Acercar');
  assert.equal(names.zoomOut, 'Alejar');
  await page.context().close();
});

for (const [screen, want] of [['1440', 'panel-cuerpo'], ['430', 'estudio-boton']]) {
  test(`${screen}: Escape closes the connection and leaves the focus on ${want}, never on the page`, async () => {
    const page = await keyboardPage(screen, 'sel=persona:pablo&t=50.3000');
    await page.evaluate(() => window.BE.conexion.abrir('persona:pablo', 'persona:pedro'));
    await settle(page);
    await page.locator('#vista-conexion button:not(.casilla)').first().focus();
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.querySelector('#vista-conexion').checkVisibility()), false, 'Escape did not close the connection');
    assert.equal((await focused(page)).id, want, 'the focus fell to the start of the page');
    assert.deepEqual(page.errors, []);
    await page.context().close();
  });
}

for (const [screen, want] of [['1440', 'panel-cuerpo'], ['430', 'estudio-boton']]) {
  test(`${screen}: Escape closes the graph and leaves the focus on ${want}, never on the page`, async () => {
    const page = await keyboardPage(screen, 'grafo=pablo&t=50.3000');
    await page.locator('#vista-grafo button').first().focus();
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.querySelector('#vista-grafo').checkVisibility()), false, 'Escape did not close the graph');
    assert.equal((await focused(page)).id, want, 'the focus fell to the start of the page');
    assert.deepEqual(page.errors, []);
    await page.context().close();
  });
}
