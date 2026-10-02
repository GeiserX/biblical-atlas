/* biblical-atlas · tipo «persona»: ficha (F-01), búsqueda con homónimos (G-12), lo que implica seleccionarla (B-01) y
   sus conexiones con fecha y referencia, que usan el grafo y la conexión entre dos (aristas). Dueño durante el reparto: app-estudio. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, fechaCorta, tramo } = BE;

const persona = (id) => BE.PERS[id];
const nombreDe = (sel) => { const s = BE.parseSel(sel); return s ? BE.nombreSel(s) : sel; };
/** Tramo [a, b) de una FECHA con los extremos que faltan abiertos (una relación «desde 49» sigue vigente). */
function tramoAbierto(f) {
  if (!f || (f.desde == null && f.hasta == null)) return null;
  return [f.desde ?? -Infinity, f.hasta == null ? Infinity : f.hasta + 1];
}
/** 'ahora', 'pasado', 'futuro' o 'siempre' (sin fecha) de un tramo en el año t. */
function vigencia(tr, t) {
  if (!tr) return 'siempre';
  if (t < tr[0]) return 'futuro';
  if (t >= tr[1]) return 'pasado';
  return 'ahora';
}
const refsDe = (texto) => [...new Set(BE.citasEnTexto(texto).map((c) => c.texto))].join('; ');

/** Dónde está una persona en t, como lugar. Usa BE.donde, que app-tiempo generaliza a cualquier persona. Devuelve
    también la referencia y las fuentes de la estancia que la sitúa (una parada, un suceso o una relación con fecha):
    la arista «está aquí ahora» las toma de ahí o no se dibuja (docs/investigacion/modelo.md, sección 10). */
function lugarActual(id, t) {
  let w = null;
  try { w = BE.donde(id, t); } catch { w = null; }
  if (!w) return null;
  const x = w.en?.lugar?.id || w.lugar?.id || (typeof w.lugar === 'string' ? w.lugar : null);
  if (!x || !BE.L[x]) return null;
  const e = w.en || {};
  const rel = String(e.key || '').startsWith('rel:') ? persona(id)?.relaciones?.[Number(e.key.split(':')[2])] : null;
  const ev = !rel && String(e.sel || '').startsWith('evento:') ? (BE.D.eventos || []).find((s) => s.id === e.sel.slice(7)) : null;
  const ref = rel ? rel.reference || '' : ev ? (ev.pasajes || []).join('; ') : e.p?.referencia || '';
  const fuentes = (rel || ev || e.p || {}).fuentes || [];
  return { id: x, parada: w.parada !== false, estimada: !!w.estimada, ref, fuentes };
}

/** Verbo de una relación visto desde el centro, tal como lo compila build.py desde data/vocabulary.yaml: `verb` si la
    relación está escrita en el centro (adelante) y `inverse_verb` si está escrita en el otro. Sin verbo no hay arista. */
const verboRelacion = (r, adelante) => (adelante ? r.verb : r.inverse_verb) || '';

/** Todas las conexiones de una persona, cada una con verbo, tramo, referencia y fuentes (G-06). Una arista sin
    referencia ni fuente no se devuelve. grupo: Personas, Lugares, Cartas o Hechos (G-02). */
const MEMO = new Map();   // los datos no cambian después de cargar: las aristas de cada persona se calculan una vez
function aristas(id) {
  if (MEMO.has(id)) return MEMO.get(id);
  const r = calcularAristas(id);
  MEMO.set(id, r);
  return r;
}
function calcularAristas(id) {
  const p = persona(id);
  if (!p) return [];
  const out = [];
  const poner = (a) => { if ((a.fuentes && a.fuentes.length) || a.ref) out.push({ ...a, tr: a.tr !== undefined ? a.tr : tramoAbierto(a.fecha) }); };
  // Una relación da arista si trae su verbo y su referencia a un pasaje, y no es la copia que no manda de un par
  // escrito en las dos fichas (duplicate_of): así ningún vínculo sale dos veces (docs/investigacion/modelo.md, sección 10).
  const ponerRelacion = (r, adelante, a) => {
    const verbo = verboRelacion(r, adelante);
    if (!verbo || !r.reference || r.duplicate_of) return;
    out.push({ ...a, verbo, fecha: r.fecha, deducido: !!r.deducido, estado: r.estado, fuentes: r.fuentes, razon: r.razon, ref: r.reference, origen: 'relacion', tipoRel: r.tipo, type: r.type, alias: r.type === 'same_as', inversa: !adelante, grupoFamilia: (adelante ? r.family : r.inverse_family) || null, etiqueta: (adelante ? r.relacion : r.inverse_label) || '', tr: tramoAbierto(r.fecha) });
  };
  for (const r of p.relaciones || []) {
    const otro = r.persona ? `persona:${r.persona}` : r.lugar ? `lugar:${r.lugar}` : null;
    if (!otro || !BE.parseSel(otro)) continue;
    ponerRelacion(r, true, { sel: otro, grupo: r.persona ? 'Personas' : 'Lugares' });
  }
  for (const q of Object.values(BE.PERS)) {
    if (q.id === id) continue;
    for (const r of q.relaciones || []) {
      if (r.persona !== id) continue;
      ponerRelacion(r, false, { sel: `persona:${q.id}`, grupo: 'Personas' });
    }
  }
  for (const v of BE.D.viajes || []) {
    const gente = [v.persona, ...BE.acompanantes(v)].filter(Boolean);
    if (!gente.includes(id)) continue;
    // Un acompañante puede ir solo en un tramo (pregunta 3 de viajes-modelo): viajan juntos los que comparten una parada.
    const paradas = (x) => (v.paradas || []).filter((p) => x === v.persona || BE.acompanantes(v, p.orden).includes(x)).map((p) => p.orden);
    const mias = paradas(id);
    poner({ sel: `viaje:${v.id}`, grupo: 'Hechos', verbo: v.persona === id ? 'su viaje' : 'va en este viaje', fecha: v.fecha, ref: v.referencia, fuentes: v.fuentes, razon: v.razon, estado: v.estado, origen: 'viaje' });
    for (const g of gente) if (g !== id && BE.PERS[g] && paradas(g).some((k) => mias.includes(k))) poner({ sel: `persona:${g}`, grupo: 'Personas', verbo: `viajan juntos · ${v.nombre}`, fecha: v.fecha, ref: v.referencia, fuentes: v.fuentes, razon: v.razon, estado: v.estado, origen: 'viaje' });
  }
  // Los lugares de sus paradas, cada uno en el tramo en que estuvo allí (hoy solo Pablo tiene paradas).
  for (const s of BE.P || []) {
    if (s.viaje?.persona !== id) continue;
    poner({ sel: `lugar:${s.lugar.id}`, grupo: 'Lugares', verbo: s.b - s.a > 0.4 ? 'se queda aquí' : 'pasa por aquí', tr: [s.a, s.b], textoFecha: s.p.fecha?.texto || fechaCorta(s.p.fecha), ref: s.p.referencia, fuentes: s.p.fuentes || s.viaje.fuentes, razon: s.p.razon, estado: s.p.estado, origen: 'parada', incierto: !!s.narrativa, fuerte: s.b - s.a > 0.4 });
  }
  for (const e of BE.D.eventos || []) {
    if (!(e.personas || []).includes(id)) continue;
    const ref = (e.pasajes || []).join('; ');
    const base = { fecha: e.fecha, ref, fuentes: e.fuentes, razon: e.razon, estado: e.estado, origen: 'evento', incierto: e.fecha?.tipo === 'narrativa' || e.fecha?.tipo === 'derivada' };
    poner({ ...base, sel: `evento:${e.id}`, grupo: 'Hechos', verbo: 'está en este suceso' });
    // Con `presentes`, quien no está en la lista solo se nombra: los lugares del suceso no son lugares de su vida.
    const estuvo = !e.presentes || e.presentes.includes(id);
    // Solo el primer lugar: es donde ocurre lo principal y el único donde el suceso sitúa a sus personas (docs/investigacion/README.md).
    const l = (e.lugares || [])[0];
    if (estuvo && l && BE.L[l]) poner({ ...base, sel: `lugar:${l}`, grupo: 'Lugares', verbo: e.titulo });
    // «Juntos» solo si los dos estuvieron allí: Jesús habló a Ananías en una visión, no estuvo con él en Damasco.
    for (const g of e.personas) {
      if (g === id || !BE.PERS[g]) continue;
      const juntos = !e.presentes || (e.presentes.includes(id) && e.presentes.includes(g));
      poner({ ...base, sel: `persona:${g}`, grupo: 'Personas', verbo: `${juntos ? 'juntos' : 'en el mismo suceso'}: ${e.titulo}` });
    }
  }
  for (const c of BE.D.cartas || []) {
    const roles = [];
    if (c.escritor === id) roles.push('la escribe');
    if ((c.destinatarios?.personas || []).includes(id)) roles.push('la recibe');
    if ((c.portadores || []).includes(id)) roles.push('la lleva');
    if (!roles.length) continue;
    poner({ sel: `carta:${c.id}`, grupo: 'Cartas', verbo: roles.join(' y '), fecha: c.fecha, ref: c.referencia, fuentes: c.fuentes, razon: c.razon, estado: c.estado, origen: 'carta', incierto: (c.escrita_en || []).length > 1 });
  }
  for (const pe of BE.D.periodos || []) {
    if (pe.persona !== id) continue;
    poner({ sel: `periodo:${pe.id}`, grupo: 'Hechos', verbo: pe.tipo === 'rey' ? 'reina' : 'su periodo', fecha: pe.fecha, ref: refsDe(pe.razon), fuentes: pe.fuentes, razon: pe.razon, estado: pe.estado, origen: 'periodo' });
  }
  for (const h of BE.D.hallazgos || []) {
    if (!(h.relaciona || []).includes(`persona:${id}`)) continue;
    poner({ sel: `hallazgo:${h.id}`, grupo: 'Hechos', verbo: 'lo menciona un hallazgo', fecha: h.fecha_objeto, ref: refsDe(h.razon), fuentes: h.fuentes, razon: h.razon, estado: h.estado, origen: 'hallazgo', nivel2: true });
  }
  return out.filter((a) => BE.parseSel(a.sel));
}
const textoFecha = (a) => a.textoFecha || a.fecha?.texto || (a.fecha ? fechaCorta(a.fecha) : 'sin fecha');

// ---------------------------------------------------------------------------
// Ficha
// ---------------------------------------------------------------------------
/** Barra de vida: su actividad conocida, difuminada donde la fuente no da fecha. */
function barraVida(p) {
  const f = p.fecha;
  if (!f) return '';
  const abierto = (x) => x == null;
  return `<div class="vida" title="${esc(f.texto || fechaCorta(f))}">
    <span class="vida-barra${abierto(f.desde) || f.aprox ? ' vida-barra--ini' : ''}${abierto(f.hasta) || f.aprox ? ' vida-barra--fin' : ''}"></span>
    <span class="vida-texto"><span class="be-chrono be-chrono--tnm">${esc(f.texto || fechaCorta(f))}</span>${f.aprox ? ' <span class="be-muted">sin fecha exacta de principio ni de fin</span>' : ''}</span></div>`;
}
// Familia: padres, cónyuges, hijos y hermanos. build.py dice en qué grupo sale cada relación, visto desde cada lado
// (family e inverse_family, de data/vocabulary.yaml): un padre de X hace a X su hijo; cónyuges y hermanos se repiten.
const GRUPOS_FAMILIA = [['parents', 'Padres'], ['spouses', 'Cónyuges'], ['children', 'Hijos'], ['siblings', 'Hermanos']];
const mayuscula = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);
/** { parents: [...], spouses, children, siblings }, cada miembro una vez, los hijos por fecha de nacimiento si se sabe. */
function familia(id) {
  const g = { parents: [], spouses: [], children: [], siblings: [] };
  const vistos = new Set();
  for (const a of aristas(id)) {
    if (a.origen !== 'relacion' || !g[a.grupoFamilia] || !a.sel.startsWith('persona:')) continue;
    if (vistos.has(a.sel)) continue;
    vistos.add(a.sel);
    // El nombre del vínculo: la palabra si está escrita en esta persona; si no, el que el vocabulario da por seguro
    // desde el otro lado (inverse_label: «esposo» de quien llama a alguien esposa), o ninguno.
    g[a.grupoFamilia].push({ ...a, palabra: a.etiqueta });
  }
  // Orden de nacimiento: el del relato que cita cada vínculo (Gé 29:32 Rubén antes que Gé 30:22 José); sin cita, la fecha.
  const clave = (a) => {
    const c = BE.citas(a.ref || '')[0];
    if (c) return [0, c.libro.num, c.cap, +(c.texto.match(/:(\d+)/)?.[1] || 0)];
    return [1, BE.PERS[a.sel.slice(8)]?.fecha?.desde ?? Infinity, 0, 0];
  };
  const orden = (x, y) => { const a = clave(x), b = clave(y); for (let i = 0; i < 4; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
  g.children.sort(orden);
  g.siblings.sort(orden);
  return g;
}
function familiaHtml(id) {
  const g = familia(id);
  if (!GRUPOS_FAMILIA.some(([k]) => g[k].length)) return '';
  // Con varias personas en un grupo, la palabra solo se escribe si precisa el vínculo: la que tiene más de una palabra
  // («medio hermano», «padre adoptivo», «hermano gemelo»). «padre» o «hermana» ya los dice el grupo.
  const miembro = (a, varios) => {
    const q = BE.PERS[a.sel.slice(8)];
    const fecha = q?.fecha ? (q.fecha.texto || fechaCorta(q.fecha)) : '';
    const matiz = varios && /\s/.test(a.palabra.trim()) ? a.palabra : '';
    return `<li><button type="button" class="enlace-texto" data-sel="${esc(a.sel)}"${a.razon ? ` title="${esc(a.razon)}"` : ''}>${esc(q?.nombre || nombreDe(a.sel))}</button>${matiz ? ` <span class="be-muted">(${esc(matiz)})</span>` : ''}${a.deducido ? ' <span class="be-chip etiqueta-deducido" title="Lo deduce la fuente; el texto bíblico no lo dice">deducido</span>' : ''}${fecha ? `<span class="fam-fecha">${esc(fecha)}</span>` : ''}${a.ref ? `<span class="fam-refs">${BE.chipsCitas(a.ref)}</span>` : ''}</li>`;
  };
  // Con una sola persona el título es su vínculo («Padre», «Esposo», «Padre adoptivo»); con varias, el plural.
  const titulo = (k, plural) => (g[k].length === 1 && g[k][0].palabra ? mayuscula(g[k][0].palabra) : plural);
  return `<section class="be-card ficha-sec familia"><div class="be-card__pad"><h3 class="be-card__eyebrow">Familia</h3>
    <dl class="familia-lista">${GRUPOS_FAMILIA.filter(([k]) => g[k].length).map(([k, plural]) => `<dt>${esc(titulo(k, plural))}</dt><dd><ul>${g[k].map((a) => miembro(a, g[k].length > 1)).join('')}</ul></dd>`).join('')}</dl></div></section>`;
}

// Vídeos de jw.org que nombran a la persona (site/videos-personas.json). Si el fichero falta o se abre desde file://,
// la sección no sale y no se dice nada.
let VIDEOS_PERSONAS;   // undefined: sin pedir; null: no hay; objeto: cargado
function cargarVideosPersonas() {
  if (VIDEOS_PERSONAS !== undefined) return;
  VIDEOS_PERSONAS = null;
  if (BE.ES_FILE) return;
  // Junto a data.json: con ?datos=_local/<carril>/data.json, los datos de prueba llevan su propio fichero.
  const d = new URLSearchParams(location.search).get('datos');
  const ruta = d && /^_local\/[\w./-]+\.json$/.test(d) && !d.split('/').includes('..') ? d.replace(/[^/]+$/, 'videos-personas.json') : 'videos-personas.json';
  fetch(ruta, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
    VIDEOS_PERSONAS = j && typeof j === 'object' ? j : null;
    if (VIDEOS_PERSONAS && BE.E.sel?.tipo === 'persona' && VIDEOS_PERSONAS[BE.E.sel.id]) BE.pintarPanel(true);
  }).catch(() => { VIDEOS_PERSONAS = null; });
}

/** Un verbo que ya nombra a la otra persona («Bartimeo estuvo con Jesús», «estuvo con Jesús») lleva el botón en ese
    nombre, para no escribirlo dos veces; si no lo nombra, el botón va detrás del verbo. */
function verboConBoton(a) {
  const nombre = nombreDe(a.sel);
  const boton = `<button type="button" class="enlace-texto" data-sel="${esc(a.sel)}">${esc(nombre)}</button>`;
  const m = nombre ? new RegExp(`(^|[^\\p{L}])${nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'u').exec(a.verbo) : null;
  if (!m) return `<span class="rel-verbo">${esc(a.verbo)}</span>${boton}`;
  const i = m.index + m[1].length;
  return `<span class="rel-verbo">${esc(a.verbo.slice(0, i))}${boton}${esc(a.verbo.slice(i + nombre.length))}</span>`;
}
/** Cuántas relaciones de la persona, en su ficha o en la del otro, no se dibujan porque aún no citan un pasaje
    (docs/investigacion/modelo.md, sección 10). La copia que no manda de un par doble no cuenta: la otra la dice. */
function sinPasaje(id) {
  let n = 0;
  const contar = (r, adelante) => { if (verboRelacion(r, adelante) && !r.reference && !r.duplicate_of) n += 1; };
  for (const r of BE.PERS[id]?.relaciones || []) contar(r, true);
  for (const q of Object.values(BE.PERS)) if (q.id !== id) for (const r of q.relaciones || []) if (r.persona === id) contar(r, false);
  return n;
}

function fichaPersona(id) {
  const p = BE.PERS[id];
  const as = aristas(id);
  const nSinPasaje = sinPasaje(id);
  const avisoSinPasaje = nSinPasaje ? `<p class="be-muted">${nSinPasaje === 1 ? 'Una relación no se muestra: todavía no cita un pasaje.' : `${nSinPasaje} relaciones no se muestran: todavía no citan un pasaje.`}</p>` : '';
  cargarVideosPersonas();
  const rels = as.filter((a) => a.origen === 'relacion' && !(a.grupoFamilia && a.sel.startsWith('persona:')));
  const lugares = [];
  for (const a of as.filter((x) => x.grupo === 'Lugares').sort((x, y) => (x.tr?.[0] ?? 1e9) - (y.tr?.[0] ?? 1e9))) {
    if (!lugares.some((l) => l.sel === a.sel)) lugares.push(a);
  }
  const eventos = as.filter((a) => a.origen === 'evento' && a.sel.startsWith('evento:')).sort((x, y) => (x.tr?.[0] ?? 1e9) - (y.tr?.[0] ?? 1e9));
  const viajes = as.filter((a) => a.origen === 'viaje' && a.sel.startsWith('viaje:'));
  const cartas = as.filter((a) => a.origen === 'carta');
  const recorridos = (BE.D.recorridos || []).filter((r) => (r.paradas || []).some((x) => x.sel === `persona:${id}`));
  const tag = (a) => (a.deducido ? '<span class="be-chip etiqueta-deducido" title="Lo deduce la fuente; el texto bíblico no lo dice">deducido</span>' : '');
  return `${BE.migas('Personas', p.nombre)}${BE.cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="cabecera-carta"><span class="be-node be-node--persona be-node--lg" aria-hidden="true">${esc(p.nombre[0])}</span>
      <div><h2 class="be-card__title">${esc(p.nombre)}</h2>${BE.nombresHtml(p)}</div></div>
      ${p.resumen ? `<p class="be-card__body en-una-frase">${esc(p.resumen)}</p>` : ''}
      ${p.desambiguacion ? `<div class="be-note"><span aria-hidden="true">≠</span><span>${esc(p.desambiguacion)}</span></div>` : ''}
      ${barraVida(p)}
      ${BE.enlacesHtml(p.enlaces)}
      <div class="acciones-persona"><button type="button" class="be-btn be-btn--sm" data-grafo="${esc(id)}">Ver en el grafo</button><button type="button" class="be-btn be-btn--sm" data-relacionar="persona:${esc(id)}">Relacionar con…</button></div>
    </div><div class="be-card__foot">${BE.estadoHtml(p.estado)}</div></section>
    ${familiaHtml(id)}
    ${recorridos.length ? `<div class="be-note be-note--uncertain aviso-recorrido"><span aria-hidden="true">◎</span><span>Esta ficha forma parte de un recorrido: ${recorridos.map((r) => `<button type="button" class="enlace-texto" data-sel="recorrido:${esc(r.id)}">${esc(r.titulo)}</button>`).join(', ')}.</span></div>` : ''}
    ${rels.length || avisoSinPasaje ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Relaciones <b class="cuenta">${rels.length}</b></h3>
      ${rels.length ? `<ul class="relaciones">${rels.map((a) => `<li>${verboConBoton(a)}${tag(a)}
        <span class="rel-meta">${a.fecha ? esc(textoFecha(a)) : ''}${a.fecha && a.ref ? ' · ' : ''}${a.ref ? BE.chipsCitas(a.ref) : ''}</span>${a.razon ? `<span class="rel-razon">${esc(a.razon)}</span>` : ''}</li>`).join('')}</ul>` : ''}${avisoSinPasaje}</div></section>` : ''}
    ${lugares.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Lugares de su vida <b class="cuenta">${lugares.length}</b></h3>
      <div class="be-list">${lugares.slice(0, 14).map((a) => BE.botonSel(a.sel, nombreDe(a.sel), esc([a.tr ? textoFecha(a) : '', a.verbo].filter(Boolean).join(' · ')))).join('')}</div>
      ${lugares.length > 14 ? `<p class="be-muted">Y ${lugares.length - 14} más: están todos en el grafo.</p>` : ''}</div></section>` : ''}
    ${eventos.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Sucesos <b class="cuenta">${eventos.length}</b></h3>
      <div class="be-list">${eventos.map((a) => BE.botonSel(a.sel, nombreDe(a.sel), esc([textoFecha(a), a.ref].filter(Boolean).join(' · ')))).join('')}</div></div></section>` : ''}
    ${viajes.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">${viajes.some((a) => a.verbo === 'su viaje') ? 'Sus viajes' : 'Viajes'}</h3>
      <div class="be-list">${viajes.map((a) => BE.botonSel(a.sel, nombreDe(a.sel), `${esc(a.ref || '')} · ${esc(textoFecha(a))}`)).join('')}</div></div></section>` : ''}
    ${cartas.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Cartas <b class="cuenta">${cartas.length}</b></h3>
      <div class="be-list">${cartas.sort((x, y) => (x.tr?.[0] ?? 1e9) - (y.tr?.[0] ?? 1e9)).map((a) => BE.botonSel(a.sel, nombreDe(a.sel), esc(`${a.verbo} · ${textoFecha(a)}`))).join('')}</div></div></section>` : ''}
    ${(p.no_afirmamos || []).length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Lo que no afirmamos</h3>
      <ul class="no-afirmamos">${p.no_afirmamos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p class="be-muted">Ni la Biblia ni jw.org lo dicen; por eso no sale en el mapa ni en la línea.</p></div></section>` : ''}
    ${(p.no_confundir_con || []).filter((x) => BE.PERS[x]).length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">No confundir con</h3>
      <div class="be-list">${p.no_confundir_con.filter((x) => BE.PERS[x]).map((x) => BE.botonSel(`persona:${x}`, BE.PERS[x].nombre, esc(BE.PERS[x].desambiguacion || BE.PERS[x].resumen || ''))).join('')}</div></div></section>` : ''}
    ${BE.videosHtml(id, VIDEOS_PERSONAS || {}, true)}
    ${BE.porQueHtml(p)}`;
}

function implicadosPersona(id, r) {
  const viajes = BE.D.viajes.filter((v) => v.persona === id || BE.acompanantes(v).includes(id));
  viajes.forEach((v) => { r.claves.add(`viaje:${v.id}`); BE.P.filter((s) => s.viaje === v).forEach((s) => BE.anadirParada(r, s)); });
  BE.D.cartas.filter((c) => c.escritor === id || (!c.escritor && id === 'pablo') || (c.portadores || []).includes(id) || (c.destinatarios?.personas || []).includes(id)).forEach((c) => BE.anadirCarta(r, c));
  (BE.D.eventos || []).filter((e) => (e.personas || []).includes(id)).forEach((e) => {
    r.claves.add(`evento:${e.id}`);
    const l = (e.lugares || [])[0];
    if (l && (!e.presentes || e.presentes.includes(id))) r.lugares.add(l);
  });
  (BE.D.periodos || []).filter((p) => p.persona === id).forEach((p) => r.claves.add(`periodo:${p.id}`));
  (BE.PERS[id].relaciones || []).forEach((x) => { if (x.lugar && BE.L[x.lugar]) r.lugares.add(x.lugar); });
}
/** Como en v0: salta a lo primero que implica. Si en ese momento los datos no la sitúan en ningún sitio (Pedro en los
    primeros discípulos, sin lugar con punto) y tiene estancias, salta a la primera, para que la bandera y «Mientras
    tanto» arranquen situándola. Si no implica nada con fecha, a su primera estancia (Sara, Taré), al principio de su
    actividad conocida o, si no tiene, al principio de lo que abarca el libro que la cuenta. */
function momentoPersona(id) {
  const r = { claves: new Set(), lugares: new Set() };
  implicadosPersona(id, r);
  const ts = [];
  for (const k of r.claves) { const i = k.indexOf(':'); const x = BE.tipo(k.slice(0, i))?.momentoImplicado?.(k.slice(i + 1)); if (x != null) ts.push(x); }
  const est = id === 'pablo' ? [] : BE.estancias?.(id) || [];
  const enEstancia = (s) => (s.b - s.a < 1 ? (s.a + s.b) / 2 : s.a + 0.01);
  if (ts.length) {
    const t = Math.min(...ts);
    return est.length && !BE.donde?.(id, t) ? enEstancia(est[0]) : t;
  }
  if (est.length) return enEstancia(est[0]);
  const tr = tramo(BE.PERS[id].fecha);
  if (tr) return tr[0] + 0.01;
  // Sin nada fechado (los jueces): al principio del tiempo que abarca el libro del primer capítulo que la cuenta.
  for (const f of BE.PERS[id].fuentes || []) {
    const m = /^(.+)-\d+$/.exec(f), lib = m && (BE.LIBROS || []).find((l) => l.slug === m[1]);
    const ab = lib?.abarca && tramo(lib.abarca);
    if (ab) return ab[0] + 0.01;
  }
  return null;
}

BE.tipo('persona', {
  nodo: 'persona',
  existe: (id) => !!BE.PERS[id],
  nombre: (id) => BE.PERS[id].nombre,
  implicados: implicadosPersona,
  momento: momentoPersona,
  ficha: fichaPersona,
  // G-12: los homónimos salen separados, cada uno con lo que lo distingue y cuántos comparten el nombre.
  buscar(q, nq, puntuar) {
    const out = [];
    const mismos = {};
    for (const p of Object.values(BE.PERS)) mismos[BE.norm(p.nombre)] = (mismos[BE.norm(p.nombre)] || 0) + 1;
    for (const p of Object.values(BE.PERS)) {
      const pp = puntuar([p.nombre, ...(p.nombres || []).map((n) => n.nombre)]);
      if (!pp) continue;
      const n = mismos[BE.norm(p.nombre)];
      out.push({ grupo: 'Personas', sel: { tipo: 'persona', id: p.id }, titulo: p.nombre, meta: p.desambiguacion || p.resumen || '', puntos: pp, etiqueta: n > 1 ? `${n} con este nombre` : '' });
    }
    return out;
  },
});

Object.assign(BE, { aristas, familia, vigencia, tramoAbierto, lugarActual, textoFechaArista: textoFecha, nombreDeSel: nombreDe });
})();
