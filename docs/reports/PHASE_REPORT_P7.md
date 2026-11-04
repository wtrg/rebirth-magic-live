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

See [SQLite recovery procedure](../RECOVERY.md) for the later online backup and restore test. Pending gates include sustained load, memory, a controlled long recording, verified gift IDs and a real TikTok LIVE session.
