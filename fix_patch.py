#!/usr/bin/env python3
import re

with open('dist/game.js', 'r') as f:
    src = f.read()

# 1. Zatím jen zkontrolujeme, co bylo aplikováno
print("cost:15 found:", 'cost:15' in src)
print("monsterGold found:", 'monsterGold' in src)

# 2. Boss HP fix - zkontrolujeme bossBaseHp
m = re.search(r'const bossBaseHp = isBoss.*?;', src)
if m:
    print("bossBaseHp:", m.group()[:80])

m2 = re.search(r'maxBossHp:.*?bossBaseHp.*?,', src)
if m2:
    print("maxBossHp line:", m2.group())

# 3. Postup/monsters
m3 = re.search(r"Postup:.*?monsters", src)
if m3:
    print("Postup line:", m3.group())
