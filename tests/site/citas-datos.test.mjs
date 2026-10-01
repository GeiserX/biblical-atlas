// Every reference the site turns into a link, read with the real citas() (base.js) and urlCita() (tipos/libro.js) over
// the built data: its chapter exists in its book, its verses exist in their chapter, and the anchor names that chapter.
// A one-chapter book cited by verse («Flm 23») has to read as chapter 1, not as a chapter 23 that jw.org does not have.
//
//   BE_DATA_FILE=site/data.json node --test tests/site/citas-datos.test.mjs
//
// No browser. Without BE_DATA_FILE it uses site/data.json, or builds the data into a temporary directory with
// python3 scripts/build.py (needs requirements.txt).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CAMPOS = new Set(['reference', 'referencia', 'pasajes']);
let D, BE, tmp;

before(() => {
  let file = process.env.BE_DATA_FILE || path.join(ROOT, 'site/data.json');
  if (!fs.existsSync(file)) {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'be-citas-'));
    execFileSync('python3', [path.join(ROOT, 'scripts/build.py'), '--salida', tmp], { cwd: ROOT, stdio: 'pipe' });
    file = path.join(tmp, 'data.json');
  }
  D = JSON.parse(fs.readFileSync(file, 'utf8'));
  const nada = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : nada), apply: () => nada, construct: () => nada });
  const window = {};
  const ctx = { window, document: nada, location: { protocol: 'https:', hash: '', href: '' }, console, encodeURIComponent,
    setTimeout, ResizeObserver: nada, matchMedia: nada, localStorage: nada, sessionStorage: nada, navigator: nada,
    requestAnimationFrame: nada, addEventListener: nada };
  for (const f of ['base.js', 'tipos/libro.js']) vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'site/js', f), 'utf8'), ctx);
  BE = window.BE;
  // As tipos/libro.js does when the data arrives: the 66 books of data.json, with the slug without hyphens as a form.
  BE.ponerLibros(D.libros.map((l) => ({ ...l, formas: [...new Set([...(l.formas || []), BE.norm(l.slug).replace(/-/g, '')])] })));
});
after(() => { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); });

function referencias(x, out = []) {
  if (Array.isArray(x)) for (const v of x) referencias(v, out);
  else if (x && typeof x === 'object') {
    for (const [k, v] of Object.entries(x)) {
      if (CAMPOS.has(k) && (typeof v === 'string' || Array.isArray(v))) [v].flat().forEach((s) => typeof s === 'string' && out.push(s));
      else referencias(v, out);
    }
  }
  return out;
}

test('every linked reference in the data falls inside its book and its chapter', () => {
  const malas = [];
  let n = 0;
  for (const ref of referencias(D)) {
    for (const c of BE.citas(ref)) {
      n++;
      const l = c.libro, vs = l.versiculos || [];
      const dentro = (cap, v) => cap >= 1 && cap <= l.capitulos && (v == null || !vs[cap - 1] || (v >= 1 && v <= vs[cap - 1]));
      const u = BE.urlCita(c), m = u.match(/\/(\d+)\/(?:#v(\d+?)(\d{3})(\d{3})(?:-v\d+)?)?$/);
      const anclaBien = m && (!m[2] || (+m[2] === l.num && +m[3] === c.cap));
      if (!dentro(c.cap, c.verso) || !dentro(c.capFin, c.versoFin) || !anclaBien || +m[1] !== c.cap) malas.push(`${c.texto} -> ${u}`);
    }
  }
  assert.ok(n > 3000, `only ${n} citations read: the walk over the data found too few references`);
  assert.deepEqual(malas, []);
});
