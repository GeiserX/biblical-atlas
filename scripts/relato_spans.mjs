// How long each account lasts on the timeline (bead be-64b.15): for every run of events of one narrative_order series
// that share one undated range, and for every journey, the years it takes, worst first. Runs the site's own placement
// (site/js/base.js and trayectorias.js in node:vm) on the built data, without a browser.
//
//   node scripts/relato_spans.mjs [data.json] [--top N] [--dump positions.json] [--compare before.json after.json]
//
// data.json defaults to site/data.json (python3 scripts/build.py writes it). Columns: kind (series run or journey), years
// on the timeline, events or stops, chapters, first and last passage, id, the date as the data writes it.
// --dump writes where every event, letter, journey stop and person's stay falls, rounded to 1e-6 years; --compare lists
// what moved between two dumps and exits 1 if anything did.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ANCHOR_MAX = 40 / 365.2425;   // trayectorias.js: a window this short is an anchor, not part of a run

function load(file) {
  const nothing = () => null;
  const el = new Proxy({}, { get: (t, k) => (k === 'classList' ? { add: nothing, remove: nothing, toggle: nothing, contains: () => false } : k === 'style' ? {} : nothing) });
  const document = { querySelector: nothing, querySelectorAll: () => [], addEventListener: nothing, documentElement: el, head: el, body: el, createElement: () => el };
  const window = { addEventListener: nothing, location: { protocol: 'http:', hash: '' }, document };
  const ctx = { window, document, location: window.location, matchMedia: () => ({ matches: false, addEventListener: nothing }),
    ResizeObserver: class { observe() {} }, MutationObserver: class { observe() {} },
    sessionStorage: { getItem: nothing, setItem: nothing, removeItem: nothing }, setTimeout, clearTimeout, console };
  vm.createContext(ctx);
  for (const f of ['base.js', 'trayectorias.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'site/js', f), 'utf8'), ctx, { filename: f });
  const BE = window.BE, D = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(BE, { D, L: D.lugares || {}, PERS: D.personas || {}, avisar: nothing });
  BE.P = BE.prepararParadas();
  return BE;
}

function compare(a, b) {
  const [A, B] = [a, b].map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  let n = 0;
  for (const k of ['events', 'letters', 'stops', 'stays']) {
    for (const id of new Set([...Object.keys(A[k] || {}), ...Object.keys(B[k] || {})])) {
      const x = A[k]?.[id], y = B[k]?.[id];
      if (JSON.stringify(x) === JSON.stringify(y)) continue;
      n++;
      const f = (w) => (w ? w.map((t) => t.toFixed(3)).join('..') : '-');
      console.log(`${k}\t${id}\t${f(x)}\t${f(y)}`);
    }
  }
  console.error(`${n} moved`);
  return n;
}

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i < 0 ? null : args.splice(i, 2)[1]; };
const cmp = args.indexOf('--compare');
if (cmp >= 0) process.exit(compare(args[cmp + 1], args[cmp + 2]) ? 1 : 0);
const top = +(opt('--top') || 40), dump = opt('--dump');
const BE = load(args[0] || path.join(ROOT, 'site/data.json'));
const D = BE.D;
const r6 = (x) => Math.round(x * 1e6) / 1e6;

const owners = new Set(D.viajes.map(BE.duenoViaje));
const stops = new Map();
for (const p of owners) for (const s of BE.estancias(p)) if (s.viaje) { if (!stops.has(s.viaje.id)) stops.set(s.viaje.id, []); stops.get(s.viaje.id).push(s); }
if (dump) {
  const out = { events: {}, letters: {}, stops: {}, stays: {} };
  for (const e of D.eventos) out.events[e.id] = BE.ventanaEvento(e)?.map(r6) || null;
  for (const c of D.cartas || []) out.letters[c.id] = BE.ventanaCarta(c)?.map(r6) || null;
  for (const ss of stops.values()) for (const s of ss) out.stops[s.key] = [r6(s.a), r6(s.b)];
  // A person's stays: the copies of events and relations that place them (journey stops are already above).
  for (const p of Object.keys(D.personas || {})) for (const s of BE.estancias(p)) if (!s.viaje) out.stays[`${p} ${s.key}`] = [r6(s.a), r6(s.b)];
  fs.writeFileSync(dump, JSON.stringify(out));
}

const chapter = (p) => (String(p || '').match(/^((?:[123]\s?)?\S+)\s+(\d+)/) || []).slice(1).join(' ');
const rows = [];
const series = new Map();
D.eventos.forEach((e, i) => { const s = e.orden_relato?.serie; if (s) { if (!series.has(s)) series.set(s, []); series.get(s).push({ e, i }); } });
for (const [name, xs] of series) {
  xs.sort((x, y) => x.e.orden_relato.orden - y.e.orden_relato.orden || x.i - y.i);
  let run = [];
  const close = () => {
    if (run.length >= 2) {
      const ws = run.map((x) => BE.ventanaEvento(x.e));
      const chs = [...new Set(run.map((x) => chapter((x.e.pasajes || [])[0])))];
      rows.push({ kind: 'series', years: Math.max(...ws.map((w) => w[1])) - Math.min(...ws.map((w) => w[0])), n: run.length, chapters: chs.length,
        passages: `${chs[0]}-${chs.at(-1)}`, id: `${name}: ${run[0].e.id} ... ${run.at(-1).e.id}`, date: run[0].e.fecha.texto });
    }
    run = [];
  };
  for (const x of xs) {
    const f = x.e.fecha || {}, w = BE.ventanaFecha(f), key = `${f.desde}|${f.hasta}|${JSON.stringify(f.detalle || null)}`;
    if (!w || w[1] - w[0] <= ANCHOR_MAX) { close(); continue; }
    if (run.length && run[0].key !== key) close();
    x.key = key;
    run.push(x);
  }
  close();
}
for (const [id, ss] of stops) {
  rows.push({ kind: 'journey', years: Math.max(...ss.map((s) => s.b)) - Math.min(...ss.map((s) => s.a)), n: ss.length, chapters: '',
    passages: ss[0].viaje.referencia, id, date: ss[0].viaje.fecha?.texto });
}
rows.sort((x, y) => y.years - x.years);
for (const r of rows.slice(0, top)) console.log([r.kind, r.years.toFixed(2), r.n, r.chapters, r.passages, r.id, r.date].join('\t'));
