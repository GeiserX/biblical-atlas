// Serves the files the site loads from unpkg.com (MapLibre) out of a local folder, so a slow CDN cannot time out a test.
// On 2026-10-15 unpkg took 12 s to send maplibre-gl.css and never answered maplibre-gl-shared.mjs: the page's load
// event waited on both, and ten tests of one shard failed on page.goto with nothing wrong in the site.
//
// Loaded before each test file with `node --test --import ./tests/site/cdn-local.mjs`. It does nothing unless
// BE_CDN_DIR=<dir> is set. Then it wraps chromium.launch of the same playwright-core the tests load (PLAYWRIGHT_CORE or
// PLAYWRIGHT_MODULE_DIR), as failure-traces.mjs does: every new context answers https://unpkg.com/<path> with
// <dir>/<path> when that file exists, and lets the request go to the network when it does not. sitio.yml downloads the
// files once per job. A request the test routes itself (page.route) is decided by the test first.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const TYPES = { '.css': 'text/css', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json' };

const dir = process.env.BE_CDN_DIR;
if (dir) {
  const root = path.resolve(dir);
  const req = createRequire(import.meta.url);
  const where = [process.env.PLAYWRIGHT_CORE,
    process.env.PLAYWRIGHT_MODULE_DIR && path.join(path.resolve(process.env.PLAYWRIGHT_MODULE_DIR), 'playwright-core')].filter(Boolean);
  let chromium = null;
  for (const w of where) { try { chromium = req(path.resolve(w)).chromium; break; } catch { /* next */ } }
  if (chromium) {
    const serve = async (route) => {
      const file = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fallback();
      // Playwright adds the CORS headers the site's crossorigin loads need; the integrity hashes still check the bytes.
      return route.fulfill({ status: 200, body: fs.readFileSync(file),
        headers: { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' } });
    };
    const launch = chromium.launch.bind(chromium);
    chromium.launch = async (...args) => {
      const browser = await launch(...args);
      const newContext = browser.newContext.bind(browser);
      browser.newContext = async (...opts) => {
        const context = await newContext(...opts);
        await context.route('https://unpkg.com/**', serve);
        return context;
      };
      return browser;
    };
  }
}
