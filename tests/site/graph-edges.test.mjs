// Every edge of the graph carries a verb, a date when it is known and a reference (ideas doc, «Reglas escritas que el
// sitio o los datos no cumplen»). «Está aquí ahora» used to be drawn with no sources and no reference: it now takes the
// passage, the date and the sources of the stay it comes from, or it is not drawn.
//
// For Jesús, Pablo, Abrahán, David, Moisés, Jerusalén and the node with the most relations (the selections of the
// overlap test), it walks every edge BE.grafo.nodos returns at the date the graph opens on and, for every person, in
// the middle of each of their stays and of each gap between two stays (where «de camino desde aquí» is drawn). Each
// edge needs a verb and a reference: a passage, or its sources while the passage is still missing from the data. A
// «está aquí ahora» or «de camino desde aquí» edge needs a passage, a date and sources. Then, in the page, every drawn
// edge must carry its verb in its tooltip.
// Edges that cite sources but no passage are still drawn, marked «sin pasaje», until the coverage gives them one
// (proposal 7): their number over these selections is reported and must not grow past today's.
// Over every person, in the middle of each stay: at least 95 % of the stays draw their place-now edge (a floor, so a
// rename of the data keys the edge reads cannot make it vanish unnoticed), each with sources; and a stay that comes from
// a relation («vivió en», «nació en») takes the passage of a relation of that same type, never of another one with the
// same place (the passage of a death in Egipto does not prove a life there).
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
// Distinct edges of these selections that cite sources but no passage, on the data of 2026-09-29. Lower it when the
// coverage passages arrive; never raise it.
const NO_PASSAGE_TODAY = 51;

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
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-graph-edges-'));
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

async function openGraph(hash) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.pageErrors = [];
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  // Only the local site: map tiles and fonts from other hosts are not needed to lay out the graph.
  await page.route((url) => !url.href.startsWith(base.slice(0, base.lastIndexOf('/'))), (route) => route.abort());
  await page.goto(`${base}#${hash}`);
  await page.waitForFunction(() => window.BE?.D && document.querySelector('#vista-grafo:not([hidden])') && (!window.BE.chunks || window.BE.chunks.loaded.length), null, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  return page;
}

/** In the page: every edge of `sel` at the given dates, checked against the rule. */
function walk({ sel, times }) {
  const passage = (x) => typeof x === 'string' && BE.citas(x).length > 0;
  const out = { edges: 0, here: 0, sourcesOnly: 0, dropped: 0, bad: [], noPassage: [] };
  for (const t of times) {
    const nodes = BE.grafo.nodos(sel, t);
    // A stay with a place but no passage draws no place-now edge: counted, so the report says how many.
    if (sel.startsWith('persona:') && BE.donde?.(sel.slice(8), t)?.en?.lugar && !nodes.some((n) => n.aristas.some((a) => a.origen === 'donde'))) out.dropped++;
    for (const n of nodes) {
      for (const a of n.aristas) {
        out.edges++;
        const where = `${sel} at ${t.toFixed(2)} → ${n.sel} «${a.verbo || ''}»`;
        if (!String(a.verbo || '').trim()) out.bad.push(`${where}: no verb`);
        const hasSources = Array.isArray(a.fuentes) && a.fuentes.length > 0;
        if (!passage(a.ref) && !hasSources) out.bad.push(`${where}: no reference (ref «${a.ref || ''}», no sources)`);
        else if (!passage(a.ref)) { out.sourcesOnly++; out.noPassage.push(`${n.sel}|${a.verbo}`); }
        if (a.origen === 'donde') {
          out.here++;
          if (!passage(a.ref)) out.bad.push(`${where}: a place-now edge without a passage`);
          if (!hasSources) out.bad.push(`${where}: a place-now edge without sources`);
          if (BE.textoFechaArista(a) === 'sin fecha') out.bad.push(`${where}: a place-now edge without a date`);
        }
      }
    }
  }
  out.noPassage = [...new Set(out.noPassage)];
  return out;
}

test('every edge carries a verb and a reference; «está aquí ahora» takes those of its stay', async (t) => {
  const probe = await openGraph('grafo=jesus');
  const most = await probe.evaluate(() => {
    let best = null;
    for (const id of Object.keys(BE.PERS)) { const n = BE.grafo.aristas(`persona:${id}`).length; if (!best || n > best[1]) best = [`persona:${id}`, n]; }
    for (const id of Object.keys(BE.L)) { const n = BE.grafo.aristas(`lugar:${id}`).length; if (n > best[1]) best = [`lugar:${id}`, n]; }
    return best[0];
  });
  await probe.context().close();
  const entities = [...new Set([...FIXED, most.replace(/^persona:/, '')])];

  const failures = [];
  let hereTotal = 0, noPassage = 0;
  for (const e of entities) {
    const sel = e.includes(':') ? e : `persona:${e}`;
    const page = await openGraph(`grafo=${e}`);
    // The date the graph opens on, and for a person the middle of each stay and of each gap between two stays.
    const times = await page.evaluate((sel) => {
      const ts = [BE.E.t];
      if (sel.startsWith('persona:')) {
        const stays = (BE.estancias?.(sel.slice(8)) || []).filter((s) => Number.isFinite(s.a) && Number.isFinite(s.b));
        stays.forEach((s, i) => { ts.push((s.a + s.b) / 2); if (stays[i + 1] && stays[i + 1].a > s.b) ts.push((s.b + stays[i + 1].a) / 2); });
      }
      return [...new Set(ts)];
    }, sel);
    const r = await page.evaluate(walk, { sel, times });
    // The drawn edges, in the page: each one says its verb in its tooltip.
    const drawn = await page.evaluate(() => [...document.querySelectorAll('#vista-grafo svg g[data-arista]')].map((g) => g.querySelector('title')?.textContent || ''));
    const noVerb = drawn.filter((x) => !x.split(' · ')[0].trim());
    t.diagnostic(`${sel}: ${times.length} dates, ${r.edges} edges, ${r.here} place-now edges, ${r.dropped} stays not drawn for want of a passage, ${r.sourcesOnly} with sources but no passage yet (${r.noPassage.length} distinct edges), ${drawn.length} drawn`);
    hereTotal += r.here;
    noPassage += r.noPassage.length;
    failures.push(...r.bad.slice(0, 6));
    if (r.bad.length > 6) failures.push(`${sel}: and ${r.bad.length - 6} more`);
    if (noVerb.length) failures.push(`${sel}: ${noVerb.length} drawn edges without a verb`);
    if (page.pageErrors.length) failures.push(`${sel}: page errors: ${page.pageErrors.join(' | ')}`);
    await page.context().close();
  }
  // The walk must meet the edge it is about, or it proves nothing.
  assert.ok(hereTotal > 0, 'no «está aquí ahora» edge was walked');
  t.diagnostic(`edges with sources but no passage: ${noPassage} (at most ${NO_PASSAGE_TODAY})`);
  assert.ok(noPassage <= NO_PASSAGE_TODAY, `${noPassage} edges cite sources but no passage; there were ${NO_PASSAGE_TODAY}: a new one needs its passage`);
  assert.deepEqual(failures, []);
});

test('over every person, the stays draw their place-now edge with the passage of their own kind of relation', async (t) => {
  const page = await openGraph('grafo=jesus');
  const r = await page.evaluate(() => {
    const passage = (x) => typeof x === 'string' && BE.citas(x).length > 0;
    const out = { stays: 0, drawn: 0, bad: [] };
    for (const id of Object.keys(BE.PERS)) {
      for (const s of BE.estancias?.(id) || []) {
        if (!Number.isFinite(s.a) || !Number.isFinite(s.b)) continue;
        const t = (s.a + s.b) / 2;
        const en = BE.donde(id, t)?.en;
        if (!en?.lugar?.id) continue;
        out.stays++;
        const e = BE.grafo.nodos(`persona:${id}`, t).flatMap((n) => n.aristas).find((a) => a.origen === 'donde');
        if (!e) continue;
        out.drawn++;
        const where = `${id} in ${en.lugar.id} (${en.origen})`;
        if (!(e.fuentes || []).length) out.bad.push(`${where}: no sources`);
        // A stay from a relation with no passage of its own takes one from a relation of its own type.
        const own = [en.p?.referencia, en.referencia].some(passage);
        if (en.sel === `persona:${id}` && !own) {
          const rels = BE.aristas(id).filter((a) => a.sel === `lugar:${en.lugar.id}` && a.origen === 'relacion' && passage(a.ref));
          const from = rels.filter((a) => a.ref === e.ref).map((a) => a.tipoRel);
          if (from.length && !from.includes(en.origen)) out.bad.push(`${where}: takes ${e.ref}, the passage of «${from.join(', ')}»`);
        }
      }
    }
    return out;
  });
  const share = r.drawn / Math.max(1, r.stays);
  t.diagnostic(`${r.stays} stays, ${r.drawn} draw their place-now edge (${(share * 100).toFixed(1)} %)`);
  assert.ok(r.stays > 1000, `only ${r.stays} stays were walked`);
  assert.ok(share >= 0.95, `only ${(share * 100).toFixed(1)} % of the stays draw their place-now edge`);
  assert.deepEqual(r.bad.slice(0, 10), []);
  assert.deepEqual(page.pageErrors, []);
  await page.context().close();
});
