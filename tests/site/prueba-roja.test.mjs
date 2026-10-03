// Red on purpose: proves that the CI job fails and uploads the traces of the failing file. The next commit removes it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';

const chromium = createRequire(path.join(path.resolve(process.env.PLAYWRIGHT_MODULE_DIR), 'index.js'))('playwright-core').chromium;

test('a test that fails on purpose', async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  await page.setContent('<h1>rojo</h1>');
  try { assert.equal(await page.textContent('h1'), 'verde'); } finally { await browser.close(); }
});
