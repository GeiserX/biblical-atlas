// The selection rules of the timeline (site/js/linea-filas.js), in plain node: no browser, no build, no data.
//  - A click on a mark selects it; a second click on the selected mark lets it go, as on the map.
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
