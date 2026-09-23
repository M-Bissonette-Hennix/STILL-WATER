# STILL WATER v0.2.0

Local-first Progressive Web Application implementing **STILL WATER Practice Protocol 1.0**.

STILL WATER is designed as a precision attentional training instrument: formal TRAIN sessions establish the target state; criterion-gated DEPLOY sessions train increasingly compact retrieval before real activity.

## Status

**Development checkpoint v0.2.0** — application shell and persistence layer complete.

Implemented in this checkpoint:

- frozen Practice Protocol 1.0 constants;
- deterministic TRAIN and DEPLOY state machines;
- deadline-based monotonic timing with carry-forward after brief backgrounding;
- stage-specific progression/gating logic;
- respiratory progression safety block;
- IndexedDB schema v1 with migrations and six object stores;
- active-session crash/interruption checkpoints;
- complete TRAIN UI through review/save;
- DEPLOY 60/30/15 UI with objective unlock gating;
- History, Progress, Settings, Protocol surfaces;
- import/export and privacy deletion with true evidence recomputation;
- local Web Audio transition tones;
- wake-lock progressive enhancement;
- installable offline PWA shell;
- GitHub Pages deployment workflow;
- dark mineral/water visual system and PWA icons;
- restrictive CSP and zero third-party runtime dependencies;
- automated certificate and adversarial test suite.

Deliberately not exposed yet:

- Immediate DEPLOY: Practice 1.0 defines the mature form but no objective unlock criterion.
- Automatic Maintenance unlock: Practice 1.0 defines no Robustification-completion gate.
- Robustification perturbation orchestration: the progression gate exists, but the dedicated perturbation/recovery UI remains the next module rather than being improvised inside ordinary DEPLOY.
- physiological sensors / HRV / camera / microphone inference;
- cloud sync, accounts, analytics, notifications, or AI interpretation.

## Verify

Requires Node.js 22+.

```bash
npm ci --ignore-scripts
npm run verify
```

`npm run verify` runs the full Node test suite, protocol/database certificate, and static application-shell integrity checks.

## Run locally

```bash
npm run serve
```

Then open:

```text
http://127.0.0.1:4173/
```

Core operation is fully local after the PWA shell has been cached.

## Publish

Push the repository to GitHub, enable **Settings → Pages → Source: GitHub Actions**, and push `main`. The included workflow verifies before publishing.

See:

- `docs/APPLICATION-CHECKPOINT-v0.2.0.md`
- `docs/BROWSER-VERIFICATION.md`
- `docs/GITHUB-PAGES.md`
- `CERTIFICATE.txt`
- `VERIFY.txt`
- `MANIFEST.sha256`
