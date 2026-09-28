/* biblical-earth · tipo «periodo»: ficha, búsqueda y lo que implica seleccionar un periodo (era, imperio, emperador, rey,
   gobernador, sumo sacerdote). La ficha de una era o un imperio (F-09) da sus fechas, sus gobernantes en orden, las
   personas y los sucesos de ese tiempo, y abre la sincronía (A-12). Dueño durante el reparto: app-tiempo. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, fechaCorta, tramo } = BE;

const TIPOS = { emperador: 'Emperador', gobernador: 'Gobernador', potencia: 'Imperio', rey: 'Rey', era: 'Era', 'sumo-sacerdote': 'Sumo sacerdote' };
const solapa = (f, tr) => { const x = f && tramo(f); return !!x && x[1] > tr[0] && x[0] < tr[1]; };
function fichaPeriodo(id) {
  const p = BE.D.periodos.find((x) => x.id === id);
  const tipo = TIPOS[p.tipo] || p.tipo;
  const tr = BE.tramoPeriodo(p);   // una potencia con un extremo sin fecha llega hasta la vecina
  const amplio = p.tipo === 'era' || p.tipo === 'potencia';
  const secciones = [];
  if (amplio && tr) {
    const gob = BE.D.periodos.filter((x) => (x.tipo === 'rey' || x.tipo === 'emperador') && solapa(x.fecha, tr)).sort((a, b) => tramo(a.fecha)[0] - tramo(b.fecha)[0]);
    if (gob.length) secciones.push(`<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Gobernantes en orden <b class="cuenta">${gob.length}</b></h3>
      <div class="be-list">${gob.slice(0, 30).map((x) => BE.botonSel(`periodo:${x.id}`, x.nombre, esc(x.fecha.texto || fechaCorta(x.fecha)))).join('')}</div></div></section>`);
    const personas = Object.values(BE.PERS).filter((x) => solapa(x.fecha, tr) || BE.estancias(x.id).some((s) => s.b > tr[0] && s.a < tr[1]))
      .sort((a, b) => (tramo(a.fecha)?.[0] ?? 1e9) - (tramo(b.fecha)?.[0] ?? 1e9));
    if (personas.length) secciones.push(`<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Personas de este tiempo <b class="cuenta">${personas.length}</b></h3>
      <div class="fila-chips">${personas.slice(0, 40).map((x) => `<button type="button" class="be-chip" data-sel="persona:${esc(x.id)}"><span class="be-chip__dot" style="background:${BE.colorPersona(x.id)}"></span>${esc(x.nombre)}</button>`).join('')}</div></div></section>`);
    const sucesos = (BE.D.eventos || []).map((e) => ({ e, m: BE.momentoEvento(e) })).filter((x) => x.m != null && x.m >= tr[0] && x.m < tr[1]).sort((a, b) => a.m - b.m);
    if (sucesos.length) secciones.push(`<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Sucesos <b class="cuenta">${sucesos.length}</b></h3>
      <div class="be-list">${sucesos.slice(0, 12).map(({ e }) => BE.botonSel(`evento:${e.id}`, e.titulo, esc(e.fecha?.texto || ''))).join('')}</div>
      ${sucesos.length > 12 ? `<p class="be-muted">Y ${sucesos.length - 12} más en la línea de tiempo.</p>` : ''}</div></section>`);
  }
  // Para un rey o un gobernador, la sincronía se abre en el imperio que lo contiene.
  const contiene = (x) => { const tx = x.tipo === 'potencia' && tr && BE.tramoPeriodo(x); return !!tx && tx[1] > tr[0] && tx[0] < tr[0] + 0.5; };
  const epoca = amplio ? p : BE.D.periodos.filter(contiene).sort((a, b) => !!BE.tramoPeriodo(a).abierto - !!BE.tramoPeriodo(b).abierto)[0];
  const persona = p.persona && BE.PERS[p.persona];
  return `${BE.migas('Periodos', tipo, p.nombre)}${BE.cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow">${esc(tipo)}</div>
      <h2 class="be-card__title">${esc(p.nombre)}</h2>
      ${persona ? `<p class="be-card__sub"><button type="button" class="enlace-titulo" data-sel="persona:${esc(persona.id)}">${esc(persona.nombre)}</button></p>` : ''}
      ${p.resumen ? `<p class="be-card__body">${esc(p.resumen)}</p>` : ''}
      <div class="fila-chips">${(p.lugares || []).map((x) => BE.L[x] ? `<button type="button" class="be-chip" data-sel="lugar:${esc(x)}">${esc(BE.L[x].nombre)}</button>` : '').join('')}</div>
      <div class="fila-chips">
        ${tr ? `<button type="button" class="be-btn be-btn--sm" data-encuadrar="${tr[0]}~${tr[1]}">Ver este tramo en la línea</button>` : ''}
        ${epoca && BE.sincronia ? `<button type="button" class="be-btn be-btn--sm" data-sinc-abrir="${esc(epoca.id)}">¿Quién había? Sincronía</button>` : ''}
      </div>
    </div><div class="be-card__foot">${BE.estadoHtml(p.estado)}</div></section>
    <section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Cuándo</h3>${BE.fechasHtml(p, tr ? tr[0] + 0.01 : null)}</div></section>
    ${secciones.join('')}
    ${BE.porQueHtml(p, BE.notaHtml(p.nota))}`;
}

const buscaPeriodo = (id) => BE.D.periodos.find((p) => p.id === id);
BE.tipo('periodo', {
  nodo: 'periodo',
  existe: (id) => (BE.D.periodos || []).some((p) => p.id === id),
  nombre: (id) => buscaPeriodo(id).nombre,
  implicados(id, r) {
    const p = buscaPeriodo(id);
    r.claves.add(`periodo:${id}`); (p.lugares || []).forEach((x) => r.lugares.add(x));
  },
  // Salta al principio del periodo. No cuenta cuando lo implica otra selección (un lugar no salta a su gobernador).
  momento: (id) => { const tr = tramo(buscaPeriodo(id).fecha); return tr ? tr[0] + 0.01 : null; },
  ficha: fichaPeriodo,
  buscar(q, nq, puntuar) {
    const out = [];
    for (const p of BE.D.periodos || []) {
      const pp = puntuar([p.nombre, p.buscar].filter(Boolean));
      if (pp) out.push({ grupo: 'Periodos', sel: { tipo: 'periodo', id: p.id }, titulo: p.nombre, meta: `${TIPOS[p.tipo] || p.tipo} · ${p.fecha?.texto || ''}`, puntos: pp });
    }
    return out;
  },
});

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-encuadrar]');
  if (!b) return;
  const [a, z] = b.dataset.encuadrar.split('~').map(Number);
  BE.encuadrarTiempo(a, z);
});
})();
