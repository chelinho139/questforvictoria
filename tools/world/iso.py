"""Iso building painter for Quest for Victoria.

Buildings are boxes, gable roofs and pyramid roofs, ray-cast into exact 2:1 pixel faces in
the game's projection (sx = x - y, sy = (x + y) / 2 - z, one world unit = one screen pixel,
a tile is 32 units). Each face is filled from a hand-set material (3–4 tones per material,
lit from the top-left: the south-west faces are lit, the south-east faces shaded, roofs and
tops lightest), and doors, windows and signs are pixel grids drawn straight onto a face in
its own (u, v) space, so they stair-step like hand-drawn iso pixel art.

A Scene's footprint is `w` tiles along x and `h` tiles along y; world (0, 0) is its north
corner. render() returns a PIL image whose bottom-left is the footprint's west corner and
whose bottom is the south corner, as the game anchors it.
"""
from PIL import Image

T = 32


def hexrgb(h):
    n = int(h[1:], 16)
    return ((n >> 16) & 255, (n >> 8) & 255, n & 255)


def hsh(*a):
    """Deterministic hash of integers to [0, 1)."""
    h = 2166136261
    for v in a:
        h = ((h ^ (int(v) & 0xFFFFFFFF)) * 16777619) & 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFFFFFF) / 4294967296


LIT, SHADE, TOP = 0, 1, 2


# ---------------------------------------------------------------- materials
# A material is f(u, v, shade, face) -> '#rrggbb' or None (see-through). u runs left to right
# across the face in pixels, v up the face (walls) or up the slope from the eave (roofs).

def plaster(tones=None):
    t = tones or {LIT: ['#e2d8c6', '#d4c8b4', '#bcae98'], SHADE: ['#a89c88', '#9a8e7a', '#847866'], TOP: ['#ece4d4', '#e0d6c4', '#c8bca8']}
    def f(u, v, sh, face):
        r = hsh(u, v, 3)
        k = 2 if r < 0.035 else 1 if r < 0.22 else 0
        return t[sh][k]
    return f


def timber_frame(posts, rails, wood=None, fill=None, braces=()):
    """Plaster between dark oak posts (u positions, 2 px wide) and rails (v positions, 2 px tall).
    braces: (u0, v0, u1, v1) diagonal beams, 2 px thick."""
    w = wood or {LIT: ['#6a5848', '#4e4038'], SHADE: ['#4a3c34', '#3a2e2a'], TOP: ['#7c6c58', '#5e4e46']}
    base = fill or plaster()
    def on_brace(u, v):
        for u0, v0, u1, v1 in braces:
            if min(u0, u1) <= u <= max(u0, u1):
                t = (u - u0) / (u1 - u0)
                vv = v0 + (v1 - v0) * t
                if abs(v - vv) <= 1.0:
                    return True
        return False
    def f(u, v, sh, face):
        for p in posts:
            if p <= u < p + 2:
                return w[sh][0 if u == p else 1]
        for r in rails:
            if r <= v < r + 2:
                return w[sh][0 if v == r + 1 else 1]
        if on_brace(u, v):
            return w[sh][1]
        return base(u, v, sh, face)
    return f


def stone(tones=None, course=5, seed=1):
    """Coursed stone: rows `course` px tall, stones 6–12 px long, staggered; mortar lines
    darker; a highlight pixel on each stone's top-left."""
    t = tones or {LIT: ['#c8ccc6', '#a8b0a8', '#929a92', '#5c625c'], SHADE: ['#929a92', '#7a827a', '#687068', '#3a403c'], TOP: ['#dcdcd2', '#c0c6be', '#a8b0a8', '#6a706a']}
    def f(u, v, sh, face):
        row = v // course
        dv = v % course
        # stone boundaries in this row
        x = -int(hsh(row, seed) * 9)
        k = 0
        while True:
            ln = 6 + int(hsh(row, k, seed + 1) * 7)
            if x + ln > u:
                break
            x += ln
            k += 1
        du = u - x
        if dv == course - 1 or du == 0:
            return t[sh][3]
        tone = 1 if hsh(row, k, seed + 2) < 0.5 else 2
        if du == 1 and dv == 0:
            return t[sh][0]
        if dv == 0 and hsh(row, k, u) < 0.5:
            return t[sh][tone - 1]
        return t[sh][tone]
    return f


def planks(tones=None, width=5, vertical=True, seed=2):
    t = tones or {LIT: ['#a8987e', '#8c7c66', '#7c6c58', '#4a3c34'], SHADE: ['#7c6c58', '#6a5c4c', '#5e4e46', '#3a2e2a'], TOP: ['#b8a88c', '#a0907a', '#8c7c66', '#5e4e46']}
    def f(u, v, sh, face):
        a, b = (u, v) if vertical else (v, u)
        k = a // width
        da = a % width
        if da == width - 1:
            return t[sh][3]
        if da == 0:
            return t[sh][0]
        # a knot now and then
        if hsh(k, b // 9, seed) < 0.08 and b % 9 == 4 and da == 2:
            return t[sh][3]
        return t[sh][1 if hsh(k, seed) < 0.6 else 2]
    return f


def thatch(tones=None, seed=4):
    """Straw: thin streaks running down the slope (each column its own tone, drifting slowly),
    bundles every 7 px with a light upper lip and a shadowed underside, and a thick rounded
    trimmed edge at the eave."""
    t = tones or ['#e2cc80', '#d0b260', '#b8984a', '#9a7e3e', '#76603a', '#54442e']
    def f(u, v, sh, face):
        off = 1 if sh == SHADE else -1 if sh == TOP else 0
        def tone(i):
            return t[max(0, min(5, i + off))]
        if v < 3:
            return tone(4 if v == 0 else 3 if v == 1 else 2)
        b = (v - 3) % 7
        if b == 6:
            return tone(3 if hsh(u, v // 7, seed) < 0.7 else 2)
        if b == 5 and hsh(u, v // 7, seed + 1) < 0.5:
            return tone(0)
        r = hsh(u, (v + int(hsh(u, seed) * 7)) // 4, seed + 2)
        return tone(1 if r < 0.55 else 2 if r < 0.9 else 0)
    return f


def shingles(tones=None, row=4, width=6, seed=5):
    """Slate or wooden shingles: rows `row` px tall, staggered, a dark lower edge on each row."""
    t = tones or {LIT: ['#7e8e96', '#5e6e76', '#4e5e66', '#2e3840'], SHADE: ['#56646c', '#46545c', '#38444c', '#232c34'], TOP: ['#8a98a0', '#6e7e86', '#5a6870', '#38444c']}
    def f(u, v, sh, face):
        r = v // row
        dv = v % row
        uu = u + (width // 2 if r % 2 else 0)
        k = uu // width
        du = uu % width
        if dv == 0:
            return t[sh][3]
        if du == width - 1:
            return t[sh][2]
        if dv == row - 1:
            return t[sh][0]
        return t[sh][1 if hsh(k, r, seed) < 0.75 else 2]
    return f


def flat_tone(lit, shade, top=None):
    return lambda u, v, sh, face: {LIT: lit, SHADE: shade, TOP: top or lit}[sh]


# ---------------------------------------------------------------- the scene
class Scene:
    def __init__(self, w, h, top, pad=4):
        """Footprint `w`×`h` tiles; `top`: height of the tallest point in px (headroom)."""
        self.w, self.h = w, h
        self.top = top + pad
        self.W = (w + h) * T
        self.H = self.top + (w + h) * 16
        self.surfs = []
        self.decals = {}

    # -- faces ---------------------------------------------------------
    def wall_x(self, X, y0, y1, z0, z1, mat, name, zmax=None):
        """The south-east-facing wall x = X (shaded); u from its south end."""
        def hit(a, b):
            s = 2 * X - a
            y = X - a
            z = s / 2 - b
            if not (y0 <= y <= y1 and z0 <= z <= z1):
                return None
            if zmax and z > zmax(y):
                return None
            return s, y1 - y, z - z0
        self.surfs.append((hit, mat, SHADE, name))

    def wall_y(self, Y, x0, x1, z0, z1, mat, name, zmax=None):
        """The south-west-facing wall y = Y (lit); u from its west end."""
        def hit(a, b):
            s = 2 * Y + a
            x = Y + a
            z = s / 2 - b
            if not (x0 <= x <= x1 and z0 <= z <= z1):
                return None
            if zmax and z > zmax(x):
                return None
            return s, x - x0, z - z0
        self.surfs.append((hit, mat, LIT, name))

    def flat(self, Z, x0, x1, y0, y1, mat, name):
        def hit(a, b):
            s = 2 * (Z + b)
            x = (s + a) / 2
            y = (s - a) / 2
            if not (x0 <= x <= x1 and y0 <= y <= y1):
                return None
            return s, x - x0, y1 - y
        self.surfs.append((hit, mat, TOP, name))

    def box(self, x0, x1, y0, y1, z0, z1, mat, name, top_mat=None):
        self.wall_x(x1, y0, y1, z0, z1, mat, name + '.x')
        self.wall_y(y1, x0, x1, z0, z1, mat, name + '.y')
        self.flat(z1, x0, x1, y0, y1, top_mat or mat, name + '.top')

    def gable_x(self, x0, x1, y0, y1, ze, zr, roof, wall, name, ov=3, gx=None):
        """A gable roof with its ridge along x over the walls x0..x1, y0..y1 (eaves at ze,
        ridge at zr), overhanging `ov` px. The gable end at x1 (or gx) is walled in `wall`."""
        ym = (y0 + y1) / 2
        k = (zr - ze) / ((y1 - y0) / 2)
        Y0, Y1, X0, X1 = y0 - ov, y1 + ov, x0 - ov, x1 + ov
        zlow = ze - ov * k
        vs = 0.5 + k
        def front(a, b):
            s = 2 * (zr + b + k * a / 2 + k * ym) / (1 + k)
            x = (s + a) / 2
            y = (s - a) / 2
            if not (X0 <= x <= X1 and ym <= y <= Y1):
                return None
            return s, x - X0, (Y1 - y) * vs
        def back(a, b):
            if abs(1 - k) < 1e-6:
                return None
            s = 2 * (zr + b - k * a / 2 - k * ym) / (1 - k)
            x = (s + a) / 2
            y = (s - a) / 2
            if not (X0 <= x <= X1 and Y0 <= y <= ym) or k >= 1:
                return None
            return s, x - X0, (y - Y0) * vs
        # the roof's thickness along the gable edge (a bargeboard)
        def edge(a, b):
            s = 2 * X1 - a
            y = X1 - a
            z = s / 2 - b
            if not (Y0 <= y <= Y1):
                return None
            zt = zr - abs(y - ym) * k
            if not (zt - 3 <= z <= zt):
                return None
            return s, Y1 - y, zt - z
        self.surfs.append((front, roof, LIT, name + '.front'))
        self.surfs.append((back, roof, TOP, name + '.back'))
        self.surfs.append((edge, flat_tone('#4a3c34', '#3a2e2a'), SHADE, name + '.edge'))
        gxx = gx if gx is not None else x1
        self.wall_x(gxx, y0, y1, ze, zr, wall, name + '.gable', zmax=lambda y: zr - abs(y - ym) * k)
        return zlow

    def gable_y(self, x0, x1, y0, y1, ze, zr, roof, wall, name, ov=3, gy=None):
        """A gable roof with its ridge along y; the gable end faces south-west (lit) at y1."""
        xm = (x0 + x1) / 2
        k = (zr - ze) / ((x1 - x0) / 2)
        Y0, Y1, X0, X1 = y0 - ov, y1 + ov, x0 - ov, x1 + ov
        vs = 0.5 + k
        def side(a, b):
            s = 2 * (zr + b - k * a / 2 + k * xm) / (1 + k)
            x = (s + a) / 2
            y = (s - a) / 2
            if not (xm <= x <= X1 and Y0 <= y <= Y1):
                return None
            return s, Y1 - y, (X1 - x) * vs
        def back(a, b):
            if k >= 1:
                return None
            s = 2 * (zr + b + k * a / 2 - k * xm) / (1 - k)
            x = (s + a) / 2
            y = (s - a) / 2
            if not (X0 <= x <= xm and Y0 <= y <= Y1):
                return None
            return s, Y1 - y, (x - X0) * vs
        def edge(a, b):
            s = 2 * Y1 + a
            x = Y1 + a
            z = s / 2 - b
            if not (X0 <= x <= X1):
                return None
            zt = zr - abs(x - xm) * k
            if not (zt - 3 <= z <= zt):
                return None
            return s, x - X0, zt - z
        self.surfs.append((side, roof, SHADE, name + '.side'))
        self.surfs.append((back, roof, TOP, name + '.back'))
        self.surfs.append((edge, flat_tone('#5e4e46', '#4a3c34'), LIT, name + '.edge'))
        gyy = gy if gy is not None else y1
        self.wall_y(gyy, x0, x1, ze, zr, wall, name + '.gable', zmax=lambda x: zr - abs(x - xm) * k)

    def pyramid(self, x0, x1, y0, y1, ze, zr, roof, name, ov=2):
        """A four-sided roof to a point (towers, the well's hood)."""
        xm, ym = (x0 + x1) / 2, (y0 + y1) / 2
        hx = (x1 - x0) / 2 + ov
        k = (zr - ze) / ((x1 - x0) / 2)
        vs = 0.5 + k
        def fy(a, b):
            s = 2 * (zr + b + k * a / 2 + k * ym) / (1 + k)
            x = (s + a) / 2
            y = (s - a) / 2
            if not (y - ym >= abs(x - xm) and y - ym <= hx):
                return None
            return s, x - (xm - hx), (ym + hx - y) * vs
        def fx(a, b):
            s = 2 * (zr + b - k * a / 2 + k * xm) / (1 + k)
            x = (s + a) / 2
            y = (s - a) / 2
            if not (x - xm >= abs(y - ym) and x - xm <= hx):
                return None
            return s, ym + hx - y, (xm + hx - x) * vs
        self.surfs.append((fy, roof, LIT, name + '.y'))
        self.surfs.append((fx, roof, SHADE, name + '.x'))

    def shed(self, x0, x1, y0, y1, zt, zb, roof, name):
        """A lean-to roof: one slope from zt at y0 down to zb at y1 (facing south-west, lit)."""
        k = (zt - zb) / (y1 - y0)
        vs = 0.5 + k
        def hit(a, b):
            # z = zt - (y - y0) k
            s = 2 * (zt + b + k * a / 2 + k * y0) / (1 + k)
            x = (s + a) / 2
            y = (s - a) / 2
            if not (x0 <= x <= x1 and y0 <= y <= y1):
                return None
            return s, x - x0, (y1 - y) * vs
        def edge(a, b):
            s = 2 * x1 - a
            y = x1 - a
            z = s / 2 - b
            if not (y0 <= y <= y1):
                return None
            zz = zt - (y - y0) * k
            if not (zz - 2 <= z <= zz):
                return None
            return s, y1 - y, zz - z
        self.surfs.append((hit, roof, LIT, name))
        self.surfs.append((edge, roof, SHADE, name + '.edge'))

    def cylinder(self, cx, cy, r, z0, z1, mat, name, top_mat=None, inner=None):
        """An upright cylinder; `inner` (radius) hollows its top (a well)."""
        def side(a, b):
            # x = (s + a) / 2, y = (s - a) / 2: (x - cx)^2 + (y - cy)^2 = r^2
            p = a / 2 - cx
            q = -a / 2 - cy
            # (s/2 + p)^2 + (s/2 + q)^2 = r^2  ->  s^2/2 + s (p + q) + p^2 + q^2 - r^2 = 0
            A, B, C = 0.5, p + q, p * p + q * q - r * r
            d = B * B - 4 * A * C
            if d < 0:
                return None
            s = (-B + d ** 0.5) / (2 * A)
            x = (s + a) / 2
            y = (s - a) / 2
            z = s / 2 - b
            if not (z0 <= z <= z1):
                return None
            import math
            ang = math.atan2(y - cy, x - cx)
            # u runs left to right across the visible half (from the west round to the east)
            u = (math.pi * 0.75 - ang) * r
            sh = LIT if ang > math.pi / 4 else SHADE
            return s, u, z - z0, sh
        def top(a, b):
            s = 2 * (z1 + b)
            x = (s + a) / 2
            y = (s - a) / 2
            d2 = (x - cx) ** 2 + (y - cy) ** 2
            if d2 > r * r:
                return None
            if inner and d2 < inner * inner:
                return None
            return s, x - cx + r, y - cy + r
        self.surfs.append((side, mat, None, name))
        self.surfs.append((top, top_mat or mat, TOP, name + '.top'))
        if inner:
            # the dark inside of the shaft, seen over the far rim
            def well(a, b):
                p = a / 2 - cx
                q = -a / 2 - cy
                A, B, C = 0.5, p + q, p * p + q * q - inner * inner
                d = B * B - 4 * A * C
                if d < 0:
                    return None
                s = (-B - d ** 0.5) / (2 * A)
                z = s / 2 - b
                if not (z1 - 30 <= z <= z1):
                    return None
                return s, 0, z1 - z
            self.surfs.append((well, lambda u, v, sh, f: '#1d1b22' if v > 3 else '#2e3840', SHADE, name + '.shaft'))

    def sphere(self, cx, cy, cz, r, tones, name, squash=1.0, seed=0, leafy=0.0):
        """A boulder: a sphere (squashed in height), shaded in flat facets from the top-left."""
        ca = cx - cy
        cb = (cx + cy) / 2 - cz
        ra = 1.5 * r + 2
        rb = r * (1 + squash) + 2
        def hit(a, b):
            if abs(a - ca) > ra or abs(b - cb) > rb:
                return None
            # x = (s+a)/2, y = (s-a)/2, z = s/2 - b; ((z - cz)/squash)
            p = a / 2 - cx
            q = -a / 2 - cy
            w = -b - cz
            k = 1 / squash
            A = 0.5 + 0.25 * k * k
            B = p + q + w * k * k
            C = p * p + q * q + w * w * k * k - r * r
            d = B * B - 4 * A * C
            if d < 0:
                return None
            s = (-B + d ** 0.5) / (2 * A)
            x = (s + a) / 2
            y = (s - a) / 2
            z = s / 2 - b
            if z < 0:
                return None
            nx, ny, nz = (x - cx) / r, (y - cy) / r, (z - cz) / (r * squash * squash)
            n = (nx * nx + ny * ny + nz * nz) ** 0.5
            nx, ny, nz = nx / n, ny / n, nz / n
            # facets: quantise the normal so the rock reads as chipped stone, not a ball
            j = 2.2
            qx, qy, qz = round(nx * j + hsh(seed, 1) - 0.5), round(ny * j + hsh(seed, 2) - 0.5), round(nz * j)
            qn = (qx * qx + qy * qy + qz * qz) ** 0.5 or 1
            # light from the top-left of the screen: up, and toward -x +y (south-west)
            l = (-0.5, 0.3, 0.81)
            lam = (qx * l[0] + qy * l[1] + qz * l[2]) / qn
            lam += (hsh(qx, qy, qz, seed) - 0.5) * 0.2
            return s, lam, z
        def mat(lam, z, sh, face):
            if leafy:
                # leaves: break the facets up with clumps of light and shade
                lam += (hsh(int(z * 3), int(lam * 40), seed) - 0.5) * leafy
            return tones[0 if lam > 0.75 else 1 if lam > 0.45 else 2 if lam > 0.1 else 3]
        self.surfs.append((hit, mat, 'raw', name))

    def dome(self, cx, cy, rx, ry, h, mat, name):
        """A grassy mound: z = h (1 - ((x-cx)/rx)^2 - ((y-cy)/ry)^2)."""
        def hit(a, b):
            # z = s/2 - b; x = (s+a)/2; y = (s-a)/2
            # s/2 - b = h - h ((s+a)/2 - cx)^2 / rx^2 - h ((s-a)/2 - cy)^2 / ry^2
            p = a / 2 - cx
            q = -a / 2 - cy
            ka, kb = h / (rx * rx), h / (ry * ry)
            A = 0.25 * (ka + kb)
            B = 0.5 + ka * p + kb * q
            C = ka * p * p + kb * q * q - b - h
            d = B * B - 4 * A * C
            if d < 0:
                return None
            s = (-B + d ** 0.5) / (2 * A)
            x = (s + a) / 2
            y = (s - a) / 2
            z = s / 2 - b
            if z < 0:
                return None
            # slope toward the viewer-left is lit
            gx = -2 * ka * (x - cx)
            gy = -2 * kb * (y - cy)
            lam = 0.55 + 0.45 * gx - 0.35 * gy + 0.15 * (z / h)
            return s, lam, z, x, y
        def wrap(a, b):
            r = hit(a, b)
            if not r:
                return None
            s, lam, z, x, y = r
            return s, lam, (x, y, z)
        self.surfs.append((wrap, mat, 'raw', name))

    def decal(self, name, u0, v0, rows, pal):
        """Draw a pixel grid on face `name`: its bottom-left pixel at (u0, v0) in face space."""
        self.decals.setdefault(name, []).append((u0, v0, rows, pal))

    # -- render --------------------------------------------------------
    def render(self, extra=None):
        """Ray-cast every pixel. `extra(img, ox, oy)` may draw hand-placed pixels afterwards.
        The image has a 1 px margin left, right and below for the outline: its left edge is
        the footprint's west corner - 1, its bottom edge the south corner + 1."""
        img = Image.new('RGBA', (self.W + 2, self.H + 1), (0, 0, 0, 0))
        names = {}
        ox = self.h * T
        for sy in range(self.H):
            for sx in range(self.W):
                a = sx + 0.5 - ox
                b = sy + 0.5 - self.top
                best = None
                for hit, mat, sh, name in self.surfs:
                    r = hit(a, b)
                    if r and (best is None or r[0] > best[0] + 1e-9):
                        best = (r[0], r[1], r[2], mat, r[3] if len(r) > 3 else sh, name)
                if not best:
                    continue
                _, u, v, mat, sh, name = best
                if sh == 'raw':
                    col = mat(u, v, sh, name)
                    if col:
                        img.putpixel((sx + 1, sy), hexrgb(col) + (255,))
                    continue
                ui, vi = int(u), int(v)
                col = None
                for u0, v0, rows, pal in self.decals.get(name, []):
                    du, dv = ui - u0, vi - v0
                    if 0 <= dv < len(rows) and 0 <= du < len(rows[0]):
                        ch = rows[len(rows) - 1 - dv][du]
                        if ch != '.':
                            col = pal[ch]
                if col is None:
                    col = mat(ui, vi, sh, name)
                if col:
                    img.putpixel((sx + 1, sy), hexrgb(col) + (255,))
                    names[(sx, sy)] = name
        extra = extra or getattr(self, 'extra', None)
        if extra:
            extra(img, 1 + self.h * T, self.top)
        return img


def outline(img, k=0.22):
    """The game's auto outline: transparent pixels next to a coloured one take its colour × k."""
    w, h = img.size
    src = img.copy()
    px = src.load()
    out = img.load()
    for y in range(h):
        for x in range(w):
            if px[x, y][3]:
                continue
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < w and 0 <= yy < h and px[xx, yy][3]:
                    r, g, b, _ = px[xx, yy]
                    out[x, y] = (round(r * k), round(g * k), round(b * k), 255)
                    break
    return img


def to_rows(img, chars=None):
    """Palette-index an image: (rows, {char: '#rrggbb'}). Transparent is '.'."""
    chars = chars or 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&*+-/:;<=>?@^_~|'
    w, h = img.size
    px = img.load()
    pal = {}
    rows = []
    for y in range(h):
        r = []
        for x in range(w):
            p = px[x, y]
            if not p[3]:
                r.append('.')
                continue
            hx = '#%02x%02x%02x' % p[:3]
            if hx not in pal:
                if len(pal) >= len(chars):
                    raise ValueError('too many colours')
                pal[hx] = chars[len(pal)]
            r.append(pal[hx])
        rows.append(''.join(r))
    return rows, {v: k for k, v in pal.items()}


def crop_top(img):
    """Trim empty rows above the art (the bottom stays: it is the anchor)."""
    bbox = img.getbbox()
    if not bbox:
        return img, 0
    return img.crop((0, bbox[1], img.width, img.height)), bbox[1]


def magnify(imgs, scale=4, bg=(120, 150, 96), gap=8):
    W = sum(i.width for i in imgs) + gap * (len(imgs) + 1)
    H = max(i.height for i in imgs) + 2 * gap
    out = Image.new('RGBA', (W, H), bg + (255,))
    x = gap
    for i in imgs:
        out.alpha_composite(i, (x, H - gap - i.height))
        x += i.width + gap
    return out.resize((W * scale, H * scale), Image.NEAREST)


# ---------------------------------------------------------------- the game's recolour
# A port of src/phaser/render/regrade.ts, so previews show what HD · Silhouette makes of it.
import colorsys

RAMPS = {
    'foliage': ['#24352c', '#2c4438', '#3c5a4a', '#4a6454', '#56705f', '#6e8a74'],
    'olive': ['#2e3428', '#434c38', '#5a664b', '#6f7c5c', '#8a9878', '#a4b094'],
    'stone': ['#1d1b22', '#3a403c', '#5c625c', '#747a74', '#9aa39c', '#c8ccc6', '#e6e0d2'],
    'slate': ['#1d1b22', '#2e3840', '#38444c', '#46545c', '#5e6e76', '#8a98a0'],
    'teal': ['#3e5660', '#6a8890', '#8aa4ac', '#a8c0c6'],
    'plum': ['#2e2632', '#463b50', '#574a62', '#6e6078', '#8a7e94'],
    'rust': ['#3a2226', '#5e3a36', '#7a4a40', '#9a5a4a', '#b87a68'],
    'pink': ['#9a6e68', '#b88a80', '#c89088', '#dcb0a8'],
    'skin': ['#8a6e5a', '#b8977c', '#d9b99b', '#e8d0b8'],
    'ochre': ['#6e5a30', '#a08440', '#c9a24e', '#d8c070'],
    'earth': ['#2a2226', '#4a3c34', '#5e4e46', '#7c6c58', '#8c7c66', '#a8987e'],
}


def _hsl(rgb):
    r, g, b = (c / 255 for c in rgb)
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    if mx == mn:
        return 0, 0, l
    d = mx - mn
    s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
    if mx == r:
        h = (g - b) / d + (6 if g < b else 0)
    elif mx == g:
        h = (b - r) / d + 2
    else:
        h = (r - g) / d + 4
    return h * 60, s, l


_RAMP = {k: [(hexrgb(c), _hsl(hexrgb(c))[2]) for c in v] for k, v in RAMPS.items()}


def _family(h, s, l, greens='foliage'):
    if s < 0.12 or l > 0.9:
        return 'stone'
    if 70 <= h < 170:
        return greens
    if 170 <= h < 200:
        return 'teal'
    if 200 <= h < 255:
        return 'stone' if l > 0.85 else 'slate'
    if 255 <= h < 320:
        return 'plum'
    if h >= 320 or h < 12:
        return 'pink' if l > 0.68 else 'rust'
    if l > 0.62 and h < 42 and s > 0.3:
        return 'skin'
    if h >= 38 and s > 0.55 and l > 0.45:
        return 'ochre'
    return 'earth'


def regrade(img, greens='foliage'):
    out = img.copy()
    px = out.load()
    memo = {}
    for y in range(out.height):
        for x in range(out.width):
            p = px[x, y]
            if not p[3]:
                continue
            if p[:3] not in memo:
                h, s, l = _hsl(p[:3])
                ramp = _RAMP[_family(h, s, l, greens)]
                t = 0.1 + 0.8 * l
                memo[p[:3]] = min(ramp, key=lambda e: abs(e[1] - t))[0]
            px[x, y] = memo[p[:3]] + (p[3],)
    return out
