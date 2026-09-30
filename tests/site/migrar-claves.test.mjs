// site/js/migrar-claves.js: lo guardado con el prefijo anterior se junta con el nuevo, sin borrar ni pisar nada.
//
// No necesita navegador: carga el script con node:vm sobre un almacenamiento falso que se porta como localStorage.
//
//   node --test tests/site/migrar-claves.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const leer = (f) => fs.readFileSync(fileURLToPath(new URL(`../../site/js/${f}`, import.meta.url)), 'utf8');
const FUNDIR = leer('fundir-claves.js');
const CODE = leer('migrar-claves.js');

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
// Como en index.html, fundir-claves.js va antes; `sinFundir` prueba la página sin él.
function cargar(a, { sinFundir = false } = {}) {
  const ctx = { localStorage: a };
  ctx.window = ctx;
  vm.createContext(ctx);
  if (!sinFundir) vm.runInContext(FUNDIR, ctx);
  vm.runInContext(CODE, ctx);
  return ctx;
}
const marca = (a) => JSON.parse(a.todo()['biblical-atlas:migrado']);
const notas = (a, p = 'biblical-atlas:') => Object.keys(JSON.parse(a.todo()[p + 'notes']).notes).sort();
const conNota = (raw, k, text) => { const o = JSON.parse(raw); o.notes[k] = { text }; return JSON.stringify(o); };

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
  assert.deepEqual(Object.keys(marca(a)).sort(), ['leidos', 'marcadores', 'notes', 'notes:unreadable:2026-09-01T00:00:00.000Z', 'pref:reunion']);
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
  assert.ok(marca(a).notes);
});

test('un almacenamiento que lanza al leer no para la página', () => {
  assert.doesNotThrow(() => cargar(almacen(VIEJO, { getItemRoto: true })));
  const ctx = { get localStorage() { throw new Error('SecurityError'); } };
  ctx.window = ctx;
  vm.createContext(ctx);
  assert.doesNotThrow(() => vm.runInContext(CODE, ctx));
});

test('una nota escrita en el prefijo nuevo mientras la copia no cabía no impide juntar las antiguas', () => {
  let lleno = true;
  const a = almacen(VIEJO, { falla: (k) => lleno && k === 'biblical-atlas:notes' });
  cargar(a);
  lleno = false;
  a.setItem('biblical-atlas:notes', '{"format":"biblical-atlas-notes","version":1,"notes":{"lugar:corinto":{"text":"Nueva"}}}');
  cargar(a);
  assert.deepEqual(notas(a), ['lugar:corinto', 'persona:pablo']);
  assert.equal(JSON.parse(a.todo()['biblical-atlas:notes']).notes['lugar:corinto'].text, 'Nueva');
});

test('lo que una pestaña con la versión anterior guarda después de migrar llega en la carga siguiente', () => {
  const a = almacen(VIEJO);
  cargar(a);
  a.setItem('biblical-earth:notes', conNota(NOTAS, 'lugar:corinto', 'Guardada en la pestaña vieja'));
  a.setItem('biblical-earth:leidos', '["hch-16","hch-17"]');
  cargar(a);
  assert.deepEqual(notas(a), ['lugar:corinto', 'persona:pablo']);
  assert.deepEqual(JSON.parse(a.todo()['biblical-atlas:leidos']), ['hch-16', 'hch-17']);
});

test('con los dos prefijos, los marcadores se unen y las notas se juntan por ficha', () => {
  const a = almacen({ ...VIEJO,
    'biblical-atlas:marcadores': '[{"t":-607,"sel":null}]',
    'biblical-atlas:notes': '{"format":"biblical-atlas-notes","version":1,"notes":{"lugar:roma":{"text":"Roma"}}}' });
  cargar(a);
  assert.deepEqual(JSON.parse(a.todo()['biblical-atlas:marcadores']), [{ t: -607, sel: null }, { t: 50.3, sel: 'lugar:filipos' }]);
  assert.deepEqual(notas(a), ['lugar:roma', 'persona:pablo']);
});

test('una clave antigua que no cambia no se vuelve a juntar, y la que cambia no trae de vuelta las demás', () => {
  const a = almacen(VIEJO);
  cargar(a);
  a.removeItem('biblical-atlas:pref:reunion');
  a.setItem('biblical-atlas:marcadores', '[]');
  cargar(a);
  a.setItem('biblical-earth:leidos', '["hch-16","hch-18"]');
  cargar(a);
  const t = a.todo();
  assert.ok(!('biblical-atlas:pref:reunion' in t));
  assert.equal(t['biblical-atlas:marcadores'], '[]');
  assert.deepEqual(JSON.parse(t['biblical-atlas:leidos']), ['hch-16', 'hch-18']);
});

test('juntar dos veces lo mismo no escribe nada la segunda', () => {
  const a = almacen({ ...VIEJO, 'biblical-atlas:notes': conNota(NOTAS, 'persona:pablo', 'Otra') });
  const ctx = cargar(a);
  const antes = JSON.stringify(a.todo());
  a.removeItem('biblical-atlas:migrado');
  assert.equal(ctx.migrarClaves(a, ctx.fundirClaves, '2026-10-01T00:00:00.000Z'), 0);
  const despues = a.todo();
  delete despues['biblical-atlas:migrado'];
  const previo = JSON.parse(antes);
  delete previo['biblical-atlas:migrado'];
  assert.deepEqual(despues, previo);
});

test('una marca en otro formato cuenta como vacía y se junta todo una vez', () => {
  const a = almacen({ ...VIEJO, 'biblical-atlas:migrado': '1' });
  cargar(a);
  assert.equal(a.todo()['biblical-atlas:notes'], NOTAS);
  assert.ok(marca(a).notes);
});

test('sin fundir-claves.js no escribe nada ni lanza', () => {
  const a = almacen(VIEJO);
  assert.doesNotThrow(() => cargar(a, { sinFundir: true }));
  assert.ok(!Object.keys(a.todo()).some((k) => k.startsWith('biblical-atlas:')));
});
