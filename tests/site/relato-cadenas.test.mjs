// Accounts the text tells in days or months (bead be-64b.15): site/js/trayectorias.js, loaded in node:vm with the built
// data, without a browser.
//
//  - The events that narrative_order.elapsed ties together form one block as long as the text says: Judges 19 to 21
//    takes months, not decades; the Ark is seven months among the Philistines and twenty years at Kiriath-jearim.
//  - The block stays inside the dates of its events and every event in it says it is estimated.
//  - Without elapsed the same events spread over decades again (the control that proves the first test can fail),
//    and a block too long for its dates falls back to that spread without leaving them.
//  - A stop with an anchored date is not stretched by an event that only the order of the account places: Epaphras
//    leaves Colossae c. 59-61, not from 33.
//
//   BE_DATA_FILE=site/data.json node --test tests/site/relato-cadenas.test.mjs
//
// Without BE_DATA_FILE it uses site/data.json, or builds the data into a temporary directory with python3
// scripts/build.py (needs requirements.txt). In CI (.github/workflows/validar.yml).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DIA = 1 / 365.2425, MES = (29 + 12 / 24 + 44 / 1440) * DIA;
let raw, tmp;

before(() => {
  let file = process.env.BE_DATA_FILE || path.join(ROOT, 'site/data.json');
  if (!fs.existsSync(file)) {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-relato-'));
    execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--out', tmp], { cwd: ROOT, stdio: 'pipe' });
    file = path.join(tmp, 'data.json');
  }
  raw = fs.readFileSync(file, 'utf8');
});
after(() => { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); });

/** base.js and trayectorias.js with the data, `cambio` applied to it first. Only what they touch while loading exists. */
function sitio(cambio = () => {}) {
  const nada = () => null;
  const el = new Proxy({}, { get: (t, k) => (k === 'classList' ? { add: nada, remove: nada, toggle: nada, contains: () => false } : k === 'style' ? {} : nada) });
  const document = { querySelector: nada, querySelectorAll: () => [], addEventListener: nada, documentElement: el, head: el, body: el, createElement: () => el };
  const window = { addEventListener: nada, location: { protocol: 'http:', hash: '' }, document };
  const ctx = { window, document, location: window.location, matchMedia: () => ({ matches: false, addEventListener: nada }),
    ResizeObserver: class { observe() {} }, MutationObserver: class { observe() {} },
    sessionStorage: { getItem: nada, setItem: nada, removeItem: nada }, setTimeout, clearTimeout, console };
  vm.createContext(ctx);
  for (const f of ['base.js', 'trayectorias.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'site/js', f), 'utf8'), ctx, { filename: f });
  const BE = window.BE, D = JSON.parse(raw);
  cambio(D);
  Object.assign(BE, { D, L: D.lugares || {}, PERS: D.personas || {}, avisar: nada });
  BE.P = BE.prepararParadas();
  const ev = (id) => { const e = D.eventos.find((x) => x.id === id); assert.ok(e, `the event ${id} exists`); return e; };
  return { BE, D, ev, w: (id) => BE.ventanaEvento(ev(id)) };
}
const serie = (D, s) => D.eventos.filter((e) => e.orden_relato?.serie === s).sort((a, b) => a.orden_relato.orden - b.orden_relato.orden);
const cerca = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} and ${b}`);
/** Inside its own date, in the order of the account, and estimated: what every event of a block keeps. */
function enOrden({ BE, D }, s) {
  const xs = serie(D, s).map((e) => ({ e, v: BE.ventanaEvento(e), f: BE.ventanaFecha(e.fecha) }));
  xs.forEach(({ e, v, f }, k) => {
    assert.ok(v[0] >= f[0] - 1e-9 && v[1] <= f[1] + 1e-9, `${e.id} stays inside its date`);
    if (k) assert.ok(v[0] >= xs[k - 1].v[0], `${e.id} does not start before ${xs[k - 1].e.id}`);
  });
  return xs;
}

test('Judges 19 to 21 is one block of months, with the days and months the text gives', () => {
  const S = sitio();
  const xs = enOrden(S, 'jueces-apendice');
  const span = xs.at(-1).v[1] - xs[0].v[0];
  assert.ok(span < 0.5, `the Levite, the war and the 600 take ${(span * 12).toFixed(1)} months, not decades`);
  assert.ok(xs.every(({ e }) => S.BE.eventoEstimado(e)), 'every event of the block says it is estimated');
  cerca(S.w('el-levita-no-quiere-pasar-la-noche-en-jebus')[0] - S.w('un-levita-va-a-belen-a-buscar-a-su-concubina')[0], 4 * DIA, 'he leaves Bethlehem on the fifth day (Jdg 19:8)');
  cerca(S.w('israel-pierde-la-segunda-batalla-contra-benjamin')[0] - S.w('israel-pierde-la-primera-batalla-contra-benjamin')[0], DIA, 'the second battle is the next day (Jdg 20:24)');
  cerca(S.w('israel-vence-a-benjamin-y-quema-guibea')[0] - S.w('israel-pierde-la-segunda-batalla-contra-benjamin')[0], DIA, 'the victory is the third day (Jdg 20:30)');
  cerca(S.w('israel-ofrece-la-paz-a-los-benjaminitas-del-penasco-de-rimon')[0] - S.w('los-600-benjaminitas-se-refugian-en-el-penasco-de-rimon')[0], 4 * MES, 'four months on the crag (Jdg 20:47)');
  // Its journeys follow it: the Levite's journey lasts days, the war and the 600 a few months.
  const dura = (id) => { const ss = S.BE.estancias(`grupo:${id}`); return Math.max(...ss.map((s) => s.b)) - Math.min(...ss.map((s) => s.a)); };
  assert.ok(dura('el-levita-y-su-concubina') < 30 * DIA, `the Levite's journey takes ${(dura('el-levita-y-su-concubina') / DIA).toFixed(1)} days`);
  assert.ok(dura('israel-contra-benjamin') < 0.5 && dura('los-600-benjaminitas') < 0.5, 'the war and the 600 take months');
});

test('the Ark is seven months among the Philistines and twenty years at Kiriath-jearim', () => {
  const S = sitio();
  enOrden(S, '1-samuel');
  cerca(S.w('los-filisteos-deciden-devolver-el-arca')[0] - S.w('los-filisteos-capturan-el-arca')[0], 7 * MES, 'seven months (1Sa 6:1)');
  cerca(S.w('samuel-exhorta-a-israel-a-servir-solo-a-jehova')[0] - S.w('el-arca-queda-en-casa-de-abinadab')[0], 20, 'twenty years (1Sa 7:2)');
  const gat = S.w('jehova-castiga-a-gat-con-hemorroides');
  assert.ok(gat[0] > S.w('los-filisteos-capturan-el-arca')[0] && gat[1] < S.w('los-filisteos-deciden-devolver-el-arca')[0], 'Gath falls inside the seven months');
  const ss = S.BE.estancias('grupo:el-arca-en-filistea');
  const filistea = ss.at(-2).b - ss[0].a;
  assert.ok(filistea < 0.7, `from Shiloh to Beth-shemesh the Ark takes ${(filistea * 12).toFixed(1)} months`);
});

test('without elapsed the same accounts spread over decades: the tests above can fail', () => {
  const S = sitio((D) => { for (const e of D.eventos) delete e.orden_relato?.elapsed; });
  const xs = enOrden(S, 'jueces-apendice');
  assert.ok(xs.at(-1).v[1] - xs[0].v[0] > 40, 'Judges 19 to 21 spreads over its fifty years again');
  assert.ok(S.w('los-filisteos-deciden-devolver-el-arca')[0] - S.w('los-filisteos-capturan-el-arca')[0] > 1, 'the seven months become years again');
});

test('a block too long for its dates falls back to the even spread and never leaves them', () => {
  const S = sitio((D) => { D.eventos.find((e) => e.id === 'samuel-exhorta-a-israel-a-servir-solo-a-jehova').orden_relato.elapsed.years = 200; });
  enOrden(S, '1-samuel');
  const d = S.w('samuel-exhorta-a-israel-a-servir-solo-a-jehova')[0] - S.w('el-arca-queda-en-casa-de-abinadab')[0];
  assert.ok(d < 60, `no event is pushed out of its date (${d.toFixed(1)} years)`);
});

test('a stop with an anchored date is not stretched by an event placed only by the account', () => {
  const S = sitio();
  const colosas = S.BE.estancias('epafras').find((s) => s.key === 'epafras-a-roma/1');
  assert.ok(colosas, 'the first stop of Epaphras exists');
  assert.ok(colosas.a >= 59 && colosas.b <= 62, `Epaphras leaves Colossae c. 59-61 (${colosas.a.toFixed(2)} to ${colosas.b.toFixed(2)})`);
});
