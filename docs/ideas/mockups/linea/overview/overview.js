/* Panorama y detalle: prototipo de la línea de tiempo.
   Arriba, un panorama fijo de toda la historia con una ventana que se arrastra. Abajo, la ventana en detalle:
   cada marca en su fila con el nombre entero debajo. Una marca pulsada se selecciona; la escala y la vista no cambian,
   y el cursor da el paso más corto para quedar dentro de las fechas de la marca. */
(() => {
  'use strict';

  const D = window.TIMELINE_DATA;
  const DAY = D.day;
  const R0 = D.range[0], R1 = D.range[1];
  const SPAN_MIN = Math.max(D.spanMin || 0.03, 0.03), SPAN_MAX = R1 - R0;
  const SCALES = D.scales;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const GAP = 10;               // espacio mínimo entre dos marcas de una fila
  const PHONE_MQ = window.matchMedia('(max-width: 700px), (pointer: coarse)');

  /* ---------- Fechas ---------- */
  const yearOf = (t) => Math.floor(t + 1e-9);
  const yearName = (y) => (y >= 1 ? `${y} e.c.` : `${1 - y} a.e.c.`);
  const GREG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  // Meses hebreos de los datos, en orden; para los años sin datos se usan nuestros meses.
  const HEB = [];
  for (const y of D.calendar.years) for (const [id, name, s, e, alt] of y.months) HEB.push({ id, name, s, e, alt: !!alt, heb: true });
  HEB.sort((a, b) => a.s - b.s);
  function hebAt(t) {
    let lo = 0, hi = HEB.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1, m = HEB[mid];
      if (t < m.s) hi = mid - 1; else if (t >= m.e) lo = mid + 1; else return m;
    }
    return null;
  }
  function hebNextStart(t) {
    let lo = 0, hi = HEB.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (HEB[mid].s <= t) lo = mid + 1; else hi = mid; }
    return lo < HEB.length ? HEB[lo].s : Infinity;
  }
  function monthAt(t) {
    const h = hebAt(t);
    if (h) return h;
    const y = yearOf(t), i = clamp(Math.floor((t - y) * 12), 0, 11);
    const s = y + i / 12;
    return { name: GREG[i], s, e: Math.min(y + (i + 1) / 12, hebNextStart(t)), heb: false };
  }
  function monthsBetween(t0, t1) {
    const out = [];
    let cur = t0, n = 0;
    while (cur < t1 && n++ < 400) {
      const m = monthAt(cur);
      out.push(m);
      cur = Math.max(m.e, cur + 1e-7);
    }
    return out;
  }
  function dayDate(t) {
    const m = monthAt(t);
    const d = Math.floor((t - m.s) / DAY + 1e-6) + 1;
    return `${d} ${m.name.toLowerCase()} ${yearName(yearOf(t))}`;
  }
  function monthDate(t) { return `${monthAt(t).name.toLowerCase()} ${yearName(yearOf(t))}`; }
  function cursorText(t) {
    if (S.span <= 2.5) return dayDate(t);
    if (S.span <= 12) return monthDate(t);
    return yearName(yearOf(t));
  }
  function fmtRange(a, b) {
    if (b - a < 0.2 && b > a) {
      const x = dayDate(a), y = dayDate(b - Math.min(DAY / 2, (b - a) / 2));
      return x === y ? x : `${x} - ${y}`;
    }
    const ya = yearOf(a), yb = yearOf(Math.max(a, b - 1e-6));
    if (ya === yb) return yearName(ya);
    if (ya >= 1) return `${ya}-${yb} e.c.`;
    if (yb < 1) return `${1 - ya}-${1 - yb} a.e.c.`;
    return `${yearName(ya)} - ${yearName(yb)}`;
  }

  /* ---------- Marcas ---------- */
  const TAG = { approx: 'aprox.', computed: 'calculada', uncertain: 'dudosa' };
  const KIND = {
    event: () => 'Suceso', letter: () => 'Carta', journey: () => 'Viaje de Pablo', stop: () => 'Parada de un viaje', feast: () => 'Fiesta',
    period: (m) => (m.type === 'era' ? 'Era' : 'Potencia mundial'),
    ruler: (m) => ({ rey: 'Reinado', emperador: 'Emperador', gobernador: 'Gobernador', 'sumo-sacerdote': 'Sumo sacerdote' }[m.type] || 'Gobernante'),
  };
  const EMP = { 'potencia-egipcia': 'egipto', 'potencia-asiria': 'asiria', 'potencia-babilonica': 'babilonia', 'potencia-medopersa': 'persia', 'potencia-griega': 'grecia', 'potencia-romana': 'roma' };
  const LANE_ORDER = ['eras', 'imperios', 'fiestas', 'pablo', 'cartas', 'sucesos', 'emperadores', 'reyes-jerusalen', 'reyes-samaria', 'reyes-persia', 'gobernadores', 'sacerdotes'];
  const LANE_NAME = Object.fromEntries(D.lanes.map((l) => [l.id, l.name]));
  LANE_NAME.pablo = 'Pablo: viajes y paradas';
  LANE_NAME.fiestas = 'Fiestas del calendario hebreo';
  const LANE_NOUN = { sucesos: ['suceso', 'sucesos'], pablo: ['viaje o parada', 'viajes y paradas'], cartas: ['carta', 'cartas'], fiestas: ['fiesta', 'fiestas'] };

  function prep(m) {
    const o = Object.assign({}, m);
    o.span = m.kind === 'period' || m.kind === 'ruler' || m.kind === 'journey' ||
      (m.kind === 'stop' && m.end - m.start > 1e-6) || (m.kind === 'feast' && m.end - m.start > DAY * 1.5);
    if (o.span) { o.lo = m.start; o.hi = m.end; }
    else {
      const w = m.stated || [m.start, m.end];
      o.lo = Math.min(w[0], m.start); o.hi = Math.max(w[1], m.end);
    }
    o.at = (m.start + m.end) / 2;
    o.tag = TAG[m.certainty] || '';
    o.kindName = KIND[m.kind] ? KIND[m.kind](m) : m.kind;
    if (m.kind === 'period' && EMP[m.id.slice(7)]) o.color = `var(--emp-${EMP[m.id.slice(7)]})`;
    return o;
  }

  // Fiestas: los datos traen los meses y el día de cada fiesta; aquí se sitúan en cada año con meses.
  const FEASTS = [];
  const MONTH_INFO = Object.fromEntries(D.calendar.months.map((m) => [m.id, m]));
  for (const h of HEB) {
    for (const f of (MONTH_INFO[h.id] && MONTH_INFO[h.id].feasts) || []) {
      const y = yearOf(h.s);
      FEASTS.push({
        id: `feast:${h.id}-${f.from}-${y}-${f.name.length}`, kind: 'feast', lane: 'fiestas', name: f.name,
        start: h.s + (f.from - 1) * DAY, end: h.s + f.to * DAY,
        date: `${f.from === f.to ? f.from : `${f.from}-${f.to}`} ${h.name.toLowerCase()} ${yearName(y)}`,
        precision: 'day', certainty: 'computed',
        summary: `Fiesta del mes de ${h.name.toLowerCase()} (${MONTH_INFO[h.id].ours}). El mes sale de nuestro cálculo por lunas nuevas medias, así que el día puede moverse uno o dos.`,
      });
    }
  }

  const MARKS = D.marks.map(prep).concat(FEASTS.map(prep));
  MARKS.forEach((o, i) => { o.ix = i; });
  const BY_ID = new Map(MARKS.map((o) => [o.id, o]));
  const BY_LANE = {};
  for (const l of LANE_ORDER) BY_LANE[l] = [];
  for (const o of MARKS) (BY_LANE[o.lane] || (BY_LANE[o.lane] = [])).push(o);
  for (const l of LANE_ORDER) BY_LANE[l].sort((a, b) => a.lo - b.lo);
  const JOURNEY = new Map(D.marks.filter((m) => m.kind === 'journey').map((m) => [m.id, m.name]));
  const STARTS = MARKS.filter((o) => o.kind !== 'feast').map((o) => o.start).sort((a, b) => a - b);

  /* ---------- Estado ---------- */
  const S = { t: 50.5, v0: 50.5 - 0.4 * 8, span: 8, sel: null, open: new Set(), openWide: new Set(), note: null, list: null };
  let detW = 1000, panoW = 1000, phone = PHONE_MQ.matches;
  let RH = 30, DOT = 10;

  function scaleIndex(span) {
    let best = 0, bd = Infinity;
    SCALES.forEach((s, i) => { const d = Math.abs(Math.log(span / s.span)); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function clampView() {
    S.span = clamp(S.span, SPAN_MIN, SPAN_MAX);
    const m = S.span * 0.02;
    S.v0 = clamp(S.v0, R0 - m, R1 + m - S.span);
  }
  // El cursor puede quedarse fuera de la ventana: moverse por el tiempo no cambia la fecha. La bandera dice dónde está.
  function clampCursor() { S.t = clamp(S.t, R0, R1); }

  /* ---------- Medir textos ---------- */
  const ctx = document.createElement('canvas').getContext('2d');
  const wcache = new Map();
  function textW(txt, font) {
    const k = font + '|' + txt;
    let w = wcache.get(k);
    if (w === undefined) { ctx.font = font.replace(/Inter$/, 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif'); w = ctx.measureText(txt).width; wcache.set(k, w); }
    return w;
  }
  function labelW(o) {
    const lab = phone ? 13 : 12;
    let w = textW(o.name, `500 ${lab}px Inter`);
    if (o.tag) w += textW(` · ${o.tag}`, '500 11.5px Inter');
    return Math.ceil(w) + 3;
  }

  /* ---------- Elementos ---------- */
  const el = {
    fecha: $('fecha'), escalas: $('escalas'), ventanaTxt: $('ventana-txt'), tema: $('tema'),
    pista: $('pano-pista'), svg: $('pano-svg'), pcur: $('pano-cursor'), psel: $('pano-sel'), win: $('pano-ventana'), lupa: $('lupa'),
    rango: $('pano-rango'), detalle: $('detalle'), eje: $('eje'), ejeA: $('eje-arriba'), ejeB: $('eje-abajo'), bandera: $('bandera'),
    carriles: $('carriles'), clinea: $('cursor-linea'), ficha: $('ficha'), vivo: $('vivo'),
  };
  el.rango.textContent = `${yearName(R0)} - ${yearName(R1 - 1)}`;

  const lanes = {};
  for (const id of LANE_ORDER) {
    const sec = document.createElement('section');
    sec.className = `carril l-${id}`;
    sec.dataset.lane = id;
    sec.hidden = true;
    sec.innerHTML = `<h2 class="carril-cab" id="cab-${id}"></h2><div class="carril-filas" role="group" aria-labelledby="cab-${id}"></div>`;
    el.carriles.appendChild(sec);
    lanes[id] = { sec, head: sec.firstChild, rows: sec.lastChild, nodes: new Map(), nav: [] };
  }

  SCALES.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = s.name;
    b.dataset.span = s.span;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => setSpan(s.span));
    el.escalas.appendChild(b);
  });

  /* ---------- Cambiar la escala y mover la vista (solo con gestos de mover, nunca al pulsar una marca) ---------- */
  function setSpan(span, anchorT = S.t, anchorFrac = null) {
    const f = anchorFrac === null ? (anchorT - S.v0) / S.span : anchorFrac;
    S.span = clamp(span, SPAN_MIN, SPAN_MAX);
    S.v0 = anchorT - f * S.span;
    clampView(); clampCursor(); schedule();
  }
  function zoomStep(dir) {
    const i = scaleIndex(S.span);
    const cur = SCALES[i].span;
    let j = i;
    if (dir > 0) j = S.span > cur * 1.05 ? i : i + 1; else j = S.span < cur / 1.05 ? i : i - 1;
    j = clamp(j, 0, SCALES.length - 1);
    setSpan(SCALES[j].span);
  }
  function panBy(dt) { S.v0 += dt; clampView(); clampCursor(); schedule(); }

  /* ---------- Dibujo ---------- */
  let queued = false;
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; render(); }); } }
  function measure() {
    phone = PHONE_MQ.matches;
    RH = phone ? 48 : 32; DOT = phone ? 12 : 10;
    detW = el.carriles.clientWidth || 1000;
    panoW = el.pista.clientWidth || 1000;
  }

  function render() {
    measure();
    renderToolbar();
    renderPanoDynamic();
    renderRuler();
    renderLanes();
    renderCursor();
    syncSteps();
    saveHash();
  }

  function renderToolbar() {
    el.fecha.textContent = cursorText(S.t);
    const i = scaleIndex(S.span), on = Math.abs(Math.log(S.span / SCALES[i].span)) < 0.12;
    [...el.escalas.children].forEach((b, k) => b.setAttribute('aria-pressed', String(on && k === i)));
    el.ventanaTxt.textContent = `Ventana: ${fmtRange(S.v0, S.v0 + S.span)}`;
  }

  /* Panorama: fijo, toda la historia. Eras con su nombre, cuántos hechos hay en cada época, la ventana y el cursor. */
  let panoStaticKey = '';
  function renderPanoStatic() {
    const key = `${panoW}|${document.documentElement.dataset.tema || ''}`;
    if (key === panoStaticKey) return;
    panoStaticKey = key;
    const W = panoW, k = W / (R1 - R0), X = (t) => (t - R0) * k;
    const DENS_H = 18, BAND_Y = 20, BAND_H = 17;
    // Densidad: cuántas marcas empiezan en cada tramo de 3 px.
    const n = Math.ceil(W / 3), c = new Array(n).fill(0);
    for (const o of MARKS) if (o.kind !== 'feast' && o.kind !== 'period') c[clamp(Math.floor(X(o.span ? o.start : o.at) / 3), 0, n - 1)]++;
    const max = Math.max(...c);
    let dens = '';
    c.forEach((v, i) => { if (v) { const h = Math.max(1.5, DENS_H * Math.sqrt(v / max)); dens += `<rect class="dens" x="${i * 3}" y="${DENS_H - h}" width="2.4" height="${h}"/>`; } });
    // Eras: el nombre dentro si cabe; si no, debajo, en el orden de las eras, en tan pocas filas como se pueda,
    // cada nombre lo más cerca de su era y con una guía hasta ella.
    const eras = MARKS.filter((o) => o.kind === 'period' && o.type === 'era');
    let band = '', labels = '';
    const out = [];
    eras.forEach((o, i) => {
      const a = X(o.start), b = X(o.end), w = Math.max(1, b - a);
      const fill = i % 2 ? 'color-mix(in srgb, var(--node-periodo) 78%, var(--ink))' : 'var(--node-periodo)';
      band += `<rect class="era" x="${a}" y="${BAND_Y}" width="${w}" height="${BAND_H}" style="fill:${fill}"/>`;
      const tw = textW(o.name, '600 12px Inter') + 2;
      if (tw + 8 <= w) labels += `<text class="era-txt" x="${a + 4}" y="${BAND_Y + 12.5}">${esc(o.name)}</text>`;
      else out.push({ o, mid: (a + b) / 2, tw });
    });
    let rowsN = 0;
    for (let k = 1; k <= 6 && out.length; k++) {
      const rows = Array.from({ length: k }, () => []);
      out.forEach((l, i) => rows[i % k].push(l));
      let ok = true;
      for (const row of rows) {
        let end = -Infinity;
        for (const l of row) { l.x = Math.max(clamp(l.mid - l.tw / 2, 0, W - l.tw), end + 8); end = l.x + l.tw; }
        let next = W + 8;
        for (let j = row.length - 1; j >= 0; j--) { const l = row[j]; l.x = Math.min(l.x, next - 8 - l.tw); next = l.x; }
        if (row.length && row[0].x < 0) ok = false;
      }
      if (ok || k === 6) {
        rows.forEach((row, r) => row.forEach((l) => { l.r = r; }));
        rowsN = k;
        break;
      }
    }
    for (const l of out) {
      const ly = BAND_Y + BAND_H + 12 + l.r * 13;
      const tx = clamp(l.mid, l.x + 2, l.x + l.tw - 2);
      labels += `<path class="era-guia" d="M${l.mid} ${BAND_Y + BAND_H} L${tx} ${ly - 10}" fill="none"/>`;
      labels += `<text class="era-txt era-txt--fuera" x="${Math.max(0, l.x)}" y="${ly}">${esc(l.o.name)}</text>`;
    }
    const rowsEnd = { length: rowsN };
    const h = BAND_Y + BAND_H + 4 + rowsEnd.length * 13 + (rowsEnd.length ? 2 : 0);
    el.pista.style.setProperty('--pano-h', `${h + 2}px`);   // + el borde: el dibujo y el puntero usan la misma escala
    el.svg.setAttribute('viewBox', `0 0 ${W} ${h}`);
    el.svg.innerHTML = `${dens}<text class="dens-txt" x="4" y="10">hechos por época</text>${band}${labels}`;
  }

  function renderPanoDynamic() {
    renderPanoStatic();
    const W = panoW, k = W / (R1 - R0);
    let x = (S.v0 - R0) * k, w = S.span * k;
    const minW = phone ? 44 : 14;   // en táctil, la ventana mide al menos 44 px para poder cogerla
    const narrow = w < minW;
    if (narrow) { x = x + w / 2 - minW / 2; w = minW; }
    el.win.style.left = `${x}px`;
    el.win.style.width = `${w}px`;
    el.win.classList.toggle('estrecha', w < 40);
    el.win.setAttribute('aria-valuenow', String(Math.round(S.v0 + S.span / 2)));
    el.win.setAttribute('aria-valuetext', `Ventana: ${fmtRange(S.v0, S.v0 + S.span)}`);
    el.pcur.style.left = `${(S.t - R0) * k}px`;
    if (S.sel && BY_ID.has(S.sel)) {
      const o = BY_ID.get(S.sel);
      el.psel.hidden = false;
      el.psel.style.left = `${(o.span ? (o.start + o.end) / 2 : o.at) * k - R0 * k}px`;
    } else el.psel.hidden = true;
    // La lupa une la ventana del panorama con la franja de detalle.
    const dl = el.carriles.getBoundingClientRect(), pl = el.pista.getBoundingClientRect();
    const L = dl.left - pl.left, Rr = L + detW;
    el.lupa.setAttribute('viewBox', `0 0 ${W} 14`);
    el.lupa.innerHTML = `<path d="M${x} 0 L${x + w} 0 L${Rr} 14 L${L} 14 Z"/>`;
  }

  /* Regla de la franja de detalle: una sola, cuyas unidades cambian con la escala. */
  const STEPS = [1000, 500, 250, 100, 50, 25, 10, 5, 2, 1];
  function renderRuler() {
    const W = detW, v0 = S.v0, v1 = v0 + S.span, pxy = W / S.span, X = (t) => (t - v0) * pxy;
    let top = '', bot = '';
    if (S.span > 2.5) {
      const step = STEPS.find((s, i) => STEPS[i + 1] === undefined || STEPS[i + 1] * pxy < 92) || 1;
      const minor = { 1000: 100, 500: 100, 250: 50, 100: 10, 50: 10, 25: 5, 10: 1, 5: 1, 2: 1, 1: 0 }[step];
      const ticks = (st, cls, withLabel) => {
        // Años que se escriben como múltiplos de st, a los dos lados del año 1.
        const out = [];
        const dMaxBce = Math.floor((1 - v0) / st), dMinBce = Math.ceil((1 - v1) / st);
        for (let k = Math.max(1, dMinBce); k <= dMaxBce; k++) out.push(1 - k * st);
        for (let k = Math.max(1, Math.ceil(v0 / st)); k * st <= v1; k++) out.push(k * st);
        for (const y of out) {
          const x = X(y);
          if (x < -1 || x > W + 1) continue;
          bot += `<span class="marca ${cls}" style="left:${x}px"></span>`;
          if (withLabel && x > 24 && x < W - 24) bot += `<span class="marca-txt" style="left:${x}px">${yearName(y)}</span>`;
        }
      };
      if (minor && minor * pxy > 5) ticks(minor, 'marca--menor', false);
      if (S.span <= 12) {
        // En años: las marcas pequeñas son los meses.
        for (const m of monthsBetween(v0, v1)) { const x = X(m.s); if (x > 0) bot += `<span class="marca marca--menor" style="left:${x}px"></span>`; }
      }
      ticks(step, 'marca--mayor', true);
    } else if (S.span > 0.3) {
      for (let y = yearOf(v0); y <= v1; y++) {
        const a = Math.max(X(y), 0), b = Math.min(X(y + 1), W);
        if (b - a > 2) top += `<span class="celda" style="left:${a}px;width:${b - a}px">${b - a > 60 ? yearName(y) : ''}</span>`;
      }
      for (const m of monthsBetween(v0, v1)) {
        const a = Math.max(X(m.s), 0), b = Math.min(X(m.e), W), w = b - a;
        const fits = textW(m.name, '600 11.5px Inter') + 10 < w;
        bot += `<span class="celda${m.heb ? '' : ' celda--ajena'}" style="left:${a}px;width:${w}px">${fits ? esc(m.name) : ''}</span>`;
      }
    } else {
      const months = monthsBetween(v0, v1);
      for (const m of months) {
        const a = Math.max(X(m.s), 0), b = Math.min(X(m.e), W), w = b - a;
        const txt = `${m.name} · ${yearName(yearOf(m.s + 0.01))}`;
        const t2 = textW(txt, '600 11.5px Inter') + 10 < w ? txt : textW(m.name, '600 11.5px Inter') + 10 < w ? m.name : '';
        top += `<span class="celda${m.heb ? '' : ' celda--ajena'}" style="left:${a}px;width:${w}px">${esc(t2)}</span>`;
      }
      const dpx = DAY * pxy;
      const step = [1, 2, 5, 7, 10, 15].find((s) => s * dpx >= 24) || 15;
      for (const m of months) {
        const nd = Math.round((m.e - m.s) / DAY);
        for (let d = 1; d <= nd; d++) {
          const x = X(m.s + (d - 1) * DAY);
          if (x < -1 || x > W + 1) continue;
          const lab = step === 1 || (d - 1) % step === 0;
          bot += `<span class="marca ${lab ? 'marca--mayor' : 'marca--menor'}" style="left:${x}px"></span>`;
          if (lab && x + dpx / 2 > 8 && x + dpx / 2 < W - 8) bot += `<span class="marca-txt" style="left:${x + Math.min(dpx / 2, 12)}px">${d}</span>`;
        }
      }
    }
    el.ejeA.innerHTML = top;
    el.ejeB.innerHTML = bot;
  }

  function renderCursor() {
    const x = (S.t - S.v0) * (detW / S.span);
    const inView = x >= 0 && x <= detW;
    el.clinea.hidden = !inView;
    el.clinea.style.left = `${x}px`;
    // Si el cursor queda fuera de la ventana, la bandera lo dice en el borde de su lado, con una flecha.
    const txt = inView ? cursorText(S.t) : x < 0 ? `← Cursor: ${cursorText(S.t)}` : `Cursor: ${cursorText(S.t)} →`;
    el.bandera.textContent = txt;
    el.bandera.classList.toggle('fuera', !inView);
    const fw = textW(txt, '600 11.5px Inter') + 20;
    const left = inView ? clamp(x - fw / 2, 0, detW - fw) : x < 0 ? 0 : detW - fw;
    el.bandera.style.left = `${left}px`;
    el.bandera.style.setProperty('--pico', `${clamp(x - left, 6, fw - 6)}px`);
    el.bandera.setAttribute('aria-valuenow', String(S.t));
    el.bandera.setAttribute('aria-valuetext', cursorText(S.t));
    // Un rótulo de la regla que quedaría debajo de la bandera se calla mientras tanto; su raya se queda.
    const fr = { l: left - 4, r: left + fw + 4 };
    const eje = el.eje.getBoundingClientRect();
    for (const t of el.eje.querySelectorAll('.marca-txt, .celda')) {
      const r = t.getBoundingClientRect(), a = r.left - eje.left, b = r.right - eje.left;
      const under = b > fr.l && a < fr.r && r.bottom > eje.top + 12;
      if (t.classList.contains('celda')) t.style.color = under ? 'transparent' : ''; else t.style.visibility = under ? 'hidden' : '';
    }
  }

  /* ---------- Carriles ---------- */
  function budget(lane) {
    if (S.open.has(lane)) return Infinity;
    return defaultBudget(lane);
  }
  // Lo que se ve en cada escala: en meses y días, todo con su nombre; de milenios a años, unas pocas filas por
  // carril y el resto en grupos «+N más» que se abren en el sitio.
  function defaultBudget(lane) {
    const k = scaleIndex(S.span);
    if (k >= 4) return Infinity;
    const T = phone
      ? { sucesos: [4, 6, 10, 14], pablo: [2, 3, 4, 6], cartas: [2, 3, 4, 5] }
      : { sucesos: [5, 6, 9, 13], pablo: [3, 3, 5, 8], cartas: [2, 3, 5, 6] };
    return T[lane] ? T[lane][k] : phone ? 3 : 4;
  }

  /** Filas de un carril en píxeles del mundo (desde el principio de la historia, a la escala de ahora): el nombre va
      donde empieza la marca, así que la fila de cada marca no depende de dónde está la vista y arrastrar no la cambia.
      Se calcula una vez por escala. */
  const worldCache = new Map();   // carril -> { key, res }: cada carril guarda su clave, porque «todas las filas» es de un carril
  function worldRows(id, items) {
    const key = `${S.span}|${detW}|${phone}|${S.openWide.has(id)}`;
    const hit = worldCache.get(id);
    if (hit && hit.key === key) return hit.res;
    const ppy = detW / S.span, X = (t) => (t - R0) * ppy;
    const geo = items.map((o) => geom(o, X, detW, true));
    const when = (o) => (o.span ? o.start : o.at);
    geo.sort((p, q) => when(p.o) - when(q.o) || p.o.ix - q.o.ix);
    const ends = [];
    for (const g of geo) {
      let r = 0;
      while (r < ends.length && ends[r] + GAP > g.e0) r++;
      ends[r] = g.e1; g.row = r;
    }
    const res = { byId: new Map(geo.map((g) => [g.o.id, g])), rows: ends.length };
    worldCache.set(id, { key, res });
    return res;
  }
  function geom(o, X, W, world) {
    let lw = labelW(o);
    const maxW = W - 8, two = lw > maxW;
    if (two) lw = maxW;
    let a, b, d = null, wa = null, wb = null;
    if (o.span) {
      a = X(o.start); b = X(o.end);
      if (b - a < 4) { const c = (a + b) / 2; a = c - 2; b = c + 2; }
    } else {
      d = X(o.at); wa = X(o.lo); wb = X(o.hi);
      a = Math.min(wa, d - DOT / 2); b = Math.max(wb, d + DOT / 2);
    }
    if (world) {
      const la = o.span ? a : d - DOT / 2;
      return { o, a, b, d, wa, wb, la, lw, two, e0: Math.min(a, la), e1: Math.max(b, la + lw) };
    }
    const va = clamp(a, 0, W), vb = clamp(b, 0, W);
    const anchor = o.span ? va : clamp(d, 0, W) - DOT / 2;
    const la = clamp(anchor, 2, W - lw - 2);
    return { o, a, b, d, wa, wb, la, lw, two, e0: Math.min(va, la), e1: Math.max(vb, la + lw) };
  }

  const o0 = (g) => (g.o.span ? g.a : g.d - DOT / 2);
  const o1 = (g) => (g.o.span ? g.b : g.d + DOT / 2);
  function fadePx(len, frac, cap) { return Math.max(0, Math.min(cap, len * frac)); }

  function markHTML(g, W) {
    const o = g.o, bl = g.e0;
    let h = '';
    if (o.span) {
      const x0 = Math.max(g.a, -4000), x1 = Math.min(g.b, W + 4000), len = g.b - g.a;
      let fi = 0, fd = 0;
      if (o.certainty === 'approx' || (o.certainty === 'uncertain' && !o.openEnd)) { fi = fd = fadePx(len, 0.25, 26); }
      if (o.openEnd === 'end') fd = len * 0.45;
      if (o.openEnd === 'start') fi = len * 0.45;
      const cls = fi || fd ? ' difusa' : '';
      h += `<span class="mk-barra${cls}" style="left:${x0 - bl}px;width:${x1 - x0}px;--fi:${fi}px;--fd:${fd}px"></span>`;
    } else {
      const len = g.wb - g.wa;
      if (len > DOT + 2) {
        const x0 = Math.max(g.wa, -4000), x1 = Math.min(g.wb, W + 4000);
        let f = 0;
        if (o.certainty === 'approx' || o.certainty === 'uncertain') f = fadePx(len, 0.3, 34);
        h += `<span class="mk-bigote${f ? ' difusa' : ''}" style="left:${x0 - bl}px;width:${x1 - x0}px;--fi:${f}px;--fd:${f}px"></span>`;
      }
      h += `<span class="mk-punto" style="left:${g.d - bl}px"></span>`;
    }
    h += `<span class="mk-nombre${g.two ? ' dos' : ''}" style="left:${g.la - bl}px;width:${g.lw}px">${esc(o.name)}${o.tag ? `<span class="mk-tipo"> · ${o.tag}</span>` : ''}</span>`;
    return h;
  }

  const dot = (s) => (/[.:!?»)]$/.test(String(s).trim()) ? String(s).trim() : `${String(s).trim()}.`);
  function ariaFor(o) {
    const cert = { exact: '', approx: 'Fecha aproximada.', computed: 'Fecha calculada por nosotros.', uncertain: 'Fecha dudosa.' }[o.certainty] || '';
    return `${dot(o.name)} ${o.kindName}, ${dot(o.date)} ${cert}`.trim();
  }

  function makeChips(hidden, W, laneId) {
    // Se agrupan por dónde está cada una: el punto de un momento, la barra de algo que dura.
    const segs = hidden.map((g) => ({ s: clamp(g.o.span ? g.a : g.d, 0, W), e: clamp(g.o.span ? g.b : g.d, 0, W), g }))
      .sort((p, q) => p.s - q.s);
    let chips = [];
    for (const sg of segs) {
      const last = chips[chips.length - 1];
      if (last && sg.s <= last.e + 2) { last.e = Math.max(last.e, sg.e); last.items.push(sg.g); }
      else chips.push({ s: sg.s, e: sg.e, items: [sg.g] });
    }
    const box = (c) => {
      const cw = textW(`+${c.items.length} más`, '600 11.5px Inter') + 24;
      c.x = clamp(c.s, 0, W - cw);
      c.w = Math.max(cw, Math.min(c.e, W) - c.x);
    };
    chips.forEach(box);
    // Dos grupos que se pisarían se funden en uno.
    for (let changed = true; changed;) {
      changed = false;
      for (let i = 1; i < chips.length; i++) {
        if (chips[i].x < chips[i - 1].x + chips[i - 1].w + 6) {
          const a = chips[i - 1], b = chips[i];
          a.s = Math.min(a.s, b.s); a.e = Math.max(a.e, b.e); a.items = a.items.concat(b.items);
          chips.splice(i, 1); box(a); changed = true; break;
        }
      }
    }
    const noun = LANE_NOUN[laneId] || ['marca', 'marcas'];
    // El grupo dice, por orden de preferencia, su primer nombre entero, sus fechas o solo cuántos son: lo que quepa
    // hasta el grupo siguiente. Un nombre nunca se corta; la lista entera se abre en la ficha.
    return chips.map((c, i) => {
      const os = c.items.map((g) => g.o).sort((p, q) => p.lo - q.lo || p.ix - q.ix);
      const lo = Math.min(...os.map((o) => o.lo)), hi = Math.max(...os.map((o) => o.hi));
      const room = (i + 1 < chips.length ? chips[i + 1].x - 6 : W) - c.x;
      const n = os.length;
      const cands = [`+${n} · ${os[0].name}${n > 1 ? ` y ${n - 1} más` : ''}`, `+${n} · ${fmtRange(lo, hi)}`, `+${n} más`];
      const label = cands.find((t) => textW(t, '600 11.5px Inter') + 24 <= room) || cands[2];
      const w = Math.max(c.w, textW(label, '600 11.5px Inter') + 24);
      return { ...c, w, key: `chip:${laneId}:${os[0].id}`, label,
        aria: `Grupo de ${n} ${n === 1 ? noun[0] : noun[1]} (${fmtRange(lo, hi)}): ${os.slice(0, 3).map((o) => o.name).join('; ')}${n > 3 ? `; y ${n - 3} más` : ''}. Abre la lista en la ficha.`,
        title: `${os.slice(0, 4).map((o) => o.name).join('; ')}${n > 4 ? ` y ${n - 4} más` : ''}`,
        ids: os.map((o) => o.id), first: os[0].id };
    });
  }

  let activeKey = null;       // la marca que recibe el Tab en la franja (tabindex itinerante)
  let holdRows = null;        // reparto de filas congelado mientras se arrastra
  const renderedKeys = [];    // orden de lectura, para el teclado

  function renderLanes() {
    const W = detW, v0 = S.v0, v1 = v0 + S.span, pxy = W / S.span, X = (t) => (t - v0) * pxy;
    renderedKeys.length = 0;
    for (const id of LANE_ORDER) {
      const L = lanes[id];
      let items = BY_LANE[id] || [];
      if (id === 'fiestas' && S.span > 2.5) items = [];
      const all = [];
      for (const o of items) { if (o.lo > v1) break; if (o.hi >= v0) all.push(o); }
      // Un momento cuya fecha abarca mucho más que la ventana (del año, de varios años, vista en días) no se
      // puede situar aquí: va a un grupo con nombre al principio del carril, que se abre en el sitio.
      const wide = S.openWide.has(id) ? [] : all.filter((o) => !o.span && o.hi - o.lo > S.span * 1.5);
      const vis = wide.length ? all.filter((o) => !(!o.span && o.hi - o.lo > S.span * 1.5)) : all;
      const off = wide.length ? 1 : 0;
      L.nav = [];
      const vis0 = vis;
      if (!all.length) { L.sec.hidden = true; for (const n of L.nodes.values()) n.remove(); L.nodes.clear(); continue; }
      L.sec.hidden = false;
      // Filas del mundo, pasadas a la pantalla. El nombre de algo que dura sigue a la parte que se ve, sin salir de su
      // caja; un nombre que no se lee entero en su sitio se mete en el hueco libre de su fila o, si no lo hay, pasa al
      // grupo (o, donde no hay grupos, a una fila propia debajo). Nunca se corta.
      const WR = worldRows(id, BY_LANE[id].filter((o) => (id !== 'fiestas' || S.span <= 2.5) && (S.openWide.has(id) || o.span || o.hi - o.lo <= S.span * 1.5)));
      const sx = (v0 - R0) * pxy;
      const geo = [];
      for (const o of vis) {
        const w = WR.byId.get(o.id);
        if (!w) continue;
        const g = { ...w, a: w.a - sx, b: w.b - sx, d: w.d == null ? null : w.d - sx, wa: w.wa == null ? null : w.wa - sx, wb: w.wb == null ? null : w.wb - sx, la: w.la - sx, e0: w.e0 - sx, e1: w.e1 - sx };
        if (o.span && g.a < 0) g.la = Math.min(Math.max(g.la, 2), Math.max(g.la, g.e1 - g.lw));
        geo.push(g);
      }
      // Filas sin nada en la vista ni a una pantalla de ella no ocupan sitio. Mientras se arrastra, ese reparto se congela:
      // ninguna marca cambia de fila y una fila que aparece va abajo del todo. Al soltar se vuelve a apretar.
      const near = new Set(geo.map((g) => g.row));
      for (const o of BY_LANE[id]) { if (o.lo > v1 + S.span) break; if (o.hi >= v0 - S.span) { const w = WR.byId.get(o.id); if (w) near.add(w.row); } }
      let rowMap;
      if (holdRows) {
        rowMap = holdRows.get(id) || new Map();
        for (const r of [...near].sort((a, b) => a - b)) if (!rowMap.has(r)) rowMap.set(r, rowMap.size ? Math.max(...rowMap.values()) + 1 : 0);
        holdRows.set(id, rowMap);
      } else rowMap = new Map([...near].sort((a, b) => a - b).map((r, i) => [r, i]));
      for (const g of geo) g.row = rowMap.get(g.row);
      const byRow = new Map();
      for (const g of geo) { if (!byRow.has(g.row)) byRow.set(g.row, []); byRow.get(g.row).push(g); }
      for (const list of byRow.values()) {
        list.sort((p, q) => p.e0 - q.e0);
        list.forEach((g, i) => {
          if (g.la >= 2 && g.la + g.lw <= W - 2) return;
          const lo = Math.max(2, i > 0 ? list[i - 1].e1 + GAP : 0), hi = Math.min(W - 2, i + 1 < list.length ? list[i + 1].e0 - GAP : W);
          const nx = g.la < 2 ? lo : hi - g.lw;
          if (nx >= lo && nx + g.lw <= hi) { g.la = nx; g.e0 = Math.min(g.e0, nx); g.e1 = Math.max(g.e1, nx + g.lw); }
          else g.unfit = true;
        });
      }
      // Lo que no se ve (su dibujo fuera y su nombre sin sitio) no está en la vista.
      const seen = geo.filter((g) => !g.unfit || (o0(g) <= W && o1(g) >= 0));
      const used = Math.max(seen.length ? Math.max(...seen.map((g) => g.row)) + 1 : 0, holdRows ? rowMap.size : 0);
      const B = budget(id);
      const need = used;
      let rows = used, shown = seen.filter((g) => !g.unfit), hidden = [];
      if (Number.isFinite(B) && (used > B || seen.some((g) => g.unfit))) {
        rows = Math.min(B, Math.max(used, 1)); if (rows < B && seen.some((g) => g.unfit)) rows = Math.min(B, used + 1);
        shown = seen.filter((g) => g.row < rows - 1 && !g.unfit) ;
        hidden = seen.filter((g) => g.row >= rows - 1 || g.unfit);
        if (!hidden.length) { shown = seen; rows = used; }
      } else if (!Number.isFinite(B)) {
        // Sin grupos, la marca cuyo nombre no cabe en su fila va a otra fila con sitio, o a una nueva debajo.
        const occ = new Map();
        for (const g of seen) if (!g.unfit) { if (!occ.has(g.row)) occ.set(g.row, []); occ.get(g.row).push([g.e0, g.e1]); }
        const free = (r, a, b) => !(occ.get(r) || []).some(([x, y]) => a < y + GAP && x < b + GAP);
        let extra = used;
        for (const g of seen) if (g.unfit) {
          g.la = clamp(g.o.span ? Math.max(g.a, 2) : g.d - DOT / 2, 2, W - g.lw - 2);
          const a = Math.min(Math.max(g.e0, -4), g.la), b = Math.max(Math.min(g.e1, W + 4), g.la + g.lw);
          let r = 0;
          while (r < extra && !free(r, a, b)) r++;
          if (r === extra) extra++;
          g.row = r; g.e0 = a; g.e1 = b;
          if (!occ.has(r)) occ.set(r, []); occ.get(r).push([a, b]);
        }
        rows = extra; shown = seen;
      }
      if (holdRows) { rows = Math.max(rows, holdRows.get(`#${id}`) || 0); holdRows.set(`#${id}`, rows); }
      const chips = hidden.length ? makeChips(hidden, W, id) : [];
      const wideAll = all.length - vis0.length + (S.openWide.has(id) ? all.filter((o) => !o.span && o.hi - o.lo > S.span * 1.5).length : 0);
      const canFold = (S.open.has(id) && need > defaultBudget(id)) || (S.openWide.has(id) && wideAll > 0);
      const totalRows = off + rows + (canFold ? 1 : 0);
      L.rows.style.height = `${totalRows * RH}px`;
      const grouped = hidden.length + wide.length;
      L.head.innerHTML = `${esc(LANE_NAME[id] || id)} <span>· ${all.length} en la ventana${grouped ? ` · ${grouped} en grupos` : ''}</span>${grouped ? ` <button type="button" class="cab-lista" data-lista="${esc(id)}" data-ids="${esc(hidden.map((g) => g.o.id).concat(wide.map((o) => o.id)).join('|'))}">Ver los ${grouped} agrupados</button>` : ''}`;

      const keep = new Set();
      const put = (key, make, update) => {
        let node = L.nodes.get(key);
        if (!node) { node = make(); node.dataset.key = key; L.nodes.set(key, node); L.rows.appendChild(node); }
        update(node); keep.add(key);
        return node;
      };
      if (wide.length) {
        const noun = LANE_NOUN[id] || ['marca', 'marcas'];
        const txt = `+${wide.length} ${wide.length === 1 ? noun[0] : noun[1]} con fecha más amplia que esta ventana`;
        put(`ancho:${id}`, () => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'chip chip--ancho';
          return b;
        }, (b) => {
          b.dataset.ancho = id; b.dataset.first = wide[0].id; b.dataset.ids = wide.map((o) => o.id).join('|');
          b.style.left = '4px'; b.style.top = '0px'; b.style.width = 'auto';
          b.innerHTML = `<span class="chip-tramo" style="left:0;right:0"></span>${esc(txt)}`;
          b.setAttribute('aria-label', `${txt}: ${wide.slice(0, 3).map((o) => o.name).join('; ')}${wide.length > 3 ? `; y ${wide.length - 3} más` : ''}. Abre la lista en la ficha.`);
        });
        L.nav.push({ key: `ancho:${id}`, x: 4, row: 0 });
      }
      for (const g of shown) {
        const o = g.o;
        put(o.id, () => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'mk'; b.dataset.id = o.id;
          return b;
        }, (b) => {
          b.className = `mk ${o.span ? 'mk--tramo' : 'mk--momento'} c-${o.certainty}${S.sel === o.id ? ' sel' : ''}`;
          b.style.left = `${g.e0}px`; b.style.top = `${(g.row + off) * RH}px`; b.style.width = `${g.e1 - g.e0}px`;
          if (o.color) b.style.setProperty('--c', o.color);
          b.setAttribute('aria-pressed', String(S.sel === o.id));
          b.setAttribute('aria-label', ariaFor(o));
          b.innerHTML = markHTML(g, W);
        });
        L.nav.push({ key: o.id, x: g.e0, row: g.row + off });
      }
      for (const c of chips) {
        put(c.key, () => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'chip';
          return b;
        }, (b) => {
          b.dataset.abrir = id; b.dataset.first = c.first; b.dataset.ids = c.ids.join('|');
          b.style.left = `${c.x}px`; b.style.top = `${(rows - 1 + off) * RH}px`; b.style.width = `${c.w}px`;
          const span = Math.max(0, Math.min(c.e, W) - c.s);
          b.innerHTML = `<span class="chip-tramo" style="left:${c.s - c.x}px;width:${span}px;right:auto"></span>${esc(c.label)}`;
          b.setAttribute('aria-label', c.aria);
          b.title = c.title;
        });
        L.nav.push({ key: c.key, x: c.x, row: rows - 1 + off });
      }
      if (canFold) {
        const key = `plegar:${id}`;
        put(key, () => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'chip';
          return b;
        }, (b) => {
          b.dataset.plegar = id;
          b.style.left = '4px'; b.style.top = `${(off + rows) * RH}px`; b.style.width = 'auto';
          b.textContent = 'Plegar este carril';
        });
        L.nav.push({ key, x: 4, row: off + rows });
      }
      for (const [k, node] of L.nodes) if (!keep.has(k)) { node.remove(); L.nodes.delete(k); }
      L.nav.sort((p, q) => p.x - q.x || p.row - q.row);
      for (const it of L.nav) renderedKeys.push(it.key);
    }
    // Tabindex itinerante: un solo Tab entra en la franja; las flechas recorren las marcas.
    const all = new Set(renderedKeys);
    if (!activeKey || !all.has(activeKey)) activeKey = S.sel && all.has(S.sel) ? S.sel : renderedKeys[0] || null;
    for (const id of LANE_ORDER) for (const [k, node] of lanes[id].nodes) node.tabIndex = k === activeKey ? 0 : -1;
  }

  function nodeFor(key) {
    for (const id of LANE_ORDER) { const n = lanes[id].nodes.get(key); if (n) return n; }
    return null;
  }

  /* ---------- Seleccionar: ni escala ni vista cambian ---------- */
  function select(id) {
    const o = BY_ID.get(id);
    if (!o) return;
    const before = S.t;
    // La marca es [lo, hi): su final es el primer instante de lo que viene después, así que el cursor no se queda en él.
    const hiE = o.hi > o.lo ? o.hi - Math.min((o.hi - o.lo) / 200, DAY / 24) : o.hi;
    let t = S.t, how;
    if (t >= o.lo && (t < o.hi || o.hi <= o.lo)) how = 'dentro';
    else if (t < o.lo) { t = o.lo; how = 'principio'; }
    else { t = hiE; how = 'final'; }
    S.t = t;
    if (S.list && !S.list.ids.includes(id)) S.list = null;
    S.sel = id;
    S.note = { before, after: t, how };
    activeKey = id;
    render();
    renderCard();
    el.vivo.textContent = `Seleccionado: ${o.name}. ${how === 'dentro' ? 'El cursor no se mueve.' : `El cursor va a ${cursorText(t)}.`}`;
  }
  function openList(lane, ids, byKeyboard) {
    S.list = { lane, ids: ids.filter((i) => BY_ID.has(i)) };
    S.sel = null; S.note = null;
    render(); renderCard();
    el.vivo.textContent = `Lista de ${S.list.ids.length} en la ficha.`;
    if (byKeyboard) { const b = el.ficha.querySelector('.lista button'); if (b) b.focus(); }
  }
  function deselect() {
    if (!S.sel) return;
    S.sel = null; S.note = null;
    render(); renderCard();
    el.vivo.textContent = 'Sin selección.';
  }

  function renderCard() {
    const f = el.ficha;
    if ((!S.sel || !BY_ID.has(S.sel)) && S.list) {
      const L = S.list, os = L.ids.map((i) => BY_ID.get(i)).sort((p, q) => p.lo - q.lo || p.ix - q.ix);
      const noun = LANE_NOUN[L.lane] || ['marca', 'marcas'];
      f.innerHTML = `<div class="ficha-tipo"><span class="chip-tipo">Grupo · ${esc(LANE_NAME[L.lane] || L.lane)}</span></div>
        <h2>${os.length} ${os.length === 1 ? noun[0] : noun[1]}</h2>
        <p class="cursor-nota">No caben en las filas que esta escala da al carril. Aquí están todos, en orden; pulsa uno para verlo. La franja no se mueve.</p>
        <ul class="lista">${os.map((o) => `<li><button type="button" data-pick="${esc(o.id)}"><span>${esc(o.name)}</span><small>${esc(o.date || fmtRange(o.start, o.end))}${o.tag ? ` · ${esc(o.tag)}` : ''}</small></button></li>`).join('')}</ul>
        <div class="ficha-acciones">
          <button type="button" class="btn" data-accion="filas">Mostrar todas las filas del carril (lo alarga)</button>
          <button type="button" class="btn" data-accion="cerrar-lista">Cerrar la lista</button>
        </div>`;
      return;
    }
    if (!S.sel || !BY_ID.has(S.sel)) {
      f.innerHTML = `<div class="ficha-vacia"><h2>Nada seleccionado</h2>
        <p>Pulsa o toca una marca de la franja de detalle y aquí verás qué es: el nombre, la fecha y lo segura que es, los lugares, las personas y un resumen.</p>
        <p>Con el teclado: Tab hasta la franja, flechas para ir de una marca a otra y Intro para verla. Escape quita la selección.</p></div>`;
      return;
    }
    const o = BY_ID.get(S.sel);
    const v1 = S.v0 + S.span, inView = o.hi >= S.v0 && o.lo <= v1;
    const rows = [];
    rows.push(['Precisión', esc(D.precisions[o.precision] || o.precision || '')]);
    rows.push(['Fecha', esc(D.certainties[o.certainty] || '')]);
    if (o.stated && o.placed) rows.push(['Situada', `La fecha dice ${esc(fmtRange(o.stated[0], o.stated[1]))}; aquí va en ${esc(fmtRange(o.start, o.end))} por el orden del relato.`]);
    if (o.openEnd) rows.push(['Sin fecha', o.openEnd === 'end' ? 'El final no tiene fecha en la fuente.' : 'El principio no tiene fecha en la fuente.']);
    if (o.journey && JOURNEY.has(o.journey)) rows.push(['Viaje', esc(JOURNEY.get(o.journey))]);
    if (o.to) rows.push(['Destino', esc(o.to)]);
    if (o.places && o.places.length) rows.push(['Lugares', esc(o.places.join(', '))]);
    if (o.people && o.people.length) rows.push(['Personas', esc(o.people.join(', '))]);
    if (o.ref) rows.push(['Texto', esc(o.ref)]);
    if (o.secular && o.secular.length) rows.push(['Secular', esc(o.secular.map((s) => s.date).join('; '))]);
    const n = S.note;
    let note = '';
    if (n) {
      note = n.how === 'dentro'
        ? `El cursor ya estaba dentro de sus fechas, en ${esc(cursorText(n.after))}, y no se ha movido.`
        : `El cursor ha pasado de ${esc(cursorText(n.before))} a ${esc(cursorText(n.after))}, el ${n.how === 'principio' ? 'principio' : 'final'} de la marca, que era lo más cerca. La escala y la vista no han cambiado.`;
    }
    const shape = o.span ? '<i class="barra"></i>' : '<i></i>';
    f.innerHTML = `<div class="ficha-tipo l-${esc(o.lane)}"${o.color ? ` style="--c:${o.color}"` : ''}><span class="chip-tipo">${shape}${esc(o.kindName)}</span>${o.tag ? `<span class="chip-tipo">Fecha ${esc(o.tag === 'aprox.' ? 'aproximada' : o.tag)}</span>` : ''}</div>
      <h2>${esc(o.name)}</h2>
      <span class="ficha-fecha">${esc(o.date || fmtRange(o.start, o.end))}</span>
      ${o.summary ? `<p class="resumen">${esc(o.summary)}</p>` : '<p class="resumen be-muted">Los datos no traen resumen de esta marca.</p>'}
      <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
      ${note ? `<p class="cursor-nota">${note}</p>` : ''}
      <div class="ficha-acciones">
        ${S.list ? `<button type="button" class="btn" data-accion="a-lista">Volver a la lista (${S.list.ids.length})</button>` : ''}
        ${inView ? '' : '<button type="button" class="btn" data-accion="volver">Volver a ella (misma escala)</button>'}
        <button type="button" class="btn" data-accion="encuadrar">Encuadrar: cambia la escala</button>
        <button type="button" class="btn" data-accion="quitar">Quitar selección</button>
      </div>`;
  }

  el.ficha.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-pick]');
    if (pick) { select(pick.dataset.pick); return; }
    const la = e.target.closest('[data-accion]');
    if (la && la.dataset.accion === 'cerrar-lista') { S.list = null; renderCard(); return; }
    if (la && la.dataset.accion === 'a-lista') { S.sel = null; S.note = null; render(); renderCard(); return; }
    if (la && la.dataset.accion === 'filas' && S.list) { S.open.add(S.list.lane); S.openWide.add(S.list.lane); render(); return; }
    const b = la;
    if (!b || !S.sel) return;
    const o = BY_ID.get(S.sel);
    const acc = b.dataset.accion;
    if (acc === 'quitar') { S.list = null; deselect(); renderCard(); return; }
    if (acc === 'volver') { S.v0 = (o.span ? o.start : o.at) - 0.4 * S.span; if (o.span && o.end - o.start < S.span) S.v0 = (o.start + o.end) / 2 - S.span / 2; }
    if (acc === 'encuadrar') { const len = Math.max(o.hi - o.lo, DAY * 3); S.span = len * 1.3; S.v0 = o.lo - len * 0.15; }
    clampView(); clampCursor(); render(); renderCard();
  });

  /* ---------- Punteros en la franja de detalle ---------- */
  const ptrs = new Map();
  let drag = null, pinch = null, swallowClick = false;
  const rectX = (clientX) => clientX - el.carriles.getBoundingClientRect().left;

  el.carriles.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) {
      const [p, q] = [...ptrs.values()];
      pinch = { d0: Math.hypot(p.x - q.x, p.y - q.y) || 1, m0: rectX((p.x + q.x) / 2), span0: S.span, v00: S.v0 };
      drag = null;
      return;
    }
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, v0: S.v0, moved: false };
  });
  el.carriles.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size >= 2) {
      const [p, q] = [...ptrs.values()];
      const d = Math.hypot(p.x - q.x, p.y - q.y) || 1, m = rectX((p.x + q.x) / 2);
      const span = clamp(pinch.span0 * pinch.d0 / d, SPAN_MIN, SPAN_MAX);
      const ta = pinch.v00 + (pinch.m0 / detW) * pinch.span0;
      S.span = span; S.v0 = ta - (m / detW) * span;
      clampView(); clampCursor(); schedule();
      swallowClick = true;
      return;
    }
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x0;
    if (!drag.moved && Math.abs(dx) > (e.pointerType === 'mouse' ? 6 : 10) && Math.abs(dx) > Math.abs(e.clientY - drag.y0)) {
      drag.moved = true;
      holdRows = new Map();
      el.carriles.classList.add('arrastrando');
      try { el.carriles.setPointerCapture(e.pointerId); } catch (_) { /* nada */ }
    }
    if (drag.moved) { S.v0 = drag.v0 - dx * (S.span / detW); clampView(); clampCursor(); schedule(); }
  });
  const endPtr = (e) => {
    ptrs.delete(e.pointerId);
    if (drag && drag.id === e.pointerId) { if (drag.moved) { swallowClick = true; holdRows = null; schedule(); } drag = null; }
    if (ptrs.size < 2) pinch = null;
    el.carriles.classList.remove('arrastrando');
    if (swallowClick) setTimeout(() => { swallowClick = false; }, 0);
  };
  el.carriles.addEventListener('pointerup', endPtr);
  el.carriles.addEventListener('pointercancel', endPtr);
  el.carriles.addEventListener('click', (e) => {
    if (swallowClick) { e.preventDefault(); e.stopPropagation(); swallowClick = false; return; }
    const mk = e.target.closest('.mk');
    if (mk) { select(mk.dataset.id, e.detail > 0 ? e.clientY : null); return; }
    const lista = e.target.closest('[data-lista]');
    if (lista) { openList(lista.dataset.lista, lista.dataset.ids.split('|'), e.detail === 0); return; }
    const ch = e.target.closest('.chip');
    // Un grupo abre su lista en la ficha: la franja no se mueve, ni sus marcas cambian de sitio.
    if (ch && (ch.dataset.abrir || ch.dataset.ancho)) { openList(ch.dataset.abrir || ch.dataset.ancho, ch.dataset.ids.split('|'), e.detail === 0); return; }
    if (ch && ch.dataset.plegar) { S.open.delete(ch.dataset.plegar); S.openWide.delete(ch.dataset.plegar); activeKey = null; render(); return; }
    if (e.detail > 0 && (S.sel || S.list)) { S.list = null; deselect(); renderCard(); }
  }, true);

  el.detalle.addEventListener('wheel', (e) => {
    const x = rectX(e.clientX);
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const f = Math.exp(clamp(e.deltaY, -60, 60) * 0.01);
      const ta = S.v0 + (x / detW) * S.span;
      setSpan(S.span * f, ta, x / detW);
    } else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      panBy(((e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX)) * (S.span / detW));
    }
  }, { passive: false });

  /* Regla: pulsar o arrastrar lleva el cursor; con el teclado, la bandera es un deslizador. */
  let scrub = null;
  el.eje.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    scrub = e.pointerId;
    el.eje.setPointerCapture(e.pointerId);
    S.t = clamp(S.v0 + (rectX(e.clientX) / detW) * S.span, S.v0, S.v0 + S.span); clampCursor(); schedule();
  });
  el.eje.addEventListener('pointermove', (e) => {
    if (scrub !== e.pointerId) return;
    S.t = clamp(S.v0 + (rectX(e.clientX) / detW) * S.span, S.v0, S.v0 + S.span); clampCursor(); schedule();
  });
  el.eje.addEventListener('pointerup', () => { scrub = null; });
  el.eje.addEventListener('pointercancel', () => { scrub = null; });

  function unit() { return [50, 5, 1, 1 / 12, 7 * DAY, DAY][scaleIndex(S.span)]; }
  function moveCursorTo(t) {
    S.t = clamp(t, R0, R1);
    // Con el teclado, si el cursor sale de la ventana, la ventana lo sigue lo justo.
    if (S.t > S.v0 + S.span) S.v0 = S.t - 0.9 * S.span;
    if (S.t < S.v0) S.v0 = S.t - 0.1 * S.span;
    clampView(); clampCursor(); schedule();
  }
  el.bandera.addEventListener('keydown', (e) => {
    const u = unit() * (e.shiftKey ? 10 : 1);
    let done = true;
    if (e.key === 'ArrowRight') moveCursorTo(S.t + u);
    else if (e.key === 'ArrowLeft') moveCursorTo(S.t - u);
    else if (e.key === 'PageDown') { const n = STARTS.find((s) => s > S.t + 1e-6); if (n !== undefined) moveCursorTo(n); }
    else if (e.key === 'PageUp') { let p; for (const s of STARTS) { if (s < S.t - 1e-6) p = s; else break; } if (p !== undefined) moveCursorTo(p); }
    else if (e.key === 'Home') moveCursorTo(S.v0);
    else if (e.key === 'End') moveCursorTo(S.v0 + S.span);
    else done = false;
    if (done) e.preventDefault();
  });

  /* ---------- Panorama: la ventana se arrastra; sus bordes cambian la escala; pulsar fuera lleva allí ---------- */
  let pdrag = null;
  el.pista.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const r = el.pista.getBoundingClientRect(), k = panoW / (R1 - R0);
    const edge = e.target.dataset && e.target.dataset.borde;
    let mode = 'mover';
    if (edge) mode = edge === 'i' ? 'izq' : 'der';
    else if (!e.target.closest('#pano-ventana')) {
      const t = clamp(R0 + (e.clientX - r.left) / k, R0, R1);
      S.v0 = t - 0.4 * S.span; S.t = t; clampView(); clampCursor(); schedule();
    }
    pdrag = { id: e.pointerId, mode, x0: e.clientX, v0: S.v0, span: S.span, k };
    el.pista.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  el.pista.addEventListener('pointermove', (e) => {
    if (!pdrag || pdrag.id !== e.pointerId) return;
    const dt = (e.clientX - pdrag.x0) / pdrag.k;
    if (pdrag.mode === 'mover') S.v0 = pdrag.v0 + dt;
    else if (pdrag.mode === 'izq') { const right = pdrag.v0 + pdrag.span; S.span = clamp(pdrag.span - dt, SPAN_MIN, SPAN_MAX); S.v0 = right - S.span; }
    else { S.span = clamp(pdrag.span + dt, SPAN_MIN, SPAN_MAX); S.v0 = pdrag.v0; }
    clampView(); clampCursor(); schedule();
  });
  const pend = () => { pdrag = null; };
  el.pista.addEventListener('pointerup', pend);
  el.pista.addEventListener('pointercancel', pend);
  el.win.addEventListener('keydown', (e) => {
    let done = true;
    const step = S.span * (e.shiftKey ? 1 : 0.25);
    if (e.key === 'ArrowRight') panBy(step);
    else if (e.key === 'ArrowLeft') panBy(-step);
    else if (e.key === 'PageDown') panBy(S.span * 5);
    else if (e.key === 'PageUp') panBy(-S.span * 5);
    else if (e.key === 'Home') panBy(R0 - S.v0);
    else if (e.key === 'End') panBy(R1 - S.span - S.v0);
    else done = false;
    if (done) e.preventDefault();
  });

  /* ---------- Teclado en la franja: flechas entre marcas, Intro selecciona ---------- */
  function focusNode(n) {
    n.focus({ preventScroll: true });
    const dr = el.detalle.getBoundingClientRect(), nr = n.getBoundingClientRect();
    const topLimit = dr.top + el.eje.offsetHeight + 24;
    if (nr.top < topLimit) el.detalle.scrollTop -= topLimit - nr.top;
    else if (nr.bottom > dr.bottom - 4) el.detalle.scrollTop += nr.bottom - dr.bottom + 4;
  }
  el.carriles.addEventListener('keydown', (e) => {
    const cur = e.target.closest('.mk, .chip');
    if (!cur) return;
    const key = cur.dataset.key;
    const laneIdx = LANE_ORDER.indexOf(cur.closest('.carril').dataset.lane);
    if (laneIdx < 0) return;
    const L = lanes[LANE_ORDER[laneIdx]];
    const i = L.nav.findIndex((it) => it.key === key);
    let target = null;
    if (e.key === 'ArrowRight' && i < L.nav.length - 1) target = L.nav[i + 1].key;
    else if (e.key === 'ArrowLeft' && i > 0) target = L.nav[i - 1].key;
    else if (e.key === 'Home') target = L.nav[0].key;
    else if (e.key === 'End') target = L.nav[L.nav.length - 1].key;
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const dir = e.key === 'ArrowDown' ? 1 : -1, x = L.nav[i].x, row = L.nav[i].row;
      // Primero otra fila del mismo carril; si no hay, el carril siguiente.
      const sameLane = L.nav.filter((it) => it.row === row + dir);
      let pool = sameLane;
      for (let j = laneIdx + dir; !pool.length && j >= 0 && j < LANE_ORDER.length; j += dir) {
        const M = lanes[LANE_ORDER[j]];
        if (M.sec.hidden || !M.nav.length) continue;
        const rr = dir > 0 ? Math.min(...M.nav.map((it) => it.row)) : Math.max(...M.nav.map((it) => it.row));
        pool = M.nav.filter((it) => it.row === rr);
      }
      if (pool.length) target = pool.reduce((best, it) => (Math.abs(it.x - x) < Math.abs(best.x - x) ? it : best)).key;
    } else return;
    e.preventDefault();
    if (!target) return;
    const n = nodeFor(target);
    if (n) { cur.tabIndex = -1; n.tabIndex = 0; activeKey = target; focusNode(n); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'Escape') { deselect(); return; }
    if (e.target === el.bandera || e.target === el.win) { if (e.key !== '+' && e.key !== '-' && e.key !== '=') return; }
    if (e.key === '+' || e.key === '=') { zoomStep(1); e.preventDefault(); }
    else if (e.key === '-') { zoomStep(-1); e.preventDefault(); }
  });

  /* ---------- Tema ---------- */
  function setTheme(dark) {
    document.documentElement.dataset.tema = dark ? 'oscuro' : 'claro';
    el.tema.setAttribute('aria-pressed', String(!!dark));
    panoStaticKey = '';
    schedule();
  }
  el.tema.addEventListener('click', () => setTheme(document.documentElement.dataset.tema !== 'oscuro'));

  /* ---------- Pasos del cursor, «Ir a» y el salto a las marcas ---------- */
  const STEP_TXT = ['100 años', '10 años', '1 año', '1 mes', '1 semana', '1 día'];
  const STEP = [100, 10, 1, 1 / 12, 7 * DAY, DAY];
  function syncSteps() {
    const i = scaleIndex(S.span), u = STEP_TXT[i];
    $('paso-atras').textContent = `‹ ${u}`; $('paso-atras').setAttribute('aria-label', `Cursor: ${u} antes`);
    $('paso-adelante').textContent = `${u} ›`; $('paso-adelante').setAttribute('aria-label', `Cursor: ${u} después`);
  }
  $('paso-atras').addEventListener('click', () => moveCursorTo(S.t - STEP[scaleIndex(S.span)]));
  $('paso-adelante').addEventListener('click', () => moveCursorTo(S.t + STEP[scaleIndex(S.span)]));
  LINEA_COMUN.toolbar(document.querySelector('.mandos'));
  $('saltar').addEventListener('click', (e) => { e.preventDefault(); const n = el.carriles.querySelector('[tabindex="0"]'); if (n) focusNode(n); });
  $('ir').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = LINEA_COMUN.parseDate($('ir-fecha').value, HEB.map((h) => ({ name: h.name, s: h.s, e: h.e })));
    if (t == null) { el.vivo.textContent = 'No entiendo esa fecha. Prueba 607 a.e.c., 33 o 14 nisán 33.'; return; }
    // «Ir a» es un mando de moverse: lleva el cursor allí y, si no se ve, la vista con él. La escala no cambia.
    S.t = clamp(t, R0, R1);
    if (S.t < S.v0 || S.t > S.v0 + S.span) S.v0 = S.t - 0.4 * S.span;
    clampView(); render();
    el.vivo.textContent = `Cursor en ${cursorText(S.t)}.`;
  });

  /* ---------- Dirección: fecha, escala, ventana, selección y tema ---------- */
  let hashTimer = 0;
  function saveHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => {
      const p = new URLSearchParams();
      p.set('t', S.t.toFixed(5).replace(/\.?0+$/, ''));
      const i = scaleIndex(S.span);
      p.set('escala', Math.abs(S.span - SCALES[i].span) < 1e-9 ? SCALES[i].id : S.span.toPrecision(6));
      p.set('desde', S.v0.toFixed(5).replace(/\.?0+$/, ''));
      if (S.sel) p.set('sel', S.sel);
      p.set('tema', document.documentElement.dataset.tema === 'oscuro' ? 'oscuro' : 'claro');
      const h = '#' + p.toString();
      if (h !== location.hash) history.replaceState(null, '', h);
    }, 120);
  }
  function loadHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    const t = parseFloat(p.get('t'));
    if (Number.isFinite(t)) S.t = clamp(t, R0, R1);
    const sc = SCALES.find((s) => s.id === p.get('escala'));
    const an = parseFloat(p.get('escala'));
    S.span = sc ? sc.span : Number.isFinite(an) ? an : 8;
    const de = parseFloat(p.get('desde'));
    S.v0 = Number.isFinite(de) ? de : S.t - 0.4 * S.span;
    clampView(); clampCursor();
    const sel = p.get('sel');
    S.sel = sel && BY_ID.has(sel) ? sel : null;
    S.note = null;
    setTheme(LINEA_COMUN.theme() === 'oscuro');
  }
  window.addEventListener('hashchange', () => { loadHash(); render(); renderCard(); });

  let resizeT = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { panoStaticKey = ''; schedule(); }, 60); });
  PHONE_MQ.addEventListener('change', () => { wcache.clear(); panoStaticKey = ''; schedule(); });
  if (window.matchMedia('(max-width: 700px)').matches) document.getElementById('uso').open = false;

  // Para las pruebas en el navegador.
  window.OV = { S, render, select, deselect, marks: BY_ID, lanes, get detW() { return detW; } };

  Promise.all([document.fonts.load('500 12px Inter'), document.fonts.load('500 13px Inter'), document.fonts.load('600 11px Inter'), document.fonts.load('600 22px "EB Garamond"')])
    .catch(() => null)
    .then(() => {
      wcache.clear();
      loadHash();
      render();
      renderCard();
      document.body.dataset.listo = '1';
    });
})();
