/**
 * Monotonic deadline-based timer engine.
 * Inject a monotonic clock (performance.now compatible) for deterministic tests.
 */
export class MonotonicTimer {
  #now;
  #startedAt = null;
  #durationMs = null;
  #deadline = null;
  #stoppedAt = null;

  constructor({ now = defaultMonotonicNow } = {}) {
    this.#now = now;
  }

  start(durationMs, { elapsedMs = 0 } = {}) {
    assertFiniteNonNegative(durationMs, 'durationMs');
    assertFiniteNonNegative(elapsedMs, 'elapsedMs');
    if (elapsedMs > durationMs) throw new RangeError('elapsedMs cannot exceed durationMs');
    const now = this.#now();
    this.#startedAt = now - elapsedMs;
    this.#durationMs = durationMs;
    this.#deadline = this.#startedAt + durationMs;
    this.#stoppedAt = null;
    return this.snapshot();
  }

  stop() {
    this.#assertStarted();
    if (this.#stoppedAt === null) this.#stoppedAt = this.#now();
    return this.snapshot();
  }

  get started() { return this.#startedAt !== null; }
  get stopped() { return this.#stoppedAt !== null; }
  get durationMs() { return this.#durationMs; }

  elapsedMs() {
    this.#assertStarted();
    const t = this.#stoppedAt ?? this.#now();
    return clamp(t - this.#startedAt, 0, Number.POSITIVE_INFINITY);
  }

  remainingMs() {
    this.#assertStarted();
    if (this.#stoppedAt !== null) {
      return clamp(this.#deadline - this.#stoppedAt, 0, this.#durationMs);
    }
    return clamp(this.#deadline - this.#now(), 0, this.#durationMs);
  }

  overshootMs() {
    this.#assertStarted();
    return Math.max(0, this.elapsedMs() - this.#durationMs);
  }

  expired() {
    this.#assertStarted();
    const t = this.#stoppedAt ?? this.#now();
    return t >= this.#deadline;
  }

  snapshot() {
    this.#assertStarted();
    return Object.freeze({
      startedAtMonotonicMs: this.#startedAt,
      durationMs: this.#durationMs,
      deadlineMonotonicMs: this.#deadline,
      stoppedAtMonotonicMs: this.#stoppedAt,
      elapsedMs: this.elapsedMs(),
      remainingMs: this.remainingMs(),
      overshootMs: this.overshootMs(),
      expired: this.expired()
    });
  }

  #assertStarted() {
    if (!this.started) throw new Error('Timer has not been started');
  }
}

export function classifyBackgroundInterruption({ backgroundedAtWallMs, foregroundedAtWallMs, thresholdMs = 15_000 }) {
  assertFiniteNonNegative(backgroundedAtWallMs, 'backgroundedAtWallMs');
  assertFiniteNonNegative(foregroundedAtWallMs, 'foregroundedAtWallMs');
  if (foregroundedAtWallMs < backgroundedAtWallMs) throw new Error('foregroundedAtWallMs precedes backgroundedAtWallMs');
  const durationMs = foregroundedAtWallMs - backgroundedAtWallMs;
  return Object.freeze({
    durationMs,
    substantive: durationMs > thresholdMs
  });
}

export function cueForElapsed(schedule, elapsedMs) {
  assertFiniteNonNegative(elapsedMs, 'elapsedMs');
  const entry = schedule.find(({ startMs, endMs }) => elapsedMs >= startMs && elapsedMs < endMs);
  return entry?.cue ?? null;
}

function defaultMonotonicNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  throw new Error('No monotonic performance.now() clock available');
}

function assertFiniteNonNegative(value, name) {
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${name} must be a finite non-negative number`);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
