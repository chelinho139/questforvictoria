"""Icons for the menu bar and skills: a skull (Execute), a sealed scroll (Quests), an iron
cog (Settings) and a book with a question mark (Controls). 20×20, lit from the top-left."""
import sys
import math
from tool import G, render, sheet

SKULL_PAL = {'L': '#f6eedc', 'M': '#d6c9a8', 'D': '#a08f6c', 'K': '#2a1e26', 'T': '#fffaf0', 'r': '#e8443a'}
SKULL = [
    '......LLLLLLM.......',
    '....LLLLLLLLLMM.....',
    '...LLLLLLLLLLLMM....',
    '..LLLLLDLLLLLLMMM...',
    '..LLLLLLDLLLLLMMD...',
    '..LLLLLLDLLLLMMMD...',
    '..LLKKKKLLLKKKKMD...',
    '..LKKKKKLLKKKKKMD...',
    '..LKKrKKLLKKrKKDD...',
    '..LLKKKLLLLKKKMDD...',
    '...LLLLLLKLLLMMD....',
    '....LLLLKKKLMMD.....',
    '....MLLLLLLLMMD.....',
    '.....MTTTTTTMD......',
    '.....DTDTDTDDD......',
    '.....MTTTTTTMD......',
    '......DDDDDDD.......',
]

SCROLL_PAL = {'P': '#f4e2b8', 'p': '#d8bc84', 'q': '#a8885a', 'l': '#9a7448', 'R': '#e8443a', 'r': '#a82424', 'o': '#ff8a7a'}
SCROLL = [
    '....pPPPPPPPPPPPq...',
    '...pPPPPPPPPPPPPPq..',
    '...qpppppppppppppq..',
    '....PPPPPPPPPPPPp...',
    '....PllllllllPPPp...',
    '....PPPPPPPPPPPPp...',
    '....PlllllllllPPp...',
    '....PPPPPPPPPPPPp...',
    '....PllllllPPPPPp...',
    '....PPPPPPPPPPPPp...',
    '....PlllllllPPPPp...',
    '....PPPPPPPPPoRRp...',
    '....PPPPPPPPoRRRr...',
    '...pPPPPPPPPPRRrrq..',
    '...pPPPPPPPPPPrrPq..',
    '...qpppppppppppppq..',
    '....qqqqqqqqqqqqq...',
]

COG_PAL = {'N': '#eef2f8', 'O': '#c4cedc', 'U': '#8c98b0', 'V': '#5c6684', 'X': '#3a4058'}
def cog():
    g = G(20, 20)
    cx = cy = 9.5
    for y in range(20):
        for x in range(20):
            dx, dy = x + 0.5 - 10, y + 0.5 - 10
            d = math.hypot(dx, dy)
            a = math.atan2(dy, dx)
            tooth = math.cos(a * 8) > 0.35
            if d < 3.2 or d > (8.6 if tooth else 6.6):
                continue
            light = -(dx + dy) / (d + 0.01)  # lit from the top-left
            ch = 'N' if light > 0.7 else 'O' if light > 0 else 'U' if light > -0.7 else 'V'
            if d < 4.2: ch = 'X' if light > 0 else 'V'  # the hole's inner rim
            g.at(x, y, ch)
    return g

BOOK_PAL = {'B': '#5a8ad8', 'b': '#3a62b0', 'k': '#24427e', 'P': '#f4ead0', 'p': '#c8b890', 'G': '#ffe07a', 'g': '#d8a03a'}
BOOK = [
    '....bbbbbbbbbbbbk...',
    '...BBBBBBBBBBBBbbk..',
    '...BBBBBBBBBBBBbbk..',
    '...BBBBBGGGGBBBbbk..',
    '...BBBBGGBBGGBBbbk..',
    '...BBBBBBBBGGBBbbk..',
    '...BBBBBBBGGBBBbbk..',
    '...BBBBBBGGBBBBbbk..',
    '...BBBBBBGGBBBBbbk..',
    '...BBBBBBBBBBBBbbk..',
    '...BBBBBBGGBBBBbbk..',
    '...BBBBBBggBBBBbbk..',
    '...BBBBBBBBBBBBbbk..',
    '...bbbbbbbbbbbbbbk..',
    '...PPPPPPPPPPPPPpk..',
    '...pppppppppppppkk..',
    '....kkkkkkkkkkkkk...',
]

# talent icons: an eye (crits), a flame (rampage), a heart (vitality); a star for the talents button
EYE_PAL = {'W': '#fffaf0', 'w': '#d8d0c0', 'I': '#5ac8f0', 'i': '#2a7ab8', 'K': '#1a1a26', 'L': '#e8b890', 'l': '#b07850', 'G': '#ffe07a'}
EYE = [
    '....................',
    '....................',
    '....................',
    '......llllllll......',
    '....llLLLLLLLLll....',
    '...lLLwwwwwwwwLLl...',
    '..lLwwWWIIIIwwwLLl..',
    '.lLwWWWIiiiIIwwwLl..',
    '.lLwWWIiKKiiIwwwLl..',
    '.lLwWWIiKKiiIwwwLl..',
    '.lLwWWWIiiiIIwwwLl..',
    '..lLwwWWIIIIwwwLLl..',
    '...lLLwwwwwwwwLLl...',
    '....llLLLLLLLLll....',
    '......llllllll......',
]
FLAME_PAL = {'Y': '#fff6b0', 'O': '#ffb03c', 'R': '#ff6a2a', 'r': '#c8361c', 'q': '#8a2010'}
FLAME = [
    '.........R..........',
    '........RR..........',
    '........RRR....R....',
    '.......RROR...RR....',
    '..R....ROORR..RR....',
    '..RR..RROOOR.RRR....',
    '..RRR.ROOOORRROR....',
    '..RORRROOYOORROR....',
    '..ROORROOYYOOROOR...',
    '..ROOOOOYYYOOOOOR...',
    '.RROOOOYYYYYOOOOR...',
    '.ROOOOYYYYYYYOOORr..',
    '.ROOOOYYYYYYYOOOOr..',
    '.rROOOOYYYYYOOOORr..',
    '..rROOOOYYYOOOORrr..',
    '...rrRROOOOORRRrq...',
    '....qrrrRRRRrrrq....',
    '......qqqqqqqq......',
]
HEART_PAL = {'P': '#ffb0a8', 'R': '#f0504a', 'r': '#b82a2a', 'q': '#7a1818', 'W': '#ffffff'}
HEART = [
    '....................',
    '....................',
    '...qqqq.....qqqq....',
    '..qRRRRq...qRRRRq...',
    '.qRPWRRRq.qRRRRrrq..',
    '.qRWPRRRRqRRRRRrrq..',
    '.qRPRRRRRRRRRRRrrq..',
    '.qRRRRRRRRRRRRRrrq..',
    '..qRRRRRRRRRRRrrq...',
    '...qRRRRRRRRRrrq....',
    '....qRRRRRRRrrq.....',
    '.....qRRRRRrrq......',
    '......qRRRrrq.......',
    '.......qRrrq........',
    '........qrq.........',
    '.........q..........',
]
STAR_PAL = {'Y': '#fff6b0', 'G': '#ffd84a', 'g': '#d89a24', 'b': '#9a5a10'}
def star():
    g = G(20, 20)
    cx, cy = 9.5, 10.2
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        r = 9.2 if i % 2 == 0 else 3.8
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    def inside(x, y):
        c = False
        for i in range(len(pts)):
            x1, y1 = pts[i]; x2, y2 = pts[(i + 1) % len(pts)]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                c = not c
        return c
    for y in range(20):
        for x in range(20):
            if inside(x + 0.5, y + 0.5):
                dx, dy = x + 0.5 - cx, y + 0.5 - cy
                ch = 'Y' if dx + dy < -4 else 'G' if dx + dy < 3 else 'g'
                g.at(x, y, ch)
    g.at(8, 6, 'Y'); g.at(7, 8, 'YY')
    return g


# the spellbook (the ability icons moved to skillicons.py)
TOME_PAL = {'R': '#c84a4a', 'r': '#902e2e', 'q': '#5a1a1a', 'G': '#ffe07a', 'g': '#c8901e', 'P': '#f4ead0', 'p': '#c8b890'}
TOME = [
    '....qqqqqqqqqqqq....',
    '...qRRRRRRRRRRRrq...',
    '...qRgRRRRRRRRgrq...',
    '...qRRRRRGGRRRRrq...',
    '...qRRRRGRRGRRRrq...',
    '...qRRRGRGGRGRRrq...',
    '...qRRRGRGGRGRRrq...',
    '...qRRRRGRRGRRRrq...',
    '...qRRRRRGGRRRRrq...',
    '...qRgRRRRRRRRgrq...',
    '...qRRRRRRRRRRRrq...',
    '...qrrrrrrrrrrrrq...',
    '...qPPPPPPPPPPPPpq..',
    '...qppppppppppppqq..',
    '....qqqqqqqqqqqqq...',
]


def rows_grid(rows, top=1):
    g = G(20, 20)
    for y, r in enumerate(rows): g.at(0, y + top, r)
    return g

ICONS = {
    'skull': (rows_grid(SKULL, 1), SKULL_PAL),
    'scroll': (rows_grid(SCROLL, 1), SCROLL_PAL),
    'cog': (cog(), COG_PAL),
    'book': (rows_grid(BOOK, 1), BOOK_PAL),
    'eye': (rows_grid(EYE, 1), EYE_PAL),
    'flame': (rows_grid(FLAME, 1), FLAME_PAL),
    'heart': (rows_grid(HEART, 1), HEART_PAL),
    'star': (star(), STAR_PAL),
    'spellbook': (rows_grid(TOME, 2), TOME_PAL),
}

if __name__ == '__main__':
    sheet([render(g.rows(), p, 0.3) for g, p in ICONS.values()], scale=8).save(
        sys.argv[1] if len(sys.argv) > 1 else 'menuicons.png')
    print('ok')
