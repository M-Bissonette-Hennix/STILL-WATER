import { APP_VERSION, PROTOCOL_VERSION, PROTOCOL, targetStatePresent } from './core/protocol.js';
import { createTrainMachine, createDeployMachine, legalTrainTransitions } from './core/state-machine.js';
import { MonotonicTimer, classifyBackgroundInterruption, cueForElapsed } from './core/timing-engine.js';
import { medianSuccessfulLatency } from './core/progression-engine.js';
import { makeTrainSession, makeDeploySession } from './data/schema.js';
import { buildExportBundle, parseAndValidateExport } from './data/export.js';
import {
  openDatabase, initializeDatabase, getSettings, saveSettings,
  listTrainSessions, listDeploySessions, getProgressState,
  saveTrainSession, saveDeploySession, deleteSession,
  snapshotDatabase, replaceDatabaseData, resetDatabase, addAppEvent
} from './data/db.js';
import { saveCheckpoint, loadCheckpoint, clearCheckpoint } from './data/checkpoint.js';
import { AudioEngine, TRAIN_TIMELINE_OFFSETS_SECONDS } from './audio/audio-engine.js';
import { requestWakeLock, releaseWakeLock, downloadText } from './util/platform.js';
import { renderApp } from './ui/render.js';
import { KUJI, TRAIN_TIMED_STATES, TRAIN_PHASE_CUES } from './app/protocol-ui.js';

const root = document.querySelector('#app');
const audio = new AudioEngine();

const runtime = {
  db: null,
  settings: null,
  progress: null,
  trainSessions: [],
  deploySessions: [],
  view: 'home',
  onboardingIndex: 0,
  toast: null,
  toastTimer: null,
  modal: null,
  pendingImportBundle: null,
  selectedHistory: null,
  train: null,
  deploy: null,
  wakeLock: null,
  backgroundedAtWallMs: null,
  pendingVisibilityInterruption: null,
  deployDraft: { variant: '60', task: null, modifiers: [] },
  reviewRatings: { stillness: 0, breadth: 0, effortlessness: 0, readiness: 0 },
  reviewFlags: { drowsiness: false, respiratory_discomfort: false },
  reviewTask: null,
  lastRenderAt: 0
};

await boot();

async function boot() {
  try {
    runtime.db = await openDatabase();
    await initializeDatabase(runtime.db);
    await refreshData();
    audio.configure({ enabled: runtime.settings.audio_enabled, volume: runtime.settings.audio_volume });
    audio.prepare();
    runtime.view = runtime.settings.onboarding_complete ? 'home' : 'onboarding';
    bindEvents();
    registerServiceWorker();
    offerCheckpointRecovery();
    render();
    setInterval(tick, 100);
  } catch (error) {
    console.error(error);
    root.innerHTML = `<div class="app-shell"><main class="main"><section class="home"><p class="eyebrow">Startup error</p><h1 class="stage-title">Local storage could not be initialized.</h1><p class="subtle">${escapeForEmergency(error.message)}</p><a class="secondary-action" href="./">RETRY</a></section></main></div>`;
  }
}

function bindEvents() {
  root.addEventListener('click', handleClick);
  root.addEventListener('submit', handleSubmit);
  root.addEventListener('change', handleChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', () => {
    if (runtime.train || runtime.deploy) updateActiveCheckpoint();
  });
}

async function refreshData() {
  [runtime.settings, runtime.progress, runtime.trainSessions, runtime.deploySessions] = await Promise.all([
    getSettings(runtime.db), getProgressState(runtime.db), listTrainSessions(runtime.db), listDeploySessions(runtime.db)
  ]);
}

function render() {
  const model = buildViewModel();
  renderApp(root, model);
}

function buildViewModel() {
  const base = {
    view: runtime.view,
    settings: runtime.settings,
    progress: runtime.progress,
    onboardingIndex: runtime.onboardingIndex,
    modal: runtime.modal,
    toast: runtime.toast,
    appVersion: APP_VERSION,
    protocolVersion: PROTOCOL_VERSION,
    trainCompletedToday: didTrainToday(),
    deployDraft: runtime.deployDraft,
    unlockedDeployVariants: unlockedDeployVariants(),
    medianLatency: medianForCurrentVariant(),
    historyItems: historyItems(),
    selectedHistory: runtime.selectedHistory,
    reviewRatings: runtime.reviewRatings,
    reviewFlags: runtime.reviewFlags,
    reviewTask: runtime.reviewTask,
    sessionMode: null
  };

  if (runtime.train) return { ...base, ...trainViewModel() };
  if (runtime.deploy) return { ...base, ...deployViewModel() };
  return base;
}

function trainViewModel() {
  const train = runtime.train;
  const state = train.machine.state;
  if (state === 'TRAIN_REVIEW') return { sessionMode: 'train_review' };
  const timed = Boolean(TRAIN_TIMED_STATES[state]);
  let remaining = null;
  let breathLabel = '';
  let breathLineWidth = 46;
  let lineOpacity = .72;
  if (timed && train.timer?.started) {
    remaining = train.timer.remainingMs();
    if (state === 'REGULATE') {
      const elapsed = train.timer.elapsedMs();
      const cycle = PROTOCOL.train.regulate.inhaleMs + PROTOCOL.train.regulate.exhaleMs;
      const pos = ((elapsed % cycle) + cycle) % cycle;
      const inhale = pos < PROTOCOL.train.regulate.inhaleMs;
      const phaseElapsed = inhale ? pos : pos - PROTOCOL.train.regulate.inhaleMs;
      const phaseDuration = inhale ? PROTOCOL.train.regulate.inhaleMs : PROTOCOL.train.regulate.exhaleMs;
      const fraction = phaseElapsed / phaseDuration;
      breathLabel = inhale ? 'IN' : 'OUT';
      breathLineWidth = inhale ? 38 + (fraction * 34) : 72 - (fraction * 34);
      lineOpacity = inhale ? .62 + fraction * .28 : .9 - fraction * .28;
    }
  }
  return {
    sessionMode: 'train',
    trainState: state,
    phaseIndex: phaseIndexForTrain(state),
    phaseName: phaseName(state),
    phaseCue: TRAIN_PHASE_CUES[state] ?? '',
    timerText: runtime.settings.timer_visibility === 'minimal' && remaining !== null ? formatMs(remaining) : '',
    breathLabel,
    breathLineWidth: Math.round(breathLineWidth),
    lineOpacity,
    encodeSkipped: train.encodeSkipped,
    sessionActions: trainActions(state)
  };
}

function deployViewModel() {
  const deploy = runtime.deploy;
  const state = deploy.machine.state;
  if (state === 'DEPLOY_REVIEW') {
    return {
      sessionMode: 'deploy_review',
      deployVariant: deploy.variant,
      deploySuccess: deploy.record.retrieval_success,
      deployLatencyMs: deploy.record.retrieval_latency_ms
    };
  }
  let elapsed = 0;
  let remaining = null;
  let cue = '';
  if (state === 'DEPLOY_ACTIVE' && deploy.timer?.started) {
    elapsed = deploy.timer.elapsedMs();
    remaining = deploy.timer.remainingMs();
    cue = cueForElapsed(PROTOCOL.deploy[deploy.variant].cueSchedule, elapsed);
  }
  return {
    sessionMode: 'deploy',
    deployState: state,
    deployVariant: deploy.variant,
    deployCue: cue,
    phaseIndex: 'Retrieval',
    timerText: runtime.settings.timer_visibility === 'minimal' && remaining !== null ? formatMs(remaining) : '',
    sessionActions: ''
  };
}

function trainActions(state) {
  if (state === 'KUJI_INTRO') return `<div class="session-actions"><button class="primary-action" data-action="train-next">BEGIN SEALS</button></div>`;
  if (KUJI.some(k => k.state === state)) {
    const previousAllowed = legalTrainTransitions(state).some(s => KUJI.some(k => k.state === s) && KUJI.find(k => k.state === s).ordinal < KUJI.find(k => k.state === state).ordinal);
    return `<div class="session-actions"><button class="primary-action" data-action="train-next">NEXT</button>${previousAllowed ? '<button class="quiet-action" data-action="train-back">BACK</button>' : ''}</div>`;
  }
  if (state === 'KUJI_CLOSE') return `<div class="session-actions"><button class="primary-action" data-action="train-next">CONTINUE</button></div>`;
  if (state === 'TRANSFER') return `<div class="session-actions"><button class="primary-action" data-action="train-task-begun">TASK BEGUN</button><button class="quiet-action" data-action="train-transfer-end">END WITHOUT TASK</button></div>`;
  return '';
}

async function handleClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  try {
    switch (action) {
      case 'noop': return;
      case 'go-home': return goHome();
      case 'open-settings': runtime.view = 'settings'; return render();
      case 'open-progress': runtime.view = 'progress'; return render();
      case 'open-history': runtime.view = 'history'; return render();
      case 'open-protocol': runtime.view = 'protocol'; return render();
      case 'test-audio': return testAudio();
      case 'test-transition-audio': return testTransitionAudio();
      case 'open-train': runtime.view = 'train_prepare'; return render();
      case 'open-deploy': return openDeployPrepare();
      case 'next-onboarding': runtime.onboardingIndex = Math.min(4, runtime.onboardingIndex + 1); return render();
      case 'previous-onboarding': runtime.onboardingIndex = Math.max(0, runtime.onboardingIndex - 1); return render();
      case 'finish-onboarding': return finishOnboarding();
      case 'begin-train': return beginTrain();
      case 'train-next': return advanceManualTrain(true);
      case 'train-back': return advanceManualTrain(false);
      case 'toggle-skip-encode': runtime.train.encodeSkipped = !runtime.train.encodeSkipped; updateActiveCheckpoint(); return render();
      case 'train-task-begun': return completeTransfer(true);
      case 'train-transfer-end': return completeTransfer(false);
      case 'set-rating': runtime.reviewRatings[target.dataset.rating] = Number(target.dataset.value); return render();
      case 'request-session-exit': return requestSessionExit();
      case 'close-modal': runtime.modal = null; return render();
      case 'confirm-end-session': return abortCurrentSession('aborted');
      case 'resume-interrupted-phase': return resumeInterruptedTrainPhase();
      case 'end-interrupted-session': return abortCurrentSession('interrupted');
      case 'deploy-ready': return deployReady();
      case 'finalize-deploy': return finalizeDeploy(target.dataset.taskStarted === 'true');
      case 'open-history-detail': return openHistoryDetail(target.dataset.kind, target.dataset.id);
      case 'delete-history': return confirmDeleteHistory(target.dataset.kind, target.dataset.id);
      case 'confirm-delete-history': return deleteSelectedHistory();
      case 'export-data': return exportData();
      case 'choose-import': document.querySelector('#import-file')?.click(); return;
      case 'confirm-import': return confirmImport();
      case 'reset-app': return confirmReset();
      case 'confirm-reset-app': return resetApp();
      case 'record-stale-checkpoint': return recordStaleCheckpoint();
      case 'discard-stale-checkpoint': clearCheckpoint(localStorage); runtime.modal = null; return render();
      default: return;
    }
  } catch (error) {
    console.error(error);
    await safeEvent('ui_error', { action, message: error.message });
    showToast('Action could not be completed.');
  }
}

async function handleSubmit(event) {
  if (event.target.id === 'deploy-prep-form') {
    event.preventDefault();
    const form = new FormData(event.target);
    runtime.deployDraft.variant = String(form.get('variant'));
    runtime.deployDraft.task = form.get('task') || null;
    runtime.deployDraft.modifiers = form.getAll('modifier').map(String);
    await beginDeploy();
  }
  if (event.target.id === 'train-review-form') {
    event.preventDefault();
    const form = new FormData(event.target);
    runtime.reviewFlags.drowsiness = form.has('drowsiness');
    runtime.reviewFlags.respiratory_discomfort = form.has('respiratory_discomfort');
    runtime.reviewTask = form.get('task') || null;
    await finalizeTrain();
  }
}

async function handleChange(event) {
  const setting = event.target.dataset.setting;
  if (setting) {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    runtime.settings = await saveSettings(runtime.db, { [setting]: value });
    audio.configure({ enabled: runtime.settings.audio_enabled, volume: runtime.settings.audio_volume });
    showToast('Setting saved.');
    return render();
  }

  if (event.target.id === 'deploy-variant') {
    runtime.deployDraft.variant = event.target.value;
    return render();
  }

  if (event.target.id === 'import-file' && event.target.files?.[0]) {
    const text = await event.target.files[0].text();
    const parsed = parseAndValidateExport(text);
    event.target.value = '';
    if (!parsed.valid) {
      showToast(`Import rejected: ${parsed.errors[0] ?? 'invalid export'}`);
      return;
    }
    runtime.pendingImportBundle = parsed.bundle;
    runtime.modal = {
      title: 'Replace local data?',
      copy: `Import contains ${parsed.bundle.train_sessions.length} TRAIN and ${parsed.bundle.deploy_sessions.length} DEPLOY records. Existing local history will be replaced.`,
      confirmAction: 'confirm-import', confirmLabel: 'IMPORT', cancelAction: 'close-modal', danger: true
    };
    render();
  }
}

async function testAudio() {
  const played = await audio.playOneShot('test', { force: true }).catch(() => false);
  showToast(played ? 'Audio play request accepted.' : 'Audio playback was rejected. Check device volume and try again.');
}


async function testTransitionAudio() {
  const started = await audio.testTimedTransition().catch(() => false);
  showToast(started ? 'Timed test armed — tone should sound in about 3 seconds.' : 'Timed transition test could not start.');
}

async function finishOnboarding() {
  runtime.settings = await saveSettings(runtime.db, { onboarding_complete: true });
  runtime.view = 'home';
  render();
}

async function beginTrain() {
  const machine = createTrainMachine();
  const record = makeTrainSession({
    status: 'interrupted',
    training_stage_at_start: runtime.progress.highest_stage_unlocked,
    encode_performed: true,
    phase_interruptions: []
  });
  runtime.train = {
    machine, record, timer: null, encodeSkipped: false,
    startedAtWallMs: Date.now(), stateEnteredWallMs: Date.now()
  };
  runtime.reviewRatings = { stillness: 0, breadth: 0, effortlessness: 0, readiness: 0 };
  runtime.reviewFlags = { drowsiness: false, respiratory_discomfort: false };
  runtime.reviewTask = null;
  // Direct user gesture: use a fresh media element for the session-start cue.
  void audio.playOneShot('start');
  runtime.wakeLock = await requestWakeLock(runtime.settings.wake_lock_enabled);
  machine.transition('KUJI_INTRO');
  updateActiveCheckpoint();
  render();
}

function advanceManualTrain(forward) {
  const train = runtime.train;
  if (!train) return;
  const state = train.machine.state;
  if (state === 'KUJI_INTRO') {
    enterTrainState('KUJI_RIN');
    return;
  }
  const currentKuji = KUJI.find(k => k.state === state);
  if (currentKuji) {
    const ordinal = currentKuji.ordinal + (forward ? 1 : -1);
    const next = KUJI.find(k => k.ordinal === ordinal);
    if (next) enterTrainState(next.state);
    else if (forward && state === 'KUJI_ZEN') enterTrainState('KUJI_CLOSE');
    return;
  }
  if (state === 'KUJI_CLOSE' && forward) {
    // Critical iOS path: start the continuous timeline from this explicit tap.
    void audio.startTrainTimeline(0).then(ok => {
      if (!ok) {
        void safeEvent('audio_timeline_start_failed', { state: 'REGULATE' });
        showToast('Transition audio unavailable for this session.');
      }
    });
    enterTrainState('REGULATE', { sound: false });
  }
}

function enterTrainState(nextState, { elapsedMs = 0, sound = true } = {}) {
  const train = runtime.train;
  train.machine.transition(nextState);
  train.stateEnteredWallMs = Date.now();
  const key = TRAIN_TIMED_STATES[nextState];
  train.timer = null;
  if (key) {
    const duration = PROTOCOL.train[key].durationMs;
    if (elapsedMs >= duration) {
      updateActiveCheckpoint();
      return advanceTimedTrainWithCarry(elapsedMs - duration, { sound: false });
    }
    train.timer = new MonotonicTimer();
    train.timer.start(duration, { elapsedMs });
  }
  if (nextState === 'ENCODE_SKIPPED') {
    train.record.encode_performed = false;
    updateActiveCheckpoint();
    return enterTrainState('TRANSFER', { sound });
  }
  updateActiveCheckpoint();
  // Automatic TRAIN transition tones are embedded in the continuously playing
  // media timeline. Stop it shortly after TRANSFER so the final embedded tone
  // can finish without leaving an 11-minute media session running.
  if (nextState === 'TRANSFER') audio.stopTrainTimeline({ afterMs: 700, reset: false });
  void sound; // retained in the signature for carry/recovery compatibility.
  render();
}

function advanceTimedTrainWithCarry(carryMs = 0, { sound = true } = {}) {
  const state = runtime.train.machine.state;
  const nextMap = {
    REGULATE: 'STABILIZE',
    STABILIZE: 'RELEASE_COUNT',
    RELEASE_COUNT: 'RELEASE_ANCHOR',
    RELEASE_ANCHOR: 'OPEN',
    OPEN: runtime.train.encodeSkipped ? 'ENCODE_SKIPPED' : 'ENCODE',
    ENCODE: 'TRANSFER'
  };
  const next = nextMap[state];
  if (!next) return;
  enterTrainState(next, { elapsedMs: carryMs, sound });
}

function completeTransfer(taskBegun) {
  audio.stopTrainTimeline({ reset: true });
  const train = runtime.train;
  train.record.transfer_task_begun = Boolean(taskBegun);
  train.machine.transition('TRAIN_REVIEW');
  updateActiveCheckpoint();
  releaseWake();
  render();
}

async function finalizeTrain() {
  // Form submission is a direct user gesture; play before any awaited storage work.
  void audio.playOneShot('end');
  const train = runtime.train;
  const ratings = runtime.reviewRatings;
  const record = {
    ...train.record,
    completed_at: new Date().toISOString(),
    status: 'completed',
    stillness: ratings.stillness,
    breadth: ratings.breadth,
    effortlessness: ratings.effortlessness,
    readiness: ratings.readiness,
    target_state_present: targetStatePresent(ratings),
    drowsiness_flag: runtime.reviewFlags.drowsiness,
    respiratory_discomfort_flag: runtime.reviewFlags.respiratory_discomfort,
    encode_performed: !train.encodeSkipped && train.record.encode_performed,
    context: { task: runtime.reviewTask, modifiers: [] }
  };
  train.machine.transition('TRAIN_COMPLETE');
  await saveTrainSession(runtime.db, record);
  clearCheckpoint(localStorage);
  runtime.train = null;
  await refreshData();
  runtime.view = 'home';
  showToast(record.target_state_present ? 'TRAIN complete. Target State recorded.' : 'TRAIN complete. State recorded.');
}

function openDeployPrepare() {
  const variants = unlockedDeployVariants();
  if (!variants.length) return;
  runtime.deployDraft = {
    variant: runtime.progress.recommended_deploy_variant ?? variants.at(-1),
    task: runtime.deployDraft.task,
    modifiers: []
  };
  runtime.view = 'deploy_prepare';
  render();
}

async function beginDeploy() {
  const variant = runtime.deployDraft.variant;
  if (!unlockedDeployVariants().includes(variant)) throw new Error('DEPLOY variant is not unlocked');
  const machine = createDeployMachine({ variant });
  const record = makeDeploySession({
    status: 'interrupted',
    variant,
    training_stage_at_start: runtime.progress.highest_stage_unlocked,
    context: { task: runtime.deployDraft.task, modifiers: runtime.deployDraft.modifiers },
    retrieval_success: false,
    retrieval_latency_ms: null,
    task_started: false
  });
  runtime.deploy = { machine, record, variant, timer: new MonotonicTimer() };
  // Direct form submission gesture.
  void audio.playOneShot('deploy');
  machine.transition('DEPLOY_ACTIVE');
  runtime.deploy.timer.start(PROTOCOL.deploy[variant].maxDurationMs);
  updateActiveCheckpoint();
  render();
}

function deployReady() {
  const deploy = runtime.deploy;
  if (!deploy || deploy.machine.state !== 'DEPLOY_ACTIVE') return;
  const latency = Math.min(deploy.timer.elapsedMs(), PROTOCOL.deploy[deploy.variant].maxDurationMs);
  deploy.timer.stop();
  deploy.record.retrieval_success = true;
  deploy.record.retrieval_latency_ms = Math.round(latency);
  deploy.machine.transition('DEPLOY_SUCCESS');
  updateActiveCheckpoint();
  void audio.playOneShot('deploy');
  render();
  setTimeout(() => {
    if (runtime.deploy === deploy && deploy.machine.state === 'DEPLOY_SUCCESS') {
      deploy.machine.transition('DEPLOY_REVIEW');
      updateActiveCheckpoint();
      render();
    }
  }, 700);
}

async function deployTimeout() {
  const deploy = runtime.deploy;
  if (!deploy || deploy.machine.state !== 'DEPLOY_ACTIVE') return;
  deploy.timer.stop();
  deploy.record.retrieval_success = false;
  deploy.record.retrieval_latency_ms = null;
  deploy.machine.transition('DEPLOY_TIMEOUT');
  updateActiveCheckpoint();
  render();
  setTimeout(() => {
    if (runtime.deploy === deploy && deploy.machine.state === 'DEPLOY_TIMEOUT') {
      deploy.machine.transition('DEPLOY_REVIEW');
      updateActiveCheckpoint();
      render();
    }
  }, 700);
}

async function finalizeDeploy(taskStarted) {
  const deploy = runtime.deploy;
  deploy.record = {
    ...deploy.record,
    status: deploy.record.retrieval_success ? 'completed' : 'timeout',
    completed_at: new Date().toISOString(),
    task_started: Boolean(taskStarted)
  };
  deploy.machine.transition('DEPLOY_COMPLETE');
  await saveDeploySession(runtime.db, deploy.record);
  clearCheckpoint(localStorage);
  runtime.deploy = null;
  await refreshData();
  runtime.view = 'home';
  showToast('DEPLOY recorded. Act.');
}

function requestSessionExit() {
  runtime.modal = {
    title: 'End session?',
    copy: 'The active attempt will be recorded as aborted and will not count toward progression.',
    confirmAction: 'confirm-end-session', confirmLabel: 'END', cancelAction: 'close-modal', danger: true
  };
  render();
}

async function abortCurrentSession(status = 'aborted') {
  runtime.modal = null;
  audio.stopTrainTimeline({ reset: true });
  if (runtime.train) {
    const record = {
      ...runtime.train.record,
      status,
      completed_at: new Date().toISOString(),
      encode_performed: false,
      target_state_present: false
    };
    await saveTrainSession(runtime.db, record);
    runtime.train = null;
  } else if (runtime.deploy) {
    const record = {
      ...runtime.deploy.record,
      status,
      completed_at: new Date().toISOString(),
      retrieval_success: false,
      retrieval_latency_ms: null
    };
    await saveDeploySession(runtime.db, record);
    runtime.deploy = null;
  }
  clearCheckpoint(localStorage);
  await releaseWake();
  await refreshData();
  runtime.view = 'home';
  showToast(status === 'interrupted' ? 'Session recorded as interrupted.' : 'Session ended.');
}

function handleVisibilityChange() {
  if (document.hidden) {
    runtime.backgroundedAtWallMs = Date.now();
    if (runtime.train || runtime.deploy) updateActiveCheckpoint();
    if (runtime.deploy?.machine.state === 'DEPLOY_ACTIVE') {
      // Backgrounding during active DEPLOY invalidates latency measurement.
      void interruptDeployForBackground();
    }
    return;
  }

  const started = runtime.backgroundedAtWallMs;
  runtime.backgroundedAtWallMs = null;
  if (!started || !runtime.train) return;
  const state = runtime.train.machine.state;
  if (!TRAIN_TIMED_STATES[state]) return;
  const result = classifyBackgroundInterruption({ backgroundedAtWallMs: started, foregroundedAtWallMs: Date.now() });
  if (!result.substantive) {
    tick();
    return;
  }

  runtime.train.timer?.stop();
  audio.pauseTrainTimeline();
  runtime.train.record.phase_interruptions.push({ state, duration_ms: result.durationMs, at: new Date().toISOString() });
  runtime.pendingVisibilityInterruption = { state, durationMs: result.durationMs };
  runtime.modal = {
    title: 'Session interrupted.',
    copy: state === 'ENCODE' ? 'ENCODE was interrupted. The cue will not be repeated; continue toward closure.' : 'Resume will restart the current phase from its beginning.',
    confirmAction: 'resume-interrupted-phase', confirmLabel: state === 'ENCODE' ? 'CONTINUE' : 'RESUME PHASE',
    cancelAction: 'end-interrupted-session', cancelLabel: 'END SESSION'
  };
  updateActiveCheckpoint();
  render();
}

async function interruptDeployForBackground() {
  const deploy = runtime.deploy;
  if (!deploy || deploy.machine.state !== 'DEPLOY_ACTIVE') return;
  deploy.timer.stop();
  deploy.machine.transition('DEPLOY_INTERRUPTED');
  deploy.record = { ...deploy.record, status: 'interrupted', completed_at: new Date().toISOString(), retrieval_success: false, retrieval_latency_ms: null };
  deploy.machine.transition('DEPLOY_COMPLETE');
  await saveDeploySession(runtime.db, deploy.record).catch(() => null);
  clearCheckpoint(localStorage);
  runtime.deploy = null;
  await refreshData();
  runtime.view = 'home';
}

function resumeInterruptedTrainPhase() {
  const train = runtime.train;
  const state = train?.machine.state;
  runtime.modal = null;
  runtime.pendingVisibilityInterruption = null;
  if (!train || !state) return goHome();
  if (state === 'ENCODE') {
    train.record.encode_performed = false;
    train.encodeSkipped = true;
    audio.stopTrainTimeline({ reset: false });
    void audio.playOneShot('transfer');
    enterTrainState('TRANSFER', { sound: false });
    return;
  }
  const key = TRAIN_TIMED_STATES[state];
  if (key) {
    // RESUME PHASE is a direct user gesture, so re-start the media timeline at
    // the canonical beginning of the restarted phase.
    void audio.startTrainTimeline(TRAIN_TIMELINE_OFFSETS_SECONDS[state] ?? 0).then(ok => {
      if (!ok) void safeEvent('audio_timeline_resume_failed', { state });
    });
    train.timer = new MonotonicTimer();
    train.timer.start(PROTOCOL.train[key].durationMs);
    train.stateEnteredWallMs = Date.now();
    updateActiveCheckpoint();
    render();
  }
}

function tick() {
  const now = performance.now();
  if (now - runtime.lastRenderAt < 80) return;
  runtime.lastRenderAt = now;
  if (runtime.modal && runtime.pendingVisibilityInterruption) return;

  if (runtime.train) {
    const state = runtime.train.machine.state;
    if (TRAIN_TIMED_STATES[state] && runtime.train.timer?.expired()) {
      const carry = runtime.train.timer.overshootMs();
      advanceTimedTrainWithCarry(carry);
      return;
    }
    if (TRAIN_TIMED_STATES[state]) render();
  }

  if (runtime.deploy?.machine.state === 'DEPLOY_ACTIVE') {
    if (runtime.deploy.timer.expired()) void deployTimeout();
    else render();
  }
}

function updateActiveCheckpoint() {
  const now = new Date().toISOString();
  if (runtime.train) {
    saveCheckpoint(localStorage, {
      mode: 'train', session_id: runtime.train.record.id, state: runtime.train.machine.state,
      started_at: runtime.train.record.started_at, updated_at: now,
      training_stage_at_start: runtime.train.record.training_stage_at_start
    });
  } else if (runtime.deploy) {
    saveCheckpoint(localStorage, {
      mode: 'deploy', session_id: runtime.deploy.record.id, state: runtime.deploy.machine.state,
      started_at: runtime.deploy.record.started_at, updated_at: now,
      training_stage_at_start: runtime.deploy.record.training_stage_at_start,
      variant: runtime.deploy.variant,
      context: runtime.deploy.record.context
    });
  }
}

function offerCheckpointRecovery() {
  const checkpoint = loadCheckpoint(localStorage);
  if (!checkpoint) return;
  runtime.modal = {
    title: 'Previous session was interrupted.',
    copy: `${checkpoint.mode === 'train' ? 'TRAIN' : `DEPLOY ${checkpoint.variant ?? ''}`} did not close normally. Record it as interrupted or discard the incomplete checkpoint.`,
    confirmAction: 'record-stale-checkpoint', confirmLabel: 'RECORD INTERRUPTED',
    cancelAction: 'discard-stale-checkpoint', cancelLabel: 'DISCARD'
  };
}

async function recordStaleCheckpoint() {
  const checkpoint = loadCheckpoint(localStorage);
  if (!checkpoint) { runtime.modal = null; return render(); }
  const completedAt = new Date().toISOString();
  if (checkpoint.mode === 'train') {
    await saveTrainSession(runtime.db, makeTrainSession({
      id: checkpoint.session_id,
      started_at: checkpoint.started_at,
      completed_at: completedAt,
      status: 'interrupted',
      training_stage_at_start: checkpoint.training_stage_at_start ?? 'foundation',
      encode_performed: false
    }));
  } else {
    await saveDeploySession(runtime.db, makeDeploySession({
      id: checkpoint.session_id,
      started_at: checkpoint.started_at,
      completed_at: completedAt,
      status: 'interrupted',
      variant: checkpoint.variant ?? '60',
      training_stage_at_start: checkpoint.training_stage_at_start ?? 'association',
      context: checkpoint.context ?? { task: null, modifiers: [] }
    }));
  }
  clearCheckpoint(localStorage);
  runtime.modal = null;
  await refreshData();
  showToast('Interrupted session recorded.');
}

function openHistoryDetail(kind, id) {
  const list = kind === 'train' ? runtime.trainSessions : runtime.deploySessions;
  const found = list.find(s => s.id === id);
  runtime.selectedHistory = found ? { ...found, kind } : null;
  runtime.view = 'history_detail';
  render();
}

function confirmDeleteHistory(kind, id) {
  runtime.selectedHistory = runtime.selectedHistory?.id === id ? runtime.selectedHistory : { kind, id };
  runtime.modal = {
    title: 'Delete this record?',
    copy: 'Progression will be recomputed from the remaining evidence. This cannot be undone unless you have an export.',
    confirmAction: 'confirm-delete-history', confirmLabel: 'DELETE', cancelAction: 'close-modal', danger: true
  };
  render();
}

async function deleteSelectedHistory() {
  if (!runtime.selectedHistory?.id || !runtime.selectedHistory?.kind) return;
  await deleteSession(runtime.db, runtime.selectedHistory.kind, runtime.selectedHistory.id);
  runtime.modal = null;
  runtime.selectedHistory = null;
  await refreshData();
  runtime.view = 'history';
  showToast('Record deleted. Progress recomputed.');
}

async function exportData() {
  const snap = await snapshotDatabase(runtime.db);
  const bundle = buildExportBundle({
    profile: snap.profile,
    settings: snap.settings,
    trainSessions: [...snap.trainSessions].reverse(),
    deploySessions: [...snap.deploySessions].reverse(),
    progressState: snap.progressState
  });
  const day = new Date().toISOString().slice(0, 10);
  downloadText(`still-water-export-${day}.json`, JSON.stringify(bundle, null, 2));
  showToast('Export created.');
}

async function confirmImport() {
  if (!runtime.pendingImportBundle) return;
  await replaceDatabaseData(runtime.db, runtime.pendingImportBundle);
  runtime.pendingImportBundle = null;
  runtime.modal = null;
  await refreshData();
  runtime.view = 'home';
  showToast('Import complete. Progress recomputed.');
}

function confirmReset() {
  runtime.modal = {
    title: 'Reset STILL WATER?',
    copy: 'This deletes local sessions and progression. Export first if you may want the history later.',
    confirmAction: 'confirm-reset-app', confirmLabel: 'RESET', cancelAction: 'close-modal', danger: true
  };
  render();
}

async function resetApp() {
  await resetDatabase(runtime.db, { keepSettings: false });
  clearCheckpoint(localStorage);
  runtime.modal = null;
  runtime.selectedHistory = null;
  await refreshData();
  runtime.onboardingIndex = 0;
  runtime.view = 'onboarding';
  showToast('Local data reset.');
}

function goHome() {
  if (runtime.train || runtime.deploy) return requestSessionExit();
  runtime.selectedHistory = null;
  runtime.view = 'home';
  render();
}

function unlockedDeployVariants() {
  const stage = runtime.progress?.highest_stage_unlocked ?? 'foundation';
  const order = ['foundation','association','compression_1','compression_2','generalization','robustification','maintenance'];
  const index = order.indexOf(stage);
  if (index < 1) return [];
  if (index === 1) return ['60'];
  if (index === 2) return ['60','30'];
  return ['60','30','15'];
}

function medianForCurrentVariant() {
  const variant = runtime.progress?.recommended_deploy_variant;
  if (!variant) return null;
  const successfulCount = runtime.deploySessions.filter(s => s.retrieval_success && String(s.variant) === String(variant)).length;
  if (successfulCount < 5) return null;
  return medianSuccessfulLatency(runtime.deploySessions, variant);
}

function historyItems() {
  const trains = runtime.trainSessions.map(s => ({
    ...s, kind: 'train',
    summary: s.status === 'completed' ? (s.target_state_present ? 'Target State present' : 'State recorded') : titleCase(s.status),
    statusClass: s.status === 'completed' && s.target_state_present ? 'status-present' : s.status === 'completed' ? 'status-neutral' : 'status-warning'
  }));
  const deploys = runtime.deploySessions.map(s => ({
    ...s, kind: 'deploy',
    summary: s.status === 'completed' && s.retrieval_success ? formatLatencyLocal(s.retrieval_latency_ms) : s.status === 'timeout' ? 'Not established' : titleCase(s.status),
    statusClass: s.status === 'completed' && s.retrieval_success ? 'status-present' : s.status === 'timeout' ? 'status-neutral' : 'status-warning'
  }));
  return [...trains, ...deploys].sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at));
}

function didTrainToday() {
  const today = localDay(new Date());
  return runtime.trainSessions.some(s => s.status === 'completed' && localDay(new Date(s.started_at)) === today);
}

function phaseIndexForTrain(state) {
  const map = {
    KUJI_INTRO: 'Opening', KUJI_CLOSE: 'Opening',
    REGULATE: '01 / 06', STABILIZE: '02 / 06', RELEASE_COUNT: '03 / 06', RELEASE_ANCHOR: '03 / 06',
    OPEN: '04 / 06', ENCODE: '05 / 06', ENCODE_SKIPPED: '05 / 06', TRANSFER: '06 / 06'
  };
  if (KUJI.some(k => k.state === state)) return 'Opening';
  return map[state] ?? '';
}

function phaseName(state) {
  return ({
    REGULATE: 'Regulate', STABILIZE: 'Stabilize', RELEASE_COUNT: 'Release', RELEASE_ANCHOR: 'Release',
    OPEN: 'Open', ENCODE: 'Encode', TRANSFER: 'Transfer'
  })[state] ?? state;
}

function showToast(message) {
  runtime.toast = message;
  clearTimeout(runtime.toastTimer);
  runtime.toastTimer = setTimeout(() => { runtime.toast = null; render(); }, 2600);
  render();
}

async function releaseWake() {
  await releaseWakeLock(runtime.wakeLock);
  runtime.wakeLock = null;
}

async function safeEvent(type, detail) {
  if (!runtime.db) return;
  try { await addAppEvent(runtime.db, type, detail); } catch { /* no-op */ }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').catch(error => safeEvent('service_worker_failure', { message: error.message }));
}

function formatMs(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function formatLatencyLocal(ms) {
  return Number.isFinite(ms) ? `${(ms / 1000).toFixed(1)} sec` : '—';
}

function localDay(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function titleCase(text) {
  return String(text ?? '').replaceAll('_',' ').replace(/\b\w/g, m => m.toUpperCase());
}

function escapeForEmergency(text) {
  return String(text ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}
