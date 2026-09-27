/* biblical-earth · tipo «pasaje»: un capítulo de la Biblia («pasaje:hch-16»): ficha, búsqueda («Hch 16») y lo que cuenta en el mapa y la línea. Dueño durante el reparto: app-estudio. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, EXTERNO, fechaCorta, norm, citas, libro, implicados } = BE;

function pasajeDeId(id) {
  const m = String(id).match(/^([123]?[a-z]+)-(\d+)$/);
  if (!m) return null;
  const lib = BE.LIBROS.find((l) => norm(l.abr) === m[1]);
  return lib ? { libro: lib, cap: +m[2] } : null;
}
const idPasaje = (lib, cap) => `${norm(lib.abr)}-${cap}`;
function citaCubre(cs, lib, cap) { return cs.some((c) => c.libro === lib && cap >= c.cap && cap <= c.capFin); }

function fichaPasaje(id) {
  const { libro: lib, cap } = pasajeDeId(id);
  const r = implicados({ tipo: 'pasaje', id });
  const paradas = BE.P.filter((s) => r.claves.has(`parada:${s.key}`));
  const cartas = BE.D.cartas.filter((c) => r.claves.has(`carta:${c.id}`));
  const eventos = (BE.D.eventos || []).filter((e) => r.claves.has(`evento:${e.id}`));
  return `${BE.migas('Pasajes', `${lib.nombre} ${cap}`)}${BE.cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow">Pasaje</div>
      <h2 class="be-card__title">${esc(lib.nombre)} ${cap}</h2>
      <p class="be-card__body">El texto no se copia aquí: se lee en wol.jw.org. En el mapa y en la línea de tiempo queda resaltado lo que cuenta este capítulo.</p>
    </div><div class="be-card__foot"><span class="be-spacer"></span><a class="be-wol" href="${BE.urlCapitulo(lib, cap)}" ${EXTERNO}>Leer ${esc(lib.nombre)} ${cap} en wol.jw.org</a></div></section>
    ${paradas.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Paradas de Pablo <b class="cuenta">${paradas.length}</b></h3>
      <div class="be-list">${paradas.map((s) => BE.botonSel(`parada:${s.key}`, s.lugar.nombre, `${esc(s.p.referencia)} · ${esc(s.viaje.nombre)}`)).join('')}</div></div></section>` : ''}
    ${cartas.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Carta</h3><div class="be-list">${cartas.map((c) => BE.botonSel(`carta:${c.id}`, c.libro, esc(fechaCorta(c.fecha)))).join('')}</div></div></section>` : ''}
    ${eventos.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Sucesos</h3><div class="be-list">${eventos.map((e) => BE.botonSel(`evento:${e.id}`, e.titulo, esc(e.fecha?.texto || ''))).join('')}</div></div></section>` : ''}
    ${!paradas.length && !cartas.length && !eventos.length ? '<p class="be-muted">Este corte todavía no tiene datos de este capítulo.</p>' : ''}`;
}

BE.tipo('pasaje', {
  nodo: 'evento',
  existe: (id) => !!pasajeDeId(id),
  nombre: (id) => { const p = pasajeDeId(id); return `${p.libro.nombre} ${p.cap}`; },
  implicados(id, r) {
    const { libro: lib, cap } = pasajeDeId(id);
    BE.P.filter((s) => citaCubre(citas(s.p.referencia), lib, cap)).forEach((s) => BE.anadirParada(r, s));
    BE.D.viajes.filter((v) => citaCubre(citas(v.referencia), lib, cap)).forEach((v) => r.claves.add(`viaje:${v.id}`));
    BE.D.cartas.filter((c) => citas(c.referencia)[0]?.libro === lib).forEach((c) => BE.anadirCarta(r, c));
    (BE.D.eventos || []).filter((e) => citaCubre(citas((e.pasajes || []).join('; ')), lib, cap)).forEach((e) => { r.claves.add(`evento:${e.id}`); (e.lugares || []).forEach((x) => r.lugares.add(x)); });
  },
  ficha: fichaPasaje,
  // «Hch 16», «Hechos 16:12», «1Co 5»
  buscar(q) {
    const m = q.trim().match(/^([123]?\s?[A-Za-zÁÉÍÓÚáéíóúÑñ]+)\.?\s*(\d+)(?:\s*[:.,]\s*(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
    if (!m) return [];
    const lib = libro(m[1]);
    if (!lib) return [];
    const cap = +m[2];
    const id = idPasaje(lib, cap);
    const n = implicados({ tipo: 'pasaje', id }).claves.size;
    return [{ grupo: 'Pasajes', sel: { tipo: 'pasaje', id }, titulo: `${lib.nombre} ${cap}${m[3] ? `:${m[3]}${m[4] ? `-${m[4]}` : ''}` : ''}`, meta: n ? `${n} ${n === 1 ? 'dato' : 'datos'} en el mapa` : 'sin datos en este corte', puntos: 1000 }];
  },
});

Object.assign(BE, { pasajeDeId, idPasaje, citaCubre });
})();
