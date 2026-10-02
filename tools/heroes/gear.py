"""Equipment icons (20×20) painted with small helpers, plus a loot-sack ground sprite."""
from tool import G, render, sheet
import math

def grid(): return G(20, 20)

def diag_blade(g, x0, y0, n, light='B', mid='b', dark='c'):
    """A blade rising from (x0,y0) to the upper right: lit top edge, core, shaded lower edge."""
    for i in range(n):
        x, y = x0 + i, y0 - i
        g.at(x, y - 1, light)
        g.at(x, y, mid)
        g.at(x + 1, y, dark)
    g.at(x0 + n, y0 - n, light)

def sword(steel, guard, grip):
    g = grid()
    diag_blade(g, 7, 12, 11)
    for k in range(-2, 3): g.at(6 + k, 13 + k, 'G' if k < 0 else 'g')
    g.at(5, 14, 'W'); g.at(4, 15, 'W'); g.at(3, 16, 'w'); g.at(4, 14, 'W')
    g.at(1, 17, 'GG'); g.at(1, 18, 'gg')
    return g

def axe():
    g = grid()
    # handle from lower left to upper right
    for i in range(15):
        g.at(2 + i, 17 - i, 'W'); g.at(3 + i, 17 - i, 'w')
    # axe head: a crescent of steel on the right of the handle near the top
    for y, (x, s) in enumerate([(10, 'Bb'), (10, 'BBbc'), (9, 'BBBbbc'), (9, 'BBbbbcc'), (10, 'Bbbcc'), (11, 'bbc'), (12, 'c')], start=1):
        g.at(x + 3, y, s)
    g.at(13, 2, 'D'); g.at(12, 3, 'D'); g.at(11, 4, 'D')
    return g

def round_shield():
    g = grid()
    for y in range(20):
        for x in range(20):
            d = math.hypot(x + 0.5 - 10, y + 0.5 - 10)
            if d <= 8.6:
                if d > 7.2: g.at(x, y, 'R' if x + y < 18 else 'r')        # metal rim
                else: g.at(x, y, 'P' if (x // 3) % 2 == 0 else 'p')        # planks
    g.at(9, 9, 'GG'); g.at(9, 10, 'Gg')                                     # boss
    for y in (6, 13): g.at(6, y, 'r'); g.at(13, y, 'r')                     # rivets
    return g

def kite_shield():
    g = grid()
    for y in range(1, 19):
        half = 8 if y < 9 else max(0, 8 - (y - 8) * 0.85)
        for x in range(20):
            dx = abs(x + 0.5 - 10)
            if dx <= half:
                edge = dx > half - 1.2 or y == 1
                g.at(x, y, ('S' if x < 10 else 's') if edge else ('A' if x < 10 else 'a'))
    for y in range(3, 15): g.at(9, y, 'GG')   # gold cross
    g.at(5, 6, 'GGGGGGGGGG')
    return g

def cap():
    g = grid()
    for y, (x, s) in enumerate([(7, 'LLLLLM'), (5, 'LLLLLLMMMM'), (4, 'LLLLLLLMMMMM'), (3, 'LLLLLLLLMMMMMD'), (3, 'LLLLLLLMMMMMMD'),
                                (3, 'LLLLLLMMMMMMMD'), (2, 'dddddddddddddddd'), (2, 'DDDDDDDDDDDDDDDD')], start=5):
        g.at(x, y, s)
    g.at(9, 7, 'A'); g.at(9, 8, 'A')   # stitch
    return g

def helm():
    """A pointed iron helm with a riveted brow band, cheek guards and a nasal: the helm the heroes wear."""
    g = grid()
    rows = [(9, 'N'), (8, 'NNO'), (7, 'NNOOU'), (6, 'NNOOOUV'), (5, 'NNOOOOUUV'), (4, 'NNOOOOOUUVV'), (4, 'NOOOOOOOUVV'),
            (3, 'VVYVVVYVVVYVX')]
    for y, (x, r) in enumerate(rows, start=1): g.at(x, y, r)
    for y, (l, n, r) in enumerate([('NOO', 'OU', 'UUV'), ('NOO', 'OU', 'UUV'), ('NOO', 'OU', 'UVV'), ('OOU', 'UV', 'UVV'), ('OU', '', 'VV'), ('U', '', 'V')], start=9):
        g.at(3 if len(l) == 3 else 4, y, l)
        if n: g.at(9, y, n)
        g.at(13 if len(r) == 3 else 14, y, r)
    return g

def tunic(edge, body, shade, trim):
    g = grid()
    rows = [(5, 'EE....EE'), (3, 'EEBBBBBBBBSS'), (1, 'EBBBBBBBBBBBBSSS'), (1, 'EBBBBBBBBBBBBSSS'), (1, 'EBB.BBBBBBBB.SSS'),
            (4, 'BBBBBBBBSS'), (4, 'BBBBBBBBSS'), (4, 'TTTTTTTTTT'), (4, 'BBBBBBBBSS'), (4, 'BBBBBBBBSS'), (4, 'BBBBBBBBSS'), (4, 'EEEEEEEEEE')]
    for y, (x, s) in enumerate(rows, start=3):
        g.at(x, y, s.replace('E', edge).replace('B', body).replace('S', shade).replace('T', trim))
    g.at(9, 5, 'k'); g.at(10, 5, 'k')   # neck opening
    return g

def chainmail():
    g = tunic('s', 'S', 's', 'G')
    for y in range(4, 15):
        for x in range(20):
            if g.g[y][x] == 'S' and (x + y) % 2 == 0: g.g[y][x] = 'a'
    return g

def trousers(body, shade, trim):
    g = grid()
    rows = [(5, 'TTTTTTTTTT'), (5, 'BBBBBBBBSS'), (5, 'BBBBBBBBSS'), (5, 'BBBB..BBSS'), (5, 'BBBB..BBSS'), (5, 'BBB....BSS'),
            (5, 'BBB....BSS'), (5, 'BBB....BSS'), (5, 'BBB....BSS'), (5, 'BBS....BSS'), (4, 'DDDD....DDDD')]
    for y, (x, s) in enumerate(rows, start=4):
        g.at(x, y, s.replace('B', body).replace('S', shade).replace('T', trim))
    return g

def cloth_trousers():
    """The starting trousers: plain homespun with a rope belt and a patched knee."""
    g = trousers('L', 'M', 'r')
    g.at(6, 9, 'pp'); g.at(6, 10, 'pp')
    return g

def boot(body, shade, sole, extra=None):
    g = grid()
    rows = [(6, 'TTTTTT'), (6, 'BBBBBS'), (6, 'BBBBBS'), (6, 'BBBBBS'), (6, 'BBBBBS'), (6, 'BBBBBBSS'), (6, 'BBBBBBBBSS'),
            (5, 'BBBBBBBBBBBS'), (5, 'BBBBBBBBBBBS'), (5, 'OOOOOOOOOOOOO')]
    for y, (x, s) in enumerate(rows, start=6):
        g.at(x, y, s.replace('B', body).replace('S', shade).replace('O', sole).replace('T', 'G' if extra else shade))
    if extra:   # a little white wing
        g.at(1, 6, 'WW'); g.at(2, 7, 'WWW'); g.at(3, 8, 'WWw'); g.at(4, 9, 'Ww')
    return g

def amulet():
    g = grid()
    for i in range(14):
        a = math.pi * (0.05 + 0.9 * i / 13)
        g.at(round(10 + 7 * math.cos(a)), round(2 + 8 * math.sin(a) * 0.9), 'G' if i % 2 else 'g')
    for y, (x, s) in enumerate([(8, 'gGGg'), (7, 'GRRRRg'), (7, 'RrRRRr'), (7, 'RRRRrr'), (8, 'Rrrr'), (9, 'rr')], start=10):
        g.at(x, y, s)
    g.at(8, 12, 'W')
    return g

def sack():
    g = G(12, 11)
    for y, (x, s) in enumerate([(4, 'dLd'), (3, 'dGGd'), (4, 'LM'), (2, 'LLLMMM'), (1, 'LLLLMMMD'), (0, 'LLLLLMMMDD'), (0, 'LLLLMMMMDD'),
                                (0, 'LLLMMMMDDD'), (1, 'LMMMMDDD'), (2, 'DDDDDD')]):
        g.at(x, y, s)
    return g

STEEL = {'B': '#ffffff', 'b': '#dce4ee', 'c': '#a6b2c4', 'D': '#6e7a90'}
RUST = {'B': '#e8c8a8', 'b': '#c08860', 'c': '#8a5a38', 'D': '#5a3a20'}
GOLD = {'G': '#fff0a0', 'g': '#d8a03a'}
WOOD = {'W': '#c08a58', 'w': '#8a5a30'}
LEATHER = {'L': '#c89060', 'M': '#9a6a40', 'D': '#6a4426', 'd': '#4a2c18', 'A': '#e8c090', 'k': '#2a1a10'}
IRON = {'S': '#e8eef6', 's': '#9aa6b8', 't': '#5c6684', 'v': '#262c40', 'A': '#c8d2e0', 'a': '#8e9ab4', 'R': '#f06858', 'r': '#b83228', 'k': '#2a2c38'}

GEAR = {
    'rusty_sword': (sword(RUST, 'g', 'W'), {**RUST, **GOLD, **WOOD}),
    'iron_sword': (sword(STEEL, 'g', 'W'), {**STEEL, **GOLD, **WOOD}),
    'woodcutter_axe': (axe(), {**STEEL, **WOOD}),
    'wooden_shield': (round_shield(), {'P': '#c8925a', 'p': '#a87444', 'R': '#a6b2c4', 'r': '#6e7a90', **GOLD}),
    'iron_shield': (kite_shield(), {**IRON, **GOLD, 'A': '#4a78c8', 'a': '#2e5aa8'}),
    'leather_cap': (cap(), LEATHER),
    'iron_helm': (helm(), {'N': '#f0f4fa', 'O': '#c4cedc', 'U': '#8c98b0', 'V': '#5c6684', 'X': '#3a4058', 'Y': '#ffe07a'}),
    'leather_tunic': (tunic('D', 'L', 'M', 'd'), LEATHER),
    'chainmail': (chainmail(), {**IRON, **GOLD}),
    'cloth_trousers': (cloth_trousers(), {'L': '#c4b8a2', 'M': '#9a8e78', 'D': '#6e6452', 'r': '#d8c08a', 'p': '#8a7a5c'}),
    'leather_trousers': (trousers('L', 'M', 'd'), LEATHER),
    'iron_greaves': (trousers('S', 's', 't'), {**IRON, 'D': '#5c6684'}),
    'leather_boots': (boot('L', 'M', 'd'), LEATHER),
    'swift_boots': (boot('A', 'a', 'k', extra=True), {'A': '#6aa8e8', 'a': '#3a72c0', 'k': '#2a2c38', 'W': '#ffffff', 'w': '#c8d8e8', **GOLD}),
    'vigour_amulet': (amulet(), {**GOLD, 'R': '#f05a5a', 'r': '#a82828', 'W': '#ffffff'}),
}
SACK = (sack(), {'L': '#c89a68', 'M': '#a07848', 'D': '#6a4a2a', 'd': '#4a3018', 'G': '#d8a03a'})

if __name__ == '__main__':
    imgs = [render(g.rows(), pal, k=0.3) for g, pal in GEAR.values()] + [render(SACK[0].rows(), SACK[1])]
    sheet(imgs, scale=5).save('gear.png')
    print('ok')
