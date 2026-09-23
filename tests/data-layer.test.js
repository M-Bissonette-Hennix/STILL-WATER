import test from 'node:test';
import assert from 'node:assert/strict';
import { DB_NAME, DB_VERSION, STORE_NAMES } from '../src/data/migrations.js';
import { defaultSettings, validateSettings, progressRecordFromDerived } from '../src/data/db.js';

const derived = {
  highestStageUnlocked: 'compression_1', evidenceStage: 'compression_1', recommendedDeployVariant: '30',
  respiratoryProgressionBlock: false, gates: { foundation: { met: true } }
};

test('IndexedDB contract is frozen at schema v1 with all required stores', () => {
  assert.equal(DB_NAME, 'still_water');
  assert.equal(DB_VERSION, 1);
  assert.deepEqual(Object.values(STORE_NAMES).sort(), ['app_events','deploy_sessions','profile','progress_state','settings','train_sessions'].sort());
});

test('default settings are valid and local-first compatible', () => {
  const settings = defaultSettings();
  assert.equal(validateSettings(settings), true);
  assert.equal(settings.audio_enabled, true);
  assert.equal(settings.wake_lock_enabled, true);
  assert.equal(settings.onboarding_complete, false);
});

test('settings validator rejects dangerous/invalid values', () => {
  assert.throws(() => validateSettings({ ...defaultSettings(), audio_volume: 2 }));
  assert.throws(() => validateSettings({ ...defaultSettings(), timer_visibility: 'giant' }));
});

test('progress cache preserves explicit stage and records completion timestamp', () => {
  const record = progressRecordFromDerived(derived, null);
  assert.equal(record.highest_stage_unlocked, 'compression_1');
  assert.equal(record.recommended_deploy_variant, '30');
  assert.ok(record.completion.association);
  assert.ok(record.completion.compression_1);
});
