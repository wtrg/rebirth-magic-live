# P10 ranked opportunity policy study

Run `node scripts/p10-ranked-policy-study.mjs`. The simulation uses the HTTP matrix roster patterns, stable IDs and SHA-256 stage tie break. Each listed participant is eligible, and the first one or six slots execute. This isolates ordering from arrival timing, class effects and combat. The current comparator reproduces zero-action counts of 0, 8 and 16 for the three 36-raid, one-slot cohorts where all intended commands reached a window.

| Policy | Zero actions in 36 one-slot raids (32, 24/32, 24/24/32) | Worst consecutive eligible misses in 96 six-slot raids (same order) |
| --- | --- | --- |
| Current debt +1/-1, cap 32 | 0, 8, 16 | 21, 37, 16 |
| Debt priority capped at 4, then oldest service | 0, 0, 0 | 5, 5, 5 |
| Smoothed lifetime service rate | 0, 2, 0 | 5, 5, 5 |
| Oldest service, then eligible wait | 0, 2, 0 | 5, 5, 5 |

[Raw results](evidence/p10-ranked-policy-study.jsonl) include per-profile action counts and service rates. The rate comparator uses (executions + 1) / (eligible raids + 4). On the 96-raid 24/32 six-slot sample, service rates ranged from 21–22% with that comparator, 19–31% with capped debt and 4–28% with current debt. This illustrates a choice between first-action coverage in a short run and proportional service among players who attend at different rates.

Request Leader approval to prototype capping only the ordering score at 4, retaining the persisted debt range and using oldest actual service to break ties before the existing hash. This would require durable last-served state, a separate replay version or policy identifier, and explicit rules for first-time identities and repeated attempts of the same ranked stage. Using a committed settlement sequence instead of a stage number would distinguish those attempts. Before any default change, run a new HTTP matrix with late arrivals, all six classes and multi-action raids. The simulation contains no timing or combat assertions.
