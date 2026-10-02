"""Act I creatures, hand-placed at the HD scale beside the skeleton: the bone hound (the old
King's hunting dogs, a two-frame trot) and the Bell-Ringer (Millbrook's dead sexton, a boss:
hunched, a tattered black coat, the iron clapper of the bell on a chain, black lace on his
arm). Face right. Natural colours; the game recolours creatures for HD · Silhouette.

    python3 creatures.py out.png
"""
from tool import G, render, sheet

BONE = {'B': '#f2ecdc', 'b': '#d4cbb4', 'c': '#a89f88', 'C': '#6e6656', 'R': '#ff5a4a', 'r': '#b8302a', 'k': '#2a2622'}

HOUND_BODY = [
    '..........................bbb...',
    '.........................bBBBb..',
    '........................bBBBBBb.',
    '........................BBRBBBBBb',
    '.......................cBBBBBBBBB',
    '..c...................cbBBBkBkBk.',
    '...c..............cbbBBcckckck..',
    '....c...bBbBbBbBbBBBBc..........',
    '.....cbBBBBBBBBBBBBBBc..........',
    '......cBkBkBkBkBkBBBc...........',
    '.......bkBkBkBkBkcBc............',
    '........ckckckckc.c.............',
]
# legs: two frames of the trot (front pair and back pair swap)
HOUND_LEGS = [
    [
        '.......bBc.......bBc............',
        '.......B.b.......B.c............',
        '......B...b.....B...c...........',
        '......b...B....b.....b..........',
        '.....bb...bb..bb.....bb.........',
    ],
    [
        '.......bBc.......bBc............',
        '........Bb........Bc............',
        '........cB........bB............',
        '........bB........cb............',
        '.......bbB.......bbB............',
    ],
]


def hound(f):
    rows = HOUND_BODY + HOUND_LEGS[f]
    if f == 1:
        # the body rises a pixel mid-stride
        rows = HOUND_BODY[1:] + [HOUND_BODY[-1]] + HOUND_LEGS[f]
        rows = ['.' * 32] + rows[:-1]
    g = G(32, len(rows))
    for y, r in enumerate(rows):
        g.at(0, y, r)
    return g


RINGER_PAL = {
    # dead skin, eyes, hair
    'S': '#b8c2a8', 's': '#8e9a80', 'E': '#e8f4ff', 'e': '#7ab8e8', 'h': '#e8e8e0', 'H': '#a8a8a0', 'm': '#3a3428', 'M': '#1a1410', 'k': '#6e7a62',
    # coat (black wool gone green-grey), shirt
    'c': '#4a4a52', 'C': '#34343c', 'D': '#22222a', 'w': '#c8c0a8', 'W': '#9a9280',
    # the black lace favour on his arm
    'L': '#1a1420', 'l': '#6a6078',
    # iron clapper and chain
    'I': '#a8b0bc', 'i': '#6e7684', 'j': '#444a56', 'x': '#8a8070',
    # boots
    'd': '#2a2018',
}
RINGER = [
    '............................................',
    '.........................hhh................',
    '......................hhHHHSSs..............',
    '.....................hHSSSSSSSSs............',
    '....................hHSSSSSSSSSSs...........',
    '....................HSSSSSSSSSSSSs..........',
    '....................SSSmmmSSSmmmSs..........',
    '....................SSSmEmSSSmEmSs..........',
    '.....................SSsmSSSSsmSs...........',
    '.....................sSSSSSSkSSSSs..........',
    '..............ccc.....sSSsSSSsSSs...........',
    '............ccCCCcc....sSmhmhmSs............',
    '..........ccCCCCCCCcc...sSMMMMSs............',
    '.........cCCCCCCCCCCCcc..sSSSSs.............',
    '........cCCCCCCCCCCCCCCcwwwwss..............',
    '.......cCCCCCCCCCCCCCCCCwwWwwcc.............',
    '.......cCCCCCCCCCCCCCCCCwWwwcCCcc...........',
    '......cCCCCCCCCCCCCCCCCCwwwwcCLlLc..........',
    '......cCCCCCCCCCCCCCCCCCwWwcCCLlLLc.........',
    '......cCCDCCCCCCCCCCCCCCwwwcCCCLlLCc........',
    '......cCCDCCCCCCCCCCCCCCwwWcCCCCCCCDc.......',
    '.....cCCCDCCCCCCCCCCCCCCwwwcCCCCCCCCDc......',
    '.....cCCCDCCCCCCCCCCCCCCwWwcDCCCCCCCDDc.....',
    '.....cCCCDDCCCCCCCCCCCCCwwwc.DDCCCCCDDSs....',
    '.....cCCCCDCCCCCCCCCCCCCwwWc..DDCCCDDSSSs...',
    '.....cCCCCDCCCCCCCCCCCCCwwwc...DDDDSSSsSs...',
    '.....cCCCCDCCCCCCCCCCCCCcccc......SsS.sS.s..',
    '.....sSSCCDCCCCCCCCCCCCCCCCc.......s...s....',
    '....sSSSsCDCCCCCCCCCCCCCCCCc................',
    '....SSsSSCDCCCCCCCCCCCCCCCCDc...............',
    '....SS.sSCDCCCCCCCCCCCCCCCCDc...............',
    '.....x..cCDCCCCCCCCCCCCCCCCDc...............',
    '.....x..cCDCCCCCCCCCCCCCCCCDc...............',
    '.....x..cCDCCCCCCCCCCCCCCCCDDc..............',
    '....x...cCDCCCCCCCCCCCCCCCCDDc..............',
    '....x...cCDCCCCCCCCCCCCCCCCCDc..............',
    '....x..cCCDCCCCCCCCCCCCCCCCCDDc.............',
    '....x..cCCDCCCCCCCCCCCCCCCCCDDc.............',
    '...x...cCCDCCCCCCCCCCCCCCCCCCDc.............',
    '...x...cCCDDCCCCCCCCCCCCCCCCCDDc............',
    '..jiij.cCCCDCCCCCCCCCCCCCCCCCDDc............',
    '.jIIIij.cCCDCCCCCCCCCCCCCCCCCCDDc...........',
    'jIIIIIij.cCDCCCCCCCCCCCCCCCCCCDDc...........',
    'jIIIIIIijcCDCCCCCCCCCCCCCCCCCCCDDc..........',
    'jIIiIIIij.CCDCCCCC.CCCCCCC.CCCCDD...........',
    'jIIIIIIij.C.DCCC...C.CCC....CC.D.c..........',
    'jiIIIIiij...D.C.......C......C..............',
    '.jiiiiij.......dd.......dd..................',
    '..jjjjj.......ddd......ddd..................',
    '.............dddd.....dddd..................',
]


def ringer(f):
    rows = [r.ljust(44, '.') for r in RINGER]
    if f == 1:
        # a heavy step: the coat hem swings, the clapper swings out, the body dips
        rows = ['.' * 44] + rows[:45] + [
            '.jiiiiij......dd.........dd.................',
            '..jjjjj......ddd........ddd.................',
            '............dddd.......dddd.................',
        ]
        rows[44] = 'jIIIIIIij.CDCCCCC.CCCCCCCC.CCCCDDD..........'
        rows[45] = 'jIIIIIIij..C.DC...C..CCC...CC.D..c..........'
    g = G(44, len(rows))
    for y, r in enumerate(rows):
        g.at(0, y, r)
    return g


CREATURES = {
    'bonehound': (lambda: [hound(0).rows(), hound(1).rows()], BONE),
    'bellringer': (lambda: [ringer(0).rows(), ringer(1).rows()], RINGER_PAL),
}

if __name__ == '__main__':
    import sys
    ims = []
    for name, (make, pal) in CREATURES.items():
        for fr in make():
            ims.append(render(fr, pal, 0.22))
    sheet(ims, scale=10).save(sys.argv[1])
    print('ok')
