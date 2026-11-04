# P7 · OBS portrait QA

Date 2026-11-05. Status partial. Repository [RE:BIRTH](https://github.com/wtrg/rebirth-magic-live), branch `qa/obs-portrait`. Codex QA ran the OBS gate. External agent reports and Leader approval NOT_RECEIVED.

## Verified

Windows, Intel Core i7-13620H, Intel UHD Graphics (D3D11), OBS Studio 33.0.1, obs-browser 2.27.5, CEF 150. Portable OBS was launched separately from the user's running instance. Its only scene source was the local RE:BIRTH Browser Source. The backend was a separate in-memory MOCK server. No streaming endpoint was configured.

Both canvas and output were 1080×1920 at 30 FPS. The Browser Source was 1080×1920 with custom 30 FPS, default lightweight game quality, and eight synthetic players. The second recording used x264 veryfast as confirmed in the OBS log. FFprobe identified a 16.833-second H.264 video with a 1080×1920 frame size and a 30/1 rate. The recorded fight shows the 3D scene, boss HP decreasing, damage feedback, party and logs.

## Measured observations

- Initial run performed a PNG screenshot RPC during recording. OBS reported 17.9% rendering lag and 97.1% encoding lag on shutdown. The initial downscaled image also showed undersized HUD text.
- The second run took screenshots after stopping and used the width-scaled HUD. OBS reported 30 FPS and 2.33 ms average frame render time at the end of the sample. Its render skip counter stayed at 390 over 506 render frames in the measured interval. The output skip counter at the final sample was 0 of 502 and the final OBS log recorded 505 output frames. This sample does not measure the unique frame cadence inside Chromium.
- The two runs differ in screenshot timing and HUD CSS. These results do not isolate a performance cause. This is a short local recording, with no sustained soak, bitrate stability or TikTok upstream test.

## Handoff

[Full resolution frame from the OBS recording](evidence/obs-portrait-raid.png) · [Operator setup](../OBS_SETUP.md)

See [SQLite recovery procedure](../RECOVERY.md) for the later online backup and restore test. Pending gates include a sustained memory soak, a controlled long recording, verified gift IDs and a real TikTok LIVE session.


## Server load QA

Ran `node scripts/load.mjs` twice on Windows with Node 24 and a fresh file-backed SQLite database per run. The final 60-second measurement used 64 synthetic players and eight WebSocket consumers. It accepted 14,795 attack events and rate-limited 373. A separate warm-up burst of 256 distinct viewers returned 112 HTTP 429 responses, reached the queue cap of 128, and drained. Each WebSocket consumer received at least 1,015 snapshots during the run including warm-up. All eight connections stayed open and the world reached stage 30.

Local event request latency was 39.3 ms p50, 64.5 ms p95, 81.2 ms p99 and 103.3 ms max during the measured interval. Server RSS samples rose from 82.0 to 92.4 MiB. Sampled JS heap varied from 14.8 to 21.3 MiB. The run measures the server and its SQLite writes. Browser/OBS load and long-run memory behavior require separate measurements. See [QA Plan](../QA_PLAN.md) to reproduce.
