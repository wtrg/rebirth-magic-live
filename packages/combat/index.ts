import { classes, pets, items, achievements, attackStats, defenseOf, maxHp, type ItemId, type EffectKind, type GameEvent, type GameState, type Player } from '../shared/index.ts';
import { gifts } from '../tiktok-adapter/index.ts';


export const activeRaid = (state: GameState) => ['PHASE_1', 'PHASE_2', 'ENRAGED'].includes(state.raid.phase);
export const bossPhase = (hp: number, max: number) => hp <= 0 ? 'DEAD' : hp * 4 <= max ? 'ENRAGED' : hp * 100 <= max * 55 ? 'PHASE_2' : 'PHASE_1';
export const damage = (attack: number, multiplier: number, defense: number) => Math.max(1, Math.floor(attack * multiplier - defense));
const skills = [
  { cost: 8, cooldown: 1100, multiplier: 1.25 },
  { cost: 16, cooldown: 3400, multiplier: 1.85 },
  { cost: 30, cooldown: 8000, multiplier: 3 },
];

export function newGame(players: Player[] = [], stage = 1): GameState {
  return { players, logs: [], paused: false, effect: null,
    raid: { phase: 'IDLE', hp: 440 + stage * 40, maxHp: 440 + stage * 40, stage, next: 0, practice: false, usedGifts: [], supportPet: null, awakening: null, wardUntil: 0, result: null, assisted: false } };
}

function log(state: GameState, line: string) {
  state.logs.unshift(line);
  state.logs.length = Math.min(12, state.logs.length);
}

function effect(state: GameState, label: string, color: string, kind: EffectKind, rulesVersion: number) {
  state.effect = { serial: (state.effect?.serial ?? 0) + 1, label, color, ...(rulesVersion >= 4 ? { kind } : {}) };
}

export const nextRaidStage = (state: GameState) =>
  state.raid.stage + Number(state.raid.result === 'victory' && !state.raid.practice);

export function beginRaid(state: GameState, now: number, practice = false) {
  if (state.paused || activeRaid(state) || state.raid.phase === 'SPAWN' || state.players.length === 0) return false;
  const stage = nextRaidStage(state);
  const bossHp = 440 + stage * 40 + (state.players.length - 1) * 75;
  state.raid = { stage, phase: 'SPAWN', hp: bossHp, maxHp: bossHp, next: now + 800, practice, usedGifts: [], supportPet: null, awakening: null, wardUntil: 0, result: null, assisted: false };
  for (const player of state.players) {
    player.hp = maxHp(player);
    player.mp = 60;
    player.ready = [0, 0, 0, 0];
    player.contribution = 0;
    delete player.attackCount;
    delete player.guard;
  }
  log(state, 'Varkhazar xuất hiện tại Cổng Hư Vô.');
  return true;
}

function resolveVictory(state: GameState, equipmentDrops: boolean) {
  state.raid.result = 'victory';
  if (state.raid.practice) {
    log(state, 'Chiến thắng luyện tập · Không tính tiến trình hoặc xếp hạng');
    return;
  }
  for (const player of state.players.filter(player => player.contribution > 0)) {
    player.wins++;
    player.score += state.raid.stage * 100 + player.contribution;
    player.xp += 100 + state.raid.stage * 20;
    while (player.xp >= player.level * 100) {
      player.xp -= player.level * 100;
      player.level++;
    }
    player.shards++;
    const unlocked = Math.min(3, player.shards);
    if (unlocked > player.owned) log(state, player.name + ' nhận ' + pets[unlocked - 1].name);
    player.owned = unlocked;
    if (equipmentDrops) {
      const inventory = player.inventory ??= [];
      for (const id of Object.keys(items) as ItemId[]) {
        if (player.wins >= items[id].wins && !inventory.includes(id)) {
          inventory.push(id);
          log(state, player.name + ' nhận ' + items[id].name);
        }
      }
    }
  }
  log(state, 'Chiến thắng · +EXP · +1 mảnh linh thú');
}

export function tick(state: GameState, now: number, rulesVersion = 5) {
  if (state.paused || now < state.raid.next) return false;
  if (state.raid.phase === 'SPAWN') {
    state.raid.phase = 'PHASE_1';
    state.raid.next = now + 4600;
    return true;
  }
  if (!activeRaid(state)) return false;
  if (rulesVersion >= 5) state.raid.controlMs = 0;
  state.raid.next = now + (state.raid.phase === 'ENRAGED' ? 3200 : 4600);
  for (const player of state.players.filter(player => player.hp > 0)) {
    const force = state.raid.phase === 'ENRAGED' ? 27 : state.raid.phase === 'PHASE_2' ? 19 : 13;
    const defense = defenseOf(player);
    const guard = rulesVersion >= 5 && player.guard ? 0.5 : 1;
    player.hp = Math.max(0, player.hp - damage(force + state.raid.stage, (now < state.raid.wardUntil ? 0.65 : 1) * guard, defense));
    if (guard < 1) delete player.guard;
    player.mp = Math.min(60, player.mp + 12);
  }
  effect(state, 'CHẤN ĐỘNG', '#ff7899', 'boss', rulesVersion);
  if (state.players.every(player => player.hp <= 0)) {
    state.raid.phase = 'RESET';
    state.raid.result = 'defeat';
    log(state, 'Thất bại · Bắt đầu lại khi sẵn sàng');
  }
  return true;
}

export function applyEvent(state: GameState, event: GameEvent, now: number, rulesVersion = 7) {
  if (state.paused) return;
  const player = state.players.find(player => player.id === event.user);
  const username = rulesVersion >= 7 && event.user.startsWith('live:') ? event.username : undefined;
  if (player && username && (event.kind !== 'gift' || event.complete)) {
    player.username = username;
    player.name = event.name;
  }
  if (event.kind === 'gift') {
    const gift = gifts.get(event.giftId);
    if (!gift || !event.complete) return;
    const raid = state.raid;
    if (!raid.practice || !player || player.hp <= 0 || !activeRaid(state)) {
      log(state, event.name + ' · ' + gift.label + ' · Hiệu ứng chào mừng');
      effect(state, gift.label, gift.color, 'gift', rulesVersion);
      return;
    }
    if (raid.usedGifts.includes(event.giftId)) return;
    if (event.giftId === 'mock-1' && player.mp === 60 || event.giftId === 'mock-10' && raid.hp <= 1) return;
    raid.usedGifts.push(event.giftId);
    raid.assisted = true;
    let label = gift.label;
    switch (event.giftId) {
      case 'mock-1':
        player.mp = Math.min(60, player.mp + 5);
        break;
      case 'mock-5':
        raid.supportPet = { player: player.id, until: now + 6000 };
        break;
      case 'mock-10': {
        const strike = Math.min(40, raid.hp - 1);
        raid.hp -= strike;
        raid.phase = bossPhase(raid.hp, raid.maxHp);
        label += ' · -' + strike;
        break;
      }
      case 'mock-20':
        raid.awakening = { player: player.id, until: now + 8000 };
        break;
      case 'mock-30':
        raid.wardUntil = now + 12000;
        break;
    }
    log(state, event.name + ' · ' + label);
    effect(state, label, gift.color, 'gift', rulesVersion);
    return;
  }
  const [command, arg, extra] = event.command.split(/\s+/);
  if (extra) return;
  if (command === '!join' && !player && state.players.length < 64) {
    state.players.push({ id: event.user, name: event.name, ...(username ? { username } : {}), classId: 'fire', level: 1, xp: 0, hp: activeRaid(state) || state.raid.phase === 'SPAWN' ? 0 : 120,
      mp: 60, rebirth: 0, wins: 0, score: 0, shards: 0, owned: 0, pet: null, ready: [0, 0, 0, 0], contribution: 0, lastHit: 0 });
    log(state, event.name + ' đã gia nhập');
    return;
  }
  if (!player) return;
  const definition = classes[player.classId];
  if (command === '!stats') {
    const details = rulesVersion >= 5 ? ' · Hệ ' + definition.element + ' · Chí mạng mỗi ' + definition.critEvery + ' đòn' : '';
    const stats = rulesVersion >= 7 ? ' · HP ' + player.hp + '/' + maxHp(player) + ' · MP ' + player.mp +
      ' · ATK ' + attackStats(player).attack + ' · DEF ' + defenseOf(player) + ' · TS ' + player.rebirth +
      ' · Đóng góp ' + player.contribution : '';
    log(state, player.name + ' · Lv.' + player.level + ' · ' + player.xp + ' EXP' + details + stats);
  }
  if (rulesVersion >= 6 && command === '!achievements') {
    const earned = achievements.filter(achievement => achievement.earned(player));
    log(state, player.name + ' · Thành tựu ' + earned.length + '/' + achievements.length +
      (earned.length ? ' · ' + earned.map(achievement => achievement.name).join(' / ') : ''));
  }
  if (command === '!rank') {
    const leader = [...state.players].sort((a, b) => b.score - a.score)[0];
    log(state, 'Bá chủ · ' + leader.name + ' · ' + leader.score + ' điểm');
  }
  const fighting = activeRaid(state) || state.raid.phase === 'SPAWN';
  if (command === '!class' && !fighting && arg && Object.hasOwn(classes, arg)) {
    player.classId = arg as Player['classId'];
    log(state, player.name + ' · ' + classes[player.classId].name);
  }
  if (command === '!inventory') {
    const contents = player.inventory?.map(id => id + ': ' + items[id].name).join(' / ');
    log(state, player.name + ' · ' + (contents || 'Túi đồ trống'));
  }
  if (command === '!equip' && !fighting && arg && Object.hasOwn(items, arg)) {
    const id = arg as ItemId;
    if (player.inventory?.includes(id)) {
      (player.equipment ??= {})[items[id].slot] = id;
      log(state, player.name + ' trang bị ' + items[id].name);
    }
  }
  if (rulesVersion >= 3 && command === '!petup' && !fighting) {
    const index = arg ? Number(arg) - 1 : player.pet;
    if (index !== null && Number.isInteger(index) && index >= 0 && index < player.owned) {
      const level = player.petLevels?.[index] ?? 1;
      const spent = player.spentPetShards ?? 0;
      const available = Math.max(0, player.shards - pets.length - spent);
      if (level >= 5 || available < level) {
        log(state, level >= 5 ? 'Linh thú đã đạt cấp tối đa' : 'Cần ' + level + ' mảnh linh thú để nâng cấp');
      } else {
        (player.petLevels ??= [1, 1, 1])[index] = level + 1;
        player.spentPetShards = spent + level;
        log(state, player.name + ' nâng ' + pets[index].name + ' lên Lv.' + (level + 1));
      }
    }
  }
  if (command === '!pet' && player.owned > 0) {
    const index = arg ? Number(arg) - 1 : 0;
    if (Number.isInteger(index) && index >= 0 && index < player.owned) {
      player.pet = index;
      log(state, player.name + ' triệu hồi ' + pets[index].name);
    }
  }
  if (command === '!rebirth' && !fighting && player.level >= 3 && player.rebirth < 5) {
    player.rebirth++;
    player.level = 1;
    player.xp = 0;
    player.hp = maxHp(player);
    log(state, player.name + ' trùng sinh lần ' + player.rebirth);
  }
  const index = ['!skill1', '!skill2', '!ult', '!attack'].indexOf(command);
  if (index < 0 || !activeRaid(state) || player.hp <= 0 || now < player.ready[index]) return;
  const skill = skills[index] ?? { cost: 0, cooldown: 600, multiplier: 1 };
  if (player.mp < skill.cost) return;
  player.ready[index] = now + skill.cooldown;
  player.mp -= skill.cost;
  const raid = state.raid;
  const delayBoss = (requested: number) => {
    const delay = rulesVersion >= 5 ? Math.min(requested, 1200 - (raid.controlMs ?? 0)) : requested;
    if (rulesVersion >= 5) raid.controlMs = (raid.controlMs ?? 0) + delay;
    raid.next += delay;
  };
  if (player.classId === 'ice' && (index === 1 || rulesVersion >= 5 && index === 2)) delayBoss(index === 1 ? 550 : 900);
  if (player.classId === 'healer' && (index === 1 || rulesVersion >= 5 && index === 2)) {
    for (const ally of state.players.filter(ally => ally.hp > 0)) {
      ally.hp = Math.min(maxHp(ally), ally.hp + (index === 1 ? 18 : 32));
      if (index === 2) ally.mp = Math.min(60, ally.mp + 10);
    }
  }
  if (rulesVersion >= 5 && player.classId === 'knight' && index === 1) player.guard = true;
  let petSkill = '';
  let petBurst = 0;
  if (rulesVersion >= 3 && index === 1 && player.pet !== null) {
    petSkill = ' + ' + pets[player.pet].skill;
    if (player.pet === 0) petBurst = 5;
    if (player.pet === 1) delayBoss(350);
    if (player.pet === 2) player.mp = Math.min(60, player.mp + 5);
  }
  const { attack: power, petAttack } = attackStats(player, rulesVersion >= 3);
  const petSupport = raid.supportPet?.player === player.id && now < raid.supportPet.until ? 5 : 0;
  const awakened = raid.awakening?.player === player.id && now < raid.awakening.until;
  let critical = false;
  let signature = 1;
  if (rulesVersion >= 5) {
    player.attackCount = (player.attackCount ?? 0) + 1;
    critical = player.attackCount % definition.critEvery === 0 || player.classId === 'thunder' && index === 2;
    if (index === 2 && player.classId === 'fire') signature = 1.2;
    if (index === 2 && player.classId === 'summon' && player.pet !== null) petBurst += petAttack;
  }
  const dealt = Math.min(raid.hp, damage(power + petSupport + petBurst,
    skill.multiplier * signature * (awakened ? 1.2 : 1) * (critical ? 1.35 : 1), 5));
  raid.hp -= dealt;
  player.contribution += dealt;
  player.lastHit = now;
  raid.phase = bossPhase(raid.hp, raid.maxHp);
  const label = (definition.skills[index] ?? 'Tấn công') + petSkill + (critical ? ' · CHÍ MẠNG' : '');
  const kind = index === 2 ? 'ultimate' : index === 3 ? 'strike' : 'skill';
  effect(state, '-' + dealt + ' · ' + label, definition.color, kind, rulesVersion);
  log(state, player.name + ' · ' + label + ' · ' + dealt);
  if (raid.phase === 'DEAD') resolveVictory(state, rulesVersion >= 2);
}
