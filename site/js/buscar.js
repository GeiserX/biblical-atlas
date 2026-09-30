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
const ORDEN_GRUPOS = ['Preguntas', 'Fechas', 'Meses hebreos', 'Pasajes', 'Personas', 'Lugares', 'Libros', 'Cartas', 'Viajes', 'Sucesos', 'Periodos', 'Hallazgos', 'Recorridos'];
const ordenGrupo = (g) => { const i = ORDEN_GRUPOS.indexOf(g); return i < 0 ? ORDEN_GRUPOS.length : i; };
// El texto de ayuda de una caja de búsqueda: el más largo que quepa entero de los que se le dan, y si ninguno cabe,
// ninguno. Cortado se leía «Buscar pe» en el móvil y «Buscar persona, lugar» en la tableta.
// BE.ajustarAyuda(input, ...cortos) lo usa también la portada.
const lienzoAyuda = document.createElement('canvas').getContext('2d');
BE.ajustarAyuda = (input, ...cortos) => {
  if (!input || !lienzoAyuda) return;
  const textos = [input.placeholder, ...cortos];
  const poner = () => {
    lienzoAyuda.font = getComputedStyle(input).font;
    input.placeholder = textos.find((t) => lienzoAyuda.measureText(t).width <= input.clientWidth - 4) || '';
  };
  if (window.ResizeObserver) new ResizeObserver(poner).observe(input);
  document.fonts?.ready.then(poner);
};
BE.ajustarAyuda(document.getElementById('q'), 'Persona, lugar o año', 'Buscar');
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
// ---------------------------------------------------------------------------
// Meses hebreos (be-64b.8): «Adar», «Veadar», «nisán 33», «14 nisán 33». Llevan al mes en la línea de tiempo o a su
// explicación en la página del calendario.
// ---------------------------------------------------------------------------
/** Todos los nombres de cada mes (el de siempre, los de otras épocas y los otros), normalizados. */
function nombresMes(m) {
  return [...new Set([m.nombre, ...(m.otros_nombres || []), ...(m.nombres || []).map((n) => n.nombre)].filter(Boolean).map((x) => norm(x)))];
}
/** Meses cuyo nombre es `palabra` (exacto) o empieza por ella (con tres letras o más). */
function mesesPorNombre(palabra) {
  const meses = BE.calendario?.().meses || [];
  const exactos = meses.filter((m) => nombresMes(m).includes(palabra));
  if (exactos.length || palabra.length < 3) return { meses: exactos, exacto: true };
  return { meses: meses.filter((m) => nombresMes(m).some((n) => n.startsWith(palabra))), exacto: false };
}
/** El mes `m` del año hebreo que contiene t; Veadar, que solo tienen algunos años, en el año más cercano que lo tenga. */
function mesCercano(m, t) {
  const d = BE.diaHebreo(t);
  if (!d) return null;
  let mejor = null;
  for (let k = -3; k <= 3; k++) {
    const A = BE.anioHebreo(d.anio + k);
    const M = A.meses[m.orden - 1];
    if (!M || M.mes.id !== m.id) continue;
    const dist = t >= M.a && t < M.b ? 0 : Math.min(Math.abs(M.a - t), Math.abs(M.b - t));
    if (!mejor || dist < mejor.dist) mejor = { t: M.a, anio: A.anio, M, dist };
  }
  return mejor;
}
/** Nombre del mes en la época del año hebreo que empieza en y (Abib antes del exilio, Nisán después). */
const nombreMesEn = (m, y) => BE.nombreMes?.(m, y)?.nombre || m.nombre;
function irAMes(t, escala) {
  BE.historia.marcar();
  BE.irA ? BE.irA(t, escala) : BE.setT(t);
  BE.asegurarVisible(BE.E.t, true);
}
function enlaceMes(m) {
  const vista = BE.textoHash ? BE.textoHash() : location.hash.slice(1);
  location.href = `calendario.html${location.search}#desde=${encodeURIComponent(vista)}&mes=${encodeURIComponent(m.id)}`;
}
function preguntasMes(nq) {
  // «segundo Adar» es lo que quiere decir Veadar; «de adar» es como lo dice quien lo oyó y no lo leyó.
  const q = nq.replace(/\b(?:segundo\s+adar|adar\s+segundo|adar\s+ii)\b/, 'veadar');
  const r = q.replace(/^(?:el\s+)?(?:mes\s+)?(?:de\s+)?/, '').match(/^(?:(\d{1,2})\s+(?:de\s+)?)?([a-z]+)(?:\s+(?:de\s+|del\s+(?:ano\s+)?|en\s+)?(.+))?$/);
  if (!r) return [];
  const dia = r[1] ? +r[1] : null, anio = r[3] != null ? leerAnio(r[3]) : null;
  if (r[3] != null && anio == null) return [];
  if (dia != null && (dia < 1 || dia > 30)) return [];
  const { meses, exacto } = mesesPorNombre(r[2]);
  if (!meses.length || (!exacto && (dia != null || anio != null))) return [];
  const out = [];
  // «Ab» suelto, sin día ni año, es también el principio de Abrahán o Abdías: cuenta como un nombre a medio escribir.
  const corto = exacto && r[2].length < 3 && dia == null && anio == null;
  for (const m of meses.slice(0, 3)) {
    const puntos = exacto && !corto ? 920 : 500;
    // Un nombre a medio escribir («tam») va detrás de las personas y los lugares que también empiezan así.
    const alFinal = !exacto || corto;
    const equivale = m.equivale ? `más o menos ${m.equivale}` : '';
    if (anio != null) {
      // Con año: el mes (o el día) de ese año, calculado al elegirlo; inicioMes avisa si ese año no tuvo Veadar.
      const titulo = dia != null ? `Ir al ${dia} de ${nombreMesEn(m, anio)} de ${fmtAnio(anio)}` : `Ir a ${nombreMesEn(m, anio)} de ${fmtAnio(anio)}`;
      out.push({ grupo: 'Meses hebreos', alFinal, titulo, meta: `mes hebreo${equivale ? ` · ${equivale}` : ''} · fecha aproximada, de lunas medias`, puntos: puntos + 30, accion: () => {
        const a = BE.inicioMes(anio, m.id);
        if (a != null) irAMes(dia != null ? a + (dia - 0.5) * BE.DIA : a + 0.5 * BE.DIA, dia != null ? 0.12 : 1.5);
      } });
    } else {
      const c = mesCercano(m, BE.E.t);
      if (c) {
        const t = dia != null ? c.M.a + (dia - 0.5) * BE.DIA : c.M.a + 0.5 * BE.DIA;
        const nombre = nombreMesEn(m, c.anio);
        out.push({ grupo: 'Meses hebreos', alFinal, titulo: dia != null ? `Ir al ${dia} de ${nombre} de ${fmtAnio(Math.floor(t))}` : `Ir a ${nombre} de ${fmtAnio(Math.floor(t))}`,
          meta: `el ${m.id === 'veadar' ? 'Veadar' : 'mes'} más cercano a la fecha del cursor${equivale ? ` · ${equivale}` : ''}`, puntos: puntos + 20, accion: () => irAMes(t, dia != null ? 0.12 : 1.5) });
      }
    }
    const nota = m.id === 'veadar' ? 'el mes que se añadía algunos años; qué es y cuándo' : `qué mes era${m.fiestas?.length ? ', sus fiestas' : ''} y sus nombres`;
    out.push({ grupo: 'Meses hebreos', alFinal, titulo: `${m.nombre} en «El calendario de la Biblia»`, meta: `${nota} · abre la página del calendario`, puntos, accion: () => enlaceMes(m) });
  }
  return out;
}

function preguntas(q) {
  const out = [];
  const nq = norm(q).trim().replace(/[¿?]/g, '').replace(/\s+/g, ' ');
  out.push(...preguntasMes(nq));
  if (out.length && out.some((r) => r.puntos >= 900)) return out;
  // Un año suelto. Un número sin «a.e.c.» ni «e.c.» que no cabe después de Cristo es antes: «607» es 607 a.e.c.
  let y = leerAnio(q);
  if (y != null && !enRango(y) && /^\s*\d{1,4}\s*$/.test(q) && enRango(1 - y)) y = 1 - y;
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
  // «Jerusalén 33», «Babilonia 539 a.e.c.», «Pablo 51»: lo mismo sin «en», solo con un lugar o una persona. Si lo
  // primero es un libro, es un capítulo («Juan 3», «1 Corintios 13») y lo contesta el tipo pasaje.
  if (!out.some((r) => r.grupo === 'Preguntas')) {
    m = nq.match(/^(.+?)\s+((?:c\.?\s*)?\d{1,4}(?:\s*[a-z][a-z.\s]*)?)$/);
    const y3 = m ? leerAnio(m[2]) : null;
    if (y3 != null && !BE.libro(m[1])) {
      const a = entidad(m[1], ['lugar', 'persona']);
      if (a) out.push({ grupo: 'Preguntas', titulo: `${a.titulo} en ${fmtAnio(y3)}`, meta: `abre la ficha con el cursor en ${fmtAnio(y3)}`, puntos: 950, sel: a.sel, accion: () => saltarA(y3 + 0.5, a.sel) });
    }
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
  const orden = (r) => (r.alFinal ? ORDEN_GRUPOS.length + 1 : ordenGrupo(r.grupo));
  // Lo que se llama exactamente como lo escrito va primero: «Jerusalén» es la ciudad, no «Ananías de Jerusalén»,
  // aunque las personas vayan antes que los lugares; con el grafo abierto, Intro lo pone en el centro (be-u66.1).
  const nq = norm(q).trim(), exacta = (r) => (r.sel && norm(r.titulo) === nq ? 0 : 1);
  out.sort((a, b) => exacta(a) - exacta(b) || orden(a) - orden(b) || b.puntos - a.puntos || a.titulo.localeCompare(b.titulo, 'es'));
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
/** La forma de cada tipo en las listas de resultados (el símbolo #f-<forma> de index.html): la forma y la palabra
    dicen el tipo; el color solo acompaña. */
const FORMA_TIPO = { persona: 'persona', lugar: 'lugar', evento: 'suceso', periodo: 'periodo', pasaje: 'texto', libro: 'texto', carta: 'texto',
  viaje: 'ruta', recorrido: 'ruta', parada: 'ruta', hallazgo: 'hallazgo' };
const TIPO_GRUPO = { Fechas: 'fecha', 'Meses hebreos': 'mes hebreo', Preguntas: 'pregunta' };
/** Lo que enseña una fila de resultados, para la lista de arriba y la de la portada: la forma, la palabra del tipo, el
    título, la etiqueta, el resto de la línea y la fecha (si la línea no la dice ya). */
function filaResultado(r) {
  const deTipo = !!(r.sel && !r.accion);
  let forma;
  if (r.accion && !r.sel) forma = r.grupo === 'Preguntas' ? 'conexion' : 'anio';
  else if (r.accion && r.grupo === 'Preguntas' && /^¿Cómo se relaciona/.test(r.titulo)) forma = 'conexion';
  else forma = FORMA_TIPO[r.sel?.tipo] || 'texto';
  const tipo = deTipo ? (TIPO_TEXTO[r.sel.tipo] || '') : (TIPO_GRUPO[r.grupo] || '');
  const fecha = r.fechaTexto && !norm(r.meta || '').includes(norm(r.fechaTexto)) ? r.fechaTexto : '';
  return { forma, tipo, deTipo, titulo: r.titulo, etiqueta: r.etiqueta || '', meta: r.meta || '', fecha };
}
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
      const inicial = r.accion && !r.sel ? (r.grupo === 'Fechas' || r.grupo === 'Meses hebreos' ? '◷' : '?') : r.titulo[0];
      const f = filaResultado(r);
      return `${cab}<div class="be-result${i === activo ? ' be-result--active' : ''}" role="option" id="res-${i}" aria-selected="${i === activo}" data-i="${i}">
        <span class="be-node be-node--${tipoNodo} be-node--sm" aria-hidden="true">${esc(inicial)}</span>
        <span class="res-texto"><span class="be-result__title">${marcar(f.titulo, q.value)}${f.etiqueta ? ` <span class="res-etiqueta">${esc(f.etiqueta)}</span>` : ''}</span><span class="be-row__meta">${f.deTipo && f.tipo ? `${f.tipo}${f.meta ? ' · ' : ''}` : ''}${esc(f.meta)}</span></span>
        ${f.fecha ? `<span class="res-fecha">${esc(f.fecha)}</span>` : ''}</div>`;
    }).join('');
  }
  caja.hidden = false;
  q.setAttribute('aria-expanded', 'true');
  q.setAttribute('aria-activedescendant', resultados.length ? `res-${activo}` : '');
  $('#caja-busqueda').classList.add('be-search--focus');
  vistaPrevia();
}
/** El título con lo escrito subrayado (<mark>), para las dos listas. */
function marcar(titulo, q) {
  const nq = norm(q).trim();
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
  elegirResultado(r);
  $('#q').blur();
}
/** Lo que hace un resultado elegido, en cualquiera de las dos cajas. */
function elegirResultado(r) {
  if (r.accion) r.accion();
  else {
    // Con «¿Cómo se relaciona?» abierto, lo buscado entra en la pregunta; con el grafo abierto, pasa al centro al
    // seleccionarse (grafo.js sigue la selección).
    BE.conexion?.rellenar?.(BE.selTexto(r.sel));
    seleccionar(r.sel);
  }
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
// Nada depende del reloj: lo que tarde en pintarse la vista (el mapa cargando, un teléfono lento) no crea entradas.
// ---------------------------------------------------------------------------
const historia = (() => {
  // clave: la vista que ya tiene su entrada. quieto: tras entrar desde la portada o tras Atrás y Adelante, cada cambio
  // de vista que sigue es parte del mismo paso (un recorrido pone su parada un fotograma después), hasta que la persona
  // vuelve a pulsar o a teclear después de verlo pintado. absorber: marcar() ya guardó la entrada; el siguiente
  // fotograma solo apunta la clave nueva.
  let clave = null, quieto = false, pintado = false, absorber = false;
  const claveActual = () => [BE.selTexto(E.sel), ...BE.parametros.filter((x) => x.historia).map((x) => x.escribir() ?? '')].join('|');
  function empujar() { history.pushState(null, '', location.href); }
  function quedarse() { quieto = true; pintado = false; absorber = false; }
  BE.pintores.push(() => {
    const k = claveActual();
    if (clave === null) { clave = k; return; }   // arranque: la primera vista no crea entrada
    if (quieto || absorber) { clave = k; pintado = true; absorber = false; return; }
    if (k === clave) return;
    clave = k;
    empujar();
  });
  const despertar = () => { if (quieto && pintado) quieto = false; };
  window.addEventListener('pointerdown', despertar, true);
  window.addEventListener('keydown', despertar, true);
  // Antes de los datos no hay vista que poner: el arranque lee la dirección cuando llegan.
  window.addEventListener('popstate', () => { quedarse(); if (BE.D) BE.aplicarHash(false); });
  return {
    /** Un salto de fecha que merece su entrada (un año buscado, una parada): se guarda la vista de antes. */
    marcar() { if (clave !== null && !quieto) { empujar(); absorber = true; BE.programar(); } },
    /** Entrar desde la portada: una sola entrada nueva, sea cual sea el destino y tarde lo que tarde. Se guarda la de
        la portada; fn pone el destino, y lo que cambie después sin que la persona toque nada es parte de él. */
    entrar(fn) { empujar(); quedarse(); fn(); BE.programar(); },
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
  const relacionar = ['lugar', 'carta'].includes(E.sel.tipo) ? `<button type="button" class="be-btn be-btn--sm be-btn--ghost" data-relacionar="${esc(s)}">Relacionar con…</button>` : '';
  // La persona ya lleva «Ver en el grafo» en su ficha; lo demás también puede ser el centro del grafo.
  const grafo = E.sel.tipo !== 'persona' && BE.grafo ? `<button type="button" class="be-btn be-btn--sm be-btn--ghost" data-grafo="${esc(s)}">Ver en el grafo</button>` : '';
  primera.insertAdjacentHTML('afterend', `<div class="acciones-estudio">${grafo}${relacionar}<button type="button" class="be-btn be-btn--sm be-btn--ghost" data-citar="${esc(s)}" title="Copia el resumen, las referencias, la fuente y el enlace a esta vista">Citar</button></div>`);
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

Object.assign(BE, { buscar, cerrarResultados, iniciarBusqueda, buscarTexto, leerAnio, objetoSel, fechaSel, historia, textoCita,
  filaResultado, marcar, elegirResultado, sugerencias });
})();
