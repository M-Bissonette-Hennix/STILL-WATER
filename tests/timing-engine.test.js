import test from 'node:test';
import assert from 'node:assert/strict';
import { MonotonicTimer, classifyBackgroundInterruption, cueForElapsed } from '../src/core/timing-engine.js';
import { PROTOCOL } from '../src/core/protocol.js';

function fakeClock(start = 1000) {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; }, set: (ms) => { t = ms; } };
}

test('deadline timer does not depend on render callback cadence', () => {
  const c = fakeClock();
  const timer = new MonotonicTimer({ now: c.now });
  timer.start(120000);
  c.advance(119999);
  assert.equal(timer.expired(), false);
  assert.equal(timer.remainingMs(), 1);
  c.advance(10000); // simulated frozen rendering thread / delayed callback
  assert.equal(timer.expired(), true);
  assert.equal(timer.remainingMs(), 0);
  assert.equal(timer.elapsedMs(), 129999);
});

test('timer stop freezes elapsed/remaining snapshot', () => {
  const c = fakeClock();
  const timer = new MonotonicTimer({ now: c.now });
  timer.start(30000);
  c.advance(5000);
  timer.stop();
  c.advance(50000);
  assert.equal(timer.elapsedMs(), 5000);
  assert.equal(timer.remainingMs(), 25000);
});

test('background >15s is substantive; exactly 15s is not', () => {
  assert.equal(classifyBackgroundInterruption({ backgroundedAtWallMs: 0, foregroundedAtWallMs: 15000 }).substantive, false);
  assert.equal(classifyBackgroundInterruption({ backgroundedAtWallMs: 0, foregroundedAtWallMs: 15001 }).substantive, true);
});

test('DEPLOY cue schedules are deterministic', () => {
  const s60 = PROTOCOL.deploy['60'].cueSchedule;
  assert.equal(cueForElapsed(s60, 0), 'settle');
  assert.equal(cueForElapsed(s60, 9999), 'settle');
  assert.equal(cueForElapsed(s60, 10000), 'release_widen_still');
  assert.equal(cueForElapsed(s60, 20000), 'ready');
  assert.equal(cueForElapsed(s60, 60000), null);
});

test('timer can reconstruct an in-progress phase from elapsed monotonic time', () => {
  const c = fakeClock();
  const timer = new MonotonicTimer({ now: c.now });
  timer.start(30000, { elapsedMs: 12000 });
  assert.equal(timer.elapsedMs(), 12000);
  assert.equal(timer.remainingMs(), 18000);
  c.advance(18001);
  assert.equal(timer.expired(), true);
  assert.equal(timer.overshootMs(), 1);
});
