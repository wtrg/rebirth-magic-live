# MVP acceptance audit

Audit date 2026-11-05. Source snapshot 14b66c062251497d482a98c5e7f5cd0f8aa42aaa. Scope follows section 16 of the project brief. Overall status remains OPEN while the gates below need evidence.

## Demonstrated local requirements

1. Windows execution — fresh public clone installed, built and passed browser smoke for RC2. See [RC scope](../RELEASE_CANDIDATE.md).
2. Real 3D environment — Three.js arena rendered on Intel UHD Graphics. See [OBS capture](evidence/obs-combined-raid.png).
3. 3D player — local GLB bundle, validated load and procedural fallback. See [model contract](../MODEL_ASSETS.md).
4. 3D boss — Varkhazar renders in the arena with named animation clips and server-driven phase state.
5. Combat — phase thresholds, damage, cooldown, MP, critical cadence, support effects, wraith targets and outcomes are covered by [combat tests](../../tests/combat.test.ts) and browser smoke.
6. Command join — HTTP MOCK join and the normalized provider fixture both create stable player IDs.
7. At least three playable classes — six classes have three skills, dedicated silhouettes and signature behavior. See [six-class render](evidence/portrait-six-classes.png).
8. EXP and level — ranked victory and SQLite recovery verified in browser smoke.
9. Rebirth — simulation verifies the level gate, level reset, retained pets and equipment.
10. Boss raid — co-op contribution and victory exercised in multi-player load tests.
11. Earned and usable pets — three unlocks, selected pet, level progression and skill contribution verified in tests. See [P4](PHASE_REPORT_P4.md).
12. Saved data — SQLite migration, online backup and restore verified. See [recovery](../RECOVERY.md).
13. Leaderboard — ranked score appears after victory and restore in browser smoke. Practice excludes durable rewards.
14. Gift buffs through MOCK — all five mapped tiers have bounded effects in practice. Completed streak and duplicate handling covered in tests.
15. TikTok adapter with truthful status — optional provider WebSocket transport and local fixture coverage. Actual LIVE remains unverified. See [P5](PHASE_REPORT_P5.md).
16. OBS overlay — actual portable OBS recording at 1080×1920 with local raid load. See [P7](PHASE_REPORT_P7.md).
17. Admin and emergency stop — local operator pause/resume and Origin checks in browser smoke. Controlled server shutdown regression preserves accepted pending joins.
18. Tests, setup and build — 16 tests, required quality checks and Windows browser smoke passed for the source lineage in this audit. See [QA plan](../QA_PLAN.md).
19. Public source — [repository](https://github.com/wtrg/rebirth-magic-live) and [RC2 release](https://github.com/wtrg/rebirth-magic-live/releases/tag/v0.2.0-rc.2). Reliability and result-panel changes from PRs 21–23 were integrated into main via PR 24. RC3 also integrates actor animation and local OBS audio verification.
20. Codex acceptance report — P0–P7 reports and this audit identify measured evidence, gaps and external-agent status. [Leader handoff](../LEADER_REVIEW_REQUEST.md).

## Remaining gates

- The active roster limitation was corrected in the session-roster follow-up. Join restores the saved profile, leave and host clear free active slots, and global ranking retains archived players. The HTTP regression covers viewer 65 and archived profile restoration. See P7.

- Actual TikTok account, room events, verified gift IDs and platform behavior. The owner confirmed no real test LIVE session is currently available.
- OBS audio routing was subsequently verified in a 17.5-second recording with Browser Source as the only audio input. Sustained audio operation remains unmeasured. See P7.
- Longer combined OBS and browser operation. The current combined recording lasts three minutes. The completed ten-minute server run is tracked in P7 and cannot establish combined stability.
- Full character animation review, including running and hit reactions across all six class models and all pets. The GLB carries actor shoulder and hip pivots. Runtime drives limb motion and HP recoil. The existing GLB clips cover boss weapon pivots.
- Leader product and visual review. Antigravity and Gemini reports remain NOT_RECEIVED. The WT bridge connectivity check returned fetch failed.

Each local test proves only its stated scope. The present evidence supports an operational Windows MOCK candidate while the remaining gates stay open.
