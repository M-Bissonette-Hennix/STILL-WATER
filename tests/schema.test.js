import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTrainSession, makeDeploySession, validateTrainSession, validateDeploySession, validateExportBundle } from '../src/data/schema.js';
import { buildExportBundle, parseAndValidateExport } from '../src/data/export.js';

test('valid TRAIN session passes', () => {
  const s = makeTrainSession({ stillness: 2, breadth: 2, effortlessness: 2, readiness: 2 });
  assert.equal(validateTrainSession(s).valid, true);
});

test('TRAIN rating outside 0..3 is rejected', () => {
  const s = makeTrainSession({ stillness: 4 });
  const v = validateTrainSession(s);
  assert.equal(v.valid, false);
  assert.match(v.errors.join(' '), /stillness/);
});

test('negative retrieval latency is rejected', () => {
  const s = makeDeploySession({ retrieval_latency_ms: -1 });
  assert.equal(validateDeploySession(s).valid, false);
});

test('impossible DEPLOY variant is rejected', () => {
  const s = makeDeploySession({ variant: '45' });
  assert.equal(validateDeploySession(s).valid, false);
});

test('malformed timestamp is rejected', () => {
  const s = makeTrainSession({ started_at: 'not-a-date' });
  assert.equal(validateTrainSession(s).valid, false);
});

test('export refuses duplicate session IDs', () => {
  const t = makeTrainSession({ id: 'same' });
  const d = makeDeploySession({ id: 'same' });
  const bundle = {
    export_format: 'still-water', export_version: 1, generated_at: new Date().toISOString(),
    profile: null, settings: null, train_sessions: [t], deploy_sessions: [d], progress_state: null
  };
  assert.equal(validateExportBundle(bundle).valid, false);
});

test('export round-trip parses and validates', () => {
  const bundle = buildExportBundle({
    trainSessions: [makeTrainSession()],
    deploySessions: [makeDeploySession({ retrieval_success: true, retrieval_latency_ms: 18342 })]
  });
  const parsed = parseAndValidateExport(JSON.stringify(bundle));
  assert.equal(parsed.valid, true);
  assert.equal(parsed.bundle.train_sessions.length, 1);
  assert.equal(parsed.bundle.deploy_sessions.length, 1);
});
