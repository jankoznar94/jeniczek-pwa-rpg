// src/core/weapon.ts — čisté výpočty poškození zbraní.
// Extrahováno z src/game.ts (Fáze 2). Žádné DOM, žádný stav — jen parametry.

/** Element barva zbraně podle element damage (fire/cold/poison/lightning). */
export function getWeaponElementColor(weapon: any): string | null {
  if (!weapon) return null;
  function hasDmg(v: any) { return Array.isArray(v) ? v[1] > 0 : (v > 0); }
  if (hasDmg(weapon.fireDmg)) return '#e67e22';
  if (hasDmg(weapon.coldDmg)) return '#4a7dff';
  if (weapon.poisonDmg) return '#2ecc71';
  if (hasDmg(weapon.lightningDmg)) return '#8b5cf6';
  return null;
}

/** Minimální celkové poškození zbraně (base + element). */
export function getWeaponTotalDmgMin(weapon: any): number {
  function getMin(v: any) { return Array.isArray(v) ? v[0] : (v || 0); }
  return (weapon.baseDmgMin || 0) + getMin(weapon.fireDmg) + getMin(weapon.coldDmg) + getMin(weapon.lightningDmg);
}

/** Maximální celkové poškození zbraně (base + element). */
export function getWeaponTotalDmgMax(weapon: any): number {
  function getMax(v: any) { return Array.isArray(v) ? v[1] : (v || 0); }
  return (weapon.baseDmgMax || 0) + getMax(weapon.fireDmg) + getMax(weapon.coldDmg) + getMax(weapon.lightningDmg);
}

/** Náhodné poškození zbraně v rozsahu [min, max]. */
export function getWeaponDmg(weapon: any): number {
  const min = getWeaponTotalDmgMin(weapon);
  const max = getWeaponTotalDmgMax(weapon);
  return min + Math.floor(Math.random() * (max - min + 1));
}
