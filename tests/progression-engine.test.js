import test from 'node:test';
import assert from 'node:assert/strict';
import {
  foundationGate, associationGate, compression1Gate, compression2Gate,
  generalizationGate, respiratoryProgressionBlock, deriveProgress,
  recommendedDeployVariant, medianSuccessfulLatency
} from '../src/core/progression-engine.js';

const day = 86400000;
const base = Date.parse('2026-01-01T12:00:00.000Z');

function train(i, { good = true, drowsy = false, discomfort = false, status = 'completed' } = {}) {
  return {
    id: `t${i}`,
    started_at: new Date(base + i * day).toISOString(),
    status,
    stillness: good ? 2 : 1,
    breadth: 2,
    effortlessness: 2,
    readiness: 2,
    drowsiness_flag: drowsy,
    respiratory_discomfort_flag: discomfort
  };
}

function deploy(i, variant, success, task = 'work', modifiers = ['seated'], status = success ? 'completed' : 'timeout', stage = 'association') {
  return {
    id: `d${variant}-${i}-${task}`,
    started_at: new Date(base + (100 + i) * day).toISOString(),
    status,
    variant,
    retrieval_success: success,
    retrieval_latency_ms: success ? 10000 + i * 1000 : null,
    training_stage_at_start: stage,
    context: { task, modifiers }
  };
}

test('Foundation locks at 3/7 and unlocks at 4/7', () => {
  const three = [0,1,2].map(i => train(i, { good: true })).concat([3,4,5,6].map(i => train(i, { good: false })));
  assert.equal(foundationGate(three).met, false);
  const four = [0,1,2,3].map(i => train(i, { good: true })).concat([4,5,6].map(i => train(i, { good: false })));
  assert.equal(foundationGate(four).met, true);
});

test('Foundation blocks if drowsiness dominates more than 2 of recent 7', () => {
  const sessions = Array.from({ length: 7 }, (_, i) => train(i, { good: true, drowsy: i < 3 }));
  assert.equal(foundationGate(sessions).met, false);
});

test('respiratory block triggers at >=2 of last 5 and clears after 4 comfortable sessions', () => {
  const pattern = [false, true, false, true, false].map((x, i) => train(i, { discomfort: x }));
  assert.equal(respiratoryProgressionBlock(pattern), true);
  const cleared = pattern.concat([5,6,7,8].map(i => train(i, { discomfort: false })));
  assert.equal(respiratoryProgressionBlock(cleared), false);
});

test('interrupted deploy is ineligible; genuine timeout counts', () => {
  const sessions = [
    ...Array.from({ length: 6 }, (_, i) => deploy(i, '60', true)),
    deploy(6, '60', false),
    deploy(7, '60', false),
    deploy(8, '60', true, 'work', ['seated'], 'interrupted')
  ];
  const gate = associationGate(sessions);
  assert.equal(gate.recentCount, 8);
  assert.equal(gate.successes, 6);
  assert.equal(gate.met, true);
});

test('Association requires 6 of most recent 8 Deploy 60', () => {
  assert.equal(associationGate(Array.from({ length: 8 }, (_, i) => deploy(i, '60', i < 6))).met, true);
  assert.equal(associationGate(Array.from({ length: 8 }, (_, i) => deploy(i, '60', i < 5))).met, false);
});

test('Compression I requires 6/8 and 2 distinct ordinary contexts', () => {
  const oneContext = Array.from({ length: 8 }, (_, i) => deploy(i, '30', i < 6, 'work', ['seated'], undefined, 'compression_1'));
  assert.equal(compression1Gate(oneContext).met, false);
  const twoContexts = oneContext.map((s, i) => i === 7 ? { ...s, context: { task: 'chess', modifiers: ['seated'] } } : s);
  assert.equal(compression1Gate(twoContexts).met, true);
});

test('Compression II requires 6/8 and 3 contexts', () => {
  const tasks = ['work','chess','writing','work','chess','writing','work','chess'];
  const sessions = Array.from({ length: 8 }, (_, i) => deploy(i, '15', i < 6, tasks[i], ['seated'], undefined, 'compression_2'));
  assert.equal(compression2Gate(sessions).met, true);
});

test('fallback recommendation for poor recent Deploy 30 does not erase stage', () => {
  const sessions = Array.from({ length: 6 }, (_, i) => deploy(i, '30', i < 2, 'work', ['seated'], undefined, 'compression_1'));
  assert.equal(recommendedDeployVariant({ highestStageUnlocked: 'compression_1', deploySessions: sessions }), '60');
});

test('generalization requires >=4 trials and >=70% within every class', () => {
  const sessions = [];
  for (let i = 0; i < 4; i++) sessions.push(deploy(i, '15', i < 3, 'work', ['seated'], undefined, 'generalization'));
  for (let i = 4; i < 8; i++) sessions.push(deploy(i, '15', i < 7, 'exercise', ['after_walking'], undefined, 'generalization'));
  for (let i = 8; i < 12; i++) sessions.push(deploy(i, '15', i < 11, 'work', ['ambient_noise'], undefined, 'generalization'));
  for (let i = 12; i < 16; i++) sessions.push(deploy(i, '15', i < 15, 'work', ['different_time'], undefined, 'generalization'));
  const gate = generalizationGate(sessions);
  assert.equal(gate.met, true);
  for (const stat of Object.values(gate.classes)) {
    assert.equal(stat.trials, 4);
    assert.equal(stat.successes, 3);
    assert.equal(stat.successRate, 0.75);
  }
});

test('generalization 2/4 fails because 50% < 70%', () => {
  const sessions = Array.from({ length: 4 }, (_, i) => deploy(i, '15', i < 2, 'work', ['ambient_noise'], undefined, 'generalization'));
  const gate = generalizationGate(sessions);
  assert.equal(gate.classes.mild_distraction.met, false);
});



test('pre-Generalization trials cannot satisfy Generalization gate retroactively', () => {
  const sessions = [];
  for (let i = 0; i < 4; i++) sessions.push(deploy(i, '15', true, 'work', ['seated'], undefined, 'compression_2'));
  for (let i = 4; i < 8; i++) sessions.push(deploy(i, '15', true, 'exercise', ['after_walking'], undefined, 'compression_2'));
  for (let i = 8; i < 12; i++) sessions.push(deploy(i, '15', true, 'work', ['ambient_noise'], undefined, 'compression_2'));
  for (let i = 12; i < 16; i++) sessions.push(deploy(i, '15', true, 'work', ['different_time'], undefined, 'compression_2'));
  assert.equal(generalizationGate(sessions).met, false);
});

test('kernel never invents a Maintenance completion gate', () => {
  const trains = Array.from({ length: 7 }, (_, i) => train(i, { good: true }));
  const d60 = Array.from({ length: 8 }, (_, i) => deploy(i, '60', i < 6, 'work', ['seated'], undefined, 'association'));
  const tasks30 = ['work','chess','work','chess','work','chess','work','chess'];
  const d30 = Array.from({ length: 8 }, (_, i) => deploy(20+i, '30', i < 6, tasks30[i], ['seated'], undefined, 'compression_1'));
  const tasks15 = ['work','chess','writing','work','chess','writing','work','chess'];
  const d15 = Array.from({ length: 8 }, (_, i) => deploy(40+i, '15', i < 6, tasks15[i], ['seated'], undefined, 'compression_2'));
  const gen = [];
  for (let i = 0; i < 4; i++) gen.push(deploy(60+i, '15', i < 3, 'work', ['seated'], undefined, 'generalization'));
  for (let i = 4; i < 8; i++) gen.push(deploy(60+i, '15', i < 7, 'exercise', ['after_walking'], undefined, 'generalization'));
  for (let i = 8; i < 12; i++) gen.push(deploy(60+i, '15', i < 11, 'work', ['ambient_noise'], undefined, 'generalization'));
  for (let i = 12; i < 16; i++) gen.push(deploy(60+i, '15', i < 15, 'work', ['different_time'], undefined, 'generalization'));
  const now = base + 60 * day;
  const p = deriveProgress({ trainSessions: trains, deploySessions: [...d60, ...d30, ...d15, ...gen], nowMs: now });
  assert.equal(p.gates.robustification.met, true);
  assert.equal(p.evidenceStage, 'robustification');
  assert.equal(p.highestStageUnlocked, 'robustification');
});

test('median successful latency ignores timeouts and uses true median', () => {
  const sessions = [
    { ...deploy(1, '60', true), retrieval_latency_ms: 10000 },
    { ...deploy(2, '60', true), retrieval_latency_ms: 30000 },
    { ...deploy(3, '60', true), retrieval_latency_ms: 20000 },
    deploy(4, '60', false)
  ];
  assert.equal(medianSuccessfulLatency(sessions, '60'), 20000);
});

test('highest stage is monotonic even if present evidence later weakens', () => {
  const progress = deriveProgress({ trainSessions: [], deploySessions: [], previousHighestStage: 'compression_2' });
  assert.equal(progress.highestStageUnlocked, 'compression_2');
});

test('post-Generalization stages cannot backfill deleted Generalization evidence', () => {
  const later = [];
  for (let i = 0; i < 4; i++) later.push(deploy(100+i, '15', true, 'work', ['seated'], undefined, 'robustification'));
  for (let i = 4; i < 8; i++) later.push(deploy(100+i, '15', true, 'exercise', ['after_walking'], undefined, 'robustification'));
  for (let i = 8; i < 12; i++) later.push(deploy(100+i, '15', true, 'work', ['ambient_noise'], undefined, 'robustification'));
  for (let i = 12; i < 16; i++) later.push(deploy(100+i, '15', true, 'work', ['different_time'], undefined, 'robustification'));
  assert.equal(generalizationGate(later).met, false);
});
