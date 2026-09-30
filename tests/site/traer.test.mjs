// Lo guardado en la dirección anterior llega a la nueva: site/js/traer.js, direccion-anterior/puente.js y worker.js.
//
// La parte de unidad no necesita navegador: `fundir` y el Worker se prueban en Node.
//
//   node --test tests/site/traer.test.mjs
//
// El ensayo en navegador corre solo con PUENTE_NAVEGADOR=chromium|firefox|webkit y Playwright instalado (PLAYWRIGHT=<ruta
// al paquete playwright> si no está a mano). `context.route` contesta la dirección nueva desde site/ y la anterior con
// worker.js, así que el navegador ve los dos orígenes de verdad sin DNS ni certificados. Necesita site/data.json
// (python3 scripts/build.py).
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SITE_DIR = path.join(ROOT, 'site');
const ANTES = path.join(ROOT, 'direccion-anterior');
const NUEVO = 'https://biblical-atlas.geiser.cloud';
const ANTERIOR = 'https://biblical-earth.geiser.cloud';
const TERCERO = 'https://tercero.example';

// traer.js en una página que no está en la dirección nueva: no arranca nada y deja ver `fundir`.
function cargarTraer() {
  const ctx = { location: { origin: 'http://127.0.0.1:8000' } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(SITE_DIR, 'js', 'traer.js'), 'utf8'), ctx);
  return ctx.traerAnterior;
}
// worker.js con sus dos importaciones de texto cambiadas por el contenido de los ficheros, como hace wrangler.
async function cargarWorker() {
  let code = fs.readFileSync(path.join(ANTES, 'worker.js'), 'utf8');
  for (const [nombre, fichero] of [['PUENTE_HTML', 'puente.html'], ['PUENTE_JS', 'puente.js']]) {
    const linea = `import ${nombre} from './${fichero}';`;
    assert.ok(code.includes(linea), `worker.js no importa ${fichero}`);
    code = code.replace(linea, `const ${nombre} = ${JSON.stringify(fs.readFileSync(path.join(ANTES, fichero), 'utf8'))};`);
  }
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'worker-')), 'worker.mjs');
  fs.writeFileSync(tmp, code);
  return import(pathToFileURL(tmp).href);
}

const nota = (text) => ({ text, label: '', created: '2026-01-01T00:00:00.000Z', updated: '2026-01-01T00:00:00.000Z' });
const almacen = (notes, format = 'biblical-atlas-notes') => JSON.stringify({ format, version: 1, notes });
const AHORA = '2026-10-01T00:00:00.000Z';

describe('fundir: lo de aquí siempre manda', () => {
  const t = cargarTraer();
  // Los objetos vienen de otro contexto de vm: una copia en JSON los compara por su contenido.
  const fundir = (...a) => JSON.parse(JSON.stringify(t.fundir(...a)));
  const aplicar = (actual, llegado) => ({ ...actual, ...fundir(actual, llegado, AHORA) });

  test('sin nada aquí, todo lo que llega se escribe tal cual', () => {
    const llegado = { notes: almacen({ 'persona:pablo': nota('A') }), marcadores: '[{"t":1,"sel":null}]', leidos: '["hch-1"]',
      'pref:reunion': '1', ultima: 'x', 'recorrido:pedro': '3', 'notes:unreadable:2026-01-01': 'ROTO' };
    assert.deepEqual(fundir({}, llegado, AHORA), llegado);
  });
  test('las marcas del puente y de la migración nunca se copian', () => {
    assert.deepEqual(fundir({}, { migrado: '1', traido: '2026-01-01' }, AHORA), {});
  });
  test('una nota de una ficha sin nota aquí se añade y las de aquí no cambian', () => {
    const r = aplicar({ notes: almacen({ 'persona:pablo': nota('Aquí') }) }, { notes: almacen({ 'persona:pablo': nota('Aquí'), 'lugar:roma': nota('Llega') }) });
    assert.deepEqual(JSON.parse(r.notes).notes, { 'persona:pablo': nota('Aquí'), 'lugar:roma': nota('Llega') });
    assert.ok(!Object.keys(r).some((k) => k.startsWith('notes:unreadable:')));
  });
  test('una nota distinta para la misma ficha deja la de aquí y aparta entera la que llega', () => {
    const llega = almacen({ 'persona:pablo': nota('Allí'), 'lugar:roma': nota('Roma') }, 'biblical-earth-notes');   // nombre-fijo
    const r = aplicar({ notes: almacen({ 'persona:pablo': nota('Aquí') }) }, { notes: llega });
    assert.equal(JSON.parse(r.notes).notes['persona:pablo'].text, 'Aquí');
    assert.equal(JSON.parse(r.notes).notes['lugar:roma'].text, 'Roma');
    assert.equal(r[`notes:unreadable:${AHORA}`], llega);
  });
  test('unas notas que llegan sin poder leerse se apartan, y las de aquí no se tocan', () => {
    const aqui = almacen({ 'persona:pablo': nota('Aquí') });
    const r = aplicar({ notes: aqui }, { notes: '{"format":' });
    assert.equal(r.notes, aqui);
    assert.equal(r[`notes:unreadable:${AHORA}`], '{"format":');
  });
  test('marcadores y capítulos leídos se unen sin repetir', () => {
    const r = aplicar({ marcadores: '[{"t":1,"sel":"a","nombre":"x"}]', leidos: '["hch-1","hch-2"]' },
      { marcadores: '[{"t":1,"sel":"a","nombre":"otro"},{"t":2,"sel":null}]', leidos: '["hch-2","hch-3"]' });
    assert.deepEqual(JSON.parse(r.marcadores), [{ t: 1, sel: 'a', nombre: 'x' }, { t: 2, sel: null }]);
    assert.deepEqual(JSON.parse(r.leidos), ['hch-1', 'hch-2', 'hch-3']);
  });
  test('cualquier otra clave se escribe solo si aquí no existe', () => {
    assert.deepEqual(fundir({ 'pref:reunion': '0', ultima: 'aquí' }, { 'pref:reunion': '1', ultima: 'allí', 'pref:letra': '1' }, AHORA), { 'pref:letra': '1' });
  });
  test('aplicarlo dos veces no cambia nada la segunda, tampoco la copia apartada', () => {
    const llegado = { notes: almacen({ 'persona:pablo': nota('Allí'), 'lugar:roma': nota('Roma') }), marcadores: '[{"t":2,"sel":null}]', leidos: '["hch-3"]', 'pref:x': '1' };
    const una = aplicar({ notes: almacen({ 'persona:pablo': nota('Aquí') }), marcadores: '[]', leidos: '["hch-1"]' }, llegado);
    assert.deepEqual(fundir(una, llegado, '2026-10-02T00:00:00.000Z'), {});
  });
  test('una lista de aquí que no se entiende no se toca', () => {
    assert.deepEqual(fundir({ marcadores: 'roto' }, { marcadores: '[{"t":2,"sel":null}]' }, AHORA), {});
  });
});

describe('el Worker de la dirección anterior', () => {
  let w;
  before(async () => { w = await cargarWorker(); });
  test('redirige cualquier ruta con su consulta a la dirección nueva', async () => {
    for (const ruta of ['/', '/data.json', '/acerca.html?x=1&y=%C3%B1', '/stats.json']) {
      const r = w.responder(new Request(ANTERIOR + ruta));
      assert.equal(r.status, 302);
      assert.equal(r.headers.get('location'), NUEVO + ruta);
    }
  });
  test('sirve el puente con su política: solo la dirección nueva puede enmarcarlo', async () => {
    const r = w.responder(new Request(ANTERIOR + '/puente.html'));
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-security-policy'), `default-src 'none'; script-src 'self'; frame-ancestors ${NUEVO}`);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.match(await r.text(), /<script src="\/puente\.js"><\/script>/);
    const js = w.responder(new Request(ANTERIOR + '/puente.js'));
    assert.match(js.headers.get('content-type'), /javascript/);
    assert.equal(await js.text(), fs.readFileSync(path.join(ANTES, 'puente.js'), 'utf8'));
  });
  test('un POST al puente no lo sirve: redirige', () => {
    assert.equal(w.responder(new Request(ANTERIOR + '/puente.html', { method: 'POST' })).status, 302);
  });
});

// ---------------------------------------------------------------------------
// Ensayo en navegador
// ---------------------------------------------------------------------------
const MOTOR = process.env.PUENTE_NAVEGADOR || '';
describe(`ensayo en ${MOTOR || 'navegador'}`, { skip: MOTOR ? false : 'sin PUENTE_NAVEGADOR' }, () => {
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.pmtiles': 'application/octet-stream' };
  let browser, worker;
  const peticiones = [];

  before(async () => {
    const req = createRequire(import.meta.url);
    let pw = null;
    for (const t of [process.env.PLAYWRIGHT, 'playwright'].filter(Boolean)) { try { pw = req(t); break; } catch { /* siguiente */ } }
    if (!pw) throw new Error('falta playwright: PLAYWRIGHT=<ruta al paquete>');
    worker = await cargarWorker();
    browser = await pw[MOTOR].launch({ headless: true, ...(MOTOR === 'chromium' && process.env.PUENTE_CANAL ? { channel: process.env.PUENTE_CANAL } : {}) });
  });
  after(async () => { await browser?.close(); });

  async function contexto({ anteriorMudo = false } = {}) {
    const c = await browser.newContext();
    c.setDefaultTimeout(15000);
    c.on('request', (r) => peticiones.push(r.url()));
    await c.route(`${NUEVO}/**`, (route) => {
      const rel = decodeURIComponent(new URL(route.request().url()).pathname);
      const file = path.join(SITE_DIR, rel.endsWith('/') ? `${rel}index.html` : rel);
      if (!file.startsWith(SITE_DIR) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, body: fs.readFileSync(file), headers: { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' } });
    });
    await c.route(`${ANTERIOR}/**`, async (route) => {
      if (anteriorMudo) return route.abort();
      const r = worker.responder(new Request(route.request().url(), { method: route.request().method() }));
      return route.fulfill({ status: r.status, headers: Object.fromEntries(r.headers), body: Buffer.from(await r.arrayBuffer()) });
    });
    await c.route(`${TERCERO}/**`, (route) => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><title>tercero</title><body></body>' }));
    return c;
  }
  // Lee el almacenamiento aunque la página esté recargando.
  async function claves(page) {
    for (let i = 0; i < 40; i++) {
      try { return await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)]))); }
      catch { await new Promise((ok) => setTimeout(ok, 250)); }
    }
    throw new Error('no se pudo leer el almacenamiento');
  }
  async function esperar(page, cond, ms = 20000) {
    const fin = Date.now() + ms;
    while (Date.now() < fin) {
      const k = await claves(page);
      if (cond(k)) return k;
      await new Promise((ok) => setTimeout(ok, 250));
    }
    return claves(page);
  }

  const VIEJAS = {
    'biblical-earth:notes': almacen({ 'persona:pablo': nota('Nota de la dirección anterior') }, 'biblical-earth-notes'),   // nombre-fijo
    'biblical-earth:marcadores': '[{"t":50.3,"sel":"lugar:filipos","nombre":"Filipos"}]',
    'biblical-earth:leidos': '["hch-16"]',
    'biblical-earth:pref:reunion': '1',
  };

  test('lo guardado en la dirección anterior llega a la nueva, una sola vez', async () => {
    const c = await contexto();
    try {
      const semilla = await c.newPage();
      await semilla.goto(`${ANTERIOR}/puente.html`);
      await semilla.evaluate((v) => { for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, VIEJAS);
      console.log(`[${MOTOR}] en la dirección anterior:`, JSON.stringify(Object.keys(await claves(semilla))));
      await semilla.close();

      const page = await c.newPage();
      await page.goto(`${NUEVO}/#sel=persona:pablo`);
      const k = await esperar(page, (x) => x['biblical-atlas:traido'] && x['biblical-atlas:notes']);
      console.log(`[${MOTOR}] en la dirección nueva:`, JSON.stringify(Object.keys(k)));
      assert.ok(k['biblical-atlas:traido'], `sin marca de traído: ${JSON.stringify(k)}`);
      assert.equal(k['biblical-atlas:notes'], VIEJAS['biblical-earth:notes']);
      assert.equal(k['biblical-atlas:marcadores'], VIEJAS['biblical-earth:marcadores']);
      assert.equal(k['biblical-atlas:leidos'], VIEJAS['biblical-earth:leidos']);
      assert.equal(k['biblical-atlas:pref:reunion'], '1');

      await page.waitForLoadState('load');
      await page.waitForFunction(() => window.BE?.D, null, { timeout: 30000 });
      await page.waitForTimeout(1000);
      const n = peticiones.length;
      await page.reload();
      await page.waitForFunction(() => window.BE?.D, null, { timeout: 30000 });
      await page.waitForTimeout(2000);
      assert.deepEqual(peticiones.slice(n).filter((u) => u.startsWith(ANTERIOR)), [], 'una segunda carga volvió a pedir al puente');
    } finally { await c.close(); }
  });

  test('otro sitio que enmarca el puente no recibe nada', async () => {
    const c = await contexto();
    try {
      const semilla = await c.newPage();
      await semilla.goto(`${ANTERIOR}/puente.html`);
      await semilla.evaluate((v) => { for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, VIEJAS);
      await semilla.close();
      const page = await c.newPage();
      await page.goto(`${TERCERO}/`);
      const recibido = await page.evaluate(async (antes) => {
        const llegan = [];
        addEventListener('message', (e) => llegan.push(e.data));
        const f = document.createElement('iframe');
        f.src = `${antes}/puente.html`;
        document.body.appendChild(f);
        for (let i = 0; i < 12; i++) {
          await new Promise((ok) => setTimeout(ok, 250));
          try { f.contentWindow.postMessage({ puente: 1, tipo: 'pide', n: 'x' }, '*'); } catch { /* nada */ }
        }
        return llegan;
      }, ANTERIOR);
      console.log(`[${MOTOR}] mensajes recibidos por el tercero:`, JSON.stringify(recibido));
      assert.ok(!recibido.some((d) => d && d.tipo === 'datos'), `el tercero recibió datos: ${JSON.stringify(recibido)}`);
    } finally { await c.close(); }
  });

  test('un mensaje de datos de otro origen no escribe nada en el sitio', async () => {
    const c = await contexto({ anteriorMudo: true });
    try {
      const page = await c.newPage();
      await page.goto(`${TERCERO}/`);
      const [sitio] = await Promise.all([c.waitForEvent('page'), page.evaluate((nuevo) => { window.w = window.open(`${nuevo}/#sel=persona:pablo`); }, NUEVO)]);
      await sitio.waitForFunction(() => window.BE?.D, null, { timeout: 30000 });
      await page.evaluate(async (nuevo) => {
        for (let i = 0; i < 12; i++) {
          window.w.postMessage({ puente: 1, tipo: 'listo' }, nuevo);
          for (const n of ['', 'x', undefined]) window.w.postMessage({ puente: 1, tipo: 'datos', n, claves: { 'pref:intrusa': '1' } }, nuevo);
          await new Promise((ok) => setTimeout(ok, 250));
        }
      }, NUEVO);
      const k = await claves(sitio);
      assert.ok(!('biblical-atlas:pref:intrusa' in k), 'un tercero escribió en el sitio');
      assert.ok(!('biblical-atlas:traido' in k), 'un tercero marcó el traído');
    } finally { await c.close(); }
  });
});
