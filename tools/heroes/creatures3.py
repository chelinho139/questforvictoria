"""Act I's later creatures, at the HD scale beside the bone hound: the thornling (the Blackthorn
come walking: a hunched knot of black thorn stems on root legs, two cold eyes in the tangle, from
the ash field under the thorn wall north of Millbrook), the Old Briar (the first of them, as big as
a haystack, with a heart of cold light) and the King's lead hound (a bone hound gone yellow with
age, in the royal kennels' iron collar). Two frames each (a walk, a trot). Face right; no
outline (the game adds it).

The brambles are grown, not drawn: a seeded tangle of stems in an oval, thorns out along the
top, so the big one is the small one's kin at any size.

    python3 creatures3.py out.png
"""
import math

from tool import G, render, sheet
from creatures import BONE, hound

THORNLING_PAL = {
    'K': '#141012',  # the dark heart of the tangle
    'k': '#2a2226',
    's': '#3e3236',  # stems
    'S': '#5e4c4a',  # a stem catching the light
    'x': '#a8988c',  # thorn tips
    'E': '#e4f6ff',  # the eyes, cold
    'e': '#7cb8e6',
    'g': '#556040',  # dead leaves caught in it
    'G': '#7c8654',
    'r': '#3a2c22',  # roots
    'R': '#6a5440',
    'H': '#bfe6ff',  # the Briar's heart
    'h': '#5c9ccc',
}


def _rand(seed):
    """A small fixed pseudo-random stream (the same tangle every time)."""
    s = [seed * 9301 + 49297]

    def nxt():
        s[0] = (s[0] * 1103515245 + 12345) & 0x7FFFFFFF
        return s[0] / 0x7FFFFFFF
    return nxt


def _line(g, x0, y0, x1, y1, ch, over=True):
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(n + 1):
        x = round(x0 + (x1 - x0) * i / n)
        y = round(y0 + (y1 - y0) * i / n)
        if 0 <= x < g.w and 0 <= y < g.h and (over or g.g[y][x] == '.'):
            g.g[y][x] = ch


def bramble(w, h, rx, ry, seed, frame, eyes, heart=None, legs=3, spikes=14, bob=0, thick=False):
    """One frame: an oval tangle of radii rx, ry standing on `legs` root legs."""
    rnd = _rand(seed)
    g = G(w, h)
    leg_h = max(5, ry // 2)
    cx, cy = w / 2 - 1, h - leg_h - ry - 1 - bob
    # the body: dark inside, lighter stems wound through it
    for y in range(h):
        for x in range(w):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d <= 1:
                g.g[y][x] = 'K' if d < 0.45 else 'k'
    for _ in range(rx + ry):
        a = rnd() * math.pi
        x0 = cx + (rnd() - 0.5) * rx * 1.6
        y0 = cy + (rnd() - 0.5) * ry * 1.4
        ln = 2 + rnd() * rx * 0.6
        x1, y1 = x0 + math.cos(a) * ln, y0 + math.sin(a) * ln * 0.6
        _line(g, round(x0), round(y0), round(x1), round(y1), 'S' if rnd() < 0.35 else 's')
    # stems and thorns out along the top and the sides
    for i in range(spikes):
        a = math.pi + (i + 0.5) / spikes * math.pi + (rnd() - 0.5) * 0.25
        ex, ey = cx + math.cos(a) * rx, cy + math.sin(a) * ry
        ln = 2 + rnd() * 3.5
        tx, ty = ex + math.cos(a) * ln, ey + math.sin(a) * ln
        _line(g, round(ex), round(ey), round(tx), round(ty), 's')
        if 0 <= round(tx) < w and 0 <= round(ty) < h:
            g.g[round(ty)][round(tx)] = 'x'
        # a side thorn halfway
        if rnd() < 0.5:
            mx, my = round((ex + tx) / 2), round((ey + ty) / 2)
            sx = mx + (1 if rnd() < 0.5 else -1)
            if 0 <= sx < w and 0 <= my < h and g.g[my][sx] == '.':
                g.g[my][sx] = 'x'
    # a few thorns along the lower edge, and dead leaves caught in it
    for _ in range(4):
        a = rnd() * math.pi
        x, y = round(cx + math.cos(a) * (rx + 1)), round(cy + math.sin(a) * (ry + 0.6))
        if 0 <= x < w and 0 <= y < h and g.g[y][x] == '.':
            g.g[y][x] = 'x'
    for _ in range(3 + rx // 4):
        x = round(cx + (rnd() - 0.5) * rx * 1.4)
        y = round(cy + (rnd() - 0.2) * ry * 0.9)
        if g.g[y][x] in 'Kk':
            g.g[y][x] = 'g'
            if x + 1 < w and g.g[y][x + 1] in 'Kk':
                g.g[y][x + 1] = 'G'
    # the heart (the Briar's), deep in the tangle
    if heart:
        hx, hy = heart
        hx, hy = round(cx + hx), round(cy + hy)
        for dx, dy, ch in ((0, 0, 'H'), (1, 0, 'H'), (0, 1, 'H'), (1, 1, 'h'), (-1, 0, 'h'), (2, 0, 'h'), (0, -1, 'h'), (1, 2, 'h')):
            g.g[hy + dy][hx + dx] = ch
    # the eyes, toward the front (facing right)
    for ex, ey in eyes:
        x, y = round(cx + ex), round(cy + ey)
        g.g[y][x] = 'E'
        g.g[y][x + 1] = 'E'
        g.g[y][x - 1] = 'e'
        if thick:
            g.g[y - 1][x] = 'e'
            g.g[y + 1][x + 1] = 'e'
    # root legs: splayed, stepping in turn
    base = h - 1
    top = round(cy + ry * 0.7)
    for i in range(legs):
        lx = round(cx - rx * 0.6 + i * (rx * 1.2) / max(1, legs - 1))
        step = (1 if (i + frame) % 2 == 0 else -1) * (2 if frame < 2 else 0)
        foot = lx + step + (i - (legs - 1) / 2) * 1.5
        _line(g, lx, top, round((lx + foot) / 2), (top + base) // 2, 'r', over=False)
        _line(g, round((lx + foot) / 2), (top + base) // 2, round(foot), base, 'R' if i % 2 else 'r', over=False)
        if thick:
            _line(g, lx + 1, top, round((lx + foot) / 2) + 1, (top + base) // 2, 'R', over=False)
            _line(g, round((lx + foot) / 2) + 1, (top + base) // 2, round(foot) + 1, base, 'r', over=False)
        # toes: little roots splayed on the ground
        fx = round(foot)
        for dx in (-1, 1):
            if 0 <= fx + dx < w:
                g.g[base][fx + dx] = 'r'
    return g.rows()


def thornling():
    return [bramble(24, 28, 9, 8, 11, f, eyes=[(5, -1)], spikes=13, bob=f) for f in (0, 1)]


def old_briar():
    return [bramble(42, 42, 17, 12, 23, f, eyes=[(9, -4), (13, -2)], heart=(-3, 1), legs=4, spikes=24, bob=f, thick=True)
            for f in (0, 1)]


# The King's lead hound: older, yellowed bone, the royal kennels' iron collar with a gilt stud.
LEAD_PAL = dict(BONE, B='#e4d6ae', b='#bfae84', c='#8e7c58', C='#5c4e36', R='#ffb43a', r='#c8701e',
                I='#4c4c56', i='#2c2c34', Y='#e8c050')


def lead_hound():
    out = []
    for f in (0, 1):
        g = hound(f)
        lift = 1 if f == 1 else 0
        # the collar round the neck, behind the head
        for x, y, ch in ((22, 5, 'I'), (22, 6, 'i'), (23, 4, 'I'), (23, 5, 'Y'), (23, 6, 'I'), (21, 6, 'i')):
            yy = y + lift
            if g.g[yy][x] != '.':
                g.g[yy][x] = ch
        # bristling bone along the spine
        for x in (9, 12, 15, 18):
            g.g[6 + lift][x] = 'b'
        out.append(g.rows())
    return out


CREATURES3 = {
    'thornling': (thornling, THORNLING_PAL),
    'old_briar': (old_briar, THORNLING_PAL),
    'leadhound': (lead_hound, LEAD_PAL),
}

if __name__ == '__main__':
    import sys
    ims = []
    for name, (make, pal) in CREATURES3.items():
        for fr in make():
            ims.append(render(fr, pal, 0.22))
    ims.append(render(hound(0).rows(), BONE, 0.22))
    sheet(ims, scale=8).save(sys.argv[1])
    print('ok')
