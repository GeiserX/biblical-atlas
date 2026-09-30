// site/js/migrar-claves.js: lo guardado con el prefijo anterior se copia al nuevo, sin borrar ni pisar nada.
//
// No necesita navegador: carga el script con node:vm sobre un almacenamiento falso que se porta como localStorage.
//
//   node --test tests/site/migrar-claves.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const CODE = fs.readFileSync(fileURLToPath(new URL('../../site/js/migrar-claves.js', import.meta.url)), 'utf8');

// Un almacenamiento con el orden de inserción de un Map. `falla(k)` decide qué setItem lanza un error de cuota.
function almacen(inicial = {}, { falla = () => false, getItemRoto = false } = {}) {
  const m = new Map(Object.entries(inicial));
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => { if (getItemRoto) throw new Error('SecurityError'); return m.has(k) ? m.get(k) : null; },
    setItem: (k, v) => { if (falla(k)) throw new Error('QuotaExceededError'); m.set(String(k), String(v)); },
    removeItem: (k) => { m.delete(k); },
    todo: () => Object.fromEntries(m),
  };
}
// Ejecuta el script como lo haría la página, con este almacenamiento como localStorage.
function cargar(a) {
  const ctx = { localStorage: a };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx);
  return ctx;
}

const NOTAS = '{"format":"biblical-earth-notes","version":1,"notes":{"persona:pablo":{"text":"Tarso"}}}';
const VIEJO = {
  'biblical-earth:notes': NOTAS,
  'biblical-earth:marcadores': '[{"t":50.3,"sel":"lugar:filipos"}]',
  'biblical-earth:leidos': '["hch-16"]',
  'biblical-earth:pref:reunion': '1',
  'biblical-earth:notes:unreadable:2026-09-01T00:00:00.000Z': 'ROTO {',
  'otra-cosa': 'x',
};

test('copia cada clave del prefijo anterior con el mismo valor y deja las demás como estaban', () => {
  const a = almacen(VIEJO);
  cargar(a);
  const t = a.todo();
  for (const [k, v] of Object.entries(VIEJO)) {
    assert.equal(t[k], v, `la clave ${k} sigue igual`);
    if (k.startsWith('biblical-earth:')) assert.equal(t['biblical-atlas:' + k.slice(15)], v, `${k} copiada`);
  }
  assert.equal(t['biblical-atlas:migrado'], '1');
  assert.equal(Object.keys(t).filter((k) => !k.startsWith('biblical-')).join(), 'otra-cosa');
});

test('una clave nueva que ya existe conserva su valor', () => {
  const a = almacen({ ...VIEJO, 'biblical-atlas:notes': 'NUEVAS' });
  cargar(a);
  assert.equal(a.todo()['biblical-atlas:notes'], 'NUEVAS');
  assert.equal(a.todo()['biblical-earth:notes'], NOTAS);
});

test('ninguna clave antigua se borra', () => {
  const a = almacen(VIEJO);
  cargar(a);
  for (const k of Object.keys(VIEJO)) assert.ok(k in a.todo(), `${k} sigue ahí`);
});

test('una clave quitada después de migrar no vuelve en la carga siguiente', () => {
  const a = almacen(VIEJO);
  cargar(a);
  a.removeItem('biblical-atlas:marcadores');
  cargar(a);
  assert.ok(!('biblical-atlas:marcadores' in a.todo()));
});

test('si una copia falla, las otras se hacen, la marca no se pone y nada lanza', () => {
  const a = almacen(VIEJO, { falla: (k) => k === 'biblical-atlas:notes' });
  assert.doesNotThrow(() => cargar(a));
  const t = a.todo();
  assert.equal(t['biblical-atlas:leidos'], '["hch-16"]');
  assert.ok(!('biblical-atlas:notes' in t));
  assert.ok(!('biblical-atlas:migrado' in t));
  for (const [k, v] of Object.entries(VIEJO)) assert.equal(t[k], v);
});

test('la carga siguiente reintenta lo que falló', () => {
  let lleno = true;
  const a = almacen(VIEJO, { falla: (k) => lleno && k === 'biblical-atlas:notes' });
  cargar(a);
  lleno = false;
  cargar(a);
  assert.equal(a.todo()['biblical-atlas:notes'], NOTAS);
  assert.equal(a.todo()['biblical-atlas:migrado'], '1');
});

test('un almacenamiento que lanza al leer no para la página', () => {
  assert.doesNotThrow(() => cargar(almacen(VIEJO, { getItemRoto: true })));
  const ctx = { get localStorage() { throw new Error('SecurityError'); } };
  ctx.window = ctx;
  vm.createContext(ctx);
  assert.doesNotThrow(() => vm.runInContext(CODE, ctx));
});
