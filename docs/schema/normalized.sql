-- Relational design prototype, not an application migration.
-- Execute only in an empty scratch database. Runtime remains schema v2.
PRAGMA foreign_keys = ON;

CREATE TABLE players (
  player_id TEXT PRIMARY KEY NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('mock','live')),
  username TEXT CHECK(username IS NULL OR length(username) BETWEEN 2 AND 32),
  display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 1 AND 80),
  imported_at INTEGER CHECK(imported_at IS NULL OR imported_at >= 0),
  first_seen_at INTEGER CHECK(first_seen_at IS NULL OR first_seen_at >= 0),
  last_seen_at INTEGER CHECK(last_seen_at IS NULL OR last_seen_at >= 0)
) STRICT;

CREATE TABLE classes (
  class_id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  element TEXT NOT NULL,
  color TEXT NOT NULL,
  base_attack INTEGER NOT NULL CHECK(base_attack > 0),
  base_defense INTEGER NOT NULL CHECK(base_defense >= 0),
  crit_every INTEGER NOT NULL CHECK(crit_every >= 1),
  content_revision TEXT NOT NULL
) STRICT;

CREATE TABLE skills (
  class_id TEXT NOT NULL REFERENCES classes(class_id),
  slot INTEGER NOT NULL CHECK(slot BETWEEN 0 AND 3),
  name TEXT NOT NULL,
  mana_cost INTEGER NOT NULL CHECK(mana_cost BETWEEN 0 AND 60),
  cooldown_ms INTEGER NOT NULL CHECK(cooldown_ms > 0),
  multiplier REAL NOT NULL CHECK(multiplier > 0),
  effect_key TEXT NOT NULL,
  PRIMARY KEY(class_id,slot)
) STRICT;

CREATE TABLE pets (
  pet_id INTEGER PRIMARY KEY CHECK(pet_id BETWEEN 0 AND 2),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  base_attack INTEGER NOT NULL CHECK(base_attack > 0),
  skill_key TEXT NOT NULL,
  content_revision TEXT NOT NULL
) STRICT;

CREATE TABLE characters (
  character_id TEXT PRIMARY KEY NOT NULL,
  player_id TEXT NOT NULL UNIQUE REFERENCES players(player_id),
  class_id TEXT NOT NULL REFERENCES classes(class_id),
  level INTEGER NOT NULL CHECK(level >= 1),
  xp INTEGER NOT NULL CHECK(xp >= 0),
  rebirth INTEGER NOT NULL CHECK(rebirth BETWEEN 0 AND 5),
  wins INTEGER NOT NULL CHECK(wins >= 0),
  shards INTEGER NOT NULL CHECK(shards >= 0),
  spent_pet_shards INTEGER NOT NULL DEFAULT 0 CHECK(spent_pet_shards >= 0 AND spent_pet_shards <= max(0,shards-3)),
  auto_enabled INTEGER NOT NULL DEFAULT 0 CHECK(auto_enabled IN (0,1)),
  active_pet_id INTEGER,
  FOREIGN KEY(character_id,active_pet_id) REFERENCES player_pets(character_id,pet_id) DEFERRABLE INITIALLY DEFERRED
) STRICT;

CREATE TABLE player_pets (
  character_id TEXT NOT NULL REFERENCES characters(character_id),
  pet_id INTEGER NOT NULL REFERENCES pets(pet_id),
  level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 5),
  unlocked_at INTEGER CHECK(unlocked_at IS NULL OR unlocked_at >= 0),
  PRIMARY KEY(character_id,pet_id)
) STRICT;

CREATE TABLE items (
  item_id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  slot TEXT NOT NULL CHECK(slot IN ('weapon','armor')),
  attack INTEGER NOT NULL CHECK(attack >= 0),
  defense INTEGER NOT NULL CHECK(defense >= 0),
  required_wins INTEGER NOT NULL CHECK(required_wins >= 1),
  UNIQUE(item_id,slot)
) STRICT;

CREATE TABLE inventory (
  character_id TEXT NOT NULL REFERENCES characters(character_id),
  item_id TEXT NOT NULL,
  slot TEXT NOT NULL,
  equipped INTEGER NOT NULL DEFAULT 0 CHECK(equipped IN (0,1)),
  acquired_at INTEGER CHECK(acquired_at IS NULL OR acquired_at >= 0),
  PRIMARY KEY(character_id,item_id),
  FOREIGN KEY(item_id,slot) REFERENCES items(item_id,slot)
) STRICT;
CREATE UNIQUE INDEX inventory_one_equipped_slot ON inventory(character_id,slot) WHERE equipped = 1;

CREATE TABLE bosses (
  boss_id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  base_hp INTEGER NOT NULL CHECK(base_hp > 0),
  hp_per_stage INTEGER NOT NULL CHECK(hp_per_stage >= 0),
  hp_per_extra_member INTEGER NOT NULL CHECK(hp_per_extra_member >= 0),
  phase_two_percent INTEGER NOT NULL CHECK(phase_two_percent BETWEEN 1 AND 99),
  enrage_percent INTEGER NOT NULL CHECK(enrage_percent > 0 AND enrage_percent < phase_two_percent),
  normal_interval_ms INTEGER NOT NULL CHECK(normal_interval_ms > 0),
  enrage_interval_ms INTEGER NOT NULL CHECK(enrage_interval_ms > 0),
  content_revision TEXT NOT NULL
) STRICT;

CREATE TABLE stages (
  stage_id INTEGER PRIMARY KEY CHECK(stage_id >= 1),
  boss_id TEXT NOT NULL REFERENCES bosses(boss_id),
  rule_key TEXT NOT NULL,
  UNIQUE(stage_id,boss_id)
) STRICT;

CREATE TABLE raid_sessions (
  raid_id TEXT PRIMARY KEY NOT NULL,
  stage_id INTEGER NOT NULL,
  boss_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('ranked','practice')),
  source TEXT NOT NULL CHECK(source IN ('mock','live')),
  rules_version INTEGER NOT NULL CHECK(rules_version >= 1),
  content_revision TEXT NOT NULL,
  started_at INTEGER NOT NULL CHECK(started_at >= 0),
  ended_at INTEGER CHECK(ended_at IS NULL OR ended_at >= started_at),
  status TEXT NOT NULL CHECK(status IN ('active','victory','defeat','aborted')),
  phase TEXT NOT NULL CHECK(phase IN ('SPAWN','PHASE_1','PHASE_2','ENRAGED','DEAD','RESET')),
  hp INTEGER NOT NULL CHECK(hp >= 0 AND hp <= max_hp),
  max_hp INTEGER NOT NULL CHECK(max_hp > 0),
  starting_members INTEGER NOT NULL CHECK(starting_members BETWEEN 1 AND 64),
  next_due_at INTEGER NOT NULL CHECK(next_due_at >= 0),
  paused_at INTEGER CHECK(paused_at IS NULL OR paused_at >= 0),
  initial_state_json TEXT NOT NULL CHECK(json_valid(initial_state_json) AND json_type(initial_state_json) = 'object'
    AND length(CAST(initial_state_json AS BLOB)) <= 262144),
  FOREIGN KEY(stage_id,boss_id) REFERENCES stages(stage_id,boss_id),
  CHECK((status = 'active' AND ended_at IS NULL AND phase NOT IN ('DEAD','RESET')) OR
    (status = 'victory' AND ended_at IS NOT NULL AND phase = 'DEAD' AND hp = 0) OR
    (status IN ('defeat','aborted') AND ended_at IS NOT NULL AND phase = 'RESET'))
) STRICT;
CREATE UNIQUE INDEX one_active_raid ON raid_sessions((1)) WHERE status = 'active';
CREATE INDEX raid_sessions_history ON raid_sessions(started_at,raid_id);
CREATE TRIGGER raid_identity_immutable BEFORE UPDATE OF
  raid_id,stage_id,boss_id,mode,source,rules_version,content_revision,started_at,starting_members,max_hp,initial_state_json
ON raid_sessions
BEGIN SELECT RAISE(ABORT,'Raid identity and rules are immutable'); END;

CREATE TABLE raid_participants (
  raid_id TEXT NOT NULL REFERENCES raid_sessions(raid_id),
  character_id TEXT NOT NULL REFERENCES characters(character_id),
  joined_at INTEGER NOT NULL CHECK(joined_at >= 0),
  final_contribution INTEGER CHECK(final_contribution IS NULL OR final_contribution >= 0),
  PRIMARY KEY(raid_id,character_id)
) STRICT;

CREATE TABLE character_stats (
  raid_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  hp INTEGER NOT NULL CHECK(hp >= 0),
  mp INTEGER NOT NULL CHECK(mp BETWEEN 0 AND 60),
  contribution INTEGER NOT NULL CHECK(contribution >= 0),
  attack_count INTEGER NOT NULL CHECK(attack_count >= 0),
  guard INTEGER NOT NULL CHECK(guard IN (0,1)),
  last_hit_at INTEGER NOT NULL CHECK(last_hit_at >= 0),
  ready_skill1_at INTEGER NOT NULL CHECK(ready_skill1_at >= 0),
  ready_skill2_at INTEGER NOT NULL CHECK(ready_skill2_at >= 0),
  ready_ult_at INTEGER NOT NULL CHECK(ready_ult_at >= 0),
  ready_basic_at INTEGER NOT NULL CHECK(ready_basic_at >= 0),
  PRIMARY KEY(raid_id,character_id),
  FOREIGN KEY(raid_id,character_id) REFERENCES raid_participants(raid_id,character_id)
) STRICT;

CREATE TABLE event_receipts (
  event_id TEXT PRIMARY KEY NOT NULL CHECK(length(event_id) BETWEEN 1 AND 80),
  accepted_at INTEGER NOT NULL CHECK(accepted_at >= 0)
) STRICT;
CREATE INDEX event_receipts_expiry ON event_receipts(accepted_at);

CREATE TABLE combat_events (
  raid_id TEXT NOT NULL REFERENCES raid_sessions(raid_id),
  sequence INTEGER NOT NULL CHECK(sequence >= 1),
  at INTEGER NOT NULL CHECK(at >= 0),
  actor_character_id TEXT,
  kind TEXT NOT NULL CHECK(kind IN ('basic','skill','boss','phase','auto','pause','resume','victory','defeat')),
  details_json TEXT NOT NULL CHECK(json_valid(details_json) AND json_type(details_json) = 'object'
    AND length(CAST(details_json AS BLOB)) <= 4096),
  PRIMARY KEY(raid_id,sequence),
  FOREIGN KEY(raid_id,actor_character_id) REFERENCES raid_participants(raid_id,character_id)
) STRICT;
CREATE INDEX combat_events_actor ON combat_events(actor_character_id,at);

CREATE TABLE raid_rewards (
  raid_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  xp_delta INTEGER NOT NULL CHECK(xp_delta >= 0),
  shards_delta INTEGER NOT NULL CHECK(shards_delta >= 0),
  score_delta INTEGER NOT NULL CHECK(score_delta >= 0),
  granted_at INTEGER NOT NULL CHECK(granted_at >= 0),
  PRIMARY KEY(raid_id,character_id),
  FOREIGN KEY(raid_id,character_id) REFERENCES raid_participants(raid_id,character_id)
) STRICT;
CREATE TRIGGER rewards_require_ranked_victory BEFORE INSERT ON raid_rewards
WHEN NOT EXISTS (
  SELECT 1 FROM raid_sessions s JOIN raid_participants p ON p.raid_id = s.raid_id
  WHERE s.raid_id = NEW.raid_id AND s.mode = 'ranked' AND s.status = 'victory'
    AND p.character_id = NEW.character_id AND p.final_contribution > 0
)
BEGIN SELECT RAISE(ABORT,'Rewards require contributing ranked victory'); END;
CREATE TRIGGER rewards_immutable BEFORE UPDATE ON raid_rewards
BEGIN SELECT RAISE(ABORT,'Reward ledger is append-only'); END;

CREATE TABLE rebirth_history (
  character_id TEXT NOT NULL REFERENCES characters(character_id),
  cycle INTEGER NOT NULL CHECK(cycle BETWEEN 1 AND 5),
  previous_level INTEGER NOT NULL CHECK(previous_level >= 3),
  previous_xp INTEGER NOT NULL CHECK(previous_xp >= 0),
  at INTEGER NOT NULL CHECK(at >= 0),
  PRIMARY KEY(character_id,cycle)
) STRICT;

CREATE TABLE achievements (
  achievement_id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  content_revision TEXT NOT NULL
) STRICT;

CREATE TABLE character_achievements (
  character_id TEXT NOT NULL REFERENCES characters(character_id),
  achievement_id TEXT NOT NULL REFERENCES achievements(achievement_id),
  earned_at INTEGER CHECK(earned_at IS NULL OR earned_at >= 0),
  observed_at INTEGER NOT NULL CHECK(observed_at >= 0),
  PRIMARY KEY(character_id,achievement_id)
) STRICT;

CREATE TABLE leaderboard_seasons (
  season_id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('all_time','season')),
  status TEXT NOT NULL CHECK(status IN ('active','closed')),
  starts_at INTEGER CHECK(starts_at IS NULL OR starts_at >= 0),
  ends_at INTEGER CHECK(ends_at IS NULL OR ends_at >= coalesce(starts_at,0)),
  rules_version INTEGER NOT NULL CHECK(rules_version >= 1),
  CHECK((status = 'active' AND ends_at IS NULL) OR (status = 'closed' AND ends_at IS NOT NULL))
) STRICT;
CREATE UNIQUE INDEX one_active_board_per_kind ON leaderboard_seasons(kind) WHERE status = 'active';

CREATE TABLE leaderboard_scores (
  season_id TEXT NOT NULL REFERENCES leaderboard_seasons(season_id),
  character_id TEXT NOT NULL REFERENCES characters(character_id),
  points INTEGER NOT NULL CHECK(points >= 0),
  baseline_points INTEGER NOT NULL DEFAULT 0 CHECK(baseline_points >= 0 AND baseline_points <= points),
  PRIMARY KEY(season_id,character_id)
) STRICT;
CREATE INDEX leaderboard_top ON leaderboard_scores(season_id,points DESC,character_id);

CREATE TABLE gift_events (
  event_id TEXT PRIMARY KEY NOT NULL REFERENCES event_receipts(event_id),
  raid_id TEXT REFERENCES raid_sessions(raid_id),
  sender_key TEXT NOT NULL CHECK(length(sender_key) BETWEEN 1 AND 80),
  sender_player_id TEXT REFERENCES players(player_id),
  gift_id TEXT NOT NULL,
  configured_tier INTEGER NOT NULL CHECK(configured_tier IN (1,5,10,20,30)),
  complete INTEGER NOT NULL CHECK(complete = 1),
  effect_applied INTEGER NOT NULL CHECK(effect_applied IN (0,1)),
  decision TEXT NOT NULL CHECK(decision IN ('cosmetic','applied','ignored_limit','ignored_inactive')),
  processed_at INTEGER NOT NULL CHECK(processed_at >= 0),
  CHECK(sender_player_id IS NULL OR sender_player_id = sender_key),
  CHECK((effect_applied = 1 AND decision = 'applied' AND raid_id IS NOT NULL) OR
    (effect_applied = 0 AND decision <> 'applied'))
) STRICT;
CREATE UNIQUE INDEX gift_once_per_raid_tier ON gift_events(raid_id,configured_tier) WHERE effect_applied = 1;
CREATE INDEX gift_events_retention ON gift_events(processed_at);
CREATE TRIGGER gifts_require_active_practice BEFORE INSERT ON gift_events
WHEN NEW.effect_applied = 1 AND NOT EXISTS (
  SELECT 1 FROM raid_sessions WHERE raid_id = NEW.raid_id AND mode = 'practice' AND status = 'active'
)
BEGIN SELECT RAISE(ABORT,'Gift effects require active practice'); END;
CREATE TRIGGER gifts_immutable BEFORE UPDATE ON gift_events
BEGIN SELECT RAISE(ABORT,'Gift decisions are append-only'); END;

CREATE TABLE settings (
  key TEXT PRIMARY KEY NOT NULL CHECK(key IN ('render-quality','gift-map','rules-version','database-mode','import-baseline')),
  value_json TEXT NOT NULL CHECK(json_valid(value_json) AND length(CAST(value_json AS BLOB)) <= 8192),
  updated_at INTEGER NOT NULL CHECK(updated_at >= 0)
) STRICT;

CREATE TABLE world_progress (
  singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
  stage_id INTEGER NOT NULL REFERENCES stages(stage_id)
) STRICT;
