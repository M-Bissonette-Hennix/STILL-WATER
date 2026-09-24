const CUE_URL = new URL('../../assets/audio/cue.mp3', import.meta.url).href;
const TRAIN_TIMELINE_URL = new URL('../../assets/audio/train-timeline.mp3', import.meta.url).href;
const TRANSITION_TEST_URL = new URL('../../assets/audio/transition-test.mp3', import.meta.url).href;

export const TRAIN_TIMELINE_OFFSETS_SECONDS = Object.freeze({
  REGULATE: 0,
  STABILIZE: 120,
  RELEASE_COUNT: 420,
  RELEASE_ANCHOR: 450,
  OPEN: 480,
  ENCODE: 660,
  TRANSFER: 680
});

export class AudioEngine {
  #enabled = true;
  #volume = 0.28;
  #timeline = null;
  #timelineStopTimer = null;
  #activeOneShots = new Set();
  #mediaFactory;

  constructor({ mediaFactory = defaultMediaFactory } = {}) {
    this.#mediaFactory = mediaFactory;
  }

  configure({ enabled, volume }) {
    this.#enabled = Boolean(enabled);
    this.#volume = clamp(Number(volume) || 0, 0, 1);
    if (this.#timeline) this.#timeline.volume = this.#mediaVolume();
  }

  /**
   * Prepare the long-lived TRAIN timeline without attempting playback.
   * This is intentionally best-effort: iOS may defer media loading until the
   * first user gesture, but service-worker precaching still makes the asset local.
   */
  prepare() {
    try {
      const media = this.#ensureTimeline();
      media.preload = 'auto';
      media.load?.();
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Play a short cue using a FRESH HTMLMediaElement. Unlike the previous Web Audio implementation, this never treats an internal
   * engine state as proof of audible speaker output. Calls from buttons/forms retain a direct user gesture.
   */
  async playOneShot(_kind = 'phase', { force = false } = {}) {
    if (!this.#enabled && !force) return false;
    let media;
    try {
      media = this.#newMedia(CUE_URL);
      media.preload = 'auto';
      media.volume = this.#mediaVolume({ force });
      media.currentTime = 0;
      this.#activeOneShots.add(media);
      const cleanup = () => this.#activeOneShots.delete(media);
      media.addEventListener?.('ended', cleanup, { once: true });
      media.addEventListener?.('error', cleanup, { once: true });
      const result = media.play?.();
      if (result && typeof result.then === 'function') await result;
      return true;
    } catch (_) {
      if (media) this.#activeOneShots.delete(media);
      return false;
    }
  }


  async testTimedTransition() {
    if (!this.#enabled) return false;
    let media;
    try {
      media = this.#newMedia(TRANSITION_TEST_URL);
      media.preload = 'auto';
      media.volume = this.#mediaVolume({ force: true });
      this.#activeOneShots.add(media);
      const cleanup = () => this.#activeOneShots.delete(media);
      media.addEventListener?.('ended', cleanup, { once: true });
      media.addEventListener?.('error', cleanup, { once: true });
      const result = media.play?.();
      if (result && typeof result.then === 'function') await result;
      return true;
    } catch (_) {
      if (media) this.#activeOneShots.delete(media);
      return false;
    }
  }

  /**
   * Start (or restart) the continuous TRAIN cue timeline. The crucial property
   * is that play() is invoked from the user's explicit CONTINUE/RESUME tap.
   * Automatic phase cues are already embedded in the file at protocol offsets,
   * so no later timer callback has to initiate a new sound on iOS.
   */
  async startTrainTimeline(offsetSeconds = 0) {
    if (!this.#enabled) return false;
    const media = this.#ensureTimeline();
    this.#clearTimelineStopTimer();
    try {
      media.pause?.();
      media.volume = this.#mediaVolume();
      if (Number.isFinite(offsetSeconds) && offsetSeconds >= 0) {
        try { media.currentTime = offsetSeconds; } catch (_) {}
      }
      const result = media.play?.();
      if (result && typeof result.then === 'function') await result;
      return true;
    } catch (_) {
      return false;
    }
  }

  pauseTrainTimeline() {
    this.#clearTimelineStopTimer();
    try { this.#timeline?.pause?.(); } catch (_) {}
  }

  stopTrainTimeline({ afterMs = 0, reset = true } = {}) {
    this.#clearTimelineStopTimer();
    const stop = () => {
      try { this.#timeline?.pause?.(); } catch (_) {}
      if (reset && this.#timeline) {
        try { this.#timeline.currentTime = 0; } catch (_) {}
      }
    };
    if (afterMs > 0) this.#timelineStopTimer = setTimeout(stop, afterMs);
    else stop();
  }

  trainTimelineCurrentTime() {
    return Number(this.#timeline?.currentTime) || 0;
  }

  #ensureTimeline() {
    if (!this.#timeline) {
      this.#timeline = this.#newMedia(TRAIN_TIMELINE_URL);
      this.#timeline.preload = 'auto';
      this.#timeline.volume = this.#mediaVolume();
    }
    return this.#timeline;
  }

  #newMedia(src) {
    const media = this.#mediaFactory(src);
    if (!media) throw new Error('HTML audio is unavailable');
    if (!media.src) media.src = src;
    return media;
  }

  #mediaVolume({ force = false } = {}) {
    // iOS may route volume exclusively through the hardware controls. Browsers
    // that honor element.volume still receive a clear, restrained cue level.
    if (force) return 1;
    return clamp(0.68 + (this.#volume * 0.30), 0.68, 0.98);
  }

  #clearTimelineStopTimer() {
    if (this.#timelineStopTimer !== null) clearTimeout(this.#timelineStopTimer);
    this.#timelineStopTimer = null;
  }
}

function defaultMediaFactory(src) {
  if (typeof Audio === 'function') return new Audio(src);
  if (globalThis.document?.createElement) {
    const media = globalThis.document.createElement('audio');
    media.src = src;
    return media;
  }
  throw new Error('HTML audio is unavailable');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
