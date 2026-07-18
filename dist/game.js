(function() {
  'use strict';
  const $ = id => document.getElementById(id);
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ===== CLASSES =====
  const CLASSES = {
    barbarian: {
      id:'barbarian', name:'Barbar', icon:'🪓',
      resource:'rage', resourceName:'💢 Rage', maxResource:100, startResource:0,
      resourceRegen:0,
      desc:'Hromadí vztek za utržené a udělené poškození.',
      allowedWeapons:['blade','fists'],
      allowedShield:true,
      allowedOffhand:true,
      dualWield:true,
      primaryAttr:'str',
      talentSchool:'physical',
      baseHp:120, baseDmg:14, baseMana:0,
      attrBonus:{str:20, vit:25, dex:15, int:10},
      spells: [
        { id:'heroicStrike', name:'Heroic Strike', icon:'⚡', cost:20, cooldown:0, gcd:0.5, desc:'150% dmg při příštím swingu' },
        { id:'thunderClap', name:'Thunder Clap', icon:'🌊', cost:25, cooldown:15, gcd:0.5, desc:'30% dmg + zpomalení nepřítele 10% na 10s' },
        { id:'bloodrage', name:'Bloodrage', icon:'🩸', cost:0, cooldown:30, gcd:0.5, desc:'-15% HP, +100% zisk Rage na 10s' },
        { id:'thunderBolt', name:'Thunder Bolt', icon:'⚡', cost:40, cooldown:30, gcd:0.5, desc:'120% dmg + omráčení 5s' },
        { id:'battleShout', name:'Battle Shout', icon:'📯', cost:15, cooldown:45, gcd:0.5, desc:'+15% dmg na 30s' },
        { id:'doubleSwing', name:'Double Swing', icon:'⚔️', cost:35, cooldown:0, gcd:0.5, desc:'150% dmg oběma zbraněmi + reset swing timerů' }
      ]
    },
    assassin: {
      id:'assassin', name:'Assassin', icon:'🗡️',
      resource:'energy', resourceName:'⚡ Energy', maxResource:100, startResource:100,
      resourceRegen:10, // 10/s
      desc:'Energy se samovolně doplňuje. Rychlé přesné útoky.',
      allowedWeapons:['blade','fists'],
      allowedShield:false,
      allowedOffhand:false,
      dualWield:true,
      primaryAttr:'dex',
      talentSchool:'physical',
      baseHp:80, baseDmg:10, baseMana:0,
      attrBonus:{str:15, vit:20, dex:25, int:10},
      spells: [
        { id:'sinisterStrike', name:'Sinister Strike', icon:'🗡️', cost:40, cooldown:0, gcd:0.5, desc:'150% dmg + 1 combo point' },
        { id:'eviscerate', name:'Eviscerate', icon:'💥', cost:30, cooldown:0, gcd:0.5, needsCombo:true, desc:'Poškození dle combo pointů (1:150%–5:350%)' },
        { id:'kidneyShot', name:'Kidney Shot', icon:'🔨', cost:35, cooldown:20, gcd:0.5, needsCombo:true, desc:'Omráčení dle combo pointů (1:1s–5:5s)' },
        { id:'evasion', name:'Evasion', icon:'💨', cost:50, cooldown:60, gcd:0.5, desc:'+50% dodge na 10s' },
        { id:'speedBoost', name:'Speed Boost', icon:'⚡', cost:30, cooldown:0, gcd:0.5, needsCombo:true, desc:'+20% rychlost útoku dle combo pointů (1:5s–5:17s)' }
      ]
    },
    mage: {
      id:'mage', name:'Kouzelník', icon:'🪄',
      resource:'mana', resourceName:'💧 Mana', maxResource:100, startResource:100,
      resourceRegen:2, // 2/tick + INT bonus
      desc:'Mana škáluje s INT a gearem. Mocná kouzla na dálku.',
      allowedWeapons:['staff','fists'],
      allowedShield:false,
      allowedOffhand:true, // artefakt
      dualWield:false,
      primaryAttr:'int',
      talentSchool:'fire',
      baseHp:60, baseDmg:6, baseMana:100,
      attrBonus:{str:15, vit:15, dex:15, int:25}
    }
  };

  // ===== AUDIO =====
  let audioCtx = null;
  let _audioInitErr = false;
  function initAudio() {
    if (_audioInitErr) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    } catch(e) { _audioInitErr = true; }
  }
  function ensureRunning() {
    if (!audioCtx || _audioInitErr) return Promise.resolve();
    if (audioCtx.state === 'running') return Promise.resolve();
    return audioCtx.resume().catch(() => {});
  }
  function playTone(f,d,t='sine',v=0.15) {
    if (!audioCtx || _audioInitErr) { initAudio(); if (!audioCtx) return; }
    ensureRunning().then(() => {
      try {
        const o=audioCtx.createOscillator(),g=audioCtx.createGain();
        o.type=t;o.frequency.value=f;
        g.gain.value=v;
        g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+d);
        o.connect(g);g.connect(audioCtx.destination);
        o.start(audioCtx.currentTime);o.stop(audioCtx.currentTime+d);
      } catch(e) {}
    });
  }
  const sfxHit=()=>playTone(220,0.12,'sawtooth',0.08);
  const sfxPlayerHit=()=>playTone(140,0.2,'square',0.10);
  const sfxSuccess=()=>{playTone(523,0.1,'sine',0.12);setTimeout(()=>playTone(659,0.1,'sine',0.12),80);setTimeout(()=>playTone(784,0.15,'sine',0.14),160);};
  const sfxEnemyDefeat=()=>{playTone(440,0.08,'square',0.1);setTimeout(()=>playTone(330,0.08,'square',0.1),80);setTimeout(()=>playTone(220,0.15,'square',0.08),160);};
  const sfxBossDefeat=()=>{playTone(523,0.15,'sine',0.14);setTimeout(()=>playTone(659,0.15,'sine',0.14),100);setTimeout(()=>playTone(784,0.15,'sine',0.16),200);setTimeout(()=>playTone(1047,0.3,'sine',0.18),300);};
  const sfxLevelUp=()=>{playTone(392,0.1,'sine',0.12);setTimeout(()=>playTone(523,0.1,'sine',0.12),100);setTimeout(()=>playTone(659,0.12,'sine',0.14),200);setTimeout(()=>playTone(784,0.15,'sine',0.16),300);};
  // MP3 SFX
  const dodgeSfx = (() => { const a = new Audio('dodge.mp3'); a.volume = 1.0; return a; })();
  const blockSfx = (() => { const a = new Audio('block.mp3'); a.volume = 1.0; return a; })();
  const hitSfx = (() => { const a = new Audio('hit.mp3'); a.volume = 1.0; return a; })();
  const critSfx = (() => { const a = new Audio('crit.mp3'); a.volume = 1.0; return a; })();
  const meleeHitSfx = (() => { const a = new Audio('melee_hit.mp3'); a.volume = 1.0; return a; })();
  const meleeCritSfx = (() => { const a = new Audio('melee_crit.mp3'); a.volume = 1.0; return a; })();
  const fistHitSfx = (() => { const a = new Audio('fist_hit.mp3'); a.volume = 1.0; return a; })();
  const fistCritSfx = (() => { const a = new Audio('fist_crit.mp3'); a.volume = 1.0; return a; })();
  const fireSpellSfx = (() => { const a = new Audio('fire_spell.mp3'); a.volume = 1.0; return a; })();
  const iceSpellSfx = (() => { const a = new Audio('ice_spell.mp3'); a.volume = 1.0; return a; })();
  const lightningSpellSfx = (() => { const a = new Audio('lightning_spell.mp3'); a.volume = 1.0; return a; })();
  // Zvuky zranění hráče — 4 náhodné
  const hurtSfx = [
    (() => { const a = new Audio('assets/sfx/hurt1.mp3'); a.volume = 1.0; return a; })(),
    (() => { const a = new Audio('assets/sfx/hurt2.mp3'); a.volume = 1.0; return a; })(),
    (() => { const a = new Audio('assets/sfx/hurt3.mp3'); a.volume = 1.0; return a; })(),
    (() => { const a = new Audio('assets/sfx/hurt4.mp3'); a.volume = 1.0; return a; })(),
  ];
  function getHurtSfx() { return hurtSfx[Math.floor(Math.random() * hurtSfx.length)]; }
  function getHitSfx() {
    const wt = getWeaponType();
    if (wt === 'fists') return fistHitSfx;
    return wt === 'staff' ? hitSfx : meleeHitSfx;
  }
  function getCritSfx() {
    const wt = getWeaponType();
    if (wt === 'fists') return fistCritSfx;
    return wt === 'staff' ? critSfx : meleeCritSfx;
  }
  function playSFX(audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
  const healSfx = (() => { const a = new Audio('heal.mp3'); a.volume = 1.0; return a; })();
  const treasureSfx = (() => { const a = new Audio('treasure.mp3'); a.volume = 1.0; return a; })();
  const strongStrikeSfx = (() => { const a = new Audio('strong_strike.mp3'); a.volume = 1.0; return a; })();

  // ===== BACKGROUND MUSIC (MP3) =====
  const bgmAudio = new Audio('bgm.mp3');
  bgmAudio.loop = true;
  bgmAudio.volume = 0.70;
  const overworldAudio = new Audio('overworld.mp3');
  overworldAudio.loop = true;
  overworldAudio.volume = 0.90;
  const defeatAudio = new Audio('defeat.mp3');
  defeatAudio.loop = true;
  defeatAudio.volume = 0.75;
  const winAudio = new Audio('win.mp3');
  winAudio.loop = false;
  winAudio.volume = 0.80;

  const minigameBgm = new Audio('minigame-bgm.mp3');
  minigameBgm.loop = true;
  minigameBgm.volume = 0.70;

  const bossBgm = new Audio('boss_bgm.mp3');
  bossBgm.loop = true;
  bossBgm.volume = 0.50;

  // Battle BGM kolekce — 3 stopy, náhodně se střídají po patrech
  const battleBgmTracks = [
    new Audio('bgm_1.mp3'),
    new Audio('bgm_2.mp3'),
    new Audio('bgm_3.mp3')
  ];
  battleBgmTracks.forEach(t => { t.loop = true; t.volume = 0.80; });
  let currentBattleIndex = 0; // vybraná stopa pro aktuální patro

  let currentBGM = null; // 'battle' | 'overworld' | 'defeat' | 'win' | 'minigame' | 'boss' | null
  let _bgmPending = null;
  let musicMuted = false;
  function toggleMusic() {
    musicMuted = !musicMuted;
    bgmAudio.volume = musicMuted ? 0 : 0.70;
    overworldAudio.volume = musicMuted ? 0 : 0.90;
    defeatAudio.volume = musicMuted ? 0 : 0.75;
    winAudio.volume = musicMuted ? 0 : 0.80;
    bossBgm.volume = musicMuted ? 0 : 0.50;
    battleBgmTracks.forEach(t => { t.volume = musicMuted ? 0 : 0.80; });
    document.getElementById('musicToggle').className = musicMuted ? '' : 'music-active';
  }
  let testMode = false;
  function toggleTestMode() {
    testMode = !testMode;
    const btn = document.getElementById('testToggle');
    if (testMode) {
      state.hero.gold = 5000;
      state.talentPoints = 50;
      state.hero.attrPoints = 150;
      state.bossesDefeated = LOCATIONS.map(() => true);
      state.floorProgress = LOCATIONS.map(() => 5);
      state.locationProgress = LOCATIONS.map(() => 5);
      // Odemknout celý bestiář
      state.encounteredMonsters = [];
      MONSTER_DB.forEach(themeMonsters => {
        themeMonsters.forEach(m => {
          if (!state.encounteredMonsters.includes(m.face)) state.encounteredMonsters.push(m.face);
        });
      });
      LOCATIONS.forEach(loc => {
        if (loc && loc.boss && loc.boss.face && !state.encounteredMonsters.includes(loc.boss.face)) {
          state.encounteredMonsters.push(loc.boss.face);
        }
      });
      btn.classList.add('test-active');
    } else {
      state = defaultState();
      btn.classList.remove('test-active');
    }
    saveGame();
    renderMap();
    renderHero();
    renderBestiary();
  }
  let _currentBattleBgmIdx = 0;
  // ===== SURRENDER =====
  function showSurrenderModal() {
    const modal = document.getElementById('surrenderModal');
    if (modal) modal.classList.remove('hidden');
  }
  function cancelSurrender() {
    const modal = document.getElementById('surrenderModal');
    if (modal) modal.classList.add('hidden');
  }
  function confirmSurrender() {
    const modal = document.getElementById('surrenderModal');
    if (modal) modal.classList.add('hidden');
    const mb = mapBattleState;
    if (!mb || !mb.loc || mb.ended) return;
    // Ukončit boj jako prohru
    mb.ended = true;
    cleanupTimers();
    const arena = $('mbArena');
    if (arena && arena._mbHandlers) {
      arena._mbHandlers.forEach(h => {
        if (h[0] === 'keydown') window.removeEventListener(h[0], h[1]);
        else arena.removeEventListener(h[0], h[1]);
      });
      arena._mbHandlers = null;
    }
    const locId = mb.locId;
    state.deaths = (state.deaths || 0) + 1;
    const consXp = Math.max(3, Math.round((mb.loc.xpReward + mb.progress * 2) * 3 * 0.2));
    const consGold = 1 + rand(0, 2);
    state.hero.xp = (state.hero.xp || 0) + consXp;
    state.hero.gold = (state.hero.gold || 0) + consGold;
    applyLevelUp();
    state.locationProgress[locId] = 0;
    state._floorLootDrops = [];
    state.hero.hp = state.hero.maxHp;
    state.dungeonSteps = null;
    saveGame();
    switchBGM('defeat');
    $('resultIcon').innerHTML = '<img class="result-icon-img" src="assets/result_defeat.png" alt="Vzdal ses">';
    $('resultTitle').textContent = 'Vzdal ses';
    $('resultMsg').innerHTML = '';
    $('resultLootList').innerHTML = '';
    $('resultBtn').innerHTML = '';
    $('resultScreen').onclick = function() { $('resultScreen').onclick = null; showScreen('map'); renderMap(); };
    showScreen('result');
  }
  let _fromShop = false;
  function openInventoryFromShop() {
    _fromShop = true;
    showScreen('inventory');
    renderInventory();
  }
  let _forceNewBattleBgm = false;
  function switchBGM(mode) {
    // Vynucený nový výběr battle stopy při novém patře
    if (mode === 'battle' && _forceNewBattleBgm) {
      _forceNewBattleBgm = false;
      // Projdeme guardem — vybereme nový index
    } else if (mode === currentBGM) {
      return;
    }
    initAudio();
    // Zastavit všechny okamžitě
    if (!bgmAudio.paused) { bgmAudio.pause(); bgmAudio.currentTime = 0; }
    if (!overworldAudio.paused) { overworldAudio.pause(); overworldAudio.currentTime = 0; }
    if (!defeatAudio.paused) { defeatAudio.pause(); defeatAudio.currentTime = 0; }
    if (!winAudio.paused) { winAudio.pause(); winAudio.currentTime = 0; }
    if (!minigameBgm.paused) { minigameBgm.pause(); minigameBgm.currentTime = 0; }
    if (!bossBgm.paused) { bossBgm.pause(); bossBgm.currentTime = 0; }
    battleBgmTracks.forEach(t => { if (!t.paused) { t.pause(); t.currentTime = 0; } });
    currentBGM = null;
    // Počkat na AudioContext resume až potom přehrát
    _bgmPending = mode;
    ensureRunning().then(() => {
      if (_bgmPending !== mode) return; // mezitím se změnilo
      // Pro jistotu znovu zastavit — zabrání překryvu
      bgmAudio.pause(); bgmAudio.currentTime = 0;
      overworldAudio.pause(); overworldAudio.currentTime = 0;
      defeatAudio.pause(); defeatAudio.currentTime = 0;
      winAudio.pause(); winAudio.currentTime = 0;
      bossBgm.pause(); bossBgm.currentTime = 0;
      battleBgmTracks.forEach(t => { t.pause(); t.currentTime = 0; });
      if (mode === 'battle') {
        const idx = Math.floor(Math.random() * battleBgmTracks.length);
        _currentBattleBgmIdx = idx;
        battleBgmTracks[idx].play().catch(() => {});
        currentBGM = 'battle';
      } else if (mode === 'boss') {
        bossBgm.play().catch(() => {});
        currentBGM = 'boss';
      } else if (mode === 'defeat') {
      defeatAudio.play().catch(() => {});
      currentBGM = 'defeat';
    } else if (mode === 'win') {
      winAudio.play().catch(() => {});
      currentBGM = 'win';
    } else if (mode === 'minigame') {
      minigameBgm.play().catch(() => {});
      currentBGM = 'minigame';
    } else {
      overworldAudio.play().catch(() => {});
      currentBGM = 'overworld';
    }
    });
  }

  // ===== CLASS SKILL TREES =====
  // Každá class má vlastní skill tree se 3 tier-y.
  // Tier 1 = startovní (dostupný hned po výběru classy)
  // Tier 1 = lvl 1, Tier 2 = lvl 6, Tier 3 = lvl 12
  // Vyšší tier vyžaduje 1 bod v předchozím kouzlu dané větve
  const CLASS_SKILLS = {
    barbarian: {
      id:'barbarian', name:'Barbar', icon:'🪓', desc:'Silné fyzické útoky a bojová kouzla.',
      trees: {
        attacks: { name:'Útoky', icon:'⚔️',
          tiers: [
            { choices: [
              { k:'heroicStrike', name:'Heroic Strike', icon:'💢', iconImg:'heroicStrike.png', maxLv:5, desc:lv=>`${100+lv*100}% dmg zbraně` },
            ]},
            { choices: [
              { k:'doubleSwing', name:'Double Swing', icon:'⚔️', iconImg:'doubleSwing.png', maxLv:5, requires:'barbarian_heroicStrike', requiresLv:1, desc:lv=>`Útok oběma zbraněmi: ${60+lv*20}% + ${30+lv*15}% dmg` },
            ]},
            { choices: [
              { k:'whirlwind', name:'Whirlwind', icon:'🌀', maxLv:5, requires:'barbarian_bloodrage', requiresLv:1, desc:lv=>`${50+lv*30}% dmg, 3 útoky po sobě` },
            ]}
          ]
        },
        shouts: { name:'Pokřiky', icon:'📯',
          tiers: [
            { choices: [
              { k:'battleShout', name:'Battle Shout', icon:'📯', iconImg:'battleShout.png', maxLv:5, desc:lv=>`+${5+lv*5}% dmg na 60s` },
            ]},
            { choices: [
              { k:'bloodrage', name:'Bloodrage', icon:'🩸', iconImg:'bloodrage.png', maxLv:5, requires:'barbarian_heroicStrike', requiresLv:1, desc:lv=>`+${10+lv*10}% dmg, +${10+lv*5}% rage gain na 10s` },
              { k:'defensiveShout', name:'Defensive Shout', icon:'🛡️', iconImg:'defensive_shout.png', maxLv:5, requires:'barbarian_battleShout', requiresLv:1, desc:lv=>`+${[50,75,100,125,150][lv-1]}% armor na 30s` },
            ]},
            { choices: [
              { k:'skillShout', name:'Skill Shout', icon:'📣', iconImg:'skill_shout.png', maxLv:5, requires:'barbarian_defensiveShout', requiresLv:1, desc:lv=>`+${lv} dočasná úroveň všech skillů na 30s` },
            ]}
          ]
        },
        control: { name:'Kontrola', icon:'⚡',
          tiers: [
            { choices: [
              { k:'thunderClap', name:'Thunder Clap', icon:'🌩️', iconImg:'thunderClap.png', maxLv:5, desc:lv=>`${50+lv*30}% dmg + zpomalí 20% na ${1+lv}s` },
            ]},
            { choices: [
              { k:'thunderBolt', name:'Thunder Bolt', icon:'⚡', iconImg:'thunderBolt.png', maxLv:5, requires:'barbarian_thunderClap', requiresLv:1, desc:lv=>`${80+lv*20}% dmg + omráčení ${3+(lv-1)*0.5}s` },
              { k:'shieldBash', name:'Shield Bash', icon:'🛡️', iconImg:'shield_bash.png', maxLv:5, requires:'barbarian_thunderClap', requiresLv:1, desc:lv=>`${60+lv*20}% dmg + přeruší kouzlení` },
            ]}
          ]
        }
      }
    },
    assassin: {
      id:'assassin', name:'Assassin', icon:'🗡️', desc:'Rychlé útoky, kritické zásahy a stíny.',
      trees: {
        attacks: { name:'Útoky', icon:'⚔️',
          tiers: [
            { choices: [
              { k:'shadowStrike', name:'Shadow Strike', icon:'💢', maxLv:5, desc:lv=>`${100+lv*50}% dmg, +${5+lv*5}% crit chance` },
            ]},
            { choices: [
              { k:'bladeFury', name:'Blade Fury', icon:'⚡', maxLv:5, requires:'assassin_shadowStrike', requiresLv:1, desc:lv=>`${80+lv*30}% dmg, +${5+lv*3}% attack speed na 3s` },
            ]},
            { choices: [
              { k:'deathMark', name:'Death Mark', icon:'🎯', maxLv:5, requires:'assassin_bladeFury', requiresLv:1, desc:lv=>`+${10+lv*5}% crit chance na 5s` },
            ]}
          ]
        },
        shadows: { name:'Stíny', icon:'🌑',
          tiers: [
            { choices: [
              { k:'poisonBlade', name:'Poison Blade', icon:'☠️', maxLv:5, desc:lv=>`${50+lv*20}% dmg + jed ${10+lv*5}%/tick na 3s` },
            ]},
            { choices: [
              { k:'smokeScreen', name:'Smoke Screen', icon:'🌫️', maxLv:5, requires:'assassin_poisonBlade', requiresLv:1, desc:lv=>`Sníží hitrate nepřítele o ${10+lv*5}% na 3s` },
            ]},
            { choices: [
              { k:'shadowDance', name:'Shadow Dance', icon:'🌙', maxLv:5, requires:'assassin_smokeScreen', requiresLv:1, desc:lv=>`+${1+lv} combo point každý útok na 5s` },
            ]}
          ]
        },
        agility: { name:'Obratnost', icon:'💨',
          tiers: [
            { choices: [
              { k:'evasion', name:'Evasion', icon:'💨', maxLv:5, desc:lv=>`+${10+lv*5}% dodge na 3s` },
            ]}
          ]
        }
      }
    },
    mage: {
      id:'mage', name:'Mage', icon:'🔮', desc:'Mocná kouzla ohně, ledu a přírody.',
      trees: {
        fire: { name:'Oheň', icon:'🔥',
          tiers: [
            { choices: [
              { k:'firebolt', name:'Firebolt', icon:'🔥', maxLv:5, desc:lv=>`${75+lv*35}% dmg ohněm` },
            ]},
            { choices: [
              { k:'fireball', name:'Fireball', icon:'💥', maxLv:5, requires:'mage_firebolt', requiresLv:1, desc:lv=>`${100+lv*50}% dmg ohněm + DoT ${15+lv*5}%/tick na 2s` },
            ]},
            { choices: [
              { k:'fireblast', name:'Fireblast', icon:'🌋', maxLv:5, requires:'mage_fireball', requiresLv:1, desc:lv=>`${150+lv*50}% dmg ohněm` },
            ]}
          ]
        },
        ice: { name:'Led', icon:'❄️',
          tiers: [
            { choices: [
              { k:'icebolt', name:'Icebolt', icon:'❄️', maxLv:5, desc:lv=>`${75+lv*35}% dmg ledem, zpomalí 25% na 2s` },
            ]},
            { choices: [
              { k:'frostbolt', name:'Frostbolt', icon:'🧊', maxLv:5, requires:'mage_icebolt', requiresLv:1, desc:lv=>`${100+lv*50}% dmg ledem, zmrazení na ${1+lv}s` },
            ]},
            { choices: [
              { k:'blizzard', name:'Blizzard', icon:'🌨️', maxLv:5, requires:'mage_frostbolt', requiresLv:1, desc:lv=>`${50+lv*25}% dmg ledem, zmrazení na ${1+lv} útoky` },
            ]}
          ]
        },
        nature: { name:'Příroda', icon:'🌿',
          tiers: [
            { choices: [
              { k:'regrowth', name:'Regrowth', icon:'💚', maxLv:5, desc:lv=>`Léčí ${10+lv*8} HP/tick na 3s` },
            ]},
            { choices: [
              { k:'naturesBoon', name:"Nature's Boon", icon:'🌿', maxLv:5, requires:'mage_regrowth', requiresLv:1, desc:lv=>`Léčí ${15+lv*12} HP/tick na 3s` },
            ]},
            { choices: [
              { k:'revitalize', name:'Revitalize', icon:'✨', maxLv:5, requires:'mage_naturesBoon', requiresLv:1, desc:lv=>`Léčí ${30+lv*20}% max HP + ${5+lv*3}% dmg buff na 5s` },
            ]}
          ]
        }
      }
    }
  };

  // Plochý seznam všech skillů pro rychlý lookup
  const SKILL_MAP = {};
  Object.keys(CLASS_SKILLS).forEach(classId => {
    const cls = CLASS_SKILLS[classId];
    Object.keys(cls.trees).forEach(treeId => {
      const tree = cls.trees[treeId];
      tree.tiers.forEach((tier, ti) => {
        tier.choices.forEach(t => {
          const key = classId + '_' + t.k;
          SKILL_MAP[key] = t;
          t._classId = classId;
          t._tierIdx = ti;
          t._treeId = treeId;
        });
      });
    });
  });

  // ===== CLASS SKILL HELPERS =====
  function getTalentLv(key) { return state.talentLevels[key] || 0; }
  function getClassSkillTree() {
    return CLASS_SKILLS[state.heroClass] || null;
  }
  function getSkillLv(skillKey) {
    return (state.talentLevels[skillKey] || 0) + (state.skillShoutBonus || 0);
  }
  function getSpellLv(spellId) {
    const cls = state.heroClass;
    if (cls === 'barbarian') {
      if (spellId === 'heroicStrike') return getSkillLv('barbarian_heroicStrike');
      if (spellId === 'battleShout') return getSkillLv('barbarian_battleShout');
      if (spellId === 'thunderClap') return getSkillLv('barbarian_thunderClap');
      if (spellId === 'bloodrage') return getSkillLv('barbarian_bloodrage');
      if (spellId === 'doubleSwing') return getSkillLv('barbarian_doubleSwing');
      if (spellId === 'whirlwind') return getSkillLv('barbarian_whirlwind');
      if (spellId === 'defensiveShout') return getSkillLv('barbarian_defensiveShout');
      if (spellId === 'skillShout') return getSkillLv('barbarian_skillShout');
      if (spellId === 'thunderBolt') return getSkillLv('barbarian_thunderBolt');
      if (spellId === 'shieldBash') return getSkillLv('barbarian_shieldBash');
    }
    if (cls === 'assassin') {
      if (spellId === 'shadowStrike') return getSkillLv('assassin_shadowStrike');
      if (spellId === 'poisonBlade') return getSkillLv('assassin_poisonBlade');
      if (spellId === 'evasion') return getSkillLv('assassin_evasion');
      if (spellId === 'bladeFury') return getSkillLv('assassin_bladeFury');
      if (spellId === 'smokeScreen') return getSkillLv('assassin_smokeScreen');
      if (spellId === 'deathMark') return getSkillLv('assassin_deathMark');
      if (spellId === 'shadowDance') return getSkillLv('assassin_shadowDance');
    }
    if (cls === 'mage') {
      if (spellId === 'firebolt') return getSkillLv('mage_firebolt');
      if (spellId === 'icebolt') return getSkillLv('mage_icebolt');
      if (spellId === 'regrowth') return getSkillLv('mage_regrowth');
      if (spellId === 'fireball') return getSkillLv('mage_fireball');
      if (spellId === 'frostbolt') return getSkillLv('mage_frostbolt');
      if (spellId === 'naturesBoon') return getSkillLv('mage_naturesBoon');
      if (spellId === 'blizzard') return getSkillLv('mage_blizzard');
      if (spellId === 'fireblast') return getSkillLv('mage_fireblast');
      if (spellId === 'revitalize') return getSkillLv('mage_revitalize');
    }
    return 0;
  }
  function getWeaponType() {
    const w = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
    return w.weaponType || 'fists';
  }
  // ===== RESIST MULT =====
  function getSchoolResistMult(schoolId) {
    const mb = mapBattleState;
    if (!mb || !mb.loc || !mb.loc.resists) return 1.0;
    const r = mb.loc.resists;
    if (schoolId === 'fire') return r.fire || 1.0;
    if (schoolId === 'ice') return r.ice || 1.0;
    if (schoolId === 'nature') return r.nature || 1.0;
    if (schoolId === 'lightning') return r.lightning || 1.0;
    return 1.0;
  }
  function getSpellLv(spellId) {
    if (spellId === 'fireball') return getTalentLv('fire_fireball');
    if (spellId === 'fireblast') return getTalentLv('fire_fireblast');
    if (spellId === 'firebolt') return getTalentLv('fire_firebolt');
    if (spellId === 'blizzard') return getTalentLv('ice_blizzard');
    if (spellId === 'icebolt') return getTalentLv('ice_icebolt');
    if (spellId === 'frostbolt') return getTalentLv('ice_frostbolt');
    if (spellId === 'strongStrike') return getTalentLv('physical_strongStrike');
    if (spellId === 'slash') return getTalentLv('physical_slash');
    if (spellId === 'whirlwind') return getTalentLv('physical_whirlwind');
    return 0;
  }
  function getRegrowthHeal() {
    if (state.activeSchool !== 'nature') return 0;
    const lv = getTalentLv('nature_regrowth');
    if (lv === 0) return 0;
    return 10 + lv * 8;
  }
  function getNaturesBoonHeal() {
    if (state.activeSchool !== 'nature') return 0;
    const lv = getTalentLv('nature_naturesboon');
    if (lv === 0) return 0;
    return 15 + lv * 12;
  }

  // ===== ITEMS (WEAPONS/ARMOR) =====
  const ITEMS = [
    // === ZÁKLADNÍ (bez ceny, startovní) ===
    { id:'fists', name:'Pěsti', type:'weapon', baseDmg:2, bonusHp:0, icon:'👊', iconImg:'', weaponType:'fists', swingMs:1500 },
    // === ZBRANĚ — magické (staff) ===
    { id:'dagger', name:'Dřevěná hůlka', type:'weapon', baseDmg:5, bonusHp:0, bonusMana:10, cost:15, icon:'🪄', iconImg:'assets/items/staff_wooden.png', weaponType:'staff', tier:1, swingMs:1800 },
    { id:'shortsword', name:'Ohnivá hůlka', type:'weapon', baseDmg:8, bonusHp:0, bonusMana:15, cost:25, icon:'🪄', iconImg:'assets/items/staff_fire.png', weaponType:'staff', tier:2, swingMs:1700 },
    { id:'sword', name:'Ledová hůl', type:'weapon', baseDmg:10, bonusHp:0, bonusMana:20, cost:30, icon:'🪄', iconImg:'assets/items/staff_ice.png', weaponType:'staff', tier:2, swingMs:1700 },
    { id:'battleAxe', name:'Blesková hůl', type:'weapon', baseDmg:13, bonusHp:0, bonusMana:25, cost:45, icon:'🪄', iconImg:'assets/items/staff_lightning.png', weaponType:'staff', tier:3, swingMs:1600 },
    { id:'spear', name:'Hvězdná hůl', type:'weapon', baseDmg:16, bonusHp:0, bonusMana:30, cost:55, icon:'🪄', iconImg:'assets/items/staff_archmage.png', weaponType:'staff', tier:3, swingMs:1600 },
    // === ZBRANĚ — fyzické (blade) ===
    { id:'ironSword', name:'Železný meč', type:'weapon', baseDmg:6, bonusHp:0, cost:20, icon:'⚔️', iconImg:'assets/items/weapon_iron_sword.png', weaponType:'blade', tier:1, swingMs:1900 },
    { id:'huntingKnife', name:'Lovecký nůž', type:'weapon', baseDmg:5, bonusHp:0, critChance:15, cost:15, icon:'🗡️', iconImg:'assets/items/weapon_hunting_knife.png', weaponType:'blade', tier:1, swingMs:1400 },
    { id:'broadSword', name:'Široký meč', type:'weapon', baseDmg:10, bonusHp:0, critChance:10, cost:35, icon:'⚔️', iconImg:'assets/items/weapon_broad_sword.png', weaponType:'blade', tier:2, swingMs:1800 },
    { id:'sabre', name:'Šavle', type:'weapon', baseDmg:9, bonusHp:0, critChance:20, cost:30, icon:'🗡️', iconImg:'assets/items/weapon_sabre.png', weaponType:'blade', tier:2, swingMs:1500 },
    { id:'battleAxePhys', name:'Bojová sekera', type:'weapon', baseDmg:14, bonusHp:0, critChance:10, cost:50, icon:'🪓', iconImg:'assets/items/weapon_battle_axe.png', weaponType:'blade', tier:3, swingMs:2000, twoHand:true },
    { id:'claymore', name:'Obouruční meč', type:'weapon', baseDmg:18, bonusHp:0, critChance:15, cost:80, icon:'⚔️', iconImg:'assets/items/weapon_claymore.png', weaponType:'blade', tier:4, swingMs:2100, twoHand:true },
    { id:'warAxe', name:'Válečná sekera', type:'weapon', baseDmg:20, bonusHp:0, critChance:15, cost:90, icon:'🪓', iconImg:'assets/items/weapon_war_axe.png', weaponType:'blade', tier:4, swingMs:2000, twoHand:true },
    { id:'greatSword', name:'Velký meč', type:'weapon', baseDmg:25, bonusHp:0, critChance:20, cost:130, icon:'⚔️', iconImg:'assets/items/weapon_great_sword.png', weaponType:'blade', tier:5, swingMs:2200, twoHand:true },
    { id:'greatAxe', name:'Dračí sekera', type:'weapon', baseDmg:28, bonusHp:0, critChance:15, cost:150, icon:'🪓', iconImg:'assets/items/weapon_war_hammer.png', weaponType:'blade', tier:5, swingMs:2300, twoHand:true },
    { id:'giantHammer', name:'Obří kladivo', type:'weapon', baseDmg:32, bonusHp:20, critChance:10, cost:200, icon:'🔨', iconImg:'assets/items/weapon_giant_hammer.png', weaponType:'blade', tier:6, swingMs:2400, twoHand:true },
    // === BRNĚNÍ ===
    // Normal (tier 1-3)
    { id:'leather', name:'Lněný hábit', type:'armor', baseDmg:0, bonusHp:15, bonusMana:5, defense:15, cost:20, icon:'👘', iconImg:'assets/items/armor_leather.png', tier:1 },
    { id:'chainmail', name:'Kožený hábit', type:'armor', baseDmg:0, bonusHp:35, bonusMana:10, defense:28, cost:35, icon:'👘', iconImg:'assets/items/armor_chainmail.png', tier:2 },
    { id:'scale', name:'Šupinový hábit', type:'armor', baseDmg:0, bonusHp:60, bonusMana:15, defense:44, cost:60, icon:'👘', iconImg:'assets/items/armor_scale.png', tier:3 },
    // Nightmare (tier 3-5)
    { id:'leather_nm', name:'Kůže zlověka', type:'armor', baseDmg:0, bonusHp:35, bonusMana:10, defense:67, cost:80, icon:'👘', iconImg:'assets/items/armor_leather.png', tier:3 },
    { id:'chainmail_nm', name:'Řetězová kůže', type:'armor', baseDmg:0, bonusHp:60, bonusMana:15, defense:82, cost:110, icon:'👘', iconImg:'assets/items/armor_chainmail.png', tier:4 },
    { id:'scale_nm', name:'Šupinová kůže', type:'armor', baseDmg:0, bonusHp:105, bonusMana:25, defense:105, cost:160, icon:'👘', iconImg:'assets/items/armor_scale.png', tier:5 },
    // Hell (tier 5-7)
    { id:'leather_hell', name:'Ďábelská kůže', type:'armor', baseDmg:0, bonusHp:60, bonusMana:15, defense:130, cost:140, icon:'👘', iconImg:'assets/items/armor_leather.png', tier:5 },
    { id:'chainmail_hell', name:'Démonická kůže', type:'armor', baseDmg:0, bonusHp:105, bonusMana:25, defense:160, cost:200, icon:'👘', iconImg:'assets/items/armor_chainmail.png', tier:6 },
    { id:'scale_hell', name:'Plamenná kůže', type:'armor', baseDmg:0, bonusHp:140, bonusMana:35, defense:200, cost:280, icon:'👘', iconImg:'assets/items/armor_scale.png', tier:7 },
    // === HELMY ===
    // Normal
    { id:'linenHood', name:'Lněná kápě', type:'helmet', baseDmg:0, bonusHp:10, defense:8, cost:15, icon:'🎭', iconImg:'assets/items/helmet_linen_hood.png', tier:1 },
    { id:'ironHelm', name:'Železná helma', type:'helmet', baseDmg:0, bonusHp:25, defense:15, cost:30, icon:'⛑️', iconImg:'assets/items/helmet_iron_helm.png', tier:2 },
    { id:'steelHelm', name:'Ocelová helma', type:'helmet', baseDmg:0, bonusHp:50, defense:23, cost:60, icon:'⛑️', iconImg:'assets/items/helmet_steel_helm.png', tier:3 },
    // Nightmare
    { id:'linenHood_nm', name:'Kápě stínů', type:'helmet', baseDmg:0, bonusHp:25, defense:35, cost:50, icon:'🎭', iconImg:'assets/items/helmet_linen_hood.png', tier:3 },
    { id:'ironHelm_nm', name:'Temná helma', type:'helmet', baseDmg:0, bonusHp:50, defense:43, cost:80, icon:'⛑️', iconImg:'assets/items/helmet_iron_helm.png', tier:4 },
    { id:'steelHelm_nm', name:'Krvavá helma', type:'helmet', baseDmg:0, bonusHp:90, defense:55, cost:130, icon:'⛑️', iconImg:'assets/items/helmet_steel_helm.png', tier:5 },
    // Hell
    { id:'linenHood_hell', name:'Kápě zmaru', type:'helmet', baseDmg:0, bonusHp:50, defense:68, cost:100, icon:'🎭', iconImg:'assets/items/helmet_linen_hood.png', tier:5 },
    { id:'ironHelm_hell', name:'Pekelná helma', type:'helmet', baseDmg:0, bonusHp:90, defense:85, cost:170, icon:'⛑️', iconImg:'assets/items/helmet_iron_helm.png', tier:6 },
    { id:'steelHelm_hell', name:'Zhoubná helma', type:'helmet', baseDmg:0, bonusHp:140, defense:105, cost:250, icon:'⛑️', iconImg:'assets/items/helmet_steel_helm.png', tier:7 },
    // === ŠTÍTY ===
    // Normal
    { id:'woodenShield', name:'Dřevěný štít', type:'shield', baseDmg:0, bonusHp:5, blockChance:20, defense:6, cost:15, icon:'🛡️', iconImg:'assets/items/shield_wooden.png', tier:1 },
    { id:'leatherShield', name:'Kožený štít', type:'shield', baseDmg:0, bonusHp:10, blockChance:25, defense:11, cost:30, icon:'🛡️', iconImg:'assets/items/shield_leather.png', tier:2 },
    { id:'ironShield', name:'Železný štít', type:'shield', baseDmg:0, bonusHp:15, blockChance:30, defense:18, cost:55, icon:'🛡️', iconImg:'assets/items/shield_iron.png', tier:3 },
    // Nightmare
    { id:'woodenShield_nm', name:'Kostěný štít', type:'shield', baseDmg:0, bonusHp:10, blockChance:25, defense:27, cost:50, icon:'🛡️', iconImg:'assets/items/shield_wooden.png', tier:3 },
    { id:'leatherShield_nm', name:'Štít z kůže', type:'shield', baseDmg:0, bonusHp:15, blockChance:30, defense:33, cost:80, icon:'🛡️', iconImg:'assets/items/shield_leather.png', tier:4 },
    { id:'ironShield_nm', name:'Kovaný štít', type:'shield', baseDmg:0, bonusHp:20, blockChance:35, defense:42, cost:130, icon:'🛡️', iconImg:'assets/items/shield_iron.png', tier:5 },
    // Hell
    { id:'woodenShield_hell', name:'Ďábelský štít', type:'shield', baseDmg:0, bonusHp:15, blockChance:30, defense:52, cost:100, icon:'🛡️', iconImg:'assets/items/shield_wooden.png', tier:5 },
    { id:'leatherShield_hell', name:'Démonický štít', type:'shield', baseDmg:0, bonusHp:20, blockChance:35, defense:65, cost:170, icon:'🛡️', iconImg:'assets/items/shield_leather.png', tier:6 },
    { id:'ironShield_hell', name:'Pekelný štít', type:'shield', baseDmg:0, bonusHp:30, blockChance:40, defense:80, cost:250, icon:'🛡️', iconImg:'assets/items/shield_iron.png', tier:7 },
    // === PRSTENY ===
    { id:'copperRing', name:'Měděný prsten', type:'ring', cost:15, icon:'💍', iconImg:'assets/items/ring_copper.png', tier:1 },
    { id:'silverRing', name:'Stříbrný prsten', type:'ring', cost:55, icon:'💍', iconImg:'assets/items/ring_silver.png', tier:3 },
    { id:'goldRing', name:'Zlatý prsten', type:'ring', cost:100, icon:'💍', iconImg:'assets/items/ring_gold.png', tier:4 },
    { id:'gemRing', name:'Drahokamový prsten', type:'ring', cost:180, icon:'💍', iconImg:'assets/items/ring_gem.png', tier:5 },
    // === AMULETY ===
    { id:'boneAmulet', name:'Kostěný amulet', type:'amulet', cost:20, icon:'📿', iconImg:'assets/items/amulet_bone.png', tier:1 },
    { id:'silverAmulet', name:'Stříbrný amulet', type:'amulet', cost:60, icon:'📿', iconImg:'assets/items/amulet_silver.png', tier:3 },
    { id:'goldAmulet', name:'Zlatý amulet', type:'amulet', cost:110, icon:'📿', iconImg:'assets/items/amulet_gold.png', tier:4 },
    { id:'rubyAmulet', name:'Rubínový amulet', type:'amulet', cost:190, icon:'📿', iconImg:'assets/items/amulet_ruby.png', tier:5 },
    { id:'arcaneAmulet', name:'Arcánní amulet', type:'amulet', cost:250, icon:'📿', iconImg:'assets/items/amulet_arcane.png', tier:6 },
    // === BELTY ===
    { id:'clothBelt', name:'Lněný opasek', type:'belt', baseDmg:0, bonusHp:0, beltSlots:1, cost:10, icon:'🎗️', iconImg:'assets/items/belt_cloth.png', tier:1 },
    { id:'leatherBelt', name:'Kožený opasek', type:'belt', baseDmg:0, bonusHp:5, beltSlots:2, cost:25, icon:'🎗️', iconImg:'assets/items/belt_leather.png', tier:2 },
    { id:'ironBelt', name:'Železný opasek', type:'belt', baseDmg:0, bonusHp:10, beltSlots:3, cost:50, icon:'🎗️', iconImg:'assets/items/belt_iron.png', tier:3 },
    { id:'steelBelt', name:'Ocelový opasek', type:'belt', baseDmg:0, bonusHp:15, beltSlots:4, cost:90, icon:'🎗️', iconImg:'assets/items/belt_steel.png', tier:4 },
    { id:'mithrilBelt', name:'Mithrilový opasek', type:'belt', baseDmg:0, bonusHp:25, beltSlots:5, cost:160, icon:'🎗️', iconImg:'assets/items/belt_mithril.png', tier:5 },
    // === POTIONY (consumable) ===
    { id:'healingPotion', name:'Léčivý lektvar', type:'consumable', subtype:'heal', effectValue:50, cost:15, icon:'🧪', iconImg:'assets/items/potion_healing.png', tier:1 },
    { id:'manaPotion', name:'Mana lektvar', type:'consumable', subtype:'mana', effectValue:30, cost:15, icon:'🧪', iconImg:'assets/items/potion_mana.png', tier:1 },
  ];

  // ===== AFFIX DATABÁZE (prefixy + suffixy) =====
  // Každý affix: id, name, type (prefix/suffix), group (stejná group = vzájemně se vylučují),
  // minIlvl, weight (vyšší = častější), types (kompatibilní sloty),
  // stats: { statName: [min, max] }, tint: barva overlay
  const AFFIXES = [
    // === PREFIXY ===
    { id:'fiery', name:'Ohnivý', type:'prefix', group:1, minIlvl:5, weight:8,
      types:['weapon'], stats:{ fireDmg:[3,8] }, tint:'#e94560' },
    { id:'icy', name:'Ledový', type:'prefix', group:1, minIlvl:8, weight:8,
      types:['weapon'], stats:{ iceDmg:[3,8] }, tint:'#4a7dff' },
    { id:'keen', name:'Obratný', type:'prefix', group:6, minIlvl:8, weight:7,
      types:['weapon','ring'], stats:{ attackRating:[5,15] }, tint:'#f1c40f' },
    { id:'sharp', name:'Bystrý', type:'prefix', group:7, minIlvl:10, weight:6,
      types:['weapon','ring','amulet'], stats:{ critChance:[3,8] }, tint:'#e67e22' },
    { id:'bloody', name:'Krvavý', type:'prefix', group:8, minIlvl:12, weight:5,
      types:['weapon','ring','amulet'], stats:{ lifesteal:[2,5] }, tint:'#e94560' },
    { id:'manaSteal', name:'Manažroutský', type:'prefix', group:14, minIlvl:10, weight:5,
      types:['weapon','ring','amulet'], stats:{ manaSteal:[2,5] }, tint:'#4a7dff' },
    { id:'fortified', name:'Zpevněný', type:'prefix', group:15, minIlvl:8, weight:8,
      types:['armor','shield','helmet'], stats:{ enhancedDefense:[10,30] }, tint:'#888' },
    { id:'deadly', name:'Smrtící', type:'prefix', group:16, minIlvl:8, weight:8,
      types:['weapon'], stats:{ enhancedDmg:[10,30] }, tint:'#e94560' },
    { id:'mystic', name:'Záhadný', type:'prefix', group:9, minIlvl:8, weight:6,
      types:['ring','amulet','helmet'], stats:{ int:[2,6] }, tint:'#9b59b6' },
    { id:'dexterous', name:'Hbitý', type:'prefix', group:10, minIlvl:8, weight:6,
      types:['weapon','ring','amulet'], stats:{ dex:[2,6] }, tint:'#1abc9c' },
    { id:'poisoned', name:'Jedovatý', type:'prefix', group:11, minIlvl:10, weight:5,
      types:['weapon'], stats:{ poisonDmg:[3,8] }, tint:'#2ecc71' },
    { id:'manaRegen', name:'Obnovující', type:'prefix', group:12, minIlvl:8, weight:6,
      types:['ring','amulet','helmet'], stats:{ manaRegen:[1,3] }, tint:'#4a7dff' },
    { id:'skillful', name:'Dovedný', type:'prefix', group:13, minIlvl:10, weight:5,
      types:['weapon','ring','amulet'], stats:{ skillDmg:[5,15] }, tint:'#9b59b6' },
    // === SUFFIXY ===
    { id:'ofAccuracy', name:'Přesnosti', type:'suffix', group:105, minIlvl:10, weight:7,
      types:['weapon','ring'], stats:{ attackRating:[5,15] }, tint:'#f1c40f' },
    { id:'ofSpeed', name:'Rychlosti', type:'suffix', group:106, minIlvl:12, weight:5,
      types:['weapon'], stats:{ swingMs:[-200,-100] }, tint:'#1abc9c' },
    { id:'ofCritical', name:'Kritičnosti', type:'suffix', group:107, minIlvl:12, weight:6,
      types:['weapon','ring','amulet'], stats:{ critChance:[3,8] }, tint:'#e67e22' },
    { id:'ofWisdom', name:'Moudrosti', type:'suffix', group:108, minIlvl:10, weight:6,
      types:['ring','amulet','helmet'], stats:{ int:[2,6] }, tint:'#9b59b6' },
    { id:'ofStrength', name:'Síly', type:'suffix', group:109, minIlvl:10, weight:6,
      types:['ring','amulet','armor'], stats:{ str:[2,6] }, tint:'#e94560' },
    { id:'ofEndurance', name:'Odolnosti', type:'suffix', group:110, minIlvl:10, weight:6,
      types:['ring','amulet','armor'], stats:{ vit:[2,6] }, tint:'#2ecc71' },
    { id:'ofDexterity', name:'Obratnosti', type:'suffix', group:111, minIlvl:10, weight:6,
      types:['ring','amulet','weapon'], stats:{ dex:[2,6] }, tint:'#1abc9c' },
    { id:'ofManaRegen', name:'Regenerace', type:'suffix', group:112, minIlvl:10, weight:5,
      types:['ring','amulet','helmet'], stats:{ manaRegen:[1,3] }, tint:'#4a7dff' },
    { id:'ofSkill', name:'Dovednosti', type:'suffix', group:113, minIlvl:12, weight:5,
      types:['ring','amulet','weapon'], stats:{ skillDmg:[5,15] }, tint:'#9b59b6' },
    { id:'ofVenom', name:'Jed', type:'suffix', group:114, minIlvl:12, weight:4,
      types:['weapon'], stats:{ poisonDmg:[3,8] }, tint:'#2ecc71' },
    { id:'ofManaSteal', name:'Many', type:'suffix', group:115, minIlvl:10, weight:5,
      types:['weapon','ring','amulet'], stats:{ manaSteal:[2,5] }, tint:'#4a7dff' },
    { id:'ofFortification', name:'Opevnění', type:'suffix', group:116, minIlvl:8, weight:8,
      types:['armor','shield','helmet'], stats:{ enhancedDefense:[10,30] }, tint:'#888' },
    { id:'ofSlaughter', name:'Porážky', type:'suffix', group:117, minIlvl:8, weight:8,
      types:['weapon'], stats:{ enhancedDmg:[10,30] }, tint:'#e94560' },
  ];

  // ===== UNIQUE ITEMY (fixní sady affixů) =====
  // uniqueProp: { type, value, desc } — unikátní vlastnost mimo affixy
  const UNIQUE_ITEMS = [
    // === STAFF (Mage) ===
    { id:'unique_dagger', name:'Hůlka počátků', baseId:'dagger',
      affixIds:['keen','ofAccuracy'], minLevel:1, tier:2,
      iconImg:'assets/items/staff_wooden.png', icon:'🪄',
      uniqueProp:{ type:'freeCast', value:10, desc:'10% šance sešle kouzlo zdarma' } },
    { id:'unique_shortsword', name:'Planoucí hůlka', baseId:'shortsword',
      affixIds:['fiery','ofSlaughter'], minLevel:2, tier:3,
      iconImg:'assets/items/staff_fire.png', icon:'🪄',
      uniqueProp:{ type:'skillDmgBonus', value:15, desc:'+15% fire skill damage' } },
    { id:'unique_sword', name:'Mrazivá hůl', baseId:'sword',
      affixIds:['icy','ofWisdom'], minLevel:2, tier:3,
      iconImg:'assets/items/staff_ice.png', icon:'🪄',
      uniqueProp:{ type:'skillDmgBonus', value:15, desc:'+15% ice skill damage' } },
    { id:'unique_battleAxe', name:'Bouřná hůl', baseId:'battleAxe',
      affixIds:['keen','ofSpeed'], minLevel:3, tier:4,
      iconImg:'assets/items/staff_lightning.png', icon:'🪄',
      uniqueProp:{ type:'castSpeed', value:10, desc:'+10% cast speed' } },
    { id:'unique_spear', name:'Hvězdná hůl', baseId:'spear',
      affixIds:['skillful','ofCritical'], minLevel:3, tier:4,
      iconImg:'assets/items/staff_archmage.png', icon:'🪄',
      uniqueProp:{ type:'magicCrit', value:5, desc:'+5% magic crit chance' } },
    { id:'unique_flameSword', name:'Plamená hůl', baseId:'flameSword',
      affixIds:['fiery','ofSlaughter'], minLevel:4, tier:5,
      iconImg:'assets/items/staff_archmage.png', icon:'🪄',
      uniqueProp:{ type:'doubleFireCrit', value:20, desc:'20% šance při critu zdvojnásobí fire dmg' } },
    { id:'unique_longsword', name:'Měsíční hůl', baseId:'longsword',
      affixIds:['mystic','ofManaSteal'], minLevel:4, tier:5,
      iconImg:'assets/items/staff_archmage.png', icon:'🪄',
      uniqueProp:{ type:'manaRegenFlat', value:2, desc:'+2 mana/sec regen' } },
    { id:'unique_archStaff', name:'Arcimágova hůl', baseId:'archStaff',
      affixIds:['skillful','ofWisdom'], minLevel:5, tier:6,
      iconImg:'assets/items/staff_archmage.png', icon:'🪄',
      uniqueProp:{ type:'skillDmgBonus', value:20, desc:'+20% skill damage' } },

    // === BLADE (Barbar + Assassin) ===
    { id:'unique_ironSword', name:'Železný meč', baseId:'ironSword',
      affixIds:['deadly','ofSlaughter'], minLevel:1, tier:2,
      iconImg:'assets/items/weapon_iron_sword.png', icon:'⚔️',
      uniqueProp:{ type:'defenseBonus', value:5, desc:'+5 defense při držení' } },
    { id:'unique_huntingKnife', name:'Lovecký nůž', baseId:'huntingKnife',
      affixIds:['keen','ofAccuracy'], minLevel:1, tier:2,
      iconImg:'assets/items/weapon_hunting_knife.png', icon:'🗡️',
      uniqueProp:{ type:'critDmgBonus', value:10, desc:'+10% crit damage' } },
    { id:'unique_flame_sword', name:'Plamenný meč', baseId:'broadSword',
      affixIds:['fiery','ofCritical'], minLevel:2, tier:3,
      iconImg:'assets/items/weapon_broad_sword.png', icon:'⚔️',
      uniqueProp:{ type:'fireProc', value:15, desc:'15% šance přidá fire dmg' } },
    { id:'unique_sabre', name:'Šavle větru', baseId:'sabre',
      affixIds:['keen','ofSpeed'], minLevel:2, tier:3,
      iconImg:'assets/items/weapon_sabre.png', icon:'🗡️',
      uniqueProp:{ type:'attackSpeed', value:10, desc:'+10% attack speed' } },
    { id:'unique_battleAxePhys', name:'Bojová sekera', baseId:'battleAxePhys',
      affixIds:['deadly','ofStrength'], minLevel:3, tier:4,
      iconImg:'assets/items/weapon_battle_axe.png', icon:'🪓',
      uniqueProp:{ type:'doubleHit', value:20, desc:'20% šance na double hit' } },
    { id:'unique_claymore', name:'Obouruční meč', baseId:'claymore',
      affixIds:['sharp','ofCritical'], minLevel:4, tier:5,
      iconImg:'assets/items/weapon_claymore.png', icon:'⚔️',
      uniqueProp:{ type:'doubleDmg', value:10, desc:'10% šance na double damage' } },
    { id:'unique_warAxe', name:'Válečná sekera', baseId:'warAxe',
      affixIds:['bloody','ofStrength'], minLevel:4, tier:5,
      iconImg:'assets/items/weapon_war_axe.png', icon:'🪓',
      uniqueProp:{ type:'lifestealBonus', value:20, desc:'+20% lifesteal' } },
    { id:'unique_greatSword', name:'Velký meč', baseId:'greatSword',
      affixIds:['sharp','ofStrength'], minLevel:5, tier:6,
      iconImg:'assets/items/weapon_great_sword.png', icon:'⚔️',
      uniqueProp:{ type:'baseDmgBonus', value:15, desc:'+15% base damage' } },
    { id:'unique_greatAxe', name:'Dračí sekera', baseId:'greatAxe',
      affixIds:['fiery','ofSlaughter'], minLevel:5, tier:6,
      iconImg:'assets/items/weapon_war_hammer.png', icon:'🪓',
      uniqueProp:{ type:'fireProcDmg', value:50, desc:'10% šance způsobí 50% base dmg jako fire' } },
    { id:'unique_giantHammer', name:'Obří kladivo', baseId:'giantHammer',
      affixIds:['deadly','ofEndurance'], minLevel:6, tier:7,
      iconImg:'assets/items/weapon_giant_hammer.png', icon:'🔨',
      uniqueProp:{ type:'stunProc', value:15, desc:'15% šance omráčí na 1s' } },

    // === ARMOR ===
    { id:'unique_leather', name:'Lněný hábit', baseId:'leather',
      affixIds:['skillful','ofManaSteal'], minLevel:1, tier:2,
      iconImg:'assets/items/armor_leather.png', icon:'👘',
      uniqueProp:{ type:'skillDmgBonus', value:5, desc:'+5% skill damage' } },
    { id:'unique_chainmail', name:'Kožený hábit', baseId:'chainmail',
      affixIds:['keen','ofFortification'], minLevel:2, tier:3,
      iconImg:'assets/items/armor_chainmail.png', icon:'👘',
      uniqueProp:{ type:'dodgeBonus', value:5, desc:'+5% dodge chance' } },
    { id:'unique_bulletproof', name:'Neprůstřelná kůže', baseId:'scale',
      affixIds:['fortified','ofFortification'], minLevel:3, tier:4,
      iconImg:'assets/items/armor_scale.png', icon:'👘',
      uniqueProp:{ type:'dmgReduce', value:50, desc:'5% šance sníží incoming dmg o 50%' } },
    { id:'unique_fullPlate', name:'Kroužkový hábit', baseId:'scale_nm',
      affixIds:['fortified','ofEndurance'], minLevel:4, tier:5,
      iconImg:'assets/items/armor_plate.png', icon:'👘',
      uniqueProp:{ type:'defenseMult', value:10, desc:'+10% k defense (multiplikativně)' } },
    { id:'unique_dragonScale', name:'Dračí hábit', baseId:'scale_hell',
      affixIds:['fortified','ofFortification'], minLevel:5, tier:6,
      iconImg:'assets/items/armor_dragon_scale.png', icon:'👘',
      uniqueProp:{ type:'dmgReflect', value:20, desc:'10% šance odrazí 20% dmg zpět' } },

    // === HELMET ===
    { id:'unique_linenHood', name:'Lněná kápě', baseId:'linenHood',
      affixIds:['mystic','ofWisdom'], minLevel:1, tier:2,
      iconImg:'assets/items/helmet_linen_hood.png', icon:'🎭',
      uniqueProp:{ type:'attackRatingBonus', value:10, desc:'+10 attack rating' } },
    { id:'unique_ironHelm', name:'Železná helma', baseId:'ironHelm',
      affixIds:['fortified','ofStrength'], minLevel:2, tier:3,
      iconImg:'assets/items/helmet_iron_helm.png', icon:'⛑️',
      uniqueProp:{ type:'stunResist', value:5, desc:'+5% stun resistance' } },
    { id:'unique_crown_wisdom', name:'Koruna moudrosti', baseId:'steelHelm_nm',
      affixIds:['mystic','ofManaSteal'], minLevel:3, tier:4,
      iconImg:'assets/items/helmet_steel_helm.png', icon:'⛑️',
      uniqueProp:{ type:'bonusTalent', value:1, desc:'+1 k náhodnému talentu' } },
    { id:'unique_crown', name:'Arcimágova koruna', baseId:'steelHelm_hell',
      affixIds:['skillful','ofWisdom'], minLevel:5, tier:6,
      iconImg:'assets/items/helmet_crown.png', icon:'👑',
      uniqueProp:{ type:'skillDmgBonus', value:10, desc:'+10% skill damage' } },

    // === SHIELD ===
    { id:'unique_woodenShield', name:'Dřevěný štít', baseId:'woodenShield',
      affixIds:['fortified','ofFortification'], minLevel:1, tier:2,
      iconImg:'assets/items/shield_wooden.png', icon:'🛡️',
      uniqueProp:{ type:'blockBonus', value:5, desc:'+5% block chance' } },
    { id:'unique_leatherShield', name:'Kožený štít', baseId:'leatherShield',
      affixIds:['fortified','ofFortification'], minLevel:2, tier:3,
      iconImg:'assets/items/shield_leather.png', icon:'🛡️',
      uniqueProp:{ type:'dodgeBonus', value:3, desc:'+3% dodge chance' } },
    { id:'unique_shield_endurance', name:'Štít odolnosti', baseId:'ironShield_nm',
      affixIds:['fortified','ofFortification'], minLevel:3, tier:4,
      iconImg:'assets/items/shield_iron.png', icon:'🛡️',
      uniqueProp:{ type:'fullBlock', value:10, desc:'10% šance při bloku absorbuje 100% dmg' } },
    { id:'unique_steelShield', name:'Ocelový štít', baseId:'ironShield_hell',
      affixIds:['fortified','ofEndurance'], minLevel:4, tier:5,
      iconImg:'assets/items/shield_steel.png', icon:'🛡️',
      uniqueProp:{ type:'blockReflect', value:30, desc:'10% šance při bloku odrazí 30% dmg' } },
    { id:'unique_paladinShield', name:'Paladinův štít', baseId:'ironShield_hell',
      affixIds:['fortified','ofStrength'], minLevel:5, tier:6,
      iconImg:'assets/items/shield_paladin.png', icon:'🛡️',
      uniqueProp:{ type:'spellBlock', value:15, desc:'15% šance zablokuje kouzlo' } },

    // === RING ===
    { id:'unique_copperRing', name:'Měděný prsten', baseId:'copperRing',
      affixIds:['skillful','ofManaSteal'], minLevel:1, tier:2,
      iconImg:'assets/items/ring_copper.png', icon:'💍',
      uniqueProp:{ type:'manaRegenFlat', value:1, desc:'+1 mana/sec regen' } },
    { id:'unique_ring_blood', name:'Prsten krve', baseId:'silverRing',
      affixIds:['bloody','ofSlaughter'], minLevel:3, tier:4,
      iconImg:'assets/items/ring_silver.png', icon:'💍',
      uniqueProp:{ type:'killHeal', value:10, desc:'10% šance při killu obnoví 10% HP' } },
    { id:'unique_goldRing', name:'Zlatý prsten', baseId:'goldRing',
      affixIds:['sharp','ofCritical'], minLevel:4, tier:5,
      iconImg:'assets/items/ring_gold.png', icon:'💍',
      uniqueProp:{ type:'critDmgBonus', value:10, desc:'+10% crit damage' } },
    { id:'unique_gemRing', name:'Drahokamový prsten', baseId:'gemRing',
      affixIds:['mystic','ofWisdom'], minLevel:5, tier:6,
      iconImg:'assets/items/ring_gem.png', icon:'💍',
      uniqueProp:{ type:'skillDmgBonus', value:5, desc:'+5% skill damage' } },

    // === AMULET ===
    { id:'unique_boneAmulet', name:'Kostěný amulet', baseId:'boneAmulet',
      affixIds:['bloody','ofManaSteal'], minLevel:1, tier:2,
      iconImg:'assets/items/amulet_bone.png', icon:'📿',
      uniqueProp:{ type:'hpBonus', value:5, desc:'+5% HP' } },
    { id:'unique_amulet_power', name:'Amulet moci', baseId:'silverAmulet',
      affixIds:['sharp','ofStrength'], minLevel:3, tier:4,
      iconImg:'assets/items/amulet_silver.png', icon:'📿',
      uniqueProp:{ type:'baseDmgBonus', value:5, desc:'+5% base damage' } },
    { id:'unique_goldAmulet', name:'Zlatý amulet', baseId:'goldAmulet',
      affixIds:['skillful','ofManaSteal'], minLevel:4, tier:5,
      iconImg:'assets/items/amulet_gold.png', icon:'📿',
      uniqueProp:{ type:'manaBonus', value:5, desc:'+5% mana' } },
    { id:'unique_rubyAmulet', name:'Rubínový amulet', baseId:'rubyAmulet',
      affixIds:['fiery','ofCritical'], minLevel:5, tier:6,
      iconImg:'assets/items/amulet_ruby.png', icon:'📿',
      uniqueProp:{ type:'fireProcDmg', value:30, desc:'10% šance způsobí 30% base dmg jako fire' } },
    { id:'unique_arcaneAmulet', name:'Arcánní amulet', baseId:'arcaneAmulet',
      affixIds:['skillful','ofWisdom'], minLevel:6, tier:7,
      iconImg:'assets/items/amulet_arcane.png', icon:'📿',
      uniqueProp:{ type:'skillDmgBonus', value:10, desc:'+10% skill damage' } },
  ];

  const ITEM_MAP = {}; ITEMS.forEach(i => ITEM_MAP[i.id] = i);
  // Mapa pro generované loot itemy (doplňuje ITEM_MAP)
  let _lootItemMap = {};

  function getItemInfo(id) {
    return ITEM_MAP[id] || _lootItemMap[id] || null;
  }

  // ===== LOOT GENERATION =====
  // Quality podle počtu affixů: normal(0), magic(1-2), rare(3-4), unique(5+)
  const QUALITY_COLORS = {
    normal: '#888',
    magic: '#4a7dff',
    rare: '#ffd700',
    unique: '#e94560'
  };

  function getQualityColor(item) {
    if (item.unique) return QUALITY_COLORS.unique;
    const n = (item.affixes || []).length;
    if (n >= 3) return QUALITY_COLORS.rare;
    if (n >= 1) return QUALITY_COLORS.magic;
    return QUALITY_COLORS.normal;
  }

  function rollQuality() {
    const roll = Math.random() * 100;
    if (roll < 1) return 'unique';       // 1% unique
    if (roll < 6) return 'rare';          // 5% rare
    if (roll < 30) return 'magic';        // 24% magic
    return 'normal';                      // 70% common
  }

  function pickWeighted(arr, weightKey) {
    const total = arr.reduce((s, a) => s + a[weightKey], 0);
    let r = Math.random() * total;
    for (const a of arr) {
      r -= a[weightKey];
      if (r <= 0) return a;
    }
    return arr[arr.length - 1];
  }

  function rollStat(statRange) {
    return statRange[0] + Math.floor(Math.random() * (statRange[1] - statRange[0] + 1));
  }

  function generateLootItemWithAffixes(baseItem, quality, monsterLevel) {
    const ilvl = monsterLevel;

    // Filtrovat affixy: minIlvl <= ilvl, kompatibilní typ
    const candidates = AFFIXES.filter(a =>
      a.minIlvl <= ilvl && a.types.includes(baseItem.type));

    // Rozdělit na prefixy a suffixy
    const prefixes = candidates.filter(a => a.type === 'prefix');
    const suffixes = candidates.filter(a => a.type === 'suffix');

    let chosenAffixes = [];
    let usedGroups = new Set();

    function pickAffix(pool) {
      const available = pool.filter(a => !usedGroups.has(a.group));
      if (available.length === 0) return null;
      return pickWeighted(available, 'weight');
    }

    if (quality === 'magic') {
      // Magic: 1-2 affixy (max 1 prefix + 1 suffix)
      const p = pickAffix(prefixes);
      if (p) { chosenAffixes.push(p); usedGroups.add(p.group); }
      const s = pickAffix(suffixes);
      if (s) { chosenAffixes.push(s); usedGroups.add(s.group); }
    } else if (quality === 'rare') {
      // Rare: 3 affixy (střídavě prefix/suffix)
      for (let i = 0; i < 3; i++) {
        const pool = (i % 2 === 0) ? prefixes : suffixes;
        const a = pickAffix(pool);
        if (a) { chosenAffixes.push(a); usedGroups.add(a.group); }
      }
    }

    // Aplikovat staty z affixů na base
    const lootItem = {
      ...baseItem,
      id: 'loot_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      affixes: chosenAffixes,
      quality: quality,
      ilvl: ilvl,
      // Base staty
      baseDmg: baseItem.baseDmg || 0,
      bonusHp: baseItem.bonusHp || 0,
      bonusMana: baseItem.bonusMana || 0,
      defense: baseItem.defense || 0,
      critChance: baseItem.critChance || 0,
      attackRating: baseItem.attackRating || 0,
      swingMs: baseItem.swingMs || 0,
      // Affix staty (přičtou se)
      fireDmg: 0,
      iceDmg: 0,
      lifesteal: 0,
      manaSteal: 0,
      enhancedDefense: 0,
      enhancedDmg: 0,
      str: 0,
      vit: 0,
      int: 0,
      dex: 0,
      skillDmg: 0,
      manaRegen: 0,
      poisonDmg: 0,
    };

    // Aplikovat affix staty
    chosenAffixes.forEach(a => {
      Object.keys(a.stats).forEach(stat => {
        const val = rollStat(a.stats[stat]);
        if (stat === 'swingMs') {
          lootItem[stat] += val; // záporné = rychlejší
        } else {
          lootItem[stat] += val;
        }
      });
    });

    // Procentuální bonusy: enhancedDefense a enhancedDmg se aplikují na base staty
    if (lootItem.enhancedDefense > 0 && lootItem.defense > 0) {
      lootItem.defense = Math.round(lootItem.defense * (1 + lootItem.enhancedDefense / 100));
    }
    if (lootItem.enhancedDmg > 0 && lootItem.baseDmg > 0) {
      lootItem.baseDmg = Math.round(lootItem.baseDmg * (1 + lootItem.enhancedDmg / 100));
    }

    // Level requirement
    const maxAffixIlvl = chosenAffixes.length > 0
      ? Math.max(...chosenAffixes.map(a => a.minIlvl))
      : 0;
    lootItem.lvlReq = Math.floor(0.75 * maxAffixIlvl);

    // Název: prefix + base + suffix
    const prefixName = chosenAffixes.filter(a => a.type === 'prefix').map(a => a.name).join(' ');
    const suffixName = chosenAffixes.filter(a => a.type === 'suffix').map(a => a.name).join(' ');
    lootItem.name = [prefixName, baseItem.name, suffixName].filter(Boolean).join(' ');

    return lootItem;
  }

  function generateUniqueItem(uniqueDef) {
    const baseItem = ITEM_MAP[uniqueDef.baseId];
    if (!baseItem) return null;

    const affixes = uniqueDef.affixIds.map(id => AFFIXES.find(a => a.id === id)).filter(Boolean);

    const item = {
      ...baseItem,
      id: uniqueDef.id,
      name: uniqueDef.name,
      affixes: affixes,
      quality: 'unique',
      unique: true,
      uniqueProp: uniqueDef.uniqueProp || null,
      tier: uniqueDef.tier || 5,
      iconImg: uniqueDef.iconImg || baseItem.iconImg,
      icon: uniqueDef.icon || baseItem.icon,
      lvlReq: uniqueDef.minLevel || 1,
      // Base staty
      baseDmg: baseItem.baseDmg || 0,
      bonusHp: baseItem.bonusHp || 0,
      bonusMana: baseItem.bonusMana || 0,
      defense: baseItem.defense || 0,
      critChance: baseItem.critChance || 0,
      attackRating: baseItem.attackRating || 0,
      swingMs: baseItem.swingMs || 0,
      fireDmg: 0, iceDmg: 0, lifesteal: 0, manaSteal: 0,
      enhancedDefense: 0, enhancedDmg: 0,
      str: 0, vit: 0, int: 0, dex: 0,
      skillDmg: 0, manaRegen: 0, poisonDmg: 0,
    };

    affixes.forEach(a => {
      Object.keys(a.stats).forEach(stat => {
        const val = rollStat(a.stats[stat]);
        if (stat === 'swingMs') item[stat] += val;
        else item[stat] += val;
      });
    });

    // Procentuální bonusy pro unikáty
    if (item.enhancedDefense > 0 && item.defense > 0) {
      item.defense = Math.round(item.defense * (1 + item.enhancedDefense / 100));
    }
    if (item.enhancedDmg > 0 && item.baseDmg > 0) {
      item.baseDmg = Math.round(item.baseDmg * (1 + item.enhancedDmg / 100));
    }

    return item;
  }

  function initUniqueItems() {
    UNIQUE_ITEMS.forEach(u => {
      const item = generateUniqueItem(u);
      if (item) ITEM_MAP[item.id] = item;
    });
  }

  function renderItemIcon(item, size) {
    if (!item) return '';
    const s = size || 28;
    // Barva rámečku podle quality (affixů)
    const borderColor = getQualityColor(item);
    const border = `border:2px solid ${borderColor};`;
    // Affix tint — barevný overlay podle prvního affixu
    const affix = (item.affixes || [])[0];
    const tintStyle = affix ? `box-shadow:inset 0 0 0 100px ${affix.tint}33,` : '';
    if (item.iconImg) {
      if (size === 0) {
        return `<img src="${item.iconImg}" alt="" style="display:block;width:100%;height:100%;object-fit:contain;background:#000;${tintStyle}${border}">`;
      }
      return `<img src="${item.iconImg}" alt="" style="width:${s}px;height:${s}px;border-radius:4px;vertical-align:middle;display:inline-block;${tintStyle}${border}">`;
    }
    const fs = size === 0 ? 28 : s;
    return `<span style="font-size:${fs}px;display:inline-flex;align-items:center;vertical-align:middle;${border};border-radius:4px;padding:2px">${item.icon}</span>`;
  }

  // ===== MONSTER TYPES =====
  const MONSTER_TYPES = {
    LIFESTEALER: 'lifestealer',
    MANASTEALER: 'manastealer',
    IMPROVER: 'improver',
    CRITMASTER: 'critmaster',
    POISON: 'poison'
  };
  const ATTACK_TYPES = { MELEE: 'melee', CASTER: 'caster' };

  // ===== ENEMY SPELLS =====
  const ENEMY_SPELLS = {
    poison_bolt: { name:'Jedovatý výboj', icon:'☠️', castTime:1500, manaCost:10, type:MONSTER_TYPES.POISON, minManaPct:0.2,
      desc:'DoT na hráče (3 ticky)' },
    drain_life: { name:'Vysátí života', icon:'🩸', castTime:1200, manaCost:8, type:MONSTER_TYPES.LIFESTEALER, minManaPct:0.15,
      desc:'Poškození + léčení nepřítele' },
    mana_drain: { name:'Vysátí many', icon:'💧', castTime:1000, manaCost:5, type:MONSTER_TYPES.MANASTEALER, minManaPct:0.1,
      desc:'Poškození + vysátí many' },
    empower: { name:'Posílení', icon:'📈', castTime:1500, manaCost:12, type:MONSTER_TYPES.IMPROVER, minManaPct:0.25,
      desc:'+50% damage na 3 útoky' },
    shadow_bolt: { name:'Stínový výboj', icon:'🎯', castTime:1300, manaCost:8, type:MONSTER_TYPES.CRITMASTER, minManaPct:0.15,
      desc:'Vysoká šance na krit' },
    heal: { name:'Léčení', icon:'💚', castTime:2000, manaCost:15, type:MONSTER_TYPES.LIFESTEALER, minManaPct:0.3,
      desc:'Léčí nepřítele o 30% HP' },
  };

  // ===== MONSTER DB =====
  // Každé monstrum má fixní face, name, type a attackType — nikdy se nemění
  const MONSTER_DB = [
    // Theme 0 — Les
    [
      {face:'assets/monsters/troll_test_small.png',name:'Troll',type:MONSTER_TYPES.MANASTEALER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/ent.png',name:'Ent',type:MONSTER_TYPES.IMPROVER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/satyr.png',name:'Satyr',type:MONSTER_TYPES.IMPROVER,attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/medved.png',name:'Medvěd',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/vlk.png',name:'Vlk',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/dryada.png',name:'Dryáda',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/lesni_rarach.png',name:'Lesní rarach',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/moc_alova_prisera.png',name:'Močálová příšera',type:MONSTER_TYPES.POISON,attackType:ATTACK_TYPES.CASTER},
    ],
    // Theme 1 — Poušť
    [
      {face:'assets/monsters/desert_scorpion.png',name:'Štír',type:MONSTER_TYPES.POISON,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/desert_worm.png',name:'Pouštní červ',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/desert_centaur.png',name:'Kentaur',type:MONSTER_TYPES.IMPROVER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/desert_nomad.png',name:'Nomád',type:MONSTER_TYPES.MANASTEALER,attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/desert_djinn.png',name:'Djinn',type:MONSTER_TYPES.MANASTEALER,attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/desert_mummy.png',name:'Mumie',type:MONSTER_TYPES.POISON,attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/desert_beetle.png',name:'Brouk',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/desert_cobra.png',name:'Kobra',type:MONSTER_TYPES.POISON,attackType:ATTACK_TYPES.CASTER},
    ],
    // Theme 2 — Nemrtvá země
    [
      {face:'assets/monsters/skeleton.png',name:'Kostlivec',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/zombie.png',name:'Zombie',type:MONSTER_TYPES.IMPROVER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/lich.png',name:'Lich',type:MONSTER_TYPES.MANASTEALER,attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/bone_dragon.png',name:'Kostěný drak',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/death_knight.png',name:'Nemrtvý rytíř',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/raven.png',name:'Havran',type:MONSTER_TYPES.POISON,attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/ghost.png',name:'Přízrak',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/lucifer.png',name:'Upír',type:MONSTER_TYPES.MANASTEALER,attackType:ATTACK_TYPES.CASTER},
    ],
    // Theme 3 — Výspy
    [
      {face:'assets/monsters/kerberos.png',name:'Kerberos',type:MONSTER_TYPES.MANASTEALER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/hellhound.png',name:'Pekelný pes',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/imp.png',name:'Ďáblík',type:MONSTER_TYPES.IMPROVER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/fire_ghost.png',name:'Ohnivý přízrak',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/succubus.png',name:'Succuba',type:MONSTER_TYPES.MANASTEALER,attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/lava_dragon.png',name:'Lávový drak',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/hell_smith.png',name:'Pekelný kovář',type:MONSTER_TYPES.IMPROVER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/hell_knight.png',name:'Pekelný rytíř',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.MELEE},
    ],
    // Theme 4 — Štíty
    [
      {face:'assets/monsters/ice_troll.png',name:'Ledový troll',type:MONSTER_TYPES.MANASTEALER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/frost_giant.png',name:'Ledový obr',type:MONSTER_TYPES.IMPROVER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/polar_bear.png',name:'Lední medvěd',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/snow_wolf.png',name:'Sněžný vlk',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/ice_dragon.png',name:'Ledový drak',type:MONSTER_TYPES.CRITMASTER,attackType:ATTACK_TYPES.CASTER},
      {face:'assets/monsters/snow_golem.png',name:'Sněžný golem',type:MONSTER_TYPES.IMPROVER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/frozen_knight.png',name:'Zmrzlý rytíř',type:MONSTER_TYPES.LIFESTEALER,attackType:ATTACK_TYPES.MELEE},
      {face:'assets/monsters/ice_lizard.png',name:'Ledový ještěr',type:MONSTER_TYPES.POISON,attackType:ATTACK_TYPES.MELEE},
    ],
  ];

  // ===== DIFFICULTY =====
  const DIFFICULTIES = [
    { id:'normal', name:'Normal', monsterLvMin:1, monsterLvMax:10, itemTierMin:1, itemTierMax:3, mult:1.0 },
    { id:'nightmare', name:'Nightmare', monsterLvMin:10, monsterLvMax:20, itemTierMin:3, itemTierMax:5, mult:1.8 },
    { id:'hell', name:'Hell', monsterLvMin:20, monsterLvMax:30, itemTierMin:5, itemTierMax:7, mult:3.0 },
  ];

  // ===== ROOM TYPES =====
  const ROOM_TYPES = {
    ENEMY: 'enemy',        // Běžný nepřítel
    ELITE: 'elite',        // Elitní nepřítel
    FOUNTAIN: 'fountain',  // Léčivý pramen
    MERCHANT: 'merchant',  // Obchodník
    CHEST: 'chest',        // Truhlice
    MYSTERY: 'mystery',    // Náhodná (hráč neví co)
  };
  const ROOM_POOL = [
    { type: ROOM_TYPES.ENEMY, weight:50, icon:'💀', label:'Nepřítel' },
    { type: ROOM_TYPES.ELITE, weight:15, icon:'💀💀', label:'Elita' },
    { type: ROOM_TYPES.FOUNTAIN, weight:12, icon:'🩸', label:'Pramen' },
    { type: ROOM_TYPES.MERCHANT, weight:12, icon:'🛒', label:'Obchod' },
    { type: ROOM_TYPES.CHEST, weight:6, icon:'💰', label:'Truhlice' },
    { type: ROOM_TYPES.MYSTERY, weight:5, icon:'❓', label:'???' },
  ];

  // ===== ELITE AFFIXY =====
  const ELITE_AFFIXES = [
    { name:'Ohnivý', icon:'🔥', desc:'+50% fire dmg', stat:'fireDmg', mult:1.5 },
    { name:'Ledový', icon:'❄️', desc:'+50% ice dmg', stat:'iceDmg', mult:1.5 },
    { name:'Rychlý', icon:'💨', desc:'+30% attack speed', stat:'swingMs', mult:0.7 },
    { name:'Jedovatý', icon:'☠️', desc:'+poison dmg', stat:'poisonDmg', mult:1.5 },
    { name:'Krvavý', icon:'🩸', desc:'+lifesteal', stat:'lifesteal', mult:1.5 },
  ];

  // ===== BOSS AFFIXY =====
  const BOSS_AFFIXES = [
    { name:'Ohnivý', icon:'🔥', desc:'+100% fire dmg' },
    { name:'Ledový', icon:'❄️', desc:'+100% ice dmg' },
    { name:'Rychlý', icon:'💨', desc:'+50% attack speed' },
    { name:'Krvavý', icon:'🩸', desc:'lifesteal 10%' },
    { name:'Nezničitelný', icon:'🛡️', desc:'+50% HP' },
    { name:'Mana Burn', icon:'💜', desc:'spaluje manu' },
  ];
  function getMonsterFace(theme, floor) {
    const pool = MONSTER_DB[theme] || MONSTER_DB[0];
    return pool[rand(0, pool.length - 1)].face;
  }
  function getMonsterName(theme) {
    const pool = MONSTER_DB[theme] || MONSTER_DB[0];
    return pool[rand(0, pool.length - 1)].name;
  }
  function getFloorMonsterSet(theme, floor) {
    const pool = MONSTER_DB[theme] || MONSTER_DB[0];
    const result = [];
    const poolSize = pool.length;
    // Vážený náhodný výběr — nedávno viděná monstra mají menší šanci
    state._monsterLastSeen = state._monsterLastSeen || {};
    state._monsterLastSeen[theme] = state._monsterLastSeen[theme] || {};
    const seen = state._monsterLastSeen[theme];
    // Spočítat váhy: 0 = neviděno/nedávno → max váha, čím dřív viděno → nižší
    let weights = pool.map((m, i) => {
      const lastSeen = seen[i];
      if (lastSeen === undefined) return 10; // nikdy neviděno = nejvyšší šance
      const floorsAgo = floor - lastSeen;
      return Math.max(1, 10 - floorsAgo * 2); // každé patro = -2, min 1
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    let idx = 0;
    for (let i = 0; i < poolSize; i++) {
      r -= weights[i];
      if (r <= 0) { idx = i; break; }
    }
    // Uložit, kdy bylo toto monstrum viděno
    seen[idx] = floor;
    state._monsterLastSeen[theme] = seen;
    result.push({idx, face: pool[idx].face, name: pool[idx].name, type: pool[idx].type, attackType: pool[idx].attackType, theme: theme});
    return result;
  }
  const DIRECTIONS = ['⬆️','⬇️','⬅️','➡️'];
  const DUNGEON_THEME_FILTERS = [
    '', '', '', '', '', '', '', '', '', '', '', '',
  ];
  const DUNGEON_THEMES = [
    { bg:'#0d2d0d', border:'#2ecc71', borderGlow:'rgba(46,204,113,0.3)' },   // 0 Les — zelená
    { bg:'#2a1a08', border:'#e67e22', borderGlow:'rgba(230,126,34,0.3)' },   // 1 Poušť — oranžová
    { bg:'#1a0d1a', border:'#888', borderGlow:'rgba(136,136,136,0.3)' },   // 2 Nemrtvá země — šedá
    { bg:'#2d0d0d', border:'#e74c3c', borderGlow:'rgba(231,76,60,0.3)' },    // 3 Výspy — červená
    { bg:'#0d122d', border:'#a8d8ea', borderGlow:'rgba(168,216,234,0.3)' },  // 4 Štíty — ledová modrá
  ];
  const LOCATIONS = [
    { id:0, name:'Začarovaný les', icon:'🌲', theme:0, rooms:10, xpReward:10, bossXp:30, minLevel:1, maxLevel:3,
      boss:{name:'Troll',face:'assets/monsters/troll_test_small.png',hp:10,types:[MONSTER_TYPES.MANASTEALER],attackType:ATTACK_TYPES.MELEE},
      reward:{gold:5}, resists:{fire:1.0, ice:1.0, nature:1.0}, monsterDefense:10 },
    { id:1, name:'Pouštní říše', icon:'🏜️', theme:1, rooms:10, xpReward:16, bossXp:50, minLevel:4, maxLevel:6,
      boss:{name:'Faraon',face:'assets/monsters/desert_pharaoh.png',hp:14,types:[MONSTER_TYPES.MANASTEALER],attackType:ATTACK_TYPES.CASTER},
      reward:{gold:12}, resists:{fire:1.5, ice:0.5, nature:1.0}, monsterDefense:20 },
    { id:2, name:'Mrazivé štíty', icon:'❄️', theme:4, rooms:11, xpReward:24, bossXp:70, minLevel:7, maxLevel:9,
      boss:{name:'Ledový obr',face:'assets/monsters/frost_giant.png',hp:16,types:[MONSTER_TYPES.IMPROVER],attackType:ATTACK_TYPES.MELEE},
      reward:{gold:15}, resists:{fire:1.5, ice:0.5, nature:1.0}, monsterDefense:35 },
    { id:3, name:'Nemrtvá země', icon:'🦴', theme:2, rooms:11, xpReward:40, bossXp:130, minLevel:10, maxLevel:12,
      boss:{name:'Lich',face:'assets/monsters/lich.png',hp:22,types:[MONSTER_TYPES.MANASTEALER],attackType:ATTACK_TYPES.CASTER},
      reward:{gold:25}, resists:{fire:0.5, ice:1.0, nature:1.5}, monsterDefense:55 },
    { id:4, name:'Pekelné výspy', icon:'🔥', theme:3, rooms:12, xpReward:50, bossXp:180, minLevel:13, maxLevel:15,
      boss:{name:'Lávový drak',face:'assets/monsters/lava_dragon.png',hp:26,types:[MONSTER_TYPES.CRITMASTER],attackType:ATTACK_TYPES.CASTER},
      reward:{gold:30}, resists:{fire:0.5, ice:1.5, nature:0.75}, monsterDefense:80 },
  ];

  // Skoková obtížnost — násobitel HP a damage podle dungeonu
  const DIFFICULTY_MULT = [1.0, 1.5, 2.5, 4.0, 6.0];

  // ===== DUNGEON ROOM GENERATION (branching) =====
  function pickWeightedFromPool(pool) {
    const total = pool.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * total;
    for (const p of pool) {
      r -= p.weight;
      if (r <= 0) return p;
    }
    return pool[pool.length - 1];
  }

  function generateDungeonChoices(loc, difficulty) {
    // Vytvoří pole kroků, každý krok = 2-3 možnosti na výběr
    // Poslední krok vždy vede k bossovi
    const stepCount = loc.rooms || 3; // 3-4 kroky volby
    const steps = [];

    for (let step = 0; step < stepCount; step++) {
      // První krok: jen 2 možnosti, bez pramene a obchodu
      const isFirstStep = step === 0;
      const numChoices = isFirstStep ? 2 : (2 + (Math.random() < 0.4 ? 1 : 0));
      const choices = [];
      const usedTypes = new Set();
      // Obchod až od 3. kroku, pramen až od 2. kroku
      let pool = ROOM_POOL;
      if (step < 2) pool = pool.filter(r => r.type !== ROOM_TYPES.MERCHANT);
      if (isFirstStep) pool = pool.filter(r => r.type !== ROOM_TYPES.FOUNTAIN);

      for (let c = 0; c < numChoices; c++) {
        let picked;
        let attempts = 0;
        do {
          picked = pickWeightedFromPool(pool);
          attempts++;
        } while (usedTypes.has(picked.type) && attempts < 20);
        usedTypes.add(picked.type);

        const choice = {
          type: picked.type,
          icon: picked.icon,
          label: picked.label,
        };
        if (picked.type === ROOM_TYPES.ELITE) {
          choice.eliteAffix = ELITE_AFFIXES[rand(0, ELITE_AFFIXES.length - 1)];
        }
        choices.push(choice);
      }
      steps.push({ choices, completed: false, chosenIdx: -1 });
    }

    // Boss room
    const bossAffixes = [];
    const numBossAffixes = 1 + (Math.random() < 0.4 ? 1 : 0);
    for (let i = 0; i < numBossAffixes; i++) {
      const affix = BOSS_AFFIXES[rand(0, BOSS_AFFIXES.length - 1)];
      if (!bossAffixes.find(a => a.name === affix.name)) {
        bossAffixes.push(affix);
      }
    }
    steps.push({
      choices: [{
        type: ROOM_TYPES.ENEMY,
        icon: '👹',
        label: 'BOSS',
        isBoss: true,
        bossAffixes: bossAffixes,
      }],
      completed: false,
      chosenIdx: -1,
    });

    // Reward room po bossovi
    const rewardType = Math.random() < 0.5 ? ROOM_TYPES.CHEST : ROOM_TYPES.MERCHANT;
    steps.push({
      choices: [{
        type: rewardType,
        icon: rewardType === ROOM_TYPES.CHEST ? '💰' : '🛒',
        label: rewardType === ROOM_TYPES.CHEST ? 'Odměna' : 'Obchod',
        isReward: true,
      }],
      completed: false,
      chosenIdx: -1,
    });

    return steps;
  }

  // ===== LEVEL / HIT / DODGE / XP HELPERS =====
  function getMonsterLevel(mb) {
    const loc = mb.loc;
    if (!loc || loc.minLevel === undefined) return 1;
    // Level se lineárně zvyšuje od minLevel do maxLevel podle progresu v dungeonu
    const totalRooms = (state.dungeonSteps ? state.dungeonSteps.length : 6) - 2; // bez bosse a reward
    const roomPct = totalRooms > 0 ? (mb.progress || 0) / totalRooms : 0;
    const range = loc.maxLevel - loc.minLevel;
    return loc.minLevel + Math.round(range * roomPct);
  }

  function getLevelDiff(mb) {
    const monsterLv = getMonsterLevel(mb);
    return (state.hero.level || 1) - monsterLv;
  }

  function getPlayerAttackTable(mb) {
    // D2 formule: Chance to Hit = 200% × AR / (AR + DR) × Alvl / (Alvl + Dlvl)
    const monsterLv = getMonsterLevel(mb);
    const heroLv = state.hero.level || 1;

    // Attack Rating hráče — podle primárního atributu classy
    const h = state.hero;
    const eqAttrs = getEquipAttrs();
    let baseAR = 0;
    if (state.heroClass === 'barbarian') {
      baseAR = ((h.attrStr || 0) + eqAttrs.str) * 2 + ((h.attrDex || 0) + eqAttrs.dex) * 1;
    } else if (state.heroClass === 'assassin') {
      baseAR = ((h.attrDex || 0) + eqAttrs.dex) * 3 + ((h.attrStr || 0) + eqAttrs.str) * 1;
    } else {
      baseAR = ((h.attrInt || 0) + eqAttrs.int) * 1 + ((h.attrDex || 0) + eqAttrs.dex) * 2;
    }
    // +AR z equipu (attackRating affix)
    const eq = state.hero.equip;
    let totalAR = 0;
    Object.keys(eq).forEach(slot => {
      const item = ITEM_MAP[eq[slot]];
      if (item) totalAR += item.attackRating || 0;
    });
    const ar = Math.max(1, baseAR + totalAR);

    // Defense monstra
    const monsterDef = mb.loc?.monsterDefense || 0;
    const dr = Math.max(1, monsterDef);

    // D2 formule
    let chance = 200 * ar / (ar + dr) * heroLv / (heroLv + monsterLv);
    chance = clamp(chance, 5, 95);

    return { hitChance: chance };
  }

  function getPlayerDodgeChance(mb) {
    // Pasivní dodge šance hráče (proti bossovým útokům) — odvíjí se od Obratnosti (DEX)
    const diff = getLevelDiff(mb);
    // Base: 2% dodge proti stejně silnému
    let baseDodge = 2 - diff * 1.5;
    baseDodge = clamp(baseDodge, 0, 30);
    // DEX bonus: každých 10 DEX = +1% dodge
    const h = state.hero;
    const eqAttrs = getEquipAttrs();
    const totalDex = (h.attrDex || 0) + eqAttrs.dex;
    const dexDodge = Math.floor(totalDex / 10);
    return Math.min(baseDodge + dexDodge, 50);
  }

  function getXpModifier(mb) {
    const diff = getLevelDiff(mb);
    // diff > 0 = hráč je vyšší level
    // diff >= 5: 0 XP (moc slabé)
    if (diff >= 5) return 0;
    // diff 1-4: -20% za každý level
    if (diff > 0) return Math.max(0, 1 - diff * 0.2);
    // diff < 0 = hráč je nižší level (silnější monstra)
    // +10% za každý level, max +50%
    if (diff < 0) return Math.min(1.5, 1 + Math.abs(diff) * 0.1);
    return 1.0;
  }

  // ===== STATE =====
  let state = {};
  let mapBattleState = {};
  // Session-persistent spell cooldowns a debuffy (nemažou se při změně monstra)
  let _sessionSpellCooldowns = {};
  let _sessionDebuffs = {};
  let _sessionBuffs = {};
  let _enemyBuffs = {}; // buffy na nepříteli (empower apod.)
  let _playerDebuffs = {}; // debuffy na hráči (jed apod.)
  let trainingState = {};
  let minigameState = {};
  let _activeIntervals = [];

  function cleanupTimers() {
    document.body.classList.remove('battle-active');
    // Schovat timer ring
    const circle = document.querySelector('.timer-circle');
    if (circle) { circle.style.opacity = '0'; circle.style.animation = 'none'; }
    _activeIntervals.forEach(id => { try { clearInterval(id); } catch {} }); _activeIntervals = [];
    if (minigameState.timerInterval) { clearInterval(minigameState.timerInterval); minigameState.timerInterval = null; }
    if (minigameState.countdownInterval) { clearInterval(minigameState.countdownInterval); minigameState.countdownInterval = null; }
    ['simonTimeout'].forEach(k => { if (minigameState[k]) { clearTimeout(minigameState[k]); delete minigameState[k]; } });
    if (mapBattleState) {
      if (mapBattleState._combatLoop) { cancelAnimationFrame(mapBattleState._combatLoop); mapBattleState._combatLoop = null; }
      if (mapBattleState._playerSwingTimer) { clearTimeout(mapBattleState._playerSwingTimer); mapBattleState._playerSwingTimer = null; }
      if (mapBattleState._enemySwingTimer) { clearTimeout(mapBattleState._enemySwingTimer); mapBattleState._enemySwingTimer = null; }
      if (mapBattleState._attackTimer) { clearTimeout(mapBattleState._attackTimer); mapBattleState._attackTimer = null; }
      if (mapBattleState._sequenceTimer) { clearTimeout(mapBattleState._sequenceTimer); mapBattleState._sequenceTimer = null; }
      if (mapBattleState._ringTimer) { clearTimeout(mapBattleState._ringTimer); mapBattleState._ringTimer = null; }
      if (mapBattleState._attackWindowTimer) { clearTimeout(mapBattleState._attackWindowTimer); mapBattleState._attackWindowTimer = null; }
      if (mapBattleState._glowTimer) { clearTimeout(mapBattleState._glowTimer); mapBattleState._glowTimer = null; }
      if (mapBattleState._freezeTimer) { clearInterval(mapBattleState._freezeTimer); mapBattleState._freezeTimer = null; }
      if (mapBattleState._bonusRaf) { cancelAnimationFrame(mapBattleState._bonusRaf); mapBattleState._bonusRaf = null; }
      if (mapBattleState._staminaInterval) { clearInterval(mapBattleState._staminaInterval); mapBattleState._staminaInterval = null; }
    }
  }

  const SAVE_KEY = 'dungeonRecallV7';
  function defaultState() {
    const talentLevels = {};
    Object.keys(CLASS_SKILLS).forEach(classId => {
      const cls = CLASS_SKILLS[classId];
      Object.keys(cls.trees).forEach(treeId => {
        const tree = cls.trees[treeId];
        tree.tiers.forEach(tier => {
          tier.choices.forEach(t => {
            talentLevels[classId + '_' + t.k] = 0;
          });
        });
      });
    });
    const s = { talentLevels, activeSchool:null, talentPoints:0, hero:{name:'Dobrodruh',face:'hero',level:1,xp:0,gold:0,hp:100,maxHp:100,mana:50,maxMana:50,baseDmg:12,inventory:[],equip:{weapon:'fists',armor:null,helmet:null,shield:null,ring1:null,ring2:null,amulet:null,belt:null,beltPotionSlots:[]},attrStr:0,attrVit:0,attrDex:0,attrInt:0,attrPoints:0}, deaths:0, wins:0,
      locationProgress:[0,0,0,0,0], bossesDefeated:[false,false,false,false,false], floorProgress:[0,0,0,0,0], spellUsedThisFloor:{}, lootItems:{}, encounteredMonsters:[], heroClass:null,
      difficulty:0, // index do DIFFICULTIES (0=normal, 1=nightmare, 2=hell)
      dungeonSteps: null, // pole kroků pro aktuální dungeon run (každý krok = 2-3 možnosti)
      rage:0, maxRage:100, // Barbar resource
      rageMultiplier:1, // Bloodrage buff
      _bloodrageTimer:0,
      energy:100, maxEnergy:100, // Assassin resource
      comboPoints:0, // Assassin combo points (0-5)
      _dodgeBuffTimer:0, // Evasion buff (ticky)
      _speedBoostTimer:0, // Speed boost (ticky)
      _speedBoostPct:0, // Speed boost procento
      battleShoutTimer:0, // Battle shout zbývající čas (ticky)
      battleShoutDmgPct:0, // % bonus dmg z battle shout
      defensiveShoutTimer:0, // Defensive shout zbývající čas (ticky)
      defensiveShoutArmorPct:0, // % bonus armor z defensive shout
      thunderClapTimer:0, // Zbývající čas thunder clapu (ticky)
      thunderClapSlowPct:0, // % zpomalení nepřítele
      skillShoutTimer:0, // Skill shout zbývající čas (ticky)
      skillShoutBonus:0, // Dočasné +lv ke všem skillům
      _gcdTimer:0 // Global cooldown (ticky)
    };
    return s;
  }
  function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.talentLevels) { // Obnovit loot itemy do ITEM_MAP
    if (s.lootItems) Object.keys(s.lootItems).forEach(k => { ITEM_MAP[k] = s.lootItems[k]; });
    // Migrace: přidat nové sloty, pokud chybí
    if (s.hero && s.hero.equip) {
      if (!s.hero.equip.ring2) s.hero.equip.ring2 = null;
      if (!s.hero.equip.belt) s.hero.equip.belt = null;
      if (!s.hero.equip.beltPotionSlots) s.hero.equip.beltPotionSlots = [];
    }
    return s; } } catch {} return defaultState(); }
  function saveGame() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  function resetGame() { state = defaultState(); saveGame(); showScreen('map'); }

  // ===== CLASS SELECT =====
  function selectClass(classId) {
    const cls = CLASSES[classId];
    if (!cls) return;
    state.heroClass = classId;
    state.hero.hp = cls.baseHp;
    state.hero.maxHp = cls.baseHp;
    state.hero.mana = cls.baseMana;
    state.hero.maxMana = cls.baseMana;
    state.hero.baseDmg = cls.baseDmg;
    state.hero.attrStr = cls.attrBonus.str;
    state.hero.attrVit = cls.attrBonus.vit;
    state.hero.attrDex = cls.attrBonus.dex;
    state.hero.attrInt = cls.attrBonus.int;
    // První talent point až na lvl 2 — tady žádný
    state.talentPoints = 0;
    // Startovní zbraň podle classy
    const startWeapons = {
      barbarian: 'ironSword',  // Železný meč
      assassin: 'huntingKnife', // Lovecký nůž
      mage: 'dagger',           // Dřevěná hůlka
    };
    const startWpn = startWeapons[classId];
    if (startWpn && ITEM_MAP[startWpn]) {
      state.hero.equip.weapon = startWpn;
    }
    saveGame();
    document.querySelector('.nav-bar').classList.remove('hidden');
    updateTalentBadge();
    showScreen('map');
    renderMap();
  }

  // ===== SCREENS =====
  const SCREEN_IDS = { classSelect:'classSelectScreen', map:'mapScreen', mapBattle:'mapBattleScreen', talents:'talentsScreen', hero:'heroScreen', result:'resultScreen', shop:'shopScreen', inventory:'inventoryScreen', bestiary:'bestiaryScreen', spellbook:'spellbookScreen', items:'itemsScreen' };
  function showScreen(name) {
    // Guard: bez vybrané classy nejde nikam kromě classSelect
    if (name !== 'classSelect' && !state.heroClass) {
      Object.values(SCREEN_IDS).forEach(id => {
        const el = $(id);
        if (!el) return;
        el.classList.add('hidden');
        el.classList.remove('active');
      });
      const cs = $(SCREEN_IDS.classSelect);
      if (cs) { cs.classList.remove('hidden'); cs.classList.add('active'); }
      return;
    }
    cleanupTimers();
    
    // Když opouštíme map battle (bez výsledku), okamžitě ho ukončit
    if (mapBattleState && !mapBattleState.ended && name !== 'mapBattle' && name !== 'result') {
      mapBattleState.ended = true;
      // Odstranit event handlery — touch/click na aréně + keydown na window
      const arena = $('mbArena');
      if (arena && arena._mbHandlers) {
        arena._mbHandlers.forEach(h => {
          if (h[0] === 'keydown') window.removeEventListener(h[0], h[1]);
          else arena.removeEventListener(h[0], h[1]);
        });
        arena._mbHandlers = null;
      }
    }
    
    Object.values(SCREEN_IDS).forEach(id => {
      const el = $(id);
      if (!el) return;
      if (id === SCREEN_IDS[name]) { el.classList.remove('hidden'); el.classList.add('active'); } else { el.classList.add('hidden'); el.classList.remove('active'); }
    });
    // Aktivovat nav tlačítko
    document.querySelectorAll('.nav-bar a[data-screen]').forEach(a => {
      a.classList.toggle('active', a.dataset.screen === name);
    });
    // Resetovat _fromShop při opuštění inventáře
    if (name !== 'inventory') _fromShop = false;
    // Schovat/ukázat nav-bar podle screenu
    const navBar = document.querySelector('.nav-bar');
    if (navBar) {
      if (name === 'mapBattle' || name === 'result') {
        navBar.classList.add('hidden');
      } else {
        navBar.classList.remove('hidden');
      }
    }
    // Přepnout na overworld BGM mimo boj
    if (name !== 'mapBattle' && name !== 'battle' && name !== 'result') switchBGM('overworld');
    if (name === 'map') renderMap();
    else if (name === 'mapBattle') { window.scrollTo(0,0); document.documentElement.scrollTop = 0; }
    else if (name === 'talents') { renderTalents(); updateTalentBadge(); }
    else if (name === 'hero') { renderHero(); updateTalentBadge(); }
    else if (name === 'shop') renderShop();
    else if (name === 'inventory') renderInventory();
    else if (name === 'spellbook') renderSpellbook();
  }

  function showMessage(msg) {
    // Zrušeno — modální okna jsou zbytečná
  }

  // ===== LEVEL-UP OVERLAY =====
  function showLevelUpOverlay(prevLevel) {
    const h = state.hero;
    const overlay = document.createElement('div');
    overlay.className = 'levelup-overlay';
    overlay.innerHTML = `<div class="levelup-content">
      <div class="levelup-sparkle">⭐</div>
      <div class="levelup-title">LEVEL UP!</div>
      <div class="levelup-level">Lv.${prevLevel} → Lv.${h.level}</div>
      <div class="levelup-details"><span>💪 +5 atributových bodů</span><span>🎓 +1 talentový bod</span><span>❤️ Plné vyléčení</span></div>
    </div>`;
    document.body.appendChild(overlay);
    sfxLevelUp();
    // Po 2.5s fade-out a odstranit
    setTimeout(() => {
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 500);
    }, 2500);
  }

  // ===== TREASURE POPUP =====
  let _treasurePopupOpen = false;
  function showTreasurePopup(loot, xpGain, onContinue) {
    if (_treasurePopupOpen) return;
    _treasurePopupOpen = true;
    playSFX(treasureSfx);

    // Sestavit loot čtverečky
    let lootSquares = '';
    if (loot.type === 'gold') {
      lootSquares = `<div class="treasure-slot" style="border-color:#f1c40f">
        <div class="treasure-slot-icon">💰</div>
        <div class="treasure-slot-label">+${loot.gold}</div>
      </div>`;
    } else if (loot.type === 'item' || loot.type === 'boss') {
      const r = RARITY[loot.item.rarity] || RARITY.common;
      lootSquares = `<div class="treasure-slot" style="border-color:${r.border}">
        <div class="treasure-slot-icon">❓</div>
        <div class="treasure-slot-label" style="color:${r.color}">${r.name}</div>
      </div>`;
      if (loot.type === 'boss' && loot.gold) {
        lootSquares += `<div class="treasure-slot" style="border-color:#f1c40f">
          <div class="treasure-slot-icon">💰</div>
          <div class="treasure-slot-label">+${loot.gold}</div>
        </div>`;
      }
    }

    const el = document.createElement('div');
    el.className = 'treasure-overlay-open';
    el.innerHTML = `<div class="treasure-loot-row">${lootSquares}</div>
      <div class="treasure-tap-close">👆 Pokračovat</div>`;
    document.body.appendChild(el);
    document.body.classList.add('no-scroll');

    el.addEventListener('click', function closeHandler() {
      el.removeEventListener('click', closeHandler);
      _treasurePopupOpen = false;
      el.classList.add('fade-out');
      document.body.classList.remove('no-scroll');
      setTimeout(() => { el.remove(); if (onContinue) onContinue(); }, 350);
    });
  }

  // ===== MAP =====
  let _expandedDungeon = -1;
  function toggleDungeon(idx) {
    _expandedDungeon = _expandedDungeon === idx ? -1 : idx;
    if (_expandedDungeon >= 0) {
      const loc = LOCATIONS[idx];
      if (loc) {
        const diff = DIFFICULTIES[state.difficulty] || DIFFICULTIES[0];
        // Resetovat rotaci monster pro nový dungeon
        state._monsterLastSeen = state._monsterLastSeen || {};
        state._monsterLastSeen[loc.theme] = {};
        state.dungeonSteps = generateDungeonChoices(loc, diff);
      }
    }
    renderMap();
  }
  function renderMap() {
    const h = state.hero;
    const diff = DIFFICULTIES[state.difficulty] || DIFFICULTIES[0];

    $('mapScroll').innerHTML = LOCATIONS.map((loc, i) => {
      const prevDone = i === 0 || state.bossesDefeated[i-1];
      const unlocked = i === 0 || prevDone;
      const completed = state.bossesDefeated[i];
      const curProgress = state.locationProgress[i] || 0;
      const expanded = _expandedDungeon === i;
      const theme = DUNGEON_THEMES[loc.theme] || DUNGEON_THEMES[0];
      const steps = state.dungeonSteps;
      let badgeHtml;
      if (completed) {
        badgeHtml = `<div class="map-loc-badge" style="background:${theme.border};color:${theme.bg}"><div class="badge-floor">✔</div><div class="badge-count">Hotovo</div></div>`;
      } else if (!unlocked) {
        badgeHtml = `<div class="map-loc-badge" style="background:${theme.border};color:${theme.bg}"><div class="badge-floor">🔒</div><div class="badge-count">Zamčeno</div></div>`;
      } else {
        badgeHtml = `<div class="map-loc-badge" style="background:${theme.border};color:${theme.bg}"><div class="badge-floor">▶</div><div class="badge-count">Hrát</div></div>`;
      }
      // Step cards — každý krok zobrazuje počet možností
      let stepHtml = '';
      if (unlocked && expanded && steps && steps.length > 0) {
        steps.forEach((step, si) => {
          const stepDone = completed || (curProgress > si);
          const lockedStep = si > curProgress && !completed;
          const isActive = si === curProgress && !completed;
          const chosen = step.choices[step.chosenIdx];
          if (isActive) {
            // Aktivní krok — zobrazit možnosti výběru
            const choiceHtml = step.choices.map((ch, ci) => {
              const extra = ch.eliteAffix ? ` (${ch.eliteAffix.icon})` : '';
              return `<div class="dungeon-choice" onclick="game.chooseDungeonPath(${i}, ${si}, ${ci})" style="border-color:${theme.border};background:${theme.bg}88">
                <span class="dungeon-choice-icon">${ch.icon}</span>
                <span class="dungeon-choice-label">${ch.label}${extra}</span>
              </div>`;
            }).join('');
            stepHtml += `<div class="map-floor-card floor-active" style="border-color:${theme.border};background:linear-gradient(135deg,${theme.bg}bb,${theme.bg}66);flex-direction:column;align-items:stretch;padding:8px">
              <div style="font-size:12px;font-weight:bold;margin-bottom:4px;color:${theme.border}">🎲 Vyber si:</div>
              <div class="dungeon-choices">${choiceHtml}</div>
            </div>`;
          } else {
            // Hotový nebo zamčený krok
            let sIcon, sStyle, sText;
            if (stepDone) { sIcon = '✓'; sStyle = `color:${theme.border}`; sText = 'Hotovo'; }
            else if (lockedStep) { sIcon = '🔒\uFE0E'; sStyle = `color:${theme.border}`; sText = 'Zamčeno'; }
            else { sIcon = chosen ? chosen.icon : '?'; sStyle = ''; sText = chosen ? chosen.label : ''; }
            stepHtml += `<div class="map-floor-card ${stepDone?'floor-done':lockedStep?'floor-locked':'floor-active'}" style="border-color:${theme.border};background:linear-gradient(135deg,${theme.bg}bb,${theme.bg}66)">
              <span class="floor-card-icon"${sStyle ? ` style="${sStyle}"` : ''}>${sIcon}</span>
              <span class="floor-card-num">Krok ${si+1}</span>
              <span class="floor-card-text">${sText}</span>
            </div>`;
          }
        });
      }
      return `<div class="map-location-wrap">
        <div class="map-location ${completed?'completed':!unlocked?'locked':''} ${expanded?'expanded':''}" style="--theme-glow:${theme.borderGlow};background:linear-gradient(135deg,${theme.bg}cc,${theme.bg}99 80%);border-color:${theme.border};${completed?'opacity:0.7':''}" onclick="${!unlocked?'':`game.toggleDungeon(${i})`}">
          <div class="map-loc-bg" style="background-image:url(assets/dungeons/${['forest','desert','frost','undead','hell'][i]||'forest'}.png)"></div>
          ${!unlocked ? `<div class="map-loc-gate" style="background-image:url(assets/gates/gate_${['forest','desert','frost','undead','hell'][i]||'forest'}.png)"></div>` : ''}
          <div class="map-loc-info">
            <div class="map-loc-name">${loc.name}</div>
          </div>
          ${badgeHtml}
        </div>
        ${stepHtml}
      </div>`;
    }).join('');
  }

  // ===== MAP BATTLE =====
  function chooseDungeonPath(locId, stepIdx, choiceIdx) {
    const steps = state.dungeonSteps;
    if (!steps || !steps[stepIdx]) return;
    const step = steps[stepIdx];
    if (step.completed) return;
    const choice = step.choices[choiceIdx];
    if (!choice) return;

    // Uložit volbu
    step.chosenIdx = choiceIdx;
    step.completed = true;
    state.locationProgress[locId] = stepIdx; // zůstat na aktuálním kroku pro startLocation

    // MYSTERY — náhodně odhalit, co to vlastně je
    if (choice.type === ROOM_TYPES.MYSTERY) {
      // Vybrat náhodný typ místnosti (kromě MYSTERY)
      const mysteryPool = ROOM_POOL.filter(p => p.type !== ROOM_TYPES.MYSTERY);
      const revealed = mysteryPool[rand(0, mysteryPool.length - 1)];
      choice.type = revealed.type;
      choice.icon = revealed.icon;
      choice.label = '❓ ' + revealed.label;
      if (revealed.type === ROOM_TYPES.ELITE) {
        choice.eliteAffix = ELITE_AFFIXES[rand(0, ELITE_AFFIXES.length - 1)];
      }
    }

    // Spustit souboj/efekt
    cleanupTimers();
    startLocation(locId);
  }

  function enterLocation(locId) {
    const loc = LOCATIONS[locId];
    if (!loc) return;
    if (locId > 0 && !state.bossesDefeated[locId-1]) { showMessage('🔒 Nejdřív poraz předchozí lokaci!'); return; }

    // Reset dungeon steps při novém vstupu
    const diff = DIFFICULTIES[state.difficulty] || DIFFICULTIES[0];
    state.dungeonSteps = generateDungeonChoices(loc, diff);
    state.locationProgress[locId] = 0;
    // Resetovat rotaci monster pro nový dungeon run
    state._monsterLastSeen = state._monsterLastSeen || {};
    state._monsterLastSeen[loc.theme] = {};
    _expandedDungeon = locId;
    renderMap();
  }

  function startLocation(locId) {
    // Kompletní reset session stavu při vstupu do souboje
    _sessionDebuffs = {};
    _sessionBuffs = {};
    _enemyBuffs = {};
    _playerDebuffs = {};
    _sessionSpellCooldowns = {};
    state.comboPoints = 0;
    state.energy = state.maxEnergy || 100;
    state.rage = 0;
    state._dodgeBuffTimer = 0;
    state._speedBoostTimer = 0;
    state._speedBoostPct = 0;
    state._gcdTimer = 0;
    state.rageMultiplier = 1;
    state._bloodrageTimer = 0;
    state.battleShoutTimer = 0;
    state.battleShoutDmgPct = 0;
    state.defensiveShoutTimer = 0;
    state.defensiveShoutArmorPct = 0;
    state.skillShoutTimer = 0;
    state.skillShoutBonus = 0;
    state.thunderClapTimer = 0;
    state.thunderClapSlowPct = 0;
    const loc = LOCATIONS[locId];
    if (!loc) return;
    const diff = DIFFICULTIES[state.difficulty] || DIFFICULTIES[0];
    const progress = state.locationProgress[locId] || 0; // aktuální krok (0 = první)
    const steps = state.dungeonSteps;

    // Generovat dungeon steps při prvním vstupu
    if (!steps || steps.length === 0) {
      state.dungeonSteps = generateDungeonChoices(loc, diff);
    }
    const currentSteps = state.dungeonSteps;
    const currentStep = currentSteps[progress];
    if (!currentStep) return;
    const chosen = currentStep.choices[currentStep.chosenIdx];
    if (!chosen) return;

    const isBoss = chosen.isBoss || false;
    const isReward = chosen.isReward || false;
    const isFountain = !isBoss && !isReward && chosen.type === ROOM_TYPES.FOUNTAIN;
    const isChest = !isBoss && !isReward && chosen.type === ROOM_TYPES.CHEST;
    const isMerchantChoice = !isBoss && !isReward && chosen.type === ROOM_TYPES.MERCHANT;

    // Reset HP při vstupu do dungeonu (progress === 0)
    if (progress === 0) {
      state.hero.maxHp = getHeroMaxHp();
      state.hero.hp = state.hero.maxHp;
      state._floorLootDrops = [];
    }

    // Fountain — heal, žádný boj
    if (isFountain) {
      const currentMaxHp = getHeroMaxHp();
      state.hero.maxHp = currentMaxHp;
      // Omezit hp na aktuální max (když hráč ztratil +HP z vybavení)
      state.hero.hp = Math.min(state.hero.hp, currentMaxHp);
      const healAmt = Math.round(currentMaxHp * 0.4);
      state.hero.hp = Math.min(currentMaxHp, state.hero.hp + healAmt);
      state.hero.mana = getHeroMaxMana();
      state.locationProgress[locId] = progress + 1;
      saveGame();
      $('resultIcon').textContent = '🩸';
      $('resultTitle').textContent = 'Léčivý pramen';
      $('resultMsg').innerHTML = `<div class="result-stats"><div class="result-stat"><span class="result-stat-icon">❤️</span><span class="result-stat-val">+${healAmt} HP</span></div><div class="result-stat"><span class="result-stat-icon">💧</span><span class="result-stat-val">Mana plná</span></div></div>`;
      $('resultLootList').innerHTML = '';
      $('resultBtn').innerHTML = '';
      $('resultScreen').onclick = function() { $('resultScreen').onclick = null; showScreen('map'); renderMap(); };
      showScreen('result');
      return;
    }

    // Chest — gold + šance na item
    if (isChest) {
      const chestGold = 5 + locId * 3 + rand(0, 8);
      state.hero.gold = (state.hero.gold || 0) + chestGold;
      state.locationProgress[locId] = progress + 1;
      let lootHtml = `<div class="result-stat"><span class="result-stat-icon">💰</span><span class="result-stat-val">+${chestGold} gold</span></div>`;
      if (Math.random() < 0.4) {
        const freeItem = generateLootItem(locId, progress, false);
        if (freeItem) {
          state.hero.inventory.push(freeItem.id);
          ITEM_MAP[freeItem.id] = freeItem;
          const rr = RARITY[freeItem.rarity] || RARITY.common;
          lootHtml += `<div class="loot-scroll-item"><span class="loot-scroll-icon">${renderItemIcon(freeItem,32)}</span><span class="loot-scroll-name" style="color:${rr.color}">${freeItem.name}</span></div>`;
        }
      }
      saveGame();
      $('resultIcon').textContent = '💰';
      $('resultTitle').textContent = 'Truhlice!';
      $('resultMsg').innerHTML = `<div class="result-stats">${lootHtml}</div>`;
      $('resultLootList').innerHTML = '';
      $('resultBtn').innerHTML = '';
      $('resultScreen').onclick = function() { $('resultScreen').onclick = null; showScreen('map'); renderMap(); };
      showScreen('result');
      return;
    }

    // Merchant — rovnou otevřít shop
    if (isMerchantChoice) {
      state.locationProgress[locId] = progress + 1;
      saveGame();
      showScreen('shop');
      return;
    }
    const playerMaxHp = getHeroMaxHp();
    state.hero.maxHp = playerMaxHp;
    const playerHp = Math.min(state.hero.hp || playerMaxHp, playerMaxHp);
    // HP škáluje s dungeonem a progresem — StS styl
    const diffMultOverall = diff.mult;
    const monsterBaseHp = [300, 600, 1000, 1500, 2100];
    const monsterHpPerStep = [20, 30, 40, 50, 60];
    const monsterHp = Math.round((monsterBaseHp[locId] + monsterHpPerStep[locId] * progress) * diffMultOverall);

    // Elitní HP bonus
    const isElite = chosen.type === ROOM_TYPES.ELITE;
    const eliteHpMult = isElite ? 1.75 : 1.0;
    const bossHpMultBase = 4.0;
    const baseHp = isBoss ? Math.round(monsterHp * bossHpMultBase) : Math.round(monsterHp * eliteHpMult);

    // Sada monster pro tuto místnost — vždy nové monstrum
    state._floorMonsters = isBoss ? [] : getFloorMonsterSet(loc.theme, progress);
    const floorMonsters = state._floorMonsters;
    // Zaznamenat setkání s monstry do bestiáře
    if (!isBoss && !isReward) {
      state.encounteredMonsters = state.encounteredMonsters || [];
      floorMonsters.forEach(m => {
        const key = m.face;
        if (!state.encounteredMonsters.includes(key)) {
          state.encounteredMonsters.push(key);
        }
      });
    } else if (isBoss) {
      state.encounteredMonsters = state.encounteredMonsters || [];
      if (loc.boss && loc.boss.face && !state.encounteredMonsters.includes(loc.boss.face)) {
        state.encounteredMonsters.push(loc.boss.face);
      }
    }

    // Boss affix bonusy
    let bossHpMult = 1.0;
    let bossDmgMult = 1.0;
    if (isBoss && chosen.bossAffixes) {
      chosen.bossAffixes.forEach(a => {
        if (a.name === 'Nezničitelný') bossHpMult += 0.5;
        if (a.name === 'Ohnivý' || a.name === 'Ledový') bossDmgMult += 1.0;
        if (a.name === 'Rychlý') bossDmgMult += 0.5;
      });
    }

    mapBattleState = {
      locId, loc, isBoss, isReward, isElite, progress,
      currentChoice: chosen,
      bossHp: Math.round(baseHp * bossHpMult), maxBossHp: Math.round(baseHp * bossHpMult),
      bossDmgMult: bossDmgMult,
      playerHp: playerHp, maxPlayerHp: playerMaxHp,
      ended: false, turn: 0,
      mistakes: 0, floorMistakes: 0, stunned: 0, frozen: 0, dot: 0, dotTicksLeft: 0, hot: 0, hotTicksLeft: 0, chillPercent: 0, chillTicksLeft: 0, _activeSpellChillActive: false, _poisonBlockHeal: false, shieldActive: null,
      playerDot: 0, playerDotTicksLeft: 0,
      _ringTimer: null, _sequenceTimer: null, _attackWindowTimer: null,
      _freezeTimer: null, _bonusRaf: null,
      spellCooldowns: {},
      _spellCooldownTicks: 0,
      _blizzardFreeAttacks: 0,
      _improverStacks: 0,
      floorMonsters,
      monsterFace: isBoss ? loc.boss.face : (isReward ? '' : floorMonsters[0].face),
      currentMonsterName: isBoss ? loc.boss.name : (isReward ? '' : floorMonsters[0].name),
      monsterType: isBoss ? null : (isReward ? null : (floorMonsters[0].type || null)),
      monsterAttackType: isBoss ? (loc.boss.attackType || ATTACK_TYPES.MELEE) : (isReward ? ATTACK_TYPES.MELEE : (floorMonsters[0].attackType || ATTACK_TYPES.MELEE)),
      bossTypes: isBoss ? (loc.boss.types || []) : [],
      monsterIcons: isBoss ? [] : floorMonsters.map(function(m){return m.face;}),
      monsterNames: isBoss ? [] : floorMonsters.map(function(m){return m.name;}),
      monsterTheme: isBoss ? loc.theme : (floorMonsters[0].theme !== undefined ? floorMonsters[0].theme : loc.theme),
      _lootDrops: state._floorLootDrops || [],
      // Auto-combat swing timery
      playerSwingMs: 0,
      offhandSwingMs: 0,
      enemySwingMs: 0,
      _playerSwingTimer: null,
      _enemySwingTimer: null,
      _combatLoop: null,
      _playerSwingStart: 0,
      _offhandSwingStart: 0,
      _enemySwingStart: 0,
      _playerSwingPct: 0,
      _offhandSwingPct: 0,
      _enemySwingPct: 0,
      _playerSwingReady: false,
      _offhandSwingReady: false,
      _enemySwingReady: false,
      _playerAttackProcessed: false,
      _offhandAttackProcessed: false,
      _enemyAttackProcessed: false,
      _spellButtonsVisible: true,
      _enemyStunned: false,
      _enemyStunTimer: 0,
      _enemyStunMax: 0,
      _heroicStrikeQueued: false,
      debuffs: {},
      // Caster fields
      enemyMana: 0, maxEnemyMana: 0,
      _enemyCasting: false, _enemyCastStart: 0, _enemyCastTime: 0, _enemyCastSpell: null, _enemyCastManaCost: 0,
      _enemyCastProcessed: false,
    };

    showScreen('mapBattle');
    // Inicializace many pro caster monstra
    if (mapBattleState.monsterAttackType === ATTACK_TYPES.CASTER) {
      const baseMana = 30 + mapBattleState.locId * 10 + mapBattleState.progress * 3;
      mapBattleState.maxEnemyMana = baseMana;
      mapBattleState.enemyMana = baseMana;
    }
    // Spustit stamina regen (3/s)
    if (mapBattleState._staminaInterval) clearInterval(mapBattleState._staminaInterval);
    mapBattleState._staminaInterval = setInterval(() => {
      const mb = mapBattleState;
      if (mb.ended) { clearInterval(mb._staminaInterval); mb._staminaInterval = null; return; }
      if (mb.stamina < mb.maxStamina) {
        mb.stamina = Math.min(mb.maxStamina, mb.stamina + 0.15); // 1.5/s = 0.15 per 100ms
        updateMapBattleUI();
      }
      // Mana regen pro caster monstra — zanedbatelná (0.5/s = 0.05 per 100ms tick)
      if (mb.monsterAttackType === ATTACK_TYPES.CASTER && mb.enemyMana < mb.maxEnemyMana) {
        mb.enemyMana = Math.min(mb.maxEnemyMana, mb.enemyMana + 0.05);
        updateMapBattleUI();
      }
      // (přesunuto z tickBuffs pro plynulý UI update)
    }, 100);
    // Skrýt starou šipku z předchozího boje ihned
    const arrowReset = $('mbArrow');
    if (arrowReset) arrowReset.setAttribute('class', 'boss-attack-arrow hidden');
    const actionInfoReset = $('mbActionInfo');
    if (actionInfoReset) { actionInfoReset.classList.add('hidden'); actionInfoReset.textContent = ''; }
    if (progress === 0 && !isBoss) _forceNewBattleBgm = true;
    switchBGM(isBoss ? 'boss' : 'battle');
    document.body.classList.add('battle-active');
    updateMapBattleUI();
    setupMapBattleInput();
    applySchoolColors();
    // Animace příchodu
    const newFig = $('mbFigure');
    if (newFig && !mapBattleState.isBoss && mapBattleState.progress > 0) {
      newFig.classList.remove('enemy-enter', 'enemy-idle', 'boss-idle', 'monster-dying');
      void newFig.offsetWidth;
      newFig.classList.add('monster-appear');
    }
    setTimeout(() => startAutoCombat(), 500);
  }

  function getSwingTime(weaponId) {
    // Rychlost zbraně v ms — čím rychlejší zbraň, tím kratší swing
    const w = ITEM_MAP[weaponId] || ITEM_MAP['fists'];
    const base = w.swingMs || 2000; // default 2s
    // DEX zkracuje swing
    const h = state.hero;
    const eqAttrs = getEquipAttrs();
    const dex = (h.attrDex || 0) + eqAttrs.dex;
    let ms = Math.max(600, Math.round(base * (1 - dex * 0.01)));
    // Speed boost (assassin) — +20% rychlost = -20% času
    if (state._speedBoostPct > 0) {
      ms = Math.max(400, Math.round(ms * (1 - state._speedBoostPct / 100)));
    }
    return ms;
  }

  function getEnemySwingTime(mb) {
    // Nepřítelův swing — závisí na dungeonu a progresu
    const diffMult = DIFFICULTY_MULT[mb.locId] || 1.0;
    const progress = mb.progress || 0;
    // Base 2500ms, s každou místností -5%, dungeon násobitel
    const base = 2500;
    const progressMult = Math.pow(0.95, progress);
    return Math.max(800, Math.round(base * progressMult / diffMult));
  }

  function pickEnemySpell(mb) {
    // Vybere kouzlo podle typu monstra — náhodný výběr z kompatibilních
    const mType = mb.monsterType;
    if (!mType) return null;
    let candidates = Object.keys(ENEMY_SPELLS).filter(id => ENEMY_SPELLS[id].type === mType);
    // Nevybírat empower, pokud už monstrum má aktivní buff
    if (mb._improverStacks > 0) {
      candidates = candidates.filter(id => id !== 'empower');
    }
    // Nevybírat poison_bolt, pokud už hráč má aktivní jed (podle vizuálního debuffu)
    if (_playerDebuffs['poison_bolt']) {
      candidates = candidates.filter(id => id !== 'poison_bolt');
    }
    // Nevybírat heal, pokud má nepřítel plné HP (>= 90%)
    if (mb.bossHp / mb.maxBossHp >= 0.9) {
      candidates = candidates.filter(id => id !== 'heal');
    }
    // Vyřadit kouzla, na která nemá nepřítel manu
    candidates = candidates.filter(id => mb.enemyMana >= ENEMY_SPELLS[id].manaCost);
    if (candidates.length === 0) return null;
    const id = candidates[Math.floor(Math.random() * candidates.length)];
    return { id, ...ENEMY_SPELLS[id] };
  }

  function startAutoCombat() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;

    // Inicializovat swing timery
    mb.playerSwingMs = getSwingTime(state.hero.equip.weapon);
    const cls = CLASSES[state.heroClass];
    const isDualWield = cls && cls.dualWield;
    mb.offhandSwingMs = (isDualWield && state.hero.equip.shield && ITEM_MAP[state.hero.equip.shield]?.weaponType) ? getSwingTime(state.hero.equip.shield) : 0;
    mb.enemySwingMs = getEnemySwingTime(mb);
    mb._playerSwingStart = performance.now();
    mb._offhandSwingStart = performance.now();
    mb._enemySwingStart = performance.now();
    mb._playerSwingReady = false;
    mb._offhandSwingReady = false;
    mb._enemySwingReady = false;
    mb._playerAttackProcessed = false;
    mb._offhandAttackProcessed = false;
    mb._enemyAttackProcessed = false;

    // Spustit rAF loop
    updateEnemyHpBar(mb);
    // Caster monstra začnou prvním tahem kouzlem (ne melee)
    if (mb.monsterAttackType === ATTACK_TYPES.CASTER && !mb.isBoss) {
      const spell = pickEnemySpell(mb);
      if (spell && mb.enemyMana >= spell.manaCost) {
        mb._enemyCasting = true;
        mb._enemyCastStart = performance.now();
        mb._enemyCastTime = spell.castTime;
        mb._enemyCastSpell = spell.id;
        mb._enemyCastManaCost = spell.manaCost; // Mana se strhne až po dokončení castu
        mb._enemySwingStart = performance.now();
      }
    }
    autoCombatLoop();
  }

  function autoCombatLoop() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    const now = performance.now();

    // Tick buffů a GCD každou smyčku
    tickBuffs();
    // Aktualizovat buff/debuff UI každou smyčku (nezávisle na swing timeru)
    renderBuffs();
    renderDebuffs();
    // Aktualizovat resource bary a combo indikátor každou smyčku
    updateResourceBars();

    // Hráčův swing
    if (!mb._playerSwingReady) {
      const playerElapsed = now - mb._playerSwingStart;
      mb._playerSwingPct = Math.min(playerElapsed / mb.playerSwingMs, 1);
      if (playerElapsed >= mb.playerSwingMs) {
        mb._playerSwingReady = true;
        mb._playerAttackProcessed = false;
      }
    }

    // Offhand swing (dual wield)
    if (mb.offhandSwingMs > 0 && !mb._offhandSwingReady) {
      const offhandElapsed = now - mb._offhandSwingStart;
      mb._offhandSwingPct = Math.min(offhandElapsed / mb.offhandSwingMs, 1);
      if (offhandElapsed >= mb.offhandSwingMs) {
        mb._offhandSwingReady = true;
        mb._offhandAttackProcessed = false;
      }
    }

    // Nepřítelův swing / cast — pokud není omráčený
    if (!mb._enemySwingReady && !mb._enemyStunned) {
      if (mb._enemyCasting) {
        // Probíhá castování — aktualizovat cast bar
        const castElapsed = now - mb._enemyCastStart;
        mb._enemySwingPct = Math.min(castElapsed / mb._enemyCastTime, 1);
        if (castElapsed >= mb._enemyCastTime) {
          // Cast dokončen — strhnout manu
          mb.enemyMana -= mb._enemyCastManaCost || 0;
          mb._enemyCasting = false;
          mb._enemySwingReady = true;
          mb._enemyAttackProcessed = false;
          mb._enemyCastProcessed = false;
        }
      } else {
        // Normální swing timer
        const enemyElapsed = now - mb._enemySwingStart;
        mb._enemySwingPct = Math.min(enemyElapsed / mb.enemySwingMs, 1);
        if (enemyElapsed >= mb.enemySwingMs) {
          // Rozhodovací moment — caster může začít castovat kouzlo
          if (mb.monsterAttackType === ATTACK_TYPES.CASTER && !mb.isBoss) {
            const spell = pickEnemySpell(mb);
            if (spell && mb.enemyMana >= spell.manaCost) {
              // Začít castovat
              mb._enemyCasting = true;
              mb._enemyCastStart = now;
              mb._enemyCastTime = spell.castTime;
              mb._enemyCastSpell = spell.id;
              mb._enemyCastManaCost = spell.manaCost; // Mana se strhne až po dokončení castu
              // Reset normálního swing timeru — čekáme na cast
              mb._enemySwingStart = now;
              updateMapBattleUI();
            } else {
              // Málo many — slabý melee útok
              mb._enemySwingReady = true;
              mb._enemyAttackProcessed = false;
            }
          } else {
            // Melee monstrum — normální swing
            mb._enemySwingReady = true;
            mb._enemyAttackProcessed = false;
          }
        }
      }
    }

    // Zpracovat útoky — hráč první, aby mohl zabít bosse dřív, než nepřítel stihne zabít jeho
    if (mb._playerSwingReady && !mb._playerAttackProcessed) {
      mb._playerAttackProcessed = true;
      onAutoPlayerAttack();
    }
    if (mb._offhandSwingReady && !mb._offhandAttackProcessed) {
      mb._offhandAttackProcessed = true;
      onAutoOffhandAttack();
    }
    if (mb._enemySwingReady && !mb._enemyAttackProcessed) {
      mb._enemyAttackProcessed = true;
      onAutoEnemyAttack();
    }

    // Update timer ring vizuál (až po zpracování útoků, aby nedošlo k zelenému probliku)
    updateSwingRings(mb);

    mb._combatLoop = requestAnimationFrame(autoCombatLoop);
  }

  let _lastBuffTick = 0;
  function tickBuffs() {
    const mb = mapBattleState;
    if (!mb) return;
    // Time-based ochrana: tickovat max ~60×/s (1 tick per 16ms)
    // Zabrání rychlejšímu tickování po restartu rAF loop (catch-up frames)
    const now = performance.now();
    if (now - _lastBuffTick < 15) return;
    _lastBuffTick = now;
    // GCD tick
    if (state._gcdTimer > 0) state._gcdTimer = Math.max(0, state._gcdTimer - 1);
    // Per-spell cooldown tick (session persistent)
    Object.keys(_sessionSpellCooldowns).forEach(spellId => {
      if (_sessionSpellCooldowns[spellId] > 0) {
        _sessionSpellCooldowns[spellId]--;
        if (_sessionSpellCooldowns[spellId] <= 0) delete _sessionSpellCooldowns[spellId];
      }
    });
    // Debuff tick (session persistent)
    Object.keys(_sessionDebuffs).forEach(spellId => {
      const d = _sessionDebuffs[spellId];
      if (d && d.ticks > 0) {
        d.ticks--;
        if (d.ticks <= 0) delete _sessionDebuffs[spellId];
      }
    });
    // Player DoT tick (jed z monster)
    doPlayerDotTick(mb);
    // Mana regen pro caster monstra (10/s plynule — v stamina intervalu)
    // (přesunuto do stamina intervalu 100ms pro plynulý UI update)
    // Buff tick (session persistent)
    Object.keys(_sessionBuffs).forEach(spellId => {
      const b = _sessionBuffs[spellId];
      if (b && b.ticks > 0) {
        b.ticks--;
        if (b.ticks <= 0) {
          delete _sessionBuffs[spellId];
          if (b.onExpire) b.onExpire();
        }
      }
    });
    // Enemy buffs tick
    Object.keys(_enemyBuffs).forEach(spellId => {
      const b = _enemyBuffs[spellId];
      if (b && b.ticks > 0) {
        b.ticks--;
        if (b.ticks <= 0) {
          delete _enemyBuffs[spellId];
          if (b.onExpire) b.onExpire();
        }
      }
    });
    // Player debuffs tick
    Object.keys(_playerDebuffs).forEach(spellId => {
      const d = _playerDebuffs[spellId];
      if (d && d.ticks > 0) {
        d.ticks--;
        if (d.ticks <= 0) delete _playerDebuffs[spellId];
      }
    });
    // Battle shout
    if (state.battleShoutTimer > 0) {
      state.battleShoutTimer--;
      if (state.battleShoutTimer <= 0) state.battleShoutDmgPct = 0;
    }
    // Defensive shout
    if (state.defensiveShoutTimer > 0) {
      state.defensiveShoutTimer--;
      if (state.defensiveShoutTimer <= 0) state.defensiveShoutArmorPct = 0;
    }
    // Skill shout
    if (state.skillShoutTimer > 0) {
      state.skillShoutTimer--;
      if (state.skillShoutTimer <= 0) state.skillShoutBonus = 0;
    }
    // Thunder clap slow
    if (state.thunderClapTimer > 0) {
      state.thunderClapTimer--;
      if (state.thunderClapTimer <= 0) state.thunderClapSlowPct = 0;
    }
    // Bloodrage — tick řeší _sessionBuffs
    if (state._bloodrageTimer > 0) {
      state._bloodrageTimer--;
      if (state._bloodrageTimer <= 0) state.rageMultiplier = 1;
    }
    // Energy regen (assassin) — 10/s = 10/60 za tick při 60fps
    if (state.heroClass === 'assassin') {
      const cls = CLASSES.assassin;
      const regen = (cls.resourceRegen || 0) / 60; // 10/s → ~0.167/tick
      if (regen > 0 && (state.energy || 0) < (state.maxEnergy || 100)) {
        state.energy = Math.min(state.maxEnergy || 100, (state.energy || 0) + regen);
      }
    }
    // Dodge buff (Evasion)
    if (state._dodgeBuffTimer > 0) {
      state._dodgeBuffTimer--;
      if (state._dodgeBuffTimer <= 0) state._dodgeBuffTimer = 0;
    }
    // Speed boost
    if (state._speedBoostTimer > 0) {
      state._speedBoostTimer--;
      if (state._speedBoostTimer <= 0) {
        state._speedBoostTimer = 0;
        state._speedBoostPct = 0;
      }
    }
    // Enemy stun
    if (mb._enemyStunned && mb._enemyStunTimer > 0) {
      mb._enemyStunTimer--;
      if (mb._enemyStunTimer <= 0) {
        mb._enemyStunned = false;
        mb._enemySwingStart = performance.now(); // restart timeru po omráčení
      }
    }
  }

  function updateSwingRings(mb) {
    // Hráčův ring (velký, žlutý)
    const playerCircle = document.getElementById('mbPlayerTimerCircle');
    if (playerCircle) {
      playerCircle.style.opacity = '1';
      if (mb._playerSwingReady) {
        playerCircle.style.strokeDashoffset = '0';
        playerCircle.style.stroke = '#2ecc71'; // zelená = připraven
      } else {
        const offset = Math.round(691 * (1 - mb._playerSwingPct));
        playerCircle.style.strokeDashoffset = offset;
        playerCircle.style.stroke = '#f1c40f';
      }
    }
    // Offhand ring (větší, světlejší — nad hlavním)
    const offhandCircle = document.getElementById('mbOffhandTimerCircle');
    if (offhandCircle) {
      if (mb.offhandSwingMs > 0) {
        offhandCircle.style.opacity = '0.5';
        if (mb._offhandSwingReady) {
          offhandCircle.style.strokeDashoffset = '0';
          offhandCircle.style.stroke = '#2ecc71';
        } else {
          const offset = Math.round(754 * (1 - mb._offhandSwingPct));
          offhandCircle.style.strokeDashoffset = offset;
          offhandCircle.style.stroke = '#f1c40f';
        }
      } else {
        offhandCircle.style.opacity = '0';
      }
    }
    // Nepřítelův ring (malý, červený / modrý při castu / šedý při stunu)
    const enemyCircle = document.getElementById('mbEnemyTimerCircle');
    if (enemyCircle) {
      enemyCircle.style.opacity = '1';
      if (mb._enemyStunned) {
        // Stun — šedý ring, od prázdného (offset=597) do plného (offset=0)
        const stunMax = mb._enemyStunMax > 0 ? mb._enemyStunMax : 300;
        const stunPct = Math.min(1, mb._enemyStunTimer / stunMax);
        const offset = Math.round(597 * stunPct);
        enemyCircle.style.strokeDasharray = '597';
        enemyCircle.style.strokeDashoffset = offset;
        enemyCircle.style.stroke = '#666';
      } else if (mb._enemyCasting) {
        // Castování — světle modrý ring
        const castPct = mb._enemyCastTime > 0 ? Math.min(1, (performance.now() - mb._enemyCastStart) / mb._enemyCastTime) : 0;
        const offset = Math.round(597 * (1 - castPct));
        enemyCircle.style.strokeDashoffset = offset;
        enemyCircle.style.stroke = '#3498db';
      } else if (mb._enemySwingReady) {
        enemyCircle.style.strokeDashoffset = '0';
        enemyCircle.style.stroke = '#e74c3c';
      } else {
        const offset = Math.round(597 * (1 - mb._enemySwingPct));
        enemyCircle.style.strokeDashoffset = offset;
        enemyCircle.style.stroke = '#e74c3c';
      }
    }
    // Nepřítelův HP bar — segmenty
    updateEnemyHpBar(mb);
  }

  function updateEnemyHpBar(mb) {
    const fill = document.getElementById('mbEnemyHpFill');
    if (!fill) return;
    const pct = mb.maxBossHp > 0 ? Math.max(0, Math.min(100, (mb.bossHp / mb.maxBossHp) * 100)) : 0;
    fill.style.width = pct + '%';
  }

  function onAutoPlayerAttack() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    if (mb.bossHp <= 0) { endMapBattle(true); return; }

    // Reset swingu PŘED útokem — i kdyby byl MISS/DODGE, swing se nezasekne
    mb._playerSwingStart = performance.now();
    mb._playerSwingReady = false;
    mb._playerSwingPct = 0;

    // Rage gain za útok (barbar)
    if (state.heroClass === 'barbarian') {
      const rageGain = Math.round(5 * state.rageMultiplier);
      state.rage = Math.min(state.maxRage, (state.rage || 0) + rageGain);
    }

    // Heroic Strike — 150% dmg
    let dmgMult = 1.0;
    if (mb._heroicStrikeQueued) {
      dmgMult = 1.5;
      mb._heroicStrikeQueued = false;
    }

    // Battle shout bonus
    if (state.battleShoutDmgPct > 0) {
      dmgMult *= (1 + state.battleShoutDmgPct / 100);
    }

    // Použít původní dealPlayerDamage
    dealPlayerDamage(mb, dmgMult);

    updateMapBattleUI();

    if (mb.bossHp <= 0) { endMapBattle(true); return; }
  }

  function onAutoOffhandAttack() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    if (mb.bossHp <= 0) { endMapBattle(true); return; }
    // Reset offhand swingu PŘED útokem
    mb._offhandSwingStart = performance.now();
    mb._offhandSwingReady = false;
    mb._offhandSwingPct = 0;
    // Offhand útok — 50% damage hlavní zbraně
    dealPlayerDamage(mb, 0.5);
    updateMapBattleUI();
    if (mb.bossHp <= 0) { endMapBattle(true); return; }
  }

  function onAutoEnemyAttack() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    if (mb.playerHp <= 0) { endMapBattle(false); return; }

    // Caster spell — zpracovat kouzlo místo melee útoku
    if (mb._enemyCastSpell) {
      const spellId = mb._enemyCastSpell;
      mb._enemyCastSpell = null;
      mb._enemyCastProcessed = true;
      mb._enemySwingStart = performance.now();
      mb._enemySwingReady = false;
      mb._enemySwingPct = 0;

      const spell = ENEMY_SPELLS[spellId];
      if (!spell) { updateMapBattleUI(); return; }

      // Evasion (assassin)
      if (state._dodgeBuffTimer > 0 && Math.random() < 0.5) {
        playSFX(dodgeSfx);
        const dmgText = $('mbPlayerDamageText');
        if (dmgText) {
          dmgText.textContent = '💨 Dodge!';
          dmgText.style.color = '#f1c40f';
          dmgText.classList.remove('hidden');
          setTimeout(() => dmgText.classList.add('hidden'), 500);
        }
        updateMapBattleUI();
        return;
      }

      let amount = 0;
      let spellIcon = spell.icon || '🔮';
      let spellText = spell.name;

      // Výpočet base damage pro kouzla
      const monsterBaseDmg = [20, 35, 50, 70, 90];
      const monsterDmgPerStep = [2.5, 4, 5, 6, 8];
      const diffMultOverall = DIFFICULTIES[state.difficulty] ? DIFFICULTIES[state.difficulty].mult : 1.0;
      let baseDmg = Math.round((monsterBaseDmg[mb.locId] + monsterDmgPerStep[mb.locId] * mb.progress) * diffMultOverall * 0.8);

      if (spellId === 'poison_bolt') {
        amount = Math.round(baseDmg * 0.3);
        mb.playerDot = amount;
        mb.playerDotTicksLeft = 3;
        _playerDebuffs['poison_bolt'] = { icon: '☠️', name: 'Jed', ticks: 300, maxTicks: 300 };
        spellText = '☠️ Jedovatý výboj!';
      } else if (spellId === 'drain_life') {
        amount = Math.round(baseDmg * 0.7);
        const healAmt = Math.round(amount * 0.6);
        mb.bossHp = Math.min(mb.maxBossHp, mb.bossHp + healAmt);
        // Heal text (zeleně u nepřítele)
        const healText = $('mbHealText');
        if (healText) {
          healText.textContent = `+${healAmt}`;
          healText.classList.remove('hidden');
          setTimeout(() => healText.classList.add('hidden'), 1200);
        }
        spellText = `🩸 Vysátí života! -${amount}`;
      } else if (spellId === 'mana_drain') {
        amount = Math.round(baseDmg * 0.4);
        const manaDrain = Math.round(amount * 0.8);
        state.hero.mana = Math.max(0, (state.hero.mana || 0) - manaDrain);
        spellText = `💧 Vysátí many! -${amount}`;
      } else if (spellId === 'empower') {
        amount = 0; // žádné přímé poškození
        mb._improverStacks = (mb._improverStacks || 0) + 3; // +50% na 3 útoky
        _enemyBuffs['empower'] = { icon: '📈', name: 'Posílení', ticks: 600, maxTicks: 600 };
        spellText = '📈 Posílení!';
      } else if (spellId === 'shadow_bolt') {
        amount = Math.round(baseDmg * 1.2);
        if (Math.random() < 0.5) {
          amount = Math.round(amount * 2.0);
          spellText = `🎯 Stínový výboj! KRIT! -${amount}`;
        } else {
          spellText = `🎯 Stínový výboj! -${amount}`;
        }
      } else if (spellId === 'heal') {
        amount = 0;
        const healAmt = Math.round(mb.maxBossHp * 0.3);
        mb.bossHp = Math.min(mb.maxBossHp, mb.bossHp + healAmt);
        const healText = $('mbHealText');
        if (healText) {
          healText.textContent = `💚 +${healAmt}`;
          healText.classList.remove('hidden');
          setTimeout(() => healText.classList.add('hidden'), 1200);
        }
        spellText = '';
      }

      // 🛡️ Defense
      if (amount > 0) {
        const armorDef = (ITEM_MAP[state.hero.equip.armor] || {defense:0}).defense || 0;
        const helmetDef = ITEM_MAP[state.hero.equip.helmet]?.defense || 0;
        const shieldDef = ITEM_MAP[state.hero.equip.shield]?.defense || 0;
        let totalDefense = armorDef + helmetDef + shieldDef;
        if (state.defensiveShoutArmorPct > 0) totalDefense = Math.round(totalDefense * (1 + state.defensiveShoutArmorPct / 100));
        if (totalDefense > 0) {
          amount = Math.round(amount * (1 - totalDefense / (totalDefense + 300)));
        }
        // Block
        const shieldItem = ITEM_MAP[state.hero.equip.shield];
        if (shieldItem && shieldItem.blockChance > 0 && Math.random() * 100 < shieldItem.blockChance) {
          amount = 0;
          spellText = spellIcon + ' 🛡️ BLOCK!';
          playSFX(blockSfx);
        }
        if (amount > 0) {
          mb.playerHp -= amount;
          if (state.heroClass === 'barbarian') {
            state.rage = Math.min(state.maxRage, (state.rage || 0) + Math.round(3 * state.rageMultiplier));
          }
        }
      }

      // Damage text
      const dmgText = $('mbPlayerDamageText');
      if (dmgText) {
        dmgText.textContent = spellText;
        dmgText.style.color = '#9b59b6';
        dmgText.classList.remove('hidden');
        setTimeout(() => dmgText.classList.add('hidden'), 1200);
      }
      // Červený záblesk
      const arena = $('mbArena');
      if (arena && amount > 0) {
        arena.style.transition = 'background-color 0.1s';
        arena.style.backgroundColor = 'rgba(155,89,182,0.35)';
        setTimeout(() => { arena.style.backgroundColor = ''; setTimeout(() => { arena.style.transition = ''; }, 200); }, 100);
      }
      playSFX(getHurtSfx());
      updateMapBattleUI();
      return;
    }

    // Evasion (assassin) — 50% šance na dodge
    if (state._dodgeBuffTimer > 0 && Math.random() < 0.5) {
      playSFX(dodgeSfx);
      mb._enemySwingStart = performance.now();
      mb._enemySwingReady = false;
      // Vizuální feedback
      const dmgText = $('mbPlayerDamageText');
      if (dmgText) {
        dmgText.textContent = '💨 Dodge!';
        dmgText.style.color = '#f1c40f';
        dmgText.classList.remove('hidden');
        setTimeout(() => dmgText.classList.add('hidden'), 500);
      }
      return;
    }

    // Výpočet damage — StS styl, konzistentní s HP scalingem
    const monsterBaseDmg = [20, 35, 50, 70, 90];
    const monsterDmgPerStep = [2.5, 4, 5, 6, 8];
    const diffMultOverall = DIFFICULTIES[state.difficulty] ? DIFFICULTIES[state.difficulty].mult : 1.0;
    let bossDmg = Math.round((monsterBaseDmg[mb.locId] + monsterDmgPerStep[mb.locId] * mb.progress) * diffMultOverall * (0.8 + Math.random() * 0.4));
    const mType = mb.monsterType;
    const bossTypes = mb.bossTypes || [];
    let isCrit = false;
    let lifeStealAmt = 0;
    let manaStealAmt = 0;
    const typesToApply = bossTypes.length > 0 ? bossTypes : (mType ? [mType] : []);
    typesToApply.forEach(t => {
      if (t === MONSTER_TYPES.CRITMASTER) {
        if (Math.random() < 0.33) {
          bossDmg = Math.round(bossDmg * 2.0);
          isCrit = true;
        }
      } else if (t === MONSTER_TYPES.IMPROVER) {
        mb._improverStacks = (mb._improverStacks || 0) + 1;
        bossDmg = Math.round(bossDmg * (1 + mb._improverStacks * 0.25));
      } else if (t === MONSTER_TYPES.LIFESTEALER) {
        lifeStealAmt += Math.round(bossDmg * 0.5);
      } else if (t === MONSTER_TYPES.MANASTEALER) {
        manaStealAmt += Math.round(bossDmg * 0.5);
      } else if (t === MONSTER_TYPES.POISON) {
        const poisonDmg = Math.max(1, Math.round(bossDmg * 0.2));
        mb.playerDot = poisonDmg;
        mb.playerDotTicksLeft = 3;
      }
    });
    // 🛡️ Defense — WoW styl
    const armorDef = (ITEM_MAP[state.hero.equip.armor] || {defense:0}).defense || 0;
    const helmetDef = ITEM_MAP[state.hero.equip.helmet]?.defense || 0;
    const shieldDef = ITEM_MAP[state.hero.equip.shield]?.defense || 0;
    let totalDefense = armorDef + helmetDef + shieldDef;
    if (state.defensiveShoutArmorPct > 0) totalDefense = Math.round(totalDefense * (1 + state.defensiveShoutArmorPct / 100));
    if (totalDefense > 0) {
      bossDmg = Math.round(bossDmg * (1 - totalDefense / (totalDefense + 300)));
    }
    let amount = bossDmg;

    // Pasivní blok ze štítu
    let blocked = false;
    const shieldItem = ITEM_MAP[state.hero.equip.shield];
    if (shieldItem && shieldItem.blockChance > 0) {
      if (Math.random() * 100 < shieldItem.blockChance) {
        blocked = true;
        amount = 0;
        playSFX(blockSfx);
      }
    }

    if (!blocked) {
      mb.playerHp -= amount;
      // Rage gain za utržené poškození (barbar)
      if (state.heroClass === 'barbarian') {
        const rageGain = Math.round(3 * state.rageMultiplier);
        state.rage = Math.min(state.maxRage, (state.rage || 0) + rageGain);
      }
    }
    // Life steal / mana steal
    if (!blocked && lifeStealAmt > 0) {
      mb.bossHp = Math.min(mb.maxBossHp, mb.bossHp + lifeStealAmt);
      // Heal text (zeleně u nepřítele)
      const healText = $('mbHealText');
      if (healText) {
        healText.textContent = `+${lifeStealAmt}`;
        healText.classList.remove('hidden');
        setTimeout(() => healText.classList.add('hidden'), 1200);
      }
    }
    if (!blocked && manaStealAmt > 0) {
      state.hero.mana = Math.max(0, (state.hero.mana || 0) - manaStealAmt);
    }
    if (!blocked) {
      // Zvuk
      playSFX(getHurtSfx());
      // Červený záblesk arény
      const arena = $('mbArena');
      if (arena) {
        arena.style.transition = 'background-color 0.1s';
        arena.style.backgroundColor = 'rgba(233,69,96,0.45)';
        setTimeout(() => { arena.style.backgroundColor = ''; setTimeout(() => { arena.style.transition = ''; }, 200); }, 100);
      }
      // Záblesk overlay
      let hitOverlay = $('mbHitOverlay');
      if (!hitOverlay) {
        hitOverlay = document.createElement('div');
        hitOverlay.id = 'mbHitOverlay';
        hitOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:999;pointer-events:none;transition:background-color 0.1s;background-color:transparent;';
        document.body.appendChild(hitOverlay);
      }
      hitOverlay.style.backgroundColor = 'rgba(200,40,40,0.2)';
      setTimeout(() => { hitOverlay.style.backgroundColor = 'transparent'; }, 100);
    }

    // Damage text
    const playerDamageText = $('mbPlayerDamageText');
    if (playerDamageText) {
      playerDamageText.textContent = blocked ? '🛡️ BLOCK!' : `-${amount}`;
      playerDamageText.style.color = blocked ? '#3498db' : '';
      playerDamageText.classList.remove('hidden');
      setTimeout(() => playerDamageText.classList.add('hidden'), 800);
    }

    updateMapBattleUI();

    // Reset nepřítelova swingu
    mb._enemySwingStart = performance.now();
    mb._enemySwingReady = false;
    mb._enemySwingPct = 0;

    if (mb.playerHp <= 0) { endMapBattle(false); return; }
  }

  function updateMapBattleUI() {
    const mb = mapBattleState;
    if (!mb.loc) return;
    if (mb.isBoss) {
      const b = mb.loc.boss;
      const bossTypesHtml = (b.types || []).map(t => {
        const ti = t === MONSTER_TYPES.LIFESTEALER ? '🩸' :
          t === MONSTER_TYPES.MANASTEALER ? '💧' :
          t === MONSTER_TYPES.IMPROVER ? '📈' :
          t === MONSTER_TYPES.CRITMASTER ? '🎯' :
          t === MONSTER_TYPES.POISON ? '☠️' : '🎯';
        return ti;
      }).join('');
      const atkIcon = (b.attackType || ATTACK_TYPES.MELEE) === ATTACK_TYPES.CASTER ? '🔮' : '⚔️';
      $('mbEnemyName').textContent = `${b.name} ${bossTypesHtml}${atkIcon}`;
      $('mbLocation').textContent = `👑 Boss — ${mb.loc.name}`;
    } else {
      const floorStr = `M${mb.progress+1}`;
      const typeIcon = mb.monsterType === MONSTER_TYPES.LIFESTEALER ? '🩸' :
        mb.monsterType === MONSTER_TYPES.MANASTEALER ? '💧' :
        mb.monsterType === MONSTER_TYPES.IMPROVER ? '📈' :
        mb.monsterType === MONSTER_TYPES.CRITMASTER ? '🎯' :
        mb.monsterType === MONSTER_TYPES.POISON ? '☠️' : '';
      const atkIcon = mb.monsterAttackType === ATTACK_TYPES.CASTER ? '🔮' : '⚔️';
      $('mbEnemyName').textContent = `${mb.currentMonsterName} ${typeIcon}${atkIcon}`;
      $('mbLocation').textContent = `${mb.loc.name} — ${floorStr}`;
    }
    const pHpPct = Math.round((mb.playerHp / mb.maxPlayerHp) * 100);
    const eHpPct = mb.isBoss ? Math.round((mb.bossHp / mb.maxBossHp) * 100) : Math.round((mb.bossHp / mb.maxBossHp) * 100);
    // Segmentový HP bar
    updateEnemyHpBar(mb);
    const hpLabel = $('mbHpLabel');
    if (hpLabel) {
      hpLabel.textContent = `${Math.max(0, Math.round(mb.bossHp))}/${Math.round(mb.maxBossHp)}`;
      // Dynamická velikost fontu — při delším textu zmenšit, aby nepřetekl
      const len = hpLabel.textContent.length;
      if (len > 7) hpLabel.style.fontSize = Math.max(14, Math.round(24 * 7 / len)) + 'px';
      else hpLabel.style.fontSize = '24px';
    }
    // XP Bar
    const xpWrap = $('mbXpBarWrap');
    if (xpWrap) {
      const h = state.hero;
      const xpNeeded = h.level * 80;
      const xpPct = Math.min((h.xp / xpNeeded) * 100, 100);
      $('mbLevelLabel').textContent = `Lv.${h.level}`;
      $('mbXpBarFill').style.width = xpPct + '%';
      xpWrap.style.display = 'flex';
    }
    // Arena HP bar na spodku
    const arenaHp = $('mbPlayerArenaHp');
    if (arenaHp) {
      const span = arenaHp.querySelector('span');
      if (span) span.textContent = `${mb.playerHp}/${mb.maxPlayerHp}`;
      const fill = $('mbPlayerArenaHpFill');
      if (fill) fill.style.width = Math.max(0, pHpPct) + '%';
    }
    // Stamina bar — schovat, nahrazeno rage/mana/energy
    const arenaStamina = $('mbPlayerArenaStamina');
    if (arenaStamina) arenaStamina.classList.add('hidden');
    // Rage bar (barbar)
    const rageBar = $('mbPlayerArenaRage');
    if (rageBar) {
      if (state.heroClass === 'barbarian') {
        rageBar.classList.remove('hidden');
        const span = rageBar.querySelector('span');
        if (span) span.textContent = `${state.rage || 0}/${state.maxRage || 100}`;
        const fill = $('mbPlayerArenaRageFill');
        if (fill) fill.style.width = Math.max(0, Math.round(((state.rage || 0) / (state.maxRage || 100)) * 100)) + '%';
      } else {
        rageBar.classList.add('hidden');
      }
    }
    const emoji = mb.isBoss ? mb.loc.boss.face : mb.monsterFace;
    // Enemy mana bar (caster)
    const manaBar = $('mbEnemyManaBar');
    const manaFill = $('mbEnemyManaFill');
    if (manaBar && manaFill) {
      if (mb.monsterAttackType === ATTACK_TYPES.CASTER && !mb.isBoss && mb.maxEnemyMana > 0) {
        manaBar.classList.remove('hidden');
        const mpPct = Math.round((mb.enemyMana / mb.maxEnemyMana) * 100);
        manaFill.style.width = mpPct + '%';
      } else {
        manaBar.classList.add('hidden');
      }
    }
    // D4 heat indicator
    const heatEl = $('mbHeatIndicator');
    if (heatEl) {
      if ((mb.locId === 3 || mb.locId === 4) && mb._heatLevel > 0) {
        heatEl.classList.remove('hidden');
        const numEl = heatEl.querySelector('.heat-num');
        if (numEl) numEl.textContent = `${mb._heatLevel}/10`;
        const heatPct = mb._heatLevel / 10;
        const r = 233;
        const g = Math.round(69 - heatPct * 69);
        const b = Math.round(96 - heatPct * 96);
        heatEl.style.color = `rgb(${r},${g},${b})`;
      } else {
        heatEl.classList.add('hidden');
      }
    }
    const fig = $('mbFigure');
    const themeFilter = DUNGEON_THEME_FILTERS[mb.monsterTheme] || '';
    const theme = DUNGEON_THEMES[mb.monsterTheme] || DUNGEON_THEMES[0];
    if (emoji.startsWith('<svg')) { fig.innerHTML = emoji; }
    else if (emoji.startsWith('assets/')) { fig.innerHTML = '<div class=\"monster-ring-frame\"><img src=\"'+emoji+'\" alt=\"\" style=\"filter:'+themeFilter+'\"/></div>'; }
    else { fig.textContent = emoji; }
    // (hint necháme pro bonus info — nastaví se až v onMapAttack)

    // Debuff ikony nad příšerou
    renderDebuffs();
    // Buff ikony hráče
    renderBuffs();

    updateSpellButtons();
    renderPotionButtons();
  }

  function renderPotionButtons() {
    const container = $('mbPotionButtons');
    if (!container) return;
    const h = state.hero;
    const belt = ITEM_MAP[h.equip.belt];
    if (!belt) { container.innerHTML = ''; return; }
    const bpSlots = h.equip.beltPotionSlots || [];
    container.innerHTML = bpSlots.map((potId, i) => {
      const pot = potId ? ITEM_MAP[potId] : null;
      const keyHint = i < 9 ? (i + 1) : '';
      if (pot) {
        return `<div class="mb-potion-btn" data-potion-idx="${i}" onclick="game.usePotion(${i})" title="${pot.name} (${pot.subtype === 'heal' ? '+' + pot.effectValue + ' HP' : '+' + pot.effectValue + ' many'})">
          ${renderItemIcon(pot, 0)}
          ${keyHint ? `<span class="potion-key-hint">${keyHint}</span>` : ''}
        </div>`;
      } else {
        // Prázdný slot — placeholder s healing potion ikonou
        return `<div class="mb-potion-btn" style="opacity:0.25;border-style:dashed;cursor:default;pointer-events:none">
          <img src="assets/items/potion_healing.png" alt="" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:4px;filter:grayscale(1)">
        </div>`;
      }
    }).join('');
  }

  function usePotion(potionIdx) {
    const h = state.hero;
    const bpSlots = h.equip.beltPotionSlots || [];
    const potId = bpSlots[potionIdx];
    if (!potId) return;
    const pot = ITEM_MAP[potId];
    if (!pot || pot.type !== 'consumable') return;
    const mb = mapBattleState;
    if (!mb || mb.ended) return;
    if (pot.subtype === 'heal') {
      mb.playerHp = Math.min(mb.maxPlayerHp, mb.playerHp + pot.effectValue);
      showMessage(`❤️ +${pot.effectValue} HP`);
    } else if (pot.subtype === 'mana') {
      const cls = CLASSES[state.heroClass];
      if (cls && cls.resource === 'mana') {
        state.mana = Math.min(state.maxMana || 100, (state.mana || 0) + pot.effectValue);
      }
      showMessage(`💧 +${pot.effectValue} many`);
    }
    // Potion zmizí ze slotu
    bpSlots[potionIdx] = null;
    h.equip.beltPotionSlots = bpSlots;
    saveGame();
    updateMapBattleUI();
  }

  function updateSpellButtons() {
    // Class spells — jen investovaná kouzla
    renderClassSpells();
  }

  function updateActionButtons() {
    // V auto-combatu není potřeba — dodge tlačítko odstraněno
  }

  // ===== RESOURCE BARS (energy, combo) =====
  function updateResourceBars() {
    // Energy bar (assassin)
    const energyBar = $('mbPlayerArenaEnergy');
    if (energyBar) {
      if (state.heroClass === 'assassin') {
        energyBar.classList.remove('hidden');
        const span = energyBar.querySelector('span');
        if (span) span.textContent = `⚡ ${Math.round(state.energy || 0)}/${state.maxEnergy || 100}`;
        const fill = $('mbPlayerArenaEnergyFill');
        if (fill) fill.style.width = Math.max(0, Math.round(((state.energy || 0) / (state.maxEnergy || 100)) * 100)) + '%';
      } else {
        energyBar.classList.add('hidden');
      }
    }
    // Combo point indikátor (assassin)
    const comboEl = document.getElementById('mbComboIndicator');
    if (comboEl) {
      if (state.heroClass === 'assassin') {
        comboEl.classList.remove('hidden');
        const cp = state.comboPoints || 0;
        let dotsHtml = '';
        for (let i = 0; i < 5; i++) {
          dotsHtml += `<div class="mb-combo-dot${i < cp ? ' active' : ''}"></div>`;
        }
        comboEl.innerHTML = dotsHtml;
      } else {
        comboEl.classList.add('hidden');
      }
    }
  }

  // ===== CLASS SPELLS (Barbar) =====
  function renderClassSpells() {
    const container = document.getElementById('mbClassSpells');
    if (!container) return;
    const cls = CLASSES[state.heroClass];
    if (!cls || !cls.spells) { container.innerHTML = ''; return; }
    // Jen investovaná kouzla (kde je alespoň 1 bod v talentu)
    const investedSpells = cls.spells.filter(spell => {
      const key = state.heroClass + '_' + spell.id;
      return getTalentLv(key) > 0;
    });
    if (investedSpells.length === 0) { container.innerHTML = ''; return; }
    let html = '';
    investedSpells.forEach(spell => {
      const onGcd = state._gcdTimer > 0;
      const clsDef = CLASSES[state.heroClass];
      const resourceKey = clsDef.resource === 'energy' ? 'energy' : 'rage';
      const maxResource = clsDef.resource === 'energy' ? (state.maxEnergy || 100) : (state.maxRage || 100);
      const hasResource = (state[resourceKey] || 0) >= spell.cost;
      const onCooldown = _sessionSpellCooldowns[spell.id] > 0;
      const cdRemaining = onCooldown ? Math.ceil(_sessionSpellCooldowns[spell.id] / 60) : 0;
      const canUse = hasResource && !onGcd && !onCooldown;
      // Kouzla vyžadující combo pointy — bez nich nerozsvítit
      const hasCombo = (state.comboPoints || 0) > 0;
      const needsCombo = spell.needsCombo === true;
      const canUseFinal = canUse && (!needsCombo || hasCombo);
      const isQueued = spell.id === 'heroicStrike' && mapBattleState && mapBattleState._heroicStrikeQueued;
      const gcdActive = onGcd && !onCooldown && !isQueued;
      const gcdPct = onGcd ? Math.min(1, state._gcdTimer / 30) : 0;
      const gcdDeg = Math.round(gcdPct * 360);
      let btnClass = 'arena-class-spell-btn';
      if (canUseFinal) btnClass += ' active';
      if (isQueued) btnClass += ' queued';
      html += `<button class="${btnClass}" onclick="game.castClassSpell('${spell.id}')" title="${spell.desc}">
        <img class="spell-icon-img" src="assets/spells/${spell.id}.png" alt="${spell.name}">
        <span class="spell-cost">${spell.cost > 0 ? spell.cost : ''}</span>
        ${onCooldown ? `<span class="spell-cd-num">${cdRemaining}</span>` : ''}
        ${gcdActive ? `<div class="spell-gcd-overlay" style="background:conic-gradient(rgba(0,0,0,0.6) 0deg, rgba(0,0,0,0.6) ${gcdDeg}deg, transparent ${gcdDeg}deg, transparent 360deg)"></div>` : ''}
      </button>`;
    });
    container.innerHTML = html;
  }

  function renderDebuffs() {
    const container = document.getElementById('mbDebuffs');
    if (!container) return;
    const debuffKeys = Object.keys(_sessionDebuffs);
    if (debuffKeys.length === 0) { container.innerHTML = ''; } else {
      let html = '';
      debuffKeys.forEach(spellId => {
        const d = _sessionDebuffs[spellId];
        if (!d) return;
        const remaining = Math.ceil(d.ticks / 60);
        const hasImg = spellId === 'thunderClap' || spellId === 'thunderBolt';
        html += `<div class="debuff-icon" title="${d.name || spellId}">
          ${hasImg ? `<img class="buff-icon-img" src="assets/spells/${spellId}.png" alt="${d.name}">` : `<span class="debuff-icon-emoji">${d.icon}</span>`}
          <span class="debuff-icon-timer">${remaining}s</span>
        </div>`;
      });
      container.innerHTML = html;
    }
    // Enemy buffs (vlevo, pod debuffy)
    const enemyBuffContainer = document.getElementById('mbEnemyBuffs');
    if (enemyBuffContainer) {
      const ebKeys = Object.keys(_enemyBuffs);
      if (ebKeys.length === 0) { enemyBuffContainer.innerHTML = ''; } else {
        let html = '';
        ebKeys.forEach(spellId => {
          const b = _enemyBuffs[spellId];
          if (!b) return;
          const remaining = Math.ceil(b.ticks / 60);
          html += `<div class="debuff-icon" title="${b.name || spellId}">
            <span class="debuff-icon-emoji">${b.icon || '📈'}</span>
            <span class="debuff-icon-timer">${remaining}s</span>
          </div>`;
        });
        enemyBuffContainer.innerHTML = html;
      }
    }
  }

  function renderBuffs() {
    const container = document.getElementById('mbBuffs');
    if (!container) return;
    const buffKeys = Object.keys(_sessionBuffs);
    if (buffKeys.length === 0) { container.innerHTML = ''; } else {
      let html = '';
      buffKeys.forEach(spellId => {
        const b = _sessionBuffs[spellId];
        if (!b) return;
        const remaining = Math.ceil(b.ticks / 60);
        const hasImg = spellId === 'bloodrage' || spellId === 'battleShout' || spellId === 'defensiveShout' || spellId === 'skillShout' || spellId === 'shieldBash';
        html += `<div class="buff-icon" title="${b.name || spellId}">
          ${hasImg ? `<img class="buff-icon-img" src="assets/spells/${spellId}.png" alt="${b.name}">` : `<span class="buff-icon-emoji">${b.icon}</span>`}
          <span class="buff-icon-timer">${remaining}s</span>
        </div>`;
      });
      container.innerHTML = html;
    }
    // Player debuffs (vpravo, pod buffy)
    const playerDebuffContainer = document.getElementById('mbPlayerDebuffs');
    if (playerDebuffContainer) {
      const pdKeys = Object.keys(_playerDebuffs);
      if (pdKeys.length === 0) { playerDebuffContainer.innerHTML = ''; } else {
        let html = '';
        pdKeys.forEach(spellId => {
          const d = _playerDebuffs[spellId];
          if (!d) return;
          const remaining = Math.ceil(d.ticks / 60);
          html += `<div class="buff-icon" title="${d.name || spellId}">
            <span class="buff-icon-emoji">${d.icon || '☠️'}</span>
            <span class="buff-icon-timer">${remaining}s</span>
          </div>`;
        });
        playerDebuffContainer.innerHTML = html;
      }
    }
  }

  function castClassSpell(spellId) {
    const cls = CLASSES[state.heroClass];
    if (!cls) return;
    const spell = cls.spells.find(s => s.id === spellId);
    if (!spell) return;
    const mb = mapBattleState;
    if (!mb || mb.ended) return;

    // GCD check
    if (state._gcdTimer > 0) return;
    // Resource check (rage nebo energy)
    const resourceKey = cls.resource === 'energy' ? 'energy' : 'rage';
    if ((state[resourceKey] || 0) < spell.cost) return;
    // Per-spell cooldown check
    if (_sessionSpellCooldowns[spellId] > 0) return;

    // Odečíst resource
    state[resourceKey] = Math.max(0, (state[resourceKey] || 0) - spell.cost);
    // Nastavit GCD (0.5s = ~30 ticků při 60fps)
    state._gcdTimer = Math.round(spell.gcd * 60);
    // Nastavit per-spell cooldown (session persistent)
    if (spell.cooldown > 0) {
      _sessionSpellCooldowns[spellId] = Math.round(spell.cooldown * 60);
    }

    // Efekty kouzel
    if (spellId === 'heroicStrike') {
      mb._heroicStrikeQueued = true;
    } else if (spellId === 'thunderClap') {
      // 30% dmg
      const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
      const eqAttrs = getEquipAttrs();
      const baseDmg = 10 + Math.floor(state.hero.level * 3) + weapon.baseDmg + ((state.hero.attrStr||0) + eqAttrs.str) * 2;
      const dmg = Math.max(1, Math.round(baseDmg * 0.3));
      mb.bossHp -= dmg;
      // Zpomalení nepřítele 10% na 10s
      state.thunderClapTimer = 600; // 10s * 60fps
      state.thunderClapSlowPct = 10;
      // Debuff ikona nad příšerou
      _sessionDebuffs['thunderClap'] = { icon: '🌊', name: 'Zpomalení', ticks: 600, maxTicks: 600 };
      // Projektil
      spawnProjectileEffect(null, false, false, ATTACK_TYPES.CASTER);
      const dmgText = $('mbDamageText');
      if (dmgText) {
        dmgText.textContent = `🌊 -${dmg}`;
        dmgText.classList.remove('hidden');
        setTimeout(() => dmgText.classList.add('hidden'), 500);
      }
    } else if (spellId === 'bloodrage') {
      // -15% HP, +100% zisk Rage na 10s
      const hpCost = Math.round(mb.playerHp * 0.15);
      mb.playerHp = Math.max(1, mb.playerHp - hpCost);
      state.rageMultiplier = 2;
      state._bloodrageTimer = 600; // 10s
      // Buff ikona hráče
      _sessionBuffs['bloodrage'] = { icon: '🩸', name: 'Bloodrage', ticks: 600, maxTicks: 600, onExpire: function() { state.rageMultiplier = 1; } };
      const dmgText = $('mbPlayerDamageText');
      if (dmgText) {
        dmgText.textContent = `🩸 -${hpCost} HP`;
        dmgText.style.color = '#e74c3c';
        dmgText.classList.remove('hidden');
        setTimeout(() => dmgText.classList.add('hidden'), 500);
      }
    } else if (spellId === 'thunderBolt') {
      const lv = getSpellLv('thunderBolt');
      const pct = 80 + lv * 20; // 100% @ lv1, 120% @ lv2, ... 180% @ lv5
      const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
      const eqAttrs = getEquipAttrs();
      const baseDmg = 10 + Math.floor(state.hero.level * 3) + weapon.baseDmg + ((state.hero.attrStr||0) + eqAttrs.str) * 2;
      const dmg = Math.max(1, Math.round(baseDmg * pct / 100));
      mb.bossHp -= dmg;
      // Omráčení — 3s + 0.5s/lv
      const stunTicks = Math.round((3 + (lv - 1) * 0.5) * 60);
      mb._enemyStunned = true;
      mb._enemyStunTimer = stunTicks;
      mb._enemyStunMax = stunTicks;
      mb._enemySwingReady = false;
      // Debuff ikona nad příšerou
      _sessionDebuffs['thunderBolt'] = { icon: '⚡', name: 'Omráčení', ticks: stunTicks, maxTicks: stunTicks };
      // Projektil
      spawnProjectileEffect(null, false, false, ATTACK_TYPES.CASTER);
      const dmgText = $('mbDamageText');
      if (dmgText) {
        dmgText.textContent = `⚡ -${dmg}`;
        dmgText.classList.remove('hidden');
        setTimeout(() => dmgText.classList.add('hidden'), 500);
      }
    } else if (spellId === 'shieldBash') {
      // Shield Bash — pouze se štítem
      const shield = ITEM_MAP[state.hero.equip.shield];
      if (!shield || shield.type !== 'shield') {
        showMessage('🛡️ Potřebuješ štít!');
        return;
      }
      const lv = getSpellLv('shieldBash');
      const pct = 60 + lv * 20; // 80% @ lv1, 100% @ lv2, ... 160% @ lv5
      const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
      const eqAttrs = getEquipAttrs();
      const baseDmg = 10 + Math.floor(state.hero.level * 3) + weapon.baseDmg + ((state.hero.attrStr||0) + eqAttrs.str) * 2;
      const dmg = Math.max(1, Math.round(baseDmg * pct / 100));
      mb.bossHp -= dmg;
      // Interrupt — přeruší castování nepřítele
      if (mb._enemyCasting) {
        mb._enemyCasting = false;
        mb._enemyCastSpell = null;
        mb._enemySwingStart = performance.now();
        _sessionDebuffs['shieldBash'] = { icon: '🛡️', name: 'Interrupt', ticks: 30, maxTicks: 30 };
      }
      // Projektil
      spawnProjectileEffect(null, false, false, ATTACK_TYPES.MELEE);
      const dmgText = $('mbDamageText');
      if (dmgText) {
        dmgText.textContent = `🛡️ -${dmg}`;
        dmgText.classList.remove('hidden');
        setTimeout(() => dmgText.classList.add('hidden'), 500);
      }
    } else if (spellId === 'battleShout') {
      // +15% dmg na 60s
      state.battleShoutDmgPct = 15;
      state.battleShoutTimer = 1800; // 30s
      playSFX(battleShoutSfx);
      _sessionBuffs['battleShout'] = { icon: '📯', name: 'Battle Shout', ticks: 1800, maxTicks: 1800, onExpire: function() { state.battleShoutDmgPct = 0; } };
    } else if (spellId === 'defensiveShout') {
      const lv = getSpellLv('defensiveShout');
      const armorPct = [50, 75, 100, 125, 150][Math.min(lv - 1, 4)];
      state.defensiveShoutArmorPct = armorPct;
      state.defensiveShoutTimer = 1800; // 30s
      playSFX(battleShoutSfx);
      _sessionBuffs['defensiveShout'] = { icon: '🛡️', name: 'Defensive Shout', ticks: 1800, maxTicks: 1800, onExpire: function() { state.defensiveShoutArmorPct = 0; } };
    } else if (spellId === 'skillShout') {
      const lv = getSpellLv('skillShout');
      state.skillShoutBonus = lv;
      state.skillShoutTimer = 1800; // 30s
      playSFX(battleShoutSfx);
      _sessionBuffs['skillShout'] = { icon: '📣', name: 'Skill Shout', ticks: 1800, maxTicks: 1800, onExpire: function() { state.skillShoutBonus = 0; } };
    } else if (spellId === 'doubleSwing') {
      // Double Swing — 150% dmg oběma zbraněmi + reset swing timerů
      const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
      const offhandWeapon = (mb.offhandSwingMs > 0 && state.hero.equip.shield && ITEM_MAP[state.hero.equip.shield]?.weaponType) ? ITEM_MAP[state.hero.equip.shield] : null;
      const eqAttrs = getEquipAttrs();
      const baseDmg = 10 + Math.floor(state.hero.level * 3) + ((state.hero.attrStr||0) + eqAttrs.str) * 2;
      const mainDmg = baseDmg + weapon.baseDmg;
      const offDmg = offhandWeapon ? baseDmg + offhandWeapon.baseDmg : 0;
      const totalDmg = Math.max(1, Math.round((mainDmg + offDmg) * 1.5));
      mb.bossHp -= totalDmg;
      // Reset obou swing timerů
      mb._playerSwingStart = performance.now();
      mb._playerSwingReady = false;
      mb._playerSwingPct = 0;
      if (mb.offhandSwingMs > 0) {
        mb._offhandSwingStart = performance.now();
        mb._offhandSwingReady = false;
        mb._offhandSwingPct = 0;
      }
      // Projektil
      spawnProjectileEffect(null, false, false, ATTACK_TYPES.CASTER);
      const dmgText = $('mbDamageText');
      if (dmgText) {
        dmgText.textContent = `⚔️ -${totalDmg}`;
        dmgText.classList.remove('hidden');
        setTimeout(() => dmgText.classList.add('hidden'), 500);
      }
    } else if (spellId === 'sinisterStrike') {
      // 150% dmg + 1 combo point
      const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
      const eqAttrs = getEquipAttrs();
      const baseDmg = 10 + Math.floor(state.hero.level * 3) + weapon.baseDmg + ((state.hero.attrStr||0) + eqAttrs.str) * 2;
      const dmg = Math.max(1, Math.round(baseDmg * 1.5));
      mb.bossHp -= dmg;
      state.comboPoints = Math.min(5, (state.comboPoints || 0) + 1);
      // Projektil podle zbraně
      spawnWeaponProjectile(false);
      const dmgText = $('mbDamageText');
      if (dmgText) {
        dmgText.textContent = `🗡️ -${dmg}`;
        dmgText.classList.remove('hidden');
        setTimeout(() => dmgText.classList.add('hidden'), 500);
      }
    } else if (spellId === 'eviscerate') {
      const cp = state.comboPoints || 0;
      if (cp < 1) return; // nelze použít bez combo pointů
      const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
      const eqAttrs = getEquipAttrs();
      const baseDmg = 10 + Math.floor(state.hero.level * 3) + weapon.baseDmg + ((state.hero.attrStr||0) + eqAttrs.str) * 2;
      const mults = [0, 1.5, 2.0, 2.5, 3.0, 3.5];
      const mult = mults[Math.min(cp, 5)] || 1.5;
      const dmg = Math.max(1, Math.round(baseDmg * mult));
      mb.bossHp -= dmg;
      state.comboPoints = 0; // spotřebovat combo pointy
      // Projektil podle zbraně
      spawnWeaponProjectile(false);
      const dmgText = $('mbDamageText');
      if (dmgText) {
        dmgText.textContent = `💥 -${dmg}`;
        dmgText.classList.remove('hidden');
        setTimeout(() => dmgText.classList.add('hidden'), 500);
      }
    } else if (spellId === 'kidneyShot') {
      const cp = state.comboPoints || 0;
      if (cp < 1) return; // nelze použít bez combo pointů
      const stunDuration = cp; // 1-5 sekund
      mb._enemyStunned = true;
      mb._enemyStunTimer = stunDuration * 60; // 60 ticků/s
      mb._enemyStunMax = stunDuration * 60;
      mb._enemySwingReady = false;
      state.comboPoints = 0; // spotřebovat combo pointy
      // Debuff ikona
      _sessionDebuffs['kidneyShot'] = { icon: '🔨', name: 'Omráčení', ticks: stunDuration * 60, maxTicks: stunDuration * 60 };
      const dmgText = $('mbDamageText');
      if (dmgText) {
        dmgText.textContent = `🔨 Stun ${stunDuration}s`;
        dmgText.classList.remove('hidden');
        setTimeout(() => dmgText.classList.add('hidden'), 500);
      }
    } else if (spellId === 'evasion') {
      // +50% dodge na 10s
      state._dodgeBuffTimer = 600; // 10s * 60fps
      _sessionBuffs['evasion'] = { icon: '💨', name: 'Evasion', ticks: 600, maxTicks: 600, onExpire: function() { /* timer už je v state._dodgeBuffTimer */ } };
      const dmgText = $('mbPlayerDamageText');
      if (dmgText) {
        dmgText.textContent = `💨 Evasion!`;
        dmgText.style.color = '#f1c40f';
        dmgText.classList.remove('hidden');
        setTimeout(() => dmgText.classList.add('hidden'), 500);
      }
    } else if (spellId === 'speedBoost') {
      const cp = state.comboPoints || 0;
      if (cp < 1) return; // nelze použít bez combo pointů
      const durations = [0, 5, 8, 11, 14, 17];
      const duration = durations[Math.min(cp, 5)] || 5;
      state._speedBoostPct = 20; // +20% rychlost
      state._speedBoostTimer = duration * 60; // v tickách
      state.comboPoints = 0; // spotřebovat combo pointy
      // Buff ikona
      _sessionBuffs['speedBoost'] = { icon: '⚡', name: 'Speed Boost', ticks: duration * 60, maxTicks: duration * 60, onExpire: function() { state._speedBoostPct = 0; } };
      // Přepočítat swing timer
      mb.playerSwingMs = getSwingTime(state.hero.equip.weapon);
      const dmgText = $('mbPlayerDamageText');
      if (dmgText) {
        dmgText.textContent = `⚡ Speed +${duration}s`;
        dmgText.style.color = '#f1c40f';
        dmgText.classList.remove('hidden');
        setTimeout(() => dmgText.classList.add('hidden'), 500);
      }
    }

    updateMapBattleUI();
    saveGame();
  }

  function setupMapBattleInput() {
    const arena = $('mbArena');
    if (!arena) return;
    const old = arena._mbHandlers;
    if (old) old.forEach(h => arena.removeEventListener(h[0], h[1]));

    let startX, startY;
    const handlers = [];

    const ts = (e) => { if (mapBattleState.ended) return; const t=e.touches[0]; startX=t.clientX; startY=t.clientY; };
    const te = (e) => {
      if (mapBattleState.ended || !startX) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX, dy = t.clientY - startY;
      startX = startY = null;
      if (Math.abs(dx)<20 && Math.abs(dy)<20) { 
        // krátký tap na aréně = nic, útok jen přes ⚔️ tlačítko
        return; 
      }
      let dir;
      if (Math.abs(dy) > Math.abs(dx)) dir = dy < 0 ? '⬆️' : '⬇️';
      else dir = dx < 0 ? '⬅️' : '➡️';
      onMapDodge(dir);
    };
    arena.addEventListener('touchstart', ts); arena.addEventListener('touchend', te);
    handlers.push(['touchstart',ts], ['touchend',te]);

    const kh = (e) => {
      if (mapBattleState.ended) return;
      if (e.repeat) return; // ignorovat key repeat (auto-opakování při držení)
      const map = { ArrowUp:'⬆️',ArrowDown:'⬇️',ArrowLeft:'⬅️',ArrowRight:'➡️','w':'⬆️','s':'⬇️','a':'⬅️','d':'➡️' };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); onMapDodge(dir); return; }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (mapBattleState._attackProcessed) return; onMapDodgeAction(); }
    };
    window.addEventListener('keydown', kh);
    handlers.push(['keydown', kh]);
    arena._mbHandlers = handlers;
    // Rapid tap handlery — nejdřív smazat staré
    const clearTap = (elId) => {
      const el = $(elId);
      if (!el) return;
      if (el._rapidHandler) {
        el.removeEventListener('pointerdown', el._rapidHandler);
        el._rapidHandler = null;
      }
    };
    clearTap('mbTapLeft');
    clearTap('mbTapRight');
    const setupTap = (elId) => {
      const el = $(elId);
      if (!el) return;
      const tapHandler = (e) => {
        e.stopPropagation();
        onMapRapidTap(elId);
      };
      el._rapidHandler = tapHandler;
      el.addEventListener('pointerdown', tapHandler);
    };
    setupTap('mbTapLeft');
    setupTap('mbTapRight');
  }

  function getFloorTimerMultiplier(floor, locId) {
    // D2 (Poušť) — base je o něco pomalejší, ale bude kolísat v rAF
    if (locId === 1) return Math.pow(0.95, floor) * 1.15;
    // Ostatní dungeony: 1200ms base, každé patro -5%
    return Math.pow(0.95, floor);
  }

  function getDungeonAttackChances(locId, floor) {
    // D1, D2: jen šedé šipky
    if (locId === 0 || locId === 1) return { grey: 85, yellow: 0, blue: 0, green: 0, inverted: 0, rapid: 0, truth: 0, lie: 0, freeze: 0 };
    // D3 (Nemrtvá země): truth (zelená=normální), lie (červená=opačný), freeze (modrá=nic)
    if (locId === 2) {
      const f = floor || 0;
      const truth = Math.max(30, 70 - f * 4);
      const lie = Math.min(35, 15 + f * 2);
      const freeze = Math.min(35, 15 + f * 2);
      return { grey: 0, yellow: 0, blue: 0, green: 0, inverted: 0, rapid: 0, truth, lie, freeze };
    }
    // D4 (Pekelné výspy): truth/lie/freeze + přehřívání
    if (locId === 3) {
      const f = floor || 0;
      const truth = Math.max(20, 60 - f * 4);
      const lie = Math.min(40, 20 + f * 2);
      const freeze = Math.min(40, 20 + f * 2);
      return { grey: 0, yellow: 0, blue: 0, green: 0, inverted: 0, rapid: 0, truth, lie, freeze };
    }
    // D5 (Mrazivé štíty): truth/lie/freeze + přehřívání + timer freeze
    if (locId === 4) {
      const f = floor || 0;
      const truth = Math.max(20, 60 - f * 4);
      const lie = Math.min(40, 20 + f * 2);
      const freeze = Math.min(40, 20 + f * 2);
      return { grey: 0, yellow: 0, blue: 0, green: 0, inverted: 0, rapid: 0, truth, lie, freeze };
    }
    return { grey: 85, yellow: 0, blue: 0, green: 0, inverted: 0, rapid: 0, truth: 0, lie: 0, freeze: 0 };
  }

  const _arrowSvg = (fill, extra = '') => {
    // Tmavší border — odečíst 60 od každé RGB složky
    const hex = fill.replace('#','');
    const r = Math.max(0, parseInt(hex.substr(0,2),16) - 60);
    const g = Math.max(0, parseInt(hex.substr(2,2),16) - 60);
    const b = Math.max(0, parseInt(hex.substr(4,2),16) - 60);
    const border = `#${(r<16?'0':'')+r.toString(16)}${(g<16?'0':'')+g.toString(16)}${(b<16?'0':'')+b.toString(16)}`;
    return `<svg viewBox="0 0 16 16" width="78" height="78">
      <path${extra} d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="none" stroke="${border}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
      <path${extra} d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="${fill}" stroke="${fill}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
  };

  function getDungeonMechanics(locId, floor) {
    const c = getDungeonAttackChances(locId, floor);
    const icons = [];
    icons.push(_arrowSvg('#bbb')); // normální úhyb — vždy
    // D2 — nestabilní timer (červená/modrá)
    if (locId === 1) icons.push('<span style="font-size:24px;display:inline-flex;align-items:center;vertical-align:middle">⚡</span>');
    // D3 — lživé šipky
    if (locId === 2) {
      icons.push(_arrowSvg('#2ecc71')); // truth — zelená
      icons.push(_arrowSvg('#e94560')); // lie — červená
      icons.push('<span style="font-size:24px;display:inline-flex;align-items:center;vertical-align:middle">🔵</span>'); // freeze — modrá
    }
    // D4 — lživé šipky + přehřívání
    if (locId === 3) {
      icons.push(_arrowSvg('#2ecc71')); // truth — zelená
      icons.push(_arrowSvg('#e94560')); // lie — červená
      icons.push('<span style="font-size:24px;display:inline-flex;align-items:center;vertical-align:middle">🔵</span>'); // freeze — modrá
      icons.push('<span style="font-size:24px;display:inline-flex;align-items:center;vertical-align:middle">🔥</span>'); // přehřívání
    }
    // D5 — lživé šipky + přehřívání + timer freeze
    if (locId === 4) {
      icons.push(_arrowSvg('#2ecc71')); // truth — zelená
      icons.push(_arrowSvg('#e94560')); // lie — červená
      icons.push('<span style="font-size:24px;display:inline-flex;align-items:center;vertical-align:middle">🔵</span>'); // freeze — modrá
      icons.push('<span style="font-size:24px;display:inline-flex;align-items:center;vertical-align:middle">🔥</span>'); // přehřívání
      icons.push('<span style="font-size:24px;display:inline-flex;align-items:center;vertical-align:middle">❄️</span>'); // timer freeze
    }
    return icons;
  }
  function getDungeonResistIcons(locId) {
    const loc = LOCATIONS[locId];
    if (!loc || !loc.resists) return '';
    const r = loc.resists;
    let weak = [], strong = [];
    if (r.fire > 1.0) weak.push('🔥');
    else if (r.fire < 1.0) strong.push('🔥');
    if (r.ice > 1.0) weak.push('❄️');
    else if (r.ice < 1.0) strong.push('❄️');
    if (r.nature > 1.0) weak.push('🌿');
    else if (r.nature < 1.0) strong.push('🌿');
    let parts = [];
    if (weak.length) parts.push('⚔️' + weak.join(''));
    if (strong.length) parts.push('🛡️' + strong.join(''));
    return parts.length ? parts.join(' ') : '';
  }

  function generateAttack(chances, prevType, locId, floor) {
    const randTotal = chances.grey + chances.yellow + chances.blue + chances.green + chances.inverted + (chances.rapid||0) + (chances.truth||0) + (chances.lie||0) + (chances.freeze||0);
    const randNum = Math.random() * randTotal;
    let type = 'grey';
    if (randNum < chances.inverted) { type = 'inverted'; }
    else if (randNum < chances.inverted + chances.green) { type = 'green'; }
    else if (randNum < chances.inverted + chances.green + chances.yellow) { type = 'yellow'; }
    else if (randNum < chances.inverted + chances.green + chances.yellow + chances.blue) { type = 'blue'; }
    else if (randNum < chances.inverted + chances.green + chances.yellow + chances.blue + (chances.rapid||0)) { type = 'rapid'; }
    else if (randNum < chances.inverted + chances.green + chances.yellow + chances.blue + (chances.rapid||0) + (chances.truth||0)) { type = 'truth'; }
    else if (randNum < chances.inverted + chances.green + chances.yellow + chances.blue + (chances.rapid||0) + (chances.truth||0) + (chances.lie||0)) { type = 'lie'; }
    else if (randNum < chances.inverted + chances.green + chances.yellow + chances.blue + (chances.rapid||0) + (chances.truth||0) + (chances.lie||0) + (chances.freeze||0)) { type = 'freeze'; }
    // Timer: base 1500ms, floor multiplikátor (P1=1500, P10=~900ms)
    const mult = getFloorTimerMultiplier(floor || 0, locId);
    const baseTime = Math.round(1500 * mult);
    // Malá náhoda ±10% pro pestrost
    const jitter = Math.round(baseTime * (0.9 + Math.random() * 0.2));
    const windowTime = (type === 'yellow' || type === 'blue') ? Math.round(jitter * 1.5) : (type === 'rapid' ? Math.round(jitter * 3.0) : jitter);
    const dir = DIRECTIONS[rand(0,3)];
    if (type === 'blue') {
      // Dvojitá šipka: vyber protichůdný pár (nahoru-dolů nebo vlevo-vpravo)
      const pairs = [['⬆️','⬇️'], ['⬅️','➡️']];
      const pair = pairs[rand(0,1)];
      const dirA = pair[0], dirB = pair[1];
      return { type, dir: dirA, twinDir: dirB, windowTime };
    }
    if (type === 'rapid') {
      // Rapid: náhodný cíl 20-35 podle patra (+25%)
      const rapidTarget = Math.min(20 + Math.floor((floor||0) * 4), 35);
      return { type, dir, windowTime, rapidTarget };
    }
    return { dir, type, windowTime };
  }

  function getAttackHint(attack) {
    const dir = attack.dir;
    if (attack.type === 'grey') return `${dir} ⚪ Útok — swipni!`;
    if (attack.type === 'yellow') return `${dir} 🟡 Silný útok — 2× ${dir}!`;
    if (attack.type === 'blue') return `${dir}↔${attack.twinDir} 🔷 Dvojitý útok — oba směry!`;
    if (attack.type === 'green') return `${dir} 🟢 Léčení — swipni pro HP!`;
    if (attack.type === 'inverted') return `${dir} 🟢 Inverzní — udělej OPAK!`;
    if (attack.type === 'rapid') return `🔮 Ťukej! ${attack.rapidTarget}× na plošky!`;
    if (attack.type === 'truth') return `${dir} 🟢 Pravda — swipni jak šipka!`;
    if (attack.type === 'lie') return `${dir} 🔴 Lež — udělej OPAK!`;
    if (attack.type === 'freeze') return `${dir} 🔵 Zmrzni — NESMÍŠ swipnout!`;
    return `${dir} útok!`;
  }

  function resetTimerRing() {
    const circle = document.querySelector('.timer-circle');
    if (!circle) return null;
    // Vytvořit zbrusu nový circle — DOM výměna je jediný spolehlivý reset CSS animace
    const parent = circle.parentNode;
    if (!parent) return null;
    const fresh = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    for (let i = 0; i < circle.attributes.length; i++) {
      const attr = circle.attributes[i];
      fresh.setAttribute(attr.name, attr.value);
    }
    fresh.style.opacity = '0';
    fresh.style.animation = 'none';
    fresh.style.strokeDashoffset = '691';
    fresh.classList.add('timer-circle');
    parent.replaceChild(fresh, circle);
    // Vynutit reflow na novém elementu
    void fresh.offsetHeight;
    return fresh;
  }

  function startTimerRing(circle, durationMs) {
    if (!circle) return;
    circle.style.opacity = '1';
    circle.style.animation = `timer-ring-shrink ${durationMs}ms linear forwards`;
  }
  function restartTimerRing(circle, durationMs) {
    if (!circle) return;
    circle.style.animation = 'none';
    void circle.offsetWidth; // reflow
    circle.style.animation = `timer-ring-shrink ${durationMs}ms linear forwards`;
  }

  function mapBattleTurn() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;

    if (mb.playerHp <= 0) { endMapBattle(false); return; }

    mb.turn++;
    updateMapBattleUI();

    // RPG baseDmg
    const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
    const eqAttrs = getEquipAttrs();
    mb.baseDmg = 10 + Math.floor(state.hero.level * 3) + weapon.baseDmg + ((state.hero.attrStr||0) + eqAttrs.str) * 2;

    // Generovat sekvenci
    const chances = getDungeonAttackChances(mb.locId, mb.progress);
    // Zelená (heal) jen když chybí HP — jen pro dungeony co mají green
    if (chances.green > 0 && mb.playerHp >= mb.maxPlayerHp) {
      chances.green = 0;
      chances.grey += 10;
    }
    let seqLen = 10; // fixní délka sekvence pro všechny dungeony
    mb.sequence = [];
    let prevType = null;
    for (let i = 0; i < seqLen; i++) {
      const atk = generateAttack(chances, prevType, mb.locId, mb.progress);
      prevType = atk.type;
      mb.sequence.push(atk);
    }
    mb.sequenceIndex = 0;
    mb.inAttackWindow = false;
    mb.isAttacking = true;
    renderSeqProgress(mb);

    // Reset UI
    const arrow = $('mbArrow');
    if (arrow) arrow.setAttribute('class', 'boss-attack-arrow hidden');
    const actionInfo = $('mbActionInfo');
    if (actionInfo) { actionInfo.classList.add('hidden'); actionInfo.textContent = ''; }
    const playerEl = $('mbPlayerFigure');
    if (playerEl) playerEl.className = 'boss-fight-player';
    mb._sequenceTimer = null;
    updateActionButtons();

    // Začít první útok sekvence
    playSequenceAttack();
  }

  function renderSeqProgress(mb) {
    const el = $('mbSeqProgress');
    if (!el) return;
    el.innerHTML = '';
  }

  function flashSeqFail() {
    const el = $('mbSeqProgress');
    if (!el) return;
    const dots = el.querySelectorAll('.seq-dot');
    dots.forEach(d => d.classList.add('fail'));
    setTimeout(() => {
      dots.forEach(d => {
        d.classList.remove('done');
        d.classList.remove('fail');
      });
    }, 400);
  }

  function playSequenceAttack() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    if (mb.sequenceIndex >= mb.sequence.length) {
      // Sekvence hotová — další kolo
      setTimeout(() => mapBattleTurn(), 0);
      return;
    }
    if (mb.playerHp <= 0) { endMapBattle(false); return; }
    if (mb.bossHp <= 0) { endMapBattle(true); return; }

    const attack = mb.sequence[mb.sequenceIndex];

    mb.currentAttack = attack.dir;
    mb.isHeavyAttack = attack.type === 'yellow';
    mb.isInvertedAttack = attack.type === 'inverted';
    mb.isTwinAttack = attack.type === 'blue';
    mb.isRapidAttack = attack.type === 'rapid';
    mb.isGreenAttack = attack.type === 'green' || attack.type === 'truth' || attack.type === 'lie';
    mb.isRapidAttack = attack.type === 'rapid';
    if (attack.type === 'rapid') {
      mb.rapidTaps = 0;
      mb.rapidTarget = attack.rapidTarget || 10;
    } else {
      mb.rapidTaps = 0;
      mb.rapidTarget = 0;
    }
    mb._hitProcessed = false;

    const windowTime = attack.windowTime;
    mb._currentWindowTime = windowTime;
    if (mb.chillTicksLeft > 0) {
      mb._currentWindowTime = Math.round(windowTime * (1 + mb.chillPercent / 100));
    }

    // Reset kolečka
    const circle = resetTimerRing();

    // Zobrazit šipku
    const actionInfo = $('mbActionInfo');
    const arrow = $('mbArrow');
    if (attack.type === 'rapid') {
      applySchoolColors();
      if (arrow) arrow.setAttribute('class', 'boss-attack-arrow hidden');
      if (actionInfo) actionInfo.classList.add('hidden');
      const target = $('mbRapidTarget');
      if (target) {
        target.textContent = `${attack.rapidTarget}`;
        target.classList.remove('hidden');
      }
      const arena = $('mbArena');
      if (arena) arena.classList.add('rapid-active');
      const leftTap = $('mbTapLeft');
      const rightTap = $('mbTapRight');
      if (leftTap) leftTap.classList.remove('hidden');
      if (rightTap) rightTap.classList.remove('hidden');
    } else {
      if (actionInfo) actionInfo.classList.add('hidden');
      if (arrow) {
        arrow.setAttribute('class', 'boss-attack-arrow');
        arrow.setAttribute('viewBox', '-3 -3 22 22');
        arrow.style.color = ''; // reset barvy z předchozího útoku
        const rotation = { '⬆️': 0, '⬇️': 180, '⬅️': -90, '➡️': 90 }[attack.dir] || 0;
        arrow.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
        if (attack.type === 'yellow') {
          arrow.classList.add('boss-attack-yellow');
          arrow.innerHTML = '<g><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="none" stroke="#8a7a30" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" transform="translate(-3,0)"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" transform="translate(-3,0)"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="none" stroke="#8a7a30" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" transform="translate(3,0)"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" transform="translate(3,0)"/></g>';
        } else if (attack.type === 'blue') {
          arrow.style.transform = 'translate(-50%, -50%)';
          arrow.classList.add('boss-attack-blue');
          arrow.setAttribute('viewBox', '-3 -5 22 26');
          if (attack.dir === '⬆️') {
            arrow.innerHTML = '<g transform="translate(-2.5,0)"><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="none" stroke="#3a5a7a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g><g transform="translate(2.5,0)"><path d="M8 15L3 8L5.5 8L5.5 1L10.5 1L10.5 8L13 8L8 15Z" fill="none" stroke="#3a5a7a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M8 15L3 8L5.5 8L5.5 1L10.5 1L10.5 8L13 8L8 15Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g>';
          } else {
            arrow.innerHTML = '<g transform="translate(0,-2.5)"><path d="M1 8L8 3L8 5.5L15 5.5L15 10.5L8 10.5L8 13L1 8Z" fill="none" stroke="#3a5a7a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M1 8L8 3L8 5.5L15 5.5L15 10.5L8 10.5L8 13L1 8Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g><g transform="translate(0,2.5)"><path d="M15 8L8 13L8 10.5L1 10.5L1 5.5L8 5.5L8 3L15 8Z" fill="none" stroke="#3a5a7a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M15 8L8 13L8 10.5L1 10.5L1 5.5L8 5.5L8 3L15 8Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g>';
          }
        } else if (attack.type === 'green') {
          arrow.classList.add('boss-attack-green');
          arrow.innerHTML = '<path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="none" stroke="#3a7a5a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>';
        } else if (attack.type === 'truth') {
          arrow.classList.add('boss-attack-green');
          arrow.innerHTML = '<path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="none" stroke="#3a7a5a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>';
        } else if (attack.type === 'lie') {
          arrow.classList.remove('boss-attack-green');
          arrow.style.color = '#e94560';
          arrow.style.fill = '#e94560';
          arrow.innerHTML = '<path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="none" stroke="#b01a30" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="#e94560" stroke="#e94560" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>';
        } else if (attack.type === 'freeze') {
          arrow.classList.remove('boss-attack-green');
          arrow.style.color = '#4a7dff';
          arrow.style.fill = '#4a7dff';
          arrow.innerHTML = '<path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="none" stroke="#1a4ab0" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="#4a7dff" stroke="#4a7dff" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>';
        } else {
          arrow.innerHTML = '<path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="none" stroke="#888" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>';
          if (attack.type === 'inverted') arrow.classList.add('boss-attack-green');
        }
      }
    }

    updateActionButtons();

    // Timer ring — CSS animace (stabilní, žádné měnění během timeru)
    if (mb.dotTicksLeft > 0) circle.style.stroke = '#4caf50';
    else if (mb.chillTicksLeft > 0) circle.style.stroke = '#4fc3f7';
    else circle.style.stroke = '#888';
    
    // 🎯 Fixní výseč — začíná v 50% timeru (6 hodin), 20% šířka
    let winTime = mb._currentWindowTime;
    
    // D2 (Poušť) — náhodná rychlost na začátku každého útoku, jen červená/modrá
    if (mb.locId === 1) {
      const progress = mb.progress;
      const minSpeed = Math.max(0.3, 0.75 - progress * 0.05);
      const maxSpeed = Math.min(1.6, 1.35 + progress * 0.025);
      const isFast = Math.random() < 0.5;
      const speed = isFast ? maxSpeed : minSpeed;
      winTime = Math.round(winTime / speed);
      circle.style.stroke = isFast ? '#e94560' : '#4a7dff';
    }
    
    // D4 (Pekelné výspy) — přehřívání + červená/modrá jako D2
    if (mb.locId === 3) {
      const progress = mb.progress;
      const minSpeed = Math.max(0.3, 0.75 - progress * 0.05);
      const maxSpeed = Math.min(1.6, 1.35 + progress * 0.025);
      const isFast = Math.random() < 0.5;
      const speed = isFast ? maxSpeed : minSpeed;
      let baseWinTime = Math.round(winTime / speed);
      // Heat overlay
      const heatMult = 1 + mb._heatLevel * 0.08;
      winTime = Math.round(baseWinTime / heatMult);
      // Barva: základ červená/modrá, s heatem se posouvá
      if (mb._heatLevel > 0) {
        const heatPct = Math.min(mb._heatLevel / 10, 1);
        let r, g, b;
        if (isFast) {
          // Červená → oranžová → žlutá
          r = 233;
          g = Math.round(69 + heatPct * (200 - 69));
          b = Math.round(96 - heatPct * 96);
        } else {
          // Modrá → fialová
          r = Math.round(74 + heatPct * (200 - 74));
          g = Math.round(127 - heatPct * 60);
          b = Math.round(255 - heatPct * 60);
        }
        circle.style.stroke = `rgb(${r},${g},${b})`;
      } else {
        circle.style.stroke = isFast ? '#e94560' : '#4a7dff';
      }
    }
    
    // D5 (Mrazivé štíty) — přehřívání + červená/modrá + timer freeze
    if (mb.locId === 4) {
      const progress = mb.progress;
      const minSpeed = Math.max(0.3, 0.75 - progress * 0.05);
      const maxSpeed = Math.min(1.6, 1.35 + progress * 0.025);
      const isFast = Math.random() < 0.5;
      const speed = isFast ? maxSpeed : minSpeed;
      let baseWinTime = Math.round(winTime / speed);
      // Heat overlay
      const heatMult = 1 + mb._heatLevel * 0.08;
      winTime = Math.round(baseWinTime / heatMult);
      // Barva: základ červená/modrá, s heatem se posouvá
      if (mb._heatLevel > 0) {
        const heatPct = Math.min(mb._heatLevel / 10, 1);
        let r, g, b;
        if (isFast) {
          r = 233;
          g = Math.round(69 + heatPct * (200 - 69));
          b = Math.round(96 - heatPct * 96);
        } else {
          r = Math.round(74 + heatPct * (200 - 74));
          g = Math.round(127 - heatPct * 60);
          b = Math.round(255 - heatPct * 60);
        }
        circle.style.stroke = `rgb(${r},${g},${b})`;
      } else {
        circle.style.stroke = isFast ? '#e94560' : '#4a7dff';
      }
      // Generovat freeze intervaly — 0-2 náhodné freeze, 500-1500ms
      const freezeCount = Math.random() < 0.5 ? 1 : (Math.random() < 0.3 ? 2 : 0);
      mb._freezeIntervals = [];
      mb._totalFrozenMs = 0;
      mb._freezeUntil = null;
      for (let fi = 0; fi < freezeCount; fi++) {
        const minStart = 500;
        const maxStart = Math.max(minStart + 100, winTime - 500);
        const startMs = minStart + Math.random() * (maxStart - minStart);
        const duration = 500 + Math.random() * 1000; // 500-1500ms
        mb._freezeIntervals.push({ startMs, duration });
      }
    }
    
    const bStartMs = Math.round(winTime * 0.5); // výseč začíná v 50% timeru (6 hodin)
    const bMs = Math.round(winTime * 0.15); // 15% šířka
    mb._bonusStartMs = bStartMs;
    mb._bonusMs = bMs;
    
    // Vizuální znázornění výseče na kolečku
    const bCircum = 741;
    const zWidthPx = Math.max(1, Math.round((bMs / winTime) * 741));
    const zStartPx = Math.round((bStartMs / winTime) * 741);
    const bonusCircle = document.querySelector('.bonus-zone-circle');
    if (bonusCircle) {
      const remaining = Math.max(0, 741 - zStartPx - zWidthPx);
      bonusCircle.style.strokeDasharray = `0 ${zStartPx} ${zWidthPx} ${remaining}`;
      bonusCircle.style.strokeDashoffset = '0';
    }
    mb._zoneWidthPx = zWidthPx;
    mb._zoneStartPx = zStartPx;
    mb._bonusCircum = 741;
    
    if (mb._bonusRaf) cancelAnimationFrame(mb._bonusRaf);
    const attackStartTime = performance.now();
    let _lastEffectiveElapsed = 0; // D5: poslední effectiveElapsed před freeze
    let _savedStrokeColor = null; // D5: původní barva kruhu před freeze
    (function frame() {
      if (mapBattleState.ended) return;
      const now = performance.now();
      const rawElapsed = now - attackStartTime;
      
      // D5 timer freeze — zkontrolovat jestli jsme v freeze intervalu
      let isFrozen = false;
      if (mb.locId === 4 && mb._freezeIntervals && mb._freezeIntervals.length > 0) {
        for (let fi = 0; fi < mb._freezeIntervals.length; fi++) {
          const fz = mb._freezeIntervals[fi];
          if (rawElapsed >= fz.startMs && rawElapsed < fz.startMs + fz.duration) {
            isFrozen = true;
            mb._freezeUntil = fz.startMs + fz.duration;
            break;
          }
        }
        if (!isFrozen) {
          mb._freezeUntil = null;
        }
      }
      
      // Spočítat celkový freeze čas (jen dokončené intervaly)
      let totalFrozen = 0;
      if (mb.locId === 4 && mb._freezeIntervals) {
        for (let fi = 0; fi < mb._freezeIntervals.length; fi++) {
          const fz = mb._freezeIntervals[fi];
          if (rawElapsed >= fz.startMs + fz.duration) {
            totalFrozen += fz.duration;
          } else if (rawElapsed > fz.startMs) {
            totalFrozen += rawElapsed - fz.startMs;
          }
        }
      }
      
      let effectiveElapsed;
      if (isFrozen) {
        // Během freeze — effectiveElapsed stojí na poslední hodnotě
        effectiveElapsed = _lastEffectiveElapsed;
      } else {
        // Mimo freeze — effectiveElapsed = rawElapsed - celkový freeze čas
        effectiveElapsed = rawElapsed - totalFrozen;
        _lastEffectiveElapsed = effectiveElapsed;
      }
      
      const pct = Math.min(effectiveElapsed / winTime, 1);
      mb._bonusActive = (effectiveElapsed >= mb._bonusStartMs && effectiveElapsed < mb._bonusStartMs + mb._bonusMs);
      if (circle) {
        circle.style.opacity = '1';
        if (isFrozen) {
          // Během freeze — kolečko stojí, modrá barva
          if (_savedStrokeColor === null) _savedStrokeColor = circle.style.stroke;
          circle.style.stroke = '#4fc3f7';
        } else {
          // Po freeze — obnovit původní barvu
          if (_savedStrokeColor !== null) {
            circle.style.stroke = _savedStrokeColor;
            _savedStrokeColor = null;
          }
          circle.style.strokeDashoffset = Math.round(691 * (1 - pct));
        }
      }
      if (effectiveElapsed < winTime) {
        mb._bonusRaf = requestAnimationFrame(frame);
      } else {
        mb._bonusActive = false;
        mb._bonusRaf = null;
      }
    })();

    // Timeout = chyba (nestihl zareagovat), kromě freeze — tam je timeout = úspěch
    // Pro D5: winTime + celkový freeze čas
    let timeoutWinTime = winTime;
    if (mb.locId === 4 && mb._freezeIntervals) {
      let totalFrozen = 0;
      mb._freezeIntervals.forEach(fz => totalFrozen += fz.duration);
      timeoutWinTime = winTime + totalFrozen;
    }
    mb._sequenceTimer = setTimeout(() => {
      if (mapBattleState.ended) return;
      if (attack.type === 'freeze') {
        // Freeze: neudělat nic = správně
        // D4 — ochlazení: úspěšná freeze snižuje heat
        if (mb.locId === 3 && mb._heatLevel > 0) {
          mb._heatLevel = Math.max(0, mb._heatLevel - 1);
        }
        // D5 — ochlazení: úspěšná freeze snižuje heat
        if (mb.locId === 4 && mb._heatLevel > 0) {
          mb._heatLevel = Math.max(0, mb._heatLevel - 1);
        }
        advanceSequence();
      } else {
        onMapHit();
      }
    }, timeoutWinTime);
  }

  // DoT tick helper — volá se po každém timeru (ať už hráč uspěl, nebo dostal ránu)
  function doDotTick(mb) {
    if (mb.dot <= 0 || mb.dotTicksLeft <= 0) return false;
    mb.bossHp -= mb.dot;
    mb.dotTicksLeft--;
    // (hint necháme pro bonus info)
    const dotDmgText = $('mbDamageText');
    if (dotDmgText) {
      dotDmgText.textContent = `☠️ -${mb.dot}`;
      dotDmgText.classList.remove('hidden');
      setTimeout(() => dotDmgText.classList.add('hidden'), 800);
    }
    const bossFig = $('mbFigure');
    if (bossFig) {
      bossFig.style.transition = 'filter 0.2s';
      bossFig.style.filter = 'brightness(2.5) hue-rotate(90deg) saturate(2)';
      setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 300);
    }
    updateMapBattleUI();
    if (mb.bossHp <= 0 && mb.isBoss) { setTimeout(() => { if (!mapBattleState.ended) endMapBattle(true); }, 250); return true; }
    return false;
  }

  // Player DoT tick — jed z monster, tickuje 1×/s
  let _lastPlayerDotTick = 0;
  function doPlayerDotTick(mb) {
    if (mb.playerDot <= 0 || mb.playerDotTicksLeft <= 0) return false;
    const now = performance.now();
    if (now - _lastPlayerDotTick < 1000) return false;
    _lastPlayerDotTick = now;
    mb.playerHp -= mb.playerDot;
    mb.playerDotTicksLeft--;
    // Vizuální debuff necháme vypršet přirozeně přes tickBuffs
    const playerFig = $('mbPlayerFigure');
    if (playerFig) {
      playerFig.style.transition = 'filter 0.2s';
      playerFig.style.filter = 'brightness(2.5) hue-rotate(270deg) saturate(2)';
      setTimeout(() => { playerFig.style.filter = 'brightness(1)'; setTimeout(() => { playerFig.style.transition = ''; }, 200); }, 300);
    }
    const dotDmgText = $('mbPlayerDamageText');
    if (dotDmgText) {
      dotDmgText.textContent = `☠️ -${mb.playerDot}`;
      dotDmgText.classList.remove('hidden');
      setTimeout(() => dotDmgText.classList.add('hidden'), 800);
    }
    updateMapBattleUI();
    if (mb.playerHp <= 0) { endMapBattle(false); return true; }
    return false;
  }

  function advanceSequence() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;

    // DoT tick — každý timer = jeden tick
    if (doDotTick(mb)) return;
    // Player DoT tick — jed z monster
    if (doPlayerDotTick(mb)) return;

    // HoT tick — léčení každý tick
    if (mb.hotTicksLeft > 0) {
      mb.playerHp = Math.min(mb.maxPlayerHp, mb.playerHp + mb.hot);
      mb.hotTicksLeft--;
    }
    // Pasivní regenerace (prozatím vypnuto — staré school passives smazány)
    // Mana regen
    const h = state.hero;
    const eqAttrs = getEquipAttrs();
    const manaRegen = 1 + ((h.attrInt || 0) + eqAttrs.int) * 2;
    h.mana = Math.min(h.maxMana, (h.mana || 0) + manaRegen);
    const am = $('mbPlayerArenaMana');
    if (am) {
      const span = am.querySelector('span');
      if (span) span.textContent = `${h.mana}/${h.maxMana}`;
      const fill = $('mbPlayerArenaManaFill');
      if (fill) fill.style.width = Math.max(0, Math.round((h.mana / h.maxMana) * 100)) + '%';
    }

    // Chill tick
    if (mb.chillTicksLeft > 0) mb.chillTicksLeft--;
    if (mb.chillTicksLeft <= 0 && mb._activeSpellChillActive) mb._activeSpellChillActive = false;

    clearTimeout(mb._ringTimer);
    mb._ringTimer = null;
    mb._hitProcessed = true;
    // Skrýt bonusový kruh
    const bc2 = document.querySelector('.bonus-zone-circle');
    if (bc2) bc2.style.strokeDasharray = '0 741';
    mb.currentAttack = null;
    mb.isHeavyAttack = false;
    mb.isInvertedAttack = false;
    mb.isTwinAttack = false;
    mb.isRapidAttack = false;
    mb.isGreenAttack = false;
    mb.rapidTaps = 0;
    mb.rapidTarget = 0;
    mb._heavySwipes = 0;
    mb._twinSwipes = [];

    const arrow = $('mbArrow');
    if (arrow) arrow.setAttribute('class', 'boss-attack-arrow hidden');
    const actionInfo = $('mbActionInfo');
    if (actionInfo) actionInfo.classList.add('hidden');
    const rTarget = $('mbRapidTarget');
    if (rTarget) rTarget.classList.add('hidden');
    const lTap = $('mbTapLeft');
    const rTap = $('mbTapRight');
    if (lTap) lTap.classList.add('hidden');
    if (rTap) rTap.classList.add('hidden');
    const arena = $('mbArena');
    if (arena) arena.classList.remove('rapid-active');

    mb.sequenceIndex++;
    renderSeqProgress(mb);

    if (mb.playerHp <= 0) { endMapBattle(false); return; }
    if (mb.bossHp <= 0) { endMapBattle(true); return; }

    // Sekvence hotová — nové kolo
    if (mb.sequenceIndex >= mb.sequence.length) {
      setTimeout(() => mapBattleTurn(), 0);
      return;
    }

    resetTimerRing();
    setTimeout(() => playSequenceAttack(), 150);
  }

  function openAttackWindow() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    mb.inAttackWindow = true;
    mb.isAttacking = false;

    // Zobrazit ⚔️ info ikonu v kolečku (vždy meč, ne ikona školy)
    const actionInfo = $('mbActionInfo');
    if (actionInfo) {
      actionInfo.textContent = '⚔️';
      actionInfo.classList.remove('hidden');
    }
    updateActionButtons();
    mb._attackProcessed = false;
    renderSeqProgress(mb);
    // Prekreslit spell UI (zobrazi Fireball/Heal v attack okne)
    updateMapBattleUI(); // zobrazi spell buttony
    // Clear hint from previous round
        $('mbArrow').setAttribute('class', 'boss-attack-arrow hidden');

    // Timer ring — 1.5× delší než úhyby (podle patra)
    const mb2 = mapBattleState;
    const floorMult = getFloorTimerMultiplier(mb2.floor, mb2.locId);
    const atkTime = Math.round(Math.max(400, 1000 * floorMult * 1.25));
    const atkCircle = resetTimerRing();
    
    // Attack window — žádná výseč, hráč může udeřit kdykoliv
    mb._bonusStartMs = null;
    mb._bonusMs = 0;
    
    // Skrýt bonusový kruh
    const bonusCircle = document.querySelector('.bonus-zone-circle');
    if (bonusCircle) bonusCircle.style.strokeDasharray = '0 741';
    
    mb._atkTime = atkTime;
    
    requestAnimationFrame(() => {
      if (atkCircle) {
        atkCircle.style.opacity = '1';
        atkCircle.style.strokeDashoffset = '691';
      }
      startTimerRing(atkCircle, atkTime);
    });

    mb._attackWindowTimer = setTimeout(() => {
      if (mapBattleState.ended) return;
      flashSeqFail();
      missedAttackWindow();
    }, atkTime);
  }

  function missedAttackWindow() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    // Skrýt bonusový kruh
    const bCircle = document.querySelector('.bonus-zone-circle');
    if (bCircle) bCircle.style.strokeDasharray = '0 741';
    // GUARD: už bylo zpracováno
    if (!mb.inAttackWindow) return;
    mb.mistakes = (mb.mistakes || 0) + 1;
    clearTimeout(mb._attackWindowTimer);
    mb._attackWindowTimer = null;
    clearTimeout(mb._ringTimer);
    mb._ringTimer = null;
    mb.inAttackWindow = false;
    const actInfo2 = $('mbActionInfo');
    if (actInfo2) actInfo2.classList.add('hidden');
    updateActionButtons();
    resetTimerRing();
    // Počkat na vykreslení resetu před novým kolem, aby hned nezačala animace z 0
    requestAnimationFrame(() => {
      setTimeout(() => mapBattleTurn(), 0);
    });
  }

  function doArenaGlow(dir, correct) {
    const arena = $('mbArena');
    if (!arena) return;

    // Efekt úhybu: oblak/částice fouknuté směrem od středu
    if (correct) {
      spawnDodgeEffect(arena, dir);
    }
  }

  function getSchoolColors(targetIsPlayer) {
    if (targetIsPlayer) return { c1:'#e94560', c2:'#c0392b', rgb:'233,69,96' };
    const a = state.activeSchool;
    const hasPassive = a && getTierPoints(a, 0) > 0;
    if (hasPassive && a === 'fire') return { c1:'#f39c12', c2:'#e67e22', rgb:'230,126,34' };
    if (hasPassive && a === 'ice') return { c1:'#5dade2', c2:'#3498db', rgb:'52,152,219' };
    if (hasPassive && a === 'nature') return { c1:'#58d68d', c2:'#2ecc71', rgb:'46,204,113' };
    if (hasPassive && a === 'physical') return { c1:'#b0b0c8', c2:'#8888aa', rgb:'180,180,200' };
    return { c1:'#bbb', c2:'#aaa', rgb:'187,187,187' };
  }

  function spawnProjectileEffect(dir, targetIsPlayer, isCrit, attackType) {
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const aRect = arena.getBoundingClientRect();

    // Start: od hráče (dole) nebo od bosse (nahoře)
    let startEl = targetIsPlayer ? $('mbFigure') : $('mbPlayerFigure');
    let startX = cx, startY = targetIsPlayer ? 0 : rect.height;
    if (startEl) {
      const sRect = startEl.getBoundingClientRect();
      startX = sRect.left + sRect.width/2 - aRect.left;
      startY = sRect.top + sRect.height/2 - aRect.top;
    }

    // Cíl: pozice bosse (nahoře) nebo hráče (dole)
    let endX = cx, endY;
    let endEl = targetIsPlayer ? $('mbPlayerFigure') : $('mbFigure');
    if (endEl) {
      const eRect = endEl.getBoundingClientRect();
      endX = eRect.left + eRect.width/2 - aRect.left;
      endY = eRect.top + eRect.height/2 - aRect.top;
    } else {
      endX = cx;
      endY = targetIsPlayer ? rect.height + 20 : -20;
    }

    const schoolColor = getSchoolColors(targetIsPlayer);
    const color1 = schoolColor.c1;
    const color2 = schoolColor.c2;
    const rgb = schoolColor.rgb;

    const size = isCrit ? 32 : 22;
    const half = size / 2;
    const proj = document.createElement('div');
    // Caster projektil (magický) vs melee (fyzický)
    if (targetIsPlayer && attackType === ATTACK_TYPES.CASTER) {
      // Magická koule — fialová/modrá záře
      proj.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle,#a855f7,#6366f1);box-shadow:0 0 ${isCrit ? 20:10}px rgba(168,85,247,${isCrit ? 1:0.8});z-index:20;pointer-events:none;`;
    } else {
      proj.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle,${color1},${color2});box-shadow:0 0 ${isCrit ? 20:10}px rgba(${rgb},${isCrit ? 1:0.8});z-index:20;pointer-events:none;`;
    }
    proj.style.left = (startX - half) + 'px';
    proj.style.top = (startY - half) + 'px';
    arena.appendChild(proj);

    // Force reflow — prohlížeč si zapamatuje počáteční pozici
    void proj.offsetHeight;

    proj.style.transition = `left 0.2s ease-out, top 0.2s ease-out`;
    proj.style.left = (endX - half) + 'px';
    proj.style.top = (endY - half) + 'px';

    // Po dopadu: mlha + částice
    setTimeout(() => {
      if (proj.parentNode) proj.remove();
      spawnImpactParticles(arena, endX, endY, rgb, isCrit);
      const pCount = isCrit ? 12 : 5;
      const pDist = isCrit ? 40 : 30;
      const pMaxSize = isCrit ? 10 : 5;
      for (let i = 0; i < pCount; i++) {
        const p = document.createElement('div');
        const size2 = 3 + Math.random() * pMaxSize;
        const angle = Math.random() * 2 * Math.PI;
        const dist = 15 + Math.random() * pDist;
        p.style.cssText = `position:absolute;width:${size2}px;height:${size2}px;border-radius:50%;background:${[color2,color1,'rgba(255,255,255,0.6)'][i%3]};z-index:21;pointer-events:none;opacity:1;`;
        p.style.left = (endX - size2/2) + 'px';
        p.style.top = (endY - size2/2) + 'px';
        arena.appendChild(p);
        requestAnimationFrame(() => {
          p.style.transition = `left 0.3s ease-out, top 0.3s ease-out, opacity 0.3s ease-out`;
          p.style.left = (endX + Math.cos(angle) * dist - size2/2) + 'px';
          p.style.top = (endY + Math.sin(angle) * dist - size2/2) + 'px';
          p.style.opacity = '0';
        });
        setTimeout(() => { if (p.parentNode) p.remove(); }, 350);
      }
    }, 200);
  }

  function spawnImpactParticles(arena, x, y, rgbStr, isCrit) {
    // Mlha při nárazu — rozmazané kroužky rozlétající se všemi směry
    const color = `rgba(${rgbStr},0.35)`;
    const count = isCrit ? 14 : 8;
    const maxSize = isCrit ? 18 : 12;
    const maxDist = isCrit ? 50 : 30;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      const size = 5 + Math.random() * maxSize;
      const angle = Math.random() * 2 * Math.PI;
      const dist = 15 + Math.random() * maxDist;
      p.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${color};filter:blur(${isCrit ? 2.5 : 1.5}px);z-index:19;pointer-events:none;opacity:${isCrit ? 0.8 : 0.6};`;
      p.style.left = (x - size/2) + 'px';
      p.style.top = (y - size/2) + 'px';
      arena.appendChild(p);
      requestAnimationFrame(() => {
        p.style.transition = `left ${isCrit ? 0.35 : 0.3}s ease-out, top ${isCrit ? 0.35 : 0.3}s ease-out, opacity ${isCrit ? 0.35 : 0.3}s ease-out`;
        p.style.left = (x + Math.cos(angle) * dist - size/2) + 'px';
        p.style.top = (y + Math.sin(angle) * dist - size/2) + 'px';
        p.style.opacity = '0';
      });
      setTimeout(() => { if (p.parentNode) p.remove(); }, 400);
    }
  }

  // ===== SPELL VISUAL HELPERS =====
  function displayDamageText(text) {
    const arena = $('mbArena');
    if (!arena) return;
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;top:35%;left:50%;transform:translate(-50%,-50%);z-index:25;font-size:36px;font-weight:bold;color:#f1c40f;text-shadow:0 0 10px rgba(241,196,15,0.8);pointer-events:none;animation:fadeDown 0.6s ease-out';
    el.textContent = text;
    arena.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }
  function displayHealText(text) {
    const arena = $('mbArena');
    if (!arena) return;
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;bottom:30%;left:50%;transform:translate(-50%,-50%);z-index:25;font-size:32px;font-weight:bold;color:#2ecc71;text-shadow:0 0 10px rgba(46,204,113,0.8);pointer-events:none;animation:fadeDown 0.7s ease-out;animation-direction:reverse';
    el.textContent = text;
    arena.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }
  function spawnHealParticles() {
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height - 80;
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('div');
      const size = 6 + Math.random() * 8;
      const angle = Math.random() * 2 * Math.PI;
      const dist = 30 + Math.random() * 50;
      p.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:rgba(46,204,113,0.5);filter:blur(1.5px);z-index:18;pointer-events:none;opacity:0.8;`;
      p.style.left = (cx - size/2) + 'px';
      p.style.top = (cy - size/2) + 'px';
      arena.appendChild(p);
      requestAnimationFrame(() => {
        p.style.transition = `left 0.5s ease-out, top 0.5s ease-out, opacity 0.5s ease-out`;
        p.style.left = (cx + Math.cos(angle) * dist - size/2) + 'px';
        p.style.top = (cy + Math.sin(angle) * dist - size/2) + 'px';
        p.style.opacity = '0';
      });
      setTimeout(() => { if (p.parentNode) p.remove(); }, 600);
    }
  }
  function spawnFreezeParticles() {
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 4;
    for (let i = 0; i < 15; i++) {
      const p = document.createElement('div');
      const size = 3 + Math.random() * 6;
      const angle = Math.random() * 2 * Math.PI;
      const dist = 20 + Math.random() * 60;
      p.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:rgba(100,180,255,0.6);filter:blur(1px);z-index:18;pointer-events:none;opacity:0.9;`;
      p.style.left = (cx - size/2) + 'px';
      p.style.top = (cy - size/2) + 'px';
      arena.appendChild(p);
      requestAnimationFrame(() => {
        p.style.transition = `left 0.6s ease-out, top 0.6s ease-out, opacity 0.6s ease-out`;
        p.style.left = (cx + Math.cos(angle) * dist - size/2) + 'px';
        p.style.top = (cy + Math.sin(angle) * dist - size/2) + 'px';
        p.style.opacity = '0';
      });
      setTimeout(() => { if (p.parentNode) p.remove(); }, 700);
    }
  }

  function spawnSlashEffect(isCrit, dir) {
    const arena = $('mbArena');
    if (!arena) return;
    const aRect = arena.getBoundingClientRect();
    const boss = $('mbFigure');
    let cx = aRect.width / 2, cy = 30;
    if (boss) {
      const bRect = boss.getBoundingClientRect();
      cx = bRect.left + bRect.width / 2 - aRect.left;
      cy = bRect.top + bRect.height / 2 - aRect.top;
    }
    // Rotace podle směru swipu
    let rotation = 0;
    if (dir === '⬆️') rotation = 0;
    else if (dir === '⬇️') rotation = 180;
    else if (dir === '⬅️') rotation = -90;
    else if (dir === '➡️') rotation = 90;
    if (isCrit) {
      // Dvojitý kříž (X) — červený, s rotací podle směru
      const size = 200;
      const slash = document.createElement('div');
      slash.style.cssText = `position:absolute;left:${cx-size/2}px;top:${cy-size/2}px;width:${size}px;height:${size}px;z-index:25;pointer-events:none;opacity:1;transform:rotate(${rotation}deg);`;
      slash.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">
        <path d="M 30 ${size-30} Q ${size/2} ${size/2} ${size-30} 30" stroke="#e74c3c" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.95">
          <animate attributeName="stroke-dashoffset" from="250" to="0" dur="0.1s" fill="freeze"/>
          <animate attributeName="opacity" from="1" to="0" dur="0.35s" begin="0.1s" fill="freeze"/>
        </path>
        <path d="M ${size-30} ${size-30} Q ${size/2} ${size/2} 30 30" stroke="#e74c3c" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.95">
          <animate attributeName="stroke-dashoffset" from="250" to="0" dur="0.1s" begin="0.04s" fill="freeze"/>
          <animate attributeName="opacity" from="1" to="0" dur="0.35s" begin="0.14s" fill="freeze"/>
        </path>
        <path d="M 30 ${size-30} Q ${size/2} ${size/2} ${size-30} 30" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.7">
          <animate attributeName="stroke-dashoffset" from="250" to="0" dur="0.08s" fill="freeze"/>
          <animate attributeName="opacity" from="0.7" to="0" dur="0.3s" begin="0.08s" fill="freeze"/>
        </path>
        <path d="M ${size-30} ${size-30} Q ${size/2} ${size/2} 30 30" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.7">
          <animate attributeName="stroke-dashoffset" from="250" to="0" dur="0.08s" begin="0.04s" fill="freeze"/>
          <animate attributeName="opacity" from="0.7" to="0" dur="0.3s" begin="0.12s" fill="freeze"/>
        </path>
      </svg>`;
      arena.appendChild(slash);
      requestAnimationFrame(() => { slash.style.opacity = '1'; });
      setTimeout(() => { if (slash.parentNode) slash.remove(); }, 450);
    } else {
      const sc = getSchoolColors(false);
      // Oblouček s rotací podle směru swipu — méně zahnutý, tenčí
      const size = 160;
      const slash = document.createElement('div');
      slash.style.cssText = `position:absolute;left:${cx-size/2}px;top:${cy-size/2}px;width:${size}px;height:${size}px;z-index:20;pointer-events:none;opacity:1;transform:rotate(${rotation}deg);`;
      slash.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">
        <path d="M 20 ${size-20} Q ${size/2} 40 ${size-20} 20" stroke="${sc.c1}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.9">
          <animate attributeName="stroke-dashoffset" from="200" to="0" dur="0.12s" fill="freeze"/>
          <animate attributeName="opacity" from="1" to="0" dur="0.3s" begin="0.12s" fill="freeze"/>
        </path>
        <path d="M 20 ${size-20} Q ${size/2} 40 ${size-20} 20" stroke="white" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6">
          <animate attributeName="stroke-dashoffset" from="200" to="0" dur="0.1s" fill="freeze"/>
          <animate attributeName="opacity" from="0.6" to="0" dur="0.25s" begin="0.1s" fill="freeze"/>
        </path>
      </svg>`;
      arena.appendChild(slash);
      requestAnimationFrame(() => { slash.style.opacity = '1'; });
      setTimeout(() => { if (slash.parentNode) slash.remove(); }, 400);
    }
  }

  function spawnFistEffect(isCrit) {
    const arena = $('mbArena');
    if (!arena) return;
    const aRect = arena.getBoundingClientRect();
    const boss = $('mbFigure');
    let cx = aRect.width / 2, cy = 30;
    if (boss) {
      const bRect = boss.getBoundingClientRect();
      cx = bRect.left + bRect.width / 2 - aRect.left;
      cy = bRect.top + bRect.height / 2 - aRect.top;
    }
    if (isCrit) {
      // Dvě soustředné kruhové rány — shockwave
      const size = 120;
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;left:${cx-size/2}px;top:${cy-size/2}px;width:${size}px;height:${size}px;z-index:25;pointer-events:none;opacity:1;`;
      el.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">
        <circle cx="${size/2}" cy="${size/2}" r="10" fill="none" stroke="#e74c3c" stroke-width="6" stroke-linecap="round" opacity="0.9">
          <animate attributeName="r" from="10" to="${size/2-4}" dur="0.2s" fill="freeze"/>
          <animate attributeName="opacity" from="0.9" to="0" dur="0.3s" fill="freeze"/>
        </circle>
        <circle cx="${size/2}" cy="${size/2}" r="10" fill="none" stroke="#ff6b6b" stroke-width="4" stroke-linecap="round" opacity="0.7">
          <animate attributeName="r" from="10" to="${size/2-4}" dur="0.2s" begin="0.05s" fill="freeze"/>
          <animate attributeName="opacity" from="0.7" to="0" dur="0.3s" begin="0.05s" fill="freeze"/>
        </circle>
        <circle cx="${size/2}" cy="${size/2}" r="10" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.5">
          <animate attributeName="r" from="10" to="${size/2-4}" dur="0.2s" begin="0.1s" fill="freeze"/>
          <animate attributeName="opacity" from="0.5" to="0" dur="0.3s" begin="0.1s" fill="freeze"/>
        </circle>
      </svg>`;
      arena.appendChild(el);
      requestAnimationFrame(() => { el.style.opacity = '1'; });
      setTimeout(() => { if (el.parentNode) el.remove(); }, 400);
    } else {
      // Jednoduchá kruhová rána — opacity hned, ne přes rAF (SVG animate běží okamžitě)
      const size = 80;
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;left:${cx-size/2}px;top:${cy-size/2}px;width:${size}px;height:${size}px;z-index:20;pointer-events:none;opacity:1;`;
      el.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">
        <circle cx="${size/2}" cy="${size/2}" r="8" fill="none" stroke="#e74c3c" stroke-width="5" stroke-linecap="round" opacity="0.85">
          <animate attributeName="r" from="8" to="${size/2-4}" dur="0.15s" fill="freeze"/>
          <animate attributeName="opacity" from="0.85" to="0" dur="0.25s" begin="0.15s" fill="freeze"/>
        </circle>
        <circle cx="${size/2}" cy="${size/2}" r="8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.5">
          <animate attributeName="r" from="8" to="${size/2-4}" dur="0.15s" begin="0.05s" fill="freeze"/>
          <animate attributeName="opacity" from="0.5" to="0" dur="0.25s" begin="0.2s" fill="freeze"/>
        </circle>
      </svg>`;
      arena.appendChild(el);
      requestAnimationFrame(() => { el.style.opacity = '1'; });
      setTimeout(() => { if (el.parentNode) el.remove(); }, 350);
    }
  }

  function spawnCrossSlashEffect() {
    const arena = $('mbArena');
    if (!arena) return;
    const aRect = arena.getBoundingClientRect();
    const boss = $('mbFigure');
    let cx = aRect.width / 2, cy = 30;
    if (boss) {
      const bRect = boss.getBoundingClientRect();
      cx = bRect.left + bRect.width / 2 - aRect.left;
      cy = bRect.top + bRect.height / 2 - aRect.top;
    }
    const sc = getSchoolColors(false);
    const size = 80;
    // První sek — z leva dolů doprava nahoru
    const s1 = document.createElement('div');
    s1.style.cssText = `position:absolute;left:${cx-size/2}px;top:${cy-size/2}px;width:${size}px;height:${size}px;z-index:20;pointer-events:none;opacity:1;`;
    s1.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">
      <path d="M 10 70 Q 40 10 70 10" stroke="${sc.c1}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.9">
        <animate attributeName="stroke-dashoffset" from="90" to="0" dur="0.12s" fill="freeze"/>
        <animate attributeName="opacity" from="1" to="0" dur="0.3s" begin="0.12s" fill="freeze"/>
      </path>
      <path d="M 10 70 Q 40 10 70 10" stroke="white" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6">
        <animate attributeName="stroke-dashoffset" from="90" to="0" dur="0.1s" fill="freeze"/>
        <animate attributeName="opacity" from="0.6" to="0" dur="0.25s" begin="0.1s" fill="freeze"/>
      </path>
    </svg>`;
    arena.appendChild(s1);
    requestAnimationFrame(() => { s1.style.opacity = '1'; });
    setTimeout(() => { if (s1.parentNode) s1.remove(); }, 400);
    // Druhý sek — z prava dolů doleva nahoru, 80ms později
    const s2 = document.createElement('div');
    s2.style.cssText = `position:absolute;left:${cx-size/2}px;top:${cy-size/2}px;width:${size}px;height:${size}px;z-index:21;pointer-events:none;opacity:1;`;
    s2.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">
      <path d="M 70 70 Q 40 10 10 10" stroke="${sc.c1}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.9">
        <animate attributeName="stroke-dashoffset" from="90" to="0" dur="0.12s" fill="freeze"/>
        <animate attributeName="opacity" from="1" to="0" dur="0.3s" begin="0.12s" fill="freeze"/>
      </path>
      <path d="M 70 70 Q 40 10 10 10" stroke="white" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6">
        <animate attributeName="stroke-dashoffset" from="90" to="0" dur="0.1s" fill="freeze"/>
        <animate attributeName="opacity" from="0.6" to="0" dur="0.25s" begin="0.1s" fill="freeze"/>
      </path>
    </svg>`;
    setTimeout(() => {
      arena.appendChild(s2);
      requestAnimationFrame(() => { s2.style.opacity = '1'; });
      setTimeout(() => { if (s2.parentNode) s2.remove(); }, 400);
    }, 80);
  }

  function spawnWeaponProjectile(isCrit) {
    const wType = getWeaponType();
    if (wType === 'blade') { spawnSlashEffect(isCrit); }
    else if (wType === 'fists') { spawnFistEffect(isCrit); }
    else { spawnProjectileEffect(0, false, false); }
  }

  // ===== SPELL PROJECTILES =====
  function spawnFireballProjectile() {
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const aRect = arena.getBoundingClientRect();

    // Start od hráče (dole)
    const playerFig = $('mbPlayerFigure');
    let startX = rect.width / 2, startY = rect.height - 40;
    if (playerFig) {
      const pRect = playerFig.getBoundingClientRect();
      startX = pRect.left + pRect.width/2 - aRect.left;
      startY = pRect.top + pRect.height/2 - aRect.top;
    }

    // Cíl: boss (nahoře)
    const bossFig = $('mbFigure');
    let targetX = rect.width / 2, targetY = 20;
    if (bossFig) {
      const bRect = bossFig.getBoundingClientRect();
      targetX = bRect.left + bRect.width/2 - aRect.left;
      targetY = bRect.top + bRect.height/2 - aRect.top;
    }
    // Fireball — pulzující ohnivá koule letící od hráče k bossovi
    const ball = document.createElement('div');
    const size = 36;
    ball.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;z-index:30;pointer-events:none;left:${startX - size/2}px;top:${startY - size/2}px;background:radial-gradient(circle,#fff 10%,#f39c12 40%,#e74c3c 80%);box-shadow:0 0 25px rgba(231,76,60,0.8),0 0 50px rgba(243,156,18,0.4);transition:left 0.2s ease-in,top 0.2s ease-in;`;
    arena.appendChild(ball);
    void ball.offsetHeight;
    ball.style.left = (targetX - size/2) + 'px';
    ball.style.top = (targetY - size/2) + 'px';
    // Exploze po dopadu
    setTimeout(() => {
      if (ball.parentNode) ball.remove();
      playSFX(fireSpellSfx);
      // Ohnivá exploze
      for (let i = 0; i < 25; i++) {
        const p = document.createElement('div');
        const pSize = 4 + Math.random() * 12;
        const angle = Math.random() * 2 * Math.PI;
        const dist = 15 + Math.random() * 55;
        const colors = ['#e74c3c','#f39c12','#fff','#e67e22'];
        const color = colors[i % colors.length];
        p.style.cssText = `position:absolute;width:${pSize}px;height:${pSize}px;border-radius:50%;z-index:31;pointer-events:none;left:${targetX - pSize/2}px;top:${targetY - pSize/2}px;background:${color};box-shadow:0 0 ${6+Math.random()*10}px ${color};opacity:1;`;
        arena.appendChild(p);
        requestAnimationFrame(() => {
          p.style.transition = `left 0.4s ease-out, top 0.4s ease-out, opacity 0.4s ease-out`;
          p.style.left = (targetX + Math.cos(angle) * dist - pSize/2) + 'px';
          p.style.top = (targetY + Math.sin(angle) * dist - pSize/2) + 'px';
          p.style.opacity = '0';
        });
        setTimeout(() => { if (p.parentNode) p.remove(); }, 450);
      }
    }, 350);
  }

  function spawnHealProjectile() {
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height - 80;
    // Zelená koule stoupající od hráče
    for (let i = 0; i < 8; i++) {
      const p = document.createElement('div');
      const size = 4 + Math.random() * 8;
      const angle = Math.random() * 2 * Math.PI;
      const dist = 20 + Math.random() * 40;
      setTimeout(() => {
        p.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;z-index:30;pointer-events:none;left:${cx - size/2}px;top:${cy - size/2}px;background:rgba(46,204,113,0.7);box-shadow:0 0 12px rgba(46,204,113,0.6);opacity:0.9;transition:left 0.5s ease-out,top 0.5s ease-out,opacity 0.5s ease-out;`;
        arena.appendChild(p);
        void p.offsetHeight;
        p.style.left = (cx + Math.cos(angle) * dist - size/2) + 'px';
        p.style.top = (cy + Math.sin(angle) * dist - size/2) + 'px';
        p.style.opacity = '0';
        setTimeout(() => { if (p.parentNode) p.remove(); }, 550);
      }, i * 60);
    }
    displayHealText('💚');
  }

  function spawnIceProjectile() {
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const aRect = arena.getBoundingClientRect();

    // Start od hráče (dole)
    const playerFig = $('mbPlayerFigure');
    let startX = rect.width / 2, startY = rect.height - 40;
    if (playerFig) {
      const pRect = playerFig.getBoundingClientRect();
      startX = pRect.left + pRect.width/2 - aRect.left;
      startY = pRect.top + pRect.height/2 - aRect.top;
    }

    // Cíl: boss (nahoře)
    const bossFig = $('mbFigure');
    let targetX = rect.width / 2, targetY = 20;
    if (bossFig) {
      const bRect = bossFig.getBoundingClientRect();
      targetX = bRect.left + bRect.width/2 - aRect.left;
      targetY = bRect.top + bRect.height/2 - aRect.top;
    }

    // Ledová koule — modrobílá, s mrazivým ocasem
    const ball = document.createElement('div');
    const size = 32;
    ball.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;z-index:30;pointer-events:none;left:${startX - size/2}px;top:${startY - size/2}px;background:radial-gradient(circle,#fff 10%,#4fc3f7 50%,#1565c0 90%);box-shadow:0 0 20px rgba(79,195,247,0.8),0 0 40px rgba(21,101,192,0.4);transition:left 0.2s ease-in,top 0.2s ease-in;`;
    arena.appendChild(ball);
    void ball.offsetHeight;
    ball.style.left = (targetX - size/2) + 'px';
    ball.style.top = (targetY - size/2) + 'px';

    // Mrazivá exploze po dopadu
    setTimeout(() => {
      if (ball.parentNode) ball.remove();
      playSFX(iceSpellSfx);
      for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        const pSize = 3 + Math.random() * 10;
        const angle = Math.random() * 2 * Math.PI;
        const dist = 10 + Math.random() * 50;
        const colors = ['#4fc3f7','#81d4fa','#fff','#b3e5fc'];
        const color = colors[i % colors.length];
        p.style.cssText = `position:absolute;width:${pSize}px;height:${pSize}px;border-radius:50%;z-index:31;pointer-events:none;left:${targetX - pSize/2}px;top:${targetY - pSize/2}px;background:${color};box-shadow:0 0 ${5+Math.random()*8}px ${color};opacity:1;`;
        arena.appendChild(p);
        requestAnimationFrame(() => {
          p.style.transition = `left 0.4s ease-out, top 0.4s ease-out, opacity 0.4s ease-out`;
          p.style.left = (targetX + Math.cos(angle) * dist - pSize/2) + 'px';
          p.style.top = (targetY + Math.sin(angle) * dist - pSize/2) + 'px';
          p.style.opacity = '0';
        });
        setTimeout(() => { if (p.parentNode) p.remove(); }, 450);
      }
    }, 350);
  }

  function spawnLightningProjectile() {
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const startX = rect.width / 2;
    const startY = rect.height - 80;
    const targetX = rect.width / 2;
    const targetY = 80;
    // Žlutá blesková koule
    const ball = document.createElement('div');
    const size = 28;
    ball.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;z-index:30;pointer-events:none;left:${startX - size/2}px;top:${startY - size/2}px;background:radial-gradient(circle,#fff 10%,#ffeb3b 50%,#f57f17 90%);box-shadow:0 0 20px rgba(255,235,59,0.8),0 0 40px rgba(245,127,23,0.4);transition:left 0.15s ease-in,top 0.15s ease-in;`;
    arena.appendChild(ball);
    void ball.offsetHeight;
    ball.style.left = (targetX - size/2) + 'px';
    ball.style.top = (targetY - size/2) + 'px';
    // Jiskřivá exploze po dopadu
    setTimeout(() => {
      if (ball.parentNode) ball.remove();
      playSFX(lightningSpellSfx);
      for (let i = 0; i < 25; i++) {
        const p = document.createElement('div');
        const pSize = 2 + Math.random() * 6;
        const angle = Math.random() * 2 * Math.PI;
        const dist = 10 + Math.random() * 60;
        const colors = ['#ffeb3b','#fff','#f57f17','#ffd54f'];
        const color = colors[i % colors.length];
        p.style.cssText = `position:absolute;width:${pSize}px;height:${pSize}px;border-radius:50%;z-index:31;pointer-events:none;left:${targetX - pSize/2}px;top:${targetY - pSize/2}px;background:${color};box-shadow:0 0 ${5+Math.random()*8}px ${color};opacity:1;`;
        arena.appendChild(p);
        requestAnimationFrame(() => {
          p.style.transition = `left 0.3s ease-out, top 0.3s ease-out, opacity 0.3s ease-out`;
          p.style.left = (targetX + Math.cos(angle) * dist - pSize/2) + 'px';
          p.style.top = (targetY + Math.sin(angle) * dist - pSize/2) + 'px';
          p.style.opacity = '0';
        });
        setTimeout(() => { if (p.parentNode) p.remove(); }, 350);
      }
    }, 300);
  }

  function spawnDodgeEffect(arena, dir) {
    // Oblak/částice fouknuté od středu arény směrem úhybu — rychlejší a dál
    const rect = arena.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const color = 'rgba(187,187,187,0.2)';

    const count = 12;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      const size = 10 + Math.random() * 16;
      const spread = 60 + Math.random() * 80;
      let dx = 0, dy = 0;
      if (dir === '⬆️') { dx = (Math.random() - 0.5) * 30; dy = -spread; }
      else if (dir === '⬇️') { dx = (Math.random() - 0.5) * 30; dy = spread; }
      else if (dir === '⬅️') { dx = -spread; dy = (Math.random() - 0.5) * 30; }
      else if (dir === '➡️') { dx = spread; dy = (Math.random() - 0.5) * 30; }

      p.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${color};filter:blur(2px);z-index:19;pointer-events:none;opacity:0.5;`;
      p.style.left = (cx - size/2) + 'px';
      p.style.top = (cy - size/2) + 'px';
      arena.appendChild(p);

      requestAnimationFrame(() => {
        p.style.transition = `left 0.25s ease-out, top 0.25s ease-out, opacity 0.25s ease-out`;
        p.style.left = (cx + dx - size/2) + 'px';
        p.style.top = (cy + dy - size/2) + 'px';
        p.style.opacity = '0';
      });

      setTimeout(() => { if (p.parentNode) p.remove(); }, 300);
    }
  }

  function onMapDodge(dir) {
    if (mapBattleState.ended || !mapBattleState.sequence) return;
    const mb = mapBattleState;
    // Rapid — zpracovává onMapRapidTap
    if (mb.isRapidAttack) return;
    const attack = mb.sequence[mb.sequenceIndex];
    if (!attack) return;
    // GUARD: útok už byl vyřešen
    if (mb._sequenceTimer === null) return;

    doArenaGlow(dir, false);

    // Uložit směr swipu pro animaci
    mb._lastSwipeDir = dir;

    let correct = false;
    let dmgMult = 1.0; // násobitel poškození hrdiny

    if (attack.type === 'block') {
      // Block = musíš použít štít, swipe = chyba
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      onMapHit();
      return;
    } else if (attack.type === 'inverted') {
      // Inverzní: musíš swipnout opačný směr
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      const inverseMap = { '⬆️':'⬇️', '⬇️':'⬆️', '⬅️':'➡️', '➡️':'⬅️' };
      if (dir === inverseMap[attack.dir]) {
        correct = true;
        doArenaGlow(dir, true);
        dmgMult = 1.0;
      }
    } else if (attack.type === 'yellow') {
      // Yellow: 2× stejným směrem
      if (dir !== attack.dir) {
        clearTimeout(mb._sequenceTimer);
        clearTimeout(mb._ringTimer);
        mb._ringTimer = null;
        mb._sequenceTimer = null;
        onMapHit();
        return;
      }
      mb._heavySwipes++;
      doArenaGlow(dir, true);
      if (mb._heavySwipes >= 2) {
        clearTimeout(mb._sequenceTimer);
        clearTimeout(mb._ringTimer);
        mb._ringTimer = null;
        mb._sequenceTimer = null;
        correct = true;
        dmgMult = 2.0;
      } else {
        return; // čekáme na druhý swipe
      }
    } else if (attack.type === 'blue') {
      // Blue: oba směry
      if (dir !== attack.dir && dir !== attack.twinDir) {
        clearTimeout(mb._sequenceTimer);
        clearTimeout(mb._ringTimer);
        mb._ringTimer = null;
        mb._sequenceTimer = null;
        onMapHit();
        return;
      }
      if (mb._twinSwipes.includes(dir)) {
        clearTimeout(mb._sequenceTimer);
        clearTimeout(mb._ringTimer);
        mb._ringTimer = null;
        mb._sequenceTimer = null;
        onMapHit();
        return;
      }
      mb._twinSwipes.push(dir);
      doArenaGlow(dir, true);
      if (mb._twinSwipes.length >= 2) {
        clearTimeout(mb._sequenceTimer);
        clearTimeout(mb._ringTimer);
        mb._ringTimer = null;
        mb._sequenceTimer = null;
        correct = true;
        dmgMult = 0.75; // každá rána 0.75×, dohromady 1.5×
      } else {
        return; // čekáme na druhý swipe
      }
    } else if (attack.type === 'green') {
      // Green = heal — musíš swipnout opačný směr (jako inverted)
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      const inverseMap = { '⬆️':'⬇️', '⬇️':'⬆️', '⬅️':'➡️', '➡️':'⬅️' };
      if (dir === inverseMap[attack.dir]) {
        correct = true;
        doArenaGlow(dir, true);
        // Heal: 15% max HP — žádný damage
        const healAmt = Math.max(1, Math.round(mb.maxPlayerHp * 0.15));
        mb.playerHp = Math.min(mb.maxPlayerHp, mb.playerHp + healAmt);
        playSFX(healSfx);
        const dmgText = $('mbPlayerDamageText');
        if (dmgText) {
          dmgText.textContent = `+${healAmt}`;
          dmgText.style.color = '#2ecc71';
          dmgText.classList.remove('hidden');
          setTimeout(() => { dmgText.classList.add('hidden'); dmgText.style.color = ''; }, 800);
        }
        updateMapBattleUI();
      }
    } else if (attack.type === 'truth') {
      // Truth — zelená šipka, swipni jak ukazuje
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      if (dir === attack.dir) {
        correct = true;
        doArenaGlow(dir, true);
        dmgMult = 1.0;
      }
    } else if (attack.type === 'lie') {
      // Lie — červená šipka, swipni opačný směr
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      const inverseMap = { '⬆️':'⬇️', '⬇️':'⬆️', '⬅️':'➡️', '➡️':'⬅️' };
      if (dir === inverseMap[attack.dir]) {
        correct = true;
        doArenaGlow(dir, true);
        dmgMult = 1.0;
      }
    } else if (attack.type === 'freeze') {
      // Freeze — modrá šipka, nesmíš swipnout = chyba
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      onMapHit();
      return;
    } else {
      // Grey: normální útok
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      if (dir === attack.dir) {
        correct = true;
        doArenaGlow(dir, true);
        dmgMult = 1.0;
      }
    }

    if (correct) {
      // 🎯 Bonus window check — swipe mimo žlutou výseč = chyba
      if (mb._bonusStartMs != null && !mb._bonusActive) {
        clearTimeout(mb._sequenceTimer);
        clearTimeout(mb._ringTimer);
        mb._ringTimer = null;
        mb._sequenceTimer = null;
        onMapHit();
        return;
      }
      // Způsobit poškození monstru (kromě green = heal)
      if (attack.type !== 'green') {
        dealPlayerDamage(mb, dmgMult);
      }
      advanceSequence();
    } else {
      onMapHit();
    }
  }

  function onMapDodgeAction() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    if (mb.isRapidAttack) return;
    if (mb._sequenceTimer === null) return;
    if (mb._hitProcessed) return;
    // Potřebuje 30 staminy
    if (mb.stamina < 30) return;
    mb.stamina -= 30;
    clearTimeout(mb._sequenceTimer);
    clearTimeout(mb._ringTimer);
    mb._ringTimer = null;
    mb._sequenceTimer = null;
    playSFX(dodgeSfx);
    doArenaGlow(mb.currentAttack || '⬆️', true);
    advanceSequence();
  }

  function onMapHit() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    if (mb._hitProcessed) return;
    mb._hitProcessed = true;
    
    // D4/D5 — přehřívání: reset na 0 při chybě (zásahu)
    if (mb.locId === 3 || mb.locId === 4) {
      mb._heatLevel = 0;
    }
    clearTimeout(mb._sequenceTimer);
    clearTimeout(mb._ringTimer);
    mb._ringTimer = null;
    mb._sequenceTimer = null;

    // DoT tick
    if (doDotTick(mb)) return;
    // Chill tick
    if (mb.chillTicksLeft > 0) mb.chillTicksLeft--;

    // 🛡️ Pasivní dodge hráče — šance se zcela vyhnout bossovu útoku
    const playerDodgeChance = getPlayerDodgeChance(mb);
    if (Math.random() * 100 < playerDodgeChance) {
      const dmgText = $('mbPlayerDamageText');
      if (dmgText) {
        dmgText.textContent = 'DODGE!';
        dmgText.style.color = '#f39c12';
        dmgText.classList.remove('hidden');
        setTimeout(() => { dmgText.classList.add('hidden'); dmgText.style.color = ''; }, 600);
      }
      playSFX(dodgeSfx);
      // Počkat na vykreslení resetu před novým kolem
      requestAnimationFrame(() => {
        setTimeout(() => mapBattleTurn(), 0);
      });
      return;
    }

    const baseBossDmg = Math.max(8, 8 + mb.locId * 8 + mb.progress * 4);
    const diffMult = DIFFICULTY_MULT[mb.locId] || 1.0;
    let bossDmg = Math.round(baseBossDmg * diffMult * (0.8 + Math.random() * 0.4));
    const mType = mb.monsterType;
    const bossTypes = mb.bossTypes || [];
    let isCrit = false;
    let lifeStealAmt = 0;
    let manaStealAmt = 0;
    const typesToApply = bossTypes.length > 0 ? bossTypes : (mType ? [mType] : []);
    typesToApply.forEach(t => {
      if (t === MONSTER_TYPES.CRITMASTER) {
        if (Math.random() < 0.33) {
          bossDmg = Math.round(bossDmg * 2.0);
          isCrit = true;
        }
      } else if (t === MONSTER_TYPES.IMPROVER) {
        mb._improverStacks = (mb._improverStacks || 0) + 1;
        bossDmg = Math.round(bossDmg * (1 + mb._improverStacks * 0.25));
      } else if (t === MONSTER_TYPES.LIFESTEALER) {
        lifeStealAmt += Math.round(bossDmg * 0.5);
      } else if (t === MONSTER_TYPES.MANASTEALER) {
        manaStealAmt += Math.round(bossDmg * 0.5);
      } else if (t === MONSTER_TYPES.POISON) {
        const poisonDmg = Math.max(1, Math.round(bossDmg * 0.2));
        mb.playerDot = poisonDmg;
        mb.playerDotTicksLeft = 3;
      }
    });
    // 🛡️ Defense — WoW styl: damage *= 100 / (100 + totalDefense)
    const armorDef = (ITEM_MAP[state.hero.equip.armor] || {defense:0}).defense || 0;
    const helmetDef = ITEM_MAP[state.hero.equip.helmet]?.defense || 0;
    const shieldDef = ITEM_MAP[state.hero.equip.shield]?.defense || 0;
    let totalDefense = armorDef + helmetDef + shieldDef;
    if (state.defensiveShoutArmorPct > 0) totalDefense = Math.round(totalDefense * (1 + state.defensiveShoutArmorPct / 100));
    if (totalDefense > 0) {
      bossDmg = Math.round(bossDmg * (1 - totalDefense / (totalDefense + 300)));
    }
    let amount = bossDmg;

    // Pasivní blok — pokud má hráč štít, šance na vyblokování damage
    let blocked = false;
    const shieldItem = ITEM_MAP[state.hero.equip.shield];
    if (shieldItem && shieldItem.blockChance > 0) {
      if (Math.random() * 100 < shieldItem.blockChance) {
        blocked = true;
        amount = 0;
        playSFX(blockSfx);
      }
    }

    if (!blocked) {
      mb.playerHp -= amount;
    }
    // Life steal — jen pokud nebylo blokováno
    if (!blocked && lifeStealAmt > 0) {
      mb.bossHp = Math.min(mb.maxBossHp, mb.bossHp + lifeStealAmt);
    }
    // Mana steal — jen pokud nebylo blokováno
    if (!blocked && manaStealAmt > 0) {
      state.hero.mana = Math.max(0, (state.hero.mana || 0) - manaStealAmt);
    }
    if (!blocked) {
      mb.mistakes = (mb.mistakes || 0) + 1;
      // Zvuk — náhodný hurt zvuk
      playSFX(getHurtSfx());
      // Výrazný červený záblesk celé obrazovky
      const arena = $('mbArena');
      if (arena) {
        arena.style.transition = 'background-color 0.1s';
        arena.style.backgroundColor = 'rgba(233,69,96,0.45)';
        setTimeout(() => { arena.style.backgroundColor = ''; setTimeout(() => { arena.style.transition = ''; }, 200); }, 100);
      }
      // Záblesk overlay — tmavý overlay s červeným nádechem
      let hitOverlay = $('mbHitOverlay');
      if (!hitOverlay) {
        hitOverlay = document.createElement('div');
        hitOverlay.id = 'mbHitOverlay';
        hitOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:999;pointer-events:none;transition:background-color 0.1s;background-color:transparent;';
        document.body.appendChild(hitOverlay);
      }
      hitOverlay.style.backgroundColor = 'rgba(200,40,40,0.2)';
      setTimeout(() => { hitOverlay.style.backgroundColor = 'transparent'; }, 100);
    }

    const playerDamageText = $('mbPlayerDamageText');
    if (playerDamageText) {
      playerDamageText.textContent = blocked ? '🛡️ BLOCK!' : `-${amount}`;
      playerDamageText.style.color = blocked ? '#3498db' : '';
      playerDamageText.classList.remove('hidden');
      setTimeout(() => playerDamageText.classList.add('hidden'), 800);
    }

    const arrow = $('mbArrow');
    if (arrow) arrow.setAttribute('class', 'boss-attack-arrow hidden');
    const actionInfo = $('mbActionInfo');
    if (actionInfo) actionInfo.classList.add('hidden');
    updateActionButtons();
    resetTimerRing();
    const rTarget = $('mbRapidTarget');
    if (rTarget) rTarget.classList.add('hidden');
    const lTap = $('mbTapLeft');
    const rTap = $('mbTapRight');
    if (lTap) lTap.classList.add('hidden');
    if (rTap) rTap.classList.add('hidden');

    flashSeqFail();
    updateMapBattleUI();

    if (mb.playerHp <= 0) { endMapBattle(false); return; }

    // Po zásahu restartovat sekvenci
    setTimeout(() => mapBattleTurn(), 300);
  }

  function onMapAttackSpell(spellId) {
    castMapSpell(spellId);
  }

  function applySchoolColors() {
    const a = state.activeSchool;
    const arena = $('mbArena');
    if (!arena) return;
    // Barvy se mění jen když má hráč pasivní bonus (Tier 1) v aktivní škole
    const hasPassive = a && getTierPoints(a, 0) > 0;
    let bg, border, dot, dotTapped, dotGlow, dotGlow2, pulse, target, targetGlow;
    let seqDone, seqGlow, seqGlow2, seqGlow3;
    let spellColor, spellBg, spellGlow;
    if (hasPassive && a === 'fire') {
      bg='rgba(243,156,18,0.2)'; border='rgba(243,156,18,0.8)'; dot='rgba(243,156,18,0.45)'; dotTapped='rgba(243,156,18,1)';
      dotGlow='rgba(243,156,18,1)'; dotGlow2='rgba(243,156,18,0.6)'; pulse='rgba(243,156,18,0.6)'; target='#f39c12'; targetGlow='rgba(243,156,18,0.8)';
      seqDone='#f39c12'; seqGlow='rgba(243,156,18,0.4)'; seqGlow2='rgba(243,156,18,0.9)'; seqGlow3='rgba(243,156,18,0.4)';
      spellColor='#f39c12'; spellBg='#1a1a1a'; spellGlow='rgba(243,156,18,0.4)';
    } else if (hasPassive && a === 'ice') {
      bg='rgba(52,152,219,0.2)'; border='rgba(52,152,219,0.8)'; dot='rgba(52,152,219,0.45)'; dotTapped='rgba(52,152,219,1)';
      dotGlow='rgba(52,152,219,1)'; dotGlow2='rgba(52,152,219,0.6)'; pulse='rgba(52,152,219,0.6)'; target='#3498db'; targetGlow='rgba(52,152,219,0.8)';
      seqDone='#3498db'; seqGlow='rgba(52,152,219,0.4)'; seqGlow2='rgba(52,152,219,0.9)'; seqGlow3='rgba(52,152,219,0.4)';
      spellColor='#3498db'; spellBg='#0a1a2a'; spellGlow='rgba(52,152,219,0.4)';
    } else if (hasPassive && a === 'nature') {
      bg='rgba(46,204,113,0.2)'; border='rgba(46,204,113,0.8)'; dot='rgba(46,204,113,0.45)'; dotTapped='rgba(46,204,113,1)';
      dotGlow='rgba(46,204,113,1)'; dotGlow2='rgba(46,204,113,0.6)'; pulse='rgba(46,204,113,0.6)'; target='#2ecc71'; targetGlow='rgba(46,204,113,0.8)';
      seqDone='#2ecc71'; seqGlow='rgba(46,204,113,0.4)'; seqGlow2='rgba(46,204,113,0.9)'; seqGlow3='rgba(46,204,113,0.4)';
      spellColor='#2ecc71'; spellBg='#0a0a0a'; spellGlow='rgba(46,204,113,0.4)';
    } else if (hasPassive && a === 'physical') {
      bg='rgba(180,180,200,0.2)'; border='rgba(180,180,200,0.8)'; dot='rgba(180,180,200,0.45)'; dotTapped='rgba(180,180,200,1)';
      dotGlow='rgba(180,180,200,1)'; dotGlow2='rgba(180,180,200,0.6)'; pulse='rgba(180,180,200,0.6)'; target='#b0b0c8'; targetGlow='rgba(180,180,200,0.8)';
      seqDone='#b0b0c8'; seqGlow='rgba(180,180,200,0.4)'; seqGlow2='rgba(180,180,200,0.9)'; seqGlow3='rgba(180,180,200,0.4)';
      spellColor='#b0b0c8'; spellBg='#1a1a20'; spellGlow='rgba(180,180,200,0.4)';
    } else {
      bg='rgba(180,100,255,0.2)'; border='rgba(180,100,255,0.8)'; dot='rgba(180,100,255,0.45)'; dotTapped='rgba(180,100,255,1)';
      dotGlow='rgba(180,100,255,1)'; dotGlow2='rgba(180,100,255,0.6)'; pulse='rgba(180,100,255,0.6)'; target='#b064ff'; targetGlow='rgba(176,100,255,0.8)';
      seqDone='#888'; seqGlow='rgba(136,136,136,0.4)'; seqGlow2='rgba(136,136,136,0.9)'; seqGlow3='rgba(136,136,136,0.4)';
      spellColor='#e94560'; spellBg='#1a1a1a'; spellGlow='rgba(233,69,96,0.4)';
    }
    arena.style.setProperty('--rapid-color', border.replace('0.8','0.25'));
    arena.style.setProperty('--rapid-tap-bg', bg);
    arena.style.setProperty('--rapid-tap-border', border);
    arena.style.setProperty('--rapid-dot', dot);
    arena.style.setProperty('--rapid-dot-tapped', dotTapped);
    arena.style.setProperty('--rapid-dot-glow', dotGlow);
    arena.style.setProperty('--rapid-dot-glow2', dotGlow2);
    arena.style.setProperty('--rapid-pulse', pulse);
    arena.style.setProperty('--rapid-target', target);
    arena.style.setProperty('--rapid-target-glow', targetGlow);
    arena.style.setProperty('--seq-dot-done', seqDone);
    arena.style.setProperty('--seq-dot-glow', seqGlow);
    arena.style.setProperty('--seq-dot-glow2', seqGlow2);
    arena.style.setProperty('--seq-dot-glow3', seqGlow3);
    arena.style.setProperty('--spell-color', spellColor);
    arena.style.setProperty('--spell-bg', spellBg);
    arena.style.setProperty('--spell-glow', spellGlow);
  }

  function onMapRapidTap(tapId) {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    if (!mb.isRapidAttack) return;
    if (mb._hitProcessed) return;
    mb.rapidTaps = (mb.rapidTaps || 0) + 1;
    // Každý tap = malý útok (bez attack table — rapid tappy jsou příliš rychlé na miss/dodge roll)
    const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
    const baseDmg = mb.baseDmg || (10 + Math.floor(state.hero.level * 3) + weapon.baseDmg + ((state.hero.attrStr||0) + getEquipAttrs().str)*2);
    let dmg = Math.max(1, Math.round(baseDmg * 0.3));
    mb.bossHp -= dmg;
    // Damage text
    const dmgText = $('mbDamageText');
    if (dmgText) {
      dmgText.textContent = `-${dmg}`;
      dmgText.classList.remove('hidden');
      setTimeout(() => dmgText.classList.add('hidden'), 400);
    }
    // Vizuální feedback
    if (tapId) {
      const el = $(tapId);
      if (el) { el.classList.add('tapped'); setTimeout(() => el.classList.remove('tapped'), 80); }
    }
    playSFX(dodgeSfx);
    const remaining = mb.rapidTarget - mb.rapidTaps;
    const target = $('mbRapidTarget');
    if (target) target.textContent = `${remaining}`;
    if (mb.rapidTaps >= mb.rapidTarget) {
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      advanceSequence();
    }
  }

  function dealPlayerDamage(mb, mult) {
    const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
    // 🎲 ATTACK TABLE — D2 formule (pouze pro fyzické útoky, ne pro kouzla)
    const isPhysical = weapon.weaponType !== 'staff';
    if (isPhysical) {
      const at = getPlayerAttackTable(mb);
      const roll = Math.random() * 100;
      if (roll >= at.hitChance) {
        // MISS!
        const dmgText = $('mbDamageText');
        if (dmgText) {
          dmgText.textContent = 'MISS!';
          dmgText.style.color = '#888';
          dmgText.classList.remove('hidden');
          setTimeout(() => { dmgText.classList.add('hidden'); dmgText.style.color = ''; }, 600);
        }
        playSFX(dodgeSfx);
        if (!mb._combatLoop) advanceSequence();
        return;
      }
    }
    // HIT — normální damage (pro fyzické i kouzla)
    const baseDmg = mb.baseDmg || (10 + Math.floor(state.hero.level * 3) + weapon.baseDmg + ((state.hero.attrStr||0) + getEquipAttrs().str)*2);
    let dmg = Math.round(baseDmg * mult);
    // Rozptyl ±2 — každá rána je jiná
    dmg += Math.floor(Math.random() * 5) - 2; // -2, -1, 0, +1, +2
    dmg = Math.max(1, dmg);
    // D4/D5 — přehřívání: každý úspěšný útok zvyšuje heat
    if (mb.locId === 3 || mb.locId === 4) {
      mb._heatLevel = Math.min((mb._heatLevel || 0) + 1, 10);
    }
    
    // 🎯 Crit chance ze zbraně — náhodná šance na 2.0× poškození
    const critChance = weapon.critChance || 0;
    let isCrit = false;
    if (critChance > 0 && Math.random() * 100 < critChance) {
      dmg = Math.round(dmg * 2.0);
      isCrit = true;
    }
    
    // Zvuk — crit má vlastní zvuk, jinak normální
    playSFX(isCrit ? getCritSfx() : getHitSfx());
    
    mb.bossHp -= dmg;
    
    // 🩸 Life steal a 💜 Mana steal z equipu (procentuálně z uděleného dmg)
    const eqItems = [weapon, ITEM_MAP[state.hero.equip.ring1], ITEM_MAP[state.hero.equip.ring2], ITEM_MAP[state.hero.equip.amulet]].filter(Boolean);
    const totalLifeSteal = eqItems.reduce((sum, it) => sum + (it.lifesteal || 0), 0);
    const totalManaSteal = eqItems.reduce((sum, it) => sum + (it.manaSteal || 0), 0);
    if (totalLifeSteal > 0) {
      const healAmt = Math.max(1, Math.round(dmg * totalLifeSteal / 100));
      state.hero.hp = Math.min(state.hero.maxHp, (state.hero.hp || 0) + healAmt);
    }
    if (totalManaSteal > 0) {
      const manaAmt = Math.max(1, Math.round(dmg * totalManaSteal / 100));
      state.hero.mana = Math.min(state.hero.maxMana, (state.hero.mana || 0) + manaAmt);
    }
    
    const dmgText = $('mbDamageText');
    if (dmgText) {
      dmgText.textContent = `-${dmg}`;
      dmgText.classList.remove('hidden');
      setTimeout(() => dmgText.classList.add('hidden'), 800);
    }
    const bossFig = $('mbFigure');
    if (bossFig) {
      bossFig.style.transition = 'filter 0.15s';
      bossFig.style.filter = 'brightness(2) saturate(1.5)';
      setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 100);
    }
    // Projektil podle zbraně — vždy normální vizuál (žádný crit efekt)
    const wType = getWeaponType();
    if (wType === 'blade') {
      spawnSlashEffect(false, mb._lastSwipeDir);
    } else if (wType === 'fists') {
      spawnFistEffect(false);
    } else {
      spawnProjectileEffect(null, false, false);
    }
    updateMapBattleUI();
  }

  function castMapSpell(spellId) { if (!spellId) { spellId = getBestSpellId(state.heroClass); if (!spellId) return; }
    const mb = mapBattleState;
    const h = state.hero;
    if (mb.ended) return;
    let lv = getSpellLv(spellId);
    if (lv === 0) return;
    // Kouzlo lze použít jen v attack window
    if (!mb.inAttackWindow) return;
    // Mana cost podle kouzla a levelu
    const manaCosts = { firebolt: 10, fireblast: 20, fireball: 35, frostbolt: 10, icebolt: 10, blizzard: 30, heal: 15, strongStrike: 8, slash: 15, whirlwind: 25 };
    const cost = (manaCosts[spellId] || 15) + lv * 2;
    if ((h.mana || 0) < cost) { showMessage('💧 Nedostatek many!'); return; }
    h.mana -= cost;
    // Clean up spell buttons
    $('mbSpells').innerHTML = '';
    let effectMsg = '';
    const baseDmg = mb.baseDmg || (10 + Math.floor(state.hero.level * 3) + (ITEM_MAP[state.hero.equip.weapon]||ITEM_MAP['fists']).baseDmg + (state.hero.attrStr||0)*2);
    if (spellId === 'fireball') {
      const pct = 100 + lv * 100; // 200% @ lv1, 300% @ lv2, 400% @ lv3
      const resistMult = getSchoolResistMult('fire');
      let dmg = Math.round(baseDmg * pct / 100 * resistMult);
      const dotPct = 30; // 30% z dmg/tick
      const dotTick = Math.max(1, Math.round(dmg * dotPct / 100));
      let dotDur = 2 + lv;
      mb.bossHp -= dmg;
      if (dotTick > 0) { mb.dot = dotTick; mb.dotTicksLeft = dotDur; }
      effectMsg = `🔥 Fireball! ${dmg} poškození!${dotTick > 0 ? ` ☠️ DoT ${dotTick}/tick` : ''}`;
      // Ohnivá koule
      spawnFireballProjectile();
    } else if (spellId === 'fireblast') {
      const pct = 100 + lv * 50; // 150% @ lv1, 200% @ lv2, 250% @ lv3
      const resistMult = getSchoolResistMult('fire');
      let dmg = Math.round(baseDmg * pct / 100 * resistMult);
      const dotPct = 20; // 20% z dmg/tick
      const dotTick = Math.max(1, Math.round(dmg * dotPct / 100));
      mb.bossHp -= dmg;
      if (dotTick > 0) { mb.dot = dotTick; mb.dotTicksLeft = 2; }
      effectMsg = `💥 Fire Blast! ${dmg} poškození!${dotTick > 0 ? ` ☠️ DoT ${dotTick}/tick` : ''}`;
      spawnFireballProjectile();
    } else if (spellId === 'firebolt') {
      const pct = 75 + lv * 35; // 110% @ lv1, 145% @ lv2, ... 250% @ lv5
      const resistMult = getSchoolResistMult('fire');
      let dmg = Math.round(baseDmg * pct / 100 * resistMult);
      mb.bossHp -= dmg;
      effectMsg = `🔥 Firebolt! ${dmg} poškození!`;
      spawnFireballProjectile();
    } else if (spellId === 'frostbolt') {
      const dmgPct = 125 + lv * 15; // 140% @ lv1, 155% @ lv2, ... 200% @ lv5
      const resistMult = getSchoolResistMult('ice');
      let dmg = Math.round(baseDmg * dmgPct / 100 * resistMult);
      let slowPct = 40;
      let ticks = 3;
      // Vylepšený frostbolt (icebolt) přidá ticky
      const iceboltLv = getTalentLv('ice_icebolt');
      if (iceboltLv > 0) ticks += iceboltLv;
      mb.bossHp -= dmg;
      mb._activeSpellChillActive = true;
      mb.chillPercent = Math.max(mb.chillPercent || 0, slowPct);
      mb.chillTicksLeft = Math.max(mb.chillTicksLeft || 0, ticks);
      effectMsg = `❄️ Frostbolt! ${dmg} poškození, zpomalení 40% na ${ticks} ticků!`;
      spawnIceProjectile();
      const bossFig = $('mbFigure');
      if (bossFig) { bossFig.style.transition = 'filter 0.3s'; bossFig.style.filter = 'brightness(1.8) hue-rotate(200deg) saturate(1.5)'; setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 800); }
      const circle = document.querySelector('.timer-circle');
      if (circle) circle.style.stroke = '#4fc3f7';
      spawnFreezeParticles();
    } else if (spellId === 'icebolt') {
      // icebolt už není samostatné kouzlo — je to pasivní upgrade frostboltu
      // Pokud se sem dostaneme (starý save), chová se jako frostbolt
      const dmgPct = 125 + lv * 25;
      let dmg = Math.round(baseDmg * dmgPct / 100);
      let slowPct = 40;
      let ticks = 3 + lv;
      mb.bossHp -= dmg;
      mb._activeSpellChillActive = true;
      mb.chillPercent = Math.max(mb.chillPercent || 0, slowPct);
      mb.chillTicksLeft = Math.max(mb.chillTicksLeft || 0, ticks);
      effectMsg = `❄️ Frostbolt! ${dmg} poškození, zpomalení 40% na ${ticks} ticků!`;
      spawnIceProjectile();
      const bossFig = $('mbFigure');
      if (bossFig) { bossFig.style.transition = 'filter 0.3s'; bossFig.style.filter = 'brightness(1.8) hue-rotate(200deg) saturate(1.5)'; setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 800); }
      const circle = document.querySelector('.timer-circle');
      if (circle) circle.style.stroke = '#4fc3f7';
      spawnFreezeParticles();
    } else if (spellId === 'blizzard') {
      // Blizzard — zmrazení: 3 útoky po sobě
      mb._blizzardFreeAttacks = 3;
      effectMsg = `❄️ Blizard! Boss zmrazen! 3 útoky po sobě!`;
      spawnIceProjectile();
      // Modrý efekt na bossovi
      const bossFig = $('mbFigure');
      if (bossFig) {
        bossFig.style.transition = 'filter 0.3s';
        bossFig.style.filter = 'brightness(1.8) hue-rotate(200deg) saturate(1.5)';
        setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 1500);
      }
      const circle = document.querySelector('.timer-circle');
      if (circle) circle.style.stroke = '#4fc3f7';
      spawnFreezeParticles();
    } else if (spellId === 'strongStrike') {
      const pct = 100 + lv * 50;
      let dmg = Math.round(baseDmg * pct / 100);
      mb.bossHp -= dmg;
      effectMsg = `💢 Silný úder! ${dmg} poškození!`;
      spawnCrossSlashEffect();
      playSFX(strongStrikeSfx);
      setTimeout(() => {
        const bossFig = $('mbFigure');
        if (bossFig) { bossFig.style.transition = 'filter 0.15s'; bossFig.style.filter = 'brightness(2) saturate(1.5)'; setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 100); }
      }, 120);
    } else if (spellId === 'slash') {
      const pct = 150 + lv * 50;
      let dmg = Math.round(baseDmg * pct / 100);
      mb.bossHp -= dmg;
      effectMsg = `⚡ Seknutí! ${dmg} poškození!`;
      spawnSlashEffect();
      setTimeout(() => {
        const bossFig = $('mbFigure');
        if (bossFig) { bossFig.style.transition = 'filter 0.15s'; bossFig.style.filter = 'brightness(2.5) saturate(1.8)'; setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 100); }
        displayDamageText('⚡');
      }, 120);
    } else if (spellId === 'whirlwind') {
      mb._blizzardFreeAttacks = 3;
      effectMsg = `🌀 Vichřice! 3 útoky po sobě!`;
      spawnSlashEffect();
      setTimeout(() => {
        const bossFig = $('mbFigure');
        if (bossFig) { bossFig.style.transition = 'filter 0.15s'; bossFig.style.filter = 'brightness(2) saturate(1.5)'; setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 100); }
        displayDamageText('🌀');
      }, 120);
    } else if (spellId === 'heal') {
      const hotBase = lv * 3;
      const vitPct = 5 + lv * 5;
      const vitBonus = Math.round((state.hero.attrVit||0) * vitPct / 100);
      mb.hot = Math.max(mb.hot || 0, hotBase + vitBonus);
      mb.hotTicksLeft = Math.max(mb.hotTicksLeft || 0, 2);
      effectMsg = `💚 Léčení! +${mb.hot}/tick na ${mb.hotTicksLeft} ticky!`;
      displayDamageText('💚');
    }
    if (spellId === 'heal') { playSFX(healSfx); } else if (spellId === 'strongStrike') { /* strongStrikeSfx už přehrán */ } else { sfxSuccess(); }
    // (hint: zachovat bonus info)
    updateMapBattleUI();
    // Odstranit spell tlačítka
    const spellsEl = $('mbSpells');
    if (spellsEl) spellsEl.innerHTML = '';
    if (mb.bossHp <= 0) { endMapBattle(true); return; }
    // === Ukončení attack window (kouzlo = místo útoku) ===
    clearTimeout(mb._attackWindowTimer);
    resetTimerRing();
    const bc = document.querySelector('.bonus-zone-circle');
    if (bc) bc.style.strokeDasharray = '0 741';
    const actInfo = $('mbActionInfo');
    if (actInfo) actInfo.classList.add('hidden');
    mb.inAttackWindow = false;
    updateActionButtons();
    if (mb._blizzardFreeAttacks > 0) {
      mb._blizzardFreeAttacks--;
      setTimeout(() => openAttackWindow(), 100);
    } else {
      setTimeout(() => mapBattleTurn(), 300);
    }
  }

  // ===== LOOT SYSTEM =====
  // Šablony pro názvy itemů podle typu a tieru
  const LOOT_NAMES = {
    weapon: {
      staff: ['Dřevěná hůlka','Ohnivá hůlka','Ledová hůl','Blesková hůl','Hvězdná hůl','Plamená hůl','Měsíční hůl','Arcimágova hůl'],
      blade: ['Železný meč','Široký meč','Bojová sekera','Obouruční meč','Temný meč','Dračí sekera','Arcimágův meč']
    },
    armor: ['Lněný hábit','Kožený hábit','Šupinový hábit','Vyšívaný hábit','Kroužkový hábit','Dračí hábit','Arcimágův hábit'],
    helmet: ['Lněná kápě','Kožená čapka','Železná helma','Ocelová helma','Stříbrná přilba','Arcimágova koruna'],
    shield: ['Dřevěný štít','Kožený štít','Železný štít','Ocelový štít','Stříbrný štít','Paladinův štít'],
    ring: ['Měděný prsten','Cínový prsten','Stříbrný prsten','Zlatý prsten','Platinový prsten','Drahokamový prsten'],
    amulet: ['Kostěný amulet','Měděný amulet','Stříbrný amulet','Zlatý amulet','Rubínový amulet','Arcánní amulet']
  };
  const LOOT_ICONS = { weapon_staff:'🪄', weapon_blade:'⚔️', armor:'👘', helmet:'⛑️', shield:'🛡️', ring:'💍', amulet:'📿' };
  const ATTR_KEYS = ['str','vit','dex','int'];
  const ATTR_NAMES = { str:'💪 Síla', vit:'❤️ Vitalita', dex:'🎯 Obratnost', int:'🧠 Intelekt' };
  const RARITY = {
    common: { name:'Common', color:'#e8e0e8', border:'#888' },
    uncommon: { name:'Uncommon', color:'#c8f7c8', border:'#4caf50' },
    rare: { name:'Rare', color:'#c8d8ff', border:'#4a8af4' },
    epic: { name:'Epic', color:'#e8c8ff', border:'#9c27b0' }
  };

  function getRarity(bossDrop) {
    const r = Math.random();
    if (bossDrop) {
      if (r < 0.15) return 'epic';
      if (r < 0.40) return 'rare';
      if (r < 0.70) return 'uncommon';
      return 'common';
    } else {
      if (r < 0.01) return 'epic';
      if (r < 0.06) return 'rare';
      if (r < 0.35) return 'uncommon';
      return 'common';
    }
  }

  function generateLootItem(locId, floor, bossDrop) {
    // Tier podle dungeonu: D1=1, D2=1-2, D3=1-3, D4=1-4, D5=1-5
    // Vyšší tier = vyšší šance (váha = tier)
    const dungeonMaxTier = locId + 1;
    const weights = [];
    for (let t = 1; t <= dungeonMaxTier; t++) weights.push(t);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    let tier = 1;
    for (let t = 0; t < weights.length; t++) {
      r -= weights[t];
      if (r <= 0) { tier = t + 1; break; }
    }
    if (bossDrop) tier = Math.min(7, tier + rand(1, 2));
    const monsterLevel = 5 + floor * 2 + (bossDrop ? 5 : 0);

    // 0. Roll quality (fixní šance, nezávislé na levelu)
    const quality = rollQuality();

    // 1. Vybrat typ a base item z ITEMS podle floor/tieru
    const typeRoll = Math.random();
    let type, subtype;
    if (typeRoll < 0.25) { type = 'weapon'; subtype = Math.random() < 0.5 ? 'staff' : 'blade'; }
    else if (typeRoll < 0.45) { type = 'armor'; subtype = null; }
    else if (typeRoll < 0.65) { type = 'helmet'; subtype = null; }
    else if (typeRoll < 0.75) { type = 'shield'; subtype = null; }
    else if (typeRoll < 0.85) { type = 'ring'; subtype = null; }
    else { type = 'amulet'; subtype = null; }

    // Common itemy jen pro zbroj a zbraně (jako Diablo 2)
    if (quality === 'common' && (type === 'ring' || type === 'amulet')) {
      quality = 'uncommon';
    }

    // 2. Najít base item z ITEMS podle typu a tieru
    const candidates = ITEMS.filter(i => {
      if (type === 'weapon') return i.type === 'weapon' && i.weaponType === subtype && i.tier <= tier;
      return i.type === type && i.tier <= tier;
    });
    // Preferovat nejvyšší možný tier
    const maxTier = candidates.length > 0 ? Math.max(...candidates.map(c => c.tier)) : 1;
    const pool = candidates.filter(c => c.tier === maxTier);
    const baseItem = pool.length > 0 ? pool[rand(0, pool.length - 1)] : null;
    if (!baseItem) return null; // žádný vhodný item pro tento typ/tier

    // 3. Unique — najít unikát pro tento base item
    if (quality === 'unique') {
      const uniqueDef = UNIQUE_ITEMS.find(u => u.baseId === baseItem.id);
      if (uniqueDef) {
        const item = generateUniqueItem(uniqueDef);
        if (item) {
          item.tier = tier;
          item.subtype = subtype;
          item.rarity = 'epic';
          item.icon = type === 'weapon' ? LOOT_ICONS['weapon_' + subtype] : LOOT_ICONS[type];
          item.cost = 10 + tier * 20 + (item.affixes || []).length * 15;
          ITEM_MAP[item.id] = item;
          state.lootItems = state.lootItems || {};
          state.lootItems[item.id] = item;
          return item;
        }
      }
      // Pokud unikát neexistuje, spadnout na rare
    }

    // 4. Vygenerovat affix item (pro magic/rare/normal)
    const item = generateLootItemWithAffixes(baseItem, quality, monsterLevel);
    item.tier = tier;
    item.subtype = subtype;
    item.rarity = quality === 'normal' ? 'common' : quality === 'magic' ? 'uncommon' : 'rare';
    item.icon = type === 'weapon' ? LOOT_ICONS['weapon_' + subtype] : LOOT_ICONS[type];
    item.cost = 10 + tier * 20 + (item.affixes || []).length * 15;

    // 5. HitRating a ExpertiseRating podle rarity
    if (item.rarity !== 'common') {
      const hitChance = item.rarity === 'uncommon' ? 0.3 : 0.6;
      if (Math.random() < hitChance) item.attackRating = (item.attackRating || 0) + 1 + rand(0, Math.ceil(tier * 0.5));
      const expChance = item.rarity === 'uncommon' ? 0.2 : 0.5;
      if (Math.random() < expChance) item.expertiseRating = 1 + rand(0, Math.ceil(tier * 0.4));
    }
    // Crit chance pro blade zbraně
    if (type === 'weapon' && subtype === 'blade') {
      item.critChance = (item.critChance || 0) + Math.min(25, 5 + tier * 3 + rand(0, 5));
    }
    // Block chance pro štíty
    if (type === 'shield') {
      item.blockChance = Math.min(45, 15 + tier * 4 + rand(0, 5));
    }

    ITEM_MAP[item.id] = item;
    state.lootItems = state.lootItems || {};
    state.lootItems[item.id] = item;
    return item;
  }

  function rollLoot(locId, floor, bossDrop) {
    const h = state.hero;
    if (bossDrop) {
      // Boss: zaručený item s vyšším tierem + goldy
      const item = generateLootItem(locId, floor, true);
      if (!item) return { type:'gold', gold: 10 + floor * 3 };
      const gold = 5 + floor * 3 + rand(0, 5);
      return { type:'boss', item, gold };
    }
    // 70% gold, 30% item
    if (Math.random() < 0.7) {
      // Gold reward
      const gold = 2 + floor * 2 + rand(0, 3);
      return { type:'gold', gold };
    } else {
      // Item reward
      const item = generateLootItem(locId, floor);
      if (!item) return { type:'gold', gold: 3 + floor * 2 };
      return { type:'item', item };
    }
  }

  function endMapBattle(won) {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    const locId = mb.locId;
    const steps = state.dungeonSteps;
    const currentChoice = mb.currentChoice;

    // Monster killed - regular enemy or elite
    if (won && !mb.isBoss && !mb.isReward) {
      mapBattleState.ended = true;
      cleanupTimers();
      // Označit krok jako hotový
      if (steps && currentChoice) currentChoice.completed = true;
      const p = (state.locationProgress[locId] || 0) + 1;
      state.locationProgress[locId] = p;
      const monsterGold = (1 + rand(0, 2)) * 5;
      const xpMod = getXpModifier(mb);
      const xpGain = Math.round((mb.loc.xpReward + mb.progress * 2) * 3 * xpMod);
      state.hero.gold = (state.hero.gold || 0) + monsterGold;
      state.hero.xp = (state.hero.xp || 0) + xpGain;
      state.hero.hp = mb.playerHp;
      state.wins = (state.wins || 0) + 1;
      const leveled = applyLevelUp();
      // Loot roll — 2-3 itemy na kill
      const numLoot = 2 + rand(0, 1);
      state._floorLootDrops = state._floorLootDrops || [];
      for (let li = 0; li < numLoot; li++) {
        const loot = rollLoot(locId, mb.progress, false);
        if (!loot) continue;
        state._floorLootDrops.push(loot);
        if (loot.type === 'item' || loot.type === 'boss') {
          if (loot.item) state.hero.inventory.push(loot.item.id);
        }
        if (loot.type === 'gold' || loot.type === 'boss') {
          state.hero.gold = (state.hero.gold || 0) + (loot.gold || 0);
        }
      }
      saveGame();
      sfxSuccess();

      // Zjistit, jestli je další místnost boss
      const nextStep = steps ? steps[p] : null;
      const isNextBoss = nextStep && nextStep.choices[nextStep.chosenIdx] && nextStep.choices[nextStep.chosenIdx].isBoss;

      mapBattleState.ended = true;
      cleanupTimers();
      saveGame();
      // Sumarizace lootu
      let totalLootGold = 0;
      const lootItems = [];
      (state._floorLootDrops || []).forEach(d => {
        if (d.type === 'gold') totalLootGold += d.gold;
        else if (d.type === 'item') { lootItems.push(d.item); }
        else if (d.type === 'boss') { lootItems.push(d.item); totalLootGold += d.gold; }
      });
      state._floorLootDrops = [];
      $('resultIcon').innerHTML = '<img class="result-icon-img" src="assets/result_win.png" alt="Vítězství">';
      $('resultTitle').textContent = 'Vítězství!';
      $('resultMsg').innerHTML = '';
      // Loot list
      let lootListHtml = '';
      if (lootItems.length > 0) {
        lootItems.forEach(item => {
          const r = RARITY[item.rarity] || RARITY.common;
          lootListHtml += `<div class="loot-scroll-item"><span class="loot-scroll-icon">${renderItemIcon(item,32)}</span><span class="loot-scroll-name" style="color:${r.color}">${item.name}</span></div>`;
        });
      } else {
        lootListHtml = '<div style="text-align:center;color:#555;font-size:12px;padding:8px">Žádné předměty</div>';
      }
      $('resultLootList').innerHTML = lootListHtml;
      $('resultBtn').innerHTML = '';
      $('resultScreen').onclick = function() { $('resultScreen').onclick = null; showScreen('map'); renderMap(); };
      showScreen('result');
      switchBGM('win');
      return;
    }

    mapBattleState.ended = true;
    cleanupTimers();

    const arena = $('mbArena');
    if (arena && arena._mbHandlers) {
      arena._mbHandlers.forEach(h => {
        if (h[0] === 'keydown') window.removeEventListener(h[0], h[1]);
        else arena.removeEventListener(h[0], h[1]);
      });
      arena._mbHandlers = null;
    }

    if (!won) {
          state.deaths = (state.deaths || 0) + 1;
          // Útěcha i za prohru — 20% XP a pár goldů
          const consXp = Math.max(3, Math.round((mb.loc.xpReward + mb.progress * 2) * 3 * 0.2));
          const consGold = 1 + rand(0, 2);
          state.hero.xp = (state.hero.xp || 0) + consXp;
          state.hero.gold = (state.hero.gold || 0) + consGold;
          const leveled = applyLevelUp();
          state.locationProgress[locId] = 0;
          state._floorLootDrops = [];
          state.hero.hp = state.hero.maxHp;
          state.dungeonSteps = null; // reset dungeon při smrti
          saveGame();
          switchBGM('defeat');
          $('resultIcon').innerHTML = '<img class="result-icon-img" src="assets/result_defeat.png" alt="Prohra">';
          $('resultTitle').textContent = 'Prohra';
          $('resultMsg').innerHTML = '';
          $('resultLootList').innerHTML = '';
          $('resultBtn').innerHTML = '';
          $('resultScreen').onclick = function() { $('resultScreen').onclick = null; showScreen('map'); renderMap(); };
    } else if (mb.isBoss) {
      // Boss defeated
      if (steps && currentChoice) currentChoice.completed = true;
      state.wins = (state.wins || 0) + 1;
      state.hero.hp = mb.playerHp;
      state.bossesDefeated[locId] = true;
      state.hero.xp = (state.hero.xp || 0) + Math.round((mb.loc.bossXp + mb.progress * 6) * getXpModifier(mb));
      state.locationProgress[locId] = 0;
      state.dungeonSteps = null; // reset dungeon po bossovi
      applyLevelUp();
      const r = mb.loc.reward;
      if (r.gold) state.hero.gold = (state.hero.gold || 0) + r.gold;
      // Boss loot
      const bossLoot = rollLoot(locId, mb.progress, true);
      if (bossLoot && bossLoot.type === 'boss' && bossLoot.item) {
        state.hero.inventory.push(bossLoot.item.id);
        state.hero.gold = (state.hero.gold || 0) + bossLoot.gold;
      }
      sfxBossDefeat();
      $('resultIcon').innerHTML = '<img class="result-icon-img" src="assets/result_win.png" alt="Vítěz">';
      $('resultTitle').textContent = `${mb.loc.boss.name} poražen!`;
      $('resultMsg').innerHTML = '';
      let lootListHtml = '';
      if (bossLoot && bossLoot.type === 'boss' && bossLoot.item) {
        const rr = RARITY[bossLoot.item.rarity] || RARITY.common;
        lootListHtml = `<div class="loot-scroll-item"><span class="loot-scroll-icon">${renderItemIcon(bossLoot.item,32)}</span><span class="loot-scroll-name" style="color:${rr.color}">${bossLoot.item.name}</span></div>`;
      } else {
        lootListHtml = '<div style="text-align:center;color:#555;font-size:12px;padding:8px">Žádné předměty</div>';
      }
      $('resultLootList').innerHTML = lootListHtml;
      $('resultBtn').innerHTML = '';
      $('resultScreen').onclick = function() { $('resultScreen').onclick = null; showMapWithUnlock(locId); };
      saveGame();
    } else if (mb.isReward) {
      // Reward room — jen gold/item, žádný boj
      if (steps && currentChoice) currentChoice.completed = true;
      state.hero.hp = mb.playerHp;
      const rewardGold = 5 + locId * 3 + rand(0, 5);
      state.hero.gold = (state.hero.gold || 0) + rewardGold;
      // Možnost itemu zdarma
      if (Math.random() < 0.3) {
        const freeItem = generateLootItem(locId, mb.progress);
        state.hero.inventory.push(freeItem.id);
        ITEM_MAP[freeItem.id] = freeItem;
      }
      saveGame();
      $('resultIcon').textContent = '💰';
      $('resultTitle').textContent = 'Dungeon dokončen!';
      $('resultMsg').innerHTML = '<div class="result-stats">'
                + '<div class="result-stat"><span class="result-stat-icon">💰</span><span class="result-stat-val">+' + rewardGold + ' gold</span></div>'
                + '</div>';
      $('resultBtn').innerHTML = '<button class="btn btn-primary" onclick="game.showScreen(\'map\'); game.renderMap();">🗺️ Mapa</button>';
      $('resultScreen').onclick = function() { $('resultScreen').onclick = null; showMapWithUnlock(locId); };
      showScreen('result');
      switchBGM('win');
      return;
    }
    showScreen('result');
    if (won) switchBGM('win');
  }

  function showMapWithUnlock(doneLocId) {
    showScreen('map');
    renderMap();
    const nextLocId = doneLocId + 1;
    if (nextLocId < LOCATIONS.length) {
      const el = document.querySelectorAll('.map-location-wrap')[nextLocId];
      if (el) {
        const locEl = el.querySelector('.map-location');
        if (locEl && locEl.classList.contains('locked')) {
          locEl.classList.remove('locked');
          locEl.classList.add('unlocking');
          playSFX(treasureSfx);
          setTimeout(() => {
            locEl.classList.remove('unlocking');
            renderMap(); // překreslit v odemčeném stavu
          }, 900);
        }
      }
    }
  }

  function continueDungeon() {
    const mb = mapBattleState;
    mb.ended = false;
    const oldMistakes = (mb.floorMistakes || 0) + (mb.mistakes || 0);
    const locId = mb.locId;
    // Reset _floorMonsters pro novou místnost
    state._floorMonsters = [];
    startLocation(locId);
  }

  // ===== BESTIARY =====
  function renderFace(face, themeIdx) {
    if (face.startsWith('<svg')) return face;
    if (face.startsWith('assets/')) {
      const filter = DUNGEON_THEME_FILTERS[themeIdx] || '';
      return '<div class="bestiary-portrait-frame" style="filter:'+filter+'"><img src="'+face+'" alt="" class="bestiary-portrait-img"/></div>';
    }
    return face;
  }

  // ===== ITEMS REFERENCE =====
  function renderItemsReference() {
    const c = $('itemsContent');
    if (!c) return;
    const TYPE_LABELS = { weapon:'Zbraň', armor:'Brnění', helmet:'Helma', shield:'Štít', ring:'Prsten', amulet:'Amulet' };
    const TYPE_ICONS = { weapon:'⚔️', armor:'👘', helmet:'⛑️', shield:'🛡️', ring:'💍', amulet:'📿' };
    const TYPE_ORDER = ['weapon','armor','helmet','shield','ring','amulet'];

    function typeTag(t) {
      const colors = { weapon:'#e67e22', armor:'#2ecc71', helmet:'#9b59b6', shield:'#1abc9c', ring:'#f1c40f', amulet:'#e94560' };
      return `<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:11px;background:${colors[t]}33;color:${colors[t]}">${TYPE_ICONS[t]} ${TYPE_LABELS[t]}</span>`;
    }

    function renderIcon(item) {
      if (item.iconImg) {
        return `<img src="${item.iconImg}" alt="" style="width:32px;height:32px;border-radius:4px;object-fit:cover;vertical-align:middle">`;
      }
      return `<span style="font-size:24px">${item.icon}</span>`;
    }

    function renderItemRow(i) {
      const other = [];
      if (i.critChance) other.push(`Crit ${i.critChance}%`);
      if (i.blockChance) other.push(`Block ${i.blockChance}%`);
      if (i.weaponType) other.push(i.weaponType);
      if (i.twoHand) other.push('2H');
      return `<tr style="border-bottom:1px solid #1a1a3a">
        <td style="padding:4px 6px">${renderIcon(i)}</td>
        <td style="padding:4px 6px"><strong>${i.name}</strong></td>
        <td style="padding:4px 6px;text-align:center">${i.tier || '-'}</td>
        <td style="padding:4px 6px;text-align:center">${i.baseDmg || 0}</td>
        <td style="padding:4px 6px;text-align:center">${i.bonusHp || 0}</td>
        <td style="padding:4px 6px;text-align:center">${i.bonusMana || 0}</td>
        <td style="padding:4px 6px;text-align:center">${i.defense || 0}</td>
        <td style="padding:4px 6px;text-align:center">${i.swingMs ? i.swingMs+'ms' : '-'}</td>
        <td style="padding:4px 6px;color:#aaa;font-size:11px">${other.join(', ')}</td>
      </tr>`;
    }

    let html = '';

    // === BASE ITEMS ===
    html += `<div class="card"><div class="card-title">🏗️ Base itemy</div>
    <p style="font-size:13px;color:#8888aa;margin-bottom:10px">Každý base item má fixní jméno a staty. Při lootu se na něj nabalují affixy.</p>`;

    // Zbraně rozdělené do podskupin
    html += `<div style="margin-top:12px"><strong>⚔️ Zbraně</strong></div>`;

    // Hole (staff) — magické
    const staves = ITEMS.filter(i => i.type === 'weapon' && i.weaponType === 'staff');
    if (staves.length > 0) {
      html += `<div style="margin:6px 0 2px;font-size:12px;color:#8888aa">🪄 Hole (magické, jednoruční)</div>`;
      html += `<div style="overflow-x:auto;max-width:100%"><table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:2px">
        <tr style="background:#12122a;color:#8888aa"><th style="padding:4px 6px"></th><th style="padding:4px 6px;text-align:left">Jméno</th><th style="padding:4px 6px">Tier</th><th style="padding:4px 6px">DMG</th><th style="padding:4px 6px">HP</th><th style="padding:4px 6px">Mana</th><th style="padding:4px 6px">Def</th><th style="padding:4px 6px">Rychlost</th><th style="padding:4px 6px">Ostatní</th></tr>`;
      staves.forEach(i => { html += renderItemRow(i); });
      html += `</table></div>`;
    }

    // Nože / dýky (blade, tier 1-2, krátké zbraně)
    const knives = ITEMS.filter(i => i.type === 'weapon' && i.weaponType === 'blade' && (i.id === 'huntingKnife' || i.id === 'sabre'));
    if (knives.length > 0) {
      html += `<div style="margin:6px 0 2px;font-size:12px;color:#8888aa">🗡️ Nože a šavle (jednoruční)</div>`;
      html += `<div style="overflow-x:auto;max-width:100%"><table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:2px">
        <tr style="background:#12122a;color:#8888aa"><th style="padding:4px 6px"></th><th style="padding:4px 6px;text-align:left">Jméno</th><th style="padding:4px 6px">Tier</th><th style="padding:4px 6px">DMG</th><th style="padding:4px 6px">HP</th><th style="padding:4px 6px">Mana</th><th style="padding:4px 6px">Def</th><th style="padding:4px 6px">Rychlost</th><th style="padding:4px 6px">Ostatní</th></tr>`;
      knives.forEach(i => { html += renderItemRow(i); });
      html += `</table></div>`;
    }

    // Meče (blade, jméno obsahuje "meč")
    const swords = ITEMS.filter(i => i.type === 'weapon' && i.weaponType === 'blade' && (i.name.includes('Meč') || i.id === 'ironSword' || i.id === 'broadSword' || i.id === 'claymore' || i.id === 'greatSword' || i.id === 'excalibur' || i.id === 'warHammer'));
    if (swords.length > 0) {
      html += `<div style="margin:6px 0 2px;font-size:12px;color:#8888aa">⚔️ Meče (jednoruční i obouruční)</div>`;
      html += `<div style="overflow-x:auto;max-width:100%"><table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:2px">
        <tr style="background:#12122a;color:#8888aa"><th style="padding:4px 6px"></th><th style="padding:4px 6px;text-align:left">Jméno</th><th style="padding:4px 6px">Tier</th><th style="padding:4px 6px">DMG</th><th style="padding:4px 6px">HP</th><th style="padding:4px 6px">Mana</th><th style="padding:4px 6px">Def</th><th style="padding:4px 6px">Rychlost</th><th style="padding:4px 6px">Ostatní</th></tr>`;
      swords.forEach(i => { html += renderItemRow(i); });
      html += `</table></div>`;
    }

    // Sekery (blade, jméno obsahuje "Sekera" nebo "Axe")
    const axes = ITEMS.filter(i => i.type === 'weapon' && i.weaponType === 'blade' && (i.name.includes('Sekera') || i.id === 'battleAxePhys' || i.id === 'warAxe' || i.id === 'greatAxe'));
    if (axes.length > 0) {
      html += `<div style="margin:6px 0 2px;font-size:12px;color:#8888aa">🪓 Sekery (obouruční)</div>`;
      html += `<div style="overflow-x:auto;max-width:100%"><table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:2px">
        <tr style="background:#12122a;color:#8888aa"><th style="padding:4px 6px"></th><th style="padding:4px 6px;text-align:left">Jméno</th><th style="padding:4px 6px">Tier</th><th style="padding:4px 6px">DMG</th><th style="padding:4px 6px">HP</th><th style="padding:4px 6px">Mana</th><th style="padding:4px 6px">Def</th><th style="padding:4px 6px">Rychlost</th><th style="padding:4px 6px">Ostatní</th></tr>`;
      axes.forEach(i => { html += renderItemRow(i); });
      html += `</table></div>`;
    }

    // Kladiva (blade, jméno obsahuje "Kladivo" nebo "Hammer")
    const hammers = ITEMS.filter(i => i.type === 'weapon' && i.weaponType === 'blade' && (i.name.includes('Kladivo') || i.id === 'giantHammer'));
    if (hammers.length > 0) {
      html += `<div style="margin:6px 0 2px;font-size:12px;color:#8888aa">🔨 Kladiva (obouruční)</div>`;
      html += `<div style="overflow-x:auto;max-width:100%"><table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:2px">
        <tr style="background:#12122a;color:#8888aa"><th style="padding:4px 6px"></th><th style="padding:4px 6px;text-align:left">Jméno</th><th style="padding:4px 6px">Tier</th><th style="padding:4px 6px">DMG</th><th style="padding:4px 6px">HP</th><th style="padding:4px 6px">Mana</th><th style="padding:4px 6px">Def</th><th style="padding:4px 6px">Rychlost</th><th style="padding:4px 6px">Ostatní</th></tr>`;
      hammers.forEach(i => { html += renderItemRow(i); });
      html += `</table></div>`;
    }

    // Ostatní sloty (armor, helmet, shield, ring, amulet)
    ['armor','helmet','shield','ring','amulet'].forEach(type => {
      const items = ITEMS.filter(i => i.type === type);
      if (items.length === 0) return;
      html += `<div style="margin-top:12px"><strong>${TYPE_ICONS[type]} ${TYPE_LABELS[type]}y</strong></div>`;
      html += `<div style="overflow-x:auto;max-width:100%"><table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px">
        <tr style="background:#12122a;color:#8888aa"><th style="padding:4px 6px"></th><th style="padding:4px 6px;text-align:left">Jméno</th><th style="padding:4px 6px">Tier</th><th style="padding:4px 6px">DMG</th><th style="padding:4px 6px">HP</th><th style="padding:4px 6px">Mana</th><th style="padding:4px 6px">Def</th><th style="padding:4px 6px">Rychlost</th><th style="padding:4px 6px">Ostatní</th></tr>`;
      items.forEach(i => { html += renderItemRow(i); });
      html += `</table></div>`;
    });
    html += `</div>`;

    // === AFFIXES ===
    html += `<div class="card"><div class="card-title">🔧 Affixy (módy)</div>
    <p style="font-size:13px;color:#8888aa;margin-bottom:10px">Prefixy (před jménem) a suffixy (za jménem). Stejná <strong>group</strong> = vzájemně se vylučují. <strong>minIlvl</strong> = minimální monster level. <strong>Weight</strong> = relativní pravděpodobnost.</p>`;

    ['prefix','suffix'].forEach(type => {
      const label = type === 'prefix' ? '🔷 Prefixy' : '🔶 Suffixy';
      const items = AFFIXES.filter(a => a.type === type);
      html += `<div style="margin-top:12px"><strong>${label}</strong></div>`;
      html += `<div style="overflow-x:auto;max-width:100%"><table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px">
        <tr style="background:#12122a;color:#8888aa"><th style="padding:4px 6px;text-align:left">Jméno</th><th style="padding:4px 6px">Group</th><th style="padding:4px 6px">minIlvl</th><th style="padding:4px 6px">Wt</th><th style="padding:4px 6px">Typy</th><th style="padding:4px 6px">Stat</th><th style="padding:4px 6px">Rozsah</th><th style="padding:4px 6px">Barva</th></tr>`;
      items.forEach(a => {
        const statStr = Object.entries(a.stats).map(([k,v]) => `${k}: ${v[0]}-${v[1]}`).join(', ');
        html += `<tr style="border-bottom:1px solid #1a1a3a"><td style="padding:4px 6px"><strong>${a.name}</strong></td>
          <td style="padding:4px 6px;text-align:center">${a.group}</td>
          <td style="padding:4px 6px;text-align:center">${a.minIlvl}</td>
          <td style="padding:4px 6px;text-align:center">${a.weight}</td>
          <td style="padding:4px 6px">${a.types.map(t => typeTag(t)).join(' ')}</td>
          <td style="padding:4px 6px;font-size:11px">${statStr}</td>
          <td style="padding:4px 6px;font-size:11px">${a.stats[Object.keys(a.stats)[0]][0]}-${a.stats[Object.keys(a.stats)[0]][1]}</td>
          <td style="padding:4px 6px"><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${a.tint};vertical-align:middle;margin-right:2px"></span>${a.tint}</td></tr>`;
      });
      html += `</table></div>`;
    });
    html += `</div>`;

    // === UNIQUES ===
    html += `<div class="card"><div class="card-title">🌟 Unique itemy</div>
    <p style="font-size:13px;color:#8888aa;margin-bottom:10px">Fixní sada affixů, vlastní jméno. Objevují se jako boss dropy.</p>`;
    UNIQUE_ITEMS.forEach(u => {
      const base = ITEMS.find(i => i.id === u.baseId);
      const affixNames = u.affixIds.map(id => {
        const a = AFFIXES.find(x => x.id === id);
        return a ? a.name : id;
      }).join(' + ');
      const iconHtml = u.iconImg ? `<img src="${u.iconImg}" alt="" style="width:36px;height:36px;border-radius:4px;object-fit:cover">` : `<span style="font-size:28px">${u.icon}</span>`;
      html += `<div style="display:flex;gap:10px;align-items:flex-start;padding:8px;border:1px solid #2a2a4a;border-radius:6px;margin-bottom:6px">
        <div style="min-width:40px;text-align:center">${iconHtml}</div>
        <div style="flex:1"><div style="font-size:14px;font-weight:600;color:#e94560">${u.name}</div>
        <div style="font-size:12px;color:#8888aa">Base: ${base ? base.name : u.baseId} · Tier ${u.tier} · Min lvl ${u.minLevel}</div>
        <div style="font-size:12px;color:#aaa">Affixy: ${affixNames}</div></div></div>`;
    });
    html += `</div>`;

    // === GENERATION RULES ===
    html += `<div class="card"><div class="card-title">⚙️ Generování</div>
    <div style="overflow-x:auto;max-width:100%"><table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px">
      <tr style="background:#12122a;color:#8888aa"><th style="padding:4px 6px;text-align:left">Monster Level</th><th style="padding:4px 6px">Normal</th><th style="padding:4px 6px">Magic</th><th style="padding:4px 6px">Rare</th></tr>
      <tr style="border-bottom:1px solid #1a1a3a"><td style="padding:4px 6px">1-4</td><td style="padding:4px 6px;text-align:center">100%</td><td style="padding:4px 6px;text-align:center">0%</td><td style="padding:4px 6px;text-align:center">0%</td></tr>
      <tr style="border-bottom:1px solid #1a1a3a"><td style="padding:4px 6px">5-9</td><td style="padding:4px 6px;text-align:center">85%</td><td style="padding:4px 6px;text-align:center">15%</td><td style="padding:4px 6px;text-align:center">0%</td></tr>
      <tr style="border-bottom:1px solid #1a1a3a"><td style="padding:4px 6px">10+</td><td style="padding:4px 6px;text-align:center">80%</td><td style="padding:4px 6px;text-align:center">15%</td><td style="padding:4px 6px;text-align:center">5%</td></tr>
    </table></div>
    <p style="font-size:12px;color:#aaa;margin-top:8px">lvlReq = floor(0.75 × max minIlvl affixů) · Název: [prefixy] + [base] + [suffixy]</p></div>`;

    c.innerHTML = html;
  }

  function renderBestiary() {
    const grid = document.getElementById('bestiaryGrid');
    if (!grid) return;
    const encountered = state.encounteredMonsters || [];
    let html = '';
    MONSTER_DB.forEach((themeMonsters, themeIdx) => {
      const theme = DUNGEON_THEMES[themeIdx] || DUNGEON_THEMES[0];
      const loc = LOCATIONS[themeIdx];
      const locName = loc ? loc.name : `Oblast ${themeIdx+1}`;
      html += `<div class="bestiary-section"><div class="bestiary-section-title" style="color:${theme.border}">${locName}</div>`;
      // Normální monstra — první
      themeMonsters.forEach(m => {
        const seen = encountered.includes(m.face);
        const typeIcon = m.type === MONSTER_TYPES.LIFESTEALER ? '🩸' :
          m.type === MONSTER_TYPES.MANASTEALER ? '💧' :
          m.type === MONSTER_TYPES.IMPROVER ? '📈' :
          m.type === MONSTER_TYPES.CRITMASTER ? '🎯' :
          m.type === MONSTER_TYPES.POISON ? '☠️' : '🎯';
        const typeName = m.type === MONSTER_TYPES.LIFESTEALER ? 'Lifestealer' :
          m.type === MONSTER_TYPES.MANASTEALER ? 'Manastealer' :
          m.type === MONSTER_TYPES.IMPROVER ? 'Improver' :
          m.type === MONSTER_TYPES.CRITMASTER ? 'Critmaster' :
          m.type === MONSTER_TYPES.POISON ? 'Poison' : 'Critmaster';
        const atkIcon = m.attackType === ATTACK_TYPES.CASTER ? '🔮' : '⚔️';
        const atkName = m.attackType === ATTACK_TYPES.CASTER ? 'Caster' : 'Melee';
        if (seen) {
          html += `<div class="bestiary-card" style="border-left:3px solid ${theme.border}">
          <div class="bestiary-face">${renderFace(m.face, themeIdx)}</div>
          <div class="bestiary-info">
            <div class="bestiary-name">${m.name}</div>
            <div class="bestiary-meta"><span>${typeIcon} ${typeName}</span> <span>${atkIcon} ${atkName}</span></div>
          </div>
        </div>`;
        } else {
          html += `<div class="bestiary-card" style="border-left:3px solid #333;opacity:0.5;filter:grayscale(1)">
          <div class="bestiary-face"><div class="bestiary-portrait-frame" style="background:#111;border-color:#691"><span style="font-size:28px;color:#555">🔒</span></div></div>
          <div class="bestiary-info">
            <div class="bestiary-name" style="color:#555">???</div>
            <div class="bestiary-meta" style="color:#444"><span>???</span> <span>???</span></div>
          </div>
        </div>`;
        }
      });
      // Boss karta — až na konci sekce
      if (loc && loc.boss) {
        const b = loc.boss;
        const seen = encountered.includes(b.face);
        const bossTypesHtml = b.types.map(t => {
          const ti = t === MONSTER_TYPES.LIFESTEALER ? '🩸' :
            t === MONSTER_TYPES.MANASTEALER ? '💧' :
            t === MONSTER_TYPES.IMPROVER ? '📈' :
            t === MONSTER_TYPES.CRITMASTER ? '🎯' :
            t === MONSTER_TYPES.POISON ? '☠️' : '🎯';
          const tn = t === MONSTER_TYPES.LIFESTEALER ? 'Lifestealer' :
            t === MONSTER_TYPES.MANASTEALER ? 'Manastealer' :
            t === MONSTER_TYPES.IMPROVER ? 'Improver' :
            t === MONSTER_TYPES.CRITMASTER ? 'Critmaster' :
            t === MONSTER_TYPES.POISON ? 'Poison' : 'Critmaster';
          return `<span>${ti} ${tn}</span>`;
        }).join(' ');
        const atkIcon = b.attackType === ATTACK_TYPES.CASTER ? '🔮' : '⚔️';
        const atkName = b.attackType === ATTACK_TYPES.CASTER ? 'Caster' : 'Melee';
        if (seen) {
          html += `<div class="bestiary-card bestiary-boss-card" style="border-left:3px solid ${theme.border}">
          <div class="bestiary-face bestiary-boss-face">${renderFace(b.face, themeIdx)}</div>
          <div class="bestiary-info">
            <div class="bestiary-name bestiary-boss-name"><span class="bestiary-boss-badge">👑 BOSS</span> ${b.name}</div>
            <div class="bestiary-meta">${bossTypesHtml} <span>${atkIcon} ${atkName}</span></div>
          </div>
        </div>`;
        } else {
          html += `<div class="bestiary-card bestiary-boss-card" style="border-left:3px solid #333;opacity:0.5;filter:grayscale(1)">
          <div class="bestiary-face bestiary-boss-face"><div class="bestiary-portrait-frame" style="background:#111;border-color:#691"><span style="font-size:28px;color:#555">🔒</span></div></div>
          <div class="bestiary-info">
            <div class="bestiary-name bestiary-boss-name" style="color:#555"><span class="bestiary-boss-badge">👑 BOSS</span> ???</div>
            <div class="bestiary-meta" style="color:#444">???</div>
          </div>
        </div>`;
        }
      }
      html += `</div>`;
    });
    grid.innerHTML = html;
  }

  function renderSpellbook() {
    const container = document.getElementById('spellbookList');
    if (!container) return;
    const cls = CLASSES[state.heroClass];
    if (!cls || !cls.spells) { container.innerHTML = '<div class="card"><div class="card-subtitle">Nejprve si vyber povolání.</div></div>'; return; }
    const subtitle = document.getElementById('spellbookSubtitle');
    if (subtitle) subtitle.textContent = `Kouzla povolání: ${cls.name}`;
    let html = '';
    cls.spells.forEach(spell => {
      const costKey = cls.resource === 'energy' ? '⚡ Energy' : '💢 Rage';
      const cdText = spell.cooldown > 0 ? `${spell.cooldown}s` : '—';
      const gcdText = spell.gcd > 0 ? `${spell.gcd}s` : '—';
      html += `<div class="spellbook-card">
        <div class="spellbook-icon"><img src="assets/spells/${spell.id}.png" alt="${spell.name}"></div>
        <div class="spellbook-info">
          <div class="spellbook-name">${spell.name}</div>
          <div class="spellbook-desc">${spell.desc}</div>
          <div class="spellbook-stats">
            <span>${costKey}: ${spell.cost}</span>
            <span>⏱️ CD: ${cdText}</span>
            <span>⚡ GCD: ${gcdText}</span>
            ${spell.needsCombo ? '<span>🔗 Combo: ✅</span>' : ''}
          </div>
        </div>
      </div>`;
    });
    container.innerHTML = html;
  }

  // ===== TALENTS (SKILL TREE) =====
  let _selectedTalentKey = null;
  let _selectedTreeId = null; // aktuálně zobrazený strom
  function getTierPoints(classId, tierIdx) {
    const cls = CLASS_SKILLS[classId];
    if (!cls) return 0;
    let total = 0;
    Object.keys(cls.trees).forEach(treeId => {
      const tree = cls.trees[treeId];
      if (tree.tiers[tierIdx]) {
        tree.tiers[tierIdx].choices.forEach(t => {
          total += getTalentLv(classId + '_' + t.k);
        });
      }
    });
    return total;
  }
  function isSkillUnlocked(t) {
    if (!t.requires) return true;
    return getSkillLv(t.requires) >= t.requiresLv;
  }
  function getBestSpellId(classId) {
    const cls = CLASS_SKILLS[classId];
    if (!cls) return null;
    // Projít všechny stromy a tiers a vrátit první odemčené kouzlo (od nejvyššího tieru)
    for (let ti = 2; ti >= 0; ti--) {
      const treeIds = Object.keys(cls.trees);
      for (const treeId of treeIds) {
        const tree = cls.trees[treeId];
        if (tree.tiers[ti]) {
          for (const t of tree.tiers[ti].choices) {
            const key = classId + '_' + t.k;
            if (getTalentLv(key) > 0) return t.k;
          }
        }
      }
    }
    return null;
  }
  function showTalentInfo(key) {
    const t = SKILL_MAP[key];
    const panel = $('skillInfoPanel');
    if (!panel || !t) { if (panel) panel.classList.add('hidden'); return; }
    const cls = getClassSkillTree();
    if (!cls) { panel.classList.add('hidden'); return; }
    const lv = getSkillLv(key);
    const realLv = getTalentLv(key);
    const maxed = realLv >= t.maxLv;
    const heroLv = state.hero.level;
    const ti = t._tierIdx;
    const tierUnlocked = ti === 0 || (ti === 1 && heroLv >= 6) || (ti === 2 && heroLv >= 12);
    const unlocked = isSkillUnlocked(t) && tierUnlocked;
    const pts = state.talentPoints || 0;
    const canInvest = pts > 0 && !maxed && unlocked;
    $('skillInfoIcon').innerHTML = t.iconImg ? `<img src="assets/spells/${t.iconImg}" style="width:64px;height:64px;object-fit:contain">` : `<span style="font-size:40px">${t.icon}</span>`;
    $('skillInfoName').textContent = t.name;
    $('skillInfoName').style.color = lv > 0 ? '#f1c40f' : unlocked ? '#eee' : '#666';
    let stats = `<span style="font-size:11px;color:${lv > 0 ? '#f1c40f' : '#888'}">${lv > 0 ? 'Naučeno' : unlocked ? 'Dostupné' : '🔒 Zamčeno'}</span><br>`;
    stats += `<span style="font-size:13px;color:#ccc">Úroveň ${lv}/${t.maxLv}${state.skillShoutBonus > 0 ? ` (${realLv} investováno)` : ''}</span><br>`;
    stats += `<span style="font-size:12px;color:#aaa">${t.desc(Math.max(lv,1))}</span><br>`;
    // Požadavky
    const reqs = [];
    if (t.requires) {
      const reqSkill = SKILL_MAP[t.requires];
      if (reqSkill) {
        const reqLv = getTalentLv(t.requires);
        reqs.push(`Vyžaduje: ${reqSkill.name} (${reqLv}/${t.requiresLv})`);
      }
    }
    if (ti === 1) reqs.push(`Vyžaduje úroveň postavy: 6`);
    if (ti === 2) reqs.push(`Vyžaduje úroveň postavy: 12`);
    if (reqs.length) stats += `<span style="font-size:10px;color:#888">${reqs.join(' · ')}</span>`;
    $('skillInfoStats').innerHTML = stats;
    // Tlačítko investovat
    let actions = '';
    if (canInvest) {
      actions = `<button class="btn btn-primary" onclick="game.investTalent('${key}')">➕ Investovat bod</button>`;
    } else if (maxed) {
      actions = `<span style="color:#2ecc71;font-size:12px">✅ Maximální úroveň</span>`;
    } else if (!unlocked) {
      actions = `<span style="color:#666;font-size:12px">🔒 Nesplňuješ požadavky</span>`;
    } else if (pts <= 0) {
      actions = `<span style="color:#888;font-size:12px">Nemáš volné talent body</span>`;
    }
    $('skillInfoActions').innerHTML = actions;
    panel.classList.remove('hidden');
  }
  function renderTalents() {
        const pts = state.talentPoints || 0;
        $('talentsPts').textContent = 'Body: ' + pts;
        const resetBtn = $('resetTalentsBtn');
        if (resetBtn) {
          const cost = 50;
          const hasSpent = Object.values(state.talentLevels).reduce((a,b)=>a+b, 0) > 0;
          resetBtn.textContent = hasSpent ? '🔄 Resetovat talenty (' + cost + '💰)' : '✅ Žádné body k resetu';
          resetBtn.disabled = !hasSpent;
        }
        const cls = getClassSkillTree();
        if (!cls) {
          $('talentSchools').innerHTML = '<div style="text-align:center;color:#888;padding:20px">Nejdřív si vyber classu</div>';
          return;
        }
        // Pokud není vybraný strom, vybrat první
        const treeIds = Object.keys(cls.trees);
        if (!_selectedTreeId || !cls.trees[_selectedTreeId]) {
          _selectedTreeId = treeIds[0];
        }
        const heroLv = state.hero.level;
        const tierUnlocked = [true, heroLv >= 6, heroLv >= 12];
        // Tlačítka stromů
        const treeTabs = treeIds.map(treeId => {
          const tree = cls.trees[treeId];
          const isActive = _selectedTreeId === treeId;
          return `<button class="tree-tab ${isActive?'active':''}" onclick="game.selectTree('${treeId}')">${tree.icon} ${tree.name}</button>`;
        }).join('');
        // Vybraný strom
        const tree = cls.trees[_selectedTreeId];
        // Sestavit grid pro aktuální strom
        const gridRows = tree.tiers.length;
        const grid = tree.tiers.map((tier, ri) => {
          const rowUnlocked = tierUnlocked[ri];
          return `<div class="talent-tier-row">
            ${tier.choices.map(t => {
              const key = cls.id + '_' + t.k;
              const lv = getSkillLv(key);
              const realLv = getTalentLv(key);
              const maxed = realLv >= t.maxLv;
              const unlocked = isSkillUnlocked(t) && rowUnlocked;
              const selected = _selectedTalentKey === key;
              return `<div class="talent-btn ${lv>0?'owned':''} ${unlocked?'clickable':''} ${maxed?'maxed':''} ${!unlocked?'btn-locked':''} ${selected?'selected':''}" onclick="game.selectTalent('${key}')">
                <div class="talent-btn-icon">${t.iconImg ? `<img src="assets/spells/${t.iconImg}" style="width:64px;height:64px;object-fit:contain">` : `<span style="font-size:40px">${t.icon}</span>`}</div>
                <div class="talent-btn-name">${t.name}</div>
                <div class="talent-btn-lv">${lv}/${t.maxLv}</div>
                <div class="talent-btn-desc">${t.desc(Math.max(lv,1))}</div>
              </div>`;
            }).join('')}
          </div>`;
        }).join('');
        $('talentSchools').innerHTML = `<div class="talent-school active ${cls.id}">
          <div class="talent-school-header">
            <span class="talent-school-icon">${cls.icon}</span>
            <span class="talent-school-name">${cls.name}</span>
          </div>
          <div class="talent-school-desc">${cls.desc}</div>
          <div class="talent-tree-tabs">${treeTabs}</div>
          <div class="talent-tree">
            <div class="talent-tree-content">${grid}</div>
          </div>
        </div>`;
        if (_selectedTalentKey) {
          showTalentInfo(_selectedTalentKey);
        } else {
          $('skillInfoPanel').classList.add('hidden');
        }
      }
      function selectTree(treeId) {
        _selectedTreeId = treeId;
        _selectedTalentKey = null;
        renderTalents();
      }
      function selectTalent(key) {
        _selectedTalentKey = key;
        renderTalents();
      }
      function investTalent(key) {
        const pts = state.talentPoints || 0;
        if (pts <= 0) return;
        const t = SKILL_MAP[key];
        if (!t) return;
        const realLv = getTalentLv(key);
        if (realLv >= t.maxLv) return;
        state.talentLevels[key] = realLv + 1;
        state.talentPoints = pts - 1;
        saveGame();
        updateTalentBadge();
        _selectedTalentKey = key;
        renderTalents();
      }
      function resetTalents() {
        const cost = 50;
        if ((state.hero.gold || 0) < cost) { showMessage('💰 Nedostatek zlatých!'); return; }
        let total = 0;
        Object.keys(state.talentLevels).forEach(k => { total += state.talentLevels[k]; state.talentLevels[k] = 0; });
        if (total === 0) return;
        state.hero.gold -= cost;
        state.talentPoints = (state.talentPoints || 0) + total;
        saveGame();
        updateTalentBadge();
        renderTalents();
        renderHero();
        showMessage('🔄 Talenty resetovány! Získal jsi zpět ' + total + ' bodů.');
      }

  // ===== HERO =====
  // Snížit XP potřebu na prvních levelech
  function applyLevelUp() {
    const h = state.hero;
    const prevLevel = h.level;
    let leveled = false;
    let safety = 0;
    while (true) {
      if (safety++ > 100) break;
      // Level 1->2: 40 XP, 2->3: 80 XP, pak standard 80/level
      const xpNeeded = h.level <= 2 ? h.level * 40 : h.level * 80;
      if (h.xp < xpNeeded) break;
      h.xp -= xpNeeded;
      h.level++;
      h.maxHp = getHeroMaxHp();
      h.baseDmg = getHeroDmg();
      h.hp = h.maxHp; // full heal při levelu
      h.attrPoints = (h.attrPoints || 0) + 5;
      state.talentPoints = (state.talentPoints || 0) + 1;
      leveled = true;
    }
    if (leveled) {
      sfxLevelUp();
      saveGame();
      showLevelUpOverlay(prevLevel);
    }
    updateTalentBadge();
    return leveled;
  }
  function updateTalentBadge() {
    const badge = $('talentBadge');
    if (!badge) return;
    const pts = state.talentPoints || 0;
    if (pts > 0) {
      badge.textContent = pts;
      badge.classList.add('visible');
    } else {
      badge.classList.remove('visible');
    }
  }
  function getEquipAttrs() {
    const h = state.hero;
    const slots = ['weapon','armor','helmet','shield','ring1','ring2','amulet','belt'];
    const defaults = { weapon:'fists', armor:null, helmet:null, shield:null, ring1:null, amulet:null };
    const total = { str:0, vit:0, dex:0, int:0 };
    slots.forEach(slot => {
      const itemId = h.equip[slot];
      if (!itemId || itemId === defaults[slot]) return;
      const item = ITEM_MAP[itemId];
      if (item && item.attrs) {
        Object.keys(item.attrs).forEach(k => {
          total[k] = (total[k] || 0) + item.attrs[k];
        });
      }
    });
    return total;
  }
  function getHeroDmg() {
    const h = state.hero;
    const weapon = ITEM_MAP[h.equip.weapon] || ITEM_MAP['fists'];
    const ring1 = ITEM_MAP[h.equip.ring1];
    const ring2 = ITEM_MAP[h.equip.ring2];
    const amulet = ITEM_MAP[h.equip.amulet];
    const ringDmg = 0; // prsteny a amulety nemají baseDmg, jen affixy
    const eqAttrs = getEquipAttrs();
    return Math.max(1, 5 + Math.floor(h.level * 2) + weapon.baseDmg + ringDmg + ((h.attrStr||0) + eqAttrs.str) * 1);
  }
  function getHeroMaxHp() {
    const h = state.hero;
    const armor = ITEM_MAP[h.equip.armor];
    const helmet = ITEM_MAP[h.equip.helmet];
    const shield = ITEM_MAP[h.equip.shield];
    const ring1 = ITEM_MAP[h.equip.ring1];
    const ring2 = ITEM_MAP[h.equip.ring2];
    const amulet = ITEM_MAP[h.equip.amulet];
    const belt = ITEM_MAP[h.equip.belt];
    const bonus = (armor ? armor.bonusHp||0 : 0) + (helmet ? helmet.bonusHp||0 : 0) + (shield ? shield.bonusHp||0 : 0) + (ring1 ? ring1.bonusHp||0 : 0) + (ring2 ? ring2.bonusHp||0 : 0) + (amulet ? amulet.bonusHp||0 : 0) + (belt ? belt.bonusHp||0 : 0);
    const eqAttrs = getEquipAttrs();
    return Math.max(1, 100 + Math.floor(h.level * 10) + bonus + ((h.attrVit||0) + eqAttrs.vit) * 10);
  }
  function getHeroMaxMana() {
    const h = state.hero;
    const weapon = ITEM_MAP[h.equip.weapon] || ITEM_MAP['fists'];
    const armor = ITEM_MAP[h.equip.armor];
    const helmet = ITEM_MAP[h.equip.helmet];
    const shield = ITEM_MAP[h.equip.shield];
    const ring1 = ITEM_MAP[h.equip.ring1];
    const ring2 = ITEM_MAP[h.equip.ring2];
    const amulet = ITEM_MAP[h.equip.amulet];
    const belt = ITEM_MAP[h.equip.belt];
    const bonus = (weapon.bonusMana||0) + (armor ? armor.bonusMana||0 : 0) + (helmet ? helmet.bonusMana||0 : 0) + (shield ? shield.bonusMana||0 : 0) + (ring1 ? ring1.bonusMana||0 : 0) + (ring2 ? ring2.bonusMana||0 : 0) + (amulet ? amulet.bonusMana||0 : 0) + (belt ? belt.bonusMana||0 : 0);
    return Math.max(10, 50 + ((h.attrInt||0) + getEquipAttrs().int) * 10 + bonus);
  }
  const ATTR_COST = [5, 10, 20, 35, 55, 80, 110, 150, 200, 260, 330, 410, 500];
  function renderHero() {
    const h = state.hero;
    const cls = getClassSkillTree();
    const totalSkillPoints = Object.values(state.talentLevels).reduce((a,b)=>a+b, 0);
    $('heroName').textContent = h.name || 'Dobrodruh';
    $('heroLevel').textContent = `Lv.${h.level}`;
    $('heroDeaths').textContent = state.deaths;
    $('heroWins').textContent = state.wins;
    // Class label
    const classNames = { barbarian:'⚔️ Barbar', assassin:'🗡️ Assassin', mage:'🔮 Kouzelník' };
    $('heroClassLabel').textContent = classNames[state.heroClass] || '⚔️ Dobrodruh';
    // XP bar
    const xpNeeded = h.level * 80;
    const xpPct = Math.min((h.xp / xpNeeded) * 100, 100);
    $('heroXpLabel').textContent = `${h.xp}/${xpNeeded}`;
    $('heroXpBar').style.width = xpPct + '%';
    // Portrét
    const faceFile = h.face || 'hero';
    const portraitImg = $('heroPortraitImg');
    if (portraitImg) portraitImg.src = `assets/monsters/${faceFile}.png`;
    const mbPortraitImg = $('mbHeroPortraitImg');
    if (mbPortraitImg) mbPortraitImg.src = `assets/monsters/${faceFile}.png`;
    const navHeroIcon = $('navHeroIcon');
    if (navHeroIcon) navHeroIcon.src = `assets/monsters/${faceFile}.png`;
    // Detail grid
    const dmg = getHeroDmg();
    const weapon = ITEM_MAP[h.equip.weapon] || ITEM_MAP['fists'];
    const critChance = weapon.critChance || 0;
    const shieldItem = ITEM_MAP[h.equip.shield];
    const blockChance = shieldItem ? (shieldItem.blockChance || 0) : 0;
    const armorDef = (ITEM_MAP[h.equip.armor] ? ITEM_MAP[h.equip.armor].defense || 0 : 0);
    const helmetDef = ITEM_MAP[h.equip.helmet]?.defense || 0;
    const shieldDef = ITEM_MAP[h.equip.shield]?.defense || 0;
    const totalDef = armorDef + helmetDef + shieldDef;
    const defPct = Math.round(100 - 10000 / (100 + totalDef));
    const dex = (h.attrDex || 0) + (getEquipAttrs().dex || 0);
    const dodgePct = Math.min(50, Math.round(dex * 0.5));
    const hitChance = Math.min(95, 80 + Math.round(dex * 0.3));
    $('heroDetailDmg').textContent = dmg;
    $('heroDetailDef').textContent = `${totalDef} (${defPct}%)`;
    $('heroDetailCrit').textContent = critChance > 0 ? `${critChance}% (×2.0)` : `0%`;
    $('heroDetailBlock').textContent = `${blockChance}%`;
    $('heroDetailDodge').textContent = `${dodgePct}%`;
    $('heroDetailHit').textContent = `${hitChance}%`;
    $('heroDetailHp').textContent = `${h.hp || h.maxHp}/${h.maxHp}`;
    $('heroDetailMana').textContent = `${h.mana || h.maxMana}/${h.maxMana}`;
    // Atributy
    const pts = h.attrPoints || 0;
    $('heroAttrStr').textContent = (h.attrStr||0) + (getEquipAttrs().str > 0 ? ` (+${getEquipAttrs().str})` : '');
    $('heroAttrVit').textContent = (h.attrVit||0) + (getEquipAttrs().vit > 0 ? ` (+${getEquipAttrs().vit})` : '');
    $('heroAttrDex').textContent = (h.attrDex||0) + (getEquipAttrs().dex > 0 ? ` (+${getEquipAttrs().dex})` : '');
    $('heroAttrInt').textContent = (h.attrInt||0) + (getEquipAttrs().int > 0 ? ` (+${getEquipAttrs().int})` : '');
    $('heroAttrPts').textContent = pts;
    ['Str','Vit','Dex','Int'].forEach(a => {
      const btn = $(`heroUp${a}`);
      if (btn) {
        btn.textContent = `⬆️` + (pts > 0 ? '' : ` 🔒`);
        btn.style.opacity = pts > 0 ? '1' : '0.3';
      }
    });
    // Aktivní škola
    const schoolInfo = $('activeSchoolInfo');
    if (schoolInfo) {
      const active = state.activeSchool ? (getClassSkillTree().schools || []).find(s => s.id === state.activeSchool) : null;
      const schoolLv = active ? (state.talentLevels[active.id] || 0) : 0;
      schoolInfo.textContent = active ? `${active.icon} ${active.name} — Lv.${schoolLv}/5` : 'Žádná — přidej talentové body v 🎓 Talent Tree';
    }
  }

  function renameHero() {
    const h = state.hero;
    const currentName = h.name || 'Dobrodruh';
    const newName = prompt('Zadej nové jméno hrdiny:', currentName);
    if (newName && newName.trim().length > 0 && newName.trim() !== currentName) {
      h.name = newName.trim().substring(0, 20);
      saveGame();
      renderHero();
    }
  }

  const HERO_FACES = [
    {id:'hero'},
    {id:'hero_warrior_f'},
    {id:'hero_mage_m'},
    {id:'hero_mage_f'},
    {id:'hero_barbarian_m'},
    {id:'hero_barbarian_f'},
    {id:'hero_rogue_m'},
    {id:'hero_rogue_f'},
    {id:'hero_paladin_m'},
    {id:'hero_paladin_f'},
  ];

  function showFaceSelect() {
    const overlay = $('faceSelectOverlay');
    const grid = $('faceSelectGrid');
    if (!overlay || !grid) return;
    grid.innerHTML = HERO_FACES.map(f => {
      const current = (state.hero.face || 'hero') === f.id;
      return `<div onclick="game.selectFace('${f.id}')" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;padding:6px;border-radius:8px;background:${current ? '#2a2a2a' : '#1a1a1a'};border:2px solid ${current ? '#4a7dff' : 'transparent'};transition:all 0.2s">
        <div style="width:72px;height:72px;border-radius:50%;overflow:hidden;border:2px solid #4a7dff;display:flex;align-items:center;justify-content:center;background:#0a0a0a">
          <img src="assets/monsters/${f.id}.png" alt="" style="width:100%;height:100%;object-fit:cover;display:block"/>
        </div>
      </div>`;
    }).join('');
    overlay.classList.remove('hidden');
  }

  function closeFaceSelect() {
    const overlay = $('faceSelectOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  function selectFace(id) {
    state.hero.face = id;
    saveGame();
    renderHero();
    closeFaceSelect();
  }

  function upgradeAttr(attr) {
    const h = state.hero;
    if ((h.attrPoints||0) <= 0) { showMessage('❌ Nemáš žádné atributové body!'); return; }
    h.attrPoints--;
    if (attr === 'str') {
      h.attrStr = (h.attrStr||0) + 1;
      h.baseDmg = getHeroDmg();
      showMessage('💪 Síla +1! Poškození zvýšeno!');
    } else if (attr === 'dex') {
      h.attrDex = (h.attrDex||0) + 1;
      showMessage('🎯 Obratnost +1! Crit okno zvětšeno!');
    } else if (attr === 'int') {
      h.attrInt = (h.attrInt||0) + 1;
      h.maxMana = getHeroMaxMana();
      h.mana = h.maxMana;
      showMessage('🧠 Intelekt +1! Max many +10!');
    } else {
      h.attrVit = (h.attrVit||0) + 1;
      h.maxHp = getHeroMaxHp();
      h.hp = h.maxHp;
      showMessage('❤️ Vitalita +1! Max HP zvýšeno!');
    }
    saveGame();
    renderHero();
  }

  // ===== SHOP =====
  let _shopTab = 'buy';

  function switchShopTab(tab) {
    _shopTab = tab;
    document.querySelectorAll('.shop-tab').forEach(t => t.classList.toggle('active', t.dataset.shopTab === tab));
    renderShop();
  }

  function renderShop() {
    const h = state.hero;
    $('shopGold').textContent = `💰 ${h.gold} zlatých`;
    if (_shopTab === 'sell') {
      const equipSet = new Set(Object.values(h.equip).filter(Boolean));
      const sellable = h.inventory.filter(id => !equipSet.has(id));
      if (sellable.length === 0) {
        $('shopList').innerHTML = '<div style="text-align:center;padding:30px;color:#666">📦 Nemáš nic na prodej</div>';
        return;
      }
      $('shopList').innerHTML = sellable.map(itemId => {
        const item = ITEM_MAP[itemId];
        if (!item) return '';
        let stats = '';
        if (item.type === 'weapon') {
          const handLabel = item.twoHand ? ' [2H]' : ' [1H]';
          stats = `⚔️+${item.baseDmg} dmg${handLabel}`;
        }
        else if (item.type === 'ring') stats = '';
        else if (item.type === 'amulet') stats = '';
        else if (item.type === 'consumable') stats = `🧪 ${item.subtype === 'heal' ? 'Léčí' : 'Obnovuje'} ${item.effectValue} ${item.subtype === 'heal' ? 'HP' : 'many'}`;
        else stats = `❤️+${item.bonusHp} HP`;
        // Affix názvy
        if (item.affixes && item.affixes.length) {
          stats += '<br><span style="font-size:10px;color:#aaa">' + item.affixes.map(a => a.name).join(' · ') + '</span>';
        }
        // Affix staty
        const affixStats = [];
        if (item.fireDmg) affixStats.push(`🔥+${item.fireDmg}`);
        if (item.iceDmg) affixStats.push(`❄️+${item.iceDmg}`);
        if (item.poisonDmg) affixStats.push(`☠️+${item.poisonDmg}`);
        if (item.lifesteal) affixStats.push(`🩸+${item.lifesteal}%`);
        if (item.manaSteal) affixStats.push(`💜+${item.manaSteal}%`);
        if (item.attackRating) affixStats.push(`🎯+${item.attackRating}`);
        if (item.skillDmg) affixStats.push(`✨+${item.skillDmg}%`);
        if (item.manaRegen) affixStats.push(`💧+${item.manaRegen}/t`);
        if (item.bonusMana) affixStats.push(`💧+${item.bonusMana}`);
        if (item.swingMs && item.swingMs < 0) affixStats.push(`⚡${item.swingMs}ms`);
        if (item.enhancedDefense) affixStats.push(`🛡️+${item.enhancedDefense}% obrana`);
        if (item.enhancedDmg) affixStats.push(`⚔️+${item.enhancedDmg}% dmg`);
        if (item.defense) affixStats.push(`🛡️+${item.defense}`);
        if (item.blockChance) affixStats.push(`🛡️${item.blockChance}%`);
        if (item.critChance) affixStats.push(`🎯${item.critChance}%`);
        if (affixStats.length) stats += '<br><span style="font-size:10px;color:#ccc">' + affixStats.join(' · ') + '</span>';
        const sellPrice = Math.round(item.cost * 0.5);
        return `<div class="shop-item">
          <div class="shop-item-header">
            <div class="shop-item-name">${renderItemIcon(item,64)}${item.name}</div>
            <div class="shop-item-stats"><span class="stat-line">${stats}</span></div>
          </div>
          <div class="shop-item-actions">
            <span class="price">💰 ${sellPrice}</span>
            <button class="btn btn-primary" style="width:auto;padding:8px 18px;font-size:13px" onclick="game.sellItem('${item.id}')">Prodat</button>
          </div>
        </div>`;
      }).join('');
    } else {
      $('shopList').innerHTML = ITEMS.filter(i => i.cost > 0 && i.tier === 1 && i.type !== 'ring' && i.type !== 'amulet').map(item => {
        const owned = h.inventory.includes(item.id) || h.equip.weapon === item.id || h.equip.armor === item.id || h.equip.helmet === item.id || h.equip.ring1 === item.id || h.equip.ring2 === item.id || h.equip.amulet === item.id || h.equip.belt === item.id;
        const canBuy = h.gold >= item.cost && !owned;
        let stats = '';
        if (item.type === 'weapon') {
          const handLabel = item.twoHand ? ' [2H]' : ' [1H]';
          stats = `⚔️+${item.baseDmg} dmg${handLabel}`;
        }
        else if (item.type === 'ring') stats = '';
        else if (item.type === 'amulet') stats = '';
        else if (item.type === 'consumable') stats = `🧪 ${item.subtype === 'heal' ? 'Léčí' : 'Obnovuje'} ${item.effectValue} ${item.subtype === 'heal' ? 'HP' : 'many'}`;
        else stats = `❤️+${item.bonusHp} HP`;
        // Extra staty pro base itemy
        const extraStats = [];
        if (item.defense) extraStats.push(`🛡️+${item.defense}`);
        if (item.blockChance) extraStats.push(`🛡️${item.blockChance}%`);
        if (item.critChance) extraStats.push(`🎯${item.critChance}%`);
        if (item.bonusMana) extraStats.push(`💧+${item.bonusMana}`);
        if (item.beltSlots) extraStats.push(`🎗️${item.beltSlots} slotů`);
        if (item.swingMs) extraStats.push(`⚡${item.swingMs}ms`);
        if (extraStats.length) stats += '<br><span style="font-size:10px;color:#ccc">' + extraStats.join(' · ') + '</span>';
        return `<div class="shop-item" style="opacity:${owned?'0.4':'1'}">
          <div class="shop-item-header">
            <div class="shop-item-name">${renderItemIcon(item,64)}${item.name}</div>
            <div class="shop-item-stats"><span class="stat-line">${stats}</span></div>
          </div>
          <div class="shop-item-actions">
            <span class="price">💰 ${item.cost}</span>
            ${owned ? '<span style="color:#2ecc71">✅ Vlastníš</span>' : canBuy ? `<button class="btn btn-primary" style="width:auto;padding:8px 18px;font-size:13px" onclick="game.buyItem('${item.id}')">Koupit</button>` : `<button class="btn btn-primary" style="width:auto;padding:8px 18px;font-size:13px;opacity:0.3;pointer-events:none" onclick="game.buyItem('${item.id}')">Koupit</button>`}
          </div>
        </div>`;
      }).join('');
    }
  }

  function buyItem(itemId) {
    const item = ITEM_MAP[itemId];
    if (!item) return;
    const h = state.hero;
    if (h.gold < item.cost) { showMessage('❌ Nemáš dost zlata!'); return; }
    if (h.inventory.includes(itemId)) { showMessage('❌ Už to máš!'); return; }
    h.gold -= item.cost;
    h.inventory.push(itemId);
    saveGame();
    showMessage(`✅ Koupil jsi ${item.icon} ${item.name}!`);
    renderShop();
  }

  function sellItem(itemId) {
    const item = ITEM_MAP[itemId];
    if (!item || item.cost === 0) return;
    const h = state.hero;
    const idx = h.inventory.indexOf(itemId);
    if (idx === -1) { showMessage('❌ Tento předmět nemáš v inventáři!'); return; }
    const sellPrice = Math.round(item.cost * 0.5);
    h.inventory.splice(idx, 1);
    h.gold += sellPrice;
    saveGame();
    showMessage(`💰 Prodáno ${item.icon} ${item.name} za ${sellPrice}💰`);
    renderShop();
  }

  function sellSlotItem(itemId, slot) {
    const h = state.hero;
    const defaults = { weapon:'fists', armor:null, helmet:null, shield:null, ring1:null, amulet:null };
    if (h.equip[slot] !== itemId) return;
    const item = ITEM_MAP[itemId];
    if (!item) return;
    // Získat gold
    h.equip[slot] = defaults[slot];
    // Při prodeji beltu vrátit potiony
    if (slot === 'belt') {
      const bpSlots = h.equip.beltPotionSlots || [];
      bpSlots.forEach(potId => { if (potId) h.inventory.push(potId); });
      h.equip.beltPotionSlots = [];
    }
    h.gold += sellPrice;
    h.baseDmg = getHeroDmg();
    h.maxHp = getHeroMaxHp();
    h.hp = h.maxHp;
    saveGame();
    renderInventory();
    renderHero();
  }

  function setSlotBorder(slotId, item) {
    const el = $(slotId);
    if (!el) return;
    if (item && item.rarity) {
      const r = RARITY[item.rarity] || RARITY.common;
      el.style.borderColor = r.border;
    } else if (item) {
      // item exists but no rarity (fists, rags) — neutral gray
      el.style.borderColor = '#4a4a4a';
    } else {
      // empty slot — darker dashed gray
      el.style.borderColor = '#3a3a3a';
    }
  }
  // ===== INVENTORY =====
  function renderInventory() {
    const h = state.hero;
    // Equipment sloty — 6 slotů
    const weapon = ITEM_MAP[h.equip.weapon] || ITEM_MAP['fists'];
    const armor = ITEM_MAP[h.equip.armor];
    const helmet = ITEM_MAP[h.equip.helmet];
    const shield = ITEM_MAP[h.equip.shield];
    const ring1 = ITEM_MAP[h.equip.ring1];
    const ring2 = ITEM_MAP[h.equip.ring2];
    const amulet = ITEM_MAP[h.equip.amulet];
    const belt = ITEM_MAP[h.equip.belt];
    $('invSlotWeaponIcon').innerHTML = h.equip.weapon === 'fists' ? renderItemIcon({iconImg:'assets/items/weapon_iron_sword.png',tier:1}, 0) : renderItemIcon(weapon, 0);
    $('invSlotWeapon').classList.toggle('empty', h.equip.weapon === 'fists');
    setSlotBorder('invSlotWeapon', weapon);
    $('invSlotArmorIcon').innerHTML = !h.equip.armor ? renderItemIcon({iconImg:'assets/items/armor_leather.png',tier:1}, 0) : renderItemIcon(armor, 0);
    $('invSlotArmor').classList.toggle('empty', !h.equip.armor);
    setSlotBorder('invSlotArmor', armor);
    const hEl = $('invSlotHelmetIcon'); if (hEl) hEl.innerHTML = helmet ? renderItemIcon(helmet, 0) : renderItemIcon({iconImg:'assets/items/helmet_linen_hood.png',tier:1}, 0);
    const hS = $('invSlotHelmet'); if (hS) { hS.classList.toggle('empty', !helmet); setSlotBorder('invSlotHelmet', helmet); }
    const sEl = $('invSlotShieldIcon'); if (sEl) sEl.innerHTML = shield ? renderItemIcon(shield, 0) : renderItemIcon({iconImg:'assets/items/shield_wooden.png',tier:1}, 0);
    const sS = $('invSlotShield'); if (sS) { sS.classList.toggle('empty', !shield); setSlotBorder('invSlotShield', shield); }
    const offhand = ITEM_MAP[h.equip.shield];
    const oEl = $('invSlotShieldIcon'); if (oEl) oEl.innerHTML = offhand ? renderItemIcon(offhand, 0) : renderItemIcon({iconImg:'assets/items/weapon_hunting_knife.png',tier:1}, 0);
    const oS = $('invSlotShield'); if (oS) { oS.classList.toggle('empty', !offhand); setSlotBorder('invSlotShield', offhand); }
    const r1El = $('invSlotRing1Icon'); if (r1El) r1El.innerHTML = ring1 ? renderItemIcon(ring1, 0) : renderItemIcon({iconImg:'assets/items/ring_copper.png',tier:1}, 0);
    const r1S = $('invSlotRing1'); if (r1S) { r1S.classList.toggle('empty', !ring1); setSlotBorder('invSlotRing1', ring1); }
    const r2El = $('invSlotRing2Icon'); if (r2El) r2El.innerHTML = ring2 ? renderItemIcon(ring2, 0) : renderItemIcon({iconImg:'assets/items/ring_copper.png',tier:1}, 0);
    const r2S = $('invSlotRing2'); if (r2S) { r2S.classList.toggle('empty', !ring2); setSlotBorder('invSlotRing2', ring2); }
    const amEl = $('invSlotAmuletIcon'); if (amEl) amEl.innerHTML = amulet ? renderItemIcon(amulet, 0) : renderItemIcon({iconImg:'assets/items/amulet_bone.png',tier:1}, 0);
    const amS = $('invSlotAmulet'); if (amS) { amS.classList.toggle('empty', !amulet); setSlotBorder('invSlotAmulet', amulet); }
    const bEl = $('invSlotBeltIcon'); if (bEl) bEl.innerHTML = belt ? renderItemIcon(belt, 0) : renderItemIcon({iconImg:'assets/items/belt_cloth.png',tier:1}, 0);
    const bS = $('invSlotBelt'); if (bS) { bS.classList.toggle('empty', !belt); setSlotBorder('invSlotBelt', belt); }
    // Potion sloty podle beltSlots
    const potionSlots = $('invPotionSlots');
    if (potionSlots) {
      const beltSlots = belt ? (belt.beltSlots || 0) : 0;
      const bpSlots = h.equip.beltPotionSlots || [];
      let phtml = '';
      for (let i = 0; i < beltSlots; i++) {
        const potId = bpSlots[i];
        const potItem = potId ? ITEM_MAP[potId] : null;
        phtml += `<div class="inv-potion-slot ${potItem ? '' : 'empty'}" data-potion-idx="${i}">
          <div class="inv-slot-icon">${potItem ? renderItemIcon(potItem, 0) : '🧪'}</div>
        </div>`;
      }
      potionSlots.innerHTML = phtml;
    }
    // Grid batohu — 4 sloupce, max 20 buněk
    const grid = $('invGrid');
    const inv = h.inventory || [];
    const maxCells = 20;
    let html = '';
    for (let i = 0; i < maxCells; i++) {
      const itemId = inv[i];
      if (itemId) {
        const item = ITEM_MAP[itemId];
        if (!item) { html += '<div class="inv-grid-cell empty"></div>'; continue; }
        const stats = item.type === 'weapon' ? `⚔️${item.baseDmg}` : item.type === 'ring' ? '' : item.type === 'amulet' ? '' : `❤️${item.bonusHp}`;
        const r = RARITY[item.rarity] || RARITY.common;
        html += `<div class="inv-grid-cell" data-idx="${i}" draggable="true" style="border-color:${r.border}">
          <div class="cell-icon">${renderItemIcon(item,0)}</div>
          <div class="cell-name" style="color:${r.color}">${item.name}</div>
        </div>`;
      } else {
        html += '<div class="inv-grid-cell empty"></div>';
      }
    }
    grid.innerHTML = html;
    // Tlačítko zpět do obchodu — viditelné jen když jsme přišli ze shopu
    const shopBack = $('invShopBack');
    if (shopBack) {
      shopBack.classList.toggle('hidden', !_fromShop);
    }
    // Info panel — zobrazit při kliknutí na item
    function showItemInfo(item) {
      const panel = $('invInfoPanel');
      if (!panel || !item) { if (panel) panel.classList.add('hidden'); return; }
      $('invInfoIcon').innerHTML = renderItemIcon(item, 48);
      $('invInfoName').textContent = item.name;
      const r = RARITY[item.rarity] || RARITY.common;
      $('invInfoName').style.color = r.color;
      let stats = `<span style="color:${r.color};font-size:11px">${r.name}</span><br>`;
      // Zobrazit názvy affixů
      if (item.affixes && item.affixes.length) {
        stats += '<span style="font-size:10px;color:#aaa">' + item.affixes.map(a => a.name).join(' · ') + '</span><br>';
      }
      if (item.type === 'weapon') {
        const handLabel = item.twoHand ? ' [2H]' : ' [1H]';
        stats += `⚔️ +${item.baseDmg} poškození${handLabel}`;
        if (item.critChance) stats += ` · 🎯 ${item.critChance}% krit (×2.0)`;
      }
      else if (item.type === 'armor') stats += `❤️ +${item.bonusHp} HP · 🛡️ +${item.defense||0} Defense`;
      else if (item.type === 'helmet') stats += `❤️ +${item.bonusHp} HP · 🛡️ +${item.defense||0} Defense`;
      else if (item.type === 'shield') stats += `🛡️ ${item.blockChance||0}% blok · ❤️ +${item.bonusHp||0} HP · 🛡️ +${item.defense||0} Defense`;
      else if (item.type === 'ring') stats += ``;
      else if (item.type === 'amulet') stats += ``;
      else if (item.type === 'belt') stats += `🎗️ ${item.beltSlots||0} slotů na potiony · ❤️ +${item.bonusHp||0} HP`;
      else if (item.type === 'consumable') stats += `🧪 ${item.subtype === 'heal' ? 'Léčí' : 'Obnovuje'} ${item.effectValue} ${item.subtype === 'heal' ? 'HP' : 'many'}`;
      if (item.weaponType === 'staff') stats += ' 🪄 magická';
      else if (item.weaponType === 'blade') stats += ' ⚔️ fyzická';
      // Affix staty — zobrazit všechny nenulové
      const affixStats = [];
      if (item.fireDmg) affixStats.push(`🔥 +${item.fireDmg} ohnivé dmg`);
      if (item.iceDmg) affixStats.push(`❄️ +${item.iceDmg} ledové dmg`);
      if (item.poisonDmg) affixStats.push(`☠️ +${item.poisonDmg} jedové dmg`);
      if (item.lifesteal) affixStats.push(`🩸 +${item.lifesteal}% lifesteal`);
      if (item.manaSteal) affixStats.push(`💜 +${item.manaSteal}% many/útok`);
      if (item.attackRating) affixStats.push(`🎯 +${item.attackRating} hit rating`);
      if (item.skillDmg) affixStats.push(`✨ +${item.skillDmg}% skill dmg`);
      if (item.manaRegen) affixStats.push(`💧 +${item.manaRegen} many/tick`);
      if (item.bonusMana) affixStats.push(`💧 +${item.bonusMana} many`);
      if (item.swingMs && item.swingMs < 0) affixStats.push(`⚡ ${item.swingMs}ms swing`);
      if (item.enhancedDefense) affixStats.push(`🛡️ +${item.enhancedDefense}% obrana`);
      if (item.enhancedDmg) affixStats.push(`⚔️ +${item.enhancedDmg}% poškození`);
      if (affixStats.length) stats += '<br>' + affixStats.join(' · ');
      if (item.attrs) {
        const attrStr = Object.keys(item.attrs).map(k => {
          const names = { str:'💪 Síla', vit:'❤️ Vitalita', dex:'🎯 Obratnost', int:'🧠 Intelekt' };
          return `${names[k]||k}+${item.attrs[k]}`;
        }).join(' · ');
        stats += '<br>' + attrStr;
      }
      if (item.cost) stats += ` · 💰 ${item.cost}`;
      $('invInfoStats').innerHTML = stats;
      panel.style.borderColor = r.border;
      // Srovnávací panel — border podle rarity vybraného itemu
      const cp = $('invComparePanel');
      if (cp) cp.style.borderColor = r.border;
      panel.classList.remove('hidden');

      // Srovnávací panel — nasazený předmět stejného slotu
      const comparePanel = $('invComparePanel');
      if (!comparePanel) return;
      const slotMap = { weapon:'weapon', armor:'armor', helmet:'helmet', shield:'shield', ring:'ring1', belt:'belt', amulet:'amulet' };
      const equipSlot = slotMap[item.type];
      if (!equipSlot) { comparePanel.classList.add('hidden'); return; }
      const defaults = { weapon:'fists', armor:null, helmet:null, shield:null, ring1:null, ring2:null, amulet:null, belt:null };
      // Speciální případ: prsten — zkontrolovat oba sloty
      if (item.type === 'ring') {
        const ring1Id = state.hero.equip.ring1;
        const ring2Id = state.hero.equip.ring2;
        const ring1 = ring1Id ? ITEM_MAP[ring1Id] : null;
        const ring2 = ring2Id ? ITEM_MAP[ring2Id] : null;
        // Zobrazit oba nasazené prsteny (pokud existují) se staty
        let bothHtml = '';
        if (ring1) {
          const er1 = RARITY[ring1.rarity] || RARITY.common;
          let s1 = `<span style="color:${er1.color};font-size:11px">${er1.name}</span><br>`;
          if (ring1.affixes && ring1.affixes.length) s1 += '<span style="font-size:10px;color:#aaa">' + ring1.affixes.map(a => a.name).join(' · ') + '</span><br>';
          s1 += ``; // prsteny nemají base staty, jen affixy
          const a1 = [];
          if (ring1.fireDmg) a1.push(`🔥 +${ring1.fireDmg} ohnivé dmg`);
          if (ring1.iceDmg) a1.push(`❄️ +${ring1.iceDmg} ledové dmg`);
          if (ring1.poisonDmg) a1.push(`☠️ +${ring1.poisonDmg} jedové dmg`);
          if (ring1.lifesteal) a1.push(`🩸 +${ring1.lifesteal}% lifesteal`);
          if (ring1.manaSteal) a1.push(`💜 +${ring1.manaSteal}% many/útok`);
          if (ring1.attackRating) a1.push(`🎯 +${ring1.attackRating} hit rating`);
          if (ring1.skillDmg) a1.push(`✨ +${ring1.skillDmg}% skill dmg`);
          if (ring1.manaRegen) a1.push(`💧 +${ring1.manaRegen} many/tick`);
          if (ring1.bonusMana) a1.push(`💧 +${ring1.bonusMana} many`);
          if (ring1.enhancedDefense) a1.push(`🛡️ +${ring1.enhancedDefense}% obrana`);
          if (ring1.enhancedDmg) a1.push(`⚔️ +${ring1.enhancedDmg}% poškození`);
          if (ring1.swingMs && ring1.swingMs < 0) a1.push(`⚡ ${ring1.swingMs}ms swing`);
          if (ring1.defense) a1.push(`🛡️ +${ring1.defense}`);
          if (ring1.critChance) a1.push(`🎯 ${ring1.critChance}%`);
          if (a1.length) s1 += '<br><span style="font-size:10px;color:#ccc">' + a1.join(' · ') + '</span>';
          if (ring1.attrs) {
            const attrStr = Object.keys(ring1.attrs).map(k => { const names = { str:'💪 Síla', vit:'❤️ Vitalita', dex:'🎯 Obratnost', int:'🧠 Intelekt' }; return `${names[k]||k}+${ring1.attrs[k]}`; }).join(' · ');
            s1 += '<br>' + attrStr;
          }
          bothHtml += `<div class="inv-compare-ring"><div class="inv-compare-ring-icon">${renderItemIcon(ring1, 36)}</div><div class="inv-compare-ring-stats"><div class="inv-compare-ring-name" style="color:${er1.color}">${ring1.name}</div><div style="font-size:10px;color:#ccc;line-height:1.4">${s1}</div></div></div>`;
        }
        if (ring2) {
          const er2 = RARITY[ring2.rarity] || RARITY.common;
          let s2 = `<span style="color:${er2.color};font-size:11px">${er2.name}</span><br>`;
          if (ring2.affixes && ring2.affixes.length) s2 += '<span style="font-size:10px;color:#aaa">' + ring2.affixes.map(a => a.name).join(' · ') + '</span><br>';
          s2 += ``; // prsteny nemají base staty, jen affixy
          const a2 = [];
          if (ring2.fireDmg) a2.push(`🔥 +${ring2.fireDmg} ohnivé dmg`);
          if (ring2.iceDmg) a2.push(`❄️ +${ring2.iceDmg} ledové dmg`);
          if (ring2.poisonDmg) a2.push(`☠️ +${ring2.poisonDmg} jedové dmg`);
          if (ring2.lifesteal) a2.push(`🩸 +${ring2.lifesteal}% lifesteal`);
          if (ring2.manaSteal) a2.push(`💜 +${ring2.manaSteal}% many/útok`);
          if (ring2.attackRating) a2.push(`🎯 +${ring2.attackRating} hit rating`);
          if (ring2.skillDmg) a2.push(`✨ +${ring2.skillDmg}% skill dmg`);
          if (ring2.manaRegen) a2.push(`💧 +${ring2.manaRegen} many/tick`);
          if (ring2.bonusMana) a2.push(`💧 +${ring2.bonusMana} many`);
          if (ring2.enhancedDefense) a2.push(`🛡️ +${ring2.enhancedDefense}% obrana`);
          if (ring2.enhancedDmg) a2.push(`⚔️ +${ring2.enhancedDmg}% poškození`);
          if (ring2.swingMs && ring2.swingMs < 0) a2.push(`⚡ ${ring2.swingMs}ms swing`);
          if (ring2.defense) a2.push(`🛡️ +${ring2.defense}`);
          if (ring2.critChance) a2.push(`🎯 ${ring2.critChance}%`);
          if (a2.length) s2 += '<br><span style="font-size:10px;color:#ccc">' + a2.join(' · ') + '</span>';
          if (ring2.attrs) {
            const attrStr = Object.keys(ring2.attrs).map(k => { const names = { str:'💪 Síla', vit:'❤️ Vitalita', dex:'🎯 Obratnost', int:'🧠 Intelekt' }; return `${names[k]||k}+${ring2.attrs[k]}`; }).join(' · ');
            s2 += '<br>' + attrStr;
          }
          bothHtml += `<div class="inv-compare-ring"><div class="inv-compare-ring-icon">${renderItemIcon(ring2, 36)}</div><div class="inv-compare-ring-stats"><div class="inv-compare-ring-name" style="color:${er2.color}">${ring2.name}</div><div style="font-size:10px;color:#ccc;line-height:1.4">${s2}</div></div></div>`;
        }
        if (bothHtml) {
          $('invCompareIcon').innerHTML = '';
          $('invCompareName').textContent = 'Nasazené prsteny';
          $('invCompareName').style.color = '#aaa';
          $('invCompareStats').innerHTML = bothHtml;
          comparePanel.classList.remove('hidden');
        } else {
          comparePanel.classList.add('hidden');
        }
        return;
      }
      // Speciální případ: zbraň — zkontrolovat main hand i offhand
      if (item.type === 'weapon') {
        const mhId = state.hero.equip.weapon;
        const ohId = state.hero.equip.shield;
        const mh = mhId ? ITEM_MAP[mhId] : null;
        const oh = (ohId && ITEM_MAP[ohId] && ITEM_MAP[ohId].weaponType) ? ITEM_MAP[ohId] : null;
        let bothHtml = '';
        if (mh) {
          const er = RARITY[mh.rarity] || RARITY.common;
          let s = `<span style="color:${er.color};font-size:11px">${er.name}</span><br>`;
          if (mh.affixes && mh.affixes.length) s += '<span style="font-size:10px;color:#aaa">' + mh.affixes.map(a => a.name).join(' · ') + '</span><br>';
          s += `⚔️ +${mh.baseDmg} poškození`;
          if (mh.critChance) s += ` · 🎯 ${mh.critChance}% krit (×2.0)`;
          if (mh.weaponType === 'staff') s += ' 🪄 magická';
          else if (mh.weaponType === 'blade') s += ' ⚔️ fyzická';
          const a = [];
          if (mh.fireDmg) a.push(`🔥 +${mh.fireDmg} ohnivé dmg`);
          if (mh.iceDmg) a.push(`❄️ +${mh.iceDmg} ledové dmg`);
          if (mh.poisonDmg) a.push(`☠️ +${mh.poisonDmg} jedové dmg`);
          if (mh.lifesteal) a.push(`🩸 +${mh.lifesteal}% lifesteal`);
          if (mh.attackRating) a.push(`🎯 +${mh.attackRating} hit rating`);
          if (mh.skillDmg) a.push(`✨ +${mh.skillDmg}% skill dmg`);
          if (mh.manaRegen) a.push(`💧 +${mh.manaRegen} many/tick`);
          if (mh.bonusMana) a.push(`💧 +${mh.bonusMana} many`);
          if (mh.swingMs && mh.swingMs < 0) a.push(`⚡ ${mh.swingMs}ms swing`);
          if (a.length) s += '<br><span style="font-size:10px;color:#ccc">' + a.join(' · ') + '</span>';
          if (mh.attrs) {
            const attrStr = Object.keys(mh.attrs).map(k => { const names = { str:'💪 Síla', vit:'❤️ Vitalita', dex:'🎯 Obratnost', int:'🧠 Intelekt' }; return `${names[k]||k}+${mh.attrs[k]}`; }).join(' · ');
            s += '<br>' + attrStr;
          }
          bothHtml += `<div class="inv-compare-ring"><div class="inv-compare-ring-icon">${renderItemIcon(mh, 36)}</div><div class="inv-compare-ring-stats"><div class="inv-compare-ring-name" style="color:${er.color}">${mh.name}</div><div style="font-size:10px;color:#ccc;line-height:1.4">${s}</div></div></div>`;
        }
        if (oh) {
          const er = RARITY[oh.rarity] || RARITY.common;
          let s = `<span style="color:${er.color};font-size:11px">${er.name}</span><br>`;
          if (oh.affixes && oh.affixes.length) s += '<span style="font-size:10px;color:#aaa">' + oh.affixes.map(a => a.name).join(' · ') + '</span><br>';
          s += `⚔️ +${oh.baseDmg} poškození`;
          if (oh.critChance) s += ` · 🎯 ${oh.critChance}% krit (×2.0)`;
          if (oh.weaponType === 'staff') s += ' 🪄 magická';
          else if (oh.weaponType === 'blade') s += ' ⚔️ fyzická';
          const a = [];
          if (oh.fireDmg) a.push(`🔥 +${oh.fireDmg} ohnivé dmg`);
          if (oh.iceDmg) a.push(`❄️ +${oh.iceDmg} ledové dmg`);
          if (oh.poisonDmg) a.push(`☠️ +${oh.poisonDmg} jedové dmg`);
          if (oh.lifesteal) a.push(`🩸 +${oh.lifesteal}% lifesteal`);
          if (oh.attackRating) a.push(`🎯 +${oh.attackRating} hit rating`);
          if (oh.skillDmg) a.push(`✨ +${oh.skillDmg}% skill dmg`);
          if (oh.manaRegen) a.push(`💧 +${oh.manaRegen} many/tick`);
          if (oh.bonusMana) a.push(`💧 +${oh.bonusMana} many`);
          if (oh.swingMs && oh.swingMs < 0) a.push(`⚡ ${oh.swingMs}ms swing`);
          if (a.length) s += '<br><span style="font-size:10px;color:#ccc">' + a.join(' · ') + '</span>';
          if (oh.attrs) {
            const attrStr = Object.keys(oh.attrs).map(k => { const names = { str:'💪 Síla', vit:'❤️ Vitalita', dex:'🎯 Obratnost', int:'🧠 Intelekt' }; return `${names[k]||k}+${oh.attrs[k]}`; }).join(' · ');
            s += '<br>' + attrStr;
          }
          bothHtml += `<div class="inv-compare-ring"><div class="inv-compare-ring-icon">${renderItemIcon(oh, 36)}</div><div class="inv-compare-ring-stats"><div class="inv-compare-ring-name" style="color:${er.color}">${oh.name}</div><div style="font-size:10px;color:#ccc;line-height:1.4">${s}</div></div></div>`;
        }
        if (bothHtml) {
          $('invCompareIcon').innerHTML = '';
          $('invCompareName').textContent = 'Nasazené zbraně';
          $('invCompareName').style.color = '#aaa';
          $('invCompareStats').innerHTML = bothHtml;
          comparePanel.classList.remove('hidden');
        } else {
          comparePanel.classList.add('hidden');
        }
        return;
      }
      const equippedId = state.hero.equip[equipSlot];
      if (!equippedId || equippedId === defaults[equipSlot]) { comparePanel.classList.add('hidden'); return; }
      const equipped = ITEM_MAP[equippedId];
      if (!equipped) { comparePanel.classList.add('hidden'); return; }
      $('invCompareIcon').innerHTML = renderItemIcon(equipped, 48);
      $('invCompareName').textContent = equipped.name;
      const er = RARITY[equipped.rarity] || RARITY.common;
      $('invCompareName').style.color = er.color;
      let eStats = `<span style="color:${er.color};font-size:11px">${er.name}</span><br>`;
      // Zobrazit názvy affixů
      if (equipped.affixes && equipped.affixes.length) {
        eStats += '<span style="font-size:10px;color:#aaa">' + equipped.affixes.map(a => a.name).join(' · ') + '</span><br>';
      }
      if (equipped.type === 'weapon') {
        eStats += `⚔️ +${equipped.baseDmg} poškození`;
        if (equipped.critChance) eStats += ` · 🎯 ${equipped.critChance}% krit (×2.0)`;
      }
      else if (equipped.type === 'armor') eStats += `❤️ +${equipped.bonusHp} HP · 🛡️ +${equipped.defense||0} Defense`;
      else if (equipped.type === 'helmet') eStats += `❤️ +${equipped.bonusHp} HP · 🛡️ +${equipped.defense||0} Defense`;
      else if (equipped.type === 'shield') eStats += `🛡️ ${equipped.blockChance||0}% blok · ❤️ +${equipped.bonusHp||0} HP · 🛡️ +${equipped.defense||0} Defense`;
      else if (equipped.type === 'ring') eStats += ``;
      else if (equipped.type === 'amulet') eStats += ``;
      if (equipped.weaponType === 'staff') eStats += ' 🪄 magická';
      else if (equipped.weaponType === 'blade') eStats += ' ⚔️ fyzická';
      // Affix staty — zobrazit všechny nenulové
      const eAffixStats = [];
      if (equipped.fireDmg) eAffixStats.push(`🔥 +${equipped.fireDmg} ohnivé dmg`);
      if (equipped.iceDmg) eAffixStats.push(`❄️ +${equipped.iceDmg} ledové dmg`);
      if (equipped.poisonDmg) eAffixStats.push(`☠️ +${equipped.poisonDmg} jedové dmg`);
      if (equipped.lifesteal) eAffixStats.push(`🩸 +${equipped.lifesteal}% lifesteal`);
      if (equipped.manaSteal) eAffixStats.push(`💜 +${equipped.manaSteal}% many/útok`);
      if (equipped.attackRating) eAffixStats.push(`🎯 +${equipped.attackRating} hit rating`);
      if (equipped.skillDmg) eAffixStats.push(`✨ +${equipped.skillDmg}% skill dmg`);
      if (equipped.manaRegen) eAffixStats.push(`💧 +${equipped.manaRegen} many/tick`);
      if (equipped.bonusMana) eAffixStats.push(`💧 +${equipped.bonusMana} many`);
      if (equipped.swingMs && equipped.swingMs < 0) eAffixStats.push(`⚡ ${equipped.swingMs}ms swing`);
      if (equipped.enhancedDefense) eAffixStats.push(`🛡️ +${equipped.enhancedDefense}% obrana`);
      if (equipped.enhancedDmg) eAffixStats.push(`⚔️ +${equipped.enhancedDmg}% poškození`);
      if (eAffixStats.length) eStats += '<br>' + eAffixStats.join(' · ');
      if (equipped.attrs) {
        const attrStr = Object.keys(equipped.attrs).map(k => {
          const names = { str:'💪 Síla', vit:'❤️ Vitalita', dex:'🎯 Obratnost', int:'🧠 Intelekt' };
          return `${names[k]||k}+${equipped.attrs[k]}`;
        }).join(' · ');
        eStats += '<br>' + attrStr;
      }
      if (equipped.cost) eStats += ` · 💰 ${equipped.cost}`;
      $('invCompareStats').innerHTML = eStats;
      comparePanel.classList.remove('hidden');
    }
    // Tap-to-equip: globální stav, přetrvává mezi renderInventory() voláními
    const slotMap = { invSlotWeapon:'weapon', invSlotArmor:'armor', invSlotHelmet:'helmet', invSlotShield:'shield', invSlotRing1:'ring1', invSlotRing2:'ring2', invSlotAmulet:'amulet', invSlotBelt:'belt' };
    function clearSelection() {
      window._invSelectedIdx = null;
      window._invSelectedSlot = null;
      document.querySelectorAll('.inv-grid-cell.selected, .inv-equip-slot.selected').forEach(el => el.classList.remove('selected'));
    }
    // Delegace handler je nastaven dříve v init() — tady jen clearujeme
    const invScreen = $('inventoryScreen');
    if (invScreen._invDelegationHandler) {
      invScreen.removeEventListener('click', invScreen._invDelegationHandler);
    }
    invScreen._invDelegationHandler = function(e) {
      const h = state.hero;
      const inv = h.inventory || [];
      const defaults = { weapon:'fists', armor:null, helmet:null, shield:null, offhand:null, ring1:null, ring2:null, amulet:null, belt:null };
      // Equip slot klik
      const slotEl = e.target.closest('.inv-equip-slot');
      if (slotEl) {
        const slot = slotMap[slotEl.id];
        if (!slot) return;
        const itemId = h.equip[slot];
        // Pokud je vybraný item v batohu → equipni ho do slotu
        if (window._invSelectedIdx !== null) {
          equipItemToSlot(window._invSelectedIdx, slot);
          clearSelection();
          return;
        }
        // Slot je prázdný nebo default → nic
        if (!itemId || itemId === defaults[slot]) return;
        // Druhý klik na stejný slot → sundej
        if (window._invSelectedSlot === slot) {
          unequipSlot(slot);
          clearSelection();
          return;
        }
        // První klik → zobraz info a zvýrazni
        clearSelection();
        window._invSelectedSlot = slot;
        slotEl.classList.add('selected');
        const item = ITEM_MAP[itemId];
        if (item) showItemInfo(item);
        return;
      }
      // Grid cell klik
      const cell = e.target.closest('.inv-grid-cell');
      if (cell) {
        if (cell.classList.contains('empty')) {
          clearSelection();
          return;
        }
        const idx = parseInt(cell.dataset.idx);
        const itemId = inv[idx];
        const item = itemId ? ITEM_MAP[itemId] : null;
        if (!item) return;
        clearSelection();
        window._invSelectedIdx = idx;
        cell.classList.add('selected');
        showItemInfo(item);
        return;
      }
      // Potion slot klik — vložit/sundat potion
      const potSlot = e.target.closest('.inv-potion-slot');
      if (potSlot) {
        const potIdx = parseInt(potSlot.dataset.potionIdx);
        const bpSlots = h.equip.beltPotionSlots || [];
        // Pokud je vybraný item v batohu a je to consumable → vlož
        if (window._invSelectedIdx !== null) {
          const selItemId = inv[window._invSelectedIdx];
          const selItem = selItemId ? ITEM_MAP[selItemId] : null;
          if (selItem && selItem.type === 'consumable') {
            // Odebrat z batohu
            h.inventory.splice(window._invSelectedIdx, 1);
            // Pokud už v tom slotu něco je, vrátit do batohu
            if (bpSlots[potIdx]) h.inventory.push(bpSlots[potIdx]);
            bpSlots[potIdx] = selItemId;
            h.equip.beltPotionSlots = bpSlots;
            saveGame();
            renderInventory();
            return;
          }
          clearSelection();
          return;
        }
        // Klik na obsazený potion slot → sundat do batohu
        const potId = bpSlots[potIdx];
        if (potId) {
          if (h.inventory.length >= 20) { showMessage('❌ Inventář je plný!'); return; }
          bpSlots[potIdx] = null;
          h.equip.beltPotionSlots = bpSlots;
          h.inventory.push(potId);
          saveGame();
          renderInventory();
          return;
        }
        return;
      }
      // Klik mimo — schovat panely
      const panel = $('invInfoPanel');
      if (panel) panel.classList.add('hidden');
      const comparePanel = $('invComparePanel');
      if (comparePanel) comparePanel.classList.add('hidden');
    };
    invScreen.addEventListener('click', invScreen._invDelegationHandler);
  }

  function unequipSlot(slot) {
    const h = state.hero;
    const defaults = { weapon:'fists', armor:null, helmet:null, shield:null, ring1:null, ring2:null, amulet:null, belt:null };
    const current = h.equip[slot];
    if (!current || current === defaults[slot]) return;
    if (h.inventory.length >= 20) { showMessage('❌ Inventář je plný!'); return; }
    h.inventory.push(current);
    h.equip[slot] = defaults[slot];
    h.baseDmg = getHeroDmg();
    h.maxHp = getHeroMaxHp();
    h.hp = h.maxHp;
    saveGame();
    renderInventory();
    renderHero();
  }

  function equipItemToSlot(invIdx, targetSlot) {
    const h = state.hero;
    const itemId = h.inventory[invIdx];
    if (!itemId) return;
    const item = ITEM_MAP[itemId];
    if (!item) return;
    // Zjistit správný slot podle typu itemu
    const typeToSlot = { weapon:'weapon', armor:'armor', helmet:'helmet', shield:'shield', ring:'ring1', belt:'belt', amulet:'amulet' };
    let correctSlot = typeToSlot[item.type];
    if (!correctSlot) return;
    // Ring může jít do ring1 nebo ring2
    if (item.type === 'ring' && (targetSlot === 'ring1' || targetSlot === 'ring2')) {
      correctSlot = targetSlot;
    }
    // Shield slot může přijmout: shield, weapon (dual wield), nebo cokoliv jako artefakt
    if (targetSlot === 'shield' && (item.type === 'weapon' || item.type === 'shield' || item.type === 'offhand')) {
      correctSlot = 'shield';
    }
    // Pokud target slot neodpovídá, nedělat nic
    if (targetSlot !== correctSlot) return;
    // Pokud je to weapon a target je shield, dát do shield slotu
    if (item.type === 'weapon' && targetSlot === 'shield') {
      h.inventory.splice(invIdx, 1);
      if (h.equip.shield) h.inventory.push(h.equip.shield);
      h.equip.shield = itemId;
      h.baseDmg = getHeroDmg();
      h.maxHp = getHeroMaxHp();
      h.hp = h.maxHp;
      saveGame();
      renderInventory();
      renderHero();
      return;
    }
    // Jinak použít existující equipItem
    equipItem(invIdx);
  }

  function equipItem(invIdx) {
    const h = state.hero;
    const itemId = h.inventory[invIdx];
    if (!itemId) return;
    const item = ITEM_MAP[itemId];
    if (!item) return;
    // Odstranit nový item z inventáře PRVNĚ (dřív než pushneme starý)
    h.inventory.splice(invIdx, 1);
    if (item.type === 'weapon') {
      // Obouruční zbraň vyhodí štít i offhand zpět do batohu
      const isTwoHanded = item.twoHand === true;
      if (isTwoHanded) {
        if (h.equip.shield) { h.inventory.push(h.equip.shield); h.equip.shield = null; }
      }
      // Prostě vyměnit main hand — offhand zůstává jak je
      if (h.equip.weapon !== 'fists') h.inventory.push(h.equip.weapon);
      h.equip.weapon = itemId;
    } else if (item.type === 'armor') {
      if (h.equip.armor) h.inventory.push(h.equip.armor);
      h.equip.armor = itemId;
    } else if (item.type === 'helmet') {
      if (h.equip.helmet) h.inventory.push(h.equip.helmet);
      h.equip.helmet = itemId;
    } else if (item.type === 'shield') {
      // Štít nejde s obouruční zbraní — vyhodit zbraň zpět
      const curWeapon = ITEM_MAP[h.equip.weapon];
      const isTwoHanded = curWeapon && curWeapon.twoHand === true;
      if (isTwoHanded) {
        h.inventory.push(h.equip.weapon);
        h.equip.weapon = 'fists';
      }
      if (h.equip.shield) h.inventory.push(h.equip.shield);
      h.equip.shield = itemId;
    } else if (item.type === 'ring') {
      if (!h.equip.ring1) {
        h.equip.ring1 = itemId;
      } else if (!h.equip.ring2) {
        h.equip.ring2 = itemId;
      } else {
        h.inventory.push(h.equip.ring1);
        h.equip.ring1 = itemId;
      }
    } else if (item.type === 'belt') {
      if (h.equip.belt) h.inventory.push(h.equip.belt);
      h.equip.belt = itemId;
      // Inicializovat potion sloty podle beltSlots
      const beltItem = ITEM_MAP[itemId];
      const slots = beltItem ? (beltItem.beltSlots || 0) : 0;
      h.equip.beltPotionSlots = h.equip.beltPotionSlots || [];
      while (h.equip.beltPotionSlots.length < slots) h.equip.beltPotionSlots.push(null);
      while (h.equip.beltPotionSlots.length > slots) {
        const removed = h.equip.beltPotionSlots.pop();
        if (removed) h.inventory.push(removed);
      }
    } else if (item.type === 'amulet') {
      if (h.equip.amulet) h.inventory.push(h.equip.amulet);
      h.equip.amulet = itemId;
    }
    h.baseDmg = getHeroDmg();
    h.maxHp = getHeroMaxHp();
    h.hp = h.maxHp;
    h.maxMana = getHeroMaxMana();
    h.mana = h.maxMana;
    saveGame();
    showMessage(`🎽 Oblékl jsi ${item.icon} ${item.name}!`);
    renderInventory();
    renderHero();
  }

  function unequipItem(itemId) {
    const h = state.hero;
    if (h.inventory.length >= 20) { showMessage('❌ Inventář je plný!'); return; }
    const item = ITEM_MAP[itemId];
    if (!item) return;
    const defaults = { weapon:'fists', armor:null, helmet:null, shield:null, ring1:null, amulet:null };
    if (item.type === 'weapon') {
      if (h.equip.weapon !== itemId) return;
      h.equip.weapon = defaults.weapon;
    } else if (item.type === 'armor') {
      if (h.equip.armor !== itemId) return;
      h.equip.armor = defaults.armor;
    } else if (item.type === 'helmet') {
      if (h.equip.helmet !== itemId) return;
      h.equip.helmet = defaults.helmet;
    } else if (item.type === 'shield') {
      if (h.equip.shield !== itemId) return;
      h.equip.shield = defaults.shield;
    } else if (item.type === 'ring') {
      if (h.equip.ring1 === itemId) h.equip.ring1 = defaults.ring1;
      else if (h.equip.ring2 === itemId) h.equip.ring2 = defaults.ring2;
      else return;
    } else if (item.type === 'belt') {
      if (h.equip.belt !== itemId) return;
      // Při sundání beltu vrátit potiony do inventáře
      const bpSlots = h.equip.beltPotionSlots || [];
      bpSlots.forEach(potId => { if (potId) h.inventory.push(potId); });
      h.equip.beltPotionSlots = [];
      h.equip.belt = defaults.belt;
    } else if (item.type === 'amulet') {
      if (h.equip.amulet === itemId) h.equip.amulet = defaults.amulet;
      else return;
    } else return;
    h.inventory.push(itemId);
    h.baseDmg = getHeroDmg();
    h.maxHp = getHeroMaxHp();
    h.hp = h.maxHp;
    h.maxMana = getHeroMaxMana();
    h.mana = h.maxMana;
    saveGame();
    showMessage(`📦 Sundal jsi ${item.icon} ${item.name} do inventáře!`);
    renderInventory();
  }

  // ===== TRAINING (minigames) =====
  function enterTraining(skillId) {
    const sk = SKILL_MAP[skillId];
    if (!sk) return;
    const lv = state.skills[skillId] || 0;
    if (lv >= sk.maxLv) { showMessage('✅ MAX level!'); return; }
    trainingState = { skillId, skill: sk, level: Math.min(5, lv + 1), round: 0, ended: false, firstRound: true, playerHp: 1 };
    showScreen('battle');
    switchBGM('minigame');
    updateTrainingUI();
    startTrainingRound();
  }

  function updateTrainingUI() {
    const ts = trainingState;
    $('enemyName').textContent = ts.skill.icon + ' ' + ts.skill.dungeonName;
    $('gameTypeBadge').textContent = ts.skill.name;
    $('floorNum').textContent = `Lv.${Math.min(10,(state.skills[ts.skillId]||0)+1)}`;
    $('playerHearts').textContent = '❤️'.repeat(ts.playerHp);
    const faces = { simon:'👻', color:'🏹', grid:'🗿' };
    $('enemyFace').textContent = faces[ts.skill.dungeon] || '👾';
  }

  function startTrainingRound() {
    if (trainingState.ended) return;
    if (trainingState.playerHp <= 0) { endTraining(false); return; }
    trainingState.round++;
    minigameState = {};
    hideAllMinigames();
    if (trainingState.firstRound) { trainingState.firstRound = false; showCountdown(1, () => showMinigame(trainingState.skill.dungeon)); }
    else showMinigame(trainingState.skill.dungeon);
  }

  function showMinigame(type) {
    cleanupTimers();
    const areas = { simon:'simonArea', color:'colorClashArea', grid:'gridDefenderArea' };
    const fns = { simon:startSimon, color:startColorClash, grid:startGridDefender };
    const el = $(areas[type]);
    if (el && fns[type]) { el.classList.remove('minigame-hide'); fns[type](); }
  }

  function hideAllMinigames() {
    ['simonArea','colorClashArea','gridDefenderArea'].forEach(id => $(id).classList.add('minigame-hide'));
  }

  function endTraining(won) {
    trainingState.ended = true;
    if (won) {
      const skId = trainingState.skillId, sk = SKILL_MAP[skId], lv = state.skills[skId]||0;
      if (lv < sk.maxLv) {
        const needed = skillXpToLevel(lv);
        state.skillXp[skId] = (state.skillXp[skId]||0) + 1;
        if (state.skillXp[skId] >= needed) {
          state.skillXp[skId] = 0; state.skills[skId] = lv + 1;
          state.hero.xp = (state.hero.xp||0) + 1;
          if (state.hero.xp >= state.hero.level * 2) { state.hero.xp = 0; state.hero.level++; state.hero.maxHp = 100 + Math.floor(state.hero.level * 10); state.hero.baseDmg = 10 + Math.floor(state.hero.level * 3); }
          sfxLevelUp();
          $('resultIcon').textContent='⬆️'; $('resultTitle').textContent=`${sk.icon} Lv.${lv+1}!`; $('resultMsg').textContent=sk.desc(lv+1)+(lv+1>=sk.maxLv?' [MAX]':'');
          $('resultBtn').innerHTML=`<button class="btn btn-primary" onclick="game.showScreen('tower')">🔮 Věž</button><button class="btn btn-secondary" onclick="game.enterTraining('${skId}')">🔄 Dále</button>`;
        } else {
          $('resultIcon').textContent='✅'; $('resultTitle').textContent='Úspěch!'; $('resultMsg').textContent=`XP ${state.skillXp[skId]}/${needed}`;
          $('resultBtn').innerHTML=`<button class="btn btn-primary" onclick="game.enterTraining('${skId}')">🔄 Dále</button><button class="btn btn-secondary" onclick="game.showScreen('tower')">🔮 Věž</button>`;
        }
      }
      state.wins = (state.wins||0) + 1;
    } else {
      $('resultIcon').textContent='💀'; $('resultTitle').textContent='Neúspěch'; $('resultMsg').textContent='Zkus znovu!';
      state.deaths = (state.deaths||0) + 1;
      $('resultBtn').innerHTML=`<button class="btn btn-primary" onclick="game.enterTraining('${trainingState.skillId}')">🔄 Znovu</button><button class="btn btn-secondary" onclick="game.showScreen('tower')">🔮 Věž</button>`;
    }
    saveGame(); 
    // achievementy odstraněny - hráč nezískává achievementy po tréninku
    showScreen('result');
  }

  function trainingWin() { trainingState.playerHp=1; sfxSuccess(); endTraining(true); }
  function trainingLose() { trainingState.playerHp=0; sfxPlayerHit(); endTraining(false); }

  // ===== MINIGAMES =====
  const SIMON_SYMBOLS = ['⚡','🔥','💧','🌿','💎','☀️','🌙','🍀','🌀','⭐','🌈','🦋','🍄','🌊','❄️','🎯'];
  const SIMON_COLORS = ['#e94560','#f1c40f','#4a7dff','#2ecc71','#9b59b6','#e67e22','#1abc9c','#2c3e50','#d35400','#f39c12','#16a085','#c0392b','#8e44ad','#2980b9','#bdc3c7','#7f8c8d'];
  const SIMON_FREQS = [73.42*4,87.31*4,110.0*4,146.84*2,164.81*2,196.0*2,220.0*2,246.94*2,73.42*5,87.31*5,110.0*5,146.84*3,164.81*3,196.0*3,220.0*3,246.94*3];
  function startSimon() {
    const level=trainingState.level,gridSize=Math.min(2+Math.floor(level/3),4),nc=gridSize*gridSize,seqLen=5+Math.floor(level/2);
    const sym=shuffle([...SIMON_SYMBOLS]).slice(0,nc),cols=SIMON_COLORS.slice(0,nc);
    minigameState={sequence:[],playerIndex:0,showing:true,inputEnabled:false,symbols:sym,gridSize,seqLen};
    for(let i=0;i<seqLen;i++) minigameState.sequence.push(rand(0,nc-1));
    const g=$('simonGrid');g.style.gridTemplateColumns=`repeat(${gridSize},1fr)`;
    g.innerHTML=sym.map((s,i)=>`<div class="simon-cell" data-idx="${i}" style="background:${cols[i]}" onclick="game.simonClick(${i})"><span style="font-size:${gridSize<=3?'28px':'20px'};pointer-events:none;display:flex;align-items:center;justify-content:center;height:100%">${s}</span></div>`).join('');
    $('simonPrompt').textContent='👀';$('simonProgress').textContent=`0/${seqLen}`;
    let delay=Math.max(100,300-level*20);minigameState.showing=true;
    (function ps(idx){if(idx>=minigameState.sequence.length){minigameState.showing=false;minigameState.inputEnabled=true;$('simonPrompt').textContent='🎯';return;}
      initAudio();const c=document.querySelectorAll('#simonGrid .simon-cell'),ci=minigameState.sequence[idx];c.forEach(x=>x.classList.remove('lit'));c[ci].classList.add('lit');playTone(SIMON_FREQS[ci],0.13,'sine',0.12);
      setTimeout(()=>{c.forEach(x=>x.classList.remove('lit'));setTimeout(()=>ps(idx+1),60);},delay);})(0);
  }
  function simonClick(idx){if(!minigameState.inputEnabled||minigameState.showing)return;
    initAudio();const c=document.querySelectorAll('#simonGrid .simon-cell');c[idx].classList.add('active');setTimeout(()=>c[idx].classList.remove('active'),150);
    playTone(SIMON_FREQS[idx],0.12,'sine',0.10);
    if(idx!==minigameState.sequence[minigameState.playerIndex]){minigameState.inputEnabled=false;trainingLose();return;}
    minigameState.playerIndex++;$('simonProgress').textContent=`${minigameState.playerIndex}/${minigameState.sequence.length}`;
    if(minigameState.playerIndex>=minigameState.sequence.length){minigameState.inputEnabled=false;trainingWin();}}
  function startColorClash(){const level=trainingState.level,fd=Math.max(0.8,2.8-level*0.25).toFixed(2),colors=['red','blue','green','yellow'],cl={red:'🔴',blue:'🔵',green:'🟢',yellow:'🟡'};const a=$('colorArena');a.innerHTML='';a.style.height='180px';a.style.display='flex';a.style.flexDirection='column';const ld=document.createElement('div');ld.style.cssText='display:flex;flex:1;';ld.innerHTML=colors.map(c=>`<div class="color-lane" data-color="${c}" style="flex:1;text-align:center;padding-top:4px;font-size:20px;border-right:1px solid #1a1a3a">${cl[c]}</div>`).join('');a.appendChild(ld);const br=document.createElement('div');br.style.cssText='display:flex;height:40px;';br.innerHTML=colors.map(c=>{const bg=c==='red'?'#e94560':c==='blue'?'#4a7dff':c==='green'?'#2ecc71':'#f1c40f';return `<div style="flex:1;display:flex;align-items:center;justify-content:center;cursor:pointer;background:${bg};margin:2px;border-radius:6px;font-size:13px;color:#fff;font-weight:bold" onclick="game.colorInput('${c}')">${cl[c]}</div>`;}).join('');a.appendChild(br);minigameState={active:true,colors,arena:a,projectile:null,currentColor:null,fallDuration:fd};minigameState.spawn=function spawn(){if(!minigameState.active)return;const a=minigameState.arena,col=minigameState.colors[rand(0,3)];if(minigameState.projectile&&minigameState.projectile.parentNode)minigameState.projectile.remove();const l=a.querySelectorAll('.color-lane'),li=minigameState.colors.indexOf(col),lane=l[li];if(!lane){setTimeout(minigameState.spawn,100);return;}const lr=lane.getBoundingClientRect(),ar=a.getBoundingClientRect(),lx=lr.left-ar.left+lr.width/2-14;const el=document.createElement('div');el.className='color-projectile';el.style.cssText=`left:${lx}px;top:0px;background:${col==='red'?'#e94560':col==='blue'?'#4a7dff':col==='green'?'#2ecc71':'#f1c40f'};width:28px;height:28px;border-radius:50%;border:2px solid #fff;position:absolute;transition:top ${minigameState.fallDuration}s linear`;el.dataset.color=col;el.addEventListener('transitionend',()=>{if(minigameState.active&&minigameState.projectile===el){minigameState.active=false;el.remove();trainingLose();}});a.appendChild(el);minigameState.projectile=el;minigameState.currentColor=col;requestAnimationFrame(()=>{el.style.top='145px';});}}
  function colorInput(c){if(!minigameState.active)return;if(c===minigameState.currentColor){minigameState.active=false;minigameState.score++;if(minigameState.projectile){const e=minigameState.projectile;e.style.transition='transform 0.2s, opacity 0.2s';e.style.transform='scale(2.5)';e.style.opacity='0';setTimeout(()=>e.remove(),200);}sfxHit();if(minigameState.score>=15){trainingWin();}else{setTimeout(()=>minigameState.spawn(),200);}}}
  function startGridDefender(){const level=trainingState.level,maxNum=5+level*2,target=rand(3,maxNum),ops=['+','-','×'],options=[],used=new Set();const cop=ops[rand(0,2)];let a,b,ex,res;for(let t=0;t<50;t++){if(cop==='+'){a=rand(1,target-1);b=target-a;ex=`${a}+${b}`;res=a+b;}else if(cop==='-'){a=rand(target+1,target+maxNum);b=a-target;ex=`${a}-${b}`;res=a-b;}else{const f=[];for(let i=1;i<=Math.sqrt(target);i++){if(target%i===0)f.push(i);}if(f.length>1){a=f[rand(1,f.length-1)];b=target/a;ex=`${a}×${b}`;res=a*b;}else{a=rand(1,3);b=target;ex=`${a}×${b}`;res=a*b;}}if(!used.has(ex)&&res===target){used.add(ex);break;}}options.push({value:res,expr:ex,wins:true});const cv=[];for(let d=1;d<=3;d++){if(res-d>=1)cv.push(res-d);if(res+d!==target)cv.push(res+d);}shuffle(cv);for(let i=1;i<3;i++){const fr=cv.length>0?cv.shift():rand(1,maxNum+5);let fe;for(let t=0;t<30;t++){const op=ops[rand(0,2)];let ba,bb,bex,bres;if(op==='+'){ba=rand(1,maxNum);bb=rand(1,maxNum);bex=`${ba}+${bb}`;bres=ba+bb;}else if(op==='-'){ba=rand(1,maxNum*2);bb=rand(1,ba-1);bex=`${ba}-${bb}`;bres=ba-bb;}else{ba=rand(1,5);bb=rand(1,5);bex=`${ba}×${bb}`;bres=ba*bb;}if(!used.has(bex)&&bres===fr){used.add(bex);options.push({value:bres,expr:bex,wins:false});fe=true;break;}}if(!fe){for(let t=0;t<50;t++){const op=ops[rand(0,2)];let ba,bb,bex,bres;if(op==='+'){ba=rand(1,maxNum);bb=rand(1,maxNum);bex=`${ba}+${bb}`;bres=ba+bb;}else if(op==='-'){ba=rand(1,maxNum*2);bb=rand(1,ba-1);bex=`${ba}-${bb}`;bres=ba-bb;}else{ba=rand(1,5);bb=rand(1,5);bex=`${ba}×${bb}`;bres=ba*bb;}if(!used.has(bex)&&Math.abs(bres-fr)<=1){used.add(bex);options.push({value:bres,expr:bex,wins:false});break;}}}}shuffle(options);const td=Math.max(3,6-Math.floor(level/3));minigameState={options,target,active:true,timer:td};$('gridArea').innerHTML=`<div class="grid-info"><span class="grid-time" id="gridTimer">${td}s</span><span class="grid-target">👹 <strong>${target}</strong></span></div><div class="grid-cards">${options.map((o,i)=>`<div class="grid-card" onclick="game.gridPick(${i})"><span class="expr">${o.expr}</span></div>`).join('')}</div>`;const te=$('gridTimer');if(te){minigameState.timerInterval=setInterval(()=>{minigameState.timer--;te.textContent=minigameState.timer+'s';if(minigameState.timer<=0){clearInterval(minigameState.timerInterval);if(minigameState.active){minigameState.active=false;trainingLose();}}},1000);}}
  function gridPick(idx){if(!minigameState.active)return;minigameState.active=false;if(minigameState.timerInterval)clearInterval(minigameState.timerInterval);if(minigameState.options[idx].wins){sfxSuccess();minigameState.rounds=minigameState.rounds||0;minigameState.rounds++;if(minigameState.rounds>=15){trainingWin();}else{setTimeout(startGridDefender,500);}}else{sfxPlayerHit();trainingLose();}}
  

  // ===== COUNTDOWN =====
  function showCountdown(s,cb){cleanupTimers();let r=s;const el=$('countdownOverlay'),ne=$('countdownNumber');el.classList.remove('hidden');ne.textContent=r;playTone(440+r*60,0.15,'sine',0.1);minigameState.countdownInterval=setInterval(()=>{r--;if(r<=0){clearInterval(minigameState.countdownInterval);minigameState.countdownInterval=null;el.classList.add('hidden');if(cb)cb();}else{ne.textContent=r;playTone(440+r*60,0.15,'sine',0.1);}},1000);}

  // ===== INIT =====
  function init() {
    state = loadSave();
    initUniqueItems();

    // Splash screen — fade in, 2.5s, fade out, pak teprve zobrazit UI
    const splash = document.getElementById('splashScreen');
    if (splash) {
      setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => {
          splash.classList.add('hidden');
          // Až po splashi zobrazit class select nebo mapu
          if (!state.heroClass) {
            showScreen('classSelect');
          } else {
            showScreen('map');
            renderMap();
            updateTalentBadge();
          }
        }, 600);
      }, 2500);
    } else {
      // Fallback — splash není, rovnou ukázat
      if (!state.heroClass) {
        showScreen('classSelect');
      } else {
        showScreen('map');
        renderMap();
        updateTalentBadge();
      }
    }

    // Přednačtení obrázků monster do cache pro okamžité zobrazení v souboji
    const allMonsterFaces = [];
    MONSTER_DB.forEach(theme => theme.forEach(m => {
      if (m.face && m.face.startsWith('assets/')) allMonsterFaces.push(m.face);
    }));
    LOCATIONS.forEach(loc => {
      if (loc.boss && loc.boss.face && loc.boss.face.startsWith('assets/')) allMonsterFaces.push(loc.boss.face);
    });
    // Deduplikace a prefetch
    [...new Set(allMonsterFaces)].forEach(src => { const img = new Image(); img.src = src; });

    if (!state.bossesDefeated || state.bossesDefeated.length < LOCATIONS.length) state.bossesDefeated = Array(LOCATIONS.length).fill(false);
    if (!state.locationProgress || state.locationProgress.length < LOCATIONS.length) state.locationProgress = Array(LOCATIONS.length).fill(0);
    if (!state.floorProgress || state.floorProgress.length < LOCATIONS.length) state.floorProgress = Array(LOCATIONS.length).fill(0);
    if (!state.hero) state.hero = { level:1, xp:0, gold:0, hp:100, maxHp:100, mana:50, maxMana:50, baseDmg:12, inventory:[], equip:{weapon:'fists',armor:null}, attrStr:0, attrVit:0, attrPoints:0 };
    if (state.hero.maxHp === undefined) state.hero.maxHp = getHeroMaxHp();
    if (state.hero.hp === undefined) state.hero.hp = state.hero.maxHp;
    if (state.hero.attrStr === undefined) state.hero.attrStr = 0;
    if (state.hero.attrVit === undefined) state.hero.attrVit = 0;
    if (state.hero.attrDex === undefined) state.hero.attrDex = 0;
    if (state.hero.attrInt === undefined) state.hero.attrInt = 0;
    if (state.hero.mana === undefined) state.hero.mana = 50;
    if (state.hero.maxMana === undefined) state.hero.maxMana = 50;
    if (state.hero.attrPoints === undefined) state.hero.attrPoints = 0;
    // Dopočítat chybějící atributové body podle levelu (5/level, level 1 = 0)
    const expectedAttrPoints = (state.hero.level - 1) * 5;
    if (state.hero.attrPoints < expectedAttrPoints) {
      state.hero.attrPoints = expectedAttrPoints;
      saveGame(); // uložit, aby body přetrvaly refresh
    }
    // Dopočítat chybějící talent pointy (1/level od lvl 2)
    const expectedTalentPoints = Math.max(0, state.hero.level - 1);
    if ((state.talentPoints || 0) < expectedTalentPoints) {
      state.talentPoints = expectedTalentPoints;
      saveGame();
    }
    // Vždy aktualizovat maxHp/maxMana podle aktuálního levelu a itemů
    state.hero.maxHp = getHeroMaxHp();
    state.hero.maxMana = getHeroMaxMana();
    if (state.hero.hp === undefined) state.hero.hp = state.hero.maxHp;
    if (state.heroClass === undefined) state.heroClass = null;
    // Migrace: staré savy (bez resource polí) musí projít class selectem
    if (state.heroClass && state.rage === undefined && state.energy === undefined) {
      state.heroClass = null;
    }

    // Nav-bar handlery musí být zaregistrované vždy, i když hráč ještě nevybral classu
    document.querySelectorAll('.nav-bar a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (a.dataset.screen === 'map') showScreen('map');
        else if (a.dataset.screen === 'talents') showScreen('talents');
        else if (a.dataset.screen === 'hero') showScreen('hero');
        else if (a.dataset.screen === 'shop') showScreen('shop');
        else if (a.dataset.screen === 'inventory') showScreen('inventory');
        else if (a.dataset.screen === 'bestiary') { showScreen('bestiary'); renderBestiary(); }
        else if (a.dataset.screen === 'spellbook') { showScreen('spellbook'); renderSpellbook(); }
        else if (a.dataset.screen === 'items') { showScreen('items'); renderItemsReference(); }
        firstUserInteraction();
      });
    });
    document.getElementById('musicToggle').addEventListener('click', (e) => {
      e.preventDefault();
      toggleMusic();
    });
    document.getElementById('testToggle').addEventListener('click', (e) => {
      e.preventDefault();
      toggleTestMode();
    });
    document.getElementById('clearSave').addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('dungeonRecallV7');
      state = defaultState();
      saveGame();
      showScreen('classSelect');
    });
    document.getElementById('mbSurrenderBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      showSurrenderModal();
    });

    // Spustit BGM při první user interakci
    let _firstInteraction = true;
    function firstUserInteraction() {
      if (!_firstInteraction) return;
      _firstInteraction = false;
      initAudio();
      ensureRunning(); // jen probudit AudioContext, nehrát
    }
    // První interakce: klik na tlačítko "🌍 Svět" v nav baru
    // Pokud uživatel klikne jinde, zachytíme to taky
    document.addEventListener('click', function handler() {
      document.removeEventListener('click', handler);
      if (_firstInteraction) firstUserInteraction();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Pauza BGM
        if (!bgmAudio.paused) bgmAudio.pause();
        if (!overworldAudio.paused) overworldAudio.pause();
        if (!defeatAudio.paused) defeatAudio.pause();
        if (!winAudio.paused) winAudio.pause();
        currentBGM = null;
        // Pauza herních timerů (swipe fight)
        const mb = mapBattleState;
        if (mb && !mb.ended && mb.sequence && mb.sequence.length > 0) {
          mb._pausedAt = Date.now();
          mb._pausedInAttackWindow = mb.inAttackWindow;
          if (mb._sequenceTimer) { clearTimeout(mb._sequenceTimer); mb._sequenceTimer = null; }
          if (mb._attackWindowTimer) { clearTimeout(mb._attackWindowTimer); mb._attackWindowTimer = null; }
          if (mb._ringTimer) { clearTimeout(mb._ringTimer); mb._ringTimer = null; }
        }
        // Pauza timerů v tréninku
        const ts = trainingState;
        if (ts && !ts.ended && ts.round > 0) {
          ts._pausedAt = Date.now();
          cleanupTimers();
        }
      } else {
        const mb2 = mapBattleState;
        // Resume BGM
        const activeScreen = Object.keys(SCREEN_IDS).find(k => {
          const el = $(SCREEN_IDS[k]);
          return el && !el.classList.contains('hidden');
        });
        const resultTitle = $('resultTitle')?.textContent || '';
        const isDefeat = activeScreen === 'result' && (resultTitle.includes('Padl') || resultTitle.includes('💀'));
        const isWin = activeScreen === 'result' && !isDefeat;
        if (isDefeat) switchBGM('defeat');
        else if (isWin) switchBGM('win');
        else if (activeScreen === 'mapBattle' || activeScreen === 'battle') switchBGM('battle');
        else switchBGM('overworld');
        // Resume swipe fight
        if (mb2 && !mb2.ended && mb2._pausedAt) {
          const elapsed = Date.now() - mb2._pausedAt;
          mb2._pausedAt = null;
          if (mb2._pausedInAttackWindow) {
            // Byl v útočném okně → zmeškal to
            mb2._pausedInAttackWindow = false;
            // (hint: zachovat bonus info)
            flashSeqFail();
            missedAttackWindow();
          } else if (mb2.sequenceIndex < mb2.sequence.length) {
            // Byl v sekvenci útoků
            const winTime = mb2._currentWindowTime || 800;
            if (elapsed > winTime + 3000) {
              // Utekl čas → boss zasáhl
              onMapHit();
            } else {
              // Ještě nevypršelo → restartovat aktuální útok
              playSequenceAttack();
            }
          }
        }
        // Resume training
        const ts2 = trainingState;
        if (ts2 && !ts2.ended && ts2._pausedAt) {
          ts2._pausedAt = null;
          startTrainingRound();
        }
      }
    });
    showScreen('map');
  }

  window.game = {
    showScreen, enterLocation, toggleDungeon, chooseDungeonPath,
    upgradeAttr, buyItem, sellItem, sellSlotItem, equipItem, equipItemToSlot, unequipItem, unequipSlot,
    switchShopTab,
    onMapRapidTap,
    investTalent, resetTalents, selectTalent, selectTree,
    showSurrenderModal, cancelSurrender, confirmSurrender,
    openInventoryFromShop,
    renderBestiary,
    renderSpellbook,
    renderItemsReference,
    renameHero,
    showFaceSelect, closeFaceSelect, selectFace,
    selectClass,
    castClassSpell,
    usePotion
  };
  init();
})();
