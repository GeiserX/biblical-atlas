/* biblical-earth · búsqueda: la caja de arriba y su lista de resultados. Cada tipo registrado aporta sus resultados con
   su función buscar(q, nq, puntuar). Dueño durante el reparto: app-estudio. */
'use strict';
(() => {
const BE = window.BE;
const { norm, esc, $, seleccionar, limpiarSeleccion } = BE;

// Orden de los grupos en la lista. Un grupo que no está aquí va al final.
const ORDEN_GRUPOS = ['Pasajes', 'Personas', 'Lugares', 'Cartas', 'Viajes', 'Sucesos', 'Periodos'];
const ordenGrupo = (g) => { const i = ORDEN_GRUPOS.indexOf(g); return i < 0 ? ORDEN_GRUPOS.length : i; };

let resultados = [], activo = 0;
function buscar(q) {
  const nq = norm(q).trim();
  if (!nq) return [];
  const puntuar = (textos) => {
    let mejor = 0;
    for (const t of textos) {
      const n = norm(t);
      if (!n) continue;
      if (n === nq) mejor = Math.max(mejor, 100);
      else if (n.startsWith(nq)) mejor = Math.max(mejor, 80);
      else if (n.split(/[\s-]+/).some((p) => p.startsWith(nq))) mejor = Math.max(mejor, 60);
      else if (nq.length >= 3 && n.includes(nq)) mejor = Math.max(mejor, 30);
    }
    return mejor;
  };
  // Cada resultado: { grupo, sel: { tipo, id }, titulo, meta, puntos }.
  const out = [];
  for (const def of BE.tipos.values()) if (def.buscar) out.push(...def.buscar(q, nq, puntuar));
  out.sort((a, b) => ordenGrupo(a.grupo) - ordenGrupo(b.grupo) || b.puntos - a.puntos || a.titulo.localeCompare(b.titulo, 'es'));
  // Máximo 6 por grupo
  const cuenta = {};
  return out.filter((r) => (cuenta[r.grupo] = (cuenta[r.grupo] || 0) + 1) <= 6);
}
function pintarResultados() {
  const caja = $('#resultados'), q = $('#q');
  if (!q.value.trim()) { cerrarResultados(); return; }
  if (!resultados.length) {
    caja.innerHTML = '<div class="sin-resultados">Nada con ese nombre en este corte. Prueba con un lugar («Filipos»), una carta («Romanos») o un capítulo («Hch 16»).</div>';
  } else {
    let grupo = '';
    caja.innerHTML = resultados.map((r, i) => {
      const cab = r.grupo !== grupo ? `<div class="be-results__group be-caps" role="presentation">${esc(r.grupo)}</div>` : '';
      grupo = r.grupo;
      const tipoNodo = BE.tipo(r.sel.tipo)?.nodo || 'evento';
      return `${cab}<div class="be-result${i === activo ? ' be-result--active' : ''}" role="option" id="res-${i}" aria-selected="${i === activo}" data-i="${i}">
        <span class="be-node be-node--${tipoNodo} be-node--sm" aria-hidden="true">${esc(r.titulo[0])}</span>
        <span class="res-texto"><span class="be-result__title">${marcar(r.titulo)}</span><span class="be-row__meta">${esc(r.meta || '')}</span></span></div>`;
    }).join('');
  }
  caja.hidden = false;
  q.setAttribute('aria-expanded', 'true');
  q.setAttribute('aria-activedescendant', resultados.length ? `res-${activo}` : '');
  $('#caja-busqueda').classList.add('be-search--focus');
}
function marcar(titulo) {
  const nq = norm($('#q').value).trim();
  const n = norm(titulo);
  const i = nq ? n.indexOf(nq) : -1;
  if (i < 0) return esc(titulo);
  return `${esc(titulo.slice(0, i))}<mark>${esc(titulo.slice(i, i + nq.length))}</mark>${esc(titulo.slice(i + nq.length))}`;
}
function cerrarResultados() {
  const caja = $('#resultados');
  caja.hidden = true;
  $('#q').setAttribute('aria-expanded', 'false');
  $('#caja-busqueda').classList.remove('be-search--focus');
}
function elegir(i) {
  const r = resultados[i];
  if (!r) return;
  $('#q').value = r.titulo;
  cerrarResultados();
  seleccionar(r.sel);
  $('#q').blur();
}
function iniciarBusqueda() {
  const q = $('#q');
  q.addEventListener('input', () => { resultados = buscar(q.value); activo = 0; pintarResultados(); });
  q.addEventListener('focus', () => { if (q.value.trim()) { resultados = buscar(q.value); pintarResultados(); } });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); activo = Math.min(activo + 1, resultados.length - 1); pintarResultados(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activo = Math.max(activo - 1, 0); pintarResultados(); }
    else if (e.key === 'Enter') { e.preventDefault(); elegir(activo); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); limpiarSeleccion(); q.blur(); }
  });
  q.addEventListener('blur', () => setTimeout(cerrarResultados, 150));
  $('#resultados').addEventListener('pointerdown', (e) => {
    const o = e.target.closest('[data-i]');
    if (o) { e.preventDefault(); elegir(+o.dataset.i); }
  });
  $('#filtro').addEventListener('click', limpiarSeleccion);
}

Object.assign(BE, { buscar, cerrarResultados, iniciarBusqueda });
})();
