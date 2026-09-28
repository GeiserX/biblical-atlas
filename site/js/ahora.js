/* biblical-earth · «Ahora mismo» y sincronía. Sin nada seleccionado, la ficha enseña dónde está Pablo (v0) o, si los
   datos no lo sitúan, quién está dónde en la fecha del cursor (T-09). La frase de contexto de la línea (T-23). La vista
   «Ahora mismo» (#vista-ahora) sobre el mapa, y la sincronía por lugar (#vista-sincronia, A-12): ¿quién había en un
   lugar en una época? Dueño durante el reparto: app-tiempo. */
'use strict';
(() => {
const BE = window.BE;
const { E, esc, fmtAnio, fechaCorta, tramo, $, clamp, sucio, programar } = BE;

// ---------------------------------------------------------------------------
// Qué pasa en t
// ---------------------------------------------------------------------------
const GOBIERNO = ['emperador', 'rey', 'gobernador', 'sumo-sacerdote'];
const NOMBRE_TIPO = { emperador: 'Emperador', rey: 'Rey', gobernador: 'Gobernador', 'sumo-sacerdote': 'Sumo sacerdote', potencia: 'Imperio', era: 'Era' };
const cubre = (f, t) => { const tr = BE.ventanaFecha(f) || tramo(f); return !!tr && t >= tr[0] && t < tr[1]; };
/** ¿El periodo cubre t? Una potencia con un extremo sin fecha cubre hasta la potencia vecina (BE.tramoPotencia). */
const cubreP = (p, t) => { if (p.tipo !== 'potencia') return cubre(p.fecha, t); const tr = BE.tramoPotencia(p); return !!tr && t >= tr[0] && t < tr[1]; };
/** Potencias en t: la de fechas conocidas más reciente o, si solo caen ahí potencias con el cambio sin fechar (entre
    Egipto y Asiria, antes de 740 a.e.c.), todas ellas, porque no sabemos cuál mandaba. */
function potenciasEn(ps, t) {
  const xs = ps.filter((p) => p.tipo === 'potencia' && cubreP(p, t)).sort((a, b) => tramo(b.fecha)[0] - tramo(a.fecha)[0]);
  // Una potencia sin fecha de ascenso cuenta como fija desde el año en que ya consta como tal (Asiria al tomar Samaria).
  const fijas = xs.filter((p) => !BE.tramoPotencia(p).abierto || (p.consta_desde != null && t >= p.consta_desde));
  if (fijas.length) return [fijas[0]];
  return xs.sort((a, b) => BE.tramoPotencia(a)[0] - BE.tramoPotencia(b)[0] || (BE.tramoPotencia(a).abierto === 'd' ? -1 : 1));
}
const nombreCorto = (p) => p.nombre.split(',')[0];
/** «Egipto o Asiria (cambio sin fechar)» cuando hay más de una. */
const textoPotencias = (r) => (r.potencias.length > 1 ? `${r.potencias.map(nombreCorto).join(' o ')} (cambio sin fechar)` : r.potencia?.nombre || '');
function resumen(t) {
  const ps = BE.D.periodos || [];
  const ultimo = (xs) => xs.sort((a, b) => tramo(b.fecha)[0] - tramo(a.fecha)[0])[0] || null;
  const era = ultimo(ps.filter((p) => p.tipo === 'era' && cubre(p.fecha, t)));
  const potencias = potenciasEn(ps, t);
  const potencia = potencias[0] || null;
  const gobierno = ps.filter((p) => GOBIERNO.includes(p.tipo) && cubre(p.fecha, t))
    .sort((a, b) => GOBIERNO.indexOf(a.tipo) - GOBIERNO.indexOf(b.tipo) || tramo(a.fecha)[0] - tramo(b.fecha)[0]);
  const porLugar = new Map();
  const camino = [];
  for (const id of BE.personasConEstancias()) {
    const w = BE.donde(id, t);
    if (w && !w.parada) camino.push({ persona: id, w });
  }
  for (const x of BE.presentes(t)) {
    const id = x.w.en.lugar.id;
    if (!porLugar.has(id)) porLugar.set(id, []);
    porLugar.get(id).push(x);
  }
  const lugares = [...porLugar.entries()].map(([id, xs]) => ({ lugar: BE.L[id], xs })).sort((a, b) => b.xs.length - a.xs.length || a.lugar.nombre.localeCompare(b.lugar.nombre, 'es'));
  const evs = (BE.D.eventos || []).map((e) => ({ e, v: BE.ventanaEvento(e) })).filter((x) => x.v);
  const ahora = evs.filter((x) => t >= x.v[0] && t < x.v[1]).map((x) => x.e);
  const antes = evs.filter((x) => x.v[1] <= t).sort((a, b) => b.v[1] - a.v[1])[0] || null;
  const despues = evs.filter((x) => x.v[0] > t).sort((a, b) => a.v[0] - b.v[0])[0] || null;
  const presentes = new Set([...porLugar.values()].flat().concat(camino).map((x) => x.persona));
  // Personas activas en esta fecha a las que los datos no ponen en ningún lugar: se dicen, no se sitúan.
  const sinLugar = Object.values(BE.PERS).filter((p) => p.fecha && !presentes.has(p.id) && cubre(p.fecha, t)).slice(0, 6);
  return { t, era, potencia, potencias, gobierno, lugares, camino, ahora, antes, despues, sinLugar };
}
/** ¿Tiene sentido decir que no sabemos dónde estaba Pablo? Solo entre su primera parada y unos años después de la
    última (murió hacia 65). Antes de su conversión, en la vida de Jesús o en otra época, no se nombra. */
const conPablo = (t) => BE.P.length > 0 && t >= BE.P[0].a && t < BE.P.at(-1).b + 5;
/** Frase de contexto del cursor (T-23): «Roma · Claudio · Pablo en Corinto · Galión». */
function fraseAhora(t) {
  const r = resumen(t);
  const partes = [];
  if (r.potencia) partes.push(textoPotencias(r));
  else if (r.era) partes.push(r.era.nombre);
  const mandan = r.gobierno.filter((p) => p.tipo === 'emperador' || p.tipo === 'rey').slice(0, 2).map((p) => p.nombre.split(',')[0]);
  partes.push(...mandan);
  const w = BE.dondeEsta(t);
  if (w) partes.push(`Pablo ${w.parada ? 'en' : 'hacia'} ${w.parada ? w.en.lugar.nombre : w.sig.lugar.nombre}`);
  else if (conPablo(t)) partes.push('Sin datos de Pablo');
  const otros = r.lugares.flatMap((g) => g.xs.filter((x) => x.persona !== 'pablo').map((x) => `${BE.PERS[x.persona].nombre.replace(/^([^,]+), (.+)$/, '$1 ($2)')} en ${g.lugar.nombre}`));
  partes.push(...otros.slice(0, w ? 1 : 2));
  partes.push(...r.gobierno.filter((p) => p.tipo === 'gobernador').slice(0, 1).map((p) => p.nombre));
  return partes.join(' · ');
}

// ---------------------------------------------------------------------------
// Ficha sin selección
// ---------------------------------------------------------------------------
/** Clave de la ficha sin selección: si no cambia, la ficha no se vuelve a pintar. */
function claveAhora() {
  const w = BE.dondeEsta(E.t);
  if (w) return `ahora|${w.en.key}|${w.parada ? '' : w.sig?.key}|${BE.D.cartas.filter((c) => BE.cartaVisible(c, E.t)).map((c) => c.id)}`;
  return `res|${claveResumen(resumen(E.t))}|${Math.floor(E.t)}`;
}
function claveResumen(r) {
  return [r.era?.id, r.potencias.map((p) => p.id), r.gobierno.map((p) => p.id), r.lugares.map((g) => `${g.lugar.id}:${g.xs.map((x) => x.persona)}`), r.camino.map((x) => x.persona), r.ahora.map((e) => e.id), r.antes?.e.id, r.despues?.e.id].join('|');
}
const boton = (sel, texto, clase = '') => `<button type="button" class="enlace-titulo ${clase}" data-sel="${esc(sel)}">${esc(texto)}</button>`;
/** Filas de «Ahora mismo»: imperio, gobierno, quién está dónde, qué pasa, qué pasó y qué viene, de quién no sabemos. */
function filasResumen(r, { max = 5 } = {}) {
  const filas = [];
  if (r.potencia || r.era) {
    const pot = r.potencias.length > 1 ? `${r.potencias.map((p) => boton(`periodo:${p.id}`, nombreCorto(p))).join(' o ')} <span class="be-muted" title="Las fuentes no fechan cuándo pasó el poder de una a otra">(cambio sin fechar)</span>` : r.potencia ? boton(`periodo:${r.potencia.id}`, r.potencia.nombre) : '';
    filas.push(['Época', [pot, r.era && boton(`periodo:${r.era.id}`, r.era.nombre)].filter(Boolean).join(' · ')]);
  }
  if (r.gobierno.length) filas.push(['Gobierno', r.gobierno.map((p) => `${boton(`periodo:${p.id}`, p.nombre)}${p.tipo !== 'rey' && p.tipo !== 'emperador' && !BE.norm(p.nombre).includes(BE.norm(NOMBRE_TIPO[p.tipo])) ? ` <span class="be-muted">(${esc(NOMBRE_TIPO[p.tipo].toLowerCase())})</span>` : ''}`).join(', ')]);
  for (const g of r.lugares.slice(0, max)) {
    filas.push([esc(g.lugar.nombre), g.xs.map((x) => {
      const p = BE.PERS[x.persona];
      const edad = BE.edad(x.persona, r.t);
      return `${boton(`persona:${x.persona}`, p.nombre)}${x.w.estimada ? '<span class="be-muted" title="Fecha estimada: sabemos el orden, no el día"> (c.)</span>' : ''}${edad ? `<span class="be-muted"> · ${esc(edad.texto)}</span>` : ''}`;
    }).join(', '), `lugar:${g.lugar.id}`]);
  }
  if (r.lugares.length > max) filas.push(['Y más', `${r.lugares.length - max} lugares con personas en esta fecha`]);
  if (r.camino.length) filas.push(['De camino', r.camino.slice(0, 4).map((x) => `${boton(`persona:${x.persona}`, BE.PERS[x.persona].nombre)} <span class="be-muted">de ${esc(x.w.en.lugar.nombre)} a ${esc(x.w.sig.lugar.nombre)} (c.)</span>`).join('<br>')]);
  if (r.ahora.length) filas.push(['Qué pasa', r.ahora.slice(0, 3).map((e) => `${boton(`evento:${e.id}`, e.titulo)}${BE.chipsCitas((e.pasajes || []).slice(0, 1).join('; '))}`).join('<br>')]);
  if (r.antes && !r.ahora.includes(r.antes.e)) filas.push(['Antes', `${boton(`evento:${r.antes.e.id}`, r.antes.e.titulo)} <span class="be-muted">· ${esc(r.antes.e.fecha?.texto || '')}, hace ${esc(BE.duracion(r.t - r.antes.v[1]))}</span>`]);
  if (r.despues) filas.push(['Qué viene', `${boton(`evento:${r.despues.e.id}`, r.despues.e.titulo)} <span class="be-muted">· ${esc(r.despues.e.fecha?.texto || '')}, dentro de ${esc(BE.duracion(r.despues.v[0] - r.t))}</span>`]);
  if (r.sinLugar.length) filas.push(['Sin lugar', `${r.sinLugar.map((p) => boton(`persona:${p.id}`, p.nombre)).join(', ')} <span class="be-muted">· activos en esta fecha; los datos no dicen dónde</span>`]);
  return filas;
}
const kv = (filas) => `<dl class="be-kv ahora-kv">${filas.map(([k, v, sel]) => `<dt>${sel ? `<button type="button" class="enlace-titulo" data-sel="${esc(sel)}">${k}</button>` : k}</dt><dd>${v}</dd>`).join('')}</dl>`;
function fichaResumen(t) {
  const r = resumen(t);
  const filas = filasResumen(r);
  const antesP = [...BE.P].reverse().find((s) => s.b < t), despuesP = BE.P.find((s) => s.a > t);

  const titulo = r.potencia ? `${BE.fmtMes(t, BE.span() < 4)} · ${textoPotencias(r)}` : BE.fmtMes(t, BE.span() < 4);
  return `${BE.migas('Ahora mismo', BE.fmtMes(t))}
    <section class="be-card ahora"><div class="be-card__pad">
      <div class="be-card__eyebrow">Ahora mismo · lo que dicen los datos</div>
      <h2 class="be-card__title">${esc(titulo)}</h2>
      ${filas.length ? kv(filas) : '<p class="be-card__body">No tenemos datos con fecha para este momento. No rellenamos el hueco: estos son los hechos fechados más cercanos.</p>'}
      ${!filas.length && (r.antes || r.despues) ? `<div class="be-list">${r.antes ? BE.botonSel(`evento:${r.antes.e.id}`, `Antes: ${r.antes.e.titulo}`, esc(r.antes.e.fecha?.texto || '')) : ''}${r.despues ? BE.botonSel(`evento:${r.despues.e.id}`, `Después: ${r.despues.e.titulo}`, esc(r.despues.e.fecha?.texto || '')) : ''}</div>` : ''}
    </div></section>
    ${conPablo(t) ? `<section class="be-card ficha-sec"><div class="be-card__pad">
        <h3 class="be-card__eyebrow">No sabemos dónde estaba Pablo en esta fecha</h3>
        <p class="be-card__body">Los datos no lo sitúan en ${esc(BE.fmtMes(t))}; no inventamos una posición: estas son las paradas con fecha más cercanas.</p>
        <div class="be-list">${antesP ? BE.botonSel(`parada:${antesP.key}`, `Antes: ${antesP.lugar.nombre}`, esc(antesP.p.referencia)) : ''}${despuesP ? BE.botonSel(`parada:${despuesP.key}`, `Después: ${despuesP.lugar.nombre}`, esc(despuesP.p.referencia)) : ''}</div>
      </div></section>` : ''}${cartasCercaHtml()}`;
}
function fichaAhora() {
  const w = BE.dondeEsta(E.t);
  if (w) return BE.fichaParada(w.en, w);
  return fichaResumen(E.t);
}
function cartasCercaHtml() {
  const cs = BE.D.cartas.filter((c) => BE.cartaVisible(c, E.t));
  if (!cs.length) return '';
  return `<section class="be-card ficha-sec"><div class="be-card__pad"><h3 class="be-card__eyebrow">Cartas cerca de esta fecha</h3>
    <div class="be-list">${cs.map((c) => BE.botonSel(`carta:${c.id}`, c.libro, `${esc(BE.origenesCarta(c).map((id) => BE.L[id].nombre).join(' o '))} → ${esc(BE.destinosCarta(c).map((id) => BE.L[id].nombre).join(', ') || 'destino no indicado')} · ${esc(fechaCorta(c.fecha))}`)).join('')}</div></div></section>`;
}

// ---------------------------------------------------------------------------
// Vista «Ahora mismo» sobre el mapa (#vista-ahora)
// ---------------------------------------------------------------------------
let ahoraAbierta = false, claveVista = '';
const ICONO_RELOJ = '<svg class="be-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
function ponerAhora(on) {
  ahoraAbierta = on;
  $('#vista-ahora').hidden = !on;
  $('#ahora-boton')?.setAttribute('aria-pressed', String(on));
  claveVista = '';
  pintarVistaAhora();
  BE.guardarHash();
}
function pintarVistaAhora() {
  if (!ahoraAbierta) return;
  const r = resumen(E.t);
  const w = BE.dondeEsta(E.t);
  const clave = `${claveResumen(r)}|${w?.en.key}|${w?.parada}|${Math.floor(E.t * (BE.span() < 4 ? 12 : 1))}`;
  if (clave === claveVista) return;
  claveVista = clave;
  const filas = filasResumen(r, { max: 4 });
  if (w) filas.splice(r.gobierno.length ? 2 : 1, 0, ['Pablo', `${w.parada ? 'en' : 'hacia'} ${boton(`lugar:${(w.parada ? w.en : w.sig).lugar.id}`, (w.parada ? w.en : w.sig).lugar.nombre)}${w.estimada ? ' <span class="be-muted">(c.)</span>' : ''}`]);
  $('#vista-ahora').innerHTML = `<div class="be-float ahora-flotante">
    <div class="ahora-cabecera"><span class="be-card__eyebrow">${ICONO_RELOJ} Ahora mismo</span><button type="button" class="menu-x" data-ahora="cerrar" aria-label="Cerrar «Ahora mismo»">×</button></div>
    <div class="ahora-fecha">${esc(BE.fmtMes(E.t, BE.span() < 4))}</div>
    ${filas.length ? kv(filas) : '<p class="be-muted">No tenemos datos con fecha para este momento.</p>'}</div>`;
}

// ---------------------------------------------------------------------------
// Sincronía por lugar (A-12, pantalla 09): ¿quién había en [lugar] en la época de [periodo]?
// ---------------------------------------------------------------------------
const S = { abierta: false, lugar: null, periodo: null };
const ETIQ = 150;
const epocas = () => (BE.D.periodos || []).filter((p) => (p.tipo === 'potencia' || p.tipo === 'era') && tramo(p.fecha))
  .sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'potencia' ? -1 : 1) || BE.tramoPeriodo(a)[0] - BE.tramoPeriodo(b)[0]);
function rangoEpoca(p) {
  const tr = BE.tramoPeriodo(p);
  return [tr[0], Math.max(tr[1], tr[0] + 1)];
}
/** Estancias de todas las personas dentro de [a, b], por lugar: Map(lugar → Map(persona → [estancias])). */
function estanciasEn(a, b) {
  const m = new Map();
  for (const id of BE.personasConEstancias()) {
    for (const s of BE.estancias(id)) {
      if (s.b <= a || s.a >= b) continue;
      const l = s.lugar.id;
      if (!m.has(l)) m.set(l, new Map());
      const pm = m.get(l);
      if (!pm.has(id)) pm.set(id, []);
      pm.get(id).push(s);
    }
  }
  return m;
}
function alternar(on = !S.abierta, opciones = {}) {
  S.abierta = on;
  if (opciones.periodo) S.periodo = opciones.periodo;
  if (opciones.lugar) S.lugar = opciones.lugar;
  $('#vista-sincronia').hidden = !on;
  $('#app').classList.toggle('con-sincronia', on);
  if (on) pintarSincronia(); else $('#vista-sincronia').innerHTML = '';
  BE.guardarHash();
}
function pasoEje(total) {
  return [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.25].find((p) => total / p >= 6) || 0.25;
}
function pintarSincronia() {
  const vista = $('#vista-sincronia');
  const eps = epocas();
  if (!eps.length) {
    vista.innerHTML = `<div class="sinc-cabecera"><span class="sinc-pregunta">Sincronía por lugar</span><span class="be-spacer"></span><button type="button" class="be-btn be-btn--sm" data-sinc="cerrar">Cerrar ×</button></div><p class="sinc-vacio">Todavía no hay épocas (imperios o eras) en los datos.</p>`;
    return;
  }
  let ep = eps.find((p) => p.id === S.periodo);
  if (!ep) ep = eps.find((p) => p.tipo === 'potencia' && cubreP(p, E.t)) || eps.find((p) => cubreP(p, E.t)) || eps[0];
  S.periodo = ep.id;
  const [e0, e1] = rangoEpoca(ep);
  const porLugar = estanciasEn(e0, e1);
  const lugaresOrden = [...porLugar.entries()].map(([id, pm]) => ({ id, n: pm.size })).sort((x, y) => y.n - x.n || (x.id === 'jerusalen' ? -1 : 0));
  if (S.lugar !== 'todo' && !porLugar.has(S.lugar)) S.lugar = porLugar.has('jerusalen') ? 'jerusalen' : (lugaresOrden[0]?.id || 'todo');
  const elegidos = S.lugar === 'todo' ? lugaresOrden.map((x) => x.id) : [S.lugar];
  // Corte y gobierno: reyes y emperadores del imperio; gobernadores y sumos sacerdotes, si son del lugar.
  const gob = (BE.D.periodos || []).filter((p) => GOBIERNO.includes(p.tipo) && tramo(p.fecha) && tramo(p.fecha)[1] > e0 && tramo(p.fecha)[0] < e1)
    .filter((p) => p.tipo === 'rey' || p.tipo === 'emperador' || S.lugar === 'todo' || (p.lugares || []).includes(S.lugar));
  // Hechos fechados en la época y en esos lugares.
  const hechos = (BE.D.eventos || []).map((e) => ({ e, m: BE.momentoEvento(e) }))
    .filter((x) => x.m != null && x.m >= e0 && x.m <= e1 && (S.lugar === 'todo' || (x.e.lugares || []).some((l) => elegidos.includes(l))))
    .sort((x, y) => x.m - y.m);
  // La escala se ciñe a lo que hay en la época (con un margen), no a toda la época: así las barras se leen.
  const ext = [];
  for (const lid of elegidos) for (const ss of (porLugar.get(lid) || new Map()).values()) for (const x of ss) ext.push(Math.max(x.a, e0), Math.min(x.b, e1));
  for (const h of hechos) ext.push(h.m);
  if (!ext.length) for (const p of gob) { const tr = tramo(p.fecha); ext.push(Math.max(tr[0], e0), Math.min(tr[1], e1)); }
  const d0 = ext.length ? Math.min(...ext) : e0, d1 = ext.length ? Math.max(...ext) : e1;
  const pad = Math.max((d1 - d0) * 0.04, 1);
  const a = Math.max(e0 - pad, d0 - pad), b = Math.min(e1 + pad, d1 + pad);
  const pct = (t) => clamp(((t - a) / (b - a)) * 100, 0, 100);
  const filas = [];
  const barra = (t0, t1, clase, sel, texto, titulo, color = '') => {
    const x0 = pct(t0), x1 = pct(t1);
    return `<button type="button" class="sinc-barra ${clase}" style="${color ? `--c:${color};` : ''}left:${x0}%;width:max(6px, ${x1 - x0}%)" data-sel="${esc(sel)}" data-a="${t0}" data-b="${t1}" title="${esc(titulo)}"><span>${esc(texto)}</span></button>`;
  };
  const rombo = (t, clase, sel, texto, titulo) => `<button type="button" class="sinc-rombo ${clase}" style="left:${pct(t)}%" data-sel="${esc(sel)}" data-a="${t}" data-b="${t}" title="${esc(titulo)}"><i></i><span>${esc(texto)}</span></button>`;
  if (gob.length) {
    filas.push('<div class="sinc-grupo">Corte y gobierno</div>');
    for (const tipo of GOBIERNO) {
      const ps = gob.filter((p) => p.tipo === tipo).sort((x, y) => tramo(x.fecha)[0] - tramo(y.fecha)[0]);
      const fin = [];
      const filasTipo = [];
      for (const p of ps) {
        const tr = tramo(p.fecha);
        let i = fin.findIndex((f) => f <= tr[0] + 1e-6);
        if (i < 0) { i = fin.length; filasTipo.push([]); }
        fin[i] = tr[1];
        filasTipo[i].push(p);
      }
      filasTipo.forEach((lista, i) => filas.push(`<div class="sinc-fila"><div class="sinc-nombre">${esc(NOMBRE_TIPO[tipo])}${i ? ` <small>${i + 1}</small>` : ''}</div><div class="sinc-pista">${lista.map((p) => {
        const tr = tramo(p.fecha);
        const abierto = p.fecha.hasta == null ? ' abierta' : '';
        return barra(tr[0], tr[1], `sinc-periodo${abierto}${p.fecha.tipo === 'narrativa' ? ' narrativa' : ''}${p.fecha.aprox ? ' aprox' : ''}`, `periodo:${p.id}`, p.nombre, `${p.nombre} · ${p.fecha.texto || fechaCorta(p.fecha)}`);
      }).join('')}</div></div>`));
    }
    const alts = BE.lineaEstado.secular ? gob.flatMap((p) => (p.alternativas || []).map((alt) => ({ p, alt }))) : [];
    if (alts.length) filas.push(`<div class="sinc-fila"><div class="sinc-nombre sinc-secular">Secular <small>nota</small></div><div class="sinc-pista">${alts.map(({ p, alt }) => {
      const tr = tramo(alt.fecha);
      return barra(tr[0], tr[1], 'sinc-alt', `periodo:${p.id}`, `${p.nombre} · ${alt.fecha.texto || ''}`, `Fecha secular, solo como nota: ${alt.fecha.texto || ''}. ${alt.nota || ''}`);
    }).join('')}</div></div>`);
  }
  // Personas por lugar.
  let alguien = false;
  for (const lid of elegidos) {
    const pm = porLugar.get(lid);
    if (!pm?.size) continue;
    alguien = true;
    filas.push(`<div class="sinc-grupo"><button type="button" class="enlace-titulo" data-sel="lugar:${esc(lid)}">En ${esc(BE.L[lid].nombre)}</button></div>`);
    const personas = [...pm.entries()].sort((x, y) => Math.min(...x[1].map((s) => s.a)) - Math.min(...y[1].map((s) => s.a)));
    for (const [pid, ss] of personas) {
      const p = BE.PERS[pid];
      filas.push(`<div class="sinc-fila"><div class="sinc-nombre">${boton(`persona:${pid}`, p.nombre)}</div><div class="sinc-pista">${ss.map((s) => {
        const texto = s.larga ? (s.fecha?.texto || s.titulo) : s.titulo;
        return barra(Math.max(s.a, a), Math.min(s.b, b), `sinc-estancia${s.narrativa ? ' estimada' : ''}${s.larga ? ' larga' : ''}`, s.sel, texto, `${s.titulo} · ${s.lugar.nombre}${s.fecha?.texto ? ` · ${s.fecha.texto}` : ''}${s.narrativa ? ' · fecha estimada' : ''}`, BE.colorPersona(pid));
      }).join('')}</div></div>`);
    }
  }
  if (hechos.length) {
    filas.push('<div class="sinc-grupo">Hechos fechados</div>');
    const fin = [], filasH = [];
    for (const h of hechos) {
      const x = pct(h.m), ancho = (h.e.titulo.length * 0.6 + 6) * 0.1;   // estimación en % para no pisar etiquetas
      let i = fin.findIndex((f) => f <= x);
      if (i < 0) { i = fin.length; filasH.push([]); }
      fin[i] = x + ancho * 1.4 + 2;
      filasH[i].push(h);
    }
    filasH.forEach((lista, i) => filas.push(`<div class="sinc-fila"><div class="sinc-nombre">${i ? '' : 'Sucesos'}</div><div class="sinc-pista">${lista.map(({ e, m }) => {
      const calc = e.fecha?.tipo === 'derivada';
      return rombo(m, calc ? 'calculo' : '', `evento:${e.id}`, `${fmtAnio(Math.floor(m)).replace(' e.c.', '')} ${e.titulo}${calc ? ' · sin verificar' : ''}`, `${e.titulo} · ${e.fecha?.texto || ''}${calc ? ' · cálculo nuestro, sin verificar' : ''}`);
    }).join('')}</div></div>`));
  }
  // Eje.
  const paso = pasoEje(e1 - e0);
  const ticks = [];
  for (let L = Math.ceil((1 - b) / paso) * paso; L <= 1 - a; L += paso) if (L >= 1) ticks.push(1 - L);
  for (let L = Math.max(1, Math.ceil(a / paso) * paso); L <= b; L += paso) if (L >= 1) ticks.push(L);
  const eje = `<div class="sinc-fila sinc-eje"><div class="sinc-nombre"></div><div class="sinc-pista">${ticks.sort((x, y) => x - y).map((t) => `<span class="sinc-tick" style="left:${pct(t)}%">${esc(fmtAnio(t))}</span>`).join('')}</div></div>`;
  const vecinos = !alguien && S.lugar !== 'todo' ? lugaresOrden.slice(0, 4) : [];
  const opcionesLugar = [...lugaresOrden.map((x) => x.id), ...(porLugar.has(S.lugar) || S.lugar === 'todo' ? [] : [S.lugar])];
  vista.innerHTML = `<div class="sinc-cabecera">
      <span class="sinc-pregunta">¿Quién había en <select data-sinc="lugar" aria-label="Lugar">${opcionesLugar.map((id) => `<option value="${esc(id)}"${id === S.lugar ? ' selected' : ''}>${esc(BE.L[id]?.nombre || id)}</option>`).join('')}<option value="todo"${S.lugar === 'todo' ? ' selected' : ''}>todos los lugares</option></select>
      en la época de <select data-sinc="periodo" aria-label="Época">${eps.map((p) => `<option value="${esc(p.id)}"${p.id === ep.id ? ' selected' : ''}>${esc(p.nombre)} (${esc(p.fecha.texto || fechaCorta(p.fecha))})</option>`).join('')}</select>?</span>
      <span class="be-spacer"></span>
      <span class="sinc-nota">Las fechas en rayado son estimadas; «sin verificar» es un cálculo nuestro.</span>
      <button type="button" class="be-btn be-btn--sm" data-sinc="cerrar">Cerrar <span aria-hidden="true">×</span></button>
    </div>
    <div class="sinc-cuerpo"><div class="sinc-tabla" style="--etiq:${ETIQ}px" data-a="${a}" data-b="${b}">
      ${eje}${filas.join('')}
      ${vecinos.length || !filas.length ? `<div class="sinc-vacio">No sabemos de nadie en ${esc(BE.L[S.lugar]?.nombre || 'este lugar')} en esta época.${vecinos.length ? ` Sí hay datos en: ${vecinos.map((v) => `<button type="button" class="be-chip" data-sinc-lugar="${esc(v.id)}">${esc(BE.L[v.id].nombre)} · ${v.n}</button>`).join(' ')}` : ''}</div>` : ''}
      <div class="sinc-cursor" aria-hidden="true"></div>
    </div></div>`;
  cursorSincronia();
}
/** Mueve el cursor de la sincronía y resalta lo que corta (lo demás baja de opacidad). */
function cursorSincronia() {
  const tabla = $('#vista-sincronia .sinc-tabla');
  if (!tabla) return;
  const a = +tabla.dataset.a, b = +tabla.dataset.b;
  const dentro = E.t >= a && E.t <= b;
  const c = tabla.querySelector('.sinc-cursor');
  c.hidden = !dentro;
  c.style.left = `calc(var(--etiq) + (100% - var(--etiq)) * ${(E.t - a) / (b - a)})`;
  c.dataset.fecha = BE.fmtMes(E.t);
  tabla.querySelectorAll('[data-a]').forEach((el) => {
    if (el === tabla) return;
    const x0 = +el.dataset.a, x1 = +el.dataset.b;
    const corta = x0 === x1 ? Math.abs(E.t - x0) < (b - a) * 0.01 : E.t >= x0 && E.t < x1;
    el.classList.toggle('corta', dentro && corta);
    el.classList.toggle('fuera', dentro && !corta);
  });
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
BE.inicios.push(() => {
  const botones = $('#linea-botones');
  if (botones) {
    const b = document.createElement('button');
    b.type = 'button'; b.id = 'ahora-boton'; b.className = 'be-btn be-btn--icon be-btn--ghost linea-boton';
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', 'Ahora mismo: quién está dónde en esta fecha');
    b.title = 'Ahora mismo: quién está dónde en esta fecha';
    b.innerHTML = ICONO_RELOJ;
    b.addEventListener('click', () => ponerAhora(!ahoraAbierta));
    botones.prepend(b);
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-ahora="cerrar"]')) { ponerAhora(false); return; }
    const abrir = e.target.closest('[data-sinc-abrir]');
    if (abrir) { alternar(true, { periodo: abrir.dataset.sincAbrir, lugar: abrir.dataset.sincLugar || null }); return; }
    const cerrar = e.target.closest('[data-sinc="cerrar"]');
    if (cerrar) { alternar(false); return; }
    const lug = e.target.closest('[data-sinc-lugar]');
    if (lug && lug.closest('#vista-sincronia')) { S.lugar = lug.dataset.sincLugar; pintarSincronia(); BE.guardarHash(); return; }
    // Un clic en el fondo de una fila de la sincronía mueve el cursor a esa fecha.
    const pista = e.target.closest('#vista-sincronia .sinc-pista');
    if (pista && !e.target.closest('[data-sel]')) {
      const tabla = pista.closest('.sinc-tabla');
      const r = pista.getBoundingClientRect();
      const f = (e.clientX - r.left) / r.width;
      BE.setT(+tabla.dataset.a + f * (+tabla.dataset.b - +tabla.dataset.a));
      BE.asegurarVisible(E.t, false);
    }
  });
  document.addEventListener('change', (e) => {
    const s = e.target.closest?.('#vista-sincronia select[data-sinc]');
    if (!s) return;
    if (s.dataset.sinc === 'lugar') S.lugar = s.value;
    if (s.dataset.sinc === 'periodo') { S.periodo = s.value; const tr = rangoEpoca(BE.D.periodos.find((p) => p.id === s.value)); if (E.t < tr[0] || E.t > tr[1]) { BE.setT(tr[0] + 0.5); BE.asegurarVisible(E.t, true); } }
    pintarSincronia(); BE.guardarHash();
  });
});
BE.pintores.push((c) => {
  if (ahoraAbierta && (c.cursor || c.panel || c.mapa)) pintarVistaAhora();
  if (S.abierta && (c.cursor || c.panel)) cursorSincronia();
});
BE.parametros.push(
  { nombre: 'ahora', escribir: () => (ahoraAbierta ? '1' : null), leer: (v) => { if ((v === '1') !== ahoraAbierta) ponerAhora(v === '1'); } },
  { nombre: 'sinc', escribir: () => (S.abierta ? `${S.lugar || ''}~${S.periodo || ''}` : null),
    leer: (v) => {
      if (!v) { if (S.abierta) alternar(false); return; }
      const [lugar, periodo] = v.split('~');
      if (lugar) S.lugar = lugar;
      if (periodo) S.periodo = periodo;
      alternar(true);
    } },
);

BE.sincronia = { alternar, abierta: () => S.abierta, pintar: pintarSincronia };
Object.assign(BE, { claveAhora, fichaAhora, cartasCercaHtml, fraseAhora, resumenAhora: resumen });
})();
