import { PROTOCOL, PROTOCOL_VERSION, APP_VERSION } from '../src/core/protocol.js';
import { TRAIN_STATES, DEPLOY_STATES } from '../src/core/state-machine.js';
import { DB_NAME, DB_VERSION, STORE_NAMES } from '../src/data/migrations.js';

const expected = {
  regulate: 120000,
  inhale: 4000,
  exhale: 6000,
  stabilize: 300000,
  releaseCount: 30000,
  releaseAnchor: 30000,
  open: 180000,
  encode: 20000,
  deploy60: 60000,
  deploy30: 30000,
  deploy15: 15000
};

const actual = {
  regulate: PROTOCOL.train.regulate.durationMs,
  inhale: PROTOCOL.train.regulate.inhaleMs,
  exhale: PROTOCOL.train.regulate.exhaleMs,
  stabilize: PROTOCOL.train.stabilize.durationMs,
  releaseCount: PROTOCOL.train.releaseCount.durationMs,
  releaseAnchor: PROTOCOL.train.releaseAnchor.durationMs,
  open: PROTOCOL.train.open.durationMs,
  encode: PROTOCOL.train.encode.durationMs,
  deploy60: PROTOCOL.deploy['60'].maxDurationMs,
  deploy30: PROTOCOL.deploy['30'].maxDurationMs,
  deploy15: PROTOCOL.deploy['15'].maxDurationMs
};

const mismatches = Object.entries(expected).filter(([k, v]) => actual[k] !== v);
const requiredStores = ['profile','settings','train_sessions','deploy_sessions','progress_state','app_events'];
const stores = Object.values(STORE_NAMES);
const storeMismatch = requiredStores.some(s => !stores.includes(s));
if (storeMismatch) mismatches.push(['indexedDbStores', requiredStores]);

const report = {
  certificate: 'STILL_WATER_APPLICATION_CHECKPOINT',
  appVersion: APP_VERSION,
  protocolVersion: PROTOCOL_VERSION,
  database: { name: DB_NAME, version: DB_VERSION, stores },
  generatedAt: new Date().toISOString(),
  constants: actual,
  trainStateCount: TRAIN_STATES.length,
  deployStateCount: DEPLOY_STATES.length,
  status: mismatches.length === 0 ? 'PASS' : 'FAIL',
  mismatches: mismatches.map(([key, expectedValue]) => ({ key, expected: expectedValue, actual: actual[key] }))
};

console.log('==========================================================');
console.log(`STILL WATER APPLICATION CHECKPOINT ${APP_VERSION}`);
console.log(`PRACTICE PROTOCOL ${PROTOCOL_VERSION}`);
console.log('==========================================================');
for (const [key, value] of Object.entries(actual)) console.log(`${key.padEnd(18)} ${String(value).padStart(8)} ms`);
console.log('----------------------------------------------------------');
console.log(`TRAIN states       ${TRAIN_STATES.length}`);
console.log(`DEPLOY states      ${DEPLOY_STATES.length}`);
console.log(`IndexedDB          ${DB_NAME} v${DB_VERSION} / ${stores.length} stores`);
console.log(`CERTIFICATE        ${report.status}`);
console.log('==========================================================');
console.log(JSON.stringify(report));
if (mismatches.length) process.exitCode = 1;
