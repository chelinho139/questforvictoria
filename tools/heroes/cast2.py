"""All eight HD heroes built from tagged parts, with equipment for every slot.

Every pixel records which part drew it (head, torso, belt, arm, legs, boot, cape, ...),
so gear can replace a part (helmets), recolour it (armour, trousers, boots) or add to it
(weapons, shields, amulets). The game composes the bare hero with one layer per item."""
from tool import G

MX, MY = 16, 10


class TG(G):
    """A grid that also remembers which part wrote each pixel."""
    def __init__(self, w, h):
        super().__init__(w, h)
        self.t = [[None] * w for _ in range(h)]
        self.tag = None
        self.edge = set()  # the lit left edge of the body, which armour keeps

    def at(self, x, y, s):
        for i, ch in enumerate(s):
            if ch in ' .':
                continue
            if 0 <= x + i < self.w and 0 <= y < self.h:
                self.g[y][x + i] = ch
                self.t[y][x + i] = self.tag
        return self


class V:
    def __init__(self, g, dx=0, dy=0):
        self.g, self.dx, self.dy = g, dx, dy

    def at(self, x, y, s):
        self.g.at(x + self.dx, y + self.dy, s)
        return self

    def tag(self, t):
        self.g.tag = t
        return self


def dome(spans, brim, kind):
    """A cap or helm: rows (y, x0, x1) from the top, shaded light-left and dark-right, then the brim
    (leather) or a rivet band (iron) at brim = (y, x0, x1). Iron helms get a little spike on top."""
    L, M, D, E = ('A', 'F', 'I', 'J') if kind == 'leather' else ('N', 'O', 'U', 'V')
    out = []
    for i, (y, x0, x1) in enumerate(spans):
        n = x1 - x0 + 1
        if i == 0:
            row = [L] * (n - 1) + [M]
        else:
            row = [M] * n
            row[0] = L
            if n >= 6: row[1] = L
            row[-1] = D if kind == 'leather' else E
            if n >= 7: row[-2] = D
        out.append((x0, y, ''.join(row)))
    y, x0, x1 = brim
    n = x1 - x0 + 1
    if kind == 'leather':
        out.append((x0, y, 'I' + 'J' * (n - 1)))
    else:
        out.append((x0, y, ''.join('Y' if i % 4 == 2 else 'V' for i in range(n - 1)) + 'X'))
        ty, tx0, tx1 = spans[0]
        c = (tx0 + tx1) // 2
        out = [(c, ty - 1, 'N')] + out
    return out


def rows_at(v, oy, rows):
    for x, y, s in rows:
        v.at(x, oy + y, s)


# ------------------------------------------------------------ palettes
STEEL = {'1': '#f4f8fc', '2': '#c8d2e0', '3': '#8e9ab4', '4': '#5c6684', '5': '#363c54'}
RED = {'R': '#f0685a', 'r': '#c8392f', 'q': '#8a2020', 'Q': '#5a1414'}
GOLD = {'G': '#ffe07a', 'g': '#d8a03a'}
LEATHER = {'L': '#b07844', 'l': '#85532b', 'd': '#5a3418'}
BLADE = {'B': '#f8fbff', 'b': '#b8c4d4'}
SKIN = {'S': '#ffd8b4', 's': '#f2b88c', 'k': '#d08c64', 'E': '#2a2a3a', 'W': '#ffffff', 'p': '#f4a090'}

# Gear letters never appear in a hero palette, so a gear layer can always be told apart.
GEAR_PAL = {
    # the archer's: bow woods (worn, hunting ash, yew), grips and tips, the string, arrows, quivers
    'i': '#b8a07c', 'o': '#7a6248', 't': '#3a2c1e', 'T': '#e0d0a8',
    'α': '#e0b070', 'β': '#9a6434', 'γ': '#8a4630', 'δ': '#f2ead6',
    'ε': '#f0c888', 'ζ': '#9a4a1e', 'η': '#4e8a5a', 'θ': '#ffe07a',
    '8': '#ece4d0', '9': '#a8784a', '`': '#f4f0e6', 'ξ': '#d85a48', 'π': '#9aa4b4',
    'κ': '#c89060', 'λ': '#8a5a34', '}': '#e0b078', 'μ': '#7a4a2c', 'ν': '#4e2e18',
    # leather (cap, tunic, trousers, boots) and a dark belt strap
    'A': '#e0aa74', 'F': '#b67c48', 'I': '#885630', 'J': '#5c381c', '_': '#3e2412',
    # iron (helm, chainmail, greaves, shield rims, blades)
    'N': '#f0f4fa', 'O': '#c4cedc', 'U': '#8c98b0', 'V': '#5c6684', 'X': '#3a4058',
    'Y': '#ffe07a', 'Z': '#d8a03a',                       # gold
    'a': '#dca07a', 'e': '#a8683e', 'f': '#6c4226',        # rust
    'u': '#c48c58', '0': '#8a5a32',                        # wood
    '!': '#5a8ad8', '#': '#3a62b0',                        # kite shield field
    '6': '#d09a5e', '7': '#a87444',                        # shield planks
    '$': '#ff5a6a', '%': '#a01e2e',                        # amulet stone
    '(': '#7ab8f2', ')': '#4a84d0', '*': '#2a4a88', '+': '#ffffff', '=': '#c8d8ea',  # swift boots and wing
    # homespun cloth trousers (light, mid, dark)
    '&': '#c4b8a2', '~': '#9a8e78', '@': '#6e6452',
    # bare bodies: skin (light to dark) and linen shorts
    '^': '#ffe6cc', '[': '#e8dcc4', ']': '#bcae92', '{': '#8a7c64',
    # faces for the knights under a cap or open helm: skin, shade, dark, eye, eye white, hair
    '/': '#ffd8b4', ':': '#f2b88c', ',': '#d08c64', ';': '#2a2a3a', '?': '#ffffff', '<': '#f0c870', '>': '#c8984a',
}

# ------------------------------------------------------------ items
ITEMS_BY_SLOT = {
    'weapon': ['rusty_sword', 'iron_sword', 'woodcutter_axe', 'pickaxe', 'worn_shortbow', 'hunting_bow', 'yew_longbow'],
    'offhand': ['wooden_shield', 'iron_shield', 'leather_quiver', 'hunters_quiver'],
    'head': ['leather_cap', 'iron_helm'],
    'body': ['leather_tunic', 'chainmail'],
    'legs': ['cloth_trousers', 'leather_trousers', 'iron_greaves'],
    'feet': ['leather_boots', 'swift_boots'],
    'trinket': ['vigour_amulet'],
}
SLOT_OF = {it: s for s, its in ITEMS_BY_SLOT.items() for it in its}
ALL_ITEMS = [it for its in ITEMS_BY_SLOT.values() for it in its]
# the order the game stacks layers in (later layers cover earlier ones)
APPLY_ORDER = ['legs', 'feet', 'body', 'head', 'trinket', 'offhand', 'weapon']

BODY_MAT = {
    'leather_tunic': dict(tones='AFIJ', strap='_', buckle='Y', mail=False),
    'chainmail': dict(tones='NOUV', strap='I', buckle='Y', mail=True),
}
LEGS_MAT = {
    'cloth_trousers': dict(cols=('~', '&'), knee=None, tones='&&~@', plates=False),
    'leather_trousers': dict(cols=('I', 'F'), knee=None, tones='AFIJ', plates=False),
    'iron_greaves': dict(cols=('V', 'O'), knee=('U', 'N'), dark=('X', 'U'), tones='NOUV', plates=True),
}
FEET_MAT = {
    'leather_boots': dict(boot=('F', 'J'), cuff='A', wing=False),
    'swift_boots': dict(boot=('(', '*'), cuff=')', wing=True),
}

ROUND_SHIELD = ['..OOU..', '.O767V.', 'O67676V', 'O67Y76V', 'U67676V', '.V767X.', '..VXX..']
KITE_SHIELD = ['NOOOOUV', 'O!!Y##V', 'O!!Y##V', 'OYYYYYV', 'O!!Y##V', '.O!Y#V.', '.O!Y#V.', '..OYV..', '...V...']
SHIELDS = {'wooden_shield': ROUND_SHIELD, 'iron_shield': KITE_SHIELD}

# ------------------------------------------------------------ poses
WALK = [
    dict(back=-3, front=3, bob=0, arm=1, cape=0),
    dict(back=-2, front=2, bob=1, arm=1, cape=1),
    dict(back=0, front=0, lift='back', bob=0, arm=0, cape=2),
    dict(back=3, front=-3, bob=0, arm=-1, cape=0),
    dict(back=2, front=-2, bob=1, arm=-1, cape=1),
    dict(back=0, front=0, lift='front', bob=0, arm=0, cape=2),
]
IDLE = [dict(bob=0, cape=0), dict(bob=0, cape=1), dict(bob=1, cape=1), dict(bob=1, cape=0)]
ATTACK = [
    dict(hand=(-2, -3), weapon='back', bob=0, legs='stand'),
    dict(hand=(0, -5), weapon='up', bob=0, legs='stand'),
    dict(hand=(2, -1), weapon='forward', bob=1, legs=dict(back=-2, front=3)),
    dict(hand=(1, 1), weapon='low', bob=1, legs=dict(back=-2, front=3)),
]
JUMP = [dict(legs='air', feet=-1), dict(legs='tuck'), dict(legs='air', feet=1)]
# the archer's shot: bow up and an arrow nocked, the string drawn to the cheek, the loose, the
# bow lowered; the feet stay planted (archers stand still to shoot)
SHOOT = [
    dict(hand=(2, -3), weapon='nock'),
    dict(hand=(3, -3), weapon='draw'),
    dict(hand=(3, -3), weapon='loose'),
    dict(hand=(2, -1), weapon='lower'),
]


def line(v, x0, y0, x1, y1, ch):
    n = max(abs(x1 - x0), abs(y1 - y0))
    for i in range(1, n):
        v.at(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), ch)


def legs(v, x0, y0, n, mode, w=2, gap=1, cols=('4', '3'), boot=('5', 'd'), knee=None, dark=None, cuff=None, wing=False):
    """Two legs from the hip at (x0, y0), n rows long. mode: a walk pose dict, 'stand', 'air' or 'tuck'."""
    if mode == 'tuck':
        for col, bx in ((cols[0], x0), (cols[1], x0 + 2)):
            v.tag('legs')
            v.at(bx, y0, col * (w + 3))
            v.at(bx, y0 + 1, col * (w + 3))
            v.tag('boot' if cuff else 'legs')
            v.at(bx + w + 1, y0 + 2, (cuff or col) * w)
            v.tag('boot')
            v.at(bx + w + 1, y0 + 3, boot[0] * (w + 1))
        return
    if mode == 'stand':
        mode = dict(back=0, front=0)
    if mode == 'air':
        mode = dict(back=-1, front=0)
    feet = mode.get('feet', 0)
    for which, col, dx in (('back', cols[0], mode['back'] + feet), ('front', cols[1], mode['front'] + feet)):
        lift = 1 if mode.get('lift') == which else 0
        base = x0 + (0 if which == 'back' else w + gap)
        rows = n - lift
        for i in range(rows):
            x = base + round(dx * (i + 1) / n)
            if cuff and i == rows - 1:
                v.tag('boot')
                v.at(x, y0 + i, cuff * w)
                continue
            v.tag('legs')
            side = 0 if which == 'back' else 1
            c = knee[side] if knee and i == rows // 2 else dark[side] if dark and i % 3 == 2 else col
            v.at(x, y0 + i, c * w)
        fx = base + dx - (1 if dx < 0 else 0)
        v.tag('boot')
        top = y0 + n - lift
        v.at(fx, top, boot[0] * (w + 1))
        v.at(fx, top + 1, boot[1] * (w + 2))
        if wing:  # a little white wing at the heel
            v.at(fx - 1, top, '+')
            v.at(fx - 2, top - 1, '+=')


# ------------------------------------------------------------ weapons
def sword(v, bx, hy, mode, L, guard='gGGg', grip='d', pommel=None, blade='Bb'):
    """A sword whose 2-wide blade column is bx when upright; the hand sits left of (bx, hy)."""
    bl = (lambda i: blade[i % len(blade)]) if isinstance(blade, list) else (lambda i: blade)
    if mode == 'up':
        for i, y in enumerate(range(hy - 1 - L, hy - 1)): v.at(bx, y, bl(i))
        v.at(bx - 1, hy - 1, guard)
        v.at(bx, hy + 1, grip)
        if pommel: v.at(bx, hy + 2, pommel)
    elif mode == 'down':
        v.at(bx - 1, hy + 1, guard)
        for i, y in enumerate(range(hy + 2, hy + 2 + L)): v.at(bx, y, bl(i))
        if pommel: v.at(bx, hy - 1, pommel)
    elif mode == 'back':
        for i in range(L - 1): v.at(bx - 1 - i, hy - 2 - i, bl(i))
        v.at(bx - 1, hy - 1, guard[1:3])
        v.at(bx, hy + 1, grip)
    elif mode == 'forward':
        for y, ch in zip(range(hy - 2, hy + 2), guard): v.at(bx + 1, y, ch)
        for i, x in enumerate(range(bx + 2, bx + 2 + L)):
            v.at(x, hy - 1, bl(i)[0])
            v.at(x, hy, bl(i)[1])
        v.at(bx - 2, hy, grip)
    elif mode == 'low':
        for i in range(L - 2): v.at(bx + 1 + i, hy + 1 + i, bl(i))
        v.at(bx, hy, guard[1:3])


def staff(v, bx, hy, mode, shaft='w', knob='KK'):
    if mode == 'up':
        for y in range(hy - 5, hy + 16): v.at(bx, y, shaft)
        v.at(bx, hy - 7, knob[0]); v.at(bx, hy - 6, knob[1])
    elif mode == 'back':
        for i in range(-3, 10): v.at(bx - i, hy - i, shaft)
        v.at(bx - 11, hy - 11, knob[0]); v.at(bx - 10, hy - 10, knob[1])
    elif mode == 'forward':
        for x in range(bx - 8, bx + 10): v.at(x, hy, shaft)
        v.at(bx + 10, hy, knob)
    elif mode == 'low':
        for i in range(-6, 9): v.at(bx + i, hy + i // 2, shaft)
        v.at(bx + 9, hy + 4, knob)


def axe(v, bx, hy, mode, L):
    """A woodcutter's axe: wooden haft through column bx when upright, steel head at the top, edge forward."""
    if mode in ('up', 'down'):
        top = hy - L
        for y in range(top, hy + 3): v.at(bx, y, 'u' if y < hy else '0')
        v.at(bx, top - 1, '0')
        v.at(bx + 1, top - 1, 'N')
        v.at(bx + 1, top, 'NOO')
        v.at(bx + 1, top + 1, 'NOOUN')
        v.at(bx + 1, top + 2, 'OUUVU')
        v.at(bx + 1, top + 3, 'UVV')
        v.at(bx + 1, top + 4, 'V')
        v.at(bx - 1, top + 1, 'VV')
    elif mode == 'back':  # raised over the shoulder: haft up and back, head at the far end
        n = L - 1
        for i in range(n): v.at(bx - 1 - i, hy - 2 - i, 'u')
        v.at(bx, hy + 1, '0'); v.at(bx, hy - 1, 'u')
        ex, ey = bx - 1 - (n - 1), hy - 2 - (n - 1)
        v.at(ex - 1, ey - 2, 'NO')
        v.at(ex - 2, ey - 1, 'NOOU')
        v.at(ex - 2, ey, 'OU'); v.at(ex + 1, ey, 'V')
        v.at(ex - 1, ey + 1, 'V')
    elif mode == 'forward':  # swung level: haft out in front, head hanging from the end
        e = bx + L
        for x in range(bx - 2, e + 1): v.at(x, hy, 'u')
        v.at(e - 1, hy - 1, 'NO')
        v.at(e - 2, hy + 1, 'NOOU')
        v.at(e - 2, hy + 2, 'NOUUV')
        v.at(e - 2, hy + 3, 'OUVV')
        v.at(e - 1, hy + 4, 'V')
    elif mode == 'low':  # follow-through: haft down and forward
        n = max(3, L - 4)
        for i in range(n): v.at(bx + i, hy + 1 + i, 'u')
        ex, ey = bx + n - 1, hy + n
        v.at(ex - 1, ey - 1, 'NN')
        v.at(ex - 2, ey, 'NOOO')
        v.at(ex - 2, ey + 1, 'OUUUV')
        v.at(ex - 1, ey + 2, 'UVV')
        v.at(ex + 2, ey, 'V')


def pick(v, bx, hy, mode, L):
    """A pickaxe: wooden haft through column bx when upright, a curved steel head across its top."""
    if mode in ('up', 'down'):
        top = hy - L
        for y in range(top, hy + 3): v.at(bx, y, 'u' if y < hy else '0')
        v.at(bx - 2, top - 1, 'NOOOU')
        v.at(bx - 3, top, 'N'); v.at(bx + 3, top, 'U')
        v.at(bx - 3, top + 1, 'U'); v.at(bx + 3, top + 1, 'V')
    elif mode == 'back':  # raised over the shoulder: haft up and back, head across its end
        n = L - 1
        for i in range(n): v.at(bx - 1 - i, hy - 2 - i, 'u')
        v.at(bx, hy + 1, '0'); v.at(bx, hy - 1, 'u')
        ex, ey = bx - 1 - (n - 1), hy - 2 - (n - 1)
        v.at(ex, ey, 'O')
        v.at(ex + 1, ey - 1, 'N'); v.at(ex + 2, ey - 2, 'N'); v.at(ex + 3, ey - 1, 'U')
        v.at(ex - 1, ey + 1, 'O'); v.at(ex - 2, ey + 2, 'U'); v.at(ex - 1, ey + 3, 'V')
    elif mode == 'forward':  # swung level: haft out in front, head upright at the end
        e = bx + L
        for x in range(bx - 2, e): v.at(x, hy, 'u')
        for y, ch in zip(range(hy - 2, hy + 3), 'NOOUU'): v.at(e, y, ch)
        v.at(e - 1, hy - 3, 'N'); v.at(e - 1, hy + 3, 'V')
    elif mode == 'low':  # follow-through: haft down and forward
        n = max(3, L - 4)
        for i in range(n): v.at(bx + i, hy + 1 + i, 'u')
        ex, ey = bx + n - 1, hy + n
        v.at(ex, ey, 'O')
        v.at(ex + 1, ey - 1, 'N'); v.at(ex + 2, ey - 2, 'O'); v.at(ex + 1, ey - 3, 'U')
        v.at(ex - 1, ey + 1, 'U'); v.at(ex - 2, ey + 2, 'V'); v.at(ex - 3, ey + 1, 'V')


def floating_pick(v, bx, y0, mode):
    if mode in ('up', 'raise'):
        top = y0 + (6 if mode == 'up' else 2)
        for y in range(top, top + 14): v.at(bx + 1, y, 'u')
        v.at(bx - 2, top - 1, 'NNOOOUU')
        v.at(bx - 3, top, 'N'); v.at(bx + 5, top, 'U'); v.at(bx - 3, top + 1, 'U'); v.at(bx + 5, top + 1, 'V')
    elif mode == 'back':
        for i in range(12): v.at(bx - 2 - i // 2, y0 + 18 - i, 'u')
        ex, ey = bx - 8, y0 + 6
        v.at(ex - 3, ey - 1, 'NNOOOU'); v.at(ex - 4, ey, 'N'); v.at(ex + 3, ey, 'V')
    elif mode == 'forward':
        e = bx + 14
        for x in range(bx, e): v.at(x, y0 + 12, 'u')
        for y, ch in zip(range(y0 + 9, y0 + 16), 'NNOOUUV'): v.at(e, y, ch)
        v.at(e - 1, y0 + 8, 'N'); v.at(e - 1, y0 + 16, 'V')
    elif mode == 'low':
        for i in range(11): v.at(bx + i, y0 + 12 + i // 2, 'u')
        ex, ey = bx + 11, y0 + 17
        v.at(ex, ey - 3, 'N'); v.at(ex + 1, ey - 2, 'NO'); v.at(ex + 1, ey - 1, 'OU'); v.at(ex, ey, 'OU'); v.at(ex - 1, ey + 1, 'UV'); v.at(ex - 2, ey + 2, 'V')


FLOAT = {
    'sig': dict(blade='CBb', guard='gGGg', g2='gg', g3='gGg', g5='gGGGg', fwd='CBb'),
    'rusty_sword': dict(blade='Oef', guard='VUUV', g2='VV', g3='VUV', g5='VUUUV', fwd='Oef'),
    'iron_sword': dict(blade='NOU', guard='ZYYZ', g2='ZZ', g3='ZYZ', g5='ZYYYZ', fwd='NOU'),
}


# ------------------------------------------------------------ the archer's bows and quivers
BOWS = {
    'worn_shortbow': dict(lit='i', dark='o', grip='t', tip='o', wrap='T', size=-1),
    'hunting_bow': dict(lit='α', dark='β', grip='γ', tip='δ', size=0),
    'yew_longbow': dict(lit='ε', dark='ζ', grip='η', tip='θ', size=1),
}


def bow(v, gx, gy, mode, up, down, art, draw_hand=None):
    """A bow held upright by its grip at (gx, gy) (the hand just left of it), bellying forward:
    limbs `up` and `down` pixels long, lit above and shaded below, the string down its back
    from tip to tip. Modes: 'rest' (carried), 'nock' (an arrow on the string), 'draw' (the
    string pulled back to the drawing hand), 'loose' (the string snapped straight, the arrow
    gone) and 'lower'. Anything else is carried."""
    s = 2 if min(up, down) >= 5 else 1
    tipx = gx - s
    for dy in range(-up, down + 1):
        L = up if dy < 0 else down
        off = s * (1 - (dy / max(L, 1)) ** 2)
        ch = art['grip'] if abs(dy) <= 1 else (art['lit'] if dy < 0 else art['dark'])
        v.at(tipx + round(off), gy + dy, ch)
    if art.get('wrap'):
        for dy in (-up // 2, down // 2):
            L = up if dy < 0 else down
            v.at(tipx + round(s * (1 - (dy / max(L, 1)) ** 2)), gy + dy, art['wrap'])
    v.at(tipx, gy - up, art['tip'])
    v.at(tipx, gy + down, art['tip'])
    if mode in ('nock', 'draw'):
        nx = tipx - (6 if mode == 'draw' else 2)
        line(v, tipx, gy - up, nx, gy, '8')
        line(v, nx, gy, tipx, gy + down, '8')
        v.at(nx, gy, '8')
        # the arrow: shaft from the string to past the bow, a steel head, white fletching
        for x in range(nx + 1, gx + 3):
            v.at(x, gy, '9')
        v.at(gx + 3, gy, 'NO')
        v.at(gx + 3, gy - 1, 'U'); v.at(gx + 3, gy + 1, 'U')
        v.at(nx + 1, gy - 1, '`'); v.at(nx + 1, gy + 1, '`')
        if draw_hand:
            v.at(nx - 1, gy, draw_hand)
    else:
        for y in range(gy - up + 1, gy + down):
            v.at(tipx, y, '8')
        if mode == 'loose' and draw_hand:
            v.at(tipx - 6, gy - 1, draw_hand)


def floating_bow(v, bx, y0, mode, art):
    """The masked hero's bow hovers beside it; the string draws itself."""
    bow(v, bx + 2, y0 + 12, mode, 8, 8, art)


QUIVERS = {
    'leather_quiver': ['`ξ`...', '.```..', '.9.9..', '}}}}..', 'κκλ...', 'κκλ...', '.κκλ..', '.κκλ..', '.}}}..', '..κλ..', '..κκλ.', '..λλλ.'],
    'hunters_quiver': ['`π`...', '.```..', '.9.9..', 'OOOU..', 'μμν...', 'μμν...', '.μμν..', '.μμν..', '.OOU..', '..μν..', '..μμν.', '..ννν.'],
}


def quiver(v, hero, item, x, y):
    """A quiver on the back: its mouth by the back shoulder, the fletching above it; drawn
    behind the body."""
    v.tag('offhand')
    for i, r in enumerate(QUIVERS[item]):
        v.at(x, y + i, r)


def floating(v, bx, hy, mode, b, item='sig'):
    """The masked hero's weapon hovers beside it (3-wide blade, guard below), or a floating axe."""
    y0 = 3 - b
    if item in BOWS:
        floating_bow(v, bx, y0, mode, BOWS[item])
        return
    if item == 'woodcutter_axe':
        floating_axe(v, bx, y0, mode)
        return
    if item == 'pickaxe':
        floating_pick(v, bx, y0, mode)
        return
    f = FLOAT[item]
    if mode == 'up':
        for y in range(y0 + 5, y0 + 19): v.at(bx, y, f['blade'])
        v.at(bx - 1, y0 + 19, f['guard']); v.at(bx, y0 + 20, f['g2'])
    elif mode == 'back':
        for i in range(12): v.at(bx - 2 - i // 2, y0 + 16 - i, f['blade'])
        v.at(bx - 2, y0 + 17, f['g3'])
    elif mode == 'raise':
        for y in range(y0 + 1, y0 + 15): v.at(bx + 1, y, f['blade'])
        v.at(bx, y0 + 15, f['guard'])
    elif mode == 'forward':
        for x in range(bx + 1, bx + 15):
            v.at(x, y0 + 11, f['fwd'][0]); v.at(x, y0 + 12, f['fwd'][1]); v.at(x, y0 + 13, f['fwd'][2])
        for y, ch in zip(range(y0 + 10, y0 + 15), f['g5']): v.at(bx, y, ch)
    elif mode == 'low':
        for i in range(12): v.at(bx + i, y0 + 13 + i // 2, f['blade'])
        v.at(bx - 1, y0 + 12, f['g3'])


def floating_axe(v, bx, y0, mode):
    if mode == 'up':
        for y in range(y0 + 7, y0 + 21): v.at(bx + 1, y, 'u')
        v.at(bx + 1, y0 + 6, '0')
        v.at(bx + 2, y0 + 7, 'NOO'); v.at(bx + 2, y0 + 8, 'NOOUV'); v.at(bx + 2, y0 + 9, 'OUUVV'); v.at(bx + 2, y0 + 10, 'UVV')
        v.at(bx, y0 + 8, 'V')
    elif mode == 'back':
        for i in range(12): v.at(bx - 2 - i // 2, y0 + 18 - i, 'u')
        v.at(bx - 9, y0 + 4, 'NOO'); v.at(bx - 10, y0 + 5, 'NOOU'); v.at(bx - 10, y0 + 6, 'OUV')
    elif mode == 'raise':
        for y in range(y0 + 3, y0 + 17): v.at(bx + 1, y, 'u')
        v.at(bx + 2, y0 + 3, 'NOO'); v.at(bx + 2, y0 + 4, 'NOOUV'); v.at(bx + 2, y0 + 5, 'OUUVV'); v.at(bx + 2, y0 + 6, 'UVV')
    elif mode == 'forward':
        for x in range(bx, bx + 14): v.at(x, y0 + 12, 'u')
        v.at(bx + 12, y0 + 11, 'NO'); v.at(bx + 11, y0 + 13, 'NOOU'); v.at(bx + 11, y0 + 14, 'OUUV'); v.at(bx + 12, y0 + 15, 'UV')
    elif mode == 'low':
        for i in range(11): v.at(bx + i, y0 + 12 + i // 2, 'u')
        v.at(bx + 9, y0 + 15, 'NO'); v.at(bx + 8, y0 + 16, 'NOOU'); v.at(bx + 8, y0 + 17, 'OUUV'); v.at(bx + 9, y0 + 18, 'UV')


# ================================================================ the heroes
class Hero:
    small = False
    bob_sign = 1
    tone = None      # letter -> tone (0 light .. 3 dark) of the body the gear re-shades
    buckle_x = None  # where a belt buckle sits, for armour


BARE_TONE = {'^': 0, '/': 1, ':': 2, ',': 3, '[': 1, ']': 2, '{': 3}
BARE_LEGS = dict(cols=(':', '/'), boot=('/', ','))   # bare legs and feet


def to_skin(rows, tone):
    """Re-letter rows into skin tones (the shape of an outfit becomes a bare body)."""
    return [(x, y, ''.join('^/:,'[tone[c]] if c in tone else c for c in s)) for x, y, s in rows]


def to_linen(rows, tone):
    return [(x, y, ''.join('[[]{'[tone[c]] if c in tone else c for c in s)) for x, y, s in rows]


def head(v, hero, oy, sway, gear):
    """The bare head (hair and face), with a cap or helm drawn over it."""
    v.tag('head')
    rows_at(v, oy, hero.bare_head)
    item = gear.get('head')
    if item:
        rows_at(v, oy, hero.heads[item])


def torso(v, oy, rows, belt_rows=(), hips_rows=()):
    for x, y, s in rows:
        v.tag('belt' if y in belt_rows else 'hips' if y in hips_rows else 'torso')
        v.at(x, oy + y, s)
        if y not in belt_rows:  # the lit left edge, which armour keeps
            v.g.edge.add((x + v.dx, oy + y + v.dy))


def bare_torso(sig_rows, tone, skin_ys, belt_y, hips_ys):
    """A bare body in the shape of an outfit: skin above the belt, linen shorts below."""
    out = []
    for x, y, s in sig_rows:
        if y in skin_ys:
            out += to_skin([(x, y, s)], tone)
        elif y == belt_y:
            out.append((x, y, ']' * len(s)))
        elif y in hips_ys:
            out += to_linen([(x, y, s)], tone)
    return out


def caps(spans, brim, extra=()):
    """A leather cap and an iron helm (plus cheek guards / nasal) over a head."""
    return {'leather_cap': dome(spans, brim, 'leather'), 'iron_helm': dome(spans, brim, 'iron') + list(extra)}


# ---------------------------------------------------------------------------------------------
# Signature outfits: the knights' grey plate and helms (K1 plumed great helm and tabard, K2 round
# open helm, K3 crested helm). Not drawn any more (heroes are bare until they equip gear); kept as
# the reference art for a future plate tier.
SIG_K1_HELM = [(9, 0, '12223'), (8, 1, '1122234'), (7, 2, '112222344'), (7, 3, '122222344'), (7, 4, '1GGGGGGgg'), (7, 5, '122vEEEE5'),
               (7, 6, '1222v4444'), (7, 7, '122223344'), (7, 8, '122223344'), (8, 9, '1222344'), (9, 10, '23345')]
SIG_K1_TORSO = [(6, 11, '1122223344'), (5, 12, '112RRrrr344'), (5, 13, '12RRGGrq344'), (6, 14, '2RRGGrq34'), (6, 15, '2RRrrrq34'),
                (6, 16, '2RRGrrq34'), (6, 17, 'dLLGLLld4'), (6, 18, '2RRrrrq34'), (6, 19, '2RRrrqq34'), (7, 20, '3Rrrqq4')]
SIG_K2_HELM = [(8, 0, '1122223'), (6, 1, '11222222334'), (5, 2, '1122222223344'), (4, 3, '112222222223344'), (4, 4, '1GGGGGGGGGGGgg4'),
               (4, 5, '12245SSSSSSS344'), (4, 6, '1245SSSSSSSSs34'), (4, 7, '1245SSWESSWEs34'), (4, 8, '1245SSEESSEEs34'),
               (4, 9, '1245SpSSSSSps34'), (4, 10, '1224SSSSSSsss34'), (5, 11, '12245sssskk344'), (6, 12, '12222222334'), (8, 13, '3333444')]
SIG_K2_TORSO = [(7, 14, '2cccCC3'), (7, 15, 'ccccCCD'), (7, 16, 'cGcCCCD'), (7, 17, 'dLLGLLd'), (7, 18, 'ccccCCD'), (8, 19, 'cccCD')]
SIG_K3_HELM = [(8, 0, '1223'), (7, 1, '122234'), (7, 2, '122234'), (7, 3, '1vEEE5'), (7, 4, '122234'), (7, 5, '122334'), (8, 6, '2334'), (8, 7, '3445')]
SIG_K3_TORSO = [(6, 8, '11222344'), (5, 9, '1122223344'), (6, 10, '12222344'), (6, 11, '1222G344'), (6, 12, '12222344'), (6, 13, '12222344'),
                (6, 14, 'dLLGLLd4'), (6, 15, '12222344'), (6, 16, '12222344'), (7, 17, '222344'), (7, 18, '223344')]
SIG_H4_TORSO = [(5, 13, 'cccccCCD'), (4, 14, 'ccccccCCDD'), (4, 15, 'cccccCCCDD'), (4, 16, 'cLLGLLCDD'), (4, 17, 'ccccccCDD'), (4, 18, 'cccccCCDD')]
SIG_H5 = [(7, 0, '11223'), (5, 1, '112222333'), (4, 2, '11222222333'), (3, 3, '11225555555334'), (3, 4, '11225MMMMm5334'), (3, 5, '11225MEMEm5334'),
          (3, 6, '11225MMMmm5334'), (3, 7, '11225nmmmn5334'), (3, 8, '11225555555334'), (3, 9, '1122222223334'), (2, 10, '11222222223334'),
          (2, 11, '12222222223334'), (2, 12, '12222222223334'), (2, 13, '12222222223334'), (1, 14, '112222222222334'), (1, 15, '122222222222334'),
          (1, 16, '122222222223334'), (1, 17, '122222222223334'), (0, 18, '11222222222233344'), (0, 19, '12222222222233344'),
          (0, 20, '12222222222233344'), (0, 21, '12222222222233344'), (1, 22, '1222222222333444'), (1, 23, '1222222222333444')]
PLATE_TONE = {'1': 0, '2': 1, '3': 2, '4': 3, '5': 3, 'R': 1, 'r': 2, 'q': 3, 'G': 1, 'g': 2, 'c': 1, 'C': 2, 'D': 3, 'd': 2, 'L': 1, 'l': 2}

# ---------------------------------------------------------------- K1 Knight: tall and broad, auburn hair
k1 = Hero()
k1.pal = {**STEEL, **RED, **GOLD, **LEATHER, **BLADE, 'E': '#141826', 'v': '#2a3048', 'h': '#b8743e', 'H': '#7e4a28'}
k1.bare_head = [(9, 0, 'hhhH'), (8, 1, 'hhhhhhH'), (7, 2, 'hhhhhhhHH'), (7, 3, 'hhhhhhhhH'),
                (7, 4, 'h//////:H'), (7, 5, 'h/?;/?;:H'), (7, 6, 'h//////:H'), (7, 7, 'h://///:H'),
                (8, 8, '::///::'), (9, 9, '::::,'), (10, 10, ',,,')]
k1.heads = caps([(0, 9, 12), (1, 8, 14), (2, 7, 15)], (3, 7, 16),
                [(7, y, 'NO') for y in range(4, 8)] + [(14, y, 'UV') for y in range(4, 8)] + [(8, 8, 'U'), (14, 8, 'V'),
                 (11, 4, 'O'), (11, 5, 'O'), (11, 6, 'U')])
k1.torso = bare_torso(SIG_K1_TORSO, PLATE_TONE, range(11, 17), 17, range(18, 21))
def k1_body(v, b, sway, gear):
    oy = 2 + b
    head(v, k1, oy, sway, gear)
    torso(v, oy, k1.torso, belt_rows=(17,), hips_rows=range(18, 21))
    return oy
k1.body = k1_body
k1.buckle_x = 9
k1.legs = dict(x0=7, y0=23, n=9, w=3, gap=1, **BARE_LEGS)
k1.weapon = dict(kind='sword', bx=17, hy=17, L=10, hand='/:', shoulder=(15, 15), arm=':')
k1.shield, k1.amulet = (2, 12), (11, 12, 2)
k1.waist, k1.portrait = 22, (7, 1, 12, 13)

# ---------------------------------------------------------------- K2 Squire: cute, big blond head, slim body, short legs
k2 = Hero()
k2.pal = {**STEEL, **GOLD, **LEATHER, **BLADE, **SKIN, 'c': '#5a8ad0', 'C': '#3e66a8', 'D': '#2c4a80', 'R': '#f0685a', 'r': '#c8392f',
          'h': '#f0c870', 'H': '#c8984a'}
K2_FACE = [(5, 6, 'hhhhSSSSSSSHH'), (5, 7, 'hhhSSSSSSSSsH'), (5, 8, 'hhhSSWESSWEsH'), (5, 9, 'hhhSSEESSEEsH'), (5, 10, 'hhhSpSSSSSpsH'),
           (5, 11, 'hhhSSSSSSsssH'), (6, 12, 'HHhsssskkH'), (10, 13, 'kkkk')]
k2.bare_head = [(8, 1, 'hhhhhH'), (6, 2, 'hhhhhhhhHH'), (5, 3, 'hhhhhhhhhhHHH'), (5, 4, 'hhhhhhhhhhhHH'), (5, 5, 'hhhhhhhhhhhhH')] + K2_FACE
k2.heads = caps([(1, 8, 13), (2, 6, 15), (3, 5, 17), (4, 5, 17)], (5, 4, 18),
                [(5, y, 'NO') for y in range(6, 11)] + [(16, y, 'UV') for y in range(6, 11)] + [(12, 6, 'OU'), (12, 7, 'OU'), (12, 8, 'UV')])
k2.torso = bare_torso(SIG_K2_TORSO, PLATE_TONE, range(14, 17), 17, range(18, 20))
def k2_body(v, b, sway, gear):
    oy = 2 + b
    head(v, k2, oy, sway, gear)
    torso(v, oy, k2.torso, belt_rows=(17,), hips_rows=range(18, 20))
    return oy
k2.body = k2_body
k2.buckle_x = 10
k2.small = True
k2.legs = dict(x0=8, y0=22, n=4, w=2, gap=1, **BARE_LEGS)
k2.weapon = dict(kind='sword', bx=17, hy=19, L=5, hand='S', shoulder=(13, 18), arm=':')
k2.shield, k2.amulet = (3, 14), (10, 15, 1)
k2.waist, k2.portrait = 21, (4, 0, 17, 16)

# ---------------------------------------------------------------- K3 Silver knight: tall and slim, long silver hair
k3 = Hero()
k3.pal = {**STEEL, **GOLD, **LEATHER, **BLADE, 'E': '#7ad8ff', 'v': '#1e2236', 'x': '#7a8ea6', 'y': '#56687e', 'z': '#3c4a5c', 'w': '#28323e',
          'h': '#eef1f8', 'H': '#aab2c6'}
k3.bare_head = [(8, 0, 'hhhH'), (7, 1, 'hhhhhH'), (7, 2, 'hhhhhH'), (7, 3, 'hh//;:'), (7, 4, 'hh////'), (7, 5, 'Hh//:'), (7, 6, 'HH::'), (9, 7, ',,')]
k3.heads = caps([(0, 8, 11), (1, 7, 12)], (2, 7, 13), [(7, 3, 'OU'), (7, 4, 'OU'), (7, 5, 'UV'), (12, 3, 'U'), (12, 4, 'V')])
k3.torso = bare_torso(SIG_K3_TORSO, PLATE_TONE, range(8, 14), 14, range(15, 19))
def k3_body(v, b, sway, gear):
    oy = 3 + b
    head(v, k3, oy, sway, gear)
    torso(v, oy, k3.torso, belt_rows=(14,), hips_rows=range(15, 19))
    return oy
k3.body = k3_body
k3.buckle_x = 9
k3.legs = dict(x0=7, y0=22, n=11, w=2, gap=1, **BARE_LEGS)
k3.weapon = dict(kind='sword', bx=15, hy=15, L=13, hand='/', rest='down', shoulder=(13, 13), arm=':')
k3.shield, k3.amulet = (2, 10), (9, 10, 2)
k3.waist, k3.portrait = 20, (7, 0, 9, 12)

# ---------------------------------------------------------------- H1 Sprout: a big round head with chestnut hair, tiny body
h1 = Hero()
h1.pal = {**SKIN, **GOLD, **LEATHER, **BLADE, 'p': '#4a5468', 'P': '#363e50', 'q': '#f4a090', 'h': '#b0703c', 'H': '#7a4626', 'j': '#4e2c18'}
h1.bare_head = [(8, 0, 'hhhhH'), (6, 1, 'hhhhhhhHH'), (5, 2, 'hhhhhhhhhHH'), (4, 3, 'hhhhhhhhhhhHH'), (4, 4, 'hhhhhhhhhhhhHj'),
                (4, 5, 'hhhSSSSSSSSsHj'), (4, 6, 'hhhSSSSSSSSsHj'), (4, 7, 'hhhSSWESSWEsHj'), (4, 8, 'hhhSSEESSEEsHj'),
                (4, 9, 'jhhSqSSSSSqsHj'), (5, 10, 'jhSSSSSSsssj'), (6, 11, 'jksSSSSssk'), (9, 12, 'kkkkk')]
h1.heads = caps([(0, 8, 12), (1, 6, 14), (2, 5, 15)], (3, 4, 17))
h1.torso = [(6, 13, '^////::,'), (5, 14, '^^/////::,'), (5, 15, '^//////::,'), (5, 16, '^//////::,'), (5, 17, ']]]]]]]]]]'),
            (5, 18, '[[[[[[]]]{'), (5, 19, '[[[[[[]]]{'), (5, 20, '[[[[[]]]]{'), (5, 21, '[[[[[]]]]{')]
def h1_body(v, b, sway, gear):
    head(v, h1, b, sway, gear)
    torso(v, b, h1.torso, belt_rows=(17,), hips_rows=range(18, 22))
    return b
h1.body = h1_body
h1.buckle_x = 9
h1.small = True
h1.legs = dict(x0=6, y0=22, n=3, w=2, gap=2, **BARE_LEGS)
h1.weapon = dict(kind='sword', bx=17, hy=15, L=11, hand='sS', shoulder=(13, 15), arm=':')
h1.shield, h1.amulet = (0, 13), (9, 15, 2)
h1.waist, h1.portrait = 17, (3, 0, 17, 15)

# ---------------------------------------------------------------- H2 Wanderer: tall and slim, dark hair, faceless profile
h2 = Hero()
h2.pal = {**SKIN, **GOLD, **LEATHER, **BLADE, 'h': '#2a2630', 'H': '#463e50', 'x': '#8a9ca6', 'y': '#62747e', 'z': '#46545c', 'w': '#2e3840', 'p': '#3a3e48', 'P': '#2a2e36'}
h2.bare_head = [(5, 0, 'hhh'), (4, 1, 'hHHhh'), (4, 2, 'hHhhhh'), (4, 3, 'hhhSSs'), (4, 4, 'hhhSSsk'), (4, 5, 'hhSSSs'), (5, 6, 'hksk'), (6, 7, 'kk')]
h2.heads = caps([(-1, 5, 7), (0, 4, 8), (1, 4, 9)], (2, 3, 10))
h2.torso = [(4, 8, '^//:,'), (3, 9, '^^///::,'), (3, 10, '^////::,'), (3, 11, '^////::,'), (3, 12, '^///:::,'), (3, 13, ']]]]]]]]'),
            (3, 14, '[[[[[]]{'), (3, 15, '[[[[[]]{'), (3, 16, '[[[[]]]{')]
def h2_body(v, b, sway, gear):
    head(v, h2, b, sway, gear)
    torso(v, b, h2.torso, belt_rows=(13,), hips_rows=range(14, 17))
    return b
h2.body = h2_body
h2.buckle_x = 6
h2.legs = dict(x0=4, y0=17, n=13, w=2, gap=2, **BARE_LEGS)
h2.weapon = dict(kind='sword', bx=12, hy=10, L=9, hand='sS', shoulder=(11, 10), arm=':')
h2.shield, h2.amulet = (-1, 10), (6, 10, 2)
h2.waist, h2.portrait = 15, (4, 0, 8, 9)

# ---------------------------------------------------------------- H3 Traveller: ginger hair, profile
h3 = Hero()
h3.pal = {**SKIN, **LEATHER, **GOLD, 'w': '#9a7046', 'K': '#d8c48a', 'p': '#4e5048', 'P': '#3a3c36', 'h': '#e08848', 'H': '#a85a2c'}
h3.bare_head = [(7, 0, 'hhhH'), (5, 1, 'hhhhhhH'), (5, 2, 'hhhhhhhhH'), (5, 3, 'hhhhhSSSs'), (5, 4, 'hhhhhSSEs'), (5, 5, 'hhhhSSSSk'),
                (6, 6, 'hhsSSk'), (8, 7, 'kk')]
h3.heads = caps([(0, 6, 10), (1, 5, 12)], (2, 4, 14))
h3.torso = [(5, 8, '^////::'), (4, 9, '^//////:,'), (4, 10, '^/////:,'), (4, 11, '^/////::'), (4, 12, ']]]]]]]]'),
            (4, 13, '[[[[[[]]'), (4, 14, '[[[[[[]]{'), (3, 15, '[[[[[[[]]{'), (3, 16, '[[[[[[]]]{')]
def h3_body(v, b, sway, gear):
    head(v, h3, b, sway, gear)
    torso(v, b, h3.torso, belt_rows=(12,), hips_rows=range(13, 17))
    return b
h3.body = h3_body
h3.buckle_x = 8
h3.legs = dict(x0=5, y0=17, n=6, w=2, gap=2, **BARE_LEGS)
h3.weapon = dict(kind='staff', bx=14, hy=10, L=8, hand='sS', shoulder=(10, 10), arm=':')
h3.shield, h3.amulet = (0, 9), (8, 11, 1)
h3.waist, h3.portrait = 13, (4, 0, 12, 10)

# ---------------------------------------------------------------- H4 Cute: a big dark-haired head with dot eyes
h4 = Hero()
h4.pal = {**SKIN, **GOLD, **LEATHER, **BLADE, 'h': '#3a2a34', 'H': '#5a4452', 'j': '#241a22', 'c': '#7a96bc', 'C': '#56729c', 'D': '#3c5478', 'p': '#4a4a5a', 'P': '#36364a'}
h4.bare_head = [(6, 0, 'hhhhhh'), (4, 1, 'hhHHHHhhh'), (3, 2, 'hhHHHHHHhhh'), (2, 3, 'hhHHhhhhhhhhh'), (2, 4, 'hhhhhhhhhhhhhj'), (2, 5, 'hhhhSSSSSSShhj'),
                (2, 6, 'hhhSSSSSSSSShj'), (2, 7, 'hhhSSWESSWESsj'), (2, 8, 'hhhSSEESSEESsj'), (2, 9, 'jhhSpSSSSSpssj'), (3, 10, 'jhSSSSSSssskj'),
                (4, 11, 'jkssssssskj'), (6, 12, 'kkkkkkk')]
h4.heads = caps([(-1, 6, 10), (0, 4, 12), (1, 3, 13), (2, 3, 14)], (3, 2, 15))
h4.torso = bare_torso([(x, y, s[0].replace('c', '1') + s[1:]) for x, y, s in SIG_H4_TORSO], {**PLATE_TONE, '1': 0}, range(13, 16), 16, range(17, 19))
def h4_body(v, b, sway, gear):
    head(v, h4, b, sway, gear)
    torso(v, b, h4.torso, belt_rows=(16,), hips_rows=range(17, 19))
    return b
h4.body = h4_body
h4.buckle_x = 7
h4.small = True
h4.legs = dict(x0=5, y0=19, n=3, w=2, gap=2, **BARE_LEGS)
h4.weapon = dict(kind='sword', bx=15, hy=15, L=6, hand='sS', shoulder=(12, 15), arm=':')
h4.shield, h4.amulet = (0, 12), (8, 14, 1)
h4.waist, h4.portrait = 17, (2, 0, 15, 14)

# ---------------------------------------------------------------- H5 Masked: a pale floating spirit wearing a mask
h5 = Hero()
h5.pal = {**GOLD, **BLADE, '5': '#1a1430', 'M': '#f4eedc', 'm': '#cfc6ae', 'n': '#a89e86', 'E': '#7af0ff', 'C': '#aaf6ff',
          'q': '#f4f0fc', 'w': '#d8d0ec', 'x': '#b0a4d4', 'y': '#8a7cb4'}
SPIRIT = str.maketrans({'1': 'q', '2': 'w', '3': 'x', '4': 'y'})
H5_ROWS = [(x, y, s.translate(SPIRIT)) for x, y, s in SIG_H5]
h5.bare_head = H5_ROWS[:9]
def h5_body(v, b, sway, gear, hem=24):
    y0 = 3 - b
    head(v, h5, y0, sway, gear)
    for x, y, s in H5_ROWS[9:]:
        if y < hem:
            v.tag('torso' if y < 17 else 'skirt')
            v.at(x, y0 + y, s)
    v.tag('skirt')
    v.at(2 if hem >= 24 else 1, y0 + hem, ['x.xx.xxx.xx.x', '.xx.xxx.xx.x.', 'xx.xx.xxx.x.x'][sway % 3])
    return y0
h5.body = h5_body
h5.heads = caps([(-1, 7, 11), (0, 5, 13), (1, 4, 14)], (2, 3, 15))
h5.tone = {'q': 0, 'w': 1, 'x': 2, 'y': 3}
h5.bob_sign = -1
h5.legs = None
h5.weapon = dict(kind='float', bx=18, hy=22)
h5.shield, h5.amulet = (-7, 9), (9, 10, 1)
h5.waist, h5.portrait = 16, (3, 2, 15, 12)

HEROES = {'k1': k1, 'k2': k2, 'k3': k3, 'hood': h1, 'wanderer': h2, 'traveller': h3, 'cute': h4, 'masked': h5}


# ================================================================ gear parts
def weapon_spec(hero, item):
    W = hero.weapon
    if item == 'sig' or W['kind'] == 'float':
        return dict(W, item=item)
    base = dict(bx=W['bx'], hy=W['hy'], hand=W['hand'], shoulder=W['shoulder'], arm=W['arm'], item=item)
    L0 = W['L']
    if item == 'rusty_sword':
        return dict(base, kind='sword', L=max(4, L0 - 1), blade=['Oe', 'Oa', 'ae', 'Oe', 'Of', 'Oe'], guard='VUUV', grip='J', pommel='U', rest=W.get('rest', 'up'))
    if item == 'iron_sword':
        return dict(base, kind='sword', L=L0 + 1, low_L=L0, blade='NO', guard='ZYYZ', grip='J', pommel='Y', rest=W.get('rest', 'up'))
    if item in BOWS:
        # a bow's size follows the hero's (their sword's length), and never reaches the feet
        half = max(4, min(9, round(L0 * 0.7) + 1 + BOWS[item]['size']))
        feet = hero.legs['y0'] + hero.legs['n'] if hero.legs else 99
        return dict(base, kind='bow', up=half, down=half, feet=feet, art=BOWS[item], rest='rest')
    if item == 'woodcutter_axe':
        return dict(base, kind='axe', L=max(6, L0), rest='up')
    if item == 'pickaxe':
        return dict(base, kind='pick', L=max(6, L0), rest='up')
    raise KeyError(item)


def draw_weapon(v, spec, mode, hx, hy, b):
    v.tag('weapon')
    k = spec['kind']
    if k == 'sword':
        sword(v, hx, hy, mode, spec.get('low_L', spec['L']) if mode == 'low' else spec['L'], guard=spec.get('guard', 'gGGg'), grip=spec.get('grip', 'd'), pommel=spec.get('pommel'), blade=spec.get('blade', 'Bb'))
    elif k == 'staff':
        staff(v, hx, hy, mode)
    elif k == 'axe':
        axe(v, hx, hy, mode, spec['L'])
    elif k == 'pick':
        pick(v, hx, hy, mode, spec['L'])
    elif k == 'bow':
        down = min(spec['down'], spec['feet'] - hy - 2)
        hand = spec['hand'][-1] if mode in ('nock', 'draw', 'loose') else None
        bow(v, hx, hy, mode, spec['up'], down, spec['art'], hand)
    elif k == 'float':
        floating(v, spec['bx'], spec['hy'], mode, b, spec['item'])


def amulet(v, x, y, size):
    v.tag('trinket')
    if size > 1:
        v.at(x - 2, y - 2, 'Z'); v.at(x + 2, y - 2, 'Z')
    v.at(x - 1, y - 1, 'Z'); v.at(x + 1, y - 1, 'Z')
    v.at(x, y, '$'); v.at(x, y + 1, '%')


def shield(v, hero, item, x, y):
    v.tag('offhand')
    rows = SHIELDS[item]
    if hero.small and item == 'iron_shield':
        rows = rows[:5] + rows[6:]
    for i, r in enumerate(rows):
        v.at(x, y + i, r)


def masked_boots(v, y0, hem, mat):
    v.tag('boot')
    top, sole = mat['boot']
    for x in (5, 9):  # peeking out under the hem, inside the robe's own height
        v.at(x, y0 + hem - 1, top * 2)
        v.at(x, y0 + hem, sole * 3)


def recolor(g, hero, gear, off):
    """Armour and trousers re-shade the bare body they cover, keeping every pixel's light and shadow.
    A tunic covers the chest and the shorts; trousers cover the shorts and legs."""
    bm, lm = BODY_MAT.get(gear.get('body')), LEGS_MAT.get(gear.get('legs'))
    if not bm and not lm:
        return
    tone_of = hero.tone or BARE_TONE
    for y in range(g.h):
        for x in range(g.w):
            t, ch = g.t[y][x], g.g[y][x]
            if bm and t in ('torso', 'hips', 'belt', 'arm'):
                if t == 'arm':
                    g.g[y][x] = bm['tones'][2]
                elif t == 'belt':
                    g.g[y][x] = bm['buckle'] if x == hero.buckle_x + MX else bm['strap']
                elif ch in tone_of:
                    tone = tone_of[ch]
                    if (x, y) in g.edge:
                        tone = max(0, tone - 1)
                    if bm['mail'] and tone in (1, 2) and (x + y - off) % 2 == 0:
                        tone += 1
                    g.g[y][x] = bm['tones'][tone]
            elif lm and t in ('hips', 'belt', 'skirt') and ch in tone_of:
                tone = tone_of[ch]
                if (x, y) in g.edge:
                    tone = max(0, tone - 1)
                if lm['plates'] and (y - off) % 3 == 0:
                    tone = min(3, tone + 1)
                g.g[y][x] = lm['tones'][tone]


# ================================================================ assembling frames
def compose(hero, gear, *, b=0, sway=0, legs_mode='stand', weapon=None, hand=(0, 0), hem=24, arm=0, only=None):
    """One frame with the given gear. `only` draws a single item alone (for its layer)."""
    g = TG(64, 64)
    v = V(g, MX, MY)
    W = hero.weapon
    wid = gear.get('weapon')
    spec = weapon_spec(hero, wid) if wid else None
    floats = W['kind'] == 'float'
    if floats:
        mode = weapon or 'up'
        hx = hy = 0
    else:
        mode = weapon or (spec.get('rest', 'up') if spec else W.get('rest', 'up'))
        hx, hy = W['bx'] + hand[0], W['hy'] + hand[1] + b
    behind = mode == 'back'

    def item_layer(slot):
        return only is None or only == slot

    if spec and behind and item_layer('weapon'):
        draw_weapon(v, spec, mode, hx, hy, b)
    # a quiver hangs on the back, behind everything else
    if gear.get('offhand') in QUIVERS and item_layer('offhand'):
        qy = (3 - b) if floats else hero_oy(hero, b)
        sx, sy = hero.shield
        quiver(v, hero, gear["offhand"], sx + 1, qy + sy - 6)
    if only in ('weapon', 'offhand', 'trinket'):
        oy = (3 - b) if floats else hero_oy(hero, b)
    else:
        oy = hero.body(v, b, sway, gear, hem) if floats else hero.body(v, b, sway, gear)
    fm = FEET_MAT.get(gear.get('feet'))
    lm = LEGS_MAT.get(gear.get('legs'))
    if only is None:
        L = hero.legs
        if L:
            kw = dict(w=L['w'], gap=L['gap'], cols=lm['cols'] if lm else L['cols'], boot=fm['boot'] if fm else L['boot'],
                      knee=lm['knee'] if lm else None, dark=lm.get('dark') if lm else None, cuff=fm['cuff'] if fm else None, wing=fm['wing'] if fm else False)
            if legs_mode == 'tuck':
                legs(v, L['x0'], L['y0'] + b - 1, 0, 'tuck', **kw)
            else:
                legs(v, L['x0'], L['y0'] + b, L['n'] - b, legs_mode, **kw)
        elif fm:
            masked_boots(v, oy, hem, fm)
    if gear.get('trinket') and item_layer('trinket'):
        ax, ay, size = hero.amulet
        amulet(v, ax, oy + ay, size)
    if gear.get('offhand') and gear['offhand'] not in QUIVERS and item_layer('offhand'):
        sx, sy = hero.shield
        shield(v, hero, gear['offhand'], sx - arm, oy + sy)
    if not floats and only in (None, 'weapon'):
        if only is None:
            v.tag('arm')
            sx, sy = W['shoulder']
            line(v, sx, sy + b, hx - 1, hy, W['arm'])
        if spec and not behind:
            draw_weapon(v, spec, mode, hx, hy, b)
        v.tag('hand')
        v.at(hx - len(W['hand']), hy, W['hand'])
    elif spec and not behind and item_layer('weapon'):
        draw_weapon(v, spec, mode, hx, hy, b)
    if only is None:
        recolor(g, hero, gear, hero.bob_sign * b)
    return g


def hero_oy(hero, b):
    """The body's vertical origin for a bob (what body() returns)."""
    return {'k1': 2, 'k2': 2, 'k3': 3}.get(hero_name(hero), 0) + b


def hero_name(hero):
    return next(k for k, h in HEROES.items() if h is hero)


def poses(hero):
    """Every frame's pose: walk, idle, attack, jump, and the tuck the backflip spins."""
    if hero.legs is None:
        return {
            'walk': [dict(b=b, sway=i % 3) for i, b in enumerate((0, 1, 2, 1))],
            'idle': [dict(b=b, sway=s) for b, s in ((0, 0), (1, 0), (1, 1), (0, 1))],
            'attack': [dict(weapon=m) for m in ('back', 'raise', 'forward', 'low')],
            'shoot': [dict(weapon=p['weapon']) for p in SHOOT],
            'jump': [dict(hem=21, b=1), dict(hem=19, b=1), dict(hem=22)],
            'tuck': [dict(hem=18, b=1)],
        }
    walkmode = lambda p: dict(back=p['back'], front=p['front'], lift=p.get('lift'))
    return {
        'walk': [dict(b=p['bob'], sway=p['cape'], legs_mode=walkmode(p), hand=(p['arm'], 0), arm=p['arm']) for p in WALK],
        'idle': [dict(b=p['bob'], sway=p['cape']) for p in IDLE],
        'attack': [dict(b=p['bob'], legs_mode=p['legs'], weapon=p['weapon'], hand=p['hand']) for p in ATTACK],
        'shoot': [dict(legs_mode='stand', weapon=p['weapon'], hand=p['hand']) for p in SHOOT],
        'jump': [dict(legs_mode=dict(back=-1, front=0, feet=p.get('feet', 0)) if p['legs'] == 'air' else 'tuck', sway=1) for p in JUMP],
        'tuck': [dict(legs_mode='tuck', sway=1)],
    }
