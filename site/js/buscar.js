/* biblical-atlas · búsqueda y enlaces: la caja de arriba y su lista de resultados. Cada tipo registrado aporta sus
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
/** El año de una pregunta. Sin «a.e.c.» ni «e.c.», un número que no cabe después de Cristo y sí antes es de antes:
    «607» es 607 a.e.c., solo y en «Jerusalén en 607» o «Jerusalén 607». La portada lo usa también antes de los datos. */
function anioPregunta(s) {
  const y = leerAnio(s);
  if (y == null) return null;
  const conEra = /\d\s*[a-z]/.test(norm(s).trim());
  return !conEra && !enRango(y) && enRango(1 - y) ? 1 - y : y;
}
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
  BE.historia.dejar();
  location.href = `calendario.html${location.search}#desde=${encodeURIComponent(vista)}&mes=${encodeURIComponent(m.id)}`;
}
function preguntasMes(nq) {
  // «segundo Adar» es lo que quiere decir Veadar; «de adar» es como lo dice quien lo oyó y no lo leyó.
  const q = nq.replace(/\b(?:segundo\s+adar|adar\s+segundo|adar\s+ii)\b/, 'veadar');
  const r = q.replace(/^(?:el\s+)?(?:mes\s+)?(?:de\s+)?/, '').match(/^(?:(\d{1,2})\s+(?:de\s+)?)?([a-z]+)(?:\s+(?:de\s+|del\s+(?:ano\s+)?|en\s+)?(.+))?$/);
  if (!r) return [];
  const dia = r[1] ? +r[1] : null, anio = r[3] != null ? anioPregunta(r[3]) : null;
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
  // Un año suelto: «607» es 607 a.e.c. (anioPregunta).
  const y = anioPregunta(q);
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
    const a = entidad(m[1]), y2 = anioPregunta(m[2]);
    if (a && y2 != null) out.push({ grupo: 'Preguntas', titulo: `${a.titulo} en ${fmtAnio(y2)}`, meta: `abre la ficha con el cursor en ${fmtAnio(y2)}`, puntos: 950, sel: a.sel, accion: () => saltarA(y2 + 0.5, a.sel) });
    // Sin ese nombre en los datos no se adivina otro parecido: se ofrece la fecha, que ya enseña quién había.
    else if (y2 != null && enRango(y2)) out.push({ grupo: 'Fechas', titulo: `Ir a ${fmtAnio(y2)}`, meta: 'ese nombre no está en los datos como lugar ni persona; la fecha enseña quién había', puntos: 900, accion: () => saltarA(y2 + 0.5) });
  }
  // «Jerusalén 33», «Babilonia 539 a.e.c.», «Pablo 51»: lo mismo sin «en», solo con un lugar o una persona. Si lo
  // primero es un libro, es un capítulo («Juan 3», «1 Corintios 13») y lo contesta el tipo pasaje.
  if (!out.some((r) => r.grupo === 'Preguntas')) {
    m = nq.match(/^(.+?)\s+((?:c\.?\s*)?\d{1,4}(?:\s*[a-z][a-z.\s]*)?)$/);
    const y3 = m ? anioPregunta(m[2]) : null;
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
  const f = sel.tipo === 'libro' ? BE.fechaLibro?.(o) : o?.fecha || o?.fecha_objeto;
  if (f && (f.desde != null || f.hasta != null)) return fechaCorta(f);
  if (sel.tipo === 'recorrido' && o?.paradas?.length) { const ts = o.paradas.map((p) => Math.floor(p.t)); return fechaCorta({ desde: Math.min(...ts), hasta: Math.max(...ts) }); }
  return '';
}

/** Un resultado se llama exactamente como lo escrito: su título, o su título hasta la primera coma («Juan, el apóstol»). */
const esExacta = (r, nq) => !!r.sel && (norm(r.titulo) === nq || norm(r.titulo.split(',')[0]).trim() === nq);
/** Cuántos hechos implica una selección, para desempatar entre los que se llaman igual. Se calcula solo al desempatar. */
function pesador() {
  const hechos = new Map();
  return (r) => {
    if (!r.sel) return 0;
    const k = BE.selTexto(r.sel);
    if (!hechos.has(k)) hechos.set(k, BE.existe(r.sel.tipo, r.sel.id) ? BE.implicados(r.sel).claves.size : 0);
    return hechos.get(k);
  };
}
function buscar(q) {
  const out = [...preguntas(q), ...resultadosTipos(q)];
  for (const r of out) if (r.sel && r.fechaTexto == null) r.fechaTexto = fechaSel(r.sel);
  const orden = (r) => (r.alFinal ? ORDEN_GRUPOS.length + 1 : ordenGrupo(r.grupo));
  // Lo que se llama exactamente como lo escrito va primero: «Jerusalén» es la ciudad, no «Ananías de Jerusalén»,
  // aunque las personas vayan antes que los lugares; con el grafo abierto, Intro lo pone en el centro (be-u66.1).
  // Entre los que se llaman así, primero el que más hechos tiene: «Juan» es el apóstol, no el gobernante de Hch 4:6.
  const nq = norm(q).trim(), exacta = (r) => (esExacta(r, nq) ? 0 : 1), peso = pesador();
  out.sort((a, b) => exacta(a) - exacta(b) || orden(a) - orden(b) || b.puntos - a.puntos
    || (exacta(a) ? 0 : peso(b) - peso(a)) || a.titulo.localeCompare(b.titulo, 'es'));
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
/** Un trozo de línea que no es más que una fecha: «36 e.c.», «c. 49-50 e.c.», «entre 1514 y 1513 a.e.c.». */
function esFecha(x) {
  const t = String(x || '').trim();
  return /\d/.test(t) && /e\.c\.$/.test(t) && /^(?:(?:c\.|entre|hacia|y|[-–]|\d+(?:[-–]\d+)?|a\.e\.c\.|e\.c\.)\s*)+$/.test(t);
}
/** Lo que enseña una fila de resultados, para la lista de arriba y la de la portada: la forma, la palabra del tipo, el
    título, la etiqueta, el resto de la línea y la fecha. La fecha va una sola vez, en su píldora: se quita de la línea
    lo que es la fecha del resultado, dicha como sea, y si la línea la decía tal cual la dan los datos («36 e.c.»,
    «entre 1514 y 1513 a.e.c.»), esa es la de la píldora, más exacta que la corta. */
function filaResultado(r) {
  const deTipo = !!(r.sel && !r.accion);
  let forma;
  if (r.accion && !r.sel) forma = r.grupo === 'Preguntas' ? 'conexion' : 'anio';
  else if (r.accion && r.grupo === 'Preguntas' && /^¿Cómo se relaciona/.test(r.titulo)) forma = 'conexion';
  else forma = FORMA_TIPO[r.sel?.tipo] || 'texto';
  const tipo = deTipo ? (TIPO_TEXTO[r.sel.tipo] || '') : (TIPO_GRUPO[r.grupo] || '');
  let fecha = r.fechaTexto || '', meta = r.meta || '';
  if (fecha) {
    const o = objetoSel(r.sel), f = o?.fecha || o?.fecha_objeto;
    const suya = [f?.texto, fecha].filter(Boolean).map((x) => norm(x));
    const trozos = meta.split(' · ');
    const propia = trozos.find((x) => esFecha(x) && suya.includes(norm(x.trim())));
    meta = trozos.filter((x) => !esFecha(x) && !suya.includes(norm(x.trim()))).join(' · ');
    if (propia) fecha = propia.trim();
  }
  return { forma, tipo, deTipo, titulo: r.titulo, etiqueta: r.etiqueta || '', meta, fecha };
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
  // La lista se cierra un momento después de salir de la caja, para que la pulsación en un resultado llegue antes. Si
  // para entonces se ha vuelto a la caja (otra búsqueda escrita enseguida), la lista nueva se queda.
  q.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== q) cerrarResultados(); }, 150));
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
// Los botones «Atrás» y «Adelante» (docs/ideas/atras-adelante.md, opción E) llaman a history.back() y history.forward().
// Para saber si hay adónde ir y cómo se llama, cada entrada lleva en history.state su número y el nombre de su vista, y
// la pestaña guarda los nombres de cada visita en sessionStorage. Las reglas puras están en visit-history.js.
// ---------------------------------------------------------------------------
const historia = (() => {
  const H = BE.visitHistory;
  const CLAVE_VISITAS = 'biblical-atlas:visitas';
  const TITULO = document.title;   // el de la portada
  // La entrada en la que estamos: { visit, step, name }.
  let actual = null;
  // La lista también vive en memoria: con el almacenamiento bloqueado o lleno, o con un valor ilegible o de otra visita,
  // los botones siguen sabiendo adónde van mientras la página está abierta.
  let memoria = [];
  const leerVisitas = () => {
    try {
      const v = JSON.parse(sessionStorage.getItem(CLAVE_VISITAS) || 'null');
      if (Array.isArray(v) && (!actual || v.some((x) => Array.isArray(x) && x[0] === actual.visit))) return v;
    } catch { /* sin almacenamiento, o ilegible */ }
    return memoria;
  };
  const guardarVisitas = (v) => { memoria = v; try { sessionStorage.setItem(CLAVE_VISITAS, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
  const nuevaVisita = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const enPortada = () => !location.hash || location.hash === '#' || /[#&]portada=1(&|$)/.test(location.hash);
  const ponerTitulo = (nombre, portada = enPortada()) => { document.title = H.pageTitle(nombre, { landing: portada, base: TITULO }); };
  // Dónde está la entrada en la lista del navegador (Navigation API, donde la hay).
  const indice = () => { const i = window.navigation?.currentEntry?.index; return Number.isInteger(i) && i >= 0 ? i : null; };
  const deEstaPagina = (en) => {
    try { const u = new URL(en.url); return u.origin === location.origin && u.pathname === location.pathname && u.search === location.search; } catch { return false; }
  };
  let ultimoIndice = null;

  // Al cargar la página: la nuestra si recargamos o volvemos desde otra página; si no, empieza una visita. Antes de los
  // datos solo se sabe nombrar la portada; lo demás lo nombra sello() al llegar.
  {
    const r = H.begin(history.state, leerVisitas(), nuevaVisita(), enPortada() ? 'la portada' : null);
    actual = r.state;
    guardarVisitas(r.visits);
    history.replaceState(actual, '', location.href);
    ultimoIndice = indice();
  }

  /** Lo que enseña la vista de ahora, para ponerle nombre (BE.visitHistory.viewName). */
  function vista() {
    // La fecha de la barra se pinta en el fotograma, y la dirección puede escribirse antes (un salto de fecha en un
    // equipo ocupado): se pinta ya, para no nombrar la vista con la fecha de antes.
    if (BE.sucio.cursor) { BE.sucio.cursor = false; BE.pintarCursor(); }
    const p = new URLSearchParams(BE.textoHash());
    const nombre = (s) => { const sel = BE.parseSel(s); return sel ? BE.nombreSel(sel) : null; };
    const v = { date: $('#fecha-valor')?.textContent.trim() || fmtCursor(E.t) };
    if (p.get('portada') === '1') v.landing = true;
    if (p.has('leer')) v.reading = { chapter: nombre(`pasaje:${p.get('leer')}`), passage: +p.get('pas') || null };
    if (p.has('paso') && E.sel?.tipo === 'recorrido') v.tour = { name: BE.nombreSel(E.sel), stop: +p.get('paso') || null };
    if (p.has('conexion')) v.connection = p.get('conexion').split('~').map((x) => nombre(x));
    if (p.has('grafo')) { const c = BE.grafo?.ruta.at(-1); v.graph = (c && nombre(c)) || ''; }
    if (p.has('sinc')) v.sync = BE.L[p.get('sinc').split('~')[0]]?.nombre || '';
    if (p.get('ahora') === '1') v.now = true;
    if (E.sel) v.selection = BE.nombreSel(E.sel);
    return v;
  }
  /** Lo que hay detrás y delante, como lo enseñan los botones. Navigation API, donde la hay, confirma lo que dicen los
      números: con más de 50 entradas el navegador olvida las primeras, y la entrada vecina tiene que ser de esta página.
      Una dirección escrita a mano o un marcador a otra página del sitio, sin pasar por un enlace, deja delante esa página
      con los nombres de antes en la lista: se cortan, como hace dejar(). */
  function alrededor() {
    const a = H.around(actual, leerVisitas());
    const nav = window.navigation;
    if (!nav || typeof nav.canGoBack !== 'boolean') return a;
    a.back.can = a.back.can && nav.canGoBack;
    a.forward.can = a.forward.can && nav.canGoForward;
    const i = indice(), es = i === null ? null : nav.entries?.();
    if (es) {
      if (a.back.can && !(es[i - 1] && deEstaPagina(es[i - 1]))) a.back.can = false;
      if (a.forward.can && !(es[i + 1] && deEstaPagina(es[i + 1]))) { a.forward.can = false; dejar(); }
    }
    return a;
  }
  /** Enciende, apaga y rotula todas las parejas de botones: la de la barra, la de la hoja y la de la lectura. */
  function pintarBotones() {
    const a = alrededor();
    const foco = document.activeElement?.closest?.('[data-historia]');
    for (const [dir, cual] of [['back', 'atras'], ['forward', 'adelante']]) {
      const texto = H.buttonLabel(dir, a[dir]);
      for (const b of document.querySelectorAll(`[data-historia="${cual}"]`)) {
        b.disabled = !a[dir].can;
        if (b.title !== texto) { b.title = texto; b.setAttribute('aria-label', texto); }
      }
    }
    // Un botón que se apaga pierde el foco: pasa al otro de su pareja, que ahora tiene adónde ir. Después de pintar los
    // cuatro: antes, el otro aún estaría apagado.
    if (foco?.disabled) foco.parentElement.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
  }
  /** La pareja de la lectura (lectura.js la pone junto a «Cerrar»): en el teléfono la lectura tapa la fila de la hoja.
      Es una copia de la de la hoja, ya pintada, sin sus id. */
  function pareja() {
    const g = document.querySelector('.atras-adelante--hoja')?.cloneNode(true);
    if (!g) return '';
    g.classList.replace('atras-adelante--hoja', 'atras-adelante--lectura');
    for (const x of g.querySelectorAll('[id]')) x.removeAttribute('id');
    return g.outerHTML;
  }
  function empujar() {
    const r = H.push(actual, leerVisitas());
    actual = r.state;
    guardarVisitas(r.visits);
    history.pushState(actual, '', location.href);
    ultimoIndice = indice();
    pintarBotones();
  }
  /** base.js, al escribir la dirección: el nombre de la vista de ahora pasa a la entrada y al título de la pestaña, y
      la marca de la línea pulsada la última vez, a la entrada. Devuelve el estado que hay que escribir, o null si no ha
      cambiado. */
  function sello() {
    if (!BE.D) return null;
    revisar(false);   // una vista que cambió sin pintarse todavía («Ahora mismo») tiene su entrada antes de escribirse
    const v = vista();
    // Un nombre igual al de la entrada de detrás (un año buscado con la lectura abierta) lleva la fecha.
    const nombre = H.distinctName(H.viewName(v), H.around(actual, leerVisitas()).back.name, v.date);
    // La portada se decide por la vista, no por la dirección: aún es la de la vista de antes.
    ponerTitulo(nombre, !!v.landing);
    const marca = BE.marcaPulsada?.() ?? null;
    const igual = nombre === actual.name && marca === (actual.mark ?? null)
      && history.state?.visit === actual.visit && history.state?.step === actual.step;
    if (!igual) { const r = H.rename(actual, leerVisitas(), nombre); actual = H.withMark(r.state, marca); guardarVisitas(r.visits); }
    pintarBotones();
    return igual ? null : actual;
  }
  /** mapa.js, cuando el mapa se para: la entrada de ahora guarda su encuadre, sin crear otra ni tocar la dirección.
      Una vista que cambió sin su entrada todavía la recibe antes, como en sello(): el encuadre es de la vista nueva. */
  function encuadre(marco) {
    if (!BE.D || !actual) return;
    if (revisar(false)) BE.escribirHash();
    actual = H.withFrame(actual, marco);
    history.replaceState(actual, '', location.href);
  }
  /** Al llegar a una entrada (Atrás, Adelante, una recarga, la vuelta desde otra página), la línea recupera la marca
      que se pulsó en ella: el primer clic en esa marca la suelta, como antes de irse. */
  function llegar() { BE.ponerMarcaPulsada?.(actual?.mark ?? null); }
  /** Salir de la página por un enlace: el navegador tira las entradas de delante, y aquí también. */
  function dejar() { guardarVisitas(H.cutForward(actual, leerVisitas())); }

  // clave: la vista que ya tiene su entrada. quieto: al cargar la página, tras entrar desde la portada o tras Atrás y
  // Adelante, cada cambio de vista que sigue es parte del mismo paso (un recorrido pone su parada un fotograma después),
  // hasta que la persona vuelve a pulsar o a teclear después de verlo pintado. Al cargar, lo que se ve es lo que trajo
  // la dirección: la primera pulsación ya despierta (no siempre hay un fotograma antes). absorber: marcar() ya guardó la
  // entrada; el siguiente fotograma solo apunta la clave nueva.
  let clave = null, quieto = true, pintado = true, absorber = false;
  const claveActual = () => [BE.selTexto(E.sel), ...BE.parametros.filter((x) => x.historia).map((x) => x.escribir() ?? '')].join('|');
  function quedarse() { quieto = true; pintado = false; absorber = false; }
  /** Si la vista cambió, guarda la de antes en su entrada. Lo llaman cada fotograma (pintor = true) y sello(), antes
      de escribir la dirección: así ningún cambio llega a la dirección sin su entrada, se pinte o no antes. Solo un
      fotograma pintado cuenta como visto: si no, una pulsación entre la escritura de la dirección y el primer fotograma
      despertaría la vista y lo que el destino pone después crearía otra entrada. Devuelve si hay una entrada nueva
      cuya dirección falta escribir. */
  function revisar(pintor) {
    const k = claveActual();
    if (clave === null) { clave = k; if (pintor) pintado = true; return false; }   // arranque: la primera vista no crea entrada
    if (absorber) { clave = k; absorber = false; if (pintor) pintado = true; return true; }
    if (quieto) { clave = k; if (pintor) pintado = true; return false; }
    if (k === clave) return false;
    clave = k;
    empujar();
    return true;
  }
  // La entrada nueva se queda con su dirección en el mismo fotograma, no 250 ms después: una segunda vista en ese
  // tiempo, o Atrás, la dejaban con la dirección de la anterior. La escritura de siempre sigue después.
  BE.pintores.push(() => { if (revisar(true)) { BE.escribirHash(); BE.guardarHash(); } });
  const despertar = () => { if (quieto && pintado) quieto = false; };
  window.addEventListener('pointerdown', despertar, true);
  window.addEventListener('keydown', despertar, true);
  // Atrás o Adelante, del sitio o del navegador. Una entrada sin estado es nueva si está justo después de la nuestra: un
  // enlace con «#» o una dirección escrita a mano. Si se llegó a ella yendo atrás o adelante (una pestaña de antes de
  // los botones), empieza ahí una visita. Antes de los datos no hay vista que poner: el arranque lee la dirección
  // cuando llegan.
  window.addEventListener('popstate', () => {
    const i = indice();
    const recorrido = i !== null && ultimoIndice !== null && i !== ultimoIndice + 1;
    const r = H.arrive(actual, history.state, leerVisitas(), nuevaVisita(), null, recorrido);
    actual = r.state;
    guardarVisitas(r.visits);
    if (r.fresh) history.replaceState(actual, '', location.href);
    ultimoIndice = i;
    if (destino !== null && (actual.step === destino || r.fresh)) { destino = null; clearTimeout(destinoTimer); }
    const foco = document.activeElement?.closest?.('#vista-lectura [data-historia]')?.dataset.historia;
    ponerTitulo(actual.name);
    pintarBotones();
    quedarse();
    if (BE.D) {
      BE.aplicarHash(false);
      llegar();
      // Una entrada que llega sin nombre (un enlace compartido, una pestaña de antes) lo recibe ya, y el título de la
      // pestaña con él.
      if (!actual.name) BE.escribirHash();
    }
    // La lectura se vuelve a pintar entera: el foco vuelve a su botón.
    if (foco && !document.activeElement?.closest?.('[data-historia]')) {
      const b = document.querySelector(`#vista-lectura [data-historia="${foco}"]`);
      (b && !b.disabled ? b : b?.parentElement.querySelector('button:not(:disabled)'))?.focus({ preventScroll: true });
    }
  });
  // De vuelta desde la caché del navegador: la lista pudo cambiar mientras tanto (se salió por un enlace).
  window.addEventListener('pageshow', (e) => { if (e.persisted) pintarBotones(); });
  // Las pulsaciones seguidas: destino es el número al que van las que aún no han llegado. Cada una cuenta desde ahí,
  // así diez pulsaciones de golpe nunca pasan de la primera vista ni de la última. Si un viaje no llega, se olvida.
  let destino = null, destinoTimer = 0;
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-historia]');
    if (!b || b.disabled) return;
    const atras = b.dataset.historia === 'atras';
    // La vista de ahora se queda con su entrada y su dirección antes de irse: si cambió hace un instante, Atrás saltaba
    // una vista y Adelante volvía a una copia de esta.
    if (destino === null && BE.D) BE.escribirHash();
    const desde = destino ?? actual.step;
    const a = H.around({ ...actual, step: desde }, leerVisitas());
    if (atras ? !a.back.can : !a.forward.can) return;
    destino = desde + (atras ? -1 : 1);
    clearTimeout(destinoTimer);
    destinoTimer = setTimeout(() => { destino = null; }, 1000);
    if (atras) history.back(); else history.forward();
  });
  // Un enlace a otra página en esta pestaña (Acerca de, el calendario). Solo cuenta lo que de verdad cierra esta página:
  // un clic sencillo, sin Ctrl, ⌘, Mayúsculas ni Alt, en un enlace http(s) que se abre aquí. Un mailto:, un tel:, una
  // pestaña nueva (las citas y las fuentes de jw.org) o una descarga dejan la página abierta y lo de delante sigue ahí.
  window.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    let u;
    try { u = new URL(a.getAttribute('href'), document.baseURI); } catch { return; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
    if (u.origin === location.origin && u.pathname === location.pathname && u.search === location.search) return;   // un «#»: llega por popstate
    dejar();
  });
  pintarBotones();
  return {
    /** Un salto de fecha que merece su entrada (un año buscado, una parada): se guarda la vista de antes. */
    marcar() { if (clave !== null && !quieto) { empujar(); absorber = true; BE.programar(); } },
    /** Entrar desde la portada: una sola entrada nueva, sea cual sea el destino y tarde lo que tarde. Se guarda la de
        la portada; fn pone el destino, y lo que cambie después sin que la persona toque nada es parte de él. */
    entrar(fn) { empujar(); quedarse(); fn(); BE.programar(); },
    /** El encuadre que guarda la entrada de ahora, o null: base.js y mapa.js lo ponen al llegar a ella. */
    marco: () => actual?.frame ?? null,
    empujar, sello, dejar, pareja, encuadre, llegar,
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
  if (c) wol = c.texto ? BE.urlCita(c) : BE.urlCapitulo(c.libro, c.cap);
  return [`${nombre}${o.resumen ? `: ${o.resumen}` : ''}`, refs && `Referencias: ${refs}.`, wol && `Leer en jw.org: ${wol}`, fuentes.length && `Fuentes: ${fuentes.join('; ')}.`, `Vista en biblical-atlas: ${location.href}`].filter(Boolean).join('\n');
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

Object.assign(BE, { buscar, cerrarResultados, iniciarBusqueda, buscarTexto, leerAnio, anioPregunta, objetoSel, fechaSel, historia, textoCita,
  filaResultado, marcar, elegirResultado, sugerencias, esExacta, pesador });
})();
