// src/data/gems.ts — gemy, kvality a quality barvy.
// Extrahováno z src/game.ts (Fáze 2). Čistá data bez closure závislostí.

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
        chipped: { name: 'Chipped Ruby', weapon: { fireDmg: [1,3] }, armor: { bonusHp: 8 } },
        flawed: { name: 'Flawed Ruby', weapon: { fireDmg: [2,5] }, armor: { bonusHp: 15 } },
        normal: { name: 'Ruby', weapon: { fireDmg: [3,6] }, armor: { bonusHp: 20 } },
        flawless: { name: 'Flawless Ruby', weapon: { fireDmg: [6,12] }, armor: { bonusHp: 40 } },
        perfect: { name: 'Perfect Ruby', weapon: { fireDmg: [12,20] }, armor: { bonusHp: 80 } }
      }
    },
    sapphire: {
      name: 'Sapphire',
      icon: '🔵',
      qualities: {
        chipped: { name: 'Chipped Sapphire', weapon: { coldDmg: [1,3] }, armor: { bonusMana: 8 } },
        flawed: { name: 'Flawed Sapphire', weapon: { coldDmg: [2,5] }, armor: { bonusMana: 15 } },
        normal: { name: 'Sapphire', weapon: { coldDmg: [3,6] }, armor: { bonusMana: 20 } },
        flawless: { name: 'Flawless Sapphire', weapon: { coldDmg: [6,12] }, armor: { bonusMana: 40 } },
        perfect: { name: 'Perfect Sapphire', weapon: { coldDmg: [12,20] }, armor: { bonusMana: 80 } }
      }
    },
    emerald: {
      name: 'Emerald',
      icon: '🟢',
      qualities: {
        chipped: { name: 'Chipped Emerald', weapon: { poisonDmg: [1,3], poisonDur: 2 }, armor: { attackRating: 8 } },
        flawed: { name: 'Flawed Emerald', weapon: { poisonDmg: [2,5], poisonDur: 3 }, armor: { attackRating: 15 } },
        normal: { name: 'Emerald', weapon: { poisonDmg: [3,6], poisonDur: 3 }, armor: { attackRating: 20 } },
        flawless: { name: 'Flawless Emerald', weapon: { poisonDmg: [6,12], poisonDur: 4 }, armor: { attackRating: 40 } },
        perfect: { name: 'Perfect Emerald', weapon: { poisonDmg: [12,20], poisonDur: 5 }, armor: { attackRating: 80 } }
      }
    },
    topaz: {
      name: 'Topaz',
      icon: '🟡',
      qualities: {
        chipped: { name: 'Chipped Topaz', weapon: { lightningDmg: [1,3] }, armor: { magicFind: 5 } },
        flawed: { name: 'Flawed Topaz', weapon: { lightningDmg: [2,5] }, armor: { magicFind: 8 } },
        normal: { name: 'Topaz', weapon: { lightningDmg: [3,6] }, armor: { magicFind: 10 } },
        flawless: { name: 'Flawless Topaz', weapon: { lightningDmg: [6,12] }, armor: { magicFind: 20 } },
        perfect: { name: 'Perfect Topaz', weapon: { lightningDmg: [12,20] }, armor: { magicFind: 35 } }
      }
    }
  };

  export const GEM_QUALITIES = ['chipped', 'flawed', 'normal', 'flawless', 'perfect'];
