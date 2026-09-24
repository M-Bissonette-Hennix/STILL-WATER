import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine } from '../src/audio/audio-engine.js';

class FakeParam {
  calls = [];
  cancelScheduledValues(...args) { this.calls.push(['cancel', ...args]); }
  setValueAtTime(...args) { this.calls.push(['set', ...args]); }
  exponentialRampToValueAtTime(...args) { this.calls.push(['exp', ...args]); }
}

class FakeGain {
  gain = new FakeParam();
  connect(node) { this.connectedTo = node; return node; }
}

class FakeOscillator {
  type = 'sine';
  frequency = new FakeParam();
  connect(node) { this.connectedTo = node; return node; }
  start(when) { this.startedAt = when; }
  stop(when) { this.stoppedAt = when; }
}

class FakeBufferSource {
  connect(node) { this.connectedTo = node; return node; }
  start() { this.started = true; }
}

class FakeAudioContext {
  static instances = [];
  state = 'interrupted';
  currentTime = 10;
  destination = {};
  resumeCalls = 0;
  oscillators = [];
  gains = [];
  bufferSources = [];
  constructor() { FakeAudioContext.instances.push(this); }
  async resume() { this.resumeCalls += 1; this.state = 'running'; }
  createBuffer() { return {}; }
  createBufferSource() { const s = new FakeBufferSource(); this.bufferSources.push(s); return s; }
  createGain() { const g = new FakeGain(); this.gains.push(g); return g; }
  createOscillator() { const o = new FakeOscillator(); this.oscillators.push(o); return o; }
}

test('audio unlock resumes any non-running context and primes output', async () => {
  const previous = globalThis.AudioContext;
  globalThis.AudioContext = FakeAudioContext;
  try {
    const audio = new AudioEngine();
    audio.configure({ enabled: true, volume: 0.28 });
    assert.equal(await audio.unlock(), true);
    const ctx = FakeAudioContext.instances.at(-1);
    assert.equal(ctx.resumeCalls, 1);
    assert.equal(ctx.state, 'running');
    assert.equal(ctx.bufferSources.length, 1);
    assert.equal(ctx.bufferSources[0].started, true);
  } finally {
    if (previous === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = previous;
  }
});

test('cue schedules two oscillators with non-trivial audible envelope', async () => {
  const previous = globalThis.AudioContext;
  globalThis.AudioContext = FakeAudioContext;
  FakeAudioContext.instances.length = 0;
  try {
    const audio = new AudioEngine();
    audio.configure({ enabled: true, volume: 0.28 });
    assert.equal(await audio.cue('phase'), true);
    const ctx = FakeAudioContext.instances.at(-1);
    assert.equal(ctx.oscillators.length, 2);
    assert.ok(ctx.oscillators.every(o => Number.isFinite(o.startedAt) && Number.isFinite(o.stoppedAt)));
    const peaks = ctx.gains.flatMap(g => g.gain.calls).filter(c => c[0] === 'exp').map(c => c[1]);
    assert.ok(peaks.some(v => v > 0.05), 'expected an audible peak gain above 0.05');
  } finally {
    if (previous === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = previous;
  }
});
