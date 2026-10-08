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
    def __init__(self, w, h, fill='.', smart=False):
        self.w, self.h = w, h
        # smart: cleared tiles take the ground round them (Act II maps); otherwise grass
        self.smart = smart
        self.g = [[fill] * w for _ in range(h)]
        self.props = []  # (kind, c, r, w, h, when)
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

    def prop(self, kind, c, r, w=None, h=None, clear=None, when=None, ring=1):
        """Place a building or prop and clear its footprint (and a ring round it) of trees and
        rocks. `when` is a story condition (TypeScript, as written in the region file)."""
        if w is None:
            w, h = PROP_SIZE[kind]
        self.props.append((kind, c, r, w, h, when))
        for rr in range(r - ring, r + h + ring):
            for cc in range(c - ring, c + w + ring):
                if self.get(cc, rr) in CLEARABLE:
                    self.set(cc, rr, clear or self.ground(cc, rr))
                self.keep.add((cc, rr))

    def ground(self, c, r):
        """What a cleared tile becomes: the ground most of its neighbours are (grass on the old maps)."""
        if not self.smart:
            return '.'
        seen = {}
        for dc in range(-2, 3):
            for dr in range(-2, 3):
                g = self.get(c + dc, r + dr)
                if g in GROUND:
                    seen[g] = seen.get(g, 0) + 1
        return max(seen, key=seen.get) if seen else '.'

    def mark(self, name, c, r):
        self.marks[name] = (c, r)
        self.keep.add((c, r))
        if self.get(c, r) in CLEARABLE:
            self.set(c, r, self.ground(c, r))

    def spot(self, c, r, ring=1):
        """Keep a tile clear (someone stands there, or something lies there), and the tiles round it."""
        for rr in range(r - ring, r + ring + 1):
            for cc in range(c - ring, c + ring + 1):
                self.keep.add((cc, rr))
                if self.get(cc, rr) in CLEARABLE:
                    self.set(cc, rr, self.ground(cc, rr))

    def rows(self):
        return [''.join(r) for r in self.g]


# trees and stones that a building, a spot or a mark clears away; and the ground they leave
CLEARABLE = ('T', 'Y', 'y', 'K', 'o', '*')
GROUND = ('.', 'm', ':', ',', 'r', 'c', 'w', 'f')

PROP_SIZE = {
    'cottage': (3, 2), 'cottage2': (3, 2), 'nan_cottage': (3, 2), 'mill': (4, 3), 'chapel': (4, 6), 'smithy': (3, 2),
    'stall': (2, 2), 'well': (1, 1), 'fence_x': (1, 1), 'fence_y': (1, 1), 'tent': (2, 2), 'barrow': (3, 3),
    'barricade': (3, 1), 'rockfall': (3, 2), 'bell': (2, 2), 'grave': (1, 1), 'grave_cross': (1, 1), 'thornwall': (4, 1),
    'hollow_oak': (3, 3), 'willow': (3, 3),
    # Act II (tools/world/buildings2.py)
    'leanto': (2, 1), 'drying_rack': (1, 1), 'hut': (3, 2), 'hut2': (3, 2), 'sawpit': (2, 2), 'long_table': (3, 1),
    'thorn_tunnel': (3, 2), 'fallen_willow': (4, 1), 'spikes_s': (1, 1), 'spikes_m': (1, 1), 'spikes_l': (1, 1),
    'thicket': (1, 1), 'webbed_willow': (3, 3), 'mound_grave': (1, 1), 'standing_stone': (1, 1), 'boundary_stone': (1, 1),
    'hunting_lodge': (5, 3), 'kennels': (3, 2), 'gallows_willow': (3, 3), 'goblin_tent': (2, 2), 'wolf_pen': (2, 2),
    'goblin_wall': (4, 1), 'heron_lodge': (4, 3), 'outpost': (2, 2), 'lisle_barrow': (4, 4), 'mist': (4, 1),
    'bridge_parapet': (1, 5), 'bridge_arch': (5, 1), 'great_willow': (4, 4), 'kings_post': (1, 1), 'watchfire': (1, 1),
    'guard_leanto': (2, 1), 'vines': (4, 1), 'hearth_cold': (2, 1), 'hearth_lit': (2, 1), 'bunks': (2, 1), 'niche': (1, 1),
    'stone_seat': (2, 2),
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
                 (8, 10), (11, 9), (5, 10), (53, 46), (58, 45), (56, 47), (57, 18), (61, 20), (60, 17), (62, 18),
                 # Act II: Wren at the camp and at the oak, the oak's hollow
                 (33, 38), (11, 25), (12, 24)]:
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
    # Wren's river path (Act II): up the east bank to where the Lisle runs under the thorn wall
    m.path([(23.5, 29), (22.5, 22), (21.6, 14), (21.2, 6), (21.2, 0)], 2, ':')
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
    # Old Cobb's new hedge-line, laid against the ash field north of the square
    for c in range(24, 29):
        m.prop('fence_x', c, 13, 1, 1)
    # the thorns across the north road, and on along the north edge to the river, which runs
    # under them through a low arch of thorn (the river path goes under it too)
    for c in (9, 13, 23, 27):
        m.prop('thornwall', c, 2, 4, 1)
    m.prop('thorn_tunnel', 18, 1, 3, 2)
    m.prop('thornwall', 34, 2, 4, 1)
    m.prop('thornwall', 38, 2, 4, 1)
    m.prop('thornwall', 42, 2, 4, 1)
    # spots
    m.mark('south', 39, 53)
    m.mark('square', 38, 30)
    m.mark('chapelDoor', 46, 14)
    m.mark('herald', 38, 23)
    m.mark('river', 21, 5)
    # where people, creatures and things stand (kept clear; see src/data/regions/millbrook.ts)
    for c, r in [(6, 28), (15, 27), (42, 24), (34, 20), (48, 14), (35, 22), (26, 27),
                 (5, 38), (9, 40), (13, 37), (7, 44), (12, 46), (47, 38), (52, 40), (56, 37), (50, 44), (55, 45),
                 (51, 10), (55, 10), (53, 13), (57, 13), (48, 40), (50, 42), (53, 39), (56, 43), (6, 42), (9, 45), (12, 40),
                 (8, 12), (12, 8), (26, 46),
                 # Act II: Wren on the mill step and by the river at the thorn wall, a letter at the mill, Bess
                 (12, 27), (14, 27), (22, 6), (24, 38),
                 # later in Act I: Old Cobb, the thornlings and the Old Briar in the ash field, the
                 # King's lead hound, the grey postman's tracks on the north road
                 (30, 13), (26, 5), (30, 7), (34, 5), (24, 9), (28, 10), (32, 9), (36, 10), (30, 3), (52, 44), (40, 6)]:
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

# ================================================================ Act II: the Weepwood
def kiln_ring(cx=58, cy=24, rx=8, ry=7, n=8):
    """Kilnholt's eight kilns, round the hamlet (structures in the region file, not props)."""
    out = []
    for i in range(n):
        a = math.pi * 2 * i / n
        out.append((int(round(cx + math.cos(a) * rx)), int(round(cy + math.sin(a) * ry))))
    return out


def weepwood():
    """The Weepwood (ring 2): the south of the old King's forest, where the Lisle comes down to
    Millbrook. Wren's camp on the riverbank (south-west), the spider dell across the river (west),
    the Keening Hollow (north-west), Kilnholt inside its ring of kilns (east of the old road), the
    edge of the wood still half green (south and east). Exits: the river path to Millbrook
    (south-west), the thorn wall (south, closed), the King's Chase (east), and the old road north
    to Heron Reach (a fallen black willow across it until Kilnholt's saw clears it)."""
    m = Map(80, 64, 'm', smart=True)
    # the edge of the wood, still half green: grass in the south and east
    m.blob(58, 56, 28, 11, '.', seed=1.2, rough=0.3)
    m.blob(75, 42, 9, 18, '.', seed=2.4, rough=0.3)
    # thick groves of black willow between the clearings
    for i, (cx, cy, rx, ry) in enumerate([(35, 38, 3, 4), (49, 38, 4, 3), (67, 12, 4, 3), (22, 6, 4, 2), (47, 9, 3, 3), (33, 26, 2, 4),
                                          (6, 22, 3, 3), (70, 20, 3, 4), (30, 57, 3, 2)]):
        m.blob(cx, cy, rx, ry, 'Y', seed=i * 2.3, rough=0.35)
    # the Lisle, from the north down past Wren's camp and away south-west to Millbrook
    river = [(31, 0), (30, 8), (28.5, 16), (26.5, 24), (24.5, 32), (23.5, 40), (21.5, 47), (18, 53), (14, 58), (12, 63)]
    m.path(river, 3, '~', wobble=0.7, seed=4)
    # two fords: below the spider dell, and up by the Keening Hollow
    for r0, r1, c0, c1 in [(43, 45, 18, 28), (17, 19, 24, 33)]:
        for r in range(r0, r1 + 1):
            for c in range(c0, c1 + 1):
                if m.get(c, r) == '~':
                    m.set(c, r, 'F', keep=True)
    # the old road, straight up the middle; the track east to Kilnholt and on to the Chase
    road = [(40, 63), (40, 50), (41, 40), (42, 30), (41, 20), (40, 10), (40, 0)]
    m.path(road, 3, 'r', wobble=0.5, seed=5)
    m.path([(42, 24), (50, 24)], 2, ':')
    m.path([(66, 25), (72, 28), (79, 30)], 2, ':', wobble=0.5, seed=6)
    # the river path from Millbrook up the east bank to Wren's camp, and her track east to the road
    m.path([(14, 63), (16, 59), (20, 55), (22, 53)], 2, ':', wobble=0.3, seed=7)
    m.path([(22, 53), (30, 50), (40, 48)], 2, ':', wobble=0.6, seed=8)
    # paths over the fords
    m.path([(16, 44), (19, 44)], 2, ':')
    m.path([(28, 44), (36, 46), (40, 46)], 2, ':', wobble=0.4, seed=9)
    m.path([(33, 18), (39, 18)], 2, ':')
    m.path([(16, 15), (23, 18)], 2, ':', wobble=0.4, seed=10)
    # Kilnholt's clearing: trodden earth inside the ring of kilns
    m.blob(58, 24, 10, 9, ':', seed=3.3, rough=0.12)
    m.blob(58, 24, 7, 6, '.', seed=1.1, rough=0.2)
    # the Keening Hollow: a sunken glade of graves, the ground gone grey
    m.blob(13, 12, 8, 6, ',', seed=7.7, rough=0.25)
    # the spider dell: a hollow of webbed willows west of the river
    m.blob(11, 33, 8, 7, ',', seed=5.5, rough=0.25)
    # the wood round the edge: black willows, thickest in the north
    m.border(2, 'Y', seed=31)
    m.blob(4, 52, 5, 9, 'Y', seed=1, rough=0.3)
    m.blob(76, 8, 6, 7, 'Y', seed=2, rough=0.3)
    m.blob(58, 4, 9, 3, 'Y', seed=3, rough=0.3)
    # re-cut the river, the road and the paths out through the border
    m.path(river[:3], 3, '~', wobble=0.7, seed=4)
    m.path(river[-3:], 3, '~', wobble=0.7, seed=4)
    m.path(road[:2], 3, 'r', wobble=0.5, seed=5)
    m.path(road[-2:], 3, 'r', wobble=0.5, seed=5)
    m.path([(72, 28), (79, 30)], 2, ':', wobble=0.5, seed=6)
    m.path([(14, 63), (16, 59)], 2, ':', wobble=0.3, seed=7)
    # the thorn wall across the old road, from the wrong side (south)
    for c in (34, 38, 42):
        m.prop('thornwall', c, 62)
    # the black willow fallen across the road north, until Kilnholt's saw clears it
    m.prop('fallen_willow', 38, 3, when="{ not: 'willow_sawn' }")
    # Wren's camp: a lean-to and a drying rack by the river
    m.prop('leanto', 18, 51)
    m.prop('drying_rack', 23, 51)
    # Kilnholt: turf huts, the sawpit, the long table, inside the ring of kilns
    m.prop('hut', 53, 19)
    m.prop('hut2', 60, 18)
    m.prop('hut', 63, 23)
    m.prop('hut2', 52, 25)
    m.prop('sawpit', 62, 27)
    m.prop('long_table', 55, 28)
    for c, r in kiln_ring():
        m.spot(c, r, 1)
    # the spider dell: willows sheeted in web
    for c, r in [(5, 28), (13, 27), (6, 35), (14, 35), (9, 39)]:
        m.prop('webbed_willow', c, r, ring=0)
    # the Keening Hollow: unmarked graves, a mound with a stick or a stone at its head
    for c, r in [(9, 9), (12, 8), (15, 9), (18, 11), (8, 13), (11, 12), (14, 13), (17, 14), (10, 16), (13, 16), (16, 17)]:
        m.prop('mound_grave', c, r, ring=0)
    # bone spikes and black thorn thickets, more of them the further north
    for i, (c, r) in enumerate([(34, 8), (46, 12), (50, 6), (36, 22), (47, 34), (33, 30), (30, 38), (68, 10), (72, 16), (64, 40),
                                (22, 22), (20, 6), (44, 54), (54, 44), (70, 50), (28, 58), (48, 16), (35, 14)]):
        m.prop(('spikes_s', 'spikes_m', 'spikes_l')[i % 3], c, r, ring=0)
    for c, r in [(32, 4), (45, 4), (52, 10), (66, 14), (24, 12), (19, 25), (35, 36), (46, 40), (62, 46), (26, 56), (70, 34), (8, 22)]:
        m.prop('thicket', c, r, ring=0)
    # spots
    m.mark('river', 15, 60)
    m.mark('south', 40, 60)
    m.mark('north', 40, 6)
    m.mark('east', 76, 30)
    m.mark('wren_camp', 21, 54)
    m.mark('kilnholt', 57, 24)
    m.mark('hollow', 13, 12)
    m.mark('dell', 10, 33)
    # where people, creatures and things stand (kept clear; see src/data/regions/weepwood.ts)
    for c, r in WEEPWOOD_SPOTS:
        m.spot(c, r)
    # scatter: black willows in the moss, half-green ones at the edge, a few black oaks; stones
    m.scatter(3, 3, 76, 60, 'Y', 0.11, seed=41, on='m', spacing=1)
    m.scatter(3, 3, 76, 60, 'y', 0.09, seed=42, on='.', spacing=1)
    m.scatter(44, 3, 76, 40, 'K', 0.02, seed=43, on='m', spacing=2)
    m.scatter(3, 3, 76, 60, 'o', 0.012, seed=44, on='m', spacing=3)
    m.scatter(44, 40, 76, 60, '*', 0.02, seed=45, on='.', spacing=2)
    # keep Kilnholt's ring clear: the thorns won't grow inside it
    for r in range(15, 34):
        for c in range(48, 69):
            if ((c - 58) / 10) ** 2 + ((r - 24) / 9) ** 2 <= 1 and m.get(c, r) in CLEARABLE:
                m.set(c, r, m.ground(c, r))
    return m


# people, creatures and things in the Weepwood (src/data/regions/weepwood.ts)
WEEPWOOD_SPOTS = [
    # Wren's camp: her fire, the goose mark, a diary page on the thorns
    (21, 53), (24, 53), (30, 47),
    # Kilnholt's people and Dunn's cookfire
    (58, 22), (58, 25), (59, 26), (56, 29), (62, 26),
    # the spider dell: spiders, egg sacs, the Brood Mother, a cocoon, the jay mark
    (10, 32), (14, 32), (8, 37), (16, 30), (6, 33), (9, 30), (13, 38), (17, 34), (7, 39), (11, 28), (15, 31), (5, 31), (12, 36), (19, 38),
    # the Keening Hollow: the dead at night, the lights, Bess, a diary page
    (10, 10), (16, 12), (12, 15), (13, 10), (9, 14), (14, 12), (11, 11), (17, 11), (11, 16), (17, 16), (7, 7),
    # lights along the river
    (27, 30), (26, 37), (29, 24),
    # the goose on the old road above Kilnholt; the lantern's dust
    (43, 14), (43, 31),
    # wolves, boar and deer in the green glades
    (52, 52), (55, 54), (54, 49), (66, 46), (69, 48), (67, 44), (60, 57), (71, 55), (48, 44), (62, 51), (64, 53), (73, 50), (50, 58),
    (46, 8), (48, 10),
]

# ================================================================ Act II: the King's Chase
def kingschase():
    """The King's Chase (ring 2): the old King's hunting forest east of the Weepwood. Wider
    glades and old oaks gone black; the King's Ride cut straight through the trees; the roofless
    hunting lodge and its kennels in the middle; the Gallows Willow by the Ride (south-west);
    the deer glades (north); Bonespine's rocks (north-west); the goblin outriders' camp (east),
    and their wall of thornwood and bones across the hill path east (closed)."""
    m = Map(72, 60, '.', smart=True)
    # moss under the old trees, worst in the west where it meets the Weepwood
    for i, (cx, cy, rx, ry) in enumerate([(10, 30, 9, 16), (30, 50, 12, 6), (52, 52, 10, 5), (40, 30, 6, 4), (64, 44, 6, 8)]):
        m.blob(cx, cy, rx, ry, 'm', seed=i * 1.9, rough=0.3)
    # the deer glades (north): open grass with flowers
    m.blob(46, 10, 12, 5, '.', seed=3.1, rough=0.25)
    # Bonespine's rocks (north-west): a tumble of boulders
    m.blob(10, 10, 6, 5, ',', seed=4.4, rough=0.3)
    # the outriders' camp (east): trampled earth
    m.blob(60, 22, 8, 6, ':', seed=5.2, rough=0.3)
    # the hunting lodge's yard
    m.blob(34, 21, 7, 6, ':', seed=6.6, rough=0.2)
    # the King's Ride: a straight grassy ride east to west, a track worn down its middle
    m.rect(0, 33, 71, 36, '.', keep=False)
    m.path([(0, 34.6), (71, 34.6)], 2, ':')
    # tracks: the Ride up to the lodge, up to the glades, and to the outriders' camp
    m.path([(34, 34), (34, 26)], 2, ':')
    m.path([(36, 17), (40, 13), (46, 11)], 2, ':', wobble=0.5, seed=2)
    m.path([(54, 34), (58, 27)], 2, ':', wobble=0.4, seed=3)
    # the hill path north-east out of the camp, toward the Greyfang Hills
    m.path([(61, 18), (63, 10), (63.5, 0)], 2, ':', wobble=0.4, seed=5)
    m.path([(12, 34), (12, 46)], 2, ':', wobble=0.3, seed=4)
    # forest round the edge: black oaks, and black willows on the Weepwood side
    m.border(2, 'K', seed=51)
    m.blob(2, 50, 4, 8, 'Y', seed=1, rough=0.3)
    m.blob(66, 8, 6, 6, 'K', seed=2, rough=0.3)
    m.blob(24, 6, 5, 3, 'K', seed=3, rough=0.3)
    # thick old wood either side of the Ride
    for i, (cx, cy, rx, ry) in enumerate([(22, 26, 5, 4), (48, 26, 4, 4), (24, 44, 3, 3), (44, 46, 5, 3), (60, 46, 4, 4), (20, 14, 3, 4),
                                          (56, 6, 4, 2), (6, 22, 3, 4)]):
        m.blob(cx, cy, rx, ry, 'K', seed=i * 3.1, rough=0.35)
    # re-cut the Ride through the border, west to the Weepwood and east to the goblin wall
    m.rect(0, 33, 71, 36, '.', keep=True)
    m.path([(0, 34.6), (71, 34.6)], 2, ':')
    # the goblins' wall across the hill path, the spikes pointing toward the hills
    m.path([(61, 18), (63, 10), (63.5, 0)], 2, ':', wobble=0.4, seed=5)
    m.prop('goblin_wall', 62, 2, ring=0)
    # the King's hunting lodge (roofless) and its kennels behind it
    m.prop('hunting_lodge', 31, 20)
    m.prop('kennels', 32, 15)
    # the Gallows Willow by the Ride, south-west
    m.prop('gallows_willow', 11, 41, ring=0)
    # the outriders' camp: hide tents and wolf pens
    for c, r in [(56, 18), (62, 17), (63, 23)]:
        m.prop('goblin_tent', c, r)
    m.prop('wolf_pen', 57, 25)
    m.prop('wolf_pen', 65, 20)
    # boundary stones with the crown cut on them, all along the Ride
    for c in (6, 18, 28, 42, 52, 62):
        m.prop('boundary_stone', c, 32, ring=0)
    # bone spikes and thickets
    for i, (c, r) in enumerate([(16, 20), (44, 22), (52, 40), (26, 40), (38, 52), (8, 54), (58, 12), (30, 8), (66, 52), (20, 52)]):
        m.prop(('spikes_s', 'spikes_m', 'spikes_l')[i % 3], c, r, ring=0)
    for c, r in [(28, 28), (40, 40), (50, 50), (14, 26), (62, 40), (36, 6)]:
        m.prop('thicket', c, r, ring=0)
    # spots
    m.mark('west', 3, 34)
    m.mark('hills', 63, 6)
    m.mark('lodge', 34, 25)
    m.mark('gallows', 13, 44)
    for c, r in CHASE_SPOTS:
        m.spot(c, r)
    # scatter: old black oaks, a few oaks still green, willows in the west; rocks at Bonespine's
    m.scatter(3, 3, 68, 56, 'K', 0.07, seed=61, on='.', spacing=1)
    m.scatter(3, 3, 68, 56, 'K', 0.09, seed=62, on='m', spacing=1)
    m.scatter(36, 3, 68, 30, 'T', 0.025, seed=63, on='.', spacing=2)
    m.scatter(3, 3, 20, 56, 'Y', 0.05, seed=64, on='m', spacing=1)
    m.scatter(4, 5, 16, 15, 'o', 0.22, seed=65, on=',', spacing=1)
    m.scatter(36, 6, 58, 15, '*', 0.05, seed=66, on='.', spacing=1)
    # keep the Ride open
    for r in range(33, 37):
        for c in range(0, 72):
            if m.get(c, r) in CLEARABLE and (c, r) not in m.keep:
                m.set(c, r, '.')
    return m


CHASE_SPOTS = [
    # the lodge: the game book at its door, the kennel gate
    (36, 24), (35, 18),
    # the Gallows Willow: the five ropes and the hanged
    (14, 41), (15, 42), (15, 43), (14, 44), (10, 44), (11, 46), (14, 46), (12, 47), (9, 43), (16, 45),
    # Bonespine
    (10, 10),
    # Pike's courier on the Ride
    (46, 36),
    # thornbacks in packs, boar, deer in the glades
    (24, 46), (27, 47), (25, 42), (29, 44), (50, 44), (53, 46), (52, 42), (48, 47), (44, 12), (52, 10), (20, 28),
    (42, 9), (46, 11), (50, 8), (55, 12), (6, 40), (8, 44),
    # the outriders
    (58, 21), (63, 26), (55, 24), (61, 19), (64, 22), (59, 27), (60, 23), (62, 21), (61, 22),
]


# ================================================================ Act II: Heron Reach
def heronreach():
    """Heron Reach (ring 2): the stretch of the Lisle the Wardens kept, darker, the bone spikes
    taller, the river wide and slow and black. Heron Lodge west of the ford; the ford, held by
    the Tower Guard, with their outpost on the far bank; the Lisle Barrow in the north-east;
    three Warden caches under owl marks; the grave-mist across the road north."""
    m = Map(76, 64, 'm', smart=True)
    m.blob(18, 50, 12, 8, ',', seed=1.5, rough=0.3)
    m.blob(60, 46, 10, 8, ',', seed=2.5, rough=0.3)
    # the Lisle, wide and slow, from the north-east down to the south-west
    river = [(53, 0), (50, 10), (46, 20), (41, 32), (36, 42), (33, 52), (31, 63)]
    m.path(river, 5, '~', wobble=0.8, seed=3)
    # the old road: up from the Weepwood, over the ford, on north into the mist
    road = [(40, 63), (41, 50), (41, 40), (39, 32), (37, 24), (37, 12), (38, 0)]
    m.path(road, 3, 'r', wobble=0.4, seed=4)
    # the ford: stones across the river where the road crosses
    for r in range(28, 37):
        for c in range(30, 52):
            if m.get(c, r) == '~' and abs(r - 32) <= 3:
                m.set(c, r, 'F', keep=True)
    # a path west to Heron Lodge's door, and east over the far bank to the barrow
    m.path([(37, 30), (26, 30)], 2, ':', wobble=0.3, seed=5)
    m.path([(44, 33), (52, 26), (58, 20)], 2, ':', wobble=0.4, seed=6)
    # the barrow's mound: the grass round it
    m.blob(59, 14, 7, 6, '.', seed=7.7, rough=0.2)
    # forest round the edge
    m.border(2, 'Y', seed=71)
    for i, (cx, cy, rx, ry) in enumerate([(10, 10, 6, 5), (68, 34, 5, 6), (22, 60, 5, 2), (60, 58, 6, 3), (28, 14, 3, 4), (48, 52, 3, 3)]):
        m.blob(cx, cy, rx, ry, 'Y', seed=i * 2.7, rough=0.35)
    m.path(river[:2], 5, '~', wobble=0.8, seed=3)
    m.path(river[-2:], 5, '~', wobble=0.8, seed=3)
    m.path(road[:2], 3, 'r', wobble=0.4, seed=4)
    m.path(road[-2:], 3, 'r', wobble=0.4, seed=4)
    # Heron Lodge, west of the ford
    m.prop('heron_lodge', 21, 26)
    # the Tower Guard's outpost on the far bank
    m.prop('outpost', 46, 34)
    # the Lisle Barrow
    m.prop('lisle_barrow', 57, 10)
    # the grave-mist across the road north, until the last mark is read
    for c in (31, 35, 39, 43):
        m.prop('mist', c, 3, when="{ not: 'mist_open' }", ring=0)
    # bone spikes, taller and thicker here; thickets
    for i, (c, r) in enumerate([(30, 44), (48, 44), (56, 30), (62, 40), (14, 36), (18, 20), (44, 12), (66, 22), (24, 46), (54, 54),
                                (12, 26), (70, 48), (32, 18), (60, 26), (8, 46), (46, 58)]):
        m.prop(('spikes_m', 'spikes_l', 'spikes_s', 'spikes_l')[i % 4], c, r, ring=0)
    for c, r in [(26, 40), (50, 40), (16, 14), (64, 52), (36, 56), (10, 32), (70, 14)]:
        m.prop('thicket', c, r, ring=0)
    m.mark('south', 40, 60)
    m.mark('north', 38, 6)
    m.mark('lodge_door', 23, 30)
    m.mark('barrow_door', 58, 15)
    for c, r in REACH_SPOTS:
        m.spot(c, r)
    m.scatter(3, 3, 72, 60, 'Y', 0.12, seed=81, on='m', spacing=1)
    m.scatter(3, 3, 72, 60, 'Y', 0.08, seed=82, on=',', spacing=1)
    m.scatter(3, 3, 72, 60, 'K', 0.02, seed=83, on='m', spacing=2)
    m.scatter(3, 3, 72, 60, 'o', 0.012, seed=84, on='m', spacing=3)
    return m


REACH_SPOTS = [
    # marks: the owl over the lodge door, the heron at the ford, the last at the mist
    (25, 30), (36, 34), (41, 7),
    # the caches: the split oak, the old weir, the leaning stone
    (12, 18), (51, 18), (62, 47),
    # a diary page; the letter on the lodge step; the Wardens' fire at the barrow door
    (16, 42), (24, 30), (60, 16),
    # the Tower Guard at the ford and the outpost
    (42, 31), (44, 30), (40, 34), (45, 36), (48, 32), (49, 37),
    # thornbacks in the spikes; mourning lights on the river
    (54, 44), (57, 46), (56, 42), (52, 47), (20, 50), (23, 52), (18, 48), (64, 30), (66, 28),
    (42, 22), (37, 50), (52, 12),
]


# ================================================================ Act II: inside Heron Lodge
def heronlodge():
    """Inside Heron Lodge: one long room, the hearth on the north wall with the roll of names on
    the beam over it, bunks, a weapon rack and a Warden's chest; the door to the south."""
    m = Map(16, 14, '&')
    m.rect(2, 2, 13, 11, '_')
    m.rect(7, 12, 8, 13, '_')
    for r in range(m.h):
        for c in range(m.w):
            if m.get(c, r) == '&' and any(m.get(c + dx, r + dy) == '_' for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                m.set(c, r, '#')
    m.rect(7, 13, 8, 13, '_')
    m.prop('bunks', 2, 4, ring=0)
    m.prop('bunks', 2, 7, ring=0)
    m.mark('door', 7, 11)
    return m


# ================================================================ Act II: the Lisle Barrow
def lislebarrow():
    """Inside the Lisle Barrow: a long stone passage north from the door, side chambers with the
    dead in their niches, and at the end a round hall with the Thane's stone seat."""
    m = Map(30, 40, '&')
    # the round hall
    m.blob(15, 9, 9, 6, '+', seed=1, rough=0.06)
    # the passage
    m.path([(15, 37), (15, 30), (14, 22), (15, 15)], 3, '+')
    # side chambers
    m.blob(7, 27, 4, 3, '+', seed=2, rough=0.1)
    m.blob(23, 23, 4, 3, '+', seed=3, rough=0.1)
    m.blob(7, 17, 3, 2, '+', seed=4, rough=0.1)
    m.path([(10, 27), (14, 27)], 2, '+')
    m.path([(16, 23), (20, 23)], 2, '+')
    m.path([(9, 17), (14, 18)], 2, '+')
    for r in range(m.h):
        for c in range(m.w):
            if m.get(c, r) == '&' and any(m.get(c + dx, r + dy) == '+' for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                m.set(c, r, '#')
    m.rect(14, 38, 16, 39, '+')
    m.prop('stone_seat', 14, 4, ring=0)
    # the dead in their niches, in the side chambers
    for c, r in [(4, 26), (4, 28), (27, 22), (27, 24), (4, 17)]:
        m.prop('niche', c, r, ring=0)
    m.mark('door', 15, 36)
    m.mark('hall', 15, 10)
    return m


# ================================================================ Act II: the Weeping Bridge
def weepingbridge():
    """The Weeping Bridge (ring 2, the deep wood, dusk all day): the old road winds north between
    bone spikes to the Lisle in its steep black cut, and the old stone bridge between two great
    black willows. The south landing is where the knight stands; the King's post beside it; the
    mourners' stones to the west; on the north bank Garrick's cold watch-fire, a guard's lean-to,
    and the road north choked with black vines (closed)."""
    m = Map(60, 54, 'm', smart=True)
    m.blob(30, 40, 26, 12, ',', seed=1.1, rough=0.35)
    # the Lisle in its steep cut, east to west across the north
    m.path([(0, 19), (14, 18), (30, 19.5), (46, 18.5), (60, 19)], 4, '~', wobble=0.6, seed=2)
    # the bridge: a deck of stone across the cut
    for r in range(15, 24):
        for c in range(28, 33):
            if m.get(c, r) == '~':
                m.set(c, r, '=', keep=True)
    # the old road from the mist up to the south landing, and on from the north bank
    road = [(30, 53), (31, 46), (28, 38), (30, 30), (30, 24)]
    m.path(road, 3, 'r', wobble=0.6, seed=3)
    m.path([(30, 15), (30, 8), (30, 0)], 3, 'r', wobble=0.3, seed=4)
    # the south landing: worn flags round the end of the bridge
    m.blob(30, 26, 7, 3, 'c', seed=5, rough=0.15)
    # the mourners' stones (west)
    m.blob(12, 34, 6, 5, '.', seed=6, rough=0.2)
    m.path([(28, 38), (18, 35)], 2, ':', wobble=0.4, seed=7)
    m.border(2, 'Y', seed=91)
    for i, (cx, cy, rx, ry) in enumerate([(8, 10, 6, 5), (52, 10, 6, 5), (50, 36, 5, 6), (44, 48, 4, 3), (14, 48, 5, 3)]):
        m.blob(cx, cy, rx, ry, 'Y', seed=i * 1.7, rough=0.35)
    m.path(road[:2], 3, 'r', wobble=0.6, seed=3)
    m.path([(30, 8), (30, 0)], 3, 'r', wobble=0.3, seed=4)
    m.path([(0, 19), (14, 18)], 4, '~', wobble=0.6, seed=2)
    m.path([(46, 18.5), (60, 19)], 4, '~', wobble=0.6, seed=2)
    # the bridge: its parapets, the arch seen over the water, the great willows at either end
    m.prop('bridge_parapet', 27, 16, ring=0)
    m.prop('bridge_parapet', 33, 16, ring=0)
    m.prop('great_willow', 22, 22)
    m.prop('great_willow', 35, 11)
    # the north bank: the watch-fire and a guard's lean-to; the vines across the road north
    m.prop('watchfire', 31, 11, ring=0)
    m.prop('guard_leanto', 25, 10)
    for c in (24, 28, 32):
        m.prop('vines', c, 2, ring=0)
    # the mourners' stones: a ring
    for i in range(7):
        a = math.pi * 2 * i / 7
        m.prop('standing_stone', int(round(12 + math.cos(a) * 4)), int(round(34 + math.sin(a) * 3.2)), ring=0)
    # bone spikes thick as fences along the road
    for i, (c, r) in enumerate([(26, 44), (34, 44), (25, 36), (35, 34), (24, 30), (37, 29), (22, 48), (38, 50), (42, 40), (18, 42),
                                (44, 30), (20, 26), (40, 24), (16, 28), (46, 44), (34, 52)]):
        m.prop(('spikes_l', 'spikes_m', 'spikes_l', 'spikes_s')[i % 4], c, r, ring=0)
    m.mark('south', 30, 50)
    m.mark('landing', 30, 26)
    m.mark('north', 30, 6)
    for c, r in BRIDGE_SPOTS:
        m.spot(c, r)
    m.scatter(3, 3, 56, 50, 'Y', 0.13, seed=95, on='m', spacing=1)
    m.scatter(3, 3, 56, 50, 'Y', 0.07, seed=96, on=',', spacing=1)
    return m


BRIDGE_SPOTS = [
    # Garrick on the bridge, and his ghost by the parapet afterwards
    (30, 19), (32, 18),
    # the search party on the old road, and their sergeant
    (30, 44), (32, 46), (29, 41), (31, 37), (28, 34), (30, 32), (31, 40),
    # the mourners at the stones, and the dead with them
    (12, 34), (10, 33), (14, 35), (10, 30), (13, 37),
    # a diary page on the thorns by the road past the mist
    (35, 48),
]

MAPS = {'greenmarch': greenmarch, 'millbrook': millbrook, 'belltower': belltower, 'weepwood': weepwood, 'kingschase': kingschase,
        'heronreach': heronreach, 'heronlodge': heronlodge, 'lislebarrow': lislebarrow, 'weepingbridge': weepingbridge}

COLORS = {'.': (110, 138, 116), ':': (140, 124, 102), '~': (94, 110, 118), 'T': (44, 68, 56), 'o': (154, 163, 156), '*': (184, 122, 104),
          '#': (60, 64, 60), '_': (116, 122, 116), '=': (124, 108, 88), 'f': (124, 108, 88), 'w': (160, 132, 64), ',': (140, 146, 140),
          'c': (154, 163, 156), '+': (70, 84, 92), 'X': (60, 64, 60), 'G': (40, 40, 40), '&': (10, 10, 14),
          'm': (98, 112, 100), 'r': (120, 116, 108), 'F': (110, 120, 124), 'Y': (36, 34, 44), 'y': (62, 84, 64), 'K': (40, 40, 40)}


def preview(name, out, k=8):
    m = MAPS[name]()
    img = Image.new('RGB', (m.w * k, m.h * k))
    d = ImageDraw.Draw(img)
    for r, row in enumerate(m.rows()):
        for c, ch in enumerate(row):
            d.rectangle([c * k, r * k, c * k + k - 1, r * k + k - 1], fill=COLORS.get(ch, (255, 0, 255)))
    for kind, c, r, w, h, _ in m.props:
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
        props = "".join(f"    {{ kind: '{k}', at: [{c}, {r}]" + (f", when: {wh}" if wh else '') + " },\n" for k, c, r, w, h, wh in m.props)
        new = re.sub(r"  props: \[\n(?:    .*\n)*?  \],", "  props: [\n" + props + "  ],", new, count=1)
        open(path, 'w').write(new)
        print('wrote', name, f'{m.w}x{m.h}')


if __name__ == '__main__':
    if sys.argv[1] == 'preview':
        preview(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == 'props':
        m = MAPS[sys.argv[2]]()
        for kind, c, r, w, h, _ in m.props:
            print(f"    {{ kind: '{kind}', at: [{c}, {r}] }},")
        for nm, at in m.marks.items():
            print('mark', nm, at)
    else:
        write()
