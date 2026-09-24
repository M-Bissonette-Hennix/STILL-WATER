# STILL WATER v0.2.2

Local-first Progressive Web Application implementing **STILL WATER Practice Protocol 1.0**.

STILL WATER is a precision attentional training instrument: formal TRAIN sessions establish the target state; criterion-gated DEPLOY sessions train increasingly compact retrieval before real activity.

## Current checkpoint

**Application v0.2.2 / Practice Protocol 1.0**

Current implementation includes:

- deterministic TRAIN and DEPLOY state machines;
- deadline-based monotonic timing;
- stage-specific progression/gating logic;
- IndexedDB local persistence and import/export;
- interruption/crash checkpoints;
- complete TRAIN and DEPLOY flows;
- nine local/offline Kuji hand-seal illustrations;
- iOS-oriented transition audio using HTML media rather than Web Audio on the critical TRAIN path;
- continuous TRAIN audio timeline with embedded tones at exact protocol boundaries;
- History, Progress, Settings, Protocol surfaces;
- installable/offline PWA shell;
- GitHub Pages workflow;
- zero third-party runtime dependencies;
- automated protocol certificate and adversarial test suite.

## Audio architecture

v0.2.2 deliberately does **not** rely on AudioContext for automatic TRAIN transitions.

After Kuji, the explicit **CONTINUE** tap starts a local continuous media timeline. Transition tones are embedded at 0:00, 2:00, 7:00, 7:30, 8:00, 11:00, and 11:20. This prevents iOS from having to authorize a newly-created sound from a timer callback several minutes into a session.

`Settings → TEST AUDIO` uses a fresh HTML media element for each test. `TEST TIMED TRANSITION` stays silent for about three seconds and then sounds without another tap, providing a fast diagnostic of the automatic-transition mechanism.

## Verify

Requires Node.js 22+.

```bash
npm ci --ignore-scripts
npm run verify
```

Current certificate target:

- 60 automated tests
- Practice Protocol 1.0 invariants
- IndexedDB schema v1
- local asset closure
- service-worker audio + Kuji precache

## Run locally

```bash
npm run serve
```

Then open `http://127.0.0.1:4173/`.

## Publish

Push to GitHub and use **Settings → Pages → Source: GitHub Actions**. The included workflow validates before publishing.

See `docs/RELEASE-NOTES-v0.2.2.md` for the audio hotfix architecture.
