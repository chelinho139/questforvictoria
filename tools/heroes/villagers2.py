"""The new people of Act II, hand-placed at the HD scale beside the Millbrook villagers
(villagers.py): Wren Ashdown, Hesketh and Ada Coll of Kilnholt, Grandad Pell, Mother Dunn,
Bess Tanner, Sir Garrick's ghost and the grey lantern. Each is one drawing (frame 0); the idle
frames move the head and body down a pixel (breathing) and sway hems, a braid tie and a candle
(the grey lantern has two frames instead: it swings on its ring). Face right, 3/4 view, in
natural colours (the game recolours them); Garrick's ghost is washed out to pale blue-greys.

Wren also walks, shoots and kneels beside the heroes: WREN_ART holds those frames, put together
from the parts of her drawing on a 26×34 canvas.

    python3 villagers2.py out.png    # magnified review sheet: everyone, then Wren's companion frames
"""
from tool import G, render, sheet
from villagers import SKIN, idle, grid

# ---------------------------------------------------------------- Wren Ashdown
WREN_PAL = dict(SKIN, f='#e8a07a', m='#c0644a',
                l='#d0814a', h='#a85a32', H='#7a3a20', J='#4e2414',
                g='#8e9a52', G='#6c7a3a', D='#4e5a28', X='#363e1c',
                o='#a08e58', O='#7a6a40', P='#564a2a',
                b='#b07844', B='#85532b', n='#5a3418',
                t='#8a6c4a', T='#665036', d='#6e4828', q='#4a2c16',
                w='#e0b070', W='#b07a40', v='#7a4a24', y='#ece4d0', r='#d8503e', e='#f4f0e6',
                z='#d0a870', N='#e4eaf2', M='#8e98ac')   # arrow shaft and head (her companion frames)
WREN = [
    '.....v................',
    '.....w................',
    '....w.....hhhh........',
    '....w...hllllhh.......',
    '...w...Hhlllhhhh......',
    '...w...HhhhSSSSh......',
    '...w...HhhSHSSHS......',
    '..w....HhsSESSES......',
    '..w....hHSfSfSkS......',
    '..w..e.HhsSSmmSs......',
    '..w..erhH.sSSSs.......',
    '..n..BOhHoOsSsoO......',
    '..n..oOhHOOPPPOOP.....',
    '..W.oOOJOOOOOOnOP.....',
    '..W.POPPDGGGGnGPP.....',
    '..W.PgDGGGGGnGDgD.....',
    '..W..gDGGGGSSbbBD.....',
    '...W.gDGGGnGGGDGD.....',
    '...W.gDGGnGGGGDD......',
    '...W.gDGnGGGGGD.......',
    '....WSSnnnnbnnn.......',
    '....WssGGGGGGGDD......',
    '.....WDGGGGDGGGD......',
    '.....v.tTT..ttT.......',
    '.......tTT..ttT.......',
    '.......tTT..ttT.......',
    '.......tTT..ttT.......',
    '.......bbB..bbB.......',
    '.......ddq..ddq.......',
    '.......ddq..ddq.......',
    '.......dddq.dddqq.....',
    '.......qqqq.qqqqq.....',
]
WREN_SWAY = {13: '..W.oOJOOOOOOOnOP.....'}

# ---------------------------------------------------------------- Hesketh Coll, the kiln-master
HESK_PAL = dict(SKIN, a='#d4d4da', A='#9a9aa6', x='#d0b8a4', X='#a8927e', c='#7a6c64',
                m='#a87a4e', M='#86603a', N='#5e4024',
                p='#6e5c4e', P='#54463c', Q='#3a302a',
                o='#6a5e54', O='#4c433c', d='#3a2a1e',
                i='#b0b4c0', I='#74788a', j='#4a4c58')
HESK = [
    '......................',
    '...............iiiiiiI',
    '...............I.I.I.I',
    '.......aaaa....I.I.I.I',
    '.....aaaaaaA...j.j.j.j',
    '....aAaSSSSAA.....I...',
    '....ASSSSSSSs.....I...',
    '....ASAASSAAs.....I...',
    '....sSSESSSEs.....I...',
    '....sSkSSSkks.....I...',
    '.....xcSSSSSx.....I...',
    '.....xxXkkkxx.....I...',
    '......xxXXxx......I...',
    '.....mMsSsMm......I...',
    '...mmMQpPPPQMMN...I...',
    '..mmMMpPPPPPpMN.SSI...',
    '..mMMNpPPPPPpMN.SSI...',
    '..mMMNpPPPPPpMMMMMI...',
    '..mMMNpPPPPPpMN...I...',
    '..SSMNpPPPPPpMN...I...',
    '..sSMQQQQQQQQMN...I...',
    '....mMpPPPPPpMN...I...',
    '....mMpPPPPPpMN...I...',
    '....mMpPPPPPpMN...I...',
    '...mmMpPPPPPpMNN..I...',
    '...mmMpPPQPPQMNN..I...',
    '...mMMQQPQQQQMNN..I...',
    '...M.MM.MMM.MM.N..I...',
    '.....oOO..oOO.....I...',
    '.....oOO..oOO.....I...',
    '....dddd..dddd....I...',
    '....dddd..dddd....j...',
]
HESK_SWAY = {27: '....MM.MMM.MM.MN..I...'}

# ---------------------------------------------------------------- Ada Coll, the woodcutter
ADA_PAL = dict(SKIN, h='#6a4430', H='#4a2c1c', J='#2e1a10',
               g='#a4b096', G='#7e8c74', D='#5c6a56', X='#404c3e', c='#c4ccb8',
               b='#9a6a3a', B='#6a4422', N='#e8eef4', n='#aab2c0', x='#6e7484',
               w='#c8965e', W='#8e6236', d='#5a3a24', e='#3e2616')
ADA = [
    '......................',
    '......hhh.............',
    '.....hhHHhhhhh........',
    '.....hHHhhhhhhh.......',
    '..x..hHhSSSSSSh.......',
    '.NnnwhhSHHSSHHS.......',
    '.NnnxhHSSESSSES.......',
    '.NnnxWhSSSSSSkS.......',
    '.nx..WhSSSSSSSs.......',
    '.....W.SSSkkSs........',
    '.....W..sSSSs.........',
    '....gWGGGsSsGGD.......',
    '...gGWGGGGGGGGGD......',
    '...gGWGGGGGGGGGDD.....',
    '...gGSSGGGGGGGGDD.....',
    '...gcSSsGGGGGGGDD.....',
    '...ccSsWGGGGGGcDD.....',
    '....SsGwGGGGGGcSS.....',
    '....GGGwGGGGGGDSS.....',
    '....bBbbbbbbbbbB......',
    '....GGGGGGGGGGGD......',
    '....GGGGGGGGGGGDD.....',
    '...gGGGGGGGGGGGDD.....',
    '...gGGGGGGGGGGGGD.....',
    '...gGGGGGGGGGGGGDD....',
    '..gGGGGGGGGGGGGGDD....',
    '..gGGGGGGGGGGGGGGD....',
    '..GDGGDGGGDGGDGGDD....',
    '......dee..dee........',
    '......dee..dee........',
    '.....ddee..ddee.......',
    '.....eeee..eeee.......',
]
ADA_SWAY = {27: '..DGGDGGGDGGDGGDGD....'}

# ---------------------------------------------------------------- Grandad Pell, the old poacher
PELL_PAL = dict(SKIN, c='#c0a888', C='#94795a', Z='#66513a', y='#ece2d0',
                w='#f6f6f2', W='#c8ccd4',
                g='#7e9a5c', G='#5e7a44', D='#445a32', X='#2e4024',
                p='#a8804e', P='#7a5a34', n='#5a4a3a',
                t='#6e604e', T='#504538', d='#4a3424', o='#b08a5a', O='#7a5a36', v='#4e3820')
PELL = [
    '......................',
    '......................',
    '......................',
    '......................',
    '......................',
    '......................',
    '...........ccycC......',
    '..........cyccCCZ.....',
    '.........CCCCCCZZZ....',
    '.........wwSSSSSw.....',
    '.....gGG.wWSESSES.....',
    '....gGGGGWSSSSSkk.....',
    '....gGGGGDsSWWWSs.....',
    '...gGGGGGGGDsSSSsD....',
    '...gGGGGGGGDDDDDDD....',
    '...gGGGGGGGGGgGGpP.oO.',
    '...gGGGGGGGGGDGGPpSS..',
    '...gGGGGGGGGGGDDDDSs..',
    '...gGGGGGGGGGDGDD..O..',
    '..SSgpPGGGGGGDGDD..O..',
    '..SSnnnnnnnnnnnnD..O..',
    '...gGGGGGGGGGDGDD..O..',
    '...gGGGGGGGGGDGGDD.O..',
    '...gGGGGGGGGGDpPDD.O..',
    '...gGGGGGGGGGDPpDD.O..',
    '...G.GG.GGG.GD.GD..O..',
    '.....tTT..tTT......O..',
    '.....tTT..tTT......O..',
    '.....tTT..tTT......O..',
    '.....tTT...tTT.....O..',
    '....dddd...dddd....O..',
    '....dddd...dddd....v..',
]
PELL_SWAY = {25: '....G.GG.GGG.GDGD..O..'}

# ---------------------------------------------------------------- Mother Dunn, the cook
DUNN_PAL = dict(SKIN, h='#f8f6f0', H='#d6d2ca', j='#aaa69e', n='#7a5640', r='#f08878',
                m='#a06c44', M='#7c5232', N='#58381e',
                a='#f6f2e8', A='#d8d0c0', z='#b2aa9a',
                w='#d8a868', W='#a07440', v='#6e4c28', d='#4a2c14', c='#c89a70')
DUNN = [
    '......................',
    '......................',
    '......................',
    '......hhhhhhh.........',
    '....hhhhhhhHHH..wvvvW.',
    '....hhhHnnnnHHh.wWWWv.',
    '...jhhSSSSSSSSs..WWv..',
    '...jHhSSESSSESs...W...',
    '..jj.hSrSSSSkrS...W...',
    '..j...SSSSkkSSs...W...',
    '.......sSSSSSs....W...',
    '.....mmMmmmmMMN...W...',
    '...mmMMMMMMMMMMMN.W...',
    '..mmMMaaaaaaaaMMMNW...',
    '..mMMMaaaaaaaaMMMNW...',
    '..mMMNaaaaaaaaMccSS...',
    '..mMMNaaaaaaaaANNSs...',
    '..ccMNaaaaaaaaANN.v...',
    '..SSMzzzzzzzzzzN......',
    '..SSMNaaaaaaaaANN.....',
    '..mMMaaaaaaaaaaAN.....',
    '..mMMaaaaaaaaaaANN....',
    '.mmMMaaaaaaaaaaANN....',
    '.mMMMaaaaaaaaaaANN....',
    '.mMMMaaaaaaaaaaANNN...',
    '.mMMMAaaaaaaaaAANNN...',
    'mmMMMMAAAAAAAAMMMNN...',
    'mMMMMMMMMMMMMMMMMNN...',
    'mMMMMMMMMMMMMMMMMMN...',
    '.M.MM.MMM.MM.MM.MN....',
    '......ddd..ddd........',
    '......ddd..ddd........',
]
DUNN_SWAY = {29: 'M.MM.MMM.MM.MM.M.N....'}

# ---------------------------------------------------------------- Bess Tanner, the widow
BESS_PAL = dict(SKIN, g='#c4c8d0', G='#9a9eaa', D='#727684', X='#50545e',
                n='#545066', N='#3e3a50', M='#2c283c',
                i='#6a5e50', I='#463c34', y='#ffe48a', Y='#fffae0', o='#f0a848', d='#2a2230')
BESS = [
    '......................',
    '......................',
    '........gggg..........',
    '......ggGGGGg.........',
    '.....gGGGGGGGD........',
    '.....gGDSSSSDGD.......',
    '.....gDSSSSSSDGD......',
    '.....gDSESSSESDD......',
    '.....gDSSSSSSSDD......',
    '.....gDSSSSSSsDD......',
    '.....gGDSSkkSDGD......',
    '.....gGGDsSSDGGD......',
    '....gGGGGGGGGGGGD.....',
    '....gGGGGGGGGGGGD.....',
    '....gGGGGGGGGGGGD.....',
    '....gGGGGGGGGGGGD.....',
    '....gGGGSSSSGGGGD.....',
    '....gGGGGSSSSGGGD.....',
    '....gGGDnnIiINDGD.....',
    '....gGDnnnIyINNDD.....',
    '....gD.nnnIoINN.D.....',
    '....D..nnnnINNN..D....',
    '.......nnnnnNNN.......',
    '.......nnnnnNNN.......',
    '......nnnnnnNNNM......',
    '......nnnnnnNNNM......',
    '......nnnnnnNNNM......',
    '.....nnnnnnnNNNMM.....',
    '.....nnnnnnnNNNMM.....',
    '.....N.NN.NNN.NN.M....',
    '........dd..dd........',
    '........dd..dd........',
]
BESS_SWAY = {19: '....gGDnnnIYINNDD.....', 20: '....gD.nnnIyINN.D.....',  # the candle flickers
             29: '....N.NN.NNN.NN.NM....'}

# ---------------------------------------------------------------- Sir Garrick Thorne's ghost
# Drawn in natural colours first (rusted royal plate, dull red surcoat, tarnished gold trim),
# then every tone washed out to a pale blue-grey; the surcoat and trim keep a whisper of rose.
GARR_PAL = {'a': '#edeff4', 'b': '#cfd7e2', 'c': '#a5b3c8', 'd': '#7d91b0', 'e': '#5d7497',
            'u': '#8a98b2', 'U': '#66789a',
            'r': '#b1939c', 'R': '#9e7984', 'q': '#89636f', 'y': '#c5afb6', 'Y': '#a78690',
            'S': '#dce3ec', 's': '#bcc7d6', 'k': '#9aa9c0', 'E': '#3c4862', 'h': '#b4c0d2', 'H': '#8e9cb6',
            'B': '#f2f5fa', 'L': '#c1cbd9', 'g': '#b6c2d4', 'G': '#7c90ae'}
GARR = [
    '..........................',
    '..........................',
    '.............hhhh.........',
    '...........hhhhhhh........',
    '..........hhhhhHHH........',
    '..........hhSSSSSS........',
    '..........hHkkSSkk........',
    '..........hSESSSES........',
    '..........HSsSSSkS........',
    '...........SSSSSSs........',
    '...........SSkkkSs........',
    '......abbc..sSSSsbbcc.....',
    '.....abbccdbccccdbcccdd...',
    '....abbcccdYYYYYYccccdde..',
    '...abbccuUdRyRyRycccuUde..',
    '...bcddddddRyyyyyddddddee.',
    '....bccudddRRRRRRcccddde..',
    '.....ddee.rRRgGRRqddee....',
    '....bcd...rRceedRq..cde...',
    '....acdd..rRdeeERq..acde..',
    '....bbccccccceedcccccdde..',
    '.....ddddddddeeEdddddde...',
    '.......rRRagggggGGRq......',
    '.......rRRRRRBLRRRRqq.....',
    '.......rRRRRRBLRRRRRq.....',
    '.......rRRRRRBLRRRRRqq....',
    '.......rRRRR.BLRRRRRqq....',
    '.......yYYYY.BLYYYYYYY....',
    '.........bccdBL.bccd......',
    '.........bccdBL.bccd......',
    '.........abcdBL.abcd......',
    '.........bccdBL.bcud......',
    '.........bccdBL.buUd......',
    '.........bccdBL.bccd......',
    '........bbccdBL.bbccd.....',
    '........ddddeL..ddddde....',
]
GARR_SWAY = {27: '.......YyYYY.BLYYYyYYY....'}

# ---------------------------------------------------------------- the grey lantern
# Far off between the trees at night: a pale lantern held at the waist, and behind it a tall
# hooded cloak drawn in near-night greys, so only its lit edge and the hood's tip really show.
LANT_PAL = {'g': '#5e6472', 'G': '#474c58', 'D': '#373a44', 'K': '#1e2026', 'l': '#8e8a7c', 'L': '#c4bfa4',
            'h': '#9a9ea8', 'i': '#8a8a94', 'I': '#5c5c66', 'y': '#fbf3c0', 'Y': '#ffffff', 'o': '#f0d070'}
LANT = [
    '................',
    '......gG........',
    '.....gGGD.......',
    '....gGGGGD......',
    '....gGKKKl......',
    '....gGKKKl......',
    '....gGGKKl......',
    '....gGGGGl......',
    '...gGGGGGGl.....',
    '...gGGGGGGl.....',
    '...gGGGGGGl.....',
    '...gGGGGGGGl....',
    '...gGGGGGGGl....',
    '...gGGGGGGGLl...',
    '...gGGGGGGGLl...',
    '...gGGGGGGGLhh..',
    '...gGGGGGGGLi...',
    '...gGGGGGGLIiI..',
    '...gGGGGGGIyYyI.',
    '...gGGGGGGIYYYI.',
    '...gGGGGGGIyYyI.',
    '...gGGGGGGIyoyI.',
    '...gGGGGGGLIII..',
    '...gGGGGGGLL....',
    '...gGGGGGGGl....',
    '...gGGGGGGGl....',
    '...gGGGGGGGD....',
    '...gDGGGGGGD....',
    '..gDDGGGGGGD....',
    '..gDDDGGGGDDD...',
    '..gDDDDDDDDDD...',
    '..gDDDDDDDDDDD..',
    '..DDDDDDDDDDDD..',
    '...D.DDD.DD.D...',
]
# the lantern swings forward a pixel on its ring
LANT_SWAY = {17: '...gGGGGGGLLIiI.', 18: '...gGGGGGGLIyYyI', 19: '...gGGGGGGLIYYYI',
             20: '...gGGGGGGLIyYyI', 21: '...gGGGGGGLIyoyI', 22: '...gGGGGGGLLIII.'}

VILLAGERS2 = {
    'wren': (WREN, WREN_PAL, 11, WREN_SWAY),
    'hesketh': (HESK, HESK_PAL, 18, HESK_SWAY),
    'ada': (ADA, ADA_PAL, 13, ADA_SWAY),
    'pell': (PELL, PELL_PAL, 18, PELL_SWAY),
    'dunn': (DUNN, DUNN_PAL, 11, DUNN_SWAY),
    'bess': (BESS, BESS_PAL, 12, BESS_SWAY),
    'garrick_ghost': (GARR, GARR_PAL, 21, GARR_SWAY),
    'lantern': (LANT, LANT_PAL, None, LANT_SWAY),
}


def frames2(name):
    """Idle frames, like villagers.frames(): four for the people (breathing and sway); two for
    the grey lantern (split None: no breathing, the sway rows swing the lantern)."""
    rows, pal, split, sw = VILLAGERS2[name]
    w = max(len(r) for r in rows)
    rows = [r.ljust(w, '.') for r in rows]
    sw = {k: v.ljust(w, '.') for k, v in sw.items()}
    if split is None:
        swung = [sw.get(y, r) for y, r in enumerate(rows)]
        return [grid(rows, w), grid(swung, w)]
    return idle(rows, split, sw, w)


# ---------------------------------------------------------------- Wren beside the heroes
# Her companion frames are put together from the parts of the drawing above (the same head,
# hood, tunic, legs and boots, in the same palette), on a 26×34 canvas: x as in the drawing,
# two rows more at the top, feet on rows 32-33. The bow is the one from her back, now in her
# left hand (the screen-right arm, with the bracer); the quiver's fletching shows over her
# right shoulder.
WC_W, WC_H, WDY = 26, 34, 2
W_HEAD = [(7, r[7:16]) for r in WREN[2:11]]          # rows 2-10 of the drawing
W_TORSO = [(6, 'OhHoOsSsoO'), (5, 'oOhHOOPPPOOP'), (4, 'oOOJOOOOOOnOP'), (4, 'POPPDGGGGnGPP'),
           (7, 'GGGGGnGD'), (7, 'GGGGnGGD'), (7, 'GGGnGGGD'), (7, 'GGnGGGGD'), (7, 'GnGGGGGD'),
           (7, 'nnnnbnnn'), (7, 'GGGGGGGDD'), (6, 'DGGGGDGGGD')]   # rows 11-22
W_TORSO_SWAY = {2: (4, 'oOJOOOOOOOnOP')}                 # the braid's tie swings
W_QUIVER = [(5, 9, 'e'), (5, 10, 'er'), (5, 11, 'B')]


class _W:
    """A frame being drawn, in the drawing's coordinates."""
    def __init__(self):
        self.g = G(WC_W, WC_H)

    def at(self, x, y, s):
        self.g.at(x, y + WDY, s)

    def put(self, x, y, rows):
        for i, r in enumerate(rows):
            self.at(x, y + i, r)

    def rows(self):
        return [''.join(r) for r in self.g.g]


def _w_line(v, x0, y0, x1, y1, ch):
    n = max(abs(x1 - x0), abs(y1 - y0))
    for i in range(1, n):
        v.at(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), ch)


def _w_leg(v, hx, dx, cols, foot, b=0, lift=False, toe=False):
    """One leg from the hip column hx (3 wide): trousers, the boot's turned-down cuff, the boot,
    then the foot (toe to the right) on rows 30-31. dx moves the ankle; lift bends the knee
    and raises the foot two rows (the passing leg of a stride); toe lifts the heel (pushing off)."""
    top = 23 + b
    if lift:
        offs = [0, 1, 1, 1, 0, -1]
        for i, o in enumerate(offs):
            y = top + i
            v.at(hx + o, y, cols if y < 27 else 'bbB' if y == 27 else 'ddq')
        v.at(hx - 1, top + len(offs), 'dddq')
        return
    m = 30 - top
    for y in range(top, 30):
        x = hx + round(dx * (y - top + 1) / m)
        v.at(x, y, cols if y < 27 else 'bbB' if y == 27 else 'ddq')
    if toe:
        v.at(hx + dx, 30, 'ddq')
        v.at(hx + dx + 1, 31, 'qqq')
        return
    v.at(hx + dx, 30, 'd' * (len(foot) - 1) + 'q')
    v.at(hx + dx, 31, 'q' * len(foot))


def _w_bow(v, gx, gy, mode='rest', up=12, down=9):
    """The longbow upright by its grip at (gx, gy), bellying forward; the string down its back.
    nock / draw pull the string back 2 / 7 px with an arrow on it; loose leaves it straight."""
    s = 2
    tipx = gx - s
    for dy in range(-up, down + 1):
        L = up if dy < 0 else down
        off = s * (1 - (dy / L) ** 2)
        v.at(tipx + round(off), gy + dy, 'n' if abs(dy) <= 1 else 'w' if dy < 0 else 'W')
    v.at(tipx, gy - up, 'v')
    v.at(tipx, gy + down, 'v')
    if mode in ('nock', 'draw'):
        nx = tipx - (2 if mode == 'nock' else 7)
        _w_line(v, tipx, gy - up, nx, gy, 'y')
        _w_line(v, nx, gy, tipx, gy + down, 'y')
        v.at(nx, gy, 'y')
        for x in range(nx + 1, gx + 3):
            v.at(x, gy, 'z')
        v.at(gx + 3, gy, 'N')
        v.at(gx + 2, gy - 1, 'M')
        v.at(gx + 2, gy + 1, 'M')
        v.at(nx + 1, gy - 1, 'r')
        v.at(nx + 1, gy + 1, 'e')
        return nx
    for y in range(gy - up + 1, gy + down):
        v.at(tipx, y, 'y')
    return tipx


def _w_body(v, b=0, sway=0):
    """Head, hood, tunic and the quiver's fletching, b rows lower."""
    for x, y, s in W_QUIVER:
        v.at(x, y + b, s)
    for i, (x, s) in enumerate(W_TORSO):
        x, s = W_TORSO_SWAY.get(i, (x, s)) if sway else (x, s)
        v.at(x, 11 + i + b, s)
    for i, (x, s) in enumerate(W_HEAD):
        v.at(x, 2 + i + b, s)


# the back arm (her right): hanging, swung forward and back
W_ARM_BACK = {
    'hang': [(5, 15, 'gD'), (5, 16, 'gD'), (5, 17, 'gD'), (5, 18, 'gD'), (5, 19, 'gD'), (5, 20, 'SS'), (5, 21, 'ss')],
    'fwd': [(5, 15, 'gD'), (5, 16, 'gD'), (6, 17, 'gD'), (6, 18, 'gD'), (7, 19, 'gD'), (7, 20, 'SS'), (7, 21, 'ss')],
    'back': [(5, 15, 'gD'), (5, 16, 'gD'), (4, 17, 'gD'), (4, 18, 'gD'), (3, 19, 'gD'), (3, 20, 'SS'), (3, 21, 'ss')],
}


def _w_front_arm(v, hx, b=0):
    """The bow arm out a little from her side, bent, the bracer on the forearm, the hand at
    (hx, 19 + b) just left of the bow's grip."""
    v.at(15, 15 + b, 'gD')
    v.at(15, 16 + b, 'gD')
    v.at(round(15 + (hx - 15) / 3), 17 + b, 'bB')
    v.at(round(15 + (hx - 15) * 2 / 3), 18 + b, 'bB')
    v.at(hx, 19 + b, 'SS')
    v.at(hx, 20 + b, 'Ss')


def wren_walk(f):
    """f 0..3: contact (right leg back), passing, contact (right leg forward), passing."""
    v = _W()
    dxA, dxB, liftA, liftB, b, arm, bow = [(-3, 3, False, False, 1, 'fwd', -1), (0, 0, False, True, 0, 'hang', 0),
                                           (2, -6, False, False, 1, 'back', 1), (0, 0, True, False, 0, 'hang', 0)][f]
    # her left leg (the far one) first, then her right over it; the trailing foot pushes off its toe
    _w_leg(v, 11, dxB, 'ttT', 'ddddq', b, liftB, toe=dxB < 0)
    _w_leg(v, 7, dxA, 'tTT', 'dddq', b, liftA, toe=dxA < 0)
    _w_body(v, b, sway=f % 2)
    for x, y, s in W_ARM_BACK[arm]:
        v.at(x, y + b, s)
    _w_bow(v, 20 + bow, 19 + b)
    _w_front_arm(v, 18 + bow, b)
    return v.rows()


def wren_stand(b=0, sway=0):
    """Standing with the bow in hand, the drawing's stance; b breathes the body down a row."""
    v = _W()
    _w_leg(v, 12, 0, 'ttT', 'ddddq')
    _w_leg(v, 7, 0, 'tTT', 'dddq')
    _w_body(v, b, sway)
    for x, y, s in W_ARM_BACK['hang']:
        v.at(x, y + b, s)
    _w_bow(v, 20, 19 + b)
    _w_front_arm(v, 18, b)
    return v.rows()


def wren_shoot(f):
    """f 0: nock (bow up, an arrow on the string); 1: full draw (bow arm out, string at her
    cheek); 2: loose (the string snapped straight, the arrow gone, the hand flung back)."""
    v = _W()
    _w_leg(v, 12, 1, 'ttT', 'ddddq')
    _w_leg(v, 7, -1, 'tTT', 'dddq')
    _w_body(v)
    if f == 0:
        _w_bow(v, 20, 15, 'nock')
        v.put(15, 13, ['gD', 'DbB', '.bbBS', '..Ss'])            # bow arm, forearm out to the grip
        for x, y, s in [(5, 15, 'gD'), (14, 15, 'SS'), (5, 16, 'gD'), (10, 16, 'gGGD'), (14, 16, 'Ss'),
                        (5, 17, 'gDgGGGD'), (6, 18, 'DDDDD')]:
            v.at(x, y, s)                                        # drawing arm across to the nock
    else:
        _w_bow(v, 21, 11, 'draw' if f == 1 else 'loose')
        v.put(15, 11, ['.gGbbBS', 'gDDbbBs'])                    # bow arm straight out
        if f == 1:
            v.put(4, 10, ['gGD', 'gGGGGgGGSS', '.DDDDDDDSs'])     # elbow back, hand at the cheek
        else:
            v.put(4, 10, ['gGD.SS', 'gGGDSs', '.DDD'])            # hand flung back past her ear
    return v.rows()


# her head bowed: more of the crown shows, eyes squeezed shut, teeth set
W_HEAD_BOWED = ['...hhhh..',
                '.hllllhh.',
                'Hhllllhhh',
                'Hhlllhhhh',
                'HhhhhSSSh',
                'HhhSSSSSS',
                'HhsHHSHHS',
                'hHSfSfSkS',
                '.HhsSmmSs']


def wren_kneel():
    """Badly hurt but not out: down on her right knee and hunched forward, head bowed, a hand
    pressed to her side, the other on the bow, which stands on its tip on the ground."""
    v = _W()
    # the near leg kneels: thigh down to the knee on the ground, the boot along it behind
    v.put(1, 27, ['......tTT',
                  '......tTT',
                  '......tTT',
                  '.dddbbtTT',
                  'qqqqqqqqq'])
    # the far leg: thigh out to the raised knee, shin straight down, foot flat
    v.put(10, 26, ['..ttT',
                   'tttttT',
                   '...ttT',
                   '...bbB',
                   '...ddq',
                   '...dddqq'])
    v.at(13, 31, 'qqqqq')
    # hunched: the shoulders and head pushed forward over the hips
    lean = [2, 2, 2, 2, 2, 1, 1, 1, 1, 0, 0, 0]
    for x, y, s in W_QUIVER:
        v.at(x + 2, y + 5, s)
    for i, (x, s) in enumerate(W_TORSO):
        v.at(x + lean[i], 16 + i, s)
    for i, s in enumerate(W_HEAD_BOWED):
        v.at(10, 9 + i, s)
    # the bow, leaning forward from its tip on the ground
    bow = _W()
    _w_bow(bow, 21, 22)
    for y, r in enumerate(bow.g.g):
        for x, ch in enumerate(r):
            if ch != '.':
                yy = y - WDY
                v.at(x + round((31 - yy) / 8), yy, ch)
    # the bow arm reaching down to the grip, the other hand pressed to her side
    v.put(17, 20, ['gD', 'gDD', '.bbB', '...SS', '...Ss'])
    v.put(7, 20, ['gD', 'gD', 'gDgGSS', '.DDDss'])
    return v.rows()


WREN_ART = {
    'pal': WREN_PAL,
    'walk': [wren_walk(f) for f in range(4)],
    'idle': [wren_stand(b, s) for b, s in ((0, 0), (0, 1), (1, 1), (1, 0))],
    'shoot': [wren_shoot(f) for f in range(3)],
    'kneel': [wren_kneel()],
}


if __name__ == '__main__':
    import sys
    from PIL import Image
    # top strip: every person, idle frames 0 and 2 (the lantern's two frames)
    ims = []
    for n in VILLAGERS2:
        pal = VILLAGERS2[n][1]
        fr = frames2(n)
        for f in ((0, 2) if len(fr) == 4 else (0, 1)):
            ims.append(render(fr[f].rows(), pal, 0.22))
    top = sheet(ims, scale=6)
    # bottom strip: Wren beside the heroes, every frame: walk, idle, shoot, kneel
    wren = [render(r, WREN_PAL, 0.22) for k in ('walk', 'idle', 'shoot', 'kneel') for r in WREN_ART[k]]
    bot = sheet(wren, scale=6)
    out = Image.new('RGBA', (max(top.width, bot.width), top.height + bot.height), (168, 184, 172, 255))
    out.paste(top, (0, 0))
    out.paste(bot, (0, top.height))
    out.save(sys.argv[1])
    print('ok')
