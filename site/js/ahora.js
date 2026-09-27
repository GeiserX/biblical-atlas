/* biblical-earth · «Ahora mismo»: lo que enseña la ficha cuando no hay nada seleccionado (dónde está Pablo en la fecha
   del cursor y las cartas cercanas). Aquí irá también la vista «Ahora mismo» (#vista-ahora). Dueño durante el reparto: app-tiempo. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, fmtCursor, fechaCorta } = BE;

/** Clave de la ficha sin selección: si no cambia, la ficha no se vuelve a pintar. */
function claveAhora() {
  const w = BE.dondeEsta(E.t);
  return w ? `ahora|${w.en.key}|${w.parada ? '' : w.sig?.key}|${BE.D.cartas.filter((c) => BE.cartaVisible(c, E.t)).map((c) => c.id)}` : `nada|${Math.floor(E.t)}`;
}
function fichaAhora() {
  const w = BE.dondeEsta(E.t);
  if (!w) {
    const antes = [...BE.P].reverse().find((s) => s.b < E.t), despues = BE.P.find((s) => s.a > E.t);
    return `${BE.migas('Pablo', 'Aquí y ahora')}
      <section class="be-card"><div class="be-card__pad">
        <div class="be-card__eyebrow">${esc(fmtCursor(E.t))}</div>
        <h2 class="be-card__title">No sabemos dónde estaba Pablo en esta fecha</h2>
        <p class="be-card__body">Los datos de este corte no lo sitúan en ${esc(fmtCursor(E.t))}. No inventamos una posición: estas son las paradas con fecha más cercanas.</p>
        <div class="be-list">${antes ? BE.botonSel(`parada:${antes.key}`, `Antes: ${antes.lugar.nombre}`, esc(antes.p.referencia)) : ''}${despues ? BE.botonSel(`parada:${despues.key}`, `Después: ${despues.lugar.nombre}`, esc(despues.p.referencia)) : ''}</div>
      </div></section>${cartasCercaHtml()}`;
  }
  return BE.fichaParada(w.en, w);
}
function cartasCercaHtml() {
  const cs = BE.D.cartas.filter((c) => BE.cartaVisible(c, E.t));
  if (!cs.length) return '';
  return `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Cartas cerca de esta fecha</h3>
    <div class="be-list">${cs.map((c) => BE.botonSel(`carta:${c.id}`, c.libro, `${esc(BE.origenesCarta(c).map((id) => BE.L[id].nombre).join(' o '))} → ${esc(BE.destinosCarta(c).map((id) => BE.L[id].nombre).join(', ') || 'destino no indicado')} · ${esc(fechaCorta(c.fecha))}`)).join('')}</div></div></section>`;
}

Object.assign(BE, { claveAhora, fichaAhora, cartasCercaHtml });
})();
