# Phase report P2

## Rotating auto opportunity and replay v11

The [auto-order correction](AUTO_ORDER_FINDING.md#correction-and-evidence) rotates the first auto attacker by ranked stage without mutating roster order, changing positive-contribution reward eligibility or adding a persistent cursor. `currentRulesVersion=11` is shared by the server and new trace writer; explicit v10 traces keep fixed order. Full-cycle/permutation, skipped eligibility, cooldown, once-only reward and mixed-replay regressions accompany an immutable historical v10 complete-state digest. An independent eight-cohort/322-raid comparison quantifies the removal of permanent tail exclusion in that synthetic workload. It does not establish full class or manual-input balance. Final source, integration QA and exact evidence are recorded in [the task ledger](../TASK_LEDGER.md).

```text
PROJECT: RE:BIRTH
PHASE: P2
DATE: 2026-11-05
STATUS: Core combat verified in MOCK.
REPOSITORY_URL: https://github.com/wtrg/rebirth-magic-live
BRANCH: qa/obs-combined-load
COMMIT_SHA: 72e8e629a11e888108017a868b8f4722a7e27a68

COMPLETED_TASKS: Server-authoritative boss phases, HP and MP, six class loadouts, three named skills each, cooldowns, attack and results.
IN_PROGRESS_TASKS: Expand class-specific skill identity and balance multi-player raids.
BLOCKED_TASKS: External Antigravity integration report unavailable.

ANTIGRAVITY_REPORT: NOT_RECEIVED
QODER_REPORT: Previously returned an independent read-only phase and damage proposal. Codex retained inclusive 55% and 25% thresholds and floor damage.
GEMINI_REPORT: NOT_RECEIVED
CODEX_QA_REPORT: Verified damage boundaries, cooldowns, defeat and retry in the simulation, plus victory through Chrome on Windows.

TEST_COMMANDS: npm run typecheck; npm run lint; npm test; npm run build; node scripts/smoke.mjs
TEST_RESULTS: 11 tests, typecheck, lint and browser smoke passed.
BUILD_STATUS: PASS
PERFORMANCE_RESULTS: Server and combined OBS tests are documented in P7. Per-class combat balance benchmark NOT_RUN.
SECURITY_FINDINGS: Damage and victory are derived from server state. HTTP submits commands, not damage values.

FILES_CHANGED: packages/combat/index.ts, packages/shared/index.ts, tests/combat.test.ts, scripts/smoke.mjs.
KNOWN_ISSUES: Several classes share generic damage multipliers. Class identity depends on stats, effects and selected skill modifiers.
RISKS: Single boss and deterministic rewards need tuning for high-stage co-op.
NEXT_TASKS: Expand class-specific skill identity and balance multi-player raids.

QUESTIONS_FOR_CHATGPT_LEADER: Which class identities and boss difficulty targets should be tuned first?
DECISIONS_REQUIRED: Confirm class balance targets before major changes.
RECOMMENDATION: Keep the current combat loop available for the local demo.
LEADER_STATUS: LEADER_REVIEW_PENDING
```

[Combat tests](../../tests/combat.test.ts) · [Design](../GAME_DESIGN.md) · [P7 performance](PHASE_REPORT_P7.md)


## Class signature follow-up

The class-combat branch adds a deterministic critical cadence, class-specific signature effects, and a shared control ceiling per boss attack. It keeps replay versions 1–4 on their earlier rules. The focused simulation cases cover all six class effects and the control ceiling. The follow-up stage-3 encounter adds two Ảnh Linh targets. Current Fire area attacks damage both. The boss and summons are simulated server-side. See [combat signatures](../GAME_DESIGN.md#combat-signatures).


## Server-side idle battle

The earlier automatic mode was a MOCK browser command generator. The server now supports opt-in basic attacks with `!auto on` and `!auto off`; a new player starts with it disabled. The saved preference restores on join. Auto eligibility requires an active raid, living joined character and ready basic cooldown. Manual and automatic basic attacks share the same 600 ms cooldown. Skills remain manual, and the host starts each raid.

The scheduler applies the boss turn, the current FIFO command batch, then eligible auto attacks. Thus a processed off command or manual attack takes effect before the auto batch. Profiles, victory rewards and stage unlock commit together before auto state is published. The existing pause stops auto and extends cooldowns on resume. A disconnected TikTok source does not stop local simulation; the host can pause. Closing the operator page no longer disables auto battle.

MOCK replay v10 records automatic batches and reproduces mixed manual, boss and auto steps. Versions 1–9 retain their previous behavior. Seven focused regressions cover cooldown sharing, inactive/dead/paused players, one-time rewards, legacy replay, deterministic current replay and saved preferences. An isolated HTTP test completes a raid without a browser attack loop, checks pause/resume and persists the enabled preference, one victory and stage 2.

Windows typecheck, lint, all 26 tests and build passed. The production browser smoke verified checkbox on/off and rejection recovery, then the existing combat, replay, backup and restore flow on Intel UHD D3D11. A separate read-only Codex review found no blocker in scheduler ordering, atomic persistence, replay or checkbox state. The seven auto tests were authored by that Codex sub-agent; this is not an external Qoder or Antigravity report. Real TikTok LIVE remains untested.
