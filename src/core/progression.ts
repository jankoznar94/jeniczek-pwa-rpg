// src/core/progression.ts — čisté výpočty progrese a obtížnosti.
// Extrahováno z src/game.ts (Fáze 2). Žádné DOM, žádný stav — jen parametry.
import { DIRECTIONS } from '../data/dungeons';
import { DIFFICULTIES } from '../data/monsters';
import { rand } from './utils';

/** Násobitel obtížnosti podle zóny a obtížnosti (Normal/Nightmare/Hell). */
export function getZoneMult(progress: number, difficulty: number): number {
  const configs = [
    { base: 1.0, step: 0.50 },   // Normal
    { base: 5.5, step: 0.72 },  // Nightmare
    { base: 12.0, step: 0.89 },  // Hell
  ];
  const cfg = configs[difficulty] || configs[0];
  return cfg.base + (progress || 0) * cfg.step;
}

/**
 * Level monstra — plynule roste s progresem v zóně a NAPŘÍČ obtížnostmi.
 * Rozsahy per-act definuje DIFFICULTIES[difficulty].actLevels (navazují přes
 * Normal → Nightmare → Hell až k capu hráče 60). Pokud obtížnost nemá actLevels,
 * spadne zpět na loc.minLevel/maxLevel (zpětná kompatibilita).
 */
export function getMonsterLevel(mb: any, difficulty = 0): number {
  const loc = mb.loc;
  if (!loc) return 1;
  const diffCfg = DIFFICULTIES[difficulty];
  const actLevels = diffCfg && diffCfg.actLevels;
  let minLevel = loc.minLevel;
  let maxLevel = loc.maxLevel;
  if (actLevels) {
    const actIdx = typeof loc.id === 'number' ? loc.id : 0;
    const range = actLevels[actIdx];
    if (range) { minLevel = range[0]; maxLevel = range[1]; }
  }
  const totalZones = loc.zones || 10;
  const zonePct = totalZones > 0 ? (mb.progress || 0) / totalZones : 0;
  const range = maxLevel - minLevel;
  return minLevel + Math.round(range * zonePct);
}

/** Čas útoku nepřítele (fixní attackSpeed + zpomalení z ledových kouzel). */
export function getEnemySwingTime(mb: any): number {
  let swingMs = mb.monsterAttackSpeed || 2000;
  if (mb._enemySlowPct && mb._enemySlowTimer > 0) {
    swingMs = Math.round(swingMs / (1 - mb._enemySlowPct / 100));
  }
  return swingMs;
}

/** Násobitel timeru podle patra a dungeonu. */
export function getFloorTimerMultiplier(floor: number, locId: number): number {
  if (locId === 1) return Math.pow(0.95, floor) * 1.15;
  return Math.pow(0.95, floor);
}

/** Šance typů útoků podle dungeonu a patra. */
export function getDungeonAttackChances(locId: number, floor: number): any {
  if (locId === 0 || locId === 1) return { grey: 85, yellow: 0, blue: 0, green: 0, inverted: 0, rapid: 0, truth: 0, lie: 0, freeze: 0 };
  if (locId === 2) {
    const f = floor || 0;
    const truth = Math.max(30, 70 - f * 4);
    const lie = Math.min(35, 15 + f * 2);
    const freeze = Math.min(35, 15 + f * 2);
    return { grey: 0, yellow: 0, blue: 0, green: 0, inverted: 0, rapid: 0, truth, lie, freeze };
  }
  if (locId === 3 || locId === 4) {
    const f = floor || 0;
    const truth = Math.max(20, 60 - f * 4);
    const lie = Math.min(40, 20 + f * 2);
    const freeze = Math.min(40, 20 + f * 2);
    return { grey: 0, yellow: 0, blue: 0, green: 0, inverted: 0, rapid: 0, truth, lie, freeze };
  }
  return { grey: 85, yellow: 0, blue: 0, green: 0, inverted: 0, rapid: 0, truth: 0, lie: 0, freeze: 0 };
}

/** Textová nápověda pro typ útoku. */
export function getAttackHint(attack: any): string {
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

/** Rarita lootu (boss vs. normální drop). */
export function getRarity(bossDrop: boolean): string {
  const r = Math.random();
  if (bossDrop) {
    if (r < 0.15) return 'unique';
    if (r < 0.40) return 'rare';
    if (r < 0.70) return 'magic';
    return 'common';
  } else {
    if (r < 0.01) return 'unique';
    if (r < 0.06) return 'rare';
    if (r < 0.35) return 'magic';
    return 'common';
  }
}

/**
 * D2 XP penalizace za rozdíl levelů hráče (cLvl) vs monstra (mLvl).
 * Tier 1 (cLvl < 25): monstra ±5 levelů dávají 100 %, mimo ně prudký pokles.
 * Tier 2 (cLvl 25-69): monstrum NAD hráčem = XP × cLvl/mLvl; pod hráčem −5 prudký pokles.
 * Tier 3 (>69): globální diminishing (u capu 60 se neuplatní; ponecháno pro úplnost).
 */
export function getXpMultiplier(cLvl: number, mLvl: number): number {
  const diff = mLvl - cLvl; // kladné = monstrum vyšší level
  const belowX = { 5:256, 6:207, 7:159, 8:110, 9:61, 10:13 };   // monstrum pod hráčem
  const aboveX = { 5:256, 6:174, 7:92, 8:38, 9:5 };              // monstrum nad hráčem (tier1)
  const below = (d: number) => { d = Math.abs(d); if (d <= 5) return 1; return (belowX[d] ?? 13) / 256; };
  const above = (d: number) => { if (d <= 5) return 1; return (aboveX[d] ?? 5) / 256; };
  if (cLvl < 25) return diff >= 0 ? above(diff) : below(diff);
  if (cLvl <= 69) return diff > 0 ? Math.max(0.05, cLvl / mLvl) : below(diff);
  // Tier 3 — cLvl 70+: x klesá od 1024 (100 %) k 5/1024 u 99
  const x = Math.max(5, 1024 - (cLvl - 69) * 48);
  return x / 1024;
}
export function generateAttack(chances: any, prevType: string, locId: number, floor: number): any {
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
  const mult = getFloorTimerMultiplier(floor || 0, locId);
  const baseTime = Math.round(1500 * mult);
  const jitter = Math.round(baseTime * (0.9 + Math.random() * 0.2));
  const windowTime = (type === 'yellow' || type === 'blue') ? Math.round(jitter * 1.5) : (type === 'rapid' ? Math.round(jitter * 3.0) : jitter);
  const dir = DIRECTIONS[rand(0,3)];
  if (type === 'blue') {
    const pairs = [['⬆️','⬇️'], ['⬅️','➡️']];
    const pair = pairs[rand(0,1)];
    const dirA = pair[0], dirB = pair[1];
    return { type, dir: dirA, twinDir: dirB, windowTime };
  }
  if (type === 'rapid') {
    const rapidTarget = Math.min(20 + Math.floor((floor||0) * 4), 35);
    return { type, dir, windowTime, rapidTarget };
  }
  return { dir, type, windowTime };
}
