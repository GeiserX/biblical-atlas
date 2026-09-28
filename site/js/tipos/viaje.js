/* biblical-earth · tipo «viaje»: ficha, búsqueda y lo que implica seleccionar un viaje. Dueño durante el reparto: app-tiempo. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, fechaCorta } = BE;

function fichaViaje(id) {
  const v = BE.D.viajes.find((x) => x.id === id);
  const ps = BE.P.filter((s) => s.viaje === v);
  const comp = (v.companeros || []).map((x) => BE.PERS[x]).filter(Boolean);
  return `${BE.migas('Pablo', v.nombre)}${BE.cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow">Viaje · ${ps.length} paradas</div>
      <h2 class="be-card__title">${esc(v.nombre)}</h2>
      ${v.resumen ? `<p class="be-card__body">${esc(v.resumen)}</p>` : ''}
      ${comp.length ? `<p class="be-card__sub">Con ${comp.map((p) => `<button type="button" class="enlace-titulo" data-sel="persona:${esc(p.id)}">${esc(p.nombre)}</button>`).join(', ')}</p>` : ''}
      <div class="fila-chips">${BE.chipsCitas(v.referencia)}<span class="be-chrono be-chrono--tnm">${esc(v.fecha?.texto || fechaCorta(v.fecha))}</span></div>
    </div></section>
    <section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Paradas</h3>
      <ol class="be-list paradas">${ps.map((s) => `<li>${BE.botonSel(`parada:${s.key}`, `${s.i + 1}. ${s.lugar.nombre}`, `${esc(s.p.referencia)}${s.narrativa ? ' · fecha aproximada' : ` · ${esc(s.p.fecha?.texto || '')}`}`)}</li>`).join('')}</ol></div></section>
    ${BE.porQueHtml({ razon: v.razon || 'La referencia del viaje enlaza el relato; cada parada lleva su propia fuente.', fuentes: v.fuentes })}`;
}

const buscaViaje = (id) => BE.D.viajes.find((v) => v.id === id);
BE.tipo('viaje', {
  nodo: 'persona',
  existe: (id) => BE.D.viajes.some((v) => v.id === id),
  nombre: (id) => buscaViaje(id).nombre,
  implicados(id, r) {
    r.claves.add(`viaje:${id}`);
    BE.P.filter((s) => s.viaje.id === id).forEach((s) => BE.anadirParada(r, s));
  },
  ficha: fichaViaje,
  buscar(q, nq, puntuar) {
    const out = [];
    for (const v of BE.D.viajes) {
      const pp = puntuar([v.nombre]);
      if (pp) out.push({ grupo: 'Viajes', sel: { tipo: 'viaje', id: v.id }, titulo: v.nombre, meta: `${v.referencia} · ${fechaCorta(v.fecha)}`, puntos: pp });
    }
    return out;
  },
});
})();
