import { validateExportBundle } from './schema.js';

export function buildExportBundle({ profile = null, settings = null, trainSessions = [], deploySessions = [], progressState = null, generatedAt = new Date().toISOString() }) {
  const bundle = {
    export_format: 'still-water',
    export_version: 1,
    generated_at: generatedAt,
    profile,
    settings,
    train_sessions: trainSessions,
    deploy_sessions: deploySessions,
    progress_state: progressState
  };
  const validation = validateExportBundle(bundle);
  if (!validation.valid) throw new Error(`Cannot export invalid bundle: ${validation.errors.join('; ')}`);
  return bundle;
}

export function parseAndValidateExport(jsonText) {
  let parsed;
  try { parsed = JSON.parse(jsonText); }
  catch { return { valid: false, errors: ['Invalid JSON'], bundle: null }; }
  const validation = validateExportBundle(parsed);
  return { ...validation, bundle: validation.valid ? parsed : null };
}
