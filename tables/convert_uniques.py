#!/usr/bin/env python3
"""Konvertor D2 unique statů → herní staty (jeniczek-pwa-rpg).

Vstup: tables/d2-uniques-matched.json (name, base, gameid, level, stats[])
Výstup: tables/d2-uniques-converted.json (gameid, name, level, stats{...})
"""
import json, re, os

BASE = "/mnt/c/Users/Martin Fabian/Desktop/Zod-Files/pwa-game-auto-combat"
matched = json.load(open(BASE + "/tables/d2-uniques-matched.json", encoding="utf-8"))

def num(s):
    """Převede '60' → 60, '60–70' → [60,70], '60-70' → [60,70]."""
    s = s.strip().replace('+', '').replace('%', '').replace(' ', '')
    if '–' in s or '-' in s:
        parts = re.split(r'[–\-]', s)
        try:
            return [int(parts[0]), int(parts[1])]
        except:
            return None
    try:
        return int(s)
    except:
        return None

def add(stats, key, val):
    """Přidá hodnotu do stats. val může být int nebo [min,max]."""
    if val is None:
        return
    if key not in stats:
        stats[key] = val
    else:
        cur = stats[key]
        if isinstance(cur, list) and isinstance(val, list):
            stats[key] = [cur[0] + val[0], cur[1] + val[1]]
        elif isinstance(cur, list):
            stats[key] = [cur[0] + val, cur[1] + val]
        elif isinstance(val, list):
            stats[key] = [cur + val[0], cur + val[1]]
        else:
            stats[key] = cur + val

def convert_stat(line, stats):
    """Převede jeden D2 stat řádek na herní staty."""
    l = line.strip()
    if not l:
        return

    # === Enhanced Damage ===
    m = re.match(r'^\+?([\d–\-]+)% Enhanced Damage$', l)
    if m:
        add(stats, 'enhancedDmg', num(m.group(1))); return
    # Enhanced Maximum Damage (scaling) — map na enhancedDmg
    m = re.match(r'^\+?([\d–\-]+)% Enhanced Maximum Damage', l)
    if m:
        add(stats, 'enhancedDmg', num(m.group(1))); return

    # === Enhanced Defense ===
    m = re.match(r'^\+?([\d–\-]+)% Enhanced Defense$', l)
    if m:
        add(stats, 'enhancedDefense', num(m.group(1))); return

    # === Increased Attack Speed ===
    m = re.match(r'^\+?([\d–\-]+)% Increased Attack Speed$', l)
    if m:
        add(stats, 'ias', num(m.group(1))); return

    # === Adds X-Y <element> damage ===
    m = re.match(r'^Adds ([\d–\-]+) (fire|cold|lightning|magic|poison) damage$', l)
    if m:
        val = num(m.group(1)); elem = m.group(2)
        if elem == 'fire': add(stats, 'fireDmg', val)
        elif elem == 'cold': add(stats, 'coldDmg', val)
        elif elem == 'lightning': add(stats, 'lightningDmg', val)
        elif elem == 'magic': add(stats, 'lightningDmg', val)  # magic → lightning proxy
        elif elem == 'poison': add(stats, 'poisonDmg', val)
        return
    # Adds X-Y damage (physical)
    m = re.match(r'^Adds ([\d–\-]+) damage$', l)
    if m:
        add(stats, 'baseDmgMin', num(m.group(1))); return

    # === +X to Strength / Vitality / Dexterity / Energy ===
    m = re.match(r'^\+?([\d–\-]+) to Strength$', l)
    if m: add(stats, 'str', num(m.group(1))); return
    m = re.match(r'^\+?([\d–\-]+) to Vitality$', l)
    if m: add(stats, 'vit', num(m.group(1))); return
    m = re.match(r'^\+?([\d–\-]+) to Dexterity$', l)
    if m: add(stats, 'dex', num(m.group(1))); return
    m = re.match(r'^\+?([\d–\-]+) to Energy$', l)
    if m: add(stats, 'int', num(m.group(1))); return

    # === +X to all Attributes ===
    m = re.match(r'^\+?([\d–\-]+) to all Attributes$', l)
    if m:
        v = num(m.group(1))
        for k in ('str','vit','dex','int'): add(stats, k, v)
        return

    # === +X to Life / Mana ===
    m = re.match(r'^\+?([\d–\-]+) to Life$', l)
    if m: add(stats, 'bonusHp', num(m.group(1))); return
    m = re.match(r'^\+?([\d–\-]+) to Mana$', l)
    if m: add(stats, 'bonusMana', num(m.group(1))); return
    # +X to Life/Mana (Based on Character Level)
    m = re.match(r'^\+?([\d–\-]+) to (Life|Mana) \(Based on Character Level\)$', l)
    if m:
        v = num(m.group(1))
        if m.group(2) == 'Life': add(stats, 'bonusHp', v)
        else: add(stats, 'bonusMana', v)
        return

    # === +X to All Skills ===
    m = re.match(r'^\+?([\d–\-]+) to All Skills$', l)
    if m: add(stats, 'allSkills', num(m.group(1))); return

    # === X% Life/Mana stolen per hit ===
    m = re.match(r'^([\d–\-]+)% Life stolen per hit$', l)
    if m: add(stats, 'lifesteal', num(m.group(1))); return
    m = re.match(r'^([\d–\-]+)% Mana stolen per hit$', l)
    if m: add(stats, 'manaSteal', num(m.group(1))); return

    # === +X to Attack Rating ===
    m = re.match(r'^\+?([\d–\-]+) to Attack Rating$', l)
    if m: add(stats, 'attackRating', num(m.group(1))); return
    # X% Bonus to Attack Rating
    m = re.match(r'^([\d–\-]+)% Bonus to Attack Rating$', l)
    if m: add(stats, 'attackRating', num(m.group(1))); return

    # === Resists ===
    m = re.match(r'^All Resistances \+?([\d–\-]+)$', l)
    if m: add(stats, 'allRes', num(m.group(1))); return
    m = re.match(r'^Fire Resist \+?([\d–\-]+)%?$', l)
    if m: add(stats, 'fireRes', num(m.group(1))); return
    m = re.match(r'^Cold Resist \+?([\d–\-]+)%?$', l)
    if m: add(stats, 'coldRes', num(m.group(1))); return
    m = re.match(r'^Lightning Resist \+?([\d–\-]+)%?$', l)
    if m: add(stats, 'lightningRes', num(m.group(1))); return
    m = re.match(r'^Poison Resist \+?([\d–\-]+)%?$', l)
    if m: add(stats, 'poisonRes', num(m.group(1))); return

    # === Magic Find / Gold Find ===
    m = re.match(r'^([\d–\-]+)% Better Chance of Getting Magic Items$', l)
    if m: add(stats, 'magicFind', num(m.group(1))); return
    m = re.match(r'^([\d–\-]+)% Extra Gold from Monsters$', l)
    if m: add(stats, 'goldFind', num(m.group(1))); return

    # === +X Defense (flat) ===
    m = re.match(r'^\+?([\d–\-]+) Defense$', l)
    if m: add(stats, 'defense', num(m.group(1))); return

    # === +X to Minimum/Maximum Damage ===
    m = re.match(r'^\+?([\d–\-]+) to Minimum Damage$', l)
    if m: add(stats, 'baseDmgMin', num(m.group(1))); return
    m = re.match(r'^\+?([\d–\-]+) to Maximum Damage$', l)
    if m: add(stats, 'baseDmgMax', num(m.group(1))); return

    # === Regenerate Mana X% ===
    m = re.match(r'^Regenerate Mana ([\d–\-]+)%?$', l)
    if m: add(stats, 'manaRegen', num(m.group(1))); return

    # === Replenish Life +X ===
    m = re.match(r'^Replenish Life \+?([\d–\-]+)$', l)
    if m: add(stats, 'lifeRegen', num(m.group(1))); return

    # === Damage Reduced by X ===
    m = re.match(r'^Damage Reduced by ([\d–\-]+)$', l)
    if m: add(stats, 'dmgReduction', num(m.group(1))); return
    # Magic Damage Reduced by X
    m = re.match(r'^Magic Damage Reduced by ([\d–\-]+)$', l)
    if m: add(stats, 'dmgReduction', num(m.group(1))); return
    # Physical Damage Received Reduced by X%
    m = re.match(r'^Physical Damage Received Reduced by ([\d–\-]+)%$', l)
    if m: add(stats, 'dmgReduction', num(m.group(1))); return

    # === Attacker Takes Damage of X ===
    m = re.match(r'^Attacker Takes (?:Fire|Lightning|Cold|Poison )?Damage of ([\d–\-]+)$', l)
    if m: add(stats, 'thorns', num(m.group(1))); return

    # === Faster Cast Rate ===
    m = re.match(r'^\+?([\d–\-]+)% Faster Cast Rate$', l)
    if m: add(stats, 'castSpeed', num(m.group(1))); return

    # === Chance of Crushing Blow → crit ===
    m = re.match(r'^\+?([\d–\-]+)% Chance of Crushing Blow$', l)
    if m: add(stats, 'critChance', num(m.group(1))); return
    # === Deadly Strike → crit ===
    m = re.match(r'^\+?([\d–\-]+)% Deadly Strike$', l)
    if m: add(stats, 'critChance', num(m.group(1))); return

    # === Chance of Open Wounds → poison ===
    m = re.match(r'^\+?([\d–\-]+)% Chance of Open Wounds$', l)
    if m: add(stats, 'poisonDmg', num(m.group(1))); return

    # === Knockback / Prevent Monster Heal ===
    if l == 'Knockback': add(stats, 'knockback', 1); return
    if l == 'Prevent Monster Heal': add(stats, 'preventHeal', 1); return

    # === +X to <Class> Skill Levels → allSkills ===
    m = re.match(r'^\+?([\d–\-]+) to .* Skill Levels$', l)
    if m: add(stats, 'allSkills', num(m.group(1))); return
    # +X to <Skill Tree> Skills → allSkills
    m = re.match(r'^\+?([\d–\-]+) to .* Skills$', l)
    if m: add(stats, 'allSkills', num(m.group(1))); return

    # === Increase Maximum Mana/Life X% ===
    m = re.match(r'^Increase Maximum Mana ([\d–\-]+)%$', l)
    if m: add(stats, 'bonusMana', num(m.group(1))); return
    m = re.match(r'^Increase Maximum Life ([\d–\-]+)%$', l)
    if m: add(stats, 'bonusHp', num(m.group(1))); return

    # === +X to Fire Skills → skillDmg ===
    m = re.match(r'^\+?([\d–\-]+) to Fire Skills$', l)
    if m: add(stats, 'skillDmg', num(m.group(1))); return

    # === poison damage over X seconds ===
    m = re.match(r'^\+?([\d–\-]+) poison damage over ([\d–\-]+) seconds$', l)
    if m:
        add(stats, 'poisonDmg', num(m.group(1)))
        add(stats, 'poisonDur', num(m.group(2)))
        return

    # === +X to all Attributes (Based on Character Level) ===
    m = re.match(r'^\+?([\d–\-]+) to all Attributes \(Based on Character Level\)$', l)
    if m:
        v = num(m.group(1))
        for k in ('str','vit','dex','int'): add(stats, k, v)
        return

    # === +X to Strength/Vit/Dex (Based on Character Level) ===
    m = re.match(r'^\+?([\d–\-]+) to (Strength|Vitality|Dexterity|Energy) \(Based on Character Level\)$', l)
    if m:
        v = num(m.group(1)); k = {'Strength':'str','Vitality':'vit','Dexterity':'dex','Energy':'int'}[m.group(2)]
        add(stats, k, v); return

    # === +X to Maximum <Resist> — skip (max resist) ===
    # === +X <Element> Absorb — skip ===
    # === Faster Hit Recovery / Run-Walk / Block Rate — skip ===
    # === Increased Chance of Blocking — skip ===
    # === Chance to cast ... — skip ===
    # === Level X ... (charges) — skip ===
    # === Requirements -X% — skip ===
    # === Socketed (X) — skip ===
    # === Repairs durability — skip ===
    # === Ethereal / Indestructible — skip ===
    # === Cannot Be Frozen / Half Freeze Duration — skip ===
    # === +X to Light Radius — skip ===
    # === Slows Target / Freezes target / Hit Blinds / Hit Causes Flee — skip ===
    # === Damage to Undead/Demons — skip ===
    # === Attack Rating against Undead/Demons — skip ===
    # === +X to <Skill> (Class Only) — skip ===
    # === One of the following — skip ===
    # === Ignore Target's Defense / -X% Target Defense — skip ===
    # === -X to Monster Defense Per Hit — skip ===
    # === Slain Monsters Rest in Peace — skip ===
    # === Drain Life -X — skip ===
    # === Reanimate / Replenishes / Increased Stack Size — skip ===
    # === +X to <Skill Tree> (Class Only) — skip ===
    # === +X to <Element> Skill Damage — skip ===
    # === +X to Enemy <Resist> Resistance — skip ===
    # === +X to Town Portal — skip ===
    # === +X to Demon/Eldritch/Chaos Skills — skip ===
    # === +X to Warcries/Masteries/Combat Skills — skip ===
    # === +X to Martial Arts/Shadow Disciplines — skip ===
    # === +X to Defensive/Offensive Auras — skip ===
    # === +X to Elemental/Shape Shifting Skills — skip ===
    # === +X to <Class> Skill Levels — handled above ===

    # Neznámý stat — necháme projít (debug)
    # print("  [SKIP]", l)

def main():
    out = []
    for m in matched:
        stats = {}
        for line in m['stats']:
            convert_stat(line, stats)
        out.append({
            'gameid': m['gameid'],
            'name': m['name'],
            'base': m['base'],
            'level': m['level'],
            'stats': stats,
        })
    json.dump(out, open(BASE + "/tables/d2-uniques-converted.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("Konvertováno:", len(out), "itemů")
    # Statistika: kolik itemů má prázdné staty (vše skipnuto)
    empty = [o for o in out if not o['stats']]
    print("Itemů s prázdnými staty:", len(empty))
    for o in empty:
        print("  ", o['gameid'], o['name'])

if __name__ == '__main__':
    main()
