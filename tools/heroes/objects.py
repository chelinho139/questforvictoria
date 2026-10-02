"""Things you can use in the world: a page lying in the grass (with a glint frame so it can
be spotted), a notice board on two posts with pinned papers, and an iron-bound chest.
Hand-placed, HD scale, lit from the top-left; outlined in the game like the campfire."""
from tool import G, render, sheet

PAL = {
    # parchment
    'P': '#f6e6c0', 'p': '#dcc08a', 'q': '#a8885a', 'l': '#6a4a2a',
    # wood
    'W': '#c48e5a', 'w': '#8e5c32', 'x': '#5c3a1c', 'k': '#3a2410',
    # iron, gold, wax
    'I': '#c4cedc', 'i': '#7e8aa0', 'j': '#4c5468', 'G': '#ffe07a', 'g': '#c8901e', 'R': '#d8483a', 'r': '#8e2a20',
    # glint
    'Y': '#ffffff',
    # black thorn: frosted tips, plum-black stems; ash and earth
    'T': '#9a8eaa', 't': '#4e4258', 'u': '#2e2632', 'v': '#1d1b22', 'a': '#8a867c', 'e': '#5a4a3a',
}


def page(glint=False):
    """A sheet of paper lying on the ground, seen from above at an angle, one corner curled."""
    g = G(16, 10)
    g.at(5, 0, 'pPPPP')
    g.at(3, 1, 'pPPPPPPPP')
    g.at(1, 2, 'pPPlllPPPPPPp')
    g.at(0, 3, 'pPPPPPPllPPPPPPq')
    g.at(1, 4, 'qPPPllllPPPPPPq')
    g.at(2, 5, 'qPPPPPPllPPPq')
    g.at(3, 6, 'qqPPPPPPPPq')
    g.at(5, 7, 'qqqPPPpq')
    g.at(8, 8, 'qqq')
    g.at(13, 3, 'pq')
    if glint:
        g.at(4, 0, 'Y')
        g.at(3, 1, 'YP')
        g.at(14, 2, 'Y')
    return g


def board():
    """A notice board under a little gabled roof: two pinned notices, one under a red seal."""
    g = G(24, 31)
    g.at(11, 0, 'xx')
    g.at(9, 1, 'xxWWxx')
    g.at(7, 2, 'xxWWWWWWxx')
    g.at(5, 3, 'xxWWWWWWWWWWxx')
    g.at(3, 4, 'xxwWWWWWWWWWWWWwxx')
    g.at(1, 5, 'xxwwwwwwwwwwwwwwwwwwxx')
    g.at(1, 6, 'kkkkkkkkkkkkkkkkkkkkkk')
    for y in range(7, 21):
        row = 'xWWWWWWWWWWWWWWWWWWWx' if y % 5 else 'xwwwwwwwwwwwwwwwwwwwx'
        g.at(2, y, 'x' + row[1:])
    g.at(2, 21, 'kxxxxxxxxxxxxxxxxxxxk')
    # a notice and the proclamation
    for y in range(9, 17):
        g.at(4, y, 'pPPPPPp' if y < 16 else 'qqqqqqq')
    for y in (11, 13):
        g.at(5, y, 'llll')
    g.at(7, 15, 'll')
    g.at(6, 8, 'k')
    for y in range(8, 19):
        g.at(12, y, 'pPPPPPPPp' if y < 18 else 'qqqqqqqqq')
    for y in (10, 12, 14):
        g.at(13, y, 'lllllll' if y != 14 else 'llll')
    g.at(15, 15, 'RRR')
    g.at(15, 16, 'RrR')
    g.at(16, 17, 'r')
    g.at(16, 7, 'k')
    # the posts
    for y in range(22, 31):
        g.at(4, y, 'Ww')
        g.at(18, y, 'Ww')
    g.at(3, 30, 'xxxx')
    g.at(17, 30, 'xxxx')
    return g


def chest():
    """A wooden chest with iron bands and a gold lock."""
    g = G(20, 15)
    g.at(3, 0, 'xxxxxxxxxxxxxx')
    g.at(1, 1, 'xWWWWWWWWWWWWWWWWx')
    g.at(1, 2, 'xWWWWWWWWWWWWWWWwx')
    g.at(1, 3, 'xwwwwwwwwwwwwwwwwx')
    g.at(1, 4, 'jIiiiiijGGjiiiiiIj')
    g.at(1, 5, 'jIiiiiijGgjiiiiiij')
    for y in range(6, 13):
        g.at(1, y, 'xWWWWWWWWWWWWWWWwx' if y % 3 else 'xwwwwwwwwwwwwwwwwx')
    for y in range(4, 14):
        g.at(3, y, 'I' if y < 6 else 'i')
        g.at(16, y, 'i')
    g.at(9, 6, 'gg')
    g.at(1, 13, 'xxxxxxxxxxxxxxxxxx')
    g.at(2, 14, 'kkkkkkkkkkkkkkkk')
    return g


def thorn():
    """A clump of black thorn shoots pushing up through the earth, frost on their tips."""
    g = G(18, 18)
    rows = [
        '.......T..........',
        '.......t......T...',
        '......tu......t...',
        '..T...tu.....tu...',
        '..tu..tuT...tu....',
        '...tu.tu...tu...T.',
        '...tuutu...tu..tu.',
        '....tuu.u.tuu.tu..',
        '....tuu..tuu..tu..',
        '...u.tu.tuu..tuu..',
        '....utuutuuutuu...',
        '.....tuuuuuuuu.u..',
        '......tuuuuuu.....',
        '....uuvuvvuvuu....',
        '..eaavvvvvvvvaae..',
        '.eaeaaeaaaaeaeaee.',
        '..eeaeeeaaeeeaee..',
        '....eeeeeeeeee....',
    ]
    for y, r in enumerate(rows):
        g.at(0, y, r)
    return g


def letter(glint=False):
    """A sealed letter lying on a doorstep, the red wax unbroken."""
    g = G(18, 9)
    rows = [
        '......pPPPq.......',
        '....pPPPPPPPq.....',
        '..pPPlPPPPPPPPq...',
        'pPPPPPllPPPPPPPPq.',
        '.qPPPPPPlRRPPPPPPq',
        '..qPPPPPRrrRPPPq..',
        '...qPPPPPRRPPPq...',
        '....qqPPPPPPq.....',
        '......qqqqq.......',
    ]
    for y, r in enumerate(rows):
        g.at(0, y, r)
    if glint:
        g.at(6, 0, 'Y')
        g.at(5, 1, 'YP')
        g.at(16, 3, 'Y')
    return g


OBJECTS = {'page': [page(), page(True)], 'board': [board()], 'chest': [chest()], 'thorn': [thorn()], 'letter': [letter(), letter(True)]}

if __name__ == '__main__':
    import sys
    ims = [render(g.rows(), PAL, k=0.35) for frames in OBJECTS.values() for g in frames]
    sheet(ims, scale=10).save(sys.argv[1] if len(sys.argv) > 1 else 'objects.png')
