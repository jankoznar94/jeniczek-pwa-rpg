// @ts-nocheck — Fáze 2 přechod: tento soubor je převedený monolit (12K řádků).
// TypeScript ho zatím neanalyzuje; rozsekaní na moduly probíhá postupně.
// Odebíráme @ts-nocheck až po kompletní extrakci do modulů.
import { rand, shuffle, clamp, hexToRgb } from './core/utils';
import { getWeaponElementColor, getWeaponTotalDmgMin, getWeaponTotalDmgMax, getWeaponDmg } from './core/weapon';
import { removeFromInventory, getStackCount, getQualityColor, pickWeighted, rollStat, rollSockets, getItemSocketName } from './core/loot';
import { getZoneMult, getMonsterLevel, getEnemySwingTime, getFloorTimerMultiplier, getDungeonAttackChances, getAttackHint, getRarity, generateAttack, getXpMultiplier } from './core/progression';
import { applyGemStats, buildGemStatsHtml } from './core/gems';
import { getMonsterFace, getMonsterName } from './core/monsters';
import { getDungeonResistIcons } from './core/dungeons';
import { MONSTER_TYPES, ATTACK_TYPES, ENEMY_SPELLS, MONSTER_DB, DIFFICULTIES, ELITE_AFFIXES, BOSS_AFFIXES, ELITE_FILTER_COLORS, ELITE_PREFIXES, ELITE_SUFFIXES, ELITE_APPELATIONS } from './data/monsters';
import { ACTS } from './data/acts';
import { ITEMS, UNIQUE_ITEMS, RARE_FIRST_WORDS, RARE_SECOND_WORDS } from './data/items';
import { AFFIXES } from './data/affixes';
import { QUALITY_COLORS, SOCKET_CHANCE_NORMAL, GEMS, GEM_QUALITIES } from './data/gems';
import { CLASSES, CLASS_SKILLS } from './data/classes';
import { LOOT_NAMES, LOOT_ICONS, ATTR_KEYS, ATTR_NAMES, RARITY } from './data/loot';
import { ATTR_COST, HERO_FACES } from './data/hero';
import { DIRECTIONS, DUNGEON_THEME_FILTERS, DUNGEON_THEMES } from './data/dungeons';
import { SIMON_SYMBOLS, SIMON_COLORS, SIMON_FREQS } from './data/minigames';
import { SCREEN_IDS, FULL_SCREENS } from './core/screens';
import { initBattleScene, initMeleeLayer, setDungeonBackground, setBossAura, spawnImpactBurst, spawnDeathSmoke, spawnShockwave, spawnParticleSlash, spawnMeleeStrike, preloadDungeonAssets } from './render/battle/battleScene';

// Názvy zastávek — vizuální cesta. Act 0 = Enchanted Forest, Act 1-4 ostatní říše.
const STOP_NAMES = {
  0: ['Louka', 'Les', 'Zřícenina', 'Bažina', 'Lesní pahorky', 'Údolí', 'Vesnice lidojedů', 'Tajemná studna', 'Cesta k pevnosti', 'Pevnost lesního pána'],
  1: ['Písečné duny', 'Písečné skály', 'Oáza', 'Tajemná hrobka', 'Tábor nomádů', 'Pouštní průsmyk', 'Červí díra', 'Vyprahlá pustina', 'Magické kameny', 'Faraonova hrobka'],
  2: ['Sněžná pole', 'Sněhové pláně', 'Zámrzlé jezero', 'Ledová jeskyně', 'Ledovec', 'Sněžná vesnice', 'Lavinový průsmyk', 'Mrazivá svatyně', 'Mrazivý vrchol', 'Citadela ledového obra'],
  3: ['Hřbitov', 'Prokleté bažiny', 'Hrobka', 'Shnilá hrobka', 'Uličky kostí', 'Prokleté ruiny', 'Morová věž', 'Nekropole', 'Studna duší', 'Lichova svatyně'],
  4: ['Spálené pláně', 'Lávová pole', 'Lávová jáma', 'Lávový hřeben', 'Démonova rokla', 'Hořící hrad', 'Trhlina pekla', 'Inferno svatyně', 'Pekelná brána', 'Doupě lávového draka'],
};
const STOP_NAMES_EN = {
  0: ['Meadow', 'Forest', 'Ruins', 'Swamp', 'Wooded Hills', 'Valley', 'Cannibal Village', 'Mystic Well', 'Road to the Fortress', "Forest Lord's Fortress"],
  1: ['Sand Dunes', 'Sandstone Rocks', 'Oasis', 'Mysterious Tomb', 'Nomad Camp', 'Desert Pass', 'Worm Hole', 'Parched Wasteland', 'Magic Stones', 'Pharaoh Tomb'],
  2: ['Snowfield', 'Snowy Field', 'Frozen Lake', 'Ice Cave', 'Glacier', 'Snowy Village', 'Avalanche Pass', 'Frost Shrine', 'Frozen Peak', "Frost Giant's Citadel"],
  3: ['Graveyard', 'Cursed Bog', 'Tomb', 'Rotting Crypt', 'Bone Valley', 'Cursed Ruins', 'Plague Tower', 'Necropolis', 'Soul Well', "Lich's Sanctum"],
  4: ['Ashen Plains', 'Lava Fields', 'Cinder Pits', 'Lava Ridge', 'Demon Gully', 'Burning Keep', 'Skin Rift', 'Inferno Shrine', 'Abyssal Gate', "Lava Dragon's Lair"],
};

// Pomocná funkce: název zastávky (česky nebo anglicky)
function getStopName(actId, zoneId, en) {
  const list = (en ? STOP_NAMES_EN : STOP_NAMES)[actId];
  const idx = Math.min(Math.max(zoneId || 0, 0), 9);
  return (list && list[idx]) || `Zastávka ${idx+1}`;
}

// Pomocná funkce: jakou zastávku právě hráč prochází v aktu (0 = začátek, 9 = boss zóna)
function getStopImage(actId, zoneId) {
  const idx = Math.min(Math.max(zoneId || 0, 0), 9);
  // Act 0 má vygenerované zastávky; Act 1-4 zatím placeholder (obrázky se generují později)
  if (actId === 0) return `assets/stops/stop_act0_${idx}.webp`;
  if (actId === 1) return `assets/stops/stop_act1_${idx}.webp`;
  return `assets/stops/placeholder_act${actId}.png`;
}

export function initGame() {
  'use strict';
  const $ = id => document.getElementById(id);

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
  const sfxLevelUp=()=>{
    // Na chvíli ztlumit aktivní BGM, aby level up fanfára vynikla — hudba pak plynule pokračuje.
    duckBgm(0.3, 750);
    playTone(392,0.1,'sine',0.12);setTimeout(()=>playTone(523,0.1,'sine',0.12),100);setTimeout(()=>playTone(659,0.12,'sine',0.14),200);setTimeout(()=>playTone(784,0.15,'sine',0.16),300);
  };
  // Ztlumí právě hrající BGM na danou hlasitost a po 'duration' ms ji vrátí na původní.
  // Hudba NErestartuje — jen se dočasně ztlumí a plynule pokračuje.
  let _bgmDuckTimer = null;
  function duckBgm(level, duration) {
    // Najít aktivní stopu podle currentBGM
    let track = null;
    if (currentBGM === 'battle') track = battleBgmTracks[_currentBattleBgmIdx];
    else if (currentBGM === 'boss') track = bossBgm;
    else if (currentBGM === 'overworld') track = overworldAudio;
    else if (currentBGM === 'defeat') track = defeatAudio;
    else if (currentBGM === 'win') track = winAudio;
    else if (currentBGM === 'minigame') track = minigameBgm;
    if (!track) return;
    const orig = track.volume;
    track.volume = level;
    if (_bgmDuckTimer) clearTimeout(_bgmDuckTimer);
    _bgmDuckTimer = setTimeout(() => {
      // Vrátit jen pokud se mezitím hlasitost nemění (hud neuživatelem neztlumena)
      if (track.volume === level) track.volume = orig;
      _bgmDuckTimer = null;
    }, duration);
  }
  // MP3 SFX
  const dodgeSfx = (() => { const a = new Audio('dodge.mp3'); a.volume = 0.70; return a; })();
  const blockSfx = (() => { const a = new Audio('block.mp3'); a.volume = 0.70; return a; })();
  const hitSfx = (() => { const a = new Audio('hit.mp3'); a.volume = 0.70; return a; })();
  const critSfx = (() => { const a = new Audio('crit.mp3'); a.volume = 0.70; return a; })();
  const meleeHitSfx = (() => { const a = new Audio('melee_hit.mp3'); a.volume = 0.70; return a; })();
  const meleeHitSfx2 = (() => { const a = new Audio('assets/sfx/melee_hit2.mp3'); a.volume = 0.70; return a; })();
  const enemyHitSfx = (() => { const a = new Audio('assets/sfx/enemy_hit.mp3'); a.volume = 0.70; return a; })();
  const enemyHitSfxPool = [
    enemyHitSfx,
    (() => { const a = new Audio('assets/sfx/enemy_hit1.mp3'); a.volume = 0.70; return a; })(),
    (() => { const a = new Audio('assets/sfx/enemy_hit2.mp3'); a.volume = 0.70; return a; })(),
    (() => { const a = new Audio('assets/sfx/enemy_hit3.mp3'); a.volume = 0.70; return a; })(),
    (() => { const a = new Audio('assets/sfx/enemy_hit4.mp3'); a.volume = 0.70; return a; })(),
    (() => { const a = new Audio('assets/sfx/enemy_hit5.mp3'); a.volume = 0.70; return a; })(),
    (() => { const a = new Audio('assets/sfx/enemy_hit6.mp3'); a.volume = 0.70; return a; })(),
  ];
  function getEnemyHitSfx() { return enemyHitSfxPool[Math.floor(Math.random() * enemyHitSfxPool.length)]; }
  const meleeHitSfxPool = [meleeHitSfx, meleeHitSfx2];
  const meleeCritSfx = (() => { const a = new Audio('melee_crit.mp3'); a.volume = 0.70; return a; })();
  const fistHitSfx = (() => { const a = new Audio('fist_hit.mp3'); a.volume = 0.70; return a; })();
  const fistCritSfx = (() => { const a = new Audio('fist_crit.mp3'); a.volume = 0.70; return a; })();
  const fireSpellSfx = (() => { const a = new Audio('fire_spell.mp3'); a.volume = 0.70; return a; })();
  const iceSpellSfx = (() => { const a = new Audio('ice_spell.mp3'); a.volume = 0.70; return a; })();
  const lightningSpellSfx = (() => { const a = new Audio('lightning_spell.mp3'); a.volume = 0.70; return a; })();
  const lightningSpellSfx2 = (() => { const a = new Audio('assets/sfx/lightning_spell2.mp3'); a.volume = 0.70; return a; })();
  // Zvuky zranění hráče — 3 náhodné
  const hurtSfx = [
    (() => { const a = new Audio('assets/sfx/hurt1.mp3'); a.volume = 0.70; return a; })(),
    (() => { const a = new Audio('assets/sfx/hurt2.mp3'); a.volume = 0.70; return a; })(),
    (() => { const a = new Audio('assets/sfx/hurt3.mp3'); a.volume = 0.70; return a; })(),
  ];
  function getHurtSfx() { return hurtSfx[Math.floor(Math.random() * hurtSfx.length)]; }
  function getHitSfx(wtOverride) {
    const wt = wtOverride || getWeaponType();
    if (wt === 'fists') return fistHitSfx;
    if (wt === 'blunt') return bluntHitSfx;
    if (wt === 'staff') return hitSfx;
    return meleeHitSfxPool[Math.floor(Math.random() * meleeHitSfxPool.length)];
  }
  function getCritSfx(wtOverride) {
    const wt = wtOverride || getWeaponType();
    if (wt === 'fists') return fistCritSfx;
    if (wt === 'blunt') return bluntCritSfx;
    return wt === 'staff' ? critSfx : meleeCritSfx;
  }
  function playSFX(audio) { audio.currentTime = 0; audio.play().catch(() => {}); }

  // ===== FLOATING BATTLE TEXT (WoW-style scrolling arc) =====
  // side: 'left' (enemy dmg → player, arcs on left half) or 'right' (player dmg → enemy, arcs on right half)
  function spawnFloatingText(text, side, color, size, duration, iconPath) {
    const arena = document.getElementById('mbArena');
    if (!arena) return;
    const ar = arena.getBoundingClientRect();
    const cx = ar.width / 2;
    const cy = ar.height / 2;
    const radius = Math.min(cx, cy) * 0.7;
    // Levá strana (enemy dmg → hráč): start 7h (210°) → konec 10h (150°) — proti směru, stoupá vzhůru
    // Pravá strana (player dmg → nepřítel): start 5h (-30°=330°) → konec 2h (30°) — po směru, klesá dolů
    const startAngle = side === 'left' ? 7 * Math.PI / 6 : -Math.PI / 6;
    const endAngle = side === 'left' ? 5 * Math.PI / 6 : Math.PI / 6;
    const dur = duration || 2000;
    const startTime = performance.now();

    const el = document.createElement('div');
    if (iconPath) {
      el.innerHTML = `<img src="${iconPath}" style="width:24px;height:24px;vertical-align:middle;margin-right:4px"> ${text}`;
    } else {
      el.textContent = text;
    }
    el.style.cssText = `position:absolute;pointer-events:none;z-index:50;font-weight:bold;font-size:${size || 32}px;color:${color || '#fff'};text-shadow:0 0 15px ${color || 'rgba(255,255,255,0.5)'};white-space:nowrap;font-family:Arial,sans-serif;`;
    arena.appendChild(el);
    // Nastavit počáteční pozici hned po appendu, aby text neblikal v (0,0)
    const startX = cx + Math.cos(startAngle) * radius;
    const startY = cy + Math.sin(startAngle) * radius;
    el.style.left = (startX - el.offsetWidth / 2) + 'px';
    el.style.top = (startY - el.offsetHeight / 2) + 'px';

    function animate(now) {
      const t = Math.min((now - startTime) / dur, 1);
      // ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3);
      const angle = startAngle + (endAngle - startAngle) * ease;
      const x = cx + Math.cos(angle) * radius - el.offsetWidth / 2;
      const y = cy + Math.sin(angle) * radius - el.offsetHeight / 2;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.opacity = 1 - t;
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        el.remove();
      }
    }
    requestAnimationFrame(animate);
  }


  const healSfx = (() => { const a = new Audio('heal.mp3'); a.volume = 0.70; return a; })();
  const treasureSfx = (() => { const a = new Audio('treasure.mp3'); a.volume = 0.70; return a; })();
  const strongStrikeSfx = (() => { const a = new Audio('strong_strike.mp3'); a.volume = 0.70; return a; })();
  const thunderClapSfx = (() => { const a = new Audio('assets/sfx/thunder_clap.mp3'); a.volume = 0.70; return a; })();
  const thunderBoltSfx = (() => { const a = new Audio('assets/sfx/thunder_bolt.mp3'); a.volume = 0.70; return a; })();
  const bluntHitSfx = (() => { const a = new Audio('assets/sfx/blunt_hit.mp3'); a.volume = 0.70; return a; })();
  const bluntCritSfx = (() => { const a = new Audio('assets/sfx/blunt_crit.mp3'); a.volume = 0.70; return a; })();
  const shoutSfx = (() => { const a = new Audio('assets/sfx/shout.mp3'); a.volume = 0.70; return a; })();
  const shopSfx = (() => { const a = new Audio('assets/sfx/shop.mp3'); a.volume = 0.70; return a; })();
  const equipSfx = (() => { const a = new Audio('assets/sfx/equip.mp3'); a.volume = 0.70; return a; })();
  const potionSfx = (() => { const a = new Audio('assets/sfx/potion.mp3'); a.volume = 0.70; return a; })();
  const levelupSfx = (() => { const a = new Audio('assets/sfx/levelup.mp3'); a.volume = 0.70; return a; })();
  const clickSfx = (() => { const a = new Audio('assets/sfx/click.mp3'); a.volume = 0.70; return a; })();

  // ===== BACKGROUND MUSIC (MP3) =====
  const bgmAudio = new Audio('bgm.mp3');
  bgmAudio.loop = true;
  bgmAudio.volume = 0.85;
  const overworldAudio = new Audio('overworld.mp3');
  overworldAudio.loop = true;
  overworldAudio.volume = 1.0;
  const defeatAudio = new Audio('defeat.mp3');
  defeatAudio.loop = true;
  defeatAudio.volume = 0.85;
  const winAudio = new Audio('win.mp3');
  winAudio.loop = false;
  winAudio.volume = 0.90;

  const minigameBgm = new Audio('minigame-bgm.mp3');
  minigameBgm.loop = true;
  minigameBgm.volume = 0.80;

  const bossBgm = new Audio('boss_bgm.mp3');
  bossBgm.loop = true;
  bossBgm.volume = 0.70;

  // Battle BGM kolekce — 3 stopy, náhodně se střídají po patrech
  const battleBgmTracks = [
    new Audio('bgm_1.mp3'),
    new Audio('bgm_2.mp3'),
    new Audio('bgm_3.mp3')
  ];
  battleBgmTracks.forEach(t => { t.loop = false; t.volume = 0.90; });
  // Bojové stopy se NEopakují samy — když jedna dohraje, naváže náhodně další.
  // Hudba se tak nepřerušuje a neustále se nestřídá při každé obrazovce.
  battleBgmTracks.forEach(t => {
    t.addEventListener('ended', () => {
      if (currentBGM !== 'battle') return;
      const idx = Math.floor(Math.random() * battleBgmTracks.length);
      _currentBattleBgmIdx = idx;
      battleBgmTracks[idx].play().catch(() => {});
    });
  });
  let currentBattleIndex = 0; // vybraná stopa pro aktuální patro

  let currentBGM = null; // 'battle' | 'overworld' | 'defeat' | 'win' | 'minigame' | 'boss' | null
  let _bgmPending = null;
  let musicMuted = false;
  function toggleMusic() {
    musicMuted = !musicMuted;
    bgmAudio.volume = musicMuted ? 0 : 0.85;
    overworldAudio.volume = musicMuted ? 0 : 1.0;
    defeatAudio.volume = musicMuted ? 0 : 0.85;
    winAudio.volume = musicMuted ? 0 : 0.90;
    bossBgm.volume = musicMuted ? 0 : 0.70;
    battleBgmTracks.forEach(t => { t.volume = musicMuted ? 0 : 0.90; });
    document.getElementById('musicToggle').className = musicMuted ? '' : 'music-active';
  }
  let testMode = false;
  function toggleTestMode() {
    testMode = !testMode;
    const btn = document.getElementById('testToggle');
    if (testMode) {
      state.hero.gold = 100000;
      state.talentPoints = 50;
      state.hero.attrPoints = 150;
      // Testovací mód: nastavit level postavy na 50 a přepočítat odvozené staty.
      state.hero.level = 50;
      state.hero.xp = 0;
      state.hero.maxHp = getHeroMaxHp();
      state.hero.maxMana = getHeroMaxMana();
      state.hero.baseDmg = Math.round((getHeroDmg().min + getHeroDmg().max) / 2);
      state.hero.hp = state.hero.maxHp;
      state.hero.mana = state.hero.maxMana;
      // Odemknout VŠECHNY akty ve všech obtížnostech (celá hra přístupná).
      state.bossesDefeated = ACTS.map(() => ACTS.map(() => true));
      state.floorProgress = ACTS.map(() => 5);
      // locationProgress=999 → všechny area a fighty jsou odemčené a přístupné.
      state.locationProgress = ACTS.map(() => 999);
      state._maxLocationProgress = ACTS.map(() => 999);
      state.areaFightProgress = ACTS.map(() => 0);
      // Odemknout celý bestiář
      state.encounteredMonsters = [];
      MONSTER_DB.forEach(themeMonsters => {
        themeMonsters.forEach(m => {
          if (!state.encounteredMonsters.includes(m.face)) state.encounteredMonsters.push(m.face);
        });
      });
      ACTS.forEach(loc => {
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
    // Ukončit boj jako prohru — chová se jako smrt
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
    // Žádné XP ani gold — forfeit je prohra bez odměny
    // Reset jen aktuální oblasti (areaFightProgress), locationProgress zůstává
    state.areaFightProgress[locId] = 0;
    state._floorLootDrops = [];
    state.hero.hp = state.hero.maxHp;
    saveGame();
    // Divočina má jednu hudbu skrze vše — victory/lose hudbu nemění.
    $('resultIcon').innerHTML = '<img class="result-icon-img large" src="assets/result_defeat.png" alt="Vzdal ses">';
    $('resultTitle').textContent = 'Forfeit';
    $('resultMsg').innerHTML = '<div style="text-align:center;color:#888;font-size:13px">Returning to town...</div>';
    $('resultLootList').innerHTML = '';
    // Defeat — potion sloty nedávají smysl, jde se zpět do města. Vyčistit status z předchozí Victory.
    $('resultStatus').innerHTML = '';
    $('resultScreen').classList.add('centered');
    const resultBtn = $('resultBtn');
    if (resultBtn) resultBtn.innerHTML = '';
    $('resultScreen').onclick = function() { $('resultScreen').onclick = null; showScreen('town'); renderTown(); };
    showScreen('result');
  }
  let _forceNewBattleBgm = false;
  function switchBGM(mode) {
    // Hudba se nepřerušuje — pokud už hraje stejný mód, necháme ji dohrát.
    if (mode === currentBGM) {
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
      if (spellId === 'doubleSwing') return getSkillLv('barbarian_doubleSwing');
      if (spellId === 'defensiveShout') return getSkillLv('barbarian_defensiveShout');
      if (spellId === 'skillShout') return getSkillLv('barbarian_skillShout');
      if (spellId === 'thunderBolt') return getSkillLv('barbarian_thunderBolt');
      if (spellId === 'shieldSlam') return getSkillLv('barbarian_shieldSlam');
      if (spellId === 'pummel') return getSkillLv('barbarian_pummel');
      if (spellId === 'spellReflect') return getSkillLv('barbarian_spellReflect');
      if (spellId === 'comboAttack') return getSkillLv('barbarian_comboAttack');
    }
    if (cls === 'assassin') {
      if (spellId === 'shadowStrike') return getSkillLv('assassin_shadowStrike');
      if (spellId === 'poisonBlade') return getSkillLv('assassin_poisonBlade');
      if (spellId === 'evasion') return getSkillLv('assassin_evasion');
      if (spellId === 'bladeFury') return getSkillLv('assassin_bladeFury');
      if (spellId === 'smokeScreen') return getSkillLv('assassin_smokeScreen');
      if (spellId === 'deathMark') return getSkillLv('assassin_deathMark');
      if (spellId === 'shadowDance') return getSkillLv('assassin_shadowDance');
      if (spellId === 'poisonedWeapon') return getSkillLv('assassin_poisonedWeapon');
      if (spellId === 'poisonExplosion') return getSkillLv('assassin_poisonExplosion');
    }
    if (cls === 'mage') {
      if (spellId === 'firebolt') return getSkillLv('mage_firebolt');
      if (spellId === 'icebolt') return getSkillLv('mage_icebolt');
      if (spellId === 'fireball') return getSkillLv('mage_fireball');
      if (spellId === 'frostbolt') return getSkillLv('mage_frostbolt');
      if (spellId === 'blizzard') return getSkillLv('mage_blizzard');
      if (spellId === 'fireblast') return getSkillLv('mage_fireblast');
      if (spellId === 'lightningBolt') return getSkillLv('mage_lightningBolt');
      if (spellId === 'chainLightning') return getSkillLv('mage_chainLightning');
      if (spellId === 'thunderStorm') return getSkillLv('mage_thunderStorm');
    }
    return 0;
  }
  // Skutečná cena kouzla v maně. Double Swing: cost klesá s levelem talentu
  // (lvl1=2, lvl2=1.5, lvl3=1.0, lvl4=0.5, lvl5=0). Ostatní kouzla: base cost.
  function getSpellCost(spellId, baseCost) {
    if (spellId === 'doubleSwing') {
      const lv = getSpellLv('doubleSwing');
      const costs = [2, 1.5, 1.0, 0.5, 0];
      return costs[Math.min(Math.max(lv, 1), 5) - 1];
    }
    return baseCost;
  }
  function getWeaponType() {
    const w = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
    return w.weaponType || 'fists';
  }
  // ===== PASSIVE WEAPON SPECIALIZATIONS (barbarian) =====
  // One-Hand / Two-Hand Specialization — +10%/lv dmg, +10%/lv hit rating, +1%/lv crit.
  // Off-hand penalty 0.5 → 1.0 (100%) roste s One-Hand Spec (lvl5 = bez penalizace).
  function getWeaponSpecBonus(weapon, isOffhand = false) {
    if (!weapon || state.heroClass !== 'barbarian') {
      return { dmgMult: 1, arMult: 1, critBonus: 0, offHandMult: 0.5 };
    }
    const is2H = weapon.twoHand === true;
    const lv = is2H ? getTalentLv('barbarian_twoHandSpec') : getTalentLv('barbarian_oneHandSpec');
    const oneHandLv = getTalentLv('barbarian_oneHandSpec');
    if (lv <= 0) {
      // I bez bonusů platí off-hand penalizace (jen pokud je to off-hand útok)
      return { dmgMult: 1, arMult: 1, critBonus: 0, offHandMult: 0.5 + 0.1 * oneHandLv };
    }
    const dmgMult = 1 + 0.10 * lv;
    const arMult = 1 + 0.10 * lv;
    const critBonus = lv; // +1% crit / lvl
    return { dmgMult, arMult, critBonus, offHandMult: 0.5 + 0.1 * oneHandLv };
  }
  // ===== RESIST MULT =====
  function getLocAffix(key) {
    const mb = mapBattleState;
    if (!mb || mb.locId === undefined) return 0;
    const loc = ACTS[mb.locId];
    if (!loc || !loc.locAffixes) return 0;
    const diff = state.difficulty || 0;
    const affix = loc.locAffixes[diff];
    return affix ? (affix[key] || 0) : 0;
  }
  function getSchoolResistMult(schoolId) {
    const mb = mapBattleState;
    if (!mb) return 1.0;
    // Použít resisty konkrétního monstra (per-monster), ne lokace
    const r = mb.monsterResists;
    if (!r) return 1.0;
    let base = 1.0;
    if (schoolId === 'fire') base = r.fire || 1.0;
    else if (schoolId === 'ice') base = r.ice || 1.0;
    else if (schoolId === 'nature') base = r.nature || 1.0;
    else if (schoolId === 'lightning') base = r.lightning || 1.0;
    // Magic Resistant / Mana Burn — plošný element odpor elity
    const erb = mb.eliteResistBonus;
    if (erb && (schoolId === 'fire' || schoolId === 'ice' || schoolId === 'nature' || schoolId === 'lightning')) {
      const bonus = schoolId === 'fire' ? (erb.fire || 0) : schoolId === 'ice' ? (erb.ice || 0) : schoolId === 'nature' ? (erb.nature || 0) : (erb.lightning || 0);
      if (bonus > 0) base = 1 + bonus;
    }
    // Aplikovat lokální affixy (per-dungeon per-difficulty)
    const locFireResist = getLocAffix('fireResist');
    const locFrostResist = getLocAffix('frostResist');
    const locPoisonResist = getLocAffix('poisonResist');
    if (schoolId === 'fire' && locFireResist > 0) base = 1 + locFireResist;
    if (schoolId === 'ice' && locFrostResist > 0) base = 1 + locFrostResist;
    if (schoolId === 'nature' && locPoisonResist > 0) base = 1 + locPoisonResist;
    // ✨ Faerie Fire — sníží resisty o 50% (pro hráčova kouzla na nepříteli)
    if (mb._faerieFireActive) {
      if (base < 1.0) base = 1 - (1 - base) * 0.5; // slabé resisty ještě slabší
      else if (base > 1.0) base = 1 + (base - 1) * 0.5; // silné resisty slabší
    }
    // Aplikovat násobitel obtížnosti — na Normal se nic nemění,
    // na Nightmare/Hell se resisty zesilují (slabé míň slabé, silné víc silné)
    const diff = DIFFICULTIES[state.difficulty];
    const resistMult = diff ? diff.resistMult : 1.0;
    if (resistMult !== 1.0) {
      if (base < 1.0) base = 1 - (1 - base) / resistMult;
      else if (base > 1.0) base = 1 + (base - 1) * resistMult;
    }
    return base;
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

  // ===== ITEMS / AFFIXES / UNIQUE / GEMS — data extrahovaná do src/data/ =====
  const ITEM_MAP = {}; ITEMS.forEach(i => ITEM_MAP[i.id] = i);
  // Mapa pro generované loot itemy (doplňuje ITEM_MAP)
  let _lootItemMap = {};

  function initGemItems() {
    const gemTypes = ['ruby', 'sapphire', 'emerald', 'topaz'];
    gemTypes.forEach(type => {
      GEM_QUALITIES.forEach(q => {
        const gem = GEMS[type];
        const qData = gem.qualities[q];
        const id = type + (q === 'normal' ? '' : '_' + q);
        const filename = id + '.png';
        ITEM_MAP[id] = {
          id: id,
          name: qData.name,
          type: 'gem',
          gemType: type,
          gemQuality: q,
          icon: gem.icon,
          iconImg: 'assets/gems/' + filename,
          cost: q === 'chipped' ? 10 : q === 'flawed' ? 15 : q === 'normal' ? 20 : q === 'flawless' ? 50 : 100,
          tier: q === 'chipped' ? 1 : q === 'flawed' ? 2 : q === 'normal' ? 3 : q === 'flawless' ? 4 : 5,
          quality: 'magic'
        };
      });
    });
  }

  function getItemInfo(id) {
    return ITEM_MAP[id] || _lootItemMap[id] || null;
  }

  // Stackovatelné itemy (gemy, potiony)
  function isStackable(itemId) {
    const item = ITEM_MAP[itemId];
    return item && (item.type === 'gem' || item.type === 'consumable');
  }
  function addToInventory(inventory, itemId, count) {
    if (!isStackable(itemId)) { inventory.push(itemId); return; }
    for (let i = 0; i < inventory.length; i++) {
      const entry = inventory[i];
      if (typeof entry === 'object' && entry.id === itemId) {
        entry.count = (entry.count || 1) + (count || 1);
        return;
      }
    }
    inventory.push({ id: itemId, count: count || 1 });
  }

  // ===== LOOT GENERATION =====
  // Quality podle počtu affixů: normal(0), magic(1-2), rare(3-4), unique(5+)

  // ===== SOCKET SYSTEM =====
  // D2 style: jen normal (common) itemy můžou mít sockety jako base.
  // Magic/Rare/Unique dostávají sockety jen přes affixy (Mechanic's, Artisan's, Jeweler's).
  // Každý base item má vlastní maxSockets podle D2 dat.

  // Socket chance pro normal quality itemy

  // Gems: 4 types × 5 qualities (chipped, flawed, normal, flawless, perfect)

  // Gem quality levels (D2 style: chipped → flawed → normal → flawless → perfect)


  function getMagicFind() {
    let mf = 0;
    const h = state.hero;
    if (!h || !h.equip) return 0;
    // Projít všechny equip sloty
    const slots = ['weapon', 'armor', 'helmet', 'shield', 'ring1', 'ring2', 'amulet', 'belt', 'gloves', 'boots'];
    slots.forEach(slot => {
      const itemId = h.equip[slot];
      if (itemId) {
        const item = ITEM_MAP[itemId];
        if (item && item.magicFind) mf += item.magicFind;
      }
    });
    return mf;
  }

  function getGoldFind() {
    let gf = 0;
    const h = state.hero;
    if (!h || !h.equip) return 0;
    const slots = ['weapon', 'armor', 'helmet', 'shield', 'ring1', 'ring2', 'amulet', 'belt', 'gloves', 'boots'];
    slots.forEach(slot => {
      const itemId = h.equip[slot];
      if (itemId) {
        const item = ITEM_MAP[itemId];
        if (item && item.goldFind) gf += item.goldFind;
      }
    });
    return gf;
  }

  // Generický getter pro nové affix staty (thorns, dmgReduction, lifeRegen, knockback, preventHeal)
  function getEquipStat(stat) {
    let total = 0;
    const h = state.hero;
    if (!h || !h.equip) return 0;
    const slots = ['weapon', 'armor', 'helmet', 'shield', 'ring1', 'ring2', 'amulet', 'belt', 'gloves', 'boots'];
    slots.forEach(slot => {
      const itemId = h.equip[slot];
      if (itemId) {
        const item = ITEM_MAP[itemId];
        if (item && item[stat]) total += item[stat];
      }
    });
    return total;
  }

  // Aktuální "town floor" (globální patro ve městě) — určuje, jaké itemy shop/gamble nabídne.
  // Sleduje obtížnost a počet poražených bossů, ne level hráče (dropFloor = treasure class).
  function getTownFloor() {
    const diff = state.difficulty || 0;
    const bosses = state.bossesDefeated[diff] || [];
    let kills = 0;
    while (kills < 5 && bosses[kills]) kills++;
    return diff * 50 + Math.min(4, kills) * 10;
  }

  function getPlayerResist(school) {
    let res = 0;
    const h = state.hero;
    if (!h || !h.equip) return 0;
    const slots = ['weapon', 'armor', 'helmet', 'shield', 'ring1', 'ring2', 'amulet', 'belt', 'gloves', 'boots'];
    slots.forEach(slot => {
      const itemId = h.equip[slot];
      if (itemId) {
        const item = ITEM_MAP[itemId];
        if (item) {
          if (school === 'fire') res += item.fireRes || 0;
          else if (school === 'ice') res += item.coldRes || 0;
          else if (school === 'lightning') res += item.lightningRes || 0;
          else if (school === 'nature') res += item.poisonRes || 0;
        }
      }
    });
    // Cap na 75% (D2 styl)
    return Math.min(75, res);
  }

  // Pomocníci pro element dmg affixů elit
  function elementIcon(school) {
    return school === 'fire' ? '🔥' : school === 'ice' ? '❄️' : school === 'lightning' ? '⚡' : '☠️';
  }
  function elementColor(school) {
    return school === 'fire' ? '#e74c3c' : school === 'ice' ? '#3498db' : school === 'lightning' ? '#f1c40f' : '#27ae60';
  }

  // Barevný filter elity podle elementu affixu (Fire=červená, Cold=modrá, Lightning=žlutá, Poison=zelená).
  // Affixy bez elementu dostanou neutrální teplý tón.
  function eliteAffixColor(affix) {
    if (!affix) return null;
    if (affix.element === 'fire') return 'hue-rotate(0deg) saturate(3) brightness(1.1)';
    if (affix.element === 'ice') return 'hue-rotate(200deg) saturate(3) brightness(1.1)';
    if (affix.element === 'lightning') return 'hue-rotate(45deg) saturate(3) brightness(1.15)';
    if (affix.element === 'nature') return 'hue-rotate(90deg) saturate(3) brightness(1.05)';
    return 'hue-rotate(' + rand(0, 360) + 'deg) saturate(2.5)';
  }

  function rollQuality() {
    let mf = getMagicFind();
    // D2 Magic Find: každá kvalita má vlastní diminishing (viz maxroll gold-magic-find).
    // Magic — ŽÁDNÉ diminishing (MF platí naplno).
    // Rare  — diminishing MF×600/(MF+600).
    // Unique— diminishing MF×250/(MF+250).
    const uniqueMF = Math.floor((mf * 250) / (mf + 250));
    const rareMF = Math.floor((mf * 600) / (mf + 600));
    const uniqueChance = 1 + Math.floor(uniqueMF * 0.01);
    const rareChance = 5 + Math.floor(rareMF * 0.05);
    const magicChance = 24 + Math.floor(mf * 0.1); // magic bez diminishing
    const roll = Math.random() * 100;
    if (roll < uniqueChance) return 'unique';
    if (roll < rareChance) return 'rare';
    if (roll < magicChance) return 'magic';
    return 'normal';
  }







  function generateLootItemWithAffixes(baseItem, quality, monsterLevel) {
    // Affixy se filtrují podle HRAČOVA levelu (ne monsterLevel), aby se hráč nikdy
    // nedostal k itemu, na který nemá level. lvlReq pak nikdy nepřesáhne hráčův level.
    const heroLevel = (state.hero && state.hero.level) || monsterLevel;
    const ilvl = Math.min(monsterLevel, heroLevel);

    // Filtrovat affixy: minIlvl <= ilvl, kompatibilní typ
    const candidates = AFFIXES.filter(a =>
      a.minIlvl <= ilvl && a.types.includes(baseItem.type));

    // Pokud nejsou žádné affixy pro tento typ itemu, degradovat na normal
    if (candidates.length === 0) {
      quality = 'normal';
    }

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
      // Magic: 1-2 affixy (D2 styl — každý roll samostatně)
      if (Math.random() < 0.75) {
        const p = pickAffix(prefixes);
        if (p) { chosenAffixes.push(p); usedGroups.add(p.group); }
      }
      if (Math.random() < 0.75) {
        const s = pickAffix(suffixes);
        if (s) { chosenAffixes.push(s); usedGroups.add(s.group); }
      }
      // Fallback: aspoň 1 affix vždy
      if (chosenAffixes.length === 0) {
        const p = pickAffix(prefixes);
        if (p) { chosenAffixes.push(p); usedGroups.add(p.group); }
      }
    } else if (quality === 'rare') {
      // Rare: 3-4 affixy (D2 styl — náhodně prefix/suffix)
      // Rare může mít jen Mechanic's (max 2 sockety), ne Artisan's/Jeweler's
      const rarePrefixes = prefixes.filter(a => !a.magicOnly);
      const rareSuffixes = suffixes;
      const rareCount = 3 + (Math.random() < 0.5 ? 1 : 0); // 50% 3, 50% 4
      for (let i = 0; i < rareCount; i++) {
        // Zkusit oba pooly, preferovat ten s méně affixy
        const pool = (chosenAffixes.filter(a => a.type === 'prefix').length <= chosenAffixes.filter(a => a.type === 'suffix').length)
          ? rarePrefixes : rareSuffixes;
        let a = pickAffix(pool);
        if (!a) {
          // Fallback na druhý pool
          const fallback = pool === rarePrefixes ? rareSuffixes : rarePrefixes;
          a = pickAffix(fallback);
        }
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
      // Sockety — roll podle kvality a typu (jen normal itemy)
      sockets: rollSockets(baseItem.type, quality, baseItem),
      socketedGems: [],
      // Base staty
      baseDmg: baseItem.type === 'weapon' ? Math.round(((baseItem.baseDmgMin||0) + (baseItem.baseDmgMax||0)) / 2) : (baseItem.baseDmg || 0),
      bonusHp: baseItem.bonusHp || 0,
      bonusMana: baseItem.bonusMana || 0,
      defense: baseItem.defenseMin != null ? (baseItem.defenseMin + Math.floor(Math.random() * (baseItem.defenseMax - baseItem.defenseMin + 1))) : (baseItem.defense || 0),
      critChance: baseItem.critChance || 0,
      attackRating: baseItem.attackRating || 0,
      swingMs: baseItem.swingMs || 0,
      // Affix staty (přičtou se)
      fireDmg: 0,
      coldDmg: 0,
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
      poisonDur: 0,
      lightningDmg: 0,
      // Resist staty
      fireRes: 0,
      coldRes: 0,
      lightningRes: 0,
      poisonRes: 0,
      allRes: 0,
      // Gold Find
      goldFind: 0,
      // Magic Find
      magicFind: 0,
      // +Skills
      allSkills: 0,
      classSkills: 0,
      // Increased Attack Speed (IAS) — procento
      ias: 0,
      // Nové D2 mechaniky
      thorns: 0,
      dmgReduction: 0,
      lifeRegen: 0,
      knockback: 0,
      preventHeal: 0,
    };

    // Aplikovat affix staty
    chosenAffixes.forEach(a => {
      // Socket affix — přidá sockety k itemu
      if (a.sockets) {
        const maxFromBase = baseItem.maxSockets || 0;
        const addSockets = Math.min(a.sockets, maxFromBase);
        if (addSockets > 0) {
          lootItem.sockets = (lootItem.sockets || 0) + addSockets;
        }
        return; // socket affix nemá stats
      }
      Object.keys(a.stats).forEach(stat => {
        const val = a.stats[stat];
        if (stat === 'swingMs') {
          lootItem[stat] += rollStat(val);
        } else if (stat === 'allRes') {
          // allRes se rozloží na všechny 4 resisty
          const v = rollStat(val);
          lootItem.fireRes += v;
          lootItem.coldRes += v;
          lootItem.lightningRes += v;
          lootItem.poisonRes += v;
        } else if (stat === 'allSkills') {
          lootItem.allSkills += rollStat(val);
        } else if (stat === 'classSkills') {
          // classSkills: [className, min, max] — uložíme jako objekt
          const v = rollStat([val[1], val[2]]);
          lootItem.classSkills = (lootItem.classSkills || 0) + v;
          lootItem._classSkillsClass = val[0];
        } else {
          lootItem[stat] += rollStat(val);
        }
      });
    });

    // Procentuální bonusy: enhancedDefense a enhancedDmg se aplikují na base staty
    if (lootItem.enhancedDefense > 0 && lootItem.defense > 0) {
      lootItem.defense = Math.round(lootItem.defense * (1 + lootItem.enhancedDefense / 100));
    }
    if (lootItem.enhancedDmg > 0) {
      // Aplikovat na baseDmgMin i baseDmgMax, nejen na průměr
      if (lootItem.baseDmgMin > 0) lootItem.baseDmgMin = Math.round(lootItem.baseDmgMin * (1 + lootItem.enhancedDmg / 100));
      if (lootItem.baseDmgMax > 0) lootItem.baseDmgMax = Math.round(lootItem.baseDmgMax * (1 + lootItem.enhancedDmg / 100));
      if (lootItem.baseDmg > 0) lootItem.baseDmg = Math.round(lootItem.baseDmg * (1 + lootItem.enhancedDmg / 100));
    }

    // Level requirement
    const maxAffixIlvl = chosenAffixes.length > 0
      ? Math.max(...chosenAffixes.map(a => a.minIlvl))
      : 0;
    lootItem.lvlReq = Math.floor(0.75 * maxAffixIlvl);

    // Název: pro rare itemy náhodný D2-style název, jinak prefix + base + suffix
    if (quality === 'rare') {
      lootItem.name = generateRareItemName(baseItem.type);
    } else {
      const prefixName = chosenAffixes.filter(a => a.type === 'prefix').map(a => a.name).join(' ');
      const suffixName = chosenAffixes.filter(a => a.type === 'suffix').map(a => a.name).join(' ');
      lootItem.name = [prefixName, baseItem.name, suffixName].filter(Boolean).join(' ');
    }

    return lootItem;
  }

  // === D2-style Rare Item Name Generation ===
  function generateRareItemName(itemType) {
    const first = RARE_FIRST_WORDS[Math.floor(Math.random() * RARE_FIRST_WORDS.length)];
    const pool = RARE_SECOND_WORDS[itemType] || RARE_SECOND_WORDS.weapon;
    const second = pool[Math.floor(Math.random() * pool.length)];
    return first + ' ' + second;
  }

  function generateUniqueItem(uniqueDef) {
    const baseItem = ITEM_MAP[uniqueDef.baseId];
    if (!baseItem) return null;
    const affixes = (uniqueDef.affixIds || []).map(id => AFFIXES.find(a => a.id === id)).filter(Boolean);
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
      // Sockety pro unique (jen pokud by měl base maxSockets, ale quality!=normal → 0)
      sockets: rollSockets(baseItem.type, 'unique', baseItem),
      socketedGems: [],
      // Base staty
      baseDmg: baseItem.type === 'weapon' ? Math.round(((baseItem.baseDmgMin||0) + (baseItem.baseDmgMax||0)) / 2) : (baseItem.baseDmg || 0),
      bonusHp: baseItem.bonusHp || 0,
      bonusMana: baseItem.bonusMana || 0,
      defense: baseItem.defenseMin != null ? (baseItem.defenseMin + Math.floor(Math.random() * (baseItem.defenseMax - baseItem.defenseMin + 1))) : (baseItem.defense || 0),
      critChance: baseItem.critChance || 0,
      attackRating: baseItem.attackRating || 0,
      swingMs: baseItem.swingMs || 0,
      fireDmg: 0, coldDmg: 0, lifesteal: 0, manaSteal: 0,
      enhancedDefense: 0, enhancedDmg: 0,
      str: 0, vit: 0, int: 0, dex: 0,
      skillDmg: 0, manaRegen: 0, poisonDmg: 0, poisonDur: 0, lightningDmg: 0,
      // Resist staty
      fireRes: 0, coldRes: 0, lightningRes: 0, poisonRes: 0, allRes: 0,
      // Gold/Magic Find
      goldFind: 0, magicFind: 0,
      // +Skills
      allSkills: 0, classSkills: 0,
      // Nové D2 mechaniky
      thorns: 0, dmgReduction: 0, lifeRegen: 0, knockback: 0, preventHeal: 0,
      castSpeed: 0,
      // Increased Attack Speed (IAS) — procento
      ias: 0,
    };

    affixes.forEach(a => {
      Object.keys(a.stats).forEach(stat => {
        const val = rollStat(a.stats[stat]);
        if (stat === 'swingMs') item[stat] += val;
        else item[stat] += val;
      });
    });

    // Přímé staty unique itemu (přesné D2 hodnoty) — aplikují se stejně jako affixy
    if (uniqueDef.stats) {
      Object.keys(uniqueDef.stats).forEach(stat => {
        const val = uniqueDef.stats[stat];
        if (Array.isArray(val)) {
          item[stat] += val[0] + Math.floor(Math.random() * (val[1] - val[0] + 1));
        } else {
          item[stat] += val;
        }
      });
    }

    // Procentuální bonusy pro unikáty
    if (item.enhancedDefense > 0 && item.defense > 0) {
      item.defense = Math.round(item.defense * (1 + item.enhancedDefense / 100));
    }
    if (item.enhancedDmg > 0) {
      if (item.baseDmgMin > 0) item.baseDmgMin = Math.round(item.baseDmgMin * (1 + item.enhancedDmg / 100));
      if (item.baseDmgMax > 0) item.baseDmgMax = Math.round(item.baseDmgMax * (1 + item.enhancedDmg / 100));
      if (item.baseDmg > 0) item.baseDmg = Math.round(item.baseDmg * (1 + item.enhancedDmg / 100));
    }

    return item;
  }

  function initUniqueItems() {
    UNIQUE_ITEMS.forEach(u => {
      const item = generateUniqueItem(u);
      if (item) ITEM_MAP[item.id] = item;
    });
  }

  // Vybere náhodný unique item pro daný base item (podporuje víc unique na jeden base)
  function pickUniqueForBase(baseId) {
    const candidates = UNIQUE_ITEMS.filter(u => u.baseId === baseId);
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function renderItemIcon(item, size) {
    if (!item) return '';
    const s = size || 28;
    // Socket indikátory — puntíky u spodní hrany
    let socketDots = '';
    if (item.sockets && item.sockets > 0) {
      const dotSize = size === 0 ? 8 : 7;
      const dotGap = 2;
      const totalW = item.sockets * dotSize + (item.sockets - 1) * dotGap;
      const startX = size === 0 ? `calc(50% - ${totalW/2}px)` : `calc(50% - ${totalW/2}px)`;
      let dots = '';
      for (let i = 0; i < item.sockets; i++) {
        const gem = item.socketedGems && item.socketedGems[i];
        let dotColor = '#555';
        if (gem) {
          const gemColors = { ruby:'#e94560', sapphire:'#4a7dff', emerald:'#2ecc71', topaz:'#f1c40f' };
          dotColor = gemColors[gem.type] || '#555';
        }
        dots += `<span style="display:inline-block;width:${dotSize}px;height:${dotSize}px;border-radius:50%;border:1px solid #333;background:${dotColor};${i < item.sockets - 1 ? `margin-right:${dotGap}px` : ''}"></span>`;
      }
      socketDots = `<span style="position:absolute;bottom:3px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:0;line-height:0;pointer-events:none">${dots}</span>`;
    }
    if (item.iconImg) {
      if (size === 0) {
        return `<span style="position:relative;display:block;width:100%;height:100%"><img src="${item.iconImg}" alt="" style="display:block;width:100%;height:100%;object-fit:contain;background:#000">${socketDots}</span>`;
      }
      return `<span style="position:relative;display:inline-block;width:${s}px;height:${s}px;vertical-align:middle"><img src="${item.iconImg}" alt="" style="width:100%;height:100%;border-radius:4px;vertical-align:middle;display:block">${socketDots}</span>`;
    }
    const fs = size === 0 ? 28 : s;
    return `<span style="font-size:${fs}px;display:inline-flex;align-items:center;vertical-align:middle;border-radius:4px;padding:2px">${item.icon}</span>`;
  }

  function buildItemStatsHtml(item) {
    if (!item) return '';
    const rows = [];
    function addRow(label, value) {
      if (value === undefined || value === null || value === '' || value === 0) return;
      rows.push(`<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-value">${value}</span></div>`);
    }
    // Rollované módy (affixy) — hodnota i název modré, odlišené od fixních statů (Damage, Defense...)
    function addModRow(label, value) {
      if (value === undefined || value === null || value === '' || value === 0) return;
      rows.push(`<div class="stat-row"><span class="stat-label mod">${label}</span><span class="stat-value mod">${value}</span></div>`);
    }
    // Sestavit mapu rozsahů z affixů — statName → [min, max] (součet všech výskytů)
    const affixRangeMap = {};
    if (item.affixes) {
      item.affixes.forEach(a => {
        if (a.stats) {
          Object.keys(a.stats).forEach(stat => {
            const r = a.stats[stat];
            if (affixRangeMap[stat]) {
              affixRangeMap[stat] = [affixRangeMap[stat][0] + r[0], affixRangeMap[stat][1] + r[1]];
            } else {
              affixRangeMap[stat] = [r[0], r[1]];
            }
          });
        }
      });
    }
    function affixRange(stat) {
      const r = affixRangeMap[stat];
      if (!r) return '';
      return ` [${r[0]} - ${r[1]}]`;
    }
    // Weapon staty
    if (item.type === 'weapon') {
      const handLabel = item.twoHand ? '2H' : '1H';
      const dmgMin = getWeaponTotalDmgMin(item);
      const dmgMax = getWeaponTotalDmgMax(item);
      const swingSec = (item.swingMs || 2200) / 1000;
      const avgDmg = (dmgMin + dmgMax) / 2;
      const dps = Math.round(avgDmg / swingSec * 10) / 10;
      const elemColor = getWeaponElementColor(item);
      const dmgColor = elemColor || '#e8e0e8';
      addRow('Damage', `<span style="color:${dmgColor}">${dmgMin}-${dmgMax}</span> (${handLabel}) [${dps} DPS]`);
      addRow('Speed', `${swingSec.toFixed(2)}s per attack (${(1/swingSec).toFixed(2)}/s)`);
      if (item.critChance) addRow('Crit', `${item.critChance}% (×2.0)`);
    }
    // Armor/helmet
    else if (item.type === 'armor' || item.type === 'helmet') {
      if (item.defense) addRow('Defense', item.defense);
      if (item.bonusHp) addModRow('+HP', `+${item.bonusHp}`);
    }
    // Gloves
    else if (item.type === 'gloves') {
      if (item.defense) addRow('Defense', item.defense);
      if (item.bonusHp) addModRow('+HP', `+${item.bonusHp}`);
    }
    // Boots
    else if (item.type === 'boots') {
      if (item.defense) addRow('Defense', item.defense);
      if (item.bonusHp) addModRow('+HP', `+${item.bonusHp}`);
    }
    // Shield
    else if (item.type === 'shield') {
      if (item.blockChance) addRow('Block', `${item.blockChance}%`);
      if (item.baseDmgMin !== undefined || item.baseDmgMax !== undefined) addRow('Shield Slam', `${item.baseDmgMin}-${item.baseDmgMax} dmg`);
      if (item.defense) addRow('Defense', item.defense);
      if (item.bonusHp) addModRow('+HP', `+${item.bonusHp}`);
    }
    // Belt
    else if (item.type === 'belt') {
      const rows = item.beltRows || 0;
      addRow('Potion Slots', rows > 0 ? `${rows} rows (${rows * 4} slots)` : '0');
      if (item.bonusHp) addModRow('+HP', `+${item.bonusHp}`);
    }
    // Consumable
    else if (item.type === 'consumable') {
      const label = item.subtype === 'heal' ? 'Heals' : 'Restores';
      addRow(label, `${item.effectValue} ${item.subtype === 'heal' ? 'HP' : 'Mana'}`);
    }
    // Gem
    else if (item.type === 'gem') {
      const gem = GEMS[item.gemType];
      const qData = gem ? gem.qualities[item.gemQuality] : null;
      if (qData) {
        rows.push('<div class="stat-row" style="color:#888;font-size:11px;font-weight:bold">Weapon</div>');
        Object.entries(qData.weapon || {}).forEach(([k,v]) => {
          const label = k === 'fireDmg' ? 'Fire Dmg' : k === 'coldDmg' ? 'Cold Dmg' : k === 'lightningDmg' ? 'Lightning Dmg' : k === 'poisonDmg' ? 'Poison Dmg' : k === 'poisonDur' ? 'Duration' : k;
          if (Array.isArray(v)) {
            rows.push(`<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-value">${v[0]}-${v[1]}</span></div>`);
          } else {
            rows.push(`<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-value">${v}</span></div>`);
          }
        });
        rows.push('<div class="stat-row" style="color:#888;font-size:11px;font-weight:bold">Armor/Helm</div>');
        Object.entries(qData.armor || {}).forEach(([k,v]) => {
          const label = k === 'bonusHp' ? '+HP' : k === 'bonusMana' ? '+Mana' : k === 'attackRating' ? 'Attack Rating' : k === 'magicFind' ? 'MF' : k;
          rows.push(`<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-value">${v}</span></div>`);
        });
        if (qData.shield) {
          rows.push('<div class="stat-row" style="color:#888;font-size:11px;font-weight:bold">Shield</div>');
          Object.entries(qData.shield).forEach(([k,v]) => {
            const label = k === 'fireRes' ? 'Fire Resist' : k === 'coldRes' ? 'Cold Resist' : k === 'lightningRes' ? 'Lightning Resist' : k === 'poisonRes' ? 'Poison Resist' : k;
            rows.push(`<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-value">+${v}%</span></div>`);
          });
        }
      }
    }
    // Affix staty — rollované módy (modré)
    function fmtDmg(v) { return Array.isArray(v) ? `${v[0]}-${v[1]}` : v; }
    if (item.fireDmg) addModRow('Fire Dmg', `+${fmtDmg(item.fireDmg)}${affixRange('fireDmg')}`);
    if (item.coldDmg) addModRow('Cold Dmg', `+${fmtDmg(item.coldDmg)}${affixRange('coldDmg')}`);
    if (item.poisonDmg) addModRow('Poison Dmg', `+${fmtDmg(item.poisonDmg)} (${item.poisonDur||2}s)${affixRange('poisonDmg')}`);
    if (item.lightningDmg) addModRow('Lightning Dmg', `+${fmtDmg(item.lightningDmg)}${affixRange('lightningDmg')}`);
    if (item.lifesteal) addModRow('Life Steal', `+${item.lifesteal}%${affixRange('lifesteal')}`);
    if (item.manaSteal) addModRow('Mana Steal', `+${item.manaSteal}%${affixRange('manaSteal')}`);
    if (item.attackRating) addModRow('Attack Rating', `+${item.attackRating}${affixRange('attackRating')}`);
    if (item.skillDmg) addModRow('Skill Dmg', `+${item.skillDmg}%${affixRange('skillDmg')}`);
    if (item.manaRegen) addModRow('Mana Regen', `+${item.manaRegen}/tick${affixRange('manaRegen')}`);
    if (item.bonusMana) addModRow('+Mana', `+${item.bonusMana}${affixRange('bonusMana')}`);
    if (item.bonusHp) addModRow('+HP', `+${item.bonusHp}${affixRange('bonusHp')}`);
    if (item.ias) addModRow('Increased Attack Speed', `+${item.ias}%${affixRange('ias')}`);
    if (item.enhancedDefense) addModRow('Enhanced Defense', `+${item.enhancedDefense}%${affixRange('enhancedDefense')}`);
    if (item.enhancedDmg) addModRow('Enhanced Damage', `+${item.enhancedDmg}%${affixRange('enhancedDmg')}`);
    if (item.str) addModRow('Strength', `+${item.str}${affixRange('str')}`);
    if (item.vit) addModRow('Vitality', `+${item.vit}${affixRange('vit')}`);
    if (item.int) addModRow('Intellect', `+${item.int}${affixRange('int')}`);
    if (item.dex) addModRow('Dexterity', `+${item.dex}${affixRange('dex')}`);
    if (item.magicFind) addModRow('Magic Find', `+${item.magicFind}%${affixRange('magicFind')}`);
    if (item.goldFind) addModRow('Gold Find', `+${item.goldFind}%${affixRange('goldFind')}`);
    if (item.fireRes) addModRow('Fire Resist', `+${item.fireRes}%${affixRange('fireRes')}`);
    if (item.coldRes) addModRow('Cold Resist', `+${item.coldRes}%${affixRange('coldRes')}`);
    if (item.lightningRes) addModRow('Lightning Resist', `+${item.lightningRes}%${affixRange('lightningRes')}`);
    if (item.poisonRes) addModRow('Poison Resist', `+${item.poisonRes}%${affixRange('poisonRes')}`);
    if (item.allRes) addModRow('All Resists', `+${item.allRes}%${affixRange('allRes')}`);
    if (item.allSkills) addModRow('All Skills', `+${item.allSkills}${affixRange('allSkills')}`);
    if (item.classSkills) {
      const className = item._classSkillsClass || 'unknown';
      addModRow(className.charAt(0).toUpperCase() + className.slice(1) + ' Skills', `+${item.classSkills}${affixRange('classSkills')}`);
    }
    if (item.thorns) addModRow('Thorns', `+${item.thorns}${affixRange('thorns')}`);
    if (item.dmgReduction) addModRow('Damage Reduction', `+${item.dmgReduction}${affixRange('dmgReduction')}`);
    if (item.lifeRegen) addModRow('Life Regen', `+${item.lifeRegen}/s${affixRange('lifeRegen')}`);
    if (item.knockback) addModRow('Knockback', 'Knockback');
    if (item.preventHeal) addModRow('Prevent Monster Heal', 'Prevent Monster Heal');
    if (item.attrs) {
      Object.keys(item.attrs).forEach(k => {
        const names = { str:'Strength', vit:'Vitality', dex:'Dexterity', int:'Intellect' };
        addModRow(names[k] || k, `+${item.attrs[k]}`);
      });
    }
    if (item.sockets > 0) {
      addRow('Sockets', item.sockets);
    }
    return rows.join('');
  }

  function getFloorMonsterSet(theme, floor) {
    const pool = (MONSTER_DB[theme] || MONSTER_DB[0]).filter(m => (m.minArea || 0) <= floor);
    const result = [];
    const poolSize = pool.length;
    if (poolSize === 0) return result;
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
    result.push({idx, face: pool[idx].face, name: pool[idx].name, type: pool[idx].type, attackType: pool[idx].attackType, theme: theme, defense: pool[idx].defense || 0, resists: pool[idx].resists || {fire:1.0, ice:1.0, nature:1.0, lightning:1.0},
      hp: pool[idx].hp || 80, dmgMin: pool[idx].dmgMin || 5, dmgMax: pool[idx].dmgMax || 10, attackSpeed: pool[idx].attackSpeed || 2000, blockChance: pool[idx].blockChance || 0,
      resource: pool[idx].resource || 'mana', maxResource: pool[idx].maxResource || 50, spells: pool[idx].spells || [],
      passivePoisonWeapon: pool[idx].passivePoisonWeapon || false});
    return result;
  }

  // Spell pool daného actu (theme) — všechna kouzla, která mají monstra v tomto poolu
  function getActSpellPool(theme) {
    const pool = MONSTER_DB[theme] || MONSTER_DB[0];
    const spellIds = [];
    pool.forEach(m => (m.spells || []).forEach(s => {
      if (!spellIds.includes(s)) spellIds.push(s);
    }));
    return spellIds;
  }

  // Náhodné kouzlo ze spell poolu actu, které odpovídá resource monstra
  // a které monstrum ještě nemá nasazené
  function rollEliteSpell(theme, resource, existingSpells) {
    const spellIds = getActSpellPool(theme);
    const candidates = spellIds.filter(id => {
      if (existingSpells && existingSpells.includes(id)) return false;
      const sp = ENEMY_SPELLS[id];
      if (!sp) return false;
      if (resource === 'rage') return (sp.rageCost || 0) > 0;
      return (sp.manaCost || 0) > 0;
    });
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Náhodný elitní affix (HP/dmg bonus)
  function rollEliteAffix() {
    return ELITE_AFFIXES[rand(0, ELITE_AFFIXES.length - 1)];
  }

  // Násobitel obtížnosti podle zóny a obtížnosti
  // Normal: Act 1 zóna 0 = ×1.0, Act 5 zóna 9 = ×5.5
  // Nightmare: Act 1 zóna 0 = ×5.5 (navazuje na Act 5 Normal), Act 5 zóna 9 = ×12.0
  // Hell: Act 1 zóna 0 = ×12.0 (navazuje na Act 5 Nightmare), Act 5 zóna 9 = ×20.0

  // ===== LEVEL / HIT / DODGE / XP HELPERS =====

  function getLevelDiff(mb) {
    const monsterLv = getMonsterLevel(mb, state.difficulty || 0);
    return (state.hero.level || 1) - monsterLv;
  }

  function getPlayerAttackTable(mb, arMult = 1) {
    // D2 formule: Chance to Hit = 200% × AR / (AR + DR) × Alvl / (Alvl + Dlvl)
    const monsterLv = getMonsterLevel(mb, state.difficulty || 0);
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
    const ar = Math.max(1, (baseAR + totalAR) * arMult);

    // Defense monstra (per-monster, ne lokace)
    const monsterDef = mb.monsterDefense || 0;
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

  // ===== Opportunity Dodge =====
  // Šance, že útok nepřítele JE interaktivní (dodge NEBO block — vznikne příležitost).
  // Vychází z báze (každý má vždy aspoň nějakou šanci) + bonus z armory (celková defense).
  // To je univerzální pro každou classu — nezávisí na DEX investicích.
  function getOpportunityChance(mb) {
    const h = state.hero;
    const eqAttrs = getEquipAttrs();
    // Celková armor defense ze všech slotů
    const totalDefense = getTotalPlayerDefense();
    // Báze — každý má vždy aspoň nějakou šanci (nezávisle na atributecích)
    let base = 12;
    // Bonus z armory — s rostoucí defense roste i šance na uhýbatelný útok
    const armorBonus = Math.floor(totalDefense / 20);
    // Cap na 40% — nesmí být příliš časté
    return clamp(base + armorBonus, 0, 40);
  }

  // Rozhodne, JAKÝ typ interakce se nabídne (dodge vs block).
  // Vzájemně se vylučují — rollne se podle poměru šancí:
  //  - block jde jen když má hráč štít
  //  - block šance = getPlayerBlockChance(), dodge šance = zbytek do 100
  function getOpportunityType(mb) {
    const hasShield = ITEM_MAP[state.hero.equip.shield]?.type === 'shield';
    if (!hasShield) return 'dodge';
    const blockChance = getPlayerBlockChance();
    const dodgeChance = getPlayerDodgeChance(mb);
    const total = blockChance + dodgeChance;
    // Poměr block : (block+dodge). Když block je vyšší než dodge, častěji vyjde block.
    const blockRoll = total > 0 ? (blockChance / total) : 0;
    return Math.random() < blockRoll ? 'block' : 'dodge';
  }

  // Rozhodne o výsledku na konci swingu. Vrací true, pokud byl útok úspěšně
  // vyhnut/vyblokován (nic se neaplikuje). Vrací false, pokud zmeškal (rána projde).
  function resolveOpportunity(mb) {
    // Špatný směr už interakci uzavřel (_oppType=null, _oppFailed=true).
    // Na konci swingu jen skryjeme křížek a rána projde (return false).
    if (mb._oppFailed) {
      mb._oppFailed = false;
      hideOpportunityArrow(mb);
      return false;
    }
    if (!mb._oppType) return false;
    const type = mb._oppType;
    mb._oppType = null;
    mb._oppCooldownUntil = performance.now() + OPPORTUNITY_COOLDOWN_MS;
    hideOpportunityArrow(mb);
    if (mb._oppResolved) {
      playSFX(type === 'block' ? blockSfx : dodgeSfx);
      spawnFloatingText(type === 'block' ? 'BLOCK!' : 'DODGE!', 'right', type === 'block' ? '#3498db' : '#f39c12', 32);
      // Úspěšně zareagoval — resetovat nepřítelův swing a armovat příležitost pro PŘÍŠTÍ melee.
      // (Bez tohoho by _enemySwingReady zůstalo true a útok by se hned opakoval.)
      mb._enemySwingStart = performance.now();
      mb._enemySwingReady = false;
      mb._enemySwingPct = 0;
      if (mb._enemyCasting) mb._oppType = null;
      else armOpportunity(mb);
      return true; // vyhnuto/vyblokováno — útok neprošel
    }
    return false; // zmeškal — rána projde
  }

  // Šipka/štít běží po celou dobu swingu (hráč vidí, na co má reagovat — swing timer už běží).
  // Zobrazí výzvu pro Opportunity (dodge/block): ikona typu uprostřed + zvýrazní správné tlačítko.
  function showOpportunityPrompt(mb) {
    // Skrýt starou šipku
    const arrow = $('mbArrow');
    if (arrow) arrow.setAttribute('class', 'boss-attack-arrow hidden');
    // Zobrazit def tlačítka (overlay)
    const def = $('mbPsDefBtns'); if (def) def.classList.remove('hidden');
    // Zvýraznit správné def tlačítko
    clearDefHighlights();
    if (mb._oppType === 'block') {
      const b = $('mbPsBlockBtn'); if (b) b.classList.add('highlight');
    } else {
      const d = $('mbPsDodgeBtn'); if (d) d.classList.add('highlight');
    }
    // Ikona typu uprostřed (💨 dodge / 🛡️ block)
    const info = $('mbActionInfo');
    if (info) {
      info.classList.remove('hidden');
      info.innerHTML = mb._oppType === 'block' ? '🛡️' : '💨';
    }
  }

  function clearDefHighlights() {
    const d = $('mbPsDodgeBtn'); if (d) d.classList.remove('highlight');
    const b = $('mbPsBlockBtn'); if (b) b.classList.remove('highlight');
  }

  function hideDefBtns() {
    const def = $('mbPsDefBtns'); if (def) def.classList.add('hidden');
  }

  // Okamžitá zpětná vazba po úspěšné reakci — zelená fajfka.
  function showOpportunitySuccess(mb) {
    const arrow = $('mbArrow');
    if (arrow) {
      arrow.setAttribute('class', 'boss-attack-arrow dodge-success');
      arrow.setAttribute('viewBox', '-3 -3 22 22');
      arrow.style.transform = 'translate(-50%, -50%)';
      arrow.style.color = '#2ecc71';
      arrow.style.fill = '#2ecc71';
      arrow.innerHTML = '<path d="M2 8.5L6 12.5L14 3.5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
    }
    clearDefHighlights();
    hideDefBtns();
    const info = $('mbActionInfo'); if (info) info.classList.add('hidden');
  }

  function hideOpportunityArrow(mb) {
    const arrow = $('mbArrow');
    if (arrow) arrow.setAttribute('class', 'boss-attack-arrow hidden');
    clearDefHighlights();
    hideDefBtns();
    const info = $('mbActionInfo'); if (info) info.classList.add('hidden');
  }

  // Špatné tlačítko — červený křížek a interakce se uzavře.
  // Hráč nemůže donekonečna opravovat chybu — rána projde na konci swingu.
  function showOpportunityFail(mb) {
    const arrow = $('mbArrow');
    if (arrow) {
      arrow.setAttribute('class', 'boss-attack-arrow dodge-fail');
      arrow.setAttribute('viewBox', '-3 -3 22 22');
      arrow.style.transform = 'translate(-50%, -50%)';
      arrow.style.rotate = '0deg';
      arrow.style.color = '#e74c3c';
      arrow.style.fill = '#e74c3c';
      arrow.innerHTML = '<path d="M4 4L12 12M12 4L4 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>';
    }
    clearDefHighlights();
    hideDefBtns();
    const info = $('mbActionInfo'); if (info) info.classList.add('hidden');
  }

  // Handler pro def tlačítka (dodge/block).
  function onPsDefButton(type) {
    const mb = mapBattleState;
    if (!mb || mb.ended) return;
    // Combo aktivní — def tlačítka jsou skrytá, nereagovat
    if (mb._comboActive) return;
    if (!mb._oppType) return;
    if (type === mb._oppType) {
      mb._oppResolved = true;
      showOpportunitySuccess(mb); // okamžitá zpětná vazba — fajfka
    } else {
      // Špatné tlačítko — křížek a interakce se uzavře
      mb._oppFailed = true;
      mb._oppType = null;
      showOpportunityFail(mb);
    }
  }

  // Handler pro combo tlačítka (✕◯□△).
  function onPsButton(key) {
    const mb = mapBattleState;
    if (!mb || mb.ended) return;
    if (mb._comboActive) {
      handleComboButton(mb, key);
    }
  }

  function getTotalPlayerDefense() {
    const armorDef = (ITEM_MAP[state.hero.equip.armor] || {defense:0}).defense || 0;
    const helmetDef = ITEM_MAP[state.hero.equip.helmet]?.defense || 0;
    const shieldDef = ITEM_MAP[state.hero.equip.shield]?.defense || 0;
    const glovesDef = ITEM_MAP[state.hero.equip.gloves]?.defense || 0;
    const bootsDef = ITEM_MAP[state.hero.equip.boots]?.defense || 0;
    return armorDef + helmetDef + shieldDef + glovesDef + bootsDef;
  }

  function getPlayerBlockChance() {
    // Block šance hráče: base 25% ze štítu + bonus z Obratnosti (DEX) + Shield Specialization.
    // Každých 10 DEX = +1% block (stejný vzorec jako dodge).
    const h = state.hero;
    const shieldItem = ITEM_MAP[h.equip.shield];
    if (!shieldItem || shieldItem.type !== 'shield') return 0;
    const baseBlock = shieldItem.blockChance || 0;
    const eqAttrs = getEquipAttrs();
    const totalDex = (h.attrDex || 0) + eqAttrs.dex;
    const dexBlock = Math.floor(totalDex / 10);
    const shieldSpecLv = getSkillLv('barbarian_shieldSpec');
    const specBlock = shieldSpecLv * 5;
    return Math.min(baseBlock + dexBlock + specBlock, 75);
  }

  function getShieldSpecDmgMult() {
    // Shield Specialization (Barbar): +20% main-hand weapon dmg per level.
    const lv = getSkillLv('barbarian_shieldSpec');
    return 1 + lv * 0.20;
  }

  function getXpModifier(mb) {
    // D2 XP penalizace za rozdíl levelů hráče vs monstra (getXpMultiplier).
    // Používá se jako násobitel pro bossy a consolation XP.
    const monsterLv = getMonsterLevel(mb, state.difficulty || 0);
    return getXpMultiplier(state.hero.level || 1, monsterLv);
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
    const s = { talentLevels, activeSchool:null, talentPoints:0, hero:{name:'Dobrodruh',face:'hero',level:1,xp:0,gold:0,hp:100,maxHp:100,mana:50,maxMana:50,baseDmg:12,inventory:[],equip:{weapon:'fists',armor:null,helmet:null,shield:null,ring1:null,ring2:null,amulet:null,belt:null,beltPotionSlots:[],gloves:null,boots:null},attrStr:0,attrVit:0,attrDex:0,attrInt:0,attrPoints:0}, deaths:0, wins:0,
      locationProgress:[0,0,0,0,0], _maxLocationProgress:[0,0,0,0,0], areaFightProgress:[0,0,0,0,0], bossesDefeated:[[false,false,false,false,false],[false,false,false,false,false],[false,false,false,false,false]], floorProgress:[0,0,0,0,0], spellUsedThisFloor:{}, lootItems:{}, encounteredMonsters:[], heroClass:null,
      difficulty:0, // index do DIFFICULTIES (0=normal, 1=nightmare, 2=hell)
      townPortalReturn: null, // {actId, zoneId} nebo null — pozice pro town portal scroll
      townPortalCount: 0, // počet town portal scrollů (stack)
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
      _gcdTimer:0, // Global cooldown (ticky)
      _playerDot:0, // Jed na hráči — damage per tick
      _playerDotTicksLeft:0, // Zbývající ticky jedu
      _expandedAct: -1, // Který act je rozbalený na mapě (-1 = žádný)
      chest: new Array(25).fill(null), // Truhla — 25 slotů, itemId nebo null
      _pointsMigrated: true // Flag: dopočítání bodů z levelu proběhlo (migrace starých saveů)
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
      if (!s.hero.equip.gloves) s.hero.equip.gloves = null;
      if (!s.hero.equip.boots) s.hero.equip.boots = null;
    }
    if (s.townPortalCount === undefined) s.townPortalCount = 0;
    // Migrace: bossesDefeated z flat array na 2D [difficulty][actId]
    if (s.bossesDefeated && !Array.isArray(s.bossesDefeated[0])) {
      const flat = s.bossesDefeated;
      s.bossesDefeated = [flat.map(() => false), flat.map(() => false), flat.map(() => false)];
      s.bossesDefeated.forEach((diffArr, di) => {
        ACTS.forEach((loc, i) => { diffArr[i] = flat[i] || false; });
      });
    }
    // Migrace: truhla
    if (!s.chest) s.chest = new Array(25).fill(null);
    // Migrace: _maxLocationProgress — nejvyšší dosažená zastávka per act.
    // Nikdy se nesnižuje; odemykání počítá z něj, ne z locationProgress (které
    // se snižuje při farmění starších zastávek).
    if (!s._maxLocationProgress) {
      s._maxLocationProgress = s.locationProgress.map(v => Math.max(v, 0));
    }
    // Rekalibrovat maxHp/maxMana podle aktuálního vybavení (staty z itemů)
    if (s.hero) {
      s.hero.maxHp = getHeroMaxHp();
      s.hero.hp = Math.min(s.hero.hp, s.hero.maxHp);
      s.hero.maxMana = getHeroMaxMana();
      s.hero.mana = Math.min(s.hero.mana, s.hero.maxMana);
    }
    return s; } } catch {} return defaultState(); }
  function saveGame() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  function resetGame() { state = defaultState(); saveGame(); showScreen('map'); }

  // ===== CLASS SELECT =====
  function selectClass(classId) {
    const cls = CLASSES[classId];
    if (!cls) return;
    state.heroClass = classId;
    // Auto-set portrait podle classy
    const classFaces = { barbarian:'hero_barbarian_m', assassin:'hero_rogue_m', mage:'hero_mage_m' };
    state.hero.face = classFaces[classId] || 'hero';
    state.hero.baseDmg = cls.baseDmg;
    state.hero.attrStr = cls.attrBonus.str;
    state.hero.attrVit = cls.attrBonus.vit;
    state.hero.attrDex = cls.attrBonus.dex;
    state.hero.attrInt = cls.attrBonus.int;
    state.hero.maxHp = getHeroMaxHp();
    state.hero.hp = state.hero.maxHp;
    state.hero.maxMana = getHeroMaxMana();
    state.hero.mana = state.hero.maxMana;
    // První talent point až na lvl 2 — tady žádný
    state.talentPoints = 0;
    // Startovní zbraň podle classy
    const startWeapons = {
      barbarian: 'blade_shortSword',  // Krátký meč
      assassin: 'claws_katar',        // Katar
    };
    const startWpn = startWeapons[classId];
    if (startWpn && ITEM_MAP[startWpn]) {
      state.hero.equip.weapon = startWpn;
    }
    saveGame();
    document.querySelector('.nav-bar').classList.remove('hidden');
    updateTalentBadge();
    renderHero();
    showScreen('town');
    renderTown();
  }

  // ===== SCREENS (SCREEN_IDS / FULL_SCREENS — data v core/screens.ts) =====
  // Track which screen is currently shown (for modal return)
  let _currentScreen = null;

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

    // If it's a modal screen (inventory, talents, hero), open modal instead
    if (name === 'inventory' || name === 'talents' || name === 'hero') {
      openModal(name);
      return;
    }

    // Close any open modal first
    closeModal();

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
    // Fáze 3+: canvas vrstvy se mezi bitvami NEničí — držíme je po celou session,
    // aby pixi.js i dungeon pozadí zůstaly připravené (první bitva je pak okamžitá).
    // (Vrstvy se inicializují v init() na startu hry a self-heal v tickeru
    //  je přepočítává na velikost arény, jakmile se zobrazí.)
    
    Object.values(SCREEN_IDS).forEach(id => {
      const el = $(id);
      if (!el) return;
      if (id === SCREEN_IDS[name]) { el.classList.remove('hidden'); el.classList.add('active'); } else { el.classList.add('hidden'); el.classList.remove('active'); }
    });
    _currentScreen = name;
    // Reset session state při vstupu do města
    if (name === 'town') resetSessionState();
    // Aktivovat nav tlačítko
    document.querySelectorAll('.nav-bar a[data-screen]').forEach(a => {
      a.classList.toggle('active', a.dataset.screen === name);
    });
    // Schovat/ukázat nav-bar podle screenu
    const navBar = document.querySelector('.nav-bar');
    if (navBar) {
      if (name === 'classSelect' || name === 'mapBattle' || name === 'result') {
        navBar.classList.add('hidden');
      } else {
        navBar.classList.remove('hidden');
      }
    }
    // Přepnout BGM: divočina (mapa) = bojová hudba, město a ostatní = městská (overworld).
    // Victory/Lose/boj hudbu nemění — divočina má jednu hudbu skrze vše.
    if (name === 'map') {
      switchBGM('battle');
    } else if (name !== 'mapBattle' && name !== 'battle' && name !== 'result') {
      switchBGM('overworld');
    }
    if (name === 'map') renderMap();
    else if (name === 'town') renderTown();
    else if (name === 'mapBattle') { window.scrollTo(0,0); document.documentElement.scrollTop = 0; }
    else if (name === 'talents') { renderTalents(); updateTalentBadge(); }
    else if (name === 'hero') { renderHero(); updateTalentBadge(); }
    else if (name === 'shop') renderShop();
    else if (name === 'inventory') renderInventory();
    else if (name === 'chest') renderChest();
    else if (name === 'gamble') renderGamble();
    else if (name === 'spellbook') renderSpellbook();
  }

  function openModal(name) {
    const overlay = $('modalOverlay');
    const content = $('modalContent');
    if (!overlay || !content) return;

    // Vždy otevřít na záložce Inventory
    const activeTab = 'inventory';

    // Render all three screens
    renderInventory();
    renderTalents();
    renderHero();
    updateTalentBadge();

    // Build tabs
    const tabs = [
      { id:'inventory', label:'Inventory' },
      { id:'talents', label:'Skills' },
      { id:'hero', label:'Stats' },
    ];
    const talentPts = state.talentPoints || 0;
    const attrPts = state.hero.attrPoints || 0;
    const tabsHtml = tabs.map(t => {
      let badge = '';
      if (t.id === 'talents' && talentPts > 0) badge = `<span class="tab-badge">${talentPts}</span>`;
      if (t.id === 'hero' && attrPts > 0) badge = `<span class="tab-badge">${attrPts}</span>`;
      return `<div class="combined-tab ${t.id === activeTab ? 'active' : ''}" onclick="game.switchCombinedTab('${t.id}')">${t.label}${badge}</div>`;
    }).join('');

    // Build screen wrappers
    const screenIds = { inventory:'inventoryScreen', talents:'talentsScreen', hero:'heroScreen' };
    let screensHtml = '';
    tabs.forEach(t => {
      const el = $(screenIds[t.id]);
      if (!el) return;
      screensHtml += `<div class="combined-screen ${t.id === activeTab ? 'active' : ''}" id="combinedScreen_${t.id}"></div>`;
    });

    content.innerHTML = `<div class="combined-tabs">${tabsHtml}</div>
      <div class="modal-body">${screensHtml}</div>
      <button class="modal-close" onclick="game.closeModal()">✕</button>`;

    // Move screens into their wrappers
    tabs.forEach(t => {
      const el = $(screenIds[t.id]);
      const wrapper = $(`combinedScreen_${t.id}`);
      if (el && wrapper) {
        el.classList.remove('hidden');
        el.classList.add('active');
        wrapper.appendChild(el);
      }
    });

    overlay.classList.remove('hidden');
    // Zamknout scroll stránky — URL bar zůstane viditelný
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  }

  function closeModal() {
    const overlay = $('modalOverlay');
    const content = $('modalContent');
    if (!overlay || !content) return;

    // Move all three screens back to body
    const screenIds = { inventory:'inventoryScreen', talents:'talentsScreen', hero:'heroScreen' };
    Object.values(screenIds).forEach(id => {
      const el = $(id);
      if (el) {
        document.body.appendChild(el);
        el.classList.add('hidden');
        el.classList.remove('active');
      }
    });
    content.innerHTML = '';
    overlay.classList.add('hidden');
    // Odemknout scroll stránky
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    // Pokud je shop otevřený, překreslit ho (inventář se mohl změnit přes modal)
    if (_currentScreen === 'shop') renderShop();
  }

  function switchCombinedTab(tab) {
    const tabs = ['inventory','talents','hero'];
    // Update tab buttons
    document.querySelectorAll('.combined-tab').forEach(btn => {
      const isActive = btn.getAttribute('onclick')?.includes(`'${tab}'`);
      btn.classList.toggle('active', !!isActive);
    });
    // Update screen visibility
    tabs.forEach(t => {
      const wrapper = $(`combinedScreen_${t}`);
      if (wrapper) wrapper.classList.toggle('active', t === tab);
    });
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
      <div class="levelup-details"><span>💪 +5 attribute points</span><span>🎓 +1 talent point</span><span>❤️ Full heal</span></div>
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
    playSFX(shopSfx);

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
  function setDifficulty(di) {
    state.difficulty = di;
    state._expandedAct = -1;
    saveGame();
    renderMap();
  }

  function toggleActExpand(actId) {
    if (state._expandedAct === actId) {
      state._expandedAct = -1;
    } else {
      state._expandedAct = actId;
    }
    renderMap();
  }
  function renderMap() {
    const h = state.hero;
    const diff = DIFFICULTIES[state.difficulty] || DIFFICULTIES[0];

    // Nastavit aktuální act pro map action buttons
    const diffIdx = state.difficulty || 0;
    state._currentActOnMap = ACTS.findIndex((loc, i) => {
      const completed = state.bossesDefeated[diffIdx] && state.bossesDefeated[diffIdx][i];
      return !completed;
    });

    // Town portal tlačítko — jen pokud má hráč scroll
    const hasScroll = (state.townPortalCount || 0) > 0;
    const tpBtn = $('mapTownPortalBtn');
    if (tpBtn) tpBtn.style.display = (hasScroll && state._currentActOnMap >= 0) ? '' : 'none';

    // Difficulty selector
    const allNormalDone = state.bossesDefeated[0] && state.bossesDefeated[0].every(Boolean);
    const allNightmareDone = state.bossesDefeated[1] && state.bossesDefeated[1].every(Boolean);
    const diffBtns = DIFFICULTIES.map((d, di) => {
      const isActive = state.difficulty === di;
      let locked = false;
      if (di === 1 && !allNormalDone) locked = true;
      if (di === 2 && !allNightmareDone) locked = true;
      return `<button class="diff-btn ${isActive?'active':''} ${locked?'locked':''}" onclick="${locked?'':`game.setDifficulty(${di})`}">${locked?'🔒 ':''}${d.name}</button>`;
    }).join('');

    // Build act sections with dot paths
    let html = `<div class="diff-selector">${diffBtns}</div>`;

    // Zobrazit jen: dokončené akty + aktuální odemčený + první následující zamčený.
    // Vzdálené zamčené akty se vůbec nevykreslí → nestáhnou se ani jejich pozadí/brány,
    // čímž se výrazně sníží nápor stahování při startu hry.
    const firstLockedAct = ACTS.findIndex((_, actId) => {
      const prevDone = actId === 0 || (state.bossesDefeated[diffIdx] && state.bossesDefeated[diffIdx][actId-1]);
      return !(actId === 0 || prevDone);
    });

    ACTS.forEach((loc, actId) => {
      const prevDone = actId === 0 || (state.bossesDefeated[diffIdx] && state.bossesDefeated[diffIdx][actId-1]);
      const unlocked = actId === 0 || prevDone;
      const completed = state.bossesDefeated[diffIdx] && state.bossesDefeated[diffIdx][actId];
      // Zamčený act vykreslit jen pokud je to první zamčený (následuje hned za aktuálním).
      if (!unlocked && actId !== firstLockedAct) return;
      const theme = DUNGEON_THEMES[loc.theme] || DUNGEON_THEMES[0];
      const totalZones = loc.zones || 10;
      const curArea = state.locationProgress[actId] || 0;
      const curFight = state.areaFightProgress[actId] || 0;
      const themeName = ['forest','desert','frost','undead','hell'][actId] || 'forest';

      let badgeHtml;
      if (completed) {
        badgeHtml = `<div class="map-loc-badge" style="background:${theme.border};color:${theme.bg}"><div class="badge-count">Done</div></div>`;
      } else if (!unlocked) {
        badgeHtml = `<div class="map-loc-badge" style="background:${theme.border};color:${theme.bg}"><div class="badge-count">Locked</div></div>`;
      } else {
        badgeHtml = `<div class="map-loc-badge" style="background:${theme.border};color:${theme.bg}"><div class="badge-count">Play</div></div>`;
      }

      html += `<div class="map-location-wrap">
        <div class="map-location ${completed?'completed':!unlocked?'locked':''}" style="--theme-glow:${theme.borderGlow};background:linear-gradient(135deg,${theme.bg}cc,${theme.bg}99 80%);border-color:${theme.border};${completed?'opacity:0.7':''}" onclick="${!unlocked?'':`game.toggleActExpand(${actId})`}">
          <div class="map-loc-bg" style="background-image:url(assets/dungeons/${themeName}.webp)"></div>
          ${!unlocked ? `<div class="map-loc-gate" style="background-image:url(assets/gates/gate_${themeName}.webp)"></div>` : ''}
          <div class="map-loc-info">
            <div class="map-loc-name">${loc.name}</div>
          </div>
          ${badgeHtml}
        </div>
        ${(!completed || testMode) && unlocked ? `<div class="map-loc-dot-scroll-wrap ${state._expandedAct === actId ? '' : 'hidden'}" id="mapDotScrollWrap_${actId}">
          <div class="map-loc-dot-scroll" id="mapDotScroll_${actId}">
            ${buildDotPath(actId, curArea, curFight, totalZones, theme)}
          </div>
        </div>` : ''}
      </div>`;
    });

    $('mapScroll').innerHTML = html;

    // Obnovit scroll pozici po návratu
    ACTS.forEach((_, actId) => {
      const key = `_mapScroll_${actId}`;
      const saved = state[key];
      if (saved) {
        const el = $(`mapDotScroll_${actId}`);
        if (el) el.scrollLeft = saved;
      }
    });

    // Uložit scroll pozici při scrollování
    setTimeout(() => {
      ACTS.forEach((_, actId) => {
        const el = $(`mapDotScroll_${actId}`);
        if (el) {
          el.onscroll = function() {
            state[`_mapScroll_${actId}`] = this.scrollLeft;
          };
        }
      });
    }, 0);
  }

  function buildDotPath(actId, curArea, curFight, totalZones, theme) {
    let html = '';
    // Všechny akty — vizuální zastávky s obrázky místo 100 puntíků (waypointy zrušeny)
    const bossDefeated = state.bossesDefeated && state.bossesDefeated[state.difficulty] && state.bossesDefeated[state.difficulty][actId];
    // Odemykání se počítá z _maxLocationProgress (nejvyšší dosažená zastávka),
    // NE z locationProgress, aby farmení starší zastávky opět nezamklo ty pozdější.
    const unlockedArea = (state._maxLocationProgress && state._maxLocationProgress[actId]) || curArea;
    for (let stop = 0; stop < totalZones; stop++) {
      const done = bossDefeated || stop < unlockedArea;
      const current = !bossDefeated && stop === curArea;
      const locked = !bossDefeated && stop > unlockedArea;
      const unlocked = !locked && !done;
      const fightProgress = current ? Math.min(curFight, 10) : 10;
      const badgeHtml = done
        ? '<div class="stop-badge stop-badge-done">✓</div>'
        : current
          ? `<div class="stop-badge stop-badge-progress">${fightProgress}/10</div>`
          : locked
            ? '<div class="stop-badge stop-badge-locked">🔒</div>'
            : `<div class="stop-badge stop-badge-progress">${fightProgress}/10</div>`;
      const cls = done ? 'stop-done' : current ? 'stop-current' : locked ? 'stop-locked' : 'stop-unlocked';
      const label = STOP_NAMES_EN[actId] ? STOP_NAMES_EN[actId][stop] : `Area ${stop+1}`;
      // Šipka před zastávkou naznačuje návaznost z předchozí. Následující zastávka
      // je otevřená, když není zamčená (done/current/unlocked). Šipka se vybarví barvou aktu,
      // jakmile je další zastávka dosažitelná, jinak je černobílá (tmavá).
      if (stop > 0) {
        // Šipka mezi zastávkou (stop-1) a stop se vybarví, až je zastávka "stop" dosažitelná
        // (tedy až je zastávka stop-1 dokončená). Když je boss aktu poražený, všechny svítí.
        // Jinak zůstává černobílá.
        const prevUnlocked = bossDefeated || (!bossDefeated && stop <= unlockedArea);
        html += `<div class="stop-arrow ${prevUnlocked ? 'stop-arrow-active' : ''}" style="--dot-color:${theme.border}" aria-hidden="true"></div>`;
      }
      html += `<div class="stop-wrap ${cls}" style="--dot-color:${theme.border}" onclick="event.stopPropagation();${locked?'':`game.startLocation(${actId}, ${stop}, 0)`}" title="${label}">
        <div class="stop-card">
          <img src="${getStopImage(actId, stop)}" class="stop-img" alt="${label}">
          <div class="stop-label">${label}</div>
          ${badgeHtml}
        </div>
      </div>`;
    }
    return html;
  }

  // ===== TOWN =====
  function renderTown() {
    // Auto-heal při vstupu do města
    state.hero.maxHp = getHeroMaxHp();
    state.hero.hp = state.hero.maxHp;
    state.hero.mana = getHeroMaxMana();
    saveGame();
    // Reset shop cache — při každém příchodu do města se nabídka obnoví
    _resetShopCache();

    // Divočina tlačítko — ukázat jen pokud má hráč nějaký progress
    const wildernessBtn = $('townWildernessBtn');
    const hasProgress = state.locationProgress.some((p, i) => {
      const completed = state.bossesDefeated[state.difficulty] && state.bossesDefeated[state.difficulty][i];
      return !completed && (p > 0 || (state.areaFightProgress[i] || 0) > 0);
    });
    const firstUncompleted = ACTS.findIndex((loc, i) => {
      const completed = state.bossesDefeated[state.difficulty] && state.bossesDefeated[state.difficulty][i];
      return !completed;
    });
    const canEnter = firstUncompleted >= 0 || testMode;
    wildernessBtn.style.display = canEnter ? '' : 'none';

    // Waypoint panel zrušen — cestování mezi zastávkami řeší mapa (zastávky se odemykají postupem).
    // Town portal scroll
    const portalCard = $('townPortalCard');
    const portalInfo = $('townPortalInfo');
    if (state.townPortalReturn) {
      const act = ACTS[state.townPortalReturn.actId];
      const areaNum = (state.townPortalReturn.zoneId || 0) + 1;
      portalCard.style.display = '';
      portalInfo.textContent = `Return to ${act ? act.name : 'Act ' + (state.townPortalReturn.actId+1)}, Area ${areaNum}`;
    } else {
      portalCard.style.display = 'none';
    }
  }

  function enterCurrentAct() {
    // Místo přímého vstupu do aktu ukázat map screen — hráč si vybere ručně
    let actId = state._currentActOnMap;
    // První vstup po zapnutí hry — _currentActOnMap ještě není nastavený (renderMap neproběhl).
    // Spočítat první nedokončený act (stejná logika jako v renderMap), aby transition vždy proběhla.
    if (actId === undefined || actId === null) {
      const diffIdx = state.difficulty || 0;
      actId = ACTS.findIndex((loc, i) => {
        const completed = state.bossesDefeated[diffIdx] && state.bossesDefeated[diffIdx][i];
        return !completed;
      });
      state._currentActOnMap = actId;
    }
    if (actId === undefined || actId === null) { showScreen('map'); renderMap(); return; }
    showTransition('wilderness', actId, () => {
      showScreen('map');
      renderMap();
    });
  }

  function showTransition(type, actId, callback, zoneId) {
    const screen = $('transitionScreen');
    const img = $('transitionImage');
    // 'portal' = Town portal, 'stop' = cesta do zastávky, 'town' = cesta do města
    if (type === 'portal') {
      img.src = 'assets/items/town_portal_scroll.png';
      img.style.setProperty('--glow-low', 'rgba(100,180,255,0.3)');
      img.style.setProperty('--glow-high', 'rgba(100,180,255,0.6)');
    } else if (type === 'town') {
      img.src = 'assets/town.webp';
      img.style.setProperty('--glow-low', 'rgba(240,196,60,0.3)');
      img.style.setProperty('--glow-high', 'rgba(240,196,60,0.6)');
    } else if (type === 'wilderness') {
      img.src = 'assets/map.webp';
      img.style.setProperty('--glow-low', 'rgba(46,204,113,0.3)');
      img.style.setProperty('--glow-high', 'rgba(46,204,113,0.6)');
    } else {
      // 'stop' — cesta do zastávky (obrázek dané zastávky)
      img.src = getStopImage(actId, zoneId || 0);
      // Glow barva podle actu
      const theme = DUNGEON_THEMES[ACTS[actId]?.theme] || DUNGEON_THEMES[0];
      const c = hexToRgb(theme.border);
      img.style.setProperty('--glow-low', `rgba(${c.r},${c.g},${c.b},0.3)`);
      img.style.setProperty('--glow-high', `rgba(${c.r},${c.g},${c.b},0.6)`);
    }
    screen.classList.remove('hidden');
    setTimeout(() => {
      screen.classList.add('hidden');
      callback();
    }, 1500);
  }

  function townHeal() {
    state.hero.maxHp = getHeroMaxHp();
    state.hero.hp = state.hero.maxHp;
    state.hero.mana = getHeroMaxMana();
    saveGame();
    renderTown();
    playSFX(healSfx);
  }

  function useTownPortal() {
    if (!state.townPortalReturn) return;
    const { actId, zoneId, areaFight } = state.townPortalReturn;
    state.townPortalReturn = null;
    saveGame();
    showTransition('portal', actId, () => {
      state.locationProgress[actId] = zoneId;
      state.areaFightProgress[actId] = areaFight || 0;
      state.hero.maxHp = getHeroMaxHp();
      state.hero.hp = state.hero.maxHp;
      state._floorLootDrops = [];
      state._monsterLastSeen = state._monsterLastSeen || {};
      state._monsterLastSeen[ACTS[actId].theme] = {};
      cleanupTimers();
      startLocation(actId);
    });
  }

  function useTownPortalScroll() {
    // Called from inventory when using a town portal scroll item
    const mb = mapBattleState;
    if (!mb || mb.ended) return;
    if ((state.townPortalCount || 0) <= 0) return;
    const actId = mb.locId;
    const progress = state.locationProgress[actId] || 0;
    const areaFight = state.areaFightProgress[actId] || 0;
    state.townPortalReturn = { actId, zoneId: progress, areaFight };
    state.townPortalCount = (state.townPortalCount || 0) - 1;
    saveGame();
    showTransition('portal', actId, () => {
      showScreen('town');
      renderTown();
    });
  }

  function useTownPortalScrollFromMap() {
    // Called from map screen
    if ((state.townPortalCount || 0) <= 0) return;
    const actId = state._currentActOnMap;
    if (actId === undefined || actId === null) return;
    const progress = state.locationProgress[actId] || 0;
    const areaFight = state.areaFightProgress[actId] || 0;
    state.townPortalReturn = { actId, zoneId: progress, areaFight };
    state.townPortalCount = (state.townPortalCount || 0) - 1;
    saveGame();
    showTransition('portal', actId, () => {
      showScreen('town');
      renderTown();
    });
  }

  function walkToTown() {
    // Pěšky do města — ztráta progressu v aktuální zastávce, ALE pokud byla
    // zastávka dokončena (10/10), posune se progress do další zastávky.
    const actId = state._currentActOnMap;
    if (actId === undefined || actId === null) return;
    const totalZones = (ACTS[actId] && ACTS[actId].zones) || 10;
    const progress = state.locationProgress[actId] || 0;
    if ((state.areaFightProgress[actId] || 0) >= 10 && progress < totalZones - 1) {
      state.locationProgress[actId] = progress + 1;
      state._maxLocationProgress[actId] = Math.max(state._maxLocationProgress[actId] || 0, progress + 1);
    }
    state.areaFightProgress[actId] = 0;
    saveGame();
    showTransition('town', actId, () => {
      showScreen('town');
      renderTown();
    });
  }

  function walkToTownFromResult() {
    const mb = mapBattleState;
    if (!mb) return;
    const actId = mb.locId;
    const totalZones = (ACTS[actId] && ACTS[actId].zones) || 10;
    const progress = state.locationProgress[actId] || 0;
    // Dokončená zastávka (10/10) → posun na další zastávku (kromě boss zóny).
    // Nedokončená zastávka → reset progressu (ztráta soubojů v aktuální zastávce).
    if ((state.areaFightProgress[actId] || 0) >= 10 && progress < totalZones - 1) {
      state.locationProgress[actId] = progress + 1;
      state._maxLocationProgress[actId] = Math.max(state._maxLocationProgress[actId] || 0, progress + 1);
    }
    state.areaFightProgress[actId] = 0;
    saveGame();
    showTransition('town', actId, () => {
      showScreen('town');
      renderTown();
    });
  }

  // Pokračování z vítězné obrazovky. Pokud je aktuální zastávka dokončená (10/10),
  // posune progress na další zastávku a tam začne fight 1. Jinak pokračuje na další fight.
  function continueToNextStop(actId) {
    const progress = state.locationProgress[actId] || 0;
    const fight = state.areaFightProgress[actId] || 0;
    const totalZones = (ACTS[actId] && ACTS[actId].zones) || 10;
    // Zastávka dokončená → posun na další (pokud není boss zóna, která se řeší zvlášť)
    if (fight >= 10 && progress < totalZones - 1) {
      state.locationProgress[actId] = progress + 1;
      state._maxLocationProgress[actId] = Math.max(state._maxLocationProgress[actId] || 0, progress + 1);
      state.areaFightProgress[actId] = 0;
      saveGame();
      startLocation(actId);
    } else {
      startLocation(actId);
    }
  }

  function useTownPortalScrollFromResult() {
    const mb = mapBattleState;
    if (!mb) return;
    if ((state.townPortalCount || 0) <= 0) return;
    const actId = mb.locId;
    const progress = state.locationProgress[actId] || 0;
    const areaFight = state.areaFightProgress[actId] || 0;
    state.townPortalReturn = { actId, zoneId: progress, areaFight };
    state.townPortalCount = (state.townPortalCount || 0) - 1;
    saveGame();
    showTransition('portal', actId, () => {
      showScreen('town');
      renderTown();
    });
  }

  // Z poslední Victory page (10/10) — přesměrování na mapu divočiny,
  // aby hráč musel na další zastávku přes mapu.
  function openMapFromResult() {
    const mb = mapBattleState;
    if (!mb) return;
    showScreen('map');
    renderMap();
  }

  // ===== ACT ENTRY =====
  function enterAct(actId) {
    const act = ACTS[actId];
    if (!act) return;
    if (actId > 0 && !state.bossesDefeated[state.difficulty]?.[actId-1]) return;
    const completed = state.bossesDefeated[state.difficulty] && state.bossesDefeated[state.difficulty][actId];
    if (completed) return;

    // Reset shop cache — při odchodu z města se nabídka obnoví
    _resetShopCache();

    // Reset monster rotation
    state._monsterLastSeen = state._monsterLastSeen || {};
    state._monsterLastSeen[act.theme] = {};

    // Start from current progress or zone 0
    const progress = state.locationProgress[actId] || 0;
    // Vstup do actu vždy začíná od začátku oblasti
    state.areaFightProgress[actId] = 0;
    if (progress === 0) {
      state.hero.maxHp = getHeroMaxHp();
      state.hero.hp = state.hero.maxHp;
      state._floorLootDrops = [];
    }

    cleanupTimers();
    startLocation(actId);
  }

  function resetSessionState() {
    _sessionDebuffs = {};
    _sessionBuffs = {};
    _enemyBuffs = {};
    _playerDebuffs = {};
    _sessionSpellCooldowns = {};
    state.comboPoints = 0;
    state.maxMana = getHeroMaxMana();
    state.mana = state.maxMana;
    state._dodgeBuffTimer = 0;
    state._speedBoostTimer = 0;
    state._speedBoostPct = 0;
    state._gcdTimer = 0;
    state.battleShoutTimer = 0;
    state.battleShoutDmgPct = 0;
    state.defensiveShoutTimer = 0;
    state.defensiveShoutArmorPct = 0;
    state.skillShoutTimer = 0;
    state.skillShoutBonus = 0;
    state.thunderClapTimer = 0;
    state.thunderClapSlowPct = 0;
    state._playerDot = 0;
    state._playerDotTicksLeft = 0;
  }

  // Synchronizovat soubojovou manu (state.maxMana) s hero.maxMana.
  // Mana bar v aréně čte state.maxMana, který se při startu souboje nastaví jen jednou;
  // když hráč vybaví item s Intellectem / investuje intelekt uprostřed souboje,
  // musí se state.maxMana přepočítat, jinak by se zdálo, že Intellect nepřidává manu.
  function syncBattleMana() {
    if (mapBattleState && !mapBattleState.ended) {
      state.maxMana = getHeroMaxMana();
      state.mana = Math.min(state.mana || 0, state.maxMana);
      updateMapBattleUI();
    }
  }

  function startLocation(actId, areaOverride, fightOverride) {
    // Reset GCD a combo points per fight (session state zůstává)
    state._gcdTimer = 0;
    state.comboPoints = 0;
    // Buffy a debuffy nepřítele se NEpřenášejí do dalšího souboje — každý souboj je nový nepřítel
    _enemyBuffs = {};
    _sessionDebuffs = {};
    const loc = ACTS[actId];
    if (!loc) return;
    const diff = DIFFICULTIES[state.difficulty] || DIFFICULTIES[0];
    // Pokud je areaOverride/fightOverride zadáno, přepíšeme progress
    if (areaOverride !== undefined) {
      state.locationProgress[actId] = areaOverride;
    }
    if (fightOverride !== undefined) {
      state.areaFightProgress[actId] = fightOverride;
    }
    const progress = state.locationProgress[actId] || 0;
    const areaFight = state.areaFightProgress[actId] || 0;

    const totalZones = loc.zones || 10;
    // Boss je na POSLEDNÍM patře (progress 0..totalZones-1). Původně `>= totalZones`
    // nikdy neplatilo (progress se po bossovi resetuje na 0), takže se boss nespouštěl.
    const isBoss = progress >= totalZones - 1;

    const playerMaxHp = getHeroMaxHp();
    state.hero.maxHp = playerMaxHp;
    const playerHp = Math.min(state.hero.hp || playerMaxHp, playerMaxHp);
    const diffMultOverall = diff.mult;

    // Sada monster pro tuto zónu
    state._floorMonsters = isBoss ? [] : getFloorMonsterSet(loc.theme, progress);
    const floorMonsters = state._floorMonsters;

    // Elitní monstrum = poslední fight v patře (fight 10/10), kromě boss patra
    const isElite = !isBoss && areaFight >= 9;
    // Champion pack = fight 5/10 (3 champs), Elite pack = fight 10/10 (elita + 2 minioni)
    const isChampionPack = !isBoss && !isElite && areaFight === 4;
    const isPack = !isBoss && (isElite || isChampionPack);

    // Fixní staty monstra
    let monsterHp, monsterDmgMin, monsterDmgMax, monsterAttackSpeed, monsterBlockChance;
    let monsterResource, monsterMaxResource, monsterSpells;
    let eliteAffix = null;
    let eliteName = null;
    // D2 elitní mody — dodatečné proměnné pro resisty, defense a dmg-reduction elity
    let eliteResists = null;
    let eliteDefenseMult = null;
    let monsterDRMult = null;
    if (isBoss) {
      const b = loc.boss;
      monsterHp = (b.hp || 500) * diffMultOverall;
      monsterDmgMin = b.dmgMin || 12;
      monsterDmgMax = b.dmgMax || 18;
      monsterAttackSpeed = b.attackSpeed || 1800;
      monsterBlockChance = b.blockChance || 0;
      monsterResource = b.resource || 'mana';
      monsterMaxResource = b.maxResource || 200;
      monsterSpells = b.spells || [];
    } else {
      const m = floorMonsters[0];
      monsterHp = Math.round((m.hp || 80) * diffMultOverall * 2.0 * getZoneMult(progress, state.difficulty));
      monsterDmgMin = m.dmgMin || 5;
      monsterDmgMax = m.dmgMax || 10;
      monsterAttackSpeed = m.attackSpeed || 2000;
      monsterBlockChance = m.blockChance || 0;
      monsterResource = m.resource || 'mana';
      monsterMaxResource = m.maxResource || 50;
      monsterSpells = m.spells || [];
      // Elitní monstrum — vylepšené staty + náhodné kouzlo + D2 mod + vlastní jméno
      if (isElite) {
        monsterHp = Math.round(monsterHp * 2.5);
        monsterDmgMin = Math.round(monsterDmgMin * 1.5);
        monsterDmgMax = Math.round(monsterDmgMax * 1.5);
        monsterMaxResource = Math.round(monsterMaxResource * 1.5);
        const extraSpell = rollEliteSpell(loc.theme, monsterResource, monsterSpells);
        if (extraSpell) monsterSpells = monsterSpells.concat([extraSpell]);
        eliteAffix = rollEliteAffix();
        // Náhodné D2 elitní jméno: [Prefix] [Suffix] the [Appellation]
        eliteName = `${ELITE_PREFIXES[rand(0, ELITE_PREFIXES.length - 1)]} ${ELITE_SUFFIXES[rand(0, ELITE_SUFFIXES.length - 1)]} ${ELITE_APPELATIONS[rand(0, ELITE_APPELATIONS.length - 1)]}`;
      }
    }

    // Boss affixy
    let bossHpMult = 1.0;
    let bossDmgMult = 1.0;
    if (isBoss) {
      const bossAffixes = [];
      const numBossAffixes = 1 + (Math.random() < 0.4 ? 1 : 0);
      for (let i = 0; i < numBossAffixes; i++) {
        const affix = BOSS_AFFIXES[rand(0, BOSS_AFFIXES.length - 1)];
        if (!bossAffixes.find(a => a.name === affix.name)) {
          bossAffixes.push(affix);
        }
      }
      bossAffixes.forEach(a => {
        if (a.name === 'Indestructible') bossHpMult += 0.5;
        if (a.name === 'Fiery' || a.name === 'Icy') bossDmgMult += 1.0;
        if (a.name === 'Swift') bossDmgMult += 0.5;
      });
    }

    // Rezistence elity — nový objekt, do kterého affix mody zapíšou své bonusy
    let monsterResists = isBoss ? Object.assign({}, loc.resists || {fire:1.0, ice:1.0, nature:1.0, lightning:1.0})
                                : Object.assign({}, floorMonsters[0].resists || {fire:1.0, ice:1.0, nature:1.0, lightning:1.0});
    // elitní resistAll (Magic Resistant / Mana Burn) — nastaveno affixem
    if (isElite) eliteResists = { fire:0, ice:0, lightning:0, nature:0 };

    // Aplikovat D2 elitní affix na staty a resisty
    if (isElite && eliteAffix) {
      // HP bonus
      if (eliteAffix.hpMult) monsterHp = Math.round(monsterHp * eliteAffix.hpMult);
      // Damage bonus
      if (eliteAffix.dmgMult) {
        monsterDmgMin = Math.round(monsterDmgMin * eliteAffix.dmgMult);
        monsterDmgMax = Math.round(monsterDmgMax * eliteAffix.dmgMult);
      }
      // Attack speed
      if (eliteAffix.attackSpeedMult) monsterAttackSpeed = Math.round(monsterAttackSpeed * eliteAffix.attackSpeedMult);
      // Stone Skin — fyzická redukce + defense (útočné staty výš, ale příjem dmg hráče řeší def/dr)
      if (eliteAffix.defMult) {
        const baseDef = isBoss ? (loc.monsterDefense || 0) : (floorMonsters[0].defense || 0);
        eliteDefenseMult = eliteAffix.defMult;
      }
      // Element/resist mody mění resisty elity (vs hráčova element kouzla)
      if (eliteAffix.resistSelf) {
        const r = monsterResists;
        if (eliteAffix.resistSelf === 'fire') r.fire = 1.5;   // fire kouzla hráče → -33% dmg
        else if (eliteAffix.resistSelf === 'ice') r.ice = 1.5;
        else if (eliteAffix.resistSelf === 'lightning') r.lightning = 1.5;
        else if (eliteAffix.resistSelf === 'nature') r.nature = 1.5;
      }
      if (eliteAffix.resistAll) {
        eliteResists.fire = 1 + eliteAffix.resistAll;
        eliteResists.ice = 1 + eliteAffix.resistAll;
        eliteResists.lightning = 1 + eliteAffix.resistAll;
        eliteResists.nature = 1 + eliteAffix.resistAll;
      }
      // Stone Skin — monster obdrží míň fyz dmg (řešeno přes monsterDefense/dr při hráčově útoku)
      if (eliteAffix.drMult) {
        monsterDRMult = eliteAffix.drMult;
      }
    }

    const baseHp = isBoss ? Math.round(monsterHp * 4.0) : Math.round(monsterHp);

    // ===== ELITE/CHAMPION PACK — více nepřátel v jednom souboji =====
    // Champion pack = 3 champs (fight 5/10), Elite pack = elita + 2 minioni (fight 10/10).
    // Combat logika (dmg, kouzla, resisty) běží na AKTIVNÍM členovi (mb.bossHp...),
    // pack jen řídí přechody mezi členy.
    let packMembers = null;
    let packActiveIdx = 0;
    if (isPack && !isBoss && floorMonsters[0]) {
      const m0 = floorMonsters[0];
      // Base staty normálního monstra (pro miniony/champs)
      const normalHp = Math.round((m0.hp || 80) * diffMultOverall * 2.0 * getZoneMult(progress, state.difficulty));
      const normalRes = Object.assign({}, m0.resists || {fire:1.0, ice:1.0, nature:1.0, lightning:1.0});
      const mkMember = (over) => Object.assign({
        hp: normalHp, maxHp: normalHp,
        name: m0.name, face: m0.face, type: m0.type, attackType: m0.attackType,
        defense: m0.defense || 0, resists: normalRes,
        dmgMin: m0.dmgMin || 5, dmgMax: m0.dmgMax || 10, attackSpeed: m0.attackSpeed || 2000,
        blockChance: m0.blockChance || 0, resource: m0.resource || 'mana', maxResource: m0.maxResource || 50,
        spells: (m0.spells || []).slice(),
        passivePoisonWeapon: m0.passivePoisonWeapon || false,
        eliteAffix: null, eliteResistBonus: null, eliteDRMult: null, eliteName: null, isLeader: false,
        dead: false
      }, over);
      if (isChampionPack) {
        // 3 champs — mírně silnější než normální (D2 champion boost)
        const champ = () => mkMember({
          name: `${m0.name} Champion`,
          hp: Math.round(normalHp * 1.6), maxHp: Math.round(normalHp * 1.6),
          dmgMin: Math.round((m0.dmgMin || 5) * 1.3), dmgMax: Math.round((m0.dmgMax || 10) * 1.3),
        });
        packMembers = [champ(), champ(), champ()];
      } else {
        // Elita (leader, aktuální upravené staty) + 3 minioni — elita jde vždy POSLEDNÍ
        const eliteMem = mkMember({
          hp: monsterHp, maxHp: monsterHp,
          name: eliteName || m0.name,
          dmgMin: monsterDmgMin, dmgMax: monsterDmgMax, attackSpeed: monsterAttackSpeed,
          blockChance: monsterBlockChance, resource: monsterResource, maxResource: monsterMaxResource,
          spells: monsterSpells, defense: m0.defense * (eliteDefenseMult || 1),
          resists: monsterResists, eliteAffix, eliteResistBonus: eliteResists, eliteDRMult: monsterDRMult,
          isLeader: true
        });
        // Aura Enchanted — minioni dostanou dmg bonus od leaderovy aury
        const auraBoost = (eliteAffix && eliteAffix.aura && eliteAffix.auraDmgMult) ? eliteAffix.auraDmgMult : 1;
        const slave = () => mkMember({
          name: `${m0.name} Slave`,
          dmgMin: auraBoost > 1 ? Math.round((m0.dmgMin || 5) * auraBoost) : (m0.dmgMin || 5),
          dmgMax: auraBoost > 1 ? Math.round((m0.dmgMax || 10) * auraBoost) : (m0.dmgMax || 10),
        });
        // Minioni (3) první, elita (leader) poslední
        packMembers = [slave(), slave(), slave(), eliteMem];
      }
    }

    // Zaznamenat setkání s monstry do bestiáře
    if (!isBoss) {
      state.encounteredMonsters = state.encounteredMonsters || [];
      floorMonsters.forEach(m => {
        const key = m.face;
        if (!state.encounteredMonsters.includes(key)) {
          state.encounteredMonsters.push(key);
        }
      });
    } else {
      state.encounteredMonsters = state.encounteredMonsters || [];
      if (loc.boss && loc.boss.face && !state.encounteredMonsters.includes(loc.boss.face)) {
        state.encounteredMonsters.push(loc.boss.face);
      }
    }

    mapBattleState = {
      locId: actId, loc, isBoss, isElite, eliteAffix, progress, areaFight,
      eliteColor: (isElite && !isBoss) ? eliteAffixColor(eliteAffix) : null,
      bossHp: Math.round(baseHp * bossHpMult), maxBossHp: Math.round(baseHp * bossHpMult),
      bossDmgMult: bossDmgMult,
      playerHp: playerHp, maxPlayerHp: playerMaxHp,
      ended: false, turn: 0,
      mistakes: 0, floorMistakes: 0, stunned: 0, frozen: 0, dot: 0, dotTicksLeft: 0, hot: 0, hotTicksLeft: 0, chillPercent: 0, chillTicksLeft: 0, _activeSpellChillActive: false, _poisonBlockHeal: false, shieldActive: null,
      playerDot: state._playerDot || 0, playerDotTicksLeft: state._playerDotTicksLeft || 0,
      enemyDot: 0, enemyDotTicksLeft: 0, enemyPoisonBaseDmg: 0,
      _ringTimer: null, _sequenceTimer: null, _attackWindowTimer: null,
      _freezeTimer: null, _bonusRaf: null,
      spellCooldowns: {},
      _spellCooldownTicks: 0,
      _blizzardFreeAttacks: 0,
      _improverStacks: 0,
      floorMonsters,
      monsterFace: isBoss ? loc.boss.face : floorMonsters[0].face,
      currentMonsterName: isBoss ? loc.boss.name : floorMonsters[0].name,
      monsterType: isBoss ? null : (floorMonsters[0].type || null),
      monsterAttackType: isBoss ? (loc.boss.attackType || ATTACK_TYPES.MELEE) : (floorMonsters[0].attackType || ATTACK_TYPES.MELEE),
      monsterDefense: ((isBoss ? (loc.monsterDefense || 0) : (floorMonsters[0].defense || 0)) * (1 + getLocAffix('armorMult'))) * (eliteDefenseMult || 1),
      monsterResists: monsterResists,
      eliteResistBonus: eliteResists,
      eliteDRMult: monsterDRMult,
      eliteName: isElite ? eliteName : null,
      bossTypes: isBoss ? (loc.boss.types || []) : [],
      monsterIcons: isBoss ? [] : floorMonsters.map(function(m){return m.face;}),
      monsterNames: isBoss ? [] : floorMonsters.map(function(m){return m.name;}),
      monsterTheme: isBoss ? loc.theme : (floorMonsters[0].theme !== undefined ? floorMonsters[0].theme : loc.theme),
      monsterDmgMin, monsterDmgMax, monsterAttackSpeed, monsterBlockChance,
      monsterResource, monsterMaxResource, monsterSpells,
      passivePoisonWeapon: isBoss ? false : (floorMonsters[0].passivePoisonWeapon || false),
      _thornShieldActive: false, _thornShieldTimer: 0,
      _faerieFireActive: false, _faerieFireTimer: 0,
      _playerSlowPct: 0, _playerSlowTimer: 0,
      _defensiveShoutActive: false, _defensiveShoutTimer: 0,
      _battleShoutActive: false, _battleShoutTimer: 0,
      _evasionActive: false, _evasionTimer: 0,
      _poisonWeaponActive: false, _poisonWeaponTimer: 0, _poisonWeaponDmg: 0,
      _lootDrops: state._floorLootDrops || [],
      playerSwingMs: 0,
      offhandSwingMs: 0,
      enemySwingMs: 0,
      _isDualWield: false,
      _dualWieldTurn: 0,
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
      _enemySlowPct: 0,
      _enemySlowTimer: 0,
      _enemySlowMax: 0,
      _heroicStrikeQueued: false,
      debuffs: {},
      enemyMana: 0, maxEnemyMana: 0,
      _enemyCasting: false, _enemyCastStart: 0, _enemyCastTime: 0, _enemyCastSpell: null, _enemyCastManaCost: 0,
      _enemyCastProcessed: false,
      _enemyCastAfterSwing: null,
      _enemyCastBlockedUntil: 0, // Pummel — do kdy nepřítel nemůže recastit
      _enemyFirstSwingDone: false,
      _playerCasting: false, _playerCastStart: 0, _playerCastTime: 0, _playerCastSpell: null,
      // Opportunity (Dodge/Block) — útok nepřítele může být interaktivní reakcí.
      // _oppType: null | 'dodge' | 'block' (vzájemně se vylučují na jednom swingu)
      _oppType: null, _oppDir: null, _oppResolved: false, _oppFailed: false, _oppCooldownUntil: 0,
      // Combo Attack — hra se pozastaví, hráč swipuje sekvenci směrů; každý úder je 1 hit.
      // _comboActive: true = autoCombatLoop je pozastaven, probíhá combo sekvence.
      _comboActive: false, _comboDirs: [], _comboIdx: 0, _comboPct: 0,
      // Pack (elita+minioni / champion pack)
      packMembers: packMembers,
      packActiveIdx: 0,
      isChampionPack: isChampionPack,
    };

    showScreen('mapBattle');
    // Resetovat death vizuály z předchozího boje
    const skull = $('mbVictorySkull');
    if (skull) skull.classList.add('hidden');
    ['mbPlayerTimerCircle','mbOffhandTimerCircle','mbEnemyTimerCircle','mbEnemyTimerBg'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.opacity = '1'; el.style.animation = ''; el.style.strokeDashoffset = ''; }
    });
    const ring = document.getElementById('mbTimerRing');
    if (ring) ring.style.opacity = '1';
    // Inicializace resource monstra (mana/rage/energy)
    const mb = mapBattleState;
    // Pack — sync aktivního člena (elita/champ) a vyrenderovat roster;
    // jinak roster vyčistit (nový boj bez packu)
    renderPackRoster(mb);
    if (mb.packMembers) {
      packSyncActive(mb);
    }
    if (mb.monsterResource === 'mana') {
      mb.maxEnemyMana = mb.monsterMaxResource || 50;
      mb.enemyMana = mb.maxEnemyMana;
    } else if (mb.monsterResource === 'rage') {
      mb.maxEnemyMana = mb.monsterMaxResource || 100;
      mb.enemyMana = 0; // rage starts at 0, gained on hit
    } else if (mb.monsterResource === 'energy') {
      mb.maxEnemyMana = mb.monsterMaxResource || 100;
      mb.enemyMana = mb.maxEnemyMana; // energy starts full
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
      // Mana/energy regen pro monstra
      if (mb.monsterResource === 'mana' && mb.enemyMana < mb.maxEnemyMana) {
        mb.enemyMana = Math.min(mb.maxEnemyMana, mb.enemyMana + 0.05); // 0.5/s
        updateMapBattleUI();
      }
      // Energy regen (Satyr, Vlk) — rychlejší (1.5/s = 0.15 per 100ms)
      if (mb.monsterResource === 'energy' && mb.enemyMana < mb.maxEnemyMana) {
        mb.enemyMana = Math.min(mb.maxEnemyMana, mb.enemyMana + 0.15);
        updateMapBattleUI();
      }
      // (přesunuto z tickBuffs pro plynulý UI update)
    }, 100);
    // Skrýt starou šipku z předchozího boje ihned
    const arrowReset = $('mbArrow');
    if (arrowReset) arrowReset.setAttribute('class', 'boss-attack-arrow hidden');
    const actionInfoReset = $('mbActionInfo');
    if (actionInfoReset) { actionInfoReset.classList.add('hidden'); actionInfoReset.textContent = ''; }
    if (progress === 0 && !isBoss) { /* hudba se nepřerušuje — bojová stopa hraje dál */ }
    switchBGM('battle');
    document.body.classList.add('battle-active');
    updateMapBattleUI();
    setupMapBattleInput();
    applySchoolColors();
    // Fáze 3: PixiJS canvas vrstva (dungeon pozadí pod DOM prvky arény)
    // Monster sprite zůstává v DOM (mbFigure) — má animace (enemy-enter, monster-dying, filter).
    const arenaEl = $('mbArena');
    if (arenaEl) {
      initBattleScene(arenaEl).then(() => {
        setDungeonBackground(mapBattleState.monsterTheme);
        setBossAura(!!mapBattleState.isBoss);
      });
      // Fáze 4: foreground melee vrstva (PixiJS, z-index 17) — úderové animace zbraní
      initMeleeLayer(arenaEl);
    }
    // 🎨 Tint pozadí arény (samostatná vrstva #mbArenaTint, kterou hit-flashy nepřepisují):
    // - elita (pack s leaderem) → jemná žlutá záře
    // - champion pack → modrá záře
    // - jinak → průhledná
    if (arenaEl) {
      const tintEl = document.getElementById('mbArenaTint');
      if (tintEl) {
        let bg = 'transparent';
        // Výrazná barevná záře celé arény — jasně viditelná na černém pozadí
        if (isElite && isPack) bg = 'radial-gradient(circle at 50% 50%, rgba(241,196,15,0.65) 0%, rgba(241,196,15,0.38) 45%, rgba(241,196,15,0.12) 78%, transparent 100%)';
        else if (isChampionPack) bg = 'radial-gradient(circle at 50% 50%, rgba(74,125,255,0.65) 0%, rgba(74,125,255,0.38) 45%, rgba(74,125,255,0.12) 78%, transparent 100%)';
        tintEl.style.background = bg;
      }
    }
    // Animace příchodu
    const newFig = $('mbFigure');
    if (newFig && !mapBattleState.isBoss && mapBattleState.progress > 0) {
      newFig.classList.remove('enemy-enter', 'enemy-idle', 'boss-idle', 'monster-dying');
      void newFig.offsetWidth;
      newFig.classList.add('monster-appear');
    }
    setTimeout(() => startAutoCombat(), 500);
  }

  // ===== PACK (elita+minioni / champion pack) =====
  // Načte staty aktivního člena packu do mb (combet logika běží na mb.*).
  function packSyncActive(mb) {
    if (!mb.packMembers) return;
    const mem = mb.packMembers[mb.packActiveIdx];
    if (!mem) return;
    mb.bossHp = mem.hp;
    mb.maxBossHp = mem.maxHp;
    mb.currentMonsterName = mem.name;
    mb.monsterFace = mem.face;
    mb.monsterType = mem.type;
    mb.monsterAttackType = mem.attackType;
    mb.monsterDefense = mem.defense;
    mb.monsterResists = mem.resists;
    mb.monsterDmgMin = mem.dmgMin;
    mb.monsterDmgMax = mem.dmgMax;
    mb.monsterAttackSpeed = mem.attackSpeed;
    mb.monsterBlockChance = mem.blockChance;
    mb.monsterResource = mem.resource;
    mb.monsterMaxResource = mem.maxResource;
    mb.monsterSpells = mem.spells;
    mb.passivePoisonWeapon = mem.passivePoisonWeapon;
    mb.isElite = !!mem.isLeader;
    mb.eliteAffix = mem.eliteAffix;
    mb.eliteResistBonus = mem.eliteResistBonus;
    mb.eliteDRMult = mem.eliteDRMult;
    mb.eliteName = mem.eliteName;
    // Reset resource monstra
    if (mem.resource === 'mana') { mb.maxEnemyMana = mem.maxResource; mb.enemyMana = mb.maxEnemyMana; }
    else if (mem.resource === 'rage') { mb.maxEnemyMana = mem.maxResource; mb.enemyMana = 0; }
    else { mb.maxEnemyMana = mem.maxResource; mb.enemyMana = mb.maxEnemyMana; }
    // Reset all swing timers a buffů/debuffů nepřítele (nový target)
    resetEnemyCombatState(mb);
    renderPackRoster(mb);
  }

  // Resetuje enemy swing timery a buffy/debuffy na nepříteli (při výměně targetu).
  function resetEnemyCombatState(mb) {
    mb._enemySwingStart = 0; mb._enemySwingReady = false; mb._enemySwingPct = 0; mb._enemyFirstSwingDone = false;
    mb._enemyCastAfterSwing = null; mb._enemyCasting = false; mb._enemyCastSpell = null; mb._enemyCastProcessed = false;
    mb.enemyDot = 0; mb.enemyDotTicksLeft = 0; mb.enemyPoisonBaseDmg = 0;
    mb._enemySlowPct = 0; mb._enemySlowTimer = 0; mb._enemyStunTimer = 0; mb._enemyStunned = false;
    mb._improverStacks = 0; mb._thornShieldActive = false; mb._faerieFireActive = false;
    mb._amplifyDmgActive = false; mb._battleShoutActive = false; mb._defensiveShoutActive = false;
    mb._preventHealActive = false; mb._enemyCastAfterSwing = null;
    _enemyBuffs = {};
    _sessionDebuffs = {};
    // Vizuální reset debuff ikon
    const debuffOv = $('mbDebuffs');
    if (debuffOv) debuffOv.innerHTML = '';
  }

  // Pokus o přepnutí na dalšího živého člena packu. Vrací true pokud se přepnulo.
  function packTryAdvance(mb) {
    if (!mb.packMembers) return false;
    // 💥 Elita (leader) umírá — element nova (Fire/Cold Enchanted D2 death efekt)
    const dying = mb.packMembers[mb.packActiveIdx];
    if (dying && dying.isLeader && dying.eliteAffix && dying.eliteAffix.death) {
      const arena = $('mbArena');
      if (arena) {
        const color = dying.eliteAffix.death === 'nova-fire' ? 'rgba(231,76,60,0.5)' : 'rgba(52,152,219,0.5)';
        arena.style.transition = 'background-color 0.15s';
        arena.style.backgroundColor = color;
        setTimeout(() => { arena.style.backgroundColor = ''; setTimeout(() => { arena.style.transition = ''; }, 200); }, 150);
      }
      spawnFloatingText(dying.eliteAffix.death === 'nova-fire' ? '🔥 Nova!' : '❄️ Nova!', 'right', dying.eliteAffix.death === 'nova-fire' ? '#e74c3c' : '#3498db', 40);
      playTone(dying.eliteAffix.death === 'nova-fire' ? 110 : 220, 0.25, 'sawtooth', 0.12);
    }
    // Znamenat dead aktuální
    if (dying) dying.dead = true;
    // Najít dalšího živého
    for (let i = 0; i < mb.packMembers.length; i++) {
      if (!mb.packMembers[i].dead) {
        mb.packActiveIdx = i;
        packSyncActive(mb);
        return true;
      }
    }
    return false; // všichni mrtví → vyhráno
  }

  // Vyrenderuje mini-portréty packu nad arénou.
  function renderPackRoster(mb) {
    const el = document.getElementById('mbPackRoster');
    if (!el) return;
    if (!mb.packMembers) { el.innerHTML = ''; return; }
    el.innerHTML = mb.packMembers.map((mem, i) => {
      const face = mem.face.startsWith('<') ? mem.face
        : `<img src="${mem.face}" alt="">`;
      const cls = (i === mb.packActiveIdx ? 'active ' : '') + (mem.dead ? 'dead ' : '') + (mem.isLeader ? 'leader' : '');
      return `<div class="pack-roster-member ${cls}">${face}</div>`;
    }).join('');
  }

  function getSwingTime(weaponId) {
    // Speed zbraně v ms — čím rychlejší zbraň, tím kratší swing
    const w = ITEM_MAP[weaponId] || ITEM_MAP['fists'];
    const base = w.swingMs || 2000; // default 2s
    // DEX zkracuje swing
    const h = state.hero;
    const eqAttrs = getEquipAttrs();
    const dex = (h.attrDex || 0) + eqAttrs.dex;
    let ms = Math.max(550, Math.round(base * (1 - dex * 0.01)));
    // IAS (Increased Attack Speed) — D2 styl: procenta s diminishing returns
    // Sčítá se z nasazené zbraně + rukavic (obojí může nést IAS affixy)
    let ias = (w.ias || 0);
    const gloves = ITEM_MAP[h.equip.gloves];
    if (gloves) ias += (gloves.ias || 0);
    if (ias > 0) {
      // D2: efektivní IAS s diminishing returns — každé další % je méně efektivní
      const eias = Math.round(ias * 100 / (ias + 120));
      ms = Math.max(450, Math.round(ms * 100 / (100 + eias)));
    }
    // Speed boost (assassin) — +20% rychlost = -20% času
    if (state._speedBoostPct > 0) {
      ms = Math.max(450, Math.round(ms * (1 - state._speedBoostPct / 100)));
    }
    return ms;
  }

  // Efektivní swing čas s přihlédnutím k Slow na hráči (D2: swingMs / (1 - slow%/100)).
  function getEffSwingMs(mb, baseMs) {
    if (mb && mb._playerSlowPct && mb._playerSlowTimer > 0) {
      return Math.round(baseMs / (1 - mb._playerSlowPct / 100));
    }
    return baseMs;
  }


  function pickEnemySpell(mb) {
    // Vybere kouzlo podle seznamu kouzel monstra
    const spells = mb.monsterSpells;
    if (!spells || spells.length === 0) return null;
    let candidates = spells.filter(id => ENEMY_SPELLS[id]);
    // Nevybírat empower, pokud už monstrum má aktivní buff
    if (mb._improverStacks > 0) {
      candidates = candidates.filter(id => id !== 'empower');
    }
    // Nevybírat poison_bolt, pokud už hráč má aktivní jed
    if (_playerDebuffs['poison_bolt']) {
      candidates = candidates.filter(id => id !== 'poison_bolt');
    }
    // Nevybírat heal, pokud má nepřítel plné HP (>= 90%)
    if (mb.bossHp / mb.maxBossHp >= 0.9) {
      candidates = candidates.filter(id => id !== 'heal');
    }
    // Nevybírat thorn_shield, pokud už je aktivní
    if (mb._thornShieldActive) {
      candidates = candidates.filter(id => id !== 'thorn_shield');
    }
    // Nevybírat defensive_shout, pokud už je aktivní
    if (mb._defensiveShoutActive) {
      candidates = candidates.filter(id => id !== 'defensive_shout');
    }
    // Nevybírat battle_shout, pokud už je aktivní
    if (mb._battleShoutActive) {
      candidates = candidates.filter(id => id !== 'battle_shout');
    }
    // Nevybírat faerie_fire, pokud už je aktivní
    if (mb._faerieFireActive) {
      candidates = candidates.filter(id => id !== 'faerie_fire');
    }
    // Nevybírat slow, pokud už je aktivní
    if (mb._playerSlowTimer > 0) {
      candidates = candidates.filter(id => id !== 'slow');
    }
    // Nevybírat evasion, pokud už je aktivní
    if (mb._evasionActive) {
      candidates = candidates.filter(id => id !== 'evasion');
    }
    // Nevybírat poison_weapon, pokud už je aktivní
    if (mb._poisonWeaponActive) {
      candidates = candidates.filter(id => id !== 'poison_weapon');
    }
    // Vyřadit kouzla, na která nemá nepřítel manu/resource
    candidates = candidates.filter(id => {
      const spell = ENEMY_SPELLS[id];
      if (!spell) return false;
      // Rage monstra — kontrolovat rageCost
      if (mb.monsterResource === 'rage') {
        return mb.enemyMana >= (spell.rageCost || 0);
      }
      // Energy monstra — kontrolovat manaCost
      if (mb.monsterResource === 'energy') {
        return mb.enemyMana >= (spell.manaCost || 0);
      }
      // Mana monstra
      return mb.enemyMana >= (spell.manaCost || 0);
    });
    if (candidates.length === 0) return null;
    const id = candidates[Math.floor(Math.random() * candidates.length)];
    return { id, ...ENEMY_SPELLS[id] };
  }

  function startAutoCombat() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;

    // Inicializovat swing timer — JEDEN sdílený timer na průměrné rychlosti.
    // Normální dual wield: běží JEN jeden timer, který střídá ruce (main → offhand → main...).
    // Dva souběžné timery běží jen při Double Swing. D2 bonus: průměr × 0.85.
    const cls = CLASSES[state.heroClass];
    const isDualWield = cls && cls.dualWield;
    const mainMs = getSwingTime(state.hero.equip.weapon);
    const hasOffhand = isDualWield && state.hero.equip.shield && ITEM_MAP[state.hero.equip.shield]?.weaponType;
    const offMs = hasOffhand ? getSwingTime(state.hero.equip.shield) : 0;
    mb._isDualWield = offMs > 0;
    mb._dualWieldTurn = 0;
    const avgMs = offMs > 0 ? Math.round((mainMs + offMs) / 2 * 0.85) : mainMs;
    mb.playerSwingMs = avgMs;
    mb.offhandSwingMs = 0; // offhand nemá vlastní timer — sdílí hlavní (střídá se)
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
    mb._doubleSwingCd = 0;

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
    // Rozhodnout o příležitosti pro první melee swing (jen melee monstra)
    if (!mb.isBoss && mb.monsterAttackType !== ATTACK_TYPES.CASTER) {
      armOpportunity(mb);
    }
    autoCombatLoop();
  }

  function autoCombatLoop() {
    if (mapBattleState.ended || mapBattleState._pendingKill) return;
    const mb = mapBattleState;
    const now = performance.now();

    // Combo Attack — hra je pozastavená, hráč swipuje sekvenci úderů.
    // Loop zůstává živý (kvůli případnému ukončení), ale nic se nezpracovává.
    if (mb._comboActive) {
      if (!mb.ended && !mb._pendingKill) {
        mb._combatLoop = requestAnimationFrame(autoCombatLoop);
      }
      return;
    }

    // Tick buffů a GCD každou smyčku
    tickBuffs();
    // Aktualizovat buff/debuff UI každou smyčku (nezávisle na swing timeru)
    renderBuffs();
    renderDebuffs();
    // Aktualizovat resource bary a combo indikátor každou smyčku
    updateResourceBars();
    // Ikona castovaného kouzla
    updateCastSpellIcon(mb);

    // Hráčův swing / cast
    if (mb._playerCasting) {
      // Probíhá castování
      const castElapsed = now - mb._playerCastStart;
      mb._playerSwingPct = Math.min(castElapsed / mb._playerCastTime, 1);
      if (castElapsed >= mb._playerCastTime) {
        // Cast dokončen — provést efekt kouzla
        mb._playerCasting = false;
        const spellId = mb._playerCastSpell;
        mb._playerCastSpell = null;
        executePlayerSpell(spellId);
        // Resetovat swing timer po castu
        mb._playerSwingStart = now;
        mb._playerSwingReady = false;
        mb._playerAttackProcessed = false;
      }
    } else if (!mb._playerSwingReady) {
      // Slow na hráči — zpomalí útok v reálném čase (D2: swingMs / (1 - slow%/100)).
      const effMs = getEffSwingMs(mb, mb.playerSwingMs);
      const playerElapsed = now - mb._playerSwingStart;
      mb._playerSwingPct = Math.min(playerElapsed / effMs, 1);
      if (playerElapsed >= effMs) {
        mb._playerSwingReady = true;
        mb._playerAttackProcessed = false;
      }
    }

    // Offhand swing (dual wield) — vlastní nezávislý timer
    if (mb.offhandSwingMs > 0 && !mb._offhandSwingReady) {
      const offhandElapsed = now - mb._offhandSwingStart;
      mb._offhandSwingPct = Math.min(offhandElapsed / mb.offhandSwingMs, 1);
      if (offhandElapsed >= mb.offhandSwingMs) {
        mb._offhandSwingReady = true;
        mb._offhandAttackProcessed = false;
      }
    }

    // Double Swing cooldown tick (rychlost pomalejší zbraně)
    if (mb._doubleSwingCd > 0) {
      mb._doubleSwingCd = Math.max(0, mb._doubleSwingCd - (now - (mb._lastDsTick || now)));
      mb._lastDsTick = now;
    }

    // Nepřítelův swing / cast — pokud není omráčený
    if (!mb._enemySwingReady && !mb._enemyStunned) {
      if (mb._enemyCasting) {
        // Probíhá castování — aktualizovat cast bar
        const castElapsed = now - mb._enemyCastStart;
        mb._enemySwingPct = Math.min(castElapsed / mb._enemyCastTime, 1);
        if (castElapsed >= mb._enemyCastTime) {
          // Cast dokončen — strhnout manu, provést kouzlo v onAutoEnemyAttack
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
          // Rozhodovací moment — monstrum s kouzly může začít castovat
          // První swing je vždy melee, teprve pak se rozhoduje o castování
          const spells = mb.monsterSpells;
          // Pummel blokuje recast — nepřítel mezitím jen melee útočí
          const castBlocked = mb._enemyCastBlockedUntil && now < mb._enemyCastBlockedUntil;
          if (spells && spells.length > 0 && mb._enemyFirstSwingDone && !castBlocked) {
            const spell = pickEnemySpell(mb);
            if (spell) {
              const cost = mb.monsterResource === 'rage' ? (spell.rageCost || 0) : (spell.manaCost || 0);
              if (mb.enemyMana >= cost) {
                // Nejdřív provést melee útok (neplýtvat swing), kouzlo začne po něm
                mb._enemyCastAfterSwing = { id: spell.id, castTime: spell.castTime, cost: cost };
                mb._enemySwingReady = true;
                mb._enemyAttackProcessed = false;
              } else {
                // Málo many — normální melee útok
                mb._enemySwingReady = true;
                mb._enemyAttackProcessed = false;
              }
            } else {
              // Monstrum bez kouzel — normální swing
              mb._enemySwingReady = true;
              mb._enemyAttackProcessed = false;
            }
          } else {
            // První swing nebo monstrum bez kouzel — normální melee útok
            mb._enemySwingReady = true;
            mb._enemyAttackProcessed = false;
          }
        }
      }
    }

    // Zpracovat útoky — hráč první, aby mohl zabít bosse dřív, než nepřítel stihne zabít jeho
    if (mb._playerSwingReady && !mb._playerAttackProcessed) {
      mb._playerAttackProcessed = true;
      if (mb._isDualWield) {
        // Normální dual wield: JEDEN timer střídá ruce (main → offhand → main...)
        if (mb._dualWieldTurn === 0) {
          mb._dualWieldTurn = 1;
          onAutoPlayerAttack();
        } else {
          mb._dualWieldTurn = 0;
          onAutoOffhandAttack();
        }
      } else {
        onAutoPlayerAttack();
      }
    }
    if (mb._enemySwingReady && !mb._enemyAttackProcessed) {
      mb._enemyAttackProcessed = true;
      // Opportunity (Dodge/Block) — na konci swingu se rozhodne o výsledku.
      // Pokud byl tento swing označen jako interaktivní a hráč stihl zareagovat
      // (resolveOpportunity vrací true), útoku se vyhnul → nic se neaplikuje.
      // Jinak projde normální melee útok (nebo zmeškaná interakce).
      const dodged = resolveOpportunity(mb);
      if (!dodged) {
        onAutoEnemyAttack();
      }
    }

    // Update timer ring vizuál (až po zpracování útoků, aby nedošlo k zelenému probliku)
    updateSwingRings(mb);

    // Guard: pokud endMapBattle byla zavolána zevnitř této smyčky (onAutoPlayerAttack apod.),
    // neplánovat další rAF — cleanupTimers už ho zrušil a konec boje je zpracovaný
    if (!mb.ended && !mb._pendingKill) {
      mb._combatLoop = requestAnimationFrame(autoCombatLoop);
    }
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
    // Enemy DoT tick (jed ze zbraně hráče)
    doEnemyDotTick(mb);
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
    // Mana regen (všechny classy) — 0.3/s + 0.1 per 10 INT (D2 styl, pomalá regen)
    const intBonus = (state.hero.attrInt || 0) * 0.01;
    const regen = 0.3 / 60 + intBonus / 60;
    if (regen > 0 && (state.mana || 0) < (state.maxMana || 100)) {
      state.mana = Math.min(state.maxMana || 100, (state.mana || 0) + regen);
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
    // Enemy slow tick
    if (mb._enemySlowTimer > 0) {
      mb._enemySlowTimer--;
      if (mb._enemySlowTimer <= 0) {
        mb._enemySlowPct = 0;
        // Přepočítat bez slow — zachovat % průběh
        const now = performance.now();
        const oldMs = mb.enemySwingMs;
        const elapsed = now - mb._enemySwingStart;
        const progress = Math.min(elapsed / oldMs, 1);
        mb.enemySwingMs = getEnemySwingTime(mb);
        mb._enemySwingStart = now - progress * mb.enemySwingMs;
      }
    }
  }

  function updateSwingRings(mb) {
    // Pokud bitva skončila, neaktualizovat — cleanupTimers už obstaral zešednutí
    if (mb.ended || mb._pendingKill) return;
    // Hráčův ring (velký, žlutý) + offhand ring (tmavě žlutý) — při dual wieldu běží JEN JEDEN,
    // střídavě podle aktivní ruky (main → offhand → main...).
    const playerCircle = document.getElementById('mbPlayerTimerCircle');
    const offhandCircle = document.getElementById('mbOffhandTimerCircle');
    if (mb._isDualWield) {
      // Aktivní ruka: _dualWieldTurn === 0 → main, 1 → offhand
      const isMain = mb._dualWieldTurn === 0;
      // Hlavní ring
      if (playerCircle) {
        playerCircle.style.opacity = isMain ? '1' : '0';
        if (mb._playerSwingReady) {
          playerCircle.style.strokeDashoffset = '0';
          playerCircle.style.stroke = '#2ecc71';
        } else if (mb._playerCasting) {
          const offset = Math.round(691 * (1 - mb._playerSwingPct));
          playerCircle.style.strokeDashoffset = offset;
          playerCircle.style.stroke = '#60a5fa';
        } else {
          const offset = Math.round(691 * (1 - mb._playerSwingPct));
          playerCircle.style.strokeDashoffset = offset;
          playerCircle.style.stroke = isMain ? '#f1c40f' : '#c9a227'; // main žlutá, offhand tmavě žlutá
        }
      }
      // Offhand ring
      if (offhandCircle) {
        offhandCircle.style.opacity = isMain ? '0' : '1';
        if (mb._playerSwingReady) {
          offhandCircle.style.strokeDashoffset = '0';
          offhandCircle.style.stroke = '#2ecc71';
        } else {
          const offset = Math.round(754 * (1 - mb._playerSwingPct));
          offhandCircle.style.strokeDashoffset = offset;
          offhandCircle.style.stroke = '#c9a227'; // tmavě žlutá
        }
      }
    } else {
      // Single wield — jen hlavní ring
      if (playerCircle) {
        playerCircle.style.opacity = '1';
        if (mb._playerSwingReady) {
          playerCircle.style.strokeDashoffset = '0';
          playerCircle.style.stroke = '#2ecc71';
        } else if (mb._playerCasting) {
          const offset = Math.round(691 * (1 - mb._playerSwingPct));
          playerCircle.style.strokeDashoffset = offset;
          playerCircle.style.stroke = '#60a5fa';
        } else {
          const offset = Math.round(691 * (1 - mb._playerSwingPct));
          playerCircle.style.strokeDashoffset = offset;
          playerCircle.style.stroke = '#f1c40f';
        }
      }
      if (offhandCircle) offhandCircle.style.opacity = '0';
    }
    // Nepřítelův ring (šedý / modrý při castu a slowu / tmavě šedý při stunu)
    const enemyCircle = document.getElementById('mbEnemyTimerCircle');
    if (enemyCircle) {
      enemyCircle.style.opacity = '1';
      if (mb._enemyStunned) {
        // Stun — tmavě šedý ring, od prázdného (offset=553) do plného (offset=0)
        const stunMax = mb._enemyStunMax > 0 ? mb._enemyStunMax : 300;
        const stunPct = Math.min(1, mb._enemyStunTimer / stunMax);
        const offset = Math.round(553 * stunPct);
        enemyCircle.style.strokeDasharray = '553';
        enemyCircle.style.strokeDashoffset = offset;
        enemyCircle.style.stroke = '#555';
      } else if (mb._enemyCasting) {
        // Castování — světle modrý ring
        const castPct = mb._enemyCastTime > 0 ? Math.min(1, (performance.now() - mb._enemyCastStart) / mb._enemyCastTime) : 0;
        const offset = Math.round(553 * (1 - castPct));
        enemyCircle.style.strokeDashoffset = offset;
        enemyCircle.style.stroke = '#3498db';
      } else if (mb._enemySwingReady) {
        enemyCircle.style.strokeDashoffset = '0';
        enemyCircle.style.stroke = '#c0c0c0';
      } else if (mb._enemySlowPct && mb._enemySlowTimer > 0) {
        // Zpomalení / chill — světle modrý ring (jasně odlišený od cast a mana)
        const offset = Math.round(553 * (1 - mb._enemySwingPct));
        enemyCircle.style.strokeDashoffset = offset;
        enemyCircle.style.stroke = '#8ec9ff';
      } else {
        const offset = Math.round(553 * (1 - mb._enemySwingPct));
        enemyCircle.style.strokeDashoffset = offset;
        enemyCircle.style.stroke = '#e67e22';
      }
    }
    // Nepřítelův HP bar — segmenty
    updateEnemyHpBar(mb);
  }

  function updateEnemyHpBar(mb) {
    const fill = document.getElementById('mbEnemyHpFill');
    if (!fill) return;
    const pct = mb.maxBossHp > 0 ? Math.max(0, Math.min(100, (mb.bossHp / mb.maxBossHp) * 100)) : 0;
    // Kruhový HP ring — stroke-dashoffset (obvod r=95 je ~597)
    const CIRC = 597;
    const offset = CIRC * (1 - pct / 100);
    // Fáze 4: damage ghost — stará hodnota doznívá pomaleji (0.6s tween) než fill (0.2s)
    const ghost = document.getElementById('mbEnemyHpGhost');
    if (ghost) {
      ghost.style.strokeDashoffset = offset + '';
    }
    fill.style.strokeDashoffset = offset + '';
  }

  function onAutoPlayerAttack() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    if (mb.bossHp <= 0) { endMapBattle(true); return; }

    // Reset swingu PŘED útokem — i kdyby byl MISS/DODGE, swing se nezasekne
    mb._playerSwingStart = performance.now();
    mb._playerSwingReady = false;
    mb._playerSwingPct = 0;
    // Střídání rukou: když udeří main hand, offhand se resetuje a začne od nuly
    if (mb.offhandSwingMs > 0) {
      mb._offhandSwingStart = performance.now();
      mb._offhandSwingReady = false;
      mb._offhandSwingPct = 0;
    }

    // Heroic Strike — scaling podle levelu: 100 + lv*100 % weapon dmg
    let dmgMult = 1.0;
    if (mb._heroicStrikeQueued) {
      const hsLv = getSpellLv('heroicStrike');
      const hsPct = 100 + (hsLv || 1) * 100; // lv1=200%, lv2=300%, ...
      dmgMult = hsPct / 100;
      mb._heroicStrikeQueued = false;
      // Heroic Strike — vlastní animace, normální spawnMeleeImpact se nevolá
      mb._skipMeleeImpact = true;
      spawnHeroicStrikeAnim(mb);
    }

    // Battle shout bonus
    if (state.battleShoutDmgPct > 0) {
      dmgMult *= (1 + state.battleShoutDmgPct / 100);
    }

    // Použít původní dealPlayerDamage
    dealPlayerDamage(mb, dmgMult);

    updateMapBattleUI();

    if (mb.bossHp <= 0 && !mb._pendingKill) {
      mb._pendingKill = true;
      // Naplánovat endMapBattle co nejdřív — aby ho nemohlo zrušit nic níže
      setTimeout(() => {
        if (!mapBattleState.ended) {
          endMapBattle(true);
          try { spawnDeathEffect(mb); } catch (e) {}
        }
      }, 300);
      try {
        cleanupTimers();
        dimTimers();
        const arena = $('mbArena');
        if (arena) {
          arena.style.transition = 'background 0.15s';
          arena.style.background = 'rgba(200,0,0,0.3)';
          setTimeout(() => { arena.style.background = 'rgba(200,0,0,0.6)'; }, 100);
          setTimeout(() => { arena.style.background = ''; }, 250);
        }
      } catch (e) { console.error('kill path 1:', e); }
      return;
    }
  }

  function onAutoOffhandAttack() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    if (mb.bossHp <= 0 && !mb._pendingKill) {
      mb._pendingKill = true;
      // Naplánovat endMapBattle co nejdřív — aby ho nemohlo zrušit nic níže
      setTimeout(() => {
        if (!mapBattleState.ended) {
          endMapBattle(true);
          try { spawnDeathEffect(mb); } catch (e) {}
        }
      }, 300);
      try {
        updateMapBattleUI();
        cleanupTimers();
        dimTimers();
        const arena = $('mbArena');
        if (arena) {
          arena.style.transition = 'background 0.15s';
          arena.style.background = 'rgba(200,0,0,0.3)';
          setTimeout(() => { arena.style.background = 'rgba(200,0,0,0.6)'; }, 100);
          setTimeout(() => { arena.style.background = ''; }, 250);
        }
      } catch (e) { console.error('kill path 2:', e); }
      return;
    }
    // Reset sdíleného swingu PŘED útokem — offhand sdílí hlavní timer (normální dual wield střídá)
    mb._playerSwingStart = performance.now();
    mb._playerSwingReady = false;
    mb._playerSwingPct = 0;
    // Offhand útok — 50% damage hlavní zbraně, okamžitě (žádné zpoždění — ruce se střídají na sdíleném timeru)
    dealPlayerDamage(mb, 1.0, true);
    updateMapBattleUI();
    if (mb.bossHp <= 0) { endMapBattle(true); return; }
  }

  // ===== Opportunity Dodge — roll na začátku swingu, reakce přes existující swing timer =====
  const OPPORTUNITY_COOLDOWN_MS = 3000; // minimální rozestup mezi příležitostmi (cap frekvence)

  // Enemy kouzla, která NEJSOU ofensivní (buff/debuff/utility) — spell reflect je neodráží jako dmg
  const OFFENSIVE_EXEMPT = ['empower', 'defensive_shout', 'battle_shout', 'thorn_shield', 'faerie_fire', 'evasion', 'heal'];

  // Rozhodne, jestli PRÁVĚ ZAČÍNAJÍCÍ melee swing nepřítele je interaktivní (dodge/block).
  // Volá se vždy, když se startuje nový nepřátelský melee swing (ne boss, ne caster).
  // Šipka/štít pak běží po celou dobu swingu — hráč má čas klasického swing timeru na reakci.
  function armOpportunity(mb) {
    if (mb.isBoss || mb._enemyCasting) return; // boss/caster ne — jen běžné melee
    if (mb._oppType) return; // už běží
    const now = performance.now();
    if (now < mb._oppCooldownUntil) { mb._oppType = null; return; }
    if (Math.random() * 100 >= getOpportunityChance(mb)) { mb._oppType = null; return; }
    mb._oppType = getOpportunityType(mb);
    mb._oppResolved = false;
    mb._oppFailed = false;
    showOpportunityPrompt(mb);
  }

  function onAutoEnemyAttack() {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    // Nepřítel už byl zabit (pendingKill) — nezpracovávat jeho útok/cast
    if (mb._pendingKill) return;
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
        spawnFloatingText('💨 Dodge!', 'left', '#f1c40f', 32);
        updateMapBattleUI();
        return;
      }

      let amount = 0;
      let spellIcon = spell.icon || '🔮';
      let spellText = spell.name;

      // Výpočet base damage pro kouzla — použít fixní staty monstra
      const diffMultOverall = DIFFICULTIES[state.difficulty] ? DIFFICULTIES[state.difficulty].mult : 1.0;
      let baseDmg = Math.round((mb.monsterDmgMin + Math.random() * (mb.monsterDmgMax - mb.monsterDmgMin)) * diffMultOverall * 0.8 * (mb.isBoss ? 1.0 : getZoneMult(mb.progress, state.difficulty)));

      if (spellId === 'poison_bolt') {
        amount = Math.round(baseDmg * 0.3);
        mb.playerDot = amount;
        mb.playerDotTicksLeft = 3;
        _lastPlayerDotTick = performance.now(); // první tick až za 1s, poslední v 0s = konec debuffu
        _playerDebuffs['poison_bolt'] = { icon: '☠️', name: 'Jed', iconImg:'poison.png', ticks: 180, maxTicks: 180 };
        spellText = `☠️ -${amount}/tick`;
      } else if (spellId === 'drain_life') {
        amount = Math.round(baseDmg * 0.7);
        const healAmt = Math.round(amount * 0.6);
        if (!mb._preventHealActive) {
          mb.bossHp = Math.min(mb.maxBossHp, mb.bossHp + healAmt);
          // Heal text (zeleně u nepřítele)
          spawnFloatingText(`+${healAmt}`, 'left', '#2ecc71', 32);
        }
        spellText = `🩸 -${amount}`;
      } else if (spellId === 'mana_drain') {
        amount = Math.round(baseDmg * 0.6);
        const manaDrain = Math.round(amount * 0.8);
        state.hero.mana = Math.max(0, (state.hero.mana || 0) - manaDrain);
        spellText = `💧 -${amount}`;
      } else if (spellId === 'empower') {
        amount = 0; // žádné přímé poškození
        mb._improverStacks = (mb._improverStacks || 0) + 3; // +50% na 3 útoky
        _enemyBuffs['empower'] = { icon: '📈', name: 'Posílení', ticks: 600, maxTicks: 600 };
        spellText = '📈 Posílení';
      } else if (spellId === 'shadow_bolt') {
        amount = Math.round(baseDmg * 1.2);
        if (Math.random() < 0.5) {
          amount = Math.round(amount * 2.0);
          spellText = `🎯 KRIT! -${amount}`;
        } else {
          spellText = `🎯 -${amount}`;
        }
      } else if (spellId === 'heal') {
        amount = 0;
        const healAmt = Math.round(mb.maxBossHp * 0.3);
        if (!mb._preventHealActive) {
          mb.bossHp = Math.min(mb.maxBossHp, mb.bossHp + healAmt);
          spawnFloatingText(`💚 +${healAmt}`, 'left', '#2ecc71', 32);
        }
        spellText = '';
      } else if (spellId === 'defensive_shout') {
        amount = 0;
        mb._defensiveShoutActive = true;
        mb._defensiveShoutTimer = 800; // 8s
        _enemyBuffs['defensive_shout'] = { icon: '🛡️', name: 'Defensive Shout', ticks: 800, maxTicks: 800,
          onExpire: () => { if (mapBattleState) mapBattleState._defensiveShoutActive = false; } };
        spellText = '🛡️ Defensive Shout';
        playSFX(shoutSfx);
        spawnShoutRings(mb, '#5dade2', 'rgba(93,173,226,0.6)');
      } else if (spellId === 'battle_shout') {
        amount = 0;
        mb._battleShoutActive = true;
        mb._battleShoutTimer = 800; // 8s
        _enemyBuffs['battle_shout'] = { icon: '📯', name: 'Battle Shout', ticks: 800, maxTicks: 800,
          onExpire: () => { if (mapBattleState) mapBattleState._battleShoutActive = false; } };
        spellText = '📯 Battle Shout';
        playSFX(shoutSfx);
        spawnShoutRings(mb, '#e74c3c', 'rgba(231,76,60,0.6)');
      } else if (spellId === 'thorn_shield') {
        amount = 0;
        mb._thornShieldActive = true;
        mb._thornShieldTimer = 1000; // 10s
        _enemyBuffs['thorn_shield'] = { icon: '🌵', name: 'Thorn Shield', ticks: 1000, maxTicks: 1000,
          onExpire: () => { if (mapBattleState) mapBattleState._thornShieldActive = false; } };
        spellText = '🌵 Thorn Shield';
      } else if (spellId === 'faerie_fire') {
        amount = 0;
        mb._faerieFireActive = true;
        mb._faerieFireTimer = 1000; // 10s
        _playerDebuffs['faerie_fire'] = { icon: '✨', name: 'Faerie Fire', iconImg:'faerie_fire.png', ticks: 1000, maxTicks: 1000,
          onExpire: () => { if (mapBattleState) mapBattleState._faerieFireActive = false; } };
        spellText = '✨ Faerie Fire';
      } else if (spellId === 'slow') {
        amount = 0;
        mb._playerSlowPct = 50;
        mb._playerSlowTimer = 500; // 5s
        _playerDebuffs['slow'] = { icon: '🐌', name: 'Slow', iconImg:'slow.png', ticks: 500, maxTicks: 500,
          onExpire: () => { if (mapBattleState) { mapBattleState._playerSlowPct = 0; mapBattleState._playerSlowTimer = 0; } } };
        spellText = '🐌 Slow';
      } else if (spellId === 'evasion') {
        amount = 0;
        mb._evasionActive = true;
        mb._evasionTimer = 600; // 6s
        _enemyBuffs['evasion'] = { icon: '💨', name: 'Evasion', ticks: 600, maxTicks: 600,
          onExpire: () => { if (mapBattleState) mapBattleState._evasionActive = false; } };
        spellText = '💨 Evasion';
      } else if (spellId === 'poison_weapon') {
        amount = 0;
        mb._poisonWeaponActive = true;
        mb._poisonWeaponTimer = 800; // 8s
        mb._poisonWeaponDmg = Math.round(baseDmg * 0.15);
        _enemyBuffs['poison_weapon'] = { icon: '☠️', name: 'Poison Weapon', ticks: 800, maxTicks: 800,
          onExpire: () => { if (mapBattleState) { mapBattleState._poisonWeaponActive = false; mapBattleState._poisonWeaponDmg = 0; } } };
        spellText = '☠️ Poison Weapon';
      }

      // 🛡️ Defense + Elementární resisty
      if (amount > 0) {
        // Elementární resisty hráče (jen pro kouzla)
        if (spellId === 'poison_bolt' || spellId === 'drain_life' || spellId === 'mana_drain') {
          const playerRes = getPlayerResist('nature');
          if (playerRes > 0) {
            amount = Math.round(amount * (1 - playerRes / 100));
          }
        } else if (spellId === 'shadow_bolt' || spellId === 'fire_bolt') {
          const playerRes = getPlayerResist('fire');
          if (playerRes > 0) {
            amount = Math.round(amount * (1 - playerRes / 100));
          }
        }
        const armorDef = (ITEM_MAP[state.hero.equip.armor] || {defense:0}).defense || 0;
        const helmetDef = ITEM_MAP[state.hero.equip.helmet]?.defense || 0;
        const shieldDef = ITEM_MAP[state.hero.equip.shield]?.defense || 0;
        const glovesDef = ITEM_MAP[state.hero.equip.gloves]?.defense || 0;
        const bootsDef = ITEM_MAP[state.hero.equip.boots]?.defense || 0;
        let totalDefense = armorDef + helmetDef + shieldDef + glovesDef + bootsDef;
        if (state.defensiveShoutArmorPct > 0) totalDefense = Math.round(totalDefense * (1 + state.defensiveShoutArmorPct / 100));
        if (totalDefense > 0) {
          amount = Math.round(amount * (1 - totalDefense / (totalDefense + 300)));
        }
        // Damage Reduction (D2: of Health/Protection/Absorption/Life/Amicae) — plochá redukce
        const dr = getEquipStat('dmgReduction');
        if (dr > 0) {
          amount = Math.max(0, amount - dr);
        }
        // Block — pouze pokud je v shield slotu skutečně štít
        const shieldItem = ITEM_MAP[state.hero.equip.shield];
        if (shieldItem && shieldItem.type === 'shield' && getPlayerBlockChance() > 0 && Math.random() * 100 < getPlayerBlockChance()) {
          amount = 0;
          spellText = spellIcon + ' 🛡️ BLOCK!';
          playSFX(blockSfx);
        }
        if (amount > 0) {
          mb.playerHp -= amount;
        }
      }

      // Damage text — s ikonou kouzla (zdroj poškození)
      const enemySpellImg = (spell && spell.iconImg) ? `assets/spells/${spell.iconImg}` : null;
      spawnFloatingText(spellText, 'left', '#9b59b6', 32, 2000, enemySpellImg);
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
      spawnFloatingText('💨 Dodge!', 'left', '#f1c40f', 32);
      startEnemyCastAfterSwing(mb);
      return;
    }

    applyEnemyMeleeHit(mb);
    if (mb.playerHp <= 0) { endMapBattle(false); return; }
  }

  // Aplikuje plný melee útok nepřítele na hráče (damage, block, debuffy, life/mana steal…).
  // Vyčleněno z onAutoEnemyAttack, aby se dalo volat i při neúspěšném dodge (missed opportunity).
  function applyEnemyMeleeHit(mb) {
    // Výpočet damage — fixní staty monstra
    mb._enemyFirstSwingDone = true;
    const diffMultOverall = DIFFICULTIES[state.difficulty] ? DIFFICULTIES[state.difficulty].mult : 1.0;
    let bossDmg = Math.round((mb.monsterDmgMin + Math.random() * (mb.monsterDmgMax - mb.monsterDmgMin)) * diffMultOverall * (mb.isBoss ? 1.0 : getZoneMult(mb.progress, state.difficulty)));
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
    // D2 elitní mody — element dmg (Fire/Cold/Lightning/Poison Enchanted), Mana Burn, Cursed
    if (mb.isElite && mb.eliteAffix) {
      const ea = mb.eliteAffix;
      // Element dmg — přičte k fyzickému, projde hráčovými resisty
      if (ea.element && ea.elementDmgMult) {
        const playerRes = getPlayerResist(ea.element === 'nature' ? 'nature' : ea.element);
        const elemDmg = Math.max(1, Math.round(bossDmg * ea.elementDmgMult * (1 - Math.min(75, playerRes) / 100)));
        bossDmg += elemDmg;
        spawnFloatingText(elementIcon(ea.element) + ' -' + elemDmg, 'left', elementColor(ea.element), 28);
      }
      // Mana Burn — krade manu, +magic resist
      if (ea.manaBurn) {
        const burnAmt = Math.min(state.hero.mana || 0, Math.round(bossDmg * 0.25));
        if (burnAmt > 0) {
          state.hero.mana = Math.max(0, (state.hero.mana || 0) - burnAmt);
          mb.bossHp = Math.min(mb.maxBossHp, mb.bossHp + Math.round(burnAmt * 0.5));
          spawnFloatingText(`💜 -${burnAmt} mana`, 'left', '#9b59b6', 28);
        }
      }
      // Cursed — 75% šance na amplify damage (hráč bere o 25% víc)
      if (ea.curse && Math.random() < 0.75 && !mb._amplifyDmgActive) {
        mb._amplifyDmgActive = true;
        _playerDebuffs['elite_amplify'] = { icon: '💀', name: 'Amplify Damage', iconImg:null, ticks: 600, maxTicks: 600 };
        spawnFloatingText('💀 Amplify Damage', 'left', '#c0392b', 32);
      }
      // Lightning Enchanted — na hit bleskový burst
      if (ea.onHit === 'lightning') {
        const boltDmg = Math.max(1, Math.round(bossDmg * 0.3 * (1 - Math.min(75, getPlayerResist('lightning')) / 100)));
        mb.playerHp = Math.max(0, mb.playerHp - boltDmg);
        spawnFloatingText('⚡ -' + boltDmg, 'left', '#f1c40f', 28);
      }
    }
    // Battle shout buff — +50% damage
    if (mb._battleShoutActive) {
      bossDmg = Math.round(bossDmg * 1.5);
    }
    // Defensive shout — -30% incoming damage
    if (mb._defensiveShoutActive) {
      bossDmg = Math.round(bossDmg * 0.7);
    }
    // 🛡️ Defense — WoW styl
    const armorDef = (ITEM_MAP[state.hero.equip.armor] || {defense:0}).defense || 0;
    const helmetDef = ITEM_MAP[state.hero.equip.helmet]?.defense || 0;
    const shieldDef = ITEM_MAP[state.hero.equip.shield]?.defense || 0;
    const glovesDef = ITEM_MAP[state.hero.equip.gloves]?.defense || 0;
    const bootsDef = ITEM_MAP[state.hero.equip.boots]?.defense || 0;
    let totalDefense = armorDef + helmetDef + shieldDef + glovesDef + bootsDef;
    if (state.defensiveShoutArmorPct > 0) totalDefense = Math.round(totalDefense * (1 + state.defensiveShoutArmorPct / 100));
    if (totalDefense > 0) {
      bossDmg = Math.round(bossDmg * (1 - totalDefense / (totalDefense + 300)));
    }
    // Damage Reduction (D2: of Health/Protection/Absorption/Life/Amicae) — plochá redukce
    const dr = getEquipStat('dmgReduction');
    if (dr > 0) {
      bossDmg = Math.max(0, bossDmg - dr);
    }
    let amount = bossDmg;
    // Interaktivní block běží v resolveOpportunity (na začátku swingu) — když se sem
    // dostaneme, útok NEbyl vyblokován (resolveOpportunity vrátil false). Rána projde.
    let blocked = false;

    // 💀 Cursed (D2 amplify damage) — hráč bere o 50% víc fyz dmg
    if (mb._amplifyDmgActive) {
      amount = Math.round(amount * 1.5);
    }

    if (!blocked) {
      mb.playerHp -= amount;
      // Monster rage gain za útok na hráče (Troll, Medvěd)
      if (mb.monsterResource === 'rage') {
        mb.enemyMana = Math.min(mb.maxEnemyMana, (mb.enemyMana || 0) + 5);
      }
      // ☠️ Poison Weapon — pasivní DoT na hráče při melee zásahu (Satyr)
      if (mb.passivePoisonWeapon) {
        const poisonDmg = Math.max(1, Math.round(amount * 0.15));
        mb.playerDot = poisonDmg;
        mb.playerDotTicksLeft = 3;
        _playerDebuffs['passive_poison_weapon'] = { icon: '☠️', name: 'Jed (zbraň)', iconImg:'poison.png', ticks: 180, maxTicks: 180 };
        spawnFloatingText(`☠️ -${poisonDmg}/tick`, 'left', '#27ae60', 28);
      }
    }
    // ✨ Faerie Fire — snížení resistencí hráče o 50%
    if (mb._faerieFireActive) {
      // Aplikuje se v getSchoolResistMult — tady jen vizuální feedback
      spawnFloatingText('✨ Resist -50%', 'left', '#9b59b6', 28);
    }
    // Life steal / mana steal
    if (!blocked && lifeStealAmt > 0 && !mb._preventHealActive) {
      mb.bossHp = Math.min(mb.maxBossHp, mb.bossHp + lifeStealAmt);
      // Heal text (zeleně u nepřítele — vlevo) — zpožděný, aby se nepřekrýval s damage textem
      setTimeout(() => spawnFloatingText(`+${lifeStealAmt}`, 'left', '#2ecc71', 32), 300);
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

    // Damage text — s ikonou monstra (zdroj poškození)
    const enemyIconPath = (mb.isBoss ? (mb.loc && mb.loc.boss && mb.loc.boss.face) : mb.monsterFace);
    spawnFloatingText(blocked ? '🛡️ BLOCK!' : `-${amount}`, 'left', blocked ? '#3498db' : '#fff', 32, 2000, (enemyIconPath && enemyIconPath.startsWith('assets/')) ? enemyIconPath : null);

    updateMapBattleUI();

    // Pokud mělo monstrum po tomto swingu začít kouzlit — spustit cast
    startEnemyCastAfterSwing(mb);

    // Reset nepřítelova swingu
    mb._enemySwingStart = performance.now();
    mb._enemySwingReady = false;
    mb._enemySwingPct = 0;
    // Rozhodnout o příležitosti pro PŘÍŠTÍ melee swing (roll na začátku swingu)
    if (mb._enemyCasting) mb._oppType = null;
    else armOpportunity(mb);
  }

  // Spustí cast kouzla, které mělo monstrum provést po melee útoku (uloženo v _enemyCastAfterSwing)
  function startEnemyCastAfterSwing(mb) {
    const pending = mb._enemyCastAfterSwing;
    if (!pending) return;
    mb._enemyCastAfterSwing = null;
    if (mapBattleState.ended || mb._pendingKill) return;
    const spell = ENEMY_SPELLS[pending.id];
    if (!spell) return;
    mb._enemyCasting = true;
    mb._enemyCastStart = performance.now();
    mb._enemyCastTime = pending.castTime;
    mb._enemyCastSpell = pending.id;
    mb._enemyCastManaCost = pending.cost; // Resource se strhne až po dokončení castu
    mb._enemySwingStart = performance.now();
    updateMapBattleUI();
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
      $('mbLocation').textContent = `Act ${mb.locId+1} - ${mb.loc.name}`;
    } else {
      const typeIcon = mb.monsterType === MONSTER_TYPES.LIFESTEALER ? '🩸' :
        mb.monsterType === MONSTER_TYPES.MANASTEALER ? '💧' :
        mb.monsterType === MONSTER_TYPES.IMPROVER ? '📈' :
        mb.monsterType === MONSTER_TYPES.CRITMASTER ? '🎯' :
        mb.monsterType === MONSTER_TYPES.POISON ? '☠️' : '';
      const atkIcon = mb.monsterAttackType === ATTACK_TYPES.CASTER ? '🔮' : '⚔️';
      const eliteTag = mb.isElite && mb.eliteAffix ? `${mb.eliteAffix.icon} ` : '';
      // Elita má plné D2 jméno "[Prefix] [Suffix] the [Appellation]" — zobrazit jen to
      const displayName = (mb.isElite && mb.eliteName) ? mb.eliteName : mb.currentMonsterName;
      $('mbEnemyName').textContent = `${eliteTag}${displayName} ${typeIcon}${atkIcon}`;
      // Nadpis vpravo nahoře: Act X - Název zastávky - Číslo souboje/10
      // (areaFight je 0-indexed → souboj 6 = areaFight 5 → 6/10)
      const stopName = getStopName(mb.locId, mb.progress, true);
      const fightNum = (mb.areaFight || 0) + 1;
      const locStr = `Act ${mb.locId+1} - ${stopName} - ${fightNum}/10`;
      // Ukázat affix popis pod jménem elity (tooltip/desc)
      const affixDesc = mb.isElite && mb.eliteAffix ? mb.eliteAffix.desc : null;
      if (affixDesc) {
        $('mbLocation').textContent = `${locStr} · ${affixDesc}`;
      } else {
        $('mbLocation').textContent = `${locStr}${mb.isElite ? ' · ELITE' : ''}`;
      }
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
    // Stamina bar — schovat, nahrazeno mana barem
    const arenaStamina = $('mbPlayerArenaStamina');
    if (arenaStamina) arenaStamina.classList.add('hidden');
    // Mana bar (všechny classy — D2 styl)
    const manaBar = $('mbPlayerArenaMana');
    if (manaBar) {
      manaBar.classList.remove('hidden');
      const span = manaBar.querySelector('span');
      if (span) span.textContent = `${Math.round(state.mana || 0)}/${state.maxMana || 100}`;
      const fill = $('mbPlayerArenaManaFill');
      if (fill) fill.style.width = Math.max(0, Math.round(((state.mana || 0) / (state.maxMana || 100)) * 100)) + '%';
    }
    const emoji = mb.isBoss ? mb.loc.boss.face : mb.monsterFace;
    // Enemy resource bar (mana/rage/energy)
    const manaBar2 = $('mbEnemyManaBar');
    const manaFill = $('mbEnemyManaFill');
    if (manaBar2 && manaFill) {
      if (mb.maxEnemyMana > 0 && !mb.isBoss) {
        manaBar2.classList.remove('hidden');
        const mpPct = Math.round((mb.enemyMana / mb.maxEnemyMana) * 100);
        // Kruhový mana ring — obvod r=92 je ~578
        const MANA_CIRC = 578;
        manaFill.style.strokeDashoffset = (MANA_CIRC * (1 - mpPct / 100)) + '';
        // Bar color podle resource
        if (mb.monsterResource === 'rage') manaFill.style.stroke = '#e67e22';
        else if (mb.monsterResource === 'energy') manaFill.style.stroke = '#f1c40f';
        else manaFill.style.stroke = '#4a7dff';
      } else {
        manaBar2.classList.add('hidden');
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
    // Elitní nepřítel — barevný filter přes celý obrázek (náhodná barva, stabilní v boji).
    const eliteFilter = mb.isElite && mb.eliteColor ? mb.eliteColor + ' ' + themeFilter : themeFilter;
    if (emoji.startsWith('<svg')) { fig.innerHTML = emoji; }
    else if (emoji.startsWith('assets/')) { fig.innerHTML = '<div class=\"monster-ring-frame\"><img src=\"'+emoji+'\" alt=\"\" style=\"filter:'+eliteFilter+'\"/></div>'; }
    else { fig.textContent = emoji; }
    // Ikona castovaného kouzla na nepříteli
    updateCastSpellIcon(mb);
    // (hint necháme pro bonus info — nastaví se až v onMapAttack)

    // Debuff ikony nad příšerou
    renderDebuffs();
    // Buff ikony hráče
    renderBuffs();

    updateSpellButtons();
    renderPotionButtons();
  }

  function updateCastSpellIcon(mb) {
    const el = $('mbCastSpellIcon');
    if (!el) return;
    // Zjistit, jestli něco castí — hráč nebo nepřítel
    let spellId = null;
    let spellIconImg = null;
    if (mb._playerCasting && mb._playerCastSpell) {
      spellId = mb._playerCastSpell;
    } else if (mb._enemyCasting && mb._enemyCastSpell) {
      spellId = mb._enemyCastSpell;
      const spellDef = ENEMY_SPELLS[spellId];
      if (spellDef && spellDef.iconImg) spellIconImg = spellDef.iconImg;
    }
    if (spellId) {
      if (spellIconImg) {
        el.innerHTML = `<img src="assets/spells/${spellIconImg}" style="width:64px;height:64px;object-fit:contain">`;
      } else {
        el.innerHTML = `<span style="font-size:48px">${ENEMY_SPELLS[spellId]?.icon || '🔮'}</span>`;
      }
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  // Výchozí počet potion slotů bez pásku (nejnižší pásek má 8)
  const DEFAULT_POTION_SLOTS = 4;
  function getTotalPotionSlots() {
    const belt = ITEM_MAP[state.hero.equip.belt];
    return belt ? ((belt.beltRows || 0) * 4) : DEFAULT_POTION_SLOTS;
  }

  function renderPotionButtons() {
    const container = $('mbPotionButtons');
    if (!container) return;
    const h = state.hero;
    const bpSlots = h.equip.beltPotionSlots || [];
    while (bpSlots.length < getTotalPotionSlots()) bpSlots.push(null);
    h.equip.beltPotionSlots = bpSlots;
    // Spočítat kusy pro každý konkrétní potion id přítomný v opasku
    const potCounts = {};
    bpSlots.forEach(potId => {
      if (!potId) return;
      const pot = ITEM_MAP[potId];
      if (!pot) return;
      if (pot.subtype !== 'heal' && pot.subtype !== 'mana') return;
      potCounts[potId] = (potCounts[potId] || 0) + 1;
    });
    // Tlačítka ve fixním pořadí: heal potiony (Light→Godly), pak mana potiony (Light→Godly)
    const order = ['healingPotion','healingPotion2','healingPotion3','healingPotion4','healingPotion5',
      'manaPotion','manaPotion2','manaPotion3','manaPotion4','manaPotion5'];
    const filled = order
      .filter(id => potCounts[id])
      .map(id => {
        const pot = ITEM_MAP[id];
        const count = potCounts[id];
        return `<div class="mb-potion-btn" onclick="game.usePotion('${id}')" title="${pot.name} (${count})">
          ${renderItemIcon(pot, 0)}
          <span class="potion-stack-count">${count}</span>
        </div>`;
      });
    // Vždy renderovat plný počet slotů — chybějící vyplníme prázdnými placeholdery,
    // aby se aréna neposunula, když potiony dojdou (výška řádku zůstává konstantní).
    const slots = getTotalPotionSlots();
    let html = filled.join('');
    for (let i = filled.length; i < slots; i++) {
      html += `<div class="mb-potion-btn empty"></div>`;
    }
    container.innerHTML = html;
  }

  function addPotionToBelt(potionId) {
    const h = state.hero;
    const pot = ITEM_MAP[potionId];
    if (!pot || pot.type !== 'consumable') return false;
    const totalSlots = getTotalPotionSlots();
    if (totalSlots <= 0) return false;
    const bpSlots = h.equip.beltPotionSlots || [];
    while (bpSlots.length < totalSlots) bpSlots.push(null);
    const subtype = pot.subtype;
    // Column-major: projít sloupce 0-3, pro každý řádky 0-beltRows-1
    const beltRows = Math.ceil(totalSlots / 4);
    for (let col = 0; col < 4; col++) {
      // Zkontrolovat kompatibilitu sloupce
      let columnType = null;
      let hasEmpty = false;
      for (let row = 0; row < beltRows; row++) {
        const idx = col * beltRows + row;
        if (idx >= totalSlots) continue;
        const pid = bpSlots[idx];
        if (!pid) { hasEmpty = true; continue; }
        const p = ITEM_MAP[pid];
        if (p) {
          if (!columnType) columnType = p.subtype;
          else if (columnType !== p.subtype) { columnType = 'mixed'; break; }
        }
      }
      if (columnType === 'mixed') continue; // sloupec má oba typy — přeskočit
      if (columnType !== null && columnType !== subtype) continue; // sloupec má jiný typ
      // Najít první prázdný slot v tomto sloupci
      for (let row = 0; row < beltRows; row++) {
        const idx = col * beltRows + row;
        if (!bpSlots[idx]) {
          bpSlots[idx] = potionId;
          h.equip.beltPotionSlots = bpSlots;
          // Vloženo do opasku — aktualizovat status na vítězné obrazovce, pokud je otevřená
          refreshResultStatus();
          return true;
        }
      }
    }
    return false; // není místo v opasku
  }

  function usePotion(potionId) {
    const h = state.hero;
    const bpSlots = h.equip.beltPotionSlots || [];
    // Najít slot s tímto konkrétním potion id
    let potIdx = -1;
    for (let i = 0; i < bpSlots.length; i++) {
      if (bpSlots[i] === potionId) { potIdx = i; break; }
    }
    if (potIdx === -1) return;
    const pot = ITEM_MAP[potionId];
    if (!pot || pot.type !== 'consumable') return;
    playSFX(potionSfx);
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
    } else if (pot.subtype === 'townPortal') {
      // Town portal scroll — teleport to town, save position
      if ((state.townPortalCount || 0) <= 0) return;
      const actId = mb.locId;
      const progress = state.locationProgress[actId] || 0;
      const areaFight = state.areaFightProgress[actId] || 0;
      state.townPortalReturn = { actId, zoneId: progress, areaFight };
      state.townPortalCount = (state.townPortalCount || 0) - 1;
      saveGame();
      showScreen('town');
      renderTown();
      return; // skip potion removal — scroll is consumed
    }
    // Potion zmizí ze slotu
    bpSlots[potIdx] = null;
    h.equip.beltPotionSlots = bpSlots;
    saveGame();
    updateMapBattleUI();
  }

  // Přepočítat status na vítězné (result) obrazovce — zobrazuje HP, many, buffy a potiony.
  // Volá se po použití potionu i po vložení potionu do opasku (aby byl počet aktuální).
  function refreshResultStatus() {
    const h = state.hero;
    const mb = mapBattleState;
    if (!h || !mb || mb.locId === undefined || _currentScreen !== 'result') return;
    // HP/mana/buffy/potiony se zobrazují jako overlay na obrázku zastávky.
    const oh = h;
    const ohpPct = Math.round(oh.hp / oh.maxHp * 100);
    const ohpColor = ohpPct > 50 ? '#e74c3c' : ohpPct > 20 ? '#e67e22' : '#ff4444';
    const oManaHtml = `💧 ${Math.round(state.mana)}/${Math.round(state.maxMana)}`;
    const ovOverlay = document.querySelector('.stop-result-hpbar');
    if (ovOverlay) {
      ovOverlay.innerHTML = `<span style="color:${ohpColor}">❤️ ${oh.hp}/${oh.maxHp} (${ohpPct}%)</span>
        <span style="color:#4a7dff">${oManaHtml}</span>`;
    }
    // Potiony v opasku
    const bpSlots = h.equip.beltPotionSlots || [];
    const potCounts = {};
    bpSlots.forEach(pid => { if (pid) { const p = ITEM_MAP[pid]; if (p && (p.subtype === 'heal' || p.subtype === 'mana')) potCounts[pid] = (potCounts[pid] || 0) + 1; } });
    const potTile = (id) => {
      const p = ITEM_MAP[id];
      return `<div class="result-status-potion" onclick="game.usePotionFromResult('${id}')" title="${p.name} (${potCounts[id]})">
        ${renderItemIcon(p, 0)}
        <span class="result-status-potion-count">${potCounts[id]}</span>
      </div>`;
    };
    const healOrder = ['healingPotion5','healingPotion4','healingPotion3','healingPotion2','healingPotion'];
    const manaOrder = ['manaPotion5','manaPotion4','manaPotion3','manaPotion2','manaPotion'];
    const ovHeal = document.querySelector('.stop-result-potions-heal');
    if (ovHeal) {
      ovHeal.innerHTML = healOrder.filter(id => potCounts[id]).map(id => potTile(id)).join('');
      if (!ovHeal.innerHTML) ovHeal.remove();
    }
    const ovMana = document.querySelector('.stop-result-potions-mana');
    if (ovMana) {
      ovMana.innerHTML = manaOrder.filter(id => potCounts[id]).map(id => potTile(id)).join('');
      if (!ovMana.innerHTML) ovMana.remove();
    }
  }

  function usePotionFromResult(potionId) {
    const h = state.hero;
    const bpSlots = h.equip.beltPotionSlots || [];
    let potIdx = -1;
    for (let i = 0; i < bpSlots.length; i++) {
      if (bpSlots[i] === potionId) { potIdx = i; break; }
    }
    if (potIdx === -1) return;
    const pot = ITEM_MAP[potionId];
    if (!pot || pot.type !== 'consumable') return;
    playSFX(potionSfx);
    if (pot.subtype === 'heal') {
      h.hp = Math.min(h.maxHp, h.hp + pot.effectValue);
      showMessage(`❤️ +${pot.effectValue} HP`);
    } else if (pot.subtype === 'mana') {
      const cls = CLASSES[state.heroClass];
      if (cls && cls.resource === 'mana') {
        state.mana = Math.min(state.maxMana || 100, (state.mana || 0) + pot.effectValue);
      }
      showMessage(`💧 +${pot.effectValue} many`);
    }
    bpSlots[potIdx] = null;
    h.equip.beltPotionSlots = bpSlots;
    saveGame();
    // Překreslit status na Victory page
    refreshResultStatus();
  }

  function updateSpellButtons() {
    // Class spells — jen investovaná kouzla
    renderClassSpells();
  }

  function updateActionButtons() {
    // V auto-combatu není potřeba — dodge tlačítko odstraněno
  }

  // ===== RESOURCE BARS (mana, combo) =====
  function updateResourceBars() {
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
    // Mana bar (všechny classy — D2 styl)
    const manaBar = $('mbPlayerArenaMana');
    if (manaBar) {
      manaBar.classList.remove('hidden');
      const span = manaBar.querySelector('span');
      if (span) span.textContent = `${Math.round(state.mana || 0)}/${state.maxMana || 100}`;
      const fill = $('mbPlayerArenaManaFill');
      if (fill) fill.style.width = Math.max(0, Math.round(((state.mana || 0) / (state.maxMana || 100)) * 100)) + '%';
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
      const resourceKey = 'mana';
      const maxResource = state.maxMana || 100;
      const spellCost = getSpellCost(spell.id, spell.cost);
      const hasResource = (state[resourceKey] || 0) >= spellCost;
      const onCooldown = _sessionSpellCooldowns[spell.id] > 0;
      const cdRemaining = onCooldown ? Math.ceil(_sessionSpellCooldowns[spell.id] / 60) : 0;
      const canUse = hasResource && !onGcd && !onCooldown;
      // Kouzla vyžadující combo pointy — bez nich nerozsvítit
      const hasCombo = (state.comboPoints || 0) > 0;
      const needsCombo = spell.needsCombo === true;
      const mb2 = mapBattleState;
      const hasPoison = mb2 && mb2.enemyDot > 0 && mb2.enemyDotTicksLeft > 0;
      const needsPoison = spell.needsPoison === true;
      // Kouzla vyžadující štít — bez něj nerozsvítit
      const needsShield = spell.needsShield === true;
      const hasShield = needsShield && (() => { const sh = ITEM_MAP[state.hero.equip.shield]; return sh && sh.type === 'shield'; })();
      const canUseFinal = canUse && (!needsCombo || hasCombo) && (!needsPoison || hasPoison) && (!needsShield || hasShield);
      const isQueued = spell.id === 'heroicStrike' && mapBattleState && mapBattleState._heroicStrikeQueued;
      const gcdActive = onGcd && !onCooldown && !isQueued;
      const gcdPct = onGcd ? Math.min(1, state._gcdTimer / 30) : 0;
      const gcdDeg = Math.round(gcdPct * 360);
      let btnClass = 'arena-class-spell-btn';
      if (canUseFinal) btnClass += ' active';
      if (isQueued) btnClass += ' queued';
      // Double Swing podporuje hold-to-repeat (držení = opakování, dokud je mana)
      const holdAttr = spell.id === 'doubleSwing' ? ` data-hold="${spell.id}"` : '';
      html += `<button class="${btnClass}"${holdAttr} onclick="game.castClassSpell('${spell.id}')" title="${spell.desc}">
        <img class="spell-icon-img" src="assets/spells/${spell.iconImg || spell.id + '.png'}" alt="${spell.name}">
        <span class="spell-cost">${spellCost > 0 ? spellCost : ''}</span>
        ${onCooldown ? `<span class="spell-cd-num">${cdRemaining}</span>` : ''}
        ${gcdActive ? `<div class="spell-gcd-overlay" style="background:conic-gradient(rgba(0,0,0,0.6) 0deg, rgba(0,0,0,0.6) ${gcdDeg}deg, transparent ${gcdDeg}deg, transparent 360deg)"></div>` : ''}
      </button>`;
    });
    container.innerHTML = html;
    // Hold-to-repeat: delegované pointerdown/up na container (přidá se jen jednou)
    if (!container._holdBound) {
      container._holdBound = true;
      container.addEventListener('pointerdown', (e) => {
        const btn = e.target.closest('[data-hold]');
        if (!btn) return;
        const spellId = btn.getAttribute('data-hold');
        e.preventDefault();
        // První provedení hned, pak opakovat dokud držíš a máš manu
        if (game.castClassSpell(spellId)) {
          startHoldRepeat(spellId);
        }
      });
      container.addEventListener('pointerup', stopHoldRepeat);
      container.addEventListener('pointercancel', stopHoldRepeat);
      container.addEventListener('pointerleave', stopHoldRepeat);
      // Zabránit kontextové nabídce prohlížeče při držení (dlouhý stisk / pravý klik)
      container.addEventListener('contextmenu', (e) => {
        if (e.target.closest('[data-hold]')) e.preventDefault();
      });
    }
  }

  // ===== HOLD-TO-REPEAT (Double Swing) =====
  // Držení tlačítka = opakované provedení, dokud hráč drží a má manu.
  // Pustíš nebo dojde mana → zastaví se a rozjede se normální střídání.
  let _holdRepeatTimer = null;
  let _holdRepeatSpell = null;
  function startHoldRepeat(spellId) {
    stopHoldRepeat();
    _holdRepeatSpell = spellId;
    const tick = () => {
      if (!_holdRepeatSpell) return;
      const mb = mapBattleState;
      if (!mb || mb.ended) { stopHoldRepeat(); return; }
      // Zkusit provést. Pokud selže kvůli cooldownu, počkat a zkusit znovu (držíš dál).
      // Pokud selže kvůli maně, zastavit.
      const ok = game.castClassSpell(_holdRepeatSpell);
      if (!ok) {
        const spell = (CLASSES[state.heroClass] || {}).spells.find(s => s.id === _holdRepeatSpell);
        const cost = spell ? getSpellCost(_holdRepeatSpell, spell.cost) : 0;
        if ((state.mana || 0) < cost) { stopHoldRepeat(); return; } // došla mana
        // jinak cooldown — počkat a zkusit znovu
        _holdRepeatTimer = setTimeout(tick, 50);
        return;
      }
      // Double swing se opakuje na rychlosti pomalejší zbraně (cooldown)
      const interval = getEffSwingMs(mb, Math.max(mb.playerSwingMs, mb.offhandSwingMs)) || 1000;
      _holdRepeatTimer = setTimeout(tick, interval);
    };
    _holdRepeatTimer = setTimeout(tick, 50);
  }
  function stopHoldRepeat() {
    if (_holdRepeatTimer) { clearTimeout(_holdRepeatTimer); _holdRepeatTimer = null; }
    _holdRepeatSpell = null;
  }

  function renderDebuffs() {
    const container = document.getElementById('mbDebuffs');
    if (!container) return;
    // Jeden sloupec: prvně enemy buffy, pak enemy debuffy (řazeno shora)
    let html = '';
    const ebKeys = Object.keys(_enemyBuffs);
    ebKeys.forEach(spellId => {
      const b = _enemyBuffs[spellId];
      if (!b) return;
      const remaining = Math.ceil(b.ticks / 60);
      const spellDef = ENEMY_SPELLS[spellId];
      const hasImg = spellDef && spellDef.iconImg;
      html += `<div class="debuff-icon enemy-buff" title="${b.name || spellId}">
        ${hasImg ? `<img class="buff-icon-img" src="assets/spells/${spellDef.iconImg}" alt="${b.name}">` : `<span class="debuff-icon-emoji">${b.icon || '📈'}</span>`}
        <span class="debuff-icon-timer">${remaining}s</span>
      </div>`;
    });
    const debuffKeys = Object.keys(_sessionDebuffs);
    debuffKeys.forEach(spellId => {
      const d = _sessionDebuffs[spellId];
      if (!d) return;
      const remaining = Math.ceil(d.ticks / 60);
      const spellDef = ENEMY_SPELLS[spellId];
      const hasImg = (spellDef && spellDef.iconImg) || d.iconImg;
      const imgSrc = (spellDef && spellDef.iconImg) || d.iconImg;
      html += `<div class="debuff-icon" title="${d.name || spellId}">
        ${hasImg ? `<img class="buff-icon-img" src="assets/spells/${imgSrc}" alt="${d.name}">` : `<span class="debuff-icon-emoji">${d.icon}</span>`}
        <span class="debuff-icon-timer">${remaining}s</span>
      </div>`;
    });
    container.innerHTML = html;
    // Starý samostatný enemy-buff sloup je prázdný (sloučeno do mbDebuffs)
    const enemyBuffContainer = document.getElementById('mbEnemyBuffs');
    if (enemyBuffContainer) enemyBuffContainer.innerHTML = '';
  }

  function renderBuffs() {
    const container = document.getElementById('mbBuffs');
    if (!container) return;
    // Jeden sloupec, sloupce roste od spodní hrany (column-reverse → poslední DOM = nahoře).
    // Aby buffy byly NAHOŘE a debuffy POD nimi, renderujeme debuffy první (dolní), buffy poslední (horní).
    let html = '';
    const pdKeys = Object.keys(_playerDebuffs);
    pdKeys.forEach(spellId => {
      const d = _playerDebuffs[spellId];
      if (!d) return;
      const remaining = Math.ceil(d.ticks / 60);
      const hasImg = d.iconImg;
      html += `<div class="buff-icon player-debuff" title="${d.name || spellId}">
        ${hasImg ? `<img class="buff-icon-img" src="assets/spells/${d.iconImg}" alt="${d.name}">` : `<span class="buff-icon-emoji">${d.icon || '☠️'}</span>`}
        <span class="buff-icon-timer">${remaining}s</span>
      </div>`;
    });
    const buffKeys = Object.keys(_sessionBuffs);
    buffKeys.forEach(spellId => {
      const b = _sessionBuffs[spellId];
      if (!b) return;
      const remaining = Math.ceil(b.ticks / 60);
      const hasImg = b.iconImg;
      html += `<div class="buff-icon" title="${b.name || spellId}">
        ${hasImg ? `<img class="buff-icon-img" src="assets/spells/${b.iconImg}" alt="${b.name}">` : `<span class="buff-icon-emoji">${b.icon}</span>`}
        <span class="buff-icon-timer">${remaining}s</span>
      </div>`;
    });
    container.innerHTML = html;
    // Starý samostatný player-debuff sloup je prázdný (sloučeno do mbBuffs)
    const playerDebuffContainer = document.getElementById('mbPlayerDebuffs');
    if (playerDebuffContainer) playerDebuffContainer.innerHTML = '';
  }

  function castClassSpell(spellId) {
    const cls = CLASSES[state.heroClass];
    if (!cls) return false;
    const spell = cls.spells.find(s => s.id === spellId);
    if (!spell) return false;
    const mb = mapBattleState;
    if (!mb || mb.ended) return false;

    // GCD check
    if (state._gcdTimer > 0) return false;
    // Už kouzlíš — blokovat nové kouzlo
    if (mb._playerCasting) return false;
    // Resource check (mana — všechny classy, D2 styl)
    const resourceKey = 'mana';
    const spellCost = getSpellCost(spellId, spell.cost);
    if ((state[resourceKey] || 0) < spellCost) return false;
    // Per-spell cooldown check
    if (_sessionSpellCooldowns[spellId] > 0) return false;

    // Kouzla vyžadující štít
    if (spell.needsShield) {
      const shield = ITEM_MAP[state.hero.equip.shield];
      if (!shield || shield.type !== 'shield') { showMessage('🛡️ Potřebuješ štít!'); return false; }
    }
    // Spell Reflect — jen když nepřítel aktivně castí
    if (spellId === 'spellReflect' && !(mb._enemyCasting && mb._enemyCastSpell)) {
      showMessage('🪞 Nepřítel nekouzlí!');
      return false;
    }

    // Odečíst resource
    state[resourceKey] = Math.max(0, (state[resourceKey] || 0) - spellCost);
    // Nastavit GCD (0.5s = ~30 ticků při 60fps)
    state._gcdTimer = Math.round(spell.gcd * 60);
    // Nastavit per-spell cooldown (session persistent)
    if (spell.cooldown > 0) {
      // Pummel a Spell Reflect — CD klesá s levelem talentu: lvl1=8s, každý level -1s (lvl5=4s)
      let cd = spell.cooldown;
      if (spellId === 'pummel' || spellId === 'spellReflect') {
        const lv = getSpellLv(spellId);
        cd = Math.max(4, 8 - (lv - 1));
      }
      _sessionSpellCooldowns[spellId] = Math.round(cd * 60);
    }

    // Pokud má kouzlo castTime, začít castovat (jako WoW TBC)
    if (spell.castTime && spell.castTime > 0) {
      mb._playerCasting = true;
      mb._playerCastStart = performance.now();
      mb._playerCastTime = spell.castTime * 1000; // převod s → ms
      mb._playerCastSpell = spellId;
      // Resetovat swing timer — cast ho nahrazuje
      mb._playerSwingStart = performance.now();
      mb._playerSwingReady = false;
      mb._playerAttackProcessed = false;
      updateMapBattleUI();
      return;
    }

    // Efekty kouzel
    if (spellId === 'heroicStrike') {
      mb._heroicStrikeQueued = true;
    } else if (spellId === 'thunderClap') {
      // Damage podle levelu talentu
      const lv = getSpellLv(spellId);
      const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
      const eqAttrs = getEquipAttrs();
      const strBonus = (state.hero.attrStr||0) + eqAttrs.str;
      const weaponDmg = getWeaponDmg(weapon);
      const pctDmg = 0.5 + lv * 0.3;
      const baseDmg = Math.round(weaponDmg * pctDmg) + Math.floor(strBonus * 0.5);
      let finalDmg = Math.max(1, baseDmg);
      const eqItems = [weapon, ITEM_MAP[state.hero.equip.ring1], ITEM_MAP[state.hero.equip.ring2], ITEM_MAP[state.hero.equip.amulet]].filter(Boolean);
      const totalSkillDmg = eqItems.reduce((sum, it) => sum + (it.skillDmg || 0), 0);
      if (totalSkillDmg > 0) {
        finalDmg = Math.max(1, Math.round(finalDmg * (1 + totalSkillDmg / 100)));
      }
      mb.bossHp -= finalDmg;
      // Slow: 20% for 1+lv seconds
      const slowPct = 20;
      const slowDuration = 1 + lv;
      const slowTicks = Math.round(slowDuration * 60);
      mb._enemySlowPct = slowPct;
      mb._enemySlowTimer = slowTicks;
      mb._enemySlowMax = slowTicks;
      // Přepočítat enemy swing timer se zpomalením — zachovat % průběh
      const now = performance.now();
      const oldMs = mb.enemySwingMs;
      const elapsed = now - mb._enemySwingStart;
      const progress = Math.min(elapsed / oldMs, 1);
      mb.enemySwingMs = getEnemySwingTime(mb);
      mb._enemySwingStart = now - progress * mb.enemySwingMs;
      _sessionDebuffs['thunderClap'] = { icon: '🌊', name: `Thunder Clap (slow ${slowPct}%)`, ticks: slowTicks, maxTicks: slowTicks };
      spawnThunderClapAnim(mb);
      playSFX(thunderClapSfx);
      spawnFloatingText(`🌊 -${finalDmg}`, 'right', '#f39c12', 32, 2000, 'assets/spells/thunderClap.png');
    } else if (spellId === 'thunderBolt') {
      const lv = getSpellLv('thunderBolt');
      const pct = 80 + lv * 20; // 100% @ lv1, 120% @ lv2, ... 180% @ lv5
      const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
      const eqAttrs = getEquipAttrs();
      const baseDmg = 10 + Math.floor(state.hero.level * 3) + getWeaponDmg(weapon) + ((state.hero.attrStr||0) + eqAttrs.str) * 2;
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
      // Animace
      spawnThunderBoltAnim(mb);
      playSFX(thunderBoltSfx);
      // Projektil
      spawnProjectileEffect(null, false, false, ATTACK_TYPES.CASTER);
      spawnFloatingText(`⚡ -${dmg}`, 'right', '#f1c40f', 32, 2000, 'assets/spells/thunderBolt.png');
    } else if (spellId === 'shieldSlam') {
      // Shield Slam — pouze se štítem; poškození + dočasný slow nepřítele
      const shield = ITEM_MAP[state.hero.equip.shield];
      if (!shield || shield.type !== 'shield') {
        showMessage('🛡️ Potřebuješ štít!');
        return;
      }
      const lv = getSpellLv('shieldSlam');
      const pct = 60 + lv * 20; // 80% @ lv1 ... 160% @ lv5
      // Shield Slam — poškození založené NA ŠTÍTU (jako D2 smite u paladinů), ne na zbrani/síle.
      // Štíty mají vlastní baseDmgMin/baseDmgMax specifické pro toto kouzlo.
      const sMin = shield.baseDmgMin || 1;
      const sMax = shield.baseDmgMax || 2;
      const shieldDmg = sMin + Math.random() * (sMax - sMin);
      const dmg = Math.max(1, Math.round(shieldDmg * pct / 100));
      mb.bossHp -= dmg;
      // Slow nepřítele: 20%+5%*lv na 2s+floor(lv/2)s
      const slowPct = 15 + lv * 5;
      const slowTicks = Math.round((2 + Math.floor(lv / 2)) * 60);
      mb._enemySlowPct = slowPct;
      mb._enemySlowTimer = slowTicks;
      mb._enemySlowMax = slowTicks;
      _sessionDebuffs['shieldSlam'] = { icon: '🛡️', name: `Shield Slam (slow ${slowPct}%)`, ticks: slowTicks, maxTicks: slowTicks };
      // Animace
      spawnShieldBashAnim(mb);
      // Projektil
      spawnProjectileEffect(null, false, false, ATTACK_TYPES.MELEE);
      spawnFloatingText(`🛡️ -${dmg}`, 'right', '#f1c40f', 32, 2000, 'assets/spells/shield_bash.png');
    } else if (spellId === 'pummel') {
      // Pummel — interrupt + blok recast; bez požadavku na štít
      const lv = getSpellLv('pummel');
      const blockTicks = (2 + lv) * 60; // 2+lv sekund bez recastu
      // Interrupt — přeruší castování nepřítele
      if (mb._enemyCasting) {
        mb._enemyCasting = false;
        mb._enemyCastSpell = null;
        mb._enemySwingStart = performance.now();
        mb._enemySwingReady = false;
        mb._enemySwingPct = 0;
        playSFX(dodgeSfx);
        spawnFloatingText('👊 Interrupt!', 'right', '#e67e22', 32);
      }
      // Blok recastu — nepřítel nemůže znovu začít castit
      mb._enemyCastBlockedUntil = performance.now() + blockTicks * (1000/60);
      mb._enemyCastBlockedTicks = blockTicks;
      _sessionDebuffs['pummel'] = { icon: '👊', name: `Pummel (recast block ${2+lv}s)`, ticks: blockTicks, maxTicks: blockTicks };
      // Animace — zatřást nepřítelem (fyzický úder), místo projektilu
      const fig = $('mbFigure');
      if (fig) {
        fig.classList.remove('figure-shake');
        void fig.offsetWidth; // restart animace
        fig.classList.add('figure-shake');
      }
      spawnFloatingText('👊', 'right', '#e67e22', 40, 800, 'assets/spells/pummel.png');
    } else if (spellId === 'spellReflect') {
      // Spell Reflect — pouze se štítem; odrazí ofensivní kouzlo zpět na nepřítele
      const shield = ITEM_MAP[state.hero.equip.shield];
      if (!shield || shield.type !== 'shield') {
        showMessage('🛡️ Potřebuješ štít!');
        return;
      }
      const lv = getSpellLv('spellReflect');
      const reflectPct = 10 * lv; // 10% @ lv1 ... 50% @ lv5
      if (mb._enemyCasting && mb._enemyCastSpell) {
        // Aktivní cast — zrušit a odrazit zpět
        const spellId2 = mb._enemyCastSpell;
        const spellDef = ENEMY_SPELLS[spellId2];
        const offensive = spellDef && !OFFENSIVE_EXEMPT.includes(spellId2);
        mb._enemyCasting = false;
        mb._enemyCastSpell = null;
        mb._enemySwingStart = performance.now();
        mb._enemySwingReady = false;
        mb._enemySwingPct = 0;
        if (offensive) {
          const diffMultOverall = DIFFICULTIES[state.difficulty] ? DIFFICULTIES[state.difficulty].mult : 1.0;
          const reflectDmg = Math.max(1, Math.round((mb.monsterDmgMin + Math.random() * (mb.monsterDmgMax - mb.monsterDmgMin)) * diffMultOverall * 0.8 * (mb.isBoss ? 1.0 : getZoneMult(mb.progress, state.difficulty)) * 0.7 * (reflectPct/100)));
          mb.bossHp -= reflectDmg;
          spawnFloatingText(`🪞 -${reflectDmg}`, 'right', '#e74c3c', 32, 2000, 'assets/spells/spellReflect.png');
        } else {
          spawnFloatingText('🪞 Reflected!', 'right', '#e67e22', 32, false, 'assets/spells/spellReflect.png');
        }
        playSFX(shoutSfx);
        spawnShoutRings(mb, '#a64dff', 'rgba(166,77,255,0.5)');
      } else {
        showMessage('🪞 Nepřítel nekouzlí!');
        return;
      }
    } else if (spellId === 'battleShout') {
      // +5+lv*5% dmg na 60s (dle talentu)
      const lv = getSpellLv('battleShout');
      const dmgPct = 5 + lv * 5;
      state.battleShoutDmgPct = dmgPct;
      state.battleShoutTimer = 1800; // 30s
      playSFX(shoutSfx);
      _sessionBuffs['battleShout'] = { icon: '📯', name: 'Battle Shout', iconImg:'battleShout.png', ticks: 1800, maxTicks: 1800, onExpire: function() { state.battleShoutDmgPct = 0; } };
      console.log('BATTLE SHOUT: dmgPct=' + dmgPct + ' timer=' + state.battleShoutTimer + ' buffs keys=' + Object.keys(_sessionBuffs).join(','));
      // Vykreslit buff HNED
      renderBuffs();
      // Animace
      spawnShoutRings(mb, '#e74c3c', 'rgba(231,76,60,0.6)');
      spawnFloatingText(`📯 +${dmgPct}% dmg`, 'left', '#f39c12', 32, 2000, 'assets/spells/battleShout.png');
    } else if (spellId === 'defensiveShout') {
      const lv = getSpellLv('defensiveShout');
      const armorPct = [50, 75, 100, 125, 150][Math.min(lv - 1, 4)];
      state.defensiveShoutArmorPct = armorPct;
      state.defensiveShoutTimer = 1800; // 30s
      playSFX(shoutSfx);
      _sessionBuffs['defensiveShout'] = { icon: '🛡️', name: 'Defensive Shout', iconImg:'defensiveShout.png', ticks: 1800, maxTicks: 1800, onExpire: function() { state.defensiveShoutArmorPct = 0; } };
      renderBuffs();
      // Animace
      spawnShoutRings(mb, '#5dade2', 'rgba(93,173,226,0.6)');
    } else if (spellId === 'skillShout') {
      const lv = getSpellLv('skillShout');
      state.skillShoutBonus = lv;
      state.skillShoutTimer = 1800; // 30s
      playSFX(shoutSfx);
      _sessionBuffs['skillShout'] = { icon: '📣', name: 'Skill Shout', iconImg:'skillShout.png', ticks: 1800, maxTicks: 1800, onExpire: function() { state.skillShoutBonus = 0; } };
    } else if (spellId === 'doubleSwing') {
      // Double Swing — zásah oběma zbraněmi zaráz
      // LvL: dmg bonus = 25*lv %, hit rating bonus = 10*lv %
      const lv = getSpellLv('doubleSwing');
      const dmgBonus = 25 * lv;   // lv1=25%, lv2=50%, lv3=75%, lv4=100%, lv5=125%
      const arBonus = 10 * lv;    // lv1=10%, lv2=20%, lv3=30%, lv4=40%, lv5=50%
      const offhandWeapon = (mb._isDualWield && state.hero.equip.shield && ITEM_MAP[state.hero.equip.shield]?.weaponType) ? ITEM_MAP[state.hero.equip.shield] : null;
      if (!offhandWeapon) {
        showMessage('⚔️ Potřebuješ dvě zbraně!');
        return;
      }
      // Cooldown = rychlost pomalejší zbraně — zabrání spamu, respektuje rychlosti zbraní
      if (mb._doubleSwingCd > 0) return;
      const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
      // Hit check s bonusem k Attack Ratingu
      const at = getPlayerAttackTable(mb, 1 + arBonus / 100);
      const roll = Math.random() * 100;
      if (roll >= at.hitChance) {
        // MISS
        spawnFloatingText('MISS!', 'right', '#fff', 32);
        playSFX(dodgeSfx);
        resetDoubleSwingTimers(mb);
        mb._doubleSwingCd = getEffSwingMs(mb, Math.max(mb.playerSwingMs, mb.offhandSwingMs));
        mb._lastDsTick = performance.now();
        return;
      }
      const eqAttrs = getEquipAttrs();
      const baseDmg = mb.baseDmg || (2 + Math.floor(state.hero.level * 0.8) + ((state.hero.attrStr||0) + eqAttrs.str)*0.3);
      const dmgMult = 1 + dmgBonus / 100;
      const mainDmg = Math.max(1, Math.round((baseDmg + getWeaponDmg(weapon)) * dmgMult * getShieldSpecDmgMult()));
      const offDmg = Math.max(1, Math.round((baseDmg + getWeaponDmg(offhandWeapon)) * dmgMult));
      const totalDmg = mainDmg + offDmg;
      mb.bossHp -= totalDmg;
      playSFX(getHitSfx());
      // Reset obou swing timerů
      resetDoubleSwingTimers(mb);
      // Cooldown = rychlost pomalejší zbraně (respektuje rychlosti zbraní)
      mb._doubleSwingCd = getEffSwingMs(mb, Math.max(mb.playerSwingMs, mb.offhandSwingMs));
      mb._lastDsTick = performance.now();
      // Animace — obě zbraně zároveň, bez projectile
      spawnDoubleSwingAnim(mb);
      spawnFloatingText(`⚔️ -${totalDmg}`, 'right', '#f1c40f', 32, 2000, 'assets/spells/doubleSwing.png');
      // Pokud smrtelná rána, ukončit boj hned
      if (mb.bossHp <= 0) { endMapBattle(true); return; }
    } else if (spellId === 'sinisterStrike') {
      // 150% dmg + 1 combo point
      const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
      const eqAttrs = getEquipAttrs();
      const baseDmg = 10 + Math.floor(state.hero.level * 3) + getWeaponDmg(weapon) + ((state.hero.attrStr||0) + eqAttrs.str) * 2;
      const dmg = Math.max(1, Math.round(baseDmg * 1.5));
      mb.bossHp -= dmg;
      state.comboPoints = Math.min(5, (state.comboPoints || 0) + 1);
      // Canvas melee impact
      spawnMeleeImpact(mb, false, getWeaponType(), 0, getWeaponElementColor(weapon));
      spawnFloatingText(`🗡️ -${dmg}`, 'right', '#f1c40f', 32, 2000, 'assets/spells/shadowStrike.png');
    } else if (spellId === 'eviscerate') {
      const cp = state.comboPoints || 0;
      if (cp < 1) return; // nelze použít bez combo pointů
      const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
      const eqAttrs = getEquipAttrs();
      const baseDmg = 10 + Math.floor(state.hero.level * 3) + getWeaponDmg(weapon) + ((state.hero.attrStr||0) + eqAttrs.str) * 2;
      const mults = [0, 1.5, 2.0, 2.5, 3.0, 3.5];
      const mult = mults[Math.min(cp, 5)] || 1.5;
      const dmg = Math.max(1, Math.round(baseDmg * mult));
      mb.bossHp -= dmg;
      state.comboPoints = 0; // spotřebovat combo pointy
      // Canvas melee impact
      spawnMeleeImpact(mb, false, getWeaponType(), 0, getWeaponElementColor(weapon));
      spawnFloatingText(`💥 -${dmg}`, 'right', '#f1c40f', 32);
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
      spawnFloatingText(`🔨 Stun ${stunDuration}s`, 'right', '#f1c40f', 32);
    } else if (spellId === 'evasion') {
      // +50% dodge na 10s
      state._dodgeBuffTimer = 600; // 10s * 60fps
      _sessionBuffs['evasion'] = { icon: '💨', name: 'Evasion', iconImg:'evasion.png', ticks: 600, maxTicks: 600, onExpire: function() { /* timer už je v state._dodgeBuffTimer */ } };
      spawnFloatingText('💨 Evasion!', 'left', '#f1c40f', 32);
    } else if (spellId === 'speedBoost') {
      const cp = state.comboPoints || 0;
      if (cp < 1) return; // nelze použít bez combo pointů
      const durations = [0, 5, 8, 11, 14, 17];
      const duration = durations[Math.min(cp, 5)] || 5;
      state._speedBoostPct = 20; // +20% rychlost
      state._speedBoostTimer = duration * 60; // v tickách
      state.comboPoints = 0; // spotřebovat combo pointy
      // Buff ikona
      _sessionBuffs['speedBoost'] = { icon: '⚡', name: 'Speed Boost', iconImg:'speedBoost.png', ticks: duration * 60, maxTicks: duration * 60, onExpire: function() { state._speedBoostPct = 0; } };
      // Přepočítat swing timer (jeden sdílený, průměr × 0.85 D2 bonus)
      const cls2 = CLASSES[state.heroClass];
      const dw2 = cls2 && cls2.dualWield;
      const m2 = getSwingTime(state.hero.equip.weapon);
      const o2 = (dw2 && state.hero.equip.shield && ITEM_MAP[state.hero.equip.shield]?.weaponType) ? getSwingTime(state.hero.equip.shield) : 0;
      const avg2 = o2 > 0 ? Math.round((m2 + o2) / 2 * 0.85) : m2;
      mb.playerSwingMs = avg2;
      mb.offhandSwingMs = 0;
      spawnFloatingText(`⚡ Speed +${duration}s`, 'left', '#f1c40f', 32);
    } else if (spellId === 'poisonExplosion') {
      const cp = state.comboPoints || 0;
      if (cp < 1) return;
      const mb2 = mapBattleState;
      if (!mb2 || mb2.ended) return;
      // Potřebujeme aktivní poison debuff na nepříteli
      if (mb2.enemyDot <= 0 || mb2.enemyDotTicksLeft <= 0) {
        showMessage('☠️ No poison on enemy!');
        return;
      }
      const lv = getSpellLv('poisonExplosion');
      if (lv < 1) return;
      const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
      // Multipliers podle levelu a combo pointů
      const baseMult = 1.1 + (lv - 1) * 0.2; // 1.1 @ lv1, 1.3 @ lv2, ... 1.9 @ lv5
      const cpMult = 0.4; // +0.4 per combo point (1cp=+0.0, 2cp=+0.1, ... 5cp=+0.4)
      const mult = baseMult + (cp - 1) * cpMult;
      // Damage = poison base dmg * mult
      const poisonBase = mb2.enemyPoisonBaseDmg || 15;
      const dmg = Math.max(1, Math.round(poisonBase * mult));
      mb2.bossHp -= dmg;
      // Smazat poison debuff
      mb2.enemyDot = 0;
      mb2.enemyDotTicksLeft = 0;
      mb2.enemyPoisonBaseDmg = 0;
      delete _sessionDebuffs['weapon_poison'];
      delete _sessionDebuffs['poisonedWeapon_poison'];
      state.comboPoints = 0;
      // Zelená exploze
      spawnMeleeImpact(mb2, false, getWeaponType(), 0, getWeaponElementColor(weapon));
      spawnFloatingText(`💥 -${dmg}`, 'right', '#2ecc71', 36);
      playSFX(lightningSpellSfx2);
    } else if (spellId === 'comboAttack') {
      startComboAttack(mb);
    }

    updateMapBattleUI();
    saveGame();
    return true;
  }

  // ===== COMBO ATTACK (barbar) =====
  // Hra se pozastaví, hráč mačká PS tlačítka (✕◯□△) v zobrazeném pořadí (každý úder = 1 hit).
  // Po úspěšném úderu combo pokračuje dalším; chyba combo přeruší a hra jede dál.
  // Po skončení comba (úspěšně i neúspěšně) se hráčovy swing timery resetují od znovu.
  function startComboAttack(mb) {
    if (mb.ended) return;
    const lv = getSpellLv('comboAttack');
    const strikeCount = 3 + Math.min(Math.max(lv, 1), 5); // 3+lv úderů (3..8)
    // Sekvence náhodných PS tlačítek
    const psKeys = ['tri','circle','cross','square'];
    mb._comboDirs = [];
    for (let i = 0; i < strikeCount; i++) mb._comboDirs.push(psKeys[Math.floor(Math.random() * 4)]);
    mb._comboIdx = 0;
    mb._comboActive = true;
    // Zrušit probíhající opportunity (block/dodge) — combo ji přebíjí
    mb._oppType = null;
    mb._oppResolved = false;
    mb._oppFailed = false;
    hideOpportunityArrow(mb);
    // Zrušit probíhající cast hráče
    if (mb._playerCasting) { mb._playerCasting = false; mb._playerCastSpell = null; }
    // Zobrazit combo tlačítka
    const comboBtns = $('mbPsComboBtns');
    if (comboBtns) comboBtns.classList.remove('hidden');
    showComboPrompt(mb);
  }

  // Zvýrazní aktuální PS tlačítko combo úderu a ukáže číslo úderu.
  function showComboPrompt(mb) {
    clearComboHighlights();
    if (!mb._comboActive || mb._comboIdx >= mb._comboDirs.length) return;
    const key = mb._comboDirs[mb._comboIdx];
    const btn = document.querySelector(`.ps-btn[data-ps="${key}"]`);
    if (btn) btn.classList.add('highlight');
    // Indikátor počtu úderů uprostřed
    const info = $('mbActionInfo');
    if (info) {
      info.classList.remove('hidden');
      info.textContent = `Combo ${mb._comboIdx + 1}/${mb._comboDirs.length}`;
    }
  }

  function clearComboHighlights() {
    document.querySelectorAll('.ps-btn').forEach(b => b.classList.remove('highlight'));
  }

  // Zpracuje stisk PS tlačítka během combo sekvence. Správné = úder, špatné = combo přeruší.
  function handleComboButton(mb, key) {
    if (!mb._comboActive) return false;
    if (key !== mb._comboDirs[mb._comboIdx]) {
      // Chyba — combo přerušeno, hra pokračuje normálně
      showComboFail(mb);
      endCombo(mb, false);
      return true;
    }
    // Správný úder — damage
    mb._comboIdx++;
    dealComboStrike(mb);
    if (mb._comboIdx >= mb._comboDirs.length || mb.bossHp <= 0 || mb.ended) {
      // Combo dokončeno (nebo nepřítel mrtev) — ukončit, resetovat swing timery
      endCombo(mb, true);
    } else {
      showComboPrompt(mb);
    }
    return true;
  }

  // Jeden úder comba — damage jako normální melee útok.
  function dealComboStrike(mb) {
    if (mb.bossHp <= 0) return;
    const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
    const spec = getWeaponSpecBonus(weapon);
    // Attack table — MISS/evasion/block pro combo údery
    const at = getPlayerAttackTable(mb, spec.arMult);
    const roll = Math.random() * 100;
    if (roll >= at.hitChance) { spawnFloatingText('MISS!', 'right', '#fff', 32); return; }
    if (mb._evasionActive && Math.random() < 0.3) { spawnFloatingText('💨 Evasion!', 'right', '#f1c40f', 32); return; }
    if (mb.monsterBlockChance > 0 && Math.random() * 100 < mb.monsterBlockChance) { spawnFloatingText('🛡️ Block!', 'right', '#3498db', 28); return; }
    const eqAttrs = getEquipAttrs();
    let baseDmg = mb.baseDmg || (2 + Math.floor(state.hero.level * 0.8) + getWeaponDmg(weapon) + ((state.hero.attrStr||0) + eqAttrs.str)*0.3);
    let dmg = Math.round(baseDmg * spec.dmgMult * getShieldSpecDmgMult());
    dmg = Math.max(1, Math.round(dmg * (0.75 + Math.random() * 0.5))); // rozptyl ±25%
    mb.bossHp -= dmg;
    spawnFloatingText(`-${dmg}`, 'right', '#fff', 32, 2000, (weapon.iconImg ? weapon.iconImg : null));
    // Melee impact animace
    spawnMeleeImpact(mb, false, getWeaponType(), 0, getWeaponElementColor(weapon));
    playSFX(getHitSfx());
    if (mb.bossHp <= 0) { endMapBattle(true); return; }
  }

  // Okamžitá zpětná vazba pro správný úder — fajfka.
  function showComboSuccess(mb) {
    const arrow = $('mbArrow');
    if (arrow) {
      arrow.setAttribute('class', 'boss-attack-arrow dodge-success');
      arrow.setAttribute('viewBox', '-3 -3 22 22');
      arrow.style.transform = 'translate(-50%, -50%)';
      arrow.style.color = '#2ecc71';
      arrow.style.fill = '#2ecc71';
      arrow.innerHTML = '<path d="M2 8.5L6 12.5L14 3.5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
    }
  }

  // Chyba — křížek a combo přerušeno.
  function showComboFail(mb) {
    const arrow = $('mbArrow');
    if (arrow) {
      arrow.setAttribute('class', 'boss-attack-arrow dodge-fail');
      arrow.setAttribute('viewBox', '-3 -3 22 22');
      arrow.style.transform = 'translate(-50%, -50%)';
      arrow.style.rotate = '0deg';
      arrow.style.color = '#e74c3c';
      arrow.style.fill = '#e74c3c';
      arrow.innerHTML = '<path d="M4 4L12 12M12 4L4 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>';
    }
    const info = $('mbActionInfo');
    if (info) info.classList.add('hidden');
  }

  // Ukončí combo — skryje prompt i tlačítka, zruší pause a resetuje hráčovy swing timery.
  function endCombo(mb, completed) {
    mb._comboActive = false;
    hideOpportunityArrow(mb);
    const info = $('mbActionInfo');
    if (info) info.classList.add('hidden');
    // Skrýt combo tlačítka
    clearComboHighlights();
    const comboBtns = $('mbPsComboBtns'); if (comboBtns) comboBtns.classList.add('hidden');
    // Reset hráčových swing timerů — combo mělo váhu, útoky začínají od znovu
    const now = performance.now();
    mb._playerSwingStart = now;
    mb._playerSwingReady = false;
    mb._playerSwingPct = 0;
    mb._playerAttackProcessed = false;
    if (mb.offhandSwingMs > 0) {
      mb._offhandSwingStart = now;
      mb._offhandSwingReady = false;
      mb._offhandSwingPct = 0;
      mb._offhandAttackProcessed = false;
    }
    if (completed) {
      spawnFloatingText('COMBO!', 'right', '#f1c40f', 36);
      playSFX(strongStrikeSfx);
    }
  }

  function executePlayerSpell(spellId) {
    const mb = mapBattleState;
    if (!mb || mb.ended) return;
    if (spellId === 'firebolt' || spellId === 'icebolt' || spellId === 'lightningBolt' ||
               spellId === 'fireball' || spellId === 'frostbolt' || spellId === 'chainLightning' ||
               spellId === 'fireblast' || spellId === 'blizzard' || spellId === 'thunderStorm') {
      // Mágova kouzla — damage podle school a levelu
      const lv = getSpellLv(spellId);
      const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
      const eqAttrs = getEquipAttrs();
      const intBonus = (state.hero.attrInt||0) + eqAttrs.int;
      // Každé kouzlo má vlastní base dmg a rozptyl (D2 styl — jako weapon dmg)
      let baseMin, baseMax, school, schoolId;
      // Led: nízké dmg, malý rozptyl
      if (spellId === 'icebolt') { baseMin = 8 + lv * 4; baseMax = 10 + lv * 5; school = '❄️'; schoolId = 'ice'; }
      else if (spellId === 'frostbolt') { baseMin = 14 + lv * 6; baseMax = 18 + lv * 8; school = '🧊'; schoolId = 'ice'; }
      else if (spellId === 'blizzard') { baseMin = 6 + lv * 3; baseMax = 8 + lv * 4; school = '🌨️'; schoolId = 'ice'; }
      // Oheň: střední dmg, střední rozptyl
      else if (spellId === 'firebolt') { baseMin = 10 + lv * 5; baseMax = 16 + lv * 8; school = '🔥'; schoolId = 'fire'; }
      else if (spellId === 'fireball') { baseMin = 18 + lv * 8; baseMax = 28 + lv * 12; school = '💥'; schoolId = 'fire'; }
      else if (spellId === 'fireblast') { baseMin = 30 + lv * 12; baseMax = 45 + lv * 18; school = '🌋'; schoolId = 'fire'; }
      // Blesk: nejvyšší max dmg, obrovský rozptyl
      else if (spellId === 'lightningBolt') { baseMin = 6 + lv * 3; baseMax = 28 + lv * 14; school = '⚡'; schoolId = 'lightning'; }
      else if (spellId === 'chainLightning') { baseMin = 10 + lv * 5; baseMax = 45 + lv * 20; school = '⚡'; schoolId = 'lightning'; }
      else { baseMin = 4 + lv * 2; baseMax = 20 + lv * 10; school = '🌩️'; schoolId = 'lightning'; } // thunderStorm
      // Base dmg = náhodný roll v rozsahu + INT bonus
      const rolledDmg = baseMin + Math.floor(Math.random() * (baseMax - baseMin + 1));
      const baseDmg = rolledDmg + Math.floor(intBonus * 1);
      // Procentuální bonus ze zbraně (malý — 5-10% weapon baseDmg)
      const weaponBonus = Math.round(getWeaponDmg(weapon) * (0.05 + Math.random() * 0.05));
      const dmg = Math.max(1, baseDmg + weaponBonus);
      // Aplikovat resist
      const resist = getSchoolResistMult(schoolId);
      let finalDmg = Math.max(1, Math.round(dmg * resist));
      // Aplikovat skillDmg z equipu (prsteny, amulet, zbraň)
      const eqItems = [weapon, ITEM_MAP[state.hero.equip.ring1], ITEM_MAP[state.hero.equip.ring2], ITEM_MAP[state.hero.equip.amulet]].filter(Boolean);
      const totalSkillDmg = eqItems.reduce((sum, it) => sum + (it.skillDmg || 0), 0);
      if (totalSkillDmg > 0) {
        finalDmg = Math.max(1, Math.round(finalDmg * (1 + totalSkillDmg / 100)));
      }
      mb.bossHp -= finalDmg;
      // Smrtelná rána — kouzlo musí zabít stejně jako melee
      if (mb.bossHp <= 0 && !mb._pendingKill) {
        mb._pendingKill = true;
        // Naplánovat endMapBattle co nejdřív — aby ho nemohlo zrušit nic níže
        setTimeout(() => {
          if (!mapBattleState.ended) {
            endMapBattle(true);
            try { spawnDeathEffect(mb); } catch (e) {}
          }
        }, 300);
        try {
          spawnProjectileEffect(null, false, false, ATTACK_TYPES.CASTER, spellId);
          spawnFloatingText(`-${finalDmg}`, 'right', '#f1c40f', 32);
          updateMapBattleUI();
          cleanupTimers();
          dimTimers();
          const arena = $('mbArena');
          if (arena) {
            arena.style.transition = 'background 0.15s';
            arena.style.background = 'rgba(200,0,0,0.3)';
            setTimeout(() => { arena.style.background = 'rgba(200,0,0,0.6)'; }, 100);
            setTimeout(() => { arena.style.background = ''; }, 250);
          }
        } catch (e) { console.error('kill path 4:', e); }
        return;
      }
      // Ledová kouzla — zpomalení nepřítele
      if (schoolId === 'ice') {
        const slowPct = spellId === 'frostbolt' ? 50 : 25; // frostbolt 50%, icebolt 25%
        const slowDuration = spellId === 'frostbolt' ? 3 : 2; // sekundy
        const slowTicks = Math.round(slowDuration * 60);
        mb._enemySlowPct = slowPct;
        mb._enemySlowTimer = slowTicks;
        mb._enemySlowMax = slowTicks;
        // Přepočítat enemy swing timer se zpomalením — zachovat % průběh
        const now = performance.now();
        const oldMs = mb.enemySwingMs;
        const elapsed = now - mb._enemySwingStart;
        const progress = Math.min(elapsed / oldMs, 1);
        mb.enemySwingMs = getEnemySwingTime(mb);
        mb._enemySwingStart = now - progress * mb.enemySwingMs;
        _sessionDebuffs['slow_' + spellId] = { icon: '❄️', name: `Zpomalení ${slowPct}%`, iconImg:'chill.png', ticks: slowTicks, maxTicks: slowTicks };
      }
      // Elektrická kouzla — vlastní SFX
      if (schoolId === 'lightning') {
        playSFX(lightningSpellSfx2);
      }
      // Projektil
      spawnProjectileEffect(null, false, false, ATTACK_TYPES.CASTER, spellId);
      sfxHit();
      spawnFloatingText(`-${finalDmg}`, 'right', '#f1c40f', 32);
    } else if (spellId === 'thunderClap') {
      // Barbar Thunder Clap — damage + slow
      const lv = getSpellLv(spellId);
      const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
      const eqAttrs = getEquipAttrs();
      const strBonus = (state.hero.attrStr||0) + eqAttrs.str;
      const weaponDmg = getWeaponDmg(weapon);
      const pctDmg = 0.5 + lv * 0.3;
      const baseDmg = Math.round(weaponDmg * pctDmg) + Math.floor(strBonus * 0.5);
      let finalDmg = Math.max(1, baseDmg);
      const eqItems = [weapon, ITEM_MAP[state.hero.equip.ring1], ITEM_MAP[state.hero.equip.ring2], ITEM_MAP[state.hero.equip.amulet]].filter(Boolean);
      const totalSkillDmg = eqItems.reduce((sum, it) => sum + (it.skillDmg || 0), 0);
      if (totalSkillDmg > 0) {
        finalDmg = Math.max(1, Math.round(finalDmg * (1 + totalSkillDmg / 100)));
      }
      mb.bossHp -= finalDmg;
      // Slow: 20% for 1+lv seconds
      const slowPct = 20;
      const slowDuration = 1 + lv;
      const slowTicks = Math.round(slowDuration * 60);
      mb._enemySlowPct = slowPct;
      mb._enemySlowTimer = slowTicks;
      mb._enemySlowMax = slowTicks;
      // Přepočítat enemy swing timer se zpomalením — zachovat % průběh
      const now = performance.now();
      const oldMs = mb.enemySwingMs;
      const elapsed = now - mb._enemySwingStart;
      const progress = Math.min(elapsed / oldMs, 1);
      mb.enemySwingMs = getEnemySwingTime(mb);
      mb._enemySwingStart = now - progress * mb.enemySwingMs;
      _sessionDebuffs['thunderClap'] = { icon: '🌊', name: `Thunder Clap (slow ${slowPct}%)`, ticks: slowTicks, maxTicks: slowTicks };
      playSFX(thunderClapSfx);
      spawnProjectileEffect(null, false, false, ATTACK_TYPES.CASTER, spellId);
      spawnFloatingText(`-${finalDmg}`, 'right', '#f39c12', 32);
      if (mb.bossHp <= 0 && !mb._pendingKill) {
        mb._pendingKill = true;
        endMapBattle(true);
        try { spawnDeathEffect(mb); } catch (e) {}
        return;
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

    // Touch swipe (mobil)
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

    // Pointer/mouse swipe (desktop i dotyk) — myšový drag přes arénu = swipe.
    // Umožní dodge i interrupt akce myší, nejen přes klávesnici.
    let ptrDown = false, ptrStartX = 0, ptrStartY = 0;
    const pDown = (e) => {
      if (mapBattleState.ended) return;
      if (e.type === 'mousedown' && e.button !== 0) return; // jen levé tlačítko
      ptrDown = true; ptrStartX = e.clientX; ptrStartY = e.clientY;
    };
    const pUp = (e) => {
      if (mapBattleState.ended || !ptrDown) { ptrDown = false; return; }
      const dx = e.clientX - ptrStartX, dy = e.clientY - ptrStartY;
      ptrDown = false;
      if (Math.abs(dx)<20 && Math.abs(dy)<20) return; // krátký klik = nic
      let dir;
      if (Math.abs(dy) > Math.abs(dx)) dir = dy < 0 ? '⬆️' : '⬇️';
      else dir = dx < 0 ? '⬅️' : '➡️';
      onMapDodge(dir);
    };
    arena.addEventListener('mousedown', pDown);
    window.addEventListener('mouseup', pUp);
    handlers.push(['mousedown', pDown], ['mouseup', pUp]);

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
    mb.baseDmg = 10 + Math.floor(state.hero.level * 3) + getWeaponDmg(weapon) + ((state.hero.attrStr||0) + eqAttrs.str) * 2;

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
    if (mb.chillTicksLeft > 0) circle.style.stroke = '#4fc3f7';
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
    spawnFloatingText(`☠️ -${mb.dot}`, 'right', '#2ecc71', 32, 2000, 'assets/spells/poison.png');
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

  // Enemy DoT tick — jed ze zbraně hráče na nepřítele, tickuje 1×/s
  let _lastEnemyDotTick = 0;
  function doEnemyDotTick(mb) {
    if (mb.enemyDot <= 0 || mb.enemyDotTicksLeft <= 0) return false;
    const now = performance.now();
    if (now - _lastEnemyDotTick < 1000) return false;
    _lastEnemyDotTick = now;
    mb.bossHp -= mb.enemyDot;
    mb.enemyDotTicksLeft--;
    spawnFloatingText(`☠️ -${mb.enemyDot}`, 'right', '#2ecc71', 32, 2000, 'assets/spells/poison.png');
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
    spawnFloatingText(`☠️ -${mb.playerDot}`, 'left', '#2ecc71', 32, 2000, 'assets/spells/poison.png');
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
    // Enemy DoT tick — jed ze zbraně hráče
    if (doEnemyDotTick(mb)) return;

    // HoT tick — léčení každý tick
    if (mb.hotTicksLeft > 0) {
      mb.playerHp = Math.min(mb.maxPlayerHp, mb.playerHp + mb.hot);
      mb.hotTicksLeft--;
    }
    // Life Regen (D2: of Regeneration/Regrowth/Revivification) — replenish life za sekundu
    const lifeRegenVal = getEquipStat('lifeRegen');
    if (lifeRegenVal > 0 && mb.playerHp < mb.maxPlayerHp) {
      mb.playerHp = Math.min(mb.maxPlayerHp, mb.playerHp + lifeRegenVal / 60);
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
    if (hasPassive && a === 'lightning') return { c1:'#a855f7', c2:'#7c3aed', rgb:'168,85,247' };
    if (hasPassive && a === 'nature') return { c1:'#58d68d', c2:'#2ecc71', rgb:'46,204,113' };
    if (hasPassive && a === 'physical') return { c1:'#b0b0c8', c2:'#8888aa', rgb:'180,180,200' };
    return { c1:'#bbb', c2:'#aaa', rgb:'187,187,187' };
  }

  function spawnProjectileEffect(dir, targetIsPlayer, isCrit, attackType, spellId) {
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const aRect = arena.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

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

    const isSpell = spellId !== undefined && spellId !== null;
    const duration = 240; // ms letu

    if (!isSpell) {
      // Základní útok — canvas projektil (místo PNG)
      // Barva podle classy, ne podle activeSchool
      const classColors = { barbarian:'230,126,34', assassin:'46,204,113', mage:'168,85,247' };
      const rgb = classColors[state.heroClass] || '168,85,247';
      const schoolColor = { rgb: rgb };
      const canvas = $('mbProjectileCanvas');
      if (!canvas) return;
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d');

      const angle = Math.atan2(endY - startY, endX - startX);
      const dist = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
      const startTime = performance.now();

      // Trail
      const trail = [];
      const trailLen = 6;

      function drawBasicProjectile(x, y, progress) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        const s = isCrit ? 1.6 : 1.2;
        const flicker = 0.85 + Math.sin(progress * 30) * 0.15;
        const r = 18 * s;

        // Vnější záře
        const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.5);
        glowGrad.addColorStop(0, `rgba(${rgb},0.25)`);
        glowGrad.addColorStop(0.5, `rgba(${rgb},0.1)`);
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        // Hlavní koule
        const grad = ctx.createRadialGradient(-r*0.3, -r*0.3, 0, 0, 0, r);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.2, `rgba(${rgb},0.9)`);
        grad.addColorStop(0.6, `rgba(${rgb},0.7)`);
        grad.addColorStop(1, `rgba(${rgb},0)`);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.shadowColor = `rgba(${rgb},0.6)`;
        ctx.shadowBlur = 15 * s * flicker;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Jiskřící tečky na povrchu
        for (let i = 0; i < 3; i++) {
          const sx = Math.sin(progress * 15 + i * 2) * r * 0.5;
          const sy = Math.cos(progress * 12 + i * 3) * r * 0.5;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.5 * s, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(progress * 20 + i) * 0.15})`;
          ctx.fill();
        }

        ctx.restore();
      }

      function animate(ts) {
        const elapsed = ts - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 2);
        const x = startX + (endX - startX) * ease;
        const y = startY + (endY - startY) * ease;

        trail.push({ x, y });
        if (trail.length > trailLen) trail.shift();

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Trail
        for (let i = 0; i < trail.length - 1; i++) {
          const t = trail[i];
          const alpha = (i / trail.length) * 0.3;
          const tr = 4 + (i / trail.length) * 4;
          ctx.beginPath();
          ctx.arc(t.x, t.y, tr, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb},${alpha})`;
          ctx.fill();
        }

        drawBasicProjectile(x, y, progress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          spawnBasicImpact(endX, endY, isCrit, rgb);
        }
      }

      requestAnimationFrame(animate);
      return;
    }

    // === KOUZLA — čistý canvas projektil ===
    const canvas = $('mbProjectileCanvas');
    if (!canvas) return;
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');

    const angle = Math.atan2(endY - startY, endX - startX);
    const dist = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
    const speed = dist / duration; // px/ms
    const startTime = performance.now();

    // Trail history
    const trail = [];
    const trailLen = 6;

    function drawProjectile(x, y, progress) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      const s = isCrit ? 2.2 : 1.8;
      const flicker = 0.85 + Math.sin(progress * 30) * 0.15; // plápolání

      if (spellId === 'firebolt') {
        // Ohnivý šíp s plápolajícími plameny
        const len = 20 * s;
        const w = 7 * s;
        // Hlavní tělo šípu
        ctx.beginPath();
        ctx.moveTo(len, 0);
        ctx.lineTo(-len * 0.4, -w);
        ctx.lineTo(-len * 0.2, 0);
        ctx.lineTo(-len * 0.4, w);
        ctx.closePath();
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, len);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.2, '#f1c40f');
        grad.addColorStop(0.5, '#e67e22');
        grad.addColorStop(0.8, '#e74c3c');
        grad.addColorStop(1, 'rgba(200,50,0,0)');
        ctx.fillStyle = grad;
        ctx.shadowColor = '#f39c12';
        ctx.shadowBlur = 15 * s * flicker;
        ctx.fill();
        ctx.shadowBlur = 0;
        // Plamínky po stranách
        for (let i = 0; i < 4; i++) {
          const side = (i % 2 === 0 ? 1 : -1);
          const px = -len * 0.2 + (i * 0.15) * len;
          const py = side * (w + 2 + Math.sin(progress * 15 + i * 2) * 3) * s;
          const fs = 3 + Math.sin(progress * 10 + i) * 1.5;
          ctx.beginPath();
          ctx.arc(px, py, fs * s, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(241,196,15,${0.4 + Math.sin(progress * 12 + i) * 0.2})`;
          ctx.fill();
        }
        // Jiskry
        for (let i = 0; i < 3; i++) {
          const sparkX = -len * 0.3 + Math.sin(progress * 20 + i * 3) * len * 0.2;
          const sparkY = Math.sin(progress * 25 + i * 4) * w * 1.5;
          ctx.beginPath();
          ctx.arc(sparkX, sparkY, 1.5 * s, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,200,100,${0.3 + Math.sin(progress * 20 + i) * 0.2})`;
          ctx.fill();
        }

      } else if (spellId === 'fireball') {
        // Ohnivá koule s vířícími plameny
        const r = 14 * s;
        // Vnější záře
        const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2);
        glowGrad.addColorStop(0, 'rgba(231,76,60,0.3)');
        glowGrad.addColorStop(0.5, 'rgba(231,76,60,0.1)');
        glowGrad.addColorStop(1, 'rgba(231,76,60,0)');
        ctx.beginPath();
        ctx.arc(0, 0, r * 2, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();
        // Hlavní koule
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.15, '#f1c40f');
        grad.addColorStop(0.4, '#e67e22');
        grad.addColorStop(0.7, '#e74c3c');
        grad.addColorStop(1, 'rgba(200,50,0,0)');
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.shadowColor = '#e74c3c';
        ctx.shadowBlur = 20 * s * flicker;
        ctx.fill();
        ctx.shadowBlur = 0;
        // Vířící plameny na povrchu
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + progress * 2;
          const dist = r * 0.6 + Math.sin(progress * 8 + i * 2) * r * 0.3;
          const px = Math.cos(a) * dist;
          const py = Math.sin(a) * dist;
          const fs = 3 + Math.sin(progress * 10 + i) * 2;
          ctx.beginPath();
          ctx.arc(px, py, fs * s, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(241,196,15,${0.3 + Math.sin(progress * 8 + i) * 0.2})`;
          ctx.fill();
        }
        // Odlétající jiskry
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + progress * 3;
          const dist = r + 2 + Math.sin(progress * 12 + i) * 4;
          const px = Math.cos(a) * dist;
          const py = Math.sin(a) * dist;
          ctx.beginPath();
          ctx.arc(px, py, 1.5 * s, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,200,100,${0.2 + Math.sin(progress * 15 + i) * 0.15})`;
          ctx.fill();
        }

      } else if (spellId === 'fireblast') {
        // Výbuch — rotující hvězda s paprsky a jiskrami
        const r = 16 * s;
        // Vnější záře
        const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.5);
        glowGrad.addColorStop(0, 'rgba(231,76,60,0.2)');
        glowGrad.addColorStop(0.5, 'rgba(231,76,60,0.05)');
        glowGrad.addColorStop(1, 'rgba(231,76,60,0)');
        ctx.beginPath();
        ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();
        // Hlavní koule
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.15, '#f1c40f');
        grad.addColorStop(0.4, '#e74c3c');
        grad.addColorStop(0.7, '#c0392b');
        grad.addColorStop(1, 'rgba(150,30,0,0)');
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.shadowColor = '#e74c3c';
        ctx.shadowBlur = 22 * s * flicker;
        ctx.fill();
        ctx.shadowBlur = 0;
        // Rotující paprsky (2 sady)
        for (let set = 0; set < 2; set++) {
          const count = 6;
          const offset = set * Math.PI / count + progress * (set === 0 ? 1 : -0.7);
          for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2 + offset;
            const len = r * (1.2 + Math.sin(progress * 5 + i + set) * 0.3);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
            ctx.strokeStyle = `rgba(241,196,15,${0.2 + Math.sin(progress * 6 + i + set) * 0.15})`;
            ctx.lineWidth = (2 - set * 0.5) * s;
            ctx.stroke();
          }
        }
        // Jiskry rozlétající se
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + progress * 4;
          const dist = r * 0.8 + Math.sin(progress * 10 + i) * r * 0.4;
          const px = Math.cos(a) * dist;
          const py = Math.sin(a) * dist;
          ctx.beginPath();
          ctx.arc(px, py, 2 * s, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,200,50,${0.3 + Math.sin(progress * 12 + i) * 0.2})`;
          ctx.fill();
        }

      } else if (spellId === 'icebolt') {
        // Ledový šíp s mrazivým oparem
        const len = 20 * s;
        const w = 7 * s;
        // Hlavní tělo
        ctx.beginPath();
        ctx.moveTo(len, 0);
        ctx.lineTo(-len * 0.4, -w);
        ctx.lineTo(-len * 0.2, 0);
        ctx.lineTo(-len * 0.4, w);
        ctx.closePath();
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, len);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.2, '#aed6f1');
        grad.addColorStop(0.5, '#5dade2');
        grad.addColorStop(0.8, '#3498db');
        grad.addColorStop(1, 'rgba(50,100,200,0)');
        ctx.fillStyle = grad;
        ctx.shadowColor = '#5dade2';
        ctx.shadowBlur = 12 * s;
        ctx.fill();
        ctx.shadowBlur = 0;
        // Mráz po stranách
        for (let i = 0; i < 4; i++) {
          const side = (i % 2 === 0 ? 1 : -1);
          const px = -len * 0.2 + (i * 0.15) * len;
          const py = side * (w + 1 + Math.sin(progress * 12 + i * 2) * 2) * s;
          const fs = 2 + Math.sin(progress * 8 + i) * 1;
          ctx.beginPath();
          ctx.arc(px, py, fs * s, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(174,214,241,${0.3 + Math.sin(progress * 10 + i) * 0.15})`;
          ctx.fill();
        }
        // Ledové krystalky
        for (let i = 0; i < 3; i++) {
          const cx = -len * 0.3 + Math.sin(progress * 15 + i * 3) * len * 0.15;
          const cy = Math.sin(progress * 20 + i * 4) * w * 1.2;
          const sz = 1.5 + Math.sin(progress * 10 + i) * 0.5;
          ctx.beginPath();
          ctx.moveTo(cx + sz, cy);
          ctx.lineTo(cx, cy - sz);
          ctx.lineTo(cx - sz, cy);
          ctx.lineTo(cx, cy + sz);
          ctx.closePath();
          ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.sin(progress * 12 + i) * 0.2})`;
          ctx.fill();
        }

      } else if (spellId === 'frostbolt') {
        // Ledový krystal s rotujícími prstenci
        const r = 14 * s;
        // Vnější mráz
        const frostGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2);
        frostGrad.addColorStop(0, 'rgba(93,173,226,0.2)');
        frostGrad.addColorStop(0.5, 'rgba(93,173,226,0.05)');
        frostGrad.addColorStop(1, 'rgba(93,173,226,0)');
        ctx.beginPath();
        ctx.arc(0, 0, r * 2, 0, Math.PI * 2);
        ctx.fillStyle = frostGrad;
        ctx.fill();
        // Hlavní krystal (kosočtverec)
        ctx.beginPath();
        ctx.moveTo(r * 1.2, 0);
        ctx.lineTo(0, -r * 0.8);
        ctx.lineTo(-r * 1.2, 0);
        ctx.lineTo(0, r * 0.8);
        ctx.closePath();
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.2);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.3, '#aed6f1');
        grad.addColorStop(0.6, '#5dade2');
        grad.addColorStop(1, 'rgba(50,100,200,0)');
        ctx.fillStyle = grad;
        ctx.shadowColor = '#5dade2';
        ctx.shadowBlur = 14 * s;
        ctx.fill();
        ctx.shadowBlur = 0;
        // Rotující ledové prstence
        for (let ring = 0; ring < 2; ring++) {
          ctx.beginPath();
          const rr = r * (0.7 + ring * 0.3);
          ctx.arc(0, 0, rr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(174,214,241,${0.15 + Math.sin(progress * 4 + ring) * 0.1})`;
          ctx.lineWidth = 1.5 * s;
          ctx.setLineDash([4 * s, 4 * s]);
          ctx.lineDashOffset = -progress * 30 * (ring === 0 ? 1 : -1);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // Vnitřní krystal
        ctx.beginPath();
        ctx.moveTo(r * 0.5, 0);
        ctx.lineTo(0, -r * 0.35);
        ctx.lineTo(-r * 0.5, 0);
        ctx.lineTo(0, r * 0.35);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fill();

      } else if (spellId === 'blizzard') {
        // Vír ledových krystalů a sněhu
        for (let i = 0; i < 7; i++) {
          const ox = Math.sin(progress * 3 + i * 1.1) * 10 * s;
          const oy = Math.cos(progress * 2.5 + i * 0.8) * 8 * s - 3 * s;
          const sz = 2 + Math.sin(progress * 4 + i * 1.5) * 2;
          const alpha = 0.3 + Math.sin(progress * 3 + i * 1.2) * 0.25;
          // Krystal (hvězdička)
          ctx.beginPath();
          for (let p = 0; p < 6; p++) {
            const pa = (p / 6) * Math.PI * 2 + progress * 0.5 + i;
            const px = ox + Math.cos(pa) * sz;
            const py = oy + Math.sin(pa) * sz;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fillStyle = `rgba(174,214,241,${alpha})`;
          ctx.shadowColor = '#5dade2';
          ctx.shadowBlur = 4 * s;
          ctx.fill();
          ctx.shadowBlur = 0;
          // Sněhové vločky (malé tečky)
          for (let j = 0; j < 3; j++) {
            const sx = ox + Math.sin(progress * 5 + i * 2 + j * 1.7) * 5 * s;
            const sy = oy + Math.cos(progress * 4 + i * 1.3 + j * 2.1) * 4 * s;
            ctx.beginPath();
            ctx.arc(sx, sy, 1 * s, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${alpha * 0.5})`;
            ctx.fill();
          }
        }

      } else if (spellId === 'lightningBolt') {
        // Blesk s elektrickými výboji
        // Hlavní blesk
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const segs = 8;
        for (let i = 0; i < segs; i++) {
          const t = (i + 1) / segs;
          const lx = 22 * s * t;
          const ly = (Math.sin(i * 1.5 + progress * 2) * 6 + (Math.random() - 0.5) * 4) * s * (1 - t * 0.3);
          ctx.lineTo(lx, ly);
        }
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 3.5 * s;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 15 * s * flicker;
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Vedlejší výboje
        for (let b = 0; b < 4; b++) {
          const startT = 0.2 + b * 0.15;
          const bx = 22 * s * startT;
          const by = (Math.sin(startT * 8 + progress * 2) * 6) * s;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          for (let i = 0; i < 4; i++) {
            const t = (i + 1) / 4;
            const ex = bx + (Math.random() - 0.5) * 8 * s * t;
            const ey = by + (Math.random() - 0.5) * 8 * s * t - 4 * s * t;
            ctx.lineTo(ex, ey);
          }
          ctx.strokeStyle = `rgba(168,85,247,${0.3 + Math.sin(progress * 8 + b) * 0.2})`;
          ctx.lineWidth = 1.5 * s;
          ctx.stroke();
        }
        // Jiskry
        for (let i = 0; i < 5; i++) {
          const t = 0.1 + Math.random() * 0.8;
          const sx = 22 * s * t;
          const sy = (Math.sin(t * 8 + progress * 2) * 6) * s;
          const offX = (Math.random() - 0.5) * 6 * s;
          const offY = (Math.random() - 0.5) * 6 * s;
          ctx.beginPath();
          ctx.arc(sx + offX, sy + offY, 1.5 * s, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200,150,255,${0.3 + Math.random() * 0.3})`;
          ctx.fill();
        }

      } else if (spellId === 'chainLightning') {
        // Rozvětvené blesky s elektrickou aurou
        // Aura
        const auraGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 20 * s);
        auraGrad.addColorStop(0, 'rgba(168,85,247,0.1)');
        auraGrad.addColorStop(1, 'rgba(168,85,247,0)');
        ctx.beginPath();
        ctx.arc(0, 0, 20 * s, 0, Math.PI * 2);
        ctx.fillStyle = auraGrad;
        ctx.fill();
        // 3 hlavní větve
        for (let b = 0; b < 3; b++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          const offX = (b - 1) * 7 * s;
          const offY = (b - 1) * 5 * s;
          for (let i = 0; i < 6; i++) {
            const t = (i + 1) / 6;
            const lx = 20 * s * t + offX * (1 - t);
            const ly = offY * (1 - t) + (Math.sin(i * 2 + progress * 3 + b) * 5 + (Math.random() - 0.5) * 3) * s * (1 - t * 0.3);
            ctx.lineTo(lx, ly);
          }
          ctx.strokeStyle = `rgba(168,85,247,${0.4 + b * 0.2})`;
          ctx.lineWidth = (2.5 - b * 0.5) * s;
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 10 * s;
          ctx.stroke();
          ctx.shadowBlur = 0;
          // Sub-větve
          for (let sub = 0; sub < 2; sub++) {
            const st = 0.3 + sub * 0.3;
            const sbx = 20 * s * st + offX * (1 - st);
            const sby = offY * (1 - st) + Math.sin(st * 6 + progress * 2 + b) * 5 * s;
            ctx.beginPath();
            ctx.moveTo(sbx, sby);
            for (let i = 0; i < 3; i++) {
              const t = (i + 1) / 3;
              ctx.lineTo(sbx + (Math.random() - 0.5) * 6 * s * t, sby + (Math.random() - 0.5) * 6 * s * t - 5 * s * t);
            }
            ctx.strokeStyle = `rgba(168,85,247,${0.2 + sub * 0.1})`;
            ctx.lineWidth = 1 * s;
            ctx.stroke();
          }
        }

      } else if (spellId === 'thunderStorm') {
        // Bouřkový mrak s blesky a deštěm
        // Mrak
        ctx.beginPath();
        ctx.arc(0, -3 * s, 13 * s, 0, Math.PI * 2);
        ctx.arc(-9 * s, 0, 11 * s, 0, Math.PI * 2);
        ctx.arc(9 * s, 0, 11 * s, 0, Math.PI * 2);
        ctx.arc(-4 * s, 3 * s, 9 * s, 0, Math.PI * 2);
        ctx.arc(4 * s, 3 * s, 9 * s, 0, Math.PI * 2);
        const cloudGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 15 * s);
        cloudGrad.addColorStop(0, '#4a4a5a');
        cloudGrad.addColorStop(0.5, '#2c3e50');
        cloudGrad.addColorStop(1, '#1a1a2e');
        ctx.fillStyle = cloudGrad;
        ctx.fill();
        // Záře v mraku
        const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 8 * s);
        glowGrad.addColorStop(0, `rgba(168,85,247,${0.15 + Math.sin(progress * 6) * 0.1})`);
        glowGrad.addColorStop(1, 'rgba(168,85,247,0)');
        ctx.beginPath();
        ctx.arc(0, 0, 8 * s, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();
        // Blesky z mraku (3)
        for (let b = 0; b < 3; b++) {
          const bx = (b - 1) * 8 * s;
          const flash = 0.5 + Math.sin(progress * 7 + b * 2) * 0.4;
          ctx.beginPath();
          ctx.moveTo(bx, 5 * s);
          for (let i = 0; i < 5; i++) {
            const t = (i + 1) / 5;
            const lx = bx + (Math.sin(i * 2 + progress * 4 + b) * 4 + (Math.random() - 0.5) * 2) * s * (1 - t * 0.3);
            const ly = 5 * s + 16 * s * t;
            ctx.lineTo(lx, ly);
          }
          ctx.strokeStyle = `rgba(168,85,247,${flash})`;
          ctx.lineWidth = (2.5 - b * 0.3) * s;
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 12 * s * flash;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        // Kapky deště
        for (let i = 0; i < 8; i++) {
          const dx = (Math.random() - 0.5) * 24 * s;
          const dy = (Math.random() * 0.5 + 0.2) * 20 * s;
          const drip = (progress * 2 + i * 0.3) % 1;
          const rx = dx + Math.sin(drip * Math.PI * 2) * 2 * s;
          const ry = dy + drip * 8 * s;
          ctx.beginPath();
          ctx.arc(rx, ry, 1 * s, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(100,150,255,${0.2 * (1 - drip)})`;
          ctx.fill();
        }
      }

      ctx.restore();
    }

    function animate(ts) {
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 2); // ease-out quad
      const x = startX + (endX - startX) * ease;
      const y = startY + (endY - startY) * ease;

      // Trail
      trail.push({ x, y });
      if (trail.length > trailLen) trail.shift();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Kreslit trail
      for (let i = 0; i < trail.length - 1; i++) {
        const t = trail[i];
        const alpha = (i / trail.length) * 0.3;
        const r = 4 + (i / trail.length) * 4;
        ctx.beginPath();
        ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${alpha})`;
        ctx.fill();
      }

      // Kreslit projektil
      drawProjectile(x, y, progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Impact
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const pCount = isCrit ? 20 : 10;
        const particles = [];
        for (let i = 0; i < pCount; i++) {
          const a = Math.random() * 2 * Math.PI;
          const dist2 = 20 + Math.random() * (isCrit ? 50 : 30);
          const pSize = 3 + Math.random() * (isCrit ? 8 : 5);
          const speed2 = 0.3 + Math.random() * 0.3;
          particles.push({
            x: endX, y: endY,
            tx: endX + Math.cos(a) * dist2,
            ty: endY + Math.sin(a) * dist2,
            size: pSize,
            alpha: 0.8 + Math.random() * 0.2,
            speed: speed2
          });
        }
        let impactStart = null;
        function animateImpact(ts2) {
          if (!impactStart) impactStart = ts2;
          const elapsed2 = (ts2 - impactStart) / 1000;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          let allDone = true;
          for (const p of particles) {
            const t = Math.min(elapsed2 / p.speed, 1);
            const ease2 = 1 - Math.pow(1 - t, 3);
            const px = p.x + (p.tx - p.x) * ease2;
            const py = p.y + (p.ty - p.y) * ease2;
            const alpha = p.alpha * (1 - ease2);
            if (alpha > 0.01) {
              allDone = false;
              ctx.beginPath();
              ctx.arc(px, py, p.size * (1 - ease2 * 0.5), 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${rgb},${alpha})`;
              ctx.fill();
            }
          }
          if (!allDone) requestAnimationFrame(animateImpact);
          else ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        requestAnimationFrame(animateImpact);
      }
    }

    requestAnimationFrame(animate);
  }

  function spawnBasicImpact(x, y, isCrit, rgbStr) {
    const arena = $('mbArena');
    if (!arena) return;
    // Fáze 3: canvas particle burst (aditivní, pod DOM) — jiskry s gravitací
    const rgb = rgbStr.split(',').map(Number);
    const colorHex = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
    spawnImpactBurst(x, y, colorHex, isCrit);
    // Pokud je rgbStr šedá (výchozí), použít arcánní fialovou pro kouzelníka
    if (rgbStr === '187,187,187' || rgbStr === '180,180,200') {
      rgbStr = '168,85,247';
    }
    const color = `rgba(${rgbStr},0.9)`;
    const brightColor = `rgba(${rgbStr},1.0)`;
    const whiteColor = 'rgba(255,255,255,0.9)';
    const count = isCrit ? 36 : 24;
    const maxSize = isCrit ? 26 : 18;
    const maxDist = isCrit ? 90 : 60;

    // Velký centrální záblesk
    const flash = document.createElement('div');
    const flashSize = isCrit ? 70 : 50;
    flash.style.cssText = `position:absolute;width:${flashSize}px;height:${flashSize}px;border-radius:50%;background:radial-gradient(circle, ${whiteColor}, ${brightColor} 30%, ${color} 50%, transparent 75%);z-index:19;pointer-events:none;`;
    flash.style.left = (x - flashSize/2) + 'px';
    flash.style.top = (y - flashSize/2) + 'px';
    arena.appendChild(flash);
    flash.style.transition = `transform 300ms ease-out, opacity 300ms ease-out`;
    void flash.offsetHeight;
    flash.style.transform = 'scale(3)';
    flash.style.opacity = '0';
    setTimeout(() => { if (flash.parentNode) flash.remove(); }, 350);

    // Druhý menší záblesk — vnější prstenec
    const ring = document.createElement('div');
    const ringSize = isCrit ? 100 : 70;
    ring.style.cssText = `position:absolute;width:${ringSize}px;height:${ringSize}px;border-radius:50%;border:3px solid ${brightColor};z-index:19;pointer-events:none;opacity:0.6;`;
    ring.style.left = (x - ringSize/2) + 'px';
    ring.style.top = (y - ringSize/2) + 'px';
    arena.appendChild(ring);
    ring.style.transition = `transform 400ms ease-out, opacity 400ms ease-out`;
    void ring.offsetHeight;
    ring.style.transform = 'scale(2)';
    ring.style.opacity = '0';
    setTimeout(() => { if (ring.parentNode) ring.remove(); }, 450);

    // Rozlétající se částice — větší a dál
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      const size = 4 + Math.random() * maxSize;
      const angle = Math.random() * 2 * Math.PI;
      const dist = 10 + Math.random() * maxDist;
      const isBright = Math.random() < 0.4;
      p.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${isBright ? brightColor : color};z-index:19;pointer-events:none;opacity:${isCrit ? 1.0 : 0.8};`;
      p.style.left = (x - size/2) + 'px';
      p.style.top = (y - size/2) + 'px';
      arena.appendChild(p);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      p.style.transition = `transform 400ms ease-out, opacity 400ms ease-out`;
      void p.offsetHeight;
      p.style.transform = `translate(${dx}px, ${dy}px)`;
      p.style.opacity = '0';
      setTimeout(() => { if (p.parentNode) p.remove(); }, 450);
    }
  }

  function spawnDeathEffect(mb) {
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const aRect = arena.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const bossFig = $('mbFigure');
    let bx = cx, by = 0;
    if (bossFig) {
      const br = bossFig.getBoundingClientRect();
      bx = br.left + br.width/2 - aRect.left;
      by = br.top + br.height/2 - aRect.top;
    }
    // Exploze částic — jediný efekt, žádné skrývání figure
    const count = 20;
    // Fáze 4: jemný kouř na canvas vrstvě (stoupá a rozpíná se)
    spawnDeathSmoke(bx, by);
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      const size = 4 + Math.random() * 12;
      const angle = Math.random() * 2 * Math.PI;
      const dist = 20 + Math.random() * 60;
      const colors = ['rgba(200,50,50,0.8)', 'rgba(255,100,50,0.7)', 'rgba(255,200,50,0.6)'];
      p.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${colors[i%3]};z-index:19;pointer-events:none;`;
      p.style.left = (bx - size/2) + 'px';
      p.style.top = (by - size/2) + 'px';
      arena.appendChild(p);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      p.style.transition = `transform 400ms ease-out, opacity 400ms ease-out`;
      void p.offsetHeight;
      p.style.transform = `translate(${dx}px, ${dy}px)`;
      p.style.opacity = '0';
      setTimeout(() => { if (p.parentNode) p.remove(); }, 450);
    }
  }

  function spawnMeleeImpact(mb, isCrit, weaponType, angleOffset = 0, elementColor = null) {
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const aRect = arena.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const bossFig = $('mbFigure');
    let bx = cx, by = 0;
    if (bossFig) {
      const br = bossFig.getBoundingClientRect();
      bx = br.left + br.width/2 - aRect.left;
      by = br.top + br.height/2 - aRect.top;
    }
    const isOffhand = angleOffset !== 0;

    if (weaponType === 'staff') {
      spawnBasicImpact(bx, by, isCrit, '168,85,247');
      return;
    }

    // Element color override — pokud zbraň má elementární poškození
    const mainColor = elementColor || (isCrit ? '#e74c3c' : '#fff');
    let colorHex;
    if (elementColor) {
      const r = parseInt(elementColor.slice(1,3), 16);
      const g = parseInt(elementColor.slice(3,5), 16);
      const b = parseInt(elementColor.slice(5,7), 16);
      colorHex = (r << 16) | (g << 8) | b;
    } else {
      colorHex = isCrit ? 0xe74c3c : 0xdddddd;
    }

    // Fáze 4: úderová animace na foreground PixiJS melee vrstvě (z-index 17, nad monstrem).
    // Zachovává charakter každé zbraně (meč/sekera/dýka/pěst/tupá zbraň/drápy), ale kreslí se WebGL.
    spawnMeleeStrike(weaponType, bx, by, colorHex, isCrit, angleOffset);

    // Fáze 4: canvas particle burst + shockwave ring + particle slash (aditivní, pod DOM)
    spawnImpactBurst(bx, by, colorHex, isCrit);
    spawnShockwave(bx, by, colorHex, isCrit);
    // Particle slash (obloukové seknutí jisker) jen pro sečné zbraně — blunt má vlastní praskliny
    if (weaponType !== 'blunt' && weaponType !== 'fists' && weaponType !== 'staff') {
      const slashAngle = angleOffset + Math.random() * Math.PI;
      spawnParticleSlash(bx, by, colorHex, isCrit, slashAngle);
    }
  }

  // ===== SPELL ANIMATIONS =====

  function spawnHeroicStrikeAnim(mb) {
    // Heroic Strike — zvýrazněná verze normálního úderu, obarvená podle elementu zbraně
    const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const bossFig = $('mbFigure');
    let bx = rect.width / 2, by = rect.height / 2;
    if (bossFig) {
      const br = bossFig.getBoundingClientRect();
      const aRect = arena.getBoundingClientRect();
      bx = br.left + br.width/2 - aRect.left;
      by = br.top + br.height/2 - aRect.top;
    }
    const canvas = $('mbProjectileCanvas');
    if (!canvas) return;
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    const wt = weapon.weaponType || 'fists';
    const startTime = performance.now();
    const duration = 350;
    const s = 1.3; // o trochu větší než normální úder
    const elemColor = getWeaponElementColor(weapon);
    const mainColor = elemColor || '#ffd700';
    const glowColor = elemColor
      ? `rgba(${parseInt(elemColor.slice(1,3),16)},${parseInt(elemColor.slice(3,5),16)},${parseInt(elemColor.slice(5,7),16)},0.8)`
      : 'rgba(255,215,0,0.8)';

    if (wt === 'blade') {
      // Žluté seknutí
      const angle = Math.random() * Math.PI * 0.6;
      const len = 200 * s;
      const midX = bx + Math.cos(angle) * len * 0.1;
      const midY = by + Math.sin(angle) * len * 0.1;
      const perpX = -Math.sin(angle) * len * 0.2;
      const perpY = Math.cos(angle) * len * 0.2;
      const cpX = midX + perpX;
      const cpY = midY + perpY;
      const startX = bx - Math.cos(angle) * len * 0.5;
      const startY = by - Math.sin(angle) * len * 0.5;
      const endX = bx + Math.cos(angle) * len * 0.5;
      const endY = by + Math.sin(angle) * len * 0.5;
      const approxLen = len * 1.3;
      function animate(ts) {
        const elapsed = ts - startTime;
        const progress = Math.min(elapsed / duration, 1);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const drawProgress = Math.min(progress * 1.5, 1);
        const fadeProgress = Math.max(0, (progress - 0.3) / 0.7);
        const alpha = 1 - fadeProgress;
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 20 * s;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, endX, endY);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 3 * s;
        ctx.lineCap = 'round';
        ctx.globalAlpha = alpha;
        ctx.setLineDash([approxLen, approxLen]);
        ctx.lineDashOffset = approxLen * (1 - drawProgress);
        ctx.stroke();
        ctx.restore();
        if (progress < 1) requestAnimationFrame(animate);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      requestAnimationFrame(animate);

    } else if (wt === 'axe') {
      // Žluté seknutí sekerou — kratší, tlustší
      const angle = Math.random() * Math.PI * 0.6;
      const len = 140 * s;
      const startX = bx - Math.cos(angle) * len * 0.5;
      const startY = by - Math.sin(angle) * len * 0.5;
      const endX = bx + Math.cos(angle) * len * 0.5;
      const endY = by + Math.sin(angle) * len * 0.5;
      function animate(ts) {
        const elapsed = ts - startTime;
        const progress = Math.min(elapsed / duration, 1);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const fadeProgress = Math.max(0, (progress - 0.2) / 0.8);
        const alpha = 1 - fadeProgress;
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 16 * s;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 5 * s;
        ctx.lineCap = 'round';
        ctx.globalAlpha = alpha;
        ctx.stroke();
        ctx.restore();
        if (progress < 1) requestAnimationFrame(animate);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      requestAnimationFrame(animate);

    } else if (wt === 'blunt') {
      // Žlutá pavučina — méně čar, menší
      const lineCount = 3 + Math.floor(Math.random() * 3);
      const lines = [];
      for (let i = 0; i < lineCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const l = (30 + Math.random() * 50) * s;
        const segments = [];
        const segCount = 1 + Math.floor(Math.random() * 2);
        for (let j = 0; j < segCount; j++) {
          const frac = (j + 1) / (segCount + 1);
          const dx = Math.cos(a + (Math.random() - 0.5) * 0.6) * l * frac;
          const dy = Math.sin(a + (Math.random() - 0.5) * 0.6) * l * frac;
          segments.push({ x: bx + dx, y: by + dy });
        }
        const endAngle = a + (Math.random() - 0.5) * 0.4;
        segments.push({ x: bx + Math.cos(endAngle) * l, y: by + Math.sin(endAngle) * l });
        lines.push(segments);
      }
      const crossLines = [];
      const crossCount = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < crossCount; i++) {
        const a1 = Math.random() * Math.PI * 2;
        const a2 = a1 + 0.3 + Math.random() * 0.8;
        const r1 = (15 + Math.random() * 30) * s;
        const r2 = (15 + Math.random() * 30) * s;
        crossLines.push({
          x1: bx + Math.cos(a1) * r1, y1: by + Math.sin(a1) * r1,
          x2: bx + Math.cos(a2) * r2, y2: by + Math.sin(a2) * r2
        });
      }
      function animate(ts) {
        const elapsed = ts - startTime;
        const progress = Math.min(elapsed / duration, 1);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const drawProgress = Math.min(progress * 1.5, 1);
        const fadeProgress = Math.max(0, (progress - 0.3) / 0.7);
        const alpha = 1 - fadeProgress;
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 10 * s;
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1 * s;
        ctx.lineCap = 'round';
        ctx.globalAlpha = alpha;
        const totalSegments = lines.reduce((sum, l) => sum + l.length, 0) + crossLines.length;
        const drawnSegments = Math.floor(drawProgress * totalSegments);
        let segIdx = 0;
        lines.forEach(segments => {
          ctx.beginPath();
          ctx.moveTo(bx, by);
          let drawn = 0;
          for (const seg of segments) {
            if (segIdx >= drawnSegments) break;
            ctx.lineTo(seg.x, seg.y);
            segIdx++;
            drawn++;
          }
          if (drawn > 0) ctx.stroke();
        });
        crossLines.forEach(cl => {
          if (segIdx >= drawnSegments) return;
          ctx.beginPath();
          ctx.moveTo(cl.x1, cl.y1);
          ctx.lineTo(cl.x2, cl.y2);
          ctx.stroke();
          segIdx++;
        });
        ctx.restore();
        if (progress < 1) requestAnimationFrame(animate);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      requestAnimationFrame(animate);

    } else if (wt === 'claws') {
      // Tři žluté sečné rány
      const angle = Math.random() * Math.PI * 0.6;
      const len = 140 * s;
      const spacing = 22 * s;
      const perpX = -Math.sin(angle) * spacing;
      const perpY = Math.cos(angle) * spacing;
      const midX = bx + Math.cos(angle) * len * 0.1;
      const midY = by + Math.sin(angle) * len * 0.1;
      const curveX = -Math.sin(angle) * len * 0.2;
      const curveY = Math.cos(angle) * len * 0.2;
      const startX = bx - Math.cos(angle) * len * 0.5;
      const startY = by - Math.sin(angle) * len * 0.5;
      const endX = bx + Math.cos(angle) * len * 0.5;
      const endY = by + Math.sin(angle) * len * 0.5;
      const approxLen = len * 1.3;
      const slashes = [
        { sx: startX - perpX, sy: startY - perpY, cpX: midX - perpX + curveX, cpY: midY - perpY + curveY, ex: endX - perpX, ey: endY - perpY },
        { sx: startX, sy: startY, cpX: midX + curveX, cpY: midY + curveY, ex: endX, ey: endY },
        { sx: startX + perpX, sy: startY + perpY, cpX: midX + perpX + curveX, cpY: midY + perpY + curveY, ex: endX + perpX, ey: endY + perpY }
      ];
      function animate(ts) {
        const elapsed = ts - startTime;
        const progress = Math.min(elapsed / duration, 1);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const drawProgress = Math.min(progress * 1.5, 1);
        const fadeProgress = Math.max(0, (progress - 0.3) / 0.7);
        const alpha = 1 - fadeProgress;
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 12 * s;
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1 * s;
        ctx.lineCap = 'round';
        ctx.globalAlpha = alpha;
        slashes.forEach((sl, idx) => {
          const offset = idx * 0.05;
          const slProgress = Math.max(0, Math.min((drawProgress - offset) / (1 - offset), 1));
          ctx.beginPath();
          ctx.moveTo(sl.sx, sl.sy);
          ctx.quadraticCurveTo(sl.cpX, sl.cpY, sl.ex, sl.ey);
          ctx.setLineDash([approxLen, approxLen]);
          ctx.lineDashOffset = approxLen * (1 - slProgress);
          ctx.stroke();
        });
        ctx.restore();
        if (progress < 1) requestAnimationFrame(animate);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      requestAnimationFrame(animate);

    } else if (wt === 'staff') {
      // Žlutý magický záblesk
      function animate(ts) {
        const elapsed = ts - startTime;
        const progress = Math.min(elapsed / duration, 1);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const r = 10 + progress * 80 * s;
        const alpha = 1 - progress;
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 20 * s;
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 4 * s;
        ctx.globalAlpha = alpha;
        ctx.stroke();
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, r);
        grad.addColorStop(0, `rgba(255,215,0,${alpha * 0.5})`);
        grad.addColorStop(0.3, `rgba(255,215,0,${alpha * 0.2})`);
        grad.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
        if (progress < 1) requestAnimationFrame(animate);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      requestAnimationFrame(animate);

    } else {
      // fists nebo fallback — žlutý kruh
      function animate(ts) {
        const elapsed = ts - startTime;
        const progress = Math.min(elapsed / duration, 1);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const r = 10 + progress * 70 * s;
        const alpha = 1 - progress;
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 16 * s;
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 6 * s;
        ctx.globalAlpha = alpha;
        ctx.stroke();
        ctx.restore();
        if (progress < 1) requestAnimationFrame(animate);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      requestAnimationFrame(animate);
    }
  }

  function resetDoubleSwingTimers(mb) {
    // Reset obou swing timerů hráče (main + offhand)
    mb._playerSwingStart = performance.now();
    mb._playerSwingReady = false;
    mb._playerSwingPct = 0;
    mb._offhandSwingStart = performance.now();
    mb._offhandSwingReady = false;
    mb._offhandSwingPct = 0;
  }

  function spawnDoubleSwingAnim(mb) {
    // Double Swing — obě zbraně zároveň
    const weapon = ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists'];
    const offhandWeapon = (state.hero.equip.shield && ITEM_MAP[state.hero.equip.shield]?.weaponType) ? ITEM_MAP[state.hero.equip.shield] : null;
    const elemColor = getWeaponElementColor(weapon);
    const offElemColor = offhandWeapon ? getWeaponElementColor(offhandWeapon) : null;
    spawnMeleeImpact(mb, false, weapon.weaponType || 'fists', 0, elemColor);
    if (offhandWeapon) {
      spawnMeleeImpact(mb, false, offhandWeapon.weaponType, Math.PI, offElemColor);
    }
  }

  function spawnShoutRings(mb, color, glowColor) {
    // Výrazné kruhy od obrázku nepřítele — jako když hodíš kámen do vody
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const aRect = arena.getBoundingClientRect();
    const bossFig = $('mbFigure');
    let bx = rect.width / 2, by = rect.height / 2;
    if (bossFig) {
      const br = bossFig.getBoundingClientRect();
      bx = br.left + br.width/2 - aRect.left;
      by = br.top + br.height/2 - aRect.top;
    }
    const canvas = $('mbProjectileCanvas');
    if (!canvas) return;
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    const startTime = performance.now();
    const duration = 800;
    const numRings = 5;

    function animate(ts) {
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / duration, 1);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < numRings; i++) {
        const ringDelay = i * 0.1;
        const ringProgress = Math.max(0, Math.min((progress - ringDelay) / (1 - ringDelay), 1));
        if (ringProgress <= 0) continue;
        const radius = 10 + ringProgress * 250;
        const alpha = (1 - ringProgress) * 0.8;
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 25;
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(bx, by, radius, 0, Math.PI * 2);
        ctx.stroke();
        // Výplň pro lepší viditelnost
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, radius);
        grad.addColorStop(0, `rgba(255,255,255,${alpha * 0.15})`);
        grad.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.05})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }
      if (progress < 1) requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(animate);
  }

  function spawnThunderClapAnim(mb) {
    // Výrazný bleskový efekt — bílý záblesk + tlusté modré praskliny přes celou arénu
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const canvas = $('mbProjectileCanvasOffhand');
    if (!canvas) return;
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    const startTime = performance.now();
    const duration = 400;

    // Střed arény
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const maxR = Math.max(rect.width, rect.height) * 0.6;

    // Generovat praskliny — silné, dlouhé, od středu
    const crackCount = 4 + Math.floor(Math.random() * 3); // 4-6
    const cracks = [];
    for (let i = 0; i < crackCount; i++) {
      const a = (i / crackCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const l = maxR * (0.4 + Math.random() * 0.6);
      const points = [{x: cx, y: cy}];
      const segs = 2 + Math.floor(Math.random() * 3);
      let px = cx, py = cy;
      let dir = a;
      for (let j = 0; j < segs; j++) {
        const segLen = l * (0.2 + Math.random() * 0.4) / segs;
        dir += (Math.random() - 0.5) * 0.6;
        px += Math.cos(dir) * segLen;
        py += Math.sin(dir) * segLen;
        points.push({x: px, y: py});
      }
      cracks.push(points);
    }

    function animate(ts) {
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / duration, 1);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fáze 1: bílý záblesk (0-20%)
      if (progress < 0.2) {
        const flashAlpha = (1 - progress / 0.2) * 0.5;
        ctx.save();
        ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      // Fáze 2: praskliny (10-100%)
      const crackProgress = Math.max(0, Math.min((progress - 0.1) / 0.6, 1));
      const fadeProgress = Math.max(0, (progress - 0.5) / 0.5);
      const alpha = 1 - fadeProgress;

      if (crackProgress > 0) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = alpha;

        // Vnější záře (tlustá, rozmazaná)
        ctx.shadowColor = 'rgba(93,173,226,0.8)';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = 'rgba(93,173,226,0.4)';
        ctx.lineWidth = 8;
        const totalSegments = cracks.reduce((sum, c) => sum + c.length - 1, 0);
        const drawnSegments = Math.floor(crackProgress * totalSegments);
        let segIdx = 0;
        cracks.forEach(points => {
          for (let j = 0; j < points.length - 1; j++) {
            if (segIdx >= drawnSegments) break;
            ctx.beginPath();
            ctx.moveTo(points[j].x, points[j].y);
            ctx.lineTo(points[j+1].x, points[j+1].y);
            ctx.stroke();
            segIdx++;
          }
        });

        // Hlavní čáry (tenčí, světlejší, nahoře)
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#a8d8ff';
        ctx.lineWidth = 3;
        segIdx = 0;
        cracks.forEach(points => {
          for (let j = 0; j < points.length - 1; j++) {
            if (segIdx >= drawnSegments) break;
            ctx.beginPath();
            ctx.moveTo(points[j].x, points[j].y);
            ctx.lineTo(points[j+1].x, points[j+1].y);
            ctx.stroke();
            segIdx++;
          }
        });

        ctx.restore();
      }

      if (progress < 1) requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(animate);
  }

  function spawnThunderBoltAnim(mb) {
    // Modrošedý projektil + modrá točící se spirála na impact
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const bossFig = $('mbFigure');
    let bx = rect.width / 2, by = rect.height / 2;
    if (bossFig) {
      const br = bossFig.getBoundingClientRect();
      const aRect = arena.getBoundingClientRect();
      bx = br.left + br.width/2 - aRect.left;
      by = br.top + br.height/2 - aRect.top;
    }
    const canvas = $('mbProjectileCanvas');
    if (!canvas) return;
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    const startTime = performance.now();
    const flyDuration = 300;
    const spiralDuration = 500;
    const totalDuration = flyDuration + spiralDuration;
    const startX = rect.width * 0.1;
    const startY = rect.height * 0.3;

    function animate(ts) {
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (progress < flyDuration / totalDuration) {
        // Fáze 1: projektil letí
        const flyPct = progress * totalDuration / flyDuration;
        const x = startX + (bx - startX) * flyPct;
        const y = startY + (by - startY) * flyPct;
        ctx.save();
        ctx.shadowColor = 'rgba(93,173,226,0.8)';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#5dade2';
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Fáze 2: spirála na impact
        const spiralPct = (progress * totalDuration - flyDuration) / spiralDuration;
        const alpha = 1 - spiralPct;
        ctx.save();
        ctx.strokeStyle = '#5dade2';
        ctx.shadowColor = 'rgba(93,173,226,0.6)';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (let t = 0; t < Math.PI * 4 * (1 - spiralPct); t += 0.1) {
          const r = 5 + t * 3;
          const sx = bx + Math.cos(t) * r;
          const sy = by + Math.sin(t) * r;
          if (t === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.restore();
      }
      if (progress < 1) requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(animate);
  }

  function spawnShieldBashAnim(mb) {
    // Velký šedý průhledný štít, letí shora dolů, zmenšuje se
    const arena = $('mbArena');
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const bossFig = $('mbFigure');
    let bx = rect.width / 2, by = rect.height / 2;
    if (bossFig) {
      const br = bossFig.getBoundingClientRect();
      const aRect = arena.getBoundingClientRect();
      bx = br.left + br.width/2 - aRect.left;
      by = br.top + br.height/2 - aRect.top;
    }
    const canvas = $('mbProjectileCanvas');
    if (!canvas) return;
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    const startTime = performance.now();
    const duration = 400;
    const startSize = rect.width * 1.2;
    const endSize = Math.min(rect.width, rect.height) * 0.5;

    function animate(ts) {
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / duration, 1);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const size = startSize + (endSize - startSize) * progress;
      const alpha = (1 - progress) * 0.5;
      const yOff = -rect.height * 0.3 + progress * rect.height * 0.5;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#888';
      ctx.shadowColor = 'rgba(136,136,136,0.4)';
      ctx.shadowBlur = 10;
      // Tvar štítu — obdélník se zaoblenými rohy + trojúhelník dole
      const s = size / 2;
      const sx = bx;
      const sy = by + yOff;
      ctx.beginPath();
      ctx.moveTo(sx - s * 0.6, sy - s * 0.8);
      ctx.lineTo(sx + s * 0.6, sy - s * 0.8);
      ctx.lineTo(sx + s * 0.6, sy + s * 0.2);
      ctx.lineTo(sx, sy + s * 0.8);
      ctx.lineTo(sx - s * 0.6, sy + s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      if (progress < 1) requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(animate);
  }

  function showVictorySkull(onClick) {
    const skull = $('mbVictorySkull');
    if (!skull) { if (onClick) onClick(); return; }
    skull.classList.remove('hidden');
    // Kliknutí kamkoliv na arénu
    const arena = $('mbArena');
    function onAnyClick() {
      skull.classList.add('hidden');
      skull.onclick = null;
      if (arena) arena.onclick = null;
      if (onClick) onClick();
    }
    skull.onclick = onAnyClick;
    if (arena) arena.onclick = onAnyClick;
  }

  function dimTimers() {
    ['mbPlayerTimerCircle','mbOffhandTimerCircle','mbEnemyTimerCircle','mbEnemyTimerBg'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.opacity = '0.08'; el.style.animation = 'none'; el.style.strokeDashoffset = '0'; }
    });
    const ring = document.getElementById('mbTimerRing');
    if (ring) ring.style.opacity = '0.15';
  }

  // Vrátí swing timer kruhy zpět do plné viditelnosti (inverze dimTimers).
  // Volá se při pack-přechodu na dalšího živého člena.
  function restoreTimers() {
    ['mbPlayerTimerCircle','mbOffhandTimerCircle','mbEnemyTimerCircle','mbEnemyTimerBg'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.opacity = '1'; el.style.animation = ''; el.style.strokeDashoffset = ''; }
    });
    const ring = document.getElementById('mbTimerRing');
    if (ring) ring.style.opacity = '1';
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
    const mb = mapBattleState;
    if (mb.ended) return;

    // Combo/opportunity se řeší přes PS tlačítka (onPsButton / onPsDefButton) — ne swipe.
    // Zbytek je boss swipe sekvence.

    if (!mb.sequence) return;
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
        spawnFloatingText(`+${healAmt}`, 'right', '#2ecc71', 32);
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
      spawnFloatingText('DODGE!', 'left', '#f39c12', 32);
      playSFX(dodgeSfx);
      // Počkat na vykreslení resetu před novým kolem
      requestAnimationFrame(() => {
        setTimeout(() => mapBattleTurn(), 0);
      });
      return;
    }

    const baseBossDmg = Math.max(8, 8 + mb.locId * 8 + mb.progress * 4);
    const diff = DIFFICULTIES[state.difficulty] || DIFFICULTIES[0];
    const diffMult = diff.mult;
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
    const glovesDef = ITEM_MAP[state.hero.equip.gloves]?.defense || 0;
    const bootsDef = ITEM_MAP[state.hero.equip.boots]?.defense || 0;
    let totalDefense = armorDef + helmetDef + shieldDef + glovesDef + bootsDef;
    if (state.defensiveShoutArmorPct > 0) totalDefense = Math.round(totalDefense * (1 + state.defensiveShoutArmorPct / 100));
    if (totalDefense > 0) {
      bossDmg = Math.round(bossDmg * (1 - totalDefense / (totalDefense + 300)));
    }
    let amount = bossDmg;

    // Pasivní blok — pokud má hráč štít, šance na vyblokování damage
    let blocked = false;
    const shieldItem = ITEM_MAP[state.hero.equip.shield];
    if (shieldItem && getPlayerBlockChance() > 0) {
      if (Math.random() * 100 < getPlayerBlockChance()) {
        blocked = true;
        amount = 0;
        playSFX(blockSfx);
      }
    }

    if (!blocked) {
      mb.playerHp -= amount;
    }
    // Life steal — jen pokud nebylo blokováno
    if (!blocked && lifeStealAmt > 0 && !mb._preventHealActive) {
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

    const enemyIconPath2 = (mb.isBoss ? (mb.loc && mb.loc.boss && mb.loc.boss.face) : mb.monsterFace);
    spawnFloatingText(blocked ? '🛡️ BLOCK!' : `-${amount}`, 'left', blocked ? '#3498db' : '#fff', 32, 2000, (enemyIconPath2 && enemyIconPath2.startsWith('assets/')) ? enemyIconPath2 : null);

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
    const baseDmg = mb.baseDmg || (2 + Math.floor(state.hero.level * 1) + getWeaponDmg(weapon) + ((state.hero.attrStr||0) + getEquipAttrs().str)*0.5);
    let dmg = Math.max(1, Math.round(baseDmg * 0.3));
    mb.bossHp -= dmg;
    // Damage text
    spawnFloatingText(`-${dmg}`, 'right', '#fff', 32);
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

  function dealPlayerDamage(mb, mult, isOffhand = false) {
    const weapon = isOffhand
      ? (ITEM_MAP[state.hero.equip.shield] || ITEM_MAP['fists'])
      : (ITEM_MAP[state.hero.equip.weapon] || ITEM_MAP['fists']);
    const isStaff = weapon.weaponType === 'staff';
    // Passive weapon specialization bonus (barbarian)
    const spec = getWeaponSpecBonus(weapon, isOffhand);
    // 🎲 ATTACK TABLE — D2 formule (pouze pro fyzické útoky, ne pro kouzla)
    if (!isStaff) {
      const at = getPlayerAttackTable(mb, spec.arMult);
      const roll = Math.random() * 100;
      if (roll >= at.hitChance) {
        // MISS!
        spawnFloatingText('MISS!', 'right', '#fff', 32);
        playSFX(dodgeSfx);
        if (!mb._combatLoop) advanceSequence();
        return;
      }
    }
    // 💨 Evasion — Vlk uhýbá hráčovým útokům (30% šance)
    if (mb._evasionActive && Math.random() < 0.3) {
      spawnFloatingText('💨 Evasion!', 'right', '#f1c40f', 32);
      playSFX(dodgeSfx);
      if (!mb._combatLoop) advanceSequence();
      return;
    }
    // 🛡️ Monster block — Troll blokuje hráčův útok štítem
    if (mb.monsterBlockChance > 0 && Math.random() * 100 < mb.monsterBlockChance) {
      spawnFloatingText('🛡️ Block!', 'right', '#3498db', 28);
      playSFX(blockSfx);
      if (!mb._combatLoop) advanceSequence();
      return;
    }
    // HIT — normální damage
    let baseDmg;
    if (isStaff) {
      // Mágův základní útok — magický, INT-based, ignoruje armor, ale podléhá resistům
      const eqAttrs = getEquipAttrs();
      const intBonus = (state.hero.attrInt||0) + eqAttrs.int;
      baseDmg = 2 + Math.floor(state.hero.level * 0.8) + getWeaponDmg(weapon) + Math.floor(intBonus * 0.3);
    } else {
      baseDmg = mb.baseDmg || (2 + Math.floor(state.hero.level * 0.8) + getWeaponDmg(weapon) + ((state.hero.attrStr||0) + getEquipAttrs().str)*0.3);
    }
    let dmg = Math.round(baseDmg * mult * spec.dmgMult * (isOffhand ? spec.offHandMult : getShieldSpecDmgMult()));
    // Rozptyl ±1 — každá rána je jiná
    dmg += Math.floor(Math.random() * 3) - 1; // -1, 0, +1
    dmg = Math.max(1, dmg);
    // Aplikovat magic resist pro staff útok
    if (isStaff) {
      const schoolId = state.activeSchool || 'fire';
      const resist = getSchoolResistMult(schoolId);
      dmg = Math.max(1, Math.round(dmg * resist));
    }
    // D4/D5 — přehřívání: každý úspěšný útok zvyšuje heat
    if (mb.locId === 3 || mb.locId === 4) {
      mb._heatLevel = Math.min((mb._heatLevel || 0) + 1, 10);
    }
    
    // 🎯 Crit chance ze zbraně + passive specialization — náhodná šance na 2.0× poškození
    const critChance = (weapon.critChance || 0) + spec.critBonus;
    let isCrit = false;
    if (critChance > 0 && Math.random() * 100 < critChance) {
      dmg = Math.round(dmg * 2.0);
      isCrit = true;
    }
    
    // Zvuk — crit má vlastní zvuk, jinak normální (off-hand hraje zvuk své zbraně)
    playSFX(isCrit ? getCritSfx(isOffhand ? weapon.weaponType : undefined) : getHitSfx(isOffhand ? weapon.weaponType : undefined));
    // Občasný zásahový zvuk (30% šance)
    playSFX(getEnemyHitSfx());

    // ❄️ Ledové poškození ze zbraně — lehký chill efekt
    const coldDmgVal = Array.isArray(weapon.coldDmg) ? weapon.coldDmg[1] : (weapon.coldDmg || 0);
    if (coldDmgVal > 0) {
      mb._enemySlowPct = 15; // 15% zpomalení
      mb._enemySlowTimer = 180; // 3s
      mb._enemySlowMax = 180;
      // Přepočítat enemy swing timer se zpomalením
      const now = performance.now();
      const oldMs = mb.enemySwingMs;
      const elapsed = now - mb._enemySwingStart;
      const progress = Math.min(elapsed / oldMs, 1);
      mb.enemySwingMs = getEnemySwingTime(mb);
      mb._enemySwingStart = now - progress * mb.enemySwingMs;
      _sessionDebuffs['slow_weapon_ice'] = { icon: '❄️', name: 'Chill 15%', iconImg:'chill.png', ticks: 180, maxTicks: 180 };
      // Modrý záblesk
      const arena = $('mbArena');
      if (arena) {
        arena.style.transition = 'background-color 0.15s';
        arena.style.backgroundColor = 'rgba(74,125,255,0.2)';
        setTimeout(() => { arena.style.backgroundColor = ''; setTimeout(() => { arena.style.transition = ''; }, 200); }, 150);
      }
    }

    // ☠️ Jedové poškození ze zbraně — DoT na nepřítele
    const poisonDmgVal = Array.isArray(weapon.poisonDmg) ? weapon.poisonDmg[1] : (weapon.poisonDmg || 0);
    const poisonDurVal = weapon.poisonDur || 0;
    if (poisonDmgVal > 0 && poisonDurVal > 0) {
      const poisonResist = getLocAffix('poisonResist');
      const effectiveDmg = Math.round(poisonDmgVal * (1 - poisonResist));
      if (effectiveDmg > 0) {
        // D2 styl: refresh duration, rate = total/dur
        const tickDmg = Math.max(1, Math.round(effectiveDmg / poisonDurVal));
        mb.enemyDot = tickDmg;
        mb.enemyDotTicksLeft = poisonDurVal;
        _lastEnemyDotTick = performance.now();
        _sessionDebuffs['weapon_poison'] = { icon: '☠️', name: 'Jed', ticks: poisonDurVal * 60, maxTicks: poisonDurVal * 60 };
        // Zelený záblesk
        const arena = $('mbArena');
        if (arena) {
          arena.style.transition = 'background-color 0.15s';
          arena.style.backgroundColor = 'rgba(46,204,113,0.2)';
          setTimeout(() => { arena.style.backgroundColor = ''; setTimeout(() => { arena.style.transition = ''; }, 200); }, 150);
        }
      }
    }

    // ☠️ Poisoned Weapon (assassin talent) — pasivní jed na každý útok
    if (state.heroClass === 'assassin') {
      const pwLv = getTalentLv('assassin_poisonedWeapon');
      if (pwLv > 0) {
        const poisonBaseDmg = 15 + (pwLv - 1) * 10; // 15, 25, 35, 45, 55
        const poisonDur = 3; // vždy 3s
        const poisonResist = getLocAffix('poisonResist');
        const effectiveDmg = Math.round(poisonBaseDmg * (1 - poisonResist));
        if (effectiveDmg > 0) {
          const tickDmg = Math.max(1, Math.round(effectiveDmg / poisonDur));
          mb.enemyDot = tickDmg;
          mb.enemyDotTicksLeft = poisonDur;
          mb.enemyPoisonBaseDmg = poisonBaseDmg; // pro poisonExplosion
          _lastEnemyDotTick = performance.now(); // první tick až za 1s, poslední v 0s = konec debuffu
          _sessionDebuffs['poisonedWeapon_poison'] = { icon: '☠️', name: 'Jed (talent)', ticks: poisonDur * 60, maxTicks: poisonDur * 60 };
          // Zelený záblesk
          const arena = $('mbArena');
          if (arena) {
            arena.style.transition = 'background-color 0.15s';
            arena.style.backgroundColor = 'rgba(46,204,113,0.2)';
            setTimeout(() => { arena.style.backgroundColor = ''; setTimeout(() => { arena.style.transition = ''; }, 200); }, 150);
          }
        }
      }
    }

    // Melee impact efekt na místě bosse — barva podle elementárního poškození zbraně
    const angleOff = isOffhand ? Math.PI : 0;
    if (!mb._skipMeleeImpact) {
      let elementColor = null;
      function hasDmg(v) { return Array.isArray(v) ? v[1] > 0 : (v > 0); }
      if (hasDmg(weapon.fireDmg)) elementColor = '#e67e22';
      else if (hasDmg(weapon.coldDmg)) elementColor = '#4a7dff';
      else if (weapon.poisonDmg) elementColor = '#2ecc71';
      else if (hasDmg(weapon.lightningDmg)) elementColor = '#8b5cf6';
      spawnMeleeImpact(mb, isCrit, weapon.weaponType, angleOff, elementColor);
    }
    mb._skipMeleeImpact = false;

    mb.bossHp -= dmg;

    // 🌵 Thorns (D2: of Thorns/Spikes/Razors/Swords) — nepřítel vrací dmg hráči při každém zásahu
    const thornsVal = getEquipStat('thorns');
    if (thornsVal > 0 && !isOffhand) {
      const thornDmg = Math.max(1, Math.round(thornsVal * (0.5 + Math.random() * 0.5)));
      mb.playerHp -= thornDmg;
      if (mb.playerHp <= 0) { endMapBattle(false); return; }
      setTimeout(() => spawnFloatingText(`🌵 -${thornDmg}`, 'right', '#f1c40f', 28), 300);
    }

    // 💥 Knockback (D2: of Bear) — přeruší útok nepřítele
    if (getEquipStat('knockback') > 0 && !isOffhand) {
      mb._enemySwingReady = false;
      mb._enemySwingStart = performance.now();
      mb.enemySwingMs = getEnemySwingTime(mb);
      spawnFloatingText('💥 Knockback!', 'right', '#e67e22', 28);
    }

    // 🚫 Prevent Monster Heal (D2: of Vileness) — nepřítel se nemůže léčit
    if (getEquipStat('preventHeal') > 0 && !isOffhand) {
      mb._preventHealActive = true;
    }

    // Fáze 4: hit-flash — jemné rozzáření monstra při zásahu (bez agresivního glow)
    const hitFig = $('mbFigure');
    if (hitFig) {
      hitFig.style.transition = 'filter 0.08s';
      hitFig.style.filter = 'brightness(1.6) saturate(1.2)';
      setTimeout(() => {
        hitFig.style.filter = 'brightness(1)';
        setTimeout(() => { hitFig.style.transition = ''; }, 80);
      }, 80);
      // Fáze 4: impact bump — krátký "náraz" (iluze hit-stopu) bez zásahu do herní logiky
      const arena = $('mbArena');
      if (arena) {
        arena.style.transition = 'transform 0.05s';
        arena.style.transform = 'scale(0.995)';
        setTimeout(() => {
          arena.style.transition = 'transform 0.12s ease-out';
          arena.style.transform = 'scale(1)';
          setTimeout(() => { arena.style.transition = ''; arena.style.transform = ''; }, 130);
        }, 50);
      }
    }

    // Monster rage gain za obdržení poškození (Troll, Medvěd)
    if (mb.monsterResource === 'rage') {
      mb.enemyMana = Math.min(mb.maxEnemyMana, (mb.enemyMana || 0) + 3);
    }

    // 🌵 Thorn Shield — vrací 5-10 dmg hráči při každém zásahu
    if (mb._thornShieldActive) {
      const thornDmg = 5 + Math.floor(Math.random() * 6); // 5-10
      mb.playerHp -= thornDmg;
      if (mb.playerHp <= 0) { endMapBattle(false); return; }
      // Zpožděný floating text, aby se nekryl s útočným textem
      setTimeout(() => {
        spawnFloatingText(`🌵 -${thornDmg}`, 'right', '#f1c40f', 28);
      }, 300);
    }

    // Smrtelný zásah — okamžitě zastavit timery, červený záblesk, pak death exploze
    if (mb.bossHp <= 0 && !mb._pendingKill) {
      mb._pendingKill = true;
      // Zajistit, že se endMapBattle vždy naplánuje, i kdyby níže něco hodilo výjimku
      setTimeout(() => {
        if (!mapBattleState.ended) {
          endMapBattle(true);
          try { spawnDeathEffect(mb); } catch (e) {}
        }
      }, 300);
      try {
        // Divočina má jednu hudbu skrze vše — victory/lose hudbu nemění.
        updateMapBattleUI();
        cleanupTimers();
        dimTimers();
        // Červený záblesk arény
        const arena = $('mbArena');
        if (arena) {
          arena.style.transition = 'background 0.15s';
          arena.style.background = 'rgba(200,0,0,0.3)';
          setTimeout(() => { arena.style.background = 'rgba(200,0,0,0.6)'; }, 100);
          setTimeout(() => { arena.style.background = ''; }, 250);
        }
      } catch (e) {
        console.error('Chyba v kill cestě (hra pokračuje k výsledku):', e);
      }
      return;
    }

    // 🩸 Life steal a 💜 Mana steal z equipu (procentuálně z uděleného dmg)
    const eqItems = [weapon, ITEM_MAP[state.hero.equip.ring1], ITEM_MAP[state.hero.equip.ring2], ITEM_MAP[state.hero.equip.amulet], ITEM_MAP[state.hero.equip.gloves]].filter(Boolean);
    const totalLifeSteal = eqItems.reduce((sum, it) => sum + (it.lifesteal || 0), 0);
    const totalManaSteal = eqItems.reduce((sum, it) => sum + (it.manaSteal || 0), 0);
    if (totalLifeSteal > 0) {
      const lifestealReduction = getLocAffix('lifestealReduction');
      const effectiveLifeSteal = Math.round(totalLifeSteal * (1 - lifestealReduction));
      if (effectiveLifeSteal > 0) {
        const healAmt = Math.max(1, Math.round(dmg * effectiveLifeSteal / 100));
        state.hero.hp = Math.min(state.hero.maxHp, (state.hero.hp || 0) + healAmt);
        spawnFloatingText(`+${healAmt}`, 'right', '#2ecc71', 28);
      }
    }
    if (totalManaSteal > 0) {
      const manaAmt = Math.max(1, Math.round(dmg * totalManaSteal / 100));
      state.hero.mana = Math.min(state.hero.maxMana, (state.hero.mana || 0) + manaAmt);
    }
    
    spawnFloatingText(isCrit ? `💥 -${dmg}` : `-${dmg}`, 'right', isCrit ? '#e74c3c' : '#fff', isCrit ? 36 : 32, 2000, (weapon.iconImg ? weapon.iconImg : null));
    const bossFig = $('mbFigure');
    if (bossFig) {
      bossFig.style.transition = 'filter 0.15s';
      bossFig.style.filter = 'brightness(2) saturate(1.5)';
      setTimeout(() => { bossFig.style.filter = 'brightness(1)'; setTimeout(() => { bossFig.style.transition = ''; }, 200); }, 100);
    }
    // Canvas melee impact — seknutí nebo tupý úder
    updateMapBattleUI();
  }

  // ===== LOOT SYSTEM =====
  // Šablony pro názvy itemů podle typu a tieru


  function generateLootItem(locId, floor, bossDrop, monsterLevel) {
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
    // ilvl lootu = skutečný monster level (do capu 60) — endgame affixy tak reálně rostou.
    // Fallback (pokud se monsterLevel nepředá): starý vzorec 5 + floor*2.
    const mLvl = (monsterLevel != null && monsterLevel > 0) ? monsterLevel : (5 + floor * 2 + (bossDrop ? 5 : 0));

    // 0. Roll quality (fixní šance, nezávislé na levelu)
    let quality = rollQuality();

    // 1. Vybrat typ a base item z ITEMS podle floor/tieru
    const typeRoll = Math.random();
    let type, subtype;
    if (typeRoll < 0.28) {
      type = 'weapon';
      const weaponTypes = ['blade','blade','axe','axe','blunt','blunt','claws','claws','blunt'];
      subtype = weaponTypes[rand(0, weaponTypes.length - 1)];
    }
    else if (typeRoll < 0.53) { type = 'armor'; subtype = null; }
    else if (typeRoll < 0.73) { type = 'helmet'; subtype = null; }
    else if (typeRoll < 0.90) { type = 'shield'; subtype = null; }
    else if (typeRoll < 0.95) { type = 'ring'; subtype = null; }
    else if (typeRoll < 0.975) { type = 'gloves'; subtype = null; }
    else if (typeRoll < 1.0) { type = 'boots'; subtype = null; }
    else { type = 'amulet'; subtype = null; }

    // Common itemy jen pro zbroj a zbraně (jako Diablo 2)
    if (quality === 'normal' && (type === 'ring' || type === 'amulet')) {
      quality = 'magic';
    }

    // 2. Najít base item z ITEMS podle typu a dropFloor — weighted výběr (vyšší tier = vyšší váha)
    // Globální patro: obtížnost*50 + act*10 + patro (5 actů × 10 pater × 3 obtížnosti = 150)
    const globalFloor = (state.difficulty || 0) * 50 + locId * 10 + floor;
    const candidates = ITEMS.filter(i => {
      if (type === 'weapon') return i.type === 'weapon' && i.weaponType === subtype && (i.dropFloor ?? 0) <= globalFloor;
      return i.type === type && (i.dropFloor ?? 0) <= globalFloor;
    });
    if (candidates.length === 0) return null;
    // Weighted výběr: váha = tier, takže vyšší tier je častější, ale nižší taky padá
    const totalTierWeight = candidates.reduce((s, c) => s + c.tier, 0);
    let rw = Math.random() * totalTierWeight;
    let baseItem = candidates[0];
    for (const c of candidates) {
      rw -= c.tier;
      if (rw <= 0) { baseItem = c; break; }
    }
    if (!baseItem) return null; // žádný vhodný item pro tento typ/tier

    // 3. Unique — najít unikát pro tento base item
    if (quality === 'unique') {
      const uniqueDef = pickUniqueForBase(baseItem.id);
      if (uniqueDef) {
        const item = generateUniqueItem(uniqueDef);
        if (item) {
          item.tier = tier;
          item.subtype = subtype;
          item.rarity = 'unique';
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
    const item = generateLootItemWithAffixes(baseItem, quality, mLvl);
    item.tier = tier;
    item.subtype = subtype;
    // Rarity odvodit z finálního item.quality (mohlo být degradováno na normal,
    // když pro daný level neexistuje affix — viz generateLootItemWithAffixes).
    // Dřív se používal původní parametr quality, takže item byl vnitřně common,
    // ale na victory page zářil jako rare. To je ten rozpor.
    item.rarity = item.quality === 'normal' ? 'common' : item.quality === 'magic' ? 'magic' : 'rare';
    item.icon = type === 'weapon' ? LOOT_ICONS['weapon_' + subtype] : LOOT_ICONS[type];
    item.cost = 10 + tier * 20 + (item.affixes || []).length * 15;

    // 5. ExpertiseRating podle rarity
    // ⚠️ Attack Rating (AR) pochází JEN z affixů (D2: Keen/Sharp/Fine...), viz affixes.ts.
    //    Žádná pseudo-náhodná generace AR na item — v D2 AR dává pouze affix.
    if (item.rarity !== 'common') {
      const expChance = item.rarity === 'magic' ? 0.2 : 0.5;
      if (Math.random() < expChance) item.expertiseRating = 1 + rand(0, Math.ceil(tier * 0.4));
    }
    // Crit chance se generuje JEN z modů (affixů) — žádný base crit na zbraních.
    // Block chance štítů je 25% (base) + bonus z obratnosti (dex) — viz výpočet obrany.

    ITEM_MAP[item.id] = item;
    state.lootItems = state.lootItems || {};
    state.lootItems[item.id] = item;
    return item;
  }

  function rollLoot(locId, floor, bossDrop, monsterLevel) {
    const h = state.hero;
    // 8% chance for town portal scroll (non-boss)
    if (!bossDrop && Math.random() < 0.08) {
      const scroll = ITEM_MAP['townPortalScroll'];
      if (scroll) {
        return { type:'item', item: scroll };
      }
    }
    // 5% chance for gem (non-boss)
    if (!bossDrop && Math.random() < 0.05) {
      const gemTypes = ['ruby', 'sapphire', 'emerald', 'topaz'];
      // Anti-repeat: pokud už v tomhle kole padl stejný typ, zkusit jiný
      const usedGems = state._floorLootDrops
        ? state._floorLootDrops.filter(d => d.type === 'item' && d.item && d.item.type === 'gem').map(d => d.item.id.split('_')[0])
        : [];
      let available = gemTypes.filter(t => !usedGems.includes(t));
      if (available.length === 0) available = gemTypes;
      const type = available[rand(0, available.length - 1)];
      // Quality based on floor — širší paleta už od nízkých floorů
      const qIdx = floor < 1 ? 0 : floor < 3 ? rand(0,1) : floor < 5 ? rand(0,2) : floor < 7 ? rand(0,3) : rand(0,4);
      const quality = GEM_QUALITIES[qIdx];
      const gemId = type + (quality === 'normal' ? '' : '_' + quality);
      const gem = ITEM_MAP[gemId];
      if (gem) {
        return { type:'item', item: gem };
      }
    }
    // 10% chance for potion (non-boss)
    if (!bossDrop && Math.random() < 0.10) {
      // Potion tier podle aktu: Act N (locId) dává hlavně potion tier locId+1,
      // s menší šancí i nižší tiers (dosažené). Act1=Light, Act2=Healing, ... Act5=Godly.
      const potTier = Math.min(5, (locId || 0) + 1);
      const isHeal = Math.random() < 0.6;
      // Většinou (70%) nejsilnější tier aktu, jinak náhodný nižší
      const pickTier = Math.random() < 0.7 ? potTier : (1 + rand(0, potTier - 1));
      const base = isHeal ? 'healingPotion' : 'manaPotion';
      const potionId = pickTier === 1 ? base : base + pickTier;
      const potion = ITEM_MAP[potionId];
      if (potion) {
        return { type:'item', item: potion };
      }
    }
    if (bossDrop) {
      // Boss: zaručený item s vyšším tierem + goldy
      const item = generateLootItem(locId, floor, true, monsterLevel);
      if (!item) return { type:'gold', gold: 10 + floor * 3 };
      const gf = getGoldFind();
      const gold = Math.round((5 + floor * 3 + rand(0, 5)) * (1 + gf / 100));
      return { type:'boss', item, gold };
    }
    // 70% gold, 30% item
    if (Math.random() < 0.7) {
      // Gold reward
      const gf = getGoldFind();
      const gold = Math.round((2 + floor * 2 + rand(0, 3)) * (1 + gf / 100));
      return { type:'gold', gold };
    } else {
      // Item reward
      const item = generateLootItem(locId, floor, false, monsterLevel);
      if (!item) return { type:'gold', gold: 3 + floor * 2 };
      return { type:'item', item };
    }
  }

  function endMapBattle(won) {
    if (mapBattleState.ended) return;
    const mb = mapBattleState;
    const locId = mb.locId;
    const totalZones = mb.loc.zones || 10;

    // ===== PACK: smrt jednoho člena → přepnout na dalšího živého, neukončovat =====
    if (won && !mb.isBoss && mb.packMembers) {
      // Ověřit, že aktivní člen skutečně umřel — jinak to je stale timer (z vícekém
      // setTimeout kill cest), který nesmí označit živého člena za mrtvého.
      if (mb.bossHp > 0) {
        // Ještě žije — ignorovat duplicitní kill timer
        mb._pendingKill = false;
        return;
      }
      if (packTryAdvance(mb)) {
        // Znovu spustit combat loop pro nového člena (reset timery už obstaral resetEnemyCombatState)
        mb.ended = false;
        mb._pendingKill = false;
        document.body.classList.add('battle-active');
        restoreTimers();
        // Restartovat stamina/energy regen interval (cleanupTimers ho zrušil)
        if (mb._staminaInterval) clearInterval(mb._staminaInterval);
        mb._staminaInterval = setInterval(() => {
          if (mb.ended) { clearInterval(mb._staminaInterval); mb._staminaInterval = null; return; }
          if (mb.stamina < mb.maxStamina) mb.stamina = Math.min(mb.maxStamina, mb.stamina + 0.15);
          if (mb.monsterResource === 'mana' && mb.enemyMana < mb.maxEnemyMana) mb.enemyMana = Math.min(mb.maxEnemyMana, mb.enemyMana + 0.05);
          if (mb.monsterResource === 'energy' && mb.enemyMana < mb.maxEnemyMana) mb.enemyMana = Math.min(mb.maxEnemyMana, mb.enemyMana + 0.15);
          updateMapBattleUI();
        }, 100);
        updateMapBattleUI();
        startAutoCombat();
        return;
      }
      // Všichni mrtví → pokračuje se na normální výhru
    }

    // Monster killed - regular enemy
    if (won && !mb.isBoss) {
      mapBattleState.ended = true;
      cleanupTimers();
      // Inkrementovat fight v rámci oblasti
      let af = (state.areaFightProgress[locId] || 0) + 1;
      state.areaFightProgress[locId] = af;
      // 💥 Elita umírá — element nova (Fire/Cold Enchanted D2 death efekt).
      // U packu (elita+minioni) nova už proběhla při smrti leadera v packTryAdvance.
      if (mb.isElite && mb.eliteAffix && mb.eliteAffix.death && !mb.packMembers) {
        const arena = $('mbArena');
        if (arena) {
          const color = mb.eliteAffix.death === 'nova-fire' ? 'rgba(231,76,60,0.5)' : 'rgba(52,152,219,0.5)';
          arena.style.transition = 'background-color 0.15s';
          arena.style.backgroundColor = color;
          setTimeout(() => { arena.style.backgroundColor = ''; setTimeout(() => { arena.style.transition = ''; }, 200); }, 150);
        }
        spawnFloatingText(mb.eliteAffix.death === 'nova-fire' ? '🔥 Nova!' : '❄️ Nova!', 'right', mb.eliteAffix.death === 'nova-fire' ? '#e74c3c' : '#3498db', 40);
        playTone(mb.eliteAffix.death === 'nova-fire' ? 110 : 220, 0.25, 'sawtooth', 0.12);
      }
      // Po 10 soubojích je zastávka dokončená — vítězná obrazovka s obrázkem zastávky.
      // Progress do další zastávky se posune až po stisknutí Next Fight (continueToNextStop).
      if (af >= 10) {
        state.areaFightProgress[locId] = 10;
      }
      const p = state.locationProgress[locId] || 0;
      const monsterGold = (1 + rand(0, 2)) * 5;
      const xpMod = getXpModifier(mb);
      // Base XP roste s levelem monstra (D2: XP = f(mLVL)); penalizace za rozdíl levelů.
      // Pack (elita+2 minioni / 3 champs) — bonus XP za extra nepřátele
      const packSize = mb.packMembers ? mb.packMembers.length : 1;
      const xpGain = Math.round(getMonsterLevel(mb, state.difficulty || 0) * 30 * xpMod * packSize);
      state.hero.gold = (state.hero.gold || 0) + monsterGold;
      state.hero.xp = (state.hero.xp || 0) + xpGain;
      state.hero.hp = mb.playerHp;
      state._playerDot = mb.playerDot || 0;
      state._playerDotTicksLeft = mb.playerDotTicksLeft || 0;
      state.wins = (state.wins || 0) + 1;
      const leveled = applyLevelUp();
      // Loot roll — 2-3 itemy na kill; u packu za KAŽDÉHO člena (minioni/champi/elita)
      const packCount = mb.packMembers ? mb.packMembers.length : 1;
      state._floorLootDrops = state._floorLootDrops || [];
      for (let mem = 0; mem < packCount; mem++) {
        const numLoot = 2 + rand(0, 1);
        for (let li = 0; li < numLoot; li++) {
          const loot = rollLoot(locId, mb.progress, false, getMonsterLevel(mb, state.difficulty || 0));
          if (!loot) continue;
          state._floorLootDrops.push(loot);
          if (loot.type === 'item' || loot.type === 'boss') {
            if (loot.item) {
              if (loot.item.id === 'townPortalScroll') {
                state.townPortalCount = (state.townPortalCount || 0) + 1;
              } else if (loot.item.type === 'consumable' && (loot.item.subtype === 'heal' || loot.item.subtype === 'mana') && addPotionToBelt(loot.item.id)) {
                // Potion se vložil do opasku
              } else {
                addToInventory(state.hero.inventory, loot.item.id);
              }
            }
          }
          if (loot.type === 'gold' || loot.type === 'boss') {
            state.hero.gold = (state.hero.gold || 0) + (loot.gold || 0);
          }
        }
      }
      saveGame();
      sfxSuccess();

      mapBattleState.ended = true;
      cleanupTimers();
      saveGame();
      // Sumarizace lootu
      let totalLootGold = 0;
      const lootItems = [];
      let tpScrollsFromLoot = 0;
      (state._floorLootDrops || []).forEach(d => {
        if (d.type === 'gold') totalLootGold += d.gold;
        else if (d.type === 'item') {
          if (d.item && d.item.id === 'townPortalScroll') {
            tpScrollsFromLoot++;
          } else {
            lootItems.push(d.item);
          }
        }
        else if (d.type === 'boss') { lootItems.push(d.item); totalLootGold += d.gold; }
      });
      state._floorLootDrops = [];
      const isStopComplete = (state.areaFightProgress[locId] || 0) >= 10;
      $('resultScreen').classList.remove('centered');
      // Ukázat obrázek aktuální zastávky (všechny akty)
      const curStopIdx = Math.min(Math.max(state.locationProgress[locId] || 0, 0), 9);
      const curStopName = (STOP_NAMES_EN[locId] && STOP_NAMES_EN[locId][curStopIdx]) || null;
      const locName = mb.loc ? mb.loc.name : `Act ${locId+1}`;
      const areaNum = (state.locationProgress[locId] || 0) + 1;
      const fightNum = (state.areaFightProgress[locId] || 0);
      const stopNameEn = getStopName(locId, curStopIdx, true);
      const winTitle = 'Victory!';
      const winSub = `${locName} · ${stopNameEn ? stopNameEn : (curStopName ? 'Area ' + curStopName : 'Area ' + areaNum)}${isStopComplete ? ' · Area Complete' : ` · Fight ${fightNum}/10`}`;
      // Stav hráče — overlay dole na obrázku zastávky (HP, mana, buffy, potiony)
      const oh = state.hero;
      const ohpPct = Math.round(oh.hp / oh.maxHp * 100);
      const ohpColor = ohpPct > 50 ? '#e74c3c' : ohpPct > 20 ? '#e67e22' : '#ff4444';
      const oManaHtml = `💧 ${Math.round(state.mana)}/${Math.round(state.maxMana)}`;
      // Potiony v opasku
      const ovBpSlots = oh.equip.beltPotionSlots || [];
      const ovPotCounts = {};
      ovBpSlots.forEach(pid => { if (pid) { const p = ITEM_MAP[pid]; if (p && (p.subtype === 'heal' || p.subtype === 'mana')) ovPotCounts[pid] = (ovPotCounts[pid] || 0) + 1; } });
      // Heal potiony — od nejsilnějšího po nejslabší (tier 5→1), sloupec vlevo dole
      const healOrder = ['healingPotion5','healingPotion4','healingPotion3','healingPotion2','healingPotion'];
      const healPotsHtml = healOrder
        .filter(id => ovPotCounts[id])
        .map(id => {
          const p = ITEM_MAP[id];
          return `<div class="result-status-potion" onclick="game.usePotionFromResult('${id}')" title="${p.name} (${ovPotCounts[id]})">
          ${renderItemIcon(p, 0)}
          <span class="result-status-potion-count">${ovPotCounts[id]}</span>
        </div>`;
        }).join('');
      // Mana potiony — od nejsilnějšího po nejslabší, sloupce vpravo dole
      const manaOrder = ['manaPotion5','manaPotion4','manaPotion3','manaPotion2','manaPotion'];
      const manaPotsHtml = manaOrder
        .filter(id => ovPotCounts[id])
        .map(id => {
          const p = ITEM_MAP[id];
          return `<div class="result-status-potion" onclick="game.usePotionFromResult('${id}')" title="${p.name} (${ovPotCounts[id]})">
          ${renderItemIcon(p, 0)}
          <span class="result-status-potion-count">${ovPotCounts[id]}</span>
        </div>`;
        }).join('');
      // Buffy a debuffy hráče — overlay na obrázku zastávky (hned nad životy)
      // Konzistentní s renderBuffs v souboji: pokud má buff/debuff iconImg, zobrazí
      // se obrázek, jinak emoji fallback. Žádný hardcoded whitelist.
      let ovBuffsHtml = '';
      Object.keys(_sessionBuffs).forEach(k => {
        const b = _sessionBuffs[k];
        if (b && b.ticks > 0) {
          const hasImg = b.iconImg;
          ovBuffsHtml += `<span class="result-status-buff" data-name="${b.name}">${hasImg ? `<img src="assets/spells/${b.iconImg}" style="width:40px;height:40px;object-fit:contain">` : b.icon}</span>`;
        }
      });
      Object.keys(_playerDebuffs).forEach(k => {
        const d = _playerDebuffs[k];
        if (d && d.ticks > 0) {
          const hasImg = d.iconImg;
          ovBuffsHtml += `<span class="result-status-buff" data-name="${d.name}">${hasImg ? `<img src="assets/spells/${d.iconImg}" style="width:40px;height:40px;object-fit:contain">` : (d.icon || '☠️')}</span>`;
        }
      });
      const statsOverlay = `<div class="stop-result-stats">
        ${ovBuffsHtml ? `<div class="stop-result-buffs">${ovBuffsHtml}</div>` : ''}
        <div class="stop-result-hpbar">
          <span style="color:${ohpColor}">❤️ ${oh.hp}/${oh.maxHp} (${ohpPct}%)</span>
          <span style="color:#4a7dff">${oManaHtml}</span>
        </div>
        ${healPotsHtml ? `<div class="stop-result-potions stop-result-potions-heal">${healPotsHtml}</div>` : ''}
        ${manaPotsHtml ? `<div class="stop-result-potions stop-result-potions-mana">${manaPotsHtml}</div>` : ''}
      </div>`;
      // Všem akty zobrazit obrázek zastávky
      $('resultIcon').innerHTML = `<div class="stop-result-wrap">
        <img class="result-icon-img stop-result" src="${getStopImage(locId, curStopIdx)}" alt="Zastávka">
        <div class="stop-result-overlay">
          <div class="stop-result-title">${winTitle}</div>
          <div class="stop-result-sub">${winSub}</div>
        </div>
        ${statsOverlay}
      </div>`;
      $('resultTitle').textContent = '';
      $('resultMsg').innerHTML = '';
      let lootListHtml = '';
      if (lootItems.length > 0) {
        lootItems.forEach(item => {
          const r = RARITY[item.rarity] || RARITY.common;
          lootListHtml += `<div class="loot-scroll-item" style="border-left:3px solid ${r.border}"><span class="loot-scroll-icon">${renderItemIcon(item,32)}</span><span class="loot-scroll-name" style="color:${r.color}">${getItemSocketName(item)}</span></div>`;
        });
      }
      if (tpScrollsFromLoot > 0) {
        lootListHtml += `<div class="loot-scroll-item"><span class="loot-scroll-icon"><img src="assets/items/town_portal_scroll.png" style="width:32px;height:32px;object-fit:contain"></span><span class="loot-scroll-name" style="color:#f1c40f">Town Portal Scroll ×${tpScrollsFromLoot}</span></div>`;
      }
      if (lootItems.length === 0 && tpScrollsFromLoot === 0) {
        lootListHtml = '<div style="text-align:center;color:#555;font-size:12px;padding:8px">Žádné předměty</div>';
      }
      $('resultLootList').innerHTML = lootListHtml;

      // Potiony jsou součástí overlay na obrázku zastávky (levý/ pravý spodní roh).
      $('resultStatus').innerHTML = '';

      // Victory action buttons — bez waypointů. Next Fight pokračuje do další zastávky, pokud je dokončena.
      const hasScroll = (state.townPortalCount || 0) > 0;
      let actionsHtml;
      // Poslední souboj zastávky (10/10) — místo Next Stop a Town Portal dáme Map (pergamen s meči),
      // aby hráč musel jít na další zastávku přes mapu.
      if (isStopComplete) {
        actionsHtml = `<div class="result-tile" onclick="game.openMapFromResult()" title="Map">
          <img src="assets/map.webp" class="result-tile-img">
          <span class="result-tile-label">Map</span>
        </div>`;
        actionsHtml += `<div class="result-tile" onclick="game.walkToTownFromResult()" title="Walk to Town">
          <img src="assets/menu-icons/mesto.png" class="result-tile-img">
          <span class="result-tile-label">Walk to Town</span>
        </div>`;
      } else {
        actionsHtml = `<div class="result-tile" onclick="game.continueToNextStop(${locId})" title="Next Fight">
          <img src="assets/items/weapon_broad_sword.png" class="result-tile-img">
          <span class="result-tile-label">Next Fight</span>
        </div>`;
        actionsHtml += `<div class="result-tile" onclick="game.walkToTownFromResult()" title="Walk to Town">
          <img src="assets/menu-icons/mesto.png" class="result-tile-img">
          <span class="result-tile-label">Walk to Town</span>
        </div>`;
        if (hasScroll) {
          actionsHtml += `<div class="result-tile" onclick="game.useTownPortalScrollFromResult()" title="Town Portal">
            <img src="assets/items/town_portal_scroll.png" class="result-tile-img">
            <span class="result-tile-label">Town Portal</span>
          </div>`;
        }
      }
      const heroFace = state.hero.face || 'hero';
      actionsHtml += `<div class="result-tile" onclick="game.openModal('hero')" title="Hero">
        <img src="assets/monsters/${heroFace}.png" class="result-tile-img">
        <span class="result-tile-label">Hero</span>
      </div>`;
      $('resultActions').innerHTML = actionsHtml;
      // Remove old onclick
      $('resultScreen').onclick = null;
      showScreen('result');
      // Divočina má jednu hudbu skrze vše — victory/lose hudbu nemění.
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
      // Death — return to town, lose act progress
      state.deaths = (state.deaths || 0) + 1;
      // Konsolační XP za prohru — odvozené od levelu monstra (20 %).
      const consXp = Math.max(3, Math.round(getMonsterLevel(mb, state.difficulty || 0) * 30 * 0.2));
      const consGold = 1 + rand(0, 2);
      state.hero.xp = (state.hero.xp || 0) + consXp;
      state.hero.gold = (state.hero.gold || 0) + consGold;
      const leveled = applyLevelUp();
      // Smrt resetuje jen souboje v aktuální oblasti, locationProgress zůstává
      state.areaFightProgress[locId] = 0;
      state._floorLootDrops = [];
      state.hero.hp = state.hero.maxHp;
      saveGame();
      // Divočina má jednu hudbu skrze vše — victory/lose hudbu nemění.
      $('resultIcon').innerHTML = '<img class="result-icon-img large" src="assets/result_defeat.png" alt="Prohra">';
      $('resultTitle').textContent = 'Defeat';
      $('resultMsg').innerHTML = '<div style="text-align:center;color:#888;font-size:13px">Returning to town...</div>';
      $('resultLootList').innerHTML = '';
      $('resultActions').innerHTML = '';
      // Defeat — potion sloty nedávají smysl, jde se zpět do města. Vyčistit status z předchozí Victory.
      $('resultStatus').innerHTML = '';
      $('resultScreen').classList.add('centered');
      const resultBtn = $('resultBtn');
      if (resultBtn) resultBtn.innerHTML = '';
      $('resultScreen').onclick = function() { $('resultScreen').onclick = null; showScreen('town'); renderTown(); };
      showScreen('result');
    } else if (mb.isBoss) {
      // Boss defeated
      state.wins = (state.wins || 0) + 1;
      state.hero.hp = mb.playerHp;
      state._playerDot = mb.playerDot || 0;
      state._playerDotTicksLeft = mb.playerDotTicksLeft || 0;
      state.bossesDefeated[state.difficulty] = state.bossesDefeated[state.difficulty] || [false,false,false,false,false];
      state.bossesDefeated[state.difficulty][locId] = true;
      // Boss XP roste s levelem monstra (D2: bossové dávají vyšší násobek XP).
      state.hero.xp = (state.hero.xp || 0) + Math.round(getMonsterLevel(mb, state.difficulty || 0) * 150 * getXpModifier(mb));
      state.locationProgress[locId] = 0;
      state.areaFightProgress[locId] = 0;
      applyLevelUp();
      const r = mb.loc.reward;
      if (r.gold) state.hero.gold = (state.hero.gold || 0) + r.gold;
      // Boss loot
      const bossLoot = rollLoot(locId, mb.progress, true, getMonsterLevel(mb, state.difficulty || 0));
      if (bossLoot && bossLoot.type === 'boss' && bossLoot.item) {
        addToInventory(state.hero.inventory, bossLoot.item.id);
        state.hero.gold = (state.hero.gold || 0) + bossLoot.gold;
      }
      sfxBossDefeat();
      $('resultScreen').classList.remove('centered');
      // Obrázek poslední zastávky (boss) pro všechny akty — Act 1-4 zatím placeholder
      $('resultIcon').innerHTML = `<div class="stop-result-wrap">
        <img class="result-icon-img stop-result" src="${getStopImage(locId, 9)}" alt="${STOP_NAMES_EN[locId] ? STOP_NAMES_EN[locId][9] : 'Boss'}">
        <div class="stop-result-overlay">
          <div class="stop-result-title">${mb.loc.boss.name} poražen!</div>
        </div>
      </div>`;
      $('resultTitle').textContent = '';
      $('resultMsg').innerHTML = locId === 0
        ? '<div style="text-align:center;color:#aaa;font-size:13px;margin-bottom:4px">Pevnost lesního pána · Boss</div>'
        : '';
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
    }
    showScreen('result');
    // Divočina má jednu hudbu skrze vše — victory/lose hudbu nemění.
  }

  function showMapWithUnlock(doneLocId) {
    showScreen('map');
    renderMap();
    const nextLocId = doneLocId + 1;
    if (nextLocId < ACTS.length) {
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
    const TYPE_LABELS = { weapon:'Zbraň', armor:'Brnění', helmet:'Helma', shield:'Štít', ring:'Prsten', amulet:'Amulet', gloves:'Rukavice', boots:'Boty', belt:'Opasek', consumable:'Spotřební' };
    const TYPE_ICONS = { weapon:'⚔️', armor:'👘', helmet:'⛑️', shield:'🛡️', ring:'💍', amulet:'📿', gloves:'🧤', boots:'👢', belt:'🎗️', consumable:'🧪' };
    const TYPE_ORDER = ['weapon','armor','helmet','shield','ring','amulet','gloves','boots','belt','consumable'];
    const WEAPON_LABELS = { blade:'1H meče', blade2h:'2H meče', axe:'1H sekery', axe2h:'2H sekery', blunt:'1H palice', blunt2h:'2H palice', claws:'Drápy', staff:'1H hůlky', staff2h:'2H hůlky', fists:'Pěsti' };

    function typeTag(t) {
      const colors = { weapon:'#e67e22', armor:'#2ecc71', helmet:'#9b59b6', shield:'#1abc9c', ring:'#f1c40f', amulet:'#e94560', gloves:'#e67e22', boots:'#a1887f', belt:'#ce93d8', consumable:'#80deea' };
      return `<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:11px;background:${colors[t]}33;color:${colors[t]}">${TYPE_ICONS[t]} ${TYPE_LABELS[t]}</span>`;
    }

    function renderIcon(item) {
      if (item.iconImg) {
        return `<img src="${item.iconImg}" alt="" style="width:32px;height:32px;border-radius:4px;object-fit:contain;vertical-align:middle">`;
      }
      return `<span style="font-size:24px">${item.icon}</span>`;
    }

    function weaponSub(i) {
      if (i.weaponType === 'fists') return 'Pěsti';
      const base = WEAPON_LABELS[i.weaponType] || i.weaponType;
      return i.twoHand ? base + ' (2H)' : base;
    }

    function buildStats(i) {
      const parts = [];
      if (i.type === 'weapon') {
        if (i.baseDmgMin !== undefined && i.baseDmgMax !== undefined) parts.push(`⚔️ ${i.baseDmgMin}-${i.baseDmgMax}`);
        else if (i.baseDmg !== undefined) parts.push(`⚔️ ${i.baseDmg}`);
        if (i.swingMs) parts.push(`⏱️ ${i.swingMs}ms`);
      }
      if (i.type === 'shield' && (i.baseDmgMin !== undefined || i.baseDmgMax !== undefined)) {
        parts.push(`🛡️ Slam ${i.baseDmgMin}-${i.baseDmgMax}`);
      }
      if (i.bonusHp) parts.push(`❤️ +${i.bonusHp} HP`);
      if (i.bonusMana) parts.push(`💧 +${i.bonusMana} mana`);
      if (i.defense) parts.push(`🛡️ +${i.defense} def`);
      if (i.blockChance) parts.push(`🛡️ ${i.blockChance}% block`);
      if (i.critChance) parts.push(`🎯 ${i.critChance}% crit`);
      if (i.beltRows) parts.push(`🔗 ${i.beltRows} řady`);
      if (i.effectValue) parts.push(`💊 ${i.effectValue}`);
      return parts.join(' · ');
    }

    function renderItemRow(i) {
      const sub = i.type === 'weapon' ? weaponSub(i) : (i.subtype ? i.subtype : '');
      return `<tr style="border-bottom:1px solid #1a1a3a">
        <td style="padding:4px 6px">${renderIcon(i)}</td>
        <td style="padding:4px 6px"><strong>${i.name}</strong></td>
        <td style="padding:4px 6px;text-align:center">${i.tier || '-'}</td>
        <td style="padding:4px 6px;color:#aaa;font-size:11px">${sub}</td>
        <td style="padding:4px 6px;font-size:12px">${buildStats(i)}</td>
        <td style="padding:4px 6px;text-align:center;color:#8888aa;font-size:11px">${i.cost ? i.cost+'g' : 'start'}</td>
      </tr>`;
    }

    let html = '';

    // === BASE ITEMS ===
    html += `<div class="card"><div class="card-title">🏗️ Base itemy</div>
    <p style="font-size:13px;color:#8888aa;margin-bottom:10px">Každý base item má fixní staty. Affixy se nabalují při lootu.</p>`;

    TYPE_ORDER.forEach(type => {
      const items = ITEMS.filter(i => i.type === type && i.id !== 'fists' && i.id !== 'rags');
      if (items.length === 0) return;
      html += `<div style="margin-top:12px"><strong>${TYPE_ICONS[type]} ${TYPE_LABELS[type]}y</strong></div>`;
      html += `<div style="overflow-x:auto;max-width:100%"><table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px">
        <tr style="background:#12122a;color:#8888aa"><th style="padding:4px 6px"></th><th style="padding:4px 6px;text-align:left">Name</th><th style="padding:4px 6px">Tier</th><th style="padding:4px 6px">Typ</th><th style="padding:4px 6px">Staty</th><th style="padding:4px 6px">Cena</th></tr>`;
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
        <tr style="background:#12122a;color:#8888aa"><th style="padding:4px 6px;text-align:left">Name</th><th style="padding:4px 6px">Group</th><th style="padding:4px 6px">minIlvl</th><th style="padding:4px 6px">Wt</th><th style="padding:4px 6px">Typy</th><th style="padding:4px 6px">Stat</th><th style="padding:4px 6px">Barva</th></tr>`;
      items.forEach(a => {
        const statStr = Object.entries(a.stats || {}).map(([k,v]) => `${k}: ${Array.isArray(v) ? v.join('-') : v}`).join(', ');
        let extra = '';
        if (a.sockets) extra += `, +${a.sockets} sockety`;
        if (a.magicOnly) extra += ', jen magic';
        html += `<tr style="border-bottom:1px solid #1a1a3a"><td style="padding:4px 6px"><strong>${a.name}</strong></td>
          <td style="padding:4px 6px;text-align:center">${a.group}</td>
          <td style="padding:4px 6px;text-align:center">${a.minIlvl}</td>
          <td style="padding:4px 6px;text-align:center">${a.weight}</td>
          <td style="padding:4px 6px">${(a.types||[]).map(t => typeTag(t)).join(' ')}</td>
          <td style="padding:4px 6px;font-size:11px">${statStr}${extra}</td>
          <td style="padding:4px 6px"><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${a.tint};vertical-align:middle;margin-right:2px"></span>${a.tint}</td></tr>`;
      });
      html += `</table></div>`;
    });
    html += `</div>`;

    // === UNIQUES ===
    html += `<div class="card"><div class="card-title">🌟 Unique itemy</div>
    <p style="font-size:13px;color:#8888aa;margin-bottom:10px">Fixní sada statů, vlastní jméno. Objevují se jako boss dropy.</p>`;
    const statLabels = {
      enhancedDmg:'Enhanced Damage', enhancedDefense:'Enhanced Defense', ias:'Increased Attack Speed',
      fireDmg:'Fire Dmg', coldDmg:'Cold Dmg', lightningDmg:'Lightning Dmg', poisonDmg:'Poison Dmg', poisonDur:'Poison Duration',
      lifesteal:'Life Steal', manaSteal:'Mana Steal', attackRating:'Attack Rating', critChance:'Crit Chance',
      skillDmg:'Skill Dmg', manaRegen:'Mana Regen', bonusHp:'+HP', bonusMana:'+Mana',
      str:'Strength', vit:'Vitality', int:'Intellect', dex:'Dexterity',
      magicFind:'Magic Find', goldFind:'Gold Find', allSkills:'All Skills', classSkills:'Class Skills',
      fireRes:'Fire Resist', coldRes:'Cold Resist', lightningRes:'Lightning Resist', poisonRes:'Poison Resist', allRes:'All Resists',
      thorns:'Thorns', dmgReduction:'Dmg Reduction', lifeRegen:'Life Regen',
      knockback:'Knockback', preventHeal:'Prevent Heal', castSpeed:'Cast Speed',
      baseDmgMin:'Min Dmg', baseDmgMax:'Max Dmg', defense:'Defense'
    };
    const fmtStat = (v) => Array.isArray(v) ? `${v[0]}-${v[1]}` : v;
    const fmtUniqueStats = (stats) => {
      if (!stats) return '';
      return Object.entries(stats).map(([k,v]) => {
        const label = statLabels[k] || k;
        const suffix = (k === 'enhancedDmg' || k === 'enhancedDefense' || k === 'ias' || k === 'lifesteal' || k === 'manaSteal' || k === 'critChance' || k === 'skillDmg' || k === 'magicFind' || k === 'goldFind' || k === 'fireRes' || k === 'coldRes' || k === 'lightningRes' || k === 'poisonRes' || k === 'allRes' || k === 'castSpeed') ? '%' : '';
        return `${label} +${fmtStat(v)}${suffix}`;
      }).join('<br>');
    };
    UNIQUE_ITEMS.forEach(u => {
      const base = ITEMS.find(i => i.id === u.baseId);
      const affixNames = (u.affixIds || []).map(id => {
        const a = AFFIXES.find(x => x.id === id);
        return a ? a.name : id;
      }).join(' + ');
      const statHtml = fmtUniqueStats(u.stats);
      const affixHtml = affixNames ? `<div style="font-size:12px;color:#aaa">Affixy: ${affixNames}</div>` : '';
      const iconHtml = u.iconImg ? `<img src="${u.iconImg}" alt="" style="width:36px;height:36px;border-radius:4px;object-fit:contain">` : `<span style="font-size:28px">${u.icon}</span>`;
      const propDesc = u.uniqueProp ? `<div style="font-size:12px;color:#e94560;margin-top:2px">✨ ${u.uniqueProp.desc}</div>` : '';
      html += `<div style="display:flex;gap:10px;align-items:flex-start;padding:8px;border:1px solid #2a2a4a;border-radius:6px;margin-bottom:6px">
        <div style="min-width:40px;text-align:center">${iconHtml}</div>
        <div style="flex:1"><div style="font-size:14px;font-weight:600;color:#e94560">${u.name}</div>
        <div style="font-size:12px;color:#8888aa">Base: ${base ? base.name : u.baseId} · Tier ${u.tier} · Min lvl ${u.minLevel}</div>
        <div style="font-size:12px;color:#4a7dff">${statHtml}</div>${affixHtml}${propDesc}</div></div>`;
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
      // ACT hledáme podle theme indexu (MONSTER_DB a ACTS nemají stejné pořadí —
      // MONSTER_DB je [forest,desert,undead,hell,frost], ACTS je [forest,desert,frost,undead,hell]).
      const loc = ACTS.find(a => a.theme === themeIdx);
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
      const costKey = '💧 Mana';
      const cdText = spell.cooldown > 0 ? `${spell.cooldown}s` : '—';
      const gcdText = spell.gcd > 0 ? `${spell.gcd}s` : '—';
      html += `<div class="spellbook-card">
        <div class="spellbook-icon"><img src="assets/spells/${spell.id}.png" alt="${spell.name}"></div>
        <div class="spellbook-info">
          <div class="spellbook-name">${spell.name}</div>
          <div class="spellbook-desc">${spell.desc}</div>
          <div class="spellbook-stats">
            <span>${costKey}: ${getSpellCost(spell.id, spell.cost)}</span>
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
    // Náhled na další úroveň
    if (!maxed && lv > 0) {
      stats += `<span style="font-size:11px;color:#4a7dff;margin-top:4px;display:inline-block">▶ Další úroveň (${lv+1}): ${t.desc(lv+1)}</span><br>`;
    }
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
                <div class="talent-btn-icon">${t.iconImg ? `<img src="assets/spells/${t.iconImg}">` : `<span style="font-size:40px">${t.icon}</span>`}</div>
                <div class="talent-btn-lv">${lv}/${t.maxLv}</div>
              </div>`;
            }).join('')}
          </div>`;
        }).join('');
        $('talentSchools').innerHTML = `<div class="talent-school active ${cls.id}">
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
        playSFX(levelupSfx);
        saveGame();
        updateTalentBadge();
        updateModalTabBadges();
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
        updateModalTabBadges();
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
      if (h.level >= 60) { h.xp = 0; break; } // cap hráče na lvl 60
      // Level 1->2: 40 XP, 2->3: 80 XP, pak standard 80/level
      const xpNeeded = h.level <= 2 ? h.level * 40 : h.level * 80;
      if (h.xp < xpNeeded) break;
      h.xp -= xpNeeded;
      h.level++;
      h.maxHp = getHeroMaxHp();
      h.baseDmg = Math.round((getHeroDmg().min + getHeroDmg().max) / 2);
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
    updateModalTabBadges();
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
  function updateModalTabBadges() {
    // Aktualizuje badge u záložek Skills a Stats v otevřeném modalu
    const tabs = document.querySelectorAll('.combined-tab');
    if (!tabs.length) return; // modal není otevřený
    const talentPts = state.talentPoints || 0;
    const attrPts = state.hero.attrPoints || 0;
    tabs.forEach(tab => {
      const label = tab.textContent.replace(/[0-9]/g, '').trim();
      let badge = tab.querySelector('.tab-badge');
      if (label === 'Skills') {
        if (talentPts > 0) {
          if (!badge) { badge = document.createElement('span'); badge.className = 'tab-badge'; tab.appendChild(badge); }
          badge.textContent = talentPts;
        } else {
          if (badge) badge.remove();
        }
      } else if (label === 'Stats') {
        if (attrPts > 0) {
          if (!badge) { badge = document.createElement('span'); badge.className = 'tab-badge'; tab.appendChild(badge); }
          badge.textContent = attrPts;
        } else {
          if (badge) badge.remove();
        }
      }
    });
  }
  function getEquipAttrs() {
    const h = state.hero;
    const slots = ['weapon','armor','helmet','shield','ring1','ring2','amulet','belt','gloves','boots'];
    const defaults = { weapon:'fists', armor:null, helmet:null, shield:null, ring1:null, ring2:null, amulet:null, belt:null, gloves:null, boots:null };
    const total = { str:0, vit:0, dex:0, int:0, castSpeed:0 };
    slots.forEach(slot => {
      const itemId = h.equip[slot];
      if (!itemId || itemId === defaults[slot]) return;
      const item = ITEM_MAP[itemId];
      if (!item) return;
      // Affix staty jsou přímo na itemu (item.str, item.vit, ...)
      ['str','vit','dex','int','castSpeed'].forEach(k => {
        if (item[k]) total[k] = (total[k] || 0) + item[k];
      });
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
    const strBonus = ((h.attrStr||0) + eqAttrs.str) * 0.5;
    const lvBonus = Math.floor(h.level * 1);
    const wMin = getWeaponTotalDmgMin(weapon);
    const wMax = getWeaponTotalDmgMax(weapon);
    const dmgMin = Math.max(1, Math.round((2 + lvBonus + wMin + strBonus) * getShieldSpecDmgMult()));
    const dmgMax = Math.max(1, Math.round((2 + lvBonus + wMax + strBonus) * getShieldSpecDmgMult()));
    return { min: dmgMin, max: dmgMax };
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
    const gloves = ITEM_MAP[h.equip.gloves];
    const boots = ITEM_MAP[h.equip.boots];
    const bonus = (armor ? armor.bonusHp||0 : 0) + (helmet ? helmet.bonusHp||0 : 0) + (shield ? shield.bonusHp||0 : 0) + (ring1 ? ring1.bonusHp||0 : 0) + (ring2 ? ring2.bonusHp||0 : 0) + (amulet ? amulet.bonusHp||0 : 0) + (belt ? belt.bonusHp||0 : 0) + (gloves ? gloves.bonusHp||0 : 0) + (boots ? boots.bonusHp||0 : 0);
    const eqAttrs = getEquipAttrs();
    return Math.max(1, 30 + Math.floor(h.level * 5) + bonus + ((h.attrVit||0) + eqAttrs.vit) * 5);
  }
  function getHeroMaxMana() {
    const h = state.hero;
    const cls = CLASSES[state.heroClass];
    const baseMana = cls ? cls.baseMana : 50;
    const manaPerLevel = cls ? (cls.manaPerLevel || 0) : 0;
    const weapon = ITEM_MAP[h.equip.weapon] || ITEM_MAP['fists'];
    const armor = ITEM_MAP[h.equip.armor];
    const helmet = ITEM_MAP[h.equip.helmet];
    const shield = ITEM_MAP[h.equip.shield];
    const ring1 = ITEM_MAP[h.equip.ring1];
    const ring2 = ITEM_MAP[h.equip.ring2];
    const amulet = ITEM_MAP[h.equip.amulet];
    const belt = ITEM_MAP[h.equip.belt];
    const gloves = ITEM_MAP[h.equip.gloves];
    const boots = ITEM_MAP[h.equip.boots];
    const bonus = (weapon.bonusMana||0) + (armor ? armor.bonusMana||0 : 0) + (helmet ? helmet.bonusMana||0 : 0) + (shield ? shield.bonusMana||0 : 0) + (ring1 ? ring1.bonusMana||0 : 0) + (ring2 ? ring2.bonusMana||0 : 0) + (amulet ? amulet.bonusMana||0 : 0) + (belt ? belt.bonusMana||0 : 0) + (gloves ? gloves.bonusMana||0 : 0) + (boots ? boots.bonusMana||0 : 0);
    // D2 styl: baseMana + level*manaPerLevel + INT*2 + gear bonus
    return Math.max(10, baseMana + Math.floor((h.level - 1) * manaPerLevel) + ((h.attrInt||0) + getEquipAttrs().int) * 2 + bonus);
  }
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
    const spec = getWeaponSpecBonus(weapon);
    const critChance = (weapon.critChance || 0) + spec.critBonus;
    const shieldItem = ITEM_MAP[h.equip.shield];
    const blockChance = getPlayerBlockChance();
    const armorDef = (ITEM_MAP[h.equip.armor] ? ITEM_MAP[h.equip.armor].defense || 0 : 0);
    const helmetDef = ITEM_MAP[h.equip.helmet]?.defense || 0;
    const shieldDef = ITEM_MAP[h.equip.shield]?.defense || 0;
    const glovesDef = ITEM_MAP[h.equip.gloves]?.defense || 0;
    const bootsDef = ITEM_MAP[h.equip.boots]?.defense || 0;
    const totalDef = armorDef + helmetDef + shieldDef + glovesDef + bootsDef;
    const defPct = Math.round(100 - 10000 / (100 + totalDef));
    const dex = (h.attrDex || 0) + (getEquipAttrs().dex || 0);
    const dodgePct = Math.min(50, Math.round(dex * 0.5));
    const hitChance = Math.min(95, 80 + Math.round(dex * 0.3));
    const elemColor = getWeaponElementColor(weapon);
    const dmgColor = elemColor || '#e8e0e8';
    $('heroDetailDmg').innerHTML = `<span style="color:${dmgColor}">${dmg.min}-${dmg.max}</span>`;
    $('heroDetailDef').textContent = `${totalDef} (${defPct}%)`;
    $('heroDetailCrit').textContent = critChance > 0 ? `${critChance}% (×2.0)` : `0%`;
    $('heroDetailBlock').textContent = `${blockChance}%`;
    $('heroDetailDodge').textContent = `${dodgePct}%`;
    $('heroDetailHit').textContent = `${hitChance}%`;
    $('heroDetailHp').textContent = `${h.hp || h.maxHp}/${h.maxHp}`;
    $('heroDetailMana').textContent = `${h.mana || h.maxMana}/${h.maxMana}`;
    $('heroDetailFireRes').textContent = `${getPlayerResist('fire')}%`;
    $('heroDetailColdRes').textContent = `${getPlayerResist('ice')}%`;
    $('heroDetailLightningRes').textContent = `${getPlayerResist('lightning')}%`;
    $('heroDetailPoisonRes').textContent = `${getPlayerResist('nature')}%`;
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
    playSFX(levelupSfx);
    if (attr === 'str') {
      h.attrStr = (h.attrStr||0) + 1;
      h.baseDmg = Math.round((getHeroDmg().min + getHeroDmg().max) / 2);
      showMessage('💪 Síla +1! Poškození zvýšeno!');
    } else if (attr === 'dex') {
      h.attrDex = (h.attrDex||0) + 1;
      showMessage('🎯 Obratnost +1! Crit okno zvětšeno!');
    } else if (attr === 'int') {
      h.attrInt = (h.attrInt||0) + 1;
      h.maxMana = getHeroMaxMana();
      h.mana = h.maxMana;
      syncBattleMana();
      showMessage('🧠 Intelekt +1! Max many +10!');
    } else {
      h.attrVit = (h.attrVit||0) + 1;
      h.maxHp = getHeroMaxHp();
      h.hp = h.maxHp;
      showMessage('❤️ Vitalita +1! Max HP zvýšeno!');
    }
    saveGame();
    updateModalTabBadges();
    renderHero();
  }

  // ===== CHEST =====
  function renderChest() {
    const grid = $('chestGrid');
    if (!grid) return;
    const chest = state.chest || [];
    let html = '';
    for (let i = 0; i < 25; i++) {
      const entry = chest[i];
      if (entry) {
        const itemId = typeof entry === 'object' ? entry.id : entry;
        const count = typeof entry === 'object' ? (entry.count || 1) : 1;
        const item = ITEM_MAP[itemId];
        if (!item) { html += '<div class="chest-cell empty"></div>'; continue; }
        const borderColor = getQualityColor(item);
        const countLabel = count > 1 ? `<span class="cell-count">${count}</span>` : '';
        html += `<div class="chest-cell" data-chest-idx="${i}" style="border-color:${borderColor}">
          <div class="cell-icon">${renderItemIcon(item,0)}${countLabel}</div>
        </div>`;
      } else {
        html += `<div class="chest-cell empty" data-chest-idx="${i}" style="border-color:#3a3a3a"></div>`;
      }
    }
    grid.innerHTML = html;

    // Klik na chest item → přesunout do inventáře
    grid.onclick = (e) => {
      const cell = e.target.closest('.chest-cell');
      if (!cell) return;
      const idx = parseInt(cell.dataset.chestIdx);
      const entry = chest[idx];
      if (!entry) return;
      const itemId = typeof entry === 'object' ? entry.id : entry;
      const count = typeof entry === 'object' ? (entry.count || 1) : 1;
      // Přidat do inventáře
      addToInventory(state.hero.inventory, itemId, count);
      // Odebrat z truhly
      chest[idx] = null;
      saveGame();
      renderChest();
    };

    // Vykreslit inventář přímo v chest screenu
    renderChestInventory();
  }

  function renderChestInventory() {
    const h = state.hero;
    // Grid batohu
    const grid = $('chestInvGrid');
    const inv = h.inventory || [];
    const maxCells = 20;
    let ghtml = '';
    for (let i = 0; i < maxCells; i++) {
      const entry = inv[i];
      if (entry) {
        const itemId = typeof entry === 'object' ? entry.id : entry;
        const count = typeof entry === 'object' ? (entry.count || 1) : 1;
        const item = ITEM_MAP[itemId];
        if (!item) { ghtml += '<div class="chest-cell empty"></div>'; continue; }
        const borderColor = getQualityColor(item);
        const cls = CLASSES[state.heroClass];
        let canEquip = true;
        if (item.type === 'weapon' && cls && cls.allowedWeapons && !cls.allowedWeapons.includes(item.weaponType)) canEquip = false;
        if (item.type === 'shield' && cls && cls.allowedShield === false) canEquip = false;
        const cellStyle = canEquip ? `border-color:${borderColor}` : `border-color:#e74c3c;opacity:0.35`;
        const countLabel = count > 1 ? `<span class="cell-count">${count}</span>` : '';
        ghtml += `<div class="chest-cell" data-idx="${i}" style="${cellStyle}">
          <div class="cell-icon">${renderItemIcon(item,0)}${countLabel}</div>
          <div class="cell-name">${getItemSocketName(item)}</div>
        </div>`;
      } else {
        ghtml += '<div class="chest-cell empty"></div>';
      }
    }
    grid.innerHTML = ghtml;

    // Klik na item v inventáři → přesunout do chest
    grid.querySelectorAll('.chest-cell[data-idx]').forEach(cell => {
      cell.onclick = (e) => {
        const idx = parseInt(cell.dataset.idx);
        const entry = inv[idx];
        if (!entry) return;
        const itemId = typeof entry === 'object' ? entry.id : entry;
        const count = typeof entry === 'object' ? (entry.count || 1) : 1;
        // Najít první volný slot v chest
        const chest = state.chest;
        let freeIdx = chest.findIndex(s => !s);
        if (freeIdx === -1) { showMessage('❌ Chest is full!'); return; }
        // Odebrat z inventáře
        removeFromInventory(inv, itemId, count);
        // Uložit do chest
        chest[freeIdx] = { id: itemId, count: count };
        saveGame();
        renderChest();
      };
    });
  }

  // ===== SHOP =====
  let _shopTab = 'buy';
  let _shopCategory = 'Misc';
  let _shopItemsCache = null; // cache pro aktuální shop nabídku, resetuje se při opuštění města

  function _generateShopItems() {
    const h = state.hero;
    const playerLevel = h.level || 1;
    const monsterLevel = 5 + playerLevel * 2;
    // Shop nabízí itemy podle aktuálního postupu (treasure class), ne podle levelu hráče.
    const townFloor = getTownFloor();

    function _shopFindBases(type, weaponType, count) {
      const candidates = ITEMS.filter(i => {
        if (type === 'weapon') return i.type === 'weapon' && i.weaponType === weaponType && (i.dropFloor ?? 0) <= townFloor;
        return i.type === type && (i.dropFloor ?? 0) <= townFloor;
      });
      if (candidates.length === 0) return [];
      // Weighted výběr: vyšší tier = vyšší váha, ale nižší taky šance
      const result = [];
      const pool = [...candidates];
      for (let n = 0; n < count && pool.length > 0; n++) {
        const totalW = pool.reduce((s, c) => s + c.tier, 0);
        let r = Math.random() * totalW;
        let idx = 0;
        for (let i = 0; i < pool.length; i++) {
          r -= pool[i].tier;
          if (r <= 0) { idx = i; break; }
        }
        result.push(pool[idx]);
        pool.splice(idx, 1); // neopakovat stejný base
      }
      return result;
    }

    function _shopGenPair(baseItem) {
      if (!baseItem) return [];
      const common = generateLootItemWithAffixes(baseItem, 'normal', monsterLevel);
      common.cost = baseItem.cost;
      ITEM_MAP[common.id] = common;
      state.lootItems = state.lootItems || {};
      state.lootItems[common.id] = common;
      const magic = generateLootItemWithAffixes(baseItem, 'magic', monsterLevel);
      magic.cost = 10 + (baseItem.tier || 1) * 20 + (magic.affixes || []).length * 15;
      ITEM_MAP[magic.id] = magic;
      state.lootItems[magic.id] = magic;
      return [common, magic];
    }

    function _shopGenSingle(baseItem, quality) {
      if (!baseItem) return null;
      const item = generateLootItemWithAffixes(baseItem, quality, monsterLevel);
      item.cost = 10 + (baseItem.tier || 1) * 20 + (item.affixes || []).length * 15;
      ITEM_MAP[item.id] = item;
      state.lootItems = state.lootItems || {};
      state.lootItems[item.id] = item;
      return item;
    }

    // Dostupný tier potionů: Act1=Light(t1), Act2=Healing(t2)... Act5=Godly(t5).
    // Každý další akt se odemkne poražením bosse předchozího aktu.
    const _bossesDef = state.bossesDefeated[state.difficulty] || [];
    let _bossKills = 0;
    while (_bossKills < 5 && _bossesDef[_bossKills]) _bossKills++;
    const _potionTier = Math.min(5, _bossKills + 1);
    const _potionIds = ['healingPotion','healingPotion2','healingPotion3','healingPotion4','healingPotion5',
      'manaPotion','manaPotion2','manaPotion3','manaPotion4','manaPotion5'];
    const miscItems = [
      ..._potionIds.filter(id => (ITEM_MAP[id]?.tier || 1) <= _potionTier), 'townPortalScroll',
      'ruby_chipped', 'ruby_flawed', 'ruby', 'ruby_flawless', 'ruby_perfect',
      'sapphire_chipped', 'sapphire_flawed', 'sapphire', 'sapphire_flawless', 'sapphire_perfect',
      'emerald_chipped', 'emerald_flawed', 'emerald', 'emerald_flawless', 'emerald_perfect',
      'topaz_chipped', 'topaz_flawed', 'topaz', 'topaz_flawless', 'topaz_perfect']
      .map(id => ITEM_MAP[id]).filter(Boolean);

    // Armor: 3-4 itemy z poolu armor/helmet/shield/belt/gloves/boots
    const armorTypes = ['armor', 'helmet', 'shield', 'belt', 'gloves', 'boots'];
    const armorItems = [];
    armorTypes.forEach(type => {
      const bases = _shopFindBases(type, null, 2); // 2 itemy na typ
      bases.forEach(b => armorItems.push(..._shopGenPair(b)));
    });

    // Weapons: 3-4 itemy z poolu všech weapon typů
    const weaponTypes = ['blade', 'axe', 'blunt', 'claws'];
    const weaponItems = [];
    weaponTypes.forEach(wt => {
      const bases = _shopFindBases('weapon', wt, 2); // 2 itemy na weapon typ
      bases.forEach(b => weaponItems.push(..._shopGenPair(b)));
    });

    // Jewelry: rings + amulety, jen magic (jako D2 — common jewelry neexistuje)
    const jewelryItems = [];
    const ringBases = _shopFindBases('ring', null, 2);
    ringBases.forEach(b => {
      const m = _shopGenSingle(b, 'magic');
      if (m) jewelryItems.push(m);
    });
    const amuletBases = _shopFindBases('amulet', null, 2);
    amuletBases.forEach(b => {
      const m = _shopGenSingle(b, 'magic');
      if (m) jewelryItems.push(m);
    });

    return [
      { category: 'Misc', items: miscItems },
      { category: 'Armor', items: armorItems },
      { category: 'Weapons', items: weaponItems },
      { category: 'Jewelry', items: jewelryItems },
    ];
  }

  function _resetShopCache() {
    _shopItemsCache = null;
  }

  function switchShopTab(tab) {
    _shopTab = tab;
    document.querySelectorAll('.shop-tab').forEach(t => t.classList.toggle('active', t.dataset.shopTab === tab));
    renderShop();
  }

  function switchShopCategory(cat) {
    _shopCategory = cat;
    document.querySelectorAll('.shop-cat-tab').forEach(t => t.classList.toggle('active', t.dataset.shopCat === cat));
    renderShop();
  }

  function renderShop() {
    const h = state.hero;
    // Inicializovat shop bought items při prvním otevření
    if (!window._shopBoughtItems) window._shopBoughtItems = new Set();
    $('shopGold').textContent = `💰 ${h.gold} gold`;
    if (_shopTab === 'sell') {
      $('shopCatTabs').style.display = 'none';
      const equipSet = new Set(Object.values(h.equip).filter(Boolean));
      const sellable = h.inventory.filter(entry => {
        const id = typeof entry === 'object' ? entry.id : entry;
        return !equipSet.has(id);
      });
      if (sellable.length === 0) {
        $('shopList').innerHTML = '<div style="text-align:center;padding:30px;color:#666">📦 Nothing to sell</div>';
        return;
      }
      $('shopList').innerHTML = sellable.map(entry => {
        const itemId = typeof entry === 'object' ? entry.id : entry;
        const item = ITEM_MAP[itemId];
        if (!item) return '';
        const sellPrice = Math.round(item.cost * 0.5);
        return `<div class="shop-item">
          <div class="shop-item-header">
            <div class="shop-item-icon">${renderItemIcon(item,64)}</div>
            <div class="shop-item-name" style="color:${getQualityColor(item)}">${getItemSocketName(item)}</div>
          </div>
          <div class="shop-item-stats">${buildItemStatsHtml(item)}</div>
          <div class="shop-item-actions">
            <button class="btn btn-shop-buy" onclick="game.sellItem('${itemId}')">
              <span class="btn-buy-icon">💰</span>
              <span class="btn-buy-price" style="color:#f1c40f">${sellPrice}</span>
            </button>
          </div>
        </div>`;
      }).join('');
    } else {
      // Použít cache — pokud neexistuje, vygenerovat novou nabídku
      if (!_shopItemsCache) {
        _shopItemsCache = _generateShopItems();
      }
      const sections = _shopItemsCache;

      // Sledovat, co už bylo v této iteraci shopu koupeno
      if (!window._shopBoughtItems) window._shopBoughtItems = new Set();

      // Kategorie záložky
      const catTabsEl = $('shopCatTabs');
      catTabsEl.style.display = 'flex';
      catTabsEl.innerHTML = sections.map(s => {
        const visible = s.items.filter(item => !window._shopBoughtItems.has(item.id));
        if (visible.length === 0) return '';
        const active = s.category === _shopCategory ? 'active' : '';
        return `<button class="shop-cat-tab ${active}" data-shop-cat="${s.category}" onclick="game.switchShopCategory('${s.category}')">${s.category}</button>`;
      }).join('');

      // Zobrazit jen aktivní kategorii
      const activeSection = sections.find(s => s.category === _shopCategory) || sections[0];
      const visible = activeSection.items.filter(item => !window._shopBoughtItems.has(item.id));

      $('shopList').innerHTML = visible.length === 0
        ? '<div style="text-align:center;padding:30px;color:#666">📦 Nothing to buy</div>'
        : `<div class="shop-category">
          ${visible.map(item => {
            const canAfford = h.gold >= item.cost;
            const priceColor = canAfford ? '#f1c40f' : '#e74c3c';
            return `<div class="shop-item" onclick="window._invSelectedIdx=null;window._invSelectedSlot=null;game.showItemInfo('${item.id}')">
              <div class="shop-item-header">
                <div class="shop-item-icon">${renderItemIcon(item,64)}</div>
                <div class="shop-item-name" style="color:${getQualityColor(item)}">${getItemSocketName(item)}</div>
              </div>
              <div class="shop-item-stats">${buildItemStatsHtml(item)}</div>
              <div class="shop-item-actions">
                <button class="btn btn-shop-buy" onclick="event.stopPropagation();game.buyItem('${item.id}')" ${canAfford ? '' : 'style="opacity:0.5"'}>
                  <span class="btn-buy-icon">💰</span>
                  <span class="btn-buy-price" style="color:${priceColor}">${item.cost}</span>
                </button>
              </div>
            </div>`;
          }).join('')}
        </div>`;
    }
  }

  function buyItem(itemId) {
    // Zavřít overlay pokud je otevřený
    closeItemOverlay();
    const item = ITEM_MAP[itemId];
    if (!item) return;
    const h = state.hero;
    if (h.gold < item.cost) { showMessage('❌ Not enough gold!'); return; }
    h.gold -= item.cost;
    if (itemId === 'townPortalScroll') {
      state.townPortalCount = (state.townPortalCount || 0) + 1;
    } else if (item.type === 'consumable' && (item.subtype === 'heal' || item.subtype === 'mana') && addPotionToBelt(itemId)) {
      // Potion se vložil do opasku
    } else {
      addToInventory(h.inventory, itemId);
    }
    playSFX(shopSfx);
    saveGame();
    showMessage(`✅ Bought ${item.icon} ${getItemSocketName(item)}!`);
    // Označit jako koupené v této iteraci shopu (zmizí z nabídky)
    // Výjimka: Misc itemy (potiony, scrolly) zůstávají — lze kupovat neomezeně
    if (window._shopBoughtItems && item.type !== 'consumable') {
      window._shopBoughtItems.add(itemId);
    }
    renderShop();
  }

  function sellItem(itemId) {
    // Zavřít overlay pokud je otevřený
    closeItemOverlay();
    const item = ITEM_MAP[itemId];
    if (!item || item.cost === 0) return;
    const h = state.hero;
    const count = getStackCount(h.inventory, itemId);
    if (count === 0) { showMessage('❌ Tento předmět nemáš v inventáři!'); return; }
    const sellPrice = Math.round(item.cost * 0.5);
    removeFromInventory(h.inventory, itemId);
    h.gold += sellPrice;
    playSFX(shopSfx);
    saveGame();
    showMessage(`💰 Prodáno ${item.icon} ${getItemSocketName(item)} za ${sellPrice}💰`);
    if (_currentScreen === 'shop') renderShop();
    else if (_currentScreen === 'gamble') renderGamble();
  }

  // ===== GAMBLE (D2 styl) =====
  let _gambleCategory = 'Weapons';
  let _gambleItemsCache = null;
  let _gambleTab = 'buy';

  function _generateGambleItems() {
    const h = state.hero;
    const playerLevel = h.level || 1;
    const monsterLevel = 5 + playerLevel * 2;
    // Gamble nabízí itemy podle aktuálního postupu (treasure class), ne podle levelu hráče.
    const townFloor = getTownFloor();

    function _gambleFindBases(type, weaponType, count) {
      const candidates = ITEMS.filter(i => {
        if (type === 'weapon') return i.type === 'weapon' && i.weaponType === weaponType && (i.dropFloor ?? 0) <= townFloor;
        return i.type === type && (i.dropFloor ?? 0) <= townFloor;
      });
      if (candidates.length === 0) return [];
      const result = [];
      const pool = [...candidates];
      for (let n = 0; n < count && pool.length > 0; n++) {
        const totalW = pool.reduce((s, c) => s + c.tier, 0);
        let r = Math.random() * totalW;
        let idx = 0;
        for (let i = 0; i < pool.length; i++) {
          r -= pool[i].tier;
          if (r <= 0) { idx = i; break; }
        }
        result.push(pool[idx]);
        pool.splice(idx, 1);
      }
      return result;
    }

    // Weapons — 1 z každého typu
    const weaponTypes = ['blade', 'axe', 'blunt', 'claws'];
    const weaponItems = [];
    weaponTypes.forEach(wt => {
      const bases = _gambleFindBases('weapon', wt, 1);
      bases.forEach(b => {
        const baseCost = b.cost || 10;
        const price = Math.round(baseCost * (1 + playerLevel * 0.15));
        weaponItems.push({ baseItem: b, price });
      });
    });

    // Armor — 1 z každého typu
    const armorTypes = ['armor', 'helmet', 'shield', 'belt', 'gloves', 'boots'];
    const armorItems = [];
    armorTypes.forEach(type => {
      const bases = _gambleFindBases(type, null, 1);
      bases.forEach(b => {
        const baseCost = b.cost || 10;
        const price = Math.round(baseCost * (1 + playerLevel * 0.15));
        armorItems.push({ baseItem: b, price });
      });
    });

    // Jewelry — 1 ring + 1 amulet
    const jewelryItems = [];
    const ringBases = _gambleFindBases('ring', null, 1);
    ringBases.forEach(b => {
      const baseCost = b.cost || 10;
      const price = Math.round(baseCost * (1 + playerLevel * 0.15));
      jewelryItems.push({ baseItem: b, price });
    });
    const amuletBases = _gambleFindBases('amulet', null, 1);
    amuletBases.forEach(b => {
      const baseCost = b.cost || 10;
      const price = Math.round(baseCost * (1 + playerLevel * 0.15));
      jewelryItems.push({ baseItem: b, price });
    });

    return [
      { category: 'Weapons', items: weaponItems },
      { category: 'Armor', items: armorItems },
      { category: 'Jewelry', items: jewelryItems },
    ];
  }

  function renderGamble() {
    const h = state.hero;
    $('gambleGold').textContent = `💰 ${h.gold} gold`;

    // Sell záložka — stejná logika jako u shopu.
    if (_gambleTab === 'sell') {
      $('gambleCatTabs').style.display = 'none';
      const equipSet = new Set(Object.values(h.equip).filter(Boolean));
      const sellable = h.inventory.filter(entry => {
        const id = typeof entry === 'object' ? entry.id : entry;
        return !equipSet.has(id);
      });
      if (sellable.length === 0) {
        $('gambleList').innerHTML = '<div style="text-align:center;padding:30px;color:#666">📦 Nothing to sell</div>';
        return;
      }
      $('gambleList').innerHTML = sellable.map(entry => {
        const itemId = typeof entry === 'object' ? entry.id : entry;
        const item = ITEM_MAP[itemId];
        if (!item) return '';
        const sellPrice = Math.round(item.cost * 0.5);
        return `<div class="shop-item">
          <div class="shop-item-header">
            <div class="shop-item-icon">${renderItemIcon(item,64)}</div>
            <div class="shop-item-name" style="color:${getQualityColor(item)}">${getItemSocketName(item)}</div>
          </div>
          <div class="shop-item-stats">${buildItemStatsHtml(item)}</div>
          <div class="shop-item-actions">
            <button class="btn btn-shop-buy" onclick="game.sellItem('${itemId}')">
              <span class="btn-buy-icon">💰</span>
              <span class="btn-buy-price" style="color:#f1c40f">${sellPrice}</span>
            </button>
          </div>
        </div>`;
      }).join('');
      return;
    }

    if (!_gambleItemsCache) {
      _gambleItemsCache = _generateGambleItems();
    }

    const sections = _gambleItemsCache;

    // Kategorie záložky
    const catTabsEl = $('gambleCatTabs');
    catTabsEl.style.display = 'flex';
    catTabsEl.innerHTML = sections.map(s => {
      if (s.items.length === 0) return '';
      const active = s.category === _gambleCategory ? 'active' : '';
      return `<button class="shop-cat-tab ${active}" onclick="game.switchGambleCategory('${s.category}')">${s.category}</button>`;
    }).join('');

    const activeSection = sections.find(s => s.category === _gambleCategory) || sections[0];
    const items = activeSection.items;

    $('gambleList').innerHTML = items.length === 0
      ? '<div style="text-align:center;padding:30px;color:#666">Nothing available</div>'
      : `<div class="shop-category">
        ${items.map(entry => {
          const baseItem = entry.baseItem;
          const price = entry.price;
          const canAfford = h.gold >= price;
          const priceColor = canAfford ? '#f1c40f' : '#e74c3c';
          return `<div class="shop-item">
            <div class="shop-item-header">
              <div class="shop-item-icon">${renderItemIcon(baseItem, 48)}</div>
              <div class="shop-item-name" style="color:#888">${baseItem.name}</div>
            </div>
            <div class="shop-item-stats" style="color:#666;font-size:11px">
              <div>??? unidentified</div>
              <div style="color:#888;font-size:10px">${baseItem.type === 'weapon' ? (baseItem.twoHand ? '2H ' : '1H ') + (baseItem.weaponType || '') : baseItem.type}</div>
            </div>
            <div class="shop-item-actions">
              <button class="btn btn-shop-buy" onclick="event.stopPropagation();game.buyGambleItem('${baseItem.id}')" ${canAfford ? '' : 'style="opacity:0.5"'}>
                <span class="btn-buy-icon">🎲</span>
                <span class="btn-buy-price" style="color:${priceColor}">${price}</span>
              </button>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }

  function switchGambleCategory(cat) {
    _gambleCategory = cat;
    renderGamble();
  }

  function switchGambleTab(tab) {
    _gambleTab = tab;
    document.querySelectorAll('[data-gamble-tab]').forEach(t => t.classList.toggle('active', t.dataset.gambleTab === tab));
    if (tab === 'buy') {
      $('gambleCatTabs').style.display = 'flex';
    }
    renderGamble();
  }

  function buyGambleItem(baseItemId) {
    closeItemOverlay();
    const baseItem = ITEMS.find(i => i.id === baseItemId);
    if (!baseItem) return;
    const h = state.hero;
    // Najít cenu z cache (fixní, nemění se)
    let price = 0;
    if (_gambleItemsCache) {
      for (const section of _gambleItemsCache) {
        const entry = section.items.find(e => e.baseItem && e.baseItem.id === baseItemId);
        if (entry) { price = entry.price; break; }
      }
    }
    if (price === 0) price = Math.round((baseItem.cost || 10) * (1 + (state.hero.level || 1) * 0.15)); // fallback
    if (h.gold < price) { showMessage('❌ Not enough gold!'); return; }

    // D2 gamble: nikdy normal quality, vždy minimálně magic
    // D2: magic ~89.95%, rare 10%, unique ~0.05% (1/2000)
    const roll = Math.random() * 100;
    let quality;
    if (roll < 0.05) quality = 'unique';
    else if (roll < 10.05) quality = 'rare';
    else quality = 'magic';

    const playerLevel = h.level || 1;
    const monsterLevel = 5 + playerLevel * 2;

    let item;
    if (quality === 'unique') {
      const uniqueDef = pickUniqueForBase(baseItem.id);
      if (uniqueDef) {
        item = generateUniqueItem(uniqueDef);
        if (item) {
          item.tier = baseItem.tier || 1;
          item.rarity = 'unique';
          item.icon = baseItem.type === 'weapon' ? LOOT_ICONS['weapon_' + (baseItem.weaponType || 'blade')] : LOOT_ICONS[baseItem.type];
          item.cost = price;
          ITEM_MAP[item.id] = item;
          state.lootItems = state.lootItems || {};
          state.lootItems[item.id] = item;
        }
      }
      // Pokud unique neexistuje, spadnout na rare
      if (!item) quality = 'rare';
    }

    if (!item) {
      item = generateLootItemWithAffixes(baseItem, quality, monsterLevel);
      item.tier = baseItem.tier || 1;
      item.rarity = item.quality === 'normal' ? 'common' : item.quality === 'magic' ? 'magic' : 'rare';
      item.icon = baseItem.type === 'weapon' ? LOOT_ICONS['weapon_' + (baseItem.weaponType || 'blade')] : LOOT_ICONS[baseItem.type];
      item.cost = price;
      // Attack Rating (AR) pochází JEN z affixů — žádná pseudo-náhodná generace (D2).
      if (item.rarity !== 'common') {
        const expChance = item.rarity === 'magic' ? 0.2 : 0.5;
        if (Math.random() < expChance) item.expertiseRating = 1 + rand(0, Math.ceil((baseItem.tier || 1) * 0.4));
      }
      if (baseItem.type === 'weapon' && baseItem.weaponType === 'blade') {
        item.critChance = (item.critChance || 0) + Math.min(25, 5 + (baseItem.tier || 1) * 3 + rand(0, 5));
      }
      if (baseItem.type === 'shield') {
        item.blockChance = Math.min(45, 15 + (baseItem.tier || 1) * 4 + rand(0, 5));
      }
      ITEM_MAP[item.id] = item;
      state.lootItems = state.lootItems || {};
      state.lootItems[item.id] = item;
    }

    h.gold -= price;
    addToInventory(h.inventory, item.id);
    playSFX(shopSfx);
    saveGame();
    showMessage(`🎲 ${item.icon} ${getItemSocketName(item)}! (${item.rarity})`);
    renderGamble();
  }

  function sellSlotItem(itemId, slot) {
    const h = state.hero;
    const defaults = { weapon:'fists', armor:null, helmet:null, shield:null, ring1:null, ring2:null, amulet:null, belt:null, gloves:null, boots:null };
    if (h.equip[slot] !== itemId) return;
    const item = ITEM_MAP[itemId];
    if (!item) return;
    const sellPrice = Math.round(item.cost * 0.5);
    // Získat gold
    h.equip[slot] = defaults[slot];
    // Při prodeji beltu vrátit potiony
    if (slot === 'belt') {
      const bpSlots = h.equip.beltPotionSlots || [];
      bpSlots.forEach(potId => { if (potId) addToInventory(h.inventory, potId); });
      h.equip.beltPotionSlots = [];
    }
    h.gold += sellPrice;
    h.baseDmg = Math.round((getHeroDmg().min + getHeroDmg().max) / 2);
    h.maxHp = getHeroMaxHp();
    h.hp = Math.min(h.hp, h.maxHp);
    saveGame();
    renderInventory();
    renderHero();
  }

  function setSlotBorder(slotId, item) {
    const el = $(slotId);
    if (!el) return;
    if (item) {
      el.style.borderColor = getQualityColor(item);
    } else {
      // empty slot — darker dashed gray
      el.style.borderColor = '#3a3a3a';
    }
  }
  // ===== INVENTORY =====
    function closeItemOverlay() {
      const ov = $('invItemOverlay');
      if (ov) ov.classList.add('hidden');
      window._invSelectedIdx = null;
      window._invSelectedSlot = null;
      document.querySelectorAll('.chest-cell.selected, .inv-equip-slot.selected').forEach(el => el.classList.remove('selected'));
    }

    // Gem select modal pro socket insert
    function openGemSelectModal(targetItemId, socketIdx) {
      console.log('openGemSelectModal called', targetItemId, socketIdx);
      const modal = $('gemSelectModal');
      console.log('modal element:', modal);
      if (!modal) { console.log('modal not found!'); return; }
      const grid = $('gemSelectGrid');
      const emptyMsg = $('gemSelectEmpty');
      if (!grid || !emptyMsg) return;
      const h = state.hero;
      const inv = h.inventory || [];
      const gems = [];
      for (let i = 0; i < inv.length; i++) {
        const entry = inv[i];
        const itemId = typeof entry === 'object' ? entry.id : entry;
        const count = typeof entry === 'object' ? (entry.count || 1) : 1;
        const item = itemId ? ITEM_MAP[itemId] : null;
        if (item && item.type === 'gem') {
          gems.push({ idx: i, item: item, count: count });
        }
      }
      if (gems.length === 0) {
        grid.innerHTML = '';
        emptyMsg.classList.remove('hidden');
      } else {
        emptyMsg.classList.add('hidden');
        let ghtml = '';
        gems.forEach(g => {
          const gemData = GEMS[g.item.gemType];
          const iconImg = g.item.iconImg || '';
          const qName = g.item.gemQuality ? g.item.gemQuality.charAt(0).toUpperCase() + g.item.gemQuality.slice(1) : '';
          const displayName = qName ? `${qName} ${gemData ? gemData.name : 'Gem'}` : g.item.name || 'Gem';
          const countLabel = g.count > 1 ? ` <span style="color:#888;font-size:10px">×${g.count}</span>` : '';
          const statsHtml = gemData ? buildGemStatsHtml(g.item.gemType, g.item.gemQuality) : '';
          ghtml += `<div class="gem-select-item" data-inv-idx="${g.idx}" data-target-id="${targetItemId}" data-socket-idx="${socketIdx}">
            <div class="gem-select-item-icon">${iconImg ? `<img src="${iconImg}" style="width:32px;height:32px;image-rendering:pixelated">` : '💎'}</div>
            <div class="gem-select-item-name">${displayName}${countLabel}</div>
            <div class="gem-select-item-stats" style="font-size:10px;color:#888;text-align:center;margin-top:2px">${statsHtml}</div>
          </div>`;
        });
        grid.innerHTML = ghtml;
        // Klik na gem — vložit do socketu
        grid.querySelectorAll('.gem-select-item').forEach(el => {
          el.onclick = function(e) {
            e.stopPropagation();
            const invIdx = parseInt(this.dataset.invIdx);
            const tId = this.dataset.targetId;
            const sIdx = parseInt(this.dataset.socketIdx);
            const targetItem = tId ? ITEM_MAP[tId] : null;
            if (!targetItem) { closeGemSelectModal(); return; }
            const entry = inv[invIdx];
            const gemItemId = typeof entry === 'object' ? entry.id : entry;
            const gemItem = gemItemId ? ITEM_MAP[gemItemId] : null;
            if (!gemItem) { closeGemSelectModal(); return; }
            if (!targetItem.socketedGems) targetItem.socketedGems = [];
            if (targetItem.socketedGems[sIdx]) { closeGemSelectModal(); showMessage('❌ Socket already filled'); return; }
            // Odebrat gem z inventáře
            removeFromInventory(inv, gemItemId);
            targetItem.socketedGems[sIdx] = { type: gemItem.gemType, quality: gemItem.gemQuality, name: gemItem.name };
            applyGemStats(targetItem, gemItem.gemType, gemItem.gemQuality);
            saveGame();
            closeGemSelectModal();
            renderInventory();
            showMessage('✅ Gem inserted!');
            // Znovu otevřít info overlay pro stejný item
            showItemInfo(targetItem);
          };
        });
      }
      modal.classList.remove('hidden');
    }

    function closeGemSelectModal() {
      const modal = $('gemSelectModal');
      if (modal) modal.classList.add('hidden');
    }

    function showItemInfo(itemOrId) {
      const item = typeof itemOrId === 'string' ? ITEM_MAP[itemOrId] : itemOrId;
      const ov = $('invItemOverlay');
      if (!ov || !item) { if (ov) ov.classList.add('hidden'); return; }
      const qColor = getQualityColor(item);
      // Icon
      $('invItemOverlayIcon').innerHTML = renderItemIcon(item, 56);
      // Name — barva podle kvality, s počtem socketů
      $('invItemOverlayName').textContent = getItemSocketName(item);
      $('invItemOverlayName').style.color = qColor;
      // Border overlay content podle kvality
      $('invItemOverlayContent').style.borderColor = qColor;
      $('invItemOverlayStats').innerHTML = buildItemStatsHtml(item);

      // Socket overlay — kulaté sloty
      const socketOverlay = $('invItemOverlaySockets');
      if (socketOverlay) {
        if (item.sockets && item.sockets > 0) {
          let shtml = '';
          for (let i = 0; i < item.sockets; i++) {
            const gem = item.socketedGems && item.socketedGems[i];
            if (gem) {
              const gemData = GEMS[gem.type];
              const gemId = gem.type + (gem.quality === 'normal' ? '' : '_' + gem.quality);
              const gemImg = 'assets/gems/' + gemId + '.png';
              shtml += `<div class="socket-slot filled" title="${gem.name}"><img src="${gemImg}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;image-rendering:pixelated"></div>`;
            } else {
              shtml += `<div class="socket-slot empty" data-socket-idx="${i}"></div>`;
            }
          }
          socketOverlay.innerHTML = shtml;
          socketOverlay.classList.remove('hidden');
          // Klik na prázdný socket slot → otevřít gem select modal
          socketOverlay.querySelectorAll('.socket-slot.empty').forEach(el => {
            el.onclick = function(e) {
              e.stopPropagation();
              const idx = parseInt(this.dataset.socketIdx);
              closeItemOverlay();
              openGemSelectModal(item.id, idx);
            };
          });
        } else {
          socketOverlay.classList.add('hidden');
        }
      }

      // Srovnávací panel — nasazený předmět stejného slotu
      const compareEl = $('invItemOverlayCompare');
      const slotMap = { weapon:'weapon', armor:'armor', helmet:'helmet', shield:'shield', ring:'ring1', belt:'belt', amulet:'amulet', gloves:'gloves', boots:'boots' };
      const equipSlot = slotMap[item.type];
      const defaults = { weapon:'fists', armor:null, helmet:null, shield:null, ring1:null, ring2:null, amulet:null, belt:null, gloves:null, boots:null };
      let hasCompare = false;

      // Pokud je prohlížený item ten samý, co je nasazený — Equipped nedává smysl
      const currentEquippedId = equipSlot ? state.hero.equip[equipSlot] : null;
      const isSameAsEquipped = currentEquippedId && currentEquippedId === item.id;

      if (equipSlot) {
        // Speciální: prsteny — label Ring 1 / Ring 2
        if (item.type === 'ring') {
          const ring1Id = state.hero.equip.ring1;
          const ring2Id = state.hero.equip.ring2;
          const ring1 = ring1Id ? ITEM_MAP[ring1Id] : null;
          const ring2 = ring2Id ? ITEM_MAP[ring2Id] : null;
          let bothHtml = '';
          const ringEntries = [
            { label: 'Ring 1', ring: ring1 },
            { label: 'Ring 2', ring: ring2 }
          ];
          ringEntries.forEach(({label, ring: r}) => {
            if (!r || r.id === item.id) return;
            const eqColor = getQualityColor(r);
            bothHtml += `<div style="color:#888;font-size:11px;margin-bottom:2px">${label}</div>`;
            bothHtml += `<div style="color:${eqColor};font-weight:bold;font-size:13px;margin-bottom:4px">${r.name}</div>`;
            bothHtml += buildItemStatsHtml(r);
            bothHtml += '<div style="height:4px"></div>';
          });
          if (bothHtml) {
            $('invItemOverlayCompareIcon').innerHTML = '';
            $('invItemOverlayCompareStats').innerHTML = bothHtml;
            hasCompare = true;
          }
        }
        // Speciální: zbraně — label Main Hand / Off Hand
        else if (item.type === 'weapon') {
          const mhId = state.hero.equip.weapon;
          const ohId = state.hero.equip.shield;
          const mh = mhId && mhId !== 'fists' ? ITEM_MAP[mhId] : null;
          const oh = (ohId && ITEM_MAP[ohId] && ITEM_MAP[ohId].weaponType) ? ITEM_MAP[ohId] : null;
          let bothHtml = '';
          const weaponEntries = [
            { label: 'Main Hand', weapon: mh },
            { label: 'Off Hand', weapon: oh }
          ];
          weaponEntries.forEach(({label, weapon: w}) => {
            if (!w || w.id === item.id) return;
            const eqColor = getQualityColor(w);
            bothHtml += `<div class="inv-compare-weapon-block">`;
            bothHtml += `<div class="inv-compare-weapon-header">${label}</div>`;
            bothHtml += `<div class="inv-compare-weapon-name" style="color:${eqColor}">${w.name}</div>`;
            bothHtml += buildItemStatsHtml(w);
            bothHtml += `</div>`;
          });
          if (bothHtml) {
            $('invItemOverlayCompareIcon').innerHTML = '';
            $('invItemOverlayCompareStats').innerHTML = bothHtml;
            hasCompare = true;
          }
        }
        // Ostatní sloty
        else {
          const equippedId = state.hero.equip[equipSlot];
          if (equippedId && equippedId !== defaults[equipSlot] && equippedId !== item.id) {
            const equipped = ITEM_MAP[equippedId];
            if (equipped) {
              const eqColor = getQualityColor(equipped);
              $('invItemOverlayCompareIcon').innerHTML = renderItemIcon(equipped, 40);
              $('invItemOverlayCompareStats').innerHTML = buildItemStatsHtml(equipped);
              hasCompare = true;
            }
          }
        }
      }
      // Zobrazit compare sekci jen pokud je co porovnávat
      if (hasCompare) {
        compareEl.classList.remove('hidden');
      } else {
        compareEl.classList.add('hidden');
      }
      // Equip/Unequip tlačítko
      const btn = $('invItemOverlayBtn');
      const btn2 = $('invItemOverlayBtn2');
      if (window._invSelectedIdx !== null && item.type !== 'gem') {
        // Item z batohu
        const isWeapon = item.type === 'weapon';
        const isOneHand = isWeapon && !item.twoHand;
        const isRing = item.type === 'ring';
        const cls = CLASSES[state.heroClass];
        const canDualWield = cls && cls.dualWield && isOneHand;
        if (canDualWield) {
          // Dvě tlačítka pro dual wield — vedle sebe
          btn.textContent = 'Equip Main Hand';
          btn.className = 'inv-item-overlay-btn';
          btn.onclick = function() {
            equipItemToSlot(window._invSelectedIdx, 'weapon');
            closeItemOverlay();
            clearSelection();
          };
          btn.classList.remove('hidden');
          btn2.textContent = 'Equip Off Hand';
          btn2.className = 'inv-item-overlay-btn';
          btn2.onclick = function() {
            equipItemToSlot(window._invSelectedIdx, 'shield');
            closeItemOverlay();
            clearSelection();
          };
          btn2.classList.remove('hidden');
        } else if (isRing) {
          // Dvě tlačítka pro ringy — Ring 1 / Ring 2
          btn.textContent = 'Equip Ring 1';
          btn.className = 'inv-item-overlay-btn';
          btn.onclick = function() {
            equipItemToSlot(window._invSelectedIdx, 'ring1');
            closeItemOverlay();
            clearSelection();
          };
          btn.classList.remove('hidden');
          btn2.textContent = 'Equip Ring 2';
          btn2.className = 'inv-item-overlay-btn';
          btn2.onclick = function() {
            equipItemToSlot(window._invSelectedIdx, 'ring2');
            closeItemOverlay();
            clearSelection();
          };
          btn2.classList.remove('hidden');
        } else {
          // Jedno tlačítko
          btn.textContent = 'Equip';
          btn.className = 'inv-item-overlay-btn';
          btn.onclick = function() {
            equipItem(window._invSelectedIdx);
            closeItemOverlay();
            clearSelection();
          };
          btn.classList.remove('hidden');
          btn2.classList.add('hidden');
        }
      } else if (window._invSelectedSlot !== null) {
        // Item z equip slotu → Unequip
        btn.textContent = 'Unequip';
        btn.className = 'inv-item-overlay-btn';
        const slot = window._invSelectedSlot;
        btn.onclick = function() {
          unequipSlot(slot);
          closeItemOverlay();
          clearSelection();
        };
        btn.classList.remove('hidden');
        btn2.classList.add('hidden');
      } else {
        btn.classList.add('hidden');
        btn2.classList.add('hidden');
      }
      ov.classList.remove('hidden');
    }

  function clearSelection() {
    window._invSelectedIdx = null;
    window._invSelectedSlot = null;
    document.querySelectorAll('.chest-cell.selected, .inv-equip-slot.selected').forEach(el => el.classList.remove('selected'));
  }

  function renderInventory() {
    // Reset scroll pozice batohu při každém otevření
    const gridWrap = $('invGridWrap');
    if (gridWrap) gridWrap.scrollTop = 0;
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
    const gloves = ITEM_MAP[h.equip.gloves];
    const boots = ITEM_MAP[h.equip.boots];
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
    const r1El = $('invSlotRing1Icon'); if (r1El) r1El.innerHTML = ring1 ? renderItemIcon(ring1, 0) : renderItemIcon({iconImg:'assets/items/ring_copper.png',tier:1}, 0);
    const r1S = $('invSlotRing1'); if (r1S) { r1S.classList.toggle('empty', !ring1); setSlotBorder('invSlotRing1', ring1); }
    const r2El = $('invSlotRing2Icon'); if (r2El) r2El.innerHTML = ring2 ? renderItemIcon(ring2, 0) : renderItemIcon({iconImg:'assets/items/ring_copper.png',tier:1}, 0);
    const r2S = $('invSlotRing2'); if (r2S) { r2S.classList.toggle('empty', !ring2); setSlotBorder('invSlotRing2', ring2); }
    const amEl = $('invSlotAmuletIcon'); if (amEl) amEl.innerHTML = amulet ? renderItemIcon(amulet, 0) : renderItemIcon({iconImg:'assets/items/amulet_bone.png',tier:1}, 0);
    const amS = $('invSlotAmulet'); if (amS) { amS.classList.toggle('empty', !amulet); setSlotBorder('invSlotAmulet', amulet); }
    const bEl = $('invSlotBeltIcon'); if (bEl) bEl.innerHTML = belt ? renderItemIcon(belt, 0) : renderItemIcon({iconImg:'assets/items/belt_cloth.png',tier:1}, 0);
    const bS = $('invSlotBelt'); if (bS) { bS.classList.toggle('empty', !belt); setSlotBorder('invSlotBelt', belt); }
    const gEl = $('invSlotGlovesIcon'); if (gEl) gEl.innerHTML = gloves ? renderItemIcon(gloves, 0) : renderItemIcon({iconImg:'assets/items/gloves_leather.png',tier:1}, 0);
    const gS = $('invSlotGloves'); if (gS) { gS.classList.toggle('empty', !gloves); setSlotBorder('invSlotGloves', gloves); }
    const bEl2 = $('invSlotBootsIcon'); if (bEl2) bEl2.innerHTML = boots ? renderItemIcon(boots, 0) : renderItemIcon({iconImg:'assets/items/boots_boots.png',tier:1}, 0);
    const bS2 = $('invSlotBoots'); if (bS2) { bS2.classList.toggle('empty', !boots); setSlotBorder('invSlotBoots', boots); }
    // Town portal slot — stackovaný
    const tpSlot = $('invSlotTownPortal');
    const tpIcon = $('invSlotTPIcon');
    const tpCount = state.townPortalCount || 0;
    if (tpSlot) {
      tpSlot.classList.toggle('empty', tpCount <= 0);
      if (tpIcon) {
        if (tpCount > 0) {
          tpIcon.innerHTML = `<div style="position:relative;width:100%;height:100%"><img src="assets/items/town_portal_scroll.png" style="width:100%;height:100%;object-fit:cover"><span style="position:absolute;bottom:-2px;right:-2px;background:#111;border:1px solid #f1c40f;border-radius:4px;color:#f1c40f;font-size:10px;font-weight:bold;padding:0 3px;line-height:14px">${tpCount}</span></div>`;
        } else {
          tpIcon.innerHTML = '<img src="assets/items/town_portal_scroll.png" style="width:100%;height:100%;object-fit:cover;opacity:0.25;filter:grayscale(1)">';
        }
      }
    }
    // Potion sloty podle beltRows (každý řádek = 4 sloty); bez pásku výchozích 4
    const potionSlots = $('invPotionSlots');
    if (potionSlots) {
      const totalSlots = getTotalPotionSlots();
      const bpSlots = h.equip.beltPotionSlots || [];
      // Zajistit, že bpSlots má správnou délku
      while (bpSlots.length < totalSlots) bpSlots.push(null);
      if (bpSlots.length > totalSlots) bpSlots.length = totalSlots;
      h.equip.beltPotionSlots = bpSlots;
      let phtml = '';
      for (let i = 0; i < totalSlots; i++) {
        const potId = bpSlots[i];
        const potItem = potId ? ITEM_MAP[potId] : null;
        phtml += `<div class="inv-potion-slot ${potItem ? '' : 'empty'}" data-potion-idx="${i}">\n          <div class="inv-slot-icon">${potItem ? renderItemIcon(potItem, 0) : '<img src="assets/items/potion_healing_light.png" alt="" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:4px;filter:grayscale(1);opacity:0.25">'}</div>\n        </div>`;
      }
      potionSlots.innerHTML = phtml;
    }
    // Grid batohu — 4 sloupce, max 20 buněk
    const grid = $('invGrid');
    const inv = h.inventory || [];
    const maxCells = 20;
    let html = '';
    for (let i = 0; i < maxCells; i++) {
      const entry = inv[i];
      if (entry) {
        const itemId = typeof entry === 'object' ? entry.id : entry;
        const count = typeof entry === 'object' ? (entry.count || 1) : 1;
        const item = ITEM_MAP[itemId];
        if (!item) { html += '<div class="chest-cell empty"></div>'; continue; }
        const stats = item.type === 'weapon' ? `⚔️${item.baseDmg}` : item.type === 'ring' || item.type === 'amulet' ? (item.skillDmg ? `✨+${item.skillDmg}%` : item.manaRegen ? `💧+${item.manaRegen}` : item.str ? `💪+${item.str}` : item.int ? `🧠+${item.int}` : item.vit ? `❤️+${item.vit}` : item.dex ? `🎯+${item.dex}` : item.lifesteal ? `🩸+${item.lifesteal}%` : '') : item.bonusHp ? `❤️${item.bonusHp}` : '';
        const borderColor = getQualityColor(item);
        const cls = CLASSES[state.heroClass];
        let canEquip = true;
        if (item.type === 'weapon' && cls && cls.allowedWeapons && !cls.allowedWeapons.includes(item.weaponType)) canEquip = false;
        if (item.type === 'shield' && cls && cls.allowedShield === false) canEquip = false;
        const cellStyle = canEquip ? `border-color:${borderColor}` : `border-color:#e74c3c;opacity:0.35`;
        const countLabel = count > 1 ? `<span class="cell-count">${count}</span>` : '';
        html += `<div class="chest-cell" data-idx="${i}" draggable="true" style="${cellStyle}">
          <div class="cell-icon">${renderItemIcon(item,0)}${countLabel}</div>
          <div class="cell-name">${getItemSocketName(item)}</div>
        </div>`;
      } else {
        html += '<div class="chest-cell empty"></div>';
      }
    }
    grid.innerHTML = html;
    // Info panel — D2 overlay
    // Klik na pozadí overlaye → zavřít
    const ovBg = $('invItemOverlayBg');
    const ovContent = $('invItemOverlayContent');
    if (ovBg && !ovBg._handlerSet) {
      ovBg._handlerSet = true;
      ovBg.onclick = function() {
        closeItemOverlay();
        clearSelection();
      };
    }
    if (ovContent && !ovContent._handlerSet) {
      ovContent._handlerSet = true;
      ovContent.onclick = function(e) { e.stopPropagation(); };
    }
    // Tap-to-equip: globální stav, přetrvává mezi renderInventory() voláními
    const slotMap = { invSlotWeapon:'weapon', invSlotArmor:'armor', invSlotHelmet:'helmet', invSlotShield:'shield', invSlotRing1:'ring1', invSlotRing2:'ring2', invSlotAmulet:'amulet', invSlotBelt:'belt', invSlotGloves:'gloves', invSlotBoots:'boots' };
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
        // Pokud je vybraný item v batohu → nic, equip jde jen přes tlačítko v info okně
        if (window._invSelectedIdx !== null) {
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
      const cell = e.target.closest('.chest-cell');
      if (cell) {
        if (cell.classList.contains('empty')) {
          clearSelection();
          return;
        }
        const idx = parseInt(cell.dataset.idx);
        const entry = inv[idx];
        const itemId = typeof entry === 'object' ? entry.id : entry;
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
          const entry = inv[window._invSelectedIdx];
          const selItemId = typeof entry === 'object' ? entry.id : entry;
          const selItem = selItemId ? ITEM_MAP[selItemId] : null;
          if (selItem && selItem.type === 'consumable') {
            // Odebrat z batohu
            removeFromInventory(inv, selItemId);
            // Pokud už v tom slotu něco je, vrátit do batohu
            if (bpSlots[potIdx]) addToInventory(inv, bpSlots[potIdx]);
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
          addToInventory(inv, potId);
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
    const defaults = { weapon:'fists', armor:null, helmet:null, shield:null, ring1:null, ring2:null, amulet:null, belt:null, gloves:null, boots:null };
    const current = h.equip[slot];
    if (!current || current === defaults[slot]) return;
    if (h.inventory.length >= 20) { showMessage('❌ Inventář je plný!'); return; }
    addToInventory(h.inventory, current);
    h.equip[slot] = defaults[slot];
    h.baseDmg = Math.round((getHeroDmg().min + getHeroDmg().max) / 2);
    h.maxHp = getHeroMaxHp();
    h.hp = Math.min(h.hp, h.maxHp);
    saveGame();
    renderInventory();
    renderHero();
  }

  function equipItemToSlot(invIdx, targetSlot) {
    const h = state.hero;
    const entry = h.inventory[invIdx];
    const itemId = typeof entry === 'object' ? entry.id : entry;
    if (!itemId) return;
    const item = ITEM_MAP[itemId];
    if (!item) return;
    // Zjistit správný slot podle typu itemu
    const typeToSlot = { weapon:'weapon', armor:'armor', helmet:'helmet', shield:'shield', ring:'ring1', belt:'belt', amulet:'amulet', gloves:'gloves', boots:'boots' };
    let correctSlot = typeToSlot[item.type];
    if (!correctSlot) return;
    // Ring může jít do ring1 nebo ring2
    if (item.type === 'ring' && (targetSlot === 'ring1' || targetSlot === 'ring2')) {
      correctSlot = targetSlot;
    }
    // Shield slot může přijmout: shield, offhand, nebo zbraň (pro dual wield)
    if (targetSlot === 'shield') {
      // Pokud má hráč 2H zbraň v main hand, sundat ji (dát do batohu)
      const mainWeapon = h.equip.weapon ? ITEM_MAP[h.equip.weapon] : null;
      const hasTwoHand = mainWeapon && mainWeapon.twoHand === true;
      if (hasTwoHand) {
        // Sundat 2H zbraň do batohu
        if (h.inventory.length >= 20) { showMessage('❌ Inventář je plný!'); return; }
        addToInventory(h.inventory, h.equip.weapon);
        h.equip.weapon = 'fists';
      }
      if (item.type === 'shield' || item.type === 'offhand') {
        correctSlot = 'shield';
      } else if (item.type === 'weapon' && !item.twoHand) {
        const cls = CLASSES[state.heroClass];
        if (cls && cls.dualWield) {
          correctSlot = 'shield';
        }
      }
    }
    // Pokud target slot neodpovídá, nedělat nic
    if (targetSlot !== correctSlot) return;
    // Pokud je to weapon a target je shield, dát do shield slotu
    if (item.type === 'weapon' && targetSlot === 'shield') {
      removeFromInventory(h.inventory, itemId);
      if (h.equip.shield) addToInventory(h.inventory, h.equip.shield);
      h.equip.shield = itemId;
      h.baseDmg = Math.round((getHeroDmg().min + getHeroDmg().max) / 2);
      h.maxHp = getHeroMaxHp();
      h.hp = Math.min(h.hp, h.maxHp);
      playSFX(equipSfx);
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
    const entry = h.inventory[invIdx];
    const itemId = typeof entry === 'object' ? entry.id : entry;
    if (!itemId) return;
    const item = ITEM_MAP[itemId];
    if (!item) return;
    // Už nasazený ve svém slotu — neduplikovat
    if (item.type === 'weapon' && h.equip.weapon === itemId) return;
    if (item.type === 'ring' && (h.equip.ring1 === itemId || h.equip.ring2 === itemId)) return;
    const singleSlot = { armor:'armor', helmet:'helmet', belt:'belt', amulet:'amulet', gloves:'gloves', boots:'boots', shield:'shield' }[item.type];
    if (singleSlot && h.equip[singleSlot] === itemId) return;
    // Odstranit nový item z inventáře PRVNĚ (dřív než pushneme starý)
    removeFromInventory(h.inventory, itemId);
    if (item.type === 'weapon') {
      // Kontrola, zda classa smí používat tento typ zbraně
      const cls = CLASSES[state.heroClass];
      if (cls && cls.allowedWeapons && !cls.allowedWeapons.includes(item.weaponType)) {
        addToInventory(h.inventory, itemId); // vrátit zpět
        return;
      }
      // Obouruční zbraň vyhodí štít i offhand zpět do batohu
      const isTwoHanded = item.twoHand === true;
      if (isTwoHanded) {
        if (h.equip.shield) { addToInventory(h.inventory, h.equip.shield); h.equip.shield = null; }
      }
      // Prostě vyměnit main hand — offhand zůstává jak je
      if (h.equip.weapon !== 'fists') addToInventory(h.inventory, h.equip.weapon);
      h.equip.weapon = itemId;
    } else if (item.type === 'armor') {
      if (h.equip.armor) addToInventory(h.inventory, h.equip.armor);
      h.equip.armor = itemId;
    } else if (item.type === 'helmet') {
      if (h.equip.helmet) addToInventory(h.inventory, h.equip.helmet);
      h.equip.helmet = itemId;
    } else if (item.type === 'shield') {
      // Kontrola, zda classa smí používat štít
      const cls = CLASSES[state.heroClass];
      if (cls && cls.allowedShield === false) {
        addToInventory(h.inventory, itemId); // vrátit zpět
        return;
      }
      // Štít nejde s obouruční zbraní — vyhodit zbraň zpět
      const curWeapon = ITEM_MAP[h.equip.weapon];
      const isTwoHanded = curWeapon && curWeapon.twoHand === true;
      if (isTwoHanded) {
        addToInventory(h.inventory, h.equip.weapon);
        h.equip.weapon = 'fists';
      }
      if (h.equip.shield) addToInventory(h.inventory, h.equip.shield);
      h.equip.shield = itemId;
    } else if (item.type === 'ring') {
      if (!h.equip.ring1) {
        h.equip.ring1 = itemId;
      } else if (!h.equip.ring2) {
        h.equip.ring2 = itemId;
      } else {
        addToInventory(h.inventory, h.equip.ring1);
        h.equip.ring1 = itemId;
      }
    } else if (item.type === 'belt') {
      if (h.equip.belt) addToInventory(h.inventory, h.equip.belt);
      h.equip.belt = itemId;
      // Inicializovat potion sloty podle beltRows
      const beltItem = ITEM_MAP[itemId];
      const rows = beltItem ? (beltItem.beltRows || 0) : 0;
      const slots = rows * 4;
      h.equip.beltPotionSlots = h.equip.beltPotionSlots || [];
      while (h.equip.beltPotionSlots.length < slots) h.equip.beltPotionSlots.push(null);
      while (h.equip.beltPotionSlots.length > slots) {
        const removed = h.equip.beltPotionSlots.pop();
        if (removed) addToInventory(h.inventory, removed);
      }
    } else if (item.type === 'amulet') {
      if (h.equip.amulet) addToInventory(h.inventory, h.equip.amulet);
      h.equip.amulet = itemId;
    } else if (item.type === 'gloves') {
      if (h.equip.gloves) addToInventory(h.inventory, h.equip.gloves);
      h.equip.gloves = itemId;
    } else if (item.type === 'boots') {
      if (h.equip.boots) addToInventory(h.inventory, h.equip.boots);
      h.equip.boots = itemId;
    } else if (item.type === 'consumable') {
      // Potiony a town portal scrolly — vložit do belt slotu nebo přičíst
      if (item.subtype === 'townPortal') {
        state.townPortalCount = (state.townPortalCount || 0) + 1;
      } else {
        // healingPotion / manaPotion — vložit do prvního volného belt slotu
        const bpSlots = h.equip.beltPotionSlots || [];
        const emptyIdx = bpSlots.indexOf(null);
        if (emptyIdx !== -1) {
          bpSlots[emptyIdx] = itemId;
          h.equip.beltPotionSlots = bpSlots;
        } else {
          // Všechny sloty plné — vrátit do inventáře
          addToInventory(h.inventory, itemId);
          showMessage('❌ No empty belt slots!');
          return;
        }
      }
      saveGame();
      renderInventory();
      renderHero();
      return;
    }
    h.baseDmg = Math.round((getHeroDmg().min + getHeroDmg().max) / 2);
    h.maxHp = getHeroMaxHp();
    h.hp = Math.min(h.hp, h.maxHp);
    h.maxMana = getHeroMaxMana();
    h.mana = Math.min(h.mana, h.maxMana);
    syncBattleMana();
    playSFX(equipSfx);
    saveGame();
    showMessage(`🎽 Oblékl jsi ${item.icon} ${getItemSocketName(item)}!`);
    renderInventory();
    renderHero();
  }

  function unequipItem(itemId) {
    const h = state.hero;
    if (h.inventory.length >= 20) { showMessage('❌ Inventář je plný!'); return; }
    const item = ITEM_MAP[itemId];
    if (!item) return;
    const defaults = { weapon:'fists', armor:null, helmet:null, shield:null, ring1:null, ring2:null, amulet:null, belt:null, gloves:null, boots:null };
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
      bpSlots.forEach(potId => { if (potId) addToInventory(h.inventory, potId); });
      h.equip.beltPotionSlots = [];
      h.equip.belt = defaults.belt;
    } else if (item.type === 'amulet') {
      if (h.equip.amulet === itemId) h.equip.amulet = defaults.amulet;
      else return;
    } else if (item.type === 'gloves') {
      if (h.equip.gloves !== itemId) return;
      h.equip.gloves = defaults.gloves;
    } else if (item.type === 'boots') {
      if (h.equip.boots !== itemId) return;
      h.equip.boots = defaults.boots;
    } else return;
    addToInventory(h.inventory, itemId);
    h.baseDmg = Math.round((getHeroDmg().min + getHeroDmg().max) / 2);
    h.maxHp = getHeroMaxHp();
    h.hp = Math.min(h.hp, h.maxHp);
    h.maxMana = getHeroMaxMana();
    h.mana = Math.min(h.mana, h.maxMana);
    syncBattleMana();
    playSFX(equipSfx);
    saveGame();
    showMessage(`📦 Sundal jsi ${item.icon} ${getItemSocketName(item)} do inventáře!`);
    renderInventory();
    renderHero();
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
    initGemItems();
    // Fáze 3: přednačíst dungeon pozadí do cache, aby bitva neměla zpoždění
    preloadDungeonAssets();

    // Preinit canvas vrstev hned při startu hry — pixi.js se načte a vrstvy se
    // vytvoří už teď (na skryté aréně; self-heal v tickeru je přepočítá, jakmile
    // se aréna zobrazí). První bitva pak má dungeon pozadí okamžitě.
    const arenaPreinit = document.getElementById('mbArena');
    if (arenaPreinit) {
      initBattleScene(arenaPreinit);
      initMeleeLayer(arenaPreinit);
    }

    // Nav-bar schovat hned na začátku — splash ho překrývá, ale po fade by prosvítal
    const navBar = document.querySelector('.nav-bar');
    if (navBar) navBar.classList.add('hidden');

    // Globální click SFX pro tlačítka (vyjma arénových spell/potion tlačítek)
    document.addEventListener('click', function(e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      // Přeskočit tlačítka v aréně (mají vlastní SFX) a tlačítka v obchodě (koupit/prodat)
      if (btn.closest('.mb-spells') || btn.closest('.mb-potion-buttons') || btn.closest('.arena-surrender-btn') || btn.closest('.shop-item-actions')) return;
      playSFX(clickSfx);
    });

    // Splash screen — fade in, 2.5s, fade out, pak teprve zobrazit UI
    const splash = document.getElementById('splashScreen');
    if (splash) {
      setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => {
          splash.classList.add('hidden');
          // Až po splashi zobrazit class select nebo město
          if (!state.heroClass) {
            showScreen('classSelect');
          } else {
            showScreen('town');
            renderTown();
            updateTalentBadge();
          }
        }, 600);
      }, 2500);
    } else {
      // Fallback — splash není, rovnou ukázat
      if (!state.heroClass) {
        showScreen('classSelect');
      } else {
        showScreen('town');
        renderTown();
        updateTalentBadge();
      }
    }

    // Přednačtení obrázků monster do cache pro okamžité zobrazení v souboji
    const allMonsterFaces = [];
    MONSTER_DB.forEach(theme => theme.forEach(m => {
      if (m.face && m.face.startsWith('assets/')) allMonsterFaces.push(m.face);
    }));
    ACTS.forEach(loc => {
      if (loc.boss && loc.boss.face && loc.boss.face.startsWith('assets/')) allMonsterFaces.push(loc.boss.face);
    });
    // Deduplikace a prefetch
    [...new Set(allMonsterFaces)].forEach(src => { const img = new Image(); img.src = src; });

    if (!state.bossesDefeated || !Array.isArray(state.bossesDefeated) || state.bossesDefeated.length < 3 || !Array.isArray(state.bossesDefeated[0])) state.bossesDefeated = [[false,false,false,false,false],[false,false,false,false,false],[false,false,false,false,false]];
    if (!state.locationProgress || state.locationProgress.length < ACTS.length) state.locationProgress = Array(ACTS.length).fill(0);
    if (!state.areaFightProgress || state.areaFightProgress.length < ACTS.length) state.areaFightProgress = Array(ACTS.length).fill(0);
    if (!state.floorProgress || state.floorProgress.length < ACTS.length) state.floorProgress = Array(ACTS.length).fill(0);
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
    // MIGRACE (JEN JEDNOU): dopočítat chybějící body podle levelu pouze pro staré
    // savy, které body nikdy nedostaly. Flag _pointsMigrated zabrání opakovanému
    // přidávání bodů při každém loadu (dřív se body hráči vracely, i když je utratil).
    if (!state._pointsMigrated) {
      // Dopočítat chybějící atributové body podle levelu (5/level, level 1 = 0)
      const expectedAttrPoints = (state.hero.level - 1) * 5;
      if (state.hero.attrPoints < expectedAttrPoints) {
        state.hero.attrPoints = expectedAttrPoints;
      }
      // Dopočítat chybějící talent pointy (1/level od lvl 2)
      const expectedTalentPoints = Math.max(0, state.hero.level - 1);
      if ((state.talentPoints || 0) < expectedTalentPoints) {
        state.talentPoints = expectedTalentPoints;
      }
      state._pointsMigrated = true;
      saveGame(); // uložit, aby se body už znovu nepřidávaly
    }
    // Vždy aktualizovat maxHp/maxMana podle aktuálního levelu a itemů
    state.hero.maxHp = getHeroMaxHp();
    state.hero.maxMana = getHeroMaxMana();
    if (state.hero.hp === undefined) state.hero.hp = state.hero.maxHp;
    if (state.heroClass === undefined) state.heroClass = null;
    // Migrace: staré savy bez portrétu — nastavit podle classy
    if (state.heroClass && (!state.hero.face || state.hero.face === 'hero')) {
      const classFaces = { barbarian:'hero_barbarian_m', assassin:'hero_rogue_m', mage:'hero_mage_m' };
      state.hero.face = classFaces[state.heroClass] || 'hero';
    }

    // Nav-bar handlery musí být zaregistrované vždy, i když hráč ještě nevybral classu
    document.querySelectorAll('.nav-bar a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (a.dataset.screen === 'town') {
          // Transition do města (pokud tam hráč ještě není). Walk to town / town portal
          // mají vlastní transition — tady řešíme nav menu.
          if (_currentScreen !== 'town') {
            showTransition('town', state._currentActOnMap, () => { showScreen('town'); renderTown(); });
          }
        }
        else if (a.dataset.screen === 'map') showScreen('map');
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

    // Globální preventDefault na všech tlačítkách a klikatelných prvcích —
    // zabrání kontextové nabídce prohlížeče a text selectionu při držení.
    document.addEventListener('pointerdown', (e) => {
      const t = e.target;
      if (t && t.closest && t.closest('button, [onclick], .btn, .talent-btn, .map-location, .dot-wrap, .waypoint-btn, .result-tile, .mb-potion-btn, .shop-item, .grid-card, .color-lane, .simon-cell, .tree-tab, .shop-cat-tab, .diff-btn, .modal-close, .combined-tab, .nav-bar a')) {
        e.preventDefault();
      }
    }, { passive: false });
    document.addEventListener('contextmenu', (e) => {
      const t = e.target;
      if (t && t.closest && t.closest('button, [onclick], .btn, .talent-btn, .map-location, .dot-wrap, .waypoint-btn, .result-tile, .mb-potion-btn, .shop-item, .grid-card, .color-lane, .simon-cell, .tree-tab, .shop-cat-tab, .diff-btn, .modal-close, .combined-tab, .nav-bar a')) {
        e.preventDefault();
      }
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

  function handleCheckpoint(action) {
    if (action === 'rest') {
      state.hero.maxHp = getHeroMaxHp();
      state.hero.hp = state.hero.maxHp;
      state.hero.mana = getHeroMaxMana();
      saveGame();
      showScreen('map');
      renderMap();
    } else if (action === 'shop') {
      showScreen('shop');
    }
  }

  window.game = {
    showScreen, enterAct, startLocation, setDifficulty, toggleActExpand,
    upgradeAttr, buyItem, sellItem, sellSlotItem, equipItem, equipItemToSlot, unequipItem, unequipSlot,
    switchShopTab, switchShopCategory,
    showItemInfo, closeItemOverlay,
    openGemSelectModal, closeGemSelectModal,
    onMapRapidTap,
    onPsButton, onPsDefButton,
    investTalent, resetTalents, selectTalent, selectTree, setDifficulty,
    showSurrenderModal, cancelSurrender, confirmSurrender,
    renderBestiary,
    renderSpellbook,
    renderItemsReference,
    renameHero,
    showFaceSelect, closeFaceSelect, selectFace,
    selectClass,
    castClassSpell,
    usePotion, usePotionFromResult,
    townHeal, useTownPortal, renderTown, enterCurrentAct, closeModal,
    walkToTown, useTownPortalScrollFromMap, walkToTownFromResult, useTownPortalScrollFromResult, openModal, switchCombinedTab,
    continueToNextStop, openMapFromResult,
    renderChest,
    renderGamble, switchGambleCategory, switchGambleTab, buyGambleItem
  };
  init();
}
