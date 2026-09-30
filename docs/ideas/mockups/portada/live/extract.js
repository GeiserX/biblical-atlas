/* biblical-earth · portada «El sitio, funcionando» · lo que la portada lee de los datos.
   Una sola función, extraer(D), que recibe el data.json del sitio y devuelve lo poco que pinta la portada: las épocas,
   las seis fechas del banner, las preguntas, los recorridos con su ruta, la escena de tres paradas, un dato con su
   fuente y las cifras del atlas. La usan build-data.mjs (para escribir data.js) y la página, cuando el sitio del marco
   ya ha cargado sus datos. Script clásico: en el navegador deja window.LiveExtract; en Node, module.exports. */
(function (root) {
  'use strict';

  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const fmtAnio = (y) => (y > 0 ? `${y} e.c.` : `${1 - y} a.e.c.`);
  const anioDe = (t) => fmtAnio(Math.floor(t));
  const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Las imágenes del relieve de ../assets/img: centro [lon, lat], grados de longitud a lo ancho y tamaño en píxeles
  // (FRAMES de ../assets/render-backdrops.mjs). Con eso una coordenada cae en su píxel (Mercator).
  const RELIEVES = [
    { src: '../assets/img/jerusalem-wide-1280.webp', c: [35.23, 31.77], span: 0.24, w: 2560, h: 1440 },
    { src: '../assets/img/paul-journeys-wide-1280.webp', c: [24.6, 36.4], span: 25, w: 2560, h: 1440 },
    { src: '../assets/img/bible-lands-wide-1280.webp', c: [36.2, 31.4], span: 28, w: 2560, h: 1440 },
    { src: '../assets/img/bible-lands-tall.webp', c: [37.4, 31.2], span: 20, w: 860, h: 1800 },
  ];
  const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  function pixel(r, lon, lat) {
    const k = r.w / r.span;
    return [r.w / 2 + (lon - r.c[0]) * k, r.h / 2 - (mercY(lat) - mercY(r.c[1])) * (180 / Math.PI) * k];
  }

  // Las preguntas de la portada de hoy (site/js/portada.js), con su destino exacto.
  const PREGUNTAS = [
    { texto: '¿Qué pasaba en Babilonia en tiempos de Jesús?', sel: 'lugar:babilonia', t: 30.5 },
    // 520 a.e.c. (t = -518,5), el año de la pantalla 09; la portada de hoy da -519,5, que el sitio escribe 521.
    { texto: '¿Quién había en Judá con los medos y persas?', sel: 'lugar:jerusalen', t: -518.5 },
    // Con todas sus cartas en el mapa (cartas=todas), que es lo que pregunta.
    { texto: '¿Desde dónde escribió Pablo cada carta?', sel: 'persona:pablo', t: 50.3, extra: 'cartas=todas' },
  ];
  // Las seis fechas del banner (docs/images/banner.svg) y el suceso que abre cada una. 33 e.c. es una decisión abierta.
  const FECHAS = ['creacion-de-adan', 'diluvio', 'exodo', 'destruccion-de-jerusalen-607', 'pentecostes-33', 'muerte-del-apostol-juan'];
  // La escena: tres paradas del recorrido «De Babilonia a Jerusalén» (número de parada del sitio, desde 1).
  const ESCENA = { recorrido: 'de-babilonia-a-jerusalen', pasos: [1, 2, 5] };
  // Resúmenes que faltan en los datos: borradores nuestros para el prototipo, escritos a partir de sus paradas.
  const RESUMENES = {
    'cartas-y-ciudades': 'Las cartas de Pablo en orden, de 1 Tesalonicenses (año 50) a 2 Timoteo (hacia el 65): desde dónde escribió cada una y a qué ciudad iba.',
    'la-ultima-semana': 'De la llegada a Betania el 8 de nisán hasta Pentecostés: los últimos días de Jesús en Jerusalén, día a día.',
    pedro: 'De pescador en el mar de Galilea a sus cartas: Pedro con Jesús, en Pentecostés, con Cornelio y en Antioquía.',
  };
  const DATO = 'destruccion-de-jerusalen-607';

  function extraer(D) {
    const L = D.lugares || {}, P = D.personas || {};
    const eventos = new Map((D.eventos || []).map((e) => [e.id, e]));
    const cartas = new Map((D.cartas || []).map((c) => [c.id, c]));
    const libros = D.libros || [];
    const libroPorForma = new Map();
    for (const l of libros) for (const f of [...(l.formas || []), norm(l.abr), norm(l.nombre)]) libroPorForma.set(norm(f).replace(/[\s.]+/g, ''), l);
    const conCoord = (id) => L[id] && L[id].lat != null && L[id].lon != null;

    function nombreSel(sel) {
      const i = sel.indexOf(':'), tipo = sel.slice(0, i), id = sel.slice(i + 1);
      if (tipo === 'lugar') return L[id]?.nombre || id;
      if (tipo === 'persona') return P[id]?.nombre || id;
      if (tipo === 'evento') return eventos.get(id)?.titulo || id;
      if (tipo === 'carta') return cartas.get(id)?.libro || id;
      if (tipo === 'pasaje') {
        const m = id.match(/^(.+)-(\d+)$/);
        const lib = m && libroPorForma.get(m[1]);
        return lib ? `${lib.nombre} ${m[2]}` : id;
      }
      return id;
    }
    /** El lugar de una parada. Una carta se dibuja donde se escribió, salvo en el recorrido de las ciudades que las
        recibieron, que va a su destino. */
    function lugarSel(sel, destino = false) {
      const i = sel.indexOf(':'), tipo = sel.slice(0, i), id = sel.slice(i + 1);
      let ids = [];
      if (tipo === 'lugar') ids = [id];
      else if (tipo === 'evento') ids = eventos.get(id)?.lugares || [];
      else if (tipo === 'carta') { const c = cartas.get(id), a = (c?.destinatarios || {}).lugares || [], b = c?.escrita_en || []; ids = destino ? [...a, ...b] : [...b, ...a]; }
      const l = ids.find(conCoord);
      return l ? { id: l, nombre: L[l].nombre, lon: L[l].lon, lat: L[l].lat } : null;
    }
    /** "2Re 25:1-21" → { texto, url } a su capítulo en wol.jw.org, como site/js/base.js. */
    function cita(txt) {
      const m = String(txt).match(/^\s*([123]?\s?[A-Za-zÁÉÍÓÚáéíóúÑñ]+)\.?\s+(\d+)/);
      const lib = m && libroPorForma.get(norm(m[1]).replace(/[\s.]+/g, ''));
      return { texto: txt, url: lib ? `https://wol.jw.org/es/wol/b/r4/lp-s/nwt/${lib.num}/${+m[2]}` : null, libro: lib?.nombre || null };
    }

    // Épocas, en orden, con el recuadro de sus lugares (idea D1: cada época abre donde ocurrió).
    const eras = (D.periodos || []).filter((p) => p.tipo === 'era' && p.fecha && p.fecha.desde != null)
      .sort((a, b) => a.fecha.desde - b.fecha.desde)
      .map((p, i) => {
        const a = p.fecha.desde, b = (p.fecha.hasta ?? a) + 1;
        const pts = [];
        for (const e of eventos.values()) {
          const d = e.fecha?.desde ?? e.fecha?.hasta;
          if (d == null || d < a || d >= b) continue;
          for (const l of e.lugares || []) if (conCoord(l) && L[l].precision !== 'zona') pts.push([L[l].lon, L[l].lat]);
        }
        let caja = null;
        if (pts.length >= 3) {
          const q = (arr, f) => { const s = [...arr].sort((x, y) => x - y); return s[Math.max(0, Math.min(s.length - 1, Math.round(f * (s.length - 1))))]; };
          const xs = pts.map((x) => x[0]), ys = pts.map((x) => x[1]);
          caja = [q(xs, 0.05), q(ys, 0.05), q(xs, 0.95), q(ys, 0.95)].map((v) => Math.round(v * 100) / 100);
        }
        const frase = String(p.resumen || '').split(/(?<=\.)\s/)[0];
        return { id: p.id, n: i + 1, nombre: p.nombre, fecha: p.fecha.texto, desde: a, hasta: b, frase, sinLibro: /sin libro/i.test(p.resumen || ''), caja };
      });

    const fechas = FECHAS.map((id) => eventos.get(id)).filter(Boolean).map((e) => ({
      sel: `evento:${e.id}`, t: e.fecha.desde + 0.5, texto: fmtAnio(e.fecha.desde), titulo: e.titulo,
    }));

    const preguntas = PREGUNTAS.filter((q) => { const [tipo, id] = q.sel.split(':'); return tipo === 'lugar' ? !!L[id] : !!P[id]; })
      .map((q) => ({ ...q, donde: nombreSel(q.sel), fecha: anioDe(q.t) }));

    const recorridos = (D.recorridos || []).map((r) => {
      const ts = r.paradas.map((p) => p.t);
      const paradas = r.paradas.map((p, k) => { const l = lugarSel(p.sel, r.id === 'cartas-y-ciudades'); return { n: k + 1, t: p.t, anio: anioDe(p.t), nombre: nombreSel(p.sel), lugar: l }; });
      // La ruta sobre el relieve más cercano que la contiene.
      const con = paradas.filter((p) => p.lugar);
      let dibujo = null;
      if (con.length) {
        const lons = con.map((p) => p.lugar.lon), lats = con.map((p) => p.lugar.lat);
        const w = Math.min(...lons), e = Math.max(...lons), s = Math.min(...lats), n = Math.max(...lats);
        const r0 = RELIEVES.find((rv) => { const [x0, y0] = pixel(rv, w, n), [x1, y1] = pixel(rv, e, s); const m = 0.03; return x0 >= -m * rv.w && y0 >= -m * rv.h && x1 <= rv.w * (1 + m) && y1 <= rv.h * (1 + m); });
        if (r0) {
          const pts = con.map((p) => ({ n: p.n, lugar: p.lugar.id, nombre: p.lugar.nombre, xy: pixel(r0, p.lugar.lon, p.lugar.lat).map((v) => Math.round(v * 10) / 10) }));
          dibujo = { src: r0.src, w: r0.w, h: r0.h, pts };
        }
      }
      return {
        id: r.id, titulo: r.titulo, resumen: r.resumen || RESUMENES[r.id] || '', borrador: !r.resumen && !!RESUMENES[r.id],
        n: r.paradas.length, desde: anioDe(Math.min(...ts)), hasta: anioDe(Math.max(...ts)),
        minutos: Math.max(3, Math.round((r.paradas.length * 40) / 60)),
        paradas: paradas.map(({ n, anio, nombre }) => ({ n, anio, nombre })), dibujo,
      };
    });

    const rc = (D.recorridos || []).find((r) => r.id === ESCENA.recorrido);
    const escena = rc ? {
      recorrido: rc.id, titulo: rc.titulo, n: rc.paradas.length,
      pasos: ESCENA.pasos.filter((k) => rc.paradas[k - 1]).map((k) => {
        const p = rc.paradas[k - 1], l = lugarSel(p.sel);
        return { paso: k, t: p.t, anio: anioDe(p.t), titulo: nombreSel(p.sel), lugar: l ? l.nombre : '', pasajes: (p.pasajes || []).map(cita) };
      }),
    } : null;

    const e = eventos.get(DATO);
    const dato = e ? {
      sel: `evento:${e.id}`, titulo: e.titulo, fecha: e.fecha.texto, resumen: e.resumen, estado: e.estado || '',
      pasajes: (e.pasajes || []).slice(0, 3).map(cita),
      fuentes: (e.fuentes || []).map((id) => D.fuentes?.[id]).filter((f) => f && f.nivel != null && !f.implicita).slice(0, 3).map((f) => ({ titulo: f.titulo, obra: f.obra, url: f.url, nivel: f.nivel })),
    } : null;

    const cob = D.cobertura || {};
    const cifras = {
      sucesos: miles((D.eventos || []).length), lugares: miles(Object.keys(L).length), personas: miles(Object.keys(P).length),
      fuentes: miles(Object.keys(D.fuentes || {}).length), libros: libros.length, revisados: Object.keys(cob).length,
    };
    return { generado: D.generado || '', cifras, eras, fechas, preguntas, recorridos, escena, dato };
  }

  const api = { extraer, fmtAnio, anioDe };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LiveExtract = api;
})(typeof window !== 'undefined' ? window : globalThis);
