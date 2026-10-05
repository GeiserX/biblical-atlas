// The tile cache of the service worker (site/sw.js, docs/development.md «Sin conexión») stays under its cap even when
// the browser stops and restarts the worker every few tiles, as it does with an idle worker. No browser: sw.js runs in
// a node vm with a fake Cache Storage that outlives each "restart".
//
//   node --test tests/site/sw-teselas.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SRC = fs.readFileSync(new URL('../../site/sw.js', import.meta.url), 'utf8');
const LIMIT = Number(SRC.match(/const TILE_LIMIT = (\d+);/)[1]);
const tileUrl = (i) => `https://tiles.openfreemap.org/planet/20251001_001001_pt/14/${i}/7000.pbf`;

/** A Cache Storage in memory: each cache keeps its keys in insertion order, as the browser does. */
function fakeCaches() {
  const all = new Map();
  const open = (name) => {
    if (!all.has(name)) {
      const m = new Map();
      all.set(name, {
        put: async (url, res) => { m.delete(url); m.set(url, res); },
        keys: async () => [...m.keys()],
        delete: async (url) => m.delete(url),
        match: async (url) => m.get(url),
      });
    }
    return all.get(name);
  };
  return { open: async (name) => open(name), keys: async () => [...all.keys()] };
}

/** sw.js started afresh, as after the browser stopped it: its module state is new, the caches are not. */
function startWorker(caches) {
  const self = { location: new URL('https://atlas.example/sw.js'), addEventListener() {}, registration: {} };
  const ctx = vm.createContext({
    self, caches, URL, Response: class {}, console,
    importScripts() { self.SW_MANIFEST = { version: 'v', files: {} }; },
  });
  vm.runInContext(SRC, ctx);
  return ctx;
}

test('the tile cache stays under its cap when the worker restarts every few tiles', async () => {
  const caches = fakeCaches();
  const n = LIMIT * 3;
  let worker;
  for (let i = 0; i < n; i++) {
    if (i % 7 === 0) worker = startWorker(caches);
    await worker.keepTile(await caches.open('biblical-atlas-teselas'), tileUrl(i), {});
  }
  const keys = await (await caches.open('biblical-atlas-teselas')).keys();
  assert.ok(keys.length <= LIMIT + 50, `${keys.length} tiles kept after ${n} writes; the cap is ${LIMIT} (+50 of margin)`);
  assert.ok(keys.includes(tileUrl(n - 1)), 'the newest tile was dropped');
  assert.ok(!keys.includes(tileUrl(0)), 'the oldest tile was kept');
});

test('the style, the TileJSON, the sprites and the glyphs outlive any number of tiles seen after them', async () => {
  const caches = fakeCaches();
  const worker = startWorker(caches);
  const tiles = await caches.open('biblical-atlas-teselas');
  // What the map of today asks for first, in this order, on every visit.
  const kept = ['https://tiles.openfreemap.org/styles/positron', 'https://tiles.openfreemap.org/planet',
    'https://tiles.openfreemap.org/sprites/ofm_f384/ofm.json', 'https://tiles.openfreemap.org/sprites/ofm_f384/ofm.png',
    'https://tiles.openfreemap.org/fonts/Noto%20Sans%20Regular/0-255.pbf'];
  for (const url of kept) await worker.keepTile(tiles, url, {});
  for (let i = 0; i < LIMIT + 100; i++) await worker.keepTile(tiles, tileUrl(i), {});
  const keys = await tiles.keys();
  for (const url of kept) assert.ok(keys.includes(url), `${url} was dropped to make room for tiles`);
  assert.ok(keys.filter((k) => k.endsWith('7000.pbf')).length <= LIMIT + 50, 'the tiles went past their cap');
});
