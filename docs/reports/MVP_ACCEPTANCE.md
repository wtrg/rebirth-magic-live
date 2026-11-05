# MVP acceptance audit

Audit date 2026-11-05. Evidence spans source snapshots listed in P7, including the ten-minute combined run at 7b225ea and subsequent animation regressions. Scope follows section 16 of the project brief. Overall status remains OPEN while the gates below need evidence.

## Demonstrated local requirements

1. Windows execution — fresh public clone of RC4 preparation commit `80fe1b9` installed and passed all required checks, production browser smoke and the animation harness using Playwright Chromium. See [RC scope](../RELEASE_CANDIDATE.md).
2. Real 3D environment — Three.js arena rendered on Intel UHD Graphics. See [OBS capture](evidence/obs-combined-raid.png).
3. 3D player — local GLB bundle, validated load and procedural fallback. See [model contract](../MODEL_ASSETS.md).
4. 3D boss — Varkhazar renders in the arena with named animation clips and server-driven phase state.
5. Combat — opt-in server-side auto battle, phase thresholds, damage, cooldown, MP, critical cadence, support effects, wraith targets and outcomes are covered by [combat tests](../../tests/combat.test.ts) and browser smoke.
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
18. Tests, setup and build — 26 tests, required quality checks and Windows browser smoke passed for the source lineage in this audit. See [QA plan](../QA_PLAN.md).
19. Public source — [repository](https://github.com/wtrg/rebirth-magic-live). The RC4 scope consolidates session-roster, repeated-impact/pause fixes, action rendering checks and opt-in server auto battle. Release history and exact local QA scope are tracked in P7 and the release document.
20. Codex acceptance report — P0–P7 reports and this audit identify measured evidence, gaps and external-agent status. [Leader handoff](../LEADER_REVIEW_REQUEST.md).

## Remaining gates

- The active roster limitation was corrected in the session-roster follow-up. Join restores the saved profile, leave and host clear free active slots, and global ranking retains archived players. The HTTP regression covers viewer 65 and archived profile restoration. See P7.

- Actual TikTok account, room events, verified gift IDs and platform behavior. The owner confirmed no real test LIVE session is currently available.
- OBS audio routing now has a ten-minute combined recording with one Browser Source and nonzero audio in each one-minute window. Subjective mix quality and longer operation remain open. See P7.
- Longer combined OBS and browser operation. A ten-minute combined recording and separate ten-minute server soak are now documented in P7. Neither establishes 8–12-hour stability, browser/GPU memory behavior or upstream streaming readiness.
- The six-class/three-pet technical action review now covers GLB and procedural fallback, idle, attack approach, changing leg angles, HP recoil, defeat, revival, pause and temporary-pet expiry. See P6 for captures and limits. Art quality, motion direction and Leader visual approval remain open.
- Leader product and visual review. Antigravity and Gemini reports remain NOT_RECEIVED. The WT bridge connectivity check returned fetch failed.
- Master section 7.2 now has a [detailed 17-entity database design](../DATABASE_DESIGN.md), seven supporting tables, migration/rollback mapping and scratch SQL constraint verification. Runtime adoption needs a future adapter/importer and separate migration QA; no normalized schema has been applied to game saves. Leader architecture review remains pending.

Each local test proves only its stated scope. The present evidence supports an operational Windows MOCK candidate while the remaining gates stay open.
