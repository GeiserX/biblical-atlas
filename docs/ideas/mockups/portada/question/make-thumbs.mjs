// Portada «Entra por una pregunta»: rehace las tres miniaturas de las preguntas (img/q-*.webp) a partir del sitio real.
// Cada miniatura es un recorte de una captura del sitio en la dirección de la pregunta: nada dibujado a mano.
//
// Uso, con la raíz del repositorio servida en 127.0.0.1:8913 y playwright-core instalado donde lo encuentre Node:
//   python3 -m http.server 8913 --bind 127.0.0.1 &
//   node docs/ideas/mockups/portada/question/make-thumbs.mjs
// Necesita cwebp (libwebp) en el PATH para pasar el PNG a WebP de 800 x 400.
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'http://127.0.0.1:8913/site/index.html';
// Recortes en píxeles CSS de una ventana de 1440 x 900, todos de proporción 2:1.
const TOMAS = [
  { img: 'q-mapa', dir: 'sel=lugar:jerusalen&t=-518.5000&v=40&mapa=antiguo', clip: { x: 200, y: 150, width: 480, height: 240 } },
  { img: 'q-grafo', dir: 'conexion=persona:loida~persona:pablo&t=49.5000&v=40&mapa=antiguo', clip: { x: 16, y: 236, width: 640, height: 320 }, espera: '#vista-conexion:not([hidden]) .vista-cerrar' },
  { img: 'q-lectura', dir: 'leer=hch-16&mapa=antiguo', clip: { x: 0, y: 60, width: 720, height: 360 }, espera: '#vista-lectura:not([hidden])' },
];

const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  for (const t of TOMAS) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(`${BASE}#${t.dir}`);
    await page.waitForFunction(() => window.BE && window.BE.D, null, { timeout: 30000 });
    // El mapa termina de pintar el relieve; se espera a que MapLibre quede quieto y un poco más.
    await page.waitForFunction(() => window.BE?.mapa?.gl?.loaded?.() && window.BE.mapa.gl.areTilesLoaded?.(), null, { timeout: 30000 }).catch(() => {});
    if (t.espera) await page.waitForSelector(t.espera, { timeout: 30000 });
    await page.waitForTimeout(2500);
    const png = path.join(AQUI, 'img', `${t.img}.png`);
    await page.screenshot({ path: png, clip: t.clip });
    execFileSync('cwebp', ['-quiet', '-q', '74', '-resize', '800', '400', png, '-o', path.join(AQUI, 'img', `${t.img}.webp`)]);
    execFileSync('rm', [png]);
    await ctx.close();
  }
} finally {
  await browser.close();
}
