/* biblical-atlas · the date panel. Touching the date at the top (#fecha) opens a panel: a popover under the date on a
   wide screen, a sheet from the bottom on a narrow one. There is nothing to type in it. It has three parts, and a row of
   buttons under its title jumps to each one:
   1. «Esta fecha»: the date of the cursor in full, and what its precision means in words.
   2. «Ir a un momento»: the events nearest to the cursor, then milestones of the chronology grouped by age. Every
      milestone is an id of the data: its name and its date come from the data, and one the data lacks is left out.
   3. «Elegir una fecha»: era, year by steps, the month of the Hebrew calendar and its day, and «Ir». The grids offer
      only the days that fall in the chosen year of our calendar, so «Elegido» always names the date the chip will show.
   Going to a moment or to a year keeps the scale of the timeline; going to a month or a day brings a wider view down to
   months or days, as the search box does. Then the panel closes and gives the focus back to the date. The address
   keeps its t= through setT, as before. Loaded after linea.js; linea.js calls BE.datePicker.open() from #fecha. */
'use strict';
(() => {
const BE = window.BE;
const { esc, $, clamp } = BE;

const NARROW = '(max-width: 760px)';
const NEAR = 5;   // events shown on each side of the cursor
const SWALLOW_MS = 400;   // after closing, the pointer events of a double tap or a double click stop here
// Milestones by age: the id of the age (a period of type «era») and the ids of its milestones. Names and dates come from
// the data; an id the data lacks is left out, and an age the data lacks leaves its milestones without a heading.
const MILESTONES = [
  { age: 'de-adan-al-diluvio', items: ['evento:creacion-de-adan', 'evento:diluvio'] },
  { age: 'los-patriarcas', items: ['evento:pacto-con-abrahan'] },
  { age: 'exodo-y-desierto', items: ['evento:exodo'] },
  { age: 'reyes-de-israel-y-juda', items: ['evento:david-rey-en-hebron'] },
  { age: 'destierro-y-regreso', items: ['evento:destruccion-de-jerusalen-607', 'evento:regreso-de-537'] },
  { age: 'jesus-en-la-tierra', items: ['evento:bautismo-de-jesus', 'evento:muerte-de-jesus'] },
  { age: 'congregacion-cristiana', items: ['evento:pentecostes-33', 'evento:destruccion-de-jerusalen-70'] },
];
const STEPS = [1000, 100, 10, 1];
const DAYS_BEFORE = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];   // our months, no leap years (linea.js)
const LONG_MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ORDINAL = ['primer', 'segundo', 'tercer', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo', 'noveno', 'décimo', 'undécimo', 'duodécimo'];
const ANACHRONIC = 'Va en cursiva porque es un nombre de después del exilio: la Biblia de esa época no llama así a este mes.';
const PARTS = [['date-picker-this', 'Esta fecha'], ['date-picker-moments', 'Ir a un momento'], ['date-picker-choose', 'Elegir una fecha']];

let dialog = null;
// { year, month (id or null), run (which occurrence of the month in that year, 0 or 1), day (number or null),
//   carry ({ n, year }: the number the person had before an era switch was clamped to the data, or null) }
let state = null;
let swallowUntil = 0;
let heldAt = null;   // the moment the open panel speaks of

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------
/** Years one can choose: every year the cursor can reach, from the first of the data to the one of BE.T_MAX. */
const yearRange = () => [Math.floor(BE.T_MIN), Math.floor(BE.T_MAX)];
const onTimeline = (t) => clamp(t, BE.T_MIN, BE.T_MAX);
const months = () => [...(BE.calendario?.().meses || [])].sort((a, b) => a.orden - b.orden);
/** The Hebrew days one can choose in our year y, by month (the calendar of the site, BE.anioHebreo): Map of month id to
    { month, runs }, where a run is one occurrence of that month (tebet can hold the end of one and the start of the next)
    with { hebrewYear, a, b, length, days: [{ day, t }] }. A day counts when the moment it takes the cursor to (its
    middle, kept inside the timeline) falls in y and inside that day, so going there shows y at the top. */
function monthsIn(y) {
  const out = new Map();
  const DIA = BE.DIA;
  for (const hy of [y - 1, y]) {   // the Hebrew year that ends in the spring of y, and the one that starts then
    for (const M of BE.anioHebreo(hy).meses) {
      const length = Math.round((M.b - M.a) / DIA);
      for (let d = 1; d <= length; d++) {
        const start = M.a + (d - 1) * DIA, end = M.a + d * DIA;
        const t = onTimeline(start + DIA / 2);
        if (Math.floor(t) !== y || t < start || t >= end) continue;
        if (!out.has(M.mes.id)) out.set(M.mes.id, { month: M.mes, runs: [] });
        const runs = out.get(M.mes.id).runs;
        let run = runs.find((r) => r.a === M.a);
        if (!run) runs.push(run = { hebrewYear: hy, a: M.a, b: M.b, length, days: [] });
        run.days.push({ day: d, t });
      }
    }
  }
  return out;
}
const runOf = (s) => (s.month ? monthsIn(s.year).get(s.month)?.runs[s.run || 0] : null);
/** Where the choice takes the cursor, and how precise it is: the middle of the year; the first day of the month that
    falls in the year; the middle of the chosen day. */
function landingOf(s) {
  const run = runOf(s);
  if (!run) return { t: onTimeline(s.year + 0.5), precision: 'year' };
  const d = s.day != null ? run.days.find((x) => x.day === s.day) : null;
  return d ? { t: d.t, precision: 'day' } : { t: run.days[0].t, precision: 'month' };
}
/** «Elegido: …», read from where the cursor lands, so it names what the date at the top will say. */
function choiceText(s) {
  const { t, precision } = landingOf(s);
  if (precision === 'year') return BE.fmtAnio(s.year);
  const h = BE.diaHebreo(t);
  return `${precision === 'day' ? `${h.dia} de ` : ''}${h.nombre.toLowerCase()} de ${BE.fmtAnio(Math.floor(t))}`;
}
/** The panel opens on the date of the cursor, as precise as the date at the top: the year at the scale of years, the
    month at the scale of months, the day at the scale of days (the same cuts as linea.js, fechaCursor). */
function stateAt(t) {
  const [lo, hi] = yearRange();
  const s = { year: clamp(Math.floor(t), lo, hi), month: null, run: 0, day: null, carry: null };
  const span = BE.span();
  const h = span < 4 && months().length ? BE.diaHebreo(t) : null;
  const runs = h ? monthsIn(s.year).get(h.mes.id)?.runs || [] : [];
  const i = h ? runs.findIndex((r) => Math.abs(r.a - h.a) < 1e-9) : -1;
  if (i >= 0) {
    s.month = h.mes.id; s.run = i;
    if (span < 0.35 && runs[i].days.some((x) => x.day === h.dia)) s.day = h.dia;
  }
  return s;
}
/** Our month and day at t, with the same table as linea.js (mesNuestro): { m (0-11), day }. */
function ourDate(t) {
  const y = Math.floor(t), d = (t - y) / BE.DIA;
  let m = 0;
  while (m < 11 && d >= DAYS_BEFORE[m + 1]) m++;
  return { m, day: Math.min(DAYS_BEFORE[m + 1] - DAYS_BEFORE[m], Math.floor(d - DAYS_BEFORE[m]) + 1) };
}
const monthsMode = () => BE.lineaEstado?.meses || 'ambos';

// ---------------------------------------------------------------------------
// Parts of the panel
// ---------------------------------------------------------------------------
/** The date of the cursor in its long form («c. 26 de tebet de 49 e.c.»), whatever the width: on a phone the chip has
    the short one. The same choices as the chip: the calendar of the «Meses» selector, the day or the month by scale. */
function longDate(t) {
  const span = BE.span(), y = Math.floor(t);
  const c = /^c\.\s/.test($('#fecha-valor')?.textContent || '') ? 'c. ' : '';
  if (!(span < 4) || !months().length) return esc(`${c}${BE.fmtAnio(y)}`);
  const days = span < 0.35;
  if (monthsMode() === 'nuestros') {
    const n = ourDate(t);
    return esc(`${c}${days ? `${n.day} de ` : ''}${LONG_MONTHS[n.m]} de ${BE.fmtAnio(y)}`);
  }
  const h = BE.diaHebreo(t);
  const text = `${days ? `${h.dia} de ` : ''}${h.nombre.toLowerCase()} de ${BE.fmtAnio(y)}`;
  return `${esc(c)}${h.anacronico ? `<i>${esc(text)}</i>` : esc(text)}`;
}
function partThisDate() {
  const t = BE.E.t, span = BE.span();
  const chip = $('#fecha-valor')?.textContent || '';
  const ours = monthsMode() === 'nuestros';
  const lines = [];
  const estimated = BE.dondeEsta?.(t)?.estimada;
  const h = span < 4 && months().length ? BE.diaHebreo(t) : null;
  if (/^c\.\s/.test(chip)) {
    const why = [];
    if (estimated) why.push('En este tramo el relato da el orden de los hechos, no el día.');
    if (!h) why.push('A esta escala la línea marca solo el año.');
    else if (ours) why.push('La fecha hebrea de al lado sale de un calendario lunar que calculamos con lunas medias; nuestro calendario aquí solo orienta.');
    else why.push('El mes y el día salen de un calendario lunar que calculamos con lunas medias, no observadas.');
    lines.push(`<li><span class="date-picker__term">c.</span><span>Quiere decir «hacia»: la fecha es aproximada. ${why.join(' ')}</span></li>`);
  }
  if (h) {
    const name = h.nombre.toLowerCase();
    const which = h.mes.orden <= 12 ? `el ${ORDINAL[h.mes.orden - 1]} mes del año hebreo` : 'el mes que se añadía algunos años después de adar';
    const eq = typeof h.mes.equivale === 'string' && h.mes.equivale ? ` Cae más o menos en ${esc(h.mes.equivale)} de nuestro calendario.` : '';
    const what = span < 0.35 ? `Día ${h.dia} de ${esc(name)}, ${which}.` : `${esc(h.nombre)} es ${which}.`;
    const sunset = span < 0.35 ? ' El día hebreo empezaba al ponerse el sol.' : ' Cada mes empezaba con la luna nueva.';
    const hebrew = `<li><span class="date-picker__term">${esc(name)}</span><span>${what}${eq}${sunset}${h.anacronico ? ` ${ANACHRONIC}` : ''}</span></li>`;
    const n = ourDate(t), month = LONG_MONTHS[n.m];
    const our = `<li><span class="date-picker__term">${esc(month)}</span><span>Cae en ${esc(`${span < 0.35 ? `${n.day} de ` : ''}${month} de ${BE.fmtAnio(Math.floor(t))}`)} en nuestro calendario, que aquí solo orienta: el gregoriano es de 1582.</span></li>`;
    // With «Meses: Nuestros» the date at the top is ours, so ours comes first.
    lines.push(...(ours ? [our, hebrew] : [hebrew, our]));
  } else if (months().length) {
    lines.push('<li><span class="date-picker__term">mes</span><span>Con la escala «Meses» o más cerca, la fecha dice también el mes y el día del calendario hebreo.</span></li>');
  }
  lines.push(Math.floor(t) > 0
    ? '<li><span class="date-picker__term">e.c.</span><span>Quiere decir «era común».</span></li>'
    : '<li><span class="date-picker__term">a.e.c.</span><span>Quiere decir «antes de la era común».</span></li>');
  const about = document.getElementById('fechas-boton') ? '<button type="button" class="date-picker__link" data-dp="about">Sobre las fechas</button>' : '';
  return `<section class="date-picker__part" aria-labelledby="date-picker-this">
    <h3 class="date-picker__heading" id="date-picker-this" tabindex="-1">Esta fecha</h3>
    <p class="date-picker__date">${longDate(t)}</p>
    <ul class="date-picker__meaning">${lines.join('')}</ul>
    <p class="date-picker__links">${about}<a class="date-picker__link" href="calendario.html" data-calendario="1">Cómo eran los meses hebreos</a></p>
  </section>`;
}
const item = (key, t, title, date) => `<li><button type="button" class="date-picker__moment" data-dp-go="${t}" data-dp-key="${esc(key)}"><span class="date-picker__moment-title">${esc(title)}</span><span class="date-picker__moment-date">${esc(date)}</span></button></li>`;
/** The date of an event as the data writes it, without the note in brackets at its end: the card of the event has it. */
const eventDate = (e) => String(e.fecha?.texto || BE.fechaCorta(e.fecha)).replace(/\s*\([^()]*\)\s*$/, '');
const EPS = 1e-4;
/** The events nearest to t: up to NEAR before and NEAR from t on, in the order of time. */
function nearest(t) {
  const all = [];
  for (const e of BE.D.eventos || []) {
    const m = BE.momentoEvento(e);
    if (m != null && Number.isFinite(m)) all.push({ e, m });
  }
  all.sort((a, b) => a.m - b.m);
  return { before: all.filter((x) => x.m < t - EPS).slice(-NEAR), after: all.filter((x) => x.m >= t - EPS).slice(0, NEAR) };
}
/** Milestones that exist in the data, with their moment; `missing` lists the ids the data lacks. */
function milestones() {
  const groups = [], missing = [];
  for (const g of MILESTONES) {
    const age = (BE.D.periodos || []).find((p) => p.id === g.age);
    const items = [];
    for (const key of g.items) {
      const sel = BE.parseSel(key);
      const t = sel && BE.existe(sel.tipo, sel.id) ? BE.momentoDe(sel) : null;
      if (t == null || !Number.isFinite(t)) { missing.push(key); continue; }
      const o = sel.tipo === 'evento' ? BE.D.eventos.find((e) => e.id === sel.id) : null;
      items.push({ key, t, title: BE.nombreSel(sel), date: o ? eventDate(o) : BE.fmtAnio(Math.floor(t)) });
    }
    if (items.length) groups.push({ age, items });
  }
  return { groups, missing };
}
function partMoments() {
  const t = BE.E.t;
  const { before, after } = nearest(t);
  const list = (xs) => xs.map((x) => item(`evento:${x.e.id}`, x.m, x.e.titulo, eventDate(x.e))).join('');
  const now = after.length && Math.abs(after[0].m - t) <= EPS;   // an event at the cursor's own moment
  // Each list of buttons is one stop of the Tab key; the arrow keys move inside it (data-dp-roving).
  const near = before.length || after.length ? `<h4 class="date-picker__subheading">Cerca de esta fecha</h4>
    <div class="date-picker__near" data-dp-roving>
    ${before.length ? `<p class="date-picker__side" id="date-picker-before">Antes</p><ul class="date-picker__moments date-picker__moments--near" aria-labelledby="date-picker-before">${list(before)}</ul>` : ''}
    ${after.length ? `<p class="date-picker__side" id="date-picker-after">${now ? 'Ahora y después' : 'Después'}</p><ul class="date-picker__moments date-picker__moments--near" aria-labelledby="date-picker-after">${list(after)}</ul>` : ''}
    </div>` : '';
  const { groups } = milestones();
  const ages = groups.map((g, i) => `<div class="date-picker__age">
      ${g.age ? `<p class="date-picker__side" id="date-picker-age-${i}">${esc(g.age.nombre)}<span class="date-picker__age-date"> · ${esc(g.age.fecha?.texto || BE.fechaCorta(g.age.fecha))}</span></p>` : ''}
      <ul class="date-picker__moments date-picker__moments--milestones"${g.age ? ` aria-labelledby="date-picker-age-${i}"` : ''}>${g.items.map((x) => item(x.key, x.t, x.title, x.date)).join('')}</ul>
    </div>`).join('');
  return `<section class="date-picker__part" aria-labelledby="date-picker-moments">
    <h3 class="date-picker__heading" id="date-picker-moments" tabindex="-1">Ir a un momento</h3>
    ${near}
    ${ages ? `<h4 class="date-picker__subheading">Momentos clave, por épocas</h4><div class="date-picker__ages" data-dp-roving>${ages}</div>` : ''}
  </section>`;
}
const radio = (on, attrs, body, extra = '') => `<button type="button" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}" class="date-picker__option${extra}" ${attrs}>${body}</button>`;
/** «El día 1 de sebat cae en 23 e.c.», «Los días 1 y 2…», «Los días del 24 al 29…». */
function daysElsewhere(from, to, name, y) {
  const [lo, hi] = yearRange(), one = from === to, out = y < lo || y > hi;
  const where = out ? `${one ? 'queda' : 'quedan'} fuera de las fechas del atlas` : `${one ? 'cae' : 'caen'} en ${BE.fmtAnio(y)}`;
  if (one) return `El día ${from} de ${name} ${where}.`;
  return `Los días ${to === from + 1 ? `${from} y ${to}` : `del ${from} al ${to}`} de ${name} ${where}.`;
}
function partChoose() {
  const s = state, [lo, hi] = yearRange();
  const bce = s.year <= 0;
  const era = `<div class="date-picker__era" role="radiogroup" aria-label="Era">
      ${radio(bce, 'data-dp-era="bce" data-dp-key="era:bce" title="Antes de la era común"', 'a.e.c.')}
      ${radio(!bce, `data-dp-era="ce" data-dp-key="era:ce" title="Era común"${hi < 1 ? ' disabled' : ''}`, 'e.c.')}
    </div>`;
  const step = (d) => {
    const n = Math.abs(d), to = clamp(s.year + d, lo, hi);
    return `<button type="button" class="date-picker__step" data-dp-step="${d}" data-dp-key="step:${d}" aria-label="${n} ${n === 1 ? 'año' : 'años'} ${d < 0 ? 'antes' : 'después'}"${to === s.year ? ' disabled' : ''}>${d < 0 ? '−' : '+'}${n}</button>`;
  };
  const byMonth = months().length ? monthsIn(s.year) : new Map();
  const ms = months().filter((m) => byMonth.has(m.id)).map((m) => {
    const runs = byMonth.get(m.id).runs;
    const n = BE.nombreMes(m, runs[0].hebrewYear);
    return { m, runs, name: n.nombre || m.nombre, anachronic: n.anacronico };
  });
  let chosen = ms.find((x) => x.m.id === s.month);
  if (s.month && !chosen) { s.month = null; s.run = 0; s.day = null; }   // the new year has not got that month
  if (chosen && !chosen.runs[s.run]) s.run = 0;
  if (chosen && s.day != null && !chosen.runs[s.run].days.some((x) => x.day === s.day)) s.day = null;
  const monthCells = ms.map((x) => radio(x.m.id === s.month, `data-dp-month="${esc(x.m.id)}" data-dp-key="month:${esc(x.m.id)}"`,
    `<span class="date-picker__option-name${x.anachronic ? ' date-picker__option-name--anachronic' : ''}">${esc(x.name)}</span><span class="date-picker__option-sub">${esc(typeof x.m.equivale === 'string' ? x.m.equivale : '')}</span>`));
  const monthGrid = ms.length ? `<p class="date-picker__side" id="date-picker-month-label">Mes del calendario hebreo <span class="date-picker__hint">(opcional)</span></p>
    <div class="date-picker__grid date-picker__grid--months" role="radiogroup" aria-labelledby="date-picker-month-label">
      ${radio(!s.month, 'data-dp-month="" data-dp-key="month:"', 'Todo el año', ' date-picker__option--whole')}${monthCells.join('')}
    </div>${ms.some((x) => x.anachronic) ? '<p class="date-picker__note">En cursiva, los nombres de después del exilio: la Biblia de esa época no los usa.</p>' : ''}` : '';
  let dayGrid = '';
  if (chosen) {
    const name = chosen.name.toLowerCase();
    const two = chosen.runs.length > 1;
    const notes = [];
    const runs = chosen.runs.map((r, i) => {
      const first = r.days[0].day, last = r.days.at(-1).day;
      if (first > 1) notes.push(daysElsewhere(1, first - 1, name, s.year - 1));
      if (last < r.length) notes.push(daysElsewhere(last + 1, r.length, name, s.year + 1));
      const label = two ? `<p class="date-picker__run" id="date-picker-run-${i}">En ${LONG_MONTHS[ourDate(r.days[0].t).m]}</p>` : '';
      const cells = r.days.map((x) => radio(s.run === i && s.day === x.day, `data-dp-day="${x.day}" data-dp-run="${i}" data-dp-key="day:${i}:${x.day}"`, String(x.day)));
      return `${label}<div class="date-picker__grid date-picker__grid--days"${two ? ` role="group" aria-labelledby="date-picker-run-${i}"` : ''}>${cells.join('')}</div>`;
    });
    dayGrid = `<p class="date-picker__side" id="date-picker-day-label">Día de ${esc(name)} <span class="date-picker__hint">(opcional)</span></p>
      <div class="date-picker__days" role="radiogroup" aria-labelledby="date-picker-day-label">
        ${radio(s.day == null, 'data-dp-day="" data-dp-key="day:"', 'Todo el mes', ' date-picker__option--whole')}${runs.join('')}
      </div>${notes.length ? `<p class="date-picker__note">${esc(notes.join(' '))}</p>` : ''}`;
  }
  const limit = s.carry ? `<p class="date-picker__note">Las fechas del atlas van de ${esc(BE.fmtAnio(lo))} a ${esc(BE.fmtAnio(hi))}.</p>` : '';
  return `<h3 class="date-picker__heading" id="date-picker-choose" tabindex="-1">Elegir una fecha</h3>
    <div class="date-picker__year">
      ${era}
      <p class="date-picker__year-value" id="date-picker-year">${esc(BE.fmtAnio(s.year))}</p>
    </div>${limit}
    <div class="date-picker__steps" role="toolbar" aria-label="Cambiar el año" data-dp-roving>
      <span class="date-picker__steps-side">${STEPS.map((n) => step(-n)).join('')}</span>
      <span class="date-picker__steps-side">${[...STEPS].reverse().map((n) => step(n)).join('')}</span>
    </div>
    ${monthGrid}${dayGrid}
    <div class="date-picker__go">
      <p class="date-picker__choice" id="date-picker-choice">Elegido: <strong>${esc(choiceText(s))}</strong></p>
      <button type="button" class="be-btn be-btn--primary date-picker__go-button" data-dp="go" data-dp-key="go" aria-describedby="date-picker-choice">Ir</button>
    </div>`;
}
/** One Tab stop per list of buttons: the one that had the focus last, or the first. */
function initRoving(root) {
  for (const g of root.querySelectorAll('[data-dp-roving]')) {
    const items = [...g.querySelectorAll('button')];
    const current = items.find((b) => !b.disabled);
    for (const b of items) b.tabIndex = b === current ? 0 : -1;
  }
}
function renderChoose(focusKey) {
  const part = dialog.querySelector('[data-dp-part="choose"]');
  part.innerHTML = partChoose();
  initRoving(part);
  if (focusKey) (part.querySelector(`[data-dp-key="${CSS.escape(focusKey)}"]:not([disabled])`) || part.querySelector('[data-dp-key="go"]'))?.focus();
  // A screen reader hears the new choice from a live region that stays in the page (the part itself is drawn again).
  const status = dialog.querySelector('#date-picker-status');
  if (status && focusKey) status.textContent = `Elegido: ${choiceText(state)}`;
}

// ---------------------------------------------------------------------------
// Open, close, go
// ---------------------------------------------------------------------------
function build() {
  dialog = document.createElement('dialog');
  dialog.className = 'date-picker';
  dialog.id = 'date-picker';
  dialog.setAttribute('aria-labelledby', 'date-picker-title');
  document.body.appendChild(dialog);
  dialog.addEventListener('click', onClick);
  dialog.addEventListener('keydown', onKey);
  dialog.addEventListener('focusin', onFocusIn);
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  window.addEventListener('resize', () => { if (dialog.open) place(); });
  // The timeline resumes playback by itself after it pauses at an event (linea.js, vigilarReproduccion). While the panel
  // is open, the cursor stays at the date the panel speaks of.
  BE.pintores?.push(() => {
    if (!dialog.open || !BE.E.play) return;
    BE.reproducir(false);
    if (heldAt != null && BE.E.t !== heldAt) BE.setT(heldAt);
  });
  // Back and forward move the cursor under the panel: close it rather than show a date that is no longer the cursor's.
  window.addEventListener('popstate', () => { if (dialog.open) close(); });
  // The second tap of a double tap, or the second click of a double click, must not reach the page the panel uncovered.
  const swallow = (e) => { if (e.isTrusted && !dialog.open && performance.now() < swallowUntil) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); } };
  for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'touchstart', 'touchend', 'contextmenu']) {
    window.addEventListener(type, swallow, { capture: true, passive: false });
  }
}
function place() {
  if (matchMedia(NARROW).matches) { dialog.style.cssText = ''; return; }
  const r = $('#fecha').getBoundingClientRect();
  const w = Math.min(420, window.innerWidth - 16);
  const top = r.bottom + 8;
  dialog.style.width = `${w}px`;
  dialog.style.left = `${clamp(r.left + r.width / 2 - w / 2, 8, window.innerWidth - w - 8)}px`;
  dialog.style.top = `${top}px`;
  dialog.style.maxHeight = `${Math.max(200, window.innerHeight - top - 12)}px`;
}
function open() {
  if (!BE.D) return;
  if (!dialog) build();
  if (dialog.open) return;
  // The panel speaks of the cursor's date: playback stops so that date stays put. It does not resume on close.
  if (BE.E.play) BE.reproducir?.(false);
  heldAt = BE.E.t;
  state = stateAt(BE.E.t);
  dialog.innerHTML = `<div class="date-picker__inner">
    <div class="date-picker__top">
      <div class="date-picker__top-row">
        <h2 class="date-picker__title" id="date-picker-title" tabindex="-1">La fecha del cursor</h2>
        <button type="button" class="date-picker__close" data-dp="close" aria-label="Cerrar">×</button>
      </div>
      <nav class="date-picker__nav" aria-label="Partes del panel">${PARTS.map(([id, label]) => `<button type="button" class="date-picker__jump" data-dp-jump="${id}">${label}</button>`).join('')}</nav>
    </div>
    ${partThisDate()}
    ${partMoments()}
    <section class="date-picker__part" data-dp-part="choose" aria-labelledby="date-picker-choose"></section>
    <p class="sr-only" id="date-picker-status" aria-live="polite"></p>
  </div>`;
  initRoving(dialog);
  renderChoose();
  place();
  dialog.showModal();
  dialog.scrollTop = 0;
  dialog.querySelector('.date-picker__inner').scrollTop = 0;
  $('#fecha').setAttribute('aria-expanded', 'true');
  dialog.querySelector('#date-picker-title').focus();
}
function close() {
  if (!dialog?.open) return;
  swallowUntil = performance.now() + SWALLOW_MS;
  dialog.close();
  $('#fecha')?.setAttribute('aria-expanded', 'false');
  $('#fecha')?.focus();
}
/** Moves the cursor to t. A moment or a year keeps the scale (BE.irA with the span of now; without it BE.irA zooms to
    decades from a wider view). A month from a view wider than months, or a day from a view wider than days, brings the
    view down to months (1.5 years) or to days (0.12), as the search box does: otherwise the date at the top would not
    show what was chosen. The jump gets its entry in the history, like a searched year. */
function go(t, precision = 'moment') {
  let span = BE.span();
  if (precision === 'day' && span >= 0.35) span = 0.12;
  else if (precision === 'month' && span >= 4) span = 1.5;
  BE.historia?.marcar();
  BE.irA(onTimeline(t), span);
  close();
}
/** Scrolls the part `id` under the sticky top of the panel and gives it the focus. */
function jump(id) {
  const heading = dialog.querySelector(`#${CSS.escape(id)}`);
  const inner = dialog.querySelector('.date-picker__inner'), top = dialog.querySelector('.date-picker__top');
  if (!heading) return;
  inner.scrollTop += heading.getBoundingClientRect().top - top.getBoundingClientRect().bottom - 8;
  heading.focus({ preventScroll: true });
}
function onClick(e) {
  // The dialog has no padding of its own (its inner box fills it): a click on the dialog itself is on the backdrop.
  if (e.target === dialog) { close(); return; }
  const b = e.target.closest('button, a');
  if (!b || !dialog.contains(b)) return;
  if (b.dataset.dp === 'close') { close(); return; }
  if (b.dataset.dp === 'about') { close(); document.getElementById('fechas-boton')?.click(); return; }
  if (b.dataset.dpJump) { jump(b.dataset.dpJump); return; }
  if (b.dataset.dpGo != null) { go(+b.dataset.dpGo); return; }
  if (b.dataset.dp === 'go') { const l = landingOf(state); go(l.t, l.precision); return; }
  choose(b);
}
/** A control of «Elegir una fecha»: changes the choice and draws the part again with the focus on the same control. */
function choose(b) {
  const [lo, hi] = yearRange();
  const s = state;
  if (b.dataset.dpEra) {
    // The number read is kept when the era changes. If the data clamps it, it is kept aside, so switching back gives it
    // again (608 a.e.c. → 100 e.c. → 608 a.e.c.).
    let n = s.year <= 0 ? 1 - s.year : s.year;
    if (s.carry && s.carry.year === s.year) n = s.carry.n;
    const want = b.dataset.dpEra === 'bce' ? 1 - n : n;
    s.year = clamp(want, lo, hi);
    s.carry = s.year !== want ? { n, year: s.year } : null;
    s.run = 0;
  } else if (b.dataset.dpStep) {
    s.year = clamp(s.year + +b.dataset.dpStep, lo, hi);
    s.carry = null; s.run = 0;
  } else if (b.dataset.dpMonth != null) {
    s.month = b.dataset.dpMonth || null;
    s.day = null; s.run = 0;
  } else if (b.dataset.dpDay != null) {
    s.day = b.dataset.dpDay ? +b.dataset.dpDay : null;
    s.run = b.dataset.dpRun != null ? +b.dataset.dpRun : 0;
  } else return;
  renderChoose(b.dataset.dpKey);
}
function onFocusIn(e) {
  const g = e.target.closest?.('[data-dp-roving]');
  if (!g || e.target.tagName !== 'BUTTON') return;
  for (const b of g.querySelectorAll('button')) b.tabIndex = b === e.target ? 0 : -1;
}
/** The option of `opts` in the row above or below `b`, nearest to it across: works whatever the number of columns. */
function vertical(opts, b, down) {
  const r = b.getBoundingClientRect(), cx = r.left + r.width / 2;
  const rows = opts.filter((o) => { const q = o.getBoundingClientRect(); return down ? q.top >= r.bottom - 1 : q.bottom <= r.top + 1; });
  if (!rows.length) return null;
  const edge = down ? Math.min(...rows.map((o) => o.getBoundingClientRect().top)) : Math.max(...rows.map((o) => o.getBoundingClientRect().top));
  const row = rows.filter((o) => Math.abs(o.getBoundingClientRect().top - edge) < 2);
  return row.reduce((best, o) => { const q = o.getBoundingClientRect(); const d = Math.abs(q.left + q.width / 2 - cx); return !best || d < best.d ? { o, d } : best; }, null)?.o;
}
/** Arrow keys, Home and End move inside a group: in a group of radios they also choose, as radios do; in a list of
    moments or the year steps they only move the focus. Keys never reach the timeline behind. */
function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
  if (e.key === 'Tab') return;
  e.stopPropagation();
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
  if (e.altKey || e.metaKey || e.ctrlKey) return;   // Alt + ← y ⌘ + ←: atrás del navegador
  const b = e.target.closest?.('button');
  const radios = b?.getAttribute('role') === 'radio' ? b.closest('[role="radiogroup"]') : null;
  const group = radios || b?.closest('[data-dp-roving]');
  if (!group) return;
  const opts = [...group.querySelectorAll(radios ? '[role="radio"]:not([disabled])' : 'button:not([disabled])')];
  const i = opts.indexOf(b);
  let next = null;
  if (e.key === 'Home') next = opts[0];
  else if (e.key === 'End') next = opts.at(-1);
  else if (e.key === 'ArrowLeft') next = opts[i - 1];
  else if (e.key === 'ArrowRight') next = opts[i + 1];
  else next = vertical(opts, b, e.key === 'ArrowDown');
  e.preventDefault();
  if (!next || next === b) return;
  if (radios) choose(next); else next.focus();
}

BE.datePicker = {
  open, close, isOpen: () => !!dialog?.open,
  /** The days one can choose in our year y, by Hebrew month: [{ id, runs: [{ hebrewYear, days: [{ day, t }] }] }]. */
  monthsIn: (y) => [...monthsIn(y).entries()].map(([id, x]) => ({ id, runs: x.runs.map((r) => ({ hebrewYear: r.hebrewYear, length: r.length, days: r.days.map((d) => ({ ...d })) })) })),
};
})();
