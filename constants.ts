
import { Difficulty, ZombieType, Inventory, UpgradeOption } from "./types";

export const GAME_CONFIG = {
  FPS: 60,
  WORLD_SIZE: { W: 3000, H: 3000 },
  PLAYER_SPEED_BASE: 4,
  PLAYER_RADIUS: 14, // Slightly larger for the soldier model
  PLAYER_COLOR: '#3b82f6', 
  PLAYER_HP_BASE: 100,
  
  // Visuals
  BLOOD_COLOR: '#881337',
  
  XP_BASE_REQ: 20,
  XP_GROWTH_FACTOR: 1.3,
  MAGNET_RADIUS_BASE: 100,
  ORBITAL_RADIUS_BASE: 80,

  COLORS: {
    BG: '#050510',
    GRID: '#1e293b',
    XP_ORB: '#8b5cf6',
    XP_ORB_RARE: '#ec4899',
    ORBITAL: '#06b6d4',
    ORBITAL_EVO: '#f472b6',
    BULLET: '#facc15',
    BULLET_EVO: '#ef4444',
    DRONE: '#38bdf8',
    DRAGON: '#f97316',
    MISSILE: '#94a3b8',
    LIGHTNING: '#c084fc',
    MINE: '#ef4444',
    AXE: '#d946ef',
  }
};

// Centralized Weapon Balance (Target DPS ~30-40 at Lv1)
export const WEAPON_STATS = {
  GUN:       { damage: 25, rate: 500, speed: 16 }, // DPS: 50 (Manual aim bonus)
  DRONE:     { damage: 45, rate: 1500, range: 600, speed: 18 }, // DPS: 30 (Sniper)
  DRAGON:    { damage: 6, rate: 120, range: 200, speed: 8, duration: 35 }, // DPS: 50 (Short range flamethrower)
  MISSILE:   { damage: 60, rate: 3000, speed: 7, area: 140 }, // DPS: 20 (Area damage bonus)
  LIGHTNING: { damage: 150, rate: 3500 }, // DPS: ~42
  MINE:      { damage: 100, rate: 2500, area: 120 }, // DPS: 40
  AXE:       { damage: 45, rate: 1500, speed: 12, duration: 100 }, // DPS: 30
  ORBITAL:   { damage: 15, speed: 0.04 }
};

export const DIFFICULTY_CONFIG = {
  [Difficulty.EASY]: { spawnRate: 0.7, enemyHp: 0.7, enemySpeed: 0.8, scoreMult: 0.5 },
  [Difficulty.NORMAL]: { spawnRate: 1.0, enemyHp: 1.0, enemySpeed: 1.0, scoreMult: 1.0 },
  [Difficulty.HARD]: { spawnRate: 1.5, enemyHp: 1.5, enemySpeed: 1.2, scoreMult: 2.0 },
};

export const ZOMBIE_STATS: Record<ZombieType, { hp: number, speed: number, radius: number, color: string, xp: number, score: number }> = {
  NORMAL: { hp: 35, speed: 1.5, radius: 16, color: '#4ade80', xp: 5, score: 10 },
  FAST:   { hp: 20, speed: 3.2, radius: 14, color: '#fb923c', xp: 8, score: 20 },
  TANK:   { hp: 200, speed: 0.8, radius: 28, color: '#ef4444', xp: 30, score: 50 },
  WOLF:   { hp: 15, speed: 4.2, radius: 12, color: '#94a3b8', xp: 10, score: 25 },
  GIANT:  { hp: 600, speed: 0.6, radius: 45, color: '#7f1d1d', xp: 100, score: 100 },
  CRAWLER:{ hp: 30, speed: 2.2, radius: 14, color: '#2dd4bf', xp: 15, score: 30 },
  PARASITE:{ hp: 80, speed: 1.2, radius: 22, color: '#a3e635', xp: 15, score: 40 },
  PARASITE_SMALL: { hp: 10, speed: 3.5, radius: 8, color: '#bef264', xp: 2, score: 5 },
};

export const MAX_LEVEL = 5;

export const UPGRADE_DEFINITIONS: UpgradeOption[] = [
  // --- BASE STATS ---
  {
    id: 'fireRate',
    title: '急速冷却',
    description: '主武器攻击冷却时间减少 15%。',
    evoDescription: '【进化】加特林模式：射速极大提升，变为连续光束。',
    rarity: 'COMMON'
  },
  {
    id: 'multishot',
    title: '多重影分身',
    description: '主武器增加 1 发额外的子弹。',
    evoDescription: '【进化】死神新星：向四面八方同时发射弹幕。',
    rarity: 'LEGENDARY'
  },
  {
    id: 'damage',
    title: '高爆弹药',
    description: '所有伤害增加 20%。',
    evoDescription: '【进化】泰坦杀手：极高的伤害，并附带强力击退。',
    rarity: 'COMMON'
  },
  {
    id: 'speed',
    title: '机械骨骼',
    description: '移动速度增加 10%。',
    evoDescription: '【进化】量子推进：移动速度突破极限。',
    rarity: 'COMMON'
  },
  {
    id: 'maxHp',
    title: '纳米装甲',
    description: '最大生命值增加 20%。',
    evoDescription: '【进化】不朽之躯：生命上限翻倍。',
    rarity: 'RARE'
  },
  {
    id: 'regen',
    title: '生物修复',
    description: '每秒恢复 1 点生命值。',
    evoDescription: '【进化】金刚狼因子：生命恢复速度大幅提升。',
    rarity: 'RARE'
  },
  {
    id: 'magnet',
    title: '引力场',
    description: '经验拾取范围增加 30%。',
    evoDescription: '【进化】黑洞发生器：拾取范围覆盖大半个屏幕。',
    rarity: 'COMMON'
  },

  // --- WEAPONS ---
  {
    id: 'orbitals',
    title: '等离子护盾',
    description: '召唤环绕自身的能量球。',
    evoDescription: '【进化】锯齿光环：护盾范围翻倍，旋转速度翻倍，伤害翻倍。',
    rarity: 'RARE'
  },
  {
    id: 'drone',
    title: '狙击无人机',
    description: '召唤无人机，周期性对最近敌人造成高额伤害。',
    evoDescription: '【进化】蜂群协议：无人机攻速翻倍，并能同时攻击两个目标。',
    rarity: 'RARE'
  },
  {
    id: 'dragon',
    title: '龙之契约',
    description: '召唤幼龙，对近距离敌人喷射持续烈焰。',
    evoDescription: '【进化】地狱之火：幼龙成长为巨龙，喷射毁灭性龙息。',
    rarity: 'LEGENDARY'
  },
  {
    id: 'missile',
    title: '微型导弹',
    description: '周期性发射追踪导弹，造成范围爆炸。',
    evoDescription: '【进化】核子打击：导弹爆炸范围极大，并留下辐射区域。',
    rarity: 'RARE'
  },
  {
    id: 'lightning',
    title: '雷霆发生器',
    description: '周期性降下闪电，造成高额固定伤害。',
    evoDescription: '【进化】雷神之怒：闪电频率极快，并连锁攻击。',
    rarity: 'RARE'
  },
  {
    id: 'mine',
    title: '感应地雷',
    description: '在身后放置地雷，敌人踩中后爆炸。',
    evoDescription: '【进化】虚空陷阱：地雷会先将敌人吸入中心再爆炸。',
    rarity: 'COMMON'
  },
  {
    id: 'axe',
    title: '回旋战斧',
    description: '投掷一把巨大的战斧，攻击路径上的敌人并飞回。',
    evoDescription: '【进化】死亡螺旋：战斧体积变大，且不再消失，围绕玩家无限旋转。',
    rarity: 'COMMON'
  },
];