/* Diseño 3, «El mapa y su tira». Estado: #viaje=<id>&tramo=<índice>&inicio=<paso>&lista=1. */
'use strict';
(() => {
const { esc, km, tiempo, leyenda, sitio, mapa, estado, mandos, barra, grupos, nombreTramo } = window.VJ;
mandos('mapa');
document.getElementById('barra').outerHTML = barra();
const $ = (id) => document.getElementById(id);
const POR_DEFECTO = 'viaje-a-roma';

/** La forma de la ruta en miniatura, para reconocer el viaje en la lista sin abrirlo. */
function mini(v) {
  const ps = v.s.filter((s) => s.c && s.bf == null).map((s) => s.c);
  if (ps.length < 2) return '<svg viewBox="0 0 54 38" aria-hidden="true"></svg>';
  const xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1]);
  const x0 = Math.min(...xs), y1 = Math.max(...ys), e = Math.min(46 / (Math.max(...xs) - x0 || 1), 30 / (y1 - Math.min(...ys) || 1));
  return `<svg viewBox="0 0 54 38" aria-hidden="true"><path d="${ps.map((p, i) => `${i ? 'L' : 'M'}${(4 + (p[0] - x0) * e).toFixed(1)},${(4 + (y1 - p[1]) * e).toFixed(1)}`).join('')}"/></svg>`;
}
/** El viaje que se dibuja: el de la dirección o, si no existe, el de por defecto. La lista marca este mismo. */
const actual = () => window.VJ.viaje(estado().viaje) || window.VJ.viaje(POR_DEFECTO);
function lista() {
  const id = actual().id;
  $('lista').innerHTML = grupos($('filtro').value).map((g) => `<h2 class="ma-era">${esc(g.n)}</h2>${g.viajes.map((v) => `<a class="ma-item" href="#viaje=${v.id}"${v.id === id ? ' aria-current="true"' : ''}>${mini(v)}<span><b>${esc(v.n)}</b><span>${esc(v.q)} · ${v.s.length} paradas · ${km(v.km)}</span><span>${esc(v.s.map((s) => s.n).slice(0, 5).join(' · '))}${v.s.length > 5 ? '…' : ''}</span></span></a>`).join('')}`).join('');
}
$('filtro').addEventListener('input', lista);
$('abrir-lista').onclick = () => { $('ma').classList.toggle('ma--lista'); $('abrir-lista').setAttribute('aria-expanded', $('ma').classList.contains('ma--lista')); };
document.addEventListener('click', (e) => { if (e.target.closest('.ma-item')) $('ma').classList.remove('ma--lista'); });

function todo() {
  const { tramo: k } = estado();
  const v = actual();
  lista();
  const t = k != null ? v.t[k] : null;
  const [a, b] = t ? nombreTramo(v, t) : [];
  $('cab').innerHTML = t
    ? `<p><a href="#viaje=${v.id}">${esc(v.n)}</a> · tramo ${k + 1} de ${v.t.length}</p><h2>De ${esc(a)} a ${esc(b)}</h2>
       <p><b>${km(t.km)}</b> en línea recta · ${tiempo(t.t, { largo: true })}</p>${t.t?.x ? `<p>${esc(t.t.x)}</p>` : ''}
       <p class="ma-ir"><a class="vj-btn vj-btn--peq vj-btn--primario" href="${sitio(`parada:${v.id}/${t.b}`)}">Abrir en el mapa</a></p>`
    : `<p>${esc(v.q)} · ${esc(v.f)} · ${esc(v.r)}</p><h2>${esc(v.n)}</h2><p>${v.s.length} paradas · ${v.sin ? 'más de ' : 'unos '}${km(v.km)} en línea recta · toca un tramo para verlo</p>${leyenda()}`;
  const tarjetas = [];
  v.t.forEach((x, i) => {
    const [p, q] = nombreTramo(v, x);
    tarjetas.push(`<a class="ma-leg" href="#viaje=${v.id}&amp;tramo=${i}"${i === k ? ' aria-current="true"' : ''} data-i="${i}"><span class="ma-leg__n">Tramo ${i + 1}</span><span class="ma-leg__de">${esc(p)} → ${esc(q)}</span><span class="ma-leg__km">${km(x.km)}</span>${tiempo(x.t)}${x.t?.k !== 'deducido' && x.t?.r ? `<span class="ma-leg__x">${esc(x.t.r)}</span>` : ''}</a>`);
    const e = v.st?.[x.b];
    if (e) tarjetas.push(`<div class="ma-leg ma-leg--estancia"><span class="ma-leg__n">En ${esc(q)}</span>${tiempo({ k: 'dicho', v: `se quedan ${e.v}` })}<span class="ma-leg__x">${esc(e.r)}</span></div>`);
  });
  $('tira').innerHTML = tarjetas.join('');
  // Con un tramo abierto, la lista se pliega en el botón «Viajes» y el mapa usa todo el ancho.
  $('ma').classList.toggle('ma--tramo', !!t);
  const movil = innerWidth <= 760, cab = $('cab').offsetHeight + 24, izq = t ? 12 : 370;
  mapa($('mapa'), v, t ? k : null, { margen: movil ? [cab, 10, 190, 10] : [cab, 30, 200, izq] });
  $('tira').querySelector('[aria-current]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  inicio(v);
}

// Primera visita: una caja que dice qué hacer y lleva a un viaje, y dos avisos junto a la tira y al mapa.
function inicio(v) {
  const { inicio: n } = estado();
  const el = $('inicio');
  document.querySelectorAll('.ma-coach').forEach((x) => x.remove());
  el.hidden = n !== '1';
  if (n === '1') {
    el.innerHTML = `<div class="ma-inicio__caja" role="dialog" aria-labelledby="ini-tit"><h2 id="ini-tit">¿Por dónde empiezo?</h2>
      <p>Aquí está cada viaje de la Biblia en el mapa. Para empezar, sigue a Pablo de Cesarea a Roma, tramo a tramo.</p>
      <ol><li>Abajo, cada tarjeta es un tramo: lo que mide y lo que tardaron.</li><li>Tócala y el mapa se pone en ese tramo.</li><li>${innerWidth <= 760 ? 'El botón «Viajes», sobre los tramos, abre la lista de todos.' : 'A la izquierda está la lista de todos los viajes.'}</li></ol>
      <p style="display:flex;gap:8px;flex-wrap:wrap;margin:0"><a class="vj-btn vj-btn--primario" href="#viaje=viaje-a-roma&amp;inicio=2">Empezar con el viaje a Roma</a><a class="vj-btn" href="#viaje=${v.id}">Ya sé moverme</a></p></div>`;
  }
  if (n === '2' || n === '3') {
    const objetivo = n === '2' ? $('tira').querySelector('[data-i="0"]') : $('cab');
    const r = objetivo.getBoundingClientRect(), m = $('ma').getBoundingClientRect();
    const c = document.createElement('div');
    c.className = 'ma-coach';
    c.innerHTML = n === '2'
      ? `<p>Primer tramo: de Cesarea a Sidón, un día de mar. El punto lleno quiere decir que el texto da ese día.</p><a class="vj-btn vj-btn--peq" href="#viaje=${v.id}&amp;tramo=9&amp;inicio=3">Siguiente</a>`
      : `<p>Con un tramo abierto, el mapa se encuadra en él. «Abrir en el mapa» lo lleva al atlas con su fecha.</p><a class="vj-btn vj-btn--peq" href="#viaje=${v.id}&amp;tramo=9">Entendido</a>`;
    $('ma').append(c);
    c.style.left = `${Math.max(8, Math.min(r.left - m.left, m.width - c.offsetWidth - 8))}px`;
    c.style.top = n === '2' ? `${r.top - m.top - c.offsetHeight - 12}px` : `${r.bottom - m.top + 12}px`;
  }
}
addEventListener('hashchange', todo);
addEventListener('resize', todo);
todo();
})();
