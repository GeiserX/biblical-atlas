// Captura la mitad viva de la portada en la primera parada de la escena, para enseñarla mientras el mapa vivo carga
// (idea K1: imagen primero, mapa vivo después). Abre esta misma página con ?captura=1, que carga el sitio de verdad en
// el marco con la cámara de la escena y no la pone en marcha, y fotografía solo el marco: en claro y en modo reunión,
// a 1440x900 (la mitad viva mide 907x900) y a 430x900 (la franja de arriba, a densidad 2).
//
//   python3 -m http.server 8914 --bind 127.0.0.1 --directory <raíz del repositorio>   # en otra terminal
//   PLAYWRIGHT_DIR=<carpeta con playwright-core> node docs/ideas/mockups/portada/live/render-captures.mjs [puerto] [escritorio,movil]
//
// Necesita cwebp. Deja img/captura-{escritorio,movil}[-reunion].webp junto a esta página.
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(process.env.PLAYWRIGHT_DIR ? `${process.env.PLAYWRIGHT_DIR.replace(/\/$/, '')}/` : import.meta.url);
const { chromium } = require('playwright-core');
const aqui = dirname(fileURLToPath(import.meta.url));
const port = process.argv[2] || '8914';
const solo = process.argv[3] ? process.argv[3].split(',') : null;   // escritorio, movil
const TAMANOS = { escritorio: { w: 1440, h: 900, dpr: 1, movil: false, q: 78 }, movil: { w: 430, h: 900, dpr: 2, movil: true, q: 72 } };

const tmp = mkdtempSync(join(tmpdir(), 'capturas-'));
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  for (const [nombre, t] of Object.entries(TAMANOS)) {
    if (solo && !solo.includes(nombre)) continue;
    for (const tema of ['claro', 'reunion']) {
      const ctx = await browser.newContext({ viewport: { width: t.w, height: t.h }, deviceScaleFactor: t.dpr, isMobile: t.movil, hasTouch: t.movil });
      const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${port}/docs/ideas/mockups/portada/live/?estado=nuevo&captura=1&tema=${tema}`);
      await page.waitForFunction(() => document.documentElement.dataset.capturaLista === '1', null, { timeout: 90000 });
      await page.waitForTimeout(800);
      const png = join(tmp, `${nombre}-${tema}.png`);
      await page.locator('#vivo').screenshot({ path: png });
      const out = join(aqui, 'img', `captura-${nombre}${tema === 'reunion' ? '-reunion' : ''}.webp`);
      execFileSync('cwebp', ['-quiet', '-q', String(t.q), '-m', '6', '-sharp_yuv', png, '-o', out]);
      console.log(out);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  rmSync(tmp, { recursive: true, force: true });
}
