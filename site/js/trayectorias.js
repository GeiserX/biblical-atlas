/* biblical-atlas · trayectorias: dónde está cada persona en cada momento y en qué ventana de tiempo cae cada carta o suceso.
   Pablo sigue sus paradas, y sus sucesos y cartas se colocan en ellas (colocarEnParadas). Con cualquier otra persona que
   viaja manda el relato: sus sucesos quedan donde los ponen su fecha y el orden del relato, y sus paradas los siguen
   (sucesosDeParadas). Cualquier otra persona se sitúa con sus viajes, los sucesos que la nombran con lugar y sus relaciones fechadas
   (vivio_en, nacio_en, murio_en). Nunca se inventa una posición: fuera de lo que dicen los datos, BE.donde devuelve
   null. Un lugar sin punto sigue siendo una estancia; el mapa la dibuja donde dice BE.puntoLugar. Dueño durante el
   reparto: app-tiempo. */
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
// cercana al equinoccio de primavera, hacia el 21 de marzo (Perspicacia «Nisán», párr. 3: si la luna nueva quedaba
// demasiado lejos del equinoccio, ese mes era el decimotercero y Nisán empezaba con la luna siguiente).
// Un año con trece lunas lleva Veadar entre Adar y Nisán. El día hebreo va de una puesta de sol a la siguiente
// (Perspicacia «Día»), y las horas de luz, más o menos de seis a seis: cada mes empieza a las 18:00 de la víspera.
// Las lunas son medias, no observadas: las fechas que salen de aquí llevan siempre «c.».
// ---------------------------------------------------------------------------
const EQUINOCCIO = (59 + 20.5) * DIA;   // mediodía del 21 de marzo, en nuestros días sin bisiestos (31 + 28 días antes de marzo)
const LUNA_0 = 2000 + (5 + 18.23 / 24) * DIA;   // luna nueva media del 6 de enero de 2000, 18:14 UT (dato astronómico)
let calCache = null;
function calendario() {
  if (calCache && calCache.D === BE.D) return calCache;
  const meses = BE.D?.calendario?.meses || [];
  const inicio = EQUINOCCIO;
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
    Veadar en un año sin él da el final de adar, es decir, el 1 de nisán, y lo avisa: nuestro cálculo de lunas medias
    no le da ese mes a ese año. */
function inicioMes(y, mes, esAnioHebreo = false) {
  const c = calendario();
  const m = c.porId.get(mes);
  if (!m) return null;
  const A = anioHebreo(!esAnioHebreo && m.orden >= 11 ? y - 1 : y);
  const k = Math.min(m.orden, A.meses.length + 1) - 1;
  if (k < A.meses.length) return A.meses[k].a;
  BE.avisar?.(`Según nuestro cálculo, aproximado, el año hebreo que empezó en ${BE.fmtAnio(A.anio)} no tuvo ${m.nombre}: `
    + `la fecha cae en ${nombreMes(c.porOrden.get(1), A.anio + 1).nombre || 'nisán'}.`, 8000);
  return A.meses.at(-1).b;
}
/** Nombre del mes en la época del año hebreo y (desde/hasta de `nombres`, como los lugares). Si ningún nombre es de
    esa época (Siván antes del exilio, que la Biblia llama «el tercer mes»), da el de siempre con `anacronico`.
    En el año frontera, que dos épocas comparten (Abib hasta -536, Nisán desde -536), gana el nombre que empieza, sea
    cual sea el orden del YAML; con la misma época exacta (Hesván y Marhesván), el primero de la lista. */
function nombreMes(m, y) {
  const ns = m?.nombres || [];
  let n = null;
  for (const x of ns) {
    if (!((x.desde == null || y >= x.desde) && (x.hasta == null || y <= x.hasta))) continue;
    if (!n || (x.desde ?? -Infinity) > (n.desde ?? -Infinity)) n = x;
  }
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
// Paradas de los viajes (el modelo de v0 de Pablo, para cualquiera con viajes)
// ---------------------------------------------------------------------------
/** Momentos [inicio, fin] (años decimales) en que situamos una parada anclada. Con fecha.detalle (mes y día hebreos, o
    estación), el principio de esa ventana: un solo momento, como el de un año, que sus sucesos alargan. */
function momentos(f) {
  const d = f.desde ?? f.hasta, h = f.hasta ?? f.desde;
  if (d == null) return null;
  if (f.detalle && (f.detalle.mes || f.detalle.estacion)) {
    const w = ventanaFecha(f);
    if (w && w !== tramo(f) && w[1] - w[0] < 1) return [w[0], w[0]];
  }
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
// Un viaje sin `persona` es de Pablo y una carta sin `escritor` es suya: así lo dice el esquema de los datos. Quién hace
// cada viaje (una persona, un grupo o Pablo) lo dicen BE.duenoViaje y sus vecinas, en base.js.
const { duenoViaje, esGrupo } = BE;
const escritorDe = (c) => c.escritor || 'pablo';
const esDe = (v, persona) => duenoViaje(v) === persona;
/** Quién lleva sus sucesos y cartas en sus paradas: Pablo, cuyas paradas se fecharon una a una con Hechos (el modelo de
    v0). Con cualquier otra persona manda el relato: sus sucesos se quedan donde los pone su fecha y el orden del relato,
    y son sus paradas las que los siguen (sucesosDeParadas). Así un viaje nuevo no saca de su sitio ningún suceso. */
const SUCESOS_EN_PARADAS = new Set(['pablo']);
/** Para quien no es Pablo, lo que el relato dice de cada parada: Map(parada → { w, exacta }).
    Una parada que cuenta un suceso suyo (en uno de los lugares del suceso, con algún versículo en común y en años que
    se tocan) va en la ventana donde quedó el suceso (si son varios, de la primera a la última), y es exacta: la persona
    está allí mientras pasa. Una parada que no cuenta ninguno, pero cuya fecha es de años, va entre los sucesos suyos que
    el mismo libro cuenta antes y después de ella (por su primer pasaje): Saúl busca las burras antes de que lo unjan en
    Zuf y vuelve después. */
function sucesosDeParadas(persona, P) {
  const m = new Map();
  // Para el orden cuenta todo suceso que la nombra; para estar en la parada, solo aquel en que está (`presentes`).
  // Un grupo no sale en `personas`: sus sucesos son los que cuentan algún versículo de la referencia del viaje.
  const vsGrupo = esGrupo(persona) ? versiculos((BE.D.viajes || []).find((v) => v.id === persona.slice(6))?.referencia) : null;
  const evs = (BE.D.eventos || []).filter((e) => (vsGrupo ? seCruzan(versiculos((e.pasajes || []).join('; ')), vsGrupo) : (e.personas || []).includes(persona)))
    .map((e) => ({ e, presente: !!vsGrupo || !e.presentes || e.presentes.includes(persona), vs: versiculos((e.pasajes || []).join('; ')), primero: versiculos((e.pasajes || [])[0])[0], v: null }));
  if (!evs.length) return m;
  const ventana = (x) => (x.v ??= ventanaEvento(x.e) || false);
  for (const s of P) {
    const ts = tramo(s.p.fecha);
    const vs = versiculos(s.p.referencia);
    let w = null;
    for (const x of evs) {
      const te = tramo(x.e.fecha);
      if (!x.presente || !(x.e.lugares || []).includes(s.lugar.id) || !te || (ts && !(te[0] < ts[1] && ts[0] < te[1])) || !seCruzan(x.vs, vs)) continue;
      const v = ventana(x);
      if (v) w = w ? [Math.min(w[0], v[0]), Math.max(w[1], v[1])] : [v[0], v[1]];
    }
    if (w) { m.set(s, { w, exacta: true }); continue; }
    const r = vs[0], f = s.p.fecha || {};
    if (!r || !ts || s.narrativa || f.detalle) continue;
    // Después de que acaben los de antes y antes de que empiecen los de después; si no hay sitio, basta con que no
    // quede antes de que empiecen los de antes ni después de que acaben los de después.
    let lo = ts[0], hi = ts[1], lo2 = ts[0], hi2 = ts[1];
    for (const x of evs) {
      if (!x.primero || x.primero[0] !== r[0]) continue;
      const v = ventana(x);
      if (!v || !(v[0] < ts[1] && ts[0] < v[1])) continue;
      if (x.primero[2] < r[1]) { lo = Math.max(lo, v[1]); lo2 = Math.max(lo2, v[0]); }
      else if (x.primero[1] > r[2]) { hi = Math.min(hi, v[0]); hi2 = Math.min(hi2, v[1]); }
    }
    if (!(hi > lo)) { lo = lo2; hi = hi2; }
    if (hi > lo && (lo > ts[0] || hi < ts[1])) m.set(s, { w: [lo, hi], exacta: false });
  }
  return m;
}
const clampT = (x, a, b) => Math.max(a, Math.min(b, x));
/** Ventana en que tiene que caer una parada anclada: su fecha afinada con el detalle (un año, un mes, un día). */
function ventanaParada(f) {
  return ventanaFecha(f) || tramo(f);
}
/** Ordena las paradas de los viajes de una persona (Pablo si no se dice) y les da un momento.
    Paradas ancladas: su fecha. Cada una va al menos 0.04 años (unos quince días) por cada tramo de camino después de la
    anterior, pero ese empujón nunca la saca de su propia fecha ni la deja después de la muerte de la persona: si no hay
    sitio, las anteriores se adelantan dentro de las suyas y los empujones se acortan (dieciocho paradas de un mismo
    año caben en ese año; tres paradas del 9 de nisán, en ese día). Paradas en tiempo narrativo: repartidas por igual
    entre las dos anclas que las rodean. */
function prepararParadas(persona = 'pablo') {
  const viajes = BE.D.viajes.filter((v) => esDe(v, persona)).sort((a, b) => (a.fecha?.desde ?? 0) - (b.fecha?.desde ?? 0));
  const todas = [];
  for (const v of viajes) {
    const ps = [...v.paradas].sort((a, b) => a.orden - b.orden);
    ps.forEach((p, i) => {
      const lugar = p.unknown_area ? lugarDesconocido(p.unknown_area) : BE.L[p.lugar];
      if (!lugar) return;
      todas.push({ key: `${v.id}/${p.orden}`, viaje: v, p, lugar, i, n: ps.length, narrativa: !!p.unknown_area || p.fecha?.tipo === 'narrativa' || !momentos(p.fecha || {}) });
    });
  }
  // Las áreas desconocidas no entran en el reparto: van pegadas a su parada vecina con lugar (colocarAreas).
  const out = todas.filter((s) => !s.lugar.area);
  const suceso = SUCESOS_EN_PARADAS.has(persona) ? new Map() : sucesosDeParadas(persona, out);
  const anclas = out.map((s, i) => (s.narrativa && !suceso.has(s) ? -1 : i)).filter((i) => i >= 0);
  // La muerte de la persona (su fecha, sin colocar: colocarla depende de estas paradas) cierra el tiempo de sus paradas.
  const muerte = muerteDe(persona);
  const finVida = muerte ? ventanaFecha(muerte.fecha)?.[1] : null;
  // Primero, cada ancla en su fecha y al menos 0.04 años por tramo después de la anterior (el modelo de Pablo).
  const A = anclas.map((j, k) => {
    const r = suceso.get(out[j]);
    const w = r ? r.w : ventanaParada(out[j].p.fecha);
    let [a, b] = r?.exacta ? w : momentos(out[j].p.fecha);
    // Entre los sucesos que la rodean, su momento de siempre (la mitad del año) si cae dentro; si no, el más cercano.
    if (r && !r.exacta) { const d = Math.min(b - a, w[1] - w[0]); a = clampT(a, w[0], w[1] - d); b = a + d; }
    const hi = finVida != null && finVida > w[0] && finVida < w[1] ? finVida : w[1];
    return { a, b, lo: w[0], hi, clave: `${w[0]}|${w[1]}`, g: 0.04 * (j - (k ? anclas[k - 1] : -1)) };
  });
  A.forEach((x, k) => {
    if (k && x.a < A[k - 1].b + x.g) { x.a = A[k - 1].b + x.g; x.b = Math.max(x.b, x.a); }
  });
  // Si ese empujón deja alguna fuera de su fecha (o después de la muerte), las anteriores se adelantan lo justo para que
  // quepa, sin salir de las suyas. Las que comparten una ventana se reparten su anchura: ni el empujón ni la estancia de
  // cada una pasan de la parte que le toca.
  if (A.some((x) => x.a >= x.hi)) {
    const cuenta = new Map();
    A.forEach((x) => cuenta.set(x.clave, (cuenta.get(x.clave) || 0) + 1));
    A.forEach((x) => {
      const n = cuenta.get(x.clave);
      x.g = Math.min(x.g, (x.hi - x.lo) / (n + 1)); x.d = Math.min(x.b - x.a, (x.hi - x.lo) / n);
    });
    let tope = Infinity;
    for (let k = A.length - 1; k >= 0; k--) {
      const x = A[k];
      tope = Math.min(x.hi - Math.max(x.d, Math.min(DIA, (x.hi - x.lo) / 2)), tope - x.d);
      if (x.a > tope) { x.a = Math.max(x.lo, tope); x.b = x.a + x.d; }
      tope = x.a - x.g;
    }
    // Las que se adelantan no pasan por encima de la anterior, y la anterior acaba antes de que llegue la siguiente.
    A.forEach((x, k) => {
      if (!k) return;
      const y = A[k - 1];
      x.a = Math.max(x.a, y.a); x.b = Math.max(x.b, x.a);
      if (y.b > x.a) y.b = x.a;
    });
  }
  A.forEach((x, k) => { out[anclas[k]].a = x.a; out[anclas[k]].b = x.b; });
  let prev = -1;
  for (let k = 0; k <= anclas.length; k++) {
    const j = k < anclas.length ? anclas[k] : out.length;
    const nNar = j - prev - 1;
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
  const P = colocarAreas(todas);
  P.forEach((s, i) => { s.g = i; s.sel = `parada:${s.key}`; s.titulo = s.lugar.nombre; s.referencia = s.p.referencia; });
  return P;
}
/** El «lugar» de una parada que la fuente no sitúa (`unknown_area`): sin id ni punto, con las palabras de la fuente
    como nombre y su rumbo, si lo da. BE.puntoLugar no le encuentra sitio, así que la persona no se dibuja allí y el
    mapa dibuja el área (mapa.js, pintarAreas). */
function lugarDesconocido(area) {
  return { id: null, nombre: area.words, area: { palabras: area.words, rumbo: area.direction || null, zonas: (area.guesses || []).map(zonaConjeturada) } };
}
/** Una zona que conjeturamos para un área desconocida (`guesses`), con su contorno de build.py: la preferida va primera.
    Es una conjetura con su fuente, no lo que dice el texto: nadie se sitúa en ella (BE.puntoLugar no la mira). */
function zonaConjeturada(g) {
  const b = g.bbox, c = g.center ? [g.center.lon, g.center.lat] : [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2];
  return { nombre: g.name, ring: g.ring, bbox: b, centro: c, fuentes: g.sources || [], razon: g.reason, nota: g.note, estado: g.status };
}
/** Tiempo de cada área desconocida, ya colocadas las demás paradas: un tramo de camino antes de la primera parada con
    lugar de su viaje (de allí vienen) o después de la última (allí van), sin salir de la fecha del viaje si cabe. El
    tramo es el de siempre entre dos paradas, 0.04 años; si la fecha no deja sitio, la mitad de lo que deja. Es una
    estimación: la parada va como narrativa. Un viaje sin ninguna parada con lugar no la coloca. */
function colocarAreas(todas) {
  const TRAMO = 0.04;
  for (const s of todas) {
    if (!s.lugar.area) continue;
    const delViaje = todas.filter((x) => x.viaje === s.viaje && !x.lugar.area && x.a != null);
    if (!delViaje.length) continue;
    const f = tramo(s.viaje.fecha);
    if (s.i < delViaje[0].i) {
      const k = delViaje[0], hueco = f && k.a - f[0] > DIA ? Math.min(TRAMO, (k.a - f[0]) / 2) : TRAMO;
      s.b = k.a - hueco; s.a = s.b - hueco;
    } else {
      const k = delViaje[delViaje.length - 1], hueco = f && f[1] - k.b > DIA ? Math.min(TRAMO, (f[1] - k.b) / 2) : TRAMO;
      s.a = k.b + hueco; s.b = s.a + hueco;
    }
    s.vecina = s.i < delViaje[0].i ? delViaje[0] : delViaje[delViaje.length - 1];
  }
  return todas.filter((s) => s.a != null);
}

// ---------------------------------------------------------------------------
// Sucesos y cartas en las paradas de Pablo (SUCESOS_EN_PARADAS)
// ---------------------------------------------------------------------------
/** Personas con viajes. */
let viajerosCache = null;
function viajeros() {
  if (viajerosCache && viajerosCache.D === BE.D) return viajerosCache.s;
  viajerosCache = { D: BE.D, s: new Set((BE.D.viajes || []).map(duenoViaje)) };
  return viajerosCache.s;
}
/** Las personas de `personas` que tienen viajes y que estaban allí (`presentes`), en su orden. */
function candidatos(e) {
  const vs = viajeros();
  return (e.personas || []).filter((p) => vs.has(p) && SUCESOS_EN_PARADAS.has(p) && (!e.presentes || e.presentes.includes(p)));
}
/** Paradas de cada persona con viajes y los sucesos y cartas colocados en ellas, una vez por carga de datos:
    { its: Map(persona → { P, m }), quien: Map(suceso → persona) }. Un suceso es de las paradas de la primera de sus
    candidatas que tiene una parada en uno de sus lugares y en su fecha; si ninguna la tiene, no es de ninguna parada y
    se coloca con su fecha y el orden del relato. Se mira con las paradas sin alargar, así que no depende del orden. */
let itCache = null;
function itinerarios() {
  if (itCache && itCache.D === BE.D) return itCache;
  const its = new Map();
  for (const p of viajeros()) if (SUCESOS_EN_PARADAS.has(p)) its.set(p, { P: prepararParadas(p), m: new Map() });
  const quien = new Map();
  for (const e of BE.D.eventos || []) {
    const tr = ventanaFecha(e.fecha);
    if (!tr) continue;
    const p = candidatos(e).find((q) => its.get(q).P.some((s, g) => (e.lugares || []).includes(s.lugar.id) && ventanaEnParada(its.get(q).P, g, tr)));
    if (p) quien.set(e, p);
  }
  itCache = { D: BE.D, its, quien };
  for (const [p, it] of its) it.m = colocarEnParadas(it.P, p, quien);
  return itCache;
}
const SIN_PARADAS = { P: [], m: new Map() };
/** Paradas de una persona. Las de quien no es Pablo siguen a sus sucesos ya colocados, así que se calculan aparte y
    después (itinerarios no las necesita: ningún suceso va en ellas). */
let otrosCache = null;
function itinerario(persona) {
  const it = itinerarios().its.get(persona);
  if (it) return it;
  if (!viajeros().has(persona)) return SIN_PARADAS;
  if (!otrosCache || otrosCache.D !== BE.D) otrosCache = { D: BE.D, its: new Map() };
  if (!otrosCache.its.has(persona)) otrosCache.its.set(persona, { P: prepararParadas(persona), m: new Map() });
  return otrosCache.its.get(persona);
}
/** Quién sitúa al suceso con sus paradas, o null si ninguna parada de nadie lo acoge. */
const viajeroDe = (e) => itinerarios().quien.get(e) || null;
/** Lo más que una parada se alarga hacia cada lado para acoger sus sucesos. Una parada de un solo momento («c. 36 e.c.»)
    no dice cuánto duró: la dejamos en unos días, marcados como estimados, y no en meses (Gál 1:18 habla de quince días). */
const ALCANCE_MAX = 15 * DIA;
/** Tiempo en que la persona puede estar en la parada g: su estancia y, a cada lado, el 40 % del camino hasta la parada
    vecina (la vecina toma otro 40 % y queda un 20 % de camino), sin pasar de ALCANCE_MAX. Sin vecina a un lado, se usa
    el camino del otro. */
function alcance(P, g) {
  const s = P[g];
  const antes = g > 0 ? Math.max(0, s.a - P[g - 1].b) : null;
  const despues = g < P.length - 1 ? Math.max(0, P[g + 1].a - s.b) : null;
  return [s.a - Math.min(ALCANCE_MAX, 0.4 * (antes ?? despues ?? 0)), s.b + Math.min(ALCANCE_MAX, 0.4 * (despues ?? antes ?? 0))];
}
/** Versículos de una referencia («Hch 8:3; 9:1, 2», «Hch 21:27–23:30»): [[libro, desde, hasta]], con capítulo × 1000 +
    versículo. Un trozo sin libro sigue el libro del anterior. */
function versiculos(texto) {
  const out = [];
  let libro = null;
  for (const trozo of String(texto || '').split(';')) {
    const m = trozo.trim().match(/^((?:[123]\s?)?\p{L}+\.?)?\s*(\d+):(.+)$/u);
    if (!m) continue;
    if (m[1]) libro = norm(m[1]).replace(/[\s.]/g, '');
    if (!libro) continue;
    const cap = +m[2];
    for (const parte of m[3].split(',')) {
      const r = parte.trim().match(/^(\d+)(?:\s*[-–]\s*(?:(\d+):)?(\d+))?/);
      if (r) out.push([libro, cap * 1000 + +r[1], r[3] ? (r[2] ? +r[2] : cap) * 1000 + +r[3] : cap * 1000 + +r[1]]);
    }
  }
  return out;
}
/** ¿Comparten algún versículo dos listas de versiculos()? */
const seCruzan = (xs, ys) => xs.some(([l, a, b]) => ys.some(([m, c, d]) => l === m && a <= d && c <= b));
/** Parte del tramo tr en que la persona está en la parada g: dentro de la estancia si el tramo la toca y ella dura;
    si no (una parada de un solo momento, o un suceso fuera de ella), dentro de su alcance. null si no cabe. */
function ventanaEnParada(P, g, tr) {
  const s = P[g];
  if (s.b - s.a >= 1e-3) {
    const a = Math.max(s.a, tr[0]), b = Math.min(s.b, tr[1]);
    if (b > a) return [a, b];
  }
  const [x, y] = alcance(P, g);
  const a = Math.max(x, tr[0]), b = Math.min(y, tr[1]);
  return b > a ? [a, b] : null;
}
/** Parte del tramo tr que cae fuera de una lista de estancias ordenada, donde no sabemos dónde estaba; si no hay, tr. */
function fueraDeLista(P, tr) {
  const ini = P[0]?.a ?? Infinity, fin = P.at(-1)?.b ?? -Infinity;
  if (tr[0] < fin && fin < tr[1]) return [fin + 1e-3, tr[1]];
  if (tr[0] < ini && ini < tr[1]) return [tr[0], ini];
  return tr;
}
/** Coloca en las paradas P los sucesos que la persona vive (quien) y las cartas que escribe, y alarga cada parada
    para que dure al menos lo que duran ellos: mientras pasan, la persona está allí, no de camino. Lo alargado queda
    fuera de [a0, b0], la estancia que dan los datos, y se muestra como estimado.
    Un suceso con orden_relato va a una parada de sus lugares, en su fecha, que no queda antes de la del suceso anterior
    de su serie: el orden del relato elige la visita (Perga a la vuelta, la carta de Jerusalén después del concilio).
    Entre ellas gana la primera cuya referencia tiene los versículos del suceso (el arresto de Hch 21:27 va en la
    custodia, no en la llegada de Pentecostés; la tormenta de Hch 27, en Cauda y no en Malta); si ninguna, la primera
    de su primer lugar. Sin orden, o si todas quedan antes, va a su primer lugar con paradas en su fecha y gana la
    estancia más larga. Devuelve Map(suceso o carta → [a, b]). */
function colocarEnParadas(P, persona, quien) {
  const m = new Map();
  if (!P.length) return m;
  const cosas = [];
  (BE.D.eventos || []).forEach((e, i) => { if (quien.get(e) === persona) cosas.push({ x: e, i, lugares: e.lugares, tr: ventanaFecha(e.fecha), o: e.orden_relato, vs: versiculos((e.pasajes || []).join('; ')) }); });
  (BE.D.cartas || []).forEach((c, i) => { if (escritorDe(c) === persona) cosas.push({ x: c, i: 1e9 + i, lugares: c.escrita_en, tr: tramo(c.fecha) }); });
  const vsParada = P.map((s) => versiculos(s.referencia));
  // En el orden del relato; con el mismo número, el destino de un «tras» va antes.
  cosas.sort((p, q) => {
    if (!p.o || !q.o) return (p.o ? 0 : 1) - (q.o ? 0 : 1) || p.i - q.i;
    if (p.o.serie !== q.o.serie) return p.o.serie < q.o.serie ? -1 : 1;
    if (p.o.orden !== q.o.orden) return p.o.orden - q.o.orden;
    if (q.o.tras === p.x.id) return -1;
    if (p.o.tras === q.x.id) return 1;
    return p.i - q.i;
  });
  const ultima = new Map();   // serie → parada del último suceso de esa serie
  const colocadas = [];
  for (const c of cosas) {
    if (!c.tr) continue;
    const desde = c.o ? (ultima.get(c.o.serie) ?? 0) : 0;
    let elegida = null, libre = null;
    const validas = [];
    for (const id of c.lugares || []) {
      const opciones = [];
      P.forEach((s, g) => { if (s.lugar.id === id) { const w = ventanaEnParada(P, g, c.tr); if (w) opciones.push({ g, w }); } });
      if (!opciones.length) continue;
      if (c.o) validas.push(...opciones.filter((x) => x.g >= desde));
      libre ??= opciones.reduce((x, y) => (y.w[1] - y.w[0] > x.w[1] - x.w[0] ? y : x));
      if (!c.o) break;
    }
    if (c.o) elegida = validas.find((x) => seCruzan(c.vs, vsParada[x.g])) || validas[0] || null;
    if (elegida && c.o) ultima.set(c.o.serie, elegida.g);
    const r = elegida || libre;
    if (r) { m.set(c.x, r.w); colocadas.push(r); } else m.set(c.x, fueraDeLista(P, c.tr));
  }
  // Las paradas se alargan después de colocarlo todo: el alcance de cada una se mide con las paradas sin alargar.
  for (const s of P) { s.a0 = s.a; s.b0 = s.b; }
  for (const { g, w } of colocadas) { P[g].a = Math.min(P[g].a, w[0]); P[g].b = Math.max(P[g].b, w[1]); }
  // La banda de las paradas en tiempo narrativo va de la parada anclada anterior a la siguiente, ya alargadas.
  P.forEach((s, g) => {
    if (!s.banda) return;
    let i = g - 1, j = g + 1;
    while (i >= 0 && P[i].narrativa) i--;
    while (j < P.length && P[j].narrativa) j++;
    s.banda = [Math.min(s.a, i >= 0 ? P[i].b : s.banda[0]), Math.max(s.b, j < P.length ? P[j].a : s.banda[1])];
  });
  return m;
}

// ---------------------------------------------------------------------------
// Dónde se dibuja un lugar
// ---------------------------------------------------------------------------
/** Candidatos por los que se dibuja un lugar sin punto, del preferido al último; nunca uno descartado. */
const PREFERENCIA_PUNTO = ['seguro', 'favorecido_nivel_1', 'tradicion', 'alternativa', 'solo_nivel_2'];
/** Dónde se dibuja un lugar y cuán seguro es: { c: [lon, lat], incierto, candidato } o null si no hay dónde.
    Un lugar con punto va en su punto, incierto si el punto es el de una región (precision zona). Un lugar sin punto va
    en su candidato preferido de los que se ven (con «Solo fuentes principales», nunca uno que solo propone otra
    fuente): el centro de su zona o de su franja, o el sitio propuesto. Es incierto y lleva el candidato. Sin candidato,
    null: la estancia existe, pero el mapa no la dibuja. Lo usan BE.donde (el marcador de la persona) y el mapa (las
    rutas de los viajes y los nombres del encuadre), así que la persona y la línea de su viaje llegan al mismo sitio. */
function puntoLugar(l) {
  if (!l) return null;
  if (!Array.isArray(l.candidatos)) return l.lat != null && l.lon != null ? { c: [l.lon, l.lat], incierto: l.precision === 'zona', candidato: null } : null;
  const cs = l.candidatos.filter((c) => PREFERENCIA_PUNTO.includes(c.estado) && !(BE.filtros?.nivel1 && c.estado === 'solo_nivel_2')
    && c.geometria?.lat != null && c.geometria?.lon != null);
  if (!cs.length) return null;
  const c = cs.sort((a, b) => PREFERENCIA_PUNTO.indexOf(a.estado) - PREFERENCIA_PUNTO.indexOf(b.estado))[0], g = c.geometria;
  return { c: g.tipo === 'franja' && g.hasta ? [(g.lon + g.hasta.lon) / 2, (g.lat + g.hasta.lat) / 2] : [g.lon, g.lat], incierto: true, candidato: c };
}
/** Parte de una respuesta de BE.donde que dice dónde se dibuja la persona en un lugar: pos ([lon, lat] o null, si el
    lugar no tiene dónde) e incierto (lo que diga puntoLugar: un candidato o el punto de una región se dibujan como
    posición estimada). */
function sitio(l) {
  const d = puntoLugar(l);
  return { pos: d ? d.c : null, incierto: d ? d.incierto : true };
}
/** Lo mismo de camino entre dos lugares, a la fracción f del tramo; sin posición si uno de los dos no tiene dónde. */
function camino(a, b, f) {
  const x = puntoLugar(a), y = puntoLugar(b);
  return { pos: x && y ? interpolar({ lon: x.c[0], lat: x.c[1] }, { lon: y.c[0], lat: y.c[1] }, f) : null, incierto: !x || !y || x.incierto || y.incierto };
}

/** Dónde está alguien en t según una lista de paradas ordenadas (el modelo de Pablo). null si ninguna lo cubre. */
function dondeEnParadas(P, t) {
  if (!P.length || t < P[0].a || t > P[P.length - 1].b) return null;
  let lo = 0, hi = P.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (P[m].a <= t) lo = m; else hi = m - 1; }
  const s = P[lo];
  if (t <= s.b || lo === P.length - 1) {
    // Fuera de [a0, b0] la parada está alargada para acoger sus sucesos: esa parte de la estancia es nuestra, estimada.
    const alargada = !s.narrativa && (t < (s.a0 ?? s.a) || t > (s.b0 ?? s.b));
    return { en: s, sig: P[lo + 1] || null, parada: true, estimada: s.narrativa || alargada, ...sitio(s.lugar), banda: s.banda || (alargada ? [s.a, s.b] : null) };
  }
  const n = P[lo + 1];
  const f = (t - s.b) / Math.max(1e-6, n.a - s.b);
  const banda = s.narrativa ? s.banda : (n.narrativa ? n.banda : null);
  return { en: s, sig: n, parada: false, f, estimada: s.narrativa || n.narrativa, ...camino(s.lugar, n.lugar, f), banda };
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
  return fueraDeLista(P, tr);
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
    fecha.
    Los sucesos de las paradas de quien viaja no se reparten: ya están en ellas (colocarEnParadas). Los de la serie que
    comparten con ellos alguna persona siguen el orden del relato respecto a ellos si su fecha lo permite: empiezan
    cuando acaba el anterior (Apolos llega a Éfeso después de que Pablo se embarca) y acaban antes de que empiece el
    posterior (Saulo se convierte en el camino, antes de que Ananías le devuelva la vista en Damasco). Si su fecha no da
    para tanto, se aflojan: desde que empieza el anterior o hasta que acaba el posterior. Esos límites son de ese suceso
    y de nadie más: el relato de Felipe en Samaria (Hch 8) no se aprieta por la conversión de Saulo (Hch 9), que la
    cuenta después pero pasa mientras tanto. Si los límites lo dejan en un ancla (ANCLA_MAX o menos), va ahí, fuera de
    la tanda. Devuelve Map(evento → [a, b]) solo con los que cambian. */
const ANCLA_MAX = 40 * DIA;
let relatoCache = null;
const enParadas = (e) => itinerarios().quien.has(e);
function repartoRelato() {
  if (relatoCache && relatoCache.D === BE.D) return relatoCache.m;
  const porId = new Map((BE.D.eventos || []).map((e) => [e.id, e]));
  const series = new Map();
  (BE.D.eventos || []).forEach((e, i) => {
    const o = e.orden_relato;
    if (!o) return;
    if (!series.has(o.serie)) series.set(o.serie, { xs: [], fijos: [] });
    const S = series.get(o.serie);
    if (enParadas(e)) { const v = ventanaEvento(e); if (v) S.fijos.push({ e, v }); return; }
    const v = ventanaFecha(e.fecha);
    if (v) S.xs.push({ e, v, i, ancla: v[1] - v[0] <= ANCLA_MAX, lo: -Infinity, hi: Infinity });
  });
  const m = new Map();
  const estado = new Map();
  /** Ventana en que quedó colocado un suceso de otra serie (o de quien viaja), y si de verdad se colocó. En un ciclo de
      series, su fecha. */
  const colocado = (e) => {
    if (enParadas(e)) return { v: ventanaEvento(e), puesto: true };
    const s = e.orden_relato?.serie;
    if (series.has(s) && !estado.has(s)) colocarSerie(s);
    return m.has(e) ? { v: m.get(e), puesto: true } : { v: ventanaFecha(e.fecha), puesto: false };
  };
  const comparten = (a, b) => (a.personas || []).some((p) => (b.personas || []).includes(p));
  const cabe = (x, lo, hi) => Math.min(x.v[1], hi) - Math.max(x.v[0], lo) > 2e-4;
  function colocarSerie(s) {
    estado.set(s, 'en curso');
    const { xs, fijos } = series.get(s);
    xs.sort((x, y) => x.e.orden_relato.orden - y.e.orden_relato.orden || x.i - y.i);
    // Tandas: lo que va entre dos anclas del relato. Una tanda empieza cuando acaba la última ancla anterior y termina
    // cuando empieza la siguiente.
    // Si el ancla anterior acaba después de que empiece la siguiente (un mes y un día de ese mes), la tanda empieza con
    // el ancla anterior.
    let fin = -Infinity, ini = -Infinity, tanda = [];
    const cerrar = (inicio) => {
      if (tanda.length) colocar(tanda, fin < inicio ? fin : ini, inicio, m);
      tanda = [];
    };
    const anclar = (v) => { cerrar(v[0]); fin = Math.max(fin, v[1]); ini = v[0]; };
    for (const x of xs) {
      // orden_relato.tras de otra serie (Matías se elige después de la ascensión, que va en la armonía A7 y no en
      // Hechos): si ese suceso quedó colocado, o su fecha ya es un ancla, hace de ancla justo antes de él: lo anterior del
      // relato acaba antes, y él empieza después. Si se quedó con una fecha larga (un año entero), solo él empieza
      // cuando acaba: esa fecha no aprieta al resto de la serie. De la misma serie ya va antes en el orden.
      const t = x.e.orden_relato.tras ? porId.get(x.e.orden_relato.tras) : null;
      if (t && t !== x.e && (t.orden_relato?.serie !== s || enParadas(t))) {
        const { v, puesto } = colocado(t);
        if (v && (puesto || v[1] - v[0] <= ANCLA_MAX)) anclar(v);
        else if (v) x.lo = Math.max(x.lo, v[1]);
      }
      // Límites de los sucesos de las paradas: lo que el relato cuenta después de uno de ellos no empieza antes que él
      // (el entierro de Esteban y Felipe en Samaria, después de su muerte); si comparten persona, empieza cuando acaba,
      // y lo que cuenta antes acaba antes de que él empiece.
      let loE = -Infinity, loI = -Infinity, hiI = Infinity, hiE = Infinity;
      for (const y of fijos) {
        const oy = y.e.orden_relato.orden, ox = x.e.orden_relato.orden, junto = comparten(y.e, x.e);
        if (oy < ox && y.v[0] < x.v[1]) { loE = Math.max(loE, junto ? y.v[1] : y.v[0]); loI = Math.max(loI, y.v[0]); }
        if (junto && oy > ox && y.v[1] > x.v[0]) { hiI = Math.min(hiI, y.v[0]); hiE = Math.min(hiE, y.v[1]); }
      }
      if (!x.ancla && (loI > -Infinity || hiE < Infinity)) {
        const lo0 = x.lo;
        const [l, h] = [[loE, hiI], [loI, hiI], [loE, hiE], [loI, hiE]].find(([l, h]) => cabe(x, Math.max(lo0, l), h)) || [loI, hiE];
        x.lo = Math.max(lo0, l); x.hi = h;
        const w = [Math.max(x.v[0], x.lo), Math.min(x.v[1], x.hi)];
        // Sujeto por los dos lados a unos días: va ahí, como un suceso de las paradas, y no mueve a nadie más.
        if (x.hi < Infinity && w[1] - w[0] <= ANCLA_MAX) {
          // Sin sitio entre sus límites: va al borde de su fecha que queda junto al límite, nunca fuera de ella.
          if (!(w[1] - w[0] > 2e-4)) w.splice(0, 2, ...(x.lo >= x.v[1] ? [x.v[1] - DIA, x.v[1]] : [x.v[0], x.v[0] + DIA]));
          if (w[0] > x.v[0] + 1e-6 || w[1] < x.v[1] - 1e-6) m.set(x.e, w);
          continue;
        }
      }
      if (!x.ancla) { tanda.push(x); continue; }
      anclar(x.v);
    }
    cerrar(Infinity);
    estado.set(s, 'hecha');
  }
  for (const s of series.keys()) if (!estado.has(s)) colocarSerie(s);
  relatoCache = { D: BE.D, m };
  return m;
}
/** Coloca una tanda entre lo (fin del ancla anterior) y hi (inicio de la siguiente) sin romper el orden del relato ni
    sacar a nadie de su fecha. Los seguidos con la misma fecha y los mismos límites propios (x.lo y x.hi, de un «tras» o
    de los sucesos de quien viaja) forman un grupo. Cada grupo empieza donde acaba el anterior y no antes de su límite
    propio; si sus fechas se solapan, el trozo común se reparte entre los dos según cuántos sucesos lleva cada uno.
    El límite propio de fin (x.hi) solo acorta a su grupo: no empuja hacia atrás a los anteriores. Si lo deja sin sitio,
    el grupo va junto a ese límite, con lo que le tocaba. Dentro de un grupo, los sucesos se reparten por igual. */
function colocar(tanda, lo, hi, m) {
  const grupos = [];
  for (const x of tanda) {
    const g = grupos.at(-1);
    const xlo = x.lo ?? -Infinity, xhi = x.hi ?? Infinity;
    if (g && g.v[0] === x.v[0] && g.v[1] === x.v[1] && g.lo === xlo && g.hi === xhi) g.xs.push(x);
    else grupos.push({ v: x.v, lo: xlo, hi: xhi, xs: [x] });
  }
  const n = grupos.length;
  for (let j = 0; j < n; j++) grupos[j].L = Math.max(lo, grupos[j].v[0], grupos[j].lo, j ? grupos[j - 1].L : -Infinity);
  for (let j = n - 1; j >= 0; j--) grupos[j].U = Math.min(hi, grupos[j].v[1], j < n - 1 ? grupos[j + 1].U : Infinity);
  let inicio = grupos[0].L;
  grupos.forEach((g, j) => {
    const U = Math.min(g.U, g.hi);
    let fin = U;
    const h = grupos[j + 1];
    if (h) {
      const a = Math.max(h.L, inicio), b = U;
      const corte = b > a ? a + (b - a) * g.xs.length / (g.xs.length + h.xs.length) : b;
      fin = Math.min(corte, U);
      g.sig = Math.max(corte, h.L);
    }
    let a = Math.max(inicio, g.L), b = fin, junto = false;
    inicio = g.sig ?? inicio;
    if (!(b - a > 2e-4) && g.hi < Infinity) {      // su límite propio de fin lo deja sin sitio: va junto a ese límite
      b = Math.min(g.hi, g.v[1]);
      a = Math.max(g.v[0], g.lo, b - Math.max(fin - a, DIA));
      junto = true;
    }
    if (!(b - a > 2e-4)) return;                   // no cabe entre las anclas: cada uno se queda con su fecha
    const paso = (b - a) / g.xs.length;
    g.xs.forEach((x, k) => {
      // Junto a su límite, el último acaba en él y no un poco antes: ese límite puede ser el final del destino de su
      // «tras» (la expulsión del inmoral, entre la visita de Estéfanas y 1 Corintios, que acaban juntas en Éfeso).
      const corte = junto && k === g.xs.length - 1 ? 0 : Math.min(1e-3, paso / 10);
      const w = [a + k * paso, a + (k + 1) * paso - corte];
      // Solo cambia si se aparta de su fecha más que el corte del final.
      if (w[0] > x.v[0] + 1e-6 || w[1] < x.v[1] - corte - 1e-6) m.set(x.e, w);
    });
  });
}
const ventanas = new Map();
/** Las cartas de quien viaja (Pablo) siguen sus paradas (colocarEnParadas); las de otro escritor, las estancias de ese
    escritor si las tiene. */
const ventanaCarta = (c) => {
  if (!ventanas.has(c)) {
    const quien = escritorDe(c);
    const it = SUCESOS_EN_PARADAS.has(quien) && viajeros().has(quien) ? itinerario(quien) : null;
    ventanas.set(c, it?.P.length ? (it.m.get(c) || tramo(c.fecha)) : (ventana(quien, c.fecha, c.escrita_en) || tramo(c.fecha)));
  }
  return ventanas.get(c);
};
/** Los sucesos de quien viaja (viajeroDe) siguen sus paradas; los demás, su fecha afinada con el detalle o el orden del
    relato. */
const ventanaEvento = (e) => {
  if (!ventanas.has(e)) {
    let v;
    if (enParadas(e)) v = itinerario(viajeroDe(e)).m.get(e) || ventanaFecha(e.fecha);
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
const RELACIONES_LUGAR = new Set(['vivio_en', 'nacio_en', 'murio_en']);
const cacheEst = new Map();
/** Estancias de una persona, ordenadas: { key, sel, lugar, a, b, narrativa, titulo, referencia, origen }.
    Pablo: sus paradas. Los demás: sus viajes, los sucesos que la nombran con un lugar situado y sus relaciones
    vivio_en, nacio_en y murio_en con fecha. Un suceso con varios lugares la pone en el primero, tenga punto o no (un
    lugar incierto): el siguiente lugar de la lista no es donde estaba. Si el suceso trae
    `presentes`, solo sitúa a esas personas: las demás de `personas` solo se nombran (Augusto en el nacimiento de Jesús). */
function estancias(persona) {
  if (persona === 'pablo') return BE.P;
  if (cacheEst.has(persona) && cacheEst.get(persona).D === BE.D) return cacheEst.get(persona).lista;
  const lista = [];
  if (BE.D.viajes.some((v) => esDe(v, persona))) {
    for (const s of itinerario(persona).P) lista.push({ ...s, origen: 'viaje' });
  }
  for (const e of BE.D.eventos || []) {
    if (!(e.personas || []).includes(persona) || (e.presentes && !e.presentes.includes(persona))) continue;
    const lugar = BE.L[(e.lugares || [])[0]];
    const v = ventanaEvento(e);
    if (!lugar || !v) continue;
    lista.push({ key: `evento:${e.id}`, sel: `evento:${e.id}`, lugar, a: v[0], b: v[1], narrativa: eventoEstimado(e), titulo: e.titulo,
      referencia: (e.pasajes || []).join('; '), origen: 'evento', fecha: e.fecha });
  }
  const p = BE.PERS[persona];
  (p?.relaciones || []).forEach((r, i) => {
    if (!RELACIONES_LUGAR.has(r.tipo) || !r.fecha) return;
    const lugar = BE.L[r.lugar], v = ventanaFecha(r.fecha);
    if (!lugar || !v) return;
    lista.push({ key: `rel:${persona}:${i}`, sel: `persona:${persona}`, lugar, a: v[0], b: v[1],
      narrativa: !!(r.fecha.aprox || r.fecha.tipo === 'narrativa' || r.deducido), titulo: `${({ vivio_en: 'En', nacio_en: 'Nace en', murio_en: 'Muere en' })[r.tipo]} ${lugar.nombre}`,
      referencia: r.fecha.texto || '', origen: r.tipo, fecha: r.fecha, larga: true });
  });
  // Nadie se sitúa después de su muerte: sus relaciones y sus viajes acaban ahí, aunque su fecha sea de todo el año.
  // Solo un suceso que la nombra la sitúa después (su entierro; Jesús resucitado).
  const muerte = muerteDe(persona);
  const finVida = muerte ? ventanaEvento(muerte)?.[1] : null;
  const vivas = finVida == null ? lista : lista.filter((s) => s.origen === 'evento' || s.a < finVida);
  if (finVida != null) vivas.forEach((s) => { if (s.origen !== 'evento' && s.b > finVida) s.b = finVida; });
  vivas.sort((x, y) => x.a - y.a || (y.b - y.a) - (x.b - x.a));
  vivas.forEach((s, g) => { s.g = g; });
  cacheEst.set(persona, { D: BE.D, lista: vivas });
  return vivas;
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
    return { persona, en: mejor, sig, parada: true, estimada: mejor.narrativa, ...sitio(mejor.lugar), banda: mejor.narrativa ? [mejor.a, mejor.b] : null };
  }
  let prev = null, sig = null;
  for (const s of L) { if (s.b < t && (!prev || s.b > prev.b)) prev = s; if (s.a > t && (!sig || s.a < sig.a)) sig = s; }
  if (!prev || !sig) return null;
  const hueco = sig.a - prev.b;
  if (prev.lugar.id === sig.lugar.id) {
    if (hueco > HUECO_MISMO) return null;
    return { persona, en: prev, sig, parada: true, entre: true, estimada: true, ...sitio(prev.lugar), banda: [prev.b, sig.a] };
  }
  if (hueco > HUECO_CAMINO) return null;
  const f = (t - prev.b) / Math.max(1e-6, sig.a - prev.b);
  return { persona, en: prev, sig, parada: false, f, estimada: true, ...camino(prev.lugar, sig.lugar, f), banda: [prev.b, sig.a] };
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
    // En un área desconocida la persona está de viaje, pero en ningún lugar que se pueda nombrar.
    if (w && w.parada && w.en.lugar.id) out.push({ persona: id, w });
  }
  return out;
}
/** Suceso cuyo título empieza por `re` («Nace…», «Muerte de…») y que tiene a la persona en primer lugar, con fecha que
    no sea cálculo. En un nacimiento o una muerte la primera de `personas` es quien nace o muere; las demás estaban allí
    (María y José en el nacimiento de Jesús), así que no cuentan. */
const sucesoDe = (persona, re, idRe = null) => (BE.D.eventos || []).find((e) => (e.personas || [])[0] === persona && (re.test(e.titulo || '') || (idRe && idRe.test(e.id || ''))) && e.fecha && e.fecha.tipo !== 'derivada');
/** Suceso de la muerte de la persona: su título empieza por «Muere…»/«Muerte…» o, si el título cuenta otra cosa
    («Esteban muere apedreado», «Herodes Agripa I manda matar a Santiago»), su id empieza por «muerte-de-» o «muere-».
    Hasta que los sucesos lleven su tipo, es lo que dicen los datos de quién muere. */
const muerteDe = (persona) => sucesoDe(persona, /^(muere|muerte)\b/i, /^(muerte-de|muere)-/);
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
  const evMuerte = muerte ? null : muerteDe(persona);
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
/** Dónde empieza lo que sabemos de un periodo (be-64b.7): su principio con fecha; si no lo tiene, el año desde el que ya
    consta (Asiria, 740 a.e.c.); si tampoco, el principio del tramo que se dibuja. Nunca su fin: elegir Asiria no lleva a 632. */
function inicioPeriodo(p) {
  const tr = tramoPeriodo(p);
  if (!tr) return null;
  return p.fecha?.desde ?? (p.consta_desde != null && p.consta_desde < tr[1] ? p.consta_desde : tr[0]);
}

Object.assign(BE, {
  prepararParadas: () => itinerario('pablo').P, dondeEsta, puntoLugar, viajeActual, ventanaPablo, ventanaCarta, ventanaEvento, momentoCarta, momentoEvento,
  donde, sucesoEn, ventana, estancias, presentes, personasConEstancias, edad, tramoPotencia, tramoPeriodo, inicioPeriodo, ventanaFecha, inicioMes, diaHebreo, anioHebreo, nombreMes, eventoEstimado, calendario, DIA, MES_LUNAR,
});
})();
