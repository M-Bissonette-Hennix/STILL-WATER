# STILL WATER v0.1.0 — Implementation Kernel

This checkpoint implements the non-UI behavioral substrate defined by:

- Practice Specification v1.0
- Application Architecture & Interaction Specification v0.1

## Included

- Frozen protocol constants
- TRAIN and DEPLOY legal state machines
- Deadline-based monotonic timing engine
- Cue scheduling helpers
- Criterion-based progression engine
- Respiratory progression safety block
- Generalization classification/gating
- Retrieval-latency statistics
- Session constructors and validators
- Export-bundle validation
- Automated protocol-integrity and adversarial edge-case tests
- Machine-readable/human-readable certification command

## Deliberately excluded

- UI screens
- IndexedDB adapter
- service worker / manifest
- audio assets
- GitHub Pages workflow

Those belong to the next implementation layer after this kernel is certified.

## Verification

```bash
npm test
npm run certify
# or
npm run verify
```

The kernel uses only Node built-ins and has no runtime dependencies.
