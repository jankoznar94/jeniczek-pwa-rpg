// src/data/classes.ts — definice tříd a skill tree.
// Extrahováno z src/game.ts (Fáze 2). Čistá data bez closure závislostí.

  export const CLASSES = {
    barbarian: {
      id:'barbarian', name:'Barbarian', icon:'🪓',
      resource:'mana', resourceName:'💧 Mana', maxResource:100, startResource:100,
      resourceRegen:0.3,
      desc:'Mana scales with INT and gear. Strong physical attacks and battle cries.',
      allowedWeapons:['blade','fists','blunt','axe','claws'],
      allowedShield:true,
      allowedOffhand:true,
      dualWield:true,
      primaryAttr:'str',
      talentSchool:'physical',
      baseHp:40, baseDmg:5, baseMana:10, manaPerLevel:1,
      attrBonus:{str:20, vit:25, dex:15, int:10},
      spells: [
        { id:'heroicStrike', name:'Heroic Strike', icon:'⚡', cost:3, cooldown:0, gcd:0.5, desc:'150% dmg on next swing' },
        { id:'thunderClap', name:'Thunder Clap', icon:'🌊', cost:4, cooldown:15, gcd:0.5, desc:'30% dmg + slow enemy 10% for 10s' },
        { id:'thunderBolt', name:'Thunder Bolt', icon:'⚡', cost:6, cooldown:30, gcd:0.5, desc:'120% dmg + stun 5s' },
        { id:'battleShout', name:'Battle Shout', icon:'📯', cost:3, cooldown:10, gcd:0.5, desc:'+15% dmg for 30s' },
        { id:'defensiveShout', name:'Defensive Shout', icon:'🛡️', cost:3, cooldown:10, gcd:0.5, desc:'+50% armor for 30s' },
        { id:'doubleSwing', name:'Double Swing', icon:'⚔️', cost:2, cooldown:0, gcd:0, desc:'150% dmg with both weapons + reset swing timers' },
        { id:'shieldSlam', name:'Shield Slam', icon:'🛡️', iconImg:'shield_bash.png', cost:4, cooldown:8, gcd:0.5, needsShield:true, desc:'Shield dmg + slow enemy 25% for 3s' },
        { id:'pummel', name:'Pummel', icon:'👊', cost:2, cooldown:8, gcd:0.5, desc:'Interrupts enemy cast + blocks recast' },
        { id:'spellReflect', name:'Spell Reflect', icon:'🪞', cost:5, cooldown:8, gcd:0.5, needsShield:true, desc:'Reflects offensive enemy spell back at them' },
        { id:'whirlwind', name:'Whirlwind', icon:'🌀', iconImg:'whirlwind.png', cost:5, cooldown:20, gcd:0.5, desc:'Pause & unleash a spinning flurry — press the shown button per strike, land up to 5' },
        { id:'frenzy', name:'Frenzy', icon:'⚔️', iconImg:'frenzy.png', cost:8, cooldown:0, gcd:0.5, desc:'20% dmg + AR on next swing; +attack speed per stack (max 5) for 10s' }
      ]
    },
    assassin: {
      id:'assassin', name:'Assassin', icon:'🗡️',
      resource:'mana', resourceName:'💧 Mana', maxResource:100, startResource:100,
      resourceRegen:0.3,
      desc:'Mana scales with INT and gear. Fast precise attacks.',
      allowedWeapons:['blade','fists','claws'],
      allowedShield:false,
      allowedOffhand:false,
      dualWield:true,
      primaryAttr:'dex',
      talentSchool:'physical',
      baseHp:30, baseDmg:4, baseMana:25, manaPerLevel:1.5,
      attrBonus:{str:15, vit:20, dex:25, int:10},
      spells: [
        { id:'sinisterStrike', name:'Sinister Strike', icon:'🗡️', cost:40, cooldown:0, gcd:0.5, desc:'150% dmg + 1 combo point' },
        { id:'eviscerate', name:'Eviscerate', icon:'💥', cost:30, cooldown:0, gcd:0.5, needsCombo:true, desc:'Damage based on combo points (1:150%–5:350%)' },
        { id:'kidneyShot', name:'Kidney Shot', icon:'🔨', cost:35, cooldown:20, gcd:0.5, needsCombo:true, desc:'Stun based on combo points (1:1s–5:5s)' },
        { id:'evasion', name:'Evasion', icon:'💨', cost:50, cooldown:60, gcd:0.5, desc:'+50% dodge for 10s' },
        { id:'speedBoost', name:'Speed Boost', icon:'⚡', cost:30, cooldown:0, gcd:0.5, needsCombo:true, desc:'+20% attack speed based on combo points (1:5s–5:17s)' },
        { id:'poisonExplosion', name:'Poison Explosion', icon:'💥', cost:35, cooldown:8, gcd:0.5, needsCombo:true, needsPoison:true, desc:'Consumes poison debuff, deals dmg based on combo points' }
      ]
    },
    mage: {
      id:'mage', name:'Mage', icon:'🪄',
      resource:'mana', resourceName:'💧 Mana', maxResource:30, startResource:30,
      resourceRegen:0.3,
      desc:'Mana scales with INT and gear. Powerful ranged spells.',
      allowedWeapons:['staff','fists'],
      allowedShield:true,
      allowedOffhand:true,
      dualWield:false,
      primaryAttr:'int',
      talentSchool:'fire',
      baseHp:25, baseDmg:6, baseMana:35, manaPerLevel:2,
      attrBonus:{str:15, vit:15, dex:15, int:25},
      spells: [
        { id:'firebolt', name:'Firebolt', icon:'🔥', cost:20, cooldown:0, gcd:0.5, castTime:1.5, desc:'Fire: medium dmg, medium spread' },
        { id:'icebolt', name:'Icebolt', icon:'❄️', cost:20, cooldown:0, gcd:0.5, castTime:1.5, desc:'Ice: low dmg, low spread, slow 25%' },
        { id:'lightningBolt', name:'Lightning Bolt', icon:'⚡', cost:20, cooldown:0, gcd:0.5, castTime:1.5, desc:'Lightning: high max dmg, wide spread' },
        { id:'fireball', name:'Fireball', icon:'💥', cost:40, cooldown:8, gcd:0.5, castTime:2.5, desc:'Fire: medium dmg, medium spread + DoT' },
        { id:'frostbolt', name:'Frostbolt', icon:'🧊', cost:40, cooldown:8, gcd:0.5, castTime:2.5, desc:'Ice: low dmg, low spread, freeze' },
        { id:'chainLightning', name:'Chain Lightning', icon:'⚡', cost:40, cooldown:8, gcd:0.5, castTime:2.5, desc:'Lightning: high max dmg, wide spread, jumps' },
        { id:'fireblast', name:'Fireblast', icon:'🌋', cost:60, cooldown:15, gcd:0.5, castTime:3.5, desc:'Fire: medium dmg, medium spread' },
        { id:'blizzard', name:'Blizzard', icon:'🌨️', cost:60, cooldown:15, gcd:0.5, castTime:3.5, desc:'Ice: low dmg/tick, low spread' },
        { id:'thunderStorm', name:'Thunder Storm', icon:'🌩️', cost:60, cooldown:15, gcd:0.5, castTime:3.5, desc:'Lightning: high max dmg/tick, wide spread' }
      ]
    }
  };

  export const CLASS_SKILLS = {
    barbarian: {
      id:'barbarian', name:'Barbarian', icon:'🪓', desc:'Strong physical attacks and battle cries.',
      trees: {
        combat: { name:'Combat', icon:'⚔️',
          tiers: [
            { choices: [
              { k:'pummel', name:'Pummel', icon:'👊', iconImg:'pummel.png', maxLv:5, desc:lv=>`Interrupts enemy cast + blocks recast for ${2+lv}s` },
              { k:'oneHandSpec', name:'One-Hand Specialization', icon:'🗡️', iconImg:'oneHandSpec.png', maxLv:5, desc:lv=>`+${10*lv}% 1H dmg, +${10*lv}% attack rating, +${lv}% crit; off-hand dmg ${50+10*lv}%` },
              { k:'twoHandSpec', name:'Two-Hand Specialization', icon:'🪓', iconImg:'twoHandSpec.png', maxLv:5, desc:lv=>`+${10*lv}% 2H dmg, +${10*lv}% attack rating, +${lv}% crit` },
            ]},
            { choices: [
              { k:'doubleSwing', name:'Double Swing', icon:'⚔️', iconImg:'doubleSwing.png', maxLv:5, requires:'barbarian_oneHandSpec', requiresLv:5, desc:lv=>`Dual wield: +${25*lv}% dmg, +${10*lv}% attack rating` },
              { k:'heroicStrike', name:'Heroic Strike', icon:'💢', iconImg:'heroicStrike.png', maxLv:5, requires:'barbarian_twoHandSpec', requiresLv:5, desc:lv=>`${100+lv*100}% weapon dmg` },
              { k:'whirlwind', name:'Whirlwind', icon:'🌀', iconImg:'whirlwind.png', maxLv:4, requires:'barbarian_oneHandSpec', requiresLv:1, desc:lv=>`Pause game & unleash ${3+lv} spinning strikes (3 to 7) — press the shown button each strike, land as many as you get right` },
              { k:'frenzy', name:'Frenzy', icon:'⚔️', iconImg:'frenzy.png', maxLv:5, requiresAny:['barbarian_oneHandSpec','barbarian_twoHandSpec'], requiresLv:1, desc:lv=>`${20*lv}% dmg + ${100+20*lv}% attack rating on next swing; +${lv+1}% attack speed per stack (max 5) for 10s` },
            ]}
          ]
        },
        shouts: { name:'Shouts', icon:'📯',
          tiers: [
            { choices: [
              { k:'battleShout', name:'Battle Shout', icon:'📯', iconImg:'battleShout.png', maxLv:5, desc:lv=>`+${5+lv*5}% dmg for 30s` },
              { k:'defensiveShout', name:'Defensive Shout', icon:'🛡️', iconImg:'defensiveShout.png', maxLv:5, desc:lv=>`+${[50,75,100,125,150][lv-1]}% armor for 30s` },
            ]}
          ]
        },
        defense: { name:'Defense', icon:'🛡️',
          tiers: [
            { choices: [
              { k:'shieldSpec', name:'Shield Specialization', icon:'🛡️', iconImg:'shield_bash.png', maxLv:5, desc:lv=>`+${20*lv}% main-hand weapon dmg, +${5*lv}% block chance` },
              { k:'thunderClap', name:'Thunder Clap', icon:'🌩️', iconImg:'thunderClap.png', maxLv:5, desc:lv=>`${50+lv*30}% dmg + slow 20% for ${1+lv}s` },
              { k:'thunderBolt', name:'Thunder Bolt', icon:'⚡', iconImg:'thunderBolt.png', maxLv:5, desc:lv=>`${80+lv*20}% dmg + stun ${3+(lv-1)*0.5}s` },
            ]},
            { choices: [
              { k:'shieldSlam', name:'Shield Slam', icon:'🛡️', iconImg:'shield_bash.png', maxLv:5, requires:'barbarian_shieldSpec', requiresLv:1, desc:lv=>`${60+lv*20}% dmg + slow ${15+lv*5}% for ${2+Math.floor(lv/2)}s` },
              { k:'spellReflect', name:'Spell Reflect', icon:'🪞', iconImg:'spellReflect.png', maxLv:5, requires:'barbarian_shieldSpec', requiresLv:1, desc:lv=>`Reflects ${10*lv}% of offensive spell dmg back at enemy` },
              { k:'counterAttack', name:'Counter Attack', icon:'⚔️', iconImg:'counterAttack.png', maxLv:5, desc:lv=>`After taking damage, ${10+lv*6}% chance to counter — next main-hand swing deals +${50+lv*30}% dmg` },
            ]}
          ]
        }
      }
    },
    assassin: {
      id:'assassin', name:'Assassin', icon:'🗡️', desc:'Fast attacks, critical hits and shadows.',
      trees: {
        attacks: { name:'Attacks', icon:'⚔️',
          tiers: [
            { choices: [
              { k:'shadowStrike', name:'Shadow Strike', icon:'💢', iconImg:'shadowStrike.png', maxLv:5, desc:lv=>`${100+lv*50}% dmg, +${5+lv*5}% crit chance` },
            ]},
            { choices: [
              { k:'bladeFury', name:'Blade Fury', icon:'⚡', iconImg:'bladeFury.png', maxLv:5, requires:'assassin_shadowStrike', requiresLv:1, desc:lv=>`${80+lv*30}% dmg, +${5+lv*3}% attack speed for 3s` },
            ]},
            { choices: [
              { k:'deathMark', name:'Death Mark', icon:'🎯', iconImg:'deathMark.png', maxLv:5, requires:'assassin_bladeFury', requiresLv:1, desc:lv=>`+${10+lv*5}% crit chance for 5s` },
            ]}
          ]
        },
        shadows: { name:'Shadows', icon:'🌑',
          tiers: [
            { choices: [
              { k:'poisonBlade', name:'Poison Blade', icon:'☠️', iconImg:'poisonBlade.png', maxLv:5, desc:lv=>`${50+lv*20}% dmg + poison ${10+lv*5}%/tick for 3s` },
              { k:'evasion', name:'Evasion', icon:'💨', iconImg:'evasion.png', maxLv:5, desc:lv=>`+${10+lv*5}% dodge for 3s` },
            ]},
            { choices: [
              { k:'smokeScreen', name:'Smoke Screen', icon:'🌫️', iconImg:'smokeScreen.png', maxLv:5, requires:'assassin_poisonBlade', requiresLv:1, desc:lv=>`Reduces enemy hit rate by ${10+lv*5}% for 3s` },
            ]},
            { choices: [
              { k:'shadowDance', name:'Shadow Dance', icon:'🌙', iconImg:'shadowDance.png', maxLv:5, requires:'assassin_smokeScreen', requiresLv:1, desc:lv=>`+${1+lv} combo point per attack for 5s` },
            ]}
          ]
        },
        poisons: { name:'Poisons', icon:'☠️',
          tiers: [
            { choices: [
              { k:'poisonedWeapon', name:'Poisoned Weapon', icon:'☠️', iconImg:'poisonedWeapon.png', maxLv:5, desc:lv=>`+${15+(lv-1)*10} poison dmg over 3s` },
            ]},
            { choices: [
              { k:'poisonExplosion', name:'Poison Explosion', icon:'💥', iconImg:'poisonExplosion.png', maxLv:5, requires:'assassin_poisonedWeapon', requiresLv:1, desc:lv=>`Consumes poison, deals ${(1.1+(lv-1)*0.2).toFixed(1)}x-${(1.5+(lv-1)*0.2).toFixed(1)}x dmg based on combo` },
            ]}
          ]
        }
      }
    },
    mage: {
      id:'mage', name:'Mage', icon:'🔮', desc:'Powerful spells of fire, ice and lightning.',
      trees: {
        fire: { name:'Fire', icon:'🔥',
          tiers: [
            { choices: [
              { k:'firebolt', name:'Firebolt', icon:'🔥', iconImg:'firebolt.png', maxLv:5, desc:lv=>`${10+lv*5}-${16+lv*8} fire dmg` },
            ]},
            { choices: [
              { k:'fireball', name:'Fireball', icon:'💥', iconImg:'fireball.png', maxLv:5, requires:'mage_firebolt', requiresLv:1, desc:lv=>`${18+lv*8}-${28+lv*12} fire dmg + DoT ${15+lv*5}%/tick for 2s` },
            ]},
            { choices: [
              { k:'fireblast', name:'Fireblast', icon:'🌋', iconImg:'fireblast.png', maxLv:5, requires:'mage_fireball', requiresLv:1, desc:lv=>`${30+lv*12}-${45+lv*18} fire dmg` },
            ]}
          ]
        },
        ice: { name:'Ice', icon:'❄️',
          tiers: [
            { choices: [
              { k:'icebolt', name:'Icebolt', icon:'❄️', iconImg:'icebolt.png', maxLv:5, desc:lv=>`${8+lv*4}-${10+lv*5} ice dmg, slow 25% for 2s` },
            ]},
            { choices: [
              { k:'frostbolt', name:'Frostbolt', icon:'🧊', iconImg:'frostbolt.png', maxLv:5, requires:'mage_icebolt', requiresLv:1, desc:lv=>`${14+lv*6}-${18+lv*8} ice dmg, freeze for ${1+lv}s` },
            ]},
            { choices: [
              { k:'blizzard', name:'Blizzard', icon:'🌨️', iconImg:'blizzard.png', maxLv:5, requires:'mage_frostbolt', requiresLv:1, desc:lv=>`${6+lv*3}-${8+lv*4} ice dmg/tick, freeze for ${1+lv} attacks` },
            ]}
          ]
        },
        lightning: { name:'Lightning', icon:'⚡',
          tiers: [
            { choices: [
              { k:'lightningBolt', name:'Lightning Bolt', icon:'⚡', iconImg:'lightningBolt.png', maxLv:5, desc:lv=>`${6+lv*3}-${28+lv*14} lightning dmg` },
            ]},
            { choices: [
              { k:'chainLightning', name:'Chain Lightning', icon:'⚡', iconImg:'chainLightning.png', maxLv:5, requires:'mage_lightningBolt', requiresLv:1, desc:lv=>`${10+lv*5}-${45+lv*20} lightning dmg, jumps to ${1+Math.floor(lv/2)} more target` },
            ]},
            { choices: [
              { k:'thunderStorm', name:'Thunder Storm', icon:'🌩️', iconImg:'thunderStorm.png', maxLv:5, requires:'mage_chainLightning', requiresLv:1, desc:lv=>`${4+lv*2}-${20+lv*10} lightning dmg/tick for 3s` },
            ]}
          ]
        }
      }
    }
  };
