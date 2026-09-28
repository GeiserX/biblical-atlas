/* biblical-earth · línea de tiempo (SVG propio): de Adán (4026 a.e.c.) al año 100 en seis escalas, carriles que salen
   de los datos (eras, imperios, reyes, personas, cartas, sucesos, meses hebreos, fechas seculares), densidad, minimapa,
   regla, bucle, marcadores, pausa en los sucesos, escribir la fecha y gestos (rueda, arrastre, pinza).
   Dueño durante el reparto: app-tiempo. */
'use strict';
(() => {
const BE = window.BE;
const { E, sucio, programar, esc, $, clamp, tramo, fechaCorta, fmtAnio, citas, span, setT, reproducir, saltar, MESES, norm } = BE;

// Rango del cursor: de la creación de Adán (4026 a.e.c. = −4025) al año 100. base.js lo lee siempre a través de BE.
BE.T_MIN = -4025; BE.T_MAX = 100;
const SPAN_MIN = 0.03;                          // unos once días
const spanMax = () => BE.T_MAX - BE.T_MIN;
const ZOOMS = [
  { n: 'Milenios', c: 'Mil', s: 4125 }, { n: 'Siglos', c: 'Sig', s: 400 }, { n: 'Décadas', c: 'Déc', s: 40 },
  { n: 'Años', c: 'Año', s: 8 }, { n: 'Meses', c: 'Mes', s: 1.5 }, { n: 'Días', c: 'Día', s: 0.12 },
];
const EJE = 26, CARRIL = 30;

// Estado propio de la línea. Lo que se comparte va en la dirección (BE.parametros).
const L = {
  fijados: [],            // carriles fijados arriba, en orden (T-06, T-08): ids de carril o de persona
  secular: true,          // fechas seculares como nota (C-02)
  pausa: true,            // pausa en los sucesos al reproducir (T-11)
  regla: null,            // [a, b] medidos con la regla (T-15)
  bucle: null,            // [a, b] que la reproducción repite (T-12)
  grande: false,          // línea ampliada (tecla T)
  modoRegla: false,
  grupo: null,            // sucesos de la última píldora pulsada: { claves, trs, sel }. Van resaltados, nunca atenuados
  meses: null,            // «ambos», «nuestros» o «hebreos»; null: lo de siempre, ambos
};

const ICONOS = {
  persona: '<svg class="be-i be-i--sm" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  carta: '<svg class="be-i be-i--sm" viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 11h6M9 15h6" stroke="currentColor" stroke-width="1.6"/></svg>',
  reloj: '<svg class="be-i be-i--sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  corona: '<svg class="be-i be-i--sm" viewBox="0 0 24 24"><path d="m4 17-1-9 5 4 4-6 4 6 5-4-1 9Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  reloj2: '<svg class="be-i be-i--sm" viewBox="0 0 24 24"><path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
  templo: '<svg class="be-i be-i--sm" viewBox="0 0 24 24"><path d="M3 9 12 4l9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
  calendario: '<svg class="be-i be-i--sm" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M4 10h16M9 3v4M15 3v4" stroke="currentColor" stroke-width="1.7"/></svg>',
  secular: '<svg class="be-i be-i--sm" viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-dasharray="3 2.4"/></svg>',
  alfiler: '<svg class="be-i be-i--sm" viewBox="0 0 24 24"><path d="M9 3h6l-1 6 3 3H7l3-3Zm3 9v9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  menu: '<svg class="be-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/></svg>',
};
function colorPotencia(p) {
  const n = norm(`${p.id} ${p.nombre}`);
  if (/egipt/.test(n)) return 'var(--emp-egipto)';
  if (/asiri/.test(n)) return 'var(--emp-asiria)';
  if (/babilon|caldea/.test(n)) return 'var(--emp-babilonia)';
  if (/medo|persa|persia/.test(n)) return 'var(--emp-persia)';
  if (/grec|macedon|seleuc|tolom/.test(n)) return 'var(--emp-grecia)';
  if (/roma/.test(n)) return 'var(--emp-roma)';
  if (/israel|juda/.test(n)) return 'var(--emp-israel)';
  return 'var(--node-periodo)';
}

let anchoLinea = 800, altoPista = 200;
/** Rótulos de los elementos. Van en una capa encima de todas las formas, cada uno en un <g> con el data-sel de su
    elemento, así que pulsar el texto selecciona lo que nombra y nunca lo que queda debajo. */
let rotulos = [];
function rotulo(sel, clases, texto, extra = '') {
  if (texto) rotulos.push(`<g class="item-texto${clases}" data-sel="${esc(sel)}"${extra} aria-hidden="true">${texto}</g>`);
}
const xDe = (t) => ((t - E.vista[0]) / span()) * anchoLinea;
const tDe = (x) => E.vista[0] + (x / anchoLinea) * span();
const anchoTexto = (s, px = 10.5) => s.length * px * 0.6 + 4;
const visible = (tr) => tr && tr[1] > E.vista[0] && tr[0] < E.vista[1];
function nivelFuentes(ids) { return Math.min(...(ids || []).map((id) => BE.D.fuentes[id]?.nivel || 2)); }
function dim(clave) {
  if (L.grupo?.claves.has(clave)) return ' resaltado';
  const r = E.resaltado;
  if (!r) return '';
  return r.claves.has(clave) ? ' resaltado' : ' atenuado';
}
/** Año corto para etiquetas: «607» a.e.c. y «49» e.c.; con era si el tramo cruza el cero o todo es a.e.c. */
const anioCorto = (t) => { const y = Math.floor(t); return y > 0 ? String(y) : String(1 - y); };
/** Borde difuminado según la precisión (T-16): «a» ambos, «i» hacia atrás (antes de), «d» hacia delante (después de, fin abierto). */
function difuso(f) {
  if (!f) return '';
  const tx = norm(f.texto || '');
  const antes = f.desde == null || /^a\.\s|^antes de/.test(tx);
  const despues = f.hasta == null || /^d\.\s|^despues de|fin sin fecha|al menos hasta/.test(tx);
  if (antes && !despues) return 'i';
  if (despues && !antes) return 'd';
  if (f.aprox || (antes && despues)) return 'a';
  return '';
}
const mascara = (k) => (k ? ` mask="url(#m-difuso${k === 'a' ? '' : `-${k}`})"` : '');
/** Tramo que se dibuja: un final abierto se alarga un poco y se difumina, sin inventar su fin. */
function tramoDibujo(f) {
  const tr = BE.ventanaFecha(f) || tramo(f);
  if (!tr) return null;
  if (f.hasta == null && f.desde != null) return [tr[0], tr[1] + Math.max(1, span() * 0.04)];
  if (f.desde == null && f.hasta != null) return [tr[0] - Math.max(1, span() * 0.04), tr[1]];
  return tr;
}

/** Tramo que se dibuja de un periodo. Una potencia con un extremo sin fecha llega hasta la vecina (BE.tramoPotencia). */
const tramoDibujoPeriodo = (p) => (p.tipo === 'potencia' && BE.tramoPotencia(p)?.abierto ? BE.tramoPotencia(p) : tramoDibujo(p.fecha));

// ---------------------------------------------------------------------------
// Carriles: cuáles hay, cuántas filas ocupa cada uno y cómo se dibujan
// ---------------------------------------------------------------------------
const periodosDe = (tipo) => (BE.D.periodos || []).filter((p) => p.tipo === tipo);
/** Reparte en filas los tramos que se solapan (máximo `max`). Devuelve Map(obj → fila) y el número de filas.
    Un solape de un año o menos no cuenta: el sucesor empieza el año en que acaba su predecesor (Claudio 41-54, Nerón 54-68).
    Las corregencias de varios años sí van en otra fila. */
function filasSinSolape(lista, trDe, max = 2) {
  const fin = [], fila = new Map();
  for (const o of [...lista].sort((a, b) => (trDe(a)?.[0] ?? 0) - (trDe(b)?.[0] ?? 0))) {
    const tr = trDe(o);
    if (!tr) continue;
    let i = fin.findIndex((f) => f <= tr[0] + 1 + 1e-6);
    if (i < 0 && fin.length < max) i = fin.length;
    if (i < 0) i = fin.indexOf(Math.min(...fin));
    fin[i] = Math.max(fin[i] ?? -Infinity, tr[1]);
    fila.set(o, i);
  }
  return { fila, n: Math.max(1, fin.length) };
}
let cacheCat = null;
/** Catálogo de carriles posibles con estos datos. Se calcula una vez por carga de datos. */
function catalogo() {
  if (cacheCat && cacheCat.D === BE.D) return cacheCat.lista;
  const D = BE.D;
  const lista = [];
  const lanePeriodos = (id, nombre, icono, ps, extra = {}) => {
    if (!ps.length) return;
    const max = extra.maxFilas || 2;
    lista.push({ id, nombre, icono, tipo: 'periodos', ps, fila: new Map(), filas: 1, ...extra,
      // Las filas se reparten con lo que se ve: un solape fuera de la vista no gasta una fila.
      medir() { const r = filasSinSolape(ps.filter((p) => visible(tramoDibujoPeriodo(p))), tramoDibujoPeriodo, max); this.fila = r.fila; this.filas = r.n; },
      hay: () => ps.some((p) => visible(BE.tramoPeriodo(p))),
      n2: ps.every((p) => nivelFuentes(p.fuentes) > 1) });
  };
  if (D.calendario?.meses?.length) lista.push({ id: 'meses', nombre: 'Meses', icono: 'calendario', tipo: 'meses', filas: 1, orden: 0, hay: () => span() < 2.5,
    prio: () => 88, medir: medirMeses, ayuda: 'Nuestros meses y los meses hebreos, alineados. Las equivalencias son aproximadas.' });
  lanePeriodos('eras', 'Eras', 'reloj2', periodosDe('era'), { orden: 1, prio: () => (span() >= 150 ? 92 : 30), clase: 'era', maxFilas: 1 });
  lanePeriodos('imperios', 'Imperio (Dn 2)', 'corona', periodosDe('potencia'), { orden: 2, prio: () => (span() >= 60 ? 86 : 35), clase: 'potencia', maxFilas: 1 });
  // Pablo y las cartas son detalle del siglo I: a escala de siglos o milenios ceden el sitio a las eras y los imperios.
  lista.push({ id: 'pablo', nombre: 'Pablo', icono: 'persona', tipo: 'pablo', filas: 1, orden: 4, prio: () => (span() >= 300 ? 40 : 80),
    hay: () => BE.P.length && BE.P.at(-1).b > E.vista[0] && BE.P[0].a < E.vista[1] });
  if (D.cartas.length) lista.push({ id: 'cartas', nombre: 'Cartas', icono: 'carta', tipo: 'cartas', filas: 2, nombres: ['Cartas', 'Más cartas'], orden: 6, prio: () => (span() >= 300 ? 38 : 70),
    hay: () => D.cartas.some((c) => visible(tramo(c.fecha))) });
  lista.push({ id: 'sucesos', nombre: 'Sucesos', icono: 'reloj', tipo: 'sucesos', filas: 1, orden: 7, prio: () => 75, medir: medirSucesos,
    hay: () => (D.eventos || []).some((e) => visible(BE.ventanaEvento(e))) });
  lanePeriodos('emperadores', 'Emperadores', 'corona', periodosDe('emperador'), { orden: 8, prio: () => 60 });
  for (const { k, nombre, ps } of reinos()) lanePeriodos(k ? `reyes-${k}` : 'reyes', nombre, 'corona', ps, { orden: 9, prio: () => 66 });
  lanePeriodos('gobernadores', 'Gobernadores', 'corona', periodosDe('gobernador'), { orden: 10, prio: () => 55 });
  lanePeriodos('sacerdotes', 'Sumos sacerdotes', 'templo', periodosDe('sumo-sacerdote'), { orden: 11, prio: () => 50 });
  const conAlt = [...(D.eventos || []), ...(D.periodos || []), ...Object.values(D.personas || {})].filter((o) => o.alternativas?.length);
  if (conAlt.length) lista.push({ id: 'secular', nombre: 'Secular · nota', icono: 'secular', tipo: 'secular', filas: 1, orden: 12, prio: () => 45, conAlt,
    hay: () => L.secular && conAlt.some((o) => o.alternativas.some((a) => visible(tramo(a.fecha)))),
    ayuda: 'Fechas de la cronología secular cuando difiere. Solo como nota: no mueven el cursor.' });
  cacheCat = { D, lista };
  return lista;
}
/** Reyes por reino. Los datos no dicen el reino, pero sí las capitales: dos reinados que comparten un lugar son del
    mismo reino (Omrí une Tirsá y Samaria; David, Hebrón y Jerusalén). Un grupo de un solo reinado se une al que empieza
    cuando él acaba (Saúl, en Guibeá, con David). El carril se nombra por su lugar más repetido y, si otro se repite
    tres veces o más, por los dos: «Reyes · Samaria y Tirsá». */
function reinos() {
  const reyes = periodosDe('rey');
  const padre = reyes.map((_, i) => i);
  const raiz = (i) => (padre[i] === i ? i : (padre[i] = raiz(padre[i])));
  const porLugar = new Map();
  reyes.forEach((p, i) => (p.lugares || []).forEach((l) => { if (porLugar.has(l)) padre[raiz(i)] = raiz(porLugar.get(l)); else porLugar.set(l, i); }));
  const grupos = new Map();
  reyes.forEach((p, i) => { const r = raiz(i); if (!grupos.has(r)) grupos.set(r, []); grupos.get(r).push(p); });
  const lista = [...grupos.values()];
  for (const g of lista.filter((x) => x.length === 1)) {
    const tr = tramo(g[0].fecha);
    const otro = tr && lista.find((x) => x !== g && x.length > 1 && x.some((p) => { const t2 = tramo(p.fecha); return t2 && Math.abs(t2[0] - (tr[1] - 1)) <= 1; }));
    if (otro) { otro.push(g[0]); g.length = 0; }
  }
  return lista.filter((g) => g.length).map((ps) => {
    const cuenta = new Map();
    for (const p of ps) for (const l of new Set(p.lugares || [])) cuenta.set(l, (cuenta.get(l) || 0) + 1);
    const orden = [...cuenta.entries()].filter(([l]) => BE.L[l]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const k = orden[0]?.[0] || '';
    const nombres = orden.slice(0, 2).filter(([, n], i) => i === 0 || n >= 3).map(([l]) => BE.L[l].nombre);
    return { k, nombre: nombres.length ? `Reyes · ${nombres.join(' y ')}` : 'Reyes', ps };
  });
}
/** Carril de una persona (T-06): su actividad, sus estancias con lugar y los caminos entre ellas. */
function carrilPersona(id) {
  if (id === 'pablo') return catalogo().find((c) => c.id === 'pablo');
  const p = BE.PERS[id];
  if (!p) return null;
  const est = BE.estancias(id);
  const act = p.fecha ? tramoDibujo(p.fecha) : null;
  if (!est.length && !act) return null;
  return { id, nombre: p.nombre, icono: 'persona', tipo: 'persona', persona: id, filas: 1, orden: 5, prio: () => 94, est, act,
    hay: () => visible(act) || est.some((s) => s.b > E.vista[0] && s.a < E.vista[1]) };
}
const carrilPorId = (id) => catalogo().find((c) => c.id === id) || carrilPersona(id);
/** Personas que pueden tener carril: con estancias o con fecha de actividad. */
function personasConCarril() {
  const ids = new Set(BE.personasConEstancias());
  for (const p of Object.values(BE.PERS)) if (p.fecha && tramo(p.fecha)) ids.add(p.id);
  return [...ids].map((id) => BE.PERS[id]).filter(Boolean).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
/** Carriles que se ven ahora: los fijados siempre; después, por prioridad, los que tienen algo en la vista, hasta llenar el alto. */
let carrilesVista = [], ocultos = [];
function elegirCarriles() {
  const cap = Math.max(2, Math.floor((altoPista - EJE + 4) / CARRIL));   // el último carril puede perder un par de píxeles, como en v0
  const fijos = L.fijados.map(carrilPorId).filter(Boolean);
  const ids = new Set(fijos.map((c) => c.id));
  const auto = [];
  if (E.sel?.tipo === 'persona' && !ids.has(E.sel.id)) { const c = carrilPersona(E.sel.id); if (c) auto.push(c); }
  for (const c of catalogo()) if (!ids.has(c.id) && !auto.includes(c) && c.hay()) auto.push(c);
  for (const c of [...fijos, ...auto]) c.medir?.();
  auto.sort((a, b) => b.prio() - a.prio());
  const elegidos = [...fijos];
  let filas = fijos.reduce((n, c) => n + c.filas, 0);
  ocultos = [];
  for (const c of auto) {
    if (filas + c.filas > cap && c.tipo === 'sucesos' && cap > filas) c.medir(cap - filas);   // menos filas antes que ninguna
    if (filas + c.filas <= cap) { elegidos.push(c); filas += c.filas; } else ocultos.push(c);
  }
  // Orden vertical estable: los fijados arriba en su orden; el resto en el orden del catálogo.
  const resto = elegidos.slice(fijos.length).sort((a, b) => a.orden - b.orden);
  carrilesVista = [...fijos, ...resto];
  let y = EJE;
  for (const c of carrilesVista) { c.y = y; y += c.filas * CARRIL; }
  return carrilesVista;
}
let claveEtiquetas = '';
function pintarCarriles() {
  const clave = carrilesVista.map((c) => `${c.id}:${c.filas}:${L.fijados.includes(c.id)}:${(c.nombres || []).join('/')}`).join('|') + `|${ocultos.length}`;
  if (clave === claveEtiquetas) return;
  claveEtiquetas = clave;
  const n = ocultos.length;
  $('#carriles').innerHTML = `<div class="carriles-eje"><button type="button" class="carriles-boton" data-linea="carriles" aria-label="Elegir carriles${n ? `: ${n} sin sitio` : ''}" title="Elegir y fijar carriles">Carriles${n ? `<b> +${n}</b>` : ''}</button></div>${carrilesVista.map((c) => {
    const fijo = L.fijados.includes(c.id);
    const n2 = c.n2 ? BE.marcaNivel(2) : '';
    const pin = `<button type="button" class="carril-pin${fijo ? ' on' : ''}" data-fijar="${esc(c.id)}" aria-pressed="${fijo}" aria-label="${fijo ? 'Soltar' : 'Fijar'} el carril ${esc(c.nombre)}" title="${fijo ? 'Soltar este carril' : 'Fijar este carril arriba'}">${ICONOS.alfiler}</button>`;
    const nombres = c.nombres || [c.nombre];
    const alto = c.nombres ? '' : (c.filas > 1 ? ` style="height:${c.filas * CARRIL}px"` : '');
    return nombres.map((nm, i) => {
      const ayuda = c.ayudas?.[i] || c.ayuda;
      const icono = c.iconos ? (ICONOS[c.iconos[i]] || '') : (ICONOS[c.icono] || '');
      const clase = c.clases?.[i] ? ` ${c.clases[i]}` : '';
      const mas = c.tipo === 'meses' && i === Math.max(0, (c.tiposFila || []).indexOf('hebreos')) ? enlaceCalendario('carril-ayuda', '?', '¿Qué meses son estos?') : '';
      const texto = c.cortos?.[i] ? `<span class="nombre-largo">${esc(nm)}</span><span class="nombre-corto" aria-hidden="true">${esc(c.cortos[i])}</span>` : esc(nm);
      return `<div class="be-lane-label${c.persona ? ' carril-persona' : ''}${clase}"${alto}${ayuda ? ` title="${esc(ayuda)}"` : ''}>${icono}${c.persona ? `<button type="button" class="carril-nombre enlace-titulo" data-sel="persona:${esc(c.persona)}">${esc(nm)}</button><span class="edad" data-edad="${esc(c.persona)}"></span>` : `<span>${texto}</span>`}${mas}${i === 0 ? `${n2}${pin}` : ''}</div>`;
    }).join('');
  }).join('')}`;
}

// ---------------------------------------------------------------------------
// Dibujo de la línea
// ---------------------------------------------------------------------------
function defs() {
  const grad = (id, a, b, c, d) => `<linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="${a}"/><stop offset=".06" stop-color="#fff" stop-opacity="${b}"/><stop offset=".94" stop-color="#fff" stop-opacity="${c}"/><stop offset="1" stop-color="#fff" stop-opacity="${d}"/></linearGradient>`;
  return `<defs>
    ${grad('g-difuso', 0, 1, 1, 0)}${grad('g-difuso-i', 0, 1, 1, 1)}${grad('g-difuso-d', 1, 1, 1, 0)}
    <mask id="m-difuso" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#g-difuso)"/></mask>
    <mask id="m-difuso-i" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#g-difuso-i)"/></mask>
    <mask id="m-difuso-d" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#g-difuso-d)"/></mask>
    <linearGradient id="g-cambio-d" x1="0" x2="1"><stop offset=".04" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="g-cambio-i" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".96" stop-color="#fff" stop-opacity="1"/></linearGradient>
    <mask id="m-cambio-d" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#g-cambio-d)"/></mask>
    <mask id="m-cambio-i" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#g-cambio-i)"/></mask>
    <pattern id="p-rayas" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(135)"><rect width="3" height="8" fill="rgba(122,92,142,.13)"/></pattern>
    <pattern id="p-rayas-claras" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(135)"><rect width="3" height="7" fill="rgba(255,255,255,.45)"/></pattern>
    <pattern id="p-hebreo" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.4" height="6" fill="rgba(74,65,54,.16)"/></pattern>
    <pattern id="p-calculo" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(135)"><rect width="3" height="7" fill="rgba(155,61,90,.18)"/></pattern>
  </defs>`;
}
function pintarLineaFija() {
  const svg = $('#linea-svg');
  const pista = $('#pista');
  anchoLinea = pista.clientWidth || 800;
  altoPista = pista.clientHeight || 200;
  svg.setAttribute('width', anchoLinea); svg.setAttribute('height', altoPista);
  svg.setAttribute('viewBox', `0 0 ${anchoLinea} ${altoPista}`);
  const s = span(), pxAnio = anchoLinea / s;
  elegirCarriles();
  pintarCarriles();
  const partes = [defs()];
  carrilesVista.forEach((c) => { for (let k = 0; k < c.filas; k++) if (((c.y - EJE) / CARRIL + k) % 2) partes.push(`<rect class="fila-par" x="0" y="${c.y + k * CARRIL}" width="${anchoLinea}" height="${CARRIL}"/>`); });
  partes.push(noches());
  partes.push(`<g class="eje">${marcasEje(pxAnio)}</g>`);
  partes.push(densidad());
  const V = BE.viajeActual(BE.dondeEsta(E.t));
  if (eleccion && eleccion.vista !== E.vista.join('~')) cerrarEleccion();
  if (L.grupo && (L.grupo.sel !== BE.selTexto(E.sel) || !L.grupo.trs.some(visible))) L.grupo = null;   // la lista señala un punto que ya se ha movido
  rotulos = [];
  for (const c of carrilesVista) {
    if (c.tipo === 'pablo') pintarPablo(partes, c.y, V, pxAnio);
    else if (c.tipo === 'cartas') pintarCartas(partes, c.y);
    else if (c.tipo === 'sucesos') pintarSucesos(partes, c);
    else if (c.tipo === 'periodos') pintarPeriodos(partes, c);
    else if (c.tipo === 'persona') pintarPersona(partes, c);
    else if (c.tipo === 'meses') pintarMeses(partes, c);
    else if (c.tipo === 'secular') pintarSecular(partes, c);
  }
  pintarJuntos(partes);
  partes.push(`<g class="capa-rotulos">${rotulos.join('')}</g>`);
  rotulos = [];
  pintarRegla(partes);
  pintarBucle(partes);
  pintarMarcadores(partes);
  partes.push('<g id="linea-cursor"></g>');
  // El SVG se reescribe entero: el elemento que tenía el foco del teclado lo recupera (el mismo data-sel), si sigue.
  const conFoco = svg.contains(document.activeElement), foco = conFoco ? document.activeElement.closest('g.item[data-sel]')?.dataset.sel : null;
  svg.innerHTML = partes.join('');
  // Atenuar solo tiene sentido si en la vista hay algo que resaltar: si nada de lo que se ve tiene que ver con la
  // selección (Edén en 1473 a.e.c.), todo va a opacidad plena en vez de quedar gris.
  svg.classList.toggle('sin-foco', !![...svg.querySelectorAll('.item.atenuado')].length && ![...svg.querySelectorAll('.item.resaltado')].some((g) => { const b = g.getBBox(); return b.x + b.width > 0 && b.x < anchoLinea; }));
  if (conFoco) ((foco && svg.querySelector(`g.item[data-sel="${CSS.escape(foco)}"]`)) || pista).focus({ preventScroll: true });
  sucio.cursor = true;
  $('#velocidad').textContent = BE.textoVelocidad();
  document.querySelectorAll('[data-zoom]').forEach((b) => {
    const z = +b.dataset.zoom;
    const on = Math.abs(Math.log(s / z)) < Math.log(2.2);
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
  });
  pintarMinimapa();
  pintarSelectorMeses();
  pintarLineaFija.claveV = V?.id;
}

/** Pablo: un tramo por viaje, con sus paradas como marcas (v0). */
function pintarPablo(partes, yP, V, pxAnio) {
  for (const v of BE.D.viajes) {
    const ps = BE.P.filter((x) => x.viaje === v);
    if (!ps.length) continue;
    const a = ps[0].a, b = ps[ps.length - 1].b;
    if (b < E.vista[0] || a > E.vista[1]) continue;
    const x0 = xDe(a), x1 = Math.max(xDe(b), x0 + 4);
    const algunaRes = E.resaltado && ps.some((x) => E.resaltado.claves.has(`parada:${x.key}`));
    const cls = E.resaltado ? (E.resaltado.claves.has(`viaje:${v.id}`) || algunaRes ? ' resaltado' : ' atenuado') : '';
    const w = x1 - x0;
    const etiqueta = recortar(`${v.nombre} · ${fechaCorta(v.fecha)}`, w - 14);
    // El tramo del viaje es el fondo de sus paradas: un clic en una parada no pregunta si se quería el viaje.
    partes.push(`<g class="item viaje${v === V ? ' activo' : ''}${cls}" data-sel="viaje:${esc(v.id)}" data-fondo="1" tabindex="0" role="button" aria-label="${esc(v.nombre)}, ${esc(fechaCorta(v.fecha))}">
      <rect x="${x0}" y="${yP + 5}" width="${w}" height="20" rx="5" class="barra-viaje" style="fill:${BE.colorViaje(v.id)}"${v.fecha?.aprox ? ' mask="url(#m-difuso)"' : ''}/></g>`);
    if (etiqueta) rotulo(`viaje:${v.id}`, cls, `<text x="${x0 + Math.min(12, w * 0.06) + 4}" y="${yP + 19}" class="texto-barra">${esc(etiqueta)}</text>`);
    if (pxAnio > 45) {
      for (const st of ps) {
        const x = xDe(st.a);
        const c2 = dim(`parada:${st.key}`);
        partes.push(`<g class="item parada${c2}" data-sel="parada:${esc(st.key)}"><title>${esc(st.lugar.nombre)} · ${esc(st.p.referencia)}</title>
          <rect x="${x - 1}" y="${yP + 7}" width="${Math.max(2, xDe(st.b) - x + 2)}" height="16" rx="1" class="marca-parada${st.narrativa ? ' narrativa' : ''}"/></g>`);
      }
    }
  }
}
/** Cartas: las que comparten fechas van juntas. Tramo si la fecha abarca varios años; si no, rombo en el momento en que
    el modelo pone al escritor donde la escribió. Los rombos a menos de 24 px se funden en uno. Dos filas sin solapes. */
function pintarCartas(partes, y0) {
  const grupos = new Map(), rombos = [];
  for (const c of BE.cartasOrdenadas()) {
    const tr = tramo(c.fecha);
    if (!tr) continue;
    if (tr[1] - tr[0] > 1) {
      const k = `${tr[0]}|${tr[1]}`;
      if (!grupos.has(k)) grupos.set(k, { tr, cartas: [] });
      grupos.get(k).cartas.push(c);
    } else rombos.push({ tr, x: xDe(BE.momentoCarta(c)), c });
  }
  rombos.sort((a, b) => a.x - b.x);
  const gruposRombo = [];
  for (const r of rombos) {
    const g = gruposRombo.at(-1);
    if (g && r.x - g.x < 24) g.cartas.push(r.c);
    else gruposRombo.push({ tr: r.tr, x: r.x, cartas: [r.c] });
  }
  const items = [...grupos.values(), ...gruposRombo].map(({ tr, cartas, x }) => {
    const esTramo = x == null;
    const cortas = cartas.map(BE.abrCarta).join(' · ');
    const nombre = cartas.length > 1 ? cortas : cartas[0].libro;
    const etiqueta = `${nombre}${esTramo ? ` · ${fechaCorta(cartas[0].fecha).replace(' e.c.', '')}` : ''}`;
    const x0 = esTramo ? xDe(tr[0]) : x - 7;
    const x1 = esTramo ? Math.max(xDe(tr[1]), x0 + 6) : x0 + 14;
    const lx = esTramo ? Math.max(x0, 0) + 8 : x0 + 19;
    return { tr, cartas, esTramo, etiqueta, corto: cortas, x0, x1, lx, lw: anchoTexto(etiqueta) };
  }).filter((it) => it.x1 > -300 && it.x0 < anchoLinea + 50);
  empaquetar(items, [0, 1]);
  for (const it of items) {
    const y = y0 + it.fila * CARRIL;
    const sel = E.sel?.tipo === 'carta' && it.cartas.some((c) => c.id === E.sel.id);
    const principal = sel ? it.cartas.find((c) => c.id === E.sel.id) : it.cartas[0];
    const res = E.resaltado ? (it.cartas.some((c) => E.resaltado.claves.has(`carta:${c.id}`)) ? ' resaltado' : ' atenuado') : '';
    const cls = `item carta${sel ? ' seleccionada' : ''}${res}`;
    const nombres = it.cartas.map((c) => c.libro).join(', ');
    const aria = `aria-label="${esc(nombres)}, ${esc(fechaCorta(principal.fecha))}"`;
    const forma = it.esTramo
      ? `<rect x="${it.x0}" y="${y + 6}" width="${it.x1 - it.x0}" height="18" rx="5" class="tramo-carta"/>`
      : `<rect x="${it.x0 + 1}" y="${y + 9}" width="12" height="12" rx="2" transform="rotate(45 ${it.x0 + 7} ${y + 15})" class="rombo"/>`;
    partes.push(`<g class="${cls}" data-sel="carta:${esc(principal.id)}" tabindex="0" role="button" ${aria}><title>${esc(nombres)} · ${esc(fechaCorta(principal.fecha))}</title>${forma}</g>`);
    rotulo(`carta:${principal.id}`, res, textoItem(it, y, it.esTramo ? 'texto-carta' : 'texto-punto'));
  }
}
/** Sucesos: un tramo por suceso y un rombo si es un punto a esta escala. Los que se amontonan se agrupan en una píldora
    («4 sucesos · 1473-1467», o «4 · 1473-1467» si no hay sitio) que acerca el zoom a su tramo (T-03). Lo calculado por nosotros va hueco y rosa (C-03). Van en dos
    filas (tres con la línea ampliada) para que se pisen menos; lo que aún se pisa se elige al pulsar (elegirEntre). */
function itemsSucesos() {
  const s = span();
  const base = (BE.D.eventos || []).map((e) => {
    const tr = BE.ventanaEvento(e);
    if (!tr) return null;
    let x0 = xDe(tr[0]), x1 = Math.max(xDe(tr[1]), x0 + 6);
    const punto = x1 - x0 < 9;
    // Un rombo ocupa su diagonal, más que su tramo: se reparte y se rotula por lo que mide de verdad.
    if (punto) { const cx = (x0 + x1) / 2; x0 = cx - 9; x1 = cx + 9; }
    const lib = citas((e.pasajes || []).join('; '))[0]?.libro;
    const lugar = BE.L[(e.lugares || [])[0]]?.nombre;
    const corto = lib && lib.num !== 44 && lib.num >= 45 ? lib.abr : `${lugar || e.titulo.split(/[\s:,]/)[0]} ${anioCorto(tr[0])}`;
    // Un suceso que ocupa buena parte de la vista es el fondo de su fila: los cortos van encima y no le quitan una fila.
    const fondo = !punto && x1 - x0 > anchoLinea * 0.4;
    return { e, tr, x0, x1, lx: punto ? x1 + 2 : Math.max(x0, 0) + 7, etiqueta: e.titulo, corto, lw: anchoTexto(e.titulo), punto, fondo };
  }).filter((it) => it && it.x1 > -300 && it.x0 < anchoLinea + 50).sort((a, b) => a.x0 - b.x0);
  // Agrupar lo que se pisa cuando la escala es de siglos o más. Una píldora ocupa lo que mide su texto, así que se
  // repite hasta que ninguna forma pisa a la siguiente.
  // Se agrupa con la etiqueta corta; rotular la alarga a «N sucesos · …» si cabe antes del siguiente de su fila.
  const rotularGrupo = (g) => {
    const n = g.grupo.length, ts = g.grupo.map((x) => x.tr[0]);
    g.anios = rangoAnios(Math.min(...ts), Math.max(...ts));
    g.etiqueta = `${n} · ${g.anios}`;
    g.largo = `${n} sucesos · ${g.anios}`;
    g.minimo = `${n} sucesos`;
    g.lw = anchoTexto(g.etiqueta) + 12;
    g.x1 = Math.max(g.xf, g.x0 + g.lw);
    g.lx = g.x0 + 8; g.corto = g.etiqueta;
  };
  let items = base;
  if (s > 60) {
    for (let cambio = true; cambio;) {
      cambio = false;
      const out = [];
      for (const it of items) {
        const g = out.at(-1);
        if (g && it.x0 < (g.grupo ? g.x1 : Math.max(g.x1, g.x0 + 14)) + 6) {
          const miembros = [...(g.grupo || [g]), ...(it.grupo || [it])];
          const nuevo = { grupo: miembros, x0: g.x0, xf: Math.max(g.xf ?? g.x1, it.xf ?? it.x1), tr: [Math.min(g.tr[0], it.tr[0]), Math.max(g.tr[1], it.tr[1])] };
          rotularGrupo(nuevo);
          out[out.length - 1] = nuevo;
          cambio = true;
        } else out.push(it);
      }
      items = out;
    }
  }
  return items;
}
/** Años de una píldora: «1473-1467», «1473» si es uno solo y, si cruza el cambio de era, «4 a.e.c.-33 e.c.». */
function rangoAnios(a, b) {
  const ya = Math.floor(a), yb = Math.floor(b);
  if (ya === yb) return anioCorto(a);
  return (ya > 0) === (yb > 0) ? `${anioCorto(a)}-${anioCorto(b)}` : `${fmtAnio(ya)}-${fmtAnio(yb)}`;
}
/** Filas del carril de sucesos: las que de verdad hacen falta, hasta dos (tres con la línea ampliada). */
function medirSucesos(max = L.grande ? 3 : 2) {
  this.items = itemsSucesos();
  empaquetar(this.items, [...Array(max).keys()]);
  this.filas = Math.max(1, ...this.items.map((it) => it.fila + 1));
}
function pintarSucesos(partes, c) {
  let items = c.items;
  if (!items) { items = itemsSucesos(); empaquetar(items, [...Array(c.filas).keys()]); }
  items.sort((a, b) => !!b.fondo - !!a.fondo);
  c.items = null;
  for (const it of items) {
    const y = c.y + it.fila * CARRIL;
    if (it.grupo) {
      const tiene = (claves) => it.grupo.some((x) => claves.has(`evento:${x.e.id}`));
      const res = L.grupo && tiene(L.grupo.claves) ? ' resaltado' : E.resaltado ? (tiene(E.resaltado.claves) ? ' resaltado' : ' atenuado') : '';
      const nombres = it.grupo.map((x) => `${x.e.fecha?.texto || ''} · ${x.e.titulo}`).join('\n');
      const primero = it.grupo.reduce((m, x) => (x.tr[0] < m.tr[0] ? x : m));
      const rango = `data-rango="${it.tr[0]}~${it.tr[1]}" data-grupo="${esc(it.grupo.map((x) => x.e.id).join(','))}" data-primero="${esc(primero.e.id)}"`;
      partes.push(`<g class="item grupo-sucesos${res}" ${rango} tabindex="0" role="button" aria-label="${it.grupo.length} sucesos, ${esc(it.anios)}: acercar"><title>${it.grupo.length} sucesos · ${esc(it.anios)}\n${esc(nombres)}\nPulsa para acercar</title>
        <rect x="${it.x0}" y="${y + 6}" width="${it.x1 - it.x0}" height="18" rx="9" class="pildora"/><text x="${it.x0 + 8}" y="${y + 19}" class="texto-pildora">${esc(it.etiqueta)}</text></g>`);
      continue;
    }
    const e = it.e;
    const calc = e.fecha?.tipo === 'derivada';
    const est = BE.eventoEstimado(e);
    const titulo = `${e.titulo} · ${e.fecha?.texto || ''}${calc ? ' · cálculo nuestro, sin verificar' : ''}`;
    let forma;
    if (it.punto) {
      const cx = (it.x0 + it.x1) / 2;
      forma = `<rect x="${cx - 6}" y="${y + 9}" width="12" height="12" rx="2" transform="rotate(45 ${cx} ${y + 15})" class="rombo-evento${calc ? ' calculo' : ''}"/>`;
    } else {
      forma = `<rect x="${it.x0}" y="${y + 6}" width="${it.x1 - it.x0}" height="18" rx="5" class="tramo-evento${calc ? ' calculo' : ''}"${est && !calc ? mascara(difuso(e.fecha) || 'a') : ''}/>${calc ? `<rect x="${it.x0}" y="${y + 6}" width="${it.x1 - it.x0}" height="18" rx="5" fill="url(#p-calculo)" pointer-events="none"/>` : ''}`;
    }
    if (calc && it.texto) it.texto = `${it.texto}${it.texto === it.etiqueta ? ' · cálculo nuestro' : ''}`;
    const d = dim(`evento:${e.id}`);
    partes.push(`<g class="item evento${calc ? ' evento-calculo' : ''}${it.fondo ? ' evento-fondo' : ''}${d}" data-sel="evento:${esc(e.id)}"${it.fondo ? ' data-fondo="1"' : ''} tabindex="0" role="button" aria-label="${esc(titulo)}"><title>${esc(titulo)}</title>
      ${forma}</g>`);
    rotulo(`evento:${e.id}`, d, textoItem(it, y, calc ? 'texto-calculo' : 'texto-evento'));
  }
}
/** Periodos (eras, imperios, emperadores, reyes, gobernadores, sumos sacerdotes). Las eras y los imperios llevan su
    nombre dentro y, si no cabe, al lado (T-03). Pulsar una era o un imperio acerca el zoom a él (T-02). */
function pintarPeriodos(partes, c) {
  const items = [];
  for (const p of c.ps) {
    const tr = tramoDibujoPeriodo(p);
    if (!visible(tr)) continue;
    const fila = c.fila.get(p) || 0;
    items.push({ p, tr, fila, x0: xDe(tr[0]), x1: xDe(tr[1]), abierto: tr.abierto || '' });
  }
  items.sort((a, b) => a.x0 - b.x0);
  items.forEach((it, i) => {
    const { p, fila } = it;
    const y = c.y + fila * CARRIL;
    const x0 = it.x0, x1 = Math.max(it.x1, x0 + 3);
    const texto = `${p.nombre}${c.clase === 'era' || c.clase === 'potencia' ? '' : ` · ${String(p.fecha.texto || fechaCorta(p.fecha)).replace(' e.c.', '')}`}`;
    // Cambio sin fechar entre dos potencias: las dos barras se funden en el mismo tramo. La que se va lleva el nombre a
    // la izquierda y la que llega, a la derecha; cada una usa como mucho su mitad.
    const pareja = (o) => it.abierto && o.abierto && o.abierto !== it.abierto && o.x0 < x1 && o.x1 > x0;
    const cruce = items.some((o) => o !== it && o.fila === fila && pareja(o));
    const sig = items.slice(i + 1).find((o) => o.fila === fila && !pareja(o));
    const fin = Math.min(sig && sig.x0 < x1 ? sig.x0 : x1, anchoLinea);   // el siguiente de la fila se dibuja encima: el texto acaba antes
    const medio = (x0 + x1) / 2;
    let etiqueta = '';
    if (cruce && it.abierto === 'i') {
      const t2 = recortar(texto, fin - 8 - Math.max(medio, 0) - 6);
      if (t2) etiqueta = `<text x="${fin - 8}" y="${y + 19}" text-anchor="end" class="texto-barra">${esc(t2)}</text>`;
    } else {
      const xi = Math.max(x0, 0) + 8;
      const ancho = (cruce ? Math.min(medio, fin) : fin) - xi - 6;
      const conCambio = cruce ? `${texto} · cambio sin fechar →` : '';
      const dentro = conCambio && recortar(conCambio, ancho) === conCambio ? conCambio : recortar(texto, ancho);
      if (dentro && (dentro === texto || dentro.length > 6)) etiqueta = `<text x="${xi}" y="${y + 19}" class="texto-barra">${esc(dentro)}</text>`;
      else if (!cruce) {
        const libre = (sig ? sig.x0 : anchoLinea + 400) - x1 - 10;
        const fuera = recortar(p.nombre, libre);
        if (fuera) etiqueta = `<text x="${x1 + 5}" y="${y + 19}" class="texto-fuera">${esc(fuera)}</text>`;
      }
    }
    const color = c.clase === 'potencia' ? colorPotencia(p) : null;
    const trP = BE.tramoPeriodo(p);
    const rango = c.clase === 'era' || c.clase === 'potencia' ? ` data-rango="${trP[0]}~${trP[1]}"` : '';
    const narr = p.fecha?.tipo === 'narrativa';
    const cambio = it.abierto ? ` · cambio sin fechar: ${it.abierto === 'd' ? 'no sabemos cuándo dejó de ser la potencia mundial' : 'no sabemos cuándo pasó a ser la potencia mundial'}` : '';
    const mk = it.abierto ? ` mask="url(#m-cambio-${it.abierto})"` : mascara(difuso(p.fecha));
    const d = dim(`periodo:${p.id}`);
    partes.push(`<g class="item periodo periodo--${c.clase || c.id.replace(/-.*/, '')}${d}${narr ? ' narrativa' : ''}" data-sel="periodo:${esc(p.id)}"${rango} tabindex="0" role="button" aria-label="${esc(p.nombre)}, ${esc(p.fecha.texto || fechaCorta(p.fecha))}${esc(cambio)}"><title>${esc(p.nombre)} · ${esc(p.fecha.texto || fechaCorta(p.fecha))}${esc(cambio)}</title>
      <rect x="${x0}" y="${y + 5}" width="${Math.max(x1 - x0 - 1, 3)}" height="20" rx="4" class="barra-periodo"${color ? ` style="fill:${color}"` : ''}${mk}/>${narr ? `<rect x="${x0}" y="${y + 5}" width="${Math.max(x1 - x0 - 1, 3)}" height="20" rx="4" fill="url(#p-rayas-claras)" pointer-events="none"/>` : ''}</g>`);
    rotulo(`periodo:${p.id}`, d, etiqueta, rango);
  });
}
/** Carril de una persona: su actividad de fondo, sus estancias (rayadas si la fecha es estimada) y el camino entre ellas. */
function pintarPersona(partes, c) {
  const y = c.y, color = BE.colorPersona(c.persona);   // un solo color por persona: el del mapa (mapa.js)
  if (c.act && visible(c.act)) {
    const x0 = xDe(c.act[0]), x1 = Math.max(xDe(c.act[1]), x0 + 3);
    const f = BE.PERS[c.persona].fecha;
    partes.push(`<g class="item actividad${dim(`persona:${c.persona}`)}" data-sel="persona:${esc(c.persona)}" data-fondo="1"><title>${esc(BE.PERS[c.persona].nombre)}: activo ${esc(f.texto || fechaCorta(f))}</title>
      <rect x="${x0}" y="${y + 24}" width="${x1 - x0}" height="4" rx="2" class="barra-actividad" style="fill:${color}"${mascara(difuso(f))}/></g>`);
  }
  const est = c.est.filter((s) => s.b > E.vista[0] - span() && s.a < E.vista[1] + span());
  // Camino entre dos estancias cercanas: línea discontinua (no sabemos por dónde ni cuándo exactamente).
  for (let i = 0; i + 1 < est.length; i++) {
    const a = est[i], b = est[i + 1];
    if (b.a <= a.b || b.a - a.b > 0.25 || a.lugar.id === b.lugar.id) continue;
    partes.push(`<line x1="${xDe(a.b)}" x2="${xDe(b.a)}" y1="${y + 15}" y2="${y + 15}" class="camino" style="stroke:${color}"><title>De ${esc(a.lugar.nombre)} a ${esc(b.lugar.nombre)}: tramo sin fecha</title></line>`);
  }
  const items = est.map((s) => {
    const x0 = xDe(s.a), x1 = Math.max(xDe(s.b), x0 + 5);
    return { s, x0, x1, lx: x0 + 6, etiqueta: s.lugar.nombre, corto: s.lugar.nombre.slice(0, 3), lw: anchoTexto(s.lugar.nombre) };
  }).filter((it) => it.x1 > -300 && it.x0 < anchoLinea + 50);
  // Las estancias largas («vivió en») van debajo y las cortas encima. Las etiquetas se ponen al final, en el hueco que
  // dejan las cortas: nunca debajo de otra forma.
  items.sort((a, b) => (b.s.b - b.s.a) - (a.s.b - a.s.a));
  const cortas = items.filter((it) => !it.s.larga);
  for (const it of items) {
    const s = it.s, w = it.x1 - it.x0;
    const cls = `item estancia${s.larga ? ' larga' : ''}${s.narrativa ? ' estimada' : ''}${dim(s.sel)}`;
    let lx = Math.max(it.x0, 0) + 5, fin = Math.min(it.x1, anchoLinea) - 5;
    if (s.larga) for (const o of cortas) if (o.x0 <= lx + 4 && o.x1 >= lx - 2 && o.x1 < fin) lx = o.x1 + 4;
    const dentro = fin - lx > 22 ? recortar(s.lugar.nombre, fin - lx) : '';
    partes.push(`<g class="${cls}" data-sel="${esc(s.sel)}"${s.larga ? ' data-fondo="1"' : ''} tabindex="0" role="button" aria-label="${esc(s.titulo)}, ${esc(s.lugar.nombre)}"><title>${esc(s.titulo)} · ${esc(s.lugar.nombre)}${s.referencia ? ` · ${esc(s.referencia)}` : ''}${s.narrativa ? ' · fecha estimada' : ''}</title>
      <rect x="${it.x0}" y="${y + (s.larga ? 7 : 5)}" width="${w}" height="${s.larga ? 16 : 20}" rx="4" class="barra-estancia" style="fill:${color}"/>${s.narrativa ? `<rect x="${it.x0}" y="${y + (s.larga ? 7 : 5)}" width="${w}" height="${s.larga ? 16 : 20}" rx="4" fill="url(#p-rayas-claras)" pointer-events="none"/>` : ''}</g>`);
    if (dentro && (s.larga || w > 40)) rotulo(s.sel, dim(s.sel), `<text x="${lx}" y="${y + 19}" class="texto-barra texto-estancia">${esc(dentro)}</text>`);
  }
}
/** Donde dos carriles de persona vecinos coinciden en el mismo lugar a la vez, una banda los une (T-06). */
function pintarJuntos(partes) {
  const ps = carrilesVista.filter((c) => c.tipo === 'persona' || c.tipo === 'pablo');
  for (let i = 0; i + 1 < ps.length; i++) {
    const A = ps[i], B = ps[i + 1];
    if (B.y !== A.y + A.filas * CARRIL) continue;
    const ea = BE.estancias(A.id === 'pablo' ? 'pablo' : A.persona), eb = BE.estancias(B.id === 'pablo' ? 'pablo' : B.persona);
    for (const a of ea) for (const b of eb) {
      if (a.lugar.id !== b.lugar.id) continue;
      const t0 = Math.max(a.a, b.a), t1 = Math.min(a.b, b.b);
      if (t1 <= t0 || t1 < E.vista[0] || t0 > E.vista[1]) continue;
      const x0 = xDe(t0), x1 = Math.max(xDe(t1), x0 + 3);
      partes.push(`<rect x="${x0}" y="${A.y + 20}" width="${x1 - x0}" height="${B.y - A.y}" class="banda-juntos"><title>Juntos en ${esc(a.lugar.nombre)}</title></rect>`);
    }
  }
}
/** Fechas seculares como nota (C-02, C-04): contorno discontinuo, no mueven el cursor. */
function pintarSecular(partes, c) {
  const items = [];
  for (const o of c.conAlt) for (const alt of o.alternativas) {
    const tr = tramoDibujo(alt.fecha);
    if (!visible(tr)) continue;
    const tipo = BE.D.eventos.includes(o) ? 'evento' : (BE.D.periodos.includes(o) ? 'periodo' : 'persona');
    const nombre = o.titulo || o.nombre;
    const etiqueta = `${alt.fecha.texto || fechaCorta(alt.fecha)} · ${nombre}`;
    const x0 = xDe(tr[0]), x1 = Math.max(xDe(tr[1]), x0 + 8);
    items.push({ o, alt, tipo, x0, x1, lx: Math.max(x0, 0) + 6, etiqueta, corto: `secular: ${alt.fecha.texto || ''}`, lw: anchoTexto(etiqueta) });
  }
  empaquetar(items, [0]);
  for (const it of items) {
    rotulo(`${it.tipo}:${it.o.id}`, dim(`${it.tipo}:${it.o.id}`), textoItem(it, c.y, 'texto-secular'));
    partes.push(`<g class="item secular${dim(`${it.tipo}:${it.o.id}`)}" data-sel="${it.tipo}:${esc(it.o.id)}" tabindex="0" role="button" aria-label="Fecha secular de ${esc(it.o.titulo || it.o.nombre)}: ${esc(it.alt.fecha.texto || '')}"><title>Fecha secular, solo como nota: ${esc(it.alt.fecha.texto || '')}${it.alt.nota ? `\n${esc(it.alt.nota)}` : ''}</title>
      <rect x="${it.x0}" y="${c.y + 6}" width="${it.x1 - it.x0}" height="18" rx="5" class="tramo-secular"/></g>`);
  }
}
/** Reparte elementos en filas: primero la fila libre; si no hay, la menos ocupada. Luego calcula cuánto sitio tiene cada etiqueta. */
function empaquetar(items, filas) {
  items.sort((a, b) => a.x0 - b.x0);
  const finTodo = filas.map(() => -1e9), finForma = filas.map(() => -1e9);
  for (const it of items) {
    if (it.fondo) { it.fila = filas[0]; continue; }   // no ocupa sitio: lo corto se dibuja encima
    let i = finTodo.findIndex((f) => f <= it.x0 - 3);
    if (i < 0) i = finForma.findIndex((f) => f <= it.x0 - 3);
    if (i < 0) i = finForma.indexOf(Math.min(...finForma));
    it.fila = filas[i];
    finForma[i] = it.x1;
    finTodo[i] = Math.max(it.x1, it.lx + it.lw);
  }
  rotular(items);
}
/** Coloca la etiqueta de cada elemento sin pisar a sus vecinos de fila (T-03). Por orden: entera a la derecha, entera a la
    izquierda, recortada si queda sitio para algo legible, el código corto a un lado o dentro de su propio tramo y, si no
    cabe nada, recortada en el hueco mayor. */
function rotular(items) {
  const libre = new Map();
  // Textos ya puestos por fila: un tramo largo rotulado por dentro no para en el siguiente elemento, que puede empezar
  // dentro de él. Ninguna opción puede pisar un texto ya colocado.
  const puestos = new Map();
  const pisa = (fila, a, b) => (puestos.get(fila) || []).some(([c, d]) => a < d + 4 && b > c - 4);
  // Un rótulo tampoco tapa la forma de otro elemento de su fila: va en la capa de arriba y se quedaría con sus clics.
  // Las de fondo no cuentan, porque lo demás ya va encima de ellas.
  const formas = new Map();
  for (const o of items) if (!o.fondo) { if (!formas.has(o.fila)) formas.set(o.fila, []); formas.get(o.fila).push(o); }
  const tapa = (it, a, b) => (formas.get(it.fila) || []).some((o) => o !== it && a < o.x1 && b > o.x0);
  const hueco = (it, texto, lado) => {
    const w = anchoTexto(texto);
    if (lado === 'izq') return [it.x0 - 5 - w, it.x0 - 5];
    if (lado === 'dentro') return [(it.x0 + it.x1) / 2 - w / 2, (it.x0 + it.x1) / 2 + w / 2];
    return [it.lx, it.lx + w];
  };
  items.forEach((it, i) => {
    if (it.grupo) {
      const sig = items.slice(i + 1).find((o) => o.fila === it.fila);
      const x1Largo = Math.max(it.xf, it.x0 + anchoTexto(it.largo) + 12);
      if (x1Largo <= (sig ? sig.x0 - 6 : anchoLinea)) { it.etiqueta = it.largo; it.x1 = x1Largo; }
      else if (!sig && it.x0 + anchoTexto(it.etiqueta) + 12 > anchoLinea) { it.etiqueta = it.minimo; it.x1 = Math.max(it.xf, it.x0 + anchoTexto(it.minimo) + 12); }   // en el borde derecho, sin años: van en el título
      libre.set(it.fila, it.x1); it.texto = it.etiqueta;
      if (!puestos.has(it.fila)) puestos.set(it.fila, []);
      puestos.get(it.fila).push([it.x0, it.x1]);
      return;
    }
    const sig = items.slice(i + 1).find((o) => o.fila === it.fila);
    const desde = libre.get(it.fila) ?? -Infinity;
    const der = (sig ? sig.x0 - 6 : Infinity) - it.lx;
    const finIzq = it.x0 - 5;
    const izq = finIzq - Math.max(desde + 6, 0);
    const ancho = (t) => anchoTexto(t);
    const opciones = it.fondo ? [[it.etiqueta, der, 'der'], [it.etiqueta, der, 'der', true], ...(it.corto ? [[it.corto, der, 'der']] : [])] : [
      [it.etiqueta, der, 'der'], [it.etiqueta, izq, 'izq'],
      ...(Math.max(der, izq) >= 60 ? [[it.etiqueta, Math.max(der, izq), der >= izq ? 'der' : 'izq', true]] : []),
      ...(it.corto ? [[it.corto, der, 'der'], [it.corto, izq, 'izq'], [it.corto, it.x1 - it.x0, 'dentro']] : []),
      [it.etiqueta, Math.max(der, izq), der >= izq ? 'der' : 'izq', true],
    ];
    it.texto = ''; it.lado = 'der';
    for (const [t, px, lado, cortar] of opciones) {
      const texto = cortar ? recortar(t, px) : (ancho(t) <= px ? t : '');
      if (texto && !pisa(it.fila, ...hueco(it, texto, lado)) && !tapa(it, ...hueco(it, texto, lado))) { it.texto = texto; it.lado = lado; break; }
    }
    if (it.texto) {
      if (!puestos.has(it.fila)) puestos.set(it.fila, []);
      puestos.get(it.fila).push(hueco(it, it.texto, it.lado));
    }
    const finTexto = it.texto && it.lado === 'der' ? it.lx + ancho(it.texto) : -Infinity;
    if (!it.fondo) libre.set(it.fila, Math.max(it.x1, finTexto));
  });
}
function textoItem(it, y, clase) {
  if (!it.texto) return '';
  if (it.lado === 'izq') return `<text x="${it.x0 - 5}" y="${y + 19}" text-anchor="end" class="${clase}">${esc(it.texto)}</text>`;
  if (it.lado === 'dentro') return `<text x="${(it.x0 + it.x1) / 2}" y="${y + 19}" text-anchor="middle" class="${clase}">${esc(it.texto)}</text>`;
  return `<text x="${it.lx}" y="${y + 19}" class="${clase}">${esc(it.texto)}</text>`;
}
function recortar(texto, px) {
  if (!(px >= 24)) return px === Infinity ? texto : '';
  const max = Math.floor(px / 6.3);
  return texto.length <= max ? texto : `${texto.slice(0, Math.max(1, max - 1))}…`;
}

// ---------------------------------------------------------------------------
// Meses: nuestros meses y los hebreos, alineados (T-19)
// ---------------------------------------------------------------------------
/** Nuestros meses: el calendario gregoriano aplicado hacia atrás, solo para orientar. Sin días bisiestos: el cuarto de
    día que sobra cada año se lo queda el 31 de diciembre. Días de medianoche a medianoche, como hoy. */
const DIAS_ANTES = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const inicioNuestro = (y, m) => (m >= 12 ? y + 1 : y + DIAS_ANTES[m] * BE.DIA);
/** Como fmtCursor de base.js, con los meses de verdad: «abr. 33 e.c.» o, sin `fino`, «33 e.c.». */
const fmtMes = (t, fino) => (fino ? `${MESES[mesNuestro(t).m]} ${fmtAnio(Math.floor(t))}` : fmtAnio(Math.floor(t)));
function mesNuestro(t) {
  const y = Math.floor(t), d = (t - y) / BE.DIA;
  let m = 0;
  while (m < 11 && d >= DIAS_ANTES[m + 1]) m++;
  return { anio: y, m, dia: Math.min(DIAS_ANTES[m + 1] - DIAS_ANTES[m], Math.floor(d - DIAS_ANTES[m]) + 1) };
}
const MODOS_MESES = [['ambos', 'Ambos'], ['nuestros', 'Nuestros'], ['hebreos', 'Hebreos']];
const modoMeses = () => L.meses || 'ambos';   // los dos calendarios, también en el móvil: caben, y es lo que pedimos
const AYUDA_NUESTROS = 'Nuestros meses: el calendario gregoriano es de 1582. Aquí se aplica hacia atrás solo para orientar.';
const AYUDA_HEBREOS = 'Meses hebreos: lunares y aproximados, de luna nueva a luna nueva. Los nombres cambian con la época: en cursiva, un nombre de después del exilio que la Biblia de antes no usa. El día hebreo empezaba al ponerse el sol: la franja sombreada ya es el día siguiente.';
const ANACRONICO = 'Va en cursiva porque la Biblia de esa época no le da este nombre.';
const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const AYUDA_FIESTAS = 'Fiestas del calendario hebreo (tabla B15 de la Biblia de estudio), en su día aproximado.';
/** Enlace a la página del calendario. Lleva la vista actual para que su «Volver al mapa» vuelva aquí. */
function enlaceCalendario(clase, texto, titulo) {
  return `<a class="${clase}" href="calendario.html" data-calendario="1" title="${esc(titulo)}" aria-label="${esc(titulo)}">${esc(texto)}</a>`;
}
/** Fiestas que caen en [a, b]: { nombre, corto, a, b, mes } en el año hebreo de cada una. */
function fiestasEn(a, b) {
  const out = [];
  const cal = BE.calendario();
  for (let y = Math.floor(a - cal.inicio) - 1; y <= Math.ceil(b); y++) {
    for (const M of BE.anioHebreo(y).meses) {
      for (const f of M.mes.fiestas || []) {
        const fa = M.a + (f.desde - 1) * BE.DIA, fb = M.a + (f.hasta ?? f.desde) * BE.DIA;
        if (f.instituida != null && fa < f.instituida) continue;   // antes de instituirse no hay fiesta que pintar
        if (fb > a && fa < b) out.push({ ...f, a: fa, b: fb, mes: M.mes, anio: y, corto: nombreCortoFiesta(f.nombre) });
      }
    }
  }
  return out;
}
/** «Fiesta de las Semanas (Pentecostés)» → «Pentecostés»; «Fiesta de los Panes Sin Levadura» → «Panes Sin Levadura». */
function nombreCortoFiesta(n) {
  const par = n.match(/\(([^)]+)\)/);
  if (par) return par[1];
  const c = n.replace(/^(fiesta|ofrenda|toque|d[ií]a) de (la |las |los |el )?/i, '');
  return c.charAt(0).toUpperCase() + c.slice(1);
}
function medirMeses() {
  const modo = modoMeses();
  const tipos = modo === 'ambos' ? ['nuestros', 'hebreos'] : [modo];
  if (span() < 0.35 && fiestasEn(E.vista[0], E.vista[1]).length) tipos.push('fiestas');
  this.tiposFila = tipos;
  this.filas = tipos.length;
  this.nombres = tipos.map((k) => ({ nuestros: 'Nuestros meses', hebreos: 'Meses hebreos', fiestas: 'Fiestas' })[k]);
  this.cortos = tipos.map((k) => ({ nuestros: 'Nuestros', hebreos: 'Hebreos', fiestas: 'Fiestas' })[k]);
  this.ayudas = tipos.map((k) => ({ nuestros: AYUDA_NUESTROS, hebreos: AYUDA_HEBREOS, fiestas: AYUDA_FIESTAS })[k]);
  this.clases = tipos.map((k) => `carril-mes carril-mes--${k}`);
}
/** Sombra de las horas entre la puesta de sol y nuestra medianoche, a escala de días: el día hebreo iba de una puesta
    de sol a la siguiente (Perspicacia «Día»), así que esas horas ya son el día hebreo siguiente y todavía nuestra fecha
    anterior. La puesta se pone a las 18:00: las horas de luz iban más o menos de seis a seis (el mismo artículo). */
function noches() {
  if (!(span() < 0.35) || !BE.calendario().meses.length || modoMeses() === 'nuestros') return '';
  const pxDia = (anchoLinea / span()) * BE.DIA;
  if (pxDia < 4) return '';
  const out = [];
  for (let y = Math.floor(E.vista[0]); y <= Math.floor(E.vista[1]); y++) {
    const k0 = Math.max(0, Math.floor((E.vista[0] - y) / BE.DIA) - 1), k1 = Math.min(365, Math.ceil((E.vista[1] - y) / BE.DIA) + 1);
    for (let k = k0; k <= k1; k++) {
      const a = y + (k + 0.75) * BE.DIA, b = Math.min(y + (k + 1) * BE.DIA, y + 1);
      if (b < E.vista[0] || a > E.vista[1] || b <= a) continue;
      out.push(`<rect x="${xDe(a)}" y="${EJE}" width="${Math.max(1, xDe(b) - xDe(a))}" height="${altoPista - EJE}"/>`);
    }
  }
  return `<g class="noche-hebrea" aria-hidden="true">${out.join('')}</g>`;
}
/** Los meses (T-19): una fila por calendario, alineadas, y a escala de días una fila de fiestas. Los meses hebreos llevan
    el nombre de su época (Abib antes del exilio, Nisán después); si la Biblia de esa época no les da nombre, el de
    siempre va en cursiva. Nuestros meses van en contorno y los hebreos rellenos y rayados: se distinguen sin color. */
function pintarMeses(partes, c) {
  // Fijado a escala de siglos o milenios serían miles de meses de menos de un píxel: se avisa en su lugar.
  if (anchoLinea / span() / 12 < 3) { partes.push(`<text x="8" y="${c.y + 19}" class="texto-fuera">Acerca la línea para ver los meses</text>`); return; }
  const tipos = c.tiposFila || ['hebreos'];
  const dias = span() < 0.35, pxDia = (anchoLinea / span()) * BE.DIA;
  tipos.forEach((tipo, fila) => {
    const y = c.y + fila * CARRIL;
    if (tipo === 'fiestas') { pintarFiestas(partes, y); return; }
    const cajas = [];
    if (tipo === 'nuestros') {
      for (let anio = Math.floor(E.vista[0]); anio <= Math.floor(E.vista[1]); anio++) {
        for (let m = 0; m < 12; m++) {
          const a = inicioNuestro(anio, m), b = inicioNuestro(anio, m + 1);
          if (b < E.vista[0] || a > E.vista[1]) continue;
          cajas.push({ a, b, k: m, nombre: MESES_LARGOS[m], anio, titulo: `${MESES_LARGOS[m]} de ${fmtAnio(anio)} (nuestro calendario, aplicado hacia atrás)`,
            aviso: `${mayus(MESES_LARGOS[m])} de ${fmtAnio(anio)}, en nuestro calendario, aplicado hacia atrás solo para orientar.` });
        }
      }
    } else {
      const cal = BE.calendario();
      for (let anio = Math.floor(E.vista[0] - cal.inicio) - 1; anio <= Math.ceil(E.vista[1]); anio++) {
        BE.anioHebreo(anio).meses.forEach((M, k) => {
          if (M.b < E.vista[0] || M.a > E.vista[1]) return;
          const nm = BE.nombreMes(M.mes, anio);
          const eq = typeof M.mes.equivale === 'string' ? `, más o menos ${M.mes.equivale}` : '';
          const extra = M.mes.id === 'veadar' ? '\nEl mes que se añadía algunos años.' : '';
          cajas.push({ a: M.a, b: M.b, k, nombre: nm.nombre, anacronico: nm.anacronico, anadido: M.mes.id === 'veadar', anio,
            titulo: `${nm.nombre}: mes hebreo${eq}${nm.anacronico ? ' (nombre de después del exilio)' : ''}${extra}${nm.nota ? `\n${nm.nota}` : ''}`,
            aviso: `${nm.nombre}: mes hebreo${eq}.${extra.replace('\n', ' ')}${nm.anacronico ? ` ${ANACRONICO}${nm.nota ? ` ${nm.nota}` : ''}` : ''}` });
        });
      }
    }
    for (const cj of cajas) {
      const x0 = xDe(cj.a), x1 = xDe(cj.b), w = x1 - x0;
      const libre = Math.min(x1, anchoLinea) - Math.max(x0, 0) - 12;
      const conAnio = `${cj.nombre} de ${fmtAnio(tipo === 'nuestros' ? cj.anio : Math.floor(Math.max(cj.a, E.vista[0])))}`;
      const texto = anchoTexto(conAnio) + 10 <= libre && dias ? conAnio : recortar(cj.nombre, libre);
      const cls = `mes mes--${tipo} mes-${cj.k % 2}${cj.anacronico ? ' anacronico' : ''}${cj.anadido ? ' anadido' : ''}`;
      const tx = Math.max(x0, 0) + 7;
      let numeros = '';
      if (dias) {
        // Días del mes: una marca en cada cambio de día y el número si cabe, sin pisar el nombre.
        const finNombre = texto ? tx + anchoTexto(texto) + 4 : -Infinity;
        const n = Math.round((cj.b - cj.a) / BE.DIA);
        for (let d = 1; d <= n; d++) {
          const ta = cj.a + (d - 1) * BE.DIA, xa = xDe(ta), xm = xDe(ta + BE.DIA / 2);
          if (xa > anchoLinea + 2 || xDe(ta + BE.DIA) < -2) continue;
          if (d > 1 && pxDia >= 5) numeros += `<line x1="${xa}" x2="${xa}" y1="${y + 18}" y2="${y + 24}" class="mes-dia"/>`;
          if (pxDia >= 15 && xm - 6 > finNombre && (pxDia >= 22 || d % 2 === 1)) numeros += `<text x="${xm}" y="${y + 19}" text-anchor="middle" class="mes-num">${d}</text>`;
        }
      }
      // Sin sitio para el nombre (meses en el móvil), tres letras o la inicial, centradas; el nombre entero va en el título.
      let corto = '';
      if (!texto && !dias) {
        const vis = libre + 12, tres = cj.nombre.slice(0, 3);
        corto = vis - 6 >= tres.length * 6.3 ? tres : vis >= 11 ? cj.nombre.charAt(0).toUpperCase() : '';
      }
      const rotulo = texto ? `<text x="${tx}" y="${y + 19}" class="mes-texto">${esc(texto)}</text>`
        : corto ? `<text x="${((Math.max(x0, 0) + Math.min(x1, anchoLinea)) / 2).toFixed(1)}" y="${y + 19}" text-anchor="middle" class="mes-texto mes-texto--corto">${esc(corto)}</text>` : '';
      // Al tocarla, la caja cuyo nombre no se lee entero (o va en cursiva) lo dice en un aviso: en el móvil no hay título.
      const avisar = !texto || texto !== cj.nombre && texto !== conAnio || cj.anacronico;
      partes.push(`<g class="${cls}"${avisar ? ` data-aviso="${esc(cj.aviso)}"` : ''}><title>${esc(cj.titulo)}</title><rect x="${x0}" y="${y + 6}" width="${Math.max(1, w - 1)}" height="18" rx="4" class="mes-caja"/>${cj.anadido || tipo === 'hebreos' ? `<rect x="${x0}" y="${y + 6}" width="${Math.max(1, w - 1)}" height="18" rx="4" fill="url(#p-hebreo)" pointer-events="none"/>` : ''}${numeros}${rotulo}</g>`);
    }
  });
}
/** Fiestas (B15) a escala de días: un tramo por fiesta, del día en que empieza al día en que acaba. Una fiesta dentro
    de otra (la ofrenda de las primicias, el 16 de nisán, dentro de los Panes Sin Levadura) va encima. El rótulo va
    dentro si cabe, si no a un lado, y si no queda sitio se lee al pasar por encima. */
function pintarFiestas(partes, y) {
  const fs = fiestasEn(E.vista[0], E.vista[1]).map((f) => ({ ...f, x0: xDe(f.a), x1: xDe(f.b) }))
    .sort((p, q) => (q.x1 - q.x0) - (p.x1 - p.x0) || p.x0 - q.x0);
  const puestos = [];
  for (const f of fs) {
    const w = f.x1 - f.x0;
    const dentro = fs.filter((o) => o !== f && o.x0 >= f.x0 && o.x1 <= f.x1);
    const titulo = `${f.nombre} · ${f.desde === (f.hasta ?? f.desde) ? `${f.desde}` : `del ${f.desde} al ${f.hasta}`} de ${BE.nombreMes(f.mes, f.anio).nombre.toLowerCase()} (fecha aproximada)`;
    partes.push(`<g class="fiesta"><title>${esc(titulo)}</title><rect x="${f.x0}" y="${y + 6}" width="${Math.max(3, w - 1)}" height="18" rx="5" class="fiesta-caja"/></g>`);
    f.titulo = titulo; f.dentro = dentro;
  }
  // Rótulos: primero las fiestas largas, en el hueco libre de su tramo (sin las que lleva dentro); después las cortas.
  const rot = [];
  const libre = (a, ancho) => !puestos.some(([c, d]) => a < d + 4 && a + ancho > c - 4);
  for (const f of fs) {
    const huecos = [];
    let x = Math.max(f.x0, 0) + 6;
    for (const o of [...f.dentro].sort((p, q) => p.x0 - q.x0)) { if (o.x0 > x) huecos.push([x, o.x0 - 4]); x = Math.max(x, o.x1 + 4); }
    huecos.push([x, Math.min(f.x1, anchoLinea) - 4]);
    // Fuera de su tramo no puede pisar otra fiesta, salvo la que la contiene.
    const fuera = (a, ancho) => a >= 0 && a + ancho <= anchoLinea && libre(a, ancho)
      && !fs.some((o) => o !== f && !f.dentro.includes(o) && !(o.x0 <= f.x0 && o.x1 >= f.x1) && a < o.x1 && a + ancho > o.x0);
    const opciones = [];
    for (const t of [f.nombre, f.corto]) for (const [a, b] of huecos) opciones.push([t, a, b - a >= anchoTexto(t), '']);
    for (const t of [f.nombre, f.corto]) for (const a of [f.x1 + 4, f.x0 - 4 - anchoTexto(t)]) opciones.push([t, a, true, ' fiesta-texto--fuera', true]);
    const op = opciones.find(([t, a, cabe, , esFuera]) => cabe && (esFuera ? fuera(a, anchoTexto(t)) : libre(a, anchoTexto(t))));
    if (!op) continue;
    const [t, a, , clase] = op;
    puestos.push([a, a + anchoTexto(t)]);
    rot.push(`<text x="${a}" y="${y + 19}" class="fiesta-texto${clase}">${esc(t)}</text>`);
  }
  partes.push(`<g class="fiesta-rotulos" aria-hidden="true">${rot.join('')}</g>`);
}

// ---------------------------------------------------------------------------
// Eje: años sin año cero (C-12), meses y días hebreos
// ---------------------------------------------------------------------------
const PASOS_ANIO = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
/** Posiciones t de los múltiplos de `paso` en años de calendario: los a.e.c. se cuentan hacia atrás (600 a.e.c. = −599),
    así las marcas caen en años redondos a los dos lados del cero y no aparece un «año 0». */
function multiplos(paso, a, b) {
  const out = [];
  if (b >= 1) for (let L = Math.max(1, Math.ceil(Math.max(a, 1) / paso)) * paso; L <= b; L += paso) out.push(L);
  if (a <= 0) {
    const Lmin = 1 - Math.min(b, 0), Lmax = 1 - a;
    for (let L = Math.ceil(Lmin / paso) * paso; L <= Lmax; L += paso) out.push(1 - L);
  }
  return out.sort((x, y) => x - y);
}
function marcasEje(pxAnio) {
  const out = [];
  const [a, b] = E.vista;
  // Un rótulo que pisaría al anterior («ene. 1513 a.e.c.» antes de «feb.») se queda sin texto; la marca sí se dibuja.
  let finRotulo = -Infinity;
  const mayorTick = (x, texto) => {
    const cabe = x + 5 >= finRotulo + 6;
    if (cabe) finRotulo = x + 5 + texto.length * 5.6;
    out.push(`<line x1="${x}" x2="${x}" y1="0" y2="${EJE}" class="tick-mayor"/><line x1="${x}" x2="${x}" y1="${EJE}" y2="${altoPista}" class="rejilla"/>${cabe ? `<text x="${x + 5}" y="16" class="tick-texto">${esc(texto)}</text>` : ''}`);
  };
  const menorTick = (x) => out.push(`<line x1="${x}" x2="${x}" y1="${EJE - 6}" y2="${EJE}" class="tick-menor"/>`);
  if (span() < 0.35 && BE.calendario().meses.length) {
    // Días: marca mayor el 1, 8, 15 y 22 de cada mes; menor, cada día. Los días del calendario que va primero: los
    // hebreos empiezan al ponerse el sol, los nuestros a medianoche.
    const marcar = (t, d, nombre) => {
      if (t < a - BE.DIA || t > b + BE.DIA) return;
      if ((d - 1) % 7 === 0 && d < 29) mayorTick(xDe(t), `${d} ${nombre}`);
      else if (pxAnio * BE.DIA >= 5) menorTick(xDe(t));
    };
    if (modoMeses() === 'nuestros') {
      for (let anio = Math.floor(a); anio <= Math.floor(b); anio++) {
        for (let m = 0; m < 12; m++) for (let d = 1; d <= DIAS_ANTES[m + 1] - DIAS_ANTES[m]; d++) marcar(inicioNuestro(anio, m) + (d - 1) * BE.DIA, d, MESES[m]);
      }
    } else {
      const cal = BE.calendario();
      for (let anio = Math.floor(a - cal.inicio) - 1; anio <= Math.ceil(b); anio++) {
        for (const M of BE.anioHebreo(anio).meses) {
          const nombre = BE.nombreMes(M.mes, anio).nombre.toLowerCase();
          for (let d = 1; M.a + (d - 1) * BE.DIA < M.b - BE.DIA / 2; d++) marcar(M.a + (d - 1) * BE.DIA, d, nombre);
        }
      }
    }
  } else if (pxAnio * 1 < 70) {
    // Años: la marca mayor es el paso más fino que deja 70 px entre etiquetas.
    const mayor = [...PASOS_ANIO].reverse().find((p) => p * pxAnio >= 70) || 1000;
    const menor = [mayor / 10, mayor / 5, mayor / 2].find((p) => p >= 1 && Number.isInteger(p) && p * pxAnio >= 6);
    const mayores = multiplos(mayor, a - mayor, b + mayor);
    if (menor) {
      const set = new Set(mayores);
      for (const t of multiplos(menor, a - menor, b + menor)) if (!set.has(t)) menorTick(xDe(t));
    }
    for (const t of mayores) mayorTick(xDe(t), fmtAnio(t));
    // El paso de a.e.c. a e.c. se marca con «1 e.c.» si hay sitio.
    if (mayor >= 10 && a < 1 && b > 1 && mayores.every((t) => Math.abs(xDe(t) - xDe(1)) > 64)) { finRotulo = -Infinity; mayorTick(xDe(1), '1 e.c.'); }
  } else {
    // Años con meses (v0): de 5 en 5 años hasta mes a mes.
    const pasos = [5, 2, 1, 0.5, 0.25, 1 / 12];
    let mayor = pasos.find((p, i) => (p * pxAnio < 70 ? false : (i === pasos.length - 1 || pasos[i + 1] * pxAnio < 70))) || 1 / 12;
    if (mayor * pxAnio < 70) mayor = pasos.find((p) => p * pxAnio >= 70) || 5;
    const menor = mayor >= 5 ? 1 : mayor >= 1 ? (pxAnio > 140 ? 1 / 12 : 0.25) : 1 / 12;
    const inicio = Math.floor(a / menor) * menor;
    for (let t = inicio; t <= b + menor; t += menor) {
      const tt = Math.round(t * 12) / 12;
      const yy = Math.floor(tt + 1e-9);
      const x = xDe(inicioNuestro(yy, Math.round((tt - yy) * 12)));   // el mes empieza donde empieza en la fila «Nuestros meses»
      const esMayor = Math.abs(tt / mayor - Math.round(tt / mayor)) < 1e-6;
      if (esMayor) {
        const y = Math.floor(tt + 1e-9), mes = Math.round((tt - y) * 12);
        mayorTick(x, mayor >= 1 ? fmtAnio(y) : (mes === 0 ? `${MESES[0]} ${fmtAnio(y)}` : MESES[mes]));
      } else menorTick(x);
    }
  }
  out.push(`<line x1="0" x2="${anchoLinea}" y1="${EJE}" y2="${EJE}" class="linea-eje"/>`);
  return out.join('');
}

// ---------------------------------------------------------------------------
// Densidad de hechos (T-05) y minimapa (T-04)
// ---------------------------------------------------------------------------
let cacheMomentos = null;
/** Momentos de todos los hechos con fecha: sucesos, paradas, cartas, inicios de periodo y relaciones fechadas. */
function momentosHechos() {
  if (cacheMomentos && cacheMomentos.D === BE.D) return cacheMomentos.ts;
  const ts = [];
  for (const e of BE.D.eventos || []) { const m = BE.momentoEvento(e); if (m != null) ts.push(m); }
  for (const s of BE.P) ts.push((s.a + s.b) / 2);
  for (const c of BE.D.cartas) { const m = BE.momentoCarta(c); if (m != null) ts.push(m); }
  for (const p of BE.D.periodos || []) { if (p.tipo === 'era' || p.tipo === 'potencia') continue; const tr = tramo(p.fecha); if (tr) ts.push(tr[0]); }
  for (const p of Object.values(BE.PERS)) for (const r of p.relaciones || []) { const tr = r.fecha && tramo(r.fecha); if (tr) ts.push(tr[0]); }
  ts.sort((x, y) => x - y);
  cacheMomentos = { D: BE.D, ts };
  return ts;
}
function contarEntre(ts, a, b) {
  const idx = (v) => { let lo = 0, hi = ts.length; while (lo < hi) { const m = (lo + hi) >> 1; if (ts[m] < v) lo = m + 1; else hi = m; } return lo; };
  return idx(b) - idx(a);
}
function densidad() {
  const ts = momentosHechos();
  if (!ts.length) return '';
  const n = Math.max(20, Math.floor(anchoLinea / 6));
  const w = span() / n;
  const cuentas = [];
  for (let i = 0; i < n; i++) cuentas.push(contarEntre(ts, E.vista[0] + i * w, E.vista[0] + (i + 1) * w));
  const max = Math.max(...cuentas);
  if (!max) return '';
  const bw = anchoLinea / n;
  const d = cuentas.map((c, i) => (c ? `M${(i * bw + 0.5).toFixed(1)} ${EJE}v-${(1.5 + 6 * Math.sqrt(c / max)).toFixed(1)}h${(bw - 1).toFixed(1)}v${(1.5 + 6 * Math.sqrt(c / max)).toFixed(1)}z` : '')).join('');
  return `<path d="${d}" class="densidad"><title>Densidad: cuántos hechos con fecha tenemos en cada tramo (${contarEntre(ts, E.vista[0], E.vista[1])} a la vista)</title></path>`;
}
function fondoMinimapa() {
  const tramos = periodosDe('era').length ? periodosDe('era') : periodosDe('potencia');
  const total = spanMax();
  if (!tramos.length) return '';
  const pct = (t) => `${(((t - BE.T_MIN) / total) * 100).toFixed(2)}%`;
  const stops = [];
  [...tramos].sort((a, b) => BE.tramoPeriodo(a)[0] - BE.tramoPeriodo(b)[0]).forEach((p, i) => {
    const tr = BE.tramoPeriodo(p);
    const col = p.tipo === 'potencia' ? colorPotencia(p) : (i % 2 ? 'var(--node-periodo)' : '#9a8ab4');
    stops.push(`${col} ${pct(tr[0])} ${pct(tr[1])}`);
  });
  return `linear-gradient(90deg, var(--paper-2) 0 ${pct(Math.min(...tramos.map((p) => BE.tramoPeriodo(p)[0])))}, ${stops.join(', ')}, var(--paper-2) ${pct(Math.max(...tramos.map((p) => BE.tramoPeriodo(p)[1])))} 100%)`;
}
function pintarMinimapa() {
  const mm = $('#minimapa');
  if (!mm) return;
  if (!mm.dataset.fondo) { mm.dataset.fondo = '1'; const f = fondoMinimapa(); if (f) mm.style.background = f; }
  const total = spanMax();
  const win = mm.querySelector('.be-minimap__win');
  const l = ((E.vista[0] - BE.T_MIN) / total) * 100, w = (span() / total) * 100;
  win.style.left = `${clamp(l, 0, 100)}%`;
  win.style.width = `max(4px, ${Math.min(w, 100 - clamp(l, 0, 100))}%)`;
}
function cursorMinimapa() {
  const c = $('#minimapa .minimapa-cursor');
  if (c) c.style.left = `${((E.t - BE.T_MIN) / spanMax()) * 100}%`;
}

// ---------------------------------------------------------------------------
// Regla (T-15), bucle (T-12) y marcadores (T-14)
// ---------------------------------------------------------------------------
/** Duración legible de d años, en la unidad que tenga sentido. La resta en años astronómicos ya no cuenta el año cero. */
function duracion(d) {
  d = Math.abs(d);
  const dias = Math.round(d / BE.DIA);
  if (dias < 1) return 'menos de un día';
  if (dias < 60) return `${dias} ${dias === 1 ? 'día' : 'días'}`;
  const meses = Math.round(d * 12);
  if (meses < 24) return `${meses} meses`;
  const anios = Math.round(d);
  return `${Math.abs(d - anios) < 0.05 ? '' : 'unos '}${anios} años`;
}
/** Redondea una fecha al año, al mes o al día según la escala. */
function ajustar(t) {
  const s = span();
  if (s > 20) return Math.round(t);
  if (s > 1.5) return Math.round(t * 12) / 12;
  return Math.round(t / BE.DIA) * BE.DIA;
}
const textoFecha = (t) => { const s = span(); return s > 20 ? fmtAnio(Math.round(t)) : fmtMes(t + 1e-6, true); };
function pintarRegla(partes) {
  if (!L.regla) return;
  const [a, b] = [Math.min(...L.regla), Math.max(...L.regla)];
  if (b < E.vista[0] || a > E.vista[1]) return;
  const x0 = xDe(a), x1 = xDe(b);
  const texto = `${textoFecha(a)} → ${textoFecha(b)}: ${duracion(b - a)}`;
  const w = anchoTexto(texto) + 30;
  const lx = clamp((x0 + x1) / 2 - w / 2, 2, anchoLinea - w - 2);
  partes.push(`<g class="regla"><rect x="${x0}" y="${EJE}" width="${Math.max(1, x1 - x0)}" height="${altoPista - EJE}" class="regla-banda"/>
    <line x1="${x0}" x2="${x0}" y1="${EJE}" y2="${altoPista}" class="regla-borde"/><line x1="${x1}" x2="${x1}" y1="${EJE}" y2="${altoPista}" class="regla-borde"/>
    <rect x="${lx}" y="${EJE + 3}" width="${w}" height="20" rx="10" class="regla-etiqueta"/><text x="${lx + 10}" y="${EJE + 17}" class="regla-texto">${esc(texto)}</text>
    <g class="regla-quitar" data-linea="quitar-regla" role="button" tabindex="0" aria-label="Quitar la regla"><title>Quitar la regla</title><circle cx="${lx + w - 11}" cy="${EJE + 13}" r="7"/><path d="M${lx + w - 14} ${EJE + 10}l6 6m0-6-6 6"/></g></g>`);
}
function pintarBucle(partes) {
  if (!L.bucle) return;
  const [a, b] = L.bucle;
  for (const [t, lado] of [[a, 1], [b, -1]]) {
    if (t < E.vista[0] || t > E.vista[1]) continue;
    const x = xDe(t);
    partes.push(`<path d="M${x + lado * 6} ${EJE - 8}h${-lado * 6}v${altoPista - EJE + 8}" class="bucle-marca"><title>Bucle de ${esc(textoFecha(a))} a ${esc(textoFecha(b))}</title></path>`);
  }
}
const CLAVE_MARCAS = 'biblical-earth:marcadores';
function marcadores() { try { return JSON.parse(localStorage.getItem(CLAVE_MARCAS) || '[]'); } catch { return []; } }
function guardarMarcadores(ms) { try { localStorage.setItem(CLAVE_MARCAS, JSON.stringify(ms)); } catch { BE.avisar('Este navegador no deja guardar marcadores.'); } }
function nuevoMarcador() {
  const ms = marcadores();
  const nombre = `${fmtMes(E.t, span() < 4)}${E.sel ? ` · ${BE.nombreSel(E.sel)}` : ''}`;
  ms.push({ t: +E.t.toFixed(4), sel: E.sel ? BE.selTexto(E.sel) : null, nombre });
  guardarMarcadores(ms);
  BE.avisar(`Marcador guardado: ${nombre}`);
  sucio.linea = true; programar();
}
function irAMarcador(i) {
  const m = marcadores()[i];
  if (!m) return;
  const sel = m.sel ? BE.parseSel(m.sel) : null;
  if (sel && BE.selTexto(sel) !== BE.selTexto(E.sel)) BE.seleccionar(sel, { mover: false });
  setT(m.t); BE.asegurarVisible(m.t, true);
}
function pintarMarcadores(partes) {
  marcadores().forEach((m, i) => {
    if (m.t < E.vista[0] || m.t > E.vista[1]) return;
    const x = xDe(m.t);
    partes.push(`<path d="M${x - 5} 0h10l-5 7z" class="marcador" data-marcador="${i}" role="button" tabindex="0" aria-label="Marcador: ${esc(m.nombre)}"><title>Marcador: ${esc(m.nombre)}</title></path>`);
  });
}

// ---------------------------------------------------------------------------
// Cursor y frase de contexto
// ---------------------------------------------------------------------------
const estrecha = () => matchMedia('(max-width: 760px)').matches;
const CURSIVA_CHIP = 'En cursiva: nombre de después del exilio; la Biblia de esa época no llama así a ese mes.';
/** La fecha del cursor en los dos calendarios, según la escala y el selector «Meses». `primera` es la que manda (con su
    año); `segunda`, la otra, sin año: en hebreo la equivalencia de la tabla B15 («marzo-abril»), en nuestro calendario
    el día o el mes hebreo. A escala de años o más, solo el año. `anacronico`: el nombre hebreo no es de esa época. */
function fechaCursor(t, corto = false) {
  const s = span();
  if (!(s < 4) || !BE.calendario().meses.length) return { primera: fmtMes(t, s < 4), segunda: '' };
  const dias = s < 0.35, y = Math.floor(t);
  const h = BE.diaHebreo(t), n = mesNuestro(t);
  const mesH = h.nombre.toLowerCase();   // sin abreviar: «abi.» o «kis.» no los reconoce nadie, y el más largo tiene seis letras
  const mesN = corto ? MESES[n.m] : MESES_LARGOS[n.m];
  const de = corto ? ' ' : ' de ';
  const hebreo = dias ? `${h.dia}${de}${mesH}` : mesH;
  const hebreoEntero = dias ? `${h.dia} de ${h.nombre.toLowerCase()}` : h.nombre.toLowerCase();
  const nuestro = dias ? `${n.dia}${de}${mesN}` : mesN;
  if (modoMeses() === 'nuestros') return { primera: `${nuestro}${de}${fmtAnio(y)}`, segunda: hebreoEntero, anacronico: false, anacronicoSegunda: h.anacronico };
  const eq = typeof h.mes.equivale === 'string' ? h.mes.equivale : nuestro;
  return { primera: `${hebreo}${de}${fmtAnio(y)}`, segunda: eq, anacronico: h.anacronico };
}
function textoCursor(t, fino, corto = false) {
  const f = fechaCursor(t, corto);
  return f.primera;
}
function pintarCursor() {
  const g = $('#linea-cursor');
  if (!g) return;
  const x = xDe(E.t);
  // La bandera dice de quién es el lugar: la persona elegida o, si no, Pablo. Sale de BE.donde, como «Ahora mismo».
  const quien = E.sel?.tipo === 'persona' && BE.PERS[E.sel.id] ? E.sel.id : 'pablo';
  const w = BE.donde(quien, E.t);
  const alto = altoPista;
  const fino = span() < 4;
  // «Juan, el apóstol en Patmos» se lee mal: la aclaración va entre paréntesis.
  const nombre = (BE.PERS[quien]?.nombre || 'Pablo').replace(/^([^,]+), (.+)$/, '$1 ($2)');
  const lugar = w ? `${nombre} ${w.parada ? 'en' : 'hacia'} ${(w.parada ? w.en : w.sig).lugar.nombre}` : '';
  const aprox = w?.estimada || !fino || span() < 4;   // una fecha de mes o de día sale de un calendario aproximado
  const bandera = `${aprox ? 'c. ' : ''}${textoCursor(E.t, fino, estrecha())}${lugar ? ` · ${lugar}` : ''}`;
  const anchoB = anchoTexto(bandera, 10.5) + 14;
  const bx = clamp(x - anchoB / 2, 0, anchoLinea - anchoB);
  let banda = '';
  if (w?.estimada && w.banda) {
    const b0 = xDe(w.banda[0]), b1 = xDe(w.banda[1]);
    banda = `<rect x="${b0}" y="${EJE}" width="${Math.max(0, b1 - b0)}" height="${alto - EJE}" fill="url(#p-rayas)" class="banda-incierta"><title>Tiempo narrativo: sabemos el orden, no la fecha exacta</title></rect>`;
  }
  g.innerHTML = `${banda}<line x1="${x}" x2="${x}" y1="0" y2="${alto}" class="cursor-linea"/>
    <rect x="${bx}" y="3" width="${anchoB}" height="20" rx="5" class="cursor-bandera"/><text x="${bx + anchoB / 2}" y="17" text-anchor="middle" class="cursor-texto">${esc(bandera)}</text>`;
  const pista = $('#pista');
  pista.setAttribute('aria-valuenow', E.t.toFixed(2));
  pista.setAttribute('aria-valuetext', bandera);
  const pw = BE.dondeEsta(E.t);
  const fc = fechaCursor(E.t, estrecha());
  const c = pw?.estimada || !fino || span() < 4 ? 'c. ' : '';
  const valor = `${c}${fc.anacronico ? `<i>${esc(fc.primera)}</i>` : esc(fc.primera)}`;
  if ($('#fecha-valor').innerHTML !== valor) $('#fecha-valor').innerHTML = valor;
  const otra = $('#fecha-otra');
  if (otra) {
    const txt = fc.segunda || '';
    if (otra.textContent !== txt) otra.textContent = txt;
    otra.hidden = !txt;
    otra.classList.toggle('anacronico', !!fc.anacronicoSegunda);
    otra.title = !txt ? '' : modoMeses() === 'nuestros' ? `Fecha hebrea aproximada.${fc.anacronicoSegunda ? ` ${CURSIVA_CHIP}` : ''}` : 'Nuestros meses, aproximados: el calendario gregoriano es de 1582 y aquí solo orienta';
  }
  // La cronología va en el texto emergente de la fecha, no en una pista visible: es jerga para una familia.
  const ayuda = `${pw?.estimada ? 'Fecha estimada: sabemos el orden del relato, no el día. ' : ''}${fc.anacronico ? `${CURSIVA_CHIP} ` : ''}Fechas según la cronología de la Traducción del Nuevo Mundo y de jw.org. Pulsa para escribir otra fecha.`;
  if ($('#fecha-valor').title !== ayuda) $('#fecha-valor').title = ayuda;
  $('#linea-estado').textContent = BE.fraseAhora ? BE.fraseAhora(E.t) : '';
  // Edad en la fecha, solo con base (T-18).
  document.querySelectorAll('#carriles [data-edad]').forEach((el) => {
    const e = BE.edad(el.dataset.edad, E.t);
    const txt = e ? ` · ${e.texto}` : '';
    if (el.textContent !== txt) { el.textContent = txt; el.title = e ? `Según su nacimiento: ${e.nacimiento}` : ''; }
  });
  cursorMinimapa();
}

// ---------------------------------------------------------------------------
// Escribir la fecha (T-20)
// ---------------------------------------------------------------------------
/** «607 a», «607 a.e.c.», «51», «c. 50», «51 e.c.», «14 nisán 33» → año decimal, o null si no se entiende. */
function leerFecha(texto) {
  let s = norm(texto).trim().replace(/^(c\.|ca\.|hacia|alrededor de|circa)\s*/, '');
  const hebreo = s.match(/^(\d{1,2})\s+(?:de\s+)?([a-z]+)\s+(?:de\s+)?(-?\d{1,4})\s*(.*)$/);
  if (hebreo) {
    const mes = BE.calendario().meses.find((m) => norm(m.nombre) === hebreo[2] || (m.otros_nombres || []).some((o) => norm(o) === hebreo[2]));
    const y = anioDe(hebreo[3], hebreo[4]);
    if (mes && y != null) return BE.inicioMes(y, mes.id) + (+hebreo[1] - 0.5) * BE.DIA;
  }
  const m = s.match(/^(-?\d{1,4})\s*(.*)$/);
  if (!m) return null;
  const y = anioDe(m[1], m[2]);
  return y == null ? null : y + 0.5;
}
function anioDe(num, era) {
  let n = +num;
  const e = era.replace(/[\s.]/g, '');
  if (n < 0) return 1 + n;   // «-607»: se lee como 607 a.e.c.
  if (!n) return null;
  if (/^(a|aec|ac|antes|antesdecristo|bc|bce|adc)$/.test(e) || /^a(ntes)?(de)?(la)?(era)?(comun)?$/.test(e)) return 1 - n;
  if (e === '' || /^(ec|dc|d|ad|ce|despues|era|eracomun)/.test(e)) return n;
  return null;
}
function editarFecha() {
  const caja = $('#fecha');
  if (caja.querySelector('input')) return;
  const input = document.createElement('input');
  input.type = 'text'; input.className = 'fecha-entrada'; input.value = '';
  input.placeholder = '607 a.e.c. · 51 · 14 nisán 33';
  input.setAttribute('aria-label', 'Escribe una fecha: 607 a.e.c., 51, c. 50 o 14 nisán 33');
  caja.appendChild(input);
  caja.classList.add('editando');
  input.focus();
  const cerrar = () => { input.remove(); caja.classList.remove('editando'); };
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { cerrar(); return; }
    if (e.key !== 'Enter') return;
    const t = leerFecha(input.value);
    if (t == null || t < BE.T_MIN - 1 || t > BE.T_MAX + 1) { BE.avisar('No entiendo esa fecha. Prueba «607 a.e.c.», «51» o «14 nisán 33».'); return; }
    cerrar();
    irA(t);
  });
  input.addEventListener('blur', () => setTimeout(cerrar, 150));
}
/** Lleva el cursor a t y, si la escala es muy lejana, acerca a décadas (o a días si la fecha es de un día). */
function irA(t, escala) {
  setT(t);
  const s = escala || (span() > 60 ? 40 : span());
  const v0 = clamp(t - s * 0.4, BE.T_MIN, BE.T_MAX - s);
  E.vista = [v0, v0 + s];
  sucio.linea = true; programar();
}

// ---------------------------------------------------------------------------
// Zoom, menú de la línea y carriles
// ---------------------------------------------------------------------------
function zoomEn(factor, tAncla) {
  const s = clamp(span() * factor, SPAN_MIN, spanMax());
  const f = (tAncla - E.vista[0]) / span();
  let v0 = tAncla - f * s;
  v0 = clamp(v0, BE.T_MIN, BE.T_MAX - s);
  E.vista = [v0, v0 + s];
  sucio.linea = true; programar();
}
/** Encuadra [a, b] con un margen: el tramo ocupa la fracción `ocupa` de la vista, centrado. */
function encuadrarTiempo(a, b, ocupa = 1 / 1.08) {
  const s = clamp((b - a) / ocupa, SPAN_MIN, spanMax());
  const v0 = clamp((a + b) / 2 - s / 2, BE.T_MIN, BE.T_MAX - s);
  E.vista = [v0, v0 + s];
  sucio.linea = true; programar();
}
function ponerGrande(on) {
  L.grande = on;
  $('#app').classList.toggle('linea-grande', on);
  const b = $('[data-linea="grande"]');
  if (b) b.setAttribute('aria-pressed', String(on));
  BE.guardarHash();
}
function fijar(id) {
  const i = L.fijados.indexOf(id);
  if (i >= 0) L.fijados.splice(i, 1); else L.fijados.push(id);
  sucio.linea = true; programar(); BE.guardarHash();
  if (menuAbierto()) abrirMenu(menuAbierto());
}
function rangoSeleccion() {
  if (!E.sel) return null;
  const r = BE.implicados(E.sel);
  const ts = [];
  for (const k of r.claves) {
    const i = k.indexOf(':'), tipo = k.slice(0, i), id = k.slice(i + 1);
    if (tipo === 'parada') { const s = BE.P.find((x) => x.key === id); if (s) ts.push(s.a, s.b); }
    else if (tipo === 'evento') { const e = BE.D.eventos.find((x) => x.id === id); const v = e && BE.ventanaEvento(e); if (v) ts.push(...v); }
    else if (tipo === 'carta') { const c = BE.D.cartas.find((x) => x.id === id); const v = c && BE.ventanaCarta(c); if (v) ts.push(...v); }
    else if (tipo === 'periodo') { const p = BE.D.periodos.find((x) => x.id === id); const v = p && BE.tramoPeriodo(p); if (v) ts.push(...v); }
  }
  return ts.length ? [Math.min(...ts), Math.max(...ts)] : null;
}
function ponerBucle() {
  if (L.bucle) { L.bucle = null; BE.avisar('Bucle quitado.'); }
  else {
    const r = L.regla ? [Math.min(...L.regla), Math.max(...L.regla)] : (rangoSeleccion() || [...E.vista]);
    L.bucle = r;
    if (E.t < r[0] || E.t > r[1]) setT(r[0]);
    BE.avisar(`Bucle de ${textoFecha(r[0])} a ${textoFecha(r[1])}. Pulsa reproducir.`);
  }
  sucio.linea = true; programar(); BE.guardarHash();
}
let menuEl = null;
const menuAbierto = () => (menuEl && !menuEl.hidden ? menuEl.dataset.seccion || 'todo' : null);
let menuOrigen = null;   // botón que abrió el menú: al cerrar, el foco vuelve a él si estaba dentro del menú
function cerrarMenu() {
  if (!menuEl || menuEl.hidden) return;
  const dentro = menuEl.contains(document.activeElement);
  menuEl.hidden = true;
  $('#linea-menu-boton')?.setAttribute('aria-expanded', 'false');
  if (dentro) menuOrigen?.focus();
}
function abrirMenu(seccion = 'todo') {
  const yaAbierto = !!menuEl && !menuEl.hidden;
  const foco = yaAbierto && menuEl.contains(document.activeElement) ? document.activeElement : null;
  const claveFoco = foco && ['data-fijar', 'data-linea', 'data-ir-marcador'].map((a) => foco.hasAttribute(a) ? `[${a}="${CSS.escape(foco.getAttribute(a))}"]` : '').find(Boolean);
  if (!menuEl) {
    menuEl = document.createElement('div');
    menuEl.className = 'linea-menu be-card';
    menuEl.id = 'linea-menu';
    menuEl.setAttribute('role', 'dialog');
    menuEl.setAttribute('aria-label', 'Opciones de la línea de tiempo');
    document.body.appendChild(menuEl);
    menuEl.addEventListener('click', clicMenu);
  }
  menuEl.dataset.seccion = seccion;
  const ms = marcadores();
  const sinc = BE.sincronia?.abierta?.();
  const casilla = (id, on, texto) => `<label class="menu-fila"><input type="checkbox" data-linea="${id}"${on ? ' checked' : ''}> ${texto}</label>`;
  const boton = (id, texto, extra = '') => `<button type="button" class="menu-fila menu-boton" data-linea="${id}"${extra}>${texto}</button>`;
  const lanes = catalogo().filter((c) => c.tipo !== 'pablo' || BE.P.length);
  const personas = personasConCarril().filter((p) => !L.fijados.includes(p.id) && p.id !== 'pablo');
  menuEl.innerHTML = `
    ${seccion === 'todo' ? `<div class="be-card__eyebrow">Línea de tiempo</div>
    ${boton('grande', `${L.grande ? 'Reducir' : 'Ampliar'} la línea <kbd class="be-kbd">T</kbd>`)}
    ${BE.sincronia ? boton('sincronia', sinc ? 'Cerrar la sincronía' : '¿Quién había en un lugar? (sincronía)') : ''}
    ${casilla('pausa', L.pausa, 'Pausar un momento en cada suceso al reproducir')}
    ${casilla('secular', L.secular, 'Fechas seculares como nota')}
    ${boton('regla', L.regla ? 'Quitar la regla' : 'Medir entre dos fechas (regla) <kbd class="be-kbd">Alt</kbd>+arrastrar')}
    ${boton('bucle', L.bucle ? 'Quitar el bucle' : `Repetir en bucle ${L.regla ? 'lo medido' : (E.sel ? 'lo seleccionado' : 'el tramo a la vista')}`)}
    ${boton('marcar', 'Guardar esta fecha como marcador')}
    ${ms.length ? `<div class="menu-sub">Marcadores</div>${ms.map((m, i) => `<div class="menu-marcador"><button type="button" class="enlace-titulo" data-ir-marcador="${i}">${esc(m.nombre)}</button><button type="button" class="menu-x" data-borrar-marcador="${i}" aria-label="Borrar el marcador ${esc(m.nombre)}">×</button></div>`).join('')}` : ''}` : ''}
    ${BE.calendario().meses.length ? `<div class="be-card__eyebrow">Meses</div>
    <div class="menu-meses"><div class="be-seg meses-seg" role="radiogroup" aria-label="Meses">${MODOS_MESES.map(([k, t]) => `<button type="button" class="be-seg__opt${modoMeses() === k ? ' be-seg__opt--on' : ''}" role="radio" aria-checked="${modoMeses() === k}" data-meses="${k}">${t}</button>`).join('')}</div>${enlaceCalendario('meses-que', '¿Qué meses son estos?', 'Qué meses son estos: el calendario de la Biblia, explicado')}</div>` : ''}
    <div class="be-card__eyebrow">Carriles</div>
    <p class="menu-ayuda">Los fijados van arriba y no se van al cambiar de escala. Los demás salen cuando tienen algo a la vista.</p>
    ${lanes.map((c) => { const on = L.fijados.includes(c.id); return `<button type="button" class="menu-fila menu-carril${on ? ' on' : ''}" data-fijar="${esc(c.id)}" aria-pressed="${on}">${ICONOS.alfiler}<span>${esc(c.nombre)}</span>${carrilesVista.includes(c) ? '<small>a la vista</small>' : ''}</button>`; }).join('')}
    ${L.fijados.filter((id) => BE.PERS[id] && id !== 'pablo').map((id) => `<button type="button" class="menu-fila menu-carril on" data-fijar="${esc(id)}" aria-pressed="true">${ICONOS.alfiler}<span>${esc(BE.PERS[id].nombre)}</span></button>`).join('')}
    ${personas.length ? `<label class="menu-fila menu-persona"><span>Añadir persona</span><select data-linea="persona"><option value="">Elige…</option>${personas.map((p) => `<option value="${esc(p.id)}">${esc(p.nombre)}</option>`).join('')}</select></label>` : ''}`;
  menuEl.hidden = false;
  const b = (seccion === 'carriles' ? $('.carriles-boton') : $('#linea-menu-boton')) || $('#linea-menu-boton');
  const r = b.getBoundingClientRect();
  const w = Math.min(320, window.innerWidth - 16);
  menuEl.style.width = `${w}px`;
  menuEl.style.left = `${clamp(seccion === 'carriles' ? r.left : r.right - w, 8, window.innerWidth - w - 8)}px`;
  menuEl.style.bottom = `${window.innerHeight - r.top + 8}px`;
  menuEl.style.maxHeight = `${Math.max(160, r.top - 16)}px`;
  $('#linea-menu-boton')?.setAttribute('aria-expanded', 'true');
  // Es un diálogo: al abrirlo, el foco entra en su primer control (al repintarlo abierto no se mueve).
  if (!yaAbierto) { menuOrigen = b; menuEl.querySelector('button, input, select')?.focus(); }
  else if (foco && !menuEl.contains(document.activeElement)) (menuEl.querySelector(claveFoco || 'button, input, select') || menuEl.querySelector('button, input, select'))?.focus();
}
function clicMenu(e) {
  const f = e.target.closest('[data-fijar]');
  if (f) { fijar(f.dataset.fijar); return; }
  const mm = e.target.closest('[data-meses]');
  if (mm) { ponerMeses(mm.dataset.meses); abrirMenu(menuAbierto()); return; }
  const ir = e.target.closest('[data-ir-marcador]');
  if (ir) { cerrarMenu(); irAMarcador(+ir.dataset.irMarcador); return; }
  const borrar = e.target.closest('[data-borrar-marcador]');
  if (borrar) { const ms = marcadores(); ms.splice(+borrar.dataset.borrarMarcador, 1); guardarMarcadores(ms); sucio.linea = true; programar(); abrirMenu(menuAbierto()); return; }
  const b = e.target.closest('[data-linea]');
  if (!b || b.tagName === 'SELECT') return;
  const que = b.dataset.linea;
  if (que === 'pausa') { L.pausa = b.checked; BE.guardarHash(); return; }
  if (que === 'secular') { L.secular = b.checked; cacheCat = null; sucio.linea = sucio.panel = true; BE.pintarPanel(true); programar(); BE.guardarHash(); return; }
  cerrarMenu();
  if (que === 'grande') ponerGrande(!L.grande);
  else if (que === 'sincronia') BE.sincronia.alternar();
  else if (que === 'regla') { if (L.regla) { L.regla = null; sucio.linea = true; programar(); BE.guardarHash(); } else { L.modoRegla = true; $('#pista').classList.add('modo-regla'); BE.avisar('Arrastra sobre la línea entre las dos fechas.'); } }
  else if (que === 'bucle') ponerBucle();
  else if (que === 'marcar') nuevoMarcador();
}

// ---------------------------------------------------------------------------
// Elementos que se solapan: al pulsar un punto donde hay varios, se elige de una lista
// ---------------------------------------------------------------------------
/** Elementos de la línea bajo un punto de la pantalla, sin repetir y sin los rótulos. Si alguno no es de fondo, los de
    fondo no cuentan: el tramo de un viaje bajo sus paradas, la actividad y las estancias largas de una persona. */
function itemsEn(x, y) {
  const vistos = new Map();
  for (const el of document.elementsFromPoint(x, y)) {
    const g = el.closest?.('#linea-svg g.item[data-sel]');
    if (g && !vistos.has(g.dataset.sel)) vistos.set(g.dataset.sel, g);
  }
  const todos = [...vistos.values()];
  const delante = todos.filter((g) => !g.dataset.fondo);
  return delante.length ? delante : todos;
}
let eleccion = null;
function cerrarEleccion(foco) {
  if (!eleccion) return;
  const { el, origen } = eleccion;
  const dentro = el.contains(document.activeElement);
  eleccion = null;
  el.remove();
  if (foco || dentro) (document.contains(origen) ? origen : $('#pista'))?.focus();
}
/** Lista pequeña con los elementos que se pisan en ese punto, por orden de fecha. Cada fila es un botón data-sel: la
    selección la hace base.js como con cualquier otro. Flechas para moverse, Esc para cerrar. */
function elegirEntre(gs, x, y, origen) {
  cerrarEleccion();
  const filas = gs.map((g) => {
    const t = (g.querySelector('title')?.textContent || g.getAttribute('aria-label') || '').split('\n')[0];
    const i = t.indexOf(' · ');
    return { sel: g.dataset.sel, nombre: i > 0 ? t.slice(0, i) : t, resto: i > 0 ? t.slice(i + 3) : '', x: g.getBoundingClientRect().left };
  }).sort((a, b) => a.x - b.x);
  const el = document.createElement('div');
  el.className = 'linea-eleccion be-card';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', `${filas.length} elementos en este punto: elige uno`);
  el.innerHTML = `<div class="be-card__eyebrow">${filas.length} en este punto</div>${filas.map((f) => `<button type="button" class="menu-fila menu-boton eleccion-fila" data-sel="${esc(f.sel)}"><span>${esc(f.nombre)}</span>${f.resto ? `<small>${esc(f.resto)}</small>` : ''}</button>`).join('')}`;
  document.body.appendChild(el);
  const w = Math.min(340, window.innerWidth - 16);
  el.style.width = `${w}px`;
  el.style.left = `${clamp(x - w / 2, 8, window.innerWidth - w - 8)}px`;
  el.style.bottom = `${window.innerHeight - y + 14}px`;
  el.style.maxHeight = `${Math.max(140, y - 24)}px`;
  eleccion = { el, origen, vista: E.vista.join('~') };
  const botones = () => [...el.querySelectorAll('button')];
  el.addEventListener('keydown', (e) => {
    const bs = botones(), i = bs.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrarEleccion(true); return; }
    const mover = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: bs.length - 1 }[e.key];
    if (mover != null) { e.preventDefault(); e.stopPropagation(); bs[(mover + bs.length) % bs.length].focus(); return; }
    if (e.key === 'Tab') { e.preventDefault(); bs[(i + (e.shiftKey ? -1 : 1) + bs.length) % bs.length].focus(); return; }
    if (e.key !== 'Enter' && e.key !== ' ') e.stopPropagation();   // las flechas y el espacio no mueven el cursor detrás
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sel]');
    if (!b) return;
    const sel = b.dataset.sel;
    setTimeout(() => {   // después de que base.js seleccione
      cerrarEleccion();
      requestAnimationFrame(() => ($(`#linea-svg g.item[data-sel="${CSS.escape(sel)}"]`) || $('#pista'))?.focus({ preventScroll: true }));
    }, 0);
  });
  botones()[0]?.focus();
}

// ---------------------------------------------------------------------------
// Reproducción: pausa en los sucesos (T-11) y bucle (T-12)
// ---------------------------------------------------------------------------
/** Píldora de sucesos agrupados: su tramo ocupa el 60 % de la vista, centrado; el cursor va al primero de ellos y todos
    quedan resaltados, aunque la selección sea otra, hasta que cambia la selección o dejan de verse. Si así la vista no
    se acercaría (en el móvil, a escala de milenios, todo es una píldora), pulsar acerca a un cuarto de la
    vista desde el primero: cada clic acerca, nunca deja la vista igual. */
function abrirGrupo(g) {
  const [a, b] = g.dataset.rango.split('~').map(Number);
  const evs = g.dataset.grupo.split(',').map((id) => BE.D.eventos.find((x) => x.id === id)).filter(Boolean);
  L.grupo = { claves: new Set(evs.map((x) => `evento:${x.id}`)), trs: evs.map(BE.ventanaEvento).filter(Boolean), sel: BE.selTexto(E.sel) };
  const m = BE.momentoEvento(evs.find((x) => x.id === g.dataset.primero) || evs[0]);
  if (m != null) setT(m);
  if ((b - a) / 0.6 < span() * 0.9) { encuadrarTiempo(a, b, 0.6); return; }
  const s = Math.max(span() / 4, SPAN_MIN), v0 = clamp(Math.max(a, BE.T_MIN) - s * 0.2, BE.T_MIN, BE.T_MAX - s);
  E.vista = [v0, v0 + s];
  sucio.linea = true; programar();
}
let tAnterior = null, reanudar = 0;
function momentosFoco() {
  const out = [];
  const foco = E.resaltado?.claves;
  if (foco) {
    for (const k of foco) {
      const i = k.indexOf(':'), tipo = k.slice(0, i), id = k.slice(i + 1);
      if (tipo === 'evento') { const e = BE.D.eventos.find((x) => x.id === id); const m = e && BE.momentoEvento(e); if (m != null) out.push({ t: m, texto: `${e.titulo} · ${e.fecha?.texto || ''}` }); }
      else if (tipo === 'parada') { const s = BE.P.find((x) => x.key === id); if (s) out.push({ t: s.a, texto: `${s.lugar.nombre} · ${s.p.referencia}` }); }
    }
  } else if (span() <= 60) {
    for (const e of BE.D.eventos || []) { const m = BE.momentoEvento(e); if (m != null) out.push({ t: m, texto: `${e.titulo} · ${e.fecha?.texto || ''}` }); }
  }
  return out;
}
function vigilarReproduccion() {
  if (!E.play) { tAnterior = null; return; }
  if (L.bucle && (E.t >= L.bucle[1] || E.t < L.bucle[0] - 1e-6)) {
    tAnterior = null; setT(L.bucle[0]); BE.asegurarVisible(L.bucle[0], false); return;
  }
  if (tAnterior != null && L.pausa && E.t > tAnterior) {
    const hit = momentosFoco().find((m) => m.t > tAnterior && m.t <= E.t);
    if (hit) {
      reproducir(false);
      BE.avisar(hit.texto);
      clearTimeout(reanudar);
      const t = E.t;
      reanudar = setTimeout(() => { if (!E.play && Math.abs(E.t - t) < 1e-9) reproducir(true); }, 1500);
      tAnterior = null;
      return;
    }
  }
  tAnterior = E.t;
}

// ---------------------------------------------------------------------------
// Arranque y gestos
// ---------------------------------------------------------------------------
function montarBarra() {
  const zoom = $('.zoom');
  zoom.innerHTML = ZOOMS.map((z) => `<button type="button" data-zoom="${z.s}" title="${z.n}"><span class="z-largo">${z.n}</span><span class="z-corto" aria-hidden="true">${z.c}</span></button>`).join('');
  const crono = $('.linea-barra .cronologia');
  const mm = document.createElement('div');
  mm.id = 'minimapa'; mm.className = 'be-minimap minimapa';
  mm.setAttribute('role', 'slider'); mm.setAttribute('tabindex', '-1');
  mm.setAttribute('aria-label', 'Toda la historia bíblica: pulsa para ir a esa época');
  mm.title = 'Toda la historia, de Adán al año 100. El marco es lo que ves en la línea.';
  mm.innerHTML = '<span class="be-minimap__win"></span><span class="minimapa-cursor"></span>';
  crono.before(mm);
  const botones = document.createElement('span');
  botones.className = 'linea-botones'; botones.id = 'linea-botones';
  botones.innerHTML = `<button type="button" class="be-btn be-btn--icon be-btn--ghost linea-boton" id="linea-menu-boton" aria-haspopup="dialog" aria-expanded="false" aria-label="Opciones de la línea de tiempo" title="Opciones: ampliar, sincronía, regla, bucle, marcadores y carriles">${ICONOS.menu}</button>`;
  crono.after(botones);
  // Selector «Meses»: qué filas de meses enseña la regla y qué fecha va primero. Sale a escala de meses y de días.
  const meses = document.createElement('div');
  meses.className = 'meses-control';
  meses.id = 'meses-control';
  meses.hidden = true;
  meses.innerHTML = `<span class="meses-etiqueta" id="meses-etiqueta">Meses</span><div class="be-seg meses-seg" role="radiogroup" aria-labelledby="meses-etiqueta">${MODOS_MESES.map(([k, t]) => `<button type="button" class="be-seg__opt" role="radio" data-meses="${k}" title="${esc({ ambos: 'Nuestros meses y los hebreos, alineados', nuestros: 'Solo nuestros meses. ' + AYUDA_NUESTROS.replace(/^Nuestros meses: /, ''), hebreos: 'Solo los meses hebreos, lunares y aproximados' }[k])}">${t}</button>`).join('')}</div>${enlaceCalendario('meses-que', '¿Qué meses son estos?', 'Qué meses son estos: el calendario de la Biblia, explicado')}`;
  zoom.after(meses);
  meses.addEventListener('click', (e) => { const b = e.target.closest('[data-meses]'); if (b) ponerMeses(b.dataset.meses); });
  meses.addEventListener('keydown', (e) => {
    const i = MODOS_MESES.findIndex(([k]) => k === modoMeses()), d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (d == null || !e.target.closest('[data-meses]')) return;
    e.preventDefault(); e.stopPropagation();
    ponerMeses(MODOS_MESES[(i + d + 3) % 3][0]);
    meses.querySelector(`[data-meses="${modoMeses()}"]`)?.focus();
  });
  // La fecha en el otro calendario, junto a la de la barra superior.
  const otra = document.createElement('span');
  otra.className = 'fecha-otra'; otra.id = 'fecha-otra'; otra.hidden = true;
  $('#fecha-valor').after(otra);
  // Los enlaces a las páginas del calendario y de «Acerca de» llevan la vista: su «Volver al mapa» vuelve a esta fecha y
  // esta selección. El calendario la recibe en #desde=…; «Acerca de» en ?desde=…, porque su # es la sección («#gracias»).
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[data-calendario]');
    if (a) a.href = `calendario.html${location.search}${location.hash ? `#desde=${encodeURIComponent(location.hash.slice(1))}` : ''}`;
    const b = e.target.closest?.('a[href^="acerca.html"]');
    if (b) {
      b.dataset.ancla ??= b.getAttribute('href').split('#')[1] || '';
      const q = new URLSearchParams(location.search);
      if (location.hash.length > 1) q.set('desde', location.hash.slice(1));
      b.href = `acerca.html${String(q) ? `?${q}` : ''}${b.dataset.ancla ? `#${b.dataset.ancla}` : ''}`;
    }
  }, true);
  const irMinimapa = (e) => {
    const r = mm.getBoundingClientRect();
    const t = BE.T_MIN + clamp((e.clientX - r.left) / r.width, 0, 1) * spanMax();
    const s = span();
    const v0 = clamp(t - s / 2, BE.T_MIN, BE.T_MAX - s);
    E.vista = [v0, v0 + s]; sucio.linea = true; programar();
  };
  let arrastrando = false;
  mm.addEventListener('pointerdown', (e) => { arrastrando = true; try { mm.setPointerCapture(e.pointerId); } catch { /* puntero sintético */ } irMinimapa(e); });
  mm.addEventListener('pointermove', (e) => { if (arrastrando) irMinimapa(e); });
  mm.addEventListener('pointerup', () => { arrastrando = false; });
  $('#linea-menu-boton').addEventListener('click', (e) => { e.stopPropagation(); if (menuAbierto()) cerrarMenu(); else abrirMenu('todo'); });
  $('#fecha').addEventListener('click', editarFecha);
  $('#fecha').setAttribute('title', 'Pulsa para escribir una fecha: 607 a.e.c., 51 o 14 nisán 33');
  $('#fecha').setAttribute('role', 'button'); $('#fecha').setAttribute('tabindex', '0');
  $('#fecha').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === $('#fecha')) editarFecha(); });
  document.addEventListener('pointerdown', (e) => {
    if (menuAbierto() && !e.target.closest('#linea-menu, #linea-menu-boton, .carriles-boton')) cerrarMenu();
    if (eleccion && !e.target.closest('.linea-eleccion')) cerrarEleccion();
  });
  $('#carriles').addEventListener('click', (e) => {
    const f = e.target.closest('[data-fijar]');
    if (f) { e.stopPropagation(); fijar(f.dataset.fijar); return; }
    if (e.target.closest('.carriles-boton')) { e.stopPropagation(); if (menuAbierto() === 'carriles') cerrarMenu(); else abrirMenu('carriles'); return; }
    // Las filas de meses se explican al tocar su nombre: en el móvil no hay título emergente.
    const fila = !e.target.closest('a, button') && e.target.closest('.carril-mes[title]');
    if (fila) BE.avisar(fila.title, 8000);
  });
  document.addEventListener('change', (e) => {
    if (e.target.matches?.('#linea-menu select[data-linea="persona"]') && e.target.value) { fijar(e.target.value); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.matches?.('input, textarea, select') || e.metaKey || e.ctrlKey) return;
    if (e.key === 't' || e.key === 'T') { e.preventDefault(); ponerGrande(!L.grande); }
    if (e.key === 'Escape') { cerrarMenu(); if (L.modoRegla) { L.modoRegla = false; $('#pista').classList.remove('modo-regla'); } }
  });
}
function ponerMeses(modo) {
  if (!MODOS_MESES.some(([k]) => k === modo)) return;
  L.meses = modo;
  sucio.linea = sucio.cursor = true; programar(); BE.guardarHash();
}
/** El selector «Meses» sigue a la escala y al modo. */
function pintarSelectorMeses() {
  const el = $('#meses-control');
  if (!el) return;
  el.hidden = !(span() < 4) || !BE.calendario().meses.length;
  const modo = modoMeses();
  el.querySelectorAll('[data-meses]').forEach((b) => {
    const on = b.dataset.meses === modo;
    b.classList.toggle('be-seg__opt--on', on); b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1;
  });
}
function iniciarLinea() {
  montarBarra();
  const pista = $('#pista');
  pista.setAttribute('aria-valuemin', String(BE.T_MIN));
  pista.setAttribute('aria-valuemax', String(BE.T_MAX));
  const punteros = new Map();
  let arrastre = null, pinza = null, regla = null;
  pista.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = pista.getBoundingClientRect();
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
      const d = (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) / anchoLinea * span();
      const v0 = clamp(E.vista[0] + d, BE.T_MIN, BE.T_MAX - span());
      E.vista = [v0, v0 + span()]; sucio.linea = true; programar();
    } else {
      zoomEn(Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), tDe(e.clientX - r.left));
    }
  }, { passive: false });
  let toqueMes = null;
  pista.addEventListener('pointerdown', (e) => {
    const r = pista.getBoundingClientRect();
    punteros.set(e.pointerId, e.clientX);
    if (punteros.size === 2) {
      const xs = [...punteros.values()];
      pinza = { d: Math.abs(xs[0] - xs[1]), s: span(), t: tDe((xs[0] + xs[1]) / 2 - r.left) };
      arrastre = null; regla = null; return;
    }
    if (e.target.closest('[data-sel], [data-rango], [data-linea], [data-marcador]')) return;   // lo gestionan los clics
    const mes = e.target.closest?.('g.mes[data-aviso]');
    toqueMes = mes ? { texto: mes.dataset.aviso, x: e.clientX } : null;
    if (e.altKey || L.modoRegla) {
      const t = ajustar(tDe(e.clientX - r.left));
      regla = { a: t };
      L.regla = [t, t];
      try { pista.setPointerCapture(e.pointerId); } catch { /* puntero sintético */ }
      sucio.linea = true; programar();
      return;
    }
    arrastre = { x: e.clientX };
    try { pista.setPointerCapture(e.pointerId); } catch { /* puntero sintético */ }
    setT(tDe(e.clientX - r.left));
  });
  pista.addEventListener('pointermove', (e) => {
    const r = pista.getBoundingClientRect();
    if (punteros.has(e.pointerId)) punteros.set(e.pointerId, e.clientX);
    if (pinza && punteros.size === 2) {
      const xs = [...punteros.values()];
      const d = Math.max(10, Math.abs(xs[0] - xs[1]));
      const s = clamp(pinza.s * pinza.d / d, SPAN_MIN, spanMax());
      zoomEn(s / span(), pinza.t);
      return;
    }
    if (regla) { L.regla = [regla.a, ajustar(tDe(e.clientX - r.left))]; sucio.linea = true; programar(); return; }
    if (arrastre) setT(tDe(e.clientX - r.left));
  });
  const fin = (e) => {
    punteros.delete(e.pointerId);
    if (punteros.size < 2) pinza = null;
    if (regla) {
      if (Math.abs(L.regla[1] - L.regla[0]) < 1e-6) L.regla = null;
      regla = null; L.modoRegla = false; pista.classList.remove('modo-regla');
      sucio.linea = true; programar(); BE.guardarHash();
    }
    arrastre = null;
    // Un toque (no un arrastre) sobre un mes con el nombre cortado lo nombra entero.
    if (toqueMes && e.type === 'pointerup' && Math.abs(e.clientX - toqueMes.x) < 8 && !L.regla) BE.avisar(toqueMes.texto, 6000);
    toqueMes = null;
  };
  pista.addEventListener('pointerup', fin);
  pista.addEventListener('pointercancel', (e) => { punteros.delete(e.pointerId); pinza = null; arrastre = null; regla = null; });
  // Píldoras de sucesos agrupados, eras e imperios: acercan el zoom a su tramo. Regla y marcadores.
  $('#linea-svg').addEventListener('click', (e) => {
    // Un clic de ratón o de dedo sobre una forma bajo la que hay otras: se elige de una lista. Un rótulo nunca
    // pregunta: nombra un solo elemento. Enter desde el teclado (detail 0) elige el que tiene el foco.
    const item = e.target.closest('g.item[data-sel]');
    if (item && e.detail > 0) {
      const gs = itemsEn(e.clientX, e.clientY);
      if (gs.length > 1) { e.stopPropagation(); e.preventDefault(); elegirEntre(gs, e.clientX, e.clientY, item); return; }
    }
    const q = e.target.closest('[data-linea="quitar-regla"]');
    if (q) { L.regla = null; sucio.linea = true; programar(); BE.guardarHash(); return; }
    const m = e.target.closest('[data-marcador]');
    if (m) { irAMarcador(+m.dataset.marcador); return; }
    const g = e.target.closest('[data-rango]');
    if (g?.dataset.grupo) { abrirGrupo(g); return; }
    if (g) {
      const [a, b] = g.dataset.rango.split('~').map(Number);
      setTimeout(() => encuadrarTiempo(a, b), 0);   // después de la selección, que centra el cursor
    }
  });
  // Pasar sobre un rótulo marca su elemento, como pasar sobre la forma.
  let encima = null;
  const marcarEncima = (sel) => {
    if (encima?.dataset.sel === sel) return;
    encima?.classList.remove('encima');
    encima = sel ? $(`#linea-svg g.item[data-sel="${CSS.escape(sel)}"]`) : null;
    encima?.classList.add('encima');
  };
  $('#linea-svg').addEventListener('pointerover', (e) => marcarEncima(e.target.closest?.('.item-texto')?.dataset.sel || null));
  $('#linea-svg').addEventListener('pointerleave', () => marcarEncima(null));
  $('#linea-svg').addEventListener('keydown', (e) => {
    const g = e.target.closest?.('[data-rango]:not([data-sel]), [data-marcador], [data-linea]');
    if (g && e.key === 'Enter') { e.preventDefault(); g.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  });
  document.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
    const s = +b.dataset.zoom;
    const v0 = clamp(E.t - s * 0.4, BE.T_MIN, BE.T_MAX - s);
    E.vista = [v0, v0 + s]; sucio.linea = true; programar();
  }));
  $('#reproducir').addEventListener('click', () => reproducir(!E.play));
  $('#anterior').addEventListener('click', () => saltar(-1));
  $('#siguiente').addEventListener('click', () => saltar(1));
  new ResizeObserver(() => { sucio.linea = true; programar(); }).observe(pista);
  BE.pintores.push(() => vigilarReproduccion());
}

/** Momentos a los que saltan «anterior» y «siguiente» (T-13): con algo seleccionado, lo suyo; sin selección, las paradas,
    las cartas, los sucesos y el comienzo de cada periodo. */
BE.hitos = () => {
  let ts = [];
  const r = E.resaltado;
  if (r) {
    for (const m of momentosFoco()) ts.push(m.t);
    for (const k of r.claves) {
      if (k.startsWith('carta:')) { const c = BE.D.cartas.find((x) => `carta:${x.id}` === k); const m = c && BE.momentoCarta(c); if (m != null) ts.push(m); }
      if (k.startsWith('periodo:')) { const p = BE.D.periodos.find((x) => `periodo:${x.id}` === k); const tr = p && tramo(p.fecha); if (tr) ts.push(tr[0] + 0.01); }
    }
  }
  if (!ts.length) {
    ts = BE.P.map((s) => (s.a + s.b) / 2).concat(BE.D.cartas.map(BE.momentoCarta).filter((x) => x != null));
    for (const e of BE.D.eventos || []) { const m = BE.momentoEvento(e); if (m != null) ts.push(m); }
    for (const p of BE.D.periodos || []) { const tr = tramo(p.fecha); if (tr && p.tipo !== 'era') ts.push(tr[0] + 0.01); }
  }
  return [...new Set(ts.map((x) => Math.round(x * 1000) / 1000))].sort((a, b) => a - b);
};

// Parámetros de la dirección: carriles fijados, fechas seculares, pausa, regla, bucle y línea ampliada.
const rango = (r) => (r ? `${Math.min(...r).toFixed(3)}~${Math.max(...r).toFixed(3)}` : null);
const leerRango = (v) => { const m = String(v || '').match(/^(-?[\d.]+)~(-?[\d.]+)$/); return m ? [+m[1], +m[2]] : null; };
BE.parametros.push(
  { nombre: 'carriles', escribir: () => (L.fijados.length ? L.fijados.join(',') : null), leer: (v) => { L.fijados = v ? v.split(',').filter((id) => carrilPorId(id)) : []; claveEtiquetas = ''; } },
  { nombre: 'secular', escribir: () => (L.secular ? null : '0'), leer: (v) => { L.secular = v !== '0'; } },
  { nombre: 'pausa', escribir: () => (L.pausa ? null : '0'), leer: (v) => { L.pausa = v !== '0'; } },
  { nombre: 'regla', escribir: () => rango(L.regla), leer: (v) => { L.regla = leerRango(v); } },
  { nombre: 'bucle', escribir: () => rango(L.bucle), leer: (v) => { L.bucle = leerRango(v); } },
  { nombre: 'linea', escribir: () => (L.grande ? 'grande' : null), leer: (v) => { if ((v === 'grande') !== L.grande) ponerGrande(v === 'grande'); } },
  // Sin «meses» en la dirección vale lo de siempre: ambos, también en el móvil.
  { nombre: 'meses', escribir: () => L.meses, leer: (v) => { L.meses = MODOS_MESES.some(([k]) => k === v) ? v : null; } },
);

Object.assign(BE, {
  pintarLineaFija, pintarCursor, iniciarLinea, leerFecha, irA, encuadrarTiempo, duracion, ponerGrande, colorPotencia, fmtMes,
  lineaEstado: L,
});
})();
