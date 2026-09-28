/* biblical-earth · trayectorias: dónde está cada persona en cada momento y en qué ventana de tiempo cae cada carta o suceso.
   Pablo sigue el modelo de sus paradas (v0). Cualquier otra persona se sitúa con sus viajes, los sucesos que la nombran
   con lugar y sus relaciones fechadas (vivio_en, nacio_en, murio_en). Nunca se inventa una posición: fuera de lo que
   dicen los datos, BE.donde devuelve null. Dueño durante el reparto: app-tiempo. */
'use strict';
(() => {
const BE = window.BE;
const { norm, tramo, interpolar } = BE;

const DIA = 1 / 365.2425;
const MES_LUNAR = (29 + 12 / 24 + 44 / 1440) * DIA;   // 29 días, 12 horas y 44 minutos (Perspicacia «Calendario»)

// Momento del año que damos a cada estación cuando la fuente la nombra: [si abre el tramo, si lo cierra].
const ESTACIONES = {
  'finales del verano': [0.68, 0.68], 'principios del otono': [0.75, 0.75], primavera: [0.25, 0.4],
  verano: [0.55, 0.65], otono: [0.8, 0.85], invierno: [0.9, 0.15], pascua: [0.28, 0.28], pentecostes: [0.42, 0.42],
};
const RE_ESTACION = /finales del verano|principios del otono|primavera|verano|otono|invierno|pascua|pentecostes/g;
// Tramo del año de cada estación de fecha.detalle.estacion (invierno pasa al año siguiente).
const TRAMO_ESTACION = { primavera: [0.22, 0.47], verano: [0.47, 0.72], 'otoño': [0.72, 0.97], otono: [0.72, 0.97], invierno: [0.97, 1.22] };

// ---------------------------------------------------------------------------
// Calendario hebreo: un cálculo nuestro, aproximado. Los meses van de luna nueva a luna nueva (Perspicacia
// «Calendario»: una lunación dura de media 29 días, 12 horas y 44 minutos). Nisán empieza con la luna nueva más
// cercana a mediados de marzo, porque la tabla B15 pone nisán en marzo-abril (`equivale` en data/calendario.yaml).
// Un año con trece lunas lleva Veadar entre Adar y Nisán. El día hebreo va de una puesta de sol a la siguiente
// (Perspicacia «Día»), y las horas de luz, más o menos de seis a seis: cada mes empieza a las 18:00 de la víspera.
// Las lunas son medias, no observadas: las fechas que salen de aquí llevan siempre «c.».
// ---------------------------------------------------------------------------
const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const LUNA_0 = 2000 + (5 + 18.23 / 24) * DIA;   // luna nueva media del 6 de enero de 2000, 18:14 UT (dato astronómico)
let calCache = null;
function calendario() {
  if (calCache && calCache.D === BE.D) return calCache;
  const meses = BE.D?.calendario?.meses || [];
  const nisan = meses.find((m) => m.id === 'nisan');
  let inicio = 2.5 / 12;                      // mediados de marzo: B15, «nisán: marzo-abril»
  const eq = typeof nisan?.equivale === 'string' ? nisan.equivale : null;
  if (eq) {
    const k = MESES_ES.findIndex((m) => norm(eq).includes(m));
    if (k >= 0) inicio = (k + 0.5) / 12;
  }
  const porId = new Map(meses.map((m) => [m.id, m]));
  const porOrden = new Map(meses.map((m) => [m.orden, m]));
  calCache = { D: BE.D, inicio, meses, porId, porOrden, anios: new Map() };
  return calCache;
}
/** Primera puesta de sol (18:00) en o después de t. Nuestros días van de y + k·DIA a y + (k + 1)·DIA. */
function puestaDesde(t) {
  const y = Math.floor(t);
  return y + (Math.ceil((t - y) / DIA - 0.75) + 0.75) * DIA;
}
/** Año hebreo que empieza en la primavera de nuestro año y: { nisan, meses: [{ mes, a, b }] }, con 12 o 13 meses. */
function anioHebreo(y) {
  const c = calendario();
  if (c.anios.has(y)) return c.anios.get(y);
  const luna = (anio) => LUNA_0 + Math.round((anio + c.inicio - LUNA_0) / MES_LUNAR) * MES_LUNAR;
  const l0 = luna(y), l1 = luna(y + 1);
  const n = Math.round((l1 - l0) / MES_LUNAR);
  const meses = [];
  for (let k = 0; k < n; k++) {
    const mes = c.porOrden.get(k + 1) || c.porOrden.get(12);
    meses.push({ mes, a: puestaDesde(l0 + k * MES_LUNAR), b: puestaDesde(k + 1 < n ? l0 + (k + 1) * MES_LUNAR : l1) });
  }
  const r = { anio: y, nisan: meses[0]?.a, meses };
  if (c.anios.size > 400) c.anios.clear();
  c.anios.set(y, r);
  return r;
}
/** Año decimal en que empieza el mes hebreo `mes` (id). Por defecto `y` es el año de nuestro calendario que da el texto
    («3 de adar de 515 a.e.c.»): sebat, adar y veadar caen en enero-marzo, así que son los últimos meses del año hebreo
    que empezó en el nisán anterior. Con `anioHebreo`, `y` es el año en que empieza ese año hebreo (la rejilla de meses).
    Veadar en un año sin él da el final de adar. */
function inicioMes(y, mes, esAnioHebreo = false) {
  const c = calendario();
  const m = c.porId.get(mes);
  if (!m) return null;
  const A = anioHebreo(!esAnioHebreo && m.orden >= 11 ? y - 1 : y);
  const k = Math.min(m.orden, A.meses.length + 1) - 1;
  return k < A.meses.length ? A.meses[k].a : A.meses.at(-1).b;
}
/** Nombre del mes en la época del año hebreo y (desde/hasta de `nombres`, como los lugares). Si ningún nombre es de
    esa época (Siván antes del exilio, que la Biblia llama «el tercer mes»), da el de siempre con `anacronico`. */
function nombreMes(m, y) {
  const ns = m?.nombres || [];
  const n = ns.find((x) => (x.desde == null || y >= x.desde) && (x.hasta == null || y <= x.hasta));
  if (n) return { nombre: n.nombre, nota: n.nota || '', anacronico: false };
  return { nombre: m?.nombre || '', nota: ns[0]?.nota || '', anacronico: ns.length > 0 };
}
/** Día hebreo aproximado en t: { mes, dia, anio, nombre, anacronico, a, b } o null si no hay calendario. */
function diaHebreo(t) {
  const c = calendario();
  if (!c.meses.length) return null;
  let A = anioHebreo(Math.floor(t - c.inicio));
  if (t < A.nisan) A = anioHebreo(A.anio - 1);
  else if (t >= A.meses.at(-1).b) A = anioHebreo(A.anio + 1);
  const M = A.meses.find((x) => t >= x.a && t < x.b) || A.meses.at(-1);
  const nm = nombreMes(M.mes, A.anio);
  return { mes: M.mes, dia: Math.min(30, Math.floor((t - M.a) / DIA) + 1), anio: A.anio, nombre: nm.nombre, anacronico: nm.anacronico, a: M.a, b: M.b };
}
/** Ventana [a, b) de un objeto FECHA, afinada con fecha.detalle (mes y día hebreos, o estación). */
function ventanaFecha(f) {
  const tr = tramo(f);
  if (!tr) return null;
  const d = f.detalle;
  if (d?.mes && calendario().porId.has(d.mes)) {
    const a = inicioMes(tr[0], d.mes);
    if (d.dia) return [a + (d.dia - 1) * DIA, a + d.dia * DIA];
    return [a, a + MES_LUNAR];
  }
  if (d?.estacion && TRAMO_ESTACION[d.estacion]) {
    const [x, y] = TRAMO_ESTACION[d.estacion];
    return [tr[0] + x, tr[0] + y];
  }
  return tr;
}

// ---------------------------------------------------------------------------
// Pablo: el modelo de v0, intacto
// ---------------------------------------------------------------------------
/** Momentos [inicio, fin] (años decimales) en que situamos una parada anclada. */
function momentos(f) {
  const d = f.desde ?? f.hasta, h = f.hasta ?? f.desde;
  if (d == null) return null;
  const hits = [...norm(f.texto).matchAll(RE_ESTACION)].map((m) => ESTACIONES[m[0]]);
  if (d === h) {
    if (hits.length >= 2) return [d + hits[0][0], d + hits[hits.length - 1][1]];
    if (hits.length === 1) return [d + hits[0][0], d + hits[0][0]];
    return [d + 0.5, d + 0.5];
  }
  const ini = d + (hits.length ? hits[0][0] : 0.5);
  let fin = h + 0.5;
  if (hits.length >= 2) fin = h + hits[hits.length - 1][1];
  else if (hits.length === 1 && hits[0] === ESTACIONES.invierno) fin = h + 0.15;
  return [ini, Math.max(ini, fin)];
}
const esDe = (v, persona) => (v.persona || 'pablo') === persona;
/** Ordena las paradas de los viajes de una persona (Pablo si no se dice) y les da un momento.
    Paradas ancladas: su fecha. Paradas en tiempo narrativo: repartidas por igual entre las dos anclas que las rodean. */
function prepararParadas(persona = 'pablo') {
  const viajes = BE.D.viajes.filter((v) => esDe(v, persona)).sort((a, b) => (a.fecha?.desde ?? 0) - (b.fecha?.desde ?? 0));
  const out = [];
  for (const v of viajes) {
    const ps = [...v.paradas].sort((a, b) => a.orden - b.orden);
    ps.forEach((p, i) => {
      const lugar = BE.L[p.lugar];
      if (!lugar || lugar.lat == null) return;
      out.push({ key: `${v.id}/${p.orden}`, viaje: v, p, lugar, i, n: ps.length, narrativa: p.fecha?.tipo === 'narrativa' || !momentos(p.fecha || {}) });
    });
  }
  let prev = -1;
  const anclas = out.map((s, i) => (s.narrativa ? -1 : i)).filter((i) => i >= 0);
  for (let k = 0; k <= anclas.length; k++) {
    const j = k < anclas.length ? anclas[k] : out.length;
    const nNar = j - prev - 1;
    if (j < out.length) {
      let [a, b] = momentos(out[j].p.fecha);
      if (prev >= 0) {
        const minA = out[prev].b + 0.04 * (nNar + 1);
        if (a < minA) { a = minA; b = Math.max(b, a); }
      }
      out[j].a = a; out[j].b = b;
    }
    if (nNar > 0) {
      const primero = out[prev + 1], ultimo = out[j - 1];
      const t0 = prev >= 0 ? out[prev].b : (primero.viaje.fecha?.desde ?? 0);
      const t1 = j < out.length ? out[j].a : ((ultimo.viaje.fecha?.hasta ?? t0) + 1);
      const hueco = (t1 - t0) / (nNar + 1);
      for (let m = 1; m <= nNar; m++) {
        const s = out[prev + m], c = t0 + m * hueco;
        s.a = c - hueco * 0.2; s.b = c + hueco * 0.2; s.banda = [t0, t1];
      }
    }
    prev = j;
  }
  out.forEach((s, i) => { s.g = i; s.sel = `parada:${s.key}`; s.titulo = s.lugar.nombre; s.referencia = s.p.referencia; });
  return out;
}

/** Dónde está alguien en t según una lista de paradas ordenadas (el modelo de Pablo). null si ninguna lo cubre. */
function dondeEnParadas(P, t) {
  if (!P.length || t < P[0].a || t > P[P.length - 1].b) return null;
  let lo = 0, hi = P.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (P[m].a <= t) lo = m; else hi = m - 1; }
  const s = P[lo];
  if (t <= s.b || lo === P.length - 1) {
    return { en: s, sig: P[lo + 1] || null, parada: true, estimada: s.narrativa, pos: [s.lugar.lon, s.lugar.lat], banda: s.banda || null };
  }
  const n = P[lo + 1];
  const f = (t - s.b) / Math.max(1e-6, n.a - s.b);
  const banda = s.narrativa ? s.banda : (n.narrativa ? n.banda : null);
  return { en: s, sig: n, parada: false, f, estimada: s.narrativa || n.narrativa, pos: interpolar(s.lugar, n.lugar, f), banda };
}
/** ¿Dónde está Pablo en t? null si ninguna parada lo cubre. */
const dondeEsta = (t) => dondeEnParadas(BE.P, t);
function viajeActual(w) {
  if (!w || !w.en.viaje) return null;
  if (!w.parada && w.en.i === w.en.n - 1 && w.sig) return w.sig.viaje;
  return w.en.viaje;
}
/** Parte de la fecha f en que una lista de estancias pone a la persona en uno de los lugares.
    Se prueba cada lugar en orden (el primero es el preferido) y, dentro de él, gana la estancia más larga.
    Una estancia sin duración cuenta desde que sale de la anterior hasta que llega a la siguiente.
    Si ninguna encaja, se queda la parte de la fecha que cae fuera de la lista, donde no sabemos dónde estaba. */
function ventanaEnLista(P, f, lugares) {
  const tr = tramo(f);
  if (!tr) return null;
  for (const id of lugares || []) {
    let mejor = null;
    for (let g = 0; g < P.length; g++) {
      const s = P[g];
      if (s.lugar.id !== id) continue;
      let a = s.a, b = s.b;
      if (b - a < 1e-3) { a = g > 0 ? P[g - 1].b + 1e-3 : a; b = g < P.length - 1 ? P[g + 1].a : b; }
      a = Math.max(a, tr[0]); b = Math.min(b, tr[1]);
      if (b > a && (!mejor || b - a > mejor[1] - mejor[0])) mejor = [a, b];
    }
    if (mejor) return mejor;
  }
  const ini = P[0]?.a ?? Infinity, fin = P.at(-1)?.b ?? -Infinity;
  if (tr[0] < fin && fin < tr[1]) return [fin + 1e-3, tr[1]];
  if (tr[0] < ini && ini < tr[1]) return [tr[0], ini];
  return tr;
}
const ventanaPablo = (f, lugares) => ventanaEnLista(BE.P, f, lugares);

// ---------------------------------------------------------------------------
// Sucesos: ventana de tiempo, con día hebreo, estación y orden del relato
// ---------------------------------------------------------------------------
/** Sucesos de una misma serie de orden_relato (la armonía A7, los capítulos de Hechos), colocados en el orden del relato.
    Los que tienen fecha de un día o de un mes hacen de anclas y se quedan en su fecha. Los demás van entre las dos anclas
    que los rodean en el relato, repartidos por igual, y cada uno dentro de su propia fecha: una estación o un año no
    es un ancla, es el margen en que tiene que caer (lo de «principios de 33, antes de Betania» queda antes del 8 de
    nisán; las apariciones, entre la resurrección y la ascensión). Si su fecha no cabe entre las anclas, se queda con su
    fecha. Devuelve Map(evento → [a, b]) solo con los que cambian. */
const ANCLA_MAX = 40 * DIA;
let relatoCache = null;
function repartoRelato() {
  if (relatoCache && relatoCache.D === BE.D) return relatoCache.m;
  const series = new Map();
  (BE.D.eventos || []).forEach((e, i) => {
    const o = e.orden_relato, v = ventanaFecha(e.fecha);
    if (!o || !v || (e.personas || []).includes('pablo')) return;
    if (!series.has(o.serie)) series.set(o.serie, []);
    series.get(o.serie).push({ e, v, i, ancla: v[1] - v[0] <= ANCLA_MAX });
  });
  const m = new Map();
  for (const xs of series.values()) {
    xs.sort((x, y) => x.e.orden_relato.orden - y.e.orden_relato.orden || x.i - y.i);
    // Tandas: lo que va entre dos anclas del relato. Una tanda empieza cuando acaba la última ancla anterior y termina
    // cuando empieza la siguiente.
    // Si el ancla anterior acaba después de que empiece la siguiente (un mes y un día de ese mes), la tanda empieza con
    // el ancla anterior.
    let fin = -Infinity, ini = -Infinity, tanda = [];
    // orden_relato.tras: un suceso de otra serie que ya había pasado (Matías se elige después de la ascensión, que va
    // en la armonía A7 y no en Hechos). La tanda no empieza antes de que acabe.
    const tras = (x) => {
      const o = x.e.orden_relato.tras && (BE.D.eventos || []).find((e) => e.id === x.e.orden_relato.tras);
      const v = o && ventanaFecha(o.fecha);
      return v ? v[1] : -Infinity;
    };
    const cerrar = (inicio) => {
      if (tanda.length) colocar(tanda, Math.max(fin < inicio ? fin : ini, ...tanda.map(tras)), inicio, m);
      tanda = [];
    };
    for (const x of xs) {
      if (!x.ancla) { tanda.push(x); continue; }
      cerrar(x.v[0]);
      fin = Math.max(fin, x.v[1]); ini = x.v[0];
    }
    cerrar(Infinity);
  }
  relatoCache = { D: BE.D, m };
  return m;
}
/** Coloca una tanda entre lo (fin del ancla anterior) y hi (inicio de la siguiente) sin romper el orden del relato ni
    sacar a nadie de su fecha. Los seguidos con la misma fecha forman un grupo. Cada grupo empieza donde acaba el
    anterior; si sus fechas se solapan, el trozo común se reparte entre los dos según cuántos sucesos lleva cada uno.
    Dentro de un grupo, los sucesos se reparten por igual. */
function colocar(tanda, lo, hi, m) {
  const grupos = [];
  for (const x of tanda) {
    const g = grupos.at(-1);
    if (g && g.v[0] === x.v[0] && g.v[1] === x.v[1]) g.xs.push(x); else grupos.push({ v: x.v, xs: [x] });
  }
  const n = grupos.length;
  for (let j = 0; j < n; j++) grupos[j].L = Math.max(lo, grupos[j].v[0], j ? grupos[j - 1].L : -Infinity);
  for (let j = n - 1; j >= 0; j--) grupos[j].U = Math.min(hi, grupos[j].v[1], j < n - 1 ? grupos[j + 1].U : Infinity);
  let inicio = grupos[0].L;
  grupos.forEach((g, j) => {
    let fin = g.U;
    const h = grupos[j + 1];
    if (h) {
      const a = Math.max(h.L, inicio), b = g.U;
      const corte = b > a ? a + (b - a) * g.xs.length / (g.xs.length + h.xs.length) : b;
      fin = Math.min(corte, g.U);
      g.sig = Math.max(corte, h.L);
    }
    const a = Math.max(inicio, g.L), b = fin;
    inicio = g.sig ?? inicio;
    if (!(b - a > 2e-4)) return;                   // no cabe entre las anclas: cada uno se queda con su fecha
    const paso = (b - a) / g.xs.length;
    g.xs.forEach((x, k) => {
      const w = [a + k * paso, a + (k + 1) * paso - Math.min(1e-3, paso / 10)];
      if (w[0] > x.v[0] + 1e-6 || w[1] < x.v[1] - 1e-6) m.set(x.e, w);
    });
  });
}
const ventanas = new Map();
/** Las cartas de Pablo siguen sus paradas; las de otro escritor, las estancias de ese escritor si las tiene. */
const ventanaCarta = (c) => {
  if (!ventanas.has(c)) {
    const quien = c.escritor || 'pablo';
    ventanas.set(c, quien === 'pablo' ? ventanaPablo(c.fecha, c.escrita_en) : (ventana(quien, c.fecha, c.escrita_en) || tramo(c.fecha)));
  }
  return ventanas.get(c);
};
/** Los sucesos de Pablo siguen sus paradas; los demás, su fecha afinada con el detalle o el orden del relato. */
const ventanaEvento = (e) => {
  if (!ventanas.has(e)) {
    let v;
    if ((e.personas || []).includes('pablo') && BE.P.length) v = ventanaPablo(e.fecha, e.lugares);
    else v = repartoRelato().get(e) || ventanaFecha(e.fecha);
    ventanas.set(e, v);
  }
  return ventanas.get(e);
};
const momentoCarta = (c) => { const v = ventanaCarta(c); return v ? (v[0] + v[1]) / 2 : null; };
const momentoEvento = (e) => { const v = ventanaEvento(e); return v ? (v[0] + v[1]) / 2 : null; };
/** ¿El suceso tiene una fecha que no es exacta (narrativa, aproximada, repartida por el relato o calculada)? */
const eventoEstimado = (e) => !!(e.fecha?.aprox || e.fecha?.tipo === 'narrativa' || e.fecha?.tipo === 'derivada' || repartoRelato().has(e));

// ---------------------------------------------------------------------------
// Cualquier persona
// ---------------------------------------------------------------------------
const lugarConPunto = (id) => { const l = BE.L[id]; return l && l.lat != null && l.lon != null ? l : null; };
const RELACIONES_LUGAR = new Set(['vivio_en', 'nacio_en', 'murio_en']);
const cacheEst = new Map();
/** Estancias de una persona, ordenadas: { key, sel, lugar, a, b, narrativa, titulo, referencia, origen }.
    Pablo: sus paradas. Los demás: sus viajes, los sucesos que la nombran con un lugar situado y sus relaciones
    vivio_en, nacio_en y murio_en con fecha. Un suceso con varios lugares la pone en el primero; si el primero no tiene
    punto (un lugar incierto), no la sitúa: el siguiente lugar de la lista no es donde estaba. Si el suceso trae
    `presentes`, solo sitúa a esas personas: las demás de `personas` solo se nombran (Augusto en el nacimiento de Jesús). */
function estancias(persona) {
  if (persona === 'pablo') return BE.P;
  if (cacheEst.has(persona) && cacheEst.get(persona).D === BE.D) return cacheEst.get(persona).lista;
  const lista = [];
  if (BE.D.viajes.some((v) => esDe(v, persona))) {
    for (const s of prepararParadas(persona)) lista.push({ ...s, origen: 'viaje' });
  }
  for (const e of BE.D.eventos || []) {
    if (!(e.personas || []).includes(persona) || (e.presentes && !e.presentes.includes(persona))) continue;
    const lugar = lugarConPunto((e.lugares || [])[0]);
    const v = ventanaEvento(e);
    if (!lugar || !v) continue;
    lista.push({ key: `evento:${e.id}`, sel: `evento:${e.id}`, lugar, a: v[0], b: v[1], narrativa: eventoEstimado(e), titulo: e.titulo,
      referencia: (e.pasajes || []).join('; '), origen: 'evento', fecha: e.fecha });
  }
  const p = BE.PERS[persona];
  (p?.relaciones || []).forEach((r, i) => {
    if (!RELACIONES_LUGAR.has(r.tipo) || !r.fecha) return;
    const lugar = lugarConPunto(r.lugar), v = ventanaFecha(r.fecha);
    if (!lugar || !v) return;
    lista.push({ key: `rel:${persona}:${i}`, sel: `persona:${persona}`, lugar, a: v[0], b: v[1],
      narrativa: !!(r.fecha.aprox || r.fecha.tipo === 'narrativa' || r.deducido), titulo: `${({ vivio_en: 'En', nacio_en: 'Nace en', murio_en: 'Muere en' })[r.tipo]} ${lugar.nombre}`,
      referencia: r.fecha.texto || '', origen: r.tipo, fecha: r.fecha, larga: true });
  });
  lista.sort((x, y) => x.a - y.a || (y.b - y.a) - (x.b - x.a));
  lista.forEach((s, g) => { s.g = g; });
  cacheEst.set(persona, { D: BE.D, lista });
  return lista;
}
/** Huecos máximos (años) entre dos estancias. Entre dos lugares distintos, hasta unos tres meses lo damos por un viaje
    («de camino», estimado). En el mismo lugar, hasta medio año lo damos por una estancia seguida (estimada). Más largo:
    no sabemos dónde estaba y BE.donde devuelve null. */
const HUECO_CAMINO = 0.25, HUECO_MISMO = 0.5;
function dondeGeneral(persona, t) {
  const L = estancias(persona);
  if (!L.length) return null;
  // La estancia más corta que cubre t: un suceso gana a «vivió en».
  let mejor = null;
  for (const s of L) if (s.a <= t && t <= s.b && (!mejor || s.b - s.a < mejor.b - mejor.a)) mejor = s;
  if (mejor) {
    const sig = L.find((s) => s.a > mejor.b) || null;
    return { persona, en: mejor, sig, parada: true, estimada: mejor.narrativa, pos: [mejor.lugar.lon, mejor.lugar.lat], banda: mejor.narrativa ? [mejor.a, mejor.b] : null };
  }
  let prev = null, sig = null;
  for (const s of L) { if (s.b < t && (!prev || s.b > prev.b)) prev = s; if (s.a > t && (!sig || s.a < sig.a)) sig = s; }
  if (!prev || !sig) return null;
  const hueco = sig.a - prev.b;
  if (prev.lugar.id === sig.lugar.id) {
    if (hueco > HUECO_MISMO) return null;
    return { persona, en: prev, sig, parada: true, entre: true, estimada: true, pos: [prev.lugar.lon, prev.lugar.lat], banda: [prev.b, sig.a] };
  }
  if (hueco > HUECO_CAMINO) return null;
  const f = (t - prev.b) / Math.max(1e-6, sig.a - prev.b);
  return { persona, en: prev, sig, parada: false, f, estimada: true, pos: interpolar(prev.lugar, sig.lugar, f), banda: [prev.b, sig.a] };
}
/** Suceso en el que BE.donde pone a la persona en t, o null si su lugar no sale de un suceso. La tarjeta «Mientras
    tanto» lo usa para nombrar el mismo suceso y el mismo lugar que la bandera de la línea. */
function sucesoEn(persona, t) {
  const w = donde(persona, t);
  if (!w?.parada || w.entre || !w.en.sel?.startsWith('evento:')) return null;
  const id = w.en.sel.slice(7);
  return (BE.D.eventos || []).find((e) => e.id === id) || null;
}
/** Interfaz fija para los demás ficheros: dónde está una persona en t, o null si los datos no la sitúan. */
const donde = (persona, t) => (persona === 'pablo' ? dondeEsta(t) : dondeGeneral(persona, t));
/** Parte de la fecha en que las estancias de la persona la ponen en uno de esos lugares (ver ventanaEnLista). */
function ventana(persona, fecha, lugares) {
  if (persona === 'pablo') return ventanaPablo(fecha, lugares);
  const L = estancias(persona);
  return L.length ? ventanaEnLista(L, fecha, lugares) : null;
}
/** Personas con estancias (se calcula una vez por carga de datos). */
let conEstancias = null;
function personasConEstancias() {
  if (conEstancias && conEstancias.D === BE.D) return conEstancias.ids;
  const ids = Object.keys(BE.PERS || {}).filter((id) => estancias(id).length);
  conEstancias = { D: BE.D, ids };
  return ids;
}
/** Quién está dónde en t: [{ persona, w }] de todas las personas que los datos sitúan en un lugar en t. */
function presentes(t) {
  const out = [];
  for (const id of personasConEstancias()) {
    const w = donde(id, t);
    if (w && w.parada) out.push({ persona: id, w });
  }
  return out;
}
/** Suceso cuyo título empieza por `re` («Nace…», «Muerte de…») y que tiene a la persona en primer lugar, con fecha que
    no sea cálculo. En un nacimiento o una muerte la primera de `personas` es quien nace o muere; las demás estaban allí
    (María y José en el nacimiento de Jesús), así que no cuentan. */
const sucesoDe = (persona, re) => (BE.D.eventos || []).find((e) => (e.personas || [])[0] === persona && re.test(e.titulo || '') && e.fecha && e.fecha.tipo !== 'derivada');
/** Edad aproximada en t, solo con un nacimiento fechado: un nacio_en con fecha o un suceso «Nace…»/«Nacimiento de…» que
    la ponga primera (nunca se calcula de otra cosa). { n, texto, nacimiento, fuentes } o null. */
function edad(persona, t) {
  const p = BE.PERS[persona];
  if (!p) return null;
  const r = (p.relaciones || []).find((x) => x.tipo === 'nacio_en' && x.fecha && x.fecha.tipo !== 'derivada');
  const ev = r ? null : sucesoDe(persona, /^(nace|nacimiento)\b/i);
  const v = r ? ventanaFecha(r.fecha) : ev && ventanaEvento(ev);
  if (!v) return null;
  // Nada de edades después de su muerte ni fuera de su vida conocida.
  const muerte = (p.relaciones || []).find((x) => x.tipo === 'murio_en' && x.fecha);
  const evMuerte = muerte ? null : sucesoDe(persona, /^(muere|muerte)\b/i);
  const fin = muerte ? ventanaFecha(muerte.fecha)?.[1] : evMuerte ? ventanaEvento(evMuerte)?.[1] : (p.fecha?.hasta != null ? tramo(p.fecha)[1] : null);
  if (fin != null && t > fin) return null;
  const n = Math.floor(t - (v[0] + v[1]) / 2);
  if (n < 0 || n > 130) return null;
  const f = r ? r.fecha : ev.fecha;
  return { n, texto: `c. ${n} ${n === 1 ? 'año' : 'años'}`, nacimiento: f.texto || '', fuentes: (r || ev).fuentes || [] };
}

// ---------------------------------------------------------------------------
// Potencias mundiales con un extremo sin fecha
// ---------------------------------------------------------------------------
/** Tramo [a, b) de un periodo. Una potencia mundial con un extremo sin fecha (Egipto sin fin, Asiria sin principio) no
    se reduce a un año: el extremo que falta llega hasta el extremo conocido de la potencia vecina, y el tramo lleva
    `abierto` = 'd' (fin sin fecha) o 'i' (principio sin fecha). Ese trozo es el cambio sin fechar: se dibuja difuso. */
let cachePot = null;
function tramoPotencia(p) {
  const tr = tramo(p?.fecha);
  if (!tr || p.tipo !== 'potencia' || (p.fecha.desde != null && p.fecha.hasta != null)) return tr;
  if (!cachePot || cachePot.D !== BE.D) {
    const clave = (x) => x.fecha.desde ?? x.fecha.hasta - 0.5;   // la que solo tiene fin va antes de la que empieza ese año
    cachePot = { D: BE.D, m: new Map(), ps: (BE.D.periodos || []).filter((x) => x.tipo === 'potencia' && tramo(x.fecha)).sort((a, b) => clave(a) - clave(b)) };
  }
  if (cachePot.m.has(p)) return cachePot.m.get(p);
  const ps = cachePot.ps, i = ps.indexOf(p);
  let out = tr;
  if (p.fecha.hasta == null && ps[i + 1]) {
    const f = ps[i + 1].fecha;
    // Empieza la siguiente o, si no tiene principio, el año desde el que ya consta como potencia o, si tampoco, acaba.
    const fin = f.desde ?? ps[i + 1].consta_desde ?? f.hasta;
    if (fin > tr[0]) { out = [tr[0], fin]; out.abierto = 'd'; }
  } else if (p.fecha.desde == null && i > 0) {
    const f = ps[i - 1].fecha;
    const ini = f.hasta != null ? f.hasta + 1 : f.desde;   // acaba la anterior o, si tampoco tiene fin, empieza
    if (ini < tr[1]) { out = [ini, tr[1]]; out.abierto = 'i'; }
  }
  cachePot.m.set(p, out);
  return out;
}
/** Tramo de cualquier periodo: el de su fecha, salvo las potencias con un extremo sin fecha (tramoPotencia). */
const tramoPeriodo = (p) => (p?.tipo === 'potencia' ? tramoPotencia(p) : tramo(p?.fecha));

Object.assign(BE, {
  prepararParadas: () => prepararParadas('pablo'), dondeEsta, viajeActual, ventanaPablo, ventanaCarta, ventanaEvento, momentoCarta, momentoEvento,
  donde, sucesoEn, ventana, estancias, presentes, personasConEstancias, edad, tramoPotencia, tramoPeriodo, ventanaFecha, inicioMes, diaHebreo, anioHebreo, nombreMes, eventoEstimado, calendario, DIA, MES_LUNAR,
});
})();
