// Counts the stop names the map draws and the ones it drops, and why (docs/ideas/rotulos-movil.md). Not a test of the
// suite: it measures, prints a table and writes the numbers that go in the doc and the PR.
//
//   node tests/site/contar-rotulos.mjs [--root <checkout>] [--json <out.json>] [--fotos <dir>] [--pantalla 430|1440]
//     [--casos <id>,<id>]   (only these tours and journeys)
//
// For each guided tour (on opening, and on every later stop) and for each journey of Pablo and of Jesús (opened as from
// the search box), at 430 by 932 (a phone) and at 1440 by 900, it reads every stop the map frames: the places of all the
// stops when a tour opens, of the stop and its neighbours on a later stop, and of the journey. A stop is one of:
//   visible       its name is drawn and nothing covers it;
//   bajo la hoja  its name is drawn, but the phone's sheet covers it;
//   punto tapado  the point itself is off the map or under a card, a control or the sheet;
//   agrupado      the point is inside a bubble of places (M-15);
//   dropped       the name is hidden (sin-etiqueta), with the first reason that holds:
//                   borde  the name would leave the map;
//                   tapa   the name would fall under a card or a control (loQueTapa in site/js/mapa.js);
//                   zoom   a minor name (menor) below zoom 6.3: it waits for a closer zoom;
//                   choque the name would touch a name, a number, a bubble or a candidate point already drawn;
//                   reparto none of the above: the fixed reparto by zoom gave its place to a name that goes first.
// It also counts the tour's numbered pills that are drawn.
//
// --fotos writes a screenshot of each opening (png). Uses <root>/site/data.json, or builds it into a temporary
// directory. Needs what tests/site/map-frame.test.mjs needs (unpkg.com, playwright-core or PLAYWRIGHT_MODULE_DIR).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const ROOT = path.resolve(arg('--root') || path.join(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const JSON_OUT = arg('--json'), FOTOS = arg('--fotos'), SOLO = arg('--pantalla');
const CASOS = arg('--casos')?.split(',');
const PANTALLAS = [
  { name: '430', viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true },
  { name: '1440', viewport: { width: 1440, height: 900 } },
].filter((p) => !SOLO || p.name === SOLO);

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
function serve(siteDir, dataFile) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).slice(1) || 'index.html';
    const file = rel === 'data.json' ? dataFile : path.join(siteDir, rel);
    if (file !== dataFile && !file.startsWith(siteDir)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(body);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** In the page: the stops framed now and the state of each one's name. */
function contar() {
  const { BE } = window.__be, E = BE.E, m = window.__be.map, sel = E.sel;
  const mc = m.getContainer(), c = mc.getBoundingClientRect();
  const narrow = innerWidth <= 760;
  const nombre = (el) => el.id || [...el.classList].find((k) => k !== 'be-float') || el.tagName;
  const vivo = (el) => el && !el.hidden && el.offsetParent;
  const cards = ['#leyenda', '#mientras', '#vista-recorrido > *', '#vista-ahora', '#situacion', '#mapa .maplibregl-ctrl-top-right', '.modos', '#tira-suceso', '#leyenda-boton']
    .flatMap((q) => [...document.querySelectorAll(q)]).filter(vivo).map((el) => ({ name: nombre(el), r: el.getBoundingClientRect() })).filter(({ r }) => r.width > 0);
  const hojas = narrow ? ['#panel', '#vista-lectura'].map((q) => document.querySelector(q)).filter(vivo).map((el) => ({ name: 'hoja', r: el.getBoundingClientRect() })) : [];
  const choca = (r, k, mx = 0, my = 0) => !(r.right + mx <= k.left || r.left - mx >= k.right || r.bottom + my <= k.top || r.top - my >= k.bottom);
  const dentro = (r) => r.left >= c.left && r.right <= c.right && r.top >= c.top && r.bottom <= c.bottom;
  const places = (p) => { const s = BE.parseSel(p?.sel); return !s ? [] : s.tipo === 'lugar' ? [s.id] : [...BE.implicados(s).lugares]; };
  let ids;
  if (sel.tipo === 'recorrido') {
    const rc = BE.D.recorridos.find((r) => r.id === sel.id), i = BE.recorridos.pasoDe(sel.id);
    ids = (i === 0 ? rc.paradas : [rc.paradas[i - 1], rc.paradas[i], rc.paradas[i + 1]]).flatMap(places);
  } else ids = [...E.resaltado.lugares];
  ids = [...new Set(ids)].filter((id) => BE.L[id]?.lat != null);
  const REGION = ['region', 'provincia', 'pais', 'reino', 'desierto', 'llanura', 'valle'];
  const towns = ids.filter((id) => !REGION.includes(BE.L[id].tipo) && BE.L[id].precision !== 'zona');
  if (towns.length) ids = towns;
  // What is drawn on the map now: names, numbers, Pablo, travellers, bubbles, candidate points and letters.
  const dibujados = [...mc.querySelectorAll('.etiqueta, .region-texto, .marca-num, .pablo-rotulo, .viajero-rotulo, .grupo-lugares, .cand-rotulo, .cand-punto, .pildora-carta')]
    .filter((el) => el.checkVisibility({ visibilityProperty: true, opacityProperty: false }))
    .map((el) => ({ el, r: el.getBoundingClientRect() })).filter(({ r }) => r.width > 0);
  const stops = [];
  for (const id of ids) {
    const l = BE.L[id];
    const mk = mc.querySelector(`.maplibregl-marker[data-sel="lugar:${CSS.escape(id)}"]`);
    const num = mc.querySelector(`.marca-num[data-lugar="${CSS.escape(id)}"]`);
    const s = { id, nombre: l.nombre, num: num ? !num.classList.contains('sin-etiqueta') : null };
    stops.push(s);
    const p = m.project([l.lon, l.lat]), x = c.left + p.x, y = c.top + p.y;
    if (x < c.left || x > c.right || y < c.top || y > c.bottom) { s.estado = 'punto tapado'; s.por = 'fuera del mapa'; continue; }
    const bajo = [...cards, ...hojas].find(({ r }) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
    if (bajo) { s.estado = 'punto tapado'; s.por = bajo.name; continue; }
    if (!mk || getComputedStyle(mk).display === 'none') { s.estado = mk?.classList.contains('agrupado') ? 'agrupado' : 'sin marca'; continue; }
    const et = mk.querySelector('.etiqueta, .region-texto');
    const r = et.getBoundingClientRect();
    s.lado = r.left + r.right < 2 * x ? 'izquierda' : 'derecha';
    if (!mk.classList.contains('sin-etiqueta')) {
      const h = hojas.find((k) => choca(r, k.r));
      s.estado = h ? 'bajo la hoja' : 'visible';
      continue;
    }
    s.estado = 'quitado';
    const motivos = [];
    // A minor name (menor) waits for zoom 6.3 (pintarEtiquetas), wherever it is.
    if (mk.classList.contains('menor') && m.getZoom() < 6.3) motivos.push('zoom');
    if (!dentro(r)) motivos.push('borde');
    const t = cards.find((k) => choca(r, k.r));
    if (t) motivos.push(`tapa:${t.name}`);
    const otro = dibujados.find((d) => !mk.contains(d.el) && choca(r, d.r, 3, 1));
    if (otro) motivos.push('choque');
    // Any other is out of its zoom range because the fixed reparto gave its place to a name that goes first.
    if (!motivos.length) motivos.push('reparto');
    s.por = motivos[0];
    s.motivos = motivos;
  }
  return { sel: BE.selTexto(sel), zoom: +m.getZoom().toFixed(2), stops };
}

let browser, server, base, tmp;
async function abrir(screen) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...screen });
  context.setDefaultTimeout(30000);
  const page = await context.newPage();
  page.pageErrors = [];
  page.on('pageerror', (e) => page.pageErrors.push(e.message));
  await page.route((u) => !u.href.startsWith(base) && !u.hostname.endsWith('unpkg.com'), (r) => r.abort());
  // With an address the landing does not open (portada.js): the map is in view, as after a search.
  await page.goto(`${base}index.html#t=50.3000`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.BE?.D && window.__be, null, { timeout: 60000 });
  await quieto(page);
  return page;
}
async function quieto(page) {
  await page.waitForFunction(() => { const m = window.__be?.map; return !!m && m.loaded() && !m.isMoving(); }, null, { timeout: 60000 });
  await page.waitForTimeout(900);
  await page.waitForFunction(() => !window.__be.map.isMoving(), null, { timeout: 60000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

const resumen = (stops) => {
  const n = (f) => stops.filter(f).length;
  const por = {};
  for (const s of stops) if (s.estado === 'quitado') por[s.por.split(':')[0]] = (por[s.por.split(':')[0]] || 0) + 1;
  return { total: stops.length, visibles: n((s) => s.estado === 'visible'), bajoHoja: n((s) => s.estado === 'bajo la hoja'),
    puntoTapado: n((s) => s.estado === 'punto tapado'), agrupados: n((s) => s.estado === 'agrupado'), quitados: n((s) => s.estado === 'quitado'), por,
    izquierda: n((s) => s.estado === 'visible' && s.lado === 'izquierda'),
    numeros: stops.some((s) => s.num != null) ? `${n((s) => s.num === true)}/${n((s) => s.num != null)}` : null };
};

async function main() {
  const site = path.join(ROOT, 'site');
  let data = path.join(site, 'data.json');
  if (!fs.existsSync(data)) {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-rotulos-'));
    execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--out', tmp], { cwd: ROOT, stdio: 'pipe' });
    data = path.join(tmp, 'data.json');
  }
  const D = JSON.parse(fs.readFileSync(data, 'utf8'));
  const recorridos = D.recorridos.map((r) => r.id).filter((id) => !CASOS || CASOS.includes(id));
  const viajes = D.viajes.filter((v) => (v.persona === 'pablo' || v.persona === 'jesus') && (!CASOS || CASOS.includes(v.id))).map((v) => ({ id: v.id, quien: v.persona }));
  server = await serve(site, data);
  base = `http://127.0.0.1:${server.address().port}/`;
  browser = await (await loadChromium()).launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  if (FOTOS) fs.mkdirSync(FOTOS, { recursive: true });
  const filas = [];
  for (const screen of PANTALLAS) {
    for (const id of recorridos) {
      const page = await abrir(screen);
      await page.evaluate((x) => window.__be.seleccionar(window.BE.parseSel(`recorrido:${x}`)), id);
      await quieto(page);
      const n = await page.evaluate(() => window.BE.D.recorridos.find((r) => r.id === window.BE.E.sel.id).paradas.length);
      for (let i = 0; i < n; i++) {
        if (i) { await page.evaluate((k) => window.BE.recorridos.irA(k), i); await quieto(page); }
        if (!i && FOTOS) await page.screenshot({ path: path.join(FOTOS, `recorrido-${id}-${screen.name}.png`) });
        const r = await page.evaluate(contar);
        filas.push({ pantalla: screen.name, tipo: 'recorrido', id, paso: i + 1, zoom: r.zoom, stops: r.stops, ...resumen(r.stops) });
      }
      if (page.pageErrors.length) console.error(`${id}: ${page.pageErrors.join('; ')}`);
      await page.context().close();
    }
    for (const v of viajes) {
      const page = await abrir(screen);
      await page.evaluate((x) => window.__be.seleccionar(window.BE.parseSel(`viaje:${x}`)), v.id);
      await quieto(page);
      if (FOTOS) await page.screenshot({ path: path.join(FOTOS, `viaje-${v.id}-${screen.name}.png`) });
      const r = await page.evaluate(contar);
      filas.push({ pantalla: screen.name, tipo: 'viaje', quien: v.quien, id: v.id, paso: 1, zoom: r.zoom, stops: r.stops, ...resumen(r.stops) });
      if (page.pageErrors.length) console.error(`${v.id}: ${page.pageErrors.join('; ')}`);
      await page.context().close();
    }
  }
  const fmt = (r) => `${r.visibles}/${r.total}${r.izquierda ? ` (${r.izquierda} a la izquierda)` : ''}${r.bajoHoja ? ` +${r.bajoHoja} bajo la hoja` : ''}${r.puntoTapado ? `, ${r.puntoTapado} punto tapado` : ''}${r.agrupados ? `, ${r.agrupados} agrupados` : ''}${r.quitados ? `, quitados ${Object.entries(r.por).map(([k, v]) => `${k} ${v}`).join(' ')}` : ''}${r.numeros ? `, números ${r.numeros}` : ''}`;
  for (const f of filas) {
    const caidos = f.stops.filter((s) => s.estado !== 'visible').map((s) => `${s.nombre} (${s.estado}${s.por ? `: ${s.por}` : ''})`);
    console.log(`${f.pantalla}\t${f.tipo}\t${f.id}\tparada ${f.paso}\tzoom ${f.zoom}\t${fmt(f)}${caidos.length ? `\t${caidos.join(', ')}` : ''}`);
  }
  // Totals: a tour on opening and over all its stops; the journeys of each person.
  const suma = (fs_) => resumen(fs_.flatMap((f) => f.stops));
  console.log('\nTotales');
  for (const screen of PANTALLAS) {
    for (const id of recorridos) {
      const fs_ = filas.filter((f) => f.pantalla === screen.name && f.id === id);
      console.log(`${screen.name}\t${id}\tal abrir ${fmt(fs_[0])}\ttodas las paradas ${fmt(suma(fs_))}`);
    }
    for (const q of ['pablo', 'jesus']) console.log(`${screen.name}\tviajes de ${q}\t${fmt(suma(filas.filter((f) => f.pantalla === screen.name && f.quien === q)))}`);
  }
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(filas, null, 1));
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  server?.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});
