// Side-by-side captures and a pixel diff of the light look. Usage:
//   node componer.mjs <antes dir> <despues dir> <out dir>
// Writes <out>/<surface>.png with [antes oscuro | después oscuro], and prints, per surface, how many pixels of the light
// capture changed between antes and después.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const req = createRequire(path.join(process.env.PW_DIR, 'index.js'));
const { chromium } = req('playwright-core');
const [antes, despues, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ deviceScaleFactor: 1 });
const uri = (f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
const names = [...new Set(fs.readdirSync(despues).filter((f) => f.endsWith('-oscuro.png')).map((f) => f.replace(/-oscuro\.png$/, '')))].sort();
for (const n of names) {
  const a = path.join(antes, `${n}-oscuro.png`), d = path.join(despues, `${n}-oscuro.png`);
  const la = path.join(antes, `${n}-claro.png`), ld = path.join(despues, `${n}-claro.png`);
  // Light diff.
  let diff = 'sin captura antes';
  if (fs.existsSync(la) && fs.existsSync(ld)) {
    diff = await page.evaluate(async ([x, y]) => {
      const load = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = s; });
      const [p, q] = await Promise.all([load(x), load(y)]);
      if (p.width !== q.width || p.height !== q.height) return 'otro tamaño';
      const c = new OffscreenCanvas(p.width, p.height), g = c.getContext('2d');
      g.drawImage(p, 0, 0); const A = g.getImageData(0, 0, p.width, p.height).data;
      g.clearRect(0, 0, p.width, p.height); g.drawImage(q, 0, 0); const B = g.getImageData(0, 0, p.width, p.height).data;
      let n = 0, big = 0;
      for (let i = 0; i < A.length; i += 4) { const m = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2])); if (m > 0) n++; if (m > 8) big++; }
      return `${n} píxeles distintos (${big} con más de 8 de diferencia) de ${A.length / 4}`;
    }, [uri(la), uri(ld)]);
  }
  console.log(`${n}: claro ${diff}`);
  if (!fs.existsSync(a)) continue;
  const html = `<body style="margin:0;display:flex;gap:12px;background:#777;font:600 16px system-ui;color:#fff">
    <figure style="margin:0"><figcaption style="padding:4px 6px">Antes</figcaption><img src="${uri(a)}"></figure>
    <figure style="margin:0"><figcaption style="padding:4px 6px">Después</figcaption><img src="${uri(d)}"></figure></body>`;
  await page.setContent(html);
  const size = await page.evaluate(() => ({ width: document.body.scrollWidth, height: document.body.scrollHeight }));
  await page.setViewportSize(size);
  await page.screenshot({ path: path.join(out, `${n}.png`) });
}
await browser.close();
