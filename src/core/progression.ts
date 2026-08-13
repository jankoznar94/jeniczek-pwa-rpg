// src/core/progression.ts — čisté výpočty progrese a obtížnosti.
// Extrahováno z src/game.ts (Fáze 2). Žádné DOM, žádný stav — jen parametry.
import { DIRECTIONS } from '../data/dungeons';
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

/** Level monstra — lineárně od minLevel do maxLevel podle progresu v zóně. */
export function getMonsterLevel(mb: any): number {
  const loc = mb.loc;
  if (!loc || loc.minLevel === undefined) return 1;
  const totalZones = loc.zones || 10;
  const zonePct = totalZones > 0 ? (mb.progress || 0) / totalZones : 0;
  const range = loc.maxLevel - loc.minLevel;
  return loc.minLevel + Math.round(range * zonePct);
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

/** Vygeneruje útok podle šancí dungeonu (typ, směr, okno). */
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
