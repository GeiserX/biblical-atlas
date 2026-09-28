/* biblical-earth · tipo «periodo»: ficha, búsqueda y lo que implica seleccionar un periodo (emperador, gobernador, potencia). Dueño durante el reparto: app-tiempo. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, fechaCorta, tramo } = BE;

function fichaPeriodo(id) {
  const p = BE.D.periodos.find((x) => x.id === id);
  const tipo = { emperador: 'Emperador', gobernador: 'Gobernador', potencia: 'Potencia' }[p.tipo] || p.tipo;
  return `${BE.migas('Periodos', p.nombre)}${BE.cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow">${esc(tipo)}</div>
      <h2 class="be-card__title">${esc(p.nombre)}</h2>
      ${p.resumen ? `<p class="be-card__body">${esc(p.resumen)}</p>` : ''}
      <div class="fila-chips"><span class="be-chrono be-chrono--tnm">${esc(p.fecha?.texto || fechaCorta(p.fecha))}</span>${(p.lugares || []).map((x) => BE.L[x] ? `<button type="button" class="be-chip" data-sel="lugar:${esc(x)}">${esc(BE.L[x].nombre)}</button>` : '').join('')}</div>
    </div><div class="be-card__foot">${BE.estadoHtml(p.estado)}</div></section>
    ${BE.porQueHtml(p)}`;
}

const buscaPeriodo = (id) => BE.D.periodos.find((p) => p.id === id);
BE.tipo('periodo', {
  nodo: 'periodo',
  existe: (id) => (BE.D.periodos || []).some((p) => p.id === id),
  nombre: (id) => buscaPeriodo(id).nombre,
  implicados(id, r) {
    const p = buscaPeriodo(id);
    r.claves.add(`periodo:${id}`); (p.lugares || []).forEach((x) => r.lugares.add(x));
  },
  // Salta al principio del periodo. No cuenta cuando lo implica otra selección (un lugar no salta a su gobernador).
  momento: (id) => { const tr = tramo(buscaPeriodo(id).fecha); return tr ? tr[0] + 0.01 : null; },
  ficha: fichaPeriodo,
  buscar(q, nq, puntuar) {
    const out = [];
    for (const p of BE.D.periodos || []) {
      const pp = puntuar([p.nombre]);
      if (pp) out.push({ grupo: 'Periodos', sel: { tipo: 'periodo', id: p.id }, titulo: p.nombre, meta: p.fecha?.texto || '', puntos: pp });
    }
    return out;
  },
});
})();
