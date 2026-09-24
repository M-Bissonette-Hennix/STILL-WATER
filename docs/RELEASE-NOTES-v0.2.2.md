# STILL WATER v0.2.2 — iOS Transition Audio Architecture Hotfix

## Why this release exists

v0.2.1 made Web Audio louder and more defensive, but field testing on iPhone/PWA showed a stronger failure mode: TEST AUDIO could be audible before TRAIN, automatic transition tones were silent during TRAIN, and subsequent TEST AUDIO could also become silent even though the browser reported successful playback.

This is consistent with known WebKit/iOS failure modes in which Web Audio reports a healthy/running state while no sound reaches the device. v0.2.2 therefore removes Web Audio from the critical transition path rather than attempting another AudioContext-resume workaround.

## New audio architecture

### Explicit cues

TEST AUDIO, session start, DEPLOY, and end cues use a fresh local HTMLMediaElement playing `assets/audio/cue.mp3`.

### Automatic TRAIN transitions

When the practitioner taps **CONTINUE** after the Kuji close screen, the app starts one continuously playing local media file:

`assets/audio/train-timeline.mp3`

The file contains long silence with embedded transition tones at the canonical Practice 1.0 boundaries:

- 00:00 — REGULATE
- 02:00 — STABILIZE
- 07:00 — RELEASE COUNT
- 07:30 — RELEASE ANCHOR
- 08:00 — OPEN
- 11:00 — ENCODE (or immediate TRANSFER when Encode is skipped)
- 11:20 — TRANSFER

Because the media element is started by an explicit user tap and remains playing throughout the timed portion, later timer callbacks do not have to initiate new audio playback.

### Built-in verification

Settings now contains **TEST TIMED TRANSITION**. It starts a local media track from the user's tap, remains silent for approximately three seconds, and then emits a tone without another user action. This directly tests the playback pattern used for automatic TRAIN transitions.

### Interrupted session recovery

When a substantive interruption causes a timed phase to restart, **RESUME PHASE** is itself a user gesture. The app seeks the continuous timeline to the canonical beginning of that phase and restarts it from that tap.

## Offline/PWA behavior

Both audio files are precached by the v0.2.2 service worker. The cache namespace advances to:

`still-water-shell-v0.2.2`

The app shell also preloads both audio assets.

## Kuji

The v0.2.1 nine-seal illustration solution is retained unchanged.

## Protocol integrity

Practice Protocol remains **1.0**.

No change to:

- breathing timing;
- TRAIN phase durations;
- Kuji sequence;
- state transitions;
- progression gates;
- DEPLOY windows;
- Target State definition.

## Verification

- 60 / 60 automated tests PASS
- protocol/database certificate PASS
- service-worker audio precache PASS
- static runtime dependency audit PASS
- actual MP3 signal inspection confirms audible energy at all seven intended cue boundaries and near-digital silence between them
