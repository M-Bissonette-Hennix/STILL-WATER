import { APP_VERSION, PROTOCOL_VERSION } from '../core/protocol.js';
import { deriveProgress } from '../core/progression-engine.js';
import { validateTrainSession, validateDeploySession } from './schema.js';
import { DB_NAME, DB_VERSION, STORE_NAMES, applyMigrations } from './migrations.js';

const DEFAULT_SETTINGS = Object.freeze({
  id: 'settings',
  audio_enabled: true,
  audio_volume: 0.28,
  timer_visibility: 'minimal',
  kuji_visuals_enabled: true,
  reduced_motion_override: null,
  wake_lock_enabled: true,
  theme: 'still_water_default',
  default_train_context: null,
  confirm_before_exit: true,
  onboarding_complete: false,
  install_prompt_dismissed: false
});

export async function openDatabase({ indexedDBImpl = globalThis.indexedDB } = {}) {
  if (!indexedDBImpl) throw new Error('IndexedDB is not available in this environment');
  return new Promise((resolve, reject) => {
    const request = indexedDBImpl.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      applyMigrations(request.result, event.oldVersion, event.newVersion, request.transaction);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
    request.onblocked = () => reject(new Error('IndexedDB upgrade was blocked by another tab'));
  });
}

export async function initializeDatabase(db) {
  const now = new Date().toISOString();
  const profile = await getRecord(db, STORE_NAMES.profile, 'local');
  if (!profile) {
    await putRecord(db, STORE_NAMES.profile, {
      id: 'local',
      created_at: now,
      protocol_version: PROTOCOL_VERSION,
      app_version_first_used: APP_VERSION
    });
  }

  const settings = await getRecord(db, STORE_NAMES.settings, 'settings');
  if (!settings) await putRecord(db, STORE_NAMES.settings, { ...DEFAULT_SETTINGS });
  else await putRecord(db, STORE_NAMES.settings, { ...DEFAULT_SETTINGS, ...settings, id: 'settings' });

  const progress = await getRecord(db, STORE_NAMES.progressState, 'progress');
  if (!progress) await recalculateAndStoreProgress(db);
  return db;
}

export function defaultSettings() {
  return structuredCloneSafe(DEFAULT_SETTINGS);
}

export async function getSettings(db) {
  return { ...DEFAULT_SETTINGS, ...(await getRecord(db, STORE_NAMES.settings, 'settings')) };
}

export async function saveSettings(db, patch) {
  const current = await getSettings(db);
  const next = { ...current, ...patch, id: 'settings' };
  validateSettings(next);
  await putRecord(db, STORE_NAMES.settings, next);
  return next;
}

export async function getProfile(db) {
  return getRecord(db, STORE_NAMES.profile, 'local');
}

export async function listTrainSessions(db) {
  return sortByStartedAtDesc(await getAll(db, STORE_NAMES.trainSessions));
}

export async function listDeploySessions(db) {
  return sortByStartedAtDesc(await getAll(db, STORE_NAMES.deploySessions));
}

export async function saveTrainSession(db, session) {
  const validation = validateTrainSession(session);
  if (!validation.valid) throw new Error(`Invalid TRAIN session: ${validation.errors.join('; ')}`);
  await putRecord(db, STORE_NAMES.trainSessions, session);
  return recalculateAndStoreProgress(db);
}

export async function saveDeploySession(db, session) {
  const validation = validateDeploySession(session);
  if (!validation.valid) throw new Error(`Invalid DEPLOY session: ${validation.errors.join('; ')}`);
  await putRecord(db, STORE_NAMES.deploySessions, session);
  return recalculateAndStoreProgress(db);
}

export async function deleteSession(db, kind, id) {
  const store = kind === 'train' ? STORE_NAMES.trainSessions : kind === 'deploy' ? STORE_NAMES.deploySessions : null;
  if (!store) throw new Error(`Unknown session kind: ${kind}`);
  await deleteRecord(db, store, id);
  return recalculateAndStoreProgress(db, { preserveHighest: false });
}

export async function getProgressState(db) {
  return getRecord(db, STORE_NAMES.progressState, 'progress');
}

export async function recalculateAndStoreProgress(db, { nowMs = Date.now(), preserveHighest = true } = {}) {
  const [trainDesc, deployDesc, previous] = await Promise.all([
    listTrainSessions(db),
    listDeploySessions(db),
    getRecord(db, STORE_NAMES.progressState, 'progress')
  ]);
  const trainSessions = [...trainDesc].reverse();
  const deploySessions = [...deployDesc].reverse();
  const derived = deriveProgress({
    trainSessions,
    deploySessions,
    previousHighestStage: preserveHighest ? (previous?.highest_stage_unlocked ?? 'foundation') : 'foundation',
    nowMs
  });
  const record = progressRecordFromDerived(derived, preserveHighest ? previous : null);
  await putRecord(db, STORE_NAMES.progressState, record);
  return record;
}

export async function addAppEvent(db, type, detail = null) {
  const event = { timestamp: new Date().toISOString(), type, detail };
  await requestToPromise(db.transaction(STORE_NAMES.appEvents, 'readwrite').objectStore(STORE_NAMES.appEvents).add(event));
  await trimAppEvents(db, 100);
}

export async function listAppEvents(db) {
  const events = await getAll(db, STORE_NAMES.appEvents);
  return events.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

export async function snapshotDatabase(db) {
  const [profile, settings, trainSessions, deploySessions, progressState] = await Promise.all([
    getProfile(db),
    getSettings(db),
    listTrainSessions(db),
    listDeploySessions(db),
    getProgressState(db)
  ]);
  return { profile, settings, trainSessions, deploySessions, progressState };
}

export async function replaceDatabaseData(db, bundle) {
  const importedSettings = { ...DEFAULT_SETTINGS, ...(bundle.settings ?? {}), id: 'settings' };
  validateSettings(importedSettings);
  for (const session of bundle.train_sessions ?? []) {
    const validation = validateTrainSession(session);
    if (!validation.valid) throw new Error(`Invalid imported TRAIN session: ${validation.errors.join('; ')}`);
  }
  for (const session of bundle.deploy_sessions ?? []) {
    const validation = validateDeploySession(session);
    if (!validation.valid) throw new Error(`Invalid imported DEPLOY session: ${validation.errors.join('; ')}`);
  }
  const stores = [
    STORE_NAMES.profile,
    STORE_NAMES.settings,
    STORE_NAMES.trainSessions,
    STORE_NAMES.deploySessions,
    STORE_NAMES.progressState
  ];
  const tx = db.transaction(stores, 'readwrite');
  const profileStore = tx.objectStore(STORE_NAMES.profile);
  const settingsStore = tx.objectStore(STORE_NAMES.settings);
  const trainStore = tx.objectStore(STORE_NAMES.trainSessions);
  const deployStore = tx.objectStore(STORE_NAMES.deploySessions);
  const progressStore = tx.objectStore(STORE_NAMES.progressState);

  profileStore.clear();
  settingsStore.clear();
  trainStore.clear();
  deployStore.clear();
  progressStore.clear();

  if (bundle.profile) profileStore.put(bundle.profile);
  settingsStore.put(importedSettings);
  for (const session of bundle.train_sessions) trainStore.put(session);
  for (const session of bundle.deploy_sessions) deployStore.put(session);

  await transactionDone(tx);
  await initializeDatabase(db);
  return recalculateAndStoreProgress(db, { preserveHighest: false });
}

export async function resetDatabase(db, { keepSettings = false } = {}) {
  const currentSettings = keepSettings ? await getSettings(db) : null;
  const stores = Object.values(STORE_NAMES);
  const tx = db.transaction(stores, 'readwrite');
  for (const store of stores) tx.objectStore(store).clear();
  await transactionDone(tx);
  await initializeDatabase(db);
  if (currentSettings) await putRecord(db, STORE_NAMES.settings, currentSettings);
  return recalculateAndStoreProgress(db, { preserveHighest: false });
}

export function progressRecordFromDerived(derived, previous = null) {
  const completion = { ...(previous?.completion ?? {}) };
  const now = new Date().toISOString();
  const evidence = derived.evidenceStage;
  const stages = ['association', 'compression_1', 'compression_2', 'generalization', 'robustification'];
  for (const stage of stages) {
    if (!completion[stage] && stageReached(evidence, stage)) completion[stage] = now;
  }
  return {
    id: 'progress',
    highest_stage_unlocked: derived.highestStageUnlocked,
    evidence_stage: derived.evidenceStage,
    recommended_deploy_variant: derived.recommendedDeployVariant,
    respiratory_progression_block: derived.respiratoryProgressionBlock,
    gates: derived.gates,
    completion,
    last_recalculated_at: now
  };
}

export function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') throw new TypeError('settings must be an object');
  if (typeof settings.audio_enabled !== 'boolean') throw new TypeError('audio_enabled must be boolean');
  if (!Number.isFinite(settings.audio_volume) || settings.audio_volume < 0 || settings.audio_volume > 1) throw new RangeError('audio_volume must be 0..1');
  if (!['minimal', 'hidden'].includes(settings.timer_visibility)) throw new RangeError('timer_visibility must be minimal or hidden');
  if (typeof settings.kuji_visuals_enabled !== 'boolean') throw new TypeError('kuji_visuals_enabled must be boolean');
  if (![null, true, false].includes(settings.reduced_motion_override)) throw new TypeError('reduced_motion_override must be null/true/false');
  if (typeof settings.wake_lock_enabled !== 'boolean') throw new TypeError('wake_lock_enabled must be boolean');
  if (typeof settings.confirm_before_exit !== 'boolean') throw new TypeError('confirm_before_exit must be boolean');
  if (typeof settings.onboarding_complete !== 'boolean') throw new TypeError('onboarding_complete must be boolean');
  return true;
}

export function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

function stageReached(stage, threshold) {
  const order = ['foundation', 'association', 'compression_1', 'compression_2', 'generalization', 'robustification', 'maintenance'];
  return order.indexOf(stage) >= order.indexOf(threshold);
}

async function trimAppEvents(db, max) {
  const events = await listAppEvents(db);
  if (events.length <= max) return;
  const remove = events.slice(max);
  const tx = db.transaction(STORE_NAMES.appEvents, 'readwrite');
  const store = tx.objectStore(STORE_NAMES.appEvents);
  for (const event of remove) store.delete(event.id);
  await transactionDone(tx);
}

function getRecord(db, storeName, key) {
  return requestToPromise(db.transaction(storeName, 'readonly').objectStore(storeName).get(key));
}

function putRecord(db, storeName, value) {
  return requestToPromise(db.transaction(storeName, 'readwrite').objectStore(storeName).put(value));
}

function deleteRecord(db, storeName, key) {
  return requestToPromise(db.transaction(storeName, 'readwrite').objectStore(storeName).delete(key));
}

function getAll(db, storeName) {
  return requestToPromise(db.transaction(storeName, 'readonly').objectStore(storeName).getAll());
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function sortByStartedAtDesc(records) {
  return records.sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at));
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
