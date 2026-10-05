"""The buildings and big props of Act II (the Weepwood, Kilnholt, the King's Chase, Heron Reach,
the Weeping Bridge, and the rooms of Heron Lodge and the Lisle Barrow), drawn with iso.py in
the style of buildings.py. Run to write a magnified review sheet (day, and night for the lit
ones): python3 buildings2.py out.png [name ...]

Besides iso.py's walls, roofs and boxes, these props need round and crooked things (poles,
branches, thorns, vines, bone spikes, ropes), hewn stone, slanted planes and see-through
sprites, so this file adds a few primitives to the same ray-caster: tubes (chains of rounded
cones), convex polyhedra (hewn stones), parallelograms, ellipsoids and pixel sprites standing
in the world. Scene2 is iso's Scene with a binned renderer, so props built from hundreds of
small parts still render in a few seconds; it draws exactly what Scene would.
"""
import math
import sys
from PIL import Image
from iso import Scene, T, hsh, hexrgb, stone, planks, shingles, plaster, timber_frame, flat_tone, outline, magnify, LIT, SHADE, TOP
from buildings import WOOD, GLASS, GLASS_LIT, DOOR, SMALL_WINDOW, STONE_T, DARK

# light from the top-left of the screen: up, toward -x (screen left) and +y (toward the viewer)
_l = (-0.5, 0.3, 0.81)
_n = math.sqrt(sum(c * c for c in _l))
LX, LY, LZ = (c / _n for c in _l)
K3 = -1 / math.sqrt(3)  # the view ray's direction (away from the viewer), each component


def lam_of(nx, ny, nz):
    return nx * LX + ny * LY + nz * LZ


def norm(x, y, z):
    n = math.sqrt(x * x + y * y + z * z) or 1.0
    return x / n, y / n, z / n


def wb(x0, x1, y0, y1, z0, z1, m=2):
    """The screen (a, b) bounding box of a world box, for the binned renderer."""
    return (x0 - y1 - m, x1 - y0 + m, (x0 + y0) / 2 - z1 - m, (x1 + y1) / 2 - z0 + m)


def pick(tones, lam, cuts=(0.62, 0.3, -0.05)):
    for i, c in enumerate(cuts):
        if lam > c:
            return tones[i]
    return tones[len(cuts)]


# ---------------------------------------------------------------- the scene
class Scene2(Scene):
    """iso.Scene, with every surface given a screen bounding box so render() only tries the
    surfaces that can reach each pixel."""

    def __init__(self, w, h, top, pad=4):
        super().__init__(w, h, top, pad)
        self.bbs = {}

    def add(self, hit, mat, sh, name, bb=None):
        self.surfs.append((hit, mat, sh, name))
        if bb is not None:
            self.bbs[len(self.surfs) - 1] = bb

    def _tag(self, n, bb):
        for i in range(n, len(self.surfs)):
            self.bbs[i] = bb

    def wall_x(self, X, y0, y1, z0, z1, mat, name, zmax=None):
        n = len(self.surfs)
        super().wall_x(X, y0, y1, z0, z1, mat, name, zmax)
        self._tag(n, wb(X, X, y0, y1, z0, z1))

    def wall_y(self, Y, x0, x1, z0, z1, mat, name, zmax=None):
        n = len(self.surfs)
        super().wall_y(Y, x0, x1, z0, z1, mat, name, zmax)
        self._tag(n, wb(x0, x1, Y, Y, z0, z1))

    def flat(self, Z, x0, x1, y0, y1, mat, name):
        n = len(self.surfs)
        super().flat(Z, x0, x1, y0, y1, mat, name)
        self._tag(n, wb(x0, x1, y0, y1, Z, Z))

    def gable_x(self, x0, x1, y0, y1, ze, zr, roof, wall, name, ov=3, gx=None):
        n = len(self.surfs)
        k = (zr - ze) / ((y1 - y0) / 2)
        r = super().gable_x(x0, x1, y0, y1, ze, zr, roof, wall, name, ov, gx)
        self._tag(n, wb(x0 - ov, x1 + ov, y0 - ov, y1 + ov, ze - ov * k - 4, zr + 1))
        return r

    def gable_y(self, x0, x1, y0, y1, ze, zr, roof, wall, name, ov=3, gy=None):
        n = len(self.surfs)
        k = (zr - ze) / ((x1 - x0) / 2)
        super().gable_y(x0, x1, y0, y1, ze, zr, roof, wall, name, ov, gy)
        self._tag(n, wb(x0 - ov, x1 + ov, y0 - ov, y1 + ov, ze - ov * k - 4, zr + 1))

    def pyramid(self, x0, x1, y0, y1, ze, zr, roof, name, ov=2):
        n = len(self.surfs)
        k = (zr - ze) / ((x1 - x0) / 2)
        super().pyramid(x0, x1, y0, y1, ze, zr, roof, name, ov)
        self._tag(n, wb(x0 - ov, x1 + ov, y0 - ov, y1 + ov, ze - ov * k - 4, zr + 1))

    def shed(self, x0, x1, y0, y1, zt, zb, roof, name):
        n = len(self.surfs)
        super().shed(x0, x1, y0, y1, zt, zb, roof, name)
        self._tag(n, wb(x0, x1, y0, y1, zb - 3, zt + 1))

    def cylinder(self, cx, cy, r, z0, z1, mat, name, top_mat=None, inner=None):
        n = len(self.surfs)
        super().cylinder(cx, cy, r, z0, z1, mat, name, top_mat, inner)
        self._tag(n, wb(cx - r, cx + r, cy - r, cy + r, z0 - (30 if inner else 0), z1))

    def sphere(self, cx, cy, cz, r, tones, name, squash=1.0, seed=0, leafy=0.0):
        n = len(self.surfs)
        super().sphere(cx, cy, cz, r, tones, name, squash, seed, leafy)
        ca, cb = cx - cy, (cx + cy) / 2 - cz
        ra, rb = 1.5 * r + 2, r * (1 + squash) + 2
        self._tag(n, (ca - ra - 1, ca + ra + 1, cb - rb - 1, cb + rb + 1))

    def dome(self, cx, cy, rx, ry, h, mat, name):
        n = len(self.surfs)
        super().dome(cx, cy, rx, ry, h, mat, name)
        self._tag(n, wb(cx - rx, cx + rx, cy - ry, cy + ry, 0, h))

    def render(self, extra=None):
        img = Image.new('RGBA', (self.W + 2, self.H + 1), (0, 0, 0, 0))
        px = img.load()
        ox = self.h * T
        C = 8
        ncol, nrow = self.W // C + 1, self.H // C + 1
        cells = [[] for _ in range(ncol * nrow)]
        for i in range(len(self.surfs)):
            bb = self.bbs.get(i)
            if bb is None:
                c0, c1, r0, r1 = 0, ncol - 1, 0, nrow - 1
            else:
                a0, a1, b0, b1 = bb
                c0, c1 = max(0, int((a0 + ox) // C) - 1), min(ncol - 1, int((a1 + ox) // C) + 1)
                r0, r1 = max(0, int((b0 + self.top) // C) - 1), min(nrow - 1, int((b1 + self.top) // C) + 1)
            for r in range(r0, r1 + 1):
                base = r * ncol
                for c in range(c0, c1 + 1):
                    cells[base + c].append(i)
        surfs = self.surfs
        for sy in range(self.H):
            b = sy + 0.5 - self.top
            rowc = (sy // C) * ncol
            for sx in range(self.W):
                cand = cells[rowc + sx // C]
                if not cand:
                    continue
                a = sx + 0.5 - ox
                best = None
                for i in cand:
                    hit, mat, sh, name = surfs[i]
                    r = hit(a, b)
                    if r and (best is None or r[0] > best[0] + 1e-9):
                        best = (r[0], r[1], r[2], mat, r[3] if len(r) > 3 else sh, name)
                if not best:
                    continue
                _, u, v, mat, sh, name = best
                if sh == 'raw':
                    col = mat(u, v, sh, name)
                    if col:
                        px[sx + 1, sy] = hexrgb(col) + (255,)
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
                    px[sx + 1, sy] = hexrgb(col) + (255,)
        extra = extra or getattr(self, 'extra', None)
        if extra:
            extra(img, 1 + self.h * T, self.top)
        return img

    def to_screen(self, x, y, z):
        """World point -> pixel in the rendered image (for hand-placed pixels in `extra`)."""
        return int(math.floor(x - y + 1 + self.h * T)), int(math.floor((x + y) / 2 - z + self.top))


# ---------------------------------------------------------------- new primitives
def rcone(s, p0, p1, r0, r1, mat, name, zmin=None, along0=0.0, data=None):
    """A rounded cone: spheres of radius r0 at p0 and r1 at p1 joined by the cone tangent to
    both (a capsule when r0 == r1). A 'raw' surface: mat(lam, info, 'raw', name) with
    info = (x, y, z, nx, ny, nz, along, ang, r, data): along is px from the tube's start,
    ang the angle round its axis (0 on the side facing up, or +x for an upright tube)."""
    ax, ay, az = p0
    bx, by, bz = p1
    bax, bay, baz = bx - ax, by - ay, bz - az
    m0 = bax * bax + bay * bay + baz * baz
    L = math.sqrt(m0) or 1e-6
    rr = r0 - r1
    d2 = m0 - rr * rr
    if d2 <= 1e-6:
        return
    # a frame round the axis
    Ax, Ay, Az = bax / L, bay / L, baz / L
    if abs(Az) > 0.9:
        # an upright tube: measure round from +x, made perpendicular to the axis
        Rx, Ry, Rz = norm(1 - Ax * Ax, -Ax * Ay, -Ax * Az)
    else:
        Rx, Ry, Rz = norm(-Az * Ax, -Az * Ay, 1 - Az * Az)  # the up direction, made perpendicular
    Qx, Qy, Qz = Ay * Rz - Az * Ry, Az * Rx - Ax * Rz, Ax * Ry - Ay * Rx
    S = 2000.0
    m2 = (bax + bay + baz) * K3
    k2 = d2 - m2 * m2
    def hit(a, b):
        ox, oy, oz = (S + a) / 2, (S - a) / 2, S / 2 - b
        oax, oay, oaz = ox - ax, oy - ay, oz - az
        m1 = bax * oax + bay * oay + baz * oaz
        m3 = (oax + oay + oaz) * K3
        m5 = oax * oax + oay * oay + oaz * oaz
        t = None
        if abs(k2) > 1e-9:
            k1 = d2 * m3 - m1 * m2 + m2 * rr * r0
            k0 = d2 * m5 - m1 * m1 + m1 * rr * r0 * 2 - m0 * r0 * r0
            h = k1 * k1 - k0 * k2
            if h < 0:
                return None
            tt = (-math.sqrt(h) - k1) / k2
            y = m1 - r0 * rr + tt * m2
            if 0 < y < d2:
                t = tt
                nx, ny, nz = norm(d2 * (oax + tt * K3) - bax * y, d2 * (oay + tt * K3) - bay * y, d2 * (oaz + tt * K3) - baz * y)
                along = y / d2 * L
        if t is None:
            obx, oby, obz = ox - bx, oy - by, oz - bz
            m6 = (obx + oby + obz) * K3
            m7 = obx * obx + oby * oby + obz * obz
            h1 = m3 * m3 - m5 + r0 * r0
            h2 = m6 * m6 - m7 + r1 * r1
            best = None
            if h1 > 0:
                tt = -m3 - math.sqrt(h1)
                best = (tt, (oax + tt * K3) / r0, (oay + tt * K3) / r0, (oaz + tt * K3) / r0, 0.0)
            if h2 > 0:
                tt = -m6 - math.sqrt(h2)
                if best is None or tt < best[0]:
                    best = (tt, (obx + tt * K3) / r1, (oby + tt * K3) / r1, (obz + tt * K3) / r1, L)
            if best is None:
                return None
            t, nx, ny, nz, along = best
        x, y, z = ox + t * K3, oy + t * K3, oz + t * K3
        if zmin is not None and z < zmin:
            return None
        ang = math.atan2(nx * Qx + ny * Qy + nz * Qz, nx * Rx + ny * Ry + nz * Rz)
        rad = r0 - rr * min(1.0, max(0.0, along / L))
        return 2 * x - a, lam_of(nx, ny, nz), (x, y, z, nx, ny, nz, along0 + along, ang, rad, data)
    m = max(r0, r1) + 1
    bb = wb(min(ax, bx) - m, max(ax, bx) + m, min(ay, by) - m, max(ay, by) + m, min(az, bz) - m, max(az, bz) + m)
    s.add(hit, mat, 'raw', name, bb)


def tube(s, pts, radii, mat, name, zmin=None, data=None):
    """A crooked pole, branch or vine: rounded cones through `pts` with `radii`."""
    if not isinstance(radii, (list, tuple)):
        radii = [radii] * len(pts)
    along = 0.0
    for i in range(len(pts) - 1):
        rcone(s, pts[i], pts[i + 1], radii[i], radii[i + 1], mat, '%s%d' % (name, i), zmin, along, data)
        along += math.dist(pts[i], pts[i + 1])


def curve(p0, p1, p2, n=8, p3=None):
    """Points along a quadratic (or cubic, with p3) Bezier."""
    out = []
    for i in range(n + 1):
        t = i / n
        if p3 is None:
            a, b, c = (1 - t) ** 2, 2 * (1 - t) * t, t * t
            out.append(tuple(a * p0[k] + b * p1[k] + c * p2[k] for k in range(3)))
        else:
            a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3
            out.append(tuple(a * p0[k] + b * p1[k] + c * p2[k] + d * p3[k] for k in range(3)))
    return out


def poly(s, planes, mat, name, bb, data=None):
    """A convex polyhedron: the points with n·p <= d for every plane (n, d). 'raw':
    mat(lam, info, 'raw', name), info = (face, x, y, z, nx, ny, nz, data)."""
    pre = []
    for (n, d) in planes:
        nx, ny, nz = n
        pre.append((nx, ny, nz, d, (nx + ny + nz) / 2))
    def hit(a, b):
        lo, hi, fi = -1e9, 1e9, -1
        for i, (nx, ny, nz, d, nd) in enumerate(pre):
            no = (nx - ny) * a / 2 - nz * b
            if nd > 1e-12:
                v = (d - no) / nd
                if v < hi:
                    hi, fi = v, i
            elif nd < -1e-12:
                v = (d - no) / nd
                if v > lo:
                    lo = v
            elif no > d:
                return None
        if fi < 0 or hi < lo:
            return None
        nx, ny, nz = pre[fi][:3]
        return hi, lam_of(nx, ny, nz), (fi, (hi + a) / 2, (hi - a) / 2, hi / 2 - b, nx, ny, nz, data)
    s.add(hit, mat, 'raw', name, wb(*bb))


def plane(n, p):
    """The half-space n·q <= n·p (n need not be unit)."""
    n = norm(*n)
    return (n, n[0] * p[0] + n[1] * p[1] + n[2] * p[2])


def hewn(x0, x1, y0, y1, z0, z1, cham=2.0, taper=0.0, top_tilt=(0.0, 0.0), seed=0, jit=0.0, top_cham=None):
    """Planes of a roughly squared stone: a box whose sides lean in by `taper` (px per px of
    height), its vertical edges and top edges chamfered, each plane jittered a little."""
    r = lambda k: (hsh(seed, k, 7) - 0.5) * 2 * jit
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    tc = cham if top_cham is None else top_cham
    P = []
    P.append(plane((1, r(1), taper), (x1, cy, z0)))
    P.append(plane((-1, r(2), taper), (x0, cy, z0)))
    P.append(plane((r(3), 1, taper), (cx, y1, z0)))
    P.append(plane((r(4), -1, taper), (cx, y0, z0)))
    P.append(plane((top_tilt[0] + r(5), top_tilt[1] + r(6), 1), (cx, cy, z1)))
    P.append(plane((0, 0, -1), (cx, cy, z0)))
    if cham:
        for i, (sx, sy) in enumerate(((1, 1), (1, -1), (-1, 1), (-1, -1))):
            px = x1 if sx > 0 else x0
            py = y1 if sy > 0 else y0
            P.append(plane((sx * (1 + r(10 + i)), sy * (1 - r(10 + i)), taper * 1.4), (px - sx * cham * 0.7, py - sy * cham * 0.7, z0)))
    if tc:
        for i, (nx, ny) in enumerate(((1, 0), (-1, 0), (0, 1), (0, -1))):
            px = x1 if nx > 0 else x0 if nx < 0 else cx
            py = y1 if ny > 0 else y0 if ny < 0 else cy
            P.append(plane((nx + r(20 + i) * 0.5, ny + r(24 + i) * 0.5, 1.0), (px - nx * tc, py - ny * tc, z1)))
    return P


def slab(cx, cy, w, d, z0, z1, ang, cham=1.5, seed=0, jit=0.1, taper=0.05):
    """Planes of a rough block `w` long and `d` deep turned by `ang`, its top edges chamfered."""
    r = lambda k: (hsh(seed, k, 9) - 0.5) * 2 * jit
    c, s_ = math.cos(ang), math.sin(ang)
    P = []
    for i, (nx, ny, half) in enumerate(((c, s_, w / 2), (-c, -s_, w / 2), (-s_, c, d / 2), (s_, -c, d / 2))):
        P.append(plane((nx + r(i), ny + r(i + 4), taper), (cx + nx * half, cy + ny * half, z0)))
        P.append(plane((nx, ny, 1.0), (cx + nx * (half - cham), cy + ny * (half - cham), z1)))
    P.append(plane((r(9), r(10), 1), (cx, cy, z1)))
    P.append(plane((0, 0, -1), (cx, cy, z0)))
    return P


def quad(s, p0, e1, e2, mat, name, sh=None, mask=None, raw=False):
    """A flat parallelogram p0 + u e1 + v e2 (0 <= u, v <= 1), seen from whichever side faces
    the viewer. mat gets (u, v) in px along e1 and e2, so decals work on it; `mask(U, V)`
    cuts it to shape. sh: LIT / SHADE / TOP, or None to choose by its normal. raw=True makes
    it a 'raw' surface: mat(lam, (U, V), 'raw', name)."""
    e1x, e1y, e1z = e1
    e2x, e2y, e2z = e2
    # solve [D, -e1, -e2] (s, u, v) = p0 - O with D = (1/2, 1/2, 1/2), O = (a/2, -a/2, -b)
    m = [[0.5, -e1x, -e2x], [0.5, -e1y, -e2y], [0.5, -e1z, -e2z]]
    det = (m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
           + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]))
    if abs(det) < 1e-9:
        return
    inv = [[(m[1][1] * m[2][2] - m[1][2] * m[2][1]) / det, (m[0][2] * m[2][1] - m[0][1] * m[2][2]) / det, (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / det],
           [(m[1][2] * m[2][0] - m[1][0] * m[2][2]) / det, (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / det, (m[0][2] * m[1][0] - m[0][0] * m[1][2]) / det],
           [(m[1][0] * m[2][1] - m[1][1] * m[2][0]) / det, (m[0][1] * m[2][0] - m[0][0] * m[2][1]) / det, (m[0][0] * m[1][1] - m[0][1] * m[1][0]) / det]]
    l1 = math.sqrt(e1x * e1x + e1y * e1y + e1z * e1z)
    l2 = math.sqrt(e2x * e2x + e2y * e2y + e2z * e2z)
    nx, ny, nz = norm(e1y * e2z - e1z * e2y, e1z * e2x - e1x * e2z, e1x * e2y - e1y * e2x)
    if nx + ny + nz < 0:
        nx, ny, nz = -nx, -ny, -nz
    lam = lam_of(nx, ny, nz)
    if sh is None:
        sh = TOP if nz > 0.75 else LIT if ny >= nx else SHADE
    px0, py0, pz0 = p0
    (i00, i01, i02), (i10, i11, i12), (i20, i21, i22) = inv
    def hit(a, b):
        rx, ry, rz = px0 - a / 2, py0 + a / 2, pz0 + b
        u = i10 * rx + i11 * ry + i12 * rz
        if not 0 <= u <= 1:
            return None
        v = i20 * rx + i21 * ry + i22 * rz
        if not 0 <= v <= 1:
            return None
        U, V = u * l1, v * l2
        if mask and not mask(U, V):
            return None
        sv = i00 * rx + i01 * ry + i02 * rz
        if raw:
            return sv, lam, (U, V)
        return sv, U, V
    pts = [p0, (px0 + e1x, py0 + e1y, pz0 + e1z), (px0 + e2x, py0 + e2y, pz0 + e2z), (px0 + e1x + e2x, py0 + e1y + e2y, pz0 + e1z + e2z)]
    bb = wb(min(p[0] for p in pts), max(p[0] for p in pts), min(p[1] for p in pts), max(p[1] for p in pts), min(p[2] for p in pts), max(p[2] for p in pts))
    s.add(hit, mat, 'raw' if raw else sh, name, bb)


def ell(s, c, r3, mat, name, zmin=0.0, data=None):
    """An upright ellipsoid, smooth-shaded: 'raw', mat(lam, (x, y, z, nx, ny, nz, data), ...)."""
    cx, cy, cz = c
    rx, ry, rz = r3
    dx, dy, dz = 0.5 / rx, 0.5 / ry, 0.5 / rz
    A = dx * dx + dy * dy + dz * dz
    def hit(a, b):
        px, py, pz = (a / 2 - cx) / rx, (-a / 2 - cy) / ry, (-b - cz) / rz
        B = 2 * (px * dx + py * dy + pz * dz)
        C = px * px + py * py + pz * pz - 1
        disc = B * B - 4 * A * C
        if disc < 0:
            return None
        sv = (-B + math.sqrt(disc)) / (2 * A)
        x, y, z = (sv + a) / 2, (sv - a) / 2, sv / 2 - b
        if zmin is not None and z < zmin:
            return None
        nx, ny, nz = norm((x - cx) / (rx * rx), (y - cy) / (ry * ry), (z - cz) / (rz * rz))
        return sv, lam_of(nx, ny, nz), (x, y, z, nx, ny, nz, data)
    s.add(hit, mat, 'raw', name, wb(cx - rx, cx + rx, cy - ry, cy + ry, cz - rz, cz + rz))


def sprite(s, p0, e1, e2, rows, pal, name, sh=LIT):
    """A pixel picture standing in the world (a flame, a sign, a strip of meat): a see-through
    parallelogram from p0, one pixel per step e1 (columns) and e2 (rows, upward). `sh` is
    unused (kept for symmetry with quad); the picture's own colours are drawn as they are."""
    H, W = len(rows), len(rows[0])
    n1 = math.sqrt(sum(c * c for c in e1)) or 1.0
    n2 = math.sqrt(sum(c * c for c in e2)) or 1.0
    def cell(U, V):
        return int(U / n1), H - 1 - int(V / n2)
    def mask(U, V):
        c, r = cell(U, V)
        return 0 <= c < W and 0 <= r < H and rows[r][c] != '.'
    def mat(lam, uv, sh_, f):
        c, r = cell(*uv)
        c, r = min(W - 1, max(0, c)), min(H - 1, max(0, r))
        ch = rows[r][c]
        return pal.get(ch) if ch != '.' else None
    quad(s, p0, (e1[0] * W, e1[1] * W, e1[2] * W), (e2[0] * H, e2[1] * H, e2[2] * H), mat, name, mask=mask, raw=True)


def masked(s, mask):
    """Cut the surface just added to shape: mask(u, v) on its face coordinates."""
    hit, m, sh, nm = s.surfs[-1]
    def h2(a, b):
        r = hit(a, b)
        if r and mask(r[1], r[2]):
            return r
        return None
    s.surfs[-1] = (h2, m, sh, nm)


def flat_m(s, Z, x0, x1, y0, y1, mat, name, mask):
    """A flat at height Z, cut to mask(x, y) in world coordinates."""
    s.flat(Z, x0, x1, y0, y1, mat, name)
    masked(s, lambda u, v: mask(x0 + u, y1 - v))


# ---------------------------------------------------------------- palette
BONE = ['#e6e0d2', '#c8c0aa', '#9a9280', '#6e6656']
WEB = ['#dcdcd2', '#c8ccc6', '#b2b6ae', '#9aa39c']
THORN = ['#6e6078', '#463b50', '#2e2632', '#1d1b22']
MOSS = ['#8a9878', '#6f7c5c', '#5a664b', '#434c38']
IRON = ['#9aa39c', '#747a74', '#5c625c', '#3a403c', '#1d1b22']
ROPE = ['#c8c0aa', '#a8987e', '#8c7c66', '#6a5c4c']
FIRE = ['#fff0c0', '#f4c468', '#e09a48', '#b8673a', '#7a4a40']
CHAR = ['#5c625c', '#3a403c', '#2a2226', '#1d1b22']
POLE = ['#8c7c66', '#6a5848', '#4e4038', '#3a2e2a']
GREY_WOOD = {LIT: ['#9a9280', '#848c86', '#6e6656', '#3a2e2a'], SHADE: ['#747a74', '#6e6656', '#5c625c', '#2a2226'], TOP: ['#b2b6ae', '#9a9280', '#848c86', '#5c625c']}
WOOD_SH = {LIT: ['#8c7c66', '#7c6c58', '#5e4e46', '#3a2e2a'], SHADE: ['#6a5c4c', '#5e4e46', '#4a3c34', '#2a2226'], TOP: ['#a0907a', '#8c7c66', '#6a5c4c', '#4a3c34']}
POST = {LIT: ['#6a5848', '#4e4038'], SHADE: ['#4a3c34', '#3a2e2a'], TOP: ['#7c6c58', '#5e4e46']}
DARK_ST = {LIT: ['#9aa39c', '#747a74', '#5c625c', '#2e3840'], SHADE: ['#5c625c', '#4e5650', '#3a403c', '#1d1b22'], TOP: ['#747a74', '#5c625c', '#4e5650', '#2e3840']}


def post_mat(u, v, sh, f):
    return POST[sh][0 if u < 1 else 1]


def shaded(tones, cuts=(0.62, 0.3, -0.05), noise=0.0, seed=0, grain=1):
    """A 'raw' material picking from `tones` by light, with a little noise."""
    def f(lam, info, sh, name):
        if noise:
            x, y, z = info[0], info[1], info[2]
            lam += (hsh(int(x // grain), int(y // grain), int(z // grain), seed) - 0.5) * noise
        return pick(tones, lam, cuts)
    return f


def tube_mat(tones, cuts=(0.55, 0.15, -0.25), furrow=0, gloss=None, noise=0.0, seed=0):
    """A material for tubes: lit by the normal; `furrow` px between bark furrows running
    along the tube; `gloss` a highlight colour where the light glances off."""
    def f(lam, info, sh, name):
        x, y, z, nx, ny, nz, along, ang, rad, data = info
        if noise:
            lam += (hsh(int(along // 3), int(ang * 3), seed) - 0.5) * noise
        if furrow:
            u = ang * max(rad, 1.0)
            k = int(math.floor(u + 2 * math.sin(along * 0.21 + hsh(int(u // furrow), seed) * 6))) % furrow
            if k == 0:
                lam -= 0.45
            elif k == 1 and hsh(int(u // furrow), int(along // 5), seed) < 0.5:
                lam += 0.15
        if gloss is not None:
            # a highlight where the normal turns toward the light and the viewer both
            hx, hy, hz = norm(LX - K3, LY - K3, LZ - K3)
            if nx * hx + ny * hy + nz * hz > 0.93:
                return gloss
        return pick(tones, lam, cuts)
    return f


# ---------------------------------------------------------------- shared pieces
def thorns_on(s, pts, rad, name, every=7, length=(5, 8), seed=0, tones=None, start=0.15, end=0.95, both=True):
    """Hooked thorns along a stem through `pts` (radius `rad`): little cones pointing out
    sideways and a little along the stem, a pale glint at the tip."""
    tones = tones or THORN
    tm = thorn_mat(tones)
    total = sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))
    n = max(1, int(total / every))
    k = 0
    for j in range(n):
        t = start + (end - start) * (j + 0.5) / n
        # the point and direction at fraction t along the polyline
        d = t * total
        for i in range(len(pts) - 1):
            seg = math.dist(pts[i], pts[i + 1])
            if d <= seg or i == len(pts) - 2:
                f = min(1.0, d / seg) if seg else 0
                p = tuple(pts[i][q] + (pts[i + 1][q] - pts[i][q]) * f for q in range(3))
                ax, ay, az = norm(*(pts[i + 1][q] - pts[i][q] for q in range(3)))
                break
            d -= seg
        r = rad[i] if isinstance(rad, (list, tuple)) else rad
        # a direction perpendicular to the stem, turned round it
        ang = hsh(seed, j, 3) * math.tau
        if not both:
            ang = (0.25 + 0.5 * hsh(seed, j, 3)) * math.pi  # up and toward the viewer
        ux, uy, uz = norm(-ay, ax, 0) if abs(az) < 0.9 else (1.0, 0.0, 0.0)
        vx, vy, vz = ay * uz - az * uy, az * ux - ax * uz, ax * uy - ay * ux
        ox, oy, oz = (math.cos(ang) * ux + math.sin(ang) * vx, math.cos(ang) * uy + math.sin(ang) * vy, math.cos(ang) * uz + math.sin(ang) * vz)
        L = length[0] + (length[1] - length[0]) * hsh(seed, j, 4)
        hook = 0.35 * (1 if hsh(seed, j, 5) < 0.5 else -1)
        dx, dy, dz = norm(ox + ax * hook, oy + ay * hook, oz + az * hook)
        b = (p[0] + ox * r * 0.6, p[1] + oy * r * 0.6, p[2] + oz * r * 0.6)
        tip = (b[0] + dx * L, b[1] + dy * L, b[2] + dz * L)
        rcone(s, b, tip, max(0.9, r * 0.35), 0.3, tm, '%s.t%d' % (name, k), zmin=0)
        k += 1


def thorn_mat(tones):
    def f(lam, info, sh, name):
        x, y, z, nx, ny, nz, along, ang, rad, data = info
        if rad < 0.55:
            return '#8a7e94'
        return pick(tones, lam, (0.5, 0.0, -0.4))
    return f


def bone_mat(lam, info, sh, name):
    x, y, z, nx, ny, nz, along, ang, rad, data = info
    # growth rings every few px, fading toward the tip
    ring = (along + (data or 0)) % 7 < 1 and rad > 1.2
    if rad < 0.6:
        return BONE[0]
    t = pick(BONE, lam, (0.38, -0.08, -0.5))
    if ring:
        return BONE[min(3, BONE.index(t) + 1)]
    return t


def dome_earth(tones=None, moss=0.0, seed=0):
    tones = tones or ['#7c6c58', '#5e4e46', '#4a3c34', '#3a2e2a', '#2a2226']
    def e(lam, xyz, sh, f):
        x, y, z = xyz
        lam += (hsh(int(x) // 2, int(y) // 2, seed) - 0.5) * 0.2
        if moss and hsh(int(x) // 3, int(y) // 2, seed + 1) < moss and lam > 0.4:
            return '#5a664b' if lam > 0.7 else '#434c38'
        return tones[0 if lam > 0.85 else 1 if lam > 0.6 else 2 if lam > 0.35 else 3]
    return e


# ================================================================ the Weepwood and Kilnholt
def spike(s, x, y, h, r0, lean=(0, 0), bend=0.25, name='sp', ring=0):
    """A pale bone spike growing out of the ground, curving a little as it rises."""
    lx, ly = lean
    pts = [(x, y, -r0 * 0.5), (x + lx * 0.35, y + ly * 0.35, h * 0.45), (x + lx * (0.75 + bend), y + ly * (0.75 + bend), h * 0.8), (x + lx * (1 + bend * 1.6), y + ly * (1 + bend * 1.6), h)]
    radii = [r0, r0 * 0.62, r0 * 0.3, 0.3]
    tube(s, pts, radii, bone_mat, name, zmin=0, data=ring)


def spikes(n):
    """Clusters of bone spikes: small, medium and large (the large about 60 px tall)."""
    sets = {
        's': (30, [(16, 17, 16, 2.6, (-2, 1)), (21, 13, 11, 2.0, (3, -2)), (12, 12, 8, 1.7, (-3, -3)), (20, 21, 7, 1.5, (2, 3))]),
        'm': (46, [(15, 16, 36, 4.0, (-3, 2)), (21, 12, 25, 3.2, (4, -3)), (10, 11, 18, 2.6, (-4, -3)), (22, 21, 15, 2.4, (4, 4)), (11, 22, 10, 2.0, (-3, 4)), (25, 16, 8, 1.6, (4, 0))]),
        'l': (66, [(15, 15, 60, 5.2, (-4, 3)), (22, 11, 42, 4.2, (6, -4)), (9, 10, 30, 3.4, (-6, -4)), (23, 22, 26, 3.4, (5, 5)), (9, 22, 18, 2.8, (-5, 5)), (27, 15, 13, 2.2, (5, -1)), (17, 25, 10, 2.0, (0, 5))]),
    }[n]
    def make(lit=False):
        top, parts = sets
        s = Scene2(1, 1, top)
        gr = {'s': 6, 'm': 9, 'l': 11}[n]
        s.dome(16, 16, gr, gr, 2 + gr / 6, dome_earth(seed=200), 'ground')
        for i, (x, y, h, r0, lean) in enumerate(parts):
            spike(s, x, y, h, r0, lean, name='sp%d' % i, ring=i * 3)
        return s
    return make


spikes_s, spikes_m, spikes_l = spikes('s'), spikes('m'), spikes('l')


def thicket(lit=False):
    """A dense black thorn thicket: a dark knot at the root, thin stems arching out of it and
    back into the ground, crossing each other, hooked thorns all over."""
    s = Scene2(1, 1, 40)
    tm = tube_mat(THORN, cuts=(0.62, 0.22, -0.3), noise=0.25, seed=3)
    ell(s, (16, 16, 2), (9, 8, 9), shaded(['#463b50', '#2e2632', '#1d1b22', '#1d1b22'], noise=0.6, seed=4), 'knot')
    for i in range(15):
        a = (i / 15 + hsh(i, 1, 301) * 0.05) * math.tau
        d = 2 + hsh(i, 2, 301) * 5
        x0, y0 = 16 + math.cos(a) * d, 16 + math.sin(a) * d
        b = a + (hsh(i, 3, 301) - 0.5) * 1.6
        L = 9 + hsh(i, 4, 301) * 6
        x1, y1 = 16 + math.cos(b) * L, 16 + math.sin(b) * L
        h = 14 + hsh(i, 5, 301) * 14
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        pts = curve((x0, y0, 0), (mx, my, h * 1.9), (x1, y1, -2), 10)
        r = 1.3 + hsh(i, 8, 301) * 0.8
        radii = [r * (1 - 0.5 * j / 10) for j in range(11)]
        tube(s, pts, radii, tm, 'st%d' % i, zmin=0)
        thorns_on(s, pts, radii, 'st%d' % i, every=4.5, length=(3, 6), seed=310 + i)
    return s


def mound_grave(lit=False):
    """An unmarked grave: a low mound of earth gone to moss, a stick pushed in at its head."""
    s = Scene2(1, 1, 30)
    s.dome(17, 18, 8, 11, 6, dome_earth(moss=0.25, seed=211), 'mound')
    stick = tube_mat(POLE, cuts=(0.4, 0.0, -0.4))
    tube(s, [(15, 7, -1), (14.5, 6.5, 9), (12.5, 5.5, 17)], [1.3, 1.1, 0.8], stick, 'stick', zmin=0)
    poly(s, hewn(18, 23, 5, 9, -1, 6, cham=1, seed=212, jit=0.2, top_cham=1.5), stone_mat(moss=0.2, seed=213), 'headstone', (17, 24, 4, 10, 0, 7))
    for i, (x, y, r) in enumerate(((22, 28, 1.6), (11, 26, 1.3), (24, 12, 1.2))):
        s.sphere(x, y, 0.4, r, STONE_T, 'peb%d' % i, squash=0.7, seed=i)
    return s


def stone_mat(tones=None, moss=0.0, lichen=0.04, seed=0, face_decal=None):
    """Hewn stone for poly(): each face lit by its normal, speckled, mossy on top and low."""
    tones = tones or STONE_T
    def f(lam, info, sh, name):
        fi, x, y, z, nx, ny, nz, data = info
        if face_decal and fi in face_decal:
            u0, v0, rows, pal, axis = face_decal[fi]
            u = (x if axis == 'x' else -y) - u0
            v = z - v0
            c, r = int(math.floor(u)), len(rows) - 1 - int(math.floor(v))
            if 0 <= r < len(rows) and 0 <= c < len(rows[0]) and rows[r][c] != '.':
                return pal[rows[r][c]]
        g = hsh(int(x // 2), int(y // 2), int(z // 2), seed)
        if moss:
            m = hsh(int(x // 3), int(y // 3), int(z // 4), seed + 1)
            if (nz > 0.45 and m < moss * 2.2) or (z < 9 - 6 * m and m < moss * 1.6) or (m < moss * 0.5):
                return pick(MOSS, lam + (g - 0.5) * 0.3, (0.6, 0.25, -0.1))
        if g < lichen:
            return '#dcdcd2' if lam > 0 else '#9aa39c'
        lam += (g - 0.5) * 0.18
        return pick(tones, lam, (0.62, 0.22, -0.2))
    return f


def standing_stone(lit=False):
    """A tall standing stone, leaning a little, moss up its north side and over its top."""
    s = Scene2(1, 1, 60)
    P = hewn(9, 23, 11, 21, -2, 54, cham=2.5, taper=0.045, top_tilt=(0.35, -0.2), seed=221, jit=0.08, top_cham=3)
    # a lean: shear the planes a little toward the south-east
    poly(s, P, stone_mat(moss=0.22, seed=222), 'stone', (6, 26, 8, 24, 0, 58))
    for i, (x, y, r) in enumerate(((8, 24, 2.4), (25, 22, 1.8), (22, 8, 1.6))):
        s.sphere(x, y, 0.5, r, STONE_T, 'peb%d' % i, squash=0.7, seed=i + 2)
    return s


CROWN = [
    'k....k....k',
    'kk..kck..kk',
    'kckkcccckck',
    'kcccccccccc',
    'kkkkkkkkkkk',
    'kcckcckcckk',
    'kkkkkkkkkkk',
]


def boundary_stone(lit=False):
    """A short squared stone with the old King's crown cut into its face."""
    s = Scene2(1, 1, 30)
    P = hewn(8, 24, 13, 21, -1, 19, cham=1.5, taper=0.02, seed=231, jit=0.03, top_cham=2)
    poly(s, P, stone_mat(moss=0.05, lichen=0.03, seed=232, face_decal={2: (10.5, 6, CROWN, {'k': '#3a403c', 'c': '#5c625c'}, 'x')}), 'stone', (7, 25, 12, 22, 0, 22))
    s.sphere(25, 23, 0.5, 1.8, STONE_T, 'peb', squash=0.7, seed=4)
    return s


def drying_rack(lit=False):
    """Wren's drying rack: two forked poles and two bars, strips of venison hung from the top
    one and a deer hide thrown over the lower one, flesh side out."""
    s = Scene2(1, 1, 40)
    pm = tube_mat(POLE, cuts=(0.45, 0.0, -0.4))
    for i, (x, y) in enumerate(((4, 15), (28, 17))):
        tube(s, [(x, y, -1), (x + 0.5, y, 20), (x, y, 30)], [1.4, 1.3, 1.2], pm, 'post%d' % i, zmin=0)
        tube(s, [(x, y, 28), (x - 2, y - 1, 34)], [1.0, 0.7], pm, 'fork%d' % i)
        tube(s, [(x, y, 28), (x + 2, y + 1, 33)], [1.0, 0.7], pm, 'forkb%d' % i)
    tube(s, [(1, 14.8, 30.5), (31, 17.3, 31.5)], 1.1, pm, 'bar')
    tube(s, [(2, 15.2, 15), (30, 17.2, 16)], 0.9, pm, 'bar2')
    meat = {'r': '#9a5a4a', 'R': '#b87a68', 'd': '#7a4a40', 'k': '#5e3a36', 'f': '#dcb0a8'}
    strips = [
        ['kk', 'Rd', 'Rd', 'fd', 'Rd', 'Rd', 'Rk', 'Rd', 'Rd', 'Rd', 'k.'],
        ['kk', 'Rd', 'Rd', 'Rd', 'Rk', 'fd', 'Rd', 'Rd', '.k'],
        ['kk', 'Rd', 'fd', 'Rd', 'Rd', 'Rk', 'Rd', 'Rd', 'Rd', 'Rd', 'Rd', 'k.'],
        ['kk', 'Rd', 'Rd', 'Rd', 'fd', 'Rd', 'Rk', '.d'],
        ['kk', 'Rd', 'Rd', 'Rk', 'Rd', 'fd', 'Rd', 'Rd', 'Rd', 'k.'],
    ]
    for i, rows in enumerate(strips):
        x = 7 + i * 4.5
        y = 15 + (x - 1) / 30 * 2.5
        sprite(s, (x, y + 0.6, 31 - len(rows)), (1, 0, 0), (0, 0, 1), rows, meat, 'meat%d' % i)
    # the hide over the lower bar: a front fall and a back fall, legs at the corners
    def hide_mask(U, V):
        if V > 12.5:
            return False
        legs = (U < 3 or U > 17) and V < 4
        ragged = V > 2.2 + 1.5 * hsh(int(U), 233)
        return legs or ragged
    def hm(u, v, sh, f):
        if v > 11 or u < 1 or u > 18 or hsh(u // 2, v // 2, 234) < 0.08:
            return '#6a5c4c' if sh == LIT else '#4a3c34'  # the fur at the edge
        if sh == LIT:
            return '#c8c0aa' if hsh(u // 3, v // 3, 235) > 0.25 else '#b8a88c'
        return '#8c7c66'
    quad(s, (7, 16.2 + 1.6, 3), (20, 1.6, 0), (0, -1.6, 12.5), hm, 'hidef', sh=LIT, mask=hide_mask)
    quad(s, (7, 16.2 - 1.6, 4), (20, 1.6, 0), (0, 1.6, 11.5), hm, 'hideb', sh=SHADE, mask=hide_mask)
    return s


def leanto(lit=False):
    """Wren's camp: a lean-to of willow poles laid against a ridge pole on two forks, a deer
    hide stretched over them, sloping down toward the viewer. Its open side faces north-east
    (-y), toward the fire; the inside shows dark through its east end, furs on the ground."""
    s = Scene2(2, 1, 44)
    pm = tube_mat(POLE, cuts=(0.45, 0.0, -0.4), noise=0.2, seed=5)
    yr, zr, yf = 6, 30, 30
    # the shadowed inside, seen through the open east end
    quad(s, (6, yr - 1, 0), (54, 0, 0), (0, 0, 29), lambda u, v, sh, f: '#2a2226' if v < 18 else '#3a2e2a', 'inside', sh=LIT)
    ell(s, (36, 16, -1), (20, 7, 4), shaded(['#9a9280', '#6e6656', '#4a3c34', '#2a2226'], noise=0.4, seed=246), 'furs')
    # the forks and the ridge
    for i, x in enumerate((7, 56)):
        tube(s, [(x, yr, -1), (x + 0.4, yr, 18), (x, yr, zr)], [1.5, 1.4, 1.3], pm, 'fork%d' % i, zmin=0)
        tube(s, [(x, yr, zr - 2), (x - 2.5, yr + 1, zr + 4)], [1.1, 0.8], pm, 'fa%d' % i)
        tube(s, [(x, yr, zr - 2), (x + 2.5, yr - 1, zr + 4)], [1.1, 0.8], pm, 'fb%d' % i)
    tube(s, [(1, yr, zr + 1.2), (63, yr + 0.5, zr + 1.8)], 1.4, pm, 'ridge')
    # the leaning willow poles, their tops poking past the ridge
    xs = (4, 13, 22.5, 32, 41.5, 51, 60)
    for i, x in enumerate(xs):
        jx = (hsh(i, 247) - 0.5) * 3
        tube(s, [(x + jx, yr - 4, zr + 5 + hsh(i, 248) * 3), (x, yr + 0.5, zr + 2.4), (x - jx * 0.5, yf + 1, -1)], [0.9, 1.0, 1.15], pm, 'pole%d' % i, zmin=0)
    # the hide, lashed over the middle poles: tan, darker where it was scraped thin, ragged
    k = (zr + 2) / (yf - yr)
    def hide_mask(U, V):
        return (U > 2.5 * hsh(int(V // 2), 242) and U < 47 - 2.5 * hsh(int(V // 2), 243)
                and V > 1.5 + 2.5 * hsh(int(U // 2), 244) and V < 39)
    def hide(u, v, sh, f):
        if v < 4 or u < 2 or u > 45:
            return '#6a5c4c'
        r = hsh(u // 5, v // 6, 245)
        if (u + 2 * (v // 6)) % 15 == 0 and v % 3 == 0:
            return '#4a3c34'  # stitching where two hides meet
        return '#b8a88c' if r > 0.75 else '#a0907a' if r > 0.12 else '#8c7c66'
    quad(s, (9, yf + 0.5, 0), (47, 0, 0), (0, -(yf - yr) - 1, zr + 2.6), hide, 'hide', sh=LIT, mask=hide_mask)
    # lashings at the ridge
    for i, x in enumerate(xs[1:-1]):
        tube(s, [(x - 1.5, yr + 1.2, zr + 3.2), (x + 1.5, yr + 1.4, zr + 3.4)], 0.6, tube_mat(ROPE), 'lash%d' % i)
    return s


TURF = {LIT: ['#8a9878', '#6e8a74', '#56705f', '#4a6454', '#3c5a4a'], TOP: ['#a4b094', '#8a9878', '#6e8a74', '#56705f', '#4a6454'],
        SHADE: ['#6e8a74', '#56705f', '#4a6454', '#3c5a4a', '#2c4438']}


def turf(seed=0):
    """Turf: shaggy tussocks of grass in staggered rows down the slope (a light top, a dark
    underside, streaks between), now and then a bare patch of earth."""
    def f(u, v, sh, face):
        t = TURF[sh]
        vv = v + int(1.6 * math.sin(u * 0.35 + hsh(v // 4, seed) * 6) + 1.6 * hsh(u // 3, seed + 9))
        row = vv // 4
        uu = u + (3 if row % 2 else 0) + int(hsh(row, seed) * 6)
        k = uu // 6
        dv = vv % 4
        bare = hsh(int(u + 3 * math.sin(v * 0.4)) // 5, v // 4, seed + 3)
        if bare < 0.02:
            return '#5e4e46' if hsh(u, v, seed) < 0.7 else '#4a3c34'
        if dv == 0:
            return t[3] if hsh(uu, row, seed + 4) < 0.6 else t[2]
        if dv == 3 and hsh(uu, row, seed + 5) < 0.55:
            return t[0]
        return t[1] if hsh(k, row, seed + 6) < 0.6 else t[2]
    return f


def turf_band(th):
    """The cut edge of a turf roof: earth and roots, grass hanging over its top."""
    def f(u, v, sh, face):
        hang = int(hsh(u, 51) * 3) if hsh(u // 2, 52) < 0.5 else 0
        if v >= th - 1 - hang:
            return TURF[SHADE if sh == SHADE else LIT][2 if v >= th - 1 else 3]
        if hsh(u, v, 53) < 0.12:
            return '#2a2226'
        return '#5e4e46' if sh == LIT else '#4a3c34'
    return f


def turf_roof(s, x0, x1, y0, y1, ze, zr, ov, th, wall, name, seed=0):
    """A thick turf roof with its ridge along x over walls x0..x1, y0..y1: grassy slopes, the
    cut edge of the turf showing at the eave and the gable, the gable end walled in `wall`."""
    ym = (y0 + y1) / 2
    k = (zr - ze) / (ym - y0)
    X0, X1, Y0, Y1 = x0 - ov, x1 + ov, y0 - ov, y1 + ov
    zl = ze - ov * k
    L = X1 - X0
    quad(s, (X0, Y1, zl), (L, 0, 0), (0, ym - Y1, zr - zl), turf(seed), name + '.front', sh=LIT)
    quad(s, (X0, ym, zr), (L, 0, 0), (0, Y0 - ym, zl - zr), turf(seed + 7), name + '.back', sh=TOP)
    band = turf_band(th)
    quad(s, (X0, Y1, zl - th), (L, 0, 0), (0, 0, th), band, name + '.eave', sh=LIT)
    quad(s, (X1, Y1, zl - th), (0, ym - Y1, zr - zl), (0, 0, th), band, name + '.edge1', sh=SHADE)
    quad(s, (X1, ym, zr - th), (0, Y0 - ym, zl - zr), (0, 0, th), band, name + '.edge2', sh=SHADE)
    s.wall_x(x1, y0, y1, ze, zr, wall, name + '.gable', zmax=lambda y: zr - th - abs(y - ym) * k)
    return zl


def grass_tufts(s, pts, seed=0, h=(2, 4)):
    """Hand-placed tufts of long grass along a roof's ridge and edges (drawn last)."""
    def draw(img, ox, oy, prev=getattr(s, 'extra', None)):
        if prev:
            prev(img, ox, oy)
        px = img.load()
        W, H = img.size
        for i, (x, y, z) in enumerate(pts):
            sx, sy = s.to_screen(x, y, z)
            n = 2 + int(hsh(i, seed) * 2)
            for j in range(n):
                dx = j - n // 2 + (1 if hsh(i, j, seed) < 0.3 else 0)
                hh = h[0] + int(hsh(i, j, seed + 1) * (h[1] - h[0] + 1))
                for q in range(hh):
                    X, Y = sx + dx + (1 if q == hh - 1 and dx > 0 else -1 if q == hh - 1 and dx < 0 else 0), sy - q
                    if 0 <= X < W and 0 <= Y < H:
                        px[X, Y] = hexrgb('#8a9878' if q >= hh - 1 else '#6e8a74' if q > 0 else '#56705f') + (255,)
    s.extra = draw


def wattle(tones=None, seed=0):
    """Woven wattle: withies 3 px tall over and under upright stakes every 6 px."""
    t = tones or {LIT: ['#8c7c66', '#7c6c58', '#5e4e46', '#3a2e2a'], SHADE: ['#6a5c4c', '#5e4e46', '#4a3c34', '#2a2226'], TOP: ['#a8987e', '#8c7c66', '#6a5c4c', '#3a2e2a']}
    def f(u, v, sh, face):
        c = t[sh]
        row, dv = v // 3, v % 3
        if u % 7 == 0:
            return c[2] if dv != 1 else c[3]
        over = ((u // 7) + row) % 2 == 0
        if dv == 2:
            return c[0] if over else c[1]
        if dv == 0:
            return c[3] if hsh(u, row, seed) < 0.3 else c[2]
        return c[1] if over else c[2]
    return f


DAUB = {LIT: ['#bcae98', '#a89c88', '#9a8e7a'], SHADE: ['#9a8e7a', '#847866', '#7c6c58'], TOP: ['#d4c8b4', '#c8bca8', '#bcae98']}


def daub(seed=0, holes=0.1):
    """Clay daub over wattle, soot-stained, fallen away here and there to show the weave."""
    base = plaster(DAUB)
    wt = wattle(seed=seed)
    def f(u, v, sh, face):
        r = hsh(u // 6, v // 5, seed)
        if r < holes and hsh(u // 3, v // 3, seed + 1) < 0.7:
            return wt(u, v, sh, face)
        return base(u, v, sh, face)
    return f


SMALL_DOOR = [
    'kkkkkkkkkkk',
    'kWwWwWwWwWk',
    'kWwWwWwWwWk',
    'kxxxxxxxxxk',
    'kWwWwWwWwWk',
    'kWwWwWwWwWk',
    'kWwWwWwWwWk',
    'kWwWwWwWwWk',
    'kWwWwWwWIWk',
    'kWwWwWwWiWk',
    'kWwWwWwWwWk',
    'kWwWwWwWwWk',
    'kWwWwWwWwWk',
    'kxxxxxxxxxk',
    'kWwWwWwWwWk',
    'kWwWwWwWwWk',
    'kWwWwWwWwWk',
    'kWwWwWwWwWk',
    'kxxxxxxxxxk',
]


SMOKE_HOLE = ['.kkkkk.', 'kDDDDDk', 'kDDDDDk', 'kDDDDDk', '.kkkkk.']


def hut(variant=0, lit=False):
    """A charcoal-burner's hut in Kilnholt: low walls under a thick turf roof with grass on it,
    a smoke hole near the ridge, one small window. Variant 0: stone below and wattle above,
    the plank door in its east gable end. Variant 1: wattle and daub, the door on the lit side,
    a lean-to woodpile against the east end."""
    s = Scene2(3, 2, 84)
    gl = GLASS_LIT if lit else GLASS
    if variant == 0:
        x0, x1, y0, y1 = 8, 84, 12, 52
        ze, zr, ov, th = 27, 52, 4, 5
        st, wt = stone(course=4, seed=261), wattle(seed=262)
        def wall(u, v, sh, f):
            return st(u, v, sh, f) if v < 10 else wt(u, v, sh, f)
    else:
        x0, x1, y0, y1 = 6, 68, 12, 54
        ze, zr, ov, th = 29, 52, 3, 4
        wall = daub(seed=263)
    s.wall_y(y1, x0, x1, 0, ze, wall, 'body.y')
    s.wall_x(x1, y0, y1, 0, ze, wall, 'body.x')
    zl = turf_roof(s, x0, x1, y0, y1, ze, zr, ov, th, wall, 'roof', seed=264 + variant)
    ym = (y0 + y1) / 2
    L = x1 - x0 + 2 * ov
    if variant == 0:
        s.decal('body.x', 15, 0, SMALL_DOOR, WOOD)
        s.decal('body.y', 46, 4, SMALL_WINDOW, gl)
        s.decal('roof.front', 18, 22, SMOKE_HOLE, {'k': '#3a2e2a', 'D': DARK})
    else:
        s.decal('body.y', 12, 0, SMALL_DOOR, WOOD)
        s.decal('body.y', 36, 11, SMALL_WINDOW, gl)
        s.decal('roof.front', 40, 22, SMOKE_HOLE, {'k': '#3a2e2a', 'D': DARK})
        # the woodpile against the east end, under a lean-to of planks
        px0, px1, py0, py1, ph = x1 + 1, x1 + 15, y0 + 6, y1 - 4, 15
        def ends(u, v, sh, f):
            # log ends in rows, each a ring of bark round pale wood
            row = v // 6
            uu = u + (3 if row % 2 else 0)
            du, dv = uu % 6 - 2.5, v % 6 - 2.5
            d = du * du + dv * dv
            if d > 7.5:
                return '#2a2226'
            if d > 4:
                return '#4a3c34'
            return '#a8987e' if hsh(uu // 6, row, 271) > 0.3 else '#8c7c66'
        def sides(u, v, sh, f):
            dv = v % 6
            return '#2a2226' if dv == 0 else '#7c6c58' if dv >= 4 else '#5e4e46'
        def tops(u, v, sh, f):
            return '#8c7c66' if v % 6 > 2 else '#6a5c4c'
        s.wall_x(px1, py0, py1, 0, ph, ends, 'pile.x')
        s.wall_y(py1, px0, px1, 0, ph, sides, 'pile.y')
        s.flat(ph, px0, px1, py0, py1, tops, 'pile.top')
        for i, (yy) in enumerate((py0 - 1, py1 - 1)):
            s.box(px1 + 1, px1 + 3, yy, yy + 2, 0, ph + 3, post_mat, 'ppost%d' % i)
        quad(s, (x1, py0 - 3, ze - 4), (px1 + 4 - x1, 0, -(ze - 4 - ph - 3)), (0, py1 - py0 + 6, 0), planks(WOOD_SH, width=4, vertical=False, seed=272), 'pile.roof', sh=TOP)
    # long grass along the ridge and the eave
    pts = [(x0 - ov + 4 + i * 7 + hsh(i, 273) * 4, ym, zr) for i in range(int(L / 7))]
    pts += [(x0 - ov + 6 + i * 11 + hsh(i, 274) * 5, y1 + ov - 1, zl + 1) for i in range(int(L / 11))]
    pts += [(x1 + ov, ym + (y1 + ov - ym) * t, zr - (zr - zl) * t) for t in (0.25, 0.6, 0.9)]
    grass_tufts(s, pts, seed=275 + variant)
    return s


hut1 = lambda lit=False: hut(0, lit)


hut2 = lambda lit=False: hut(1, lit)


LOG_BARK = ['#7c6c58', '#5e4e46', '#4a3c34', '#2a2226']


NEWWOOD = {LIT: ['#c8c0aa', '#b8a88c', '#a0907a', '#6a5c4c'], SHADE: ['#a0907a', '#8c7c66', '#7c6c58', '#4a3c34'], TOP: ['#d4c8b4', '#c8c0aa', '#b8a88c', '#7c6c58']}


def end_grain(s, X, cy, cz, r, name):
    """The sawn end of a log facing +x: pale wood, growth rings, a rim of bark."""
    def m(u, v, sh, f):
        d = math.hypot(u - r, v - r)
        if d > r - 1:
            return '#4a3c34'
        k = int(d * 1.3) % 3
        return '#b8a88c' if k else '#a0907a'
    quad(s, (X, cy + r, cz - r), (0, -2 * r, 0), (0, 0, 2 * r), m, name, sh=SHADE, mask=lambda U, V: math.hypot(U - r, V - r) <= r)


def sawpit(lit=False):
    """Kilnholt's sawpit: a plank-shored trench, a log laid across it on two trestles, the long
    two-man saw standing in its cut; sawdust, and a stack of new planks."""
    s = Scene2(2, 2, 46)
    hx0, hx1, hy0, hy1, dep = 13, 51, 25, 39, 18
    # trampled earth and sawdust round the pit, the pit cut out of it
    def ground(x, y):
        r = ((x - 32) / 31) ** 2 + ((y - 32) / 29) ** 2
        inside = hx0 <= x <= hx1 and hy0 <= y <= hy1
        return r < 1 - 0.25 * hsh(int(x) // 4, int(y) // 4, 281) and not inside
    def gm(u, v, sh, f):
        r = hsh(u // 2, v // 2, 282)
        return '#a8987e' if r < 0.12 else '#7c6c58' if r < 0.5 else '#6a5c4c'
    flat_m(s, 0.01, 0, 64, 0, 64, gm, 'ground', ground)
    # the pit: its shored north wall, its west wall, the floor
    shore = planks({LIT: ['#5e4e46', '#4a3c34', '#3a2e2a', '#2a2226'], SHADE: ['#4a3c34', '#3a2e2a', '#2a2226', '#1d1b22'], TOP: ['#5e4e46', '#4a3c34', '#3a2e2a', '#2a2226']}, width=4, vertical=False, seed=283)
    s.wall_y(hy0, hx0, hx1, -dep, 0, shore, 'pit.n')
    s.wall_x(hx0, hy0, hy1, -dep, 0, shore, 'pit.w')
    s.flat(-dep, hx0, hx1, hy0, hy1, lambda u, v, sh, f: '#3a2e2a' if hsh(u, v, 284) < 0.7 else '#5e4e46', 'pit.floor')
    # trestles straddling the pit, the log in their crotches
    pm = tube_mat(POLE, cuts=(0.45, 0.0, -0.4))
    for i, x in enumerate((17, 47)):
        tube(s, [(x, hy0 - 4, 0), (x, hy1 + 1, 24)], 1.4, pm, 'tra%d' % i)
        tube(s, [(x, hy1 + 4, 0), (x, hy0 - 1, 24)], 1.4, pm, 'trb%d' % i)
    tube(s, [(3, 32, 21.5), (61, 32, 21.5)], 5.5, tube_mat(LOG_BARK, furrow=4, seed=285), 'log')
    end_grain(s, 61.2, 32, 21.5, 5.5, 'logend')
    # the saw: a long blade standing in the cut, the tiller handle across its top
    blade = ['II', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN',
             'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN',
             'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'IN', 'II']
    blade = [('t' if i % 2 else 'N') + r for i, r in enumerate(blade)]
    sprite(s, (29.5, 32.3, -16), (1, 0, 0), (0, 0, 1), blade, {'I': '#c8ccc6', 'N': '#9aa39c', 't': '#5c625c'}, 'saw')
    sprite(s, (29.5, 31.7, -16), (1, 0, 0), (0, 0, 1), blade, {'I': '#9aa39c', 'N': '#747a74', 't': '#3a403c'}, 'sawb', sh=SHADE)
    tube(s, [(31, 25, 37.5), (31, 39, 37.5)], 1.2, pm, 'tiller')
    tube(s, [(31, 31.5, 36), (31, 31.5, 38)], 0.8, tube_mat(IRON), 'clamp')
    # sawdust heaps, a stack of new planks
    dust = lambda lam, xyz, sh, f: '#c8c0aa' if lam > 0.7 else '#b8a88c' if lam > 0.45 else '#a0907a'
    s.dome(9, 50, 6, 5, 3, dust, 'dust1')
    s.dome(56, 18, 5, 4, 2.5, dust, 'dust2')
    for j in range(3):
        s.box(34 - j, 58 - j, 46 + j * 0.5, 54 + j * 0.5, j * 2, j * 2 + 2, planks(NEWWOOD, width=3, vertical=False, seed=286 + j), 'plank%d' % j,
              top_mat=planks(NEWWOOD, width=4, vertical=True, seed=287 + j))
    return s


def long_table(lit=False):
    """Mother Dunn's long table: plank top on trestles, a bench either side, bowls and the
    pot on it, all under a lean-to roof of boards on four posts."""
    s = Scene2(3, 1, 58)
    dk = {LIT: ['#8c7c66', '#7c6c58', '#6a5c4c', '#3a2e2a'], SHADE: ['#6a5c4c', '#5e4e46', '#4a3c34', '#2a2226'], TOP: ['#a0907a', '#8c7c66', '#7c6c58', '#4a3c34']}
    top = planks(dk, width=4, vertical=False, seed=291)
    side = planks(dk, width=3, vertical=False, seed=292)
    # benches
    for i, (y0, y1) in enumerate(((4, 8), (25, 29))):
        s.box(10, 86, y0, y1, 7, 9, side, 'bench%d' % i, top_mat=top)
        for x in (13, 82):
            s.box(x, x + 2, y0 + 1, y1 - 1, 0, 7, post_mat, 'bl%d%d' % (i, x))
    # the table
    for x in (16, 79):
        s.box(x, x + 3, 13, 21, 0, 12, post_mat, 'tl%d' % x)
    s.box(10, 86, 12, 22, 12, 14, side, 'table', top_mat=top)
    # on it: bowls, a pot, a jug, a loaf
    bowl = flat_tone('#7c6c58', '#5e4e46')
    for i, (x, y) in enumerate(((20, 15), (31, 19), (44, 15), (68, 18), (76, 15))):
        s.cylinder(x, y, 2.2, 14, 15.5, bowl, 'bowl%d' % i, top_mat=flat_tone('#4a3c34', '#4a3c34'))
    s.cylinder(55, 17, 4, 14, 19, flat_tone('#5c625c', '#3a403c'), 'pot', top_mat=flat_tone('#2a2226', '#2a2226'))
    s.cylinder(37, 15, 2, 14, 19, flat_tone('#9a5a4a', '#7a4a40'), 'jug', top_mat=flat_tone('#5e3a36', '#5e3a36'))
    s.sphere(63, 15, 15.5, 3, ['#d8c070', '#c9a24e', '#a08440', '#6e5a30'], 'loaf', squash=0.6, seed=2)
    # posts and the roof: high enough to see the table under it
    for x in (5, 89):
        s.box(x, x + 3, 0, 3, 0, 50, post_mat, 'pb%d' % x)
        s.box(x, x + 3, 17, 20, 0, 42, post_mat, 'pf%d' % x)
    s.box(3, 93, 17, 20, 39, 42, post_mat, 'beam')
    s.shed(1, 93, -1, 21, 52, 41, planks(WOOD_SH, width=6, vertical=True, seed=293), 'roof')
    quad(s, (1, 21, 39), (92, 0, 0), (0, 0, 2), lambda u, v, sh, f: '#4a3c34', 'roof.eave', sh=LIT)
    return s


BLACK_BARK = ['#6e6078', '#574a62', '#463b50', '#2e2632', '#1d1b22']


WHIP = ['#8a7e94', '#6e6078', '#463b50', '#2e2632']


def black_willow(s, cx, cy, H, tr, R, seed, boughs=7, whips=12, low=6, skip=(), droop=1.0, whip_r=0.75, gap=math.pi / 4):
    """A black willow: a gnarled black trunk on spreading roots, boughs arching up and out from
    its head into a dome, and from each bough a curtain of thin whips weeping toward the
    ground, each ending in a thorn. The curtain is thin where it faces the viewer (`gap`), so
    the trunk shows. Boughs in `skip` have no whips. Returns the boughs' control points."""
    bk = tube_mat(BLACK_BARK, cuts=(0.72, 0.42, 0.05, -0.35), furrow=4, seed=seed)
    wm = tube_mat(WHIP, cuts=(0.62, 0.0, -0.4), noise=0.2, seed=seed + 1)
    tm = thorn_mat(THORN)
    rnd = lambda *a: hsh(seed, *a)
    # roots
    for i in range(5):
        a = (i / 5 + rnd(i, 1) * 0.12) * math.tau
        L = tr * (1.8 + rnd(i, 2) * 0.9)
        p0 = (cx + math.cos(a) * tr * 0.3, cy + math.sin(a) * tr * 0.3, tr * 1.2)
        p2 = (cx + math.cos(a) * L, cy + math.sin(a) * L, -1)
        tube(s, curve(p0, (cx + math.cos(a) * L * 0.6, cy + math.sin(a) * L * 0.6, tr * 0.5), p2, 4),
             [tr * 0.6, tr * 0.45, tr * 0.34, tr * 0.25, tr * 0.18], bk, 'root%d' % i, zmin=0)
    # the trunk, leaning and twisting, a knot or two
    lx, ly = (rnd(3) - 0.5) * tr * 0.9, (rnd(4) - 0.5) * tr * 0.9
    pts = [(cx, cy, -2), (cx + lx * 0.3 + (rnd(5) - 0.5) * 4, cy + ly * 0.3, H * 0.3), (cx + lx * 0.65, cy + ly * 0.65 + (rnd(6) - 0.5) * 4, H * 0.65), (cx + lx, cy + ly, H)]
    tube(s, pts, [tr * 1.15, tr * 0.95, tr * 0.88, tr * 0.8], bk, 'trunk', zmin=0)
    for i in range(2):
        q = pts[1 + i]
        a = rnd(i, 7) * math.tau
        s.sphere(q[0] + math.cos(a) * tr * 0.7, q[1] + math.sin(a) * tr * 0.7, q[2] + 3, tr * 0.45, BLACK_BARK[1:], 'knot%d' % i, squash=0.9, seed=i)
    hx, hy, hz = pts[-1]
    out = []
    k = 0
    def bez(P, t):
        b0, b1, b2, b3 = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3
        return tuple(b0 * P[0][c] + b1 * P[1][c] + b2 * P[2][c] + b3 * P[3][c] for c in range(3))
    for i in range(boughs):
        a = (i / boughs + rnd(i, 10) * 0.1) * math.tau
        ca, sa = math.cos(a), math.sin(a)
        reach = R * (0.85 + rnd(i, 11) * 0.25)
        up = R * (0.35 + rnd(i, 12) * 0.2)
        P = ((hx + ca * tr * 0.3, hy + sa * tr * 0.3, hz - 5), (hx + ca * reach * 0.2, hy + sa * reach * 0.2, hz + up * 1.6),
             (hx + ca * reach * 0.75, hy + sa * reach * 0.75, hz + up * 1.15), (hx + ca * reach, hy + sa * reach, hz + up * 0.35))
        bp = [bez(P, j / 8) for j in range(9)]
        rad = [tr * 0.55 * (1 - 0.85 * j / 8) + 0.7 for j in range(9)]
        tube(s, bp, rad, bk, 'bough%d' % i)
        out.append(P)
        # a side branch off each bough, arching out and down
        m = bez(P, 0.4)
        a2 = a + (0.55 if i % 2 else -0.55)
        sp = curve(m, (m[0] + math.cos(a2) * reach * 0.35, m[1] + math.sin(a2) * reach * 0.35, m[2] + up * 0.25),
                   (m[0] + math.cos(a2) * reach * 0.6, m[1] + math.sin(a2) * reach * 0.6, m[2] - up * 0.3), 5)
        tube(s, sp, [tr * 0.3, 1.4, 1.2, 1.0, 0.9, 0.8], bk, 'side%d' % i)
        if i in skip:
            continue
        # how squarely this bough faces the viewer: the curtain thins there to show the trunk
        front = math.cos(a - gap)
        for j in range(whips):
            if j % 3 == 2:
                t = 0.4 + 0.6 * rnd(i, j, 13)
                px, py, pz = sp[min(len(sp) - 1, int(t * (len(sp) - 1)))]
                aa = a2
            else:
                t = 0.15 + 0.85 * (j + rnd(i, j, 13) * 0.8) / whips
                px, py, pz = bez(P, t)
                aa = a
            if front > 0.75 and t < 0.75 and j % 3 != 2:
                continue
            side = (rnd(i, j, 14) - 0.5) * 1.2
            ox, oy = math.cos(aa + side), math.sin(aa + side)
            out_d = 4 + rnd(i, j, 15) * 7
            facing = (ox + oy) / 1.414
            # inner whips end higher, so the curtain hangs in layers
            zend = (low + (1 - t) * 22 * rnd(i, j, 16) + (1 - facing) * 6 * rnd(i, j, 22) + rnd(i, j, 17) * 10) * droop
            w0 = (px, py, pz)
            w1 = (px + ox * out_d * 0.8, py + oy * out_d * 0.8, pz + 3)
            w2 = (px + ox * out_d * 1.15, py + oy * out_d * 1.15, pz - (pz - zend) * 0.4)
            w3 = (px + ox * out_d * 1.3 + (rnd(i, j, 18) - 0.5) * 3, py + oy * out_d * 1.3 + (rnd(i, j, 19) - 0.5) * 3, zend)
            wp = curve(w0, w1, w2, 6, w3)
            tube(s, wp, [whip_r * 1.3, whip_r * 1.15, whip_r, whip_r, whip_r, whip_r * 0.95, whip_r * 0.9], wm, 'whip%d' % k)
            e = wp[-1]
            rcone(s, (e[0], e[1], e[2] + 1.5), (e[0] + ox * 1.2, e[1] + oy * 1.2, e[2] - 4), 0.95, 0.3, tm, 'wt%d' % k)
            if rnd(i, j, 20) < 0.6:
                mm = wp[3 + int(rnd(i, j, 21) * 2)]
                rcone(s, mm, (mm[0] + ox * 3, mm[1] + oy * 3, mm[2] + 1.5), 0.8, 0.3, tm, 'wt2%d' % k)
            k += 1
    return out


def webbed_willow(lit=False):
    """A black willow in the spider dell, sheeted in grey web: sheets hung over and between its
    whips, sagging, torn so the black shows through; threads down to the ground; two pale
    egg sacs hanging in it."""
    s = Scene2(3, 3, 112)
    black_willow(s, 48, 48, 60, 7, 40, seed=401)
    hx, hy = 48, 48
    def sheet_mask(sheets, salt):
        def cover(ang, z):
            for k, (a0, a1, zb, zt) in enumerate(sheets):
                aa = ang
                if aa < a0:
                    aa += math.tau
                if a0 <= aa <= a1:
                    t = (aa - a0) / (a1 - a0)
                    u = aa * 36
                    bottom = zb + 12 * abs(math.sin(t * math.pi * 2.0)) + 5 * hsh(int(u // 3), salt + k)
                    top = zt - 8 * hsh(int(u // 5), salt + 10 + k) - 10 * (1 - math.sin(t * math.pi))
                    if not bottom < z < top:
                        return False
                    n = hsh(int(u // 8), int(z // 7), salt + 20) + hsh(int(u // 5 + 0.5), int(z // 5 + 0.5), salt + 21) * 0.8
                    return n > 0.4
            return False
        return cover
    # sheets inside the curtain all round, and two big ones draped over its near side
    shell(s, hx, hy, 8, 76, 40, 26, web_mat, 'webin', mask=sheet_mask([(-0.75, 0.35, 13, 74), (0.55, 1.55, 13, 74), (1.8, 2.7, 15, 74), (3.0, 3.7, 20, 74), (4.1, 5.2, 20, 74)], 430))
    shell(s, hx, hy, 6, 72, 54, 34, web_mat, 'webout', mask=sheet_mask([(-0.35, 0.75, 10, 66), (1.05, 2.0, 16, 70)], 450))
    # threads from the whips down to the ground
    tm = tube_mat(WEB, cuts=(0.4, 0.0, -0.4))
    tm2 = tube_mat(WEB[2:] + ['#747a74', '#5c625c'], cuts=(0.4, 0.0, -0.4))
    for i in range(5):
        a = (i / 5) * math.tau + 0.5
        r = 50 + hsh(i, 416) * 6
        tube(s, [(hx + math.cos(a) * 48, hy + math.sin(a) * 48, 14 + hsh(i, 417) * 12), (hx + math.cos(a) * r, hy + math.sin(a) * r, 0)], 0.55, tm2, 'thread%d' % i, zmin=0)
    # the egg sacs, hung by threads in front of the sheets
    egg = shaded(['#e6e0d2', '#c8c0aa', '#9a9280', '#6e6656'], cuts=(0.5, 0.05, -0.35), noise=0.2, seed=418)
    egg_tip = tube_mat(['#e6e0d2', '#c8c0aa', '#9a9280', '#6e6656'], cuts=(0.4, -0.05, -0.4))
    for i, (a, d, z) in enumerate(((0.1, 58, 26), (1.45, 56, 38))):
        ex, ey = hx + math.cos(a) * d, hy + math.sin(a) * d
        tube(s, [(ex, ey, z + 6), (ex - 4, ey - 4, z + 26)], 0.6, tm, 'eggthread%d' % i)
        ell(s, (ex, ey, z + 1), (5, 5, 7.5), egg, 'egg%d' % i)
        rcone(s, (ex, ey, z - 2), (ex, ey, z - 8.5), 3.5, 0.6, egg_tip, 'eggtip%d' % i)
    return s


def shell(s, cx, cy, z0, z1, r0, r1, mat, name, mask=None, back=True):
    """A cone-frustum shell round an upright axis (radius r0 at z0 to r1 at z1), cut by
    mask(ang, z); where the front is cut away, its far side shows from inside. 'raw':
    mat(lam, (x, y, z, ang, inside), 'raw', name)."""
    g = (r1 - r0) / (z1 - z0)
    A = (2 - g * g) / 4
    def at(sv, a, b, inside):
        x, y, z = (sv + a) / 2, (sv - a) / 2, sv / 2 - b
        if not (z0 <= z <= z1):
            return None
        ang = math.atan2(y - cy, x - cx)
        if mask and not mask(ang, z):
            return None
        R = r0 + g * (z - z0)
        nx, ny, nz = norm(x - cx, y - cy, -g * R)
        if inside:
            nx, ny, nz = -nx, -ny, -nz
        return sv, lam_of(nx, ny, nz), (x, y, z, ang, inside)
    def hit(a, b):
        p, q = a / 2 - cx, -a / 2 - cy
        c0 = r0 - g * (b + z0)
        B = p + q - g * c0
        C = p * p + q * q - c0 * c0
        d = B * B - 4 * A * C
        if d < 0:
            return None
        sq = math.sqrt(d)
        r = at((-B + sq) / (2 * A), a, b, False)
        if r or not back:
            return r
        return at((-B - sq) / (2 * A), a, b, True)
    R = max(r0, r1)
    s.add(hit, mat, 'raw', name, wb(cx - R, cx + R, cy - R, cy + R, z0, z1))


def web_mat(lam, info, sh, name):
    x, y, z, ang, inside = info[:5]
    u = ang * 40
    if inside:
        return '#747a74' if hsh(int(u // 2), int(z // 2), 419) < 0.5 else '#9aa39c'
    # long silky threads sagging down the sheet, a strand across now and then, the black of
    # the whips showing through in streaks
    w = u + 1.5 * math.sin(z * 0.15 + hsh(int(u // 7), 421) * 6)
    k = int(w // 4)
    r = hsh(k, 422)
    if int(w) % 4 == 0 and r < 0.6:
        return WEB[0] if lam > -0.1 else WEB[1]
    if abs((z + u * 0.6) % 23 - 11) < 0.6 and hsh(int(u // 9), 423) < 0.5:
        return WEB[0]
    if r > 0.82 and int(w) % 4 == 2:
        return '#747a74'
    lam += (r - 0.5) * 0.3
    return pick(WEB[1:] + ['#747a74'], lam, (0.4, 0.0, -0.4))


def rope(s, top, length, name, noose=False, seed=0):
    """A frayed rope hanging from `top`: a cord, then loose strands splayed at its end, or a
    noose still knotted in it."""
    rm = tube_mat(ROPE, cuts=(0.4, -0.05, -0.45))
    x, y, z = top
    sway = (hsh(seed, 1) - 0.5) * 2
    end = (x + sway, y - sway * 0.5, z - length)
    tube(s, [top, (x + sway * 0.5, y, z - length * 0.5), end], [0.85, 0.8, 0.75], rm, name)
    if noose:
        # the knot, and a loop below it, narrow at the top
        s.sphere(end[0], end[1], end[2], 1.4, ROPE, name + 'k', squash=1.3, seed=seed)
        n = 14
        pts = []
        for t in range(n + 1):
            a = t / n * math.tau
            rr = 4.2 * (0.55 + 0.45 * (1 - math.cos(a)) / 2)
            pts.append((end[0] + rr * math.sin(a) * 0.72, end[1] - rr * math.sin(a) * 0.72, end[2] - 5.5 + 5.5 * math.cos(a)))
        tube(s, pts, 0.7, rm, name + 'n')
    else:
        for k in range(3):
            a = (k / 3 + hsh(seed, k, 2) * 0.2) * math.tau
            tube(s, [end, (end[0] + math.cos(a) * 1.8, end[1] + math.sin(a) * 1.8, end[2] - 3 - hsh(seed, k, 3) * 2)], [0.6, 0.45], rm, name + 'f%d' % k)


def gallows_willow(lit=False):
    """The Gallows Willow by the King's Ride: a huge black willow with one long low branch
    reaching out over the ride, five frayed ropes hanging from it where the King's foresters
    hanged poachers."""
    s = Scene2(3, 3, 128)
    cx, cy = 50, 44
    # its weeping boughs are thin on the side the branch reaches out, so the ropes show
    black_willow(s, cx, cy, 66, 8.5, 45, seed=461, boughs=7, whips=11, skip=(2, 3))
    bk = tube_mat(BLACK_BARK, cuts=(0.72, 0.42, 0.05, -0.35), furrow=4, seed=462)
    # the long low branch, toward the lit south-west
    d = norm(-0.55, 0.83, 0)
    pts = [(cx + d[0] * 4, cy + d[1] * 4, 31), (cx + d[0] * 16, cy + d[1] * 16, 39), (cx + d[0] * 30, cy + d[1] * 30, 40),
           (cx + d[0] * 44, cy + d[1] * 44, 37), (cx + d[0] * 54, cy + d[1] * 54, 35)]
    tube(s, pts, [5.5, 4.2, 3.4, 2.6, 1.6], bk, 'branch')
    thorns_on(s, pts, [5.5, 4.2, 3.4, 2.6, 1.6], 'branch', every=6, length=(4, 7), seed=463, start=0.45, both=False)
    # five ropes along it, two still knotted in a noose
    for i, t in enumerate((0.3, 0.44, 0.58, 0.72, 0.86)):
        L = t * 50
        px, py = cx + d[0] * (4 + L), cy + d[1] * (4 + L)
        pz = 39 - max(0, L - 26) * 0.18 - 3.0
        rope(s, (px, py, pz), 17 + hsh(i, 464) * 9, 'rope%d' % i, noose=i in (1, 4), seed=465 + i)
    return s


def great_willow(lit=False):
    """A great black weeping willow at the end of the Weeping Bridge: a vast black trunk, and
    whips weeping from its crown almost to the ground. Its trunk stands on the middle four tiles."""
    s = Scene2(4, 4, 140)
    black_willow(s, 64, 64, 74, 13, 54, seed=481, boughs=9, whips=14, low=3)
    return s


def thorn_tunnel(lit=False):
    """Where the Lisle runs under the black thorn wall: thick black thorn stems arching over
    the water from a great knotted mass on the west bank to a low foot on the east, the ribs
    of the arch close together; you walk beneath it on its east side (the west column is
    the solid mass, as SOLID2 says)."""
    s = Scene2(3, 2, 70)
    tm = tube_mat(THORN, cuts=(0.55, 0.15, -0.3), noise=0.25, seed=501)
    rnd = lambda *a: hsh(501, *a)
    M = lambda pts: [(96 - x, y, z) for (x, y, z) in pts]  # drawn east-heavy, then mirrored
    for i, y in enumerate((4, 13, 23, 33, 43, 52, 60)):
        h = 46 + rnd(i, 1) * 10
        xa = 1 + rnd(i, 2) * 4
        xb = 82 + rnd(i, 3) * 6
        pts = []
        for j in range(15):
            t = j / 14
            ang = math.pi * (1 - t)
            x = (xa + xb) / 2 + math.cos(ang) * (xb - xa) / 2
            z = h * math.sin(ang) ** 0.75 - 2 + 3 * math.sin(t * 9 + i)
            yy = y + 3 * math.sin(t * 6 + i * 1.7)
            pts.append((x, yy, z))
        pts = M(pts)
        r = 2.8 + rnd(i, 4) * 1.4 if i < 6 else 4.6
        radii = [r * (1.25 - 0.4 * math.sin(math.pi * j / 14)) for j in range(15)]
        tube(s, pts, radii, tm, 'rib%d' % i, zmin=0)
        thorns_on(s, pts, radii, 'rib%d' % i, every=5 if i == 6 else 6, length=(5, 9), seed=510 + i, start=0.05, end=0.95)
    # stems running along the top, binding the ribs, and the knotted mass down the west side
    for i in range(5):
        x0 = 20 + i * 15 + rnd(i, 5) * 6
        out = []
        for j in range(9):
            x, y = x0 + 4 * math.sin(j + i), j * 66 / 8 - 2
            t = (x - 3) / 88
            out.append((x, y, 50 * math.sin(math.pi * max(0.02, min(0.98, t))) ** 0.75 + 2 + 3 * math.sin(y * 0.2 + i)))
        out = M(out)
        tube(s, out, 2.2 + rnd(i, 6), tm, 'top%d' % i)
        thorns_on(s, out, 2.5, 'top%d' % i, every=7, length=(4, 7), seed=530 + i)
    for i in range(7):
        y0 = 2 + i * 9.5
        pts = M(curve((74 + rnd(i, 7) * 8, y0, -2), (90 - y0 * 0.08, y0 + 4, 44 + rnd(i, 8) * 10), (58 - rnd(i, 9) * 12, y0 + 2, 50), 8))
        tube(s, pts, [4.2, 3.8, 3.4, 3.0, 2.8, 2.6, 2.4, 2.2, 2.0], tm, 'mass%d' % i, zmin=0)
        thorns_on(s, pts, 3.2, 'mass%d' % i, every=6, length=(5, 8), seed=550 + i)
    return s


def fallen_willow(lit=False):
    """A black willow fallen across the old road: the trunk on its side, its torn-up roots and
    the earth they hold standing on end at the east, snapped boughs at the west, and black
    thorns as long as swords standing out of it all along."""
    s = Scene2(4, 1, 52)
    bk = tube_mat(BLACK_BARK, cuts=(0.72, 0.42, 0.05, -0.35), furrow=4, seed=571)
    rnd = lambda *a: hsh(571, *a)
    pts = [(8, 17, 7), (38, 15.5, 8.5), (68, 17, 9.5), (98, 16, 10.5)]
    radii = [6.5, 8, 9, 10]
    tube(s, pts, radii, bk, 'trunk', zmin=0)
    # the root plate on end at the east, earth in its roots
    def plate(u, v, sh, f):
        d = math.hypot(u - 17, v - 17)
        r = hsh(int(u) // 2, int(v) // 2, 572)
        if d > 14:
            return '#2e2632' if r < 0.5 else '#463b50'
        return '#5e4e46' if r < 0.35 else '#4a3c34' if r < 0.8 else '#3a2e2a'
    def plate_mask(U, V):
        d = math.hypot(U - 17, V - 17)
        a = math.atan2(V - 17, U - 17)
        return d < 17 + 3 * math.sin(a * 5) + 2 * hsh(int(a * 6), 573) and V > -1
    quad(s, (107, 37, -2), (0, -42, 0), (0, 0, 40), plate, 'plate', sh=SHADE, mask=lambda U, V: plate_mask(U - 4, V - 2))
    for i in range(12):
        a = (i / 12) * math.pi * 1.15 - 0.08
        r0 = (107, 16 + math.cos(a) * 12, 17 + math.sin(a) * 12)
        r1 = (110 + rnd(i, 1) * 5, 16 + math.cos(a) * (22 + rnd(i, 2) * 5), 17 + math.sin(a) * (22 + rnd(i, 3) * 5))
        tube(s, [r0, ((r0[0] + r1[0]) / 2 + 2, (r0[1] + r1[1]) / 2, (r0[2] + r1[2]) / 2 + 2), r1], [2.2, 1.3, 0.6], bk, 'root%d' % i, zmin=0)
    # snapped boughs at the crown end
    for i, (p1, r) in enumerate((((2, 9, 18), 4), ((0, 24, 10), 3.5), ((14, 28, 22), 3))):
        tube(s, [(12, 17, 8), p1], [r, r * 0.7], bk, 'bough%d' % i, zmin=0)
    # thorns as long as swords
    tmat = thorn_mat(THORN)
    for i in range(15):
        x = 12 + i * 6.2 + rnd(i, 4) * 3
        ang = (0.1 + rnd(i, 5) * 0.8) * math.pi  # mostly upward
        dy, dz = math.cos(ang), math.sin(ang)
        cz = 8 + x / 40
        rr = 7 + x / 30
        base = (x, 16.5 + dy * rr * 0.8, cz + dz * rr * 0.8)
        L = 13 + rnd(i, 6) * 9
        tip = (x + (rnd(i, 7) - 0.5) * 8, base[1] + dy * L, base[2] + dz * L)
        rcone(s, base, tip, 1.9, 0.3, tmat, 'thorn%d' % i, zmin=0)
    return s


# ================================================================ the King's Chase
LOGS = {LIT: ['#7c6c58', '#6a5848', '#5e4e46', '#2a2226'], SHADE: ['#5e4e46', '#4e4038', '#3a2e2a', '#1d1b22'], TOP: ['#8c7c66', '#7c6c58', '#6a5c4c', '#3a2e2a']}


def logs(course=6, seed=0):
    """A wall of squared logs laid in courses: a lit upper edge, a dark seam, checks in the wood."""
    def f(u, v, sh, face):
        t = LOGS[sh]
        dv = v % course
        if dv == 0:
            return t[3]
        if dv == course - 1:
            return t[0]
        if hsh(u // 9, v // course, seed) < 0.07 and dv == course // 2:
            return t[3]
        return t[1] if hsh(u // 13, v // course, seed + 1) < 0.65 else t[2]
    return f


ANTLERS = [
    'b.....b.b.......b.b.....b',
    'b.b..b...b.....b...b..b.b',
    '.b.b.b...b.....b...b.b.b.',
    '..bbb.b.b.......b.b.bbb..',
    '...b...bb.......bb...b...',
    '....b...bb.....bb...b....',
    '.....bb..bb...bb..bb.....',
    '.......bb.bBBBb.bb.......',
    '.........bBBBBBb.........',
    '..........BkBkB..........',
    '..........BBBBB..........',
    '...........BBB...........',
    '...........BbB...........',
    '...........xxx...........',
]


LODGE_DOOR = [
    'kkkkkkkkkkkkkkkkkkkk',
    'kxWWWWWWWxkxWWWWWWWk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kIIIIIIIIIkIIIIIIIIk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kWwWwWwWwIkIwWwWwWwk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kIIIIIIIIIkIIIIIIIIk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kWwWwWwWwWkWwWwWwWwk',
    'kxxxxxxxxxkxxxxxxxxk',
]


SHUTTERED = [
    'kkkkkkkkkk',
    'kDDDDDkWwk',
    'kDDDDDkWwk',
    'kDDDDDkWwk',
    'kDDDDDkWwk',
    'kDDDDDkWwk',
    'kDDDDDkWwk',
    'kDDDDDkkkk',
    'kkkkkkk...',
    'xwwwwwwx..',
]


def hunting_lodge(lit=False):
    """The King's hunting lodge in the Chase: a long lodge of squared logs on a stone footing,
    its shingle roof fallen in down the middle (broken rafters, the dark inside showing),
    the King's antlers still over the double doors, its shutters hanging."""
    s = Scene2(5, 3, 128)
    x0, x1, y0, y1 = 8, 150, 12, 82
    ze, zr, ov = 50, 90, 4
    ym = (y0 + y1) / 2
    k = (zr - ze) / (ym - y0)
    lg = logs(seed=601)
    st = stone(course=4, seed=602)
    def wall(u, v, sh, f):
        return st(u, v, sh, f) if v < 8 else lg(u, v, sh, f)
    s.wall_y(y1, x0, x1, 0, ze, wall, 'body.y')
    s.wall_x(x1, y0, y1, 0, ze, wall, 'body.x')
    # corner posts
    for (x, y) in ((x1 - 3, y1 - 3),):
        s.box(x, x + 4, y, y + 4, 0, ze + 2, post_mat, 'corner')
    # the inside, seen through the hole: the back wall's inner face, the floor strewn with the
    # roof that fell, the west wall's inner face
    def inner_logs(u, v, sh, f):
        # the inside, in the shadow of what is left of the roof; daylight on its upper courses
        dv = v % 6
        if dv == 0:
            return '#1d1b22'
        return '#4a3c34' if v > 34 and dv > 3 else '#3a2e2a' if v > 20 else '#2a2226'
    s.wall_y(y0 + 3, x0, x1, 0, zr - (ym - y0 - 3) * k, inner_logs, 'in.back', zmax=lambda x: ze + 0.0 + 3 * k)
    def floor(u, v, sh, f):
        r = hsh(u // 3, v // 2, 603)
        return '#1d1b22' if r < 0.4 else '#2a2226' if r < 0.8 else '#4a3c34'
    s.flat(1, x0, x1, y0 + 3, y1 - 3, floor, 'in.floor')
    # rubble of shingles and a fallen rafter on the floor
    for i in range(6):
        x = 66 + i * 9 + hsh(i, 604) * 4
        y = 30 + hsh(i, 605) * 30
        quad(s, (x, y, 1.5), (7, 2, 1 + hsh(i, 606) * 3), (-1, 5, 0), shingles(WOOD_SH, row=3, width=5, seed=607 + i), 'rub%d' % i, sh=TOP)
    pm = tube_mat(POLE, cuts=(0.45, 0.0, -0.4), seed=608)
    tube(s, [(70, 40, 2), (108, 60, 14)], 1.8, pm, 'fallen')
    # the roof: shingles, a ragged hole down the middle of its near slope; rafters across it,
    # some snapped
    X0, X1, Y1 = x0 - ov, x1 + ov, y1 + ov
    zl = ze - ov * k
    L = X1 - X0
    hu0, hu1 = 0.33 * L, 0.76 * L
    def hole(U, V):
        Vmax = math.hypot(ym - Y1, zr - zl)
        edge0 = hu0 + 6 * math.sin(V * 0.35) + 5 * hsh(int(V // 3), 609)
        edge1 = hu1 - 6 * math.sin(V * 0.3 + 1) - 5 * hsh(int(V // 3), 610)
        bot = 0.2 * Vmax + 6 * hsh(int(U // 4), 611) + 5 * math.sin(U * 0.2) + 10 * (abs(U - (hu0 + hu1) / 2) / ((hu1 - hu0) / 2)) ** 2
        return not (edge0 < U < edge1 and V > bot)
    GREY_SH = GREY_WOOD
    sh_roof = shingles(GREY_SH, row=4, width=7, seed=612)
    def roof(u, v, sh, f):
        if hsh(u // 7, v // 4, 613) < 0.04:
            return '#2a2226'  # a shingle gone
        m = hsh(u // 11, v // 8, 614)
        if m < 0.2 and hsh(u // 2, v // 2, 618) < 0.55 + m:
            return '#6f7c5c' if hsh(u, v, 619) < 0.4 else '#5a664b'  # moss
        return sh_roof(u, v, sh, f)
    quad(s, (X0, Y1, zl), (L, 0, 0), (0, ym - Y1, zr - zl), roof, 'roof.front', sh=LIT, mask=hole)
    quad(s, (X0, Y1, zl - 3), (L, 0, 0), (0, 0, 3), lambda u, v, sh, f: '#4a3c34', 'roof.eave', sh=LIT, mask=lambda U, V: not (hu0 + 4 < U < hu1 - 4) or V < 1.5)
    # the far slope's underside, seen through the hole
    under = lambda u, v, sh, f: '#2a2226' if (u % 12) < 2 else '#3a2e2a' if hsh(u // 6, v // 4, 615) < 0.5 else '#4a3c34'
    quad(s, (X0 + 1, ym, zr - 1.5), (L - 2, 0, 0), (0, y0 - ym + 2, zl - zr + 2 * k), under, 'roof.under', sh=SHADE)
    # gable end
    s.wall_x(x1, y0, y1, ze, zr, logs(seed=616), 'roof.gable', zmax=lambda y: zr - abs(y - ym) * k)
    quad(s, (x1 + ov, Y1, zl - 3), (0, ym - Y1, zr - zl), (0, 0, 3), lambda u, v, sh, f: '#3a2e2a', 'roof.e1', sh=SHADE)
    quad(s, (x1 + ov, ym, zr - 3), (0, y0 - ov - ym, zl - zr), (0, 0, 3), lambda u, v, sh, f: '#3a2e2a', 'roof.e2', sh=SHADE)
    # rafters over the hole, the ridge beam sagging where it broke
    rm = tube_mat(['#7c6c58', '#5e4e46', '#4a3c34', '#2a2226'], cuts=(0.45, 0.0, -0.4))
    for i, x in enumerate(range(int(X0 + hu0) - 2, int(X0 + hu1) + 4, 11)):
        a = (x, Y1 - 2, zl + 2 * k)
        b = (x, ym, zr - 1)
        f = hsh(i, 617)
        if f < 0.35:
            # snapped off part way, the stub hanging
            m = (x, a[1] + (b[1] - a[1]) * (0.35 + f), a[2] + (b[2] - a[2]) * (0.35 + f))
            tube(s, [a, m, (m[0] + 2, m[1] + 4, m[2] - 9)], 1.4, rm, 'raft%d' % i)
        elif f < 0.55:
            tube(s, [(x, ym + 4, zr - 4), b], 1.4, rm, 'raft%d' % i)
        else:
            tube(s, [a, b], 1.4, rm, 'raft%d' % i)
    sag = lambda x: 4 * max(0, 1 - abs((x - (X0 + (hu0 + hu1) / 2)) / ((hu1 - hu0) / 2)))
    tube(s, [(X0, ym, zr), (X0 + hu0, ym, zr), (X0 + (hu0 + hu1) / 2 - 3, ym, zr - 9), (X0 + (hu0 + hu1) / 2 + 3, ym + 1, zr - 12),
             (X0 + hu1, ym, zr - 2), (X1, ym, zr)], 1.8, rm, 'ridge')
    # the doors, the antlers over them, the shutters
    s.decal('body.y', 60, 1, LODGE_DOOR, WOOD)
    s.decal('body.y', 57, 27, ANTLERS, {'b': '#c8c0aa', 'B': '#e6e0d2', 'k': '#2a2226', 'x': '#4a3c34'})
    for u in (16, 36, 100, 122):
        s.decal('body.y', u, 18, SHUTTERED, dict(WOOD, D=DARK))
    s.decal('body.x', 30, 18, SHUTTERED, dict(WOOD, D=DARK))
    return s


PALE = {LIT: ['#8c7c66', '#7c6c58', '#4a3c34'], SHADE: ['#6a5c4c', '#5e4e46', '#2a2226'], TOP: ['#a0907a', '#8c7c66', '#4a3c34']}


def paling(u, v, sh, f):
    t = PALE[sh]
    k = int(u) % 4
    return t[2] if k == 2 else t[0] if k == 0 else t[1]


def kennels(lit=False):
    """The King's kennels behind the lodge: a low plank block under a lean-to roof, a paled run
    in front split into four pens; every kennel door and every gate gnawed open from inside."""
    s = Scene2(3, 2, 48)
    x0, x1, y0, y1, h = 4, 92, 4, 24, 19
    pl = planks({LIT: ['#8c7c66', '#7c6c58', '#6a5c4c', '#3a2e2a'], SHADE: ['#6a5c4c', '#5e4e46', '#4a3c34', '#2a2226'], TOP: ['#a0907a', '#8c7c66', '#7c6c58', '#4a3c34']}, width=4, seed=621)
    s.wall_y(y1, x0, x1, 0, h, pl, 'body.y')
    s.wall_x(x1, y0, y1, 0, h, pl, 'body.x')
    s.shed(x0 - 2, x1 + 3, y0 - 3, y1 + 3, h + 9, h - 1, planks(WOOD_SH, width=6, seed=622), 'roof')
    quad(s, (x0 - 2, y1 + 3, h - 3), (x1 - x0 + 5, 0, 0), (0, 0, 2), lambda u, v, sh, f: '#3a2e2a', 'roof.eave', sh=LIT)
    # the kennel doors: dark holes, each door swung back against the wall, its edge chewed
    hole = ['kkkkkkkkkk'] + ['kDDDDDDDDk'] * 11
    leaf = ['xxxxxxx.', 'xWwWwWx.', 'xWwWwWx.', 'xWwWwW..', 'xWwWw...', 'xWwWwx..', 'xWwW....', 'xWwWw...', 'xWw.....', 'xWwWw...', 'xWwWwWx.', 'xxxxxxx.']
    for i in range(4):
        dx = x0 + 5 + i * 22
        s.decal('body.y', dx - x0, 0, hole, {'k': '#2a2226', 'D': DARK})
        s.decal('body.y', dx - x0 + 10, 0, leaf, WOOD)
    # the run: paled fences, a gate gap in each pen's front, the gates swung out and gnawed
    fy, fh = 58, 13
    gaps = [(x0 + p * 22 + 8, x0 + p * 22 + 16) for p in range(4)]
    def front_mask(u, v):
        x = x0 + u
        if any(a <= x <= b for a, b in gaps):
            return False
        return int(u) % 4 != 3 and v < fh - abs(int(u) % 4 - 1)
    s.wall_y(fy, x0, x1, 0, fh, paling, 'run.y')
    masked(s, front_mask)
    side_mask = lambda u, v: int(u) % 4 != 3 and v < fh - 1 - abs(int(u) % 4 - 1)
    for p in range(5):
        s.wall_x(x0 + p * 22, y1, fy, 0, fh - 1, paling, 'part%d' % p)
        masked(s, side_mask)
    for p in range(5):
        s.box(x0 + p * 22 - 1, x0 + p * 22 + 1, fy - 1, fy + 1, 0, fh + 2, post_mat, 'post%d' % p)
    for i, (a, b) in enumerate(gaps):
        s.box(a - 1, a + 1, fy - 1, fy + 1, 0, fh + 1, post_mat, 'gp%d' % i)
        def gate_mask(U, V, i=i):
            chewed = U > 4 and V < 5 + 3 * hsh(int(U), 631 + i)
            return int(U) % 4 != 3 and V < fh - 1 - abs(int(U) % 4 - 1) and not chewed
        quad(s, (a, fy + 0.5, 0), (4.5, 6.5, 0), (0, 0, fh - 1), paling, 'gate%d' % i, sh=SHADE, mask=gate_mask)
    # rails along the inside of the front
    rm = lambda u, v, sh, f: POST[sh][0 if v >= 1 else 1]
    for z in (3, 9):
        s.box(x0, x1, fy - 2, fy, z, z + 1.5, rm, 'rail%d' % z)
    # gnawed bones in the run
    for i, (a, b) in enumerate((((26, 42, 1), (32, 45, 1.2)), ((70, 38, 1), (66, 44, 1)), ((52, 64, 1), (57, 62, 1)))):
        tube(s, [a, b], 0.9, bone_mat, 'bone%d' % i)
    return s


def goblin_tent(lit=False):
    """A goblin outrider's tent: hides of every colour stitched over crooked poles that stick
    out of its top, bones hung from them on cords, its flap open."""
    s = Scene2(2, 2, 60)
    cx, cy, apex = 32, 32, 40
    n = 7
    planes = []
    for i in range(n):
        a = (i + 0.3) / n * math.tau
        nx, ny = math.cos(a), math.sin(a)
        R = 23 + hsh(i, 641) * 3
        # a side leaning in from radius R at the ground to the apex
        planes.append(plane((nx * apex, ny * apex, R), (cx + nx * R, cy + ny * R, 0)))
    planes.append(plane((0, 0, -1), (cx, cy, 0)))
    hides = [['#a8987e', '#8c7c66', '#6a5c4c', '#4a3c34'], ['#8c7c66', '#7c6c58', '#5e4e46', '#3a2e2a'],
             ['#b8a88c', '#a0907a', '#7c6c58', '#4a3c34'], ['#7c6c58', '#6a5848', '#4e4038', '#2a2226'], ['#9a9280', '#7c6c58', '#5e4e46', '#3a2e2a']]
    def tm(lam, info, sh, name):
        fi, x, y, z, nx, ny, nz, data = info
        if fi >= n:
            return None
        # the flap: a dark opening in the face toward the viewer
        if fi == 1:
            a = math.atan2(y - cy, x - cx)
            ac = (1 + 0.3) / n * math.tau
            if abs(a - ac) * (24 - z * 0.55) < 6.5 - z * 0.18 and z < 24:
                return DARK if abs(a - ac) * (24 - z * 0.55) < 5.5 - z * 0.18 else '#2a2226'
        t = hides[(fi + int(z // 13) + (1 if math.atan2(y - cy, x - cx) * 3 % 1 > 0.5 else 0)) % len(hides)]
        # stitched seams between the patches
        if abs((z % 13) - 0.5) < 0.6 and hsh(int(x + y), 642) < 0.7:
            return '#2a2226'
        lam += (hsh(int(x) // 3, int(y) // 3, int(z) // 3, 643) - 0.5) * 0.2
        return pick(t, lam, (0.6, 0.25, -0.15))
    poly(s, planes, tm, 'tent', (cx - 27, cx + 27, cy - 27, cy + 27, 0, apex + 2))
    # crooked poles sticking out of the top
    pm = tube_mat(POLE, cuts=(0.45, 0.0, -0.4), seed=644)
    tips = []
    for i in range(5):
        a = (i / 5 + 0.1) * math.tau
        b0 = (cx + math.cos(a) * 3, cy + math.sin(a) * 3, apex - 6)
        b1 = (cx - math.cos(a) * 4 + (hsh(i, 645) - 0.5) * 3, cy - math.sin(a) * 4, apex + 6)
        b2 = (cx - math.cos(a) * 8 + (hsh(i, 646) - 0.5) * 5, cy - math.sin(a) * 8 + (hsh(i, 647) - 0.5) * 4, apex + 14 + hsh(i, 648) * 4)
        tube(s, [b0, b1, b2], [1.3, 1.1, 0.9], pm, 'pole%d' % i)
        tips.append(b2)
    # bones hung on cords from the pole tips, a skull on one
    cord = tube_mat(ROPE[1:], cuts=(0.3, -0.2))
    for i, t in enumerate(tips):
        if i == 2:
            continue
        drop = 7 + hsh(i, 649) * 6
        tube(s, [t, (t[0], t[1], t[2] - drop)], 0.45, cord, 'cord%d' % i)
        e = (t[0], t[1], t[2] - drop)
        if i == 0:
            s.sphere(e[0], e[1], e[2] - 2.5, 2.8, BONE, 'skull', squash=1.0, seed=3)
        else:
            tube(s, [(e[0] - 1.5, e[1] + 1.5, e[2]), (e[0] + 1, e[1] - 1, e[2] - 6)], 0.9, bone_mat, 'hbone%d' % i)
    # bones lashed on the hide by the flap
    for i, (x, y, z, d) in enumerate(((44, 47, 14, (4, -3, 4)), (49, 39, 9, (-2, 4, 6)), (38, 51, 4, (5, -1, 2)))):
        tube(s, [(x, y, z), (x + d[0], y + d[1], z + d[2])], 0.9, bone_mat, 'lbone%d' % i)
    # stones holding down the skirt
    for i in range(6):
        a = (i / 6 + 0.05) * math.tau
        s.sphere(cx + math.cos(a) * 25, cy + math.sin(a) * 25, 0.5, 2.2, STONE_T, 'st%d' % i, squash=0.7, seed=i)
    return s


def stake(s, x, y, h, r, name, lean=(0, 0), mat=None):
    """A sharpened stake driven into the ground."""
    pm = mat or tube_mat(['#8c7c66', '#6a5848', '#4e4038', '#3a2e2a'], cuts=(0.45, 0.0, -0.4), furrow=3, seed=int(x * 7 + y))
    lx, ly = lean
    top = (x + lx, y + ly, h)
    tube(s, [(x, y, -1), top], r, pm, name, zmin=0)
    rcone(s, top, (x + lx * 1.25, y + ly * 1.25, h + r * 3.2), r, 0.3, tube_mat(['#c8c0aa', '#a0907a', '#7c6c58', '#4a3c34'], cuts=(0.45, 0.0, -0.4)), name + 't')


def wolf_pen(lit=False):
    """The goblins' wolf pen: a ring of sharpened stakes lashed together, gnawed bones inside,
    a gap in its south-west side where two stakes have been dragged down."""
    s = Scene2(2, 2, 44)
    s.dome(32, 32, 26, 26, 1.5, dome_earth(seed=651), 'ground')
    k = 0
    for side in range(4):
        for j in range(9):
            t = (j + 0.5) / 9
            if side == 0:
                x, y = 6 + t * 52, 6
            elif side == 1:
                x, y = 58, 6 + t * 52
            elif side == 2:
                x, y = 58 - t * 52, 58
            else:
                x, y = 6, 58 - t * 52
            if side == 2 and 3 <= j <= 4:
                continue  # the gap
            h = 22 + hsh(side, j, 652) * 8
            lean = ((x - 32) * 0.06, (y - 32) * 0.06)
            stake(s, x, y, h, 2.0, 'stk%d' % k, lean)
            k += 1
    # lashing rails round the inside
    rope_m = tube_mat(ROPE[1:], cuts=(0.3, -0.2))
    for z in (9, 17):
        tube(s, [(6, 6, z), (58, 6, z), (58, 58, z), (37, 58, z)], 0.7, rope_m, 'lash%d' % z)
        tube(s, [(27, 58, z), (6, 58, z), (6, 6, z)], 0.7, rope_m, 'lashb%d' % z)
    # the two stakes dragged out, lying in the gap
    pm = tube_mat(['#8c7c66', '#6a5848', '#4e4038', '#3a2e2a'], cuts=(0.45, 0.0, -0.4), furrow=3, seed=653)
    tube(s, [(30, 59, 2), (24, 78, 1.5)], 2.0, pm, 'down0', zmin=0)
    tube(s, [(35, 58, 2.5), (44, 74, 1.5)], 2.0, pm, 'down1', zmin=0)
    for i, (a, b) in enumerate((((22, 30, 1), (28, 34, 1.5)), ((38, 24, 1), (36, 31, 1)), ((30, 42, 1), (37, 41, 1.5)))):
        tube(s, [a, b], 1.0, bone_mat, 'bone%d' % i)
    s.sphere(26, 40, 2, 2.4, BONE, 'skull', seed=5)
    return s


def goblin_wall(lit=False):
    """The goblins' wall across the hill path, built of thornwood and bones: posts, thorn
    branches piled between them and lashed, skulls and long bones tied into its near face, and
    sharpened stakes thrust out of its far side toward the hills (north, -y) and slanting up,
    against whatever is out there."""
    s = Scene2(4, 1, 64)
    P = lambda a, c, z: (a, 18 - c, z)  # along the wall, outward (north), up
    wood = tube_mat(['#7c6c58', '#5e4e46', '#4a3c34', '#2a2226'], cuts=(0.5, 0.05, -0.35), furrow=3, seed=661)
    thorn = tube_mat(THORN, cuts=(0.5, 0.05, -0.35), noise=0.25, seed=662)
    # sharpened stakes thrust out toward the hills, slanting up over the wall
    sm = tube_mat(['#a0907a', '#7c6c58', '#5e4e46', '#3a2e2a'], cuts=(0.5, 0.05, -0.35), seed=668)
    tipm = tube_mat(['#c8c0aa', '#a0907a', '#7c6c58', '#4a3c34'], cuts=(0.45, 0.0, -0.4))
    for i in range(13):
        a = 4 + i * 9.6 + hsh(i, 669) * 3
        z0 = 8 + (i % 3) * 9
        b0 = P(a, -1, z0 - 6)
        m = P(a + (hsh(i, 670) - 0.5) * 4, 10, z0 + 14)
        tube(s, [b0, m], 1.8, sm, 'spk%d' % i)
        rcone(s, m, P(a + (hsh(i, 670) - 0.5) * 5, 15, z0 + 22), 1.8, 0.3, tipm, 'spkt%d' % i)
    # posts
    for i, a in enumerate(range(6, 128, 20)):
        h = 38 + hsh(i, 663) * 8
        tube(s, [P(a, 2, -1), P(a + 1, 2, h)], 2.6, wood, 'post%d' % i, zmin=0)
        rcone(s, P(a + 1, 2, h), P(a + 1, 2, h + 8), 2.6, 0.3, wood, 'pt%d' % i)
    # thorn branches piled along it
    for i in range(9):
        z = 4 + i * 4 + hsh(i, 664) * 2
        pts = [P(a, 1 + 3 * math.sin(a * 0.11 + i) + hsh(i, 665) * 2, z + 3 * math.sin(a * 0.07 + i * 2)) for a in range(-2, 132, 8)]
        tube(s, pts, 2.0 + hsh(i, 666), thorn if i % 2 else wood, 'br%d' % i, zmin=0)
        if i % 2:
            thorns_on(s, pts, 2.4, 'br%d' % i, every=9, length=(4, 6), seed=667 + i)
    # lashings round the posts
    rm = tube_mat(ROPE[1:], cuts=(0.3, -0.2))
    for i, a in enumerate(range(6, 128, 20)):
        for z in (12, 26):
            tube(s, [P(a - 3, -1.5, z), P(a + 4, -1.5, z + 2)], 0.7, rm, 'lash%d_%d' % (i, z))
    # skulls and long bones tied into the near face
    for i, (a, z) in enumerate(((20, 30), (58, 22), (96, 34), (116, 16))):
        c = P(a, -3, z)
        s.sphere(c[0], c[1], c[2], 3.2, BONE, 'skull%d' % i, seed=i + 7)
    for i, (a, z) in enumerate(((38, 14), (76, 30), (108, 8), (12, 12))):
        tube(s, [P(a - 4, -3, z - 3), P(a + 4, -3, z + 3)], 1.0, bone_mat, 'lb%d' % i)
    return s


# ================================================================ Heron Reach
HERON = [
    '.kkkkkkkkkkkkkkk.',
    'kbbbbbWWbbbbbbbbk',
    'kbbbbWWWwbbbbbbbk',
    'kWWWWWWWwbbbbbbbk',
    'kbbbbbWWwbbbbbbbk',
    'kbbbbbbWwbbbbbbbk',
    'kbbbbbbbWwbbbbbbk',
    'kbbbbbbbWwbbbbbbk',
    'kbbbbbbWwbbbbbbbk',
    'kbbbbbWWwbbbbbbbk',
    'kbbbbWWWWwwwbbbbk',
    'kbbbWWWWWWwwwwbbk',
    'kbbbWWWWWWwwwwwbk',
    'kbbbbWWWWWwwwwbbk',
    'kbbbbbWWWwwwbbbbk',
    'kbbbbbbbwbbbbbbbk',
    'kbbbbbbbwbbbbbbbk',
    'kbbbbbbbwbbbbbbbk',
    'kbbbbbbwwwbbbbbbk',
    '.kkkkkkkkkkkkkkk.',
]


def heron_lodge(lit=False):
    """Heron Lodge, the Wardens' waystation on the Lisle: stone below, timber-framed above, a
    slate roof and a stone chimney (its hearth cold), small windows, and a heron carved over
    the door on its lit side."""
    s = Scene2(4, 3, 140)
    gl = GLASS_LIT if lit else GLASS
    x0, x1, y0, y1 = 8, 112, 12, 84
    ze, zr = 58, 104
    L = x1 - x0
    st = stone(course=5, seed=701)
    upy = timber_frame(posts=[0, 26, 52, 78, L - 2], rails=[30, 54], braces=[(2, 32, 24, 52), (80, 52, 102, 32)])
    upx = timber_frame(posts=[0, 34, y1 - y0 - 2], rails=[30, 54])
    def body_y(u, v, sh, f):
        return st(u, v, sh, f) if v < 28 else upy(u, v, sh, f)
    def body_x(u, v, sh, f):
        return st(u, v, sh, f) if v < 28 else upx(u, v, sh, f)
    s.wall_y(y1, x0, x1, 0, ze, body_y, 'body.y')
    s.wall_x(x1, y0, y1, 0, ze, body_x, 'body.x')
    s.gable_x(x0, x1, y0, y1, ze, zr, shingles(seed=702), upx, 'roof', ov=4, gx=x1)
    s.box(18, 30, 30, 42, 0, zr + 14, stone(course=4, seed=703), 'chimney')
    s.box(17, 31, 29, 43, zr + 12, zr + 15, stone(course=3, seed=704), 'chimcap')
    # the door, the heron over it on a board, small windows
    s.decal('body.y', 34, 1, DOOR, WOOD)
    # the heron, carved in pale wood on a dark board hung out over the door, turned to face the road
    sprite(s, (47.5, 92, 31), (0.5, -0.5, 0), (0, 0, 1), HERON, {'k': '#2a2226', 'b': '#4a3c34', 'W': '#e6e0d2', 'w': '#9a9280'}, 'heron')
    tube(s, [(52, 87.5, 51), (52, 84, 51)], 0.7, tube_mat(IRON[1:]), 'bracket')
    for u in (12, 66, 86):
        s.decal('body.y', u, 12, SMALL_WINDOW, gl)
    for u in (12, 88):
        s.decal('body.y', u, 38, SMALL_WINDOW, gl)
    s.decal('body.x', 30, 12, SMALL_WINDOW, gl)
    s.decal('body.x', 30, 38, SMALL_WINDOW, gl)
    s.decal('roof.gable', 33, 66, SMALL_WINDOW, gl)
    # a step of stone before the door
    s.box(38, 54, y1, y1 + 4, 0, 2, stone(course=2, seed=705), 'step')
    return s


def outpost(lit=False):
    """The Tower Guard's outpost at the ford: a corner of palisade with old shields hung on it,
    and an iron brazier on a tripod, cold."""
    s = Scene2(2, 2, 52)
    k = 0
    for j in range(12):
        x = 4 + j * 4.9
        stake(s, x, 5, 30 + hsh(j, 711) * 6, 2.4, 'n%d' % k)
        k += 1
    for j in range(1, 12):
        y = 4 + j * 4.9
        stake(s, 5, y, 30 + hsh(j, 712) * 6, 2.4, 'w%d' % k)
        k += 1
    rm = tube_mat(['#7c6c58', '#5e4e46', '#4a3c34', '#2a2226'], cuts=(0.45, 0.0, -0.4))
    for z in (8, 22):
        tube(s, [(60, 7.6, z), (7.6, 7.6, z), (7.6, 60, z)], 1.1, rm, 'rail%d' % z)
    # the shields: round, blue-grey with the white tower, rust-rimmed; one split
    def shield(cu, cv, r, split=False, plain=False):
        def m(u, v, sh, f):
            d = math.hypot(u - r, v - r)
            if d > r - 1.2:
                return '#7a4a40' if hsh(int(u), int(v), 713) < 0.5 else '#5e3a36'
            if d < 1.6:
                return '#9aa39c'
            if split and abs((u - r) - (v - r) * 0.3) < 0.7:
                return '#1d1b22'
            if not plain and abs(u - r) < 2.6 and 2 < v < 2 * r - 4:
                if v > 2 * r - 7 and int(u - r + 3) % 2 == 0:
                    return '#c8ccc6'
                if v <= 2 * r - 7:
                    return '#c8ccc6' if sh == LIT else '#9aa39c'
            return '#5e6e76' if sh == LIT else '#46545c'
        return m, (lambda U, V: math.hypot(U - r, V - r) <= r)
    for i, (x, z, r, sp) in enumerate(((20, 10, 8.5, False), (42, 13, 8, True))):
        m, mk = shield(0, 0, r, split=sp)
        quad(s, (x - r, 8.6, z), (2 * r, 0, 0), (0, 0, 2 * r), m, 'sh%d' % i, sh=LIT, mask=mk)
    m, mk = shield(0, 0, 8, plain=True)
    quad(s, (8.6, 36 + 8, 11), (0, -16, 0), (0, 0, 16), m, 'sh2', sh=SHADE, mask=mk)
    # the brazier: an iron bowl on three legs, cold ash and black charcoal in it
    bx, by = 30, 34
    im = tube_mat(IRON[1:], cuts=(0.4, -0.05, -0.45))
    for i in range(3):
        a = (i / 3 + 0.08) * math.tau
        tube(s, [(bx + math.cos(a) * 9, by + math.sin(a) * 9, -1), (bx + math.cos(a) * 2, by + math.sin(a) * 2, 20)], 0.9, im, 'leg%d' % i, zmin=0)
    s.cylinder(bx, by, 7, 18, 22, flat_tone('#747a74', '#3a403c'), 'bowl',
               top_mat=lambda u, v, sh, f: '#1d1b22' if hsh(int(u), int(v), 714) < 0.35 else '#3a403c' if hsh(int(u), int(v), 715) < 0.6 else '#747a74')
    s.cylinder(bx, by, 4, 15, 18, flat_tone('#5c625c', '#3a403c'), 'bowlb')
    return s


def grass_mat(seed=0, dark=0.0):
    grass = ['#6e8a74', '#56705f', '#4a6454', '#3c5a4a', '#2c4438']
    def g(lam, xyz, sh, f):
        x, y, z = xyz
        lam += (hsh(int(x) // 2, int(y) // 2, seed) - 0.5) * 0.18 - dark
        return grass[0 if lam > 0.85 else 1 if lam > 0.62 else 2 if lam > 0.4 else 3 if lam > 0.18 else 4]
    return g


def lisle_barrow(lit=False):
    """The Lisle Barrow: a great old burial mound, kerbed with stones, a passage door of three
    huge stones in its south-west face, dark inside; the door stone that sealed it lies
    cracked on the grass beside it, pushed out from within. The doorway is the footprint's
    tile (1, 3)."""
    s = Scene2(4, 4, 64)
    s.dome(62, 60, 58, 56, 46, grass_mat(seed=721), 'mound')
    # kerb stones round the foot of the mound, set edge to edge, sunk and mossy
    kerb = ['#9aa39c', '#747a74', '#5c625c', '#3a403c']
    for i in range(34):
        a = (i / 34) * math.tau + 0.05
        x, y = 62 + math.cos(a) * 58, 60 + math.sin(a) * 56
        if 32 < x < 64 and y > 95:
            continue  # the door is here
        h = 4 + hsh(i, 722) * 4
        poly(s, slab(x, y, 9 + hsh(i, 732) * 2, 4.5, -1, h, a + math.pi / 2, seed=723 + i), stone_mat(kerb, moss=0.35, lichen=0.01, seed=724 + i),
             'kerb%d' % i, (x - 7, x + 7, y - 7, y + 7, 0, h + 1))
    # the door frame: two jambs and a lintel, the passage going dark into the mound
    dx0, dx1, fy = 41, 55, 108
    sm = stone_mat(moss=0.12, seed=725)
    poly(s, hewn(dx0 - 7, dx0, fy - 8, fy, -1, 30, cham=1.5, seed=726, jit=0.04), sm, 'jamb1', (dx0 - 8, dx0 + 1, fy - 9, fy + 1, 0, 31))
    poly(s, hewn(dx1, dx1 + 7, fy - 8, fy, -1, 30, cham=1.5, seed=727, jit=0.04), sm, 'jamb2', (dx1 - 1, dx1 + 8, fy - 9, fy + 1, 0, 31))
    poly(s, hewn(dx0 - 10, dx1 + 10, fy - 9, fy + 1, 30, 38, cham=1.5, seed=728, jit=0.03, top_cham=2), sm, 'lintel', (dx0 - 11, dx1 + 11, fy - 10, fy + 2, 29, 39))
    def dark(a, b):
        Y = fy - 0.5
        ss = 2 * Y + a
        x = Y + a
        z = ss / 2 - b
        if not (dx0 <= x <= dx1 and 0 <= z <= 30):
            return None
        return ss, x - dx0, z
    s.add(dark, lambda u, v, sh, f: '#2a2226' if v > 27 or u < 1.5 else DARK, LIT, 'hole', wb(dx0, dx1, fy, fy, 0, 30))
    # a bare, trodden patch before the door
    flat_m(s, 0.02, dx0 - 6, dx1 + 8, fy, 127, lambda u, v, sh, f: '#5e4e46' if hsh(u // 2, v // 2, 729) < 0.6 else '#4a3c34', 'tread',
           lambda x, y: ((x - (dx0 + dx1) / 2) / 13) ** 2 + ((y - 116) / 10) ** 2 < 1 - 0.3 * hsh(int(x) // 3, int(y) // 3, 730))
    # the door stone, cracked in two, lying on the grass east of the door where it fell
    ds = stone_mat(['#9aa39c', '#747a74', '#5c625c', '#3a403c'], moss=0.06, lichen=0.01, seed=731)
    poly(s, slab(73, 119, 15, 11, -1, 5, 0.12, cham=1.2, seed=732, jit=0.04, taper=0.02), ds, 'door1', (63, 83, 111, 127, 0, 6))
    poly(s, slab(88.5, 117.5, 12, 11, -1, 4, -0.18, cham=1.2, seed=733, jit=0.04, taper=0.02), ds, 'door2', (80, 97, 109, 126, 0, 5))
    return s


MIST = ['#dcdcd2', '#c8ccc6', '#b2b6ae', '#9aa39c']
BAYER = [[0.0, 0.5], [0.75, 0.25]]


def mist(lit=False):
    """A wall of grave-mist across the road: tall soft banks of pale vapour, dense and bright
    along the ground, rising in soft heads, thin streaks drifting off the top (about 60 px
    tall). Shaded softly, mostly by height, dithered between its greys."""
    s = Scene2(4, 1, 74)
    def puff_mat(lam, info, sh, name):
        x, y, z = info[0], info[1], info[2]
        t = 0.25 * (1 - lam) + 0.75 * min(1.0, z / 62) + (hsh(int(x) // 6, int(z) // 4, 741) - 0.5) * 0.25
        sx, sy = int(math.floor(x - y)), int(math.floor((x + y) / 2 - z))
        t = t * 3 + BAYER[sy % 2][sx % 2] - 0.5
        return MIST[max(0, min(3, int(t)))]
    rnd = lambda *a: hsh(742, *a)
    k = 0
    layers = ((9, (16, 9, 22), 8, 4), (9, (12, 8, 16), 30, 6), (7, (9, 7, 11), 46, 6))
    for layer, (n, (rx, ry, rz), z0, zs) in enumerate(layers):
        for i in range(n):
            x = 6 + (i + 0.5 + (rnd(layer, i, 1) - 0.5) * 0.7) * 118 / n
            y = 12 + rnd(layer, i, 2) * 8
            z = z0 + rnd(layer, i, 3) * zs
            f = 0.8 + rnd(layer, i, 4) * 0.4
            if layer == 2 and rnd(layer, i, 6) < 0.25:
                continue
            ell(s, (x, y, z), (rx * f, ry, rz * (0.8 + rnd(layer, i, 5) * 0.4)), puff_mat, 'puff%d' % k, zmin=0)
            k += 1
    for i in range(6):
        x = 4 + i * 23 + rnd(9, i, 1) * 8
        z = 60 + rnd(9, i, 2) * 9
        ell(s, (x, 15 + rnd(9, i, 3) * 6, z), (6 + rnd(9, i, 4) * 4, 3, 1.8), puff_mat, 'wisp%d' % i)
    return s


# ================================================================ the Weeping Bridge
OLD_STONE = {LIT: ['#b2b6ae', '#9aa39c', '#848c86', '#4e5650'], SHADE: ['#848c86', '#747a74', '#5c625c', '#3a403c'], TOP: ['#c8ccc6', '#b2b6ae', '#9aa39c', '#5c625c']}


def mossy(base, amount=0.2, seed=0, top_only=False):
    """Moss creeping over a stone material: on tops, and in patches low on the walls."""
    def f(u, v, sh, face):
        m = hsh(u // 4, v // 3, seed)
        on = (sh == TOP and m < amount * 2.5) or (not top_only and sh != TOP and m < amount * (1.3 if v < 6 else 0.4))
        if on and hsh(u, v, seed + 1) < 0.75:
            return MOSS[1 if sh == TOP else 2] if hsh(u, v, seed + 2) < 0.6 else MOSS[0 if sh == TOP else 3]
        return base(u, v, sh, face)
    return f


def bridge_parapet(lit=False):
    """An old stone parapet running along y, the side of the Weeping Bridge (whose deck runs
    north to south): coursed stone, mossy coping stones on top, a pier at either end."""
    s = Scene2(1, 5, 40)
    st = mossy(stone(OLD_STONE, course=5, seed=761), 0.12, seed=762)
    cope = mossy(stone(OLD_STONE, course=6, seed=763), 0.35, seed=764)
    s.box(11, 21, 2, 158, 0, 18, st, 'wall')
    # coping: separate stones, a little proud of the wall, some shifted
    for i in range(13):
        y0 = 12 + i * 11
        dx = (hsh(i, 765) - 0.5) * 1.2
        s.box(9.5 + dx, 22.5 + dx, y0 + 0.4, y0 + 10.6, 18, 22, cope, 'cope%d' % i)
    for j, (y0, y1) in enumerate(((0, 12), (148, 160))):
        s.box(8, 24, y0, y1, 0, 26, st, 'pier%d' % j)
        s.pyramid(8, 24, y0, y1, 26, 31, cope, 'cap%d' % j, ov=1)
    return s


def bridge_arch_core(axis='y'):
    """The face of the old stone bridge's arch seen over dark water: a cart-wide arch springing
    from both banks, voussoirs round it, the vault going back under the deck in shadow,
    the deck's edge and its coping on top. axis 'y' (5×1): the face looks south-west (+y)
    and the arch spans along x. axis 'x' (1×5): the face looks south-east (+x) and the arch
    spans along y, as it would under a deck running north to south. Not solid: it stands
    over the river."""
    def make(lit=False):
        Lx = 160
        dep = 28  # the bridge's width, back from the face
        s = Scene2(5, 1, 64) if axis == 'y' else Scene2(1, 5, 64)
        # map (along, back, z) -> world; `back` 0 at the face, growing away from the viewer
        if axis == 'y':
            W = lambda a, c, z: (a, 30 - c, z)
        else:
            W = lambda a, c, z: (30 - c, Lx - a, z)
        xc, half, rise, deck = 80, 50, 34, 46
        def in_arch(a, z):
            return z < rise * math.sqrt(max(0.0, 1 - ((a - xc) / half) ** 2))
        st = stone(OLD_STONE, course=6, seed=771)
        def face(u, v, sh, f):
            a = u if axis == 'y' else u
            # voussoirs: a ring of wedge stones round the opening
            dx, dz = (a - xc) / half, v / rise
            r = math.hypot(dx, dz)
            if 1.0 <= r < 1.0 + 7 / rise and v > 0:
                ang = math.atan2(dz, dx)
                k = int(ang / math.pi * 17)
                edge = abs(ang / math.pi * 17 - k - 0.5) > 0.42 or r > 1.0 + 6.2 / rise
                t = OLD_STONE[sh]
                return t[3] if edge else t[0] if hsh(k, 772) < 0.4 else t[1]
            if v > deck - 4:
                return OLD_STONE[sh][2] if v < deck - 3 else st(u, v, sh, f)
            return st(u, v, sh, f)
        if axis == 'y':
            s.wall_y(30, 0, Lx, -2, deck, mossy(face, 0.1, seed=773), 'face')
        else:
            s.wall_x(30, 0, Lx, -2, deck, mossy(face, 0.1, seed=773), 'face')
        masked(s, lambda u, v: not in_arch(u, v))
        # the vault under the deck, in shadow, seen through the arch
        A = 1 / half ** 2
        C = 1 / rise ** 2
        def vault(a_, b_):
            # points along the view ray: world (s+a)/2, (s-a)/2, s/2-b; solve the elliptic
            # cylinder ((along - xc)/half)^2 + (z/rise)^2 = 1 for the far (exit) root
            if axis == 'y':
                # along = x = (s + a_) / 2
                p, q = a_ / 2 - xc, -b_
            else:
                # along = Lx - y = Lx - (s - a_) / 2
                p, q = Lx + a_ / 2 - xc, -b_
            sa = 0.5 if axis == 'y' else -0.5
            # (sa s + p)^2 A + (s/2 + q)^2 C = 1
            AA = sa * sa * A + 0.25 * C
            BB = 2 * sa * p * A + q * C
            CC = p * p * A + q * q * C - 1
            d = BB * BB - 4 * AA * CC
            if d < 0:
                return None
            sv = (-BB - math.sqrt(d)) / (2 * AA)
            x, y, z = (sv + a_) / 2, (sv - a_) / 2, sv / 2 - b_
            back = (30 - y) if axis == 'y' else (30 - x)
            if not (0 <= back <= dep) or z < 0:
                return None
            along = x if axis == 'y' else Lx - y
            return sv, along, z
        def vm(u, v, sh, f):
            ring = int(v // 6)
            return '#3a403c' if hsh(int(u) // 8, ring, 774) < 0.3 else '#2e3840' if v > 6 else '#1d1b22'
        s.add(vault, vm, SHADE, 'vault')
        # dark water under the bridge
        def under(x, y):
            a = x if axis == 'y' else Lx - y
            c = (30 - y) if axis == 'y' else (30 - x)
            return 0 <= c <= dep and abs(a - xc) < half
        if axis == 'y':
            flat_m(s, 0.05, xc - half, xc + half, 2, 30, lambda u, v, sh, f: DARK if hsh(u // 3, v, 775) < 0.8 else '#2e3840', 'shadow', under)
        else:
            flat_m(s, 0.05, 2, 30, Lx - xc - half, Lx - xc + half, lambda u, v, sh, f: DARK if hsh(u, v // 3, 775) < 0.8 else '#2e3840', 'shadow', under)
        # the deck's edge seen from above, and the parapet along it
        cope = mossy(stone(OLD_STONE, course=6, seed=776), 0.3, seed=777)
        if axis == 'y':
            s.box(0, Lx, 2, 30, deck, deck + 1, stone(OLD_STONE, course=8, seed=778), 'deck')
            s.box(0, Lx, 23, 30, deck + 1, deck + 12, mossy(stone(OLD_STONE, course=5, seed=779), 0.12, seed=780), 'para', top_mat=cope)
        else:
            s.box(2, 30, 0, Lx, deck, deck + 1, stone(OLD_STONE, course=8, seed=778), 'deck')
            s.box(23, 30, 0, Lx, deck + 1, deck + 12, mossy(stone(OLD_STONE, course=5, seed=779), 0.12, seed=780), 'para', top_mat=cope)
        return s
    return make


bridge_arch = bridge_arch_core('y')


bridge_arch_y = bridge_arch_core('x')


PROCLAMATION = [
    '.kkkkkkkkkkkk.',
    'kPPPPPPPPPPPPk',
    'kPnPPPPPPPPnPk',
    'kPPPdddddddPPk',
    'kPPPPPPPPPPPPk',
    'kPdddd.ddddPPk',
    'kPPPPPPPPPPPPk',
    'kPddd.dddd.dPk',
    'kPPPPPPPPPPPPk',
    'kPdddd.dddPPPk',
    'kPPPPPPPPPPPPk',
    'kPddd.ddddd.Pk',
    'kPPPPPPPPPPPPk',
    'kPdd.dddPPPPPk',
    'kPPPPPPPrRrPPk',
    'kPnPPPPPRrRPnk',
    'kPPPPPPPPrPPk.',
    '.kkkkkkkkkkk..',
]


def kings_post(lit=False):
    """The King's post at the south end of the bridge: a stout squared post with a little
    roof, a proclamation nailed to it under the King's seal."""
    s = Scene2(1, 1, 60)
    pm = planks({LIT: ['#7c6c58', '#6a5848', '#5e4e46', '#3a2e2a'], SHADE: ['#5e4e46', '#4e4038', '#4a3c34', '#2a2226'], TOP: ['#8c7c66', '#7c6c58', '#6a5848', '#4a3c34']}, width=10, seed=791)
    s.box(11, 21, 12, 22, 0, 46, pm, 'post')
    s.gable_x(9, 23, 10, 24, 46, 52, shingles(WOOD_SH, row=3, width=5, seed=792), pm, 'cap', ov=2)
    s.box(9, 23, 10, 24, 0, 3, stone(OLD_STONE, course=3, seed=793), 'foot')
    sprite(s, (9, 22.4, 18), (1, 0, 0), (0, 0, 1), PROCLAMATION,
           {'k': '#9a9280', 'P': '#e6e0d2', 'd': '#6e6656', 'n': '#3a403c', 'r': '#7a4a40', 'R': '#b87a68'}, 'notice')
    return s


def watchfire(lit=False):
    """Garrick's watch-fire on the north bank: a ring of stones round charred logs and ash,
    long cold."""
    s = Scene2(1, 1, 20)
    s.dome(16, 16, 9, 9, 1.5, lambda lam, xyz, sh, f: '#9aa39c' if lam > 0.75 else '#747a74' if hsh(int(xyz[0]), int(xyz[1]), 801) < 0.6 else '#5c625c', 'ash')
    cm = tube_mat(CHAR, cuts=(0.55, 0.1, -0.3), noise=0.3, seed=802)
    for i, (a, b) in enumerate((((9, 13, 2.5), (22, 19, 3.5)), ((12, 22, 2.5), (21, 11, 4)), ((16, 9, 2), (17, 23, 2.8)))):
        tube(s, [a, b], 1.9 - i * 0.2, cm, 'log%d' % i, zmin=0)
    for i in range(10):
        a = (i / 10) * math.tau + 0.2
        x, y = 16 + math.cos(a) * 11.5, 16 + math.sin(a) * 11.5
        s.sphere(x, y, 1.2, 2.6 + hsh(i, 803) * 0.8, STONE_T, 'st%d' % i, squash=0.8, seed=i)
    return s


def guard_leanto(lit=False):
    """A soldier's lean-to of old grey planks on the north bank: a plank back wall and a plank
    roof sloping toward the viewer on two posts, its east end boarded, a bedroll and a
    helmet inside."""
    s = Scene2(2, 1, 44)
    gw = planks(GREY_WOOD, width=5, seed=811)
    gwh = planks(GREY_WOOD, width=5, vertical=False, seed=812)
    # back wall (its inner face, in shadow), a bedroll on the ground, a helmet on a peg
    inner = lambda u, v, sh, f: '#2a2226' if int(u) % 5 == 4 else '#4a3c34' if v > 14 else '#3a2e2a'
    s.wall_y(4, 4, 60, 0, 40, inner, 'back')
    ell(s, (26, 12, 1), (13, 5, 3.5), shaded(['#8a98a0', '#5e6e76', '#46545c', '#2e3840'], noise=0.2, seed=813), 'bedroll', zmin=0)
    s.sphere(46, 6.5, 18, 3.2, ['#9aa39c', '#747a74', '#5c625c', '#3a403c'], 'helm', squash=0.8, seed=2)
    # the boarded east end, a board missing
    s.wall_x(60, 4, 26, 0, 40, gwh, 'east', zmax=lambda y: 40 - (y - 4) * 17 / 22)
    masked(s, lambda u, v: not (12 < v < 17 and u < 12))
    # posts and the roof
    for x in (5, 57):
        s.box(x, x + 3, 24, 27, 0, 23, post_mat, 'post%d' % x)
    s.box(3, 61, 24, 27, 20, 23, post_mat, 'beam')
    def roof(u, v, sh, f):
        if int(u) // 6 == 4 and v > 12:
            return None
        return gw(u, v, sh, f)
    s.shed(1, 63, 1, 30, 42, 20, gw, 'roof')
    masked(s, lambda u, v: not (24 <= u < 30 and v > 14) and not (42 <= u < 47 and v < 9))
    # a spear leaning on the front post
    tube(s, [(62, 28, 0), (64, 31, 40)], 0.7, tube_mat(POLE), 'spear')
    rcone(s, (64, 31, 40), (64.3, 31.4, 46), 1.1, 0.3, tube_mat(IRON[:4]), 'spearhead')
    return s


VINE = ['#8a7e94', '#6e6078', '#463b50', '#2e2632', '#1d1b22', '#1d1b22']


def vines(lit=False):
    """Black vines as thick as a man choking the road north: smooth and glossy, coiling over
    and round each other, knotted, curling tendrils at their ends. No thorns."""
    s = Scene2(4, 1, 72)
    base = tube_mat(VINE[1:], cuts=(0.85, 0.55, 0.15, -0.3), gloss=VINE[0])
    def gm(lam, info, sh, name):
        x, y, z, nx, ny, nz, along, ang, rad, data = info
        # a slow twist of fibres round the vine, a crease every so often
        u = ang * rad + along * 0.45
        if int(u) % 10 == 0 or int(along) % 17 == 0:
            lam -= 0.35
        return base(lam, info, sh, name)
    xs = [x * 4 + 4 for x in range(32)]
    A = [(x, 18 + 6 * math.sin(x * 0.06), 6.5 + 5 * max(0, math.sin(x * 0.09 + 1))) for x in xs]
    tube(s, A, 6.5, gm, 'A', zmin=0)
    B = [(x, 13 + 7 * math.sin(x * 0.05 + 2), 5 + 36 * max(0, math.sin(x * 0.055 + 0.3)) ** 0.8) for x in xs]
    tube(s, B, 5.5, gm, 'B', zmin=0)
    C = [(x, 20 + 6 * math.sin(x * 0.07 + 4), 5 + 20 * max(0, math.sin(x * 0.06 + 3.6)) ** 0.8) for x in xs]
    tube(s, C, 5, gm, 'C', zmin=0)
    E = [(x, 22 + 5 * math.sin(x * 0.045 + 1), 4 + 42 * max(0, math.sin(x * 0.042 - 1.2)) ** 0.7) for x in xs]
    tube(s, E, 5.5, gm, 'E', zmin=0)
    # a vine coiling round the low one
    D = []
    for i in range(40):
        x = 30 + i * 1.6
        ax, ay, az = x, 18 + 6 * math.sin(x * 0.06), 6.5 + 5 * max(0, math.sin(x * 0.09 + 1))
        D.append((x, ay + 9 * math.cos(x * 0.24), az + 9 * math.sin(x * 0.24) + 2))
    tube(s, D, 3.4, gm, 'D', zmin=0)
    # knots where they meet
    for i, (x, y, z, r) in enumerate(((22, 15, 12, 8), (98, 17, 14, 9))):
        ell(s, (x, y, z), (r * 1.2, r, r * 0.9), shaded(VINE[1:], cuts=(0.75, 0.4, 0.0, -0.4), noise=0.15, seed=581 + i), 'knot%d' % i, zmin=0)
    # tendrils rising and curling
    for i, (x0, y0, h, turn) in enumerate(((12, 16, 50, 1), (52, 20, 58, -1), (84, 12, 46, 1), (116, 18, 54, -1))):
        pts = [(x0, y0, 6)]
        for j in range(1, 13):
            t = j / 12
            z = 6 + h * min(1, t * 1.25)
            if t > 0.75:
                q = (t - 0.75) * 4 * math.tau * 0.9
                pts.append((x0 + turn * (5 - 5 * math.cos(q)) * (1.2 - t), y0 - 2, z - 5 * math.sin(q) * (1.2 - t) * 1.3))
            else:
                pts.append((x0 + turn * 4 * math.sin(t * 5), y0 + 2 * math.sin(t * 7), z))
        tube(s, pts, [3.2 - 2.4 * j / 12 for j in range(13)], gm, 'tendril%d' % i, zmin=0)
    return s


# ================================================================ interiors (Heron Lodge, the Lisle Barrow)
def dark_stone(seed):
    return stone(DARK_ST, course=5, seed=seed)


def hearth(fire=False):
    """A big stone hearth against the wall of a dark stone room (Heron Lodge, the barrow): a
    chimney breast up to the wall's full height, a wide firebox under a stone lintel and an
    oak mantel beam carved with names, a raised hearth stone. Cold: ash and charred logs. Lit:
    a fire burning, the firebox glowing."""
    def make(lit=False):
        s = Scene2(2, 1, 76)
        ds = dark_stone(831)
        x0, x1, yb, yf, H = 4, 60, 0, 16, 72
        fx0, fx1, fh, fy = 14, 50, 24, 4   # the firebox opening and its back
        top = lambda u, v, sh, f: '#38444c' if hsh(u, v, 832) < 0.7 else '#2e3840'
        s.wall_y(yf, x0, x1, 0, H, ds, 'breast.y')
        masked(s, lambda u, v: not (fx0 - x0 <= u <= fx1 - x0 and v <= fh))
        s.wall_x(x1, yb, yf, 0, H, ds, 'breast.x')
        s.flat(H, x0, x1, yb, yf, top, 'breast.top')
        # inside the firebox: soot-black, or lit by the fire
        if fire:
            back = lambda u, v, sh, f: '#b8673a' if v < 6 and hsh(u, v, 833) < 0.5 else '#7a4a40' if v < 12 else '#5e3a36' if v < 18 else '#3a2226'
            side = lambda u, v, sh, f: '#9a5a4a' if v < 8 else '#5e3a36' if v < 16 else '#3a2226'
        else:
            back = lambda u, v, sh, f: '#2a2226' if hsh(u // 2, v // 2, 834) < 0.3 else DARK
            side = lambda u, v, sh, f: '#2a2226'
        s.wall_y(fy, fx0, fx1, 0, fh, back, 'fb.back')
        s.wall_x(fx0, fy, yf, 0, fh, side, 'fb.side')
        s.flat(0.5, fx0, fx1, fy, yf, lambda u, v, sh, f: '#3a403c' if hsh(u, v, 835) < 0.5 else '#5c625c', 'fb.floor')
        # the lintel and the mantel beam with the roll of names cut in it
        s.box(fx0 - 3, fx1 + 3, yf, yf + 1, fh, fh + 5, dark_stone(836), 'lintel')
        beam = {LIT: ['#6a5848', '#5e4e46', '#3a2e2a'], SHADE: ['#4a3c34', '#3a2e2a', '#2a2226'], TOP: ['#7c6c58', '#6a5848', '#3a2e2a']}
        def bm(u, v, sh, f):
            if sh == LIT and 1 <= v <= 3 and 2 < u < 54 and int(u) % 7 not in (0, 6) and hsh(int(u), int(v), 837) < 0.6:
                return '#2a2226'  # the names
            return beam[sh][0 if v >= 4 else 1]
        s.box(x0 - 2, x1 + 2, yf, yf + 4, fh + 5, fh + 10, bm, 'mantel')
        # the raised hearth stone
        s.box(x0 + 2, x1 - 2, yf, 30, 0, 3, stone(DARK_ST, course=3, seed=838), 'hearthstone', top_mat=lambda u, v, sh, f: '#5c625c' if (int(u) // 9 + int(v) // 7) % 2 else '#4e5650')
        # fire-dogs and logs
        im = tube_mat(IRON[1:], cuts=(0.4, -0.1))
        for x in (22, 42):
            tube(s, [(x, 6, 0.5), (x, 14, 0.5), (x, 15, 5)], 0.8, im, 'dog%d' % x)
        if fire:
            lm = tube_mat(['#b8673a', '#7a4a40', '#3a2226', '#1d1b22'], cuts=(0.5, 0.05, -0.3))
        else:
            lm = tube_mat(CHAR, cuts=(0.55, 0.1, -0.3), noise=0.3, seed=839)
        tube(s, [(18, 9, 3), (46, 10, 3)], 2.6, lm, 'log0')
        tube(s, [(20, 12, 7), (44, 8, 6)], 2.2, lm, 'log1')
        if fire:
            flame = [
                '......Y.........',
                '.....YY....Y....',
                '.....YO...YY....',
                '....YOO..YOY..Y.',
                '...YOOY..YOOY.Y.',
                '..YOOYY.YOOOY.YO',
                '..YOYYOYOYYOYYOO',
                '.YOOYWYOYOWYOYOR',
                '.YOYWWYYOWWYOOOR',
                'YOOYWWWYYWWWYOR.',
                'ROOYWWWWWWWYOOR.',
                '.ROOYYWWWWYYOR..',
                '..RROOYYYYOORR..',
            ]
            pal = {'W': FIRE[0], 'Y': FIRE[1], 'O': FIRE[2], 'R': FIRE[3]}
            sprite(s, (24, 11, 4), (1, 0, 0), (0, 0, 1.4), flame, pal, 'flame')
            sprite(s, (21, 8, 3), (0.9, 0, 0), (0, 0, 1.1), flame, pal, 'flame2')
            s.flat(1, fx0 + 2, fx1 - 2, fy + 1, yf - 1, lambda u, v, sh, f: FIRE[1] if hsh(u, v, 840) < 0.3 else FIRE[3], 'embers')
        else:
            s.dome(32, 10, 14, 5, 1.5, lambda lam, xyz, sh, f: '#9aa39c' if lam > 0.7 else '#747a74', 'ash')
        return s
    return make


hearth_cold = hearth(False)


hearth_lit = hearth(True)


def bunks(lit=False):
    """Two-high wooden bunks against the wall, straw ticks and grey blankets, a ladder."""
    s = Scene2(2, 1, 52)
    wood = {LIT: ['#8c7c66', '#6a5848'], SHADE: ['#5e4e46', '#4a3c34'], TOP: ['#a0907a', '#7c6c58']}
    wm = lambda u, v, sh, f: wood[sh][0 if u < 1 or v >= 1 else 1]
    for x in (4, 54):
        for y in (4, 24):
            s.box(x, x + 3, y, y + 3, 0, 46, wm, 'post%d%d' % (x, y))
    tick = {LIT: ['#c8c0aa', '#a8987e'], SHADE: ['#9a9280', '#7c6c58'], TOP: ['#e0d6c4', '#c8c0aa']}
    tk = lambda u, v, sh, f: tick[sh][1 if (int(u) % 9 == 0) else 0]
    blanket = {LIT: ['#5e6e76', '#46545c'], SHADE: ['#46545c', '#38444c'], TOP: ['#6e7e86', '#5e6e76']}
    bl = lambda u, v, sh, f: blanket[sh][1 if int(u) % 6 == 0 else 0]
    for i, z in enumerate((8, 30)):
        s.box(4, 57, 4, 27, z, z + 3, planks(WOOD_SH, width=4, vertical=False, seed=851 + i), 'frame%d' % i)
        s.box(6, 55, 5, 26, z + 3, z + 6, tk, 'tick%d' % i)
        s.box(28 + i * 6, 54, 6, 25, z + 6, z + 7.5, bl, 'blanket%d' % i)
        s.sphere(12, 15, z + 7, 4, ['#e0d6c4', '#c8c0aa', '#a8987e', '#7c6c58'], 'pillow%d' % i, squash=0.5, seed=i)
    # the ladder at the east end
    for y in (8, 20):
        s.box(58, 60, y, y + 2, 0, 44, wm, 'rail%d' % y)
    for z in range(6, 44, 7):
        s.box(58.5, 59.5, 8, 22, z, z + 1.5, wm, 'rung%d' % z)
    return s


def niche(lit=False):
    """A burial niche in the barrow's wall: a recess in the dark stone, an old body lying in it,
    bones showing through rotten furs, the skull turned toward you."""
    s = Scene2(1, 1, 76)
    ds = dark_stone(861)
    top = lambda u, v, sh, f: '#38444c' if hsh(u, v, 862) < 0.7 else '#2e3840'
    nz0, nz1, nback = 12, 32, 9
    s.wall_y(32, 0, 32, 0, 72, ds, 'w.y')
    masked(s, lambda u, v: not (2 <= u <= 30 and nz0 <= v <= nz1))
    s.wall_x(32, 0, 32, 0, 72, ds, 'w.x')
    s.flat(72, 0, 32, 0, 32, top, 'w.top')
    # the recess
    s.wall_y(nback, 2, 30, nz0, nz1, lambda u, v, sh, f: '#1d1b22' if hsh(u // 2, v // 2, 863) < 0.6 else '#2e3840', 'n.back')
    s.wall_x(2, nback, 32, nz0, nz1, lambda u, v, sh, f: '#2e3840' if v - nz0 < 14 else '#3a403c', 'n.side')
    s.flat(nz0, 2, 30, nback, 32, lambda u, v, sh, f: '#3a403c' if hsh(u, v, 864) < 0.6 else '#2e3840', 'n.floor')
    # rotten furs over the body
    fur = shaded(['#6e6656', '#5e4e46', '#4a3c34', '#2a2226'], cuts=(0.55, 0.2, -0.2), noise=0.5, seed=865)
    ell(s, (17, 20, nz0 + 1), (9, 6, 3.5), fur, 'fur', zmin=nz0)
    ell(s, (24, 22, nz0 + 1), (5, 5, 2.5), fur, 'fur2', zmin=nz0)
    # the skull at the west end, ribs showing through the fur, an arm bone, a foot
    s.sphere(6.5, 21, nz0 + 3.2, 3.3, BONE, 'skull', squash=0.95, seed=6)
    def eyes(img, ox, oy, prev=None):
        px = img.load()
        x, y = s.to_screen(6.5 + 2.4, 21 + 2.4, nz0 + 3.6)
        for dx, dy in ((-1, 0), (1, 0)):
            px[x + dx, y + dy] = (0x2a, 0x22, 0x26, 255)
        px[x, y + 2] = (0x6e, 0x66, 0x56, 255)
    s.extra = eyes
    for i in range(4):
        x = 12 + i * 2.6
        tube(s, [(x, 17, nz0 + 3.8), (x + 0.6, 24.5, nz0 + 2.6)], 0.6, bone_mat, 'rib%d' % i)
    tube(s, [(11, 25, nz0 + 1), (19, 27, nz0 + 1.2)], 0.8, bone_mat, 'arm')
    tube(s, [(26, 19, nz0 + 1), (29, 20, nz0 + 1)], 0.8, bone_mat, 'foot')
    return s


def stone_seat(lit=False):
    """The Thane's seat at the end of the barrow's round hall: a rough-hewn stone throne on a
    low step, a spiral cut in its high back."""
    s = Scene2(2, 2, 66)
    sm = stone_mat(['#9aa39c', '#747a74', '#5c625c', '#2e3840'], moss=0.03, lichen=0.008, seed=871)
    step = stone_mat(['#747a74', '#5c625c', '#4e5650', '#2e3840'], moss=0.0, lichen=0.004, seed=872)
    poly(s, hewn(2, 62, 2, 54, -1, 5, cham=2, seed=873, jit=0.02, top_cham=1.5), step, 'step', (1, 63, 1, 55, 0, 6))
    SPIRAL = [
        '..kkkk..',
        '.k....k.',
        'k..kk..k',
        'k.k..k.k',
        'k.k.k..k',
        'k..k..k.',
        '.k...k..',
        '..kkk...',
    ]
    poly(s, hewn(16, 48, 4, 12, 4, 58, cham=2.5, taper=0.03, top_tilt=(0, 0), seed=874, jit=0.04, top_cham=5),
         stone_mat(['#9aa39c', '#747a74', '#5c625c', '#2e3840'], moss=0.03, lichen=0.008, seed=875, face_decal={2: (28, 38, SPIRAL, {'k': '#2e3840'}, 'x')}), 'back', (15, 49, 3, 13, 4, 59))
    poly(s, hewn(18, 46, 11, 30, 4, 21, cham=2, seed=876, jit=0.04, top_cham=1.5), sm, 'seat', (17, 47, 10, 31, 4, 22))
    for i, x in enumerate((12, 46)):
        poly(s, hewn(x, x + 7, 10, 31, 4, 32, cham=2, seed=877 + i, jit=0.05, top_cham=2.5), sm, 'arm%d' % i, (x - 1, x + 8, 9, 32, 4, 33))
    return s


# ================================================================ registry
BUILDINGS2 = {
    # the Weepwood and Kilnholt
    'leanto': leanto,
    'drying_rack': drying_rack,
    'hut': hut1,
    'hut2': hut2,
    'sawpit': sawpit,
    'long_table': long_table,
    'thorn_tunnel': thorn_tunnel,
    'fallen_willow': fallen_willow,
    'spikes_s': spikes_s,
    'spikes_m': spikes_m,
    'spikes_l': spikes_l,
    'thicket': thicket,
    'webbed_willow': webbed_willow,
    'mound_grave': mound_grave,
    'standing_stone': standing_stone,
    'boundary_stone': boundary_stone,
    # the King's Chase
    'hunting_lodge': hunting_lodge,
    'kennels': kennels,
    'gallows_willow': gallows_willow,
    'goblin_tent': goblin_tent,
    'wolf_pen': wolf_pen,
    'goblin_wall': goblin_wall,
    # Heron Reach
    'heron_lodge': heron_lodge,
    'outpost': outpost,
    'lisle_barrow': lisle_barrow,
    'mist': mist,
    # the Weeping Bridge
    'bridge_parapet': bridge_parapet,
    'bridge_arch': bridge_arch,
    'bridge_arch_y': bridge_arch_y,
    'great_willow': great_willow,
    'kings_post': kings_post,
    'watchfire': watchfire,
    'guard_leanto': guard_leanto,
    'vines': vines,
    # interiors
    'hearth_cold': hearth_cold,
    'hearth_lit': hearth_lit,
    'bunks': bunks,
    'niche': niche,
    'stone_seat': stone_seat,
}

PROP_SIZE2 = {
    'leanto': (2, 1), 'drying_rack': (1, 1), 'hut': (3, 2), 'hut2': (3, 2), 'sawpit': (2, 2), 'long_table': (3, 1),
    'thorn_tunnel': (3, 2), 'fallen_willow': (4, 1), 'spikes_s': (1, 1), 'spikes_m': (1, 1), 'spikes_l': (1, 1),
    'thicket': (1, 1), 'webbed_willow': (3, 3), 'mound_grave': (1, 1), 'standing_stone': (1, 1), 'boundary_stone': (1, 1),
    'hunting_lodge': (5, 3), 'kennels': (3, 2), 'gallows_willow': (3, 3), 'goblin_tent': (2, 2), 'wolf_pen': (2, 2),
    'goblin_wall': (4, 1),
    'heron_lodge': (4, 3), 'outpost': (2, 2), 'lisle_barrow': (4, 4), 'mist': (4, 1),
    'bridge_parapet': (1, 5), 'bridge_arch': (5, 1), 'bridge_arch_y': (1, 5), 'great_willow': (4, 4), 'kings_post': (1, 1),
    'watchfire': (1, 1), 'guard_leanto': (2, 1), 'vines': (4, 1),
    'hearth_cold': (2, 1), 'hearth_lit': (2, 1), 'bunks': (2, 1), 'niche': (1, 1), 'stone_seat': (2, 2),
}

# props that aren't solid all over ('#' solid, '.' free), as data/props.ts `solid`
SOLID2 = {
    # the west foot is a mass of thorns; you walk beneath the arch on its east side
    'thorn_tunnel': ['#..', '#..'],
    # trees: the trunk alone blocks
    'webbed_willow': ['...', '.#.', '...'],
    'gallows_willow': ['...', '.#.', '...'],
    'great_willow': ['....', '.##.', '.##.', '....'],
    # the guards stand in the open corner by the brazier
    'outpost': ['##', '#.'],
    # the barrow's doorway (column 1 of the last row) is left open: an exit into it stands there
    'lisle_barrow': ['####', '####', '####', '#.##'],
    # it stands over the river
    'bridge_arch': ['.....'],
    'bridge_arch_y': ['.', '.', '.', '.', '.'],
    # the throne blocks; its low step in front can be stood on
    'stone_seat': ['##', '..'],
}

# big trees: the trunk's tile, which alone sorts against what walks round it
CORE2 = {
    'webbed_willow': (1, 1),
    'gallows_willow': (1, 1),
    'great_willow': (1, 1),
}

# the ones whose windows light up at night
LIT2 = ('hut', 'hut2', 'heron_lodge')

SHEET_ROWS = [
    ['leanto', 'drying_rack', 'hut', 'hut2', 'sawpit', 'long_table', 'mound_grave', 'standing_stone', 'boundary_stone'],
    ['thorn_tunnel', 'fallen_willow', 'spikes_s', 'spikes_m', 'spikes_l', 'thicket', 'webbed_willow'],
    ['hunting_lodge', 'kennels', 'gallows_willow', 'goblin_tent', 'wolf_pen', 'goblin_wall'],
    ['heron_lodge', 'outpost', 'lisle_barrow', 'mist', 'kings_post', 'watchfire', 'guard_leanto'],
    ['bridge_parapet', 'bridge_arch', 'bridge_arch_y', 'great_willow', 'vines'],
    ['hearth_cold', 'hearth_lit', 'bunks', 'niche', 'stone_seat'],
]


def sheet(names=None, scale=3, gap=8):
    """The review sheet: each prop by day (and by night for the lit ones), outlined like the
    game draws them, in rows by region, magnified."""
    rows = [[n for n in r if n in names] for r in SHEET_ROWS] if names else SHEET_ROWS
    rows = [r for r in rows if r]
    if names:
        extra = [n for n in names if not any(n in r for r in SHEET_ROWS)]
        if extra:
            rows.append(extra)
    strips = []
    for r in rows:
        imgs = []
        for n in r:
            imgs.append(outline(BUILDINGS2[n]().render()))
            if n in LIT2:
                imgs.append(outline(BUILDINGS2[n](True).render()))
        strips.append(magnify(imgs, scale, gap=gap))
    W = max(st.width for st in strips)
    H = sum(st.height for st in strips)
    out = Image.new('RGBA', (W, H), (120, 150, 96, 255))
    y = 0
    for st in strips:
        out.alpha_composite(st, (0, y))
        y += st.height
    return out


if __name__ == '__main__':
    out = sys.argv[1]
    names = sys.argv[2:] or None
    sheet(names).save(out)
    print('ok')
