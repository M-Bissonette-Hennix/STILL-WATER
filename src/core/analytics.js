import { isEligibleTrain, isEligibleDeploy, classifyGeneralizationSession } from './progression-engine.js';

export function median(values) {
  const nums = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

export function summarizeTrain(trainSessions, { window = 7 } = {}) {
  const eligible = trainSessions.filter(isEligibleTrain).sort(byStartedAtAsc);
  const recent = eligible.slice(-window);
  const dimensionMedian = Object.fromEntries(
    ['stillness', 'breadth', 'effortlessness', 'readiness'].map((key) => [key, median(recent.map((s) => s[key]))])
  );
  const carryoverValues = recent.map((s) => s.carryover).filter(Number.isFinite);
  const transferCount = recent.filter((s) => s.transfer_task_begun === true).length;
  const targetCount = recent.filter((s) => s.target_state_present === true).length;
  return Object.freeze({
    window,
    completedCount: eligible.length,
    recentCount: recent.length,
    targetCount,
    targetRate: recent.length ? targetCount / recent.length : null,
    dimensionMedian: Object.freeze(dimensionMedian),
    carryoverMedian: median(carryoverValues),
    carryoverObservations: carryoverValues.length,
    transferCount,
    drowsinessCount: recent.filter((s) => s.drowsiness_flag === true).length,
    respiratoryDiscomfortCount: recent.filter((s) => s.respiratory_discomfort_flag === true).length
  });
}

export function summarizeDeploy(deploySessions, variant, { gateWindow = 8, latencyWindow = 5 } = {}) {
  if (!variant) return Object.freeze({ variant: null, eligibleCount: 0, recentCount: 0, successes: 0, successRate: null, recentMedianMs: null, previousMedianMs: null, deltaMs: null });
  const eligible = deploySessions
    .filter(isEligibleDeploy)
    .filter((s) => String(s.variant) === String(variant))
    .sort(byStartedAtAsc);
  const recent = eligible.slice(-gateWindow);
  const successes = recent.filter((s) => s.retrieval_success === true).length;
  const successfulLatencies = eligible
    .filter((s) => s.retrieval_success === true && Number.isFinite(s.retrieval_latency_ms))
    .map((s) => s.retrieval_latency_ms);
  const current = successfulLatencies.slice(-latencyWindow);
  const previous = successfulLatencies.slice(-(latencyWindow * 2), -latencyWindow);
  const recentMedianMs = current.length ? median(current) : null;
  const previousMedianMs = previous.length === latencyWindow ? median(previous) : null;
  return Object.freeze({
    variant: String(variant),
    eligibleCount: eligible.length,
    recentCount: recent.length,
    successes,
    successRate: recent.length ? successes / recent.length : null,
    recentMedianMs,
    previousMedianMs,
    deltaMs: recentMedianMs !== null && previousMedianMs !== null ? recentMedianMs - previousMedianMs : null
  });
}

export function summarizeRobustification(deploySessions) {
  const trials = deploySessions
    .filter(isEligibleDeploy)
    .filter((s) => s.perturbation !== null)
    .sort(byStartedAtAsc);
  const successful = trials.filter((s) => s.retrieval_success === true && Number.isFinite(s.retrieval_latency_ms));
  return Object.freeze({
    trials: trials.length,
    successful: successful.length,
    medianRecoveryMs: median(successful.map((s) => s.retrieval_latency_ms))
  });
}

export function deriveDailyDirective({ trainSessions, deploySessions, progress, now = new Date() }) {
  const day = localDay(now);
  const trainToday = trainSessions.some((s) => isEligibleTrain(s) && localDay(new Date(s.started_at)) === day);
  const stage = progress?.highest_stage_unlocked ?? 'foundation';
  const variant = progress?.recommended_deploy_variant ?? null;
  const deployToday = deploySessions.some((s) => isEligibleDeploy(s) && localDay(new Date(s.started_at)) === day);

  if (!trainToday) {
    return Object.freeze({ kind: 'train', title: 'TRAIN today', copy: 'Daily formal practice is the primary exposure.', action: 'open-train', actionLabel: 'BEGIN TRAIN' });
  }
  if (stage !== 'foundation' && variant && !deployToday) {
    return Object.freeze({ kind: 'deploy', title: `DEPLOY ${variant}`, copy: 'Add one retrieval attempt after today’s TRAIN.', action: 'open-deploy', actionLabel: `BEGIN DEPLOY ${variant}` });
  }
  return Object.freeze({ kind: 'complete', title: 'Core practice complete', copy: 'No additional session is required today.', action: null, actionLabel: null });
}

export function nextGeneralizationGap(generalizationGate) {
  const classes = generalizationGate?.classes;
  if (!classes) return null;
  const rows = Object.entries(classes).map(([name, stat]) => ({ name, ...stat }));
  const unmet = rows.filter((row) => row.met !== true);
  if (!unmet.length) return null;
  unmet.sort((a, b) => (a.trials - b.trials) || (a.successRate - b.successRate) || a.name.localeCompare(b.name));
  return Object.freeze(unmet[0]);
}

export function backupRecommended({ trainSessions, settings, now = new Date() }) {
  const completed = trainSessions.filter(isEligibleTrain);
  if (completed.length < 7) return false;
  const last = settings?.last_export_at;
  if (!last || Number.isNaN(Date.parse(last))) return true;
  const ageDays = Math.floor((now.getTime() - Date.parse(last)) / 86_400_000);
  if (ageDays >= 30) return true;
  return completed.some((s) => Date.parse(s.started_at) > Date.parse(last)) && completed.filter((s) => Date.parse(s.started_at) > Date.parse(last)).length >= 14;
}

export function classifyGeneralizationLabel(session) {
  return [...classifyGeneralizationSession(session)];
}

function byStartedAtAsc(a, b) {
  return Date.parse(a.started_at) - Date.parse(b.started_at);
}

function localDay(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
