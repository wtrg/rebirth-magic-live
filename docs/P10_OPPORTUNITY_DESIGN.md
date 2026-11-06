# P10 ranked opportunity scheduling proposal

Status: Leader approved implementation after the amendments recorded here. Applies to ranked raids after v12. [Manual ingress evidence](reports/P10_MANUAL_INGRESS.md) · [Issue #51](https://github.com/wtrg/rebirth-magic-live/issues/51)

## Admission and timing

Keep the existing normalized ingress, event receipts, rate limits and queue caps. A manual combat command that reaches the ranked scheduler becomes one pending intent for that player's stable ID. Keep the first admitted manual intent per ID per window. Extra commands cannot move that slot, add debt or displace another player. Continue applying non-combat commands through their existing server path. Practice retains its existing behavior and never reads or writes ranked debt.

Open the first window on the first eligible ranked action, whether auto or manual. Propose 400 ms for this opening window so the entire 350 ms arrival-spread fixture can compete when the arrivals begin with the first candidate. Propose 60 ms for subsequent windows to limit ongoing command delay. Fix the deadline at open time and define admission as strictly before the deadline. At close, process any due boss action first, then evaluate candidates against the resulting authoritative state. A candidate must still belong to the active raid, be alive, and pass the combat engine's action, target, cooldown and MP checks. Share that eligibility logic with actual execution. Recheck before executing each action because earlier actions may change its validity.

Use a monotonic clock for opening, admission and closing. An intent stamped exactly at the deadline belongs after that window. Keep monotonic offsets in replay inputs, separate from the combat timestamps used for cooldowns and boss actions. Count and report late arrivals in QA.

Build one slot per eligible stable ID from the union of ready auto players and admitted manual intents. An eligible manual intent takes its owner's slot. Otherwise a ready auto attack can fill it. Order slots by the player's persisted opening debt descending. Break ties by a stable hash of ranked stage and stable ID, then ID on hash collision. Execute through the normal combat engine. Both input modes retain existing damage, cooldown, contribution and reward rules.

Track three distinct outcomes. Admitted means the intent entered the window. Eligible means the action passed combat checks when evaluated. Executed means the combat engine actually accepted and applied the action. Only executed actions consume an opportunity, regardless of reward eligibility.

## Debt and storage

Start each ranked raid with a frozen view of debt for ordering. For each player, track whether they executed an eligible combat action during that raid. At settlement, a player who executed at least once receives `max(0, debt - 1)`. A player with no execution and an eligible slot skipped solely because another slot ended the raid receives `min(32, debt + 1)`. All other balances stay unchanged. Apply these rules once per completed ranked raid. Cancelled or abandoned raids do not settle debt. A failed action, duplicate receipt, non-participant, or invalid or late command creates no debt. A valid action can consume an opportunity even if its gameplay outcome does not qualify for a reward.

Persist debt separately by stable player ID in a new SQLite migration, initialized to zero for existing profiles. Commit terminal combat progress, event receipt decisions, debt settlement and stage advancement in one transaction. Publish the snapshot only after commit. Leave pending windows in memory, like the existing ingress queue. A restart discards pending unexecuted intents and preserves committed debt. A pause cancels the window under the existing queue discard policy.

On graceful shutdown, freeze the admission boundary and reject new intents. Drain only already admitted intents once, after applying any boss tick due at that boundary. If the raid ends, commit settlement and stage advancement atomically with combat and receipts. If the raid remains active, persist executed combat progress and receipts, cancel unexecuted intents and preserve committed debt. A shutdown cancellation does not award completion or count as a denied opportunity. Pause cancels without draining.

## Replay and acceptance

Use v13 for explicit window steps containing normalized manual intents, resolved admission times, window deadline and the replay inputs needed to derive auto eligibility and settlement. Record the initial debt baseline, close reason and shutdown boundary. A committed close identifies whether the raid ended. A rolled-back attempt records its outcome without applying any staged state, receipts, debt or stage change to replay. Distinguish a nonterminal shutdown drain from a terminal one. Compare order, final game state and debt to the HTTP server and SQLite. Keep replay v1–v12 paths and historical fixtures intact.

- Compare FIFO, v12 and the proposal in deterministic and real HTTP/SQLite scenarios. Cross arrival spreads of 60, 180 and 350 ms with fixed 32, alternating 24/32 and alternating 24/24/32 rosters. Include mixed auto/manual cohorts, reverse submission order, multiple class mixes, and a boss that dies after very few hits.
- Report eligible first-action executions, zero-execution counts, spread by identity and input mode, receipt-to-effect latency and queue peaks. Treat synthetic timing as synthetic and publish the raw cohort outcomes. Check that a later window can still contain a disadvantaged late arrival. A 400 ms opening window cannot eliminate the effects of all delays or a fight that ends before a later intent arrives.
- Exercise reconnect, archive/rejoin, clean restart, transaction failure and rollback, pause, shutdown, cooldown, insufficient MP, duplicate receipt, rejected ingress and practice isolation. Assert that rewards still require actual contribution and that replay and SQLite agree.
