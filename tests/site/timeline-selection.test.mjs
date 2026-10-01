// The selection rules of the timeline (site/js/linea-filas.js), in plain node: no browser, no build, no data.
//  - A click on a mark selects it; a second click on the selected mark lets it go, as on the map.
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

test('a second click on the selected mark lets it go', () => {
  assert.equal(typeof F.nextSel, 'function', 'linea-filas.js has no nextSel');
  let sel = '';
  sel = F.nextSel('evento:concilio-de-jerusalen-49', sel) ?? '';
  assert.equal(sel, 'evento:concilio-de-jerusalen-49', 'the first click selects the mark');
  sel = F.nextSel('evento:concilio-de-jerusalen-49', sel) ?? '';
  assert.equal(sel, '', 'the second click on the same mark leaves nothing selected');
  sel = F.nextSel('evento:concilio-de-jerusalen-49', sel) ?? '';
  assert.equal(sel, 'evento:concilio-de-jerusalen-49', 'a third click selects it again');
  assert.equal(F.nextSel('carta:galatas', sel), 'carta:galatas', 'a click on another mark moves the selection to it');
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
