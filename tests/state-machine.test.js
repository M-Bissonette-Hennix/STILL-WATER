import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTrainMachine, createDeployMachine, assertTrainTransition,
  InvalidTransitionError, legalTrainTransitions
} from '../src/core/state-machine.js';

test('TRAIN canonical path is legal', () => {
  const m = createTrainMachine();
  const path = ['KUJI_INTRO','KUJI_RIN','KUJI_PYO','KUJI_TO','KUJI_SHA','KUJI_KAI','KUJI_JIN','KUJI_RETSU','KUJI_ZAI','KUJI_ZEN','KUJI_CLOSE','REGULATE','STABILIZE','RELEASE_COUNT','RELEASE_ANCHOR','OPEN','ENCODE','TRANSFER','TRAIN_REVIEW','TRAIN_COMPLETE'];
  for (const state of path) m.transition(state);
  assert.equal(m.state, 'TRAIN_COMPLETE');
});

test('OPEN may skip ENCODE but may not jump directly to TRANSFER', () => {
  assert.deepEqual(legalTrainTransitions('OPEN').sort(), ['ENCODE', 'ENCODE_SKIPPED'].sort());
  assert.throws(() => assertTrainTransition('OPEN', 'TRANSFER'), InvalidTransitionError);
});

test('STABILIZE cannot jump to OPEN or ENCODE', () => {
  assert.throws(() => assertTrainTransition('STABILIZE', 'OPEN'), InvalidTransitionError);
  assert.throws(() => assertTrainTransition('STABILIZE', 'ENCODE'), InvalidTransitionError);
});

test('Kuji backward navigation is one seal only where allowed', () => {
  assertTrainTransition('KUJI_PYO', 'KUJI_RIN');
  assert.throws(() => assertTrainTransition('KUJI_PYO', 'KUJI_INTRO'), InvalidTransitionError);
  assert.throws(() => assertTrainTransition('KUJI_CLOSE', 'KUJI_ZEN'), InvalidTransitionError);
});

test('DEPLOY can terminate as success, timeout, or interruption only from active', () => {
  const success = createDeployMachine({ variant: '60' });
  success.transition('DEPLOY_ACTIVE');
  success.transition('DEPLOY_SUCCESS');
  success.transition('DEPLOY_REVIEW');
  success.transition('DEPLOY_COMPLETE');
  assert.equal(success.state, 'DEPLOY_COMPLETE');

  const timeout = createDeployMachine({ variant: '30' });
  timeout.transition('DEPLOY_ACTIVE');
  timeout.transition('DEPLOY_TIMEOUT');
  timeout.transition('DEPLOY_REVIEW');
  timeout.transition('DEPLOY_COMPLETE');

  const interrupted = createDeployMachine({ variant: '15' });
  interrupted.transition('DEPLOY_ACTIVE');
  interrupted.transition('DEPLOY_INTERRUPTED');
  interrupted.transition('DEPLOY_COMPLETE');
});
