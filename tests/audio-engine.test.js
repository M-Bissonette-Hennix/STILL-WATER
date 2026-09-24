import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine, TRAIN_TIMELINE_OFFSETS_SECONDS } from '../src/audio/audio-engine.js';

class FakeMedia {
  constructor(src) {
    this.src = src;
    this.preload = '';
    this.volume = 1;
    this.currentTime = 0;
    this.playCalls = 0;
    this.pauseCalls = 0;
    this.loadCalls = 0;
    this.listeners = new Map();
  }
  load() { this.loadCalls += 1; }
  play() { this.playCalls += 1; return Promise.resolve(); }
  pause() { this.pauseCalls += 1; }
  addEventListener(type, fn) { this.listeners.set(type, fn); }
}

function harness() {
  const created = [];
  const mediaFactory = src => {
    const m = new FakeMedia(src);
    created.push(m);
    return m;
  };
  return { created, audio: new AudioEngine({ mediaFactory }) };
}

test('explicit cues use fresh HTML media elements rather than a shared AudioContext', async () => {
  const { created, audio } = harness();
  audio.configure({ enabled: true, volume: 0.28 });
  assert.equal(await audio.playOneShot('test'), true);
  assert.equal(await audio.playOneShot('start'), true);
  assert.equal(created.length, 2);
  assert.notEqual(created[0], created[1]);
  assert.equal(created[0].playCalls, 1);
  assert.equal(created[1].playCalls, 1);
  assert.match(created[0].src, /assets\/audio\/cue\.mp3$/);
});

test('TEST AUDIO can force playback even when transition tones are disabled', async () => {
  const { created, audio } = harness();
  audio.configure({ enabled: false, volume: 0.28 });
  assert.equal(await audio.playOneShot('phase'), false);
  assert.equal(created.length, 0);
  assert.equal(await audio.playOneShot('test', { force: true }), true);
  assert.equal(created.length, 1);
  assert.equal(created[0].volume, 1);
});


test('timed transition diagnostic is a media track that can sound later without a second play call', async () => {
  const { created, audio } = harness();
  audio.configure({ enabled: true, volume: 0.28 });
  assert.equal(await audio.testTimedTransition(), true);
  assert.equal(created.length, 1);
  assert.equal(created[0].playCalls, 1);
  assert.match(created[0].src, /assets\/audio\/transition-test\.mp3$/);
});

test('TRAIN timeline is one continuous media element and can restart at a canonical phase offset', async () => {
  const { created, audio } = harness();
  audio.configure({ enabled: true, volume: 0.28 });
  assert.equal(audio.prepare(), true);
  assert.equal(created.length, 1);
  const timeline = created[0];
  assert.equal(timeline.loadCalls, 1);
  assert.match(timeline.src, /assets\/audio\/train-timeline\.mp3$/);

  assert.equal(await audio.startTrainTimeline(0), true);
  assert.equal(timeline.playCalls, 1);
  assert.equal(timeline.currentTime, 0);

  assert.equal(await audio.startTrainTimeline(TRAIN_TIMELINE_OFFSETS_SECONDS.OPEN), true);
  assert.equal(created.length, 1, 'timeline element should be reused within the session');
  assert.equal(timeline.currentTime, 480);
  assert.equal(timeline.playCalls, 2);
  assert.ok(timeline.pauseCalls >= 2);
});

test('TRAIN timeline offsets exactly match Practice 1.0 phase boundaries', () => {
  assert.deepEqual(TRAIN_TIMELINE_OFFSETS_SECONDS, {
    REGULATE: 0,
    STABILIZE: 120,
    RELEASE_COUNT: 420,
    RELEASE_ANCHOR: 450,
    OPEN: 480,
    ENCODE: 660,
    TRANSFER: 680
  });
});
