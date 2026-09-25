# STILL WATER v0.3.0

A local-first Progressive Web Application implementing **STILL WATER Practice Protocol 1.0**.

v0.3.0 is the first post-use refinement release. It preserves the frozen practice mechanics while improving measurement validity, daily guidance, transfer/carryover telemetry, longitudinal analytics, Generalization guidance, safe Robustification support, local backup hygiene, cue-level control, and PWA update handling.

## Verify

```bash
npm ci --ignore-scripts
npm run verify
```

Expected baseline: all automated tests PASS and the Practice Protocol 1.0 certificate reports PASS.

## Deployment

The repository is GitHub Pages compatible. Keep the existing GitHub Actions Pages workflow and upload the drop-in files preserving their relative paths.

## Privacy

Core practice data remains local to IndexedDB. No accounts, analytics service, advertising SDK, or cloud backend are required.

See:
- `docs/AUDIT-v0.3.0.md`
- `docs/RELEASE-NOTES-v0.3.0.md`
- `CERTIFICATE-v0.3.0.txt`
- `VERIFY-v0.3.0.txt`
