// src/data/acts.ts — definice actů (zón) a bossů.
// Extrahováno z src/game.ts (Fáze 2). Referencuje MONSTER_TYPES a ATTACK_TYPES.
import { MONSTER_TYPES, ATTACK_TYPES } from './monsters';

export const ACTS = [
  { id:0, name:'Enchanted Forest', icon:'🌲', theme:0, zones:10, xpReward:10, bossXp:30, minLevel:1, maxLevel:3,
    boss:{name:'Forest Lord',face:'assets/monsters/forest_lord.png',hp:500,dmgMin:12,dmgMax:18,attackSpeed:1800,blockChance:0,resource:'mana',maxResource:200,spells:['thorn_shield','faerie_fire','poison_bolt'],types:[MONSTER_TYPES.MANASTEALER,MONSTER_TYPES.LIFESTEALER],attackType:ATTACK_TYPES.CASTER},
    reward:{gold:5}, resists:{fire:1.0, ice:1.0, nature:1.0}, monsterDefense:10,
    locAffixes:[
      { poisonResist:0.5 },   // Normal
      { poisonResist:0.75 },  // Nightmare
      { poisonResist:1.0 },   // Hell
    ] },
  { id:1, name:'Desert Realm', icon:'🏜️', theme:1, zones:10, xpReward:16, bossXp:50, minLevel:4, maxLevel:6,
    boss:{name:'Pharaoh',face:'assets/monsters/desert_pharaoh.png',hp:14,types:[MONSTER_TYPES.MANASTEALER],attackType:ATTACK_TYPES.CASTER},
    reward:{gold:12}, resists:{fire:1.5, ice:0.5, nature:1.0}, monsterDefense:20,
    locAffixes:[
      { armorMult:1.5 },   // Normal
      { armorMult:1.75 },  // Nightmare
      { armorMult:2.0 },   // Hell
    ] },
  { id:2, name:'Frost Peaks', icon:'❄️', theme:4, zones:10, xpReward:24, bossXp:70, minLevel:7, maxLevel:9,
    boss:{name:'Frost Giant',face:'assets/monsters/frost_giant.png',hp:16,types:[MONSTER_TYPES.CRITMASTER],attackType:ATTACK_TYPES.MELEE},
    reward:{gold:15}, resists:{fire:1.5, ice:0.5, nature:1.0}, monsterDefense:35,
    locAffixes:[
      { chillResist:0.5, frostResist:0.25 },   // Normal
      { chillResist:0.75, frostResist:0.5 },   // Nightmare
      { chillResist:1.0, frostResist:0.75 },   // Hell
    ] },
  { id:3, name:'Undead Lands', icon:'🦴', theme:2, zones:10, xpReward:40, bossXp:130, minLevel:10, maxLevel:12,
    boss:{name:'Lich',face:'assets/monsters/lich.png',hp:22,types:[MONSTER_TYPES.MANASTEALER],attackType:ATTACK_TYPES.CASTER},
    reward:{gold:25}, resists:{fire:0.5, ice:1.0, nature:1.5}, monsterDefense:55,
    locAffixes:[
      { lifestealReduction:0.5 },   // Normal
      { lifestealReduction:0.75 },  // Nightmare
      { lifestealReduction:1.0 },   // Hell
    ] },
  { id:4, name:'Hellish Wastes', icon:'🔥', theme:3, zones:10, xpReward:50, bossXp:180, minLevel:13, maxLevel:15,
    boss:{name:'Lava Dragon',face:'assets/monsters/lava_dragon.png',hp:26,types:[MONSTER_TYPES.CRITMASTER],attackType:ATTACK_TYPES.CASTER},
    reward:{gold:30}, resists:{fire:0.5, ice:1.5, nature:0.75}, monsterDefense:80,
    locAffixes:[
      { fireResist:0.5 },   // Normal
      { fireResist:0.75 },  // Nightmare
      { fireResist:1.0 },   // Hell
    ] },
];
