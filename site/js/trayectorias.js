/* biblical-earth · trayectorias: dónde está cada persona en cada momento y en qué ventana de tiempo cae cada carta o suceso.
   Hoy solo sabe de Pablo. BE.donde(persona, t) y BE.ventana(persona, fecha, lugares) son la interfaz fija: para otra persona
   devuelven null hasta que este fichero lo generalice. Dueño durante el reparto: app-tiempo. */
'use strict';
(() => {
const BE = window.BE;
const { norm, tramo, interpolar } = BE;

// Momento del año que damos a cada estación cuando la fuente la nombra: [si abre el tramo, si lo cierra].
const ESTACIONES = {
  'finales del verano': [0.68, 0.68], 'principios del otono': [0.75, 0.75], primavera: [0.25, 0.4],
  verano: [0.55, 0.65], otono: [0.8, 0.85], invierno: [0.9, 0.15], pascua: [0.28, 0.28], pentecostes: [0.42, 0.42],
};
const RE_ESTACION = /finales del verano|principios del otono|primavera|verano|otono|invierno|pascua|pentecostes/g;
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
/** Ordena todas las paradas de Pablo y les da un momento.
    Paradas ancladas: su fecha. Paradas en tiempo narrativo: repartidas por igual entre las dos anclas que las rodean. */
function prepararParadas() {
  const viajes = [...BE.D.viajes].sort((a, b) => (a.fecha?.desde ?? 0) - (b.fecha?.desde ?? 0));
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
  out.forEach((s, i) => { s.g = i; });
  return out;
}

/** ¿Dónde está Pablo en t? null si ninguna parada lo cubre. */
function dondeEsta(t) {
  if (!BE.P.length || t < BE.P[0].a || t > BE.P[BE.P.length - 1].b) return null;
  let lo = 0, hi = BE.P.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (BE.P[m].a <= t) lo = m; else hi = m - 1; }
  const s = BE.P[lo];
  if (t <= s.b || lo === BE.P.length - 1) {
    return { en: s, sig: BE.P[lo + 1] || null, parada: true, estimada: s.narrativa, pos: [s.lugar.lon, s.lugar.lat], banda: s.banda || null };
  }
  const n = BE.P[lo + 1];
  const f = (t - s.b) / Math.max(1e-6, n.a - s.b);
  const banda = s.narrativa ? s.banda : (n.narrativa ? n.banda : null);
  return { en: s, sig: n, parada: false, f, estimada: s.narrativa || n.narrativa, pos: interpolar(s.lugar, n.lugar, f), banda };
}
function viajeActual(w) {
  if (!w) return null;
  if (!w.parada && w.en.i === w.en.n - 1 && w.sig) return w.sig.viaje;
  return w.en.viaje;
}
/** Parte de la fecha f en que las paradas de este modelo ponen a Pablo en uno de los lugares.
    Se prueba cada lugar en orden (el primero es el preferido) y, dentro de él, gana la estancia más larga.
    Una parada sin duración cuenta desde que sale de la anterior hasta que llega a la siguiente.
    Si ninguna parada encaja, se queda la parte de la fecha que cae fuera de los viajes, donde no sabemos dónde estaba. */
function ventanaPablo(f, lugares) {
  const tr = tramo(f);
  if (!tr) return null;
  for (const id of lugares || []) {
    let mejor = null;
    for (const s of BE.P) {
      if (s.lugar.id !== id) continue;
      let a = s.a, b = s.b;
      if (b - a < 1e-3) { a = s.g > 0 ? BE.P[s.g - 1].b + 1e-3 : a; b = s.g < BE.P.length - 1 ? BE.P[s.g + 1].a : b; }
      a = Math.max(a, tr[0]); b = Math.min(b, tr[1]);
      if (b > a && (!mejor || b - a > mejor[1] - mejor[0])) mejor = [a, b];
    }
    if (mejor) return mejor;
  }
  const ini = BE.P[0]?.a ?? Infinity, fin = BE.P.at(-1)?.b ?? -Infinity;
  if (tr[0] < fin && fin < tr[1]) return [fin + 1e-3, tr[1]];
  if (tr[0] < ini && ini < tr[1]) return [tr[0], ini];
  return tr;
}
const ventanas = new Map();
const ventanaCarta = (c) => { if (!ventanas.has(c)) ventanas.set(c, ventanaPablo(c.fecha, c.escrita_en)); return ventanas.get(c); };
/** Los sucesos de Pablo siguen sus paradas; los demás, su fecha. */
const ventanaEvento = (e) => { if (!ventanas.has(e)) ventanas.set(e, (e.personas || []).includes('pablo') ? ventanaPablo(e.fecha, e.lugares) : tramo(e.fecha)); return ventanas.get(e); };
const momentoCarta = (c) => { const v = ventanaCarta(c); return v ? (v[0] + v[1]) / 2 : null; };
const momentoEvento = (e) => { const v = ventanaEvento(e); return v ? (v[0] + v[1]) / 2 : null; };

/** Interfaz fija para los demás ficheros. Detrás, la lógica actual de Pablo. */
const donde = (persona, t) => (persona === 'pablo' ? dondeEsta(t) : null);
const ventana = (persona, fecha, lugares) => (persona === 'pablo' ? ventanaPablo(fecha, lugares) : null);

Object.assign(BE, { prepararParadas, dondeEsta, viajeActual, ventanaPablo, ventanaCarta, ventanaEvento, momentoCarta, momentoEvento, donde, ventana });
})();
