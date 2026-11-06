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

First-service acceptance remains open. The six-slot simulation and this
one-hit HTTP run do not cover a six-class, multi-phase HTTP workload.
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
capacity. The fixed six-slot 96-raid results above remain simulation evidence.

Raw synthetic results are available for the [324-raid repeat](evidence/p10-v14-http-324.jsonl),
[54 mixed raids](evidence/p10-v14-http-mixed-54.jsonl), and
[controlled three-policy comparison](evidence/p10-v14-policy-study.jsonl).
