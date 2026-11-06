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
