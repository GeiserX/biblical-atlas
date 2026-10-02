// Where a journey comes from or goes to when the source does not say where (docs/ideas/area-desconocida.md), in a real
// headless browser. A stop with `place: null` and `unknown_area` is a stay with no point: the map draws it as an area
// that claims no place, beside its neighbouring stop, and animates it when the cursor crosses the arrival or the
// departure.
//
//  - The astrologers come from «Oriente» and go back to «su país»: the areas are stops 0 and 3, so Jerusalén is still
//    stop 1. Both are drawn at their guessed zone, the region of Babylon (Perspicacia «Estrella»), with Parthia as a
//    possible one. The origin is open until they reach Jerusalén and then closes into it; the return opens out from
//    Belén when they leave and closes when the journey ends. The legend names only the open area.
//  - Balaam's journey ends in «su lugar»: after Peor his marker goes and the area opens beside Peor.
//  - Reduced motion and meeting mode: no animation, only the two states; otherwise the change lasts under a second, and
//    the map source is written only when something changes.
//  - Scrubbing back and forth over the arrival leaves the state of the last date, with one set of labels per area.
//  - Clicking the area's label or its fill opens its stop card, never a place card; the card says the source does not
//    say where and gives each guess with whose it is.
//  - Reading mode steps onto the area's passage and the map does not move.
//  - Framing: a journey whose zone would merge its stops (the astrologers) frames the stops and shows a chip at the map
//    edge toward the zone; a journey whose stops stay apart (Balaam) frames the zone too; the chip frames the zone.
//    At 1440 and at 430. Selecting the journey or its area keeps the cursor inside the journey's date.
//  - An area with no guessed zone, like a stop at a place with no point and no candidate at either end, is drawn beside
//    its neighbour in screen pixels; one in the middle of a journey is not drawn (Mahanaim without its candidates, in a
//    copy of the data).
//
// Run from the repository root, one browser at a time:
//   node --test --test-concurrency=1 tests/site/area-desconocida.test.mjs
// Needs python3 with requirements.txt (the data is built into a temporary directory), network access for MapLibre
// (unpkg.com) and playwright-core with a Chromium: either importable, or PLAYWRIGHT_MODULE_DIR=<a node_modules directory
// that holds it>. CHROME_PATH picks another Chromium binary. BE_ROOT=<a checkout> tests that checkout's site instead of
// this one.
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
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const ASTRO = 'los-astrologos-de-oriente';

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
/** Serves the site with the built data; under /<variant>/ the same site runs with that variant's data. */
const variants = {};
function serve(siteDir, dataDir) {
  const server = http.createServer((req, res) => {
    let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const name = url.split('/')[1];
    const v = variants[name];
    if (v) url = url.slice(name.length + 1);
    const rel = url === '/' ? 'index.html' : url.slice(1);
    const data = v?.data || dataDir;
    const file = ['data.json', 'data.js'].includes(rel) ? path.join(data, rel) : path.join(siteDir, rel);
    if (!file.startsWith(siteDir) && !file.startsWith(dataDir)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(body);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}
/** A copy of the built data, changed by `change`, served under /<name>/. */
function variant(name, change) {
  const D = JSON.parse(fs.readFileSync(path.join(tmp, 'data.json'), 'utf8'));
  change(D);
  const dir = path.join(tmp, name);
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'data.json'), JSON.stringify(D));
  fs.writeFileSync(path.join(dir, 'data.js'), `window.BIBLICAL_ATLAS_DATA = ${JSON.stringify(D)};\n`);
  variants[name] = { data: dir };
}

let browser, server, origin, tmp, page;
const errors = [];
/** A page with the data and the map loaded. Tiles from other hosts are not needed; MapLibre from unpkg is. */
async function open({ prefix = '', hash = 't=0.5&linea=normal', reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({ deviceScaleFactor: 1, reducedMotion, ...DESKTOP });
  const p = await context.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await p.route((url) => !url.href.startsWith(origin) && !url.hostname.endsWith('unpkg.com'), (route) => route.abort());
  await p.goto(`${origin}${prefix}/index.html#${hash}`);
  await p.waitForFunction(() => window.__be?.map?.loaded?.() && window.__be.map.getSource('be-rastro'), null, { timeout: 30000 });
  return p;
}
before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-area-desconocida-'));
  execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--out', tmp], { cwd: ROOT, stdio: 'pipe' });
  variant('sin-candidatos', (D) => { delete D.lugares.mahanaim.candidatos; });
  // The same data with every guess's sources in reverse order: «según …» must not change, because it comes from
  // according_to and not from the order of the list.
  variant('fuentes-al-reves', (D) => { for (const v of D.viajes) for (const p of v.paradas) for (const g of p.unknown_area?.guesses || []) g.sources.reverse(); });
  server = await serve(path.join(ROOT, 'site'), tmp);
  origin = `http://127.0.0.1:${server.address().port}`;
  const chromium = await loadChromium();
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  page = await open();
});
after(async () => {
  await browser?.close();
  server?.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

/** Stops of a journey as the timeline places them: { key, nombre, area, a, b }. */
function paradas(p, id) {
  return p.evaluate((id) => {
    const { BE } = window.__be;
    return BE.paradasDe(BE.D.viajes.find((v) => v.id === id)).map((s) => ({ key: s.key, nombre: s.lugar.nombre, area: !!s.lugar.area, a: s.a, b: s.b, lugar: s.lugar.id }));
  }, id);
}
/** Puts the selection and the cursor, waits two frames and reads every area on the map: its stop, side, state and where
    its shape is drawn, in pixels from its anchor (the neighbouring stop) on the screen, once a change has finished. */
function areasEn(p, t, sel = null, esperar = 700) {
  return p.evaluate(async ({ t, sel, esperar }) => {
    const { BE, map, setT, seleccionar } = window.__be;
    if (sel !== undefined) seleccionar(sel ? BE.parseSel(sel) : null, { mover: false, encuadrar: false });
    setT(t);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (esperar) await new Promise((r) => setTimeout(r, esperar));
    const caja = map.getContainer().getBoundingClientRect();
    return [...document.querySelectorAll('.area-desc')].map((el) => {
      const zona = el.querySelector('.area-desc__zona').getBoundingClientRect(), anc = el.getBoundingClientRect();
      return { sel: el.querySelector('.area-desc__zona').dataset.sel, lado: el.dataset.lado, estado: el.dataset.estado, anillo: el.classList.contains('area-desc--anillo'),
        dx: Math.round(zona.left + zona.width / 2 - anc.left), dy: Math.round(zona.top + zona.height / 2 - anc.top), texto: el.textContent.replace(/\s+/g, ' ').trim(),
        dentro: anc.left >= caja.left && anc.right <= caja.right };
    }).sort((a, b) => a.sel.localeCompare(b.sel));
  }, { t, sel, esperar });
}

/** Puts the selection and the cursor, waits until no zone is moving and reads the zones: { key, estado, p, centro }. */
function zonasEn(p, t, sel = null) {
  return p.evaluate(async ({ t, sel }) => {
    const { BE, setT, seleccionar } = window.__be;
    if (sel !== undefined) seleccionar(sel ? BE.parseSel(sel) : null, { mover: false, encuadrar: false });
    setT(t);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const t0 = performance.now();
    while (BE.mapa.areas().some((z) => z.animando) && performance.now() - t0 < 3000) await new Promise((r) => setTimeout(r, 50));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const textos = (k) => [...document.querySelectorAll(`.area-desc--zona [data-sel="parada:${k}"]`)].map((b) => b.textContent.replace(/\s+/g, ' ').trim());
    return BE.mapa.areas().map((z) => ({ ...z, textos: textos(z.key) }));
  }, { t, sel });
}
const leyenda = (p) => p.evaluate(() => document.querySelector('#leyenda').textContent.replace(/\s+/g, ' '));

test('the astrologers come from Oriente and go back to su país: stops 0 and 3, drawn at the guessed zone, open before the arrival and after the departure', async () => {
  const ps = await paradas(page, ASTRO);
  assert.deepEqual(ps.map((s) => [s.key, s.nombre, s.area]), [[`${ASTRO}/0`, 'Oriente', true], [`${ASTRO}/1`, 'Jerusalén', false],
    [`${ASTRO}/2`, 'Belén', false], [`${ASTRO}/3`, 'su país', true]]);
  assert.ok(ps[0].b <= ps[1].a && ps[1].a - ps[0].a <= 0.1, JSON.stringify(ps));
  assert.ok(ps[3].a >= ps[2].b && ps[3].b - ps[2].b <= 0.1, JSON.stringify(ps));
  const pos = await page.evaluate(({ ASTRO, t }) => window.__be.BE.donde(`grupo:${ASTRO}`, t)?.pos ?? null, { ASTRO, t: (ps[0].a + ps[0].b) / 2 });
  assert.equal(pos, null, 'the zone is a guess: nobody is placed in it');
  const antes = await zonasEn(page, (ps[0].a + ps[0].b) / 2, null);
  const oriente = antes.find((x) => x.key === `${ASTRO}/0`), pais = antes.find((x) => x.key === `${ASTRO}/3`);
  assert.deepEqual([oriente?.estado, oriente?.p], ['abierta', 0], JSON.stringify(antes));
  assert.ok(Math.abs(oriente.centro[0] - 46) < 0.01 && Math.abs(oriente.centro[1] - 31.9) < 0.01, `at the Babylon zone: ${JSON.stringify(oriente)}`);
  assert.deepEqual(oriente.textos, ['Orientezona probable: región de Babilonia', 'o Partia']);
  assert.equal(pais.estado, 'cerrada');
  // The legend names only what is drawn: the open origin, not the closed return.
  let ley = await leyenda(page);
  assert.match(ley, /Origen de los astrólogos de Oriente: Oriente; zona probable: región de Babilonia, según Perspicacia «Estrella»/);
  assert.doesNotMatch(ley, /Destino de los astrólogos/);
  // At the arrival the origin is still open (they are arriving); just after it, closed into Jerusalén.
  assert.equal((await zonasEn(page, ps[1].a)).find((x) => x.key === `${ASTRO}/0`).estado, 'abierta');
  const enJerusalen = (await zonasEn(page, ps[1].a + 0.001)).find((x) => x.key === `${ASTRO}/0`);
  const jerusalen = await page.evaluate(() => [window.__be.BE.L.jerusalen.lon, window.__be.BE.L.jerusalen.lat]);
  assert.deepEqual([enJerusalen.estado, enJerusalen.p, enJerusalen.centro], ['cerrada', 1, jerusalen]);
  assert.doesNotMatch(await leyenda(page), /Origen de los astrólogos|Destino de los astrólogos/, 'nothing open, no row');
  const vuelta = (await zonasEn(page, (ps[3].a + ps[3].b) / 2)).find((x) => x.key === `${ASTRO}/3`);
  assert.deepEqual([vuelta.estado, vuelta.p], ['abierta', 0], JSON.stringify(vuelta));
  ley = await leyenda(page);
  assert.match(ley, /Destino de los astrólogos de Oriente: su país; zona probable: región de Babilonia, según Perspicacia «Estrella»/);
  assert.doesNotMatch(ley, /Origen de los astrólogos/);
  // The return closes with the journey: after its own stay, in the grey year, it is closed.
  const gris = (await zonasEn(page, ps[3].b + 0.2)).find((x) => x.key === `${ASTRO}/3`);
  assert.equal(gris?.estado, 'cerrada', JSON.stringify(gris));
});

test('old stop links still open the same stops: parada 1 is Jerusalén, numbered among the real stops', async () => {
  const r = await page.evaluate(async (ASTRO) => {
    const { BE, seleccionar } = window.__be;
    seleccionar(BE.parseSel(`parada:${ASTRO}/1`), { mover: false, encuadrar: false });
    await new Promise((res) => setTimeout(res, 300));
    const panel = document.querySelector('#panel-cuerpo');
    const uno = { titulo: panel.querySelector('.be-card__title')?.textContent.trim(), cuerpo: panel.textContent.replace(/\s+/g, ' ') };
    seleccionar(BE.parseSel(`viaje:${ASTRO}`), { mover: false, encuadrar: false });
    await new Promise((res) => setTimeout(res, 300));
    const filas = [...document.querySelectorAll('#panel-cuerpo ol.paradas li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim().split('Mt ')[0]);
    return { uno, filas, doce: BE.existe('parada', 'los-12000-contra-jabes-galaad/1') && BE.nombreSel(BE.parseSel('parada:los-12000-contra-jabes-galaad/1')) };
  }, ASTRO);
  assert.equal(r.uno.titulo, 'Jerusalén');
  assert.match(r.uno.cuerpo, /Parada 1 de 2/);
  assert.deepEqual(r.filas, ['Origen: Oriente', '1. Jerusalén', '2. Belén', 'Destino: su país']);
  assert.match(String(r.doce), /^Jabés-Galaad/);
});

test('a journey with an unknown end: Balaam leaves Peor for «su lugar», his marker goes and the area opens beside Peor', async () => {
  const ps = await paradas(page, 'viaje-de-balaam');
  const peor = ps.find((s) => s.lugar === 'peor'), fin = ps.at(-1);
  assert.deepEqual([fin.key, fin.nombre, fin.area], ['viaje-de-balaam/7', 'su lugar', true]);
  const leer = (t) => page.evaluate(async (t) => {
    const { BE, setT, seleccionar } = window.__be;
    seleccionar(null, { mover: false, encuadrar: false });
    setT(t);
    await new Promise((r) => setTimeout(r, 700));
    const z = BE.mapa.areas().find((x) => x.key === 'viaje-de-balaam/7');
    const marca = document.querySelector('.viajero[data-sel="persona:balaam"]');
    return { estado: z?.estado ?? null, marca: !!marca?.isConnected, pos: BE.donde('balaam', t)?.pos ?? null };
  }, t);
  const enPeor = await leer(peor.b);
  assert.equal(enPeor.estado, 'cerrada', JSON.stringify(enPeor));
  assert.equal(enPeor.marca, true, 'at Peor Balaam has his marker');
  assert.deepEqual(await leer((fin.a + fin.b) / 2), { estado: 'abierta', marca: false, pos: null });
});

test('reduced motion and meeting mode show only the two states; otherwise the change lasts under a second; the map source is written only on a change', async () => {
  const ps = await paradas(page, ASTRO);
  const cruzar = (p, reunion = false) => p.evaluate(async ({ ASTRO, a, b, reunion }) => {
    const { setT, seleccionar, BE } = window.__be;
    BE.ponerPreferencia('reunion', reunion);
    seleccionar(BE.parseSel(`viaje:${ASTRO}`), { mover: false, encuadrar: false });
    setT(a);
    await new Promise((r) => setTimeout(r, 700));
    const zona = () => BE.mapa.areas().find((x) => x.key === `${ASTRO}/0`);
    setT(b);
    let t0 = null, t1 = null;
    for (let k = 0; k < 400; k++) {
      await new Promise((r) => requestAnimationFrame(r));
      const z = zona();
      if (z.animando && t0 === null) t0 = performance.now();
      if (!z.animando && k > 2) { t1 = performance.now(); break; }
    }
    BE.ponerPreferencia('reunion', false);
    return { estado: zona().estado, animo: t0 !== null, final: zona().p, duracion: t0 === null ? 0 : t1 - t0 };
  }, { ASTRO, a: (ps[0].a + ps[0].b) / 2, b: ps[1].a + 0.001, reunion });
  const normal = await cruzar(page);
  assert.deepEqual([normal.estado, normal.animo, normal.final], ['cerrada', true, 1], JSON.stringify(normal));
  assert.ok(normal.duracion > 300 && normal.duracion < 1000, `about 0.45 s, under a second: ${JSON.stringify(normal)}`);
  const reunion = await cruzar(page, true);
  assert.deepEqual([reunion.animo, reunion.final], [false, 1], `meeting mode: closed at once: ${JSON.stringify(reunion)}`);
  const p = await open({ hash: 't=0.5&linea=normal', reducedMotion: 'reduce' });
  const reducido = await cruzar(p);
  assert.deepEqual([reducido.animo, reducido.final], [false, 1], `reduced motion: closed at once: ${JSON.stringify(reducido)}`);
  await p.context().close();
  // Thirty frames moving the cursor inside the origin's open stretch: nothing changes, nothing is written.
  const escrituras = await page.evaluate(async ({ ASTRO, a, b }) => {
    const { setT, seleccionar, BE } = window.__be;
    seleccionar(BE.parseSel(`viaje:${ASTRO}`), { mover: false, encuadrar: false });
    setT(a);
    await new Promise((r) => setTimeout(r, 700));
    const antes = BE.mapa.escriturasAreas();
    for (let k = 0; k < 30; k++) { setT(a + ((b - a) * k) / 30); await new Promise((r) => requestAnimationFrame(r)); }
    return BE.mapa.escriturasAreas() - antes;
  }, { ASTRO, a: ps[0].a, b: ps[0].b });
  assert.equal(escrituras, 0);
});

test('scrubbing back and forth over the arrival leaves the state of the last date, with one set of labels per area', async () => {
  const ps = await paradas(page, ASTRO);
  const r = await page.evaluate(async ({ ASTRO, a, b }) => {
    const { setT, seleccionar, BE } = window.__be;
    seleccionar(BE.parseSel(`viaje:${ASTRO}`), { mover: false, encuadrar: false });
    const frame = () => new Promise((res) => requestAnimationFrame(res));
    const estados = [];
    for (const [de, a2] of [[a, b], [b, a], [a, b], [b, a]]) {
      for (let k = 0; k <= 12; k++) { setT(de + ((a2 - de) * k) / 12); await frame(); }
      while (BE.mapa.areas().some((z) => z.animando)) await frame();
      const els = [...document.querySelectorAll(`.area-desc--zona [data-sel="parada:${ASTRO}/0"]`)];
      const z = BE.mapa.areas().find((x) => x.key === `${ASTRO}/0`);
      estados.push({ n: els.length, estado: els[0]?.closest('.area-desc').dataset.estado, p: z.p });
    }
    return estados;
  }, { ASTRO, a: ps[0].a, b: ps[1].a + 0.01 });
  assert.deepEqual(r, [{ n: 2, estado: 'cerrada', p: 1 }, { n: 2, estado: 'abierta', p: 0 }, { n: 2, estado: 'cerrada', p: 1 }, { n: 2, estado: 'abierta', p: 0 }]);
});

test('clicking the area label or its fill opens its stop card, which gives each guess with whose it is, and never a place card', async () => {
  const ps = await paradas(page, ASTRO);
  const abrir = async () => {
    await zonasEn(page, (ps[0].a + ps[0].b) / 2, `viaje:${ASTRO}`);
    await page.evaluate(() => { const { map } = window.__be; map.jumpTo({ center: [43, 32], zoom: 5 }); });
    await page.waitForTimeout(500);
  };
  const leer = () => page.evaluate(() => {
    const { E } = window.__be.BE;
    const panel = document.querySelector('#panel-cuerpo');
    return { sel: `${E.sel?.tipo}:${E.sel?.id}`, titulo: panel.querySelector('.be-card__title')?.textContent.trim(),
      cuerpo: panel.textContent.replace(/\s+/g, ' '), lugarEnTitulo: !!panel.querySelector('.be-card__title [data-sel^="lugar:"]'),
      vecina: !!panel.querySelector('[data-sel="parada:los-astrologos-de-oriente/1"]') };
  });
  await abrir();
  await page.click('.area-desc--zona.area-desc--llega:not(.area-desc--otra) .area-desc__zona');
  await page.waitForTimeout(300);
  const r = await leer();
  assert.equal(r.sel, `parada:${ASTRO}/0`);
  assert.equal(r.titulo, 'Oriente');
  assert.equal(r.lugarEnTitulo, false, 'the title opens no place');
  assert.match(r.cuerpo, /Origen del viaje/);
  assert.match(r.cuerpo, /La fuente no dice dónde\. Solo da el rumbo: el este\./);
  assert.match(r.cuerpo, /Zona probable: región de Babilonia, según Perspicacia «Estrella»\./);
  assert.match(r.cuerpo, /Otra zona posible: Partia, según «El hombre en busca de Dios»\./);
  assert.match(r.cuerpo, /No es lo que dice el texto\./);
  assert.equal(r.vecina, true, 'the card leads to the Jerusalén stop');
  // The fill: a point inside the ellipse, away from its label.
  await page.evaluate(() => window.__be.seleccionar(null, { mover: false, encuadrar: false }));
  await abrir();
  const punto = await page.evaluate(() => {
    const { map } = window.__be;
    const q = map.project([47.0, 31.0]), c = map.getContainer().getBoundingClientRect();
    return { x: c.left + q.x, y: c.top + q.y };
  });
  await page.mouse.click(punto.x, punto.y);
  await page.waitForTimeout(300);
  assert.equal((await leer()).sel, `parada:${ASTRO}/0`, 'a click on the fill opens the stop');
});

test('«según …» names the guess\'s own source, whatever the order of its sources', async () => {
  const p = await open({ prefix: '/fuentes-al-reves', hash: 't=0.5&linea=normal' });
  const ps = await paradas(p, ASTRO);
  await zonasEn(p, (ps[0].a + ps[0].b) / 2, `viaje:${ASTRO}`);
  const r = await p.evaluate(() => ({ primera: window.__be.BE.D.viajes.find((v) => v.id === 'los-astrologos-de-oriente').paradas[0].unknown_area.guesses[0].sources[0],
    leyenda: document.querySelector('#leyenda').textContent.replace(/\s+/g, ' ') }));
  assert.notEqual(r.primera, 'it-estrella', 'the list is reversed in this copy');
  assert.match(r.leyenda, /zona probable: región de Babilonia, según Perspicacia «Estrella»/);
  await p.context().close();
});

test('reading mode steps onto the area and the map does not move', async () => {
  const p = await open({ hash: 't=0.5&linea=normal&leer=mt-2' });
  await p.waitForSelector('#vista-lectura .pasaje-boton');
  const r = await p.evaluate(async () => {
    const { BE, map } = window.__be;
    const ps = BE.lectura.pasajes(BE.pasajeDeId('mt-2').libro, 2);
    const i = ps.findIndex((x) => x.sel === 'parada:los-astrologos-de-oriente/0');
    const j = ps.findIndex((x) => x.sel === 'parada:los-astrologos-de-oriente/3');
    map.jumpTo({ center: [35.6, 31.9], zoom: 8.2 });
    await new Promise((r) => setTimeout(r, 200));
    document.querySelector(`#vista-lectura [data-lectura-pasaje="${i}"]`).click();
    await new Promise((r) => setTimeout(r, 1200));
    const c = map.getCenter();
    return { i, j, primera: ps[0].sel, sel: `${BE.E.sel?.tipo}:${BE.E.sel?.id}`, centro: [+c.lng.toFixed(3), +c.lat.toFixed(3)], zoom: +map.getZoom().toFixed(2),
      estado: BE.mapa.areas().find((x) => x.key === 'los-astrologos-de-oriente/0')?.estado ?? null,
      texto: document.querySelector('#vista-lectura .pasaje-item--abierto')?.textContent.replace(/\s+/g, ' ') ?? '' };
  });
  assert.equal(r.primera, 'parada:los-astrologos-de-oriente/0', 'the origin is the first passage of Mateo 2');
  assert.ok(r.j > r.i, JSON.stringify(r));
  assert.equal(r.sel, 'parada:los-astrologos-de-oriente/0');
  assert.deepEqual([r.centro, r.zoom], [[35.6, 31.9], 8.2], `the map stays where it was: ${JSON.stringify(r)}`);
  assert.equal(r.estado, 'abierta');
  assert.match(r.texto, /de Oriente, la fuente no dice dónde/);
  // «de el campamento» reads «del campamento».
  const doce = await p.evaluate(() => { const { BE } = window.__be; return BE.lectura.pasajes(BE.pasajeDeId('jue-21').libro, 21).map((x) => x.titulo).find((t) => /campamento/.test(t)); });
  assert.match(doce, /: del campamento, la fuente no dice dónde$/);
  await p.context().close();
});

/** Frames a selection from far away and reads what the map shows: zoom, whether the stops and the zone are inside,
    how far apart the two real stops are, whether the edge chip shows, and where the cursor went. */
function encuadres(p, sel, stops, zona) {
  return p.evaluate(async ({ sel, stops, zona }) => {
    const { BE, map, seleccionar } = window.__be;
    const quieto = () => new Promise((res) => { const t0 = performance.now(); const f = () => (!map.isMoving() && performance.now() - t0 > 400) || performance.now() - t0 > 6000 ? res() : requestAnimationFrame(f); f(); });
    seleccionar(null, { mover: false, encuadrar: false });
    map.jumpTo({ center: [12, 42], zoom: 4 });
    seleccionar(BE.parseSel(sel));
    await quieto();
    await new Promise((r) => setTimeout(r, 300));
    const b = map.getBounds(), pts = stops.map((id) => map.project([BE.L[id].lon ?? BE.puntoLugar(BE.L[id]).c[0], BE.L[id].lat ?? BE.puntoLugar(BE.L[id]).c[1]]));
    const chip = [...document.querySelectorAll('.area-chip')].find((c) => !c.hidden);
    return { zoom: +map.getZoom().toFixed(1), paradas: stops.every((id) => b.contains([BE.L[id].lon ?? BE.puntoLugar(BE.L[id]).c[0], BE.L[id].lat ?? BE.puntoLugar(BE.L[id]).c[1]])),
      zona: b.contains(zona), px: Math.round(Math.hypot(pts[0].x - pts.at(-1).x, pts[0].y - pts.at(-1).y)), t: BE.E.t,
      chip: chip ? { lado: chip.dataset.lado, texto: chip.textContent.replace(/\s+/g, ' ').trim() } : null };
  }, { sel, stops, zona });
}

test('framing keeps the real stops apart: the astrologers frame Jerusalén and Belén with an edge chip toward the zone; Balaam frames the zone too; at 1440 and 430', async () => {
  const comprobar = async (p) => {
    const astro = await encuadres(p, `viaje:${ASTRO}`, ['jerusalen', 'belen'], [46.0, 31.9]);
    assert.ok(astro.paradas && !astro.zona && astro.px >= 40, `the stops, not the zone: ${JSON.stringify(astro)}`);
    assert.ok(astro.t >= 0 && astro.t <= 2, `the cursor stays inside the journey's date: ${JSON.stringify(astro)}`);
    assert.deepEqual(astro.chip, { lado: 'este', texto: '➜Oriente · zona probable: región de Babilonia' }, JSON.stringify(astro));
    // The chip frames the zone.
    await p.click('.area-chip:not([hidden])');
    await p.waitForTimeout(1200);
    const tras = await p.evaluate(() => window.__be.map.getBounds().contains([46.0, 31.9]));
    assert.equal(tras, true, 'after the chip, the zone is in view');
    const balaam = await encuadres(p, 'viaje:viaje-de-balaam', ['petor', 'peor'], [36.3, 31.75]);
    assert.ok(balaam.paradas && balaam.zona && balaam.px >= 40, `the stops stay apart, so the zone is framed too: ${JSON.stringify(balaam)}`);
    const area = await encuadres(p, `parada:${ASTRO}/0`, ['jerusalen', 'jerusalen'], [46.0, 31.9]);
    assert.ok(area.paradas && area.zona && area.t >= 0, `the area's own stop frames its zone and its neighbour: ${JSON.stringify(area)}`);
  };
  await comprobar(page);
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const tel = await ctx.newPage();
  await tel.route((url) => !url.href.startsWith(origin) && !url.hostname.endsWith('unpkg.com'), (route) => route.abort());
  await tel.goto(`${origin}/index.html#t=0.5`);
  await tel.waitForFunction(() => window.__be?.map?.loaded?.() && window.__be.map.getSource('be-rastro'), null, { timeout: 30000 });
  await comprobar(tel);
  await ctx.close();
});

test('an area with no guessed zone is drawn beside its neighbour at either end, never in the middle of a journey', async () => {
  const p = await open({ prefix: '/sin-candidatos', hash: 't=0.5&linea=normal' });
  const ps = await paradas(p, 'abner-en-gabaon');
  assert.deepEqual([ps[0].lugar, ps.at(-1).lugar], ['mahanaim', 'mahanaim']);
  const antes = await areasEn(p, (ps[0].a + ps[0].b) / 2, 'viaje:abner-en-gabaon');
  const ini = antes.find((x) => x.sel === `parada:${ps[0].key}`);
  assert.deepEqual([ini?.estado, ini?.lado, ini?.anillo], ['abierta', 'llega', true], JSON.stringify(antes));
  assert.match(ini.texto, /^Mahanaim\s*sin ubicación conocida$/);
  const despues = await areasEn(p, ps.at(-1).b + 0.001, 'viaje:abner-en-gabaon');
  assert.equal(despues.find((x) => x.sel === `parada:${ps.at(-1).key}`)?.estado, 'abierta', JSON.stringify(despues));
  // Mahanaim in the middle of Jacob's return: no area for it.
  const jacob = await paradas(p, 'vuelta-de-jacob');
  const mah = jacob.find((s) => s.lugar === 'mahanaim');
  const medio = await areasEn(p, (mah.a + mah.b) / 2, 'viaje:vuelta-de-jacob');
  assert.deepEqual(medio.filter((x) => x.sel.startsWith('parada:vuelta-de-jacob/')), []);
  const real = await areasEn(page, (ps[0].a + ps[0].b) / 2, 'viaje:abner-en-gabaon');
  assert.deepEqual(real, []);
  await p.context().close();
});

test('Balaam\'s lane carries the area stop as a mark of his journey, and nothing failed on the page', async () => {
  const r = await page.evaluate(async () => {
    const { BE, seleccionar } = window.__be;
    seleccionar(BE.parseSel('persona:balaam'));
    await new Promise((res) => setTimeout(res, 300));
    seleccionar(BE.parseSel('parada:viaje-de-balaam/7'));
    await new Promise((res) => setTimeout(res, 600));
    return [...document.querySelectorAll('.m[data-id]')].map((m) => m.dataset.id).filter((id) => id.includes('viaje-de-balaam/7'));
  });
  assert.equal(r.length, 1, JSON.stringify(r));
  assert.deepEqual(errors, []);
});
