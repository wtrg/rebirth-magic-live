# RE:BIRTH 0.2.0-rc.5 · Windows MOCK candidate

RC5 packages the post-RC4 desktop fixes and v11 auto-order correction. The release preparation requires a fresh public Windows clone, local QA and green integration CI before publishing its immutable tag. Exact tested source and execution results are recorded in [P7](reports/PHASE_REPORT_P7.md). Older tags retain their original behavior; RC4 uses fixed-order v10 auto.

This prerelease packages the local Windows Boss Raid. It includes an optional TikTok transport; actual room events and gifts remain unverified because no authorized test LIVE session is available.

## Install this candidate

```powershell
git clone --branch v0.2.0-rc.5 https://github.com/wtrg/rebirth-magic-live.git
cd rebirth-magic-live
npm ci
npm run build
npm start
```

Use Node 24 and a browser with WebGL 2. Open `http://127.0.0.1:4173`, join, choose a class and start a raid. Enable **Tự đánh thường** or send `!auto on` for server basic attacks; use skills manually. The host starts each raid. [Operator guide](OPERATOR_GUIDE.md) · [OBS setup](OBS_SETUP.md)

MOCK works without an upstream account. LIVE configuration and keys remain local. [LIVE setup and open gates](LIVE_SETUP.md)

## Included since RC4

- Rules v11 rotate the first auto attacker by ranked stage without reordering the displayed roster or changing positive-contribution rewards. New replays use v11; v1–v10 retain their original rules. A historical v10 full-state digest and eight 322-raid synthetic comparisons protect this change. [Ordering correction and limits](reports/AUTO_ORDER_FINDING.md).
- The desktop operator workspace fits its viewport with independently scrolling controls and reachable emergency actions. Layout QA covers seven sizes plus portrait, real wraith/victory states and long logs/names. [P6 evidence](reports/PHASE_REPORT_P6.md).
- The actual GLB has a reproducible measured manifest and detailed prototype proportions, material, articulation, arena and camera specification. Rebirth tests cover every class and all five cycles. [Art specification](ART_SPECIFICATION.md) · [Rebirth worksheet](reports/REBIRTH_BALANCE.md).
- A detailed 17-entity database design plus seven supporting tables and scratch SQL constraint tests is included. Runtime storage remains schema v2; no proposed normalized migration is activated. [Database design](DATABASE_DESIGN.md).

Existing character progress, pets, equipment, stage unlock and older replay files remain supported. Before upgrading, make a [SQLite online backup](RECOVERY.md). Rejoin after restart. `!auto off` disables a restored auto preference.

## Verification scope

The 36-test suite covers combat, gifts, adapter fixtures, persistence, recovery, roster turnover, shutdown, actual GLB clips, all-cycle rebirth, schema-design constraints, auto opportunity rotation and old/new replay. Production browser smoke separately covers portrait HUD, GLB/procedural/no-WebGL paths, checkbox recovery, replay, backup/restore and reconnect. The action harness checks all six classes/three pets with a manual clock; it is not an FPS test. The asset inspector and CI reject a stale manifest.

Earlier evidence includes a 600.166-second combined OBS/server-auto/HUD/audio recording at `46cf80d`, before the v11 ordering correction. Its 57 OBS samples reported approximately 30 FPS with zero render/encode skips; this does not measure unique Three.js presentations. At v11 source `3fa4190`, a separate 60-second server test exercised 64 auto players and eight consumers. Native-clock scene/resource measurements use another isolated fixture. [P7 measurements and exact limitations](reports/PHASE_REPORT_P7.md).

This candidate does not establish 8–12-hour stability, browser/GPU allocation bytes, long combined endurance, full manual/co-op balance, upstream TikTok streaming or Leader art/gameplay approval. The art remains an original Codex prototype pending Gemini review. Review [the full MVP audit](reports/MVP_ACCEPTANCE.md) and [Leader handoff](LEADER_REVIEW_REQUEST.md). Antigravity and Gemini reports remain NOT_RECEIVED; Leader review remains pending. MOCK needs no account or paid connector.
