import {
  PROTOCOL_VERSION,
  APP_VERSION,
  TRAINING_STAGES,
  DEPLOY_VARIANTS,
  CONTEXT_TASKS,
  CONTEXT_MODIFIERS,
  PERTURBATION_TYPES,
  targetStatePresent
} from '../core/protocol.js';

export const SCHEMA_VERSION = 1;

export function makeTrainSession(overrides = {}) {
  const started = overrides.started_at ?? new Date().toISOString();
  return {
    id: overrides.id ?? cryptoUuid(),
    schema_version: SCHEMA_VERSION,
    protocol_version: PROTOCOL_VERSION,
    app_version: APP_VERSION,
    started_at: started,
    completed_at: overrides.completed_at ?? null,
    status: overrides.status ?? 'completed',
    training_stage_at_start: overrides.training_stage_at_start ?? 'foundation',
    phase_durations_ms: overrides.phase_durations_ms ?? {
      regulate: 120000,
      stabilize: 300000,
      release_count: 30000,
      release_anchor: 30000,
      open: 180000,
      encode: 20000
    },
    phase_interruptions: overrides.phase_interruptions ?? [],
    encode_performed: overrides.encode_performed ?? true,
    stillness: overrides.stillness ?? 0,
    breadth: overrides.breadth ?? 0,
    effortlessness: overrides.effortlessness ?? 0,
    readiness: overrides.readiness ?? 0,
    target_state_present: overrides.target_state_present ?? targetStatePresent({
      stillness: overrides.stillness ?? 0,
      breadth: overrides.breadth ?? 0,
      effortlessness: overrides.effortlessness ?? 0,
      readiness: overrides.readiness ?? 0
    }),
    drowsiness_flag: overrides.drowsiness_flag ?? false,
    respiratory_discomfort_flag: overrides.respiratory_discomfort_flag ?? false,
    context: overrides.context ?? { task: null, modifiers: [] },
    transfer_task_begun: overrides.transfer_task_begun ?? false,
    notes: overrides.notes ?? null
  };
}

export function makeDeploySession(overrides = {}) {
  const started = overrides.started_at ?? new Date().toISOString();
  return {
    id: overrides.id ?? cryptoUuid(),
    schema_version: SCHEMA_VERSION,
    protocol_version: PROTOCOL_VERSION,
    app_version: APP_VERSION,
    started_at: started,
    completed_at: overrides.completed_at ?? null,
    status: overrides.status ?? 'completed',
    variant: overrides.variant ?? '60',
    training_stage_at_start: overrides.training_stage_at_start ?? 'association',
    retrieval_success: overrides.retrieval_success ?? false,
    retrieval_latency_ms: overrides.retrieval_latency_ms ?? null,
    task_started: overrides.task_started ?? false,
    context: overrides.context ?? { task: null, modifiers: [] },
    perturbation: overrides.perturbation ?? null
  };
}

export function validateTrainSession(session) {
  const errors = [];
  validateBase(session, errors);
  enumField(session.status, ['completed', 'interrupted', 'aborted', 'technical_error'], 'status', errors);
  enumField(session.training_stage_at_start, TRAINING_STAGES, 'training_stage_at_start', errors);
  for (const key of ['stillness', 'breadth', 'effortlessness', 'readiness']) integerRange(session[key], 0, 3, key, errors);
  booleanField(session.encode_performed, 'encode_performed', errors);
  booleanField(session.target_state_present, 'target_state_present', errors);
  if (typeof session.target_state_present === 'boolean') {
    const derived = targetStatePresent(session);
    if (session.target_state_present !== derived) errors.push('target_state_present must match the four state ratings');
  }
  booleanField(session.drowsiness_flag, 'drowsiness_flag', errors);
  booleanField(session.respiratory_discomfort_flag, 'respiratory_discomfort_flag', errors);
  booleanField(session.transfer_task_begun, 'transfer_task_begun', errors);
  validateContext(session.context, errors);
  return result(errors);
}

export function validateDeploySession(session) {
  const errors = [];
  validateBase(session, errors);
  enumField(session.status, ['completed', 'timeout', 'interrupted', 'aborted', 'technical_error'], 'status', errors);
  enumField(String(session.variant), DEPLOY_VARIANTS, 'variant', errors);
  enumField(session.training_stage_at_start, TRAINING_STAGES, 'training_stage_at_start', errors);
  booleanField(session.retrieval_success, 'retrieval_success', errors);
  if (session.retrieval_latency_ms !== null && (!Number.isFinite(session.retrieval_latency_ms) || session.retrieval_latency_ms < 0)) errors.push('retrieval_latency_ms must be null or a finite non-negative number');
  if (session.retrieval_success === true && !Number.isFinite(session.retrieval_latency_ms)) errors.push('successful retrieval requires retrieval_latency_ms');
  if (session.retrieval_success === false && session.retrieval_latency_ms !== null) errors.push('unsuccessful retrieval must have null retrieval_latency_ms');
  if (session.status === 'timeout' && session.retrieval_success !== false) errors.push('timeout cannot be a successful retrieval');
  if (['interrupted','aborted','technical_error'].includes(session.status) && session.retrieval_success !== false) errors.push(`${session.status} cannot be a successful retrieval`);
  booleanField(session.task_started, 'task_started', errors);
  validateContext(session.context, errors);
  if (session.perturbation !== null) validatePerturbation(session.perturbation, errors);
  return result(errors);
}

export function validateExportBundle(bundle) {
  const errors = [];
  if (!bundle || typeof bundle !== 'object') return result(['bundle must be an object']);
  if (bundle.export_format !== 'still-water') errors.push('export_format must equal still-water');
  if (bundle.export_version !== 1) errors.push('export_version must equal 1');
  if (!Array.isArray(bundle.train_sessions)) errors.push('train_sessions must be an array');
  if (!Array.isArray(bundle.deploy_sessions)) errors.push('deploy_sessions must be an array');

  if (Array.isArray(bundle.train_sessions)) {
    bundle.train_sessions.forEach((s, i) => validateTrainSession(s).errors.forEach((e) => errors.push(`train_sessions[${i}]: ${e}`)));
  }
  if (Array.isArray(bundle.deploy_sessions)) {
    bundle.deploy_sessions.forEach((s, i) => validateDeploySession(s).errors.forEach((e) => errors.push(`deploy_sessions[${i}]: ${e}`)));
  }

  const ids = [...(bundle.train_sessions ?? []), ...(bundle.deploy_sessions ?? [])].map((s) => s.id);
  if (new Set(ids).size !== ids.length) errors.push('session IDs must be globally unique within export');
  return result(errors);
}

function validateBase(session, errors) {
  if (!session || typeof session !== 'object') { errors.push('session must be an object'); return; }
  nonEmptyString(session.id, 'id', errors);
  if (session.schema_version !== SCHEMA_VERSION) errors.push(`schema_version must equal ${SCHEMA_VERSION}`);
  nonEmptyString(session.protocol_version, 'protocol_version', errors);
  nonEmptyString(session.app_version, 'app_version', errors);
  validIso(session.started_at, 'started_at', errors);
  if (session.completed_at !== null) validIso(session.completed_at, 'completed_at', errors);
}

function validateContext(context, errors) {
  if (!context || typeof context !== 'object') { errors.push('context must be an object'); return; }
  if (context.task !== null) enumField(context.task, CONTEXT_TASKS, 'context.task', errors);
  if (!Array.isArray(context.modifiers)) errors.push('context.modifiers must be an array');
  else context.modifiers.forEach((m) => enumField(m, CONTEXT_MODIFIERS, 'context.modifiers[]', errors));
}

function validatePerturbation(p, errors) {
  if (!p || typeof p !== 'object') { errors.push('perturbation must be an object'); return; }
  enumField(p.type, PERTURBATION_TYPES, 'perturbation.type', errors);
  if (p.duration_ms !== undefined && (!Number.isFinite(p.duration_ms) || p.duration_ms < 0)) errors.push('perturbation.duration_ms must be finite non-negative');
  for (const key of ['self_rated_activation_before', 'self_rated_activation_after']) {
    if (p[key] !== undefined && p[key] !== null) integerRange(p[key], 0, 3, `perturbation.${key}`, errors);
  }
}

function validIso(value, name, errors) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) errors.push(`${name} must be a valid date-time string`);
}
function nonEmptyString(value, name, errors) {
  if (typeof value !== 'string' || value.trim() === '') errors.push(`${name} must be a non-empty string`);
}
function enumField(value, allowed, name, errors) {
  if (!allowed.includes(value)) errors.push(`${name} must be one of: ${allowed.join(', ')}`);
}
function integerRange(value, min, max, name, errors) {
  if (!Number.isInteger(value) || value < min || value > max) errors.push(`${name} must be an integer from ${min} to ${max}`);
}
function booleanField(value, name, errors) {
  if (typeof value !== 'boolean') errors.push(`${name} must be boolean`);
}
function result(errors) { return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) }); }
function cryptoUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `sw-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
