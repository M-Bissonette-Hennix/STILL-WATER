# STILL WATER v0.3.0 — Post-Use Weakness Audit

## Severity A — data validity / protocol fidelity

- **Implicit zero ratings:** fixed by nullable review state and explicit completion gate.
- **Transfer action not actually demonstrated:** fixed by changing the bridge to first-action completion and recording carryover afterward.
- **Carryover omitted from telemetry:** fixed with an optional backward-compatible 0–3 field.
- **Robustification architecture incomplete:** fixed with a gated benign-perturbation workflow and recovery-latency telemetry.

## Severity B — training intelligence

- **Home lacked a protocol-derived next action:** fixed with Today directive.
- **Progress showed gates but weak longitudinal interpretation:** fixed with recent state/retrieval summaries and latency comparison.
- **Generalization did not identify evidence gaps:** fixed with least-covered unmet class guidance.

## Severity C — operational reliability

- **PWA service-worker updates could silently leave old page code loaded:** fixed with update detection and explicit reload affordance.
- **Local-only history could grow without backups:** fixed with export timestamp and conservative backup recommendation.
- **Cue-level setting existed in storage but not UI:** fixed with slider.

## Deliberately not changed

- Practice Protocol 1.0.
- 4 s inhale / 6 s exhale pacing.
- TRAIN phase durations.
- Kuji order/posture/seals.
- Target State threshold.
- Foundation/Association/Compression/Generalization gates.
- Absence of a Maintenance completion gate.
- Immediate DEPLOY remains without an invented unlock rule.
- No social, cloud, AI-coach, streak, achievement, or competition mechanics were added.
