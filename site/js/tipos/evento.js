/* biblical-atlas · tipo «evento»: ficha, búsqueda y lo que implica seleccionar un suceso. Aquí viven también las tarjetas
   de fecha que comparten las fichas de sucesos y periodos: cronología TNM principal, fecha secular como nota (C-02, C-04),
   cálculo nuestro sin verificar y la marca de precisión (C-05). Dueño durante el reparto: app-tiempo. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, fechaCorta, tramo, norm, EXTERNO } = BE;

/** Marca de precisión de una fecha, con las mismas letras que la tabla de los libros: c., a., d. (C-05). */
function precision(f) {
  if (!f) return null;
  const tx = norm(f.texto || '');
  if (f.tipo === 'derivada') return { s: '?', t: BE.t('cálculo nuestro, sin verificar') };
  if (/^a\.\s|^antes de/.test(tx)) return { s: 'a.', t: BE.t('antes de esta fecha') };
  if (/^d\.\s|^despues de/.test(tx)) return { s: 'd.', t: BE.t('después de esta fecha') };
  if (f.tipo === 'narrativa') return { s: 'c.', t: BE.t('orden seguro, fecha aproximada') };
  if (f.aprox) return { s: 'c.', t: BE.t('fecha aproximada') };
  return { s: '', t: BE.t('fecha exacta según la fuente') };
}
const marcaPrecision = (f) => { const p = precision(f); return p?.s ? `<span class="prec" title="${esc(p.t)}" aria-label="${esc(p.t)}">${esc(p.s)}</span>` : ''; };
/** «14 de nisán», «mes de tisri», «otoño», a partir de fecha.detalle. */
function detalleTexto(f) {
  const d = f?.detalle;
  if (!d) return '';
  const mes = d.mes && BE.D.calendario?.meses?.find((m) => m.id === d.mes);
  if (mes) {
    // El nombre de la época (Abib antes del exilio, Nisán después). Sebat, Adar y Veadar caen ya en el año siguiente al de su Nisán.
    const y = Number.isInteger(f.desde) ? f.desde - (mes.orden >= 11 ? 1 : 0) : null;
    const nombre = (y != null && BE.nombreMes ? BE.nombreMes(mes, y).nombre : mes.nombre).toLowerCase();
    return d.dia ? `${d.dia} de ${nombre}` : `mes de ${nombre}`;
  }
  return d.estacion || '';
}
const fuentesCortas = (ids) => (ids || []).map((id) => BE.D.fuentes[id]).filter(Boolean)
  .map((f) => `<a href="${esc(f.url)}" ${EXTERNO}><span class="be-tier be-tier--${f.nivel === 1 ? 1 : 2}" data-n="${f.nivel}"></span>${esc(f.titulo)}</a>`).join('');
/** Tarjetas de fecha de un suceso o un periodo. La TNM manda y mueve el cursor. La secular, si difiere más de un año, va
    en su tarjeta discontinua, como nota; si difiere un año o menos, en una línea. Nunca mueve el cursor sin avisar. */
function fechasHtml(o, momento) {
  const f = o.fecha;
  if (!f) return '';
  const tr = tramo(f);
  const det = detalleTexto(f);
  const pr = precision(f);
  const calc = f.tipo === 'derivada';
  const t = momento ?? (tr ? (tr[0] + tr[1]) / 2 : null);
  const tarjetas = [`<button type="button" class="fecha-tarjeta fecha-tnm${calc ? ' fecha-calculo' : ''}" ${t != null ? `data-ir-t="${t}"` : ''} title="${esc(BE.t('Llevar el cursor a esta fecha'))}">
      <span class="fecha-eyebrow">${BE.t(calc ? 'Cálculo nuestro · sin verificar' : 'Fecha según la fuente')}</span>
      <span class="fecha-grande${(f.texto || '').length > 16 ? ' fecha-grande--larga' : ''}">${marcaPrecision(f)}${esc(f.texto || fechaCorta(f))}</span>
      <span class="fecha-sub">${esc([det, pr?.t].filter(Boolean).join(' · '))}</span>
      ${calc && f.nota ? `<span class="fecha-nota">${esc(f.nota)}</span>` : ''}</button>`];
  const notas = [];
  const alts = BE.lineaEstado?.secular === false ? [] : (o.alternativas || []).filter((a) => a.fecha && tramo(a.fecha));
  for (const a of alts) {
    const ta = tramo(a.fecha);
    const dif = tr ? Math.round(ta[0] - tr[0]) : 0;
    const cuanto = dif ? `${Math.abs(dif)} ${Math.abs(dif) === 1 ? 'año' : 'años'} ${dif > 0 ? 'después' : 'antes'}` : '';
    if (Math.abs(dif) <= 1) {
      notas.push(`<p class="fecha-linea"><span class="be-chrono be-chrono--secular">secular: ${esc(a.fecha.texto || fechaCorta(a.fecha))}</span> ${esc(a.nota || '')}</p>`);
      continue;
    }
    tarjetas.push(`<button type="button" class="fecha-tarjeta fecha-secular" data-ir-secular="${(ta[0] + ta[1]) / 2}" title="Ver esta fecha en la línea (solo como nota)">
      <span class="fecha-eyebrow">Fecha secular · nota</span>
      <span class="fecha-grande${(a.fecha.texto || '').length > 16 ? ' fecha-grande--larga' : ''}">${esc(a.fecha.texto || fechaCorta(a.fecha))}</span>
      <span class="fecha-sub">${esc(cuanto)}</span>
      ${a.nota ? `<span class="fecha-nota">${esc(a.nota)}</span>` : ''}</button>`);
    if (a.fuentes?.length) notas.push(`<p class="fecha-linea fecha-fuentes">Fuente de la nota secular: ${fuentesCortas(a.fuentes)}</p>`);
  }
  return `<div class="fechas${tarjetas.length > 1 ? ' fechas--dos' : ''}">${tarjetas.join('')}</div>${notas.join('')}
    ${alts.length ? '<p class="fecha-regla">Usamos la fecha de la cronología de la Traducción del Nuevo Mundo. La otra se enseña como nota y no mueve el cursor.</p>' : ''}`;
}

/** El plazo desde el suceso anterior del relato (orden_relato.elapsed): con su razón. Sin cifra, dice que el texto no la
    da y que el día de la línea solo enseña el orden. */
function plazoHtml(e) {
  const el = e.orden_relato?.elapsed;
  if (!el) return '';
  const cifra = ['days', 'months', 'years'].some((k) => typeof el[k] === 'number');
  return `<p class="fecha-linea plazo-relato">${cifra ? 'Plazo que da el texto' : 'El texto no da cuánto tiempo pasa desde el suceso anterior; en la línea va un día después, solo para que se vea el orden'}. ${esc(el.reason || '')}</p>`;
}

function fichaEvento(id) {
  const e = BE.D.eventos.find((x) => x.id === id);
  const personas = (e.personas || []).filter((x) => BE.PERS[x]);
  const lugar = BE.L[(e.lugares || [])[0]];
  return `${BE.migas(lugar ? lugar.nombre : BE.t('Sucesos'), e.titulo)}${BE.cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow">${BE.t('Suceso')}${BE.eventoEstimado(e) ? BE.t(' · fecha estimada') : ''}</div>
      <h2 class="be-card__title">${esc(e.titulo)}</h2>
      ${e.resumen ? `<p class="be-card__body">${esc(e.resumen)}</p>` : ''}
      <div class="fila-chips">${BE.chipsCitas((e.pasajes || []).join('; '))}${(e.lugares || []).map((x) => BE.L[x] ? `<button type="button" class="be-chip" data-sel="lugar:${esc(x)}">${esc(BE.L[x].nombre)}</button>` : '').join('')}</div>
      ${personas.length ? `<div class="fila-chips">${personas.map((x) => `<button type="button" class="be-chip" data-sel="persona:${esc(x)}"><span class="be-chip__dot" style="background:${BE.colorPersona(x)}"></span>${esc(BE.PERS[x].nombre)}</button>`).join('')}</div>` : ''}
    </div><div class="be-card__foot">${BE.estadoHtml(e.estado)}</div></section>
    <section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">${BE.t('Cuándo')}</h3>${fechasHtml(e, BE.momentoEvento(e))}${plazoHtml(e)}</div></section>
    ${BE.porQueHtml(e, BE.notaHtml(e.nota))}`;
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
      const pp = puntuar([e.titulo, e.buscar, ...(e._es || [])].filter(Boolean));
      if (pp) out.push({ grupo: 'Sucesos', sel: { tipo: 'evento', id: e.id }, titulo: e.titulo, meta: e.fecha?.texto || '', puntos: pp });
    }
    return out;
  },
});

// Las tarjetas de fecha llevan el cursor: la TNM directamente; la secular, con un aviso de que es solo una nota.
document.addEventListener('click', (ev) => {
  const tnm = ev.target.closest('[data-ir-t]');
  if (tnm) { const t = +tnm.dataset.irT; BE.setT(t); BE.asegurarVisible(t, true); return; }
  const sec = ev.target.closest('[data-ir-secular]');
  if (sec) {
    const t = +sec.dataset.irSecular;
    BE.setT(t); BE.asegurarVisible(t, true);
    BE.avisar('Fecha secular, solo como nota: seguimos la cronología de la Traducción del Nuevo Mundo.');
  }
});

Object.assign(BE, { fechasHtml, marcaPrecision, precisionFecha: precision, detalleFecha: detalleTexto });
})();
