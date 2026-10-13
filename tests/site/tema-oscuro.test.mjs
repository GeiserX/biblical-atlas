// The dark look (meeting mode, .be-reunion on <html>) walked surface by surface: every element of every surface is read
// twice in the same page, dark and then light (the class toggled with transitions frozen), and the guard fails on what
// the dark look left with a light-theme value. Run from the root of the repository, after `python3 scripts/build.py`:
//
//   PLAYWRIGHT_CORE=/tmp/pw/node_modules/playwright-core node --test --test-concurrency=1 tests/site/tema-oscuro.test.mjs
//
// What it flags, in the dark look (each rule is `check` below):
//   - fondo-claro: a background that stays light and is the very value of the light look (a hardcoded colour).
//   - contraste: text under 4.5:1 (3:1 when large) over what is painted under it, composited; over the map, the worse of
//     a light and a black map. A label on the map is measured over its own halo.
//   - borde-claro: a border that keeps a light value of the light look while what is under it turned dark (a white ring
//     on a dark page; a white glyph on a coloured node that keeps its colour is not one).
//   - halo-claro: a text or box shadow that keeps a light value of the light look (a white glow or ring).
//   - desaparece: a border or an SVG shape that stood out in the light look and melts into the dark background.
// BE_TEMA_REPORT=<file> writes every finding, allowed or not, one JSON line each. BE_TEMA_SHOTS=<dir> saves a capture of
// every surface in the dark look and in the light one. BE_SITE_DIR=<dir> tests another copy of the site.
// What is under an element is read from the paint order at its centre (elementsFromPoint, with pointer events forced on),
// so a sibling painted below it counts: the flag under the date of the timeline cursor, the bar under a name. An element
// off screen or covered by another falls back to its ancestors.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SITE_DIR = path.resolve(process.env.BE_SITE_DIR || path.join(ROOT, 'site'));
const REPORT = process.env.BE_TEMA_REPORT || '';
const SHOTS = process.env.BE_TEMA_SHOTS || '';
const SCREENS = {
  1440: { viewport: { width: 1440, height: 900 } },
  430: { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true },
};

/** What the guard lets pass, each with its reason: `rule` is the rule, `sel` a CSS selector the element matches. */
const ALLOW = [
  { rule: 'borde-claro', sel: '.cortina',
    reason: 'the line of the curtain splits two maps: it has to stay light over both, in either look, to be seen at all' },
];

// ---------------------------------------------------------------------------
// Browser and server
// ---------------------------------------------------------------------------
function requireFrom() {
  const dirs = [process.env.PLAYWRIGHT_MODULE_DIR, process.env.PLAYWRIGHT_CORE && path.dirname(path.resolve(process.env.PLAYWRIGHT_CORE))].filter(Boolean);
  const reqs = dirs.map((d) => createRequire(path.join(path.resolve(d), 'index.js')));
  reqs.push(createRequire(import.meta.url));
  return (name) => {
    for (const r of reqs) { try { return r(name); } catch { /* next */ } }
    throw new Error(`${name} not found: set PLAYWRIGHT_CORE or PLAYWRIGHT_MODULE_DIR`);
  };
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
function serve(dir) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(dir, rel.endsWith('/') ? `${rel}index.html` : rel);
    if (!file.startsWith(dir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

let browser, server, base;
before(async () => {
  if (!fs.existsSync(path.join(SITE_DIR, 'data.json'))) throw new Error(`${SITE_DIR}/data.json is missing: run python3 scripts/build.py first`);
  const { chromium } = requireFrom()('playwright-core');
  server = await serve(SITE_DIR);
  base = `http://127.0.0.1:${server.address().port}/`;
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  try { browser = await chromium.launch({ headless: true, args }); }
  catch { browser = await chromium.launch({ headless: true, args, channel: 'chrome' }); }
  if (REPORT) fs.writeFileSync(REPORT, '');
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
});
after(async () => { await browser?.close(); server?.close(); });

// ---------------------------------------------------------------------------
// The surfaces
// ---------------------------------------------------------------------------
async function settle(page) {
  await page.waitForFunction(() => window.BE?.D && window.__be, null, { timeout: 60000 });
  await page.waitForFunction(() => { const m = window.__be.map; return !m || (m.loaded() && !m.isMoving()); }, null, { timeout: 60000 }).catch(() => {});
  await page.waitForFunction(() => !document.querySelector('#panel-cuerpo [aria-busy="true"]'), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
}
const app = (hash, then) => async (page, screen) => {
  await page.goto(`${base}index.html${hash ? `#${hash}` : ''}`, { waitUntil: 'domcontentloaded' });
  await settle(page);
  if (then) { await then(page, screen); await settle(page); }
};
const plain = (file, then) => async (page) => {
  await page.goto(`${base}${file}`, { waitUntil: 'load' });
  await page.waitForFunction(() => !document.querySelector('.cal-cargando'), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(300);
  if (then) await then(page);
};
const press = (page, screen, sel) => (screen === '430' ? page.locator(sel).first().tap() : page.locator(sel).first().click());
const T = 't=50.3000';
const TOUR = 'sel=recorrido:cartas-y-ciudades';
const SURFACES = [
  { name: 'portada', open: app('') },
  { name: 'mapa', open: app(T) },
  { name: 'mapa con la leyenda', open: app(`sel=viaje:segundo-viaje&${T}`, async (p, s) => { if (s === '430') await press(p, s, '#leyenda-boton'); }) },
  { name: 'mapa actual', open: app(`sel=lugar:corinto&${T}`, (p, s) => press(p, s, '.modos [data-mapa="actual"]')) },
  { name: 'capas y filtros', open: app(T, (p, s) => press(p, s, '#capas-boton')) },
  { name: 'nombres del encuadre', open: app(`sel=lugar:corinto&${T}`, (p, s) => press(p, s, '#nombres-boton')) },
  { name: 'menú de la línea', open: app(T, (p, s) => press(p, s, '#linea-menu-boton')) },
  { name: 'fuentes de un dato', open: app(`sel=lugar:corinto&${T}`, (p, s) => press(p, s, '#panel-cuerpo details.insignia summary')) },
  { name: 'cortina', screens: ['1440'], open: app(`sel=lugar:corinto&${T}`, (p, s) => press(p, s, '.modos [data-mapa="cortina"]')) },
  { name: 'ficha de lugar', open: app(`sel=lugar:corinto&${T}`) },
  { name: 'ficha de lugar incierto', open: app('sel=lugar:abel-mehola') },
  { name: 'ficha de persona', open: app(`sel=persona:pablo&${T}`) },
  { name: 'ficha de suceso', open: app('sel=evento:lidia-se-bautiza') },
  { name: 'ficha de capítulo', open: app('sel=pasaje:hch-16') },
  { name: 'ficha de carta', open: app('sel=carta:1-tesalonicenses&cartas=todas') },
  { name: 'ficha de periodo', open: app('sel=periodo:los-patriarcas') },
  { name: 'ficha de hallazgo', open: app('sel=hallazgo:cilindro-de-ciro') },
  { name: 'recorrido', open: app(TOUR) },
  { name: 'recorrido abierto', screens: ['430'], open: app(TOUR, (p) => p.locator('[data-recorrido-abrir]').click()) },
  { name: 'búsqueda', open: app(T, async (p) => {
    await p.evaluate(() => document.querySelector('#q').focus());
    await p.keyboard.type('Pablo', { delay: 10 });
    await p.waitForFunction(() => document.querySelectorAll('#resultados [role="option"]').length > 2, null, { timeout: 10000 });
  }) },
  { name: 'línea en milenios', open: app('sel=viaje:segundo-viaje&t=50.3000&v=4125&linea=grande') },
  { name: 'línea en décadas', open: app('sel=viaje:segundo-viaje&t=50.3000&v=40&linea=grande') },
  { name: 'línea en meses', open: app('sel=viaje:segundo-viaje&t=50.3000&v=1.5&linea=grande') },
  { name: 'sobre las fechas', screens: ['1440'], open: app(T, (p) => p.locator('#fechas-boton').click()) },
  { name: 'elegir fecha', open: app(T, (p, s) => press(p, s, '#fecha')) },
  { name: 'modo lectura', open: app('leer=hch-16') },
  { name: 'grafo', open: app(`grafo=pablo&${T}`, async (p) => {
    await p.locator('#vista-grafo .gnodo').nth(1).hover().catch(() => {});
  }) },
  { name: 'conexión', open: app(`sel=persona:pablo&${T}`, (p) => p.evaluate(() => window.BE.conexion.abrir('persona:pablo', 'persona:pedro'))) },
  { name: 'menú estudio', open: app(`sel=persona:pablo&${T}`, (p, s) => press(p, s, '#estudio-boton')) },
  { name: 'editor de notas', expect: '#note-editor[open]', open: app(`sel=persona:pablo&${T}`, (p, s) => press(p, s, '#panel-cuerpo .note-pencil')) },
  { name: 'mis notas', expect: '#notes-list[open]', open: app(`sel=persona:pablo&${T}`, async (p, s) => {
    await press(p, s, '#panel-cuerpo .note-pencil');
    await p.locator('#note-editor textarea').fill('Una nota de prueba');
    await p.locator('#note-editor button[type="submit"]').click();
    await press(p, s, '#estudio-boton');
    await press(p, s, '[data-menu="notas"]');
    await p.locator('#notes-list').waitFor({ state: 'visible' });
  }) },
  // The «new version» notice, with the markup js/offline.js gives it: without a service worker it never shows by itself.
  { name: 'aviso de versión nueva', open: app(T, (p) => p.evaluate(() => {
    const box = document.createElement('div');
    box.id = 'nueva-version'; box.className = 'nueva-version'; box.setAttribute('role', 'status');
    box.innerHTML = '<span>Hay una versión nueva del atlas.</span><button type="button" class="be-btn be-btn--sm be-btn--primary">Recargar</button>'
      + '<button type="button" class="be-btn be-btn--sm be-btn--ghost be-btn--icon" aria-label="Más tarde"><svg class="be-i be-i--sm" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>';
    document.body.append(box);
  })) },
  // The language switch stays hidden until the English site is launched: the flag the language tests set shows it, in
  // the bar, in the Estudio menu and on the landing, with the line of a card not yet translated.
  { name: 'cambio de idioma', launched: true, open: app(`sel=evento:lidia-se-bautiza&${T}`, async (p, s) => {
    if (s === '430') { await press(p, s, '#estudio-boton'); await p.locator('[data-idioma]').waitFor({ state: 'visible' }); }
  }) },
  { name: 'cambio de idioma en la portada', launched: true, open: app('') },
  { name: 'ficha sin traducir', launched: true, open: async (page) => {
    await page.goto(`${base}index.html?lang=en#sel=evento:lidia-se-bautiza&${T}`, { waitUntil: 'domcontentloaded' });
    await settle(page);
  } },
  // The credits of the map: folded into a button on the phone, open by a press.
  { name: 'créditos del mapa', open: app(T, async (p, s) => {
    if (s === '430') await press(p, s, '.maplibregl-ctrl-attrib-button');
  }) },
  { name: 'calendario', page: true, open: plain('calendario.html') },
  { name: 'acerca de', page: true, open: plain('acerca.html#gracias') },
];

// ---------------------------------------------------------------------------
// The audit, in the page
// ---------------------------------------------------------------------------
/** Reads every visible element dark and light and returns what `check` flags. Runs in the page. */
function audit({ allow }) {
  const root = document.documentElement;
  const parse = (c) => {
    if (!c) return null;
    let m = /^rgba?\(([^)]+)\)$/.exec(c);
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p[3] ?? 1]; }
    m = /^color\(srgb ([^)]+)\)$/.exec(c);
    if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] ?? 1]; }
    return null;
  };
  const colours = (s) => (s && s !== 'none' ? (s.match(/(rgba?\([^)]*\)|color\(srgb [^)]*\))/g) || []).map(parse).filter(Boolean) : []);
  const over = (a, b) => { const al = a[3] + b[3] * (1 - a[3]); return al ? [0, 1, 2].map((i) => (a[i] * a[3] + b[i] * b[3] * (1 - a[3])) / al).concat(al) : [0, 0, 0, 0]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = (c) => (c ? `#${c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}${c[3] < 1 ? `/${Math.round(c[3] * 100) / 100}` : ''}` : '');
  const canvas = document.querySelector('#mapa-gl canvas');
  const GEOM = new Set(['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'text', 'tspan']);
  const LIGHT = 0.4;   // a background or a line this luminous reads as light on the dark page (#efe7d8 is 0.8, #3a3328 0.03)

  const freeze = document.createElement('style');
  freeze.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; pointer-events: auto !important; }';
  document.head.append(freeze);
  // What a modal dialog leaves behind is inert under its backdrop: the same surface without the dialog audits it.
  const modal = document.querySelector('dialog:modal');
  const els = [...document.querySelectorAll('body *')].filter((el) => !el.closest('defs, mask, clipPath, pattern, symbol, .hoja-impresion, script, style, template, [inert]')
    && (!modal || modal.contains(el))
    && el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && (el.getBoundingClientRect().width > 0 || el.getBoundingClientRect().height > 0));
  const read = (el, pseudo) => {
    const s = getComputedStyle(el, pseudo);
    if (pseudo && (s.content === 'none' || s.content === 'normal' || s.display === 'none')) return null;
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map((k) => ({ w: parseFloat(s[`border${k}Width`]), st: s[`border${k}Style`], c: s[`border${k}Color`] }));
    return { bg: s.backgroundColor, img: s.backgroundImage, filter: s.filter, content: pseudo ? s.content : '', color: s.color, fill: s.fill, stroke: s.stroke, sw: parseFloat(s.strokeWidth),
      ts: s.textShadow, bs: s.boxShadow, op: parseFloat(s.opacity), size: parseFloat(s.fontSize), weight: parseInt(s.fontWeight, 10),
      border: sides.filter((b) => b.w >= 1 && b.st !== 'none' && b.st !== 'hidden').map((b) => b.c) };
  };
  const snap = () => els.map((el) => ({ el: read(el), before: read(el, '::before'), after: read(el, '::after') }));
  const dark = snap();
  root.classList.remove('be-reunion');
  const light = snap();
  root.classList.add('be-reunion');

  const index = new Map(els.map((el, i) => [el, i]));
  /** The layers under an element, top first, down to the first opaque one: from the paint order at its centre, or from
      its ancestors when the centre is off screen or something else covers it. `own` counts the element's own background
      (and a ::before or ::after that covers it, the shape of a node). `snap` is the look whose colours are read. */
  const isShape = (n) => n instanceof SVGGeometryElement && !/^(text|tspan|line|polyline)$/.test(n.tagName.toLowerCase());
  const bgOf = (n, snap) => { const i = index.get(n); return i === undefined ? { bg: getComputedStyle(n).backgroundColor, img: getComputedStyle(n).backgroundImage } : snap[i].el; };
  const coverOf = (n, snap) => {
    const i = index.get(n);
    if (i === undefined) return [];
    const box = n.getBoundingClientRect();
    return ['after', 'before'].map((k) => [k, snap[i][k]]).filter(([k, p]) => {
      if (!p) return false;
      const s = getComputedStyle(n, `::${k}`);
      return s.position === 'absolute' && parseFloat(s.width) >= box.width * 0.8 && parseFloat(s.height) >= box.height * 0.8;
    }).map(([, p]) => p);
  };
  const stackOf = (el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return null;
    const stack = document.elementsFromPoint(x, y);
    const at = stack.indexOf(el);
    return at < 0 ? null : { stack, at, x, y };
  };
  const bottoms = (el, own, snap = dark) => {
    const layers = [];
    const take = (n, withCover) => {
      if (getComputedStyle(n).opacity === '0') return null;
      if (canvas && (n === canvas || (n !== el && n.contains(canvas)))) return { layers, map: true };
      if (isShape(n)) {
        const s = getComputedStyle(n);
        const f = parse(index.has(n) ? snap[index.get(n)].el.fill : s.fill);
        if (f && f[3] > 0) { const a = f[3] * parseFloat(s.fillOpacity); layers.push([f[0], f[1], f[2], a]); if (a >= 1) return { layers }; }
        return null;
      }
      if (n instanceof SVGElement && n.tagName.toLowerCase() !== 'svg') return null;
      for (const p of withCover ? coverOf(n, snap) : []) {
        const c = parse(p.bg);
        if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) return { layers }; }
      }
      const { bg, img } = bgOf(n, snap);
      if (img && img !== 'none' && !img.startsWith('url(')) return { layers, gradient: true };
      const c = parse(bg);
      if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) return { layers }; }
      return null;
    };
    const hit = stackOf(el);
    if (hit) {
      for (let k = own ? hit.at : hit.at + 1; k < hit.stack.length; k++) {
        const done = take(hit.stack[k], own && k === hit.at);
        if (done) return done;
      }
      return { layers, page: true };
    }
    // Off screen or clipped by a scroll box (a row of the timeline below its fold): the ancestors, and at each level the
    // earlier siblings that cover the centre, painted below it (the bar under the name of a mark).
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const covers = (n) => { const b = n.getBoundingClientRect(); return b.width > 0 && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom; };
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (n !== el || own) { const done = take(n, own && n === el); if (done) return done; }
      for (let s = n.previousElementSibling; s; s = s.previousElementSibling) {
        if (!covers(s) || !s.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
        const done = take(s, false);
        if (done) return done;
      }
    }
    return { layers, page: true };
  };
  const pageOf = (snap) => parse(bgOf(document.body, snap).bg) || parse(bgOf(root, snap).bg);
  /** The background colours the element may sit on: one when something opaque is under it, two over the map. */
  const under = (el, own, snap = dark) => {
    const b = bottoms(el, own, snap);
    if (b.gradient) return { map: false, colours: [] };
    const page = pageOf(snap);
    const basis = b.layers.length && b.layers[b.layers.length - 1][3] >= 1 ? [b.layers.pop()]
      : b.map ? [[200, 200, 200, 1], [0, 0, 0, 1]] : [page && page[3] >= 1 ? page : snap === dark ? [27, 24, 19, 1] : [255, 255, 255, 1]];
    return { map: !!b.map, colours: basis.map((x) => b.layers.reduceRight((acc, l) => over(l, acc), x)) };
  };
  /** True when an SVG shape's fill paints something: an open path or a line has a fill that covers nothing. */
  const paintsFill = (el) => {
    if (!(el instanceof SVGGeometryElement) || /^(text|tspan)$/.test(el.tagName.toLowerCase())) return true;
    if (el.tagName.toLowerCase() === 'line') return false;
    const b = el.getBBox();
    if (b.width < 0.5 || b.height < 0.5) return false;
    for (let i = 1; i < 6; i++) for (let j = 1; j < 6; j++) if (el.isPointInFill(new DOMPoint(b.x + (b.width * i) / 6, b.y + (b.height * j) / 6))) return true;
    return false;
  };
  const name = (el) => {
    const bits = [];
    for (let n = el; n && n !== document.body && bits.length < 3; n = n.parentElement) {
      const cls = typeof n.className === 'string' ? n.className.trim().split(/\s+/).filter(Boolean).slice(0, 3) : (n.className?.baseVal || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
      bits.unshift(`${n.tagName.toLowerCase()}${n.id ? `#${n.id}` : ''}${cls.map((c) => `.${c}`).join('')}`);
      if (n.id) break;
    }
    return bits.join(' > ');
  };
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.textContent));
  const isSvg = (el) => el instanceof SVGElement;
  const found = [];
  const flag = (el, part, rule, what) => {
    const allowed = allow.some((a) => a.rule === rule && el.matches(a.sel));
    found.push({ rule, target: name(el) + (part ? `::${part}` : ''), what, allowed, text: (el.textContent || '').trim().slice(0, 40) });
  };
  const opacity = (el) => { let a = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) a *= parseFloat(getComputedStyle(n).opacity); return a; };

  els.forEach((el, i) => {
    for (const part of ['el', 'before', 'after']) {
      const d = dark[i][part], l = light[i][part];
      if (!d) continue;
      const tag = part === 'el' ? '' : part;
      const svg = isSvg(el);
      // Backgrounds (HTML only: an SVG element has none). A picture (a url() background) or anything under a filter (the
      // relief of the landing, dimmed by brightness()) is not a flat colour: it is left to the captures.
      const bg = parse(d.bg);
      const filtered = (() => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const j = index.get(n); if ((j === undefined ? getComputedStyle(n).filter : dark[j].el.filter) !== 'none') return true; } return false; })();
      if (!svg && bg && bg[3] >= 0.35 && !d.img.startsWith('url(') && !filtered) {
        const seen = under(el, false).colours.map((u) => over(bg, u));
        const lightest = seen.reduce((m, c) => Math.max(m, lum(c)), 0);
        if (seen.length && lightest > LIGHT && Math.min(...seen.map(lum)) > LIGHT * 0.5 && l && d.bg === l.bg) {
          flag(el, tag, 'fondo-claro', `fondo ${hex(bg)}, el mismo que en claro`);
        }
      }
      // Borders: a light one kept from the light look; one that melts into the dark background.
      d.border.forEach((c, k) => {
        const bc = parse(c);
        if (!bc || bc[3] < 0.3) return;
        const lc = l?.border[k];
        if (lc === c && lum(bc) > LIGHT * 1.5) {
          // Light in both looks: wrong only where what is under it turned dark (the page, a card, the map).
          const nowU = under(el, false), thenU = under(el, false, light);
          const turned = nowU.map || nowU.colours.some((u, j) => thenU.colours[j] && lum(thenU.colours[j]) - lum(u) > 0.1);
          if (turned) flag(el, tag, 'borde-claro', `borde ${hex(bc)}, el mismo que en claro`);
          return;
        }
        if (lc !== c || svg) return;
        const around = under(el, false).colours;
        if (around.length && around.every((u) => ratio(over(bc, u), u) < 1.1)) flag(el, tag, 'desaparece', `borde ${hex(bc)} sobre ${hex(around[0])}`);
      });
      // Shadows that keep a light colour of the light look: a white glow or ring.
      for (const k of ['ts', 'bs']) {
        if (!l || d[k] !== l[k]) continue;
        const lit = colours(d[k]).find((c) => c[3] >= 0.5 && lum(c) > 0.7);
        if (lit) flag(el, tag, 'halo-claro', `${k === 'ts' ? 'sombra del texto' : 'sombra'} ${hex(lit)}, la misma que en claro`);
      }
      if (part !== 'el') {
        // The text of a ::before or ::after (a number in a badge), over its own background.
        const said = /^"(.*)"$/.exec(d.content || '');
        const pfg = parse(d.color), pbg = parse(d.bg);
        if (!said || !/[\p{L}\p{N}]/u.test(said[1]) || !pfg || el.closest('[disabled], [aria-disabled="true"], .atenuado, .sr-only')) continue;
        const backs = under(el, true).colours.map((u) => (pbg && pbg[3] > 0 ? over(pbg, u) : u));
        if (!backs.length) continue;
        const worst = Math.min(...backs.map((b) => ratio(over(pfg, b), b)));
        if (worst < 4.5 - 0.005) flag(el, tag, 'contraste', `${Math.round(worst * 100) / 100}:1 (pide 4.5:1), texto ${hex(pfg)} sobre ${hex(backs[0])}`);
        continue;
      }
      // SVG shapes: a fill or a stroke kept from the light look that the dark background swallows.
      if (svg && GEOM.has(el.tagName.toLowerCase())) {
        for (const k of ['fill', 'stroke']) {
          const c = parse(d[k]);
          if (!c || c[3] < 0.3 || !l || l[k] !== d[k] || (k === 'stroke' && !(d.sw > 0)) || (k === 'fill' && !paintsFill(el))) continue;
          const around = under(el, false).colours;
          if (around.length && around.every((u) => ratio(over(c, u), u) < 1.35)) flag(el, tag, 'desaparece', `${k === 'fill' ? 'relleno' : 'trazo'} ${hex(c)} sobre ${hex(around[0])}`);
        }
      }
      // Text contrast: HTML text of its own, and SVG text, over what is under it. A label of the map, over its halo.
      const text = svg ? /^(text|tspan)$/.test(el.tagName.toLowerCase()) && /[\p{L}\p{N}]/u.test(el.textContent) : ownText(el);
      if (!text || el.closest('[disabled], [aria-disabled="true"], .atenuado, .sr-only')) continue;
      let fg = parse(svg ? d.fill : d.color);
      if (!fg) continue;
      fg = [fg[0], fg[1], fg[2], fg[3] * opacity(el)];
      // A text drawn with a halo (two or more glows with no offset, the names on the map and on the landing's small
      // maps) is read over its halo, the colour it was drawn to sit on.
      const glows = (d.ts.match(/(rgba?\([^)]*\)|color\(srgb [^)]*\)) 0px 0px/g) || []).map((g) => parse(g.replace(/ 0px 0px$/, ''))).filter((c) => c && c[3] >= 0.5);
      const halo = glows.length >= (el.closest('.maplibregl-marker') ? 1 : 2) && glows[0];
      if (el.closest('.maplibregl-marker') && !halo) continue;   // a name drawn over the map with no halo: nothing to measure
      const backs = halo ? [over(halo, [0, 0, 0, 1])] : under(el, true).colours;
      if (!backs.length) continue;
      const worst = Math.min(...backs.map((b) => ratio(over(fg, b), b)));
      const need = d.size >= 24 || (d.weight >= 700 && d.size >= 18.66) ? 3 : 4.5;
      if (worst < need - 0.005) flag(el, '', 'contraste', `${Math.round(worst * 100) / 100}:1 (pide ${need}:1), texto ${hex(fg)} sobre ${hex(backs[0])}`);
    }
  });
  freeze.remove();
  return { found, checked: els.length };
}

/** Opens a surface in the dark look and audits it. */
async function walk(surface, screen, extra) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...SCREENS[screen], reducedMotion: 'reduce' });
  context.setDefaultTimeout(15000);
  context.setDefaultNavigationTimeout(60000);
  await context.addInitScript(() => { try { localStorage.setItem('biblical-atlas:pref:reunion', '1'); } catch { /* none */ } });
  if (surface.launched) await context.addInitScript(() => { window.BE_LANGUAGE_LAUNCHED = true; });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route((u) => !u.href.startsWith(base) && !u.hostname.endsWith('unpkg.com'), (r) => r.abort());
  try {
    await surface.open(page, screen);
    // A modal dialog makes the audit read only the dialog: the surface has to show it was the one that opened.
    if (surface.expect) await page.locator(surface.expect).waitFor({ state: 'visible', timeout: 10000 });
    if (extra) await page.addStyleTag({ content: extra });
    const dark = await page.evaluate(() => document.documentElement.classList.contains('be-reunion'));
    const result = await page.evaluate(audit, { allow: ALLOW });
    if (SHOTS) {
      const file = `${surface.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\W+/g, '-')}-${screen}`;
      await page.screenshot({ path: path.join(SHOTS, `${file}-oscuro.png`) });
      await page.evaluate(() => document.documentElement.classList.remove('be-reunion'));
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(SHOTS, `${file}-claro.png`) });
    }
    return { ...result, dark, errors };
  } finally {
    await context.close();
  }
}

for (const surface of SURFACES) {
  for (const screen of surface.screens || Object.keys(SCREENS)) {
    test(`the dark look keeps no light-theme colour: ${surface.name} at ${screen}`, { timeout: 180000 }, async () => {
      const { found, checked, dark, errors } = await walk(surface, screen);
      if (REPORT) for (const f of found) fs.appendFileSync(REPORT, `${JSON.stringify({ surface: surface.name, screen, ...f })}\n`);
      assert.ok(dark, `${surface.name} did not open in the dark look with the stored preference`);
      assert.ok(checked > (surface.expect ? 5 : 20), `only ${checked} elements read: the surface did not open`);
      const lines = [...new Set(found.filter((f) => !f.allowed).map((f) => `${f.rule} on ${f.target}: ${f.what}`))];
      assert.deepEqual(errors, [], `page errors in ${surface.name} at ${screen}`);
      assert.equal(lines.length, 0, `${lines.length} findings in ${surface.name} at ${screen}:\n  ${lines.join('\n  ')}`);
    });
  }
}

// The switch of «Acerca de» and the calendar: the same stored preference as the moon of the map, both ways.
for (const file of ['acerca.html', 'calendario.html']) {
  test(`the moon of ${file} shares the stored preference with the map`, { timeout: 120000 }, async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    try {
      const page = await context.newPage();
      await page.route((u) => !u.href.startsWith(base) && !u.hostname.endsWith('unpkg.com'), (r) => r.abort());
      const dark = () => page.evaluate(() => document.documentElement.classList.contains('be-reunion'));
      await page.goto(`${base}${file}`, { waitUntil: 'load' });
      assert.equal(await dark(), false, `${file} opened dark with nothing stored`);
      await page.locator('#reunion-boton').click();
      assert.equal(await dark(), true, `the moon of ${file} did not turn the dark look on`);
      assert.equal(await page.locator('#reunion-boton').getAttribute('aria-pressed'), 'true');
      await page.goto(`${base}index.html#${T}`, { waitUntil: 'domcontentloaded' });
      assert.equal(await dark(), true, `the map did not open dark after the moon of ${file}`);
      await page.waitForFunction(() => window.BE?.D, null, { timeout: 60000 });
      await page.locator('#reunion-boton').click();
      await page.goto(`${base}${file}`, { waitUntil: 'load' });
      assert.equal(await dark(), false, `${file} stayed dark after the map turned the dark look off`);
      assert.equal(await page.locator('#reunion-boton').getAttribute('aria-pressed'), 'false');
    } finally {
      await context.close();
    }
  });
}

// The positive control: the same audit on the same page, with one hardcoded light background injected, has to flag it.
test('a hardcoded light colour in the dark look is flagged', { timeout: 180000 }, async () => {
  const { found } = await walk(SURFACES.find((s) => s.name === 'ficha de persona'), '1440', '.be-float, .panel-cuerpo { background: #fbfcfa !important; }');
  const hits = found.filter((f) => f.rule === 'fondo-claro' && /panel-cuerpo/.test(f.target));
  assert.ok(hits.length > 0, 'a light #fbfcfa card in the dark look went unflagged');
});

test('every allowlist entry says why', () => {
  for (const a of ALLOW) assert.ok(a.reason && a.reason.length > 20 && a.sel && a.rule, `allowlist entry ${a.rule} ${a.sel} without a reason`);
});
