/* biblical-earth · portada (pantalla 15, #vista-portada): qué es esto y tres maneras de empezar (buscar, elegir una
   época, seguir un recorrido), las preguntas guía, la barra de las épocas a escala real y «seguir donde lo dejé».
   Sale al abrir el sitio sin dirección (#…) y desde el logo o el menú «Estudio». Dueño durante el reparto: app-estudio. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, $, fmtAnio, fechaCorta, tramo } = BE;

const CLAVE_ULTIMA = 'biblical-earth:ultima';
let abierta = false;
const COLORES = ['#8a7a5c', '#c29a3b', '#b8733a', '#5b7d3a', '#8e4b3a', '#7a5c8e', '#b5a98f', '#a23b2e', '#a3432b'];

function eras() {
  return (BE.D.periodos || []).filter((p) => p.tipo === 'era' && tramo(p.fecha)).sort((a, b) => tramo(a.fecha)[0] - tramo(b.fecha)[0]);
}
function preguntas() {
  const qs = [];
  if (BE.L.babilonia) qs.push({ texto: '¿Qué pasaba en Babilonia en tiempos de Jesús?', sel: 'lugar:babilonia', t: 30.5 });
  if (BE.L.jerusalen) qs.push({ texto: '¿Quién había en Judá con los medos y persas?', sel: 'lugar:jerusalen', t: -519.5 });
  if ((BE.D.cartas || []).some((c) => c.id === '1-tesalonicenses')) qs.push({ texto: '¿Desde dónde escribió Pablo cada carta?', sel: 'persona:pablo', t: 50.3 });
  return qs;
}
function ultima() { try { return JSON.parse(localStorage.getItem(CLAVE_ULTIMA) || 'null'); } catch { return null; } }

function pintar() {
  const v = $('#vista-portada');
  if (!abierta) { v.hidden = true; v.innerHTML = ''; document.documentElement.classList.remove('be-con-portada'); return; }
  const es = eras();
  const t0 = es.length ? tramo(es[0].fecha)[0] : BE.T_MIN, t1 = es.length ? tramo(es[es.length - 1].fecha)[1] : BE.T_MAX;
  const total = Math.max(1, t1 - t0);
  const u = ultima();
  const rs = BE.D.recorridos || [];
  const libs = (p) => p.resumen || '';
  v.hidden = false;
  document.documentElement.classList.add('be-con-portada');
  v.innerHTML = `<div class="portada">
    <header class="portada-cab"><span class="be-logo"><span class="be-logo__mark" aria-hidden="true"></span><span>biblical-earth</span></span><span class="be-spacer"></span>
      <button type="button" class="be-btn be-btn--sm be-btn--ghost" data-portada-explorar>Explorar el mapa</button></header>
    <section class="portada-heroe">
      <div class="be-caps portada-eyebrow">Para estudiar la Biblia</div>
      <h1 class="portada-titulo">Cada relato de la Biblia, en su lugar y en su tiempo</h1>
      <p class="portada-sub">Un mapa y una línea de tiempo movidos por una sola fecha. Elige un momento y verás quién vivía, dónde estaba y qué pasaba alrededor. Cada dato enlaza a su fuente.</p>
      <form class="portada-busca" data-portada-buscar role="search"><label class="be-search"><svg class="be-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="sr-only">Buscar</span>
        <input name="q" type="search" autocomplete="off" placeholder="Busca una persona, un lugar, un capítulo o un año"></label><button class="be-btn be-btn--primary" type="submit">Explorar</button></form>
      <div class="fila-chips portada-ejemplos"><span class="be-muted">Prueba:</span>${['Pedro', 'Hch 16', '607 a.e.c.', 'Babilonia', 'Galión', 'Loida y Pablo'].map((x) => `<button type="button" class="be-chip" data-portada-ejemplo="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      ${u?.hash ? `<button type="button" class="portada-seguir" data-portada-seguir><span class="be-caps">Seguir donde lo dejé</span><span>${esc(u.texto || 'tu última vista')}</span></button>` : ''}
    </section>
    ${preguntas().length ? `<section class="portada-preguntas be-card"><div class="be-card__pad"><div class="be-caps">O empieza por una pregunta</div>
      ${preguntas().map((q, i) => `<button type="button" class="pregunta-guia" data-portada-pregunta="${i}"><span>${esc(q.texto)}</span><span aria-hidden="true">→</span></button>`).join('')}</div></section>` : ''}
    ${es.length ? `<section class="portada-epocas"><div class="portada-sec-cab"><h2>Elige una época</h2><span class="be-muted">Entra por el periodo y el mapa se pone en su fecha</span><span class="be-spacer"></span><button type="button" class="enlace-texto" data-portada-completa>Ver la línea de tiempo completa →</button></div>
      <div class="epocas">${es.map((p, i) => {
        const sinLibro = /sin libro/i.test(p.resumen || '');
        return `<button type="button" class="epoca${sinLibro ? ' epoca--sin-libro' : ''}" style="--c:${COLORES[i % COLORES.length]}" data-portada-epoca="${esc(p.id)}"><span class="epoca-num">${i + 1}</span><span class="epoca-nombre">${esc(p.nombre)}</span><span class="epoca-fecha">${esc(p.fecha.texto || fechaCorta(p.fecha))}</span><span class="epoca-libros">${esc(libs(p))}</span></button>`;
      }).join('')}</div>
      <div class="escala-real" role="group" aria-label="Las épocas a escala real">${es.map((p, i) => { const tr = tramo(p.fecha); return `<button type="button" class="escala-tramo" style="flex-grow:${Math.max(0.2, tr[1] - tr[0])};--c:${COLORES[i % COLORES.length]}" data-portada-epoca="${esc(p.id)}" title="${esc(`${p.nombre} · ${p.fecha.texto || fechaCorta(p.fecha)}`)}" aria-label="${esc(p.nombre)}"></button>`; }).join('')}</div>
      <p class="be-muted escala-nota">A escala real, de ${esc(fmtAnio(Math.floor(t0)))} a ${esc(fmtAnio(Math.ceil(t1) - 1)).replace(/\.$/, '')}.${es.length >= 2 ? ` Las dos últimas épocas ocupan el ${Math.max(1, Math.round((es.slice(-2).reduce((s, p) => s + (tramo(p.fecha)[1] - tramo(p.fecha)[0]), 0) / total) * 100))} % de la barra.` : ''}</p></section>` : ''}
    <section class="portada-abajo">
      ${rs.length ? `<div class="recorridos-portada">${rs.map((r) => `<button type="button" class="be-card tarjeta-recorrido" data-portada-recorrido="${esc(r.id)}"><span class="be-caps">Recorrido · ${r.paradas.length} paradas</span><span class="tarjeta-recorrido__tit">${esc(r.titulo)}</span>${r.resumen ? `<span class="be-muted">${esc(r.resumen)}</span>` : ''}<span class="tarjeta-recorrido__ir">Empezar →</span></button>`).join('')}</div>` : ''}
      <div class="be-card fuentes-portada"><div class="be-card__pad"><div class="be-caps">De dónde salen los datos</div>
        <p>${BE.marcaNivel(1)} La Traducción del Nuevo Mundo y wol.jw.org. Enlazamos; no copiamos sus textos.</p>
        <p>${BE.marcaNivel(2)} Arqueología e investigación, solo cuando jw.org las usa, y siempre con su fuente.</p>
        <p><span class="be-tier be-tier--unverified">Sin verificar</span> Se ve marcado, nunca escondido.</p></div></div>
    </section>
    <footer class="portada-pie"><span>Código libre, GPL-3.0</span><span class="be-spacer"></span><a href="acerca.html">Qué es biblical-earth y a quién damos las gracias</a></footer>
  </div>`;
}

function abrir({ desdeHash = false } = {}) {
  abierta = true;
  pintar();
  if (!desdeHash) BE.guardarHash();
  setTimeout(() => $('#vista-portada input[name="q"]')?.focus({ preventScroll: true }), 50);
}
function cerrar() {
  if (!abierta) return;
  abierta = false;
  pintar();
  BE.guardarHash();
  $('#q')?.focus({ preventScroll: true });
}
function iniciar() {
  const v = $('#vista-portada');
  v.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = new FormData(e.target).get('q');
    cerrar();
    if (String(q || '').trim()) BE.buscarTexto(String(q));
  });
  v.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-portada-explorar]')) { cerrar(); return; }
    const ej = t.closest('[data-portada-ejemplo]');
    if (ej) { cerrar(); BE.buscarTexto(ej.dataset.portadaEjemplo); return; }
    const ep = t.closest('[data-portada-epoca]');
    if (ep) {
      const p = (BE.D.periodos || []).find((x) => x.id === ep.dataset.portadaEpoca);
      cerrar();
      BE.seleccionar({ tipo: 'periodo', id: p.id }, { mover: false, encuadrar: true });
      const tr = tramo(p.fecha);
      BE.verTramo(tr[0], tr[1]);
      return;
    }
    const pr = t.closest('[data-portada-pregunta]');
    if (pr) { const q = preguntas()[+pr.dataset.portadaPregunta]; cerrar(); BE.seleccionar(BE.parseSel(q.sel), { mover: false, encuadrar: true }); BE.setT(q.t); BE.asegurarVisible(BE.E.t, true); return; }
    const rc = t.closest('[data-portada-recorrido]');
    if (rc) { cerrar(); try { localStorage.setItem(`biblical-earth:recorrido:${rc.dataset.portadaRecorrido}`, '0'); } catch { /* sin almacenamiento */ } BE.seleccionar({ tipo: 'recorrido', id: rc.dataset.portadaRecorrido }); return; }
    if (t.closest('[data-portada-completa]')) { cerrar(); BE.E.vista = [BE.T_MIN, BE.T_MAX]; BE.sucio.linea = true; BE.programar(); return; }
    if (t.closest('[data-portada-seguir]')) { const u = ultima(); cerrar(); if (u?.hash) location.hash = u.hash; }
  });
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); cerrar(); } });
  // El logo lleva a la portada (base.js ya vuelve al inicio del mapa detrás).
  $('#inicio').addEventListener('click', () => setTimeout(() => abrir(), 0));
}
BE.inicios.push(iniciar);
// «Seguir donde lo dejé»: la última dirección con algo elegido, solo en este navegador.
let hashVisto = '';
BE.pintores.push(() => {
  if (abierta || location.hash === hashVisto) return;
  hashVisto = location.hash;
  if (!E.sel && !BE.lectura?.abierta) return;
  const texto = [E.sel ? BE.nombreSel(E.sel) : '', BE.fmtCursor(E.t)].filter(Boolean).join(' · ');
  try { localStorage.setItem(CLAVE_ULTIMA, JSON.stringify({ hash: location.hash, texto })); } catch { /* sin almacenamiento */ }
});
// Sin dirección, el sitio abre en la portada. Con dirección (un enlace compartido, las de v0), abre esa vista.
const sinDireccion = !location.hash || location.hash === '#';
BE.parametros.push({ nombre: 'portada', escribir: () => (abierta ? '1' : null),
  leer(v, inicial) { if (v === '1' || (inicial && sinDireccion)) { if (!abierta) abrir({ desdeHash: true }); } else if (abierta) { abierta = false; pintar(); } } });

BE.portada = { abrir, cerrar, get abierta() { return abierta; } };
})();
