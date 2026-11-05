# Phase report P3

## Full rebirth-cap analysis — 2026-11-05

The [rebirth worksheet](REBIRTH_BALANCE.md) quantifies all six classes at cycles 0–5 and runs 72 deterministic bare-auto combat comparisons through production logic at stages 1 and 3. Three new regressions cover all five rebirths, possession/progression preservation, the sixth-cycle cap, rejected conditions and repeatability. The worksheet documents the immediate level-3 reset tradeoff (−5 ATK / −18 maximum HP) and equal-level permanent gains (+3 ATK / +6 HP per cycle). It does not establish co-op/manual/high-stage balance or replace Leader approval. Runtime formulas are unchanged. Final test results and integration SHA are indexed in [the task ledger](../TASK_LEDGER.md).

```text
PROJECT: RE:BIRTH
PHASE: P3
DATE: 2026-11-05
STATUS: Durable ranked progression verified in MOCK.
REPOSITORY_URL: https://github.com/wtrg/rebirth-magic-live
BRANCH: qa/obs-combined-load
COMMIT_SHA: 72e8e629a11e888108017a868b8f4722a7e27a68

COMPLETED_TASKS: EXP, levels, rebirth, ranked score, stage unlock, deterministic gear, equip rules, SQLite v1-to-v2 migration and online backup.
IN_PROGRESS_TASKS: Review progression pacing and future seasonal ranking needs.
BLOCKED_TASKS: External integration and module reports unavailable.

ANTIGRAVITY_REPORT: NOT_RECEIVED
QODER_REPORT: NOT_RECEIVED
GEMINI_REPORT: NOT_RECEIVED
CODEX_QA_REPORT: Windows smoke won a raid, equipped gear, backed up a running SQLite server and restored into a separate database.

TEST_COMMANDS: npm run typecheck; npm run lint; npm test; npm run build; node scripts/smoke.mjs
TEST_RESULTS: 11 tests, typecheck, lint and browser smoke passed. Legacy migration kept profiles and receipts. Restore retained stage 2, level, equipment, pet and score.
BUILD_STATUS: PASS
PERFORMANCE_RESULTS: P7 measured the SQLite-backed workload. Storage growth across a long-run event workload NOT_RUN.
SECURITY_FINDINGS: Victory, rewards and receipt are committed atomically. Backup refuses overwrite. Practice does not grant durable rewards.

FILES_CHANGED: apps/server/store.ts, apps/server/backup.ts, packages/combat/index.ts, tests/recovery.test.ts, scripts/smoke.mjs.
KNOWN_ISSUES: Legacy v1 databases have no saved stage. Active fights reset on restart.
RISKS: Backups can include player profiles and must remain private.
NEXT_TASKS: Review progression pacing and future seasonal ranking needs.

QUESTIONS_FOR_CHATGPT_LEADER: Are the level-3 rebirth requirement and deterministic gear milestones suitable?
DECISIONS_REQUIRED: Confirm long-term progression and season policy.
RECOMMENDATION: Use the documented backup command before upgrading an active installation.
LEADER_STATUS: LEADER_REVIEW_PENDING
```

[Recovery procedure](../RECOVERY.md) · [Migration tests](../../tests/recovery.test.ts) · [Release candidate](../RELEASE_CANDIDATE.md)


## Achievement follow-up

Six badges derive from existing persistent player progress. A version-6 replay supports the achievement command. No database migration or stored duplicate badge state is needed. Practice results cannot unlock ranked milestones. The browser smoke checks the first boss badge after restoring a SQLite backup.

## Detailed database design

On 2026-11-05, completed a [relational design](../DATABASE_DESIGN.md) for the master prompt's 17 entities and seven supporting tables. It specifies columns, keys, relationships, indexes, constraints, private-data retention and source-v2 mapping/cutover/rollback. The executable [SQL prototype](../schema/normalized.sql) runs only in empty scratch databases; runtime schema v2 and its migration path are unchanged.

Unknown old raid/gift/rebirth/acquisition timestamps remain unknown rather than fabricated. Imported score is an explicit cumulative baseline. Scratch SQLite tests enforce ownership, item slots, contributing ranked rewards, gift limits, immutable raid mode and byte limits. Independent Codex review reproduced a valid 65-character fallback name rejected by the initial draft and a practice-to-ranked relabeling hole. Both were corrected with focused regressions; the reviewer reran the tests and found no further blocker in this design scope.

Typecheck, lint, the full 28-test suite and build passed on Windows. The two new tests use only in-memory SQLite and do not constitute an implemented or accepted production migration. Future adapter/importer and fault/recovery/load QA must precede adoption. Leader architecture review remains pending. External Antigravity/Qoder/Gemini reports for this design were NOT_RECEIVED.
