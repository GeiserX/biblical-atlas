/* biblical-atlas · tipo «libro»: un libro de la Biblia («libro:hechos») con sus datos de la Tabla de los libros
   (escritor, lugar, fecha, tiempo que abarca), sus capítulos y lo que cuentan. Pone la lista de libros de data.json
   en el buscador y en las citas, y la URL de capítulo de la Biblia de estudio de jw.org. Dueño durante el reparto: app-estudio. */
'use strict';
(() => {
const BE = window.BE;
const { esc, norm, EXTERNO, fechaCorta, tramo, citas } = BE;

// Una sola forma de URL de capítulo: la Biblia de estudio de jw.org, que lleva las notas de estudio al lado del texto.
// jw.org escribe el libro con guiones: con tildes, tal cual («G%C3%A9nesis», «1-Cr%C3%B3nicas»); sin tildes, en
// minúsculas («1-reyes», «el-cantar-de-los-cantares»). Es la misma regla que url_capitulo de scripts/bible_coverage.py.
const libroJw = (lib) => {
  const s = String(lib.nombre).trim().replace(/\s+/g, '-');
  return /^[\x00-\x7f]*$/.test(s) ? s.toLowerCase() : encodeURIComponent(s);
};
BE.urlCapitulo = (lib, cap) => `https://www.jw.org/es/biblioteca/biblia/biblia-estudio/libros/${libroJw(lib)}/${cap}/`;

/** La URL exacta de una cita de BE.citas: el capítulo con el versículo o el tramo resaltado (#v<libro><ccc><vvv>, el
    ancla que jw.org resalta y lleva a la vista). Una cita que pasa a otro capítulo abre el primero, resaltado hasta su
    último versículo: jw.org no resalta un tramo que cruza capítulos. Sin versículo, o con el capítulo entero, va sin ancla. */
const ancla = (lib, cap, v) => `v${lib.num}${String(cap).padStart(3, '0')}${String(v).padStart(3, '0')}`;
BE.urlCita = (c) => {
  const url = BE.urlCapitulo(c.libro, c.cap);
  if (!c.verso) return url;
  const ultimo = c.libro.versiculos?.[c.cap - 1] || null;
  let fin = c.capFin > c.cap ? ultimo : c.versoFin;
  if (!fin || fin < c.verso) fin = c.verso;
  if (c.verso === 1 && ultimo && fin >= ultimo) return url;
  return `${url}#${ancla(c.libro, c.cap, c.verso)}${fin > c.verso ? `-${ancla(c.libro, c.cap, fin)}` : ''}`;
};

/** Los 66 libros de data.json sustituyen a la lista fija de base.js. El slug sin guiones también vale al buscar. */
function prepararLibros() {
  const ls = BE.D.libros;
  if (!Array.isArray(ls) || !ls.length) return;
  BE.ponerLibros(ls.map((l) => ({ ...l, formas: [...new Set([...(l.formas || []), norm(l.slug).replace(/-/g, '')])] })));
}
BE.inicios.push(prepararLibros);

const libroPorSlug = (id) => (BE.LIBROS || []).find((l) => l.slug === id) || null;
const tieneHechos = (l) => ['escritor', 'lugar', 'fecha', 'abarca'].some((k) => l[k] != null);
/** ¿Alguna cita de este texto cae en el libro? Se compara por número, no por objeto. */
const citaDelLibro = (ref, lib) => citas(ref).some((c) => c.libro.num === lib.num);

function implicadosLibro(id, r) {
  const lib = libroPorSlug(id);
  if (!lib) return;
  BE.P.filter((s) => citaDelLibro(s.p.referencia, lib)).forEach((s) => BE.anadirParada(r, s));
  BE.D.viajes.filter((v) => citaDelLibro(v.referencia, lib)).forEach((v) => r.claves.add(`viaje:${v.id}`));
  BE.D.cartas.filter((c) => citas(c.referencia)[0]?.libro.num === lib.num).forEach((c) => BE.anadirCarta(r, c));
  (BE.D.eventos || []).filter((e) => citaDelLibro((e.pasajes || []).join('; '), lib)).forEach((e) => { r.claves.add(`evento:${e.id}`); (e.lugares || []).forEach((x) => r.lugares.add(x)); });
}
/** Capítulos del libro que tienen algo en el mapa o en la línea: { cap: número de datos }. */
function capitulosConDatos(lib) {
  const n = {};
  const contar = (ref) => { for (const c of citas(ref)) if (c.libro.num === lib.num) for (let k = c.cap; k <= c.capFin; k++) n[k] = (n[k] || 0) + 1; };
  BE.P.forEach((s) => contar(s.p.referencia));
  (BE.D.eventos || []).forEach((e) => contar((e.pasajes || []).join('; ')));
  return n;
}

/** Bloque «escritor, lugar, fecha, abarca» (F-10). El periodo que abarca lleva el cursor a su inicio y encuadra la línea. */
function hechosLibroHtml(lib) {
  if (!tieneHechos(lib)) return '<p class="be-muted">Escritor, lugar y fecha de este libro: pendientes de la Tabla de los libros.</p>';
  const filas = [];
  if (lib.escritor) filas.push(['Escritor', esc(lib.escritor)]);
  if (lib.lugar) filas.push(['Lugar de escritura', esc(lib.lugar)]);
  if (lib.fecha) filas.push(['Terminado', `<span class="be-chrono be-chrono--tnm">${esc(lib.fecha.texto || fechaCorta(lib.fecha))}</span>`]);
  if (lib.abarca) {
    const tr = tramo(lib.abarca);
    filas.push(['Abarca', tr ? `<button type="button" class="be-chip" data-abarca="${tr[0]},${tr[1]}" title="Marcar este periodo en la línea de tiempo">${esc(lib.abarca.texto || fechaCorta(lib.abarca))}</button>` : esc(lib.abarca.texto || '')]);
  }
  return `<dl class="be-kv">${filas.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
}

function fichaLibro(id) {
  const lib = libroPorSlug(id);
  const conDatos = capitulosConDatos(lib);
  const leidos = BE.leidos ? BE.leidos() : new Set();
  const n = lib.capitulos || Math.max(0, ...Object.keys(conDatos).map(Number));
  const cartas = BE.D.cartas.filter((c) => citas(c.referencia)[0]?.libro.num === lib.num);
  const recorridos = (BE.D.recorridos || []).filter((rc) => (rc.paradas || []).some((p) => (p.pasajes || []).some((x) => citaDelLibro(x, lib))));
  return `${BE.migas('Libros', lib.nombre)}${BE.cerrarHtml()}
    <section class="be-card"><div class="be-card__pad">
      <div class="cabecera-carta"><span class="be-node be-node--texto be-node--lg" aria-hidden="true">${esc(lib.abr)}</span>
      <div><div class="be-card__eyebrow">Libro de la Biblia</div><h2 class="be-card__title">${esc(lib.nombre)}</h2></div></div>
      ${hechosLibroHtml(lib)}
    </div><div class="be-card__foot">${tieneHechos(lib) ? BE.estadoHtml(lib.estado) : ''}<span class="be-spacer"></span>
      <button type="button" class="be-btn be-btn--sm" data-leer="${esc(BE.idPasaje(lib, 1))}">Modo lectura</button></div></section>
    ${n ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Capítulos <b class="cuenta">${n}</b></h3>
      <div class="capitulos" role="list">${Array.from({ length: n }, (_, i) => i + 1).map((c) => {
        const d = conDatos[c] || 0, leido = leidos.has(`${lib.num}-${c}`);
        return `<button type="button" role="listitem" class="cap${d ? ' cap--datos' : ''}${leido ? ' cap--leido' : ''}" data-leer="${esc(BE.idPasaje(lib, c))}" aria-label="${esc(lib.nombre)} ${c}${d ? `, ${d} ${d === 1 ? 'dato' : 'datos'} en el mapa` : ''}${leido ? ', leído' : ''}">${c}</button>`;
      }).join('')}</div>
      <p class="be-muted leyenda-caps"><span class="cap cap--datos" aria-hidden="true"></span> con datos en el mapa <span class="cap cap--leido" aria-hidden="true"></span> leído en este navegador</p></div></section>` : ''}
    ${cartas.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Carta</h3><div class="be-list">${cartas.map((c) => BE.botonSel(`carta:${c.id}`, c.libro, esc(fechaCorta(c.fecha)))).join('')}</div></div></section>` : ''}
    ${recorridos.length ? `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Recorridos que lo usan</h3><div class="be-list">${recorridos.map((rc) => BE.botonSel(`recorrido:${rc.id}`, rc.titulo, `${rc.paradas.length} paradas`)).join('')}</div></div></section>` : ''}
    ${tieneHechos(lib) ? BE.porQueHtml(lib) : ''}`;
}

/** La fecha de un libro en las listas y al elegirlo, una sola: lo que abarca y, si no se sabe, cuándo se terminó. */
const fechaLibro = (lib) => (lib && tramo(lib.abarca) ? lib.abarca : lib?.fecha) || null;
/** Momento de un libro: el principio de su fecha (fechaLibro); si no tiene, lo primero que cuenta. Romanos, que no
    abarca un tramo, va a cuando se escribió (c. 56 e.c.) y no al primer nombre que cita (Adán). */
function momentoLibro(id) {
  const lib = libroPorSlug(id);
  const tr = tramo(fechaLibro(lib));
  if (tr) return tr[0] + 0.01;
  const r = { claves: new Set(), lugares: new Set() };
  implicadosLibro(id, r);
  const ts = [];
  for (const k of r.claves) { const i = k.indexOf(':'); const d = BE.tipo(k.slice(0, i)); const x = d?.momentoImplicado?.(k.slice(i + 1)); if (x != null) ts.push(x); }
  return ts.length ? Math.min(...ts) : null;
}

BE.tipo('libro', {
  nodo: 'texto',
  existe: (id) => !!libroPorSlug(id),
  nombre: (id) => libroPorSlug(id).nombre,
  implicados: implicadosLibro,
  momento: momentoLibro,
  ficha: fichaLibro,
  buscar(q, nq, puntuar) {
    const out = [];
    for (const l of BE.LIBROS || []) {
      if (!l.slug) continue;
      const pp = puntuar([l.nombre, l.abr]);
      // La fecha va aparte (fechaSel, con fechaLibro): la misma a la que lleva elegirlo.
      if (pp >= 60) out.push({ grupo: 'Libros', sel: { tipo: 'libro', id: l.slug }, titulo: l.nombre, meta: [l.capitulos ? `${l.capitulos} capítulos` : '', l.escritor ? `escribió ${l.escritor}` : ''].filter(Boolean).join(' · '), puntos: pp });
    }
    return out;
  },
});

// «Abarca» marca su periodo en la línea de tiempo: el cursor va al inicio y la vista se ajusta al tramo.
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-abarca]');
  if (!b) return;
  const [a, z] = b.dataset.abarca.split(',').map(Number);
  BE.verTramo(a, z);
});
/** Lleva la línea de tiempo a un tramo [a, z) con un poco de margen y pone el cursor al principio. */
function verTramo(a, z) {
  const m = Math.max(0.5, (z - a) * 0.08);
  const v0 = Math.max(BE.T_MIN, a - m), v1 = Math.min(BE.T_MAX, z + m);
  if (v1 > v0) { BE.E.vista = [v0, v1]; BE.sucio.linea = true; }
  BE.setT(Math.max(BE.T_MIN, Math.min(BE.T_MAX, a + 0.01)));
  BE.programar();
}

Object.assign(BE, { libroPorSlug, fechaLibro, capitulosConDatos, hechosLibroHtml, verTramo, citaDelLibro });
})();
