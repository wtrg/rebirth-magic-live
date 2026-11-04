# P4 · Pet collection and upgrades

```text
PROJECT: RE:BIRTH
PHASE: P4
DATE: 2026-11-05
REPOSITORY_URL: https://github.com/wtrg/rebirth-magic-live
ANTIGRAVITY_REPORT: NOT_RECEIVED
QODER_REPORT: NOT_RECEIVED
GEMINI_REPORT: NOT_RECEIVED
LEADER_STATUS: LEADER_REVIEW_PENDING
STATUS: Verified in MOCK
BRANCH: feat/pet-upgrades
COMMIT_SHA: 89104030f85eb2dec8cddd96f6c9879642b8ce0b
COMPLETED_TASKS: Three pet meshes, unlocks, upgrades, active selection and individual combat skills.
IN_PROGRESS_TASKS: Production art and visual animation review.
BLOCKED_TASKS: External art and integration reports unavailable.
CODEX_QA_REPORT: Validated skill effects, upgrade costs, SQLite state and one visible pet capture.
TEST_COMMANDS: npm run typecheck; npm run lint; npm test; npm run build; node scripts/smoke.mjs
TEST_RESULTS: PASS on Windows. Visual review of all three pets in motion NOT_RUN.
BUILD_STATUS: PASS
PERFORMANCE_RESULTS: See P7. Pet-specific GPU profiling NOT_RUN.
SECURITY_FINDINGS: Upgrade currency is earned in ranked play. Gift input cannot purchase pets.
FILES_CHANGED: apps/game, packages/combat, packages/shared, replay, tests and portrait evidence.
KNOWN_ISSUES: Prototype procedural models.
RISKS: Small silhouettes may need refinement in portrait mode.
NEXT_TASKS: Review the pet poses and attack animations.
QUESTIONS_FOR_CHATGPT_LEADER: Approve upgrade costs and skill effects?
DECISIONS_REQUIRED: Production asset direction.
RECOMMENDATION: Use the verified free pet progression in the MOCK build.
```

Date 2026-11-05. Status verified in MOCK. Leader review pending.

Three pets are unlocked from ranked raid shards. Extra shards upgrade owned companions to level 5. Each pet has an individual skill triggered by skill II. Upgrades and summon state persist in player profiles, and the browser supports selection, levels, and shard balance. Procedural meshes have distinct silhouettes, paw or wing motion, and a lunge tied to attacks.

QA on Windows passed typecheck, lint, build, 11 tests and the browser smoke. Combat tests verify shard spending, skill effects, SQLite reload and old replay rules. The browser selected Hỏa Hồ, captured it in the portrait scene and confirmed it after restoring the save. See [the render](evidence/portrait-pet.png).

The render captures Hỏa Hồ in one pose. All three skill effects were verified in simulation. The animation and appearance are prototype assets. Gemini and Antigravity reports NOT_RECEIVED. Leader review remains open.
