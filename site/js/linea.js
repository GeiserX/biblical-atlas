/* biblical-earth · línea de tiempo (SVG propio): carriles, tramos de viaje, cartas, sucesos, periodos, eje, cursor y
   gestos (rueda, arrastre, pinza, zoom, botones de reproducción). Dueño durante el reparto: app-tiempo. */
'use strict';
(() => {
const BE = window.BE;
const { E, sucio, programar, esc, $, clamp, tramo, fechaCorta, fmtAnio, fmtCursor, citas, span, setT, reproducir, saltar, MESES } = BE;

const EJE = 26, CARRIL = 30;
const CARRILES = [
  { id: 'pablo', nombre: 'Pablo', icono: 'persona' },
  { id: 'cartas', nombre: 'Cartas', icono: 'carta' },
  { id: 'cartas2', nombre: 'Más cartas', icono: 'carta' },
  { id: 'mientras', nombre: 'Sucesos', icono: 'reloj' },
  { id: 'emperador', nombre: 'Emperadores', icono: 'corona' },
  { id: 'gobernador', nombre: 'Gobernadores', icono: 'corona' },
];
const ICONOS = {
  persona: '<svg class="be-i be-i--sm" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  carta: '<svg class="be-i be-i--sm" viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 11h6M9 15h6" stroke="currentColor" stroke-width="1.6"/></svg>',
  reloj: '<svg class="be-i be-i--sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  corona: '<svg class="be-i be-i--sm" viewBox="0 0 24 24"><path d="m4 17-1-9 5 4 4-6 4 6 5-4-1 9Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
};
let anchoLinea = 800;
const xDe = (t) => ((t - E.vista[0]) / span()) * anchoLinea;
const tDe = (x) => E.vista[0] + (x / anchoLinea) * span();
const yCarril = (id) => EJE + CARRILES.findIndex((c) => c.id === id) * CARRIL;
const anchoTexto = (s, px = 10.5) => s.length * px * 0.6 + 4;
function nivelFuentes(ids) { return Math.min(...(ids || []).map((id) => BE.D.fuentes[id]?.nivel || 2)); }
function pintarCarriles() {
  $('#carriles').innerHTML = `<div class="carriles-eje"></div>${CARRILES.map((c) => {
    let extra = '';
    if (c.id === 'emperador' || c.id === 'gobernador') {
      const ps = (BE.D.periodos || []).filter((p) => p.tipo === c.id);
      if (ps.length && ps.every((p) => nivelFuentes(p.fuentes) > 1)) extra = '<span class="be-tier be-tier--2 nivel-carril" data-n="2">N2</span>';
    }
    return `<div class="be-lane-label">${ICONOS[c.icono]}<span>${esc(c.nombre)}</span>${extra}</div>`;
  }).join('')}`;
}
function dim(clave) {
  const r = E.resaltado;
  if (!r) return '';
  return r.claves.has(clave) ? ' resaltado' : ' atenuado';
}
function pintarLineaFija() {
  const svg = $('#linea-svg');
  const pista = $('#pista');
  anchoLinea = pista.clientWidth || 800;
  const alto = pista.clientHeight || 200;
  svg.setAttribute('width', anchoLinea); svg.setAttribute('height', alto);
  svg.setAttribute('viewBox', `0 0 ${anchoLinea} ${alto}`);
  const s = span(), pxAnio = anchoLinea / s;
  const partes = [];
  partes.push(`<defs>
    <linearGradient id="g-difuso" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".05" stop-color="#fff" stop-opacity="1"/><stop offset=".95" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="m-difuso" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#g-difuso)"/></mask>
    <pattern id="p-rayas" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(135)"><rect width="3" height="8" fill="rgba(122,92,142,.13)"/></pattern>
  </defs>`);
  // Filas alternas
  CARRILES.forEach((c, i) => { if (i % 2) partes.push(`<rect class="fila-par" x="0" y="${EJE + i * CARRIL}" width="${anchoLinea}" height="${CARRIL}"/>`); });
  partes.push(`<g class="eje">${marcasEje(pxAnio)}</g>`);
  // Pablo: un tramo por viaje, con sus paradas como marcas.
  const yP = yCarril('pablo');
  const V = BE.viajeActual(BE.dondeEsta(E.t));
  for (const v of BE.D.viajes) {
    const ps = BE.P.filter((x) => x.viaje === v);
    if (!ps.length) continue;
    const a = ps[0].a, b = ps[ps.length - 1].b;
    if (b < E.vista[0] || a > E.vista[1]) continue;
    const x0 = xDe(a), x1 = Math.max(xDe(b), x0 + 4);
    const algunaRes = E.resaltado && ps.some((x) => E.resaltado.claves.has(`parada:${x.key}`));
    const cls = E.resaltado ? (E.resaltado.claves.has(`viaje:${v.id}`) || algunaRes ? ' resaltado' : ' atenuado') : '';
    const w = x1 - x0;
    const etiqueta = recortar(`${v.nombre} · ${fechaCorta(v.fecha)}`, w - 14);
    partes.push(`<g class="item viaje${v === V ? ' activo' : ''}${cls}" data-sel="viaje:${esc(v.id)}" tabindex="0" role="button" aria-label="${esc(v.nombre)}, ${esc(fechaCorta(v.fecha))}">
      <rect x="${x0}" y="${yP + 5}" width="${w}" height="20" rx="5" class="barra-viaje" style="fill:${BE.colorViaje(v.id)}"${v.fecha?.aprox ? ' mask="url(#m-difuso)"' : ''}/>
      ${etiqueta ? `<text x="${x0 + Math.min(12, w * 0.06) + 4}" y="${yP + 19}" class="texto-barra">${esc(etiqueta)}</text>` : ''}</g>`);
    if (pxAnio > 45) {
      for (const st of ps) {
        const x = xDe(st.a);
        const c2 = dim(`parada:${st.key}`);
        partes.push(`<g class="item parada${c2}" data-sel="parada:${esc(st.key)}"><title>${esc(st.lugar.nombre)} · ${esc(st.p.referencia)}</title>
          <rect x="${x - 1}" y="${yP + 7}" width="${Math.max(2, xDe(st.b) - x + 2)}" height="16" rx="1" class="marca-parada${st.narrativa ? ' narrativa' : ''}"/></g>`);
      }
    }
  }
  // Cartas: las que comparten fechas van juntas. Tramo si la fecha abarca varios años; si no, rombo en el momento
  // en que el modelo pone a Pablo donde la escribió. Los rombos a menos de 24 px se funden en uno. Dos filas sin solapes.
  const grupos = new Map(), rombos = [];
  for (const c of BE.cartasOrdenadas()) {
    const tr = tramo(c.fecha);
    if (!tr) continue;
    if (tr[1] - tr[0] > 1) {
      const k = `${tr[0]}|${tr[1]}`;
      if (!grupos.has(k)) grupos.set(k, { tr, cartas: [] });
      grupos.get(k).cartas.push(c);
    } else rombos.push({ tr, x: xDe(BE.momentoCarta(c)), c });
  }
  rombos.sort((a, b) => a.x - b.x);
  const gruposRombo = [];
  for (const r of rombos) {
    const g = gruposRombo.at(-1);
    if (g && r.x - g.x < 24) g.cartas.push(r.c);
    else gruposRombo.push({ tr: r.tr, x: r.x, cartas: [r.c] });
  }
  const itemsCartas = [...grupos.values(), ...gruposRombo].map(({ tr, cartas, x }) => {
    const esTramo = x == null;
    const cortas = cartas.map(BE.abrCarta).join(' · ');
    const nombre = cartas.length > 1 ? cortas : cartas[0].libro;
    const etiqueta = `${nombre}${esTramo ? ` · ${fechaCorta(cartas[0].fecha).replace(' e.c.', '')}` : ''}`;
    const x0 = esTramo ? xDe(tr[0]) : x - 7;
    const x1 = esTramo ? Math.max(xDe(tr[1]), x0 + 6) : x0 + 14;
    const lx = esTramo ? x0 + 8 : x0 + 19;
    return { tr, cartas, esTramo, etiqueta, corto: cortas, x0, x1, lx, lw: anchoTexto(etiqueta) };
  }).filter((it) => it.x1 > -300 && it.x0 < anchoLinea + 50);
  empaquetar(itemsCartas, ['cartas', 'cartas2']);
  for (const it of itemsCartas) {
    const y = yCarril(it.fila);
    const sel = E.sel?.tipo === 'carta' && it.cartas.some((c) => c.id === E.sel.id);
    const principal = sel ? it.cartas.find((c) => c.id === E.sel.id) : it.cartas[0];
    const res = E.resaltado ? (it.cartas.some((c) => E.resaltado.claves.has(`carta:${c.id}`)) ? ' resaltado' : ' atenuado') : '';
    const cls = `item carta${sel ? ' seleccionada' : ''}${res}`;
    const nombres = it.cartas.map((c) => c.libro).join(', ');
    const aria = `aria-label="${esc(nombres)}, ${esc(fechaCorta(principal.fecha))}"`;
    const forma = it.esTramo
      ? `<rect x="${it.x0}" y="${y + 6}" width="${it.x1 - it.x0}" height="18" rx="5" class="tramo-carta"/>`
      : `<rect x="${it.x0 + 1}" y="${y + 9}" width="12" height="12" rx="2" transform="rotate(45 ${it.x0 + 7} ${y + 15})" class="rombo"/>`;
    partes.push(`<g class="${cls}" data-sel="carta:${esc(principal.id)}" tabindex="0" role="button" ${aria}><title>${esc(nombres)} · ${esc(fechaCorta(principal.fecha))}</title>${forma}${textoItem(it, y, it.esTramo ? 'texto-carta' : 'texto-punto')}</g>`);
  }
  // Sucesos: un tramo por suceso; la etiqueta se corta antes del siguiente.
  const itemsEv = (BE.D.eventos || []).map((e) => {
    const tr = tramo(e.fecha);
    if (!tr) return null;
    const x0 = xDe(tr[0]), x1 = Math.max(xDe(tr[1]), x0 + 6);
    // Código corto: el libro si el suceso es una carta («1Te»); si no, lugar y año («Jerusalén 49»).
    const lib = citas((e.pasajes || []).join('; '))[0]?.libro;
    const lugar = BE.L[(e.lugares || [])[0]]?.nombre;
    const corto = lib && lib.num !== 44 ? lib.abr : `${lugar || e.titulo.split(/[\s:,]/)[0]} ${fmtAnio(tr[0]).replace(' e.c.', '')}`;
    return { e, tr, x0, x1, lx: x0 + 7, etiqueta: e.titulo, corto, lw: anchoTexto(e.titulo) };
  }).filter((it) => it && it.x1 > -300 && it.x0 < anchoLinea + 50).sort((a, b) => a.x0 - b.x0);
  empaquetar(itemsEv, ['mientras']);
  for (const it of itemsEv) {
    const y = yCarril('mientras');
    partes.push(`<g class="item evento${dim(`evento:${it.e.id}`)}" data-sel="evento:${esc(it.e.id)}" tabindex="0" role="button" aria-label="${esc(it.e.titulo)}, ${esc(it.e.fecha.texto || '')}"><title>${esc(it.e.titulo)} · ${esc(it.e.fecha.texto || '')}</title>
      <rect x="${it.x0}" y="${y + 6}" width="${it.x1 - it.x0}" height="18" rx="5" class="tramo-evento"/>${textoItem(it, y, 'texto-evento')}</g>`);
  }
  // Periodos: emperadores y gobernadores.
  for (const p of BE.D.periodos || []) {
    const carril = p.tipo === 'gobernador' ? 'gobernador' : (p.tipo === 'emperador' ? 'emperador' : null);
    const tr = tramo(p.fecha);
    if (!carril || !tr) continue;
    const y = yCarril(carril), x0 = xDe(tr[0]), x1 = xDe(tr[1]);
    const etiqueta = recortar(`${p.nombre} · ${String(p.fecha.texto || fechaCorta(p.fecha)).replace(' e.c.', '')}`, x1 - x0 - 14);
    partes.push(`<g class="item periodo periodo--${carril}${dim(`periodo:${p.id}`)}" data-sel="periodo:${esc(p.id)}" tabindex="0" role="button" aria-label="${esc(p.nombre)}, ${esc(p.fecha.texto || '')}">
      <rect x="${x0}" y="${y + 5}" width="${Math.max(x1 - x0 - 1, 3)}" height="20" rx="4" class="barra-periodo"/>${etiqueta ? `<text x="${Math.max(x0, 0) + 8}" y="${y + 19}" class="texto-barra">${esc(etiqueta)}</text>` : ''}</g>`);
  }
  partes.push('<g id="linea-cursor"></g>');
  svg.innerHTML = partes.join('');
  sucio.cursor = true;
  $('#velocidad').textContent = BE.textoVelocidad();
  document.querySelectorAll('[data-zoom]').forEach((b) => {
    const z = +b.dataset.zoom;
    const on = Math.abs(Math.log(s / z)) < Math.log(2.2);
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
  });
  pintarLineaFija.claveV = V?.id;
}
/** Reparte elementos en filas: primero la fila libre; si no hay, la menos ocupada. Luego calcula cuánto sitio tiene cada etiqueta. */
function empaquetar(items, filas) {
  items.sort((a, b) => a.x0 - b.x0);
  const finTodo = filas.map(() => -1e9), finForma = filas.map(() => -1e9);
  for (const it of items) {
    let i = finTodo.findIndex((f) => f <= it.x0 - 3);                 // cabe con su etiqueta
    if (i < 0) i = finForma.findIndex((f) => f <= it.x0 - 3);          // cabe la forma; se recorta la etiqueta anterior
    if (i < 0) i = finForma.indexOf(Math.min(...finForma));
    it.fila = filas[i];
    finForma[i] = it.x1;
    finTodo[i] = Math.max(it.x1, it.lx + it.lw);
  }
  rotular(items);
}
/** Coloca la etiqueta de cada elemento sin pisar a sus vecinos de fila. Por orden: entera a la derecha, entera a la
    izquierda, recortada si queda sitio para algo legible, el código corto («1Te», «Jerusalén 49») a un lado o centrado
    dentro de su propio tramo y, si no cabe nada, recortada en el hueco mayor. */
function rotular(items) {
  const libre = new Map();          // fila → x donde acaba lo ya dibujado
  items.forEach((it, i) => {
    const sig = items.slice(i + 1).find((o) => o.fila === it.fila);
    const desde = libre.get(it.fila) ?? -Infinity;
    const der = (sig ? sig.x0 - 6 : Infinity) - it.lx;
    const finIzq = it.x0 - 5;
    const izq = finIzq - Math.max(desde + 6, 0);
    const ancho = (t) => anchoTexto(t);
    const opciones = [
      [it.etiqueta, der, 'der'], [it.etiqueta, izq, 'izq'],
      ...(Math.max(der, izq) >= 60 ? [[it.etiqueta, Math.max(der, izq), der >= izq ? 'der' : 'izq', true]] : []),
      ...(it.corto ? [[it.corto, der, 'der'], [it.corto, izq, 'izq'], [it.corto, it.x1 - it.x0, 'dentro']] : []),
      [it.etiqueta, Math.max(der, izq), der >= izq ? 'der' : 'izq', true],
    ];
    it.texto = ''; it.lado = 'der';
    for (const [t, px, lado, cortar] of opciones) {
      const texto = cortar ? recortar(t, px) : (ancho(t) <= px ? t : '');
      if (texto) { it.texto = texto; it.lado = lado; break; }
    }
    const finTexto = it.texto && it.lado === 'der' ? it.lx + ancho(it.texto) : -Infinity;
    libre.set(it.fila, Math.max(it.x1, finTexto));
  });
}
function textoItem(it, y, clase) {
  if (!it.texto) return '';
  if (it.lado === 'izq') return `<text x="${it.x0 - 5}" y="${y + 19}" text-anchor="end" class="${clase}">${esc(it.texto)}</text>`;
  if (it.lado === 'dentro') return `<text x="${(it.x0 + it.x1) / 2}" y="${y + 19}" text-anchor="middle" class="${clase}">${esc(it.texto)}</text>`;
  return `<text x="${it.lx}" y="${y + 19}" class="${clase}">${esc(it.texto)}</text>`;
}
function recortar(texto, px) {
  if (!(px >= 24)) return px === Infinity ? texto : '';
  const max = Math.floor(px / 6.3);
  return texto.length <= max ? texto : `${texto.slice(0, Math.max(1, max - 1))}…`;
}
function marcasEje(pxAnio) {
  const pasos = [10, 5, 2, 1, 0.5, 0.25, 1 / 12];
  let mayor = pasos.find((p, i) => p * pxAnio < 70 ? false : (i === pasos.length - 1 || pasos[i + 1] * pxAnio < 70)) || 1 / 12;
  if (mayor * pxAnio < 70) mayor = pasos.find((p) => p * pxAnio >= 70) || 10;
  const menor = mayor >= 5 ? 1 : mayor >= 1 ? (pxAnio > 140 ? 1 / 12 : 0.25) : 1 / 12;
  const out = [];
  const inicio = Math.floor(E.vista[0] / menor) * menor;
  for (let t = inicio; t <= E.vista[1] + menor; t += menor) {
    const tt = Math.round(t * 12) / 12;
    const x = xDe(tt);
    const esMayor = Math.abs(tt / mayor - Math.round(tt / mayor)) < 1e-6;
    if (esMayor) {
      const y = Math.floor(tt + 1e-9), mes = Math.round((tt - y) * 12);
      const texto = mayor >= 1 ? fmtAnio(y) : (mes === 0 ? `${MESES[0]} ${fmtAnio(y)}` : MESES[mes]);
      out.push(`<line x1="${x}" x2="${x}" y1="0" y2="${EJE}" class="tick-mayor"/><line x1="${x}" x2="${x}" y1="${EJE}" y2="400" class="rejilla"/><text x="${x + 5}" y="16" class="tick-texto">${esc(texto)}</text>`);
    } else {
      out.push(`<line x1="${x}" x2="${x}" y1="${EJE - 6}" y2="${EJE}" class="tick-menor"/>`);
    }
  }
  out.push(`<line x1="0" x2="${anchoLinea}" y1="${EJE}" y2="${EJE}" class="linea-eje"/>`);
  return out.join('');
}
function pintarCursor() {
  const g = $('#linea-cursor');
  if (!g) return;
  const x = xDe(E.t);
  const w = BE.dondeEsta(E.t);
  const alto = $('#pista').clientHeight || 200;
  const fino = span() < 4;
  const lugar = w ? (w.parada ? w.en.lugar.nombre : `hacia ${w.sig.lugar.nombre}`) : '';
  const bandera = `${w?.estimada || !fino ? 'c. ' : ''}${fmtCursor(E.t, fino)}${lugar ? ` · ${lugar}` : ''}`;
  const anchoB = anchoTexto(bandera, 10.5) + 14;
  const bx = clamp(x - anchoB / 2, 0, anchoLinea - anchoB);
  let banda = '';
  if (w?.estimada && w.banda) {
    const b0 = xDe(w.banda[0]), b1 = xDe(w.banda[1]);
    banda = `<rect x="${b0}" y="${EJE}" width="${Math.max(0, b1 - b0)}" height="${alto - EJE}" fill="url(#p-rayas)" class="banda-incierta"><title>Tiempo narrativo: sabemos el orden de las paradas, no la fecha de cada una</title></rect>`;
  }
  g.innerHTML = `${banda}<line x1="${x}" x2="${x}" y1="0" y2="${alto}" class="cursor-linea"/>
    <rect x="${bx}" y="3" width="${anchoB}" height="20" rx="5" class="cursor-bandera"/><text x="${bx + anchoB / 2}" y="17" text-anchor="middle" class="cursor-texto">${esc(bandera)}</text>`;
  const pista = $('#pista');
  pista.setAttribute('aria-valuenow', E.t.toFixed(2));
  pista.setAttribute('aria-valuetext', bandera);
  // Barra superior y estado
  $('#fecha-valor').textContent = `${w?.estimada || !fino ? 'c. ' : ''}${fmtCursor(E.t, fino)}`;
  $('#fecha-pista').textContent = w?.estimada ? 'tiempo narrativo · TNM' : 'cronología TNM';
  const emp = (BE.D.periodos || []).find((p) => p.tipo === 'emperador' && (() => { const tr = tramo(p.fecha); return tr && E.t >= tr[0] && E.t < tr[1]; })());
  $('#linea-estado').textContent = [emp ? emp.nombre : '', w ? `Pablo ${w.parada ? 'en' : 'hacia'} ${w.parada ? w.en.lugar.nombre : w.sig.lugar.nombre}` : 'Sin datos de Pablo'].filter(Boolean).join(' · ');
}
function marcasEjeZoom(factor, tAncla) {
  const s = clamp(span() * factor, 0.25, 120);
  const f = (tAncla - E.vista[0]) / span();
  let v0 = tAncla - f * s;
  v0 = clamp(v0, BE.T_MIN, BE.T_MAX - s);
  E.vista = [v0, v0 + s];
  sucio.linea = true; programar();
}
function iniciarLinea() {
  pintarCarriles();
  const pista = $('#pista');
  const punteros = new Map();
  let arrastre = null, pinza = null;
  pista.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = pista.getBoundingClientRect();
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
      const d = (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) / anchoLinea * span();
      const v0 = clamp(E.vista[0] + d, BE.T_MIN, BE.T_MAX - span());
      E.vista = [v0, v0 + span()]; sucio.linea = true; programar();
    } else {
      marcasEjeZoom(Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), tDe(e.clientX - r.left));
    }
  }, { passive: false });
  pista.addEventListener('pointerdown', (e) => {
    const r = pista.getBoundingClientRect();
    punteros.set(e.pointerId, e.clientX);
    if (punteros.size === 2) {
      const xs = [...punteros.values()];
      pinza = { d: Math.abs(xs[0] - xs[1]), s: span(), t: tDe((xs[0] + xs[1]) / 2 - r.left) };
      arrastre = null; return;
    }
    if (e.target.closest('[data-sel]')) return;   // el clic en un elemento lo gestiona el delegado general
    arrastre = { x: e.clientX };
    pista.setPointerCapture(e.pointerId);
    setT(tDe(e.clientX - r.left));
  });
  pista.addEventListener('pointermove', (e) => {
    const r = pista.getBoundingClientRect();
    if (punteros.has(e.pointerId)) punteros.set(e.pointerId, e.clientX);
    if (pinza && punteros.size === 2) {
      const xs = [...punteros.values()];
      const d = Math.max(10, Math.abs(xs[0] - xs[1]));
      const s = clamp(pinza.s * pinza.d / d, 0.25, 120);
      marcasEjeZoom(s / span(), pinza.t);
      return;
    }
    if (arrastre) setT(tDe(e.clientX - r.left));
  });
  const fin = (e) => {
    punteros.delete(e.pointerId);
    if (punteros.size < 2) pinza = null;
    arrastre = null;
  };
  pista.addEventListener('pointerup', fin);
  pista.addEventListener('pointercancel', (e) => { punteros.delete(e.pointerId); pinza = null; arrastre = null; });
  document.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
    const s = +b.dataset.zoom;
    let v0 = clamp(E.t - s * 0.4, BE.T_MIN, BE.T_MAX - s);
    E.vista = [v0, v0 + s]; sucio.linea = true; programar();
  }));
  $('#reproducir').addEventListener('click', () => reproducir(!E.play));
  $('#anterior').addEventListener('click', () => saltar(-1));
  $('#siguiente').addEventListener('click', () => saltar(1));
  new ResizeObserver(() => { sucio.linea = true; programar(); }).observe(pista);
}

Object.assign(BE, { pintarLineaFija, pintarCursor, iniciarLinea });
})();
