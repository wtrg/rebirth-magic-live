# Game Design · RE:BIRTH

Varkhazar guards the Cổng Hư Vô. Viewers arrive as reborn mages, select one of six classes, and raid together. Fire is the default. Ice skill II delays a boss strike. Healer skill II restores living allies. Summoner receives a larger pet contribution. Knight has high defense and thunder high attack. All classes have three named, timed skills.

Combat moves from spawn to phase I, phase II at 55% HP, enrage at 25%, and victory or defeat. Defeat allows a retry. Victory moves the next raid to a higher stage. The host starts each raid. Viewers can use !attack, !skill1, !skill2 or !ult. Viewers can opt into server-side basic attacks with !auto on and stop with !auto off. Default is off. The preference persists, and every server process still requires !join to enter its active roster. Basic auto attacks share the 600 ms manual basic cooldown; skills remain manual. Pausing freezes both. The host still starts each raid.

Contributors earn 100 + 20 × stage EXP and one pet shard per win. The first three shards unlock Hỏa Hồ, Băng Vũ, and Lôi Miêu in order. !pet 1–3 equips an unlocked pet. !rebirth at level 3 resets level and current XP, retains pets and score, and gives permanent attack and HP. Cap 5.

Ranked contributors unlock Ember Staff at one win (+4 ATK), Void Armor at two wins (+3 DEF), and Eclipse Staff at three wins (+7 ATK). The first eligible ranked win grants any missing unlocked item. Weapon and armor slots are equipped only between fights and survive rebirth and restart. Practice and gifts never unlock items.

Scores are earned from contribution and stage in unassisted raids. MOCK gift IDs 1, 5, 10, 20, 30 trigger labeled effects. The operator selects ranked or practice before the raid begins. Ranked raids show cosmetic gift reactions. Each gift tier can affect combat once per practice raid. One coin restores up to 5 mana, five summons temporary pet support for 6 seconds, ten strikes for up to 40 damage, twenty awakens the sender for 8 seconds, and thirty shields the team for 12 seconds. Practice victories grant no persistent progression or ranking points. This keeps assisted wins from increasing the power available in a future ranked raid. No paid loot or cash rewards.


Pet upgrades reserve the first three earned shards for unlocks. Additional ranked shards are spent on levels 2–5 at costs 1, 2, 3 and 4. Each level adds +2 to the pet attack bonus. On skill II, Hỏa Hồ adds 5 attack to that cast, Băng Vũ delays the boss 350 ms, and Lôi Miêu returns 5 MP. The summoned pet, its level, and spent shards persist across restart and rebirth.


## Combat signatures

Critical hits are deterministic and reset each raid. Every 4th successful attack from Thunder, every 7th from Ice or Healer, and every 6th from Fire, Knight or Summoner deals 1.35× damage before defense.

- Fire deals 20% extra damage with Eclipse. From stage 3, Varkhazar summons two wraiths once at phase II. Fire skill II and Eclipse deal 45% and 60% of the cast damage to each living wraith. Other classes can aim a basic attack with !attack left or !attack right. Each living wraith adds 2 power to the boss turn.
- Ice skill II and ultimate delay the next boss attack by 550 ms and 900 ms. Pet delays share a cap of 1,200 ms per boss turn.
- Thunder ultimate always crits.
- Knight skill II halves the incoming attack multiplier for the next boss hit. The guard is then consumed.
- Healer skill II heals living allies by 18 HP. The ultimate restores 32 HP and 10 MP to living allies.
- Summoner ultimate adds a second copy of the active pet attack bonus to the cast.

Replay versions 1–4 retain their earlier combat rules. Version 5 introduced these rules. Replay version 6 supports achievement lookup. Version 7 adds richer stats and LIVE profile identity updates.

Achievements derive from persisted ranked milestones: first boss, 10 victories, full equipment collection, three pets, a level-5 pet and first rebirth. Existing profiles receive earned badges immediately. Badges do not modify score or combat stats.

`!stats` reports HP, MP, ATK, DEF, element, critical cadence, rebirth count and raid contribution. ATK and DEF use the same derived values as combat, with temporary skill modifiers applied separately.

Replay version 10 records server auto-attack steps separately from normalized viewer events. Versions 1–9 retain their prior behavior and ignore the newly introduced auto command. No automatic raid restart or automatic skill casting is enabled.
