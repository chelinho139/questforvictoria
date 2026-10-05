"""Kilnholt's charcoal kiln (30×26, HD, lit from the top-left, outlined in the game like the
campfire and forge in craftart.py): a dome of earth laid over with turf sods, a stone-ringed
smoke vent on top and a low arched mouth at the front glowing with embers. kiln(0..2) are the
burning frames (the glow flickers, the smoke wisps rise and drift); kiln_out() is the same
kiln gone cold and dark. Run this file for a magnified preview of all four."""
import sys
from tool import G, render, sheet

KILN_PAL = {
    # turf sods: lit grass edge, sod, shadowed sod, seam
    'G': '#a8c46e', 'g': '#7a9c50', 'h': '#56743a', 'q': '#3a5028',
    # banked earth
    'E': '#b08a62', 'e': '#86643e', 'd': '#5e442a', 'D': '#3e2c1c',
    # vent stones and its dark throat
    'S': '#d4d8de', 's': '#a0a6b0', 'n': '#6a707c', 'K': '#1e1814',
    # embers (the campfire's and forge's fire colours)
    'Y': '#fff6b0', 'O': '#ffb03c', 'R': '#ff6a2a', 'r': '#a8301a',
    # the cold mouth: soot and ash
    'k': '#2a201a', 'c': '#5a4e44',
    # smoke
    'W': '#eeeeea', 'w': '#c4c4c0', 'v': '#94948f',
}

# the mound, without its mouth, vent glow or smoke
MOUND = [
    '.............sSSs.............',
    '..........G.sSKKSn.g..........',
    '.........GGGGsnnsGgqg.........',
    '.......G.GgggggqGghhqq........',
    '......GGGggggqgGgghhhq.g......',
    '.....GgggqgGGGgggghhhhq.......',
    '....GGggqgGgggggqGhhhhqq......',
    '...GgggggqgggqGGghhhqhhqD.....',
    '...gGGgqggggqggggqhhhhqqd.....',
    '..GgggggqGGgggqGghhhqhhqdD....',
    '..gggqggggggqggggghhqhqqddD...',
    '.EeggggqgeggggqggeghhqeqdddD..',
    '.EEEeeEEEEeeeeEEEEeeeeddddDD..',
    'EEEEeeeeEEEeeeeeEEeeeeddddDDD.',
    'EEEeeeeeEEEEeeeeeeeeedddddDDD.',
    'EEeeeeeeeEEeeeeeeeeeddddddDDD.',
    'dddddddddddddddddddddddddDDDD.',
]


def _mound():
    g = G(30, 26)
    for y, r in enumerate(MOUND):
        g.at(0, 9 + y, r)
    return g


# the mouth: an arch of stones low at the front, full of embers (two flickers)
MOUTH_RIM = [(12, 18, 'sSSs'), (11, 19, 's'), (16, 19, 'n'), (10, 20, 'S'), (17, 20, 'n'), (10, 21, 'S'), (17, 21, 'n'),
             (10, 22, 's'), (17, 22, 'n'), (10, 23, 's'), (17, 23, 'n'), (10, 24, 'n'), (17, 24, 'n')]
GLOW = [
    ['.rrrr.', 'rRRRRr', 'ROOOOR', 'ROYYOR', 'OYYYYO', 'RYYYOR'],
    ['.rrrr.', 'rRROrr', 'RROORR', 'ROOYOR', 'OYYYOO', 'ROYYYR'],
    ['.rrrr.', 'rrRRRr', 'RROOOR', 'ROYYOR', 'OYYYYR', 'RYYOYR'],
]
COLD = ['.kkkk.', 'kkkkkk', 'kkkkkk', 'kkckkk', 'kcckck', 'ccccck']
# smoke from the vent: puffs leave the vent, swell as they rise and drift to the right, and
# thin out at the top; each frame moves every puff a third of the way to the next one's place,
# so the three frames loop
SMOKE = [
    [(15, 7, 'w'), (14, 8, 'wWv'), (16, 3, 'ww'), (15, 4, 'wWWv'), (16, 5, 'vv'), (18, 0, 'ww'), (18, 1, 'vv')],
    [(15, 6, 'ww'), (14, 7, 'wWv'), (15, 8, 'v'), (16, 2, 'ww'), (16, 3, 'wWWv'), (16, 4, 'vwv'), (19, 0, 'wv')],
    [(15, 5, 'ww'), (15, 6, 'wWv'), (15, 8, 'w'), (17, 1, 'ww'), (16, 2, 'wWWv'), (17, 3, 'vv')],
]


def kiln(frame):
    """The kiln burning: embers in the mouth, a red glow in the vent, smoke rising."""
    g = _mound()
    for x, y, s in MOUTH_RIM:
        g.at(x, y, s)
    for y, r in enumerate(GLOW[frame % 3]):
        g.at(11, 19 + y, r)
    g.at(14, 10, 'rR' if frame % 2 else 'Rr')
    for x, y, s in SMOKE[frame % 3]:
        g.at(x, y, s)
    return g


def kiln_out():
    """The same kiln gone out: the mouth black and ashy, the vent cold, no smoke."""
    g = _mound()
    for x, y, s in MOUTH_RIM:
        g.at(x, y, s)
    for y, r in enumerate(COLD):
        g.at(11, 19 + y, r)
    return g


if __name__ == '__main__':
    ims = [render(kiln(i).rows(), KILN_PAL, 0.3) for i in range(3)] + [render(kiln_out().rows(), KILN_PAL, 0.3)]
    sheet(ims, scale=8).save(sys.argv[1] if len(sys.argv) > 1 else 'kilnart.png')
    print('ok')
