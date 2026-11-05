# RE:BIRTH 0.2.0-rc.3 · MOCK release candidate

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

- Arena and first raid: [P0](reports/PHASE_REPORT_P0.md) and [P1](reports/PHASE_REPORT_P1.md). Procedural 3D renders on Intel UHD Graphics. RC3 includes reproducible GLB actors with shoulder and hip pivots, HP-driven recoil, eased collapse and animation pause. Procedural fallback remains available. Detailed action-by-action art review remains open.
- Combat and progression: server-authoritative phases, six class signatures, critical cadence, stage-3 wraith targets and Fire splash, victory and defeat, EXP, stage progression, rebirth, ranked loot, achievements and SQLite recovery. See [combat tests](../tests/combat.test.ts), [recovery tests](../tests/recovery.test.ts) and [browser smoke](../scripts/smoke.mjs).
- Pets: three earned pets, individual skills, upgrading and persistence. See [P4](reports/PHASE_REPORT_P4.md).
- Interaction: separate ranked and gift-enabled practice modes, offline MOCK ingress and deterministic replay. The TikTok adapter has local WebSocket fixture coverage. A local fixture verifies player renames without losing progress. Actual room, gift IDs and platform permissions remain open. See [LIVE setup](LIVE_SETUP.md).
- OBS and server capacity: local 1080×1920 OBS video and audio recordings, a ten-minute combined capture with audio and a separate ten-minute server soak. See [P7](reports/PHASE_REPORT_P7.md). Combined long-run stability and live broadcast remain open.

Technical handoff is in [Leader review](LEADER_REVIEW_REQUEST.md). Leader approval remains pending. This RC does not establish full MVP acceptance or production streaming readiness.

[Operator runbook](OPERATOR_GUIDE.md) covers preflight, ranked versus practice, emergency pause and recovery. Existing SQLite saves and older replay versions remain supported.

## RC3 reliability changes

The raid end panel shows outcome, rewards and contributor damage. The operator sees skill cooldown and mana readiness. Controlled shutdown drains accepted pending events. HTTP preserves multibyte Vietnamese names across chunks and enforces the input limit by bytes. Windows regression coverage totals 16 tests with an end-to-end browser smoke.

The full [MVP evidence audit](reports/MVP_ACCEPTANCE.md) lists remaining gates. The owner confirmed a real TikTok LIVE test session is currently unavailable.


## Post-RC3 main follow-ups

Main additionally separates the session roster from archived profiles and preserves global ranking. Animation fixes restart consecutive boss impacts, keep idle looping and preserve temporary-pet expiry across pause, including newly opened clients. The 19-test suite includes actual GLB mixer and HTTP pause-metadata regressions. These follow-ups are not in the published RC3 tag. The combined ten-minute recording measured main at `7b225ea`, before the animation fixes. See P7 for exact scope and limitations.
