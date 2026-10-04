// The rules behind «Atrás» and «Adelante» (site/js/visit-history.js, BE.visitHistory), loaded in node:vm without a
// browser: the number and name each history entry carries, the names this tab keeps per visit, whether there is
// anything behind or ahead, the buttons' labels, the name of each view and the tab's title.
//
//   node --test tests/site/visit-history.test.mjs
//
// No browser, no data: it runs anywhere, and in CI (.github/workflows/validar.yml).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync(new URL('../../site/js/visit-history.js', import.meta.url), 'utf8');
const window = { BE: {} };
vm.runInNewContext(code, { window });
const H = window.BE.visitHistory;
// Objects made inside the vm have another Object.prototype: compare plain copies.
const plain = (x) => JSON.parse(JSON.stringify(x));

test('the file loads without a document and publishes its rules', () => {
  assert.ok(H, 'BE.visitHistory is missing');
  for (const k of ['isEntry', 'isFrame', 'withFrame', 'withMark', 'begin', 'push', 'rename', 'arrive', 'cutForward', 'around', 'buttonLabel', 'viewName', 'distinctName', 'pageTitle']) assert.equal(typeof H[k], 'function', k);
});

test('only our own state counts as an entry', () => {
  assert.equal(H.isEntry({ visit: 'a', step: 0, name: 'x' }), true);
  for (const s of [null, undefined, 'x', {}, { visit: 'a' }, { visit: '', step: 0 }, { visit: 'a', step: -1 }, { visit: 'a', step: 1.5 }]) assert.equal(H.isEntry(s), false, JSON.stringify(s));
});

test('a page load without our state starts a visit at step 0, with nothing behind or ahead', () => {
  const r = H.begin(null, [], 'v1', 'la portada');
  assert.deepEqual(plain(r.state), { visit: 'v1', step: 0, name: 'la portada' });
  assert.deepEqual(plain(r.visits), [['v1', ['la portada']]]);
  const a = H.around(r.state, r.visits);
  assert.deepEqual(plain(a), { back: { can: false, name: null }, forward: { can: false, name: null } });
});

test('each new entry gets the next step and cuts what was ahead', () => {
  let { state, visits } = H.begin(null, [], 'v1', 'El mapa en c. 50 e.c.');
  ({ state, visits } = H.push(state, visits));                  // the copy carries the old name until it is renamed
  assert.deepEqual(plain(state), { visit: 'v1', step: 1, name: 'El mapa en c. 50 e.c.' });
  ({ state, visits } = H.rename(state, visits, 'Pablo'));
  ({ state, visits } = H.push(state, visits));
  ({ state, visits } = H.rename(state, visits, 'Samotracia'));
  assert.deepEqual(plain(visits), [['v1', ['El mapa en c. 50 e.c.', 'Pablo', 'Samotracia']]]);
  assert.deepEqual(plain(H.around(state, visits)), { back: { can: true, name: 'Pablo' }, forward: { can: false, name: null } });
  // Back twice: the browser hands us the state of step 0; Forward is possible and says where.
  const at0 = H.arrive(state, { visit: 'v1', step: 0, name: 'El mapa en c. 50 e.c.' }, visits, 'v2');
  assert.equal(at0.fresh, false);
  assert.deepEqual(plain(H.around(at0.state, at0.visits)), { back: { can: false, name: null }, forward: { can: true, name: 'Pablo' } });
  // A new entry from step 0 drops Pablo and Samotracia, as the browser does.
  let n = H.push(at0.state, at0.visits);
  n = H.rename(n.state, n.visits, 'Corinto');
  assert.deepEqual(plain(n.visits), [['v1', ['El mapa en c. 50 e.c.', 'Corinto']]]);
  assert.equal(H.around(n.state, n.visits).forward.can, false);
});

test('Back and Forward never grow the list: arriving at our own entry only reads it', () => {
  let { state, visits } = H.begin(null, [], 'v1', 'A');
  for (const x of ['B', 'C', 'D']) { ({ state, visits } = H.push(state, visits)); ({ state, visits } = H.rename(state, visits, x)); }
  const before = plain(visits);
  let s = state;
  for (const step of [2, 1, 0, 1, 2, 3, 2]) {
    const r = H.arrive(s, { visit: 'v1', step, name: 'ABCD'[step] }, visits, 'v9');
    assert.equal(r.fresh, false);
    visits = r.visits; s = r.state;
    assert.deepEqual(plain(visits), before, `after arriving at ${step}`);
  }
  assert.deepEqual(plain(H.around(s, visits)), { back: { can: true, name: 'B' }, forward: { can: true, name: 'D' } });
});

test('a link with a «#» or a typed address: the browser makes an entry without state, right after ours', () => {
  let { state, visits } = H.begin(null, [], 'v1', 'A');
  ({ state, visits } = H.push(state, visits)); ({ state, visits } = H.rename(state, visits, 'B'));
  ({ state, visits } = H.push(state, visits)); ({ state, visits } = H.rename(state, visits, 'C'));
  const back = H.arrive(state, { visit: 'v1', step: 1, name: 'B' }, visits, 'v2');   // Back to B
  const r = H.arrive(back.state, null, back.visits, 'v2', 'Pedro');                 // then the hash link
  assert.equal(r.fresh, true);
  assert.deepEqual(plain(r.state), { visit: 'v1', step: 2, name: 'Pedro' });
  assert.deepEqual(plain(r.visits), [['v1', ['A', 'B', 'Pedro']]]);
  // Without a previous entry of ours (it cannot happen after begin, but never throw): a visit starts.
  const lone = H.arrive(null, null, [], 'v3', 'Pedro');
  assert.deepEqual(plain(lone.state), { visit: 'v3', step: 0, name: 'Pedro' });
});

test('a stateless entry reached by going back or forth is not a new one: a visit starts there', () => {
  // A tab open before the buttons existed: its entries have no state. After a reload the last one has step 0; going back
  // onto the one before must not count up, or the labels point the wrong way.
  let { state, visits } = H.begin(null, [], 'v1', 'Samotracia');
  const r = H.arrive(state, null, visits, 'v2', 'Corinto', true);
  assert.equal(r.fresh, true);
  assert.deepEqual(plain(r.state), { visit: 'v2', step: 0, name: 'Corinto' });
  assert.deepEqual(plain(H.around(r.state, r.visits)), { back: { can: false, name: null }, forward: { can: false, name: null } });
  // The same arrival as a new entry (a «#» link) still takes the next number.
  assert.equal(H.arrive(state, null, visits, 'v2', 'Corinto', false).state.step, 1);
  // Our own state wins over the flag.
  ({ state, visits } = H.push(state, visits));
  assert.deepEqual(plain(H.arrive(state, { visit: 'v1', step: 0, name: 'Samotracia' }, visits, 'v3', null, true).state), { visit: 'v1', step: 0, name: 'Samotracia' });
});

test('a reload keeps the visit and its step; a shared link opened fresh starts another, and both lists survive', () => {
  let { state, visits } = H.begin(null, [], 'v1', 'A');
  ({ state, visits } = H.push(state, visits)); ({ state, visits } = H.rename(state, visits, 'B'));
  const reload = H.begin(state, visits, 'nuevo', 'B');
  assert.deepEqual(plain(reload.state), { visit: 'v1', step: 1, name: 'B' });
  assert.deepEqual(plain(H.around(reload.state, reload.visits).back), { can: true, name: 'A' });
  const fresh = H.begin(null, reload.visits, 'v2', 'Pedro');
  assert.deepEqual(plain(fresh.visits.map((v) => v[0])), ['v1', 'v2']);
  assert.equal(H.around(fresh.state, fresh.visits).back.can, false);
  // Back into the first page of the tab again: its names are still there.
  const again = H.begin({ visit: 'v1', step: 1, name: 'B' }, fresh.visits, 'v3');
  assert.deepEqual(plain(H.around(again.state, again.visits).back), { can: true, name: 'A' });
  // Our state with no names kept (storage cleared): the step still says whether there is something behind.
  const lost = H.begin({ visit: 'v7', step: 3, name: 'Corinto' }, [], 'v8');
  assert.deepEqual(plain(H.around(lost.state, lost.visits)), { back: { can: true, name: null }, forward: { can: false, name: null } });
});

test('only the newest visits of the tab are kept, and unreadable storage counts as none', () => {
  let visits = [];
  for (let i = 0; i < H.MAX_VISITS + 3; i++) visits = H.begin(null, visits, `v${i}`, 'x').visits;
  assert.equal(visits.length, H.MAX_VISITS);
  assert.equal(visits[0][0], 'v3');
  for (const bad of [null, 'x', {}, [1, 2], [['a', 'b']]]) assert.deepEqual(plain(H.begin(null, bad, 'v1', 'A').visits), [['v1', ['A']]]);
});

test('leaving by a link drops what was ahead, so coming back offers no stale Forward', () => {
  let { state, visits } = H.begin(null, [], 'v1', 'A');
  for (const x of ['B', 'C']) { ({ state, visits } = H.push(state, visits)); ({ state, visits } = H.rename(state, visits, x)); }
  const atA = H.arrive(state, { visit: 'v1', step: 0, name: 'A' }, visits, 'v2');
  assert.equal(H.around(atA.state, atA.visits).forward.can, true);
  const cut = H.cutForward(atA.state, atA.visits);
  assert.deepEqual(plain(cut), [['v1', ['A']]]);
  assert.equal(H.around(atA.state, cut).forward.can, false);
});

test('the buttons say where they go, and say so when there is nowhere', () => {
  assert.equal(H.buttonLabel('back', { can: true, name: 'Samotracia' }), 'Atrás: Samotracia');
  assert.equal(H.buttonLabel('forward', { can: true, name: 'Neápolis' }), 'Adelante: Neápolis');
  assert.equal(H.buttonLabel('back', { can: true, name: 'la portada' }), 'Atrás: la portada');
  assert.equal(H.buttonLabel('back', { can: false, name: 'x' }), 'No hay nada atrás');
  assert.equal(H.buttonLabel('forward', { can: false, name: null }), 'No hay nada adelante');
  assert.equal(H.buttonLabel('back', { can: true, name: null }), 'Atrás: la vista anterior');
  assert.equal(H.buttonLabel('forward', { can: true, name: null }), 'Adelante: la vista siguiente');
});

test('each view is named by what it shows, the most specific first', () => {
  const date = 'c. 50 e.c.';
  assert.equal(H.viewName({ landing: true, selection: 'Pablo', date }), 'la portada');
  assert.equal(H.viewName({ reading: { chapter: 'Hechos 16', passage: 3 }, selection: 'Pablo', date }), 'Lectura de Hechos 16, pasaje 3');
  assert.equal(H.viewName({ reading: { chapter: 'Hechos 16' }, date }), 'Lectura de Hechos 16');
  assert.equal(H.viewName({ tour: { name: 'De Babilonia a Jerusalén', stop: 4 }, selection: 'De Babilonia a Jerusalén', date }), 'De Babilonia a Jerusalén, parada 4');
  assert.equal(H.viewName({ connection: ['Loida', 'Pablo'], date }), 'Conexión entre Loida y Pablo');
  assert.equal(H.viewName({ connection: ['Abrahán', 'Isaac'], date }), 'Conexión entre Abrahán e Isaac');
  assert.equal(H.viewName({ connection: ['David', 'Hiram'], date }), 'Conexión entre David e Hiram');
  assert.equal(H.viewName({ connection: ['Pablo', 'Hierápolis'], date }), 'Conexión entre Pablo y Hierápolis');
  assert.equal(H.viewName({ connection: ['Pablo', 'Iconio'], date }), 'Conexión entre Pablo e Iconio');
  assert.equal(H.viewName({ connection: ['Loida', null], date }), 'Conexión desde Loida');
  assert.equal(H.viewName({ connection: [null, null], date }), 'Conexión entre dos');
  assert.equal(H.viewName({ graph: 'Pablo', selection: 'Pablo', date }), 'Grafo de Pablo');
  // The graph covers the map: it names the view over the tour or the reading open behind it.
  assert.equal(H.viewName({ graph: 'Las cartas de Pablo', tour: { name: 'Las cartas de Pablo', stop: 2 }, reading: { chapter: 'Hechos 16' }, date }), 'Grafo de Las cartas de Pablo');
  assert.equal(H.viewName({ connection: ['Loida', 'Pablo'], reading: { chapter: 'Hechos 16' }, date }), 'Conexión entre Loida y Pablo');
  assert.equal(H.viewName({ graph: '', date }), 'Grafo de personas');
  assert.equal(H.viewName({ sync: 'Corinto', date }), 'Sincronía de Corinto');
  assert.equal(H.viewName({ sync: '', date }), 'Sincronía');
  assert.equal(H.viewName({ now: true, date }), 'Ahora mismo en c. 50 e.c.');
  // «Ahora mismo» and the sincronía are opened over a reading or a tour: they name the view.
  assert.equal(H.viewName({ now: true, reading: { chapter: 'Hechos 1' }, date }), 'Ahora mismo en c. 50 e.c.');
  assert.equal(H.viewName({ sync: 'Corinto', reading: { chapter: 'Hechos 1' }, tour: { name: 'X', stop: 1 }, date }), 'Sincronía de Corinto');
  assert.equal(H.viewName({ selection: 'Samotracia', date }), 'Samotracia');
  assert.equal(H.viewName({ passage: 'Santiago 1:5', date }), 'Enlace a Santiago 1:5');
  assert.equal(H.viewName({ date }), 'El mapa en c. 50 e.c.');
  assert.equal(H.viewName({}), 'El mapa');
});

test('the tab title names the view, so the browser history list tells entries apart', () => {
  const base = 'biblical-atlas · ¿Dónde y cuándo pasó lo que estás leyendo?';
  assert.equal(H.pageTitle('Samotracia', { base }), 'Samotracia · biblical-atlas');
  assert.equal(H.pageTitle('la portada', { landing: true, base }), base);
  assert.equal(H.pageTitle('El mapa en c. 50 e.c.', { base }), 'El mapa en c. 50 e.c. · biblical-atlas');
  assert.equal(H.pageTitle(null, { base }), base);
});

test('a name that would read the same as the one behind it gets the date', () => {
  const H607 = '607 a.e.c.';
  assert.equal(H.distinctName('Lectura de Hechos 1', 'Lectura de Hechos 1', H607), 'Lectura de Hechos 1 en 607 a.e.c.');
  assert.equal(H.distinctName('Pablo', 'Pablo', 'c. 50 e.c.'), 'Pablo en c. 50 e.c.');
  // The second year after the first is told apart from both.
  assert.equal(H.distinctName('Pablo', 'Pablo en 607 a.e.c.', '700 a.e.c.'), 'Pablo en 700 a.e.c.');
  // Another name, a name with the date already in it, or nothing behind: as it is.
  assert.equal(H.distinctName('Corinto', 'Pablo', H607), 'Corinto');
  assert.equal(H.distinctName('Ahora mismo en 607 a.e.c.', 'Ahora mismo en 607 a.e.c.', H607), 'Ahora mismo en 607 a.e.c.');
  assert.equal(H.distinctName('Pablo', null, H607), 'Pablo');
  assert.equal(H.distinctName('Pablo', 'Pablo', ''), 'Pablo');
  assert.equal(H.distinctName(null, null, H607), null);
});

test('an entry keeps the map\'s frame and the mark pressed in it through a reload, Back and a rename; a new entry starts without them', () => {
  let { state, visits } = H.begin(null, [], 'v1', 'Filipos');
  state = H.withMark(H.withFrame(state, { lon: 24.789531234, lat: 40.927041234, zoom: 9.4987 }), 'periodo:galion');
  // Rounded: about a metre and a hundredth of a zoom step, so history.state stays small.
  assert.deepEqual(plain(state), { visit: 'v1', step: 0, name: 'Filipos', frame: { lon: 24.78953, lat: 40.92704, zoom: 9.5 }, mark: 'periodo:galion' });
  // A reload, or Back into this page from another one, reads them back.
  assert.deepEqual(plain(H.begin(state, visits, 'v2').state), plain(state));
  assert.deepEqual(plain(H.rename(state, visits, 'Filipos en c. 50 e.c.').state.frame), plain(state.frame));
  const n = H.push(state, visits);
  assert.equal(n.state.frame, undefined, 'a new entry has the frame of the one before');
  assert.equal(n.state.mark, undefined, 'a new entry has the mark of the one before');
  // Back to it: popstate hands over the state as it was written.
  assert.deepEqual(plain(H.arrive(n.state, state, n.visits, 'v3').state), plain(state));
  // Without a mark, or with an unreadable frame, the field goes.
  assert.equal(H.withMark(state, null).mark, undefined);
  assert.equal(H.withFrame(state, { lon: 'x', lat: 1, zoom: 2 }).frame, undefined);
});

test('a mark pressed in a person\'s lane keeps that lane with it, through a reload and Back; a new entry starts without it', () => {
  // A journey bar in the lane of Jesús lives only in that lane: the entry keeps whose lane it was, or Back gives the
  // mark back with no lane to show it in.
  let { state, visits } = H.begin(null, [], 'v1', 'Del Jordán a Caná');
  state = H.withMark(state, 'viaje:del-jordan-a-cana', 'jesus');
  assert.deepEqual(plain(state), { visit: 'v1', step: 0, name: 'Del Jordán a Caná', mark: 'viaje:del-jordan-a-cana', lane: 'jesus' });
  assert.deepEqual(plain(H.begin(state, visits, 'v2').state), plain(state));
  const n = H.push(state, visits);
  assert.equal(n.state.lane, undefined, 'a new entry has the lane of the one before');
  assert.deepEqual(plain(H.arrive(n.state, state, n.visits, 'v3').state), plain(state));
  // A lane without a mark, or a mark from a lane that is no person's, keeps no lane.
  assert.equal(H.withMark(state, null, 'jesus').lane, undefined);
  assert.equal(H.withMark(state, 'periodo:galion').lane, undefined);
  assert.equal(H.begin({ visit: 'v1', step: 0, name: 'x', lane: 'jesus' }, [], 'v2').state.lane, undefined);
});

test('only a centre inside the world and a zoom a map can take count as a frame', () => {
  assert.equal(H.isFrame({ lon: 24.8, lat: 40.9, zoom: 9.5 }), true);
  for (const f of [null, {}, { lon: 1, lat: 2 }, { lon: 200, lat: 0, zoom: 5 }, { lon: 0, lat: -91, zoom: 5 }, { lon: 0, lat: 0, zoom: 30 }, { lon: NaN, lat: 0, zoom: 5 }, { lon: '1', lat: 0, zoom: 5 }]) {
    assert.equal(H.isFrame(f), false, JSON.stringify(f));
  }
  // A stored state with a broken frame keeps its number and name and drops the frame.
  const r = H.begin({ visit: 'v1', step: 1, name: 'Corinto', frame: { lon: 0, lat: 0, zoom: 99 }, mark: '' }, [], 'v2');
  assert.deepEqual(plain(r.state), { visit: 'v1', step: 1, name: 'Corinto' });
});
