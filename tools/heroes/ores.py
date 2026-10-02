"""Mining art: icons (20×20) and ground sprites for stone, iron ore and gold nuggets, and the pickaxe icon."""
import sys
from tool import G, render, sheet

STONE_PAL = {'L': '#e2e6ec', 'M': '#b2b9c4', 'D': '#868d9a', 'K': '#5c626e'}
ORE_PAL = {**STONE_PAL, 'o': '#f08a52', 'O': '#b84a2a', 'h': '#ffc49a'}
GOLD_PAL = {'Y': '#fff2a8', 'G': '#f4c64e', 'g': '#c8902c', 'b': '#8a5a1a'}
PICK_PAL = {'N': '#f4f8fc', 'O': '#c4cedc', 'U': '#8c98b0', 'V': '#5c6684', 'W': '#c08a58', 'w': '#8a5a30', 'x': '#5a3818'}

CHUNK = [(7, 4, 'LLLM'), (5, 5, 'LLLLMMM'), (4, 6, 'LLLMMMMMD'), (3, 7, 'LLMMMMMMDD'), (3, 8, 'LMMMMKMMDDD'), (2, 9, 'LLMMMMKDDDDK'),
         (2, 10, 'LMMMMMMKDDKK'), (2, 11, 'MMMMMMDDDKK'), (3, 12, 'MMMDDDDKKK'), (4, 13, 'DDDDKKKK')]
PEBBLE = [(13, 11, 'LLM'), (12, 12, 'LMMDD'), (12, 13, 'MMDDK'), (13, 14, 'DKK')]


def stone():
    g = G(20, 20)
    for x, y, s in CHUNK + PEBBLE: g.at(x, y, s)
    return g


def iron_ore():
    g = stone()
    for x, y, s in [(6, 6, 'oh'), (5, 7, 'oO'), (9, 8, 'o'), (8, 9, 'oO'), (4, 10, 'o'), (6, 11, 'Oo'), (10, 11, 'o'), (13, 12, 'o')]:
        g.at(x, y, s)
    return g


def gold_nugget():
    g = G(20, 20)
    for x, y, s in [(8, 5, 'YYG'), (6, 6, 'YYYGGg'), (5, 7, 'YYGGGGgg'), (4, 8, 'YGGGGYGgg'), (4, 9, 'GGGGGGGggb'), (5, 10, 'GGGGGggbb'),
                    (4, 11, 'YGGGGggbb'), (5, 12, 'GGgggbb'), (7, 13, 'gbbb'), (12, 12, 'YG'), (11, 13, 'YGgb'), (12, 14, 'gb')]:
        g.at(x, y, s)
    return g


def pickaxe():
    """A crescent steel head around the top of a diagonal haft; both points curve back toward the grip."""
    import math
    g = G(20, 20)
    for i in range(13):  # haft, lit on its upper edge
        g.at(2 + i, 18 - i, 'W'); g.at(3 + i, 18 - i, 'w')
    g.at(1, 19, 'xx')
    cx, cy, r = 7.5, 12.5, 10.2
    for y in range(20):
        for x in range(20):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            a = math.degrees(math.atan2(y + 0.5 - cy, x + 0.5 - cx))
            if not -104 <= a <= 14:
                continue
            mid = abs(a + 45) / 59           # 0 at the haft, 1 at the points
            half = 1.25 - 0.75 * mid          # thick in the middle, tapering to the points
            if abs(d - r) <= half:
                ch = 'N' if d > r + 0.2 and a < -45 else 'O' if a < -30 else 'U' if a < 0 else 'V'
                g.at(x, y, ch)
    return g


# small ground sprites (the HD world scale, like the meat and log)
STONE_DROP = ['..LLM', '.LMMDD', 'LMMMDDK', '.MDDDK']
ORE_DROP = ['..LoM', '.LMOoD', 'LoMMDoK', '.MDDDK']
GOLD_DROP = ['.YG', 'YGGg', 'GGgb', '.gb']

ICONS = {'stone': (stone(), STONE_PAL), 'iron_ore': (iron_ore(), ORE_PAL), 'gold_nugget': (gold_nugget(), GOLD_PAL)}
DROPS = {'stone': (STONE_DROP, STONE_PAL), 'iron_ore': (ORE_DROP, ORE_PAL), 'gold_nugget': (GOLD_DROP, GOLD_PAL)}

if __name__ == '__main__':
    ims = [render(g.rows(), p, k=0.3) for g, p in ICONS.values()] + [render(pickaxe().rows(), PICK_PAL, k=0.3)]
    ims += [render(r, p, k=0.22) for r, p in DROPS.values()]
    sheet(ims, scale=8).save(sys.argv[1] if len(sys.argv) > 1 else 'ores.png')
    print('ok')
