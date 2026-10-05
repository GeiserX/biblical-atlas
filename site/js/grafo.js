/* biblical-atlas · grafo de personas (pantalla 07, #vista-grafo) y conexión entre dos (pantalla 10, #vista-conexion).
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
/** Qué es cada tipo de nodo, para la leyenda del grafo. Cada tipo tiene su forma además de su color (be-u66.6): en el
    tema claro persona y suceso son dos verdes. */
const COLOR_TEXTO = { persona: 'persona', lugar: 'lugar', evento: 'rombo: suceso, parada o viaje', periodo: 'periodo', hallazgo: 'hallazgo', texto: 'carta o capítulo' };
/** El tipo en palabras, para quien no ve la forma: va en el nombre accesible de cada nodo. */
const PALABRA_TIPO = { persona: 'persona', lugar: 'lugar', evento: 'suceso', viaje: 'viaje', parada: 'parada', periodo: 'periodo', hallazgo: 'hallazgo', carta: 'carta', pasaje: 'capítulo', libro: 'libro', recorrido: 'recorrido' };
const tipoDe = (sel) => sel.slice(0, sel.indexOf(':'));
const claseNodo = (sel) => NODO_TIPO[tipoDe(sel)] || 'evento';
const grupoDe = (sel) => ({ persona: 'Personas', lugar: 'Lugares', carta: 'Cartas' })[tipoDe(sel)] || 'Hechos';
/** En la dirección y en los botones, una persona va por su id («pablo») y lo demás con su tipo («lugar:creta»). */
const aSel = (x) => (!x ? null : x.includes(':') ? x : `persona:${x}`);
const ORDEN_ESTADO = { ahora: 0, siempre: 1, pasado: 2, futuro: 3 };
const estrecha = () => matchMedia('(max-width: 760px)').matches;
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Cómo llegó un clic: «teclado» (Intro o espacio: sin puntero y detail 0), «raton», o «toque» (dedo o lápiz). Si el
    navegador no dice el puntero en el clic, vale el del último pointerdown en el grafo. */
const comoPulsa = (e) => (e.detail === 0 && !e.pointerType ? 'teclado' : (e.pointerType || G.puntero || 'mouse') === 'mouse' ? 'raton' : 'toque');
const nombreDe = (sel) => (sel.startsWith('parada:') && stopName(sel.slice(7))) || BE.nombreDeSel(sel);

// ---------------------------------------------------------------------------
// Events as nodes. An event (or a stop of a journey) lasts days: it is shown by its distance to the cursor, not by
// the switch «Solo lo vigente», which governs what lasts (lived in, reigns, a journey under way).
// ---------------------------------------------------------------------------
const MOMENT_TYPES = new Set(['evento', 'parada']);
const isEvent = (sel) => MOMENT_TYPES.has(tipoDe(sel));
/** How many events happening at the cursor go on the canvas, besides the nearest before and the nearest after: one,
    so entering or leaving an event changes one node. */
const NOW_MAX = 1;
/** At most this many near events on the canvas: what fits beside the other sectors of Pablo or Jerusalén at 1440 x 900.
    A sector whose far events are one or two shows them too, dimmed, if the circle has room (FAR_SHOWN). */
const EVENTS_MAX = 4;
const FAR_SHOWN = 2;
/** Besides those three, the events within this many arrow steps of the cursor (a step is a fortieth of the span of the
    timeline, base.js): one step to either side, at any scale, never takes away the event that was nearest. */
const STEPS_NEAR = 2;
let EVENT_BY_ID = null;
const eventById = (id) => (EVENT_BY_ID ??= new Map((BE.D.eventos || []).map((e) => [e.id, e]))).get(id);
const stopByKey = (key) => (BE.P || []).find((x) => x.key === key);
/** The window [a, b) of an event or a stop, as the timeline places it; null if it has no date. */
function eventWindow(sel) {
  if (sel.startsWith('evento:')) { const e = eventById(sel.slice(7)); return (e && BE.ventanaEvento?.(e)) || null; }
  const x = stopByKey(sel.slice(7));
  return x ? [x.a, Math.max(x.b, x.a + 0.05)] : null;
}
/** «del segundo viaje misional» for a journey whose name says it is one («Segundo viaje misional», «Viaje a Roma»);
    null for the rest («Arresto y custodia»). */
const journeyPhrase = (v) => (/^((primer|segundo|tercer|cuarto|quinto)\s+)?viaje\b/i.test(v?.nombre || '') ? `del ${v.nombre[0].toLowerCase()}${v.nombre.slice(1)}` : null);
const traveller = (v) => BE.nombreDueno(v);
/** «de Pablo», y «del Arca del pacto» para un grupo cuyo texto empieza por «el». */
const deWho = (who) => (/^el /.test(who) ? `del ${who.slice(3)}` : `de ${who}`);
/** A stop is named by what it is, never only by the place it hangs from: «Parada en Frigia del segundo viaje misional
    de Pablo · Hch 16:6». Around its own place the place is the centre, so the name leaves it out («Parada del segundo
    viaje misional de Pablo · Hch 16:6»). A journey whose name is not a journey's goes in brackets, and the traveller
    only when that name does not already say him: «Parada de Pablo en Cesarea (Arresto y custodia) · Hch 23:33»,
    «Parada en Damasco (De Damasco a Antioquía: los primeros años de Pablo) · Hch 9:19». */
function stopName(key) {
  const x = stopByKey(key);
  if (!x?.viaje) return '';
  const who = traveller(x.viaje), f = journeyPhrase(x.viaje), ref = x.p?.referencia ? ` · ${x.p.referencia}` : '';
  const place = x.lugar?.id && centro() !== `lugar:${x.lugar.id}` ? BE.L[x.lugar.id]?.nombre || x.lugar.nombre || '' : '';
  const at = place ? ` en ${place}` : '';
  if (f) return `Parada${at} ${f}${who ? ` ${deWho(who)}` : ''}${ref}`;
  const named = who && x.viaje.nombre.includes(who);
  return `Parada${who && !named ? ` ${deWho(who)}` : ''}${at} (${x.viaje.nombre})${ref}`;
}
/** The word of the line from a place to a stop: «parada del segundo viaje misional», or «parada de Pablo». */
const stopWord = (v) => { const f = journeyPhrase(v), who = traveller(v); return f ? `parada ${f}` : `parada${who ? ` ${deWho(who)}` : ''}`; };
/** The verb of each role of a person in an event: the words of data/vocabulary.yaml (event_roles). site/data.json does
    not carry them yet; a verb that the data gives in the role (roles[id].verb) wins over this table. */
const ROLE_VERB = { born: 'nació', died: 'murió', wrote: 'escribió', spoke: 'habló', raised: 'volvió a la vida' };
/** A person of an event with no role. `presentes` says who is placed at the event's first place, not who takes part:
    the data cannot tell one only named (Augusto at the birth of Jesús) from one who acts where the text names no
    place (Noé in the Flood), so the word claims neither presence nor absence. */
const IN_EVENT = 'en este suceso';
const roleVerb = (e, id) => { const r = e?.roles?.[id]; return (r && (r.verb || ROLE_VERB[r.role])) || ''; };
/** What a person does in an event, in a word: the verb of the role the data gives, or «en este suceso». */
const roleWord = (e, id) => roleVerb(e, id) || IN_EVENT;
/** Whether an event places the person at its first place (docs/investigacion/README.md, `present`). */
const placedBy = (e, id) => !e?.presentes || e.presentes.includes(id);
/** «3 días», «2 semanas», «5 meses», «4 años», «unos 3 siglos»: a distance in years, in words. */
function spanWords(d) {
  const days = d * 365.25;
  if (days < 1) return 'menos de un día';
  if (days < 1.5) return '1 día';
  if (days < 14) return `${Math.round(days)} días`;
  if (days < 61) { const w = Math.round(days / 7); return `${w} semanas`; }
  if (d < 1) { const m = Math.round(d * 12); return m >= 12 ? '1 año' : `${m} meses`; }
  if (d < 100) { const y = Math.round(d); return `${y} ${y === 1 ? 'año' : 'años'}`; }
  const s = Math.round(d / 100);
  return s === 1 ? 'un siglo' : `unos ${s} siglos`;
}
/** When an event is against the cursor, in words: «ocurre ahora», «3 meses antes», «2 años después». */
function whenWords(w, t) {
  if (!w) return '';
  if (t >= w[0] && t < w[1]) return 'ocurre ahora';
  return t >= w[1] ? `${spanWords(t - w[1])} antes` : `${spanWords(w[0] - t)} después`;
}
/** The events that go on the canvas: the one happening at the cursor (the narrowest, up to NOW_MAX), the nearest that
    ended before it and the nearest that starts after it, and then the closest of those within STEPS_NEAR arrow steps
    of the cursor, up to EVENTS_MAX. The ties agree: of the events that end together, the narrowest now is the latest
    to start, which is also the nearest before once they end; of those that start together, the nearest after is the
    narrowest, which is the one that becomes the now. */
function markNearest(events, t) {
  for (const n of events) { n.near = false; n.nearRank = null; }
  const dated = events.filter((n) => n.window);
  const width = (n) => n.window[1] - n.window[0];
  const dist = (n) => (n.estado === 'ahora' ? 0 : n.estado === 'pasado' ? t - n.window[1] : n.window[0] - t);
  const now = dated.filter((n) => n.estado === 'ahora').sort((a, b) => width(a) - width(b) || a.window[0] - b.window[0]).slice(0, NOW_MAX);
  const before = dated.filter((n) => n.estado === 'pasado').sort((a, b) => b.window[1] - a.window[1] || b.window[0] - a.window[0])[0];
  const after = dated.filter((n) => n.estado === 'futuro').sort((a, b) => a.window[0] - b.window[0] || a.window[1] - b.window[1])[0];
  const near = [...now, before, after].filter(Boolean);
  const v = BE.E?.vista, band = v ? (STEPS_NEAR * (v[1] - v[0])) / 40 : 0;
  const close = dated.filter((n) => !near.includes(n) && dist(n) <= band).sort((a, b) => dist(a) - dist(b) || width(a) - width(b) || a.window[0] - b.window[0]);
  // nearRank: 0 the event happening now, 1 the nearest before and after, 2 the others within the band.
  for (const n of now) n.nearRank = 0;
  for (const n of [before, after]) if (n) n.nearRank = 1;
  for (const n of [...near, ...close.slice(0, Math.max(0, EVENTS_MAX - near.length))]) { n.near = true; n.nearRank ??= 2; }
  for (const n of events) if (!n.window) { n.near = true; n.nearRank = 2; }   // an event with no date has no distance: it always shows
}
/** The event a person's edge to a place comes from: persona.js names it by its title and cites its passages. */
let EVENT_BY_TITLE = null;
function eventOfEdge(a) {
  if (!EVENT_BY_TITLE) { EVENT_BY_TITLE = new Map(); for (const e of BE.D.eventos || []) { if (!EVENT_BY_TITLE.has(e.titulo)) EVENT_BY_TITLE.set(e.titulo, []); EVENT_BY_TITLE.get(e.titulo).push(e); } }
  const es = EVENT_BY_TITLE.get(a.verbo) || [];
  return es.find((e) => (e.pasajes || []).join('; ') === a.ref) || (es.length === 1 ? es[0] : null);
}
/** The word a line between a person and a place shows on the canvas when it comes from an event or a stop, and the
    window of that event or stop: the event's title is its verb in the card, and the canvas says what it means
    («estuvo aquí», «presente», «murió», «pasa por aquí») and when it is against the cursor. Only people the event
    places there have this line (persona.js), so «presente» is what `presentes` says. */
function placeLine(a, fromPerson, personId) {
  if (a.origen === 'parada') return { word: a.verbo, eventWindow: a.tr || null };
  if (a.origen !== 'evento') return null;
  const e = eventOfEdge(a);
  if (!e) return null;
  const word = fromPerson ? 'estuvo aquí' : roleVerb(e, personId) || (placedBy(e, personId) ? 'presente' : IN_EVENT);
  return { word, eventWindow: BE.ventanaEvento?.(e) || null };
}
/** The events of each series of the account (orden_relato), in their order. */
let SERIES = null;
function seriesOf(e) {
  if (!SERIES) {
    SERIES = new Map();
    for (const x of BE.D.eventos || []) {
      const o = x.orden_relato;
      if (!o?.serie || typeof o.orden !== 'number') continue;
      if (!SERIES.has(o.serie)) SERIES.set(o.serie, []);
      SERIES.get(o.serie).push(x);
    }
    for (const xs of SERIES.values()) xs.sort((a, b) => a.orden_relato.orden - b.orden_relato.orden);
  }
  return SERIES.get(e?.orden_relato?.serie) || null;
}
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
window.addEventListener('resize', () => estudio.relleno());
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
// G.fija: a quién pertenece la tarjeta fijada (un nodo, «n3», o lo plegado de un sector, «gPersonas»); null si no hay.
// G.openFolds: los pliegues «N sucesos más» de la lista que están abiertos, por sector: repintar no los cierra.
const G = { ruta: [], vigente: true, modo: null, ocultos: new Set(), clave: '', previos: new Set(), hover: null, visto: null, fija: null, restos: {}, openFolds: new Set(), span: null };
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
  // A person's events say in a word what he does there («habló», «murió», «en este suceso»), as they do from the event.
  if (s.tipo === 'persona') {
    return BE.aristas(s.id).map((a) => {
      if (a.origen === 'evento' && a.sel?.startsWith('evento:') && eventById(a.sel.slice(7))) return { ...a, verbo: roleWord(eventById(a.sel.slice(7)), s.id) };
      const line = a.sel?.startsWith('lugar:') ? placeLine(a, true, s.id) : null;
      return line ? { ...a, ...line } : a;
    });
  }
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
  const ev = s.tipo === 'evento' ? eventById(s.id) : null;
  for (const a of inversas().get(sel) || []) {
    if (ev && a.origen === 'evento') poner({ ...a, verbo: roleWord(ev, a.sel.slice(8)) });
    else if (s.tipo === 'lugar') { const line = placeLine(a, false, a.sel.slice(8)); poner(line ? { ...a, ...line } : a); }
    else poner(a);
  }
  const o = BE.objetoSel?.(s) || {};
  const refDe = (x) => x?.referencia || (x?.pasajes || []).filter(Boolean).join('; ') || '';
  const base = { fecha: o.fecha, ref: refDe(o), fuentes: o.fuentes, razon: o.razon, estado: o.estado, origen: s.tipo };
  if (s.tipo === 'lugar') {
    const VERBO = { evento: 'ocurre aquí', periodo: 'abarca este lugar', parada: 'parada aquí', hallazgo: 'se halló aquí' };
    for (const h of BE.hechosDe?.(s.id) || []) {
      if (h.tipo === 'persona') continue;   // las personas ya llegan por sus propias aristas
      const parada = h.tipo === 'parada' && h.sel.startsWith('parada:') ? stopByKey(h.sel.slice(7)) : null;
      const verbo = h.tipo === 'carta' ? h.titulo.split(', ').pop() : parada?.viaje ? stopWord(parada.viaje) : VERBO[h.tipo] || 'pasa aquí';
      poner({ sel: h.sel, verbo, tr: h.tr || null, fecha: h.fecha, ref: (h.pasajes || []).filter(Boolean).join('; '), fuentes: h.fuentes, estado: h.estado, deducido: !!h.deducido, origen: h.tipo });
    }
  } else if (s.tipo === 'evento') {
    const tr = BE.ventanaEvento?.(o) || undefined;
    // The first place is where the main thing happens; the others the data lists without saying what they are to the
    // event (a place it passes through, or one it only names), so their word claims no more than that.
    (o.lugares || []).forEach((l, i) => { if (BE.L[l]) poner({ ...base, tr, sel: `lugar:${l}`, verbo: i ? 'se nombra' : 'ocurre aquí' }); });
    // The event before and after it in its series of the account, when the data gives the order: each with its own
    // passages and sources.
    const xs = seriesOf(o), i = xs ? xs.indexOf(o) : -1;
    if (i >= 0) {
      for (const [x, verbo] of [[xs[i - 1], 'anterior en el relato'], [xs[i + 1], 'siguiente en el relato']]) {
        if (x) poner({ sel: `evento:${x.id}`, verbo, tr: BE.ventanaEvento?.(x) || BE.tramoAbierto(x.fecha), fecha: x.fecha, ref: (x.pasajes || []).filter(Boolean).join('; '), fuentes: x.fuentes, razon: x.razon, estado: x.estado, origen: 'serie', incierto: x.fecha?.tipo === 'narrativa' || x.fecha?.tipo === 'derivada' });
      }
    }
  } else if (s.tipo === 'carta') {
    const os = BE.origenesCarta?.(o) || [], ds = BE.destinosCarta?.(o) || [];
    os.forEach((l) => poner({ ...base, sel: `lugar:${l}`, verbo: os.length > 1 ? 'quizá escrita aquí' : 'escrita aquí', deducido: os.length > 1 }));
    ds.forEach((l) => poner({ ...base, sel: `lugar:${l}`, verbo: 'enviada aquí' }));
  } else if (s.tipo === 'periodo') {
    (o.lugares || []).forEach((l) => { if (BE.L[l]) poner({ ...base, sel: `lugar:${l}`, verbo: 'su territorio' }); });
  } else if (s.tipo === 'viaje') {
    for (const x of BE.P || []) if (x.viaje === o) poner({ sel: `lugar:${x.lugar.id}`, verbo: x.b - x.a > 0.4 ? 'se queda aquí' : 'pasa por aquí', tr: [x.a, x.b], fecha: x.p.fecha, ref: x.p.referencia, fuentes: x.p.fuentes || o.fuentes, estado: x.p.estado, incierto: !!x.narrativa, origen: 'parada' });
    if (BE.duenoViaje(o) !== 'pablo') for (const p of o.paradas || []) if (BE.L[p.lugar]) poner({ ...base, sel: `lugar:${p.lugar}`, verbo: 'parada del viaje', fecha: p.fecha || o.fecha, ref: p.referencia || base.ref, fuentes: p.fuentes || o.fuentes });
  } else if (s.tipo === 'parada') {
    const x = (BE.P || []).find((y) => y.key === s.id);
    if (x) {
      const b = { tr: [x.a, x.b], fecha: x.p.fecha, ref: x.p.referencia, fuentes: x.p.fuentes || x.viaje.fuentes, estado: x.p.estado, incierto: !!x.narrativa, origen: 'parada' };
      poner({ ...b, sel: `lugar:${x.lugar.id}`, verbo: 'aquí' });
      if (BE.PERS[BE.duenoViaje(x.viaje)]) poner({ ...b, sel: `persona:${BE.duenoViaje(x.viaje)}`, verbo: 'de viaje' });
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

/** «Está aquí ahora» (o «de camino desde aquí»): el lugar donde los datos ponen a la persona `id` en t, como arista con
    la fecha, la referencia y las fuentes de la estancia de la que sale (G-06: verbo, fecha y referencia en cada arista).
    La referencia es un pasaje citable: el de la parada, el del suceso o, si la estancia sale de una relación («vivió
    en»), el que cita esa relación. Una estancia sin pasaje no da arista: sin referencia no se dibuja. */
function aquiAhora(id, t) {
  let w = null;
  try { w = BE.donde?.(id, t); } catch { w = null; }
  const s = w?.en, lugar = s?.lugar?.id;
  if (!lugar || !BE.L[lugar]) return null;
  const pasaje = (x) => (typeof x === 'string' && BE.citas(x).length ? x : '');
  const ss = s.sel ? BE.parseSel(s.sel) : null;
  const o = ss && ss.tipo !== 'persona' ? BE.objetoSel?.(ss) : null;
  // Solo la relación de la que sale la estancia (del mismo tipo: «vivió en» para una estancia «vivió en»). Otra relación
  // con el mismo lugar dice otra cosa: el pasaje de su muerte en Egipto no prueba que viviera allí noventa años.
  const rel = s.sel === `persona:${id}`
    ? BE.aristas(id).find((a) => a.sel === `lugar:${lugar}` && a.origen === 'relacion' && a.tipoRel === s.origen && pasaje(a.ref) && (!a.tr || (a.tr[0] <= s.b && s.a < a.tr[1])))
    : null;
  const ref = pasaje(s.p?.referencia) || pasaje(s.referencia) || pasaje(o?.referencia) || pasaje((o?.pasajes || []).filter(Boolean).join('; ')) || rel?.ref || '';
  if (!ref) return null;
  return { sel: `lugar:${lugar}`, grupo: 'Lugares', verbo: w.parada !== false ? 'está aquí ahora' : 'de camino desde aquí', parada: w.parada !== false,
    tr: [t - 0.01, t + 0.01], estadoT: 'ahora', fuerte: true, incierto: !!w.estimada, origen: 'donde',
    fecha: s.p?.fecha || s.fecha || o?.fecha || rel?.fecha, ref, fuentes: s.p?.fuentes || s.viaje?.fuentes || o?.fuentes || rel?.fuentes || [], razon: s.p?.razon || rel?.razon, estado: s.p?.estado || o?.estado || rel?.estado };
}
/** Nodos alrededor de una selección en el año t: las aristas agrupadas por vecino, con su estado en esa fecha. */
function nodosDe(sel, t) {
  sel = aSel(sel);
  // With an event in the centre, its people, places and journey are facts of the event, not of a date: they always show.
  const eventCentre = isEvent(sel);
  const as = aristasSel(sel).map((a) => ({ ...a, estadoT: eventCentre && !isEvent(a.sel) ? 'siempre' : BE.vigencia(a.tr, t) }));
  const aqui = sel.startsWith('persona:') ? aquiAhora(sel.slice(8), t) : null;
  if (aqui) as.push(aqui);
  const por = new Map();
  for (const a of as) {
    // Un grupo que este fichero no conoce (otro nombre, otro idioma) va al sector de su tipo: si no, no saldría en
    // ningún sitio (ni en el lienzo, ni en «+N», ni en la lista).
    if (!por.has(a.sel)) por.set(a.sel, { sel: a.sel, grupo: SECTORES.some((x) => x.grupo === a.grupo) ? a.grupo : grupoDe(a.sel), aristas: [] });
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
    // An event is placed by its own window on the timeline, the same from any centre, and says it in words.
    if (isEvent(n.sel)) {
      n.event = true;
      n.window = eventWindow(n.sel) || n.principal.tr || null;
      n.estado = n.window ? BE.vigencia(n.window, t) : 'siempre';
      n.orden = n.window ? n.window[0] : -1e9;
      n.when = whenWords(n.window, t);
    } else if (n.principal.eventWindow) {
      // A line between a person and a place that comes from an event says when that event is, as the event does: its
      // date in the data may span a year, and «murió» weeks before it happens would state what has not happened.
      n.when = whenWords(n.principal.eventWindow, t);
    }
  }
  markNearest(nodos.filter((n) => n.event), t);
  // Around an event in the centre, the events before and after it in its series are facts of the centre: they show.
  if (eventCentre) for (const n of nodos) if (n.event) n.near = true;
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
/** La primera cita de una arista, corta («Hch 8:3»). */
const refCorta = (a) => BE.citas(a.ref || '')[0]?.texto || (a.ref || '').split(';')[0];
/** Lo que dice un nodo en texto, para su nombre accesible y las filas de «+N»: lo mismo que se ve en el lienzo (la
    palabra de la línea y cuándo es frente al cursor) y la referencia. */
function metaNodo(n) {
  const a = n.principal;
  const cuando = n.when || (n.estado === 'pasado' ? 'antes' : n.estado === 'futuro' ? 'aún no' : '');
  return [a.word || a.verbo, cuando, refCorta(a)].filter(Boolean).join(' · ');
}

/** Una arista con fuentes pero sin pasaje que citar lo dice: la regla pide referencia en cada arista y el pasaje llegará
    de la cobertura (propuesta 7). */
const sinPasaje = (a) => (BE.citas(a.ref || '').length ? '' : '<span class="be-chip etiqueta-sinpasaje">sin pasaje</span>');
/** La tarjeta de un nodo. Fijada lleva `acciones`, que van justo bajo la cabecera: al final quedaban fuera de la vista,
    detrás de la razón, las citas y las fuentes de cada arista. Fijada enseña dos aristas; la de paso, cuatro. */
function htmlTarjeta(n, acciones = '') {
  const max = acciones ? 2 : 4;
  // Un suceso dice, junto a su fecha con su precisión, cuándo es frente al cursor («3 meses antes»).
  const filas = n.aristas.slice(0, max).map((a, k) => `<div class="tarjeta-arista">
    <div class="tarjeta-verbo"><b>${esc(a.word || a.verbo)}</b>${a.word && a.word !== a.verbo ? ` <span class="tarjeta-suceso">${esc(a.verbo)}</span>` : ''}${a.deducido ? ' <span class="etiqueta-deducido be-chip">deducido</span>' : ''}${a.incierto ? ' <span class="etiqueta-incierto be-chip">fecha o lugar inciertos</span>' : ''}</div>
    <div class="fila-chips"><span class="be-chrono ${a.tr ? 'be-chrono--tnm' : 'be-chrono--approx'}">${esc(a.tr ? BE.textoFechaArista(a) : 'sin fecha')}</span>${!k && n.when ? `<span class="tarjeta-cuando">${esc(n.when)}</span>` : ''}${BE.chipsCitas(a.ref || '')}${sinPasaje(a)}</div>
    ${a.razon ? `<p class="tarjeta-razon">${esc(a.razon)}</p>` : ''}
    ${(a.fuentes || []).slice(0, 2).map((f) => BE.D.fuentes?.[f]).filter(Boolean).map((f) => `<span class="be-tier be-tier--${f.nivel === 1 ? 1 : 2}" data-n="${f.nivel}">${esc(f.titulo)}</span>`).join(' ')}
  </div>`).join('');
  return `<div class="be-card__pad"><div class="be-card__eyebrow">${esc(nombreDe(centro()))} · ${esc(nombreDe(n.sel))}</div>${acciones}${filas}${n.aristas.length > max ? `<p class="be-muted">Y ${n.aristas.length - max} conexiones más en la lista.</p>` : ''}</div>`;
}

/** Lo que el interruptor oculta en esta fecha: lo que dura (vivió en, reina, un viaje) y es de otra fecha, en los
    sectores a la vista. Los sucesos no dependen de él, y lo que está en las migas nunca se oculta. */
function hiddenByDate(nodos) {
  const enRuta = new Set(G.ruta);
  return nodos.filter((n) => !n.event && !G.ocultos.has(n.grupo) && (n.estado === 'pasado' || n.estado === 'futuro') && !enRuta.has(n.sel));
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
    <nav class="be-crumbs migas-grafo" aria-label="Saltos en el grafo">${G.ruta.map((sel, i) => `${i ? '<span class="be-sep" aria-hidden="true">›</span>' : ''}<button type="button" class="miga${i === G.ruta.length - 1 ? ' miga--actual' : ''}" data-grafo-miga="${i}"${i === G.ruta.length - 1 ? ' aria-current="true"' : ` title="${esc(nombreDe(sel))}"`}><span class="be-node be-node--${claseNodo(sel)} be-node--sm" aria-hidden="true">${esc(inicial(sel))}</span><span class="miga-nombre">${esc(nombreDe(sel))}</span></button>`).join('')}</nav>
    <div class="be-seg grafo-modo" role="radiogroup" aria-label="Forma de ver las conexiones">
      <button type="button" role="radio" class="be-seg__opt${G.modoVisto === 'grafo' ? ' be-seg__opt--on' : ''}" aria-checked="${G.modoVisto === 'grafo'}" data-grafo-modo="grafo">Grafo</button>
      <button type="button" role="radio" class="be-seg__opt${G.modoVisto === 'lista' ? ' be-seg__opt--on' : ''}" aria-checked="${G.modoVisto === 'lista'}" data-grafo-modo="lista">Lista</button></div>
    <button type="button" class="be-btn be-btn--sm be-btn--ghost vista-cerrar" data-grafo-cerrar aria-label="Cerrar el grafo">Cerrar <span aria-hidden="true">×</span></button>
  </header>
  <div class="grafo-filtros" role="group" aria-label="Filtros del grafo">
    ${sectores.map((s) => `<button type="button" class="be-chip${G.ocultos.has(s.grupo) ? '' : ' be-chip--active'}" aria-pressed="${!G.ocultos.has(s.grupo)}" data-grafo-sector="${s.grupo}" title="${G.ocultos.has(s.grupo) ? 'Oculto: pulsa para enseñarlo' : 'Pulsa para ocultarlo'}"><span class="be-chip__dot sector-punto sector-punto--${s.grupo.toLowerCase()}"></span>${s.rotulo}${cuenta[s.grupo] ? ` ${cuenta[s.grupo]}` : ''}</button>`).join('')}
    ${switchHtml(nodos, cuando)}
  </div>
  <p class="sr-only">${esc(nombreDe(centro()))} en ${esc(cuando)}: ${visibles.length} conexiones.</p>`;
}

/** «Lo que dura: solo lo vigente en 50 e.c.». Lo que gobierna va en el rótulo, no solo en el «title», que el dedo no
    alcanza. Si en esta fecha no hay nada que dure y sea de otra fecha, no cambia nada: queda inerte y lo dice. */
function switchHtml(nodos, cuando) {
  const k = hiddenByDate(nodos).length;
  const inerte = !k;
  const explica = inerte ? 'En esta fecha no hay nada que dure (vivió en, reina, un viaje) de otras fechas: el interruptor no cambia nada. Los sucesos salen por su distancia a la fecha: los más cercanos en el grafo y el resto en «+N»'
    : G.vigente ? 'Encendido: de lo que dura (vivió en, reina, un viaje) solo se ve lo de esta fecha. Apágalo para ver lo de otras fechas, atenuado. Los sucesos no dependen de él: salen los más cercanos a la fecha y el resto en «+N»'
      : 'Apagado: se ve también lo que dura en otras fechas, atenuado. Los sucesos salen igual: los más cercanos a la fecha y el resto en «+N»';
  // Inerte, lo dice en su propio botón («nada que ocultar» en vez de «Sí»): una línea más de cabecera le quitaba alto
  // al círculo en el móvil.
  const nota = !inerte && G.vigente ? `${k} ${k === 1 ? 'relación' : 'relaciones'} de otras fechas ${k === 1 ? 'oculta' : 'ocultas'}` : '';
  return `<button type="button" role="switch" class="interruptor-grafo${inerte ? ' interruptor-grafo--inerte' : ''}" aria-checked="${G.vigente}"${inerte ? ' aria-disabled="true"' : ''} aria-describedby="grafo-oculto" data-grafo-vigente title="${explica}"><span class="interruptor-pista" aria-hidden="true"><span class="interruptor-bola"></span></span><span>Lo que dura: solo lo vigente en ${esc(cuando)}</span>${inerte ? '<span class="interruptor-estado">· nada que ocultar</span>' : `<span class="interruptor-estado" aria-hidden="true">${G.vigente ? 'Sí' : 'No'}</span>`}</button>
    <span class="grafo-oculto be-muted" id="grafo-oculto">${nota}</span>`;
}
/** Lo que se ve: sin los sectores ocultos (salvo con sinSectores) y, con «Solo lo vigente», sin lo de otras fechas. Los
    sucesos no dependen del interruptor: los más cercanos al cursor van al lienzo y el resto a «+N» (lienzoHtml). */
function filtrar(nodos, sinSectores = false) {
  const enRuta = new Set(G.ruta);
  return nodos.filter((n) => (sinSectores || !G.ocultos.has(n.grupo)) && (!G.vigente || n.event || n.estado === 'ahora' || n.estado === 'siempre' || enRuta.has(n.sel)));
}
/** Leyenda: qué es cada forma de nodo (solo las que hay a la vista) y cada tipo de línea.
    Empieza abierta solo si sobra sitio: abierta mide unos 120 px, que en una vista de menos de 760 de alto son los que
    el círculo necesita para no plegarlo casi todo. */
const leyendaAbierta = () => { const vg = $('#vista-grafo'); return G.leyenda ?? (vg.clientWidth >= 480 && vg.clientHeight >= 760); };
function leyendaHtml(visibles) {
  const clases = new Set([claseNodo(centro()), ...visibles.map((n) => claseNodo(n.sel))]);
  const colores = Object.entries(COLOR_TEXTO).filter(([k]) => clases.has(k))
    .map(([k, t]) => `<span><i class="be-node be-node--${k} leyenda-nodo" aria-hidden="true"></i>${t}</span>`).join('');
  // Abierta si cabe; en una vista estrecha (tableta, móvil) se pliega en «Leyenda» para no tapar la lista. Lo que
  // elija la persona se respeta hasta cerrar el grafo.
  const abierta = leyendaAbierta();
  return `<details class="grafo-leyenda" data-grafo-leyenda${abierta ? ' open' : ''}><summary>Leyenda: formas y líneas</summary>
      <div class="grafo-leyenda__filas">
      <div class="grafo-leyenda__fila"><span class="be-caps">Formas</span>${colores}</div>
      <div class="grafo-leyenda__fila"><span class="be-caps">Líneas</span><span><i class="lin lin--texto"></i>lo dice el texto</span><span><i class="lin lin--deducida"></i>deducido</span><span><i class="lin lin--incierta"></i>fecha o lugar inciertos</span><span><i class="lin lin--pasado"></i>ya pasó</span><span><i class="lin lin--futuro"></i>aún no ocurre</span></div></div></details>`;
}

const repintarGrafo = () => pintarGrafo(true);
function pintarGrafo(forzar) {
  const v = $('#vista-grafo');
  if (!abierto()) { if (!v.hidden) { v.hidden = true; v.innerHTML = ''; } return; }
  const id = centro();
  if (!BE.parseSel(id)) { cerrarGrafo(); return; }
  // Las aristas leen las relaciones y los textos del detalle (js/data-chunks.js): mientras llega, un aviso.
  if (!BE.chunks.ready(repintarGrafo)) { v.hidden = false; v.innerHTML = BE.chunks.waitingHtml('el grafo'); G.clave = ''; return; }
  const nodos = nodosDe(id, E.t);
  const visibles = filtrar(nodos);
  const oculta = v.hidden;
  v.hidden = false;
  // Una vista estrecha (el móvil, o la tableta en vertical con la ficha al lado) o baja (un portátil de 640 px de alto)
  // no cabe en círculo: los rótulos se pisan y la leyenda queda fuera. Sale la lista, salvo que se haya pedido el grafo a
  // mano. G.modo guarda lo que se prefiere y G.modoVisto lo que se dibuja: al ensancharse la vista vuelve el grafo solo.
  const apretado = !G.modoPedido && (estrecha() || (v.clientWidth && (v.clientWidth < 480 || v.clientHeight < 420)));
  G.modoVisto = G.modo === 'grafo' && apretado ? 'lista' : G.modo;
  G.span = E.vista ? E.vista[1] - E.vista[0] : null;
  // La clave dice qué hay y dónde, no las palabras de tiempo («3 días antes» cambia en cada paso del cursor): si solo
  // cambian ellas, se escriben en su sitio (refreshWords) y el lienzo no se rehace ni se vuelve a colocar.
  const clave = [G.ruta.join('.'), G.modo, G.modoVisto, G.vigente, [...G.ocultos].join(), visibles.map((n) => `${n.sel}:${n.estado}:${n.principal.verbo}${n.event ? `:${n.near ? 1 : 0}` : ''}`).join(','), G.vigente ? Math.floor(E.t) : ''].join('|');
  if (!forzar && clave === G.clave && !oculta && refreshWords(v, nodos)) return;
  G.clave = clave;
  // Repintar sustituye los controles: el que tenía el foco (un nodo, el interruptor, Grafo/Lista, un sector, una acción
  // de la tarjeta) lo recupera, y la tarjeta fijada vuelve a su nodo si sigue en el lienzo. Así un cambio de tamaño,
  // la letra que llega o el cursor que avanza no cierran lo que se está leyendo.
  const foco = v.contains(document.activeElement) ? document.activeElement : null;
  const claveFoco = foco && (['data-gnodo-sel', 'data-grafo-vigente', 'data-grafo-modo', 'data-grafo-sector', 'data-grafo-abrir', 'data-grafo-centro', 'data-grafo-relacionar', 'data-grafo-ir', 'data-grafo-miga']
    .map((a) => (foco.hasAttribute(a) ? `[${a}="${CSS.escape(foco.getAttribute(a))}"]` : '')).find(Boolean) || (foco.matches('[data-grafo-leyenda] > summary') ? '[data-grafo-leyenda] > summary' : '')
    || (foco.matches('[data-grafo-lista-mas] > summary') ? `[data-grafo-lista-mas="${CSS.escape(foco.parentElement.dataset.grafoListaMas)}"] > summary` : ''));
  const fijada = !G.fija ? null : G.fija[0] === 'n' ? { sel: G.nodos?.[+G.fija.slice(1)]?.sel } : { grupo: G.fija.slice(1) };
  if (G.fija || G.hover) { G.fija = null; G.ancla = null; G.hover = null; BE.mapa.resaltar(null); }
  const dibujar = () => {
    v.classList.toggle('vista-grafo--lista', G.modoVisto === 'lista');
    const cuerpo = G.modoVisto === 'lista' ? listaHtml(visibles, nodos) : lienzoHtml(id, visibles, nodos);
    v.innerHTML = `${cabeceraGrafo(nodos, visibles)}${cuerpo}
    ${leyendaHtml(visibles)}
    <div class="be-pop grafo-tarjeta" role="tooltip" id="grafo-tarjeta" hidden></div>`;
    if (G.modoVisto === 'lista') return true;
    ajustarLienzo(v);
    return colocarLienzo(v);
  };
  // Un sector que no cabe ni plegado en su burbuja no se pierde: esta vez sale la lista, que lo enseña todo.
  if (!dibujar()) { G.modoVisto = 'lista'; dibujar(); }
  G.nodos = G.modoVisto === 'lista' ? visibles : G.enLienzo || [];
  if (fijada && G.modoVisto === 'grafo') {
    if (fijada.sel) {
      const i = G.nodos.findIndex((n) => n.sel === fijada.sel);
      const el = i >= 0 ? v.querySelector(`[data-gnodo="${i}"]`) : null;
      if (el) fijarNodo(i, el);
    } else {
      const el = v.querySelector(`[data-grafo-abrir="${CSS.escape(fijada.grupo)}"]`);
      if (el) fijarResto(fijada.grupo, el);
    }
  }
  if (claveFoco) v.querySelector(claveFoco)?.focus({ preventScroll: true });
  // Lo que tenía el foco ya no existe (el nodo que se pulsó pasó al centro): va a la miga del centro, no al documento,
  // así Esc y Tab siguen dentro del grafo.
  if (foco && !v.contains(document.activeElement)) v.querySelector('.miga--actual')?.focus({ preventScroll: true });
}
/** Lo que dice un nodo bajo su palabra: cuándo es frente al cursor («3 meses antes»), o «ya pasó» / «aún no». */
const whenText = (n) => n.when || (n.estado === 'pasado' ? 'ya pasó' : n.estado === 'futuro' ? 'aún no' : '');
/** El nombre accesible de un nodo del lienzo: lo mismo que se ve. */
const nodeAria = (n) => `${nombreDe(n.sel)}${PALABRA_TIPO[tipoDe(n.sel)] ? `, ${PALABRA_TIPO[tipoDe(n.sel)]}` : ''}: ${metaNodo(n)}. Pulsa para ver la relación; pulsa otra vez para ponerlo en el centro`;
/** Con la misma clave (los mismos nodos en el mismo sitio), solo cambian las palabras de tiempo: se escriben en los
    nodos, en su nombre accesible, en las filas de la lista, de «+N» y en la tarjeta abierta, y los nodos del último
    pintado pasan a ser los de ahora. Devuelve false si un nodo cambia de alto o crece: entonces hay que volver a
    colocar, porque las cajas medidas ya no valen. */
function refreshWords(v, nodos) {
  const by = new Map(nodos.map((n) => [n.sel, n]));
  const fresh = (xs) => (xs || []).map((n) => by.get(n.sel) || n);
  G.enLienzo = fresh(G.enLienzo);
  G.nodos = fresh(G.nodos);
  for (const k of Object.keys(G.restos)) G.restos[k] = fresh(G.restos[k]);
  const put = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
  for (const b of v.querySelectorAll('.grafo-lienzo .gnodo[data-gnodo-sel]')) {
    const n = by.get(b.dataset.gnodoSel);
    if (!n) continue;
    put(b.querySelector('.gnodo-cuando'), whenText(n));
    const aria = nodeAria(n);
    if (b.getAttribute('aria-label') !== aria) b.setAttribute('aria-label', aria);
  }
  for (const r of v.querySelectorAll('.grafo-lista .lista-fila')) {
    const n = by.get(r.querySelector('[data-grafo-centro]')?.dataset.grafoCentro);
    if (n) put(r.querySelector('.lista-cuando'), whenText(n));
  }
  for (const r of v.querySelectorAll('#grafo-tarjeta .grafo-resto__fila')) {
    const n = by.get(r.dataset.grafoCentro);
    if (n) put(r.querySelector('.grafo-resto__meta'), metaNodo(n));
  }
  const t = $('#grafo-tarjeta'), n = t?.dataset.sel ? by.get(t.dataset.sel) : null;
  if (n) put(t.querySelector('.tarjeta-cuando'), n.when || '');
  // Una palabra más larga puede ensanchar un nodo. Si cambia de alto (su círculo se mueve), se vuelve a colocar todo; si
  // solo crece a lo ancho, se vuelve a colocar solo si ahora pisa otra caja, se sale del lienzo o una arista lo cruza.
  const lz = v.querySelector('.grafo-lienzo');
  const crecidos = [...v.querySelectorAll('.grafo-lienzo .gnodo[data-w]')].filter((b) => b.offsetHeight !== +b.dataset.h || b.offsetWidth > +b.dataset.w);
  if (!crecidos.length) return true;
  if (crecidos.some((b) => b.offsetHeight !== +b.dataset.h)) return false;
  const o = lz.getBoundingClientRect(), HOLGURA = 6, ROCE = 3;
  const caja = (el) => { const r = el.getBoundingClientRect(); return { l: r.left - o.left, t: r.top - o.top, r: r.right - o.left, b: r.bottom - o.top }; };
  const otras = [...lz.querySelectorAll('.be-gnode, .sector-rotulo')];
  const lineas = [...lz.querySelectorAll('svg line:not(.arista-toque)')].map((l) => ({ g: l.closest('[data-arista]')?.dataset.arista, x1: +l.getAttribute('x1'), y1: +l.getAttribute('y1'), x2: +l.getAttribute('x2'), y2: +l.getAttribute('y2') }));
  const cruza = (s, p) => {   // el mismo recorte de Liang y Barsky que colocarLienzo
    const l = p.l + ROCE, r = p.r - ROCE, t = p.t + ROCE, b = p.b - ROCE;
    if (l >= r || t >= b) return false;
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    let u0 = 0, u1 = 1;
    for (const [q, d] of [[-dx, s.x1 - l], [dx, r - s.x1], [-dy, s.y1 - t], [dy, b - s.y1]]) {
      if (q === 0) { if (d < 0) return false; continue; }
      const u = d / q;
      if (q < 0) { if (u > u1) return false; if (u > u0) u0 = u; } else { if (u < u0) return false; if (u < u1) u1 = u; }
    }
    return u0 < u1;
  };
  for (const b of crecidos) {
    const c = caja(b);
    if (c.l < 0 || c.t < 0 || c.r > o.width || c.b > o.height) return false;
    for (const x of otras) {
      if (x === b) continue;
      const p = caja(x);
      if (c.l < p.r + HOLGURA && c.r > p.l - HOLGURA && c.t < p.b + HOLGURA && c.b > p.t - HOLGURA) return false;
    }
    if (lineas.some((s) => s.g !== b.dataset.gnodo && cruza(s, c))) return false;
    b.dataset.w = b.offsetWidth;
  }
  return true;
}
/** El círculo toma el alto que queda entre los filtros y la leyenda, sin el relleno de abajo de la vista (en el móvil,
    el sitio de la hoja plegada): ni se mete debajo de la hoja ni deja sin usar el alto que la leyenda no necesita. */
function ajustarLienzo(v) {
  const lz = v.querySelector('.grafo-lienzo');
  if (!lz) return;
  v.scrollTop = 0;
  const fondo = v.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(v).paddingBottom) || 0);
  const ley = v.querySelector('.grafo-leyenda');
  const bajo = (ley ? ley.offsetHeight + (parseFloat(getComputedStyle(ley).marginBottom) || 0) : 0) + 8;
  // Al menos 160 px: menos no deja sitio ni para el centro y sus burbujas. Si ni así cabe, la vista se desplaza.
  lz.style.height = `${Math.max(160, Math.floor(fondo - lz.getBoundingClientRect().top - bajo))}px`;
}

/** Singular y plural de lo que se pliega en «+N» («1 persona más», «12 hechos más»). */
const PLEGADOS = { Personas: ['persona', 'personas'], Lugares: ['lugar', 'lugares'], Hechos: ['hecho', 'hechos'], Cartas: ['carta', 'cartas'], Sucesos: ['suceso', 'sucesos'] };
/** Lo plegado de Hechos se llama «sucesos» si todo lo que pliega son sucesos o paradas. */
const palabraResto = (grupo) => (grupo === 'Hechos' && (G.restos[grupo] || []).length && G.restos[grupo].every((n) => n.event) ? 'Sucesos' : grupo);
const textoResto = (grupo, n) => { const k = palabraResto(grupo); return PLEGADOS[k] ? `${n} ${PLEGADOS[k][n === 1 ? 0 : 1]} más` : `${n} más`; };
/** El rótulo de la burbuja. En un lienzo estrecho solo se ve la palabra («lugares»): el número ya va en el círculo. */
const restoHtml = (grupo, n) => { const k = palabraResto(grupo); return PLEGADOS[k] ? `<span class="resto-num">${n} </span>${PLEGADOS[k][n === 1 ? 0 : 1]}<span class="resto-mas"> más</span>` : `${n} más`; };
const fuerteAhora = (n) => n.estado === 'ahora' && !!n.principal.fuerte;
/** Lo que no se pliega mientras quepa en algún sitio: lo fuerte y vigente («está aquí ahora») y los sucesos más cercanos
    al cursor, que son los que dicen qué pasa ahora y qué pasó y pasará justo antes y después. */
const retenido = (n) => fuerteAhora(n) || (!!n.event && !!n.near);
/** Lo que puede salir de su arco antes que plegarse: lo fuerte y vigente y el suceso que ocurre ahora. Los demás sucesos
    cercanos se pliegan en su «+N» antes que meterse entre los nodos de otro sector. */
const anyAngle = (n) => fuerteAhora(n) || (!!n.event && n.near && n.nearRank === 0);
/** En qué orden toman sitio los de un sector, lo más importante primero: lo fuerte y vigente, el suceso de ahora, lo
    que dura y es vigente en Hechos (el viaje en curso, el periodo que rige), los demás sucesos cercanos del más próximo
    al cursor al más lejano (en un lienzo estrecho, un suceso de hace ocho días va antes que uno de dentro de tres años),
    el resto, y al final los sucesos lejanos que se enseñan atenuados. */
const placeOrder = (n) => (fuerteAhora(n) ? 0 : n.event && n.near ? (n.nearRank === 0 ? 1 : 3) : n.event ? 6 : n.grupo === 'Hechos' && n.estado === 'ahora' ? 2 : 5);
/** La distancia de un suceso al cursor, en años: 0 si ocurre ahora o no tiene fecha. */
const distance = (n) => (!n.event || !n.window || n.estado === 'ahora' ? 0 : n.estado === 'pasado' ? E.t - n.window[1] : n.window[0] - E.t);
/** Los sucesos de un sector que no son cercanos: si son uno o dos, se enseñan atenuados en el lienzo y la lista si caben
    (FAR_SHOWN); si son más, van plegados en «+N». */
function splitFar(todos) {
  const lejos = todos.filter((n) => n.event && !n.near).sort((a, b) => a.orden - b.orden);
  const pocos = lejos.length <= FAR_SHOWN;
  return { ns: todos.filter((n) => !n.event || n.near || pocos).sort((a, b) => placeOrder(a) - placeOrder(b) || distance(a) - distance(b)), lejos: pocos ? [] : lejos };
}
/** Lo plegado, en grupos: lo que ocurre ahora, lo que no tiene fecha, lo de antes y lo de después, cada grupo del más
    cercano al cursor al más lejano. Así lo que pasa en la fecha va primero y no en medio de una lista por fechas. */
function foldGroups(ns) {
  const tramo = (n) => n.window || n.principal.tr;
  const g = [
    ['Ahora', ns.filter((n) => n.estado === 'ahora')],
    ['Sin fecha', ns.filter((n) => n.estado === 'siempre' || ((n.estado === 'pasado' || n.estado === 'futuro') && !tramo(n)))],
    ['Antes', ns.filter((n) => n.estado === 'pasado' && tramo(n)).sort((a, b) => tramo(b)[1] - tramo(a)[1] || tramo(b)[0] - tramo(a)[0])],
    ['Después', ns.filter((n) => n.estado === 'futuro' && tramo(n)).sort((a, b) => tramo(a)[0] - tramo(b)[0] || tramo(a)[1] - tramo(b)[1])],
  ];
  return g.filter(([, xs]) => xs.length);
}
/** Las filas de lo plegado, con el título de cada grupo si hay más de uno. */
function foldGroupsHtml(ns, fila, cls) {
  const gs = foldGroups(ns);
  if (gs.length === 1) return `<ul class="${cls}">${gs[0][1].map(fila).join('')}</ul>`;
  return gs.map(([t, xs]) => `<p class="resto-grupo be-caps">${t} · ${xs.length}</p><ul class="${cls}">${xs.map(fila).join('')}</ul>`).join('');
}
/** La línea meta (verbo · referencia) va en el centro y en los nodos de arista fuerte (propuesta 11), y la palabra de la
    línea en todo lo que toca un suceso: los sucesos y paradas, lo que rodea a un suceso en el centro y lo que une una
    persona y un lugar por un suceso. Lo de otras fechas lleva su palabra («ya pasó», «aún no», «3 meses antes»): es lo
    que lo distingue sin depender del color. */
function metaHtml(n) {
  // Un suceso dice qué es la línea y cuándo es frente al cursor, en dos líneas: «ocurre aquí» / «3 meses antes».
  if (n.event) return `<span class="be-gnode__meta"><span class="gnodo-verbo">${esc(n.principal.verbo)}</span>${n.when ? `<span class="gnodo-cuando">${esc(n.when)}</span>` : ''}</span>`;
  if (fuerteAhora(n)) {
    // Verbo y referencia por separado: en un lienzo estrecho la referencia baja a su propia línea en vez de cortarse.
    const ref = refCorta(n.principal);
    return `<span class="be-gnode__meta">${esc(n.principal.verbo)}${ref ? `<span class="gnodo-ref"><span class="gnodo-sep"> · </span>${esc(ref)}</span>` : ''}</span>`;
  }
  const otra = n.estado === 'pasado' ? 'ya pasó' : n.estado === 'futuro' ? 'aún no' : '';
  // Con un suceso en el centro, o si la línea sale de un suceso o de una parada, dice en una palabra qué es
  // («presente», «habló», «estuvo aquí», «pasa por aquí»); debajo, cuándo es ese suceso frente al cursor, o si es de
  // otra fecha.
  const cuando = n.when || otra;
  if (isEvent(centro()) || n.principal.word) return `<span class="be-gnode__meta"><span class="gnodo-verbo">${esc(n.principal.word || n.principal.verbo)}</span>${cuando ? `<span class="gnodo-cuando">${esc(cuando)}</span>` : ''}</span>`;
  if (otra) return `<span class="be-gnode__meta">${otra}</span>`;
  return '';
}
/** El lienzo sin colocar: el centro, los rótulos de sector, hasta MAX_SECTOR candidatos por sector y una burbuja «+N»
    por sector. colocarLienzo mide sus cajas y decide qué cabe; lo que no, se pliega en la burbuja. */
function lienzoHtml(id, visibles, todos) {
  const vg = $('#vista-grafo'), cs = getComputedStyle(vg);
  // Sin el relleno de abajo: en el móvil es el sitio de la hoja plegada, y lo que cayera ahí quedaría tapado.
  const util = (vg.clientHeight || 600) - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
  const alto = Math.max(240, util - (leyendaAbierta() ? 210 : 180));   // una primera cuenta: ajustarLienzo la mide
  // Lo mismo que la arista «está aquí ahora»: sin pasaje que lo diga, el centro tampoco dice dónde está.
  const aqui = id.startsWith('persona:') ? aquiAhora(id.slice(8), E.t) : null;
  G.enLienzo = [];
  G.restos = {};
  // El ancho de un suceso: su título entero en varias líneas, más estrecho cuanto más estrecho es el lienzo.
  const anchoSuceso = Math.round(Math.max(120, Math.min(230, (vg.clientWidth || 800) * 0.22)));
  let nodosHtml = '', burbujas = '', rotulos = '';
  const nuevos = G.previos.size > 0 && !reducido();
  for (const s of SECTORES) {
    // Lo fuerte y vigente («está aquí ahora») va primero en su sector y luego los sucesos cercanos: no deben plegarse.
    const todos = visibles.filter((n) => n.grupo === s.grupo);
    if (!todos.length) continue;
    // Los sucesos lejanos del cursor van directos a «+N»; los cercanos, al lienzo como los demás (splitFar).
    const { ns, lejos } = splitFar(todos);
    rotulos += `<span class="sector-rotulo be-caps" data-sector="${s.grupo}">${s.rotulo}</span>`;
    G.restos[s.grupo] = [...ns.slice(MAX_SECTOR), ...lejos];
    for (const n of ns.slice(0, MAX_SECTOR)) {
      const i = G.enLienzo.push(n) - 1;
      const tipo = tipoDe(n.sel);
      const incierto = n.principal.incierto || (tipo === 'lugar' && BE.L[n.sel.slice(6)]?.lat == null);
      nodosHtml += `<button type="button" class="be-gnode gnodo gnodo--${n.estado}${n.event ? ' gnodo--suceso' : ''}${n.event && !n.near ? ' gnodo--lejos' : ''}${nuevos && !G.previos.has(n.sel) ? ' gnodo--nuevo' : ''}${incierto ? ' gnodo--incierto' : ''}" data-gnodo="${i}" data-gnodo-sel="${esc(n.sel)}" data-sector="${s.grupo}" aria-expanded="false" aria-describedby="grafo-tarjeta" aria-label="${esc(nodeAria(n))}">
      <span class="be-node be-node--${claseNodo(n.sel)}" aria-hidden="true">${esc(inicial(n.sel))}</span><span class="be-gnode__label">${esc(nombreDe(n.sel))}</span>${metaHtml(n)}</button>`;
    }
    // Se mide con el número más alto posible: al colocarla solo puede encoger.
    burbujas += `<button type="button" class="be-gnode gnodo gnodo--grupo" data-grafo-abrir="${s.grupo}" data-sector="${s.grupo}" aria-expanded="false"><span class="be-node be-node--sm burbuja" aria-hidden="true">+${todos.length}</span><span class="be-gnode__label">${restoHtml(s.grupo, todos.length)}</span></button>`;
  }
  const vacio = !visibles.length ? vacioHtml(id, todos) : '';
  return `<div class="be-graph grafo-lienzo" style="height:${alto}px;--ancho-suceso:${anchoSuceso}px">
    <svg aria-hidden="true"></svg>${rotulos}
    <div class="be-gnode be-gnode--center gnodo-centro${isEvent(id) ? ' gnodo-centro--suceso' : ''}"><span class="be-node be-node--${claseNodo(id)} be-node--lg" aria-hidden="true">${esc(inicial(id))}</span><span class="be-gnode__label">${esc(nombreDe(id))}</span><span class="be-gnode__meta">${aqui ? `${aqui.parada ? 'en' : 'saliendo de'} ${esc(nombreDe(aqui.sel))}` : esc(fmtCursor(E.t))}</span></div>
    ${nodosHtml}${burbujas}${vacio}</div>`;
}
/** Coloca el radial sin solapes (propuesta 11). Una pasada mide la caja de cada nodo (círculo, nombre y meta) y los
    reparte por sectores (G-02: lugares arriba, hechos a la derecha, cartas abajo, personas a la izquierda) en anillos
    concéntricos: cada nodo toma el hueco libre más cercano a su ángulo, por turnos entre sectores y por orden de
    importancia. Un hueco es libre si su caja no pisa otra y si su arista no cruza otra caja ni otra arista la cruza a
    ella. Lo que no cabe se pliega en la burbuja «+N» de su sector, que abre el resto; un sector nunca se pierde: si ni su
    burbuja cabe, devuelve false y se dibuja la lista. */
function colocarLienzo(v) {
  const lz = v.querySelector('.grafo-lienzo');
  if (!lz) return true;
  const W = lz.clientWidth, H = lz.clientHeight, cx = W / 2, cy = H / 2;
  const HOLGURA = 6, BORDE = 4, ROCE = 3;   // ROCE: lo que una arista puede rozar el borde de una caja sin cruzarla
  const puestas = [], lineas = [];
  // Las medidas, una vez y antes de mover nada: leerlas entre movimientos obligaría a recalcular la página cada vez.
  // dy: del centro de la caja al centro de su círculo, donde acaba la arista.
  const medida = (el) => { const c = el.querySelector('.be-node'); return { w: el.offsetWidth, h: el.offsetHeight, dy: c ? c.offsetTop + c.offsetHeight / 2 - el.offsetHeight / 2 : 0 }; };
  const tam = new Map([...lz.querySelectorAll('.be-gnode, .sector-rotulo')].map((el) => [el, medida(el)]));
  const caja = (x, y, el) => { const m = tam.get(el); return { l: x - m.w / 2, t: y - m.h / 2, r: x + m.w / 2, b: y + m.h / 2 }; };
  const choca = (c, p) => c.l < p.r + HOLGURA && c.r > p.l - HOLGURA && c.t < p.b + HOLGURA && c.b > p.t - HOLGURA;
  /** ¿El segmento s entra en la caja p (encogida en ROCE)? Recorte de Liang y Barsky. */
  const cruza = (s, p) => {
    const l = p.l + ROCE, r = p.r - ROCE, t = p.t + ROCE, b = p.b - ROCE;
    if (l >= r || t >= b) return false;
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    let u0 = 0, u1 = 1;
    for (const [q, d] of [[-dx, s.x1 - l], [dx, r - s.x1], [-dy, s.y1 - t], [dy, b - s.y1]]) {
      if (q === 0) { if (d < 0) return false; continue; }
      const u = d / q;
      if (q < 0) { if (u > u1) return false; if (u > u0) u0 = u; } else { if (u < u0) return false; if (u < u1) u1 = u; }
    }
    return u0 < u1;
  };
  const libre = (c, s) => c.l >= BORDE && c.t >= BORDE && c.r <= W - BORDE && c.b <= H - BORDE
    && !puestas.some((p) => choca(c, p))
    && (!s || !puestas.some((p) => !p.centro && cruza(s, p)))
    && !lineas.some((x) => cruza(x, c));
  const poner = (el, x, y) => { el.style.left = `${x}px`; el.style.top = `${y}px`; el.hidden = false; };
  const cen = lz.querySelector('.gnodo-centro');
  poner(cen, cx, cy);
  puestas.push({ ...caja(cx, cy, cen), centro: true });   // las aristas salen de él: no cuenta como cruce
  const origen = { x: cx, y: cy + tam.get(cen).dy };
  const linea = (el, x, y) => ({ x1: origen.x, y1: origen.y, x2: x, y2: y + tam.get(el).dy });
  const tomar = (h) => { poner(h.el, h.px, h.py); puestas.push(h.c); lineas.push(h.s); return h; };
  const soltar = (h) => { puestas.splice(puestas.indexOf(h.c), 1); lineas.splice(lineas.indexOf(h.s), 1); };

  // Arcos: cada sector con nodos ocupa un arco proporcional a lo que tiene, empezando por Lugares centrado arriba.
  const porSector = SECTORES.map((s) => {
    const els = [...lz.querySelectorAll(`[data-gnodo][data-sector="${s.grupo}"]`)];
    // Un suceso cuenta doble: su título entero en varias líneas ocupa lo que dos nombres, y con un arco del tamaño de un
    // nombre salía del suyo a meterse entre los de otro sector.
    const cuenta = els.reduce((k, el) => k + (el.classList.contains('gnodo--suceso') ? 2 : 1), 0);
    const peso = els.length || G.restos[s.grupo]?.length ? Math.max(2, cuenta + (G.restos[s.grupo]?.length ? 1 : 0)) : 0;
    return { s, els, peso, puestos: [], burbuja: lz.querySelector(`[data-grafo-abrir="${s.grupo}"]`) };
  });
  const total = porSector.reduce((x, y) => x + y.peso, 0) || 1;
  let ang0 = 270 - (porSector[0].peso / total) * 180;
  for (const x of porSector) { x.a0 = ang0; x.arco = (x.peso / total) * 360; ang0 += x.arco; }
  const rad = (g) => (g * Math.PI) / 180;
  const anguloDe = (x, px, py) => { let g = (Math.atan2(py - cy, px - cx) * 180) / Math.PI; while (g < x.a0) g += 360; while (g >= x.a0 + 360) g -= 360; return g; };

  // El hueco libre más cercano al ángulo ideal. Cada ángulo es un rayo desde el centro hasta el borde del lienzo (así
  // las esquinas también cuentan) y se prueba de fuera hacia dentro, en anillos.
  const ANILLOS = [1, 0.86, 0.72, 0.58, 0.45];
  const hueco = (el, x, ideal, cualquierAngulo) => {
    const mx = W / 2 - tam.get(el).w / 2 - BORDE, my = H / 2 - tam.get(el).h / 2 - BORDE;
    const a0 = cualquierAngulo ? ideal - 180 : x.a0, a1 = cualquierAngulo ? ideal + 180 : x.a0 + x.arco;
    const paso = Math.max(1, (a1 - a0) / 90);
    let mejor = null;
    ANILLOS.forEach((f, k) => {
      for (let g = a0 + paso / 2; g < a1; g += paso) {
        const coste = Math.abs(g - ideal) / Math.max(30, x.arco) + k * 0.3;
        if (mejor && coste >= mejor.coste) continue;
        const co = Math.cos(rad(g)), si = Math.sin(rad(g));
        const largo = Math.min(Math.abs(co) > 1e-6 ? mx / Math.abs(co) : Infinity, Math.abs(si) > 1e-6 ? my / Math.abs(si) : Infinity) * f;
        const px = cx + co * largo, py = cy + si * largo;
        const c = caja(px, py, el), s = linea(el, px, py);
        if (libre(c, s)) mejor = { coste, px, py, c, s, el };
      }
    });
    return mejor;
  };
  const colocar = (el, x, ideal, cualquierAngulo = false) => { const h = hueco(el, x, ideal, cualquierAngulo); return h ? tomar(h) : null; };
  // Por turnos: el primero de cada sector, luego el segundo… Así un sector con muchos no deja sin sitio a los demás.
  const vueltas = Math.max(0, ...porSector.map((x) => x.els.length));
  const aplazados = [];
  for (let k = 0; k < vueltas; k++) {
    for (const x of porSector) {
      const el = x.els[k];
      if (!el) continue;
      const ideal = x.a0 + (x.arco * (k + 0.5)) / (x.els.length + (G.restos[x.s.grupo]?.length ? 1 : 0));
      let h = colocar(el, x, ideal);
      // Lo fuerte y vigente («está aquí ahora») y el suceso de ahora no se pliegan mientras quepan en algún sitio.
      if (!h && anyAngle(G.enLienzo[+el.dataset.gnodo])) h = colocar(el, x, ideal, true);
      if (h) { x.puestos.push(h); continue; }
      // El primero que no cabe aparta ya el sitio de la burbuja, en su propio arco, antes de que los demás sectores
      // llenen el lienzo.
      if (x.burbuja && !x.reservada) x.reservada = colocar(x.burbuja, x, x.a0 + x.arco - 4);
      // El primer nodo de un sector es todo lo que el sector enseña: si ni él ni su burbuja caben en el arco, cualquier
      // ángulo vale antes que perderlo.
      if (k === 0 && !x.reservada) {
        h = colocar(el, x, ideal, true);
        if (h) { x.puestos.push(h); continue; }
        if (x.burbuja) x.reservada = colocar(x.burbuja, x, ideal, true);
      }
      if (retenido(G.enLienzo[+el.dataset.gnodo])) aplazados.push({ el, x, ideal });
    }
  }
  // Los sucesos cercanos que no cupieron en su arco toman, al final, el sitio que haya quedado libre en cualquier parte:
  // nunca antes que los nodos de los demás sectores, que ya tienen el suyo.
  for (const { el, x, ideal } of aplazados) { const h = colocar(el, x, ideal, true); if (h) x.puestos.push(h); }
  // Lo que no cupo se pliega en la burbuja de su sector.
  let perdido = false;
  for (const x of porSector) {
    const b = x.burbuja;
    if (!b) continue;
    const g = x.s.grupo, extra = G.restos[g] || [];
    let fuera = x.els.filter((el) => !x.puestos.some((p) => p.el === el));
    let sitio = x.reservada || null;
    // Si lo plegado es un solo nodo, va el nodo y no la burbuja: ocupan casi lo mismo y así no hay que abrir nada.
    if (fuera.length === 1 && !extra.length) {
      if (sitio) soltar(sitio);
      const h = colocar(fuera[0], x, sitio ? anguloDe(x, sitio.px, sitio.py) : x.a0 + x.arco / 2) || colocar(fuera[0], x, x.a0 + x.arco / 2, true);
      if (h) { x.puestos.push(h); fuera = []; sitio = null; } else if (sitio) tomar(sitio);
    }
    if (!fuera.length && !extra.length) { b.remove(); continue; }
    // Sin sitio todavía, la burbuja lo busca en su arco, primero con su rótulo y luego solo con su círculo «+N» (sin
    // rótulo lo dice su nombre accesible): un nodo a la vista vale más que la palabra. Si ni así, le ceden el suyo los
    // últimos nodos del sector, salvo lo fuerte y vigente («está aquí ahora») y los sucesos cercanos, y solo si así cabe (si no, vuelven a su
    // sitio); luego cualquier ángulo; y como último recurso cede también el fuerte: mejor plegado en su «+N» que perder
    // el grafo entero.
    const compacta = (si) => { b.classList.toggle('gnodo--compacto', si); tam.set(b, medida(b)); };
    const cedidos = [];
    const ceder = (tambienFuerte) => {
      const cedible = () => { for (let j = x.puestos.length - 1; j >= 0; j--) if (tambienFuerte || !retenido(G.enLienzo[+x.puestos[j].el.dataset.gnodo])) return j; return -1; };
      for (let j = cedible(); !sitio && j >= 0; j = cedible()) {
        const [u] = x.puestos.splice(j, 1);
        soltar(u);
        cedidos.push(u);
        sitio = colocar(b, x, anguloDe(x, u.px, u.py));
      }
      if (!sitio) { for (const u of cedidos.reverse()) x.puestos.push(tomar(u)); cedidos.length = 0; }
    };
    if (!sitio) sitio = colocar(b, x, x.a0 + x.arco - 4);
    if (!sitio) { compacta(true); sitio = colocar(b, x, x.a0 + x.arco - 4); if (!sitio) compacta(false); }
    if (!sitio) ceder(false);
    if (!sitio) sitio = colocar(b, x, x.a0 + x.arco / 2, true);
    if (!sitio) { compacta(true); sitio = colocar(b, x, x.a0 + x.arco - 4) || colocar(b, x, x.a0 + x.arco / 2, true); }
    if (!sitio) ceder(true);
    if (!sitio) { perdido = true; continue; }
    const plegados = [...fuera, ...cedidos.map((u) => u.el)].sort((p, q) => +p.dataset.gnodo - +q.dataset.gnodo);
    for (const el of plegados) el.remove();
    G.restos[g] = [...plegados.map((el) => G.enLienzo[+el.dataset.gnodo]), ...extra];
    const n = G.restos[g].length;
    b.querySelector('.burbuja').textContent = `+${n}`;
    b.querySelector('.be-gnode__label').innerHTML = restoHtml(g, n);
    b.setAttribute('aria-label', `${textoResto(g, n)}: pulsa para ver la lista`);
    // Se midió con el número más alto posible; con el de verdad solo encoge, en su sitio.
    soltar(sitio);
    tam.set(b, medida(b));
    x.puestos.push({ ...tomar({ ...sitio, c: caja(sitio.px, sitio.py, b), s: linea(b, sitio.px, sitio.py) }), grupo: true });
  }
  for (const x of porSector) for (const el of x.els) if (!x.puestos.some((p) => p.el === el)) el.remove();
  // Rótulos de sector, lo último: en el sitio que dejan nodos y burbujas, cerca del borde y del centro de su arco.
  const ponerRotulo = (x, r, ks, fMin) => {
    for (const k of ks) {
      const a = rad(x.a0 + x.arco * k);
      for (let f = 1; f > fMin; f -= 0.05) {
        const px = cx + Math.cos(a) * (W / 2 - tam.get(r).w / 2 - BORDE) * f, py = cy + Math.sin(a) * (H / 2 - tam.get(r).h / 2 - BORDE) * f;
        const c = caja(px, py, r);
        if (libre(c, null)) { poner(r, px, py); puestas.push(c); return true; }
      }
    }
    return false;
  };
  const K = [0.5, 0.35, 0.65, 0.2, 0.8], K_MAS = [0.42, 0.58, 0.27, 0.73, 0.1, 0.9, 0.05, 0.95];
  for (const x of porSector) {
    const r = lz.querySelector(`.sector-rotulo[data-sector="${x.s.grupo}"]`);
    if (!r) continue;
    let puesto = ponerRotulo(x, r, K, 0.3);
    // Un sector con nodos a la vista conserva su rótulo: sin él, un suceso entre personas no se sabe de qué grupo es. Se
    // busca en todo su arco y, si ni así, el último nodo que se puede ceder de su sector pasa a su «+N» y deja su sitio.
    const nodos = () => x.puestos.filter((q) => !q.grupo);
    if (!puesto && nodos().length) puesto = ponerRotulo(x, r, [...K, ...K_MAS], 0.2);
    const b = x.puestos.find((q) => q.grupo);
    for (let intento = 0; !puesto && b && intento < 2; intento++) {
      const j = x.puestos.map((q, i) => (!q.grupo && !retenido(G.enLienzo[+q.el.dataset.gnodo]) ? i : -1)).filter((i) => i >= 0).pop();
      if (j == null || nodos().length < 2) break;
      const [u] = x.puestos.splice(j, 1);
      soltar(u);
      u.el.remove();
      const g = x.s.grupo;
      G.restos[g] = [G.enLienzo[+u.el.dataset.gnodo], ...(G.restos[g] || [])];
      const n = G.restos[g].length;
      b.el.querySelector('.burbuja').textContent = `+${n}`;
      b.el.querySelector('.be-gnode__label').innerHTML = restoHtml(g, n);
      b.el.setAttribute('aria-label', `${textoResto(g, n)}: pulsa para ver la lista`);
      const k0 = (anguloDe(x, u.px, u.py) - x.a0) / (x.arco || 1);
      puesto = ponerRotulo(x, r, [k0, ...K, ...K_MAS], 0.2);
    }
    // Sin sitio aún, el sector se reconoce por la forma de sus nodos y por su filtro de arriba.
    if (!puesto) r.remove();
  }
  // Las aristas, del círculo del centro al círculo de cada nodo, ya en su sitio.
  const svg = lz.querySelector('svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = porSector.flatMap((x) => x.puestos).map((p) => {
    const { x1, y1, x2, y2 } = p.s;
    if (p.grupo) return `<line class="arista arista--grupo" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    const i = +p.el.dataset.gnodo, n = G.enLienzo[i];
    return `<g class="${claseArista(n.principal, n.estado)}" data-arista="${i}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><line class="arista-toque" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><title>${esc(`${n.principal.verbo} · ${n.principal.tr ? BE.textoFechaArista(n.principal) : 'sin fecha'}${n.principal.ref ? ` · ${n.principal.ref}` : ''}`)}</title></line></g>`;
  }).join('');
  G.previos = new Set(porSector.flatMap((x) => x.puestos).filter((p) => !p.grupo).map((p) => G.enLienzo[+p.el.dataset.gnodo].sel));
  // Su caja ya en su sitio: refreshWords la compara para saber si una palabra nueva obliga a colocar otra vez.
  for (const b of lz.querySelectorAll('.gnodo[data-gnodo-sel]')) { b.dataset.w = b.offsetWidth; b.dataset.h = b.offsetHeight; }
  return !perdido;
}
function vacioHtml(id, todos) {
  const tramo = (n) => n.window || n.principal.tr;
  const antes = todos.filter((n) => n.estado === 'pasado' && tramo(n)).map((n) => tramo(n)[1]).sort((a, b) => b - a)[0];
  const despues = todos.filter((n) => n.estado === 'futuro' && tramo(n)).map((n) => tramo(n)[0]).sort((a, b) => a - b)[0];
  return `<div class="grafo-vacio be-card"><div class="be-card__pad"><p><b>En ${esc(fmtCursor(E.t))} no sabemos nada de ${esc(nombreDe(id))}.</b></p>
    <div class="fila-chips">${antes != null && Number.isFinite(antes) ? `<button type="button" class="be-chip" data-grafo-ir="${antes - 0.05}">‹ Lo anterior (${esc(fmtAnio(Math.floor(antes - 0.05)))})</button>` : ''}${despues != null && Number.isFinite(despues) ? `<button type="button" class="be-chip" data-grafo-ir="${despues + 0.01}">Lo siguiente (${esc(fmtAnio(Math.floor(despues)))}) ›</button>` : ''}${!G.vigente ? '' : '<button type="button" class="be-chip" data-grafo-vigente>Ver todas las fechas</button>'}</div></div></div>`;
}
function listaHtml(visibles, todos) {
  if (!visibles.length) return `<div class="grafo-lista">${vacioHtml(centro(), todos)}</div>`;
  G.previos = new Set(visibles.map((n) => n.sel));
  return `<div class="grafo-lista"><div class="grafo-lista__cols">${SECTORES.map((s) => {
    const todos = visibles.filter((n) => n.grupo === s.grupo);
    if (!todos.length) return '';
    // Lo mismo que el lienzo: los sucesos cercanos al cursor a la vista, con su «ocurre ahora» o «3 meses antes», y el
    // resto plegado en «N sucesos más», lo de ahora primero y cada grupo del más cercano al más lejano.
    const { ns, lejos } = splitFar(todos);
    const fila = (n) => {
      const cuando = whenText(n);
      return `<li class="lista-fila lista-fila--${n.estado}${n.event ? ' lista-fila--suceso' : ''}"><button type="button" class="enlace-texto lista-nombre" data-grafo-centro="${esc(n.sel)}" title="Ponerlo en el centro">${esc(nombreDe(n.sel))}</button>${cuando ? `<span class="lista-cuando">${esc(cuando)}</span>` : ''}
          ${n.aristas.slice(0, 3).map((a) => `<span class="lista-arista ${claseArista(a, a.estadoT)}"><span class="lista-que"><span class="lista-verbo">${esc(a.word || a.verbo)}</span>${a.word && a.word !== a.verbo ? `&nbsp;· <span class="lista-suceso">${esc(a.verbo)}</span>` : ''}&nbsp;· <span class="lista-fecha">${esc(a.tr ? BE.textoFechaArista(a) : 'sin fecha')}</span>${a.deducido ? '&nbsp;· <span class="etiqueta-deducido">deducido</span>' : ''}</span> ${BE.chipsCitas(a.ref || '')}${sinPasaje(a)}</span>`).join('')}</li>`;
    };
    const mas = lejos.length ? `<details class="lista-mas" data-grafo-lista-mas="${s.grupo}"${G.openFolds.has(s.grupo) ? ' open' : ''}><summary>${lejos.length} ${lejos.length === 1 ? 'suceso' : 'sucesos'} más, de otras fechas</summary>${foldGroupsHtml(lejos, fila, 'lista-mas__filas')}</details>` : '';
    return `<section class="grafo-lista__sec"><h3 class="be-card__eyebrow"><span class="sector-punto sector-punto--${s.grupo.toLowerCase()}"></span>${s.rotulo} <b class="cuenta">${todos.length}</b></h3>
      <ul>${ns.map(fila).join('')}</ul>${mas}</section>`;
  }).join('')}</div></div>`;
}

/** G-17: el mapa resalta el lugar tocado, o dónde está la persona tocada. */
function resaltarNodo(n) {
  let ls = null;
  if (n.sel.startsWith('lugar:')) ls = [n.sel.slice(6)];
  else if (n.sel.startsWith('persona:')) { const w = BE.lugarActual(n.sel.slice(8), E.t); ls = w ? [w.id] : [...BE.implicados(BE.parseSel(n.sel)).lugares]; }
  else { const s = BE.parseSel(n.sel); if (s) ls = [...BE.implicados(s).lugares]; }
  G.hover = true;
  BE.mapa.resaltar(ls && ls.length ? ls : null);
}
/** Pone la tarjeta junto a `ancla`: encima si cabe, si no debajo, en el lado con más sitio. Fijada, va en el DOM justo
    detrás de su nodo, para que Tab pase del nodo a sus acciones. */
function ponerTarjeta(html, ancla, fija) {
  const t = $('#grafo-tarjeta');
  if (!t) return null;
  t.innerHTML = html;
  t.hidden = false;
  t.classList.toggle('grafo-tarjeta--fija', !!fija);
  if (fija) { t.setAttribute('role', 'group'); t.setAttribute('aria-label', `Detalle: ${ancla.querySelector('.be-gnode__label')?.textContent || ''}`); ancla.after(t); }
  else { t.setAttribute('role', 'tooltip'); t.removeAttribute('aria-label'); }
  const vg = $('#vista-grafo'), v = vg.getBoundingClientRect(), a = ancla.getBoundingClientRect();
  const w = Math.min(320, v.width - 20);
  t.style.width = `${w}px`;
  t.style.maxHeight = ''; t.style.overflowY = '';
  // El sitio se mide sin el relleno de abajo de la vista: en el móvil ahí está la hoja plegada, y lo que cayera en él
  // quedaría debajo de su asa, sin poder pulsarse (lo mismo que descuenta lienzoHtml).
  const techo = v.top + 8, fondo = v.bottom - (parseFloat(getComputedStyle(vg).paddingBottom) || 0) - 8;
  const arriba = a.top - 12 - techo, abajo = fondo - a.bottom - 10;
  let alto = t.offsetHeight;
  const debajo = alto > arriba && abajo > arriba;
  // Más alta que el sitio (una lista «+N» larga): se desplaza por dentro en vez de tapar su nodo.
  if (alto > Math.max(arriba, abajo)) { alto = Math.max(120, Math.max(arriba, abajo)); t.style.maxHeight = `${alto}px`; t.style.overflowY = 'auto'; }
  const base = t.offsetParent?.getBoundingClientRect() || v;
  const x = Math.max(v.left + 10, Math.min(v.right - w - 10, a.left + a.width / 2 - 36));
  // Si ni así cabe (menos de 120 px a cada lado), manda no salirse de la vista: mejor tapar un poco el nodo que la hoja.
  const y = Math.max(techo, Math.min(fondo - alto, debajo ? a.bottom + 10 : a.top - alto - 12));
  t.style.left = `${x - base.left}px`; t.style.top = `${y - base.top}px`;
  t.classList.toggle('be-pop--below', debajo);
  return t;
}
/** La tarjeta de paso (ratón encima o foco): lo que dice la arista, sin acciones. */
function mostrarTarjeta(i, ancla) {
  const n = G.nodos?.[i];
  if (!n || G.fija) return;
  $('#grafo-tarjeta')?.setAttribute('data-sel', n.sel);
  ponerTarjeta(htmlTarjeta(n), ancla, false);
  resaltarNodo(n);
}
const CONECTABLES = new Set(['persona', 'lugar', 'carta']);
/** Primer toque o Intro en un nodo: la tarjeta queda fijada con sus acciones (propuesta 11). */
function fijarNodo(i, ancla) {
  const n = G.nodos?.[i];
  if (!n) return;
  G.fija = null;
  const relacionar = CONECTABLES.has(tipoDe(centro())) && CONECTABLES.has(tipoDe(n.sel));
  $('#grafo-tarjeta')?.setAttribute('data-sel', n.sel);
  const acciones = `<div class="grafo-tarjeta__acciones"><button type="button" class="be-btn be-btn--sm be-btn--primary" data-grafo-centro="${esc(n.sel)}">Poner en el centro</button>${relacionar ? `<button type="button" class="be-btn be-btn--sm" data-grafo-relacionar="${esc(n.sel)}">¿Cómo se relaciona con ${esc(nombreDe(n.sel))}?</button>` : ''}</div>`;
  ponerTarjeta(htmlTarjeta(n, `${acciones}<p class="grafo-tarjeta__pista">Otro toque o Intro en el nodo lo pone en el centro.</p>`), ancla, true);
  marcarFija(`n${i}`, ancla);
  resaltarNodo(n);
}
/** La burbuja «+N» abre lo plegado de su sector: una lista en la que cada fila pone su nodo en el centro. */
function fijarResto(grupo, ancla) {
  const ns = G.restos[grupo] || [];
  if (!ns.length) return;
  G.fija = null;
  const fila = (n) => `<li><button type="button" class="grafo-resto__fila" data-grafo-centro="${esc(n.sel)}"><span class="be-node be-node--${claseNodo(n.sel)} be-node--sm" aria-hidden="true">${esc(inicial(n.sel))}</span><span class="grafo-resto__texto"><span class="grafo-resto__nombre">${esc(nombreDe(n.sel))}</span><span class="grafo-resto__meta">${esc(metaNodo(n))}</span></span></button></li>`;
  $('#grafo-tarjeta')?.removeAttribute('data-sel');
  ponerTarjeta(`<div class="be-card__pad"><div class="be-card__eyebrow">${esc(nombreDe(centro()))} · ${esc(textoResto(grupo, ns.length))}</div>${foldGroupsHtml(ns, fila, 'grafo-resto')}</div>`, ancla, true);
  marcarFija(`g${grupo}`, ancla);
}
function marcarFija(clave, ancla) {
  $('#vista-grafo').querySelectorAll('.gnodo[aria-expanded="true"]').forEach((el) => el.setAttribute('aria-expanded', 'false'));
  ancla.setAttribute('aria-expanded', 'true');
  ancla.setAttribute('aria-controls', 'grafo-tarjeta');
  G.fija = clave;
  G.ancla = ancla;
}
/** Quita la tarjeta. La fijada solo se va con `forzar` (Esc, otro nodo, un toque fuera, centrar). */
function ocultarTarjeta(forzar = true) {
  if (G.fija && !forzar) return;
  const t = $('#grafo-tarjeta');
  if (t) { t.hidden = true; t.classList.remove('grafo-tarjeta--fija'); }
  if (G.fija) { G.ancla?.setAttribute('aria-expanded', 'false'); G.fija = null; G.ancla = null; }
  if (G.hover) { G.hover = null; BE.mapa.resaltar(null); }
}
/** Abre el grafo centrado en `x`: una selección («lugar:creta») o el id de una persona («pablo»). */
function abrirGrafo(x, { ruta = null, desdeHash = false } = {}) {
  const sel = aSel(x);
  if (!BE.parseSel(sel)) return;
  estudio.abrirSolo('grafo');
  G.ruta = ruta ? ruta.map(aSel).filter((y) => BE.parseSel(y)) : [sel];
  if (!G.ruta.length) G.ruta = [sel];
  if (!G.modo) G.modo = 'grafo';   // en pantalla estrecha se dibuja la lista sin cambiar la preferencia (pintarGrafo)
  G.previos = new Set();
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
  G.ruta = []; G.clave = ''; G.leyenda = null; G.openFolds.clear();
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

/** Grafo de todo: personas, lugares y cartas, con aristas que llevan verbo, tramo y referencia. Los datos no cambian
    después de cargar: se construye la primera vez que hace falta y se conserva entre aperturas de la conexión. */
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
/** Quién apunta a cada nodo, para medir distancias hacia atrás. Se calcula una vez por red. */
const INVERSAS = new WeakMap();
function inversaDe(ady) {
  if (INVERSAS.has(ady)) return INVERSAS.get(ady);
  const inversa = new Map();
  for (const [x, es] of ady) for (const e of es) { if (!inversa.has(e.b)) inversa.set(e.b, []); inversa.get(e.b).push(x); }
  INVERSAS.set(ady, inversa);
  return inversa;
}
const VISTOS = 3;    // caminos a la vista, en pestañas
const TOPE = 300;    // se cuentan hasta aquí; más allá la cuenta dice «más de 300» y solo se buscan los más sólidos
/** Solidez en décimas, para sumar sin errores de coma flotante: cada paso pesa 10, una deducción 10 más, coincidir en
    un viaje o un suceso 6 más (es un hecho del texto, pero dice menos que una relación escrita) y pasar por un lugar
    compartido 25. Menos peso es más sólido; a igual peso, menos pasos. */
const PESO = { paso: 10, deducido: 10, coincidencia: 6, lugar: 25 };
/** De las aristas entre dos nodos, la más sólida: sin deducir, sin lugar, relación escrita y con fecha. */
const mejorQue = (p, q) => (p.deducido ? 1 : 0) - (q.deducido ? 1 : 0) || (p.lugar ? 1 : 0) - (q.lugar ? 1 : 0) || (q.origen === 'relacion' ? 1 : 0) - (p.origen === 'relacion' ? 1 : 0) || (q.tr ? 1 : 0) - (p.tr ? 1 : 0);
let HECHO = { clave: null, res: null };   // la última búsqueda: repintar (una pestaña, el hash) no la repite
/** Los VISTOS caminos simples más sólidos entre a y b, de hasta 5 pasos, y cuántos hay (total, hasta TOPE + 1).
    Una sola búsqueda en profundidad: cuenta todos los caminos hasta pasar de TOPE y desde ahí poda las ramas que ni
    en el mejor caso (un paso de peso mínimo por cada salto que falta) ganan al tercero. Así el orden es el de todos
    los caminos, no el de los primeros 301 encontrados. */
function caminos(a, b) {
  const clave = `${a}~${b}~${C.deducciones}~${C.lugares}`;
  if (HECHO.clave === clave) return HECHO.res;
  const ady = red();
  const vale = (x) => x === b || x.startsWith('persona:') || x.startsWith('carta:') || (C.lugares && x.startsWith('lugar:'));
  const aristaVale = (e) => C.deducciones || !e.deducido;
  // Distancias hasta b para podar.
  const dist = new Map([[b, 0]]);
  let frente = [b];
  const inversa = inversaDe(ady);
  while (frente.length) {
    const sig = [];
    for (const y of frente) for (const x of inversa.get(y) || []) {
      if (dist.has(x) || !(x === a || vale(x))) continue;
      if (!(ady.get(x) || []).some((e) => e.b === y && aristaVale(e))) continue;
      dist.set(x, dist.get(y) + 1); sig.push(x);
    }
    frente = sig;
  }
  HECHO = { clave, res: { caminos: [], total: 0, cortado: false } };
  if (!dist.has(a)) return HECHO.res;
  const MAX = Math.min(5, dist.get(a) + 2);
  // Los vecinos útiles de cada nodo, con la arista más sólida del par y su peso; se calculan al pasar la primera vez.
  const VEC = new Map();
  const vecinos = (x) => {
    if (VEC.has(x)) return VEC.get(x);
    const por = new Map();
    for (const e of ady.get(x) || []) if (aristaVale(e)) { if (!por.has(e.b)) por.set(e.b, []); por.get(e.b).push(e); }
    const out = [];
    for (const [y, es] of por) {
      if (!vale(y) || !dist.has(y)) continue;
      const e = es.sort(mejorQue)[0];
      const coincide = e.origen !== 'relacion' && x.startsWith('persona:') && y.startsWith('persona:');
      out.push({ y, e, otras: es.length - 1, peso: PESO.paso + (e.deducido ? PESO.deducido : 0) + (coincide ? PESO.coincidencia : 0) + (y !== b && y.startsWith('lugar:') ? PESO.lugar : 0) });
    }
    VEC.set(x, out);
    return out;
  };
  const antes = (peso, n, c) => peso < c.peso || (peso === c.peso && n < c.saltos.length);
  const mejores = [];
  let total = 0;
  const pila = [a], saltos = [], ver = new Set([a]);
  (function dfs(x, peso) {
    for (const v of vecinos(x)) {
      const { y } = v;
      if (ver.has(y) || pila.length + dist.get(y) > MAX) continue;
      const p = peso + v.peso;
      const tercero = mejores[VISTOS - 1];
      if (total > TOPE && tercero && !antes(p + PESO.paso * dist.get(y), pila.length + dist.get(y), tercero)) continue;
      pila.push(y); saltos.push(v);
      if (y === b) {
        total++;
        const i = mejores.findIndex((c) => antes(p, saltos.length, c));
        if (i >= 0 || mejores.length < VISTOS) { mejores.splice(i >= 0 ? i : mejores.length, 0, { nodos: [...pila], saltos: [...saltos], peso: p }); mejores.length = Math.min(mejores.length, VISTOS); }
      } else { ver.add(y); dfs(y, p); ver.delete(y); }
      pila.pop(); saltos.pop();
    }
  })(a, 0);
  HECHO.res = {
    total,
    cortado: total > TOPE,
    caminos: mejores.map(({ nodos, saltos: vs, peso }) => {
      const pasos = vs.map((v, i) => ({ de: nodos[i], a: v.y, e: v.e, otras: v.otras }));
      return { nodos, pasos, deducidos: pasos.filter((p) => p.e.deducido).length, porLugar: nodos.slice(1, -1).filter((x) => x.startsWith('lugar:')).length, puntos: peso / 10 };
    }),
  };
  return HECHO.res;
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
/** Las opciones de las casillas (personas, y lugares sin tocayo), una vez por carga: los datos no cambian. */
let OPCIONES = null;
function opcionesConexion() {
  if (OPCIONES) return OPCIONES;
  const nombres = {};
  const opciones = [];
  for (const p of Object.values(BE.PERS)) nombres[p.nombre] = (nombres[p.nombre] || 0) + 1;
  for (const p of Object.values(BE.PERS)) opciones.push({ texto: nombres[p.nombre] > 1 ? `${p.nombre} (${(p.desambiguacion || p.id).split(/[.;,(]/)[0].slice(0, 40).trim()})` : p.nombre, sel: `persona:${p.id}` });
  for (const l of Object.values(BE.L)) if (!nombres[l.nombre]) opciones.push({ texto: l.nombre, sel: `lugar:${l.id}` });
  for (const o of opciones) o.norm = BE.norm(o.texto);
  OPCIONES = opciones;
  return OPCIONES;
}
/** La lista de sugerencias de las casillas va fuera de la vista, que se repinta entera: se crea una vez. */
function ponerListaOpciones() {
  if (document.getElementById('conexion-opciones')) return;
  const dl = document.createElement('datalist');
  dl.id = 'conexion-opciones';
  dl.innerHTML = opcionesConexion().map((o) => `<option value="${esc(o.texto)}"></option>`).join('');
  document.body.append(dl);
}
function selDeTexto(texto) {
  const t = BE.norm(texto).trim();
  if (!t) return null;
  const o = opcionesConexion().find((x) => x.norm === t);
  if (o) return o.sel;
  const vivos = opcionesConexion().filter((x) => x.norm.startsWith(t));
  return vivos.length === 1 ? vivos[0].sel : null;
}
const textoDeSel = (sel) => opcionesConexion().find((x) => x.sel === sel)?.texto || (sel ? nombreDe(sel) : '');

function pintarConexion() {
  const v = $('#vista-conexion');
  if (!conAbierta()) { if (!v.hidden) { v.hidden = true; v.innerHTML = ''; } return; }
  v.hidden = false;
  if (!BE.chunks.ready(pintarConexion)) { v.innerHTML = BE.chunks.waitingHtml('la conexión'); return; }
  ponerListaOpciones();
  const listos = C.a && C.b && BE.parseSel(C.a) && BE.parseSel(C.b);
  const hallado = listos ? caminos(C.a, C.b) : { caminos: [], total: 0, cortado: false };
  C.caminos = hallado.caminos;
  const vistos = C.caminos;
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
    <div class="grafo-filtros">
      <label class="interruptor"><input type="checkbox" data-conexion-opcion="deducciones" ${C.deducciones ? 'checked' : ''}> Incluir deducciones</label>
      <label class="interruptor"><input type="checkbox" data-conexion-opcion="lugares" ${C.lugares ? 'checked' : ''}> Incluir lugares compartidos</label>
      ${listos ? `<span class="be-muted">${cuentaCaminos(hallado)}</span>` : ''}
    </div>
    <div class="conexion-cuerpo">${cuerpo}</div>`;
}
/** Cuántos caminos hay, sin inventar: pasado el tope, «más de 300». */
function cuentaCaminos({ total, cortado }) {
  if (!total) return 'Ningún camino';
  if (total === 1) return '1 camino';
  return `${cortado ? `Más de ${TOPE}` : total} caminos${total > VISTOS ? `, los ${VISTOS} más sólidos a la vista` : ''}`;
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
    const vig = t.closest('[data-grafo-vigente]');
    if (vig) { if (vig.getAttribute('aria-disabled') === 'true') return; G.vigente = !G.vigente; pintarGrafo(true); BE.guardarHash(); return; }
    const ab = t.closest('[data-grafo-abrir]');
    if (ab) { if (G.fija === `g${ab.dataset.grafoAbrir}`) ocultarTarjeta(); else fijarResto(ab.dataset.grafoAbrir, ab); return; }
    const rel = t.closest('[data-grafo-relacionar]');
    if (rel && ['persona', 'lugar', 'carta'].includes(tipoDe(centro()))) { abrirConexion(centro(), rel.dataset.grafoRelacionar); return; }
    const ir = t.closest('[data-grafo-ir]');
    if (ir) { BE.setT(+ir.dataset.grafoIr); BE.asegurarVisible(BE.E.t, true); return; }
    const cen = t.closest('[data-grafo-centro]');
    if (cen) { centrarEn(cen.dataset.grafoCentro); return; }
    const nodo = t.closest('[data-gnodo]');
    if (nodo) {
      const i = +nodo.dataset.gnodo, n = G.nodos[i];
      if (!n) return;
      if (e.shiftKey && ['persona', 'lugar', 'carta'].includes(tipoDe(centro()))) { abrirConexion(centro(), n.sel); return; }   // Mayúsculas + clic: ¿cómo se relacionan?
      // Con el ratón la tarjeta ya salió al pasar por encima: el clic centra. Con el dedo o el teclado, el primer toque
      // o Intro fija la tarjeta con sus acciones y el segundo centra (propuesta 11).
      if (comoPulsa(e) === 'raton' || G.fija === `n${i}`) centrarEn(n.sel);   // lo que se centra puede ser persona, lugar o suceso
      else fijarNodo(i, nodo);
      return;
    }
    // Un toque en el lienzo, fuera de la tarjeta, la cierra.
    if (G.fija && !t.closest('#grafo-tarjeta') && t.closest('.grafo-lienzo')) ocultarTarjeta();
  });
  vg.addEventListener('pointerdown', (e) => { G.puntero = e.pointerType; });
  // La tarjeta de paso sale con el ratón encima o con el foco; con el dedo la decide el toque (arriba).
  const sobre = (e) => { const n = e.target.closest?.('[data-gnodo], [data-arista]'); if (n) mostrarTarjeta(+(n.dataset.gnodo ?? n.dataset.arista), n.dataset.gnodo != null ? n : vg.querySelector(`[data-gnodo="${n.dataset.arista}"]`) || n); };
  vg.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse') sobre(e); });
  vg.addEventListener('focusin', (e) => {
    if (e.target.closest?.('#grafo-tarjeta') || e.target === G.ancla) return;
    // El foco pasa a otro nodo: la tarjeta fijada se cierra y sale la del nodo nuevo.
    if (G.fija && e.target.closest?.('[data-gnodo], [data-grafo-abrir]')) ocultarTarjeta();
    sobre(e);
  });
  vg.addEventListener('pointerout', (e) => { if (e.pointerType === 'mouse' && e.target.closest?.('[data-gnodo], [data-arista]') && !e.relatedTarget?.closest?.('#grafo-tarjeta')) ocultarTarjeta(false); });
  // El foco sale del grafo: se va también la tarjeta fijada. Dentro del grafo, solo la de paso.
  vg.addEventListener('focusout', (e) => ocultarTarjeta(!vg.contains(e.relatedTarget)));
  // Abrir o plegar la leyenda cambia el alto que le queda al círculo: se vuelve a colocar para que nada quede debajo.
  vg.addEventListener('toggle', (e) => {
    // Los pliegues de la lista recuerdan si están abiertos: el cursor que avanza repinta y no debe cerrarlos.
    const mas = e.target.dataset?.grafoListaMas;
    if (mas) { if (e.target.open) G.openFolds.add(mas); else G.openFolds.delete(mas); return; }
    if (!e.target.matches?.('[data-grafo-leyenda]') || e.target.open === leyendaAbierta()) return;   // la recién pintada abierta también avisa
    G.leyenda = e.target.open;
    if (G.modoVisto === 'grafo') pintarGrafo(true);
  }, true);

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
  // Esc cierra la vista abierta cuando el foco está dentro. En el grafo cierra antes la tarjeta, y el foco vuelve al
  // nodo si estaba en ella.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const tarjeta = $('#grafo-tarjeta');
    const enGrafo = vg.contains(document.activeElement) || document.activeElement === document.body;
    if (abierto() && tarjeta && !tarjeta.hidden && enGrafo) {
      e.stopImmediatePropagation();
      const volver = tarjeta.contains(document.activeElement) ? G.ancla : null;
      ocultarTarjeta();
      volver?.focus();
    } else if (abierto() && vg.contains(document.activeElement)) { e.stopImmediatePropagation(); cerrarGrafo(); }
    else if (conAbierta() && vc.contains(document.activeElement) && !document.activeElement.matches('.casilla')) { e.stopImmediatePropagation(); cerrarConexion(); }
  }, true);
  new ResizeObserver(() => { if (abierto() && G.modo === 'grafo') pintarGrafo(true); }).observe(document.getElementById('mapa'));
  // Las cajas se miden con la letra que haya: cuando llega la definitiva, se vuelven a medir.
  document.fonts?.ready.then(() => { if (abierto() && G.modoVisto === 'grafo') pintarGrafo(true); });
}
BE.inicios.push(iniciar);
// Un cambio de escala (c.linea con otro ancho) cambia la banda de los sucesos cercanos: también repinta, sin mover nada.
BE.pintores.push((c) => { seguirSeleccion(); if (abierto() && (c.cursor || c.panel || (c.linea && E.vista && E.vista[1] - E.vista[0] !== G.span))) pintarGrafo(false); });

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
  { nombre: 'gvista', escribir: () => (abierto() && G.modoPedido && G.modo !== (estrecha() ? 'lista' : 'grafo') ? G.modo : null),
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
BE.conexion = { abrir: abrirConexion, cerrar: cerrarConexion, caminos: (a, b) => caminos(a, b).caminos, rellenar: rellenarConexion, get extremos() { return [C.a, C.b]; } };
})();
