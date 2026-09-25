/**
 * STILL WATER Practice Protocol 1.0
 * Frozen behavioral constants. Any material change requires a protocol version change.
 */
export const PROTOCOL_VERSION = '1.0';
export const APP_VERSION = '0.3.0';
// Backward-compatible alias retained for older kernel imports.
export const APP_KERNEL_VERSION = APP_VERSION;

export const TRAINING_STAGES = Object.freeze([
  'foundation',
  'association',
  'compression_1',
  'compression_2',
  'generalization',
  'robustification',
  'maintenance'
]);

export const DEPLOY_VARIANTS = Object.freeze(['60', '30', '15', 'immediate']);

export const CONTEXT_TASKS = Object.freeze([
  'work', 'chess', 'writing', 'reading', 'coding', 'exercise',
  'conversation', 'creative', 'other'
]);

export const CONTEXT_MODIFIERS = Object.freeze([
  'seated', 'standing', 'after_walking', 'ambient_noise',
  'unfamiliar_room', 'different_time'
]);

export const GENERALIZATION_CLASSES = Object.freeze([
  'seated_cognitive',
  'movement_adjacent',
  'mild_distraction',
  'different_time'
]);

export const PERTURBATION_TYPES = Object.freeze([
  'difficult_puzzle',
  'brief_arithmetic',
  'brisk_walk',
  'ambient_distraction',
  'other_benign'
]);

export const PROTOCOL = deepFreeze({
  version: PROTOCOL_VERSION,
  train: {
    regulate: {
      durationMs: 120_000,
      inhaleMs: 4_000,
      exhaleMs: 6_000,
      holdMs: 0,
      expectedCycles: 12
    },
    stabilize: { durationMs: 300_000 },
    releaseCount: { durationMs: 30_000 },
    releaseAnchor: { durationMs: 30_000 },
    open: { durationMs: 180_000 },
    encode: { durationMs: 20_000 },
    transfer: { nominalDurationMs: 60_000, hardDeadline: false }
  },
  deploy: {
    '60': {
      maxDurationMs: 60_000,
      cueSchedule: [
        { startMs: 0, endMs: 10_000, cue: 'settle' },
        { startMs: 10_000, endMs: 20_000, cue: 'release_widen_still' },
        { startMs: 20_000, endMs: 60_000, cue: 'ready' }
      ]
    },
    '30': {
      maxDurationMs: 30_000,
      cueSchedule: [
        { startMs: 0, endMs: 5_000, cue: 'settle' },
        { startMs: 5_000, endMs: 12_000, cue: 'release_widen_still' },
        { startMs: 12_000, endMs: 30_000, cue: 'ready' }
      ]
    },
    '15': {
      maxDurationMs: 15_000,
      cueSchedule: [
        { startMs: 0, endMs: 7_000, cue: 'release_widen_still' },
        { startMs: 7_000, endMs: 15_000, cue: 'ready' }
      ]
    },
    immediate: {
      maxDurationMs: 15_000,
      cueSchedule: [
        { startMs: 0, endMs: 15_000, cue: 'release_widen_still_ready' }
      ]
    }
  },
  progression: {
    foundation: {
      minimumCompletedTrainSessions: 7,
      recentWindow: 7,
      requiredTargetStateCount: 4,
      maximumDrowsinessCount: 2
    },
    respiratoryBlock: {
      window: 5,
      minimumDiscomfortCount: 2,
      clearAfterConsecutiveComfortableSessions: 4
    },
    association: {
      recentWindow: 8,
      requiredSuccesses: 6,
      variant: '60'
    },
    compression1: {
      recentWindow: 8,
      requiredSuccesses: 6,
      minimumDistinctOrdinaryContexts: 2,
      variant: '30',
      fallbackWindow: 6,
      fallbackIfSuccessesBelow: 3,
      fallbackVariant: '60'
    },
    compression2: {
      recentWindow: 8,
      requiredSuccesses: 6,
      minimumDistinctOrdinaryContexts: 3,
      variant: '15',
      fallbackVariant: '30'
    },
    generalization: {
      minimumTrialsPerClass: 4,
      minimumSuccessRate: 0.70
    },
    robustification: {
      minimumDaysSinceFirstCompletedTrain: 28
    }
  }
});

export function targetStatePresent({ stillness, breadth, effortlessness, readiness }) {
  return [stillness, breadth, effortlessness, readiness].every((value) => value >= 2);
}

export function deployMaxDurationMs(variant) {
  const config = PROTOCOL.deploy[variant];
  if (!config) throw new Error(`Unknown deploy variant: ${variant}`);
  return config.maxDurationMs;
}

export function breathingCyclePosition(elapsedMs) {
  const { inhaleMs, exhaleMs } = PROTOCOL.train.regulate;
  const cycleMs = inhaleMs + exhaleMs;
  const position = modulo(elapsedMs, cycleMs);
  return position < inhaleMs
    ? { phase: 'inhale', elapsedInPhaseMs: position, durationMs: inhaleMs }
    : { phase: 'exhale', elapsedInPhaseMs: position - inhaleMs, durationMs: exhaleMs };
}

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}
