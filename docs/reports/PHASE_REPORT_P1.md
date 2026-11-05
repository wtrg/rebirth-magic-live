# Phase report P1

## Measured prototype asset specification — 2026-11-05

The [asset manifest](../../assets/manifest.json) now measures the actual 50,364-byte GLB: ten actor/pet roots, five weapon clips, 148 mesh occurrences and 2,434 triangles across the templates, with no embedded images/textures or skinned meshes. The [art specification](../ART_SPECIFICATION.md) records bounds, proportions, material accents, rigid articulation, arena geometry, lighting, camera and VFX requirements. `node scripts/inspect-models.ts` reproduced identical output on consecutive runs. This is Codex-authored prototype documentation, not a Gemini report or approval. Existing runtime art and animation are unchanged. Final task integration and QA evidence are indexed in [the ledger](../TASK_LEDGER.md).

PROJECT: RE:BIRTH
PHASE: P1 3D visual prototype
STATUS: Prototype rendered and browser smoke passed. Production art and Leader review pending.

DATE: 2026-11-05
REPOSITORY_URL: https://github.com/wtrg/rebirth-magic-live
BRANCH: feat/raid-vertical-slice
COMMIT_SHA: ddfc8e5456c80b66002091e7f0c58332d29cab8c (tested source snapshot)

ANTIGRAVITY_REPORT: NOT_RECEIVED. WT status, task retrieval and dispatch returned fetch failed.
QODER_REPORT: Qwen3.8-Flash returned a read-only damage/phase proposal. Compared the threshold and overkill cases. Retained inclusive 55% and 25% thresholds and the existing floor formula. No source changes from Qoder.
GEMINI_REPORT: NOT_RECEIVED. No verified dispatch surface. Asset handoff recorded in ART_BIBLE.md and AGENT_PROTOCOL.md.
CODEX_QA_REPORT: Implemented the procedural fallback and ran local QA on Windows, Node 24.17.0, Chrome, and Intel UHD Graphics (ANGLE D3D11).

TEST_COMMANDS: npm run typecheck; npm run lint; npm test; npm run build; node scripts/smoke.mjs; npm audit.
TEST_RESULTS: Typecheck and lint pass. 4/4 unit tests pass. Browser smoke passes boss victory, portrait aspect, pause/resume, gift deduplication, wrong-origin rejection, malformed input rejection, SQLite persistence and reconnect.
BUILD_STATUS: PASS. Vite reports a 545.43 kB client chunk (137.93 kB gzip).
PERFORMANCE_RESULTS: WebGL 2 rendered on Intel UHD Graphics. FPS benchmark, memory soak and OBS encode benchmark NOT_RUN.
SECURITY_FINDINGS: npm install audit reported zero after minimatch 11.0.4 override. Staged secret-pattern scan found no matches. Loopback transport and request validation checked. Local users can operate the console.

QUESTIONS_FOR_CHATGPT_LEADER: See LEADER_REVIEW_REQUEST.md.
DECISIONS_REQUIRED: Approve production art, gift tier semantics, ranked progression isolation, and LIVE source policy.
LEADER_STATUS: LEADER_REVIEW_PENDING. No verified direct delivery route.

COMPLETED_TASKS: 3D procedural arena, boss, mage and three companion variations. Camera, lighting, attack motion, collapse, recoil and portrait HUD. A simulated viewer completed a raid in browser QA.
IN_PROGRESS_TASKS: GLB pipeline and final art handoff.
BLOCKED_TASKS: Gemini production assets and Antigravity bridge dispatch.

FILES_CHANGED: apps/game, index.html, ART_BIBLE.md, scripts/smoke.mjs and evidence.
KNOWN_ISSUES: Shared player silhouette, limited motion, production rigs and audio pending. OBS integration was verified as a browser URL at 540×960. OBS application capture NOT_RUN.
RISKS: Validate legibility and frame timing with OBS running at 1080×1920.
NEXT_TASKS: Review rigged GLB targets, test OBS Browser Source, benchmark and verify LIVE separately.
RECOMMENDATION: Use the original procedural 3D assets for the local demonstration.

## Render evidence

- [Raid in progress](evidence/portrait-raid.png)
- [Boss victory](evidence/portrait-victory.png)
