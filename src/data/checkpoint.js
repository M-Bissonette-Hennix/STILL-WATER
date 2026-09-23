const CHECKPOINT_KEY = 'still-water.active-session.v1';

export function saveCheckpoint(storage, checkpoint) {
  if (!storage) return false;
  validateCheckpoint(checkpoint);
  storage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint));
  return true;
}

export function loadCheckpoint(storage) {
  if (!storage) return null;
  const raw = storage.getItem(CHECKPOINT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    validateCheckpoint(parsed);
    return parsed;
  } catch {
    storage.removeItem(CHECKPOINT_KEY);
    return null;
  }
}

export function clearCheckpoint(storage) {
  if (!storage) return false;
  storage.removeItem(CHECKPOINT_KEY);
  return true;
}

export function validateCheckpoint(value) {
  if (!value || typeof value !== 'object') throw new TypeError('checkpoint must be an object');
  if (!['train', 'deploy'].includes(value.mode)) throw new TypeError('checkpoint.mode must be train or deploy');
  if (typeof value.session_id !== 'string' || !value.session_id) throw new TypeError('checkpoint.session_id required');
  if (typeof value.state !== 'string' || !value.state) throw new TypeError('checkpoint.state required');
  if (typeof value.started_at !== 'string' || Number.isNaN(Date.parse(value.started_at))) throw new TypeError('checkpoint.started_at must be ISO date-time');
  if (typeof value.updated_at !== 'string' || Number.isNaN(Date.parse(value.updated_at))) throw new TypeError('checkpoint.updated_at must be ISO date-time');
  return true;
}

export function checkpointKey() {
  return CHECKPOINT_KEY;
}
