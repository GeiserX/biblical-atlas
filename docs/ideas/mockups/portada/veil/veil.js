/* biblical-earth · portada «El mapa detrás del velo» (prototipo).

   Qué hace:
   - Pinta al instante la imagen del mapa antiguo (../assets/img/paul-journeys-*) y, detrás, carga el sitio real en un
     marco. Cuando el mapa vivo está quieto en el mismo encuadre, sustituye a la imagen con un fundido (K1).
   - Mientras la portada está puesta, el marco es inerte: no recibe teclado ni puntero. El sitio va sin su interfaz,
     con el mapa a toda la ventana y sin marcas ni rutas, como la imagen.
   - Entrar levanta el papel en 280 ms sobre un mapa que no se mueve: la interfaz del sitio vuelve alrededor del mapa y
     el mapa se corrige al píxel para que nada salte. Después, si se entra en algo, el sitio lo encuadra. El foco va al
     título de la ficha. Atrás, el logo del sitio o «Portada» del menú Estudio vuelven a poner el papel, con el mapa
     como lo dejó la persona (G2).
   - En el ordenador, parar el puntero o el foco 250 ms sobre una entrada lleva el mapa de detrás a donde iría, con la
     etiqueta «Vista previa: …» (I4). Nada más se mueve por sí solo (J2).
   Con el sitio en otro origen (?site= apuntando fuera de este servidor) el marco no se puede manejar: la portada se
   queda con la imagen y entrar abre el sitio en esa dirección, si responde.
   Dónde está el sitio, el aviso si no carga y la letra grande vienen de ../assets/sitio.js. */
'use strict';
(() => {
const S = window.veilShared;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const frames = (n = 2, w = window) => new Promise((r) => { const f = () => (--n <= 0 ? r() : w.requestAnimationFrame(f)); w.requestAnimationFrame(f); });

// ---------------------------------------------------------------------------------------------------------------
// Dónde está el sitio: site/ al lado (la raíz del repositorio servida), el publicado si no, y ?site= manda (sitio.js).
// ---------------------------------------------------------------------------------------------------------------
const P = window.PORTADA_SITIO;
const SITE = P.base;
const SAME_ORIGIN = P.mismoOrigen;
const KEY_LAST = 'biblical-earth:ultima', KEY_MEETING = 'biblical-earth:pref:reunion';
const DEFAULT_HASH = 't=50.3000&v=40&mapa=antiguo';   // la vista con la que abre el sitio (base.js, T_INICIAL y VISTA_INICIAL)
const T_MIN = -4025, T_MAX = 100;
const LOCAL_SITE = '../../../../../site/';
document.querySelectorAll(`a[href^="${LOCAL_SITE}"]`).forEach((a) => { a.href = SITE + a.getAttribute('href').slice(LOCAL_SITE.length); });

const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const wideQuery = matchMedia('(min-width: 820px)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const meeting = () => root.classList.contains('be-reunion');
const motionOk = () => !reducedMotion.matches && !meeting();
const FADE = () => (motionOk() ? 280 : 0);

const stage = $('#stage');
let frame = $('#site');
let V = window.VEIL_DATA;
let phase = 'landing';           // landing | waiting | entering | inside | returning
let live = null;                 // { w, d, BE, gl } cuando el sitio del marco está listo
let resolveLive;
const liveReady = new Promise((r) => { resolveLive = r; });
let base = null;                 // la cámara de la portada { center, zoom, own }: own = la última vista de la persona
let preview = null;              // la vista previa en curso { key, target }
const lastView = () => { try { const u = JSON.parse(localStorage.getItem(KEY_LAST) || 'null'); return u && u.hash ? u : null; } catch { return null; } };
const returning = !!lastView();
function announce(t) { const a = $('#announcer'); a.textContent = ''; setTimeout(() => { a.textContent = t; }, 30); }

// ---------------------------------------------------------------------------------------------------------------
// El encuadre: la cámara de la imagen, que el mapa vivo repite al píxel
// ---------------------------------------------------------------------------------------------------------------
// Las capturas de ../assets (render-backdrops.mjs): centro y zoom a su tamaño nativo (teselas de 512 px).
const CAPTURE = {
  wide: { c: [24.6, 36.4], z: Math.log2((2560 * 360) / (512 * 25)), w: 2560, h: 1440 },
  tall: { c: [29.6, 36.2], z: Math.log2((860 * 360) / (512 * 11)), w: 860, h: 1800 },
};
const worldSize = (z) => 512 * 2 ** z;
function toPixel(lon, lat, z) { const ws = worldSize(z), s = Math.sin((lat * Math.PI) / 180); return [((lon + 180) / 360) * ws, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * ws]; }
function toGeo(x, y, z) { const ws = worldSize(z); return [(x / ws) * 360 - 180, (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / ws))) * 180) / Math.PI]; }
function camToPixel(cam, lon, lat) { const [x, y] = toPixel(lon, lat, cam.z), [xc, yc] = toPixel(cam.c[0], cam.c[1], cam.z); return [x - xc + cam.cx, y - yc + cam.cy]; }
function pixelToCam(cam, px, py) { const [xc, yc] = toPixel(cam.c[0], cam.c[1], cam.z); return toGeo(xc + px - cam.cx, yc + py - cam.cy, cam.z); }
let bandProbe;
function bandHeight() {
  if (!bandProbe) { bandProbe = document.createElement('div'); bandProbe.style.cssText = 'position:absolute;visibility:hidden;height:var(--band);width:0;top:0'; document.body.append(bandProbe); }
  return bandProbe.offsetHeight;
}
/** La geometría de la portada a este tamaño: la cámara de la imagen, el relleno del mapa y la zona donde se ve. */
function layout() {
  const W = stage.clientWidth, H = stage.clientHeight;
  if (wideQuery.matches) {
    const C = CAPTURE.wide, s = Math.max(W / C.w, H / C.h), z = C.z + Math.log2(s), x0 = Math.round(W * 0.52);
    const cam = { z, cx: W - (C.w / 2) * s, cy: H / 2, c: C.c };
    return { shape: 'wide', W, H, cam, zoom: z, center: pixelToCam(cam, (x0 + W) / 2, H / 2), padding: { top: 0, bottom: 0, left: x0, right: 0 },
      zone: { x0: x0 + 6, x1: W - 12, y0: 12, y1: H - 12 }, markAt: [30.7, 34.95], maxPlaces: 7 };
  }
  const C = CAPTURE.tall, s = W / C.w, z = C.z + Math.log2(s), band = bandHeight();
  const cam = { z, cx: W / 2, cy: band / 2, c: C.c };
  return { shape: 'tall', W, H, band, cam, zoom: z, center: C.c, padding: { top: 0, bottom: H - band, left: 0, right: 0 },
    zone: { x0: 8, x1: W - 8, y0: 8, y1: band - 50 }, markAt: [30.4, 35.55], maxPlaces: 3 };
}

// ---------------------------------------------------------------------------------------------------------------
// Los lugares de una fecha, con la letra del mapa: los que caben en la parte visible, de oeste a este
// ---------------------------------------------------------------------------------------------------------------
let ctx2d;
function textWidth(t) {
  ctx2d ??= document.createElement('canvas').getContext('2d');
  ctx2d.font = '600 16px "EB Garamond", Georgia, serif';
  return ctx2d.measureText(t).width;
}
/** Cajas que un nombre no puede pisar: la leyenda, «Entrar al mapa», el crédito y las herramientas del prototipo. */
function uiBoxes() {
  const s = stage.getBoundingClientRect();
  return ['#map-caption', '#enter', '#credit', '.proto-tools'].map((q) => $(q)).filter((n) => n && n.offsetParent)
    .map((n) => { const r = n.getBoundingClientRect(); return [r.left - s.left - 4, r.top - s.top - 4, r.right - s.left + 4, r.bottom - s.top + 4]; });
}
/** Hasta max lugares que caben sin pisarse dentro de la zona, los de más peso primero; devueltos de oeste a este.
    El nombre va a la derecha del punto y, si ahí no cabe, a la izquierda. */
function placeLabels(cands, project, zone, max, obstacles = []) {
  const boxes = [...obstacles, ...uiBoxes()], out = [];
  const inside = (b) => b[0] >= zone.x0 && b[2] <= zone.x1 && b[1] >= zone.y0 && b[3] <= zone.y1;
  const free = (b) => !boxes.some((o) => !(b[2] + 6 < o[0] || b[0] - 6 > o[2] || b[3] < o[1] || b[1] > o[3]));
  for (const c of [...cands].sort((a, b) => b.weight - a.weight)) {
    if (out.length >= max) break;
    const [x, y] = project(c.lon, c.lat);
    const w = textWidth(c.name) + 26;
    const right = [x - 9, y - 20, x - 9 + w, y + 20], left = [x + 9 - w, y - 20, x + 9, y + 20];
    const box = [right, left].find((b) => inside(b) && free(b));
    if (!box) continue;
    boxes.push(box);
    out.push({ ...c, x, y, left: box === left });
  }
  return out.sort((a, b) => a.lon - b.lon);
}
function renderPlaces(items, { interactive, caption }) {
  const g = $('#places');
  g.querySelectorAll('.place').forEach((n) => n.remove());
  for (const it of items) {
    const n = document.createElement(interactive ? 'button' : 'span');
    n.className = `place${it.left ? ' place--left' : ''}`;
    n.style.left = `${Math.round(it.x)}px`; n.style.top = `${Math.round(it.y)}px`;
    n.innerHTML = `<span class="place__dot" aria-hidden="true"></span><span class="place__name">${esc(it.name)}</span>`;
    if (interactive) {
      n.type = 'button';
      n.dataset.go = `place:${it.id}`;
      if (it.t != null) n.dataset.t = String(it.t);
      n.setAttribute('aria-label', it.t != null ? `${it.name}, c. ${S.year(it.t)}: entrar al mapa en este lugar` : `${it.name}: entrar al mapa en este lugar`);
    } else n.setAttribute('aria-hidden', 'true');
    g.append(n);
  }
  $('#places-title').textContent = items.length ? `O toca un lugar del mapa: ${caption}` : 'Lugares del mapa';
  g.hidden = !items.length;
}
function setCaption(k, v) { $('#caption-k').textContent = k; $('#caption-v').textContent = v; }
function placeMark(L, visible) {
  const m = $('#mark');
  if (!visible) { m.setAttribute('hidden', ''); return; }   // un <svg> no tiene la propiedad hidden: va por atributo
  const [x, y] = camToPixel(L.cam, L.markAt[0], L.markAt[1]);
  m.style.left = `${Math.round(x)}px`; m.style.top = `${Math.round(y)}px`;
  m.removeAttribute('hidden');
}
const markBoxes = (L) => { if ($('#mark').hasAttribute('hidden')) return []; const [x, y] = camToPixel(L.cam, L.markAt[0], L.markAt[1]); const r = wideQuery.matches ? 52 : 32; return [[x - r, y - r, x + r, y + r]]; };

/** La primera pantalla de quien llega: la imagen (o el mapa vivo en su mismo encuadre), la marca sobre el mar y los
    lugares del viaje de la fecha inicial. */
function renderImageBase() {
  const L = layout();
  placeMark(L, true);
  if (returning && SAME_ORIGIN && !live) {   // quien vuelve verá su última vista: hasta que llegue, sin lugares
    setCaption('En el mapa:', 'tu última vista, en cuanto cargue');
    renderPlaces([], { interactive: true, caption: '' });
    return;
  }
  const st = V.start;
  setCaption('En el mapa:', st ? st.caption : '');
  const items = st ? placeLabels(st.places, (lon, lat) => camToPixel(L.cam, lon, lat), L.zone, L.maxPlaces, markBoxes(L)) : [];
  renderPlaces(items, { interactive: true, caption: st ? st.caption : '' });
}
/** La portada sobre la vista de la persona: su selección y su fecha en la leyenda, y los lugares de esa fecha. */
function ownCaption() {
  const BE = live.BE, name = BE.E.sel ? BE.nombreSel(BE.E.sel) : '';
  setCaption('En el mapa:', `tu última vista, ${[name, `c. ${S.year(BE.E.t)}`].filter(Boolean).join(' · ')}`);
}
function renderOwnView() {
  const { gl, BE } = live, L = layout();
  placeMark(L, false);
  const t = BE.E.t, D = BE.D, trip = S.tripAt(D, t);
  const cands = trip ? S.tripPlaces(D, trip.id) : S.rangePlaces(D, t - 1.5, t + 1.5);
  ownCaption();
  const items = placeLabels(cands, (lon, lat) => { const p = gl.project([lon, lat]); return [p.x, p.y]; }, L.zone, L.maxPlaces);
  renderPlaces(items, { interactive: true, caption: `lugares de c. ${S.year(t)}` });
  $('#places').classList.remove('is-hidden');
}
function baseCaption() { if (base?.own) ownCaption(); else setCaption('En el mapa:', V.start ? V.start.caption : ''); }

// ---------------------------------------------------------------------------------------------------------------
// Zonas de abajo: preguntas, épocas y recorridos (de data.js; se rehacen con los datos vivos si cambian)
// ---------------------------------------------------------------------------------------------------------------
function savedStep(id) { try { const v = localStorage.getItem(`biblical-earth:recorrido:${id}`); return v == null ? null : +v; } catch { return null; } }
function renderZones() {
  $('#examples').querySelectorAll('.chip').forEach((n) => n.remove());
  for (const x of ['Pablo', 'Hechos 16', '607 a.e.c.']) {
    $('#examples').insertAdjacentHTML('beforeend', `<button type="button" class="chip" data-go="example:${esc(x)}" data-preview="example:${esc(x)}" aria-describedby="try-label">${esc(x)}</button>`);
  }
  $('#questions').innerHTML = V.questions.map((q, i) => `<li><button type="button" class="row" data-go="question:${i}" data-preview="question:${i}">
    <span class="row__main"><span class="row__t">${esc(q.text)}</span><span class="row__m">${esc(q.shows)}</span></span><span class="row__go" aria-hidden="true">→</span></button></li>`).join('');
  $('#eras').innerHTML = V.eras.map((e) => `<li><button type="button" class="era${e.noBook ? ' era--no-book' : ''}" data-go="era:${esc(e.id)}" data-preview="era:${esc(e.id)}">
    <span class="era__n">${e.n}</span><span class="era__name">${esc(e.name)}</span><span class="era__date">${esc(e.label)}${e.noBook ? ' · sin libro bíblico' : ''}</span></button></li>`).join('');
  $('#tours').innerHTML = V.tours.map((r) => {
    const p = savedStep(r.id);
    const midway = p != null && p > 0 && p < r.stops;
    return `<li><button type="button" class="row" data-go="tour:${esc(r.id)}" data-preview="tour:${esc(r.id)}">
      <span class="row__main"><span class="row__t row__t--serif">${esc(r.title)}</span>
      <span class="row__m">${r.stops} paradas${r.dates ? ` · ${esc(r.dates)}` : ''}${midway ? ` · <b>vas por la parada ${p + 1}</b>` : ''}</span>
      ${r.summary ? `<span class="row__m">${esc(r.summary)}</span>` : ''}</span>
      <span class="row__go" aria-hidden="true">${midway ? 'Seguir' : 'Empezar'} →</span></button></li>`;
  }).join('');
  const c = V.counts;
  $('#counts').textContent = `${c.events.toLocaleString('es')} sucesos, ${c.places.toLocaleString('es')} lugares y ${c.people.toLocaleString('es')} personas, cada dato con su fuente. Datos del ${longDate(V.generated)}.`;
  renderDates();
}
function longDate(iso) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return m ? `${+m[3]} de ${MONTHS[+m[2] - 1]} de ${m[1]}` : iso;
}
/** La raya del banner: escala real de 4026 a.e.c. a 100 e.c., marcas menores en el principio de cada época, marcas de
    pino y rótulo en las seis fechas; un rótulo que choca sube encima de la raya, y si aún choca se acorta. */
function renderDates() {
  const svg = $('#dates');
  const W = svg.clientWidth || 500;
  svg.setAttribute('viewBox', `0 0 ${W} 58`);
  const x = (t) => 1 + ((t - T_MIN) / (T_MAX - T_MIN)) * (W - 2);
  const MAJOR = [[-4025, '4026 a.e.c.', '4026'], [-2369, '2370', '2370'], [-1512, '1513', '1513'], [-606, '607 a.e.c.', '607'], [33, '33 e.c.', '33'], [100, '100 e.c.', '100']];
  const minor = V.eras.map((e) => e.from).filter((t) => !MAJOR.some(([m]) => Math.abs(m - t) < 2));
  let h = `<rect class="axis" x="0" y="28.4" width="${W}" height="1.3" rx=".7"/>`;
  for (const e of V.eras) h += `<rect class="span" data-era="${esc(e.id)}" x="${x(e.from)}" y="26.5" width="${Math.max(3, x(e.to) - x(e.from))}" height="5" rx="1.5"/>`;
  for (const t of minor) h += `<rect class="tick-minor" x="${x(t) - 0.6}" y="25.5" width="1.2" height="7"/>`;
  const placed = [];
  for (const [t] of MAJOR) h += `<rect class="tick-major" x="${x(t) - 1}" y="22.5" width="2" height="13"/>`;
  // Primero los extremos y 607 a.e.c. con su nombre entero; los demás ceden si no caben.
  [0, 5, 3, 1, 2, 4].forEach((i) => {
    const [t, long, short] = MAJOR[i];
    const anchor = i === 0 ? 'start' : i === MAJOR.length - 1 ? 'end' : 'middle';
    const box = (txt) => { const w = txt.length * 7.1, cx = x(t); return anchor === 'start' ? [cx, cx + w] : anchor === 'end' ? [cx - w, cx] : [cx - w / 2, cx + w / 2]; };
    const hits = (b, row) => placed.some((p) => p.row === row && !(b[1] + 6 < p.b[0] || b[0] - 6 > p.b[1]));
    let txt = long, row = 'below';
    if (hits(box(txt), 'below')) { row = 'above'; if (hits(box(txt), 'above')) { txt = short; if (hits(box(txt), 'above')) row = 'below'; } }
    placed.push({ b: box(txt), row });
    h += `<text class="lbl" x="${x(t)}" y="${row === 'below' ? 53 : 15}" text-anchor="${anchor}">${esc(txt)}</text>`;
  });
  svg.innerHTML = h;
}
function highlightEra(id) { $('#dates').querySelectorAll('.span').forEach((r) => r.classList.toggle('on', r.dataset.era === id)); }

// ---------------------------------------------------------------------------------------------------------------
// «Seguir donde lo dejaste»
// ---------------------------------------------------------------------------------------------------------------
function renderResume() {
  const u = lastView(), r = $('#resume');
  if (!u) { r.hidden = true; r.innerHTML = ''; return; }
  r.hidden = false;
  r.innerHTML = `<button type="button" class="resume__go" data-go="resume"><span class="resume__k">Seguir donde lo dejaste</span><span class="resume__v">${esc(u.texto || 'Tu última vista')}</span><span class="resume__arrow" aria-hidden="true">Seguir →</span></button>
    <button type="button" class="resume__forget" data-go="forget" aria-label="Olvidar la última vista (se guarda solo en este navegador)">Olvidar</button>`;
}

// ---------------------------------------------------------------------------------------------------------------
// El sitio en el marco
// ---------------------------------------------------------------------------------------------------------------
const FRAME_CSS = `
html.veil-landing #mapa { position: fixed !important; inset: 0 !important; z-index: 0 !important; }
html.veil-landing #mapa::after, html.veil-landing #mapa > :not(#mapa-gl) { visibility: hidden !important; }
html.veil-landing #app > :not(#mapa), html.veil-landing #mapa-gl > :not(.maplibregl-canvas-container), html.veil-landing .maplibregl-marker, html.veil-landing .maplibregl-popup {
  opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }
html.veil-switching #app > :not(#mapa), html.veil-switching #mapa-gl > :not(.maplibregl-canvas-container), html.veil-switching .maplibregl-marker { transition: opacity .28s ease, visibility 0s linear .28s !important; }
html.veil-switching:not(.veil-landing) #app > :not(#mapa), html.veil-switching:not(.veil-landing) #mapa-gl > :not(.maplibregl-canvas-container), html.veil-switching:not(.veil-landing) .maplibregl-marker { transition: opacity .28s ease, visibility 0s !important; }
html.be-reunion.veil-switching *, html.veil-still.veil-switching * { transition: none !important; }`;
function frameSrc() {
  const u = lastView();
  const h = u ? u.hash.replace(/^#/, '').replace(/(^|&)portada=1(?=&|$)/, '').replace(/^&/, '') : DEFAULT_HASH;
  return `${SITE}index.html#${h || DEFAULT_HASH}`;
}
function watchFrame() {
  let doc = null;
  const tick = () => {
    let w, d;
    try { w = frame.contentWindow; d = w.document; } catch { return; }
    if (d && d !== doc && d.URL.startsWith(SITE) && d.head) {
      doc = d;
      const st = d.createElement('style'); st.id = 'veil-style'; st.textContent = FRAME_CSS; d.head.append(st);
      d.documentElement.classList.add('veil-landing');
    }
    const gl = w?.BE?.mapa?.gl;
    if (doc && w.BE?.D && gl && gl.isStyleLoaded()) { onFrameReady(w, gl); return; }
    setTimeout(tick, 50);
  };
  tick();
}
const settled = (gl) => new Promise((r) => { if (!gl.isMoving() && gl.loaded()) r(); else gl.once('idle', r); });
let hiddenLayers = [], sitePadding = null, siteBounds = null;
function hideLayers() {
  const gl = live.gl;
  for (const l of gl.getStyle().layers) {
    if (['raster', 'background', 'hillshade'].includes(l.type)) continue;
    if ((gl.getLayoutProperty(l.id, 'visibility') ?? 'visible') === 'none') continue;
    gl.setLayoutProperty(l.id, 'visibility', 'none');
    hiddenLayers.push(l.id);
  }
}
function showLayers() {
  const gl = live.gl;
  for (const id of hiddenLayers) if (gl.getLayer(id)) gl.setLayoutProperty(id, 'visibility', 'visible');
  hiddenLayers = [];
}
async function onFrameReady(w, gl) {
  live = { w, BE: w.BE, gl, d: w.document };
  // Mientras se entra, lo que el sitio apile en su historial se convierte en sustitución (ver enter()).
  const H = w.History.prototype, push = H.pushState;
  H.pushState = function (...a) { return silenced ? this.replaceState(...a) : push.apply(this, a); };
  // Atrás hasta la portada no cambia el mapa de detrás: el sitio no atiende ese paso (su dirección volvería a la de
  // antes de entrar y deshacería lo elegido); la entrada de la portada se queda con la vista de la persona (G2).
  const keepView = (e) => {
    if (location.hash === '#mapa') return;
    e.stopImmediatePropagation();
    setTimeout(() => { try { w.history.replaceState(null, '', `#${w.BE.textoHash()}`); } catch { /* sin sitio */ } }, 0);
  };
  w.addEventListener('popstate', keepView, true);
  w.addEventListener('hashchange', keepView, true);
  // Lo que en el sitio abre su portada vuelve a esta: el logo (en captura, antes que base.js y portada.js) y el menú.
  w.addEventListener('click', (e) => {
    if (e.target.closest?.('#inicio') && phase === 'inside') { e.preventDefault(); e.stopImmediatePropagation(); returnToLanding({ push: true }); }
  }, true);
  if (w.BE.portada) w.BE.portada.abrir = () => { if (phase === 'inside') returnToLanding({ push: true }); };
  // El sitio y la portada comparten el modo reunión.
  new w.MutationObserver(() => root.classList.toggle('be-reunion', live.d.documentElement.classList.contains('be-reunion')))
    .observe(live.d.documentElement, { attributes: true, attributeFilter: ['class'] });
  await settled(gl);
  await wait(150);
  await settled(gl);
  sitePadding = gl.getPadding();
  siteBounds = gl.getMaxBounds();
  gl.setMaxBounds(null);
  hideLayers();
  const L = layout();
  if (returning) gl.jumpTo({ padding: L.padding });   // su vista, con el centro llevado a la parte que se ve
  else gl.jumpTo({ center: L.center, zoom: L.zoom, padding: L.padding });
  // Los datos vivos mandan: si la copia pequeña se quedó vieja, se rehace (mismo cálculo, shared.js).
  const fresh = S.derive(w.BE.D);
  if (JSON.stringify(fresh) !== JSON.stringify(V)) { V = fresh; if (!$('#zones').contains(document.activeElement)) renderZones(); }
  await settled(gl);
  await frames(2, w);
  performance.mark('veil:live');
  document.body.classList.add('is-live');
  base = { center: gl.getCenter().toArray(), zoom: gl.getZoom(), own: returning };
  if (returning) renderOwnView(); else renderImageBase();
  resolveLive(live);
}

// ---------------------------------------------------------------------------------------------------------------
// Vista previa (solo con puntero fino o teclado, en pantalla ancha): el mapa de detrás va a donde irías
// ---------------------------------------------------------------------------------------------------------------
let previewTimer = 0, previewEndTimer = 0;
const canPreview = () => phase === 'landing' && live && wideQuery.matches;
function targetFor(key) {
  const BE = live.BE, D = BE.D;
  const [kind, ...rest] = key.split(':'); const id = rest.join(':');
  const idsOf = (sel) => [...BE.implicados(sel).lugares];
  if (kind === 'era') {
    const e = V.eras.find((x) => x.id === id); if (!e) return null;
    const cands = S.rangePlaces(D, e.from, e.to);
    return { text: `${e.name}, ${e.label}`, era: e.id, points: cands.slice(0, 14).map((c) => [c.lon, c.lat]), cands };
  }
  if (kind === 'question') {
    const q = V.questions[+id]; if (!q) return null;
    const sel = BE.parseSel(q.sel), ids = idsOf(sel);
    if (sel.tipo === 'lugar') return { text: q.shows, points: S.points(D, [sel.id]), cands: S.idPlaces(D, [sel.id], q.t), maxZoom: 6.5 };
    const cands = S.rangePlaces(D, q.t - 1, q.t + 1).filter((c) => ids.includes(c.id));
    return { text: q.shows, points: S.points(D, cands.map((c) => c.id)), cands };
  }
  if (kind === 'tour') {
    const r = (D.recorridos || []).find((x) => x.id === id); if (!r) return null;
    const ids = r.paradas.flatMap((p) => { const s = BE.parseSel(p.sel); return s ? idsOf(s) : []; });
    const vr = V.tours.find((x) => x.id === id);
    return { text: `${r.titulo}${vr?.dates ? `, ${vr.dates}` : ''}`, points: S.points(D, ids), cands: S.idPlaces(D, ids, r.paradas[0]?.t) };
  }
  if (kind === 'example') {
    const r = BE.buscar(id)[0]; if (!r) return null;
    if (r.sel) { const ids = idsOf(r.sel); return { text: `${r.titulo}${r.fechaTexto ? `, ${r.fechaTexto}` : ''}`, points: S.points(D, ids), cands: S.idPlaces(D, ids) }; }
    const t = BE.leerAnio(id);
    if (t == null) return null;
    const cands = S.rangePlaces(D, t - 1, t + 1);
    return { text: S.year(t), points: cands.slice(0, 10).map((c) => [c.lon, c.lat]), cands };
  }
  return null;
}
/** La cámara que enseña esos puntos en la parte visible (el relleno de la portada ya está puesto en el mapa). */
function cameraFor(points, maxZoom = 7.2) {
  if (!points.length) return null;
  if (points.length === 1) return { center: points[0], zoom: Math.min(maxZoom, 6.8) };
  // Sin los extremos cuando hay muchos: un Roma o un Ur sueltos no deben alejar todo el encuadre.
  const lons = points.map((p) => p[0]).sort((a, b) => a - b), lats = points.map((p) => p[1]).sort((a, b) => a - b);
  const quantile = (xs, f) => xs[Math.min(xs.length - 1, Math.max(0, Math.round(f * (xs.length - 1))))];
  const f = points.length > 8 ? 0.1 : 0;
  const box = [[quantile(lons, f), quantile(lats, f)], [quantile(lons, 1 - f), quantile(lats, 1 - f)]];
  const cam = live.gl.cameraForBounds(box, { padding: { top: 90, bottom: 110, left: 40, right: 60 }, maxZoom });
  return cam ? { center: cam.center, zoom: Math.max(3.2, cam.zoom) } : null;
}
function startPreview(el) {
  if (!canPreview()) return;
  const key = el.dataset.preview;
  if (preview?.key === key) return;
  const target = targetFor(key);
  if (!target) return;
  const gl = live.gl, L = layout();
  const cam = cameraFor(target.points, target.maxZoom);
  preview = { key, target };
  stage.classList.add('is-preview');
  setCaption('Vista previa:', target.text);
  $('#places').classList.add('is-hidden');
  highlightEra(target.era || null);
  const done = () => {
    if (preview?.key !== key) return;
    renderPreviewLabels(placeLabels(target.cands, (lon, lat) => { const p = gl.project([lon, lat]); return [p.x, p.y]; }, L.zone, L.maxPlaces));
  };
  clearPreviewLabels();
  if (cam) { gl.stop(); gl.easeTo({ ...cam, duration: motionOk() ? 650 : 0, essential: true }); gl.once('moveend', done); } else done();
}
function renderPreviewLabels(items) {
  clearPreviewLabels();
  const g = $('#places');
  for (const it of items) {
    const n = document.createElement('span');
    n.className = `place place--preview${it.left ? ' place--left' : ''}`; n.setAttribute('aria-hidden', 'true');
    n.style.left = `${Math.round(it.x)}px`; n.style.top = `${Math.round(it.y)}px`;
    n.innerHTML = `<span class="place__dot"></span><span class="place__name">${esc(it.name)}</span>`;
    g.append(n);
  }
  g.hidden = false;
}
function clearPreviewLabels() { document.querySelectorAll('.place--preview').forEach((n) => n.remove()); }
/** Vuelve a la vista de la portada: al instante si lo pide el foco en un lugar (para que su botón esté donde se ve);
    stay = se entra en eso mismo y el mapa se queda donde está. */
function endPreview({ instant = false, stay = false } = {}) {
  clearTimeout(previewTimer);
  if (!preview) return;
  preview = null;
  highlightEra(null);
  clearPreviewLabels();
  stage.classList.remove('is-preview');
  if (stay) return;
  const gl = live.gl;
  const back = () => { $('#places').classList.remove('is-hidden'); $('#places').hidden = !$('#places').querySelector('button.place'); baseCaption(); };
  gl.stop();
  const dur = instant || !motionOk() ? 0 : 500;
  gl.easeTo({ center: base.center, zoom: base.zoom, duration: dur, essential: true });
  if (dur) gl.once('moveend', () => { if (!preview) back(); }); else back();
}
function schedulePreview(el) {
  if (!canPreview()) return;
  clearTimeout(previewTimer); clearTimeout(previewEndTimer);
  previewTimer = setTimeout(() => startPreview(el), 250);
}
function scheduleEnd() {
  clearTimeout(previewTimer); clearTimeout(previewEndTimer);
  previewEndTimer = setTimeout(() => endPreview(), 220);
}
document.addEventListener('pointerover', (e) => {
  if (!finePointer.matches || e.pointerType !== 'mouse') return;
  const el = e.target.closest('[data-preview]');
  if (el) schedulePreview(el);
});
document.addEventListener('pointerout', (e) => {
  const el = e.target.closest('[data-preview]');
  if (el && !el.contains(e.relatedTarget)) scheduleEnd();
});
document.addEventListener('focusin', (e) => {
  const el = e.target.closest?.('[data-preview]');
  if (el && el.matches(':focus-visible')) schedulePreview(el);
  else if (e.target.closest?.('.place')) endPreview({ instant: true });
});
document.addEventListener('focusout', (e) => { if (e.target.closest?.('[data-preview]')) scheduleEnd(); });

// ---------------------------------------------------------------------------------------------------------------
// Entrar: el papel se levanta; el mapa no se mueve
// ---------------------------------------------------------------------------------------------------------------
/** Del mapa a toda la ventana al mapa en su hueco del sitio, sin que un solo píxel del mapa cambie de sitio. */
function toSiteLayout() {
  const { gl, d } = live;
  const ref = [stage.clientWidth / 2, stage.clientHeight / 2];
  const g = gl.unproject(ref);
  d.documentElement.classList.add('veil-switching');
  if (!motionOk()) d.documentElement.classList.add('veil-still');
  d.documentElement.classList.remove('veil-landing');
  gl.resize();
  gl.jumpTo({ padding: sitePadding || { top: 0, bottom: 0, left: 0, right: 0 } });
  const box = d.getElementById('mapa-gl').getBoundingClientRect();
  const p = gl.project(g);
  gl.panBy([p.x + box.left - ref[0], p.y + box.top - ref[1]], { duration: 0 });
  if (siteBounds) gl.setMaxBounds(siteBounds);
  showLayers();
  setTimeout(() => d.documentElement.classList.remove('veil-switching', 'veil-still'), 400);
}
/** Y al revés, al volver a la portada. */
function toLandingLayout() {
  const { gl, d } = live;
  const box = d.getElementById('mapa-gl').getBoundingClientRect();
  const ref = [box.left + box.width / 2, box.top + box.height / 2];
  const g = gl.unproject([box.width / 2, box.height / 2]);
  sitePadding = gl.getPadding();
  siteBounds = gl.getMaxBounds();
  d.documentElement.classList.add('veil-switching');
  if (!motionOk()) d.documentElement.classList.add('veil-still');
  d.documentElement.classList.add('veil-landing');
  gl.setMaxBounds(null);
  gl.resize();
  gl.jumpTo({ padding: layout().padding });
  const p = gl.project(g);
  gl.panBy([p.x - ref[0], p.y - ref[1]], { duration: 0 });
  hideLayers();
  setTimeout(() => d.documentElement.classList.remove('veil-switching', 'veil-still'), 400);
}
const setLandingInert = (on) => { for (const n of [$('#lead'), $('#zones'), $('.map-ui'), $('#map-hit'), $('.proto-tools')]) n.inert = on; };
function focusPanel(again = true) {
  const d = live.d;
  // La ficha se repinta después de elegir (con el mapa ocupado, hasta segundos después): mientras el foco se pierda en
  // el cuerpo del documento, vuelve a la ficha.
  if (again) for (const ms of [400, 900, 1600, 2600]) setTimeout(() => { if (phase === 'inside' && (d.activeElement === d.body || !d.activeElement)) focusPanel(false); }, ms);
  // Si el título se sigue repintando (la ficha de «ahora» cambia con el cursor), el foco va a la ficha entera, que queda.
  const h = again && d.querySelector('#vista-recorrido:not([hidden]) h2, #vista-recorrido:not([hidden]) h3, #panel-cuerpo h1, #panel-cuerpo h2, #panel-cuerpo h3');
  const el = h || d.getElementById('panel-cuerpo');
  if (!el) return;
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  frame.focus();
  live.w.focus();
  el.focus({ preventScroll: true });
}
let suggestions = [], active = -1;
/** Lo que hace cada entrada dentro del sitio, con su API (en el sitio real, la portada es una capa de la misma página). */
function actionFor(key, el) {
  const [kind, ...rest] = key.split(':'); const id = rest.join(':');
  return (BE) => {
    const E = BE.E;
    if (kind === 'enter' || kind === 'resume') return;
    if (kind === 'place') {
      BE.seleccionar({ tipo: 'lugar', id }, { mover: false, encuadrar: true });
      const t = +el?.dataset.t; if (Number.isFinite(t) && el?.dataset.t) { BE.setT(t); BE.asegurarVisible(t, true); }
      return;
    }
    if (kind === 'question') {
      const q = V.questions[+id];
      BE.seleccionar(BE.parseSel(q.sel), { mover: false, encuadrar: true }); BE.setT(q.t); BE.asegurarVisible(E.t, true);
      // «¿Desde dónde escribió Pablo cada carta?» enseña todas las cartas en el mapa (el filtro cartas=todas del sitio).
      for (const [k, v] of Object.entries(q.extra || {})) BE.parametros.find((x) => x.nombre === k)?.leer(v);
      return;
    }
    if (kind === 'era') {
      const e = V.eras.find((x) => x.id === id);
      BE.seleccionar({ tipo: 'periodo', id }, { mover: false, encuadrar: false });
      BE.verTramo(e.from, e.to);
      // Cada época abre donde ocurrió (D1): el encuadre de sus lugares, no el de siempre.
      const target = targetFor(`era:${id}`), cam = target && cameraFor(target.points);
      if (cam) live.gl.easeTo({ ...cam, duration: motionOk() ? 700 : 0 });
      return;
    }
    if (kind === 'tour') {
      const p = savedStep(id), r = V.tours.find((x) => x.id === id);
      if (!(p != null && p > 0 && p < (r?.stops || 0))) { try { localStorage.setItem(`biblical-earth:recorrido:${id}`, '0'); } catch { /* sin almacenamiento */ } }
      BE.seleccionar({ tipo: 'recorrido', id });
      return;
    }
    if (kind === 'timeline') { E.vista = [BE.T_MIN, BE.T_MAX]; BE.sucio.linea = true; BE.programar(); return; }
    // Un año («607 a.e.c.») entra sin la selección de antes y con el mapa en los lugares de ese año.
    const toYear = (r, text) => {
      BE.seleccionar(null, { mover: false, encuadrar: false });
      r.accion();
      const t = BE.leerAnio(text);
      const cam = t != null && cameraFor(S.rangePlaces(BE.D, t - 1, t + 1).slice(0, 10).map((c) => [c.lon, c.lat]));
      if (cam) live.gl.easeTo({ ...cam, duration: motionOk() ? 700 : 0 });
    };
    if (kind === 'result') { const r = suggestions[+id]; if (!r) return; if (r.accion) toYear(r, r.titulo.replace(/^Ir a /, '')); else BE.seleccionar(r.sel); return; }
    if (kind === 'search') { BE.buscarTexto(id); return; }
    if (kind === 'example') { const r = BE.buscar(id)[0]; if (r?.accion) toYear(r, id); else if (r?.sel) BE.seleccionar(r.sel); }
  };
}
/** La dirección del sitio para entrar sin el marco (el sitio en otro origen). */
function outsideHash(key) {
  const [kind, ...rest] = key.split(':'); const id = rest.join(':');
  if (kind === 'resume') return lastView()?.hash.replace(/^#/, '') || DEFAULT_HASH;
  if (kind === 'place') return `t=50.3000&v=40&sel=lugar:${id}&mapa=antiguo`;
  if (kind === 'question') { const q = V.questions[+id]; return `t=${q.t.toFixed(4)}&v=40&sel=${q.sel}&mapa=antiguo${Object.entries(q.extra || {}).map(([k, v]) => `&${k}=${v}`).join('')}`; }
  if (kind === 'era') { const e = V.eras.find((x) => x.id === id); return `t=${e.from.toFixed(4)}&v=${e.to - e.from}&sel=periodo:${id}&mapa=antiguo`; }
  if (kind === 'tour') return `t=50.3000&sel=recorrido:${id}&paso=1&mapa=antiguo`;
  if (kind === 'timeline') return 't=50.3000&v=4125&mapa=antiguo';
  return DEFAULT_HASH;
}
/** El control por el que se entró, para devolverle el foco y su sitio en la pantalla al volver (se busca otra vez por
    su data-go: las zonas se repintan al volver). */
let returnTo = null, pendingReturn = false, silenced = false;
function rememberReturn(key, el) {
  const narrowSearch = !wideQuery.matches;
  const node = el?.isConnected ? el : (/^(result|search):/.test(key) || (key === 'enter' && !el) ? (narrowSearch ? $('.search__go') : input) : null);
  const r = node?.getBoundingClientRect();
  returnTo = { go: node?.dataset?.go || null, node, top: r ? r.top : null };
}
function findReturn() {
  if (!returnTo) return null;
  if (returnTo.node?.isConnected && returnTo.node.offsetParent) return returnTo.node;
  // Repintado: el mismo data-go, entre los que se alcanzan con el teclado (el mapa entero también entra, pero no se tabula).
  if (returnTo.go) return [...document.querySelectorAll('[data-go]')].find((x) => x.dataset.go === returnTo.go && x.offsetParent && x.tabIndex >= 0 && !x.closest('[aria-hidden="true"]')) || null;
  return null;
}
async function enter(key, el, { push = true } = {}) {
  if (phase !== 'landing') return;
  closeSuggestions();
  if (!SAME_ORIGIN) { P.ir(`${SITE}index.html#${outsideHash(key)}`); return; }
  const fromPreview = !!preview && el?.dataset.preview === preview.key;
  if (push) rememberReturn(key, el);
  if (!live) {
    // Antes de tiempo: «Abriendo el mapa…» mientras carga; si no llega a cargar, la portada se queda y lo dice.
    phase = 'waiting';
    setCaption('Abriendo el mapa…', '');
    const ok = await P.esperar(() => live);
    if (ok) await liveReady;
    if (!ok) { phase = 'landing'; baseCaption(); return; }
  }
  // La entrada de «dentro del mapa» va ya, antes de tocar nada: Atrás, pulsado cuando sea, vuelve a la portada.
  if (push) history.pushState({ veil: 'map' }, '', '#mapa');
  phase = 'entering';
  endPreview({ stay: fromPreview, instant: true });
  if (!wideQuery.matches) window.scrollTo(0, 0);
  const typed = $('#q').value.trim();
  toSiteLayout();
  root.classList.add('is-lifting');
  await wait(FADE() + 20);
  root.classList.remove('is-lifting');
  root.classList.add('is-inside');
  setLandingInert(true);   // el marco está dentro de .landing: se inertiza lo de la portada, nunca el marco
  frame.inert = false; frame.removeAttribute('aria-hidden'); frame.removeAttribute('tabindex');
  phase = 'inside';
  document.title = 'biblical-earth · mapa';
  // Su última vista estaba centrada en la parte que se veía junto al texto; dentro, ese centro va al centro del mapa
  // (primero el fundido, luego el encuadre: I1). La vista de la imagen se queda al píxel.
  if (base?.own && (key === 'enter' || key === 'resume')) live.gl.easeTo({ center: base.center, duration: motionOk() ? 500 : 0 });
  // Lo que el sitio apile en su historial al elegir (buscar.js, historia; un recorrido, otra al abrir su parada) se
  // convierte en sustitución mientras se entra: una sola entrada por visita, y un solo Atrás vuelve a la portada.
  silenced = true;
  actionFor(key, el)(live.BE);
  if (key === 'enter' && typed) { const q = live.d.getElementById('q'); if (q) q.value = typed; }   // lo escrito no se pierde
  await frames(2, live.w);
  await wait(key.startsWith('tour') ? 900 : 500);
  silenced = false;
  if (pendingReturn) { pendingReturn = false; if (location.hash !== '#mapa') { returnToLanding(); return; } }
  if (!key.startsWith('search:')) focusPanel();   // buscar deja el foco en la lista de resultados del sitio
  announce('Dentro del mapa. Atrás vuelve a la portada.');
}
async function returnToLanding({ push = false } = {}) {
  if (phase !== 'inside') return;
  phase = 'returning';
  if (push) history.pushState(null, '', location.pathname + location.search);
  frame.inert = true; frame.setAttribute('aria-hidden', 'true'); frame.setAttribute('tabindex', '-1');
  toLandingLayout();
  // Detrás queda la vista de la persona (G2), pero nunca tan cerca que el velo la deje en una mancha sin lugares:
  // desde un lugar a zoom 7,5 se abre hasta 6, con el mismo centro.
  if (live.gl.getZoom() > 6) live.gl.jumpTo({ zoom: 6 });
  base = { center: live.gl.getCenter().toArray(), zoom: live.gl.getZoom(), own: true };
  root.classList.remove('is-inside');
  root.classList.add('is-lifting');
  setLandingInert(false);
  renderResume(); renderZones();
  renderOwnView();
  // El foco vuelve al control que se pulsó, en el mismo sitio de la pantalla (las zonas se repintan y «Seguir donde lo
  // dejaste» puede haber aparecido arriba); sin él, al título.
  const back = findReturn();
  if (back && returnTo.top != null) window.scrollBy(0, back.getBoundingClientRect().top - returnTo.top);
  else window.scrollTo(0, 0);
  const focusBack = () => (back || $('#title')).focus({ preventScroll: true });
  await frames(1);
  root.classList.remove('is-lifting');
  document.title = 'biblical-earth · La Biblia en el mapa y en el tiempo';
  focusBack();
  await wait(FADE());
  phase = 'landing';
  // Un clic en el logo del sitio deja el foco en el marco al soltar: el foco vuelve a la portada.
  if (!$('#landing').contains(document.activeElement) || document.activeElement === frame) focusBack();
}
// Un foco tardío del sitio (su ficha se enfoca unos instantes después de entrar) puede llegar cuando ya se ha vuelto:
// en la portada el marco no se enfoca nunca, así que el foco vuelve al control por el que se entró.
window.addEventListener('blur', () => setTimeout(() => {
  if ((phase === 'landing' || phase === 'returning') && document.activeElement === frame) (findReturn() || $('#title')).focus({ preventScroll: true });
}, 0));
window.addEventListener('popstate', () => {
  if (phase === 'entering' || phase === 'waiting') { pendingReturn = location.hash !== '#mapa'; return; }
  if (phase === 'inside' && location.hash !== '#mapa') returnToLanding();
  // Adelante, o Atrás hasta una visita anterior (tras volver con el logo): el mapa otra vez, sin cambiar nada de él.
  else if (phase === 'landing' && location.hash === '#mapa' && live) enter('enter', null, { push: false });
});

// ---------------------------------------------------------------------------------------------------------------
// Búsqueda: sugerencias de verdad (la búsqueda del sitio, BE.buscar) y elegir una ya es entrar
// ---------------------------------------------------------------------------------------------------------------
const input = $('#q'), listbox = $('#suggestions');
const GROUP = { persona: 'Persona', lugar: 'Lugar', evento: 'Suceso', periodo: 'Época', pasaje: 'Capítulo', libro: 'Libro', carta: 'Carta', recorrido: 'Recorrido', hallazgo: 'Hallazgo', viaje: 'Viaje' };
function renderSuggestions() {
  const txt = input.value.trim();
  if (!txt) { closeSuggestions(); $('#search-status').textContent = ''; return; }
  if (!live) { closeSuggestions(); $('#search-status').textContent = SAME_ORIGIN ? 'Cargando los datos del atlas… Pulsa Buscar y se abrirá el mapa.' : ''; return; }
  const all = live.BE.buscar(txt);
  suggestions = all.slice(0, 5);
  if (!suggestions.length) { closeSuggestions(); $('#search-status').textContent = 'Nada con ese nombre. Prueba con otra forma de escribirlo.'; return; }
  $('#search-status').textContent = '';
  active = 0;
  listbox.innerHTML = suggestions.map((r, i) => `<li class="search__opt" role="option" id="sug-${i}" aria-selected="${i === active}" data-i="${i}"><span class="search__opt-t">${esc(r.titulo)}</span><span class="search__opt-k">${esc([GROUP[r.sel?.tipo] || (r.accion ? 'Ir a la fecha' : ''), r.fechaTexto].filter(Boolean).join(' · '))}</span></li>`).join('')
    + (all.length > suggestions.length ? `<li class="search__more" role="presentation">Y ${all.length - suggestions.length} más: pulsa Buscar para verlas en el mapa</li>` : '');
  listbox.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  input.setAttribute('aria-activedescendant', `sug-${active}`);
}
function setActive(i) {
  active = (i + suggestions.length) % suggestions.length;
  listbox.querySelectorAll('.search__opt').forEach((o, k) => o.setAttribute('aria-selected', String(k === active)));
  input.setAttribute('aria-activedescendant', `sug-${active}`);
}
function closeSuggestions() { listbox.hidden = true; listbox.innerHTML = ''; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
input.addEventListener('input', renderSuggestions);
input.addEventListener('keydown', (e) => {
  if (listbox.hidden) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
});
listbox.addEventListener('pointerdown', (e) => { const o = e.target.closest('[data-i]'); if (o) { e.preventDefault(); enter(`result:${o.dataset.i}`); } });
$('#search').addEventListener('submit', (e) => {
  e.preventDefault();
  const txt = input.value.trim();
  if (!txt) { enter('enter'); return; }
  if (!listbox.hidden && suggestions[active]) { enter(`result:${active}`); return; }
  enter(`search:${txt}`);
});
liveReady.then(() => { if (document.activeElement === input && input.value.trim()) renderSuggestions(); });

// ---------------------------------------------------------------------------------------------------------------
// Pulsaciones, teclado y modo reunión
// ---------------------------------------------------------------------------------------------------------------
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-go]');
  if (!b || phase !== 'landing') return;
  const go = b.dataset.go;
  if (go === 'forget') {
    try { localStorage.removeItem(KEY_LAST); } catch { /* sin almacenamiento */ }
    renderResume(); announce('Olvidada. Se guardaba solo en este navegador.'); $('#title').focus();
    return;
  }
  enter(go, b);
});
const hit = $('#map-hit');
hit.addEventListener('pointerenter', () => stage.classList.add('is-pointing'));
hit.addEventListener('pointerleave', () => stage.classList.remove('is-pointing'));
document.addEventListener('keydown', (e) => {
  if (phase !== 'landing') return;
  if (e.key === 'Escape') {
    const sw = $('.proto-switch');
    if (sw.open) { sw.open = false; sw.querySelector('summary').focus(); return; }
    if (!listbox.hidden) { e.preventDefault(); closeSuggestions(); return; }
    e.preventDefault();
    enter('enter');
    return;
  }
  if (e.key === '/' && !e.target.matches('input, textarea')) { e.preventDefault(); input.focus(); }
});
P.letraGrande($('#letra'), () => live?.w || null);
const moon = $('#meeting');
const renderMoon = () => moon.setAttribute('aria-pressed', String(meeting()));
moon.addEventListener('click', () => {
  const on = !meeting();
  if (live) { const b = live.d.getElementById('reunion-boton'); if (b && live.d.documentElement.classList.contains('be-reunion') !== on) b.click(); }
  root.classList.toggle('be-reunion', on);
  try { localStorage.setItem(KEY_MEETING, on ? '1' : '0'); } catch { /* sin almacenamiento */ }
});
new MutationObserver(renderMoon).observe(root, { attributes: true, attributeFilter: ['class'] });
renderMoon();

// La ayuda de la caja, corta cuando no cabe entera (como BE.ajustarAyuda en el sitio).
const fitPlaceholder = P.ajustarAyuda(input, ['Busca una persona, un lugar, un capítulo o un año', 'Persona, lugar, capítulo o año', 'Persona, lugar o año', 'Buscar']);

// Al cambiar de tamaño: la cámara, la marca y los lugares se recalculan; la imagen ya se coloca sola con CSS.
let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    renderDates(); fitPlaceholder();
    if (phase !== 'landing') return;
    if (!live) { renderImageBase(); return; }
    endPreview({ instant: true });
    live.gl.resize();
    const L = layout();
    if (base?.own) { live.gl.jumpTo({ padding: L.padding }); renderOwnView(); }
    else { live.gl.jumpTo({ center: L.center, zoom: L.zoom, padding: L.padding }); renderImageBase(); }
    base = { ...base, center: live.gl.getCenter().toArray(), zoom: live.gl.getZoom() };
  }, 150);
});

// ---------------------------------------------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------------------------------------------
renderResume();
renderZones();
renderImageBase();
document.fonts.ready.then(() => { if (!live) renderImageBase(); renderDates(); });
performance.mark('veil:landing');
// El sitio del marco empieza después de pintar la portada: comparte el hilo de esta página (mismo origen) y leer sus
// 5,6 MB de datos retrasaba la primera pantalla hasta 2,6 s. Así la imagen y el texto salen primero (K1).
// El marco se crea de nuevo: uno escrito en el HTML recupera, al volver con Atrás desde otra página, la dirección que
// tenía, y cargaba dos veces (la recuperada y la nueva); la portada se quedaba con la ventana de la primera.
const startFrame = () => {
  const f = frame.cloneNode(false);
  f.name = `veil-${Date.now()}`;
  f.src = frameSrc();
  P.vigilar(f);
  frame.replaceWith(f);
  frame = f;
  watchFrame();
};
if (!SAME_ORIGIN) frame.remove();
else if (document.readyState === 'complete') requestAnimationFrame(() => setTimeout(startFrame, 0));
else addEventListener('load', () => requestAnimationFrame(() => setTimeout(startFrame, 0)), { once: true });
const img = $('#capture');
const imageReady = () => performance.mark('veil:image');
if (img.complete && img.naturalWidth) imageReady(); else img.addEventListener('load', imageReady, { once: true });
window.__veil = { get phase() { return phase; }, get live() { return !!live; }, get base() { return base; }, get preview() { return preview?.key || null; }, SITE, SAME_ORIGIN };
})();
