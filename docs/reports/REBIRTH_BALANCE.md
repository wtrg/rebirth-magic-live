# Rebirth balance worksheet

Status: deterministic Codex technical analysis of existing rules version 10. Leader gameplay review remains pending. No runtime formula, unlock, reward or balance parameter changed. This is not an Antigravity, Qoder or Gemini report.

Reproduce from the repository root with `node scripts/rebirth-balance.ts`. The script prints JSON with 36 stat/eligibility rows and 72 independently simulated raids. `node --test tests/rebirth-balance.test.ts` verifies all five rebirths for every class, retained possessions/progression, the cap, rejected commands and repeatable simulation. All inputs are synthetic; no database, browser, network or real viewer data is used.

## Existing rules and immediate tradeoff

The worksheet imports the actual [combat functions](../../packages/combat/index.ts) and [derived stat functions](../../packages/shared/index.ts). Rebirth requires level at least 3, fewer than five previous rebirths, no spawn/active raid and an unpaused game. It resets level to 1 and current XP to 0, increments the count and sets current HP to the new computed maximum. Class, gear, pet ownership/levels/selection, shard spending, earned shards, wins, score and automatic-battle preference remain intact.

Each cycle permanently adds **3 ATK and 6 maximum HP** at an equal level/loadout. Five cycles therefore add **15 ATK and 30 maximum HP**; defense, critical cadence, MP costs and cooldowns receive no rebirth bonus. The basic cooldown remains 600 ms.

At the minimum level-3 gate, losing two levels removes 8 ATK and 24 maximum HP. One new cycle returns 3 ATK and 6 HP, leaving an immediate **−5 ATK / −18 maximum HP** tradeoff. This is an investment in later growth, not an immediate power increase. At higher levels the reset costs more: before modifiers, the ATK change is `3 − 4×(oldLevel−1)` and the maximum-HP change is `6 − 12×(oldLevel−1)`. Current HP can still rise if the player was injured; the comparison is between maximum HP values. Any current XP is discarded. Regaining level 3 from level 1/0 XP consumes 300 EXP under the current level-up thresholds; raid count depends on stage rewards and contribution eligibility.

## Equal-level stat worksheet

All columns below use level 1, no gear and no active pet. Cycle columns run **0 / 1 / 2 / 3 / 4 / 5**. Add 8 ATK and 24 maximum HP to obtain each corresponding level-3 gate value. The script also prints those gate values explicitly.

| Class | ATK at cycles 0–5 | DEF | Critical cadence |
| --- | --- | --- | --- |
| Fire | 29 / 32 / 35 / 38 / 41 / 44 | 4 | Every 6 successful attacks |
| Ice | 25 / 28 / 31 / 34 / 37 / 40 | 7 | Every 7 |
| Thunder | 32 / 35 / 38 / 41 / 44 / 47 | 3 | Every 4 |
| Knight | 27 / 30 / 33 / 36 / 39 / 42 | 11 | Every 6 |
| Healer | 22 / 25 / 28 / 31 / 34 / 37 | 6 | Every 7 |
| Summoner | 24 / 27 / 30 / 33 / 36 / 39 | 5 | Every 6 |

Maximum HP for every class is **120 / 126 / 132 / 138 / 144 / 150** at level 1, and **144 / 150 / 156 / 162 / 168 / 174** at level 3. At equal level the percentage gain varies with class base attack: +15 ATK is approximately 46.9% for Thunder and 68.2% for Healer before gear/pets. That does not establish equal class effectiveness: damage floors, cadence, defense and manual signatures differ.

At cycles 0–4 a level-3 command advances exactly one cycle and resets XP. At cycle 5 the command leaves the entire state unchanged, including level and XP. Tests also reject levels 1/2, SPAWN, all three active phases and pause without state mutation. Preservation checks use actual owned gear, upgraded pets and earned totals rather than an empty profile.

## Actual deterministic combat comparison

Each fixture starts one level-1 character at the specified cycle, with no equipment, no pet, full computed HP, 60 MP and server basic auto enabled. It calls production `beginRaid`, then `tick` before `autoBattle` on a 50 ms synthetic clock, matching the server's boss-before-auto order with no queued viewer commands. No skills, gifts or healing commands are sent. Stage 1 starts at 480 boss HP; stage 3 starts at 560 HP and production phase logic summons both wraiths. Basic attacks target the boss. There is a 120-second execution bound; none timed out.

These are independent comparisons, not a simulation of earning each cycle, accumulated loadouts or a saved career. Production victory rewards run after the killing attack and do not improve that raid's earlier attacks. Durations exclude the 800 ms spawn; the first basic attack occurs at combat time zero. This synthetic clock measures game-rule time, not wall-clock performance, render FPS, human reaction time or server throughput.

**All 72 fixtures won.** Seconds to victory, again in cycle order 0 / 1 / 2 / 3 / 4 / 5:

| Class | Stage 1 seconds | Stage 3 seconds |
| --- | --- | --- |
| Fire | 10.8 / 9.6 / 9.0 / 7.8 / 7.2 / 6.6 | 13.2 / 11.4 / 10.2 / 9.6 / 8.4 / 7.8 |
| Ice | 13.2 / 12.0 / 10.2 / 9.0 / 8.4 / 7.8 | 15.6 / 13.8 / 12.0 / 10.8 / 9.6 / 9.0 |
| Thunder | 9.6 / 8.4 / 7.8 / 7.2 / 6.6 / 6.0 | 11.4 / 10.2 / 9.0 / 8.4 / 7.8 / 7.2 |
| Knight | 12.0 / 10.2 / 9.6 / 8.4 / 7.8 / 7.2 | 13.8 / 12.6 / 10.8 / 10.2 / 9.0 / 8.4 |
| Healer | 15.6 / 13.2 / 12.0 / 10.2 / 9.0 / 8.4 | 18.6 / 15.6 / 13.8 / 12.0 / 10.8 / 9.6 |
| Summoner | 13.8 / 12.0 / 10.2 / 9.6 / 8.4 / 7.8 | 16.2 / 13.8 / 12.6 / 10.8 / 10.2 / 9.0 |

The JSON includes attack count, surviving character HP and remaining boss HP for every fixture. Survivor HP need not increase monotonically: changing damage changes when phase/enrage thresholds cross relative to the scheduled boss turns. The earliest-stage bare auto comparison favors Thunder damage and understates Healer support, Ice control and Summoner pet benefits because their manual skills/pets are deliberately absent.

## Readiness and limits

The existing cap, basic eligibility and equal-level permanent gains are now quantified and regression checked. This analysis does **not** approve the level-3 gate or establish balanced manual/co-op combat, high-stage progression, optimal rebirth timing, acquisition pacing, seasonal ranking or long-term retention. The permanent bonus being bounded does not bound total character power: character level has no implemented maximum. Rebirth at a high unlocked stage may make the immediate next raid harder; no automatic stage downgrade or compensation is introduced here.

Leader decisions remain: whether the immediate level-reset loss is communicated adequately, whether +3/+6 and five cycles give the intended pacing, and whether manual support/pet/co-op progression needs additional balance scenarios. Any parameter change requires its own authorized implementation/review. The current recommendation is to retain the rules while presenting this measured tradeoff for review.

## Validation

On Windows / Node 24, run the focused regression and required repository gates:

```powershell
node --test tests/rebirth-balance.test.ts
node scripts/rebirth-balance.ts
npm run typecheck
npm run lint
npm test
npm run build
```

Validation on the shared working tree: focused regression **3/3 passed**, full repository suite **31/31 passed**, typecheck **PASS**, lint **PASS**, build **PASS**. Vite retained its advisory warning about a minified client chunk larger than 500 kB; this task adds no client bundle imports. Running the worksheet produced all 36 rows and 72 terminal victories deterministically. The integrating task/phase report records the tested source SHA; this document does not assign itself a commit SHA before integration.
