import re
with open('dist/game.js') as f:
    src = f.read()
depth = 0
in_tpl = False
in_dq = False
in_sq = False
for i, line in enumerate(src.split('\n')):
    j = 0
    while j < len(line):
        ch = line[j]
        if ch == '`' and not in_dq and not in_sq:
            in_tpl = not in_tpl; j += 1; continue
        if ch == '"' and not in_tpl and not in_sq:
            in_dq = not in_dq; j += 1; continue
        if ch == "'" and not in_tpl and not in_dq:
            in_sq = not in_sq; j += 1; continue
        if not in_tpl and not in_dq and not in_sq:
            if ch in '{([': depth += 1
            elif ch in '}])': depth -= 1
        j += 1
    if depth < 0:
        print(f'NEGATIVE at line {i+1}')
        break
print(f'Final depth: {depth}')
print('OK' if depth == 0 else 'FAIL')