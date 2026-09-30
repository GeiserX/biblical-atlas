/* biblical-earth · filas de la línea de tiempo: cada marca reserva el sitio de su dibujo y de su nombre, y la primera
   fila libre de su carril se la queda. Ningún nombre se tapa ni se corta. Sin DOM: todo lo que usa llega como argumento,
   así que se prueba en node (tests/site/timeline-rows.test.mjs). linea.js lo usa a través de BE.filas.

   Una marca (item) es { id, name, cert, shape, start, end, anchor, w0, w1, group, openEnd, seq }:
   - shape «moment»: un punto en `anchor`, con la ventana [w0, w1) en la que pudo ser;
   - shape «span»: una barra de `start` a `end`;
   - cert: «exact» (la fuente la da), «approx» («c.»), «computed» (cuenta nuestra o el orden del relato), «uncertain»;
   - group: 0 o 1; las del grupo 1 (las paradas bajo sus viajes) van en filas propias, debajo;
   - seq: orden del relato entre marcas de la misma ventana (storyOrder). */
'use strict';
(() => {
const BE = window.BE;

// Qué palabra lleva el nombre según la certeza. Una fecha calculada no lleva palabra: la marca hueca ya lo dice, y la
// ficha lo cuenta entero. Quitar o poner una palabra es cambiar esta tabla y nada más: medir y dibujar la leen los dos.
const TAG = { approx: 'aprox.', uncertain: '¿?' };
const labelText = (it) => (TAG[it.cert] ? `${it.name} ${TAG[it.cert]}` : it.name);
// Hueco quiere decir una sola cosa: fecha calculada por nosotros. Lo dudoso se difumina y lleva «¿?».
const hollow = (it) => it.cert === 'computed';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Qué extremos se difuminan: [izquierdo, derecho] en px. */
function softEnds(it, G) {
  if (it.cert === 'approx') return [G.fade, G.fade];
  if (it.cert === 'uncertain') {
    if (it.openEnd === 'end') return [0, G.fadeOpen];
    if (it.openEnd === 'start') return [G.fadeOpen, 0];
    return [G.fade, G.fade];
  }
  if (it.cert === 'computed' && it.shape === 'moment') return [G.fade, G.fade];
  return [0, 0];
}

/** Ancho de cada nombre con su palabra. `meas` = { name(texto), tag(texto), space }: anchos en px de la letra de verdad.
    En el teléfono (G.maxLabel) un nombre largo va en dos o tres líneas dentro de su fila. */
function measure(items, meas, G) {
  for (const it of items) {
    const toks = it.name.split(' ').map((w) => ({ w: meas.name(w), gap: meas.space }));
    const tag = TAG[it.cert];
    if (tag) toks.push({ w: meas.tag(tag), gap: meas.space });
    const full = toks.reduce((sum, t, i) => sum + t.w + (i ? t.gap : 0), 0);
    it.fullW = Math.ceil(full) + 2;   // en una sola línea: así va dentro de una barra que la cabe
    it.lines = 1;
    if (!G.maxLabel || full <= G.maxLabel) { it.labelW = Math.ceil(full) + 2; continue; }
    for (let maxW = G.maxLabel; ; maxW += 16) {
      const lines = [];
      let cur = 0;
      for (const t of toks) {
        if (!cur) cur = t.w;
        else if (cur + t.gap + t.w <= maxW) cur += t.gap + t.w;
        else { lines.push(cur); cur = t.w; }
      }
      lines.push(cur);
      if (lines.length <= 3) { it.labelW = Math.ceil(Math.max(...lines)) + 6; it.lines = lines.length; break; }
    }
  }
}

// ---------------------------------------------------------------------------
// Filas del mundo: en píxeles desde el principio de la historia, a la escala de ahora. No dependen de dónde está la
// vista, así que arrastrar no cambia la fila de ninguna marca. El nombre va dentro de la barra si cabe entero en una
// línea; si no, a la derecha del dibujo. En los bordes de la pantalla, rescueEdges lo mete dentro si hay sitio.
// ---------------------------------------------------------------------------
function extent(it, ppy, t0, G) {
  const lw = it.labelW;
  const px = (t) => (t - t0) * ppy;
  let lx, g0, g1;
  if (it.shape === 'span') {
    const x0 = px(it.start), x1 = Math.max(px(it.end), x0 + 3);
    const s = softEnds(it, G);
    const pad = G.pad + Math.max(s[0], s[1]);
    // Dentro de la barra, en una sola línea, si la barra la cabe entera: nunca un nombre de dos líneas en una barra.
    it.inside = x1 - x0 >= it.fullW + 2 * pad;
    it._pad = pad;
    lx = it.inside ? x0 + pad : x1 + 4;
    g0 = x0; g1 = x1;
    if (it.inside) { it.ext0 = x0; it.ext1 = x1 + 0.5; it._lxw = lx; return; }
  } else {
    const a = px(it.anchor), w0 = px(it.w0), w1 = px(it.w1), r = G.dotR;
    lx = a + r + 4;
    g0 = Math.min(w0, a - r); g1 = Math.max(w1, a + r);
  }
  it._lxw = lx;
  it.ext0 = Math.min(g0, lx);
  const labelOut = lx + lw > g1 + 0.5 || lx < g0 - 0.5;
  it.ext1 = Math.max(g1, lx + lw) + (labelOut || it.shape === 'moment' ? G.gap : 0.5);
}
/** Orden de las marcas al repartir filas: por dónde empiezan; entre dos que empiezan igual (sucesos del mismo día), el
    orden del relato; después, por dónde acaban. */
function packOrder(a, b) {
  return a.ext0 - b.ext0 || (a.seq != null && b.seq != null ? a.seq - b.seq : 0) || a.ext1 - b.ext1;
}
/** Filas del mundo de un carril. Se guarda con su clave: no se repite al arrastrar, al mover el cursor ni al elegir. */
function pack(lane, ppy, t0, G, key) {
  if (lane.packKey === key) return false;
  lane.packKey = key;
  let base = 0;
  for (const g of [0, 1]) {
    const list = lane.items.filter((it) => (it.group || 0) === g);
    if (!list.length) continue;
    for (const it of list) extent(it, ppy, t0, G);
    list.sort(packOrder);
    const ends = [];
    for (const it of list) {
      let r = 0;
      while (r < ends.length && ends[r] > it.ext0) r++;
      ends[r] = it.ext1;
      it.row = base + r;
    }
    base += ends.length;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Colocar lo que se ve
// ---------------------------------------------------------------------------
const lwOf = (it) => (it._in ? it.fullW : it.labelW);
/** Coloca una marca visible en la vista { v0, span } de ancho w: su dibujo, su nombre y su caja. */
function place(it, view, w, t0, G) {
  const ppy = w / view.span;
  const X = (t) => (t - view.v0) * ppy;
  const LIM0 = -60, LIM1 = w + 60;
  it._in = !!it.inside;
  const lw = lwOf(it);
  let g0, g1, lx;
  if (it.shape === 'span') {
    const x0 = X(it.start), x1r = X(it.end), x1 = Math.max(x1r, x0 + 3);
    const c0 = clamp(x0, LIM0, LIM1), c1 = clamp(x1, LIM0, LIM1);
    const s = softEnds(it, G);
    const fl = x0 >= LIM0 ? Math.min(s[0], (x1 - x0) / 3) : 0, fr = x1 <= LIM1 ? Math.min(s[1], (x1 - x0) / 3) : 0;
    g0 = c0; g1 = Math.max(c1, c0 + 3);
    lx = it._lxw - (view.v0 - t0) * ppy;
    // El nombre dentro de la barra va con la parte que se ve, sin salir de la barra.
    if (it._in) lx = clamp(Math.max(x0, 4) + it._pad, x0 + it._pad, x1 - it._pad - lw);
    it._bar = [g0, g1 - g0, fl, fr];
    it._win = null; it._dot = null;
  } else {
    it._bar = null;
    const a = X(it.anchor), w0 = X(it.w0), w1 = X(it.w1);
    lx = it._lxw - (view.v0 - t0) * ppy;
    const showWin = (w1 - w0) > 2 * G.dotR + 2;
    const c0 = clamp(w0, LIM0, LIM1), c1 = clamp(w1, LIM0, LIM1);
    g0 = showWin ? c0 : a - G.dotR; g1 = showWin ? c1 : a + G.dotR;
    g0 = Math.min(g0, a - G.dotR); g1 = Math.max(g1, a + G.dotR);
    const s = softEnds(it, G);
    it._win = showWin ? [c0, c1 - c0, w0 >= LIM0 ? Math.min(s[0], (w1 - w0) / 3) : 0, w1 <= LIM1 ? Math.min(s[1], (w1 - w0) / 3) : 0] : null;
    it._dot = a;
  }
  it._g = [g0, g1];
  it._lx = lx;
  hitOf(it, w, G);
}
/** Caja de la marca (dibujo y nombre). En táctil ningún blanco mide menos de 44 px de ancho. */
function hitOf(it, w, G) {
  const LIM0 = -60, LIM1 = w + 60;
  it._hit = [clamp(Math.min(it._g[0], it._lx), LIM0, LIM1), clamp(Math.max(it._g[1], it._lx + lwOf(it)), LIM0, LIM1)];
  if (G.coarse && it._hit[1] - it._hit[0] < 44) { const c = (it._hit[0] + it._hit[1]) / 2; it._hit = [c - 22, c + 22]; }
  it._labOnFill = !!(it._bar && it._in && !hollow(it) && it._lx >= it._bar[0] && it._lx + lwOf(it) <= it._bar[0] + it._bar[1]);
}
/** Un nombre que se saldría por un borde de la franja se mete dentro si su fila tiene sitio (nunca encima de otra marca). */
function rescueEdges(vis, w, G) {
  const byRow = new Map();
  for (const it of vis) { if (!byRow.has(it.row)) byRow.set(it.row, []); byRow.get(it.row).push(it); }
  for (const list of byRow.values()) {
    list.sort((a, b) => a._hit[0] - b._hit[0]);
    for (let i = 0; i < list.length; i++) {
      const it = list[i], lw = lwOf(it);
      if (it._lx + lw > w - 2) {
        const prevRight = i > 0 ? list[i - 1]._hit[1] : -Infinity;
        // Primero al otro lado del dibujo, si se ve; si no, pegado al borde, en el sitio libre de la fila.
        const drawL = it.shape === 'moment' ? it._dot - G.dotR - 4 : it._g[0] - 4;
        const drawIn = it.shape === 'moment' ? it._dot >= 0 && it._dot <= w : it._g[1] >= 0 && it._g[0] <= w;
        if (drawIn && !it._in && drawL - lw >= Math.max(4, prevRight + G.gap)) { it._lx = drawL - lw; hitOf(it, w, G); }
        else {
          const nx = Math.max(w - lw - 4, prevRight + G.gap);
          if (nx < it._lx) { it._lx = nx; hitOf(it, w, G); }
        }
      }
      if (it._lx < 2) {
        const nextLeft = i < list.length - 1 ? list[i + 1]._hit[0] : Infinity;
        const nx = Math.min(4, nextLeft - G.gap - lw);
        if (nx > it._lx) { it._lx = nx; hitOf(it, w, G); }
      }
    }
  }
}
/** Una marca cuyo nombre no se lee entero en su fila (pegada a un borde, sin sitio al lado) baja a una fila del borde,
    al final del carril, donde su nombre cabe al otro lado de su dibujo. Si su dibujo ni se ve, no está en la vista.
    Nunca se corta un nombre. `holdEdge`: durante un arrastre, lo que ya cambió de fila se queda en ella. */
function edgeRows(vis, w, G, holdEdge) {
  const occ = new Map();   // fila (clave) -> intervalos ocupados
  const free = (k, a, b) => !(occ.get(k) || []).some(([x, y]) => a < y + G.gap && x < b + G.gap);
  const take = (k, a, b) => { if (!occ.has(k)) occ.set(k, []); occ.get(k).push([a, b]); };
  const unfit = [];
  for (const it of vis) {
    const lw = lwOf(it);
    it._key = it.row;
    it._gone = false;
    const pin = holdEdge && holdEdge.has(it.id);
    if (!pin && it._lx >= 0 && it._lx + lw <= w) { take(it.row, it._hit[0], it._hit[1]); continue; }
    const d0 = it.shape === 'moment' ? it._dot - G.dotR : it._g[0], d1 = it.shape === 'moment' ? it._dot + G.dotR : it._g[1];
    if (d1 < 0 || d0 > w) { it._gone = true; continue; }
    // Una barra que solo asoma unos píxeles por un borde todavía no está en la vista: aparece al arrastrar un poco.
    if (it.shape === 'span' && Math.min(d1, w) - Math.max(d0, 0) < 24) { it._gone = true; continue; }
    it._in = false;
    const lw2 = lwOf(it);
    if (d0 - 4 - lw2 >= 2) it._lx = d0 - 4 - lw2;
    else if (d1 + 4 + lw2 <= w - 2) it._lx = d1 + 4;
    else it._lx = Math.max(2, w - lw2 - 2);
    hitOf(it, w, G);
    unfit.push(it);
  }
  // Primero una fila del carril que ya se ve y tenga sitio; si no hay, una fila nueva al final.
  const rowsSeen = [...new Set(vis.filter((it) => !it._gone).map((it) => it.row))].sort((a, b) => a - b);
  unfit.sort((a, b) => (holdEdge && holdEdge.has(b.id) ? 1 : 0) - (holdEdge && holdEdge.has(a.id) ? 1 : 0));
  for (const it of unfit) {
    let k = holdEdge && holdEdge.has(it.id) ? holdEdge.get(it.id) : null;
    if (k == null) {
      k = rowsSeen.find((r) => free(r, it._hit[0], it._hit[1]));
      for (let e = 0; k == null; e++) if (free(100000 + e, it._hit[0], it._hit[1])) k = 100000 + e;
      if (holdEdge) holdEdge.set(it.id, k);
    }
    take(k, it._hit[0], it._hit[1]);
    it._key = k;
  }
}

/** Todo un carril en la vista { v0, span }. geom = { w, t0, G, key }: ancho de la franja, origen del mundo, geometría y
    la clave de la letra (si cambia, se vuelven a repartir las filas). hold = null, o { rows, edge } mientras se arrastra:
    ninguna marca cambia de fila, un carril no encoge, y una fila que aparece va abajo del todo.
    Devuelve { visible, nRows }: las marcas que se ven, cada una con su fila en pantalla (_drow), y cuántas filas hay. */
function layoutLane(lane, view, geom, hold) {
  const { w, t0, G } = geom;
  const ppy = w / view.span;
  pack(lane, ppy, t0, G, `${view.span}|${w}|${geom.key || ''}`);
  const v0 = view.v0, v1 = v0 + view.span;
  const rr = G.dotR / ppy;
  // Las filas que se reservan son las de lo que hay en la vista y en una pantalla a cada lado: así, al arrastrar hasta
  // una pantalla, no aparece ninguna fila nueva que empuje lo de debajo.
  const vis = [], near = new Set();
  for (const it of lane.items) {
    const a = it.shape === 'moment' ? Math.min(it.w0, it.anchor - rr) : it.start;
    const b = it.shape === 'moment' ? Math.max(it.w1, it.anchor + rr) : Math.max(it.end, it.start + 3 / ppy);
    if (b >= v0 && a <= v1) vis.push(it);
    if (b >= v0 - view.span && a <= v1 + view.span) near.add(it.row);
  }
  for (const it of vis) place(it, view, w, t0, G);
  rescueEdges(vis, w, G);
  edgeRows(vis, w, G, hold ? hold.edge : null);
  const shown = vis.filter((it) => !it._gone);
  // Las filas son las del mundo, sin los huecos de las que no tienen nada cerca.
  const worldRows = [...new Set([...shown.map((it) => it._key), ...(shown.length ? near : [])])].sort((a, b) => a - b);
  let rowMap;
  if (hold) {
    rowMap = hold.rows.get(lane.id) || new Map();
    let next = rowMap.size ? Math.max(...rowMap.values()) + 1 : 0;
    for (const r of worldRows) if (!rowMap.has(r)) rowMap.set(r, next++);
    hold.rows.set(lane.id, rowMap);
  } else rowMap = new Map(worldRows.map((r, i) => [r, i]));
  for (const it of shown) it._drow = rowMap.get(it._key);
  const nRows = shown.length || hold ? (rowMap.size ? Math.max(...rowMap.values()) + 1 : 0) : 0;
  shown.sort((a, b) => a._hit[0] - b._hit[0] || a._drow - b._drow);
  return { visible: shown, nRows };
}

// ---------------------------------------------------------------------------
// El clic: dónde entra el cursor en la marca
// ---------------------------------------------------------------------------
/** Momento al que va el cursor al pulsar una marca: el punto señalado (pointerT) o, con el teclado (pointerT null), el
    punto de la marca más cercano al cursor. La marca es [lo, hi): su final ya es lo que viene después, así que el
    cursor se queda antes (una hora, o la mitad si es más corta). Solo cuenta la parte que se ve; si no se ve nada de
    ella, null: el cursor no se mueve. `day` = un día en años. */
function clickTarget(it, pointerT, cursorT, view, day) {
  const lo = it.shape === 'moment' ? it.w0 : it.start, hi0 = it.shape === 'moment' ? it.w1 : it.end;
  const hi = hi0 > lo ? hi0 - Math.min((hi0 - lo) / 2, day / 24) : hi0;
  const vlo = Math.max(lo, view.v0), vhi = Math.min(hi, view.v0 + view.span);
  if (vlo > vhi) return null;
  return clamp(pointerT != null ? pointerT : cursorT, vlo, vhi);
}

// ---------------------------------------------------------------------------
// Certeza y orden del relato (lo mismo que docs/ideas/mockups/linea/extract.py)
// ---------------------------------------------------------------------------
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Duda en el texto de la fecha: un solo extremo («antes de 62», «después de 1600»), una interrogación, «quizá», «tal
// vez» o dos años a elegir («31 o 32»). «Después de X y antes de Y» es un tramo con dos extremos: no cuenta.
const UNCERTAIN = /^a\.\s|^antes de|^d\.\s|^despues de(?!.* y antes de)|fin sin fecha|al menos hasta|\?|quiza|tal vez|\d o \d/;
/** uncertain: un extremo sin fecha o duda en el texto. computed: fecha nuestra (derivada) o del orden del relato
    (narrativa). approx: la fuente dice «c.». exact: el resto. */
function certainty(f, openEnd) {
  f = f || {};
  if (f.desde == null || f.hasta == null || openEnd || UNCERTAIN.test(norm(f.texto))) return 'uncertain';
  if (f.tipo === 'derivada' || f.tipo === 'narrativa') return 'computed';
  if (f.aprox) return 'approx';
  return 'exact';
}
const PASSAGE = /^(\S+)\s+(\d+):(\d+)/;
/** Los sucesos de una misma ventana (el mismo día, casi siempre) no traen orden en los datos. Lo deducimos de los
    pasajes: si dos comparten un libro, va antes el que empieza antes en ese libro; con varios libros, manda la mayoría
    y un empate no decide. Se ordena por esas precedencias y, donde no dicen nada (o hay un ciclo), por el orden en que
    vienen. items = [{ start, end, passages }] en el orden de los datos; pone `seq` en los de una ventana compartida. */
function storyOrder(items) {
  const starts = (it) => {
    const out = new Map();
    for (const p of it.passages || []) {
      const g = PASSAGE.exec(String(p).trim());
      if (g && !out.has(g[1])) out.set(g[1], [+g[2], +g[3]]);
    }
    return out;
  };
  const cmp = (a, b) => a[0] - b[0] || a[1] - b[1];
  const groups = new Map();
  for (const it of items) {
    const k = `${it.start.toFixed(6)}|${it.end.toFixed(6)}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(it);
  }
  for (const ms of groups.values()) {
    if (ms.length < 2) continue;
    const pos = ms.map(starts), n = ms.length;
    const before = ms.map(() => new Set());   // before[j]: los que van antes que j
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      let vote = 0;
      for (const [book, p] of pos[i]) if (pos[j].has(book)) vote += Math.sign(cmp(p, pos[j].get(book)));
      if (vote < 0) before[j].add(i); else if (vote > 0) before[i].add(j);
    }
    const done = new Set(), order = [];
    while (order.length < n) {
      let k = -1;
      for (let x = 0; x < n; x++) if (!done.has(x) && [...before[x]].every((y) => done.has(y))) { k = x; break; }
      if (k < 0) for (let x = 0; x < n; x++) if (!done.has(x)) { k = x; break; }   // un ciclo: manda el orden de los datos
      done.add(k); order.push(k);
    }
    order.forEach((k, seq) => { ms[k].seq = seq; });
  }
}

BE.filas = { TAG, labelText, hollow, softEnds, measure, extent, packOrder, pack, place, hitOf, lwOf, rescueEdges, edgeRows, layoutLane, clickTarget, certainty, storyOrder, norm };
})();
