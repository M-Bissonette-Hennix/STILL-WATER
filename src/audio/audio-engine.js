export class AudioEngine {
  #context = null;
  #enabled = true;
  #volume = 0.28;

  configure({ enabled, volume }) {
    this.#enabled = Boolean(enabled);
    this.#volume = Math.max(0, Math.min(1, Number(volume) || 0));
  }

  async unlock() {
    if (!this.#enabled) return false;
    const AudioContextCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AudioContextCtor) return false;
    if (!this.#context) this.#context = new AudioContextCtor();
    if (this.#context.state === 'suspended') await this.#context.resume();
    return this.#context.state === 'running';
  }

  async cue(kind = 'phase') {
    if (!this.#enabled) return false;
    const ok = await this.unlock().catch(() => false);
    if (!ok) return false;

    const map = {
      start: [392, 0.12],
      phase: [330, 0.09],
      open: [294, 0.11],
      encode: [370, 0.08],
      transfer: [262, 0.08],
      deploy: [349, 0.07],
      end: [247, 0.12]
    };
    const [frequency, seconds] = map[kind] ?? map.phase;
    const now = this.#context.currentTime;
    const osc = this.#context.createOscillator();
    const gain = this.#context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, this.#volume * 0.12), now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    osc.connect(gain).connect(this.#context.destination);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
    return true;
  }
}
