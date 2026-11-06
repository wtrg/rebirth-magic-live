# Leader Review Request

The designated ChatGPT Web Leader reviewed RC5 on 2026-11-05 and approved Windows MOCK, technical core gameplay and the 3D prototype at `2a5173bd9276aeb98f66f6da511a6bc5c648e564`. The decision and follow-up gates are recorded in [RC5 Leader verdict](reports/RC5_LEADER_VERDICT.md).

1. Review the deterministic pet reward and level-3 rebirth gate.
2. Review assisted raid isolation. Proposed implementation treats assisted raids as practice and excludes durable rewards.
3. Approve distinct gift mechanics and confirmed gift IDs before LIVE activation.
4. Review original silhouette, portrait legibility and class/pet action sequences and audio mix.
5. Confirm the allowed LIVE provider and account test route without exposing credentials.


## Evidence index

- [Measured art specification](ART_SPECIFICATION.md), [actual GLB manifest](../assets/manifest.json), [six-class/five-cycle rebirth analysis](reports/REBIRTH_BALANCE.md) and [task traceability ledger](TASK_LEDGER.md). These are Codex deliverables. Gemini later supplied the initial Fire Mage generator for the P9 preview. No runtime balance change is proposed in the worksheet.

- [P0 foundation](reports/PHASE_REPORT_P0.md) and [P1 3D prototype](reports/PHASE_REPORT_P1.md).
- [P2 combat](reports/PHASE_REPORT_P2.md), [P3 progression and recovery](reports/PHASE_REPORT_P3.md) and [P4 pets](reports/PHASE_REPORT_P4.md).
- [P5 interaction](reports/PHASE_REPORT_P5.md), [P6 visual and audio polish](reports/PHASE_REPORT_P6.md) and [P7 release and performance](reports/PHASE_REPORT_P7.md).

The owner confirmed that a real TikTok LIVE test session is unavailable. Actual room events and gift pricing are unverified. The Windows MOCK candidate is documented in [release scope](RELEASE_CANDIDATE.md). Leader approval for Windows MOCK is recorded above. Final art, gameplay balance and LIVE gates remain pending.

RC5 clean-install QA at `3d74b32` passed all 36 tests, manifest freshness, production smoke, six-class/three-pet action checks and multi-size layout checks on Windows/Intel UHD. The final clone stayed clean with an explicit LF rule for the generated manifest. Review this candidate with the measured source limits in P7. The WT bridge recheck returned `fetch failed` before the RC5 handoff was delivered via ChatGPT Web.

P7 includes a ten-minute combined OBS/server-auto/HUD/audio recording at `46cf80d`, in addition to the older `7b225ea` evidence. It supports combined local operation within its documented limits and predates the v11 correction. The [auto-order finding/correction](reports/AUTO_ORDER_FINDING.md) now includes stage-based opportunity rotation, historical v10 replay protection and eight 322-raid comparison cohorts at `3fa4190`. This closes repeated fixed-roster exclusion for the tested workloads while leaving broader manual/co-op balance, product and visual approval pending.

The baseline idle-battle requirement now has opt-in server basic attacks (`!auto on/off`) independent of a MOCK browser loop. See P2 for cooldown, persistence, replay and browserless test evidence. Skills remain manual and the host starts each raid. Review the resulting idle/manual gameplay balance alongside the existing class balance request.

## Open follow-up decisions

- P9: Leader approved merging Fire Mage and Varkhazar behind independent preview flags. PR #48 merged at `4270be2` after Windows/Intel UHD fallback QA and CI. Leader reviewed PNGs and the contact sheet. Continuous MP4 playback and final production art review remain open. [Paired preview](reports/PHASE_REPORT_P9_PREVIEW.md) · [Hỏa Hồ candidate](https://github.com/wtrg/rebirth-magic-live/pull/58) · [Băng Pháp Sư candidate](https://github.com/wtrg/rebirth-magic-live/pull/59)
- P10: Leader approved the narrow auto rejoin fix, merged at `99db549` through PR #56. Leader selected persistent opportunity deficit for manual and auto contention and requested design review before implementation. [Scheduling proposal](P10_OPPORTUNITY_DESIGN.md) · [Issue #51](https://github.com/wtrg/rebirth-magic-live/issues/51)
- P11: A permitted TikTok room and test session are required to verify real comments, gifts and reconnect. [LIVE setup](LIVE_SETUP.md)
- P12: The eight-hour local OBS and recovery measurements are available for the tested P9 commit. [Endurance report](reports/OBS_ENDURANCE_8H.md)

Master section 7.2 has a [detailed database design](DATABASE_DESIGN.md) and executable scratch SQL for all 17 entities plus seven supports. Review ownership, immutable raid mode, imported score baselines, unknown historical timestamps, retention and the proposed offline cutover. It is a reviewed prototype, not an activated migration. A future adapter/importer and its failure/recovery QA are separately required before adoption.
