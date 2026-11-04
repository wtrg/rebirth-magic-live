export const classes = {
  fire: { name: 'Hỏa Pháp Sư', color: '#ff7953', attack: 29, defense: 4, skills: ['Hỏa Tiễn', 'Bão Lửa', 'Nhật Thực'] },
  ice: { name: 'Băng Pháp Sư', color: '#7ce2ff', attack: 25, defense: 7, skills: ['Băng Châm', 'Đóng Băng', 'Bạch Hàn'] },
  thunder: { name: 'Lôi Pháp Sư', color: '#d6a6ff', attack: 32, defense: 3, skills: ['Lôi Kích', 'Hồ Quang', 'Thiên Lôi'] },
  knight: { name: 'Ma Kiếm Sĩ', color: '#fb9cb8', attack: 27, defense: 11, skills: ['Kiếm Khí', 'Hộ Kiếm', 'Ma Kiếm Trận'] },
  healer: { name: 'Thánh Thuật Sư', color: '#ffe289', attack: 22, defense: 6, skills: ['Thánh Quang', 'Hồi Sinh Lực', 'Bình Minh'] },
  summon: { name: 'Triệu Hồi Sư', color: '#87f0be', attack: 24, defense: 5, skills: ['Linh Ấn', 'Cộng Hưởng', 'Linh Thú Trận'] },
} as const;
export const pets = [
  { name: 'Hỏa Hồ', color: '#ff985c', attack: 6 },
  { name: 'Băng Vũ', color: '#83dcff', attack: 8 },
  { name: 'Lôi Miêu', color: '#d49bff', attack: 10 },
] as const;
export type ClassId = keyof typeof classes;
export type Player = {
  id: string; name: string; classId: ClassId; level: number; xp: number; hp: number;
  mp: number; rebirth: number; wins: number; score: number; shards: number; owned: number;
  pet: number | null; ready: number[]; contribution: number; lastHit: number;
};
export type Phase = 'IDLE' | 'SPAWN' | 'PHASE_1' | 'PHASE_2' | 'ENRAGED' | 'DEAD' | 'RESET';
export type Raid = {
  phase: Phase; hp: number; maxHp: number; stage: number; next: number; furyUntil: number;
  result: 'victory' | 'defeat' | null; assisted: boolean;
};
export type GameState = {
  raid: Raid; players: Player[]; logs: string[]; paused: boolean;
  effect: { serial: number; label: string; color: string } | null;
};
export type GameEvent = { id: string; user: string; name: string } & (
  { kind: 'chat'; command: string } | { kind: 'gift'; giftId: string; complete: boolean }
);

export const maxHp = (player: Player) => 120 + 12 * (player.level - 1) + player.rebirth * 6;
