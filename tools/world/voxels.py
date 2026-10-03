"""Voxel models of the buildings and props, for the 3D views (src/phaser/view3d).

iso.py only ray-casts the faces the iso camera sees. Here every primitive a building is made
of (boxes, walls, gable and pyramid roofs, lean-tos, cylinders, spheres, mounds) is recorded
while buildings.py builds it, filled as a solid on a grid of one voxel per art pixel, and each
voxel face that shows to the air is coloured from that primitive's own material and decals,
exactly as the 2D art reads them. Faces the iso art never shows (back walls, the far roof
slope, the north side of a tower) reuse the front's material, read the same way round from
their own side, in the tones of a face turned from the light (lit from the south-west: the
south and west faces lit, the north and east faces shaded). A front wall and a side wall that
meet at a corner (a house's body) are filled as one box, so the house gets its back walls.

  python3 voxels.py                         write public/voxels.json
  python3 voxels.py preview out.png [name]  a turntable sheet: each model from four sides

The output: { name: { w, h, o: [ox, oy], n, pal: ['#rrggbb', ...], f: base64, lit?: base64 } }
where f is n faces of 5 bytes (x, y, z voxel index from o, direction 0..5 = +x -x +y -y +z -z,
palette index) and lit lists (uint32 face index, uint8 palette index) for the faces that
change colour at night (lit windows).
"""
import base64
import inspect
import json
import math
import os
import sys

import numpy as np

import iso
from iso import Scene, LIT, SHADE, TOP, hsh
import buildings
from buildings import BUILDINGS, ANIMS

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../public/voxels.json')
T = 32
PX, NX, PY, NY, PZ, NZ = range(6)
DIRS = [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)]
# painted in render/storyTrees.ts, not by the ray-caster: the 3D view stands their art up
SKIP = {'hollow_oak', 'willow'}

# ---------------------------------------------------------------- recording the primitives
KINDS = ('wall_x', 'wall_y', 'flat', 'box', 'gable_x', 'gable_y', 'pyramid', 'shed', 'cylinder', 'sphere', 'dome')


def _record(kind):
    orig = getattr(Scene, kind)
    sig = inspect.signature(orig)

    def rec(self, *a, **k):
        depth = self.__dict__.get('_rec', 0)
        n0 = len(self.surfs)
        self._rec = depth + 1
        try:
            r = orig(self, *a, **k)
        finally:
            self._rec = depth
        # only the outermost call: a box's walls and a gable's end wall belong to it
        if depth == 0:
            b = sig.bind(self, *a, **k)
            b.apply_defaults()
            args = dict(b.arguments)
            args.pop('self')
            self.__dict__.setdefault('prims', []).append((kind, args, n0, len(self.surfs)))
        return r
    setattr(Scene, kind, rec)


for _k in KINDS:
    _record(_k)

_disc = buildings.disc_x
_disc_sig = inspect.signature(_disc)


def _disc_rec(s, *a, **k):
    n0 = len(s.surfs)
    _disc(s, *a, **k)
    b = _disc_sig.bind(s, *a, **k)
    b.apply_defaults()
    args = dict(b.arguments)
    args.pop('s')
    s.__dict__.setdefault('prims', []).append(('disc_x', args, n0, len(s.surfs)))


buildings.disc_x = _disc_rec


# ---------------------------------------------------------------- voxelizing
class Model:
    """One building on a voxel grid: which primitive fills each voxel (the last one wins, as
    later primitives are the details: a chimney through the roof, a post over a wall)."""

    def __init__(self, s, pad=12):
        self.s = s
        self.ox = self.oy = -pad
        self.nx = s.w * T + 2 * pad
        self.ny = s.h * T + 2 * pad
        self.nz = s.top + 6
        self.x = (np.arange(self.nx) + self.ox + 0.5).reshape(-1, 1, 1)
        self.y = (np.arange(self.ny) + self.oy + 0.5).reshape(1, -1, 1)
        self.z = (np.arange(self.nz) + 0.5).reshape(1, 1, -1)
        self.owner = np.full((self.nx, self.ny, self.nz), -1, np.int32)
        self.colour = []  # per owner: f(x, y, z, d) -> '#rrggbb' or None

    def add(self, mask, colour):
        mask = np.broadcast_to(mask, self.owner.shape)
        self.owner[mask] = len(self.colour)
        self.colour.append(colour)

    def paint(self, name, mat, u, v, sh):
        """A material at face pixel (u, v), with the decals drawn on that face."""
        ui, vi = int(math.floor(u)), int(math.floor(v))
        col = None
        for u0, v0, rows, pal in self.s.decals.get(name, []):
            du, dv = ui - u0, vi - v0
            if 0 <= dv < len(rows):
                row = rows[len(rows) - 1 - dv]
                if 0 <= du < len(row) and row[du] != '.':
                    col = pal[row[du]]
        return col if col is not None else mat(ui, vi, sh, name)

    def box_mask(self, x0, x1, y0, y1, z0, z1):
        X, Y, Z = self.x, self.y, self.z
        return (X >= x0) & (X <= x1) & (Y >= y0) & (Y <= y1) & (Z >= z0) & (Z <= z1)

    # -- the primitives ------------------------------------------------
    def wall_x(self, X, y0, y1, z0, z1, mat, name, zmax=None):
        m = self.box_mask(X - 1, X, y0, y1, z0, z1)
        if zmax:
            m = m & (self.z <= np.vectorize(zmax)(self.y))
        P = self.paint

        def col(x, y, z, d):
            if d == NX:
                return P(name, mat, y - y0, z - z0, LIT)
            if d == PZ:
                return P(name, mat, y1 - y, z - z0, TOP)
            return P(name, mat, y1 - y, z - z0, SHADE)
        self.add(m, col)

    def wall_y(self, Y, x0, x1, z0, z1, mat, name, zmax=None):
        m = self.box_mask(x0, x1, Y - 1, Y, z0, z1)
        if zmax:
            m = m & (self.z <= np.vectorize(zmax)(self.x))
        P = self.paint

        def col(x, y, z, d):
            if d == NY:
                return P(name, mat, x1 - x, z - z0, SHADE)
            if d == PZ:
                return P(name, mat, x - x0, z - z0, TOP)
            return P(name, mat, x - x0, z - z0, LIT)
        self.add(m, col)

    def body(self, wy, wx):
        """A front wall (y) and a side wall (x) meeting at the south-east corner: fill the box
        between them, its back walls in the same materials."""
        x0, x1, y0, y1 = wy['x0'], wy['x1'], wx['y0'], wx['y1']
        z0, z1 = wy['z0'], min(wy['z1'], wx['z1'])
        P = self.paint

        def col(x, y, z, d):
            if d == PX:
                return P(wx['name'], wx['mat'], y1 - y, z - z0, SHADE)
            if d == NX:
                return P(wx['name'], wx['mat'], y - y0, z - z0, LIT)
            if d == NY:
                return P(wy['name'], wy['mat'], x1 - x, z - z0, SHADE)
            if d == PZ:
                return P(wy['name'], wy['mat'], x - x0, y1 - y, TOP)
            return P(wy['name'], wy['mat'], x - x0, z - z0, LIT)
        self.add(self.box_mask(x0, x1, y0, y1, z0, z1), col)

    def flat(self, Z, x0, x1, y0, y1, mat, name):
        P = self.paint

        def col(x, y, z, d):
            return P(name, mat, x - x0, y1 - y, TOP if d == PZ else SHADE)
        self.add(self.box_mask(x0, x1, y0, y1, Z - 1, Z), col)

    def box(self, x0, x1, y0, y1, z0, z1, mat, name, top_mat=None):
        P = self.paint

        def col(x, y, z, d):
            if d == PX:
                return P(name + '.x', mat, y1 - y, z - z0, SHADE)
            if d == NX:
                return P(name + '.x', mat, y - y0, z - z0, LIT)
            if d == PY:
                return P(name + '.y', mat, x - x0, z - z0, LIT)
            if d == NY:
                return P(name + '.y', mat, x1 - x, z - z0, SHADE)
            if d == PZ:
                return P(name + '.top', top_mat or mat, x - x0, y1 - y, TOP)
            return P(name + '.y', mat, x - x0, 0, SHADE)
        self.add(self.box_mask(x0, x1, y0, y1, z0, z1), col)

    def gable_x(self, x0, x1, y0, y1, ze, zr, roof, wall, name, ov=3, gx=None):
        ym = (y0 + y1) / 2
        k = (zr - ze) / ((y1 - y0) / 2)
        Y0, Y1, X0, X1 = y0 - ov, y1 + ov, x0 - ov, x1 + ov
        vs = 0.5 + k
        th = max(3, k + 1.5)
        X, Y, Z = self.x, self.y, self.z
        top = zr - k * np.abs(Y - ym)
        P = self.paint
        gxx = gx if gx is not None else x1

        def attic(x, y, z, d):
            if d == NX:
                return P(name + '.gable', wall, y - y0, z - ze, LIT)
            return P(name + '.gable', wall, y1 - y, z - ze, SHADE)
        self.add((X >= x0) & (X <= gxx) & (Y >= y0) & (Y <= y1) & (Z >= ze) & (Z <= top), attic)

        def slab(x, y, z, d):
            if d == PX:
                return '#3a2e2a'
            if d == NX:
                return '#4a3c34'
            if d == NZ:
                return '#2a2226'
            if y >= ym:
                return P(name + '.front', roof, x - X0, (Y1 - y) * vs, LIT)
            return P(name + '.back', roof, X1 - x, (y - Y0) * vs, SHADE)
        self.add((X >= X0) & (X <= X1) & (Y >= Y0) & (Y <= Y1) & (Z <= top) & (Z >= top - th), slab)

    def gable_y(self, x0, x1, y0, y1, ze, zr, roof, wall, name, ov=3, gy=None):
        xm = (x0 + x1) / 2
        k = (zr - ze) / ((x1 - x0) / 2)
        Y0, Y1, X0, X1 = y0 - ov, y1 + ov, x0 - ov, x1 + ov
        vs = 0.5 + k
        th = max(3, k + 1.5)
        X, Y, Z = self.x, self.y, self.z
        top = zr - k * np.abs(X - xm)
        P = self.paint
        gyy = gy if gy is not None else y1

        def attic(x, y, z, d):
            if d == NY:
                return P(name + '.gable', wall, x1 - x, z - ze, SHADE)
            return P(name + '.gable', wall, x - x0, z - ze, LIT)
        self.add((X >= x0) & (X <= x1) & (Y >= y0) & (Y <= gyy) & (Z >= ze) & (Z <= top), attic)

        def slab(x, y, z, d):
            if d == PY:
                return '#5e4e46'
            if d == NY:
                return '#4a3c34'
            if d == NZ:
                return '#2a2226'
            if x >= xm:
                return P(name + '.side', roof, Y1 - y, (X1 - x) * vs, SHADE)
            return P(name + '.back', roof, y - Y0, (x - X0) * vs, LIT)
        self.add((X >= X0) & (X <= X1) & (Y >= Y0) & (Y <= Y1) & (Z <= top) & (Z >= top - th), slab)

    def pyramid(self, x0, x1, y0, y1, ze, zr, roof, name, ov=2):
        xm, ym = (x0 + x1) / 2, (y0 + y1) / 2
        hx = (x1 - x0) / 2 + ov
        k = (zr - ze) / ((x1 - x0) / 2)
        vs = 0.5 + k
        X, Y, Z = self.x, self.y, self.z
        r = np.maximum(np.abs(X - xm), np.abs(Y - ym))
        surf = zr - k * r
        P = self.paint

        def col(x, y, z, d):
            if d == NZ:
                return '#2a2226'
            dx, dy = x - xm, y - ym
            if abs(dy) >= abs(dx):
                if dy >= 0:
                    return P(name + '.y', roof, x - (xm - hx), (ym + hx - y) * vs, LIT)
                return P(name + '.y', roof, xm + hx - x, (y - (ym - hx)) * vs, SHADE)
            if dx >= 0:
                return P(name + '.x', roof, ym + hx - y, (xm + hx - x) * vs, SHADE)
            return P(name + '.x', roof, y - (ym - hx), (x - (xm - hx)) * vs, LIT)
        self.add((r <= hx) & (Z <= surf) & (Z >= zr - k * hx - max(2, k + 1)), col)

    def shed(self, x0, x1, y0, y1, zt, zb, roof, name):
        k = (zt - zb) / (y1 - y0)
        vs = 0.5 + k
        X, Y, Z = self.x, self.y, self.z
        top = zt - (Y - y0) * k
        P = self.paint

        def col(x, y, z, d):
            tz = zt - (y - y0) * k
            if d == PX:
                return P(name + '.edge', roof, y1 - y, tz - z, SHADE)
            if d == NX:
                return P(name + '.edge', roof, y - y0, tz - z, LIT)
            return P(name, roof, x - x0, (y1 - y) * vs, SHADE if d == NZ else LIT)
        self.add((X >= x0) & (X <= x1) & (Y >= y0) & (Y <= y1) & (Z <= top) & (Z >= top - max(2, k + 1)), col)

    def cylinder(self, cx, cy, r, z0, z1, mat, name, top_mat=None, inner=None):
        X, Y, Z = self.x, self.y, self.z
        d2 = (X - cx) ** 2 + (Y - cy) ** 2
        m = (d2 <= r * r) & (Z >= z0) & (Z <= z1)
        if inner:
            m = m & ~((d2 < inner * inner) & (Z > z1 - 30))
        P = self.paint

        def col(x, y, z, d):
            if d == PZ:
                return P(name + '.top', top_mat or mat, x - cx + r, y - cy + r, TOP)
            ox, oy = x - cx, y - cy
            if inner and d < PZ and DIRS[d][0] * ox + DIRS[d][1] * oy < 0:
                # the inside of a well's shaft
                return '#1d1b22' if z < z1 - 3 else '#2e3840'
            ang = math.atan2(oy, ox)
            u = ((math.pi * 0.75 - ang) % (2 * math.pi)) * r
            sh = LIT if math.sin(ang) > math.cos(ang) else SHADE
            return P(name, mat, u, z - z0, SHADE if d == NZ else sh)
        self.add(m, col)

    def sphere(self, cx, cy, cz, r, tones, name, squash=1.0, seed=0, leafy=0.0):
        X, Y, Z = self.x, self.y, self.z
        m = ((X - cx) / r) ** 2 + ((Y - cy) / r) ** 2 + ((Z - cz) / (r * squash)) ** 2 <= 1
        # the same facets and light as iso.Scene.sphere
        l = (-0.5, 0.3, 0.81)
        j = 2.2

        def col(x, y, z, d):
            nx, ny, nz = (x - cx) / r, (y - cy) / r, (z - cz) / (r * squash * squash)
            n = (nx * nx + ny * ny + nz * nz) ** 0.5 or 1
            nx, ny, nz = nx / n, ny / n, nz / n
            qx, qy, qz = round(nx * j + hsh(seed, 1) - 0.5), round(ny * j + hsh(seed, 2) - 0.5), round(nz * j)
            qn = (qx * qx + qy * qy + qz * qz) ** 0.5 or 1
            lam = (qx * l[0] + qy * l[1] + qz * l[2]) / qn
            lam += (hsh(qx, qy, qz, seed) - 0.5) * 0.2
            if leafy:
                lam += (hsh(int(z * 3), int(lam * 40), seed) - 0.5) * leafy
            return tones[0 if lam > 0.75 else 1 if lam > 0.45 else 2 if lam > 0.1 else 3]
        self.add(m, col)

    def dome(self, cx, cy, rx, ry, h, mat, name):
        X, Y, Z = self.x, self.y, self.z
        m = Z <= h * (1 - ((X - cx) / rx) ** 2 - ((Y - cy) / ry) ** 2)
        ka, kb = h / (rx * rx), h / (ry * ry)

        def col(x, y, z, d):
            gx = -2 * ka * (x - cx)
            gy = -2 * kb * (y - cy)
            lam = 0.55 + 0.45 * gx - 0.35 * gy + 0.15 * (z / h)
            return mat(lam, (x, y, z), 'raw', name)
        self.add(m, col)

    def disc_x(self, X, cy, cz, mask, mat, name, sh=SHADE):
        Ys = (self.y - cy).reshape(-1, 1)
        Zs = (self.z - cz).reshape(1, -1)
        mm = np.vectorize(lambda a, b: bool(mask(a, b)))(Ys, Zs)
        m = (self.x >= X - 1) & (self.x <= X) & mm.reshape(1, self.ny, self.nz)

        def col(x, y, z, d):
            return mat(int(y), int(z), LIT if d == NX else sh, name)
        self.add(m, col)

    def loose(self, surf):
        """A surface appended by hand (a tent's open flap, a barrow's dark doorway): sample it
        through the iso camera and make each point a voxel of its colour."""
        hit, mat, sh0, name = surf
        s = self.s
        ox = s.h * T
        cells = {}
        for sy2 in range(0, s.H * 2):
            for sx2 in range(0, s.W * 2):
                a = sx2 / 2 + 0.25 - ox
                b = sy2 / 2 + 0.25 - s.top
                r = hit(a, b)
                if not r:
                    continue
                ss, u, v = r[0], r[1], r[2]
                sh = r[3] if len(r) > 3 else sh0
                x, y, z = (ss + a) / 2, (ss - a) / 2, ss / 2 - b
                i, j, k = int(math.floor(x - self.ox)), int(math.floor(y - self.oy)), int(math.floor(z))
                if not (0 <= i < self.nx and 0 <= j < self.ny and 0 <= k < self.nz):
                    continue
                col = mat(u, v, sh, name) if sh == 'raw' else self.paint(name, mat, u, v, sh)
                if col:
                    cells[(i, j, k)] = col
        if not cells:
            return
        idx = len(self.colour)
        for c in cells:
            self.owner[c] = idx
        self.colour.append(lambda x, y, z, d: cells.get((int(math.floor(x - self.ox)), int(math.floor(y - self.oy)), int(math.floor(z)))))

    # -- the whole building --------------------------------------------
    def build(self):
        s = self.s
        prims = s.__dict__.get('prims', [])
        owned = set()
        for _, _, n0, n1 in prims:
            owned.update(range(n0, n1))
        # pair each front wall with the side wall that meets it at the south-east corner
        wys = [a for kind, a, _, _ in prims if kind == 'wall_y']
        wxs = [a for kind, a, _, _ in prims if kind == 'wall_x']
        bodies = {}
        for wy in wys:
            for wx in wxs:
                if abs(wx['X'] - wy['x1']) < 0.01 and abs(wy['Y'] - wx['y1']) < 0.01 and wy['z0'] == wx['z0']:
                    bodies[id(wy)] = (wy, wx)
        for kind, args, _, _ in prims:
            if kind == 'wall_y' and id(args) in bodies:
                self.body(*bodies[id(args)])
            getattr(self, kind)(**args)
        for i, surf in enumerate(s.surfs):
            if i not in owned:
                self.loose(surf)
        return self

    def faces(self):
        """Every voxel face that shows to the air (not the undersides on the ground), coloured."""
        occ = self.owner >= 0
        out = []
        for d, (dx, dy, dz) in enumerate(DIRS):
            nb = np.zeros_like(occ)
            sx = slice(max(0, -dx), self.nx - max(0, dx))
            sy = slice(max(0, -dy), self.ny - max(0, dy))
            sz = slice(max(0, -dz), self.nz - max(0, dz))
            tx = slice(max(0, dx), self.nx - max(0, -dx))
            ty = slice(max(0, dy), self.ny - max(0, -dy))
            tz = slice(max(0, dz), self.nz - max(0, -dz))
            nb[sx, sy, sz] = occ[tx, ty, tz]
            ex = occ & ~nb
            if d == NZ:
                ex[:, :, 0] = False
            for i, j, k in zip(*np.nonzero(ex)):
                col = self.colour[self.owner[i, j, k]](i + self.ox + 0.5, j + self.oy + 0.5, k + 0.5, d)
                if col:
                    out.append((int(i), int(j), int(k), d, col))
        return out


def voxelize(make, lit=False):
    try:
        s = make(lit)
    except TypeError:
        s = make()
    return Model(s).build()


def models():
    """name -> (model, faces, lit faces or None); animations as name~frame."""
    out = {}
    for name, make in BUILDINGS.items():
        if name in SKIP:
            continue
        m = voxelize(make)
        f = m.faces()
        try:
            lf = voxelize(make, True).faces()
        except TypeError:
            lf = None
        out[name] = (m, f, lf if lf and lf != f else None)
    for name, (n, make) in ANIMS.items():
        for i in range(n):
            m = Model(make(i)).build()
            out['%s~%d' % (name, i)] = (m, m.faces(), None)
    return out


def emit():
    data = {}
    for name, (m, faces, lit) in models().items():
        pal, idx = [], {}

        def pi(c):
            if c not in idx:
                idx[c] = len(pal)
                pal.append(c)
            return idx[c]
        buf = bytearray()
        for i, j, k, d, c in faces:
            assert max(i, j, k) < 256, name
            buf += bytes((i, j, k, d, pi(c)))
        entry = {'w': m.s.w, 'h': m.s.h, 'o': [m.ox, m.oy], 'n': len(faces), 'pal': pal, 'f': base64.b64encode(bytes(buf)).decode()}
        if lit:
            # the same faces in the same order (lit only recolours): keep the ones that changed
            assert len(lit) == len(faces), name
            lb = bytearray()
            for n, (a, b) in enumerate(zip(faces, lit)):
                assert a[:4] == b[:4], name
                if a[4] != b[4]:
                    lb += n.to_bytes(4, 'little') + bytes((pi(b[4]),))
            if lb:
                entry['lit'] = base64.b64encode(bytes(lb)).decode()
        assert len(pal) < 256, name
        data[name] = entry
        print('%-14s %6d faces %3d colours%s' % (name, len(faces), len(pal), '  lit %d' % (len(entry.get('lit', '')) * 3 // 4 // 5) if 'lit' in entry else ''))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    print('wrote', os.path.normpath(OUT), os.path.getsize(OUT) // 1024, 'KB')


# ---------------------------------------------------------------- preview
SHADE_K = [0.86, 0.95, 0.95, 0.86, 1.0, 0.6]


def preview(out, names):
    """Each model from four sides (turned 90° at a time), in the game's 2:1 projection."""
    from PIL import Image, ImageDraw
    sheets = []
    for name in names:
        make = BUILDINGS[name]
        m = voxelize(make)
        faces = m.faces()
        cx = m.s.w * T / 2
        cy = m.s.h * T / 2
        row = []
        for turn in range(4):
            polys = []
            for i, j, k, d, col in faces:
                x, y, z = i + m.ox, j + m.oy, k
                # the face's corners: the voxel cube's corners on that side
                dx, dy, dz = DIRS[d]
                cs = []
                for a in (0, 1):
                    for b in (0, 1):
                        if dx:
                            p = (x + (dx > 0), y + a, z + (b if a == 0 else 1 - b))
                        elif dy:
                            p = (x + a, y + (dy > 0), z + (b if a == 0 else 1 - b))
                        else:
                            p = (x + a, y + (b if a == 0 else 1 - b), z + (dz > 0))
                        cs.append(p)
                # turn about the footprint's centre
                pts = []
                depth = 0
                for px, py, pz in cs:
                    rx, ry = px - cx, py - cy
                    for _ in range(turn):
                        rx, ry = -ry, rx
                    pts.append((rx - ry, (rx + ry) / 2 - pz))
                    depth += rx + ry + pz
                # back faces (pointing away from the camera after the turn) are culled
                ndx, ndy = dx, dy
                for _ in range(turn):
                    ndx, ndy = -ndy, ndx
                if ndx + ndy + dz < 0:
                    continue
                rgb = tuple(int(c * SHADE_K[d]) for c in iso.hexrgb(col))
                polys.append((depth, pts, rgb))
            polys.sort(key=lambda p: p[0])
            W = (m.s.w + m.s.h) * T + 64
            H = m.s.top + (m.s.w + m.s.h) * 16 + 64
            img = Image.new('RGB', (W * 2, H * 2), (120, 150, 96))
            dr = ImageDraw.Draw(img)
            for _, pts, rgb in polys:
                dr.polygon([((px + W / 2) * 2, (py + m.s.top + 24) * 2) for px, py in pts], fill=rgb)
            row.append(img)
        sheets.append(row)
    W = sum(max(r[i].width for r in sheets) for i in range(4))
    H = sum(r[0].height for r in sheets)
    out_img = Image.new('RGB', (W, H), (60, 70, 60))
    y = 0
    for r in sheets:
        x = 0
        for im in r:
            out_img.paste(im, (x, y))
            x += im.width
        y += r[0].height
    out_img.save(out)
    print('wrote', out)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'preview':
        preview(sys.argv[2], sys.argv[3:] or ['cottage'])
    else:
        emit()
