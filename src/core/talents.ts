// src/core/talents.ts — talent/skill výpočty.
// Extrahováno z src/game.ts (Fáze 2). Čisté funkce — state se předává jako parametr.
import { CLASS_SKILLS } from '../data/classes';

/** Úroveň talentu podle klíče (classId_skillId). */
export function getTalentLv(state: any, key: string): number {
  return state.talentLevels[key] || 0;
}

/** Skill tree aktuální třídy hrdiny. */
export function getClassSkillTree(state: any): any {
  return CLASS_SKILLS[state.heroClass] || null;
}

/** Úroveň skillu včetně skillShout bonusu. */
export function getSkillLv(state: any, skillKey: string): number {
  return (state.talentLevels[skillKey] || 0) + (state.skillShoutBonus || 0);
}

/** Úroveň kouzla podle spellId a třídy. */
export function getSpellLv(state: any, spellId: string): number {
  const cls = state.heroClass;
  if (cls === 'barbarian') {
    if (spellId === 'heroicStrike') return getSkillLv(state, 'barbarian_heroicStrike');
    if (spellId === 'battleShout') return getSkillLv(state, 'barbarian_battleShout');
    if (spellId === 'thunderClap') return getSkillLv(state, 'barbarian_thunderClap');
    if (spellId === 'doubleSwing') return getSkillLv(state, 'barbarian_doubleSwing');
    if (spellId === 'defensiveShout') return getSkillLv(state, 'barbarian_defensiveShout');
    if (spellId === 'skillShout') return getSkillLv(state, 'barbarian_skillShout');
    if (spellId === 'thunderBolt') return getSkillLv(state, 'barbarian_thunderBolt');
    if (spellId === 'shieldBash') return getSkillLv(state, 'barbarian_shieldBash');
  }
  if (cls === 'assassin') {
    if (spellId === 'shadowStrike') return getSkillLv(state, 'assassin_shadowStrike');
    if (spellId === 'poisonBlade') return getSkillLv(state, 'assassin_poisonBlade');
    if (spellId === 'evasion') return getSkillLv(state, 'assassin_evasion');
    if (spellId === 'bladeFury') return getSkillLv(state, 'assassin_bladeFury');
    if (spellId === 'smokeScreen') return getSkillLv(state, 'assassin_smokeScreen');
    if (spellId === 'deathMark') return getSkillLv(state, 'assassin_deathMark');
    if (spellId === 'shadowDance') return getSkillLv(state, 'assassin_shadowDance');
    if (spellId === 'poisonedWeapon') return getSkillLv(state, 'assassin_poisonedWeapon');
    if (spellId === 'poisonExplosion') return getSkillLv(state, 'assassin_poisonExplosion');
  }
  if (cls === 'mage') {
    if (spellId === 'firebolt') return getSkillLv(state, 'mage_firebolt');
    if (spellId === 'icebolt') return getSkillLv(state, 'mage_icebolt');
    if (spellId === 'fireball') return getSkillLv(state, 'mage_fireball');
    if (spellId === 'frostbolt') return getSkillLv(state, 'mage_frostbolt');
    if (spellId === 'blizzard') return getSkillLv(state, 'mage_blizzard');
    if (spellId === 'fireblast') return getSkillLv(state, 'mage_fireblast');
    if (spellId === 'lightningBolt') return getSkillLv(state, 'mage_lightningBolt');
    if (spellId === 'chainLightning') return getSkillLv(state, 'mage_chainLightning');
    if (spellId === 'thunderStorm') return getSkillLv(state, 'mage_thunderStorm');
  }
  return 0;
}

/** Celkový počet bodů v daném tieru (napříč stromy). */
export function getTierPoints(state: any, classId: string, tierIdx: number): number {
  const cls = CLASS_SKILLS[classId];
  if (!cls) return 0;
  let total = 0;
  Object.keys(cls.trees).forEach(treeId => {
    const tree = cls.trees[treeId];
    if (tree.tiers[tierIdx]) {
      tree.tiers[tierIdx].choices.forEach(t => {
        total += getTalentLv(state, classId + '_' + t.k);
      });
    }
  });
  return total;
}

/** Je skill odemčený (splňuje requires)? */
export function isSkillUnlocked(state: any, t: any): boolean {
  if (!t.requires) return true;
  return getSkillLv(state, t.requires) >= t.requiresLv;
}

/** První odemčené kouzlo třídy (od nejvyššího tieru). */
export function getBestSpellId(state: any, classId: string): string | null {
  const cls = CLASS_SKILLS[classId];
  if (!cls) return null;
  for (let ti = 2; ti >= 0; ti--) {
    const treeIds = Object.keys(cls.trees);
    for (const treeId of treeIds) {
      const tree = cls.trees[treeId];
      if (tree.tiers[ti]) {
        for (const t of tree.tiers[ti].choices) {
          const key = classId + '_' + t.k;
          if (getTalentLv(state, key) > 0) return t.k;
        }
      }
    }
  }
  return null;
}
