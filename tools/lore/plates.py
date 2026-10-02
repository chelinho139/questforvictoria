"""Lore plates: book illustrations for docs/lore.md, in sepia ink on parchment (one red accent).

Writes SVGs to docs/lore-art/. Shapes are laid out by hand (coordinates in each plate); the
helpers only give the lines a hand-inked wobble, hatch shaded areas and stamp map symbols.
Run: python3 tools/lore/plates.py [name ...]   (no names: all plates)
"""
import math
import os
import random
import sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'docs', 'lore-art')

INK = '#33200f'
SEPIA = '#6b4423'
WASH = '#8a5a30'
RED = '#a3261b'
GOLD = '#b0842a'
PAPER = '#f1e0b8'
FONT = "Georgia, 'Times New Roman', serif"


# ---------------------------------------------------------------- drawing kit
def f(v):
    return f'{v:.1f}'


def smooth(pts, closed=False):
    """Catmull-Rom through the points, as cubic Beziers."""
    n = len(pts)
    if n < 2:
        return ''
    d = f'M{f(pts[0][0])},{f(pts[0][1])}'
    segs = n if closed else n - 1
    for i in range(segs):
        p0 = pts[(i - 1) % n] if (closed or i > 0) else pts[0]
        p1 = pts[i % n]
        p2 = pts[(i + 1) % n]
        p3 = pts[(i + 2) % n] if (closed or i + 2 < n) else pts[-1]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f' C{f(c1[0])},{f(c1[1])} {f(c2[0])},{f(c2[1])} {f(p2[0])},{f(p2[1])}'
    return d + (' Z' if closed else '')


def blob(cx, cy, rx, ry, n=14, jit=0.1, rnd=None, start=0.0):
    r = rnd or random
    pts = []
    for i in range(n):
        a = start + 2 * math.pi * i / n
        k = 1 + r.uniform(-jit, jit)
        pts.append((cx + math.cos(a) * rx * k, cy + math.sin(a) * ry * k))
    return smooth(pts, True)


def wiggle(pts, amp=1.2, rnd=None, step=None):
    """Hand-inked line through the points: subdivided and nudged a little."""
    r = rnd or random
    out = []
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        L = math.hypot(x1 - x0, y1 - y0)
        k = max(1, int(L / (step or 18)))
        for j in range(k):
            t = j / k
            out.append((x0 + (x1 - x0) * t + r.uniform(-amp, amp), y0 + (y1 - y0) * t + r.uniform(-amp, amp)))
    out.append(pts[-1])
    return smooth(out)


def path(d, sw=1.4, stroke=INK, fill='none', op=1, extra=''):
    o = f' opacity="{op}"' if op != 1 else ''
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"{o}{extra}/>'


def line(x0, y0, x1, y1, sw=1.2, stroke=INK, op=1):
    o = f' opacity="{op}"' if op != 1 else ''
    return f'<line x1="{f(x0)}" y1="{f(y0)}" x2="{f(x1)}" y2="{f(y1)}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round"{o}/>'


def text(x, y, s, size=16, anchor='middle', italic=True, caps=False, fill=INK, weight='normal', spacing=0, rot=0, halo=True):
    st = 'italic' if italic else 'normal'
    var = ' font-variant="small-caps"' if caps else ''
    tr = f' transform="rotate({rot} {f(x)} {f(y)})"' if rot else ''
    h = f' paint-order="stroke" stroke="{PAPER}" stroke-width="4" stroke-linejoin="round"' if halo else ''
    ls = f' letter-spacing="{spacing}"' if spacing else ''
    return (f'<text x="{f(x)}" y="{f(y)}" font-family="{FONT}" font-size="{size}" font-style="{st}" font-weight="{weight}"'
            f' text-anchor="{anchor}" fill="{fill}"{var}{ls}{h}{tr}>{s}</text>')


class Plate:
    def __init__(self, name, w, h, seed=7, rough=1.6):
        self.name, self.w, self.h = name, w, h
        self.rnd = random.Random(seed)
        self.rough = rough
        self.defs = []
        self.art = []      # inked (roughened)
        self.top = []      # crisp: labels, glows
        self.ids = 0

    def uid(self, p='c'):
        self.ids += 1
        return f'{self.name}-{p}{self.ids}'

    def add(self, *s):
        self.art.extend(s)

    def label(self, *s):
        self.top.extend(s)

    def hatch(self, clip_d, box, angle=45, gap=5.0, sw=0.7, op=0.85, stroke=INK, jitter=0.6, cross=False):
        """Parallel ink strokes filling a shape (clipped)."""
        cid = self.uid('h')
        self.defs.append(f'<clipPath id="{cid}"><path d="{clip_d}"/></clipPath>')
        x0, y0, x1, y1 = box
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        R = math.hypot(x1 - x0, y1 - y0) / 2 + 4
        out = []
        for a in ([angle, angle + 90] if cross else [angle]):
            t = math.radians(a)
            dx, dy = math.cos(t), math.sin(t)
            nx, ny = -dy, dx
            k = -R
            while k <= R:
                ox, oy = cx + nx * k, cy + ny * k
                j = self.rnd.uniform(-jitter, jitter)
                out.append(line(ox - dx * R + j, oy - dy * R, ox + dx * R, oy + dy * R + j, sw, stroke))
                k += gap
        self.add(f'<g clip-path="url(#{cid})" opacity="{op}">' + ''.join(out) + '</g>')

    def stipple(self, inside, box, n, r=0.9, fill=INK, op=0.9):
        x0, y0, x1, y1 = box
        dots = []
        for _ in range(n * 4):
            if len(dots) >= n:
                break
            x, y = self.rnd.uniform(x0, x1), self.rnd.uniform(y0, y1)
            if inside(x, y):
                dots.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r * self.rnd.uniform(0.6, 1.2))}"/>')
        self.add(f'<g fill="{fill}" opacity="{op}">' + ''.join(dots) + '</g>')

    def wash(self, d, color=WASH, op=0.18):
        self.add(f'<path d="{d}" fill="{color}" opacity="{op}" filter="url(#{self.name}-bleed)"/>')

    def svg(self, title):
        defs = ''.join(self.defs)
        return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}" role="img" aria-label="{title}">
<title>{title}</title>
<defs>
<filter id="{self.name}-rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="{self.rough}"/></filter>
<filter id="{self.name}-bleed" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="9"/><feDisplacementMap in="SourceGraphic" scale="9"/></filter>
<radialGradient id="{self.name}-glow"><stop offset="0" stop-color="#ffcf6a" stop-opacity="0.95"/><stop offset="0.35" stop-color="#e8862c" stop-opacity="0.55"/><stop offset="1" stop-color="{RED}" stop-opacity="0"/></radialGradient>
{defs}
</defs>
<g filter="url(#{self.name}-rough)">{''.join(self.art)}</g>
{''.join(self.top)}
</svg>
'''

    def save(self, title):
        os.makedirs(OUT, exist_ok=True)
        with open(os.path.join(OUT, f'{self.name}.svg'), 'w') as fh:
            fh.write(self.svg(title))


def frame(p, inset=14, corner=True):
    w, h = p.w, p.h
    p.add(path(f'M{inset},{inset} H{w - inset} V{h - inset} H{inset} Z', 2.2))
    p.add(path(f'M{inset + 6},{inset + 6} H{w - inset - 6} V{h - inset - 6} H{inset + 6} Z', 0.9))
    if corner:
        for (x, y, sx, sy) in [(inset, inset, 1, 1), (w - inset, inset, -1, 1), (inset, h - inset, 1, -1), (w - inset, h - inset, -1, -1)]:
            p.add(path(f'M{x + sx * 6},{y + sy * 22} q{sx * 14},{-sy * 2} {sx * 16},{-sy * 16} q{sx * 2},{sy * 14} {sx * 16},{-sy * 0}', 1.1))
            p.add(f'<circle cx="{x + sx * 6}" cy="{y + sy * 6}" r="3.2" fill="{INK}"/>')


# ---------------------------------------------------------------- map symbols
def oak(p, x, y, s=1.0, leaves=1.0):
    r = p.rnd
    p.add(path(f'M{f(x - 2 * s)},{f(y)} L{f(x - 1.5 * s)},{f(y - 9 * s)} M{f(x + 2 * s)},{f(y)} L{f(x + 1.5 * s)},{f(y - 9 * s)}', 1.1 * s))
    if leaves > 0:
        d = blob(x, y - 15 * s, 10 * s, 8.5 * s, 11, 0.16, r)
        p.add(path(d, 1.2 * s, fill=PAPER))
        p.hatch(d, (x - 11 * s, y - 25 * s, x + 11 * s, y - 6 * s), 60, 2.6 * s, 0.55 * s, 0.6)
        p.add(path(blob(x - 3 * s, y - 18 * s, 4 * s, 3 * s, 8, 0.2, r), 0.6 * s))


def big_oak(p, x, y, s=1.0, sparse=False):
    """A full oak for the plates: a tapered trunk and a canopy built from leafy lobes."""
    r = p.rnd
    trunk = (f'M{f(x - 9 * s)},{f(y)} C{f(x - 6 * s)},{f(y - 14 * s)} {f(x - 5 * s)},{f(y - 26 * s)} {f(x - 4 * s)},{f(y - 38 * s)} '
             f'L{f(x + 4 * s)},{f(y - 38 * s)} C{f(x + 5 * s)},{f(y - 26 * s)} {f(x + 6 * s)},{f(y - 14 * s)} {f(x + 10 * s)},{f(y)} Z')
    p.add(path(trunk, 1.3 * s, fill=PAPER))
    p.hatch(trunk, (x - 10 * s, y - 40 * s, x + 10 * s, y), 80, 1.6 * s, 0.4 * s, 0.7)
    p.add(path(f'M{f(x - 2 * s)},{f(y - 36 * s)} q{f(-8 * s)},{f(-6 * s)} {f(-14 * s)},{f(-14 * s)} M{f(x + 2 * s)},{f(y - 34 * s)} q{f(8 * s)},{f(-6 * s)} {f(13 * s)},{f(-16 * s)}', 1.2 * s))
    cy = y - 60 * s
    lobes = []
    for k in range(10):
        a = 2 * math.pi * k / 10 + r.uniform(-0.2, 0.2)
        lobes.append((x + math.cos(a) * 24 * s, cy + math.sin(a) * 16 * s, r.uniform(12, 16) * s))
    lobes.append((x, cy - 4 * s, 16 * s))
    if sparse:
        lobes = [l for i, l in enumerate(lobes) if i % 3 != 1]
    lobes.sort(key=lambda l: (l[1] < cy, -l[0]))
    for (lx, ly, lr) in lobes:
        pts = []
        for i in range(14):
            a = 2 * math.pi * i / 14
            k = 1 + (0.12 if i % 2 else -0.04) + r.uniform(-0.04, 0.04)
            pts.append((lx + math.cos(a) * lr * k, ly + math.sin(a) * lr * k * 0.9))
        d = smooth(pts, True)
        p.add(path(d, 1.0 * s, fill=PAPER))
        if lx > x - 6 * s or ly > cy:
            p.stipple(lambda a, b, lx=lx, ly=ly, lr=lr: (a - lx - lr * 0.3) ** 2 + (b - ly - lr * 0.3) ** 2 < (lr * 0.75) ** 2,
                      (lx - lr, ly - lr, lx + lr, ly + lr), 22, 0.55 * s, INK, 0.8)
        p.add(path(f'M{f(lx - lr * 0.5)},{f(ly - lr * 0.2)} q{f(lr * 0.3)},{f(-lr * 0.4)} {f(lr * 0.7)},{f(-lr * 0.3)}', 0.6 * s, op=0.7))


def bare_tree(p, x, y, s=1.0, thorns=0, spikes=0, black=False):
    """A leafless tree; thorns along its branches, bone spikes around its roots."""
    r = p.rnd
    col = INK
    trunk = [(x, y), (x + r.uniform(-1, 1) * s, y - 10 * s), (x + r.uniform(-1.5, 1.5) * s, y - 18 * s)]
    p.add(path(wiggle(trunk, 0.4 * s, r, 6 * s), 3.2 * s if black else 2.2 * s, col))
    tips = []
    for side in (-1, 1):
        for k, (h, L) in enumerate([(13, 9), (18, 7), (21, 5)]):
            bx, by = x, y - h * s
            ex, ey = bx + side * L * s * r.uniform(0.8, 1.2), by - (5 + k * 2) * s
            p.add(path(f'M{f(bx)},{f(by)} Q{f((bx + ex) / 2)},{f(by - 1 * s)} {f(ex)},{f(ey)}', (1.6 - k * 0.3) * s * (1.4 if black else 1)))
            tips.append((ex, ey, side))
    for (ex, ey, side) in tips[: thorns * 2]:
        p.add(f'<path d="M{f(ex)},{f(ey)} l{f(side * 3.5 * s)},{f(-2 * s)} l{f(-side * 1.8 * s)},{f(2.6 * s)} Z" fill="{INK}"/>')
        p.add(f'<path d="M{f(ex - side * 3 * s)},{f(ey + 2 * s)} l{f(side * 0.6 * s)},{f(-3.4 * s)} l{f(side * 1.4 * s)},{f(2.8 * s)} Z" fill="{INK}"/>')
    for i in range(spikes):
        sx = x + (i - (spikes - 1) / 2) * 5 * s + r.uniform(-1, 1) * s
        spike(p, sx, y + 1, s * r.uniform(0.7, 1.1), bone=True)


def willow(p, x, y, s=1.0, black=False, thorns=False):
    r = p.rnd
    p.add(path(wiggle([(x, y), (x + 1 * s, y - 9 * s), (x, y - 16 * s)], 0.4 * s, r, 5 * s), (2.6 if black else 1.6) * s))
    for i in range(9):
        a = -math.pi / 2 + (i - 4) * 0.33
        sx, sy = x + math.cos(a) * 4 * s, y - 16 * s + math.sin(a) * 3 * s
        tx = sx + math.cos(a) * 11 * s
        ty = sy - 3 * s
        ex = tx + math.cos(a) * 2 * s
        ey = y - r.uniform(0, 4) * s
        d = f'M{f(sx)},{f(sy)} Q{f(tx)},{f(ty)} {f(ex)},{f(ey)}'
        p.add(path(d, (1.2 if black else 0.8) * s))
        if thorns and i % 2 == 0:
            p.add(f'<path d="M{f(ex)},{f(ey)} l{f(1.4 * s)},{f(-3.2 * s)} l{f(1.4 * s)},{f(3.2 * s)} Z" fill="{INK}"/>')


def spike(p, x, y, s=1.0, bone=False, lean=0.0):
    h = 12 * s
    w = 2.4 * s
    fill = PAPER if bone else INK
    p.add(path(f'M{f(x - w)},{f(y)} L{f(x + lean * s)},{f(y - h)} L{f(x + w)},{f(y)} Z', 0.9 * s, fill=fill))
    if bone:
        p.add(line(x + w * 0.4, y - 1, x + lean * s * 0.6, y - h * 0.7, 0.5 * s))


def tuft(p, x, y, s=1.0):
    p.add(path(f'M{f(x - 3 * s)},{f(y)} q{f(1 * s)},{f(-4 * s)} {f(-1 * s)},{f(-6 * s)} M{f(x)},{f(y)} q{f(0)},{f(-5 * s)} {f(1 * s)},{f(-7 * s)} M{f(x + 3 * s)},{f(y)} q{f(0)},{f(-4 * s)} {f(2 * s)},{f(-5 * s)}', 0.8 * s))


def marsh(p, x, y, s=1.0):
    p.add(line(x - 8 * s, y, x + 8 * s, y, 0.8 * s))
    p.add(line(x - 5 * s, y + 3 * s, x + 4 * s, y + 3 * s, 0.6 * s))
    for dx, hh in [(-3, 7), (0, 9), (3, 6)]:
        p.add(line(x + dx * s, y, x + dx * s * 1.2, y - hh * s, 0.7 * s))


def mound(p, x, y, s=1.0):
    d = f'M{f(x - 13 * s)},{f(y)} Q{f(x)},{f(y - 15 * s)} {f(x + 13 * s)},{f(y)}'
    p.add(path(d + ' Z', 1.1 * s, fill=PAPER))
    p.hatch(d + ' Z', (x - 13 * s, y - 9 * s, x + 13 * s, y), 70, 2.4 * s, 0.5 * s, 0.6)
    p.add(line(x - 15 * s, y, x + 15 * s, y, 1 * s))


def mountain(p, x, y, s=1.0):
    r = p.rnd
    h = 34 * s * r.uniform(0.85, 1.15)
    w = 26 * s
    peak = (x + r.uniform(-3, 3) * s, y - h)
    d = f'M{f(x - w)},{f(y)} L{f(peak[0])},{f(peak[1])} L{f(x + w)},{f(y)}'
    p.add(path(d + ' Z', 1.3 * s, fill=PAPER))
    shade = f'M{f(peak[0])},{f(peak[1])} L{f(x + w)},{f(y)} L{f(peak[0] + 2 * s)},{f(y)} Z'
    p.hatch(shade, (peak[0], peak[1], x + w, y), 75, 2.2 * s, 0.6 * s, 0.75)
    p.add(path(f'M{f(peak[0] - 6 * s)},{f(peak[1] + 10 * s)} l{f(4 * s)},{f(-3 * s)} l{f(3 * s)},{f(4 * s)}', 0.8 * s))


def house(p, x, y, s=1.0):
    p.add(path(f'M{f(x - 6 * s)},{f(y)} V{f(y - 7 * s)} L{f(x)},{f(y - 13 * s)} L{f(x + 6 * s)},{f(y - 7 * s)} V{f(y)} Z', 1 * s, fill=PAPER))
    p.add(path(f'M{f(x - 2 * s)},{f(y)} v{f(-4 * s)} h{f(3 * s)} v{f(4 * s)}', 0.7 * s))


def mill(p, x, y, s=1.0):
    house(p, x, y, s * 1.2)
    p.add(f'<circle cx="{f(x + 10 * s)}" cy="{f(y - 5 * s)}" r="{f(6 * s)}" fill="{PAPER}" stroke="{INK}" stroke-width="{f(1 * s)}"/>')
    for k in range(4):
        a = k * math.pi / 4
        p.add(line(x + 10 * s - math.cos(a) * 6 * s, y - 5 * s - math.sin(a) * 6 * s, x + 10 * s + math.cos(a) * 6 * s, y - 5 * s + math.sin(a) * 6 * s, 0.6 * s))


def castle(p, x, y, s=1.0, dark=False, spiky=False):
    fill = INK if dark else PAPER
    parts = [(-16, 12, 10, 22), (-6, 12, 12, 17), (8, 12, 10, 26), (-24, 8, 8, 14), (18, 8, 8, 16)]
    for (dx, _, w, h) in sorted(parts, key=lambda q: q[3]):
        x0, x1 = x + dx * s, x + (dx + w) * s
        top = y - h * s
        crenel = ''
        n = 3
        for k in range(n):
            cx0 = x0 + (x1 - x0) * k / n
            crenel += f' L{f(cx0)},{f(top - 3 * s)} L{f(cx0 + (x1 - x0) / n / 2)},{f(top - 3 * s)} L{f(cx0 + (x1 - x0) / n / 2)},{f(top)}'
        p.add(path(f'M{f(x0)},{f(y)} L{f(x0)},{f(top)}{crenel} L{f(x1)},{f(top)} L{f(x1)},{f(y)} Z', 1.1 * s, fill=fill))
        if spiky:
            for k in range(3):
                sx = x0 + (x1 - x0) * (k + 0.5) / 3
                p.add(f'<path d="M{f(sx - 1.4 * s)},{f(top - 3 * s)} L{f(sx)},{f(top - 10 * s)} L{f(sx + 1.4 * s)},{f(top - 3 * s)} Z" fill="{INK}"/>')
    if not dark:
        p.add(path(f'M{f(x - 3 * s)},{f(y)} v{f(-6 * s)} a{f(3 * s)},{f(3 * s)} 0 0 1 {f(6 * s)},0 v{f(6 * s)}', 0.9 * s))


def tower(p, x, y, s=1.0):
    p.add(path(f'M{f(x - 5 * s)},{f(y)} L{f(x - 4 * s)},{f(y - 24 * s)} L{f(x + 4 * s)},{f(y - 24 * s)} L{f(x + 5 * s)},{f(y)} Z', 1 * s, fill=PAPER))
    p.add(path(f'M{f(x - 6 * s)},{f(y - 24 * s)} L{f(x)},{f(y - 34 * s)} L{f(x + 6 * s)},{f(y - 24 * s)} Z', 1 * s, fill=INK))
    p.add(path(f'M{f(x - 1 * s)},{f(y - 15 * s)} v{f(-4 * s)} h{f(2 * s)} v{f(4 * s)} Z', 0.6 * s, fill=INK))
    for k in range(5):
        a = math.pi * (0.15 + 0.7 * k / 4)
        p.add(path(f'M{f(x)},{f(y - 12 * s)} q{f(-math.cos(a) * 8 * s)},{f(-2 * s)} {f(-math.cos(a) * 12 * s)},{f(math.sin(a) * 8 * s)}', 0.7 * s))


def bridge(p, x, y, s=1.0):
    p.add(path(f'M{f(x - 16 * s)},{f(y)} L{f(x - 14 * s)},{f(y - 8 * s)} L{f(x + 14 * s)},{f(y - 8 * s)} L{f(x + 16 * s)},{f(y)} L{f(x + 9 * s)},{f(y)} A{f(9 * s)},{f(7 * s)} 0 0 0 {f(x - 9 * s)},{f(y)} Z', 1.1 * s, fill=PAPER))
    for k in range(-3, 4):
        p.add(line(x + k * 4 * s, y - 8 * s, x + k * 4 * s, y - 10.5 * s, 0.7 * s))


def campfire(p, x, y, s=1.0):
    p.add(path(f'M{f(x - 6 * s)},{f(y)} L{f(x + 6 * s)},{f(y - 3 * s)} M{f(x + 6 * s)},{f(y)} L{f(x - 6 * s)},{f(y - 3 * s)}', 1.2 * s))
    p.label(f'<path d="M{f(x)},{f(y - 3 * s)} q{f(-5 * s)},{f(-5 * s)} {f(0)},{f(-12 * s)} q{f(1 * s)},{f(5 * s)} {f(4 * s)},{f(6 * s)} q{f(1 * s)},{f(4 * s)} {f(-4 * s)},{f(6 * s)} Z" fill="{RED}" opacity="0.85"/>')


def compass(p, x, y, r=46):
    pts = []
    for k in range(16):
        a = -math.pi / 2 + k * math.pi / 8
        rr = r if k % 4 == 0 else (r * 0.55 if k % 2 == 0 else r * 0.3)
        pts.append((x + math.cos(a) * rr, y + math.sin(a) * rr))
    d = 'M' + ' L'.join(f'{f(a)},{f(b)}' for a, b in pts) + ' Z'
    p.add(path(d, 1.1, fill=PAPER))
    for k in range(0, 16, 2):
        a = -math.pi / 2 + k * math.pi / 8
        a2 = a + math.pi / 8
        rr = r if k % 4 == 0 else r * 0.55
        p.add(path(f'M{f(x)},{f(y)} L{f(x + math.cos(a) * rr)},{f(y + math.sin(a) * rr)} L{f(x + math.cos(a2) * r * 0.3)},{f(y + math.sin(a2) * r * 0.3)} Z', 0.6, fill=INK))
    p.add(f'<circle cx="{x}" cy="{y}" r="{r * 0.72}" fill="none" stroke="{INK}" stroke-width="0.8"/>')
    p.label(text(x, y - r - 8, 'N', 18, italic=False, weight='bold'))


def banner(p, x, y, w, words, size=26, sub=None):
    """A ribbon cartouche with the ends folded back."""
    h = size * 1.6
    x0, x1 = x - w / 2, x + w / 2
    for side in (-1, 1):
        ex = x0 if side < 0 else x1
        tail = f'M{f(ex)},{f(y - h * 0.2)} L{f(ex - side * h * 0.9)},{f(y - h * 0.2)} L{f(ex - side * h * 0.55)},{f(y + h * 0.3)} L{f(ex - side * h * 0.9)},{f(y + h * 0.8)} L{f(ex + side * 4)},{f(y + h * 0.8)} Z'
        p.add(path(tail, 1.2, fill=PAPER))
        p.hatch(tail, (min(ex, ex - side * h), y - h * 0.2, max(ex, ex - side * h), y + h * 0.8), 30, 3, 0.6, 0.6)
    body = f'M{f(x0)},{f(y - h * 0.5)} Q{f(x)},{f(y - h * 0.62)} {f(x1)},{f(y - h * 0.5)} L{f(x1)},{f(y + h * 0.5)} Q{f(x)},{f(y + h * 0.38)} {f(x0)},{f(y + h * 0.5)} Z'
    p.add(path(body, 1.4, fill=PAPER))
    p.label(text(x, y + size * 0.34, words, size, italic=False, caps=True, spacing=3, halo=False))
    if sub:
        p.label(text(x, y + h * 0.5 + size * 0.85, sub, size * 0.55, halo=True))


def ring_path(cx, cy, r, rnd, n=48, jit=0.025):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        k = 1 + rnd.uniform(-jit, jit)
        pts.append((cx + math.cos(a) * r * k, cy + math.sin(a) * r * k))
    return pts


# ---------------------------------------------------------------- plates
def plate_map():
    p = Plate('map', 900, 1150, seed=11, rough=1.3)
    W, H = p.w, p.h
    C = (450, 150)
    R = [85, 190, 300, 420, 560]
    clip = p.uid('frame')
    p.defs.append(f'<clipPath id="{clip}"><rect x="22" y="22" width="{W - 44}" height="{H - 44}"/></clipPath>')

    # the Blackthorn: darker toward the Hallow, a thorny edge on every ring
    rings = []
    for k, r in enumerate(reversed(R)):
        pts = ring_path(*C, r, p.rnd)
        rings.append(pts)
        p.add(f'<g clip-path="url(#{clip})"><path d="{smooth(pts, True)}" fill="{INK}" opacity="{0.045 + k * 0.012}"/></g>')
    for pts in rings:
        d = smooth(pts, True)
        p.add(f'<g clip-path="url(#{clip})">' + path(d, 1.3, op=0.75, extra=' stroke-dasharray="9 5"') + '</g>')
        for i in range(0, len(pts), 2):
            x, y = pts[i]
            a = math.atan2(y - C[1], x - C[0])
            if 22 < x < W - 22 and 22 < y < H - 22:
                tx, ty = x + math.cos(a) * 6, y + math.sin(a) * 6
                nx, ny = -math.sin(a) * 2, math.cos(a) * 2
                p.add(f'<path d="M{f(x + nx)},{f(y + ny)} L{f(tx)},{f(ty)} L{f(x - nx)},{f(y - ny)} Z" fill="{INK}" opacity="0.75"/>')

    # landmarks (kept clear of scattered symbols)
    keep = [(450, 150, 95), (430, 790, 170), (470, 615, 38), (452, 500, 30), (300, 1000, 50), (590, 1005, 55), (690, 300, 40),
            (300, 805, 25), (785, 1060, 70), (160, 92, 120), (260, 340, 30)]

    def clear(x, y, pad=0):
        return all(math.hypot(x - a, y - b) > r + pad for a, b, r in keep)

    # the river Lisle, the road
    river = [(452, 210), (440, 280), (468, 360), (452, 430), (452, 500), (436, 560), (470, 615), (452, 680), (440, 715)]
    river2 = [(410, 860), (380, 935), (405, 1010), (392, 1130)]
    for pts in (river, river2):
        d = wiggle(pts, 1.5, p.rnd, 14)
        p.add(path(d, 7, PAPER), path(d, 1.2), path(wiggle([(a + 4, b) for a, b in pts], 1.0, p.rnd, 14), 0.8, op=0.8))
    road = [(300, 1000), (318, 930), (300, 860), (300, 780), (350, 700), (420, 650), (470, 615), (492, 560), (452, 500), (420, 440), (430, 370), (458, 300), (450, 228)]
    p.add(path(wiggle(road, 1.0, p.rnd, 12), 1.4, SEPIA, extra=' stroke-dasharray="2 6"'))

    # Lake Ellory
    lake = blob(430, 790, 125, 78, 18, 0.13, p.rnd, 0.3)
    p.add(path(lake, 2.0, fill=PAPER))
    p.add(path(blob(430, 790, 112, 66, 18, 0.1, p.rnd, 0.4), 0.7, op=0.7))
    p.hatch(lake, (300, 710, 560, 870), 0, 5, 0.6, 0.55, SEPIA, jitter=1.2)
    p.label(text(430, 795, 'Lake Ellory', 24, caps=True, spacing=2))
    p.label(text(430, 818, 'the Mirror', 15))
    oak(p, 322, 742, 1.3)
    p.label(text(300, 760, 'the hollow oak', 12, anchor='end'))
    willow(p, 468, 718, 1.1)
    p.label(text(484, 708, "Marcian's willow", 12, anchor='start'))

    # the Greenmarch: tufts and round trees, Aldric's camp
    for _ in range(70):
        x, y = p.rnd.uniform(60, 840), p.rnd.uniform(700, 1100)
        if math.hypot(x - C[0], y - C[1]) > 580 and clear(x, y, 12):
            (tuft if p.rnd.random() < 0.7 else oak)(p, x, y, p.rnd.uniform(0.8, 1.1))
    campfire(p, 300, 805, 1.2)
    p.label(text(282, 830, "Aldric's camp", 12, anchor='end'))
    p.label(text(640, 880, 'THE GREENMARCH', 15, caps=False, italic=False, spacing=4))

    # the south: Ashford and Castle Corvane
    p.add(f'<circle cx="300" cy="1000" r="30" fill="{PAPER}" stroke="{INK}" stroke-width="1.6"/>')
    for (dx, dy) in [(-12, 4), (0, -4), (12, 6), (-4, 14), (10, -14)]:
        house(p, 300 + dx, 1004 + dy, 0.8)
    p.label(text(300, 1052, 'Ashford', 16, caps=True, spacing=1))
    castle(p, 590, 1010, 1.6)
    p.label(text(590, 1048, 'Castle Corvane', 16, caps=True, spacing=1))

    # ring 1: Millbrook
    mill(p, 470, 622, 1.4)
    house(p, 450, 618, 1.0)
    house(p, 490, 640, 0.9)
    p.label(text(510, 606, 'Millbrook', 16, anchor='start', caps=True, spacing=1))

    # ring 2: the Weepwood and its bridge
    for _ in range(46):
        x, y = p.rnd.uniform(140, 760), p.rnd.uniform(430, 560)
        if 300 < math.hypot(x - C[0], y - C[1]) < 415 and clear(x, y, 10) and abs(x - 452) > 26:
            willow(p, x, y, p.rnd.uniform(0.9, 1.2), black=True, thorns=True)
    bridge(p, 452, 500, 1.3)
    p.label(text(452, 528, 'the Weeping Bridge', 12))
    p.label(text(176, 520, 'THE WEEPWOOD', 15, italic=False, spacing=4, rot=-10))

    # ring 3: the Barrow Fens (west), the Blightfields and the Root Tower (east)
    for _ in range(28):
        x, y = p.rnd.uniform(110, 360), p.rnd.uniform(250, 420)
        if 195 < math.hypot(x - C[0], y - C[1]) < 298 and clear(x, y, 8):
            (marsh if p.rnd.random() < 0.6 else mound)(p, x, y, p.rnd.uniform(0.8, 1.1))
    p.label(text(230, 300, 'the Barrow Fens', 16, caps=True, spacing=1))
    for _ in range(9):
        x0, y0 = p.rnd.uniform(560, 700), p.rnd.uniform(330, 400)
        if clear(x0, y0, 10) and 195 < math.hypot(x0 - C[0], y0 - C[1]) < 295:
            for k in range(4):
                p.add(line(x0 - 14, y0 + k * 4, x0 + 14, y0 + k * 4 - 3, 0.7))
    tower(p, 690, 300, 1.3)
    p.label(text(690, 322, 'the Root Tower', 12))
    p.label(text(610, 420, 'the Blightfields', 16, caps=True, spacing=1))

    # rings 1-4: thorns and spikes, thicker toward the Hallow
    density = {1: 18, 2: 22, 3: 60, 4: 90}
    for ring, n in density.items():
        r0, r1 = R[4 - ring], R[5 - ring] if ring < 4 else R[1]
        r0, r1 = (R[-ring], R[-ring - 1]) if ring < 4 else (R[1], R[0])
        lo, hi = min(r0, r1), max(r0, r1)
        placed = 0
        for _ in range(n * 6):
            if placed >= n:
                break
            a = p.rnd.uniform(0, 2 * math.pi)
            rr = p.rnd.uniform(lo + 8, hi - 8)
            x, y = C[0] + math.cos(a) * rr, C[1] + math.sin(a) * rr
            if not (40 < x < W - 40 and 40 < y < H - 40) or not clear(x, y, 6) or abs(x - 452) < 14:
                continue
            placed += 1
            if ring == 1:
                bare_tree(p, x, y, 0.5, thorns=1)
            elif ring == 2:
                spike(p, x, y, 0.7, bone=True)
            else:
                for k in range(2 if ring == 3 else 3):
                    spike(p, x + k * 4 - 4, y + (k % 2) * 2, p.rnd.uniform(0.6, 1.0) + 0.2 * (ring - 3), bone=(ring == 3 and k == 1))

    # ring 5: Thornhallow on the Hallow
    hill = 'M368,214 Q450,150 532,214 Z'
    p.add(path(hill, 1.4, fill=PAPER))
    p.hatch(hill, (368, 160, 532, 214), 70, 3, 0.7, 0.7)
    castle(p, 450, 192, 2.4, dark=True, spiky=True)
    p.label(f'<circle cx="{450 + 4.8}" cy="{192 - 58}" r="9" fill="url(#map-glow)"/>')
    p.label(f'<rect x="{450 + 3.6}" y="{192 - 60.5}" width="2.6" height="4.4" fill="#ffd27a"/>')
    p.label(text(450, 238, 'THORNHALLOW', 17, italic=False, weight='bold', spacing=3))
    p.label(text(450, 254, 'upon the Hallow', 12))

    # the Greyfang Hills
    for _ in range(14):
        x, y = p.rnd.uniform(690, 850), p.rnd.uniform(500, 760)
        if clear(x, y, 20):
            mountain(p, x, y, p.rnd.uniform(0.8, 1.15))
    p.label(text(780, 790, 'the Greyfang Hills', 16, caps=True, spacing=1))

    # ring names, in clear ground on the right, turned to follow their rings
    for (x, y, name) in [(560, 92, 'IV · the Spiked'), (718, 218, 'III · the Blighted'), (800, 330, 'II · the Thorned'),
                         (826, 452, 'I · the Touched'), (640, 700, '0 · the Untouched')]:
        a = math.degrees(math.atan2(y - C[1], x - C[0])) - 90
        a = a - 180 if a > 90 else a + 180 if a < -90 else a  # keep the words upright
        p.label(text(x, y, name, 12, rot=a, fill=SEPIA))
    # cartouche and compass
    title_box = 'M40,40 H300 V150 H40 Z'
    p.add(path(title_box, 1.6, fill=PAPER), path('M46,46 H294 V144 H46 Z', 0.7))
    p.label(text(170, 88, 'CORVALIS', 34, italic=False, spacing=6, halo=False))
    p.label(text(170, 112, 'the Heart-Valley', 16, halo=False))
    p.label(text(170, 132, 'as the Wardens kept it', 12, halo=False))
    compass(p, 785, 1060)
    frame(p)
    p.save('Map of Corvalis, with the rings of the Blackthorn')


def plate_thornhallow():
    p = Plate('thornhallow', 900, 600, seed=5, rough=1.5)
    W, H = p.w, p.h
    sky = f'M22,22 H{W - 22} V420 H22 Z'
    # night sky: dense strokes, the moon left clear
    mid = p.uid('moon')
    p.defs.append(f'<mask id="{mid}"><rect width="{W}" height="{H}" fill="white"/><circle cx="660" cy="130" r="62" fill="black"/></mask>')
    p.add(f'<g mask="url(#{mid})">')
    p.hatch(sky, (22, 22, W - 22, 420), 0, 3.2, 0.8, 0.85, jitter=1.0)
    p.add('</g>')
    p.add(f'<circle cx="660" cy="130" r="62" fill="none" stroke="{INK}" stroke-width="1.4"/>')
    p.add(path('M628,112 q8,-6 14,2 M676,150 q6,4 12,-2 M650,160 q4,6 10,0', 0.8, op=0.6))
    # the Hallow: the hill, cut away to show the barrow beneath
    hill = 'M22,470 C180,430 260,330 450,318 C640,330 720,430 878,470 L878,578 L22,578 Z'
    p.add(path(hill, 1.8, fill=PAPER))
    p.hatch(hill, (22, 318, 878, 578), 20, 4.5, 0.6, 0.55, jitter=1.4)
    # barrow chamber
    ch = 'M360,560 L360,500 Q450,452 540,500 L540,560 Z'
    p.add(path(ch, 1.6, fill=PAPER))
    p.hatch(ch, (360, 455, 540, 560), 0, 6, 0.4, 0.5, SEPIA)
    p.add(path('M402,552 h96 v-12 h-96 Z', 1.2, fill=PAPER))
    p.add(path('M410,540 q40,-20 80,0', 0.9))
    for i in range(7):
        p.add(path(f'M{372 + i * 24},{560} l6,-{10 + (i % 3) * 4}', 0.8))
    p.label(text(450, 590, 'beneath, the barrow', 13))
    # castle silhouette with thorns
    blocks = [(300, 228, 70, 92), (370, 260, 160, 60), (530, 238, 56, 82), (410, 118, 38, 202), (470, 196, 46, 124), (250, 262, 54, 58), (586, 262, 58, 58)]
    for (x, y, w, h) in blocks:
        n = max(2, int(w / 14))
        cren = ''
        for k in range(n):
            cx0 = x + w * k / n
            cren += f' L{f(cx0)},{y - 7} L{f(cx0 + w / n / 2)},{y - 7} L{f(cx0 + w / n / 2)},{y}'
        p.add(path(f'M{x},{y + h} L{x},{y}{cren} L{x + w},{y} L{x + w},{y + h} Z', 1.4, fill=INK))
        for k in range(n):
            sx = x + w * (k + 0.5) / n
            p.add(f'<path d="M{f(sx - 2.5)},{y - 7} L{f(sx + p.rnd.uniform(-2, 2))},{f(y - 7 - p.rnd.uniform(12, 22))} L{f(sx + 2.5)},{y - 7} Z" fill="{INK}"/>')
    p.add(path('M405,118 L429,64 L453,118 Z', 1.4, fill=INK))
    p.add(path('M466,196 L493,150 L520,196 Z', 1.4, fill=INK))
    # giant thorn vines winding the towers
    vines = [
        [(240, 330), (280, 300), (330, 250), (300, 205), (350, 180), (420, 220), (460, 170), (412, 130), (440, 90)],
        [(660, 330), (610, 290), (560, 250), (600, 210), (540, 180), (500, 230), (470, 210)],
        [(330, 320), (380, 300), (440, 310), (520, 296), (580, 318)],
    ]
    for v in vines:
        d = wiggle(v, 1.5, p.rnd, 10)
        p.add(path(d, 6.5, INK), path(d, 2, PAPER, op=0.35))
        for i in range(1, len(v) - 1):
            x, y = v[i]
            for side in (-1, 1):
                a = math.atan2(v[i + 1][1] - v[i - 1][1], v[i + 1][0] - v[i - 1][0]) + side * math.pi / 2
                p.add(f'<path d="M{f(x - 3)},{f(y)} L{f(x + math.cos(a) * 15)},{f(y + math.sin(a) * 15)} L{f(x + 3)},{f(y)} Z" fill="{INK}"/>')
    # the one lit window, at the top of the tallest tower
    p.label(f'<circle cx="429" cy="150" r="30" fill="url(#thornhallow-glow)"/>')
    p.label(f'<path d="M424,160 v-12 a5,5 0 0 1 10,0 v12 Z" fill="#ffd27a" stroke="{INK}" stroke-width="1"/>')
    p.label(f'<line x1="429" y1="146" x2="429" y2="160" stroke="{INK}" stroke-width="1.6"/>')
    # crows
    for (x, y, s) in [(560, 90, 1.2), (590, 70, 0.9), (250, 120, 1.0), (300, 96, 0.8), (720, 220, 0.9)]:
        p.add(path(f'M{x - 9 * s},{y} q{5 * s},{-6 * s} {9 * s},0 q{4 * s},{-6 * s} {9 * s},0', 1.6 * s))
    # spikes on the slope
    for _ in range(40):
        x = p.rnd.uniform(60, 840)
        y = 470 - 140 * math.exp(-((x - 450) / 230) ** 2) + p.rnd.uniform(4, 30)
        if abs(x - 450) > 150 or y > 360:
            spike(p, x, y, p.rnd.uniform(0.9, 1.6), bone=p.rnd.random() < 0.3, lean=p.rnd.uniform(-2, 2))
    frame(p)
    p.save('Castle Thornhallow upon the Hallow, with the barrow beneath')


def plate_blackthorn():
    p = Plate('blackthorn', 960, 350, seed=3, rough=1.3)
    names = ['0 · Untouched', '1 · Touched', '2 · Thorned', '3 · Blighted', '4 · Spiked', '5 · Thornhallow']
    for i in range(6):
        cx = 90 + i * 156
        gy = 250
        # ground, greyer and more broken ring by ring
        p.add(path(wiggle([(cx - 66, gy), (cx + 66, gy)], 1.2, p.rnd, 10), 1.4))
        if i:
            p.add(f'<rect x="{cx - 66}" y="{gy - 160}" width="132" height="160" fill="{INK}" opacity="{0.03 * i}"/>')
        s = 4.2
        if i == 0:
            big_oak(p, cx, gy, 1.9)
            for k in range(5):
                tuft(p, cx - 50 + k * 25, gy, 1.2)
        elif i == 1:
            big_oak(p, cx, gy, 1.8, sparse=True)
            for k in range(4):
                bare_tree(p, cx - 54 + k * 34, gy, 0.6, thorns=1)
            tuft(p, cx + 40, gy, 1.1)
        elif i == 2:
            bare_tree(p, cx, gy, s * 0.95, thorns=3)
            for k in range(3):
                spike(p, cx - 46 + k * 46, gy, 1.2, bone=True)
        elif i == 3:
            bare_tree(p, cx, gy, s * 0.9, thorns=3, black=True)
            for k in range(6):
                spike(p, cx - 56 + k * 22, gy, 1.5 + (k % 2) * 0.6, bone=(k % 2 == 0))
        elif i == 4:
            bare_tree(p, cx, gy, s * 0.85, thorns=3, black=True)
            for k in range(9):
                spike(p, cx - 60 + k * 15, gy, 1.6 + (k % 3) * 0.7, lean=p.rnd.uniform(-3, 3))
            p.add(path(f'M{cx - 60},{gy - 6} l12,-5 l10,6 l14,-7 l12,8', 1.0))
        else:
            for k in range(13):
                spike(p, cx - 60 + k * 10, gy, 2.4 + 1.6 * math.exp(-((k - 6) / 3) ** 2) * 2.2, lean=p.rnd.uniform(-4, 4))
            for (x, y) in [(cx - 30, 70), (cx + 22, 82)]:
                p.add(path(f'M{x - 8},{y} q4,-5 8,0 q4,-5 8,0', 1.4))
        p.label(text(cx, 286, names[i], 15, caps=False, italic=True))
    p.label(text(480, 316, 'The same tree, a step nearer the Hallow each time', 13, fill=SEPIA))
    p.add(line(380, 300, 580, 300, 0.6, SEPIA))
    frame(p, corner=False)
    p.save('The Blackthorn: one tree, from the Greenmarch to Thornhallow')


def plate_crown():
    p = Plate('crown', 700, 420, seed=8, rough=1.2)
    cx, cy = 350, 250
    # rays of dawn on the left, thorns on the right
    for k in range(17):
        a = math.radians(-180 + k * 11.25)
        if k < 8:
            p.add(line(cx + math.cos(a) * 150, cy - 40 + math.sin(a) * 120, cx + math.cos(a) * 250, cy - 40 + math.sin(a) * 190, 1.0, GOLD))
        elif k > 8:
            x0, y0 = cx + math.cos(a) * 150, cy - 40 + math.sin(a) * 120
            x1, y1 = cx + math.cos(a) * 240, cy - 40 + math.sin(a) * 180
            p.add(path(wiggle([(x0, y0), ((x0 + x1) / 2 + 6, (y0 + y1) / 2), (x1, y1)], 2, p.rnd, 20), 2.4))
            mx, my = (x0 + x1) / 2, (y0 + y1) / 2
            p.add(f'<path d="M{f(mx - 2)},{f(my)} l10,-6 l-6,8 Z" fill="{INK}"/>')
    # the circlet: back band, points, front band
    p.add(path(f'M{cx - 150},{cy} A150,42 0 0 1 {cx + 150},{cy}', 1.6))
    for k in range(9):
        t = (k + 0.5) / 9
        x = cx - 150 + 300 * t
        y = cy + 42 * math.sin(math.pi * t) * 0.9
        h = 70 + 40 * math.sin(math.pi * t)
        d = f'M{f(x - 13)},{f(y - 4)} L{f(x)},{f(y - h)} L{f(x + 13)},{f(y - 4)} Z'
        p.add(path(d, 1.4, fill=PAPER))
        if x > cx + 10:
            p.hatch(d, (x - 13, y - h, x + 13, y), 70, 2.4, 0.6, 0.7)
        p.add(f'<circle cx="{f(x)}" cy="{f(y - h * 0.45)}" r="4" fill="{PAPER}" stroke="{INK}" stroke-width="1"/>')
    band = f'M{cx - 150},{cy} A150,42 0 0 0 {cx + 150},{cy} L{cx + 150},{cy + 22} A150,42 0 0 1 {cx - 150},{cy + 22} Z'
    p.add(path(band, 1.8, fill=PAPER))
    p.hatch(band, (cx, cy, cx + 150, cy + 64), 80, 2.6, 0.6, 0.7)
    for k in range(7):
        t = (k + 0.5) / 7
        a = math.pi * t
        x = cx - 150 * math.cos(a)
        y = cy + 42 * math.sin(a) + 11
        p.add(f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="6" ry="5" fill="{PAPER}" stroke="{INK}" stroke-width="1.1"/>')
    p.label(f'<ellipse cx="{cx}" cy="{cy + 53}" rx="7" ry="6" fill="{RED}"/>')
    p.label(text(170, 392, 'Worn with love, it sings the dead to sleep.', 15))
    p.label(text(530, 392, 'Worn with hate, it wakes them.', 15))
    frame(p, corner=False)
    p.save('The Crown of Dawn')


def plate_victoria():
    p = Plate('victoria', 520, 640, seed=2, rough=1.0)
    cx, cy = 260, 300
    oval = f'M{cx - 190},{cy} A190,250 0 1 1 {cx + 190},{cy} A190,250 0 1 1 {cx - 190},{cy} Z'
    p.add(path(oval, 2.4, fill=PAPER))
    p.add(path(f'M{cx - 176},{cy} A176,236 0 1 1 {cx + 176},{cy} A176,236 0 1 1 {cx - 176},{cy} Z', 0.9))
    # beaded rim
    for k in range(60):
        a = 2 * math.pi * k / 60
        p.add(f'<circle cx="{f(cx + math.cos(a) * 183)}" cy="{f(cy + math.sin(a) * 243)}" r="2.2" fill="{INK}"/>')
    # the veil, falling behind her (light, hatched)
    veil = 'M232,112 C300,86 372,120 384,190 C402,290 420,380 428,470 C380,470 330,452 300,430 C320,360 330,280 300,210 C282,170 256,140 232,112 Z'
    p.add(path(veil, 1.2, fill=PAPER))
    p.hatch(veil, (232, 86, 430, 470), 105, 3.4, 0.6, 0.6)
    for k in range(4):
        p.add(path(f'M{318 + k * 22},{150 + k * 10} C{334 + k * 22},{240 + k * 10} {352 + k * 20},{340 + k * 6} {360 + k * 18},{450}', 0.8, op=0.8))
    # her profile (facing left), in solid ink
    face = [
        (236, 110), (206, 118), (186, 140), (178, 168), (177, 190), (172, 204), (168, 214), (171, 222),
        (168, 232), (160, 248), (152, 262), (155, 268), (163, 272), (162, 279), (159, 284), (163, 290),
        (162, 296), (166, 302), (164, 312), (172, 322), (186, 328), (198, 334), (204, 360), (206, 392),
        (196, 420), (180, 436), (310, 436), (306, 410), (300, 380), (304, 352), (322, 340), (340, 318),
        (338, 292), (348, 268), (342, 236), (322, 200), (306, 160), (284, 128), (262, 112),
    ]
    p.add(path(smooth(face, True), 1.2, fill=INK))
    # hair bound up, a curl at the nape
    p.add(path('M322,300 q22,8 18,30 q-4,16 -20,10', 1.6, PAPER, op=0.5))
    p.add(path('M300,180 q20,30 22,70', 1.2, PAPER, op=0.35))
    # the circlet
    for k in range(6):
        x = 196 + k * 18
        y = 124 - math.sin(k / 5 * math.pi) * 8
        p.add(f'<path d="M{f(x - 5)},{f(y + 4)} L{f(x)},{f(y - 12)} L{f(x + 5)},{f(y + 4)} Z" fill="{PAPER}" stroke="{INK}" stroke-width="1.1"/>')
    p.add(path('M188,130 Q250,104 300,122', 3, PAPER))
    p.add(path('M188,130 Q250,104 300,122', 1, INK))
    # one tear
    p.label(f'<path d="M190,236 q-4,8 0,12 q4,-4 0,-12 Z" fill="{PAPER}" stroke="{PAPER}" stroke-width="1"/>')
    banner(p, cx, 586, 300, 'Victoria', 26)
    p.save('Victoria, from a cameo kept by Nan Merrow')


def plate_potatoe():
    """Lord Potatoe Face as the realm sees him: a broadsheet portrait, dark and hateful."""
    p = Plate('potatoe', 520, 660, seed=21, rough=1.2)
    W, H = p.w, p.h
    # a dark ground, everything under it cross-hatched
    ground = f'M22,22 H{W - 22} V560 H22 Z'
    p.hatch(ground, (22, 22, W - 22, 560), 45, 3.2, 0.7, 0.8, cross=True)
    # high stiff collar and robe, black
    robe = 'M96,560 L130,420 C150,404 196,404 214,420 L262,446 L310,420 C328,404 374,404 394,420 L428,560 Z'
    p.add(path(robe, 1.6, fill=INK))
    collar = 'M150,470 L128,330 L214,404 Z M370,470 L392,330 L306,404 Z'
    p.add(path(collar, 1.6, fill=INK))
    p.add(path('M128,330 L214,404 M392,330 L306,404', 1.2, PAPER, op=0.35))
    # the head: a misshapen, pocked potato
    head = [(258, 138), (294, 146), (318, 160), (338, 186), (346, 216), (360, 238), (354, 266), (362, 294), (350, 324),
            (330, 352), (306, 374), (276, 392), (244, 394), (212, 382), (186, 358), (170, 328), (160, 298), (168, 270),
            (156, 240), (166, 206), (184, 178), (210, 154), (232, 142)]
    hd = smooth(head, True)
    p.add(path(hd, 2.2, fill=PAPER))
    p.wash(hd, WASH, 0.42)
    shade = 'M318,160 C360,214 372,300 316,370 C286,394 244,396 210,380 C296,360 344,290 318,160 Z'
    p.hatch(shade, (204, 160, 372, 396), 60, 2.4, 0.6, 0.85, cross=True)
    p.hatch('M170,250 C190,236 230,232 260,244 C290,232 330,236 350,250 L350,276 L170,276 Z', (170, 232, 350, 276), 0, 2.6, 0.5, 0.45)
    # pocks, warts, and pale sprouts worming out of the skin
    for (x, y, r) in [(206, 206, 4.5), (300, 186, 3.5), (334, 298, 4.5), (190, 318, 4), (292, 368, 3.5), (236, 172, 3), (342, 244, 3), (226, 300, 2.5)]:
        p.add(f'<path d="M{x - r},{y} q{r},{-r} {r * 2},0" fill="none" stroke="{INK}" stroke-width="1.3"/>')
        p.add(f'<circle cx="{x}" cy="{y + 1.6}" r="{r * 0.45}" fill="{INK}"/>')
    for (x, y, r) in [(276, 176, 5), (184, 270, 4), (322, 330, 6), (248, 380, 3.5)]:
        p.add(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{PAPER}" stroke="{INK}" stroke-width="1.3"/>')
        p.stipple(lambda a, b, x=x, y=y, r=r: (a - x) ** 2 + (b - y) ** 2 < (r * 0.8) ** 2, (x - r, y - r, x + r, y + r), 8, 0.6, INK, 0.9)
    p.stipple(lambda x, y: (x - 260) ** 2 / 92 ** 2 + (y - 268) ** 2 / 120 ** 2 < 1, (168, 148, 352, 390), 110, 0.8, INK, 0.65)
    for d in ['M178,226 C152,218 140,196 150,180 C156,172 164,176 160,186', 'M340,206 C364,190 372,168 362,156 C356,150 348,156 354,166',
              'M188,334 C164,346 150,370 160,384', 'M226,150 C218,128 224,112 236,108']:
        p.add(path(d, 4.4, INK), path(d, 2.2, PAPER))
    # a heavy, furrowed brow over narrow eyes; the eyes look down at you
    p.add(path('M196,240 C214,236 232,242 248,254', 5.0), path('M324,240 C306,236 288,242 272,254', 5.0))
    p.add(path('M254,232 L257,252 M266,232 L263,252 M260,226 L260,246', 1.4))
    for side in (-1, 1):
        ex = 260 + side * 38
        p.add(path(f'M{ex - 16},264 Q{ex},254 {ex + 16},264 Q{ex},270 {ex - 16},264 Z', 1.6, fill=PAPER))
        p.add(path(f'M{ex - 17},262 Q{ex},250 {ex + 17},262', 3.0))
        p.add(f'<circle cx="{ex - side * 3}" cy="{264}" r="3.2" fill="{INK}"/>')
        p.add(path(f'M{ex - 13},274 Q{ex},282 {ex + 13},274 M{ex - 10},280 Q{ex},286 {ex + 10},280', 1.0, op=0.85))
    # a bulbous, warty nose
    nose = 'M248,268 C232,292 232,320 252,330 C270,338 296,328 296,308 C296,290 280,280 272,266 Z'
    p.add(path(nose, 1.9, fill=PAPER))
    p.wash(nose, WASH, 0.4)
    p.hatch('M270,272 C290,288 300,316 268,332 C284,312 282,290 270,272 Z', (262, 270, 300, 334), 60, 2.0, 0.6, 0.9)
    p.add(f'<ellipse cx="256" cy="322" rx="5" ry="3" fill="{INK}"/><ellipse cx="282" cy="324" rx="5" ry="3" fill="{INK}"/>')
    p.add(f'<circle cx="286" cy="300" r="4.2" fill="{PAPER}" stroke="{INK}" stroke-width="1.2"/>')
    # the sneer: lip curled on one side, crooked teeth, deep folds
    p.add(path('M218,348 Q244,336 262,342 Q286,328 312,338 Q292,362 262,364 Q236,362 218,348 Z', 1.6, fill=INK))
    for (x, y, w, h, r) in [(238, 342, 7, 8, -6), (247, 344, 6, 7, 4), (264, 341, 7, 10, -3), (284, 337, 6, 7, 8), (294, 337, 7, 9, -5)]:
        p.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#efe2bf" stroke="{INK}" stroke-width="0.8" transform="rotate({r} {x + w / 2} {y + h / 2})"/>')
    p.add(path('M232,316 Q212,334 210,354 M300,312 Q322,326 322,346', 1.6))
    p.add(path('M222,374 Q262,392 304,372 M238,386 Q262,398 288,386', 1.4))
    # the crown of roots, thorned
    for k in range(7):
        x = 194 + k * 22
        top = 96 - 30 * math.sin(k / 6 * math.pi)
        d = wiggle([(x - 4, 164), (x + p.rnd.uniform(-6, 6), (164 + top) / 2), (x + p.rnd.uniform(-8, 8), top)], 2.6, p.rnd, 14)
        p.add(path(d, 3.6), path(d, 1, PAPER, op=0.35))
        p.add(f'<path d="M{x - 2},{f((164 + top) / 2)} l-9,-4 l8,-3 Z" fill="{INK}"/>')
    p.add(path('M184,168 C220,148 300,148 338,168', 7.5), path('M184,168 C220,148 300,148 338,168', 2, PAPER, op=0.4))
    # a ringed fist holding up her keys: a big iron ring, three keys hanging over the black robe
    hand = 'M350,452 C338,440 342,420 360,418 L396,422 C408,426 408,440 398,444 C408,450 404,462 394,464 L362,468 C354,468 350,462 350,452 Z'
    p.add(path(hand, 1.6, fill=PAPER))
    p.add(path('M362,432 h30 M362,446 h32', 0.9))
    for (x, y) in [(374, 422), (388, 424)]:
        p.add(f'<rect x="{x - 3}" y="{y - 4}" width="6" height="9" rx="2" fill="{GOLD}" stroke="{INK}" stroke-width="1"/>')
    p.add(f'<circle cx="378" cy="486" r="18" fill="none" stroke="{PAPER}" stroke-width="7"/>')
    p.add(f'<circle cx="378" cy="486" r="18" fill="none" stroke="{INK}" stroke-width="2.2"/>')
    for (x0, rot) in [(366, 14), (378, 0), (390, -14)]:
        g = f'<g transform="rotate({rot} {x0} 502)">'
        g += f'<circle cx="{x0}" cy="510" r="7" fill="{PAPER}" stroke="{INK}" stroke-width="2"/><circle cx="{x0}" cy="510" r="2.6" fill="{INK}"/>'
        g += f'<path d="M{x0 - 2.5},517 V552 H{x0 + 2.5} V517 Z" fill="{PAPER}" stroke="{INK}" stroke-width="1.6"/>'
        g += f'<path d="M{x0 + 2.5},540 h8 v4 h-4 v4 h4 v4 h-8 Z" fill="{PAPER}" stroke="{INK}" stroke-width="1.4"/></g>'
        p.add(g)
    banner(p, W / 2, 604, 380, 'Lord Potatoe Face', 22)
    frame(p, corner=False)
    p.save('Lord Potatoe Face, from a broadsheet nailed to the church door at Millbrook')


def plate_oak():
    p = Plate('oak', 820, 480, seed=13, rough=1.4)
    W = p.w
    # the far shore and hills, the still lake
    p.add(path(wiggle([(22, 250), (160, 232), (300, 244), (480, 222), (640, 238), (W - 22, 228)], 3, p.rnd, 30), 1.2))
    p.add(path(wiggle([(300, 236), (420, 200), (560, 214), (700, 196), (W - 22, 210)], 3, p.rnd, 30), 0.9, op=0.7))
    for k in range(14):
        y = 262 + k * 9
        x0 = p.rnd.uniform(300, 420) - k * 6
        p.add(line(x0, y, x0 + p.rnd.uniform(160, 320), y, 0.8, SEPIA, 0.8))
    # reeds
    for k in range(26):
        x = 420 + k * 14 + p.rnd.uniform(-4, 4)
        h = p.rnd.uniform(26, 54)
        p.add(path(f'M{f(x)},{388} q{f(p.rnd.uniform(-6, 6))},{f(-h / 2)} {f(p.rnd.uniform(-4, 10))},{f(-h)}', 1.0))
        if k % 4 == 0:
            p.add(f'<ellipse cx="{f(x + 4)}" cy="{f(388 - h + 4)}" rx="2.4" ry="7" fill="{INK}"/>')
    p.add(path(wiggle([(22, 392), (300, 384), (560, 392), (W - 22, 386)], 2, p.rnd, 20), 1.4))
    # the hollow oak
    trunk = 'M168,400 C188,340 180,270 190,210 C194,180 204,166 214,160 L256,160 C266,168 274,182 278,212 C286,270 276,340 296,400 Z'
    p.add(path(trunk, 2.0, fill=PAPER))
    p.hatch(trunk, (150, 140, 306, 400), 85, 3.2, 0.7, 0.7)
    for k in range(5):
        p.add(path(wiggle([(186 + k * 22, 396), (192 + k * 18, 300), (200 + k * 15, 214)], 2, p.rnd, 24), 0.9, op=0.8))
    hollow = 'M206,330 C200,300 212,272 230,268 C250,270 258,300 252,332 C244,344 214,344 206,330 Z'
    p.add(path(hollow, 1.8, fill=INK))
    # the feathers left in it
    p.add(path('M224,300 C214,262 224,236 246,226 C244,252 238,280 232,302', 1.2, fill=PAPER))
    p.add(path('M232,302 C232,270 238,248 246,226', 0.9))
    p.label(f'<path d="M214,312 C196,286 196,262 206,248 C212,268 216,290 220,314 Z" fill="{INK}" stroke="{PAPER}" stroke-width="1"/>')
    # canopy: leafy lobes over the trunk
    for (x, y, rr) in [(110, 150, 40), (150, 100, 46), (210, 70, 50), (280, 66, 48), (340, 100, 44), (370, 150, 38),
                       (300, 130, 46), (230, 120, 50), (160, 150, 40), (250, 160, 36)]:
        pts = []
        for i in range(16):
            a = 2 * math.pi * i / 16
            k = 1 + (0.1 if i % 2 else -0.05) + p.rnd.uniform(-0.04, 0.04)
            pts.append((x + math.cos(a) * rr * k, y + math.sin(a) * rr * k * 0.82))
        d = smooth(pts, True)
        p.add(path(d, 1.3, fill=PAPER))
        p.stipple(lambda a, b, x=x, y=y, rr=rr: (a - x - rr * 0.3) ** 2 + (b - y - rr * 0.3) ** 2 < (rr * 0.72) ** 2,
                  (x - rr, y - rr, x + rr, y + rr), 60, 0.9, INK, 0.8)
        p.add(path(f'M{f(x - rr * 0.5)},{f(y - rr * 0.25)} q{f(rr * 0.3)},{f(-rr * 0.35)} {f(rr * 0.7)},{f(-rr * 0.3)}', 0.8, op=0.7))
    # roots
    for d in ['M150,400 q-30,4 -52,14', 'M306,400 q30,4 56,16', 'M200,400 q-6,10 -20,18', 'M270,400 q10,10 26,16']:
        p.add(path(d, 2.2))
    # a goose flying over the water
    p.add(path('M600,120 q14,-12 26,0 q12,-12 26,0', 1.6))
    frame(p)
    p.save('The hollow oak on the shore of Lake Ellory')


def plate_bridge():
    p = Plate('bridge', 860, 480, seed=17, rough=1.4)
    W = p.w
    # mist and dark water
    for k in range(10):
        y = 300 + k * 14
        p.add(line(40 + p.rnd.uniform(0, 120), y, W - 40 - p.rnd.uniform(0, 120), y, 0.8, SEPIA, 0.7))
    p.hatch(f'M22,330 H{W - 22} V458 H22 Z', (22, 330, W - 22, 458), 0, 4, 0.7, 0.5, jitter=1.4)
    # the bridge: one high arch
    br = 'M180,300 L200,236 L660,236 L680,300 L560,300 C552,232 308,232 300,300 Z'
    p.add(path(br, 2.0, fill=PAPER))
    p.hatch(br, (180, 230, 680, 300), 90, 4.2, 0.6, 0.5)
    for k in range(13):
        x = 210 + k * 37
        p.add(line(x, 236, x, 214, 1.2))
    p.add(path('M200,214 H660', 1.6))
    for k in range(8):
        x = 316 + k * 30
        p.add(path(f'M{x},{248 + abs(k - 3.5) * 4} l12,-4', 0.8, op=0.8))
    # the knight who will not move
    p.add(path('M444,172 Q470,196 480,236 L446,236 Z', 1.2, fill=INK))
    for d in ['M418,236 L420,204 L428,204 L428,236 Z', 'M432,236 L432,204 L440,204 L442,236 Z',
              'M414,210 L411,180 L420,170 L440,170 L449,180 L446,210 Z', 'M421,170 L420,152 Q430,140 440,152 L439,170 Z']:
        p.add(path(d, 1.2, fill=INK))
    p.add('<ellipse cx="414" cy="176" rx="9" ry="6" fill="#33200f"/><ellipse cx="446" cy="176" rx="9" ry="6" fill="#33200f"/>')
    p.add(path('M424,158 H436', 1.4, PAPER))
    p.add(path('M430,236 L430,196', 2.6, PAPER), path('M421,196 H439', 2.2, PAPER))
    p.add('<circle cx="430" cy="190" r="5" fill="#33200f"/>')
    # weeping willows, black and thorned
    for (x, flip) in [(110, 1), (760, -1)]:
        p.add(path(wiggle([(x, 330), (x + 4 * flip, 230), (x - 6 * flip, 120)], 2, p.rnd, 26), 9))
        for k in range(26):
            a = -math.pi / 2 + (k - 12.5) * 0.12
            sx, sy = x - 6 * flip + math.cos(a) * 20, 120 + math.sin(a) * 12
            ex = sx + math.cos(a) * 120 + p.rnd.uniform(-20, 20)
            ey = 230 + p.rnd.uniform(0, 110)
            d = f'M{f(sx)},{f(sy)} Q{f(sx + math.cos(a) * 110)},{f(sy - 40)} {f(ex)},{f(ey)}'
            p.add(path(d, 1.2))
            if k % 3 == 0:
                p.add(f'<path d="M{f(ex - 2)},{f(ey)} l2,-9 l2,9 Z" fill="{INK}"/>')
    # bone spikes along the banks
    for k in range(18):
        x = 40 + k * 46 + p.rnd.uniform(-10, 10)
        if 170 < x < 690:
            continue
        spike(p, x, 330, p.rnd.uniform(1.2, 2.2), bone=k % 2 == 0, lean=p.rnd.uniform(-3, 3))
    frame(p)
    p.save('The Weeping Bridge, and the knight who guards it')


def emblem(p, x, y, kind):
    s = 1.0
    if kind == 'bell':
        d = f'M{x - 26},{y + 20} C{x - 22},{y + 4} {x - 20},{y - 24} {x},{y - 28} C{x + 20},{y - 24} {x + 22},{y + 4} {x + 26},{y + 20} Z'
        p.add(path(d, 1.6, fill=PAPER))
        p.hatch(d, (x, y - 28, x + 26, y + 20), 80, 2.6, 0.6, 0.7)
        p.add(path(f'M{x - 30},{y + 20} H{x + 30}', 2.2), f'<circle cx="{x}" cy="{y + 26}" r="5" fill="{INK}"/>')
        p.add(path(f'M{x},{y - 28} v-8', 2))
        p.add(path(f'M{x + 34},{y - 20} q8,10 0,22 M{x + 42},{y - 26} q12,16 0,34', 1.1))
    elif kind == 'sword':
        p.add(path(f'M{x - 34},{y + 26} Q{x},{y - 2} {x + 34},{y + 26}', 2.0))
        p.add(path(f'M{x - 40},{y + 26} H{x + 40}', 1.4))
        p.add(path(f'M{x - 4},{y + 14} L{x - 4},{y - 22} L{x},{y - 28} L{x + 4},{y - 22} L{x + 4},{y + 14} Z', 1.2, fill=PAPER))
        p.add(path(f'M{x - 14},{y - 22} H{x + 14} M{x},{y - 22} V{y - 36}', 2.4))
        p.add(f'<circle cx="{x}" cy="{y - 39}" r="3.4" fill="{INK}"/>')
    elif kind == 'letter':
        d = f'M{x - 32},{y - 20} H{x + 32} V{y + 22} H{x - 32} Z'
        p.add(path(d, 1.6, fill=PAPER))
        p.add(path(f'M{x - 32},{y - 20} L{x},{y + 4} L{x + 32},{y - 20}', 1.2))
        p.label(f'<circle cx="{x}" cy="{y + 4}" r="8" fill="{RED}"/>')
        p.add(path(f'M{x + 18},{y + 30} q6,6 14,4 M{x - 30},{y + 32} q10,4 18,-2', 1.0, op=0.7))
    elif kind == 'hand':
        for k in range(4):
            yy = y + 16 + k * 6
            p.add(path(f'M{x - 38 + k * 4},{yy} q10,-4 20,0 q10,4 20,0 q10,-4 20,0 q8,3 14,0', 0.9, SEPIA))
        hand = f'M{x - 10},{y + 18} L{x - 12},{y - 6} L{x - 16},{y - 22} Q{x - 14},{y - 26} {x - 10},{y - 22} L{x - 6},{y - 10} L{x - 6},{y - 30} Q{x - 3},{y - 34} {x},{y - 30} L{x},{y - 10} L{x + 3},{y - 32} Q{x + 6},{y - 35} {x + 8},{y - 31} L{x + 6},{y - 8} L{x + 11},{y - 26} Q{x + 14},{y - 28} {x + 16},{y - 24} L{x + 12},{y + 2} L{x + 10},{y + 18} Z'
        p.add(path(hand, 1.4, fill=PAPER))
        p.hatch(hand, (x - 16, y - 35, x + 16, y + 18), 70, 2.4, 0.5, 0.5)
    elif kind == 'tray':
        p.add(path(f'M{x - 38},{y + 14} H{x + 38} L{x + 32},{y + 22} H{x - 32} Z', 1.4, fill=PAPER))
        p.add(path(f'M{x - 20},{y + 14} V{y - 2} Q{x - 12},{y - 6} {x - 4},{y - 2} V{y + 14}', 1.2, fill=PAPER))
        p.add(path(f'M{x - 4},{y + 2} q8,0 6,8', 1.0))
        p.add(path(f'M{x + 8},{y + 12} Q{x + 20},{y - 2} {x + 30},{y + 12}', 1.2, fill=PAPER))
        p.add(path(f'M{x + 14},{y - 6} q-4,-12 6,-20 q-2,10 -2,20', 1.0))
        p.add(path(f'M{x - 12},{y - 12} q4,-6 0,-12 M{x - 8},{y - 14} q4,-6 0,-12', 0.9, op=0.7))
    elif kind == 'mask':
        d = f'M{x - 26},{y - 22} Q{x},{y - 34} {x + 26},{y - 22} Q{x + 30},{y + 6} {x},{y + 30} Q{x - 30},{y + 6} {x - 26},{y - 22} Z'
        p.add(path(d, 1.6, fill=PAPER))
        for side in (-1, 1):
            p.add(path(f'M{x + side * 6},{y - 8} q{side * 7},-6 {side * 14},0', 2.0))
        p.add(path(f'M{x - 14},{y + 6} Q{x},{y + 20} {x + 14},{y + 6}', 2.0))
        for k in range(5):
            p.add(line(x - 10 + k * 5, y + 9 + (2 - abs(k - 2)) * 2, x - 10 + k * 5, y + 14 + (2 - abs(k - 2)) * 2, 0.9))
    elif kind == 'brick':
        for row in range(4):
            for col in range(3):
                bx = x - 36 + col * 24 + (12 if row % 2 else 0)
                by = y - 22 + row * 12
                if bx > x + 24:
                    continue
                p.add(path(f'M{bx},{by} h22 v10 h-22 Z', 1.0, fill=PAPER))
        p.add(path(f'M{x + 18},{y + 30} L{x + 40},{y + 14} L{x + 44},{y + 20} L{x + 24},{y + 34} Z', 1.2, fill=INK))
        p.add(path(f'M{x + 20},{y + 32} l-8,6', 2.0))
    elif kind == 'veil':
        d = f'M{x},{y - 30} C{x - 30},{y - 26} {x - 34},{y + 6} {x - 30},{y + 30} L{x + 30},{y + 30} C{x + 34},{y + 6} {x + 30},{y - 26} {x},{y - 30} Z'
        p.add(path(d, 1.4, fill=PAPER))
        for k in range(5):
            p.add(path(f'M{x - 12 + k * 6},{y - 22} C{x - 18 + k * 9},{y} {x - 22 + k * 11},{y + 18} {x - 24 + k * 12},{y + 30}', 0.8, op=0.8))
        p.add(path(f'M{x + 34},{y - 18} v-14 l10,-3 v14', 1.2))
        p.add(f'<ellipse cx="{x + 31}" cy="{y - 17}" rx="4" ry="3" fill="{INK}"/><ellipse cx="{x + 41}" cy="{y - 20}" rx="4" ry="3" fill="{INK}"/>')


def plate_court():
    p = Plate('court', 960, 560, seed=29, rough=1.2)
    items = [
        ('bell', 'The Bell-Ringer'), ('sword', "The Queen's Jailer"), ('letter', 'The Unsent'), ('hand', 'The Ones Who Are Not Him'),
        ('tray', 'The Kitchen Girl'), ('mask', 'The Smiling Hostess'), ('brick', 'The Mason'), ('veil', 'The White Lady'),
    ]
    for i, (kind, name) in enumerate(items):
        col, row = i % 4, i // 4
        x, y = 130 + col * 233, 150 + row * 230
        p.add(f'<circle cx="{x}" cy="{y}" r="74" fill="{PAPER}" stroke="{INK}" stroke-width="2"/>')
        p.add(f'<circle cx="{x}" cy="{y}" r="67" fill="none" stroke="{INK}" stroke-width="0.8"/>')
        for k in range(24):
            a = 2 * math.pi * k / 24
            p.add(f'<circle cx="{f(x + math.cos(a) * 70.5)}" cy="{f(y + math.sin(a) * 70.5)}" r="1.4" fill="{INK}"/>')
        emblem(p, x, y, kind)
        # a scrap of black lace, tied on
        lx, ly = x + 46, y + 50
        p.add(path(f'M{lx - 14},{ly - 8} q10,-6 22,2 q-4,10 -2,20 q-12,-6 -22,-2 q4,-10 2,-20 Z', 1.0, fill=INK))
        for k in range(3):
            p.add(f'<circle cx="{lx - 6 + k * 6}" cy="{ly + 2 + (k % 2) * 3}" r="1.6" fill="{PAPER}"/>')
        p.label(text(x, y + 104, name, 16, caps=True, spacing=1))
    p.label(text(480, 536, 'Each captain wears a scrap of black lace, torn from her veil', 13, fill=SEPIA))
    frame(p, corner=False)
    p.save('The Mourning Court, as the heroes came to know it')


def plate_box():
    p = Plate('box', 640, 460, seed=31, rough=1.1)
    cx = 320
    # the lid, thrown back
    lid = 'M190,212 L214,96 L450,96 L430,212 Z'
    p.add(path(lid, 1.8, fill=PAPER))
    p.hatch(lid, (190, 96, 450, 212), 15, 3.6, 0.6, 0.45)
    p.add(path('M232,112 H434 L418,196 H210 Z', 1.0))
    for k in range(6):
        p.add(path(f'M{250 + k * 30},{150} q10,-14 20,0 q-10,14 -20,0', 0.9))
    # the box
    front = 'M180,250 H460 V350 H180 Z'
    top = 'M180,250 L210,212 H430 L460,250 Z'
    p.add(path(top, 1.6, fill=PAPER))
    p.add(path('M200,246 L222,220 H420 L440,246 Z', 1.0, fill=INK))
    p.add(path(front, 1.8, fill=PAPER))
    p.hatch(front, (180, 250, 460, 350), 80, 3.0, 0.6, 0.55)
    for k in range(5):
        x = 196 + k * 62
        p.add(path(f'M{x},{300} q12,-22 24,0 q-12,22 -24,0', 1.1, fill=PAPER))
    p.add(path('M180,350 L172,366 H468 L460,350', 1.6))
    for x in (186, 454):
        p.add(f'<circle cx="{x}" cy="{372}" r="7" fill="{PAPER}" stroke="{INK}" stroke-width="1.4"/>')
    # the heart inside, grey and still
    heart = 'M320,250 C300,228 270,232 272,214 C274,198 296,196 306,210 C312,198 334,196 338,212 C342,230 330,240 320,250 Z'
    p.add(path(heart, 1.4, fill=PAPER))
    p.hatch(heart, (272, 196, 342, 250), 45, 2.2, 0.6, 0.85, cross=True)
    p.add(path('M318,206 q4,-10 12,-12 M306,210 q-2,-10 -10,-12', 1.2))
    # black lace spilling over the edge
    lace = 'M380,250 C400,262 404,290 396,320 C390,336 376,344 370,360 C362,340 372,320 368,296 C364,274 372,258 380,250 Z'
    p.add(path(lace, 1.2, fill=INK))
    for k in range(6):
        p.add(f'<circle cx="{376 + (k % 2) * 8}" cy="{268 + k * 14}" r="2" fill="{PAPER}"/>')
    p.label(text(cx, 420, '“My heart belongs to my queen.”', 18, fill=INK))
    frame(p, corner=False)
    p.save('The silver box on the windowsill')


def moth_glyph(p, x, y, s=1.0, rot=0):
    g = f'<g transform="translate({f(x)} {f(y)}) rotate({rot}) scale({s})">'
    g += f'<path d="M0,0 C-6,-9 -15,-8 -14,-1 C-13,4 -6,4 0,1 C6,4 13,4 14,-1 C15,-8 6,-9 0,0 Z" fill="{PAPER}" stroke="{INK}" stroke-width="1"/>'
    g += f'<path d="M0,1 C-4,5 -9,9 -6,11 C-3,12 -1,7 0,3 C1,7 3,12 6,11 C9,9 4,5 0,1 Z" fill="{PAPER}" stroke="{INK}" stroke-width="0.9"/>'
    g += f'<circle cx="-8" cy="-2" r="1.6" fill="{INK}"/><circle cx="8" cy="-2" r="1.6" fill="{INK}"/>'
    g += f'<path d="M0,-2 L0,8" stroke="{INK}" stroke-width="1.8"/><path d="M0,-2 q-3,-5 -6,-6 M0,-2 q3,-5 6,-6" fill="none" stroke="{INK}" stroke-width="0.7"/></g>'
    p.add(g)


def plate_moth():
    p = Plate('moth', 760, 640, seed=41, rough=1.3)
    W, H = p.w, p.h
    # night sky, a thin moon
    sky = f'M22,22 H{W - 22} V{H - 22} H22 Z'
    p.hatch(sky, (22, 22, W - 22, H - 22), 0, 3.4, 0.7, 0.7, jitter=1.0)
    mid = p.uid('moon')
    p.defs.append(f'<mask id="{mid}"><rect width="{W}" height="{H}" fill="white"/><circle cx="694" cy="104" r="34" fill="black"/><circle cx="710" cy="94" r="31" fill="white"/></mask>')
    p.add(f'<g mask="url(#{mid})"><circle cx="694" cy="104" r="34" fill="{PAPER}" stroke="{INK}" stroke-width="1.2"/></g>')
    # the tower wall: stone courses, shaded to the right
    wall = f'M430,22 H{W - 120} V{H - 22} H430 Z'
    p.add(path(wall, 1.6, fill=PAPER))
    for row in range(28):
        y = 22 + row * 22
        if y >= H - 22:
            break
        p.add(line(430, y, W - 120, y, 0.9))
        off = 0 if row % 2 else 30
        for k in range(5):
            x = 430 + off + k * 60
            if x < W - 120:
                p.add(line(x, y, x, min(y + 22, H - 22), 0.8))
    p.hatch(f'M560,22 H{W - 120} V{H - 22} H560 Z', (560, 22, W - 120, H - 22), 80, 3.0, 0.6, 0.55)
    p.add(path(f'M{W - 120},22 V{H - 22}', 2.4))
    # the bricked-up window: one slit of warm light
    p.label('<ellipse cx="500" cy="250" rx="70" ry="110" fill="url(#moth-glow)"/>')
    p.add(path('M488,186 L488,316 L512,316 L512,186 Q500,170 488,186 Z', 1.8, fill=INK))
    p.label('<path d="M492,190 L492,312 L508,312 L508,190 Q500,178 492,190 Z" fill="#ffd27a"/>')
    for y in (206, 232, 258, 284):
        p.add(line(478, y, 522, y, 0.8))
    # the Grey Moth: a hooded thing of dust, its cloak spread like a moth's wings
    X = 262
    for side in (-1, 1):
        k = 1.0 if side < 0 else 0.9
        fore = [(X, 230), (X + side * 70 * k, 150), (X + side * 150 * k, 120), (X + side * 190 * k, 150),
                (X + side * 170 * k, 220), (X + side * 110 * k, 268), (X, 270)]
        hind = [(X, 270), (X + side * 90 * k, 284), (X + side * 140 * k, 330), (X + side * 120 * k, 390),
                (X + side * 60 * k, 400), (X, 330)]
        for pts, ang in ((hind, 30), (fore, 60)):
            d = smooth(pts, True)
            p.add(path(d, 1.6, fill=PAPER))
            xs = [q[0] for q in pts]
            ys = [q[1] for q in pts]
            p.hatch(d, (min(xs), min(ys), max(xs), max(ys)), ang, 3.6, 0.6, 0.55)
        for v in range(4):
            p.add(path(f'M{X},{240 + v * 6} Q{f(X + side * (60 + v * 20) * k)},{190 - v * 4} {f(X + side * (120 + v * 18) * k)},{150 + v * 18}', 0.8, op=0.8))
        ex = X + side * 118 * k
        p.add(f'<circle cx="{f(ex)}" cy="196" r="20" fill="{PAPER}" stroke="{INK}" stroke-width="1.4"/>')
        p.add(f'<circle cx="{f(ex)}" cy="196" r="11" fill="{INK}"/><circle cx="{f(ex + 3)}" cy="192" r="3" fill="{PAPER}"/>')
        for v in range(6):
            x = X + side * (20 + v * 18) * k
            p.add(path(f'M{f(x)},{398 - v * 6} q{side * 4},14 {side * -2},26', 1.0, op=0.8))
    body = f'M{X - 14},240 C{X - 20},300 {X - 24},380 {X - 10},470 L{X + 10},470 C{X + 24},380 {X + 20},300 {X + 14},240 Z'
    p.add(path(body, 1.4, fill=INK))
    p.add(path(f'M{X - 18},250 C{X - 24},214 {X - 14},188 {X},184 C{X + 14},188 {X + 24},214 {X + 18},250 Z', 1.4, fill=INK))
    p.add(path(f'M{X - 10},246 C{X - 10},226 {X - 6},212 {X},208 C{X + 6},212 {X + 10},226 {X + 10},246 Z', 1, fill='#000000'))
    # an arm of dust reaching to the slit, a grey book in its fingers
    p.add(path(f'M{X + 14},262 C{X + 80},258 {X + 150},252 482,244', 3.2))
    p.add(path('M470,232 L494,236 L490,262 L466,258 Z', 1.4, fill=PAPER))
    p.hatch('M470,232 L494,236 L490,262 L466,258 Z', (466, 232, 494, 262), 20, 2.2, 0.5, 0.7)
    p.add(path('M472,236 L468,256', 2.0))
    # dust trailing below, and moths drawn to the light
    p.stipple(lambda x, y: X - 26 < x < X + 26 and 470 < y < 600, (X - 30, 470, X + 30, 600), 120, 1.1, INK, 0.7)
    for (x, y, sc, r) in [(540, 180, 0.9, 20), (556, 300, 1.1, -15), (468, 140, 0.8, 10), (600, 236, 0.7, 30),
                          (120, 470, 0.9, -20), (470, 360, 0.8, 5), (180, 540, 0.7, 25)]:
        moth_glyph(p, x, y, sc, r)
    # his lantern, set down on a ledge, out
    p.add(path('M352,520 v14 M340,534 h24 l-4,30 h-16 Z', 1.4, fill=PAPER))
    p.add(path('M344,540 l16,18 M360,540 l-16,18', 0.8))
    p.add(path('M320,566 H420', 1.6))
    frame(p)
    p.save("The Grey Moth at the queen's window")


PLATES = {
    'map': plate_map, 'thornhallow': plate_thornhallow, 'blackthorn': plate_blackthorn, 'crown': plate_crown,
    'victoria': plate_victoria, 'potatoe': plate_potatoe, 'oak': plate_oak, 'bridge': plate_bridge,
    'court': plate_court, 'box': plate_box, 'moth': plate_moth,
}

if __name__ == '__main__':
    for name in sys.argv[1:] or PLATES:
        PLATES[name]()
        print('wrote', name)
