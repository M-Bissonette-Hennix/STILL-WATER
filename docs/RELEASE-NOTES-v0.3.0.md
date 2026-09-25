# STILL WATER v0.3.0 — Post-Use Refinement Release

Practice Protocol remains **1.0**. No canonical phase durations, breath pacing, state-machine sequence, DEPLOY windows, or progression gates were changed.

## Audit findings addressed

1. **Home had no daily command logic.** The app exposed TRAIN/DEPLOY and gates but made the practitioner decide what the protocol wanted next. v0.3.0 adds a non-gamified Today directive: TRAIN first; after TRAIN, one recommended DEPLOY when the current stage calls for it; otherwise core work complete.
2. **Post-TRAIN ratings could silently default to zero.** This corrupted evidence if the practitioner submitted without deliberate choices. Ratings now begin unselected and completion remains disabled until all four are explicitly recorded.
3. **TRANSFER was semantically premature.** `TASK BEGUN` could be tapped before a real first action. It is now `FIRST ACTION COMPLETE`, and the screen explicitly directs the practitioner to put the device down, perform one simple next-task action, then return.
4. **Carryover was specified but never measured.** v0.3.0 adds a 0–3 carryover observation after successful first-action transfer. It is stored independently and does not alter Target State or progression gates.
5. **Progress emphasized gates over learning.** The Progress screen now exposes recent Target State availability, four dimension medians, carryover median, first-action transfer, recent retrieval reliability, current retrieval median, and latency change versus the previous successful window.
6. **Generalization lacked a next-evidence recommendation.** When Generalization is active, the app identifies the least-covered unmet context class without automatically fabricating context.
7. **Robustification was unlockable but not executable.** v0.3.0 adds the safe Stage VI workflow using only the already-authorized benign perturbation types. Perturbation type/duration are stored on the DEPLOY record; successful DEPLOY latency functions as recovery latency. No Maintenance completion gate is invented.
8. **Local-only data had weak backup salience.** After enough real use, the Home screen can recommend an export when no recent backup exists. Settings records the last export timestamp.
9. **Stored cue level was not exposed.** Settings now provides a cue-level slider while retaining TEST AUDIO and TEST TIMED TRANSITION.
10. **Installed PWA updates could remain stale.** Service-worker replacement is detected and a safe reload affordance appears outside active sessions. An update detected during a session is deferred until the user returns to the application shell.

## Backward compatibility

- IndexedDB remains `still_water` schema v1 with the same six stores.
- Existing TRAIN records without `carryover` remain valid; `carryover` is an optional additive field.
- Existing exports remain valid.
- Existing settings records are merged with the new nullable `last_export_at` default.
- Icons, Kuji images, and audio media assets are unchanged.

## Robustification safety

The new UI only exposes:
- difficult puzzle
- brief arithmetic
- brisk walk
- ambient distraction
- other benign challenge

It explicitly prohibits pain, breath restriction, sleep deprivation, panic induction, extreme heat/cold, intoxicants, interpersonal provocation, and hazardous exposure.

## Verification

See `VERIFY-v0.3.0.txt` and `CERTIFICATE-v0.3.0.txt`.
