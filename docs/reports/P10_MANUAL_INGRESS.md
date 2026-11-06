# P10 manual ingress fairness evidence

The ranked raid can end while a fixed first wave of manual commands is still being processed. Rewards require an actual contribution. Under repeated synthetic fixed arrivals, this can consistently exclude profiles with the same starting stats. Issue #51 tracks the product decision.

Run these drivers from the repository root with the pinned Node version.

    node scripts/p10-fast-kill-http.mjs
    node scripts/p10-opportunity-window.ts
    node scripts/p10-jitter-auto.ts

The HTTP driver starts a separate loopback MOCK server on port 4217 and uses two temporary synthetic SQLite databases. It compares twelve raids per order, checks the final WebSocket snapshot against replay v11 and reads persisted rewards after graceful shutdown. In each direction, the first six of 32 senders earned twelve wins, the seventh earned four and the other 25 earned none. The roster order remained fixed.

The pure simulations use 100 raids each. In the identical-profile scenario, FIFO left 24 players with zero wins. Stage rotation with all 32 events in one window produced 26–33 wins per profile and zero exclusions. Splitting the same arrivals across two windows still excluded 16 profiles. In the six-class simulation, 60 ms arrival spread with manual-first ordering produced 27–36 wins, while auto-first produced 11–100. At 180 ms spread, manual-first still excluded 14 profiles and auto-first excluded seven.

These scripts measure synthetic arrivals. They do not establish actual TikTok command timing or change production scheduling, replay semantics or the reward formula.
