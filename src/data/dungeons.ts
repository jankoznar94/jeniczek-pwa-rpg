// src/data/dungeons.ts — dungeon směry a vizuální témata.
// Extrahováno z src/game.ts (Fáze 2). Čistá data bez closure závislostí.

  export const DIRECTIONS = ['⬆️','⬇️','⬅️','➡️'];

  export const DUNGEON_THEME_FILTERS = [
    '', '', '', '', '', '', '', '', '', '', '', '',
  ];

  export const DUNGEON_THEMES = [
    { bg:'#0d2d0d', border:'#2ecc71', borderGlow:'rgba(46,204,113,0.3)' },   // 0 Act 1: Enchanted Forest — zelená
    { bg:'#2a1a08', border:'#e67e22', borderGlow:'rgba(230,126,34,0.3)' },   // 1 Act 2: Desert Realm — pískově oranžová
    { bg:'#1a0d2a', border:'#b07cd8', borderGlow:'rgba(176,124,216,0.3)' },  // 2 Act 4: Undead Lands — fialová
    { bg:'#2d0d0d', border:'#e74c3c', borderGlow:'rgba(231,76,60,0.3)' },    // 3 Act 5: Hellish Wastes — červená jako láva
    { bg:'#0d122d', border:'#4a9eff', borderGlow:'rgba(74,158,255,0.3)' },  // 4 Act 3: Frost Peaks — ledově modrá
  ];
