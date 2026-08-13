// src/core/dungeons.ts — čisté dungeon helpers.
// Extrahováno z src/game.ts (Fáze 2). Žádné DOM, žádný stav — jen parametry + importovaná data.
import { ACTS } from '../data/acts';

/** Ikony resistů dungeonu (⚔️ slabé / 🛡️ silné). */
export function getDungeonResistIcons(locId: number): string {
  const loc = ACTS[locId];
  if (!loc || !loc.resists) return '';
  const r = loc.resists;
  let weak: string[] = [], strong: string[] = [];
  if (r.fire > 1.0) weak.push('🔥');
  else if (r.fire < 1.0) strong.push('🔥');
  if (r.ice > 1.0) weak.push('❄️');
  else if (r.ice < 1.0) strong.push('❄️');
  if (r.nature > 1.0) weak.push('🌿');
  else if (r.nature < 1.0) strong.push('🌿');
  let parts: string[] = [];
  if (weak.length) parts.push('⚔️' + weak.join(''));
  if (strong.length) parts.push('🛡️' + strong.join(''));
  return parts.length ? parts.join(' ') : '';
}
