"""Act I item icons (20×20, lit from the top-left, outlined in the game): a bone hound fang,
a black thorn, a loaf of bread, a bandage roll, the warm cloak, hound-leather trousers and
the sexton's lantern. Edric's helm and Queen Elowen's amulet use the iron helm's and the
amulet's art (ItemDef.looks)."""
from tool import G, render, sheet


def grid(rows):
    g = G(20, 20)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.':
                g.at(x, y, ch)
    return g


def fang():
    """A curved canine: a dark root, the tooth bending to a point."""
    pal = {'B': '#fff8e6', 'b': '#ecdcb6', 'd': '#c8b088', 'D': '#8a7450', 'r': '#a0704a', 'R': '#5e3a1c'}
    return grid([
        '....................',
        '..........RRRRR.....',
        '.........RrrrrrR....',
        '.........RrrrrrrR...',
        '.........bBBBBbbd...',
        '.........bBBBBbbd...',
        '.........bBBBbbdD...',
        '.........bBBBbbdD...',
        '........bBBBbbdD....',
        '........bBBbbddD....',
        '.......bBBbbdD......',
        '......bBBbbdD.......',
        '.....bBbbddD........',
        '....bBbbdD..........',
        '...bBbdD............',
        '..bbdD..............',
        '..bD................',
        '..D.................',
        '....................',
        '....................',
    ]), pal


def thorn():
    """A black thorn shoot: a cold stem with hooked thorns, frost on the lit edges."""
    pal = {'K': '#a898b8', 'k': '#5c4c6a', 'z': '#2e2238', 'Z': '#1a1222', 'f': '#e0ecf8'}
    return grid([
        '.................f..',
        '................Kk..',
        '...............Kkz..',
        '..............Kkz...',
        '.........fK..Kkz....',
        '..........kz.kzz....',
        '...........kzkz.....',
        '...........Kkzz.....',
        '..........Kkz.zZ....',
        '.........Kkz...zZ...',
        '....fK..Kkz.....Z...',
        '.....kz.kzz.........',
        '......kzkz..........',
        '......Kkzz..........',
        '.....Kkz.zZ.........',
        '....Kkz...zZ........',
        '...Kkz.....Z........',
        '..kkz...............',
        '..zZ................',
        '....................',
    ]), pal


def bread():
    pal = {'Y': '#ffe0a0', 'G': '#e8b060', 'g': '#c07a38', 'h': '#8a4e22', 'c': '#fff2d0'}
    g = G(20, 20)
    rows = {
        5: (6, 'GGGGGGG'),
        6: (4, 'GGYYYYYGGg'),
        7: (3, 'GYYYYYYYYGgg'),
        8: (2, 'GYYYcYYYcYYGgg'),
        9: (2, 'GYYcYYYcYYYGgg'),
        10: (1, 'GYYYYYYYYYYYGGgg'),
        11: (1, 'GYYYYYYYYYYGGGgh'),
        12: (1, 'gGGYYYYYYGGGGggh'),
        13: (2, 'gGGGGGGGGGGgghh'),
        14: (3, 'ggGGGGGGGgghh'),
        15: (5, 'hhhhhhhhhh'),
    }
    for y, (x, s) in rows.items():
        g.at(x, y, s)
    # three slashes scored across the top
    for x, y in [(5, 8), (6, 9), (9, 7), (10, 8), (13, 7), (14, 8)]:
        g.at(x, y, 'g')
    return g, pal


def bandage():
    """A roll of linen lying on its side, end on to the left, the loose end trailing."""
    pal = {'W': '#ffffff', 'w': '#ece6d8', 'v': '#bcb29c', 'V': '#8a7e68', 'r': '#c84a3a'}
    return grid([
        '....................',
        '....................',
        '....................',
        '....vvvv............',
        '...vwWWwvvvvvvvvv...',
        '..vwWwwWwWWWWWWWWv..',
        '..vWwvvwWwwwwwwwwv..',
        '..vWvVVvWwwrrwwwwv..',
        '..vWvVVvWwrrrrwwwv..',
        '..vWwvvwWwwrrwwwwv..',
        '..vwWwwWwwwwwwwwwv..',
        '...vwWWwvvvvvvvvwv..',
        '....vvvv......vwwv..',
        '..............vwWv..',
        '...............vwwv.',
        '...............vwwv.',
        '................vwv.',
        '................vv..',
        '....................',
        '....................',
    ]), pal


def cloak():
    """A grey wool cloak: hood up, a brass clasp at the throat, the dark lining showing down the front."""
    pal = {'L': '#c8ccd2', 'l': '#9aa0aa', 'm': '#6a707c', 'n': '#3a3e48', 'G': '#ffe07a', 'g': '#c8901e'}
    return grid([
        '....................',
        '........mmmm........',
        '.......mLLLlm.......',
        '......mLLnnllm......',
        '......mLnnnnlm......',
        '.....mLLnnnnllm.....',
        '....mLLLLnnllllm....',
        '...mLLLLLGGlllllm...',
        '..mLLLLLLggLLlllm...',
        '..mLLLLLlnnlLLllm...',
        '..mLlLLLlnnlLLlllm..',
        '..mLlLLLlnnlLlLllm..',
        '.mLLlLLlnnnnlLlLllm.',
        '.mLLlLLlnnnnlLlLllm.',
        '.mLlLLlnnnnnnlLlLllm',
        '.mLlLLlnnnnnnlLlLllm',
        '.mmmlmmnnnnnnmmlmmmm',
        '..m.m.m......m.m.m..',
        '....................',
        '....................',
    ]), pal


def trousers():
    pal = {'L': '#a8784a', 'l': '#7e5530', 'm': '#56381c', 'B': '#ecdcb6', 'b': '#bca47a', 's': '#c8a070'}
    g = G(20, 20)
    rows = {
        2: (4, 'mmmmmmmmmmmm'),
        3: (4, 'lLBLLLLLLBLm'),
        4: (4, 'lLbLLLLLLbLm'),
        5: (4, 'lLLLLLLLLLLm'),
        6: (4, 'lLLLLllLLLLm'),
        7: (4, 'lLLLLmmLLLLm'),
        8: (4, 'lLLLm..lLLLm'),
        9: (4, 'lLLLm..lLLLm'),
        10: (4, 'lLsLm..lLsLm'),
        11: (4, 'lLLLm..lLLLm'),
        12: (4, 'lLLLm..lLLLm'),
        13: (4, 'lLsLm..lLsLm'),
        14: (4, 'lLLLm..lLLLm'),
        15: (4, 'lLLLm..lLLLm'),
        16: (4, 'mmmmm..mmmmm'),
    }
    for y, (x, s) in rows.items():
        g.at(x, y, s)
    return g, pal


def lantern():
    pal = {'I': '#c4cedc', 'i': '#7e8aa0', 'j': '#4c5468', 'k': '#2a2e3a', 'Y': '#fff6b0', 'O': '#ffc850', 'o': '#e8862c'}
    g = G(20, 20)
    rows = {
        0: (8, 'jjjj'),
        1: (7, 'j....j'),
        2: (7, 'j....j'),
        3: (8, 'jjjj'),
        4: (7, 'iIIIIi'),
        5: (6, 'iIIIIIIj'),
        6: (5, 'kiiiiiiiik'),
        7: (5, 'kYYkOOkOok'),
        8: (5, 'kYYkOOkOok'),
        9: (5, 'kYOkOOkOok'),
        10: (5, 'kOOkOokOok'),
        11: (5, 'kOOkOokook'),
        12: (5, 'kOokOokook'),
        13: (5, 'kiiiiiiiik'),
        14: (6, 'iIIIIIIj'),
        15: (7, 'jjjjjj'),
    }
    for y, (x, s) in rows.items():
        g.at(x, y, s)
    return g, pal


ICONS = {
    'bone_fang': fang(), 'black_thorn': thorn(), 'bread': bread(), 'bandage': bandage(),
    'warm_cloak': cloak(), 'hound_trousers': trousers(), 'sexton_lantern': lantern(),
}

if __name__ == '__main__':
    import sys
    ims = [render(g.rows(), p, k=0.3) for g, p in ICONS.values()]
    sheet(ims, scale=10).save(sys.argv[1] if len(sys.argv) > 1 else 'items2.png')
