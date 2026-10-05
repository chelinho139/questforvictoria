"""Act II things you click in the world: the old oak's hollow, the five Warden marks cut into
black-willow stumps, diary pages caught on thorns, a Warden cache, the Gallows Willow's ropes,
Wren's cold fire, the lodge hearth, the barrow's fire-ring, the moth in the dust, a cocoon,
the lodge's roll beam and weapon rack, the King's game book and post, and the gnawed kennel
gate. Hand-placed, HD scale, lit from the top-left, one shared palette (PAL2); outlined in the
game like the objects in objects.py (render(rows, PAL2, 0.35)). Run this file for a magnified
preview."""
from tool import G, render, sheet

PAL2 = {
    # oak bark, and the dark of a hollow
    'A': '#a08a6e', 'a': '#76624c', 'b': '#4e4032', 'B': '#1e1814',
    # black willow bark, and the pale wood under it with its cold sheen
    'K': '#5c6274', 'k': '#3c404c', 'z': '#282a34', 'Z': '#18191f', 'F': '#eef2f4', 'f': '#b8c2cc', 'c': '#c8daf0',
    # feathers: white and goose grey, jay blue, owl buff
    'G': '#f4f4f0', 'g': '#9ca0a6', 'J': '#78aee8', 'j': '#2e5a9a', 'u': '#dcc89e', 'U': '#a08a62',
    # planks
    'W': '#c48e5a', 'w': '#8e5c32', 'x': '#5c3a1c', 'X': '#3a2410',
    # parchment, ink, red wax
    'P': '#f6e6c0', 'p': '#dcc08a', 'q': '#a8885a', 'l': '#6a4a2a', 'R': '#d8483a', 'r': '#8e2a20',
    # stone
    'O': '#d4d8de', 'o': '#a8aeb8', 'n': '#7a808c', 'N': '#555a64',
    # ash, char, earth, moss
    'h': '#cfccc4', 'H': '#94918a', 'C': '#3e3029', 'e': '#5e4e3c', 'E': '#3e3226', 'm': '#8aa860', 'M': '#557a40',
    # oilskin
    'y': '#d4b868', 'Y': '#a08440', 'v': '#6e5a2a',
    # rope, leather, iron
    't': '#ccb27a', 'T': '#8e7244', 'L': '#a87048', 'd': '#6a4226', 'I': '#c4cedc', 'i': '#6e7a90',
    # spider silk
    's': '#f6f6f8', 'S': '#cdd1da', 'V': '#959bab',
    # black thorn: frosted tip, plum-black stem
    'D': '#9a8eaa', 'Q': '#4e4258', '9': '#2e2632',
    # dust, and the moth's wings
    '1': '#dedad2', '2': '#b8b4aa', '4': '#c4a070', '5': '#806448', '6': '#3e3024',
    # book leather, glint
    '7': '#8a3a2a', '8': '#5a2418', '0': '#ffffff',
}


def grid(w, h, rows, x=0, y=0):
    g = G(w, h)
    for i, r in enumerate(rows):
        g.at(x, y + i, r)
    return g


# ---------------------------------------------------------------- the old oak's hollow

def hollow():
    """A patch of the old oak's bark, its furrows bending round a dark hollow with a thick
    rolled lip; an oilskin bundle sits in the bottom, a white feather tucked under its cord."""
    g = grid(14, 18, [
        '...aAbaAAb....',
        '..AabAaAAbaA..',
        '.aAbAAAAAAbAa.',
        '.AbAAaaaaAAbA.',
        'AabAaBBBBaAbAa',
        'AbAaBBBBBBaAba',
        'AbAaBBBBBBbaba',
        'AabaBBBBBBbaAa',
        'AabaBBBBBBbaAa',
        'AbAaBBBBBBbaAa',
        'AbAaBBBBBBbabA',
        'AabAaBBBBbaabA',
        'AabAAabbbaAAbA',
        'AbAAaAAAAAaAba',
        'AabAAbAAbAAbAa',
        '.abAabAaAbab..',
        '..bAaabAbAbb..',
        '...Ab..Abb....',
    ])
    for x, y, s in ((4, 9, 'yyyYv'), (4, 10, 'YytYv'), (5, 11, 'vtvv')):
        g.at(x, y, s)
    for x, y, s in ((11, 1, 'G'), (10, 2, 'Gg'), (10, 3, 'Gg'), (9, 4, 'Gg'), (9, 5, 'Gg'), (8, 6, 'Gg'), (8, 7, 'G'), (7, 8, 'g'), (7, 9, 'g')):
        g.at(x, y, s)
    return g


# ---------------------------------------------------------------- the Warden marks

STUMP = [
    '.........K....',
    '........KkZ...',
    '...ccfc.Kkz...',
    '..kcfFfcfkz...',
    '.KkcfcFfczzZ..',
    '.KkkkcccczzZ..',
    '.KkKkkkkzkzZ..',
    '.KkKkzkkkzkzZ.',
    '..KkKkzkkkzkZ.',
    '..KkKkzkKkzkZ.',
    '..KkKkkzkkzkZ.',
    '.KkKkkkzkkzkZ.',
    '.KkKkKkzkzzkZ.',
    '.KkkKkkzkkzkZ.',
    '.KkkKkkkzkzzZ.',
    '.KkKkkKkzkzzZ.',
    '.KkKkkKkkzkzZ.',
    'KKkKkkkKkzkzZZ',
    'KkkKkkzkkKkzZZ',
    'KzKkkzzkkzkKzZ',
    'Kz.zKkzzkKz.ZZ',
    '.EEEEEEEEEEEE.',
]

# the feathers cut into the stumps, as (x, y, letters) runs
GOOSE = [(6, 7, 'FF'), (5, 8, 'FggF'), (4, 9, 'FggFgF'), (4, 10, 'FgFggF'), (4, 11, 'FgFggF'), (4, 12, 'FgFgF'), (4, 13, 'FgFgF'),
         (5, 14, 'FFgF'), (5, 15, 'FFF'), (5, 16, 'F'), (4, 17, 'F')]                                  # broad and grey
JAY = [(7, 7, 'F'), (6, 8, 'FJF'), (6, 9, 'jjF'), (5, 10, 'FFFF'), (5, 11, 'FJJF'), (5, 12, 'jjjF'), (5, 13, 'FFF'),
       (5, 14, 'FJJ'), (5, 15, 'jjF'), (5, 16, 'F'), (5, 17, 'F')]                                     # barred blue and white
OWL = [(6, 8, 'uu'), (5, 9, 'uFFu'), (4, 10, 'uFFfFu'), (4, 11, 'UFUfUF'), (4, 12, 'uFFfFu'), (4, 13, 'uUFfUu'),
       (5, 14, 'uFfu'), (4, 15, 'u.uf.u'), (7, 16, 'f')]                                               # round and soft, downy
HERON = [(9, 6, 'F'), (8, 7, 'FF'), (8, 8, 'Ff'), (7, 9, 'FF'), (7, 10, 'Ff'), (6, 11, 'FF'), (6, 12, 'Ff'), (5, 13, 'FF'),
         (5, 14, 'Ff'), (4, 15, 'Ff'), (4, 16, 'f'), (3, 17, 'f')]                                     # long and thin
GOOSE_ACROSS = [(3, 7, 'F'), (3, 8, 'Fg'), (3, 9, 'FgF'), (4, 10, 'FgF'), (4, 11, 'FggF'), (5, 12, 'FgF'), (6, 13, 'FgF'),
                (7, 14, 'Fg'), (8, 15, 'F'), (9, 16, 'F')]                                             # the goose, laid across


def mark(*feathers):
    """A waist-high black-willow stump, broken off with a splinter standing, a feather (or
    two) cut pale into its bark."""
    g = grid(14, 22, STUMP)
    for f in feathers:
        for x, y, s in f:
            g.at(x, y, s)
    return g


# ---------------------------------------------------------------- a diary page on a thorn

def thorn_page(glint=False):
    """A page torn from the diary, caught on a black thorn stem and hanging aslant."""
    g = grid(16, 18, [
        '..........D.....',
        '..........Q.....',
        '.........Q9.....',
        '.........Q9.....',
        '....D...Q9......',
        '.....Q..Q9......',
        '......Q9Q9......',
        '.......Q9.......',
        '.......Q9.......',
        '......Q9...D....',
        '......Q9..Q.....',
        '.....Q9..Q9.....',
        '.....Q9Q99......',
        '.....Q99........',
        '....Q99.........',
        '...eQ9eEe.......',
        '..eEeEEeEe......',
        '....EEEE........',
    ])
    page = [
        'pPPPPPPPq.',
        'pPlllllPq.',
        'pPPPPPPPPq',
        'pPllllPPPq',
        '.pPPPPPPPq',
        '.pPlllllPq',
        '.pPPPPPPPq',
        '.pPlllPPq.',
        '..qqPPPPq.',
        '....qqqq..',
    ]
    for i, r in enumerate(page):
        g.at(1, 4 + i, r)
    g.at(8, 4, '9')          # the thorn through the paper
    if glint:
        g.at(1, 3, '0'); g.at(0, 4, '0P'); g.at(11, 7, '0')
    return g


# ---------------------------------------------------------------- a Warden cache

def cache():
    """An oilskin bundle, tied crosswise, pushed half under a mossy stone with an owl mark
    scratched on its face."""
    return grid(18, 12, [
        '.......mMmmMm.....',
        '.....mmMmmmMmMm...',
        '....mOOmOmmOmMnN..',
        '...OOOOOOOOOOonnN.',
        '...OOOOONNNOoonnN.',
        '..OOOOONoooNonnnN.',
        '..OOOOONoNoNnnnnN.',
        '..yyytyONNNoonnN..',
        '.yyyytyyONooonNN..',
        'yYtttttYvnnnNNN...',
        'YYYYYtYvveEEEEe...',
        '.vvvvtvv.eeEEe....',
    ])


# ---------------------------------------------------------------- a rope of the Gallows Willow

def rope():
    """A gallows rope knotted round a broken stub of black branch, ending in a noose."""
    return grid(12, 28, [
        '..........K.',
        'KKk......Kz.',
        'kKKkk.tTKz..',
        'zkkKKkTtkZ..',
        'ZzzzkztTZ...',
        '.ZZ...tT....',
        '......Tt....',
        '......tT....',
        '......Tt....',
        '......tT....',
        '......tT....',
        '......Tt....',
        '......tT....',
        '......tT....',
        '......Tt....',
        '.....tTTT...',
        '.....tttT...',
        '.....TTTT...',
        '.....tttT...',
        '.....TTTT...',
        '....tT..tT..',
        '...tT....T..',
        '...t.....T..',
        '...t.....T..',
        '...t.....T..',
        '...tT...tT..',
        '....tT.tT...',
        '.....TTT....',
    ])


# ---------------------------------------------------------------- fires gone cold

def firepit():
    """Wren's cold fire: a ring of stones round grey ash and two charred logs."""
    return grid(24, 14, [
        '.......Oo....OOo........',
        '...Oo..ono..Oonn..Oo....',
        '..Oonn.......nn..Oonn...',
        '.Oon...hhhhHhhh....onN..',
        '.on..hhhHhhhhhhHhh..nN..',
        'Oo..hhCCCBhhhhCCBhH..Oo.',
        'on.hhHhhCCCBBCCChhh..on.',
        '...hhhhhHCBBBCHhhHh.....',
        '.Oo.hhCCBBhhCCCBhH..Oo..',
        'Oonn.HhCBhhhhhCCBh.Oonn.',
        'onnN..hhHhhhHhhhh..onnN.',
        '..OOo....HhhH....OOo....',
        '..onnN.Oo.....Oo.onnN...',
        '.......onN...onnN.......',
    ])


def hearth():
    """The lodge's stone hearth gone cold: a timber mantel over a stone surround, the grate
    empty and black in the fireplace's mouth, a hearthstone before it."""
    return grid(30, 26, [
        '.....OoOOoOOoOOoOOoOOooon.....',
        '.....OooOoonOooOoonOooonn.....',
        '.....onnnnnnnnnnnnnnnnnnN.....',
        '.....OOoOOOooOOOoOOOooOon.....',
        'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWw',
        'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwx',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxX',
        'OOooOOo.OOOooOOOooOOOoo.OOooon',
        'Ooonnon.OooonOooonOoonn.Ooonnn',
        'nnnnnnn.nnnnnnnnnnnnnnn.nnnnnN',
        'OOOoon.BBBBBBBBBBBBBBBBB.OOoon',
        'Ooonnn.BCBBBBBBBBBBBBBBB.Oonnn',
        'nnnnnN.BBBBBBBBBBBBBBBBB.nnnnN',
        'OOoonn.CBBBBBBBBBBBBBBBB.OOonn',
        'OooonN.BBBBBBBBBBBBBBBBB.OoonN',
        'nnnnnN.BBBBBBBBBBBBBBBBB.nnnnN',
        'OOOoon.BBBBBBBBBBBBBBBBB.OOoon',
        'OoonnN.BBIiBIiBIiBIiBIiB.OonnN',
        'nnnnnN.BIIIIIIIIIIIIIIIiB.nnnN',
        'OOoonn.BBiBBiBBiBBiBBiBB.OOonn',
        'OooonN.BHhHhhHhhHHhhHhHB.OoonN',
        'nnnnnN.BhHhhHHhhhHhHhhHB.nnnnN',
        'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOo',
        'ooooooooooooooooooooooooooooon',
        'nnnnnnnnnnnnnnnnnnnnnnnnnnnnnN',
        '.NNNNNNNNNNNNNNNNNNNNNNNNNNNN.',
    ])


def firering():
    """The Wardens' fire-ring at the barrow door: small stones set round a cold, black bed."""
    return grid(24, 14, [
        '........Oo..Oo..........',
        '....Oo..on..on..Oo......',
        '..Oo.on........on..Oo...',
        '..on..eEEeCEeEEe...on...',
        'Oo...eEECEEeEEHEEe...Oo.',
        'on..eEHhEEeCEEhEEEe..on.',
        '...eEEhHEECEEEeCEEEe....',
        'Oo.eEECEEHhEEeEEHEEe.Oo.',
        'on..eEEeEEEECEEhEEe..on.',
        '.....eEEEeEEEEEEEe......',
        '..Oo..eeEEEeeEEee..Oo...',
        '..on...............on...',
        '....Oo..Oo..Oo..Oo......',
        '....on..on..on..on......',
    ])


# ---------------------------------------------------------------- the moth in the dust

def dust():
    """A drift of fine grey dust and, lying on it with its wings spread, a dead moth as big as
    a hand: feathery antennae, a banded body, dark bars across the wings."""
    return grid(16, 9, [
        '....55....55....',
        '......5665......',
        '.1444445544444..',
        '4455444466444554',
        '.44455546645554.',
        '..44444566544444',
        '1..445546645544.',
        '12..44.5665.44.2',
        '.111222255222211',
    ])


# ---------------------------------------------------------------- a cocoon

def cocoon():
    """A spider's cocoon on the ground, wound tight in silk round a traveller, the strap and
    buckle of his pack showing through."""
    g = grid(14, 18, [
        '.....sss......',
        '....SSssV.....',
        '...sssSSVV....',
        '...SssssVV....',
        '....SSssV.....',
        '..sssSSssVV...',
        '.SSsssssSVVV..',
        '.sssSSssssVV..',
        '.ssssssSSsVV..',
        '.SSssssssSVV..',
        '.sssSSssssVV..',
        '..sssssSSVV...',
        '..SSsssssVV...',
        '...ssSSsVVV...',
        '...sssssSVV...',
        '..S.SSsVV.V...',
        '.S..eEEEEe.V..',
        '...eEEEEEEe...',
    ])
    for x, y, s in ((4, 7, 'LL'), (5, 8, 'dLL'), (7, 9, 'dLIi'), (8, 10, 'dIi'), (11, 10, 'L'), (11, 11, 'Ld'), (12, 12, 'd')):
        g.at(x, y, s)
    return g


# ---------------------------------------------------------------- Heron Lodge

def beam():
    """The lodge's roll beam: a squared timber with the Wardens' names cut along it in three
    tiny lines."""
    return grid(30, 10, [
        '.WWWWWWWWWWWWWWWWWWWWWWWWWWWW.',
        'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwx',
        'WWWWWWWWWwWWWWWWWWWWWWWwWWWWwx',
        'WWxxxWxxxxWWxxWWxxxxWxxxWxxWwx',
        'WWWWWWWWWWWWWWWWWWWwWWWWWWWWwx',
        'WWxxWWxxxxxWxxxWWWxxWxxxxWWWwx',
        'WWWWWwWWWWWWWWWWWWWWWWWWWWWWwx',
        'WWxxxxWxxWWxxxWxxxxxWWxxWWWWwx',
        'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwx',
        '.xxxxxxxxxxxxxxxxxxxxxxxxxxxX.',
    ])


def rack():
    """A plank weapon rack holding two old spears, their heads spotted with rust, and an
    empty slot."""
    return grid(18, 24, [
        '....I....I........',
        '...IIi..IIi.......',
        '...IIi..ILi.......',
        '...ILi..IIi.......',
        '....i....i........',
        '....wx...wx.......',
        '.WWWwxWWWwxWWWxWW.',
        '.xwwwxwwwwxwwwxww.',
        '.Ww.wx...wx....Ww.',
        '.Ww.wx...wx....Ww.',
        '.Ww.wx...wx....Ww.',
        '.Ww.wx...wx....Ww.',
        '.Ww.wx...wx....Ww.',
        '.Ww.wx...wx....Ww.',
        '.Ww.wx...wx....Ww.',
        '.WWWwxWWWwxWWWxWW.',
        '.xwwwxwwwwxwwwxww.',
        '.Ww.wx...wx....Ww.',
        '.Ww.wx...wx....Ww.',
        '.Ww.xx...xx....Ww.',
        '.Ww............Ww.',
        '.Ww............Ww.',
        'WWwx..........WWwx',
        'xxxx..........xxxx',
    ])


# ---------------------------------------------------------------- the King's game book and post

def book():
    """The King's game book lying open on a small table, a red ribbon in its pages."""
    return grid(16, 16, [
        '................',
        '................',
        '..pPPPq..pPPPq..',
        '.pPPPPPqpPPPPPq.',
        '.PllllPqpPllllq.',
        '.PPPPPPqpPPPPPq.',
        '.PlllPPqpPlllPq.',
        '.PPPPPPqpPPPPPq.',
        '.PllllPqpPllPPq.',
        '77777777R7777778',
        'WWWWWWWWRWWWWWWw',
        'wwwwwwwwrwwwwwwx',
        '.Ww.....r....Wx.',
        '.Ww..........Wx.',
        '.Ww..........Wx.',
        '.xx..........xx.',
    ])


def post():
    """The King's post: a tall timber post with a proclamation nailed to it under a red seal."""
    return grid(12, 30, [
        '.....xx.....',
        '....xWWx....',
        '...xWWwwx...',
        '....WWwx....',
        '....WWwx....',
        '.pPPPPPPPPq.',
        '.PIllPllPIq.',
        '.PPPPPPPPPq.',
        '.PllPlllPPq.',
        '.PPPPPPPPPq.',
        '.PlllPPllPq.',
        '.PPPPPPPPPq.',
        '.PllPllPPPq.',
        '.PPPRRRPPPq.',
        '.PPPRrRPPPq.',
        '.qqqqrqqqqq.',
        '....WWwx....',
        '....WWwx....',
        '....WwWx....',
        '....WWwx....',
        '....WWwx....',
        '....WwWx....',
        '....WWwx....',
        '....WWwx....',
        '....WWwx....',
        '....WwWx....',
        '....WWwx....',
        '..eeWWwxee..',
        '.eEeEeEeEEe.',
        '..EEEEEEEE..',
    ])


# ---------------------------------------------------------------- the kennels

def kennels():
    """The kennel gate between two posts in a low plank wall, a ragged hole gnawed through it
    from inside, splinters standing out round the edge."""
    return grid(18, 20, [
        '...xx........xx...',
        '...Wx........Wx...',
        '...WxWwWwWwWwWx...',
        '...WxWwWwWwWwWx...',
        '...WxxxxxxxxxWx...',
        '...WxWwWwWwWxWx...',
        '...WxWwWwWxxWWx...',
        '...WxWwWxxWwWWx...',
        'WwWWxWxxWwWwWWxWwW',
        'WwWWxxxWwWwWwWxWwW',
        'WwWWxWwWwWwWwWxWwW',
        'WwWWxWwW.WWwWWxWwW',
        'WwWWxWW.BB.wWWxWwW',
        'WwWWxW.BBBBB.wWxWw',
        'WwWWxWBBBBBBwWWxWw',
        'WwWWx.BBBBBBB.WxWw',
        'WwWWxWBBBBBBBWWxWw',
        'WwWWx.BBBBBBB.WxWw',
        'xxxxxxBBBBBBBxxxxx',
        '.xxxx........xxxx.',
    ])


OBJECTS2 = {
    'hollow': [hollow()],
    'mark_goose': [mark(GOOSE)],
    'mark_jay': [mark(JAY)],
    'mark_owl': [mark(OWL)],
    'mark_heron': [mark(HERON)],
    'mark_crossing': [mark(HERON, GOOSE_ACROSS)],
    'thorn_page': [thorn_page(), thorn_page(True)],
    'cache': [cache()],
    'rope': [rope()],
    'firepit': [firepit()],
    'hearth': [hearth()],
    'firering': [firering()],
    'dust': [dust()],
    'cocoon': [cocoon()],
    'beam': [beam()],
    'rack': [rack()],
    'book': [book()],
    'post': [post()],
    'kennels': [kennels()],
}

if __name__ == '__main__':
    import sys
    ims = [render(g.rows(), PAL2, k=0.35) for frames in OBJECTS2.values() for g in frames]
    sheet(ims, scale=8).save(sys.argv[1] if len(sys.argv) > 1 else 'objects2.png')
