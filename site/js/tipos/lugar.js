/* biblical-earth · tipo «lugar»: ficha, búsqueda y lo que implica seleccionar un lugar. La ficha cambia con el cursor
   (G-11): qué pasaba aquí en esta fecha, lo de antes y lo de después con su distancia en años, y una tira con toda la
   historia del lugar (F-02). Los lugares inciertos enseñan sus candidatos con su base (C-07). Dueño: app-mapa. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, EXTERNO, fechaCorta, fmtAnio, fmtCursor, tramo, clamp } = BE;

const TIPOS = { ciudad: 'Ciudad', region: 'Región', isla: 'Isla', provincia: 'Provincia', puerto: 'Puerto', cabo: 'Cabo', monte: 'Monte', rio: 'Río', mar: 'Mar', lago: 'Lago', desierto: 'Desierto', valle: 'Valle', llanura: 'Llanura', pais: 'País', reino: 'Reino' };
const VERBO = { vivio_en: 'vivió aquí', nacio_en: 'nació aquí', murio_en: 'murió aquí' };
const REGIONES = new Set(['region', 'provincia', 'pais', 'reino']);
const persona = (id) => BE.PERS[id]?.nombre || id;

/** Todo lo fechado que ocurre en un lugar: sucesos, periodos, paradas, cartas, hallazgos y personas que vivieron,
    nacieron o murieron aquí. Cada hecho: { sel, titulo, tr: [inicio, fin) o null, fecha, fuentes, estado, nivel, tipo }. */
function hechosDe(id) {
  const D = BE.D, out = [];
  const add = (o) => out.push({ ...o, nivel: BE.nivelDe(o.fuentes) });
  for (const e of D.eventos || []) if ((e.lugares || []).includes(id)) add({ sel: `evento:${e.id}`, titulo: e.titulo, tr: BE.ventanaEvento(e), fecha: e.fecha, fuentes: e.fuentes, estado: e.estado, tipo: 'evento', pasajes: e.pasajes });
  for (const p of D.periodos || []) if ((p.lugares || []).includes(id)) add({ sel: `periodo:${p.id}`, titulo: p.nombre, tr: tramo(p.fecha), fecha: p.fecha, fuentes: p.fuentes, estado: p.estado, tipo: 'periodo' });
  for (const s of BE.P) if (s.lugar.id === id) add({ sel: `parada:${s.key}`, titulo: `Pablo · ${s.viaje.nombre}`, tr: [s.a, Math.max(s.b, s.a + 0.05)], fecha: s.p.fecha, fuentes: s.p.fuentes, estado: s.p.estado, tipo: 'parada', pasajes: [s.p.referencia] });
  for (const v of D.viajes) {
    if ((v.persona || 'pablo') === 'pablo') continue;
    for (const p of v.paradas || []) if (p.lugar === id) {
      const key = `${v.id}/${p.orden}`;
      add({ sel: BE.existe('parada', key) ? `parada:${key}` : `viaje:${v.id}`, titulo: `${persona(v.persona)} · ${v.nombre}`, tr: tramo(p.fecha) || tramo(v.fecha), fecha: p.fecha || v.fecha, fuentes: p.fuentes || v.fuentes, estado: p.estado || v.estado, tipo: 'parada', pasajes: [p.referencia] });
    }
  }
  for (const c of D.cartas) {
    const de = BE.origenesCarta(c).includes(id), a = BE.destinosCarta(c).includes(id);
    if (!de && !a) continue;
    add({ sel: `carta:${c.id}`, titulo: `${c.libro}, ${de ? 'escrita aquí' : 'enviada aquí'}`, tr: BE.ventanaDeCarta(c) || tramo(c.fecha), fecha: c.fecha, fuentes: c.fuentes, estado: c.estado, tipo: 'carta', pasajes: [c.referencia] });
  }
  for (const h of D.hallazgos || []) if (h.lugar_hallazgo === id) add({ sel: `hallazgo:${h.id}`, titulo: h.nombre, tr: tramo(h.fecha_objeto), fecha: h.fecha_objeto, fuentes: h.fuentes, estado: h.estado, tipo: 'hallazgo' });
  for (const p of Object.values(BE.PERS)) {
    for (const r of p.relaciones || []) {
      if (r.lugar !== id || !VERBO[r.tipo]) continue;
      add({ sel: `persona:${p.id}`, titulo: `${p.nombre} ${VERBO[r.tipo]}`, tr: tramo(r.fecha) || tramo(p.fecha), fecha: r.fecha || p.fecha, fuentes: r.fuentes, estado: r.estado, tipo: 'persona', deducido: r.deducido });
    }
  }
  return out;
}
/** Los hechos que dejan ver los filtros (solo nivel 1, datos sin verificar). */
const visibles = (hs) => hs.filter((h) => !(BE.filtros?.nivel1 && h.nivel === 2) && !(BE.filtros && !BE.filtros.capas.pendientes && h.estado === 'pendiente'));
const fechaTexto = (h) => (h.fecha?.texto || fechaCorta(h.fecha) || 'sin fecha');
function distancia(n, antes) {
  const a = Math.round(Math.abs(n));
  if (a < 1) return antes ? 'hace menos de un año' : 'en menos de un año';
  return `${antes ? 'hace' : 'en'} ${a} ${a === 1 ? 'año' : 'años'}`;
}

// ---- Qué pasaba aquí ahora y lo conectado antes y después ----
function claveAhora(id, t) {
  const hs = visibles(hechosDe(id));
  const ahora = hs.filter((h) => h.tr && t >= h.tr[0] && t < h.tr[1]).map((h) => h.sel);
  return `${id}|${Math.round(t)}|${ahora}|${BE.nombreEn(BE.L[id], t)}`;
}
function ahoraHtml(id, t) {
  const l = BE.L[id];
  const hs = visibles(hechosDe(id));
  const fechados = hs.filter((h) => h.tr);
  const ahora = fechados.filter((h) => t >= h.tr[0] && t < h.tr[1]);
  const antes = fechados.filter((h) => h.tr[1] <= t && !ahora.includes(h)).sort((a, b) => b.tr[1] - a.tr[1]);
  const despues = fechados.filter((h) => h.tr[0] > t).sort((a, b) => a.tr[0] - b.tr[0]);
  const nombre = BE.nombreEn(l, t);
  const fila = (h, extra = '') => `<li class="hecho"><button type="button" class="enlace-titulo" data-sel="${esc(h.sel)}">${esc(h.titulo)}</button> ${BE.insigniaHtml(h.fuentes)}${h.estado === 'pendiente' ? ' <span class="sin-verificar">sin verificar</span>' : ''}${h.deducido ? ' <span class="be-muted">(deducido)</span>' : ''}<span class="be-row__meta">${esc(fechaTexto(h))}${extra}</span></li>`;
  const bloque = (nivel, lista) => lista.length ? `<div class="bloque-nivel bloque-nivel--${nivel}"><span class="be-tier be-tier--${nivel}" data-n="${nivel}">${nivel === 1 ? 'Biblia y jw.org' : 'Historia y arqueología'}</span>${nivel === 2 ? '<span class="be-muted acompana">acompaña, nunca corrige</span>' : ''}<ul class="hechos">${lista.map((h) => fila(h)).join('')}</ul></div>` : '';
  let cuerpo;
  if (ahora.length) {
    const n2 = ahora.filter((h) => h.nivel === 2);
    // Sin nivel 2 el bloque sale igual, vacío y diciéndolo: que no haya historia o arqueología es un dato (pantalla 08).
    cuerpo = bloque(1, ahora.filter((h) => h.nivel !== 2)) + (n2.length ? bloque(2, n2)
      : '<div class="bloque-nivel bloque-nivel--2 bloque-vacio"><span class="be-tier be-tier--2" data-n="2">Historia y arqueología</span><span class="be-muted acompana">acompaña, nunca corrige</span><p class="be-muted">Sin fuente de nivel 2 que jw.org use para esta fecha.</p></div>');
  } else {
    const a = antes[0], d = despues[0];
    cuerpo = `<p class="be-muted">No tenemos hechos de ${esc(nombre)} en esta fecha.</p>`;
    if (!fechados.length) cuerpo = `<p class="be-muted">Todavía no tenemos hechos fechados de ${esc(nombre)}.</p>`;
    else cuerpo += `<ul class="hechos">${a ? fila(a, ` · antes, ${esc(distancia(t - a.tr[1], true))}`) : ''}${d ? fila(d, ` · después, ${esc(distancia(d.tr[0] - t, false))}`) : ''}</ul>`;
  }
  const conectado = (titulo, lista, antesDe) => lista.length ? `<h4 class="be-caps sub-bloque">${titulo}</h4><ul class="hechos">${lista.slice(0, 3).map((h) => fila(h, ` · <b class="distancia">${esc(distancia(antesDe ? t - h.tr[1] : h.tr[0] - t, antesDe))}</b>`)).join('')}</ul>` : '';
  const otroNombre = nombre !== l.nombre ? `<p class="nombre-epoca">En esta fecha se llamaba <b>${esc(nombre)}</b>.</p>` : '';
  return `<section class="be-card ficha-sec"><div class="be-card__pad">
      <h3 class="be-card__eyebrow">Qué pasaba aquí ahora</h3>
      <p class="titulo-ahora">${esc(nombre)} en ${esc(fmtCursor(t))}</p>${otroNombre}
      ${cuerpo}
    </div></section>
    ${ahora.length && (antes.length || despues.length) ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Conectado con ${esc(nombre)}, visto desde ${esc(fmtAnio(Math.floor(t)))}</h3>${conectado('Antes', antes, true)}${conectado('Después', despues, false)}</div></section>` : ''}`;
}

// ---- Tira de la historia del lugar (F-02), con los tramos vacíos plegados ----
const ANCHO = 360;
function escalaPlegada(intervalos) {
  const xs = intervalos.map(([a, b]) => [a, Math.max(b, a + 0.01)]).sort((p, q) => p[0] - q[0]);
  const min = xs[0][0], max = Math.max(...xs.map((p) => p[1]));
  const umbral = Math.max(8, (max - min) * 0.08);
  const segs = [];
  for (const [a, b] of xs) {
    const u = segs[segs.length - 1];
    if (u && a - u[1] < umbral) u[1] = Math.max(u[1], b); else segs.push([a, b]);
  }
  const HUECO = 16, MIN = 22;
  const huecos = segs.length - 1;
  const dur = segs.map(([a, b]) => Math.max(b - a, 0.01));
  let k = (ANCHO - huecos * HUECO) / dur.reduce((s, d) => s + d, 0);
  let anchos = dur.map((d) => d * k);
  for (let it = 0; it < 3; it++) {
    const cortos = anchos.map((w) => w < MIN);
    const libre = ANCHO - huecos * HUECO - cortos.filter(Boolean).length * MIN;
    const resto = dur.filter((_, i) => !cortos[i]).reduce((s, d) => s + d, 0);
    k = resto > 0 ? libre / resto : k;
    anchos = dur.map((d, i) => (cortos[i] ? MIN : d * k));
  }
  const x0 = []; let x = 0;
  segs.forEach((_, i) => { x0.push(x); x += anchos[i] + HUECO; });
  const escala = (y) => {
    if (y <= segs[0][0]) return 0;
    for (let i = 0; i < segs.length; i++) {
      const [a, b] = segs[i];
      if (y <= b) return x0[i] + ((y - a) / Math.max(b - a, 0.01)) * anchos[i];
      if (i < segs.length - 1 && y < segs[i + 1][0]) return x0[i] + anchos[i] + ((y - b) / (segs[i + 1][0] - b)) * HUECO;
    }
    return ANCHO;
  };
  return { escala, segs, x0, anchos, min, max };
}
function tiraHtml(id) {
  const l = BE.L[id];
  const hs = visibles(hechosDe(id));
  const fechados = hs.filter((h) => h.tr);
  const sinAnio = hs.filter((h) => !h.tr);
  const epocas = (l.nombres || []).filter((n) => n.desde != null || n.hasta != null);
  if (fechados.length + epocas.length < 2) {
    return sinAnio.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Sin año</h3><ul class="hechos">${sinAnio.map((h) => `<li class="hecho"><button type="button" class="enlace-titulo" data-sel="${esc(h.sel)}">${esc(h.titulo)}</button></li>`).join('')}</ul></div></section>` : '';
  }
  const ints = fechados.map((h) => h.tr);
  for (const n of epocas) { const a = n.desde ?? n.hasta - 50, b = n.hasta != null ? n.hasta + 1 : a + 50; ints.push([a, b]); }
  const S = escalaPlegada(ints);
  const x = (y) => S.escala(y).toFixed(1);
  const bandas = fechados.filter((h) => h.tipo === 'periodo' || h.tr[1] - h.tr[0] > (S.max - S.min) * 0.15);
  const hitos = fechados.filter((h) => !bandas.includes(h)).sort((a, b) => a.tr[0] - b.tr[0]);
  const H = 104;
  const partes = [];
  // Ejes: el inicio de cada tramo con su año, y los huecos plegados con «≈».
  let ultimaEtiqueta = -99;
  S.segs.forEach(([a, b], i) => {
    if (i > 0) partes.push(`<text class="tira-pliegue" x="${(S.x0[i] - 8).toFixed(1)}" y="${H - 2}" text-anchor="middle">≈</text>`);
    // Año de inicio de cada tramo, y el final del último; se salta el que no cabe junto al anterior.
    const marcas = [[S.x0[i], a]];
    if (i === S.segs.length - 1) marcas.push([S.x0[i] + S.anchos[i], b]);
    for (const [px, y] of marcas) {
      if (px - ultimaEtiqueta < 50) continue;
      ultimaEtiqueta = px;
      partes.push(`<text class="tira-anio" x="${px.toFixed(1)}" y="${H - 2}"${px > ANCHO - 30 ? ' text-anchor="end"' : ''}>${esc(fmtAnio(Math.floor(y)))}</text>`);
    }
  });
  partes.push(`<line class="tira-eje" x1="0" x2="${ANCHO}" y1="${H - 14}" y2="${H - 14}"/>`);
  // Nombres por época
  epocas.forEach((n) => {
    const a = n.desde ?? S.min, b = n.hasta != null ? n.hasta + 1 : S.max;
    partes.push(`<g class="tira-epoca"><rect x="${x(a)}" y="4" width="${Math.max(2, S.escala(b) - S.escala(a)).toFixed(1)}" height="14" rx="3"/><text x="${(+x(a) + 4).toFixed(1)}" y="15">${esc(n.nombre)}</text></g>`);
  });
  bandas.forEach((h, i) => {
    const y = 22 + (i % 2) * 16;
    const ancho = Math.max(3, S.escala(h.tr[1]) - S.escala(h.tr[0]));
    partes.push(`<g class="tira-banda tira-banda--${h.nivel === 2 ? 2 : 1}${h.estado === 'pendiente' ? ' tira--pendiente' : ''}" data-ir-t="${((h.tr[0] + h.tr[1]) / 2).toFixed(2)}" data-ir-sel="${esc(h.sel)}" role="button" tabindex="0" aria-label="${esc(`${h.titulo}, ${fechaTexto(h)}`)}"><title>${esc(`${h.titulo} · ${fechaTexto(h)}`)}</title><rect x="${x(h.tr[0])}" y="${y}" width="${ancho.toFixed(1)}" height="13" rx="3"/>${ancho > 60 ? `<text x="${(+x(h.tr[0]) + 4).toFixed(1)}" y="${y + 10}">${esc(h.titulo.slice(0, Math.floor(ancho / 6.2)))}</text>` : ''}</g>`);
  });
  let ultimo = -99, fila = 0;
  hitos.forEach((h) => {
    const cx = S.escala(h.tr[0]);
    fila = cx - ultimo < 9 ? (fila + 1) % 3 : 0;
    ultimo = cx;
    const y = 60 + fila * 9;
    partes.push(`<g class="tira-hito tira-hito--${h.tipo}${h.nivel === 2 ? ' tira-hito--n2' : ''}${h.estado === 'pendiente' ? ' tira--pendiente' : ''}" data-ir-t="${((h.tr[0] + h.tr[1]) / 2).toFixed(2)}" data-ir-sel="${esc(h.sel)}" role="button" tabindex="0" aria-label="${esc(`${h.titulo}, ${fechaTexto(h)}`)}"><title>${esc(`${h.titulo} · ${fechaTexto(h)}`)}</title><line x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${y + 4}" y2="${H - 14}"/><rect x="${(cx - 4).toFixed(1)}" y="${y - 4}" width="8" height="8" transform="rotate(45 ${cx.toFixed(1)} ${y})"/></g>`);
  });
  const t = clamp(E.t, S.min, S.max);
  partes.push(`<g id="tira-cursor" class="tira-cursor" transform="translate(${x(t)} 0)"><line x1="0" x2="0" y1="0" y2="${H - 12}"/></g>`);
  return `<section class="be-card ficha-sec tira-sec"><div class="be-card__pad">
      <h3 class="be-card__eyebrow">Toda la historia del lugar</h3><p class="be-muted nota-tira">Pulsa un hito para ir a su fecha. Los tramos sin hechos se pliegan (≈).</p>
      <svg class="tira" id="tira-lugar" viewBox="-6 0 ${ANCHO + 12} ${H}" data-min="${S.min}" data-max="${S.max}" role="group" aria-label="Historia de ${esc(l.nombre)}: pulsa un hito para ir a su fecha">${partes.join('')}</svg>
      ${sinAnio.length ? `<div class="sin-anio"><span class="be-caps">Sin año</span> ${sinAnio.map((h) => `<button type="button" class="be-chip" data-sel="${esc(h.sel)}">${esc(h.titulo)}</button>`).join('')}</div>` : ''}
    </div></section>`;
}
let escalaTira = null;
function moverCursorTira() {
  const svg = document.getElementById('tira-lugar'), g = document.getElementById('tira-cursor');
  if (!svg || !g || !escalaTira) return;
  const t = clamp(E.t, escalaTira.min, escalaTira.max);
  g.setAttribute('transform', `translate(${escalaTira.escala(t).toFixed(1)} 0)`);
}

// ---- Candidatos de ubicación (M-10, M-11, C-07, C-08, C-09) ----
function candidatosHtml(l) {
  const todos = BE.candidatosDe(l);
  if (!todos) return '';
  const vis = BE.candidatosVisibles(l);
  const ocultos = todos.length - vis.length;
  const foco = BE.mapa.candidatoFoco;
  if (!todos.length) {
    return `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">¿Dónde estaba?</h3>
      <p class="be-note be-note--uncertain"><span>No sabemos dónde estaba. Ninguna fuente da un candidato con base, así que el mapa no dibuja nada.</span></p></div></section>`;
  }
  const geo = (g) => (g.tipo === 'zona' ? `zona de unos ${Math.round(g.radio_km)} km de radio` : g.tipo === 'franja' ? 'franja entre dos puntos' : 'punto');
  return `<section class="be-card ficha-sec"><div class="be-card__pad">
    <h3 class="be-card__eyebrow">Candidatos y su base <b class="cuenta">${vis.length}</b></h3>
    <ul class="candidatos">${vis.map(({ c, i }) => {
      const s = BE.CANDIDATO[c.estado] || BE.CANDIDATO.alternativa;
      const calculado = /calcul/i.test(c.nota || '');
      return `<li><button type="button" class="candidato${foco && foco.lugar === l.id && foco.i === i ? ' candidato--foco' : ''}" data-cand="${esc(l.id)}|${i}" aria-label="${esc(`Ver en el mapa: ${c.nombre}`)}">
        <span class="leyenda-cand leyenda-cand--${c.estado}" style="--cand:${s.color}" aria-hidden="true"></span>
        <span class="candidato-texto"><b>${esc(c.nombre)}</b><span class="be-row__meta">${esc(geo(c.geometria))}${c.razon ? ` · ${esc(c.razon)}` : ''}</span>
        ${c.nota ? `<span class="be-row__meta">${calculado ? '<span class="insignia-calculado">calculado</span> ' : ''}${esc(c.nota)}</span>` : ''}</span>
        <span class="estado-cand estado-cand--${c.estado}" style="--cand:${s.color}">${esc(s.corto)}</span></button>${BE.insigniaHtml(c.fuentes)}</li>`;
    }).join('')}</ul>
    ${ocultos ? `<p class="be-muted oculto-n2">${ocultos} ${ocultos === 1 ? 'candidato solo de nivel 2 oculto' : 'candidatos solo de nivel 2 ocultos'} por el filtro «solo nivel 1».</p>` : ''}
    <p class="be-note be-note--uncertain"><span><b>¿Por qué no hay un punto?</b> Ninguna fuente de nivel 1 da un sitio exacto. Dibujamos las zonas y los candidatos que se citan, cada uno con su base; un punto haría creer que se sabe.</span></p>
  </div></section>`;
}

// ---- La congregación (F-11) ----
function congregacionHtml(id) {
  const l = BE.L[id];
  const recibidas = BE.D.cartas.filter((c) => BE.destinosCarta(c).includes(id));
  if (!recibidas.length) return '';
  const visitas = BE.P.filter((s) => s.lugar.id === id);
  const personas = new Map();
  for (const c of recibidas) for (const p of c.destinatarios?.personas || []) personas.set(p, `destinatario de ${c.libro}`);
  for (const p of Object.values(BE.PERS)) for (const r of p.relaciones || []) if (r.lugar === id && VERBO[r.tipo]) personas.set(p.id, VERBO[r.tipo]);
  // Grupo: los otros lugares que nombran las mismas cartas (las congregaciones de Galacia y sus ciudades).
  const grupo = new Set();
  for (const c of recibidas) for (const x of BE.destinosCarta(c)) if (x !== id) grupo.add(x);
  const esRegion = REGIONES.has(l.tipo);
  const primera = visitas[0];
  return `<section class="be-card ficha-sec"><div class="be-card__pad">
    <h3 class="be-card__eyebrow">La congregación${esRegion ? 's' : ''} de ${esc(l.nombre)}</h3>
    <dl class="be-kv">
      ${primera ? `<dt>Primera visita en los datos</dt><dd><button type="button" class="enlace-titulo" data-sel="parada:${esc(primera.key)}">${esc(primera.p.referencia)}</button> · ${esc(primera.p.fecha?.texto || fechaCorta(primera.p.fecha))}</dd>` : ''}
      <dt>Visitas de Pablo</dt><dd>${visitas.length || 'ninguna en los datos'}</dd>
      <dt>Cartas recibidas</dt><dd>${recibidas.map((c) => `<button type="button" class="enlace-titulo" data-sel="carta:${esc(c.id)}">${esc(c.libro)}</button>`).join(', ')}</dd>
      ${personas.size ? `<dt>Personas</dt><dd>${[...personas].map(([p, rol]) => `<button type="button" class="enlace-titulo" data-sel="persona:${esc(p)}" title="${esc(rol)}">${esc(persona(p))}</button>`).join(', ')}</dd>` : ''}
      ${grupo.size ? `<dt>${esRegion ? 'Ciudades' : 'Con'}</dt><dd>${[...grupo].map((x) => `<button type="button" class="enlace-titulo" data-sel="lugar:${esc(x)}">${esc(BE.L[x].nombre)}</button>`).join(', ')}</dd>` : ''}
    </dl></div></section>`;
}

function fichaLugar(id) {
  const l = BE.L[id];
  const cands = BE.candidatosDe(l);
  const paradas = BE.P.filter((s) => s.lugar.id === id);
  const otras = hechosDe(id).filter((h) => h.tipo === 'parada' && !paradas.some((s) => h.sel === `parada:${s.key}`));
  const cartasDe = BE.D.cartas.filter((c) => BE.origenesCarta(c).includes(id));
  const cartasA = BE.D.cartas.filter((c) => BE.destinosCarta(c).includes(id));
  const hallazgos = (BE.D.hallazgos || []).filter((h) => h.lugar_hallazgo === id);
  const tipo = TIPOS[l.tipo] || l.tipo;
  const prec = { punto: '', zona: ' · región: el punto solo la representa', incierto: ' · ubicación incierta' }[l.precision] || '';
  const incierta = cands || l.precision === 'incierto';
  const deCarta = (c) => ((c.escritor || 'pablo') === 'pablo' ? '' : `de ${persona(c.escritor)} · `);
  const noSabemos = [...(l.no_afirmamos || [])];
  if (cands) noSabemos.unshift(`No sabemos con seguridad dónde estaba ${l.nombre}.`);
  else if (l.precision === 'incierto') noSabemos.unshift(`No se conoce el sitio exacto de ${l.nombre}: el punto es aproximado.`);
  escalaTira = null;
  const tira = tiraHtml(id);
  // La escala de la tira se guarda para mover el cursor sin repintar la ficha.
  const hs = visibles(hechosDe(id)).filter((h) => h.tr).map((h) => h.tr);
  for (const n of (l.nombres || []).filter((x) => x.desde != null || x.hasta != null)) { const a = n.desde ?? n.hasta - 50; hs.push([a, n.hasta != null ? n.hasta + 1 : a + 50]); }
  if (hs.length >= 2) escalaTira = escalaPlegada(hs);
  return `${BE.migas('Lugares', l.nombre)}${BE.cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow"><span class="icono-lugar" aria-hidden="true"></span>${esc(tipo + prec)}</div>${incierta ? '<span class="insignia-incierta">identificación incierta</span>' : ''}
      <h2 class="be-card__title">${esc(l.nombre)}</h2>
      ${BE.nombresHtml(l)}
      ${l.resumen ? `<p class="be-card__body">${esc(l.resumen)}</p>` : ''}
      ${BE.enlacesHtml(l.enlaces)}
    </div><div class="be-card__foot">${BE.estadoHtml(l.estado)}<span class="be-spacer"></span>${l.coord_url ? `<a class="be-wol" href="${esc(l.coord_url)}" ${EXTERNO} title="Solo tomamos el punto, nunca su identificación">Coordenada: ${/^openbible/.test(l.coord_fuente || '') ? 'OpenBible.info (CC BY 4.0)' : esc(String(l.coord_fuente || 'fuente').split(':')[0])}</a>` : ''}</div></section>
    ${candidatosHtml(l)}
    <div id="lugar-ahora" data-clave="${esc(claveAhora(id, E.t))}">${ahoraHtml(id, E.t)}</div>
    ${tira}
    ${paradas.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Pablo estuvo aquí <b class="cuenta">${paradas.length}</b></h3>
      <div class="be-list">${paradas.map((s) => BE.botonSel(`parada:${s.key}`, s.viaje.nombre, `${esc(s.p.referencia)} · ${esc(s.narrativa ? `${fechaCorta(s.p.fecha)}, fecha aproximada` : (s.p.fecha?.texto || ''))}`)).join('')}</div></div></section>` : ''}
    ${otras.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Otros viajes que pasan por aquí <b class="cuenta">${otras.length}</b></h3>
      <div class="be-list">${otras.map((h) => BE.botonSel(h.sel, h.titulo, esc(`${(h.pasajes || []).join('; ')} · ${fechaTexto(h)}`))).join('')}</div></div></section>` : ''}
    ${cartasDe.length || cartasA.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Cartas</h3>
      <div class="be-list">${cartasDe.map((c) => BE.botonSel(`carta:${c.id}`, `${c.libro}, escrita aquí`, esc(`${deCarta(c)}${fechaCorta(c.fecha)}`))).join('')}${cartasA.map((c) => BE.botonSel(`carta:${c.id}`, `${c.libro}, enviada aquí`, esc(`${deCarta(c)}${fechaCorta(c.fecha)}`))).join('')}</div></div></section>` : ''}
    ${congregacionHtml(id)}
    ${hallazgos.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Hallazgos <b class="cuenta">${hallazgos.length}</b></h3>
      <div class="be-list">${hallazgos.map((h) => BE.botonSel(`hallazgo:${h.id}`, h.nombre, esc(h.fecha_objeto?.texto || fechaCorta(h.fecha_objeto)))).join('')}</div></div></section>` : ''}
    ${BE.noSabemosHtml(noSabemos)}
    ${BE.porQueHtml(l)}
    ${BE.videosHtml(id)}`;
}

/** Fecha a la que salta el cursor al elegir un lugar: ninguna si ya pasa algo aquí; si no, el hecho más cercano. */
function momentoLugar(id) {
  const hs = visibles(hechosDe(id)).filter((h) => h.tr);
  if (!hs.length) return null;
  const t = E.t;
  if (hs.some((h) => t >= h.tr[0] && t < h.tr[1])) return null;
  const d = (h) => (t < h.tr[0] ? h.tr[0] - t : t - h.tr[1]);
  const h = hs.reduce((m, x) => (d(x) < d(m) ? x : m));
  return h.tr[1] - h.tr[0] > 3 ? (t < h.tr[0] ? h.tr[0] + 0.01 : h.tr[1] - 0.01) : (h.tr[0] + h.tr[1]) / 2;
}

BE.tipo('lugar', {
  nodo: 'lugar',
  existe: (id) => !!BE.L[id],
  nombre: (id) => BE.L[id].nombre,
  implicados(id, r) {
    r.lugares.add(id);
    BE.P.filter((s) => s.lugar.id === id).forEach((s) => BE.anadirParada(r, s));
    BE.D.cartas.filter((c) => BE.origenesCarta(c).includes(id) || BE.destinosCarta(c).includes(id)).forEach((c) => BE.anadirCarta(r, c));
    (BE.D.eventos || []).filter((e) => (e.lugares || []).includes(id)).forEach((e) => r.claves.add(`evento:${e.id}`));
    (BE.D.periodos || []).filter((p) => (p.lugares || []).includes(id)).forEach((p) => r.claves.add(`periodo:${p.id}`));
    (BE.D.hallazgos || []).filter((h) => h.lugar_hallazgo === id).forEach((h) => r.claves.add(`hallazgo:${h.id}`));
  },
  momento: momentoLugar,
  ficha: fichaLugar,
  buscar(q, nq, puntuar) {
    const out = [];
    for (const l of Object.values(BE.L)) {
      const p = puntuar([l.nombre, ...(l.nombres || []).map((n) => n.nombre), ...(BE.candidatosDe(l) || []).map((c) => c.nombre)]);
      if (!p) continue;
      const hoy = BE.nombreHoy(l);
      const n = BE.P.filter((s) => s.lugar.id === l.id).length;
      out.push({ grupo: 'Lugares', sel: { tipo: 'lugar', id: l.id }, titulo: l.nombre, meta: [hoy ? `hoy ${hoy}` : '', BE.candidatosDe(l) || l.precision === 'incierto' ? 'ubicación incierta' : '', `${n} paradas`].filter(Boolean).join(' · '), puntos: p });
    }
    return out;
  },
});

// La ficha de un lugar cambia con el cursor: solo se repinta el bloque «Qué pasaba aquí ahora» y el cursor de la tira.
BE.pintores.push((c) => {
  if (E.sel?.tipo !== 'lugar' || !(c.cursor || c.panel)) return;
  moverCursorTira();
  const el = document.getElementById('lugar-ahora');
  if (!el) return;
  const clave = claveAhora(E.sel.id, E.t);
  if (el.dataset.clave === clave) return;
  el.dataset.clave = clave;
  el.innerHTML = ahoraHtml(E.sel.id, E.t);
});
// Un hito de la tira mueve el cursor a su fecha (con Intro también).
function irA(el) {
  const t = parseFloat(el.dataset.irT);
  if (!Number.isFinite(t)) return;
  BE.setT(t); BE.asegurarVisible(t, true);
  BE.seguirPablo?.();
}
document.addEventListener('click', (e) => { const el = e.target.closest?.('[data-ir-t]'); if (el) { e.preventDefault(); irA(el); } });
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches?.('[data-ir-t]')) { e.preventDefault(); irA(e.target); } });
// Una fila de candidato lo marca en el mapa.
document.addEventListener('click', (e) => {
  const el = e.target.closest?.('[data-cand]');
  if (!el || !el.closest('#panel-cuerpo')) return;
  const [lugar, i] = el.dataset.cand.split('|');
  BE.mapa.enfocarCandidato(lugar, +i, true);
});

Object.assign(BE, { hechosDe });
})();
