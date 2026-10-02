"""The buildings and big props of Act I, drawn with iso.py. Run to write a magnified review
sheet: python3 buildings.py out.png [name ...]"""
import sys
from iso import Scene, timber_frame, stone, plaster, planks, thatch, shingles, flat_tone, outline, magnify, LIT, SHADE, TOP

# ---------------------------------------------------------------- shared details
# Drawn straight in the Silhouette palette (the game's art); props are not recoloured.
WOOD = {'k': '#2a2226', 'x': '#4a3c34', 'w': '#6a5848', 'W': '#8c7c66', 'I': '#9aa39c', 'i': '#5c625c', 'G': '#c9a24e'}
GLASS = {'k': '#2a2226', 'x': '#4a3c34', 'w': '#6a5848', 'g': '#2e3840', 'G': '#46545c', 'h': '#8a98a0', 'f': '#b87a68', 'F': '#d8c070', 'l': '#56705f'}
# the same windows, lit from inside at night (light keeps its warmth)
GLASS_LIT = dict(GLASS, g='#e09a48', G='#f4c468', h='#fff0c0')

DOOR = [
    '...kkkkkk...',
    '..kxWWWWxk..',
    '.kxWwwwwWxk.',
    'kxWwWwwWwWxk',
    'kWwWwwwwWwWk',
    'kWwWwwwwWwWk',
    'kWwWwwwwWwWk',
    'kWwWwwwwWwWk',
    'kWxxxxxxxxWk',
    'kWwWwwwwWwWk',
    'kWwWwwwwWwWk',
    'kWwWwwwwWwWk',
    'kWwWwwwwWwWk',
    'kWwWwwwwWIWk',
    'kWwWwwwwWiWk',
    'kWwWwwwwWwWk',
    'kWwWwwwwWwWk',
    'kWwWwwwwWwWk',
    'kWwWwwwwWwWk',
    'kWxxxxxxxxWk',
    'kWwWwwwwWwWk',
    'kWwWwwwwWwWk',
    'kWwWwwwwWwWk',
    'kWwWwwwwWwWk',
    'kWwWwwwwWwWk',
    'kWwWwwwwWwWk',
    'kWwWwwwwWwWk',
    'kxxxxxxxxxxk',
]

WINDOW = [
    'kkkkkkkkkk',
    'kgGGkgGGhk',
    'kGgGkGgGhk',
    'kgGgkgGghk',
    'kkkkkkkkkk',
    'kgGGkgGGgk',
    'kGgGkGgGgk',
    'kgGgkgGggk',
    'kGgGkGgGgk',
    'kkkkkkkkkk',
    'xwwwwwwwwx',
]

# a window box of red and gold flowers
WINDOW_FLOWERS = WINDOW[:-1] + [
    'lflFlflFlf',
    'FlfllflFll',
    'wwwwwwwwww',
    'xxxxxxxxxx',
    '.x......x.',
]

SMALL_WINDOW = [
    'kkkkkkkk',
    'kgGhkGgk',
    'kGghkgGk',
    'kkkkkkkk',
    'kgGgkGgk',
    'kkkkkkkk',
    'xwwwwwwx',
]


def cottage(variant=0, lit=False):
    """A one-room village cottage: stone footing, timber-framed plaster walls, a steep thatch
    roof with its ridge along x, a stone chimney, the door on the lit side. 3×2 tiles."""
    s = Scene(3, 2, 118)
    gl = GLASS_LIT if lit else GLASS
    x0, x1, y0, y1 = 8, 88, 12, 54
    ze, zr = 46, 82
    L = x1 - x0
    if variant == 0:
        frame_y = timber_frame(posts=[0, 26, 52, L - 2], rails=[6, 43], braces=[(56, 8, 76, 42)])
    else:
        frame_y = timber_frame(posts=[0, 30, L - 2], rails=[6, 43], braces=[(2, 8, 26, 42)])
    frame_x = timber_frame(posts=[0, y1 - y0 - 2], rails=[6, 43])
    s.wall_y(y1, x0, x1, 0, ze, frame_y, 'body.y')
    s.wall_x(x1, y0, y1, 0, ze, frame_x, 'body.x')
    # stone footing, a hand high
    s.wall_y(y1 + 1, x0 - 1, x1 + 1, 0, 6, stone(course=3, seed=11), 'foot.y')
    s.wall_x(x1 + 1, y0 - 1, y1 + 1, 0, 6, stone(course=3, seed=12), 'foot.x')
    s.gable_x(x0, x1, y0, y1, ze, zr, thatch(seed=variant + 4), frame_x, 'roof', ov=4, gx=x1)
    # chimney through the back of the roof
    cx = 18 if variant == 0 else 64
    s.box(cx, cx + 10, 20, 30, 0, zr + 14, stone(course=4, seed=13), 'chimney')
    # the door, windows
    if variant == 0:
        s.decal('body.y', 34, 2, DOOR, WOOD)
        s.decal('body.y', 10, 18, WINDOW_FLOWERS, gl)
        s.decal('body.y', 58, 18, WINDOW, gl)
    else:
        s.decal('body.y', 10, 2, DOOR, WOOD)
        s.decal('body.y', 38, 18, WINDOW, gl)
        s.decal('body.y', 60, 18, WINDOW_FLOWERS, gl)
    s.decal('body.x', 16, 18, WINDOW, gl)
    s.decal('roof.gable', 17, 52, SMALL_WINDOW, gl)
    return s


BUILDINGS = {
    'cottage': lambda lit=False: cottage(0, lit),
    'cottage2': lambda lit=False: cottage(1, lit),
}

if __name__ == '__main__':
    out = sys.argv[1]
    names = sys.argv[2:] or list(BUILDINGS)
    imgs = []
    for n in names:
        imgs.append(outline(BUILDINGS[n]().render()))
        imgs.append(outline(BUILDINGS[n](True).render()))
    magnify(imgs, 4).save(out)
    print('ok')


# ================================================================ more of Millbrook
import math
from iso import hsh

STONE_T = ['#c8ccc6', '#9aa39c', '#747a74', '#3a403c']
DARK = '#1d1b22'


def disc_x(s, X, cy, cz, mask, mat, name, sh=SHADE):
    """A flat shape in the plane x = X (facing south-east), drawn where mask(dy, dz) is true."""
    def hit(a, b):
        ss = 2 * X - a
        y = X - a
        z = ss / 2 - b
        if not mask(y - cy, z - cz):
            return None
        return ss, y, z
    s.surfs.append((hit, mat, sh, name))


def nan_cottage(lit=False):
    """Nan Merrow's cottage: older and smaller-windowed, stone to the sill, roses round the door."""
    s = Scene(3, 2, 118)
    gl = GLASS_LIT if lit else GLASS
    x0, x1, y0, y1 = 8, 88, 12, 54
    ze, zr = 44, 80
    L = x1 - x0
    st = stone(course=4, seed=21)
    up = timber_frame(posts=[0, 40, L - 2], rails=[42])
    def lower_upper(u, v, sh, face, up=up):
        return st(u, v, sh, face) if v < 18 else up(u, v, sh, face)
    upx = timber_frame(posts=[0, y1 - y0 - 2], rails=[42])
    def lower_upper_x(u, v, sh, face):
        return st(u, v, sh, face) if v < 18 else upx(u, v, sh, face)
    s.wall_y(y1, x0, x1, 0, ze, lower_upper, 'body.y')
    s.wall_x(x1, y0, y1, 0, ze, lower_upper_x, 'body.x')
    s.gable_x(x0, x1, y0, y1, ze, zr, thatch(seed=9), upx, 'roof', ov=4, gx=x1)
    s.box(60, 70, 22, 32, 0, zr + 12, stone(course=4, seed=23), 'chimney')
    door = [r.replace('W', 'B').replace('w', 'b') for r in DOOR]
    pal = dict(WOOD, B='#6e7e86', b='#56646c')
    s.decal('body.y', 30, 2, door, pal)
    s.decal('body.y', 8, 18, WINDOW_FLOWERS, gl)
    s.decal('body.y', 56, 18, WINDOW_FLOWERS, gl)
    s.decal('body.x', 16, 18, WINDOW, gl)
    s.decal('roof.gable', 17, 50, SMALL_WINDOW, gl)
    # a climbing rose over the door
    rose = [
        '..lRl.lrl..lRl.',
        '.lrRllRrRllrRl.',
        'lRl.rl.l.lr.lRl',
        'll..........ll.',
        'lr..........rl.',
        'll..........ll.',
        'Rl..........lR.',
        'll..........ll.',
        'l............l.',
        'l............l.',
        'lR...........l.',
        'l............l.',
    ]
    s.decal('body.y', 28, 26, rose, {'l': '#56705f', 'r': '#b87a68', 'R': '#dcb0a8'})
    return s


def mill(lit=False):
    """Maud's mill: a stone ground floor, a plank upper storey, a wooden-shingle roof, wide
    double doors for the carts; the wheel (mill_wheel) turns on its east side."""
    s = Scene(4, 3, 150)
    gl = GLASS_LIT if lit else GLASS
    x0, x1, y0, y1 = 8, 108, 10, 86
    ze, zr = 78, 124
    st = stone(course=5, seed=31)
    pl = planks(width=5)
    def body(u, v, sh, face):
        if v < 40:
            return st(u, v, sh, face)
        if v < 42:
            return {LIT: '#4a3c34', SHADE: '#3a2e2a', TOP: '#5e4e46'}[sh]
        return pl(u, v, sh, face)
    s.wall_y(y1, x0, x1, 0, ze, body, 'body.y')
    s.wall_x(x1, y0, y1, 0, ze, body, 'body.x')
    wood_sh = shingles({LIT: ['#8c7c66', '#7c6c58', '#5e4e46', '#3a2e2a'], SHADE: ['#6a5c4c', '#5e4e46', '#4a3c34', '#2a2226'], TOP: ['#a0907a', '#8c7c66', '#6a5c4c', '#4a3c34']}, row=4, width=7, seed=33)
    s.gable_x(x0, x1, y0, y1, ze, zr, wood_sh, pl, 'roof', ov=4, gx=x1)
    # the big cart doors and the windows
    cart = [
        'kkkkkkkkkkkkkkkkkkkk',
        'kxWWWWWWWxkxWWWWWWWk',
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
        'kWwWwWwWwIkIwWwWwWwk',
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
        'kWwWwWwWwWkWwWwWwWwk',
        'kWwWwWwWwWkWwWwWwWwk',
        'kxxxxxxxxxkxxxxxxxxk',
    ]
    s.decal('body.y', 40, 1, cart, WOOD)
    s.decal('body.y', 12, 52, WINDOW, gl)
    s.decal('body.y', 14, 20, SMALL_WINDOW, gl)
    s.decal('body.x', 34, 52, WINDOW, gl)
    s.decal('roof.gable', 34, 92, SMALL_WINDOW, gl)
    # the lamp Maud keeps in the window for her son (always lit)
    lamp = [
        'kkkkkkkkkk',
        'kgGGkgGGhk',
        'kGgOkOgGhk',
        'kgOYkYOghk',
        'kkkkkkkkkk',
        'kgOYkYOggk',
        'kGgOkOgGgk',
        'kgGgkgGggk',
        'kGgGkGgGgk',
        'kkkkkkkkkk',
        'xwwwwwwwwx',
    ]
    s.decal('body.y', 76, 52, lamp, dict(GLASS, Y='#fff0c0', O='#f4c468'))
    return s


def mill_wheel(frame=0, lit=False):
    """The mill's waterwheel on its east side, turning (4 frames over 45°)."""
    s = Scene(4, 3, 150)
    X = 114
    cy, cz, R = 48, 40, 36
    ang = frame * (math.pi / 4) / 4
    wood = {LIT: ['#8c7c66', '#7c6c58', '#5e4e46'], SHADE: ['#7c6c58', '#6a5c4c', '#4a3c34'], TOP: ['#a0907a', '#8c7c66', '#6a5c4c']}
    def outer(dy, dz):
        r = math.hypot(dy, dz)
        if r > R + 4:
            return False
        if R - 3 <= r <= R:
            return True
        a = math.atan2(dz, dy) - ang
        k = (a % (math.pi / 4))
        on_spoke = min(k, math.pi / 4 - k) * r < 1.6
        if r > R and on_spoke:
            return True  # paddle ends
        if r < 5:
            return True
        return on_spoke and r < R
    def mat(u, v, sh, face):
        dy, dz = u - cy, v - cz
        r = math.hypot(dy, dz)
        if r < 2:
            return '#3a2e2a'
        if r > R:
            return wood[sh][2]
        if r >= R - 3:
            return wood[sh][0] if r > R - 1.5 else wood[sh][1]
        return wood[sh][1]
    disc_x(s, X, cy, cz, outer, mat, 'wheel')
    # the back rim, darker, seen through the spokes
    def back(dy, dz):
        r = math.hypot(dy, dz)
        return R - 3 <= r <= R + 3
    disc_x(s, X - 7, cy, cz, back, lambda u, v, sh, f: '#3a2e2a', 'wheelback')
    # the axle into the wall
    s.box(108, X, cy - 2, cy + 2, cz - 2, cz + 2, flat_tone('#4a3c34', '#3a2e2a'), 'axle')
    return s


def chapel(lit=False):
    """Millbrook's chapel: a stone nave with a slate roof and tall lancet windows, the bell
    tower at its west end with the door; its belfry openings show the bell."""
    s = Scene(4, 6, 230)
    gl = dict(GLASS_LIT if lit else GLASS)
    x0, x1, y0, y1 = 24, 104, 8, 150
    ze, zr = 56, 100
    st = stone(course=5, seed=41)
    s.wall_y(y1, x0, x1, 0, ze, st, 'nave.y')
    s.wall_x(x1, y0, y1, 0, ze, st, 'nave.x')
    slate = shingles(seed=43)
    s.gable_y(x0, x1, y0, y1, ze, zr, slate, st, 'roof', ov=4, gy=y1)
    # buttresses along the south-east wall
    for yb in (30, 64, 98, 132):
        s.box(x1, x1 + 6, yb, yb + 6, 0, 40, stone(course=5, seed=44 + yb), 'butt%d' % yb)
    lancet = [
        '..kkkk..',
        '.kgGGhk.',
        'kgGgGGhk',
        'kGgGgGhk',
        'kgGgGGgk',
        'kkkkkkkk',
        'kGgGgGgk',
        'kgGgGGgk',
        'kGgGgGgk',
        'kgGgGGgk',
        'kkkkkkkk',
        'kGgGgGgk',
        'kgGgGGgk',
        'kGgGgGgk',
        'kgGgGGgk',
        'kGgGgGgk',
        'kkkkkkkk',
        'xxxxxxxx',
    ]
    for u in (8, 42, 76, 110):
        s.decal('nave.x', u, 18, lancet, gl)
    # the tower
    tx0, tx1, ty0, ty1 = 40, 88, 150, 190
    th = 152
    s.box(tx0, tx1, ty0, ty1, 0, th, stone(course=5, seed=45), 'tower')
    s.pyramid(tx0, tx1, ty0, ty1, th, th + 58, shingles(seed=46), 'spire', ov=3)
    # a cornice under the spire
    s.box(tx0 - 2, tx1 + 2, ty0 - 2, ty1 + 2, th - 4, th, stone(course=2, seed=47), 'cornice')
    door = [
        '....kkkkkkkk....',
        '..kkxWWWWWWxkk..',
        '.kxWWwWwWwWwWxk.',
        'kxWwWwWwkwWwWwxk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kIIIIIIIkIIIIIIk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwIkIwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kIIIIIIIkIIIIIIk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kWwWwWwWkWwWwWwk',
        'kkkkkkkkkkkkkkkk',
    ]
    s.decal('tower.y', 16, 0, door, WOOD)
    # the arch stones round the door
    arch = ['..ssssssssssss..', '.s............s.', 's..............s']
    s.decal('tower.y', 16, 31, arch, {'s': '#5c625c'})
    rose_win = ['.kkkk.', 'kgGhGk', 'kGkkGk', 'kGkkgk', 'kgGGgk', '.kkkk.']
    s.decal('tower.y', 21, 70, rose_win, gl)
    belfry = [
        '...kkkkkk...',
        '..kDDDDDDk..',
        '.kDDDDDDDDk.',
        'kDDDDDDDDDDk',
        'kDDDDBBDDDDk',
        'kDDDBbbBDDDk',
        'kDDBbbbbBDDk',
        'kDDBbbbbBDDk',
        'kDBbbbbbbBDk',
        'kDBbbbbbbBDk',
        'kDDDDDDDDDDk',
        'kDDDDDDDDDDk',
        'kDDDDDDDDDDk',
        'kkkkkkkkkkkk',
        'xxxxxxxxxxxx',
    ]
    bpal = {'k': '#2a2226', 'x': '#4a3c34', 'D': DARK, 'B': '#a08440', 'b': '#6e5a30'}
    s.decal('tower.y', 18, 118, belfry, bpal)
    s.decal('tower.x', 14, 118, belfry, bpal)
    s.decal('tower.x', 16, 70, rose_win, gl)
    return s


def smithy(lit=False):
    """Bram's smithy: an open-fronted shed of stone and timber, the forge glowing at the back
    under its hood, the anvil on a stump."""
    s = Scene(3, 2, 110)
    x0, x1, y0, y1 = 8, 88, 10, 54
    ze, zr = 48, 80
    st = stone(course=5, seed=51)
    # inside faces of the back and west walls, and the east wall from outside
    s.wall_y(y0, x0, x1, 0, ze, st, 'back')
    s.wall_x(x0, y0, y1, 0, ze, st, 'west')
    s.wall_x(x1, y0, y1, 0, ze, planks(width=5, seed=52), 'east')
    # posts at the open front
    post = {LIT: ['#6a5848', '#4e4038'], SHADE: ['#4a3c34', '#3a2e2a'], TOP: ['#7c6c58', '#5e4e46']}
    pm = lambda u, v, sh, f: post[sh][0 if u < 1 else 1]
    s.box(x0, x0 + 5, y1 - 5, y1, 0, ze, pm, 'postw')
    s.box(84, 88, y1 - 5, y1, 0, ze, pm, 'poste')
    wood_sh = shingles({LIT: ['#8c7c66', '#7c6c58', '#5e4e46', '#3a2e2a'], SHADE: ['#6a5c4c', '#5e4e46', '#4a3c34', '#2a2226'], TOP: ['#a0907a', '#8c7c66', '#6a5c4c', '#4a3c34']}, row=4, width=7, seed=53)
    s.gable_x(x0, x1, y0, y1, ze, zr, wood_sh, planks(width=5, seed=54), 'roof', ov=4, gx=x1)
    # the forge at the open front: a stone hearth with coals, its hood and chimney through the roof
    s.box(12, 38, 26, 48, 0, 18, stone(course=4, seed=55), 'hearth')
    glow = ['#fff0c0', '#f4c468', '#e09a48', '#b8673a'] if lit else ['#f4c468', '#e09a48', '#b8673a', '#7a4a40']
    def coals(u, v, sh, f):
        r = hsh(u, v, 57)
        return glow[0 if r < 0.12 else 1 if r < 0.4 else 2 if r < 0.8 else 3]
    s.flat(18.5, 15, 35, 29, 45, coals, 'coals')
    s.box(14, 36, 28, 46, 36, 40, stone(course=4, seed=56), 'hood')
    s.box(19, 31, 30, 42, 40, zr + 10, stone(course=4, seed=58), 'chimney')
    # the anvil on its stump, by the middle post
    s.cylinder(64, 44, 6, 0, 12, planks(width=3, seed=59), 'stump')
    iron = {LIT: ['#9aa39c', '#747a74'], SHADE: ['#5c625c', '#3a403c'], TOP: ['#c8ccc6', '#9aa39c']}
    s.box(57, 72, 42, 47, 12, 18, lambda u, v, sh, f: iron[sh][0 if v > 4 else 1], 'anvil')
    return s


def stall(lit=False):
    """Tobin's market stall: a plank counter with bread, jars and apples under a striped awning."""
    s = Scene(2, 2, 70)
    pl = planks(width=4, seed=61)
    s.box(6, 58, 30, 44, 0, 18, pl, 'counter', top_mat=planks(width=4, vertical=False, seed=62))
    post = {LIT: ['#6a5848', '#4e4038'], SHADE: ['#4a3c34', '#3a2e2a'], TOP: ['#7c6c58', '#5e4e46']}
    pm = lambda u, v, sh, f: post[sh][0 if u < 1 else 1]
    for x in (6, 54):
        s.box(x, x + 4, 10, 14, 0, 52, pm, 'pb%d' % x)
        s.box(x, x + 4, 44, 48, 0, 42, pm, 'pf%d' % x)
    def stripes(u, v, sh, f):
        band = (u // 6) % 2
        col = ['#dcb0a8', '#e6e0d2'] if band else ['#9a5a4a', '#7a4a40']
        if v < 2:
            return '#5e3a36' if band == 0 else '#b88a80'
        return col[0 if sh == LIT else 1]
    s.shed(2, 62, 6, 52, 56, 38, stripes, 'awning')
    # goods: loaves, jars, apples
    loaf = ['#d8c070', '#c9a24e', '#a08440', '#6e5a30']
    for i, x in enumerate((14, 24)):
        s.sphere(x, 37, 21, 5, loaf, 'loaf%d' % i, squash=0.6, seed=i)
    s.cylinder(36, 36, 3, 18, 26, flat_tone('#8a98a0', '#5e6e76'), 'jar1', top_mat=flat_tone('#4a3c34', '#4a3c34'))
    s.cylinder(42, 39, 3, 18, 24, flat_tone('#b87a68', '#7a4a40'), 'jar2', top_mat=flat_tone('#4a3c34', '#4a3c34'))
    apple = ['#c89088', '#9a5a4a', '#7a4a40', '#3a2226']
    for i, (x, y) in enumerate(((50, 36), (53, 39), (49, 40))):
        s.sphere(x, y, 20, 2.6, apple, 'apple%d' % i, seed=i + 5)
    return s


def well(lit=False):
    """The village well: a round stone wall, a little shingle roof on two posts, a bucket."""
    s = Scene(1, 1, 64)
    s.cylinder(16, 16, 12, 0, 16, stone(course=4, seed=71), 'wall', top_mat=stone(course=3, seed=72), inner=8)
    post = {LIT: ['#6a5848', '#4e4038'], SHADE: ['#4a3c34', '#3a2e2a'], TOP: ['#7c6c58', '#5e4e46']}
    pm = lambda u, v, sh, f: post[sh][0 if u < 1 else 1]
    s.box(3, 6, 14, 18, 0, 42, pm, 'pw')
    s.box(26, 29, 14, 18, 0, 42, pm, 'pe')
    s.box(5, 27, 15, 17, 33, 35, pm, 'crank')
    s.cylinder(16, 16, 3, 22, 28, planks(width=2, seed=73), 'bucket')
    s.gable_x(2, 30, 8, 24, 42, 54, shingles({LIT: ['#8c7c66', '#7c6c58', '#5e4e46', '#3a2e2a'], SHADE: ['#6a5c4c', '#5e4e46', '#4a3c34', '#2a2226'], TOP: ['#a0907a', '#8c7c66', '#6a5c4c', '#4a3c34']}, row=3, width=5, seed=74), pm, 'roof', ov=2)
    return s


def fence(axis='x'):
    def make(lit=False):
        s = Scene(1, 1, 24)
        post = {LIT: ['#7c6c58', '#5e4e46'], SHADE: ['#5e4e46', '#4a3c34'], TOP: ['#8c7c66', '#6a5c4c']}
        pm = lambda u, v, sh, f: post[sh][0 if u < 1 else 1]
        rail = {LIT: ['#8c7c66', '#6a5c4c'], SHADE: ['#6a5c4c', '#4a3c34'], TOP: ['#a0907a', '#7c6c58']}
        rm = lambda u, v, sh, f: rail[sh][0 if v >= 1 else 1]
        if axis == 'x':
            for x in (1, 17):
                s.box(x, x + 3, 14, 18, 0, 16, pm, 'p%d' % x)
            for z in (6, 12):
                s.box(0, 32, 15, 17, z, z + 2, rm, 'r%d' % z)
        else:
            for y in (1, 17):
                s.box(14, 18, y, y + 3, 0, 16, pm, 'p%d' % y)
            for z in (6, 12):
                s.box(15, 17, 0, 32, z, z + 2, rm, 'r%d' % z)
        return s
    return make


def tent(lit=False):
    """Aldric's tent: weathered canvas over a ridge pole, the flap open toward the fire."""
    s = Scene(2, 2, 60)
    canvas = {LIT: ['#c8ccc6', '#b2b6ae', '#9aa39c'], SHADE: ['#9aa39c', '#848c86', '#747a74'], TOP: ['#dcdcd2', '#c8ccc6', '#b2b6ae']}
    def cloth(u, v, sh, f):
        if v % 10 == 9:
            return canvas[sh][2]
        return canvas[sh][0 if hsh(u // 3, v, 81) < 0.7 else 1]
    s.gable_x(8, 52, 14, 50, 1, 42, cloth, cloth, 'cloth', ov=1, gx=52)
    # the open flap: a dark triangle in the gable, the flap folded back
    def opening(u, v, sh, f):
        return DARK
    ym = 32
    def mask_hit(a, b):
        X = 52.2
        ss = 2 * X - a
        y = X - a
        z = ss / 2 - b
        if z < 0 or z > 30 - abs(y - ym) * 1.6 or abs(y - ym) > 12:
            return None
        return ss, y, z
    s.surfs.append((mask_hit, opening, SHADE, 'door'))
    post = {LIT: ['#6a5848', '#4e4038'], SHADE: ['#4a3c34', '#3a2e2a'], TOP: ['#7c6c58', '#5e4e46']}
    pm = lambda u, v, sh, f: post[sh][0 if u < 1 else 1]
    s.box(53, 55, 31, 33, 0, 48, pm, 'pole')
    return s


def barrow(lit=False):
    """An old barrow: a grassy mound with a stone-framed doorway into the dark."""
    s = Scene(3, 3, 44)
    grass = ['#6e8a74', '#56705f', '#4a6454', '#3c5a4a', '#2c4438']
    def g(lam, xyz, sh, f):
        x, y, z = xyz
        lam += (hsh(int(x) // 2, int(y) // 2, 91) - 0.5) * 0.18
        return grass[0 if lam > 0.85 else 1 if lam > 0.62 else 2 if lam > 0.4 else 3 if lam > 0.18 else 4]
    s.dome(48, 46, 44, 42, 30, g, 'mound')
    sm = stone(course=6, seed=92)
    s.box(38, 44, 76, 84, 0, 20, sm, 'jamb1')
    s.box(54, 60, 76, 84, 0, 20, sm, 'jamb2')
    s.box(36, 62, 76, 84, 20, 25, stone(course=5, seed=93), 'lintel')
    def dark(a, b):
        Y = 83.5
        ss = 2 * Y + a
        x = Y + a
        z = ss / 2 - b
        if not (44 <= x <= 54 and 0 <= z <= 20):
            return None
        return ss, x, z
    s.surfs.append((dark, lambda u, v, sh, f: DARK, LIT, 'hole'))
    # a few fallen stones in the grass
    for i, (x, y, r) in enumerate(((22, 80, 4), (74, 70, 3), (66, 86, 3))):
        s.sphere(x, y, 0, r, STONE_T, 'st%d' % i, squash=0.7, seed=i)
    return s


def barricade(lit=False):
    """The Steward's barricade across the south road: sharpened stakes, two rails, a red board."""
    s = Scene(3, 1, 52)
    post = {LIT: ['#8c7c66', '#6a5c4c'], SHADE: ['#6a5c4c', '#4a3c34'], TOP: ['#a0907a', '#7c6c58']}
    pm = lambda u, v, sh, f: post[sh][0 if u < 1 else 1]
    for i, x in enumerate(range(3, 92, 8)):
        h = 30 + int(hsh(i, 101) * 8)
        s.box(x, x + 5, 12, 17, 0, h, pm, 'stake%d' % i)
        s.pyramid(x, x + 5, 12, 17, h, h + 6, pm, 'tip%d' % i, ov=0)
    rail = {LIT: ['#7c6c58', '#5e4e46'], SHADE: ['#5e4e46', '#3a2e2a'], TOP: ['#8c7c66', '#6a5c4c']}
    for z in (8, 22):
        s.box(0, 96, 17, 20, z, z + 4, lambda u, v, sh, f: rail[sh][0 if v > 1 else 1], 'rail%d' % z)
    board = ['kkkkkkkkkkkkkkkk', 'kRRRRRRRRRRRRRRk', 'kRrrrRRGGRRrrrRk', 'kRRRRRGGGGRRRRRk', 'kRrrrRRGGRRrrrRk', 'kRRRRRRRRRRRRRRk', 'kkkkkkkkkkkkkkkk']
    s.decal('rail22.y', 40, 0, board, {'k': '#2a2226', 'R': '#9a5a4a', 'r': '#7a4a40', 'G': '#d8c070'})
    return s


def rockfall(lit=False):
    """Boulders down across the hill path."""
    s = Scene(3, 2, 60)
    rocks = [(16, 30, 9), (34, 20, 13), (54, 30, 15), (76, 22, 12), (84, 44, 8), (28, 46, 8), (46, 50, 7), (66, 52, 6), (60, 12, 9)]
    for i, (x, y, r) in enumerate(rocks):
        s.sphere(x, y, r * 0.55, r, STONE_T, 'rock%d' % i, squash=0.85, seed=i * 3)
    return s


def bell(lit=False):
    """The cracked bronze bell of Millbrook, hanging from its beam in the belfry."""
    s = Scene(2, 2, 110)
    post = {LIT: ['#6a5848', '#4e4038'], SHADE: ['#4a3c34', '#3a2e2a'], TOP: ['#7c6c58', '#5e4e46']}
    pm = lambda u, v, sh, f: post[sh][0 if u < 1 else 1]
    s.box(6, 12, 29, 35, 0, 96, pm, 'postw')
    s.box(52, 58, 29, 35, 0, 96, pm, 'poste')
    s.box(4, 60, 29, 35, 96, 104, pm, 'beam')
    bronze = {LIT: ['#d8c070', '#c9a24e', '#a08440'], SHADE: ['#a08440', '#6e5a30', '#4a3c24'], TOP: ['#d8c070', '#c9a24e', '#a08440']}
    # the bell's profile: radius by height (lip at z 30, crown at z 88)
    def radius(z):
        t = (z - 30) / 58
        return 22 * (1 - t) ** 1.6 + 9 if t < 1 else 0
    def shade(ang, sh):
        # the visible half, lit on the left: by angle round the bell
        k = 0 if ang > 2.0 else 1 if ang > 0.6 else 2
        return bronze[LIT][k] if k < 2 else bronze[SHADE][1]
    for z in range(30, 89, 2):
        r = radius(z)
        def mat(u, v, sh, f, z=z, r=r):
            if z < 34:
                return bronze[LIT][1] if u < r * 1.2 else bronze[SHADE][0]
            return shade(math.pi * 0.75 - u / r, sh)
        def top(u, v, sh, f, r=r):
            return shade(math.atan2(v - r, u - r), sh)
        s.cylinder(32, 32, r, z, z + 2, mat, 'ring%d' % z, top_mat=top)
    s.box(28, 36, 30, 34, 88, 96, pm, 'yoke')
    def crack(img, ox, oy):
        px = img.load()
        # the crack, hand-placed down the lit side from the shoulder to the lip
        x = ox - 9
        pts = [(0, 0), (0, 1), (-1, 2), (-1, 3), (0, 4), (0, 5), (1, 6), (1, 7), (0, 8), (0, 9), (-1, 10), (-1, 11), (-2, 12), (-2, 13),
               (-1, 14), (-1, 15), (-1, 16), (-2, 17), (-3, 18), (-3, 19), (-2, 20), (-2, 21), (-3, 22), (-4, 23), (-4, 24), (-4, 25), (-5, 26), (-5, 27)]
        y0 = 32 - 74 + oy
        for dx, dy in pts:
            px[x + dx, y0 + dy] = (0x2a, 0x22, 0x26, 255)
            px[x + dx + 1, y0 + dy] = (0x6e, 0x5a, 0x30, 255)
        # a branch of the crack
        for dx, dy in [(1, 9), (2, 10), (3, 10), (4, 11)]:
            px[x + dx, y0 + dy] = (0x2a, 0x22, 0x26, 255)
    s.extra = crack
    return s


def grave(lit=False):
    """A headstone, rounded at the top, over a low mound of earth."""
    s = Scene(1, 1, 36)
    earth = ['#7c6c58', '#5e4e46', '#4a3c34', '#3a2e2a', '#2a2226']
    def e(lam, xyz, sh, f):
        return earth[0 if lam > 0.85 else 1 if lam > 0.6 else 2 if lam > 0.35 else 3]
    s.dome(16, 21, 7, 9, 5, e, 'mound')
    sm = stone(course=30, seed=111)
    def top(x):
        return 20 + 4 * max(0, 1 - ((x - 16) / 7) ** 2)
    s.wall_y(11, 9, 23, 0, 24, sm, 'stone.y', zmax=top)
    s.wall_x(23, 7, 11, 0, 20, sm, 'stone.x')
    s.flat(20, 9, 23, 7, 11, sm, 'stone.top')
    s.decal('stone.y', 5, 10, ['.xxx.', 'xxxxx', '.xxx.', '..x..', '..x..'], {'x': '#5c625c'})
    return s


def grave_cross(lit=False):
    """A weathered wooden cross over a grave."""
    s = Scene(1, 1, 44)
    earth = ['#7c6c58', '#5e4e46', '#4a3c34', '#3a2e2a', '#2a2226']
    def e(lam, xyz, sh, f):
        return earth[0 if lam > 0.85 else 1 if lam > 0.6 else 2 if lam > 0.35 else 3]
    s.dome(18, 20, 7, 11, 5, e, 'mound')
    post = {LIT: ['#8c7c66', '#6a5c4c'], SHADE: ['#6a5c4c', '#4a3c34'], TOP: ['#a0907a', '#7c6c58']}
    pm = lambda u, v, sh, f: post[sh][0 if u < 1 else 1]
    s.box(14, 18, 6, 9, 0, 34, pm, 'upright')
    s.box(8, 24, 6, 9, 24, 28, pm, 'arm')
    return s


def thornwall(lit=False):
    """The Blackthorn across the north road: black stems as thick as an arm, arching and
    knotting, hooked thorns along them."""
    s = Scene(4, 1, 64)
    tones = ['#6e6078', '#463b50', '#2e2632', '#1d1b22']
    rnd = lambda *a: hsh(*a, 131)
    stems = []
    for i in range(12):
        # each stem arches out of the ground and back down
        x0 = -6 + i * 11 + rnd(i, 1) * 8
        x1 = x0 + 26 + rnd(i, 2) * 30
        h = 20 + rnd(i, 3) * 32
        y = 8 + rnd(i, 4) * 16
        r = 2.8 + rnd(i, 5) * 2.2
        stems.append((x0, x1, h, y, r))
    k = 0
    for i, (x0, x1, h, y, r) in enumerate(stems):
        n = int((x1 - x0) / 1.2)
        for j in range(n + 1):
            t = j / n
            x = x0 + (x1 - x0) * t
            z = h * math.sin(math.pi * t) * (1 - 0.15 * t)
            yy = y + 4 * math.sin(t * 5 + i)
            rr = r * (1 - 0.35 * abs(t - 0.5))
            s.sphere(x, yy, z, rr, tones, 'stem%d' % k, squash=1.0, seed=i)
            k += 1
    def thorns(img, ox, oy):
        px = img.load()
        W, H = img.size
        dark, light = (0x1d, 0x1b, 0x22, 255), (0x8a, 0x7e, 0x94, 255)
        for i, (x0, x1, h, y, r) in enumerate(stems):
            n = 9
            for j in range(1, n):
                t = j / n
                x = x0 + (x1 - x0) * t
                z = h * math.sin(math.pi * t) * (1 - 0.15 * t)
                yy = y + 4 * math.sin(t * 5 + i)
                sx = int(x - yy + ox)
                sy = int((x + yy) / 2 - z + oy)
                up = (j + i) % 2 == 0
                # a hooked thorn, 4 px, pointing up or down off the stem
                d = -1 if up else 1
                base = sy + d * int(r)
                for q, (dx, dy) in enumerate([(0, 0), (0, d), (1, 2 * d), (2, 3 * d)]):
                    X, Y = sx + dx, base + dy
                    if 0 <= X < W and 0 <= Y < H:
                        px[X, Y] = light if q == 3 else dark
    s.extra = thorns
    return s


BUILDINGS.update({
    'nan_cottage': nan_cottage,
    'mill': mill,
    'chapel': chapel,
    'smithy': smithy,
    'stall': stall,
    'well': well,
    'fence_x': fence('x'),
    'fence_y': fence('y'),
    'tent': tent,
    'barrow': barrow,
    'barricade': barricade,
    'rockfall': rockfall,
    'bell': bell,
    'grave': grave,
    'grave_cross': grave_cross,
    'thornwall': thornwall,
})
# animated pieces drawn over a building: name -> (frames, base building)
ANIMS = {'mill_wheel': (4, mill_wheel)}


def wall_block(height):
    """One tile of interior stone wall (the bell tower): `height` px, a dark rough top."""
    def make(lit=False):
        s = Scene(1, 1, height + 2)
        top = flat_tone('#3a403c', '#3a403c', '#46545c')
        dark = {LIT: ['#9aa39c', '#747a74', '#5c625c', '#2e3840'], SHADE: ['#5c625c', '#4e5650', '#3a403c', '#1d1b22'], TOP: ['#747a74', '#5c625c', '#4e5650', '#2e3840']}
        s.box(0, 32, 0, 32, 0, height, stone(dark, course=5, seed=151 + height), 'b', top_mat=lambda u, v, sh, f: '#38444c' if hsh(u, v, 152) < 0.7 else '#2e3840')
        return s
    return make


BUILDINGS.update({'wallblock': wall_block(72), 'wallblock_lo': wall_block(10)})


# ================================================================ the story trees (Lake Ellory)
LEAF = ['#8a9878', '#6e8a74', '#4a6454', '#2c4438']
LEAF_D = ['#6e8a74', '#56705f', '#3c5a4a', '#24352c']
BARK = {LIT: ['#7c6c58', '#5e4e46', '#4a3c34'], SHADE: ['#5e4e46', '#4a3c34', '#2a2226'], TOP: ['#8c7c66', '#6a5c4c', '#4a3c34']}


def bark(u, v, sh, f):
    # vertical furrows
    k = int(u) % 5
    r = hsh(int(u) // 5, int(v) // 7, 161)
    return BARK[sh][2 if k == 0 else 0 if (k == 1 and r < 0.6) else 1]


def hollow_oak(lit=False):
    """The hollow oak on the west shore, where Marcian and Victoria left notes and feathers:
    an old, broad oak with a dark hollow in its trunk, roots gripping the bank."""
    s = Scene(3, 3, 150)
    cx, cy = 48, 50
    # trunk, roots
    s.cylinder(cx, cy, 11, 0, 70, bark, 'trunk', top_mat=flat_tone('#4a3c34', '#4a3c34'))
    for i, (dx, dy, r) in enumerate([(-12, 6, 5), (8, 12, 5), (12, -4, 4), (-6, -10, 4), (2, 14, 4)]):
        s.sphere(cx + dx, cy + dy, 1, r, ['#7c6c58', '#5e4e46', '#4a3c34', '#2a2226'], 'root%d' % i, squash=0.5, seed=i)
    # the hollow, on the side that faces the lake path (south-west), and a feather in it
    hole = [
        '..kkkk..',
        '.kKKKKk.',
        'kKKKKKKk',
        'kKKKfKKk',
        'kKKKfKKk',
        'kKKKKfKk',
        'kKKKKKKk',
        '.kKKKKk.',
        '..kkkk..',
    ]
    s.decal('trunk', 6, 26, hole, {'k': '#2a2226', 'K': '#1d1b22', 'f': '#dcdcd2'})
    # big boughs, then the crown
    for i, (dx, dy, z, r) in enumerate([(-14, -6, 80, 22), (16, -10, 86, 22), (-4, 14, 84, 20), (2, -2, 104, 24), (-20, 10, 72, 15), (22, 10, 74, 15), (10, -22, 96, 17), (-14, -22, 98, 16)]):
        s.sphere(cx + dx, cy + dy, z, r, LEAF if z > 80 else LEAF_D, 'crown%d' % i, squash=0.8, seed=i + 3, leafy=0.5)
    return s


def willow(lit=False):
    """Marcian's willow on the north shore: a weeping willow, its long fronds trailing to the
    water. (Old Tull buried him here; nobody knows.)"""
    s = Scene(3, 3, 140)
    cx, cy = 48, 48
    s.cylinder(cx, cy, 8, 0, 66, bark, 'trunk', top_mat=flat_tone('#4a3c34', '#4a3c34'))
    for i, (dx, dy, r) in enumerate([(-9, 5, 4), (7, 9, 4), (9, -4, 3)]):
        s.sphere(cx + dx, cy + dy, 1, r, ['#7c6c58', '#5e4e46', '#4a3c34', '#2a2226'], 'root%d' % i, squash=0.5, seed=i)
    # the crown: a soft dome
    for i, (dx, dy, z, r) in enumerate([(0, 0, 92, 20), (-14, 6, 82, 14), (14, -4, 84, 14), (4, 14, 80, 13), (-6, -14, 86, 13)]):
        s.sphere(cx + dx, cy + dy, z, r, LEAF, 'crown%d' % i, squash=0.7, seed=i + 11, leafy=0.5)
    # the fronds: long strands hanging from the rim of the crown nearly to the ground
    W = ['#a4b094', '#8a9878', '#6e7c5c', '#4a5a40']
    k = 0
    for i in range(28):
        a = i / 28 * math.tau
        rr = 26 + 4 * hsh(i, 171)
        x = cx + math.cos(a) * rr
        y = cy + math.sin(a) * rr
        top = 84 - 4 * hsh(i, 172)
        bottom = 10 + 16 * hsh(i, 173)
        z = top
        while z > bottom:
            s.sphere(x, y, z, 2.6, W, 'frond%d' % k, squash=1.6, seed=i)
            z -= 4
            k += 1
    return s


BUILDINGS.update({'hollow_oak': hollow_oak, 'willow': willow})
