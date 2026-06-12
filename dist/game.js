(function() {
  'use strict';
  const $ = id => document.getElementById(id);
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

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
  function playSFX(audio) { audio.currentTime = 0; audio.play().catch(() => {}); }

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
    document.getElementById('musicToggle').textContent = musicMuted ? '🔇' : '🔊';
  }
  let _currentBattleBgmIdx = 0;
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

  // ===== SCHOOLS (Talent Tree) =====
  const SCHOOLS = [
    { id:'fire', name:'Ohnivá škola', icon:'🔥', desc:'Zaměřuje se na čisté poškození a ohnivé střely.',
      talents: [
        { k:'fireball', name:'🔥 Fireball', desc:lv=>`${25+lv*25} poškození + DoT ${lv*3}/tick na ${2+lv}s` },
        { k:'dmgBoost', name:'⚔️ Zvýšení poškození', desc:lv=>`+${lv*10}% poškození zbraně` },
        { k:'fireball2', name:'🔥 Silnější Fireball', desc:lv=>`Fireball ×${1+lv*0.5} poškození` },
        { k:'dmgBoost2', name:'⚔️ Velké zvýšení poškození', desc:lv=>`+${10+lv*10}% poškození zbraně` },
        { k:'inferno', name:'🌋 Inferno', desc:lv=>`Fireball + DoT ${5+lv*5}/tick na ${4+lv}s` }
      ]
    },
    { id:'ice', name:'Ledová škola', icon:'❄️', desc:'Zpomalování nepřítele a ovládání tempa boje.',
      talents: [
        { k:'freeze', name:'❄️ Mráz', desc:lv=>`Každý útok zpomalí o 75% na 3 ticky` },
        { k:'chill', name:'🥶 Chlad', desc:lv=>`Každý útok zpomalí o ${20+lv*5}% na 2 ticky` },
        { k:'freeze2', name:'❄️ Silnější mráz', desc:lv=>`Každý útok zpomalí o 75% na 4 ticky` },
        { k:'chill2', name:'🥶 Hluboký chlad', desc:lv=>`Zpomalení o ${20+lv*5}% na 3 ticky` },
        { k:'blizzard', name:'🌨️ Blizard', desc:lv=>`Každý útok zpomalí o 75% na 5 ticků` }
      ]
    },
    { id:'nature', name:'Přírodní škola', icon:'🌿', desc:'Léčení a jedovaté DoT poškození.',
      talents: [
        { k:'heal', name:'💚 Léčení', desc:lv=>`+${10+lv*15} HP` },
        { k:'poison', name:'☠️ Jed', desc:lv=>`Každý útok: jed ${lv*3}/tick na ${2+Math.floor(lv/2)} ticků` },
        { k:'heal2', name:'💚 Silnější léčení', desc:lv=>`+${15+lv*20} HP` },
        { k:'poison2', name:'☠️ Silný jed', desc:lv=>`Jed ${lv*5}/tick na ${3+Math.floor(lv/2)} ticků` },
        { k:'revitalize', name:'🌱 Revitalizace', desc:lv=>`Léčení ×${1+lv*0.5}` }
      ]
    }
  ];
  const SCHOOL_MAP = {};
  SCHOOLS.forEach(s => SCHOOL_MAP[s.id] = s);

  // ===== SCHOOL PASSIVES =====
  function getFireDmgPct() {
    if (state.activeSchool !== 'fire') return 0;
    const lv = state.schoolLevels['fire'] || 0;
    if (lv < 2) return 0;
    let pct = lv * 10;           // dmgBoost (index 1): +lv*10%
    if (lv >= 4) pct += 10 + lv * 10; // dmgBoost2 (index 3): +10+lv*10%
    return pct;
  }
  function getNaturePoisonTick() {
    if (state.activeSchool !== 'nature') return 0;
    const lv = state.schoolLevels['nature'] || 0;
    if (lv < 2) return 0;
    // poison (index 1) + poison2 (index 3)
    let tick = lv * 3;           // poison: lv*3
    if (lv >= 4) tick += lv * 5; // poison2: lv*5
    return tick;
  }
  function getIceChillPct() {
    if (state.activeSchool !== 'ice') return 0;
    const lv = state.schoolLevels['ice'] || 0;
    if (lv < 2) return 0;
    // chill lv2=30%, lv3=35%, lv4(chill2)=40%, lv5=45%
    return lv * 5 + 20;
  }

  // ===== ITEMS (WEAPONS/ARMOR) =====
  const ITEMS = [
    { id:'fists', name:'Pěsti', type:'weapon', baseDmg:2, bonusHp:0, icon:'👊' },
    { id:'rags', name:'Hadry', type:'armor', baseDmg:0, bonusHp:0, icon:'🪢' },
    { id:'dagger', name:'Dýka', type:'weapon', baseDmg:17, bonusHp:0, cost:15, icon:'🗡️' },
    { id:'leather', name:'Kožená zbroj', type:'armor', baseDmg:0, bonusHp:30, cost:20, icon:'🧥' },
    { id:'shortsword', name:'Krátký meč', type:'weapon', baseDmg:24, bonusHp:0, cost:25, icon:'⚔️' },
    { id:'sword', name:'Meč', type:'weapon', baseDmg:28, bonusHp:0, cost:30, icon:'⚔️' },
    { id:'chainmail', name:'Kroužková pletva', type:'armor', baseDmg:0, bonusHp:60, cost:35, icon:'🛡️' },
    { id:'battleAxe', name:'Válečná sekera', type:'weapon', baseDmg:35, bonusHp:0, cost:45, icon:'🪓' },
    { id:'spear', name:'Kopí', type:'weapon', baseDmg:42, bonusHp:0, cost:55, icon:'🔱' },
    { id:'flameSword', name:'Plamenový meč', type:'weapon', baseDmg:49, bonusHp:0, cost:70, icon:'🔥' },
    { id:'scale', name:'Šupinová zbroj', type:'armor', baseDmg:0, bonusHp:105, cost:60, icon:'🐉' },
    { id:'plate', name:'Plná zbroj', type:'armor', baseDmg:0, bonusHp:135, cost:80, icon:'🛡️' },
    { id:'longsword', name:'Dlouhý meč', type:'weapon', baseDmg:56, bonusHp:0, cost:95, icon:'⚔️' },
    { id:'warHammer', name:'Válečné kladivo', type:'weapon', baseDmg:67, bonusHp:0, cost:120, icon:'🔨' },
    { id:'fullPlate', name:'Plná plátová zbroj', type:'armor', baseDmg:0, bonusHp:180, cost:110, icon:'🛡️' },
    { id:'greatAxe', name:'Obouruční sekera', type:'weapon', baseDmg:80, bonusHp:0, cost:150, icon:'🪓' },
    { id:'dragonScale', name:'Dračí šupiny', type:'armor', baseDmg:0, bonusHp:240, cost:160, icon:'🐲' },
    { id:'excalibur', name:'Excalibur', type:'weapon', baseDmg:98, bonusHp:60, cost:220, icon:'⚡' },
    { id:'adamantPlate', name:'Adamantitová zbroj', type:'armor', baseDmg:0, bonusHp:330, cost:250, icon:'💎' },
  ];
  const ITEM_MAP = {}; ITEMS.forEach(i => ITEM_MAP[i.id] = i);

  // ===== MONSTER FACES =====
  const MONSTER_FACES = [
    ['🧚','🌳','🍄','🐺','🦌','🦋','🐿️','🐗'],
    ['🐍','🦂','👺','🏜️','🐪','🪲','🦎','☀️'],
    ['🐙','🦈','🐟','🦀','🐚','🐳','🪼','🐠'],
    ['👹','🐉','🔥','👺','💀','🗿','⚔️','🦅'],
    ['👻','❄️','🧊','🐺','🦅','⛄','🧝','🌨️'],
    ['⚡','🤖','🔮','👁️','🌀','🧙','🕳️','💫'],
    ['🪨','⛏️','🐭','🕷️','🦇','💎','🧌','🐜'],
    ['🌿','🌸','🦋','🐞','🌺','🍃','🌈','🕊️'],
    ['☁️','🏰','🦄','✨','🌙','⭐','🪽','👼'],
    ['💀','☠️','🖤','🔪','🩸','👁️‍🗨️','🌑','🐦‍⬛'],
  ];
  const MONSTER_NAMES = [
    ['Víla','Skřítek','Muchomůrka','Vlk','Jelen','Motýl','Veverka','Kanec'],
    ['Zmije','Štír','Pouštní démon','Poutník','Velbloud','Brouk','Ještěr','Žár'],
    ['Chobotnice','Žralok','Ryba','Krab','Mušle','Velryba','Medúza','Rybička'],
    ['Pekelník','Drak','Ohnivec','Démon','Kostlivec','Golem','Meč','Sup'],
    ['Duch','Sníh','Zamrzlec','Vlk','Sokol','Sněhulák','Elf','Vánice'],
    ['Blesk','Golem','Mág','Vidoucí','Vortex','Čaroděj','Trhlina','Hvězda'],
    ['Skaloun','Kopáč','Netopýr','Pavouk','Krysa','Drahokam','Troll','Mravenec'],
    ['Kvítek','Jaro','Motýl','Beruška','Růže','Lístek','Duha','Holubice'],
    ['Oblak','Strážce','Jednorožec','Třpyt','Luna','Hvězda','Anděl','Křídlo'],
    ['Smrt','Mor','Tma','Čepel','Krev','Stín','Měsíc','Havran'],
  ];

  // ===== LOCATIONS (MAP) =====
  function getMonsterFace(theme, floor) {
    const pool = MONSTER_FACES[theme] || MONSTER_FACES[0];
    return pool[rand(0, pool.length - 1)];
  }
  function getMonsterName(theme) {
    const pool = MONSTER_NAMES[theme] || MONSTER_NAMES[0];
    return pool[rand(0, pool.length - 1)];
  }
  function getFloorMonsterSet(theme, floor) {
    const faces = MONSTER_FACES[theme] || MONSTER_FACES[0];
    const names = MONSTER_NAMES[theme] || MONSTER_NAMES[0];
    const result = [];
    for (let i = 0; i < 5; i++) {
      const idx = (floor * 5 + i + theme * 3) % faces.length;
      result.push({face: faces[idx], name: names[idx]});
    }
    return result;
  }
  const DIRECTIONS = ['⬆️','⬇️','⬅️','➡️'];
  const DUNGEON_THEMES = [
    { bg:'#0d2d0d', border:'#2ecc71', borderGlow:'rgba(46,204,113,0.3)' },   // 0 Les — zelená
    { bg:'#2a1a08', border:'#e67e22', borderGlow:'rgba(230,126,34,0.3)' },   // 1 Poušť — oranžová
    { bg:'#0d0d2d', border:'#3498db', borderGlow:'rgba(52,152,219,0.3)' },   // 2 Propasti — modrá
    { bg:'#2d0d0d', border:'#e74c3c', borderGlow:'rgba(231,76,60,0.3)' },    // 3 Výspy — červená
    { bg:'#0d122d', border:'#a8d8ea', borderGlow:'rgba(168,216,234,0.3)' },  // 4 Štíty — ledová modrá
    { bg:'#2a0d1a', border:'#f1c40f', borderGlow:'rgba(241,196,15,0.3)' },   // 5 Věž — žlutá
    { bg:'#100d2d', border:'#9b59b6', borderGlow:'rgba(155,89,182,0.3)' },   // 6 Jeskyně — fialová
    { bg:'#1a2a0d', border:'#e91e63', borderGlow:'rgba(233,30,99,0.3)' },    // 7 Zahrady — růžová
    { bg:'#0d0d24', border:'#b0d0ff', borderGlow:'rgba(176,208,255,0.3)' },  // 8 Nebe — světle modrá
    { bg:'#150d1a', border:'#8e44ad', borderGlow:'rgba(142,68,173,0.3)' },   // 9 Stíny — tmavě fialová
    { bg:'#2a000d', border:'#ff6b6b', borderGlow:'rgba(255,107,107,0.3)' },  // 10 Chaos — rudá
    { bg:'#1a0505', border:'#c0392b', borderGlow:'rgba(192,57,43,0.3)' },    // 11 Smrt — tmavě červená
  ];
  const LOCATIONS = [
    { id:0, name:'Začarovaný les', icon:'🌲', theme:0, monsters:5, floors:5, xpReward:10, bossXp:30, boss:{name:'Stínový pán',face:'👹',hp:10}, reward:{gold:5,weapon:'dagger'} },
    { id:1, name:'Pouštní říše', icon:'🏜️', theme:1, monsters:5, floors:5, xpReward:16, bossXp:50, boss:{name:'Faraonova kletba',face:'🐍',hp:14}, reward:{gold:12} },
    { id:2, name:'Hlubinné propasti', icon:'🌊', theme:2, monsters:5, floors:5, xpReward:24, bossXp:70, boss:{name:'Hlubinář',face:'🐙',hp:16}, reward:{gold:15,weapon:'sword'} },
    { id:3, name:'Pekelné výspy', icon:'🔥', theme:3, monsters:5, floors:5, xpReward:32, bossXp:100, boss:{name:'Pekelný démon',face:'👹',hp:18}, reward:{gold:20} },
    { id:4, name:'Mrazivé štíty', icon:'❄️', theme:4, monsters:5, floors:5, xpReward:40, bossXp:130, boss:{name:'Ledový král',face:'❄️',hp:22}, reward:{gold:25,armor:'chainmail'} },
    { id:5, name:'Hromová věž', icon:'⚡', theme:5, monsters:5, floors:5, xpReward:50, bossXp:160, boss:{name:'Arcimág',face:'🔮',hp:26}, reward:{gold:30} },
    { id:6, name:'Jeskyně pokladů', icon:'💎', theme:6, monsters:5, floors:5, xpReward:60, bossXp:200, boss:{name:'Král trollů',face:'🧌',hp:30}, reward:{gold:40,weapon:'warHammer'} },
    { id:7, name:'Kvetoucí zahrady', icon:'🌸', theme:7, monsters:5, floors:5, xpReward:72, bossXp:240, boss:{name:'Jarní víla',face:'🧚',hp:35}, reward:{gold:50} },
    { id:8, name:'Nebeská říše', icon:'☁️', theme:8, monsters:5, floors:5, xpReward:84, bossXp:280, boss:{name:'Anděl pomsty',face:'👼',hp:40}, reward:{gold:60,armor:'dragonScale'} },
    { id:9, name:'Stínová říše', icon:'🌑', theme:9, monsters:5, floors:5, xpReward:100, bossXp:340, boss:{name:'Pán temnot',face:'💀',hp:50}, reward:{gold:80,weapon:'excalibur'} },
    { id:10, name:'Zóna chaosu', icon:'🌀', theme:0, monsters:5, floors:5, xpReward:120, bossXp:400, boss:{name:'Chaos lord',face:'👾',hp:60}, reward:{gold:100,weapon:'voidBlade'} },
    { id:11, name:'Síně smrti', icon:'💀', theme:0, monsters:5, floors:5, xpReward:150, bossXp:500, boss:{name:'Smrták',face:'💀',hp:80}, reward:{gold:150,armor:'voidPlate'} },
  ];

  // ===== STATE =====
  let state = {};
  let mapBattleState = {};
  let trainingState = {};
  let minigameState = {};
  let _activeIntervals = [];

  function cleanupTimers() {
    document.body.classList.remove('battle-active');
    _activeIntervals.forEach(id => { try { clearInterval(id); } catch {} }); _activeIntervals = [];
    if (minigameState.timerInterval) { clearInterval(minigameState.timerInterval); minigameState.timerInterval = null; }
    if (minigameState.countdownInterval) { clearInterval(minigameState.countdownInterval); minigameState.countdownInterval = null; }
    ['simonTimeout'].forEach(k => { if (minigameState[k]) { clearTimeout(minigameState[k]); delete minigameState[k]; } });
    if (mapBattleState) {
      if (mapBattleState._attackTimer) { clearTimeout(mapBattleState._attackTimer); mapBattleState._attackTimer = null; }
      if (mapBattleState._sequenceTimer) { clearTimeout(mapBattleState._sequenceTimer); mapBattleState._sequenceTimer = null; }
      if (mapBattleState._ringTimer) { clearTimeout(mapBattleState._ringTimer); mapBattleState._ringTimer = null; }
      if (mapBattleState._attackWindowTimer) { clearTimeout(mapBattleState._attackWindowTimer); mapBattleState._attackWindowTimer = null; }
      if (mapBattleState._glowTimer) { clearTimeout(mapBattleState._glowTimer); mapBattleState._glowTimer = null; }
      if (mapBattleState._freezeTimer) { clearInterval(mapBattleState._freezeTimer); mapBattleState._freezeTimer = null; }
      if (mapBattleState._bonusRaf) { cancelAnimationFrame(mapBattleState._bonusRaf); mapBattleState._bonusRaf = null; }
    }
  }

  const SAVE_KEY = 'dungeonRecallV6';
  function defaultState() {
    const schoolLevels = {};
    SCHOOLS.forEach(sk => { schoolLevels[sk.id] = 0; });
    const s = { schoolLevels, activeSchool:null, talentPoints:20, hero:{level:1,xp:0,gold:5000,hp:100,maxHp:100,baseDmg:12,inventory:[],equip:{weapon:'fists',armor:'rags'},attrStr:0,attrVit:0,attrDex:0,attrPoints:50}, deaths:0, wins:0,
      locationProgress:[0,0,0,0,0,0,0,0,0,0], bossesDefeated:[false,false,false,false,false,false,false,false,false,false], floorProgress:[0,0,0,0,0,0,0,0,0,0], spellUsedThisFloor:{} };
    return s;
  }
  function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.schoolLevels) return s; } catch {} return defaultState(); }
  function saveGame() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  function resetGame() { state = defaultState(); saveGame(); showScreen('map'); }

  // ===== SCREENS =====
  const SCREEN_IDS = { map:'mapScreen', mapBattle:'mapBattleScreen', talents:'talentsScreen', hero:'heroScreen', result:'resultScreen', shop:'shopScreen', inventory:'inventoryScreen', guide:'guideScreen' };
  function showScreen(name) {
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
    // Přepnout na overworld BGM mimo boj
    if (name !== 'mapBattle' && name !== 'battle' && name !== 'result') switchBGM('overworld');
    if (name === 'map') renderMap();
    else if (name === 'talents') renderTalents();
    else if (name === 'hero') renderHero();
    else if (name === 'shop') renderShop();
    else if (name === 'inventory') renderInventory();
  }

  function showMessage(msg) {
    const p = document.createElement('div');
    p.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:300;background:#12122a;border:2px solid #e94560;border-radius:12px;padding:20px 30px;text-align:center;font-size:16px;font-weight:bold';
    p.textContent = msg; document.body.appendChild(p);
    setTimeout(() => { p.style.transition='opacity 0.3s'; p.style.opacity='0'; setTimeout(()=>p.remove(),300); }, 2000);
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
      <div class="levelup-details">💪 +1 atributový bod<br>❤️ Plné vyléčení</div>
    </div>`;
    document.body.appendChild(overlay);
    sfxLevelUp();
    // Po 2.5s fade-out a odstranit
    setTimeout(() => {
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 500);
    }, 2500);
  }

  // ===== KILL POPUP =====
  function showKillPopup(monsterFace, monsterName, xpGain, goldGain, playerHp, maxHp, onContinue) {
    const el = document.createElement('div');
    el.className = 'kill-popup-overlay';
    el.innerHTML = `<div class="kill-popup-content">
      <div class="kill-popup-icon">${monsterFace}</div>
      <div class="kill-popup-name">${monsterName} poražen!</div>
      <div class="kill-popup-stats">
        <span>⚔️ +${xpGain} XP</span>
        <span>💰 +${goldGain}</span>
      </div>
      <div class="kill-popup-hp">❤️ ${playerHp}/${maxHp}</div>
      <div class="kill-popup-tap">👆 Klikni pro pokračování</div>
    </div>`;
    el.style.cursor = 'pointer';
    document.body.appendChild(el);
    el.addEventListener('click', function handler() {
      el.removeEventListener('click', handler);
      el.classList.add('fade-out');
      setTimeout(() => { el.remove(); if (onContinue) onContinue(); }, 350);
    });
  }

  // ===== MAP =====
  let _expandedDungeon = -1;
  function toggleDungeon(idx) {
    _expandedDungeon = _expandedDungeon === idx ? -1 : idx;
    renderMap();
  }
  function renderMap() {
    const h = state.hero;

    $('mapScroll').innerHTML = LOCATIONS.map((loc, i) => {
      const prevDone = true; // DEBUG: odemčeno
      const unlocked = true; // DEBUG: odemčeno
      const completed = state.bossesDefeated[i];
      const curFloor = state.floorProgress[i] || 0;
      const curProgress = state.locationProgress[i] || 0;
      const expanded = _expandedDungeon === i;
      const theme = DUNGEON_THEMES[i] || DUNGEON_THEMES[0];
      let badgeHtml;
      if (completed) {
        badgeHtml = `<div class="map-loc-badge" style="background:${theme.border};color:${theme.bg}"><div class="badge-floor">✅</div><div class="badge-count">Hotovo</div></div>`;
      } else if (!unlocked) {
        badgeHtml = `<div class="map-loc-badge" style="background:${theme.border};color:${theme.bg}"><div class="badge-floor">🔒</div><div class="badge-count">Zamčeno</div></div>`;
      } else if (curFloor >= 4) {
        badgeHtml = `<div class="map-loc-badge" style="background:${theme.border};color:${theme.bg}"><div class="badge-floor">BOSS</div></div>`;
      } else {
        badgeHtml = `<div class="map-loc-badge" style="background:${theme.border};color:${theme.bg}"><div class="badge-floor">P${curFloor+1}</div><div class="badge-count">${curProgress}/${loc.monsters}</div></div>`;
      }
      // Floor sub-cards P1-P5
      let floorHtml = '';
      if (unlocked && expanded) {
        for (let f = 0; f < 5; f++) {
          const isBossFloor = f >= 4;
          const floorDone = completed || f < curFloor;
          const lockedFloor = false; // DEBUG: odemčeno (původně f > curFloor && !completed)
          let fIcon, fText;
          if (floorDone) { fIcon = '✅'; fText = 'Hotovo'; }
          else if (lockedFloor) { fIcon = '🔒'; fText = 'Zamčeno'; }
          else if (isBossFloor) { fIcon = '👹'; fText = 'BOSS'; }
          else if (f === curFloor) { fIcon = '👾'; fText = `${loc.monsters - curProgress} zbývá`; }
          else { fIcon = '✅'; fText = ''; }
          floorHtml += `<div class="map-floor-card ${floorDone?'floor-done':lockedFloor?'floor-locked':'floor-active'}" style="border-color:${theme.border};background:linear-gradient(135deg,${theme.bg}bb,${theme.bg}66)" onclick="${lockedFloor?'':'game.enterLocation('+i+','+f+')'}">
            <span class="floor-card-icon">${fIcon}</span>
            <span class="floor-card-num">${isBossFloor?'BOSS':`P${f+1}`}</span>
            <span class="floor-card-text">${fText}</span>
          </div>`;
        }
      }
      return `<div class="map-location-wrap">
        <div class="map-location ${completed?'completed':!unlocked?'locked':''} ${expanded?'expanded':''}" style="--theme-glow:${theme.borderGlow};background:linear-gradient(135deg,${theme.bg},${theme.bg}88 80%);border-color:${theme.border};${completed?'opacity:0.7':''}" onclick="${!unlocked?'':`game.toggleDungeon(${i})`}">
          <div class="map-loc-icon-big">${loc.icon}</div>
          <div class="map-loc-info">
            <div class="map-loc-name">${loc.name}</div>
            <div class="map-loc-mechs">${getDungeonMechanics(i).join(' ')}</div>
          </div>
          ${badgeHtml}
        </div>
        ${floorHtml}
      </div>`;
    }).join('');
  }

  // ===== MAP BATTLE =====
  function enterLocation(locId, optFloor) {
    const loc = LOCATIONS[locId];
    if (!loc) return;
    //if (locId > 0 && !state.bossesDefeated[locId-1]) { showMessage('🔒 Nejdřív poraz předchozí lokaci!'); return; } // DEBUG: odemčeno

    if (optFloor !== undefined && !state.bossesDefeated[locId]) {
      state.floorProgress[locId] = optFloor;
      state.locationProgress[locId] = 0;
    }

    cleanupTimers();
    startLocation(locId);
  }

  function startLocation(locId) {
    const loc = LOCATIONS[locId];
    if (!loc) return;
    const floor = state.floorProgress[locId] || 0; // 0-4 (0=patro1, 4=boss)
    const progress = state.locationProgress[locId] || 0; // kills on current floor 0-4
    const isBoss = floor >= 4; // boss v 5. patře
    // Každé nové patro resetuje HP hrdiny
    if (progress === 0) {
      state.hero.hp = state.hero.maxHp;
    }
    const playerMaxHp = state.hero.maxHp || 100;
    const playerHp = Math.min(state.hero.hp || playerMaxHp, playerMaxHp);
    // HP škáluje s dungeonem a patrem — progresivně
    const monsterHp = Math.round((35 + locId * 75) + 15 * floor + progress * 5);
    const bossHp = Math.round(200 + locId * 200 + floor * 30);
    const bossBaseHp = isBoss ? bossHp : monsterHp;

    const floorMonsters = isBoss ? [] : getFloorMonsterSet(loc.theme, floor);
    mapBattleState = {
      locId, loc, isBoss, progress, floor,
      bossHp: bossBaseHp, maxBossHp: bossBaseHp,
      playerHp: playerHp, maxPlayerHp: playerMaxHp,
      ended: false, turn: 0, isAttacking: false,
      mistakes: 0, floorMistakes: 0, stunned: 0, frozen: 0, dot: 0, dotTicksLeft: 0, chillPercent: 0, chillTicksLeft: 0, shieldActive: null,
      _ringTimer: null, _sequenceTimer: null, _attackWindowTimer: null,
      _freezeTimer: null, _bonusRaf: null,
      spellCooldowns: {},
      floorMonsters,
      monsterFace: isBoss ? loc.boss.face : floorMonsters[progress].face,
      currentMonsterName: isBoss ? loc.boss.name : floorMonsters[progress].name,
      monsterIcons: isBoss ? [] : floorMonsters.map(function(m){return m.face;}),
      monsterNames: isBoss ? [] : floorMonsters.map(function(m){return m.name;}),
      // Sekvence: hráč musí přežít várku útoků, pak může udeřit
      sequence: [], sequenceIndex: 0, inAttackWindow: false,
      currentAttack: null, isHeavyAttack: false, isBlockAttack: false,
      isInvertedAttack: false, isWaitAttack: false, isTwinAttack: false,
      _heavySwipes: 0, _twinSwipes: [], // twin: které směry už hráč swipnul
      isRapidAttack: false, rapidTaps: 0, rapidTarget: 0
    };
    // Schools handled via activeSchool

    showScreen('mapBattle');
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
    setTimeout(() => mapBattleTurn(), 250);
  }

  function updateMapBattleUI() {
    const mb = mapBattleState;
    if (!mb.loc) return;
    if (mb.isBoss) {
      $('mbEnemyName').textContent = `${mb.loc.boss.face} ${mb.loc.boss.name}`;
      $('mbLocation').textContent = `👑 BOSS ${mb.loc.name} — P5`;
    } else {
      const floorStr = `P${mb.floor+1}`;
      $('mbEnemyName').textContent = `${mb.monsterFace} ${mb.currentMonsterName}`;
      $('mbLocation').textContent = `${mb.loc.name} — P${mb.floor+1}`;
    }
    const pHpPct = Math.round((mb.playerHp / mb.maxPlayerHp) * 100);
    const eHpPct = mb.isBoss ? Math.round((mb.bossHp / mb.maxBossHp) * 100) : Math.round((mb.bossHp / mb.maxBossHp) * 100);
    $('mbEnemyHp').textContent = `❤️ ${mb.bossHp}/${mb.maxBossHp}`;
    // Monster icons row
    const iconRow = $('mbMonsterIcons');
    if (iconRow) {
      if (!mb.isBoss) {
        iconRow.classList.remove('hidden');
        iconRow.innerHTML = mb.monsterIcons.map((face, i) => {
          const defeated = i < mb.progress;
          return `<span class="monster-icon${defeated?' defeated':''}">${face}${defeated?'<span class="monster-icon-x">❌</span>':''}</span>`;
        }).join('');
      } else {
        iconRow.classList.add('hidden');
      }
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
    // Arena HP pod panáčkem
    const arenaHp = $('mbPlayerArenaHp');
    if (arenaHp) {
      arenaHp.textContent = `❤️ ${mb.playerHp}/${mb.maxPlayerHp}`;
      arenaHp.classList.remove('hidden');
    }
    const emoji = mb.isBoss ? mb.loc.boss.face : mb.monsterFace;
    const fig = $('mbFigure');
    fig.textContent = emoji;
    // (hint necháme pro bonus info — nastaví se až v onMapAttack)

    // School spells — HTML tlacitka nad Utokem, vzdy na stejne pozici (84px)
    const fireBtn = $('mbSpellFireBtn');
    const healBtn = $('mbSpellHealBtn');
    const freezeBtn = $('mbSpellFreezeBtn');
    // Vsechna schovat (default)
    [fireBtn, healBtn, freezeBtn].forEach(b => { if (b) { b.classList.add('hidden'); b.classList.remove('active', 'used'); } });
    const activeId = state.activeSchool;
    if (!activeId) return;
    const school = SCHOOL_MAP[activeId];
    if (!school) return;
    const lv = state.schoolLevels[activeId] || 0;
    if (lv === 0) return;
    const spellKey = `${mb.locId}_${mb.floor}`;
    const used = state.spellUsedThisFloor[spellKey];
    // Ukazat spravne kouzlo — VZDY viditelne, aktivni jen kdyz je prilezitost
    const btn = activeId === 'fire' ? fireBtn : activeId === 'ice' ? freezeBtn : healBtn;
    if (!btn) return;
    btn.classList.remove('hidden');
    if (used) {
      btn.classList.add('used');
      btn.innerHTML = activeId === 'fire' ? '🔥<span class="spell-x">❌</span>' : activeId === 'ice' ? '❄️<span class="spell-x">❌</span>' : '💚<span class="spell-x">❌</span>';
      return;
    }
    // Obnovit puvodni obsah
    btn.innerHTML = activeId === 'fire' ? '🔥' : activeId === 'ice' ? '❄️' : '💚';
    // Aktivni: freeze vzdy, ostatni jen v attack okne
    if (activeId === 'ice') {
      btn.classList.add('active');
    } else if (mb.inAttackWindow) {
      btn.classList.add('active');
    }
  }

  function updateActionButtons() {
    const mb = mapBattleState;
    const atk = $('mbAttackBtn');
    const blk = $('mbBlockBtn');
    // Tlacitko Utok jen v utocnem okne
    if (atk) {
      if (mb.inAttackWindow) {
        atk.classList.add('active');
      } else {
        atk.classList.remove('active');
      }
    }
    // Blok stale aktivni (unahleny blok = chyba)
    if (blk) blk.classList.add('active');
  }

  function setupMapBattleInput() {
    const arena = $('mbArena');
    if (!arena) return;
    const old = arena._mbHandlers;
    if (old) old.forEach(h => arena.removeEventListener(h[0], h[1]));

    let startX, startY;
    const handlers = [];

    // Click handler for attack button (pointerdown = immediate, no 300ms click delay)
    const atkBtn = $('mbAttackBtn');
    if (atkBtn) {
      const atkHandler = (e) => {
        e.stopPropagation();
        onMapAttack();
      };
      atkBtn.addEventListener('pointerdown', atkHandler);
      handlers.push(['pointerdown', atkHandler]);
    }

    // Click handler for block button (pointerdown = immediate, no 300ms click delay)
    const blkBtn = $('mbBlockBtn');
    if (blkBtn) {
      const blkHandler = (e) => {
        e.stopPropagation();
        onMapBlock();
      };
      blkBtn.addEventListener('pointerdown', blkHandler);
      handlers.push(['pointerdown', blkHandler]);
    }

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
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (mapBattleState._attackProcessed) return; onMapAttack(); }
      if (e.key === 'Control' || e.key === 'ctrl') { e.preventDefault(); onMapBlock(); }
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
    // Arena spell tlacitka (Fireball/Heal)
    const spellFireBtn = $('mbSpellFireBtn');
    if (spellFireBtn) {
      const fireHandler = (e) => {
        e.stopPropagation();
        onMapAttackSpell('fireball');
      };
      spellFireBtn.addEventListener('pointerdown', fireHandler);
      handlers.push(['pointerdown', fireHandler]);
    }
    const spellHealBtn = $('mbSpellHealBtn');
    if (spellHealBtn) {
      const healHandler = (e) => {
        e.stopPropagation();
        onMapAttackSpell('heal');
      };
      spellHealBtn.addEventListener('pointerdown', healHandler);
      handlers.push(['pointerdown', healHandler]);
    }
    const spellFreezeBtn = $('mbSpellFreezeBtn');
    if (spellFreezeBtn) {
      const freezeHandler = (e) => {
        e.stopPropagation();
        castMapSpell('freeze');
      };
      spellFreezeBtn.addEventListener('pointerdown', freezeHandler);
      handlers.push(['pointerdown', freezeHandler]);
    }
  }

  function getFloorTimerMultiplier(floor) {
    // P1=100%, P2=92%, P3=84%, P4=76%, P5/boss=68%
    const mults = [1.0, 0.92, 0.84, 0.76, 0.68];
    return mults[Math.min(floor, 4)] || 1.0;
  }

  function getDungeonAttackChances(locId) {
    if (locId === 0) return { normal: 100, heavy: 0, block: 0, inverted: 0, twin: 0 };
    if (locId === 1) return { normal: 70, heavy: 0, block: 30, inverted: 0, twin: 0 };
    if (locId === 2) return { normal: 70, heavy: 30, block: 0, inverted: 0, twin: 0 };
    if (locId === 3) return { normal: 70, heavy: 0, block: 0, inverted: 0, twin: 30 };
    if (locId === 4) return { normal: 70, heavy: 0, block: 0, inverted: 30, twin: 0 };
    if (locId === 5) return { normal: 70, heavy: 0, block: 0, inverted: 0, twin: 0, rapid: 30 };
    if (locId === 6) return { normal: 25, heavy: 40, block: 35, inverted: 0, twin: 0, rapid: 0 };
    if (locId === 7) return { normal: 20, heavy: 25, block: 25, inverted: 0, twin: 20, rapid: 10 };
    if (locId === 8 || locId === 9 || locId === 10 || locId === 11) return { normal: 22, heavy: 18, block: 18, inverted: 18, twin: 15, rapid: 12 };
    return { normal: 70, heavy: 20, block: 10, inverted: 0, twin: 0 };
  }

  const _arrowSvg = (fill, extra = '') =>
    `<svg viewBox="0 0 16 16" width="26" height="26"><path${extra} d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="${fill}" stroke="${fill}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

  function getDungeonMechanics(locId) {
    const c = getDungeonAttackChances(locId);
    const icons = [];
    icons.push(_arrowSvg('#bbb')); // normální úhyb — vždy
    if (c.heavy > 0) icons.push(_arrowSvg('#c4a84c'));
    if (c.block > 0) icons.push('<span style="font-size:24px;display:inline-flex;align-items:center;vertical-align:middle">🛡️</span>');

    if (c.inverted > 0) icons.push(_arrowSvg('#5fa87a'));
    if (c.twin > 0) icons.push('<svg viewBox="0 0 16 16" width="26" height="26"><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="#5a8aaa" stroke="#5a8aaa" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" transform="translate(-2.5,0)"/><path d="M8 15L3 8L5.5 8L5.5 1L10.5 1L10.5 8L13 8L8 15Z" fill="#5a8aaa" stroke="#5a8aaa" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" transform="translate(2.5,0)"/></svg>');
    if (c.rapid > 0) icons.push('<span style="font-size:24px;display:inline-flex;align-items:center;vertical-align:middle">⏰</span>');
    return icons;
  }

  function generateAttack(chances, prevType, locId, floor) {
    const randTotal = chances.normal + chances.heavy + chances.block + chances.inverted + chances.twin + (chances.rapid||0);
    const randNum = Math.random() * randTotal;
    let type = 'normal';
    if (randNum < chances.inverted) { type = 'inverted'; }
    else if (randNum < chances.inverted + chances.block) { type = 'block'; }
    else if (randNum < chances.inverted + chances.block + chances.heavy) { type = 'heavy'; }
    else if (randNum < chances.inverted + chances.block + chances.heavy + chances.twin) { type = 'twin'; }
    else if (randNum < chances.inverted + chances.block + chances.heavy + chances.twin + (chances.rapid||0)) { type = 'rapid'; }
    // Timer: base 1000ms, floor multiplikátor (P1=1000, P5/boss=500ms)
    const mult = getFloorTimerMultiplier(floor || 0);
    const baseTime = Math.round(1000 * mult);
    // Malá náhoda ±10% pro pestrost
    const jitter = Math.round(baseTime * (0.9 + Math.random() * 0.2));
    const windowTime = (type === 'heavy' || type === 'twin') ? Math.round(jitter * 1.5) : (type === 'rapid' ? Math.round(jitter * 3.0) : jitter);
    const dir = DIRECTIONS[rand(0,3)];
    if (type === 'twin') {
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
    if (attack.type === 'normal') return `${dir} ⚫ Normální — uhni!`;
    if (attack.type === 'heavy') return `${dir} 🟡 Heavy — 2× ${dir}!`;
    if (attack.type === 'twin') return `${dir}↔${attack.twinDir} 🔷 Twin — oba směry!`;
    if (attack.type === 'block') return `🛡️ ${dir} 🔴 Zákeřný — použij ŠTÍT!`;
    if (attack.type === 'inverted') return `${dir} 🟢 Inverzní — udělej OPAK!`;
    if (attack.type === 'rapid') return `🔮 Ťukej! ${attack.rapidTarget}× na plošky!`;
    return `${dir} uhni!`;
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
    fresh.style.strokeDashoffset = '276';
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

  function mapBattleTurn() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;

    if (mb.playerHp <= 0) { endMapBattle(false); return; }

    mb.turn++;
    mb._attackProcessed = false; // reset guard pro nové kolo
    updateMapBattleUI();

    // RPG baseDmg: zbran + level bonus (base 10 + level*3, zbraň dodává baseDmg)
    const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
    mb.baseDmg = 10 + Math.floor(state.hero.level * 3) + weapon.baseDmg + (state.hero.attrStr||0)*2;

    // Generovat sekvenci
    const chances = getDungeonAttackChances(mb.locId);
    // seqLen: locId 10=7, locId 11=10, jinak 5
    let seqLen = 5;
    if (mb.locId === 10) seqLen = 7;
    else if (mb.locId >= 11) seqLen = 10;
    mb.sequence = [];
    let prevType = null;
    for (let i = 0; i < seqLen; i++) {
      const atk = generateAttack(chances, prevType, mb.locId, mb.floor);
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

    // (hint necháme pro bonus info)

    // Začít první útok sekvence
    playSequenceAttack();
  }

  function renderSeqProgress(mb) {
    const el = $('mbSeqProgress');
    if (!el) return;
    const total = mb.sequence.length;
    if (!total) { el.innerHTML = ''; return; }
    const idx = mb.sequenceIndex;
    const inAtk = mb.inAttackWindow;
    const allDone = idx >= total; // všech 5 hotovo → rovnou zářit
    let html = '';
    for (let i = 0; i < total; i++) {
      let cls = 'seq-dot';
      if (inAtk || allDone || i < idx) {
        cls += ' done';
      }
      html += `<div class="${cls}"></div>`;
    }
    if (inAtk || allDone) {
      el.classList.add('seq-ready');
    } else {
      el.classList.remove('seq-ready');
    }
    // Rozsvítit tlačítko útoku hned s puntíky (ne až po 300ms)
    const atk = $('mbAttackBtn');
    if (atk) {
      if (inAtk || allDone) atk.classList.add('active');
      else atk.classList.remove('active');
    }
    el.innerHTML = html;
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
      setTimeout(() => openAttackWindow(), 0);
      return;
    }
    if (mb.inAttackWindow) return;
    if (mb.playerHp <= 0) { endMapBattle(false); return; }
    // Boss smrt s odstupem pro animaci (konec tahu v mapBattleTurn)
    if (mb.bossHp <= 0) { setTimeout(() => { if (!mapBattleState.ended) endMapBattle(true); }, 250); return; }

    const attack = mb.sequence[mb.sequenceIndex];

    mb.currentAttack = attack.dir;
    mb.isHeavyAttack = attack.type === 'heavy';
    mb.isBlockAttack = attack.type === 'block';
    mb.isInvertedAttack = attack.type === 'inverted';
    mb.isTwinAttack = attack.type === 'twin';
    mb.isRapidAttack = attack.type === 'rapid';
    if (attack.type === 'rapid') {
      mb.rapidTaps = 0;
      mb.rapidTarget = attack.rapidTarget || 10;
    } else {
      mb.rapidTaps = 0;
      mb.rapidTarget = 0;
    }
    mb._hitProcessed = false; // reset guard pro aktuální útok

    const windowTime = attack.windowTime;
    // Ice school passive — chill: zpomalit timer na zbývající ticky
    mb._currentWindowTime = windowTime;
    if (mb.chillTicksLeft > 0) {
      mb._currentWindowTime = Math.round(windowTime * (1 + mb.chillPercent / 100));
    }

    // Reset kolečka
    const circle = resetTimerRing();

    // Zobrazit šipku nebo štít
    const actionInfo = $('mbActionInfo');
    const arrow = $('mbArrow');
    if (attack.type === 'block') {
      // Block útok: místo šipky ukážeme 🛡️ v kolečku
      if (arrow) arrow.setAttribute('class', 'boss-attack-arrow hidden');
      if (actionInfo) {
        actionInfo.textContent = '🛡️';
        actionInfo.classList.remove('hidden');
      }
    } else if (attack.type === 'rapid') {
      // Rapid: číslo v kolečku, tap plošky po stranách
      applySchoolColors();
      if (arrow) arrow.setAttribute('class', 'boss-attack-arrow hidden');
      if (actionInfo) actionInfo.classList.add('hidden');
      const target = $('mbRapidTarget');
      if (target) {
        target.textContent = `${attack.rapidTarget}`;
        target.classList.remove('hidden');
      }
      const leftTap = $('mbTapLeft');
      const rightTap = $('mbTapRight');
      if (leftTap) leftTap.classList.remove('hidden');
      if (rightTap) rightTap.classList.remove('hidden');
    } else {
      // Ostatní útoky: šipka
      if (actionInfo) actionInfo.classList.add('hidden');
      if (arrow) {
        arrow.setAttribute('class', 'boss-attack-arrow');
        arrow.setAttribute('viewBox', '0 0 16 16');
        const rotation = { '⬆️': 0, '⬇️': 180, '⬅️': -90, '➡️': 90 }[attack.dir] || 0;
        arrow.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
        if (attack.type === 'heavy') {
          arrow.classList.add('boss-attack-yellow');
          arrow.innerHTML = '<g><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" transform="translate(-3,0)" opacity="0.5"/><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" transform="translate(3,0)"/></g>';
        } else if (attack.type === 'twin') {
          arrow.style.transform = 'translate(-50%, -50%)';
          arrow.classList.add('boss-attack-blue');
          arrow.setAttribute('viewBox', '0 -2 16 20');
          if (attack.dir === '⬆️') {
            arrow.innerHTML = '<g transform="translate(-2.5,0)"><path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" opacity="0.5"/></g><g transform="translate(2.5,0)"><path d="M8 15L3 8L5.5 8L5.5 1L10.5 1L10.5 8L13 8L8 15Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g>';
          } else {
            arrow.innerHTML = '<g transform="translate(0,-2.5)"><path d="M1 8L8 3L8 5.5L15 5.5L15 10.5L8 10.5L8 13L1 8Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" opacity="0.5"/></g><g transform="translate(0,2.5)"><path d="M15 8L8 13L8 10.5L1 10.5L1 5.5L8 5.5L8 3L15 8Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></g>';
          }
        } else {
          arrow.innerHTML = '<path d="M8 1L13 8L10.5 8L10.5 15L5.5 15L5.5 8L3 8L8 1Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>';
          if (attack.type === 'inverted') arrow.classList.add('boss-attack-green');
        }
      }
    }

    // Update action buttons
    updateActionButtons();

    const seqStr = `[${mb.sequenceIndex+1}/${mb.sequence.length}]`;
    // (hint necháme pro bonus info)

    // Timer ring - počkat na vykreslení resetu (fresh circle), pak spustit animaci
    // Barva ringu podle aktivního pasivního bonusu
    if (mb.dotTicksLeft > 0) circle.style.stroke = '#4caf50'; // zelená = jed
    else if (mb.chillTicksLeft > 0) circle.style.stroke = '#4fc3f7'; // modrá = chlad
    else circle.style.stroke = '#888';
    requestAnimationFrame(() => {
      startTimerRing(circle, mb._currentWindowTime);
    });

    if (attack.type === 'rapid') {
          // Rapid — timeout = zásah (nestihl natapat)
          mb._sequenceTimer = setTimeout(() => {
            if (mapBattleState.ended) return;
            onMapHit();
          }, mb._currentWindowTime);
        } else {
      mb._sequenceTimer = setTimeout(() => {
        if (mapBattleState.ended) return;
        onMapHit();
      }, mb._currentWindowTime);
    }
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
      setTimeout(() => dotDmgText.classList.add('hidden'), 600);
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

  function advanceSequence() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;

    // DoT tick — každý timer (úspěch/neúspěch) = jeden tick
    if (doDotTick(mb)) return;

    // Chill tick — odečti jeden tick zpomalení
    if (mb.chillTicksLeft > 0) mb.chillTicksLeft--;

    clearTimeout(mb._ringTimer);
    mb._ringTimer = null;
    // Skrýt bonusový kruh (pokud zbyl z útočného okna)
    const bc2 = document.querySelector('.bonus-zone-circle');
    if (bc2) bc2.style.strokeDasharray = '0 276';
    mb.currentAttack = null;
    mb.isHeavyAttack = false;
    mb.isBlockAttack = false;
    mb.isInvertedAttack = false;
    mb.isTwinAttack = false;
    mb.isRapidAttack = false;
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

    mb.sequenceIndex++;
    renderSeqProgress(mb);

    if (mb.playerHp <= 0) { endMapBattle(false); return; }
    // Boss smrt s odstupem pro animaci (DoT nebo poslední zásah)
    if (mb.bossHp <= 0) { setTimeout(() => { if (!mapBattleState.ended) endMapBattle(true); }, 250); return; }

    // Pokud je sekvence hotová, otevřít útočné okno — reset ringu necháme na openAttackWindow
    if (mb.sequenceIndex >= mb.sequence.length) {
      setTimeout(() => openAttackWindow(), 0);
      return;
    }

    // Reset ringu až teď, když sekvence pokračuje (ne koliduje s openAttackWindow)
    resetTimerRing();
    setTimeout(() => playSequenceAttack(), 150);
  }

  function openAttackWindow() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    mb.inAttackWindow = true;
    mb.isAttacking = false;

    // Zobrazit ⚔️ info ikonu v kolečku
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
    // (hint necháme pro bonus z minulého kola — vyčistí se až v onMapAttack)
    $('mbArrow').setAttribute('class', 'boss-attack-arrow hidden');

    // Timer ring — 1.5× delší než úhyby (podle patra)
    const mb2 = mapBattleState;
    const floorMult = getFloorTimerMultiplier(mb2.floor);
    const atkTime = Math.round(Math.max(400, 1000 * floorMult * 1.5));
    const atkCircle = resetTimerRing();
    
    // 🎯 Crit window — šířka = critChance% z atkTime
    const critChance = (state.hero.attrDex||0) * 1 + 5;
    const bonusPct = Math.min(critChance, 80) / 100; // max 80% timeru
    const bonusMs = Math.max(1, Math.round(atkTime * bonusPct)); // čistě proporční
    // Okno až od druhé třetiny timeru (33%), ať hráč stihne zareagovat
    const bonusStartMin = Math.round(atkTime * 0.33);
    // Okno nesmí přesahovat konec timeru — začátek se dopočítá automaticky
    const bonusStartMs = Math.min(
      bonusStartMin + Math.random() * Math.max(0, atkTime - bonusMs - bonusStartMin),
      atkTime - bonusMs
    );
    mb._bonusStartMs = Math.round(bonusStartMs);
    mb._bonusMs = bonusMs;
    
    // Zobrazit crit kruh (žlutozlatý)
    
    // Vizuální znázornění bonusového okna na kolečku
    const bonusCircum = 276; // obvod bonus kruhu (r=44, shodný s timer ringem)
    const zoneWidthPx = Math.max(1, Math.round((bonusMs / atkTime) * bonusCircum));
    const zoneStartPx = Math.round((bonusStartMs / atkTime) * bonusCircum);
    const bonusCircle = document.querySelector('.bonus-zone-circle');
    if (bonusCircle) {
      bonusCircle.style.strokeDasharray = `${zoneWidthPx} ${bonusCircum - zoneWidthPx}`;
      bonusCircle.style.strokeDashoffset = zoneStartPx;
    }
    mb._zoneWidthPx = zoneWidthPx;
    mb._zoneStartPx = zoneStartPx;
    mb._bonusCircum = bonusCircum;
    mb._atkTime = atkTime;
    
    requestAnimationFrame(() => {
      mb._attackWindowStart = performance.now();
      mb._bonusActive = false; // reset flagu
      startTimerRing(atkCircle, atkTime);
      // ⭐ Sledovat elapsed v rAF loop — synchronizované s CSS animací
      if (mb._bonusRaf) cancelAnimationFrame(mb._bonusRaf);
      (function frame() {
        if (mapBattleState.ended) return;
        const now = performance.now();
        const elapsed = now - mb._attackWindowStart;
        mb._bonusActive = (elapsed >= mb._bonusStartMs && elapsed < mb._bonusStartMs + mb._bonusMs);
        if (elapsed < atkTime) {
          mb._bonusRaf = requestAnimationFrame(frame);
        } else {
          mb._bonusActive = false;
          mb._bonusRaf = null;
        }
      })();
    });

    mb._attackWindowTimer = setTimeout(() => {
      if (mapBattleState.ended) return;
      // (hint necháme pro bonus info — zůstane z minula)
      flashSeqFail();
      missedAttackWindow();
    }, atkTime);
  }

  function missedAttackWindow() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    // Skrýt bonusový kruh
    const bCircle = document.querySelector('.bonus-zone-circle');
    if (bCircle) bCircle.style.strokeDasharray = '0 276';
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

    const color = correct ? 'rgba(46,204,113,' : 'rgba(233,69,96,';
    let shadow = '';
    if (dir === '⬆️') shadow = `inset 0 16px 16px -8px ${color}0.6)`;
    else if (dir === '⬇️') shadow = `inset 0 -16px 16px -8px ${color}0.6)`;
    else if (dir === '⬅️') shadow = `inset 16px 0 16px -8px ${color}0.6)`;
    else if (dir === '➡️') shadow = `inset -16px 0 16px -8px ${color}0.6)`;
    arena.style.boxShadow = shadow;
    if (mapBattleState._glowTimer) clearTimeout(mapBattleState._glowTimer);
    mapBattleState._glowTimer = setTimeout(() => {
      arena.style.boxShadow = '';
    }, 300);
  }

  function spawnProjectileEffect(dir, targetIsPlayer, isCrit) {
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

    const schoolColor = (function() {
      const a = state.activeSchool;
      if (a === 'fire') return { c1:'#f39c12', c2:'#e67e22', rgb:'230,126,34' };
      if (a === 'ice') return { c1:'#5dade2', c2:'#3498db', rgb:'52,152,219' };
      if (a === 'nature') return { c1:'#58d68d', c2:'#2ecc71', rgb:'46,204,113' };
      return { c1:'#bbb', c2:'#999', rgb:'150,150,150' };
    })();
    const color1 = schoolColor.c1;
    const color2 = schoolColor.c2;
    const rgb = schoolColor.rgb;

    const size = isCrit ? 32 : 22;
    const half = size / 2;
    const proj = document.createElement('div');
    proj.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle,${color1},${color2});box-shadow:0 0 ${isCrit ? 20:10}px rgba(${rgb},${isCrit ? 1:0.8});z-index:20;pointer-events:none;`;
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
    ball.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;z-index:30;pointer-events:none;left:${startX - size/2}px;top:${startY - size/2}px;background:radial-gradient(circle,#fff 10%,#f39c12 40%,#e74c3c 80%);box-shadow:0 0 25px rgba(231,76,60,0.8),0 0 50px rgba(243,156,18,0.4);transition:left 0.35s ease-in,top 0.35s ease-in;`;
    arena.appendChild(ball);
    void ball.offsetHeight;
    ball.style.left = (targetX - size/2) + 'px';
    ball.style.top = (targetY - size/2) + 'px';
    // Exploze po dopadu
    setTimeout(() => {
      if (ball.parentNode) ball.remove();
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
      // Damage text
      displayDamageText('🔥');
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

  function spawnDodgeEffect(arena, dir) {
    // Oblak/částice fouknuté od středu arény směrem úhybu — rychlejší a dál
    const rect = arena.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const color = 'rgba(46,204,113,0.25)';

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
    // Rapid — swipe nemá co dělat, zpracovává onMapRapidTap
    if (mb.isRapidAttack) return;
    const attack = mb.sequence[mb.sequenceIndex];
    if (!attack) return;
    if (mb.inAttackWindow) {
      // Při útočném okně: swipe = promarněná šance
      clearTimeout(mb._attackWindowTimer);
      // (hint: zachovat bonus info)
      flashSeqFail();
      missedAttackWindow();
      return;
    }

    // GUARD: pokud _sequenceTimer už je null, útok už byl vyřešen (timer propadl)
    if (mb._sequenceTimer === null) return;

    // Zář strany (nahrazuje pohyb panáčka)
    doArenaGlow(dir, false); // nejdřív červeně (default), přebarvíme na zelenou pokud correct

    let correct = false;

    if (attack.type === 'block') {
      // Block = musí štít, swipováním se nedá uhnout — clearujeme až po volání onMapHit
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
      }
    } else if (attack.type === 'heavy') {
      // Heavy: musíš uhnout 2× stejným směrem ve stejném timeru
      if (dir !== attack.dir) {
        // Špatný směr — zásah
        clearTimeout(mb._sequenceTimer);
        clearTimeout(mb._ringTimer);
        mb._ringTimer = null;
        mb._sequenceTimer = null;
        onMapHit();
        return;
      }
      mb._heavySwipes++;
      doArenaGlow(dir, true);
      playSFX(dodgeSfx);
      // (hint: zachovat bonus info)
      if (mb._heavySwipes >= 2) {
        clearTimeout(mb._sequenceTimer);
        clearTimeout(mb._ringTimer);
        mb._ringTimer = null;
        mb._sequenceTimer = null;
        advanceSequence();
      }
      // Po prvním správném swipu NEpropadnout do correct kontroly
      return;
    } else if (attack.type === 'twin') {
      // Twin: musíš swipnout oba směry (libovolné pořadí)
      // Špatný nebo už swipnutý směr = zásah
      if (dir !== attack.dir && dir !== attack.twinDir) {
        clearTimeout(mb._sequenceTimer);
        clearTimeout(mb._ringTimer);
        mb._ringTimer = null;
        mb._sequenceTimer = null;
        onMapHit();
        return;
      }
      if (mb._twinSwipes.includes(dir)) {
        // Už swipnuto → zásah
        clearTimeout(mb._sequenceTimer);
        clearTimeout(mb._ringTimer);
        mb._ringTimer = null;
        mb._sequenceTimer = null;
        onMapHit();
        return;
      }
      mb._twinSwipes.push(dir);
      doArenaGlow(dir, true);
      playSFX(dodgeSfx);
      // (hint: zachovat bonus info)
      if (mb._twinSwipes.length >= 2) {
        clearTimeout(mb._sequenceTimer);
        clearTimeout(mb._ringTimer);
        mb._ringTimer = null;
        mb._sequenceTimer = null;
        advanceSequence();
      }
      return;
    } else {
      // Normal: musíš uhnout do směru šipky
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      if (dir === attack.dir) {
        correct = true;
        doArenaGlow(dir, true);
      }
    }

    if (correct) {
      playSFX(dodgeSfx);
      // (hint: zachovat bonus info)
      advanceSequence();
    } else {
      onMapHit();
    }
  }

  function onMapBlock() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    // Rapid — blok nemá smysl, zpracovává onMapRapidTap
    if (mb.isRapidAttack) return;
    if (mb.inAttackWindow) {
      // Během útočného okna: blok = promarněná šance
      clearTimeout(mb._attackWindowTimer);
      // (hint: zachovat bonus info)
      flashSeqFail();
      missedAttackWindow();
      return;
    }
    // (hint: zachovat bonus info)
    // (hint: zachovat bonus info)

    // GUARD: útok už byl zpracován (timer propadl)
    if (mb._hitProcessed) return;

    clearTimeout(mb._sequenceTimer);
    clearTimeout(mb._ringTimer);
    mb._ringTimer = null;
    mb._sequenceTimer = null;
    playSFX(blockSfx);
    // (hint: zachovat bonus info)
    advanceSequence();
  }

  function onMapAttack() {
    const _debugNow = performance.now();
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    // DEBUG: zjistit stav v okamžiku kliku
    let _debugElapsed2 = 0;
    if (mb._attackWindowStart) _debugElapsed2 = Math.round(_debugNow - mb._attackWindowStart);
    // Rapid — nelze útočit, zpracovává onMapRapidTap
    if (mb.isRapidAttack) { $('mbHint').textContent = `(rapid, ignoruji)`; return; }
    if (mb._attackProcessed) return; // zabránění dvojitému útoku
    mb._attackProcessed = true; // OKAMŽITÝ guard — i před výpočtem dmg
    if (!mb.inAttackWindow) {
      mb.mistakes = (mb.mistakes || 0) + 1;
      $('mbHint').textContent = `⚠️ Mimo okno! elapsed=${_debugElapsed2}ms`;
      return;
    }

    // Hráč udeřil — zrušit timer okna
    clearTimeout(mb._attackWindowTimer);

    // Reset kolečka
    resetTimerRing();
    // Skrýt bonusový kruh
    const bc = document.querySelector('.bonus-zone-circle');
    if (bc) bc.style.strokeDasharray = '0 276';
    const actInfo = $('mbActionInfo');
    if (actInfo) actInfo.classList.add('hidden');
    updateActionButtons();
    mb._attackProcessed = true; // označit útok jako provedený

    const baseDmg = mb.baseDmg || (10 + Math.floor(state.hero.level * 3) + (ITEM_MAP[state.hero.equip.weapon]||ITEM_MAP['fists']).baseDmg + (state.hero.attrStr||0)*2);
    const critChance = (state.hero.attrDex||0) * 1 + 5;
    const critMult = 2.0;
    let dmg = baseDmg;
    // Fire school passive — damage boost
    const firePct = getFireDmgPct();
    if (firePct > 0) { dmg = Math.round(dmg * (1 + firePct / 100)); }
    
    // 🎯 Crit window — trefa = crit (×2.0), mino = normální útok
    let hintText = '';
    let isCrit = false;
    if (mb._bonusStartMs != null && mb._bonusMs > 0) {
      let _debugElapsed = 0;
      if (mb._attackWindowStart) _debugElapsed = Math.round(performance.now() - mb._attackWindowStart);
      hintText = `🔍 elapsed=${_debugElapsed}ms bonusStart=${mb._bonusStartMs} bonusEnd=${mb._bonusStartMs+mb._bonusMs} active=${mb._bonusActive}`;
      if (mb._bonusActive) {
        isCrit = true;
        dmg = Math.round(dmg * critMult);
        hintText = `💥 Kritik! ⭐ ${dmg}!`;
        playSFX(critSfx);
        // ⭐ Vizuální feedback — kruh zvýraznit
        const critCircle = document.querySelector('.bonus-zone-circle');
        if (critCircle) {
          critCircle.style.stroke = '#ffd700';
          critCircle.style.opacity = '1';
          critCircle.style.strokeWidth = '9';
          setTimeout(() => {
            critCircle.style.stroke = '#f1c40f';
            critCircle.style.opacity = '0.85';
            critCircle.style.strokeWidth = '7';
          }, 400);
        }
      } else {
            hintText = `⚔️ ${dmg}`;
            playSFX(hitSfx);
          }
        } else {
          // bonusStartMs je null! Tohle je problém!
          hintText = `❌ bonusStart=null _bonusMs=${mb._bonusMs} inAtkWin=${mb.inAttackWindow} atkProc=${mb._attackProcessed}`;
          // ⚔️ ${dmg} nahrazeno debugem
          playSFX(hitSfx);
        }
    
    $('mbHint').textContent = hintText;

    // Nature school passive — poison on hit
    const poisonTick = getNaturePoisonTick();
    if (poisonTick > 0 && state.activeSchool === 'nature') {
      const natureLv = state.schoolLevels['nature'] || 0;
      const tickDuration = 2 + Math.floor(natureLv / 2);
      mb.dot = poisonTick;
      mb.dotTicksLeft = tickDuration;
    }
    // Ice school passive — chill on hit
    const chillPct = getIceChillPct();
    if (chillPct > 0) {
      const iceLv = state.schoolLevels['ice'] || 0;
      const pasTicks = 2 + (iceLv >= 4 ? 1 : 0);
      mb.chillPercent = Math.max(mb.chillPercent || 0, chillPct);
      mb.chillTicksLeft = Math.max(mb.chillTicksLeft || 0, pasTicks);
    }

    mb.bossHp -= dmg;
    // Zelený projektil od středu k bossovi
    spawnProjectileEffect(null, false, isCrit);
    // Probliknutí bosse
    const bossFig = $('mbFigure');
    if (bossFig) { bossFig.style.transition = 'filter 0.15s'; bossFig.style.filter = 'brightness(2.5) saturate(1.8)'; setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 100); }

    // Damage text
    const damageText = $('mbDamageText');
    if (damageText) {
      damageText.textContent = `-${dmg}`;
      damageText.classList.remove('hidden');
      setTimeout(() => damageText.classList.add('hidden'), 600);
    }

    if (mb.bossHp <= 0) {
      // Počkat na animaci projektilu a damage textu (500ms)
      setTimeout(() => { if (!mapBattleState.ended) endMapBattle(true); }, 300);
      return;
    }
    updateMapBattleUI();
    mb.inAttackWindow = false;
    $('mbActionInfo').classList.add('hidden');
    updateActionButtons();
    setTimeout(() => mapBattleTurn(), 300);
  }

  function onMapHit() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    // GUARD: pokud _hitProcessed, tohle je druhé volání (např. timer+swipe ve stejném ticku)
    if (mb._hitProcessed) return;
    mb._hitProcessed = true;
    clearTimeout(mb._sequenceTimer);
    clearTimeout(mb._ringTimer);
    mb._ringTimer = null;
    mb._sequenceTimer = null;

    // DoT tick i při neúspěchu — timer proběhl, i když hráč neuhnul
    if (doDotTick(mb)) return;

    // Chill tick i při neúspěchu — jeden tick zpomalení uběhl
    if (mb.chillTicksLeft > 0) mb.chillTicksLeft--;

    const baseBossDmg = Math.max(5, 5 + mb.turn * 4 + mb.locId * 5);
    const bossDmg = Math.round(baseBossDmg * (0.8 + Math.random() * 0.4));
    let amount = bossDmg;
    if (mb.shieldActive) {
      const block = mb.shieldActive;
      if (block >= 100) {
        // (hint: zachovat bonus info)
        advanceSequence();
        return;
      }
      amount = Math.max(1, Math.round(amount * (1 - block/100)));
      mb.shieldActive = null;
    }
    mb.playerHp -= amount;
    mb.mistakes = (mb.mistakes || 0) + 1;
    playSFX(hitSfx);
    // Červený projektil od středu k hráči
    spawnProjectileEffect(null, true);
    // Probliknutí hráče
    const playerFig = $('mbPlayerFigure');
    if (playerFig) { playerFig.style.transition = 'filter 0.15s'; playerFig.style.filter = 'brightness(2.5) saturate(1.8)'; setTimeout(() => { playerFig.style.filter = 'brightness(1)'; setTimeout(() => { playerFig.style.transition = ''; }, 200); }, 100); }

    const playerDamageText = $('mbPlayerDamageText');
    if (playerDamageText) {
      playerDamageText.textContent = `-${amount}`;
      playerDamageText.classList.remove('hidden');
      setTimeout(() => playerDamageText.classList.add('hidden'), 600);
    }

    const arrow = $('mbArrow');
    if (arrow) arrow.setAttribute('class', 'boss-attack-arrow hidden');
    const actionInfo = $('mbActionInfo');
    if (actionInfo) actionInfo.classList.add('hidden');
    updateActionButtons();
    resetTimerRing();
    const counterIcon = $('mbCounterAttack');
    if (counterIcon) counterIcon.classList.add('hidden');
    // Rapid cleanup
    const rTarget = $('mbRapidTarget');
    if (rTarget) rTarget.classList.add('hidden');
    const lTap = $('mbTapLeft');
    const rTap = $('mbTapRight');
    if (lTap) lTap.classList.add('hidden');
    if (rTap) rTap.classList.add('hidden');

    // (hint: zachovat bonus info)
    flashSeqFail();
    updateMapBattleUI();

    if (mb.playerHp <= 0) { endMapBattle(false); return; }

    // Po zásahu restartovat sekvenci — hráč byl potrestán
    setTimeout(() => mapBattleTurn(), 300);
  }

  function onMapAttackSpell(spellId) {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    if (mb._attackProcessed) return;
    if (!mb.inAttackWindow) return;
    let lv = 0;
    if (spellId === 'fireball') lv = state.schoolLevels['fire'] || 0;
    else if (spellId === 'heal') lv = state.schoolLevels['nature'] || 0;
    if (lv === 0) return;
    const spellKey = `${mb.locId}_${mb.floor}`;
    // (hint: zachovat bonus info)
    state.spellUsedThisFloor[spellKey] = true;
    clearTimeout(mb._attackWindowTimer);
    resetTimerRing();
    const actInfo = $('mbActionInfo');
    if (actInfo) actInfo.classList.add('hidden');
    updateActionButtons();
    mb._attackProcessed = true;
    const spellsEl = $('mbSpells');
    if (spellsEl) spellsEl.innerHTML = '';

    if (spellId === 'fireball') {
      const dmg = 25 + lv * 25;
      mb.bossHp -= dmg;
      spawnFireballProjectile();
      // (hint: zachovat bonus info)
      const bossFig = $('mbFigure');
      if (bossFig) { bossFig.style.transition = 'filter 0.2s'; bossFig.style.filter = 'brightness(2.5) hue-rotate(-20deg) saturate(2)'; setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 300); }
    } else if (spellId === 'heal') {
      const hp = 10 + lv * 15;
      mb.playerHp = Math.min(mb.maxPlayerHp, mb.playerHp + hp);
      spawnHealProjectile();
      // (hint: zachovat bonus info)
      const playerFig = $('mbPlayerFigure');
      if (playerFig) { playerFig.style.transition = 'filter 0.3s'; playerFig.style.filter = 'brightness(2) hue-rotate(90deg) saturate(1.5)'; setTimeout(() => { playerFig.style.filter = 'brightness(1)'; setTimeout(() => { playerFig.style.transition = ''; }, 200); }, 400); }
    }
    sfxSuccess();
    updateMapBattleUI(); // zobrazi spell button s .used tridou
    mb.inAttackWindow = false;
    $('mbActionInfo').classList.add('hidden');
    updateActionButtons();
    if (mb.bossHp <= 0) { setTimeout(() => { if (!mapBattleState.ended) endMapBattle(true); }, 300); return; }
    setTimeout(() => mapBattleTurn(), 300);
  }

  function applySchoolColors() {
    const a = state.activeSchool;
    const arena = $('mbArena');
    if (!arena) return;
    let bg, border, dot, dotTapped, dotGlow, dotGlow2, pulse, target, targetGlow;
    let seqDone, seqGlow, seqGlow2, seqGlow3;
    let spellColor, spellBg, spellGlow;
    if (a === 'fire') {
      bg='rgba(243,156,18,0.2)'; border='rgba(243,156,18,0.8)'; dot='rgba(243,156,18,0.45)'; dotTapped='rgba(243,156,18,1)';
      dotGlow='rgba(243,156,18,1)'; dotGlow2='rgba(243,156,18,0.6)'; pulse='rgba(243,156,18,0.6)'; target='#f39c12'; targetGlow='rgba(243,156,18,0.8)';
      seqDone='#f39c12'; seqGlow='rgba(243,156,18,0.4)'; seqGlow2='rgba(243,156,18,0.9)'; seqGlow3='rgba(243,156,18,0.4)';
      spellColor='#f39c12'; spellBg='#1a1a0a'; spellGlow='rgba(243,156,18,0.4)';
    } else if (a === 'ice') {
      bg='rgba(52,152,219,0.2)'; border='rgba(52,152,219,0.8)'; dot='rgba(52,152,219,0.45)'; dotTapped='rgba(52,152,219,1)';
      dotGlow='rgba(52,152,219,1)'; dotGlow2='rgba(52,152,219,0.6)'; pulse='rgba(52,152,219,0.6)'; target='#3498db'; targetGlow='rgba(52,152,219,0.8)';
      seqDone='#3498db'; seqGlow='rgba(52,152,219,0.4)'; seqGlow2='rgba(52,152,219,0.9)'; seqGlow3='rgba(52,152,219,0.4)';
      spellColor='#3498db'; spellBg='#0a1a2a'; spellGlow='rgba(52,152,219,0.4)';
    } else if (a === 'nature') {
      bg='rgba(46,204,113,0.2)'; border='rgba(46,204,113,0.8)'; dot='rgba(46,204,113,0.45)'; dotTapped='rgba(46,204,113,1)';
      dotGlow='rgba(46,204,113,1)'; dotGlow2='rgba(46,204,113,0.6)'; pulse='rgba(46,204,113,0.6)'; target='#2ecc71'; targetGlow='rgba(46,204,113,0.8)';
      seqDone='#2ecc71'; seqGlow='rgba(46,204,113,0.4)'; seqGlow2='rgba(46,204,113,0.9)'; seqGlow3='rgba(46,204,113,0.4)';
      spellColor='#2ecc71'; spellBg='#0a1a0a'; spellGlow='rgba(46,204,113,0.4)';
    } else {
      bg='rgba(180,100,255,0.2)'; border='rgba(180,100,255,0.8)'; dot='rgba(180,100,255,0.45)'; dotTapped='rgba(180,100,255,1)';
      dotGlow='rgba(180,100,255,1)'; dotGlow2='rgba(180,100,255,0.6)'; pulse='rgba(180,100,255,0.6)'; target='#b064ff'; targetGlow='rgba(176,100,255,0.8)';
      seqDone='#888'; seqGlow='rgba(136,136,136,0.4)'; seqGlow2='rgba(136,136,136,0.9)'; seqGlow3='rgba(136,136,136,0.4)';
      spellColor='#e94560'; spellBg='#1a1035'; spellGlow='rgba(233,69,96,0.4)';
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
    // Vizuální feedback — jen ta ploška, na kterou se kliklo
    if (tapId) {
      const el = $(tapId);
      if (el) { el.classList.add('tapped'); setTimeout(() => el.classList.remove('tapped'), 80); }
    }
    playSFX(dodgeSfx);
    // Update cíle v kolečku
    const remaining = mb.rapidTarget - mb.rapidTaps;
    const target = $('mbRapidTarget');
    if (target) target.textContent = `${remaining}`;
    // (hint: zachovat bonus info)
    if (mb.rapidTaps >= mb.rapidTarget) {
      // Hotovo!
      clearTimeout(mb._sequenceTimer);
      clearTimeout(mb._ringTimer);
      mb._ringTimer = null;
      mb._sequenceTimer = null;
      // (hint: zachovat bonus info)
      advanceSequence();
    }
  }

  function castMapSpell(spellId) { if (!spellId) { const a = state.activeSchool; spellId = a === 'ice' ? 'freeze' : a === 'fire' ? 'fireball' : 'heal'; }
    const mb = mapBattleState;
    if (mb.ended) return;
    let lv = 0;
    if (spellId === 'fireball') lv = state.schoolLevels['fire'] || 0;
    else if (spellId === 'heal') lv = state.schoolLevels['nature'] || 0;
    else if (spellId === 'freeze') lv = state.schoolLevels['ice'] || 0;
    if (lv === 0) return;
    // 1x per dungeon
    const spellKey = `${mb.locId}_${mb.floor}`;
    // (hint: zachovat bonus info)
    state.spellUsedThisFloor[spellKey] = true;
    // Clean up spell buttons
    $('mbSpells').innerHTML = '';
    let effectMsg = '';
    if (spellId === 'fireball') {
      const dmg = 25 + lv * 25;
      mb.bossHp -= dmg;
      effectMsg = `🔥 Fireball! ${dmg} poškození!`;
      // Oranžový projektil k bossovi
      spawnProjectileEffect(0, false, false);
      // Dodatečná exploze po 200ms
      setTimeout(() => {
        const bossFig = $('mbFigure');
        if (bossFig) {
          bossFig.style.transition = 'filter 0.2s';
          bossFig.style.filter = 'brightness(2.5) hue-rotate(-20deg) saturate(2)';
          setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 300);
        }
        displayDamageText('🔥');
      }, 180);
    } else if (spellId === 'heal') {
      const hp = 10 + lv * 15;
      mb.playerHp = Math.min(mb.maxPlayerHp, mb.playerHp + hp);
      effectMsg = `💚 +${hp} HP!`;
      // Zelený glow na hráči
      const playerFig = $('mbPlayerFigure');
      if (playerFig) {
        playerFig.style.transition = 'filter 0.3s';
        playerFig.style.filter = 'brightness(2) hue-rotate(90deg) saturate(1.5)';
        setTimeout(() => { playerFig.style.filter = 'brightness(1)'; setTimeout(() => { playerFig.style.transition = ''; }, 200); }, 400);
      }
      // Floating zelený text
      displayHealText(`+${hp}`);
      // Zelené částice
      spawnHealParticles();
    } else if (spellId === 'freeze') {
      // freeze: 3 ticky, freeze2: 4 ticky, blizzard: 5 ticků — vždy 75% zpomalení
      let ticks;
      if (lv >= 5) { // blizzard
        ticks = 5;
      } else if (lv >= 3) { // freeze2
        ticks = 4;
      } else { // freeze
        ticks = 3;
      }
      const pct = 75;
      // Použije chill ticks — stejný mechanismus jako pasivní chill
      // Pokud už chill běží, přepíše se novými hodnotami (silnější kouzlo)
      mb.chillPercent = Math.max(mb.chillPercent || 0, pct);
      mb.chillTicksLeft = Math.max(mb.chillTicksLeft || 0, ticks);
      effectMsg = `❄️ Mráz! Zpomalení 75% na ${ticks} ticků!`;
      // Modrý efekt na bossovi + modré kolečko
      const bossFig = $('mbFigure');
      if (bossFig) {
        bossFig.style.transition = 'filter 0.3s';
        bossFig.style.filter = 'brightness(1.8) hue-rotate(200deg) saturate(1.5)';
        setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 800);
      }
      const circle = document.querySelector('.timer-circle');
      if (circle) circle.style.stroke = '#4fc3f7';
      spawnFreezeParticles();
    }
    sfxSuccess();
    // (hint: zachovat bonus info)
    updateMapBattleUI();
    // Odstranit spell tlačítka
    const spellsEl = $('mbSpells');
    if (spellsEl) spellsEl.innerHTML = '';
    if (mb.bossHp <= 0) { endMapBattle(true); return; }
  }

  function endMapBattle(won) {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    const locId = mb.locId;

    // Monster killed - regular enemy
    if (won && !mb.isBoss) {
      const p = (state.locationProgress[locId] || 0) + 1;
      state.locationProgress[locId] = p;
      const monsterGold = 1 + rand(0, 2);
      const xpGain = mb.loc.xpReward + mb.floor * 2;
      state.hero.gold = (state.hero.gold || 0) + monsterGold;
      state.hero.xp = (state.hero.xp || 0) + xpGain;
      state.hero.hp = mb.playerHp;
      state.wins = (state.wins || 0) + 1;
      const leveled = applyLevelUp();
      saveGame();
      sfxSuccess();
      // Kill popup — čeká na kliknutí
      showKillPopup(mb.monsterFace, mb.currentMonsterName || 'Nestvůra', xpGain, monsterGold, mb.playerHp, mb.maxPlayerHp, () => {
        const fig2 = $('mbFigure');
        if (fig2) fig2.classList.remove('monster-dying');
        continueDungeon();
      }); // konec showKillPopup
      updateMapBattleUI();

      if (p >= 5) {
        // ALL 5 monsters killed -> floor clear: result screen!
        mapBattleState.ended = true;
        cleanupTimers();
        const nextFloor = mb.floor + 1;
        state.floorProgress[locId] = nextFloor;
        state.locationProgress[locId] = 0;
        saveGame();
        $('resultIcon').textContent = '🎉';
        $('resultTitle').textContent = 'Patro ' + (mb.floor+1) + ' dobyto!';
        const floorXp = mb.loc.xpReward * 5 + mb.floor * 10;
        const mistakes = (mb.floorMistakes || 0) + (mb.mistakes || 0);
        const hpPct = Math.round((mb.playerHp / mb.maxPlayerHp) * 100);
        const grade = mistakes === 0 ? '⭐⭐⭐' : mistakes <= 2 ? '⭐⭐' : '⭐';
        $('resultMsg').innerHTML = '<div class="result-stats">'
                  + '<div class="result-stat"><span class="result-stat-icon">⚔️</span><span class="result-stat-val">+' + floorXp + ' XP</span></div>'
                  + '<div class="result-stat"><span class="result-stat-icon">❤️</span><span class="result-stat-val">' + mb.playerHp + '/' + mb.maxPlayerHp + '</span><span class="result-stat-sub">(' + hpPct + '%)</span></div>'
                  + '<div class="result-stat"><span class="result-stat-icon">❌</span><span class="result-stat-val">' + mistakes + '</span><span class="result-stat-sub">chyb</span></div>'
                  + '<div class="result-grade">' + grade + '</div>'
                  + '<div class="result-tap">👆 klepni pro návrat</div>'
                  + '</div>';
        $('resultBtn').innerHTML = '';
        $('resultScreen').onclick = function() { $('resultScreen').onclick = null; showScreen('map'); };
        showScreen('result');
        switchBGM('win');
        return;
      }
      // Animace smrti
      const fig = $('mbFigure');
      if (fig) {
        fig.classList.remove('monster-appear');
        fig.classList.add('monster-dying');
      }
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
          state.locationProgress[locId] = 0;
          // floorProgress NEresetujeme — hráč zůstává na stejném patře
          state.hero.hp = state.hero.maxHp;
          saveGame();
          switchBGM('defeat');
          $('resultIcon').textContent = '💀';
          $('resultTitle').textContent = 'Padl jsi';
          $('resultMsg').textContent = `${mb.loc.name} — P${mb.floor+1}`;
          $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.enterLocation(${locId},${mb.floor})">🔄 Znovu</button><button class="btn btn-secondary" onclick="game.showScreen('map')">🌍 Mapa</button>`;
    } else {
      state.wins = (state.wins || 0) + 1;
      state.hero.hp = mb.playerHp;
      // Boss defeated
      state.bossesDefeated[locId] = true;
      state.hero.xp = (state.hero.xp || 0) + mb.loc.bossXp + mb.floor * 10;
      state.floorProgress[locId] = 0;
      state.locationProgress[locId] = 0;
      applyLevelUp();
      const r = mb.loc.reward;
      if (r.gold) state.hero.gold = (state.hero.gold || 0) + r.gold;
      if (r.weapon && state.hero.equip.weapon === 'fists') state.hero.equip.weapon = r.weapon;
      if (r.armor && state.hero.equip.armor === 'rags') state.hero.equip.armor = r.armor;
      sfxBossDefeat();
      $('resultIcon').textContent = '🏆';
      $('resultTitle').textContent = `${mb.loc.boss.name} poražen!`;
      let msg = `${r.gold||0}💰`;
      if (r.weapon) msg += ` + ${r.weapon}`;
      if (r.armor) msg += ` + ${r.armor}`;
      $('resultMsg').innerHTML = `Získal jsi ${msg}<br><span style="font-size:12px;color:#888">❌ ${(mb.floorMistakes||0)+(mb.mistakes||0)} chyb</span>`;
      $('resultBtn').innerHTML = `<button class="btn btn-primary" onclick="game.showScreen('map')">🌍 Mapa</button><button class="btn btn-secondary" onclick="game.showScreen('hero')">🎒 Inventář</button>`;
      if (locId + 1 < LOCATIONS.length) {
        $('resultBtn').innerHTML += `<button class="btn btn-secondary" onclick="game.enterLocation(${locId+1})">🚀 Další dungeon</button>`;
      }
      saveGame();
    }
    showScreen('result');
    if (won) switchBGM('win');
  }

  function continueDungeon() {
    const mb = mapBattleState;
    if (mb.ended) return;
    const oldMistakes = (mb.floorMistakes || 0) + (mb.mistakes || 0);
    const locId = mb.locId;
    startLocation(locId);
    mapBattleState.floorMistakes = oldMistakes;
  }

  // ===== TALENTS =====
  function renderTalents() {
        const pts = state.talentPoints || 0;
        $('talentsPts').textContent = 'Body: ' + pts;
        const resetBtn = $('resetTalentsBtn');
        if (resetBtn) {
          const cost = 50;
          const hasSpent = Object.values(state.schoolLevels).reduce((a,b)=>a+b, 0) > 0;
          resetBtn.textContent = hasSpent ? '🔄 Resetovat talenty (' + cost + '💰)' : '✅ Žádné body k resetu';
          resetBtn.disabled = !hasSpent;
        }
        $('talentSchools').innerHTML = SCHOOLS.map(s => {
                  const lv = state.schoolLevels[s.id] || 0;
                  const isActive = state.activeSchool === s.id;
                  const hasInvested = Object.values(state.schoolLevels).reduce((a,b)=>a+b, 0) > 0;
                  const isLocked = hasInvested && lv === 0;
                  const canInvest = pts > 0 && lv < 5 && !isLocked;
                  return `<div class="talent-school ${isActive?'active':''} ${s.id} ${isLocked?'locked':''}" onclick="${isLocked?'':`game.activateSchool('${s.id}')`}">
                    ${isLocked?'<div class="talent-lock-overlay">🔒</div>':''}
                    <div class="talent-school-header">
                      <span class="talent-school-icon">${s.icon}</span>
                      <span class="talent-school-name">${s.name}</span>
                      <span class="talent-school-level">Lv.${lv}/5</span>
                    </div>
                    <div class="talent-school-desc">${s.desc}</div>
                    <ul class="talent-school-benefits">
                      ${s.talents.map((t, i) => {
                        const owned = i < lv;
                        const isNext = i === lv;
                        const cls = owned ? 'lv-own' : (isNext ? 'lv-next' : 'lv-lock');
                        const displayLv = owned ? lv : (isNext ? lv + 1 : Math.max(lv, 1));
                        return `<li class="${cls}">${owned?'✅ ':isNext?'→ ':'🔒 '}${t.name}: ${t.desc(displayLv)}</li>`;
                      }).join('')}
                    </ul>
                    <button class="talent-invest-btn ${s.id}" onclick="event.stopPropagation();game.investTalent('${s.id}')" ${canInvest?'':'disabled'}>${isLocked?'🔒 Z VOLNO':canInvest?'+ Investovat 1 bod':'MAX'}</button>
                  </div>`;
        }).join('');
      }
      function investTalent(schoolId) {
              const pts = state.talentPoints || 0;
              if (pts <= 0) return;
              const lv = state.schoolLevels[schoolId] || 0;
              if (lv >= 5) return;
              state.schoolLevels[schoolId] = lv + 1;
              state.talentPoints = pts - 1;
              if (!state.activeSchool) state.activeSchool = schoolId;
              saveGame();
              renderTalents();
            }
            function activateSchool(schoolId) {
              const lv = state.schoolLevels[schoolId] || 0;
              if (lv === 0) return;
              state.activeSchool = schoolId;
              saveGame();
              renderTalents();
              renderHero();
            }
            function resetTalents() {
        const cost = 50;
        if ((state.hero.gold || 0) < cost) { showMessage('💰 Nedostatek zlatých!'); return; }
        let total = 0;
        Object.keys(state.schoolLevels).forEach(k => { total += state.schoolLevels[k]; state.schoolLevels[k] = 0; });
        if (total === 0) return;
        state.hero.gold -= cost;
        state.talentPoints = (state.talentPoints || 0) + total;
        state.activeSchool = null;
        saveGame();
        renderTalents();
        renderHero();
        showMessage('🔄 Talenty resetovány! Získal jsi zpět ' + total + ' bodů.');
      }

  // ===== HERO =====
  function applyLevelUp() {
    const h = state.hero;
    const prevLevel = h.level;
    let leveled = false;
    while (true) {
      const xpNeeded = h.level * 80;
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
    return leveled;
  }
  function getHeroDmg() {
    const h = state.hero;
    const weapon = ITEM_MAP[h.equip.weapon] || ITEM_MAP['fists'];
    return Math.max(1, 10 + Math.floor(h.level * 3) + weapon.baseDmg + (h.attrStr || 0) * 2);
  }
  function getHeroMaxHp() {
    const h = state.hero;
    const armor = ITEM_MAP[h.equip.armor] || ITEM_MAP['rags'];
    return Math.max(1, 100 + Math.floor(h.level * 10) + armor.bonusHp + (h.attrVit || 0) * 10);
  }
  const ATTR_COST = [5, 10, 20, 35, 55, 80, 110, 150, 200, 260, 330, 410, 500];
  function renderHero() {
    const h = state.hero;
    const active = state.activeSchool ? SCHOOL_MAP[state.activeSchool] : null;
    const schoolLv = active ? (state.schoolLevels[state.activeSchool]||0) : 0;
    $('heroName').textContent = 'Dobrodruh';
    $('heroLevel').textContent = `Lv.${h.level}`;
    $('heroDeaths').textContent = state.deaths;
    $('heroWins').textContent = state.wins;
    $('heroHp').textContent = h.hp || h.maxHp;
    $('heroMaxHp').textContent = h.maxHp;
    $('heroDmg').textContent = getHeroDmg();
    $('heroGold').textContent = h.gold;
    const critChance = (h.attrDex||0) * 1 + 5;
    $('heroCrit').textContent = h.attrDex > 0 ? `${critChance}% okno (×2.0)` : `${critChance}% okno (×2.0)`;
    // Aktivni skola
    const schoolInfo = $('activeSchoolInfo');
    if (schoolInfo) {
      schoolInfo.textContent = active ? `${active.icon} ${active.name} — Lv.${schoolLv}/5` : 'Žádná — přidej talentové body v 🎓 Talent Tree';
    }
    // XP bar
    const xpNeeded = h.level * 80;
    const xpPct = Math.min((h.xp / xpNeeded) * 100, 100);
    $('heroXpLabel').textContent = `${h.xp}/${xpNeeded}`;
    $('heroXpBar').style.width = xpPct + '%';

    // Atributy
    const strCost = ATTR_COST[Math.min(h.attrStr||0, ATTR_COST.length-1)] || 999;
    const vitCost = ATTR_COST[Math.min(h.attrVit||0, ATTR_COST.length-1)] || 999;
    const dexCost = ATTR_COST[Math.min(h.attrDex||0, ATTR_COST.length-1)] || 999;
    const pts = h.attrPoints || 0;
    $('heroAttrStr').textContent = (h.attrStr||0) + (h.equip.weapon !== 'fists' ? ` (s ${ITEM_MAP[h.equip.weapon]?.icon||''})` : '');
    $('heroAttrVit').textContent = (h.attrVit||0) + (h.equip.armor !== 'rags' ? ` (s ${ITEM_MAP[h.equip.armor]?.icon||''})` : '');
    $('heroAttrDex').textContent = (h.attrDex||0);
    $('heroAttrPts').textContent = pts;
    const strBtn = $('heroUpStr');
    const vitBtn = $('heroUpVit');
    const dexBtn = $('heroUpDex');
    if (strBtn) strBtn.textContent = `⬆️ Síla` + (pts > 0 ? '' : ` 🔒`);
    if (strBtn) strBtn.style.opacity = pts > 0 ? '1' : '0.3';
    if (vitBtn) vitBtn.textContent = `⬆️ Vitalita` + (pts > 0 ? '' : ` 🔒`);
    if (vitBtn) vitBtn.style.opacity = pts > 0 ? '1' : '0.3';
    if (dexBtn) dexBtn.textContent = `⬆️ Obratnost` + (pts > 0 ? '' : ` 🔒`);
    if (dexBtn) dexBtn.style.opacity = pts > 0 ? '1' : '0.3';

    const weaponNames = { fists:'✊ Pěsti', dagger:'🗡️ Dýka', sword:'⚔️ Meč', flameSword:'🔥 Ohnivý meč' };
    const armorNames = { rags:'🧥 Hadry', leather:'🦺 Kožené', chainmail:'⛓️ Kroužková', plate:'🛡️ Plátová' };
    $('equipWeapon').textContent = weaponNames[h.equip.weapon] || '✊ Pěsti';
    $('equipArmor').textContent = armorNames[h.equip.armor] || '🧥 Hadry';
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
      showMessage('🎯 Obratnost +1! Kritická šance zvýšena!');
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
  function renderShop() {
    const h = state.hero;
    $('shopGold').textContent = `💰 ${h.gold} zlatých`;
    $('shopList').innerHTML = ITEMS.filter(i => i.cost > 0).map(item => {
      const owned = h.inventory.includes(item.id) || h.equip.weapon === item.id || h.equip.armor === item.id;
      const canBuy = h.gold >= item.cost && !owned;
      const stats = item.type === 'weapon' ? `⚔️+${item.baseDmg} dmg` : `❤️+${item.bonusHp} HP`;
      return `<div class="shop-item" style="opacity:${owned?'0.4':'1'}">
        <div class="shop-item-header">
          <div class="shop-item-name"><span class="item-icon">${item.icon}</span>${item.name}</div>
          <div class="shop-item-stats"><span class="stat-line">${stats}</span></div>
        </div>
        <div class="shop-item-actions">
          <span class="price">💰 ${item.cost}</span>
          ${owned ? '<span style="color:#2ecc71">✅ Vlastníš</span>' : canBuy ? `<button class="btn btn-primary" style="width:auto;padding:8px 18px;font-size:13px" onclick="game.buyItem('${item.id}')">Koupit</button>` : `<button class="btn btn-primary" style="width:auto;padding:8px 18px;font-size:13px;opacity:0.3;pointer-events:none" onclick="game.buyItem('${item.id}')">Koupit</button>`}
        </div>
      </div>`;
    }).join('');
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
    renderInventory();
  }

  // ===== INVENTORY =====
  function renderInventory() {
    const h = state.hero;
    $('invGold').textContent = `💰 ${h.gold} zlatých`;
    const container = $('invList');
    if (h.inventory.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:#8888aa;padding:20px">📦 Inventář je prázdný</div>';
    } else {
      container.innerHTML = h.inventory.map((itemId, idx) => {
        const item = ITEM_MAP[itemId];
        if (!item) return '';
        const isEquipped = h.equip.weapon === itemId || h.equip.armor === itemId;
        const canEquip = !isEquipped;
        const stats = item.type === 'weapon' ? `⚔️+${item.baseDmg} dmg` : `❤️+${item.bonusHp} HP`;
        return `<div class="inv-item" style="opacity:${isEquipped?'0.7':'1'}">
          <div class="inv-item-header">
            <div class="inv-item-name"><span class="item-icon">${item.icon}</span>${item.name}${isEquipped?' ⭐':''}</div>
            <div class="inv-item-stats"><span class="stat-line">${stats}</span>${isEquipped?'<span class="stat-line" style="color:#2ecc71">✅ Oblečeno</span>':''}</div>
          </div>
          <div class="inv-item-actions">
            ${canEquip ? `<button class="btn btn-primary" style="width:auto;padding:8px 18px;font-size:13px" onclick="game.equipItem(${idx})">🎽 Obléci</button>` : `<button class="btn btn-primary" style="width:auto;padding:8px 18px;font-size:13px" onclick="game.unequipItem('${itemId}')">📦 Sundat</button>`}
            <button class="btn btn-secondary" style="width:auto;padding:8px 18px;font-size:13px" onclick="game.sellItem('${itemId}')">💰 Prodat (${Math.round(item.cost*0.5)})</button>
          </div>
        </div>`;
      }).join('');
    }
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
      if (h.equip.weapon !== 'fists') h.inventory.push(h.equip.weapon);
      h.equip.weapon = itemId;
    } else {
      if (h.equip.armor !== 'rags') h.inventory.push(h.equip.armor);
      h.equip.armor = itemId;
    }
    h.baseDmg = getHeroDmg();
    h.maxHp = getHeroMaxHp();
    h.hp = h.maxHp;
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
    if (item.type === 'weapon') {
      if (h.equip.weapon !== itemId) return;
      h.equip.weapon = 'fists';
    } else {
      if (h.equip.armor !== itemId) return;
      h.equip.armor = 'rags';
    }
    h.inventory.push(itemId);
    h.baseDmg = getHeroDmg();
    h.maxHp = getHeroMaxHp();
    h.hp = h.maxHp;
    saveGame();
    showMessage(`📦 Sundal jsi ${item.icon} ${item.name} do inventáře!`);
    renderInventory();
  }

  // ===== TRAINING (minigames) =====
  function enterTraining(skillId) {
    const sk = SKILL_MAP[skillId];
    if (!sk) return;
    const lv = state.skills[skillId] || 0;
    const requiredLv = (lv + 1) * 2;
    if (state.hero.level < requiredLv) { /* DEBUG: odemčeno */ }
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

    if (!state.bossesDefeated || state.bossesDefeated.length < LOCATIONS.length) state.bossesDefeated = Array(LOCATIONS.length).fill(false);
    if (!state.locationProgress || state.locationProgress.length < LOCATIONS.length) state.locationProgress = Array(LOCATIONS.length).fill(0);
    if (!state.floorProgress || state.floorProgress.length < LOCATIONS.length) state.floorProgress = Array(LOCATIONS.length).fill(0);
    if (!state.hero) state.hero = { level:1, xp:0, gold:0, hp:100, maxHp:100, baseDmg:12, inventory:[], equip:{weapon:'fists',armor:'rags'}, attrStr:0, attrVit:0, attrPoints:0 };
    if (state.hero.maxHp === undefined) state.hero.maxHp = getHeroMaxHp();
    if (state.hero.hp === undefined) state.hero.hp = state.hero.maxHp;
    if (state.hero.attrStr === undefined) state.hero.attrStr = 0;
    if (state.hero.attrVit === undefined) state.hero.attrVit = 0;
    if (state.hero.attrDex === undefined) state.hero.attrDex = 0;
    if (state.hero.attrPoints === undefined) state.hero.attrPoints = 0;

    document.querySelectorAll('.nav-bar a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // zabránit propagaci na document
        if (a.dataset.screen === 'map') showScreen('map');
        else if (a.dataset.screen === 'talents') showScreen('talents');
        else if (a.dataset.screen === 'hero') showScreen('hero');
        else if (a.dataset.screen === 'shop') showScreen('shop');
        else if (a.dataset.screen === 'inventory') showScreen('inventory');
        else if (a.dataset.screen === 'guide') showScreen('guide');
        // Inicializovat audio hned při prvním kliku (user gesture)
        firstUserInteraction();
      });
    });
    document.getElementById('musicToggle').addEventListener('click', (e) => {
      e.preventDefault();
      toggleMusic();
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
    showScreen, enterLocation, toggleDungeon,
    upgradeAttr, buyItem, sellItem, equipItem, unequipItem,
    onMapRapidTap,
    investTalent, activateSchool, resetTalents
  };
  init();
})();
