# P10 ranked opportunity scheduling proposal

Status: proposed for Leader review. Applies to ranked raids after v12. [Manual ingress evidence](reports/P10_MANUAL_INGRESS.md) · [Issue #51](https://github.com/wtrg/rebirth-magic-live/issues/51)

## Admission and timing

Keep the existing normalized ingress, event receipts, rate limits and queue caps. A manual combat command that reaches the ranked scheduler becomes one pending intent for that player's stable ID. Keep the first admitted manual intent per ID per window. Extra commands cannot move that slot, add debt or displace another player. Continue applying non-combat commands through their existing server path. Practice retains its existing behavior and never reads or writes ranked debt.

Open the first window on the first eligible ranked action, whether auto or manual. Propose 400 ms for this opening window so the entire 350 ms arrival-spread fixture can compete when the arrivals begin with the first candidate. Propose 60 ms for subsequent windows to limit ongoing command delay. Fix the deadline at open time and define admission as strictly before the deadline. At close, process any due boss action first, then evaluate candidates against the resulting authoritative state. A candidate must still belong to the active raid, be alive, and pass the combat engine's action, target, cooldown and MP checks. Share that eligibility logic with actual execution. Recheck before executing each action because earlier actions may change its validity.

Build one slot per eligible stable ID from the union of ready auto players and admitted manual intents. An eligible manual intent takes its owner's slot. Otherwise a ready auto attack can fill it. Order slots by the player's persisted opening debt descending. Break ties by a stable hash of ranked stage and stable ID, then ID on hash collision. Execute through the normal combat engine. Both input modes retain existing damage, cooldown, contribution and reward rules.

## Debt and storage

Start each ranked raid with a frozen view of debt for ordering. For each player, track whether they executed an eligible combat action during that raid. At a terminal window, a player with an eligible slot that could not execute solely because another slot ended the raid, and who had no earlier execution, gains one debt point. A player who executed at least once loses one point, floored at zero. Other players retain their balance. Apply this update once per completed ranked raid. Proposed cap is 32. Cancelled or abandoned raids do not settle debt. A failed action, duplicate receipt, non-participant, or invalid or late command creates no debt. A valid action can consume an opportunity even if its gameplay outcome does not qualify for a reward.

Persist debt separately by stable player ID in a new SQLite migration, initialized to zero for existing profiles. Commit terminal combat progress, event receipt decisions, debt settlement and stage advancement in one transaction. Publish the snapshot only after commit. Leave pending windows in memory, like the existing ingress queue. A restart discards pending unexecuted intents and preserves committed debt. A pause cancels the window under the existing queue discard policy. A graceful shutdown should drain accepted intents once using the documented shutdown boundary and retain the same atomic settlement rules.

## Replay and acceptance

Use v13 for explicit window steps containing normalized manual intents, resolved admission times, window deadline and the replay inputs needed to derive auto eligibility and settlement. Record the initial debt baseline and replay the scheduler from those inputs. Compare order, final game state and debt to the HTTP server and SQLite. Keep replay v1–v12 paths and historical fixtures intact.

- Compare FIFO, v12 and the proposal in deterministic and real HTTP/SQLite scenarios. Cross arrival spreads of 60, 180 and 350 ms with fixed 32, alternating 24/32 and alternating 24/24/32 rosters. Include mixed auto/manual cohorts, reverse submission order, multiple class mixes, and a boss that dies after very few hits.
- Report eligible first-action executions, zero-execution counts, spread by identity and input mode, receipt-to-effect latency and queue peaks. Treat synthetic timing as synthetic and publish the raw cohort outcomes. Check that a later window can still contain a disadvantaged late arrival. A 400 ms opening window cannot eliminate the effects of all delays or a fight that ends before a later intent arrives.
- Exercise reconnect, archive/rejoin, clean restart, transaction failure and rollback, pause, shutdown, cooldown, insufficient MP, duplicate receipt, rejected ingress and practice isolation. Assert that rewards still require actual contribution and that replay and SQLite agree.

Decisions requested before implementation: confirm the opening latency budget, the definition of an opportunity as an actual eligible action, the debt cap, and whether graceful shutdown should settle a terminal raid from a shortened window.
