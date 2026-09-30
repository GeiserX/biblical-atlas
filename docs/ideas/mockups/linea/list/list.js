// Cronología que se lee: la línea de tiempo como un texto vertical.
// Una fila por marca con su nombre entero, su fecha y su tipo, agrupada por la unidad de la escala.
// El cursor es la línea de lectura: la fecha de lo que cruza la línea dorada. Solo cambia al desplazar
// (la lista, la regla, el teclado, «Ir a»). Elegir una marca abre su ficha y no mueve nada.
(() => {
  'use strict';
  const D = window.TIMELINE_DATA;
  if (!D) { document.body.insertAdjacentHTML('beforeend', '<p role="alert">Faltan los datos: ../datos.js no se cargó.</p>'); return; }

  const DAY = D.day;
  const [T_MIN, T_MAX] = D.range;
  const SC = D.scales;                                   // milenios … días
  const UNIT = ['millennium', 'century', 'decade', 'year', 'month', 'day'];
  const RANK = { day: 0, month: 1, year: 2, decade: 3, century: 4, millennium: 5 };
  const UNIT_LEN = { millennium: 1000, century: 100, decade: 10, year: 1, month: D.calendar.lunarMonth, day: DAY };
  // La unidad que permite la precisión de una fecha: una estación no dice el mes, así que va con el año.
  const PREC_UNIT = { day: 'day', month: 'month', season: 'year', year: 'year', years: 'year' };
  const STEP = [100, 10, 1, 1 / 12, 7 * DAY, DAY];      // paso de las flechas en la regla, por escala
  const READ = 0.3;                                      // la línea de lectura, a este tanto de la altura de la lista
  const FOLD_STOPS = new Set(['milenios', 'siglos']);    // aquí las paradas van dentro de su viaje, con todos sus nombres

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // ---------- Calendario hebreo (solo para los años que lo necesitan) ----------
  const MONTH_META = Object.fromEntries(D.calendar.months.map((m) => [m.id, m]));
  const MONTHS = [];
  for (const y of D.calendar.years) for (const [id, name, s, e] of y.months) MONTHS.push({ id, name, s, e });
  MONTHS.sort((a, b) => a.s - b.s);
  function monthAt(t) {
    let lo = 0, hi = MONTHS.length - 1, k = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (MONTHS[mid].s <= t + 1e-5) { k = mid; lo = mid + 1; } else hi = mid - 1; }
    return k >= 0 && t < MONTHS[k].e - 1e-5 ? MONTHS[k] : null;
  }
  const dayIn = (m, t) => Math.floor((t - m.s) / DAY + 0.02) + 1;   // los datos van redondeados a 6 decimales

  // ---------- Fechas en palabras ----------
  const yl = (Y) => (Y >= 1 ? `${Y} e.c.` : `${1 - Y} a.e.c.`);
  const ylShort = (Y) => (Y >= 1 ? [String(Y), 'e.c.'] : [String(1 - Y), 'a.e.c.']);
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
    'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX', 'XXXI', 'XXXII', 'XXXIII', 'XXXIV', 'XXXV', 'XXXVI', 'XXXVII', 'XXXVIII', 'XXXIX', 'XL', 'XLI'];
  const ORD = ['', 'Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto'];
  function rangeLabel(m) {
    const a = Math.floor(m.start + 1e-9), b = Math.ceil(m.end - 1e-9) - 1;
    if (b <= a) return yl(a);
    if (b < 1) return `${1 - a}-${1 - b} a.e.c.`;
    if (a >= 1) return `${a}-${b} e.c.`;
    return `${1 - a} a.e.c.-${b} e.c.`;
  }
  function dur(y) {
    const d = y / DAY;
    if (y >= 1.5) return `${Math.round(y)} años`;
    if (y >= 0.95) return 'un año';
    if (d >= 45) return `${Math.round(y * 12)} meses`;
    if (d >= 25) return 'un mes';
    if (d >= 1.5) return `${Math.round(d)} días`;
    if (d >= 0.5) return 'un día';
    return 'unas horas';
  }
  // La fecha del cursor, con la finura de la escala.
  function cursorText(t, si) {
    const Y = Math.floor(t);
    if (si <= 3) return yl(Y);
    const m = monthAt(t);
    if (!m) return yl(Y);
    if (si === 4) return `${m.name} de ${yl(Y)}`;
    return `${dayIn(m, t)} de ${m.name.toLowerCase()} de ${yl(Y)}`;
  }
  function cursorFlag(t, si) {
    const Y = Math.floor(t);
    const m = si >= 4 ? monthAt(t) : null;
    if (!m) return ylShort(Y);
    if (si === 4) return [m.name, yl(Y)];
    return [`${dayIn(m, t)} ${m.name.toLowerCase()}`, yl(Y)];
  }

  // ---------- Las marcas ----------
  // Tramo: eras, imperios, gobernantes, viajes y estancias. Momento: sucesos y cartas, que los datos dan como
  // algo que pasa dentro de una ventana (no dicen si duró). Ventana: la fecha no llega al día.
  const marks = D.marks.map((m, i) => {
    const span = m.kind === 'period' || m.kind === 'ruler' || m.kind === 'journey' || (m.kind === 'stop' && m.end - m.start > DAY / 2);
    return Object.assign({}, m, { i, span, win: !span && m.precision !== 'day' });
  });
  const byId = new Map(marks.map((m) => [m.id, m]));
  const stopsOf = new Map();
  for (const m of marks) if (m.kind === 'stop') { if (!stopsOf.has(m.journey)) stopsOf.set(m.journey, []); stopsOf.get(m.journey).push(m); }
  for (const l of stopsOf.values()) l.sort((a, b) => a.order - b.order);
  const LANE = Object.fromEntries(D.lanes.map((l) => [l.id, l.name]));

  function kindLabel(m, long) {
    switch (m.kind) {
      case 'event': return 'Suceso';
      case 'letter': return long && m.to ? `Carta a: ${m.to}` : 'Carta';
      case 'journey': return 'Viaje de Pablo';
      case 'stop': { const j = byId.get(m.journey); return long && j ? `Parada ${m.order} de «${j.name}»` : 'Parada de Pablo'; }
      case 'period': return m.type === 'potencia' ? 'Potencia mundial' : 'Era';
      case 'ruler':
        if (m.type === 'rey') return 'Rey · ' + (LANE[m.lane] || '').replace(/^Reyes · /, '');
        return { emperador: 'Emperador', gobernador: 'Gobernador', 'sumo-sacerdote': 'Sumo sacerdote' }[m.type] || 'Gobernante';
    }
    return '';
  }
  const narrative = (m) => /tiempo narrativo/.test(m.date);
  // En la fila, la fecha sin la explicación del relato (va en la ficha); la etiqueta «situada por el relato» lo dice.
  const rowDate = (m) => m.date.replace(/\s*\(tiempo narrativo[^)]*\)/, '');
  function certTag(m) {
    if (m.certainty === 'computed') return narrative(m) ? 'situada por el relato' : (/cálculo nuestro/.test(m.date) ? '' : 'cálculo nuestro');
    if (m.certainty === 'uncertain') return 'fecha incierta';
    if (m.certainty === 'approx' && !/\bc\./.test(m.date)) return 'aproximada';
    return '';
  }
  function certSentence(m) {
    switch (m.certainty) {
      case 'exact': return 'Fecha que da la fuente.';
      case 'approx': return 'Aproximada: la fuente dice «c.» o solo da la estación.';
      case 'computed': return narrative(m) ? 'Situada por el orden del relato: la fuente da la ventana y la colocamos dentro según lo que se cuenta antes y después.' : 'Cálculo nuestro, no una fecha de la fuente.';
      case 'uncertain': return m.openEnd ? `Incierta: ${m.openEnd === 'end' ? 'el final' : 'el comienzo'} no tiene fecha.` : 'Incierta: la fuente duda entre fechas.';
    }
    return '';
  }
  const PREC_TXT = { day: 'al día', month: 'al mes', season: 'a la estación', year: 'al año', years: 'de varios años' };

  // ---------- Unidades: milenio, siglo, década, año, mes, día ----------
  function bucket(t, u) {
    const Y = Math.floor(t + 1e-9);
    if (u === 'year') return { u, s: Y, e: Y + 1, label: yl(Y) };
    if (u === 'decade') {
      if (Y >= 1) { const k = Math.floor(Y / 10), s = Math.max(10 * k, 1); return { u, s, e: 10 * k + 10, label: `${s}-${10 * k + 9} e.c.` }; }
      const b = 1 - Y, k = Math.floor(b / 10), hi = 10 * k + 9, lo = Math.max(10 * k, 1);
      return { u, s: 1 - hi, e: 2 - lo, label: `${hi}-${lo} a.e.c.` };
    }
    if (u === 'century' || u === 'millennium') {
      const N = u === 'century' ? 100 : 1000;
      const name = (k, era) => (u === 'century' ? `Siglo ${ROMAN[k]} ${era}` : `${ORD[k] || k + '.º'} milenio ${era}`);
      if (Y >= 1) { const k = Math.ceil(Y / N); return { u, s: (k - 1) * N + 1, e: k * N + 1, label: name(k, 'e.c.'), sub: `${(k - 1) * N + 1}-${k * N}` }; }
      const b = 1 - Y, k = Math.ceil(b / N), hi = k * N, lo = (k - 1) * N + 1;
      return { u, s: 1 - hi, e: 2 - lo, label: name(k, 'a.e.c.'), sub: `${hi}-${lo}` };
    }
    const m = monthAt(t);
    if (!m) return null;
    if (u === 'month') {
      const meta = MONTH_META[m.id];
      const std = meta && meta.name !== m.name ? ` (${meta.name.toLowerCase()})` : '';
      return { u, s: m.s, e: m.e, label: `${m.name}${std} de ${yl(Math.floor(m.s))}`, sub: meta ? meta.ours : '' };
    }
    const d = dayIn(m, t), s = m.s + (d - 1) * DAY;
    return { u, s, e: s + DAY, label: `${d} de ${m.name.toLowerCase()} de ${yl(Math.floor(t + 1e-9))}` };
  }

  // ---------- Estado ----------
  const state = { si: 3, t: 50.5, sel: null, hover: null, tema: 'claro', filtro: '' };
  // El filtro deja la lista en un solo carril: seguir a Pablo, o solo a los reyes, sin pasar por todo lo demás.
  const FILTRO = { period: (m) => m.kind === 'period', ruler: (m) => m.kind === 'ruler', pablo: (m) => m.kind === 'journey' || m.kind === 'stop' || m.kind === 'letter', event: (m) => m.kind === 'event' };
  let model = null;        // { groups, anchors, rows }
  let anchors = [];        // [{ y, t, el }], y y t crecientes
  let rowEls = [];         // botones en orden
  let settingScroll = null;

  // ---------- Construcción de la lista para una escala ----------
  // Las filas van en el orden en que el sitio coloca cada marca (su fecha o su lugar en el relato). Un grupo nuevo
  // empieza cuando cambia la unidad de la fila: la de la escala o, si la fecha no llega a tanto, la que su precisión
  // permite («33 e.c. · sin día exacto»). Así el orden del relato se conserva y la precisión se ve en la cabecera.
  function build(si) {
    const su = UNIT[si];
    const fold = FOLD_STOPS.has(SC[si].id);
    const keep = FILTRO[state.filtro] || (() => true);
    const rows = marks.filter((m) => !(fold && m.kind === 'stop') && keep(m))
      .sort((a, b) => a.start - b.start || a.end - b.end || a.i - b.i);
    const groups = [];
    let cur = null;
    for (const m of rows) {
      const pu = PREC_UNIT[m.precision] || 'year';
      let u = RANK[pu] > RANK[su] ? pu : su;
      let b = bucket(m.start, u);
      if (!b) { u = 'year'; b = bucket(m.start, 'year'); }
      const key = `${u}|${b.s.toFixed(6)}`;
      if (!cur || cur.key !== key) {
        // Una cabecera que ya salió (el mismo año sin mes exacto, partido por un mes con fecha) vuelve con «sigue».
        const again = groups.some((g) => g.key === key);
        cur = Object.assign(b, { key, coarse: RANK[u] > RANK[su], again, rows: [] });
        groups.push(cur);
      }
      cur.rows.push(m);
    }
    return { si, su, fold, groups };
  }

  function rowHTML(m, fold) {
    const cls = ['row', 'k-' + m.kind, 'c-' + m.certainty, m.span ? 'sp' : 'mo', m.win ? 'w' : ''].join(' ');
    const tag = certTag(m);
    const long = m.span && m.kind !== 'stop' ? ` · ${dur(m.end - m.start)}` : '';
    const q = m.certainty === 'uncertain' ? '<span class="q">?</span>' : '';
    let extra = '';
    if (fold && m.kind === 'journey') {
      const st = stopsOf.get(m.id) || [];
      extra = `<span class="st"><b>${st.length} paradas:</b> ${st.map((s) => esc(s.name)).join(', ')}</span>`;
    }
    return `<li><button type="button" class="${cls}" data-i="${m.i}" tabindex="-1" aria-pressed="false">`
      + `<span class="g" aria-hidden="true">${q}</span><span class="n">${esc(m.name)}</span>`
      + `<span class="m"><span class="d">${esc(rowDate(m))}${long}${tag ? ` <span class="tag">${tag}</span>` : ''}</span>`
      + `<span class="k">${esc(kindLabel(m))}</span></span>${extra}</button></li>`;
  }

  function render(si) {
    model = build(si);
    const su = model.su;
    let html = '', maxEnd = -Infinity, gi = 0;
    for (const g of model.groups) {
      const g0 = g.coarse ? g.rows[0].start : g.s;
      if (maxEnd > -Infinity && g0 - maxEnd > UNIT_LEN[su] * 1.01) {
        html += `<p class="gap" data-t0="${maxEnd}" data-t1="${g0}">Sin nada fechado durante ${dur(g0 - maxEnd)}</p>`;
      }
      const sub = (g.coarse ? (g.u === 'year' ? 'sin mes exacto' : 'sin día exacto') : (g.sub || '')) + (g.again ? ' (sigue)' : '');
      const n = g.rows.length;
      html += `<section class="grp${g.coarse ? ' coarse' : ''}" data-g="${gi}" aria-labelledby="h${gi}">`
        + `<h3 id="h${gi}"><span class="hl">${esc(g.label)}</span>${sub ? `<span class="hs">${esc(sub)}</span>` : ''}`
        + `<span class="hc">${n} ${n === 1 ? 'marca' : 'marcas'}</span></h3><ul>`
        + g.rows.map((m) => rowHTML(m, model.fold)).join('') + '</ul></section>';
      maxEnd = Math.max(maxEnd, g.coarse ? g.rows[g.rows.length - 1].start : g.e);
      gi++;
    }
    $('#inner').innerHTML = html;
    rowEls = [...document.querySelectorAll('#inner button.row')];
    atEl = null; rovingEl = null;
    for (const b of rowEls) b.addEventListener('pointerenter', onRowHover);
    applySelectionClasses();
    measure();
  }

  // ---------- Medir: la correspondencia entre la altura en la lista y la fecha ----------
  function readY() { return Math.round($('#list').clientHeight * READ); }
  function measure() {
    const list = $('#list'), H = list.clientHeight, ry = readY();
    $('#inner').style.setProperty('--pad-top', ry + 'px');
    $('#inner').style.setProperty('--pad-bot', (H - ry) + 'px');
    $('#stage').style.setProperty('--read-y', (ry - 1) + 'px');
    anchors = [];
    let tmax = -Infinity;
    const push = (y, t, el) => { tmax = Math.max(tmax, t); anchors.push({ y, t: tmax, el }); };
    for (const el of $('#inner').children) {
      if (el.classList.contains('gap')) { push(el.offsetTop, +el.dataset.t0, el); continue; }
      const g = model.groups[+el.dataset.g];
      push(el.offsetTop, g.coarse ? g.rows[0].start : g.s, el);
      for (const b of el.querySelectorAll('button.row')) push(b.offsetTop, marks[+b.dataset.i].start, b);
    }
    const last = anchors[anchors.length - 1];
    if (last) {
      const lastEnd = Math.max(...model.groups.map((g) => (g.coarse ? g.rows[g.rows.length - 1].start : g.e)));
      push(last.el.offsetTop + last.el.offsetHeight, Math.min(T_MAX, lastEnd), last.el);
    }
  }
  function tAtY(y) {
    const A = anchors;
    if (!A.length) return state.t;
    if (y <= A[0].y) return A[0].t;
    let lo = 0, hi = A.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (A[mid].y <= y) lo = mid; else hi = mid - 1; }
    const a = A[lo], b = A[lo + 1];
    if (!b || b.y === a.y) return a.t;
    return a.t + (y - a.y) / (b.y - a.y) * (b.t - a.t);
  }
  function yAtT(t) {
    const A = anchors;
    if (!A.length) return 0;
    if (t <= A[0].t) return A[0].y;
    let lo = 0, hi = A.length - 1;                      // primer ancla con t >= t
    if (t > A[hi].t) return A[hi].y;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (A[mid].t >= t) hi = mid; else lo = mid + 1; }
    const b = A[lo];
    if (b.t === t || lo === 0) return b.y;
    const a = A[lo - 1];
    return a.y + (t - a.t) / (b.t - a.t) * (b.y - a.y);
  }

  // ---------- Mover el cursor (solo lo hacen los controles de moverse, nunca elegir) ----------
  function setCursor(t) {
    state.t = clamp(t, T_MIN, T_MAX);
    const list = $('#list');
    const target = Math.round(yAtT(state.t) - readY());
    settingScroll = clamp(target, 0, list.scrollHeight - list.clientHeight);
    list.scrollTop = settingScroll;
    schedule();
  }
  function onScroll() {
    const list = $('#list');
    if (settingScroll !== null && Math.abs(list.scrollTop - settingScroll) < 1.5) { settingScroll = null; schedule(); return; }
    settingScroll = null;
    state.t = clamp(tAtY(list.scrollTop + readY()), T_MIN, T_MAX);
    schedule();
  }

  let raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); }
  function update() {
    $('#fecha').textContent = cursorText(state.t, state.si);
    const ruler = $('#ruler');
    ruler.setAttribute('aria-valuenow', state.t.toFixed(3));
    ruler.setAttribute('aria-valuetext', `Cursor en ${cursorText(state.t, state.si)}, escala ${SC[state.si].name.toLowerCase()}`);
    drawRuler();
    drawNow();
    updateRoving();
    updateRel();
    writeHash();
  }

  // ---------- La regla: el tiempo a escala, a un lado ----------
  const SVGNS = 'http://www.w3.org/2000/svg';
  function ticks(a, b, si) {
    const out = [];
    const years = (step, major) => {
      const add = (t, Y) => { if (t >= a && t <= b) out.push({ t, major, label: major ? ylShort(Y) : null }); };
      for (let k = Math.ceil(Math.max(a, 1) / step); k * step <= b; k++) if (k * step >= 1) add(k * step, k * step);
      for (let k = Math.ceil((1 - b) / step); k <= Math.floor((1 - a) / step); k++) { const bce = k * step; if (bce >= 1) add(1 - bce, 1 - bce); }
    };
    if (si <= 2) { years([100, 10, 1][si], false); years([1000, 100, 10][si], true); }
    else if (si === 3) {
      years(1, true);
      for (let Y = Math.floor(a); Y <= b; Y++) for (let k = 1; k < 12; k++) { const t = Y + k / 12; if (t >= a && t <= b) out.push({ t, major: false }); }
    } else {
      const ms = MONTHS.filter((m) => m.e >= a && m.s <= b);
      if (!ms.length) { years(1, true); for (let Y = Math.floor(a); Y <= b; Y++) for (let k = 1; k < 12; k++) { const t = Y + k / 12; if (t >= a && t <= b) out.push({ t, major: false }); } }
      for (const m of ms) {
        if (m.s >= a) out.push({ t: m.s, major: true, label: si === 4 ? [m.name, yl(Math.floor(m.s))] : [`1 ${m.name.toLowerCase()}`, yl(Math.floor(m.s))] });
        if (si === 5) {
          for (let d = 2; d <= 30; d++) {
            const t = m.s + (d - 1) * DAY;
            if (t >= m.e - 1e-6) break;
            if (t >= a && t <= b) out.push({ t, major: false, label: d % 5 === 0 ? [String(d)] : null });
          }
        }
      }
    }
    return out.sort((x, y) => x.t - y.t);
  }
  function drawRuler() {
    const svg = $('#ruler-svg'), R = $('#ruler');
    const W = R.clientWidth, H = R.clientHeight, S = SC[state.si].span, k = H / S, ry = readY();
    const a = state.t - ry / k, b = state.t + (H - ry) / k;
    const Y = (t) => ry + (t - state.t) * k;
    const narrow = W < 80;
    const LX = narrow ? 38 : 64;                         // columna de rótulos
    const colW = Math.max(3, Math.floor((W - LX - 4) / 5));
    const col = { period: 0, ruler: 1, journey: 2, stop: 2, letter: 3, event: 4 };
    const ley = R.querySelector('.ruler-ley');
    if (ley) { ley.style.setProperty('--lx', `${LX}px`); ley.style.setProperty('--cw', `${colW}px`); ley.hidden = narrow; }
    let s = '';
    // Lo que se ve ahora en la lista: su tramo en la regla
    const list = $('#list');
    const t0 = tAtY(list.scrollTop + 30), t1 = tAtY(list.scrollTop + list.clientHeight);
    const v0 = clamp(Y(t0), 0, H), v1 = clamp(Y(t1), 0, H);
    if (v1 > v0) s += `<rect class="vis" x="0" y="${v0}" width="${W}" height="${v1 - v0}"/><rect class="vis-b" x="${LX - 4}" y="${v0}" width="3" height="${v1 - v0}"/>`;
    // Marcas
    const selM = state.sel ? byId.get(state.sel) : null;
    const hovM = state.hover != null ? marks[state.hover] : null;
    for (const m of marks) {
      if (m.end < a || m.start > b) continue;
      if (model.fold && m.kind === 'stop') continue;
      const x = LX + col[m.kind] * colW;
      const y0 = Y(m.start), h = Math.max(2, (m.end - m.start) * k);
      const soft = m.kind === 'period' || m.kind === 'ruler' ? ' bg' : (m.certainty !== 'exact' ? ' soft' : '');
      s += `<rect class="mk k-${m.kind}${soft}" style="fill:var(--kc)" x="${x}" y="${(y0).toFixed(1)}" width="${colW - 1}" height="${h.toFixed(1)}"/>`;
    }
    // Elegida y señalada: una barra de tinta al borde y un trazo en cada extremo, sin tapar las demás
    for (const [m, cls] of [[hovM, 'hov'], [selM, 'sel']]) {
      if (!m || m.end < a || m.start > b) continue;
      const y0 = Y(m.start), y1 = Y(m.start) + Math.max(4, (m.end - m.start) * k);
      const c0 = clamp(y0, -2, H + 2), c1 = clamp(y1, -2, H + 2);
      s += `<rect class="mk ${cls}" x="${W - 5}" y="${c0.toFixed(1)}" width="4" height="${Math.max(4, c1 - c0).toFixed(1)}" rx="2"/>`;
      for (const yy of [y0, y1]) if (yy > 0 && yy < H) s += `<rect class="mk ${cls}" x="${LX - 2}" y="${(yy - 1).toFixed(1)}" width="${W - LX + 1}" height="2"/>`;
    }
    // Marcas de la escala y sus rótulos
    let lastY = -99;
    for (const tk of ticks(a, b, state.si)) {
      const y = Y(tk.t);
      s += `<line class="tk${tk.major ? ' maj' : ''}" x1="${tk.major ? LX - 12 : LX - 6}" x2="${W}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke-width="${tk.major ? 1 : .6}" opacity="${tk.major ? .9 : .6}"/>`;
      if (tk.label && y - lastY > (tk.label.length > 1 ? 26 : 14) && Math.abs(y - ry) > 26 && y > 8 && y < H - 4) {
        s += `<text class="tl" x="4" y="${(y + 4).toFixed(1)}">${esc(tk.label[0])}</text>`;
        if (tk.label[1]) s += `<text class="tl" x="4" y="${(y + 16).toFixed(1)}" opacity=".8">${esc(tk.label[1])}</text>`;
        lastY = y;
      }
    }
    // El cursor
    const f = cursorFlag(state.t, state.si);
    s += `<line class="cur" x1="0" x2="${W}" y1="${ry}" y2="${ry}"/>`;
    const fw = narrow ? W - 4 : LX - 5;
    s += `<rect class="flag" x="1" y="${ry - 16}" width="${fw}" height="32" rx="4"/>`;
    s += `<text class="flag-t" x="4" y="${ry - 3}">${esc(f[0])}</text><text class="flag-t" x="4" y="${ry + 11}">${esc(f[1])}</text>`;
    svg.innerHTML = s;
  }

  // ---------- En curso: tramos que contienen el cursor y cuya fila ya quedó por encima ----------
  const NOW_ORDER = { period: 0, ruler: 1, journey: 2, stop: 3, event: 4, letter: 5 };
  let nowKey = '';
  function drawNow() {
    const list = $('#list');
    const tTop = tAtY(list.scrollTop + 30);
    // Tramos largos, y también sucesos cuya fecha abarca diez años o más (del siglo, de varios años): la lista solo los
    // pone en su año de comienzo, así que «En curso» los recuerda mientras su fecha contiene el cursor.
    const items = marks.filter((m) => (m.span || (m.kind === 'event' && m.end - m.start >= 10)) && m.kind !== 'stop' && m.start < tTop && m.start <= state.t && m.end > state.t)
      .sort((x, y) => NOW_ORDER[x.kind] - NOW_ORDER[y.kind] || (x.type === 'era' ? -1 : 0) - (y.type === 'era' ? -1 : 0) || x.start - y.start);
    const key = items.map((m) => m.id).join('|') + '#' + state.sel;
    if (key === nowKey) return;
    nowKey = key;
    const box = $('#now-c');
    const hadFocus = box.contains(document.activeElement) ? document.activeElement.dataset.i : null;
    $('#now-t').textContent = items.length ? `En curso: ${items.length} ${items.length === 1 ? 'tramo largo' : 'tramos largos'}` : 'En curso: nada largo';
    box.innerHTML = items.map((m, k) => `<button type="button" class="chip k-${m.kind}" data-i="${m.i}" tabindex="${k ? -1 : 0}" aria-pressed="${m.id === state.sel}"><i aria-hidden="true"></i>${esc(m.name)} <small>${esc(rangeLabel(m))}</small></button>`).join('');
    if (hadFocus != null) { const b = box.querySelector(`[data-i="${hadFocus}"]`); if (b) b.focus({ preventScroll: true }); }
  }

  // ---------- Elegir: selección y ficha. No toca el cursor, la escala ni el desplazamiento. ----------
  function applySelectionClasses() {
    const sel = state.sel ? byId.get(state.sel) : null;
    const rel = new Set();
    if (sel && sel.kind === 'journey') for (const s of stopsOf.get(sel.id) || []) rel.add(s.i);
    if (sel && sel.kind === 'stop') { const j = byId.get(sel.journey); if (j) rel.add(j.i); }
    for (const b of rowEls) {
      const i = +b.dataset.i;
      const on = sel && sel.i === i;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('rel', rel.has(i));
    }
  }
  function select(id, origin) {
    state.sel = id;
    applySelectionClasses();
    renderCard(origin);
    nowKey = '';
    schedule();
    const m = id ? byId.get(id) : null;
    $('#live').textContent = m ? `Elegido: ${m.name}. ${m.date}. ${kindLabel(m, true)}.` : 'Nada elegido.';
  }
  function relText(m) {
    const t = state.t;
    if (m.start <= t && t < Math.max(m.end, m.start + DAY)) return m.span ? 'El cursor está dentro de este tramo.' : 'El cursor está dentro de su fecha.';
    if (m.start > t) return `Empieza ${dur(m.start - t)} después del cursor.`;
    return `${m.span ? 'Terminó' : 'Fue'} ${dur(t - m.end)} antes del cursor.`;
  }
  function updateRel() { const el = $('#rel'); if (el && state.sel) el.textContent = relText(byId.get(state.sel)); }
  function renderCard(origin) {
    const card = $('#card');
    const m = state.sel ? byId.get(state.sel) : null;
    if (!m) {
      card.classList.add('vacio');
      card.innerHTML = `<div class="vacia"><h2>Nada elegido</h2><p>Elige una línea de la lista o un tramo de «En curso» para ver qué es: su tipo, su fecha y cuánto se sabe de ella, los lugares, las personas y un resumen.</p><p>Elegir no mueve nada. El cursor sigue en la línea dorada hasta que desplaces la lista o la regla.</p></div>`;
      placeCard(null);
      return;
    }
    card.classList.remove('vacio');
    const rows = [];
    const stated = m.stated && (m.stated[1] - m.stated[0] > 1.001 ? `La fuente da de ${yl(m.stated[0])} a ${yl(m.stated[1] - 1)}` : `La fuente da ${yl(m.stated[0])}`);
    rows.push(['Fecha', `${esc(m.date)}<span class="sub">Precisión ${PREC_TXT[m.precision] || ''}. ${certSentence(m)}${m.placed ? ` ${stated ? `${stated}; en` : 'En'} la lista va en su lugar del relato.` : ''}</span>`]);
    if (m.span && m.kind !== 'stop') rows.push(['Duración', `${dur(m.end - m.start)} (${esc(rangeLabel(m))})`]);
    rows.push(['Cursor', `<span id="rel">${esc(relText(m))}</span>`]);
    if (m.places && m.places.length) rows.push(['Lugares', esc(m.places.join(', '))]);
    if (m.people && m.people.length) rows.push(['Personas', esc(m.people.join(', '))]);
    if (m.secular) rows.push(['Secular', m.secular.map((x) => `Cronología secular: ${esc(x.date)}`).join('<br>')]);
    if (m.ref) rows.push(['Texto', esc(m.ref)]);
    let extra = '';
    if (m.kind === 'journey') {
      const st = stopsOf.get(m.id) || [];
      extra = `<h3>Paradas (${st.length})</h3><ol>${st.map((s) => `<li><button type="button" data-sel="${esc(s.id)}">${s.order}. ${esc(s.name)}<small>${esc(s.date)}</small></button></li>`).join('')}</ol>`;
    }
    if (m.kind === 'stop') {
      const j = byId.get(m.journey);
      if (j) extra = `<h3>Viaje</h3><button type="button" class="enlace" data-sel="${esc(j.id)}">${esc(j.name)}</button>`;
    }
    const cls = ['k-' + m.kind, 'c-' + m.certainty, m.span ? 'sp' : 'mo', m.win ? 'w' : ''].join(' ');
    card.innerHTML = `<div class="card-top"><span class="caps ${cls}"><span class="g" aria-hidden="true">${m.certainty === 'uncertain' ? '<span class="q">?</span>' : ''}</span>${esc(kindLabel(m, true))}</span>`
      + `<button type="button" class="btn x" data-act="cerrar">Cerrar</button></div>`
      + `<h2 tabindex="-1">${esc(m.name)}</h2><p class="card-fecha">${esc(m.date)}${certTag(m) ? ` · ${certTag(m)}` : ''}</p><dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`
      + (m.summary ? `<p class="sum">${esc(m.summary)}</p>` : '')
      + `<div class="acts"><button type="button" class="btn primary" data-act="ir">Llevar el cursor aquí</button><button type="button" class="btn mas" data-act="mas" aria-expanded="false">Ver la ficha entera</button></div>` + extra;
    // En el móvil la ficha abre corta (qué es, su fecha y los botones), para que tape poco de la lista.
    card.classList.toggle('compacta', matchMedia('(max-width: 700px)').matches);
    placeCard(origin);
    if (origin === 'card') card.querySelector('h2').focus({ preventScroll: true });
  }
  // En el móvil la ficha va arriba, encima de la cabecera y los mandos, que no hacen falta mientras se lee: no tapa ninguna
  // fila de la lista, así que se puede seguir tocando otras. Si la cabecera es baja, tapa la mitad de la lista donde no
  // está la fila elegida.
  function placeCard(origin) {
    const card = $('#card');
    if (!matchMedia('(max-width: 700px)').matches) { card.style.top = card.style.bottom = card.style.position = ''; return; }
    if (!state.sel) return;
    const st = $('#stage').getBoundingClientRect();
    const room = st.top - 12;
    if (room >= 150) {
      card.style.position = 'fixed';
      card.style.top = '6px'; card.style.bottom = '';
      card.style.setProperty('--card-max', `${Math.round(room)}px`);
      return;
    }
    card.style.position = '';
    const app = $('#app').getBoundingClientRect();
    const row = origin instanceof Element ? origin.getBoundingClientRect() : null;
    const half = st.height * 0.5;
    card.style.setProperty('--card-max', Math.round(half - 8) + 'px');
    const rowLow = row && (row.top + row.bottom) / 2 > st.top + st.height / 2;
    if (rowLow) { card.style.top = (st.top - app.top + 6) + 'px'; card.style.bottom = ''; }
    else { card.style.bottom = (app.bottom - st.bottom + 6) + 'px'; card.style.top = ''; }
  }

  // ---------- Foco en la lista: una sola parada de tabulador, flechas para moverse ----------
  function rowAtLine() {
    const y = $('#list').scrollTop + readY();
    let lo = 0, hi = rowEls.length - 1, k = 0;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (rowEls[mid].offsetTop <= y) { k = mid; lo = mid + 1; } else hi = mid - 1; }
    return rowEls[k];
  }
  let rovingEl = null, atEl = null;
  function updateRoving() {
    const at = rowAtLine();
    if (at !== atEl) { if (atEl) atEl.classList.remove('at'); atEl = at; if (at) at.classList.add('at'); }
    if (rowEls.includes(document.activeElement)) return;
    const b = (state.sel && rowEls.find((x) => marks[+x.dataset.i].id === state.sel && isVisible(x))) || at;
    if (b === rovingEl) return;
    if (rovingEl) rovingEl.tabIndex = -1;
    rovingEl = b; if (b) b.tabIndex = 0;
  }
  function isVisible(el) {
    const r = el.getBoundingClientRect(), l = $('#list').getBoundingClientRect();
    return r.bottom > l.top && r.top < l.bottom;
  }
  function focusRow(b) {
    if (!b) return;
    if (rovingEl) rovingEl.tabIndex = -1;
    rovingEl = b; b.tabIndex = 0; b.focus();
  }

  // ---------- Escala ----------
  function setScale(si, announce = true) {
    si = clamp(si, 0, SC.length - 1);
    if (si === state.si && model) return;
    const t = state.t;
    state.si = si;
    for (const b of document.querySelectorAll('.escalas button')) b.setAttribute('aria-pressed', +b.dataset.si === si ? 'true' : 'false');
    render(si);
    setCursor(t);
    if (announce) $('#live').textContent = `Escala: ${SC[si].name}. Cursor en ${cursorText(t, si)}.`;
  }

  // ---------- Dirección: fecha, escala, selección y tema ----------
  let hashTimer = 0;
  function writeHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => {
      const p = new URLSearchParams();
      p.set('t', state.t.toFixed(5)); p.set('escala', SC[state.si].id);
      if (state.sel) p.set('sel', state.sel);
      p.set('tema', state.tema);
      history.replaceState(null, '', '#' + p.toString());
    }, 200);
  }
  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    const t = parseFloat(p.get('t'));
    // La escala puede venir como un ancho en años (de otro diseño con escala libre): la más cercana.
    let si = SC.findIndex((s) => s.id === p.get('escala'));
    const span = parseFloat(p.get('escala'));
    if (si < 0 && Number.isFinite(span)) si = SC.reduce((b, s, i) => (Math.abs(Math.log(s.span / span)) < Math.abs(Math.log(SC[b].span / span)) ? i : b), 0);
    return { t: isFinite(t) ? t : 50.5, si: si >= 0 ? si : 3, sel: byId.has(p.get('sel')) ? p.get('sel') : null, tema: LINEA_COMUN.theme() };
  }
  function setTema(tema) {
    state.tema = tema;
    document.documentElement.dataset.tema = tema;
    const b = $('#tema');
    b.setAttribute('aria-pressed', tema === 'oscuro' ? 'true' : 'false');
    b.querySelector('span').textContent = 'oscuro';
    schedule();
  }

  // ---------- Entradas ----------
  function onRowHover(e) { state.hover = +e.currentTarget.dataset.i; schedule(); }
  function wire() {
    const list = $('#list'), ruler = $('#ruler');
    // Escalas
    $('.escalas').innerHTML = SC.map((s, i) => `<button type="button" data-si="${i}" aria-pressed="false">${s.name}</button>`).join('');
    $('.escalas').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setScale(+b.dataset.si); });
    // Lista
    list.addEventListener('scroll', onScroll, { passive: true });
    list.addEventListener('pointerleave', () => { state.hover = null; schedule(); });
    list.addEventListener('click', (e) => {
      const b = e.target.closest('button.row');
      if (!b) return;
      const m = marks[+b.dataset.i];
      if (rovingEl && rovingEl !== b) rovingEl.tabIndex = -1;
      rovingEl = b; b.tabIndex = 0;
      if (m.id !== state.sel) select(m.id, b);     // otro clic en la misma fila no la quita: un toque nunca deshace
    });
    list.addEventListener('keydown', (e) => {
      const i = rowEls.indexOf(document.activeElement);
      if (i < 0) return;
      const go = { ArrowDown: 1, ArrowUp: -1, PageDown: 10, PageUp: -10 }[e.key];
      if (go) { e.preventDefault(); focusRow(rowEls[clamp(i + go, 0, rowEls.length - 1)]); }
      else if (e.key === 'Home') { e.preventDefault(); focusRow(rowEls[0]); }
      else if (e.key === 'End') { e.preventDefault(); focusRow(rowEls[rowEls.length - 1]); }
    });
    // Rueda con Ctrl (pellizco del panel táctil): cambia la escala
    let wheelAcc = 0;
    $('#stage').addEventListener('wheel', (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      wheelAcc += e.deltaY;
      if (Math.abs(wheelAcc) > 60) { setScale(state.si + (wheelAcc < 0 ? 1 : -1)); wheelAcc = 0; }
    }, { passive: false });
    // Pellizco con dos dedos: cambia la escala
    let pinch = null;
    const dist = (ts) => Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);
    // Con dos dedos, el gesto es de la lista (cambia la escala), no de la página: nada de ampliar la página entera.
    $('#stage').addEventListener('touchstart', (e) => { if (e.touches.length === 2) { e.preventDefault(); pinch = { d: dist(e.touches) }; } }, { passive: false });
    $('#stage').addEventListener('touchmove', (e) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const r = dist(e.touches) / pinch.d;
      if (r > 1.35) { setScale(state.si + 1); pinch.d = dist(e.touches); }
      else if (r < 0.74) { setScale(state.si - 1); pinch.d = dist(e.touches); }
    }, { passive: false });
    $('#stage').addEventListener('touchend', (e) => { if (e.touches.length < 2) pinch = null; });
    // Regla: arrastrar mueve el tiempo con el dedo; un toque lleva el cursor a esa fecha; la rueda desplaza la lista
    let drag = null;
    ruler.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      ruler.setPointerCapture(e.pointerId);
      drag = { y0: e.clientY, t0: state.t, moved: false, id: e.pointerId };
    });
    ruler.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dy = e.clientY - drag.y0;
      if (Math.abs(dy) > 5) drag.moved = true;
      if (drag.moved) setCursor(drag.t0 - dy * SC[state.si].span / ruler.clientHeight);
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved) {
        const y = e.clientY - ruler.getBoundingClientRect().top;
        setCursor(state.t + (y - readY()) * SC[state.si].span / ruler.clientHeight);
      }
      drag = null;
    };
    ruler.addEventListener('pointerup', end);
    ruler.addEventListener('pointercancel', () => { drag = null; });
    ruler.addEventListener('wheel', (e) => { if (e.ctrlKey) return; e.preventDefault(); list.scrollTop += e.deltaY; }, { passive: false });
    ruler.addEventListener('keydown', (e) => {
      const st = STEP[state.si];
      const go = { ArrowDown: st, ArrowRight: st, ArrowUp: -st, ArrowLeft: -st, PageDown: 10 * st, PageUp: -10 * st }[e.key];
      if (go) { e.preventDefault(); setCursor(state.t + go); }
      else if (e.key === 'Home') { e.preventDefault(); setCursor(T_MIN); }
      else if (e.key === 'End') { e.preventDefault(); setCursor(T_MAX); }
    });
    $('#now-t').addEventListener('click', (e) => { const b = e.currentTarget; b.setAttribute('aria-expanded', String(b.getAttribute('aria-expanded') !== 'true')); });
    // En curso y ficha
    $('#now-c').addEventListener('click', (e) => { const b = e.target.closest('button.chip'); if (b) select(marks[+b.dataset.i].id, null); });
    $('#now-c').addEventListener('keydown', (e) => {         // una sola parada de tabulador; flechas entre tramos
      const cs = [...$('#now-c').querySelectorAll('.chip')], i = cs.indexOf(document.activeElement);
      const go = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (i < 0 || !go) return;
      e.preventDefault();
      const n = cs[clamp(i + go, 0, cs.length - 1)];
      cs.forEach((c) => { c.tabIndex = -1; }); n.tabIndex = 0; n.focus();
    });
    $('#card').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.act === 'cerrar') { closeCard(); return; }
      if (b.dataset.act === 'mas') { const on = $('#card').classList.toggle('compacta'); b.setAttribute('aria-expanded', String(!on)); b.textContent = on ? 'Ver la ficha entera' : 'Ver menos'; placeCard(null); return; }
      if (b.dataset.act === 'ir') {
        const m = byId.get(state.sel);
        const row = rowEls.find((x) => +x.dataset.i === m.i);
        setCursor(row ? anchors.find((a) => a.el === row).t : m.start);
        return;
      }
      if (b.dataset.sel) select(b.dataset.sel, 'card');
    });
    // Teclas globales
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input')) return;
      if (e.key === 'Escape' && state.sel) { e.preventDefault(); closeCard(); }
      else if (e.key === '+' || e.key === '=') { setScale(state.si + 1); }
      else if (e.key === '-') { setScale(state.si - 1); }
    });
    // Ir a
    $('#ir').addEventListener('submit', (e) => {
      e.preventDefault();
      const t = LINEA_COMUN.parseDate($('#ir-t').value, MONTHS);
      if (t == null) { $('#live').textContent = 'No entiendo esa fecha. Prueba 607 a.e.c., 33 o 14 nisán 33.'; return; }
      setCursor(t);
      $('#live').textContent = `Cursor en ${cursorText(state.t, state.si)}.`;
    });
    $('#tema').addEventListener('click', () => setTema(state.tema === 'oscuro' ? 'claro' : 'oscuro'));
    $('#filtro').addEventListener('change', (e) => {
      state.filtro = e.target.value;
      const t = state.t;
      render(state.si); setCursor(t);
      $('#live').textContent = `Mostrando: ${e.target.selectedOptions[0].textContent}.`;
    });
    $('#saltar').addEventListener('click', (e) => { e.preventDefault(); const b = rovingEl || rowAtLine(); if (b) focusRow(b); });
    LINEA_COMUN.toolbar($('.escalas'));
    // Tamaño
    let rz = 0;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { const t = state.t; measure(); setCursor(t); placeCard(null); }, 80); });
  }
  function closeCard() {
    const id = state.sel;
    const inCard = $('#card').contains(document.activeElement);
    select(null);
    if (inCard && id) { const b = rowEls.find((x) => marks[+x.dataset.i].id === id); if (b && isVisible(b)) focusRow(b); else $('#ruler').focus(); }
  }

  // ---------- Arranque ----------
  function start() {
    const h = readHash();
    wire();
    setTema(h.tema);
    state.t = h.t;
    state.si = -1;
    setScale(h.si, false);
    if (h.sel) { state.sel = h.sel; applySelectionClasses(); renderCard(null); }
    else renderCard(null);
    // Las fuentes cambian la altura de las filas: medir otra vez cuando estén
    document.fonts.ready.then(() => { const t = state.t; measure(); setCursor(t); document.documentElement.dataset.listo = '1'; });
    window.LISTA = { state, setCursor, setScale, select, tAtY, yAtT, marks, get anchors() { return anchors; }, readY, cursorText };
  }
  start();
})();
