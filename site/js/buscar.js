/* biblical-earth · búsqueda y enlaces: la caja de arriba y su lista de resultados. Cada tipo registrado aporta sus
   resultados con buscar(q, nq, puntuar); aquí se añaden los años («607 a.e.c.», B-03), las preguntas de forma fija
   («Babilonia en 30», «Loida y Pablo», B-04), la vista previa del resultado activo (B-01), las fechas de cada
   resultado (B-06) y las sugerencias cuando no hay nada. También viven aquí atrás y adelante de verdad (B-15),
   «Citar» (B-11) y el anuncio para lectores de pantalla (D-08). Dueño durante el reparto: app-estudio. */
'use strict';
(() => {
const BE = window.BE;
const { E, norm, esc, $, seleccionar, limpiarSeleccion, fechaCorta, fmtAnio, fmtCursor } = BE;

// Orden de los grupos en la lista. Un grupo que no está aquí va al final.
const ORDEN_GRUPOS = ['Preguntas', 'Fechas', 'Pasajes', 'Personas', 'Lugares', 'Libros', 'Cartas', 'Viajes', 'Sucesos', 'Periodos', 'Hallazgos', 'Recorridos'];
const ordenGrupo = (g) => { const i = ORDEN_GRUPOS.indexOf(g); return i < 0 ? ORDEN_GRUPOS.length : i; };
const TIPO_TEXTO = { persona: 'persona', lugar: 'lugar', carta: 'carta', viaje: 'viaje', evento: 'suceso', periodo: 'periodo', pasaje: 'capítulo', libro: 'libro', hallazgo: 'hallazgo', recorrido: 'recorrido', parada: 'parada' };

function puntuador(nq) {
  return (textos) => {
    let mejor = 0;
    for (const t of textos) {
      const n = norm(t);
      if (!n) continue;
      if (n === nq) mejor = Math.max(mejor, 100);
      else if (n.startsWith(nq)) mejor = Math.max(mejor, 80);
      else if (n.split(/[\s-]+/).some((p) => p.startsWith(nq))) mejor = Math.max(mejor, 60);
      else if (nq.length >= 3 && n.includes(nq)) mejor = Math.max(mejor, 30);
    }
    return mejor;
  };
}
/** Puntuación estricta para las preguntas de forma fija: el nombre entero (100) o el nombre al principio y hasta el
    final de una palabra (90). «Judá» no es «Judas Barsabás»; «Pablo» sí es «Pablo de Tarso». */
function puntuadorEstricto(nq) {
  return (textos) => {
    let mejor = 0;
    for (const t of textos) {
      const n = norm(t);
      if (!n) continue;
      if (n === nq) return 100;
      if (n.startsWith(nq) && /^[\s,(-]/.test(n.slice(nq.length))) mejor = 90;
    }
    return mejor;
  };
}
/** Resultados de todos los tipos registrados, sin repetir una misma selección. */
function resultadosTipos(q, fabrica = puntuador) {
  const nq = norm(q).trim();
  if (!nq) return [];
  const puntuar = fabrica(nq);
  const porSel = new Map();
  for (const def of BE.tipos.values()) {
    if (!def.buscar) continue;
    for (const r of def.buscar(q, nq, puntuar) || []) {
      const k = BE.selTexto(r.sel);
      if (!porSel.has(k) || porSel.get(k).puntos < r.puntos) porSel.set(k, r);
    }
  }
  return [...porSel.values()];
}

// ---------------------------------------------------------------------------
// Años (B-03) y preguntas de forma fija (B-04)
// ---------------------------------------------------------------------------
/** «607 a.e.c.», «c. 51 e.c.», «51», «4026 aec» → año astronómico (537 a.e.c. = −536), o null. */
function leerAnio(s) {
  const m = norm(s).trim().replace(/[¿?]/g, '').match(/^(?:c\.?\s*|hacia\s+|el\s+|en\s+|ano\s+)*(\d{1,4})\s*(a\.?\s*e\.?\s*c\.?|a\.?\s*c\.?|e\.?\s*c\.?|d\.?\s*c\.?)?$/);
  if (!m) return null;
  const n = +m[1];
  const antes = m[2] && /^a/.test(m[2].replace(/[\s.]/g, ''));
  if (antes) return n >= 1 ? 1 - n : null;
  return n;
}
const enRango = (y) => y >= BE.T_MIN - 1 && y <= BE.T_MAX;
/** Una entidad por su nombre, exacto o por el principio hasta el final de una palabra: persona, lugar, periodo o suceso. */
function entidad(texto, tipos = ['persona', 'lugar', 'periodo', 'evento', 'libro']) {
  const rs = resultadosTipos(texto, puntuadorEstricto).filter((r) => tipos.includes(r.sel.tipo) && r.puntos >= 90);
  rs.sort((a, b) => b.puntos - a.puntos || tipos.indexOf(a.sel.tipo) - tipos.indexOf(b.sel.tipo));
  return rs[0] || null;
}
/** Año central de lo que vivió o duró una entidad («en tiempos de Jesús»). */
function tramoEntidad(sel) {
  const o = objetoSel(sel);
  const f = o?.fecha || o?.abarca;
  if (f && (f.desde != null || f.hasta != null)) return [f.desde ?? f.hasta, (f.hasta ?? f.desde) + 1];
  if (sel.tipo === 'persona') {   // sin fecha propia: lo que abarcan sus conexiones con fecha
    const trs = BE.aristas(sel.id).map((a) => a.tr).filter((tr) => tr && Number.isFinite(tr[0]) && Number.isFinite(tr[1]));
    if (trs.length) return [Math.min(...trs.map((x) => x[0])), Math.max(...trs.map((x) => x[1]))];
  }
  const t = BE.momentoDe(sel);
  return t != null ? [t, t + 1] : null;
}
function saltarA(t, sel) {
  BE.historia.marcar();
  if (sel) seleccionar(sel, { mover: false });
  BE.setT(t);
  BE.asegurarVisible(BE.E.t, true);
}
function preguntas(q) {
  const out = [];
  const nq = norm(q).trim().replace(/[¿?]/g, '').replace(/\s+/g, ' ');
  // Un año suelto
  const y = leerAnio(q);
  if (y != null) {
    out.push({ grupo: 'Fechas', titulo: `Ir a ${fmtAnio(y)}`, meta: enRango(y) ? 'mueve el cursor de tiempo y enseña quién había' : 'fuera del tramo que cubre la línea de tiempo', puntos: 900, accion: () => saltarA(y + 0.5) });
    return out;
  }
  // «X y Y», «X ↔ Y», «de X a Y»: conexión entre dos (G-05)
  let m = nq.match(/^(?:como se relaciona\s+)?(.+?)\s+(?:y|con|<->|↔|-)\s+(.+)$/);
  if (m) {
    const a = entidad(m[1], ['persona', 'lugar']), b = entidad(m[2], ['persona', 'lugar']);
    if (a && b && BE.selTexto(a.sel) !== BE.selTexto(b.sel)) {
      out.push({ grupo: 'Preguntas', titulo: `¿Cómo se relaciona ${a.titulo} con ${b.titulo}?`, meta: 'caminos con cada paso, su fecha y su referencia', puntos: 950, sel: a.sel, accion: () => BE.conexion.abrir(BE.selTexto(a.sel), BE.selTexto(b.sel)) });
    }
  }
  // «qué pasaba en X en tiempos de Y», «quién había en X en la época de Y»
  m = nq.match(/^(?:que pasaba en |quien habia en |quienes habia en |quien estaba en |donde estaba )?(.+?) en (?:tiempos|tiempo|la epoca|epoca|vida) de (.+)$/);
  if (m) {
    const a = entidad(m[1]), b = entidad(m[2], ['persona', 'periodo', 'evento']);
    const tr = b && tramoEntidad(b.sel);
    if (a && tr) {
      const t = Math.max(tr[0], Math.min(tr[1] - 0.01, (tr[0] + tr[1]) / 2));
      out.push({ grupo: 'Preguntas', titulo: `${a.titulo} en tiempos de ${b.titulo}`, meta: `abre ${a.titulo} en ${fmtAnio(Math.floor(t))}, dentro de ${fechaCorta({ desde: Math.floor(tr[0]), hasta: Math.ceil(tr[1]) - 1 })}`, puntos: 950, sel: a.sel, accion: () => saltarA(t, a.sel) });
    }
    return out;
  }
  // «Babilonia en 30», «quién había en Judá en 520 a.e.c.», «dónde estaba Pablo en 51»
  m = nq.match(/^(?:que pasaba en |quien habia en |quienes habia en |quien estaba en |donde estaba )?(.+?) en (?:el (?:ano )?)?(.+)$/);
  if (m) {
    const a = entidad(m[1]), y2 = leerAnio(m[2]);
    if (a && y2 != null) out.push({ grupo: 'Preguntas', titulo: `${a.titulo} en ${fmtAnio(y2)}`, meta: `abre la ficha con el cursor en ${fmtAnio(y2)}`, puntos: 950, sel: a.sel, accion: () => saltarA(y2 + 0.5, a.sel) });
    // Sin ese nombre en los datos no se adivina otro parecido: se ofrece la fecha, que ya enseña quién había.
    else if (y2 != null && enRango(y2)) out.push({ grupo: 'Fechas', titulo: `Ir a ${fmtAnio(y2)}`, meta: 'ese nombre no está en los datos como lugar ni persona; la fecha enseña quién había', puntos: 900, accion: () => saltarA(y2 + 0.5) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Datos de una selección: para la fecha de cada resultado (B-06) y para «Citar» (B-11)
// ---------------------------------------------------------------------------
function objetoSel(sel) {
  if (!sel) return null;
  const D = BE.D, id = sel.id;
  switch (sel.tipo) {
    case 'lugar': return BE.L[id];
    case 'persona': return BE.PERS[id];
    case 'evento': return (D.eventos || []).find((x) => x.id === id);
    case 'periodo': return (D.periodos || []).find((x) => x.id === id);
    case 'carta': return (D.cartas || []).find((x) => x.id === id);
    case 'viaje': return (D.viajes || []).find((x) => x.id === id);
    case 'hallazgo': return (D.hallazgos || []).find((x) => x.id === id);
    case 'recorrido': return (D.recorridos || []).find((x) => x.id === id);
    case 'libro': return BE.libroPorSlug?.(id);
    case 'parada': return BE.P.find((s) => s.key === id)?.p;
    default: return null;
  }
}
function fechaSel(sel) {
  const o = objetoSel(sel);
  const f = o?.fecha || o?.fecha_objeto;
  if (f && (f.desde != null || f.hasta != null)) return fechaCorta(f);
  if (sel.tipo === 'recorrido' && o?.paradas?.length) { const ts = o.paradas.map((p) => Math.floor(p.t)); return fechaCorta({ desde: Math.min(...ts), hasta: Math.max(...ts) }); }
  return '';
}

function buscar(q) {
  const out = [...preguntas(q), ...resultadosTipos(q)];
  for (const r of out) if (r.sel && r.fechaTexto == null) r.fechaTexto = fechaSel(r.sel);
  out.sort((a, b) => ordenGrupo(a.grupo) - ordenGrupo(b.grupo) || b.puntos - a.puntos || a.titulo.localeCompare(b.titulo, 'es'));
  const cuenta = {};   // máximo 6 por grupo
  return out.filter((r) => (cuenta[r.grupo] = (cuenta[r.grupo] || 0) + 1) <= 6);
}

// Sugerencias cuando no sale nada: los nombres más parecidos, a una o dos letras de distancia.
function distancia(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function sugerencias(q) {
  const nq = norm(q).trim();
  if (nq.length < 3) return [];
  const nombres = new Map();
  const poner = (n, tipo) => { if (n && !nombres.has(norm(n))) nombres.set(norm(n), { n, tipo }); };
  Object.values(BE.PERS).forEach((p) => poner(p.nombre, 'persona'));
  Object.values(BE.L).forEach((l) => poner(l.nombre, 'lugar'));
  (BE.LIBROS || []).forEach((l) => poner(l.nombre, 'libro'));
  (BE.D.cartas || []).forEach((c) => poner(c.libro, 'carta'));
  const max = nq.length <= 5 ? 1 : 2;
  return [...nombres.entries()].map(([k, v]) => ({ ...v, d: distancia(nq, k) })).filter((x) => x.d <= max).sort((a, b) => a.d - b.d).slice(0, 3);
}

// ---------------------------------------------------------------------------
// Lista de resultados
// ---------------------------------------------------------------------------
let resultados = [], activo = 0, previa = false;
function pintarResultados() {
  const caja = $('#resultados'), q = $('#q');
  if (!q.value.trim()) { cerrarResultados(); return; }
  if (!resultados.length) {
    const sug = sugerencias(q.value);
    caja.innerHTML = `<div class="sin-resultados">No encontramos «${esc(q.value.trim())}».${sug.length ? ` ¿Querías decir ${sug.map((s) => `<button type="button" class="enlace-texto" data-sugerencia="${esc(s.n)}">${esc(s.n)}</button>`).join(', ')}?` : ''}
      <span class="sin-resultados__pista">Prueba con una persona («Pedro»), un lugar («Filipos»), un capítulo («Hch 16»), un año («607 a.e.c.») o dos nombres («Loida y Pablo»).</span></div>`;
  } else {
    let grupo = '';
    caja.innerHTML = resultados.map((r, i) => {
      const cab = r.grupo !== grupo ? `<div class="be-results__group be-caps" role="presentation">${esc(r.grupo)}</div>` : '';
      grupo = r.grupo;
      const tipoNodo = r.sel ? (BE.tipo(r.sel.tipo)?.nodo || 'evento') : 'evento';
      const inicial = r.accion && !r.sel ? (r.grupo === 'Fechas' ? '◷' : '?') : r.titulo[0];
      return `${cab}<div class="be-result${i === activo ? ' be-result--active' : ''}" role="option" id="res-${i}" aria-selected="${i === activo}" data-i="${i}">
        <span class="be-node be-node--${tipoNodo} be-node--sm" aria-hidden="true">${esc(inicial)}</span>
        <span class="res-texto"><span class="be-result__title">${marcar(r.titulo)}${r.etiqueta ? ` <span class="res-etiqueta">${esc(r.etiqueta)}</span>` : ''}</span><span class="be-row__meta">${r.sel && TIPO_TEXTO[r.sel.tipo] && !r.accion ? `${TIPO_TEXTO[r.sel.tipo]}${r.meta ? ' · ' : ''}` : ''}${esc(r.meta || '')}</span></span>
        ${r.fechaTexto && !norm(r.meta || '').includes(norm(r.fechaTexto)) ? `<span class="res-fecha">${esc(r.fechaTexto)}</span>` : ''}</div>`;
    }).join('');
  }
  caja.hidden = false;
  q.setAttribute('aria-expanded', 'true');
  q.setAttribute('aria-activedescendant', resultados.length ? `res-${activo}` : '');
  $('#caja-busqueda').classList.add('be-search--focus');
  vistaPrevia();
}
function marcar(titulo) {
  const nq = norm($('#q').value).trim();
  const n = norm(titulo);
  const i = nq ? n.indexOf(nq) : -1;
  if (i < 0) return esc(titulo);
  return `${esc(titulo.slice(0, i))}<mark>${esc(titulo.slice(i, i + nq.length))}</mark>${esc(titulo.slice(i + nq.length))}`;
}
/** El resultado activo se ve ya en el mapa mientras se elige (pantalla 11), sin tener que pulsar Intro. */
function vistaPrevia() {
  const r = resultados[activo];
  if (!r?.sel || !BE.existe(r.sel.tipo, r.sel.id)) { if (previa) { previa = false; BE.mapa.resaltar(null); } return; }
  const ls = [...BE.implicados(r.sel).lugares];
  previa = true;
  BE.mapa.resaltar(ls.length ? ls : null);
}
function cerrarResultados() {
  const caja = $('#resultados');
  caja.hidden = true;
  $('#q').setAttribute('aria-expanded', 'false');
  $('#caja-busqueda').classList.remove('be-search--focus');
  if (previa) { previa = false; BE.mapa.resaltar(null); }
}
function elegir(i) {
  const r = resultados[i];
  if (!r) return;
  $('#q').value = r.titulo;
  cerrarResultados();
  if (r.accion) r.accion();
  else seleccionar(r.sel);
  $('#q').blur();
}
function iniciarBusqueda() {
  const q = $('#q');
  q.addEventListener('input', () => { resultados = buscar(q.value); activo = 0; pintarResultados(); });
  q.addEventListener('focus', () => { if (q.value.trim()) { resultados = buscar(q.value); pintarResultados(); } });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); activo = Math.min(activo + 1, resultados.length - 1); pintarResultados(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activo = Math.max(activo - 1, 0); pintarResultados(); }
    else if (e.key === 'Enter') { e.preventDefault(); elegir(activo); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); limpiarSeleccion(); q.blur(); }
  });
  q.addEventListener('blur', () => setTimeout(cerrarResultados, 150));
  $('#resultados').addEventListener('pointerdown', (e) => {
    const s = e.target.closest('[data-sugerencia]');
    if (s) { e.preventDefault(); q.value = s.dataset.sugerencia; resultados = buscar(q.value); activo = 0; pintarResultados(); return; }
    const o = e.target.closest('[data-i]');
    if (o) { e.preventDefault(); elegir(+o.dataset.i); }
  });
  $('#filtro').addEventListener('click', limpiarSeleccion);
}
/** Escribe en la caja y abre la lista, como si lo hubiera tecleado el usuario (portada, ejemplos). */
function buscarTexto(texto) {
  const q = $('#q');
  q.value = texto;
  q.focus();
  resultados = buscar(texto); activo = 0; pintarResultados();
}

// ---------------------------------------------------------------------------
// Atrás y adelante de verdad (B-15). base.js escribe la dirección con replaceState; justo antes de que lo haga,
// guardamos una copia de la entrada actual con pushState. Así la escritura siguiente sustituye la copia y la
// entrada anterior queda en el historial con la vista de antes.
// ---------------------------------------------------------------------------
const historia = (() => {
  let clave = null, navegando = 0, marcado = false;
  const claveActual = () => [BE.selTexto(E.sel), ...BE.parametros.filter((x) => x.historia).map((x) => x.escribir() ?? '')].join('|');
  function empujar() { history.pushState(null, '', location.href); }
  BE.pintores.push(() => {
    const k = claveActual();
    if (clave === null) { clave = k; return; }   // arranque: la primera vista no crea entrada
    if (k === clave) return;
    clave = k;
    if (navegando > performance.now() || marcado) { marcado = false; return; }
    empujar();
  });
  window.addEventListener('popstate', () => { navegando = performance.now() + 600; BE.aplicarHash(false); });
  return {
    /** Un salto de fecha que merece su entrada (un año buscado, una parada): se guarda la vista de antes. */
    marcar() { if (clave !== null && !(navegando > performance.now())) { empujar(); marcado = true; setTimeout(() => { marcado = false; }, 100); } },
  };
})();

// ---------------------------------------------------------------------------
// «Citar» (B-11) y «Relacionar con…» en cualquier ficha, y el anuncio para lectores de pantalla (D-08)
// ---------------------------------------------------------------------------
function textoCita(sel) {
  const o = objetoSel(sel) || {};
  const nombre = BE.nombreSel(sel);
  const refs = o.referencia || (o.pasajes || []).join('; ') || (sel.tipo === 'pasaje' ? nombre : '');
  const fuentes = (o.fuentes || []).map((id) => BE.D.fuentes?.[id]).filter(Boolean).slice(0, 2).map((f) => `${f.titulo} (${f.url})`);
  let wol = '';
  const c = BE.citas(refs)[0] || (sel.tipo === 'pasaje' ? { libro: BE.pasajeDeId(sel.id).libro, cap: BE.pasajeDeId(sel.id).cap } : null);
  if (c) wol = BE.urlCapitulo(c.libro, c.cap);
  return [`${nombre}${o.resumen ? `: ${o.resumen}` : ''}`, refs && `Referencias: ${refs}.`, wol && `Leer en wol.jw.org: ${wol}`, fuentes.length && `Fuentes: ${fuentes.join('; ')}.`, `Vista en biblical-earth: ${location.href}`].filter(Boolean).join('\n');
}
function accionesFicha() {
  const cuerpo = $('#panel-cuerpo');
  if (!E.sel || !cuerpo || cuerpo.querySelector('.acciones-estudio')) return;
  const primera = cuerpo.querySelector('.be-card');
  if (!primera) return;
  const s = BE.selTexto(E.sel);
  const relacionar = ['lugar'].includes(E.sel.tipo) ? `<button type="button" class="be-btn be-btn--sm be-btn--ghost" data-relacionar="${esc(s)}">Relacionar con…</button>` : '';
  primera.insertAdjacentHTML('afterend', `<div class="acciones-estudio">${relacionar}<button type="button" class="be-btn be-btn--sm be-btn--ghost" data-citar="${esc(s)}" title="Copia el resumen, las referencias, la fuente y el enlace a esta vista">Citar</button></div>`);
}
BE.pintores.push(accionesFicha);
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-citar]');
  if (!b) return;
  const sel = BE.parseSel(b.dataset.citar);
  if (!sel) return;
  BE.guardarHash();
  await new Promise((r) => setTimeout(r, 300));
  const texto = textoCita(sel);
  try { await navigator.clipboard.writeText(texto); BE.avisar('Cita copiada: resumen, referencias, fuente y enlace.'); }
  catch { window.prompt('Copia la cita:', texto); }
});

let anuncioTimer = 0, ultimoAnuncio = '';
function anunciar() {
  clearTimeout(anuncioTimer);
  anuncioTimer = setTimeout(() => {
    if (E.play) return;
    const partes = [fmtCursor(E.t) + '.'];
    if (E.sel) partes.push(`${BE.nombreSel(E.sel)}.`);
    const w = BE.PERS.pablo && BE.lugarActual?.('pablo', E.t);
    if (w) partes.push(`Pablo ${w.parada ? 'en' : 'de camino desde'} ${BE.L[w.id].nombre}.`);
    const txt = partes.join(' ');
    if (txt === ultimoAnuncio) return;
    ultimoAnuncio = txt;
    let r = document.getElementById('anuncio-estudio');
    if (!r) { r = document.createElement('div'); r.id = 'anuncio-estudio'; r.className = 'sr-only'; r.setAttribute('aria-live', 'polite'); r.setAttribute('role', 'status'); document.body.appendChild(r); }
    r.textContent = txt;
  }, 900);
}
BE.pintores.push((c) => { if (c.cursor || c.panel) anunciar(); });

Object.assign(BE, { buscar, cerrarResultados, iniciarBusqueda, buscarTexto, leerAnio, objetoSel, fechaSel, historia, textoCita });
})();
