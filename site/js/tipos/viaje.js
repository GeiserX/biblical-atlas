/* biblical-atlas · tipo «viaje»: ficha, búsqueda y lo que implica seleccionar un viaje. Dueño durante el reparto: app-tiempo. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, fechaCorta } = BE;

/** Paradas de un viaje: las de Pablo salen de BE.P; las de otra persona, de sus estancias. */
function paradasDe(v) {
  const quien = v.persona || 'pablo';
  return (quien === 'pablo' ? BE.P : BE.estancias(quien)).filter((s) => s.viaje === v);
}
/** Filas de la ficha: todas las paradas del viaje en su orden. Cada una abre su parada, también la de un lugar sin
    punto (Mahanaim, Sodoma), que es una estancia como las demás. Si una parada no está entre las estancias de la
    persona (cae después de su muerte), lo que falta es su sitio en la línea de tiempo: abre su lugar y la fila lo dice. */
function filasParadas(v, ps) {
  const conPunto = new Map(ps.map((s) => [s.p, s]));
  return [...(v.paradas || [])].sort((a, b) => a.orden - b.orden).map((p, i) => {
    const s = conPunto.get(p);
    if (s) return BE.botonSel(`parada:${s.key}`, `${i + 1}. ${s.lugar.nombre}`, `${esc(s.p.referencia)}${s.narrativa ? ' · fecha aproximada' : ` · ${esc(s.p.fecha?.texto || '')}`}`);
    const l = BE.L[p.lugar];
    return l ? BE.botonSel(`lugar:${l.id}`, `${i + 1}. ${l.nombre}`, `${esc(p.referencia || '')} · fuera de la línea de tiempo`) : '';
  });
}
function fichaViaje(id) {
  const v = BE.D.viajes.find((x) => x.id === id);
  const ps = paradasDe(v);
  const filas = filasParadas(v, ps);
  const comp = (v.companeros || []).map((x) => BE.PERS[x]).filter(Boolean);
  return `${BE.migas(BE.PERS[v.persona || 'pablo']?.nombre || 'Pablo', v.nombre)}${BE.cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow">Viaje · ${filas.length} paradas</div>
      <h2 class="be-card__title">${esc(v.nombre)}</h2>
      ${v.resumen ? `<p class="be-card__body">${esc(v.resumen)}</p>` : ''}
      ${comp.length ? `<p class="be-card__sub">Con ${comp.map((p) => `<button type="button" class="enlace-titulo" data-sel="persona:${esc(p.id)}">${esc(p.nombre)}</button>`).join(', ')}</p>` : ''}
      <div class="fila-chips">${BE.chipsCitas(v.referencia)}<span class="be-chrono be-chrono--tnm">${esc(v.fecha?.texto || fechaCorta(v.fecha))}</span></div>
    </div></section>
    <section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Paradas</h3>
      <ol class="be-list paradas">${filas.map((f) => `<li>${f}</li>`).join('')}</ol></div></section>
    ${BE.porQueHtml({ razon: v.razon || 'La referencia del viaje enlaza el relato; cada parada lleva su propia fuente.', fuentes: v.fuentes })}`;
}

const buscaViaje = (id) => BE.D.viajes.find((v) => v.id === id);
BE.tipo('viaje', {
  nodo: 'persona',
  existe: (id) => BE.D.viajes.some((v) => v.id === id),
  nombre: (id) => buscaViaje(id).nombre,
  implicados(id, r) {
    r.claves.add(`viaje:${id}`);
    paradasDe(buscaViaje(id)).forEach((s) => BE.anadirParada(r, s));
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
BE.paradasDe = paradasDe;
})();
