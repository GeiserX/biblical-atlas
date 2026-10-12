// Guards tests/site/failure-traces.mjs, the hook that keeps a Playwright trace of every test file that fails in CI.
// It runs two small test files through `node --test --import failure-traces.mjs`, as sitio.yml does: one that fails
// after opening a page, and one that passes. The failing one must leave its trace and keep its exit code; the passing
// one must leave nothing and exit with 0.
//
// Needs PLAYWRIGHT_CORE or PLAYWRIGHT_MODULE_DIR, as the hook does (docs/development.md says how to set them):
//
//   node --test tests/site/failure-traces.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = fileURLToPath(new URL('./failure-traces.mjs', import.meta.url));
const CORE = process.env.PLAYWRIGHT_CORE
  || (process.env.PLAYWRIGHT_MODULE_DIR && path.join(process.env.PLAYWRIGHT_MODULE_DIR, 'playwright-core'));

// A test file that opens a page and then fails, or passes. It loads playwright-core from the same path as the hook, so
// it gets the chromium the hook wrapped.
const fixture = (fails) => `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(${JSON.stringify(path.resolve(CORE || '.'))});
test('${fails ? 'falla' : 'pasa'}', async () => {
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  let browser;
  try { browser = await chromium.launch({ headless: true, args }); }
  catch { browser = await chromium.launch({ headless: true, args, channel: 'chrome' }); }
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent('<h1>Una página</h1>');
    assert.equal(await page.textContent('h1'), ${fails ? "'Otra página'" : "'Una página'"});
  } finally { await browser.close(); }
});
`;

function run(name, fails) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trazas-'));
  const file = path.join(dir, `${name}.test.mjs`);
  fs.writeFileSync(file, fixture(fails));
  const traces = path.join(dir, 'trazas');
  // NODE_TEST_CONTEXT is set inside a test run: with it, the inner `node --test` would report to this process instead
  // of running as CI runs it.
  const env = { ...process.env, BE_TRACES: traces };
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', '--test-concurrency=1', '--import', HOOK, file], { env, encoding: 'utf8', timeout: 120000 });
  return { dir, status: r.status, out: `${r.stdout}${r.stderr}`, folder: path.join(traces, `${name}.test`) };
}

test('a failing test file leaves its trace and its exit code; a passing one leaves nothing', { timeout: 300000 }, async () => {
  assert.ok(CORE, 'PLAYWRIGHT_CORE or PLAYWRIGHT_MODULE_DIR is not set: the hook would do nothing');
  const bad = run('falla', true);
  try {
    assert.equal(bad.status, 1, `the failing file exited with ${bad.status}:\n${bad.out}`);
    assert.match(bad.out, /ℹ fail 1/, `the failing file did not fail where expected:\n${bad.out}`);
    const zips = fs.existsSync(bad.folder) ? fs.readdirSync(bad.folder) : [];
    assert.deepEqual(zips, ['001.zip'], `traces of the failing file: ${JSON.stringify(zips)}`);
    const zip = fs.readFileSync(path.join(bad.folder, '001.zip'));
    assert.ok(zip.length > 1000 && zip.subarray(0, 2).toString() === 'PK', `the trace is not a zip (${zip.length} bytes)`);
  } finally { fs.rmSync(bad.dir, { recursive: true, force: true }); }

  const good = run('pasa', false);
  try {
    assert.equal(good.status, 0, `the passing file exited with ${good.status}:\n${good.out}`);
    assert.match(good.out, /ℹ pass 1/, `the passing file did not run its test:\n${good.out}`);
    assert.equal(fs.existsSync(good.folder), false, 'the passing file left its traces');
  } finally { fs.rmSync(good.dir, { recursive: true, force: true }); }
});
