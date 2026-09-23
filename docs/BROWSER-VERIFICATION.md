# Browser Verification Checklist — STILL WATER v0.2.0

Run after `npm run verify` on an unrestricted Chromium/Safari environment.

## 1. First load

- open the app;
- page is not blank;
- title is `STILL WATER`;
- onboarding page 1 shows `TRAIN THE STATE. RETRIEVE THE STATE.`;
- complete all five onboarding pages;
- HOME shows Foundation, TRAIN, and locked DEPLOY.

## 2. IndexedDB

In DevTools → Application → IndexedDB confirm database `still_water` with stores:

- profile
- settings
- train_sessions
- deploy_sessions
- progress_state
- app_events

## 3. TRAIN smoke path

- TRAIN → BEGIN;
- Opening Ritual appears;
- begin seals;
- verify Rin / Dokko-in first;
- verify all nine seals advance in canonical order;
- verify backward navigation is only one seal where available;
- after Zen, verify Gassho/Bow close screen;
- continuing begins REGULATE with a 4-second IN / 6-second OUT visual cycle;
- End Session remains available.

A full timed acceptance run should additionally confirm each frozen phase duration and review persistence.

## 4. Persistence

- abort one TRAIN attempt;
- return HOME;
- History shows the aborted attempt;
- reload the page;
- record remains.

## 5. Crash checkpoint

- begin TRAIN;
- reload before completion;
- next launch offers `Record interrupted` / `Discard`;
- recording creates an interrupted History record;
- app does not resume the old phase.

## 6. Progress gate

Fresh database:

- DEPLOY must be locked;
- no manual setting can unlock it.

Synthetic progression should be tested only through test fixtures or imported valid records, never by altering production constants.

## 7. Service worker / offline

- Application → Service Workers shows an active worker;
- reload once so the page is controlled;
- enable browser Offline mode;
- reload;
- HOME must still render;
- navigate to Progress/History/Settings;
- begin TRAIN and verify local operation;
- restore network.

## 8. Import/export

- export JSON;
- inspect that it contains profile/settings/TRAIN/DEPLOY/progress fields;
- reset app;
- import export;
- verify History returns and progression is recomputed.

## 9. Mobile / iOS

- add to Home Screen;
- launch standalone;
- verify safe-area padding;
- verify 44px+ touch targets;
- verify audio failure does not block practice;
- verify screen wake is progressive enhancement;
- verify orientation remains usable even if platform ignores portrait preference.

## 10. No-console-error gate

Before publishing a release, verify there are no uncaught errors during:

- first launch;
- onboarding;
- TRAIN entry;
- Kuji navigation;
- Settings save;
- export/import;
- offline reload.
