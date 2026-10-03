// Before and after for `branches_from` (docs/ideas/destinos-paralelos.md): every journey WITHOUT the key draws the same
// routes, windows and stays as on a reference checkout. Not a test of the suite: it needs a second checkout.
//
//   node tests/site/comparar-rutas.mjs <reference checkout> [<checkout>]
//
// It builds the data of each checkout into a temporary directory, serves each site, and in a headless browser reads at a
// sample of dates across the whole timeline (a grid of 600 dates, plus the start, middle, end and grey year of every
// journey): the features of the three journey sources (be-hecho, be-falta, be-rastro), the window of every journey
// (BE.mapa.ventanaViaje), the stops of every journey on the timeline (BE.paradasDe: key, a, b, band), Pablo's stops
// (BE.P), the stays of every traveller with a card (BE.estancias) and every journey drawn while selected. Journeys that carry `branches_from` in the checkout are left out. It
// also compares their entries in data.json. Prints how many items it compared and every difference; exits 1 if any.
// Needs what tests/site/map-journeys.test.mjs needs (python3 with requirements.txt, unpkg.com, playwright-core or
// PLAYWRIGHT_MODULE_DIR).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = path.resolve(process.argv[2] || '');
const ROOT = path.resolve(process.argv[3] || path.join(path.dirname(fileURLToPath(import.meta.url)), '../..'));
if (!process.argv[2] || !fs.existsSync(path.join(BASE, 'site/index.html'))) { console.error('uso: node tests/site/comparar-rutas.mjs <checkout de referencia> [<checkout>]'); process.exit(2); }

async function loadChromium() {
  for (const name of ['playwright-core', 'playwright']) {
    try { return (await import(name)).chromium; } catch { /* next */ }
    if (process.env.PLAYWRIGHT_MODULE_DIR) {
      try { return createRequire(path.join(path.resolve(process.env.PLAYWRIGHT_MODULE_DIR), 'index.js'))(name).chromium; } catch { /* next */ }
    }
  }
  throw new Error('playwright-core not found: install it or set PLAYWRIGHT_MODULE_DIR to a node_modules directory that holds it');
}
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-comparar-rutas-'));
const servers = [];
let browser;
try {
  const sitios = {};
  for (const [k, root] of [['antes', BASE], ['despues', ROOT]]) {
    const out = path.join(tmp, k);
    fs.mkdirSync(out);
    execFileSync('python3', [path.join(root, 'scripts/build.py'), '--out', out], { cwd: root, stdio: 'pipe' });
    const server = await serve(path.join(root, 'site'), out);
    servers.push(server);
    sitios[k] = { url: `http://127.0.0.1:${server.address().port}/index.html`, data: JSON.parse(fs.readFileSync(path.join(out, 'data.json'), 'utf8')) };
  }
  const conRamas = new Set(sitios.despues.data.viajes.filter((v) => (v.paradas || []).some((p) => p.branches_from != null)).map((v) => v.id));
  const fuera = (id) => conRamas.has(id);
  const diferencias = [];
  let comparados = 0;
  // data.json: each journey without the key is the same object.
  const porId = (D) => new Map(D.viajes.map((v) => [v.id, JSON.stringify(v)]));
  const A = porId(sitios.antes.data), B = porId(sitios.despues.data);
  for (const [id, x] of A) {
    if (fuera(id)) continue;
    comparados++;
    if (B.get(id) !== x) diferencias.push(`data.json viaje ${id}`);
  }

  const chromium = await loadChromium();
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const abrir = async (url) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.errores = [];
    page.on('pageerror', (e) => page.errores.push(e.message));
    const local = url.slice(0, url.lastIndexOf('/'));
    await page.route((u) => !u.href.startsWith(local) && !u.hostname.endsWith('unpkg.com'), (r) => r.abort());
    await page.goto(`${url}#t=50.5`);
    await page.waitForFunction(() => window.__be?.map?.loaded?.() && window.__be.map.getSource('be-rastro'), null, { timeout: 60000 });
    return page;
  };
  const pages = { antes: await abrir(sitios.antes.url), despues: await abrir(sitios.despues.url) };
  // What the timeline and the map compute once per data load: windows, stops of every journey, Pablo's stops.
  const estatico = (page) => page.evaluate(() => {
    const { BE } = window.__be;
    const r = (x) => (x == null ? null : Math.round(x * 1e6) / 1e6);
    const out = {};
    for (const v of BE.D.viajes) {
      out[`ventana ${v.id}`] = (BE.mapa.ventanaViaje(v) || []).map(r);
      out[`paradas ${v.id}`] = BE.paradasDe(v).map((s) => [s.key, r(s.a), r(s.b), (s.banda || []).map(r), s.i, s.n]);
    }
    out['BE.P'] = BE.P.map((s) => [s.key, r(s.a), r(s.b), s.g]);
    // The stays of every traveller with a card: journeys, events and places where they lived, as the timeline shows them.
    for (const p of new Set(BE.D.viajes.map(BE.duenoViaje))) {
      if (!BE.esGrupo(p)) out[`estancias ${p}`] = BE.estancias(p).map((s) => [s.key, r(s.a), r(s.b), s.g]);
    }
    return out;
  });
  const [ea, eb] = [await estatico(pages.antes), await estatico(pages.despues)];
  for (const k of Object.keys(ea)) {
    if (fuera(k.split(' ')[1])) continue;
    comparados++;
    if (JSON.stringify(ea[k]) !== JSON.stringify(eb[k])) diferencias.push(`${k}: ${JSON.stringify(ea[k]).slice(0, 160)} != ${JSON.stringify(eb[k]).slice(0, 160)}`);
  }
  // Dates: a grid over the whole timeline plus the start, middle, end and grey year of every journey.
  const fechas = new Set();
  for (let i = 0; i <= 600; i++) fechas.add(Math.round((-4026 + (4126 * i) / 600) * 1000) / 1000);
  for (const k of Object.keys(ea)) {
    if (!k.startsWith('ventana ') || ea[k].length !== 2) continue;
    const [a, b] = ea[k];
    for (const t of [a + 1e-3, (a + b) / 2, b - 1e-3, b + 0.5]) fechas.add(Math.round(t * 1000) / 1000);
  }
  const lista = [...fechas].sort((x, y) => x - y);
  const dibujado = (page, t, sel) => page.evaluate(async ({ t, sel }) => {
    const { map, setT, seleccionar } = window.__be;
    seleccionar(sel, { mover: false, encuadrar: false });
    setT(t);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const out = [];
    for (const id of ['be-hecho', 'be-falta', 'be-rastro']) {
      for (const f of (await map.getSource(id).getData()).features) out.push([id, f.properties.viaje, JSON.stringify(f.properties), JSON.stringify(f.geometry.coordinates)]);
    }
    return out;
  }, { t, sel });
  const comparar = async (etiqueta, t, sel) => {
    const [x, y] = [await dibujado(pages.antes, t, sel), await dibujado(pages.despues, t, sel)];
    const quita = (fs) => fs.filter((f) => !fuera(f[1])).map((f) => f.join(' ')).sort();
    const [qa, qb] = [quita(x), quita(y)];
    comparados += qa.length || 1;
    if (JSON.stringify(qa) !== JSON.stringify(qb)) {
      const sa = new Set(qa), sb = new Set(qb);
      diferencias.push(`${etiqueta}: solo antes ${qa.filter((f) => !sb.has(f)).map((f) => f.split(' ').slice(0, 2).join(' '))}; solo después ${qb.filter((f) => !sa.has(f)).map((f) => f.split(' ').slice(0, 2).join(' '))}`);
    }
  };
  for (const t of lista) await comparar(`t=${t}`, t, null);
  // Every journey selected, at the middle of its window: drawn whole and in its colour.
  for (const v of sitios.antes.data.viajes) {
    if (fuera(v.id)) continue;
    const w = ea[`ventana ${v.id}`];
    await comparar(`viaje:${v.id}`, w?.length === 2 ? (w[0] + w[1]) / 2 : 0, { tipo: 'viaje', id: v.id });
  }
  const errores = [...pages.antes.errores.map((e) => `antes: ${e}`), ...pages.despues.errores.map((e) => `después: ${e}`)];
  console.log(`viajes con branches_from (fuera de la comparación): ${[...conRamas].join(', ') || 'ninguno'}`);
  console.log(`fechas: ${lista.length}; viajes elegidos: ${sitios.antes.data.viajes.filter((v) => !fuera(v.id)).length}; elementos comparados: ${comparados}`);
  console.log(`diferencias: ${diferencias.length}`);
  for (const d of diferencias.slice(0, 40)) console.log(`  ${d}`);
  console.log(`errores de consola: ${errores.length}`);
  for (const e of errores) console.log(`  ${e}`);
  process.exitCode = diferencias.length || errores.length ? 1 : 0;
} finally {
  await browser?.close();
  for (const s of servers) s.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
