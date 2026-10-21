// When playback stops at an event (site/js/linea-filas.js, playStop), in plain node: no browser, no build, no data.
//  - At «Años», «Meses» and «Días» every event the cursor passes stops playback, as always.
//  - At «Décadas», «Siglos» and «Milenios» a stop is earned: only after 3 s of playback since the last stop (or since
//    play was pressed). The events in between do not stop it; they come back as `passed`, for the running message.
//
// Run from the repository root (light, it may run anywhere):
//   node --test tests/site/timeline-playstop.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.BE_ROOT ? path.resolve(process.env.BE_ROOT) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const context = { window: { BE: {} } };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'site/js/linea-filas.js'), 'utf8'), context);
const F = context.window.BE.filas;

/** Plays `events` (seconds of playback at which the cursor reaches each one) frame by frame at 60 fps, as
    vigilarReproduccion does: a stop holds the cursor and resumes after `pause` s, and playback time starts again at 0.
    Returns the stops, the events passed without a stop, and the seconds stopped and played. */
function play(events, coarse, pause = coarse ? F.STOP_MS.coarse / 1000 : F.STOP_MS.fine / 1000) {
  const end = Math.max(...events) + 0.5, dt = 1 / 60;
  let t = 0, since = 0, stopped = 0, played = 0;
  const stops = [], passed = [];
  while (t < end) {
    const next = t + dt;
    const hits = events.filter((e) => e > t && e <= next).map((e) => ({ t: e }));
    const r = F.playStop(since, dt, hits, coarse);
    since = r.since; played += dt;
    passed.push(...r.passed.map((h) => h.t));
    if (r.stop) { stops.push(r.stop.t); stopped += pause; t = r.stop.t; since = 0; continue; }
    t = next;
  }
  return { stops, passed, stopped, played };
}

// About what Jesús looks like at 3 months per second: 138 events in 34 years, most of them a few days apart.
const JESUS = (() => {
  const out = [];
  let x = 0.2;
  for (let i = 0; i < 138; i++) { out.push(Math.round(x * 1000) / 1000); x += i % 23 === 22 ? 6 : 0.35; }
  return out;
})();

test('playStop exists and says how long a stop lasts at each scale', () => {
  assert.equal(typeof F.playStop, 'function', 'linea-filas.js has no playStop');
  assert.equal(F.STOP_GAP, 3);
  assert.deepEqual({ ...F.STOP_MS }, { fine: 1500, coarse: 2500 });
});

test('at «Años», «Meses» and «Días» every event stops playback, however close to the last one', () => {
  assert.equal(typeof F.playStop, 'function', 'linea-filas.js has no playStop');
  const r = play(JESUS, false);
  assert.equal(r.stops.length, JESUS.length, 'every event is a stop');
  assert.equal(r.passed.length, 0, 'nothing passes without a stop');
  // One frame right after a stop: still a stop.
  assert.ok(F.playStop(0, 1 / 60, [{ t: 1 }], false).stop, 'an event 1/60 s after a stop stops it again');
});

test('at «Décadas» and up a stop is earned: at least 3 s of playback since the last one, the rest pass in the message', () => {
  assert.equal(typeof F.playStop, 'function', 'linea-filas.js has no playStop');
  const r = play(JESUS, true);
  console.log(`coarse: ${r.stops.length} stops, ${r.passed.length} passed, ${r.stopped.toFixed(1)} s stopped of ${(r.stopped + r.played).toFixed(1)} s`);
  assert.equal(r.stops.length + r.passed.length, JESUS.length, 'every event either stops playback or is passed in the message');
  for (let i = 1; i < r.stops.length; i++) assert.ok(r.stops[i] - r.stops[i - 1] >= F.STOP_GAP - 1e-9, `stop ${i} came ${(r.stops[i] - r.stops[i - 1]).toFixed(2)} s of playback after the one before`);
  assert.ok(r.stops.length <= Math.ceil((Math.max(...JESUS) + 0.5) / F.STOP_GAP), `${r.stops.length} stops for ${Math.max(...JESUS).toFixed(0)} s of playback`);
  assert.ok(r.stops.length < JESUS.length / 4, `${r.stops.length} stops of ${JESUS.length} events: playback still stops all the time`);
  // Right after pressing play (since 0) the first event passes; 3 s later the next one stops.
  assert.equal(F.playStop(0, 0.5, [{ t: 1 }], true).stop, null);
  assert.equal(F.playStop(2.99, 0.02, [{ t: 1 }], true).stop.t, 1);
  // Of several events in one frame, the first one stops it.
  assert.equal(F.playStop(5, 0.02, [{ t: 1 }, { t: 2 }], true).stop.t, 1);
});
