import { KUJI } from '../app/protocol-ui.js';
import { formatDateTime, formatLatency, formatRemaining, formatStage, escapeHtml } from '../util/format.js';

export function renderApp(root, model) {
  root.innerHTML = model.sessionMode ? sessionScreen(model) : applicationScreen(model);
}

function applicationScreen(model) {
  const content = viewContent(model);
  return `
    <div class="app-shell">
      ${model.view === 'onboarding' ? '' : header(model)}
      <main class="main">${content}</main>
    </div>
    ${modal(model.modal)}
    ${model.toast ? `<div class="toast" role="status">${escapeHtml(model.toast)}</div>` : ''}
  `;
}

function header(model) {
  const canBack = !['home'].includes(model.view);
  return `<header class="app-header">
    <button class="header-action" data-action="${canBack ? 'go-home' : 'noop'}" ${canBack ? '' : 'aria-hidden="true" tabindex="-1"'}>${canBack ? '←' : ''}</button>
    <p class="wordmark">STILL WATER</p>
    <button class="header-action" data-action="open-settings" aria-label="Settings">•••</button>
  </header>`;
}

function viewContent(model) {
  switch (model.view) {
    case 'onboarding': return onboarding(model);
    case 'home': return home(model);
    case 'train_prepare': return trainPrepare(model);
    case 'deploy_prepare': return deployPrepare(model);
    case 'progress': return progress(model);
    case 'history': return history(model);
    case 'history_detail': return historyDetail(model);
    case 'settings': return settings(model);
    case 'protocol': return protocol(model);
    default: return `<section class="home"><h1 class="stage-title">Unavailable</h1><button class="secondary-action" data-action="go-home">Home</button></section>`;
  }
}

function onboarding(model) {
  const pages = [
    ['TRAIN THE STATE. RETRIEVE THE STATE.', 'STILL WATER trains a quiet, broad, low-effort attentional state and then conditions increasingly rapid retrieval before real activity.'],
    ['THE SEQUENCE', 'Regulate. Stabilize. Release. Open. Encode. Transfer. The application progressively withdraws as deliberate control is removed.'],
    ['TRAIN THE RETURN', 'When attention is captured during counting: recognize, release, and make the next completed exhale ONE. The return is the repetition.'],
    ['THE TARGET', 'Stillness without blankness. Breadth without distraction. Effortlessness without passivity. Readiness without agitation.'],
    ['BREATHE COMFORTABLY', 'Never pursue maximal inhalation, empty lungs, breath holding, air hunger, dizziness, or strong abdominal force. Stop for significant pain, breathing difficulty, faintness, or disorientation.']
  ];
  const [title, copy] = pages[model.onboardingIndex] ?? pages[0];
  const last = model.onboardingIndex === pages.length - 1;
  return `<section class="onboarding">
    <div class="onboarding-index">${model.onboardingIndex + 1} / ${pages.length}</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(copy)}</p>
    <div class="session-actions">
      <button class="primary-action" data-action="${last ? 'finish-onboarding' : 'next-onboarding'}">${last ? 'BEGIN FOUNDATION' : 'CONTINUE'}</button>
      ${model.onboardingIndex > 0 ? '<button class="quiet-action" data-action="previous-onboarding">BACK</button>' : ''}
    </div>
  </section>`;
}

function home(model) {
  const stage = formatStage(model.progress?.highest_stage_unlocked ?? 'foundation');
  const deploy = model.progress?.recommended_deploy_variant;
  const trainLabel = model.trainCompletedToday ? 'TRAIN AGAIN' : 'TRAIN';
  return `<section class="home">
    <div class="hero-copy">
      <p class="eyebrow">${escapeHtml(stage)}</p>
      <h1 class="stage-title">Quiet. Broad.<br>Ready.</h1>
      <p class="subtle">Train the state. Retrieve the state. Carry it into action.</p>
    </div>
    <button class="primary-action" data-action="open-train">${trainLabel}${model.trainCompletedToday ? '<br><span class="muted">Completed today</span>' : ''}</button>
    <button class="secondary-action" data-action="open-deploy" ${deploy ? '' : 'disabled'}>
      DEPLOY${deploy ? ` ${escapeHtml(deploy)}` : '<br><span class="muted">Available after Foundation</span>'}
    </button>
    <nav class="nav-row" aria-label="Application">
      <button class="nav-link" data-action="open-progress">Progress</button>
      <button class="nav-link" data-action="open-history">History</button>
      <button class="nav-link" data-action="open-protocol">Protocol</button>
    </nav>
  </section>`;
}

function trainPrepare(model) {
  return `<section>
    <h1 class="screen-title">TRAIN</h1>
    <p class="screen-copy">Canonical Practice 1.0. Approximately 12:20 after the breath-governed Kuji opening.</p>
    <div class="card">
      <p class="card-title">Before beginning</p>
      <p class="subtle">Assume seiza. Use comfortable breathing only. The session may be ended at any time.</p>
      <div class="notice warning">Stop for significant dizziness, pain, breathing difficulty, faintness, or disorientation.</div>
    </div>
    <div class="session-actions">
      <button class="primary-action" data-action="begin-train">BEGIN</button>
      <button class="quiet-action" data-action="go-home">CANCEL</button>
    </div>
  </section>`;
}

function deployPrepare(model) {
  const options = model.unlockedDeployVariants.map(v => `<option value="${v}" ${v === model.deployDraft.variant ? 'selected' : ''}>DEPLOY ${v}</option>`).join('');
  return `<section>
    <h1 class="screen-title">DEPLOY ${escapeHtml(model.deployDraft.variant)}</h1>
    <p class="screen-copy">Release. Widen. Still. Act. Tap READY the instant a recognizable functional approximation of the trained state is available.</p>
    <form id="deploy-prep-form">
      <div class="card">
        <div class="form-row">
          <label for="deploy-variant">Retrieval window</label>
          <select id="deploy-variant" name="variant">${options}</select>
        </div>
        <div class="form-row">
          <label for="deploy-task">Next task</label>
          <select id="deploy-task" name="task">
            ${taskOptions(model.deployDraft.task)}
          </select>
        </div>
        <div class="form-row">
          <label>Context</label>
          <div class="chip-grid">${modifierChips(model.deployDraft.modifiers)}</div>
        </div>
      </div>
      <div class="session-actions">
        <button class="primary-action" type="submit">BEGIN</button>
        <button class="quiet-action" type="button" data-action="go-home">CANCEL</button>
      </div>
    </form>
    ${model.progress?.highest_stage_unlocked === 'generalization' ? '<p class="notice">Generalization is active: vary context deliberately rather than repeating only the easiest setting.</p>' : ''}
    ${model.progress?.highest_stage_unlocked === 'robustification' ? '<p class="notice">Robustification is unlocked. Mild-perturbation orchestration remains deliberately separate from ordinary DEPLOY in this checkpoint.</p>' : ''}
  </section>`;
}

function progress(model) {
  const p = model.progress;
  const g = p?.gates ?? {};
  const median = model.medianLatency;
  return `<section>
    <h1 class="screen-title">PROGRESS</h1>
    <p class="eyebrow">${escapeHtml(formatStage(p?.highest_stage_unlocked ?? 'foundation'))}</p>
    <p class="screen-copy">Capability evidence, not meditation rank.</p>
    <div class="card">
      <p class="card-title">Current evidence</p>
      ${gateLine('Foundation target state', `${g.foundation?.targetCount ?? 0} / ${g.foundation?.recentCount ?? 0}`)}
      ${gateLine('DEPLOY 60', gateWindow(g.association))}
      ${gateLine('DEPLOY 30', gateWindow(g.compression1))}
      ${gateLine('DEPLOY 15', gateWindow(g.compression2))}
      ${gateLine('Recommended retrieval', p?.recommended_deploy_variant ? `DEPLOY ${p.recommended_deploy_variant}` : 'Locked')}
      ${gateLine('Median successful retrieval', median === null ? 'More observations needed' : formatLatency(median))}
    </div>
    <div class="card">
      <p class="card-title">Generalization</p>
      ${generalizationRows(g.generalization?.classes)}
    </div>
    ${p?.respiratory_progression_block ? '<div class="notice warning">Progression is paused because breathing discomfort has been recorded repeatedly. Use comfortable natural breathing and review the safety guidance.</div>' : ''}
  </section>`;
}

function history(model) {
  if (!model.historyItems.length) return `<section><h1 class="screen-title">HISTORY</h1><p class="screen-copy">No sessions recorded yet.</p></section>`;
  return `<section>
    <h1 class="screen-title">HISTORY</h1>
    <div class="history-list">
      ${model.historyItems.map(item => `<button class="history-item" data-action="open-history-detail" data-kind="${item.kind}" data-id="${escapeHtml(item.id)}">
        <span><strong>${item.kind === 'train' ? 'TRAIN' : `DEPLOY ${escapeHtml(item.variant)}`}</strong><br><small>${escapeHtml(formatDateTime(item.started_at))}</small></span>
        <span class="${item.statusClass}">${escapeHtml(item.summary)}</span>
      </button>`).join('')}
    </div>
  </section>`;
}

function historyDetail(model) {
  const s = model.selectedHistory;
  if (!s) return `<section><h1 class="screen-title">SESSION</h1><p>Record unavailable.</p></section>`;
  if (s.kind === 'train') {
    return `<section>
      <h1 class="screen-title">TRAIN</h1>
      <p class="screen-copy">${escapeHtml(formatDateTime(s.started_at))}</p>
      <div class="card">
        ${gateLine('Stillness', s.stillness)}
        ${gateLine('Breadth', s.breadth)}
        ${gateLine('Effortlessness', s.effortlessness)}
        ${gateLine('Readiness', s.readiness)}
        ${gateLine('Target State', s.target_state_present ? 'Present' : 'Not established')}
        ${gateLine('Encode', s.encode_performed ? 'Performed' : 'Skipped')}
        ${gateLine('Drowsiness', s.drowsiness_flag ? 'Yes' : 'No')}
        ${gateLine('Breath discomfort', s.respiratory_discomfort_flag ? 'Yes' : 'No')}
        ${gateLine('Status', s.status)}
      </div>
      <button class="danger-action" data-action="delete-history" data-kind="train" data-id="${escapeHtml(s.id)}">DELETE RECORD</button>
    </section>`;
  }
  return `<section>
    <h1 class="screen-title">DEPLOY ${escapeHtml(s.variant)}</h1>
    <p class="screen-copy">${escapeHtml(formatDateTime(s.started_at))}</p>
    <div class="card">
      ${gateLine('Retrieval', s.retrieval_success ? 'Established' : 'Not established')}
      ${gateLine('Latency', s.retrieval_success ? formatLatency(s.retrieval_latency_ms) : '—')}
      ${gateLine('Task', s.context?.task ?? 'None')}
      ${gateLine('Task begun', s.task_started ? 'Yes' : 'No')}
      ${gateLine('Status', s.status)}
    </div>
    <button class="danger-action" data-action="delete-history" data-kind="deploy" data-id="${escapeHtml(s.id)}">DELETE RECORD</button>
  </section>`;
}

function settings(model) {
  const s = model.settings;
  return `<section>
    <h1 class="screen-title">SETTINGS</h1>
    <div class="card">
      <p class="card-title">Practice</p>
      ${toggle('audio_enabled', 'Transition tones', s.audio_enabled)}
      ${toggle('wake_lock_enabled', 'Keep screen awake', s.wake_lock_enabled)}
      ${toggle('kuji_visuals_enabled', 'Kuji reference text', s.kuji_visuals_enabled)}
      <div class="form-row"><label for="timer-visibility">Timer</label><select id="timer-visibility" data-setting="timer_visibility"><option value="minimal" ${s.timer_visibility === 'minimal' ? 'selected' : ''}>Minimal</option><option value="hidden" ${s.timer_visibility === 'hidden' ? 'selected' : ''}>Hidden</option></select></div>
    </div>
    <div class="card">
      <p class="card-title">Data</p>
      <button class="secondary-action" data-action="export-data">EXPORT DATA</button>
      <button class="secondary-action" data-action="choose-import">IMPORT DATA</button>
      <input class="file-input" id="import-file" type="file" accept="application/json,.json">
      <div class="divider"></div>
      <button class="danger-action" data-action="reset-app">RESET STILL WATER</button>
    </div>
    <div class="card">
      <p class="card-title">Build</p>
      ${gateLine('Application', model.appVersion)}
      ${gateLine('Practice Protocol', model.protocolVersion)}
      ${gateLine('Storage', 'Local device')}
      ${gateLine('Core network requirement', 'None after installation')}
    </div>
  </section>`;
}

function protocol(model) {
  return `<section>
    <h1 class="screen-title">PROTOCOL 1.0</h1>
    <p class="screen-copy">STILL WATER is a structured attentional and state-retrieval training protocol. It does not claim to measure brain states, vagal tone, meditation depth, enlightenment, or authentic mushin.</p>
    <div class="card">
      <p class="card-title">TRAIN</p>
      ${gateLine('Regulate', '02:00 · 4 in / 6 out')}
      ${gateLine('Stabilize', '05:00 · natural breath · 1–10')}
      ${gateLine('Release count', '00:30')}
      ${gateLine('Release anchor', '00:30')}
      ${gateLine('Open', '03:00')}
      ${gateLine('Encode', '00:20')}
      ${gateLine('Transfer', 'behavior-guided')}
    </div>
    <div class="card">
      <p class="card-title">Core rules</p>
      <p class="subtle"><strong>Recovery:</strong> recognize → release → next completed exhale = ONE.</p>
      <p class="subtle"><strong>Open:</strong> nothing excluded. Nothing followed.</p>
      <p class="subtle"><strong>Cue:</strong> release → widen → STILL → act.</p>
      <p class="subtle"><strong>Alertness:</strong> calm is insufficient if it becomes dullness, microsleep, or disorientation.</p>
    </div>
    <div class="notice warning">Never use STILL WATER while driving, cycling in traffic, swimming, operating machinery, or during any hazardous activity where inward attention would create risk.</div>
  </section>`;
}

function sessionScreen(model) {
  if (model.sessionMode === 'train_review') return trainReview(model);
  if (model.sessionMode === 'deploy_review') return deployReview(model);
  return `<div class="session-shell">
    <div class="session-top">
      <span class="session-phase-index">${escapeHtml(model.phaseIndex ?? '')}</span>
      <button class="session-exit" data-action="request-session-exit" aria-label="End session">×</button>
    </div>
    <main class="session-body">${sessionBody(model)}</main>
    ${model.sessionActions ?? ''}
  </div>
  ${modal(model.modal)}
  ${model.toast ? `<div class="toast" role="status">${escapeHtml(model.toast)}</div>` : ''}`;
}

function sessionBody(model) {
  if (model.sessionMode === 'train') return trainSessionBody(model);
  if (model.sessionMode === 'deploy') return deploySessionBody(model);
  return '';
}

function trainSessionBody(model) {
  const state = model.trainState;
  if (state === 'KUJI_INTRO') return `<p class="phase-name">Opening Ritual</p><h1 class="phase-cue">Gassho.</h1><p class="phase-detail">One natural inhale. One slow, comfortable exhale. Begin the nine seals when ready.</p>`;
  const kuji = KUJI.find(k => k.state === state);
  if (kuji) return `<p class="phase-name">${kuji.ordinal} / 09</p><div class="kuji-kanji">${kuji.kanji}</div><h1 class="kuji-name">${kuji.name}</h1>${model.settings.kuji_visuals_enabled ? `<p class="kuji-mudra">${escapeHtml(kuji.mudra)}</p>` : ''}<p class="phase-detail">2–3 natural breaths. Silently recite the syllable once per breath if desired.</p>`;
  if (state === 'KUJI_CLOSE') return `<p class="phase-name">Opening Complete</p><h1 class="phase-cue">Gassho. Bow.</h1><p class="phase-detail">Lower hands to cosmic mudra. Set the half-open lowered gaze. Continue only when positioned.</p>`;
  if (state === 'TRANSFER') return `<p class="phase-name">Transfer</p><h1 class="phase-cue">Carry it into movement.</h1><p class="phase-detail">Gassho. Bow. Rise only when sensation and balance are reliable. Move normally and begin one simple action belonging to the next task.</p>`;
  if (state === 'ENCODE_SKIPPED') return `<p class="phase-name">Encode Skipped</p><h1 class="phase-cue">Remain open.</h1>`;
  const isRegulate = state === 'REGULATE';
  const aperture = state === 'RELEASE_ANCHOR' ? 92 : state === 'OPEN' || state === 'ENCODE' ? 100 : 46;
  return `
    <p class="phase-name">${escapeHtml(model.phaseName)}</p>
    <h1 class="phase-cue">${escapeHtml(model.phaseCue)}</h1>
    <div class="waterline-wrap">
      <div class="waterline ${state === 'RELEASE_ANCHOR' ? 'aperture-line' : ''}" style="--line-width:${isRegulate ? model.breathLineWidth : aperture}%;--line-opacity:${model.lineOpacity};"></div>
    </div>
    ${isRegulate ? `<div class="breath-label">${escapeHtml(model.breathLabel)}</div>` : ''}
    ${model.timerText ? `<div class="timer">${escapeHtml(model.timerText)}</div>` : ''}
    ${state === 'OPEN' ? `<button class="skip-encode ${model.encodeSkipped ? 'active' : ''}" data-action="toggle-skip-encode">${model.encodeSkipped ? 'Encode will be skipped' : 'Skip Encode'}</button>` : ''}
  `;
}

function deploySessionBody(model) {
  if (model.deployState === 'DEPLOY_SUCCESS') return `<p class="phase-name">Retrieved</p><h1 class="phase-cue">ACT</h1>`;
  if (model.deployState === 'DEPLOY_TIMEOUT') return `<p class="phase-name">Window Complete</p><h1 class="phase-cue">CONTINUE.</h1><p class="phase-detail">Begin the task normally.</p>`;
  const cue = {
    settle: 'Settle.',
    release_widen_still: 'Release. Widen. Still.',
    ready: '',
    release_widen_still_ready: 'Release. Widen. Still.'
  }[model.deployCue] ?? '';
  return `<p class="phase-name">DEPLOY ${escapeHtml(model.deployVariant)}</p><div class="deploy-cue">${escapeHtml(cue)}</div><button class="ready-button" data-action="deploy-ready">READY</button>${model.timerText ? `<div class="timer">${escapeHtml(model.timerText)}</div>` : ''}`;
}

function trainReview(model) {
  return `<div class="session-shell"><main class="review-shell">
    <p class="eyebrow">After TRAIN</p>
    <h1 class="screen-title">Record the state.</h1>
    <form id="train-review-form">
      <div class="card rating-grid">
        ${ratingRow('Stillness', 'stillness', model.reviewRatings.stillness)}
        ${ratingRow('Breadth', 'breadth', model.reviewRatings.breadth)}
        ${ratingRow('Effortlessness', 'effortlessness', model.reviewRatings.effortlessness)}
        ${ratingRow('Readiness', 'readiness', model.reviewRatings.readiness)}
      </div>
      <div class="card">
        ${toggleInput('drowsiness', 'Significant drowsiness', model.reviewFlags.drowsiness)}
        ${toggleInput('respiratory_discomfort', 'Respiratory discomfort', model.reviewFlags.respiratory_discomfort)}
        <div class="form-row"><label for="train-context">Next-task context (optional)</label><select id="train-context" name="task">${taskOptions(model.reviewTask)}</select></div>
      </div>
      <button class="primary-action" type="submit">COMPLETE</button>
    </form>
  </main></div>${modal(model.modal)}`;
}

function deployReview(model) {
  return `<div class="session-shell"><main class="review-shell">
    <p class="eyebrow">DEPLOY ${escapeHtml(model.deployVariant)}</p>
    <h1 class="screen-title">${model.deploySuccess ? 'ACT' : 'CONTINUE.'}</h1>
    <p class="screen-copy">${model.deploySuccess ? `Retrieval recorded at ${escapeHtml(formatLatency(model.deployLatencyMs))}. Begin the intended task.` : 'The retrieval window ended. Begin the task normally.'}</p>
    <button class="primary-action" data-action="finalize-deploy" data-task-started="true">TASK STARTED</button>
    <button class="quiet-action" data-action="finalize-deploy" data-task-started="false">NOT YET</button>
  </main></div>${modal(model.modal)}`;
}

function ratingRow(label, name, selected) {
  return `<div class="rating-row"><span class="label">${escapeHtml(label)}</span>${[0,1,2,3].map(v => `<button type="button" class="rating-button ${selected === v ? 'selected' : ''}" data-action="set-rating" data-rating="${name}" data-value="${v}">${v}</button>`).join('')}</div>`;
}

function toggleInput(name, label, checked) {
  return `<label class="toggle-row"><span>${escapeHtml(label)}</span><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}></label>`;
}

function toggle(setting, label, checked) {
  return `<label class="toggle-row"><span>${escapeHtml(label)}</span><input type="checkbox" data-setting="${setting}" ${checked ? 'checked' : ''}></label>`;
}

function gateLine(label, value) {
  return `<div class="stat"><span class="subtle">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function gateWindow(gate) {
  if (!gate) return '0 / 0';
  return `${gate.successes ?? 0} / ${gate.recentCount ?? 0}`;
}

function generalizationRows(classes = {}) {
  const labels = {
    seated_cognitive: 'Seated cognitive',
    movement_adjacent: 'Movement-adjacent',
    mild_distraction: 'Mild distraction',
    different_time: 'Different time'
  };
  return Object.keys(labels).map(k => {
    const x = classes?.[k] ?? { successes: 0, trials: 0, met: false };
    return gateLine(labels[k], `${x.successes}/${x.trials}${x.met ? ' · criterion met' : ''}`);
  }).join('');
}

function taskOptions(selected = null) {
  const options = [
    [null, 'None'], ['work','Work'], ['chess','Chess'], ['writing','Writing'], ['reading','Reading'], ['coding','Coding'], ['exercise','Exercise'], ['conversation','Conversation'], ['creative','Creative'], ['other','Other']
  ];
  return options.map(([v,l]) => `<option value="${v ?? ''}" ${(selected ?? '') === (v ?? '') ? 'selected' : ''}>${l}</option>`).join('');
}

function modifierChips(selected = []) {
  const set = new Set(selected);
  const items = [['seated','Seated'],['standing','Standing'],['after_walking','After walking'],['ambient_noise','Ambient noise'],['unfamiliar_room','Unfamiliar room'],['different_time','Different time']];
  return items.map(([v,l]) => `<label class="chip"><input type="checkbox" name="modifier" value="${v}" ${set.has(v) ? 'checked' : ''}><span>${l}</span></label>`).join('');
}

function modal(data) {
  if (!data) return '';
  return `<div class="modal-backdrop" role="dialog" aria-modal="true">
    <div class="modal">
      <h2>${escapeHtml(data.title)}</h2>
      <p>${escapeHtml(data.copy)}</p>
      <div class="action-row">
        <button class="secondary-action" data-action="${escapeHtml(data.cancelAction ?? 'close-modal')}">${escapeHtml(data.cancelLabel ?? 'Cancel')}</button>
        <button class="${data.danger ? 'danger-action' : 'primary-action'}" data-action="${escapeHtml(data.confirmAction)}">${escapeHtml(data.confirmLabel ?? 'Continue')}</button>
      </div>
    </div>
  </div>`;
}
