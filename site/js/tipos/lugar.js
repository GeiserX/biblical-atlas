/* biblical-earth · tipo «lugar»: ficha, búsqueda y lo que implica seleccionar un lugar. Dueño durante el reparto: app-mapa. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, EXTERNO, fechaCorta } = BE;

function fichaLugar(id) {
  const l = BE.L[id];
  const paradas = BE.P.filter((s) => s.lugar.id === id);
  const cartasDe = BE.D.cartas.filter((c) => BE.origenesCarta(c).includes(id));
  const cartasA = BE.D.cartas.filter((c) => BE.destinosCarta(c).includes(id));
  const tipo = { ciudad: 'Ciudad', region: 'Región', isla: 'Isla', provincia: 'Provincia', puerto: 'Puerto', cabo: 'Cabo' }[l.tipo] || l.tipo;
  const prec = { punto: '', zona: ' · región: el punto solo la representa', incierto: ' · ubicación incierta' }[l.precision] || '';
  return `${BE.migas('Lugares', l.nombre)}${BE.cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow"><span class="icono-lugar" aria-hidden="true"></span>${esc(tipo + prec)}</div>
      <h2 class="be-card__title">${esc(l.nombre)}</h2>
      ${BE.nombresHtml(l)}
      ${l.resumen ? `<p class="be-card__body">${esc(l.resumen)}</p>` : ''}
      ${BE.enlacesHtml(l.enlaces)}
    </div><div class="be-card__foot">${BE.estadoHtml(l.estado)}<span class="be-spacer"></span>${l.coord_url ? `<a class="be-wol" href="${esc(l.coord_url)}" ${EXTERNO}>Coordenada: ${/^openbible/.test(l.coord_fuente || '') ? 'OpenBible.info' : esc(String(l.coord_fuente || 'fuente').split(':')[0])}</a>` : ''}</div></section>
    ${paradas.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Pablo estuvo aquí <b class="cuenta">${paradas.length}</b></h3>
      <div class="be-list">${paradas.map((s) => BE.botonSel(`parada:${s.key}`, s.viaje.nombre, `${esc(s.p.referencia)} · ${esc(s.narrativa ? `${fechaCorta(s.p.fecha)}, fecha aproximada` : (s.p.fecha?.texto || ''))}`)).join('')}</div></div></section>` : ''}
    ${cartasDe.length || cartasA.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Cartas</h3>
      <div class="be-list">${cartasDe.map((c) => BE.botonSel(`carta:${c.id}`, `${c.libro}, escrita aquí`, esc(fechaCorta(c.fecha)))).join('')}${cartasA.map((c) => BE.botonSel(`carta:${c.id}`, `${c.libro}, enviada aquí`, esc(fechaCorta(c.fecha)))).join('')}</div></div></section>` : ''}
    ${BE.porQueHtml(l)}
    ${BE.videosHtml(id)}`;
}

BE.tipo('lugar', {
  nodo: 'lugar',
  existe: (id) => !!BE.L[id],
  nombre: (id) => BE.L[id].nombre,
  implicados(id, r) {
    r.lugares.add(id);
    BE.P.filter((s) => s.lugar.id === id).forEach((s) => BE.anadirParada(r, s));
    BE.D.cartas.filter((c) => BE.origenesCarta(c).includes(id) || BE.destinosCarta(c).includes(id)).forEach((c) => BE.anadirCarta(r, c));
    (BE.D.eventos || []).filter((e) => (e.lugares || []).includes(id)).forEach((e) => r.claves.add(`evento:${e.id}`));
    (BE.D.periodos || []).filter((p) => (p.lugares || []).includes(id)).forEach((p) => r.claves.add(`periodo:${p.id}`));
  },
  ficha: fichaLugar,
  buscar(q, nq, puntuar) {
    const out = [];
    for (const l of Object.values(BE.L)) {
      const p = puntuar([l.nombre, ...(l.nombres || []).map((n) => n.nombre)]);
      if (p) out.push({ grupo: 'Lugares', sel: { tipo: 'lugar', id: l.id }, titulo: l.nombre, meta: [BE.nombreHoy(l) ? `hoy ${BE.nombreHoy(l)}` : '', `${BE.P.filter((s) => s.lugar.id === l.id).length} paradas`].filter(Boolean).join(' · '), puntos: p });
    }
    return out;
  },
});
})();
