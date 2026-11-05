# P7 · OBS portrait QA

```text
PROJECT: RE:BIRTH
PHASE: P7
DATE: 2026-11-05
REPOSITORY_URL: https://github.com/wtrg/rebirth-magic-live
ANTIGRAVITY_REPORT: NOT_RECEIVED
QODER_REPORT: NOT_RECEIVED
GEMINI_REPORT: NOT_RECEIVED
LEADER_STATUS: LEADER_REVIEW_PENDING
STATUS: Partial
BRANCH: qa/obs-combined-load
COMMIT_SHA: 72e8e629a11e888108017a868b8f4722a7e27a68
COMPLETED_TASKS: Windows install and smoke, SQLite backup and restore, server load, isolated 1080×1920 OBS recordings and Windows MOCK RC.
IN_PROGRESS_TASKS: Long-run and audio acceptance.
BLOCKED_TASKS: No real TikTok LIVE session available as confirmed by the project owner.
CODEX_QA_REPORT: Measured local OBS capture, server throughput, recovery and queue limits.
TEST_COMMANDS: npm run typecheck; npm run lint; npm test; npm run build; node scripts/smoke.mjs; node scripts/load.mjs; local OBS recording and ffprobe
TEST_RESULTS: PASS for listed local checks. Real TikTok LIVE and long combined soak NOT_RUN.
BUILD_STATUS: PASS
PERFORMANCE_RESULTS: See measurements below.
SECURITY_FINDINGS: Loopback server; verified wrong-origin and malformed request rejection, bounded queue and persistent duplicate receipts.
FILES_CHANGED: OBS setup, recovery, load harness, reports and local capture evidence.
KNOWN_ISSUES: Three-minute result does not establish long-run stability.
RISKS: Provider behavior, OBS audio and sustained render/encoding load remain unverified.
NEXT_TASKS: Verify OBS audio, long-run stability and authorized real LIVE.
QUESTIONS_FOR_CHATGPT_LEADER: Review the gap between MOCK RC and LIVE acceptance.
DECISIONS_REQUIRED: Approved LIVE test room, gift catalog and launch gates.
RECOMMENDATION: Use the MOCK RC for local testing while open gates remain.
```

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


## Combined OBS and server load

On 2026-11-05, tested commit `4da323a` with the new combat effects on Intel UHD Graphics and OBS 33.0.1. A separate portable OBS instance recorded at 1080×1920 and 30 FPS with the Quick Sync H.264 encoder. The Browser Source used default lightweight quality, rendering up to eight of 32 connected synthetic players. The server used a separate file-backed SQLite database. The workload mixed basic attacks, skill II, ultimates and periodic gift reactions.

The workload ran for 180 seconds. The server accepted 9,260 event requests including initial joins, rate-limited 3,040, and completed 95 ranked raids. The observed queue peak was 33. FFprobe measured a 179.900-second H.264 recording. OBS output 5,395 frames. All 17 in-run samples reported 30 FPS with zero OBS rendering or encoding skips. The final sample reported 0.45 ms average OBS render time. OBS memory increased from 334.1 to 363.4 MiB across in-run samples. Server working set ranged from 75.4 to 80.7 MiB over 17 samples. See [the recording frame](evidence/obs-combined-raid.png).

These metrics cover OBS output, including any duplicated browser frames. Audio was disabled in this run. No network stream or actual TikTok session was active. The short sample leaves long-run memory, OBS audio routing and TikTok upstream readiness unverified. The project owner confirmed that a real test LIVE session is currently unavailable.


## Graceful shutdown regression

The local shutdown request stops new ingress, drains accepted events and closes SQLite after HTTP connections complete. Windows integration QA submitted 64 joins immediately before shutdown and recovered all 64 profiles and receipts. SQLite quick_check returned ok. An incorrect Origin was rejected before shutdown. Emergency pause continues to clear its pending queue by design.


## HTTP text and size regression

Windows integration tests split a multibyte Vietnamese character across HTTP chunks and verified the stored name after controlled shutdown. Oversized Content-Length and chunked requests returned 413. Invalid UTF-8 returned 400. Typecheck, lint, the 16-test suite and build passed.


## Ten-minute server soak

On 2026-11-05, ran source commit `14b66c0` for 600 seconds with 64 synthetic players, eight WebSocket consumers and a fresh file-backed SQLite database. The server accepted 148,406 events, rate-limited 2,890, and reached stage 511. All eight consumers stayed connected, each receiving at least 9,916 updates including warm-up. The overload burst rejected 128 requests. Sampled queue depth peaked at 112 against the configured ceiling of 128.

Local HTTP latency was 20.1 ms p50, 45.6 ms p95, 56.1 ms p99 and 122.3 ms maximum. Across 120 five-second samples, RSS ranged from 78.2 to 129.6 MiB and JS heap from 8.8 to 32.0 MiB. The final heap sample was 13.6 MiB, with RSS 129.6 MiB. Both RSS drops and later expansion occurred during the run. The test does not isolate native-memory allocation or establish leak-free operation. Browser rendering, OBS audio and upstream LIVE were outside this server run. [Full measurements](evidence/server-soak-600.json)


## OBS audio path

Recorded a 17.5-second H.264/AAC file using isolated portable OBS 33.0.1 with exactly one Browser Source and no other audio inputs. The source used audio=1 and Control audio via OBS. The overlay initialized Web Audio successfully at load. Three synthetic players then generated raid cues.

FFprobe confirmed AAC stereo at 48 kHz. After decoding to mono PCM for measurement, the pre-raid interval had zero samples above silence, while combat measured -46.19 dBFS RMS and -22.58 dBFS peak. This establishes captured synthesized game audio in the local OBS file. No upstream LIVE or long audio soak was performed. [Measurement data](evidence/obs-audio-levels.json)
