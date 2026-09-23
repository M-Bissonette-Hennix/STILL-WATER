import {
  PROTOCOL,
  TRAINING_STAGES,
  GENERALIZATION_CLASSES,
  targetStatePresent
} from './protocol.js';

const STAGE_INDEX = new Map(TRAINING_STAGES.map((stage, index) => [stage, index]));

export function isEligibleTrain(session) {
  return session?.status === 'completed';
}

export function isEligibleDeploy(session) {
  return session && !['interrupted', 'aborted', 'technical_error'].includes(session.status);
}

export function deriveTargetState(session) {
  return targetStatePresent(session);
}

export function respiratoryProgressionBlock(trainSessions) {
  const completed = trainSessions.filter(isEligibleTrain).sort(byStartedAtAsc);
  const { window, minimumDiscomfortCount, clearAfterConsecutiveComfortableSessions } = PROTOCOL.progression.respiratoryBlock;
  const latest = completed.slice(-window);
  const discomfortCount = latest.filter((s) => s.respiratory_discomfort_flag === true).length;
  const triggered = latest.length >= minimumDiscomfortCount && discomfortCount >= minimumDiscomfortCount;

  if (!triggered) return false;

  const tail = completed.slice(-clearAfterConsecutiveComfortableSessions);
  const cleared = tail.length === clearAfterConsecutiveComfortableSessions && tail.every((s) => s.respiratory_discomfort_flag !== true);
  return !cleared;
}

export function foundationGate(trainSessions) {
  const cfg = PROTOCOL.progression.foundation;
  const completed = trainSessions.filter(isEligibleTrain).sort(byStartedAtAsc);
  const recent = completed.slice(-cfg.recentWindow);
  const targetCount = recent.filter(deriveTargetState).length;
  const drowsinessCount = recent.filter((s) => s.drowsiness_flag === true).length;
  const respiratoryBlocked = respiratoryProgressionBlock(completed);

  return Object.freeze({
    met: completed.length >= cfg.minimumCompletedTrainSessions &&
      recent.length === cfg.recentWindow &&
      targetCount >= cfg.requiredTargetStateCount &&
      drowsinessCount <= cfg.maximumDrowsinessCount &&
      !respiratoryBlocked,
    completedTrainSessions: completed.length,
    recentCount: recent.length,
    targetCount,
    drowsinessCount,
    respiratoryBlocked
  });
}

export function deployWindowGate(deploySessions, variant, window, requiredSuccesses, stage = null) {
  const eligible = deploySessions
    .filter(isEligibleDeploy)
    .filter((s) => String(s.variant) === String(variant))
    .filter((s) => stage === null || s.training_stage_at_start === stage)
    .sort(byStartedAtAsc);
  const recent = eligible.slice(-window);
  const successes = recent.filter((s) => s.retrieval_success === true).length;
  return Object.freeze({
    met: recent.length === window && successes >= requiredSuccesses,
    eligibleCount: eligible.length,
    recentCount: recent.length,
    successes
  });
}

export function associationGate(deploySessions) {
  const cfg = PROTOCOL.progression.association;
  return deployWindowGate(deploySessions, cfg.variant, cfg.recentWindow, cfg.requiredSuccesses, 'association');
}

export function compression1Gate(deploySessions) {
  const cfg = PROTOCOL.progression.compression1;
  const base = deployWindowGate(deploySessions, cfg.variant, cfg.recentWindow, cfg.requiredSuccesses, 'compression_1');
  const contexts = distinctOrdinaryContexts(deploySessions, cfg.variant, cfg.recentWindow, 'compression_1');
  return Object.freeze({
    ...base,
    distinctOrdinaryContexts: contexts.size,
    met: base.met && contexts.size >= cfg.minimumDistinctOrdinaryContexts
  });
}

export function compression2Gate(deploySessions) {
  const cfg = PROTOCOL.progression.compression2;
  const base = deployWindowGate(deploySessions, cfg.variant, cfg.recentWindow, cfg.requiredSuccesses, 'compression_2');
  const contexts = distinctOrdinaryContexts(deploySessions, cfg.variant, cfg.recentWindow, 'compression_2');
  return Object.freeze({
    ...base,
    distinctOrdinaryContexts: contexts.size,
    met: base.met && contexts.size >= cfg.minimumDistinctOrdinaryContexts
  });
}

export function recommendedDeployVariant({ highestStageUnlocked, deploySessions }) {
  if (stageAtLeast(highestStageUnlocked, 'compression_2')) {
    const recent15 = eligibleVariant(deploySessions, '15').slice(-6);
    if (recent15.length === 6 && successes(recent15) < 3) return '30';
    return '15';
  }
  if (stageAtLeast(highestStageUnlocked, 'compression_1')) {
    const cfg = PROTOCOL.progression.compression1;
    const recent30 = eligibleVariant(deploySessions, '30').slice(-cfg.fallbackWindow);
    if (recent30.length === cfg.fallbackWindow && successes(recent30) < cfg.fallbackIfSuccessesBelow) return cfg.fallbackVariant;
    return '30';
  }
  if (stageAtLeast(highestStageUnlocked, 'association')) return '60';
  return null;
}

export function classifyGeneralizationSession(session) {
  const modifiers = new Set(session?.context?.modifiers ?? []);
  const task = session?.context?.task ?? null;
  const classes = new Set();

  if (['work', 'chess', 'writing', 'reading', 'coding', 'creative'].includes(task) && modifiers.has('seated')) {
    classes.add('seated_cognitive');
  }
  if (modifiers.has('standing') || modifiers.has('after_walking')) classes.add('movement_adjacent');
  if (modifiers.has('ambient_noise') || modifiers.has('unfamiliar_room')) classes.add('mild_distraction');
  if (modifiers.has('different_time')) classes.add('different_time');

  return classes;
}

export function generalizationGate(deploySessions) {
  const cfg = PROTOCOL.progression.generalization;
  const eligible = deploySessions
    .filter(isEligibleDeploy)
    .filter((s) => s.training_stage_at_start === 'generalization');
  const stats = Object.fromEntries(GENERALIZATION_CLASSES.map((name) => [name, { trials: 0, successes: 0, successRate: 0, met: false }]));

  for (const session of eligible) {
    for (const className of classifyGeneralizationSession(session)) {
      stats[className].trials += 1;
      if (session.retrieval_success === true) stats[className].successes += 1;
    }
  }

  for (const className of GENERALIZATION_CLASSES) {
    const stat = stats[className];
    stat.successRate = stat.trials > 0 ? stat.successes / stat.trials : 0;
    stat.met = stat.trials >= cfg.minimumTrialsPerClass && stat.successRate >= cfg.minimumSuccessRate;
    Object.freeze(stat);
  }

  return Object.freeze({
    met: GENERALIZATION_CLASSES.every((name) => stats[name].met),
    classes: Object.freeze(stats)
  });
}

export function robustificationGate({ trainSessions, generalizationComplete, nowMs = Date.now() }) {
  const completed = trainSessions.filter(isEligibleTrain).sort(byStartedAtAsc);
  const first = completed[0];
  const blocked = respiratoryProgressionBlock(completed);
  if (!first) return Object.freeze({ met: false, daysSinceFirstCompletedTrain: 0, respiratoryBlocked: blocked });
  const firstMs = Date.parse(first.started_at);
  const days = Math.floor((nowMs - firstMs) / 86_400_000);
  return Object.freeze({
    met: Boolean(generalizationComplete) && days >= PROTOCOL.progression.robustification.minimumDaysSinceFirstCompletedTrain && !blocked,
    daysSinceFirstCompletedTrain: Math.max(0, days),
    respiratoryBlocked: blocked
  });
}

export function deriveProgress({ trainSessions = [], deploySessions = [], previousHighestStage = 'foundation', nowMs = Date.now() }) {
  const foundation = foundationGate(trainSessions);
  const association = associationGate(deploySessions);
  const compression1 = compression1Gate(deploySessions);
  const compression2 = compression2Gate(deploySessions);
  const generalization = generalizationGate(deploySessions);
  const robustification = robustificationGate({ trainSessions, generalizationComplete: generalization.met, nowMs });

  let evidenceStage = 'foundation';
  if (foundation.met) evidenceStage = 'association';
  if (foundation.met && association.met) evidenceStage = 'compression_1';
  if (foundation.met && association.met && compression1.met) evidenceStage = 'compression_2';
  if (foundation.met && association.met && compression1.met && compression2.met) evidenceStage = 'generalization';
  if (foundation.met && association.met && compression1.met && compression2.met && generalization.met) evidenceStage = 'robustification';
  // Practice v1.0 defines how Robustification is unlocked but does not define
  // a criterion for completing Robustification and entering Maintenance.
  // Do not invent a Maintenance gate in software.

  const highestStageUnlocked = laterStage(previousHighestStage, evidenceStage);
  return Object.freeze({
    highestStageUnlocked,
    evidenceStage,
    recommendedDeployVariant: recommendedDeployVariant({ highestStageUnlocked, deploySessions }),
    respiratoryProgressionBlock: respiratoryProgressionBlock(trainSessions),
    gates: Object.freeze({ foundation, association, compression1, compression2, generalization, robustification })
  });
}

export function medianSuccessfulLatency(deploySessions, variant = null) {
  const values = deploySessions
    .filter(isEligibleDeploy)
    .filter((s) => s.retrieval_success === true)
    .filter((s) => variant === null || String(s.variant) === String(variant))
    .map((s) => s.retrieval_latency_ms)
    .filter((n) => Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b);
  if (values.length === 0) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

function eligibleVariant(deploySessions, variant) {
  return deploySessions.filter(isEligibleDeploy).filter((s) => String(s.variant) === String(variant)).sort(byStartedAtAsc);
}

function successes(sessions) {
  return sessions.filter((s) => s.retrieval_success === true).length;
}

function distinctOrdinaryContexts(deploySessions, variant, window, stage = null) {
  const recent = eligibleVariant(deploySessions, variant)
    .filter((s) => stage === null || s.training_stage_at_start === stage)
    .slice(-window);
  return new Set(recent.map((s) => s.context?.task).filter(Boolean));
}

function laterStage(a, b) {
  if (!STAGE_INDEX.has(a)) throw new Error(`Unknown stage: ${a}`);
  if (!STAGE_INDEX.has(b)) throw new Error(`Unknown stage: ${b}`);
  return STAGE_INDEX.get(a) >= STAGE_INDEX.get(b) ? a : b;
}

function stageAtLeast(stage, threshold) {
  return STAGE_INDEX.get(stage) >= STAGE_INDEX.get(threshold);
}

function byStartedAtAsc(a, b) {
  return Date.parse(a.started_at) - Date.parse(b.started_at);
}
