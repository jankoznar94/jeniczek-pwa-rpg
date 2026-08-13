// src/types.ts — sdílené typy hry.
// Extrahováno z src/game.ts (Fáze 2). Zatím jen základní struktury podle reálných dat.
// Hra je @ts-nocheck, typy se plně aplikují až po dokončení extrakce.

export type AttrKey = 'str' | 'vit' | 'dex' | 'int';

export type ResourceKey = 'mana' | 'rage' | 'energy';

export interface SpellDef {
  id: string;
  name: string;
  icon: string;
  cost: number;
  cooldown: number;
  gcd: number;
  desc: string;
  needsCombo?: boolean;
  needsPoison?: boolean;
}

export interface ClassDef {
  id: string;
  name: string;
  icon: string;
  resource: ResourceKey;
  resourceName: string;
  maxResource: number;
  startResource: number;
  resourceRegen: number;
  desc: string;
  allowedWeapons: string[];
  allowedShield: boolean;
  allowedOffhand: boolean;
  dualWield: boolean;
  primaryAttr: AttrKey;
  talentSchool: string;
  baseHp: number;
  baseDmg: number;
  baseMana: number;
  attrBonus: Record<AttrKey, number>;
  spells: SpellDef[];
}

export interface MonsterResists {
  fire: number;
  ice: number;
  nature: number;
  lightning: number;
}

export interface MonsterDef {
  face: string;
  name: string;
  type: string;
  attackType: string;
  defense: number;
  resists: MonsterResists;
  hp?: number;
  dmgMin?: number;
  dmgMax?: number;
  attackSpeed?: number;
  blockChance?: number;
  resource?: string;
  maxResource?: number;
  spells?: string[];
  minArea?: number;
  passivePoisonWeapon?: boolean;
}

export interface BossDef {
  name: string;
  face: string;
  hp: number;
  dmgMin?: number;
  dmgMax?: number;
  attackSpeed?: number;
  blockChance?: number;
  resource?: string;
  maxResource?: number;
  spells?: string[];
  types: string[];
  attackType: string;
}

export interface ActLocAffix {
  poisonResist?: number;
  armorMult?: number;
  chillResist?: number;
  frostResist?: number;
  lifestealReduction?: number;
  fireResist?: number;
}

export interface ActDef {
  id: number;
  name: string;
  icon: string;
  theme: number;
  zones: number;
  xpReward: number;
  bossXp: number;
  minLevel: number;
  maxLevel: number;
  boss: BossDef;
  reward: { gold: number };
  resists: MonsterResists;
  monsterDefense: number;
  locAffixes: ActLocAffix[];
}
