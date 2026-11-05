# Technical Architecture

The Vite client consumes WebSocket snapshots from a single localhost Node 24 process. It renders procedural Three.js meshes, accessible DOM HUD and operator controls. Combat and rewards run in the server. The overlay hides operator controls.

The normalized ingress validates bounded input, checks same origin, applies per-user throttling, and pushes complete events into a bounded FIFO. SQLite stores player profiles and event receipts in the same transaction. Retrying an event ID during the 24-hour receipt window cannot award duplicate progression. A queued event returns HTTP 202 before processing. The active raid is ephemeral and starts idle on reboot at the last unlocked stage. A viewer-event ranked victory commits stage unlock, player rewards and its event receipt together. Automatic victories commit rewards and stage together without an external event receipt.

The first migration stores players and event receipts. Schema v2 adds a singleton world progression row. The [detailed relational design](DATABASE_DESIGN.md) covers all 17 required entities, seven supporting tables, keys/constraints and a v2 field mapping with cutover/rollback gates. Its SQL prototype is validated only in scratch databases; runtime remains v2 and no normalized-store importer is deployed. Content currently resides in versioned TypeScript data. An opt-in MOCK trace captures the initial snapshot and committed simulation operations, including ticks and accepted admin actions. Replay runs in memory using their original timestamps. LIVE raw payloads are not recorded.

LiveAdapter supplies an abortable source boundary, normalization and retry with bounded backoff. The optional Euler Stream WebSocket source decodes v1 bundles and supplies commands and completed mapped gifts through the same queue. LIVE requires an authorized room and local provider key. Default MOCK makes no network connection. The two modes use separate databases by default. See LIVE_SETUP.md for configuration and verification status.

Renderer shares geometry/materials, caps visible players, limits rendering to roughly 30 updates per second in low quality, and reduces internal resolution. WebGL 2 absence leaves the HUD usable. The game loads a local GLB for actors and falls back to shared procedural templates. See [model assets](MODEL_ASSETS.md). Production GLB assets should be exported from Blender with scale in meters and animation clips named Idle, Run, Attack, Hit and Defeat.

References
- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer)
- [Node 24 SQLite](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)
- [TikTok developer webhook event catalog](https://developers.tiktok.com/docs/en/webhooks-events)


Persistent profiles are distinct from the process-local active raid roster. A new server process starts with an empty roster. An accepted join retrieves the saved profile by stable ID and resets transient combat fields. Leave and clear-roster remove active members without deleting profiles. The leaderboard queries persistent scores. MOCK replay v9 records the restore/leader context needed to replay those database-dependent commands offline.


Opt-in auto battle executes in the server scheduler after the boss turn and the current FIFO command batch. It emits basic attacks through the same combat function and cooldowns as viewer commands. Each auto batch commits profiles and any stage unlock atomically before publishing the new state. It does not create external event receipts. Replay v11 starts each batch at roster index `(stage - 1) % roster.length`, then wraps without reordering the roster. Ranked victories advance the stage and rotate first opportunity; defeat retries and repeated practice at the same stage retain that stage's start. No cursor or database migration is introduced. Replay v10 retains fixed-order auto, while v1–v9 do not run auto batches. The server and new trace writer share `currentRulesVersion`. Closing an operator/overlay client does not stop simulation. Host pause and roster membership govern eligibility.
