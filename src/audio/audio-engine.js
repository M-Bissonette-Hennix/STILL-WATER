export class AudioEngine {
  #context = null;
  #enabled = true;
  #volume = 0.28;
  #primed = false;

  configure({ enabled, volume }) {
    this.#enabled = Boolean(enabled);
    this.#volume = Math.max(0, Math.min(1, Number(volume) || 0));
  }

  async unlock() {
    if (!this.#enabled) return false;

    // Safari/iOS exposes Audio Session on newer releases. Playback mode is a
    // progressive enhancement: unsupported browsers simply ignore this path.
    try {
      if (globalThis.navigator?.audioSession && 'type' in globalThis.navigator.audioSession) {
        globalThis.navigator.audioSession.type = 'playback';
      }
    } catch (_) {
      // Audio Session is optional and must never block the practice.
    }

    const AudioContextCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AudioContextCtor) return false;

    if (!this.#context || this.#context.state === 'closed') {
      this.#context = new AudioContextCtor({ latencyHint: 'interactive' });
      this.#primed = false;
    }

    // iOS may report states other than exactly "suspended" after interruptions.
    // Resume whenever the context is not already running.
    if (this.#context.state !== 'running') {
      try { await this.#context.resume(); } catch (_) {}
    }

    if (this.#context.state !== 'running') return false;

    // Prime the output graph once from the user's BEGIN / TEST AUDIO gesture.
    // The buffer is intentionally silent; it only establishes an active route.
    if (!this.#primed) {
      try {
        const buffer = this.#context.createBuffer(1, 1, 22050);
        const source = this.#context.createBufferSource();
        const gain = this.#context.createGain();
        source.buffer = buffer;
        gain.gain.setValueAtTime(0.000001, this.#context.currentTime);
        source.connect(gain).connect(this.#context.destination);
        source.start();
        this.#primed = true;
      } catch (_) {
        // Priming failure is non-fatal if the context itself is running.
      }
    }

    return true;
  }

  async cue(kind = 'phase') {
    if (!this.#enabled) return false;
    const ok = await this.unlock().catch(() => false);
    if (!ok) return false;

    const map = {
      start:    { frequency: 392, seconds: 0.30, interval: 1.50 },
      phase:    { frequency: 330, seconds: 0.26, interval: 1.50 },
      open:     { frequency: 294, seconds: 0.34, interval: 1.50 },
      encode:   { frequency: 370, seconds: 0.28, interval: 1.50 },
      transfer: { frequency: 262, seconds: 0.32, interval: 1.50 },
      deploy:   { frequency: 349, seconds: 0.26, interval: 1.50 },
      end:      { frequency: 247, seconds: 0.36, interval: 1.50 },
      test:     { frequency: 440, seconds: 0.42, interval: 1.50 }
    };

    const spec = map[kind] ?? map.phase;
    const now = this.#context.currentTime;
    // The previous build attenuated the stored 0.28 volume to ~0.034 peak,
    // which was easy to miss on a phone. Keep the cue restrained but audible.
    const peak = Math.max(0.06, Math.min(0.30, 0.055 + (this.#volume * 0.26)));

    const root = this.#context.createOscillator();
    const overtone = this.#context.createOscillator();
    const rootGain = this.#context.createGain();
    const overtoneGain = this.#context.createGain();

    root.type = 'sine';
    overtone.type = 'sine';
    root.frequency.setValueAtTime(spec.frequency, now);
    overtone.frequency.setValueAtTime(spec.frequency * spec.interval, now);

    shapeEnvelope(rootGain.gain, now, spec.seconds, peak * 0.78);
    shapeEnvelope(overtoneGain.gain, now, spec.seconds * 0.88, peak * 0.22);

    root.connect(rootGain).connect(this.#context.destination);
    overtone.connect(overtoneGain).connect(this.#context.destination);

    root.start(now);
    overtone.start(now + 0.008);
    root.stop(now + spec.seconds + 0.04);
    overtone.stop(now + spec.seconds + 0.04);
    return true;
  }
}

function shapeEnvelope(param, now, seconds, peak) {
  const floor = 0.0001;
  const attack = Math.min(0.022, seconds * 0.18);
  param.cancelScheduledValues(now);
  param.setValueAtTime(floor, now);
  param.exponentialRampToValueAtTime(Math.max(floor, peak), now + attack);
  param.exponentialRampToValueAtTime(floor, now + seconds);
}
