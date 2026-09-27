/* biblical-earth · tipo «persona»: ficha, búsqueda y lo que implica seleccionar una persona. Dueño durante el reparto: app-estudio. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, fechaCorta } = BE;

function fichaPersona(id) {
  const p = BE.PERS[id];
  const viajes = BE.D.viajes.filter((v) => v.persona === id || (v.companeros || []).includes(id));
  return `${BE.migas('Personas', p.nombre)}${BE.cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="cabecera-carta"><span class="be-node be-node--persona be-node--lg" aria-hidden="true">${esc(p.nombre[0])}</span>
      <div><h2 class="be-card__title">${esc(p.nombre)}</h2>${BE.nombresHtml(p)}</div></div>
      ${p.resumen ? `<p class="be-card__body">${esc(p.resumen)}</p>` : ''}
      ${BE.enlacesHtml(p.enlaces)}
    </div><div class="be-card__foot">${BE.estadoHtml(p.estado)}</div></section>
    ${viajes.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">${id === 'pablo' ? 'Sus viajes' : 'Con Pablo'}</h3>
      <div class="be-list">${viajes.map((v) => BE.botonSel(`viaje:${v.id}`, v.nombre, `${esc(v.referencia)} · ${esc(fechaCorta(v.fecha))}`)).join('')}</div></div></section>` : ''}
    ${id === 'pablo' ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Sus cartas <b class="cuenta">${BE.D.cartas.length}</b></h3>
      <div class="be-list">${BE.cartasOrdenadas().map((c) => BE.botonSel(`carta:${c.id}`, c.libro, esc(fechaCorta(c.fecha)))).join('')}</div></div></section>` : ''}
    ${BE.porQueHtml(p)}`;
}

BE.tipo('persona', {
  nodo: 'persona',
  existe: (id) => !!BE.PERS[id],
  nombre: (id) => BE.PERS[id].nombre,
  implicados(id, r) {
    const viajes = BE.D.viajes.filter((v) => v.persona === id || (v.companeros || []).includes(id));
    viajes.forEach((v) => { r.claves.add(`viaje:${v.id}`); BE.P.filter((s) => s.viaje === v).forEach((s) => BE.anadirParada(r, s)); });
    if (id === 'pablo') BE.D.cartas.forEach((c) => BE.anadirCarta(r, c));
    (BE.D.eventos || []).filter((e) => (e.personas || []).includes(id)).forEach((e) => r.claves.add(`evento:${e.id}`));
  },
  ficha: fichaPersona,
  buscar(q, nq, puntuar) {
    const out = [];
    for (const p of Object.values(BE.PERS)) {
      const pp = puntuar([p.nombre, ...(p.nombres || []).map((n) => n.nombre)]);
      if (pp) out.push({ grupo: 'Personas', sel: { tipo: 'persona', id: p.id }, titulo: p.nombre, meta: p.resumen, puntos: pp });
    }
    return out;
  },
});
})();
