// Keeps a Playwright trace of every browser context of a test file that fails, so a red run in CI can be opened with
// `npx playwright-core show-trace <file>.zip` (or at trace.playwright.dev) instead of being guessed from a log line.
//
// Loaded before each test file with `node --test --import ./tests/site/failure-traces.mjs`. It does nothing unless
// BE_TRACES=<dir> is set. Then it wraps chromium.launch of the same playwright-core the tests load (PLAYWRIGHT_CORE or
// PLAYWRIGHT_MODULE_DIR): every new context records a trace, written to <dir>/<test file>/NNN.zip when the context or
// its browser closes. When the file passes, its folder is deleted on exit, so only failing files leave traces.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = process.env.BE_TRACES;
if (root) {
  const out = path.join(path.resolve(root), path.basename(process.argv[1] || 'test', '.mjs'));
  const req = createRequire(import.meta.url);
  const where = [process.env.PLAYWRIGHT_CORE,
    process.env.PLAYWRIGHT_MODULE_DIR && path.join(path.resolve(process.env.PLAYWRIGHT_MODULE_DIR), 'playwright-core')].filter(Boolean);
  let chromium = null;
  for (const w of where) { try { chromium = req(path.resolve(w)).chromium; break; } catch { /* next */ } }
  if (chromium) {
    let n = 0;
    const launch = chromium.launch.bind(chromium);
    chromium.launch = async (...args) => {
      const browser = await launch(...args);
      const recording = new Set();
      const stop = async (context) => {
        if (!recording.delete(context)) return;
        fs.mkdirSync(out, { recursive: true });
        await context.tracing.stop({ path: path.join(out, `${String(++n).padStart(3, '0')}.zip`) }).catch(() => {});
      };
      const newContext = browser.newContext.bind(browser);
      browser.newContext = async (...opts) => {
        const context = await newContext(...opts);
        await context.tracing.start({ screenshots: true, snapshots: true });
        recording.add(context);
        const close = context.close.bind(context);
        context.close = async (...a) => { await stop(context); return close(...a); };
        return context;
      };
      const closeBrowser = browser.close.bind(browser);
      browser.close = async (...a) => { for (const c of [...recording]) await stop(c); return closeBrowser(...a); };
      return browser;
    };
  }
  process.on('exit', () => { if (!process.exitCode) fs.rmSync(out, { recursive: true, force: true }); });
}
