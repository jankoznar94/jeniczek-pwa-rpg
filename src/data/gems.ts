// src/data/gems.ts — gemy, kvality a quality barvy.
// Extrahováno z src/game.ts (Fáze 2). Čistá data bez closure závislostí.
// Staty gemů dle D2 (tables/d2-gems.csv).

  export const QUALITY_COLORS = {
    normal: '#888',
    magic: '#4a7dff',
    rare: '#ffd700',
    unique: '#b8860b'
  };

  // Socket chance pro normal quality itemy
  export const SOCKET_CHANCE_NORMAL = 0.25;

  export const GEMS = {
    ruby: {
      name: 'Ruby',
      icon: '🔴',
      qualities: {
        chipped: { name: 'Chipped Ruby', weapon: { fireDmg: [3,4] }, armor: { bonusHp: 10 } },
        flawed: { name: 'Flawed Ruby', weapon: { fireDmg: [5,8] }, armor: { bonusHp: 17 } },
        normal: { name: 'Ruby', weapon: { fireDmg: [8,12] }, armor: { bonusHp: 24 } },
        flawless: { name: 'Flawless Ruby', weapon: { fireDmg: [10,16] }, armor: { bonusHp: 31 } },
        perfect: { name: 'Perfect Ruby', weapon: { fireDmg: [15,20] }, armor: { bonusHp: 38 } }
      }
    },
    sapphire: {
      name: 'Sapphire',
      icon: '🔵',
      qualities: {
        chipped: { name: 'Chipped Sapphire', weapon: { coldDmg: [1,3] }, armor: { bonusMana: 10 } },
        flawed: { name: 'Flawed Sapphire', weapon: { coldDmg: [3,5] }, armor: { bonusMana: 17 } },
        normal: { name: 'Sapphire', weapon: { coldDmg: [4,7] }, armor: { bonusMana: 24 } },
        flawless: { name: 'Flawless Sapphire', weapon: { coldDmg: [6,10] }, armor: { bonusMana: 31 } },
        perfect: { name: 'Perfect Sapphire', weapon: { coldDmg: [10,14] }, armor: { bonusMana: 38 } }
      }
    },
    emerald: {
      name: 'Emerald',
      icon: '🟢',
      qualities: {
        chipped: { name: 'Chipped Emerald', weapon: { poisonDmg: [10,10], poisonDur: 3 }, armor: { dex: 3 } },
        flawed: { name: 'Flawed Emerald', weapon: { poisonDmg: [20,20], poisonDur: 4 }, armor: { dex: 4 } },
        normal: { name: 'Emerald', weapon: { poisonDmg: [40,40], poisonDur: 5 }, armor: { dex: 6 } },
        flawless: { name: 'Flawless Emerald', weapon: { poisonDmg: [60,60], poisonDur: 6 }, armor: { dex: 8 } },
        perfect: { name: 'Perfect Emerald', weapon: { poisonDmg: [100,100], poisonDur: 7 }, armor: { dex: 10 } }
      }
    },
    topaz: {
      name: 'Topaz',
      icon: '🟡',
      qualities: {
        chipped: { name: 'Chipped Topaz', weapon: { lightningDmg: [1,8] }, armor: { magicFind: 9 } },
        flawed: { name: 'Flawed Topaz', weapon: { lightningDmg: [1,14] }, armor: { magicFind: 13 } },
        normal: { name: 'Topaz', weapon: { lightningDmg: [1,22] }, armor: { magicFind: 16 } },
        flawless: { name: 'Flawless Topaz', weapon: { lightningDmg: [1,30] }, armor: { magicFind: 20 } },
        perfect: { name: 'Perfect Topaz', weapon: { lightningDmg: [1,40] }, armor: { magicFind: 24 } }
      }
    }
  };

  export const GEM_QUALITIES = ['chipped', 'flawed', 'normal', 'flawless', 'perfect'];
