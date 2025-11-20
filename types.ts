
export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  LEVEL_UP = 'LEVEL_UP',
  GAME_OVER = 'GAME_OVER',
}

export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
}

export interface Point {
  x: number;
  y: number;
}

export interface Entity extends Point {
  id: string;
  radius: number;
  color: string;
}

export interface Player extends Entity {
  angle: number;
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  nextLevelXp: number;
}

export type ZombieType = 'NORMAL' | 'FAST' | 'TANK' | 'WOLF' | 'GIANT' | 'CRAWLER' | 'PARASITE' | 'PARASITE_SMALL';

export interface Zombie extends Entity {
  speed: number;
  hp: number;
  maxHp: number;
  type: ZombieType;
  opacity?: number;
}

export interface Bullet extends Entity {
  vx: number;
  vy: number;
  damage: number;
  duration?: number;
  isOrbital?: boolean;
  piercing?: number;
  knockback?: number;
  // New weapon props
  homing?: boolean; // For missile
  targetId?: string; // For homing
  isMine?: boolean; // For mines
  isBoomerang?: boolean; // For axe
  returnToPlayer?: boolean; // For axe returning phase
}

export interface Minion extends Entity {
    type: 'DRONE' | 'DRAGON';
    lastFire: number;
    angle: number; // Facing angle
    targetId?: string;
}

export interface XPOrb extends Entity {
  value: number;
  vx: number;
  vy: number;
}

export interface Particle extends Entity {
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  alpha: number;
}

export interface Inventory {
  // Original
  fireRate: number;
  multishot: number;
  orbitals: number;
  damage: number;
  speed: number;
  maxHp: number;
  regen: number;
  magnet: number;

  // New Weapons
  drone: number;      // Summon autonomous drone
  dragon: number;     // Summon fire-breathing pet
  missile: number;    // Homing explosive
  lightning: number;  // Random area strikes
  mine: number;       // Dropped explosives
  axe: number;        // Boomerang
}

export type UpgradeType = keyof Inventory;

export interface UpgradeOption {
  id: UpgradeType;
  title: string;
  description: string;
  evoDescription?: string;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY' | 'EVOLUTION';
  isMaxed?: boolean;
}

export interface GameStats {
  score: number;
  kills: number;
  wave: number;
  timeSurvived: number;
  level: number;
  inventory: Inventory;
  difficulty: Difficulty;
}
