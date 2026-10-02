/* biblical-atlas · tipo «parada»: cada parada de un viaje de Pablo: su ficha y lo que implica. Dueño durante el reparto: app-tiempo. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, EXTERNO, fechaCorta, citas } = BE;

/** Añade una parada y su lugar a lo que implica una selección. */
function anadirParada(r, s) { r.claves.add(`parada:${s.key}`); r.lugares.add(s.lugar.id); }
/** Una parada de Pablo o, si no, de los viajes de otra persona. */
const buscaParada = (id) => BE.P.find((x) => x.key === id)
  || BE.D.viajes.filter((v) => BE.duenoViaje(v) !== 'pablo').flatMap((v) => BE.paradasDe(v)).find((x) => x.key === id);
const momentoParada = (id) => { const s = buscaParada(id); return (s.a + s.b) / 2; };

function fichaParada(s, w) {
  const v = s.viaje;
  const ordinal = `Parada ${s.i + 1} de ${s.n}`;
  const enCamino = w && !w.parada && w.sig;
  const eyebrow = w ? (enCamino ? `${ordinal} · De camino a ${w.sig.lugar.nombre}` : `${ordinal} · Dónde está ${BE.nombreDueno(v)}`) : ordinal;
  const f = s.p.fecha || {};
  const comp = (v.companeros || []).map((id) => BE.PERS[id]).filter(Boolean);
  const quien = BE.nombreDueno(v, true);
  return `${BE.migas(quien, v.nombre, s.lugar.nombre)}${E.sel ? BE.cerrarHtml() : ''}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow"><span class="icono-lugar" aria-hidden="true"></span>${esc(eyebrow)}</div>
      <h2 class="be-card__title"><button type="button" class="enlace-titulo" data-sel="lugar:${esc(s.lugar.id)}">${esc(s.lugar.nombre)}</button></h2>
      ${BE.nombresHtml(s.lugar)}
      ${s.p.nota ? `<p class="be-card__body">${esc(s.p.nota)}</p>` : ''}
      ${s.lugar.resumen ? `<p class="be-card__body be-muted">${esc(s.lugar.resumen)}</p>` : ''}
      <div class="fila-chips">${BE.chipsCitas(s.p.referencia)}<span class="be-chrono be-chrono--tnm">${esc(s.narrativa ? fechaCorta(f) : (f.texto || fechaCorta(f)))}</span>
      ${s.narrativa ? '<span class="be-chrono be-chrono--approx">orden seguro, fecha aproximada</span>' : ''}</div>
      ${enCamino ? `<div class="be-list">${BE.botonSel(`parada:${w.sig.key}`, `Siguiente: ${w.sig.lugar.nombre}`, esc(w.sig.p.referencia))}</div>` : ''}
    </div><div class="be-card__foot">${BE.estadoHtml(s.p.estado)}<span class="be-spacer"></span>${citas(s.p.referencia)[0] ? `<a class="be-wol" href="${BE.urlCita(citas(s.p.referencia)[0])}" ${EXTERNO}>Leer en jw.org</a>` : ''}</div></section>
    ${comp.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Con ${esc(BE.nombreDueno(v))} en este viaje</h3>
      <div class="companeros">${comp.map((p) => `<button type="button" class="companero" data-sel="persona:${esc(p.id)}"><span class="be-node be-node--persona be-node--sm">${esc(p.nombre[0])}</span><span><b>${esc(p.nombre)}</b><span class="be-row__meta">${esc(p.resumen)}</span></span></button>`).join('')}</div></div></section>` : ''}
    ${BE.porQueHtml(s.p)}
    ${BE.videosHtml(s.lugar.id)}
    ${!E.sel ? BE.cartasCercaHtml() : ''}`;
}

BE.tipo('parada', {
  existe: (id) => !!buscaParada(id),
  nombre: (id) => { const s = buscaParada(id); return `${s.lugar.nombre} (${s.p.referencia})`; },
  implicados(id, r) {
    const s = buscaParada(id);
    anadirParada(r, s); r.claves.add(`viaje:${s.viaje.id}`);
  },
  momento: momentoParada,
  momentoImplicado: momentoParada,
  ficha: (id) => fichaParada(buscaParada(id), null),
});

Object.assign(BE, { anadirParada, fichaParada });
})();
