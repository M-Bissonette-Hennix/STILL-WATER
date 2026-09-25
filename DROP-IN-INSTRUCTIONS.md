# STILL WATER v0.3.0 — Drop-In Update

This package upgrades a working v0.2.2 repository to v0.3.0 without replacing the existing app icons, Kuji illustrations, or audio media assets.

## Install

1. Extract this ZIP.
2. Upload the **contents** of the extracted folder into the root of the existing `STILL-WATER` GitHub repository.
3. Preserve all relative paths.
4. Allow matching files to replace their existing versions.
5. Commit to `main`.
6. Let the existing GitHub Pages Actions workflow run to green.
7. Open the live Pages URL once in Safari while online and refresh.
8. Reopen the Home Screen PWA. Settings → Build should show **Application 0.3.0 / Practice Protocol 1.0**.

## Expected preserved assets

The drop-in intentionally contains no files under:
- `assets/icons/`
- `assets/kuji/`
- `assets/audio/`

Those already-working files remain untouched.

## Verification

The release passed 72/72 automated tests and the Practice Protocol 1.0 certificate. See `VERIFY-v0.3.0.txt` and `CERTIFICATE-v0.3.0.txt`.
