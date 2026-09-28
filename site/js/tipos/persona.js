/* biblical-earth · tipo «persona»: ficha (F-01), búsqueda con homónimos (G-12), lo que implica seleccionarla (B-01) y
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

/** Dónde está una persona en t, como lugar. Usa BE.donde, que app-tiempo generaliza a cualquier persona. */
function lugarActual(id, t) {
  let w = null;
  try { w = BE.donde(id, t); } catch { w = null; }
  if (!w) return null;
  const x = w.en?.lugar?.id || w.lugar?.id || (typeof w.lugar === 'string' ? w.lugar : null);
  return x && BE.L[x] ? { id: x, parada: w.parada !== false, estimada: !!w.estimada } : null;
}

const VERBOS = {
  acompana: () => 'viajan juntos',
  vivio_en: () => 'vivió aquí', nacio_en: () => 'nació aquí', murio_en: () => 'murió aquí',
};
/** Verbo de una relación visto desde el centro. adelante: la relación está escrita en el centro; si no, en el otro. */
function verboRelacion(r, adelante, centro, otro) {
  if (r.tipo === 'pariente') {
    const rel = r.relacion || 'pariente';
    return adelante ? `su ${rel}` : `${centro} es su ${rel}`;
  }
  if (r.tipo === 'sucede_a') return adelante ? `${centro} le sucede` : `sucede a ${centro}`;
  if (r.tipo === 'mismo_que') return r.deducido ? '¿la misma persona?' : 'la misma persona';
  return (VERBOS[r.tipo] || (() => r.tipo))(otro);
}

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
  for (const r of p.relaciones || []) {
    const otro = r.persona ? `persona:${r.persona}` : r.lugar ? `lugar:${r.lugar}` : null;
    if (!otro || !BE.parseSel(otro)) continue;
    poner({ sel: otro, grupo: r.persona ? 'Personas' : 'Lugares', verbo: verboRelacion(r, true, p.nombre, nombreDe(otro)), fecha: r.fecha, deducido: !!r.deducido, estado: r.estado, fuentes: r.fuentes, razon: r.razon, ref: refsDe(r.razon), origen: 'relacion', tipoRel: r.tipo, relacion: r.relacion });
  }
  for (const q of Object.values(BE.PERS)) {
    if (q.id === id) continue;
    for (const r of q.relaciones || []) {
      if (r.persona !== id) continue;
      poner({ sel: `persona:${q.id}`, grupo: 'Personas', verbo: verboRelacion(r, false, p.nombre, q.nombre), fecha: r.fecha, deducido: !!r.deducido, estado: r.estado, fuentes: r.fuentes, razon: r.razon, ref: refsDe(r.razon), origen: 'relacion', tipoRel: r.tipo, relacion: r.relacion, inversa: true });
    }
  }
  for (const v of BE.D.viajes || []) {
    const gente = [v.persona, ...(v.companeros || [])].filter(Boolean);
    if (!gente.includes(id)) continue;
    poner({ sel: `viaje:${v.id}`, grupo: 'Hechos', verbo: v.persona === id ? 'su viaje' : 'va en este viaje', fecha: v.fecha, ref: v.referencia, fuentes: v.fuentes, razon: v.razon, estado: v.estado, origen: 'viaje' });
    for (const g of gente) if (g !== id && BE.PERS[g]) poner({ sel: `persona:${g}`, grupo: 'Personas', verbo: `viajan juntos · ${v.nombre}`, fecha: v.fecha, ref: v.referencia, fuentes: v.fuentes, razon: v.razon, estado: v.estado, origen: 'viaje' });
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
    for (const l of e.lugares || []) if (BE.L[l]) poner({ ...base, sel: `lugar:${l}`, grupo: 'Lugares', verbo: e.titulo });
    for (const g of e.personas) if (g !== id && BE.PERS[g]) poner({ ...base, sel: `persona:${g}`, grupo: 'Personas', verbo: `juntos: ${e.titulo}` });
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
function fichaPersona(id) {
  const p = BE.PERS[id];
  const as = aristas(id);
  const rels = as.filter((a) => a.origen === 'relacion');
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
    ${recorridos.length ? `<div class="be-note be-note--uncertain aviso-recorrido"><span aria-hidden="true">◎</span><span>Esta ficha forma parte de un recorrido: ${recorridos.map((r) => `<button type="button" class="enlace-texto" data-sel="recorrido:${esc(r.id)}">${esc(r.titulo)}</button>`).join(', ')}.</span></div>` : ''}
    ${rels.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Relaciones <b class="cuenta">${rels.length}</b></h3>
      <ul class="relaciones">${rels.map((a) => `<li><span class="rel-verbo">${esc(a.verbo)}</span><button type="button" class="enlace-texto" data-sel="${esc(a.sel)}">${esc(nombreDe(a.sel))}</button>${tag(a)}
        <span class="rel-meta">${a.fecha ? `${esc(textoFecha(a))} · ` : ''}${a.ref ? BE.chipsCitas(a.ref) : ''}</span>${a.razon ? `<span class="rel-razon">${esc(a.razon)}</span>` : ''}</li>`).join('')}</ul></div></section>` : ''}
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
      <ul class="no-afirmamos">${p.no_afirmamos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p class="be-muted">Ninguna fuente de nivel 1 lo dice; por eso no sale en el mapa ni en la línea.</p></div></section>` : ''}
    ${(p.no_confundir_con || []).filter((x) => BE.PERS[x]).length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">No confundir con</h3>
      <div class="be-list">${p.no_confundir_con.filter((x) => BE.PERS[x]).map((x) => BE.botonSel(`persona:${x}`, BE.PERS[x].nombre, esc(BE.PERS[x].desambiguacion || BE.PERS[x].resumen || ''))).join('')}</div></div></section>` : ''}
    ${BE.porQueHtml(p)}`;
}

function implicadosPersona(id, r) {
  const viajes = BE.D.viajes.filter((v) => v.persona === id || (v.companeros || []).includes(id));
  viajes.forEach((v) => { r.claves.add(`viaje:${v.id}`); BE.P.filter((s) => s.viaje === v).forEach((s) => BE.anadirParada(r, s)); });
  BE.D.cartas.filter((c) => c.escritor === id || (!c.escritor && id === 'pablo') || (c.portadores || []).includes(id) || (c.destinatarios?.personas || []).includes(id)).forEach((c) => BE.anadirCarta(r, c));
  (BE.D.eventos || []).filter((e) => (e.personas || []).includes(id)).forEach((e) => { r.claves.add(`evento:${e.id}`); (e.lugares || []).forEach((x) => r.lugares.add(x)); });
  (BE.D.periodos || []).filter((p) => p.persona === id).forEach((p) => r.claves.add(`periodo:${p.id}`));
  (BE.PERS[id].relaciones || []).forEach((x) => { if (x.lugar && BE.L[x.lugar]) r.lugares.add(x.lugar); });
}
/** Como en v0: salta a lo primero que implica. Si no implica nada con fecha, al principio de su actividad conocida. */
function momentoPersona(id) {
  const r = { claves: new Set(), lugares: new Set() };
  implicadosPersona(id, r);
  const ts = [];
  for (const k of r.claves) { const i = k.indexOf(':'); const x = BE.tipo(k.slice(0, i))?.momentoImplicado?.(k.slice(i + 1)); if (x != null) ts.push(x); }
  if (ts.length) return Math.min(...ts);
  const tr = tramo(BE.PERS[id].fecha);
  return tr ? tr[0] + 0.01 : null;
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

Object.assign(BE, { aristas, vigencia, tramoAbierto, lugarActual, textoFechaArista: textoFecha, nombreDeSel: nombreDe });
})();
