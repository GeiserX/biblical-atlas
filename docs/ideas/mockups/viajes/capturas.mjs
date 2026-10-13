// Capturas y comprobaciones de los prototipos de «Viajes», a 1440 × 900 con ratón y a 430 × 900 táctil.
//
//   python3 -m http.server 8941 --bind 127.0.0.1          # desde la raíz del repositorio
//   PLAYWRIGHT_CORE=<ruta a playwright-core> node docs/ideas/mockups/viajes/capturas.mjs <carpeta-png> 8941
//
// Deja un PNG por diseño, estado y ancho, y falla (salida 1) si alguna página tiene un error de consola, se desborda
// a lo ancho, deja un fondo de relieve sin cargar o no pinta lo que su estado pide (la lista, el tramo o la guía).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');

const [out, port = '8941', solo] = process.argv.slice(2);
if (!out) { console.error('Uso: node capturas.mjs <carpeta-png> [puerto] [diseño]'); process.exit(1); }
const base = `http://127.0.0.1:${port}/docs/ideas/mockups/viajes`;
const R = 'viaje=viaje-a-roma';
// [diseño, estado, hash, selector que debe existir]
const TOMAS = [
  ['cuaderno', 'lista', '', '.cu-item'],
  ['cuaderno', 'tramo', `${R}&tramo=9`, '.cu-tramo:not([hidden]) .vj-mapa svg'],
  ['cuaderno', 'guia', `${R}&inicio=2`, '.cu-guia:not([hidden])'],
  ['hoja', 'lista', 'quien=pablo', '.ho-sug--rec'],
  ['hoja', 'tramo', `${R}&tramo=9`, '.ho-mapa .vj-mapa svg'],
  ['hoja', 'viaje', 'viaje=tercer-viaje', '.ho-t tbody tr'],
  ['mapa', 'lista', R, '.ma-leg'],
  ['mapa', 'tramo', `${R}&tramo=9`, '.ma-leg[aria-current]'],
  ['mapa', 'guia', 'inicio=1', '.ma-inicio:not([hidden])'],
  ['esquema', 'lista', '', '.es-fila'],
  ['esquema', 'tramo', `${R}&tramo=9`, '.es-panel .vj-mapa svg'],
  ['esquema', 'guia', `${R}&tramo=0&inicio=2`, '.es-guia'],
];
const ANCHOS = [['1440', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }],
  ['430', { viewport: { width: 430, height: 900 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]];

const browser = await chromium.launch({ headless: true });
const fallos = [];
try {
  for (const [ancho, opts] of ANCHOS) {
    for (const tema of ['claro', 'reunion']) {
      const ctx = await browser.newContext(opts);
      for (const [d, estado, hash, sel] of TOMAS) {
        if (solo && d !== solo) continue;
        if (tema === 'reunion' && estado !== 'tramo') continue;   // el modo reunión, solo en la vista del tramo
        const page = await ctx.newPage();
        const errores = [];
        page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
        page.on('pageerror', (e) => errores.push(String(e)));
        page.on('requestfailed', (r) => errores.push(`no carga ${r.url()}`));
        page.on('response', (r) => { if (r.status() >= 400) errores.push(`${r.status()} ${r.url()}`); });
        await page.goto(`${base}/${d}/${tema === 'reunion' ? '?tema=reunion' : ''}#${hash}`);
        await page.addStyleTag({ content: '.proto-tools{display:none!important}' });
        await page.waitForSelector(sel, { timeout: 15000 }).catch(() => errores.push(`no aparece ${sel}`));
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(500);
        const m = await page.evaluate(() => ({
          ancho: document.documentElement.scrollWidth, ventana: innerWidth,
          fondos: [...document.querySelectorAll('img.vj-mapa__fondo')].map((i) => i.complete && i.naturalWidth > 0),
          pequenos: [...document.querySelectorAll('a, button, input, [tabindex="0"]')].filter((e) => {
            const r = e.getBoundingClientRect(); if (!r.width || e.closest('.proto-tools, p, li > span, dd, td.ho-de, .ho-cab > span, .vj-barra__logo')) return false;
            return r.height < 32;
          }).map((e) => e.textContent.trim().slice(0, 30)),
          // Lo que se ve sin desplazar: controles y palabras en la primera pantalla, sin lo que recorta una caja con
          // desplazamiento propio (la lista de un cajón sigue debajo, pero no se ve).
          ...(() => { window.__seVe = (el) => {
            const r = el.getBoundingClientRect(); if (!r.width || !r.height || r.top >= innerHeight || r.bottom <= 0 || r.left >= innerWidth || r.right <= 0) return false;
            const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
            for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
              if (getComputedStyle(a).overflow === 'visible') continue;
              const q = a.getBoundingClientRect(); if (cx < q.left || cx > q.right || cy < q.top || cy > q.bottom) return false;
            }
            return getComputedStyle(el).visibility !== 'hidden';
          }; return {}; })(),
          controles: [...document.querySelectorAll('a, button, input, [tabindex="0"]')].filter((e) => {
            return !e.closest('.proto-tools') && window.__seVe(e);
          }).length,
          palabras: (() => {
            const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n = 0, t;
            while ((t = w.nextNode())) {
              const el = t.parentElement; if (!el || el.closest('.proto-tools, script, style')) continue;
              if (!window.__seVe(el)) continue;
              n += (t.textContent.match(/[\p{L}\p{N}]+/gu) || []).length;
            }
            return n;
          })(),
        }));
        if (m.ancho > m.ventana + 1) errores.push(`se desborda: ${m.ancho} px en una ventana de ${m.ventana}`);
        if (m.fondos.some((x) => !x)) errores.push('un fondo de relieve no ha cargado');
        const nombre = `${d}-${estado}-${ancho}${tema === 'reunion' ? '-reunion' : ''}`;
        await page.screenshot({ path: `${out}/${nombre}.png` });
        console.log(`${errores.length ? 'FALLA' : 'bien '} ${nombre} · ${m.controles} controles y ${m.palabras} palabras a la vista${m.pequenos.length ? ` · menos de 32 px: ${m.pequenos.slice(0, 4).join(' | ')}` : ''}${errores.length ? `\n    ${errores.join('\n    ')}` : ''}`);
        if (errores.length) fallos.push(nombre);
        await page.close();
      }
      await ctx.close();
    }
  }
  // La primera visita, de punta a punta: desde la entrada de cada diseño, las pulsaciones que pide su guía hasta un tramo
  // con el mapa encuadrado en él. Falla si un paso no lleva a donde dice.
  const FLUJOS = [
    ['cuaderno', '', ['#empieza', '.cu-guia a.vj-btn:not(.vj-btn--peq)', '.cu-guia a.vj-btn:not(.vj-btn--peq)', '.cu-guia a.vj-btn:not(.vj-btn--peq)'], '.cu-tramo:not([hidden]) .vj-ruta--foco'],
    ['hoja', '', ['.ho-chip[href="#quien=pablo"]', '.ho-sug--rec', '.ho-col-mapa a'], '.ho-mapa .vj-ruta--foco'],
    ['mapa', 'inicio=1', ['.ma-inicio a.vj-btn--primario', '.ma-coach a'], '.ma-mapa .vj-ruta--foco'],
    ['esquema', '', ['.es-empieza a'], '.es-panel .vj-ruta--foco'],
  ];
  for (const [ancho, opts] of ANCHOS) {
    const ctx = await browser.newContext(opts);
    for (const [d, hash, pasos, fin] of FLUJOS) {
      if (solo && d !== solo) continue;
      const page = await ctx.newPage();
      await page.goto(`${base}/${d}/#${hash}`);
      await page.addStyleTag({ content: '.proto-tools{display:none!important}' });
      let fallo = null;
      for (const [i, sel] of pasos.entries()) {
        try { await page.click(sel, { timeout: 5000 }); await page.waitForTimeout(150); } catch { fallo = `el paso ${i + 1} no encuentra ${sel}`; break; }
      }
      if (!fallo && !(await page.waitForSelector(fin, { timeout: 5000 }).catch(() => null))) fallo = `al final no aparece ${fin}`;
      console.log(`${fallo ? 'FALLA' : 'bien '} primera visita ${d}-${ancho}: ${pasos.length} pulsaciones hasta un tramo en el mapa${fallo ? ` · ${fallo}` : ''}`);
      if (fallo) fallos.push(`flujo-${d}-${ancho}`);
      await page.close();
    }
    await ctx.close();
  }
  // Un enlace viejo o mal copiado (#viaje=<id que no existe>) no deja la página en blanco: cada diseño enseña algo,
  // y en el Mapa la lista marca como actual el viaje que se dibuja.
  const ctx = await browser.newContext(ANCHOS[0][1]);
  for (const [d, sel, marca] of [['cuaderno', '.cu-item'], ['hoja', '.ho-n'], ['mapa', '.ma-leg', '.ma-item[aria-current]'], ['esquema', '.es-fila']]) {
    if (solo && d !== solo) continue;
    const page = await ctx.newPage();
    const errores = [];
    page.on('pageerror', (e) => errores.push(String(e)));
    await page.goto(`${base}/${d}/#viaje=no-existe`);
    if (!(await page.waitForSelector(sel, { timeout: 5000 }).catch(() => null))) errores.push(`no aparece ${sel}`);
    if (marca && !(await page.$(marca))) errores.push(`no hay ${marca}`);
    console.log(`${errores.length ? 'FALLA' : 'bien '} viaje desconocido ${d}${errores.length ? ` · ${errores.join(' · ')}` : ''}`);
    if (errores.length) fallos.push(`desconocido-${d}`);
    await page.close();
  }
  await ctx.close();
} finally {
  await browser.close();
}
if (fallos.length) { console.log(`${fallos.length} con fallos: ${fallos.join(', ')}`); process.exit(1); }
