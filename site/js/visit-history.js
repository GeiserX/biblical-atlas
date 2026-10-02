/* biblical-atlas · the rules behind «Atrás» and «Adelante» (docs/ideas/atras-adelante.md, option E). Pure: no DOM, no
   storage and no clock, so tests/site/visit-history.test.mjs runs them in node:vm. The wiring lives in BE.historia
   (buscar.js), the one place that pushes history entries.

   The browser does not say whether there is anything behind or ahead, nor what it is. So every entry of a visit carries
   its own number and name in history.state, { visit, step, name }, and this tab keeps the names of each visit in
   sessionStorage as a list indexed by step. Back is possible when step > 0; Forward when the list goes past step. A new
   entry cuts the list after the current step, as the browser drops the entries ahead. A visit starts on a page load
   without our state (a shared link, a new tab, a link from another page); a reload keeps the state, so it keeps its
   visit and its step.

   An entry also keeps what the address does not say, so Back, Forward and a reload bring it back as it was left: the
   map's frame, { lon, lat, zoom }, written when the map stops moving, and the timeline mark pressed last (its id), so a
   second press on it releases it (docs/ideas/atras-adelante-flecos.md, questions 2 and 4). A new entry starts without
   either. */
'use strict';
(() => {
const BE = window.BE;

const MAX_VISITS = 8;   // the visits of this tab whose names are kept; the oldest goes first

/** Is this a history.state written by us? */
const isEntry = (s) => !!s && typeof s === 'object' && typeof s.visit === 'string' && s.visit !== ''
  && Number.isInteger(s.step) && s.step >= 0;

/** A map frame: a centre inside the world and a zoom a map can take. */
const isFrame = (f) => !!f && typeof f === 'object' && [f.lon, f.lat, f.zoom].every(Number.isFinite)
  && Math.abs(f.lon) <= 180 && Math.abs(f.lat) <= 90 && f.zoom >= 0 && f.zoom <= 24;
/** What an entry keeps besides its number and name, when it is readable: { frame, mark }. */
function extras(s) {
  const out = {};
  if (isFrame(s?.frame)) out.frame = { lon: s.frame.lon, lat: s.frame.lat, zoom: s.frame.zoom };
  if (typeof s?.mark === 'string' && s.mark !== '') out.mark = s.mark;
  return out;
}
/** The entry with the map's frame, rounded (about a metre, a hundredth of a zoom step). An unreadable frame is dropped. */
function withFrame(state, frame) {
  const { frame: _, ...rest } = state;
  if (!isFrame(frame)) return rest;
  const r = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
  return { ...rest, frame: { lon: r(frame.lon, 5), lat: r(frame.lat, 5), zoom: r(frame.zoom, 2) } };
}
/** The entry with the timeline mark pressed last, or without one. */
function withMark(state, mark) {
  const { mark: _, ...rest } = state;
  return typeof mark === 'string' && mark !== '' ? { ...rest, mark } : rest;
}

/** Visits are a list of [id, names], the newest last. Unreadable input counts as none. */
function cleanVisits(visits) {
  return Array.isArray(visits) ? visits.filter((v) => Array.isArray(v) && typeof v[0] === 'string' && Array.isArray(v[1])) : [];
}
function namesOf(visits, id) {
  const v = cleanVisits(visits).find((x) => x[0] === id);
  return v ? v[1].map((n) => (typeof n === 'string' ? n : null)) : null;
}
/** The visits with `id` holding `names`, moved to the end; only the newest MAX_VISITS stay. */
function withNames(visits, id, names) {
  const rest = cleanVisits(visits).filter((x) => x[0] !== id);
  return [...rest, [id, names]].slice(-MAX_VISITS);
}
/** A list of names that reaches `step`, with `name` there. Unknown names are null. */
function put(names, step, name) {
  const out = names.slice();
  while (out.length <= step) out.push(null);
  out[step] = name ?? out[step] ?? null;
  return out;
}

/** Page load. Our state (a reload, Back into this page from another one) keeps its visit, step, frame and mark;
    anything else starts visit `newId` at step 0. */
function begin(state, visits, newId, name = null) {
  if (isEntry(state)) {
    const names = put(namesOf(visits, state.visit) || [], state.step, state.name ?? name);
    return { state: { visit: state.visit, step: state.step, name: names[state.step], ...extras(state) }, visits: withNames(visits, state.visit, names) };
  }
  return { state: { visit: newId, step: 0, name }, visits: withNames(visits, newId, [name]) };
}
/** A new entry after `state`: what was ahead is gone, as in the browser. `name` is the new entry's name for now (the
    view it copies); rename() gives it its own once the address is written. */
function push(state, visits, name = state?.name ?? null) {
  const names = put((namesOf(visits, state.visit) || []).slice(0, state.step + 1), state.step, state.name);
  names.push(name);
  // The new entry has neither the frame nor the mark of the one before: it gets its own.
  return { state: { visit: state.visit, step: state.step + 1, name }, visits: withNames(visits, state.visit, names) };
}
/** The current entry shows another view, or the same view under a new name (the date moved). */
function rename(state, visits, name) {
  const names = put(namesOf(visits, state.visit) || [], state.step, name);
  names[state.step] = name;
  return { state: { ...state, name }, visits: withNames(visits, state.visit, names) };
}
/** popstate. Our state: Back or Forward inside the visit. No state: the browser made a new entry for an address typed
    or a link with a «#», always right after the one we were on (`previous`); without one, visit `newId` starts. A
    stateless entry reached by going back or forth (`traversal`: a tab open before the buttons existed, or a state
    someone erased) is not new and its place in the visit is unknown: visit `newId` starts there. fresh says the entry
    needs our state written. */
function arrive(previous, state, visits, newId, name = null, traversal = false) {
  if (isEntry(state)) return { ...begin(state, visits, state.visit, name), fresh: false };
  if (!isEntry(previous) || traversal) return { ...begin(null, visits, newId, name), fresh: true };
  return { ...push(previous, visits, name), fresh: true };
}
/** Leaving the page by a link: the browser drops every entry ahead of this one. */
function cutForward(state, visits) {
  const names = (namesOf(visits, state.visit) || []).slice(0, state.step + 1);
  return withNames(visits, state.visit, put(names, state.step, state.name));
}
/** What is behind and ahead of `state`: whether there is anything, and its name when we know it. */
function around(state, visits) {
  if (!isEntry(state)) return { back: { can: false, name: null }, forward: { can: false, name: null } };
  const names = namesOf(visits, state.visit) || [];
  return {
    back: { can: state.step > 0, name: state.step > 0 ? names[state.step - 1] ?? null : null },
    forward: { can: names.length > state.step + 1, name: names[state.step + 1] ?? null },
  };
}

// ---------------------------------------------------------------------------
// Names and labels
// ---------------------------------------------------------------------------
/** The label (aria-label and title) of a button: «Atrás: Samotracia», «No hay nada adelante». */
function buttonLabel(dir, { can, name }) {
  const word = dir === 'back' ? 'Atrás' : 'Adelante';
  if (!can) return dir === 'back' ? 'No hay nada atrás' : 'No hay nada adelante';
  return name ? `${word}: ${name}` : `${word}: ${dir === 'back' ? 'la vista anterior' : 'la vista siguiente'}`;
}
/** The name of a view, from what it shows, most specific first. Every field is optional:
    { landing, reading: { chapter, passage }, tour: { name, stop }, connection: [a, b], graph, sync, now, selection, date }. */
function viewName(v = {}) {
  if (v.landing) return 'la portada';
  // The graph and the connection cover the whole map, so they name the view over a reading or a tour behind them.
  if (v.graph !== undefined && v.graph !== null) return v.graph ? `Grafo de ${v.graph}` : 'Grafo de personas';
  if (v.connection) {
    const [a, b] = v.connection;
    if (a && b) return `Conexión entre ${a} ${and(b)} ${b}`;
    return a || b ? `Conexión desde ${a || b}` : 'Conexión entre dos';
  }
  // «Ahora mismo» and the sincronía are opened over whatever is behind, a reading too: they name the view.
  if (v.sync !== undefined && v.sync !== null) return v.sync ? `Sincronía de ${v.sync}` : 'Sincronía';
  if (v.now) return v.date ? `Ahora mismo en ${v.date}` : 'Ahora mismo';
  if (v.reading?.chapter) return `Lectura de ${v.reading.chapter}${v.reading.passage ? `, pasaje ${v.reading.passage}` : ''}`;
  if (v.tour?.name) return v.tour.stop ? `${v.tour.name}, parada ${v.tour.stop}` : v.tour.name;
  if (v.selection) return v.selection;
  return v.date ? `El mapa en ${v.date}` : 'El mapa';
}
/** «y», or «e» before a word that starts with the sound i (Isaac, Hiram), but not before ie, ia… (Hierápolis). */
function and(word) { return /^h?[ií](?![aeiouáéíóú])/i.test(word || '') ? 'e' : 'y'; }
/** The name of a new entry that would read the same as the one behind it (a year searched while a reading or a card
    stays open, the second year after the first) gets the date, so the label and the browser's list tell them apart. A name with the date already in
    it stays as it is. */
function distinctName(name, previous, date) {
  if (!name || !date || !previous || name.endsWith(` en ${date}`)) return name;
  if (previous !== name && !previous.startsWith(`${name} en `)) return name;
  return `${name} en ${date}`;
}
/** The tab's title for a view: its name first, so the browser's history list and bookmarks tell entries apart. The
    landing keeps the page's own title. */
function pageTitle(name, { landing = false, base = 'biblical-atlas' } = {}) {
  if (landing || !name) return base;
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} · biblical-atlas`;
}

BE.visitHistory = { isEntry, isFrame, withFrame, withMark, begin, push, rename, arrive, cutForward, around, buttonLabel, viewName, distinctName, pageTitle, MAX_VISITS };
})();
