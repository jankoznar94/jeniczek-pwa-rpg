// src/data/monsters.ts — statická data monster, affixů a obtížnosti.
// Extrahováno z src/game.ts (Fáze 2). Čistá data bez closure závislostí.

export const MONSTER_TYPES = {
  LIFESTEALER: 'lifestealer',
  MANASTEALER: 'manastealer',
  CRITMASTER: 'critmaster',
  POISON: 'poison'
};

export const ATTACK_TYPES = { MELEE: 'melee', CASTER: 'caster' };

export const ENEMY_SPELLS = {
  poison_bolt: { name:'Poison Bolt', icon:'☠️', iconImg:'poison_bolt.png', castTime:1500, manaCost:10, type:MONSTER_TYPES.POISON, minManaPct:0.2,
    desc:'DoT on player (3 ticks)' },
  drain_life: { name:'Drain Life', icon:'🩸', iconImg:'drain_life.png', castTime:1200, manaCost:8, type:MONSTER_TYPES.LIFESTEALER, minManaPct:0.15,
    desc:'Damage + heals enemy' },
  mana_drain: { name:'Mana Drain', icon:'💧', iconImg:'mana_drain.png', castTime:1000, manaCost:5, type:MONSTER_TYPES.MANASTEALER, minManaPct:0.1,
    desc:'Damage + mana drain' },
  shadow_bolt: { name:'Shadow Bolt', icon:'🎯', iconImg:'shadow_bolt.png', castTime:1300, manaCost:8, type:MONSTER_TYPES.CRITMASTER, minManaPct:0.15,
    desc:'High crit chance' },
  heal: { name:'Heal', icon:'💚', iconImg:'heal.png', castTime:2000, manaCost:15, type:MONSTER_TYPES.LIFESTEALER, minManaPct:0.3,
    desc:'Heals enemy for 30% HP' },
  // Act 1 — Forest monsters
  defensive_shout: { name:'Defensive Shout', icon:'🛡️', iconImg:'defensiveShout.png', castTime:1000, manaCost:20, type:MONSTER_TYPES.MANASTEALER, minManaPct:0,
    desc:'Reduces incoming damage by 30% for 8s' },
  battle_shout: { name:'Battle Shout', icon:'📯', iconImg:'battleShout.png', castTime:1000, manaCost:25, type:MONSTER_TYPES.CRITMASTER, minManaPct:0,
    desc:'+50% damage for 8s' },
  thorn_shield: { name:'Thorn Shield', icon:'🌵', iconImg:'thorn_shield.png', castTime:1500, manaCost:50, type:MONSTER_TYPES.LIFESTEALER, minManaPct:0.5,
    desc:'Returns 5-10 dmg to attacker for 10s' },
  faerie_fire: { name:'Faerie Fire', icon:'✨', iconImg:'faerie_fire.png', castTime:2000, manaCost:25, type:MONSTER_TYPES.LIFESTEALER, minManaPct:0.3,
    desc:'Reduces player resistances by 50% for 10s' },
  slow: { name:'Slow', icon:'🐌', iconImg:'slow.png', castTime:3000, manaCost:20, type:MONSTER_TYPES.POISON, minManaPct:0.3,
    desc:'Slows player attack speed by 50% for 5s' },
  evasion: { name:'Evasion', icon:'💨', iconImg:'evasion.png', castTime:1000, manaCost:15, type:MONSTER_TYPES.CRITMASTER, minManaPct:0.2,
    desc:'30% dodge chance for 6s' },
};

export const MONSTER_DB = [
  // Theme 0 — Forest (balanced, slight nature bonus)
  // Order = progressively added with each area (minArea 0-7)
  [
    {face:'assets/monsters/lesni_rarach.png',name:'Forest Imp',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.MELEE, defense:10, resists:{fire:1.0, ice:1.0, nature:0.9, lightning:1.0},
      hp:60, dmgMin:5, dmgMax:9, attackSpeed:1500, blockChance:0,
      resource:'mana', maxResource:50, spells:['poison_bolt'], minArea:0},
    {face:'assets/monsters/troll_test_small.png',name:'Troll',type:MONSTER_TYPES.MANASTEALER,attackType:ATTACK_TYPES.MELEE, defense:12, resists:{fire:1.0, ice:1.0, nature:0.9, lightning:1.0},
      hp:120, dmgMin:8, dmgMax:12, attackSpeed:1400, blockChance:10,
      resource:'mana', maxResource:100, spells:['defensive_shout'], minArea:1},
    {face:'assets/monsters/moc_alova_prisera.png',name:'Swamp Horror',type:MONSTER_TYPES.POISON,attackType:ATTACK_TYPES.CASTER, defense:8, resists:{fire:1.0, ice:1.0, nature:0.8, lightning:1.0},
      hp:110, dmgMin:10, dmgMax:14, attackSpeed:2200, blockChance:0,
      resource:'mana', maxResource:60, spells:['slow'], minArea:2},
    {face:'assets/monsters/vlk.png',name:'Wolf',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.MELEE, defense:8, resists:{fire:1.0, ice:1.0, nature:1.0, lightning:1.0},
      hp:90, dmgMin:6, dmgMax:10, attackSpeed:1200, blockChance:0,
      resource:'mana', maxResource:100, spells:['evasion'], minArea:3},
    {face:'assets/monsters/medved.png',name:'Bear',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.MELEE, defense:20, resists:{fire:1.0, ice:1.0, nature:0.8, lightning:1.0},
      hp:180, dmgMin:16, dmgMax:22, attackSpeed:2500, blockChance:0,
      resource:'mana', maxResource:100, spells:['battle_shout'], minArea:4},
    {face:'assets/monsters/dryada.png',name:'Dryad',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.CASTER, defense:5, resists:{fire:1.0, ice:1.0, nature:0.7, lightning:1.0},
      hp:70, dmgMin:7, dmgMax:11, attackSpeed:1800, blockChance:0,
      resource:'mana', maxResource:75, spells:['faerie_fire'], minArea:5},
    {face:'assets/monsters/satyr.png',name:'Satyr',type:MONSTER_TYPES.POISON,attackType:ATTACK_TYPES.MELEE, defense:6, resists:{fire:1.0, ice:1.0, nature:0.9, lightning:1.0},
      hp:100, dmgMin:10, dmgMax:15, attackSpeed:2000, blockChance:0,
      resource:'mana', maxResource:100, spells:[], passivePoisonWeapon:true, minArea:6},
    {face:'assets/monsters/ent.png',name:'Ent',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.MELEE, defense:18, resists:{fire:1.2, ice:1.0, nature:0.8, lightning:1.0},
      hp:200, dmgMin:18, dmgMax:25, attackSpeed:3000, blockChance:0,
      resource:'mana', maxResource:50, spells:['thorn_shield'], minArea:7},
  ],
  // Theme 1 — Desert (weak to ice, resistant to fire) — ACT 2
  [
    {face:'assets/monsters/desert_scorpion.png',name:'Scorpion',type:MONSTER_TYPES.POISON,attackType:ATTACK_TYPES.MELEE, defense:16, resists:{fire:0.8, ice:1.3, nature:1.0, lightning:1.0},
      hp:130, dmgMin:13, dmgMax:22, attackSpeed:1500, blockChance:0, resource:'mana', maxResource:60, spells:['poison_bolt'], minArea:0},
    {face:'assets/monsters/desert_worm.png',name:'Sand Worm',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.MELEE, defense:14, resists:{fire:0.8, ice:1.2, nature:1.0, lightning:1.0},
      hp:190, dmgMin:16, dmgMax:26, attackSpeed:1800, blockChance:0, resource:'mana', maxResource:80, spells:['drain_life'], minArea:1},
    {face:'assets/monsters/desert_centaur.png',name:'Centaur',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.MELEE, defense:15, resists:{fire:0.9, ice:1.2, nature:1.0, lightning:1.0},
      hp:170, dmgMin:18, dmgMax:29, attackSpeed:2000, blockChance:0, resource:'mana', maxResource:80, spells:[], minArea:2},
    {face:'assets/monsters/desert_nomad.png',name:'Nomad',type:MONSTER_TYPES.MANASTEALER,attackType:ATTACK_TYPES.CASTER, defense:8, resists:{fire:0.8, ice:1.3, nature:1.0, lightning:1.0},
      hp:120, dmgMin:14, dmgMax:23, attackSpeed:2000, blockChance:0, resource:'mana', maxResource:80, spells:['mana_drain'], minArea:3},
    {face:'assets/monsters/desert_djinn.png',name:'Djinn',type:MONSTER_TYPES.MANASTEALER,attackType:ATTACK_TYPES.CASTER, defense:6, resists:{fire:0.7, ice:1.4, nature:1.0, lightning:1.0},
      hp:110, dmgMin:17, dmgMax:27, attackSpeed:1800, blockChance:0, resource:'mana', maxResource:100, spells:['mana_drain'], minArea:4},
    {face:'assets/monsters/desert_mummy.png',name:'Mummy',type:MONSTER_TYPES.POISON,attackType:ATTACK_TYPES.CASTER, defense:10, resists:{fire:0.9, ice:1.2, nature:1.0, lightning:1.0},
      hp:160, dmgMin:16, dmgMax:25, attackSpeed:2200, blockChance:0, resource:'mana', maxResource:80, spells:['poison_bolt'], minArea:5},
    {face:'assets/monsters/desert_beetle.png',name:'Scarab',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.MELEE, defense:22, resists:{fire:0.8, ice:1.2, nature:1.0, lightning:1.0},
      hp:210, dmgMin:20, dmgMax:32, attackSpeed:1400, blockChance:10, resource:'mana', maxResource:80, spells:['evasion'], minArea:6},
    {face:'assets/monsters/desert_cobra.png',name:'Cobra',type:MONSTER_TYPES.POISON,attackType:ATTACK_TYPES.CASTER, defense:7, resists:{fire:0.9, ice:1.3, nature:1.0, lightning:1.0},
      hp:140, dmgMin:18, dmgMax:29, attackSpeed:1600, blockChance:0, resource:'mana', maxResource:80, spells:['poison_bolt'], minArea:7},
  ],
  // Theme 2 — Undead (resistant to fire, weak to nature) — ACT 4
  [
    {face:'assets/monsters/skeleton.png',name:'Skeleton',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.MELEE, defense:14, resists:{fire:0.7, ice:1.0, nature:1.3, lightning:1.0},
      hp:180, dmgMin:20, dmgMax:32, attackSpeed:1500, blockChance:0, resource:'mana', maxResource:80, spells:['evasion'], minArea:0},
    {face:'assets/monsters/zombie.png',name:'Zombie',type:MONSTER_TYPES.POISON,attackType:ATTACK_TYPES.MELEE, defense:12, resists:{fire:0.6, ice:1.0, nature:1.4, lightning:1.0},
      hp:260, dmgMin:24, dmgMax:38, attackSpeed:2200, blockChance:0, resource:'mana', maxResource:80, spells:[], minArea:1},
    {face:'assets/monsters/lich.png',name:'Lich',type:MONSTER_TYPES.MANASTEALER,attackType:ATTACK_TYPES.CASTER, defense:5, resists:{fire:0.5, ice:1.0, nature:1.5, lightning:1.0},
      hp:150, dmgMin:26, dmgMax:40, attackSpeed:1800, blockChance:0, resource:'mana', maxResource:120, spells:['mana_drain'], minArea:2},
    {face:'assets/monsters/bone_dragon.png',name:'Bone Dragon',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.CASTER, defense:10, resists:{fire:0.6, ice:1.0, nature:1.4, lightning:1.0},
      hp:300, dmgMin:30, dmgMax:46, attackSpeed:2000, blockChance:0, resource:'mana', maxResource:100, spells:['shadow_bolt'], minArea:3},
    {face:'assets/monsters/death_knight.png',name:'Death Knight',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.MELEE, defense:20, resists:{fire:0.7, ice:1.0, nature:1.3, lightning:1.0},
      hp:250, dmgMin:28, dmgMax:42, attackSpeed:1600, blockChance:10, resource:'mana', maxResource:100, spells:['drain_life'], minArea:4},
    {face:'assets/monsters/raven.png',name:'Raven',type:MONSTER_TYPES.POISON,attackType:ATTACK_TYPES.CASTER, defense:4, resists:{fire:0.8, ice:1.0, nature:1.2, lightning:1.0},
      hp:140, dmgMin:22, dmgMax:34, attackSpeed:1400, blockChance:0, resource:'mana', maxResource:80, spells:['poison_bolt'], minArea:5},
    {face:'assets/monsters/ghost.png',name:'Wraith',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.CASTER, defense:3, resists:{fire:0.5, ice:1.0, nature:1.5, lightning:1.0},
      hp:170, dmgMin:27, dmgMax:41, attackSpeed:1700, blockChance:0, resource:'mana', maxResource:100, spells:['drain_life'], minArea:6},
    {face:'assets/monsters/lucifer.png',name:'Vampire',type:MONSTER_TYPES.MANASTEALER,attackType:ATTACK_TYPES.CASTER, defense:8, resists:{fire:0.6, ice:1.0, nature:1.4, lightning:1.0},
      hp:210, dmgMin:30, dmgMax:46, attackSpeed:1800, blockChance:0, resource:'mana', maxResource:120, spells:['mana_drain'], minArea:7},
  ],
  // Theme 3 — Hell (resistant to fire, weak to ice) — ACT 5
  [
    {face:'assets/monsters/kerberos.png',name:'Cerberus',type:MONSTER_TYPES.MANASTEALER,attackType:ATTACK_TYPES.MELEE, defense:18, resists:{fire:0.7, ice:1.3, nature:1.0, lightning:1.0},
      hp:240, dmgMin:28, dmgMax:44, attackSpeed:1500, blockChance:0, resource:'mana', maxResource:100, spells:['mana_drain'], minArea:0},
    {face:'assets/monsters/hellhound.png',name:'Hell Hound',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.MELEE, defense:14, resists:{fire:0.6, ice:1.4, nature:1.0, lightning:1.0},
      hp:210, dmgMin:32, dmgMax:50, attackSpeed:1400, blockChance:0, resource:'mana', maxResource:100, spells:['evasion'], minArea:1},
    {face:'assets/monsters/imp.png',name:'Imp',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.MELEE, defense:10, resists:{fire:0.7, ice:1.3, nature:1.0, lightning:1.0},
      hp:180, dmgMin:26, dmgMax:42, attackSpeed:1800, blockChance:0, resource:'mana', maxResource:100, spells:[], minArea:2},
    {face:'assets/monsters/fire_ghost.png',name:'Fire Wraith',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.CASTER, defense:4, resists:{fire:0.4, ice:1.5, nature:1.0, lightning:1.0},
      hp:200, dmgMin:34, dmgMax:52, attackSpeed:1700, blockChance:0, resource:'mana', maxResource:120, spells:['drain_life'], minArea:3},
    {face:'assets/monsters/succubus.png',name:'Succubus',type:MONSTER_TYPES.MANASTEALER,attackType:ATTACK_TYPES.CASTER, defense:6, resists:{fire:0.6, ice:1.4, nature:1.0, lightning:1.0},
      hp:170, dmgMin:30, dmgMax:48, attackSpeed:1800, blockChance:0, resource:'mana', maxResource:120, spells:['mana_drain'], minArea:4},
    {face:'assets/monsters/lava_dragon.png',name:'Lava Drake',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.CASTER, defense:12, resists:{fire:0.5, ice:1.5, nature:1.0, lightning:1.0},
      hp:360, dmgMin:38, dmgMax:58, attackSpeed:2000, blockChance:0, resource:'mana', maxResource:120, spells:['shadow_bolt'], minArea:5},
    {face:'assets/monsters/hell_smith.png',name:'Hell Smith',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.MELEE, defense:25, resists:{fire:0.7, ice:1.3, nature:1.0, lightning:1.0},
      hp:310, dmgMin:36, dmgMax:54, attackSpeed:2000, blockChance:10, resource:'mana', maxResource:100, spells:[], minArea:6},
    {face:'assets/monsters/hell_knight.png',name:'Hell Knight',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.MELEE, defense:22, resists:{fire:0.7, ice:1.3, nature:1.0, lightning:1.0},
      hp:340, dmgMin:40, dmgMax:60, attackSpeed:1600, blockChance:10, resource:'mana', maxResource:120, spells:['drain_life'], minArea:7},
  ],
  // Theme 4 — Frost (resistant to ice, weak to fire) — ACT 3
  [
    {face:'assets/monsters/ice_troll.png',name:'Frost Troll',type:MONSTER_TYPES.MANASTEALER,attackType:ATTACK_TYPES.MELEE, defense:16, resists:{fire:1.3, ice:0.7, nature:1.0, lightning:1.0},
      hp:150, dmgMin:15, dmgMax:24, attackSpeed:1600, blockChance:0, resource:'mana', maxResource:120, spells:['mana_drain'], minArea:0},
    {face:'assets/monsters/frost_giant.png',name:'Frost Giant',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.MELEE, defense:24, resists:{fire:1.4, ice:0.6, nature:1.0, lightning:1.0},
      hp:220, dmgMin:19, dmgMax:30, attackSpeed:2200, blockChance:0, resource:'mana', maxResource:120, spells:[], minArea:1},
    {face:'assets/monsters/polar_bear.png',name:'Polar Bear',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.MELEE, defense:20, resists:{fire:1.3, ice:0.7, nature:1.0, lightning:1.0},
      hp:180, dmgMin:18, dmgMax:28, attackSpeed:1800, blockChance:0, resource:'mana', maxResource:120, spells:['evasion'], minArea:2},
    {face:'assets/monsters/snow_wolf.png',name:'Snow Wolf',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.MELEE, defense:10, resists:{fire:1.2, ice:0.8, nature:1.0, lightning:1.0},
      hp:130, dmgMin:15, dmgMax:24, attackSpeed:1400, blockChance:0, resource:'mana', maxResource:120, spells:['drain_life'], minArea:3},
    {face:'assets/monsters/ice_dragon.png',name:'Ice Drake',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.CASTER, defense:14, resists:{fire:1.5, ice:0.5, nature:1.0, lightning:1.0},
      hp:210, dmgMin:21, dmgMax:32, attackSpeed:2000, blockChance:0, resource:'mana', maxResource:140, spells:['shadow_bolt'], minArea:4},
    {face:'assets/monsters/snow_golem.png',name:'Snow Golem',type:MONSTER_TYPES.POISON,attackType:ATTACK_TYPES.MELEE, defense:28, resists:{fire:1.4, ice:0.6, nature:1.0, lightning:1.0},
      hp:240, dmgMin:20, dmgMax:31, attackSpeed:2400, blockChance:10, resource:'mana', maxResource:120, spells:[], minArea:5},
    {face:'assets/monsters/frozen_knight.png',name:'Frozen Knight',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.MELEE, defense:18, resists:{fire:1.3, ice:0.7, nature:1.0, lightning:1.0},
      hp:200, dmgMin:22, dmgMax:34, attackSpeed:1700, blockChance:10, resource:'mana', maxResource:140, spells:['drain_life'], minArea:6},
    {face:'assets/monsters/ice_lizard.png',name:'Ice Lizard',type:MONSTER_TYPES.POISON,attackType:ATTACK_TYPES.MELEE, defense:12, resists:{fire:1.2, ice:0.8, nature:1.0, lightning:1.0},
      hp:150, dmgMin:17, dmgMax:27, attackSpeed:1500, blockChance:0, resource:'mana', maxResource:120, spells:['poison_bolt'], minArea:7},
  ],
];

export const DIFFICULTIES = [
  // monsterLvMin/Max = celkový rozsah levelů monster pro danou obtížnost (plynulý přes 5 actů).
  // actLevels = rozsah [min,max] pro každý z 5 actů (postupně rostoucí, navazují přes obtížnosti).
  { id:'normal', name:'Normal', monsterLvMin:1, monsterLvMax:15, actLevels:[[1,3],[4,6],[7,9],[10,12],[13,15]], itemTierMin:1, itemTierMax:3, mult:1.0, resistMult:1.0 },
  { id:'nightmare', name:'Nightmare', monsterLvMin:16, monsterLvMax:30, actLevels:[[16,18],[19,21],[22,24],[25,27],[28,30]], itemTierMin:3, itemTierMax:5, mult:1.8, resistMult:1.5 },
  { id:'hell', name:'Hell', monsterLvMin:31, monsterLvMax:60, actLevels:[[31,36],[37,42],[43,48],[49,54],[55,60]], itemTierMin:5, itemTierMax:7, mult:3.0, resistMult:2.0 },
];

// D2-style elitní mody (elita stojí solo v souboji, proto samostatné self-bonesty místo okolních aury).
// Každý affix má vlastní modifikátory statů, element odpor (vs hráčova kouzla), element dmg (projde hráčovými resisty),
// a volitelný efekt při smrti / útoku.
export const ELITE_AFFIXES = [
  { name:'Fire Enchanted', icon:'🔥', desc:'+fire dmg · +fire resist · exploduje', element:'fire', resistSelf:'fire', dmgMult:1.2, elementDmgMult:0.5, death:'nova-fire' },
  { name:'Cold Enchanted', icon:'❄️', desc:'+cold dmg · +cold resist · nova', element:'ice', resistSelf:'ice', dmgMult:1.1, elementDmgMult:0.45, death:'nova-cold' },
  { name:'Lightning Enchanted', icon:'⚡', desc:'+light dmg · +light resist · burst', element:'lightning', resistSelf:'lightning', dmgMult:1.1, elementDmgMult:0.45, onHit:'lightning' },
  { name:'Poison Enchanted', icon:'☠️', desc:'+poison dmg · +poison resist · jed', element:'nature', resistSelf:'nature', dmgMult:1.1, elementDmgMult:0.35, onHit:'poison' },
  { name:'Extra Strong', icon:'💪', desc:'+80% dmg', dmgMult:1.8 },
  { name:'Extra Fast', icon:'💨', desc:'+50% attack speed', attackSpeedMult:0.67 },
  { name:'Extra Healthy', icon:'❤️', desc:'+50% HP', hpMult:1.5 },
  { name:'Magic Resistant', icon:'🛡️', desc:'+40% resist ke všem elementům', resistAll:0.4 },
  { name:'Stone Skin', icon:'🪨', desc:'-50% fyz dmg + defense', drMult:0.5, defMult:2.0 },
  { name:'Mana Burn', icon:'💜', desc:'krade manu · +magic resist', manaBurn:true, resistAll:0.3 },
  { name:'Cursed', icon:'💀', desc:'75% šance amplify damage', curse:true },
  { name:'Aura Enchanted', icon:'✨', desc:'aura · +30% dmg minionům', aura:true, auraDmgMult:1.3 },
];

// D2 champion jména se generují kombinací [Prefix] [Suffix] the [Appellation]
// z nezávislých tabulek (stejně jako D2 engine). Čistě kosmetické — nezávislé na afixu.
export const ELITE_PREFIXES = [
  'Ash','Black','Blight','Blood','Bone','Bramble','Break','Chaos','Cold','Corpse',
  'Dark','Dead','Death','Deep','Dire','Dragon','Dread','Drop','Earth','Eye',
  'Fear','Fire','Flesh','Foul','Frost','Glum','Grim','Gross','Gut','Hail',
  'Hate','Head','Heart','Hell','Iron','Left','Mad','Mage','Mind','Moon',
  'Night','Ooze','Pain','Plague','Poison','Puke','Pulse','Pyre','Rage','Red',
  'Rime','Rip','Rot','Rust','Scum','Searing','Shadow','Shard','Sin','Skin',
  'Skull','Slime','Soul','Spit','Star','Steel','Stone','Storm','Sun','Thistle',
  'Thorn','Unholy','Vile','Void','Warp','Web','White','Wild','Wind','Woe','Wrath',
];
export const ELITE_SUFFIXES = [
  'Bang','Bane','Bard','Bite','Blade','Bleed','Blood','Boil','Boulder','Bow',
  'Brain','Breach','Breaker','Breath','Burn','Burst','Call','Chew','Claw','Crack',
  'Crawler','Crown','Crush','Crusher','Cry','Cutter','Dagger','Dash','Death','Dig',
  'Drinker','Eater','Edge','Eye','Fang','Feast','Fist','Flay','Flayer','Flesh',
  'Foam','Foot','Fright','Gnasher','Gnaw','Gore','Grip','Growl','Gulp','Gut',
  'Hand','Harmer','Hawk','Head','Hide','Horn','Howl','Hunter','Jaw','Killer',
  'Knife','Leech','Leg','Lick','Limb','Maw','Mind','Muck','Neck','Nose',
  'Pain','Puke','Punch','Pus','Rage','Reaver','Ripper','Run','Scalp','Scar',
  'Scratcher','Scream','Sever','Shank','Shard','Shield','Shredder','Shrike','Slime','Smasher',
  'Snot','Snout','Spawn','Spear','Spike','Spit','Spitter','Spore','Stalker','Steal',
  'Stinger','Stitch','Storm','Strike','Sunderer','Swallow','Tail','Talon','Teeth','Thirst',
  'Thorn','Throat','Thrust','Tongue','Tooth','Touch','Tracker','Web','Whip','Wing',
  'Wolf','Wound','Wrath','Young',
];
export const ELITE_APPELATIONS = [
  'the Bad','the Bitter','the Black','the Cold','the Dark','the Dead',
  'the Destroyer','the Drooler','the Dull','the Evil','the Fast',
  'the Feared','the Fierce','the Flayer','the Foul','the Grim',
  'the Hawk','the Hungry','the Impaler','the Killer','the Mad',
  'the Quick','the Raving','the Sad','the Scourge','the Sharp',
  'the Slasher','the Strong','the Unclean','the Vile','the Weeper',
  'the White','the Wild','the Witch',
];

export const BOSS_AFFIXES = [
  { name:'Fiery', icon:'🔥', desc:'+100% fire dmg' },
  { name:'Icy', icon:'❄️', desc:'+100% ice dmg' },
  { name:'Swift', icon:'💨', desc:'+50% attack speed' },
  { name:'Bloody', icon:'🩸', desc:'lifesteal 10%' },
  { name:'Indestructible', icon:'🛡️', desc:'+50% HP' },
  { name:'Mana Burn', icon:'💜', desc:'burns mana' },
];

// Náhodné barevné filtry pro elitní nepřátele (překryv obrázku jednobarevným tónem).
export const ELITE_FILTER_COLORS = [
  'hue-rotate(0deg) saturate(3)',
  'hue-rotate(60deg) saturate(3)',
  'hue-rotate(120deg) saturate(3)',
  'hue-rotate(180deg) saturate(3)',
  'hue-rotate(240deg) saturate(3)',
  'hue-rotate(300deg) saturate(3)',
];
