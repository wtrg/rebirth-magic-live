# QA Plan

Gate 1: npm run typecheck, npm run lint, npm run build.
Gate 2: npm test and node scripts/smoke.mjs. Exercise boss phase boundaries, victory, defeat, cooldown, progression, pet and gift ranking.
Gate 3: Capture the portrait overlay in a browser, verify canvas and result HUD. Open OBS Browser Source on the target machine as a separate check.
Gate 4: Validate wrong origin and malformed requests, reject duplicate gift application, scan dependencies and staged content.
Gate 5: Check pause, reconnect and persisted progress after restart. Check backup and restore before an actual stream.
Gate 6: Record frame timings and identify rendering context. Perform an OBS load test and a separate long soak before claiming stream readiness.


## Server load and overload

Run `node scripts/load.mjs` for a 60-second MOCK measurement. Set `QA_LOAD_SECONDS` to another duration (15–43,200 seconds) or `QA_LOAD_PORT` to a free loopback port. The test starts its own child and temporary SQLite database. It checks one-viewer throttling and a burst of 256 distinct viewers, then drives 64 players in waves of up to four per second while eight WebSocket consumers observe ranked progression. The report includes end-to-end local HTTP request timing, sampled queue depth and child-process RSS and heap usage.

The load harness does not render a game client or run OBS. Use a separate capture test for render and encoding performance. Keep background workload comparable when comparing runs.
