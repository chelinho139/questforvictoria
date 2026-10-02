"""Crafting art: cooked meat, iron and gold bars, the crafting button's hammer, and the HD
campfire (3 flame frames) and forge (2 glow frames) that stand in the world."""
import sys
from tool import G, render, sheet
from items import MEAT_ICON, MEAT_DROP

# ---------------------------------------------------------------- cooked meat: the raw cut, browned and grill-marked
COOKED_PAL = {'M': '#d48a52', 'm': '#a85a30', 'n': '#6e3018', 'f': '#f2c47c', 'B': '#fffaf0', 'b': '#d8ccb0', 'c': '#b0a488', 'g': '#4a1e10'}
def _grill(rows, marks):
    g = [list(r) for r in rows]
    for x, y in marks:
        if 0 <= y < len(g) and 0 <= x < len(g[y]) and g[y][x] in 'Mmnf':
            g[y][x] = 'g'
    return [''.join(r) for r in g]
COOKED_ICON = _grill(MEAT_ICON, [(7 + i, 3 + i) for i in range(6)] + [(5 + i, 5 + i) for i in range(6)] + [(9 + i, 2 + i) for i in range(5)])
COOKED_DROP = _grill(MEAT_DROP, [(4, 1), (5, 2), (3, 2), (4, 3), (6, 3), (5, 4)])

# ---------------------------------------------------------------- bars (ingots): lit top, front face, dark side
INGOT = ['......TTTTTTTT', '.....TTTTTTTTTs', '....TTTTTTTTTss', '...FFFFFFFFFFss', '...FFFFFFFFFFsk', '...ffffffffffk']
INGOT_DROP = ['..TTTTT', '.TTTTTs', 'FFFFFFs', 'fffffk']
IRON_BAR_PAL = {'T': '#e8eef6', 'F': '#a8b4c6', 'f': '#7a869c', 's': '#5c6684', 'k': '#3a4058'}
GOLD_BAR_PAL = {'T': '#fff4b0', 'F': '#f2c14e', 'f': '#c8902c', 's': '#a8701e', 'k': '#6a4410'}
def ingot_icon():
    g = G(20, 20)
    for y, r in enumerate(INGOT): g.at(2, 7 + y, r)
    g.at(7, 8, 'TT')  # a glint
    return g

# ---------------------------------------------------------------- hammer (the crafting button)
HAMMER_PAL = {'N': '#f4f8fc', 'O': '#c4cedc', 'U': '#8c98b0', 'V': '#5c6684', 'W': '#c08a58', 'w': '#8a5a30', 'x': '#5a3818'}
def hammer():
    g = G(20, 20)
    for i in range(10):  # handle, lit on its upper edge
        g.at(3 + i, 17 - i, 'W'); g.at(4 + i, 17 - i, 'w')
    g.at(2, 18, 'xx')
    # head: a square-ended iron block across the top of the handle (along the other diagonal)
    for t in range(-3, 4):
        for k in range(-1, 2):
            x, y = 13 + t + k, 5 + t - k
            ch = 'N' if k == 1 and t < 1 else 'O' if k == 1 or (k == 0 and t < 0) else 'U' if k == 0 else 'V'
            g.at(x, y, ch)
            if k == 0: g.at(x + 1, y, ch)  # fill the diagonal gaps
    return g

# ---------------------------------------------------------------- campfire (24×22): stones, crossed logs, three flame frames
CAMP_PAL = {'S': '#d4d8de', 's': '#a8aeb8', 'k': '#6e7480', 'W': '#b07844', 'w': '#7a4e28', 'c': '#f0d49a', 'e': '#ff8a3a', 'E': '#c8401e',
            'Y': '#fff6b0', 'O': '#ffb03c', 'R': '#ff6a2a', 'r': '#c8361c'}
STONES = [(1, 17, 'Ss'), (0, 18, 'Ssk'), (1, 19, 'sk'), (5, 15, 'Ss'), (4, 16, 'sk'), (10, 14, 'SS'), (9, 15, 'ssk'), (15, 14, 'Ss'), (15, 15, 'sk'),
          (19, 15, 'Ss'), (19, 16, 'sk'), (21, 17, 'Ss'), (21, 18, 'sk'), (4, 20, 'Ss'), (3, 21, 'skk'), (9, 21, 'Sss'), (9, 22, 'kkk'),
          (14, 21, 'Ss'), (14, 22, 'skk'), (19, 20, 'Ss'), (18, 21, 'skk')]
LOGS = [(5, 18, 'cWW'), (7, 17, 'WWw'), (9, 16, 'Ww'), (13, 16, 'wW'), (14, 17, 'wWW'), (16, 18, 'WWc'),
        (5, 19, 'Wwww'), (15, 19, 'wwwW'), (8, 18, 'ww'), (14, 18, 'ww')]
EMBERS = [(8, 19, 'eEeE'), (12, 19, 'Ee'), (9, 20, 'EeE'), (13, 20, 'eE')]
FLAMES = [
    ['....R....', '....RR...', '...RRR...', '...ROR.R.', '..RROORR.', '..ROOOOR.', '.RROYYOR.', '.ROOYYYOR', '.ROYYYYOR', 'RROYYYYOR', '.ROOYYOOR', '..rRRRRr.'],
    ['.....R...', '.R..RR...', '.R.RRR...', '.RRROR...', '..ROOOR..', '.RROOOOR.', '.ROOYYOR.', 'RROYYYOOR', '.ROYYYYOR', 'RROYYYYOR', '.ROOYYOOR', '..rRRRRr.'],
    ['...R.....', '...RR..R.', '...RRR.R.', '..RRORRR.', '..ROOOR..', '.RROOOORR', '.ROOYYOOR', '.ROYYYYOR', 'RROYYYYOR', '.ROYYYYOR', '.ROOYYOOR', '..rRRRRr.'],
]
def campfire(i):
    g = G(24, 23)
    for x, y, s in STONES[:7]: g.at(x, y, s)        # far stones, behind the fire
    for x, y, s in EMBERS + LOGS: g.at(x, y, s)
    for y, r in enumerate(FLAMES[i]): g.at(7, 5 + y, r)
    for x, y, s in STONES[7:]: g.at(x, y, s)        # near stones, in front
    return g

# ---------------------------------------------------------------- forge (30×30): stone furnace with a glowing mouth and a chimney, anvil in front
FORGE_PAL = {'S': '#d4d8de', 'M': '#a8aeb8', 'D': '#7a808c', 'K': '#555a64', 'Y': '#fff6b0', 'O': '#ffb03c', 'R': '#ff6a2a', 'r': '#a8301a',
             'N': '#c4cedc', 'U': '#7a869c', 'V': '#4a5268', 'X': '#2e3446', 'W': '#9a6438', 'w': '#6a4020', 'k': '#3a3a40'}
def forge(i):
    g = G(30, 30)
    # chimney
    for y in range(1, 9): g.at(15, y, 'MMDK')
    g.at(14, 0, 'SMMDK')
    # dome of stone blocks: rows of courses, lit on the left
    dome = [(8, 7, 'SSMMMMMMMMDD'), (6, 8, 'SSMMMMMMMMMMDD'), (5, 9, 'SMMMMMMMMMMMMDK'), (4, 10, 'SSMMMMMMMMMMMMDK'), (4, 11, 'SMMMMMMMMMMMMMDK'),
            (3, 12, 'SSMMMMMMMMMMMMMDK'), (3, 13, 'SMMMMMMMMMMMMMMDK'), (3, 14, 'SMMMMMMMMMMMMMMDK'), (3, 15, 'SMMMMMMMMMMMMMMDK'),
            (3, 16, 'SMMMMMMMMMMMMMMDK'), (3, 17, 'SMMMMMMMMMMMMMMDK'), (3, 18, 'SMMMMMMMMMMMMMMDK'), (3, 19, 'SDDDDDDDDDDDDDDKK'),
            (4, 20, 'KKKKKKKKKKKKKKK')]
    for x, y, s in dome: g.at(x, y, s)
    # mortar lines between the courses
    for y, off in ((10, 1), (13, 0), (16, 1)):
        for x in range(5 + off, 18, 4): g.at(x, y, 'D')
    # the mouth: an arch full of fire, flickering between frames
    glow = [['..rrrr..', '.rRRRRr.', 'rROOOORr', 'rROYYORr', 'rOYYYYOr', 'rOYYYYOr'],
            ['..rrrr..', '.rRRRRr.', 'rRROORRr', 'rROOYORr', 'rOYYYOOr', 'rOOYYYOr']][i]
    for y, r in enumerate(glow): g.at(7, 13 + y, r)
    g.at(6, 12, 'K'); g.at(15, 12, 'K')
    for y in range(13, 19): g.at(6, y, 'K'); g.at(15, y, 'K')
    g.at(7, 12, 'KKKKKKKK')
    # anvil in front, to the right
    anvil = [(17, 21, 'NNNNNNNNNU'), (15, 22, 'NNNNNNNNNNNUU'), (18, 23, 'UUUUUVV'), (19, 24, 'VVVVX'), (19, 25, 'VVVX'), (17, 26, 'XVVVVVVX'), (17, 27, 'XXXXXXXX')]
    for x, y, s in anvil: g.at(x, y, s)
    # a hammer resting by the anvil
    g.at(26, 23, 'w'); g.at(26, 24, 'w'); g.at(26, 25, 'W'); g.at(25, 22, 'VUV')
    return g

# ---------------------------------------------------------------- the chunky flat styles (4× pixels)
CAMP4 = [['..R..', '.ROR.', '.ROYR', 'wwOww', '.sws.'], ['...R.', '.RRR.', 'RROYR', 'wwOww', '.sws.'], ['.R...', '.ROR.', '.RYOR', 'wwOww', '.sws.']]
FORGE4 = [['....M.', '.MMMM.', 'MMMMMD', 'MMrRMD', 'MMOYMD', 'DDDDDD'], ['....M.', '.MMMM.', 'MMMMMD', 'MMRrMD', 'MMYOMD', 'DDDDDD']]

if __name__ == '__main__':
    ims = [render(COOKED_ICON, COOKED_PAL, 0.3), render(ingot_icon().rows(), IRON_BAR_PAL, 0.3), render(ingot_icon().rows(), GOLD_BAR_PAL, 0.3),
           render(hammer().rows(), HAMMER_PAL, 0.3)]
    ims += [render(campfire(i).rows(), CAMP_PAL, 0.3) for i in range(3)] + [render(forge(i).rows(), FORGE_PAL, 0.3) for i in range(2)]
    ims += [render(COOKED_DROP, COOKED_PAL, 0.22), render(INGOT_DROP, IRON_BAR_PAL, 0.22), render(INGOT_DROP, GOLD_BAR_PAL, 0.22)]
    sheet(ims, scale=7).save(sys.argv[1] if len(sys.argv) > 1 else 'craftart.png')
    print('ok')
