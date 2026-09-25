import test from 'node:test';
import assert from 'node:assert/strict';
import { renderApp } from '../src/ui/render.js';

function root() { return { innerHTML: '' }; }
function base(overrides={}) {
  return {
    view:'home', sessionMode:null, settings:{ audio_enabled:true, audio_volume:.28, wake_lock_enabled:true, kuji_visuals_enabled:true, timer_visibility:'minimal', last_export_at:null },
    progress:{ highest_stage_unlocked:'foundation', recommended_deploy_variant:null, respiratory_progression_block:false, gates:{ foundation:{targetCount:2,recentCount:2}, association:{successes:0,recentCount:0}, compression1:{successes:0,recentCount:0}, compression2:{successes:0,recentCount:0}, generalization:{classes:{} } } },
    onboardingIndex:0, modal:null, toast:null, appVersion:'0.3.0', protocolVersion:'1.0', trainCompletedToday:false,
    deployDraft:{variant:'60',task:null,modifiers:[]}, unlockedDeployVariants:[], medianLatency:null, historyItems:[], selectedHistory:null,
    reviewRatings:{stillness:null,breadth:null,effortlessness:null,readiness:null}, reviewCarryover:null, reviewFlags:{drowsiness:false,respiratory_discomfort:false}, reviewTask:null,
    trainAnalytics:{recentCount:2,targetCount:2,dimensionMedian:{stillness:2,breadth:2,effortlessness:2,readiness:2},carryoverMedian:null,transferCount:2},
    deployAnalytics:{recentCount:0,successes:0,recentMedianMs:null,deltaMs:null}, robustificationAnalytics:{trials:0,successful:0,medianRecoveryMs:null},
    todayDirective:{kind:'train',title:'TRAIN today',copy:'Daily formal practice is the primary exposure.',action:'open-train',actionLabel:'BEGIN TRAIN'},
    generalizationGap:null, backupRecommended:false, updateReady:false, robustifyDraft:{variant:'15',type:'difficult_puzzle',task:null,modifiers:[]}, robustifyActive:null, robustifyPending:null,
    ...overrides
  };
}

test('home renders daily directive and PWA update affordance without breaking primary actions', () => {
  const r=root(); renderApp(r, base({updateReady:true}));
  assert.match(r.innerHTML,/TRAIN today/);
  assert.match(r.innerHTML,/Reload now/);
  assert.match(r.innerHTML,/data-action="open-train"/);
});

test('TRAIN review has no selected zero ratings by default and requires explicit state choices', () => {
  const r=root(); renderApp(r, base({sessionMode:'train_review',trainTransferTaskBegun:true}));
  assert.match(r.innerHTML,/Select deliberately/);
  assert.match(r.innerHTML,/Carryover/);
  assert.doesNotMatch(r.innerHTML,/rating-button selected[^>]*>0</);
  assert.match(r.innerHTML,/type="submit" disabled/);
});

test('robustification prepare renders only benign choices and explicit prohibition copy', () => {
  const r=root(); renderApp(r, base({view:'robustify_prepare', unlockedDeployVariants:['60','30','15'], progress:{...base().progress, highest_stage_unlocked:'robustification', recommended_deploy_variant:'15'}}));
  assert.match(r.innerHTML,/Difficult puzzle/);
  assert.match(r.innerHTML,/Brisk walk/);
  assert.match(r.innerHTML,/Never use pain, breath restriction, sleep deprivation/);
  assert.doesNotMatch(r.innerHTML,/cold exposure challenge/i);
});

test('settings exposes cue level and local backup timestamp', () => {
  const r=root(); renderApp(r, base({view:'settings'}));
  assert.match(r.innerHTML,/Cue level/);
  assert.match(r.innerHTML,/Last export: Never/);
});
