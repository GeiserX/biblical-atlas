// Events as nodes of the graph. An event lasts days, so it is not shown by the switch «Lo que dura: solo lo vigente»
// (which governs what lasts: lived in, reigns, a journey under way) but by its distance to the cursor: the narrowest one
// happening now, the nearest before and the nearest after, and the closest within two arrow steps, at most four, go on
// the canvas; the rest are in the fold «+N» of their sector, or dimmed on the canvas when they are one or two.
// - Frigia at the date of Hch 16:6-8: the event «El espíritu no les deja predicar en Asia ni entrar en Bitinia» stays a
//   node while the cursor moves one step (the arrow key) to each side, at each of the six scales of the timeline, at
//   1440 x 900 and at 430 x 932 with touch (graph view requested by hand); every event node says when it is against the
//   cursor, in the direction its own window gives («ocurre ahora», «3 meses antes», «2 años después»), and one step to
//   the right at «Años» says the exact words; showing or hiding a node moves neither the cursor nor the scale. A click
//   on a scale alone, with no cursor move, leaves on the canvas the events that are near at the new scale.
// - Walking the cursor by quarters of a day over two years of Pablo's life and of Jerusalén, the events offered always
//   hold the nearest before and the nearest after, and at each step at most one event enters and one leaves, or a pair
//   when the data places two events in the same stretch of time (two on the same day in Jerusalén).
// - An event in the centre offers the people it names, its places and the event before and after it in its series of
//   the account, each as a node one can walk to (on the canvas or in a «+N» list), each line with its reference or
//   sources. The word of each person is the one the data gives: the verb of its role in data/vocabulary.yaml
//   (event_roles: «nació», «murió», «habló»…) or, with no role, «en este suceso», whatever `presentes` says (it tells
//   who is placed at the event's first place, not who takes part: Noé in the Flood). The first place «ocurre aquí»,
//   the others «se nombra». At 430 x 932 with touch its people and its first place are nodes on the canvas.
// - Titles are not cut where there is room: every event node on the canvas shows its whole title (several lines, no
//   ellipsis), its card shows it whole, and a stop is named by what it is («Parada del segundo viaje misional de Pablo
//   · Hch 16:6»), never by the place it hangs from. What a node shows under its name is what its accessible name says.
//   The legend says what a diamond is, and the list view says the same as the canvas: the time words of each event and
//   the fold with the rest. For Pablo and Jerusalén at most four events are near and on the canvas, every sector with a
//   node keeps its label, the journey under way stays on the canvas, and the «+N» of events opens with what happens now.
// - The list fold «N sucesos más» stays open, with the focus on it, when the cursor moves, and its time words follow the
//   cursor. Moving the cursor by small steps rewrites the time words in place and rebuilds the canvas only when what is
//   on it changes.
//
// Run from the repository root:
//   node --test --test-concurrency=1 tests/site/graph-events.test.mjs
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
const DESKTOP = { name: '1440', width: 1440, height: 900, touch: false };
const PHONE = { name: '430', width: 430, height: 932, touch: true };
const FRIGIA_EVENT = 'evento:el-espiritu-cierra-asia-y-bitinia';
const FRIGIA_T = 50.0506;
/** One arrow step right of FRIGIA_T at «Años» (a fortieth of 8 years): the event of Hch 16:6-8 ended this long ago. */
const FRIGIA_STEP_WORDS = '2 meses antes';
const SCALES = [4125, 400, 40, 8, 1.5, 0.12];   // Milenios, Siglos, Décadas, Años, Meses, Días (linea.js, ZOOMS)
const WHEN = /^(ocurre ahora|(menos de un día|\d+ (día|días|semanas|meses|año|años)|un siglo|unos \d+ siglos) (antes|después))$/;
const NO_ROLE = 'en este suceso';

/** The verbs of the roles of a person in an event, read from data/vocabulary.yaml (event_roles): the graph must say the
    vocabulary's words. */
function roleVerbs() {
  const text = fs.readFileSync(path.join(ROOT, 'data/vocabulary.yaml'), 'utf8');
  const block = text.split(/^event_roles:\s*$/m)[1];
  const out = {};
  for (const line of (block || '').split('\n').slice(1)) {
    if (/^\S/.test(line)) break;
    const m = line.match(/^\s+(\w+):\s*\{\s*verb:\s*([^}]+?)\s*\}/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

/** In the page: the window [a, b) the timeline gives an event or a stop, and the direction its words must say at t. */
function expectedDirection([sel, t]) {
  let w = null;
  if (sel.startsWith('evento:')) { const e = BE.D.eventos.find((x) => `evento:${x.id}` === sel); w = e && BE.ventanaEvento?.(e); }
  else { const x = (BE.P || []).find((y) => y.key === sel.slice(7)); w = x ? [x.a, Math.max(x.b, x.a + 0.05)] : null; }
  if (!w) return null;
  return t >= w[0] && t < w[1] ? 'ocurre ahora' : t >= w[1] ? 'antes' : 'después';
}
const directionOk = (when, dir) => (dir === 'ocurre ahora' ? when === dir : WHEN.test(when) && when !== 'ocurre ahora' && when.endsWith(` ${dir}`));

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
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-graph-events-'));
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
  // Only the local site: map tiles from other hosts are not needed to lay out the graph.
  await page.route((url) => !url.href.startsWith(base.slice(0, base.lastIndexOf('/'))), (route) => route.abort());
  await page.goto(`${base}#${hash}`);
  await page.waitForFunction(() => window.BE?.D && document.querySelector('#vista-grafo:not([hidden])'), null, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  return page;
}

/** In the page: the node of `sel` on the canvas, with its label and the words under it; null if it is not there. */
function nodeOf(sel) {
  const b = document.querySelector(`#vista-grafo .grafo-lienzo .gnodo[data-gnodo-sel="${CSS.escape(sel)}"]`);
  if (!b) return null;
  return { label: b.querySelector('.be-gnode__label')?.textContent.trim() || '', word: b.querySelector('.be-gnode__meta .gnodo-verbo')?.textContent.trim() || '', when: b.querySelector('.be-gnode__meta .gnodo-cuando')?.textContent.trim() || '' };
}

test('the event of Hch 16:6-8 stays a node of Frigia while the cursor moves a step to each side, at every scale', async (t) => {
  const failures = [];
  for (const screen of [DESKTOP, PHONE]) {
    const page = await openGraph(screen, `grafo=lugar:frigia&t=${FRIGIA_T}&gvista=grafo`);
    for (const s of SCALES) {
      const view = `${screen.name} scale ${s}`;
      // The scale by its own button (on the phone it may be hidden behind a menu: a click still works), then the cursor
      // back at the date of the passage.
      await page.evaluate(([s, t0]) => {
        const b = document.querySelector(`[data-zoom="${s}"]`);
        if (b) b.click(); else BE.E.vista = [t0 - s * 0.4, t0 + s * 0.6];
        BE.setT(t0);
        document.activeElement?.blur?.();
      }, [s, FRIGIA_T]);
      await page.waitForTimeout(250);
      await page.evaluate(([s, t0]) => { BE.E.vista = [t0 - s * 0.4, t0 + s * 0.6]; BE.setT(t0); }, [s, FRIGIA_T]);
      await page.waitForTimeout(250);
      for (const [key, times] of [['ArrowRight', 1], ['ArrowLeft', 2]]) {
        const before = await page.evaluate(() => ({ t: BE.E.t, span: BE.E.vista[1] - BE.E.vista[0] }));
        for (let k = 0; k < times; k++) await page.keyboard.press(key);
        await page.waitForTimeout(300);
        const after = await page.evaluate(() => ({ t: BE.E.t, span: BE.E.vista[1] - BE.E.vista[0] }));
        const n = await page.evaluate(nodeOf, FRIGIA_EVENT);
        const where = `${view}, cursor at ${after.t.toFixed(4)}`;
        // One step is a fortieth of the span (base.js), stopped at the ends of the timeline.
        const expected = await page.evaluate(([t, d]) => Math.min(BE.T_MAX, Math.max(BE.T_MIN, t + d)), [before.t, (key === 'ArrowRight' ? 1 : -2) * before.span / 40]);
        if (Math.abs(after.t - expected) > 1e-6) failures.push(`${where}: the cursor is at ${after.t}, not one step away at ${expected}`);
        if (Math.abs(after.span - before.span) > 1e-9) failures.push(`${where}: the scale changed from ${before.span} to ${after.span}`);
        if (!n) { failures.push(`${where}: the event of Hch 16:6-8 is not a node of Frigia`); continue; }
        if (!WHEN.test(n.when)) failures.push(`${where}: the event does not say when it is against the cursor («${n.when}»)`);
        // Every event node says the direction its own window gives, and one step right at «Años» the exact words.
        const events = await page.evaluate(() => [...document.querySelectorAll('#vista-grafo .grafo-lienzo .gnodo--suceso')].map((b) => [b.dataset.gnodoSel, b.querySelector('.gnodo-cuando')?.textContent.trim() || '']));
        for (const [sel, when] of events) {
          const dir = await page.evaluate(expectedDirection, [sel, after.t]);
          if (dir && !directionOk(when, dir)) failures.push(`${where}: ${sel} says «${when}», its window says «${dir}»`);
        }
        if (s === 8 && key === 'ArrowRight' && n.when !== FRIGIA_STEP_WORDS) failures.push(`${where}: one step right at «Años» the event says «${n.when}», not «${FRIGIA_STEP_WORDS}»`);
        // Frigia has four events: at 1440 there is room for all of them, near or dimmed, and no fold.
        if (screen === DESKTOP) {
          const all = await page.evaluate(() => BE.grafo.nodos('lugar:frigia', BE.E.t).filter((x) => /^(evento|parada):/.test(x.sel)).map((x) => x.sel));
          const missing = all.filter((x) => !events.some(([sel]) => sel === x));
          if (missing.length) failures.push(`${where}: events of Frigia missing from the canvas: ${missing.join(', ')}`);
        }
      }
    }
    // A click on a scale alone, with no cursor move: the events on the canvas are the ones near at the new scale.
    await page.evaluate((t0) => BE.setT(t0), FRIGIA_T);
    await page.waitForTimeout(250);
    for (const s of [...SCALES].reverse()) {
      await page.evaluate((s) => {
        const b = document.querySelector(`[data-zoom="${s}"]`);
        if (b) b.click(); else { const t = BE.E.t; BE.E.vista = [t - s * 0.4, t + s * 0.6]; BE.sucio.linea = true; BE.programar(); }
        document.activeElement?.blur?.();
      }, s);
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => ({
        t: BE.E.t,
        near: BE.grafo.nodos('lugar:frigia', BE.E.t).filter((x) => /^(evento|parada):/.test(x.sel) && x.near).map((x) => x.sel).sort(),
        canvas: [...document.querySelectorAll('#vista-grafo .grafo-lienzo .gnodo--suceso:not(.gnodo--lejos)')].map((b) => b.dataset.gnodoSel).sort(),
      }));
      const where = `${screen.name} scale ${s} by its button alone, cursor at ${r.t.toFixed(4)}`;
      const stale = r.canvas.filter((x) => !r.near.includes(x)), absent = r.near.filter((x) => !r.canvas.includes(x));
      if (stale.length) failures.push(`${where}: events on the canvas that are not near at this scale: ${stale.join(', ')}`);
      if (screen === DESKTOP && absent.length) failures.push(`${where}: near events not on the canvas: ${absent.join(', ')}`);
    }
    t.diagnostic(`${screen.name}: ${SCALES.length} scales walked`);
    if (page.pageErrors.length) failures.push(`${screen.name}: page errors: ${page.pageErrors.join(' | ')}`);
    await page.context().close();
  }
  assert.deepEqual(failures, []);
});

test('walking the cursor by quarters of a day, the nearest event on each side is always offered and the set changes one at a time, or a pair that happens together', async (t) => {
  const page = await openGraph(DESKTOP, `grafo=pablo&t=${FRIGIA_T}&gvista=grafo`);
  const res = await page.evaluate(() => {
    const out = [];
    const isEvent = (sel) => sel.startsWith('evento:') || sel.startsWith('parada:');
    for (const [sel, t0, t1] of [['persona:pablo', 49, 51], ['lugar:jerusalen', 32.5, 34.5]]) {
      let prev = null, steps = 0, maxIn = 0, maxOut = 0;
      for (let t = t0; t < t1; t += 0.25 / 365.25) {
        steps++;
        const evs = BE.grafo.nodos(sel, t).filter((n) => isEvent(n.sel));
        // What the graph offers on the canvas: its nearest events; a site without them offers what the switch leaves.
        const shown = new Set(evs.filter((n) => (n.near !== undefined ? n.near : n.estado === 'ahora' || n.estado === 'siempre')).map((n) => n.sel));
        const win = (n) => n.window || n.principal.tr;
        const past = evs.filter((n) => win(n) && win(n)[1] <= t).sort((a, b) => win(b)[1] - win(a)[1] || win(b)[0] - win(a)[0])[0];
        const next = evs.filter((n) => win(n) && win(n)[0] > t).sort((a, b) => win(a)[0] - win(b)[0] || win(a)[1] - win(b)[1])[0];
        if (past && !shown.has(past.sel) && out.length < 12) out.push(`${sel} at ${t.toFixed(3)}: the nearest event before («${BE.nombreDeSel(past.sel).slice(0, 40)}») is not offered`);
        if (next && !shown.has(next.sel) && out.length < 12) out.push(`${sel} at ${t.toFixed(3)}: the nearest event after («${BE.nombreDeSel(next.sel).slice(0, 40)}») is not offered`);
        if (prev) {
          const inn = [...shown].filter((x) => !prev.has(x)).length, gone = [...prev].filter((x) => !shown.has(x)).length;
          maxIn = Math.max(maxIn, inn); maxOut = Math.max(maxOut, gone);
          // One node at a time; two when the data puts two events in the same stretch of time (they happen together).
          if ((inn > 2 || gone > 2) && out.length < 12) out.push(`${sel} at ${t.toFixed(3)}: ${inn} events entered and ${gone} left in a quarter of a day`);
        }
        prev = shown;
      }
      out.push(`# ${sel}: ${steps} steps, at most ${maxIn} in and ${maxOut} out per step`);
    }
    return out;
  });
  for (const d of res.filter((x) => x.startsWith('# '))) t.diagnostic(d.slice(2));
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
  assert.deepEqual(res.filter((x) => !x.startsWith('# ')), []);
});

test('an event in the centre offers its people, its places and the events before and after it in its series', async (t) => {
  const page = await openGraph(DESKTOP, `grafo=${FRIGIA_EVENT}&t=${FRIGIA_T}&gvista=grafo`);
  const verbs = roleVerbs();
  assert.ok(['born', 'died', 'spoke'].every((r) => verbs[r]), `data/vocabulary.yaml gives no verbs for the roles: ${JSON.stringify(verbs)}`);
  // Ten events spread over the data that have a series, people and places, plus the one of Hch 16:6-8, the Flood
  // (`present: []`: nobody placed, all of them actors), and the first events with a role and with a `present` list.
  const cases = await page.evaluate((first) => {
    const evs = BE.D.eventos.filter((e) => e.orden_relato?.serie && (e.personas || []).some((p) => BE.PERS[p]) && (e.lugares || []).some((l) => BE.L[l]));
    const byId = (id) => BE.D.eventos.find((e) => e.id === id);
    const picks = [evs.find((e) => `evento:${e.id}` === first), byId('diluvio'), evs.find((e) => Object.keys(e.roles || {}).length), evs.find((e) => e.presentes?.length && e.personas.some((p) => BE.PERS[p] && !e.presentes.includes(p))), ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) => evs[Math.floor((k * evs.length) / 11)])];
    return [...new Set(picks.filter(Boolean))].map((e) => {
      const series = e.orden_relato?.serie ? BE.D.eventos.filter((x) => x.orden_relato?.serie === e.orden_relato.serie && typeof x.orden_relato.orden === 'number').sort((a, b) => a.orden_relato.orden - b.orden_relato.orden) : [];
      const i = series.indexOf(e);
      return { sel: `evento:${e.id}`, people: (e.personas || []).filter((p) => BE.PERS[p]).map((p) => `persona:${p}`), roles: Object.fromEntries(Object.entries(e.roles || {}).map(([p, r]) => [`persona:${p}`, r?.role])), places: (e.lugares || []).filter((l) => BE.L[l]).map((l) => `lugar:${l}`), first: e.lugares?.[0] ? `lugar:${e.lugares[0]}` : null, prev: series[i - 1] ? `evento:${series[i - 1].id}` : null, next: series[i + 1] ? `evento:${series[i + 1].id}` : null };
    });
  }, FRIGIA_EVENT);
  const failures = [];
  for (const c of cases) {
    const got = await page.evaluate(async (c) => {
      BE.grafo.abrir(c.sel);   // a fresh route: the breadcrumbs of a long walk would leave the circle less room
      await new Promise((r) => setTimeout(r, 120));
      const v = document.querySelector('#vista-grafo');
      // Where each neighbour is: a node on the canvas (with the word of its line), or a row of a «+N» list.
      const found = {};
      for (const b of v.querySelectorAll('.grafo-lienzo .gnodo[data-gnodo-sel]')) found[b.dataset.gnodoSel] = { where: 'canvas', word: b.querySelector('.be-gnode__meta .gnodo-verbo')?.textContent.trim() || '' };
      // A centre with too many neighbours for the circle falls back to the list view: its rows count too.
      for (const r of v.querySelectorAll('.grafo-lista .lista-fila')) {
        const sel = r.querySelector('[data-grafo-centro]')?.dataset.grafoCentro;
        if (sel) found[sel] ??= { where: 'canvas', word: r.querySelector('.lista-verbo')?.textContent.trim() || '' };
      }
      for (const b of v.querySelectorAll('.grafo-lienzo [data-grafo-abrir]')) {
        b.click();
        await new Promise((r) => setTimeout(r, 30));
        for (const r of document.querySelectorAll('#grafo-tarjeta [data-grafo-centro]')) found[r.dataset.grafoCentro] ??= { where: 'fold', word: r.querySelector('.grafo-resto__meta')?.textContent.trim() || '' };
        b.click();
      }
      const edges = Object.fromEntries(BE.grafo.aristas(c.sel).map((a) => [a.sel, a]));
      return { found, refs: Object.fromEntries(Object.entries(edges).map(([k, a]) => [k, !!(a.ref || (a.fuentes || []).length)])) };
    }, c);
    const name = c.sel.slice(7);
    // On the canvas the word stands alone; in a «+N» row it opens the row («habló · 3 días antes · Hch 7:2»).
    const says = (f, word) => (f.where === 'canvas' ? f.word === word : f.word === word || f.word.startsWith(`${word} · `));
    for (const p of c.people) {
      const f = got.found[p];
      const word = verbs[c.roles[p]] || NO_ROLE;
      if (!f) failures.push(`${name}: its person ${p} is not offered`);
      else if (!says(f, word)) failures.push(`${name}: the line to ${p} says «${f.word}», not «${word}» (role ${c.roles[p] || 'none'})`);
    }
    for (const l of c.places) {
      const f = got.found[l];
      const word = l === c.first ? 'ocurre aquí' : 'se nombra';
      if (!f) failures.push(`${name}: its place ${l} is not offered`);
      else if (!says(f, word)) failures.push(`${name}: the line to ${l} says «${f.word}», not «${word}»`);
    }
    for (const [x, word] of [[c.prev, 'anterior en el relato'], [c.next, 'siguiente en el relato']]) {
      if (!x) continue;
      const f = got.found[x];
      if (!f) failures.push(`${name}: the ${word.split(' ')[0]} event of its series (${x}) is not offered`);
      else if (!says(f, word)) failures.push(`${name}: the line to ${x} says «${f.word}», not «${word}»`);
    }
    for (const [k, ok] of Object.entries(got.refs)) if (!ok) failures.push(`${name}: the line to ${k} has no reference nor sources`);
  }
  t.diagnostic(`${cases.length} events in the centre`);
  // Walking: the next event of the series, from the canvas, becomes the centre.
  const walked = await page.evaluate(async (first) => {
    BE.grafo.abrir(first);
    await new Promise((r) => setTimeout(r, 120));
    const b = [...document.querySelectorAll('#vista-grafo .grafo-lienzo .gnodo[data-gnodo-sel^="evento:"]')].find((x) => x.querySelector('.gnodo-verbo')?.textContent.trim() === 'siguiente en el relato');
    if (!b) return { seen: [...document.querySelectorAll('#vista-grafo .gnodo')].map((x) => `${x.dataset.gnodoSel || x.dataset.grafoAbrir} «${x.querySelector('.be-gnode__meta')?.textContent.trim() || ''}»`).join(', ') || document.querySelector('#vista-grafo')?.className };
    const sel = b.dataset.gnodoSel;
    b.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    await new Promise((r) => setTimeout(r, 120));
    return { sel, centre: BE.grafo.ruta.at(-1) };
  }, FRIGIA_EVENT);
  if (!walked?.sel) failures.push(`from the event of Hch 16:6-8, no node on the canvas is «siguiente en el relato»: ${walked?.seen}`);
  else if (walked.centre !== walked.sel) failures.push(`a click on «siguiente en el relato» put ${walked.centre} in the centre, not ${walked.sel}`);
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
  // On the phone (graph view requested by hand): the people of the event and its first place are nodes on the canvas,
  // not rows of a fold, and at most one other place is folded.
  const phone = await openGraph(PHONE, `grafo=${FRIGIA_EVENT}&t=${FRIGIA_T}&gvista=grafo`);
  const onPhone = await phone.evaluate((sel) => {
    const e = BE.D.eventos.find((x) => `evento:${x.id}` === sel);
    const canvas = new Set([...document.querySelectorAll('#vista-grafo .grafo-lienzo .gnodo[data-gnodo-sel]')].map((b) => b.dataset.gnodoSel));
    const people = e.personas.filter((p) => BE.PERS[p]).map((p) => `persona:${p}`), places = e.lugares.filter((l) => BE.L[l]).map((l) => `lugar:${l}`);
    return { list: document.querySelector('#vista-grafo').classList.contains('vista-grafo--lista'), missing: [...people, places[0]].filter((x) => !canvas.has(x)), placesOff: places.filter((x) => !canvas.has(x)).length, count: canvas.size };
  }, FRIGIA_EVENT);
  t.diagnostic(`430: ${onPhone.count} nodes on the canvas around the event of Hch 16:6-8`);
  if (onPhone.list) failures.push('430: the graph view asked by hand fell back to the list');
  if (onPhone.missing.length) failures.push(`430: not on the canvas: ${onPhone.missing.join(', ')}`);
  if (onPhone.placesOff > 1) failures.push(`430: ${onPhone.placesOff} places of the event folded`);
  assert.deepEqual(phone.pageErrors, []);
  await phone.context().close();
  assert.deepEqual(failures, []);
});

test('titles are whole where there is room, stops are named by what they are, and the list says the same', async (t) => {
  const failures = [];
  const views = [[DESKTOP, `grafo=lugar:frigia&t=${FRIGIA_T}&gvista=grafo`], [DESKTOP, 'grafo=pablo&t=50.0506&gvista=grafo'], [DESKTOP, 'grafo=lugar:jerusalen&t=33.242&gvista=grafo'], [DESKTOP, `grafo=${FRIGIA_EVENT}&t=${FRIGIA_T}&gvista=grafo`], [PHONE, `grafo=lugar:frigia&t=${FRIGIA_T}&gvista=grafo`]];
  let events = 0;
  for (const [screen, hash] of views) {
    const view = `${screen.name} ${hash.split('&')[0]}`;
    const page = await openGraph(screen, hash);
    const nodes = await page.evaluate(() => [...document.querySelectorAll('#vista-grafo .grafo-lienzo .gnodo[data-gnodo-sel]')]
      .filter((b) => /^(evento|parada):/.test(b.dataset.gnodoSel))
      .map((b) => {
        const l = b.querySelector('.be-gnode__label'), cs = getComputedStyle(l);
        const sel = b.dataset.gnodoSel;
        const title = sel.startsWith('evento:') ? BE.D.eventos.find((e) => `evento:${e.id}` === sel)?.titulo : null;
        return { i: b.dataset.gnodo, sel, text: l.textContent.trim(), title, cut: l.scrollWidth > l.clientWidth + 1 || l.scrollHeight > l.clientHeight + 1, ellipsis: cs.textOverflow === 'ellipsis' && cs.overflow !== 'visible', when: b.querySelector('.gnodo-cuando')?.textContent.trim() || '' };
      }));
    if (!nodes.length) failures.push(`${view}: no event on the canvas`);
    const t0 = await page.evaluate(() => BE.E.t);
    // What a node shows under its name (the word of its line and when) is what its accessible name says.
    const told = await page.evaluate(() => [...document.querySelectorAll('#vista-grafo .grafo-lienzo .gnodo[data-gnodo-sel]')].map((b) => ({
      sel: b.dataset.gnodoSel, aria: b.getAttribute('aria-label') || '',
      shown: [...b.querySelectorAll('.gnodo-verbo, .gnodo-cuando')].map((x) => x.textContent.trim()).filter(Boolean),
    })));
    for (const x of told) for (const w of x.shown) if (!x.aria.includes(w)) failures.push(`${view} ${x.sel}: shows «${w}», its accessible name says «${x.aria}»`);
    if (/grafo=(pablo|lugar:jerusalen)&/.test(hash) && screen === DESKTOP) {
      // At most four events are near, at this date and around it, and at most four are on the canvas.
      const centre = hash.includes('pablo') ? 'persona:pablo' : 'lugar:jerusalen';
      const counts = await page.evaluate(([c, t]) => [-1, -0.25, -0.01, 0, 0.01, 0.25, 1].map((d) => BE.grafo.nodos(c, t + d).filter((n) => n.near && /^(evento|parada):/.test(n.sel)).length), [centre, t0]);
      if (counts.some((k) => k > 4)) failures.push(`${view}: near events around the cursor: ${counts.join(', ')}, more than four`);
      if (nodes.length > 4) failures.push(`${view}: ${nodes.length} events on the canvas, more than four`);
      // Every sector with a node on the canvas keeps its label, and the events stay out of the other sectors.
      const sectors = await page.evaluate(() => {
        const lz = document.querySelector('#vista-grafo .grafo-lienzo');
        const withNodes = [...new Set([...lz.querySelectorAll('.gnodo[data-sector]')].map((b) => b.dataset.sector))];
        return withNodes.filter((g) => !lz.querySelector(`.sector-rotulo[data-sector="${g}"]`));
      });
      if (sectors.length) failures.push(`${view}: sectors with nodes and no label: ${sectors.join(', ')}`);
      // What lasts and is current in Hechos (the journey under way, the period in force) stays on the canvas.
      const lasting = await page.evaluate(([c, t]) => {
        const canvas = new Set([...document.querySelectorAll('#vista-grafo .grafo-lienzo .gnodo[data-gnodo-sel]')].map((b) => b.dataset.gnodoSel));
        return BE.grafo.nodos(c, t).filter((n) => /^(viaje|periodo):/.test(n.sel) && n.estado === 'ahora' && !canvas.has(n.sel)).map((n) => n.sel);
      }, [centre, t0]);
      if (lasting.length) failures.push(`${view}: current and lasting, not on the canvas: ${lasting.join(', ')}`);
      // The «+N» of events opens with what happens now, before what happened before or after.
      const fold = await page.evaluate(async () => {
        const b = document.querySelector('#vista-grafo [data-grafo-abrir="Hechos"]');
        if (!b) return null;
        b.click();
        await new Promise((r) => setTimeout(r, 60));
        const metas = [...document.querySelectorAll('#grafo-tarjeta .grafo-resto__meta')].map((x) => x.textContent);
        b.click();
        return metas;
      });
      if (fold) {
        // No row of another date (before or after the cursor) comes before a row that happens now.
        const now = fold.map((m, i) => (/ocurre ahora/.test(m) ? i : -1)).filter((i) => i >= 0);
        const other = fold.findIndex((m) => /(antes|después|ya pasó|aún no)( ·|$)/.test(m));
        if (now.length && other >= 0 && other < now[now.length - 1]) failures.push(`${view}: in the «+N» of events the rows that happen now are rows ${now.join(', ')} of ${fold.length}, after row ${other} of another date`);
      }
    }
    if (hash.includes('lugar:frigia') && screen === DESKTOP) {
      // At Frigia nothing that lasts is of another date: the switch says what it governs and that it changes nothing.
      const sw = await page.evaluate(() => { const b = document.querySelector('#vista-grafo [data-grafo-vigente]'); return { text: b?.textContent.trim() || '', inert: b?.getAttribute('aria-disabled') === 'true' }; });
      if (!sw.text.startsWith('Lo que dura')) failures.push(`${view}: the switch says «${sw.text}», not what it governs («Lo que dura…»)`);
      if (!sw.inert) failures.push(`${view}: the switch is not inert where it hides nothing`);
    }
    for (const n of nodes) {
      events++;
      const where = `${view} «${n.text.slice(0, 50)}»`;
      const dir = await page.evaluate(expectedDirection, [n.sel, t0]);
      if (dir && !directionOk(n.when, dir)) failures.push(`${where}: says «${n.when}», its window says «${dir}»`);
      if (n.title && n.text !== n.title) failures.push(`${where}: the node shows «${n.text}», the title is «${n.title}»`);
      if (n.cut || n.ellipsis) failures.push(`${where}: the title is cut`);
      if (n.sel.startsWith('parada:') && !/^Parada /.test(n.text)) failures.push(`${where}: a stop named by its place, not by what it is`);
      if (!WHEN.test(n.when)) failures.push(`${where}: no words for when it is against the cursor («${n.when}»)`);
      // Its card: the header holds the whole name.
      const el = page.locator(`#vista-grafo .gnodo[data-gnodo="${n.i}"]`);
      if (screen.touch) await el.tap(); else { await page.mouse.move(2, 2); await el.hover(); }
      const header = await page.evaluate(() => { const c = document.querySelector('#grafo-tarjeta'); return c && !c.hidden ? c.querySelector('.be-card__eyebrow')?.textContent.trim() : ''; });
      if (!header.endsWith(n.text)) failures.push(`${where}: the card says «${header}», not the whole name`);
      if (screen.touch) await page.keyboard.press('Escape');
    }
    if (hash.includes('frigia') && screen === DESKTOP) {
      const legend = await page.evaluate(() => document.querySelector('#vista-grafo .grafo-leyenda')?.textContent || '');
      if (!/rombo/.test(legend)) failures.push(`${view}: the legend does not say what a diamond is`);
      // The list view: the same names, the same time words, and the rest of the events in a fold that says how many.
      const list = await page.evaluate(async () => {
        document.querySelector('[data-grafo-modo="lista"]').click();
        await new Promise((r) => setTimeout(r, 150));
        const v = document.querySelector('#vista-grafo');
        return { rows: [...v.querySelectorAll('.grafo-lista .lista-fila')].map((li) => ({ sel: li.querySelector('[data-grafo-centro]')?.dataset.grafoCentro, name: li.querySelector('.lista-nombre')?.textContent.trim(), when: li.querySelector('.lista-cuando')?.textContent.trim() || '', folded: !!li.closest('details') })), fold: v.querySelector('.grafo-lista details > summary')?.textContent.trim() || '' };
      });
      for (const n of nodes) {
        const r = list.rows.find((x) => x.sel === n.sel);
        if (!r) failures.push(`${view} list: «${n.text}» is not there`);
        else if (r.name !== n.text || r.when !== n.when || r.folded) failures.push(`${view} list: «${r.name}» says «${r.when}»${r.folded ? ' folded' : ''}, the canvas «${n.text}» says «${n.when}»`);
      }
      // Events of other dates that are not on the canvas are in a fold that says how many.
      const folded = list.rows.filter((x) => x.folded).length;
      const off = list.rows.filter((x) => /^(evento|parada):/.test(x.sel || '') && !x.folded && !nodes.some((n) => n.sel === x.sel));
      if (off.length) failures.push(`${view} list: events in the list and not on the canvas, unfolded: ${off.map((x) => x.name).join(', ')}`);
      if (folded && !list.fold.startsWith(`${folded} `)) failures.push(`${view} list: the fold says «${list.fold}» and holds ${folded}`);
      // Away from its place, a stop says where it is; a journey whose name already says the traveller does not say him
      // twice. The name is read in the breadcrumbs, with the stop in the centre.
      const stops = await page.evaluate(async () => {
        const out = [];
        for (const x of [BE.P.find((y) => y.lugar?.id === 'frigia'), BE.P.find((y) => (y.viaje.nombre || '').includes('Pablo'))].filter(Boolean)) {
          BE.grafo.abrir(`parada:${x.key}`);
          await new Promise((r) => setTimeout(r, 80));
          out.push({ place: BE.L[x.lugar.id]?.nombre, name: document.querySelector('#vista-grafo .miga--actual .miga-nombre')?.textContent.trim() || '' });
        }
        return out;
      });
      for (const x of stops) {
        if (!x.name.includes(` en ${x.place}`)) failures.push(`stop in the centre named «${x.name}», without its place ${x.place}`);
        if ((x.name.match(/Pablo/g) || []).length > 1) failures.push(`stop named «${x.name}», with the traveller twice`);
      }
    }
    if (page.pageErrors.length) failures.push(`${view}: page errors: ${page.pageErrors.join(' | ')}`);
    await page.context().close();
  }
  t.diagnostic(`${events} event nodes read`);
  assert.deepEqual(failures, []);
});

test('the list fold stays open with its focus while the cursor moves, and time words follow the cursor without rebuilding the canvas', async (t) => {
  const failures = [];
  // The list view of Pablo: open the fold of events of other dates with the keyboard, then move the cursor a step.
  const page = await openGraph(DESKTOP, `grafo=pablo&t=${FRIGIA_T}&gvista=lista`);
  const fold = await page.evaluate(async (t0) => {
    const summary = document.querySelector('#vista-grafo .grafo-lista details > summary');
    if (!summary) return { error: 'no fold in the list' };
    summary.focus();
    summary.click();
    await new Promise((r) => setTimeout(r, 80));
    const opened = summary.parentElement.open;
    BE.setT(t0 + 0.2);
    await new Promise((r) => setTimeout(r, 400));
    const d = document.querySelector('#vista-grafo .grafo-lista details');
    const a = document.activeElement;
    // The words of the folded rows are the ones of the cursor now.
    const nodes = new Map(BE.grafo.nodos('persona:pablo', BE.E.t).map((n) => [n.sel, n]));
    const stale = [...document.querySelectorAll('#vista-grafo .grafo-lista details .lista-fila')].map((li) => {
      const sel = li.querySelector('[data-grafo-centro]')?.dataset.grafoCentro, when = li.querySelector('.lista-cuando')?.textContent.trim() || '';
      return nodes.get(sel)?.when !== undefined && nodes.get(sel).when !== when ? `${sel}: «${when}», not «${nodes.get(sel).when}»` : null;
    }).filter(Boolean);
    return { opened, open: !!d?.open, focus: a === d?.querySelector('summary') ? 'summary' : `${a?.tagName}.${a?.className}`, stale: stale.slice(0, 5), staleCount: stale.length };
  }, FRIGIA_T);
  if (fold.error) failures.push(fold.error);
  else {
    if (!fold.opened) failures.push('the fold did not open');
    if (!fold.open) failures.push('one step of the cursor closed the fold');
    if (fold.focus !== 'summary') failures.push(`one step of the cursor took the focus from the fold to ${fold.focus}`);
    if (fold.staleCount) failures.push(`${fold.staleCount} folded rows keep the words of the old cursor: ${fold.stale.join('; ')}`);
  }
  await page.context().close();
  // The canvas of Pablo at «Años» and of Jerusalén at «Meses»: 60 small steps of the cursor (a fortieth of a step). The
  // canvas is rebuilt only when what is on it changes; the time words of its nodes are the ones of the cursor.
  for (const [hash, scale, centre] of [[`grafo=pablo&t=${FRIGIA_T}&gvista=grafo`, 8, 'persona:pablo'], ['grafo=lugar:jerusalen&t=33.2498&gvista=grafo', 1.5, 'lugar:jerusalen']]) {
    const p = await openGraph(DESKTOP, hash);
    const r = await p.evaluate(async ([scale, centre]) => {
      const t0 = BE.E.t;
      BE.E.vista = [t0 - scale * 0.4, t0 + scale * 0.6];
      BE.setT(t0);
      await new Promise((res) => setTimeout(res, 300));
      const v = document.querySelector('#vista-grafo');
      let rebuilds = 0;
      const mo = new MutationObserver((ms) => { for (const m of ms) if (m.target === v && [...m.addedNodes].some((x) => x.classList?.contains('vista-cab'))) rebuilds++; });
      mo.observe(v, { childList: true });
      const wrong = [];
      // What is on the canvas, as the graph computes it: the nodes of this date (with the switch on), their state and
      // word, and whether an event is near. A step that changes it may rebuild the canvas; any other may not.
      const shown = (t) => BE.grafo.nodos(centre, t).filter((n) => n.estado === 'ahora' || n.estado === 'siempre' || /^(evento|parada):/.test(n.sel)).map((n) => `${n.sel}:${n.estado}:${n.principal.verbo}:${n.near ? 1 : 0}`).join(',') + Math.floor(t);
      let prev = shown(t0), changes = 0;
      for (let k = 1; k <= 60; k++) {
        BE.setT(t0 + (k * scale) / 400);
        await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
        const now = shown(BE.E.t);
        if (now !== prev) changes++;
        prev = now;
        const nodes = new Map(BE.grafo.nodos(centre, BE.E.t).map((n) => [n.sel, n]));
        for (const b of v.querySelectorAll('.grafo-lienzo .gnodo[data-gnodo-sel]')) {
          const w = b.querySelector('.gnodo-cuando')?.textContent.trim(), n = nodes.get(b.dataset.gnodoSel);
          if (w && n?.when && w !== n.when && wrong.length < 5) wrong.push(`step ${k} ${b.dataset.gnodoSel}: «${w}», not «${n.when}»`);
        }
      }
      mo.disconnect();
      return { rebuilds, changes, wrong };
    }, [scale, centre]);
    t.diagnostic(`${centre}: ${r.rebuilds} rebuilds of the canvas in 60 steps, ${r.changes} of which change what is on it`);
    // Up to a tenth of the steps more than the changes: a time word that widens a node into another box or across a line
    // does ask for a new placement («9 días antes» becomes «10 días antes»).
    if (r.rebuilds > r.changes + 6) failures.push(`${centre}: the canvas was rebuilt ${r.rebuilds} times in 60 small steps of the cursor, and what is on it changed ${r.changes} times`);
    for (const w of r.wrong) failures.push(`${centre}: ${w}`);
    if (p.pageErrors.length) failures.push(`${centre}: page errors: ${p.pageErrors.join(' | ')}`);
    await p.context().close();
  }
  assert.deepEqual(failures, []);
});
