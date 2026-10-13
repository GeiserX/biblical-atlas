/* Diseño 4, «El viaje en una línea». Estado: #viaje=<id>&tramo=<índice>&inicio=<paso>. En el ordenador la línea va
   de izquierda a derecha; en el teléfono, de arriba abajo. La distancia entre paradas es la del tramo en kilómetros,
   con un mínimo para que se lean los nombres de los tramos cortos. */
'use strict';
(() => {
const { D, esc, km, num, tiempo, leyenda, sitio, mapa, estado, mandos, barra, grupos, paradas, nombreTramo } = window.VJ;
mandos('esquema');
document.getElementById('barra').outerHTML = barra();
const main = document.getElementById('es');
const MAX = Math.max(...D.viajes.map((v) => v.km));

function indice() {
  main.innerHTML = `<h1>Viajes</h1><p class="es-lema">Cada viaje es una línea, y su largo es lo que mide en línea recta, todos a la misma escala. Los puntos son las paradas.</p>
    <div class="es-empieza"><div><h2>¿Por dónde empiezo?</h2><p>Recorre el viaje de Pablo a Roma tramo a tramo: 14 paradas, con los días que da el texto.</p></div><a class="vj-btn vj-btn--primario" href="#viaje=viaje-a-roma&amp;tramo=0&amp;inicio=1">Recorrerlo</a></div>
    <label class="sr-only" for="f">Filtrar</label><input class="es-filtro" id="f" type="search" placeholder="Pablo, Elías, Corinto…">
    <p class="es-escala">Escala: la línea más larga son ${km(MAX)}.</p><div id="filas"></div>`;
  const pintar = () => {
    document.getElementById('filas').innerHTML = grupos(document.getElementById('f').value).map((g) => `<h2 class="es-era">${esc(g.n)}</h2>${g.viajes.map((v) => {
      let a = 0;
      const ps = [0, ...v.t.filter((t) => t.km != null).map((t) => (a += t.km))];
      return `<a class="es-fila" href="#viaje=${v.id}"><span><b>${esc(v.n)}</b><small>${esc(v.q)} · ${esc(paradas(v, 6))}</small></span>
        <span class="es-barra" aria-hidden="true"><span class="es-barra__l" style="width:${Math.max(0.4, (v.km / MAX) * 100)}%"></span>${ps.map((x) => `<span class="es-barra__p" style="left:${(x / MAX) * 100}%"></span>`).join('')}</span>
        <span class="es-fila__km">${km(v.km)}</span></a>`;
    }).join('')}`).join('');
  };
  document.getElementById('f').addEventListener('input', pintar);
  pintar();
}

/** Posición de cada parada en la línea: kilómetros acumulados, con un hueco mínimo de `min` píxeles. */
function posiciones(v, largo, min) {
  const linea = v.t.filter((t) => !v.s.find((s) => s.o === t.b)?.bf);
  const total = linea.reduce((s, t) => s + (t.km || 0), 0) || 1;
  const util = largo - min * linea.length;
  const pos = new Map([[linea[0]?.a ?? v.s[0].o, 0]]);
  let x = 0;
  for (const t of linea) { x += min + Math.max(0, util) * ((t.km || 0) / total); pos.set(`${t.a}>${t.b}`, x); }
  return { linea, pos };
}

function viaje(v) {
  const { tramo: k, inicio } = estado();
  const movil = innerWidth <= 760;
  const largo = movil ? 1500 : Math.min(main.clientWidth - 200, 1240), min = movil ? 64 : 46;
  const { linea, pos } = posiciones(v, largo, min);
  const sp = new Map(v.s.map((s) => [s.o, s]));
  let x0 = 0, svg = '';
  const est = [];
  linea.forEach((t) => {
    const i = v.t.indexOf(t), x1 = pos.get(`${t.a}>${t.b}`), on = i === k;
    const cls = `es-tramo${on ? ' es-tramo--on' : ''}${t.km == null ? ' es-tramo--sin' : sp.get(t.a).i || sp.get(t.b).i ? ' es-tramo--inc' : ''}`;
    const tt = t.t ? `${t.t.k === 'deducido' ? '◇ ' : t.t.k === 'fuente' ? '○ ' : '● '}${t.t.v}` : '';
    const tcls = `es-t${t.t && t.t.k !== 'deducido' ? ' es-t--dicho' : ''}`;
    const [a, b] = nombreTramo(v, t);
    const etiqueta = `Tramo ${i + 1}, de ${a} a ${b}: ${km(t.km)}, ${t.t ? t.t.v : 'sin fecha'}`;
    if (movil) {
      svg += `<g class="${cls}" tabindex="0" role="link" data-i="${i}" aria-label="${esc(etiqueta)}"><rect x="10" y="${x0 + 40}" width="390" height="${x1 - x0}"/><line x1="30" y1="${x0 + 40}" x2="30" y2="${x1 + 40}"/>
        <text x="52" y="${(x0 + x1) / 2 + 36}">${esc(km(t.km))}</text><text class="${tcls}" x="52" y="${(x0 + x1) / 2 + 54}">${esc(tt)}</text></g>`;
    } else {
      // El tiempo va entero si cabe en el tramo; si no, solo su marca, y el texto queda en la etiqueta y en el panel.
      const corto = x1 - x0 < 92, cabe = tt.length * 6.6 < x1 - x0 - 8, marca = tt.slice(0, 1);
      svg += `<g class="${cls}" tabindex="0" role="link" data-i="${i}" aria-label="${esc(etiqueta)}"><rect x="${x0 + 20}" y="70" width="${x1 - x0}" height="110"/><line x1="${x0 + 20}" y1="130" x2="${x1 + 20}" y2="130"/>
        <text x="${(x0 + x1) / 2 + 20}" y="${corto && i % 2 ? 174 : 116}" text-anchor="middle">${esc(km(t.km))}</text>${tt && (cabe || !corto) ? `<text class="${tcls}" x="${(x0 + x1) / 2 + 20}" y="154" text-anchor="middle">${esc(cabe ? tt : marca)}</text>` : ''}</g>`;
    }
    x0 = x1;
  });
  // Las estaciones, encima de los tramos.
  const puntos = [[linea[0].a, 0], ...linea.map((t) => [t.b, pos.get(`${t.a}>${t.b}`)])];
  puntos.forEach(([o, x], j) => {
    const s = sp.get(o), e = v.st?.[o];
    svg += movil
      ? `<g class="es-est"><circle cx="30" cy="${x + 40}" r="8"/><text x="48" y="${x + 45}">${esc(s.n)}</text>${e ? `<text class="es-estancia" x="48" y="${x + 61}">● se quedan ${esc(e.v)}</text>` : ''}</g>`
      : `<g class="es-est"><circle cx="${x + 20}" cy="130" r="8"/><text transform="translate(${x + 24},${j % 2 ? 98 : 98}) rotate(-38)">${esc(s.n)}</text>${e ? `<text class="es-estancia" transform="translate(${x + 14},196) rotate(38)">● ${esc(e.v)}</text>` : ''}</g>`;
  });
  // Un tiempo que el texto da para varios tramos juntos va en una llave bajo ellos (en el teléfono, a su derecha).
  const xDe = new Map(puntos.map(([o, x]) => [o, x]));
  v.t.filter((t) => t.span?.primero).forEach((t) => {
    const ini = xDe.get(t.span.o[0]), fin = xDe.get(t.span.o[1]);
    if (ini == null || fin == null) return;
    const txt = `${t.span.k === 'fuente' ? '○' : '●'} ${t.span.v}`;
    svg += movil
      ? `<g class="es-llave"><path d="M404,${ini + 40}h-6v${fin - ini}h6"/><text transform="translate(392,${(ini + fin) / 2 + 40}) rotate(-90)" text-anchor="middle">${esc(txt)}</text></g>`
      : `<g class="es-llave"><path d="M${ini + 20},262v8h${fin - ini}v-8"/><text x="${(ini + fin) / 2 + 20}" y="290" text-anchor="middle">${esc(txt)} de ${esc(t.span.de)} a ${esc(t.span.a)}</text></g>`;
  });
  const alto = movil ? x0 + 120 : 310, arriba = movil ? 0 : 60;   // arriba: sitio para los nombres inclinados
  const t = k != null ? v.t[k] : null;
  const PASOS = [
    'Cada tramo de la línea es tan largo como lo que mide. De Cesarea a Sidón son unos 130 km en línea recta.',
    'El punto lleno dice que el tiempo lo da el texto: aquí, un día de mar. El rombo vacío, que solo lo dan las fechas.',
    'Toca cualquier tramo y el mapa se pone en él. Sigue con «Siguiente» hasta Roma.',
  ];
  const n = Number(inicio);
  main.innerHTML = `<p class="es-nota"><a href="#">Viajes</a> › ${esc(v.q)}</p>
    <div class="es-cab"><h1>${esc(v.n)}</h1><p>${esc(v.q)} · ${esc(v.f)} · <a href="${sitio(`viaje:${v.id}`)}">${esc(v.r)}</a></p><p><b>${v.s.length} paradas · ${v.sin ? 'más de ' : 'unos '}${km(v.km)}</b> en línea recta</p></div>
    ${PASOS[n - 1] ? `<div class="es-guia" role="status"><p><b>${n} de ${PASOS.length}.</b> ${esc(PASOS[n - 1])}</p>${n < PASOS.length ? `<a class="vj-btn vj-btn--peq" href="#viaje=${v.id}&amp;tramo=${n === 2 ? 9 : 0}&amp;inicio=${n + 1}">Siguiente</a>` : ''}<a class="vj-btn vj-btn--peq" href="#viaje=${v.id}${k != null ? `&amp;tramo=${k}` : ''}">Cerrar</a></div>` : ''}
    ${leyenda()}
    <div class="es-linea"><svg width="${movil ? 410 : largo + 200}" height="${alto + arriba}" role="group" aria-label="Paradas del viaje a escala de kilómetros"><g transform="translate(0,${arriba})">${svg}</g></svg></div>
    <p class="es-nota">Las paradas van separadas por lo que mide cada tramo; los tramos de menos de ${movil ? 'unos' : ''} ${min} px se ensanchan para que se lean.</p>
    ${t ? panel(v, t, k) : ''}`;
  main.querySelectorAll('.es-tramo').forEach((g) => {
    const abrir = () => { location.hash = `viaje=${v.id}&tramo=${g.dataset.i}`; };
    g.onclick = abrir; g.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } };
  });
  if (t) { mapa(document.getElementById('mapa-tramo'), v, k); if (movil) document.getElementById('panel').scrollIntoView({ block: 'start' }); }
}

function panel(v, t, k) {
  const [a, b] = nombreTramo(v, t), sp = new Map(v.s.map((s) => [s.o, s]));
  return `<section class="es-panel" id="panel" aria-labelledby="panel-tit"><div class="vj-mapa" id="mapa-tramo"></div><div>
    <p class="es-nota">Tramo ${k + 1} de ${v.t.length}</p><h2 id="panel-tit">De ${esc(a)} a ${esc(b)}</h2>
    <dl><dt>Distancia</dt><dd><b>${km(t.km)}</b> en línea recta</dd><dt>Tiempo</dt><dd>${tiempo(t.t, { largo: true })}${t.t?.x ? `<br><span class="es-nota">${esc(t.t.x)}</span>` : ''}</dd>
    ${t.span ? `<dt>Junto</dt><dd>De ${esc(t.span.de)} a ${esc(t.span.a)}: ${tiempo(t.span, { largo: true })}</dd>` : ''}
    <dt>Fechas</dt><dd>${esc(sp.get(t.a).f || '')} → ${esc(sp.get(t.b).f || '')}</dd><dt>Texto</dt><dd>${esc(sp.get(t.b).r || '')}</dd></dl>
    <div class="es-nav">${k > 0 ? `<a class="vj-btn vj-btn--peq" href="#viaje=${v.id}&amp;tramo=${k - 1}">← Anterior</a>` : ''}${k < v.t.length - 1 ? `<a class="vj-btn vj-btn--peq" href="#viaje=${v.id}&amp;tramo=${k + 1}">Siguiente →</a>` : ''}<a class="vj-btn vj-btn--peq vj-btn--primario" href="${sitio(`parada:${v.id}/${t.b}`)}">Abrir en el mapa</a></div></div></section>`;
}

function todo() {
  const { viaje: id } = estado();
  const v = id && window.VJ.viaje(id);
  if (v) viaje(v); else indice();
}
addEventListener('hashchange', todo);
addEventListener('resize', todo);
todo();
})();
