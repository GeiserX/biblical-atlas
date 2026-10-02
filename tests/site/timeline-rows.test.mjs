// The row engine of the timeline (site/js/linea-filas.js), in plain node: no browser, no build, no data.
// Every mark keeps the room of its drawing and of its whole name, the first free row of its lane takes it, and no name
// is covered or cut. This file checks that on synthetic lanes, plus where a click puts the cursor, the certainty of a
// date, and the story order of events that share a day.
//
// Run from the repository root (light, it may run anywhere):
//   node --test tests/site/timeline-rows.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.BE_ROOT ? path.resolve(process.env.BE_ROOT) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const context = { window: { BE: {} } };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'site/js/linea-filas.js'), 'utf8'), context);
const F = context.window.BE.filas;

const DAY = 1 / 365.2425;
const T0 = -4025;
const G = { maxLabel: 0, row: 22, dotR: 5, pad: 6, fade: 14, fadeOpen: 36, gap: 10, coarse: false };
const GC = { ...G, maxLabel: 160, row: 44, dotR: 6, coarse: true };
// 7 px per character: a fixed stand-in for the real font.
const MEAS = { name: (s) => s.length * 7, tag: (s) => s.length * 7, space: 3 };
const SCALES = [4125, 400, 40, 8, 1.5, 0.12];

// A small seeded generator, so a failure is the same failure on the next run.
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }
const WORDS = ['Pablo', 'en', 'Corinto', 'Éfeso', 'llega', 'a', 'Roma', 'predica', 'Jerusalén', 'concilio', 'viaje', 'carta', 'Timoteo', 'Silas'];
const CERTS = ['exact', 'approx', 'computed', 'uncertain'];
/** 200 marks around 50 e.c.: moments of a day to decades, spans of days to centuries. */
function syntheticLane(seed, id = 'x') {
  const r = rng(seed);
  const items = [];
  for (let i = 0; i < 200; i++) {
    const name = Array.from({ length: 1 + Math.floor(r() * 5) }, () => WORDS[Math.floor(r() * WORDS.length)]).join(' ');
    const cert = CERTS[Math.floor(r() * 4)];
    const start = 20 + r() * 60;
    const len = [DAY, 7 * DAY, 0.3, 2, 12, 150][Math.floor(r() * 6)];
    if (r() < 0.55) {
      const w0 = start, w1 = start + len;
      items.push({ id: `${id}${i}`, name, cert, shape: 'moment', start: w0, end: w1, anchor: (w0 + w1) / 2, w0, w1, group: 0 });
    } else items.push({ id: `${id}${i}`, name, cert, shape: 'span', start, end: start + len, group: r() < 0.2 ? 1 : 0, openEnd: cert === 'uncertain' && r() < 0.5 ? 'end' : null });
  }
  F.measure(items, MEAS, G);
  return { id, items };
}
const geom = (w, g = G) => ({ w, t0: T0, G: g, key: 'test' });

test('T1 no two marks of a row overlap, at six scales and four view starts', () => {
  const lane = syntheticLane(7);
  let checked = 0;
  for (const span of SCALES) for (const c of [33, 45, 50.5, 62]) {
    const out = F.layoutLane(lane, { v0: c - 0.4 * span, span }, geom(800));
    const byRow = new Map();
    for (const it of out.visible) { if (!byRow.has(it._drow)) byRow.set(it._drow, []); byRow.get(it._drow).push(it); }
    for (const list of byRow.values()) {
      list.sort((a, b) => a._hit[0] - b._hit[0]);
      for (let i = 1; i < list.length; i++) {
        const over = list[i - 1]._hit[1] - list[i]._hit[0];
        assert.ok(over <= 0.5, `span ${span}, view at ${c}: «${list[i - 1].name}» and «${list[i].name}» overlap by ${over.toFixed(1)} px in row ${list[i]._drow}`);
        checked++;
      }
    }
  }
  assert.ok(checked > 200, `only ${checked} neighbour pairs were checked`);
});

test('T2 every visible name lies inside the track', () => {
  const lane = syntheticLane(11);
  for (const span of SCALES) for (const c of [33, 50.5]) {
    const w = 800;
    for (const it of F.layoutLane(lane, { v0: c - 0.4 * span, span }, geom(w)).visible) {
      const lw = F.lwOf(it);
      assert.ok(it._lx >= -0.01 && it._lx + lw <= w + 0.01, `span ${span}: «${it.name}» label [${it._lx.toFixed(1)}, ${(it._lx + lw).toFixed(1)}] is outside [0, ${w}]`);
    }
  }
});

test('T3 a label is the whole name, never cut', () => {
  for (const it of syntheticLane(3).items) {
    const t = F.labelText(it);
    assert.ok(t.startsWith(it.name), t);
    assert.ok(!t.includes('…'), t);
  }
});

test('T4 a lane with nothing in view takes no rows, even with marks one screen away', () => {
  const items = [{ id: 'a', name: 'Lejos', cert: 'exact', shape: 'span', start: 10, end: 12, group: 0 }];
  F.measure(items, MEAS, G);
  assert.equal(F.layoutLane({ id: 'e', items: [] }, { v0: 40, span: 8 }, geom(800)).nRows, 0);
  // [10, 12) is within one span (8 years) of the view [20, 28), and not in it.
  assert.equal(F.layoutLane({ id: 'n', items }, { v0: 20, span: 8 }, geom(800)).nRows, 0);
  assert.equal(F.layoutLane({ id: 'v', items }, { v0: 9, span: 8 }, geom(800)).nRows, 1);
});

test('T5 a bar that only peeks in under 24 px and whose name does not fit there is not in the view yet', () => {
  // 800 px for 8 years: 0.01 year = 1 px of the bar inside the view that starts at 10. A moment 30 px in, in the same
  // row, leaves no room at the left edge for the long name.
  const items = [
    { id: 'p', name: 'Un nombre bastante largo para no caber', cert: 'exact', shape: 'span', start: 0, end: 10.01, group: 0 },
    { id: 'm', name: 'Aquí', cert: 'exact', shape: 'moment', start: 10.3, end: 10.3, anchor: 10.3, w0: 10.3, w1: 10.3, group: 0 },
  ];
  F.measure(items, MEAS, G);
  const out = F.layoutLane({ id: 'p', items }, { v0: 10, span: 8 }, geom(800));
  assert.equal(items[0].row, items[1].row, 'both marks share a world row');
  assert.deepEqual([...out.visible].map((x) => x.id), ['m']);
  const wide = F.layoutLane({ id: 'p2', items: [{ ...items[0], end: 10.5 }] }, { v0: 10, span: 8 }, geom(800));
  assert.equal(wide.visible.length, 1, 'a bar with 50 px in view shows');
});

test('T5b a short bar wholly inside the view shows with its whole name, even when the name does not fit on its right', () => {
  // 800 px for 8 years: a bar of 8 px that ends 60 px from the right edge, with a name far wider than 60 px, right after
  // a bar of the same world row, so its name fits neither on its right nor between the two.
  const items = [
    { id: 'a', name: 'Aquí', cert: 'exact', shape: 'span', start: 16, end: 17.2, group: 0 },
    { id: 'b', name: 'Tito, emperador de Roma', cert: 'exact', shape: 'span', start: 17.32, end: 17.4, group: 0 },
  ];
  F.measure(items, MEAS, G);
  const out = F.layoutLane({ id: 'b', items }, { v0: 10, span: 8 }, geom(800));
  assert.equal(items[0].row, items[1].row, 'both bars share a world row');
  const bar = out.visible.find((x) => x.id === 'b');
  assert.ok(bar, 'the short bar is in the layout');
  const lw = F.lwOf(bar);
  assert.ok(bar._lx >= 0 && bar._lx + lw <= 800, `its name [${bar._lx}, ${bar._lx + lw}] is inside the track`);
  for (const o of out.visible) if (o !== bar && o._drow === bar._drow) assert.ok(o._hit[1] <= bar._hit[0] || bar._hit[1] <= o._hit[0], `«${o.name}» and the bar overlap`);
});

test('T5c a name pushed against the right edge never covers its own dot or bar', () => {
  // The Job case on the phone: a moment 180 px from the right edge, with a neighbour just on its left, and a name of
  // 175 px. Its name fits neither on its right nor on its left; pressed against the edge, it would sit on its own dot.
  for (const g of [G, GC]) {
    const items = [
      { id: 'a', name: 'Antes', cert: 'exact', shape: 'span', start: 10.5, end: 16, group: 0 },
      { id: 'j', name: 'Satanás pone en duda', cert: 'approx', shape: 'moment', start: 16.2, end: 16.2, anchor: 16.2, w0: 16.2, w1: 16.2, group: 0 },
    ];
    F.measure(items, MEAS, g);
    const w = 800;
    const out = F.layoutLane({ id: 'j', items }, { v0: 10, span: 8 }, geom(w, g));
    const it = out.visible.find((x) => x.id === 'j');
    assert.ok(it, 'the moment is drawn');
    const lw = F.lwOf(it);
    assert.ok(it._lx >= it._dot + g.dotR || it._lx + lw <= it._dot - g.dotR, `its name [${it._lx.toFixed(1)}, ${(it._lx + lw).toFixed(1)}] covers its dot at ${it._dot.toFixed(1)}`);
    assert.ok(it._lx >= 0 && it._lx + lw <= w, 'its name is inside the track');
  }
});

/** Pairs of marks of one row whose boxes overlap. */
function overlaps(out) {
  const bad = [], byRow = new Map();
  for (const it of out.visible) { if (!byRow.has(it._drow)) byRow.set(it._drow, []); byRow.get(it._drow).push(it); }
  for (const list of byRow.values()) {
    list.sort((a, b) => a._hit[0] - b._hit[0]);
    for (let i = 1; i < list.length; i++) if (list[i - 1]._hit[1] - list[i]._hit[0] > 0.5) bad.push(`«${list[i - 1].name}» / «${list[i].name}»`);
  }
  return bad;
}

test('T6 while dragging no lane shrinks, no name covers another, and a mark changes row only to get out of the way', () => {
  for (const [seed, span, from, dir] of [[19, 8, 46, 1], [19, 8, 52, -1], [31, 40, 30, 1], [37, 40, 60, -1], [41, 1.5, 49.5, 1]]) {
    const lane = syntheticLane(seed);
    const w = 800;
    let v0 = from;
    const hold = { rows: new Map(), edge: new Map() };
    let prev = F.layoutLane(lane, { v0, span }, geom(w), hold);
    let prevRows = new Map(prev.visible.map((it) => [it.id, it._drow]));
    let moved = 0, kept = 0;
    for (let step = 0; step < 60; step++) {
      v0 += dir * (7 / w) * span;
      const out = F.layoutLane(lane, { v0, span }, geom(w), hold);
      assert.ok(out.nRows >= prev.nRows, `seed ${seed}, step ${step}: the lane shrank from ${prev.nRows} to ${out.nRows} rows`);
      assert.deepEqual(overlaps(out), [], `seed ${seed}, span ${span}, step ${step}: names cover each other while dragging`);
      for (const it of out.visible) if (prevRows.has(it.id)) { if (it._drow === prevRows.get(it.id)) kept++; else moved++; }
      prev = out; prevRows = new Map(out.visible.map((it) => [it.id, it._drow]));
    }
    assert.ok(moved <= kept / 50, `seed ${seed}: ${moved} row changes against ${kept} marks that kept their row`);
  }
  const lane = syntheticLane(19);
  const span = 8, w = 800, hold = { rows: new Map(), edge: new Map() };
  let held = null;
  for (let v0 = 46; v0 < 50; v0 += 0.1) held = F.layoutLane(lane, { v0, span }, geom(w), hold);
  const released = F.layoutLane(lane, { v0: 50, span }, geom(w));
  assert.ok(released.nRows <= held.nRows, 'after release the lane packs again');
  const used = new Set(released.visible.map((it) => it._drow));
  assert.equal(used.size <= released.nRows, true);
});

test('T7 the row of a mark does not depend on where the view starts', () => {
  const lane = syntheticLane(23);
  const a = new Map(F.layoutLane(lane, { v0: 44, span: 8 }, geom(800)).visible.map((it) => [it.id, it.row]));
  const b = F.layoutLane(lane, { v0: 47, span: 8 }, geom(800)).visible;
  let same = 0;
  for (const it of b) if (a.has(it.id)) { assert.equal(it.row, a.get(it.id), it.name); same++; }
  assert.ok(same > 10, `only ${same} marks were in both views`);
});

test('T8 no label says «cálculo»; approximate ones end in «aprox.», doubtful ones carry «¿?», the rest no word', () => {
  for (const it of syntheticLane(5).items) {
    const t = F.labelText(it);
    assert.doesNotMatch(t, /c[aá]lculo/i, t);
    if (it.cert === 'approx') assert.ok(t.endsWith(' aprox.'), t);
    else if (it.cert === 'uncertain') assert.ok(t.includes('¿?'), t);
    else assert.equal(t, it.name);
  }
  assert.equal(F.hollow({ cert: 'computed' }), true);
  assert.equal(F.hollow({ cert: 'approx' }), false);
});

test('T9 a click puts the cursor at the pointed moment inside the mark, never at its end', () => {
  const view = { v0: 30, span: 40 };
  const bar = { shape: 'span', start: 40, end: 50 };
  assert.equal(F.clickTarget(bar, 44, 10, view, DAY), 44, 'pointer inside: that moment');
  const right = F.clickTarget(bar, 55, 10, view, DAY);   // on the label, right of the bar
  assert.ok(right < 50 && right > 50 - DAY / 24 - 1e-9, `on the label: just before the end, got ${right}`);
  assert.equal(F.clickTarget(bar, 30, 10, view, DAY), 40, 'pointer left of the bar: its start, which is where it points');
  assert.equal(F.clickTarget(bar, null, 45.5, view, DAY), 45.5, 'keyboard with the cursor inside: stays');
  assert.equal(F.clickTarget(bar, null, 10, view, DAY), 40, 'keyboard with the cursor before: the nearest point');
  const cut = { shape: 'span', start: 20, end: 35 };   // only [30, 35) is in view
  assert.equal(F.clickTarget(cut, null, 10, view, DAY), 30, 'clamped to the visible part');
  assert.equal(F.clickTarget({ shape: 'span', start: 0, end: 10 }, 5, 50, view, DAY), null, 'no date in view: null');
  const moment = { shape: 'moment', w0: 33.2, w1: 33.2 + DAY, anchor: 33.2 + DAY / 2 };
  const t = F.clickTarget(moment, 40, 50, view, DAY);
  assert.ok(t >= 33.2 && t < 33.2 + DAY, 'a one-day moment keeps the cursor in that day');
  assert.equal(F.clickTarget({ shape: 'moment', w0: 35, w1: 35, anchor: 35 }, 40, 50, view, DAY), 35, 'zero length: its only point');
});

test('T10 certainty of a date', () => {
  const cases = [
    [{ desde: 49, hasta: 49, texto: '49 e.c.' }, 'exact'],
    [{ desde: 49, hasta: 49, texto: 'c. 49 e.c.', aprox: true }, 'approx'],
    [{ desde: -488, hasta: -484, texto: '488-484 a.e.c.', tipo: 'derivada' }, 'computed'],
    [{ desde: 33, hasta: 33, texto: '33 e.c.', tipo: 'narrativa' }, 'computed'],
    [{ desde: 62, texto: 'd. 62 e.c.' }, 'uncertain'],
    [{ desde: 60, hasta: 62, texto: 'quizá 61 e.c.' }, 'uncertain'],
    [{ desde: 31, hasta: 32, texto: '31 o 32 e.c.' }, 'uncertain'],
    [{ desde: 50, hasta: 52, texto: 'después de 50 y antes de 52' }, 'exact'],
  ];
  for (const [f, want] of cases) assert.equal(F.certainty(f), want, f.texto);
  assert.equal(F.certainty({ desde: 1, hasta: 2, texto: '1-2' }, 'end'), 'uncertain', 'an open end is uncertain');
});

test('T11 events of one day stack in story order, not by name length', () => {
  const day = [33.2, 33.2 + DAY];
  const ev = (id, name, passages) => ({ id, name, cert: 'exact', shape: 'moment', start: day[0], end: day[1], anchor: (day[0] + day[1]) / 2, w0: day[0], w1: day[1], group: 0, passages });
  const items = [
    ev('c', 'Ponen su cuerpo en una tumba', ['Mt 27:57-61']),
    ev('a', 'Celebra la Pascua con los apóstoles, un nombre largo', ['Mt 26:17-19']),
    ev('b', 'Muere', ['Mt 27:45-50']),
  ];
  F.storyOrder(items);
  assert.deepEqual(items.map((x) => x.seq), [2, 0, 1]);
  F.measure(items, MEAS, G);
  const out = F.layoutLane({ id: 's', items }, { v0: 33.19, span: 0.12 }, geom(800));
  const byRow = [...out.visible].sort((a, b) => a._drow - b._drow).map((x) => x.id);
  assert.deepEqual(byRow, ['a', 'b', 'c']);
  // A cycle (a before b in one book, b before a in another, and a tie) falls back to the order of the data.
  const cyc = [ev('x', 'X', ['Mt 1:1', 'Mr 2:1']), ev('y', 'Y', ['Mt 2:1', 'Mr 1:1'])];
  F.storyOrder(cyc);
  assert.deepEqual(cyc.map((x) => x.seq), [0, 1]);
});

test('T12 on a touch screen long names wrap to at most three lines and every target is at least 44 px wide', () => {
  const lane = syntheticLane(29);
  lane.items.push({ id: 'long', name: 'Pablo y Bernabé predican en la sinagoga de Antioquía de Pisidia y muchos creen', cert: 'approx', shape: 'moment', start: 47, end: 47.01, anchor: 47.005, w0: 47, w1: 47.01, group: 0 });
  F.measure(lane.items, MEAS, GC);
  for (const it of lane.items) {
    assert.ok(it.lines <= 3, `«${it.name}» takes ${it.lines} lines`);
    if (it.fullW > GC.maxLabel + 2) assert.ok(it.labelW <= it.fullW, it.name);
  }
  assert.ok(lane.items.at(-1).lines >= 2);
  for (const it of F.layoutLane(lane, { v0: 45, span: 8 }, geom(390, GC)).visible) assert.ok(it._hit[1] - it._hit[0] >= 44 - 1e-9, `${it.name}: ${it._hit[1] - it._hit[0]} px`);
});

test('T13 a traveller lane packs its journeys (group 0), their stops (1) and the rest (2) in three bands of rows, top down', () => {
  const items = [];
  for (let i = 0; i < 4; i++) {
    items.push({ id: `v${i}`, name: `Viaje ${i}`, cert: 'approx', shape: 'span', start: 30 + i, end: 32 + i, group: 0 });
    items.push({ id: `p${i}`, name: `Parada ${i}`, cert: 'approx', shape: 'span', start: 30.5 + i, end: 31 + i, group: 1 });
    items.push({ id: `s${i}`, name: `Suceso ${i}`, cert: 'exact', shape: 'moment', start: 31 + i, end: 31.01 + i, anchor: 31.005 + i, w0: 31 + i, w1: 31.01 + i, group: 2 });
  }
  F.measure(items, MEAS, G);
  const lane = { id: 'viajero', items };
  F.pack(lane, 800 / 8, T0, G, 'k');
  const rows = (g) => items.filter((it) => it.group === g).map((it) => it.row);
  const [r0, r1, r2] = [rows(0), rows(1), rows(2)];
  for (const r of [...r0, ...r1, ...r2]) assert.ok(Number.isInteger(r), `a mark without a row: ${r0} | ${r1} | ${r2}`);
  assert.ok(Math.max(...r0) < Math.min(...r1), `journeys ${r0} not above stops ${r1}`);
  assert.ok(Math.max(...r1) < Math.min(...r2), `stops ${r1} not above the rest ${r2}`);
});
