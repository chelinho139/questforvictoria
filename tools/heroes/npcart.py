"""Warden Aldric: the old knight at the start. HD idle (4 frames: breathing, beard and cloak
sway) and a chunky version for the flat styles. Faces right, like the heroes."""
import sys
from tool import G, render, sheet

PAL = {'S': '#ffd8b4', 's': '#f2b88c', 'k': '#d08c64', 'E': '#2a2a3a',
       'h': '#f6f4ee', 'H': '#c8ccd6', 'j': '#9aa0ae',
       'c': '#7a8ea8', 'C': '#5a6c88', 'D': '#3e4c66', 'X': '#283246',
       'b': '#4a6aa0', 'B': '#35508a', 'G': '#ffe07a', 'g': '#d8a03a',
       'W': '#8a5a30', 'w': '#c48c58', 'i': '#c8d2e0', 'd': '#5a3418'}


def aldric(f):
    """f: 0..3 idle frame. Frames 2 and 3 breathe out (body down a pixel); 1 and 2 sway the beard and hem."""
    b = 1 if f in (2, 3) else 0
    sway = 1 if f in (1, 2) else 0
    g = G(22, 35)
    # staff, planted: iron cap, then the shaft
    g.at(17, 1, 'i'); g.at(17, 2, 'i'); g.at(17, 3, 'j')
    for y in range(4, 35): g.at(17, y, 'w' if y < 20 else 'W')
    # cloak: lit left edge, shaded right edge, widening to the hem
    for y in range(9, 31):
        x0, x1 = (3, 14) if y == 9 else (2, 15) if y < 21 else (2 - (y - 21) // 5, 15 + (y - 21) // 5)
        n = x1 - x0 + 1
        g.at(x0, y + b, 'cc' + 'C' * (n - 5) + 'DDX')
    hem = ['C.CC.CCC.CC.CC', '.CC.CCC.CC.CC.'][sway]
    g.at(1, 31 + b, hem)
    # faded tabard with the gold crown of Victoria
    for y in range(13, 30): g.at(6, y + b, 'bbbbBB')
    for x, y, s_ in [(6, 15, 'G.G.G'), (6, 16, 'GGGGG'), (6, 17, 'gGGGg')]: g.at(x + 0, y + b, s_)
    # rope belt with a knot
    g.at(3, 21 + b, 'wwwwwwwwwwww'); g.at(9, 22 + b, 'wW'); g.at(10, 23 + b, 'W')
    # near arm: sleeve down to the hand gripping the staff
    for i, y in enumerate(range(10, 17)): g.at(14 + (i >= 3), y + b, 'CD')
    g.at(16, 16 + b, 'Ss'); g.at(16, 17 + b, 'Ss')
    g.at(17, 16 + b, 'S')
    # head: bald crown, white hair at the sides, bushy brows, long beard
    head = [(7, 2, 'SSSs'), (6, 3, 'SSSSSs'), (5, 4, 'hSSSSSsh'), (5, 5, 'hHHSHHsh'), (5, 6, 'hSESSEsh'), (5, 7, 'hSSkSSsh'),
            (5, 8, 'hhhhhhhh'), (5, 9, 'hhhHhhhH'), (5, 10, 'hhhhhhHH'), (6, 11, 'hhhhhH'), (6, 12, 'hhhhHH'), (7, 13, 'hhhH')]
    for x, y, s_ in head: g.at(x, y + b, s_)
    g.at(8 + sway, 14 + b, 'hH')  # beard tip sways
    # boots under the hem
    g.at(5, 33, 'ddd'); g.at(10, 33, 'ddd')
    g.at(5, 34, 'ddd'); g.at(10, 34, 'ddd')
    return g


# the flat styles: a chunky 6×9 warden with his staff
FLAT = [['.hh..i', 'hSSh.w', '.hh..w', 'CbbCSw', 'CbGC.w', 'CbbC.w', 'CCCC.w', '.CC..w', 'd..d.w'],
        ['.hh..i', 'hSSh.w', '.hh..w', 'CbbCSw', 'CbGC.w', 'CbbC.w', 'CCCC.w', 'C..C.w', 'd..d.w']]
FLAT_PAL = {'h': '#e8e8e2', 'S': '#e8c4a0', 'C': '#5a6c88', 'b': '#4a6aa0', 'G': '#e8c860', 'd': '#5a3418', 'w': '#a8783e', 'i': '#c8d2e0'}

if __name__ == '__main__':
    ims = [render(aldric(f).rows(), PAL, 0.3) for f in range(4)] + [render(r, FLAT_PAL, 0.3) for r in FLAT]
    sheet(ims, scale=8).save(sys.argv[1] if len(sys.argv) > 1 else 'aldric.png')
    print('ok')
