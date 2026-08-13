// src/core/loot.ts — čisté loot/inventory výpočty.
// Extrahováno z src/game.ts (Fáze 2). Žádné DOM, žádný stav — jen parametry + importovaná data.
import { QUALITY_COLORS, SOCKET_CHANCE_NORMAL } from '../data/gems';

/** Odebere item z inventáře (podporuje stackable {id,count} i prosté stringy). */
export function removeFromInventory(inventory: any[], itemId: string, count?: number): void {
  for (let i = 0; i < inventory.length; i++) {
    const entry = inventory[i];
    const eid = typeof entry === 'object' ? entry.id : entry;
    if (eid === itemId) {
      if (typeof entry === 'object') {
        entry.count -= count || 1;
        if (entry.count <= 0) inventory.splice(i, 1);
      } else {
        inventory.splice(i, 1);
      }
      return;
    }
  }
}

/** Počet stacků itemu v inventáři (0 pokud není). */
export function getStackCount(inventory: any[], itemId: string): number {
  for (let i = 0; i < inventory.length; i++) {
    const entry = inventory[i];
    const eid = typeof entry === 'object' ? entry.id : entry;
    if (eid === itemId) return typeof entry === 'object' ? (entry.count || 1) : 1;
  }
  return 0;
}

/** Barva podle quality/rarity itemu. */
export function getQualityColor(item: any): string {
  if (item.unique) return QUALITY_COLORS.unique;
  const q = item.quality || item.rarity;
  if (q === 'rare') return QUALITY_COLORS.rare;
  if (q === 'magic') return QUALITY_COLORS.magic;
  return QUALITY_COLORS.normal;
}

/** Vážený náhodný výběr z pole podle weightKey. */
export function pickWeighted(arr: any[], weightKey: string): any {
  const total = arr.reduce((s, a) => s + a[weightKey], 0);
  let r = Math.random() * total;
  for (const a of arr) {
    r -= a[weightKey];
    if (r <= 0) return a;
  }
  return arr[arr.length - 1];
}

/** Náhodný roll statu v rozsahu [min, max]. */
export function rollStat(statRange: [number, number]): number {
  return statRange[0] + Math.floor(Math.random() * (statRange[1] - statRange[0] + 1));
}

/** D2 socket roll — jen normal quality kontaktní itemy, náhodný počet do maxSockets. */
export function rollSockets(itemType: string, quality: string, baseItem: any): number {
  if (quality !== 'normal') return 0;
  if (!baseItem || !baseItem.maxSockets) return 0;
  if (Math.random() >= SOCKET_CHANCE_NORMAL) return 0;
  return 1 + Math.floor(Math.random() * baseItem.maxSockets);
}

/** Název itemu s počtem socketů (pokud má). */
export function getItemSocketName(item: any): string {
  if (!item.sockets || item.sockets <= 0) return item.name;
  return item.name + ' (' + item.sockets + ')';
}
