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


## Independent RC3 review

A read-only Codex sub-agent reviewed server, persistence and adapter behavior. It reproduced an ordering bug: an accepted join followed immediately by admin start returned 409 until the queue tick ran. Class selection could similarly be applied after combat had already started. Admin start/practice now drains preceding accepted events before opening the raid. The HTTP regression submits class selection immediately before start and verifies the saved class. The 16-test suite and Windows browser smoke passed; the strengthened HTTP regression also passed after respecting the per-user rate limit.

The reviewer also identified a P1 roster limitation: historical profiles share the 64-player active array and are revived by every new raid. A 65th distinct viewer cannot join once that array is full, including after restart. The follow-up below resolves this by separating session membership from stored profiles.


## Session roster correction

An empty process-local roster now starts alongside the persistent profile database. Join restores saved progress by stable ID, leave frees a slot between fights, and the host can clear the roster. Global ranking reads all saved profiles. Replay v9 records saved profile and ranking context for deterministic offline reconstruction.

The HTTP regression seeds 64 saved viewers, admits a 65th after one leaves, clears the roster, and restores the first viewer with 77 XP, score 900, pet and equipment. A one-person raid then has 480 HP rather than scaling for the 65 archived profiles. Leave is blocked during combat. The test also checks global rank from a member while the leading viewer is absent. Independent Codex review found and verified the fix for joining with a tab and an argument, which otherwise could overwrite the archived profile. The 17-test suite passed. Windows browser smoke rejoined after restore and verified gear, pet, score and replay.

A 60-second load rerun with the new persistent leaderboard completed 15,168 accepted events, eight connected WebSockets and stage 30. The measured HTTP p95 was 40.9 ms and maximum 47.8 ms. The queue remained within 128. This is a server-only sample with 64 active profiles, not a benchmark of an unbounded archive.


## Ten-minute combined OBS, audio and raid soak

On 2026-11-05, measured source `7b225ea08edf1ee788a3fd6903c60895323b2472` on the same Windows Intel UHD machine using isolated portable OBS 33.0.1, Quick Sync H.264 and one Browser Source with audio routed through OBS. Output and Browser Source were 1080×1920 at 30 FPS. Default low quality rendered up to eight actors while 32 synthetic players simulated all six classes. All 32 had an equipped pet by the end; the workload selected all three pet types after earning them. The separate MOCK server used its own file-backed SQLite database. The owner's OBS instance was not modified.

The 600-second workload accepted 28,796 event requests and rate-limited 11,104. It completed 348 ranked raids; sampled queue depth peaked at 32. Commands mixed basic attacks, skill II, ultimates and periodic ranked cosmetic gift reactions. FFprobe measured 600.300 seconds of H.264 video at 30/1 and AAC stereo at 48 kHz. OBS logged 18,009 output frames. All 55 in-run OBS samples reported 30 FPS, with zero rendering and encoding skips; the final measured render time was 0.483 ms.

OBS-reported memory ranged from 348.3 to 353.1 MiB in the in-run samples. Backend working set ranged from 76.0 to 91.3 MiB over 116 five-second samples within the recording; sampling started approximately 19 seconds after recording began. These measurements do not cover the browser subprocess or GPU allocation and do not establish leak-free operation. Each decoded one-minute mono audio window had a nonzero signal, RMS between -38.37 and -36.97 dBFS, peaks between -22.30 and -19.95 dBFS, and zero clipped samples. This measures captured cues, without assessing subjective mix quality or ruling out brief dropouts.

[Measurements](evidence/obs-soak-600.json) · [Frame extracted at 300 seconds](evidence/obs-soak-600.png)

This is a ten-minute local recording, not an upstream stream, unique Chromium frame-cadence measurement or an 8–12-hour stability claim. The source snapshot predates the animation correction below. Actual TikTok LIVE remains untested: the owner reconfirmed that no test LIVE session is available.

## Repeated impacts and paused pet correction

Read-only Codex review reproduced a boss Hit clip that remained clamped after repeated same-kind impacts, and an expired temporary pet becoming visible again when paused. The extracted real Three.js clip controller now restarts Hit and Attack on a new effect serial. Its actual-GLB regression also found that idle had been configured for only one repetition; idle now loops continuously, while defeat remains a clamped one-shot.

Server snapshots expose the server pause timestamp as optional transport metadata. Pet visibility compares its expiry with that timestamp while paused. This handles an already-expired pet and a valid pet when a client opens during a long pause. The simulation state and replay versions remain unchanged. HTTP coverage checks both existing and newly connected clients receive the same pause boundary. The actual GLB mixer regression checks repeated impacts, zero-delta freeze, idle repetition and clamped defeat. Detailed visual review of all class/pet action sequences remains open.

Windows typecheck, lint, the 19-test suite and build passed. Browser smoke passed with Intel UHD D3D11, including GLB/fallback rendering, pause, replay and recovery. The independent Codex reviewer reran the three targeted animation/roster tests and found no blocking issues. This review is not a Gemini art report or Leader approval. Antigravity and Gemini reports remain NOT_RECEIVED; Leader review remains pending.


## Automatic battle capacity sample

On 2026-11-05, `QA_LOAD_AUTO=1` with `node scripts/load.mjs` exercised 64 opt-in automatic players and eight WebSocket consumers for 60 seconds. The host started each new raid, but no client attack commands were sent during measurement. The world reached stage 36 and every consumer stayed connected with at least 135 snapshots. A separate warm-up overload burst rejected 96 requests; sampled queue depth peaked at 112. The measured attack ingress count is zero by design, and HTTP attack latency is null.

Twelve five-second backend samples ranged from 73.7 to 79.4 MiB RSS and 13.0 to 14.3 MiB heap. This short server-only sample does not establish long-session, renderer or OBS behavior. It was measured in the auto-battle working tree based on main `780a174`, before commit. [Measurements](evidence/server-auto-60.json)
