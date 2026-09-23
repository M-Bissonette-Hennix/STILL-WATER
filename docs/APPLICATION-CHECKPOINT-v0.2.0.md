# STILL WATER v0.2.0 — Application Checkpoint

## Authority chain

1. STILL WATER Practice Specification v1.0
2. Application Architecture & Interaction Specification v0.1
3. Frozen constants/state machines in `src/core/`
4. Persistence and UI adapters in this checkpoint

The UI does not own practice mechanics.

## Data layer

IndexedDB database: `still_water`, schema version 1.

Stores:

- `profile`
- `settings`
- `train_sessions`
- `deploy_sessions`
- `progress_state`
- `app_events`

Raw session records are authoritative. `progress_state` is a cache and is reproducible from raw evidence.

### Progress recomputation semantics

Normal new sessions preserve the highest previously unlocked training stage, because short-term performance fluctuation is not punitive demotion.

Deletion, import replacement, and full reset intentionally recompute from `foundation` using only evidence that still exists. This prevents an invisible historical best from surviving deletion of its underlying records.

## Active-session checkpointing

A lightweight active-session checkpoint is kept in localStorage solely for crash/reload recovery. It contains no ratings or narrative content.

On next launch the user may:

- record the stale attempt as `interrupted`; or
- discard the incomplete checkpoint.

A contemplative session is never automatically resumed after a browser/application restart.

## TRAIN implementation

Canonical path:

`KUJI → REGULATE → STABILIZE → RELEASE COUNT → RELEASE ANCHOR → OPEN → ENCODE → TRANSFER → REVIEW`

Canonical timed durations remain protocol-locked.

Manual Kuji transitions preserve the breath-governed nature of the nine seals. Timed states use a monotonic deadline timer rather than interval counting.

### Visibility/background behavior

- brief backgrounding (`≤15 s`) leaves monotonic timing intact;
- elapsed carry may cross a phase boundary without silently lengthening the protocol;
- substantive backgrounding (`>15 s`) stops automatic progression and requires explicit resume/end;
- resuming restarts the interrupted phase from its beginning;
- interrupted ENCODE is never repeated; its cue is marked skipped and the user proceeds to TRANSFER.

## DEPLOY implementation

User-facing variants:

- DEPLOY 60 — after Foundation;
- DEPLOY 30 — after Association gate;
- DEPLOY 15 — after Compression I/II progression as defined by the kernel.

`Immediate` remains internal to the protocol constants but is not automatically exposed because Practice 1.0 provides no objective unlock criterion.

Backgrounding while DEPLOY is actively measuring latency invalidates the measurement and records an interrupted attempt.

## Generalization evidence isolation

Only trials whose `training_stage_at_start` is exactly `generalization` can satisfy the Generalization gate. Earlier trials cannot count retroactively, and later Robustification trials cannot backfill Generalization evidence after deletion.

## Safety behavior

- no deliberate breath holds are implemented;
- no user-editable respiratory timing is exposed;
- respiratory discomfort can block automatic progression according to the frozen application heuristic;
- the app never diagnoses the reason;
- session exit remains available;
- hazardous-use prohibition is included in Protocol guidance.

## Privacy/security

- no account;
- no remote database;
- no analytics;
- no advertising SDK;
- no third-party scripts;
- no cloud error reporting;
- restrictive CSP;
- imported JSON is schema-validated before replacing local history.

## PWA/offline

The service worker precaches the complete runtime module graph, styles, manifest, and icons. After first successful installation/load, core operation requires no network.

GitHub Pages paths are relative so repository-subpath deployment is supported.

## Test boundary

Node verification exercises protocol, state machine, timing, progression, schema hardening, checkpoint behavior, persistence contracts, import/export invariants, local-module graph closure, service-worker precache closure, manifest paths, and CSP/static-shell integrity.

The current execution environment applies an enterprise Chromium URLBlocklist to localhost, hostname aliases, and file URLs. Therefore interactive browser execution cannot be completed inside this container. This is documented rather than falsely reported as a pass. A browser verification checklist is supplied for execution on an unrestricted browser or the deployed GitHub Pages origin.
