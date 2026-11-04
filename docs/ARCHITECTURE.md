# Technical Architecture

The Vite client consumes WebSocket snapshots from a single localhost Node 24 process. It renders procedural Three.js meshes, accessible DOM HUD and operator controls. Combat and rewards run in the server. The overlay hides operator controls.

The normalized ingress validates bounded input, checks same origin, applies per-user throttling, and pushes complete events into a bounded FIFO. SQLite stores player profiles and event receipts in the same transaction. Retrying an event ID during the 24-hour receipt window cannot award duplicate progression. A queued event returns HTTP 202 before processing. The active raid is ephemeral and starts idle on reboot at the last unlocked stage. Ranked victory commits stage unlock, player rewards and the event receipt together.

The first migration stores players and event receipts. Schema v2 adds a singleton world progression row. Target relational design for later migrations includes characters, classes, character_stats, skills, inventory, pets, player_pets, stages, bosses, raid_sessions, combat_events, rebirth_history, achievements, leaderboard_seasons, gift_events and settings. Content currently resides in versioned TypeScript data. An opt-in MOCK trace captures the initial snapshot and committed simulation operations, including ticks and accepted admin actions. Replay runs in memory using their original timestamps. LIVE raw payloads are not recorded.

LiveAdapter supplies an abortable source boundary, normalization and retry with bounded backoff. The optional Euler Stream WebSocket source decodes v1 bundles and supplies commands and completed mapped gifts through the same queue. LIVE requires an authorized room and local provider key. Default MOCK makes no network connection. The two modes use separate databases by default. See LIVE_SETUP.md for configuration and verification status.

Renderer shares geometry/materials, caps visible players, limits rendering to roughly 30 updates per second in low quality, and reduces internal resolution. WebGL 2 absence leaves the HUD usable. Procedural 3D serves as the initial asset pipeline. Production GLB assets should be exported from Blender with scale in meters and animation clips named Idle, Run, Attack, Hit and Defeat.

References
- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer)
- [Node 24 SQLite](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)
- [TikTok developer webhook event catalog](https://developers.tiktok.com/docs/en/webhooks-events)
