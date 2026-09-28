/* biblical-earth · tipo «evento»: ficha, búsqueda y lo que implica seleccionar un suceso. Dueño durante el reparto: app-tiempo. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, fechaCorta } = BE;

function fichaEvento(id) {
  const e = BE.D.eventos.find((x) => x.id === id);
  return `${BE.migas('Sucesos', e.titulo)}${BE.cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow">Suceso</div>
      <h2 class="be-card__title">${esc(e.titulo)}</h2>
      ${e.resumen ? `<p class="be-card__body">${esc(e.resumen)}</p>` : ''}
      <div class="fila-chips">${BE.chipsCitas((e.pasajes || []).join('; '))}<span class="be-chrono be-chrono--tnm">${esc(e.fecha?.texto || fechaCorta(e.fecha))}</span>${(e.lugares || []).map((x) => BE.L[x] ? `<button type="button" class="be-chip" data-sel="lugar:${esc(x)}">${esc(BE.L[x].nombre)}</button>` : '').join('')}</div>
    </div><div class="be-card__foot">${BE.estadoHtml(e.estado)}</div></section>
    ${BE.porQueHtml(e)}`;
}

const buscaEvento = (id) => BE.D.eventos.find((e) => e.id === id);
BE.tipo('evento', {
  nodo: 'evento',
  existe: (id) => (BE.D.eventos || []).some((e) => e.id === id),
  nombre: (id) => buscaEvento(id).titulo,
  implicados(id, r) {
    const e = buscaEvento(id);
    r.claves.add(`evento:${id}`); (e.lugares || []).forEach((x) => r.lugares.add(x));
  },
  momento: (id) => BE.momentoEvento(buscaEvento(id)),
  momentoImplicado: (id) => BE.momentoEvento(buscaEvento(id)),
  ficha: fichaEvento,
  buscar(q, nq, puntuar) {
    const out = [];
    for (const e of BE.D.eventos || []) {
      const pp = puntuar([e.titulo]);
      if (pp) out.push({ grupo: 'Sucesos', sel: { tipo: 'evento', id: e.id }, titulo: e.titulo, meta: e.fecha?.texto || '', puntos: pp });
    }
    return out;
  },
});
})();
