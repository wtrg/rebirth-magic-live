# P10 participation-rate prototype QA

Windows MOCK opt-in uses `REBIRTH_RANKED_SCHEDULER=ranked-participation-v1`.
PR #61 remains the v13 debt baseline.

## Controlled policy comparison

Run `node scripts/p10-ranked-policy-study.mjs` for JSONL with aggregate and per-ID
results. The simulator gives every roster member an eligible slot and invokes the
runtime v14 comparator. It isolates ordering from ingress, combat and storage.

At 36 raids and one slot, v14 leaves 0, 2 and 0 IDs without service in the
32, 24/32 and 24/24/32 patterns, respectively. The 24/32 pattern fails the
first-service gate. The 24 always-present IDs become eligible one raid before
the guests. With oldest first eligibility taking precedence, those 24 IDs get
the first 24 slots. Only six full-roster raids remain before raid 36, leaving
two of the eight guests unserved.

At 96 raids and six slots, v14 has no unserved IDs and a maximum wait of five
eligible raids in every pattern. The maximum individual service-rate spread is
0, 1.04 and 1.04 percentage points, respectively. These are simulated rates.

For comparison, current debt leaves 0, 8 and 16 IDs unserved at 36 raids and
one slot. The cap-4 comparator leaves zero in each roster. At 96 raids and six
slots the largest eligible waits are 21, 37 and 16 for current debt and five for
all three cap-4 patterns. Individual rate spread is 8.33, 23.96 and 15.10
percentage points for current debt, and 2.08, 12.50 and 6.25 for cap-4.

## HTTP and SQLite

Run `node scripts/p10-ranked-matrix.mjs --participation` for the one-hit matrix.
The harness compares replay to the final WebSocket combat state and the persisted
ledger to replay. Per-ID output separates offered manual commands, manual intents
recorded in a window, and settled eligible and served raid counts. The replay
observer also counts executed slots and slots denied by a terminal attack. These
are window-level counts and can include the same ID in both categories within
one raid. The difference
between offered and recorded commands can include requests arriving after a raid
ends. It does not measure packet latency directly.

The Windows run at runtime commit `7fd693c` completed all 324 raids with
replay/WebSocket/SQLite parity in all nine cells. For spreads of 60, 180 and
350 ms, unserved eligible IDs were 0/0/0 (32), 2/2/2 (24/32) and 0/0/0
(24/24/32). One manual request in the 32-player, 350 ms cell did not appear
in a window. All other offered manual requests appeared in a window.

The initial fixed-36-raid first-service gate failed. On 2026-11-07, the Leader
retained the ordering policy and replaced that gate with one based on available
capacity. For each never-served eligible ID, the updated harness lists each
eligible terminal window, the slots that executed before the terminal hit,
which were consumed by higher-priority first-service candidates, and the
residual capacity. An unserved ID with residual capacity fails the harness.
Unserved IDs with exhausted capacity remain visible in the raw data.
The 324-raid capacity audit passed parity and found no missed residual
slots. In each 24/32 cell, `mock:matrix25` and `mock:matrix30` were
eligible in 18 raids and remained unserved. Every eligible terminal window
for each of those IDs exhausted its capacity on a higher-priority first
service. The other six cells had no unserved eligible IDs. This audit uses
actual window capacity under the chosen policy.

Following independent review, v14 replay rejects ranked actions outside its
window protocol. SQLite writes now check both opening sequence counters inside
the transaction. Regression tests cover an injected ranked auto step, an extra
window after victory, and stale settlement-only writes.

The guarded repeat at `aa1da98` plus the replay observer passed parity in all
nine one-hit cells with the same unserved counts. At 350 ms, 4, 1 and 2 offered
manual commands respectively were absent from the recorded windows. At 60 and
180 ms all offered manual commands were recorded.

An additional 54 mixed auto/manual HTTP raids used all six classes at level 30.
All nine cells passed parity. The runs had 6–14 contributors per raid, and all
32 IDs contributed across each six-raid cell. This workload had variable
capacity. The separate fixed-capacity HTTP run is described below.

Raw synthetic results are available for the [324-raid repeat](evidence/p10-v14-http-324.jsonl),
[54 mixed raids](evidence/p10-v14-http-mixed-54.jsonl), and
[controlled three-policy comparison](evidence/p10-v14-policy-study.jsonl).
The [capacity audit](evidence/p10-v14-capacity-324.jsonl) includes window-level
evidence for both unserved IDs at every spread.

A clean detached checkout at exactly
`aa1da98aa4e40b06ab54b4daf2d6a0bb74a3dbad` independently reran all 324
raids using that commit's original harness. All nine cells passed parity.
Unserved counts matched the guarded repeat. At 350 ms, 1, 1 and 7 manual
commands respectively were absent from the replay windows; at 60 and
180 ms every offered manual command was recorded.
[Exact-checkout JSONL](evidence/p10-v14-aa1da98-http-324.jsonl)

## Fixed-capacity HTTP fixture

Run `node scripts/p10-ranked-matrix.mjs --participation --six-slots`.
This workload alternates 24- and 32-player rosters, uses all six classes
and alternates the manual send order with a 180 ms spread. Half the IDs
use server auto, and the others send a basic attack over HTTP.

Before each join, the harness calibrates only synthetic SQLite player levels
so that five basic hits cannot kill the boss and six can. The server uses
the normal boss HP, phase progression, combat, scheduler and settlement.
The harness requires exactly six distinct executed slots and one committed
terminal window per raid, plus wraith spawns from stage three onward.
The fixture measures fairness under a controlled opportunity budget. Its
synthetic player levels are outside ordinary progression and it does not
measure the balance of different attack skills.

The 96-raid Windows run against runtime `54bdec0` produced 576 distinct
per-raid executions and passed replay/WebSocket/SQLite parity. Every ID was
eligible in every roster appearance (96 for regulars, 48 for guests), and all
offered manual attacks were admitted. Individual service rates ranged from
20.83% to 21.88%, a 1.04 percentage-point spread. The longest wait was five
consecutive eligible raids. The replay eligibility and rate gates were
checked against the captured per-ID results and added to the harness.

[Raw 96-raid six-slot HTTP evidence](evidence/p10-v14-http-six-96.jsonl)
