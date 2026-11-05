# QA Plan

Auto ordering: `node --test tests/auto-order.test.ts tests/auto-legacy.test.ts tests/auto.test.ts` checks full 32-stage opportunity cycles, forward/reversed rosters, eligibility/cooldowns, one-time rewards and versioned replay. The immutable v10 fixture was captured from commit `054e544` and compares the complete resulting-state SHA-256 after three raids, a manual skill and pause/resume. `node scripts/auto-fairness-qa.ts` separately compares eight synthetic 322-raid careers (v10/v11, forward/reversed, identical Fire/six-class), allowing earned growth but selecting no pets/equipment and sending no manual attacks. This is a game-rule comparison, not a performance benchmark or proof of full class balance.

Combined current-source OBS/auto/HUD/audio QA uses `node scripts/obs-soak.mjs` and `node scripts/analyze-obs.mjs PATH_TO_RESULTS`. See [isolated OBS QA](OBS_QA.md) for the disposable portable configuration, workload, counter boundaries, cleanup and analysis. This runs separately from the test suite and requires local OBS/FFmpeg; CI does not claim to exercise recording hardware.

Gate 1: npm run typecheck, npm run lint, npm run build.
Gate 2: npm test and node scripts/smoke.mjs. Exercise boss phase boundaries, victory, defeat, cooldown, progression, pet and gift ranking.
Gate 3: Capture the portrait overlay in a browser, verify canvas and result HUD. Open OBS Browser Source on the target machine as a separate check.
Gate 4: Validate wrong origin and malformed requests, reject duplicate gift application, scan dependencies and staged content.
Gate 5: Check pause, reconnect and persisted progress after restart. Check backup and restore before an actual stream.
Gate 6: Record frame timings and identify rendering context. Perform an OBS load test and a separate long soak before claiming stream readiness.


## Server load and overload

Run `node scripts/load.mjs` for a 60-second MOCK measurement. Set `QA_LOAD_SECONDS` to another duration (15–43,200 seconds) or `QA_LOAD_PORT` to a free loopback port. The test starts its own child and temporary SQLite database. It checks one-viewer throttling and a burst of 256 distinct viewers, then drives 64 players in waves of up to four per second while eight WebSocket consumers observe ranked progression. The report includes end-to-end local HTTP request timing, sampled queue depth and child-process RSS and heap usage.

The load harness does not render a game client or run OBS. Use a separate capture test for render and encoding performance. Keep background workload comparable when comparing runs.


## Class and pet rendering regression

Run `node scripts/animation-qa.mjs` with installed Chrome (or a compatible Playwright channel selected by `QA_BROWSER`) and free loopback port 4193. It starts its own Vite development server and imports the production arena/GLB loader into a browser-only fixture. No game server or database is opened. Output goes to ignored `test-results/animation/`; the browser and Vite server close in finally cleanup.

The fixture controls its own animation clock and supplies six synthetic player snapshots with three earned pet selections. It checks real rendered class/pet colors, GLB root identity, tagged paws/wings, moving hip joints during the attack approach, weapon motion, HP recoil, collapse, revival, pause pixel stability and temporary-pet expiry. It repeats after a forced GLB 404. Screenshots and real transforms support manual review. Projected bounds check viewport intersection, not occlusion. The fixture isolates scene rendering from combat simulation, excludes the production HUD, and cannot measure FPS. Run the normal browser smoke separately for the production application and combat path.


Set `QA_LOAD_AUTO=1` before `node scripts/load.mjs` to exercise 64 server-driven auto attackers and eight WebSocket consumers. The harness sends no attack commands during its measured interval; only the host starts the next raid. Its event-request latency is reported as null in this mode because no measured attack ingress occurs. This is a server-only check. `tests/auto.test.ts` additionally verifies a browserless raid, pause/resume, deterministic v10 replay and atomic stage/reward persistence.

## Relational design prototype

`node --test tests/schema-design.test.ts` loads `docs/schema/normalized.sql` into new in-memory databases. It checks all 17 required entities, actual legacy fallback-name preservation, foreign keys, owned pets, item slots, one active raid, contributing ranked reward eligibility, immutable raid mode, repeated rewards/gifts, append-only ledgers and multibyte JSON byte limits. The design/mapping is documented in [DATABASE_DESIGN](DATABASE_DESIGN.md). These checks do not implement or validate a production importer; deployed storage remains schema v2.

## Native client render measurement

Run `node scripts/render-benchmark.mjs` with Chrome (or `QA_BROWSER=chromium`) and free loopback port 4196. Set `QA_RENDER_SECONDS` to 15–600 seconds per mode; default is 60. It imports the production arena into the isolated scene fixture using native Date/RAF, supplies 64 synthetic snapshot entries, renders the low-quality cap of eight actors, and replaces roster IDs every third 650 ms update while driving attack/phase/effect poses. Both GLB and forced-404 fallback run separately. Keep fixture/source files unchanged during measurement: Vite reload invalidates the sample.

Scene onAfterRender timestamps measure CPU render submissions, not GPU completion or presented/display FPS. The report includes approximately one renderer resource-count sample per second and one CDP heap sample per five seconds, with separate forced-GC retained-heap endpoints outside the measured interval. Geometry/texture/program counts are not GPU-memory bytes. Frame history is capped at 40,000 entries. No HUD, server, database, OBS or LIVE is included. Output stays in `test-results/render-benchmark/` until reviewed. Use combined OBS and server tests for their separate scopes.

The production smoke now also returns null from every WebGL context request in an isolated page. It verifies the fallback notice, absent canvas, live party state and working emergency pause/resume, and captures `webgl-unavailable.png`. This covers unavailable context creation, not context-loss recovery after a successful render.

## Operator workspace layout

Run `npm run build` then `node scripts/layout-qa.mjs` with port 4197 free. The harness creates its own temporary schema-v2 database, seeds six synthetic class/pet profiles and exercises real stage-3 wraiths and a victory. It checks 1280×900, 1366×768, 1024×768, 1000×700, 1280×640, 900×600 and 390×844, plus a 540×960 OBS overlay.

Desktop checks cover stage/footer bounds, independent console scrolling, all enabled visible operator controls being unoccluded when focused, and persistent emergency controls. Boundary text fixtures add three wrapped logs and valid 80-character fallback-name contributor labels; keyboard End must scroll those regions while result bounds stay inside the arena. Narrow/short pages must still expose controls/settings through normal page scrolling, with no horizontal overflow. `QA_LAYOUT_AUDIT=1` records baseline bounds without applying the fixed-layout assertions; do not interpret an audit capture as a passing layout regression. `QA_LAYOUT_OUTPUT` selects the output directory, otherwise `test-results/layout` is used. The browser/server and temporary database are closed/removed in cleanup.
