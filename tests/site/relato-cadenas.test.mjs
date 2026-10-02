// Accounts the text tells in days or months (bead be-64b.15): site/js/trayectorias.js, loaded in node:vm with the built
// data, without a browser.
//
//  - The events that narrative_order.elapsed ties together form one block as long as the text says: Judges 19 to 21
//    takes months, not decades; the Ark is seven months among the Philistines and twenty years at Kiriath-jearim.
//  - The block stays inside the dates of its events, in the middle of the stretch the even spread gave its events, and
//    every event in it says it is estimated. Every event outside a block stays where the even spread puts it.
//  - The drawing conventions: six hours between two events of one day, one day for a step the text gives no figure
//    for, one day for the last event of a block.
//  - Without elapsed the same events spread over decades again (the control that proves the first test can fail),
//    and a block too long for its stretch falls back to exactly that spread and is reported (validate.py rejects it).
//  - A stop with an anchored date is not stretched by an event that only the order of the account places: Epaphras
//    leaves Colossae c. 59-61, not from 33. A stop with a narrative date, or one stretched by an anchored event, is not
//    cut.
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
  cerca(S.w('las-vacas-llevan-el-arca-a-bet-semes')[0] - S.w('los-filisteos-capturan-el-arca')[0], 7 * MES, 'seven months in Philistia, until the cows take it out (1Sa 6:1)');
  cerca(S.w('samuel-exhorta-a-israel-a-servir-solo-a-jehova')[0] - S.w('el-arca-queda-en-casa-de-abinadab')[0], 20, 'twenty years (1Sa 7:2)');
  const gat = S.w('jehova-castiga-a-gat-con-hemorroides');
  const consulta = S.w('los-filisteos-deciden-devolver-el-arca');
  assert.ok(gat[0] > S.w('los-filisteos-capturan-el-arca')[0] && gat[1] <= consulta[0] && consulta[1] <= S.w('las-vacas-llevan-el-arca-a-bet-semes')[0], 'Gath and the consultation fall inside the seven months');
  // Perspicacia «Samuel»: weaned perhaps at three at least. Hannah's song is of the same visit (1Sa 2:1, «Ana»).
  const entrega = S.w('ana-lleva-a-samuel-a-silo');
  assert.ok(entrega[0] - S.ev('nacimiento-de-samuel').fecha.desde >= 3, `Samuel is presented when weaned (${(entrega[0] + 1179).toFixed(2)} years after the start of his birth year)`);
  cerca(S.w('cantico-de-ana')[0] - entrega[0], DIA / 4, 'the song is the same day as the presentation');
  const ss = S.BE.estancias('grupo:el-arca-en-filistea').filter((x) => x.viaje).sort((x, y) => x.p.orden - y.p.orden);
  const filistea = ss.at(-2).b - ss[0].a;
  assert.ok(filistea < 0.7, `from Shiloh to Beth-shemesh the Ark takes ${(filistea * 12).toFixed(1)} months`);
});

test('without elapsed the same accounts spread over decades: the tests above can fail', () => {
  const S = sitio((D) => { for (const e of D.eventos) delete e.orden_relato?.elapsed; });
  const xs = enOrden(S, 'jueces-apendice');
  assert.ok(xs.at(-1).v[1] - xs[0].v[0] > 40, 'Judges 19 to 21 spreads over its fifty years again');
  assert.ok(S.w('los-filisteos-deciden-devolver-el-arca')[0] - S.w('los-filisteos-capturan-el-arca')[0] > 1, 'the seven months become years again');
});

test('a block too long for its stretch falls back to exactly the even spread, and is reported', () => {
  const S = sitio((D) => { D.eventos.find((e) => e.id === 'samuel-exhorta-a-israel-a-servir-solo-a-jehova').orden_relato.elapsed.years = 200; });
  const L = sitio((D) => { for (const e of D.eventos) if (e.orden_relato?.serie === '1-samuel') delete e.orden_relato.elapsed; });
  enOrden(S, '1-samuel');
  const roto = serie(S.D, '1-samuel').filter((e) => JSON.stringify(S.BE.ventanaEvento(e)) !== JSON.stringify(L.BE.ventanaEvento(L.ev(e.id))));
  // Only the presentation and the song (a block of their own that fits) differ from the spread without elapsed.
  assert.deepEqual(roto.map((e) => e.id), ['ana-lleva-a-samuel-a-silo', 'cantico-de-ana'], 'the Ark\'s block falls back to the spread');
  assert.deepEqual([...S.BE.bloquesSinSitio()], ['los-filisteos-derrotan-a-israel-junto-a-ebenezer'], 'the block that did not fit is reported');
  assert.deepEqual([...sitio().BE.bloquesSinSitio()], [], 'every block of the real data has its place');
  // A member with a narrower date than the stretch: the middle of the stretch would take it out of its date.
  const N = sitio((D) => Object.assign(D.eventos.find((e) => e.id === 'los-benjaminitas-se-llevan-a-las-jovenes-de-silo').fecha, { desde: -1399, hasta: -1399 }));
  enOrden(N, 'jueces-apendice');
  assert.deepEqual([...N.BE.bloquesSinSitio()], ['un-levita-va-a-belen-a-buscar-a-su-concubina'], 'a block that would take a member out of its date is reported');
});

test('a block sits in the middle of its stretch, and nothing outside a block moves', () => {
  const S = sitio(), L = sitio((D) => { for (const e of D.eventos) delete e.orden_relato?.elapsed; });
  // The stretch of the block: what the spread without elapsed gave its events.
  const xs = serie(S.D, 'jueces-apendice'), wL = xs.map((e) => L.BE.ventanaEvento(L.ev(e.id))), wS = xs.map((e) => S.BE.ventanaEvento(e));
  const antes = wS[0][0] - wL[0][0], despues = wL.at(-1)[1] - wS.at(-1)[1];
  assert.ok(antes > 20 && Math.abs(antes - despues) < 2e-3, `the same room before and after Judges 19 to 21 (${antes.toFixed(3)} and ${despues.toFixed(3)} years)`);
  // Every event that moves lies between the start of a tie (its since, or the event before) and the tied event.
  const dentro = new Set();
  for (const s of new Set(S.D.eventos.map((e) => e.orden_relato?.serie).filter(Boolean))) {
    const ys = serie(S.D, s);
    ys.forEach((e, j) => {
      const el = e.orden_relato.elapsed;
      if (!el) return;
      const i = el.since ? ys.findIndex((y) => y.id === el.since) : j - 1;
      for (let k = i; k <= j; k++) dentro.add(ys[k].id);
    });
  }
  const fuera = S.D.eventos.filter((e) => !dentro.has(e.id) && JSON.stringify(S.BE.ventanaEvento(e)) !== JSON.stringify(L.BE.ventanaEvento(L.ev(e.id))));
  assert.deepEqual(fuera.map((e) => e.id), [], 'no event outside a block moves');
});

test('the drawing conventions: six hours within a day, one day for a step with no figure, one day for the last event', () => {
  const S = sitio();
  cerca(S.w('un-anciano-de-efrain-acoge-al-levita-en-guibea')[0] - S.w('el-levita-no-quiere-pasar-la-noche-en-jebus')[0], DIA / 4, 'the same day: six hours later');
  cerca(S.w('el-levita-envia-a-israel-los-pedazos-de-su-concubina')[0] - S.w('los-hombres-de-guibea-abusan-de-la-concubina-del-levita')[0], DIA, 'no figure in the text: one day later');
  const ultimo = S.w('los-benjaminitas-se-llevan-a-las-jovenes-de-silo');
  assert.ok(ultimo[1] - ultimo[0] <= DIA && ultimo[1] - ultimo[0] > DIA - 1.1e-3, `the last event of the block lasts one day (${((ultimo[1] - ultimo[0]) / DIA).toFixed(2)} days)`);
});

test('a stop with an anchored date is not stretched by an event placed only by the account', () => {
  const S = sitio();
  const colosas = S.BE.estancias('epafras').find((s) => s.key === 'epafras-a-roma/1');
  assert.ok(colosas, 'the first stop of Epaphras exists');
  assert.ok(colosas.a >= 59 && colosas.b <= 62, `Epaphras leaves Colossae c. 59-61 (${colosas.a.toFixed(2)} to ${colosas.b.toFixed(2)})`);
  const parada = (quien, key) => { const p = S.BE.estancias(quien).find((s) => s.key === key); assert.ok(p, `${key} exists`); return p; };
  // Narrative own date: it follows its event beyond c. 1400 (Judges 1).
  const juda = parada(S.BE.duenoViaje(S.D.viajes.find((v) => v.id === 'juda-y-simeon-contra-los-cananeos')), 'juda-y-simeon-contra-los-cananeos/2');
  assert.ok(juda.b > -1390, `a stop with a narrative date keeps its event's window (${juda.b.toFixed(2)})`);
  // Stretched by an anchored event: Jehoiachin is taken in 617, with the whole of his event.
  const joaquin = S.D.viajes.find((v) => v.id === 'joaquin-llevado-a-babilonia');
  const j1 = parada(S.BE.duenoViaje(joaquin), 'joaquin-llevado-a-babilonia/1');
  assert.ok(j1.a < -615.99, `a stop stretched by an anchored event is not cut (${j1.a.toFixed(3)})`);
});
