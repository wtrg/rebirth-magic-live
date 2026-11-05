# P7 · OBS portrait QA

## RC5 clean public Windows installation — 2026-11-05

Cloned the public `release/rc5` branch into a new directory at `3d74b3270f277956180843ae72b1c470dd870b74`, package version `0.2.0-rc.5`, with no prior dependencies, build or database. On Windows / Node 24.17.0 / npm 11.13.0, `npm ci`, typecheck, lint, all 36 tests and build passed. `node scripts/inspect-models.ts` reproduced the committed manifest; `git diff --exit-code -- assets/manifest.json` passed. Installed/selected Playwright Chromium through the README QA path, then passed production smoke, the six-class/three-pet action harness, and the seven-size plus portrait layout harness on Intel UHD D3D11. Production dependency audit reported zero vulnerabilities; installation audit also reported zero. The final explicit Git clean-status assertion passed.

The first fresh-clone trial at `e738347` passed functional checks but exposed a Windows metadata problem: `core.autocrlf=true` and the inspector's LF output left Git reporting the manifest modified despite identical normalized blob hashes and no content diff. RC5 adds the narrow `.gitattributes` rule `assets/manifest.json text eol=lf`. The complete installation/quality/browser/action/layout pipeline above was rerun in a second new public clone at `3d74b32`; it checked out LF and remained clean. No asset content, runtime rule or dependency was changed by this correction.

An independent read-only Codex review found no release blocker in package/lock/README version consistency, evidence scope, or the line-ending rule. This is technical release QA, not Antigravity/Gemini delivery or Leader approval. WT connection revalidation still returned `fetch failed`; publication of this report does not establish Leader receipt. No credentials, existing game database or real viewer data were copied into the clone or published. Vite retains its advisory about a minified client chunk above 500 kB; build succeeds and rendering evidence keeps its measured-source scope.

RC5 includes the v11 auto-opportunity correction and post-RC4 desktop layout fixes. It preserves historical replay rules and existing schema-v2 saves. The database design remains a scratch prototype. The tag is published only after integration CI passes; later edits in this release task record QA/handoff metadata rather than changing the tested runtime. [Candidate scope and install](../RELEASE_CANDIDATE.md) · [Curated CLI evidence](evidence/rc5-install.json).

Actual TikTok LIVE, confirmed gift IDs/provider permission, full manual/co-op balance, subjective audio/art review and long-session browser/GPU memory stability remain unverified. Antigravity/Gemini reports remain NOT_RECEIVED; Leader review remains pending. P8 expansion is deferred.

## Current-source combined auto, HUD and audio — 2026-11-05

Tested source `46cf80db62fa6ec7d27e5e7fb994eb4823ccdfc1` on Windows / Node 24.17.0, Core i7-13620H and Intel UHD Graphics (OBS D3D11). This includes server auto and the post-RC4 layout/animation changes; it is not the RC4 release tag. Git was clean at harness startup. Production sources and built files stayed unchanged during recording; documentation and post-run analysis were added separately.

Isolated portable OBS 33.0.1 used Quick Sync H.264, one active 1080×1920/30 FPS Browser Source with `overlay=1&audio=1`, and AAC stereo 48 kHz. Previous disposable QA browser inputs were muted; no desktop/microphone inputs were allowed. The owner's installed OBS remained open and untouched. No upstream stream was started.

The 600.513-second workload used 32 synthetic players across six classes: server basic auto, manual skill II/ultimate requests, host ranked raid restarts and cosmetic `mock-30` reactions. There were **zero manual basic commands**. Low quality displayed up to eight actors while all 32 simulated. All 32 ended with an earned pet equipped, covering all three types. The host observed/restarted 322 victories and reached stage 323; the ending raid had no terminal result. Excluding setup, 34,079 requests were accepted, zero were HTTP-rate-limited and 2,913 state updates arrived. Maximum ten-second-sampled queue depth was 32. Acceptance does not imply a skill bypassed its game cooldown.

FFprobe measured 600.166 seconds of H.264 at 1080×1920, 30/1, with the AAC track. OBS logged 18,003 final output frames; its pre-stop snapshot reported 18,000. All 57 in-run samples reported approximately 30 FPS; render/encode skipped-frame deltas were zero. Final sampled render time was 0.501 ms. Container duration, workload time and pre-stop/final counters have different boundaries. OBS compositor/encoder counters do not measure unique Three.js presentation FPS.

In-run OBS-reported memory ranged 367.23–399.74 MiB, fell after warm-up and ended at 370.24 MiB in the post-workload snapshot. The pre-recording startup snapshot was 303.98 MiB. Across 120 timestamp-filtered backend samples, RSS was 74.63–90.73 MiB and heap 13.50–20.80 MiB; final backend RSS/heap was 90.73/20.27 MiB. These measurements neither isolate leaks nor measure browser-subprocess/GPU allocation. Long-session stability remains unverified.

Each of ten decoded one-minute mono PCM windows had nonzero signal: RMS −38.83 to −37.48 dBFS, peaks −22.52 to −20.44 dBFS, zero clipped mono samples. This does not assess subjective mix quality, rule out brief dropouts or establish absence of all stereo/encoding artifacts.

After graceful shutdown, SQLite `quick_check` returned `ok`; 32 profiles, auto preferences and equipped pets persisted, with saved stage 323. Profile wins varied 110–322 and scores 623,866–5,346,078. A separate production-only reproduction confirmed **auto roster-order bias**, now a READY bug task in [the finding](AUTO_ORDER_FINDING.md). Manual FIFO skill waves may also affect this run's distribution; do not attribute the whole gap solely to auto. The recording proves combined operation, not fair contribution/pacing or full gameplay acceptance.

Cleanup closed the backend port, removed the new QA source/scene and restored the previous disposable scene. After inspection confirmed recording inactive, root stopped only the path-verified QA portable OBS process; the owner's installed OBS remained running and was not controlled. A 30-second preflight succeeded, and an absent-OBS fault check exited nonzero without leaving its backend listening. Independent Codex review verified the handshake/counter fixes and found no analysis calculation blocker. Typecheck, lint, all 31 tests and build passed; hardware OBS recording is outside CI.

Reproduce with [isolated OBS QA](../OBS_QA.md), `node scripts/obs-soak.mjs`, then `node scripts/analyze-obs.mjs PATH_TO_RESULTS`. [Raw/derived measurements](evidence/obs-auto-current-600.json) · [Encoded frame at 300 seconds](evidence/obs-auto-current-300.png) · [Post-run scene](evidence/obs-auto-current-end.png).

The measured-source ten-minute local combined proof gap is closed. This run identified the auto-order defect; the subsequent [v11 correction](AUTO_ORDER_FINDING.md#correction-and-evidence) has its own functional/integration evidence below. Actual TikTok LIVE remains untested because no test session is available; Gemini/Antigravity reports remain NOT_RECEIVED, and Leader art/gameplay approval and 8–12-hour stability remain pending.

### v11 ordering integration follow-up

At source `3fa4190`, typecheck, lint, all 36 tests, build and production Windows browser smoke passed on Intel UHD D3D11. The five added regressions include complete v10 historical-state digest, 32-stage forward/reverse opportunity cycles, eligibility/cooldowns, once-only rewards and deterministic v11 replay. Root reviewed the delegated production change; the implementer independently regenerated the root-owned golden fixture through immutable `054e544` source and verified its SHA, plus the eight career-cohort ranges.

`QA_LOAD_AUTO=1` with `node scripts/load.mjs` then exercised 64 auto players and eight WebSocket consumers for 60 seconds. No manual attack ingress was sent in measurement. Every consumer remained connected with at least 134 snapshots and the world reached stage 36. Warm-up overload rejected 128 requests; sampled queue depth peaked at 112. Twelve five-second backend samples ranged 72.7–80.2 MiB RSS and 12.8–16.7 MiB heap, ending at 75.3/13.6 MiB. [v11 server sample](evidence/server-auto-v11-60.json) · [Eight synthetic career comparisons](evidence/auto-fairness-comparison.json).

This is a short server integration measurement, not another combined OBS run or long-session memory proof. The preceding ten-minute OBS recording keeps its exact pre-v11 source scope. Neither workload establishes full manual/co-op class balance or actual TikTok LIVE operation.

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

## RC4 clean public installation

On 2026-11-05, cloned the public `release/rc4` branch into a new directory and tested commit `80fe1b9d711a21bfe112d00bb949f33ac24a9e1f`, package version `0.2.0-rc.4`. The directory had no previous node_modules, dist or game database. `npm ci`, typecheck, lint, all 26 tests and build passed. Installing the Playwright Chromium runtime and selecting `QA_BROWSER=chromium` exercised the README QA path. Both production browser smoke and the six-class/three-pet rendering harness passed on Intel UHD D3D11. Production dependency audit reported zero vulnerabilities. Git status stayed clean after these checks.

The install used Windows and Node 24. The browser smoke covered manual combat, auto checkbox rejection recovery/on/off, GLB and fallback, pause, replay, SQLite backup/restore and reconnect. The separate rendering harness covered both model paths and their action poses. No real viewer names, credentials or databases were copied into the clone or published. A read-only Codex reviewer found no scoped release blocker and noted the still-open master section 7.2 database-design deliverable. Leader approval and actual LIVE remain unverified. See [RC4 scope](../RELEASE_CANDIDATE.md).

## Native browser render submissions and resource counts

On 2026-11-05, ran `node scripts/render-benchmark.mjs` at source `146bb6086f7a533ded93d1343c0e73962f268cf7` using Chrome on Intel UHD D3D11. Each mode used native browser time for approximately 60 seconds, a 1080×1500 scene viewport and a 712×990 low-quality drawing buffer. The fixture imported the production arena and supplied 64 synthetic snapshot entries; eight actors and pets were rendered. It replaced roster IDs 31 times per mode and drove attacks, boss/ultimate feedback and wraith/phase poses. No authoritative combat server, production HUD or OBS ran in this fixture.

| Mode | Measured seconds | Render submissions | Submissions/s | Interval p50 / p95 / p99 / max (ms) |
| --- | --- | --- | --- | --- |
| GLB | 60.454 | 1,813 | 29.990 | 33.3 / 34.2 / 35.0 / 49.0 |
| Procedural fallback | 60.573 | 1,815 | 29.964 | 33.3 / 34.1 / 34.7 / 101.1 |

Across all in-run resource samples, GLB retained 15 renderer geometry allocations, one texture and two shader programs; fallback retained 13, one and two respectively. Those counts stayed constant through roster churn. Draw calls varied with effects (the endpoint samples were 280–281 calls and 6,152–6,200 triangles). Counts do not measure driver/GPU allocation bytes.

Eleven normal heap samples per mode ranged from 11.25–17.38 MiB for GLB and 12.01–16.42 MiB for fallback. Separate forced-GC endpoints increased by 400.97 KiB and 449.66 KiB respectively. Those endpoints include fixture/measurement arrays and caches; they do not isolate a leak or prove leak-free operation. No forced GC or screenshot ran inside either measured interval. One initial trial was discarded after a fixture edit caused Vite to reload; only the frozen-source rerun is reported here.

These are completed Three.js CPU render submissions, not GPU completion or presentation FPS. They support the approximate 30-submission/s low-quality target in this isolated scene. They do not establish end-to-end combined OBS performance, long-session memory stability or LIVE readiness. [Raw measurements](evidence/render-benchmark/results.json) · [GLB frame](evidence/render-benchmark/glb.png) · [Fallback frame](evidence/render-benchmark/procedural.png)

## WebGL-unavailable operation

Production browser smoke intercepted WebGL/webgl2/experimental-webgl context requests and returned null before arena creation. The page displayed the unavailable notice, created no canvas, continued receiving the party and controlled real server pause/resume. The same run passed the existing GLB/procedural, combat, replay, backup/recovery and reconnect checks on Intel UHD. [Fallback HUD capture](evidence/webgl-unavailable.png)

Typecheck, lint, all 28 tests, build, production smoke and the manual-clock action harness passed. Independent read-only Codex review found no blocker in measurement scope, bounded sampling, cleanup or unavailable-WebGL assertions. This is technical QA rather than a Gemini art report or Leader approval.
