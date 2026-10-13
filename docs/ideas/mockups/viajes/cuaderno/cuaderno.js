/* Diseño 1, «Cuaderno de viajes». Estado en la dirección: #viaje=<id>&tramo=<índice>&inicio=<paso>. */
'use strict';
(() => {
const { D, esc, km, num, tiempo, leyenda, sitio, mapa, estado, ir, mandos, barra, grupos, paradas, nombreTramo, estancias } = window.VJ;
mandos('cuaderno');
document.getElementById('barra').outerHTML = barra();
const $ = (id) => document.getElementById(id);
const nPersonas = new Set(D.viajes.map((v) => v.qid).filter(Boolean)).size;
$('cifras').textContent = `${num(D.viajes.length)} viajes de ${nPersonas} personas y ${D.viajes.filter((v) => !v.qid).length} grupos, con ${num(D.viajes.reduce((s, v) => s + v.s.length, 0))} paradas`;

function lista() {
  const { viaje } = estado();
  $('grupos').innerHTML = grupos($('filtro').value).map((g) => `<h2 class="cu-era">${esc(g.n)} · ${g.viajes.length}</h2>${g.viajes.map((v) => `
    <a class="cu-item" href="#viaje=${v.id}"${v.id === viaje ? ' aria-current="true"' : ''}>
      <span class="cu-item__fila"><span class="cu-item__n">${esc(v.n)}</span><span class="cu-item__km">${v.s.length} paradas · ${v.sin ? 'más de ' : ''}${km(v.km)}</span></span>
      <span class="cu-item__q">${esc(v.q)} · ${esc(v.f)}</span>
      <span class="cu-item__ps">${esc(paradas(v, 7))}</span></a>`).join('')}`).join('') || '<p class="cu-era">Ningún viaje con ese nombre</p>';
}
$('filtro').addEventListener('input', lista);

function legRow(v, t, i, actual) {
  const span = t.span ? `<span class="cu-leg__x">${t.span.primero ? `De ${esc(t.span.de)} a ${esc(t.span.a)}: ${tiempo(t.span, { largo: true })}` : `Dentro de lo que se tarda de ${esc(t.span.de)} a ${esc(t.span.a)}`}</span>` : '';
  const x = t.t?.x ? `<span class="cu-leg__x">${esc(t.t.x)}</span>` : '';
  return `<li class="cu-leg" data-i="${i}"${actual ? ' aria-current="true"' : ''}>
    <span class="cu-leg__datos"><span class="cu-leg__km">${km(t.km)}</span>${tiempo(t.t, { largo: true })}${x}${span}</span>
    <a class="vj-btn vj-btn--peq" href="#viaje=${v.id}&amp;tramo=${i}" data-ver="${i}">Ver el tramo</a></li>`;
}

function viaje() {
  const { viaje: id, tramo: k } = estado();
  const v = id && window.VJ.viaje(id);
  $('cu').classList.toggle('cu--viaje', !!v);
  if (!v) {
    $('viaje').innerHTML = `<div class="cu-bienvenida"><h2>¿Cómo se movían?</h2>
      <p>Cada viaje de la Biblia con sus paradas en orden, lo que mide cada tramo y lo que se tardó, cuando el texto lo dice. Elige uno en la lista o empieza por aquí:</p>
      <p><a class="vj-btn vj-btn--primario" href="#viaje=viaje-a-roma&amp;inicio=1">Empezar por el viaje a Roma</a></p>
      <ol><li>Mira las paradas y lo que mide cada tramo.</li><li>Fíjate en la marca: el texto lo dice, o lo deducimos de las fechas.</li><li>Abre un tramo y el mapa se pone en él.</li></ol></div>`;
    return;
  }
  const sp = new Map(v.s.map((s) => [s.o, s]));
  const est = estancias(v);
  const filas = [];
  v.s.forEach((s, j) => {
    if (j > 0) v.t.forEach((t, i) => { if (t.b === s.o) filas.push(legRow(v, t, i, i === k)); });
    const e = v.st?.[s.o];
    filas.push(`<li class="cu-parada"><span class="cu-parada__num">${s.o}</span><span><span class="cu-parada__n">${esc(s.n)}</span> <span class="cu-parada__f">${esc(s.f || '')}</span>${e ? `<p class="cu-estancia">${tiempo({ k: 'dicho', v: `Se quedan ${e.v}`, r: e.r }, { largo: true })}</p>` : ''}</span><span class="cu-parada__r">${esc(s.r || '')}</span></li>`);
  });
  const dichos = v.t.filter((t) => t.t && t.t.k !== 'deducido').length;
  $('viaje').innerHTML = `<div class="cu-cab"><div>
      <p class="cu-cab__eyebrow"><a href="#" data-volver>Viajes</a> · ${esc(v.q)}</p>
      <h2 id="viaje-tit" tabindex="-1">${esc(v.n)}</h2>
      <p class="cu-cab__fecha">${esc(v.f)} · <a href="${sitio(`viaje:${v.id}`)}">${esc(v.r)}</a></p>
      <div class="cu-totales" id="totales">
        <p class="cu-total"><b>${v.s.length}</b><span>paradas</span></p>
        <p class="cu-total"><b>${v.sin ? '+' : ''}${km(v.km)}</b><span>en línea recta</span></p>
        <p class="cu-total"><b>${dichos} de ${v.t.length}</b><span>tramos con tiempo dicho</span></p>
        ${est.length ? `<p class="cu-total"><b>${est.length}</b><span>estancias con su duración</span></p>` : ''}
      </div>${leyenda()}</div>
      <div class="vj-mapa" id="mapa-viaje"></div></div>
    <ol class="cu-it">${filas.join('')}</ol>`;
  mapa($('mapa-viaje'), v, null, { compacto: true });
  tramo(v, k);
}

function tramo(v, k) {
  const el = $('tramo');
  if (!v || k == null || !v.t[k]) { el.hidden = true; return; }
  const t = v.t[k], [a, b] = nombreTramo(v, t), sp = new Map(v.s.map((s) => [s.o, s]));
  el.hidden = false;
  el.innerHTML = `<div class="cu-tramo__cab"><div><p class="cu-cab__eyebrow">Tramo ${k + 1} de ${v.t.length} · ${esc(v.n)}</p><h3 id="tramo-tit">De ${esc(a)} a ${esc(b)}</h3></div>
      <a class="cu-cerrar" href="#viaje=${v.id}" aria-label="Cerrar el tramo" role="button" style="display:grid;place-items:center;text-decoration:none;color:inherit">×</a></div>
    <div class="vj-mapa" id="mapa-tramo"></div>
    <dl class="cu-tramo__datos">
      <dt>Distancia</dt><dd><b>${km(t.km)}</b> en línea recta</dd>
      <dt>Tiempo</dt><dd>${tiempo(t.t, { largo: true })}${t.t?.x ? `<br><span class="cu-parada__f">${esc(t.t.x)}</span>` : ''}${t.t?.k === 'deducido' ? `<br><span class="cu-parada__f">${esc(sp.get(t.a).f)} → ${esc(sp.get(t.b).f)}</span>` : ''}</dd>
      ${t.span ? `<dt>Junto</dt><dd>De ${esc(t.span.de)} a ${esc(t.span.a)}: ${tiempo(t.span, { largo: true })}</dd>` : ''}
      <dt>Texto</dt><dd>${esc(sp.get(t.a).r)} → ${esc(sp.get(t.b).r)}</dd>
    </dl>
    <div class="cu-tramo__nav">
      ${k > 0 ? `<a class="vj-btn vj-btn--peq" href="#viaje=${v.id}&amp;tramo=${k - 1}">← Anterior</a>` : ''}
      ${k < v.t.length - 1 ? `<a class="vj-btn vj-btn--peq" href="#viaje=${v.id}&amp;tramo=${k + 1}">Siguiente →</a>` : ''}
      <a class="vj-btn vj-btn--primario vj-btn--peq" href="${sitio(`parada:${v.id}/${t.b}`)}">Abrir en el mapa</a></div>`;
  mapa($('mapa-tramo'), v, k);
}

// La primera visita: tres pasos sobre el viaje a Roma, cada uno junto a lo que explica.
const PASOS = [
  { sel: '#totales', txt: (v) => `Un viaje es una lista de paradas en orden. Este tiene ${v.s.length}, de Cesarea a Roma, y suma unos ${km(v.km)} en línea recta.` },
  { sel: '.cu-leg[data-i="0"] .cu-leg__datos', txt: () => 'Cada tramo dice lo que mide y lo que se tardó. El punto lleno: lo dice el texto. El rombo de trazos: lo deducimos de las fechas de las paradas.' },
  { sel: '.cu-leg[data-i="9"] [data-ver]', txt: () => 'Abre un tramo y el mapa se pone en él, con la cita para leerlo.' },
];
function guia() {
  const { inicio, viaje: id } = estado();
  const g = $('guia');
  document.querySelectorAll('.cu-resalta').forEach((x) => x.classList.remove('cu-resalta'));
  const n = Number(inicio);
  if (!inicio || !id || !PASOS[n - 1]) { g.hidden = true; return; }
  const p = PASOS[n - 1], t = document.querySelector(p.sel);
  if (!t) { g.hidden = true; return; }
  t.scrollIntoView({ block: 'center' });
  t.classList.add('cu-resalta');
  g.hidden = false;
  g.innerHTML = `<p class="cu-guia__paso">Por dónde empezar · ${n} de ${PASOS.length}</p><p>${esc(p.txt(window.VJ.viaje(id)))}</p>
    <p style="display:flex;gap:8px;margin:0">${n < PASOS.length ? `<a class="vj-btn" href="#viaje=${id}&amp;inicio=${n + 1}">Siguiente</a>` : `<a class="vj-btn" href="#viaje=${id}&amp;tramo=9">Ver el tramo</a>`}<a class="vj-btn vj-btn--peq" href="#viaje=${id}">Lo veo yo</a></p>`;
  const r = t.getBoundingClientRect();
  const abajo = r.bottom + 12 + g.offsetHeight < innerHeight;
  g.style.top = `${abajo ? r.bottom + 12 : Math.max(60, r.top - g.offsetHeight - 12)}px`;
  g.style.left = `${Math.min(innerWidth - g.offsetWidth - 12, Math.max(12, r.left))}px`;
}

document.addEventListener('click', (e) => { if (e.target.closest('[data-volver]')) { e.preventDefault(); ir({ viaje: null, tramo: null, inicio: null }); } });
function todo() { lista(); viaje(); requestAnimationFrame(guia); }
addEventListener('hashchange', todo);
addEventListener('vj:estado', todo);
addEventListener('resize', () => { viaje(); guia(); });
todo();
})();
