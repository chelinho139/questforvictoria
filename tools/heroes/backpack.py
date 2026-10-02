"""The inventory button icon: a leather backpack (20×20) with a flap, gold buckle, front pocket and carry loop."""
import sys
from tool import G, render, sheet

PAL = {'A': '#e2ae74', 'F': '#b8804a', 'I': '#8a5630', 'J': '#5c361a', 'K': '#a8683a', 'k': '#7a4826',
       'Y': '#ffe07a', 'Z': '#c8902c', 's': '#f0cc96', 'P': '#cc945c'}

def backpack():
    g = G(20, 20)
    # carry loop
    g.at(8, 0, 'kkkk'); g.at(7, 1, 'k'); g.at(12, 1, 'k'); g.at(7, 2, 'k'); g.at(12, 2, 'k')
    # body: a rounded leather box, lit from the top-left
    for y in range(4, 18):
        g.at(3, y, 'AF' + 'F' * 10 + 'II')
    g.at(4, 18, 'IIIIIIIIIIII')
    g.at(5, 19, 'JJJJJJJJJJ')
    # flap: darker leather with a lit top edge and a dark hem, closed by a tongue
    g.at(4, 3, 'AAAAAAAAAAKk')
    for y in range(4, 9):
        g.at(3, y, 'AKKKKKKKKKKkk')
    g.at(3, 9, 'JJJJJJJJJJJJJ')
    g.at(8, 10, 'kYZk'); g.at(8, 11, 'kZZk'); g.at(9, 12, 'kk')
    # front pocket: stitched, with its own small strap
    g.at(5, 13, 'IIIIIIIIII')
    for y in range(14, 17):
        g.at(5, y, 'IAPPPPPPPI')
    g.at(5, 14, 'IssssssssI')
    g.at(5, 17, 'IIIIIIIIII')
    g.at(9, 13, 'kk'); g.at(9, 14, 'YZ')
    return g

if __name__ == '__main__':
    import gear
    from tool import render as R
    ims = [R(backpack().rows(), PAL, k=0.3), R(gear.SACK[0].rows(), gear.SACK[1], k=0.3)]
    sheet(ims, scale=10).save(sys.argv[1] if len(sys.argv) > 1 else 'backpack.png')
    print('\n'.join(backpack().rows()))
