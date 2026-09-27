/* biblical-earth · ayudas de ficha: citas, fuentes, estado, «por qué lo decimos», nombres, enlaces, vídeos y las piezas
   comunes (fila con botón, migas, cerrar). Las usan las fichas de todos los tipos. Dueño durante el reparto: app-mapa. */
'use strict';
(() => {
const BE = window.BE;
const { esc, citas, fmtDia, fmtAnio, EXTERNO, ES_FILE } = BE;

function chipsCitas(ref) {
  return citas(ref).map((c) => `<a class="be-ref" href="${BE.urlCapitulo(c.libro, c.cap)}" ${EXTERNO} title="Leer ${esc(c.libro.nombre)} ${c.cap} en wol.jw.org">${esc(c.texto)}</a>`).join('');
}
function estadoHtml(estado) {
  const v = estado === 'verificado';
  return `<span class="estado estado--${v ? 'verificado' : 'pendiente'}" title="${v ? 'Alguien abrió la fuente enlazada y lo dice.' : 'Todavía nadie lo ha comprobado en la fuente.'}">${v ? 'Verificado' : 'Pendiente de verificar'}</span>`;
}
function fuentesHtml(ids) {
  const fs = (ids || []).map((id) => [id, BE.D.fuentes[id]]).filter(([, f]) => f);
  if (!fs.length) return '<p class="be-muted">Sin fuente todavía.</p>';
  return `<ul class="fuentes">${fs.map(([id, f]) => `<li>
    <span class="be-tier be-tier--${f.nivel === 1 ? 1 : 2}" data-n="${f.nivel}">Nivel ${f.nivel}</span>
    <div><a href="${esc(f.url)}" ${EXTERNO}>${esc(f.titulo)}</a><span class="fuente-obra">${esc(f.obra)}${f.publicado ? ` · ${esc(f.publicado)}` : ''}</span>
    <span class="fuente-fecha">Consultado el ${esc(fmtDia(f.consultado))}</span></div></li>`).join('')}</ul>`;
}
function porQueHtml(obj, extra = '') {
  return `<section class="be-card ficha-sec"><div class="be-card__pad">
    <h3 class="be-card__eyebrow">Por qué lo decimos</h3>
    ${obj.razon ? `<p class="razon">${esc(obj.razon)}</p>` : ''}${extra}
    ${fuentesHtml(obj.fuentes)}
    ${obj.consultado ? `<p class="fuente-fecha">Ficha revisada el ${esc(fmtDia(obj.consultado))}</p>` : ''}
  </div></section>`;
}
function enlacesHtml(enlaces) {
  if (!enlaces?.length) return '';
  return `<div class="enlaces">${enlaces.map((e) => `<a class="be-wol" href="${esc(e.url)}" ${EXTERNO}>${esc(e.titulo)}</a>`).join('')}</div>`;
}
function videosHtml(lugarId) {
  if (BE.VIDEOS === null) {
    return ES_FILE ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Vídeos de jw.org</h3><p class="be-muted">La lista de vídeos se ve al abrir el sitio con un servidor local (ver README).</p></div></section>` : '';
  }
  const vs = [...(BE.VIDEOS[lugarId] || [])].sort((a, b) => (b.menciones || 0) - (a.menciones || 0));
  if (!vs.length) return '';
  const max = 6;
  return `<section class="be-card ficha-sec"><div class="be-card__pad">
    <h3 class="be-card__eyebrow">Vídeos de jw.org <b class="cuenta">${vs.length}</b></h3>
    <ul class="videos">${vs.slice(0, max).map((v) => `<li><a href="${esc(v.url)}" ${EXTERNO}>${esc(v.titulo)}</a><span class="be-row__meta">${v.publicado ? esc(fmtDia(v.publicado)) : ''}${v.menciones ? ` · lo nombra ${v.menciones} ${v.menciones === 1 ? 'vez' : 'veces'}` : ''}</span></li>`).join('')}</ul>
    ${vs.length > max ? `<p class="be-muted">Y ${vs.length - max} más en jw.org.</p>` : ''}
  </div></section>`;
}
function nombresHtml(obj) {
  const otros = (obj.nombres || []).filter((n) => n.nombre !== obj.nombre);
  if (!otros.length) return '';
  return `<ul class="nombres">${otros.map((n) => {
    const fechas = n.desde != null || n.hasta != null ? ` (${n.desde != null ? fmtAnio(n.desde) : '…'} - ${n.hasta != null ? fmtAnio(n.hasta) : '…'})` : '';
    const nota = n.nota ? String(n.nota).replace(/\.\s*$/, '') : '';
    return `<li><b>${esc(n.nombre)}</b>${fechas}${nota ? `<span class="be-muted">: ${esc(nota.charAt(0).toLowerCase() + nota.slice(1))}</span>` : ''}</li>`;
  }).join('')}</ul>`;
}
const botonSel = (sel, titulo, meta = '') => `<button type="button" class="be-row fila-boton" data-sel="${esc(sel)}"><span><span class="be-row__title">${esc(titulo)}</span>${meta ? `<span class="be-row__meta">${meta}</span>` : ''}</span><span class="be-row__end" aria-hidden="true">›</span></button>`;
const migas = (...xs) => `<nav class="be-crumbs" aria-label="Ruta">${xs.map((x) => `<span>${esc(x)}</span>`).join('<span class="be-sep" aria-hidden="true">›</span>')}</nav>`;
const cerrarHtml = () => '<button type="button" class="be-btn be-btn--sm cerrar-ficha" data-accion="cerrar">Cerrar ficha <span aria-hidden="true">×</span></button>';

Object.assign(BE, { chipsCitas, estadoHtml, fuentesHtml, porQueHtml, enlacesHtml, videosHtml, nombresHtml, botonSel, migas, cerrarHtml });
})();
