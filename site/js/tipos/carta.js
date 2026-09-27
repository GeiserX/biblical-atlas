/* biblical-earth · tipo «carta»: ficha, búsqueda y lo que implica seleccionar una carta, más las ayudas de cartas que usan el mapa y la línea. Dueño durante el reparto: app-mapa. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, EXTERNO, fechaCorta, citas, tramo } = BE;

const cartasOrdenadas = () => [...BE.D.cartas].sort((a, b) => (a.fecha?.desde ?? 0) - (b.fecha?.desde ?? 0));
const abrCarta = (c) => (citas(c.referencia)[0]?.libro.abr) || c.libro;
const destinosCarta = (c) => (c.destinatarios?.lugares || []).filter((id) => BE.L[id]);
const origenesCarta = (c) => (c.escrita_en || []).filter((id) => BE.L[id]);
/** Añade una carta y sus lugares a lo que implica una selección. */
function anadirCarta(r, c) { r.claves.add(`carta:${c.id}`); origenesCarta(c).forEach((x) => r.lugares.add(x)); destinosCarta(c).forEach((x) => r.lugares.add(x)); }
const buscaCarta = (id) => BE.D.cartas.find((c) => c.id === id);

function fichaCarta(id) {
  const c = BE.D.cartas.find((x) => x.id === id);
  const orden = cartasOrdenadas().indexOf(c) + 1;
  const os = origenesCarta(c), ds = destinosCarta(c);
  const extremo = (etiqueta, ids, ctx, vacio) => `<div class="be-end">
      <div class="be-end__label">${etiqueta}</div>
      <div class="be-end__place">${ids.length ? ids.map((x) => `<button type="button" class="enlace-titulo" data-sel="lugar:${esc(x)}">${esc(BE.L[x].nombre)}</button>`).join(' <span class="be-muted">o</span> ') : esc(vacio)}</div>
      ${ctx?.resumen ? `<p class="be-end__text">${esc(ctx.resumen)}</p>` : ''}
      ${ctx?.fuentes?.length ? `<div class="fuentes-mini">${ctx.fuentes.map((f) => BE.D.fuentes[f]).filter(Boolean).map((f) => `<a href="${esc(f.url)}" ${EXTERNO}>${esc(f.titulo)}</a>`).join('')}</div>` : ''}
    </div>`;
  const cita = citas(c.referencia)[0];
  return `${BE.migas('Pablo', 'Cartas', c.libro)}${BE.cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="cabecera-carta"><span class="be-node be-node--texto be-node--lg" aria-hidden="true"><span class="icono-carta"></span></span>
        <div><h2 class="be-card__title">${esc(c.libro)}</h2><p class="be-card__sub">${orden}.ª de ${BE.D.cartas.length} por fecha · ${c.destinatarios?.texto ? `Destinatarios: ${esc(c.destinatarios.texto)}` : 'Destinatarios no indicados'}</p></div>
        <span class="be-chrono be-chrono--tnm">${esc(fechaCorta(c.fecha))}</span></div>
      <h3 class="be-card__eyebrow extremos-titulo">Qué pasaba en cada extremo en esta fecha</h3>
      <div class="be-ends">${extremo('Desde · escrita en', os, c.contexto_origen, 'sin lugar')}<div class="be-ends__arrow" aria-hidden="true">→</div>${extremo('Para · destino', ds, c.contexto_destino, 'destino no indicado')}</div>
      ${c.nota ? `<p class="be-card__body be-muted nota-carta">${esc(c.nota)}</p>` : ''}
      <div class="fila-chips">${BE.chipsCitas(c.referencia)}${c.fecha?.texto && c.fecha.texto !== fechaCorta(c.fecha) ? `<span class="be-chrono be-chrono--approx">${esc(c.fecha.texto)}</span>` : ''}</div>
      ${BE.enlacesHtml(c.enlaces)}
    </div><div class="be-card__foot">${BE.estadoHtml(c.estado)}<span class="be-spacer"></span>${cita ? `<a class="be-wol" href="${BE.urlCapitulo(cita.libro, 1)}" ${EXTERNO}>Leer ${esc(c.libro)} en wol.jw.org</a>` : ''}</div></section>
    ${BE.porQueHtml(c)}`;
}

BE.tipo('carta', {
  nodo: 'texto',
  existe: (id) => BE.D.cartas.some((c) => c.id === id),
  nombre: (id) => buscaCarta(id).libro,
  implicados(id, r) {
    const c = buscaCarta(id);
    anadirCarta(r, c);
    const tr = tramo(c.fecha);
    if (tr) BE.P.filter((s) => origenesCarta(c).includes(s.lugar.id) && s.b >= tr[0] - 0.5 && s.a <= tr[1] + 0.5).forEach((s) => BE.anadirParada(r, s));
  },
  momento: (id) => BE.momentoCarta(buscaCarta(id)),
  momentoImplicado: (id) => BE.momentoCarta(buscaCarta(id)),
  ficha: fichaCarta,
  buscar(q, nq, puntuar) {
    const out = [];
    for (const c of BE.D.cartas) {
      const cita = citas(c.referencia)[0];
      const pp = puntuar([c.libro, cita?.libro.abr, ...(cita?.libro.formas || [])]);
      if (pp) out.push({ grupo: 'Cartas', sel: { tipo: 'carta', id: c.id }, titulo: c.libro, meta: `${origenesCarta(c).map((x) => BE.L[x].nombre).join(' o ')} → ${destinosCarta(c).map((x) => BE.L[x].nombre).join(', ') || 'destino no indicado'} · ${fechaCorta(c.fecha)}`, puntos: pp });
    }
    return out;
  },
});

Object.assign(BE, { cartasOrdenadas, abrCarta, destinosCarta, origenesCarta, anadirCarta });
})();
