/* biblical-atlas · modo lectura (pantalla 12, #vista-lectura): cualquier capítulo de cualquier libro con datos, al lado
   del mapa (A-02). Índice de pasajes con título nuestro, el mapa que sigue la lectura con las paradas numeradas,
   capítulos leídos guardados solo en este navegador (A-09), enlaces a jw.org con las notas de estudio (B-18) y los
   vídeos de jw.org que citan el capítulo. El texto bíblico no está aquí: se lee en jw.org.
   Dueño durante el reparto: app-estudio. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, $, EXTERNO, fechaCorta } = BE;

const CLAVE_LEIDOS = 'biblical-atlas:leidos';
function leidos() { try { return new Set(JSON.parse(localStorage.getItem(CLAVE_LEIDOS) || '[]')); } catch { return new Set(); } }
function marcarLeido(lib, cap, si = true) {
  const s = leidos();
  const k = `${lib.num}-${cap}`;
  if (si) s.add(k); else s.delete(k);
  try { localStorage.setItem(CLAVE_LEIDOS, JSON.stringify([...s])); } catch { /* sin almacenamiento: no se guarda */ }
}

const L = { id: null, pas: -1, sigue: true, play: 0, marcas: [] };
const abierta = () => !!L.id;

/** Versículo en que empieza una cita dentro del capítulo (0 si viene del capítulo anterior). */
function versoInicial(ref, lib, cap) {
  for (const c of BE.citas(ref)) {
    if (c.libro.num !== lib.num || cap < c.cap || cap > c.capFin) continue;
    if (c.cap < cap) return 0;
    const m = c.texto.match(/\d+:(\d+)/);
    return m ? +m[1] : 0;
  }
  return 999;
}
const citaEnCap = (ref, lib, cap) => BE.citas(ref).filter((c) => c.libro.num === lib.num && cap >= c.cap && cap <= c.capFin).map((c) => c.texto).join('; ');

/** Pasajes del capítulo: los sucesos y las paradas que lo citan, en el orden del relato. */
function pasajes(lib, cap) {
  const out = [];
  for (const e of BE.D.eventos || []) {
    const ref = (e.pasajes || []).join('; ');
    const aqui = citaEnCap(ref, lib, cap);
    if (!aqui) continue;
    out.push({ sel: `evento:${e.id}`, ref: aqui, verso: versoInicial(ref, lib, cap), titulo: e.titulo, resumen: e.resumen, lugares: (e.lugares || []).filter((x) => BE.L[x]), personas: (e.personas || []).filter((x) => BE.PERS[x]), fecha: e.fecha, narrativa: e.fecha?.tipo !== 'anclada', orden: e.orden_relato?.orden ?? 0 });
  }
  for (const s of BE.P) {
    const aqui = citaEnCap(s.p.referencia, lib, cap);
    if (!aqui) continue;
    if (versoInicial(s.p.referencia, lib, cap) === 0 && BE.citas(s.p.referencia).some((c) => c.cap < cap && c.capFin >= cap + 1)) continue;   // un tramo que cruza el capítulo entero no es un pasaje de este
    out.push({ sel: `parada:${s.key}`, ref: aqui, verso: versoInicial(s.p.referencia, lib, cap), titulo: `${BE.nombreDueno(s.viaje, true)} en ${s.lugar.nombre}`, resumen: s.p.resumen || s.p.nota || '', lugares: [s.lugar.id], personas: [BE.duenoViaje(s.viaje), ...BE.acompanantes(s.viaje, s.p.orden)].filter((x) => x && BE.PERS[x]), fecha: s.p.fecha, narrativa: s.narrativa, orden: s.g + 0.5 });
  }
  return out.sort((a, b) => a.verso - b.verso || a.orden - b.orden);
}

function marcasMapa(ps) {
  for (const m of L.marcas) m.remove();
  L.marcas = [];
  const map = BE.mapa.gl, ML = window.maplibregl;
  if (!abierta() || !map || !ML?.Marker) return;
  const por = new Map();
  ps.forEach((p, i) => { const l = p.lugares.find((x) => BE.L[x]?.lat != null); if (l) { if (!por.has(l)) por.set(l, []); por.get(l).push(i); } });
  for (const [l, is] of por) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `marca-num${is.includes(L.pas) ? ' marca-num--activa' : ''}${is.every((i) => i < L.pas) ? ' marca-num--vista' : ''}`;
    el.textContent = is.map((i) => i + 1).join('·');
    el.setAttribute('aria-label', `Pasaje ${is.map((i) => i + 1).join(' y ')}: ${BE.L[l].nombre}`);
    el.addEventListener('click', (ev) => { ev.stopPropagation(); abrirPasaje(is[0]); });
    L.marcas.push(new ML.Marker({ element: el, anchor: 'bottom', offset: [0, -14] }).setLngLat([BE.L[l].lon, BE.L[l].lat]).addTo(map));
  }
}

function pintar() {
  const v = $('#vista-lectura');
  if (!abierta()) { if (!v.hidden) { v.hidden = true; v.innerHTML = ''; } marcasMapa([]); return; }
  const p = BE.pasajeDeId(L.id);
  if (!p) { cerrar(); return; }
  const { libro: lib, cap } = p;
  const ps = pasajes(lib, cap);
  if (L.pas >= ps.length) L.pas = ps.length - 1;
  const lds = leidos();
  const conDatos = BE.capitulosConDatos(lib);
  const leido = lds.has(`${lib.num}-${cap}`);
  const actual = ps[L.pas];
  const sigCap = cap < (lib.capitulos || cap) ? cap + 1 : null;
  const sigLugares = sigCap ? [...new Set(pasajes(lib, sigCap).flatMap((x) => x.lugares))].map((x) => BE.L[x].nombre) : [];
  const anclada = ps.find((x) => !x.narrativa);
  v.hidden = false;
  v.innerHTML = `<header class="vista-cab lectura-cab">
      <div><div class="be-card__eyebrow">Modo lectura</div>
      <label class="lectura-libro"><span class="sr-only">Libro</span><select data-lectura-libro>${(BE.LIBROS || []).filter((l) => l.slug).map((l) => `<option value="${esc(l.slug)}"${l.num === lib.num ? ' selected' : ''}>${esc(l.nombre)}</option>`).join('')}</select></label>
      <h2 class="lectura-titulo">${esc(lib.nombre)} ${cap}</h2></div>
      ${BE.historia?.pareja() || ''}<button type="button" class="be-btn be-btn--sm be-btn--ghost vista-cerrar" data-lectura-cerrar aria-label="Cerrar el modo lectura">Cerrar <span aria-hidden="true">×</span></button>
    </header>
    <div class="lectura-cuerpo">
    <nav class="capitulos capitulos--lectura" aria-label="Capítulos de ${esc(lib.nombre)}">${Array.from({ length: lib.capitulos || cap }, (_, i) => i + 1).map((c) => `<button type="button" class="cap${conDatos[c] ? ' cap--datos' : ''}${lds.has(`${lib.num}-${c}`) ? ' cap--leido' : ''}${c === cap ? ' cap--actual' : ''}" data-lectura-cap="${c}"${c === cap ? ' aria-current="page"' : ''} aria-label="Capítulo ${c}${lds.has(`${lib.num}-${c}`) ? ', leído' : ''}">${c}</button>`).join('')}</nav>
    <a class="be-btn be-btn--primary lectura-wol" href="${BE.urlCapitulo(lib, cap)}" ${EXTERNO} data-lectura-wol>Leer ${esc(lib.nombre)} ${cap} en jw.org <span aria-hidden="true">↗</span></a>
    <p class="be-muted lectura-nota">El texto y las notas de estudio se leen en jw.org. Aquí van el mapa, la fecha y el orden.</p>
    <div class="lectura-controles">
      <label class="interruptor"><input type="checkbox" data-lectura-sigue ${L.sigue ? 'checked' : ''}> El mapa sigue la lectura</label>
      <label class="interruptor"><input type="checkbox" data-lectura-leido ${leido ? 'checked' : ''}> Leído</label>
      ${BE.notes?.pencilForChapter(lib, cap) || ''}
    </div>
    ${ps.length ? `<div class="lectura-fecha be-note${anclada ? '' : ' be-note--uncertain'}">${anclada && ps.some((x) => x.narrativa) ? 'Orden cierto; fechas aproximadas salvo donde la fuente las da.' : anclada ? 'Cada pasaje con su fecha según la fuente.' : 'Orden cierto; sin fecha exacta: tiempo narrativo.'}</div>
    <div class="lectura-acciones"><button type="button" class="be-btn be-btn--sm" data-lectura-play>${L.play ? 'Pausar' : 'Seguir en el mapa ▶'}</button>
      <button type="button" class="be-btn be-btn--sm be-btn--ghost" data-lectura-paso="-1" ${L.pas <= 0 ? 'disabled' : ''}>‹ Pasaje anterior</button>
      <button type="button" class="be-btn be-btn--sm be-btn--ghost" data-lectura-paso="1" ${L.pas >= ps.length - 1 ? 'disabled' : ''}>Pasaje siguiente ›</button></div>
    <ol class="indice-pasajes">${ps.map((x, i) => `<li class="pasaje-item${i === L.pas ? ' pasaje-item--abierto' : ''}${i < L.pas ? ' pasaje-item--visto' : ''}">
      <button type="button" class="pasaje-boton" data-lectura-pasaje="${i}" aria-expanded="${i === L.pas}"><span class="pasaje-num">${i + 1}</span><span class="pasaje-texto"><span class="pasaje-ref">${esc(x.ref)}</span><span class="pasaje-tit">${esc(x.titulo)}</span></span>${x.narrativa ? '<span class="be-chrono be-chrono--approx">tiempo narrativo</span>' : `<span class="be-chrono be-chrono--tnm">${esc(x.fecha?.texto || fechaCorta(x.fecha))}</span>`}</button>
      ${i === L.pas ? `<div class="pasaje-detalle">${x.resumen ? `<p>${esc(x.resumen)}</p>` : ''}
        ${x.lugares.length ? `<div class="fila-chips"><span class="be-muted">Lugares</span>${x.lugares.map((l) => `<button type="button" class="be-chip" data-sel="lugar:${esc(l)}">${esc(BE.L[l].nombre)}</button>`).join('')}</div>` : '<p class="be-muted">Lugar no indicado: el mapa se queda en el último lugar cierto.</p>'}
        ${x.personas.length ? `<div class="fila-chips"><span class="be-muted">Personas</span>${x.personas.map((pp) => `<button type="button" class="be-chip" data-sel="persona:${esc(pp)}">${esc(BE.PERS[pp].nombre)}</button>`).join('')}</div>` : ''}
        <div class="fila-chips">${BE.chipsCitas(x.ref)}</div></div>` : ''}</li>`).join('')}</ol>`
    : `<div class="be-card"><div class="be-card__pad"><p><b>Este capítulo no tiene lugares en el mapa todavía.</b></p>${BE.hechosLibroHtml(lib)}</div></div>`}
    ${sigCap ? `<button type="button" class="siguiente-cap" data-lectura-cap="${sigCap}" data-lectura-terminar><span class="be-caps">Siguiente capítulo</span><span class="siguiente-cap__tit">${esc(lib.nombre)} ${sigCap}</span>${sigLugares.length ? `<span class="siguiente-cap__lug">${esc(sigLugares.slice(0, 6).join(' · '))}</span>` : ''}</button>` : ''}
    <div class="lectura-extra">${BE.videosPasajeHtml(lib, cap)}</div>
    </div>`;
  marcasMapa(ps);
  L.ps = ps;
}

function abrirPasaje(i, { encuadrar } = {}) {
  const ps = L.ps || [];
  const x = ps[i];
  if (!x) return;
  L.pas = i;
  const sel = BE.parseSel(x.sel);
  pintar();
  if (sel) BE.seleccionar(sel, { mover: true, encuadrar: encuadrar ?? L.sigue });
  $('#vista-lectura').querySelector('.pasaje-item--abierto')?.scrollIntoView({ block: 'nearest' });
  BE.guardarHash();
}
function abrir(id, { pas = -1, desdeHash = false } = {}) {
  if (!BE.pasajeDeId(id)) return;
  BE.estudio.abrirSolo('lectura');
  const p = BE.pasajeDeId(id);
  L.id = BE.idPasaje(p.libro, p.cap);
  L.pas = pas;
  parar();
  BE.cargarVideosPasajes?.();
  pintar();
  BE.estudio.relleno?.();
  if (!desdeHash) {
    if (L.pas < 0) BE.seleccionar({ tipo: 'pasaje', id: L.id }, { mover: true, encuadrar: L.sigue });
    BE.guardarHash();
  } else {
    // Desde un enlace sin fecha ni selección: el cursor y el mapa van al capítulo, como al abrirlo a mano.
    BE.estudio.trasEnlace?.(() => {
      if (!abierta() || BE.E.sel) return;
      if (L.pas >= 0 && L.ps?.[L.pas]) abrirPasaje(L.pas);
      else BE.seleccionar({ tipo: 'pasaje', id: L.id }, { mover: true, encuadrar: L.sigue });
    });
  }
}
function cerrar(silencioso) {
  if (!abierta()) return;
  L.id = null; L.pas = -1; parar();
  pintar();
  BE.estudio.relleno?.();
  if (!silencioso) BE.guardarHash();
}
function parar() { clearTimeout(L.play); L.play = 0; }
function reproducir() {
  if (L.play) { parar(); pintar(); return; }
  const paso = () => {
    const sig = L.pas + 1;
    if (sig >= (L.ps || []).length) { parar(); pintar(); return; }
    abrirPasaje(sig);
    L.play = setTimeout(paso, BE.reducido?.() ? 6000 : 4500);
    pintar();
  };
  L.play = setTimeout(paso, 10);
  pintar();
}
function mover(d) {
  if (!abierta()) return false;
  const i = Math.max(0, Math.min((L.ps || []).length - 1, L.pas + d));
  if (i === L.pas) return false;
  abrirPasaje(i);
  return true;
}

function iniciar() {
  const v = $('#vista-lectura');
  v.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-lectura-cerrar]')) { cerrar(); return; }
    const cap = t.closest('[data-lectura-cap]');
    if (cap) {
      if (cap.hasAttribute('data-lectura-terminar')) { const p = BE.pasajeDeId(L.id); marcarLeido(p.libro, p.cap); }
      const p = BE.pasajeDeId(L.id);
      abrir(BE.idPasaje(p.libro, +cap.dataset.lecturaCap));
      return;
    }
    const pa = t.closest('[data-lectura-pasaje]');
    if (pa) { parar(); const i = +pa.dataset.lecturaPasaje; if (i === L.pas) { L.pas = -1; pintar(); BE.guardarHash(); } else abrirPasaje(i); return; }
    const d = t.closest('[data-lectura-paso]');
    if (d) { parar(); mover(+d.dataset.lecturaPaso); return; }
    if (t.closest('[data-lectura-play]')) { reproducir(); return; }
    if (t.closest('[data-lectura-wol]')) { const p = BE.pasajeDeId(L.id); marcarLeido(p.libro, p.cap); setTimeout(pintar, 50); }
  });
  v.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-lectura-sigue]')) { L.sigue = t.checked; return; }
    if (t.matches('[data-lectura-leido]')) { const p = BE.pasajeDeId(L.id); marcarLeido(p.libro, p.cap, t.checked); pintar(); if (BE.E.sel?.tipo === 'libro') BE.pintarPanel(true); return; }
    if (t.matches('[data-lectura-libro]')) { const l = BE.libroPorSlug(t.value); if (l) abrir(BE.idPasaje(l, 1)); }
  });
  // «Modo lectura» desde cualquier ficha (pasaje, libro) o desde un número de capítulo.
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-leer]');
    if (b && !b.closest('#vista-lectura')) { e.preventDefault(); abrir(b.dataset.leer); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && abierta() && v.contains(document.activeElement)) { e.stopImmediatePropagation(); cerrar(); }
  }, true);
  // El mapa puede cargar después que la lectura: se ponen las marcas cuando esté.
  const map = BE.mapa.gl;
  if (map) map.once('load', () => { if (abierta()) marcasMapa(L.ps || []); });
}
BE.inicios.push(iniciar);
BE.estudio = BE.estudio || { vistas: {} };
BE.estudio.vistas.lectura = { abierta, cerrar };

BE.parametros.push(
  { nombre: 'leer', historia: true, escribir: () => L.id,
    leer(v) { if (v && BE.pasajeDeId(v)) { if (v !== L.id) abrir(v, { desdeHash: true }); } else if (abierta()) cerrar(true); } },
  { nombre: 'pas', escribir: () => (abierta() && L.pas >= 0 ? String(L.pas + 1) : null),
    leer(v) { if (abierta()) { const n = (+v || 0) - 1; if (n !== L.pas) { L.pas = n; pintar(); } } } },
);

BE.lectura = { abrir, cerrar, mover, pasajes, repintar: () => { if (abierta()) pintar(); }, get abierta() { return abierta(); } };
Object.assign(BE, { leidos, marcarLeido });
})();
