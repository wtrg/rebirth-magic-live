# RE:BIRTH 0.2.0-rc.1 · MOCK release candidate

Scope is the Windows local MOCK build. The optional TikTok transport is included for testing with an authorized room.

## Run from a fresh clone

```powershell
git clone https://github.com/wtrg/rebirth-magic-live.git
cd rebirth-magic-live
npm ci
npm run build
npm start
```

Open `http://127.0.0.1:4173`. Use [README](../README.md) for the first raid, [OBS setup](OBS_SETUP.md) for the portrait source, and [recovery](RECOVERY.md) for backups and schema upgrades. MOCK uses no upstream API or account.

## Evidence by area

- Arena and first raid: [P0](reports/PHASE_REPORT_P0.md) and [P1](reports/PHASE_REPORT_P1.md). Procedural 3D renders on Intel UHD Graphics. Production GLB and full animation/audio polish remain open.
- Combat and progression: server-authoritative phases, six classes, victory and defeat, EXP, stage progression, rebirth, ranked loot and SQLite recovery. See [combat tests](../tests/combat.test.ts), [recovery tests](../tests/recovery.test.ts) and [browser smoke](../scripts/smoke.mjs).
- Pets: three earned pets, individual skills, upgrading and persistence. See [P4](reports/PHASE_REPORT_P4.md).
- Interaction: separate ranked and gift-enabled practice modes, offline MOCK ingress and deterministic replay. The TikTok adapter has local WebSocket fixture coverage. Actual room, gift IDs and platform permissions remain open. See [LIVE setup](LIVE_SETUP.md).
- OBS and server capacity: local 1080×1920 OBS recording and two 60-second server stress tests. See [P7](reports/PHASE_REPORT_P7.md). Combined long-run stability and live broadcast remain open.

Technical handoff is in [Leader review](LEADER_REVIEW_REQUEST.md). Leader approval remains pending. This RC does not establish full MVP acceptance or production streaming readiness.
