"""Act II creatures (docs/act2.md, "Enemies"), hand-placed at the HD scale beside the skeleton and
the Act I bone hound. The wild: the wolf, the thornback (a ridge of bone spines) and Bonespine, an
old thornback as big as a pony (an optional boss); the boar and the deer; the Weepwood spider, its
spiderlings and egg sacs (the second frame swells: it pulses), and the Brood Mother (a boss). The
queen's dead: the Mourning Light (a will-o'-wisp), the mourner, the smotherer (a dead charcoal-
burner), the hanged poacher, the Tower Guard and crossbowman, and Sir Garrick Thorne (the act's
boss, black lace on his sword arm). The old dead: the Sleeper and the Thane under the Hill (a boss).
The Greyfang outriders: the goblin trapper, the wolf-rider and their chief, built on the game's own
goblin (hdSprites.ts) and the thornback. Two frames each (a walk, a trot, a flicker); the crow, a
decoration, has four on one canvas: perched, looking back, flying wings up, wings down. Each
creature's frames share one canvas, feet on the bottom row. Face right; no outline (the game adds
it). Natural colours; the game recolours creatures for HD · Silhouette.

    python3 creatures2.py out.png    # magnified review sheet of every frame
"""
from tool import G, render, sheet


def lay(w, h, *parts):
    """A w×h frame from parts (x, y, rows) placed in order; ' ' and '.' are transparent."""
    g = G(w, h)
    for x, y, rows in parts:
        for j, r in enumerate(rows):
            if len(r) + x > w and r[w - x:].strip('. '):
                raise ValueError(f'row too wide at y={y + j}: {r!r}')
            g.at(x, y + j, r)
    return [''.join(r) for r in g.g]


def recolor(rows, mapping):
    """Rename palette letters in rows (to combine sprites whose palettes share letters)."""
    t = str.maketrans(mapping)
    return [r.translate(t) for r in rows]


def line_px(x0, y0, x1, y1):
    """The pixels of a straight line from (x0, y0) to (x1, y1) (Bresenham)."""
    pts = []
    x, y = x0, y0
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx + dy
    while True:
        pts.append((x, y))
        if x == x1 and y == y1:
            return pts
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x += sx
        if e2 <= dx:
            err += dx
            y += sy


def spear(x0, y0, x1, y1):
    """Parts for lay(): a wooden shaft from (x0, y0) to an iron head ending at (x1, y1)."""
    pts = line_px(x0, y0, x1, y1)
    n = len(pts)
    return [(x, y, ['L' if i >= n - 2 else 'l' if i >= n - 3 else 'H' if i % 2 else 'h'])
            for i, (x, y) in enumerate(pts)]


def clear_spines(rows, x0, x1, y1):
    """Remove the bone spines (B b c) from columns x0..x1 above row y1: a rider sits there."""
    out = []
    for y, r in enumerate(rows):
        if y < y1:
            r = r[:x0] + ''.join('.' if ch in 'Bbc' else ch for ch in r[x0:x1 + 1]) + r[x1 + 1:]
        out.append(r)
    return out


# ================================================================ wolf
WOLF_PAL = {'W': '#d8d6ce', 'w': '#aaa69c', 'v': '#7e7a70', 'V': '#56524a', 'p': '#e4dece', 'P': '#bab2a0',
            'm': '#3a3632', 'n': '#1c1a18', 'y': '#ffd23a', 'k': '#24221e'}
WOLF_BODY = [
    '.........................V.W....',
    '........................VvWWw...',
    '.....................wWWwWWWw...',
    '...................wWWWWWWkyWw..',
    '...............wWWWWWWWWWppwwvvn',
    '....wWWWWWWWWWWwwwwwwwwwwppPmmm.',
    '..wWwvWWwwwwwwwwwwwwwwwwwpP.....',
    '..wWw.wWwwwPPPPwwwwwwwwwpP......',
    '.wWv..wwwwvP...PPwwwwwwpP.......',
    '.wwv..wwwvv.....vwwwwwwpP.......',
    '.vVV..vwwv........vvwwvP........',
]
# legs: two frames of the trot (spread, then gathered with a paw lifted); the body rises a pixel
# in the gathered frame
WOLF_LEGS = [
    [
        '......ww.vv.......vv.WWw........',
        '.....ww...v......vv...Ww........',
        '.....ww...vv.....v....ww........',
        '....ww.....v....vv.....w........',
        '...ww......v....v......ww.......',
        '..vvv......VVV.VVV.....vvv......',
    ],
    [
        '......ww..vv.......vvWWw........',
        '......ww..vv.......vvWw.........',
        '......ww..v.......vv.Ww.........',
        '.....ww...v.......v..ww.........',
        '.....w....vv.....vv..ww.........',
        '.....w.....v.........w..........',
        '.....vvv...VVV.......vvv........',
    ],
]


def wolf():
    f0 = lay(32, 18, (0, 12, WOLF_LEGS[0]), (0, 1, WOLF_BODY))
    f1 = lay(32, 18, (0, 11, WOLF_LEGS[1]), (0, 0, WOLF_BODY))
    return [f0, f1]


# ================================================================ thornback wolf
BONE = {'B': '#f2ecdc', 'b': '#d4cbb4', 'c': '#a89f88'}
THORN_PAL = dict(BONE, W='#76717a', w='#524e58', v='#3a3640', V='#28242c', p='#9a9088', P='#706860',
                 m='#1a1214', n='#141012', k='#141012', R='#ff7a32', r='#c8401e', t='#f4f0e4')
THORN_BODY = [
    '..................................',
    '...............B..................',
    '...........B....B..B.......V.W....',
    '............B...Bb..Bb....VvWWw...',
    '.......B....Bb..Bb..Bc.wWWwWWWw...',
    '...B....Bb..Bb..Bc..BwWWWWWWkRvw..',
    '....Bc..Bc..Bc..BwWWWWWWWWWppwwvvn',
    '....wWWWWWWWWWWWWwwwwwwwwwwPmmmtm.',
    '..wWwvWWwwwwwwwwwwwwwwwwwwwPvvt...',
    '..wWw.wWwwwPPPPPPwwwwwwwwwpP......',
    '.wWv..wwwwvP.....PPwwwwwwpP.......',
    '.wwv..wwwvv.......vwwwwwwpP.......',
    '.vVV..vwwv..........vvwwvP........',
]
# the wolf's trot, two pixels longer
THORN_LEGS = [
    [
        '......ww.vv.........vv.WWw........',
        '.....ww...v........vv...Ww........',
        '.....ww...vv.......v....ww........',
        '....ww.....v......vv.....w........',
        '...ww......v......v......ww.......',
        '..vvv......VVV...VVV.....vvv......',
    ],
    [
        '......ww..vv.........vvWWw........',
        '......ww..vv.........vvWw.........',
        '......ww..v.........vv.Ww.........',
        '.....ww...v.........v..ww.........',
        '.....w....vv.......vv..ww.........',
        '.....w.....v...........w..........',
        '.....vvv...VVV.........vvv........',
    ],
]


def thornback():
    f0 = lay(34, 20, (0, 14, THORN_LEGS[0]), (0, 1, THORN_BODY))
    f1 = lay(34, 20, (0, 13, THORN_LEGS[1]), (0, 0, THORN_BODY))
    return [f0, f1]


# ================================================================ boar
BOAR_PAL = {'H': '#8a6242', 'h': '#644430', 'd': '#462e1e', 'b': '#2e1e14', 'g': '#a88a68',
            's': '#c08870', 'S': '#94604c', 'n': '#2a1612', 'T': '#f6eedc', 't': '#c8bc9e', 'k': '#120a06',
            'K': '#241c18'}
BOAR_BODY = [
    '..............g.g.g...........',
    '............gbbbbbbbg..d......',
    '..........gbbbbbbbbbbbgdh.....',
    '........gbbbHHHHHHHHHbbdhd....',
    '......gbbHHHHHHHHHHHHHdHHd....',
    '....hbbHHHHHHHHHHHHHHdhHHHd...',
    '...hHHHhhhHhhhHhhHhhhdhHkHHd..',
    '..hHHhhhhhhhhhhhhhhhhdhhHHHHd.',
    '.hhHhhhhdhhhhdhhhdhhhdhhhhHHsS',
    '.d.hhhhhhhhhhhhhhhhhhdhhhhhhsS',
    '.g.dhhdhhhhdhhhdhhhdhdhhhhhhSn',
    '...ddhhhhhhhhhhhhhhhhdhhhtTdd.',
    '....ddhhhdhhhhdhhhhhhdddTd....',
    '.....ddddhhhhhhhhhhhdd........',
]
# short legs: a stiff little trot
BOAR_LEGS = [
    [
        '.....ddd.dd.......ddd.hd......',
        '.....hd...dd......dd..hd......',
        '.....hd...dd.....dd....hd.....',
        '....hd.....dd....dd....hd.....',
        '....KK.....KK....KK.....KK....',
    ],
    [
        '.....ddd.dd.......ddd.hd......',
        '......hd.dd.......dd.hd.......',
        '......hd.dd.......dd.hd.......',
        '......hd.dd......dd..hd.......',
        '......hd..dd.....dd..hd.......',
        '......KK..KK.....KK..KK.......',
    ],
]


def boar():
    f0 = lay(30, 20, (0, 15, BOAR_LEGS[0]), (0, 1, BOAR_BODY))
    f1 = lay(30, 20, (0, 14, BOAR_LEGS[1]), (0, 0, BOAR_BODY))
    return [f0, f1]


# ================================================================ deer
DEER_PAL = {'R': '#d0844e', 'r': '#a65e34', 'q': '#7a4024', 'w': '#f6eee2', 'W': '#d2c6b2',
            'A': '#eadcbc', 'a': '#b49e7c', 'n': '#2a1a14', 'k': '#140c08', 'K': '#2e221c', 'e': '#e8b09a'}
DEER_BODY = [
    '....................a.A..A....',
    '....................a.A.A.....',
    '.....................a.AA.....',
    '.....................a.A......',
    '..................reraA.......',
    '...................rRRRRRr....',
    '...................rRRRRkRr...',
    '...................rRRRRRRRrn.',
    '...................rrRRRrWww..',
    '..................rRRrrqWw....',
    '.................rRRrrW.......',
    '...wW..........rRRRrrW........',
    '..wwWRRRRRRRRRRRRRRrrW........',
    '..wWrRRRRRRRRRRRRRrrrW........',
    '..WWrrRRrrrrrrrrrrrrrr........',
    '...qrRRrrrrrrrrrrrrrrq........',
    '...qrRrrrrrrrrrrrrrrrq........',
    '...qqrrrqqqqqqqqqrrrq.........',
    '....qqr.........rrq...........',
]
# slender legs: a walk, the far foreleg lifted in the second frame
DEER_LEGS = [
    [
        '....rR.q........q.Rr..........',
        '....rR.q........q..Rr.........',
        '...rR..q.......q...Rr.........',
        '...r....q......q....r.........',
        '..r.....q......q....R.........',
        '..r.....q.....q.....R.........',
        '..r.....q.....q.....r.........',
        '..r.....q.....q......r........',
        '..r.....q.....q......r........',
        '.KK.....KK...KK......KK.......',
    ],
    [
        '.....rRq.........qRr..........',
        '.....rRq.........qRr..........',
        '.....rRq.........q.R..........',
        '......rq........q..R..........',
        '......r.q.......q..R..........',
        '......r.q......q...r..........',
        '......r..q.....q...r..........',
        '......r..q....KK...r..........',
        '......r..q.........r..........',
        '......r..q.........r..........',
        '.....KK..KK........KK.........',
    ],
]


def deer():
    f0 = lay(30, 30, (0, 20, DEER_LEGS[0]), (0, 1, DEER_BODY))
    f1 = lay(30, 30, (0, 19, DEER_LEGS[1]), (0, 0, DEER_BODY))
    return [f0, f1]


# ---------------------------------------------------------------- Bonespine (an old thornback as big as a pony)
BONESPINE_PAL = dict(BONE, W='#dad8d2', w='#b0ada6', v='#86837c', V='#5e5b56', g='#f2efe8', x='#6e6b66',
                     p='#e8e6e2', P='#bebcb6', r='#d8a898', R='#9a6458', k='#26221e', E='#ff7a32', e='#ffc060',
                     m='#2a1a1a', t='#f4f0e4', n='#1c1a18')
BONESPINE = [
    '.................B.......B..................W.W.......',
    '..................B.......Bb.....B......Vv..WvW.......',
    '..................Bb......Bbb.....B....vVVv.WvWW......',
    '............B......Bb......Bbbc...Bb..wWWWWWWWWWWw....',
    '.............B.....Bbc.....Bbbc....BcwWWWWWWWWkkkWw...',
    '......B......Bb.....Bbc.....Bbbc...BwWWWWWWWWWkEeWWw..',
    '.......B......Bb....Bbc.WWWWWWWWWW.wWWWWWWWWWWWWWrWWw.',
    '.......Bb.....Bbc..WWWWWWWgWWwWWwWwWWWWWWWWwwwwwWWrWWW',
    '........Bc...WWWWWWwWWwgwwwwwwwgwwwWWWWWWWwppwwwwwwrvn',
    '........WWWWWWWwgWwwwwwwwvwwwwwwwwwWgWWWWwpppppwwwmmmn',
    '.....WWWwWgwWwwwwwwgwwwwwvwwwwwwwwwWWWWWwpppppmtmtmtv.',
    '...WWWwwwwwwgwwwwwwwwwwwwwvwwrwrwrwWWWWwpppppPvvvvvv..',
    '..WwWwvwwwwwwwwxwwwwwwwwxwvwwwRwRwRWWWwpppppPPvvvvv...',
    '.Wwwww.WwwwwwwgwwwwwwgwwwwvwwwRwRwRWWwpppppPPPvvV.....',
    '.Wwwww.WwwwwwwwwwwwwwwwwwwvwwwwRwRwRwppppPPPPV........',
    '.Wwwww.WwvwwwwwwwgwwxwwwwwvwwwwwRwRwRwpPPPwwV.........',
    '.Wwwww.WwwvxwwwwwwwwwwwwwwwvwwwwwwwwwwpPPwwv..........',
    '.Wwwww.WwwwvwwwwwwwwwwwwwwwvwwwwwwxwwwpPPPwV..........',
    '.Wwwww.WwwwvwwwwwwxwwwwwwwwwwwwwwwwwwwpPPwv...........',
    '.Wwwww.WwwwwvwwwwwwwwwwwwwwwwxwwwwwwwpPPwwV...........',
    '.Wwwwv.WwwwwwvwwwwvvvvvvvwwwwwwwwwwwwpPPwv............',
    '.vwwwV.vwwwwwwwwwvVVVVVVVvvwwwwwwwwwwpPPwV............',
    '.Vwwv..VvwwwwwwwvV.......VVvvwwwwwwwwwwwv.............',
    '..vvV...VvvvvvvvV..........VVvvvvvvvvvvvV.............',
    '..VV.....VVVVVVV.............VVVVVVVVVVV..............',
]
BONESPINE_LEGS = [
    [
        '.........WwwvvvV.............vvV..Wwwv................',
        '........Wwwv..vvV...........vvV....Wwwv...............',
        '.......Wwv.....vvV.........vvV......Wwv...............',
        '......Wwv......vV..........vV.......Wwv...............',
        '......Ww........vV........vV.........Wwv..............',
        '.....Ww.........vV........vV.........Ww...............',
        '....Ww...........vV......vV...........Ww..............',
        '...vVVV..........VVVV....VVVV.........vVVVV...........',
    ],
    [
        '..........WwwvvV.............vvV..Wwwv................',
        '..........Wwv.vvV............vvV..Wwwv................',
        '.........Wwv..vvV...........vvV...Wwv.................',
        '.........Wwv...vV..........vV......Wwv................',
        '..........Ww...vV.........VV.......Ww.................',
        '..........Ww...vV..................Ww.................',
        '..........Ww...vV..................Ww.................',
        '..........Ww...vV..................Ww.................',
        '.........vVVV..VVVV...............vVVVV...............',
    ],
]


def bonespine():
    f0 = lay(54, 34, (0, 26, BONESPINE_LEGS[0]), (0, 1, BONESPINE))
    f1 = lay(54, 34, (0, 25, BONESPINE_LEGS[1]), (0, 0, BONESPINE))
    return [f0, f1]


# ================================================================ Weepwood spider
SPIDER_PAL = {'P': '#7a5682', 'p': '#52365c', 'o': '#36243e', 'M': '#ece4d0',
              'E': '#f4f0e6', 'e': '#c8bcc0', 'F': '#c8b496'}
SPIDER = [
    [
        '............................',
        '...pPPPp...........oo.......',
        '.pPPPMPPPp.........o.o.P....',
        'pPPMPPPPMPp.......o..oP.P...',
        'pPPPPPPPPppo......o..P...P..',
        'PPMPPMPPMppo......o..P...P..',
        'pPPPPPPpppoo.pPPpo..P.....P.',
        'ppPPMPPMppoopPPPPEpP......P.',
        '.pppppppoooppPPPEeEPP.....p.',
        '...ooooo..ooPpPPPPPF.P....p.',
        '.......PPPPopPpppppF.P....p.',
        '........oooPPPPooo...P....p.',
        '.....p.o...p..........p....p',
        '....p..o..p...........p....p',
        '....p.o...p...........p....p',
        '...p......p...........p....p',
    ],
    [
        '............................',
        '...pPPPp..........oo........',
        '.pPPPMPPPp........o.o.P.....',
        'pPPMPPPPMPp.......o.oP.P....',
        'pPPPPPPPPppo......o..P..P...',
        'PPMPPMPPMppo.....o..P...P...',
        'pPPPPPPpppoo.pPPpo..P....P..',
        'ppPPMPPMppoopPPPPEpP.P...P..',
        '.pppppppoooppPPPEeEPP.P..p..',
        '...oooooPPoopPPPPPPF...P.p..',
        '..........PPppPppppF....Pp..',
        '......p...ooPPPooo.......p..',
        '......p..o..p............pp.',
        '.....p..o...p............pp.',
        '.....p..o...p............p.p',
        '.....p......p............p..',
    ],
]


def spider():
    return [lay(28, 16, (0, 0, f)) for f in SPIDER]


# ---------------------------------------------------------------- spiderling and egg sac
SPIDERLING_PAL = {'P': '#b89cbc', 'p': '#8c6e94', 'o': '#62486a', 'M': '#f6eedc', 'E': '#fffaf0'}
SPIDERLING = [
    [
        '........P...',
        '.pPp...P.P..',
        'pPMPp.P...P.',
        'pPPPpPPE..P.',
        '.ppopPPPP..P',
        '..o.oooo.P.P',
        '.p..p...P..P',
        'p...p...P..P',
    ],
    [
        '.......P....',
        '.pPp..P.P...',
        'pPMPp.P..P..',
        'pPPPpPPE..P.',
        '.ppopPPPP..P',
        '...ooooo.P.P',
        '..p..p...P.P',
        '..p..p..P..P',
    ],
]


def spiderling():
    return [lay(12, 8, (0, 0, f)) for f in SPIDERLING]


EGG_PAL = {'S': '#f6f2e8', 's': '#dcd6c8', 'z': '#b4ac9c', 'Z': '#8a8474', 'v': '#d0b6b6', 'V': '#e092a6',
           'w': '#e4e0d6'}
EGGSAC = [
    [
        '..............',
        '..............',
        '.....sSSs.....',
        '...sSSSSSsz...',
        '..sSSSSSSssz..',
        '..SSSSSSsssz..',
        '..SSSvSssssz..',
        '..sSSvSssvsz..',
        '..sSSSvvvszz..',
        '..zssSvssszZ..',
        '...zsssvszZ...',
        '....zzzzzZ....',
        '.....zzZZ.....',
        '....w..w.w....',
        '...w...w..w...',
        '..w....w...ww.',
    ],
    [
        '..............',
        '.....sSSs.....',
        '...sSSSSSsz...',
        '..sSSSSSSssz..',
        '.sSSSSSSSsssz.',
        '.SSSSSSSssssz.',
        '.SSSSVSsssVsz.',
        '.sSSSVSsVVssz.',
        '.sSSSVVVssszz.',
        '.zsSSSVsssszZ.',
        '..zsssVssszZ..',
        '...zzzzzzZZ...',
        '....zzzZZZ....',
        '....w..w.w....',
        '...w...w..w...',
        '..w....w...ww.',
    ],
]


def eggsac():
    return [lay(14, 16, (0, 0, f)) for f in EGGSAC]


# ---------------------------------------------------------------- the Brood Mother (optional boss)
BROOD_PAL = {'P': '#76527e', 'p': '#4e3458', 'o': '#33223d', 'O': '#20152a', 'h': '#1c1222',
             'M': '#ece4d0', 'm': '#b8ab92', 'k': '#1a1020', 'E': '#f6f2e8', 'e': '#c8b8c4', 'F': '#dccaa6',
             'w': '#e6e2da'}
BROODMOTHER = [
    [
        '................................................................',
        '................................................................',
        '................................................................',
        '.............h.....h..............................ppo...........',
        '.............ppPPPPPoo.......................oO...ppppo.........',
        '........h.ppPPPPPPPPPPPoh....................ooO..ppoppo........',
        '........ppPPPppPppPppPPPPoo..................oOoOppo..ppo.......',
        '.......ppPppmMMMMMmppppppPoo................oO...ppo...pppo.....',
        '....h.pppppmMMMMMMMMmppppppoh...............oO...ppo.....ppo....',
        '.....pppppmMMMMMMMMMMmppppppoo..............oO..ppo......ppo....',
        '....ppppppMMkkkMMkkkMmpppppppoo.............oO..ppo......ppo....',
        '...ppmMpppMMkkkMMkkkMmppppppppoo............oO..ppo......ppo....',
        '...pPpmMppmMMkMMMMkMmpppppppppoh............oO..ppo.......ppo...',
        '..pPpppppppmMMMkMMMmpppppppppppoo..........oppo.ppo.......ppo...',
        '..pPppppppppMkMkMkMmpppppppppppoo..........opppopo.......hppo...',
        '..PPpppppppppmMmMmpppppppppppppoo..........oppppoo........ppo...',
        '..PPmMpppppppppppppppppppppppppoo...ppPPPoEkEkEppo........ppo...',
        '..pPpmMppppppppppppppppppppppppoo.ppPPPPPeEkEEkeppo.......ppo...',
        '..oPpppppppppppppppppppppppppppppPPPPppPppkEkEkpppo.......ppo...',
        '..OppppppppppppppppppppppppppppppPpppppppppepeppppo.......ppo...',
        '...opppppppppppppppppppppppppppppPppppppppppopppppo........ppo..',
        '...OopmMppppppppppppppppppppppopppppppppppppopppppo........ppo..',
        '.w..OopmMpppppppppppppMmpppppoOpppppppppppppopPpppo........ppo..',
        '.w...OoppppppppppppppmMpppppoO.oppppppppppppopPPppo........ppo..',
        'w.....OopppppppppppppppppppoO..Oopppppppppppooppopo........ppo..',
        'w......OoopppppppppppppppooO....OopppppppppopFO.Fpoh.......ppo..',
        '.w......OOooopppppppppoooOO......OoopppppppooF..Fpo........ppo..',
        '.w..w.....OOOoooooooooOOO........oOOoooooppoO.F.pFo........ppoh.',
        '..w..w.......OOOOOOOOO.........oOppooppoOOO.....ppo.........ppo.',
        '..w..w.......................ppooooppoo..........ppo........ppo.',
        '.w....w...................ppooo...ppo............ppo........ppo.',
        '.w....w...............ppooooO....ppo.............ppoh.......ppo.',
        '..w....w............ppoo..oO...ppoo..............ppo........ppo.',
        '...w...w...........ppo...oO...ppo................ppo.......hppo.',
        '...w.............ppoo...oO...ppo.................ppo........ppo.',
        '..w............hppo....oO...ppo..................ppo........ppo.',
        '..w............ppo....oO....ppo..................ppo.........ppo',
        '...w.........ppoo..........ppo...................ppo.........ppo',
        '....w.......ppo...........ppo....................ppo.........ppo',
        '....w......ppo...........ppo.....................ppo.........ppo',
    ],
    [
        '................................................................',
        '................................................................',
        '.................................................ppo............',
        '.................................................pppo...........',
        '.............hpPPPPhoo...........................pppppo.........',
        '..........ppPPPPPPPPPPPoo...................oO..ppo..ppo........',
        '........hpPPPppPppPppPPPhoo.................ooO.ppoh..ppo.......',
        '.......ppPppPppppppppppppPoo................oOoOppo....ppo......',
        '......ppppppmMMMMMmppppppppoo...............oO..ppo....ppo......',
        '....hppppppmMMMMMMMMmpppppppho..............oO..ppo....ppo......',
        '....ppppppmMMMMMMMMMMmpppppppoo............oO..ppo.....ppo......',
        '...pppppppMMkkkMMkkkMmppppppppoo...........oO..ppo.....ppo......',
        '...pPmMpppMMkkkMMkkkMmppppppppoo...........oOppopo.....ppo......',
        '..pPppmMppmMMkMMMMkMmppppppppppho..........oOpppoo......ppo.....',
        '..pPpppppppmMMMkMMMmpppppppppppoo..........oppopppo.....ppo.....',
        '..PPppppppppMkMkMkMmpppppppppppoo..........oppoppppo....ppo.....',
        '..PPpppppppppmMmMmpppppppppppppoo...ppPPPoEkEkEpo.ppo...ppo.....',
        '..pPmMpppppppppppppppppppppppppoo.ppPPPPPeEkEEkeo.ppo...ppo.....',
        '..oPpmMppppppppppppppppppppppppppPPPPppPppkEkEkpo.ppo...ppo.....',
        '..OppppppppppppppppppppppppppppppPpppppppppepeppo.ppo...ppo.....',
        '...opppppppppppppppppppppppppppppPpppppppppppoppo.ppo...ppoh....',
        '...Oopppppppppppppppppppppppppoppppppppppppppopo..ppo...ppo.....',
        '.w..OomMpppppppppppppppppppppoOpppppppppppppopPp...ppo..ppo.....',
        '.w...OomMpppppppppppppMmppppoO.oppppppppppppopPPp..ppo..ppo.....',
        'w.....OopppppppppppppmMppppoO..Oopppppppppppooppo..ppo...ppo....',
        'w......OoopppppppppppppppooO....OoppppppppppoFO.F..ppo...ppo....',
        '.w......OOooopppppppppoooOO......OoopppppppooF..F..ppo...ppo....',
        '.w.w......OOOoooooooooOOO.........OOoooooppoO.F..F.ppo...ppoh...',
        '..w.w........OOOOOOOOO..........ppoooppoOOO........ppo...ppo....',
        '..w.w.......................ppoooo..ppo............ppo...ppo....',
        '.w...w..................ppoooooO...ppo.............ppo...ppo....',
        '..w..w...............ppooo...oO...ppo..............ppo...ppo....',
        '...w..w.............ppo.....oO...ppo...............ppo...ppo....',
        '....w.w............ppo.....oO...ppo................ppo...ppoh...',
        '....w.............ppo.....oO...ppo..................ppo...ppo...',
        '...w.............hppo.....oO..ppo...................ppo...ppo...',
        '...w.............ppo.....oO...ppo...................ppo...ppo...',
        '....w...........ppo..........ppo....................ppo...ppo...',
        '.....w.........ppo...........ppo....................ppo...ppo...',
        '.....w........ppo...........ppo.....................ppo...ppo...',
    ],
]


def broodmother():
    return [lay(64, 40, (0, 0, f)) for f in BROODMOTHER]


# ================================================================ Mourning Light
LIGHT_PAL = {'W': '#ffffff', 'C': '#e4f4ff', 'h': '#b0dcff', 'H': '#84c0f4', 'o': '#5a96d6', 'O': '#3e72b4'}
LIGHT = [
    [
        '......o.......',
        '.....oh...o...',
        '...o.ohho.h...',
        '...hohHCHohh..',
        '..ohHCCWCCHho.',
        '..oHCWWWWWCHo.',
        '.ohCWWWWWWWCho',
        '.oHCWWWWWWWCHo',
        '.ohCWWWWWWWCho',
        '..oHCWWWWWCHo.',
        '..ohHCWWWCHho.',
        '...ohHCCCHho..',
        '....ohHHHho...',
        '.....oHHho....',
        '......ohHo....',
        '.......ohO....',
        '........hO....',
        '.........O....',
    ],
    [
        '........o.....',
        '...o...ho.....',
        '...h.ohhoo.o..',
        '..hhohHCHoho..',
        '..ohHCCWCCHho.',
        '..oHCWWWWWCHo.',
        '.ohCWWWWWWWCho',
        '.oHCWWWWWWWCHo',
        '.ohCWWWWWWWCho',
        '..oHCWWWWWCHo.',
        '..ohHCWWWCHho.',
        '...ohHCCCHho..',
        '....ohHHHho...',
        '....ohHHo.....',
        '....OhHo......',
        '....Oho.......',
        '....Oh........',
        '....O.........',
    ],
]


def mourning_light():
    return [lay(14, 18, (0, 0, f)) for f in LIGHT]


# ================================================================ Mourner
MOURNER_PAL = {'v': '#dadee6', 'V': '#aeb3be', 'u': '#848996', 'U': '#5c606c',
               'g': '#b0b2b8', 'G': '#8a8c94', 'H': '#666870',
               'f': '#f0f2f4', 'F': '#c4c8d0', 'k': '#24262e', 't': '#a8d4f4'}
MOURNER = [
    '........uuuu..........',
    '......uuvvvvu.........',
    '.....uvvVVVVvu........',
    '.....vVVVVVVvVu.......',
    '....uvVVVFFFFVu.......',
    '....vVVVFkfFkFu.......',
    '....vVVVfkffkfF.......',
    '....vVVVftfFfF........',
    '...uvVVVVfkkfF........',
    '...vVVVVVFfffF........',
    '...vVVVVgGGGGH........',
    '...vVVVVgGGGGGH.......',
    '..uvVVVgGGGGGGH.......',
    '..vVVVVgGGGGGGH.......',
    '..vVVVVgGGGGGGGH......',
    '..vVVVgGGGGGGGGH......',
    '..uVVVgGGGgGGGGH......',
    '..uVVVgGGGgGGGGHH.....',
    '...uVVgGGGgGGGGGH.....',
    '...uUVgGGGgGGGGGH.....',
    '....UUgGGGgGGGGGHH....',
    '.....gGGGGgGGGGGHH....',
    '....gGGGGgGGGGGGGH....',
    '....gGGGGgGGGGGGGHH...',
    '...gGGGGGgGGGGGGGHH...',
    '...gGGGGgGGGGGGGGGH...',
    '..gGGGGGgGGGGGGGGGHH..',
    '..gGGGGgGGGGGGGGGGHH..',
    '..gGGGGgGGGGGGGGGGGH..',
    '..gG.GGgG.GGGG.GGG.H..',
    '...G..G..G..GG...G....',
    '..........G.......G...',
]
MOURNER_ARM = [
    '..f.',
    '.ffF',
    '.fff',
    '.FfF',
    'gHH.',
    'gHH.',
    'HH..',
    'H...',
]
MOURNER_SWAY = {
    29: '..gG.GGgGG.GGGG.GGG.H.',
    30: '....G..G..G.GG...G.H..',
    31: '....G......G.......H..',
}


def mourner():
    f0 = lay(22, 32, (0, 0, MOURNER), (12, 6, MOURNER_ARM))
    # the second frame: a breath (everything above the waist sinks a pixel) and the hem sways
    f1 = [MOURNER_SWAY.get(y, r) for y, r in enumerate(MOURNER)]
    f1 = lay(22, 32, (0, 0, ['.' * 22] + f1[:20] + f1[21:]), (12, 7, MOURNER_ARM))
    return [f0, f1]


# ================================================================ Smotherer
SMOTHER_PAL = {'S': '#4e4846', 's': '#363130', 'k': '#1c1817', 'R': '#8a7f70', 'r': '#655c51', 'q': '#443d35',
               'c': '#8e6640', 'C': '#684a2a', 'D': '#3e2a18', 'E': '#ff8a3a', 'a': '#dcd8d0',
               'o': '#f0602a'}
SMOTHER = [
    '......................',
    '..........ccccc.......',
    '.........cCCCCCc......',
    '........cCCCCCCCc.....',
    '........cCCCCCCCCcc...',
    '......r.DDDDDDDDDD....',
    '....rrRrkSSSSSSSs.....',
    '...rRRRRrSSESSSEs.....',
    '..rRRaRRrsSSSSSSs.....',
    '..rRRRRRRrsSkokSs.....',
    '.rRRRRRRRRrsssss......',
    '.rRRRRRRRRRRrr........',
    '.rRRRRaRRRRRRrS.......',
    '.rRRRRRRRRRRrsSs......',
    '.qrRRRRRRoRRr.sSs.....',
    '..qrRRRRRRRRr..sSs....',
    '..qrRaRRRRRRr...sSs...',
    '..qqrRRRRRRRr...sSs...',
    '...qrRRRRoRRq...sSs...',
    '...qrRrRrRrRq..sSSSs..',
    '...q.q.qrq.q...sSkSs..',
    '...............s.s.s..',
]
SMOTHER_LEGS = [
    [
        '.....qrq..rRr.........',
        '.....qrq...rRr........',
        '....qrq....rRr........',
        '....sSs.....sSs.......',
        '...sSs......sSs.......',
        '...sSs.......sSs......',
        '...sSs.......sSs......',
        '..kSSs.......kSSs.....',
        '..kkkk.......kkkkk....',
    ],
    [
        '......qrqrRr..........',
        '......qrqrRr..........',
        '.......qrRr...........',
        '.......sSSs...........',
        '.......sSSs...........',
        '.......sSSs...........',
        '.......sSsSs..........',
        '......kSSkSSs.........',
        '......kkkkkkkk........',
    ],
]


def smotherer():
    f0 = lay(22, 30, (0, 21, SMOTHER_LEGS[0]), (0, 1, SMOTHER))
    f1 = lay(22, 30, (0, 21, SMOTHER_LEGS[1]), (0, 0, SMOTHER))
    return [f0, f1]


# ================================================================ Hanged poacher
POACHER_PAL = {'B': '#f7f3e6', 'b': '#dcd4bf', 'c': '#a99f86', 'C': '#6e6656', 'k': '#2a2622',
               'R': '#d8b46e', 'r': '#a8844a', 'Q': '#705430', 'e': '#ff5a4a', 'E': '#b8302a',
               'G': '#78a850', 'g': '#548038', 'h': '#3a5a28',
               'w': '#8a5e34', 'W': '#b88a58', 'x': '#5e3c1e', 's': '#e6dccb'}
POACHER = [
    '........................',
    '..........hgg...........',
    '.........hgGGg..........',
    '........hgGGGGGg........',
    '.......hgGGGGGGGgg......',
    '.......hgGGGGGGGGGg.....',
    '......hgGGGGGGGGGGgh....',
    '......hgGGhcbbbbbbc.....',
    '......hgGhkebbkebbc.....',
    '......hgGhkkbbEkbcc.....',
    '......hgGGhbbbbcckC.....',
    '......hgGGhbbcccCCC.....',
    '.....hgGGGGhbbbbbbb.....',
    '.....hgGGGGhcBCBCBC.....',
    '.....hgGGGQRRRRRRr......',
    '....hgGGGGQgGGGGGGg.....',
    '....hgGGGRgGGgGGgGGh....',
    '....hghGRhgh.gh.gh......',
    '.......Rccbbcbbcb.......',
    '.......rc...B...b.......',
    '.......Rc.bbcbb.b.......',
    '......rRcBBBBBBBb.......',
    '.....r.rCbbbkbbb........',
]
POACHER_SWAY = {
    17: '....hgGhRgh.gh.gh.h.....',
    18: '........Rcbbcbbcb.......',
    19: '........rc..B...b.......',
    20: '........Rc.bbcbb.b......',
    21: '.......rRBBBBBBBb.......',
    22: '......r.rbbbkbbb........',
}
POACHER_LEGS = [
    [
        '..........c...b.........',
        '..........c...b.........',
        '..........b...B.........',
        '..........c...b.........',
        '..........c...b.........',
        '..........c...b.........',
        '.........ccc..bbb.......',
    ],
    [
        '.........c.....b........',
        '.........c.....b........',
        '.........b.....B........',
        '.........c.....b........',
        '.........c.....b........',
        '.........c.....b........',
        '........ccc....bbb......',
    ],
]
POACHER_BOW = [
    'x..',
    'sw.',
    'sW.',
    's.W',
    's.W',
    's.W',
    's.w',
    's.w',
    'sBx',
    'sbx',
    's.w',
    's.w',
    's.w',
    's.w',
    'sw.',
    'sx.',
    'x..',
]
POACHER_ARM = [
    'b..',
    '.b.',
    '..B',
    '..b',
]


def hanged_poacher():
    out = []
    for f in (0, 1):
        body = [POACHER_SWAY.get(y, r) if f else r for y, r in enumerate(POACHER)]
        out.append(lay(24, 30, (0, 0, body), (0, 23, POACHER_LEGS[f]), (19, 12, POACHER_BOW), (17, 18, POACHER_ARM)))
    return out


# ================================================================ Tower Guard and crossbowman
TOWER_PAL = {'I': '#b4aea4', 'i': '#86807a', 'j': '#5a544e', 'u': '#a8623a',
             'm': '#8e8a84', 'M': '#5e5a56',
             'b': '#3c3644', 'B': '#28242e', 'p': '#8a5486', 'P': '#663c64', 't': '#ddd4ba',
             'S': '#aab0a6', 's': '#868c82', 'k': '#2c2e2c', 'E': '#e4ecd4',
             'L': '#d0d4d8', 'l': '#8e949c', 'h': '#5e3c1e', 'g': '#9a8a5e',
             'd': '#4a424a', 'D': '#2e2622'}
GUARD = [
    '..........................',
    '..........iiiii...........',
    '........iiIIjIuii.........',
    '.......iIIIIjIIIIj........',
    '......jjjjjjjjjjjij.......',
    '........sSSSSSSSs.........',
    '........SkSSSSkSs...l.....',
    '........SESSSSESs...Ll....',
    '........SSSSSSSsS...Ll....',
    '........SsmmmmsS....Ll....',
    '.........sSSSSs.....Ll....',
    '.......mMmMumMmMm...Ll....',
    'iiiiiiijmMbbbPPPMmM.Ll....',
    'iPPPbbbjMbbbbPPPPMmuLl....',
    'iPPPbbbjMbbbbPtPPmMmLl....',
    'iPPtbbbjMbbbbtttPMmMLl....',
    'iPtttbbjMbbbbtttPmMmLl....',
    'iPPPbbbjMbbbbPPPPMmgggg...',
    '.iPPbbj.MbbbbPPPPmSSh.....',
    '.iPPbbj.MbbbbPPPPMSSh.....',
    '..iPbj..ggggggggg.........',
    '...ij...MbbbbPPPPm........',
    '........MbbbbPPPPu........',
    '........mbbbbPPPPM........',
    '........mBbBbPpPpM........',
    '........MmMuMmMmMm........',
]
GUARD_LEGS = [
    [
        '.........ddd..ddd.........',
        '........ddd....ddd........',
        '........ddd....ddd........',
        '.......DDD......DDD.......',
        '......DDDD......DDDD......',
    ],
    [
        '.........ddddddd..........',
        '..........ddd.ddd.........',
        '..........ddd..ddd........',
        '.........DDD...DDD........',
        '.........DDDD..DDDD.......',
    ],
]


def tower_guard():
    f0 = lay(26, 32, (0, 27, GUARD_LEGS[0]), (0, 1, GUARD))
    f1 = lay(26, 32, (0, 27, GUARD_LEGS[1]), (0, 2, GUARD[:-1]))
    return [f0, f1]


XBOW_PAL = dict(TOWER_PAL, W='#b88a58', w='#8a5e34')
XBOW = [
    '.......mMmMumMmMm.........',
    '.......mMbbbPPPMmM..j.....',
    '.......MbbbbPPPPMmMs.I....',
    '.......MbbbbPtPPmMs..I....',
    '.......MbbbbtttPMs...I....',
    '.......MbbbbtttLLLLLLLLl..',
    '.......MbbWWwwwwwwwwwIww..',
    '.......MbbSSwPPSSs...I....',
    '.......MbbbbPPPPm.s..I....',
    '.......MbbbbPPPPM..s.I....',
    '........ggggggggg...j.....',
    '........MbbbbPPPPm........',
    '........MbbbbPPPPu........',
    '........mbbbbPPPPM........',
    '........mBbBbPpPpM........',
    '........MmMuMmMmMm........',
]


def tower_crossbowman():
    # the guard's helm and face (his sword cut away), then no shield and a crossbow held level
    body = GUARD[:11] + XBOW
    body = [r[:20] + '......' if y < 11 else r for y, r in enumerate(body)]
    f0 = lay(26, 32, (0, 27, GUARD_LEGS[0]), (0, 1, body))
    f1 = lay(26, 32, (0, 27, GUARD_LEGS[1]), (0, 2, body[:-1]))
    return [f0, f1]


# ================================================================ Sleeper (the old dead of the Lisle Barrow)
SLEEPER_PAL = {'A': '#9cd0ae', 'a': '#64a084', 'z': '#3e7060', 'Y': '#d8aa58', 'y': '#a87a3a',
               'S': '#94907e', 's': '#6c685a', 'k': '#221e18', 'e': '#c8f0b8',
               'F': '#a6804e', 'f': '#7a5a36', 'q': '#4c3822',
               'c': '#5e5a44', 'C': '#424030', 'w': '#7a6e56', 'W': '#56503e', 'D': '#2e281e'}
SLEEPER = [
    '..........................',
    '...........aaaa...........',
    '.........aAAAAAaz.........',
    '........aAAAYAAaaz........',
    '........aAAAAAAaaz........',
    '........aYyYyYyYyz........',
    '........aaSSSSSSaz........',
    '........aakeSSkeaz........',
    '........aaSSSSSsaz........',
    '.........asSkksSa.........',
    '..........sSSSSs..........',
    '.....qfFFfYyzzyYfFFfq.....',
    '....qfFFFFfYyyYfFFFFfq....',
    '....fFFfFFFfFFfFFfFFFfq...',
    '....fFfqfFFFFfFFFfqfFFq...',
    '...qfFfqcccccCCCCqfFFsS...',
    '...qffq.cCcccCCCC.qfsSS...',
    '....q...cCccccCCC..sSSs...',
    '....SS..cCccccCCC..sSS....',
    '...sSS..cCccccCCC.........',
    '...sSs..qqqqqqqqq.........',
    '........cCccccCCC.........',
    '........cCcccCCCC.........',
    '........cCcccCCCC.........',
    '........ccCccCcCC.........',
    '........c.C.c.C.C.........',
]
SLEEPER_LEGS = [
    [
        '.........wWW..wWW.........',
        '.........wWW..wWW.........',
        '........wWW....wWW........',
        '........wWW....wWW........',
        '.......DDDD....DDDD.......',
        '.......DDDD....DDDDD......',
    ],
    [
        '.........wWW.wWW..........',
        '.........wWWwWW...........',
        '..........wWWWW...........',
        '..........wWWWW...........',
        '.........DDDDDD...........',
        '.........DDDDDDD..........',
    ],
]


SLEEPER_SWORD = [
    '.Y..',
    'SSS.',
    'yYYy',
    '.YA.',
    '.YA.',
    '.YAa',
    '..YA',
    '..Ya',
    '..Ya',
    '...z',
]


def sleeper():
    f0 = lay(26, 32, (0, 26, SLEEPER_LEGS[0]), (0, 0, SLEEPER), (19, 18, SLEEPER_SWORD))
    f1 = lay(26, 32, (0, 26, SLEEPER_LEGS[1]), (0, 1, SLEEPER[:-1]), (19, 19, SLEEPER_SWORD[:-1]))
    return [f0, f1]


# ================================================================ goblins (the Greyfang outriders)
# the game's goblin (hdSprites.ts goblin()) as letters, without its club: the base for the trapper and the riders
GOB_PAL = {'A': '#a4dc70', 'a': '#6fb448', 'b': '#487c2e', 'B': '#2e5020', 'e': '#c07a60', 'Y': '#ffe45a',
           'y': '#d8b840', 'k': '#2a1a0a', 'm': '#3a1a10', 't': '#f4f1e0',
           'n': '#a8784a', 'N': '#7e552e', 'O': '#56381c'}
GOBLIN_HEAD = [
    '.A...........b........A.',
    '..AA......baAAAab...AA..',
    '...eAA...aAAAAAaaaAAAA..',
    '....eaAAbAAAAaBBBBBAA...',
    '.....eeaAAAayaaYYaAA....',
    '......aeAAaayaaYkbAaa...',
    '.......aaaaaaaabbbBab...',
    '........baaaabbbBBB.....',
    '.........aaabbmtmtm.....',
    '..........bbbBBBB.......',
]
GOBLIN_BODY = [
    '..........aAABa.........',
    '.......bbaAAAaaaa.......',
    '.......bbAAaaaaaa.......',
    '.......bbAaaaaaaa.......',
    '.......bnnnnnnnaAA......',
    '........NNNNNNNNAA......',
    '........NNNNNNNNN.......',
]
GOBLIN_LEGS = [
    [
        '........ObO.OAO.O.......',
        '.........bb..Aa.........',
        '.........bb..Aa.........',
        '........BBB..bbb........',
    ],
    [
        '........ObO.O.OaO.......',
        '........bb....Aa........',
        '........bb....Aa........',
        '.......BBB....bbb........',
    ],
]

TRAPPER_PAL = dict(GOB_PAL, F='#b08250', f='#80582e', q='#563a1c', R='#d4bc90', r='#9e8862', Q='#5e4c32')
TRAPPER_CAP = [
    '..qffq....',
    'qfFFFFfq..',
    'fFFFFFFFq.',
    'FFFFFFFFFq',
    'qfqfqfqfqf',
]
TRAPPER_NET = [
    '..rRr....',
    '.rRQRr...',
    'rRQRQRr..',
    'RQRQRQRr.',
    'rRQRQRQr.',
    '.RQRQRr..',
    '.rRQRr...',
    '..rRr....',
]
TRAPPER_STRAP = [
    'r...',
    '.r..',
    '..r.',
    '...r',
]
TRAPPER_COIL = [
    '.rRr.',
    'r...R',
    'R...R',
    'r...r',
    '.rRr.',
]


def goblin_trapper():
    out = []
    for f in (0, 1):
        out.append(lay(24, 24, (0, 3, GOBLIN_HEAD), (0, 13, GOBLIN_BODY), (0, 20, GOBLIN_LEGS[f]),
                       (8, 1, TRAPPER_CAP), (10, 13, TRAPPER_STRAP), (1, 11, TRAPPER_NET),
                       (18, 15 + f, TRAPPER_COIL)))
    return out


# goblin letters renamed so they sit beside the thornback's (bone B b c, eye R ...)
GOB_AS_RIDER = {'b': 'g', 'B': 'G', 'k': 'K', 'm': 'M', 't': 'T', 'n': 'j'}
RIDER_PAL = dict(THORN_PAL, A='#a4dc70', a='#6fb448', g='#487c2e', G='#2e5020', e='#c07a60', Y='#ffe45a',
                 y='#d8b840', K='#2a1a0a', M='#3a1a10', T='#f4f1e0', j='#a8784a', N='#7e552e', O='#56381c',
                 L='#d8dce2', l='#8e949c', h='#8a5e34', H='#b88a58', s='#a8784a', S='#7e552e', Z='#56381c')
# the goblin rider: torso seated on a saddle pad, the near leg hanging down the wolf's flank
RIDER_BODY = [
    '...aAABa.......',
    '.bbaAAAaaaa....',
    '.bbAAaaaaaaAA..',
    '.bbAaaaaaaaAA..',
    '.bnnnnnnnaa....',
    'sSSNNNNNNNSs...',
    'ZSSSSSSSSSSZ...',
    '.......aAa.....',
    '.......aAa.....',
    '........aA.....',
    '........bbb....',
]


# the chief's mount: a bigger thornback
CHIEF_WOLF = [
    '..............B.....B..........V..W.....',
    '...............B.....Bb..B....VvVWvW....',
    '.........B.....Bb....Bbc..B..wWWWWWWw...',
    '..........B.....Bb....Bbc.BcwWWWWWkkWw..',
    '.....B....Bb....Bc.WWWWWWW.wWWWWWWkRrWw.',
    '......B....Bc..WWWWwWWwWWwwWWWWWWWWWWWWw',
    '......Bc..WWWWWwWWwwwwwwwwwWWWWWWpwwwwvn',
    '.....WWWWWWwWWwwwwwwwwwwwwwWWWWWppPmtmtm',
    '...WWwWwWWwwwwwwwwwvwwwwwwwWWWWpppmmmmm.',
    '..WwWvwwwwwwwwwwwwwvwwwwwwwWWWpppPvvtv..',
    '.Wwww.WwwwwwwwwwwwwwvwwwwwwWWwppPPvvv...',
    '.Wwww.WwwwwwwwwwwwwwvwwwwwpPwwwwV.......',
    '.Wwww.WwvwwwwwwwwwwwwwwwwwpPwwwv........',
    '.Wwwv.WwwvwwwwvvvvwwwwwwwwpPwwwV........',
    '.vwwV.vwwwvwwvVVVVvvwwwwwpPwwwv.........',
    '.Vwv..VwwwwwvV....VVvvwwwpPwwvV.........',
    '..vV...vvvvvV.......VVvvvvvvvV..........',
    '..V....VVVVV..........VVVVVVV...........',
]
CHIEF_WOLF_LEGS = [
    [
        '.......WwvvV..........vV.Wwv............',
        '......Wwv..vV........vV...Wwv...........',
        '.....Wwv...vV........vV....Ww...........',
        '.....Ww.....vV......vV.....Ww...........',
        '....Ww......vV......vV......Ww..........',
        '..vVVV......VVV....VVV......vVVV........',
    ],
    [
        '........WwvV..........vV.Wwv............',
        '........WwvvV.........vV.Wwv............',
        '.......Ww..vV........vV...Ww............',
        '.......Ww..vV.......VV....Ww............',
        '........Ww.vV.............Ww............',
        '........Ww.vV.............Ww............',
        '.......vVVVVVV...........vVVV...........',
    ],
]


def chief_wolf():
    return [lay(40, 25, (0, 19, CHIEF_WOLF_LEGS[0]), (0, 1, CHIEF_WOLF)),
            lay(40, 25, (0, 18, CHIEF_WOLF_LEGS[1]), (0, 0, CHIEF_WOLF))]


def wolf_rider():
    out = []
    head = recolor(GOBLIN_HEAD, GOB_AS_RIDER)
    body = recolor(RIDER_BODY, GOB_AS_RIDER)
    for f, mount in enumerate(thornback()):
        b = 1 - f  # the rider rises and falls with the wolf's back
        mount = clear_spines(mount, 7, 18, 9)
        out.append(lay(38, 34, (2, 14, mount), (2, 5 + b, head), (9, 15 + b, body),
                       *spear(8, 21 + b, 37, 14 + b)))
    return out


# the outrider chief: a bigger goblin (the game's goblin head widened by two columns and a row),
# war paint, a tusk, a scar over the far eye, a fan of feathers on a band of bone beads, a fur mantle
CHIEF_HEAD = [
    '.A...........bbb........A.',
    '..AA......baAAAAAab...AA..',
    '...eAA...aAAAAAAAaaaAAAA..',
    '....eaAAbAkAAaaaBBBBBAA...',
    '.....eeaAAkayaaaaYYaAA....',
    '......aeAAakyaaaaYkbAaa...',
    '.......aaaaaaaaarrrbBab...',
    '.......aaaaaaaaaabbbBab...',
    '........baaaabbbbbBBBt....',
    '.........aaabbbbmtmtm.....',
    '..........bbbBBBBBB.......',
]
CHIEF_CREST = [
    '........F.....FF..........',
    '........Ff....ff.....F....',
    '.........ff...ff....fF....',
    '..........rr..rr...rr.....',
    '...........ff.ff..ff......',
    '............ff.ff.ff......',
    '.........oBoBoBoBoBoB.....',
]
CHIEF_BODY = [
    '.........qaAAAAga.........',
    '.....quUuUUuUUuUUuq.......',
    '....quUUUuUUUuUUUUuAA.....',
    '....qUq.gGaTcTcTaaaaAA....',
    '.....q..gGAaaaaaaaa.......',
    '........gjjjjjjjjjj.......',
    '....sSSSNNNNNNNNNNSs......',
    '....ZSSSSSSSSSSSSSSZ......',
    '.............aAAa.........',
    '.............aAAa.........',
    '..............aAa.........',
    '..............GGGG........',
]
CHIEF_PAL = dict(RIDER_PAL, f='#f0ece4', F='#2c2a32', o='#5a3a1e', u='#a8845a', U='#7a5a38', q='#4a3626',
                 r='#d8402a')


def outrider_chief():
    out = []
    head = recolor(CHIEF_HEAD, GOB_AS_RIDER)
    for f, mount in enumerate(chief_wolf()):
        b = 1 - f
        mount = clear_spines(mount, 7, 19, 8)
        parts = [(3, 13, mount), (7, 4 + b, head), (7, b, CHIEF_CREST), (7, 14 + b, CHIEF_BODY)]
        parts += spear(9, 27 + b, 43, 8 + b)
        parts += [(38, 12 + b, ['r']), (38, 13 + b, ['f']), (37, 13 + b, ['r']), (37, 14 + b, ['F'])]
        out.append(lay(44, 38, *parts))
    return out


# ================================================================ the Thane under the Hill (optional boss)
THANE_PAL = {'B': '#eee4ca', 'b': '#c8b894', 'c': '#968660',
             'Y': '#e4b862', 'y': '#b0803a', 'o': '#7a5222', 'A': '#8ac4a2',
             'W': '#f6f4ee', 'w': '#d4d0c6', 'v': '#a29e94',
             'S': '#a6aa9c', 's': '#7c8074', 'k': '#1c1a16', 'e': '#c8f0b8',
             'F': '#8e7656', 'f': '#66543c', 'q': '#40342a', 'G': '#86b494', 'g': '#5a8a6c', 'x': '#3a604a', 'd': '#5e5848', 'D': '#403c30',
             'h': '#8a5e34', 'H': '#5e3c1e'}
THANE_ANTLERS = [
    '.......b....c...................b....B........',
    '........b...b...................B...B.........',
    '........b...b...................B...B.........',
    '.....cbb.bc.b...................B..Bb.BBb.....',
    '........bbbcb...c...........b...B.BBBB........',
    '...........bb...b...........B...BBb...........',
    '............bc..b...........B...Bb............',
    '.............bc.b...........B..Bb.............',
    '..............bb.............BBb..............',
    '...............bc............Bb...............',
    '...............bc............Bb...............',
    '................bc..........Bb................',
    '.................bc........Bb.................',
]
THANE_HELM = [
    '.....yyyyyyo.....',
    '...yyYYYYYYyyo...',
    '..yyYYAYYYYYyyo..',
    '.yyYYYYYYYYAYyyo.',
    '.yyYYYYYYYYYYyyo.',
    'yyYyYyYyYyYyYyyyo',
    'yySkeSSyySkeSSsyo',
    'yySSSSSyySSSSssyo',
    '.yySSsSSySSsSsyo.',
    '.yyWWWWWsWWWWWyo.',
    '..WWWWWWWWWWWWwv.',
]
THANE_BEARD = [
    '.WWWwWWWwWWWwwv.',
    '.WWWwWWWwWWWwwv.',
    '..WWwWWWwWWwwv..',
    '..WWwWWWwWWwwv..',
    '..WWWwWWWwWwwv..',
    '...WWwWWWwWwv...',
    '...WWwWWWwwwv...',
    '...yYyyYyyyyo...',
    '....WwWWwwwv....',
    '....WwWWwwv.....',
    '.....WwWwwv.....',
    '.....WwWwv......',
    '......Wwwv......',
    '......Wwv.......',
    '.......v........',
]
THANE_BODY = [
    '.......qfFFFf..........fFFFfq.......',
    '.....qfFFFFFFFf......fFFFFFFFFfq....',
    '....qfFFFFfFFFFf....fFFFFfFFFFFfq...',
    '...qfFFFFFFFFfFFf..fFFFFFFFfFFFFFq..',
    '..qfFFfFFFFFFFFFf..fFFFFFFFFFFfFFFq.',
    '..qfFFFFFFfFFFFFf..fFFFFFfFFFFFFFFq.',
    '..qfFFFFFFFFFFFFf..fFFFFFFFFFFFFFFq.',
    '..qfFfqfFFFfqfFqf..fqFFFqfFFFfqfFq..',
    '..qfq.qfqgGgxgGgx....gGgxgGgqfq.qq..',
    '..qSs..qSxgGgxgGg....xgGgxgGxq......',
    '..sSSs..sgGgxgGgx....gGgxgGgxq......',
    '...sSs..SxgGgxgGgxgGgxgGgxgGxq......',
    '.....sSsgGgxgGgxgGgxgGgxgGgxgq......',
    '......ssxgGgxgGgxgGgxgGgxgGgxq......',
    '........gGgxgGgxgGgxgGgxgGgxgq......',
    '........xgGgxgGgxgGgxgGgxgGgxq......',
    '........qqqqqqqqyYYyqqqqqqqqqq......',
    '........gGgxgGgxgxxgxgGgxgGgxq......',
    '........xgGgxgGgxgGgxgGgxgGgxgq.....',
    '.......dgGgxgGgxgGgxgGgxgGgxgGd.....',
    '.......dDdDdDdDdDdDdDdDdDdDdDdD.....',
]
THANE_LEGS = [
    [
        '............dDDd.........dDDd...........',
        '............dDDd.........dDDd...........',
        '...........dqDDd..........dqDDd.........',
        '...........dDDd...........dDDDd.........',
        '...........dqDd...........dqDDd.........',
        '..........dDDd.............dDDDd........',
        '..........dqDd.............dqDDd........',
        '..........dDDd.............dDDDd........',
        '.........dqDd...............dqDDd.......',
        '.........dDDd...............dDDDd.......',
        '........fFFFf..............fFFFFf.......',
        '.......fFFFFf..............fFFFFFf......',
        '......qfFFFFq..............qfFFFFFf.....',
        '......qqqqqqq..............qqqqqqqq.....',
    ],
    [
        '.............dDDd.....dDDd..............',
        '.............dDDd.....dDDd..............',
        '.............dqDDd....dqDDd.............',
        '.............dDDDd....dDDDd.............',
        '.............dqDDd....dqDDd.............',
        '.............dDDDd.....dDDd.............',
        '.............dqDDd.....dqDd.............',
        '.............dDDDd.....dDDd.............',
        '.............dqDDd.....dqDd.............',
        '.............dDDDd.....dDDd.............',
        '............fFFFFf....fFFFFf............',
        '...........fFFFFFf....fFFFFFf...........',
        '..........qfFFFFFq....qfFFFFFf..........',
        '..........qqqqqqqq....qqqqqqqq..........',
    ],
]
THANE_AXE = [
    '...yY....',
    '..yYYy...',
    '.oyYYYy..',
    'hoyAYYYy.',
    'hoyYYAYYy',
    'hHoyYYYYY',
    'hHoyYYYYY',
    'hHoyYAYYY',
    'hHoyYYYYY',
    'hoyYYYYAy',
    'hoyAYYYy.',
    'hHyYYYy..',
    'hH.yYy...',
    'hH..y....',
]
THANE_HAND = [
    '.sSSs',
    'sSSSs',
    '.sss.',
]


def thane():
    out = []
    for f in (0, 1):
        b = f  # a heavy step: everything above the legs sinks a pixel
        parts = [(0, 40, THANE_LEGS[f]), (0, 2 + b, THANE_ANTLERS), (5, 19 + b, THANE_BODY),
                 (14, 10 + b, THANE_HELM), (15, 20 + b, THANE_BEARD), (37, 10 + b, THANE_AXE)]
        parts += [(37, y, ['hH']) for y in range(24 + b, 51)]
        parts += [(36, 28 + b, THANE_HAND)]
        out.append(lay(46, 54, *parts))
    return out


# ================================================================ Sir Garrick Thorne, the Queen's Jailer (boss)
GARRICK_PAL = {'I': '#c6cacf', 'i': '#8e949c', 'j': '#5c626c', 'u': '#a8603a',
               'R': '#b4524a', 'r': '#8a3a36', 'q': '#5e2624', 'Y': '#d4ae5c', 'y': '#9a7a3a',
               'k': '#121216', 'E': '#e6f4ff', 'L': '#1a1420', 'l': '#6a6078',
               'S': '#e2e6ea', 's': '#9aa0aa', 'h': '#5e3c1e'}
GARRICK_HELM = [
    '....rr......',
    '...rRrr.....',
    '..iIIIIi....',
    '.iIIIIIIIj..',
    'iIIIIIIIuIj.',
    'iYyYyYyYyYj.',
    'iIIIIIIIIIIj',
    'iIkkkkkkkkkj',
    'iIkEkkkkEkkj',
    'iIIIIIiIIIij',
    'iIIIIiiIIIij',
    '.iIIIIIIIij.',
]
GARRICK_TORSO = [
    '...iiiiiiiiiijjjj...',
    '.iIIuIIijjjjjiIIuIj.',
    'iIIIIIIIiRRRRiIIIIIj',
    'iIIIIIIiRRRRRRiIIIIj',
    'iiiiijjRRYRYRRRjiiij',
    '...jjRRRRYYYRRRRjj..',
    '....rRRRRyYyRRRRr...',
    '....rRRRRRRRRRRRr...',
    '....rRRRuRRRRRRRr...',
    '....rRRRRRRRRRRRr...',
    '....rRRRRRRRRqRRr...',
    '....rRRRRRRRRRRRr...',
    '....yYyYyYyYyYyYy...',
    '....rRRRRRRRRRRRr...',
    '...rRRRRRRYRRRRRRr..',
    '...rRRRRRRYRRRRRRr..',
    '...rRRRRRRYRRRRRRr..',
    '...rRRRRRRYRRRRRRRr.',
    '..rRRRRRRRYRRRRRRRr.',
    '..rRRRRRRRYRRRRRRRr.',
    '..rRRRRRRRYRRRRRRRRr',
    '..yYyYyYyYyYyYyYyYy.',
    '..rR.Rr.RRr.Rr.RRr..',
    '...r..r..r...r..r...',
]
GARRICK_ARM = [
    '.jIi......',
    '.jIu......',
    '.jIi......',
    '.jIIi.....',
    '.jIIi.....',
    '.jIi......',
    '.jIi......',
    '..LlLjIIi.',
    '..lLLjIIIi',
    '..L.ljiij.',
    '..l.......',
]
GARRICK_SHIELD = [
    'iiiiiiiiiiiij',
    'iRRRRRRRRRRrj',
    'iRRRRRRRRRRrj',
    'iRRRYRYRYRRrj',
    'iRRRYYYYYRRrj',
    'iRRRyYYYyRRrj',
    'iRRRRRRRRRRrj',
    'iRRuRRRRRRRrj',
    'iRRRRRRRRRRrj',
    'iRRRRRRRRRurj',
    'iRRRRRRRRRRrj',
    'iRRRRRRRRRRrj',
    '.iRRRRRRRRrj.',
    '.iRRRRRRRRrj.',
    '.iRRRRRRRRrj.',
    '..iRRRRRRrj..',
    '..iRRRRRRrj..',
    '...iRRRRrj...',
    '...iRRRRrj...',
    '....iRRrj....',
    '....iRRrj....',
    '.....iRj.....',
    '.....ij......',
]
GARRICK_LEGS = [
    [
        '...............jiij...iIIij.............',
        '...............jiij...iIIij.............',
        '..............jiij.....iIIij............',
        '..............jyij.....iYIIj............',
        '..............jiij.....iIIIj............',
        '.............jiij.......iIIij...........',
        '.............jiuj.......iIuij...........',
        '.............jiij.......iIIij...........',
        '............jiij.........iIIij..........',
        '............jiij.........iIIij..........',
        '............jiij.........iIIij..........',
        '...........jiiij.........iIIIij.........',
        '..........jjiiij.........iIIIIIj........',
        '..........jjjjjj.........jjjjjjj........',
    ],
    [
        '................jiij.iIIij..............',
        '................jiij.iIIij..............',
        '................jiij.iIIij..............',
        '................jyij.iYIIj..............',
        '................jiij.iIIIj..............',
        '................jiij..iIIij.............',
        '................jiij..iIIij.............',
        '................jiij..iIIij.............',
        '................jiij..iIIij.............',
        '................jiij..iIIij.............',
        '...............jiiij..iIIIij............',
        '..............jjiiij..iIIIIIj...........',
        '..............jjjjjj..jjjjjjj...........',
    ],
]


def garrick_sword(x, y):
    """The long sword held ready in the gauntlet at (x, y): pommel and grip below, a wide guard,
    and a long blade raised and leaning a little forward."""
    parts = [(x, y + 3, ['Y']), (x, y + 2, ['h']), (x - 2, y - 1, ['yYYYy'])]
    for k in range(19):
        py = y - 2 - k
        px = x + (k + 2) // 8
        parts.append((px, py, ['S' if k == 18 else 'Ss']))
    return parts


def garrick():
    out = []
    for f in (0, 1):
        b = f  # the second frame sinks a pixel mid-stride
        parts = [(0, 38 + b, GARRICK_LEGS[f]), (10, 12 + b, GARRICK_TORSO), (15, b, GARRICK_HELM),
                 (0, 14 + b, GARRICK_SHIELD)]
        parts += garrick_sword(32, 24 + b)
        parts += [(26, 17 + b, GARRICK_ARM)]
        out.append(lay(40, 52, *parts))
    return out


# ================================================================ crow (a decoration)
CROW_PAL = {'K': '#16141c', 'k': '#2a2a38', 'b': '#3c4662', 'B': '#62749c', 'n': '#4a4440', 'N': '#2e2a28',
            'e': '#d4d4dc', 'f': '#3a3230'}
CROW = [
    [  # perched
        '................',
        '..........kKKk..',
        '.........kbKeKnn',
        '.........kKKKKN.',
        '.......kkKKKKk..',
        '.....kkbBbKKK...',
        '...kkbBBbbKKk...',
        '.kkkbbbbkKKk....',
        'kkKKkkkkKKk.....',
        '.......ff.......',
        '......fff.......',
    ],
    [  # perched, looking back over its shoulder
        '................',
        '.........kKKk...',
        '.......nnKeKbk..',
        '........NkKKKk..',
        '.......kkKKKKk..',
        '.....kkbBbKKK...',
        '...kkbBBbbKKk...',
        '.kkkbbbbkKKk....',
        'kkKKkkkkKKk.....',
        '.......ff.......',
        '......fff.......',
    ],
    [  # flying, wings up
        '.k.k.k..........',
        '.kkkkkk.........',
        '..kbbbbk........',
        '...kbBBbk.......',
        '....kbBBbk..kK..',
        '..kkkkkbBKKKKenn',
        'KkkkkkkKKKKKKkN.',
        '.kk...kkkkk.....',
        '................',
        '................',
        '................',
    ],
    [  # flying, wings down
        '................',
        '................',
        '................',
        '................',
        '............kK..',
        '..kkkkkKKKKKKenn',
        'KkkkkbBBBbKKKkN.',
        '.kk.kbBBBbk.....',
        '...kbBBbk.......',
        '..kbbbbk........',
        '.k.k.kk.........',
    ],
]


def crow():
    return [lay(16, 11, (0, 0, f)) for f in CROW]


CREATURES2 = {
    'wolf': (wolf, WOLF_PAL),
    'thornback': (thornback, THORN_PAL),
    'bonespine': (bonespine, BONESPINE_PAL),
    'boar': (boar, BOAR_PAL),
    'deer': (deer, DEER_PAL),
    'spider': (spider, SPIDER_PAL),
    'spiderling': (spiderling, SPIDERLING_PAL),
    'eggsac': (eggsac, EGG_PAL),
    'broodmother': (broodmother, BROOD_PAL),
    'mourning_light': (mourning_light, LIGHT_PAL),
    'mourner': (mourner, MOURNER_PAL),
    'smotherer': (smotherer, SMOTHER_PAL),
    'hanged_poacher': (hanged_poacher, POACHER_PAL),
    'tower_guard': (tower_guard, TOWER_PAL),
    'tower_crossbowman': (tower_crossbowman, XBOW_PAL),
    'sleeper': (sleeper, SLEEPER_PAL),
    'thane': (thane, THANE_PAL),
    'goblin_trapper': (goblin_trapper, TRAPPER_PAL),
    'wolf_rider': (wolf_rider, RIDER_PAL),
    'outrider_chief': (outrider_chief, CHIEF_PAL),
    'garrick': (garrick, GARRICK_PAL),
    'crow': (crow, CROW_PAL),
}

if __name__ == '__main__':
    import sys
    ims = []
    for name, (make, pal) in CREATURES2.items():
        for fr in make():
            ims.append(render(fr, pal, 0.22))
    sheet(ims, scale=8).save(sys.argv[1])
    print('ok')
