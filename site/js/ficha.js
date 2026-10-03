/* biblical-atlas · ayudas de ficha: citas, fuentes, estado, «por qué lo decimos», insignias de nivel, historial,
   «Proponer una corrección», «lo que el texto no dice», nombres, enlaces, vídeos y las piezas comunes (fila con botón,
   migas, cerrar). Las usan las fichas de todos los tipos. Dueño durante el reparto: app-mapa. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, citas, fmtDia, fmtAnio, EXTERNO, ES_FILE } = BE;

const REPO = 'https://github.com/GeiserX/biblical-atlas';
const CARPETA = { lugar: 'lugares', persona: 'personas', viaje: 'viajes', carta: 'cartas', evento: 'eventos', periodo: 'periodos', hallazgo: 'hallazgos', recorrido: 'recorridos' };

/** Filtro «solo nivel 1» (C-09). Lo guarda la dirección (mapa.js); aquí solo se lee. */
const soloNivel1 = () => !!BE.filtros?.nivel1;
const fuente = (id) => BE.D.fuentes[id];
/** Nivel de un hecho: 1 si alguna de sus fuentes es de nivel 1; 2 si todas son de nivel 2; null si no tiene. */
function nivelDe(ids) {
  const ns = (ids || []).map((id) => fuente(id)?.nivel).filter((n) => n != null);
  if (!ns.length) return null;
  return ns.includes(1) ? 1 : 2;
}

/** Marca pequeña del tipo de fuente, sin jerga: el nombre del nivel va en el texto emergente y para los lectores de pantalla. */
const NIVEL_TEXTO = { 1: 'La Biblia o una publicación que la explica', 2: 'Otra fuente que acompaña' };
function marcaNivel(n) {
  const k = n === 1 ? 1 : 2;
  return `<span class="marca-nivel marca-nivel--${k}" role="img" title="${NIVEL_TEXTO[k]}" aria-label="${NIVEL_TEXTO[k]}"></span>`;
}

function chipsCitas(ref) {
  return citas(ref).map((c) => `<a class="be-ref" href="${BE.urlCita(c)}" ${EXTERNO} title="${esc(BE.t('Leer {cita} en jw.org', { cita: c.texto }))}">${esc(c.texto)}</a>`).join('');
}
function estadoHtml(estado) {
  const v = estado === 'verificado';
  return `<span class="estado estado--${v ? 'verificado' : 'pendiente'}" title="${BE.t(v ? 'Alguien abrió la fuente enlazada y lo dice.' : 'Todavía nadie lo ha comprobado en la fuente.')}">${BE.t(v ? 'Verificado' : 'Pendiente de verificar')}</span>`;
}
/** Aviso de fuente sustituida por una publicación más reciente (C-10). La fecha de consulta se queda en los datos, no en la ficha. */
const avisoFuenteHtml = (f) => (f.nota === 'sustituida' ? '<span class="fuente-fecha"><b class="fuente-aviso">Sustituida por una publicación más reciente</b></span>' : '');
function fuentesHtml(ids) {
  let fs = (ids || []).map((id) => [id, fuente(id)]).filter(([, f]) => f);
  if (!fs.length) return `<p class="be-muted">${BE.t('Sin fuente todavía.')}</p>`;
  const ocultas = soloNivel1() ? fs.filter(([, f]) => f.nivel !== 1).length : 0;
  if (ocultas) fs = fs.filter(([, f]) => f.nivel === 1);
  return `<ul class="fuentes">${fs.map(([, f]) => `<li>
    ${marcaNivel(f.nivel)}
    <div><a href="${esc(f.url)}" ${EXTERNO}>${esc(f.titulo)}</a><span class="fuente-obra">${esc(f.obra)}${f.publicado ? ` · ${esc(f.publicado)}` : ''}</span>
    ${avisoFuenteHtml(f)}</div></li>`).join('')}</ul>${ocultas ? `<p class="be-muted oculto-n2">${ocultas} ${ocultas === 1 ? 'otra fuente oculta' : 'otras fuentes ocultas'} por el filtro «Solo fuentes principales».</p>` : ''}`;
}
/** Marca del tipo de fuente de un hecho (C-01). Al pulsarla se despliegan sus fuentes con enlace. */
function insigniaHtml(ids) {
  const n = nivelDe(ids);
  if (!n) return '';
  const fs = (ids || []).map(fuente).filter(Boolean);
  return `<details class="insignia insignia--${n}"><summary title="${NIVEL_TEXTO[n]}. Pulsa para ver las fuentes." aria-label="Fuentes de este dato: ${NIVEL_TEXTO[n]}">${marcaNivel(n)}</summary><span class="insignia-pop">${fs.map((f) => `<a href="${esc(f.url)}" ${EXTERNO}>${marcaNivel(f.nivel)} ${esc(f.titulo)}</a>`).join('')}</span></details>`;
}
/** Historial plegado de un hecho (P-06): cada cambio con su fecha y su fuente. */
function historialHtml(obj) {
  const hs = obj?.historial || [];
  if (!hs.length) return '';
  return `<details class="historial"><summary>${BE.t('Historial')} <b class="cuenta">${hs.length}</b></summary><ol>${[...hs].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).map((h) => {
    const f = fuente(h.fuente);
    return `<li><span class="fuente-fecha">${esc(fmtDia(h.fecha))}</span> ${esc(h.cambio)}${f ? ` <a href="${esc(f.url)}" ${EXTERNO}>${esc(f.titulo)}</a>` : ''}</li>`;
  }).join('')}</ol></details>`;
}
/** «Proponer una corrección» (P-02): una incidencia de GitHub con el fichero y una plantilla ya escritos. */
function proponerHtml(tipo, id, nombre) {
  const carpeta = CARPETA[tipo];
  if (!carpeta || !id) return '';
  const fichero = `data/${carpeta}/${id}.yaml`;
  const titulo = `Corrección: ${nombre || id} (${tipo})`;
  const cuerpo = `Fichero: \`${fichero}\`\nVista: ${location.href.split('?')[0].replace(/#.*$/, '')}#sel=${tipo}:${id}\n\n**Qué dato está mal**\n\n\n**Qué debería decir**\n\n\n**Fuente que lo sostiene** (enlace y párrafo)\n\n`;
  const url = `${REPO}/issues/new?title=${encodeURIComponent(titulo)}&body=${encodeURIComponent(cuerpo)}&labels=${encodeURIComponent('corrección')}`;
  return `<a class="be-wol proponer" href="${esc(url)}" ${EXTERNO} title="${esc(BE.t('Abre una incidencia en GitHub con el fichero {fichero}', { fichero }))}">${BE.t('Proponer una corrección')}</a>`;
}
function porQueHtml(obj, extra = '') {
  // El tipo y el nombre salen de la selección cuando la ficha es la del objeto seleccionado.
  const deSel = E.sel && obj?.id && E.sel.id === obj.id;
  const propuesta = deSel ? proponerHtml(E.sel.tipo, obj.id, BE.nombreSel(E.sel)) : '';
  return `<section class="be-card ficha-sec por-que"><div class="be-card__pad">
    <h3 class="be-card__eyebrow">${BE.t('Por qué lo decimos')}</h3>
    ${obj.razon ? `<p class="razon">${esc(obj.razon)}</p>` : ''}${extra}
    ${fuentesHtml(obj.fuentes)}
    ${historialHtml(obj)}
    ${propuesta ? `<div class="fila-proponer">${propuesta}</div>` : ''}
  </div></section>`;
}
/** La `nota` de un hecho (cómo se repartió una fecha sin año, qué no dice el relato del lugar): va con el «por qué». */
const notaHtml = (nota) => (nota ? `<p class="razon nota-hecho"><b>${BE.t('Nota:')}</b> ${esc(nota)}</p>` : '');
/** «Lo que el texto no dice» (C-11): frases de no_afirmamos más las que deduce cada ficha. */
function noSabemosHtml(frases) {
  const xs = (frases || []).filter(Boolean);
  if (!xs.length) return '';
  return `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">${BE.t('Lo que el texto no dice')}</h3>
    <ul class="no-sabemos">${xs.map((x) => `<li class="be-note be-note--uncertain">${esc(x)}</li>`).join('')}</ul></div></section>`;
}
function enlacesHtml(enlaces) {
  if (!enlaces?.length) return '';
  // «Hechos 18 (TNM)» se lee «Hechos 18»: la sigla es jerga para quien lee y pasa al texto emergente. En inglés, «(NWT)».
  return `<div class="enlaces">${enlaces.map((e) => {
    const tnm = / \((TNM|NWT)\)$/.test(e.titulo);
    return `<a class="be-wol" href="${esc(e.url)}" ${EXTERNO}${tnm ? ` title="${esc(BE.t('Traducción del Nuevo Mundo, en jw.org'))}"` : ''}>${esc(tnm ? e.titulo.replace(/ \((TNM|NWT)\)$/, '') : e.titulo)}</a>`;
  }).join('')}</div>`;
}
/** Vídeos de jw.org que nombran un lugar (BE.VIDEOS, de videos.json) o una persona (V, de videos-personas.json).
    Con V === null desde file:// la ficha de lugar lo explica; la de persona pasa `callar` y no enseña nada. */
function videosHtml(id, V = BE.VIDEOS, callar = false) {
  if (V === null) {
    return ES_FILE && !callar ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Vídeos de jw.org</h3><p class="be-muted">La lista de vídeos se ve al abrir el sitio con un servidor local (ver README).</p></div></section>` : '';
  }
  const vs = [...(V?.[id] || [])].filter((v) => v && v.url && v.titulo).sort((a, b) => (b.menciones || 0) - (a.menciones || 0));
  if (!vs.length) return '';
  const max = 6;
  return `<section class="be-card ficha-sec"><div class="be-card__pad">
    <h3 class="be-card__eyebrow">${BE.t('Vídeos de jw.org')} <b class="cuenta">${vs.length}</b></h3>
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
const migas = (...xs) => `<nav class="be-crumbs" aria-label="${esc(BE.t('Ruta'))}">${xs.map((x) => `<span>${esc(x)}</span>`).join('<span class="be-sep" aria-hidden="true">›</span>')}</nav>`;
/** «Cerrar ficha» y, a su lado, el lápiz de la nota privada de lo seleccionado (notes.js). */
const cerrarHtml = () => {
  const cerrar = `<button type="button" class="be-btn be-btn--sm cerrar-ficha" data-accion="cerrar">${BE.t('Cerrar ficha')} <span aria-hidden="true">×</span></button>`;
  const lapiz = BE.notes?.pencilForSel(E.sel) || '';
  return lapiz ? `<div class="card-tools">${lapiz}${cerrar}</div>` : cerrar;
};

Object.assign(BE, {
  chipsCitas, estadoHtml, fuentesHtml, porQueHtml, notaHtml, enlacesHtml, videosHtml, nombresHtml, botonSel, migas, cerrarHtml,
  insigniaHtml, historialHtml, proponerHtml, noSabemosHtml, nivelDe, soloNivel1, marcaNivel,
});
})();
