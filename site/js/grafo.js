/* biblical-earth · grafo de personas (pantalla 07, #vista-grafo) y conexión entre dos (pantalla 10, #vista-conexion).
   El grafo pone una persona en el centro y sus conexiones alrededor, por sectores (G-02), según la fecha del cursor
   (G-03), con migas de los saltos (G-04), verbo, fecha y referencia en cada arista (G-06), grupos plegados (G-07),
   líneas según lo firme que es la relación (G-14), vista de lista (G-16) y el mapa resaltando lo que se toca (G-17).
   El centro puede ser cualquier cosa seleccionable (persona, lugar, suceso, carta…): lo seleccionado es siempre el
   centro, también cuando se elige en la búsqueda o en el mapa con el grafo abierto.
   La conexión busca caminos entre dos personas o lugares y los ordena por solidez (G-05).
   Dueño durante el reparto: app-estudio. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, $, fmtCursor, fmtAnio } = BE;

const SECTORES = [   // en este orden, en el sentido de las agujas del reloj empezando arriba (G-02)
  { grupo: 'Lugares', rotulo: 'Lugares' },
  { grupo: 'Hechos', rotulo: 'Hechos' },
  { grupo: 'Cartas', rotulo: 'Cartas' },
  { grupo: 'Personas', rotulo: 'Personas' },
];
const MAX_SECTOR = 12;   // G-07: como mucho unos doce vecinos por sector a la vista
const NODO_TIPO = { persona: 'persona', lugar: 'lugar', evento: 'evento', periodo: 'periodo', hallazgo: 'hallazgo', carta: 'texto', viaje: 'evento', parada: 'evento', pasaje: 'texto', libro: 'texto', recorrido: 'evento' };
/** Qué dice cada color de nodo, para la leyenda del grafo. */
const COLOR_TEXTO = { persona: 'persona', lugar: 'lugar', evento: 'suceso o viaje', periodo: 'periodo', hallazgo: 'hallazgo', texto: 'carta o capítulo' };
const tipoDe = (sel) => sel.slice(0, sel.indexOf(':'));
const claseNodo = (sel) => NODO_TIPO[tipoDe(sel)] || 'evento';
const grupoDe = (sel) => ({ persona: 'Personas', lugar: 'Lugares', carta: 'Cartas' })[tipoDe(sel)] || 'Hechos';
/** En la dirección y en los botones, una persona va por su id («pablo») y lo demás con su tipo («lugar:creta»). */
const aSel = (x) => (!x ? null : x.includes(':') ? x : `persona:${x}`);
const ORDEN_ESTADO = { ahora: 0, siempre: 1, pasado: 2, futuro: 3 };
const estrecha = () => matchMedia('(max-width: 760px)').matches;
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const nombreDe = (sel) => BE.nombreDeSel(sel);
/** En el móvil la vista ocupa el mapa: la hoja de la ficha se pliega para dejarla a la vista. */
function plegarHoja() { if (estrecha() && !BE.E.hojaPlegada) document.getElementById('hoja-asa')?.click(); }
const inicial = (sel) => { const n = nombreDe(sel) || '?'; return sel.startsWith('carta:') ? (BE.abrCarta?.(BE.D.cartas.find((c) => `carta:${c.id}` === sel)) || n[0]) : n[0]; };

// ---------------------------------------------------------------------------
// Vistas de estudio que tapan el mapa: solo una a la vez (grafo, conexión o lectura)
// ---------------------------------------------------------------------------
const estudio = BE.estudio = BE.estudio || { vistas: {} };
estudio.abrirSolo = (nombre) => { for (const [k, v] of Object.entries(estudio.vistas)) if (k !== nombre && v.abierta()) v.cerrar(true); };
/** En escritorio grafo, conexión y lectura tapan la izquierda del mapa. Su ancho pasa a ser el relleno izquierdo del
    mapa, así que encuadrar, centrar y seguir a Pablo dejan lo importante a la vista, a la derecha de la vista abierta.
    En el móvil no: grafo y conexión tapan el mapa entero y la hoja de lectura ya la cuenta el encuadre de mapa.js. */
let rellenoPuesto = -1;
estudio.relleno = () => {
  const map = BE.mapa?.gl;
  if (!map?.setPadding) return;
  const caja = map.getContainer().getBoundingClientRect();
  let left = 0;
  if (!estrecha()) {
    for (const id of ['vista-grafo', 'vista-conexion', 'vista-lectura']) {
      const el = document.getElementById(id);
      // Solo cuenta lo que tapa el mapa por la izquierda: en la tableta en vertical la lectura va encima de la ficha.
      const r = el && !el.hidden && el.offsetParent ? el.getBoundingClientRect() : null;
      if (r && r.left <= caja.left + 1) left = Math.max(left, Math.round(r.right - caja.left));
    }
  }
  left = Math.max(0, Math.min(left, caja.width - 240));
  if (left === rellenoPuesto) return;
  rellenoPuesto = left;
  map.setPadding({ top: 0, right: 0, bottom: 0, left });
};
window.addEventListener('resize', () => { estudio.relleno(); G.recorte = 0; });
/** Abierta desde un enlace sin fecha ni selección (#leer=genesis-12, #grafo=jesus), la vista hace lo mismo que al
    abrirla a mano: selecciona, lleva el cursor a su momento y encuadra. Va después de que base.js lea la dirección. */
estudio.trasEnlace = (fn) => {
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.has('t') || p.has('sel')) return;
  queueMicrotask(fn);
};

// ---------------------------------------------------------------------------
// Grafo
// ---------------------------------------------------------------------------
// G.ruta: selecciones en texto («persona:pablo», «lugar:creta»); la última es el centro. G.visto: la última selección
// que el grafo ya siguió, para centrarse solo cuando la selección cambia fuera de él.
const G = { ruta: [], vigente: true, modo: null, ocultos: new Set(), abiertos: new Set(), clave: '', previos: new Set(), hover: null, visto: null };
const abierto = () => G.ruta.length > 0;
const centro = () => G.ruta[G.ruta.length - 1];

/** Las aristas de cada persona, indexadas por lo que tocan: desde un lugar, un suceso o una carta se ven al revés. */
let INV = null;
function inversas() {
  if (INV) return INV;
  INV = new Map();
  for (const p of Object.values(BE.PERS)) {
    for (const a of BE.aristas(p.id)) {
      if (!INV.has(a.sel)) INV.set(a.sel, []);
      INV.get(a.sel).push({ ...a, sel: `persona:${p.id}`, grupo: 'Personas', fuerte: false, inversa: true });
    }
  }
  return INV;
}
/** Conexiones de cualquier selección, con la forma de BE.aristas (verbo, tramo, referencia y fuentes). Una persona usa
    las suyas; lo demás junta las de las personas que lo tocan y lo que el propio dato nombra (los lugares de un
    suceso, dónde se escribió una carta, lo que pasó en un lugar). Una arista sin referencia ni fuente no entra (G-06). */
const MEMO_SEL = new Map();
function aristasSel(sel) {
  const s = BE.parseSel(sel);
  if (!s) return [];
  if (s.tipo === 'persona') return BE.aristas(s.id);
  if (MEMO_SEL.has(sel)) return MEMO_SEL.get(sel);
  const out = [], vistas = new Set();
  const poner = (a) => {
    if (!a.sel || a.sel === sel || !BE.parseSel(a.sel)) return;
    if (!((a.fuentes && a.fuentes.length) || a.ref)) return;
    const k = `${a.sel}|${a.verbo}|${a.tr ? a.tr[0] : ''}`;
    if (vistas.has(k)) return;
    vistas.add(k);
    out.push({ grupo: grupoDe(a.sel), ...a, tr: a.tr !== undefined ? a.tr : BE.tramoAbierto(a.fecha) });
  };
  for (const a of inversas().get(sel) || []) poner(a);
  const o = BE.objetoSel?.(s) || {};
  const refDe = (x) => x?.referencia || (x?.pasajes || []).filter(Boolean).join('; ') || '';
  const base = { fecha: o.fecha, ref: refDe(o), fuentes: o.fuentes, razon: o.razon, estado: o.estado, origen: s.tipo };
  if (s.tipo === 'lugar') {
    const VERBO = { evento: 'ocurre aquí', periodo: 'abarca este lugar', parada: 'parada aquí', hallazgo: 'se halló aquí' };
    for (const h of BE.hechosDe?.(s.id) || []) {
      if (h.tipo === 'persona') continue;   // las personas ya llegan por sus propias aristas
      const verbo = h.tipo === 'carta' ? h.titulo.split(', ').pop() : VERBO[h.tipo] || 'pasa aquí';
      poner({ sel: h.sel, verbo, tr: h.tr || null, fecha: h.fecha, ref: (h.pasajes || []).filter(Boolean).join('; '), fuentes: h.fuentes, estado: h.estado, deducido: !!h.deducido, origen: h.tipo });
    }
  } else if (s.tipo === 'evento') {
    const tr = BE.ventanaEvento?.(o) || undefined;
    (o.lugares || []).forEach((l, i) => { if (BE.L[l]) poner({ ...base, tr, sel: `lugar:${l}`, verbo: i ? 'también aquí' : 'ocurre aquí' }); });
  } else if (s.tipo === 'carta') {
    const os = BE.origenesCarta?.(o) || [], ds = BE.destinosCarta?.(o) || [];
    os.forEach((l) => poner({ ...base, sel: `lugar:${l}`, verbo: os.length > 1 ? 'quizá escrita aquí' : 'escrita aquí', deducido: os.length > 1 }));
    ds.forEach((l) => poner({ ...base, sel: `lugar:${l}`, verbo: 'enviada aquí' }));
  } else if (s.tipo === 'periodo') {
    (o.lugares || []).forEach((l) => { if (BE.L[l]) poner({ ...base, sel: `lugar:${l}`, verbo: 'su territorio' }); });
  } else if (s.tipo === 'viaje') {
    for (const x of BE.P || []) if (x.viaje === o) poner({ sel: `lugar:${x.lugar.id}`, verbo: x.b - x.a > 0.4 ? 'se queda aquí' : 'pasa por aquí', tr: [x.a, x.b], fecha: x.p.fecha, ref: x.p.referencia, fuentes: x.p.fuentes || o.fuentes, estado: x.p.estado, incierto: !!x.narrativa, origen: 'parada' });
    if ((o.persona || 'pablo') !== 'pablo') for (const p of o.paradas || []) if (BE.L[p.lugar]) poner({ ...base, sel: `lugar:${p.lugar}`, verbo: 'parada del viaje', fecha: p.fecha || o.fecha, ref: p.referencia || base.ref, fuentes: p.fuentes || o.fuentes });
  } else if (s.tipo === 'parada') {
    const x = (BE.P || []).find((y) => y.key === s.id);
    if (x) {
      const b = { tr: [x.a, x.b], fecha: x.p.fecha, ref: x.p.referencia, fuentes: x.p.fuentes || x.viaje.fuentes, estado: x.p.estado, incierto: !!x.narrativa, origen: 'parada' };
      poner({ ...b, sel: `lugar:${x.lugar.id}`, verbo: 'aquí' });
      poner({ ...b, sel: `persona:${x.viaje.persona || 'pablo'}`, verbo: 'de viaje' });
      poner({ ...b, sel: `viaje:${x.viaje.id}`, verbo: 'parte de este viaje' });
    }
  } else if (s.tipo === 'hallazgo') {
    for (const r of o.relaciona || []) poner({ ...base, fecha: o.fecha_objeto, sel: r, verbo: 'lo menciona' });
    if (o.lugar_hallazgo) poner({ ...base, fecha: o.fecha_objeto, sel: `lugar:${o.lugar_hallazgo}`, verbo: 'se halló aquí' });
  }
  if (!out.length) {   // capítulos, libros y recorridos: lo que implican, con la fecha de cada cosa
    const imp = BE.implicados(s);
    for (const k of imp.claves) {
      const ks = BE.parseSel(k);
      const ok = ks && BE.objetoSel?.(ks);
      if (ok) poner({ sel: k, verbo: s.tipo === 'recorrido' ? 'en el recorrido' : 'en este texto', fecha: ok.fecha, ref: refDe(ok) || nombreDe(sel), fuentes: ok.fuentes, estado: ok.estado, origen: s.tipo });
    }
    for (const l of imp.lugares) poner({ sel: `lugar:${l}`, verbo: s.tipo === 'recorrido' ? 'en el recorrido' : 'se nombra aquí', tr: null, ref: base.ref || nombreDe(sel), fuentes: o.fuentes, origen: s.tipo });
  }
  MEMO_SEL.set(sel, out);
  return out;
}

/** Nodos alrededor de una selección en el año t: las aristas agrupadas por vecino, con su estado en esa fecha. */
function nodosDe(sel, t) {
  sel = aSel(sel);
  const as = aristasSel(sel).map((a) => ({ ...a, estadoT: BE.vigencia(a.tr, t) }));
  const id = sel.startsWith('persona:') ? sel.slice(8) : null;
  const aqui = id && BE.lugarActual(id, t);
  if (aqui) as.push({ sel: `lugar:${aqui.id}`, grupo: 'Lugares', verbo: aqui.parada ? 'está aquí ahora' : 'de camino desde aquí', tr: [t - 0.01, t + 0.01], estadoT: 'ahora', fuerte: true, incierto: aqui.estimada, origen: 'donde', fuentes: [], ref: '' });
  const por = new Map();
  for (const a of as) {
    if (!por.has(a.sel)) por.set(a.sel, { sel: a.sel, grupo: a.grupo, aristas: [] });
    por.get(a.sel).aristas.push(a);
  }
  const nodos = [...por.values()];
  for (const n of nodos) {
    n.aristas.sort((x, y) => ORDEN_ESTADO[x.estadoT] - ORDEN_ESTADO[y.estadoT] || (y.fuerte ? 1 : 0) - (x.fuerte ? 1 : 0) || (x.deducido ? 1 : 0) - (y.deducido ? 1 : 0));
    // La arista principal: la vigente; si no hay, la de fecha más cercana al cursor.
    const ahora = n.aristas.find((a) => a.estadoT === 'ahora');
    const siempre = n.aristas.find((a) => a.estadoT === 'siempre');
    const pasada = n.aristas.filter((a) => a.estadoT === 'pasado').sort((x, y) => y.tr[1] - x.tr[1])[0];
    const futura = n.aristas.filter((a) => a.estadoT === 'futuro').sort((x, y) => x.tr[0] - y.tr[0])[0];
    n.principal = ahora || siempre || pasada || futura;
    n.estado = n.principal.estadoT;
    n.orden = n.principal.tr ? n.principal.tr[0] : -1e9;
  }
  return nodos.sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || a.orden - b.orden);
}
function claseArista(a, estado) {
  const c = ['arista'];
  if (estado === 'pasado') c.push('arista--pasado');
  else if (estado === 'futuro') c.push('arista--futuro');
  if (a.incierto || a.estado === 'pendiente') c.push('arista--incierta');
  else if (a.deducido) c.push('arista--deducida');
  if (a.fuerte && estado === 'ahora') c.push('arista--fuerte');
  return c.join(' ');
}
function metaNodo(n) {
  const a = n.principal;
  const cuando = n.estado === 'pasado' ? 'antes' : n.estado === 'futuro' ? 'aún no' : '';
  const ref = BE.citas(a.ref || '')[0]?.texto || (a.ref || '').split(';')[0];
  return [cuando, a.verbo, ref].filter(Boolean).join(' · ');
}

function htmlTarjeta(n) {
  const filas = n.aristas.slice(0, 4).map((a) => `<div class="tarjeta-arista">
    <div class="tarjeta-verbo"><b>${esc(a.verbo)}</b>${a.deducido ? ' <span class="etiqueta-deducido be-chip">deducido</span>' : ''}${a.incierto ? ' <span class="etiqueta-incierto be-chip">fecha o lugar inciertos</span>' : ''}</div>
    <div class="fila-chips"><span class="be-chrono ${a.tr ? 'be-chrono--tnm' : 'be-chrono--approx'}">${esc(a.tr ? BE.textoFechaArista(a) : 'sin fecha')}</span>${BE.chipsCitas(a.ref || '')}</div>
    ${a.razon ? `<p class="tarjeta-razon">${esc(a.razon)}</p>` : ''}
    ${(a.fuentes || []).slice(0, 2).map((f) => BE.D.fuentes?.[f]).filter(Boolean).map((f) => `<span class="be-tier be-tier--${f.nivel === 1 ? 1 : 2}" data-n="${f.nivel}">${esc(f.titulo)}</span>`).join(' ')}
  </div>`).join('');
  return `<div class="be-card__pad"><div class="be-card__eyebrow">${esc(nombreDe(centro()))} · ${esc(nombreDe(n.sel))}</div>${filas}${n.aristas.length > 4 ? `<p class="be-muted">Y ${n.aristas.length - 4} conexiones más en la lista.</p>` : ''}</div>`;
}

function cabeceraGrafo(nodos, visibles) {
  // Cuántos hay de cada sector en esta fecha, cuente o no el filtro de sectores: un sector oculto enseña lo que oculta.
  const cuenta = {};
  for (const n of filtrar(nodos, true)) cuenta[n.grupo] = (cuenta[n.grupo] || 0) + 1;
  // Un sector sin nada en esta fecha no sale: «Cartas 0» en quien no tiene cartas no dice nada. Si está oculto sí,
  // para poder volver a enseñarlo.
  const sectores = SECTORES.filter((s) => cuenta[s.grupo] || G.ocultos.has(s.grupo));
  const cuando = fmtCursor(E.t);
  return `<header class="vista-cab">
    <nav class="be-crumbs migas-grafo" aria-label="Saltos en el grafo">${G.ruta.map((sel, i) => `${i ? '<span class="be-sep" aria-hidden="true">›</span>' : ''}<button type="button" class="miga${i === G.ruta.length - 1 ? ' miga--actual' : ''}" data-grafo-miga="${i}"${i === G.ruta.length - 1 ? ' aria-current="true"' : ''}><span class="be-node be-node--${claseNodo(sel)} be-node--sm" aria-hidden="true">${esc(inicial(sel))}</span>${esc(nombreDe(sel))}</button>`).join('')}</nav>
    <div class="be-seg grafo-modo" role="radiogroup" aria-label="Forma de ver las conexiones">
      <button type="button" role="radio" class="be-seg__opt${G.modo === 'grafo' ? ' be-seg__opt--on' : ''}" aria-checked="${G.modo === 'grafo'}" data-grafo-modo="grafo">Grafo</button>
      <button type="button" role="radio" class="be-seg__opt${G.modo === 'lista' ? ' be-seg__opt--on' : ''}" aria-checked="${G.modo === 'lista'}" data-grafo-modo="lista">Lista</button></div>
    <button type="button" class="be-btn be-btn--sm be-btn--ghost vista-cerrar" data-grafo-cerrar aria-label="Cerrar el grafo">Cerrar <span aria-hidden="true">×</span></button>
  </header>
  <div class="grafo-filtros" role="group" aria-label="Filtros del grafo">
    ${sectores.map((s) => `<button type="button" class="be-chip${G.ocultos.has(s.grupo) ? '' : ' be-chip--active'}" aria-pressed="${!G.ocultos.has(s.grupo)}" data-grafo-sector="${s.grupo}" title="${G.ocultos.has(s.grupo) ? 'Oculto: pulsa para enseñarlo' : 'Pulsa para ocultarlo'}"><span class="be-chip__dot sector-punto sector-punto--${s.grupo.toLowerCase()}"></span>${s.rotulo}${cuenta[s.grupo] ? ` ${cuenta[s.grupo]}` : ''}</button>`).join('')}
    <button type="button" role="switch" class="interruptor-grafo" aria-checked="${G.vigente}" data-grafo-vigente title="${G.vigente ? 'Encendido: solo se ven las conexiones de esta fecha. Apágalo para ver las de otras fechas, atenuadas' : 'Apagado: se ven también las conexiones de otras fechas, atenuadas'}"><span class="interruptor-pista" aria-hidden="true"><span class="interruptor-bola"></span></span><span>Solo lo vigente en ${esc(cuando)}</span><span class="interruptor-estado" aria-hidden="true">${G.vigente ? 'Sí' : 'No'}</span></button>
    <span class="grafo-oculto be-muted">${G.vigente && nodos.length > visibles.length ? `${nodos.length - visibles.length} de otras fechas ocultas` : ''}</span>
  </div>
  <p class="sr-only">${esc(nombreDe(centro()))} en ${esc(cuando)}: ${visibles.length} conexiones.</p>`;
}

/** Lo que se ve: sin los sectores ocultos (salvo con sinSectores) y, con «Solo lo vigente», sin lo de otras fechas. */
function filtrar(nodos, sinSectores = false) {
  const enRuta = new Set(G.ruta);
  return nodos.filter((n) => (sinSectores || !G.ocultos.has(n.grupo)) && (!G.vigente || n.estado === 'ahora' || n.estado === 'siempre' || enRuta.has(n.sel)));
}
/** Leyenda: qué es cada color de nodo (solo los que hay a la vista) y cada tipo de línea. */
/** La leyenda empieza abierta solo si sobra sitio: en una vista baja, abierta le quita al círculo el alto que necesita. */
const leyendaAbierta = () => { const vg = $('#vista-grafo'); return G.leyenda ?? (vg.clientWidth >= 480 && vg.clientHeight >= 600); };
function leyendaHtml(visibles) {
  const clases = new Set([claseNodo(centro()), ...visibles.map((n) => claseNodo(n.sel))]);
  const colores = Object.entries(COLOR_TEXTO).filter(([k]) => clases.has(k))
    .map(([k, t]) => `<span><i class="be-node be-node--${k} leyenda-nodo" aria-hidden="true"></i>${t}</span>`).join('');
  // Abierta si cabe; en una vista estrecha (tableta, móvil) se pliega en «Leyenda» para no tapar la lista. Lo que
  // elija la persona se respeta hasta cerrar el grafo.
  const abierta = leyendaAbierta();
  return `<details class="grafo-leyenda" data-grafo-leyenda${abierta ? ' open' : ''}><summary>Leyenda: colores y líneas</summary>
      <div class="grafo-leyenda__filas">
      <div class="grafo-leyenda__fila"><span class="be-caps">Colores</span>${colores}</div>
      <div class="grafo-leyenda__fila"><span class="be-caps">Líneas</span><span><i class="lin lin--texto"></i>lo dice el texto</span><span><i class="lin lin--deducida"></i>deducido</span><span><i class="lin lin--incierta"></i>fecha o lugar inciertos</span><span><i class="lin lin--pasado"></i>ya pasó</span><span><i class="lin lin--futuro"></i>aún no ocurre</span></div></div></details>`;
}

function pintarGrafo(forzar) {
  const v = $('#vista-grafo');
  if (!abierto()) { if (!v.hidden) { v.hidden = true; v.innerHTML = ''; } return; }
  const id = centro();
  if (!BE.parseSel(id)) { cerrarGrafo(); return; }
  const nodos = nodosDe(id, E.t);
  const visibles = filtrar(nodos);
  const clave = [G.ruta.join('.'), G.modo, G.vigente, [...G.ocultos].join(), [...G.abiertos].join(), visibles.map((n) => `${n.sel}:${n.estado}:${n.principal.verbo}`).join(','), G.vigente ? Math.floor(E.t) : ''].join('|');
  if (!forzar && clave === G.clave && !v.hidden) return;
  G.clave = clave;
  v.hidden = false;
  // Una vista estrecha (el móvil, o la tableta en vertical con la ficha al lado) o baja (un portátil de 640 px de alto)
  // no cabe en círculo: los rótulos se pisan y la leyenda queda fuera. Sale la lista, salvo que se haya pedido el grafo a mano.
  if (G.modo === 'grafo' && !G.modoPedido && v.clientWidth && (v.clientWidth < 480 || v.clientHeight < 420)) G.modo = 'lista';
  v.classList.toggle('vista-grafo--lista', G.modo === 'lista');
  const cuerpo = G.modo === 'lista' ? listaHtml(visibles, nodos) : lienzoHtml(id, visibles, nodos);
  // Repintar sustituye los controles: el que tenía el foco (el interruptor, Grafo/Lista, un sector) lo recupera.
  const foco = v.contains(document.activeElement) ? document.activeElement : null;
  const claveFoco = foco && ['data-grafo-vigente', 'data-grafo-modo', 'data-grafo-sector', 'data-grafo-abrir', 'data-grafo-centro', 'data-grafo-ir', 'data-grafo-miga']
    .map((a) => (foco.hasAttribute(a) ? `[${a}="${CSS.escape(foco.getAttribute(a))}"]` : '')).find(Boolean);
  v.innerHTML = `${cabeceraGrafo(nodos, visibles)}${cuerpo}
    ${leyendaHtml(visibles)}
    <div class="be-pop grafo-tarjeta" role="tooltip" id="grafo-tarjeta" hidden></div>`;
  if (claveFoco) v.querySelector(claveFoco)?.focus({ preventScroll: true });
  G.nodos = G.modo === 'lista' ? visibles : G.enLienzo || [];
  // Si el círculo y la leyenda no caben juntos (pantallas bajas), el círculo encoge lo que sobra, una vez.
  const sobra = v.scrollHeight - v.clientHeight;
  if (G.modo === 'grafo' && sobra > 1 && G.altoLienzo > 240 && !G.reajuste) {
    G.recorte = (G.recorte || 0) + sobra;
    G.reajuste = true; pintarGrafo(true); G.reajuste = false;
  }
}

function lienzoHtml(id, visibles, todos) {
  const lienzo = { w: $('#vista-grafo').clientWidth || 800, h: Math.max(240, ($('#vista-grafo').clientHeight || 600) - (leyendaAbierta() ? 210 : 180) - (G.recorte || 0)) };
  G.altoLienzo = lienzo.h;
  const cx = lienzo.w / 2, cy = lienzo.h / 2;
  const rx = Math.max(70, lienzo.w / 2 - 95), ry = Math.max(110, lienzo.h / 2 - 50);
  const aqui = id.startsWith('persona:') ? BE.lugarActual(id.slice(8), E.t) : null;
  const puestos = [];
  const burbujas = [];
  // Cada sector ocupa un arco proporcional a sus nodos, en el mismo orden siempre (G-02): lugares arriba, hechos a la
  // derecha, cartas abajo y personas a la izquierda.
  // G-07: unos doce vecinos a la vista en total; el resto de cada sector se pliega en una burbuja «+N».
  const conNodos = SECTORES.filter((s) => visibles.some((n) => n.grupo === s.grupo)).length;
  const tope = Math.max(4, Math.min(MAX_SECTOR, Math.floor((lienzo.w * lienzo.h) / 26000 / Math.max(1, conNodos))));
  const porSector = SECTORES.map((s) => {
    let ns = visibles.filter((n) => n.grupo === s.grupo);
    let resto = 0;
    if (ns.length > tope && !G.abiertos.has(s.grupo)) { resto = ns.length - (tope - 1); ns = ns.slice(0, tope - 1); }
    ns = ns.slice(0, 40);
    const total = ns.length + (resto ? 1 : 0);
    return { s, ns, resto, total, peso: total ? Math.max(total, 2) : 0 };
  });
  const W = porSector.reduce((x, y) => x + y.peso, 0) || 1;
  let ang0 = 270 - (porSector[0].peso / W) * 180;
  G.sectores = [];
  for (const x of porSector) {
    const arco = (x.peso / W) * 360;
    if (x.total) {
      G.sectores.push({ rotulo: x.s.rotulo, centro: ang0 + arco / 2 });
      const dos = x.total > 5;
      for (let i = 0; i < x.total; i++) {
        const ang = ((ang0 + (arco * (i + 0.5)) / x.total) * Math.PI) / 180;
        const k = dos ? (i % 2 ? 0.62 : 1) : 0.92;
        const p = { x: cx + Math.cos(ang) * rx * k, y: cy + Math.sin(ang) * ry * k };
        if (i < x.ns.length) puestos.push({ n: x.ns[i], ...p });
        else burbujas.push({ grupo: x.s.grupo, resto: x.resto, ...p });
      }
    }
    ang0 += arco;
  }
  const lineas = puestos.map(({ n, x, y }, i) => `<g class="${claseArista(n.principal, n.estado)}" data-arista="${i}"><line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/><line class="arista-toque" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"><title>${esc(`${n.principal.verbo} · ${n.principal.tr ? BE.textoFechaArista(n.principal) : 'sin fecha'}${n.principal.ref ? ` · ${n.principal.ref}` : ''}`)}</title></line></g>`).join('')
    + burbujas.map((b) => `<line class="arista arista--grupo" x1="${cx}" y1="${cy}" x2="${b.x}" y2="${b.y}"/>`).join('');
  const rotulos = G.sectores.map((x) => {
    const a = (x.centro * Math.PI) / 180;
    return `<span class="sector-rotulo be-caps" style="left:${cx + Math.cos(a) * (rx + 60)}px;top:${cy + Math.sin(a) * (ry + 30)}px">${x.rotulo}</span>`;
  }).join('');
  const nuevos = new Set();
  const nodosHtml = puestos.map(({ n, x, y }, i) => {
    if (!G.previos.has(n.sel)) nuevos.add(n.sel);
    const tipo = tipoDe(n.sel);
    const incierto = n.principal.incierto || (tipo === 'lugar' && BE.L[n.sel.slice(6)]?.lat == null);
    return `<button type="button" class="be-gnode gnodo gnodo--${n.estado}${G.previos.size && !G.previos.has(n.sel) && !reducido() ? ' gnodo--nuevo' : ''}${incierto ? ' gnodo--incierto' : ''}" style="left:${x}px;top:${y}px" data-gnodo="${i}" aria-describedby="grafo-tarjeta" aria-label="${esc(`${nombreDe(n.sel)}: ${metaNodo(n)}. Pulsa para ponerlo en el centro`)}">
      <span class="be-node be-node--${claseNodo(n.sel)}" aria-hidden="true">${esc(inicial(n.sel))}</span><span class="be-gnode__label">${esc(nombreDe(n.sel))}</span>${n.estado === 'ahora' || (n.estado === 'siempre' && puestos.length <= 10) ? `<span class="be-gnode__meta">${esc(metaNodo(n))}</span>` : n.estado === 'pasado' || n.estado === 'futuro' ? `<span class="be-gnode__meta">${n.estado === 'pasado' ? 'ya pasó' : 'aún no'}</span>` : ''}</button>`;
  }).join('') + burbujas.map((b) => `<button type="button" class="be-gnode gnodo gnodo--grupo" style="left:${b.x}px;top:${b.y}px" data-grafo-abrir="${b.grupo}"><span class="be-node be-node--sm burbuja" aria-hidden="true">+${b.resto}</span><span class="be-gnode__label">${b.resto} ${b.grupo.toLowerCase()} más</span></button>`).join('');
  G.previos = new Set(puestos.map((p) => p.n.sel));
  // data-gnodo es la posición en `puestos` (ordenados por sector), no en `visibles`: el clic y la tarjeta leen de aquí.
  // Leerlos de `visibles` llevaba a otro nodo (pulsar Jerusalén centraba Antioquía o Pedro).
  G.enLienzo = puestos.map((p) => p.n);
  const vacio = !puestos.length ? vacioHtml(id, todos) : '';
  return `<div class="be-graph grafo-lienzo" style="height:${lienzo.h}px">
    <svg viewBox="0 0 ${lienzo.w} ${lienzo.h}" aria-hidden="true">${lineas}</svg>${rotulos}
    <div class="be-gnode be-gnode--center gnodo-centro" style="left:${cx}px;top:${cy}px"><span class="be-node be-node--${claseNodo(id)} be-node--lg" aria-hidden="true">${esc(inicial(id))}</span><span class="be-gnode__label">${esc(nombreDe(id))}</span><span class="be-gnode__meta">${aqui ? `${aqui.parada ? 'en' : 'saliendo de'} ${esc(BE.L[aqui.id].nombre)}` : esc(fmtCursor(E.t))}</span></div>
    ${nodosHtml}${vacio}</div>`;
}
function vacioHtml(id, todos) {
  const antes = todos.filter((n) => n.estado === 'pasado').map((n) => n.principal.tr[1]).sort((a, b) => b - a)[0];
  const despues = todos.filter((n) => n.estado === 'futuro').map((n) => n.principal.tr[0]).sort((a, b) => a - b)[0];
  return `<div class="grafo-vacio be-card"><div class="be-card__pad"><p><b>En ${esc(fmtCursor(E.t))} no sabemos nada de ${esc(nombreDe(id))}.</b></p>
    <div class="fila-chips">${antes != null && Number.isFinite(antes) ? `<button type="button" class="be-chip" data-grafo-ir="${antes - 0.05}">‹ Lo anterior (${esc(fmtAnio(Math.floor(antes - 0.05)))})</button>` : ''}${despues != null && Number.isFinite(despues) ? `<button type="button" class="be-chip" data-grafo-ir="${despues + 0.01}">Lo siguiente (${esc(fmtAnio(Math.floor(despues)))}) ›</button>` : ''}${!G.vigente ? '' : '<button type="button" class="be-chip" data-grafo-vigente>Ver todas las fechas</button>'}</div></div></div>`;
}
function listaHtml(visibles, todos) {
  if (!visibles.length) return `<div class="grafo-lista">${vacioHtml(centro(), todos)}</div>`;
  G.previos = new Set(visibles.map((n) => n.sel));
  return `<div class="grafo-lista"><div class="grafo-lista__cols">${SECTORES.map((s) => {
    const ns = visibles.filter((n) => n.grupo === s.grupo);
    if (!ns.length) return '';
    return `<section class="grafo-lista__sec"><h3 class="be-card__eyebrow"><span class="sector-punto sector-punto--${s.grupo.toLowerCase()}"></span>${s.rotulo} <b class="cuenta">${ns.length}</b></h3>
      <ul>${ns.map((n) => {
        return `<li class="lista-fila lista-fila--${n.estado}"><button type="button" class="enlace-texto lista-nombre" data-grafo-centro="${esc(n.sel)}" title="Ponerlo en el centro">${esc(nombreDe(n.sel))}</button>${n.estado === 'pasado' || n.estado === 'futuro' ? `<span class="lista-cuando">${n.estado === 'pasado' ? 'ya pasó' : 'aún no'}</span>` : ''}
          ${n.aristas.slice(0, 3).map((a) => `<span class="lista-arista ${claseArista(a, a.estadoT)}"><span class="lista-que"><span class="lista-verbo">${esc(a.verbo)}</span>&nbsp;· <span class="lista-fecha">${esc(a.tr ? BE.textoFechaArista(a) : 'sin fecha')}</span>${a.deducido ? '&nbsp;· <span class="etiqueta-deducido">deducido</span>' : ''}</span> ${BE.chipsCitas(a.ref || '')}</span>`).join('')}</li>`;
      }).join('')}</ul></section>`;
  }).join('')}</div></div>`;
}

function mostrarTarjeta(i, ancla) {
  const n = G.nodos?.[i];
  const t = $('#grafo-tarjeta');
  if (!n || !t) return;
  t.innerHTML = htmlTarjeta(n);
  t.hidden = false;
  const v = $('#vista-grafo').getBoundingClientRect(), a = ancla.getBoundingClientRect();
  const w = Math.min(320, v.width - 20);
  t.style.width = `${w}px`;
  let x = a.left - v.left + a.width / 2 - 36, y = a.top - v.top - t.offsetHeight - 12;
  let abajo = false;
  if (y < 60) { y = a.bottom - v.top + 10; abajo = true; }
  x = Math.max(10, Math.min(v.width - w - 10, x));
  t.style.left = `${x}px`; t.style.top = `${y}px`;
  t.classList.toggle('be-pop--below', abajo);
  // G-17: el mapa resalta el lugar tocado, o dónde está la persona tocada.
  let ls = null;
  if (n.sel.startsWith('lugar:')) ls = [n.sel.slice(6)];
  else if (n.sel.startsWith('persona:')) { const w2 = BE.lugarActual(n.sel.slice(8), E.t); ls = w2 ? [w2.id] : [...BE.implicados(BE.parseSel(n.sel)).lugares]; }
  else { const s = BE.parseSel(n.sel); if (s) ls = [...BE.implicados(s).lugares]; }
  G.hover = true;
  BE.mapa.resaltar(ls && ls.length ? ls : null);
}
function ocultarTarjeta() {
  const t = $('#grafo-tarjeta');
  if (t) t.hidden = true;
  if (G.hover) { G.hover = null; BE.mapa.resaltar(null); }
}

/** Abre el grafo centrado en `x`: una selección («lugar:creta») o el id de una persona («pablo»). */
function abrirGrafo(x, { ruta = null, desdeHash = false } = {}) {
  const sel = aSel(x);
  if (!BE.parseSel(sel)) return;
  estudio.abrirSolo('grafo');
  G.ruta = ruta ? ruta.map(aSel).filter((y) => BE.parseSel(y)) : [sel];
  if (!G.ruta.length) G.ruta = [sel];
  if (!G.modo) G.modo = estrecha() ? 'lista' : 'grafo';
  G.previos = new Set();
  G.recorte = 0;
  G.visto = centro();
  pintarGrafo(true);
  plegarHoja();
  estudio.relleno();
  if (!desdeHash) { BE.seleccionar(BE.parseSel(centro()), { mover: !BE.E.sel, encuadrar: true }); BE.guardarHash(); }
  else estudio.trasEnlace(() => { if (abierto() && !BE.E.sel) BE.seleccionar(BE.parseSel(centro()), { mover: true, encuadrar: true }); });
  $('#vista-grafo').focus?.();
}
/** Pone `sel` en el centro. Si ya estaba en la ruta, la ruta vuelve hasta él (las migas). Con seleccionar = false es
    que la selección ya cambió fuera del grafo (búsqueda, mapa, ficha) y el grafo solo la sigue. */
function centrarEn(x, { seleccionar = true } = {}) {
  const sel = aSel(x);
  const s = BE.parseSel(sel);
  if (!s) return;
  const i = G.ruta.indexOf(sel);
  if (i >= 0) G.ruta = G.ruta.slice(0, i + 1);
  else G.ruta = [...G.ruta, sel].slice(-8);
  G.visto = sel;
  ocultarTarjeta();
  pintarGrafo(true);
  if (seleccionar) BE.seleccionar(s, { mover: false, encuadrar: true });
}
/** Con el grafo abierto, lo seleccionado en cualquier sitio pasa al centro (be-u66.1). */
function seguirSeleccion() {
  if (!abierto()) return;
  const k = BE.E.sel ? BE.selTexto(BE.E.sel) : null;
  if (!k || k === G.visto) return;
  G.visto = k;
  if (k !== centro()) centrarEn(k, { seleccionar: false });
}
function cerrarGrafo(silencioso) {
  if (!abierto()) return;
  G.ruta = []; G.clave = ''; G.leyenda = null;
  ocultarTarjeta();
  pintarGrafo(true);
  estudio.relleno();
  if (!silencioso) BE.guardarHash();
}

// ---------------------------------------------------------------------------
// Conexión entre dos (G-05, pantalla 10)
// ---------------------------------------------------------------------------
const C = { a: null, b: null, deducciones: true, lugares: false, camino: 0, caminos: [], recorrer: 0, ultima: 'b' };
const conAbierta = () => !!(C.a || C.b || C.forzada);

/** Grafo de todo: personas, lugares y cartas, con aristas que llevan verbo, tramo y referencia. */
let RED = null;
function red() {
  if (RED) return RED;
  const ady = new Map();
  const poner = (x, y, a) => {
    if (!ady.has(x)) ady.set(x, []);
    ady.get(x).push({ a: x, b: y, ...a });
  };
  for (const p of Object.values(BE.PERS)) {
    for (const a of BE.aristas(p.id)) {
      const tipo = a.sel.slice(0, a.sel.indexOf(':'));
      if (!['persona', 'lugar', 'carta'].includes(tipo)) continue;
      const x = `persona:${p.id}`;
      const arista = { verbo: a.verbo, tr: a.tr, textoFecha: a.tr ? BE.textoFechaArista(a) : 'sin fecha', ref: a.ref, fuentes: a.fuentes, razon: a.razon, deducido: !!a.deducido || a.estado === 'pendiente', lugar: tipo === 'lugar', origen: a.origen, tipoRel: a.tipoRel };
      poner(x, a.sel, arista);
      if (tipo !== 'persona') poner(a.sel, x, { ...arista, inversa: true });
    }
  }
  for (const c of BE.D.cartas || []) {
    const origenes = BE.origenesCarta ? BE.origenesCarta(c) : (c.escrita_en || []);
    for (const l of origenes) {
      if (!BE.L[l]) continue;
      const a = { verbo: origenes.length > 1 ? 'quizá escrita en' : 'escrita en', tr: BE.tramoAbierto(c.fecha), textoFecha: c.fecha?.texto || BE.fechaCorta(c.fecha), ref: c.referencia, fuentes: c.fuentes, razon: c.razon, deducido: origenes.length > 1, lugar: false, origen: 'carta' };
      poner(`carta:${c.id}`, `lugar:${l}`, a);
      poner(`lugar:${l}`, `carta:${c.id}`, { ...a, verbo: 'allí se escribió', inversa: true });
    }
  }
  RED = ady;
  return RED;
}
/** Caminos simples entre a y b de hasta 5 pasos, ordenados por solidez: pasos, deducciones y lugares compartidos. */
function caminos(a, b) {
  const ady = red();
  const vale = (x) => x === b || x.startsWith('persona:') || x.startsWith('carta:') || (C.lugares && x.startsWith('lugar:'));
  const aristaVale = (e) => C.deducciones || !e.deducido;
  // Distancias hasta b para podar.
  const dist = new Map([[b, 0]]);
  let frente = [b];
  const inversa = new Map();
  for (const [x, es] of ady) for (const e of es) { if (!inversa.has(e.b)) inversa.set(e.b, []); inversa.get(e.b).push(x); }
  while (frente.length) {
    const sig = [];
    for (const y of frente) for (const x of inversa.get(y) || []) {
      if (dist.has(x) || !(x === a || vale(x))) continue;
      if (!(ady.get(x) || []).some((e) => e.b === y && aristaVale(e))) continue;
      dist.set(x, dist.get(y) + 1); sig.push(x);
    }
    frente = sig;
  }
  if (!dist.has(a)) return [];
  const MAX = Math.min(5, dist.get(a) + 2);
  const out = [];
  const pila = [a];
  const ver = new Set([a]);
  (function dfs(x) {
    if (out.length > 300) return;
    if (x === b) { out.push([...pila]); return; }
    const vecinos = [...new Set((ady.get(x) || []).filter(aristaVale).map((e) => e.b))];
    for (const y of vecinos) {
      if (ver.has(y) || !vale(y) || !dist.has(y) || pila.length + dist.get(y) > MAX) continue;
      ver.add(y); pila.push(y); dfs(y); pila.pop(); ver.delete(y);
    }
  })(a);
  const mejorArista = (x, y) => (ady.get(x) || []).filter((e) => e.b === y && aristaVale(e)).sort((p, q) => (p.deducido ? 1 : 0) - (q.deducido ? 1 : 0) || (p.lugar ? 1 : 0) - (q.lugar ? 1 : 0) || (q.origen === 'relacion' ? 1 : 0) - (p.origen === 'relacion' ? 1 : 0) || (q.tr ? 1 : 0) - (p.tr ? 1 : 0))[0];
  const res = out.map((nodos) => {
    const pasos = nodos.slice(1).map((y, i) => ({ de: nodos[i], a: y, e: mejorArista(nodos[i], y), otras: (ady.get(nodos[i]) || []).filter((e) => e.b === y && aristaVale(e)).length - 1 }));
    const deducidos = pasos.filter((p) => p.e.deducido).length;
    const porLugar = nodos.slice(1, -1).filter((x) => x.startsWith('lugar:')).length;
    // Coincidir en un viaje o en un suceso es un hecho del texto, pero dice menos que una relación escrita.
    const coincidencias = pasos.filter((p) => p.e.origen !== 'relacion' && p.de.startsWith('persona:') && p.a.startsWith('persona:')).length;
    return { nodos, pasos, deducidos, porLugar, puntos: pasos.length + deducidos + porLugar * 2.5 + coincidencias * 0.6 };
  });
  return res.sort((p, q) => p.puntos - q.puntos || p.pasos.length - q.pasos.length);
}
function nombreCamino(c, i, todos) {
  if (c.porLugar) return `Por un lugar · ${c.pasos.length} pasos · débil`;
  const corto = Math.min(...todos.map((x) => x.pasos.length));
  const fam = c.pasos.filter((p) => p.e.tipoRel === 'pariente').length >= Math.min(2, c.pasos.length);
  const base = fam ? 'Por la familia' : c.pasos.length === corto ? 'El más corto' : `Camino ${i + 1}`;
  return `${base} · ${c.pasos.length} ${c.pasos.length === 1 ? 'paso' : 'pasos'}${c.deducidos ? ` · ${c.deducidos} deducido${c.deducidos > 1 ? 's' : ''}` : ''}`;
}
/** Un paso en palabras. «discípulo de», «apóstol de» se leen enteros («Pablo, discípulo de Gamaliel»), no
    «Pablo → Gamaliel: discípulo de». */
function textoPaso(p) {
  const e = p.e;
  const [A, B] = e.inversa ? [nombreDe(p.a), nombreDe(p.de)] : [nombreDe(p.de), nombreDe(p.a)];
  return / de$/.test(e.verbo) ? `${A}, ${e.verbo} ${B}` : `${A} → ${B}: ${e.verbo}`;
}
function fraseCamino(c) {
  return c.pasos.map((p) => `${textoPaso(p)}${p.e.tr ? ` (${p.e.textoFecha})` : ''}`).join('; ') + '.';
}
function opcionesConexion() {
  const nombres = {};
  const opciones = [];
  for (const p of Object.values(BE.PERS)) nombres[p.nombre] = (nombres[p.nombre] || 0) + 1;
  for (const p of Object.values(BE.PERS)) opciones.push({ texto: nombres[p.nombre] > 1 ? `${p.nombre} (${(p.desambiguacion || p.id).split(/[.;,(]/)[0].slice(0, 40).trim()})` : p.nombre, sel: `persona:${p.id}` });
  for (const l of Object.values(BE.L)) if (!nombres[l.nombre]) opciones.push({ texto: l.nombre, sel: `lugar:${l.id}` });
  return opciones;
}
function selDeTexto(texto) {
  const t = BE.norm(texto).trim();
  if (!t) return null;
  const o = opcionesConexion().find((x) => BE.norm(x.texto) === t);
  if (o) return o.sel;
  const vivos = opcionesConexion().filter((x) => BE.norm(x.texto).startsWith(t));
  return vivos.length === 1 ? vivos[0].sel : null;
}
const textoDeSel = (sel) => opcionesConexion().find((x) => x.sel === sel)?.texto || (sel ? nombreDe(sel) : '');

function pintarConexion() {
  const v = $('#vista-conexion');
  if (!conAbierta()) { if (!v.hidden) { v.hidden = true; v.innerHTML = ''; } return; }
  v.hidden = false;
  const listos = C.a && C.b && BE.parseSel(C.a) && BE.parseSel(C.b);
  C.caminos = listos ? caminos(C.a, C.b) : [];
  const vistos = C.caminos.slice(0, 3);
  if (C.camino >= vistos.length) C.camino = 0;
  const cam = vistos[C.camino];
  const casilla = (lado, sel) => `<input class="casilla" id="conexion-${lado}" list="conexion-opciones" value="${esc(textoDeSel(sel))}" placeholder="persona o lugar" aria-label="${lado === 'a' ? 'Primer extremo' : 'Segundo extremo'}" autocomplete="off">`;
  let cuerpo = '';
  if (!listos) cuerpo = '<p class="be-muted conexion-pista">Escribe dos nombres: una persona y otra persona o un lugar. Prueba con «Loida» y «Pablo», o «Pedro» y «Babilonia».</p>';
  else if (!cam) cuerpo = sinCaminoHtml();
  else cuerpo = caminoHtml(cam, vistos);
  v.innerHTML = `<header class="vista-cab conexion-cab">
      <div class="pregunta-fija"><span>¿Cómo se relaciona</span>${casilla('a', C.a)}<button type="button" class="be-btn be-btn--icon be-btn--sm be-btn--ghost" data-conexion-cambiar aria-label="Intercambiar los extremos" title="Intercambiar">⇄</button><span>con</span>${casilla('b', C.b)}<span>?</span></div>
      <button type="button" class="be-btn be-btn--sm be-btn--ghost vista-cerrar" data-conexion-cerrar aria-label="Cerrar la conexión">Cerrar <span aria-hidden="true">×</span></button>
    </header>
    <datalist id="conexion-opciones">${opcionesConexion().map((o) => `<option value="${esc(o.texto)}"></option>`).join('')}</datalist>
    <div class="grafo-filtros">
      <label class="interruptor"><input type="checkbox" data-conexion-opcion="deducciones" ${C.deducciones ? 'checked' : ''}> Incluir deducciones</label>
      <label class="interruptor"><input type="checkbox" data-conexion-opcion="lugares" ${C.lugares ? 'checked' : ''}> Incluir lugares compartidos</label>
      ${listos ? `<span class="be-muted">${C.caminos.length === 0 ? 'Ningún camino' : C.caminos.length === 1 ? '1 camino' : `${C.caminos.length} caminos${C.caminos.length > 3 ? ', los 3 más sólidos a la vista' : ''}`}</span>` : ''}
    </div>
    <div class="conexion-cuerpo">${cuerpo}</div>`;
}
function sinCaminoHtml() {
  const pa = BE.objetoSel(BE.parseSel(C.a)), pb = BE.objetoSel(BE.parseSel(C.b));
  let lejos = '';
  if (pa?.fecha && pb?.fecha) {
    const ta = BE.tramoAbierto(pa.fecha), tb = BE.tramoAbierto(pb.fecha);
    const hueco = Math.max(tb[0] - ta[1], ta[0] - tb[1]);
    if (Number.isFinite(hueco) && hueco > 1) lejos = `<p>${esc(pa.nombre)} y ${esc(pb.nombre)} vivieron con unos ${Math.round(hueco)} años de diferencia.</p>`;
  }
  return `<div class="be-card"><div class="be-card__pad"><p><b>No encontramos relación entre ${esc(nombreDe(C.a))} y ${esc(nombreDe(C.b))}${C.deducciones ? '' : ' en lo que dice el texto'}.</b></p>${lejos}
    <div class="fila-chips">${!C.deducciones ? '<button type="button" class="be-chip" data-conexion-activar="deducciones">Incluir deducciones</button>' : ''}${!C.lugares ? '<button type="button" class="be-chip" data-conexion-activar="lugares">Incluir lugares compartidos</button>' : ''}</div></div></div>`;
}
function caminoHtml(cam, vistos) {
  const soloDeducido = cam.pasos.every((p) => p.e.deducido);
  const pestanas = vistos.map((c, i) => `<button type="button" role="tab" class="be-tab${i === C.camino ? ' be-tab--on' : ''}${c.porLugar || c.deducidos ? ' be-tab--debil' : ''}" aria-selected="${i === C.camino}" data-conexion-camino="${i}">${esc(nombreCamino(c, i, vistos))}</button>`).join('');
  const largo = cam.nodos.length > 6;
  const cadena = cam.nodos.map((x, i) => {
    const tipo = x.slice(0, x.indexOf(':'));
    const nodo = `<button type="button" class="cadena-nodo" data-sel="${esc(x)}"><span class="be-node be-node--${NODO_TIPO[tipo] || 'evento'} be-node--lg" aria-hidden="true">${esc(inicial(x))}</span><span class="cadena-nombre">${esc(nombreDe(x))}</span></button>`;
    if (i === 0) return nodo;
    const p = cam.pasos[i - 1];
    const clase = p.e.deducido ? 'cadena-arista--deducida' : p.e.lugar || p.a.startsWith('lugar:') && i < cam.nodos.length - 1 ? 'cadena-arista--lugar' : '';
    const oculto = largo && i > 2 && i < cam.nodos.length - 2;
    return `<button type="button" class="cadena-arista ${clase}${oculto ? ' cadena--plegada' : ''}" data-conexion-paso="${i - 1}"><span class="cadena-num">${i}</span><span class="cadena-verbo">${esc(p.e.verbo)}</span><span class="cadena-fecha">${esc(p.e.textoFecha)}</span></button>${oculto ? '' : nodo}`;
  }).join('');
  const tarjetas = cam.pasos.map((p, i) => `<article class="be-card paso-tarjeta" id="paso-${i}"><div class="be-card__pad">
      <div class="be-card__eyebrow">Paso ${i + 1} · ${p.e.deducido ? '<span class="etiqueta-deducido">deducido</span>' : p.e.lugar ? '<span class="etiqueta-incierto">lugar compartido</span>' : '<span class="etiqueta-texto">lo dice el texto</span>'}</div>
      <h3 class="paso-titulo">${esc(textoPaso(p))}</h3>
      ${p.e.razon ? `<p class="be-card__body">${esc(p.e.razon)}</p>` : ''}
      <div class="fila-chips"><span class="be-chrono ${p.e.tr ? 'be-chrono--tnm' : 'be-chrono--approx'}">${esc(p.e.textoFecha)}</span>${BE.chipsCitas(p.e.ref || '')}</div>
      ${p.otras > 0 ? `<p class="be-muted">Hay ${p.otras} ${p.otras === 1 ? 'otra conexión' : 'otras conexiones'} entre los dos: están en el grafo.</p>` : ''}
    </div><div class="be-card__foot">${BE.fuentesHtml ? BE.fuentesHtml(p.e.fuentes) : ''}</div></article>`).join('');
  return `${soloDeducido ? '<div class="be-note be-note--warn">Este camino depende de una deducción: ninguna fuente lo dice de forma directa.</div>' : ''}
    <div class="be-tabs pestanas-camino" role="tablist">${pestanas}</div>
    <div class="cadena" aria-label="Camino">${cadena}${largo ? '<button type="button" class="be-chip cadena-desplegar" data-conexion-desplegar>… ver todos los pasos …</button>' : ''}</div>
    <div class="be-note en-una-frase"><b>En una frase.</b> ${esc(fraseCamino(cam))}</div>
    <div class="fila-chips acciones-camino"><button type="button" class="be-btn be-btn--sm" data-conexion-recorrer>Recorrer el camino en la línea de tiempo</button><button type="button" class="be-btn be-btn--sm be-btn--ghost" data-conexion-grafo>Abrir en el grafo</button><button type="button" class="be-btn be-btn--sm be-btn--ghost" data-conexion-copiar>Copiar enlace</button></div>
    <div class="pasos">${tarjetas}</div>`;
}
function abrirConexion(a, b, { desdeHash = false } = {}) {
  estudio.abrirSolo('conexion');
  C.a = a && BE.parseSel(a) ? a : null;
  C.b = b && BE.parseSel(b) ? b : null;
  C.forzada = true; C.camino = 0;
  RED = null;
  pintarConexion();
  plegarHoja();
  estudio.relleno();
  if (!desdeHash) BE.guardarHash();
  if (!C.b) setTimeout(() => $('#conexion-b')?.focus(), 30);
}
/** Lo elegido en la búsqueda de arriba entra en la conexión abierta (be-u66.1): en la casilla que se tocó la última
    vez, o en la vacía; por defecto, en la segunda («con…»). Solo personas, lugares y cartas tienen caminos. */
function rellenarConexion(sel) {
  if (!conAbierta() || !sel || sel === C.a || sel === C.b) return false;
  if (!['persona', 'lugar', 'carta'].includes(tipoDe(sel))) {
    BE.avisar('«¿Cómo se relaciona?» une personas, lugares y cartas: elige uno de ellos para cambiar la pregunta.');
    return false;
  }
  const lado = !C.a ? 'a' : !C.b ? 'b' : C.ultima;
  C[lado] = sel;
  C.camino = 0;
  pintarConexion();
  BE.guardarHash();
  return true;
}
function cerrarConexion(silencioso) {
  if (!conAbierta()) return;
  C.a = C.b = null; C.forzada = false; clearTimeout(C.recorrer);
  pintarConexion();
  estudio.relleno();
  if (!silencioso) BE.guardarHash();
}
function recorrerCamino() {
  const cam = C.caminos[C.camino];
  if (!cam) return;
  clearTimeout(C.recorrer);
  const pasos = cam.pasos.map((p, i) => ({ p, i })).filter(({ p }) => p.e.tr && Number.isFinite(p.e.tr[0]));
  if (!pasos.length) { BE.avisar('Ningún paso de este camino tiene fecha.'); return; }
  pasos.sort((x, y) => x.p.e.tr[0] - y.p.e.tr[0]);
  let k = 0;
  const uno = () => {
    const { p, i } = pasos[k];
    BE.setT(Math.min(BE.T_MAX, Math.max(BE.T_MIN, p.e.tr[0] + Math.min(0.5, (Math.min(p.e.tr[1], p.e.tr[0] + 1) - p.e.tr[0]) / 2))));
    BE.asegurarVisible(BE.E.t, true);
    const ls = [p.de, p.a].filter((x) => x.startsWith('lugar:')).map((x) => x.slice(6));
    for (const x of [p.de, p.a]) if (x.startsWith('persona:')) { const w = BE.lugarActual(x.slice(8), BE.E.t); if (w) ls.push(w.id); }
    BE.mapa.resaltar(ls.length ? ls : null);
    if (ls.length) BE.mapa.encuadrar(ls);
    document.querySelectorAll('.paso-tarjeta').forEach((el, j) => el.classList.toggle('paso-tarjeta--activo', j === i));
    document.getElementById(`paso-${i}`)?.scrollIntoView({ block: 'nearest', behavior: reducido() ? 'auto' : 'smooth' });
    k++;
    C.recorrer = k < pasos.length ? setTimeout(uno, 2600) : setTimeout(() => BE.mapa.resaltar(null), 2600);
  };
  uno();
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------
function iniciar() {
  const vg = $('#vista-grafo'), vc = $('#vista-conexion');
  vg.tabIndex = -1;
  vg.addEventListener('click', (e) => {
    const t = e.target;
    const miga = t.closest('[data-grafo-miga]');
    if (miga) { centrarEn(G.ruta[+miga.dataset.grafoMiga]); return; }
    const modo = t.closest('[data-grafo-modo]');
    if (modo) { G.modo = modo.dataset.grafoModo; G.modoPedido = true; pintarGrafo(true); BE.guardarHash(); return; }
    if (t.closest('[data-grafo-cerrar]')) { cerrarGrafo(); return; }
    const sector = t.closest('[data-grafo-sector]');
    if (sector) { const g = sector.dataset.grafoSector; if (G.ocultos.has(g)) G.ocultos.delete(g); else G.ocultos.add(g); pintarGrafo(true); return; }
    if (t.closest('[data-grafo-vigente]')) { G.vigente = !G.vigente; pintarGrafo(true); BE.guardarHash(); return; }
    const ab = t.closest('[data-grafo-abrir]');
    if (ab) { G.abiertos.add(ab.dataset.grafoAbrir); pintarGrafo(true); return; }
    const ir = t.closest('[data-grafo-ir]');
    if (ir) { BE.setT(+ir.dataset.grafoIr); BE.asegurarVisible(BE.E.t, true); return; }
    const cen = t.closest('[data-grafo-centro]');
    if (cen) { centrarEn(cen.dataset.grafoCentro); return; }
    const nodo = t.closest('[data-gnodo]');
    if (nodo) {
      const n = G.nodos[+nodo.dataset.gnodo];
      if (!n) return;
      if (e.shiftKey && ['persona', 'lugar', 'carta'].includes(tipoDe(centro()))) { abrirConexion(centro(), n.sel); return; }   // Mayúsculas + clic: ¿cómo se relacionan?
      centrarEn(n.sel);   // lo que se pulsa pasa al centro, sea persona, lugar o suceso
    }
  });
  const sobre = (e) => { const n = e.target.closest?.('[data-gnodo], [data-arista]'); if (n) mostrarTarjeta(+(n.dataset.gnodo ?? n.dataset.arista), n.dataset.gnodo != null ? n : vg.querySelector(`[data-gnodo="${n.dataset.arista}"]`) || n); };
  vg.addEventListener('pointerover', sobre);
  vg.addEventListener('focusin', sobre);
  vg.addEventListener('pointerout', (e) => { if (e.target.closest?.('[data-gnodo], [data-arista]') && !e.relatedTarget?.closest?.('#grafo-tarjeta')) ocultarTarjeta(); });
  vg.addEventListener('focusout', ocultarTarjeta);
  vg.addEventListener('toggle', (e) => { if (e.target.matches?.('[data-grafo-leyenda]')) G.leyenda = e.target.open; }, true);

  vc.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-conexion-cerrar]')) { cerrarConexion(); return; }
    if (t.closest('[data-conexion-cambiar]')) { [C.a, C.b] = [C.b, C.a]; C.camino = 0; pintarConexion(); BE.guardarHash(); return; }
    const cam = t.closest('[data-conexion-camino]');
    if (cam) { C.camino = +cam.dataset.conexionCamino; pintarConexion(); BE.guardarHash(); return; }
    const act = t.closest('[data-conexion-activar]');
    if (act) { C[act.dataset.conexionActivar] = true; pintarConexion(); return; }
    if (t.closest('[data-conexion-desplegar]')) { vc.querySelectorAll('.cadena--plegada').forEach((x) => x.classList.remove('cadena--plegada')); t.closest('[data-conexion-desplegar]').remove(); return; }
    const paso = t.closest('[data-conexion-paso]');
    if (paso) {
      const p = C.caminos[C.camino]?.pasos[+paso.dataset.conexionPaso];
      document.getElementById(`paso-${paso.dataset.conexionPaso}`)?.scrollIntoView({ block: 'nearest' });
      if (p?.e.tr && Number.isFinite(p.e.tr[0])) { BE.setT(p.e.tr[0] + 0.01); BE.asegurarVisible(BE.E.t, true); }
      const ls = [p.de, p.a].filter((x) => x.startsWith('lugar:')).map((x) => x.slice(6));
      if (ls.length) { BE.mapa.resaltar(ls); BE.mapa.encuadrar(ls); }
      return;
    }
    if (t.closest('[data-conexion-recorrer]')) { recorrerCamino(); return; }
    if (t.closest('[data-conexion-grafo]')) {
      const c = C.caminos[C.camino];
      const ps = (c?.nodos || []).filter((x) => BE.parseSel(x));
      if (ps.length) abrirGrafo(ps[ps.length - 1], { ruta: ps });
      return;
    }
    if (t.closest('[data-conexion-copiar]')) {
      BE.guardarHash();
      setTimeout(async () => { try { await navigator.clipboard.writeText(location.href); BE.avisar('Enlace copiado: abre esta misma conexión.'); } catch { BE.avisar('Copia la dirección de la barra del navegador.'); } }, 300);
    }
  });
  vc.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-conexion-opcion]')) { C[t.dataset.conexionOpcion] = t.checked; C.camino = 0; pintarConexion(); return; }
    if (t.matches('.casilla')) {
      const sel = selDeTexto(t.value);
      if (!sel) { if (t.value.trim()) BE.avisar(`No sé a quién te refieres con «${t.value.trim()}»: elige un nombre de la lista.`); return; }
      if (t.id === 'conexion-a') C.a = sel; else C.b = sel;
      C.camino = 0; pintarConexion(); BE.guardarHash();
      if (!C.b) $('#conexion-b')?.focus();
    }
  });
  vc.addEventListener('focusin', (e) => { if (e.target.matches?.('.casilla')) C.ultima = e.target.id === 'conexion-a' ? 'a' : 'b'; });
  vc.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('.casilla')) { e.preventDefault(); e.target.dispatchEvent(new Event('change', { bubbles: true })); } });

  // «Ver en el grafo» y «Relacionar con…» desde cualquier ficha.
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-grafo]');
    if (g) { e.preventDefault(); abrirGrafo(g.dataset.grafo); return; }
    const r = e.target.closest('[data-relacionar]');
    if (r) { e.preventDefault(); abrirConexion(r.dataset.relacionar, null); }
  });
  // Esc cierra la vista abierta cuando el foco está dentro.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (abierto() && vg.contains(document.activeElement)) { e.stopImmediatePropagation(); cerrarGrafo(); }
    else if (conAbierta() && vc.contains(document.activeElement) && !document.activeElement.matches('.casilla')) { e.stopImmediatePropagation(); cerrarConexion(); }
  }, true);
  new ResizeObserver(() => { if (abierto() && G.modo === 'grafo') pintarGrafo(true); }).observe(document.getElementById('mapa'));
}
BE.inicios.push(iniciar);
BE.pintores.push((c) => { seguirSeleccion(); if (abierto() && (c.cursor || c.panel)) pintarGrafo(false); });

estudio.vistas.grafo = { abierta: abierto, cerrar: cerrarGrafo };
estudio.vistas.conexion = { abierta: conAbierta, cerrar: cerrarConexion };

// Dirección: grafo=pablo.timoteo.lugar:listra (la ruta de saltos; el último es el centro; las personas sin tipo),
// gvista=lista, gtodo=1;
// conexion=persona:loida~persona:pablo y camino=<n>.
BE.parametros.push(
  { nombre: 'grafo', historia: true, escribir: () => (abierto() ? G.ruta.map((x) => (x.startsWith('persona:') ? x.slice(8) : x)).join('.') : null),
    leer(v) {
      const ruta = (v || '').split('.').map(aSel).filter((x) => BE.parseSel(x));
      if (ruta.length) { if (ruta.join('.') !== G.ruta.join('.')) abrirGrafo(ruta[ruta.length - 1], { ruta, desdeHash: true }); }
      else if (abierto()) cerrarGrafo(true);
    } },
  { nombre: 'gvista', escribir: () => (abierto() && G.modo === 'lista' && !estrecha() ? 'lista' : abierto() && G.modo === 'grafo' && estrecha() ? 'grafo' : null),
    leer(v) { if (v === 'lista' || v === 'grafo') { G.modo = v; G.modoPedido = true; if (abierto()) pintarGrafo(true); } } },
  { nombre: 'gtodo', escribir: () => (abierto() && !G.vigente ? '1' : null), leer(v) { G.vigente = v !== '1'; if (abierto()) pintarGrafo(true); } },
  { nombre: 'conexion', historia: true, escribir: () => (conAbierta() ? `${C.a || ''}~${C.b || ''}` : null),
    leer(v) {
      if (v) { const [a, b] = v.split('~'); if (a !== C.a || b !== C.b || !conAbierta()) abrirConexion(a, b, { desdeHash: true }); }
      else if (conAbierta()) cerrarConexion(true);
    } },
  { nombre: 'camino', escribir: () => (conAbierta() && C.camino ? String(C.camino) : null), leer(v) { C.camino = +v || 0; if (conAbierta()) pintarConexion(); } },
);

BE.grafo = { abrir: abrirGrafo, cerrar: cerrarGrafo, centrar: centrarEn, nodos: nodosDe, aristas: aristasSel, get ruta() { return [...G.ruta]; } };
BE.conexion = { abrir: abrirConexion, cerrar: cerrarConexion, caminos: (a, b) => caminos(a, b), rellenar: rellenarConexion, get extremos() { return [C.a, C.b]; } };
})();
