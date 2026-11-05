# P6 · Combat feedback

```text
PROJECT: RE:BIRTH
PHASE: P6
DATE: 2026-11-05
REPOSITORY_URL: https://github.com/wtrg/rebirth-magic-live
ANTIGRAVITY_REPORT: NOT_RECEIVED
QODER_REPORT: NOT_RECEIVED
GEMINI_REPORT: NOT_RECEIVED
LEADER_STATUS: LEADER_REVIEW_PENDING
STATUS: Partial
BRANCH: feat/combat-feedback
COMMIT_SHA: 4da323a
COMPLETED_TASKS: Boss intro, combat and gift VFX, optional local synthesized audio and portrait HUD.
IN_PROGRESS_TASKS: Production character assets, broader animation polish and OBS audio.
BLOCKED_TASKS: External art and integration reports unavailable.
CODEX_QA_REPORT: Chrome verified boss intro, Web Audio opt-in, typed gifts and replay.
TEST_COMMANDS: npm run typecheck; npm run lint; npm test; npm run build; node scripts/smoke.mjs
TEST_RESULTS: PASS on Windows. OBS audio routing NOT_RUN.
BUILD_STATUS: PASS
PERFORMANCE_RESULTS: Combined 1080×1920 OBS run on Intel UHD measured in P7.
SECURITY_FINDINGS: Sounds synthesize in the local client; no remote audio files.
FILES_CHANGED: apps/game, packages/combat, packages/shared, replay, smoke and OBS setup.
KNOWN_ISSUES: Several class models share the same prototype base.
RISKS: OBS browser autoplay needs operator interaction.
NEXT_TASKS: Validate audio routing and class silhouettes.
QUESTIONS_FOR_CHATGPT_LEADER: Review portrait legibility and motion direction.
DECISIONS_REQUIRED: Production GLB, animation and sound direction.
RECOMMENDATION: Keep synthesized audio opt-in while verifying OBS routing.
```

Date 2026-11-05. Status partial. Leader review pending.

The 3D client displays a short boss introduction, element-colored attack rings and pooled geometry for skill, ultimate and gift sparks. Low quality uses six spark instances and high quality uses twelve. The HUD respects reduced motion for its DOM animations. Combat cues are synthesized locally with Web Audio and muted by default. Replay version 4 records typed feedback while keeping the preceding replay versions readable.

Windows typecheck, lint, build, 11 tests and Chrome smoke passed. The smoke confirms the boss intro, an oscillator created after operator opt-in, a typed gift reaction and deterministic replay. OBS audio routing remains unverified. The combined recording with these effects is documented in [P7](PHASE_REPORT_P7.md). Production character assets, broader animation polish and Leader review are still open. See [OBS audio setup](../OBS_SETUP.md).


## Raid results and skill readiness

The portrait and operator view now display a result panel for victory or defeat, the raid mode, contributor damage and the EXP/shard reward rule. The panel clears on the next raid. The MOCK console shows named skills with cooldown seconds, mana availability and pause status. Windows smoke verified ranked victory rewards, the contributor name, panel dismissal and readiness in the next practice raid. Typecheck, lint, build and 15 tests passed.


## Actor articulation

The shared GLB/procedural factory now creates separate shoulder and hip pivots. Characters swing arms and legs on the attack approach, recoil when the server HP falls, and ease into collapse when defeated. Boss limbs use the same pivot structure. Pausing freezes the local animation clock, including portal, pets, particles and GLB mixer.

The exported bundle was inspected for two arm and two leg pivots in each of the seven actor roots. Windows browser smoke rendered the GLB and fallback and compared canvas screenshots 400 ms apart during pause; the bytes matched. Typecheck, lint, build and 16 tests passed. Detailed visual review of every action for every class remains open.


## Six-class and three-pet action verification

On 2026-11-05, added and ran `node scripts/animation-qa.mjs` against runtime source `185b8431db1b4abe90922186df4eac5703e443b4`. The local Vite fixture imports the production arena unchanged. Chrome rendered through Intel UHD D3D11 at a 1080×1500 scene viewport in low quality. Six synthetic players exercise all six class models and all three pets. The test repeats with the real GLB and with a forced 404 to exercise procedural fallback.

Observed and asserted idle limb/pet motion, approach translation and changing leg angles, weapon swing, pet attack follow-through, torso recoil after HP reduction, eased collapse, recovery after HP restoration and pixel-identical pause. Additional scene assertions check active support pets, expiry, preservation during pause and no resurrection of an expired support pet. Actual class chest colors, GLB node names, pet colors and tagged wings/paws are checked rather than relying only on fixture labels. Actor projected bounds intersect the viewport in all captured poses.

Codex inspected all ten full-resolution screenshots: class colors, weapon silhouettes and the three pet shapes remain distinguishable at rest; attack and recoil poses differ from idle; defeated models lie on their side and recover on revive. Some pets are temporarily occluded by their owners in attack poses. The scene remains a stylized low-poly prototype. This technical review does not constitute Gemini art direction or Leader visual approval.

| Pose | GLB | Procedural fallback |
| --- | --- | --- |
| Idle | [Frame](evidence/animation/glb-idle.png) | [Frame](evidence/animation/procedural-idle.png) |
| Attack approach | [Frame](evidence/animation/glb-attack.png) | [Frame](evidence/animation/procedural-attack.png) |
| HP recoil | [Frame](evidence/animation/glb-hit.png) | [Frame](evidence/animation/procedural-hit.png) |
| Defeat | [Frame](evidence/animation/glb-defeat.png) | [Frame](evidence/animation/procedural-defeat.png) |
| Revive | [Frame](evidence/animation/glb-revive.png) | [Frame](evidence/animation/procedural-revive.png) |

[Run scope](evidence/animation/manifest.json) · [Captured transforms](evidence/animation/results.json)

The test uses synthetic snapshots and a manual clock, so it proves scene response rather than authoritative gameplay or frame rate. The production HUD is excluded. Existing browser smoke covers gameplay and portrait HUD separately. Locomotion is the current short attack approach with procedural limb swing, not free movement through a dungeon. Broader art polish, movement direction and product approval remain pending. External Antigravity/Gemini reports remain NOT_RECEIVED; Leader status remains LEADER_REVIEW_PENDING.

Windows typecheck, lint, the 19-test suite and build passed. A read-only Codex reviewer identified and then verified the stronger model-identity and leg-motion assertions, reran the rendering harness successfully for both modes, and found no blocking setup/cleanup issue. This work adds QA fixtures, captures and documentation; the production arena is unchanged.
