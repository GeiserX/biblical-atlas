/* biblical-atlas · tipo «lugar»: ficha, búsqueda y lo que implica seleccionar un lugar. La ficha cambia con el cursor
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
const MEMO_HECHOS = new Map();   // los datos no cambian después de cargar: los hechos de cada lugar se calculan una vez
function hechosDe(id) {
  if (MEMO_HECHOS.get(id)?.D === BE.D) return MEMO_HECHOS.get(id).out;
  const out = calcularHechos(id);
  MEMO_HECHOS.set(id, { D: BE.D, out });
  return out;
}
function calcularHechos(id) {
  const D = BE.D, out = [];
  const add = (o) => out.push({ ...o, nivel: BE.nivelDe(o.fuentes) });
  for (const e of D.eventos || []) if ((e.lugares || []).includes(id)) add({ sel: `evento:${e.id}`, titulo: e.titulo, tr: BE.ventanaEvento(e), fecha: e.fecha, fuentes: e.fuentes, estado: e.estado, tipo: 'evento', pasajes: e.pasajes });
  for (const p of D.periodos || []) if ((p.lugares || []).includes(id)) add({ sel: `periodo:${p.id}`, titulo: p.nombre, tr: tramo(p.fecha), fecha: p.fecha, fuentes: p.fuentes, estado: p.estado, tipo: 'periodo' });
  for (const s of BE.P) if (s.lugar.id === id) add({ sel: `parada:${s.key}`, titulo: `Pablo · ${s.viaje.nombre}`, tr: [s.a, Math.max(s.b, s.a + 0.05)], fecha: s.p.fecha, fuentes: s.p.fuentes, estado: s.p.estado, tipo: 'parada', pasajes: [s.p.referencia] });
  for (const v of D.viajes) {
    if (BE.duenoViaje(v) === 'pablo') continue;
    for (const p of v.paradas || []) if (p.lugar === id) {
      const key = `${v.id}/${p.orden}`;
      add({ sel: BE.existe('parada', key) ? `parada:${key}` : `viaje:${v.id}`, titulo: `${v.persona ? persona(v.persona) : BE.nombreDueno(v, true)} · ${v.nombre}`, tr: tramo(p.fecha) || tramo(v.fecha), fecha: p.fecha || v.fecha, fuentes: p.fuentes || v.fuentes, estado: p.estado || v.estado, tipo: 'parada', pasajes: [p.referencia] });
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
/** «3 años antes», «12 años después»; a partir de un siglo, en siglos redondos («unos 41 siglos después»). */
function distancia(n, antes) {
  const a = Math.abs(n), lado = antes ? 'antes' : 'después';
  if (a < 1) return `menos de un año ${lado}`;
  if (a >= 100) { const s = Math.round(a / 100); return `${s === 1 ? 'un siglo' : `unos ${s} siglos`} ${lado}`; }
  const r = Math.round(a);
  return `${r} ${r === 1 ? 'año' : 'años'} ${lado}`;
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
  const bloque = (nivel, lista) => lista.length ? `<div class="bloque-nivel bloque-nivel--${nivel}"><span class="be-tier be-tier--${nivel}" data-n="${nivel}">${nivel === 1 ? 'Fuentes principales' : 'Historia y arqueología'}</span>${nivel === 2 ? '<span class="be-muted acompana">acompaña, nunca corrige</span>' : ''}<ul class="hechos">${lista.map((h) => fila(h)).join('')}</ul></div>` : '';
  let cuerpo;
  if (ahora.length) {
    const n2 = ahora.filter((h) => h.nivel === 2);
    // Sin nivel 2 el bloque sale igual, vacío y diciéndolo: que no haya historia o arqueología es un dato (pantalla 08).
    cuerpo = bloque(1, ahora.filter((h) => h.nivel !== 2)) + (n2.length ? bloque(2, n2)
      : '<div class="bloque-nivel bloque-nivel--2 bloque-vacio"><span class="be-tier be-tier--2" data-n="2">Historia y arqueología</span><span class="be-muted acompana">acompaña, nunca corrige</span><p class="be-muted">Sin otra fuente que acompañe para esta fecha.</p></div>');
  } else {
    const a = antes[0], d = despues[0];
    cuerpo = `<p class="be-muted">No tenemos hechos de ${esc(nombre)} en esta fecha.</p>`;
    if (!fechados.length) cuerpo = `<p class="be-muted">Todavía no tenemos hechos fechados de ${esc(nombre)}.</p>`;
    else cuerpo += `<ul class="hechos">${a ? fila(a, ` · lo anterior, ${esc(distancia(t - a.tr[1], true))}`) : ''}${d ? fila(d, ` · lo siguiente, ${esc(distancia(d.tr[0] - t, false))}`) : ''}</ul>`;
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

// ---- Toda la historia del lugar (F-02): una lista por fechas, legible, con el cursor dentro ----
// Antes era una tira de rombos sin nombres sobre un eje de años de 8 px (be-g9s). Ahora cada hecho es una fila con su
// fecha, su tipo en palabras y su nombre; los tramos largos sin hechos se pliegan en una fila «≈ N años sin hechos», y
// una fila «Estás aquí» marca el cursor. Con muchos hechos (Jerusalén tiene más de 150) se ven los que rodean al
// cursor y un botón enseña todos.
const conPunto = (x) => (x.endsWith('.') ? x : `${x}.`);
const TIPO_HECHO = { evento: 'suceso', periodo: 'periodo', parada: 'parada de un viaje', carta: 'carta', hallazgo: 'hallazgo', persona: 'persona', nombre: 'nombre del lugar' };
const VENTANA_HISTORIA = 10;       // filas a la vista sin desplegar
const HUECO_HISTORIA = 10;         // años sin hechos a partir de los que se pliega el tramo
const historiaAbierta = new Set(); // lugares con la historia desplegada entera
/** Las filas de la historia: hechos fechados y nombres por época, por orden de inicio. */
function filasHistoria(id) {
  const l = BE.L[id];
  // La fecha corta de la columna: el texto de la fuente si ya es corto («997-980 a.e.c.»), si no la fecha compacta.
  const corta = (h) => (h.fecha?.texto && h.fecha.texto.length <= 16 ? h.fecha.texto : fechaCorta(h.fecha)) || fmtAnio(Math.floor(h.tr[0]));
  const filas = visibles(hechosDe(id)).filter((h) => h.tr).map((h) => ({ ...h, corto: corta(h) }));
  for (const n of (l.nombres || []).filter((x) => x.desde != null || x.hasta != null)) {
    // tr sitúa la fila en la lista (50 años cuando falta un extremo); vig dice cuándo el nombre está en uso: un extremo
    // que falta queda abierto, así «desde 1950» sigue vigente hoy.
    const a = n.desde ?? n.hasta - 50, b = n.hasta != null ? n.hasta + 1 : a + 50;
    const vig = [n.desde ?? -Infinity, n.hasta != null ? n.hasta + 1 : Infinity];
    const texto = n.desde != null && n.hasta != null ? `de ${fmtAnio(n.desde)} a ${fmtAnio(n.hasta)}` : n.desde != null ? `desde ${fmtAnio(n.desde)}` : `hasta ${fmtAnio(n.hasta)}`;
    filas.push({ sel: '', tipo: 'nombre', titulo: `Se llama ${n.nombre}`, tr: [a, b], vig, corto: texto, fecha: { texto }, fuentes: n.fuentes, estado: n.estado });
  }
  return filas.sort((x, y) => x.tr[0] - y.tr[0] || x.tr[1] - y.tr[1]);
}
/** Dónde va el cursor: índice de la primera fila que empieza después de t. */
const posicionCursor = (filas, t) => { const i = filas.findIndex((h) => h.tr[0] > t); return i < 0 ? filas.length : i; };
/** Si el hecho (o el nombre) está en curso en t: los nombres con un extremo abierto usan vig, el resto su tramo. */
const enCurso = (h, t) => { const [d, f] = h.vig || h.tr; return t >= d && t < f; };
function claveHistoria(id, t) {
  const filas = filasHistoria(id);
  const ahora = filas.filter((h) => enCurso(h, t)).map((h) => h.sel || h.titulo).join(',');
  return `${id}|${posicionCursor(filas, t)}|${ahora}|${historiaAbierta.has(id) ? 1 : 0}|${Math.floor(t)}`;
}
function historiaHtml(id) {
  const l = BE.L[id];
  const filas = filasHistoria(id);
  const sinAnio = visibles(hechosDe(id)).filter((h) => !h.tr);
  if (!filas.length) {
    return sinAnio.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Sin año</h3><ul class="hechos">${sinAnio.map((h) => `<li class="hecho"><button type="button" class="enlace-titulo" data-sel="${esc(h.sel)}">${esc(h.titulo)}</button></li>`).join('')}</ul></div></section>` : '';
  }
  const t = E.t;
  const pos = posicionCursor(filas, t);
  const todo = historiaAbierta.has(id) || filas.length <= VENTANA_HISTORIA + 2;
  let de = 0, a = filas.length;
  if (!todo) {
    de = Math.max(0, Math.min(pos - 4, filas.length - VENTANA_HISTORIA));
    a = de + VENTANA_HISTORIA;
  }
  const min = filas[0].tr[0], max = Math.max(...filas.map((h) => h.tr[1]));
  const desde = fmtAnio(Math.floor(min)), hasta = fmtAnio(Math.floor(max - 0.001));
  const rango = desde === hasta ? `Todo en ${desde}` : `De ${desde} a ${hasta}`;
  const partes = [];
  const cursor = () => `<li class="historia-cursor" id="historia-cursor"><span class="historia-fecha">${esc(fmtCursor(t))}</span><span class="historia-cursor__txt">Estás aquí</span></li>`;
  if (de > 0) partes.push(`<li class="historia-mas"><button type="button" class="enlace-texto" data-historia-todo="${esc(id)}">${de} ${de === 1 ? 'hecho anterior' : 'hechos anteriores'}</button></li>`);
  let fin = de > 0 ? Math.max(...filas.slice(0, de).map((h) => h.tr[1])) : -Infinity;
  for (let i = de; i < a; i++) {
    const h = filas[i];
    const hueco = h.tr[0] - fin;
    if (i > de && hueco >= HUECO_HISTORIA) partes.push(`<li class="historia-hueco"><span class="historia-fecha" aria-hidden="true">≈</span><span>${esc(distancia(hueco, false).replace(/ después$/, ''))} sin hechos aquí</span></li>`);
    if (i === pos) partes.push(cursor());
    const ahora = enCurso(h, t);
    const tipo = TIPO_HECHO[h.tipo] || 'hecho';
    const largo = fechaTexto(h);
    const medio = ((h.tr[0] + Math.min(h.tr[1], h.tr[0] + 1)) / 2).toFixed(4);
    partes.push(`<li class="historia-fila historia-fila--${h.tipo}${ahora ? ' historia-fila--ahora' : ''}${h.nivel === 2 ? ' historia-fila--n2' : ''}">
      <span class="historia-fecha">${esc(h.corto)}</span><span class="historia-marca" aria-hidden="true"></span>
      <span class="historia-texto"><button type="button" class="enlace-titulo historia-titulo" data-ir-t="${medio}"${h.sel ? ` data-ir-sel="${esc(h.sel)}"` : ''} title="Llevar el cursor a ${esc(largo)}">${esc(h.titulo)}</button>
      <span class="historia-meta">${ahora ? '<b class="historia-ahora">ahora</b> · ' : ''}${esc(tipo)}${largo && largo !== h.corto ? ` · ${esc(largo)}` : ''}${h.estado === 'pendiente' ? ' · <span class="sin-verificar">sin verificar</span>' : ''}${h.nivel === 2 ? ' · otra fuente que acompaña' : ''}</span></span></li>`);
    fin = Math.max(fin, h.tr[1]);
  }
  if (pos >= a && (todo || pos === filas.length)) partes.push(cursor());
  if (a < filas.length) partes.push(`<li class="historia-mas"><button type="button" class="enlace-texto" data-historia-todo="${esc(id)}">${filas.length - a} ${filas.length - a === 1 ? 'hecho posterior' : 'hechos posteriores'}</button></li>`);
  const boton = filas.length > VENTANA_HISTORIA + 2 ? `<button type="button" class="be-btn be-btn--sm be-btn--ghost historia-boton" data-historia-todo="${esc(id)}" aria-expanded="${todo}">${todo ? 'Ver solo lo cercano a la fecha' : `Ver los ${filas.length} hechos`}</button>` : '';
  return `<section class="be-card ficha-sec historia-sec" id="historia-lugar" data-lugar="${esc(id)}" data-clave="${esc(claveHistoria(id, t))}"><div class="be-card__pad">
      <h3 class="be-card__eyebrow">Toda la historia del lugar <b class="cuenta">${filas.length}</b></h3>
      <p class="be-muted nota-tira">${esc(conPunto(rango))} Pulsa un hecho para llevar el cursor a su fecha.</p>
      <ol class="historia" aria-label="Historia de ${esc(l.nombre)} por fechas">${partes.join('')}</ol>
      ${boton}
      ${sinAnio.length ? `<div class="sin-anio"><span class="be-caps">Sin año</span> ${sinAnio.map((h) => `<button type="button" class="be-chip" data-sel="${esc(h.sel)}">${esc(h.titulo)}</button>`).join('')}</div>` : ''}
    </div></section>`;
}
/** Con el cursor en otra fecha, solo se repinta la historia, y el foco vuelve a la fila que lo tenía. */
function actualizarHistoria() {
  const el = document.getElementById('historia-lugar');
  if (!el || E.sel?.tipo !== 'lugar' || el.dataset.lugar !== E.sel.id) return;
  if (el.dataset.clave === claveHistoria(E.sel.id, E.t)) return;
  const foco = el.contains(document.activeElement) ? (document.activeElement.dataset.irSel || document.activeElement.textContent) : null;
  const esBoton = document.activeElement?.matches?.('.historia-boton, .historia-mas button');
  el.outerHTML = historiaHtml(E.sel.id);
  if (foco == null) return;
  const nuevo = document.getElementById('historia-lugar');
  const destino = esBoton ? nuevo.querySelector('.historia-boton') : [...nuevo.querySelectorAll('.historia-titulo')].find((b) => (b.dataset.irSel || b.textContent) === foco);
  destino?.focus({ preventScroll: true });
}
document.addEventListener('click', (e) => {
  const b = e.target.closest?.('[data-historia-todo]');
  if (!b) return;
  const id = b.dataset.historiaTodo;
  if (historiaAbierta.has(id)) historiaAbierta.delete(id); else historiaAbierta.add(id);
  actualizarHistoria();
});

// ---- La forma de una zona (shape): qué es, de dónde sale y que es nuestra ----
const RUMBOS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE'];
const ARTICULO = { circle: 'un', ellipse: 'una', box: 'un', polygon: 'un' };
const km = (x) => Math.round(x).toLocaleString('es-ES');
/** «elipse de unos 80 × 20 km, alargada hacia el N», «rectángulo de unos 40 km de este a oeste y 60 de norte a sur»,
    «contorno de 7 vértices, por Sidón, Dan, Gaza y Jope». */
function textoForma(f) {
  if (f.type === 'circle') return `círculo de unos ${km(f.radius_km)} km de radio`;
  if (f.type === 'ellipse') return `elipse de unos ${km(2 * f.radii_km[0])} × ${km(2 * f.radii_km[1])} km, alargada hacia el ${RUMBOS[Math.round(f.bearing / 22.5) % 8]}`;
  if (f.type === 'box') {
    const [[o, s], [e, n]] = f.bbox;
    return `rectángulo de unos ${km((e - o) * 111.2 * Math.cos(((s + n) / 2) * Math.PI / 180))} km de este a oeste y ${km((n - s) * 111.2)} de norte a sur`;
  }
  const nombres = (f.vertices || []).filter((v) => typeof v === 'string').map((v) => BE.L[v]?.nombre || v);
  return `contorno de ${f.vertices.length} vértices${nombres.length ? `, por ${nombres.join(', ').replace(/, ([^,]*)$/, ' y $1')}` : ''}`;
}
/** Sección de la ficha de un lugar con punto que tiene forma: la forma, su razón, su cuenta y sus fuentes. */
function formaHtml(l) {
  const f = l.shape;
  if (!f) return '';
  return `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Qué abarca</h3>
    <p class="be-card__body">En el mapa, ${ARTICULO[f.type]} ${esc(textoForma(f))}.</p>
    ${f.reason ? `<p class="be-row__meta">${esc(f.reason)}</p>` : ''}
    ${f.note ? `<p class="be-row__meta"><span class="insignia-calculado">calculado</span> ${esc(f.note)}</p>` : ''}
    ${BE.insigniaHtml(f.sources)}
    <p class="be-note"><span>Es un contorno aproximado y nuestro, sacado de lo que la fuente describe con palabras: no es una frontera trazada.</span></p>
  </div></section>`;
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
  const geo = (c) => { const g = c.geometria; return c.shape ? `zona dibujada como ${ARTICULO[c.shape.type]} ${textoForma(c.shape)}` : g.tipo === 'zona' ? `zona de unos ${Math.round(g.radio_km)} km de radio` : g.tipo === 'franja' ? 'franja entre dos puntos' : 'punto'; };
  return `<section class="be-card ficha-sec"><div class="be-card__pad">
    <h3 class="be-card__eyebrow">Candidatos y su base <b class="cuenta">${vis.length}</b></h3>
    <ul class="candidatos">${vis.map(({ c, i }) => {
      const s = BE.CANDIDATO[c.estado] || BE.CANDIDATO.alternativa;
      const calculado = /calcul/i.test(c.nota || '');
      return `<li><button type="button" class="candidato${foco && foco.lugar === l.id && foco.i === i ? ' candidato--foco' : ''}" data-cand="${esc(l.id)}|${i}" aria-label="${esc(`Ver en el mapa: ${c.nombre}`)}">
        <span class="leyenda-cand leyenda-cand--${c.estado}" style="--cand:${s.color}" aria-hidden="true"></span>
        <span class="candidato-texto"><b>${esc(c.nombre)}</b><span class="be-row__meta">${esc(geo(c))}${c.razon ? ` · ${esc(c.razon)}` : ''}</span>
        ${c.nota ? `<span class="be-row__meta">${calculado ? '<span class="insignia-calculado">calculado</span> ' : ''}${esc(c.nota)}</span>` : ''}
        ${c.shape ? `<span class="be-row__meta">Forma: ${esc(c.shape.reason || '')} <span class="insignia-calculado">calculado</span> ${esc(c.shape.note || '')}</span>` : ''}</span>
        <span class="estado-cand estado-cand--${c.estado}" style="--cand:${s.color}">${esc(s.corto)}</span></button>${BE.insigniaHtml([...new Set([...(c.fuentes || []), ...(c.shape?.sources || [])])])}</li>`;
    }).join('')}</ul>
    ${ocultos ? `<p class="be-muted oculto-n2">${ocultos} ${ocultos === 1 ? 'candidato de otra fuente oculto' : 'candidatos de otras fuentes ocultos'} por el filtro «Solo fuentes principales».</p>` : ''}
    <p class="be-note be-note--uncertain"><span><b>¿Por qué no hay un punto?</b> Ni la Biblia ni las fuentes enlazadas dan un sitio exacto. Dibujamos las zonas y los candidatos que se citan, cada uno con su base; un punto haría creer que se sabe.</span></p>
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
  // Si el tipo ya dice que es una región, la nota no lo repite («Región · el punto solo la representa»).
  const prec = { punto: '', zona: REGIONES.has(l.tipo) ? ' · el punto solo la representa' : ' · región: el punto solo la representa', incierto: ' · ubicación incierta' }[l.precision] || '';
  const incierta = cands || l.precision === 'incierto';
  const deCarta = (c) => ((c.escritor || 'pablo') === 'pablo' ? '' : `de ${persona(c.escritor)} · `);
  const noSabemos = [...(l.no_afirmamos || [])];
  if (cands) noSabemos.unshift(`No sabemos con seguridad dónde estaba ${l.nombre}.`);
  else if (l.precision === 'incierto') noSabemos.unshift(`No se conoce el sitio exacto de ${l.nombre}: el punto es aproximado.`);
  const tira = historiaHtml(id);
  return `${BE.migas('Lugares', l.nombre)}${BE.cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow"><span class="icono-lugar" aria-hidden="true"></span>${esc(tipo + prec)}</div>${incierta ? '<span class="insignia-incierta">identificación incierta</span>' : ''}
      <h2 class="be-card__title">${esc(l.nombre)}</h2>
      ${BE.nombresHtml(l)}
      ${l.resumen ? `<p class="be-card__body">${esc(l.resumen)}</p>` : ''}
      ${BE.enlacesHtml(l.enlaces)}
    </div><div class="be-card__foot">${BE.estadoHtml(l.estado)}<span class="be-spacer"></span>${l.coord_url ? `<a class="be-wol" href="${esc(l.coord_url)}" ${EXTERNO} title="Solo tomamos el punto, nunca su identificación">Coordenada: ${/^openbible/.test(l.coord_fuente || '') ? 'OpenBible.info (CC BY 4.0)' : esc(String(l.coord_fuente || 'fuente').split(':')[0])}</a>` : ''}</div></section>
    ${formaHtml(l)}
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

/** Hechos fechados del lugar que caen en la vista de la línea de tiempo. */
const hechosEnVista = (hs) => hs.filter((h) => h.tr[0] < E.vista[1] && h.tr[1] > E.vista[0]);
/** Un suceso que abarca más de medio siglo («Una colonia judía vive en Babilonia», todo el siglo I) no dice qué pasa
    aquí en una fecha concreta: ni retiene el cursor ni cuenta como el hecho más cercano (be-64b.7). Las estancias de
    personas, los reinados y los periodos, aunque sean largos, sí cuentan. */
const sucesoLargo = (h) => h.tipo === 'evento' && h.tr[1] - h.tr[0] > 50;
/** Fecha a la que salta el cursor al elegir un lugar: ninguna si ya pasa algo aquí o no tiene nada fechado. Si nada suyo
    cae en la vista (Edén elegido en 1473 a.e.c.), la sede de una potencia va al inicio de esa potencia (Babilonia
    elegida en 33 e.c. va a 632 a.e.c.) y cualquier otro lugar a su primer hecho, como una persona; si algo cae en la
    vista, el hecho más cercano. */
function momentoLugar(id) {
  const todos = visibles(hechosDe(id)).filter((h) => h.tr);
  if (!todos.length) return null;
  const cortos = todos.filter((h) => !sucesoLargo(h));
  const hs = cortos.length ? cortos : todos;
  const t = E.t;
  if (hs.some((h) => t >= h.tr[0] && t < h.tr[1])) return null;
  const en = (h) => (h.tr[1] - h.tr[0] > 3 ? h.tr[0] + 0.01 : (h.tr[0] + h.tr[1]) / 2);
  if (!hechosEnVista(hs).length) {
    const pot = (BE.D.periodos || []).find((p) => p.tipo === 'potencia' && p.lugares?.[0] === id);
    const trp = pot && BE.tramoPeriodo(pot);
    const a = trp && (t < trp[0] || t >= trp[1]) ? BE.inicioPeriodo(pot) : null;
    if (a != null) return a + 0.01;
    return en(hs.reduce((m, x) => (x.tr[0] < m.tr[0] || (x.tr[0] === m.tr[0] && x.tr[1] < m.tr[1]) ? x : m)));
  }
  const d = (h) => (t < h.tr[0] ? h.tr[0] - t : t - h.tr[1]);
  const h = hs.reduce((m, x) => (d(x) < d(m) ? x : m));
  return h.tr[1] - h.tr[0] > 3 ? (t < h.tr[0] ? h.tr[0] + 0.01 : h.tr[1] - 0.01) : (h.tr[0] + h.tr[1]) / 2;
}
/** ¿Tiene el lugar hechos fechados y ninguno en la vista? Entonces elegirlo en el mapa también mueve el cursor. */
const lugarFueraDeVista = (id) => {
  const todos = visibles(hechosDe(id)).filter((h) => h.tr);
  const cortos = todos.filter((h) => !sucesoLargo(h));
  return todos.length > 0 && !hechosEnVista(cortos.length ? cortos : todos).length;
};

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
      // Cuántos hechos fechados tiene; sin ninguno no se dice «0» (be-u66.3), y uno es «1 hecho», no «1 paradas».
      const n = hechosDe(l.id).length;
      const cuantos = n ? `${n} ${n === 1 ? 'hecho' : 'hechos'}` : '';
      out.push({ grupo: 'Lugares', sel: { tipo: 'lugar', id: l.id }, titulo: l.nombre, meta: [hoy ? `hoy ${hoy}` : '', BE.candidatosDe(l) || l.precision === 'incierto' ? 'ubicación incierta' : '', cuantos].filter(Boolean).join(' · '), puntos: p });
    }
    return out;
  },
});

// La ficha de un lugar cambia con el cursor: solo se repinta el bloque «Qué pasaba aquí ahora» y el cursor de la tira.
BE.pintores.push((c) => {
  if (E.sel?.tipo !== 'lugar' || !(c.cursor || c.panel)) return;
  actualizarHistoria();
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

Object.assign(BE, { hechosDe, lugarFueraDeVista });
})();
