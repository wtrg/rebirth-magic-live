import { classes, pets, maxHp, type GameEvent, type GameState, type Player } from '../shared/index.ts';
import { gifts } from '../tiktok-adapter/index.ts';


export const activeRaid = (state: GameState) => ['PHASE_1', 'PHASE_2', 'ENRAGED'].includes(state.raid.phase);
export const bossPhase = (hp: number, max: number) => hp <= 0 ? 'DEAD' : hp * 4 <= max ? 'ENRAGED' : hp * 100 <= max * 55 ? 'PHASE_2' : 'PHASE_1';
export const damage = (attack: number, multiplier: number, defense: number) => Math.max(1, Math.floor(attack * multiplier - defense));
const skills = [
  { cost: 8, cooldown: 1100, multiplier: 1.25 },
  { cost: 16, cooldown: 3400, multiplier: 1.85 },
  { cost: 30, cooldown: 8000, multiplier: 3 },
];

export function newGame(players: Player[] = []): GameState {
  return { players, logs: [], paused: false, effect: null,
    raid: { phase: 'IDLE', hp: 480, maxHp: 480, stage: 1, next: 0, furyUntil: 0, result: null, assisted: false } };
}

function log(state: GameState, line: string) {
  state.logs.unshift(line);
  state.logs.length = Math.min(12, state.logs.length);
}

function effect(state: GameState, label: string, color: string) {
  state.effect = { serial: (state.effect?.serial ?? 0) + 1, label, color };
}

export function beginRaid(state: GameState, now: number) {
  if (state.paused || activeRaid(state) || state.raid.phase === 'SPAWN' || state.players.length === 0) return false;
  const stage = state.raid.stage + Number(state.raid.result === 'victory');
  const bossHp = 440 + stage * 40 + (state.players.length - 1) * 75;
  state.raid = { stage, phase: 'SPAWN', hp: bossHp, maxHp: bossHp, next: now + 800, furyUntil: 0, result: null, assisted: false };
  for (const player of state.players) {
    player.hp = maxHp(player);
    player.mp = 60;
    player.ready = [0, 0, 0, 0];
    player.contribution = 0;
  }
  log(state, 'Varkhazar xuất hiện tại Cổng Hư Vô.');
  return true;
}

function resolveVictory(state: GameState) {
  state.raid.result = 'victory';
  for (const player of state.players.filter(player => player.contribution > 0)) {
    player.wins++;
    if (!state.raid.assisted) player.score += state.raid.stage * 100 + player.contribution;
    player.xp += 100 + state.raid.stage * 20;
    while (player.xp >= player.level * 100) {
      player.xp -= player.level * 100;
      player.level++;
    }
    player.shards++;
    const unlocked = Math.min(3, player.shards);
    if (unlocked > player.owned) log(state, player.name + ' nhận ' + pets[unlocked - 1].name);
    player.owned = unlocked;
  }
  log(state, 'Chiến thắng · +EXP · +1 mảnh linh thú');
}

export function tick(state: GameState, now: number) {
  if (state.paused || now < state.raid.next) return false;
  if (state.raid.phase === 'SPAWN') {
    state.raid.phase = 'PHASE_1';
    state.raid.next = now + 4600;
    return true;
  }
  if (!activeRaid(state)) return false;
  state.raid.next = now + (state.raid.phase === 'ENRAGED' ? 3200 : 4600);
  for (const player of state.players.filter(player => player.hp > 0)) {
    const force = state.raid.phase === 'ENRAGED' ? 27 : state.raid.phase === 'PHASE_2' ? 19 : 13;
    player.hp = Math.max(0, player.hp - damage(force + state.raid.stage, 1, classes[player.classId].defense));
    player.mp = Math.min(60, player.mp + 12);
  }
  effect(state, 'CHẤN ĐỘNG', '#ff7899');
  if (state.players.every(player => player.hp <= 0)) {
    state.raid.phase = 'RESET';
    state.raid.result = 'defeat';
    log(state, 'Thất bại · Bắt đầu lại khi sẵn sàng');
  }
  return true;
}

export function applyEvent(state: GameState, event: GameEvent, now: number) {
  if (state.paused) return;
  const player = state.players.find(player => player.id === event.user);
  if (event.kind === 'gift') {
    const gift = gifts.get(event.giftId);
    if (!gift || !event.complete) return;
    if (player && activeRaid(state)) {
      if (event.giftId === 'mock-1') player.mp = Math.min(60, player.mp + 5);
      else state.raid.furyUntil = Math.max(state.raid.furyUntil, now + Number(event.giftId.slice(5)) * 400);
      state.raid.assisted = true;
    }
    log(state, event.name + ' · ' + gift.label);
    effect(state, gift.label, gift.color);
    return;
  }
  const [command, arg, extra] = event.command.split(/\s+/);
  if (extra) return;
  if (command === '!join' && !player && state.players.length < 64) {
    state.players.push({ id: event.user, name: event.name, classId: 'fire', level: 1, xp: 0, hp: activeRaid(state) || state.raid.phase === 'SPAWN' ? 0 : 120,
      mp: 60, rebirth: 0, wins: 0, score: 0, shards: 0, owned: 0, pet: null, ready: [0, 0, 0, 0], contribution: 0, lastHit: 0 });
    log(state, event.name + ' đã gia nhập');
    return;
  }
  if (!player) return;
  const definition = classes[player.classId];
  if (command === '!stats') log(state, player.name + ' · Lv.' + player.level + ' · ' + player.xp + ' EXP');
  if (command === '!rank') {
    const leader = [...state.players].sort((a, b) => b.score - a.score)[0];
    log(state, 'Bá chủ · ' + leader.name + ' · ' + leader.score + ' điểm');
  }
  const fighting = activeRaid(state) || state.raid.phase === 'SPAWN';
  if (command === '!class' && !fighting && arg && Object.hasOwn(classes, arg)) {
    player.classId = arg as Player['classId'];
    log(state, player.name + ' · ' + classes[player.classId].name);
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
  if (player.classId === 'ice' && index === 1) raid.next += 550;
  if (player.classId === 'healer' && index === 1) {
    for (const ally of state.players.filter(ally => ally.hp > 0)) ally.hp = Math.min(maxHp(ally), ally.hp + 18);
  }
  const petAttack = player.pet === null ? 0 : pets[player.pet].attack * (player.classId === 'summon' ? 1.5 : 1);
  const power = definition.attack + (player.level - 1) * 4 + player.rebirth * 3 + petAttack;
  const dealt = Math.min(raid.hp, damage(power, skill.multiplier * (now < raid.furyUntil ? 1.15 : 1), 5));
  raid.hp -= dealt;
  player.contribution += dealt;
  player.lastHit = now;
  raid.phase = bossPhase(raid.hp, raid.maxHp);
  const label = definition.skills[index] ?? 'Tấn công';
  effect(state, '-' + dealt + ' · ' + label, definition.color);
  log(state, player.name + ' · ' + label + ' · ' + dealt);
  if (raid.phase === 'DEAD') resolveVictory(state);
}
