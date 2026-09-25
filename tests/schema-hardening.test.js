import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTrainSession, makeDeploySession, validateTrainSession, validateDeploySession } from '../src/data/schema.js';

test('TRAIN target-state cache must match ratings', () => {
  const s = makeTrainSession({ stillness: 2, breadth: 2, effortlessness: 2, readiness: 2 });
  assert.equal(s.target_state_present, true);
  assert.equal(validateTrainSession({ ...s, target_state_present: false }).valid, false);
});

test('successful DEPLOY requires latency', () => {
  const s = makeDeploySession({ retrieval_success: true, retrieval_latency_ms: null });
  assert.equal(validateDeploySession(s).valid, false);
});

test('unsuccessful DEPLOY cannot retain latency', () => {
  const s = makeDeploySession({ retrieval_success: false, retrieval_latency_ms: 12000 });
  assert.equal(validateDeploySession(s).valid, false);
});

test('timeout cannot be successful', () => {
  const s = makeDeploySession({ status: 'timeout', retrieval_success: true, retrieval_latency_ms: 60000 });
  assert.equal(validateDeploySession(s).valid, false);
});

test('optional TRAIN carryover is constrained to 0..3 without breaking older records', () => {
  const base = makeTrainSession({ status:'completed', stillness:2, breadth:2, effortlessness:2, readiness:2, target_state_present:true });
  assert.equal(validateTrainSession(base).valid, true);
  assert.equal(validateTrainSession({ ...base, carryover: 3 }).valid, true);
  assert.equal(validateTrainSession({ ...base, carryover: 4 }).valid, false);
});
