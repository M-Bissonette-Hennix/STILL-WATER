# STILL WATER v0.2.0 — Development Pass Release Notes

## What this pass accomplishes

This checkpoint converts the previously certified behavioral kernel into a functioning local-first PWA architecture.

### Persistence

- IndexedDB v1 database with six object stores.
- deterministic initialization/migration path.
- validated TRAIN/DEPLOY writes.
- derived progress cache.
- privacy deletion with from-scratch evidence recomputation.
- transactional import replacement.
- JSON export.
- bounded diagnostic-event store.

### Recovery

- active session checkpoint in localStorage.
- stale-session record/discard flow.
- no automatic contemplative-session resume.
- substantive TRAIN visibility interruptions are explicit.
- active DEPLOY backgrounding invalidates latency measurement.

### Application shell

- five-page first-run onboarding.
- Home.
- complete Kuji-guided TRAIN path.
- paced REGULATE visualization.
- timed STABILIZE/RELEASE/OPEN/ENCODE.
- ENCODE skip control.
- behavior-guided TRANSFER.
- post-TRAIN four-axis state review.
- DEPLOY 60/30/15 preparation, timing, READY capture, timeout, task transition.
- Progress, History/detail/delete, Settings, Protocol surfaces.

### PWA / offline

- Web App Manifest.
- 180/192/512 px icons plus SVG source.
- versioned service-worker shell cache.
- repository-subpath-safe relative paths.
- GitHub Actions verification and Pages deployment.

### Visual/audio

- dark mineral/water palette distinct from THRESHOLD/AMOLED black-white.
- horizon/surface icon and waterline interaction metaphor.
- progressively sparse practice interface.
- generated local Web Audio transition tones; no media dependency.

### Hardening introduced during this pass

1. Deleting evidence recomputes stage from remaining records instead of preserving invisible historical unlocks.
2. Generalization trials must be performed exactly in the Generalization stage; later Robustification records cannot backfill deleted evidence.
3. Imported sessions and settings are validated before transactional replacement.
4. Target-state cached boolean must agree with its four underlying ratings.
5. Successful DEPLOY requires a nonnegative latency; unsuccessful/timeout attempts cannot retain a latency.
6. Offline fallback returns the application shell only for navigation requests, preventing HTML from masquerading as missing module assets.
7. Restrictive CSP and zero third-party runtime references are enforced by static verification.

## Intentionally deferred

- dedicated Robustification perturbation/recovery orchestrator;
- Immediate DEPLOY user-facing unlock criterion;
- Maintenance completion gate;
- optional physiological sensors;
- cloud sync or accounts;
- notifications/reminders;
- optional spoken voice cues.

These are deferred because they are either the next module or require a practice/protocol decision not yet defined by Practice 1.0.
