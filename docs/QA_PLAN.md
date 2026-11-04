# QA Plan

Gate 1: npm run typecheck, npm run lint, npm run build.
Gate 2: npm test and node scripts/smoke.mjs. Exercise boss phase boundaries, victory, defeat, cooldown, progression, pet and gift ranking.
Gate 3: Capture the portrait overlay in a browser, verify canvas and result HUD. Open OBS Browser Source on the target machine as a separate check.
Gate 4: Validate wrong origin and malformed requests, reject duplicate gift application, scan dependencies and staged content.
Gate 5: Check pause, reconnect and persisted progress after restart. Check backup and restore before an actual stream.
Gate 6: Record frame timings and identify rendering context. Perform an OBS load test and a separate long soak before claiming stream readiness.
