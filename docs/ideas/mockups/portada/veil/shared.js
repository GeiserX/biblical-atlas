/* biblical-earth · portada «El mapa detrás del velo»: lo que se saca de los datos.
   Lo usan veil.js en el navegador (con los datos del sitio vivo, BE.D) y build-data.mjs al compilar data.js (con
   site/data.json), así que la copia pequeña y la página viva salen de la misma regla. Sin dependencias.
   Los campos que se leen (lugares, eventos, viajes, periodos, recorridos…) son los de site/data.json. */
(function (root) {
  'use strict';

  // Los lugares que se dibujan con nombre sobre el relieve: sitios con un punto seguro. Las regiones, los países y los
  // lugares inciertos van en el mapa como zonas o rayados, nunca como un punto falso.
  const POINT_KINDS = new Set(['ciudad', 'puerto', 'isla']);
  const isPoint = (l) => !!l && l.lat != null && l.lon != null && l.precision === 'punto' && POINT_KINDS.has(l.tipo);
  const hasCoords = (l) => !!l && l.lat != null && l.lon != null && l.precision !== 'incierto';
  const mid = (f) => (f && f.desde != null ? (f.desde + (f.hasta ?? f.desde)) / 2 : null);
  const overlaps = (f, a, b) => f && f.desde != null && f.desde <= b && (f.hasta ?? f.desde) >= a;

  /** Año del cursor como lo escribe el sitio (base.js, fmtAnio): t = -606 es 607 a.e.c.; t = 50,3 es 50 e.c. */
  function year(t) {
    const y = Math.floor(t);
    return y <= 0 ? `${1 - y} a.e.c.` : `${y} e.c.`;
  }
  /** Un tramo corto: «607-515 a.e.c.», «49-52 e.c.», «2 a.e.c.-33 e.c.». */
  function span(a, b) {
    const ya = Math.floor(a), yb = Math.floor(b);
    if (ya === yb) return year(a);
    if (ya <= 0 && yb <= 0) return `${1 - ya}-${1 - yb} a.e.c.`;
    if (ya > 0 && yb > 0) return `${ya}-${yb} e.c.`;
    return `${year(a)}-${year(b)}`;
  }

  /** Peso de cada lugar: cuántos sucesos y paradas lo nombran. Decide qué nombres caben primero. */
  function weights(D) {
    const n = {};
    for (const e of D.eventos || []) for (const id of e.lugares || []) n[id] = (n[id] || 0) + 1;
    for (const v of D.viajes || []) for (const p of v.paradas || []) n[p.lugar] = (n[p.lugar] || 0) + 1;
    return n;
  }
  const entry = (D, id, weight, t) => { const l = D.lugares[id]; return { id, name: l.nombre, lon: l.lon, lat: l.lat, weight, t }; };

  /** Las paradas de un viaje con punto seguro, una vez cada lugar, con la fecha de su primera parada. */
  function tripPlaces(D, tripId, W = weights(D)) {
    const v = (D.viajes || []).find((x) => x.id === tripId);
    if (!v) return [];
    const seen = new Map();
    for (const p of v.paradas || []) {
      if (seen.has(p.lugar) || !isPoint(D.lugares[p.lugar])) continue;
      seen.set(p.lugar, entry(D, p.lugar, 1000 + (W[p.lugar] || 0), mid(p.fecha) ?? mid(v.fecha)));
    }
    return [...seen.values()];
  }
  /** Los lugares de los sucesos (y paradas de viaje) que caen entre a y b, los más nombrados primero. */
  function rangePlaces(D, a, b, W = weights(D)) {
    const count = new Map();
    const add = (id, t) => {
      if (!isPoint(D.lugares[id])) return;
      const c = count.get(id) || { n: 0, t };
      c.n += 1;
      count.set(id, c);
    };
    for (const e of D.eventos || []) if (overlaps(e.fecha, a, b)) for (const id of e.lugares || []) add(id, Math.min(b, Math.max(a, mid(e.fecha))));
    for (const v of D.viajes || []) for (const p of v.paradas || []) if (overlaps(p.fecha, a, b)) add(p.lugar, Math.min(b, Math.max(a, mid(p.fecha))));
    return [...count].map(([id, c]) => entry(D, id, c.n * 100 + (W[id] || 0), c.t)).sort((x, y) => y.weight - x.weight);
  }
  /** Lugares dados por identificador (lo que implica una selección), con su peso de siempre. */
  function idPlaces(D, ids, t, W = weights(D)) {
    return [...new Set(ids)].filter((id) => isPoint(D.lugares[id])).map((id) => entry(D, id, W[id] || 0, t)).sort((x, y) => y.weight - x.weight);
  }
  /** Puntos para encuadrar: todo lo que tiene coordenada no incierta (también regiones), como [lon, lat]. */
  function points(D, ids) {
    return [...new Set(ids)].map((id) => D.lugares[id]).filter(hasCoords).map((l) => [l.lon, l.lat]);
  }
  /** El viaje de Pablo en curso en la fecha t, si lo hay. */
  function tripAt(D, t) {
    return (D.viajes || []).find((v) => overlaps(v.fecha, t, t)) || null;
  }

  /** Lo que la portada enseña de los datos: épocas, recorridos, preguntas y el viaje de la fecha inicial.
      Los campos de origen son los que lee site/js/portada.js. */
  function derive(D, startT = 50.3) {
    const eras = (D.periodos || []).filter((p) => p.tipo === 'era' && p.fecha && p.fecha.desde != null)
      .sort((a, b) => a.fecha.desde - b.fecha.desde)
      .map((p, i) => ({ id: p.id, n: i + 1, name: p.nombre, label: p.fecha.texto || span(p.fecha.desde, p.fecha.hasta),
        from: p.fecha.desde, to: (p.fecha.hasta ?? p.fecha.desde) + 1, noBook: /sin libro/i.test(p.resumen || '') }));
    const tours = (D.recorridos || []).map((r) => {
      const ts = (r.paradas || []).map((p) => p.t).filter((t) => t != null);
      return { id: r.id, title: r.titulo, summary: r.resumen || '', stops: (r.paradas || []).length,
        dates: ts.length ? span(Math.min(...ts), Math.max(...ts)) : '' };
    });
    // Las tres preguntas de hoy (portada.js, preguntas()), con lo que se va a ver: el lugar o la persona y la fecha.
    const questions = [];
    if (D.lugares.babilonia) questions.push({ text: '¿Qué pasaba en Babilonia en tiempos de Jesús?', sel: 'lugar:babilonia', t: 30.5, shows: `Babilonia · c. ${year(30.5)}` });
    // 520 a.e.c. (t = -518,5), el año de la pantalla 09; la portada de hoy da -519,5, que el sitio escribe 521.
    if (D.lugares.jerusalen) questions.push({ text: '¿Quién había en Judá con los medos y persas?', sel: 'lugar:jerusalen', t: -518.5, shows: `Jerusalén · c. ${year(-518.5)}` });
    // Con todas sus cartas en el mapa (cartas=todas), que es lo que pregunta.
    if ((D.cartas || []).some((c) => c.id === '1-tesalonicenses')) questions.push({ text: '¿Desde dónde escribió Pablo cada carta?', sel: 'persona:pablo', t: 50.3, extra: { cartas: 'todas' }, shows: `Pablo y sus cartas · c. ${year(50.3)}` });
    const v = tripAt(D, startT);
    const start = v ? {
      trip: v.id,
      caption: `${v.nombre.charAt(0).toLowerCase()}${v.nombre.slice(1)} de Pablo, c. ${span(v.fecha.desde, v.fecha.hasta)}`,
      places: tripPlaces(D, v.id),
    } : null;
    const counts = { events: (D.eventos || []).length, places: Object.keys(D.lugares || {}).length, people: Object.keys(D.personas || {}).length };
    return { eras, tours, questions, start, counts, generated: D.generado || '' };
  }

  root.veilShared = { year, span, weights, tripPlaces, rangePlaces, idPlaces, points, tripAt, derive, isPoint, hasCoords };
})(typeof window !== 'undefined' ? window : globalThis);
