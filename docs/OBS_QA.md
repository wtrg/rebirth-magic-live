# Isolated combined OBS QA

This Windows QA harness records local MOCK play. It never starts a stream. Use a separate, disposable OBS portable installation in `test-results/obs-portable`; the installed OBS and its scenes/accounts are outside this harness's scope. Do not point the QA WebSocket configuration at an existing operator session.

## Prerequisites

1. Run the repository checks and `npm run build`. The harness serves the existing `dist`, with no Vite development server or live reload.
2. Obtain free OBS Studio from its official distribution and prepare a separate portable installation. See [OBS portable mode](https://obsproject.com/kb/portable-mode). The measured local installation uses OBS 33.0.1 on Intel UHD with Quick Sync H.264.
3. In that installation's `RebirthQA` profile, set base/output 1080×1920, 30 FPS, local MKV recording under `test-results/obs-portable/recordings`, AAC track 1 and an encoder supported by the target machine. Disable desktop/microphone audio inputs. Keep the scene collection empty or limited to earlier `Rebirth Browser QA ` browser inputs.
4. Enable the isolated installation's OBS WebSocket server with authentication, a random password of at least 16 characters and a free local port. Keep its generated `config/obs-studio/plugin_config/obs-websocket/config.json` private. The harness reads that file locally and never prints the password. All of `test-results` is ignored by Git.
5. Launch this separate executable with `--portable --multi --disable-updater --profile RebirthQA`. Verify the executable path and that the WebSocket listening PID belongs to that exact portable process. Keep it idle, with no recording or stream active. The owner may keep their installed OBS open separately.

## Run and inspect

From the repository root:

```powershell
$env:QA_OBS_SECONDS='600'
$env:QA_OBS_PORT='4193'
node scripts/obs-soak.mjs
```

The backend port must be free. Duration defaults to 600 seconds and is bounded to 30–43200 seconds. The harness creates a fresh synthetic SQLite database and its own loopback MOCK server. It adds a temporary OBS scene/Browser Source with `overlay=1&audio=1`, routes source audio to track 1, and restores the previous QA scene/removes the new source on exit. It mutes previous QA browser inputs; their mute state is not restored because this is a disposable installation. Unexpected inputs, active recording/streaming, wrong video dimensions or missing authentication cause refusal. The harness requests graceful backend shutdown; it can terminate only its own spawned backend if shutdown times out. It leaves the portable OBS process open for inspection.

Set `QA_OBS_P9_PREVIEW=1` to request both P9 preview assets when testing a build that includes them. The harness waits for an active recording with output bytes and at least five seconds of OBS recording time before starting the measured workload. The encoded duration check still applies.

Workload: 32 synthetic players, all six classes, opt-in server basic auto, manual skill II/ultimate requests, host-controlled ranked raid restarts and three earned pet selections. There are no manual basic attacks. `mock-30` gifts are cosmetic in ranked raids; this run does not measure gift-assisted practice balance. The Browser Source uses the production low-quality renderer, whose cap displays eight actors while all 32 simulate on the server.

Each timestamped `test-results/obs-current-*` directory contains `results.json`, a post-run scene capture and the synthetic database. `results.json` records Git source identity/dirty state at startup, OBS before/after counters and ten-second samples, video settings, recording path, timestamp-filtered backend memory, class/pet coverage and workload counts. Keep runtime sources and the built `dist` unchanged throughout measurement.

With free FFmpeg/FFprobe available on PATH, analyze a completed run:

```powershell
node scripts/analyze-obs.mjs test-results/obs-current-TIMESTAMP/results.json
```

Replace `TIMESTAMP` with the actual run directory printed by the harness. The analyzer only accepts results beneath this repository's `test-results` and recordings within the isolated portable recording directory. It checks encoded dimensions/rate/duration and the AAC track, decodes mono PCM16 at 48 kHz, measures RMS/peak/clipping in one-minute windows (including a final partial window), and writes `analysis.json` without storing the decoded PCM. Zero clipped decoded mono samples do not rule out all stereo/encoding artifacts. Inspect the frames and listen to the recording separately. Publish only selected synthetic/redacted evidence, never the OBS configuration or database.

Counter scope matters:

- `measuredIngress` excludes setup; `lifetimeIngress` includes it. These count HTTP acceptance, not successful skill effects.
- `victoriesRestarted` counts completed victories observed and restarted by the host; `terminalResultAtEnd` identifies an additional ending result if present. It is not a count of every unseen intermediate state.
- `sampledPeakQueue` is the maximum ten-second health sample, not the true instantaneous maximum.
- Backend memory is timestamp-filtered to the measured workload. It excludes browser subprocess and GPU allocation.
- OBS stats describe its compositor/encoder. A 30 FPS recording or OBS counter does not prove 30 unique Three.js presentations/s. Use the [separate native-clock scene benchmark](reports/PHASE_REPORT_P7.md#native-browser-render-submissions-and-resource-counts) for its specifically defined CPU submissions.

Review encoded dimensions/duration, render/encode skips, captured HUD/3D, audio signal/clipping and server progression before accepting a run. A ten-minute sample does not prove 8–12-hour stability, absence of leaks, subjective audio quality or actual upstream TikTok LIVE.
