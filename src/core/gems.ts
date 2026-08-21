// src/core/gems.ts — čisté gem výpočty.
// Extrahováno z src/game.ts (Fáze 2). Žádné DOM, žádný stav — jen parametry + importovaná data.
import { GEMS } from '../data/gems';

/** Aplikuje gem staty na item (weapon/armor). Element dmg jako rozsah [min,max]. */
export function applyGemStats(item: any, gemType: string, gemQuality: string): void {
  const gem = GEMS[gemType];
  if (!gem) return;
  const qData = gem.qualities[gemQuality];
  if (!qData) return;
  const isWeapon = item.type === 'weapon';
  const isShield = item.type === 'shield';
  const stats = isWeapon ? qData.weapon : (isShield ? qData.shield : qData.armor);
  if (!stats) return;
  const dmgStats = ['fireDmg', 'coldDmg', 'lightningDmg', 'poisonDmg'];
  Object.keys(stats).forEach(stat => {
    const val = stats[stat];
    if (Array.isArray(val)) {
      if (dmgStats.includes(stat)) {
        if (Array.isArray(item[stat])) {
          item[stat][0] += val[0];
          item[stat][1] += val[1];
        } else {
          const existing = item[stat] || 0;
          item[stat] = [existing + val[0], existing + val[1]];
        }
      } else {
        item[stat] = (item[stat] || 0) + val[1];
      }
    } else {
      item[stat] = (item[stat] || 0) + val;
    }
  });
}

/** HTML popis gem statů (weapon + armor). */
export function buildGemStatsHtml(gemType: string, gemQuality: string): string {
  const gem = GEMS[gemType];
  if (!gem) return '';
  const qData = gem.qualities[gemQuality];
  if (!qData) return '';
  const lines: string[] = [];
  if (qData.weapon) {
    lines.push('<div style="color:#888;font-size:10px;margin-top:2px">Weapon:</div>');
    Object.keys(qData.weapon).forEach(stat => {
      const val = qData.weapon[stat];
      const label = stat === 'fireDmg' ? 'Fire Dmg' : stat === 'coldDmg' ? 'Cold Dmg' : stat === 'lightningDmg' ? 'Lightning Dmg' : stat === 'poisonDmg' ? 'Poison Dmg' : stat === 'poisonDur' ? 'Duration' : stat;
      if (stat === 'poisonDmg' && qData.weapon.poisonDur) {
        lines.push(`<div style="color:#aaa;font-size:10px">  ${label}: ${val[0]} over ${qData.weapon.poisonDur}s</div>`);
      } else if (Array.isArray(val)) {
        lines.push(`<div style="color:#aaa;font-size:10px">  ${label}: ${val[0]}-${val[1]}</div>`);
      } else {
        lines.push(`<div style="color:#aaa;font-size:10px">  ${label}: ${val}</div>`);
      }
    });
  }
  if (qData.armor) {
    lines.push('<div style="color:#888;font-size:10px;margin-top:2px">Armor/Helm:</div>');
    Object.keys(qData.armor).forEach(stat => {
      const val = qData.armor[stat];
      const label = stat === 'bonusHp' ? '+HP' : stat === 'bonusMana' ? '+Mana' : stat === 'attackRating' ? 'Attack Rating' : stat === 'magicFind' ? 'MF' : stat === 'dex' ? 'Dexterity' : stat;
      lines.push(`<div style="color:#aaa;font-size:10px">  ${label}: ${val}</div>`);
    });
  }
  if (qData.shield) {
    lines.push('<div style="color:#888;font-size:10px;margin-top:2px">Shield:</div>');
    Object.keys(qData.shield).forEach(stat => {
      const val = qData.shield[stat];
      const label = stat === 'fireRes' ? 'Fire Resist' : stat === 'coldRes' ? 'Cold Resist' : stat === 'lightningRes' ? 'Lightning Resist' : stat === 'poisonRes' ? 'Poison Resist' : stat;
      lines.push(`<div style="color:#aaa;font-size:10px">  ${label}: +${val}%</div>`);
    });
  }
  return lines.join('');
}
