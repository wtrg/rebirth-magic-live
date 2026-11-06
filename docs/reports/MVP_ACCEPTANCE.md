# MVP acceptance audit

Scope follows section 16 of the project brief. Evidence applies to the specific source snapshots identified below. The Leader approved RC5 for Windows MOCK. The broader project remains open for the follow-up gates in this audit. See the [RC5 verdict](RC5_LEADER_VERDICT.md).

## Demonstrated local requirements

1. Windows execution — fresh public RC5 clone at `3d74b32` installed and passed all required checks, manifest inspection, production smoke, action and layout harnesses using Playwright Chromium on Intel UHD. The working tree stayed clean after the Windows manifest line-ending correction. See [RC scope](../RELEASE_CANDIDATE.md).
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
15. TikTok adapter with truthful status — a synthetic Euler WebSocket peer verified join, completed gifts, reconnect, deduplication and SQLite persistence. Actual LIVE remains unverified. See [loopback QA](https://github.com/wtrg/rebirth-magic-live/pull/57).
16. OBS overlay — portable OBS recorded more than eight hours at 1080×1920 with local MOCK raid load, H.264 and stereo AAC. See the [endurance report](OBS_ENDURANCE_8H.md).
17. Admin and emergency stop — local operator pause/resume and Origin checks in browser smoke. Controlled server shutdown regression preserves accepted pending joins.
18. Tests, setup and build — Windows Intel UHD smoke, synthetic Euler loopback, typecheck, lint, 37 tests and build passed for the smoke correction merged as `9963579`. The smoke includes GLB/procedural/no-WebGL paths, replay, backup/recovery and server controls. A historical v10 complete-state digest protects compatibility. See [PR #62](https://github.com/wtrg/rebirth-magic-live/pull/62).
19. Public source — [repository](https://github.com/wtrg/rebirth-magic-live). RC5 adds stage-rotated auto with versioned replay, viewport-bounded desktop controls, measured asset specifications and broader rebirth/schema QA. Earlier runtime features remain included. Release history and exact local QA scope are tracked in P7 and the release document.
20. Codex acceptance report — P0–P7 reports and this audit identify measured evidence, gaps and external-agent status. [Leader handoff](../LEADER_REVIEW_REQUEST.md).

## Remaining gates

Master-wide traceability is indexed in the [task ledger](../TASK_LEDGER.md). The [measured art specification](../ART_SPECIFICATION.md) closes the prototype dimension/manifest documentation gap. The [rebirth worksheet](REBIRTH_BALANCE.md) verifies all five cycles and quantifies current gains/reset losses; gameplay approval remains pending. P7 includes a ten-minute combined auto/HUD/audio recording at `46cf80d`, before the v11 ordering correction. The [auto-order defect](AUTO_ORDER_FINDING.md) is corrected with deterministic stage-based rotation and old replay compatibility. The 322-raid synthetic cohorts verify that specific fixed-roster exclusion fix; they do not establish full manual/co-op class balance or extend the older OBS measurement to every later change.

- The active roster limitation was corrected in the session-roster follow-up. Join restores the saved profile, leave and host clear free active slots, and global ranking retains archived players. The HTTP regression covers viewer 65 and archived profile restoration. See P7.

- Actual TikTok account, room events, verified gift IDs and platform behavior. The owner confirmed no real test LIVE session is currently available.
- The eight-hour OBS run covered `28d76a8` with the P9 previews enabled. It measured server memory and verified the backup and restore of all 32 synthetic profiles. Browser and GPU memory, subjective audio mix quality, 12-hour endurance and upstream streaming readiness still need separate evidence. See the [endurance report](OBS_ENDURANCE_8H.md).
- Native-clock client scene samples now measure approximately 30 CPU render submissions/s, stable renderer resource counts during roster churn and bounded short-run heap samples for GLB/fallback. P7 records the retained-heap increase and scope. GPU-memory bytes, presentation FPS and long-run combined memory stability remain unverified.
- The six-class/three-pet technical action review now covers GLB and procedural fallback, idle, attack approach, changing leg angles, HP recoil, defeat, revival, pause and temporary-pet expiry. See P6 for captures and limits. Art quality, motion direction and Leader visual approval remain open.
- The desktop console no longer stretches the game below the viewport. P6 records seven-size layout QA, real wraith/victory states, wrapped-log/result boundaries, independent keyboard scroll and the OBS portrait check. The broader product/art review remains pending.
- The Leader approved the flagged Fire Mage/Varkhazar preview. Hỏa Hồ and Băng Pháp Sư production integration awaits a decision after crowded-scene QA. See [PR #63](https://github.com/wtrg/rebirth-magic-live/pull/63).
- The P10 v13 prototype passed 48 tests and both CI checks at `f9f2ac3`, including post-shutdown replay and SQLite comparison. The rotating-roster ordering policy awaits the Leader's decision. See [PR #61](https://github.com/wtrg/rebirth-magic-live/pull/61) and [issue #51](https://github.com/wtrg/rebirth-magic-live/issues/51#issuecomment-6682933352).
- Master section 7.2 now has a [detailed 17-entity database design](../DATABASE_DESIGN.md), seven supporting tables, migration/rollback mapping and scratch SQL constraint verification. Runtime adoption needs a future adapter/importer and separate migration QA; no normalized schema has been applied to game saves. Leader architecture review remains pending.

Each local test proves only its stated scope. The present evidence supports an operational Windows MOCK candidate while the remaining gates stay open.
