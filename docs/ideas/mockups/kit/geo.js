// biblical-earth · geo.js — proyección exacta de los mapas base y ayudas para dibujar maquetas.
//
// PROYECCIÓN
// Los mapas de kit/maps/ usan una proyección equirectangular con paralelo estándar φ0
// (cilíndrica equidistante). Para un mapa base con límites lon0..lon1, lat0..lat1 y ancho W px:
//
//   c = cos(φ0)                     k = W / ((lon1 − lon0) · c)     (px por grado de latitud)
//   x = (lon − lon0) · c · k        y = (lat1 − lat) · k            (px de la imagen, origen arriba a la izquierda)
//   H = round((lat1 − lat0) · k)
//
// Un grado de latitud mide k px; uno de longitud, k·c px. 1 km ≈ k / 111,2 px (en latitud).
// La misma fórmula genera el relieve (build/raster.py) y las costas (build/overlay.py): un punto
// proyectado aquí cae exactamente sobre la costa dibujada.
//
// USO MÍNIMO (ver README.md):
//   <script src="../kit/icons.js"></script><script src="../kit/geo.js"></script>
//   BE.ready(async () => {
//     const map = BE.createMap(document.querySelector('.be-map'), { base: 'mediterraneo', style: 'antiguo', bounds: [19, 34.5, 37, 42] });
//     map.route(['antioquia-de-siria', 'tarso', 'derbe'], { kind: 'done' });
//     map.city('corinto', { variant: 'current' });
//   });
(function () {
  const KIT = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]*$/, '');

  // Mismos valores que maps/extents.json; H es el alto real de cada imagen.
  const EXTENTS = {
    mundo:        { lon0: -10,  lon1: 72,   lat0: 12,   lat1: 50,   phi: 35,   W: 3000, H: 1697 },
    mediterraneo: { lon0: 10,   lon1: 44,   lat0: 28,   lat1: 44,   phi: 36,   W: 4000, H: 2327 },
    israel:       { lon0: 33.9, lon1: 36.9, lat0: 29.4, lat1: 33.7, phi: 31.5, W: 2000, H: 3362 },
  };
  for (const e of Object.values(EXTENTS)) {
    e.c = Math.cos(e.phi * Math.PI / 180);
    e.k = e.W / ((e.lon1 - e.lon0) * e.c);
  }

  /** lon/lat → [x, y] en px nativos de la imagen del mapa base. */
  function project(lon, lat, base = 'mediterraneo') {
    const e = EXTENTS[base];
    return [(lon - e.lon0) * e.c * e.k, (e.lat1 - lat) * e.k];
  }
  /** [x, y] px nativos → [lon, lat]. */
  function unproject(x, y, base = 'mediterraneo') {
    const e = EXTENTS[base];
    return [e.lon0 + x / (e.c * e.k), e.lat1 - y / e.k];
  }

  // ---------- Años: numeración astronómica interna (1 a.e.c. = 0) ----------
  function fmtYear(y, opts = {}) {
    const whole = Math.floor(y + 1e-9);
    const label = whole > 0 ? `${whole} e.c.` : `${1 - whole} a.e.c.`;
    return opts.approx ? `c. ${label}` : label;
  }
  /** "607 a.e.c." → −606 ; "50 e.c." → 50 */
  function parseYear(s) {
    const m = String(s).trim().match(/^(\d+)\s*(a\.?\s*e\.?\s*c\.?|e\.?\s*c\.?)?$/i);
    if (!m) return NaN;
    const n = +m[1];
    return m[2] && /^a/i.test(m[2]) ? 1 - n : n;
  }

  // ---------- Datos ----------
  let PLACES = null, BYID = null, COUNTRIES = null;
  async function loadPlaces() {
    if (PLACES) return PLACES;
    const doc = await (await fetch(KIT + 'places.json')).json();
    PLACES = doc.lugares; BYID = new Map();
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    for (const p of PLACES) { BYID.set(p.id, p); BYID.set(norm(p.nombre), p); }
    BYID.norm = norm;
    return PLACES;
  }
  async function loadCountries() {
    if (!COUNTRIES) COUNTRIES = await (await fetch(KIT + 'maps/paises-actuales.json')).json();
    return COUNTRIES;
  }
  /** Busca un lugar por id ("antioquia-de-pisidia") o por nombre ("Antioquía de Pisidia"). */
  function place(ref) {
    if (ref && typeof ref === 'object') return ref;
    if (!BYID) throw new Error('Llama antes a BE.ready() o BE.loadPlaces()');
    const p = BYID.get(ref) || BYID.get(BYID.norm(ref));
    if (!p) throw new Error('Lugar desconocido en places.json: ' + ref);
    return p;
  }
  function lonlat(ref) {
    if (Array.isArray(ref)) return ref;
    const p = place(ref);
    if (p.lon == null) throw new Error(`"${p.nombre}" no tiene punto único (confianza ${p.confianza}); usa map.zone() con sus candidatos`);
    return [p.lon, p.lat];
  }

  // ---------- Geometría ----------
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (const q of p.slice().reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  function smoothClosed(pts) {
    const n = pts.length; let d = '';
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      if (i === 0) d += `M${p1[0].toFixed(1)},${p1[1].toFixed(1)}`;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d + 'Z';
  }
  const SVGNS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs = {}, parent) {
    const n = tag.startsWith('svg:') ? document.createElementNS(SVGNS, tag.slice(4)) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'html') n.innerHTML = v; else if (k === 'text') n.textContent = v; else n.setAttribute(k, v);
    }
    if (parent) parent.appendChild(n);
    return n;
  }

  // ---------- Mapa ----------
  /**
   * Crea un mapa dentro de `container` (normalmente .be-map).
   * opts.base   'mundo' | 'mediterraneo' | 'israel'
   * opts.style  'antiguo' | 'actual'
   * opts.bounds [lonOeste, latSur, lonEste, latNorte]  encuadre (se ajusta para cubrir el contenedor)
   * opts.fit    'cover' (por defecto, llena el contenedor) | 'contain'
   * opts.center [lon, lat] y opts.scale (px CSS por px nativo) como alternativa a bounds
   * opts.width / opts.height  tamaño si el contenedor aún no tiene medidas
   */
  function createMap(container, opts = {}) {
    const base = opts.base || 'mediterraneo';
    const e = EXTENTS[base];
    let style = opts.style || 'antiguo';
    const W = opts.width || container.clientWidth, H = opts.height || container.clientHeight;
    let s, tx, ty;
    if (opts.bounds) {
      const [w, sth, est, n] = opts.bounds;
      const [x0, y0] = project(w, n, base), [x1, y1] = project(est, sth, base);
      const sx = W / (x1 - x0), sy = H / (y1 - y0);
      s = (opts.fit === 'contain') ? Math.min(sx, sy) : Math.max(sx, sy);
      tx = W / 2 - s * (x0 + x1) / 2; ty = H / 2 - s * (y0 + y1) / 2;
    } else {
      const [cx, cy] = project(...(opts.center || [(e.lon0 + e.lon1) / 2, (e.lat0 + e.lat1) / 2]), base);
      s = opts.scale || Math.max(W / e.W, H / e.H);
      tx = W / 2 - s * cx; ty = H / 2 - s * cy;
    }
    container.classList.add('be-map', 'be-map--' + style);
    // Por encima de ~1,6 px de pantalla por px del mapa base, el relieve se ve borroso: usa otra base o un encuadre más amplio.
    if (s > 1.6) console.warn(`Mapa base '${base}' ampliado ${s.toFixed(2)}x: se verá borroso. Usa una base más detallada o un encuadre más amplio.`);
    const img = el('img', { class: 'be-map__base', alt: '', src: `${KIT}maps/${base}-${style}.webp` }, container);
    Object.assign(img.style, { width: `${e.W * s}px`, height: `${e.H * s}px`, left: `${tx}px`, top: `${ty}px` });
    const svg = el('svg:svg', { class: 'be-map__svg' }, container);
    svg.innerHTML = `<defs>
      <pattern id="be-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
        <rect width="7" height="7" fill="rgba(122,92,142,.10)"/><line x1="0" y1="0" x2="0" y2="7" stroke="rgba(122,92,142,.42)" stroke-width="1.6"/></pattern>
      <filter id="be-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.2"/></filter></defs>`;
    const gZones = el('svg:g', {}, svg), gRoutes = el('svg:g', {}, svg), gTop = el('svg:g', {}, svg);
    const html = el('div', { class: 'be-map__html' }, container);
    // Atribución obligatoria de las fuentes del mapa base (ver maps/CREDITS.md). opts.attribution: false la oculta.
    if (opts.attribution !== false) el('div', { class: 'be-attrib', html: 'Relieve: Natural Earth, USGS SRTM/GMTED2010, NOAA ETOPO1, Copernicus EU-DEM · Costas y ríos: Natural Earth' }, container);

    const api = {
      el: container, base, svg, html, scale: s,
      get style() { return style; },
      /** lon/lat → [x, y] en px CSS dentro del contenedor. */
      project(lon, lat) { const [x, y] = project(lon, lat, base); return [x * s + tx, y * s + ty]; },
      at(ref) { const [lon, lat] = lonlat(ref); return api.project(lon, lat); },
      unproject(x, y) { return unproject((x - tx) / s, (y - ty) / s, base); },
      kmToPx(km) { return km * (e.k / 111.2) * s; },
      setStyle(st) { style = st; img.src = `${KIT}maps/${base}-${st}.webp`; container.classList.remove('be-map--antiguo', 'be-map--actual'); container.classList.add('be-map--' + st); },

      /** Marcador de ciudad. opts.variant: 'major' | 'minor' | 'current' | 'visited' | 'future' | 'dest' | 'past' | 'uncertain' (o lista). */
      city(ref, o = {}) {
        const p = typeof ref === 'string' ? place(ref) : (Array.isArray(ref) ? { nombre: o.label || '', lon: ref[0], lat: ref[1] } : ref);
        const [x, y] = api.project(p.lon, p.lat);
        const variants = [].concat(o.variant || []).concat(o.side ? [o.side] : []);
        const n = el('div', { class: ['be-city', ...variants.map((v) => 'be-city--' + v)].join(' ') }, html);
        n.style.left = `${x + (o.dx || 0)}px`; n.style.top = `${y + (o.dy || 0)}px`;
        const label = o.label !== undefined ? o.label : (style === 'actual' && p.moderno ? p.moderno : p.nombre);
        const sub = o.sub !== undefined ? o.sub : (style === 'actual' && o.showAncient !== false && p.moderno ? p.nombre : '');
        n.innerHTML = `<span class="be-city__dot"></span>${label ? `<span class="be-city__label">${label}${sub ? `<small>${sub}</small>` : ''}</span>` : ''}`;
        if (o.labelDx || o.labelDy) { const l = n.querySelector('.be-city__label'); l.style.marginLeft = `${o.labelDx || 0}px`; l.style.marginTop = `${o.labelDy || 0}px`; }
        return n;
      },
      /** Etiqueta libre. kind: 'region' | 'province' | 'sea' | 'country' | 'empire'. */
      label(text, lon, lat, o = {}) {
        const [x, y] = api.project(lon, lat);
        const n = el('div', { class: `be-maplabel be-maplabel--${o.kind || 'region'}`, html: text }, html);
        n.style.left = `${x}px`; n.style.top = `${y}px`;
        if (o.rotate) n.style.transform = `translate(-50%, -50%) rotate(${o.rotate}deg)`;
        if (o.size) n.style.fontSize = `${o.size}px`;
        return n;
      },
      /**
       * Ruta por varios puntos (ids de places.json o [lon, lat]).
       * o.kind: 'done' | 'todo' | 'sea' | 'sea-todo' | 'approx' | 'letter' | 'ghost'
       * o.curve: curvatura por tramo (número o lista; 0 = recto; ± cambia el lado)
       * o.smooth: una sola curva suave por todos los puntos (útil con puntos de paso [lon, lat] en el mar)
       * o.arrows: flechas de sentido en mitad de cada tramo (por defecto true salvo 'ghost')
       * o.trim: px que se recortan en los extremos para no tapar los puntos (por defecto 7)
       */
      route(refs, o = {}) {
        const kind = o.kind || 'done';
        const pts = refs.map((r) => api.at(r));
        const g = el('svg:g', { class: 'be-routegroup' }, kind === 'letter' ? gTop : gRoutes);
        // Cada tramo es una curva cuadrática; con o.smooth, toda la ruta es una sola curva suave (Catmull-Rom).
        const ds = [];
        if (o.smooth && pts.length > 2) {
          let d = `M${pts[0][0]},${pts[0][1]}`;
          for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
            d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
          }
          ds.push(d);
        } else {
          for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i], b = pts[i + 1];
            const cv = Array.isArray(o.curve) ? (o.curve[i] || 0) : (o.curve || 0);
            const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
            const c = [(a[0] + b[0]) / 2 - dy / len * cv * len, (a[1] + b[1]) / 2 + dx / len * cv * len];
            ds.push(`M${a[0]},${a[1]} Q${c[0]},${c[1]} ${b[0]},${b[1]}`);
          }
        }
        const trim = o.trim === undefined ? 7 : o.trim;
        const casing = o.casing !== false && kind !== 'ghost';
        const arrowCls = kind.startsWith('sea') ? 'be-route-arrow be-route-arrow--sea' : kind === 'letter' ? 'be-route-arrow be-route-arrow--letter' : kind === 'approx' ? 'be-route-arrow be-route-arrow--approx' : 'be-route-arrow';
        const paths = [];
        for (const [i, d] of ds.entries()) {
          const tmp = el('svg:path', { d }, g); const L = tmp.getTotalLength();
          const t0 = i === 0 || o.trimAll ? Math.min(trim, L / 3) : 0, t1 = i === ds.length - 1 || o.trimAll ? Math.min(trim, L / 3) : 0;
          // Recorte en los extremos: se muestrea la curva entre t0 y L − t1
          const N = Math.max(8, Math.ceil(L / 5)); const P = [];
          for (let j = 0; j <= N; j++) { const q = tmp.getPointAtLength(t0 + (L - t0 - t1) * j / N); P.push([q.x, q.y]); }
          tmp.remove();
          const dd = 'M' + P.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' L');
          if (casing) el('svg:path', { d: dd, class: 'be-route be-route--casing' }, g);
          paths.push(el('svg:path', { d: dd, class: `be-route be-route--${kind}` }, g));
          if (o.arrows !== false && kind !== 'ghost' && L > 60) {
            const every = o.arrowEvery || (o.smooth ? 260 : Infinity);
            const count = Math.max(1, Math.floor(L / every));
            for (let a = 1; a <= count; a++) {
              const idx = Math.min(P.length - 2, Math.floor(P.length * a / (count + 1)));
              const m = P[idx], m2 = P[idx + 1];
              const ang = Math.atan2(m2[1] - m[1], m2[0] - m[0]) * 180 / Math.PI;
              el('svg:path', { d: 'M-5.5,-5 L6,0 L-5.5,5 L-3,0 Z', class: arrowCls, transform: `translate(${m[0].toFixed(1)},${m[1].toFixed(1)}) rotate(${ang.toFixed(1)})` }, g);
            }
          }
        }
        return { group: g, paths };
      },
      /**
       * Zona de incertidumbre. refs: lista de lugares/[lon,lat], o un id de places.json con candidatos.
       * o.padKm: margen alrededor de los candidatos (por defecto 40 km). o.label: texto de la píldora.
       * o.candidates: dibuja cada candidato como punto hueco (por defecto true).
       */
      zone(refs, o = {}) {
        let pts;
        if (typeof refs === 'string') { const p = place(refs); pts = (p.candidatos || [p]).map((c) => [c.lon, c.lat]); }
        else pts = refs.map((r) => lonlat(r));
        const P = pts.map(([lon, lat]) => api.project(lon, lat));
        const pad = api.kmToPx(o.padKm || 40);
        const ring = [];
        for (const q of P) for (let a = 0; a < 24; a++) ring.push([q[0] + pad * Math.cos(a * Math.PI / 12), q[1] + pad * Math.sin(a * Math.PI / 12)]);
        const h = hull(ring);
        const g = el('svg:g', {}, gZones);
        el('svg:path', { d: smoothClosed(h), class: 'be-zone' + (o.soft ? ' be-zone--soft' : '') }, g);
        if (o.candidates !== false) for (const q of P) el('svg:circle', { cx: q[0], cy: q[1], r: 4.5, class: 'be-zone-candidate' }, g);
        if (o.label) {
          // o.labelAt: 'top' (por defecto), 'center' o [lon, lat]
          let lx = h.reduce((a, q) => a + q[0], 0) / h.length, ly = Math.min(...h.map((q) => q[1]));
          if (o.labelAt === 'center') ly = h.reduce((a, q) => a + q[1], 0) / h.length;
          if (Array.isArray(o.labelAt)) [lx, ly] = api.project(o.labelAt[0], o.labelAt[1]);
          const n = el('div', { class: 'be-zone-label', html: o.label }, html);
          n.style.left = `${lx + (o.labelDx || 0)}px`; n.style.top = `${ly + (o.labelDy || 0)}px`;
        }
        return g;
      },
      /** Globo anclado a un punto. html: contenido. o.dx/o.dy desplazan el globo respecto al punto. */
      pop(ref, content, o = {}) {
        const [x, y] = api.at(ref);
        const n = el('div', { class: 'be-pop' + (o.below ? ' be-pop--below' : ''), html: content }, html);
        if (o.width) n.style.width = `${o.width}px`;
        n.style.left = `${x - 31 + (o.dx || 0)}px`;
        if (o.below) n.style.top = `${y + 16 + (o.dy || 0)}px`;
        else n.style.bottom = `${container.clientHeight - y + 16 - (o.dy || 0)}px`;
        return n;
      },
      /** Nombres de países actuales (Natural Earth). o.maxRank: 1.7 (sólo grandes) … 6 (todos). */
      countries(o = {}) {
        for (const c of COUNTRIES || []) {
          if (c.min_label > (o.maxRank || 4)) continue;
          const [x, y] = api.project(c.lon, c.lat);
          if (x < 30 || y < 20 || x > container.clientWidth - 30 || y > container.clientHeight - 20) continue;
          if (o.skip && o.skip.includes(c.nombre)) continue;
          api.label(c.nombre, c.lon, c.lat, { kind: 'country' });
        }
      },
      /** Barra de escala: devuelve un elemento .be-scalebar para colocarlo donde quieras. */
      scaleBar(targetPx = 120) {
        const km = targetPx / api.kmToPx(1);
        const nice = [10, 20, 25, 50, 100, 200, 250, 500, 1000].reduce((b, v) => (v <= km ? v : b), 10);
        const n = el('div', { class: 'be-scalebar be-float' });
        n.innerHTML = `${nice} km<div class="be-scalebar__bar" style="width:${api.kmToPx(nice).toFixed(0)}px"></div>`;
        return n;
      },
      /** Cortina: muestra el otro estilo a la derecha de `fraction` (0–1) del ancho. */
      curtain(fraction = 0.5, o = {}) {
        const other = style === 'antiguo' ? 'actual' : 'antiguo';
        const X = W * fraction;
        const wrap = el('div', {}, container);
        Object.assign(wrap.style, { position: 'absolute', top: 0, bottom: 0, left: `${X}px`, right: 0, overflow: 'hidden', zIndex: 0 });
        container.insertBefore(wrap, svg);
        const img2 = el('img', { class: 'be-map__base', alt: '', src: `${KIT}maps/${base}-${other}.webp` }, wrap);
        Object.assign(img2.style, { width: `${e.W * s}px`, height: `${e.H * s}px`, left: `${tx - X}px`, top: `${ty}px` });
        const bar = el('div', { class: 'be-curtain', html: `<div class="be-curtain__handle"><i data-icon="curtain"></i></div>` }, container);
        bar.style.left = `${X}px`;
        if (o.leftLabel) { const t = el('div', { class: 'be-curtain__tag', html: o.leftLabel }, bar); t.style.right = '12px'; }
        if (o.rightLabel) { const t = el('div', { class: 'be-curtain__tag', html: o.rightLabel }, bar); t.style.left = '12px'; }
        return bar;
      },
    };
    return api;
  }

  // ---------- Línea de tiempo ----------
  /**
   * Pinta una línea de tiempo con carriles dentro de `container` (.be-timeline).
   * cfg.from / cfg.to  años astronómicos (admite decimales: 50.75 ≈ otoño del 50)
   * cfg.cursor         año del cursor; cfg.cursorLabel texto de la bandera
   * cfg.tick / cfg.minor  paso de marcas mayores / menores en años
   * cfg.bar            HTML de la barra de controles (reproducción, zoom…)
   * cfg.lanes          [{ label, color, icon, items: [{ from, to, label, color, fuzzy: 'start'|'end'|'both', soft, active } | { at, label }] }]
   * cfg.uncertain      [{ from, to }] franjas rayadas de fechas inciertas
   */
  /** Barra de controles por defecto: reproducción, velocidad, escala de zoom y cronología. */
  function defaultBar(cfg) {
    const zoom = cfg.zoomLevel || 'Años';
    return `<div class="be-play"><span class="be-play__btn"><i data-icon="rewind"></i></span><span class="be-play__btn"><i data-icon="step-back"></i></span>
      <span class="be-play__main"><i data-icon="play"></i></span><span class="be-play__btn"><i data-icon="step-forward"></i></span></div>
      <span class="be-speed">${cfg.speed || '1 mes por segundo'}</span>
      <span class="be-zoomscale">${['Milenios', 'Siglos', 'Décadas', 'Años', 'Meses', 'Semanas'].map((z) => `<span${z === zoom ? ' class="on"' : ''}>${z}</span>`).join('')}</span>
      <span class="be-spacer"></span>
      <span class="be-chrono be-chrono--tnm"><i class="be-i be-i--sm" data-icon="book"></i>Cronología TNM</span>`;
  }

  function timeline(container, cfg) {
    container.classList.add('be-timeline'); if (cfg.bar === false) container.classList.add('be-timeline--nobar');
    const span = cfg.to - cfg.from;
    const pct = (y) => `${((y - cfg.from) / span * 100).toFixed(3)}%`;
    const lanesH = cfg.lanes.map((l) => `<div class="be-lane-label">${l.icon ? `<i class="be-i be-i--sm" data-icon="${l.icon}" style="color:${l.color || 'inherit'}"></i>` : `<span class="be-chip__dot" style="background:${l.color || 'var(--ink-3)'};border-radius:50%;width:9px;height:9px;display:inline-block"></span>`}${l.label}</div>`).join('');
    let ticks = '', grid = '';
    const first = Math.ceil(cfg.from / cfg.tick) * cfg.tick;
    // cfg.roundBCE: las marcas a.e.c. caen en años redondos para el lector (630 a.e.c. = año astronómico −629)
    const sh = (y) => (cfg.roundBCE && y <= 0 ? y + 1 : y);
    for (let y = first; y <= cfg.to + 1e-9; y += cfg.tick) {
      if (sh(y) > cfg.to + 1e-9) continue;
      ticks += `<div class="be-tick" style="left:${pct(sh(y))}"><span>${cfg.fmt ? cfg.fmt(sh(y)) : fmtYear(sh(y))}</span></div>`;
      grid += `<div class="be-gridline" style="left:${pct(sh(y))}"></div>`;
    }
    if (cfg.minor) for (let y = Math.ceil(cfg.from / cfg.minor) * cfg.minor; y <= cfg.to; y += cfg.minor) {
      if (Math.abs(y / cfg.tick - Math.round(y / cfg.tick)) > 1e-6 && sh(y) <= cfg.to) ticks += `<div class="be-tick be-tick--minor" style="left:${pct(sh(y))}"></div>`;
    }
    const unc = (cfg.uncertain || []).map((u) => `<div class="be-uncertain-band" style="left:${pct(u.from)};width:${((u.to - u.from) / span * 100).toFixed(3)}%"></div>`).join('');
    const lanes = cfg.lanes.map((l) => `<div class="be-lane">${(l.items || []).map((it) => {
      if (it.at !== undefined) return `<div class="be-point" style="left:${pct(it.at)};${it.color ? `background:${it.color}` : ''}"></div>${it.label ? `<div class="be-point-label${it.labelLeft ? ' be-point-label--left' : ''}" style="left:${pct(it.at)}">${it.label}</div>` : ''}`;
      const cls = ['be-span'];
      if (it.fuzzy === 'start' || it.fuzzy === 'both') cls.push('be-span--fuzzy-start');
      if (it.fuzzy === 'end' || it.fuzzy === 'both') cls.push('be-span--fuzzy-end');
      if (it.soft) cls.push('be-span--soft');
      if (it.active) cls.push('be-span--active');
      const col = it.color || l.color || 'var(--ink-3)';
      // Tramos que empiezan antes del rango visible: se recortan para que la etiqueta se vea
      if (it.from < cfg.from) { it = { ...it, from: cfg.from }; cls.push('be-span--clipped'); }
      if (it.to > cfg.to) it = { ...it, to: cfg.to };
      return `<div class="${cls.join(' ')}" style="left:${pct(it.from)};width:${((it.to - it.from) / span * 100).toFixed(3)}%;${it.soft ? `color:${col}` : `background:${col}`}" title="${it.label || ''}">${it.label || ''}</div>`;
    }).join('')}</div>`).join('');
    container.innerHTML = `
      ${cfg.bar === false ? '' : `<div class="be-timeline__bar">${cfg.bar || defaultBar(cfg)}</div>`}
      <div class="be-timeline__labels"><div style="height:26px;border-bottom:1px solid var(--line)"></div>${lanesH}</div>
      <div class="be-timeline__track">
        <div class="be-axis">${ticks}</div>${grid}${unc}
        <div class="be-lanes">${lanes}</div>
        ${cfg.cursor !== undefined ? `<div class="be-cursor" style="left:${pct(cfg.cursor)}"><div class="be-cursor__flag">${cfg.cursorLabel || fmtYear(cfg.cursor)}</div></div>` : ''}
      </div>`;
    if (window.BE_hydrateIcons) window.BE_hydrateIcons(container);
    // Oculta las etiquetas del eje que quedan bajo la bandera del cursor
    const flag = container.querySelector('.be-cursor__flag');
    if (flag) {
      const fr = flag.getBoundingClientRect();
      container.querySelectorAll('.be-tick span').forEach((t) => {
        const r = t.getBoundingClientRect();
        if (r.right > fr.left - 4 && r.left < fr.right + 4) t.style.visibility = 'hidden';
      });
    }
    return container;
  }

  /** Espera datos y fuentes, ejecuta fn y avisa al renderizador (window.MOCKUP_READY). */
  async function ready(fn) {
    window.MOCKUP_READY = false;
    try {
      if (document.readyState === 'loading') await new Promise((r) => document.addEventListener('DOMContentLoaded', r));
      await Promise.all([loadPlaces(), loadCountries(), document.fonts.ready]);
      if (fn) await fn();
      if (window.BE_hydrateIcons) window.BE_hydrateIcons();
      await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })));
    } catch (err) {
      console.error(err);
      document.body.insertAdjacentHTML('beforeend', `<pre style="position:fixed;left:8px;bottom:8px;z-index:99;background:#fff0f0;color:#900;padding:8px;font:12px monospace;border:1px solid #d99">${String(err.stack || err)}</pre>`);
    } finally {
      window.MOCKUP_READY = true;
    }
  }

  window.BE = { KIT, EXTENTS, project, unproject, fmtYear, parseYear, loadPlaces, loadCountries, place, lonlat, createMap, timeline, ready, hull };
})();
