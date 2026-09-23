export const DB_NAME = 'still_water';
export const DB_VERSION = 1;

export const STORE_NAMES = Object.freeze({
  profile: 'profile',
  settings: 'settings',
  trainSessions: 'train_sessions',
  deploySessions: 'deploy_sessions',
  progressState: 'progress_state',
  appEvents: 'app_events'
});

export function applyMigrations(db, oldVersion, _newVersion, transaction) {
  if (oldVersion < 1) migrateToV1(db, transaction);
}

function migrateToV1(db, transaction) {
  const profile = db.createObjectStore(STORE_NAMES.profile, { keyPath: 'id' });
  profile.createIndex('created_at', 'created_at', { unique: false });

  db.createObjectStore(STORE_NAMES.settings, { keyPath: 'id' });

  const train = db.createObjectStore(STORE_NAMES.trainSessions, { keyPath: 'id' });
  train.createIndex('started_at', 'started_at', { unique: false });
  train.createIndex('status', 'status', { unique: false });
  train.createIndex('training_stage_at_start', 'training_stage_at_start', { unique: false });

  const deploy = db.createObjectStore(STORE_NAMES.deploySessions, { keyPath: 'id' });
  deploy.createIndex('started_at', 'started_at', { unique: false });
  deploy.createIndex('status', 'status', { unique: false });
  deploy.createIndex('variant', 'variant', { unique: false });
  deploy.createIndex('training_stage_at_start', 'training_stage_at_start', { unique: false });

  db.createObjectStore(STORE_NAMES.progressState, { keyPath: 'id' });

  const events = db.createObjectStore(STORE_NAMES.appEvents, { keyPath: 'id', autoIncrement: true });
  events.createIndex('timestamp', 'timestamp', { unique: false });
  events.createIndex('type', 'type', { unique: false });

  // Explicitly touch transaction so a future migration can share the same pattern.
  void transaction;
}
