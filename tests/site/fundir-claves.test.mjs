// site/js/fundir-claves.js: la regla con la que migrar-claves.js junta lo guardado con el prefijo anterior.
//
//   node --test tests/site/fundir-claves.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const SITE_DIR = fileURLToPath(new URL('../../site/', import.meta.url));

function cargarFundir() {
  const ctx = {};
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(SITE_DIR, 'js', 'fundir-claves.js'), 'utf8'), ctx);
  return ctx.fundirClaves;
}

const nota = (text) => ({ text, label: '', created: '2026-01-01T00:00:00.000Z', updated: '2026-01-01T00:00:00.000Z' });
const almacen = (notes, format = 'biblical-atlas-notes') => JSON.stringify({ format, version: 1, notes });
const AHORA = '2026-10-01T00:00:00.000Z';

describe('fundir: lo de aquí siempre manda', () => {
  const t = cargarFundir();
  // Los objetos vienen de otro contexto de vm: una copia en JSON los compara por su contenido.
  const fundir = (...a) => JSON.parse(JSON.stringify(t(...a)));
  const aplicar = (actual, llegado) => ({ ...actual, ...fundir(actual, llegado, AHORA) });

  test('sin nada aquí, todo lo que llega se escribe tal cual', () => {
    const llegado = { notes: almacen({ 'persona:pablo': nota('A') }), marcadores: '[{"t":1,"sel":null}]', leidos: '["hch-1"]',
      'pref:reunion': '1', ultima: 'x', 'recorrido:pedro': '3', 'notes:unreadable:2026-01-01': 'ROTO' };
    assert.deepEqual(fundir({}, llegado, AHORA), llegado);
  });
  test('la marca de la migración nunca se copia', () => {
    assert.deepEqual(fundir({}, { migrado: '1' }, AHORA), {});
  });
  test('una nota de una ficha sin nota aquí se añade y las de aquí no cambian', () => {
    const r = aplicar({ notes: almacen({ 'persona:pablo': nota('Aquí') }) }, { notes: almacen({ 'persona:pablo': nota('Aquí'), 'lugar:roma': nota('Llega') }) });
    assert.deepEqual(JSON.parse(r.notes).notes, { 'persona:pablo': nota('Aquí'), 'lugar:roma': nota('Llega') });
    assert.ok(!Object.keys(r).some((k) => k.startsWith('notes:unreadable:')));
  });
  test('una nota distinta para la misma ficha deja la de aquí y aparta entera la que llega', () => {
    const llega = almacen({ 'persona:pablo': nota('Allí'), 'lugar:roma': nota('Roma') }, 'biblical-earth-notes');   // nombre-fijo
    const r = aplicar({ notes: almacen({ 'persona:pablo': nota('Aquí') }) }, { notes: llega });
    assert.equal(JSON.parse(r.notes).notes['persona:pablo'].text, 'Aquí');
    assert.equal(JSON.parse(r.notes).notes['lugar:roma'].text, 'Roma');
    assert.equal(r[`notes:unreadable:${AHORA}`], llega);
  });
  test('unas notas que llegan sin poder leerse se apartan, y las de aquí no se tocan', () => {
    const aqui = almacen({ 'persona:pablo': nota('Aquí') });
    const r = aplicar({ notes: aqui }, { notes: '{"format":' });
    assert.equal(r.notes, aqui);
    assert.equal(r[`notes:unreadable:${AHORA}`], '{"format":');
  });
  test('marcadores y capítulos leídos se unen sin repetir', () => {
    const r = aplicar({ marcadores: '[{"t":1,"sel":"a","nombre":"x"}]', leidos: '["hch-1","hch-2"]' },
      { marcadores: '[{"t":1,"sel":"a","nombre":"otro"},{"t":2,"sel":null}]', leidos: '["hch-2","hch-3"]' });
    assert.deepEqual(JSON.parse(r.marcadores), [{ t: 1, sel: 'a', nombre: 'x' }, { t: 2, sel: null }]);
    assert.deepEqual(JSON.parse(r.leidos), ['hch-1', 'hch-2', 'hch-3']);
  });
  test('cualquier otra clave se escribe solo si aquí no existe', () => {
    assert.deepEqual(fundir({ 'pref:reunion': '0', ultima: 'aquí' }, { 'pref:reunion': '1', ultima: 'allí', 'pref:letra': '1' }, AHORA), { 'pref:letra': '1' });
  });
  test('aplicarlo dos veces no cambia nada la segunda, tampoco la copia apartada', () => {
    const llegado = { notes: almacen({ 'persona:pablo': nota('Allí'), 'lugar:roma': nota('Roma') }), marcadores: '[{"t":2,"sel":null}]', leidos: '["hch-3"]', 'pref:x': '1' };
    const una = aplicar({ notes: almacen({ 'persona:pablo': nota('Aquí') }), marcadores: '[]', leidos: '["hch-1"]' }, llegado);
    assert.deepEqual(fundir(una, llegado, '2026-10-02T00:00:00.000Z'), {});
  });
  test('una lista de aquí que no se entiende no se toca', () => {
    assert.deepEqual(fundir({ marcadores: 'roto' }, { marcadores: '[{"t":2,"sel":null}]' }, AHORA), {});
  });
});
