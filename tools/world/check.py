"""Check a region file: every spot, person, creature, object and exit tile stands on ground
you can walk on, outside buildings. python3 check.py greenmarch millbrook belltower weepwood ..."""
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from maps import PROP_SIZE

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../..')
SOLID = set('~T#X&YyK')
SOLID_MASK = {'chapel': ['####', '####', '####', '####', '####', '#..#'], 'hollow_oak': ['...', '.#.', '...'], 'willow': ['...', '.#.', '...'],
              # Act II (as in src/data/props.ts)
              'webbed_willow': ['...', '.#.', '...'], 'gallows_willow': ['...', '.#.', '...'], 'thorn_tunnel': ['#..', '#..'],
              'lisle_barrow': ['####', '####', '####', '#.##'], 'bridge_arch': ['.....'], 'great_willow': ['....', '.##.', '.##.', '....']}

for name in sys.argv[1:]:
    src = open(os.path.join(ROOT, 'src/data/regions', name + '.ts')).read()
    rows = re.findall(r"^    '(.*)',$", src.split('layout: [')[1].split('],')[0], re.M)
    W, H = len(rows[0]), len(rows)
    assert all(len(r) == W for r in rows), 'ragged layout'
    covered = set()
    for kind, c, r in re.findall(r"\{ kind: '(\w+)', at: \[(\d+), (\d+)\] \}", src.split('props: [')[1].split('],')[0] if 'props: [' in src else ''):
        c, r = int(c), int(r)
        w, h = PROP_SIZE[kind]
        mask = SOLID_MASK.get(kind)
        for dr in range(h):
            for dc in range(w):
                if not mask or mask[dr][dc] == '#':
                    covered.add((c + dc, r + dr))
    bad = 0
    def tile(c, r):
        return rows[r][c] if 0 <= r < H and 0 <= c < W else '?'
    body = src.split('props: [')[0]
    for c, r in re.findall(r"at: \[(\d+), (\d+)\]", body) + re.findall(r"^\s+\[(\d+), (\d+)\],?$", body, re.M) + re.findall(r"\w+: \[(\d+), (\d+)\]", body.split('spots:')[1].split('\n')[0]):
        c, r = int(c), int(r)
        t = tile(c, r)
        if t in SOLID or t == 'o' or (c, r) in covered:
            print(f'{name}: ({c},{r}) is on {t!r}{" under a building" if (c, r) in covered else ""}')
            bad += 1
    print(f'{name}: {W}x{H}, {bad} problems')
