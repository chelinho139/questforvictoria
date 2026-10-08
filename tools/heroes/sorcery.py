"""The sorceress's gear icons (20×20, lit from the top-left, outlined in the game): five staves
(gnarled oak, ashwood, runed, the Warden's owl staff, black willow), the hedge grimoire and the
crystal orb. Staves lie corner to corner like the swords and bows: the foot at the bottom-left,
the head at the top-right; the shaft is two pixels wide, lit on its upper-left edge. Run this
file for a magnified preview (sorcery.png). The spell icons are in skillicons.py."""
import math
from tool import G, render, sheet


def shaft(g, x0, y0, n, cells='Wd'):
    """A ↗ shaft from the foot (x0, y0), n rows up, one pixel right per row: `cells` across
    each row, lit pixel first."""
    for i in range(n):
        g.at(x0 + i, y0 - i, cells)


def grid(rows):
    g = G(20, 20)
    for y, r in enumerate(rows):
        g.at(0, y, r)
    return g


def gnarled_staff():
    """A crooked branch of dark oak, knotted, a twig stub low down, the top curled over into a
    shepherd's crook; a little moss in the bend."""
    pal = {'W': '#a8825a', 'w': '#7a5636', 'd': '#4e3420', 'k': '#2e1e12', 'M': '#8aa850', 'm': '#5a7a34'}
    g = grid([
        '....................',
        '...........WWWw.....',
        '..........Ww..wwd...',
        '.........Wd....Wd...',
        '.........wd....Wd...',
        '..........k...Wwd...',
        '..............Wd....',
        '.............Wwd....',
        '............Wd......',
        '...........Wwd......',
        '..........Wd........',
        '.........Wd.........',
        '.........Wd.........',
        '........Wwd.........',
        '.....k.Wd...........',
        '......kWd...........',
        '.....Wd.............',
        '....Wwd.............',
        '...Wd...............',
        '..Wd................',
    ])
    # knots: dark eyes in the bark
    g.at(10, 12, 'k'); g.at(13, 7, 'k'); g.at(6, 16, 'k')
    # moss in the crook's bend and on the knot
    g.at(14, 1, 'M'); g.at(15, 2, 'm'); g.at(11, 1, 'M')
    return g, pal


def ashwood_staff():
    """Straight grey ash with a leather wrap at the hand, the head swelling into a knot that
    holds a lump of amber."""
    pal = {'W': '#e4e0d2', 'w': '#b0aa98', 'd': '#767060', 'L': '#9a6238', 'l': '#5e3a1e',
           'H': '#fff6c8', 'A': '#ffcc5a', 'a': '#e88e22', 'b': '#9a5012'}
    g = G(20, 20)
    shaft(g, 2, 18, 12, 'Wd')
    # the wrap at the grip
    for i in (5, 6, 7):
        g.at(2 + i, 18 - i, 'Ll')
    # the swelling head: the shaft thickens and parts round the amber
    g.at(13, 6, 'Wwd'); g.at(12, 5, 'W'); g.at(13, 5, 'w'); g.at(16, 6, 'd')
    g.at(12, 4, 'W'); g.at(17, 5, 'd'); g.at(16, 5, 'w')
    g.at(13, 2, 'Ww'); g.at(12, 3, 'W'); g.at(17, 4, 'd'); g.at(17, 3, 'd'); g.at(15, 1, 'Ww')
    g.at(17, 2, 'd')
    # the amber, set in the head
    g.at(14, 2, 'HA'); g.at(16, 2, 'a')
    g.at(13, 3, 'HAAa')
    g.at(13, 4, 'AAab')
    g.at(14, 5, 'ab')
    return g, pal


def runed_staff():
    """Dark wood shod with iron at both ends, pale runes cut down its length, an iron claw at
    the head gripping a pale blue-white gem."""
    pal = {'W': '#7a5a46', 'd': '#3e2a1e', 'I': '#d4dce6', 'i': '#8a94a6', 'j': '#545c6c',
           'r': '#c8ecff', 'G': '#ffffff', 'g': '#cfe6ff', 'h': '#86b4ea', 'H': '#4a72b4'}
    g = G(20, 20)
    shaft(g, 2, 18, 13, 'Wd')
    # runes: pale nicks along the lit edge
    for i in (3, 5, 8, 10):
        g.at(2 + i, 18 - i, 'r')
    g.at(6, 14, 'r')
    # the iron shoe at the foot
    g.at(1, 19, 'ij'); g.at(2, 18, 'Ii'); g.at(3, 17, 'Ii')
    # the iron collar under the head and its claws
    g.at(13, 7, 'Ii'); g.at(14, 6, 'Ii'); g.at(13, 6, 'I')
    g.at(13, 5, 'I'); g.at(12, 4, 'I'); g.at(17, 6, 'i'); g.at(18, 5, 'j')
    # the gem
    g.at(14, 2, 'Gg'); g.at(13, 3, 'Ggg'); g.at(16, 3, 'h')
    g.at(13, 4, 'gghH'); g.at(14, 5, 'hhH'); g.at(16, 4, 'H')
    g.at(15, 1, 'g'); g.at(17, 4, 'i')
    g.at(16, 2, 'g'); g.at(17, 3, 'h')
    return g, pal


def warden_staff():
    """A tall staff of the Wardens' grey-green wood, a silver owl's head at the top, amber
    eyes and a gold beak, a silver collar below it."""
    pal = {'W': '#aab894', 'w': '#6e7e5e', 'd': '#4a563e',
           'S': '#ffffff', 's': '#c8d0da', 't': '#8a94a6', 'u': '#565e70',
           'Y': '#ffcc4a', 'z': '#2a2024', 'G': '#f2c14e', 'g': '#a8701e'}
    g = G(20, 20)
    shaft(g, 1, 19, 13, 'Wd')
    g.at(2, 18, 'w'); g.at(8, 12, 'w')
    # silver collar
    g.at(12, 8, 'Ss'); g.at(13, 7, 'st')
    # the owl's head: ear tufts, a round face with two big eyes and a beak
    g.at(12, 0, 'S'); g.at(18, 0, 't')
    g.at(12, 1, 'SSsss'); g.at(17, 1, 'tt')
    g.at(11, 2, 'SsYzsYzt')
    g.at(11, 3, 'SsYYsYYt')
    g.at(11, 4, 'ss.Gg.tu')
    g.at(13, 4, 's'); g.at(16, 4, 't')
    g.at(12, 5, 'sstttu')
    g.at(13, 6, 'tttu')
    return g, pal


def willow_staff():
    """Black willow, its head forked like a hand to hold a cold blue stone, bound in spider
    silk where the fork parts."""
    pal = {'L': '#6e7488', 'k': '#3e4250', 'K': '#262830',
           'C': '#f0faff', 'c': '#a8dcff', 'b': '#5a9ae0', 'B': '#2e5ca8',
           'S': '#f6f4ee', 's': '#bcb8ac'}
    g = grid([
        '....................',
        '.............Lk.....',
        '............LkCcc...',
        '...........LkCCccb..',
        '...........LkCccbbk.',
        '...........LkcbbbBk.',
        '...........LkkbBBLk.',
        '...........LkLLLLk..',
        '...........LkkkKK...',
    ])
    shaft(g, 2, 18, 10, 'Lk')
    g.at(4, 16, 'K'); g.at(7, 13, 'K')
    # silk wound round the fork's base, a loose end hanging
    g.at(10, 10, 'Ss'); g.at(11, 9, 'Ss'); g.at(12, 10, 's'); g.at(12, 11, 's')
    return g, pal


def hedge_grimoire():
    """A fat little book bound in brown leather: gold-capped corners, a tooled sigil, page
    edges showing, and a strap round the fore-edge shut with a gold clasp."""
    pal = {'L': '#c07a46', 'l': '#985a30', 'm': '#6a3a1a', 'n': '#40200c',
           'P': '#f6ecd2', 'p': '#c8b88e', 'G': '#ffe07a', 'g': '#d29a32', 'h': '#7e5414'}
    g = G(20, 20)
    for y in range(2, 17):
        for x in range(4, 16):
            ch = 'L' if (y == 2 or x == 4) else 'm' if (y == 16 or x == 15) else 'l'
            g.at(x, y, ch)
    # the spine, rounded, with raised bands
    for y in range(2, 18):
        g.at(2, y, 'mn' if y not in (4, 9, 14) else 'gh')
    g.at(3, 2, 'L')
    # pages under the cover and the back board
    for y in range(3, 18):
        g.at(16, y, 'P' if y % 2 else 'p')
    g.at(4, 17, 'PpPpPpPpPpPpp')
    g.at(17, 4, 'n'); [g.at(17, y, 'n') for y in range(4, 19)]
    g.at(4, 18, 'nnnnnnnnnnnnnn')
    # gold corners
    g.at(14, 2, 'GG'); g.at(15, 3, 'g'); g.at(14, 16, 'gh'); g.at(15, 15, 'h'); g.at(4, 16, 'g'); g.at(4, 15, 'g')
    # the tooled sigil: a sprig in a diamond
    g.at(9, 5, 'g'); g.at(8, 6, 'g.g'); g.at(7, 7, 'g.G.g'); g.at(6, 8, 'g.GGG.g'); g.at(7, 9, 'g.G.g'); g.at(8, 10, 'g.g'); g.at(9, 11, 'g')
    g.at(9, 12, 'h'); g.at(9, 13, 'h')
    # the strap and clasp across the fore-edge
    g.at(12, 9, 'GGgnnn'); g.at(12, 10, 'Gghmmn'); g.at(12, 11, 'gghnnn')
    g.at(13, 10, 'h')
    return g, pal


def crystal_orb():
    """A clear orb of pale blue glass with a white window-gleam, a violet light waking in its
    heart, held in a little bronze stand of three claws."""
    pal = {'W': '#ffffff', 'A': '#e4f4ff', 'a': '#b4daf4', 'i': '#78aad6', 'I': '#4a76aa',
           'V': '#f0e4ff', 'v': '#c49cff', 'x': '#8a62d4',
           'B': '#f2c070', 'b': '#c08438', 'c': '#7a4e1c', 'C': '#4a2e10'}
    g = G(20, 20)
    cx, cy, R = 10.0, 8.0, 6.8
    for y in range(20):
        for x in range(20):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = math.hypot(dx, dy)
            if d > R:
                continue
            lit = (-dx - dy) / (R * 1.414)   # +1 at the top-left rim
            if d > R - 1.1:
                ch = 'A' if lit > 0.35 else 'a' if lit > -0.2 else 'i' if lit > -0.65 else 'I'
            else:
                ch = 'a' if lit > -0.35 else 'i'
            g.at(x, y, ch)
    # the violet light in its heart, round and soft-edged, and a mote drifting from it
    for y, (x, r) in enumerate([(9, 'xx'), (8, 'xvvx'), (7, 'xvVVvx'), (7, 'xvVVvx'), (8, 'xvvx'), (9, 'xx')], start=6):
        g.at(x, y, r)
    g.at(12, 5, 'v')
    # the window-gleam and a second, smaller one
    g.at(6, 4, 'WW'); g.at(5, 5, 'W'); g.at(6, 5, 'A'); g.at(13, 12, 'A')
    # the stand: three claws round the orb's foot, a collar and a round foot
    g.at(4, 12, 'b'); g.at(4, 13, 'Bb'); g.at(15, 12, 'c'); g.at(14, 13, 'bc'); g.at(9, 14, 'B')
    g.at(6, 15, 'BBBBbbbc')
    g.at(8, 16, 'bbc')
    g.at(5, 17, 'BBBbbbbbcc')
    g.at(5, 18, 'bccccccCC')
    return g, pal


ICONS = {
    'gnarled_staff': gnarled_staff(),
    'ashwood_staff': ashwood_staff(),
    'runed_staff': runed_staff(),
    'warden_staff': warden_staff(),
    'willow_staff': willow_staff(),
    'hedge_grimoire': hedge_grimoire(),
    'crystal_orb': crystal_orb(),
}

if __name__ == '__main__':
    import sys
    import archery
    from gear import GEAR
    out = sys.argv[1] if len(sys.argv) > 1 else 'sorcery.png'
    ref = [archery.ICONS['yew_longbow'], GEAR['iron_sword'], GEAR['wooden_shield']]
    imgs = [render(g.rows(), pal, k=0.3) for g, pal in list(ICONS.values()) + ref]
    sheet(imgs, scale=10).save(out)
