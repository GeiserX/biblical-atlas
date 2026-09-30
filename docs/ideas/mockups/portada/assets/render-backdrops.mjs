// Captura los fondos de la portada del mapa real del sitio, en su estilo antiguo, sin la interfaz ni las capas de datos.
//
//   python3 -m http.server 8903 --bind 127.0.0.1   # desde la raíz del repositorio, en otra terminal
//   node docs/ideas/mockups/portada/assets/render-backdrops.mjs <carpeta-png> [puerto] [encuadre,encuadre…]
//
// Necesita playwright-core (PLAYWRIGHT_DIR: carpeta desde la que resolverlo) y Chrome (CHROME_BIN, opcional).
// Deja un PNG por encuadre y forma; la compresión a WebP está en CREDITS.md.
import { createRequire } from 'module';

const require = createRequire(process.env.PLAYWRIGHT_DIR ? `${process.env.PLAYWRIGHT_DIR.replace(/\/$/, '')}/` : import.meta.url);
const { chromium } = require('playwright-core');

const [out, port = '8903', onlyArg] = process.argv.slice(2);
if (!out) { console.error('Uso: node render-backdrops.mjs <carpeta-png> [puerto] [encuadres]'); process.exit(1); }
const only = onlyArg ? onlyArg.split(',') : null;
const page0 = `http://127.0.0.1:${port}/site/index.html#mapa=antiguo&ocultas=viajes,cartas,inciertos,hallazgos,pendientes`;

// Centro [lon, lat] y grados de longitud que caben a lo ancho. El zoom sale de ahí (teselas de 512 px).
export const FRAMES = {
  'bible-lands': { wide: { c: [36.2, 31.4], span: 28 }, tall: { c: [37.4, 31.2], span: 20 } },
  'paul-journeys': { wide: { c: [24.6, 36.4], span: 25 }, tall: { c: [29.6, 36.2], span: 11 } },
  'galilee-judea': { wide: { c: [35.4, 32.22], span: 2.7 }, tall: { c: [35.36, 32.2], span: 1.3 } },
  'jerusalem': { wide: { c: [35.23, 31.77], span: 0.24 }, tall: { c: [35.232, 31.772], span: 0.09 } },
};
const SIZES = { wide: [2560, 1440], tall: [860, 1800] };

// Solo el lienzo del mapa, a toda la ventana: sin barra, línea de tiempo, ficha, marcas, nombres ni controles.
const HIDE = `
  body > *:not(#app), #app > *:not(#mapa), #mapa > *:not(#mapa-gl) { display: none !important; }
  #mapa-gl { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 2147483647 !important; }
  #mapa-gl > *:not(.maplibregl-canvas-container), .maplibregl-marker, .maplibregl-popup { display: none !important; }
`;

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
try {
  for (const [kind, [w, h]] of Object.entries(SIZES)) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(page0);
    await page.waitForFunction(() => window.BE?.D && window.BE.mapa?.gl?.loaded(), null, { timeout: 60000 });
    await page.addStyleTag({ content: HIDE });
    await page.waitForTimeout(2500);           // deja terminar el encuadre inicial del sitio
    for (const [name, frame] of Object.entries(FRAMES)) {
      if (only && !only.includes(name)) continue;
      const { c, span } = frame[kind];
      await page.evaluate(async ({ c, span, w }) => {
        const map = window.BE.mapa.gl;
        map.stop();
        map.setMaxBounds(null);
        map.resize();
        map.jumpTo({ center: c, zoom: Math.log2((w * 360) / (512 * span)) });
        await new Promise((r) => { map.once('idle', r); map.triggerRepaint(); });
      }, { c, span, w });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${out}/${name}-${kind}.png`, clip: { x: 0, y: 0, width: w, height: h } });
      console.log(`${name}-${kind}.png`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
