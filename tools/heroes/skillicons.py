"""Skill icons for the action bar and spellbook (20×20, lit from the top-left), drawn to the
same standard as the backpack: one object plus its effect, 4–5 tones per material, small
details (wraps, rivets, gems, sparks). Curves are laid out with the band helpers below and
then touched up by hand; review with `python3 skillicons.py` (writes a magnified sheet)."""
import math
from tool import G, render, sheet

PAL = {
    # steel
    'W': '#ffffff', 'S': '#e2e9f2', 's': '#adb9cb', 't': '#76829c', 'u': '#4c5672',
    # gold
    'Y': '#fff2a8', 'G': '#f2c14e', 'g': '#c48a28', 'h': '#86581a',
    # leather and wood
    'L': '#d8a068', 'l': '#a86e3c', 'm': '#76461f', 'n': '#4a2a12',
    # blood
    'R': '#ff9c8c', 'r': '#e8443a', 'q': '#ae2626', 'Q': '#6c161c',
    # teal magic
    'C': '#d4fffc', 'c': '#5ce6e0', 'e': '#22a8a4', 'E': '#14686a',
    # fire
    'O': '#ffe690', 'o': '#ffaa4a', 'p': '#f06a2a', 'P': '#a63a1a',
    # purple
    'V': '#ece0ff', 'v': '#b48cfa', 'x': '#7c54ca', 'X': '#4a2e88',
    # green
    'K': '#dcffbc', 'k': '#90e272', 'j': '#4eb24a', 'J': '#2a7034',
    # bone and ivory
    'B': '#fff8e6', 'b': '#ecdcb6', 'd': '#bca47a', 'D': '#806a48',
    # horse highlight
    'F': '#f2c890',
    # pale blue (motion)
    'A': '#eef6ff', 'a': '#b0d4ff', 'i': '#6a9ee6', 'I': '#3a64a4',
    # near-black
    'Z': '#24182a', 'z': '#4a3a52',
}

# Glow: drawn over the outline and never outlined themselves, so sparks, wind, sound and
# auras read as light rather than as dark-rimmed solids.
GLOW = {
    '1': '#ffffff', '2': '#ffcf3a', '3': '#ff8a2a', '4': '#6aa8f0', '5': '#3a74d0',
    '6': '#5ad8d4', '7': '#1fa0a0', '8': '#4cbc44', '9': '#9ae67a', '0': '#ff7a6a',
    '*': '#e8443a', '+': '#ae2626',
    # the sorceress's: violet light and frost
    '%': '#dcc4ff', '&': '#9a6ae6', '~': '#c4ecff',
}
ALL = {**PAL, **GLOW}


def render_icon(rows):
    """Preview exactly as the game paints it: body outlined, then the glow on top."""
    body = [''.join('.' if c in GLOW else c for c in r) for r in rows]
    im = render(body, PAL, k=0.3)
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c in GLOW:
                h = GLOW[c]
                im.putpixel((x + 1, y + 1), (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255))
    return im


def px(g, pts, ch):
    for x, y in pts:
        g.at(x, y, ch)


def arc(g, cx, cy, r, a0, a1, width, ramp, under=False):
    """A curved swoosh: angles in degrees (screen space, y down), `width(t)` its thickness
    along the sweep (t from a0 to a1), `ramp` the colours from the outer edge inward."""
    for y in range(20):
        for x in range(20):
            if under and g.g[y][x] != '.':
                continue
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = math.hypot(dx, dy)
            a = math.degrees(math.atan2(dy, dx))
            lo, hi = min(a0, a1), max(a0, a1)
            for k in (0, 360, -360):
                if lo <= a + k <= hi:
                    a += k
                    break
            else:
                continue
            t = (a - a0) / (a1 - a0)
            w = width(t)
            depth = r - d
            if 0 <= depth < w:
                i = min(len(ramp) - 1, int(depth / max(w, 1e-6) * len(ramp)))
                g.at(x, y, ramp[i])


def curve(g, p0, p1, p2, width, shade):
    """A band along a quadratic Bezier: `width(t)` its thickness, `shade(t, s)` the letter for
    a pixel at parameter t and side s (-1 the upper-left edge, +1 the lower-right edge)."""
    pts = []
    for i in range(201):
        t = i / 200
        a, b, c = (1 - t) ** 2, 2 * (1 - t) * t, t * t
        x = a * p0[0] + b * p1[0] + c * p2[0]
        y = a * p0[1] + b * p1[1] + c * p2[1]
        tx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])
        ty = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
        n = math.hypot(tx, ty)
        pts.append((t, x, y, tx / n, ty / n))
    for yy in range(20):
        for xx in range(20):
            cx, cy = xx + 0.5, yy + 0.5
            t, x, y, tx, ty = min(pts, key=lambda p: (p[1] - cx) ** 2 + (p[2] - cy) ** 2)
            d = math.hypot(cx - x, cy - y)
            w = width(t)
            if d > w / 2 or (t in (0, 1) and abs((cx - x) * tx + (cy - y) * ty) > 0.5):
                continue
            # normal pointing up-left is the lit side
            nx, ny = -ty, tx
            if nx + ny > 0:
                nx, ny = -nx, -ny
            side = -((cx - x) * nx + (cy - y) * ny) / max(w / 2, 1e-6)
            ch = shade(t, side)
            if ch:
                g.at(xx, yy, ch)


def diag_blade(g, x0, y0, n, cells='WSt'):
    """A ↗ blade: row y0 starts at x0; each row up moves one right."""
    for i in range(n):
        g.at(x0 + i, y0 - i, cells)


def sword_hilt(g, guard=('GY', 'gG', 'gG', 'hg'), grip=('Ll', 'lm', 'Ll'), pommel=('YG', 'Gg')):
    """The hilt of a ↗ sword whose blade starts at row 12, column 6 (as in Thrust)."""
    g.at(2, 11, guard[0][1])
    g.at(3, 12, guard[0]); g.at(4, 13, guard[1]); g.at(5, 14, guard[2]); g.at(6, 15, guard[3])
    g.at(8, 16, guard[3][0])
    g.at(4, 15, grip[0]); g.at(3, 16, grip[1]); g.at(2, 17, grip[2])
    g.at(1, 18, pommel[0]); g.at(1, 19, pommel[1])


# ---------------------------------------------------------------- class spells
def thrust():
    """A steel sword driven forward: speed lines trail it, a spark bursts at the point."""
    g = G(20, 20)
    px(g, [(6, 7), (9, 2), (12, 13)], '1'); px(g, [(5, 8), (8, 3), (11, 14), (14, 16)], '4')
    px(g, [(4, 9), (7, 4), (10, 15), (13, 17)], '5')
    diag_blade(g, 6, 12, 11)
    g.at(6, 13, 'St'); g.at(15, 3, 'WS'); g.at(16, 3, 'S'); g.at(17, 2, 'W')
    g.at(15, 4, 'S'); g.at(16, 4, 't')
    # a fuller down the middle of the blade
    for i in range(1, 8):
        g.at(7 + i, 12 - i, 's')
    sword_hilt(g)
    # the spark at the point
    g.at(18, 0, '2'); g.at(17, 1, '212'); g.at(18, 2, '2'); g.at(16, 0, '3'); g.at(19, 3, '3')
    return g


def slash():
    """A sword at the end of its swing, a hot crescent trail sweeping behind it."""
    g = G(20, 20)
    arc(g, 4.5, 17.5, 15.4, -98, -12, lambda t: 0.8 + 5.2 * t ** 1.3, 'WOOoopP')
    # the sword, flat along the bottom
    g.at(7, 15, 'WWWWWWWWWS')
    g.at(7, 16, 'SSSSSSSSSSSW')
    g.at(7, 17, 'ttttttttts')
    g.at(10, 16, 'sssss')
    g.at(5, 14, 'YG'); g.at(5, 15, 'GG'); g.at(5, 16, 'Gg'); g.at(5, 17, 'gg'); g.at(5, 18, 'hh')
    g.at(2, 15, 'LmL'); g.at(2, 16, 'lml'); g.at(2, 17, 'mnm')
    g.at(0, 15, 'Y'); g.at(0, 16, 'GG'); g.at(1, 15, 'Y'); g.at(0, 17, 'gg')
    return g


def rend():
    """A serrated knife, its teeth wet: blood runs off them and falls in drops."""
    g = G(20, 20)
    for i in range(9):
        g.at(6 + i, 12 - i, 'WSst')
    g.at(15, 3, 'WS'); g.at(16, 2, 'W')
    g.at(6, 13, 'Sst')
    # teeth along the lower edge, stained
    for x, y in [(17, 4), (15, 6), (13, 8), (11, 10), (9, 12)]:
        g.at(x, y, 'u')
    g.at(16, 4, 'q'); g.at(17, 4, 'Q'); g.at(14, 6, 'q'); g.at(15, 6, 'Q'); g.at(12, 8, 'q'); g.at(13, 8, 'Q')
    # blood running off two teeth, and the drops
    g.at(15, 7, 'r'); g.at(15, 8, 'q')
    g.at(13, 9, 'r'); g.at(13, 10, 'q')
    g.at(15, 10, 'R'); g.at(14, 11, 'Rr'); g.at(14, 12, 'rq'); g.at(14, 13, 'qQ')
    g.at(12, 15, 'R'); g.at(11, 16, 'Rr'); g.at(11, 17, 'rq'); g.at(11, 18, 'qQ')
    sword_hilt(g, guard=('tS', 'ts', 'ts', 'ut'), grip=('Ll', 'lm', 'Ll'), pommel=('st', 'rt'))
    return g


def whirlwind():
    """A teal whirlwind: rings of wind stacked into a swaying funnel, a sword caught in it."""
    g = G(20, 20)
    rings = [
        (1, 2, 'CCCCCccccccccCee', 3, 'ceeeeeeeeeeeEE'),
        (3, 3, 'CCCCcccccccCee', 4, 'ceeeeeeeeeEE'),
        (5, 5, 'CCCccccccCee', 6, 'ceeeeeeeEE'),
        (7, 6, 'CCcccccCee', 7, 'ceeeeeEE'),
        (9, 6, 'CCccccee', 7, 'ceeeEE'),
        (11, 7, 'CCccee', 8, 'ceEE'),
        (13, 7, 'Ccce', 8, 'eE'),
        (15, 8, 'Cce', 9, 'e'),
    ]
    for y, x, light, x2, dark in rings:
        g.at(x, y, light)
        g.at(x2, y + 1, dark)
    g.at(9, 17, 'E')
    # a sword flung round it
    g.at(18, 6, 'W'); g.at(17, 7, 'WS'); g.at(16, 8, 'Wt'); g.at(15, 9, 'St'); g.at(14, 10, 'G'); g.at(15, 11, 'g')
    g.at(13, 11, 'l'); g.at(12, 12, 'Y')
    # gusts
    g.at(0, 6, '67'); g.at(1, 10, '6'); g.at(3, 13, '76'); g.at(15, 14, '67'); g.at(17, 1, '6'); g.at(5, 17, '7'); g.at(13, 18, '6')
    return g


def warcry():
    """A curved war horn with gold bands, its call rolling out in rings."""
    g = G(20, 20)
    # the strap, hanging under the horn
    curve(g, (2.5, 10.5), (4.5, 19.5), (11.5, 12.5), lambda t: 1.3, lambda t, s: 'l' if s < 0 else 'm')
    bands = [(0.0, 0.07), (0.1, 0.15), (0.5, 0.56), (0.86, 0.93)]

    def horn(t, s):
        if any(a <= t <= b for a, b in bands):
            return 'Y' if s < -0.35 else 'G' if s < 0.3 else 'g' if s < 0.75 else 'h'
        return 'B' if s < -0.45 else 'b' if s < 0.15 else 'd' if s < 0.65 else 'D'
    curve(g, (1.5, 9.0), (5.0, 17.5), (12.5, 8.0), lambda t: 1.9 + 5.4 * t ** 1.5, horn)
    # the bell's mouth, facing up-right
    tx, ty = 0.62, -0.78
    for y in range(20):
        for x in range(20):
            dx, dy = x + 0.5 - 12.7, y + 0.5 - 7.8
            u = dx * -ty + dy * tx    # across the mouth
            v = dx * tx + dy * ty     # along the horn
            e = (u / 3.6) ** 2 + (v / 1.5) ** 2
            if e <= 1:
                g.at(x, y, 'n' if e < 0.35 else 'm' if e < 0.6 else ('Y' if u < -1.5 else 'G' if u < 1.2 else 'g'))
    arc(g, 12.7, 7.8, 5.6, -100, 5, lambda t: 1.0, '2', under=True)
    arc(g, 12.7, 7.8, 8.0, -80, 15, lambda t: 1.0, '3', under=True)
    return g


def charge():
    """A purple kite shield thrown forward, wind streaming past it, dust at its heels."""
    g = G(20, 20)
    rows = {
        2: (8, 'tSSSSSSSt'),
        3: (8, 'SVVVVVvvs'),
        4: (8, 'SVvvGvvxs'),
        5: (8, 'SVvGYGvxs'),
        6: (8, 'SVvvGvvxs'),
        7: (8, 'SVvvGvvxs'),
        8: (8, 'SvvvGvxxs'),
        9: (9, 'SvvGvxs'),
        10: (9, 'SvvGxxs'),
        11: (10, 'SvGxs'),
        12: (10, 'SvxXs'),
        13: (11, 'Sxs'),
        14: (11, 'sts'),
        15: (12, 't'),
    }
    for y, (x, s) in rows.items():
        g.at(x, y, s)
    # rivets
    g.at(9, 3, 'W'); g.at(16, 3, 's')
    # wind lines
    g.at(1, 3, '55441'); g.at(0, 6, '554441'); g.at(2, 9, '55441'); g.at(4, 12, '541')
    # dust
    g.at(4, 17, 'dbd'); g.at(3, 18, 'dbbbd'); g.at(7, 18, 'Dd'); g.at(1, 16, 'd'); g.at(0, 18, 'D')
    g.at(12, 17, 'bd'); g.at(11, 18, 'dbbd'); g.at(14, 16, 'd')
    return g


def interrupt():
    """A steel gauntlet punches a spell apart: the orb cracks and its shards fly."""
    g = G(20, 20)
    orb = {
        3: (13, 'CCcce'),
        4: (12, 'CCCccce'),
        5: (11, 'cCWCcccee'),
        6: (11, 'ccCccccee'),
        7: (11, 'cccccceeE'),
        8: (11, 'ccccceeeE'),
        9: (11, 'ecccceeEE'),
        10: (12, 'eeeeeEE'),
        11: (13, 'EEEEE'),
    }
    for y, (x, s) in orb.items():
        g.at(x, y, s)
    for x, y in [(11, 8), (12, 8), (13, 7), (14, 7), (15, 6), (16, 5), (17, 5), (14, 8), (15, 9), (16, 10)]:
        g.at(x, y, 'Z')
    # shards
    g.at(18, 1, 'C'); g.at(19, 2, 'c'); g.at(17, 0, 'e'); g.at(18, 13, 'c'); g.at(19, 14, 'e'); g.at(10, 2, 'C'); g.at(9, 1, 'c')
    # the gauntlet: flared gold cuff, back of the hand, four curled fingers and the thumb
    fist = {
        5: (0, 'Y'),
        6: (0, 'YG.tSSSSs'),
        7: (0, 'GG.SWSSSSWs'),
        8: (0, 'Gg.SSSsssst'),
        9: (0, 'Gg.SSSSSSWs'),
        10: (0, 'Gg.SsWWWWst'),
        11: (0, 'Gg.SsSSSSWs'),
        12: (0, 'gh.ssstttst'),
        13: (0, 'gh.ssSSSWs'),
        14: (0, 'hh.tttssst'),
        15: (0, 'h..uuttu'),
    }
    for y, (x, s) in fist.items():
        g.at(x, y, s)
    g.at(2, 7, 'S'); g.at(2, 8, 's'); g.at(2, 9, 's'); g.at(2, 10, 's'); g.at(2, 11, 't'); g.at(2, 12, 't'); g.at(2, 13, 't')
    # the hit
    g.at(10, 4, '1'); g.at(11, 3, '6'); g.at(11, 12, '1'); g.at(12, 13, '6'); g.at(9, 1, '7'); g.at(10, 2, '6')
    g.at(18, 1, '6'); g.at(19, 2, '7'); g.at(18, 13, '6'); g.at(19, 14, '7')
    return g


def mortal():
    """A great sword driven through a heart: it is cracked and bleeding."""
    g = G(20, 20)
    heart = [
        '..rRr...rrq..',
        '.rRWRr.rrrrq.',
        'rRRRrrrrrrrqq',
        'rRRrrrrrrrrqq',
        'rRrrrrrrrrqqq',
        '.rrrrrrrrqqq.',
        '..rrrrrrqqQ..',
        '...qrrrqqQ...',
        '....qrqqQ....',
        '.....qqQ.....',
        '......Q......',
    ]
    for i, row in enumerate(heart):
        g.at(1, 4 + i, row)
    for x, y in [(8, 6), (7, 7), (8, 8), (7, 9), (8, 10)]:
        g.at(x, y, 'Q')
    # the sword, point down-left
    for y in range(5, 15):
        g.at(16 - y, y, 'WSt')
    g.at(1, 15, 'W'); g.at(2, 15, 'S')
    g.at(11, 2, 'Y'); g.at(12, 3, 'GY'); g.at(13, 4, 'gG'); g.at(14, 5, 'hg'); g.at(15, 6, 'h')
    g.at(14, 3, 'Ll'); g.at(15, 2, 'lm'); g.at(16, 1, 'Ll'); g.at(17, 0, 'YG'); g.at(18, 1, 'g')
    # drops
    g.at(4, 16, 'R'); g.at(4, 17, 'r'); g.at(4, 18, 'q'); g.at(8, 17, 'r'); g.at(8, 18, 'q')
    return g


def mount():
    """A bay horse's head with a white blaze, in a gold-studded bridle, mane flying."""
    g = G(20, 20)
    head = {
        0: (8, 'mL.m'),
        1: (7, 'nmLlmL'),
        2: (6, 'nmLFLLl'),
        3: (5, 'nnmLFLLLl'),
        4: (4, 'nnmLLZFLLl'),
        5: (4, 'nmLLLLLFBLl'),
        6: (3, 'nnmLLLLLLFBLl'),
        7: (3, 'nmLFFLLLLLLBLl'),
        8: (2, 'nnmLFLLLLLLLLBLl'),
        9: (2, 'nmLLLLLlLLLLLLBLl'),
        10: (2, 'nmLLLLlllLLLLLlnl'),
        11: (1, 'nnmLLLLlllllLLlllm'),
        12: (1, 'nmLLLLLll...mmmmm'),
        13: (1, 'nmLLLLll......mm'),
        14: (1, 'nmLLLLll'),
        15: (0, 'nnmLLLll'),
        16: (0, 'nmLLLll'),
        17: (0, 'nmLLlll'),
        18: (0, 'nmLlll'),
        19: (0, 'nmlll'),
    }
    for y, (x, s) in head.items():
        g.at(x, y, s)
    # mane strands
    for x, y in [(3, 4), (2, 6), (1, 8), (1, 10), (0, 12), (0, 14)]:
        g.at(x, y, 'n')
    # bridle: brow band, cheek strap, a gold rosette, the bit and reins
    g.at(9, 3, 'mm')
    for x, y in [(8, 5), (8, 6), (8, 7), (8, 8)]:
        g.at(x, y, 'm')
    g.at(9, 9, 'mmmmmm'); g.at(8, 9, 'G'); g.at(15, 10, 'G')
    g.at(14, 11, 'm'); g.at(13, 12, 'm'); g.at(12, 13, 'm'); g.at(11, 14, 'm'); g.at(10, 15, 'm')
    g.at(9, 4, 'Z')
    return g


# ---------------------------------------------------------------- talent abilities
def sunder():
    """A steel breastplate split by a blow, chips breaking away."""
    g = G(20, 20)
    plate = {
        2: (3, 'SWSs......sstt'),
        3: (2, 'SWSSss....sstttu'),
        4: (2, 'SWSSSss..ssttttu'),
        5: (2, 'SWSSSSsWssttttuu'),
        6: (3, 'SSSSSsWssttttu'),
        7: (4, 'SSSssWsstttu'),
        8: (4, 'SSsssWsstttu'),
        9: (4, 'SsssSWssttuu'),
        10: (4, 'SsssSWsstttu'),
        11: (4, 'sssstWsstttu'),
        12: (3, 'Sssssttssttuuu'),
        13: (3, 'YGGGGGGGGggghh'),
        14: (3, 'ssssssttttttuu'),
        15: (4, 'sttttttttuuu'),
    }
    for y, (x, s) in plate.items():
        g.at(x, y, s)
    # the split
    for x, y in [(12, 4), (12, 5), (11, 6), (12, 7), (11, 8), (11, 9), (10, 10), (11, 11), (10, 12), (10, 13), (9, 14), (9, 15)]:
        g.at(x, y, 'Z')
    for x, y in [(13, 5), (12, 6), (13, 7), (12, 8), (12, 9), (11, 10), (12, 11), (11, 12)]:
        g.at(x, y, 'u')
    # chips flying off
    g.at(15, 0, 'S'); g.at(17, 1, 's'); g.at(18, 3, 't'); g.at(13, 1, 'W'); g.at(17, 17, 's'); g.at(14, 18, 't')
    # rivets
    g.at(4, 4, 't'); g.at(15, 4, 'u')
    return g


def deathblow():
    """A dark great sword, its edge glowing red, crossing a deep red X of a cut."""
    g = G(20, 20)
    # the red cut, ↘, thickest in the middle
    curve(g, (1.0, 1.0), (10.0, 10.0), (19.0, 19.0), lambda t: 0.9 + 4.4 * math.sin(math.pi * t),
          lambda t, s: '1' if abs(s) < 0.2 and 0.3 < t < 0.7 else '0' if abs(s) < 0.4 else '*' if abs(s) < 0.75 else '+')
    # the blade ↗, dark steel with a red edge
    for i in range(11):
        g.at(5 + i, 13 - i, 'rtu')
    g.at(16, 2, 'R'); g.at(15, 2, 'r'); g.at(17, 1, 'R')
    for i in range(1, 10, 3):
        g.at(6 + i, 13 - i, 'R')
    sword_hilt(g, guard=('GY', 'gG', 'gG', 'hg'), grip=('zZ', 'Zz', 'zZ'), pommel=('rq', 'qQ'))
    g.at(6, 13, 'tu')
    return g


def bloodrage():
    """A drop of blood set burning: the price paid in health, turned to mana (blue sparks)."""
    g = G(20, 20)
    rows = {
        1: (9, 'p'),
        2: (8, 'opo'),
        3: (8, 'pRp'),
        4: (7, 'prRrp'),
        5: (7, 'rRrrq'),
        6: (6, 'rRRrrqq'),
        7: (5, 'rRWRrrqq'),
        8: (5, 'rRRrrrqq'),
        9: (4, 'rRRrrrrqqQ'),
        10: (4, 'rRrrrrrqqQ'),
        11: (4, 'rrrrrrqqqQ'),
        12: (4, 'rrrrrqqqQQ'),
        13: (5, 'qrrqqqqQ'),
        14: (5, 'qqqqqQQQ'),
        15: (6, 'QqQQQQ'),
    }
    for y, (x, s) in rows.items():
        g.at(x, y, s)
    # flames licking up its sides
    g.at(3, 7, 'o'); g.at(3, 8, 'po'); g.at(2, 10, 'p'); g.at(3, 11, 'p'); g.at(15, 8, 'o'); g.at(15, 9, 'p'); g.at(16, 6, 'o')
    g.at(4, 5, 'O'); g.at(14, 4, 'O'); g.at(12, 2, 'o'); g.at(6, 2, 'p')
    # mana sparks
    g.at(16, 11, '5'); g.at(16, 12, '4'); g.at(14, 13, '54145'); g.at(16, 14, '4'); g.at(16, 15, '5')
    g.at(13, 16, '5'); g.at(12, 17, '545'); g.at(13, 18, '5')
    g.at(17, 17, '4'); g.at(3, 15, '5'); g.at(2, 14, '4')
    return g


def berserk():
    """A horned helm, eyes burning, wreathed in fire."""
    g = G(20, 20)
    # flames behind
    flames = {
        0: (9, 'o'),
        1: (5, 'o...op'),
        2: (4, 'ooo.opo...o'),
        3: (4, 'popoopoo.op'),
        4: (5, 'pppppppoop'),
    }
    for y, (x, s) in flames.items():
        g.at(x, y, s)
    g.at(3, 12, 'o'); g.at(2, 13, 'op'); g.at(16, 12, 'o'); g.at(16, 13, 'po'); g.at(3, 16, 'p'); g.at(16, 16, 'p')
    # horns
    g.at(1, 2, 'B'); g.at(1, 3, 'Bb'); g.at(1, 4, 'bb'); g.at(1, 5, 'bd'); g.at(2, 6, 'bd'); g.at(2, 7, 'dbd'); g.at(3, 8, 'dD')
    g.at(18, 2, 'B'); g.at(17, 3, 'bB'); g.at(17, 4, 'bd'); g.at(17, 5, 'dD'); g.at(16, 6, 'dD'); g.at(15, 7, 'dbD'); g.at(15, 8, 'dD')
    # helm
    rows = {
        5: (7, 'WSSSss'),
        6: (6, 'WSSSssst'),
        7: (5, 'WSSSsssstt'),
        8: (5, 'SSSssssttt'),
        9: (5, 'GGgGGgGGgh'),
        10: (5, 'sssssssttu'),
        11: (5, 'ssZZsZZttu'),
        12: (5, 'stZrZZrZtu'),
        13: (5, 'sttZZZZttu'),
        14: (6, 'stt.tttu'),
        15: (6, 'stt.ttu'),
        16: (6, 'ttu.ttu'),
        17: (7, 'uu.uu'),
    }
    for y, (x, s) in rows.items():
        g.at(x, y, s)
    g.at(9, 14, 't'); g.at(9, 15, 'u'); g.at(9, 16, 'u'); g.at(9, 17, 'u')
    g.at(7, 12, 'R'); g.at(11, 12, 'O'); g.at(8, 12, 'r'); g.at(12, 12, 'r')
    return g


def shieldbash():
    """A round shield slammed into something: iron rim, boss, and a white-hot impact star."""
    g = G(20, 20)
    rows = {
        3: (4, 'tsssst'),
        4: (2, 'tsSLLLLst'),
        5: (1, 'tSLLlLLlLs'),
        6: (1, 'sLLLlLLlLls'),
        7: (0, 'tSLLLlLLlLlt'),
        8: (0, 'sLLLLlSWlLls'),
        9: (0, 'sLLLLSWSslls'),
        10: (0, 'sLLLLsSstlls'),
        11: (0, 'tLLLLlttlllt'),
        12: (1, 'sLLLlLllmls'),
        13: (1, 'tLlllllmlmt'),
        14: (2, 'tlllmlmmt'),
        15: (3, 'utttttu'),
    }
    for y, (x, s) in rows.items():
        g.at(x, y, s)
    g.at(3, 5, 'S'); g.at(2, 8, 'W'); g.at(9, 12, 'W'); g.at(4, 14, 'S')
    # impact star
    g.at(16, 3, '3'); g.at(16, 4, '2'); g.at(13, 5, '3.2.3'); g.at(14, 6, '212'); g.at(12, 7, '3221122')
    g.at(14, 8, '212'); g.at(13, 9, '3.2.3'); g.at(16, 10, '2'); g.at(16, 11, '3'); g.at(19, 7, '3')
    # motion lines
    g.at(1, 17, '41'); g.at(4, 18, '541'); g.at(9, 17, '51')
    return g


def laststand():
    """A battered kite shield with a heart on it, glowing green, holding."""
    g = G(20, 20)
    rows = {
        1: (4, '8.8...8.8'),
        2: (3, '8SSSSSSSSS8'),
        3: (3, 'SWSSSSSSsst'),
        4: (3, 'SSsssssssst'),
        5: (3, 'SsRr.sRrsst'),
        6: (3, 'SsRRrrRrqst'),
        7: (3, 'SsRrrrrrqst'),
        8: (3, 'Ssrrrrrrqst'),
        9: (4, 'Ssrrrrqqst'),
        10: (4, 'Sssqrqqsst'),
        11: (5, 'SssqQsstt'),
        12: (5, 'Ssss.sstt'),
        13: (6, 'Sssstt'),
        14: (7, 'Sstt'),
        15: (8, 'st'),
    }
    for y, (x, s) in rows.items():
        g.at(x, y, s)
    g.at(8, 5, 's'); g.at(8, 12, 't')
    # a dent and scratch
    g.at(12, 9, 'u'); g.at(13, 10, 't'); g.at(5, 12, 't')
    # the glow
    for x, y in [(1, 4), (1, 8), (2, 11), (17, 4), (17, 8), (16, 11), (4, 15), (14, 15), (9, 17)]:
        g.at(x, y, '8')
    for x, y in [(0, 6), (18, 6), (6, 17), (12, 17), (2, 14), (16, 14), (1, 2), (17, 2)]:
        g.at(x, y, '9')
    g.at(9, 0, '9'); g.at(9, 19, '8')
    return g


def secondwind():
    """A green gust curling round a small heart: health back with every kill."""
    g = G(20, 20)
    arc(g, 10, 10, 9, -200, 10, lambda t: 0.6 + 2.6 * t, 'KkkjJ')
    arc(g, 10, 10, 5.4, 60, 330, lambda t: 0.5 + 1.8 * t, 'Kkj')
    g.at(8, 8, 'rR.Rr'.replace('.', 'r')); g.at(8, 9, 'rRrrq'); g.at(9, 10, 'rrq'); g.at(10, 11, 'q')
    g.at(8, 8, 'R')
    # leaves
    g.at(17, 15, 'kj'); g.at(16, 16, 'kJ'); g.at(2, 3, 'Kk'); g.at(3, 4, 'j')
    return g


# ---------------------------------------------------------------- the archer's spells
HEADS = {'steel': 'WSst', 'gold': 'YGgh', 'blood': 'Rrqq', 'teal': 'Ccee', 'purple': 'Vvxx', 'green': 'Kkjj'}


def arrow(g, x0, y0, n, head='steel', fletch='Bbd', shaft='Ll', blunt=False):
    """A ↗ arrow: fletching at the tail (x0, y0), n pixels of two-tone wooden shaft, a head at
    the top-right (lit tip, darker barbs). `blunt` gives a round knob instead of a point."""
    W, S, s_, t = HEADS[head]
    for i in range(n):
        g.at(x0 + i, y0 - i, shaft)
    tx, ty = x0 + n, y0 - n
    if blunt:
        g.at(tx, ty - 1, W + S); g.at(tx, ty, S + s_); g.at(tx + 1, ty + 1, t)
        g.at(tx - 1, ty, S); g.at(tx + 1, ty - 1, s_)
    else:
        # the point, and a barb either side of the shaft
        g.at(tx, ty, S + s_)
        g.at(tx + 1, ty - 1, W + S)
        g.at(tx + 2, ty - 2, W)
        g.at(tx - 1, ty - 1, s_); g.at(tx, ty - 2, S)
        g.at(tx + 1, ty + 1, t); g.at(tx + 2, ty, s_)
    # fletching: three feather pixels either side of the tail
    F, f, d = fletch
    g.at(x0 - 1, y0 - 1, F); g.at(x0 - 2, y0, F + f); g.at(x0 - 3, y0 + 1, f)
    g.at(x0 + 1, y0 + 1, F); g.at(x0, y0 + 2, f + d); g.at(x0 - 1, y0 + 3, d)


def quickshot():
    """An arrow loosed fast: speed lines streaming behind it, a spark ahead of the point."""
    g = G(20, 20)
    px(g, [(3, 9), (6, 5), (10, 2)], '4'); px(g, [(2, 10), (5, 6), (9, 3), (12, 15), (15, 12)], '5')
    px(g, [(11, 16), (14, 13), (16, 10)], '4')
    arrow(g, 4, 15, 10)
    g.at(17, 1, '2'); g.at(18, 0, '1'); g.at(18, 2, '3'); g.at(16, 0, '3')
    return g


def aimedshot():
    """An arrow and the gold ring of the archer's aim settled on its point."""
    g = G(20, 20)
    arrow(g, 3, 16, 9)
    # a thin aiming ring around the point, with four ticks just outside it
    arc(g, 14.0, 6.0, 5.0, -180, 180, lambda t: 0.9, 'G', under=True)
    for x, y, ch in ((14, 0, 'Y'), (14, 11, 'g'), (8, 6, 'Y'), (19, 6, 'g')):
        g.at(x, y, ch)
    g.at(16, 3, '2')
    return g


def barbed():
    """A barbed broadhead, its hooks wet: blood running off and falling in drops."""
    g = G(20, 20)
    arrow(g, 3, 16, 9, head='steel')
    # extra hooks along the head
    g.at(11, 6, 'u'); g.at(14, 9, 'u'); g.at(12, 5, 't')
    g.at(13, 8, 'q'); g.at(14, 10, 'r'); g.at(14, 11, 'q')
    g.at(16, 9, 'R'); g.at(15, 10, 'Rr'); g.at(15, 11, 'rq'); g.at(15, 12, 'qQ')
    g.at(12, 13, 'R'); g.at(12, 14, 'r'); g.at(12, 15, 'Q')
    return g


def concussive():
    """A blunt-headed arrow striking: two thin purple shock rings spreading past the knob."""
    g = G(20, 20)
    arrow(g, 2, 17, 10, head='purple', blunt=True)
    # two short shock arcs ahead of the knob, a gap between them
    arc(g, 13.0, 5.0, 3.4, -95, 5, lambda t: 0.9, 'v', under=True)
    arc(g, 13.0, 5.0, 5.8, -85, -5, lambda t: 0.9, 'x', under=True)
    px(g, [(19, 1), (19, 6), (14, 0)], '1')
    return g


def mark():
    """The hunter's mark: a gold chevron sigil over a red ring, glowing."""
    g = G(20, 20)
    arc(g, 10.0, 10.0, 8.2, -180, 180, lambda t: 1.4, 'rq', under=True)
    # the sigil: a pointed chevron and a dot, like a claw's track
    rows = [
        (4, 9, 'Y'),
        (5, 8, 'YGg'),
        (6, 7, 'YG.Gg'),
        (7, 6, 'YG...Gg'),
        (8, 5, 'YG.....Gg'),
        (9, 5, 'Gg.....gh'),
        (10, 9, 'Y'),
        (11, 8, 'YGg'),
        (12, 7, 'YG.Gg'),
        (13, 6, 'YG...Gg'),
        (14, 6, 'Gg...gh'),
    ]
    for y, x, r in rows:
        g.at(x, y, r)
    px(g, [(10, 2), (2, 10), (17, 10), (10, 17)], '2')
    return g


def volley():
    """Arrows raining down: three falling ↘ out of streaks of motion."""
    g = G(20, 20)
    for (x, y) in ((2, 1), (8, 0), (13, 3)):
        # a falling arrow: head at the bottom-right
        for i in range(6):
            g.at(x + i, y + i, 'Ll')
        hx, hy = x + 6, y + 6
        g.at(hx, hy, 'Ss'); g.at(hx + 1, hy + 1, 'WS'); g.at(hx + 2, hy + 2, 'W')
        g.at(hx - 1, hy + 1, 's'); g.at(hx + 1, hy - 1, 't')
        g.at(x - 1, y - 1, 'B'); g.at(x - 1, y, 'b'); g.at(x, y - 1, 'b')
    px(g, [(1, 6), (3, 9), (7, 7), (9, 11), (12, 12), (15, 14)], '6'); px(g, [(0, 4), (6, 9), (11, 15), (17, 17)], '7')
    # the ground they strike
    g.at(4, 18, 'dDDdDDDdDDDdDDd')
    return g


def silence():
    """An arrow through a teal ring of sound, the ring broken where it passes."""
    g = G(20, 20)
    arc(g, 10.0, 10.0, 6.5, -160, -60, lambda t: 1.6, 'ce', under=True)
    arc(g, 10.0, 10.0, 6.5, 20, 120, lambda t: 1.6, 'ce', under=True)
    arc(g, 10.0, 10.0, 8.8, -150, -70, lambda t: 1.0, '6', under=True)
    arc(g, 10.0, 10.0, 8.8, 30, 110, lambda t: 1.0, '7', under=True)
    arrow(g, 3, 16, 10, head='teal')
    return g


def killshot():
    """An arrow and a crimson crosshair on its point: the finishing shot."""
    g = G(20, 20)
    arrow(g, 2, 17, 10)
    for x, y in ((14, 0), (14, 1), (14, 9), (14, 10), (9, 5), (10, 5), (18, 5), (19, 5)):
        g.at(x, y, 'r')
    arc(g, 14.5, 5.5, 3.6, -180, 180, lambda t: 1.0, 'q', under=True)
    g.at(16, 4, '0'); g.at(17, 3, '*'); g.at(15, 2, '+')
    return g


def pierce():
    """A heavy gold arrow passing clean through two targets in a line."""
    g = G(20, 20)
    for cx, cy in ((7.5, 12.5), (13.0, 7.0)):
        arc(g, cx, cy, 3.0, -180, 180, lambda t: 1.4, 'rq', under=True)
        g.at(int(cx - 0.5), int(cy - 0.5), 'B')
    arrow(g, 1, 18, 14, head='gold')
    px(g, [(4, 12), (10, 6), (17, 2)], '2')
    return g


def rapidfire():
    """Three arrows loosed one after another, each a little ahead of the last."""
    g = G(20, 20)
    arrow(g, 4, 8, 6)
    arrow(g, 6, 13, 7)
    arrow(g, 8, 18, 7)
    px(g, [(1, 9), (3, 14), (5, 18)], '4')
    return g


def deadeye():
    """An eye with a crimson iris and a crosshair for a pupil."""
    g = G(20, 20)
    for y in range(20):
        for x in range(20):
            dx, dy = (x + 0.5 - 10) / 9.0, (y + 0.5 - 10) / 5.2
            e = dx * dx + dy * dy
            if e <= 1:
                g.at(x, y, 'B' if e > 0.7 and y < 10 else 'b' if e > 0.7 else 'B')
    arc(g, 10.0, 10.0, 3.9, -180, 180, lambda t: 2.4, 'rqQ')
    g.at(9, 9, 'ZZ'); g.at(9, 10, 'ZZ')
    for x, y in ((10, 4), (10, 15), (4, 10), (15, 10)):
        g.at(x, y, 'q')
    g.at(7, 7, 'W')
    # lids
    for x in range(3, 17):
        g.at(x, 4 if 5 <= x <= 14 else 5, 'n')
    px(g, [(2, 9), (17, 9)], '0')
    return g


def beartrap():
    """Iron jaws sprung open, a ring of teeth, a gold trigger plate in the middle."""
    g = G(20, 20)
    arc(g, 10.0, 12.0, 7.6, -180, 0, lambda t: 1.8, 'Sst')
    arc(g, 10.0, 12.0, 7.6, 0, 180, lambda t: 1.8, 'stu')
    # teeth pointing in
    for a in range(0, 360, 30):
        r = math.radians(a)
        x, y = round(10 + 5.4 * math.cos(r) - 0.5), round(12 + 5.4 * math.sin(r) - 0.5)
        g.at(x, y, 'W' if y < 12 else 't')
    g.at(9, 11, 'YG'); g.at(9, 12, 'Gg')
    # the chain and stake
    g.at(17, 3, 'u'); g.at(16, 4, 't'); g.at(15, 5, 'u'); g.at(14, 6, 't'); g.at(18, 2, 'Ll'); g.at(19, 1, 'm')
    return g


def predator():
    """A beast's eye, slit-pupilled and burning orange, three claw marks raked across below."""
    g = G(20, 20)
    for y in range(20):
        for x in range(20):
            dx, dy = (x + 0.5 - 10.5) / 7.0, (y + 0.5 - 6.5) / 3.4
            e = dx * dx + dy * dy
            if e <= 1:
                g.at(x, y, 'O' if e < 0.3 else 'o' if e < 0.65 else 'p')
    for y in range(4, 10):
        g.at(10, y, 'Z')
    g.at(10, 3, 'z'); g.at(10, 9, 'z')
    # the brow
    for x in range(4, 18):
        g.at(x, 2 if 7 <= x <= 14 else 3, 'P')
    # three claw marks raked across the lower half, top-left to bottom-right
    for x0 in (3, 8, 13):
        for i in range(6):
            g.at(x0 + i // 2, 12 + i, 'rq' if i < 4 else 'qQ')
    px(g, [(2, 7), (18, 7), (17, 1)], '3')
    return g


def disengage():
    """A swift green leap backwards: an arc of motion curling back, the dust kicked up."""
    g = G(20, 20)
    curve(g, (15.5, 15.5), (12.0, 1.0), (3.5, 8.0), lambda t: 1.0 + 3.6 * t, lambda t, s: 'K' if s < -0.3 else 'k' if s < 0.3 else 'j')
    # the arrowhead at the end of the leap, pointing back
    g.at(1, 7, 'K'); g.at(1, 8, 'kK'); g.at(2, 9, 'kj'); g.at(2, 6, 'k'); g.at(3, 11, 'j')
    g.at(13, 17, 'dDd'); g.at(15, 18, 'Dd'); g.at(17, 17, 'd')
    px(g, [(18, 14), (12, 15), (16, 12)], '9')
    return g


def camouflage():
    """A pointed hood fading into the leaves, two eyes glowing in its shadow."""
    g = G(20, 20)
    # the hood: a rounded triangle, lit on the left
    for y in range(2, 19):
        half = min(7.0, 1.0 + (y - 2) * 0.62)
        for x in range(20):
            if abs(x + 0.5 - 10) <= half:
                g.at(x, y, 'j' if x < 9 else 'J')
    # the face in shadow
    for y in range(9, 17):
        for x in range(6, 15):
            if ((x + 0.5 - 10) / 3.5) ** 2 + ((y + 0.5 - 12.5) / 3.6) ** 2 <= 1:
                g.at(x, y, 'Z')
    g.at(8, 11, '9'); g.at(12, 11, '9')
    # leaves over and around the hood
    for x, y, r in ((2, 6, 'kj'), (1, 7, 'Kkj'), (3, 8, 'j'), (15, 5, 'jkK'), (16, 6, 'kK'), (2, 15, 'Kkj'), (3, 16, 'kj'),
                    (15, 15, 'jkK'), (16, 16, 'kj'), (9, 1, 'Kk'), (10, 2, 'k')):
        g.at(x, y, r)
    px(g, [(0, 11), (19, 10), (5, 1)], '8')
    return g

# ---------------------------------------------------------------- the sorceress's spells
# Fire is orange and red (O o p P, r q), frost pale blue (A a i I, glow ~ 4), arcane violet
# (V v x X, glow % &).
def blob(g, cx, cy, rx, ry, shade):
    """An ellipse: `shade(nx, ny, e)` gives the letter at normalised offset (nx, ny), e = nx² + ny²."""
    for y in range(20):
        for x in range(20):
            nx, ny = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            e = nx * nx + ny * ny
            if e <= 1:
                ch = shade(nx, ny, e)
                if ch:
                    g.at(x, y, ch)


def fireball(nx, ny, e):
    """Shading for a ball of fire lit from the top-left: white-hot heart, red-brown rim."""
    k = e + 0.35 * (nx + ny)
    return 'O' if k < 0.12 else 'o' if k < 0.5 else 'p' if k < 0.95 else 'P'


def spark():
    """A small spark crackling: a white-gold star, jagged little arcs jumping off it."""
    g = G(20, 20)
    g.at(10, 6, 'Y'); g.at(10, 7, 'Y'); g.at(9, 8, 'YWG'); g.at(7, 9, 'YYWWWGg'); g.at(9, 10, 'GGg')
    g.at(10, 11, 'g'); g.at(10, 12, 'g')
    # crackles
    px(g, [(13, 6), (14, 5), (15, 5), (16, 3)], '2'); px(g, [(17, 2)], '1')
    px(g, [(5, 8), (4, 10), (3, 10)], '2'); px(g, [(2, 9)], '1')
    px(g, [(12, 12), (13, 14), (14, 14), (14, 15)], '2'); px(g, [(15, 16)], '1')
    px(g, [(7, 12), (6, 14)], '3'); px(g, [(5, 15)], '2')
    px(g, [(8, 4), (7, 3)], '3'); px(g, [(12, 3), (4, 5), (16, 10), (3, 15), (11, 17)], '3')
    return g


def firebolt():
    """A bolt of fire streaking up and to the right, its tail of flame streaming ragged behind it."""
    g = G(20, 20)
    curve(g, (1.0, 19.0), (6.5, 13.5), (12.5, 7.5), lambda t: 0.6 + 4.6 * t ** 1.3,
          lambda t, s: 'P' if s > 0.55 else 'p' if (s > 0.1 or s < -0.6 or t < 0.3) else 'o' if t < 0.75 or s < -0.25 else 'O')
    blob(g, 14.2, 5.8, 3.8, 3.8, fireball)
    g.at(13, 4, 'W')
    # licks of flame torn off the tail's edges
    g.at(6, 11, 'p'); g.at(7, 10, 'o'); g.at(10, 8, 'o'); g.at(4, 14, 'p'); g.at(9, 15, 'P'); g.at(12, 12, 'P'); g.at(12, 11, 'p')
    px(g, [(18, 2), (11, 2), (19, 6), (16, 11)], '2'); px(g, [(5, 9), (13, 14), (2, 15), (17, 0), (8, 17)], '3')
    return g


def ignite():
    """A flame catching on the embers: a red tongue of fire rising, sparks going up."""
    g = G(20, 20)
    rows = {
        3: (10, 'r'),
        4: (9, 'rr'),
        5: (9, 'rRr'),
        6: (8, 'rRpr'),
        7: (7, 'r.Rpr.r'),
        8: (6, 'rr.Ropqrq'),
        9: (6, 'rRrRoopq'),
        10: (6, 'rRpoOopqq'),
        11: (5, 'qrRpoOOopq'),
        12: (5, 'qrRpoOOOpqq'),
        13: (5, 'qrRpoOOopqq'),
        14: (6, 'qrppoopqq'),
        15: (6, 'Qqrrrrqq'),
    }
    for y, (x, r) in rows.items():
        g.at(x, y, r)
    # the embers it caught on
    g.at(3, 16, 'PPQPPpPQPPPPQ'); g.at(2, 17, 'QPQQPQPPQQPQPQ'); g.at(3, 18, 'QQZQQZQQQZQ')
    g.at(5, 16, 'o'); g.at(10, 17, 'o'); g.at(14, 16, 'o'); g.at(7, 17, 'p')
    px(g, [(14, 5), (4, 6), (12, 1), (15, 9)], '3'); px(g, [(6, 3), (16, 3), (3, 11)], '2')
    return g


def frostbolt():
    """A shard of ice flying up to the right: faceted, sharp at the nose, a trail of frost and
    splinters behind it."""
    g = G(20, 20)
    curve(g, (4.0, 16.0), (10.0, 10.0), (18.0, 2.0),
          lambda t: 0.6 + 4.4 * (t / 0.7 if t < 0.7 else (1 - t) / 0.3),
          lambda t, s: 'W' if -0.2 < s < 0.15 and 0.3 < t < 0.9 else 'A' if s < -0.45 else 'a' if s < 0.15 else 'i' if s < 0.6 else 'I')
    # splinters trailing it
    g.at(3, 12, 'Aa'); g.at(3, 13, 'i')
    # streaks of cold air
    px(g, [(5, 10), (2, 15), (1, 9)], '4'); px(g, [(6, 9), (3, 16), (10, 17), (11, 16)], '~'); px(g, [(4, 11), (12, 15)], '5')
    px(g, [(12, 2), (18, 9), (15, 1)], '1')
    return g


def star_burst(g, cx, cy, R, r2, lit, mid, dark):
    """A four-pointed star (an astroid) of radius R, and a smaller one turned 45° of radius r2."""
    for y in range(20):
        for x in range(20):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            ax, ay = abs(dx), abs(dy)
            u, v = abs(dx + dy) / 1.414, abs(dx - dy) / 1.414
            if (ax ** 0.42 + ay ** 0.42) <= R ** 0.42 or (u ** 0.42 + v ** 0.42) <= r2 ** 0.42:
                g.at(x, y, lit if dx + dy < -0.5 else mid if dx + dy < 1.5 else dark)


def arcanepower():
    """A violet star of power bursting, white at its heart, motes of light thrown round it."""
    g = G(20, 20)
    arc(g, 10.0, 10.0, 6.6, -180, 180, lambda t: 1.0, '&', under=True)
    star = [
        '....................',
        '.........v..........',
        '.........vx.........',
        '.........vx.........',
        '...v.....Vx.....x...',
        '....v....Vx....x....',
        '.....v..vVxx..x.....',
        '......vvvVxxxx......',
        '......vVVVVxxx......',
        '.vvvvvvVVWWVvvvvvvv.',
        '.xxxxxxxVWWVxxxxxxX.',
        '......vxxVxxxX......',
        '......xxxVxxXX......',
        '.....x..xVxX..X.....',
        '....x....xX....X....',
        '...x.....xX.....X...',
        '.........xX.........',
        '.........xX.........',
        '.........X..........',
    ]
    for y, r in enumerate(star):
        g.at(0, y, r)
    for x, y in ((3, 2), (16, 2), (2, 16), (17, 17)):
        g.at(x, y, '%')
    px(g, [(1, 6), (18, 13), (6, 18), (13, 1)], '&')
    return g


def tongue(g, x, y, h, lean=0):
    """A small tongue of flame standing on (x, y), h pixels tall: yellow heart, red edge."""
    for i in range(h):
        w = max(1, round((h - i) * 2.6 / h))
        xx = x + round(lean * i / h) - w // 2
        g.at(xx, y - i, ('p' + 'o' * (w - 2) + 'P') if w > 2 else 'po'[:w] if i < h - 1 else 'p')


def flamestrike():
    """A pillar of fire driven down from the sky onto the ground, flames bursting up where it lands."""
    g = G(20, 20)
    for y in range(0, 16):
        left = 2.0 + y * 0.14 + 0.7 * math.sin(y * 1.9)
        right = 2.0 + y * 0.14 + 0.7 * math.sin(y * 1.4 + 1.2)
        for x in range(20):
            dx = x + 0.5 - 10.0
            d = dx / (left if dx < 0 else right)
            if -1 <= d <= 1:
                g.at(x, y, 'O' if abs(d + 0.1) < 0.3 else 'o' if -0.8 < d < 0.55 else 'p' if d < 0.85 else 'P')
    # flames licking off its sides, streaks of it still falling
    g.at(6, 7, 'o'); g.at(5, 6, 'p'); g.at(14, 10, 'p'); g.at(15, 9, 'P'); g.at(5, 12, 'p')
    g.at(5, 0, 'p'); g.at(5, 1, 'p'); g.at(15, 1, 'P'); g.at(15, 2, 'p'); g.at(4, 4, 'o')
    # the flames it lights where it lands, and the burned ground
    tongue(g, 4, 16, 5, -1); tongue(g, 7, 16, 3); tongue(g, 13, 16, 3); tongue(g, 16, 16, 5, 1)
    g.at(2, 16, 'pooOOOOOOOOOoop'); g.at(1, 17, 'PPpppppppppppppPP'); g.at(2, 18, 'QZZZZZZZZZZZZZQ')
    px(g, [(2, 9), (17, 8), (18, 13), (1, 13)], '3'); px(g, [(3, 6), (16, 5)], '2')
    return g


def counterspell():
    """A violet rune in its ring, struck through and broken apart, the pieces flying."""
    g = G(20, 20)
    arc(g, 10.0, 10.0, 8.6, -175, -40, lambda t: 1.6, 'vX')
    arc(g, 10.0, 10.0, 8.6, 5, 140, lambda t: 1.6, 'vX')
    # the rune: a stave with two arms up and one down (old marks)
    for y in range(4, 16):
        g.at(9, y, 'Vx')
    g.at(6, 5, 'V'); g.at(7, 6, 'V'); g.at(8, 7, 'v')
    g.at(13, 5, 'x'); g.at(12, 6, 'x'); g.at(11, 7, 'x')
    g.at(11, 12, 'v'); g.at(12, 13, 'x'); g.at(13, 14, 'x')
    # the break: a white crack across it, the gap open
    for x, y in ((15, 3), (14, 4), (13, 6), (12, 7), (11, 8), (10, 9), (9, 10), (8, 11), (7, 12), (6, 14), (5, 15)):
        g.at(x, y, '1')
    for x, y in ((16, 3), (14, 5), (12, 8), (10, 10), (8, 12), (6, 15)):
        g.at(x, y, '%')
    px(g, [(18, 2), (2, 18), (19, 0)], '&'); px(g, [(17, 1), (1, 17)], '%')
    return g


def incinerate():
    """A skull wreathed in fire, its eye sockets burning."""
    g = G(20, 20)
    # flames behind and above
    flames = {
        0: (9, 'o'),
        1: (5, 'o..ro.o'),
        2: (4, 'rp.rop.or'),
        3: (3, 'rpprpoprppr'),
        4: (3, 'rpooppopoopr'),
        5: (2, 'rppoppppppopr'),
    }
    for y, (x, r) in flames.items():
        g.at(x, y, r)
    g.at(2, 8, 'r'); g.at(1, 9, 'rp'); g.at(1, 10, 'p'); g.at(2, 11, 'q')
    g.at(17, 8, 'r'); g.at(17, 9, 'pr'); g.at(18, 10, 'p'); g.at(17, 11, 'q')
    skull = {
        5: (6, 'BBBBbbb'),
        6: (5, 'BBBBbbbbd'),
        7: (4, 'BBBbbbbbbbd'),
        8: (4, 'BbbbbbbbbdD'),
        9: (4, 'BbZZZbZZZdD'),
        10: (4, 'bbZoZbZoZdD'),
        11: (4, 'bbZZZbZZZdD'),
        12: (5, 'bbbbZbbdD'),
        13: (5, 'dbbZZZbdD'),
        14: (6, 'dbbbbdD'),
        15: (6, 'dBdBdBD'),
        16: (6, 'DZDZDZD'),
        17: (7, 'DDDDD'),
    }
    for y, (x, r) in skull.items():
        g.at(x, y, r)
    px(g, [(7, 10), (11, 10)], '3')
    px(g, [(1, 4), (18, 3), (16, 13), (2, 14)], '3'); px(g, [(14, 0), (3, 1)], '2')
    return g


def bolt(g, pts, core='W', edge='a'):
    """A jagged bolt through the points: a white core with a pale blue pixel on its lower side."""
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(n + 1):
            x, y = round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)
            g.at(x, y, core)
            if g.g[y + 1][x] == '.' if y + 1 < 20 else False:
                g.at(x, y + 1, edge)


def chainlightning():
    """Lightning leaping from one foe to the next: three sparks of light joined by forked bolts."""
    g = G(20, 20)
    bolt(g, [(0, 0), (3, 3), (2, 5), (5, 8)])
    bolt(g, [(5, 8), (8, 6), (9, 9), (12, 7), (14, 9)])
    bolt(g, [(14, 9), (13, 12), (16, 13), (15, 16)])
    bolt(g, [(9, 9), (8, 12), (6, 13)], core='A', edge='i')
    for cx, cy in ((5, 8), (14, 9), (15, 16)):
        g.at(cx - 1, cy - 1, '4.4'); g.at(cx - 1, cy + 1, '4.4')
        g.at(cx - 2, cy, '4'); g.at(cx + 2, cy, '4')
        g.at(cx, cy, '1')
    px(g, [(18, 3), (1, 12), (17, 19), (10, 2)], '~')
    return g


def scorch():
    """A seared mark: a blackened burn with a ragged edge still glowing, cracks of fire running
    out from its heart, a wisp of smoke curling off it."""
    g = G(20, 20)
    cx, cy = 9.5, 13.0
    for y in range(20):
        for x in range(20):
            dx, dy = (x + 0.5 - cx) / 9.2, (y + 0.5 - cy) / 4.8
            a = math.atan2(dy, dx)
            e = math.hypot(dx, dy) / (1 + 0.15 * math.sin(5 * a + 0.6) + 0.09 * math.sin(8 * a + 2.0))
            if e <= 1:
                g.at(x, y, ('o' if dy < -0.25 else 'p') if e > 0.8 else 'P' if e > 0.6 else 'Z')
    # cracks of fire out from the heart, uneven
    for pts in (((9, 13), (8, 13), (7, 12), (5, 12)), ((10, 13), (11, 12), (12, 12), (14, 11)),
                ((10, 13), (11, 14), (13, 14), (14, 15)), ((9, 13), (8, 14), (7, 15))):
        for i, (x, y) in enumerate(pts):
            if g.g[y][x] in 'ZQ':
                g.at(x, y, 'o' if i < 2 else 'p')
    g.at(9, 13, 'OO')
    # a wisp of smoke curling up off it
    for x, y in ((11, 8), (12, 7), (12, 6), (11, 5), (10, 4), (10, 3), (11, 2), (12, 1)):
        g.at(x, y, 't')
    g.at(12, 6, 's'); g.at(10, 3, 's')
    px(g, [(4, 6), (16, 5), (7, 3), (17, 9)], '3'); px(g, [(2, 9), (15, 2)], '2')
    return g


def pyroblast():
    """A great ball of fire, rolling with flame, filling the hand that throws it."""
    g = G(20, 20)
    blob(g, 11.0, 9.0, 7.6, 7.6, fireball)
    # flame tongues trailing to the bottom-left, swirls in the ball
    g.at(2, 13, 'pp'); g.at(1, 14, 'pP'); g.at(3, 15, 'pP'); g.at(2, 16, 'P'); g.at(5, 17, 'pP'); g.at(4, 18, 'P')
    g.at(1, 11, 'p'); g.at(7, 18, 'p'); g.at(0, 15, 'p')
    arc(g, 11.0, 9.0, 5.0, 20, 110, lambda t: 1.0, 'o')
    arc(g, 11.0, 9.0, 3.4, 200, 290, lambda t: 1.0, 'O')
    g.at(8, 5, 'WW'); g.at(8, 6, 'W')
    px(g, [(19, 2), (18, 0), (4, 2), (19, 16), (1, 6)], '3'); px(g, [(17, 1), (2, 4)], '2')
    return g


def frostnova():
    """A ring of ice spikes bursting outward from where you stand, frost on the ground between."""
    g = G(20, 20)
    blob(g, 10.0, 10.0, 3.0, 3.0, lambda nx, ny, e: 'A' if nx + ny < -0.3 else 'a' if e < 0.7 else 'i')
    for k in range(8):
        a = math.radians(k * 45 - 90)
        ux, uy = math.cos(a), math.sin(a)
        for y in range(20):
            for x in range(20):
                dx, dy = x + 0.5 - 10.0, y + 0.5 - 10.0
                along = dx * ux + dy * uy
                across = -dx * uy + dy * ux
                tip = 9.8 if k % 2 == 0 else 8.6
                if 3.0 <= along <= tip and abs(across) <= 1.6 * (tip - along) / (tip - 3.0) + 0.3:
                    lit = (-ux - uy) * 0.7 + (across * (uy - ux)) * 0.6
                    g.at(x, y, 'W' if along > tip - 1.2 else 'A' if lit > 0.4 else 'a' if lit > -0.3 else 'i')
    g.at(10, 10, 'W')
    for x, y in ((5, 2), (14, 2), (2, 5), (17, 5), (2, 14), (17, 14), (5, 17), (14, 17)):
        g.at(x, y, '~')
    return g


def icyveins():
    """An open hand turned to ice, its veins dark blue under frosted skin, frost at the fingertips."""
    g = G(20, 20)
    hand = {
        2: (8, 'Aa'),
        3: (5, 'Aa.Aai.Aa'),
        4: (5, 'Aai.Aai.Aai'),
        5: (5, 'Aai.Aai.Aai'),
        6: (5, 'Aai.Aai.Aai'),
        7: (5, 'AaiAAaiAAai'),
        8: (2, 'A..AAaaaaaaaaai'),
        9: (2, 'Aa.Aaaaaaaaaaai'),
        10: (2, 'AaAAaaaaaaaaaii'),
        11: (3, 'AaAaaaaaaaaaii'),
        12: (4, 'AAaaaaaaaaaai'),
        13: (5, 'Aaaaaaaaaaii'),
        14: (6, 'Aaaaaaaaii'),
        15: (7, 'Aaaaaaai'),
        16: (7, 'Aaaaaaii'),
        17: (7, 'Aaaaaaii'),
        18: (7, 'Aaaaaiii'),
        19: (7, 'aaaaaiii'),
    }
    for y, (x, r) in hand.items():
        g.at(x, y, r)
    g.at(14, 3, 'Aa'); g.at(16, 4, 'i')
    # the veins: up the wrist, branching into the palm and the fingers
    for x, y in ((10, 19), (10, 18), (10, 17), (10, 16), (9, 15), (9, 14), (8, 13), (7, 12), (6, 11), (4, 10),
                 (11, 15), (12, 14), (12, 13), (13, 12), (14, 11), (14, 10), (14, 9),
                 (9, 13), (10, 12), (10, 11), (10, 10), (10, 9), (10, 8), (10, 7), (9, 6),
                 (8, 12), (7, 10), (6, 9), (6, 8), (6, 7)):
        g.at(x, y, 'I')
    px(g, [(6, 1), (9, 0), (13, 1), (16, 2), (1, 6)], '~'); px(g, [(11, 1), (4, 2), (18, 6)], '1')
    return g


FIGURE = [  # a hooded figure in a robe, 7 wide (the sorceress, seen in the blink and the barrier)
    '..XXX..',
    '.Xvvvx.',
    '.XvZZx.',
    '.XvZZx.',
    '..vxx..',
    '.vvvxx.',
    'vvVvxxX',
    'vvVvxxX',
    '.vVvxx.',
    '.vVvxX.',
    'vvVvxxX',
    'vvvvxxX',
]


def blink():
    """The sorceress gone in a blink: her outline left behind in violet sparks, herself stepped
    out again a little way back, light still clinging to her."""
    g = G(20, 20)
    for i, r in enumerate(FIGURE):
        g.at(1, 7 + i, r)
    # the outline she left, every edge pixel a spark
    for i, r in enumerate(FIGURE):
        for j, c in enumerate(r):
            if c == '.':
                continue
            edge = any(not (0 <= i + di < len(FIGURE) and 0 <= j + dj < 7) or FIGURE[i + di][j + dj] == '.'
                       for di, dj in ((-1, 0), (1, 0), (0, -1), (0, 1)))
            if edge:
                g.at(12 + j, 2 + i, '%' if (i + j) % 2 == 0 else '&')
            elif (i * 3 + j) % 7 == 0:
                g.at(12 + j, 2 + i, '&')
    # motes streaming from there to here
    px(g, [(10, 6), (9, 9), (11, 11), (8, 4)], '%'); px(g, [(10, 13), (11, 8), (9, 2)], '&')
    px(g, [(0, 6), (8, 8)], '%')
    return g


def barrier():
    """A bubble of violet-white light round the sorceress, a gleam on its curve."""
    g = G(20, 20)
    arc(g, 10.0, 10.0, 9.4, -180, 180, lambda t: 1.4, 'vx')
    for y in range(20):
        for x in range(20):
            if g.g[y][x] == 'v' and x + y > 22:
                g.g[y][x] = 'x'
            elif g.g[y][x] == 'x' and x + y > 24:
                g.g[y][x] = 'X'
    arc(g, 10.0, 10.0, 7.6, -175, -105, lambda t: 1.0, 'V')
    g.at(4, 6, 'W'); g.at(5, 4, 'W')
    for i, r in enumerate(FIGURE):
        g.at(7, 5 + i, r)
    arc(g, 10.0, 10.0, 8.0, 0, 90, lambda t: 1.0, '%', under=True)
    return g

ICONS = {
    'thrust': thrust, 'slash': slash, 'rend': rend, 'whirlwind': whirlwind, 'warcry': warcry,
    'charge': charge, 'interrupt': interrupt, 'mortal': mortal, 'mount': mount,
    'sunder': sunder, 'deathblow': deathblow, 'bloodrage': bloodrage, 'berserk': berserk,
    'shieldbash': shieldbash, 'laststand': laststand, 'secondwind': secondwind,
    'quickshot': quickshot, 'aimedshot': aimedshot, 'barbed': barbed, 'concussive': concussive,
    'mark': mark, 'volley': volley, 'silence': silence, 'killshot': killshot, 'pierce': pierce,
    'rapidfire': rapidfire, 'deadeye': deadeye, 'beartrap': beartrap, 'predator': predator,
    'disengage': disengage, 'camouflage': camouflage,
    'spark': spark, 'firebolt': firebolt, 'ignite': ignite, 'frostbolt': frostbolt, 'arcanepower': arcanepower,
    'flamestrike': flamestrike, 'counterspell': counterspell, 'incinerate': incinerate,
    'chainlightning': chainlightning, 'scorch': scorch, 'pyroblast': pyroblast, 'frostnova': frostnova,
    'icyveins': icyveins, 'blink': blink, 'barrier': barrier,
}

if __name__ == '__main__':
    import sys
    from backpack import backpack, PAL as BP
    out = sys.argv[1] if len(sys.argv) > 1 else 'skillicons.png'
    ims = [render(backpack().rows(), BP, k=0.3)] + [render_icon(f().rows()) for f in ICONS.values()]
    half = (len(ims) + 1) // 2
    from PIL import Image
    # on the action bar's parchment slot and on the spellbook's dark frame
    rows = [sheet(part, scale=7, bg=bg) for bg in ((236, 217, 176), (106, 68, 40)) for part in (ims[:half], ims[half:])]
    im = Image.new('RGBA', (max(r.width for r in rows), sum(r.height for r in rows)), (0, 0, 0, 255))
    y = 0
    for r in rows:
        im.paste(r, (0, y)); y += r.height
    im.save(out)
