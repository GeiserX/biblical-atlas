/* Carriles con nombre: prototipo de la línea de tiempo.
   Cada marca es una pieza (un clip) con su nombre entero, en el carril de su tipo. Las piezas se reparten en filas
   para que ningún nombre pise a otro; cada escala da a cada carril un máximo de filas y lo que no cabe se junta en un
   grupo que dice cuántos son y cómo se llaman. Pulsar elige; la escala y la vista no se mueven nunca con un clic. */
(() => {
  'use strict';
  const D = window.TIMELINE_DATA;
  const DAY = D.day;
  const R0 = D.range[0], R1 = D.range[1] + 1;
  const SCALES = D.scales;                         // milenios … días, de más amplia a más fina
  const SPAN_MIN = D.spanMin || 0.03, SPAN_MAX = (R1 - R0) * 1.08;

  // ---------------------------------------------------------------------------------------------------------------
  // Carriles, colores y nombres
  // ---------------------------------------------------------------------------------------------------------------
  const LANES = D.lanes.filter((l) => l.id !== 'meses' && l.id !== 'secular').sort((a, b) => a.order - b.order);
  // Los sucesos cuya fecha abarca mucho más que la pantalla (del año entero, vistos en días) van en un carril propio,
  // debajo de los que caen dentro: así lo de ese día sale arriba, con su nombre.
  LANES.splice(LANES.findIndex((l) => l.id === 'sucesos') + 1, 0, { id: 'sucesos-amplia', name: 'Sucesos con fecha más amplia', order: 5.5 });
  const LANE_COLOR = {
    eras: 'var(--node-periodo)', imperios: 'var(--emp-babilonia)', pablo: 'var(--lane-pablo)', cartas: 'var(--gold)',
    sucesos: 'var(--gold)', 'sucesos-amplia': 'var(--gold)', emperadores: 'var(--emp-roma)', 'reyes-jerusalen': 'var(--emp-israel)',
    'reyes-samaria': 'var(--emp-asiria)', 'reyes-persia': 'var(--emp-persia)', gobernadores: 'var(--secular)',
    sacerdotes: 'var(--tier1)',
  };
  const EMPIRE_COLOR = {
    'period:potencia-egipcia': 'var(--emp-egipto)', 'period:potencia-asiria': 'var(--emp-asiria)',
    'period:potencia-babilonica': 'var(--emp-babilonia)', 'period:potencia-medopersa': 'var(--emp-persia)',
    'period:potencia-griega': 'var(--emp-grecia)', 'period:potencia-romana': 'var(--emp-roma)',
  };
  const JOURNEY_COLORS = ['#b34962', '#357589', '#805da8', '#6b445c', '#a75733', '#2f5085', '#756f19', '#654b2f'];
  const JOURNEY_COLORS_DARK = ['#e0849a', '#6fb3c7', '#b69ae0', '#c98fb3', '#e09a6e', '#8fa8e0', '#c9c064', '#c9a37a'];
  const NOUN = {
    eras: ['era', 'eras'], imperios: ['potencia', 'potencias'], cartas: ['carta', 'cartas'], sucesos: ['suceso', 'sucesos'],
    emperadores: ['emperador', 'emperadores'], 'reyes-jerusalen': ['rey', 'reyes'], 'reyes-samaria': ['rey', 'reyes'],
    'reyes-persia': ['rey', 'reyes'], gobernadores: ['gobernador', 'gobernadores'], sacerdotes: ['sumo sacerdote', 'sumos sacerdotes'],
  };
  // Filas que cada escala da a un carril antes de agrupar. En días no hay límite: ahí todo lleva su nombre en su pieza.
  const BUDGET = {
    base: { milenios: 2, siglos: 3, decadas: 3, anos: 4, meses: 5, dias: Infinity },
    pablo: { milenios: 2, siglos: 3, decadas: 5, anos: 6, meses: 8, dias: Infinity },
    sucesos: { milenios: 4, siglos: 6, decadas: 8, anos: 12, meses: 16, dias: Infinity },
  };
  const BUDGET_TOUCH = {
    base: { milenios: 2, siglos: 2, decadas: 3, anos: 3, meses: 4, dias: Infinity },
    pablo: { milenios: 2, siglos: 2, decadas: 3, anos: 4, meses: 5, dias: Infinity },
    sucesos: { milenios: 3, siglos: 4, decadas: 5, anos: 7, meses: 9, dias: Infinity },
  };

  const marks = D.marks.slice().sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const byId = new Map(marks.map((m) => [m.id, m]));
  const byLane = new Map(LANES.map((l) => [l.id, []]));
  for (const m of marks) if (byLane.has(m.lane)) byLane.get(m.lane).push(m);
  const journeyIndex = new Map(marks.filter((m) => m.kind === 'journey').sort((a, b) => a.start - b.start).map((m, i) => [m.id, i]));
  const stopsOf = new Map();
  for (const m of marks) if (m.kind === 'stop') { if (!stopsOf.has(m.journey)) stopsOf.set(m.journey, []); stopsOf.get(m.journey).push(m); }

  function colorOf(m) {
    if (m.lane === 'imperios' && EMPIRE_COLOR[m.id]) return EMPIRE_COLOR[m.id];
    const j = m.kind === 'journey' ? m.id : m.kind === 'stop' ? m.journey : null;
    if (j != null && journeyIndex.has(j)) {
      const list = document.documentElement.dataset.theme === 'oscuro' ? JOURNEY_COLORS_DARK : JOURNEY_COLORS;
      return list[journeyIndex.get(j) % list.length];
    }
    return LANE_COLOR[m.lane] || 'var(--ink-3)';
  }
  const isSpanKind = (m) => m.kind === 'period' || m.kind === 'ruler' || m.kind === 'journey' || (m.kind === 'stop' && m.end > m.start);

  // ---------------------------------------------------------------------------------------------------------------
  // Fechas
  // ---------------------------------------------------------------------------------------------------------------
  const MESES = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'];
  const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS_ANTES = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
  const fmtAnio = (y) => (y > 0 ? `${y} e.c.` : `${1 - y} a.e.c.`);
  function mesNuestro(t) {
    const y = Math.floor(t), d = (t - y) / DAY;
    let m = 0;
    while (m < 11 && d >= DIAS_ANTES[m + 1]) m++;
    return { y, m, dia: Math.min(DIAS_ANTES[m + 1] - DIAS_ANTES[m], Math.floor(d - DIAS_ANTES[m]) + 1) };
  }
  const inicioNuestro = (y, m) => (m >= 12 ? y + 1 : y + DIAS_ANTES[m] * DAY);
  // Meses hebreos: [id, nombre en esa época, inicio, fin, nombre posterior al destierro].
  const HEB = [];
  for (const y of D.calendar.years) for (const mo of y.months) HEB.push({ id: mo[0], name: mo[1], s: mo[2], e: mo[3], late: !!mo[4] });
  HEB.sort((a, b) => a.s - b.s);
  function hebreoEn(t) {
    let lo = 0, hi = HEB.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1, h = HEB[mid];
      if (t < h.s) hi = mid - 1; else if (t >= h.e) lo = mid + 1; else return { ...h, day: Math.floor((t - h.s) / DAY) + 1 };
    }
    return null;
  }
  function fmtCursor(t) {
    const y = Math.floor(t);
    if (S.span > 60) return fmtAnio(y);
    const n = mesNuestro(t);
    if (S.span > 2.6) return `${MESES_L[n.m]} de ${fmtAnio(y)}`;
    const h = hebreoEn(t);
    if (S.span > 0.35) return h ? `${h.name.toLowerCase()} de ${fmtAnio(y)} (${MESES_L[n.m]})` : `${MESES_L[n.m]} de ${fmtAnio(y)}`;
    return h ? `${h.day} de ${h.name.toLowerCase()} de ${fmtAnio(y)} (${n.dia} ${MESES[n.m]})` : `${n.dia} de ${MESES_L[n.m]} de ${fmtAnio(y)}`;
  }
  function fmtPoint(t, fine) {
    const y = Math.floor(t);
    if (fine === 'year') return fmtAnio(y);
    const n = mesNuestro(t);
    if (fine === 'month') return `${MESES[n.m]} ${fmtAnio(y)}`;
    const h = hebreoEn(t);
    return h ? `${h.day} de ${h.name.toLowerCase()} de ${fmtAnio(y)}` : `${n.dia} ${MESES[n.m]} ${fmtAnio(y)}`;
  }
  function fmtRange(a, b) {
    const L = b - a;
    if (L >= 1.5 || (Math.abs(a - Math.round(a)) < 1e-6 && Math.abs(b - Math.round(b)) < 1e-6)) {
      const ya = Math.floor(a), yb = Math.floor(b - 1e-6);
      if (ya === yb) return fmtAnio(ya);
      if (ya > 0 && yb > 0) return `${ya}-${yb} e.c.`;
      if (ya <= 0 && yb <= 0) return `${1 - ya}-${1 - yb} a.e.c.`;
      return `${fmtAnio(ya)} - ${fmtAnio(yb)}`;
    }
    const fine = L >= 60 * DAY ? 'month' : 'day';
    if (L <= DAY * 1.05) return fmtPoint(a + L / 2, 'day');
    const pa = fmtPoint(a, fine), pb = fmtPoint(b - DAY / 2, fine);
    if (pa === pb) return pa;
    // «9-30 de tamuz de 50 e.c.» en vez de repetir el mes y el año.
    const ma = pa.match(/^(\d+) (de .+)$/), mb = pb.match(/^(\d+) (de .+)$/);
    if (ma && mb && ma[2] === mb[2]) return `${ma[1]}-${mb[1]} ${ma[2]}`;
    return `${pa} - ${pb}`;
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Estado y dirección
  // ---------------------------------------------------------------------------------------------------------------
  const S = { t: 50.5, a: 50.5 - 0.4 * 8, span: 8, sel: null, expanded: new Set(), focusKey: null, lastScale: 'anos' };
  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    const f = parseFloat(p.get('t'));
    if (Number.isFinite(f)) S.t = f;
    const e = p.get('escala');
    const sc = SCALES.find((s) => s.id === e);
    if (sc) S.span = sc.span; else if (Number.isFinite(parseFloat(e))) S.span = parseFloat(e);
    S.span = clamp(S.span, SPAN_MIN, SPAN_MAX);
    const d = parseFloat(p.get('desde'));
    S.a = Number.isFinite(d) ? d : S.t - 0.4 * S.span;
    const sel = p.get('sel');
    S.sel = sel && byId.has(sel) ? { type: 'mark', id: sel } : null;
    clampView();
  }
  let hashTimer = 0;
  function writeHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => {
      const sc = SCALES.find((s) => Math.abs(Math.log(s.span / S.span)) < 1e-6);
      const parts = [`t=${S.t.toFixed(4)}`, `escala=${sc ? sc.id : S.span.toFixed(5)}`, `desde=${S.a.toFixed(4)}`];
      if (S.sel && S.sel.type === 'mark') parts.push(`sel=${encodeURIComponent(S.sel.id)}`);
      parts.push(`tema=${document.documentElement.dataset.theme === 'oscuro' ? 'oscuro' : 'claro'}`);
      history.replaceState(null, '', `#${parts.join('&')}`);
    }, 200);
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clampView() {
    S.span = clamp(S.span, SPAN_MIN, SPAN_MAX);
    const lo = R0 - S.span * 0.04, hi = R1 + S.span * 0.04 - S.span;
    S.a = hi < lo ? (R0 + R1) / 2 - S.span / 2 : clamp(S.a, lo, hi);
    S.t = clamp(S.t, R0, R1);
  }
  function nearestScale(span = S.span) {
    let best = SCALES[0], bd = Infinity;
    for (const s of SCALES) { const d = Math.abs(Math.log(s.span / span)); if (d < bd) { bd = d; best = s; } }
    return best;
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Medidas de texto
  // ---------------------------------------------------------------------------------------------------------------
  const ctx = document.createElement('canvas').getContext('2d');
  // La misma pila de letras que la página: si el kit no llega, se mide con la del sistema que se pinta.
  const withFallback = (font) => font.replace(/Inter(, system-ui, sans-serif)?$/, 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif').replace(/"EB Garamond"$/, '"EB Garamond", "Iowan Old Style", Georgia, serif');
  const wCache = new Map();
  function tw(text, font) {
    const k = font + '|' + text;
    let w = wCache.get(k);
    if (w == null) { ctx.font = withFallback(font); w = ctx.measureText(text).width; wCache.set(k, w); }
    return w;
  }
  let TOUCH = false;
  const F = () => (TOUCH
    ? { name: '500 12.5px Inter', bold: '700 12.5px Inter', tag: 'italic 500 11px Inter', row: 44, pad: 6, maxLabel: 250, maxBundle: 300 }
    : { name: '500 12px Inter', bold: '700 12px Inter', tag: 'italic 500 11px Inter', row: 30, pad: 6, maxLabel: Infinity, maxBundle: 440 });

  function tags(m) {
    return {
      pre: m.certainty === 'approx' ? 'c.' : '',
      post: m.certainty === 'computed' ? '(cálculo)' : m.certainty === 'uncertain' ? '(¿fecha?)' : '',
    };
  }
  /** Rótulo de una pieza en líneas de fichas {t, c}. En escritorio, una línea; en táctil, hasta dos, sin cortar nunca. */
  const labelCache = new Map();
  function label(m, W) {
    const f = F();
    const key = `${m.id}|${TOUCH}|${Math.round(W)}`;
    if (labelCache.has(key)) return labelCache.get(key);
    const tg = tags(m);
    const toks = [];
    if (tg.pre) toks.push({ t: tg.pre, c: 'tag', font: f.tag });
    for (const w of m.name.split(' ')) toks.push({ t: w, c: 'nm', font: f.name });
    if (tg.post) toks.push({ t: tg.post, c: 'tag', font: f.tag });
    const sp = tw(' ', f.name);
    for (const k of toks) k.w = tw(k.t, k.font);
    const lineW = (line) => line.reduce((s, k, i) => s + k.w + (i ? sp : 0), 0);
    let lines = [toks];
    if (TOUCH) {
      const limit = Math.min(W - 16, Math.max(120, f.maxLabel));
      let max = Math.min(limit, f.maxLabel);
      for (;;) {
        lines = [];
        let cur = [];
        for (const k of toks) {
          if (cur.length && lineW([...cur, k]) > max) { lines.push(cur); cur = [k]; } else cur.push(k);
        }
        if (cur.length) lines.push(cur);
        if (lines.length <= 2 || max >= limit) break;
        max = Math.min(limit, max + 30);
      }
    }
    const res = { lines, w: Math.ceil(Math.max(...lines.map(lineW))) + 2 };
    labelCache.set(key, res);
    return res;
  }
  /** El mismo nombre partido en líneas de `maxW` px como mucho: dos en escritorio, tres en táctil. Null si no cabe. */
  function wrapTo(m, maxW) {
    const f = F(), tg = tags(m), toks = [];
    if (tg.pre) toks.push({ t: tg.pre, c: 'tag', font: f.tag });
    for (const w of m.name.split(' ')) toks.push({ t: w, c: 'nm', font: f.name });
    if (tg.post) toks.push({ t: tg.post, c: 'tag', font: f.tag });
    const sp = tw(' ', f.name);
    for (const k of toks) { k.w = tw(k.t, k.font); if (k.w > maxW) return null; }
    const lineW = (line) => line.reduce((s, k, i) => s + k.w + (i ? sp : 0), 0);
    const lines = [];
    let cur = [];
    for (const k of toks) { if (cur.length && lineW([...cur, k]) > maxW) { lines.push(cur); cur = [k]; } else cur.push(k); }
    if (cur.length) lines.push(cur);
    if (lines.length > (TOUCH ? 3 : 2)) return null;
    return { lines, w: Math.ceil(Math.max(...lines.map(lineW))) + 2 };
  }
  function labelHTML(lab) {
    return lab.lines.map((line) => `<span class="ln">${line.map((k) => `<span class="${k.c === 'tag' ? 'tag' : 'nm'}">${esc(k.t)}</span>`).join(' ')}</span>`).join('');
  }
  const dot = (s) => (/[.:!?»)]$/.test(String(s).trim()) ? String(s).trim() : `${String(s).trim()}.`);
  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

  // ---------------------------------------------------------------------------------------------------------------
  // Piezas y filas
  // ---------------------------------------------------------------------------------------------------------------
  let W = 800;
  const X = (t) => ((t - S.a) / S.span) * W;
  const T = (x) => S.a + (x / W) * S.span;
  const GAP = 8;

  /** Geometría de una pieza en píxeles del mundo: desde el principio de la historia, a la escala de ahora. No depende
      de dónde está la vista, así que arrastrar no cambia la fila de ninguna pieza. Su caja [a, b] es forma + nombre. */
  function worldClip(m, ppy) {
    const f = F();
    const xs = (m.start - R0) * ppy, xe = (m.end - R0) * ppy;
    const lab = label(m, W);
    const lw = lab.w, P = f.pad;
    const shape = isSpanKind(m) ? 'bar' : (xe - xs >= 14 && m.end - m.start > DAY * 1.05 ? 'range' : 'dot');
    const c = { m, shape, lab, key: m.id };
    if (shape === 'bar') {
      c.sA = xs; c.sB = Math.max(xe, xs + 6);
      if (c.sB - c.sA >= lw + 2 * P + 4) { c.a = c.sA; c.b = c.sB; c.inside = true; }
      else { c.a = c.sA; c.b = c.sB + 6 + lw; c.lx = c.sB + 6; }
    } else if (shape === 'dot') {
      const cx = (xs + xe) / 2;
      c.dotX = cx; c.sA = cx - 6; c.sB = cx + 6;
      c.a = cx - 7; c.b = cx + 10 + lw; c.lx = cx + 10;
    } else {
      c.sA = xs; c.sB = xe; c.dotX = (xs + xe) / 2;
      c.a = xs; c.b = Math.max(xe, xs + lw + 2 * P); c.lx = xs + P;
    }
    if (TOUCH && c.b - c.a < 44) c.b = c.a + 44;
    return c;
  }
  /** Las piezas de un carril en filas, a esta escala y este ancho, para toda la historia. La primera fila libre donde
      empieza cada pieza se la queda; una parada nunca va por encima de su viaje. Se calcula una vez por escala. */
  const worldCache = new Map();
  let worldKey = '';
  function membersOf(laneId) {
    if (laneId === 'sucesos') return byLane.get('sucesos').filter((m) => !(m.end - m.start > S.span * WIDE));
    if (laneId === 'sucesos-amplia') return byLane.get('sucesos').filter((m) => m.end - m.start > S.span * WIDE);
    return byLane.get(laneId);
  }
  function worldLane(laneId) {
    const key = `${S.span}|${W}|${TOUCH}`;
    if (key !== worldKey) { worldCache.clear(); worldKey = key; }
    let L = worldCache.get(laneId);
    if (L) return L;
    const ppy = W / S.span;
    const clips = membersOf(laneId).map((m) => worldClip(m, ppy));
    const order = new Map(marks.map((m, i) => [m.id, i]));
    const byStart = (p, q) => p.a - q.a || order.get(p.m.id) - order.get(q.m.id);
    // Los viajes van en sus propias filas, arriba, y no se agrupan nunca: son el armazón de las paradas.
    const trips = clips.filter((c) => c.m.kind === 'journey').sort(byStart);
    const rest = clips.filter((c) => c.m.kind !== 'journey').sort(byStart);
    const tripEnds = [];
    for (const c of trips) {
      let r = 0;
      while (r < tripEnds.length && tripEnds[r] + GAP > c.a) r++;
      tripEnds[r] = c.b; c.row = r; c.trip = true;
    }
    const ends = [];
    for (const c of rest) {
      let r = 0;
      while (r < ends.length && ends[r] + GAP > c.a) r++;
      ends[r] = c.b; c.row = tripEnds.length + r;
    }
    L = { clips, tripRows: tripEnds.length, rows: tripEnds.length + ends.length };
    worldCache.set(laneId, L);
    return L;
  }
  const WIDE = 1.5;   // un suceso cuya fecha abarca más de 1,5 pantallas va al carril «con fecha más amplia»
  /** La pieza en píxeles de la pantalla, con el nombre donde se lee. */
  function screenClip(wc, off) {
    const f = F();
    const c = Object.assign({}, wc);
    for (const k of ['a', 'b', 'sA', 'sB', 'lx', 'dotX']) if (c[k] != null) c[k] -= off;
    const lw = c.lab.w, P = f.pad;
    if (c.shape === 'dot') { c.a = Math.max(c.a, -40); return c; }
    c.cutA = c.sA < 0; c.cutB = c.sB > W;
    if (c.inside) {
      // El nombre dentro de la barra va con la parte que se ve, sin salir nunca de la barra.
      c.lx = clamp(Math.max(c.sA, 0) + P + (c.cutA ? 0 : 3), c.sA + P, c.sB - P - lw);
    }
    c.a = Math.max(c.a, -40); c.b = Math.min(c.b, W + 40);
    return c;
  }
  /** Un nombre que se saldría de la pantalla por un lado se mete dentro, en el sitio libre de su fila y sin tocar a
      nadie: al otro lado de su punto, o partido en dos líneas (tres en táctil). Nunca se corta. */
  function rescueNames(items) {
    const byRow = new Map();
    for (const c of items) { if (!byRow.has(c.row)) byRow.set(c.row, []); byRow.get(c.row).push(c); }
    for (const list of byRow.values()) {
      list.sort((p, q) => p.a - q.a);
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (c.bundle || (c.lx >= 2 && c.lx + c.lab.w <= W - 2)) continue;
        const lo = Math.max(4, i > 0 ? list[i - 1].b + GAP : 0), hi = Math.min(W - 2, i + 1 < list.length ? list[i + 1].a - GAP : W);
        const P = F().pad;
        const regions = [];   // [desde, hasta, alinear a la derecha]
        const shapeIn = c.shape === 'dot' ? c.dotX >= 0 && c.dotX <= W : c.sB >= 0 && c.sA <= W;
        if (c.inside) regions.push([Math.max(lo, Math.max(c.sA, 0) + P), Math.min(hi, c.sB - P), false]);
        if (c.lx < 2) {
          if (c.shape === 'dot' && shapeIn) regions.push([Math.max(lo, c.dotX + 10), hi, false]);
          else regions.push([lo, hi, false]);
        } else {
          regions.push([c.lx, hi, false]);
          if (c.shape === 'dot' && shapeIn) regions.push([lo, c.dotX - 10, true]);
          else if (c.shape !== 'dot' && c.sA > 0) regions.push([lo, c.sA - 6, true]);
        }
        let fit = null;
        for (const pass of [1, 2]) {
          for (const [x0, x1, right] of regions) {
            const room = x1 - x0;
            if (room < 30) continue;
            const lab = pass === 1 ? (c.lab.w <= room ? c.lab : null) : wrapTo(c.m, room);
            if (lab) { fit = { lx: right ? x1 - lab.w : x0, lab }; break; }
          }
          if (fit) break;
        }
        if (!fit) { c.unfit = true; continue; }
        if (c.lx < 2 && !shapeIn) c.slidL = true;
        if (c.lx >= 2 && !shapeIn) c.slidR = true;
        c.lx = fit.lx; c.lab = fit.lab;
        c.a = Math.min(c.a, c.lx - 2); c.b = Math.max(c.b, c.lx + c.lab.w + 2);
      }
    }
  }
  function budgetFor(laneId) {
    if (S.expanded.has(laneId)) return Infinity;
    // Las eras y los imperios no se agrupan nunca: son el armazón de todo lo demás.
    if (laneId === 'eras' || laneId === 'imperios') return Infinity;
    const tab = TOUCH ? BUDGET_TOUCH : BUDGET;
    return (tab[laneId === 'sucesos-amplia' ? 'base' : laneId] || tab.base)[nearestScale().id];
  }
  function nounFor(laneId, members) {
    if (laneId === 'pablo') {
      const st = members.filter((c) => c.m.kind === 'stop').length;
      if (st === members.length) return st === 1 ? 'parada' : 'paradas';
      if (st === 0) return members.length === 1 ? 'viaje' : 'viajes';
      return 'paradas y viajes';
    }
    const n = NOUN[laneId === 'sucesos-amplia' ? 'sucesos' : laneId] || ['marca', 'marcas'];
    return members.length === 1 ? n[0] : n[1];
  }
  /** Un grupo: su cuenta y sus nombres enteros, empezando siempre por el primero; tantos como quepan en `room` px. */
  function bundleLabel(laneId, members, room) {
    const f = F();
    members.sort((p, q) => p.m.start - q.m.start);
    const head = `${members.length} ${nounFor(laneId, members)}`;
    const hw = tw(head, f.bold) + 8;
    const sep = tw(' · ', f.name);
    const moreW = (rest) => (rest ? sep + tw(`y ${rest} más`, f.name) : 0);
    const names = [];
    let used = 0;
    const space = (TOUCH ? room : room - hw) - f.pad - 12;
    for (let i = 0; i < members.length; i++) {
      const w = tw(members[i].m.name, f.name) + (names.length ? sep : 0);
      if (names.length && used + w + moreW(members.length - i - 1) > space) break;
      names.push(members[i].m.name); used += w;
    }
    const restN = members.length - names.length;
    let tail = names.join(' · ');
    if (restN) tail += ` · y ${restN} más`;
    const tailW = tw(tail, f.name);
    const first = tw(members[0].m.name, f.name) + moreW(members.length - 1);
    const w = Math.ceil(TOUCH ? Math.max(hw, tailW) : hw + tailW) + f.pad + 12;
    const minW = Math.ceil(TOUCH ? Math.max(hw, first) : hw + first) + f.pad + 12;
    return { head, tail, w, minW: Math.min(minW, W) };
  }
  /** Lo que no cabe en las filas de la escala va a la última fila, en un grupo por tramo de la regla: así el grupo
      sigue diciendo cuándo. Una marca sola va como pieza, con su nombre, si cabe en su sitio; si no, se une al grupo de
      al lado. Dos grupos que no caben juntos se funden en uno. Cada grupo dice al menos el nombre de su primera marca. */
  function groupOverflow(laneId, over, edges) {
    const f = F();
    const bins = new Map();
    const startX = (c) => (c.shape === 'dot' ? c.dotX - 6 : Math.max(0, c.sA));
    for (const c of over) {
      const x = startX(c);
      let i = 0;
      while (i < edges.length && edges[i] <= x) i++;
      if (!bins.has(i)) bins.set(i, []);
      bins.get(i).push(c);
    }
    let groups = [...bins.entries()].sort((p, q) => p[0] - q[0]).map(([, members]) => ({ members }));
    const firstStart = (g) => (g.members.length === 1 ? g.members[0].a : Math.max(0, Math.min(...g.members.map(startX))));
    // De izquierda a derecha, dónde empieza y acaba cada uno. Devuelve el índice del primero que no cabe, o -1.
    const place = () => {
      let prevB = -Infinity;
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        if (g.members.length === 1) {
          const c = g.members[0];
          g.a = c.a; g.b = c.b;
          if (g.a < prevB + GAP || g.b > W + 0.5) return i;
        } else {
          let a = Math.max(firstStart(g), prevB + GAP);
          let lab = bundleLabel(laneId, g.members, Math.min(f.maxBundle, W - a));
          if (a + lab.minW > W) a = Math.max(prevB + GAP, W - lab.minW);
          const nextA = i + 1 < groups.length ? firstStart(groups[i + 1]) - GAP : W;
          const avail = Math.max(lab.minW, Math.min(W, nextA) - a);
          lab = bundleLabel(laneId, g.members, Math.min(f.maxBundle, avail));
          g.a = a; g.lab = lab;
          g.b = a + Math.max(lab.minW, Math.min(lab.w, avail));
          if (a < prevB + GAP - 0.5 || a < -0.5) return i;
        }
        prevB = g.b;
      }
      return -1;
    };
    for (let guard = 0; guard < 400; guard++) {
      const bad = place();
      if (bad < 0 || groups.length === 1) break;
      const lo = bad > 0 ? bad - 1 : 0;
      groups.splice(lo, 2, { members: [...groups[lo].members, ...groups[lo + 1].members] });
    }
    return groups.map((g) => (g.members.length === 1 ? g.members[0]
      : { bundle: true, members: g.members, head: g.lab.head, tail: g.lab.tail, a: g.a, b: g.b, minW: g.lab.minW, key: 'grupo:' + g.members[0].m.id, lane: laneId }));
  }
  /** Una pieza cuya forma queda fuera de la pantalla solo se pinta si su nombre se lee entero; si no, no está en la
      vista (aparece en cuanto se arrastra un poco). */
  function onScreen(c) {
    if (c.bundle) return true;
    const out = c.shape === 'dot' ? c.dotX + 6 < 0 || c.dotX - 6 > W : c.sB < 0 || c.sA > W;
    return !out || (c.lx >= 0 && c.lx + c.lab.w <= W);
  }
  /** Reparte las piezas de un carril en filas. Devuelve {rows, items, grouped}. */
  function layoutLane(laneId) {
    const WL = worldLane(laneId);
    const off = (S.a - R0) * (W / S.span);
    const clips = [];
    for (const wc of WL.clips) if (wc.b - off >= 0 && wc.a - off <= W) clips.push(screenClip(wc, off));
    if (!clips.length) return null;
    // Las filas de viajes sin ningún viaje a la vista no ocupan sitio.
    if (WL.tripRows) {
      const seen = [...new Set(clips.filter((c) => c.trip).map((c) => c.row))].sort((p, q) => p - q);
      const gone = WL.tripRows - seen.length;
      for (const c of clips) c.row = c.trip ? seen.indexOf(c.row) : c.row - gone;
    }
    const used = Math.max(...clips.map((c) => c.row)) + 1;
    const trips = clips.filter((c) => c.trip).length ? Math.max(...clips.filter((c) => c.trip).map((c) => c.row)) + 1 : 0;
    const B = Math.max(budgetFor(laneId), trips + 2);
    rescueNames(clips);
    // Una pieza cuyo nombre no se puede leer entero en su fila (pegada al borde, sin sitio) va al grupo de la última
    // fila, que la nombra; donde no hay grupos (días, eras e imperios) se queda.
    const unfit = (c) => c.unfit && !c.trip && Number.isFinite(B);
    if (!Number.isFinite(B)) {
      // Sin grupos, la pieza que no se lee en su fila pasa a una fila propia, abajo, donde su nombre cabe al otro lado.
      let extra = used;
      for (const c of clips) if (c.unfit && !c.trip) { c.row = extra++; c.unfit = false; }
      if (extra > used) rescueNames(clips.filter((c) => c.row >= used));
      return { rows: extra, items: clips.filter(onScreen), grouped: 0, bundles: 0, need: extra };
    }
    if (used <= B && !clips.some(unfit)) return { rows: used, items: clips.filter(onScreen), grouped: 0, bundles: 0, need: used };
    const keep = clips.filter((c) => c.row < B - 1 && !unfit(c));
    const over = clips.filter((c) => c.row >= B - 1 || unfit(c));
    let grouped = 0, bundles = 0;
    for (const it of groupOverflow(laneId, over, EDGES)) {
      it.row = B - 1;
      keep.push(it);
      if (it.bundle) { grouped += it.members.length; bundles++; }
    }
    rescueNames(keep);
    return { rows: B, items: keep.filter(onScreen), grouped, bundles, need: used };
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Regla
  // ---------------------------------------------------------------------------------------------------------------
  function majorTicks() {
    const ppy = W / S.span, ppd = ppy * DAY, out = [];
    const t0 = S.a, t1 = S.a + S.span;
    // La marca más fina que deja sitio a su rótulo: días, semanas, meses, trimestres o años.
    const cands = [['d', 1, 30], ['d', 2, 30], ['d', 7, 40], ['m', 1, 40], ['m', 3, 56],
      ...[1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].map((n) => ['y', n, TOUCH ? 64 : 84])];
    const [k, n] = cands.find(([k, n, min]) => (k === 'd' ? n * ppd : k === 'm' ? (n * ppy) / 12 : n * ppy) >= min) || ['y', 1000];
    if (k === 'y') {
      // Números redondos en las dos eras: n e.c. está en t = n; n a.e.c. en t = 1 - n.
      for (let y = Math.ceil(Math.max(1, t0) / n) * n; y <= t1; y += n) out.push({ t: y, text: fmtAnio(y) });
      for (let y = Math.ceil(Math.max(1, 1 - t1) / n) * n; 1 - y >= t0; y += n) out.push({ t: 1 - y, text: fmtAnio(1 - y) });
      return out.sort((p, q) => p.t - q.t);
    }
    const y0 = Math.floor(t0), y1 = Math.floor(t1);
    if (k === 'm') {
      for (let y = y0; y <= y1; y++) for (let m = 0; m < 12; m += n) {
        const t = inicioNuestro(y, m);
        if (t >= t0 && t <= t1) out.push({ t, text: m === 0 ? `${MESES[m]} ${fmtAnio(y)}` : MESES[m] });
      }
      if (out.length && !/\d/.test(out[0].text)) out[0].text += ` ${fmtAnio(Math.floor(out[0].t))}`;
      return out;
    }
    for (let y = y0; y <= y1; y++) for (let m = 0; m < 12; m++) {
      const len = DIAS_ANTES[m + 1] - DIAS_ANTES[m];
      for (let d = 1; d <= len; d += 1) {
        if (n > 1 && (d - 1) % n) continue;
        if (n === 7 && d > 28) continue;
        const t = y + (DIAS_ANTES[m] + d - 1) * DAY;
        if (t >= t0 && t <= t1) out.push({ t, text: d === 1 ? `1 ${MESES[m]}` : String(d) });
      }
    }
    if (out.length && !/[a-z]/.test(out[0].text)) { const q = mesNuestro(out[0].t + DAY / 2); out[0].text = `${q.dia} ${MESES[q.m]}`; }
    return out;
  }
  function renderRuler(ticks) {
    const ruler = $('#ruler');
    const withHeb = S.span <= 2.6;
    ruler.classList.toggle('con-hebreo', withHeb);
    const html = [];
    // Un rótulo que pisaría al anterior se calla; su raya se queda.
    let lastEnd = -Infinity;
    for (const k of ticks) {
      const x = X(k.t), w = tw(k.text, '400 11.5px Inter') + 4;
      const room = x + 4 >= lastEnd + 8;
      if (room) lastEnd = x + 4 + w;
      html.push(`<div class="tick" style="left:${x.toFixed(1)}px">${room ? `<span class="tick-label">${esc(k.text)}</span>` : ''}</div>`);
    }
    if (withHeb) {
      const t0 = S.a, t1 = S.a + S.span;
      const ppd = (W / S.span) * DAY;
      for (const h of HEB) {
        if (h.e < t0 || h.s > t1) continue;
        const xa = X(h.s), xb = X(h.e);
        const nameX = Math.max(0, xa) - xa + 4;
        const room = Math.min(xb, W) - Math.max(0, xa) - 8;
        const nm = room < tw(h.name, '600 12.5px "EB Garamond"') ? '' : h.late ? `<i title="Nombre de después del destierro; la Biblia de esa época no lo usa">${esc(h.name)}</i>` : esc(h.name);
        html.push(`<div class="hebreo" style="left:${xa.toFixed(1)}px;width:${(xb - xa).toFixed(1)}px"><span class="hebreo-nombre" style="left:${nameX.toFixed(1)}px">${nm}</span></div>`);
        if (ppd >= 15) {
          const n = Math.round((h.e - h.s) / DAY);
          for (let d = 1; d <= n; d++) {
            if (ppd < 22 && d % 2 === 0) continue;
            const x = X(h.s + (d - 0.5) * DAY);
            if (x > -10 && x < W + 10) html.push(`<span class="hebreo-dia" style="left:${x.toFixed(1)}px">${d}</span>`);
          }
        }
      }
    }
    const sel = selRange();
    if (sel) html.push(`<div class="sel-band" style="left:${Math.max(-2, X(sel[0])).toFixed(1)}px;width:${Math.max(2, Math.min(W + 2, X(sel[1])) - Math.max(-2, X(sel[0]))).toFixed(1)}px"></div>`);
    const cx = X(S.t);
    if (cx >= -1 && cx <= W + 1) {
      html.push(`<div class="cursor-line" style="left:${cx.toFixed(1)}px"></div>`);
      const txt = fmtCursor(S.t);
      const fw = tw(txt, '600 11.5px Inter') + 18;
      const fx = clamp(cx, fw / 2 + 2, W - fw / 2 - 2);
      html.push(`<div class="cursor-flag" style="left:${fx.toFixed(1)}px">${esc(txt)}</div>`);
    }
    ruler.innerHTML = html.join('');
    ruler.setAttribute('aria-valuenow', S.t.toFixed(3));
    ruler.setAttribute('aria-valuetext', fmtCursor(S.t));
  }
  function selRange() {
    if (!S.sel) return null;
    if (S.sel.type === 'mark') { const m = byId.get(S.sel.id); return m ? [m.start, m.end] : null; }
    const ms = S.sel.ids.map((id) => byId.get(id));
    return [Math.min(...ms.map((m) => m.start)), Math.max(...ms.map((m) => m.end))];
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Pintar la franja
  // ---------------------------------------------------------------------------------------------------------------
  let EDGES = [];
  let holdRows = null;      // filas de cada carril al empezar un arrastre
  let LAYOUT = [];          // [{lane, top, h, rows, items, grouped, bundles, need}]
  let RENDERED = [];        // piezas pintadas, para el teclado y las pruebas
  const $ = (s) => document.querySelector(s);

  function isSelected(item) {
    if (!S.sel) return false;
    if (item.bundle) {
      const ids = item.members.map((c) => c.m.id);
      if (S.sel.type === 'mark') return ids.includes(S.sel.id);
      return S.sel.ids.some((id) => ids.includes(id));
    }
    if (S.sel.type === 'mark') return item.m.id === S.sel.id;
    return false;
  }
  function clipHTML(c, top, laneColor) {
    const f = F();
    const h = f.row;          // la pieza ocupa la fila entera (44 px en táctil); lo que se ve va 2 px hacia dentro
    const w = c.b - c.a;
    if (c.bundle) {
      const lines = TOUCH
        ? `<span class="ln"><span class="cnt">${esc(c.head)}</span></span>${c.tail ? `<span class="ln nms">${esc(c.tail)}</span>` : ''}`
        : `<span class="ln"><span class="cnt">${esc(c.head)}</span>${c.tail ? `<span class="nms">${esc(c.tail)}</span>` : ''}</span>`;
      const aria = `Grupo de ${c.head}: ${c.members.map((k) => k.m.name).join('; ')}. Pulsa para ver la lista.`;
      return `<button type="button" class="clip clip--bundle${isSelected(c) ? ' is-sel' : ''}" aria-pressed="${isSelected(c)}" data-key="${esc(c.key)}" data-bundle="${esc(c.members.map((k) => k.m.id).join('|'))}" tabindex="-1"
        style="left:${c.a.toFixed(1)}px;top:${top}px;width:${w.toFixed(1)}px;height:${h}px;--c:${laneColor}" aria-label="${esc(aria)}">`
        + `<span class="clip-shape" style="left:0;width:${w.toFixed(1)}px"></span><span class="clip-label">${lines}</span></button>`;
    }
    const m = c.m;
    const color = colorOf(m);
    const cls = [`clip`, `clip--${c.shape}`, `cert-${m.certainty}`];
    if (c.cutA) cls.push('cut-a');
    if (c.cutB) cls.push('cut-b');
    if (isSelected(c)) cls.push('is-sel');
    if (c.inside) cls.push('lab-in');
    let shapeStyle, extra = '';
    if (c.shape === 'dot') shapeStyle = `left:${(c.dotX - 5.5 - c.a).toFixed(1)}px`;
    else {
      const va = Math.max(c.sA, -4), vb = Math.min(c.sB, W + 4);
      shapeStyle = `left:${(va - c.a).toFixed(1)}px;width:${Math.max(c.shape === 'bar' ? 6 : 2, vb - va).toFixed(1)}px`;
      if (c.shape === 'range' && c.dotX > -8 && c.dotX < W + 8) extra = `<span class="clip-dot" style="left:${(c.dotX - c.a).toFixed(1)}px"></span>`;
    }
    const shapeOut = c.shape === 'dot' ? (c.dotX + 6 < 0 ? 'izq' : c.dotX - 6 > W ? 'der' : '') : c.sB < 0 ? 'izq' : c.sA > W ? 'der' : '';
    const labCls = c.slidL && shapeOut === 'izq' ? ' fuera-izq' : c.slidR && shapeOut === 'der' ? ' fuera-der' : '';
    // Difuminado de los extremos inciertos: fijo en pantalla, no una parte de la barra; solo en el extremo que se ve.
    let fa = 0, fb = 0;
    if ((m.certainty === 'approx' || m.certainty === 'uncertain') && c.shape !== 'dot' && c.sB - c.sA >= 24) {
      const len = c.sB - c.sA, fz = Math.min(m.certainty === 'uncertain' ? 34 : 18, len / 3);
      const open = m.openEnd;
      if (!c.cutA && (m.certainty === 'approx' || open === 'start' || !open)) fa = fz;
      if (!c.cutB && (m.certainty === 'approx' || open === 'end' || !open)) fb = fz;
    }
    const labelStyle = `left:${(c.lx - c.a).toFixed(1)}px`;
    const aria = `${kindLabel(m)}: ${dot(m.name)} ${dot(m.date)} ${certSentence(m)}`;
    return `<button type="button" class="${cls.join(' ')}" aria-pressed="${isSelected(c)}" data-key="${esc(c.key)}" data-id="${esc(m.id)}" tabindex="-1"
      style="left:${c.a.toFixed(1)}px;top:${top}px;width:${w.toFixed(1)}px;height:${h}px;--c:${color};--fa:${fa.toFixed(0)}px;--fb:${fb.toFixed(0)}px" aria-label="${esc(aria)}">`
      + `<span class="clip-shape" style="${shapeStyle}"></span>${extra}<span class="clip-label${labCls}${c.lab.lines.length > (TOUCH ? 2 : 1) ? ' apretada' : ''}" style="${labelStyle}">${labelHTML(c.lab)}</span></button>`;
  }

  let lastStats = null;
  function render() {
    const lanesEl = $('#lanes'), track = $('#track');
    W = Math.max(200, track.clientWidth || (lanesEl.clientWidth - (TOUCH ? 0 : 164)));
    const f = F();
    const ticks = majorTicks();
    EDGES = ticks.map((k) => X(k.t)).filter((x) => x > 0 && x < W);
    renderRuler(ticks);
    // Recordar el foco del teclado para devolverlo a la misma pieza.
    const active = document.activeElement;
    const hadFocus = active && active.classList && active.classList.contains('clip') ? active.dataset.key : null;

    LAYOUT = [];
    const empty = [];
    let y = 0;
    for (const lane of LANES) {
      let L = layoutLane(lane.id);
      // Mientras se arrastra, un carril no encoge: lo que está debajo no sube y baja con cada paso.
      if (holdRows) {
        const held = holdRows.get(lane.id) || 0;
        if (!L && held) L = { rows: held, items: [], grouped: 0, bundles: 0, need: 0 };
        if (L) { L.rows = Math.max(L.rows, held); holdRows.set(lane.id, L.rows); }
      }
      if (!L) { if (lane.id !== 'sucesos-amplia') empty.push(lane.name); continue; }
      const band = TOUCH ? 24 : 0;
      const hasBtn = L.grouped > 0 || S.expanded.has(lane.id);
      // La cabecera del carril tiene que caber entera: nombre, cuenta de filas y el botón.
      const nameLines = Math.ceil((tw(lane.name, '700 12.5px Inter') + 16) / 140);
      const infoLines = L.grouped ? 2 : 1;
      const minH = TOUCH ? 0 : 12 + nameLines * 16 + infoLines * 15 + (hasBtn ? 36 : 0);
      const h = Math.max(minH, band + 6 + L.rows * f.row + 2);
      LAYOUT.push({ lane, top: y, h, band, ...L });
      y += h;
    }
    const heads = [], clips = [], deco = [];
    for (const k of ticks) deco.push(`<div class="grid-line" style="left:${X(k.t).toFixed(1)}px"></div>`);
    const sel = selRange();
    if (sel) deco.push(`<div class="sel-col" style="left:${Math.max(0, X(sel[0])).toFixed(1)}px;width:${Math.max(2, Math.min(W, X(sel[1])) - Math.max(0, X(sel[0]))).toFixed(1)}px"></div>`);
    RENDERED = [];
    for (const L of LAYOUT) {
      const color = LANE_COLOR[L.lane.id];
      const info = L.grouped
        ? `${L.rows} de ${L.need} filas · ${L.grouped} en ${L.bundles} ${L.bundles === 1 ? 'grupo' : 'grupos'}`
        : `${L.rows} ${L.rows === 1 ? 'fila' : 'filas'}`;
      const btn = L.grouped ? `<button type="button" class="head-btn" data-expand="${L.lane.id}">Ver todas las filas</button>`
        : S.expanded.has(L.lane.id) ? `<button type="button" class="head-btn" data-collapse="${L.lane.id}">Recoger</button>` : '';
      heads.push(`<div class="head" style="top:${L.top}px;height:${L.h}px"><div class="head-name"><span class="head-sw" style="--c:${color}"></span>${esc(L.lane.name)}</div><div class="head-info">${info}</div>${btn}</div>`);
      deco.push(`<div class="lane-sep" style="top:${L.top}px"></div>`);
      if (L.band) deco.push(`<div class="band" style="top:${L.top}px"><span>${esc(L.lane.name)}</span><span class="band-info">${info}</span></div>`);
      for (const it of L.items) {
        const top = L.top + L.band + 4 + it.row * f.row;
        clips.push(clipHTML(it, top, color));
        RENDERED.push({ key: it.key, lane: L.lane.id, laneIdx: LAYOUT.indexOf(L), row: it.row, a: it.a, b: it.b, item: it });
      }
    }
    const cx = X(S.t);
    if (cx >= -1 && cx <= W + 1) deco.push(`<div class="cursor-line" style="left:${cx.toFixed(1)}px"></div>`);
    $('#lanes-inner').style.height = `${Math.max(y, 10)}px`;
    $('#heads').innerHTML = heads.join('');
    track.innerHTML = deco.join('') + clips.join('');
    $('#strip-foot').textContent = footText(empty);

    // Una sola pieza con tabindex 0: la del foco, la elegida o la primera.
    let tabKey = [S.focusKey, hadFocus].find((k) => k && RENDERED.some((r) => r.key === k));
    if (!tabKey && S.sel) { const r = RENDERED.find((q) => isSelected(q.item)); if (r) tabKey = r.key; }
    if (!tabKey && RENDERED.length) tabKey = RENDERED.slice().sort((p, q) => p.laneIdx - q.laneIdx || p.row - q.row || p.a - q.a)[0].key;
    const el = tabKey ? track.querySelector(`.clip[data-key="${cssEsc(tabKey)}"]`) : null;
    if (el) el.tabIndex = 0;
    if (hadFocus) {
      const again = track.querySelector(`.clip[data-key="${cssEsc(hadFocus)}"]`) || el;
      if (again) { again.tabIndex = 0; again.focus({ preventScroll: true }); }
    }
    updateToolbar();
    if (!S.sel && idleT !== S.t && !$('#inspector').contains(document.activeElement)) { idleT = S.t; renderCard(); }
    writeHash();
  }
  let idleT = null;
  function cssEsc(s) { return window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/["\\]/g, '\\$&'); }
  function footText(empty) {
    let named = 0, grouped = 0, bundles = 0;
    for (const L of LAYOUT) for (const it of L.items) { if (it.bundle) { grouped += it.members.length; bundles++; } else named++; }
    lastStats = { named, grouped, bundles, total: named + grouped };
    let s = `En pantalla: ${named + grouped} marcas. ${named} con su nombre en su pieza`;
    if (grouped) s += `; ${grouped} dentro de ${bundles} ${bundles === 1 ? 'grupo' : 'grupos'}, con la lista a un clic`;
    s += '.';
    if (empty.length) s += ` Sin nada en esta ventana: ${empty.join(', ')}.`;
    return s;
  }
  function updateToolbar() {
    const near = nearestScale();
    const exact = Math.abs(Math.log(near.span / S.span)) < 0.05;
    const u = STEP_TXT[near.id];
    $('#paso-atras').textContent = `‹ ${u}`; $('#paso-atras').setAttribute('aria-label', `Cursor: ${u} antes`);
    $('#paso-adelante').textContent = `${u} ›`; $('#paso-adelante').setAttribute('aria-label', `Cursor: ${u} después`);
    for (const b of document.querySelectorAll('.scale-btn')) b.setAttribute('aria-pressed', String(exact && b.dataset.scale === near.id));
    $('#cursor-texto').textContent = fmtCursor(S.t);
    $('#span-texto').textContent = `· ${spanText(S.span)} en pantalla`;
    const cc = document.getElementById('card-cursor');
    if (cc) cc.textContent = cursorLine();
  }
  function spanText(s) {
    if (s >= 2) return `${Math.round(s).toLocaleString('es')} años`;
    if (s >= 2 / 12) return `${Math.round(s * 12)} meses`;
    return `${Math.round(s / DAY)} días`;
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Ficha
  // ---------------------------------------------------------------------------------------------------------------
  function kindLabel(m) {
    if (m.kind === 'period') return m.type === 'era' ? 'Era' : 'Potencia mundial';
    if (m.kind === 'ruler') return { rey: 'Rey', emperador: 'Emperador', gobernador: 'Gobernador', 'sumo-sacerdote': 'Sumo sacerdote' }[m.type] || 'Gobernante';
    return { event: 'Suceso', journey: 'Viaje de Pablo', stop: 'Parada de un viaje de Pablo', letter: 'Carta' }[m.kind] || 'Marca';
  }
  function certSentence(m) {
    switch (m.certainty) {
      case 'exact': return 'Fecha que da la fuente.';
      case 'approx': return 'Fecha aproximada: la fuente dice «c.».';
      case 'computed': return 'Fecha calculada por nosotros o situada por el orden del relato; la fuente no la da así.';
      default: return m.openEnd ? `Fecha incierta: no se sabe cuándo ${m.openEnd === 'end' ? 'termina' : 'empieza'}.` : 'Fecha incierta: la fuente duda.';
    }
  }
  function shapeSentence(m) {
    if (isSpanKind(m)) return `Un tramo: ocupa ${fmtRange(m.start, m.end)}`.replace(/\.?$/, '.');
    if (m.end - m.start <= DAY * 1.05) return 'Un momento: pasó en un día.';
    const r = RENDERED.find((q) => q.item.m === m);
    const drawn = r && r.item.shape === 'range' ? ' La línea bajo el nombre abarca dónde puede caer.' : r && r.item.shape === 'dot' ? ' A esta escala su fecha cabe en el punto.' : '';
    return `Un momento, no un tramo: pasó una vez, en algún punto de su fecha.${drawn}`;
  }
  function cursorLine() {
    const r = selRange();
    let s = `Cursor: ${fmtCursor(S.t)}`;
    if (r) s += S.t >= r[0] - 1e-9 && (S.t < r[1] || (r[1] <= r[0] && S.t <= r[1] + 1e-9)) ? ', dentro de la marca.' : ', fuera de la marca.';
    return s;
  }
  function chips(list) { return `<div class="chips">${list.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div>`; }
  function renderCard() {
    const box = $('#inspector');
    const color = (m) => colorOf(m);
    if (!S.sel) {
      const here = marks.filter((m) => m.start <= S.t && m.end >= S.t && byLane.has(m.lane)).slice(0, 8);
      box.innerHTML = `<p class="card-eyebrow">Nada elegido</p>
        <p class="card-idle">Pulsa una marca para ver qué es. La escala y la vista se quedan donde están.</p>
        <p class="card-cursor" id="card-cursor">${esc(cursorLine())}</p>
        ${here.length ? `<p class="card-eyebrow" style="margin-top:14px">Lo que abarca el cursor</p><ul class="card-list">${here.map((m) => `<li><button type="button" data-pick="${esc(m.id)}"><span>${esc(m.name)}</span><span class="li-date">${esc(kindLabel(m))} · ${esc(m.date)}</span></button></li>`).join('')}</ul>` : ''}`;
      return;
    }
    if (S.sel.type === 'bundle') {
      const ms = S.sel.ids.map((id) => byId.get(id));
      const lane = LANES.find((l) => l.id === S.sel.lane);
      box.innerHTML = `<button type="button" class="hoja-cerrar" data-clear="1">Cerrar</button><p class="card-eyebrow"><span class="card-sw" style="--c:${LANE_COLOR[S.sel.lane]}"></span>Grupo · ${esc(lane ? lane.name : '')}</p>
        <h2 class="card-title">${ms.length} ${esc(nounFor(S.sel.lane, ms.map((m) => ({ m }))))}</h2>
        <p class="card-idle">No caben en las filas que esta escala da al carril. Todos, en orden; pulsa uno para verlo.</p>
        <ul class="card-list" id="card-list">${ms.map((m) => `<li><button type="button" data-pick="${esc(m.id)}" data-from="${esc(S.sel.ids.join('|'))}"><span>${esc(m.name)}</span><span class="li-date">${esc(m.date)}${m.certainty === 'computed' ? ' · cálculo nuestro' : m.certainty === 'uncertain' ? ' · fecha incierta' : ''}</span></button></li>`).join('')}</ul>
        <p class="card-cursor" id="card-cursor">${esc(cursorLine())}</p>
        <div class="card-actions"><button type="button" class="card-btn" data-expand="${esc(S.sel.lane)}">Ver todas las filas de ${esc(lane ? lane.name : '')}</button>
        <button type="button" class="card-btn" data-clear="1">Quitar selección</button></div>`;
      return;
    }
    const m = byId.get(S.sel.id);
    const lane = LANES.find((l) => l.id === m.lane);
    const kv = [];
    kv.push(['Precisión', D.precisions[m.precision] || m.precision]);
    if (m.places && m.places.length) kv.push(['Lugares', chips(m.places)]);
    if (m.people && m.people.length) kv.push(['Personas', chips(m.people)]);
    if (m.to) kv.push(['Destinatarios', esc(m.to)]);
    if (m.ref) kv.push(['Texto', esc(m.ref)]);
    const notes = [];
    notes.push(`<b>${esc(shapeSentence(m))}</b> ${esc(certSentence(m))}`);
    if (m.placed && m.stated) notes.push(`En la franja va en ${esc(fmtRange(m.start, m.end))}, por el orden del relato; la fecha de la fuente abarca ${esc(fmtRange(m.stated[0], m.stated[1]))}`.replace(/\.?$/, '.'));
    else if (m.placed && m.kind === 'stop') notes.push('La franja la sitúa dentro del viaje por el orden de las paradas.');
    if (m.secular) for (const s of m.secular) notes.push(`<b>Cronología secular:</b> ${esc(s.date)}.`);
    let extra = '';
    if (m.kind === 'stop' && m.journey && byId.has(m.journey)) extra = `<div class="card-actions"><button type="button" class="card-btn" data-pick="${esc(m.journey)}">Viaje: ${esc(byId.get(m.journey).name)}</button></div>`;
    if (m.kind === 'journey' && stopsOf.has(m.id)) extra = `<p class="card-eyebrow" style="margin-top:14px">Paradas</p><ul class="card-list">${stopsOf.get(m.id).map((s) => `<li><button type="button" data-pick="${esc(s.id)}"><span>${esc(s.name)}</span><span class="li-date">${esc(s.date)}</span></button></li>`).join('')}</ul>`;
    const back = S.sel.from ? `<button type="button" class="card-btn" data-back="${esc(S.sel.from.join('|'))}" data-lane="${esc(m.lane)}">Volver al grupo (${S.sel.from.length})</button>` : '';
    box.innerHTML = `<button type="button" class="hoja-cerrar" data-clear="1">Cerrar</button><p class="card-eyebrow"><span class="card-sw" style="--c:${color(m)}"></span>${esc(kindLabel(m))} · ${esc(lane ? lane.name : '')}</p>
      <h2 class="card-title">${esc(m.name)}</h2>
      <p class="card-date">${esc(m.date)}</p>
      ${notes.map((n) => `<p class="card-note">${n}</p>`).join('')}
      <dl class="card-kv">${kv.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
      ${m.summary ? `<p class="card-sum">${esc(m.summary)}</p>` : '<p class="card-sum">Sin resumen en los datos.</p>'}
      <p class="card-cursor" id="card-cursor">${esc(cursorLine())}</p>
      <div class="card-actions">${back}<button type="button" class="card-btn" data-clear="1">Quitar selección</button></div>
      ${extra}`;
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Elegir: nunca cambia la escala ni la vista
  // ---------------------------------------------------------------------------------------------------------------
  /** El cursor va al punto de [a, b) más cercano a lo señalado (el puntero, o el cursor si fue con el teclado),
      sin salir de la parte visible. El final no cuenta: es el primer instante de lo que viene después (el día
      siguiente, el año siguiente), así que el cursor se queda como mucho una hora antes. */
  function cursorInto(a, b, px) {
    const end = b > a ? b - Math.min((b - a) / 2, DAY / 24) : b;
    const va = Math.max(a, S.a), vb = Math.min(end, S.a + S.span);
    if (vb < va) return;
    const target = px != null ? T(px) : S.t;
    S.t = clamp(target, va, vb);
  }
  function selectMark(id, px, from, tapY) {
    const m = byId.get(id);
    if (!m) return;
    if (px !== undefined) cursorInto(m.start, m.end, px);
    S.sel = { type: 'mark', id, from: from || null };
    renderCard(); sheet(tapY); schedule();
    $('#vivo').textContent = `Elegido: ${dot(m.name)} ${dot(m.date)}`;
  }
  function selectBundle(ids, lane, px, tapY) {
    const ms = ids.map((i) => byId.get(i));
    if (px !== undefined) cursorInto(Math.min(...ms.map((m) => m.start)), Math.max(...ms.map((m) => m.end)), px);
    S.sel = { type: 'bundle', ids, lane };
    renderCard(); sheet(tapY); schedule();
    $('#vivo').textContent = `Grupo de ${ms.length} ${nounFor(lane, ms.map((m) => ({ m })))}. La lista está en la ficha.`;
  }
  function deselect() { if (!S.sel) return; S.sel = null; renderCard(); sheet(); schedule(); $('#vivo').textContent = 'Nada elegido.'; }
  /** En el móvil, con algo elegido, la ficha es una hoja que siempre se ve: abajo, o arriba si lo tocado está abajo. */
  function sheet(tapY) {
    const box = $('#inspector');
    const on = !!S.sel && innerWidth <= 760;
    box.classList.toggle('hoja', on);
    if (on && tapY != null) box.classList.toggle('arriba', tapY > innerHeight * 0.5);
    if (!on) box.classList.remove('arriba');
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Moverse y cambiar de escala: siempre con un gesto o un botón propios
  // ---------------------------------------------------------------------------------------------------------------
  let raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); }
  function zoomAt(px, factor) {
    const t = T(px);
    S.span = clamp(S.span * factor, SPAN_MIN, SPAN_MAX);
    S.a = t - (px / W) * S.span;
    clampView(); schedule();
  }
  /** Cambia la escala dejando quieto el cursor en pantalla (o el centro, si el cursor no se ve). */
  function setSpan(span) {
    const cx = X(S.t);
    const px = cx >= 0 && cx <= W ? cx : W / 2;
    const t = T(px);
    S.span = clamp(span, SPAN_MIN, SPAN_MAX);
    S.a = t - (px / W) * S.span;
    clampView(); schedule();
  }
  function stepScale(dir) {
    const i = SCALES.indexOf(nearestScale());
    const exact = Math.abs(Math.log(SCALES[i].span / S.span)) < 0.05;
    let j = i + dir;
    if (!exact) j = dir > 0 ? SCALES.findIndex((s) => s.span < S.span * 0.95) : SCALES.map((s) => s.span > S.span * 1.05).lastIndexOf(true);
    if (j < 0 || j >= SCALES.length) return;
    setSpan(SCALES[j].span);
  }
  function pan(frac) { S.a += frac * S.span; clampView(); schedule(); }
  const STEP_TXT = { milenios: '100 años', siglos: '10 años', decadas: '1 año', anos: '1 mes', meses: '1 semana', dias: '1 día' };
  function cursorStep() {
    return { milenios: 100, siglos: 10, decadas: 1, anos: 1 / 12, meses: 7 * DAY, dias: DAY }[nearestScale().id];
  }
  function moveCursor(dt) {
    S.t = clamp(S.t + dt, R0, R1);
    // Con el teclado, la vista acompaña al cursor lo justo para que no se salga.
    const x = X(S.t);
    if (x < 0) S.a = S.t - 0.02 * S.span; else if (x > W) S.a = S.t - 0.98 * S.span;
    clampView(); schedule();
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Eventos
  // ---------------------------------------------------------------------------------------------------------------
  function trackX(e) { return e.clientX - $('#track').getBoundingClientRect().left; }
  const pointers = new Map();
  let drag = null, pinch = null, suppressClick = false;

  function setupTrack() {
    const lanesEl = $('#lanes'), track = $('#track');
    lanesEl.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.head')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, a0: S.a, moved: false, type: e.pointerType };
      else if (pointers.size === 2) {
        drag = null;
        const [p, q] = [...pointers.values()];
        const cxp = (p.x + q.x) / 2 - track.getBoundingClientRect().left;
        pinch = { d0: Math.max(20, Math.abs(p.x - q.x)), span0: S.span, t: T(cxp) };
      }
    });
    lanesEl.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size >= 2) {
        const [p, q] = [...pointers.values()];
        const d = Math.max(20, Math.abs(p.x - q.x));
        const cxp = (p.x + q.x) / 2 - track.getBoundingClientRect().left;
        S.span = clamp(pinch.span0 * (pinch.d0 / d), SPAN_MIN, SPAN_MAX);
        S.a = pinch.t - (cxp / W) * S.span;
        clampView(); schedule();
        return;
      }
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      const th = drag.type === 'mouse' ? 4 : 10;
      if (!drag.moved) {
        if (Math.abs(dx) < th) return;
        if (drag.type !== 'mouse' && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }   // gesto vertical: lo lleva el navegador
        drag.moved = true;
        holdRows = new Map();
        track.classList.add('arrastrando');
        try { lanesEl.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
      }
      S.a = drag.a0 - (dx / W) * S.span;
      clampView(); schedule();
    });
    const end = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (drag && drag.id === e.pointerId) {
        if (drag.moved) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 0); holdRows = null; schedule(); }
        drag = null;
        track.classList.remove('arrastrando');
      }
    };
    lanesEl.addEventListener('pointerup', end);
    lanesEl.addEventListener('pointercancel', end);
    track.addEventListener('click', (e) => {
      if (suppressClick) { suppressClick = false; return; }
      const el = e.target.closest('.clip');
      if (!el) { if (e.detail > 0) deselect(); return; }
      const px = e.detail > 0 ? trackX(e) : null;
      const tapY = e.detail > 0 ? e.clientY : null;
      S.focusKey = el.dataset.key;
      if (el.dataset.bundle) {
        selectBundle(el.dataset.bundle.split('|'), laneOfKey(el.dataset.key), px, tapY);
        // Con el teclado, el foco pasa a la lista del grupo, que es lo que se quería ver.
        if (e.detail === 0) { const first = $('#card-list button'); if (first) first.focus(); }
      } else selectMark(el.dataset.id, px, undefined, tapY);
    });
    track.addEventListener('focusin', (e) => {
      const el = e.target.closest('.clip');
      if (el) { S.focusKey = el.dataset.key; for (const c of track.querySelectorAll('.clip[tabindex="0"]')) if (c !== el) c.tabIndex = -1; el.tabIndex = 0; }
    });
    track.addEventListener('keydown', onTrackKey);
    const wheel = (e) => {
      const r = track.getBoundingClientRect();
      const px = clamp(e.clientX - r.left, 0, W);
      if (e.ctrlKey || e.metaKey || e.altKey || e.currentTarget.id === 'ruler') {
        e.preventDefault();
        zoomAt(px, Math.exp(clamp(e.deltaY, -120, 120) * 0.0022));
      } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
        e.preventDefault();
        pan(((Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY)) / W);
      }
    };
    lanesEl.addEventListener('wheel', wheel, { passive: false });
    $('#ruler').addEventListener('wheel', wheel, { passive: false });
    $('#heads').addEventListener('click', onExpandClick);
  }
  function laneOfKey(key) { const r = RENDERED.find((q) => q.key === key); return r ? r.lane : null; }
  function onExpandClick(e) {
    const ex = e.target.closest('[data-expand]'), co = e.target.closest('[data-collapse]');
    if (ex) { S.expanded.add(ex.dataset.expand); schedule(); }
    if (co) { S.expanded.delete(co.dataset.collapse); schedule(); }
  }
  function setupRuler() {
    const ruler = $('#ruler');
    let scrub = null;
    ruler.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      scrub = e.pointerId;
      try { ruler.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
      S.t = clamp(T(e.clientX - ruler.getBoundingClientRect().left), R0, R1); schedule();
    });
    ruler.addEventListener('pointermove', (e) => {
      if (scrub !== e.pointerId) return;
      S.t = clamp(T(clamp(e.clientX - ruler.getBoundingClientRect().left, 0, W)), R0, R1); schedule();
    });
    const stop = (e) => { if (scrub === e.pointerId) scrub = null; };
    ruler.addEventListener('pointerup', stop);
    ruler.addEventListener('pointercancel', stop);
    ruler.addEventListener('keydown', (e) => {
      const st = cursorStep();
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'ArrowDown') moveCursor(-st);
      else if (k === 'ArrowRight' || k === 'ArrowUp') moveCursor(st);
      else if (k === 'PageUp') moveCursor(-10 * st);
      else if (k === 'PageDown') moveCursor(10 * st);
      else return;
      e.preventDefault();
    });
  }
  function onTrackKey(e) {
    const el = e.target.closest('.clip');
    if (!el) return;
    const k = e.key;
    if (e.shiftKey && (k === 'ArrowLeft' || k === 'ArrowRight')) { e.preventDefault(); pan(k === 'ArrowLeft' ? -0.25 : 0.25); return; }
    if (k === 'Escape') { deselect(); return; }
    const cur = RENDERED.find((r) => r.key === el.dataset.key);
    if (!cur) return;
    let next = null;
    const mid = (r) => (r.a + r.b) / 2;
    if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'Home' || k === 'End') {
      const row = RENDERED.filter((r) => r.laneIdx === cur.laneIdx && r.row === cur.row).sort((p, q) => p.a - q.a);
      const i = row.indexOf(cur);
      next = k === 'ArrowRight' ? row[i + 1] : k === 'ArrowLeft' ? row[i - 1] : k === 'Home' ? row[0] : row[row.length - 1];
    } else if (k === 'ArrowDown' || k === 'ArrowUp') {
      const order = [...new Set(RENDERED.map((r) => r.laneIdx * 1000 + r.row))].sort((p, q) => p - q);
      const i = order.indexOf(cur.laneIdx * 1000 + cur.row);
      const target = order[i + (k === 'ArrowDown' ? 1 : -1)];
      if (target != null) {
        const row = RENDERED.filter((r) => r.laneIdx * 1000 + r.row === target);
        next = row.sort((p, q) => Math.abs(mid(p) - mid(cur)) - Math.abs(mid(q) - mid(cur)))[0];
      }
    } else if (k === '+' || k === '=') { e.preventDefault(); stepScale(1); return; }
    else if (k === '-') { e.preventDefault(); stepScale(-1); return; }
    else return;
    e.preventDefault();
    if (!next) return;
    const nel = $('#track').querySelector(`.clip[data-key="${cssEsc(next.key)}"]`);
    if (nel) { el.tabIndex = -1; nel.tabIndex = 0; S.focusKey = next.key; nel.focus(); }
  }
  function setupToolbar() {
    $('#saltar').addEventListener('click', (e) => {
      e.preventDefault();
      const el = $('#track .clip[tabindex="0"]');
      if (el) el.focus();
    });
    for (const b of document.querySelectorAll('.scale-btn')) b.addEventListener('click', () => setSpan(SCALES.find((s) => s.id === b.dataset.scale).span));
    $('#saltar-regla').addEventListener('click', (e) => { e.preventDefault(); $('#ruler').focus(); });
    $('#paso-atras').addEventListener('click', () => moveCursor(-cursorStep()));
    $('#paso-adelante').addEventListener('click', () => moveCursor(cursorStep()));
    LINEA_COMUN.toolbar(document.querySelector('.tb-bar'));
    $('#ir').addEventListener('submit', (e) => {
      e.preventDefault();
      const t = LINEA_COMUN.parseDate($('#ir-fecha').value, HEB.map((h) => ({ name: h.name, s: h.s, e: h.e })));
      if (t == null) { $('#vivo').textContent = 'No entiendo esa fecha. Prueba 607 a.e.c., 33 o 14 nisán 33.'; return; }
      // «Ir a» es un mando de moverse: lleva el cursor allí y, si no se ve, la vista con él. La escala no cambia.
      S.t = clamp(t, R0, R1);
      if (X(S.t) < 0 || X(S.t) > W) S.a = S.t - 0.4 * S.span;
      clampView(); schedule();
      $('#vivo').textContent = `Cursor en ${fmtCursor(S.t)}.`;
    });
    $('#btn-antes').addEventListener('click', () => pan(-0.5));
    $('#btn-despues').addEventListener('click', () => pan(0.5));
    $('#btn-alejar').addEventListener('click', () => stepScale(-1));
    $('#btn-acercar').addEventListener('click', () => stepScale(1));
    const tema = $('#btn-tema');
    const syncTema = () => {
      const dark = document.documentElement.dataset.theme === 'oscuro';
      tema.textContent = dark ? 'Tema claro' : 'Tema oscuro';
      tema.setAttribute('aria-pressed', String(dark));
    };
    tema.addEventListener('click', () => {
      document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'oscuro' ? 'claro' : 'oscuro';
      syncTema(); renderCard(); schedule();
    });
    syncTema();
    $('#inspector').addEventListener('keydown', (e) => {
      const b = e.target.closest('.card-list button');
      if (!b || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      const all = [...b.closest('.card-list').querySelectorAll('button')];
      const n = all[all.indexOf(b) + (e.key === 'ArrowDown' ? 1 : -1)];
      if (n) { e.preventDefault(); n.focus(); }
    });
    $('#inspector').addEventListener('click', (e) => {
      const pick = e.target.closest('[data-pick]'), clear = e.target.closest('[data-clear]'), ex = e.target.closest('[data-expand]'), back = e.target.closest('[data-back]');
      if (pick) { const from = pick.dataset.from ? pick.dataset.from.split('|') : null; selectMark(pick.dataset.pick, null, from); $('#inspector').scrollTop = 0; }
      else if (clear) deselect();
      else if (ex) { S.expanded.add(ex.dataset.expand); schedule(); }
      else if (back) selectBundle(back.dataset.back.split('|'), back.dataset.lane, undefined);
    });
    document.addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('input, textarea, select')) return;
      if (e.key === 'Escape') deselect();
      else if ((e.key === '+' || e.key === '=') && !e.target.closest('.clip')) stepScale(1);
      else if (e.key === '-' && !e.target.closest('.clip')) stepScale(-1);
    });
  }
  function setMode() {
    const was = TOUCH;
    TOUCH = matchMedia('(pointer: coarse)').matches || innerWidth <= 760;
    document.documentElement.classList.toggle('touch', TOUCH);
    if (was !== TOUCH) labelCache.clear();
  }

  async function start() {
    setMode();
    readHash();
    try {
      await Promise.all(['500 12px Inter', '700 12px Inter', 'italic 500 11px Inter', '500 12.5px Inter', '700 12.5px Inter', '600 11.5px Inter', '600 12.5px "EB Garamond"']
        .map((f) => document.fonts.load(f)));
      await document.fonts.ready;
    } catch { /* sin fuentes: se mide con la del sistema */ }
    wCache.clear(); labelCache.clear();
    setupTrack(); setupRuler(); setupToolbar();
    renderCard();
    sheet();
    render();
    addEventListener('resize', () => { setMode(); labelCache.clear(); schedule(); });
    // Para las pruebas en el navegador: estado y piezas pintadas, sin tocar nada.
    window.__lanes = {
      state: () => ({ t: S.t, a: S.a, span: S.span, sel: S.sel && (S.sel.id || S.sel.ids), W }),
      stats: () => lastStats,
      layout: () => LAYOUT.map((L) => ({ lane: L.lane.id, rows: L.rows, need: L.need, grouped: L.grouped, bundles: L.bundles })),
      go: (t, span) => { S.t = t; S.span = span; S.a = t - 0.4 * span; clampView(); render(); },
      goA: (a, span, t) => { S.a = a; S.span = span; if (t != null) S.t = t; clampView(); render(); },
    };
  }
  start();
})();
