// src/core/monsters.ts — čisté monster helpers.
// Extrahováno z src/game.ts (Fáze 2). Žádné DOM, žádný stav — jen parametry + importovaná data.
import { MONSTER_DB } from '../data/monsters';
import { rand } from './utils';

/** Náhodná tvář monstra z daného tématu. */
export function getMonsterFace(theme: number, floor: number): string {
  const pool = MONSTER_DB[theme] || MONSTER_DB[0];
  return pool[rand(0, pool.length - 1)].face;
}

/** Náhodné jméno monstra z daného tématu. */
export function getMonsterName(theme: number): string {
  const pool = MONSTER_DB[theme] || MONSTER_DB[0];
  return pool[rand(0, pool.length - 1)].name;
}
