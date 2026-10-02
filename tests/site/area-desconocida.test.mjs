// Where a journey comes from or goes to when the source does not say where (docs/ideas/area-desconocida.md), in a real
// headless browser. A stop with `place: null` and `unknown_area` is a stay with no point: the map draws it as an area
// that claims no place, beside its neighbouring stop, and animates it when the cursor crosses the arrival or the
// departure.
//
//  - The astrologers come from «Oriente» and go back to «su país»: four stops, the areas first and last. Both are drawn
//    at their guessed zone, Babilonia (Perspicacia «Este»), with Media as the other guess. The origin is open until
//    they reach Jerusalén and then closes into it; the return opens out from Belén when they leave.
//  - Balaam's journey ends in «su lugar»: after Peor his marker goes and the area opens beside Peor.
//  - With reduced motion there is no transition, only the two states; without it the change lasts well under a second.
//  - Scrubbing back and forth over the arrival leaves the state of the last date, with one marker per area.
//  - Clicking the area opens its stop card, never a place card: the card says the source does not say where.
//  - Reading mode steps onto the area's passage and the map does not move.
//  - Selecting the journey frames its known stops and its guessed zone, on a desktop and on a phone; selecting the area's
//    stop from far away frames the zone and the neighbouring stop, never the epoch.
//  - An area with no guessed zone, like a stop at a place with no point and no candidate at either end, is drawn beside
//    its neighbour in screen pixels (Mahanaim without its candidates, in a copy of the data).
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
    const textos = (k) => [...document.querySelectorAll(`.area-desc--zona [data-sel="parada:${k}"]`)].map((b) => b.textContent.replace(/\s+/g, ' ').trim());
    return BE.mapa.areas().map((z) => ({ ...z, textos: textos(z.key) }));
  }, { t, sel });
}

test('the astrologers come from Oriente and go back to su país: drawn at the guessed zone, open before the arrival and after the departure', async () => {
  const ps = await paradas(page, ASTRO);
  assert.deepEqual(ps.map((s) => [s.key, s.nombre, s.area]), [[`${ASTRO}/1`, 'Oriente', true], [`${ASTRO}/2`, 'Jerusalén', false],
    [`${ASTRO}/3`, 'Belén', false], [`${ASTRO}/4`, 'su país', true]]);
  // Each area sits right next to its neighbour on the timeline: just before Jerusalén, just after Belén.
  assert.ok(ps[0].b <= ps[1].a && ps[1].a - ps[0].a <= 0.1, JSON.stringify(ps));
  assert.ok(ps[3].a >= ps[2].b && ps[3].b - ps[2].b <= 0.1, JSON.stringify(ps));
  // The group is nowhere while in an area: the zone is a guess, and no position is invented.
  const pos = await page.evaluate(({ ASTRO, t }) => window.__be.BE.donde(`grupo:${ASTRO}`, t)?.pos ?? null, { ASTRO, t: (ps[0].a + ps[0].b) / 2 });
  assert.equal(pos, null);
  // Not selected, in the origin's own time: the journey is drawn and the origin is open at Babilonia, with Media too.
  const antes = await zonasEn(page, (ps[0].a + ps[0].b) / 2, null);
  const oriente = antes.find((x) => x.key === `${ASTRO}/1`), pais = antes.find((x) => x.key === `${ASTRO}/4`);
  assert.equal(oriente?.estado, 'abierta', JSON.stringify(antes));
  assert.equal(oriente.p, 0);
  assert.ok(Math.abs(oriente.centro[0] - 46) < 0.01 && Math.abs(oriente.centro[1] - 31.9) < 0.01, `at the Babilonia zone: ${JSON.stringify(oriente)}`);
  assert.deepEqual(oriente.textos, ['Orientezona probable: Babilonia', 'o Media'], 'the words, then the guess, on two lines');
  assert.equal(pais.estado, 'cerrada');
  // At Jerusalén the origin has closed into it: its centre is Jerusalén's point. After Belén the return is open.
  const enJerusalen = (await zonasEn(page, ps[1].a + 0.001)).find((x) => x.key === `${ASTRO}/1`);
  const jerusalen = await page.evaluate(() => [window.__be.BE.L.jerusalen.lon, window.__be.BE.L.jerusalen.lat]);
  assert.deepEqual([enJerusalen.estado, enJerusalen.p, enJerusalen.centro], ['cerrada', 1, jerusalen]);
  const vuelta = (await zonasEn(page, (ps[3].a + ps[3].b) / 2)).find((x) => x.key === `${ASTRO}/4`);
  assert.deepEqual([vuelta.estado, vuelta.p], ['abierta', 0], JSON.stringify(vuelta));
  // The legend names both ends with the source's words and says the zone is a guess, and whose.
  const leyenda = await page.evaluate(() => document.querySelector('#leyenda').textContent.replace(/\s+/g, ' '));
  assert.match(leyenda, /Origen de los astrólogos de Oriente: Oriente; zona probable: Babilonia, según Perspicacia «Este»/);
  assert.match(leyenda, /Destino de los astrólogos de Oriente: su país; zona probable: Babilonia, según Perspicacia «Este»/);
});

test('a journey with an unknown end: Balaam leaves Peor for «su lugar», his marker goes and the area opens beside Peor', async () => {
  const ps = await paradas(page, 'viaje-de-balaam');
  const peor = ps.find((s) => s.lugar === 'peor'), fin = ps.at(-1);
  assert.deepEqual([fin.nombre, fin.area, ps.indexOf(fin) === ps.length - 1], ['su lugar', true, true]);
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
  const ido = await leer((fin.a + fin.b) / 2);
  assert.deepEqual(ido, { estado: 'abierta', marca: false, pos: null });
});

test('with reduced motion there is no transition, only the two states; without it the change lasts well under a second', async () => {
  const ps = await paradas(page, ASTRO);
  const cruzar = (p) => p.evaluate(async ({ ASTRO, a, b }) => {
    const { setT, seleccionar, BE } = window.__be;
    seleccionar(BE.parseSel(`viaje:${ASTRO}`), { mover: false, encuadrar: false });
    setT(a);
    await new Promise((r) => setTimeout(r, 700));
    const zona = () => BE.mapa.areas().find((x) => x.key === `${ASTRO}/1`);
    // One reading per frame from the change until the zone stops. A slow headless frame may skip the steps in between,
    // so what is measured is whether it animated at all and for how long, in wall time.
    setT(b);
    const ps = [];
    let t0 = null, t1 = null;
    for (let k = 0; k < 400; k++) {
      await new Promise((r) => requestAnimationFrame(r));
      const z = zona();
      ps.push(+z.p.toFixed(3));
      if (z.animando && t0 === null) t0 = performance.now();
      if (!z.animando && k > 2) { t1 = performance.now(); break; }
    }
    return { estado: zona().estado, animo: t0 !== null, pasos: ps.length, final: zona().p, duracion: t0 === null ? 0 : t1 - t0 };
  }, { ASTRO, a: (ps[0].a + ps[0].b) / 2, b: ps[1].a + 0.001 });
  const normal = await cruzar(page);
  assert.equal(normal.estado, 'cerrada');
  assert.ok(normal.animo, `the zone animates from open to closed: ${JSON.stringify(normal)}`);
  assert.equal(normal.final, 1);
  assert.ok(normal.duracion > 300 && normal.duracion < 1000, `about 0.45 s, well under a second: ${JSON.stringify(normal)}`);
  const p = await open({ hash: 't=0.5&linea=normal', reducedMotion: 'reduce' });
  const reducido = await cruzar(p);
  assert.deepEqual([reducido.animo, reducido.final], [false, 1], `closed at once, with no motion: ${JSON.stringify(reducido)}`);
  await p.context().close();
});

test('scrubbing back and forth over the arrival leaves the state of the last date, with one marker per area', async () => {
  const ps = await paradas(page, ASTRO);
  const r = await page.evaluate(async ({ ASTRO, a, b }) => {
    const { setT, seleccionar, BE } = window.__be;
    seleccionar(BE.parseSel(`viaje:${ASTRO}`), { mover: false, encuadrar: false });
    const frame = () => new Promise((res) => requestAnimationFrame(res));
    const estados = [];
    // A hand on the ruler: small steps forwards past the arrival, back before it and forwards again, one per frame.
    for (const [de, a2] of [[a, b], [b, a], [a, b], [b, a]]) {
      for (let k = 0; k <= 12; k++) { setT(de + ((a2 - de) * k) / 12); await frame(); }
      while (BE.mapa.areas().some((z) => z.animando)) await frame();
      const els = [...document.querySelectorAll(`.area-desc--zona [data-sel="parada:${ASTRO}/1"]`)];
      const z = BE.mapa.areas().find((x) => x.key === `${ASTRO}/1`);
      estados.push({ n: els.length, estado: els[0]?.closest('.area-desc').dataset.estado, p: z.p });
    }
    return estados;
  }, { ASTRO, a: ps[0].a, b: ps[1].a + 0.01 });
  // Two labels per area: Babilonia and Media.
  assert.deepEqual(r, [{ n: 2, estado: 'cerrada', p: 1 }, { n: 2, estado: 'abierta', p: 0 }, { n: 2, estado: 'cerrada', p: 1 }, { n: 2, estado: 'abierta', p: 0 }]);
});

test('clicking the area opens its stop card, which says the source does not say where, and never a place card', async () => {
  const ps = await paradas(page, ASTRO);
  await zonasEn(page, (ps[0].a + ps[0].b) / 2, `viaje:${ASTRO}`);
  // The open area's label, whatever it points to: the click must land on the stop, never on a place.
  await page.click('.area-desc--zona.area-desc--llega:not(.area-desc--otra) .area-desc__zona');
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const { E } = window.__be.BE;
    const panel = document.querySelector('#panel-cuerpo');
    return { sel: `${E.sel?.tipo}:${E.sel?.id}`, titulo: panel.querySelector('.be-card__title')?.textContent.trim(),
      cuerpo: panel.textContent.replace(/\s+/g, ' '), lugarEnTitulo: !!panel.querySelector('.be-card__title [data-sel^="lugar:"]'),
      vecina: !!panel.querySelector(`[data-sel="parada:${'los-astrologos-de-oriente'}/2"]`) };
  });
  assert.equal(r.sel, `parada:${ASTRO}/1`);
  assert.equal(r.titulo, 'Oriente');
  assert.equal(r.lugarEnTitulo, false, 'the title opens no place');
  assert.match(r.cuerpo, /La fuente no dice dónde\. Solo da el rumbo: el este\./);
  assert.match(r.cuerpo, /Parada 1 de 4 · Origen/);
  assert.match(r.cuerpo, /Zona probable: Babilonia, según Perspicacia «Este»\./);
  assert.match(r.cuerpo, /Otra zona probable: Media, según Perspicacia «Astrólogos»\./);
  assert.match(r.cuerpo, /No es lo que dice el texto\./);
  assert.equal(r.vecina, true, 'the card leads to the Jerusalén stop');
});

test('reading mode steps onto the area and the map does not move', async () => {
  const p = await open({ hash: 't=0.5&linea=normal&leer=mt-2' });
  await p.waitForSelector('#vista-lectura .pasaje-boton');
  const r = await p.evaluate(async () => {
    const { BE, map } = window.__be;
    const ps = BE.lectura.pasajes(BE.pasajeDeId('mt-2').libro, 2);
    const i = ps.findIndex((x) => x.sel === 'parada:los-astrologos-de-oriente/1');
    const j = ps.findIndex((x) => x.sel === 'parada:los-astrologos-de-oriente/4');
    // The map somewhere near, but not on Jerusalén: stepping onto the area must leave it there.
    map.jumpTo({ center: [35.6, 31.9], zoom: 8.2 });
    await new Promise((r) => setTimeout(r, 200));
    document.querySelector(`#vista-lectura [data-lectura-pasaje="${i}"]`).click();
    await new Promise((r) => setTimeout(r, 1200));
    const c = map.getCenter();
    const el = { dataset: { estado: BE.mapa.areas().find((x) => x.key === 'los-astrologos-de-oriente/1')?.estado } };
    return { i, j, n: ps.length, primera: ps[0].sel, ultima: ps.at(-1).sel, sel: `${BE.E.sel?.tipo}:${BE.E.sel?.id}`,
      centro: [+c.lng.toFixed(3), +c.lat.toFixed(3)], zoom: +map.getZoom().toFixed(2), estado: el?.dataset.estado ?? null,
      texto: document.querySelector('#vista-lectura .pasaje-item--abierto')?.textContent.replace(/\s+/g, ' ') ?? '' };
  });
  assert.equal(r.primera, 'parada:los-astrologos-de-oriente/1', 'the origin is the first passage of Mateo 2');
  assert.equal(r.j > r.i, true, JSON.stringify(r));
  assert.equal(r.sel, 'parada:los-astrologos-de-oriente/1');
  assert.deepEqual([r.centro, r.zoom], [[35.6, 31.9], 8.2], `the map stays where it was: ${JSON.stringify(r)}`);
  assert.equal(r.estado, 'abierta');
  assert.match(r.texto, /la fuente no dice dónde/);
  await p.context().close();
});

test('framing includes the guessed zone: the journey frames its stops and Babilonia at 1440 and at 430, and the area stop its zone', async () => {
  const encuadres = (p) => p.evaluate(async (ASTRO) => {
    const { BE, map, seleccionar } = window.__be;
    const quieto = () => new Promise((res) => { const t0 = performance.now(); const f = () => (!map.isMoving() && performance.now() - t0 > 300) || performance.now() - t0 > 6000 ? res() : requestAnimationFrame(f); f(); });
    const leer = () => { const b = map.getBounds(); return { zoom: +map.getZoom().toFixed(1), jerusalen: b.contains([BE.L.jerusalen.lon, BE.L.jerusalen.lat]), belen: b.contains([BE.L.belen.lon, BE.L.belen.lat]), babilonia: b.contains([46.0, 31.9]) }; };
    const desdeLejos = async (sel) => {
      seleccionar(null, { mover: false, encuadrar: false });
      map.jumpTo({ center: [12, 42], zoom: 4 });
      seleccionar(BE.parseSel(sel));
      await quieto();
      return leer();
    };
    return { viaje: await desdeLejos(`viaje:${ASTRO}`), area: await desdeLejos(`parada:${ASTRO}/1`) };
  }, ASTRO);
  const escritorio = await encuadres(page);
  assert.deepEqual(escritorio.viaje, { ...escritorio.viaje, jerusalen: true, belen: true, babilonia: true }, JSON.stringify(escritorio));
  assert.deepEqual(escritorio.area, { ...escritorio.area, jerusalen: true, babilonia: true }, JSON.stringify(escritorio));
  // Not a world view: the Mediterranean to the Gulf is about zoom 5.
  assert.ok(escritorio.viaje.zoom >= 4.5, JSON.stringify(escritorio));
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const tel = await ctx.newPage();
  await tel.route((url) => !url.href.startsWith(origin) && !url.hostname.endsWith('unpkg.com'), (route) => route.abort());
  await tel.goto(`${origin}/index.html#t=0.5`);
  await tel.waitForFunction(() => window.__be?.map?.loaded?.() && window.__be.map.getSource('be-rastro'), null, { timeout: 30000 });
  const movil = await encuadres(tel);
  assert.deepEqual(movil.viaje, { ...movil.viaje, jerusalen: true, belen: true, babilonia: true }, JSON.stringify(movil));
  await ctx.close();
});

test('a stop at a place with no point and no candidate, at either end of a journey, uses the same drawing', async () => {
  const p = await open({ prefix: '/sin-candidatos', hash: 't=0.5&linea=normal' });
  const ps = await paradas(p, 'abner-en-gabaon');
  assert.deepEqual([ps[0].lugar, ps.at(-1).lugar], ['mahanaim', 'mahanaim']);
  const antes = await areasEn(p, (ps[0].a + ps[0].b) / 2, 'viaje:abner-en-gabaon');
  const ini = antes.find((x) => x.sel === `parada:${ps[0].key}`);
  assert.deepEqual([ini?.estado, ini?.lado, ini?.anillo], ['abierta', 'llega', true], JSON.stringify(antes));
  assert.match(ini.texto, /^Mahanaim\s*sin ubicación conocida$/);
  const despues = await areasEn(p, ps.at(-1).b + 0.001, 'viaje:abner-en-gabaon');
  assert.equal(despues.find((x) => x.sel === `parada:${ps.at(-1).key}`)?.estado, 'abierta', JSON.stringify(despues));
  // With its candidates, Mahanaim has a point to draw and no area.
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
