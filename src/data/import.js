import { parseAndValidateExport } from './export.js';
import { replaceDatabaseData } from './db.js';

export async function importExportJson(db, jsonText) {
  const parsed = parseAndValidateExport(jsonText);
  if (!parsed.valid) return parsed;
  await replaceDatabaseData(db, parsed.bundle);
  return { valid: true, errors: [], bundle: parsed.bundle };
}
