# Fixed-order auto contribution bias

Status: confirmed historical finding at `46cf80db62fa6ec7d27e5e7fb994eb4823ccdfc1`, corrected by rules v11 on the `fix/auto-order-fairness` branch. Codex root reproduced the original reviewer's result and reviewed the delegated correction. Final integration SHA and gates are recorded in the PR/task ledger. This is not a Leader balance approval.

At the measured historical source, the [auto scheduler](../../packages/combat/index.ts) visited the roster in fixed order. Each eligible basic resolved damage and could finish the raid immediately. Victory rewards correctly required positive contribution, but a same-time eligible attacker later in the roster might never get a turn. Earlier players could earn levels while later players repeatedly missed rewards.

Reproduction through production entrypoints only: create 32 identical Fire profiles with `!join`; set each to level 30, full computed HP, auto enabled, no gear/pets; `beginRaid(state,1000)`, `tick(state,1800)`, `autoBattle(state,1800)`. Repeat from a fresh equivalent state with only roster order reversed. No manual commands, gifts, clock performance or OBS are involved. At stage 1 the scaled boss has 2,805 HP; the first batch kills it. The first 21 roster members receive positive contribution/rewards, while the last 11 receive none. Reversing the roster reverses the excluded identities. [Synthetic reproduction output](evidence/auto-order-repro.json).

The separate ten-minute combined run saved 32 profiles with wins ranging 110–322. Its driver also sends manual skill waves in ascending order, so that distribution cannot isolate auto's effect. The reproduction above establishes auto ordering as an independent cause. Do not change contribution eligibility or grant idle participants rewards to hide the defect.

The narrow proposed correction is deterministic rotation of the starting auto attacker across raids, giving eligible participants repeated opportunities while retaining cooldowns, bounded basic attacks, contribution requirements and once-only rewards. A recorded round-robin cursor is another option with a broader state change. Root must choose and verify the implementation. Any changed combat ordering must preserve old v10 replay results via a new rules-version gate; changing historical replay outcomes is unacceptable.

## Correction and evidence

Rules v11 start at `(stage - 1) % roster.length` and wrap through the roster without changing its order. Ranked victory advances the stage, so the next raid gives a different position first opportunity. Dead, disabled and cooling players are skipped; a killing hit still ends the raid immediately. Reward eligibility and formulas are unchanged. Defeat retries and repeated practice at the same stage retain the same start, and roster churn can change the eligible order. This distributes opportunities across stages; it does not guarantee every player contributes in each raid or receives equal damage/score.

The server and new replay writer share `currentRulesVersion=11`. Explicit v10 replay retains fixed order; earlier replay versions retain their gates. The complete-state SHA-256 for an immutable v10 three-raid trace captured from `054e544` remains unchanged. The trace includes a nonzero starting stage, manual skill and pause/resume. New v11 replay tests combine manual, boss and rotated auto steps. No persistent cursor or database migration is needed.

Five added regressions cover the historical digest, v10/v11 ordering, all 32 first positions across 32 stages in forward/reversed rosters, eligibility/cooldowns, once-only rewards and deterministic replay. One-shot high-level fixtures make first opportunity observable; they are not balance fixtures. The independent [career comparison script](../../scripts/auto-fairness-qa.ts) uses actual production logic for eight 322-raid cohorts: initial level 30, 32 players, fixed forward/reversed roster, identical Fire or six-class mix, with earned growth but no manual commands or pet/equipment selection.

| Rules / cohort | Wins per player after 322 raids | Levels |
| --- | --- | --- |
| v10, identical Fire, either order | 0–322 | 30–149 |
| v10, six-class mix, either order | 0–322 | 30–149 |
| v11, identical Fire, either order | 279–285 | 140–142 |
| v11, six-class mix, forward | 281–289 | 140–142 |
| v11, six-class mix, reversed | 281–288 | 140–142 |

These cohorts isolate pure auto from the earlier combined run's manual FIFO waves. They demonstrate removal of permanent roster-tail exclusion under this fixed-roster workload, not full class balance, optimal strategy, arbitrary late joins, manual-input fairness or performance. Reproduce with `node scripts/auto-fairness-qa.ts`; reviewed output and tested source SHA are indexed in the task ledger. Task RB-AUTO-ORDER retains the required code quality, browser and replay integration gates before merge.
