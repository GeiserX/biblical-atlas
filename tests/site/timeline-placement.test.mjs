// Where the timeline places events and people (bead be-64b.10), tested in a real headless browser through what the
// site exposes on window.BE and through the flag of the timeline cursor.
//
//  - Every event of Acts that one of its travellers lives at a stop of his journeys is placed while he is at that stop,
//    not on the road between two stops (the six events of Philippi, the Areopagus, Elymas, the visit to Cephas).
//  - A stop the data gives as one moment is stretched to hold its events by days, not months, and the stretched part
//    is shown as estimated.
//  - Nobody is placed after his death, except by an event that names him (a burial, the risen Jesus), and Jesus is
//    nowhere after the ascension.
//  - The events of each series (orden_relato) come in the order of the account, and an event with «tras» comes after
//    its target, measured on the window where the target was placed.
//  - A second person with journeys takes only the events that land on his stops, and a «tras» that points at an event
//    left with its whole year moves only its own event (both on data changed in a temporary copy).
//  - An event whose window is its own date is not «estimated»; one placed in a part of its exact year is.
//  - Outside Acts, events and letters fall where the code before this change put them, except the changes listed in
//    EXPECTED_CHANGES. This one is a record of this change only: it runs the code of REFERENCE_REV on today's data,
//    and that code reads the data keys in Spanish. Delete it or pin it again when the schema migration renames them.
//    It skips itself, with a message, where git does not have REFERENCE_REV (a shallow clone, a source archive).
//  - During the baptism of Lydia the flag says Paul is in Philippi, on a desktop and on a phone.
//
// Run from the repository root, one browser at a time:
//   node --test --test-concurrency=1 tests/site/timeline-*.test.mjs
// Needs python3 with requirements.txt (the data is built into a temporary directory), git for the record test, and
// playwright-core with a Chromium: either importable, or PLAYWRIGHT_MODULE_DIR=<a node_modules directory that holds
// it>. CHROME_PATH picks another Chromium binary.
// BE_ROOT=<a checkout> tests that checkout's data and site instead of this one (the control).
// These tests read the keys of the compiled data.json (orden_relato, personas, fecha, viajes, paradas), which stay in
// Spanish after the schema migration (`compiled` in scripts/migration/map.yaml); they never read data/ directly.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.BE_ROOT ? path.resolve(process.env.BE_ROOT) : path.resolve(HERE, '../..');
// The last main commit before this change; its site/js/trayectorias.js is the reference for the placements outside Acts.
const REFERENCE_REV = process.env.BE_REFERENCE_REV || 'c150bd3';
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true };

// Events and letters outside Acts that this change moves, and why. 1: a «tras» of the same series bounded the whole
// group with the raw date of its target, so the group did not fit and fell back to its dates. 2: Paul was drawn on
// the road while they happened at a stop of one moment. 3: the window differed from the event's own date only by the
// cut at its end, so it no longer counts as moved by the account (it keeps its date and is not «estimated»). 4: it names
// Paul but `presentes` leaves him out (events of Romans and 1 and 2 Corinthians merged after this change), so his stops
// no longer place it: it keeps its date or follows its series and its «tras». 5: its «tras» points at one of those and
// it now starts where that one ends.
const EXPECTED_CHANGES = {
  'evento:creacion-de-eva': 1, 'evento:pecado-de-adan-y-eva': 1, 'evento:juicio-en-eden': 1, 'evento:expulsion-del-eden': 1,
  'evento:nacimiento-de-cain': 1, 'evento:ofrendas-de-cain-y-abel': 1, 'evento:cain-mata-a-abel': 1, 'evento:cain-edifica-enoc': 1,
  'evento:poema-de-lamec': 1, 'evento:nacimiento-de-set': 1, 'evento:nacimiento-de-noe': 1,
  'evento:angeles-toman-esposas': 1, 'evento:dios-fija-120-anos': 1,
  'evento:nemrod-funda-su-reino-en-sinar': 1, 'evento:noe-sale-del-arca': 1, 'evento:pacto-con-noe': 1,
  'evento:noe-maldice-a-canaan': 1, 'evento:torre-de-babel': 1, 'evento:nemrod-edifica-en-asiria': 1,
  'evento:anuncio-a-maria': 1, 'evento:maria-visita-a-elisabet': 1,
  'evento:nacimiento-de-juan-el-bautista': 1, 'evento:jose-lleva-a-maria-a-su-casa': 1, 'evento:envio-de-los-setenta': 1,
  'evento:buen-samaritano-y-casa-de-marta': 1, 'evento:en-casa-de-marta-y-maria': 1, 'evento:oracion-modelo-y-amigo-insistente': 1,
  'evento:dedo-de-dios-y-senal-de-jonas': 1, 'evento:come-con-un-fariseo': 1, 'evento:rico-insensato-y-mayordomo-fiel': 1,
  'evento:mujer-encorvada-y-grano-de-mostaza': 1,
  'evento:tito-trae-noticias-de-corinto': 2, 'evento:segundo-encierro-en-roma': 2, 'carta:2-corintios': 2, 'carta:2-timoteo': 2,
  'evento:muere-isaac': 3, 'evento:hombres-de-ezequias-copian-proverbios-de-salomon': 3, 'evento:joel-anuncia-el-dia-de-jehova': 3,
  'evento:colecta-de-macedonia-y-acaya': 4, 'evento:pablo-escribe-una-carta-perdida-a-corinto': 4,
  'evento:pablo-manda-expulsar-al-inmoral-de-corinto': 4,
  'evento:pablo-predica-en-troas-y-no-encuentra-a-tito': 2, 'evento:pablo-escribe-2-corintios': 2,
  'evento:pablo-pide-perdonar-al-expulsado-de-corinto': 4, 'evento:tito-vuelve-a-corinto-con-dos-hermanos': 4,
  'evento:los-corintios-expulsan-al-inmoral': 5,
};
// Deaths named by the id of their event, not by the rule of the code: the person dies in that event.
const DEATHS = {
  'muerte-de-adan': 'adan', 'muerte-de-abrahan': 'abrahan', 'muere-isaac': 'isaac', 'muerte-de-jacob': 'jacob',
  'muerte-de-jose': 'jose-hijo-de-jacob', 'muere-raquel-al-dar-a-luz-a-benjamin': 'raquel', 'muerte-de-moises': 'moises',
  'muerte-de-josue': 'josue-hijo-de-nun', 'muerte-de-josias': 'josias', 'muerte-de-juan-el-bautista': 'juan-el-bautista',
  'muerte-de-judas': 'judas-iscariote', 'muerte-de-jesus': 'jesus', 'muerte-de-ananias-y-safira': 'ananias-de-jerusalen',
  'muerte-de-esteban': 'esteban', 'muerte-de-santiago-hijo-de-zebedeo': 'santiago-hijo-de-zebedeo',
  'muerte-de-herodes-agripa-i': 'herodes-agripa-i', 'muerte-del-apostol-juan': 'juan-apostol',
};
// A journey of Peter in 36 that is not in the data, to test the code with a second person with journeys.
const PETER_JOURNEY = {
  id: 'viaje-de-prueba-de-pedro', nombre: 'Viaje de prueba', persona: 'pedro', referencia: 'Hch 9:32',
  fecha: { desde: 36, hasta: 36, precision: 'año', aprox: true, tipo: 'anclada', cronologia: 'tnm', texto: 'c. 36 e.c.' },
  paradas: ['jerusalen', 'lida', 'jope', 'cesarea', 'jerusalen'].map((lugar, i) => ({ orden: i + 1, lugar, referencia: 'Hch 9:32',
    fecha: { desde: 36, hasta: 36, precision: 'año', aprox: true, tipo: 'anclada', cronologia: 'tnm', texto: 'c. 36 e.c.' }, fuentes: [], estado: 'verificado' })),
};

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
/** Serves the site with the built data. Under /<variant>/ the same site runs with that variant's data directory and, if
    it has one, its own trayectorias.js (the reference code). */
const variants = {};
function serve(siteDir, dataDir) {
  const server = http.createServer((req, res) => {
    let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const name = url.split('/')[1];
    const v = variants[name];
    if (v) url = url.slice(name.length + 1);
    const rel = url === '/' ? 'index.html' : url.slice(1);
    if (v?.code && rel === 'js/trayectorias.js') {
      res.writeHead(200, { 'content-type': 'text/javascript' }).end(v.code);
      return;
    }
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
  fs.writeFileSync(path.join(dir, 'data.js'), `window.BIBLICAL_EARTH_DATA = ${JSON.stringify(D)};\n`);
  variants[name] = { data: dir };
}

let browser, server, origin, tmp, page;
const errors = [];
async function open(prefix = '', hash = '', opts = DESKTOP) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...opts });
  const p = await context.newPage();
  p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver Message|ReadPixels/.test(m.text())) errors.push(`console: ${m.text()}`); });
  await p.goto(`${origin}${prefix}/index.html${hash ? `#${hash}` : ''}`);
  await p.waitForFunction(() => window.BE && window.BE.D && Array.isArray(window.BE.P) && window.BE.P.length, null, { timeout: 20000 });
  return p;
}
before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-timeline-placement-'));
  execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--out', tmp], { cwd: ROOT, stdio: 'pipe' });
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

test('every event of Acts lived at a stop of a journey is placed while the traveller is at that stop', async () => {
  const r = await page.evaluate(() => {
    const BE = window.BE;
    const years = (f) => (f && (f.desde ?? f.hasta) != null ? [f.desde ?? f.hasta, (f.hasta ?? f.desde) + 1] : null);
    const travellers = new Set(BE.D.viajes.map((v) => v.persona || 'pablo'));
    const checked = [], wrong = [];
    for (const e of BE.D.eventos) {
      if (!(e.pasajes || []).some((p) => /^\s*Hch\b/.test(p))) continue;
      const who = (e.personas || []).find((p) => travellers.has(p) && (!e.presentes || e.presentes.includes(p)));
      const te = years(e.fecha);
      if (!who || !te) continue;
      // «Has a stop»: a stop of his journeys at one of the places of the event whose own years meet the event's years.
      const stops = BE.D.viajes.filter((v) => (v.persona || 'pablo') === who).flatMap((v) => v.paradas);
      if (!stops.some((s) => (e.lugares || []).includes(s.lugar) && years(s.fecha) && years(s.fecha)[0] < te[1] && te[0] < years(s.fecha)[1])) continue;
      checked.push(e.id);
      const v = BE.ventanaEvento(e);
      for (const k of [0.001, 0.25, 0.5, 0.75, 0.999]) {
        const t = v[0] + (v[1] - v[0]) * k, w = BE.donde(who, t);
        if (!w || !w.parada || !(e.lugares || []).includes(w.en.lugar.id)) {
          wrong.push(`${e.id} at ${t.toFixed(3)}: ${w ? `${w.parada ? 'en' : 'hacia'} ${(w.parada ? w.en : w.sig).lugar.id}` : 'nowhere'}`);
          break;
        }
      }
    }
    return { checked: checked.length, wrong };
  });
  assert.ok(r.checked >= 50, `the events of Acts with a stop exist (${r.checked})`);
  assert.deepEqual(r.wrong, [], `${r.wrong.length} of ${r.checked} events of Acts place their traveller away from the stop`);
});

test('a stop the data gives as one moment is stretched by days, not months, and the stretched part is estimated', async () => {
  const r = await page.evaluate(() => {
    const BE = window.BE, day = 1 / 365.2425, long = [], certain = [];
    let moments = 0, stretched = 0;
    for (const s of BE.P) {
      const f = s.p.fecha || {};
      // «c. 36 e.c.»: one year and no season, so one moment; the data says nothing of how long he stayed.
      if (s.narrativa || f.desde == null || f.desde !== (f.hasta ?? f.desde) || !/^c\. \d+ e\.c\.$/.test(f.texto || '')) continue;
      moments++;
      if (s.b - s.a > 31 * day) long.push(`${s.key} ${s.lugar.id} «${f.texto}» [${s.a.toFixed(3)}, ${s.b.toFixed(3)}]`);
      if (s.b - s.a < 2e-3) continue;
      stretched++;
      for (const t of [s.a + 1e-4, s.b - 1e-4]) {
        const w = BE.dondeEsta(t);
        if (w?.en === s && w.parada && !w.estimada) certain.push(`${s.key} at ${t.toFixed(4)}`);
      }
    }
    // Acts 9:30: they take him down to Caesarea and send him to Tarsus; he passes through, he does not stay for months.
    const cesarea = BE.P.find((s) => s.key === 'primeros-anos-de-pablo/6');
    return { long, certain, moments, stretched, cesarea: cesarea && cesarea.b - cesarea.a };
  });
  assert.ok(r.moments >= 20 && r.stretched >= 5, `stops of one moment exist (${r.moments}) and some are stretched to hold their events (${r.stretched})`);
  assert.deepEqual(r.long, [], 'no stop of one moment lasts more than a month');
  assert.deepEqual(r.certain, [], 'where a stop of one moment is stretched, the position is estimated');
  assert.ok(r.cesarea != null && r.cesarea < 0.1, `Caesarea in Acts 9:30 lasts ${(r.cesarea * 365.2425).toFixed(1)} days`);
});

test('nobody is placed after his death except by an event that names him, and Jesus is nowhere after the ascension', async () => {
  const r = await page.evaluate((deaths) => {
    const BE = window.BE;
    const wrong = [];
    let checked = 0;
    for (const [eventId, id] of Object.entries(deaths)) {
      const death = BE.D.eventos.find((e) => e.id === eventId);
      const end = death && BE.ventanaEvento(death)?.[1];
      if (end == null || !BE.estancias(id).length) continue;
      checked++;
      for (let t = end + 0.0005; t < end + 3; t += 0.004) {
        const w = BE.donde(id, t);
        if (!w) continue;
        const stays = w.parada && !w.entre ? [w.en] : [w.en, w.sig];
        // On the road to an event that names him (the burial of Jacob) the event places him; a stay of his life does not.
        const from = w.parada ? stays : [w.sig];
        if (from.some((s) => s.origen !== 'evento')) {
          wrong.push(`${id} at ${t.toFixed(3)}, after ${eventId} (${end.toFixed(3)}): ${w.parada ? 'en' : 'hacia'} ${(w.parada ? w.en : w.sig).lugar.id} from ${stays.map((s) => s.key).join(', ')}`);
          break;
        }
      }
    }
    const up = BE.ventanaEvento(BE.D.eventos.find((e) => e.id === 'ascension-de-jesus'));
    const jesus = [];
    for (let t = up[1] + 0.0005; t < up[1] + 5; t += 0.002) {
      const w = BE.donde('jesus', t);
      if (w) { jesus.push(`${t.toFixed(4)} ${w.parada ? 'en' : 'hacia'} ${(w.parada ? w.en : w.sig).lugar.id} (${w.en.key})`); break; }
    }
    return { wrong, jesus, checked };
  }, DEATHS);
  assert.ok(r.checked >= 10, `people with a dated death were checked (${r.checked})`);
  assert.deepEqual(r.wrong, [], 'after his death only an event that names him places a person');
  assert.deepEqual(r.jesus, [], 'nothing places Jesus after the ascension');
});

test('the events of each series come in the order of the account, and «tras» is read on the placed window of its target', async () => {
  const r = await page.evaluate(() => {
    const BE = window.BE;
    const travellers = new Set(BE.D.viajes.map((v) => v.persona || 'pablo'));
    const share = (a, b) => (a.personas || []).some((p) => (b.personas || []).includes(p));
    const onJourney = (e) => (e.personas || []).some((p) => travellers.has(p));
    const series = new Map();
    BE.D.eventos.forEach((e, i) => {
      const o = e.orden_relato;
      if (!o) return;
      if (!series.has(o.serie)) series.set(o.serie, []);
      series.get(o.serie).push({ e, i, v: BE.ventanaEvento(e), f: BE.ventanaFecha(e.fecha) });
    });
    const wrong = [], shifted = [];
    let pairs = 0, shared = 0;
    for (const [name, xs] of series) {
      xs.sort((x, y) => x.e.orden_relato.orden - y.e.orden_relato.orden || x.i - y.i);
      for (let i = 0; i < xs.length; i++) {
        for (let j = i + 1; j < xs.length; j++) {
          const a = xs[i], b = xs[j];
          if (!a.v || !b.v || !a.f || !b.f || a.e.orden_relato.orden === b.e.orden_relato.orden) continue;
          if (!(a.f[0] < b.f[1])) continue;   // their own dates put the later one first: the account looks back
          // The account of a traveller and the account of people who do not travel with him are two threads that run at
          // the same time (Philip in Samaria while Saul is converted): the order binds them only where they share someone.
          if ((onJourney(a.e) || onJourney(b.e)) && !share(a.e, b.e)) continue;
          pairs++;
          // A window says the event happens somewhere inside it: the order is broken if the later event is over before
          // the earlier one can begin.
          if (b.v[1] <= a.v[0] + 1e-6) wrong.push(`${name}: ${b.e.id} [${b.v.map((x) => x.toFixed(3))}] ends before ${a.e.id} [${a.v.map((x) => x.toFixed(3))}] starts`);
          // Between events that share a person, the later one also does not start earlier nor end earlier, unless one
          // window holds the other (a whole stay in Caesarea holds each event of it).
          if (!share(a.e, b.e)) continue;
          shared++;
          const nested = (a.v[0] <= b.v[0] + 1e-9 && b.v[1] <= a.v[1] + 1e-9) || (b.v[0] <= a.v[0] + 1e-9 && a.v[1] <= b.v[1] + 1e-9);
          if (!nested && (b.v[0] < a.v[0] - 1e-6 || b.v[1] < a.v[1] - 1e-6)) shifted.push(`${name}: ${b.e.id} [${b.v.map((x) => x.toFixed(3))}] starts or ends before ${a.e.id} [${a.v.map((x) => x.toFixed(3))}]`);
        }
      }
    }
    const tras = [];
    let trasChecked = 0;
    for (const e of BE.D.eventos.filter((x) => x.orden_relato?.tras)) {
      const t = BE.D.eventos.find((x) => x.id === e.orden_relato.tras);
      const v = BE.ventanaEvento(e), w = t && BE.ventanaEvento(t);
      if (!v || !w) continue;
      trasChecked++;
      if (v[0] < w[0] - 1e-9 || v[1] < w[1] - 1e-9) tras.push(`${e.id} [${v.map((x) => x.toFixed(4))}] is not after ${t.id} [${w.map((x) => x.toFixed(4))}]`);
    }
    return { pairs, shared, wrong, shifted, tras, trasChecked };
  });
  assert.ok(r.pairs > 1000 && r.shared > 1000, `pairs of events in the account were compared (${r.pairs}, ${r.shared} sharing a person)`);
  assert.deepEqual(r.wrong, [], `${r.wrong.length} pairs of events are out of the order of the account`);
  assert.deepEqual(r.shifted, [], `${r.shifted.length} pairs of events that share a person start or end out of order`);
  assert.ok(r.trasChecked >= 8, `events with «tras» were compared (${r.trasChecked})`);
  assert.deepEqual(r.tras, [], 'every event with «tras» comes after its target');
});

test('a second person with journeys takes only the events that land on his stops', async () => {
  const collect = () => {
    const BE = window.BE, own = {}, placed = {};
    for (const e of BE.D.eventos) { own[e.id] = BE.ventanaFecha(e.fecha); placed[e.id] = BE.ventanaEvento(e); }
    const mid = (id) => { const w = placed[id]; return w && (w[0] + w[1]) / 2; };
    const at = (who, id) => { const w = BE.donde(who, mid(id)); return w?.parada ? w.en.lugar.id : null; };
    return { own, placed, paul: BE.P.map((s) => `${s.key} ${s.a.toFixed(6)} ${s.b.toFixed(6)}`),
      peter: { lida: at('pedro', 'pedro-sana-a-eneas'), jope: at('pedro', 'pedro-resucita-a-dorcas') } };
  };
  variant('peter', (D) => D.viajes.push(PETER_JOURNEY));
  const before = await page.evaluate(collect);
  const p = await open('/peter');
  const after = await p.evaluate(collect);
  await p.context().close();
  const same = (x, y) => x && y && Math.abs(x[0] - y[0]) < 1e-9 && Math.abs(x[1] - y[1]) < 1e-9;
  const fellBack = Object.keys(after.placed).filter((id) => !same(before.placed[id], before.own[id]) && same(after.placed[id], after.own[id]));
  assert.deepEqual(fellBack, [], 'no event falls back to its whole date because someone else has journeys');
  assert.deepEqual(after.paul, before.paul, 'the stops of Paul do not move');
  assert.deepEqual(after.peter, { lida: 'lida', jope: 'jope' }, 'the healing of Aeneas and the raising of Dorcas land on the stops of Peter');
});

test('a «tras» that points at an event left with its whole year moves only its own event', async () => {
  const collect = () => Object.fromEntries(window.BE.D.eventos.map((e) => [e.id, window.BE.ventanaEvento(e)]));
  // The appearance to James (A7) is left with its whole year at the place 125 it had in the account before 1 Corintios
  // moved it to 133, inside its year: both variants give it 125 again, and only the second adds the «tras».
  const whole = (D) => {
    const t = D.eventos.find((x) => x.id === 'aparicion-a-santiago');
    assert.ok(t && D.eventos.some((x) => x.id === 'manda-esperar-en-jerusalen'), 'the meeting of Acts 1:4 and the appearance to James exist');
    t.orden_relato.orden = 125;
  };
  variant('tras-base', whole);
  variant('tras', (D) => { whole(D); D.eventos.find((x) => x.id === 'manda-esperar-en-jerusalen').orden_relato.tras = 'aparicion-a-santiago'; });
  const base = await open('/tras-base');
  const before = await base.evaluate(collect);
  await base.context().close();
  const p = await open('/tras');
  const after = await p.evaluate(collect);
  await p.context().close();
  const target = after['aparicion-a-santiago'], meeting = after['manda-esperar-en-jerusalen'];
  assert.ok(target[1] - target[0] > 0.9, `the target keeps its whole year in this data (${target.map((x) => x.toFixed(4))})`);
  assert.ok(before['manda-esperar-en-jerusalen'][1] < target[1], 'without «tras» the meeting ends before its target: the «tras» has work to do');
  assert.ok(meeting[0] >= target[0] - 1e-9 && meeting[1] >= target[1] - 1e-9, `the event with «tras» comes after its target (${meeting.map((x) => x.toFixed(4))})`);
  const moved = Object.keys(after).filter((id) => id !== 'manda-esperar-en-jerusalen' && JSON.stringify(after[id]) !== JSON.stringify(before[id]));
  assert.deepEqual(moved, [], 'the rest of the series stays where it was');
});

test('outside Acts, events and letters fall where the code before this change put them, except the listed changes', async (t) => {
  let code;
  try {
    code = execFileSync('git', ['-C', HERE, 'show', `${REFERENCE_REV}:site/js/trayectorias.js`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    t.skip(`git has no ${REFERENCE_REV} here (a shallow clone or a source archive): the record of this change cannot run`);
    return;
  }
  variants.ref = { data: tmp, code };
  const collect = () => {
    const BE = window.BE;
    const out = {};
    for (const e of BE.D.eventos) {
      if ((e.pasajes || []).some((p) => /^\s*Hch\b/.test(p))) continue;
      out[`evento:${e.id}`] = BE.ventanaEvento(e);
    }
    for (const c of BE.D.cartas) out[`carta:${c.id}`] = BE.ventanaCarta(c);
    return out;
  };
  const now = await page.evaluate(collect);
  const refPage = await open('/ref');
  const before = await refPage.evaluate(collect);
  await refPage.context().close();
  const moved = Object.keys(now).filter((k) => {
    const a = before[k], b = now[k];
    if (!a || !b) return !!a !== !!b;
    return Math.abs(a[0] - b[0]) > 1e-9 || Math.abs(a[1] - b[1]) > 1e-9;
  }).sort();
  assert.ok(Object.keys(now).length > 300, 'events and letters outside Acts exist');
  assert.deepEqual(moved, Object.keys(EXPECTED_CHANGES).sort(), 'exactly the listed events and letters move');
});

test('an event whose window is its own date but for the cut at the end is not «estimated»; one placed inside its year is', async () => {
  // Five events of Genesis with an exact year share that year with their neighbours in the account, as 101 of the 108
  // events with an exact year in a series already did on main: the part of the year is ours, so it says «estimated»,
  // and it never leaves the year the data gives.
  const shared = ['nacimiento-de-set', 'nacimiento-de-noe', 'dios-fija-120-anos', 'noe-sale-del-arca', 'pacto-con-noe'];
  const r = await page.evaluate((ids) => ids.map((id) => {
    const BE = window.BE, e = BE.D.eventos.find((x) => x.id === id);
    if (!e) return `${id} missing`;
    const w = BE.ventanaEvento(e), own = BE.ventanaFecha(e.fecha);
    const inside = w[0] >= own[0] - 1e-9 && w[1] <= own[1] + 1e-9;
    return `${id} ${BE.eventoEstimado(e)}${inside ? '' : ` outside its date ${w.map((x) => x.toFixed(4))}`}`;
  }), ['dios-toma-a-enoc', 'muere-isaac', ...shared]);
  assert.deepEqual(r, ['dios-toma-a-enoc false', 'muere-isaac false', ...shared.map((id) => `${id} true`)]);
});

test('during the baptism of Lydia the flag says Paul is in Philippi, on a desktop and on a phone', async () => {
  const w = await page.evaluate(() => window.BE.ventanaEvento(window.BE.D.eventos.find((e) => e.id === 'lidia-se-bautiza')));
  assert.ok(w, 'the baptism of Lydia exists');
  assert.ok(w[1] - w[0] < 0.5, `the baptism is placed inside the year, not over all of it (${w.map((x) => x.toFixed(4))})`);
  // The start, the middle and the end of its window: all of it is in Philippi, not only the middle of the year.
  const moments = [w[0] + 2e-4, (w[0] + w[1]) / 2, w[1] - 2e-4].map((x) => x.toFixed(4));
  for (const opts of [DESKTOP, PHONE]) {
    for (const t of moments) {
      const p = await open('', `t=${t}`, opts);
      await p.waitForFunction(() => document.querySelector('#pista')?.getAttribute('aria-valuetext'), null, { timeout: 10000 });
      const flag = await p.getAttribute('#pista', 'aria-valuetext');
      assert.match(flag, /Pablo en Filipos/, `${opts.viewport.width} px at ${t}: the flag says «${flag}»`);
      await p.context().close();
    }
  }
  assert.deepEqual(errors, [], 'no page error or console error while the pages loaded');
});
