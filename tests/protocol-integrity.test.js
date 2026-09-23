import test from 'node:test';
import assert from 'node:assert/strict';
import { PROTOCOL, PROTOCOL_VERSION, breathingCyclePosition, targetStatePresent } from '../src/core/protocol.js';

test('protocol version is frozen at 1.0', () => assert.equal(PROTOCOL_VERSION, '1.0'));

test('canonical TRAIN durations match frozen specification', () => {
  assert.equal(PROTOCOL.train.regulate.durationMs, 120000);
  assert.equal(PROTOCOL.train.stabilize.durationMs, 300000);
  assert.equal(PROTOCOL.train.releaseCount.durationMs, 30000);
  assert.equal(PROTOCOL.train.releaseAnchor.durationMs, 30000);
  assert.equal(PROTOCOL.train.open.durationMs, 180000);
  assert.equal(PROTOCOL.train.encode.durationMs, 20000);
});

test('canonical paced respiration is 4 in / 6 out / no hold', () => {
  assert.equal(PROTOCOL.train.regulate.inhaleMs, 4000);
  assert.equal(PROTOCOL.train.regulate.exhaleMs, 6000);
  assert.equal(PROTOCOL.train.regulate.holdMs, 0);
  assert.equal(PROTOCOL.train.regulate.expectedCycles, 12);
});

test('breathing phase derives from elapsed time without counter drift', () => {
  assert.equal(breathingCyclePosition(0).phase, 'inhale');
  assert.equal(breathingCyclePosition(3999).phase, 'inhale');
  assert.equal(breathingCyclePosition(4000).phase, 'exhale');
  assert.equal(breathingCyclePosition(9999).phase, 'exhale');
  assert.equal(breathingCyclePosition(10000).phase, 'inhale');
  assert.equal(breathingCyclePosition(24000).phase, 'exhale');
});

test('target state requires all four dimensions >= 2', () => {
  assert.equal(targetStatePresent({ stillness: 2, breadth: 2, effortlessness: 2, readiness: 2 }), true);
  assert.equal(targetStatePresent({ stillness: 1, breadth: 3, effortlessness: 3, readiness: 3 }), false);
});
