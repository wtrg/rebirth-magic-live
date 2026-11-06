# Task ledger

Snapshot: 2026-11-05, through main 19127ae. This is a retrospective index of actual merged work, followed by open tasks. It does not invent historical state transitions or agent authorship. ACCEPTED below means scoped technical integration, not phase-wide completion or Leader approval.

The original RB-001–005 requests remain in [Agent Protocol](AGENT_PROTOCOL.md). Antigravity delivery remains unverified. Gemini supplied the initial Fire Mage generator for P9, and Codex implemented the preview integration. Qoder supplied the read-only proposal recorded in [P0](reports/PHASE_REPORT_P0.md).

## Integrated work

Each entry's dependencies name the actual Git base used for integration, not a reconstructed planning dependency. File ownership lists paths changed by that merge relative to its first parent; no concurrent ownership is inferred. Acceptance and test evidence are preserved in the linked PR, with successful QA workflow where available. The QA workflow runs typecheck, lint, Node tests and build. Extra browser/OBS/stress results have the specific scope recorded in the PR and phase reports.

### RB-PR-1: Playable 3D mock raid and phase evidence

- ID: RB-PR-1.
- Objective / acceptance: Playable 3D mock raid and phase evidence; the concrete behavior and scoped acceptance evidence are in [PR #1](https://github.com/wtrg/rebirth-magic-live/pull/1).
- Owner: Codex (implementation, integration and QA); no external agent authorship claimed.
- State: ACCEPTED for this merged scope. Branch: `feat/raid-vertical-slice`.
- Dependencies: integration base `ddfc8e5456c80b66002091e7f0c58332d29cab8c`.
- File ownership: `docs/reports/PHASE_REPORT_P0.md`, `docs/reports/PHASE_REPORT_P1.md`.
- Test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; additional executed commands/results, where applicable, in the PR and [phase reports](reports/).
- Evidence: [published change and QA report](https://github.com/wtrg/rebirth-magic-live/pull/1); [successful QA run](https://github.com/wtrg/rebirth-magic-live/actions/runs/41920505700).
- Commit SHA: `496a7c62aebba8f8a530e60ddae08e4559e6863f` (merge snapshot).
- QA result: PASS for the automated QA workflow at this merge; manual results retain their reported scope.

### RB-PR-10: Integrate Windows MOCK release candidate 0.2.0-rc.1

- ID: RB-PR-10.
- Objective / acceptance: Integrate Windows MOCK release candidate 0.2.0-rc.1; the concrete behavior and scoped acceptance evidence are in [PR #10](https://github.com/wtrg/rebirth-magic-live/pull/10).
- Owner: Codex (implementation, integration and QA); no external agent authorship claimed.
- State: ACCEPTED for this merged scope. Branch: `release/mock-rc1`.
- Dependencies: integration base `83221709af401a5cb2e441e51b58703637ff0049`.
- File ownership: `.env.example`, `.github/workflows/qa.yml`, `.gitignore`, `AGENTS.md`, `LICENSE`, `README.md`, `THIRD_PARTY.md`, `apps/game/main.ts`, `apps/game/scene.ts`, `apps/game/style.css`, `apps/game/vite-env.d.ts`, `apps/server/admin.ts`, `apps/server/backup.ts`, `apps/server/index.ts`, `apps/server/replay.ts`, `apps/server/store.ts`, `docs/AGENT_PROTOCOL.md`, `docs/ARCHITECTURE.md`, `docs/ART_BIBLE.md`, `docs/GAME_DESIGN.md`, `docs/LEADER_REVIEW_REQUEST.md`, `docs/LIVE_SETUP.md`, `docs/MASTER_PLAN.md`, `docs/OBS_SETUP.md`, `docs/QA_PLAN.md`, `docs/RECOVERY.md`, `docs/RELEASE_CANDIDATE.md`, `docs/SECURITY.md`, `docs/reports/PHASE_REPORT_P0.md`, `docs/reports/PHASE_REPORT_P1.md`, `docs/reports/PHASE_REPORT_P4.md`, `docs/reports/PHASE_REPORT_P7.md`, `docs/reports/evidence/obs-portrait-raid.png`, `docs/reports/evidence/portrait-pet.png`, `docs/reports/evidence/portrait-raid.png`, `docs/reports/evidence/portrait-victory.png`, `eslint.config.js`, `index.html`, `package-lock.json`, `package.json`, `packages/combat/index.ts`, `packages/shared/index.ts`, `packages/tiktok-adapter/euler.ts`, `packages/tiktok-adapter/index.ts`, `scripts/backup.ts`, `scripts/load.mjs`, `scripts/replay.ts`, `scripts/smoke.mjs`, `tests/combat.test.ts`, `tests/live.test.ts`, `tests/recovery.test.ts`, `tsconfig.json`.
- Test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; additional executed commands/results, where applicable, in the PR and [phase reports](reports/).
- Evidence: [published change and QA report](https://github.com/wtrg/rebirth-magic-live/pull/10); [successful QA run](https://github.com/wtrg/rebirth-magic-live/actions/runs/41925733351).
- Commit SHA: `d81c4957d11732313109410f991a5ead147f3ddb` (merge snapshot).
- QA result: PASS for the automated QA workflow at this merge; manual results retain their reported scope.

### RB-PR-11: Boss introduction, combat VFX and optional audio

- ID: RB-PR-11.
- Objective / acceptance: Boss introduction, combat VFX and optional audio; the concrete behavior and scoped acceptance evidence are in [PR #11](https://github.com/wtrg/rebirth-magic-live/pull/11).
- Owner: Codex (implementation, integration and QA); no external agent authorship claimed.
- State: ACCEPTED for this merged scope. Branch: `feat/combat-feedback`.
- Dependencies: integration base `d81c4957d11732313109410f991a5ead147f3ddb`.
- File ownership: `apps/game/audio.ts`, `apps/game/main.ts`, `apps/game/scene.ts`, `apps/game/style.css`, `apps/server/replay.ts`, `docs/OBS_SETUP.md`, `docs/reports/PHASE_REPORT_P6.md`, `index.html`, `packages/combat/index.ts`, `packages/shared/index.ts`, `scripts/smoke.mjs`.
- Test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; additional executed commands/results, where applicable, in the PR and [phase reports](reports/).
- Evidence: [published change and QA report](https://github.com/wtrg/rebirth-magic-live/pull/11); [successful QA run](https://github.com/wtrg/rebirth-magic-live/actions/runs/41926164565).
- Commit SHA: `4da323aae7fd33f6f4ff9a424c35998bc7ce0a79` (merge snapshot).
- QA result: PASS for the automated QA workflow at this merge; manual results retain their reported scope.

### RB-PR-13: Integrate combat polish and complete phase handoff

- ID: RB-PR-13.
- Objective / acceptance: Integrate combat polish and complete phase handoff; the concrete behavior and scoped acceptance evidence are in [PR #13](https://github.com/wtrg/rebirth-magic-live/pull/13).
- Owner: Codex (implementation, integration and QA); no external agent authorship claimed.
- State: ACCEPTED for this merged scope. Branch: `docs/phase-acceptance`.
- Dependencies: integration base `d81c4957d11732313109410f991a5ead147f3ddb`.
- File ownership: `apps/game/audio.ts`, `apps/game/main.ts`, `apps/game/scene.ts`, `apps/game/style.css`, `apps/server/replay.ts`, `docs/LEADER_REVIEW_REQUEST.md`, `docs/OBS_SETUP.md`, `docs/reports/PHASE_REPORT_P2.md`, `docs/reports/PHASE_REPORT_P3.md`, `docs/reports/PHASE_REPORT_P4.md`, `docs/reports/PHASE_REPORT_P5.md`, `docs/reports/PHASE_REPORT_P6.md`, `docs/reports/PHASE_REPORT_P7.md`, `docs/reports/evidence/obs-combined-raid.png`, `index.html`, `packages/combat/index.ts`, `packages/shared/index.ts`, `scripts/smoke.mjs`.
- Test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; additional executed commands/results, where applicable, in the PR and [phase reports](reports/).
- Evidence: [published change and QA report](https://github.com/wtrg/rebirth-magic-live/pull/13); [successful QA run](https://github.com/wtrg/rebirth-magic-live/actions/runs/41927263028).
- Commit SHA: `286341e87340f74321e3e8026862acd3d6cd8924` (merge snapshot).
- QA result: PASS for the automated QA workflow at this merge; manual results retain their reported scope.

### RB-PR-14: Reproducible GLB actor bundle and runtime fallback

- ID: RB-PR-14.
- Objective / acceptance: Reproducible GLB actor bundle and runtime fallback; the concrete behavior and scoped acceptance evidence are in [PR #14](https://github.com/wtrg/rebirth-magic-live/pull/14).
- Owner: Codex (implementation, integration and QA); no external agent authorship claimed.
- State: ACCEPTED for this merged scope. Branch: `feat/glb-assets`.
- Dependencies: integration base `286341e87340f74321e3e8026862acd3d6cd8924`.
- File ownership: `apps/game/asset-loader.ts`, `apps/game/main.ts`, `apps/game/models.ts`, `apps/game/scene.ts`, `apps/server/index.ts`, `docs/ARCHITECTURE.md`, `docs/MODEL_ASSETS.md`, `docs/reports/evidence/portrait-glb.png`, `public/models/raid.glb`, `scripts/export-models.ts`, `scripts/smoke.mjs`.
- Test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; additional executed commands/results, where applicable, in the PR and [phase reports](reports/).
- Evidence: [published change and QA report](https://github.com/wtrg/rebirth-magic-live/pull/14); [successful QA run](https://github.com/wtrg/rebirth-magic-live/actions/runs/41927658097).
- Commit SHA: `e07da1d020bac4b0b1928b302743192c541b5cdf` (merge snapshot).
- QA result: PASS for the automated QA workflow at this merge; manual results retain their reported scope.

### RB-PR-20: Integrate Windows MOCK release candidate 0.2.0-rc.2

- ID: RB-PR-20.
- Objective / acceptance: Integrate Windows MOCK release candidate 0.2.0-rc.2; the concrete behavior and scoped acceptance evidence are in [PR #20](https://github.com/wtrg/rebirth-magic-live/pull/20).
- Owner: Codex (implementation, integration and QA); no external agent authorship claimed.
- State: ACCEPTED for this merged scope. Branch: `release/mock-rc2`.
- Dependencies: integration base `286341e87340f74321e3e8026862acd3d6cd8924`.
- File ownership: `README.md`, `apps/game/asset-loader.ts`, `apps/game/main.ts`, `apps/game/models.ts`, `apps/game/scene.ts`, `apps/game/style.css`, `apps/server/index.ts`, `apps/server/replay.ts`, `docs/ARCHITECTURE.md`, `docs/GAME_DESIGN.md`, `docs/LIVE_SETUP.md`, `docs/MODEL_ASSETS.md`, `docs/OPERATOR_GUIDE.md`, `docs/RELEASE_CANDIDATE.md`, `docs/reports/PHASE_REPORT_P2.md`, `docs/reports/PHASE_REPORT_P3.md`, `docs/reports/evidence/portrait-glb.png`, `docs/reports/evidence/portrait-six-classes.png`, `docs/reports/evidence/portrait-wraiths.png`, `index.html`, `package-lock.json`, `package.json`, `packages/combat/index.ts`, `packages/shared/index.ts`, `packages/tiktok-adapter/euler.ts`, `packages/tiktok-adapter/index.ts`, `public/models/raid.glb`, `scripts/export-models.ts`, `scripts/smoke.mjs`, `tests/combat.test.ts`, `tests/live.test.ts`.
- Test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; additional executed commands/results, where applicable, in the PR and [phase reports](reports/).
- Evidence: [published change and QA report](https://github.com/wtrg/rebirth-magic-live/pull/20); [successful QA run](https://github.com/wtrg/rebirth-magic-live/actions/runs/41937777926).
- Commit SHA: `cf8ae02a4c9e156cf555984f871b99da0b62f39e` (merge snapshot).
- QA result: PASS for the automated QA workflow at this merge; manual results retain their reported scope.

### RB-PR-21: Show raid results and skill cooldown status

- ID: RB-PR-21.
- Objective / acceptance: Show raid results and skill cooldown status; the concrete behavior and scoped acceptance evidence are in [PR #21](https://github.com/wtrg/rebirth-magic-live/pull/21).
- Owner: Codex (implementation, integration and QA); no external agent authorship claimed.
- State: ACCEPTED for this merged scope. Branch: `feat/raid-results`.
- Dependencies: integration base `cf8ae02a4c9e156cf555984f871b99da0b62f39e`.
- File ownership: `apps/game/main.ts`, `apps/game/style.css`, `docs/reports/PHASE_REPORT_P6.md`, `docs/reports/evidence/portrait-result.png`, `index.html`, `scripts/smoke.mjs`.
- Test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; additional executed commands/results, where applicable, in the PR and [phase reports](reports/).
- Evidence: [published change and QA report](https://github.com/wtrg/rebirth-magic-live/pull/21); [successful QA run](https://github.com/wtrg/rebirth-magic-live/actions/runs/41938127052).
- Commit SHA: `f0f0f3b679d854947b19eadcfe2d654fb667399a` (merge snapshot).
- QA result: PASS for the automated QA workflow at this merge; manual results retain their reported scope.

### RB-PR-24: Integrate reliability fixes and ten-minute soak evidence

- ID: RB-PR-24.
- Objective / acceptance: Integrate reliability fixes and ten-minute soak evidence; the concrete behavior and scoped acceptance evidence are in [PR #24](https://github.com/wtrg/rebirth-magic-live/pull/24).
- Owner: Codex (implementation, integration and QA); no external agent authorship claimed.
- State: ACCEPTED for this merged scope. Branch: `qa/ten-minute-soak`.
- Dependencies: integration base `cf8ae02a4c9e156cf555984f871b99da0b62f39e`.
- File ownership: `apps/game/main.ts`, `apps/game/style.css`, `apps/server/index.ts`, `docs/OPERATOR_GUIDE.md`, `docs/SECURITY.md`, `docs/reports/MVP_ACCEPTANCE.md`, `docs/reports/PHASE_REPORT_P6.md`, `docs/reports/PHASE_REPORT_P7.md`, `docs/reports/evidence/portrait-result.png`, `docs/reports/evidence/server-soak-600.json`, `index.html`, `scripts/smoke.mjs`, `tests/shutdown.test.ts`.
- Test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; additional executed commands/results, where applicable, in the PR and [phase reports](reports/).
- Evidence: [published change and QA report](https://github.com/wtrg/rebirth-magic-live/pull/24); [successful QA run](https://github.com/wtrg/rebirth-magic-live/actions/runs/41940086446).
- Commit SHA: `d41cd8d1c32ab05de047e395e8ac021fb0436f85` (merge snapshot).
- QA result: PASS for the automated QA workflow at this merge; manual results retain their reported scope.

### RB-PR-25: Articulate actors and freeze motion during pause

- ID: RB-PR-25.
- Objective / acceptance: Articulate actors and freeze motion during pause; the concrete behavior and scoped acceptance evidence are in [PR #25](https://github.com/wtrg/rebirth-magic-live/pull/25).
- Owner: Codex (implementation, integration and QA); no external agent authorship claimed.
- State: ACCEPTED for this merged scope. Branch: `feat/character-animation`.
- Dependencies: integration base `d41cd8d1c32ab05de047e395e8ac021fb0436f85`.
- File ownership: `apps/game/models.ts`, `apps/game/scene.ts`, `docs/MODEL_ASSETS.md`, `docs/reports/PHASE_REPORT_P6.md`, `public/models/raid.glb`, `scripts/smoke.mjs`.
- Test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; additional executed commands/results, where applicable, in the PR and [phase reports](reports/).
- Evidence: [published change and QA report](https://github.com/wtrg/rebirth-magic-live/pull/25); [successful QA run](https://github.com/wtrg/rebirth-magic-live/actions/runs/41940457592).
- Commit SHA: `9d8b6dc60a72af642786bee02caa9157706d7202` (merge snapshot).
- QA result: PASS for the automated QA workflow at this merge; manual results retain their reported scope.

### RB-PR-27: Integrate animation and verified OBS audio in RC3

- ID: RB-PR-27.
- Objective / acceptance: Integrate animation and verified OBS audio in RC3; the concrete behavior and scoped acceptance evidence are in [PR #27](https://github.com/wtrg/rebirth-magic-live/pull/27).
- Owner: Codex (implementation, integration and QA); no external agent authorship claimed.
- State: ACCEPTED for this merged scope. Branch: `release/mock-rc3`.
- Dependencies: integration base `d41cd8d1c32ab05de047e395e8ac021fb0436f85`.
- File ownership: `README.md`, `apps/game/main.ts`, `apps/game/models.ts`, `apps/game/scene.ts`, `docs/MODEL_ASSETS.md`, `docs/OBS_SETUP.md`, `docs/RELEASE_CANDIDATE.md`, `docs/reports/MVP_ACCEPTANCE.md`, `docs/reports/PHASE_REPORT_P6.md`, `docs/reports/PHASE_REPORT_P7.md`, `docs/reports/evidence/obs-audio-levels.json`, `eslint.config.js`, `package-lock.json`, `package.json`, `public/models/raid.glb`, `scripts/smoke.mjs`.
- Test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; additional executed commands/results, where applicable, in the PR and [phase reports](reports/).
- Evidence: [published change and QA report](https://github.com/wtrg/rebirth-magic-live/pull/27); [successful QA run](https://github.com/wtrg/rebirth-magic-live/actions/runs/41941563321).
- Commit SHA: `7a520e89c4431e9e80935b8fffd6fcd7c17ca4b2` (merge snapshot).
- QA result: PASS for the automated QA workflow at this merge; manual results retain their reported scope.

### RB-PR-28: Honor queued joins and class choices before raid start

- ID: RB-PR-28.
- Objective / acceptance: Honor queued joins and class choices before raid start; the concrete behavior and scoped acceptance evidence are in [PR #28](https://github.com/wtrg/rebirth-magic-live/pull/28).
- Owner: Codex (implementation, integration and QA); no external agent authorship claimed.
- State: ACCEPTED for this merged scope. Branch: `fix/raid-start-order`.
- Dependencies: integration base `7a520e89c4431e9e80935b8fffd6fcd7c17ca4b2`.
- File ownership: `apps/server/index.ts`, `docs/reports/MVP_ACCEPTANCE.md`, `docs/reports/PHASE_REPORT_P7.md`, `tests/shutdown.test.ts`.
- Test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; additional executed commands/results, where applicable, in the PR and [phase reports](reports/).
- Evidence: [published change and QA report](https://github.com/wtrg/rebirth-magic-live/pull/28); [successful QA run](https://github.com/wtrg/rebirth-magic-live/actions/runs/41942082089).
- Commit SHA: `aea9bea2e0264947034d04c7841a1763852ba99a` (merge snapshot).
- QA result: PASS for the automated QA workflow at this merge; manual results retain their reported scope.

### RB-PR-29: Separate raid membership from saved player profiles

- ID: RB-PR-29.
- Objective / acceptance: Separate raid membership from saved player profiles; the concrete behavior and scoped acceptance evidence are in [PR #29](https://github.com/wtrg/rebirth-magic-live/pull/29).
- Owner: Codex (implementation, integration and QA); no external agent authorship claimed.
- State: ACCEPTED for this merged scope. Branch: `fix/session-roster`.
- Dependencies: integration base `7a520e89c4431e9e80935b8fffd6fcd7c17ca4b2`.
- File ownership: `README.md`, `apps/game/main.ts`, `apps/server/admin.ts`, `apps/server/index.ts`, `apps/server/replay.ts`, `apps/server/store.ts`, `docs/ARCHITECTURE.md`, `docs/OPERATOR_GUIDE.md`, `docs/RECOVERY.md`, `docs/reports/MVP_ACCEPTANCE.md`, `docs/reports/PHASE_REPORT_P7.md`, `index.html`, `packages/combat/index.ts`, `packages/shared/index.ts`, `scripts/smoke.mjs`, `tests/roster.test.ts`, `tests/shutdown.test.ts`.
- Test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; additional executed commands/results, where applicable, in the PR and [phase reports](reports/).
- Evidence: [published change and QA report](https://github.com/wtrg/rebirth-magic-live/pull/29); [successful QA run](https://github.com/wtrg/rebirth-magic-live/actions/runs/41942962911).
- Commit SHA: `7b225ea08edf1ee788a3fd6903c60895323b2472` (merge snapshot).
- QA result: PASS for the automated QA workflow at this merge; manual results retain their reported scope.

### RB-PR-30: Fix repeated boss clips and paused pet visibility; record 10-minute OBS QA

- ID: RB-PR-30.
- Objective / acceptance: Fix repeated boss clips and paused pet visibility; record 10-minute OBS QA; the concrete behavior and scoped acceptance evidence are in [PR #30](https://github.com/wtrg/rebirth-magic-live/pull/30).
- Owner: Codex (implementation, integration and QA); no external agent authorship claimed.
- State: ACCEPTED for this merged scope. Branch: `qa/combined-rc3-soak`.
- Dependencies: integration base `7b225ea08edf1ee788a3fd6903c60895323b2472`.
- File ownership: `apps/game/animation.ts`, `apps/game/main.ts`, `apps/game/scene.ts`, `apps/server/index.ts`, `docs/LEADER_REVIEW_REQUEST.md`, `docs/RELEASE_CANDIDATE.md`, `docs/reports/MVP_ACCEPTANCE.md`, `docs/reports/PHASE_REPORT_P7.md`, `docs/reports/evidence/obs-soak-600.json`, `docs/reports/evidence/obs-soak-600.png`, `packages/shared/index.ts`, `scripts/smoke.mjs`, `tests/animation.test.ts`, `tests/roster.test.ts`.
- Test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; additional executed commands/results, where applicable, in the PR and [phase reports](reports/).
- Evidence: [published change and QA report](https://github.com/wtrg/rebirth-magic-live/pull/30); [successful QA run](https://github.com/wtrg/rebirth-magic-live/actions/runs/41945189935).
- Commit SHA: `185b8431db1b4abe90922186df4eac5703e443b4` (merge snapshot).
- QA result: PASS for the automated QA workflow at this merge; manual results retain their reported scope.

### RB-PR-31: Verify all class and pet action renders with GLB and fallback

- ID: RB-PR-31.
- Objective / acceptance: Verify all class and pet action renders with GLB and fallback; the concrete behavior and scoped acceptance evidence are in [PR #31](https://github.com/wtrg/rebirth-magic-live/pull/31).
- Owner: Codex (implementation, integration and QA); no external agent authorship claimed.
- State: ACCEPTED for this merged scope. Branch: `qa/class-pet-animation`.
- Dependencies: integration base `185b8431db1b4abe90922186df4eac5703e443b4`.
- File ownership: `docs/MODEL_ASSETS.md`, `docs/QA_PLAN.md`, `docs/reports/MVP_ACCEPTANCE.md`, `docs/reports/PHASE_REPORT_P6.md`, `docs/reports/evidence/animation/glb-attack.png`, `docs/reports/evidence/animation/glb-defeat.png`, `docs/reports/evidence/animation/glb-hit.png`, `docs/reports/evidence/animation/glb-idle.png`, `docs/reports/evidence/animation/glb-revive.png`, `docs/reports/evidence/animation/manifest.json`, `docs/reports/evidence/animation/procedural-attack.png`, `docs/reports/evidence/animation/procedural-defeat.png`, `docs/reports/evidence/animation/procedural-hit.png`, `docs/reports/evidence/animation/procedural-idle.png`, `docs/reports/evidence/animation/procedural-revive.png`, `docs/reports/evidence/animation/results.json`, `scripts/animation-qa.mjs`, `scripts/fixtures/animation.html`, `scripts/fixtures/animation.ts`.
- Test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; additional executed commands/results, where applicable, in the PR and [phase reports](reports/).
- Evidence: [published change and QA report](https://github.com/wtrg/rebirth-magic-live/pull/31); [successful QA run](https://github.com/wtrg/rebirth-magic-live/actions/runs/41946113484).
- Commit SHA: `780a1749dd5a640d56f065a9ab929205ac5e5004` (merge snapshot).
- QA result: PASS for the automated QA workflow at this merge; manual results retain their reported scope.

### RB-PR-32: Add opt-in server auto battle with saved preference and replay

- ID: RB-PR-32.
- Objective / acceptance: Add opt-in server auto battle with saved preference and replay; the concrete behavior and scoped acceptance evidence are in [PR #32](https://github.com/wtrg/rebirth-magic-live/pull/32).
- Owner: Codex (implementation, integration and QA); no external agent authorship claimed.
- State: ACCEPTED for this merged scope. Branch: `feat/server-auto-battle`.
- Dependencies: integration base `780a1749dd5a640d56f065a9ab929205ac5e5004`.
- File ownership: `README.md`, `apps/game/main.ts`, `apps/server/index.ts`, `apps/server/replay.ts`, `docs/ARCHITECTURE.md`, `docs/GAME_DESIGN.md`, `docs/LEADER_REVIEW_REQUEST.md`, `docs/OPERATOR_GUIDE.md`, `docs/QA_PLAN.md`, `docs/RELEASE_CANDIDATE.md`, `docs/reports/MVP_ACCEPTANCE.md`, `docs/reports/PHASE_REPORT_P2.md`, `docs/reports/PHASE_REPORT_P7.md`, `docs/reports/evidence/server-auto-60.json`, `index.html`, `packages/combat/index.ts`, `packages/shared/index.ts`, `scripts/load.mjs`, `scripts/smoke.mjs`, `tests/auto.test.ts`.
- Test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; additional executed commands/results, where applicable, in the PR and [phase reports](reports/).
- Evidence: [published change and QA report](https://github.com/wtrg/rebirth-magic-live/pull/32); [successful QA run](https://github.com/wtrg/rebirth-magic-live/actions/runs/41947248447).
- Commit SHA: `155ecc43cadd338a1ab80c163ded9ba045448057` (merge snapshot).
- QA result: PASS for the automated QA workflow at this merge; manual results retain their reported scope.

### RB-PR-33: Prepare RC4 with clean Windows install verification

- ID: RB-PR-33.
- Objective / acceptance: Prepare RC4 with clean Windows install verification; the concrete behavior and scoped acceptance evidence are in [PR #33](https://github.com/wtrg/rebirth-magic-live/pull/33).
- Owner: Codex (implementation, integration and QA); no external agent authorship claimed.
- State: ACCEPTED for this merged scope. Branch: `release/rc4`.
- Dependencies: integration base `155ecc43cadd338a1ab80c163ded9ba045448057`.
- File ownership: `README.md`, `docs/ARCHITECTURE.md`, `docs/LEADER_REVIEW_REQUEST.md`, `docs/RELEASE_CANDIDATE.md`, `docs/reports/MVP_ACCEPTANCE.md`, `docs/reports/PHASE_REPORT_P7.md`, `package-lock.json`, `package.json`.
- Test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; additional executed commands/results, where applicable, in the PR and [phase reports](reports/).
- Evidence: [published change and QA report](https://github.com/wtrg/rebirth-magic-live/pull/33); [successful QA run](https://github.com/wtrg/rebirth-magic-live/actions/runs/41947994374).
- Commit SHA: `854b5052d4b56670354b606ccd9766b6b8ce07af` (merge snapshot).
- QA result: PASS for the automated QA workflow at this merge; manual results retain their reported scope.

### RB-PR-34: Specify all required database entities and validate schema prototype

- ID: RB-PR-34.
- Objective / acceptance: Specify all required database entities and validate schema prototype; the concrete behavior and scoped acceptance evidence are in [PR #34](https://github.com/wtrg/rebirth-magic-live/pull/34).
- Owner: Codex (implementation, integration and QA); no external agent authorship claimed.
- State: ACCEPTED for this merged scope. Branch: `docs/database-design`.
- Dependencies: integration base `854b5052d4b56670354b606ccd9766b6b8ce07af`.
- File ownership: `docs/ARCHITECTURE.md`, `docs/DATABASE_DESIGN.md`, `docs/LEADER_REVIEW_REQUEST.md`, `docs/QA_PLAN.md`, `docs/reports/MVP_ACCEPTANCE.md`, `docs/reports/PHASE_REPORT_P3.md`, `docs/schema/normalized.sql`, `tests/schema-design.test.ts`.
- Test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; additional executed commands/results, where applicable, in the PR and [phase reports](reports/).
- Evidence: [published change and QA report](https://github.com/wtrg/rebirth-magic-live/pull/34); [successful QA run](https://github.com/wtrg/rebirth-magic-live/actions/runs/41949682194).
- Commit SHA: `f847592991b53f706c570815b68856c7f25c5b0e` (merge snapshot).
- QA result: PASS for the automated QA workflow at this merge; manual results retain their reported scope.

### RB-PR-35: Measure native client render cadence and verify WebGL fallback

- ID: RB-PR-35.
- Objective / acceptance: Measure native client render cadence and verify WebGL fallback; the concrete behavior and scoped acceptance evidence are in [PR #35](https://github.com/wtrg/rebirth-magic-live/pull/35).
- Owner: Codex (implementation, integration and QA); no external agent authorship claimed.
- State: ACCEPTED for this merged scope. Branch: `qa/client-render-gates`.
- Dependencies: integration base `f847592991b53f706c570815b68856c7f25c5b0e`.
- File ownership: `docs/QA_PLAN.md`, `docs/reports/MVP_ACCEPTANCE.md`, `docs/reports/PHASE_REPORT_P7.md`, `docs/reports/evidence/render-benchmark/glb.png`, `docs/reports/evidence/render-benchmark/procedural.png`, `docs/reports/evidence/render-benchmark/results.json`, `docs/reports/evidence/webgl-unavailable.png`, `scripts/fixtures/animation.ts`, `scripts/render-benchmark.mjs`, `scripts/smoke.mjs`.
- Test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; additional executed commands/results, where applicable, in the PR and [phase reports](reports/).
- Evidence: [published change and QA report](https://github.com/wtrg/rebirth-magic-live/pull/35); [successful QA run](https://github.com/wtrg/rebirth-magic-live/actions/runs/41951290011).
- Commit SHA: `83a39ae43378df0553b68d56b678ee4352d299f0` (merge snapshot).
- QA result: PASS for the automated QA workflow at this merge; manual results retain their reported scope.

### RB-PR-36: Keep desktop raid and operator controls within the viewport

- ID: RB-PR-36.
- Objective / acceptance: Keep desktop raid and operator controls within the viewport; the concrete behavior and scoped acceptance evidence are in [PR #36](https://github.com/wtrg/rebirth-magic-live/pull/36).
- Owner: Codex (implementation, integration and QA); no external agent authorship claimed.
- State: ACCEPTED for this merged scope. Branch: `fix/desktop-operator-layout`.
- Dependencies: integration base `83a39ae43378df0553b68d56b678ee4352d299f0`.
- File ownership: `apps/game/style.css`, `docs/OPERATOR_GUIDE.md`, `docs/QA_PLAN.md`, `docs/reports/MVP_ACCEPTANCE.md`, `docs/reports/PHASE_REPORT_P6.md`, `docs/reports/evidence/desktop-layout-1000x700.png`, `docs/reports/evidence/desktop-layout-1280x900.png`, `docs/reports/evidence/desktop-layout-1366x768.png`, `docs/reports/evidence/desktop-layout-before-1280x900.png`, `docs/reports/evidence/desktop-layout-before.json`, `docs/reports/evidence/desktop-layout.json`, `docs/reports/evidence/desktop-obs-540x960.png`, `docs/reports/evidence/desktop-result-1000x700.png`, `docs/reports/evidence/operator-mobile-390x844.png`, `index.html`, `scripts/layout-qa.mjs`.
- Test commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; additional executed commands/results, where applicable, in the PR and [phase reports](reports/).
- Evidence: [published change and QA report](https://github.com/wtrg/rebirth-magic-live/pull/36); [successful QA run](https://github.com/wtrg/rebirth-magic-live/actions/runs/41954374014).
- Commit SHA: `19127ae3f234c318b01ea5377c6a39016db4dbc8` (merge snapshot).
- QA result: PASS for the automated QA workflow at this merge; manual results retain their reported scope.

## Open and newly executed work

| ID | Objective | Owner | State | Dependencies | File ownership | Acceptance | Test commands | Evidence / SHA | QA result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RB-ART-SPEC | Measure real assets and specify art contract | Codex | ACCEPTED (technical scope) | RB-PR-36 | scripts/inspect-models.ts, assets/, docs/ART_SPECIFICATION.md, ART_BIBLE.md, MODEL_ASSETS.md; CI freshness check | Deterministic manifest matches GLB; dimensions and animation limits documented | node scripts/inspect-models.ts; standard four QA commands | Tested source 2235f41 on branch docs/asset-specification; P1 report | PASS: repeated manifest equality, independent source review, typecheck/lint/31 tests/build; art approval separate |
| RB-REBIRTH-BALANCE | Verify all six classes and five rebirth cycles | Codex reviewer sub-agent; root integration | ACCEPTED (technical scope) | Existing progression engine | scripts/rebirth-balance.ts, tests/rebirth-balance.test.ts, docs/reports/REBIRTH_BALANCE.md | Actual formulas, cap and eligibility checks; no balance change | node scripts/rebirth-balance.ts; npm test; standard gates | Tested source 2235f41; P3 report and balance worksheet | PASS: 36 stat rows, 72 terminal victories, focused 3/3 and full 31/31, typecheck/lint/build; Leader balance approval separate |
| RB-OBS-CURRENT | Refresh combined auto/HUD/audio evidence | Codex | ACCEPTED (measurement scope) | RB-PR-37; isolated local OBS | scripts/obs-soak.mjs, scripts/analyze-obs.mjs, OBS_QA.md, P7 and synthetic evidence | Report current source, duration, workload, audio and OBS counters honestly | node scripts/obs-soak.mjs; node scripts/analyze-obs.mjs PATH_TO_RESULTS; standard four gates | Tested runtime/harness 46cf80d; [P7](reports/PHASE_REPORT_P7.md#current-source-combined-auto-hud-and-audio--2026-11-05) | PASS: 600.166s encoded video/AAC, zero OBS skipped deltas, 10 nonzero mono windows, SQLite ok, 31/31 tests; auto fairness defect remains separate |
| RB-AUTO-ORDER | Prevent repeated fixed-roster auto reward exclusion | Codex sub-agent implementation; root review/integration and independent fixture/career QA | ACCEPTED (technical scope) | Confirmed reproduction at 46cf80d; main 054e544 | packages/combat/index.ts, apps/server/index.ts, apps/server/replay.ts, tests/auto.test.ts, tests/auto-order.test.ts; root owns tests/auto-legacy.test.ts, fixtures/auto-v10.json, scripts/auto-fairness-qa.ts and docs/evidence | Rotate opportunities across stages; keep eligibility/cooldowns/old replay results; deterministic v11 | Focused tests; standard four gates; node scripts/smoke.mjs; node scripts/auto-fairness-qa.ts; QA_LOAD_AUTO=1 node scripts/load.mjs | Tested implementation 3fa4190 on fix/auto-order-fairness; [correction/evidence](reports/AUTO_ORDER_FINDING.md#correction-and-evidence) | PASS: 36/36, quality/build, Intel UHD smoke, historical digest, 8 career cohorts, 60s/64-auto/8-consumer sample; CI required before merge |
| RB-RC5 | Package v11 ordering and post-RC4 layout fixes in a new Windows MOCK candidate | Codex; independent read-only release reviewer | ACCEPTED (candidate QA; publication gated by CI) | RB-AUTO-ORDER; main 3f1e490 | release/rc5: package.json/package-lock.json, README, .gitattributes manifest rule, release/handoff/P7 docs and synthetic QA record | Fresh public clone passes quality/build/smoke/action/layout, remains clean; new immutable prerelease only after CI; limits disclosed | npm ci; standard four gates; inspector/manifest diff; Playwright Chromium smoke/action/layout; production audit; empty Git-status assertion | Tested 3d74b32; [RC5 CLI record](reports/evidence/rc5-install.json); intended tag v0.2.0-rc.5 after integration CI | PASS: 36/36, quality/build, three browser harnesses, manifest, audit0 and clean clone; LF correction retested in second fresh clone |
| RB-GEMINI | Obtain original art review and assets | Gemini art direction; Codex asset revision and QA | REVIEW | Reviewed art direction for the remaining assets | Fire Mage generator and paired preview | Original references and reproducible assets | Blender export; 9:16 target-machine QA | [Fire Mage asset](https://github.com/wtrg/rebirth-magic-live/pull/44), [paired preview](https://github.com/wtrg/rebirth-magic-live/pull/48) | Generator received and revised; final art pending |
| RB-LEADER | Receive product and architecture decisions | ChatGPT Web Leader | REVIEW | Accessible review responses | docs/LEADER_REVIEW_REQUEST.md | Explicit decisions for each scope | Review published evidence | [RC5 verdict](reports/RC5_LEADER_VERDICT.md), [open decisions](LEADER_REVIEW_REQUEST.md#open-follow-up-decisions) | RC5 Windows MOCK, P9 flagged preview and P10 narrow auto fix approved; final art and manual policy pending |
| RB-P10-INGRESS | Reproduce fast-kill manual ordering skew | Codex QA | ACCEPTED (evidence scope) | v11 combat, HTTP and SQLite | scripts/p10-*, P10 evidence report | Reproduce and compare orders, verify persisted rewards and replay | Three P10 QA drivers, standard gates | [PR #52](https://github.com/wtrg/rebirth-magic-live/pull/52), fbc2df8 | PASS evidence; policy pending |
| RB-P9-PAIR | Ship opt-in Fire Mage and Varkhazar previews | Codex; Leader verdict | ACCEPTED (preview scope) | Independent feature flags and fallback | Client preview loaders, server impact timestamp and P9 evidence | Default requests neither preview, individual and all-GLB failures render | Standard gates, paired browser QA and boss preview QA | [PR #48](https://github.com/wtrg/rebirth-magic-live/pull/48), 4270be2 | PASS: 36 tests, CI and Intel UHD fallback |
| RB-P9-SAMPLES | Prepare a non-Fire class and one pet for review | Codex | REVIEW | Standalone assets | Băng Pháp Sư and Hỏa Hồ source, GLB and renders | Inspect rig and distinct silhouettes, then review at portrait scale | Blender export and GLB inspection, standard gates | [PR #58](https://github.com/wtrg/rebirth-magic-live/pull/58), [PR #59](https://github.com/wtrg/rebirth-magic-live/pull/59) | Standalone checks passed, portrait integration pending |
| RB-P10-AUTO-REJOIN | Preserve auto opportunity rotation across roster reorder | Codex; Leader verdict | ACCEPTED (narrow fix) | v12 and stable IDs | Combat auto ordering, replay and tests | Preserve historical replays, manual order and roster display | Standard gates and HTTP rejoin/replay/SQLite fixture | [PR #56](https://github.com/wtrg/rebirth-magic-live/pull/56), 99db549 | PASS: 37 tests, CI, eight distinct first opportunities over eight raids |
| RB-P10-OPPORTUNITY | Design ranked opportunity deficit scheduling | Codex; Leader review | REVIEW | RB-P10-INGRESS | docs/P10_OPPORTUNITY_DESIGN.md | Agree admission, debt, persistence, replay and verification | Proposed HTTP/SQLite and replay acceptance matrix | [Proposal](P10_OPPORTUNITY_DESIGN.md), [Issue #51](https://github.com/wtrg/rebirth-magic-live/issues/51) | Design only |
| RB-P11-LOOPBACK | Exercise LIVE adapter through synthetic Euler locally | Codex | ACCEPTED (loopback scope) | Synthetic events and local SQLite | scripts/live-loopback-qa.mjs, CI | Verify chat, completed gift, reconnect deduplication and persistence | node scripts/live-loopback-qa.mjs | [PR #55](https://github.com/wtrg/rebirth-magic-live/pull/55), [PR #57](https://github.com/wtrg/rebirth-magic-live/pull/57) | PASS loopback, real LIVE tracked separately |
| RB-P12-OBS-8H | Measure 8-hour MOCK recording and verify recovery | Codex QA | ACCEPTED (measurement scope) | Isolated OBS and P9 build | OBS harness, analyzer and evidence report | Verify recording duration, audio and restored profiles | OBS soak, analyzer and SQLite backup/restore | [8-hour report](reports/OBS_ENDURANCE_8H.md), tested 28d76a8 | PASS 8-hour local run and recovery |
| RB-LIVE | Authorized real LIVE end-to-end test | Codex + owner session | BLOCKED | User confirms no test LIVE session available | Local configuration and synthetic/redacted QA report only | Verify permitted channel, gift IDs and event flow without exposing secrets | docs/LIVE_SETUP.md runbook | No real session; credentials stay local | NOT_RUN |

Blocked task rows describe external dependencies, not the status of the overall active project goal. No paid connector, cloud service or asset is authorized. P8 expansion remains deferred.
