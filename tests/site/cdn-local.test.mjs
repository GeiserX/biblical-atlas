// Guards tests/site/cdn-local.mjs, the hook that answers unpkg.com from a local folder so a slow CDN cannot time out a
// test. It runs one small test file through `node --test --import cdn-local.mjs`, as sitio.yml does, in a Chromium that
// cannot resolve unpkg.com. The page loads a stylesheet and a module from unpkg with crossorigin and an integrity hash,
// as index.html loads MapLibre. With BE_CDN_DIR pointing at the files, both load; without it, the same file must fail,
// so the pass is the hook's doing and not the network's.
//
// Needs PLAYWRIGHT_CORE or PLAYWRIGHT_MODULE_DIR, as the hook does (docs/development.md says how to set them):
//
//   node --test tests/site/cdn-local.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = fileURLToPath(new URL('./cdn-local.mjs', import.meta.url));
const CORE = process.env.PLAYWRIGHT_CORE
  || (process.env.PLAYWRIGHT_MODULE_DIR && path.join(process.env.PLAYWRIGHT_MODULE_DIR, 'playwright-core'));

const CSS = 'h1 { color: rgb(1, 2, 3); }\n';
const MJS = 'export const ok = 1;\n';
const sri = (s) => `sha384-${crypto.createHash('sha384').update(s).digest('base64')}`;

const fixture = () => `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(${JSON.stringify(path.resolve(CORE || '.'))});
test('unpkg answers from the folder', async () => {
  const args = ['--host-resolver-rules=MAP unpkg.com ~NOTFOUND'];
  let browser;
  try { browser = await chromium.launch({ headless: true, args }); }
  catch { browser = await chromium.launch({ headless: true, args, channel: 'chrome' }); }
  try {
    const page = await browser.newPage();
    await page.setContent(\`<link rel="stylesheet" href="https://unpkg.com/demo@1.0.0/dist/a.css" integrity="${sri(CSS)}" crossorigin="anonymous">
      <h1>Una página</h1>
      <script type="importmap">{ "integrity": { "https://unpkg.com/demo@1.0.0/dist/a.mjs": "${sri(MJS)}" } }</script>
      <script type="module">import { ok } from 'https://unpkg.com/demo@1.0.0/dist/a.mjs'; window.ok = ok;</script>\`);
    await page.waitForFunction(() => window.ok === 1, null, { timeout: 10000 });
    assert.equal(await page.$eval('h1', (h) => getComputedStyle(h).color), 'rgb(1, 2, 3)');
  } finally { await browser.close(); }
});
`;

function run(withDir) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdn-local-'));
  const cdn = path.join(dir, 'cdn', 'demo@1.0.0', 'dist');
  fs.mkdirSync(cdn, { recursive: true });
  fs.writeFileSync(path.join(cdn, 'a.css'), CSS);
  fs.writeFileSync(path.join(cdn, 'a.mjs'), MJS);
  const file = path.join(dir, 'cdn.test.mjs');
  fs.writeFileSync(file, fixture());
  // NODE_TEST_CONTEXT is set inside a test run: with it, the inner `node --test` would report to this process.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.BE_CDN_DIR;
  if (withDir) env.BE_CDN_DIR = path.join(dir, 'cdn');
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', '--test-concurrency=1', '--import', HOOK, file], { env, encoding: 'utf8', timeout: 120000 });
  fs.rmSync(dir, { recursive: true, force: true });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

test('with BE_CDN_DIR the page gets unpkg files from the folder; without it the same page cannot', { timeout: 300000 }, () => {
  assert.ok(CORE, 'PLAYWRIGHT_CORE or PLAYWRIGHT_MODULE_DIR is not set: the hook would do nothing');
  const served = run(true);
  assert.equal(served.status, 0, `with the folder the file exited with ${served.status}:\n${served.out}`);
  assert.match(served.out, /ℹ pass 1/, `with the folder the test did not run:\n${served.out}`);
  const cut = run(false);
  assert.equal(cut.status, 1, `without the folder the file exited with ${cut.status}, so unpkg.com was reachable:\n${cut.out}`);
  assert.match(cut.out, /ℹ fail 1/, `without the folder the test did not fail where expected:\n${cut.out}`);
});
