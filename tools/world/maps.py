"""Compose region layouts (src/data/regions) from shapes: water bodies, roads, forest edges,
fields and scattered trees, rocks and flowers. Each map is authored by hand here as a list
of deliberate strokes; the output is the layout rows the game reads (one character per
tile, see TILE_CHARS in src/sim/map.ts).

    python3 maps.py preview <name> out.png   # top-down preview with props and spots
    python3 maps.py write                    # write every layout into its region file
"""
import math
import os
import re
import sys
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../..')


def hsh(*a):
    h = 2166136261
    for v in a:
        h = ((h ^ (int(v) & 0xFFFFFFFF)) * 16777619) & 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFFFFFF) / 4294967296


class Map:
    def __init__(self, w, h, fill='.'):
        self.w, self.h = w, h
        self.g = [[fill] * w for _ in range(h)]
        self.props = []  # (kind, c, r, w, h)
        self.marks = {}  # name -> (c, r)
        self.keep = set()  # tiles that scatter must not touch

    def inside(self, c, r):
        return 0 <= c < self.w and 0 <= r < self.h

    def set(self, c, r, ch, keep=False):
        if self.inside(c, r):
            self.g[r][c] = ch
            if keep:
                self.keep.add((c, r))

    def get(self, c, r):
        return self.g[r][c] if self.inside(c, r) else None

    def rect(self, c0, r0, c1, r1, ch, keep=False):
        for r in range(r0, r1 + 1):
            for c in range(c0, c1 + 1):
                self.set(c, r, ch, keep)

    def blob(self, cx, cy, rx, ry, ch, seed=0, rough=0.18, keep=False):
        """An irregular round shape (lakes, groves, ash patches)."""
        for r in range(int(cy - ry - 3), int(cy + ry + 4)):
            for c in range(int(cx - rx - 3), int(cx + rx + 4)):
                a = math.atan2(r - cy, c - cx)
                k = 1 + rough * (math.sin(a * 3 + seed) * 0.6 + math.sin(a * 5 + seed * 2.3) * 0.4)
                if ((c - cx) / (rx * k)) ** 2 + ((r - cy) / (ry * k)) ** 2 <= 1:
                    self.set(c, r, ch, keep)

    def path(self, pts, width, ch, keep=True, wobble=0.0, seed=0):
        """A road or river along a polyline, `width` tiles wide."""
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            n = int(max(abs(x1 - x0), abs(y1 - y0)) * 3) + 1
            for i in range(n + 1):
                t = i / n
                x = x0 + (x1 - x0) * t
                y = y0 + (y1 - y0) * t
                off = wobble * math.sin((x + y) * 0.35 + seed)
                for dx in range(width):
                    for dy in range(width):
                        cx = int(round(x + off - width / 2 + 0.5 + dx))
                        cy = int(round(y - width / 2 + 0.5 + dy))
                        self.set(cx, cy, ch, keep)

    def border(self, depth=2, ch='T', seed=0):
        """Forest round the edge: `depth` tiles, ragged on the inside."""
        for r in range(self.h):
            for c in range(self.w):
                d = min(c, r, self.w - 1 - c, self.h - 1 - r)
                extra = int(hsh(c // 2, r // 2, seed) * 3)
                if d < depth + extra * (1 if d >= depth else 0) and (d < depth or hsh(c, r, seed + 1) < 0.55):
                    if (c, r) not in self.keep:
                        self.g[r][c] = ch

    def scatter(self, c0, r0, c1, r1, ch, density, seed=0, on='.', spacing=1):
        for r in range(r0, r1 + 1):
            for c in range(c0, c1 + 1):
                if not self.inside(c, r) or (c, r) in self.keep or self.g[r][c] != on:
                    continue
                if hsh(c, r, seed) < density:
                    near = any(self.get(c + dx, r + dy) == ch for dx in range(-spacing, spacing + 1) for dy in range(-spacing, spacing + 1) if (dx or dy))
                    if spacing and near:
                        continue
                    self.g[r][c] = ch

    def prop(self, kind, c, r, w, h, clear='.'):
        """Place a building or prop and clear its footprint (and a ring round it) of trees and rocks."""
        self.props.append((kind, c, r, w, h))
        for rr in range(r - 1, r + h + 1):
            for cc in range(c - 1, c + w + 1):
                if self.get(cc, rr) in ('T', 'o', '*'):
                    self.set(cc, rr, clear)
                self.keep.add((cc, rr))

    def mark(self, name, c, r):
        self.marks[name] = (c, r)
        self.keep.add((c, r))
        if self.get(c, r) in ('T', 'o', '*'):
            self.set(c, r, '.')

    def spot(self, c, r, ring=1):
        """Keep a tile clear (someone stands there, or something lies there), and the tiles round it."""
        for rr in range(r - ring, r + ring + 1):
            for cc in range(c - ring, c + ring + 1):
                self.keep.add((cc, rr))
                if self.get(cc, rr) in ('T', 'o', '*'):
                    self.set(cc, rr, '.')

    def rows(self):
        return [''.join(r) for r in self.g]


PROP_SIZE = {
    'cottage': (3, 2), 'cottage2': (3, 2), 'nan_cottage': (3, 2), 'mill': (4, 3), 'chapel': (4, 6), 'smithy': (3, 2),
    'stall': (2, 2), 'well': (1, 1), 'fence_x': (1, 1), 'fence_y': (1, 1), 'tent': (2, 2), 'barrow': (3, 3),
    'barricade': (3, 1), 'rockfall': (3, 2), 'bell': (2, 2), 'grave': (1, 1), 'grave_cross': (1, 1), 'thornwall': (4, 1),
    'hollow_oak': (3, 3), 'willow': (3, 3),
}


# ================================================================ the Greenmarch
def greenmarch():
    """Lake Ellory and the meadows round it (ring 0): where the heroes wake (south shore),
    Aldric's camp, the road north to Millbrook, two barrows, the goblins' camp in the east.
    South (Ashford) and east (the Greyfang Hills) are closed for now."""
    m = Map(72, 60)
    # the lake
    m.blob(30, 19, 15, 9, '~', seed=1.3, rough=0.2)
    m.blob(20, 24, 7, 5, '~', seed=2.1, rough=0.25)
    m.blob(41, 14, 6, 4, '~', seed=0.4, rough=0.25)
    # a sandy shore where the heroes wake
    m.blob(27, 31, 4, 1.6, ':', seed=3.0, rough=0.1)
    # the road: from the south barricade north past the camp, round the east shore, up to Millbrook
    road = [(36, 59), (36, 52), (35, 46), (37, 40), (44, 34), (48, 27), (49, 18), (47, 10), (46, 4), (46, 0)]
    m.path(road, 2, ':', wobble=0.4, seed=1)
    # the path from the shore up to the camp
    m.path([(28, 32), (31, 36), (35, 38)], 1, ':')
    # the hill path east to the Greyfang Hills (a rockfall closes it)
    m.path([(46, 31), (54, 30), (62, 29), (71, 29)], 2, ':', wobble=0.5, seed=4)
    # forest round the edge, thicker in the west and the far east
    m.border(2, 'T', seed=7)
    m.blob(4, 40, 6, 10, 'T', seed=1, rough=0.3)
    m.blob(66, 48, 7, 9, 'T', seed=5, rough=0.3)
    m.blob(64, 8, 8, 6, 'T', seed=6, rough=0.3)
    # keep the roads clear of the border forest
    m.path(road, 2, ':', wobble=0.4, seed=1)
    m.path([(46, 31), (54, 30), (62, 29), (71, 29)], 2, ':', wobble=0.5, seed=4)
    # buildings and props
    m.prop('tent', 37, 34, 2, 2)
    m.prop('barrow', 7, 6, 3, 3)
    m.prop('barrow', 54, 42, 3, 3)
    for r in range(54, 60):
        for c in range(28, 45):
            if not (35 <= c <= 37 and r <= 56):
                m.set(c, r, 'T')
    for r in range(25, 35):
        for c in range(64, 72):
            if not (r in (29, 30) and c < 66):
                m.set(c, r, 'T')
    m.prop('barricade', 35, 56, 3, 1)
    m.prop('rockfall', 66, 29, 3, 2)
    # the old trees of the story (their art comes with Act II): the hollow oak, Marcian's willow
    m.prop('hollow_oak', 10, 21, 3, 3)
    m.prop('willow', 27, 7, 3, 3)
    # spots
    m.mark('start', 27, 31)
    m.mark('camp', 35, 37)
    m.mark('north', 46, 2)
    m.mark('board', 32, 35)
    # where people, creatures and things stand (kept clear; see src/data/regions/greenmarch.ts)
    for c, r in [(35, 37), (22, 40), (28, 45), (18, 48), (40, 48), (26, 52), (12, 36), (16, 44), (30, 50), (44, 44), (20, 12), (36, 8),
                 (8, 10), (11, 9), (5, 10), (53, 46), (58, 45), (56, 47), (57, 18), (61, 20), (60, 17), (62, 18)]:
        m.spot(c, r)
    # scatter: woods, rocks (iron in the east hills), flowers in the meadows
    m.scatter(3, 3, 68, 56, 'T', 0.05, seed=11, spacing=1)
    m.scatter(50, 18, 66, 36, 'o', 0.07, seed=12, spacing=1)
    m.scatter(4, 3, 26, 14, 'o', 0.025, seed=13, spacing=2)
    m.scatter(8, 32, 34, 54, '*', 0.04, seed=14, spacing=1)
    m.scatter(40, 38, 60, 54, '*', 0.025, seed=15, spacing=1)
    # the goblins' camp: a trampled clearing in the east
    m.blob(59, 19, 4, 3, ':', seed=8, rough=0.3)
    m.mark('goblins', 59, 19)
    return m


# ================================================================ Millbrook
def millbrook():
    """Millbrook (ring 1): the mill village on the Lisle. The road from the Greenmarch comes
    up from the south into the square; a lane runs west over the bridge to the mill and Nan's
    cottage; the chapel and churchyard stand north-east; the north road is closed by thorns."""
    m = Map(64, 56)
    # the Lisle, running north to south through the west of the village
    m.path([(18, 0), (18, 10), (17.5, 18), (18, 26), (19, 36), (20.5, 46), (21, 55)], 3, '~', wobble=0.6, seed=2)
    # the main road: south exit up to the square, on north to the thorns
    m.path([(39.5, 55), (39.5, 46), (39, 33)], 3, ':')
    m.path([(39, 20), (39.5, 10), (39.5, 0)], 3, ':')
    # the square
    m.rect(31, 20, 46, 33, 'c', keep=True)
    # the lane west over the bridge to the mill and Nan's
    m.path([(31, 30), (24, 30), (12, 30), (3, 30)], 2, ':')
    m.path([(46, 18), (46.5, 13)], 2, ':')
    # the bridge deck over the river where the lane crosses
    for r in range(29, 32):
        for c in range(14, 24):
            if m.get(c, r) == '~':
                m.set(c, r, '=', keep=True)
    # forest and hedges round the edge
    m.border(2, 'T', seed=21)
    m.blob(4, 6, 6, 5, 'T', seed=2, rough=0.3)
    m.blob(60, 50, 6, 6, 'T', seed=3, rough=0.3)
    # re-cut the road and river through the border
    m.path([(39.5, 55), (39.5, 46), (39, 36)], 3, ':')
    m.path([(39, 20), (39.5, 10), (39.5, 0)], 3, ':')
    m.path([(18, 0), (18, 10), (17.5, 18)], 3, '~', wobble=0.6, seed=2)
    m.path([(19, 36), (20.5, 46), (21, 55)], 3, '~', wobble=0.6, seed=2)
    # the Blackthorn has reached the village: ash in the grass, worst to the north
    for i, (cx, cy, rx, ry) in enumerate([(30, 8, 8, 5), (50, 6, 7, 4), (8, 46, 5, 4), (54, 40, 6, 4), (27, 44, 4, 3), (11, 14, 5, 4)]):
        m.blob(cx, cy, rx, ry, ',', seed=i * 1.7, rough=0.35)
    # fields: wilted in the south-west, half-wilted in the south-east
    m.rect(3, 36, 15, 47, 'w', keep=True)
    for r in range(36, 48):
        for c in range(3, 16):
            if hsh(c, r, 31) < 0.25:
                m.set(c, r, 'f')
    m.rect(45, 36, 58, 46, 'f', keep=True)
    for r in range(36, 47):
        for c in range(45, 59):
            if hsh(c // 2, r, 32) < 0.45:
                m.set(c, r, 'w')
    # buildings (doors face south or east; the paths run on those sides)
    m.prop('chapel', 44, 7, 4, 6)
    m.prop('smithy', 33, 17, 3, 2)
    m.prop('stall', 41, 22, 2, 2)
    m.prop('well', 37, 26, 1, 1)
    m.prop('mill', 13, 23, 4, 3)
    m.prop('nan_cottage', 4, 25, 3, 2)
    m.prop('cottage', 25, 25, 3, 2)
    m.prop('cottage2', 26, 17, 3, 2)
    m.prop('cottage', 49, 22, 3, 2)
    m.prop('cottage2', 48, 28, 3, 2)
    m.prop('cottage', 25, 35, 3, 2)
    m.prop('cottage2', 31, 38, 3, 2)
    # the churchyard east of the chapel: graves in rows, a fence along its south side
    graves = [(50, 8), (52, 8), (54, 8), (56, 8), (51, 11), (53, 11), (55, 11), (57, 11), (50, 14), (52, 14), (54, 14), (56, 14)]
    for i, (c, r) in enumerate(graves):
        m.prop('grave_cross' if i % 3 == 1 else 'grave', c, r, 1, 1)
    for c in range(49, 59):
        m.prop('fence_x', c, 16, 1, 1)
    # fences along the fields
    for c in range(3, 16):
        m.prop('fence_x', c, 34, 1, 1)
    for c in range(45, 59):
        m.prop('fence_x', c, 34, 1, 1)
    # the thorns across the north road
    m.prop('thornwall', 34, 2, 4, 1)
    m.prop('thornwall', 38, 2, 4, 1)
    m.prop('thornwall', 42, 2, 4, 1)
    # spots
    m.mark('south', 39, 53)
    m.mark('square', 38, 30)
    m.mark('chapelDoor', 46, 14)
    m.mark('herald', 38, 23)
    # where people, creatures and things stand (kept clear; see src/data/regions/millbrook.ts)
    for c, r in [(6, 28), (15, 27), (42, 24), (34, 20), (48, 14), (35, 22), (26, 27),
                 (5, 38), (9, 40), (13, 37), (7, 44), (12, 46), (47, 38), (52, 40), (56, 37), (50, 44), (55, 45),
                 (51, 10), (55, 10), (53, 13), (57, 13), (48, 40), (50, 42), (53, 39), (56, 43), (6, 42), (9, 45), (12, 40),
                 (8, 12), (12, 8), (26, 46)]:
        m.spot(c, r)
    # scatter
    # trees in the outskirts only; the village itself is kept clear
    for (c0, r0, c1, r1) in [(3, 3, 60, 8), (3, 9, 22, 52), (50, 9, 60, 52), (23, 44, 49, 52)]:
        m.scatter(c0, r0, c1, r1, 'T', 0.04, seed=41, spacing=2)
    m.scatter(3, 3, 60, 52, '*', 0.02, seed=42, spacing=2)
    m.scatter(50, 18, 60, 33, 'o', 0.02, seed=43, spacing=3)
    return m


# ================================================================ the bell tower
def belltower():
    """Inside Millbrook's bell tower: the ground floor with the bell rope, a narrow stair
    winding up, and the belfry under the cracked bell (the Bell-Ringer's room)."""
    m = Map(20, 32, '&')
    # the belfry: a round room at the top
    m.blob(10, 7, 7, 5, '+', seed=1, rough=0.06)
    # the stair: a narrow way winding up
    m.path([(10, 25), (10, 21), (6, 19), (6, 16), (11, 14), (10, 11)], 2, '+')
    # the ground floor
    m.rect(5, 22, 14, 29, '+')
    # the door out (south)
    m.rect(9, 30, 10, 31, '+')
    # walls only where they meet the floor; the rest is solid dark
    for r in range(m.h):
        for c in range(m.w):
            if m.get(c, r) == '&' and any(m.get(c + dx, r + dy) == '+' for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                m.set(c, r, '#')
    m.rect(9, 31, 10, 31, '+')
    m.prop('bell', 9, 5, 2, 2)
    m.mark('door', 10, 28)
    m.mark('belfry', 10, 11)
    return m


MAPS = {'greenmarch': greenmarch, 'millbrook': millbrook, 'belltower': belltower}

COLORS = {'.': (110, 138, 116), ':': (140, 124, 102), '~': (94, 110, 118), 'T': (44, 68, 56), 'o': (154, 163, 156), '*': (184, 122, 104),
          '#': (60, 64, 60), '_': (116, 122, 116), '=': (124, 108, 88), 'f': (124, 108, 88), 'w': (160, 132, 64), ',': (140, 146, 140),
          'c': (154, 163, 156), '+': (70, 84, 92), 'X': (60, 64, 60), 'G': (40, 40, 40), '&': (10, 10, 14)}


def preview(name, out, k=8):
    m = MAPS[name]()
    img = Image.new('RGB', (m.w * k, m.h * k))
    d = ImageDraw.Draw(img)
    for r, row in enumerate(m.rows()):
        for c, ch in enumerate(row):
            d.rectangle([c * k, r * k, c * k + k - 1, r * k + k - 1], fill=COLORS.get(ch, (255, 0, 255)))
    for kind, c, r, w, h in m.props:
        d.rectangle([c * k, r * k, (c + w) * k - 1, (r + h) * k - 1], outline=(255, 230, 120), width=2)
        d.text((c * k + 2, r * k + 1), kind[:6], fill=(255, 255, 255))
    for nm, (c, r) in m.marks.items():
        d.ellipse([c * k + 1, r * k + 1, c * k + k - 2, r * k + k - 2], fill=(230, 60, 60))
        d.text((c * k + k, r * k - 2), nm, fill=(255, 220, 220))
    img.save(out)


def write():
    for name, make in MAPS.items():
        m = make()
        path = os.path.join(ROOT, 'src/data/regions', name + '.ts')
        if not os.path.exists(path):
            print('skip (no region file yet):', path)
            continue
        src = open(path).read()
        rows = "".join(f"    '{r}',\n" for r in m.rows())
        new = re.sub(r"  layout: \[\n(?:    '.*',\n)+  \],", "  layout: [\n" + rows.replace('\\', '\\\\') + "  ],", src, count=1)
        props = "".join(f"    {{ kind: '{k}', at: [{c}, {r}] }},\n" for k, c, r, w, h in m.props)
        new = re.sub(r"  props: \[\n(?:    .*\n)*?  \],", "  props: [\n" + props + "  ],", new, count=1)
        open(path, 'w').write(new)
        print('wrote', name, f'{m.w}x{m.h}')


if __name__ == '__main__':
    if sys.argv[1] == 'preview':
        preview(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == 'props':
        m = MAPS[sys.argv[2]]()
        for kind, c, r, w, h in m.props:
            print(f"    {{ kind: '{kind}', at: [{c}, {r}] }},")
        for nm, at in m.marks.items():
            print('mark', nm, at)
    else:
        write()
