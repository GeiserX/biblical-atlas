/* Diseño 2, «La hoja para el discurso». Estado: #quien=<persona>&viaje=<id>&tramo=<índice>&orden=km. */
'use strict';
(() => {
const { D, esc, km, num, tiempo, leyenda, sitio, mapa, estado, mandos, barra, grupos, paradas, nombreTramo, estancias } = window.VJ;
mandos('hoja');
document.getElementById('barra').outerHTML = barra();
const main = document.getElementById('ho');
const QUIENES = [['pablo', 'Pablo'], ['jesus', 'Jesús'], ['abrahan', 'Abrahán'], ['moises', 'Moisés'], ['elias-profeta', 'Elías'], ['david', 'David']];
const RECOMENDADO = { pablo: 'viaje-a-roma' };
const dichos = (v) => v.t.filter((t) => t.t && t.t.k !== 'deducido').length;

function guia(quien) {
  const vs = quien ? D.viajes.filter((v) => v.qid === quien) : [];
  const rec = RECOMENDADO[quien] || [...vs].sort((a, b) => dichos(b) - dichos(a) || b.s.length - a.s.length)[0]?.id;
  const orden = [...vs].sort((a, b) => (a.id === rec ? -1 : b.id === rec ? 1 : a.a - b.a));
  return `<section class="ho-guia" aria-labelledby="guia-tit"><div><h2 id="guia-tit">¿Por dónde empiezo?</h2><p class="ho-x">Dos preguntas y estás en un viaje.</p></div>
    <div><p class="ho-guia__paso">1. ¿De quién vas a hablar?</p>
      <div class="ho-chips">${QUIENES.map(([id, n]) => `<a class="ho-chip" href="#quien=${id}" aria-pressed="${id === quien}">${esc(n)}</a>`).join('')}</div>
      ${quien ? `<p class="ho-guia__paso" style="margin-top:16px">2. Elige uno de sus ${vs.length} viajes</p>
      <div class="ho-sug">${orden.slice(0, 6).map((v) => `<a href="#viaje=${v.id}"${v.id === rec ? ' class="ho-sug--rec"' : ''}>${v.id === rec ? '<em>Para empezar</em>' : ''}<b>${esc(v.n)}</b><span>${esc(v.f)}</span><span>${v.s.length} paradas · ${km(v.km)} · ${dichos(v)} ${dichos(v) === 1 ? 'tramo' : 'tramos'} con tiempo dicho</span></a>`).join('')}</div>` : ''}
    </div></section>`;
}

function indice() {
  const { quien, orden } = estado();
  main.innerHTML = `<h1>Viajes</h1><p class="ho-lema">Todos los viajes de la Biblia que tiene el atlas, con sus paradas, lo que mide cada uno en línea recta y cuántos tramos tienen el tiempo que da el texto.</p>
    ${guia(quien)}
    <div class="ho-barra"><label class="sr-only" for="f">Filtrar</label><input id="f" type="search" placeholder="Filtra por viaje, persona o lugar">${leyenda().replace('vj-leyenda', 'vj-leyenda ho-x')}</div>
    <table class="ho-t"><thead><tr><th>Viaje y paradas</th><th>Quién</th><th>Fecha</th><th class="num">Paradas</th><th class="num"><button class="ho-ordenar" id="ord" type="button">Km ${orden === 'km' ? '↓' : '↕'}</button></th><th class="num">Tiempo dicho</th></tr></thead><tbody id="filas"></tbody></table>`;
  const pintar = () => {
    const gs = grupos(document.getElementById('f').value);
    document.getElementById('filas').innerHTML = gs.map((g) => {
      const vs = orden === 'km' ? [...g.viajes].sort((a, b) => b.km - a.km) : g.viajes;
      return `<tr class="ho-era"><th colspan="6">${esc(g.n)} · ${vs.length} viajes</th></tr>${vs.map((v) => `<tr>
        <td><a class="ho-n" href="#viaje=${v.id}">${esc(v.n)}</a><span class="ho-ps">${esc(paradas(v, 9))}</span></td>
        <td data-l="Quién">${esc(v.q)}</td><td data-l="Fecha">${esc(v.f)}</td><td class="num" data-l="Paradas">${v.s.length}</td>
        <td class="num" data-l="Km">${v.sin ? 'más de ' : ''}${km(v.km)}</td><td class="num" data-l="Tiempo dicho">${dichos(v)} de ${v.t.length}</td></tr>`).join('')}`;
    }).join('');
  };
  document.getElementById('f').addEventListener('input', pintar);
  document.getElementById('ord').onclick = () => { location.hash = orden === 'km' ? (quien ? `quien=${quien}` : '') : `${quien ? `quien=${quien}&` : ''}orden=km`; };
  pintar();
}

function texto(v) {
  const sp = new Map(v.s.map((s) => [s.o, s]));
  return [`${v.n} (${v.f}), ${v.r}`, ...v.t.map((t, i) => `${i + 1}. ${sp.get(t.a).n} → ${sp.get(t.b).n}: ${km(t.km)}; ${t.t ? `${t.t.v} (${t.t.k === 'deducido' ? 'deducido de las fechas' : t.t.r})` : 'sin fecha'}`), `Total: ${km(v.km)} en línea recta entre paradas.`].join('\n');
}

function hoja(v) {
  const { tramo: k } = estado();
  const sp = new Map(v.s.map((s) => [s.o, s]));
  const primero = v.s[0].n, ultimo = v.s[v.s.length - 1].n, est = estancias(v);
  let acum = 0;
  const filas = v.t.map((t, i) => {
    acum += t.km || 0;
    const [a, b] = nombreTramo(v, t), e = v.st?.[t.b];
    const span = t.span?.primero ? `<br><span class="ho-x">De ${esc(t.span.de)} a ${esc(t.span.a)}: ${tiempo(t.span, { largo: true })}</span>` : '';
    const abierto = i === k;
    return `<tr${abierto ? ' class="ho-abierto"' : ''}><td class="num">${i + 1}</td><td class="ho-de">${esc(a)} → ${esc(b)}<small>${esc(sp.get(t.a).f || '')} → ${esc(sp.get(t.b).f || '')}</small></td>
      <td class="num" data-l="Km">${km(t.km)}</td><td class="num" data-l="Acumulado">${km(acum)}</td>
      <td data-l="Tiempo">${tiempo(t.t)}${t.t?.x ? `<br><span class="ho-x">${esc(t.t.x)}</span>` : ''}${span}</td><td data-l="Cita">${esc(t.t?.r || sp.get(t.b).r || '')}</td>
      <td class="ho-col-mapa"><a class="vj-btn vj-btn--peq" href="#viaje=${v.id}${abierto ? '' : `&amp;tramo=${i}`}" aria-expanded="${abierto}">${abierto ? 'Cerrar' : 'Mapa'}</a></td></tr>
      ${abierto ? `<tr class="ho-mapa"><td colspan="7"><div class="ho-mapa__in"><div class="vj-mapa" id="mapa-tramo"></div><div>
        <p><b>${km(t.km)}</b> en línea recta de ${esc(a)} a ${esc(b)}.</p><p>${tiempo(t.t, { largo: true })}</p>
        <p class="ho-x">${t.t?.k === 'deducido' ? 'Las fechas de las dos paradas son todo lo que hay: el texto no dice cuánto tardaron.' : esc(t.t?.x || '')}</p>
        <p><a class="vj-btn vj-btn--primario vj-btn--peq" href="${sitio(`parada:${v.id}/${t.b}`)}">Abrir en el mapa</a></p></div></div></td></tr>` : ''}
      ${e ? `<tr class="ho-estancia"><td></td><td colspan="6">En ${esc(b)}: ${tiempo({ k: 'dicho', v: `se quedan ${e.v}`, r: e.r }, { largo: true })} · ${esc(e.x)}</td></tr>` : ''}`;
  }).join('');
  main.innerHTML = `<p class="ho-x"><a href="#">Viajes</a> › ${esc(v.q)}</p>
    <div class="ho-cab"><h1 tabindex="-1">${esc(v.n)}</h1><span>${esc(v.q)} · ${esc(v.f)} · <a href="${sitio(`viaje:${v.id}`)}">${esc(v.r)}</a></span></div>
    <p class="ho-resumen">De ${esc(primero)} a ${esc(ultimo)}: ${v.s.length} paradas y ${v.sin ? 'más de ' : 'unos '}${km(v.km)} en línea recta. El texto da el tiempo de ${dichos(v)} de sus ${v.t.length} tramos${est.length ? ` y lo que duran ${est.length} estancias` : ''}; el resto sale de las fechas de las paradas.</p>
    <div class="ho-acciones"><button class="vj-btn" type="button" onclick="print()">Imprimir</button><button class="vj-btn" type="button" id="copiar">Copiar como texto</button><a class="vj-btn" href="${sitio(`viaje:${v.id}`)}">El viaje en el mapa</a></div>
    ${leyenda()}
    <table class="ho-t" style="margin-top:12px"><thead><tr><th class="num">#</th><th>Tramo</th><th class="num">Km</th><th class="num">Acumulado</th><th>Tiempo</th><th>Cita</th><th class="ho-col-mapa"></th></tr></thead>
    <tbody>${filas}</tbody><tfoot><tr><td></td><td>Total</td><td class="num">${km(v.km)}</td><td></td><td colspan="3">${esc(v.f)}</td></tr></tfoot></table>`;
  document.getElementById('copiar').onclick = (e) => { navigator.clipboard?.writeText(texto(v)); e.target.textContent = 'Copiado'; };
  if (k != null && v.t[k]) { const el = document.getElementById('mapa-tramo'); mapa(el, v, k); }
}

function todo() {
  const { viaje: id } = estado();
  const v = id && window.VJ.viaje(id);
  if (v) hoja(v); else indice();
}
addEventListener('hashchange', todo);
addEventListener('resize', () => { const el = document.getElementById('mapa-tramo'); if (el) todo(); });
todo();
})();
