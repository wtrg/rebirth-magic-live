# RE:BIRTH 0.2.0-rc.4 · Windows MOCK candidate

This prerelease packages the local Windows Boss Raid. It includes an optional TikTok transport; actual room events and gifts remain unverified because no authorized test LIVE session is available.

## Install this candidate

```powershell
git clone --branch v0.2.0-rc.4 https://github.com/wtrg/rebirth-magic-live.git
cd rebirth-magic-live
npm ci
npm run build
npm start
```

Use Node 24 and a browser with WebGL 2. Open `http://127.0.0.1:4173`, join, choose a class and start a raid. Enable **Tự đánh thường** or send `!auto on` for server basic attacks; use skills manually. The host starts each raid. [Operator guide](OPERATOR_GUIDE.md) · [OBS setup](OBS_SETUP.md)

MOCK works without an upstream account. LIVE configuration and keys remain local. [LIVE setup and open gates](LIVE_SETUP.md)

## Included since RC3

- Session membership is separate from saved profiles. Restart starts an empty roster; join restores progression. Leave/host clear free slots while global ranking retains archived players.
- Boss Hit/Attack clips restart on new impacts, Idle loops continuously, and temporary-pet expiry stays correct while paused, including newly connected clients.
- Six classes and three pets have a repeatable rendering regression through both GLB and forced-404 fallback, with ten captured action frames. [P6 evidence](reports/PHASE_REPORT_P6.md#six-class-and-three-pet-action-verification)
- Opt-in `!auto on/off` basic battle executes in the server, shares the manual attack cooldown and persists the preference. Skills remain manual. Replay v10 captures automatic batches while retaining versions 1–9. [P2 evidence](reports/PHASE_REPORT_P2.md#server-side-idle-battle)

Existing character progress, pets, equipment, stage unlock and older replay files remain supported. Before upgrading, make a [SQLite online backup](RECOVERY.md). Rejoin after restart. `!auto off` disables a restored auto preference.

## Verification scope

The 26-test suite covers combat, gifts, adapter fixtures, persistence, recovery, roster turnover, shutdown, actual GLB clips and browserless auto progression. Browser smoke separately covers the production portrait HUD, manual combat, checkbox rejection recovery, replay, backup/restore and reconnect. The animation harness tests scene responses using a manual clock rather than measuring FPS.

Earlier evidence includes a ten-minute combined OBS H.264/AAC recording at source `7b225ea`, before the animation fixes and server auto feature, plus a separate ten-minute server soak. A 60-second server-only auto test used 64 players and eight consumers. [P7 measurements and exact limitations](reports/PHASE_REPORT_P7.md)

This candidate does not establish 8–12-hour stability, browser/GPU memory behavior, combined OBS auto-battle endurance, upstream TikTok streaming or Leader art/gameplay approval. Review [the full MVP audit](reports/MVP_ACCEPTANCE.md) and [Leader handoff](LEADER_REVIEW_REQUEST.md) for the remaining requirements. Antigravity and Gemini reports remain NOT_RECEIVED; Leader review remains pending.
