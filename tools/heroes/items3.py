"""Act II item icons (20×20, lit from the top-left, outlined in the game): the two Warden
whistles, the Weepwood materials (thornback pelt, spider silk, black willow, charcoal, steel),
venison three ways, Mother Dunn's pie and Maud's flour, and the Act II gear (the Warden set,
the steel pieces, the silk recurve, the trophies and the barrow's and the jailer's spoils).
DROPS holds the smaller ground sprites for the food. Run this file for a magnified preview."""
from tool import G, render, sheet


def grid(rows):
    g = G(20, 20)
    for y, r in enumerate(rows):
        g.at(0, y, r)
    return g


# ---------------------------------------------------------------- keepsakes

def aldric_whistle():
    """A yellowed bone whistle: a fat tube rising to the mouthpiece, its window notched into
    the lit edge just below, the knuckle end bored for a leather thong that loops away."""
    pal = {'B': '#fff4cc', 'b': '#ecd498', 'd': '#c8a660', 'D': '#8e6c34', 'h': '#4e3618',
           'W': '#ffffff', 'T': '#b47a48', 't': '#7a4a26'}
    return grid([
        '....................',
        '....................',
        '....ttt.........Bd..',
        '...T...t.......BBdD.',
        '..T.....t.....BBbdD.',
        '..T......t...h.bbdD.',
        '.T.......t..hhbbdD..',
        '.T.......t.WBbbdD...',
        '.T......t.BBbbdD....',
        '..T....t.BBbbdD.....',
        '..T...t.BBbbddD.....',
        '...T.t.BBbbddD......',
        '....TTBBbbdD........',
        '...BBBBbbdD.........',
        '..BbbbhbdD..........',
        '..bbddbbdD..........',
        '...bdD.bdD..........',
        '.......dD...........',
        '....................',
        '....................',
    ]), pal


def marcian_whistle():
    """An older, smaller whistle of the same make, the bone gone brown with age, a nick cut
    into its edge, the cord long gone from the bored knuckle."""
    pal = {'B': '#dcc494', 'b': '#b8945e', 'd': '#8a6638', 'D': '#5a3e20', 'h': '#2a1a0c',
           'n': '#2a1a0c', 'N': '#f4e4bc', 'W': '#fff0cc'}
    return grid([
        '....................',
        '....................',
        '....................',
        '...............Bd...',
        '..............BbdD..',
        '.............h.bdD..',
        '............hhbdD...',
        '...........WBbdD....',
        '..........BBbdD.....',
        '.........BBbdD......',
        '..........nbdD......',
        '.......BNnbdD.......',
        '......BBbddD........',
        '.....BBbdbD.........',
        '...BBBbbdD..........',
        '..BbbhbdD...........',
        '..bddbbdD...........',
        '...bdD.dD...........',
        '....................',
        '....................',
    ]), pal


# ---------------------------------------------------------------- materials

def thornback_pelt():
    """A thornback wolf's pelt folded over: charcoal along the backbone, where the bone spines
    still stand out of the hide, paling to a ragged fringe of belly fur, the tail hanging."""
    pal = {'W': '#b4b8c0', 'L': '#8a8e96', 'M': '#62666e', 'D': '#44474e', 'K': '#2c2e34',
           'B': '#fbf4e2', 'b': '#d6c6a2', 'c': '#a8966e', 'T': '#d8dce2'}
    return grid([
        '....................',
        '.........B..........',
        '....B....Bb.........',
        '....Bb....Bc...B....',
        '.....Bc...Bc...Bb...',
        '...KDBcDDDBcDDDDBcK.',
        '..DMMDMMMMDMMMMMMDMK',
        '.DMMMMMMMMMMMMMMMMDK',
        '.DMLMMMLMMMMLMMMMLDK',
        '.MLMMLMMLLMMMLMMLMMD',
        '.MLLMLLMLLLMLLLMLMMD',
        '.LLLLLLLLLLLLLLLLLMD',
        'LLWLLWLLLWLLWLLLWLMD',
        'WLWLWWLWLWLWWLWLLWMD',
        'WLW.WLW.LW.WLW.WLMDK',
        '.W..WL...W..WL..WLD.',
        '....W.........W.LDD.',
        '................LMD.',
        '................TLD.',
        '.................T..',
    ]), pal


def spider_silk():
    """A skein of spider silk wound in a figure of eight, the strands running round its two
    loops, glossy white on the lit side, tied at the waist with twine."""
    pal = {'W': '#ffffff', 'w': '#e2e6ee', 'v': '#b4bccb', 'd': '#7e889c', 'T': '#e0bc80', 't': '#a07c48'}
    return grid([
        '....................',
        '..............vWww..',
        '............wwWvWvv.',
        '...........Wwwdvvwdd',
        '..........Wwwd..Wvvd',
        '.........Wwwd..Wvvd.',
        '.........wwd..Wvvd..',
        '.........wvvdWvvdd..',
        '........TTvvwddd....',
        '......vWtTT.........',
        '....wwWvWtTt........',
        '...Wwwdvvwtt........',
        '..Wwwd..Wvvt........',
        '.Wwwd..WvvdT........',
        '.wwd..Wvvd..t.......',
        '.wvvdWvvdd..........',
        '.vvvwddd............',
        '....................',
        '....................',
        '....................',
    ]), pal


def black_willow():
    """A billet of black willow: near-black bark, horn-hard, with a cold blue sheen on the
    cut end and its tight rings."""
    pal = {'L': '#5c6274', 'k': '#3a3d4a', 'K': '#282a34', 'z': '#181a22',
           'W': '#f4f8ff', 'c': '#c8daf0', 'C': '#9cb4d2', 'r': '#6e86a8', 'x': '#3a4860'}
    return grid([
        '....................',
        '....................',
        '.............kkk....',
        '...........kkWccx...',
        '..........LkWcCCcx..',
        '.........LLkcCrrCcx.',
        '........LLLkcrCCrcx.',
        '.......LLLkkcCrrCcx.',
        '......LLLkkkxcCCcxx.',
        '.....LLLkkkkKxxxxx..',
        '....LLLkkkkKKKzzz...',
        '...LLLkzkkKKKzzz....',
        '..LLLkkzkKKKzz......',
        '..LLkkkkzKKzz.......',
        '..LkkkkkKKzz........',
        '...kkzkKKzz.........',
        '...kkKKKzz..........',
        '....KKKzz...........',
        '....................',
        '....................',
    ]), pal


def charcoal():
    """Three lumps of charcoal, the wood's grain cracked across them, a silver glint on each."""
    pal = {'W': '#f2f6fc', 'g': '#a4acbc', 'L': '#6c6c7c', 'l': '#4a4a58', 'k': '#30303a', 'K': '#1c1c24'}
    return grid([
        '....................',
        '....................',
        '....................',
        '......gLLL..........',
        '.....gLLLLl.........',
        '....gLLWLlll........',
        '....LLLLLkllk.......',
        '....lLkLLlllkk......',
        '....lllkllllkkK.....',
        '.....lllkkkgLLK.....',
        '......kkkKgLWLll....',
        '....gLLKKgLLLLlll...',
        '...gLWLlkLLkLLlkk...',
        '..gLLLLlklllllkkkK..',
        '..LLkLlllklllkkkkK..',
        '..llllklkKlllkkKK...',
        '...lkkkKK.kkKKK.....',
        '....KKKK............',
        '....................',
        '....................',
    ]), pal


def steel_bar():
    """The forge's ingot in bright, blue-white steel, a glint along its top."""
    from craftart import ingot_icon
    g = ingot_icon()
    g.at(8, 7, 'WWW')
    g.at(4, 10, 'W')
    pal = {'W': '#ffffff', 'T': '#eef4fe', 'F': '#b6cae6', 'f': '#7e9cc6', 's': '#5474a4', 'k': '#33486e'}
    return g, pal


# ---------------------------------------------------------------- food

HAUNCH = [
    '....................',
    '..........mmmm......',
    '........mMMMMmmn....',
    '.......mMMffMMmmn...',
    '.......MMMMfMMmmnn..',
    '......mMMMMMMmmmnnn.',
    '......MMMMMMMmmnmnn.',
    '.....mMMfMMMmmnmmnn.',
    '.....MMMMfMmmmnmmnn.',
    '.....MMMMMmmmnmmnnn.',
    '.....mMMMmmmmnmnnn..',
    '....mMMMmmmmnmnnn...',
    '....mMMmmmmnnnn.....',
    '...mMmmmmnnnn.......',
    '...bmmmnnnn.........',
    '..bBbnnn............',
    '.bBBb...............',
    'bBBBbb..............',
    'BBbbBc..............',
    '.bb.bc..............',
]
HAUNCH_DROP = [
    '.....mmmm..',
    '...mMMfMmn.',
    '..mMMMMmmnn',
    '..MMfMmmnnn',
    '.mMMMmmnnn.',
    'bmMmmnnn...',
    'BBbnnn.....',
    'Bbb........',
]
BONE = {'B': '#fffaf0', 'b': '#d8ccb0', 'c': '#b0a488'}
SMOKED_DROP = [
    '.......Rrk...',
    '....RrRrfk.Rk',
    '..RrfTtrk.Rfk',
    '.RrrkTtRrRrk.',
    'RrfkRrTtrfk..',
    'Rrk.RfkTtk...',
    '.k..kk..t....',
]
PIE_DROP = [
    '...YgYgYg...',
    '.YgYGGGGgYg.',
    'YGYYGrhGGGgg',
    'gYGGGGGGGggh',
    'hgYgYgYgYghh',
    'ghggghgggghh',
    '.hhhhhhhhhh.',
]


def venison():
    """A raw haunch of venison: the round of the leg tapering to the shank, a seam between the
    muscles, the hock bone standing out of the end."""
    pal = {'M': '#ec7a6e', 'm': '#c04640', 'n': '#82242a', 'f': '#fad6c6', **BONE}
    return grid(HAUNCH), pal


def roast_venison():
    """The haunch roasted: browned, crisp at the edges, glistening with fat."""
    pal = {'M': '#d8945a', 'm': '#a65a2c', 'n': '#682c14', 'f': '#ffd890', 'W': '#fff8e8', **BONE}
    g = grid(HAUNCH)
    for x, y in ((10, 3), (8, 7), (7, 10)):
        g.at(x, y, 'W')
    return g, pal


def smoked_venison():
    """Flat strips of smoked venison, dark and streaked, their ends torn, tied in a bundle
    with twine and a bow."""
    pal = {'R': '#b05c3e', 'r': '#7e3424', 'm': '#62261a', 'k': '#40140c', 'f': '#d4906c',
           'T': '#f0dca8', 't': '#b49a68'}
    return grid([
        '....................',
        '....................',
        '............Rrrmk...',
        '...........Rrrk.....',
        '..........Rrfk..Rrrk',
        '.........Rfrk..Rrfk.',
        '...TTT..Rrrk..Rrrmk.',
        '...T.TTtrfk..Rfrk...',
        '....T.RTtk..Rrrk..Rr',
        '.....RrrTt.Rrfk..Rfk',
        '....Rrrk.Ttrrk..Rrmk',
        '...Rrfk..RTtk..Rrk..',
        '..Rfrk..RrrTt.Rfk...',
        '.Rrrk..Rfrk.tRrk....',
        '......Rrrk..tfk.....',
        '.....Rrfk..Rrtk.....',
        '..........Rrk.......',
        '.........Rfk........',
        '....................',
        '....................',
    ]), pal


def dunn_pie():
    """Mother Dunn's pie: a golden crust with a crimped rim, the steam vent cut through the
    middle showing the dark filling."""
    pal = {'Y': '#ffeaa8', 'G': '#f4c464', 'g': '#cc8a3c', 'h': '#8e5222', 'r': '#6e2a1a'}
    return grid([
        '....................',
        '....................',
        '....................',
        '....................',
        '....................',
        '......YgYgYgYgYg....',
        '....YgYGGGGGGGGgYg..',
        '...YGYYYGGGGGGGGgg..',
        '..YgYYYGGrhGGGGGGgg.',
        '..gYYYGGGGrhGGGGGgh.',
        '..YgYGGGGGGGGGGGggh.',
        '...gYgGGGGGGGGgghh..',
        '..hgYgYgYgYgYgghgh..',
        '..ghggghggghgggghh..',
        '..gghggghggghgggh...',
        '...hhhhhhhhhhhhhh...',
        '....................',
        '....................',
        '....................',
        '....................',
    ]), pal


def flour_sack():
    """A sack of flour tied at the neck, flour puffing out of the top and spilt at its foot,
    two blue stripes woven round the cloth."""
    pal = {'W': '#ffffff', 'L': '#f4ecd8', 'M': '#d8c8a4', 'D': '#a8946c', 'K': '#766444',
           'T': '#c08a50', 't': '#7e5228', 'e': '#7a98c8', 'E': '#56709c'}
    return grid([
        '....................',
        '........W..W........',
        '.....W..WWW...W.....',
        '.......LWLLWM.......',
        '......LLWLLMMD......',
        '.......LLLMMD.......',
        '........TTtt........',
        '.......LLLMMD.......',
        '......LLLLLMMD......',
        '.....LLLLLLLMMD.....',
        '....LLLLLLLLMMMD....',
        '...eeeeeeeeeeEEE....',
        '...LLLLLLLLLLMMMD...',
        '..eeeeeeeeeeEEEEE...',
        '..LLLLLLLLLLMMMMDD..',
        '..LLLLLLLLLMMMMDDD..',
        '..MLLLLLLMMMMMMDDK..',
        '...MMMMMMMMMMMDDK.W.',
        '....DDDDDDDDDDKKWWW.',
        '....................',
    ]), pal


# ---------------------------------------------------------------- the Warden set

WARDEN = {'L': '#a4b298', 'l': '#7c8c70', 'm': '#5a6850', 'n': '#3a4432', 'k': '#232a1e',
          'S': '#f4f8fc', 's': '#aab4c4', 'z': '#6a7488'}


def warden_cloak():
    """A grey-green wool cloak, the hood thrown back in a roll round the shoulders, the dark
    lining down the front, and at the throat the silver Warden badge: a feather in a ring."""
    g = grid([
        '....................',
        '....................',
        '......mmmmmmmm......',
        '....mmLLLLLLLLlmm...',
        '...mLLLLLLLLlllllm..',
        '...mLLLLLLLllllllm..',
        '...mmlllllllllllmm..',
        '..mLLlLLLLnnLLlllm..',
        '..mLLlLLLlnnlLlllm..',
        '..mLlLLLLlnnlLLlllm.',
        '..mLlLLLlnnnlLLlllm.',
        '.mLLlLLLlnnnlLlLlllm',
        '.mLLlLLlnnnnnlLlLllm',
        '.mLLlLLlnnnnnlLlLllm',
        '.mLlLLlnnnnnnnlLlLlm',
        '.mLlLLlnnnnnnnlLlLlm',
        '.mmlmmmnnnnnnnmmlmmm',
        '..m.m.m.......m.m.m.',
        '....................',
        '....................',
    ])
    for y, r in enumerate(['..sSs..', '.SkkkW.', 'SkkWWsz', 'SkWWskz', 'SWWskkz', '.Wskkz.', '..szz..']):
        g.at(7, 3 + y, r)
    return g, {**WARDEN, 'W': '#ffffff'}


def warden_hood():
    """A grey-green hood with a deep cowl and a short shoulder cape, its hem cut in points."""
    return grid([
        '....................',
        '.........mm.........',
        '.......mmLLm........',
        '......mLLLLLm.......',
        '.....mLLLLLLlm......',
        '....mLLLLLLLllm.....',
        '....mLLLnnnnllm.....',
        '...mLLLnkkkknllm....',
        '...mLLnkkkkkknllm...',
        '...mLLnkkkkkknllm...',
        '...mLLnkkkkkknllm...',
        '...mLLLnkkkknlllm...',
        '..mLLLLLnnnnllllm...',
        '..mLLLLLLLllllllllm.',
        '.mLLlLLLLlllllllllm.',
        '.mLLlLLLLllllllllllm',
        '.mLlLLLlLlLllllllllm',
        '..mLm.mLm.mlm.mlm.m.',
        '...m...m...m...m....',
        '....................',
    ]), {k: v for k, v in WARDEN.items() if k in 'Llmnk'}


def warden_boots():
    """A soft grey-green leather boot, the top turned down in a cuff, a thong wound round
    the shaft, the toe soft and rounded."""
    pal = {'A': '#aebaa0', 'B': '#8a9a7c', 'S': '#667458', 'D': '#465240', 't': '#5a4028',
           'O': '#3a3428', 'o': '#5c5240'}
    return grid([
        '....................',
        '....................',
        '.....AAAAAAAS.......',
        '.....ABBBBBBSD......',
        '.....SSSSSSSDD......',
        '......ABBBBSD.......',
        '......AtBBtSD.......',
        '......ABttBSD.......',
        '......AtBBtSD.......',
        '......ABBBBSD.......',
        '......ABBBBBSD......',
        '......ABBBBBBSSD....',
        '.....AABBBBBBBBSSD..',
        '.....ABBBBBBBBBBBSD.',
        '.....SBBBBBBBBBBBSD.',
        '.....OOOOOOOOOOOOOO.',
        '......oooooooooooo..',
        '....................',
        '....................',
        '....................',
    ]), pal


def _blade(g, x0, y0, n, edge='B', core='b', shade='c', back=None):
    """A blade rising from (x0, y0) to the upper right: lit edge, core, shaded edge, and an
    optional fourth line for a broader blade."""
    for i in range(n):
        x, y = x0 + i, y0 - i
        g.at(x, y - 1, edge)
        g.at(x, y, core)
        g.at(x + 1, y, shade)
        if back:
            g.at(x + 1, y + 1, back)
    g.at(x0 + n, y0 - n, edge)


def warden_blade():
    """A plain straight sword: grey steel, a simple iron bar for a guard, a green-wrapped grip
    and an iron pommel."""
    pal = {'B': '#f4f6f8', 'b': '#c8d0d8', 'c': '#8a96a4', 'I': '#b4bcc8', 'i': '#6e7888', 'j': '#464e5c',
           'E': '#6aa86a', 'e': '#2e5e3a'}
    g = G(20, 20)
    _blade(g, 7, 12, 11)
    for k in range(-3, 4):
        g.at(6 + k, 13 + k, 'I' if k < 0 else 'i')
    g.at(3, 10, 'j'); g.at(9, 16, 'j')
    g.at(5, 14, 'E'); g.at(4, 14, 'e'); g.at(4, 15, 'E'); g.at(3, 15, 'e'); g.at(3, 16, 'E'); g.at(2, 16, 'e')
    g.at(1, 17, 'II'); g.at(1, 18, 'ij')
    return g, pal


def warden_longbow():
    """A long bow of grey-green stained wood with a dark leather grip and horn nocks."""
    from archery import bow
    g = bow(4.6, 'Gg', 'Y', reach=(1, 18, 18, 1))
    pal = {'W': '#aab894', 'w': '#6e7e5e', 'd': '#4a563e', 'G': '#6a4a30', 'g': '#40301e', 'Y': '#f2ead6', 'S': '#ece4d0'}
    return g, pal


# ---------------------------------------------------------------- steel

def steel_sword():
    """A bright steel sword, broad in the blade with a fuller, a gold guard swept toward the
    blade, a dark leather grip and a gold pommel."""
    pal = {'B': '#ffffff', 'b': '#e4ecf8', 'f': '#a8bad4', 'c': '#7a8eac', 'G': '#fff0a0', 'g': '#d8a03a',
           'h': '#8a5a14', 'k': '#5a3a2a', 'K': '#38221a'}
    g = G(20, 20)
    _blade(g, 7, 12, 11, 'B', 'b', 'f', 'c')
    for k in range(-3, 4):
        g.at(6 + k, 13 + k, 'G' if k < 0 else 'g')
        g.at(7 + k, 13 + k, 'g' if k < 0 else 'h')
    g.at(2, 9, 'G'); g.at(10, 17, 'h')
    g.at(5, 14, 'k'); g.at(4, 14, 'K'); g.at(4, 15, 'k'); g.at(3, 15, 'K'); g.at(3, 16, 'k')
    g.at(1, 16, 'G'); g.at(1, 17, 'Gg'); g.at(1, 18, 'gh')
    return g, pal


def steel_shield():
    """A steel kite shield: a bright rim, a dark green field and a silver boss, rivets round
    the edge."""
    pal = {'S': '#f4f8fe', 's': '#a8b8cc', 'A': '#3e7a4c', 'a': '#2a5838',
           'N': '#ffffff', 'O': '#c8d4e2', 'U': '#7e8ca4'}
    g = G(20, 20)
    for y in range(1, 19):
        half = 8 if y < 9 else max(0, 8 - (y - 8) * 0.85)
        for x in range(20):
            dx = abs(x + 0.5 - 10)
            if dx <= half:
                edge = dx > half - 1.2 or y == 1
                g.at(x, y, ('S' if x < 10 else 's') if edge else ('A' if x < 10 else 'a'))
    for x, y in ((4, 3), (15, 3), (4, 9), (15, 9), (9, 15)):
        g.at(x, y, 'O')
    g.at(9, 6, 'NO'); g.at(8, 7, 'NOOU'); g.at(8, 8, 'OOUU'); g.at(9, 9, 'UU')
    return g, pal


def steel_helm():
    """A rounded helm of bright steel: a raised ridge over the crown, a riveted brow band and
    a long nasal between the eyes."""
    pal = {'N': '#ffffff', 'O': '#d0dcec', 'U': '#94a6c0', 'V': '#5e7090', 'X': '#3a4864', 'r': '#f4f8ff', 'k': '#1c2230'}
    return grid([
        '....................',
        '........NNOO........',
        '......NNNNOOOU......',
        '.....NNOONOOOUU.....',
        '....NNOOONOOOUUV....',
        '....NOOOONOOUUUV....',
        '...NNOOOONOOUUUVV...',
        '...NOOOOONOOUUUVV...',
        '...VVVVVVVVVVVVVX...',
        '...NrOOrOOrOOrUVX...',
        '...VUUUUUUUUUUVVX...',
        '...NOUkkNUkkUUVX....',
        '...NOUkkNUkkUVVX....',
        '...OUUkkNUkkUVV.....',
        '....UU..NU..VV......',
        '........UV..........',
        '........VX..........',
        '....................',
        '....................',
        '....................',
    ]), pal


# ---------------------------------------------------------------- the archer's recurve

def silk_recurve():
    """A recurve of black willow, its tips flicking away from the string, strung and grip-wrapped
    with pale spider silk."""
    pal = {'L': '#626a84', 'k': '#2e3040', 'K': '#1c1d26', 'S': '#f6f6fa', 'W': '#ffffff', 'w': '#c4c8d2'}
    g = G(20, 20)
    lower = [(6, 6, 'w'), (5, 7, 'W'), (6, 7, 'w'), (7, 7, 'W'), (4, 8, 'L'), (5, 8, 'L'), (6, 8, 'w'),
             (4, 9, 'L'), (5, 9, 'k'), (3, 10, 'L'), (4, 10, 'L'), (5, 10, 'k'), (3, 11, 'L'), (4, 11, 'k'),
             (3, 12, 'L'), (4, 12, 'k'), (3, 13, 'L'), (4, 13, 'k'), (4, 14, 'L'), (5, 14, 'k'),
             (3, 15, 'L'), (4, 15, 'k'), (2, 16, 'L'), (3, 16, 'K'), (2, 17, 'K')]
    for x, y, c in lower:
        g.at(x, y, c)
        g.at(y, x, c)
    for i in range(6, 14):
        g.at(i, 19 - i, 'S')
    return g, pal


# ---------------------------------------------------------------- trophies and spoils

def thornback_jerkin():
    """A sleeveless jerkin of grey thornback hide, laced at the throat, belted, bone studs
    standing up from the shoulders."""
    pal = {'W': '#b8b8b4', 'L': '#909090', 'M': '#6c6c70', 'D': '#4a4a50', 'K': '#303036',
           'B': '#fbf4e2', 'b': '#d6c6a2', 'T': '#c89a62', 't': '#5a3c22'}
    return grid([
        '....................',
        '....B..B....B..B....',
        '...bBbbBb..bBbbBb...',
        '...WLLLLLK.KLLLLMD..',
        '..WLLLLLLKtKLLLLLMD.',
        '..WLLLLLLLKLLLLLLMD.',
        '...LLLLLLTKTLLLLMD..',
        '....WLLLLLKLLLLMD...',
        '....WLLLLTKTLLLMD...',
        '....WLLLLLKLLLLMD...',
        '....ttttttbtttttt...',
        '....WLLLLLLLLLLMD...',
        '....WLLMLLLLMLLMD...',
        '....WLLLLLLLLLLMD...',
        '....WLMLLLMLLLMMD...',
        '....LMMMMMMMMMMMD...',
        '....DLDDLDDLDDLDK...',
        '.....D..D..D..D.....',
        '....................',
        '....................',
    ]), pal


def fang_necklace():
    """A cord strung with yellowed fangs, a gold bead at the middle."""
    pal = {'T': '#a8784a', 't': '#6a4426', 'B': '#fff2c8', 'b': '#e2c888', 'd': '#a88a54',
           'G': '#fff0a0', 'g': '#d8a03a', 'h': '#8a5a14'}
    return grid([
        '....................',
        '..T..............t..',
        '..T..............t..',
        '...T............t...',
        '...T............t...',
        '....T..........t....',
        '....TT........tt....',
        '.....T........t.....',
        '....bBT......tBb....',
        '....BbdT....tBbd....',
        '...bBd..TGGt..Bbd...',
        '...Bd..bBghBb..bd...',
        '...b...BbhhBd...d...',
        '.......bd..bd.......',
        '.......b....d.......',
        '....................',
        '....................',
        '....................',
        '....................',
        '....................',
    ]), pal


def broodsilk_leggings():
    """Close-fitting leggings of pale grey brood silk with a soft sheen, a drawstring at the
    waist and silk wound round the ankles."""
    pal = {'W': '#ffffff', 'w': '#dcdee4', 'v': '#aeb2bc', 'V': '#7c808c', 'T': '#f4f4f6'}
    return grid([
        '....................',
        '....................',
        '....vvvvvvvvvvvv....',
        '....wWWWWWWWWWwV....',
        '....wWwwwTTwwwvV....',
        '....WWwwwTTwwwvV....',
        '....WWwwwwwwwwvV....',
        '....WWwwwVVwwwvV....',
        '....WWwwV..WWwvV....',
        '....WWwwV..WWwvV....',
        '.....WwwV..WWwV.....',
        '.....WwwV..WWwV.....',
        '.....WwvV..WwvV.....',
        '.....WwvV..WwvV.....',
        '.....vvvV..vvvV.....',
        '.....WwvV..WwvV.....',
        '.....vvvV..vvvV.....',
        '.....VVVV..VVVV.....',
        '....................',
        '....................',
    ]), pal


def pell_horn():
    """Grandad Pell's hunting horn: old yellowed horn curving up to the bell, banded in brass,
    slung on a leather strap."""
    pal = {'H': '#f6e6c0', 'h': '#d8b680', 'k': '#a07a48', 'K': '#3a2414',
           'G': '#ffe08a', 'g': '#c8962c', 'T': '#9a6a40', 't': '#5e3c22'}
    return grid([
        '....................',
        '....................',
        '....................',
        '....tTTTTTt.........',
        '...T.......tt.......',
        '..T..........tt.GG..',
        '..T............tGKKG',
        '.T............GKKKKg',
        '.T..........HHGKKKKg',
        '.T........HHHhgKKKgg',
        '.T......HHHhhhkgKKg.',
        '.GgHHHHHHhhhhkkkgg..',
        'GgHHhhhGhhhkkkk.....',
        'gkhhhhhgkkkkk.......',
        '..kkkkkgkk..........',
        '....................',
        '....................',
        '....................',
        '....................',
        '....................',
    ]), pal


def bonespine_mantle():
    """Bonespine's skull worn as a helm, its snout over the brow and fangs hanging, with the
    old wolf's spined grey hide falling behind."""
    pal = {'S': '#f8f0dc', 's': '#d4c4a0', 'd': '#9c8a66', 'k': '#2a2018',
           'L': '#8a8e96', 'M': '#62666e', 'D': '#44474e', 'K': '#26282e',
           'B': '#fbf4e2', 'b': '#c8b898'}
    return grid([
        '...B.....B.....B....',
        '...Bb....Bb....Bb...',
        '....Bb...Bb...Bb....',
        '..LMMbMSSSSSSMbMMD..',
        '.LMMSSSSSSSSSSssMMD.',
        '.LMSSSSSSSSSSSSsdMD.',
        '.LMSkkkSSSSskkksdMD.',
        '.LMSkkkSSSSskkksdMD.',
        '.LMsSSSSsSSssssddMD.',
        '.LMMsSSSSSSsssddMMD.',
        '.LMMMssSSSssddMMMMD.',
        '.LMLMMsSSSsdMMMLMMD.',
        '.LMLMMBskksdBMMLMMD.',
        '.LMLMMb.KK..dMMLMMD.',
        '.LLMLM.KKKK.MMLMMMD.',
        '.LMLMMKKKKKKMMLMMDD.',
        '.LLMLMMKKKKMMMLMMMD.',
        '..LMDLMDLMMDLMDLMD..',
        '...D..D..D..D..D....',
        '....................',
    ]), pal


def thane_torc():
    """The Thane's torc: a twisted ring of green bronze, open at the throat, its two ends
    swelling into knobs."""
    pal = {'W': '#eef8e4', 'A': '#b4daa4', 'a': '#72a67c', 'e': '#447a58', 'E': '#28503c'}
    ring = [
        '....................',
        '....................',
        '......########......',
        '....############....',
        '...####......####...',
        '..###..........###..',
        '.###............###.',
        '.###............###.',
        '.###............###.',
        '.###............###.',
        '..###..........###..',
        '..####........####..',
        '...####......####...',
        '.....###....###.....',
    ]
    g = G(20, 20)
    for y, r in enumerate(ring):
        for x, c in enumerate(r):
            if c == '#':
                lit = (x < 10 and y < 11) or y < 3
                g.at(x, y, ('Aae' if lit else 'aeE')[(x + y) % 3])
    for y, (l, r) in enumerate(zip(['.WA.', 'WAae', 'Aaee', '.eE.'], ['.Aa.', 'Aaee', 'aeeE', '.EE.'])):
        g.at(4, 13 + y, l)
        g.at(12, 13 + y, r)
    return g, pal


def royal_greaves():
    """Royal guard greaves: the first plate in the game, gone to rust, with tarnished gold
    trim at the waist, the thighs and the knee cops."""
    pal = {'N': '#dce2ea', 'O': '#a8b2be', 'U': '#78828e', 'V': '#4e5662', 'R': '#c87a40', 'r': '#8e4a22',
           'G': '#e0c068', 'g': '#a0802e'}
    return grid([
        '....................',
        '....................',
        '....GGGGGGGGGGGg....',
        '....NOOOOOOOOOOU....',
        '....NOOrROOOOOUV....',
        '....NOOOOV.NOOUV....',
        '....NOrOUV.NOOUV....',
        '....NRrOUV.NrOUV....',
        '....GGGGg..GGGgg....',
        '...NNOOOUV.NNOOUV...',
        '...NOOrOUV.NOOOUV...',
        '....VUUUV...VUUV....',
        '....NOOUV..NOOUV....',
        '....NOrUV..NORUV....',
        '....NOrUV..NOrUV....',
        '....NOOUV..NOOUV....',
        '...NOOOUV.NOOOUV....',
        '...VVVVVV.VVVVVV....',
        '....................',
        '....................',
    ]), pal


ICONS = {
    'aldric_whistle': aldric_whistle(),
    'marcian_whistle': marcian_whistle(),
    'thornback_pelt': thornback_pelt(),
    'spider_silk': spider_silk(),
    'black_willow': black_willow(),
    'charcoal': charcoal(),
    'steel_bar': steel_bar(),
    'venison': venison(),
    'roast_venison': roast_venison(),
    'smoked_venison': smoked_venison(),
    'dunn_pie': dunn_pie(),
    'flour_sack': flour_sack(),
    'warden_cloak': warden_cloak(),
    'warden_hood': warden_hood(),
    'warden_boots': warden_boots(),
    'warden_blade': warden_blade(),
    'warden_longbow': warden_longbow(),
    'steel_sword': steel_sword(),
    'steel_shield': steel_shield(),
    'steel_helm': steel_helm(),
    'silk_recurve': silk_recurve(),
    'thornback_jerkin': thornback_jerkin(),
    'fang_necklace': fang_necklace(),
    'broodsilk_leggings': broodsilk_leggings(),
    'pell_horn': pell_horn(),
    'bonespine_mantle': bonespine_mantle(),
    'thane_torc': thane_torc(),
    'royal_greaves': royal_greaves(),
}

# small ground sprites for the food (drawn in the icon's palette, like the meat and log drops)
DROPS = {
    'venison': HAUNCH_DROP,
    'roast_venison': HAUNCH_DROP,
    'smoked_venison': SMOKED_DROP,
    'dunn_pie': PIE_DROP,
}

if __name__ == '__main__':
    import sys
    ims = [render(g.rows(), p, k=0.3) for g, p in ICONS.values()]
    ims += [render(r, ICONS[k][1], k=0.22) for k, r in DROPS.items()]
    sheet(ims, scale=8).save(sys.argv[1] if len(sys.argv) > 1 else 'items3.png')
