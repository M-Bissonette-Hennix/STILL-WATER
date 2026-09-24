# STILL WATER v0.2.1 — Drop-In Hotfix

This patch fixes the two first-session defects reported against v0.2.0:

1. transition tones were effectively inaudible/unreliable on iPhone/PWA;
2. the nine Kuji screens lacked their corresponding hand-seal illustrations.

## Protocol status

Practice Protocol remains **1.0**. This patch does **not** change phase timing, respiration timing, progression logic, TRAIN state order, DEPLOY logic, or stored-history schema.

## Install into the existing GitHub repository

Upload the **contents of this folder** into the repository root while preserving the included paths. Allow files with matching names to replace the existing versions. Do not delete unrelated repository files.

New directory/files:

- `assets/kuji/01-rin.jpg`
- `assets/kuji/02-pyo.jpg`
- `assets/kuji/03-to.jpg`
- `assets/kuji/04-sha.jpg`
- `assets/kuji/05-kai.jpg`
- `assets/kuji/06-jin.jpg`
- `assets/kuji/07-retsu.jpg`
- `assets/kuji/08-zai.jpg`
- `assets/kuji/09-zen.jpg`
- `tests/audio-engine.test.js`
- `docs/RELEASE-NOTES-v0.2.1.md`

Replacement files:

- `sw.js`
- `package.json`
- `package-lock.json`
- `src/audio/audio-engine.js`
- `src/app.js`
- `src/app/protocol-ui.js`
- `src/core/protocol.js`
- `src/ui/render.js`
- `src/styles/session.css`
- `scripts/validate-assets.js`
- `tests/static-shell.test.js`

The patch deliberately contains **no app icon files**, so the current brutalist black/white/red icon set in the live repository will remain untouched.

## After committing

Your existing GitHub Pages workflow should run automatically. Confirm the workflow is green before using the updated live app.

Because STILL WATER is an offline PWA, an already-installed iPhone instance may temporarily hold the old service-worker cache. The service-worker cache name has been bumped to `still-water-shell-v0.2.1` specifically to force a refresh. After deployment:

1. fully close the Home Screen STILL WATER app;
2. while online, open the live GitHub Pages URL once in Safari and allow it to load completely;
3. refresh once;
4. close Safari;
5. reopen the Home Screen app.

## Smoke test

Before the next full TRAIN:

1. Open **Settings**.
2. Confirm **Transition tones** is ON.
3. Tap **TEST AUDIO**. A clearly audible restrained two-oscillator tone should play.
4. Begin TRAIN and enter the Kuji sequence.
5. Confirm each of the nine screens shows its correct corresponding illustration.
6. Continue at least through REGULATE → STABILIZE and confirm a transition tone is audible.

If TEST AUDIO is silent after the updated app is definitely loaded, verify iPhone media volume and retry while the app is foregrounded. That result would distinguish a device/audio-session issue from the original low-gain implementation defect.

## Verification

Automated suite: **55/55 PASS**.

Protocol certificate: **PASS**.
