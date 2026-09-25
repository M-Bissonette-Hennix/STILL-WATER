import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeTrain, summarizeDeploy, deriveDailyDirective, nextGeneralizationGap, backupRecommended, summarizeRobustification } from '../src/core/analytics.js';
import { makeTrainSession, makeDeploySession } from '../src/data/schema.js';

function train(day, overrides={}) {
  return makeTrainSession({
    started_at: `2026-09-${String(day).padStart(2,'0')}T12:00:00.000Z`,
    completed_at: `2026-09-${String(day).padStart(2,'0')}T12:20:00.000Z`,
    status: 'completed', stillness: 2, breadth: 2, effortlessness: 2, readiness: 2,
    target_state_present: true, transfer_task_begun: true, carryover: 2, ...overrides
  });
}

function deploy(day, latency, success=true, overrides={}) {
  return makeDeploySession({
    started_at: `2026-09-${String(day).padStart(2,'0')}T15:00:00.000Z`,
    completed_at: `2026-09-${String(day).padStart(2,'0')}T15:01:00.000Z`,
    status: success ? 'completed' : 'timeout', variant: '60', retrieval_success: success,
    retrieval_latency_ms: success ? latency : null, task_started: true, ...overrides
  });
}

test('TRAIN analytics use recent seven and preserve carryover separately from target-state scoring', () => {
  const sessions = Array.from({length: 8}, (_, i) => train(i+1, i === 7 ? { carryover: 3, stillness: 3 } : {}));
  const x = summarizeTrain(sessions);
  assert.equal(x.recentCount, 7);
  assert.equal(x.targetCount, 7);
  assert.equal(x.transferCount, 7);
  assert.equal(x.carryoverMedian, 2);
  assert.equal(x.dimensionMedian.stillness, 2);
});

test('DEPLOY analytics compare latest five successful latencies with prior five without using timeouts', () => {
  const sessions = [];
  [30,29,28,27,26,25,24,23,22,21].forEach((sec, i) => sessions.push(deploy(i+1, sec*1000)));
  sessions.push(deploy(12, null, false));
  const x = summarizeDeploy(sessions, '60');
  assert.equal(x.recentMedianMs, 23000);
  assert.equal(x.previousMedianMs, 28000);
  assert.equal(x.deltaMs, -5000);
});

test('daily directive prioritizes TRAIN, then one DEPLOY after TRAIN when unlocked', () => {
  const now = new Date('2026-09-25T16:00:00.000Z');
  let d = deriveDailyDirective({ trainSessions: [], deploySessions: [], progress: { highest_stage_unlocked:'association', recommended_deploy_variant:'60' }, now });
  assert.equal(d.kind, 'train');
  d = deriveDailyDirective({ trainSessions: [train(25)], deploySessions: [], progress: { highest_stage_unlocked:'association', recommended_deploy_variant:'60' }, now });
  assert.equal(d.kind, 'deploy');
  d = deriveDailyDirective({ trainSessions: [train(25)], deploySessions: [deploy(25,25000)], progress: { highest_stage_unlocked:'association', recommended_deploy_variant:'60' }, now });
  assert.equal(d.kind, 'complete');
});

test('generalization gap selects the least-covered unmet class', () => {
  const gap = nextGeneralizationGap({ classes: {
    seated_cognitive:{trials:4,successes:4,successRate:1,met:true},
    movement_adjacent:{trials:2,successes:2,successRate:1,met:false},
    mild_distraction:{trials:1,successes:1,successRate:1,met:false},
    different_time:{trials:3,successes:2,successRate:.667,met:false}
  }});
  assert.equal(gap.name, 'mild_distraction');
});

test('local-first backup recommendation activates after seven sessions and clears after recent export', () => {
  const sessions = Array.from({length: 7}, (_, i) => train(i+1));
  assert.equal(backupRecommended({ trainSessions:sessions, settings:{last_export_at:null}, now:new Date('2026-09-25T00:00:00Z') }), true);
  assert.equal(backupRecommended({ trainSessions:sessions, settings:{last_export_at:'2026-09-24T00:00:00Z'}, now:new Date('2026-09-25T00:00:00Z') }), false);
});

test('robustification summary treats retrieval latency as recovery latency only for perturbation trials', () => {
  const ordinary = deploy(1, 22000);
  const robust = deploy(2, 18000, true, { perturbation:{ type:'brief_arithmetic', duration_ms:30000 } });
  const x = summarizeRobustification([ordinary, robust]);
  assert.equal(x.trials, 1);
  assert.equal(x.successful, 1);
  assert.equal(x.medianRecoveryMs, 18000);
});
