/* La de hoy, arreglada: la línea de tiempo de hoy con cuatro cambios.
   1. Un clic elige la marca y abre su ficha; el cursor entra en la marca por el punto señalado; ni la escala ni la vista se mueven.
   2. Cada carril crece en filas: cada marca reserva el sitio de su nombre y ningún nombre se tapa ni se recorta.
   3. Dos formas: punto = momento, barra = tramo. Bordes nítidos = fecha de la fuente; bordes que se difuminan = aproximada;
      hueco = cálculo nuestro; «¿?» = dudosa. Cada nombre lleva además la palabra («aprox.», «cálculo», «¿?»).
   4. La franja se arrastra para moverse en el tiempo; la escala solo cambia con sus mandos. */
(() => {
  'use strict';
  const D = window.TIMELINE_DATA;
  const DAY = D.day;
  const RANGE = D.range;
  const MIN_SPAN = D.spanMin;
  const MAX_SPAN = (RANGE[1] - RANGE[0]) * 1.04;
  const SCALES = D.scales;
  const $ = (id) => document.getElementById(id);
  const coarse = matchMedia('(pointer: coarse)').matches;

  // ---------- Geometría ----------
  const G = {
    fs: 12,
    maxLabel: coarse ? 160 : 0,  // ancho máximo de un nombre en el teléfono (luego parte en líneas)
    row: coarse ? 44 : 22,
    dotR: coarse ? 6 : 5,
    pad: 6,        // margen del nombre dentro de una barra
    fade: 14,      // largo del difuminado de un extremo aproximado, en px (no en % de la barra)
    fadeOpen: 36,  // extremo abierto (sin fecha)
    gap: 10,       // hueco mínimo entre dos marcas de la misma fila
  };

  // ---------- Fechas ----------
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MES_C = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.'];
  const CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
  const YL = 365.2425;
  const yearName = (Y) => (Y >= 1 ? `${Y} e.c.` : `${1 - Y} a.e.c.`);
  const yearOf = (t) => yearName(Math.floor(t));
  function ourDate(t) {
    const Y = Math.floor(t);
    let doy = (t - Y) * YL;
    if (doy >= 365) doy = 364.999;
    let m = 0;
    while (m < 11 && doy >= CUM[m + 1]) m++;
    return { Y, m, d: Math.floor(doy - CUM[m]) + 1 };
  }
  const monthStart = (Y, m) => Y + CUM[m] / YL;

  // Meses hebreos: una lista plana ordenada de los meses que trae datos.js.
  const HEB = [];
  const MONTH_INFO = Object.fromEntries(D.calendar.months.map((m) => [m.id, m]));
  for (const y of D.calendar.years) for (const [id, name, a, b] of y.months) HEB.push({ id, name, start: a, end: b });
  HEB.sort((p, q) => p.start - q.start);
  function hebrewAt(t) {
    let lo = 0, hi = HEB.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1, h = HEB[mid];
      if (t < h.start) hi = mid - 1; else if (t >= h.end) lo = mid + 1; else return { h, d: Math.floor((t - h.start) / DAY) + 1 };
    }
    return null;
  }
  function cursorText(t) {
    if (S.span >= 60) return yearOf(t);
    const o = ourDate(t);
    if (S.span >= 2.5) return `${MES[o.m]} de ${yearName(o.Y)}`;
    const h = hebrewAt(t);
    return `${o.d} ${MES_C[o.m]} ${yearName(o.Y)}` + (h ? ` · ${h.d} de ${h.h.name.toLowerCase()}` : '');
  }
  function rangeText(a, b) {
    const fmt = (t) => {
      if (b - a >= 3) return yearOf(t);
      const o = ourDate(t);
      return `${o.d} ${MES_C[o.m]} ${yearName(o.Y)}`;
    };
    const x = fmt(a), y = fmt(b - (b - a >= 3 ? 0.001 : DAY / 2));
    return x === y ? x : `${x} a ${y}`;
  }

  // ---------- Colores (del kit del sitio; en oscuro, los del tema «reunión») ----------
  const PAL = {
    light: {
      ink: '#18221c', surface: '#fbfcfa',
      eras: ['#5e4f80', '#7a6a9c'],
      imp: { egipcia: '#a8863c', asiria: '#9a5b3e', babilonica: '#3f5e8c', medopersa: '#6f5aa0', griega: '#2f7f8a', romana: '#4f5d6e' },
      emperadores: '#4f5d6e', 'reyes-jerusalen': '#4f7a3a', 'reyes-samaria': '#7a5a2e', 'reyes-persia': '#6f5aa0',
      gobernadores: '#56657a', sacerdotes: '#2a5d78', secular: '#56657a', cartas: '#86601c', sucesos: '#1f3b30',
      viajes: ['#b34962', '#357589', '#805da8', '#6b445c', '#a75733', '#2f5085', '#756f19', '#654b2f'],
      mes: ['#dfe7dd', '#eef2ec'], fiesta: '#1f3b30',
    },
    dark: {
      ink: '#1b1813', surface: '#211d17',
      eras: ['#8a79b0', '#a293c4'],
      imp: { egipcia: '#c29a3b', asiria: '#c07a5e', babilonica: '#7d9dcc', medopersa: '#a58fcb', griega: '#5fb0b8', romana: '#9aabc0' },
      emperadores: '#9aabc0', 'reyes-jerusalen': '#8fb86a', 'reyes-samaria': '#c9a060', 'reyes-persia': '#a58fcb',
      gobernadores: '#a9b8cc', sacerdotes: '#6fa8cc', secular: '#a9b8cc', cartas: '#d9b36a', sucesos: '#e8c983',
      viajes: ['#d97a8f', '#6fb0c4', '#a88bd0', '#b98aa8', '#d48c63', '#7f9fd6', '#c2bb5a', '#b99672'],
      mes: ['#3a3328', '#2c2720'], fiesta: '#e8c983',
    },
  };
  const INK_TEXT = { light: '#18221c', dark: '#efe7d8' };
  function rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function lum(h) { return rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); }
  function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function textOn(bg) { const p = PAL[S.theme]; return contrast(bg, '#ffffff') >= contrast(bg, p.ink) ? '#ffffff' : p.ink; }

  // ---------- Estado ----------
  const S = { t: 50.5, v0: 46.3, span: 8, sel: null, theme: 'light', folded: new Set(), lastClick: null };
  let holdRows = null;   // filas de cada carril durante un arrastre: no encogen hasta soltar
  let holdEdge = null;   // marcas que bajaron a una fila del borde durante un arrastre

  // ---------- Carriles: los de hoy, con los que crecen (Pablo, Cartas, Sucesos) al final ----------
  const LANE_NAME = Object.fromEntries(D.lanes.map((l) => [l.id, l.name]));
  const LANE_ORDER = ['meses', 'eras', 'imperios', 'emperadores', 'reyes-jerusalen', 'reyes-samaria', 'reyes-persia', 'gobernadores', 'sacerdotes', 'secular', 'pablo', 'cartas', 'sucesos'];
  const LANES = LANE_ORDER.map((id) => ({ id, name: id === 'meses' ? 'Meses hebreos' : LANE_NAME[id], items: [], onlyBelow: id === 'meses' ? 2.5 : Infinity }));
  const LANE = Object.fromEntries(LANES.map((l) => [l.id, l]));

  const KIND_NAME = {
    event: 'Suceso', letter: 'Carta', journey: 'Viaje de Pablo', stop: 'Parada de un viaje',
    era: 'Era', potencia: 'Potencia mundial', rey: 'Rey', emperador: 'Emperador', gobernador: 'Gobernador', 'sumo-sacerdote': 'Sumo sacerdote',
    mes: 'Mes hebreo', fiesta: 'Fiesta', secular: 'Fecha secular',
  };
  const TAG = { approx: 'aprox.', computed: 'cálculo', uncertain: '¿?' };
  const CERT_TEXT = {
    exact: 'Fecha que da la fuente.',
    approx: 'Fecha aproximada: la fuente dice «c.» o da una estación.',
    computed: 'Fecha calculada por nosotros, o situada por el orden del relato.',
    uncertain: 'Fecha dudosa: le falta un extremo o la fuente duda.',
  };
  const PREC_TEXT = { day: 'al día', month: 'al mes', season: 'a la estación', year: 'al año', years: 'entre varios años' };

  // ---------- Marcas ----------
  const ITEMS = [];
  const BY_ID = new Map();
  const journeyIndex = Object.fromEntries(D.marks.filter((m) => m.kind === 'journey').sort((a, b) => a.start - b.start).map((m, i) => [m.id, i]));
  let eraIndex = 0;
  function add(it) { it.el = null; it.row = 0; ITEMS.push(it); BY_ID.set(it.id, it); LANE[it.lane].items.push(it); }
  for (const m of D.marks) {
    const moment = m.kind === 'event' || m.kind === 'letter' || (m.kind === 'stop' && m.end <= m.start);
    const it = {
      id: m.id, m, lane: m.lane, name: m.name, cert: m.certainty, start: m.start, end: Math.max(m.end, m.start),
      shape: moment ? 'moment' : 'span', group: m.kind === 'stop' ? 1 : 0, kind: m.type || m.kind, openEnd: m.openEnd || null,
    };
    if (moment) {
      it.anchor = (m.start + m.end) / 2;
      const w = m.stated || [m.start, m.end];
      it.w0 = Math.min(w[0], m.start); it.w1 = Math.max(w[1], m.end);
    }
    if (m.kind === 'period' && m.type === 'era') it.colorIdx = eraIndex++;
    add(it);
    (m.secular || []).forEach((s, i) => add({
      id: `${m.id}#secular${i}`, m, lane: 'secular', name: m.name, cert: 'exact', start: s.start, end: Math.max(s.end, s.start + DAY),
      shape: 'span', group: 0, kind: 'secular', secularDate: s.date,
    }));
  }
  // Meses hebreos y fiestas (solo a escala de meses y de días).
  for (const h of HEB) {
    const Y = Math.floor(h.start);
    add({ id: `mes:${h.start.toFixed(4)}`, lane: 'meses', name: h.name, fullName: `${h.name} de ${yearName(Y)}`, cert: 'calendar', start: h.start, end: h.end, shape: 'span', group: 0, kind: 'mes', month: h, altIdx: HEB.indexOf(h) });
    (MONTH_INFO[h.id].feasts || []).forEach((f, i) => {
      const a = h.start + (f.from - 1) * DAY, b = h.start + f.to * DAY;
      const one = f.from === f.to;
      add({ id: `fiesta:${h.start.toFixed(4)}:${i}`, lane: 'meses', name: f.name, cert: 'calendar', start: a, end: b, shape: one ? 'moment' : 'span', anchor: (a + b) / 2, w0: a, w1: b, group: 1, kind: 'fiesta', month: h, feast: f });
    });
  }
  const sortKey = (it) => (it.shape === 'moment' ? it.anchor : it.start);

  function colorOf(it) {
    const p = PAL[S.theme];
    const m = it.m;
    switch (it.lane) {
      case 'eras': return p.eras[it.colorIdx % 2];
      case 'imperios': return p.imp[m.id.replace('period:potencia-', '')] || p.emperadores;
      case 'pablo': return p.viajes[journeyIndex[m.kind === 'journey' ? m.id : m.journey] % p.viajes.length];
      case 'meses': return it.kind === 'mes' ? p.mes[it.altIdx % 2] : p.fiesta;
      default: return p[it.lane] || p.sucesos;
    }
  }
  // Hueco quiere decir una sola cosa: fecha calculada por nosotros. Lo dudoso se difumina y lleva «¿?».
  const hollow = (it) => it.cert === 'computed';
  function softEnds(it) {
    // Qué extremos se difuminan: [izquierdo, derecho] en px.
    if (it.cert === 'approx') return [G.fade, G.fade];
    if (it.cert === 'uncertain') {
      if (it.openEnd === 'end') return [0, G.fadeOpen];
      if (it.openEnd === 'start') return [G.fadeOpen, 0];
      return [G.fade, G.fade];
    }
    if ((it.cert === 'computed' || it.cert === 'uncertain') && it.shape === 'moment') return [G.fade, G.fade];
    return [0, 0];
  }

  // ---------- Medir nombres ----------
  const ctx = document.createElement('canvas').getContext('2d');
  function measure() {
    const SANS = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
    const f500 = `500 ${G.fs}px ${SANS}`, fTag = `italic 400 ${G.fs}px ${SANS}`;
    ctx.font = f500;
    const space = ctx.measureText(' ').width;
    for (const it of ITEMS) {
      ctx.font = f500;
      const toks = it.name.split(' ').map((w) => ({ w: ctx.measureText(w).width, gap: space }));
      const tag = TAG[it.cert];
      if (tag) { ctx.font = fTag; toks.push({ w: ctx.measureText(tag).width, gap: 5 }); }
      const full = toks.reduce((sum, t, i) => sum + t.w + (i ? t.gap : 0), 0);
      it.fullW = Math.ceil(full) + 2;   // en una sola línea: así va dentro de una barra que la cabe
      it.lines = 1;
      if (!G.maxLabel || full <= G.maxLabel) { it.labelW = Math.ceil(full) + 2; continue; }
      // En el teléfono un nombre largo va en dos o tres líneas dentro de su fila de 44 px.
      for (let maxW = G.maxLabel; ; maxW += 16) {
        const lines = [];
        let cur = 0;
        for (const t of toks) {
          if (!cur) cur = t.w;
          else if (cur + t.gap + t.w <= maxW) cur += t.gap + t.w;
          else { lines.push(cur); cur = t.w; }
        }
        lines.push(cur);
        if (lines.length <= 3) { it.labelW = Math.ceil(Math.max(...lines)) + 6; it.lines = lines.length; break; }
      }
    }
  }

  // ---------- Filas: cada marca reserva su dibujo y su nombre; la primera fila libre se la queda ----------
  // Todo en píxeles del mundo (desde el principio de la historia, a la escala de ahora): no depende de dónde está la
  // vista, así que arrastrar no cambia la fila de ninguna marca. El nombre va dentro de la barra si cabe entero en una
  // línea; si no, a la derecha del dibujo. En los bordes de la pantalla, rescueEdges lo mete dentro si hay sitio.
  function extent(it, ppy) {
    const lw = it.labelW;
    const px = (t) => (t - RANGE[0]) * ppy;
    let lx, g0, g1;
    if (it.shape === 'span') {
      const x0 = px(it.start), x1 = Math.max(px(it.end), x0 + 3);
      const s = softEnds(it);
      const pad = G.pad + Math.max(s[0], s[1]);
      // Dentro de la barra, en una sola línea, si la barra la cabe entera: nunca un nombre de dos líneas en una barra.
      it.inside = x1 - x0 >= it.fullW + 2 * pad;
      it._pad = pad;
      lx = it.inside ? x0 + pad : x1 + 4;
      g0 = x0; g1 = x1;
      if (it.inside) { it.ext0 = x0; it.ext1 = x1 + 0.5; it._lxw = lx; return; }
    } else {
      const a = px(it.anchor), w0 = px(it.w0), w1 = px(it.w1), r = G.dotR;
      lx = a + r + 4;
      g0 = Math.min(w0, a - r); g1 = Math.max(w1, a + r);
    }
    it._lxw = lx;
    it.ext0 = Math.min(g0, lx);
    const labelOut = lx + lw > g1 + 0.5 || lx < g0 - 0.5;
    it.ext1 = Math.max(g1, lx + lw) + (labelOut || it.shape === 'moment' ? G.gap : 0.5);
  }
  function pack(lane, ppy) {
    const key = `${S.span}|${W()}`;
    if (lane.packKey === key) return;
    lane.packKey = key;
    let base = 0;
    for (const g of [0, 1]) {
      const list = lane.items.filter((it) => it.group === g);
      if (!list.length) continue;
      for (const it of list) extent(it, ppy);
      list.sort((a, b) => a.ext0 - b.ext0 || a.ext1 - b.ext1);
      const ends = [];
      for (const it of list) {
        let r = 0;
        while (r < ends.length && ends[r] > it.ext0) r++;
        ends[r] = it.ext1;
        it.row = base + r;
      }
      base += ends.length;
    }
  }

  // ---------- DOM ----------
  const cuerpo = $('cuerpo'), carriles = $('carriles'), reglaPista = $('regla-pista'), cursorLinea = $('cursor-linea');
  const rejilla = document.createElement('div');
  rejilla.className = 'rejilla-capa';
  rejilla.style.cssText = 'position:absolute;left:var(--nombres);right:0;top:var(--regla-h);pointer-events:none;z-index:0';
  cuerpo.appendChild(rejilla);
  for (const lane of LANES) {
    const row = document.createElement('div');
    row.className = 'carril';
    row.dataset.lane = lane.id;
    // El nombre del carril es un rótulo; mostrar u ocultar carriles va en el menú «Carriles» de la barra, como en el
    // sitio. Así el teclado no pasa por trece botones antes de llegar a una marca.
    const nm = document.createElement('div');
    nm.className = 'carril-nombre';
    const label = document.createElement('div');
    label.className = 'carril-rotulo';
    label.innerHTML = `<span>${lane.name}</span><small></small>`;
    nm.appendChild(label);
    const pista = document.createElement('div');
    pista.className = 'carril-pista';
    pista.setAttribute('role', 'group');
    pista.setAttribute('aria-label', lane.name);
    row.append(nm, pista);
    carriles.appendChild(row);
    Object.assign(lane, { rowEl: row, countEl: label.querySelector('small'), pista, shown: new Set() });
    const opt = document.createElement('label');
    opt.className = 'menu-opcion';
    opt.innerHTML = `<input type="checkbox" checked> <span>${lane.name}</span> <small></small>`;
    opt.querySelector('input').addEventListener('change', (e) => {
      if (e.target.checked) S.folded.delete(lane.id); else S.folded.add(lane.id);
      render();
    });
    $('menu-lista').appendChild(opt);
    lane.menuCount = opt.querySelector('small');
  }

  const W = () => reglaPista.clientWidth;
  const ppyNow = () => W() / S.span;
  const X = (t) => (t - S.v0) * ppyNow();
  const T = (x) => S.v0 + x / ppyNow();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function makeEl(it) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'm';
    b.dataset.id = it.id;
    b.tabIndex = -1;
    const kind = KIND_NAME[it.kind] || 'Marca';
    const cert = it.cert === 'calendar' ? '' : `, ${{ exact: 'fecha de la fuente', approx: 'fecha aproximada', computed: 'fecha calculada', uncertain: 'fecha dudosa' }[it.cert]}`;
    b.setAttribute('aria-label', `${it.name}. ${kind}, ${it.shape === 'moment' ? 'momento' : 'tramo'}${cert}. ${it.m ? it.m.date : rangeText(it.start, it.end)}`);
    b.setAttribute('aria-pressed', 'false');
    const c = colorOf(it);
    if (it.shape === 'span') {
      const bar = document.createElement('span');
      bar.className = 'm-barra' + (hollow(it) ? ' hueca' : '');
      if (hollow(it)) { bar.style.borderColor = c; bar.style.background = PAL[S.theme].surface; } else bar.style.background = c;
      b.appendChild(bar);
      it.barEl = bar;
    } else {
      const win = document.createElement('span');
      win.className = 'm-ventana' + (it.cert === 'exact' || it.cert === 'calendar' ? ' topes' : '');
      win.style.color = c;
      const dot = document.createElement('span');
      dot.className = 'm-punto' + (hollow(it) ? ' hueco' : '');
      if (hollow(it)) { dot.style.borderColor = c; dot.style.background = PAL[S.theme].surface; } else dot.style.background = c;
      b.append(win, dot);
      it.winEl = win; it.dotEl = dot;
    }
    const lab = document.createElement('span');
    lab.className = 'm-nombre';
    const txt = document.createElement('span');
    txt.className = 't';
    txt.textContent = it.name;
    const tag = TAG[it.cert];
    if (tag) { const i = document.createElement('i'); i.textContent = tag; txt.append(' ', i); }
    lab.appendChild(txt);
    if (it.lines > 1) { lab.classList.add('varias'); lab.style.width = `${it.labelW}px`; }
    b.appendChild(lab);
    it.labEl = lab;
    it.el = b;
    return b;
  }
  function mask(el, l, r) {
    const v = l || r ? `linear-gradient(90deg, transparent 0, #000 ${l}px, #000 calc(100% - ${r}px), transparent 100%)` : '';
    el.style.maskImage = v; el.style.webkitMaskImage = v;
  }

  // Coloca una marca visible: devuelve [x0, x1] de su botón.
  const lwOf = (it) => (it.inside ? it.fullW : it.labelW);
  function place(it, w) {
    const ppy = ppyNow();
    const lw = lwOf(it);
    const LIM0 = -60, LIM1 = w + 60;
    let g0, g1, lx;
    if (it.shape === 'span') {
      const x0 = X(it.start), x1r = X(it.end), x1 = Math.max(x1r, x0 + 3);
      const c0 = clamp(x0, LIM0, LIM1), c1 = clamp(x1, LIM0, LIM1);
      const s = softEnds(it);
      const fl = x0 >= LIM0 ? Math.min(s[0], (x1 - x0) / 3) : 0, fr = x1 <= LIM1 ? Math.min(s[1], (x1 - x0) / 3) : 0;
      g0 = c0; g1 = Math.max(c1, c0 + 3);
      lx = it._lxw - (S.v0 - RANGE[0]) * ppy;
      // El nombre dentro de la barra va con la parte que se ve, sin salir de la barra.
      if (it.inside) lx = clamp(Math.max(x0, 4) + it._pad, x0 + it._pad, x1 - it._pad - lw);
      it._bar = [g0, g1 - g0, fl, fr];
    } else {
      it._bar = null;
      const a = X(it.anchor), w0 = X(it.w0), w1 = X(it.w1);
      lx = it._lxw - (S.v0 - RANGE[0]) * ppy;
      const showWin = (w1 - w0) > 2 * G.dotR + 2;
      const c0 = clamp(w0, LIM0, LIM1), c1 = clamp(w1, LIM0, LIM1);
      g0 = showWin ? c0 : a - G.dotR; g1 = showWin ? c1 : a + G.dotR;
      g0 = Math.min(g0, a - G.dotR); g1 = Math.max(g1, a + G.dotR);
      const s = softEnds(it);
      it._win = showWin ? [c0, c1 - c0, w0 >= LIM0 ? Math.min(s[0], (w1 - w0) / 3) : 0, w1 <= LIM1 ? Math.min(s[1], (w1 - w0) / 3) : 0] : null;
      it._dot = a;
    }
    it._g = [g0, g1];
    it._lx = lx;
    hitOf(it);
  }
  function hitOf(it) {
    const LIM0 = -60, LIM1 = W() + 60;
    it._hit = [clamp(Math.min(it._g[0], it._lx), LIM0, LIM1), clamp(Math.max(it._g[1], it._lx + lwOf(it)), LIM0, LIM1)];
    // En táctil, ningún blanco mide menos de 44 px de ancho.
    if (coarse && it._hit[1] - it._hit[0] < 44) { const c = (it._hit[0] + it._hit[1]) / 2; it._hit = [c - 22, c + 22]; }
    if (it._bar) it._labOnFill = it.inside && !hollow(it) && it._lx >= it._bar[0] && it._lx + lwOf(it) <= it._bar[0] + it._bar[1];
  }
  // Un nombre que se saldría por un borde de la franja se mete dentro si su fila tiene sitio (nunca encima de otra marca).
  function rescueEdges(vis, w) {
    const byRow = new Map();
    for (const it of vis) { if (!byRow.has(it.row)) byRow.set(it.row, []); byRow.get(it.row).push(it); }
    for (const list of byRow.values()) {
      list.sort((a, b) => a._hit[0] - b._hit[0]);
      for (let i = 0; i < list.length; i++) {
        const it = list[i], lw = lwOf(it);
        if (it._lx + lw > w - 2) {
          const prevRight = i > 0 ? list[i - 1]._hit[1] : -Infinity;
          // Primero al otro lado del dibujo, si se ve; si no, pegado al borde, en el sitio libre de la fila.
          const drawL = it.shape === 'moment' ? it._dot - G.dotR - 4 : it._g[0] - 4;
          const drawIn = it.shape === 'moment' ? it._dot >= 0 && it._dot <= w : it._g[1] >= 0 && it._g[0] <= w;
          if (drawIn && !it.inside && drawL - lw >= Math.max(4, prevRight + G.gap)) { it._lx = drawL - lw; hitOf(it); }
          else {
            const nx = Math.max(w - lw - 4, prevRight + G.gap);
            if (nx < it._lx) { it._lx = nx; hitOf(it); }
          }
        }
        if (it._lx < 2) {
          const nextLeft = i < list.length - 1 ? list[i + 1]._hit[0] : Infinity;
          const nx = Math.min(4, nextLeft - G.gap - lw);
          if (nx > it._lx) { it._lx = nx; hitOf(it); }
        }
      }
    }
  }

  /** Una marca cuyo nombre no se lee entero en su fila (pegada a un borde, sin sitio al lado) baja a una fila del
      borde, al final del carril, donde su nombre cabe al otro lado de su dibujo. Si su dibujo ni se ve, no está en la
      vista. Nunca se corta un nombre. */
  function edgeRows(vis, w) {
    const occ = new Map();   // fila (clave) -> intervalos ocupados
    const free = (k, a, b) => !(occ.get(k) || []).some(([x, y]) => a < y + G.gap && x < b + G.gap);
    const take = (k, a, b) => { if (!occ.has(k)) occ.set(k, []); occ.get(k).push([a, b]); };
    const unfit = [];
    for (const it of vis) {
      const lw = lwOf(it);
      it._key = it.row;
      it._gone = false;
      const pin = holdEdge && holdEdge.has(it.id);
      if (!pin && it._lx >= 0 && it._lx + lw <= w) { take(it.row, it._hit[0], it._hit[1]); continue; }
      const d0 = it.shape === 'moment' ? it._dot - G.dotR : it._g[0], d1 = it.shape === 'moment' ? it._dot + G.dotR : it._g[1];
      if (d1 < 0 || d0 > w) { it._gone = true; continue; }
      // Una barra que solo asoma unos píxeles por un borde todavía no está en la vista: aparece al arrastrar un poco.
      if (it.shape === 'span' && Math.min(d1, w) - Math.max(d0, 0) < 24) { it._gone = true; continue; }
      if (it.inside) it.inside = false;
      const lw2 = lwOf(it);
      if (d0 - 4 - lw2 >= 2) it._lx = d0 - 4 - lw2;
      else if (d1 + 4 + lw2 <= w - 2) it._lx = d1 + 4;
      else it._lx = Math.max(2, w - lw2 - 2);
      hitOf(it);
      unfit.push(it);
    }
    // Primero una fila del carril que ya se ve y tenga sitio; si no hay, una fila nueva al final. Mientras se arrastra,
    // lo que ya cambió de fila se queda en ella hasta soltar.
    const rowsSeen = [...new Set(vis.filter((it) => !it._gone).map((it) => it.row))].sort((a, b) => a - b);
    unfit.sort((a, b) => (holdEdge && holdEdge.has(b.id) ? 1 : 0) - (holdEdge && holdEdge.has(a.id) ? 1 : 0));
    for (const it of unfit) {
      let k = holdEdge && holdEdge.has(it.id) ? holdEdge.get(it.id) : null;
      if (k == null) {
        k = rowsSeen.find((r) => free(r, it._hit[0], it._hit[1]));
        for (let e = 0; k == null; e++) if (free(100000 + e, it._hit[0], it._hit[1])) k = 100000 + e;
        if (holdEdge) holdEdge.set(it.id, k);
      }
      take(k, it._hit[0], it._hit[1]);
      it._key = k;
    }
  }

  let renderQueued = false;
  function queue() { if (!renderQueued) { renderQueued = true; requestAnimationFrame(() => { renderQueued = false; render(); }); } }

  function render() {
    const w = W();
    if (!w) return;
    clampView();
    const ppy = ppyNow();
    const v1 = S.v0 + S.span;
    let total = 0;
    const empty = [], off = [];
    for (const lane of LANES) {
      const outOfScale = S.span > lane.onlyBelow;
      pack(lane, ppy);
      const vis = [];
      const rr = G.dotR / ppy;
      // Las filas que se reservan son las de lo que hay en la vista y en una pantalla a cada lado: así, al arrastrar
      // hasta una pantalla, no aparece ninguna fila nueva que empuje lo de debajo.
      const near = new Set();
      if (!outOfScale) for (const it of lane.items) {
        const t0 = it.shape === 'moment' ? Math.min(it.w0, it.anchor - rr) : it.start, t1 = it.shape === 'moment' ? Math.max(it.w1, it.anchor + rr) : Math.max(it.end, it.start + 3 / ppy);
        if (t1 >= S.v0 && t0 <= v1) vis.push(it);
        if (t1 >= S.v0 - S.span && t0 <= v1 + S.span) near.add(it.row);
      }
      total += lane.id === 'meses' ? 0 : vis.length;
      const folded = S.folded.has(lane.id);
      // Las filas son las del mundo, sin los huecos de las que no tienen nada a la vista. Mientras se arrastra, ese
      // reparto se congela: ninguna marca cambia de fila, un carril no encoge, y una fila que aparece va abajo del todo.
      // Al soltar se vuelve a apretar, una sola vez.
      if (!outOfScale && !folded) {
        for (const it of vis) place(it, w);
        rescueEdges(vis, w);
        edgeRows(vis, w);
      }
      for (let i = vis.length - 1; i >= 0; i--) if (vis[i]._gone) vis.splice(i, 1);
      const worldRows = [...new Set([...vis.map((it) => it._key), ...(vis.length ? near : [])])].sort((a, b) => a - b);
      let rowMap;
      if (holdRows) {
        rowMap = holdRows.get(lane.id) || new Map();
        for (const r of worldRows) if (!rowMap.has(r)) rowMap.set(r, rowMap.size ? Math.max(...rowMap.values()) + 1 : 0);
        holdRows.set(lane.id, rowMap);
      } else rowMap = new Map(worldRows.map((r, i) => [r, i]));
      for (const it of vis) it._drow = rowMap.get(it._key);
      const nRows = rowMap.size ? Math.max(...rowMap.values()) + 1 : 0;
      const hidden = outOfScale || folded || !nRows;
      lane.rowEl.hidden = hidden;
      if (!outOfScale && !nRows && lane.id !== 'meses') empty.push(lane.name);
      if (folded && !outOfScale && vis.length) off.push(`${lane.name} (${vis.length})`);
      lane.countEl.textContent = vis.length ? `${vis.length} en la vista` : '';
      if (lane.menuCount) lane.menuCount.textContent = outOfScale ? 'solo en meses y días' : `${vis.length} en la vista`;
      lane.pista.style.height = `${Math.max(1, nRows) * G.row + (nRows ? 2 : 0)}px`;
      const keep = new Set();
      if (!hidden) {
        for (const it of vis) {
          keep.add(it.id);
          if (!it.el) lane.pista.appendChild(makeEl(it));
          else if (!it.el.isConnected) lane.pista.appendChild(it.el);
          const [h0, h1] = it._hit;
          const el = it.el;
          el.style.left = `${h0}px`; el.style.width = `${h1 - h0}px`;
          el.style.top = `${it._drow * G.row + 1}px`; el.style.height = `${G.row}px`;
          if (it.barEl) {
            const [bx, bw, fl, fr] = it._bar;
            it.barEl.style.left = `${bx - h0}px`; it.barEl.style.width = `${bw}px`;
            if (it._fl !== fl || it._fr !== fr) { mask(it.barEl, fl, fr); it._fl = fl; it._fr = fr; }
          }
          if (it.winEl) {
            if (it._win) {
              const [wx, ww, fl, fr] = it._win;
              it.winEl.hidden = false;
              it.winEl.style.left = `${wx - h0}px`; it.winEl.style.width = `${ww}px`;
              if (it._fl !== fl || it._fr !== fr) { mask(it.winEl, fl, fr); it._fl = fl; it._fr = fr; }
            } else it.winEl.hidden = true;
            it.dotEl.style.left = `${it._dot - G.dotR - h0}px`;
          }
          it.labEl.style.left = `${it._lx - h0}px`;
          const many = it.lines > 1 && !it.inside;
          it.labEl.classList.toggle('varias', many);
          it.labEl.style.width = many ? `${it.labelW}px` : '';
          const onFill = !!it._labOnFill;
          if (it._onFill !== onFill || it._themeDone !== S.theme) {
            it.labEl.style.color = onFill ? textOn(colorOf(it)) : INK_TEXT[S.theme];
            it.labEl.classList.toggle('fuera', !onFill);
            it._onFill = onFill; it._themeDone = S.theme;
          }
          el.setAttribute('aria-pressed', String(S.sel === it.id));
        }
      }
      for (const id of lane.shown) if (!keep.has(id)) hide(BY_ID.get(id));
      lane.shown = keep;
      lane.visible = hidden ? [] : vis.slice().sort((a, b) => a._hit[0] - b._hit[0] || a.row - b.row);
    }
    rovingTabs();
    const sinNada = $('sin-nada');
    sinNada.textContent = [empty.length ? `Sin nada en esta vista: ${empty.join(', ')}.` : '', off.length ? `Ocultos con el menú «Carriles»: ${off.join(', ')}.` : ''].filter(Boolean).join(' ');
    sinNada.hidden = !sinNada.textContent;
    renderRuler(w, ppy);
    renderCursor(w);
    renderMinimap();
    $('lectura').textContent = `${total} marcas en la vista · ${spanText(S.span)} en pantalla`;
    syncScaleButtons();
    syncSteps();
    saveHash();
  }
  function hide(it) { if (it && it.el && it.el.isConnected) it.el.remove(); }

  function spanText(s) {
    if (s >= 2) return `${Math.round(s)} años`;
    if (s >= 2 / 12) return `${Math.round(s * 12)} meses`;
    return `${Math.round(s * YL)} días`;
  }

  // ---------- Regla ----------
  function ticks(w, ppy) {
    const out = [];
    const minPx = coarse ? 70 : 84;
    const v1 = S.v0 + S.span;
    const dayPx = ppy / YL;
    const inView = (t) => t >= S.v0 - 0.05 * S.span && t <= v1 + 0.01 * S.span;
    const Y0 = Math.floor(S.v0) - 1, Y1 = Math.ceil(v1);
    if (dayPx * 7 >= minPx * 0.6) {
      const every = dayPx >= 26;
      for (let Y = Y0; Y <= Y1; Y++) for (let m = 0; m < 12; m++) {
        if (Y + CUM[m + 1] / YL < S.v0 - 0.01 || monthStart(Y, m) > v1 + 0.01) continue;
        for (let d = 1; d <= CUM[m + 1] - CUM[m]; d++) {
          const t = Y + (CUM[m] + d - 1) / YL;
          if (!inView(t)) continue;
          const labelled = every || d === 1 || d === 8 || d === 15 || d === 22;
          if (!labelled && dayPx < 4) continue;
          out.push({ t, major: labelled, label: labelled ? (d === 1 ? `1 ${MES_C[m]}${m === 0 ? ` ${yearName(Y)}` : ''}` : String(d)) : '' });
        }
      }
      return out;
    }
    const monthPx = ppy / 12;
    if (monthPx * 3 >= minPx * 0.75) {
      const each = monthPx >= minPx * 0.75 ? 1 : 3;
      for (let Y = Y0; Y <= Y1; Y++) for (let m = 0; m < 12; m++) {
        const t = monthStart(Y, m);
        if (!inView(t)) continue;
        const major = m % each === 0;
        out.push({ t, major, label: major ? (m === 0 ? yearName(Y) : MES_C[m]) : '' });
      }
      return out;
    }
    const steps = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
    const step = steps.slice().reverse().find((s) => s * ppy >= minPx) || 1000;
    const minor = steps.find((s) => s < step && s * ppy >= 12);
    // Años redondos a los dos lados del año 1: 10 e.c., 20 e.c.; 10 a.e.c. (año -9), 20 a.e.c. (año -19).
    const roundYears = (st) => {
      const r = [];
      const lo = Math.floor(S.v0) - st, hi = Math.ceil(v1) + st;
      for (let Y = Math.max(st, Math.ceil(lo / st) * st); Y <= hi; Y += st) r.push(Y);
      for (let L = Math.max(st, Math.ceil((1 - hi) / st) * st); 1 - L >= lo; L += st) r.push(1 - L);
      return r;
    };
    const seen = new Set();
    for (const Y of roundYears(step)) { seen.add(Y); out.push({ t: Y, major: true, label: yearName(Y) }); }
    if (minor) for (const Y of roundYears(minor)) if (!seen.has(Y)) out.push({ t: Y, major: false, label: '' });
    return out;
  }
  function renderRuler(w, ppy) {
    const tk = ticks(w, ppy);
    let html = '', grid = '';
    for (const k of tk) {
      const x = X(k.t);
      if (x < 0 || x > w + 5) continue;
      html += `<div class="marca-eje${k.major ? '' : ' menor'}" style="left:${x.toFixed(1)}px">${k.label ? `<span>${k.label}</span>` : ''}</div>`;
      if (k.major) grid += `<div class="rejilla" style="left:${x.toFixed(1)}px"></div>`;
    }
    if (S.sel) {
      const it = BY_ID.get(S.sel);
      const a = X(it.shape === 'moment' ? it.w0 : it.start), b = X(it.shape === 'moment' ? it.w1 : it.end);
      const x0 = clamp(a, -4, w + 4), x1 = clamp(Math.max(b, a + 3), -4, w + 4);
      if (x1 > 0 && x0 < w) html += `<div class="sel-regla" style="left:${x0}px;width:${Math.max(3, x1 - x0)}px" title="${esc(it.name)}"></div>`;
    }
    const x = X(S.t);
    const txt = cursorText(S.t);
    if (x >= 0 && x <= w) html += `<div class="bandera" style="left:${x}px">${txt}</div>`;
    else html += `<div class="bandera fuera" style="${x < 0 ? 'left:4px' : 'right:4px'}">${x < 0 ? '← ' : ''}Cursor: ${txt}${x > w ? ' →' : ''}</div>`;
    reglaPista.innerHTML = html;
    const flag = reglaPista.querySelector('.bandera');
    if (flag && !flag.classList.contains('fuera')) { const fw = flag.offsetWidth; flag.style.left = `${clamp(x, fw / 2 + 2, w - fw / 2 - 2)}px`; }
    // Un rótulo de la regla que quedaría debajo de la bandera del cursor se calla mientras tanto; su raya se queda.
    if (flag) {
      const fr = flag.getBoundingClientRect();
      for (const sp of reglaPista.querySelectorAll('.marca-eje span')) {
        const r = sp.getBoundingClientRect();
        if (r.right > fr.left - 4 && r.left < fr.right + 4 && r.top < fr.bottom && r.bottom > fr.top - 30) sp.style.visibility = 'hidden';
      }
    }
    reglaPista.setAttribute('aria-valuenow', S.t.toFixed(3));
    reglaPista.setAttribute('aria-valuetext', `Cursor en ${txt}`);
    rejilla.innerHTML = grid;
    rejilla.style.height = `${carriles.offsetHeight}px`;
  }
  function renderCursor(w) {
    const x = X(S.t);
    cursorLinea.hidden = x < 0 || x > w;
    cursorLinea.style.left = `${reglaPista.offsetLeft + x - 1}px`;
    cursorLinea.style.height = `${Math.max(cuerpo.scrollHeight, cuerpo.clientHeight)}px`;
  }

  // ---------- Minimapa ----------
  const mm = $('minimapa');
  const ERAS = ITEMS.filter((it) => it.lane === 'eras');
  function renderMinimap() {
    if (!mm.offsetWidth) return;
    const full = RANGE[1] - RANGE[0], mw = mm.clientWidth;
    const mx = (t) => ((t - RANGE[0]) / full) * mw;
    let html = '';
    for (const e of ERAS) html += `<span class="mm-era" style="left:${mx(e.start)}px;width:${Math.max(1, mx(e.end) - mx(e.start))}px;background:${colorOf(e)}"></span>`;
    html += `<span class="mm-marco" style="left:${mx(S.v0)}px;width:${Math.max(3, mx(S.v0 + S.span) - mx(S.v0))}px"></span>`;
    html += `<span class="mm-cursor" style="left:${mx(S.t) - 1}px"></span>`;
    mm.innerHTML = html;
    mm.setAttribute('aria-valuenow', S.v0.toFixed(2));
    mm.setAttribute('aria-valuetext', `Vista desde ${yearOf(S.v0)} hasta ${yearOf(S.v0 + S.span)}`);
  }
  function mmGo(e) {
    const r = mm.getBoundingClientRect();
    const t = RANGE[0] + ((e.clientX - r.left) / r.width) * (RANGE[1] - RANGE[0]);
    S.v0 = t - S.span / 2;
    render();
  }
  mm.addEventListener('pointerdown', (e) => { mm.setPointerCapture(e.pointerId); mmGo(e); const mv = (ev) => mmGo(ev); mm.addEventListener('pointermove', mv); mm.addEventListener('pointerup', () => mm.removeEventListener('pointermove', mv), { once: true }); });
  mm.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); S.v0 += (e.key === 'ArrowLeft' ? -0.5 : 0.5) * S.span; render(); }
  });

  // ---------- Vista y escala ----------
  function clampView() {
    S.span = clamp(S.span, MIN_SPAN, MAX_SPAN);
    const lo = RANGE[0] - S.span * 0.05, hi = RANGE[1] + S.span * 0.05 - S.span;
    S.v0 = hi < lo ? (RANGE[0] + RANGE[1] - S.span) / 2 : clamp(S.v0, lo, hi);
    S.t = clamp(S.t, RANGE[0], RANGE[1]);
  }
  // Cambia la escala dejando quieto el punto «anchor» (el cursor si se ve; si no, el centro).
  function zoomTo(span, anchorT) {
    span = clamp(span, MIN_SPAN, MAX_SPAN);
    if (anchorT == null) anchorT = S.t >= S.v0 && S.t <= S.v0 + S.span ? S.t : S.v0 + S.span / 2;
    const f = (anchorT - S.v0) / S.span;
    S.span = span;
    S.v0 = anchorT - f * span;
    render();
  }
  function nearestScale(span = S.span) {
    let best = SCALES[0], bd = Infinity;
    for (const s of SCALES) { const d = Math.abs(Math.log(s.span / span)); if (d < bd) { bd = d; best = s; } }
    return { s: best, exact: bd < Math.log(1.5) };
  }
  const escalas = document.querySelector('.escalas'), sel = $('escala-select');
  for (const s of SCALES) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = s.name; b.dataset.scale = s.id; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => zoomTo(s.span));
    escalas.appendChild(b);
    const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; sel.appendChild(o);
  }
  const other = document.createElement('option'); other.value = ''; other.textContent = 'Otra escala'; other.disabled = true; sel.appendChild(other);
  sel.addEventListener('change', () => { const s = SCALES.find((x) => x.id === sel.value); if (s) zoomTo(s.span); });
  function syncScaleButtons() {
    const { s, exact } = nearestScale();
    for (const b of escalas.children) b.setAttribute('aria-pressed', String(exact && b.dataset.scale === s.id));
    sel.value = exact ? s.id : '';
  }
  function stepOf() {
    return { milenios: 100, siglos: 10, decadas: 1, anos: 1 / 12, meses: 7 * DAY, dias: DAY }[nearestScale().s.id];
  }
  function keepCursorVisible() {
    if (S.t < S.v0) S.v0 = S.t - 0.1 * S.span;
    else if (S.t > S.v0 + S.span) S.v0 = S.t - 0.9 * S.span;
  }
  function setCursor(t, follow) { S.t = clamp(t, RANGE[0], RANGE[1]); if (follow) keepCursorVisible(); render(); }

  // ---------- Elegir ----------
  function choose(it, pointerT, how, tapY) {
    const before = { t: S.t, v0: S.v0, span: S.span };
    const lo = it.shape === 'moment' ? it.w0 : it.start, hi0 = it.shape === 'moment' ? it.w1 : it.end;
    // La marca es [lo, hi): su final es el primer instante de lo que viene después; el cursor se queda antes.
    const hi = hi0 > lo ? hi0 - Math.min((hi0 - lo) / 2, DAY / 24) : hi0;
    const vlo = Math.max(lo, S.v0), vhi = Math.min(hi, S.v0 + S.span);
    let moved = 'no';
    if (vlo <= vhi) {
      const target = clamp(pointerT != null ? pointerT : S.t, vlo, vhi);
      if (Math.abs(target - S.t) > 1e-9) { S.t = target; moved = 'yes'; }
    } else moved = 'outside';
    S.sel = it.id;
    S.lastClick = { before, after: { t: S.t, v0: S.v0, span: S.span }, how, moved };
    render();
    renderCard(tapY);
    $('vivo').textContent = `Elegido: ${it.name}. ${it.m ? it.m.date : rangeText(it.start, it.end)}. La ficha lo cuenta.`;
  }
  function unselect() { S.sel = null; S.lastClick = null; render(); renderCard(); $('vivo').textContent = 'Nada elegido.'; }

  function renderCard(tapY) {
    const box = $('ficha'), empty = $('ficha-vacia'), full = $('ficha-llena');
    const it = S.sel && BY_ID.get(S.sel);
    box.classList.toggle('vacia', !it);
    // En el teléfono la ficha es una hoja: abajo, o arriba si lo tocado está en la mitad de abajo, para no taparlo.
    if (tapY != null) box.classList.toggle('arriba', tapY > innerHeight * 0.5);
    empty.hidden = !!it; full.hidden = !it;
    if (!it) { carriles.style.paddingBottom = ''; return; }
    const m = it.m || {};
    const c = colorOf(it);
    const sample = it.shape === 'moment'
      ? `<span class="muestra punto" style="${hollow(it) ? `border:2px solid ${c}` : `background:${c}`}"></span>`
      : `<span class="muestra barra" style="${hollow(it) ? `border:1.5px solid ${c}` : `background:${c}`}"></span>`;
    let kind = KIND_NAME[it.kind] || 'Marca';
    if (it.kind === 'stop') { const j = BY_ID.get(m.journey); if (j) kind += ` · ${j.name}`; }
    const rows = [];
    const shapeWord = it.shape === 'moment' ? 'Momento: pasó una vez' : 'Tramo: duró un tiempo';
    rows.push(['Forma', `${sample}${shapeWord}`]);
    if (it.kind === 'mes') {
      const info = MONTH_INFO[it.month.id];
      rows.push(['Fechas', esc(rangeText(it.start, it.end))]);
      rows.push(['Equivale', esc(info.ours)]);
      rows.push(['Cálculo', 'Con lunas nuevas medias: el comienzo real puede variar un día o dos.']);
    } else if (it.kind === 'fiesta') {
      rows.push(['Fecha', esc(`${it.feast.from === it.feast.to ? it.feast.from : `${it.feast.from} a ${it.feast.to}`} de ${it.month.name.toLowerCase()} (${rangeText(it.start, it.end)})`)]);
    } else if (it.kind === 'secular') {
      rows.push(['Fecha', esc(`${it.secularDate} según la cronología secular`)]);
      rows.push(['Bíblica', esc(m.date)]);
    } else {
      rows.push(['Fecha', esc(m.date)]);
      rows.push(['Precisión', esc(`${PREC_TEXT[m.precision] || m.precision}. ${CERT_TEXT[m.certainty] || ''}`)]);
      if (m.stated && it.shape === 'moment') rows.push(['Dibujado', esc(`un punto hacia ${cursorishText(it.anchor)}, dentro de la ventana ${rangeText(it.w0, it.w1)}${m.placed ? ', por el orden del relato' : ''}`)]);
      if (m.openEnd) rows.push(['Sin fecha', m.openEnd === 'end' ? 'No sabemos cuándo acaba: el final se difumina.' : 'No sabemos cuándo empieza: el principio se difumina.']);
      if (m.places && m.places.length) rows.push(['Lugares', esc(m.places.join(', '))]);
      if (m.people && m.people.length) rows.push(['Personas', esc(m.people.join(', '))]);
      if (m.to) rows.push(['A quién', esc(m.to)]);
      if (m.ref) rows.push(['Pasaje', esc(m.ref)]);
      if (m.secular) rows.push(['Secular', esc(m.secular.map((s) => s.date).join('; '))]);
    }
    const lc = S.lastClick;
    let clic = '';
    if (lc) {
      const same = lc.before.span === lc.after.span && lc.before.v0 === lc.after.v0;
      const cur = lc.moved === 'yes' ? `El cursor pasó de ${cursorText(lc.before.t)} a ${cursorText(lc.after.t)}, ${lc.how === 'key' ? 'el punto de la marca más cercano al cursor' : 'el punto de la marca que señalaste'}.`
        : lc.moved === 'outside' ? 'La marca no tiene fechas dentro de la vista, así que el cursor no se movió.'
          : `El cursor ya estaba dentro de la marca y no se movió (${cursorText(lc.after.t)}).`;
      clic = `<p class="clic">${esc(cur)} ${same ? 'La escala y la vista no cambiaron.' : ''}</p>`;
    }
    full.innerHTML = `<button type="button" class="cerrar" id="cerrar" aria-label="Cerrar la ficha y quitar la selección">×</button>
      <p class="ficha-tipo">${esc(kind)}</p>
      <h2>${esc(it.fullName || it.name)}</h2>
      <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
      ${m.summary ? `<p class="resumen">${esc(m.summary)}</p>` : ''}
      ${clic}`;
    $('cerrar').addEventListener('click', () => { const back = it.el; unselect(); if (back && back.isConnected) back.focus(); });
    if (getComputedStyle(box).position === 'fixed') carriles.style.paddingBottom = `${box.offsetHeight + 8}px`;
  }
  function cursorishText(t) { const o = ourDate(t); return `${o.d} ${MES_C[o.m]} ${yearName(o.Y)}`; }

  // ---------- Teclado en las marcas: una sola parada de Tab para toda la franja; flechas por filas ----------
  // Las filas de arriba abajo, carril por carril; cada una con sus marcas visibles de izquierda a derecha.
  function keyRows() {
    const out = [];
    for (const lane of LANES) {
      if (lane.rowEl.hidden || !lane.visible) continue;
      const byRow = new Map();
      for (const it of lane.visible) if (it.el && it._hit[1] > 0 && it._hit[0] < W()) { if (!byRow.has(it._drow)) byRow.set(it._drow, []); byRow.get(it._drow).push(it); }
      for (const r of [...byRow.keys()].sort((a, b) => a - b)) out.push(byRow.get(r).sort((a, b) => a._hit[0] - b._hit[0]));
    }
    return out;
  }
  let focusId = null;
  function rovingTabs() {
    const rows = keyRows();
    const all = rows.flat();
    let target = all.find((it) => it.id === focusId) || all.find((it) => it.id === S.sel) || all[0];
    for (const lane of LANES) for (const id of lane.shown) { const it = BY_ID.get(id); if (it && it.el) it.el.tabIndex = it === target ? 0 : -1; }
  }
  function focusItem(it) {
    focusId = it.id;
    rovingTabs();
    it.el.focus({ preventScroll: false });
  }
  carriles.addEventListener('focusin', (e) => {
    const b = e.target.closest('.m');
    if (b) focusId = b.dataset.id;
  });
  carriles.addEventListener('keydown', (e) => {
    const b = e.target.closest('.m');
    if (!b) return;
    const it = BY_ID.get(b.dataset.id);
    const rows = keyRows();
    const ri = rows.findIndex((r) => r.includes(it));
    if (ri < 0) return;
    const row = rows[ri], i = row.indexOf(it);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const n = row[i + (e.key === 'ArrowRight' ? 1 : -1)];
      if (n) focusItem(n);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault(); focusItem(row[e.key === 'Home' ? 0 : row.length - 1]);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = rows[ri + (e.key === 'ArrowDown' ? 1 : -1)];
      if (!next) return;
      const cx = (it._hit[0] + it._hit[1]) / 2;
      let best = next[0];
      for (const c of next) if (Math.abs((c._hit[0] + c._hit[1]) / 2 - cx) < Math.abs((best._hit[0] + best._hit[1]) / 2 - cx)) best = c;
      focusItem(best);
    } else if (e.key === 'Escape') {
      if (S.sel) { e.preventDefault(); unselect(); b.focus(); }
    }
  });

  // ---------- Ratón y dedo en la franja ----------
  let drag = null, suppressClick = false;
  const pointers = new Map();
  carriles.addEventListener('pointerdown', (e) => {
    const pista = e.target.closest('.carril-pista');
    if (!pista || e.button > 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    suppressClick = false;
    if (pointers.size === 2) {
      const [p, q] = [...pointers.values()];
      drag = { pinch: true, d0: Math.hypot(p.x - q.x, p.y - q.y), span0: S.span, tMid: T((p.x + q.x) / 2 - reglaPista.getBoundingClientRect().left), xMid: (p.x + q.x) / 2 - reglaPista.getBoundingClientRect().left };
      return;
    }
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, v0: S.v0, moved: false, pista, onMark: !!e.target.closest('.m') };
  });
  window.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!drag) return;
    if (drag.pinch && pointers.size >= 2) {
      const [p, q] = [...pointers.values()];
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d > 10) {
        S.span = clamp(drag.span0 * drag.d0 / d, MIN_SPAN, MAX_SPAN);
        S.v0 = drag.tMid - drag.xMid / ppyNow();
        suppressClick = true;
        queue();
      }
      return;
    }
    if (drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moved && Math.abs(dx) > (e.pointerType === 'mouse' ? 6 : 10) && Math.abs(dx) > Math.abs(dy)) {
      drag.moved = true; suppressClick = true; holdRows = new Map(); holdEdge = new Map();
      drag.pista.classList.add('arrastrando');
      try { carriles.setPointerCapture(e.pointerId); } catch (_) { /* nada */ }
    }
    if (drag.moved) { S.v0 = drag.v0 - dx / ppyNow(); queue(); }
  });
  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (!drag) return;
    if (drag.pinch) { if (pointers.size === 0) drag = null; return; }
    if (drag.id !== e.pointerId) return;
    drag.pista.classList.remove('arrastrando');
    if (drag.moved) { holdRows = null; holdEdge = null; queue(); }
    // Un clic sin arrastre en un hueco del carril pone el cursor ahí, como hoy. Con el dedo, un toque a menos de 12 px
    // de una marca de esa fila la elige: el dedo no es un puntero fino.
    if (!drag.moved && !drag.onMark && e.type === 'pointerup') {
      const pr = drag.pista.getBoundingClientRect();
      const x = e.clientX - pr.left, y = e.clientY - pr.top;
      if (e.pointerType !== 'mouse') {
        const lane = LANE[drag.pista.closest('.carril').dataset.lane];
        const row = Math.floor((y - 1) / G.row);
        let best = null, bd = 13;
        for (const it of lane.visible || []) {
          if (it._drow !== row) continue;
          const d = x < it._hit[0] ? it._hit[0] - x : x > it._hit[1] ? x - it._hit[1] : 0;
          if (d < bd) { bd = d; best = it; }
        }
        if (best) { choose(best, T(clamp(x, best._hit[0], best._hit[1])), 'pointer', e.clientY); drag = null; return; }
      }
      setCursor(T(x), false);
    }
    drag = null;
  }
  window.addEventListener('pointerup', endPointer);
  window.addEventListener('pointercancel', (e) => { if (drag && drag.moved === false) drag.onMark = true; endPointer(e); });
  carriles.addEventListener('click', (e) => {
    const b = e.target.closest('.m');
    if (!b) return;
    if (suppressClick) { suppressClick = false; e.preventDefault(); return; }
    const it = BY_ID.get(b.dataset.id);
    if (e.detail === 0) choose(it, null, 'key');
    else choose(it, T(e.clientX - reglaPista.getBoundingClientRect().left), 'pointer', e.clientY);
  });
  carriles.addEventListener('dblclick', (e) => e.preventDefault());

  // Rueda: arriba y abajo baja por los carriles; con Ctrl (o pellizco del panel táctil) cambia la escala; de lado mueve la vista.
  cuerpo.addEventListener('wheel', (e) => {
    const onRuler = !!e.target.closest('.regla');
    const x = e.clientX - reglaPista.getBoundingClientRect().left;
    if (e.ctrlKey || e.metaKey || onRuler) {
      e.preventDefault();
      const f = Math.exp((e.deltaY || e.deltaX) * 0.0022);
      const t = T(x);
      S.span = clamp(S.span * f, MIN_SPAN, MAX_SPAN);
      S.v0 = t - x / ppyNow();
      queue();
    } else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      S.v0 += (e.shiftKey ? e.deltaY || e.deltaX : e.deltaX) / ppyNow();
      queue();
    } else queue();
  }, { passive: false });
  cuerpo.addEventListener('scroll', () => { /* la línea del cursor ocupa todo el alto: no hace falta nada */ });

  // Regla: pulsar o arrastrar mueve el cursor (como hoy).
  reglaPista.addEventListener('pointerdown', (e) => {
    reglaPista.setPointerCapture(e.pointerId);
    const go = (ev) => setCursor(T(ev.clientX - reglaPista.getBoundingClientRect().left), false);
    go(e);
    const mv = (ev) => go(ev);
    reglaPista.addEventListener('pointermove', mv);
    reglaPista.addEventListener('pointerup', () => reglaPista.removeEventListener('pointermove', mv), { once: true });
  });
  reglaPista.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowRight') {
      e.preventDefault();
      const dir = k === 'ArrowLeft' ? -1 : 1;
      if (e.shiftKey) { S.v0 += dir * 0.1 * S.span; render(); } else setCursor(S.t + dir * stepOf(), true);
    } else if (k === 'PageUp' || k === 'PageDown') { e.preventDefault(); S.v0 += (k === 'PageUp' ? -0.9 : 0.9) * S.span; render(); }
    else if (k === '+' || k === '=') { e.preventDefault(); zoomStep(-1); }
    else if (k === '-' || k === '_') { e.preventDefault(); zoomStep(1); }
  });
  function zoomStep(dir) {
    const i = SCALES.indexOf(nearestScale().s);
    const exact = nearestScale().exact;
    let j = i - dir;
    if (!exact) j = dir < 0 ? SCALES.findIndex((s) => s.span < S.span) : SCALES.map((s) => s.span > S.span).lastIndexOf(true);
    const s = SCALES[clamp(j, 0, SCALES.length - 1)];
    zoomTo(s.span);
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.sel && !e.defaultPrevented) unselect();
  });

  // ---------- Anterior, siguiente, reproducir ----------
  function keyInstants() {
    const set = [];
    for (const lane of LANES) if (lane.id !== 'meses' && !S.folded.has(lane.id)) for (const it of lane.items) set.push(sortKey(it));
    return set.sort((a, b) => a - b);
  }
  const STEP_TXT = { milenios: '100 años', siglos: '10 años', decadas: '1 año', anos: '1 mes', meses: '1 semana', dias: '1 día' };
  function syncSteps() {
    const u = STEP_TXT[nearestScale().s.id];
    $('paso-atras').textContent = `‹ ${u}`; $('paso-atras').setAttribute('aria-label', `Cursor: ${u} antes`);
    $('paso-adelante').textContent = `${u} ›`; $('paso-adelante').setAttribute('aria-label', `Cursor: ${u} después`);
  }
  $('paso-atras').addEventListener('click', () => setCursor(S.t - stepOf(), true));
  $('paso-adelante').addEventListener('click', () => setCursor(S.t + stepOf(), true));
  LINEA_COMUN.toolbar(document.querySelector('.mandos'));
  $('saltar').addEventListener('click', (e) => { e.preventDefault(); const b = carriles.querySelector('.m[tabindex="0"]'); if (b) b.focus(); });
  $('ir').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = LINEA_COMUN.parseDate($('ir-fecha').value, HEB.map((h) => ({ name: h.name, s: h.start, e: h.end })));
    if (t == null) { $('vivo').textContent = 'No entiendo esa fecha. Prueba 607 a.e.c., 33 o 14 nisán 33.'; return; }
    // «Ir a» es un mando de moverse: lleva el cursor allí y, si no se ve, la vista con él. La escala no cambia.
    S.t = clamp(t, RANGE[0], RANGE[1]);
    if (S.t < S.v0 || S.t > S.v0 + S.span) S.v0 = S.t - 0.4 * S.span;
    render();
    $('vivo').textContent = `Cursor en ${cursorText(S.t)}.`;
  });
  $('anterior').addEventListener('click', () => { const k = keyInstants().filter((t) => t < S.t - 1e-6); if (k.length) setCursor(k[k.length - 1], true); });
  $('siguiente').addEventListener('click', () => { const k = keyInstants().find((t) => t > S.t + 1e-6); if (k != null) setCursor(k, true); });
  let playing = null;
  $('reproducir').addEventListener('click', () => {
    const b = $('reproducir');
    if (playing) { cancelAnimationFrame(playing.raf); playing = null; b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', 'Reproducir'); return; }
    b.setAttribute('aria-pressed', 'true'); b.setAttribute('aria-label', 'Pausa');
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000; last = now;
      S.t += (S.span / 24) * dt;
      if (S.t > S.v0 + 0.9 * S.span) S.v0 = S.t - 0.1 * S.span;
      if (S.t >= RANGE[1]) { S.t = RANGE[1]; render(); $('reproducir').click(); return; }
      render();
      playing.raf = requestAnimationFrame(tick);
    };
    playing = { raf: requestAnimationFrame(tick) };
  });
  document.addEventListener('keydown', (e) => {
    if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.target.closest('.regla-pista, .m, .minimapa, select, input')) {
      e.preventDefault(); $(e.key === 'ArrowLeft' ? 'anterior' : 'siguiente').click();
    }
  });

  // ---------- Tema ----------
  function setTheme(th) {
    S.theme = th;
    document.documentElement.dataset.theme = th;
    const b = $('tema');
    b.setAttribute('aria-pressed', String(th === 'dark'));
    b.textContent = th === 'dark' ? 'Tema claro' : 'Tema oscuro';
    for (const it of ITEMS) if (it.el) { it.el.remove(); it.el = null; it._fl = it._fr = undefined; }
    for (const l of LANES) l.shown.clear();
    render();
    renderCard();
  }
  $('tema').addEventListener('click', () => setTheme(S.theme === 'dark' ? 'light' : 'dark'));

  // ---------- Dirección: fecha, escala, vista y selección ----------
  let hashTimer = 0;
  function saveHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => {
      const { s, exact } = nearestScale();
      const p = new URLSearchParams();
      p.set('t', S.t.toFixed(4));
      p.set('escala', exact && Math.abs(s.span - S.span) < 1e-9 ? s.id : S.span.toPrecision(5));
      p.set('desde', S.v0.toFixed(4));
      if (S.sel) p.set('sel', S.sel);
      p.set('tema', S.theme === 'dark' ? 'oscuro' : 'claro');
      history.replaceState(null, '', `#${p}`);
    }, 150);
  }
  function loadHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    const t = parseFloat(p.get('t'));
    if (Number.isFinite(t)) S.t = t;
    const s = SCALES.find((x) => x.id === p.get('escala'));
    const sp = parseFloat(p.get('escala'));
    S.span = s ? s.span : Number.isFinite(sp) ? sp : 8;
    const v = parseFloat(p.get('desde'));
    S.v0 = Number.isFinite(v) ? v : S.t - 0.4 * S.span;
    const id = p.get('sel');
    S.sel = id && BY_ID.has(id) ? id : null;
    return p.get('tema') === 'oscuro' ? 'dark' : p.get('tema') === 'claro' ? 'light' : null;
  }

  // ---------- Arranque ----------
  const themeFromHash = loadHash();
  const start = () => {
    measure();
    setTheme(themeFromHash || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    new ResizeObserver(() => render()).observe(reglaPista);
    window.LINEA = { S, ITEMS, LANES, BY_ID, render, zoomTo, X, T, G, W };
    document.documentElement.dataset.listo = '1';
  };
  Promise.all(['500 12px Inter', 'italic 400 12px Inter', '500 13px Inter'].map((f) => document.fonts.load(f))).then(() => document.fonts.ready).then(start, start);
})();
