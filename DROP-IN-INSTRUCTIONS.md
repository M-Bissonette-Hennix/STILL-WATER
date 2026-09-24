# STILL WATER v0.2.2 — Drop-In Installation

This hotfix replaces the v0.2.1 Web Audio transition system with an iOS-oriented HTML media architecture.

## Important

This drop-in contains **no icon files** and **no Kuji illustration files**. Your existing brutalist icons and the working nine-seal illustration set remain untouched.

## Upload

Upload the **contents of this directory** into the root of the existing `STILL-WATER` repository, preserving every relative path. Allow files with matching names to replace the current versions.

Changed/new paths:

- `index.html`
- `sw.js`
- `package.json`
- `package-lock.json`
- `README.md`
- `src/app.js`
- `src/audio/audio-engine.js`
- `src/ui/render.js`
- `src/styles/session.css`
- `src/core/protocol.js`
- `scripts/validate-assets.js`
- `tests/audio-engine.test.js`
- `tests/static-shell.test.js`
- `assets/audio/cue.mp3`
- `assets/audio/train-timeline.mp3`
- `assets/audio/transition-test.mp3`
- `docs/RELEASE-NOTES-v0.2.2.md`

The verification/certificate files may also be uploaded for repository provenance.

## After GitHub Actions deploys successfully

1. Open the live GitHub Pages URL in Safari while online.
2. Refresh once and confirm the Settings build reports **Application 0.2.2 / Practice Protocol 1.0**.
3. In Settings, press **TEST AUDIO**. A cue should sound immediately.
4. Press **TEST TIMED TRANSITION**. It should remain silent for about 3 seconds and then sound **without another tap**.
5. If both work, enter TRAIN and click through the Kuji screens for a technical smoke test. At the final Kuji close screen, press **CONTINUE**. A REGULATE-entry tone should sound almost immediately; the same continuously playing media track will then carry the later automatic boundary cues.
6. Fully close and reopen the Home Screen PWA after the web build has refreshed so the v0.2.2 service worker/cache is active.

If Settings still shows v0.2.1, the old PWA shell is still cached. Reopen the live site in Safari and refresh again before testing audio.

## What changed technically

Automatic TRAIN cues no longer use `AudioContext`/Web Audio. The explicit CONTINUE tap into REGULATE starts `assets/audio/train-timeline.mp3`, which remains playing through the entire timed TRAIN segment. Its tones are embedded at the Practice 1.0 boundaries:

- 0:00 REGULATE
- 2:00 STABILIZE
- 7:00 RELEASE COUNT
- 7:30 RELEASE ANCHOR
- 8:00 OPEN
- 11:00 ENCODE / skipped-Encode TRANSFER boundary
- 11:20 TRANSFER

Practice Protocol remains **1.0**.
