export const classes = {
  fire: { name: 'Hỏa Pháp Sư', color: '#ff7953', attack: 29, defense: 4, element: 'Hỏa', critEvery: 6, skills: ['Hỏa Tiễn', 'Bão Lửa', 'Nhật Thực'] },
  ice: { name: 'Băng Pháp Sư', color: '#7ce2ff', attack: 25, defense: 7, element: 'Băng', critEvery: 7, skills: ['Băng Châm', 'Đóng Băng', 'Bạch Hàn'] },
  thunder: { name: 'Lôi Pháp Sư', color: '#d6a6ff', attack: 32, defense: 3, element: 'Lôi', critEvery: 4, skills: ['Lôi Kích', 'Hồ Quang', 'Thiên Lôi'] },
  knight: { name: 'Ma Kiếm Sĩ', color: '#fb9cb8', attack: 27, defense: 11, element: 'Ma', critEvery: 6, skills: ['Kiếm Khí', 'Hộ Kiếm', 'Ma Kiếm Trận'] },
  healer: { name: 'Thánh Thuật Sư', color: '#ffe289', attack: 22, defense: 6, element: 'Thánh', critEvery: 7, skills: ['Thánh Quang', 'Hồi Sinh Lực', 'Bình Minh'] },
  summon: { name: 'Triệu Hồi Sư', color: '#87f0be', attack: 24, defense: 5, element: 'Linh', critEvery: 6, skills: ['Linh Ấn', 'Cộng Hưởng', 'Linh Thú Trận'] },
} as const;
export const pets = [
  { name: 'Hỏa Hồ', color: '#ff985c', attack: 6, skill: 'Hỏa Vĩ' },
  { name: 'Băng Vũ', color: '#83dcff', attack: 8, skill: 'Băng Dực' },
  { name: 'Lôi Miêu', color: '#d49bff', attack: 10, skill: 'Lôi Tức' },
] as const;
export const items = {
  ember: { name: 'Trượng Tàn Hỏa', slot: 'weapon', attack: 4, defense: 0, wins: 1 },
  aegis: { name: 'Giáp Hư Vô', slot: 'armor', attack: 0, defense: 3, wins: 2 },
  eclipse: { name: 'Trượng Nhật Thực', slot: 'weapon', attack: 7, defense: 0, wins: 3 },
} as const;
export type ItemId = keyof typeof items;
export type ItemSlot = (typeof items)[ItemId]['slot'];
export type ClassId = keyof typeof classes;
export type Player = {
  id: string; name: string; classId: ClassId; level: number; xp: number; hp: number;
  mp: number; rebirth: number; wins: number; score: number; shards: number; owned: number;
  attackCount?: number; guard?: boolean;
  petLevels?: number[]; spentPetShards?: number;
  inventory?: ItemId[]; equipment?: Partial<Record<ItemSlot, ItemId>>;
  pet: number | null; ready: number[]; contribution: number; lastHit: number;
};
export const achievements = [
  { id: 'first-clear', name: 'Hạ Boss đầu tiên', earned: (p: Player) => p.wins >= 1 },
  { id: 'raid-veteran', name: 'Cựu binh Raid', earned: (p: Player) => p.wins >= 10 },
  { id: 'armory', name: 'Bậc thầy trang bị', earned: (p: Player) => Object.keys(items).every(id => p.inventory?.includes(id as ItemId)) },
  { id: 'menagerie', name: 'Sưu tập linh thú', earned: (p: Player) => p.owned >= pets.length },
  { id: 'bond', name: 'Linh thú cấp 5', earned: (p: Player) => p.petLevels?.some(level => level >= 5) ?? false },
  { id: 'reborn', name: 'Tái sinh', earned: (p: Player) => p.rebirth >= 1 },
] as const;

export type Phase = 'IDLE' | 'SPAWN' | 'PHASE_1' | 'PHASE_2' | 'ENRAGED' | 'DEAD' | 'RESET';
export type Raid = {
  phase: Phase; hp: number; maxHp: number; stage: number; next: number;
  controlMs?: number;
  practice: boolean;
  usedGifts: string[];
  supportPet: { player: string; until: number } | null;
  awakening: { player: string; until: number } | null;
  wardUntil: number;
  result: 'victory' | 'defeat' | null; assisted: boolean;
};
export type LiveStatus = 'unconfigured' | 'connecting' | 'connected' | 'retrying' | 'rejected';
export type GameSnapshot = GameState & { mode: 'mock' | 'live'; live: LiveStatus };
export type EffectKind = 'strike' | 'skill' | 'ultimate' | 'boss' | 'gift';
export type GameState = {
  raid: Raid; players: Player[]; logs: string[]; paused: boolean;
  effect: { serial: number; label: string; color: string; kind?: EffectKind } | null;
};
export type GameEvent = { id: string; user: string; name: string } & (
  { kind: 'chat'; command: string } | { kind: 'gift'; giftId: string; complete: boolean }
);

export const maxHp = (player: Player) => 120 + 12 * (player.level - 1) + player.rebirth * 6;
