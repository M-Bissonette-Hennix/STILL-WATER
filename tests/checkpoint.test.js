import test from 'node:test';
import assert from 'node:assert/strict';
import { saveCheckpoint, loadCheckpoint, clearCheckpoint, checkpointKey } from '../src/data/checkpoint.js';

function memoryStorage() {
  const map = new Map();
  return {
    setItem: (k,v) => map.set(k,String(v)),
    getItem: k => map.has(k) ? map.get(k) : null,
    removeItem: k => map.delete(k),
    raw: map
  };
}

const valid = {
  mode: 'train', session_id: 'abc', state: 'OPEN',
  started_at: '2026-09-23T12:00:00.000Z', updated_at: '2026-09-23T12:03:00.000Z'
};

test('checkpoint round-trips and clears', () => {
  const storage = memoryStorage();
  assert.equal(saveCheckpoint(storage, valid), true);
  assert.deepEqual(loadCheckpoint(storage), valid);
  assert.equal(clearCheckpoint(storage), true);
  assert.equal(loadCheckpoint(storage), null);
});

test('corrupt checkpoint is discarded', () => {
  const storage = memoryStorage();
  storage.setItem(checkpointKey(), '{broken');
  assert.equal(loadCheckpoint(storage), null);
  assert.equal(storage.getItem(checkpointKey()), null);
});

test('invalid checkpoint mode is rejected', () => {
  const storage = memoryStorage();
  assert.throws(() => saveCheckpoint(storage, { ...valid, mode: 'other' }));
});
