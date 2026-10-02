/* biblical-atlas · tipo «viaje»: ficha, búsqueda y lo que implica seleccionar un viaje. Dueño durante el reparto: app-tiempo. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, fechaCorta } = BE;

/** Paradas de un viaje: las de Pablo salen de BE.P; las de otra persona, de sus estancias. */
function paradasDe(v) {
  const quien = BE.duenoViaje(v);
  return (quien === 'pablo' ? BE.P : BE.estancias(quien)).filter((s) => s.viaje === v);
}
/** Filas de la ficha: todas las paradas del viaje en su orden. Cada una abre su parada, también la de un lugar sin
    punto (Mahanaim, Sodoma), que es una estancia como las demás. Si una parada no está entre las estancias de la
    persona (cae después de su muerte), lo que falta es su sitio en la línea de tiempo: abre su lugar y la fila lo dice. */
function filasParadas(v, ps) {
  const conPunto = new Map(ps.map((s) => [s.p, s]));
  return [...(v.paradas || [])].sort((a, b) => a.orden - b.orden).map((p, i) => {
    const s = conPunto.get(p);
    // Un destino en paralelo lo dice en su fila: no es la etapa que sigue a la de encima.
    const desde = p.branches_from != null ? BE.L[(v.paradas || []).find((x) => x.orden === p.branches_from)?.lugar]?.nombre : null;
    const paralelo = desde ? `en paralelo desde ${esc(desde)} · ` : '';
    if (s) return BE.botonSel(`parada:${s.key}`, `${i + 1}. ${s.lugar.nombre}`, `${paralelo}${esc(s.p.referencia)}${s.narrativa ? ' · fecha aproximada' : ` · ${esc(s.p.fecha?.texto || '')}`}`);
    const l = BE.L[p.lugar];
    return l ? BE.botonSel(`lugar:${l.id}`, `${i + 1}. ${l.nombre}`, `${paralelo}${esc(p.referencia || '')} · fuera de la línea de tiempo`) : '';
  });
}
/** Dónde va un acompañante que no hace todo el viaje: «de Listra a Berea y en Corinto». Vacío si va en todo. */
function tramosDe(v, id) {
  const lugar = (n) => BE.L[(v.paradas || []).find((p) => p.orden === n)?.lugar]?.nombre || `la parada ${n}`;
  return (v.tramos_companeros || []).filter((c) => c.persona === id)
    .map((c) => (c.desde === c.hasta ? `en ${lugar(c.desde)}` : `de ${lugar(c.desde)} a ${lugar(c.hasta)}`)).join(' y ');
}
function fichaViaje(id) {
  const v = BE.D.viajes.find((x) => x.id === id);
  const ps = paradasDe(v);
  const filas = filasParadas(v, ps);
  const comp = BE.acompanantes(v).map((x) => BE.PERS[x]).filter(Boolean);
  const tramo = (p) => { const t = tramosDe(v, p.id); return t ? ` <span class="be-muted">(${esc(t)})</span>` : ''; };
  return `${BE.migas(BE.nombreDueno(v, true), v.nombre)}${BE.cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow">${BE.esGrupo(BE.duenoViaje(v)) ? `Viaje ${esc(/^el /.test(v.grupo) ? `del ${v.grupo.slice(3)}` : `de ${v.grupo}`)}` : 'Viaje'} · ${filas.length} paradas</div>
      <h2 class="be-card__title">${esc(v.nombre)}</h2>
      ${v.resumen ? `<p class="be-card__body">${esc(v.resumen)}</p>` : ''}
      ${BE.frasesParalelos(v).map((f) => `<p class="be-card__sub paralelos">${esc(f.texto)}</p>`).join('')}
      ${comp.length ? `<p class="be-card__sub">Con ${comp.map((p) => `<button type="button" class="enlace-titulo" data-sel="persona:${esc(p.id)}">${esc(p.nombre)}</button>${tramo(p)}`).join(', ')}</p>` : ''}
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
