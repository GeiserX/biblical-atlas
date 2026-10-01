// The selection rules of the timeline (site/js/linea-filas.js), in plain node: no browser, no build, no data.
//  - A click on a mark selects it; a second click on the same mark lets it go, as on the map. A click on another mark of
//    the same selection (another stay of the selected person) moves the cursor into it and keeps the selection.
//  - While something is selected the other marks are dimmed only while a mark of the selection is in view. When the
//    selected mark leaves the view entirely (out of the time range, or its row scrolled out of the tall panel), the
//    others get their colours back and the selection stays; when it comes back, the dimming returns. A selection with
//    no mark of its own (a place) keeps the rule from before: dimmed while anything related to it is in view.
//
// Run from the repository root (light, it may run anywhere):
//   node --test tests/site/timeline-selection.test.mjs
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

// The strip remembers the id of the mark clicked last (`last`); a selection that arrives another way (the map, a link,
// the search) has no remembered mark. `click` returns the selection and the remembered mark after a click.
const click = (state, mark) => {
  const sel = F.nextSel(mark.sel, mark.id, state.sel, state.last);
  return sel == null ? { sel: '', last: null, released: true } : { sel, last: mark.id, released: false };
};

test('a second click on the selected mark lets it go', () => {
  assert.equal(typeof F.nextSel, 'function', 'linea-filas.js has no nextSel');
  const ev = { sel: 'evento:concilio-de-jerusalen-49', id: 'evento:concilio-de-jerusalen-49' };
  let s = { sel: '', last: null };
  s = click(s, ev);
  assert.equal(s.sel, ev.sel, 'the first click selects the mark');
  s = click(s, ev);
  assert.equal(s.sel, '', 'the second click on the same mark leaves nothing selected');
  s = click(s, ev);
  assert.equal(s.sel, ev.sel, 'a third click selects it again');
  s = click(s, { sel: 'carta:galatas', id: 'carta:galatas' });
  assert.equal(s.sel, 'carta:galatas', 'a click on another mark moves the selection to it');
});

test('with a person selected, a click on another of their stays keeps the person; a second click on the same stay lets go', () => {
  // Two stays of Pablo in his lane share the selection «persona:pablo».
  const A = { sel: 'persona:pablo', id: 'persona:pablo#rel:pablo:0' };
  const B = { sel: 'persona:pablo', id: 'persona:pablo#rel:pablo:1' };
  // Pablo selected from the map, a link or the search: no mark remembered.
  let s = { sel: 'persona:pablo', last: null };
  s = click(s, A);
  assert.deepEqual([s.sel, s.released], ['persona:pablo', false], 'the first click on stay A keeps the person (the cursor moves into A)');
  s = click(s, B);
  assert.deepEqual([s.sel, s.released], ['persona:pablo', false], 'a click on stay B keeps the person (the cursor moves into B)');
  s = click(s, B);
  assert.deepEqual([s.sel, s.released], ['', true], 'a second click on stay B lets the person go');
  // A selection that arrives another way forgets the remembered mark: the first click on that same mark moves, never releases.
  s = click({ sel: 'persona:pablo', last: null }, B);
  assert.equal(s.released, false, 'with nothing remembered, a click on B moves into it');
});

// A strip 1000 px wide whose panel shows rows 200 to 500 px down the lanes, rows 22 px tall.
const VIEW = { w: 1000, top: 200, h: 300, row: 22 };
const dims = (selected) => F.dimOthers({ own: true, ownInView: F.inView(selected.hit, selected.y, VIEW), relatedInView: true });

test('the selected mark out of view gives the other marks their colours back, and back in view dims them again', () => {
  assert.equal(typeof F.inView, 'function', 'linea-filas.js has no inView');
  assert.equal(typeof F.dimOthers, 'function', 'linea-filas.js has no dimOthers');
  // The selection itself never changes here: nothing in these rules reads or writes it, only the dimming follows.
  const steps = [
    ['in view', { hit: [400, 520], y: 300 }, true],
    ['panned so it left by the left edge', { hit: [-180, -20], y: 300 }, false],
    ['panned back', { hit: [400, 520], y: 300 }, true],
    ['zoomed so it left by the right edge', { hit: [1040, 1060], y: 300 }, false],
    ['zoomed back', { hit: [400, 520], y: 300 }, true],
    ['its row scrolled above the panel', { hit: [400, 520], y: 150 }, false],
    ['its row scrolled below the panel', { hit: [400, 520], y: 520 }, false],
    ['scrolled back', { hit: [400, 520], y: 300 }, true],
  ];
  for (const [what, mark, dimmed] of steps) assert.equal(dims(mark), dimmed, `${what}: the others should ${dimmed ? '' : 'not '}be dimmed`);
});

test('the threshold is the whole mark: one pixel in view keeps the dimming, no pixel in view drops it', () => {
  assert.equal(typeof F.inView, 'function', 'linea-filas.js has no inView');
  // Left and right edges of the strip.
  assert.equal(F.inView([-60, 1], 300, VIEW), true, 'one pixel of its name at the left edge');
  assert.equal(F.inView([-60, 0], 300, VIEW), false, 'its name ends exactly at the left edge');
  assert.equal(F.inView([999, 1060], 300, VIEW), true, 'one pixel of its dot at the right edge');
  assert.equal(F.inView([1000, 1060], 300, VIEW), false, 'its dot starts exactly at the right edge');
  // Top and bottom of the panel.
  assert.equal(F.inView([400, 520], 179, VIEW), true, 'one pixel of its row below the top');
  assert.equal(F.inView([400, 520], 178, VIEW), false, 'its row ends exactly at the top');
  assert.equal(F.inView([400, 520], 499, VIEW), true, 'one pixel of its row above the bottom');
  assert.equal(F.inView([400, 520], 500, VIEW), false, 'its row starts exactly at the bottom');
});

test('a selection with no mark of its own keeps dimming while something related is in view', () => {
  assert.equal(typeof F.dimOthers, 'function', 'linea-filas.js has no dimOthers');
  assert.equal(F.dimOthers({ own: false, ownInView: false, relatedInView: true }), true);
  assert.equal(F.dimOthers({ own: false, ownInView: false, relatedInView: false }), false);
  // With a mark of its own, related marks in view do not keep the dimming once that mark is gone.
  assert.equal(F.dimOthers({ own: true, ownInView: false, relatedInView: true }), false);
});
