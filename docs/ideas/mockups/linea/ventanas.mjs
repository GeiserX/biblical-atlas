#!/usr/bin/env node
// Saca del sitio real las ventanas de tiempo que calcula el navegador y las escribe en ventanas.json.
// Sin dependencias npm: Chrome del sistema por el protocolo DevTools, como kit/render.mjs.
//
//   node docs/ideas/mockups/linea/ventanas.mjs                          sirve site/ en un puerto libre
//   node docs/ideas/mockups/linea/ventanas.mjs --url http://127.0.0.1:8000/   usa un servidor ya en marcha
//
// Necesita site/data.json (python3 scripts/build.py). Después: python3 docs/ideas/mockups/linea/extract.py
// Por qué hace falta el navegador: la ventana de un suceso sale de trayectorias.js (paradas de los viajes, reparto por
// el orden del relato, meses hebreos por lunas medias) y la de un periodo abierto, de la potencia vecina. Aquí se
// leen tal cual las da el sitio, sin copiar esa lógica.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../..');
const SITE = path.join(ROOT, 'site');
const OUT = path.join(HERE, 'ventanas.json');
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };

const argUrl = process.argv.indexOf('--url');
let url = argUrl > 0 ? process.argv[argUrl + 1] : null;
let srv = null;
if (!url) {
  if (!fs.existsSync(path.join(SITE, 'data.json'))) { console.error('Falta site/data.json: python3 scripts/build.py'); process.exit(1); }
  srv = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const p = path.join(SITE, rel === '/' ? 'index.html' : rel);
    if (!p.startsWith(SITE) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${srv.address().port}/`;
}

// Lo que corre dentro de la página: solo lee BE, nunca cambia el estado del sitio salvo abrir el menú de carriles.
async function dump() {
  const BE = window.BE, D = BE.D;
  const r6 = (x) => (x == null ? null : Math.round(x * 1e6) / 1e6);
  const win = (v) => (v ? [r6(v[0]), r6(v[1])] : null);
  const events = D.eventos.map((e) => ({ id: e.id, w: win(BE.ventanaEvento(e)), base: win(BE.ventanaFecha(e.fecha)), estimated: !!BE.eventoEstimado(e) }));
  const letters = D.cartas.map((c) => ({ id: c.id, w: win(BE.ventanaCarta(c)), year: win(BE.tramo(c.fecha)) }));
  const periods = D.periodos.map((p) => { const t = BE.tramoPeriodo(p); return { id: p.id, w: win(t), open: t?.abierto || null }; });
  const travelers = [...new Set(D.viajes.map((v) => v.persona || 'pablo'))];
  const stops = [];
  for (const who of travelers) {
    for (const s of BE.estancias(who).filter((x) => x.viaje)) {
      stops.push({ key: s.key, person: who, journey: s.viaje.id, order: s.p.orden, place: s.lugar.id, w: win([s.a, s.b]),
        narrative: !!s.narrativa, band: s.banda ? win(s.banda) : null });
    }
  }
  const journeys = D.viajes.map((v) => {
    const ss = stops.filter((s) => s.journey === v.id);
    return { id: v.id, w: ss.length ? [Math.min(...ss.map((s) => s.w[0])), Math.max(...ss.map((s) => s.w[1]))] : win(BE.tramo(v.fecha)) };
  });
  // Reinos: la misma regla que reinos() en site/js/linea.js (capitales compartidas; un reinado suelto se une al que
  // empieza cuando él acaba). Se comprueba abajo contra los carriles que enseña el menú.
  const reyes = D.periodos.filter((p) => p.tipo === 'rey');
  const padre = reyes.map((_, i) => i);
  const raiz = (i) => (padre[i] === i ? i : (padre[i] = raiz(padre[i])));
  const porLugar = new Map();
  reyes.forEach((p, i) => (p.lugares || []).forEach((l) => { if (porLugar.has(l)) padre[raiz(i)] = raiz(porLugar.get(l)); else porLugar.set(l, i); }));
  const grupos = new Map();
  reyes.forEach((p, i) => { const r = raiz(i); if (!grupos.has(r)) grupos.set(r, []); grupos.get(r).push(p); });
  const lista = [...grupos.values()];
  for (const g of lista.filter((x) => x.length === 1)) {
    const tr = BE.tramo(g[0].fecha);
    const otro = tr && lista.find((x) => x !== g && x.length > 1 && x.some((p) => { const t2 = BE.tramo(p.fecha); return t2 && Math.abs(t2[0] - (tr[1] - 1)) <= 1; }));
    if (otro) { otro.push(g[0]); g.length = 0; }
  }
  const kingLane = {};
  for (const ps of lista.filter((g) => g.length)) {
    const cuenta = new Map();
    for (const p of ps) for (const l of new Set(p.lugares || [])) cuenta.set(l, (cuenta.get(l) || 0) + 1);
    const orden = [...cuenta.entries()].filter(([l]) => BE.L[l]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const k = orden[0]?.[0] || '';
    for (const p of ps) kingLane[p.id] = k ? `reyes-${k}` : 'reyes';
  }
  // Carriles de hoy, con su nombre, tal como los lista el menú de la línea.
  document.querySelector('#linea-menu-boton').click();
  await new Promise((r) => setTimeout(r, 300));
  const lanes = [...document.querySelectorAll('#linea-menu .menu-carril[data-fijar]')].map((b, i) => ({ id: b.dataset.fijar, name: b.querySelector('span').textContent.trim(), order: i }));
  document.querySelector('#linea-menu-boton').click();
  // Meses hebreos de cada año con algo de menos de un año, y el anterior y el siguiente.
  const years = new Set();
  for (const w of [...events, ...letters, ...periods, ...stops, ...journeys].map((x) => x.w).filter(Boolean)) {
    if (w[1] - w[0] < 1) for (let y = Math.floor(w[0]) - 1; y <= Math.floor(w[1]) + 1; y++) years.add(y);
  }
  const hebrewYears = [...years].sort((a, b) => a - b).map((y) => {
    const A = BE.anioHebreo(y);
    return { year: y, months: A.meses.map((m) => { const n = BE.nombreMes(m.mes, y); return [m.mes.id, n.nombre, r6(m.a), r6(m.b), n.anacronico]; }) };
  });
  return { events, letters, periods, stops, journeys, kingLane, lanes, hebrewYears, day: BE.DIA, lunarMonth: BE.MES_LUNAR, tMin: BE.T_MIN, tMax: BE.T_MAX };
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'be-ventanas-'));
const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run',
  '--no-default-browser-check', '--disable-background-networking', '--mute-audio', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const finish = (code) => { try { proc.kill('SIGKILL'); } catch {} srv?.close(); setTimeout(() => { fs.rmSync(dir, { recursive: true, force: true }); process.exit(code); }, 300); };
try {
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(() => reject(new Error('Chrome no arrancó en 60 s')), 60000);
    proc.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(timer); proc.stderr.resume(); resolve(m[1]); } });
    proc.on('exit', (c) => { clearTimeout(timer); reject(new Error(`Chrome terminó con código ${c}`)); });
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
    else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const mid = ++id; pending.set(mid, { res, rej }); ws.send(JSON.stringify({ id: mid, method, params, sessionId })); });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s('Runtime.enable');
  await s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await s('Page.navigate', { url: `${url}index.html` });
  const t0 = Date.now();
  for (;;) {
    const r = await s('Runtime.evaluate', { expression: '!!(window.BE && window.BE.D && document.querySelector("#linea-menu-boton"))', returnByValue: true });
    if (r.result.value) break;
    if (Date.now() - t0 > 30000) throw new Error('El sitio no cargó BE.D en 30 s');
    await new Promise((r2) => setTimeout(r2, 250));
  }
  const r = await s('Runtime.evaluate', { expression: `(${dump.toString()})()`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  const out = r.result.value;
  const menuKings = out.lanes.filter((l) => l.id.startsWith('reyes')).map((l) => l.id).sort();
  const ours = [...new Set(Object.values(out.kingLane))].sort();
  if (JSON.stringify(menuKings) !== JSON.stringify(ours)) throw new Error(`Los reinos no coinciden con el menú: ${menuKings} / ${ours}`);
  if (errors.length) throw new Error(`Errores en la consola del sitio:\n${errors.join('\n')}`);
  fs.writeFileSync(OUT, `${JSON.stringify(out)}\n`);
  console.log(`${path.relative(ROOT, OUT)}: ${out.events.length} sucesos, ${out.periods.length} periodos, ${out.letters.length} cartas, ${out.journeys.length} viajes, ${out.stops.length} paradas, ${out.lanes.length} carriles, ${out.hebrewYears.length} años hebreos`);
  finish(0);
} catch (e) {
  console.error(e.message);
  finish(1);
}
