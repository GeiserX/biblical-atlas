/* Grupos que se abren: prototipo de la línea de tiempo.
   Donde las marcas no caben con su nombre, la franja las junta en un grupo: empieza por el tramo más fino del
   calendario que se ve a esta escala (un día, un mes, un año...) y, donde ni así caben, junta el tramo con lo que tiene
   a su izquierda. El grupo dice cuántas son, de cuándo y cómo se llaman las primeras, y se abre encima de la franja con
   todos los nombres, sin mover nada ni cambiar la escala.
   Reglas de un clic sobre una marca: la elige, no cambia la escala, no mueve la vista, y el cursor solo se mueve si
   estaba fuera de la marca (al punto más cercano de la marca que se ve). Datos: ../datos.js (window.TIMELINE_DATA). */
(() => {
  'use strict';

  const D = window.TIMELINE_DATA;
  const DAY = D.day;
  const T_MIN = D.range[0], T_MAX = D.range[1] + 1;
  const FULL = T_MAX - T_MIN;
  const SPAN_MIN = D.spanMin || 0.03, SPAN_MAX = 4400;
  const SCALES = D.scales;

  // Medidas de la franja, en px. Una fila mide 48: la marca 44 (el mínimo de un blanco táctil) y 4 de aire.
  const ROW = 48, HEAD = 18, GAP = 10, MAX_SINGLES = 3, SLACK = 6;
  // Tramos del calendario con que se agrupa, del más fino al más grueso.
  const LADDER = [DAY, 2 * DAY, 7 * DAY, 1 / 12, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000];

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dot = (s) => (/[.:!?]$/.test(s) ? s : s + '.');

  // ---------------------------------------------------------------------------
  // Fechas
  // ---------------------------------------------------------------------------
  const MES = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'];
  const yearLabel = (y) => (y > 0 ? `${y} e.c.` : `${1 - y} a.e.c.`);
  function yearsRange(a, b) {
    const ya = Math.floor(a), yb = Math.floor(Math.max(a, b - 1e-6));
    if (ya === yb) return yearLabel(ya);
    if (ya > 0) return `${ya}-${yb} e.c.`;
    if (yb <= 0) return `${1 - ya}-${1 - yb} a.e.c.`;
    return `${1 - ya} a.e.c.-${yb} e.c.`;
  }
  // Meses hebreos de los años que trae el calendario, en orden.
  const MONTHS = [];
  for (const y of Object.values(D.calendar.years)) for (const [id, name, a, b] of y.months) MONTHS.push({ id, name: name.toLowerCase(), a, b });
  MONTHS.sort((p, q) => p.a - q.a);
  function monthAt(t) {
    let lo = 0, hi = MONTHS.length - 1, r = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (MONTHS[m].a <= t) { r = m; lo = m + 1; } else hi = m - 1; }
    return r >= 0 && t < MONTHS[r].b ? MONTHS[r] : null;
  }
  function hebrew(t) {
    const m = monthAt(t);
    if (!m) return null;
    return { m, d: Math.floor((t - m.a) / DAY + 1e-6) + 1, y: Math.floor(t) };
  }
  /** Fecha de un instante con la finura que pide la escala: 'dia', 'mes' o 'anio'. */
  function dateAt(t, fine) {
    const y = Math.floor(t);
    if (fine === 'anio') return yearLabel(y);
    const h = hebrew(t);
    if (fine === 'dia') return h ? `${h.d} ${h.m.name} ${yearLabel(y)}` : `${MES[clamp(Math.floor((t - y) * 12), 0, 11)]} ${yearLabel(y)}`;
    return h ? `${h.m.name} ${yearLabel(y)}` : `${MES[clamp(Math.floor((t - y) * 12), 0, 11)]} ${yearLabel(y)}`;
  }
  const fineness = (span) => (span <= 0.6 ? 'dia' : span <= 3 ? 'mes' : 'anio');
  /** Fechas de un grupo: «49-50 e.c.», «nisán 33 e.c.», «8-14 nisán 33 e.c.». */
  function rangeText(a, b) {
    const bb = Math.max(a, b - 1e-7);
    if (bb - a < 0.4) {
      const ha = hebrew(a + 1e-7), hb = hebrew(bb);
      if (ha && hb) {
        if (ha.m === hb.m) return ha.d === hb.d ? `${ha.d} ${ha.m.name} ${yearLabel(ha.y)}` : `${ha.d}-${hb.d} ${ha.m.name} ${yearLabel(hb.y)}`;
        return `${ha.d} ${ha.m.name}-${hb.d} ${hb.m.name} ${yearLabel(hb.y)}`;
      }
    }
    return yearsRange(a, b);
  }

  // ---------------------------------------------------------------------------
  // Marcas
  // ---------------------------------------------------------------------------
  const BANDS = [
    { id: 'epocas', name: 'Eras e imperios', weight: 1, cap: 3 },
    { id: 'pablo', name: 'Pablo y sus cartas', weight: 2, cap: 4 },
    { id: 'sucesos', name: 'Sucesos', weight: 6, cap: 16 },
    { id: 'gobierno', name: 'Reyes y gobernantes', weight: 1, cap: 3 },
  ];
  const bandOf = (m) => (m.kind === 'period' ? 'epocas' : m.kind === 'ruler' ? 'gobierno' : m.kind === 'event' ? 'sucesos' : 'pablo');
  const RULER_WORDS = {
    rey: ['rey', 'reyes'], emperador: ['emperador', 'emperadores'], gobernador: ['gobernador', 'gobernadores'],
    'sumo-sacerdote': ['sumo sacerdote', 'sumos sacerdotes'],
  };
  function nouns(m) {
    switch (m.kind) {
      case 'event': return ['suceso', 'sucesos'];
      case 'stop': return ['parada', 'paradas'];
      case 'letter': return ['carta', 'cartas'];
      case 'journey': return ['viaje', 'viajes'];
      case 'period': return m.type === 'era' ? ['era', 'eras'] : ['imperio', 'imperios'];
      default: return RULER_WORDS[m.type] || ['gobernante', 'gobernantes'];
    }
  }
  const RULER_LANE = {
    'reyes-jerusalen': 'Rey en Jerusalén', 'reyes-samaria': 'Rey en Samaria y Tirzá', 'reyes-persia': 'Rey de Persia y Babilonia',
    emperadores: 'Emperador de Roma', gobernadores: 'Gobernador', sacerdotes: 'Sumo sacerdote',
  };
  function kindLabel(m) {
    switch (m.kind) {
      case 'event': return 'Suceso';
      case 'stop': return 'Parada de un viaje';
      case 'journey': return 'Viaje de Pablo';
      case 'letter': return 'Carta';
      case 'period': return m.type === 'era' ? 'Era' : 'Imperio';
      default: return RULER_LANE[m.lane] || 'Gobernante';
    }
  }
  const SHORT_KIND = { stop: 'Parada', journey: 'Viaje', letter: 'Carta' };
  const JOURNEYS = D.marks.filter((m) => m.kind === 'journey').map((m) => m.id);
  function colorOf(m) {
    if (m.kind === 'event') return 'var(--gold)';
    if (m.kind === 'journey') return `var(--v${JOURNEYS.indexOf(m.id) % 8})`;
    if (m.kind === 'stop') return `var(--v${Math.max(0, JOURNEYS.indexOf(m.journey)) % 8})`;
    if (m.kind === 'letter') return 'var(--tier2)';
    if (m.kind === 'period') {
      if (m.type === 'era') return 'var(--node-periodo)';
      const n = m.name;
      return /Egipto/.test(n) ? 'var(--emp-egipto)' : /Asiria/.test(n) ? 'var(--emp-asiria)' : /Babilonia/.test(n) ? 'var(--emp-babilonia)'
        : /Medopersia/.test(n) ? 'var(--emp-persia)' : /Grecia/.test(n) ? 'var(--emp-grecia)' : 'var(--emp-roma)';
    }
    return { rey: 'var(--accent)', emperador: 'var(--emp-roma)', gobernador: 'var(--secular)', 'sumo-sacerdote': 'var(--emp-grecia)' }[m.type] || 'var(--accent)';
  }
  const DOUBT = /antes|después|hasta|desde|quizás|\?| o \d/;
  function compactDate(m) {
    const c = m.certainty === 'approx' || m.certainty === 'computed' ? 'c. ' : '';
    const span = m.b - m.a;
    if (m.precision === 'day' && span < 0.02) { const h = hebrew(m.a + 1e-6); if (h) return `${c}${h.d} ${h.m.name} ${yearLabel(h.y)}`; }
    if ((m.precision === 'month' || m.precision === 'day') && span < 0.2) { const h = hebrew(m.a + DAY / 2); if (h) return `${c}${h.m.name} ${yearLabel(h.y)}`; }
    return c + yearsRange(m.a, m.b);
  }
  const MARKS = D.marks.map((m, i) => {
    const x = Object.assign({}, m);
    x.a = m.start; x.b = Math.max(m.end, m.start); x.i = i;
    x.band = bandOf(m);
    x.color = colorOf(m);
    x.words = nouns(m);
    const date = m.date.length > 30 ? compactDate(x) : m.date;
    x.extra = m.certainty === 'computed' ? 'calculada' : m.certainty === 'uncertain' && !DOUBT.test(date) ? 'incierta' : '';
    x.line2 = (m.kind in SHORT_KIND || m.kind === 'period' ? `${SHORT_KIND[m.kind] || kindLabel(m)} · ` : m.kind === 'ruler' ? `${kindLabel(m)} · ` : '') + date;
    x.aria = dot(`${m.name}. ${kindLabel(m)}, ${date}${x.extra ? ', ' + x.extra : ''}`);
    return x;
  });
  const BY_ID = new Map(MARKS.map((m) => [m.id, m]));

  // ---------------------------------------------------------------------------
  // Medir texto (el lienzo mide con la misma letra que pinta la página)
  // ---------------------------------------------------------------------------
  const ctx = document.createElement('canvas').getContext('2d');
  const F_NAME = '600 12.5px Inter', F_DATE = '400 11.5px Inter', F_GT = '700 11.5px Inter', F_GN = '400 11.5px Inter';
  const widths = new Map();
  function tw(text, font) {
    const k = font + '|' + text;
    let w = widths.get(k);
    if (w == null) { ctx.font = font.replace(/Inter$/, 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif'); w = ctx.measureText(text).width * 1.03 + 1; widths.set(k, w); }
    return w;
  }
  function wrap(text, font, maxW) {
    const words = text.split(' '), lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (cur && tw(t, font) > maxW) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // ---------------------------------------------------------------------------
  // Estado y dirección
  // ---------------------------------------------------------------------------
  const S = { t: 50.5, span: 8, v0: 50.5 - 3.2, sel: null, open: null, tema: 'claro', focusKey: null, hover: null, note: null };
  const franja = $('#franja'), lienzo = $('#lienzo'), regla = $('#regla'), ficha = $('#ficha');
  let W = 1000, H = 400;

  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    const num = (k) => (p.has(k) && isFinite(+p.get(k)) ? +p.get(k) : null);
    const t = num('t');
    if (t != null) S.t = clamp(t, T_MIN, T_MAX);
    const sc = SCALES.find((s) => s.id === p.get('escala'));
    const span = num('escala');
    S.span = clamp(sc ? sc.span : span != null ? span : S.span, SPAN_MIN, SPAN_MAX);
    const v = num('desde');
    S.v0 = v != null ? v : S.t - 0.4 * S.span;
    if (p.get('sel') && BY_ID.has(p.get('sel'))) S.sel = p.get('sel');
    if (p.get('grupo')) S.open = p.get('grupo');
    S.tema = LINEA_COMUN.theme();
    clampView();
  }
  let hashTimer = 0;
  function writeHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => {
      const p = new URLSearchParams();
      p.set('t', S.t.toFixed(5));
      const sc = SCALES.find((s) => Math.abs(s.span - S.span) < 1e-9);
      p.set('escala', sc ? sc.id : S.span.toPrecision(5));
      p.set('desde', S.v0.toFixed(5));
      if (S.sel) p.set('sel', S.sel);
      p.set('tema', S.tema);
      if (S.open) p.set('grupo', S.open);
      history.replaceState(null, '', '#' + p.toString());
    }, 120);
  }
  function clampView() {
    if (S.span >= FULL) S.v0 = T_MIN - (S.span - FULL) / 2;
    else S.v0 = clamp(S.v0, T_MIN, T_MAX - S.span);
  }
  const px = (t) => (t - S.v0) * W / S.span;
  const tAt = (x) => S.v0 + x / W * S.span;

  // ---------------------------------------------------------------------------
  // Geometría de una marca suelta y de un grupo
  // ---------------------------------------------------------------------------
  const maxText = () => Math.min(380, W - 48);
  function singleGeom(m) {
    const x0 = px(m.a), x1 = px(m.b);
    const moment = x1 - x0 < 12;
    const left = moment ? x0 - 9 : Math.max(x0, 0);
    const padX = moment ? 16 + 8 : 16;
    const lines = tw(m.name, F_NAME) + 14 > maxText() ? wrap(m.name, F_NAME, maxText() - 14) : [m.name];
    const iconW = m.kind === 'letter' || m.kind === 'stop' ? 16 : 0;
    const nameW = Math.max(...lines.map((l) => tw(l, F_NAME))) + iconW;
    const dateW = tw(m.line2 + (m.extra ? ' · ' + m.extra : ''), F_DATE);
    const textW = padX + Math.max(nameW, dateW) + SLACK;
    let width = Math.max(textW, moment ? 0 : x1 - left);
    // Cerca del borde derecho el nombre no se sale: la caja se apoya en el borde y el punto o la barra siguen en su fecha.
    let flip = false;
    if (x0 <= W + 0.5 && left + textW > W && textW < W) {
      const nl = W - textW - 1;
      if (moment) { flip = true; return { left: Math.max(0, x0 + 9 - textW), width: textW, rows: lines.length > 1 ? 2 : 1, lines, moment, x0, x1, flip }; }
      return { left: Math.max(0, nl), width: Math.max(textW, x1 - Math.max(0, nl)), rows: lines.length > 1 ? 2 : 1, lines, moment, x0, x1, flip };
    }
    return { left, width, rows: lines.length > 1 ? 2 : 1, lines, moment, x0, x1, flip };
  }
  function groupTitle(ms) {
    const counts = new Map();
    for (const m of ms) { const k = m.words[0]; const c = counts.get(k) || { n: 0, w: m.words }; c.n++; counts.set(k, c); }
    const parts = [...counts.values()].map((c) => `${c.n} ${c.n === 1 ? c.w[0] : c.w[1]}`);
    const what = parts.length === 1 ? parts[0] : parts.slice(0, -1).join(', ') + ' y ' + parts[parts.length - 1];
    let a = Infinity, b = -Infinity;
    for (const m of ms) { a = Math.min(a, m.a); b = Math.max(b, m.b); }
    return `${what} · ${rangeText(a, b)}`;
  }
  function fitNames(ms, inner) {
    let line = '', count = 0;
    for (const m of ms) {
      const cand = count ? line + ' · ' + m.name : m.name;
      const rest = ms.length - count - 1;
      const more = rest > 0 ? ` y ${rest} más` : '';
      if (tw(cand + more, F_GN) <= inner) { line = cand; count++; } else break;
    }
    return { line, count, more: ms.length - count > 0 ? ` y ${ms.length - count} más` : '' };
  }
  const BAND_NOUN = { epocas: ['eras e imperios'], pablo: ['viajes, paradas y cartas'], gobierno: ['gobernantes'], sucesos: ['sucesos'] };
  function groupGeom(ms) {
    let a = Infinity, b = -Infinity;
    for (const m of ms) { a = Math.min(a, m.a); b = Math.max(b, m.b); }
    const left = Math.max(px(a) - 2, 0);
    const PAD = 8 + 30 + SLACK;
    const innerMax = Math.min(380, W - 16 - PAD);
    // El título dice cuántas y de cuándo. Si mezcla muchas clases y no cabe, dice la clase de la banda.
    let title = groupTitle(ms);
    if (tw(title, F_GT) > innerMax) title = `${ms.length} ${BAND_NOUN[ms[0].band][0]} · ${rangeText(a, b)}`;
    const titleLines = tw(title, F_GT) > innerMax ? wrap(title, F_GT, innerMax) : [title];
    const titleW = Math.max(...titleLines.map((l) => tw(l, F_GT)));
    let inner = clamp(Math.max(titleW, 230), 150, innerMax);
    let names = fitNames(ms, inner), lines = null;
    if (!names.count) { inner = innerMax; names = fitNames(ms, inner); }
    let textW;
    if (names.count) textW = Math.max(titleW, tw(names.line + names.more, F_GN));
    else {
      // Ni el primer nombre cabe en una línea: va entero en dos, y el grupo ocupa dos filas.
      lines = wrap(ms[0].name + (ms.length > 1 ? ` y ${ms.length - 1} más` : ''), F_GN, inner);
      textW = Math.max(titleW, ...lines.map((l) => tw(l, F_GN)));
    }
    const width = Math.min(textW + PAD, W - 4);
    const x0 = px(a);
    const rows = titleLines.length + (lines ? lines.length : 1) > 2 ? 2 : 1;
    return { left: x0 <= W + 0.5 ? Math.max(0, Math.min(left, W - width - 1)) : left, width, rows, title, titleLines, names, lines };
  }

  // ---------------------------------------------------------------------------
  // Reparto en filas: primero lo que cabe suelto con su nombre, después grupos por tramo del calendario
  // ---------------------------------------------------------------------------
  function fits(rows, r, h, L, R) {
    for (let j = r; j < r + h; j++) for (const [p, q] of rows[j]) if (L < q + GAP && R + GAP > p) return false;
    return true;
  }
  /** Reparte una banda en R filas. Primero lo largo a esta escala, suelto; después lo que ya estaba en curso en el
      borde izquierdo, con su nombre clavado a la izquierda; y el resto por tramos del calendario, de izquierda a
      derecha: donde hay sitio, sueltas con su nombre; donde se amontonan, un grupo; y si ni el grupo cabe, se junta con
      lo que tiene a su izquierda hasta que cabe. */
  function layoutBand(band, items, R) {
    if (band.id === 'epocas') return layoutEras(items, R);
    const k = W / S.span;
    let ls = LADDER.findIndex((s) => s * k >= 14);
    if (ls < 0) ls = LADDER.length - 1;
    const rows = Array.from({ length: R }, () => []);
    const release = (el) => { for (const [j, c] of el.cells) { const a = rows[j], i = a.indexOf(c); if (i >= 0) a.splice(i, 1); } };
    const put = (el, force) => {
      const h = el.g.rows, L = el.g.left, Rr = L + el.g.width;
      let r = -1;
      for (let q = 0; q + h <= R; q++) if (fits(rows, q, h, L, Rr)) { r = q; break; }
      if (r < 0) { if (!force) return false; el.g.rows = 1; r = 0; }
      el.row = r; el.cells = [];
      for (let j = r; j < r + el.g.rows; j++) { const c = [L, Rr]; rows[j].push(c); el.cells.push([j, c]); }
      return true;
    };
    const singles = (ms) => {
      const placed = [];
      for (const m of ms) {
        const el = { type: 'single', m, g: singleGeom(m), key: 'm:' + m.id };
        if (!put(el)) { placed.forEach(release); return null; }
        placed.push(el);
      }
      return placed;
    };
    const group = (ms, key, li, force) => {
      const el = { type: 'group', ms, g: groupGeom(ms), key, size: LADDER[li] };
      return put(el, force) ? el : null;
    };
    const out = [];
    // Último recurso: si un grupo no cabe en ninguna fila, se traga las marcas largas que le quitan el sitio.
    const forceGroup = (ms, key) => {
      const probe = groupGeom(ms);
      const L = probe.left, Rr = L + probe.width;
      const eaten = out.filter((el) => el.type === 'single' && longs.has(el.m) && el.g.left < Rr + GAP && el.g.left + el.g.width + GAP > L);
      for (const el of eaten) { release(el); out.splice(out.indexOf(el), 1); longs.delete(el.m); }
      const all = eaten.map((el) => el.m).concat(ms).sort((p, q) => p.a - q.a);
      return group(all, key, ls, false) || group(all, key, ls, true);
    };
    // 0. Lo largo a esta escala (una era, un reinado, un viaje) es la estructura: va suelto con su nombre si cabe,
    //    sin tocar la última fila, que queda para los grupos.
    const longMin = Math.max(120, W * 0.12);
    const longs = new Set();
    if (R >= 2) {
      const cand = items.filter((m) => px(m.b) - Math.max(0, px(m.a)) >= longMin && px(m.a) < W).sort((p, q) => (q.b - q.a) - (p.b - p.a));
      for (const m of cand) {
        const el = { type: 'single', m, g: singleGeom(m), key: 'm:' + m.id };
        if (el.g.rows > 1) continue;
        let r = -1;
        for (let q = 0; q < R - 1; q++) if (fits(rows, q, 1, el.g.left, el.g.left + el.g.width)) { r = q; break; }
        if (r < 0) continue;
        el.row = r; el.cells = [[r, [el.g.left, el.g.left + el.g.width]]]; rows[r].push(el.cells[0][1]);
        out.push(el); longs.add(m);
      }
    }
    const pre = items.filter((m) => m.a < S.v0 && !longs.has(m)).sort((p, q) => q.b - p.b);
    const rest = items.filter((m) => m.a >= S.v0 && !longs.has(m)).sort((p, q) => p.a - q.a || q.b - p.b);
    let preGroup = null;
    // 1. Lo que ya estaba en curso
    if (pre.length) {
      const room = R - (rest.length ? 1 : 0);
      const asSingles = pre.length <= room ? pre : pre.slice(0, Math.max(0, room - 1));
      const preOut = [];
      for (const m of asSingles) { const s1 = singles([m]); if (!s1) break; preOut.push(...s1); }
      const left = pre.filter((m) => !preOut.some((e) => e.m === m)).sort((p, q) => p.a - q.a);
      if (left.length) {
        let g = group(left, `g:${band.id}:antes`, ls, false);
        if (!g) { preOut.forEach(release); preOut.length = 0; g = group(pre.slice().sort((p, q) => p.a - q.a), `g:${band.id}:antes`, ls, false) || forceGroup(pre.slice(), `g:${band.id}:antes`); }
        preGroup = g;
      }
      out.push(...preOut);
    }
    // 2. El resto, de izquierda a derecha, por el tramo más fino del calendario. Si un tramo no cabe ni suelto ni en
    //    grupo, se junta con lo que tiene a su izquierda (que es lo que le quita el sitio) hasta que cabe.
    const bucket = (m) => Math.floor(m.a / LADDER[ls]);
    const stack = [];
    // Al deshacer algo para juntarlo con lo de su derecha, sus marcas que no son de «rest» (lo que ya estaba en curso,
    // las largas que un grupo se tragó) vuelven con el tramo: ninguna marca se pierde por el camino.
    const inRest = new Set(rest);
    const carryOf = (el) => (el.type === 'group' ? el.ms : [el.m]).filter((m) => !inRest.has(m));
    let i = 0;
    while (i < rest.length) {
      const key = bucket(rest[i]);
      let s = i, e = i;
      while (e < rest.length && bucket(rest[e]) === key) e++;
      let merged = false;
      let carry = [];
      for (;;) {
        const ms = carry.concat(rest.slice(s, e));
        let placed = !merged && ms.length <= MAX_SINGLES ? singles(ms) : null;
        if (!placed && (ms.length > 1 || !stack.length)) { const g = group(ms, `g:${band.id}:${rest[s].id}`, ls, false); if (g) placed = [g]; }
        if (!placed && !stack.length) {
          // Nada a la izquierda con que juntarse salvo lo que ya estaba en curso: se juntan con ello.
          if (preGroup) { release(preGroup); const g = group(preGroup.ms.concat(ms), `g:${band.id}:antes`, ls, false) || forceGroup(preGroup.ms.concat(ms), `g:${band.id}:antes`); preGroup = null; g.range = [s, e]; stack.push(g); i = e; break; }
          placed = [forceGroup(ms, `g:${band.id}:${rest[s].id}`)];
        }
        if (placed) { for (const el of placed) { el.range = [s, e]; stack.push(el); } i = e; break; }
        do { const el = stack.pop(); release(el); carry = carryOf(el).concat(carry); s = Math.min(s, el.range[0]); } while (stack.length && stack[stack.length - 1].range[1] > s);
        merged = true;
      }
    }
    if (preGroup) out.push(preGroup);
    out.push(...stack);
    // Red de seguridad: una marca de la ventana que no quedó en ninguna pieza ni en ningún grupo se une al grupo más
    // cercano en el tiempo (o forma uno), y el grupo la nombra en su lista.
    const drawn = new Set();
    for (const el of out) for (const m of el.type === 'group' ? el.ms : [el.m]) drawn.add(m);
    const missing = items.filter((m) => !drawn.has(m));
    if (missing.length) {
      const groups = out.filter((el) => el.type === 'group');
      for (const m of missing) {
        if (!groups.length) { const g = group([m], `g:${band.id}:${m.id}`, ls, false) || group([m], `g:${band.id}:${m.id}`, ls, true); out.push(g); groups.push(g); continue; }
        const near = groups.reduce((b, g) => { const d = Math.min(...g.ms.map((x) => Math.abs(x.a - m.a))); return d < b.d ? { g, d } : b; }, { g: groups[0], d: Infinity }).g;
        near.ms.push(m); near.ms.sort((p, q) => p.a - q.a);
        const left = near.g.left;
        near.g = groupGeom(near.ms); near.g.left = left;
      }
    }
    return { out, rows: R };
  }
  /** Las eras y los imperios no se agrupan nunca: cada uno va suelto con su nombre, en tantas filas como pidan. */
  function layoutEras(items, R) {
    const rows = [];
    const out = [];
    // Las filas se deciden con la caja entera de cada una (sin recortarla en el borde de la pantalla): así no cambian
    // al arrastrar, porque arrastrar solo traslada todas las cajas a la vez.
    for (const m of items.slice().sort((p, q) => p.a - q.a || (q.b - q.a) - (p.b - p.a))) {
      const el = { type: 'single', m, g: singleGeom(m), key: 'm:' + m.id };
      const x0 = px(m.a), x1 = px(m.b), textW = el.g.width - (el.g.moment ? 0 : Math.max(0, px(m.b) - el.g.left - el.g.width));
      const h = el.g.rows, L = el.g.moment ? x0 - 9 : x0, Rr = Math.max(x1, L + textW);
      let r = 0;
      for (;; r++) {
        while (rows.length < r + h) rows.push([]);
        if (fits(rows, r, h, L, Rr)) break;
      }
      el.row = r;
      for (let j = r; j < r + h; j++) rows[j].push([L, Rr]);
      out.push(el);
    }
    return { out, rows: Math.max(R, rows.length) };
  }
  /** Cuántas filas pediría una banda si todo fuera suelto (con tope): sirve para repartir el alto. */
  function need(items, cap) {
    const rows = [];
    for (const m of items.slice().sort((p, q) => p.a - q.a)) {
      const g = singleGeom(m);
      let placed = false;
      for (const r of rows) if (r.end + GAP <= g.left) { r.end = g.left + g.width; placed = true; break; }
      if (!placed) { rows.push({ end: g.left + g.width }); if (rows.length >= cap) return cap; }
    }
    return rows.length;
  }

  // ---------------------------------------------------------------------------
  // Pintar
  // ---------------------------------------------------------------------------
  let LAYOUT = null;
  const ICONS = {
    letter: '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="1" y="2.5" width="10" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M1.5 3.2 6 6.6l4.5-3.4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    stop: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 11.2S2 7.4 2 4.8a4 4 0 0 1 8 0c0 2.6-4 6.4-4 6.4z" fill="currentColor"/><circle cx="6" cy="4.8" r="1.5" fill="#fff"/></svg>',
  };
  function glyph(m, wPx, leftPx) {
    // Un momento es un punto; lo que dura, una barra. Hueco: calculado por nosotros. Borde que se difumina: «c.».
    // Un «?»: incierto. La palabra de la fecha dice lo mismo, para no depender del dibujo ni del color.
    if (wPx == null) {
      const cls = m.certainty === 'computed' ? 'punto punto--hueco' : m.certainty === 'approx' ? 'punto punto--aprox' : m.certainty === 'uncertain' ? 'punto punto--duda' : 'punto';
      return `<span class="${cls}"></span>`;
    }
    const fade = Math.min(16, wPx * 0.3);
    let mask = '';
    let q = '';
    if (m.certainty === 'approx') mask = `linear-gradient(90deg,transparent 0,#000 ${fade}px,#000 calc(100% - ${fade}px),transparent 100%)`;
    if (m.certainty === 'uncertain') {
      const long = Math.min(60, wPx * 0.4);
      if (m.openEnd === 'end') { mask = `linear-gradient(90deg,#000 0,#000 calc(100% - ${long}px),transparent 100%)`; q = `<span class="riel-duda" style="left:${(leftPx + wPx - 14).toFixed(1)}px"></span>`; }
      else if (m.openEnd === 'start') { mask = `linear-gradient(90deg,transparent 0,#000 ${long}px,#000 100%)`; q = `<span class="riel-duda" style="left:${(leftPx).toFixed(1)}px"></span>`; }
      else { mask = `linear-gradient(90deg,transparent 0,#000 ${fade}px,#000 calc(100% - ${fade}px),transparent 100%)`; q = `<span class="riel-duda" style="left:${(leftPx).toFixed(1)}px"></span>`; }
    }
    const cls = m.certainty === 'computed' ? 'riel riel--hueco' : 'riel';
    const st = `left:${leftPx.toFixed(1)}px;width:${Math.max(2, wPx).toFixed(1)}px;${mask ? `-webkit-mask-image:${mask};mask-image:${mask};` : ''}`;
    return `<span class="${cls}" style="${st}"></span>${q}`;
  }
  function singleHTML(e) {
    const { m, g } = e;
    const icon = ICONS[m.kind] ? `<span class="marca__icono">${ICONS[m.kind]}</span>` : '';
    const rail = g.moment ? glyph(m, null) : glyph(m, g.x1 - g.x0, g.x0 - g.left - 1);
    return `<span class="marca__nombre">${icon}${esc(g.lines.join('\n'))}</span><span class="marca__fecha">${esc(m.line2)}${m.extra ? ` · <b>${m.extra}</b>` : ''}</span>${rail}`;
  }
  function groupHTML(e) {
    const { g, ms } = e;
    const ticks = new Map();
    for (const m of ms) {
      const x = Math.round(px(m.a) - g.left);
      if (x < -2 || x > g.width) continue;
      if (!ticks.has(x) || m.id === S.sel) ticks.set(x, m);
    }
    const tk = [...ticks].map(([x, m]) => `<i style="left:${x}px;--c:${m.color}"${m.id === S.sel ? ' class="elegida"' : ''}></i>`).join('');
    const names = g.lines ? esc(g.lines.join('\n')) : `${esc(g.names.line)}<span class="grupo__mas">${esc(g.names.more)}</span>`;
    return `<span class="grupo__titulo">${esc(g.titleLines.join('\n'))}</span><span class="grupo__nombres">${names}</span><span class="grupo__abrir" aria-hidden="true"><svg viewBox="0 0 10 10" width="10" height="10"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="grupo__marcas">${tk}</span>`;
  }
  function groupAria(e) {
    const { g, ms } = e;
    const shown = ms.slice(0, Math.max(1, g.names.count || 1)).map((m) => m.name).join(', ');
    const more = ms.length - Math.max(1, g.names.count || 1);
    return `Grupo: ${dot(g.title)} ${dot(`${shown}${more > 0 ? ` y ${more} más` : ''}`)} ${S.open === e.key ? 'Abierto.' : 'Pulsa para abrirlo.'}`;
  }

  const nodes = new Map();   // clave → elemento del lienzo
  function upsert(key, tag, cls, attrs, html, sig) {
    let el = nodes.get(key);
    if (!el) {
      el = document.createElement(tag);
      el.dataset.k = key;
      nodes.set(key, el);
      lienzo.appendChild(el);
    }
    if (el.className !== cls) el.className = cls;
    for (const [k, v] of Object.entries(attrs)) if (el.getAttribute(k) !== String(v)) el.setAttribute(k, v);
    if (el._sig !== sig) { el.innerHTML = html; el._sig = sig; }
    el._live = true;
    return el;
  }

  function render() {
    W = lienzo.clientWidth; H = lienzo.clientHeight;
    clampView();
    const v1 = S.v0 + S.span, ext = S.v0 + S.span * 1.25;
    const perBand = new Map(BANDS.map((b) => [b.id, []]));
    const visible = new Map(BANDS.map((b) => [b.id, 0]));
    for (const m of MARKS) {
      if (m.b < S.v0 || m.a > ext) continue;
      perBand.get(m.band).push(m);
      if (m.a <= v1) visible.set(m.band, visible.get(m.band) + 1);
    }
    // Mientras se arrastra, el reparto de filas entre las bandas se congela: ninguna banda cambia de alto ni desaparece,
    // así que lo que queda en pantalla no sube ni baja. Al soltar se reparte otra vez.
    const present = BANDS.filter((b) => visible.get(b.id) > 0 || (holdAlloc && holdAlloc.has(b.id)));
    const total = Math.max(present.length, Math.floor((H - present.length * HEAD - 4) / ROW));
    const alloc = new Map(present.map((b) => [b.id, 1]));
    const needs = new Map(present.map((b) => [b.id, need(perBand.get(b.id), b.id === 'epocas' ? Infinity : b.cap)]));
    // Las eras y los imperios se llevan primero todas las filas que piden: nunca se agrupan.
    if (alloc.has('epocas')) alloc.set('epocas', Math.max(1, needs.get('epocas')));
    let left = total - [...alloc.values()].reduce((a, b) => a + b, 0);
    if (holdAlloc && holdAlloc.size) { for (const b of present) alloc.set(b.id, holdAlloc.get(b.id) || 1); left = 0; }
    while (left > 0) {
      // Cada fila de más va a la banda que la pide con más peso por fila que ya tiene: nadie se lo queda todo.
      let best = null, bestScore = 0;
      for (const b of present) { if (needs.get(b.id) <= alloc.get(b.id)) continue; const s = b.weight / alloc.get(b.id); if (s > bestScore) { bestScore = s; best = b; } }
      if (!best) break;
      alloc.set(best.id, alloc.get(best.id) + 1); left--;
    }

    const elements = [];
    const heads = [];
    let y = 0;
    for (const b of present) {
      const res = layoutBand(b, perBand.get(b.id), alloc.get(b.id));
      let R = res.rows;
      if (holdAlloc) { R = Math.max(R, holdAlloc.get(b.id) || 0); holdAlloc.set(b.id, R); }
      const groups = res.out.filter((e) => e.type === 'group' && e.g.left < W);
      const singles = res.out.filter((e) => e.type === 'single' && e.g.left < W && e.g.left + e.g.width > 0);
      // La cabecera cuenta lo que se dibuja de la ventana: piezas sueltas y miembros de grupos.
      const inWin = new Set();
      for (const e of res.out) for (const m of e.type === 'group' ? e.ms : [e.m]) if (m.b >= S.v0 && m.a <= v1) inWin.add(m);
      heads.push({ b, y, n: inWin.size, groups: groups.length, singles: singles.length });
      for (const e of res.out) {
        if (e.g.left >= W || e.g.left + e.g.width <= 0) continue;
        e.band = b.id; e.top = y + HEAD + e.row * ROW; e.rowIndex = e.row; e.bandTop = y;
        elements.push(e);
      }
      y += HEAD + R * ROW;
    }
    LAYOUT = { elements, heads };

    for (const el of nodes.values()) el._live = false;
    // Cabeceras de banda
    for (const h of heads) {
      const cnt = `${h.n} en la ventana${h.groups ? ` · ${h.groups} ${h.groups === 1 ? 'grupo' : 'grupos'}` : ''}`;
      upsert('h:' + h.b.id, 'div', 'banda-cabeza', { style: `top:${h.y}px`, 'aria-hidden': 'true' }, `<span>${esc(h.b.name)} <i>· ${esc(cnt)}</i></span>`, cnt);
    }
    // Rejilla (la misma que las marcas de la regla)
    const tks = ticks();
    tks.forEach((tk, i) => { if (tk.major || tks.length < 40) upsert('r:' + i, 'div', 'rejilla', { style: `left:${tk.x.toFixed(1)}px`, 'aria-hidden': 'true' }, '', ''); });

    const openEl = elements.find((e) => e.key === S.open);
    if (S.open && !openEl) S.open = null;
    for (const e of elements) {
      const st = `left:${e.g.left.toFixed(1)}px;top:${e.top}px;width:${e.g.width.toFixed(1)}px;--c:${e.type === 'single' ? e.m.color : 'var(--ink-3)'}`;
      if (e.type === 'single') {
        const cls = `marca${e.g.moment ? (e.g.flip ? ' marca--instante marca--derecha' : ' marca--instante') : ''}${e.g.rows > 1 ? ' marca--alta' : ''}`;
        const sig = `${e.g.lines.join('|')}|${e.g.moment}|${(e.g.x0 - e.g.left).toFixed(1)}|${(e.g.x1 - e.g.x0).toFixed(1)}`;
        upsert(e.key, 'button', cls, { type: 'button', style: st, 'aria-pressed': S.sel === e.m.id ? 'true' : 'false', 'aria-label': e.m.aria, tabindex: '-1' }, singleHTML(e), sig);
      } else {
        const has = e.ms.some((m) => m.id === S.sel);
        const cls = `grupo${e.g.rows > 1 ? ' grupo--alta' : ''}${has ? ' grupo--con-elegida' : ''}`;
        const sig = `${e.g.titleLines.join('|')}|${e.g.names.line}|${e.g.lines}|${S.sel}|${e.g.width.toFixed(0)}|${e.ms.map((m) => Math.round(px(m.a) - e.g.left)).join(',')}`;
        upsert(e.key, 'button', cls, { type: 'button', style: st, 'aria-expanded': S.open === e.key ? 'true' : 'false', 'aria-label': groupAria(e), tabindex: '-1' }, groupHTML(e), sig);
      }
    }
    // Grupo abierto: encima de la franja, pegado a su pila
    if (openEl) renderOpen(openEl);
    const cxl = px(S.t);
    if (cxl >= -2 && cxl <= W + 2) upsert('cursor', 'div', 'cursor-linea', { style: `left:${cxl.toFixed(1)}px`, 'aria-hidden': 'true' }, '', '');
    const guide = S.hover && BY_ID.get(S.hover);
    if (guide) upsert('guia', 'div', 'guia', { style: `left:${px(guide.a).toFixed(1)}px`, 'aria-hidden': 'true' }, '', '');

    // Quitar lo que ya no está; si se va el foco, pasa a la marca más cercana
    let lostFocus = false;
    for (const [k, el] of nodes) if (!el._live) { if (el.contains(document.activeElement)) lostFocus = true; el.remove(); nodes.delete(k); }
    rovingTabindex(lostFocus);
    renderRuler(tks);
    renderToolbar();
    writeHash();
  }

  function renderOpen(e) {
    const ms = e.ms;
    const maxName = Math.max(...ms.map((m) => Math.max(tw(m.name, F_NAME), tw(m.line2 + (m.extra ? ' · ' + m.extra : ''), F_DATE))));
    const width = Math.min(W - 16, Math.max(300, maxName + 60), 460);
    const chipH = e.g.rows * ROW - 4;
    const below = H - (e.top + chipH) - 10, above = e.top - 10;
    const needed = 52 + ms.length * 46;
    let pos, maxH;
    if (below >= Math.min(needed, 220) || below >= above) { pos = `top:${(e.top + chipH + 6).toFixed(1)}px`; maxH = below - 2; }
    else { maxH = above - 2; pos = `bottom:${(H - e.top + 6).toFixed(1)}px`; }
    const leftPx = clamp(e.g.left, 8, W - width - 8);
    const sig = e.key + '|' + S.sel + '|' + width;
    // Elegir un nombre de la lista la vuelve a pintar: se guarda dónde estaba su desplazamiento para no saltar arriba.
    const old = nodes.get('abierto');
    const oldList = old && old._shown === e.key ? old.querySelector('.abierto__lista') : null;
    const keepScroll = oldList ? oldList.scrollTop : null;
    const html = `<div class="abierto__cabeza"><div class="abierto__titulo" id="abierto-titulo">${esc(e.g.title)}<small>Las rayas de la regla marcan la fecha de cada uno; la del que señalas, más fuerte.</small></div><button type="button" class="abierto__cerrar" data-cerrar>Cerrar</button></div>
      <ul class="abierto__lista" role="list">${ms.map((m) => {
        const w = px(m.b) - px(m.a);
        const g = w < 12 ? glyph(m, null) : glyph(m, 18, 0);
        const icon = ICONS[m.kind] ? `<span class="marca__icono">${ICONS[m.kind]}</span>` : '';
        return `<li><button type="button" class="miembro" data-k="p:${esc(m.id)}" data-id="${esc(m.id)}" aria-pressed="${S.sel === m.id}" aria-label="${esc(m.aria)}" tabindex="-1" style="--c:${m.color}"><span class="miembro__glifo">${g}</span><span class="marca__nombre">${icon}${esc(m.name)}</span><span class="marca__fecha">${esc(m.line2)}${m.extra ? ` · <b>${m.extra}</b>` : ''}</span></button></li>`;
      }).join('')}</ul>`;
    const el = upsert('abierto', 'div', 'abierto', { role: 'dialog', 'aria-labelledby': 'abierto-titulo', style: `left:${leftPx.toFixed(1)}px;${pos};width:${width.toFixed(1)}px;max-height:${maxH.toFixed(1)}px` }, html, sig);
    // Al construirse, la lista enseña la marca elegida si está dentro
    if (keepScroll != null) { const l = el.querySelector('.abierto__lista'); if (l && l.scrollTop !== keepScroll) l.scrollTop = keepScroll; }
    if (el._shown !== e.key) {
      el._shown = e.key;
      const selEl = el.querySelector('.miembro[aria-pressed="true"]');
      const list = el.querySelector('.abierto__lista');
      if (selEl && list) list.scrollTop = Math.max(0, selEl.offsetTop - list.clientHeight / 2 + selEl.offsetHeight / 2);
    }
    // Roving dentro de la lista
    const items = [...el.querySelectorAll('.miembro')];
    if (!items.some((b) => b.tabIndex === 0)) (items.find((b) => b.getAttribute('aria-pressed') === 'true') || items[0]).tabIndex = 0;
  }

  // ---------------------------------------------------------------------------
  // Regla y cursor
  // ---------------------------------------------------------------------------
  function ticks() {
    const k = W / S.span, out = [];
    const v1 = S.v0 + S.span;
    if (S.span > 2.5) {
      const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
      const step = steps.find((s) => s * k >= 84) || 1000;
      const major = step * 5;
      const a = Math.floor(S.v0), b = Math.ceil(v1);
      const push = (t, n) => { if (t >= S.v0 - 1e-9 && t <= v1) out.push({ t, x: px(t), label: yearLabel(t), major: n % major === 0 || step >= 100 }); };
      // a.e.c.: la marca del año n a.e.c. está en t = 1 - n
      for (let n = Math.ceil((1 - Math.min(0, b)) / step) * step; n <= 1 - a; n += step) if (n >= 1) push(1 - n, n);
      for (let yv = Math.max(step, Math.ceil(Math.max(1, a) / step) * step); yv <= b; yv += step) push(yv, yv);
      out.sort((p, q) => p.t - q.t);
      return out;
    }
    const ms = MONTHS.filter((m) => m.b > S.v0 && m.a < v1);
    if (S.span > 0.35) {
      if (ms.length) for (const m of ms) { if (m.a >= S.v0) out.push({ t: m.a, x: px(m.a), label: m.id === 'nisan' || !out.length || m.id === 'tisri' ? `${m.name} ${yearLabel(Math.floor(m.a + 0.05))}` : m.name, major: m.id === 'nisan' || m.id === 'tisri' }); }
      else for (let t = Math.floor(S.v0 * 12) / 12; t <= v1; t += 1 / 12) { if (t < S.v0) continue; const y = Math.floor(t + 1e-6), i = Math.round((t - y) * 12) % 12; out.push({ t, x: px(t), label: i === 0 ? `${MES[i]} ${yearLabel(y)}` : MES[i], major: i === 0 }); }
      return out;
    }
    const dayPx = DAY * k;
    const every = dayPx >= 26 ? 1 : dayPx >= 8 ? 7 : 14;
    const src = ms.length ? ms : [];
    for (const m of src) {
      if (m.a >= S.v0) out.push({ t: m.a, x: px(m.a), label: `1 ${m.name} ${yearLabel(Math.floor(m.a + 0.05))}`, major: true });
      for (let d = every; m.a + d * DAY < m.b - DAY / 2; d += every) {
        const t = m.a + d * DAY;
        if (t >= S.v0 && t <= v1) out.push({ t, x: px(t), label: String(d + 1), major: false });
      }
    }
    if (!src.length) for (let t = Math.floor(S.v0 / DAY) * DAY; t <= v1; t += DAY * every) if (t >= S.v0) out.push({ t, x: px(t), label: dateAt(t, 'dia'), major: false });
    // El primer rótulo de la izquierda dice siempre de qué mes es.
    if (out.length && !/[a-z]/i.test(out[0].label)) { const m = monthAt(out[0].t + DAY / 2); if (m) out[0].label = `${out[0].label} ${m.name}`; }
    return out;
  }
  function renderRuler(tks) {
    const sel = S.sel && BY_ID.get(S.sel);
    const open = S.open && LAYOUT.elements.find((e) => e.key === S.open);
    const hov = S.hover && BY_ID.get(S.hover);
    let html = '';
    let lastLabelEnd = -Infinity;
    for (const tk of tks) {
      html += `<div class="tic${tk.major ? ' tic--mayor' : ''}" style="left:${tk.x.toFixed(1)}px"></div>`;
      const w = tw(tk.label, '400 11.5px Inter') + 12;
      if (tk.x >= lastLabelEnd && tk.x + w <= W + 40) { html += `<div class="tic-rotulo${tk.major ? ' tic-rotulo--mayor' : ''}" style="left:${tk.x.toFixed(1)}px">${esc(tk.label)}</div>`; lastLabelEnd = tk.x + w; }
    }
    const band = (a, b, cls) => {
      const x0 = clamp(px(a), -4, W + 4), x1 = clamp(px(b), -4, W + 4);
      return `<div class="tramo-regla ${cls}" style="left:${Math.min(x0, x1 - 3).toFixed(1)}px;width:${Math.max(3, x1 - x0).toFixed(1)}px"></div>`;
    };
    if (open) {
      let a = Infinity, b = -Infinity;
      for (const m of open.ms) { a = Math.min(a, m.a); b = Math.max(b, m.b); }
      html += band(a, b, 'tramo-regla--grupo');
      for (const m of open.ms) html += `<div class="tramo-regla tramo-regla--miembro" style="left:${px(m.a).toFixed(1)}px"></div>`;
    }
    if (sel) html += band(sel.a, sel.b, 'tramo-regla--elegida');
    if (hov) html += band(hov.a, hov.b, 'tramo-regla--foco');
    const cx = px(S.t);
    const flag = dateAt(S.t, fineness(S.span));
    const fw = tw(flag, '700 11.5px Inter') + 18;
    const shift = clamp(cx, fw / 2 + 2, W - fw / 2 - 2) - cx;
    html += `<div class="cursor" style="left:${cx.toFixed(1)}px"><span class="cursor__bandera" style="transform:translateX(calc(-50% + ${shift.toFixed(1)}px))">${esc(flag)}</span></div>`;
    regla.innerHTML = html;
    regla.setAttribute('aria-valuenow', S.t.toFixed(3));
    regla.setAttribute('aria-valuetext', `Cursor en ${flag}`);
  }
  function renderToolbar() {
    const f = fineness(S.span);
    const sc = nearestScale();
    const exact = sc && Math.abs(Math.log(S.span / sc.span)) < 0.05;
    $('#fecha-cursor').innerHTML = `${esc(dateAt(S.t, f))} <small>${exact ? esc(sc.name) : `escala libre: ${esc(spanText(S.span))}`}</small>`;
    for (const b of document.querySelectorAll('#escalas button')) b.setAttribute('aria-pressed', exact && b.dataset.id === sc.id ? 'true' : 'false');
    const u = STEP_TXT[(sc || SCALES[2]).id];
    $('#paso-atras').textContent = `‹ ${u}`; $('#paso-atras').setAttribute('aria-label', `Cursor: ${u} antes`);
    $('#paso-adelante').textContent = `${u} ›`; $('#paso-adelante').setAttribute('aria-label', `Cursor: ${u} después`);
    const tema = $('#tema');
    tema.setAttribute('aria-pressed', S.tema === 'oscuro' ? 'true' : 'false');
    const next = S.tema === 'oscuro' ? 'claro' : 'oscuro';
    tema.innerHTML = `<span class="largo">Tema ${next}</span><span class="corto" aria-hidden="true">${next[0].toUpperCase() + next.slice(1)}</span>`;
    tema.setAttribute('aria-label', `Tema ${next}`);
    document.documentElement.dataset.tema = S.tema;
  }
  const STEP_TXT = { milenios: '100 años', siglos: '10 años', decadas: '1 año', anos: '1 mes', meses: '1 semana', dias: '1 día' };
  const STEP = { milenios: 100, siglos: 10, decadas: 1, anos: 1 / 12, meses: 7 * DAY, dias: DAY };
  function spanText(s) {
    if (s >= 2) return `${Math.round(s).toLocaleString('es')} años`;
    if (s >= 2 / 12) return `${Math.round(s * 12)} meses`;
    return `${Math.round(s / DAY)} días`;
  }
  function nearestScale() {
    let best = null, d = Infinity;
    for (const s of SCALES) { const r = Math.abs(Math.log(S.span / s.span)); if (r < d) { d = r; best = s; } }
    return d < Math.log(2) ? best : null;
  }

  // ---------------------------------------------------------------------------
  // Ficha
  // ---------------------------------------------------------------------------
  function renderCard() {
    const m = S.sel && BY_ID.get(S.sel);
    if (!m) {
      ficha.innerHTML = `<div class="ficha__vacia"><h2>Nada elegido</h2><p>Pulsa una marca para ver qué es. Pulsa un grupo (los que parecen una pila y dicen «12 sucesos · …») para ver todos sus nombres; se abre ahí mismo, sin mover la franja.</p><p>La barra de abajo de cada marca es su «cuándo»: un punto si es un momento, una barra si dura. La fecha escrita debajo del nombre dice si es exacta, aproximada («c.»), calculada o incierta.</p></div>`;
      sheet();
      return;
    }
    const cert = D.certainties[m.certainty] || m.certainty;
    const prec = D.precisions[m.precision] || m.precision;
    const f = fineness(S.span);
    const journey = m.journey && BY_ID.get(m.journey);
    const rows = [
      ['Fecha', `<span class="ficha__fecha">${esc(m.date)}</span>`],
      ['Precisión', esc(prec)],
      ['Certeza', `<span class="ficha__certeza"><span class="muestra" style="--c:${m.color}">${glyph(m, 34, 0)}</span>${esc(cert)}</span>`],
      m.places?.length ? ['Dónde', esc(m.places.join(', '))] : null,
      m.people?.length ? ['Quién', esc(m.people.join(', '))] : null,
      journey ? ['Viaje', esc(journey.name)] : null,
      m.to ? ['Para', esc(m.to)] : null,
      m.ref ? ['Texto', esc(m.ref)] : null,
      m.secular ? ['Secular', esc(m.secular.date)] : null,
      ['Dura', esc(durationText(m))],
    ].filter(Boolean);
    ficha.innerHTML = `<button type="button" class="boton hoja-cerrar" data-accion="quitar">Cerrar</button><p class="ficha__tipo">${esc(kindLabel(m))}</p><h2>${esc(m.name)}</h2>
      ${S.note ? `<p class="ficha__cursor">${esc(S.note)}</p>` : ''}
      <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
      ${m.summary ? `<p class="ficha__resumen">${esc(m.summary)}</p>` : '<p class="ficha__resumen">Sin resumen en los datos.</p>'}
      <div class="ficha__acciones">
        <button type="button" class="boton" data-accion="inicio">Cursor al principio</button>
        <button type="button" class="boton" data-accion="fin">Cursor al final</button>
        <button type="button" class="boton" data-accion="encuadrar">Encuadrar (cambia la escala)</button>
        <button type="button" class="boton" data-accion="quitar">Quitar la selección</button>
      </div>
      <p class="ficha__nota">Estos botones son lo único que mueve la vista o la escala desde una marca, y solo si los pulsas. Escala: ${esc(nearestScale()?.name || 'libre')}; cursor en ${esc(dot(dateAt(S.t, f)))}</p>`;
  }
  function durationText(m) {
    const d = m.b - m.a;
    if (d < DAY * 0.5) return 'un momento';
    if (d < DAY * 1.5) return 'un día';
    if (d < 0.08) return `${Math.round(d / DAY)} días`;
    if (d < 1.5) return `${Math.round(d * 12)} meses`;
    return `${Math.round(d)} años`;
  }

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------
  function select(id, tapY) {
    const m = BY_ID.get(id);
    if (!m) return;
    const f = fineness(S.span);
    // Un segundo clic en la marca elegida la deja elegida, como en los otros diseños: se suelta con Esc o con «Quitar».
    if (S.sel === id) { sheet(tapY); return; }
    S.sel = id;
    const before = S.t;
    // La marca es [a, b): su final es el primer instante de lo que viene después, así que el cursor se queda antes.
    const end = m.b > m.a ? m.b - Math.min((m.b - m.a) / 2, DAY / 24) : m.b;
    if (S.t >= m.a && (S.t < m.b || m.b <= m.a)) S.note = 'El cursor no se ha movido: ya estaba dentro de la marca.';
    else {
      const lo = Math.max(m.a, S.v0), hi = Math.min(end, S.v0 + S.span);
      S.t = lo <= hi ? clamp(S.t, lo, hi) : clamp(S.t, m.a, end);
      let a = dateAt(before, f), b = dateAt(S.t, f);
      if (a === b) { a = dateAt(before, 'dia'); b = dateAt(S.t, 'dia'); }
      S.note = a === b ? 'El cursor apenas se ha movido: ha entrado en la marca por su borde más cercano.'
        : `El cursor ha pasado de ${a} a ${b}: el punto de la marca más cercano a donde estaba.`;
    }
    render();
    renderCard();
    sheet(tapY);
    $('#vivo').textContent = `Elegido: ${m.aria}`;
  }
  /** En el móvil, con algo elegido, la ficha es una hoja que siempre se ve: abajo, o arriba si lo tocado está abajo. */
  function sheet(tapY) {
    const on = !!S.sel && innerWidth <= 760;
    ficha.classList.toggle('hoja', on);
    if (on && tapY != null) ficha.classList.toggle('arriba', tapY > innerHeight * 0.5);
    if (!on) ficha.classList.remove('arriba');
  }
  function unselect() { S.sel = null; S.note = null; render(); renderCard(); sheet(); $('#vivo').textContent = 'Nada elegido.'; }
  function toggleGroup(key) {
    S.open = S.open === key ? null : key;
    render();
  }
  function setSpan(span, anchorT, anchorX) {
    S.span = clamp(span, SPAN_MIN, SPAN_MAX);
    S.v0 = anchorT - anchorX / W * S.span;
    clampView();
    render();
  }
  function zoomTo(span) {
    const cx = px(S.t);
    if (cx >= 0 && cx <= W) setSpan(span, S.t, cx);
    else setSpan(span, S.v0 + S.span / 2, W / 2);
  }
  function pan(dt) { S.v0 += dt; clampView(); render(); }
  function moveCursor(t, follow) {
    S.t = clamp(t, T_MIN, T_MAX);
    if (follow) {
      const x = px(S.t);
      if (x < 0) S.v0 = S.t - 0.05 * S.span; else if (x > W) S.v0 = S.t - 0.95 * S.span;
      clampView();
    }
    render();
  }

  // ---------------------------------------------------------------------------
  // Teclado: una sola parada de Tab en la franja; las flechas van de marca en marca
  // ---------------------------------------------------------------------------
  function focusables() {
    return LAYOUT.elements.filter((e) => e.g.left < W - 8 && e.g.left + e.g.width > 8)
      .map((e) => ({ e, el: nodes.get(e.key), x: Math.max(e.g.left, 0), cx: Math.max(e.g.left, 0) + Math.min(e.g.width, W) / 2, row: bandRow(e) }));
  }
  const bandRow = (e) => Math.round((e.top - HEAD) / ROW * 100) / 100;
  function rovingTabindex(lostFocus) {
    const fs = focusables();
    if (!fs.length) return;
    let cur = fs.find((f) => f.e.key === S.focusKey);
    if (!cur) {
      const cx = px(S.t);
      cur = fs.slice().sort((p, q) => Math.abs(p.cx - cx) - Math.abs(q.cx - cx))[0];
    }
    for (const f of fs) f.el.tabIndex = f === cur ? 0 : -1;
    if (lostFocus) cur.el.focus({ preventScroll: true });
  }
  function focusKey(key) {
    S.focusKey = key;
    const el = nodes.get(key);
    if (el) { for (const f of focusables()) f.el.tabIndex = -1; el.tabIndex = 0; el.focus({ preventScroll: true }); }
  }
  function keyNav(ev) {
    const t = ev.target;
    if (t.closest('.abierto')) return keyPanel(ev);
    const fs = focusables();
    const cur = fs.find((f) => f.el === t);
    const k = ev.key;
    if (k === 'Escape') {
      if (S.open) { const key = S.open; S.open = null; render(); focusKey(key); }
      else if (S.sel) unselect();
      ev.preventDefault(); return;
    }
    if (k === '+' || k === '=' || k === '-') { const i = SCALES.indexOf(nearestScale() || SCALES[2]); const j = clamp(i + (k === '-' ? -1 : 1), 0, SCALES.length - 1); zoomTo(SCALES[j].span); ev.preventDefault(); return; }
    if (k === 'PageUp' || k === 'PageDown') { pan((k === 'PageUp' ? -0.5 : 0.5) * S.span); ev.preventDefault(); return; }
    if (!cur || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(k)) return;
    ev.preventDefault();
    const sameRow = fs.filter((f) => f.row === cur.row).sort((p, q) => p.x - q.x);
    const i = sameRow.indexOf(cur);
    if (k === 'Home') return focusKey(sameRow[0].e.key);
    if (k === 'End') return focusKey(sameRow[sameRow.length - 1].e.key);
    if (k === 'ArrowRight' || k === 'ArrowLeft') {
      const nx = sameRow[i + (k === 'ArrowRight' ? 1 : -1)];
      if (nx) return focusKey(nx.e.key);
      // Al borde: la vista avanza un tercio (lo pide el teclado, no un clic) y se sigue por la misma fila.
      const dir = k === 'ArrowRight' ? 1 : -1;
      const row = cur.row, x = cur.x;
      pan(dir * S.span / 3);
      const after = focusables().filter((f) => f.row === row && (dir > 0 ? f.x > x - S.span / 3 * W / S.span + 1 : f.x < x + W / 3 - 1)).sort((p, q) => dir * (p.x - q.x));
      if (after.length) focusKey(after[0].e.key);
      return;
    }
    const rows = [...new Set(fs.map((f) => f.row))].sort((p, q) => p - q);
    const ri = rows.indexOf(cur.row) + (k === 'ArrowDown' ? 1 : -1);
    if (ri < 0 || ri >= rows.length) return;
    const cand = fs.filter((f) => f.row === rows[ri]).sort((p, q) => Math.abs(p.cx - cur.cx) - Math.abs(q.cx - cur.cx));
    if (cand.length) focusKey(cand[0].e.key);
  }
  function keyPanel(ev) {
    const panel = ev.target.closest('.abierto');
    const items = [...panel.querySelectorAll('.miembro')];
    const i = items.indexOf(ev.target);
    const k = ev.key;
    if (k === 'Escape') { const key = S.open; S.open = null; S.hover = null; render(); focusKey(key); ev.preventDefault(); return; }
    let j = null;
    if (k === 'ArrowDown') j = i < 0 ? 0 : Math.min(items.length - 1, i + 1);
    else if (k === 'ArrowUp') j = i < 0 ? 0 : Math.max(0, i - 1);
    else if (k === 'Home') j = 0;
    else if (k === 'End') j = items.length - 1;
    if (j == null) return;
    ev.preventDefault();
    for (const b of items) b.tabIndex = -1;
    items[j].tabIndex = 0;
    items[j].focus();
  }

  // ---------------------------------------------------------------------------
  // Puntero: arrastrar mueve el tiempo, dos dedos o la rueda cambian la escala, un clic elige
  // ---------------------------------------------------------------------------
  const pointers = new Map();
  let drag = null, pinch = null, suppress = false, rulerDrag = null;
  let holdAlloc = null;
  franja.addEventListener('pointerdown', (ev) => {
    if (ev.button > 0) return;
    if (ev.target.closest('.abierto__lista') && ev.pointerType !== 'mouse') return;   // la lista se desplaza sola
    const r = franja.getBoundingClientRect();
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (ev.target.closest('#regla') && pointers.size === 1) {
      rulerDrag = ev.pointerId;
      regla.setPointerCapture(ev.pointerId);
      moveCursor(tAt(ev.clientX - r.left), false);
      return;
    }
    if (pointers.size === 2) {
      const [p, q] = [...pointers.values()];
      pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), span: S.span, mid: tAt((p.x + q.x) / 2 - r.left) };
      drag = null;
      return;
    }
    drag = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, v0: S.v0, moved: false };
  });
  franja.addEventListener('pointermove', (ev) => {
    if (!pointers.has(ev.pointerId)) {
      const el = ev.target.closest('.marca, .miembro');
      const id = el ? (el.dataset.id || el.dataset.k.slice(2)) : null;
      if (ev.pointerType === 'mouse' && id !== S.hover) { S.hover = id && BY_ID.has(id) ? id : null; render(); }
      return;
    }
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const r = franja.getBoundingClientRect();
    if (rulerDrag === ev.pointerId) { moveCursor(tAt(ev.clientX - r.left), false); return; }
    if (pinch && pointers.size === 2) {
      const [p, q] = [...pointers.values()];
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      const midX = (p.x + q.x) / 2 - r.left;
      if (pinch.d > 10) setSpan(pinch.span * pinch.d / d, pinch.mid, midX);
      suppress = true;
      return;
    }
    if (!drag || drag.id !== ev.pointerId) return;
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!drag.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { drag.moved = true; holdAlloc = new Map(); try { franja.setPointerCapture(ev.pointerId); } catch (_) { /* ya soltado */ } }
    if (drag.moved) { S.v0 = drag.v0 - dx / W * S.span; clampView(); render(); }
  });
  const endPointer = (ev) => {
    pointers.delete(ev.pointerId);
    if (rulerDrag === ev.pointerId) rulerDrag = null;
    if (drag && drag.id === ev.pointerId) { if (drag.moved) { suppress = true; holdAlloc = null; render(); } drag = null; }
    if (pointers.size < 2) pinch = null;
    if (suppress) setTimeout(() => { suppress = false; }, 0);
  };
  franja.addEventListener('pointerup', endPointer);
  franja.addEventListener('pointercancel', endPointer);
  franja.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse' && S.hover && !pointers.size) { S.hover = null; render(); } });
  franja.addEventListener('wheel', (ev) => {
    const list = ev.target.closest('.abierto__lista');
    if (list && Math.abs(ev.deltaY) > Math.abs(ev.deltaX) && list.scrollHeight > list.clientHeight) return;
    const r = franja.getBoundingClientRect();
    if (Math.abs(ev.deltaX) > Math.abs(ev.deltaY) || ev.shiftKey) { ev.preventDefault(); pan((ev.deltaX || ev.deltaY) / W * S.span); return; }
    // La rueda sola no cambia la escala (la escala no cambia sin pedirlo): solo con Ctrl, que es también el pellizco del
    // panel táctil.
    if (!ev.ctrlKey && !ev.metaKey) return;
    ev.preventDefault();
    const x = ev.clientX - r.left;
    setSpan(S.span * Math.exp(ev.deltaY * 0.0015), tAt(x), x);
  }, { passive: false });
  franja.addEventListener('click', (ev) => {
    if (suppress) { ev.preventDefault(); ev.stopPropagation(); return; }
    const close = ev.target.closest('[data-cerrar]');
    if (close) { const key = S.open; S.open = null; S.hover = null; render(); focusKey(key); return; }
    const mem = ev.target.closest('.miembro');
    if (mem) { select(mem.dataset.id, ev.detail > 0 ? ev.clientY : null); const again = lienzo.querySelector(`.miembro[data-id="${CSS.escape(mem.dataset.id)}"]`); if (again) { for (const b of lienzo.querySelectorAll('.miembro')) b.tabIndex = -1; again.tabIndex = 0; again.focus({ preventScroll: true }); } return; }
    const el = ev.target.closest('.marca, .grupo');
    if (!el) return;
    const key = el.dataset.k;
    S.focusKey = key;
    if (key.startsWith('g:')) {
      toggleGroup(key);
      if (S.open === key) { const first = lienzo.querySelector('.abierto .miembro[tabindex="0"]'); if (first && ev.detail === 0) first.focus({ preventScroll: true }); }
    } else select(key.slice(2), ev.detail > 0 ? ev.clientY : null);
    const again = nodes.get(key);
    if (again && document.activeElement !== again && !lienzo.querySelector('.abierto')?.contains(document.activeElement)) again.focus({ preventScroll: true });
  });
  franja.addEventListener('focusin', (ev) => {
    const el = ev.target.closest('.marca, .miembro');
    const id = el ? (el.dataset.id || el.dataset.k.slice(2)) : null;
    const g = ev.target.closest('.marca, .grupo');
    if (g) S.focusKey = g.dataset.k;
    if (id !== S.hover && (id == null || BY_ID.has(id))) { S.hover = id; render(); }
  });
  lienzo.addEventListener('keydown', keyNav);
  regla.addEventListener('keydown', (ev) => {
    const unit = S.span > 1500 ? 100 : S.span > 150 ? 10 : S.span > 15 ? 1 : S.span > 2 ? 1 / 12 : S.span > 0.3 ? 7 * DAY : DAY;
    const k = ev.key;
    if (k === 'ArrowLeft' || k === 'ArrowRight') { moveCursor(S.t + (k === 'ArrowRight' ? 1 : -1) * unit * (ev.shiftKey ? 10 : 1), true); ev.preventDefault(); }
    else if (k === 'PageUp' || k === 'PageDown') { pan((k === 'PageUp' ? -0.5 : 0.5) * S.span); ev.preventDefault(); }
    else if (k === '+' || k === '=' || k === '-') { const i = SCALES.indexOf(nearestScale() || SCALES[2]); zoomTo(SCALES[clamp(i + (k === '-' ? -1 : 1), 0, SCALES.length - 1)].span); ev.preventDefault(); }
  });

  // Barra
  $('#escalas').innerHTML = SCALES.map((s) => `<button type="button" data-id="${s.id}" aria-label="Escala: ${s.name}"><span class="largo">${s.name}</span><span class="corto" aria-hidden="true">${s.short}</span></button>`).join('');
  $('#escalas').addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (b) zoomTo(SCALES.find((s) => s.id === b.dataset.id).span); });
  $('#saltar').addEventListener('click', (ev) => { ev.preventDefault(); const el = lienzo.querySelector('[tabindex="0"]'); if (el) el.focus(); });
  $('#antes').addEventListener('click', () => pan(-S.span / 2));
  $('#paso-atras').addEventListener('click', () => moveCursor(S.t - STEP[(nearestScale() || SCALES[2]).id], true));
  $('#paso-adelante').addEventListener('click', () => moveCursor(S.t + STEP[(nearestScale() || SCALES[2]).id], true));
  LINEA_COMUN.toolbar($('.barra__mandos'));
  $('#despues').addEventListener('click', () => pan(S.span / 2));
  $('#tema').addEventListener('click', () => { S.tema = S.tema === 'oscuro' ? 'claro' : 'oscuro'; render(); });
  $('#ir').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const t = LINEA_COMUN.parseDate($('#ir-fecha').value, MONTHS.map((m) => ({ name: m.name, s: m.a, e: m.b })));
    if (t == null) { $('#vivo').textContent = 'No entiendo esa fecha. Prueba 607 a.e.c., 33 o 14 nisán 33.'; return; }
    S.t = clamp(t, T_MIN, T_MAX);
    if (px(S.t) < 0 || px(S.t) > W) S.v0 = S.t - 0.4 * S.span;
    clampView();
    render();
    renderCard();
  });
  ficha.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-accion]');
    const m = S.sel && BY_ID.get(S.sel);
    if (!b || !m) return;
    const a = b.dataset.accion;
    if (a === 'quitar') { unselect(); return; }
    if (a === 'inicio' || a === 'fin') { moveCursor(a === 'inicio' ? m.a : m.b - 1e-6, true); S.note = null; renderCard(); return; }
    if (a === 'encuadrar') {
      const span = clamp((m.b - m.a) * 1.25, SPAN_MIN, SPAN_MAX);
      S.span = span; S.v0 = m.a - (span - (m.b - m.a)) / 2; clampView();
      if (S.t < m.a || S.t > m.b) S.t = clamp(S.t, m.a, m.b);
      render(); renderCard();
    }
  });
  window.addEventListener('resize', () => render());
  window.addEventListener('hashchange', () => { readHash(); render(); renderCard(); });

  // Para las pruebas: estado y disposición, solo lectura.
  window.CLUSTERS = {
    state: () => ({ t: S.t, span: S.span, v0: S.v0, sel: S.sel, open: S.open }),
    layout: () => LAYOUT,
    marks: MARKS,
    render,
  };

  readHash();
  document.documentElement.dataset.tema = S.tema;
  Promise.all([F_NAME, F_DATE, F_GT].map((f) => document.fonts.load(f))).catch(() => {}).then(() => document.fonts.ready).then(() => {
    widths.clear();
    render();
    renderCard();
    sheet();
    document.body.dataset.listo = '1';
  });
})();
