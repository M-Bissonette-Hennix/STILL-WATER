import { DEPLOY_VARIANTS } from './protocol.js';

export const APP_STATES = Object.freeze([
  'BOOT', 'HOME', 'TRAIN_ACTIVE', 'DEPLOY_ACTIVE', 'REVIEW',
  'PROGRESS', 'HISTORY', 'SETTINGS', 'PROTOCOL', 'ERROR_RECOVERY'
]);

export const TRAIN_STATES = Object.freeze([
  'TRAIN_PREPARE',
  'KUJI_INTRO',
  'KUJI_RIN', 'KUJI_PYO', 'KUJI_TO', 'KUJI_SHA', 'KUJI_KAI',
  'KUJI_JIN', 'KUJI_RETSU', 'KUJI_ZAI', 'KUJI_ZEN', 'KUJI_CLOSE',
  'REGULATE', 'STABILIZE', 'RELEASE_COUNT', 'RELEASE_ANCHOR', 'OPEN',
  'ENCODE', 'ENCODE_SKIPPED', 'TRANSFER', 'TRAIN_REVIEW', 'TRAIN_COMPLETE'
]);

export const DEPLOY_STATES = Object.freeze([
  'DEPLOY_PREPARE', 'DEPLOY_ACTIVE', 'DEPLOY_SUCCESS', 'DEPLOY_TIMEOUT',
  'DEPLOY_INTERRUPTED', 'DEPLOY_REVIEW', 'DEPLOY_COMPLETE'
]);

const TRAIN_TRANSITIONS = Object.freeze({
  TRAIN_PREPARE: ['KUJI_INTRO'],
  KUJI_INTRO: ['KUJI_RIN'],
  KUJI_RIN: ['KUJI_PYO'],
  KUJI_PYO: ['KUJI_TO', 'KUJI_RIN'],
  KUJI_TO: ['KUJI_SHA', 'KUJI_PYO'],
  KUJI_SHA: ['KUJI_KAI', 'KUJI_TO'],
  KUJI_KAI: ['KUJI_JIN', 'KUJI_SHA'],
  KUJI_JIN: ['KUJI_RETSU', 'KUJI_KAI'],
  KUJI_RETSU: ['KUJI_ZAI', 'KUJI_JIN'],
  KUJI_ZAI: ['KUJI_ZEN', 'KUJI_RETSU'],
  KUJI_ZEN: ['KUJI_CLOSE', 'KUJI_ZAI'],
  KUJI_CLOSE: ['REGULATE'],
  REGULATE: ['STABILIZE'],
  STABILIZE: ['RELEASE_COUNT'],
  RELEASE_COUNT: ['RELEASE_ANCHOR'],
  RELEASE_ANCHOR: ['OPEN'],
  OPEN: ['ENCODE', 'ENCODE_SKIPPED'],
  ENCODE: ['TRANSFER'],
  ENCODE_SKIPPED: ['TRANSFER'],
  TRANSFER: ['TRAIN_REVIEW'],
  TRAIN_REVIEW: ['TRAIN_COMPLETE'],
  TRAIN_COMPLETE: []
});

const DEPLOY_TRANSITIONS = Object.freeze({
  DEPLOY_PREPARE: ['DEPLOY_ACTIVE'],
  DEPLOY_ACTIVE: ['DEPLOY_SUCCESS', 'DEPLOY_TIMEOUT', 'DEPLOY_INTERRUPTED'],
  DEPLOY_SUCCESS: ['DEPLOY_REVIEW'],
  DEPLOY_TIMEOUT: ['DEPLOY_REVIEW'],
  DEPLOY_INTERRUPTED: ['DEPLOY_COMPLETE'],
  DEPLOY_REVIEW: ['DEPLOY_COMPLETE'],
  DEPLOY_COMPLETE: []
});

export class InvalidTransitionError extends Error {
  constructor(machine, from, to) {
    super(`Illegal ${machine} transition: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
    this.machine = machine;
    this.from = from;
    this.to = to;
  }
}

export function canTrainTransition(from, to) {
  return TRAIN_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTrainTransition(from, to) {
  if (!canTrainTransition(from, to)) throw new InvalidTransitionError('TRAIN', from, to);
  return true;
}

export function canDeployTransition(from, to) {
  return DEPLOY_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertDeployTransition(from, to) {
  if (!canDeployTransition(from, to)) throw new InvalidTransitionError('DEPLOY', from, to);
  return true;
}

export function createTrainMachine(initialState = 'TRAIN_PREPARE') {
  if (!TRAIN_STATES.includes(initialState)) throw new Error(`Unknown TRAIN state: ${initialState}`);
  let state = initialState;
  return Object.freeze({
    get state() { return state; },
    transition(to) {
      assertTrainTransition(state, to);
      state = to;
      return state;
    }
  });
}

export function createDeployMachine({ variant, initialState = 'DEPLOY_PREPARE' }) {
  if (!DEPLOY_VARIANTS.includes(variant)) throw new Error(`Unknown deploy variant: ${variant}`);
  if (!DEPLOY_STATES.includes(initialState)) throw new Error(`Unknown DEPLOY state: ${initialState}`);
  let state = initialState;
  return Object.freeze({
    variant,
    get state() { return state; },
    transition(to) {
      assertDeployTransition(state, to);
      state = to;
      return state;
    }
  });
}

export function legalTrainTransitions(state) {
  return [...(TRAIN_TRANSITIONS[state] ?? [])];
}

export function legalDeployTransitions(state) {
  return [...(DEPLOY_TRANSITIONS[state] ?? [])];
}
