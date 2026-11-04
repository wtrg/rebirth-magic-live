# RE:BIRTH · Master Plan

Budget 0 VND. Establish a playable Windows MOCK raid before expanding content or enabling LIVE. Leader reviews product changes. Codex verifies phase gates and records evidence in docs/reports.

| Phase | Intended owners | Dependency | Exit evidence |
| --- | --- | --- | --- |
| P0 Foundation | Codex, Antigravity | Windows Node 24 and Git | CI, documented setup, clean build |
| P1 Scene | Gemini, Antigravity | P0 | Rendered arena, player, boss and 9:16 screenshot |
| P2 Combat | Antigravity, Qoder | P0 | Server boss raid victory and defeat, cooldown tests |
| P3 Progression | Qoder, Antigravity | P2 | Restart restores XP, pet unlock data and scores |
| P4 Pets | Gemini, Qoder, Antigravity | P1, P3 | Earn, equip and render three pets |
| P5 Interaction | Antigravity, Qoder | P2 | MOCK chat and gifts, operator, OBS and LIVE proof when available |
| P6 Polish | Gemini, Antigravity | P1–P5 | Review portrait layout, animation, audio and visual assets |
| P7 Readiness | Codex | P0–P6 | Windows, OBS, performance, security, backup and recovery evidence |
| P8 Expansion | Leader assigns | MVP | Separate scope and phase gates |

Vertical slice includes a shared arena, boss AI, six class data sets, deterministic rewards, local persistence and MOCK ingress. Asset production, LIVE permission and final performance acceptance have separate gates.

## Risks

- LIVE transport and gift IDs depend on a verified session and allowed provider. Keep MOCK playable.
- Integrated GPU throughput varies with output size and OBS encoder. Record hardware, draw budget and frame timing.
- External agents can fail to connect. Keep file ownership explicit and use handoffs in AGENT_PROTOCOL.md.
- Real player names and event IDs must stay in local storage. Publish only source and synthetic QA evidence.
- Ranking needs a Leader decision on whether gift-assisted progression may affect subsequent ranked raids.
