# STILL WATER Implementation Kernel v0.1.0 — Development Pass Notes

## Purpose

This checkpoint freezes the executable behavioral substrate beneath the future PWA UI.

## Resolved implementation ambiguities

### 1. Maintenance is not auto-unlocked
Practice Specification v1.0 describes Maintenance conceptually but does not define a measurable criterion for completing Robustification. The kernel therefore refuses to invent one. The highest evidence-derived stage in v0.1.0 is `robustification`. A future practice/protocol revision must define a Maintenance completion gate before software can unlock it automatically.

### 2. Stage-specific progression evidence
DEPLOY trials used to unlock Association, Compression I, Compression II, and Generalization are scoped to the training stage in which those trials were performed. This prevents later DEPLOY-15 Generalization trials from retrospectively changing the Compression II window, and prevents pre-Generalization trials from satisfying Generalization requirements.

### 3. Highest-stage monotonicity versus recommendations
Historical stage unlocks are not punitive. Recommendation logic may fall back from DEPLOY 30 to 60 or from 15 to 30 when recent reliability is poor; historical unlocked capability is not erased.

### 4. Genuine timeout versus technical invalidation
A genuine timeout is eligible progression evidence. Interrupted, aborted, or technical-error attempts are not. This prevents unsuccessful real attempts from disappearing while excluding corrupted measurements.

### 5. Respiratory progression block
The software-level safety heuristic follows the architecture specification: two discomfort flags among the latest five completed TRAIN sessions block automatic progression, and four consecutive comfortable completed TRAIN sessions clear the block. This is a progression heuristic, not a diagnosis.

## Kernel boundaries

Implemented:
- protocol constants
- target-state predicate
- breathing-cycle derivation
- TRAIN/DEPLOY state machines
- monotonic deadline timer
- background interruption classifier
- DEPLOY cue scheduler
- all currently defined progression gates
- stage-specific evidence filtering
- median latency statistic
- session schema construction/validation
- export validation
- automated test suite
- integrity certificate

Deferred to the next pass:
- IndexedDB repository adapter and migrations
- active-session checkpoint persistence
- application shell/router
- TRAIN/DEPLOY UI
- PWA manifest and service worker
- audio engine/assets
- GitHub Actions / Pages deployment workflow
- visual acceptance testing
