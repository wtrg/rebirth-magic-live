import './style.css';
import { classes, pets, maxHp, type GameState } from '../../packages/shared/index.ts';

import { createArena } from './scene.ts';

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const overlay = new URLSearchParams(location.search).has('overlay');
document.body.classList.toggle('overlay', overlay);
const low = get<HTMLInputElement>('low');
low.checked = new URLSearchParams(location.search).get('quality') !== 'high';
let render: ((state: GameState) => void) | undefined;
try {
  render = createArena(get('viewport'), () => low.checked, overlay);
} catch {
  get('notice').textContent = 'WebGL 2 không khả dụng · HUD vẫn đang hoạt động';
}
const phases = { IDLE: 'CHỜ KHAI CHIẾN', SPAWN: 'BOSS XUẤT HIỆN', PHASE_1: 'GIAI ĐOẠN I', PHASE_2: 'GIAI ĐOẠN II', ENRAGED: 'CUỒNG NỘ', DEAD: 'CHIẾN THẮNG', RESET: 'THẤT BẠI' };
const username = get<HTMLInputElement>('username');
const command = get<HTMLInputElement>('command');
const form = get<HTMLFormElement>('chat');
let state: GameState | undefined;
let effectSerial = 0;
let reconnectDelay = 500;
function connect() {
  const socket = new WebSocket('ws://' + location.host + '/state');
  socket.onopen = () => { reconnectDelay = 500; get('mode').textContent = '● MOCK / OFFLINE'; effectSerial = 0; };
  socket.onclose = () => {
    state = undefined;
    get('mode').textContent = 'MOCK · ĐANG KẾT NỐI LẠI';
    setTimeout(connect,reconnectDelay);
    reconnectDelay = Math.min(8000, reconnectDelay * 2);
  };
  socket.onmessage = event => update(JSON.parse(String(event.data)) as GameState);
}

function line(text: string, tag = 'li') {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

function update(next: GameState) {
  state = next;
  render?.(next);
  const { raid, players } = next;
  get('stage').textContent = 'PHỤ BẢN ' + String(raid.stage).padStart(2,'0') + ' · CỔNG HƯ VÔ';
  get('phase').textContent = next.paused ? 'TẠM DỪNG' : phases[raid.phase];
  get('boss-value').textContent = raid.hp + ' / ' + raid.maxHp;
  get('boss-hp').style.width = 100 * raid.hp / raid.maxHp + '%';
  get('count').textContent = String(players.length).padStart(2,'0');
  get('party').replaceChildren(...players.slice(0,6).map(player => {
    const box = document.createElement('article');
    box.style.setProperty('--element',classes[player.classId].color);
    box.append(line(player.name + ' · Lv.' + player.level,'strong'));
    box.append(line(classes[player.classId].name + (player.pet === null ? '' : ' / ' + pets[player.pet].name),'small'));
    const hp = document.createElement('progress');
    hp.value = player.hp;
    hp.max = maxHp(player);
    hp.setAttribute('aria-label','HP ' + player.name);
    box.append(hp,line('HP ' + player.hp + ' · MP ' + player.mp,'small'));
    return box;
  }));
  get('logs').replaceChildren(...next.logs.slice(0,3).map(log => line(log)));
  get('ranking').replaceChildren(...[...players].sort((a,b) => b.score-a.score).slice(0,8).map(player => line(player.name + ' · ' + player.score + ' điểm')));
  if (next.effect && effectSerial !== next.effect.serial) {
    effectSerial = next.effect.serial;
    const node = get('effect');
    node.textContent = next.effect.label;
    node.style.color = next.effect.color;
    node.getAnimations().forEach(animation => animation.cancel());
    node.animate([{ opacity: 0, transform: 'translateY(20px)' },{ opacity: 1, offset: 0.18 },{ opacity: 0, transform: 'translateY(-32px)' }], 950);
  }
}
async function post(path: string, body: unknown) {
  try {
    const res = await fetch(path,{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    get('feedback').textContent = res.ok ? 'Đã gửi.' : ({ 429: 'Đang dừng hoặc gửi quá nhanh.', 409: 'Cần có người chơi và Raid đang rảnh.' }[res.status as 429 | 409] ?? 'Yêu cầu bị từ chối.');
  } catch { get('feedback').textContent = 'Mất kết nối máy chủ.'; }
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
const picker = get<HTMLSelectElement>('class');
picker.add(new Option('Chọn hệ', ''));
for (const [id, definition] of Object.entries(classes)) picker.add(new Option(definition.name,id));
picker.onchange = () => { if (picker.value) void chat('!class ' + picker.value); picker.value = ''; };
for (const value of [1,5,10,20,30]) {
  const button = line(value + ' xu','button');
  button.onclick = () => void emit({ kind:'gift', giftId:'mock-' + value, complete:true });
  get('gifts').append(button);
}
if (!overlay) setInterval(() => {
  if (!get<HTMLInputElement>('auto').checked || !state || state.paused || !['PHASE_1','PHASE_2','ENRAGED'].includes(state.raid.phase)) return;
  const player = state.players.find(player => player.id === 'mock:' + username.value.toLowerCase());
  if (player && player.hp > 0) {
    const index = [2,1,0].find(index => player.ready[index] <= Date.now() && player.mp >= [8,16,30][index]);
    void chat(index === undefined ? '!attack' : ['!skill1','!skill2','!ult'][index]);
  }
}, 650);
connect();
