# P10 ranked scheduler HTTP matrix

Run `node scripts/p10-ranked-matrix.mjs` from the repository root. The Windows MOCK run used commit `0bac8bc`, 36 raids per cell, 32 synthetic identities, and three parallel local servers per roster pattern. Even-numbered profiles opted into auto; odd-numbered profiles sent manual ultimates over the specified arrival spread. Submission order alternated every raid. All profiles were Fire Mages at synthetic level 1100 so the first action ended each raid. The driver restored profiles through real HTTP joins and verified the WebSocket snapshot against replay v13 and persisted stage, wins and debt against SQLite.

| Roster | Manual spread | Sent / in windows | Profiles without an action |
| --- | ---: | ---: | ---: |
| 32 | 60 ms | 576 / 576 | 0 |
| 32 | 180 ms | 576 / 576 | 0 |
| 32 | 350 ms | 576 / 572 | 1 |
| 24/32 | 60 ms | 504 / 504 | 8 |
| 24/32 | 180 ms | 504 / 504 | 8 |
| 24/32 | 350 ms | 504 / 502 | 8 |
| 24/24/32 | 60 ms | 480 / 480 | 16 |
| 24/24/32 | 180 ms | 480 / 480 | 16 |
| 24/24/32 | 350 ms | 480 / 475 | 16 |

[Raw synthetic results](evidence/p10-ranked-matrix.jsonl)

Replay and SQLite matched in all nine cells. The 350 ms spread is measured from first to last scheduled manual send. The server window can open earlier for auto, and network and harness scheduling add delay. The latest admitted intent in those cells was 396–398 ms after window opening. Sent commands absent from a resolved window are counted separately from commands scheduled but denied by the killing action.

The one-hit workload exposes a limitation in the approved +1/-1 debt rule. Profiles present more often can build debt faster than rotating guests, and several rotating profiles had no executed action in this sample. The matrix therefore does not support activating v13 as the default. A follow-up should compare attendance-adjusted rules against this same fixture and repeat the HTTP matrix with multiple class mixes and more than one successful action per raid. This run is not a measurement of actual TikTok arrivals or presentation latency.

## Six-class multi-action run

Set `QA_MATRIX_RAIDS=6` and run `node scripts/p10-ranked-matrix.mjs --mixed`. The Windows MOCK run used runtime `a1b4348`. Each class appears in both manual and auto profiles, seeded at level 30. Across 54 raids, six to fourteen players contributed per victory. Replay v13, SQLite debt, wins and stage matched in every cell.

Across the three spreads, all profiles earned at least one win in the fixed and 24/24/32 cohorts. Six profiles earned none in each 24/32 cohort. At 350 ms, one manual send in each rotating pattern was absent from resolved windows. This shorter sample measures per-profile contribution and rewards, and cannot establish long-run fairness or actual LIVE timing.

[Raw mixed-class results](evidence/p10-ranked-mixed.jsonl)

## Manual window wait sample

A repeat of the 54-raid six-class matrix measured the monotonic gap from each recorded manual intent's ingress timestamp to actual window processing. The server now records the processing timestamp even when a late packet triggers closure. Across the nine cells, median wait was 201–374 ms, p95 was 369–417 ms and the largest observed wait was 438 ms. The 50 ms scheduler tick can process a window after its fixed admission deadline. These timings cover only intents included in a resolved window, including some whose actions never execute, and exclude upstream TikTok and browser display delay. Replay and SQLite matched in every cell.

[Raw latency sample](evidence/p10-ranked-latency.jsonl)
