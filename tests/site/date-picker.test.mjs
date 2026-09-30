// The date panel (site/js/datepicker.js), tested in a real headless browser. Touching the date at the top of the page
// opens a panel with nothing to type: what this date means, moments to go to, and controls to choose a date.
//
//  - Touching the date opens a dialog with a name, and there is no text input anywhere in the page.
//  - A milestone takes the cursor to the moment the data gives it, and the date at the top says its year.
//  - Choosing 607 a.e.c. with the era and the year steps, then «Ir», takes the cursor into 607 a.e.c. and keeps a
//    scale of centuries.
//  - From the scale of days, going to a day of a Hebrew month keeps the scale of days, and the cursor lands on that day.
//  - Escape closes the panel and gives the focus back to the date; the selection stays. Arrow keys move inside a grid
//    and never move the cursor behind.
//  - Text and chosen options keep a contrast of at least 4.5:1 in the light theme and in the meeting theme, and the
//    chosen option is marked by more than its colour.
//  - On a phone (430 and 360 px wide, touch): a sheet from the bottom, every target at least 44 px, a milestone moves
//    the cursor, and a touch outside the sheet closes it and gives the focus back to the date.
//  - The panel opens on the cursor's month and day, also on a sebat that began in the December before.
//  - Every Hebrew month is offered in every year (veadar only where the year has it), and every day the grids offer
//    lands on that day, that month and that year; a tebet that crosses the new year offers its two runs of days.
//  - «Elegido» names the date the chip shows after «Ir», and a tapped day stays chosen.
//  - A month or a day chosen from a wide view brings the view down to show it; a year alone keeps the scale.
//  - A double click or a double tap on «Ir» does not reach the page the panel uncovered.
//  - Space opens; ×, a close request of the system and «Sobre las fechas» close; the focus starts on the title.
//  - Back undoes a jump, and Back with the panel open closes it. Playback stops when the panel opens.
//  - At the edges: the steps are disabled at the first and the last year, the last moment of the data opens on its own
//    year, and switching the era back gives the number the person had.
//  - «Cerca de esta fecha» lists the events around the cursor, «Ahora y después» when one is at the cursor. The check
//    mark is not read as part of a name. The year and the choice are said by a live region that stays in the page.
//  - On the desk the popover sits under the date. The row under the title jumps to «Elegir una fecha», and the Tab key
//    reaches it in a few stops. With «Meses: Nuestros» the explanation fits what the date shows; on a phone the panel
//    gives the date in full.
//
// Run from the repository root, one browser at a time:
//   node --test --test-concurrency=1 tests/site/date-picker.test.mjs
// Needs python3 with requirements.txt (the data is built into a temporary directory) and playwright-core with a
// Chromium: either importable, or PLAYWRIGHT_MODULE_DIR=<a node_modules directory that holds it>. CHROME_PATH picks
// another Chromium binary. BE_ROOT=<a checkout> tests that checkout's site instead of this one (the control).
import { test, before, after, afterEach } from 'node:test';
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
const WAIT = 4000;   // what the panel gets to appear; the site without it fails fast

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
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-date-picker-'));
  execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--salida', tmp], { cwd: ROOT, stdio: 'pipe' });
  server = await serve(path.join(ROOT, 'site'), tmp);
  base = `http://127.0.0.1:${server.address().port}/index.html`;
  const chromium = await loadChromium();
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
});
// A test that fails leaves its page open: close every page after each test, so a failing run does not pile them up.
afterEach(async () => { for (const c of browser?.contexts() || []) await c.close().catch(() => {}); });
after(async () => {
  await browser?.close();
  server?.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

async function openSite(screen, hash) {
  const context = await browser.newContext({ viewport: { width: screen.width, height: screen.height }, deviceScaleFactor: 1, isMobile: screen.touch, hasTouch: screen.touch });
  const page = await context.newPage();
  page.setDefaultTimeout(WAIT);
  page.pageErrors = [];
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  // Only the local site: map tiles and fonts from other hosts are not needed to test the date panel.
  await page.route((url) => !url.href.startsWith(base.slice(0, base.lastIndexOf('/'))), (route) => route.abort());
  await page.goto(`${base}#${hash}`);
  await page.waitForFunction(() => window.BE?.D && document.querySelector('#fecha-valor')?.textContent, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  return page;
}
/** Touches the date (a tap on a phone) and waits for the panel. */
async function openPanel(page, screen) {
  if (screen.touch) await page.tap('#fecha'); else await page.click('#fecha');
  await page.waitForSelector('#date-picker[open]', { timeout: WAIT });
  await page.waitForTimeout(150);
}
const cursor = (page) => page.evaluate(() => ({ t: BE.E.t, span: BE.span(), chip: document.querySelector('#fecha-valor').textContent, open: !!document.querySelector('#date-picker[open]'), focus: document.activeElement?.id || '', sel: BE.E.sel ? `${BE.E.sel.tipo}:${BE.E.sel.id}` : '' }));
/** Where the data puts an event: the moment the site computes for it. */
const momentOf = (page, id) => page.evaluate((x) => BE.momentoEvento(BE.D.eventos.find((e) => e.id === x)), id);

test('touching the date opens a named dialog, and there is no text input in the page', async () => {
  const page = await openSite(DESKTOP, 't=49.05&v=0.2');
  await openPanel(page, DESKTOP);
  const d = await page.evaluate(() => {
    const dlg = document.querySelector('#date-picker[open]');
    const name = dlg && document.getElementById(dlg.getAttribute('aria-labelledby'))?.textContent.trim();
    const text = [...document.querySelectorAll('input')].filter((i) => ['text', 'search', ''].includes(i.getAttribute('type') || '') && !i.closest('#buscador')).length;
    const parts = [...dlg.querySelectorAll('.date-picker__heading')].map((h) => h.textContent.trim());
    return { tag: dlg.tagName, name, text, parts, expanded: document.querySelector('#fecha').getAttribute('aria-expanded'), haspopup: document.querySelector('#fecha').getAttribute('aria-haspopup') };
  });
  assert.equal(d.tag, 'DIALOG');
  assert.ok(d.name, 'the dialog has a name');
  assert.equal(d.text, 0, 'no text input outside the search box');
  assert.equal(await page.locator('#fecha input').count(), 0, 'no input inside the date');
  assert.deepEqual(d.parts, ['Esta fecha', 'Ir a un momento', 'Elegir una fecha']);
  assert.equal(d.expanded, 'true');
  assert.equal(d.haspopup, 'dialog');
  const meaning = await page.textContent('#date-picker .date-picker__meaning');
  assert.match(meaning, /aproximada/, '«c.» is explained');
  assert.match(meaning, /tebet/, 'the Hebrew month of the cursor is explained');
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('a milestone takes the cursor to the date the data gives it', async () => {
  const page = await openSite(DESKTOP, 't=50.3');
  await openPanel(page, DESKTOP);
  const expected = await momentOf(page, 'destruccion-de-jerusalen-607');
  assert.ok(Number.isFinite(expected), 'the data has the fall of Jerusalem in 607');
  await page.click('#date-picker [data-dp-key="evento:destruccion-de-jerusalen-607"]');
  await page.waitForTimeout(400);
  const c = await cursor(page);
  assert.ok(Math.abs(c.t - expected) < 1e-6, `cursor at ${c.t}, expected ${expected}`);
  assert.match(c.chip, /607 a\.e\.c\./);
  assert.equal(c.open, false, 'the panel closes after going');
  assert.equal(c.focus, 'fecha', 'the focus goes back to the date');
  await page.waitForTimeout(400);
  assert.match(await page.evaluate(() => location.hash), /t=-605\.\d{4}/, 'the address keeps the new t');
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('choosing 607 a.e.c. with the era and the year steps takes the cursor there, at the scale of centuries', async () => {
  // A view of 400 years: BE.irA without its second argument would bring it down to decades.
  const page = await openSite(DESKTOP, 't=50.3&v=400');
  await openPanel(page, DESKTOP);
  assert.equal((await page.textContent('#date-picker-year')).trim(), '50 e.c.', 'the panel opens on the year of the cursor');
  await page.click('#date-picker [data-dp-era="bce"]');
  assert.equal((await page.textContent('#date-picker-year')).trim(), '50 a.e.c.');
  for (const [step, times] of [[-100, 5], [-10, 5], [-1, 7]]) {
    for (let i = 0; i < times; i++) await page.click(`#date-picker [data-dp-step="${step}"]`);
  }
  assert.equal((await page.textContent('#date-picker-year')).trim(), '607 a.e.c.');
  const span = (await cursor(page)).span;
  await page.click('#date-picker [data-dp="go"]');
  await page.waitForTimeout(400);
  const c = await cursor(page);
  assert.equal(Math.floor(c.t), -606, `cursor at ${c.t}: 607 a.e.c. is the astronomical year -606`);
  assert.match(c.chip, /607 a\.e\.c\./);
  assert.ok(Math.abs(c.span - span) < 1e-9, `the scale stays: ${span} -> ${c.span}`);
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('from the scale of days, going to a day keeps the scale of days and lands on that day', async () => {
  const page = await openSite(DESKTOP, 't=49.05&v=0.2');
  const start = await cursor(page);
  assert.ok(start.span < 0.35, `the view starts at the scale of days (${start.span})`);
  await openPanel(page, DESKTOP);
  await page.click('#date-picker [data-dp-step="-1"]');
  await page.click('#date-picker [data-dp-month="nisan"]');
  await page.click('#date-picker [data-dp-day="14"]');
  assert.match(await page.textContent('#date-picker-choice'), /14 de nisán de 48 e\.c\./);
  await page.click('#date-picker [data-dp="go"]');
  await page.waitForTimeout(400);
  const c = await cursor(page);
  assert.ok(Math.abs(c.span - start.span) < 1e-9, `the scale of days stays: ${start.span} -> ${c.span}`);
  const h = await page.evaluate(() => { const d = BE.diaHebreo(BE.E.t); return { mes: d.mes.id, dia: d.dia }; });
  assert.deepEqual(h, { mes: 'nisan', dia: 14 });
  assert.equal(Math.floor(c.t), 48);
  assert.match(c.chip, /14 de nisán de 48 e\.c\./);
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('Escape closes the panel and gives the focus back to the date; arrow keys stay inside the grids', async () => {
  const page = await openSite(DESKTOP, 't=49.05&v=0.2&sel=persona:pablo');
  await page.focus('#fecha');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#date-picker[open]', { timeout: WAIT });
  const before = await cursor(page);
  // The chosen month has the focus stop; the arrows choose the next and the one below, and the cursor does not move.
  await page.focus('#date-picker [data-dp-month][aria-checked="true"]');
  const first = await page.evaluate(() => document.activeElement.dataset.dpMonth);
  await page.keyboard.press('ArrowRight');
  const second = await page.evaluate(() => ({ id: document.activeElement.dataset.dpMonth, checked: document.activeElement.getAttribute('aria-checked') }));
  assert.notEqual(second.id, first, 'ArrowRight moves to another month');
  assert.equal(second.checked, 'true', 'and chooses it');
  await page.keyboard.press('ArrowUp');
  const third = await page.evaluate(() => document.activeElement.dataset.dpMonth);
  assert.ok(third !== undefined && third !== second.id, 'ArrowUp moves to the row above');
  assert.equal((await cursor(page)).t, before.t, 'the arrows do not move the cursor behind');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const c = await cursor(page);
  assert.equal(c.open, false, 'Escape closes');
  assert.equal(c.focus, 'fecha', 'the focus is back on the date');
  assert.equal(c.sel, 'persona:pablo', 'Escape in the panel does not clear the selection');
  assert.equal(c.t, before.t, 'closing does not move the cursor');
  assert.equal(await page.getAttribute('#fecha', 'aria-expanded'), 'false');
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('text and chosen options keep their contrast in the light and the meeting themes', async () => {
  for (const meeting of [false, true]) {
    const page = await openSite(DESKTOP, 't=49.05&v=0.2');
    if (meeting) await page.click('#reunion-boton');
    await openPanel(page, DESKTOP);
    const r = await page.evaluate(() => {
      const rgb = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r, g, b, a }; };
      const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const bg = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c && c.a > 0.5) return c; } return { r: 255, g: 255, b: 255 }; };
      const ratio = (el) => { const a = lum(rgb(getComputedStyle(el).color)), b = lum(bg(el)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
      const sel = ['.date-picker__heading', '.date-picker__date', '.date-picker__meaning li span:last-child', '.date-picker__term', '.date-picker__link', '.date-picker__moment-title', '.date-picker__moment-date', '.date-picker__option-sub', '.date-picker__option[aria-checked="true"]', '.date-picker__step:not([disabled])', '.date-picker__choice', '.date-picker__go-button', '.date-picker__side'];
      const out = {};
      for (const s of sel) { const el = document.querySelector(`#date-picker ${s}`); out[s] = el ? +ratio(el).toFixed(2) : null; }
      const chosen = document.querySelector('#date-picker .date-picker__option[aria-checked="true"]');
      const other = document.querySelector('#date-picker .date-picker__option[aria-checked="false"]');
      return { out, mark: getComputedStyle(chosen, '::before').content, border: [getComputedStyle(chosen).borderTopWidth, getComputedStyle(other).borderTopWidth], dark: document.documentElement.classList.contains('be-reunion') };
    });
    assert.equal(r.dark, meeting);
    for (const [s, v] of Object.entries(r.out)) assert.ok(v != null && v >= 4.5, `${meeting ? 'meeting' : 'light'} theme: ${s} has contrast ${v}`);
    assert.match(r.mark, /✓/, 'the chosen option carries a check mark');
    assert.notEqual(r.border[0], r.border[1], 'and a thicker border');
    await page.context().close();
  }
});

test('on a phone: a sheet from the bottom, 44 px targets, a milestone moves the cursor, a touch outside closes', async () => {
  const page = await openSite(PHONE, 't=50.3');
  await openPanel(page, PHONE);
  const sheet = await page.evaluate(() => {
    const r = document.querySelector('#date-picker').getBoundingClientRect();
    const small = [...document.querySelectorAll('#date-picker button, #date-picker a')].filter((b) => { const q = b.getBoundingClientRect(); return q.width && (q.width < 44 || q.height < 44); }).map((b) => b.textContent.trim());
    return { left: r.left, right: r.right, bottom: r.bottom, top: r.top, small, text: document.querySelectorAll('input:not(#q)').length };
  });
  assert.equal(sheet.text, 0, 'no input besides the search box');
  assert.ok(sheet.left <= 0.5 && sheet.right >= PHONE.width - 0.5 && Math.abs(sheet.bottom - PHONE.height) < 1, `the sheet spans the bottom: ${JSON.stringify(sheet)}`);
  assert.deepEqual(sheet.small, [], 'every target is at least 44 x 44 px');
  // A touch above the sheet closes it without moving the cursor.
  const t0 = (await cursor(page)).t;
  await page.touchscreen.tap(PHONE.width / 2, Math.max(8, sheet.top / 2));
  await page.waitForTimeout(500);   // after closing, the panel keeps a second tap from the page for 400 ms
  let c = await cursor(page);
  assert.equal(c.open, false, 'a touch outside closes the sheet');
  assert.equal(c.focus, 'fecha', 'the focus is back on the date');
  assert.equal(c.t, t0);
  // A milestone, by touch.
  await openPanel(page, PHONE);
  const expected = await momentOf(page, 'pentecostes-33');
  const item = page.locator('#date-picker .date-picker__moments--milestones [data-dp-key="evento:pentecostes-33"]');
  await item.scrollIntoViewIfNeeded();
  await item.tap();
  await page.waitForTimeout(400);
  c = await cursor(page);
  assert.ok(Math.abs(c.t - expected) < 1e-6, `cursor at ${c.t}, expected ${expected}`);
  assert.equal(c.open, false);
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

// ---------------------------------------------------------------------------
// The days one can choose, and where they land
// ---------------------------------------------------------------------------
/** What the panel shows as chosen: the checked month and day, the year and «Elegido». */
const panel = (page) => page.evaluate(() => {
  const d = document.querySelector('#date-picker');
  const on = (a) => d.querySelector(`[${a}][aria-checked="true"]`);
  return {
    months: [...d.querySelectorAll('[data-dp-month]')].map((b) => b.dataset.dpMonth).filter(Boolean),
    month: on('data-dp-month')?.dataset.dpMonth || null,
    wholeYear: d.querySelector('[data-dp-month=""]')?.getAttribute('aria-checked') === 'true',
    day: on('data-dp-day')?.dataset.dpDay || null,
    year: d.querySelector('#date-picker-year')?.textContent.trim(),
    choice: d.querySelector('#date-picker-choice strong')?.textContent.trim(),
  };
});
const chipText = (c) => c.chip.replace(/^c\.\s*/, '');

test('the panel opens on the cursor\'s month and day, also on a sebat that began in the December before', async () => {
  for (const [hash, month, day, choice] of [
    ['t=24.0329&v=0.2', 'sebat', '14', '14 de sebat de 24 e.c.'],   // this sebat began in December of 23
    ['t=49.05&v=0.2', 'tebet', '26', '26 de tebet de 49 e.c.'],
    ['t=49.05&v=1.5', 'tebet', null, 'tebet de 49 e.c.'],   // at the scale of months, the month alone
  ]) {
    const page = await openSite(DESKTOP, hash);
    await openPanel(page, DESKTOP);
    const p = await panel(page);
    assert.equal(p.month, month, `${hash}: the month of the cursor is chosen`);
    assert.equal(p.day, day, `${hash}: the day of the cursor is chosen`);
    assert.equal(p.choice, choice, `${hash}: «Elegido» is the date of the cursor`);
    assert.equal(p.choice, chipText(await cursor(page)), `${hash}: and the date at the top`);
    assert.deepEqual(page.pageErrors, []);
    await page.context().close();
  }
});

test('every month is offered in every year, and every day offered lands on that day, month and year', async () => {
  const page = await openSite(DESKTOP, 't=-697.5&v=400');
  await openPanel(page, DESKTOP);
  // In the page: 699 a.e.c. is one of the years whose sebat began in December (it went missing from the grid).
  const p = await panel(page);
  assert.equal(p.year, '699 a.e.c.');
  assert.ok(p.months.includes('sebat'), `sebat is in the grid of 699 a.e.c.: ${p.months.join(' ')}`);
  // Every year of the timeline, through what the panel offers.
  const r = await page.evaluate(() => {
    const lo = Math.floor(BE.T_MIN), hi = Math.floor(BE.T_MAX);
    const regular = BE.calendario().meses.filter((m) => m.orden <= 12).map((m) => m.id);
    const out = { years: 0, days: 0, missing: [], veadar: [], wrong: [], twoRuns: {} };
    for (let y = lo; y <= hi; y++) {
      out.years++;
      const ms = BE.datePicker.monthsIn(y), ids = ms.map((m) => m.id);
      const inside = y > lo && y < hi;   // the first and the last year are cut by the ends of the timeline
      if (inside) for (const id of regular) if (!ids.includes(id)) out.missing.push(`${y}:${id}`);
      if (inside && ids.includes('veadar') !== (BE.anioHebreo(y - 1).meses.length === 13)) out.veadar.push(y);
      for (const m of ms) {
        if (m.runs.length > 1) out.twoRuns[m.id] = (out.twoRuns[m.id] || 0) + 1;
        for (const run of m.runs) for (const d of run.days) {
          out.days++;
          const h = BE.diaHebreo(d.t);
          if (h.mes.id !== m.id || h.dia !== d.day || Math.floor(d.t) !== y) out.wrong.push(`${y}:${m.id}:${d.day}`);
        }
      }
    }
    out.missing = out.missing.slice(0, 10); out.wrong = out.wrong.slice(0, 10); out.veadar = out.veadar.slice(0, 10);
    return out;
  });
  assert.equal(r.years, 4126);
  assert.ok(r.days > 1.4e6, `days offered: ${r.days}`);
  assert.deepEqual(r.missing, [], 'every month of the twelve in every year');
  assert.deepEqual(r.veadar, [], 'veadar exactly in the years that have it');
  assert.deepEqual(r.wrong, [], 'every day lands on its day, its month and its year');
  assert.ok(r.twoRuns.tebet > 0, 'some years hold the end of one tebet and the start of the next');
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('a month the new year has not got is let go: veadar, then a year of twelve months', async () => {
  const page = await openSite(DESKTOP, 't=50.5&v=400');
  // The first year from 40 e.c. whose grid has veadar while the next one has not (the calendar of the site decides).
  const y = await page.evaluate(() => { for (let y = 40; y < 99; y++) { if (BE.anioHebreo(y - 1).meses.length === 13 && BE.anioHebreo(y).meses.length === 12) return y; } return null; });
  assert.ok(y != null);
  await openPanel(page, DESKTOP);
  for (let i = 0; i < 50 - y; i++) await page.click('#date-picker [data-dp-step="-1"]');
  await page.click('#date-picker [data-dp-month="veadar"]');
  assert.equal((await panel(page)).choice, `veadar de ${y} e.c.`);
  await page.click('#date-picker [data-dp-step="1"]');
  const p = await panel(page);
  assert.ok(!p.months.includes('veadar'), `${y + 1} e.c. has no veadar`);
  assert.deepEqual([p.month, p.wholeYear, p.choice], [null, true, `${y + 1} e.c.`], 'the choice is the year alone, and «Todo el año» says so');
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('«Elegido» names the date the top shows after «Ir», and a tapped day stays chosen', async () => {
  // 51 and 21 e.c. hold two tebets; in 50 e.c. one of them has 29 days and the other ends in 50.
  for (const year of [51, 21, 50]) {
    const page = await openSite(DESKTOP, `t=${year}.5&v=0.2`);
    await openPanel(page, DESKTOP);
    await page.click('#date-picker [data-dp-month="tebet"]');
    const days = await page.$$eval('#date-picker [data-dp-day]:not([data-dp-day=""])', (bs) => bs.map((b) => ({ day: b.dataset.dpDay, run: b.dataset.dpRun ?? '' })));
    const runs = new Set(days.map((d) => d.run)).size;
    assert.equal(runs, 2, `${year}: tebet offers the end of one and the start of the next (${days.length} days)`);
    // The first and the last day of each run of days, and day 30 wherever it is offered.
    const pick = days.filter((d, i) => i === 0 || i === days.length - 1 || d.run !== days[i - 1].run || d.run !== days[i + 1]?.run || d.day === '30');
    for (const d of pick) {
      if (!(await page.$('#date-picker[open]'))) await openPanel(page, DESKTOP);
      if ((await panel(page)).month !== 'tebet') await page.click('#date-picker [data-dp-month="tebet"]');
      await page.click(`#date-picker [data-dp-day="${d.day}"][data-dp-run="${d.run}"]`);
      const p = await panel(page);
      assert.equal(p.day, d.day, `${year}: tapping day ${d.day} keeps day ${d.day} chosen`);
      await page.click('#date-picker [data-dp="go"]');
      await page.waitForTimeout(300);
      const c = await cursor(page);
      assert.equal(chipText(c), p.choice, `${year}: «Elegido» said ${p.choice}, the top says ${c.chip}`);
      assert.equal(Math.floor(c.t), year, `${year}: the cursor stays in the chosen year (${c.t})`);
      await page.waitForTimeout(450);
    }
    assert.deepEqual(page.pageErrors, []);
    await page.context().close();
  }
});

test('a month or a day chosen from a wide view brings the view down to show it; a year alone keeps the scale', async () => {
  let page = await openSite(DESKTOP, 't=50.3&v=400');
  await openPanel(page, DESKTOP);
  for (const [step, times] of [[-10, 1], [-1, 7]]) for (let i = 0; i < times; i++) await page.click(`#date-picker [data-dp-step="${step}"]`);
  await page.click('#date-picker [data-dp-month="nisan"]');
  await page.click('#date-picker [data-dp-day="14"]');
  assert.equal((await panel(page)).choice, '14 de nisán de 33 e.c.');
  await page.click('#date-picker [data-dp="go"]');
  await page.waitForTimeout(400);
  let c = await cursor(page);
  assert.ok(c.span < 0.35, `a day shows at the scale of days (span ${c.span})`);
  assert.match(c.chip, /14 de nisán de 33 e\.c\./);
  await page.waitForTimeout(450);
  await openPanel(page, DESKTOP);
  const p = await panel(page);
  assert.deepEqual([p.month, p.day], ['nisan', '14'], 'reopened, the panel shows the day that was chosen');
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
  // A month alone, from a view of centuries: the scale of months.
  page = await openSite(DESKTOP, 't=50.3&v=400');
  await openPanel(page, DESKTOP);
  await page.click('#date-picker [data-dp-month="nisan"]');
  await page.click('#date-picker [data-dp="go"]');
  await page.waitForTimeout(400);
  c = await cursor(page);
  assert.ok(c.span >= 0.35 && c.span < 4, `a month shows at the scale of months (span ${c.span})`);
  assert.match(c.chip, /nisán de 50 e\.c\./);
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('a double click or a double tap on «Ir» does not reach the page the panel uncovered', async () => {
  for (const screen of [DESKTOP, PHONE]) {
    const page = await openSite(screen, 't=49.05&v=0.2');
    await openPanel(page, screen);
    const tap = (sel) => (screen.touch ? page.tap(sel) : page.click(sel));
    await tap('#date-picker [data-dp-step="-1"]');
    await tap('#date-picker [data-dp-month="nisan"]');
    await tap('#date-picker [data-dp-day="14"]');
    const go = page.locator('#date-picker [data-dp="go"]');
    await go.scrollIntoViewIfNeeded();
    const box = await go.boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    if (screen.touch) { await page.touchscreen.tap(x, y); await page.waitForTimeout(60); await page.touchscreen.tap(x, y); } else await page.mouse.dblclick(x, y);
    await page.waitForTimeout(500);
    const c = await cursor(page);
    assert.match(c.chip, /14 (de )?nisán (de )?48 e\.c\./, `${screen.width}: the date chosen, not one under «Ir» (${c.chip}, t=${c.t})`);
    assert.equal(c.sel, '', `${screen.width}: nothing behind got selected`);
    assert.equal(c.focus, 'fecha', `${screen.width}: the focus is on the date`);
    assert.deepEqual(page.pageErrors, []);
    await page.context().close();
  }
});

test('Space opens; the title has the focus; ×, a close request and «Sobre las fechas» close the panel', async () => {
  const page = await openSite(DESKTOP, 't=49.05&v=0.2');
  await page.focus('#fecha');
  await page.keyboard.press(' ');
  await page.waitForSelector('#date-picker[open]', { timeout: WAIT });
  assert.equal(await page.evaluate(() => document.activeElement.id), 'date-picker-title', 'the focus starts on the title');
  await page.click('#date-picker [data-dp="close"]');
  let c = await cursor(page);
  assert.equal(c.open, false, '× closes');
  assert.equal(c.focus, 'fecha');
  assert.equal(await page.getAttribute('#fecha', 'aria-expanded'), 'false');
  // A close request of the system (the back gesture on Android) arrives as «cancel».
  await page.waitForTimeout(450);
  await openPanel(page, DESKTOP);
  await page.evaluate(() => document.querySelector('#date-picker').dispatchEvent(new Event('cancel', { cancelable: true })));
  c = await cursor(page);
  assert.equal(c.open, false, 'a close request closes');
  assert.equal(await page.getAttribute('#fecha', 'aria-expanded'), 'false');
  await page.waitForTimeout(450);
  await openPanel(page, DESKTOP);
  await page.click('#date-picker [data-dp="about"]');
  await page.waitForTimeout(300);
  const help = await page.evaluate(() => ({ open: !!document.querySelector('#date-picker[open]'), help: !!document.querySelector('#fechas-ayuda:not([hidden])'), inside: !!document.activeElement?.closest('#fechas-ayuda') }));
  assert.deepEqual(help, { open: false, help: true, inside: true }, '«Sobre las fechas» opens the help with the focus inside');
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('Back undoes a jump, Back with the panel open closes it, and playback stops when the panel opens', async () => {
  const page = await openSite(DESKTOP, 't=49.05&v=0.2');
  const t0 = (await cursor(page)).t;
  await openPanel(page, DESKTOP);
  await page.click('#date-picker .date-picker__moments--milestones [data-dp-key="evento:destruccion-de-jerusalen-607"]');
  await page.waitForTimeout(500);
  assert.equal(Math.floor((await cursor(page)).t), -606);
  await page.waitForTimeout(450);
  await openPanel(page, DESKTOP);
  await page.goBack();
  await page.waitForTimeout(700);
  let c = await cursor(page);
  assert.equal(c.open, false, 'Back closes the panel');
  assert.ok(Math.abs(c.t - t0) < 1e-6, `Back returns to the date before the jump (${c.t}, was ${t0})`);
  // Playback.
  await page.evaluate(() => BE.reproducir(true));
  await page.waitForTimeout(300);
  await openPanel(page, DESKTOP);
  const t1 = (await cursor(page)).t;
  await page.waitForTimeout(800);
  c = await cursor(page);
  assert.equal(await page.evaluate(() => BE.E.play), false, 'playback stops when the panel opens');
  assert.equal(c.t, t1, 'the cursor stays at the date the panel speaks of');
  // The timeline resumes by itself 1.5 s after it pauses at an event: with the panel open, that resume is undone.
  await page.evaluate(() => BE.reproducir(true));
  await page.waitForTimeout(600);
  c = await cursor(page);
  assert.equal(await page.evaluate(() => BE.E.play), false, 'a resume while the panel is open is stopped');
  assert.equal(c.t, t1, 'and the cursor is back at the date of the panel');
  assert.equal((await panel(page)).choice, chipText(c));
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('at the edges: the steps stop at the first and last year, the last moment opens on its year, the era keeps the number', async () => {
  let page = await openSite(DESKTOP, 't=-4024.5&v=400');
  await openPanel(page, DESKTOP);
  let steps = await page.$$eval('#date-picker [data-dp-step]', (bs) => Object.fromEntries(bs.map((b) => [b.dataset.dpStep, b.disabled])));
  assert.equal((await panel(page)).year, '4026 a.e.c.');
  assert.deepEqual([steps['-1000'], steps['-100'], steps['-10'], steps['-1'], steps['1'], steps['1000']], [true, true, true, true, false, false], 'at the first year the steps back are off');
  await page.context().close();
  // The last moment of the data: t = 100.
  for (const v of [0.2, 400]) {
    page = await openSite(DESKTOP, `t=100&v=${v}`);
    await openPanel(page, DESKTOP);
    const p = await panel(page);
    const c0 = await cursor(page);
    assert.equal(p.year, '100 e.c.', `v=${v}: the panel opens on the year of the top`);
    assert.equal(p.choice, chipText(c0), `v=${v}: «Elegido» is the date of the top`);
    steps = await page.$$eval('#date-picker [data-dp-step]', (bs) => Object.fromEntries(bs.map((b) => [b.dataset.dpStep, b.disabled])));
    assert.deepEqual([steps['1'], steps['1000'], steps['-1']], [true, true, false], `v=${v}: at the last year the steps forward are off`);
    await page.click('#date-picker [data-dp="go"]');
    await page.waitForTimeout(300);
    assert.equal((await cursor(page)).t, 100, `v=${v}: «Ir» without a change leaves the cursor where it was`);
    await page.context().close();
  }
  // The era: 608 a.e.c. → e.c. is past the data (100 e.c.) → a.e.c. gives 608 again.
  page = await openSite(DESKTOP, 't=-605.5&v=400');
  await openPanel(page, DESKTOP);
  assert.equal((await panel(page)).year, '607 a.e.c.');
  await page.click('#date-picker [data-dp-step="-1"]');
  await page.click('#date-picker [data-dp-era="ce"]');
  assert.equal((await panel(page)).year, '100 e.c.', 'e.c. stops at the last year of the data');
  assert.match(await page.textContent('#date-picker [data-dp-part="choose"]'), /van de 4026 a\.e\.c\. a 100 e\.c\./, 'and says why');
  await page.click('#date-picker [data-dp-era="bce"]');
  assert.equal((await panel(page)).year, '608 a.e.c.', 'switching back gives the number the person had');
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('nearby events surround the cursor; the check mark is not in a name; a live region says each choice', async () => {
  const page = await openSite(DESKTOP, 't=50.3&v=40');
  await openPanel(page, DESKTOP);
  const near = await page.evaluate(() => {
    const key = (b) => b.dataset.dpKey.split(':')[1];
    const m = (id) => BE.momentoEvento(BE.D.eventos.find((e) => e.id === id));
    const lists = [...document.querySelectorAll('#date-picker .date-picker__moments--near')];
    return { labels: [...document.querySelectorAll('#date-picker .date-picker__near .date-picker__side')].map((p) => p.textContent.trim()), sides: lists.map((l) => [...l.querySelectorAll('[data-dp-key]')].map((b) => m(key(b)))), t: BE.E.t };
  });
  assert.deepEqual(near.labels, ['Antes', 'Después']);
  assert.ok(near.sides[0].length >= 1 && near.sides[0].length <= 5 && near.sides[0].every((x) => x < near.t), `before the cursor: ${near.sides[0]}`);
  assert.ok(near.sides[1].length >= 1 && near.sides[1].length <= 5 && near.sides[1].every((x) => x >= near.t), `after the cursor: ${near.sides[1]}`);
  // The chosen option is named by its text alone: the check mark has no spoken text.
  const snap = await page.locator('#date-picker .date-picker__era').ariaSnapshot();
  assert.match(snap, /radio "e\.c\." \[checked\]/, `the chosen era is named «e.c.»: ${snap}`);
  assert.doesNotMatch(snap, /✓/, `the mark is not read: ${snap}`);
  // The live region stays the same node and says the new year and the choice.
  const status = await page.evaluateHandle(() => document.querySelector('#date-picker [aria-live]'));
  await page.click('#date-picker [data-dp-step="-1"]');
  const said = await page.evaluate((el) => ({ inPage: el.isConnected, text: el.textContent, live: el.getAttribute('aria-live') }), status);
  assert.equal(said.inPage, true, 'the live region was not drawn again');
  assert.equal(said.live, 'polite');
  assert.equal(said.text, 'Elegido: 49 e.c.', 'it says the new choice, with its year');
  // An event at the cursor's own moment is «Ahora y después».
  await page.keyboard.press('Escape');
  await page.waitForTimeout(450);
  await openPanel(page, DESKTOP);
  await page.click('#date-picker .date-picker__moments--milestones [data-dp-key="evento:pentecostes-33"]');
  await page.waitForTimeout(500);
  await openPanel(page, DESKTOP);
  const after = await page.evaluate(() => ({ label: document.querySelector('#date-picker #date-picker-after')?.textContent.trim(), first: document.querySelector('#date-picker #date-picker-after + ul [data-dp-key]')?.dataset.dpKey }));
  assert.deepEqual(after, { label: 'Ahora y después', first: 'evento:pentecostes-33' });
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('on the desk the popover sits under the date; the row under the title and the Tab key reach «Elegir una fecha»', async () => {
  const page = await openSite(DESKTOP, 't=49.05&v=0.2');
  await openPanel(page, DESKTOP);
  const g = await page.evaluate(() => {
    const d = document.querySelector('#date-picker').getBoundingClientRect(), f = document.querySelector('#fecha').getBoundingClientRect();
    return { top: d.top, fBottom: f.bottom, overlap: Math.min(d.right, f.right) - Math.max(d.left, f.left), bottom: d.bottom, h: innerHeight };
  });
  assert.ok(g.top >= g.fBottom && g.top <= g.fBottom + 20, `under the date: ${JSON.stringify(g)}`);
  assert.ok(g.overlap > 0, 'and across from it');
  assert.ok(g.bottom <= g.h, 'inside the window');
  // The row under the title: «Elegir una fecha» scrolls its part into view and gives it the focus.
  await page.click('#date-picker [data-dp-jump="date-picker-choose"]');
  const j = await page.evaluate(() => {
    const h = document.querySelector('#date-picker-choose').getBoundingClientRect(), top = document.querySelector('.date-picker__top').getBoundingClientRect(), d = document.querySelector('#date-picker').getBoundingClientRect();
    return { focus: document.activeElement.id, visible: h.top >= top.bottom - 1 && h.bottom <= d.bottom };
  });
  assert.deepEqual(j, { focus: 'date-picker-choose', visible: true });
  // From the title, the Tab key reaches the era in a few stops: each list of moments is one stop.
  await page.focus('#date-picker-title');
  let stops = 0, at = '';
  while (stops < 40 && !at.startsWith('era:')) { await page.keyboard.press('Tab'); stops++; at = await page.evaluate(() => document.activeElement.dataset?.dpKey || ''); }
  assert.ok(at.startsWith('era:') && stops <= 12, `the era after ${stops} Tab stops`);
  // Arrow keys move inside a list of moments without choosing.
  await page.focus('#date-picker .date-picker__ages [tabindex="0"]');
  const first = await page.evaluate(() => document.activeElement.dataset.dpKey);
  await page.keyboard.press('ArrowDown');
  const second = await page.evaluate(() => ({ key: document.activeElement.dataset.dpKey, open: !!document.querySelector('#date-picker[open]') }));
  assert.ok(second.key && second.key !== first && second.open, `ArrowDown moves to another moment and keeps the panel: ${JSON.stringify(second)}`);
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});

test('the words fit the date: «Meses: Nuestros», and the full date on a phone at 360 px with 44 px targets', async () => {
  let page = await openSite(DESKTOP, 't=49.05&v=0.2&meses=nuestros');
  await openPanel(page, DESKTOP);
  const chip = (await cursor(page)).chip;
  assert.match(chip, /enero/, `the top shows our month: ${chip}`);
  const lines = await page.$$eval('#date-picker .date-picker__meaning li', (ls) => ls.map((l) => l.textContent));
  assert.doesNotMatch(lines[0], /El mes y el día salen de un calendario lunar/, 'our month and day do not come from the lunar calendar');
  assert.match(lines[1], /^enero/, `our month is explained first: ${lines[1]}`);
  await page.context().close();
  for (const width of [360, 430]) {
    const screen = { width, height: 740, touch: true };
    page = await openSite(screen, 't=49.05&v=0.2');
    await openPanel(page, screen);
    const r = await page.evaluate(() => ({
      chip: document.querySelector('#fecha-valor').textContent,
      date: document.querySelector('#date-picker .date-picker__date').textContent,
      small: [...document.querySelectorAll('#date-picker button, #date-picker a')].filter((b) => { const q = b.getBoundingClientRect(); return q.width && (q.width < 44 || q.height < 44); }).map((b) => b.textContent.trim()),
      overflow: document.querySelector('.date-picker__inner').scrollWidth - document.querySelector('.date-picker__inner').clientWidth,
    }));
    assert.equal(r.date, 'c. 26 de tebet de 49 e.c.', `${width}: the panel gives the date in full (the top: ${r.chip})`);
    assert.deepEqual(r.small, [], `${width}: every target is at least 44 x 44 px`);
    assert.equal(r.overflow, 0, `${width}: nothing spills sideways`);
    await page.context().close();
  }
});
