/* biblical-atlas · tipo «pasaje»: un capítulo de la Biblia («pasaje:hch-16»): ficha, búsqueda («Hch 16»), lo que cuenta
   en el mapa y la línea, «aparece en» (todo lo que cita el capítulo) y los vídeos de jw.org que lo citan.
   Dueño durante el reparto: app-estudio. */
'use strict';
(() => {
const BE = window.BE;
const { esc, EXTERNO, fechaCorta, norm, citas, libro, implicados, ES_FILE } = BE;

/** «hch-16» (abreviatura, como en v0) o «hechos-16» (slug, como las fuentes implícitas) → { libro, cap }. */
function pasajeDeId(id) {
  const m = String(id).match(/^([a-z0-9-]+?)-(\d+)$/);
  if (!m) return null;
  const clave = m[1];
  const lib = (BE.LIBROS || []).find((l) => norm(l.abr) === clave) || (BE.LIBROS || []).find((l) => l.slug === clave);
  const cap = +m[2];
  if (!lib || cap < 1 || (lib.capitulos && cap > lib.capitulos)) return null;
  return { libro: lib, cap };
}
const idPasaje = (lib, cap) => `${norm(lib.abr)}-${cap}`;
function citaCubre(cs, lib, cap) { return cs.some((c) => c.libro.num === lib.num && cap >= c.cap && cap <= c.capFin); }

// ---------------------------------------------------------------------------
// Citas dentro de un texto libre («Perspicacia … (Hch 18:12-17); 2Ti 1:5») y fuentes que son capítulos
// ---------------------------------------------------------------------------
let RE_CITA = null, RE_LIBROS = null;
function reCita() {
  if (RE_CITA && RE_LIBROS === BE.LIBROS) return RE_CITA;
  RE_LIBROS = BE.LIBROS;
  const formas = new Set();
  for (const l of BE.LIBROS || []) for (const f of [l.abr, l.nombre, ...(l.formas || [])]) formas.add(String(f).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const alt = [...formas].sort((a, b) => b.length - a.length).join('|');
  RE_CITA = new RegExp(`(?:^|[^\\p{L}\\d])((?:[123]\\s?)?(?:${alt}))\\.?\\s+(\\d{1,3})(?::(\\d{1,3}))?(?:\\s*[-–]\\s*(\\d{1,3})(?::(\\d{1,3}))?)?((?:\\s*;\\s*\\d{1,3}:\\d{1,3}(?:\\s*[-–]\\s*\\d{1,3})?)*)`, 'giu');
  return RE_CITA;
}
/** Todas las citas de un texto, con su libro. Sigue «Hch 17:14; 18:5» como dos capítulos del mismo libro. */
function citasEnTexto(s) {
  const out = [];
  if (!s) return out;
  const re = reCita();
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(String(s)))) {
    const lib = libro(m[1]);
    if (!lib) continue;
    const cap = +m[2];
    let capFin = cap;
    if (m[5]) capFin = +m[4]; else if (!m[3] && m[4]) capFin = +m[4];
    out.push({ libro: lib, cap, capFin, texto: m[0].replace(/^[^\p{L}\d]/u, '').trim() });
    for (const x of (m[6] || '').matchAll(/(\d{1,3}):\d/g)) out.push({ libro: lib, cap: +x[1], capFin: +x[1] });
  }
  return out;
}
/** Una fuente que es un capítulo (hch-16, mateo-26 o su URL de wol.jw.org o de jw.org) → { libro, cap }.
    En jw.org el libro va por su nombre sin tildes ni mayúsculas y con guiones («G%C3%A9nesis», «el-cantar-de-los-cantares»). */
function capituloDeFuente(id) {
  const p = pasajeDeId(id);
  if (p) return p;
  const url = String(BE.D.fuentes?.[id]?.url || '');
  const m = url.match(/\/wol\/b\/r4\/lp-s\/nwt(?:sty)?\/(\d+)\/(\d+)/);
  const j = !m && url.match(/^https:\/\/www\.jw\.org\/es\/biblioteca\/biblia\/(?:biblia-estudio|nwt)\/libros\/([^/?#]+)\/(\d+)\/?(?:[?#]|$)/);
  if (!m && !j) return null;
  let slug = null;
  if (j) { try { slug = norm(decodeURIComponent(j[1])); } catch { return null; } }
  const lib = (BE.LIBROS || []).find((l) => (m ? l.num === +m[1] : l.slug === slug || norm(l.nombre).replace(/\s+/g, '-') === slug));
  const cap = +(m || j)[2];
  return lib ? { libro: lib, cap } : null;
}

// Índice «aparece en» (B-12): capítulo → selecciones que lo citan en su referencia, sus pasajes, su razón o sus fuentes.
let INDICE = null;
function indiceReferencias() {
  if (INDICE) return INDICE;
  INDICE = new Map();
  const poner = (lib, cap, capFin, sel) => {
    for (let c = cap; c <= Math.min(capFin, cap + 40); c++) {
      const k = `${lib.num}-${c}`;
      if (!INDICE.has(k)) INDICE.set(k, new Set());
      INDICE.get(k).add(sel);
    }
  };
  const anotar = (sel, textos, fuentes) => {
    for (const t of textos) for (const c of citasEnTexto(t)) poner(c.libro, c.cap, c.capFin, sel);
    for (const f of fuentes || []) { const p = capituloDeFuente(f); if (p) poner(p.libro, p.cap, p.cap, sel); }
  };
  const D = BE.D;
  for (const p of Object.values(BE.PERS)) anotar(`persona:${p.id}`, [p.razon, p.desambiguacion, ...(p.relaciones || []).map((r) => r.razon)], [...(p.fuentes || []), ...(p.relaciones || []).flatMap((r) => r.fuentes || [])]);
  for (const l of Object.values(BE.L)) anotar(`lugar:${l.id}`, [l.razon], l.fuentes);
  for (const e of D.eventos || []) anotar(`evento:${e.id}`, [...(e.pasajes || []), e.razon], e.fuentes);
  for (const c of D.cartas || []) anotar(`carta:${c.id}`, [c.referencia, c.razon], c.fuentes);
  for (const v of D.viajes || []) anotar(`viaje:${v.id}`, [v.referencia], v.fuentes);
  for (const p of D.periodos || []) anotar(`periodo:${p.id}`, [p.razon], p.fuentes);
  for (const h of D.hallazgos || []) anotar(`hallazgo:${h.id}`, [h.razon, h.resumen], h.fuentes);
  for (const r of D.recorridos || []) anotar(`recorrido:${r.id}`, (r.paradas || []).flatMap((p) => p.pasajes || []), r.fuentes);
  return INDICE;
}
const GRUPO_SEL = { persona: 'Personas', lugar: 'Lugares', evento: 'Sucesos', carta: 'Cartas', viaje: 'Viajes', periodo: 'Periodos', hallazgo: 'Hallazgos', recorrido: 'Recorridos' };
function apareceEnHtml(lib, cap, yaListados) {
  const sels = [...(indiceReferencias().get(`${lib.num}-${cap}`) || [])].filter((s) => !yaListados.has(s) && BE.parseSel(s));
  if (!sels.length) return '';
  const grupos = {};
  for (const s of sels) { const t = s.slice(0, s.indexOf(':')); (grupos[t] = grupos[t] || []).push(s); }
  return `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Aparece en <b class="cuenta">${sels.length}</b></h3>
    <p class="be-muted">Fichas que citan ${esc(lib.nombre)} ${cap} en su referencia, en su razón o entre sus fuentes.</p>
    ${Object.entries(grupos).map(([t, xs]) => `<h4 class="subgrupo">${esc(GRUPO_SEL[t] || t)}</h4><div class="be-list">${xs.map((s) => BE.botonSel(s, BE.nombreSel(BE.parseSel(s)))).join('')}</div>`).join('')}
  </div></section>`;
}

// ---------------------------------------------------------------------------
// Vídeos de jw.org que citan el capítulo (site/videos-pasajes.json). Si el fichero falta, la sección no sale.
// ---------------------------------------------------------------------------
let VIDEOS_PASAJES;   // undefined: sin pedir; null: no hay; objeto: cargado
function cargarVideosPasajes() {
  if (VIDEOS_PASAJES !== undefined || ES_FILE) return;
  VIDEOS_PASAJES = null;
  // Junto a data.json: con ?datos=_local/<carril>/data.json, los datos de prueba llevan su propio fichero.
  const d = new URLSearchParams(location.search).get('datos');
  const ruta = d && /^_local\/[\w./-]+\.json$/.test(d) && !d.split('/').includes('..') ? d.replace(/[^/]+$/, 'videos-pasajes.json') : 'videos-pasajes.json';
  fetch(ruta, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
    VIDEOS_PASAJES = j && typeof j === 'object' ? j : null;
    if (VIDEOS_PASAJES && BE.E.sel?.tipo === 'pasaje') BE.pintarPanel(true);
    BE.lectura?.repintar?.();
  }).catch(() => { VIDEOS_PASAJES = null; });
}
/** Acepta { slug: { cap: [...] } }, { "slug-cap": [...] } o { slug: [{ capitulo, ... }] }. Cada vídeo: { titulo, url, publicado? }. */
function videosDe(lib, cap) {
  const V = VIDEOS_PASAJES;
  if (!V) return [];
  const porLibro = V[lib.slug] ?? V[norm(lib.abr)];
  let vs = V[`${lib.slug}-${cap}`] ?? V[`${norm(lib.abr)}-${cap}`];
  if (!vs && porLibro && !Array.isArray(porLibro)) vs = porLibro[cap] ?? porLibro[String(cap)];
  if (!vs && Array.isArray(porLibro)) vs = porLibro.filter((v) => v.capitulo == null || +v.capitulo === cap || (v.capitulos || []).includes(cap));
  return (Array.isArray(vs) ? vs : []).filter((v) => v && v.url && v.titulo);
}
function videosPasajeHtml(lib, cap) {
  const vs = videosDe(lib, cap);
  if (!vs.length) return '';
  const max = 6;
  return `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Vídeos de jw.org que lo citan <b class="cuenta">${vs.length}</b></h3>
    <ul class="videos">${vs.slice(0, max).map((v) => `<li><a href="${esc(v.url)}" ${EXTERNO}>${esc(v.titulo)}</a>${v.publicado ? `<span class="be-row__meta">${esc(BE.fmtDia(v.publicado))}</span>` : ''}</li>`).join('')}</ul>
    ${vs.length > max ? `<p class="be-muted">Y ${vs.length - max} más en jw.org.</p>` : ''}</div></section>`;
}

function fichaPasaje(id) {
  cargarVideosPasajes();
  const { libro: lib, cap } = pasajeDeId(id);
  const r = implicados({ tipo: 'pasaje', id });
  const paradas = BE.P.filter((s) => r.claves.has(`parada:${s.key}`));
  const cartas = BE.D.cartas.filter((c) => r.claves.has(`carta:${c.id}`));
  const eventos = (BE.D.eventos || []).filter((e) => r.claves.has(`evento:${e.id}`));
  const ya = new Set([...cartas.map((c) => `carta:${c.id}`), ...eventos.map((e) => `evento:${e.id}`)]);
  return `${BE.migas('Pasajes', `${lib.nombre} ${cap}`)}${BE.cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="be-card__eyebrow">Pasaje · <button type="button" class="enlace-texto" data-sel="libro:${esc(lib.slug)}">${esc(lib.nombre)}</button></div>
      <h2 class="be-card__title">${esc(lib.nombre)} ${cap}</h2>
      <p class="be-card__body">El texto se lee en jw.org, con las notas de estudio al lado. En el mapa y en la línea de tiempo queda resaltado lo que cuenta este capítulo.</p>
    </div><div class="be-card__foot"><button type="button" class="be-btn be-btn--sm" data-leer="${esc(idPasaje(lib, cap))}">Modo lectura</button><span class="be-spacer"></span><a class="be-wol" href="${BE.urlCapitulo(lib, cap)}" ${EXTERNO}>Leer ${esc(lib.nombre)} ${cap} y sus notas de estudio</a></div></section>
    ${paradas.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Paradas de Pablo <b class="cuenta">${paradas.length}</b></h3>
      <div class="be-list">${paradas.map((s) => BE.botonSel(`parada:${s.key}`, s.lugar.nombre, `${esc(s.p.referencia)} · ${esc(s.viaje.nombre)}`)).join('')}</div></div></section>` : ''}
    ${cartas.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Carta</h3><div class="be-list">${cartas.map((c) => BE.botonSel(`carta:${c.id}`, c.libro, esc(fechaCorta(c.fecha)))).join('')}</div></div></section>` : ''}
    ${eventos.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Sucesos <b class="cuenta">${eventos.length}</b></h3><div class="be-list">${eventos.map((e) => BE.botonSel(`evento:${e.id}`, e.titulo, esc([(e.pasajes || []).join('; '), e.fecha?.texto || ''].filter(Boolean).join(' · ')))).join('')}</div></div></section>` : ''}
    ${!paradas.length && !cartas.length && !eventos.length ? '<p class="be-muted">Todavía no hay datos de este capítulo en el mapa ni en la línea de tiempo.</p>' : ''}
    ${apareceEnHtml(lib, cap, ya)}
    ${videosPasajeHtml(lib, cap)}`;
}

/** Al elegir un capítulo, el cursor va al primer pasaje del relato con fecha (Génesis 12 empieza en 1943 a.e.c., aunque
    cite de pasada el nacimiento de Abrahán). Sin índice de lectura, a lo primero que implica, como cualquier tipo. */
function momentoPasaje(id) {
  const p = pasajeDeId(id);
  if (!p) return null;
  const deSel = (s) => { const d = s && BE.tipos.get(s.tipo); return d?.momentoImplicado?.(s.id) ?? null; };
  for (const x of BE.lectura?.pasajes?.(p.libro, p.cap) || []) {
    const t = deSel(BE.parseSel(x.sel));
    if (t != null) return t;
  }
  const ts = [...implicados({ tipo: 'pasaje', id }).claves].map((k) => { const i = k.indexOf(':'); return deSel({ tipo: k.slice(0, i), id: k.slice(i + 1) }); }).filter((t) => t != null);
  return ts.length ? Math.min(...ts) : null;
}
BE.tipo('pasaje', {
  nodo: 'texto',
  existe: (id) => !!pasajeDeId(id),
  nombre: (id) => { const p = pasajeDeId(id); return `${p.libro.nombre} ${p.cap}`; },
  implicados(id, r) {
    const { libro: lib, cap } = pasajeDeId(id);
    BE.P.filter((s) => citaCubre(citas(s.p.referencia), lib, cap)).forEach((s) => BE.anadirParada(r, s));
    BE.D.viajes.filter((v) => citaCubre(citas(v.referencia), lib, cap)).forEach((v) => r.claves.add(`viaje:${v.id}`));
    BE.D.cartas.filter((c) => citas(c.referencia)[0]?.libro.num === lib.num).forEach((c) => BE.anadirCarta(r, c));
    (BE.D.eventos || []).filter((e) => citaCubre(citas((e.pasajes || []).join('; ')), lib, cap)).forEach((e) => { r.claves.add(`evento:${e.id}`); (e.lugares || []).forEach((x) => r.lugares.add(x)); });
  },
  momento: momentoPasaje,
  ficha: fichaPasaje,
  // «Hch 16», «Hechos 16:12», «1Co 5», «1 Corintios 13»
  buscar(q) {
    const m = q.trim().match(/^([123]?\s?[A-Za-zÁÉÍÓÚáéíóúÑñ]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]+){0,3}?)\.?\s*(\d+)(?:\s*[:.,]\s*(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
    if (!m) return [];
    const lib = libro(m[1]);
    if (!lib) return [];
    const cap = +m[2];
    if (lib.capitulos && cap > lib.capitulos) return [];
    const id = idPasaje(lib, cap);
    const n = implicados({ tipo: 'pasaje', id }).claves.size;
    return [{ grupo: 'Pasajes', sel: { tipo: 'pasaje', id }, titulo: `${lib.nombre} ${cap}${m[3] ? `:${m[3]}${m[4] ? `-${m[4]}` : ''}` : ''}`, meta: n ? `${n} ${n === 1 ? 'dato' : 'datos'} en el mapa` : 'sin datos en el mapa todavía', puntos: 1000 }];
  },
});

Object.assign(BE, { pasajeDeId, idPasaje, citaCubre, citasEnTexto, capituloDeFuente, indiceReferencias, videosDe, videosPasajeHtml, cargarVideosPasajes });
})();
