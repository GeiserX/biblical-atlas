// GPL-3.0-or-later. Run after build with PLAYWRIGHT_CORE set if needed.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const http = require('http'),
  fs = require('fs'),
  path = require('path');
(async () => {
  const root = path.resolve(__dirname, '../../site');
  const server = http.createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (p.endsWith('/')) p += 'index.html';
    if (!fs.existsSync(p)) {
      res.writeHead(404);
      return res.end();
    }
    const ext = path.extname(p);
    res.setHeader(
      'Content-Type',
      {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
      }[ext] || 'application/octet-stream',
    );
    res.end(fs.readFileSync(p));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  });
  const assert = require('assert').strict;
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(
    `http://127.0.0.1:${server.address().port}/#leer=hch-16&foco=1`,
  );
  await page.waitForSelector('[data-lectura-foco]');
  await page
    .waitForFunction(() => window.__be?.map?.loaded(), { timeout: 30000 })
    .catch(() => {});
  assert.equal(await page.locator('[data-lectura-foco]').isChecked(), true);
  assert.equal(await page.locator('#linea').isVisible(), false);
  await page.screenshot({ path: path.resolve('atlas-contrib-desktop.png') });
  await page.locator('[data-lectura-foco]').uncheck();
  assert.equal(await page.locator('#linea').isVisible(), true);
  await page.locator('[data-lectura-foco]').check();
  await page.reload();
  await page.waitForSelector('[data-lectura-foco]');
  assert.equal(await page.locator('[data-lectura-foco]').isChecked(), true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.resolve('atlas-contrib-mobile.png') });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.locator('[data-lectura-cerrar]').click();
  assert.equal(await page.locator('#linea').isVisible(), true);
  await page.setViewportSize({ width: 320, height: 740 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.equal(errors.length, 0);
  console.log(
    'PASS foco inicial, restauración, recarga, móvil 390/320, cerrar lectura, etiqueta y cero errores JS',
  );
  await browser.close();
  await new Promise((r) => server.close(r));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
