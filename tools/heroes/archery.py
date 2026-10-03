"""The archer's gear icons (20×20, lit from the top-left, outlined in the game): the worn
shortbow, the hunting bow, the yew longbow, and the leather and hunter's quivers. Bows lie
corner to corner like the swords: the limb arcs to the top-left (the lit side), the string
runs straight between the tips. Run this file for a magnified preview (archery.png)."""
import math
from tool import G, render, sheet


def bow(sag, grip, tips, string='S', lit='W', mid='w', dark='d', reach=(2, 17, 17, 2)):
    """A bow between tips (x0, y0) and (x1, y1), its limb `sag` px off the string. The limb is
    two pixels thick (lit outside, wood inside, a dark edge where it turns away from the light);
    `grip` letters wrap its middle, `tips` its two ends."""
    g = G(20, 20)
    x0, y0, x1, y1 = reach
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    chord = math.hypot(x1 - x0, y1 - y0)
    R = (chord * chord / 4 + sag * sag) / (2 * sag)
    nx, ny = (x1 - x0) / chord, (y1 - y0) / chord
    # the centre lies on the string's far side (bottom-right), so the limb bulges top-left
    px, py = ny, -nx
    if px < 0:
        px, py = -px, -py
    cx, cy = mx + px * (R - sag), my + py * (R - sag)
    a0 = math.atan2(y0 - cy, x0 - cx)
    a1 = math.atan2(y1 - cy, x1 - cx)
    if a1 < a0:
        a1 += 2 * math.pi
    steps = 400
    for ring, ch in ((R + 0.45, lit), (R - 0.55, mid)):
        for i in range(steps + 1):
            a = a0 + (a1 - a0) * i / steps
            x, y = round(cx + ring * math.cos(a) - 0.5), round(cy + ring * math.sin(a) - 0.5)
            if 0 <= x < 20 and 0 <= y < 20 and (g.g[y][x] == '.' or ch == lit):
                g.g[y][x] = ch
    # where the limb faces away from the light (its lower-right reaches), shade the inside
    for y in range(20):
        for x in range(20):
            if g.g[y][x] == mid and x + y > 21:
                g.g[y][x] = dark
    # the grip: the limb's middle third of its two pixels
    apex_a = (a0 + a1) / 2
    for y in range(20):
        for x in range(20):
            if g.g[y][x] in (lit, mid, dark):
                a = math.atan2(y + 0.5 - cy, x + 0.5 - cx)
                if a < a0 - 0.3:
                    a += 2 * math.pi
                if abs(a - apex_a) < 0.17:
                    g.g[y][x] = grip[0] if g.g[y][x] == lit else grip[1]
    # the string: straight, tip to tip
    n = max(abs(x1 - x0), abs(y1 - y0))
    for i in range(1, n):
        x, y = round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)
        if g.g[y][x] == '.':
            g.g[y][x] = string
    for (x, y) in ((x0, y0), (x1, y1)):
        g.at(x, y, tips)
    return g


def worn_shortbow():
    """Short and weathered, greyed wood with a dark grip, bound with twine at two cracks."""
    g = bow(3.2, 'Gg', 'n', reach=(3, 16, 16, 3))
    # two small twine wraps, one on each limb, across both of the limb's pixels
    for x, y in ((4, 11), (5, 11), (11, 4), (11, 5)):
        if g.g[y][x] != '.':
            g.g[y][x] = 'T' if (x + y) % 2 else 't'
    pal = {'W': '#b8a07c', 'w': '#8a7254', 'd': '#5e4a34', 'G': '#5a4632', 'g': '#3a2c1e', 'T': '#e0d0a8', 't': '#a89870', 'S': '#d8d0bc', 'n': '#4a3a28'}
    return g, pal


def hunting_bow():
    """Ash with horn tips and a leather grip."""
    g = bow(3.8, 'Gg', 'H')
    pal = {'W': '#e0b070', 'w': '#b07a40', 'd': '#704a24', 'G': '#8a4630', 'g': '#5a2a1a', 'H': '#f2ead6', 'S': '#ece4d0'}
    # horn caps: the last two pixels of each limb
    for x, y in ((2, 16), (3, 17), (16, 2), (17, 3), (3, 16), (16, 3)):
        if g.g[y][x] in ('W', 'w', 'd'):
            g.g[y][x] = 'H' if g.g[y][x] == 'W' else 'h'
    pal['h'] = '#bcae90'
    return g, pal


def yew_longbow():
    """A tall yew bow: pale sapwood on the back, dark heartwood inside, gold-capped tips,
    a green leather grip."""
    g = bow(4.6, 'Gg', 'Y', reach=(1, 18, 18, 1))
    pal = {'W': '#f0c888', 'w': '#b8642e', 'd': '#7a3418', 'G': '#4e8a5a', 'g': '#2c5236', 'Y': '#ffe07a', 'S': '#f4ecd8', 'y': '#c89a3a'}
    for x, y in ((2, 17), (17, 2)):
        if g.g[y][x] != '.':
            g.g[y][x] = 'y'
    return g, pal


def quiver(body, band, feathers):
    """A slim tube quiver leaning a little to the right: a band at the mouth and one low
    down, a strap hugging its left side, and three arrows fanned out of the mouth, their
    fletching on top (white and accent feathers, the shafts between them)."""
    g = G(20, 20)
    # the tube, five pixels wide, one pixel further left every three rows down
    for y, x in ((7, 9), (8, 9), (9, 8), (10, 8), (11, 8), (12, 7), (13, 7), (14, 7), (15, 6), (16, 6)):
        g.at(x, y, 'LLMMd')
    g.at(9, 6, 'BBBBbb')     # the mouth's rim band
    g.at(7, 12, 'BBBbb')     # the low band
    g.at(6, 17, 'DDDDd')     # the foot
    g.at(7, 18, 'ddd')
    # the strap: from the rim, along the tube's left side, back in above the foot
    for x, y in ((8, 7), (7, 8), (7, 9), (6, 10), (6, 11), (5, 13), (5, 14), (5, 15)):
        g.at(x, y, 'k')
    # three arrows: fletching (a feather either side of the shaft), the shaft down into the mouth
    for (x, y, acc) in ((9, 1, 'R'), (11, 0, 'F'), (13, 2, 'R')):
        g.at(x - 1, y + 1, 'F' + 'w' + acc)
        g.at(x - 1, y + 2, 'f' + 'w' + 'f')
        g.at(x, y, 'F')
        for yy in range(y + 3, 6):
            g.at(x, yy, 'w')
    pal = {**body, **band, **feathers, 'w': '#9a7448', 'k': '#3a2416'}
    return g, pal


def leather_quiver():
    return quiver({'L': '#c89060', 'M': '#9a6a40', 'D': '#6a4426', 'd': '#4a2c18'},
                  {'B': '#e0b078', 'b': '#a87444'},
                  {'F': '#f4f0e6', 'f': '#c8c4b8', 'R': '#d85a48'})


def hunters_quiver():
    return quiver({'L': '#8a5a3a', 'M': '#6a4228', 'D': '#4a2c18', 'd': '#2e1a0e'},
                  {'B': '#e8eef6', 'b': '#8e9ab4'},
                  {'F': '#e6eaf0', 'f': '#9aa4b4', 'R': '#5c6684'})


ICONS = {
    'worn_shortbow': worn_shortbow(),
    'hunting_bow': hunting_bow(),
    'yew_longbow': yew_longbow(),
    'leather_quiver': leather_quiver(),
    'hunters_quiver': hunters_quiver(),
}

if __name__ == '__main__':
    imgs = [render(g.rows(), pal, k=0.3) for g, pal in ICONS.values()]
    sheet(imgs, scale=10).save('archery.png')
    for k, (g, _) in ICONS.items():
        print(k)
        print('\n'.join(r.ljust(20, '.') for r in g.rows()))
