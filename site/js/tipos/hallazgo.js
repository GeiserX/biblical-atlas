/* biblical-atlas · tipo «hallazgo» (F-07): qué es, dónde se encontró, qué fecha tiene el objeto, con qué conecta y lo que
   no afirmamos (F-08). `identificacion: incierta` pone la insignia; `no_afirmamos` (lista de frases, como en personas)
   va a «Lo que el texto no dice»; `donde_hoy`, si está, sale como «Dónde está hoy». Una fuente de nivel 2 solo acompaña a una de nivel 1. Dueño durante el reparto: app-mapa. */
'use strict';
(() => {
const BE = window.BE;
const { esc, fechaCorta, tramo } = BE;

const busca = (id) => (BE.D.hallazgos || []).find((h) => h.id === id);
const momento = (h) => { const tr = tramo(h.fecha_objeto); return tr ? (tr[0] + tr[1]) / 2 : null; };
/** Selecciones que relaciona el hallazgo y que existen en los datos. */
const relacionados = (h) => (h.relaciona || []).map((s) => BE.parseSel(s)).filter(Boolean);

function fichaHallazgo(id) {
  const h = busca(id);
  const l = BE.L[h.lugar_hallazgo];
  const rel = relacionados(h);
  const pasajes = rel.filter((s) => s.tipo === 'pasaje');
  const otros = rel.filter((s) => s.tipo !== 'pasaje');
  const incierta = h.identificacion === 'incierta';
  return `${BE.migas('Hallazgos', h.nombre)}${BE.cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow"><span class="be-node be-node--hallazgo be-node--sm" aria-hidden="true">H</span> Hallazgo arqueológico</div>${incierta ? '<span class="insignia-incierta">identificación incierta</span>' : ''}
      <h2 class="be-card__title">${esc(h.nombre)}</h2>
      ${h.resumen ? `<p class="be-card__body">${esc(h.resumen)}</p>` : ''}
      <dl class="be-kv hallazgo-kv">
        <dt>Dónde se encontró</dt><dd>${l ? `<button type="button" class="enlace-titulo" data-sel="lugar:${esc(l.id)}">${esc(l.nombre)}</button>` : 'sin lugar'}</dd>
        ${h.donde_hoy ? `<dt>Dónde está hoy</dt><dd>${esc(h.donde_hoy)}</dd>` : ''}
        <dt>Fecha del objeto</dt><dd><span class="be-chrono be-chrono--tnm">${esc(h.fecha_objeto?.texto || fechaCorta(h.fecha_objeto) || 'sin fecha')}</span></dd>
        ${otros.length ? `<dt>Con qué conecta</dt><dd class="conecta">${otros.map((s) => `<button type="button" class="be-chip" data-sel="${esc(BE.selTexto(s))}">${esc(BE.nombreSel(s))}</button>`).join('')}</dd>` : ''}
      </dl>
      ${pasajes.length ? `<div class="fila-chips">${pasajes.map((s) => `<button type="button" class="be-ref" data-sel="${esc(BE.selTexto(s))}">${esc(BE.nombreSel(s))}</button>`).join('')}</div>` : ''}
      ${BE.enlacesHtml(h.enlaces)}
    </div><div class="be-card__foot">${BE.estadoHtml(h.estado)}<span class="be-spacer"></span>${BE.insigniaHtml(h.fuentes)}</div></section>
    ${BE.noSabemosHtml([...(incierta ? ['No sabemos con seguridad a quién o a qué se refiere: la identificación es incierta.'] : []), ...(h.no_afirmamos || [])])}
    ${BE.porQueHtml(h)}`;
}

BE.tipo('hallazgo', {
  nodo: 'hallazgo',
  existe: (id) => !!busca(id),
  nombre: (id) => busca(id).nombre,
  implicados(id, r) {
    const h = busca(id);
    r.claves.add(`hallazgo:${id}`);
    if (BE.L[h.lugar_hallazgo]) r.lugares.add(h.lugar_hallazgo);
    for (const s of relacionados(h)) {
      if (s.tipo === 'lugar') r.lugares.add(s.id);
      else if (s.tipo === 'carta') { const c = BE.D.cartas.find((x) => x.id === s.id); if (c) BE.anadirCarta(r, c); }
      else if (s.tipo !== 'hallazgo') r.claves.add(BE.selTexto(s));
    }
  },
  momento: (id) => momento(busca(id)),
  momentoImplicado: (id) => momento(busca(id)),
  ficha: fichaHallazgo,
  buscar(q, nq, puntuar) {
    const out = [];
    for (const h of BE.D.hallazgos || []) {
      const p = puntuar([h.nombre, BE.L[h.lugar_hallazgo]?.nombre]);
      if (p) out.push({ grupo: 'Hallazgos', sel: { tipo: 'hallazgo', id: h.id }, titulo: h.nombre, meta: `${BE.L[h.lugar_hallazgo]?.nombre || ''} · ${h.fecha_objeto?.texto || fechaCorta(h.fecha_objeto)}`, puntos: p });
    }
    return out;
  },
});
})();
