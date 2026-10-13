/* Prototipos de la sección «Viajes»: lo que comparten los cuatro diseños. Datos en datos.js (distancias.py).
   VJ.mapa dibuja un tramo o un viaje sobre los fondos de relieve de la portada (../portada/assets/img), que son
   capturas del mapa del sitio en Mercator con centro y ancho en grados conocidos (render-backdrops.mjs, FRAMES). */
'use strict';
(() => {
const D = window.VIAJES;
const porId = new Map(D.viajes.map((v) => [v.id, v]));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (x, d = 0) => x.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Kilómetros para leer: con un decimal por debajo de 10, enteros hasta 100 y de diez en diez por encima. */
function km(x) {
  if (x == null) return 'sin medir';
  if (x < 10) return `${num(x, 1)} km`;
  if (x < 100) return `${num(Math.round(x))} km`;
  return `${num(Math.round(x / 10) * 10)} km`;
}
const TIPOS = {
  dicho: { n: 'Lo dice el texto', c: 'dicho' },
  fuente: { n: 'Lo calcula una nota de estudio', c: 'fuente' },
  deducido: { n: 'Deducido de las fechas', c: 'deducido' },
};
/** La marca de un tiempo: el valor y, en una forma y un color, de dónde sale. */
function tiempo(t, { largo = false } = {}) {
  if (!t) return '<span class="vj-t vj-t--nada">sin fecha</span>';
  const k = TIPOS[t.k];
  const ref = t.r ? ` <span class="vj-t__ref">${esc(t.r)}</span>` : '';
  return `<span class="vj-t vj-t--${k.c}" title="${esc(k.n)}${t.x ? `: ${esc(t.x)}` : ''}"><i class="vj-t__marca" aria-hidden="true"></i><span class="sr-only">${esc(k.n)}: </span>${esc(t.v)}${largo ? ref : ''}</span>`;
}
const leyenda = () => `<p class="vj-leyenda"><span class="vj-t vj-t--dicho"><i class="vj-t__marca"></i>Lo dice el texto</span><span class="vj-t vj-t--fuente"><i class="vj-t__marca"></i>Lo calcula una nota de estudio</span><span class="vj-t vj-t--deducido"><i class="vj-t__marca"></i>Deducido de las fechas de las paradas</span><span class="vj-leyenda__km">Distancias en línea recta entre paradas, como las dibuja el mapa</span></p>`;

const sitioBase = /\/docs\/ideas\/mockups\//.test(location.pathname) ? '../../../../../site/index.html' : 'https://biblical-atlas.geiser.cloud/';
/** Dirección del sitio que abre una parada: hoy el sitio no tiene «tramo», así que se abre la parada de llegada. */
const sitio = (sel) => `${sitioBase}#sel=${sel}`;

// ---------------------------------------------------------------------------
// Mapa de un tramo o de un viaje sobre el relieve
// ---------------------------------------------------------------------------
const FRAMES = [
  { id: 'jerusalem', c: [35.23, 31.77], span: 0.24 },
  { id: 'galilee-judea', c: [35.4, 32.22], span: 2.7 },
  { id: 'paul-journeys', c: [24.6, 36.4], span: 25 },
  { id: 'bible-lands', c: [36.2, 31.4], span: 28 },
];
const IW = 2560, IH = 1440;
const my = (lat) => (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI;
const proy = (f, [lon, lat]) => [((lon - (f.c[0] - f.span / 2)) / f.span) * IW, IH / 2 - ((my(lat) - my(f.c[1])) / f.span) * IW];
const cabe = (f, pts) => pts.every((p) => { const [x, y] = proy(f, p); return x > IW * 0.06 && x < IW * 0.94 && y > IH * 0.06 && y < IH * 0.94; });
const base = location.pathname.includes('/viajes/') && !/\/viajes\/(index\.html)?$/.test(location.pathname) ? '../' : './';
const fondo = (id) => `${base}../portada/assets/img/${id}-wide.webp`;

/** Pinta en `el` el viaje v con el tramo k (índice en v.t) resaltado, o el viaje entero si k es null. */
function mapa(el, v, k = null, { etiquetas = true, compacto = false, margen = [0, 0, 0, 0] } = {}) {
  const W = el.clientWidth || 600, H = el.clientHeight || 360;
  // margen: lo que tapan otros paneles [arriba, derecha, abajo, izquierda]; el foco se encuadra en el resto.
  const [mt, mr, mb, ml] = margen, Wi = Math.max(120, W - mr - ml), Hi = Math.max(120, H - mt - mb), cxi = ml + Wi / 2, cyi = mt + Hi / 2;
  const leg = k == null ? null : v.t[k];
  const sp = new Map(v.s.map((s) => [s.o, s]));
  const todos = v.s.filter((s) => s.c).map((s) => s.c);
  const foco = leg ? [sp.get(leg.a), sp.get(leg.b)].filter((s) => s?.c).map((s) => s.c) : todos;
  if (!foco.length) { el.innerHTML = '<p class="vj-mapa__vacio">Este tramo no tiene punto en el mapa: el texto no sitúa el lugar.</p>'; return; }
  const f = FRAMES.find((x) => cabe(x, foco)) || null;
  // Proyección: la del fondo si hay uno que contenga el foco; si no, Mercator propio encuadrado en el foco.
  let P, s, tx, ty;
  if (f) {
    const xs = foco.map((p) => proy(f, p));
    const x0 = Math.min(...xs.map((p) => p[0])), x1 = Math.max(...xs.map((p) => p[0]));
    const y0 = Math.min(...xs.map((p) => p[1])), y1 = Math.max(...xs.map((p) => p[1]));
    const cubre = Math.max(W / IW, H / IH);
    s = Math.min(Wi / Math.max(x1 - x0, 1) / 1.6, Hi / Math.max(y1 - y0, 1) / 1.6);
    s = Math.max(cubre, Math.min(s, cubre * (compacto ? 2.2 : 3.2)));
    const encuadre = () => {
      tx = cxi - s * (x0 + x1) / 2; ty = cyi - s * (y0 + y1) / 2;
      tx = Math.min(0, Math.max(W - IW * s, tx)); ty = Math.min(0, Math.max(H - IH * s, ty));
    };
    // Junto al borde del relieve el fondo no se puede mover más: se acerca hasta que el foco cae en la parte libre.
    const dentro = () => xs.every(([x, y]) => tx + s * x >= ml + 40 && tx + s * x <= W - mr - 40 && ty + s * y >= mt + 30 && ty + s * y <= H - mb - 20);
    encuadre();
    // Solo mientras el tramo siga cabiendo en la parte libre: un tramo más grande que ella se deja como está.
    const cabeA = (z) => (x1 - x0) * z <= Wi - 80 && (y1 - y0) * z <= Hi - 50;
    for (let n = 0; n < 12 && !dentro() && cabeA(s * 1.12); n++) { s *= 1.12; encuadre(); }
    P = (c) => { const [x, y] = proy(f, c); return [tx + s * x, ty + s * y]; };
  } else {
    const lo = foco.map((p) => p[0]), la = foco.map((p) => my(p[1]));
    const sx = Math.max(...lo) - Math.min(...lo) || 1, sy = Math.max(...la) - Math.min(...la) || 1;
    const e = Math.min(Wi / sx, Hi / sy) / 1.6, cx = (Math.max(...lo) + Math.min(...lo)) / 2, cy = (Math.max(...la) + Math.min(...la)) / 2;
    P = (c) => [cxi + (c[0] - cx) * e, cyi - (my(c[1]) - cy) * e];
  }
  const legs = v.t.map((t, i) => ({ t, i, A: sp.get(t.a), B: sp.get(t.b) })).filter((x) => x.A?.c && x.B?.c);
  const linea = (x) => { const [a, b] = [P(x.A.c), P(x.B.c)]; return `M${a[0].toFixed(1)},${a[1].toFixed(1)}L${b[0].toFixed(1)},${b[1].toFixed(1)}`; };
  const estilo = (x) => (x.A.p || x.B.p ? ' vj-ruta--pend' : x.A.i || x.B.i ? ' vj-ruta--inc' : '');
  const rutas = legs.map((x) => `<path class="vj-ruta${leg ? (x.i === k ? ' vj-ruta--foco' : ' vj-ruta--resto') : ''}${estilo(x)}" d="${linea(x)}"${x.i === k ? ' marker-end="url(#vj-flecha)"' : ''}/>`).join('');
  const marcados = leg ? new Set([leg.a, leg.b]) : new Set(v.s.map((x) => x.o));
  const vistos = new Set(), cajas = [];
  // En el viaje entero, un nombre que pisaría otro ya puesto se calla; el punto se queda. La caja se estima a 7 px por letra.
  const libre = (a, b, n) => {
    const c = [a + 8, b - 19, a + 8 + n.length * 7, b - 3];
    if (!leg && cajas.some((o) => c[0] < o[2] && o[0] < c[2] && c[1] < o[3] && o[1] < c[3])) return false;
    cajas.push(c);
    return true;
  };
  const conPunto = v.s.filter((x) => x.c), rotulos = new Set();
  // La salida y la llegada se rotulan antes que las paradas de en medio, para que no las calle un nombre vecino.
  for (const x of new Set([conPunto[0], conPunto[conPunto.length - 1], ...conPunto])) {
    const [a, b] = P(x.c), clave = x.l || x.n;
    if (etiquetas && marcados.has(x.o) && !vistos.has(clave) && (leg || !compacto) && libre(a, b, x.n)) { vistos.add(clave); rotulos.add(x); }
  }
  const puntos = conPunto.map((x) => {
    const [a, b] = P(x.c), on = marcados.has(x.o), rot = rotulos.has(x);
    return `<g class="vj-pt${on ? ' vj-pt--on' : ''}"><circle cx="${a.toFixed(1)}" cy="${b.toFixed(1)}" r="${on ? 5 : 3}"/>${rot ? `<text x="${(a + 8).toFixed(1)}" y="${(b - 7).toFixed(1)}">${esc(x.n)}</text>` : ''}</g>`;
  }).join('');
  el.innerHTML = `${f ? `<img class="vj-mapa__fondo" alt="" src="${fondo(f.id)}" style="transform:translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${s.toFixed(4)})">` : '<div class="vj-mapa__papel"></div>'}
    <svg class="vj-mapa__svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(leg ? `Tramo de ${sp.get(leg.a).n} a ${sp.get(leg.b).n}` : `Ruta de ${v.n}`)}">
      <defs><marker id="vj-flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0L10,5L0,10z" class="vj-flecha"/></marker></defs>
      ${rutas}${puntos}</svg>
    <p class="vj-mapa__credito">Relieve: Natural Earth, USGS, NOAA, Copernicus, Mapzen · Lugares: OpenBible.info</p>`;
}

// ---------------------------------------------------------------------------
// Estado en la dirección, la barra del sitio y los mandos del prototipo
// ---------------------------------------------------------------------------
function estado() {
  const q = new URLSearchParams(location.hash.slice(1));
  return { viaje: q.get('viaje'), tramo: q.has('tramo') ? Number(q.get('tramo')) : null, inicio: q.get('inicio'), quien: q.get('quien'), orden: q.get('orden') };
}
function ir(cambios, { reemplazar = false } = {}) {
  const q = new URLSearchParams(location.hash.slice(1));
  for (const [k, v] of Object.entries(cambios)) { if (v == null || v === false) q.delete(k); else q.set(k, v); }
  const h = `#${q.toString()}`;
  if (reemplazar) history.replaceState(null, '', h); else history.pushState(null, '', h);
  dispatchEvent(new Event('vj:estado'));
}
addEventListener('popstate', () => dispatchEvent(new Event('vj:estado')));

const DISENOS = [['cuaderno', 'Cuaderno de viajes'], ['hoja', 'La hoja para el discurso'], ['mapa', 'El mapa y su tira'], ['esquema', 'El viaje en una línea']];
function mandos(actual) {
  const d = document.createElement('div');
  d.className = 'proto-tools';
  d.innerHTML = `<details class="proto-switch"><summary>Diseño: ${esc(DISENOS.find((x) => x[0] === actual)[1])}</summary><nav aria-label="Diseños de Viajes">${DISENOS.map(([id, n]) => `<a href="../${id}/${location.hash}"${id === actual ? ' aria-current="page"' : ''}>${esc(n)}</a>`).join('')}</nav></details>
    <button type="button" class="proto-moon" aria-pressed="false" title="Modo reunión" aria-label="Modo reunión"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>`;
  document.body.prepend(d);
  const b = d.querySelector('.proto-moon'), r = document.documentElement;
  if (new URLSearchParams(location.search).get('tema') === 'reunion') r.classList.add('be-reunion');
  b.setAttribute('aria-pressed', r.classList.contains('be-reunion'));
  b.onclick = () => { r.classList.toggle('be-reunion'); b.setAttribute('aria-pressed', r.classList.contains('be-reunion')); };
}
/** La barra de arriba del sitio, con «Viajes» como una entrada más. Solo «Viajes» funciona en el prototipo. */
function barra() {
  return `<header class="vj-barra"><a class="vj-barra__logo" href="${sitioBase}">biblical-atlas</a>
    <nav class="vj-barra__nav" aria-label="Secciones"><a href="${sitioBase}#t=50.3000">Mapa</a><a href="${sitioBase}#t=50.3000&amp;v=4125">Línea</a><a href="./" aria-current="page">Viajes</a><a href="${sitioBase}#portada=1">Estudio</a></nav></header>`;
}

/** Los viajes de la lista, agrupados por época y, dentro, por quien viaja. */
function grupos(filtro = '') {
  const n = filtro.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const pasa = (v) => !n || [v.n, v.q, ...v.s.map((s) => s.n)].join(' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(n);
  return D.eras.map((e) => ({ ...e, viajes: D.viajes.filter((v) => v.e === e.id && pasa(v)) })).filter((e) => e.viajes.length);
}
const paradas = (v, max = 99) => {
  const ns = v.s.map((s) => s.n);
  return ns.length > max ? `${ns.slice(0, max - 1).join(' · ')} · … · ${ns[ns.length - 1]}` : ns.join(' · ');
};
const nombreTramo = (v, t) => { const sp = new Map(v.s.map((s) => [s.o, s])); return [sp.get(t.a).n, sp.get(t.b).n]; };
/** Lo que dura el viaje según las estancias dichas, para el resumen: «3 meses en Malta, 7 días en Puteoli…». */
const estancias = (v) => Object.entries(v.st || {}).map(([o, x]) => ({ o: Number(o), ...x, n: v.s.find((s) => s.o === Number(o)).n }));

window.VJ = { D, viaje: (id) => porId.get(id), esc, km, num, tiempo, leyenda, sitio, mapa, estado, ir, mandos, barra, grupos, paradas, nombreTramo, estancias, TIPOS };
})();
