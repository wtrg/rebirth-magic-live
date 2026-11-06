import './style.css';
import { classes, pets, items, achievements, attackStats, defenseOf, maxHp, type GameSnapshot } from '../../packages/shared/index.ts';

import { createArena } from './scene.ts';
import { loadFireMagePreview, loadFoxForQa, loadRaidModels, loadVarkhazarPreview } from './asset-loader.ts';
import { createCombatAudio } from './audio.ts';

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const params = new URLSearchParams(location.search);
const overlay = params.has('overlay');
const audio = createCombatAudio();
const audioToggle = get<HTMLButtonElement>('audio-toggle');
const overlayAudio = get<HTMLButtonElement>('overlay-audio');
overlayAudio.hidden = !overlay || params.get('audio') !== '1';
audioToggle.onclick = async () => {
  const wasEnabled = audioToggle.getAttribute('aria-pressed') === 'true';
  if (wasEnabled) audio.disable();
  const enabled = !wasEnabled && await audio.enable();
  audioToggle.setAttribute('aria-pressed', String(enabled));
  audioToggle.textContent = enabled ? 'Tắt âm thanh' : 'Bật âm thanh';
};
overlayAudio.onclick = async () => { overlayAudio.hidden = await audio.enable(); };
if (overlay && params.get('audio') === '1') void audio.enable().then(enabled => { overlayAudio.hidden = enabled; });
document.body.classList.toggle('overlay', overlay);
const low = get<HTMLInputElement>('low');
low.checked = params.get('quality') !== 'high';
let render: ((state: GameSnapshot) => void) | undefined;
const bossPreview = params.get('boss-preview') === '1' ? loadVarkhazarPreview().catch(() => undefined) : undefined;
const firePreview = params.get('fire-preview') === '1' ? loadFireMagePreview().catch(() => undefined) : undefined;
const qa = params.get('crowded-qa') === '1';
const icePreview = qa ? loadFireMagePreview(true).catch(() => undefined) : undefined;
const foxPreview = qa ? loadFoxForQa().catch(() => undefined) : undefined;
void Promise.all([loadRaidModels().catch(() => undefined), firePreview, bossPreview, icePreview, foxPreview]).then(([models, fireMage, varkhazar, iceMage, fox]) => {
  try {
    render = createArena(get('viewport'), () => low.checked, overlay, models, { fireMage, varkhazar, iceMage, fox });
    if (state) render(state);
  } catch {
    get('notice').textContent = 'WebGL 2 không khả dụng · HUD vẫn đang hoạt động';
  }
});
const phases = { IDLE: 'CHỜ KHAI CHIẾN', SPAWN: 'BOSS XUẤT HIỆN', PHASE_1: 'GIAI ĐOẠN I', PHASE_2: 'GIAI ĐOẠN II', ENRAGED: 'CUỒNG NỘ', DEAD: 'CHIẾN THẮNG', RESET: 'THẤT BẠI' };
const username = get<HTMLInputElement>('username');
const command = get<HTMLInputElement>('command');
const form = get<HTMLFormElement>('chat');
let state: GameSnapshot | undefined;
let effectSerial = 0;
let reconnectDelay = 500;
function connect() {
  const socket = new WebSocket('ws://' + location.host + '/state');
  socket.onopen = () => { reconnectDelay = 500; effectSerial = 0; };
  socket.onclose = () => {
    state = undefined;
    get('mode').textContent = 'ĐANG KẾT NỐI LẠI';
    setTimeout(connect,reconnectDelay);
    reconnectDelay = Math.min(8000, reconnectDelay * 2);
  };
  socket.onmessage = event => update(JSON.parse(String(event.data)) as GameSnapshot);
}

function line(text: string, tag = 'li') {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

function update(next: GameSnapshot) {
  const previous = state;
  state = next;
  if (next.paused && !previous?.paused) skillPausedAt = Date.now();
  updateSkillStatus();
  const mock = next.mode === 'mock';
  const status = { unconfigured: 'CHƯA CẤU HÌNH', connecting: 'ĐANG KẾT NỐI', connected: 'ĐÃ KẾT NỐI', retrying: 'MẤT KẾT NỐI', rejected: 'BỊ TỪ CHỐI' };
  get('mode').textContent = mock ? '● MOCK / OFFLINE' : 'LIVE · ' + status[next.live];
  get('mock-controls').hidden = !mock;
  get('operator-mode').textContent = mock ? 'Mô phỏng bình luận và quà tặng trên máy này.'
    : 'Bình luận và quà tặng đến từ TikTok LIVE.';
  render?.(next);
  const { raid, players } = next;
  get('boss-intro').hidden = raid.phase !== 'SPAWN';
  get('raid-result').hidden = !raid.result;
  if (raid.result) {
    get('result-mode').textContent = 'PHỤ BẢN ' + raid.stage + (raid.practice ? ' · LUYỆN TẬP' : ' · XẾP HẠNG');
    get('result-title').textContent = raid.result === 'victory' ? 'Chiến thắng' : 'Thất bại';
    get('result-reward').textContent = raid.result === 'defeat' ? 'Tập hợp đội hình để thử lại.' :
      raid.practice ? 'Raid luyện tập hoàn tất.' :
      'Người có đóng góp nhận +' + (100 + raid.stage * 20) + ' EXP · +1 mảnh linh thú';
    const contributors = [...players].filter(player => player.contribution > 0)
      .sort((a,b) => b.contribution - a.contribution);
    get('result-contributors').replaceChildren(...contributors.slice(0,3).map(player =>
      line(player.name + ' · ' + player.contribution + ' sát thương')));
  }
  if (previous && previous.raid.phase !== raid.phase && raid.phase === 'SPAWN') audio.play('spawn');
  if (previous && previous.raid.result !== raid.result && raid.result) audio.play(raid.result);
  get('stage').textContent = 'PHỤ BẢN ' + String(raid.stage).padStart(2,'0') + ' · CỔNG HƯ VÔ';
  get('phase').textContent = next.paused ? 'TẠM DỪNG' : phases[raid.phase] + (raid.assisted ? ' · CÓ HỖ TRỢ' : raid.practice ? ' · LUYỆN TẬP' : '');
  get('boss-value').textContent = raid.hp + ' / ' + raid.maxHp;
  get('boss-hp').style.width = 100 * raid.hp / raid.maxHp + '%';
  const wraithHud = get('wraith-hp');
  const targets = raid.phase === 'RESET' ? [] : raid.wraiths ?? [];
  wraithHud.hidden = !targets.some(target => target.hp > 0);
  wraithHud.replaceChildren(...targets.map((target, index) =>
    line('Ảnh Linh ' + (index === 0 ? 'trái' : 'phải') + ' · ' + target.hp + '/' + target.maxHp,'span')));
  for (const [index, side] of ['left','right'].entries()) {
    const button = document.querySelector<HTMLButtonElement>('[data-command="!attack ' + side + '"]');
    if (button) button.hidden = !targets[index]?.hp;
  }
  get('count').textContent = String(players.length).padStart(2,'0');
  get('party').replaceChildren(...players.slice(0,6).map(player => {
    const box = document.createElement('article');
    box.style.setProperty('--element',classes[player.classId].color);
    box.append(line(player.name + ' · Lv.' + player.level,'strong'));
    box.append(line(classes[player.classId].name + (player.pet === null ? '' : ' / ' + pets[player.pet].name + ' Lv.' + (player.petLevels?.[player.pet] ?? 1)),'small'));
    const hp = document.createElement('progress');
    hp.value = player.hp;
    hp.max = maxHp(player);
    hp.setAttribute('aria-label','HP ' + player.name);
    box.append(hp,line('HP ' + player.hp + ' · MP ' + player.mp,'small'));
    return box;
  }));
  get('logs').replaceChildren(...next.logs.slice(0,3).map(log => line(log)));
  const owner = players.find(player => player.id === 'mock:' + username.value.toLowerCase());
  get<HTMLInputElement>('auto').checked = owner?.auto === true;
  get<HTMLInputElement>('auto').disabled = !owner || next.paused;
  const badges = owner ? achievements.filter(achievement => achievement.earned(owner)) : [];
  get('profile-stats').textContent = owner ? 'Lv.' + owner.level + ' · ' + owner.xp + ' EXP · Hệ ' +
    classes[owner.classId].element + ' · ATK ' + attackStats(owner).attack + ' · DEF ' + defenseOf(owner) +
    ' · Chí mạng 1/' + classes[owner.classId].critEvery + ' · Trùng sinh ' + owner.rebirth +
    ' · Đóng góp ' + owner.contribution : 'Chưa có nhân vật';
  get('achievement-count').textContent = badges.length + '/' + achievements.length;
  get('achievements').replaceChildren(...(badges.length
    ? badges.map(achievement => line(achievement.name))
    : [line('Chưa có thành tựu')]));
  const petList = get<HTMLSelectElement>('pet-list');
  petList.replaceChildren(new Option('Chọn linh thú', ''));
  for (let index = 0; index < (owner?.owned ?? 0); index++) {
    const label = pets[index].name + ' Lv.' + (owner?.petLevels?.[index] ?? 1);
    petList.add(new Option(label + (owner?.pet === index ? ' · Đang gọi' : ''), String(index + 1)));
  }
  petList.disabled = !owner?.owned;
  get('pet-shards').textContent = 'Mảnh nâng cấp: ' + Math.max(0, (owner?.shards ?? 0) - pets.length - (owner?.spentPetShards ?? 0));
  (get<HTMLButtonElement>('pet-up')).disabled = !owner || owner.pet === null ||
    (owner.petLevels?.[owner.pet] ?? 1) >= 5 || ['SPAWN','PHASE_1','PHASE_2','ENRAGED'].includes(raid.phase);
  const inventory = get<HTMLSelectElement>('inventory');
  inventory.replaceChildren(new Option('Chọn trang bị', ''));
  for (const id of owner?.inventory ?? []) {
    const item = items[id];
    const worn = owner?.equipment?.[item.slot] === id;
    const bonus = item.attack ? '+' + item.attack + ' ATK' : '+' + item.defense + ' DEF';
    inventory.add(new Option(item.name + ' · ' + bonus + (worn ? ' · Đang dùng' : ''), id));
  }
  inventory.disabled = !owner?.inventory?.length || ['SPAWN','PHASE_1','PHASE_2','ENRAGED'].includes(raid.phase);
  get('ranking').replaceChildren(...(next.leaderboard ?? [...players].sort((a,b) => b.score-a.score).slice(0,8)).map(player => line(player.name + ' · ' + player.score + ' điểm')));
  if (next.effect && effectSerial !== next.effect.serial) {
    effectSerial = next.effect.serial;
    const node = get('effect');
    node.textContent = next.effect.label;
    node.dataset.kind = next.effect.kind ?? 'strike';
    if (previous && previous.raid.result === raid.result) audio.play(next.effect.kind ?? 'strike');
    node.style.color = next.effect.color;
    node.getAnimations().forEach(animation => animation.cancel());
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) node.animate([{ opacity: 0, transform: 'translateY(20px)' },{ opacity: 1, offset: 0.18 },{ opacity: 0, transform: 'translateY(-32px)' }], 950);
    else node.animate([{ opacity: 1 }, { opacity: 0 }], 700);
  }
}
async function post(path: string, body: unknown) {
  try {
    const res = await fetch(path,{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    get('feedback').textContent = res.ok ? 'Đã gửi.' : ({ 429: 'Đang dừng hoặc gửi quá nhanh.', 409: 'Cần có người chơi và Raid đang rảnh.' }[res.status as 429 | 409] ?? 'Yêu cầu bị từ chối.');
    return res.ok;
  } catch { get('feedback').textContent = 'Mất kết nối máy chủ.'; return false; }
}
function emit(payload: object) {
  if (!username.reportValidity()) return;
  const name = username.value;
  return post('/event', { id: crypto.randomUUID(), user: 'mock:' + name.toLowerCase(), name, ...payload });
}
const chat = (text: string) => emit({ kind:'chat', command: text });
form.addEventListener('submit', event => { event.preventDefault(); void chat(command.value); });
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-command]')) button.onclick = () => void chat(button.dataset.command ?? '');
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-admin]')) button.onclick = () => void post('/admin',button.dataset.admin);
get<HTMLSelectElement>('pet-list').onchange = event => {
  const select = event.currentTarget as HTMLSelectElement;
  if (select.value) void chat('!pet ' + select.value);
  select.value = '';
};
const picker = get<HTMLSelectElement>('class');
picker.add(new Option('Chọn hệ', ''));
for (const [id, definition] of Object.entries(classes)) picker.add(new Option(definition.name,id));
username.oninput = () => { if (state) update(state); };
get<HTMLSelectElement>('inventory').onchange = event => {
  const select = event.currentTarget as HTMLSelectElement;
  if (select.value) void chat('!equip ' + select.value);
  select.value = '';
};
picker.onchange = () => { if (picker.value) void chat('!class ' + picker.value); picker.value = ''; };
for (const value of [1,5,10,20,30]) {
  const button = line(value + ' xu','button');
  button.onclick = () => void emit({ kind:'gift', giftId:'mock-' + value, complete:true });
  get('gifts').append(button);
}
get<HTMLInputElement>('auto').onchange = async () => {
  const input = get<HTMLInputElement>('auto');
  if (!await chat('!auto ' + (input.checked ? 'on' : 'off'))) {
    input.checked = state?.players.find(player => player.id === 'mock:' + username.value.toLowerCase())?.auto === true;
  }
};
function updateSkillStatus() {
  const player = state?.players.find(player => player.id === 'mock:' + username.value.toLowerCase());
  const status = get('skill-status');
  if (!player || !state) { status.replaceChildren(); return; }
  const snapshot = state;
  const now = snapshot.paused ? skillPausedAt : Date.now();
  status.replaceChildren(...classes[player.classId].skills.map((name,index) => {
    const seconds = Math.max(0, Math.ceil((player.ready[index] - now) / 1000));
    const readiness = snapshot.paused ? 'Tạm dừng' : player.hp <= 0 ? 'Bị hạ' :
      !['PHASE_1','PHASE_2','ENRAGED'].includes(snapshot.raid.phase) ? 'Chờ trận' :
      seconds > 0 ? seconds + 's' : player.mp < [8,16,30][index] ? 'Thiếu MP' : 'Sẵn sàng';
    return line(name + ' · ' + readiness,'small');
  }));
}
let skillPausedAt = 0;
setInterval(updateSkillStatus,250);
connect();
