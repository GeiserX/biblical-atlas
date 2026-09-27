#!/usr/bin/env node
// Renderiza maquetas HTML a PNG con el Google Chrome del sistema (protocolo DevTools).
// Sin dependencias npm: usa http, fs, child_process y el WebSocket global de Node >= 22.
//
//   node docs/ideas/mockups/kit/render.mjs 00-kit-demo 01-otra      -> docs/ideas/img/<nombre>.png
//   node docs/ideas/mockups/kit/render.mjs --mobile 05-movil        -> 430x932 a escala 2
//   node docs/ideas/mockups/kit/render.mjs --size 1440x900 --scale 2 --full nombre
//
// Opciones:
//   --size WxH     tamaño CSS de la ventana (por defecto 1600x1000, o el <meta name="mockup-size">)
//   --scale N      factor de escala del dispositivo (por defecto 2)
//   --mobile       atajo de 430x932 con emulación táctil
//   --full         captura toda la altura de la página, no sólo la ventana
//   --out DIR      carpeta de salida (por defecto docs/ideas/img)
//   --max-kb N     tamaño máximo del PNG antes de comprimir con paleta (por defecto 1500)
//   --no-compress  deja el PNG tal cual sale de Chrome
//   --setup        sólo prepara el venv de libimagequant (fuera del repo) y sale
//
// Una maqueta puede fijar su tamaño en el <head>:
//   <meta name="mockup-size" content="430x932">   <meta name="mockup-scale" content="3">
//   <meta name="mockup-mobile" content="true">    <meta name="mockup-full" content="true">
// Si la página define window.MOCKUP_READY = false, el render espera a que pase a true (máx. 10 s).

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const KIT = path.dirname(fileURLToPath(import.meta.url));
const MOCKUPS = path.dirname(KIT);            // docs/ideas/mockups
const IDEAS = path.dirname(MOCKUPS);          // docs/ideas (raíz del servidor)
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.geojson': 'application/json' };

function parseArgs(argv) {
  const o = { names: [], out: path.join(IDEAS, 'img'), maxKb: 1500, compress: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--size') { const [w, h] = argv[++i].split('x').map(Number); o.size = { w, h }; }
    else if (a === '--scale') o.scale = Number(argv[++i]);
    else if (a === '--mobile') o.mobile = true;
    else if (a === '--full') o.full = true;
    else if (a === '--out') o.out = path.resolve(argv[++i]);
    else if (a === '--max-kb') o.maxKb = Number(argv[++i]);
    else if (a === '--no-compress') o.compress = false;
    else if (a === '--setup') o.setup = true;
    else if (a === '-h' || a === '--help') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 23).join('\n')); process.exit(0); }
    else o.names.push(a);
  }
  if (!o.names.length && !o.setup) { console.error('Uso: node render.mjs [opciones] <nombre> [<nombre> ...]'); process.exit(2); }
  return o;
}

// Resuelve "00-kit-demo" -> docs/ideas/mockups/src/00-kit-demo.html; acepta también rutas .html.
function resolvePage(name) {
  const file = name.endsWith('.html') ? path.resolve(name) : path.join(MOCKUPS, 'src', `${name}.html`);
  if (!fs.existsSync(file)) throw new Error(`No existe la maqueta: ${file}`);
  const inside = !path.relative(IDEAS, file).startsWith('..');
  const root = inside ? IDEAS : path.dirname(file);
  return { file, root, base: path.basename(file, '.html') };
}

function serve(root, log) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const p = path.join(root, rel);
      if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
        if (rel !== '/favicon.ico') log.push(`404 ${rel}`); res.writeHead(404); return res.end();
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(p).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

async function launchChrome() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'be-render-'));
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none',
    '--disable-background-networking', '--mute-audio', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  // No añadir --disable-extensions: en equipos con extensiones impuestas por política, Chrome muere al arrancar (SIGKILL).
  // Chrome anuncia el puerto en stderr ("DevTools listening on ws://..."); en equipos cargados tarda varios segundos.
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(() => reject(new Error('Chrome no arrancó en 60 s')), 60000);
    proc.stderr.on('data', (d) => {
      buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(timer); proc.stderr.removeAllListeners('data'); proc.stderr.resume(); resolve(m[1]); }
    });
    proc.on('exit', (c) => { clearTimeout(timer); reject(new Error(`Chrome terminó con código ${c}`)); });
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map(); const listeners = new Set();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
    else for (const l of listeners) l(m);
  };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const mid = ++id; pending.set(mid, { res, rej }); ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  });
  const close = () => { try { ws.close(); } catch {} proc.kill('SIGKILL'); setTimeout(() => fs.rmSync(dir, { recursive: true, force: true }), 300); };
  return { send, listeners, close };
}

function metaOf(html, name) {
  const m = html.match(new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']+)["']`, 'i'));
  return m ? m[1] : null;
}

async function renderOne(chrome, opts, name) {
  const page = resolvePage(name);
  const html = fs.readFileSync(page.file, 'utf8');
  const log = [];
  const srv = await serve(page.root, log);
  const mobile = opts.mobile || metaOf(html, 'mockup-mobile') === 'true';
  const metaSize = metaOf(html, 'mockup-size');
  const size = opts.size || (metaSize ? { w: +metaSize.split('x')[0], h: +metaSize.split('x')[1] } : mobile ? { w: 430, h: 932 } : { w: 1600, h: 1000 });
  const scale = opts.scale || Number(metaOf(html, 'mockup-scale')) || 2;
  const full = opts.full || metaOf(html, 'mockup-full') === 'true';
  const url = `http://127.0.0.1:${srv.address().port}/${path.relative(page.root, page.file).split(path.sep).join('/')}`;

  const { targetId } = await chrome.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await chrome.send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => chrome.send(m, p, sessionId);
  const onMsg = (m) => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') log.push(`JS: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) log.push(`console.${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description).join(' ')}`);
  };
  chrome.listeners.add(onMsg);
  await s('Page.enable'); await s('Runtime.enable');
  // Sin <meta name="viewport">, la emulación móvil maqueta a 980 px de ancho y todo sale diminuto:
  // en ese caso se emula sólo el tamaño de pantalla y el toque, con el ancho real.
  const hasViewport = /<meta\s+name=["']viewport["']/i.test(html);
  await s('Emulation.setDeviceMetricsOverride', { width: size.w, height: size.h, deviceScaleFactor: scale, mobile: mobile && hasViewport });
  if (mobile) await s('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const loaded = new Promise((r) => { const f = (m) => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') { chrome.listeners.delete(f); r(); } }; chrome.listeners.add(f); });
  await s('Page.navigate', { url });
  await Promise.race([loaded, new Promise((r) => setTimeout(r, 15000))]);
  await s('Runtime.evaluate', { awaitPromise: true, expression: `(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })));
    const t0 = Date.now();
    while (window.MOCKUP_READY === false && Date.now() - t0 < 10000) await new Promise((r) => setTimeout(r, 50));
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  })()` });
  let clip;
  if (full) {
    const { result } = await s('Runtime.evaluate', { expression: 'JSON.stringify([document.documentElement.scrollWidth, document.documentElement.scrollHeight])', returnByValue: true });
    const [w, h] = JSON.parse(result.value); clip = { x: 0, y: 0, width: w, height: h, scale: 1 };
  }
  const shot = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!full, ...(clip ? { clip } : {}) });
  chrome.listeners.delete(onMsg);
  await chrome.send('Target.closeTarget', { targetId });
  srv.close();

  fs.mkdirSync(opts.out, { recursive: true });
  const out = path.join(opts.out, `${page.base}.png`);
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  const before = fs.statSync(out).size;
  const dims = opts.compress ? compress(out, opts.maxKb) : null;
  const after = fs.statSync(out).size;
  if (dims && dims !== `${size.w * scale}x${size.h * scale}`) log.push(`reducida a ${dims} px para quedar por debajo de ${opts.maxKb} KB`);
  for (const l of log) console.warn(`  [${page.base}] ${l}`);
  console.log(`${path.relative(process.cwd(), out)}  ${size.w}x${size.h}@${scale}x  ${(before / 1024) | 0} KB -> ${(after / 1024) | 0} KB`);
}

// Compresión: primero PNG sin pérdida al máximo. Si sigue por encima del límite, paleta de 256 colores
// con libimagequant (kit/quantize.py), que no deja manchas en degradados suaves; si hace falta, reduce
// la resolución lo justo. libimagequant vive en un venv fuera del repo que se crea solo la primera vez
// (o con --setup). Sin Python ni red, usa la paleta de ImageMagick, que sí puede dejar manchas en el mar.
const VENV = process.env.BE_VENV || path.join(os.tmpdir(), 'biblical-earth-imagequant');
const VPY = path.join(VENV, 'bin', 'python');
const READY = path.join(VENV, '.listo');

function sleepSync(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }

function ensureQuantizer() {
  if (fs.existsSync(READY)) return true;
  const lock = `${VENV}.lock`;
  try { fs.mkdirSync(lock); } catch (e) {
    if (e.code !== 'EEXIST') { console.warn(`  No se puede crear ${VENV}; se usará la paleta de ImageMagick.`); return false; }
    // Otro render lo está creando: espera hasta 3 min.
    for (let i = 0; i < 360 && !fs.existsSync(READY) && fs.existsSync(lock); i++) sleepSync(500);
    return fs.existsSync(READY);
  }
  try {
    console.log(`Preparando libimagequant en ${VENV} (sólo la primera vez)...`);
    fs.rmSync(VENV, { recursive: true, force: true });
    const ok = spawnSync('python3', ['-m', 'venv', VENV], { stdio: 'ignore' }).status === 0
      && spawnSync(VPY, ['-m', 'pip', 'install', '-q', '--disable-pip-version-check', 'imagequant', 'pillow'], { stdio: 'ignore' }).status === 0;
    if (ok) fs.writeFileSync(READY, '');
    else console.warn('  No se pudo instalar imagequant; se usará la paleta de ImageMagick.');
    return ok;
  } finally { fs.rmSync(lock, { recursive: true, force: true }); }
}

function compress(file, maxKb) {
  const tmp = `${file}.tmp.png`;
  const run = (args) => spawnSync('magick', args, { stdio: 'ignore' }).status === 0;
  const size = (f) => fs.statSync(f).size / 1024;
  if (run([file, '-strip', '-define', 'png:compression-level=9', '-define', 'png:compression-filter=5', tmp]) && size(tmp) < size(file)) fs.renameSync(tmp, file);
  if (fs.existsSync(tmp)) fs.rmSync(tmp);
  if (size(file) <= maxKb) return;
  if (ensureQuantizer()) {
    const r = spawnSync(VPY, [path.join(KIT, 'quantize.py'), file, String(maxKb)], { encoding: 'utf8' });
    if (r.status === 0) {
      return r.stdout.trim().split(' ')[1];   // ancho x alto final (menor que el original si tuvo que reducir)
    }
    console.warn(`  quantize.py falló: ${r.stderr.trim().split('\n').pop()}`);
  }
  for (const colors of [256, 192]) {
    if (size(file) <= maxKb) break;
    if (run([file, '-strip', '-dither', 'FloydSteinberg', '-colors', String(colors), '-define', 'png:compression-level=9', `PNG8:${tmp}`])) fs.renameSync(tmp, file);
  }
  if (fs.existsSync(tmp)) fs.rmSync(tmp);
}

const opts = parseArgs(process.argv.slice(2));
if (opts.setup) { const ok = ensureQuantizer(); console.log(ok ? `libimagequant listo en ${VENV}` : 'No se pudo preparar libimagequant'); process.exit(ok ? 0 : 1); }
const chrome = await launchChrome();
let failed = 0;
try {
  for (const n of opts.names) {
    try { await renderOne(chrome, opts, n); } catch (e) { failed++; console.error(`ERROR ${n}: ${e.message}`); }
  }
} finally { chrome.close(); }
process.exit(failed ? 1 : 0);
