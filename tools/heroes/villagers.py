"""The people of Millbrook, hand-placed at the HD scale beside Warden Aldric (npcart.py):
Nan Merrow, Maud Ashdown, Sergeant Pike, Father Odo, Tobin the peddler, Bram the smith,
and the grey postman (the Unsent). Each is one drawing (frame 0); the idle frames move the
head and body down a pixel (breathing) and sway hems, hair and tassels. Face right, 3/4
view, like the heroes; drawn in natural colours (the game recolours them for HD · Silhouette).

    python3 villagers.py out.png    # magnified review sheet of every frame
"""
from tool import G, render, sheet

SKIN = {'S': '#ffd8b4', 's': '#f2b88c', 'k': '#d08c64', 'E': '#2a2a3a'}


def grid(rows, w=22):
    g = G(w, len(rows))
    for y, r in enumerate(rows):
        g.at(0, y, r)
    return g


def idle(rows, split, sways=None, w=22):
    """Four idle frames from one drawing: rows above `split` sink a pixel in frames 2 and 3
    (breathing; the row at `split` is squeezed out), and `sways` {row: alt} swap in on 1 and 2."""
    frames = []
    for f in range(4):
        rr = list(rows)
        if sways and f in (1, 2):
            for y, alt in sways.items():
                rr[y] = alt
        if f in (2, 3):
            rr = ['.' * len(rr[0])] + rr[:split] + rr[split + 1:]
        frames.append(grid(rr, w))
    return frames


# ---------------------------------------------------------------- Nan Merrow
NAN_PAL = dict(SKIN, r='#f49a8c', h='#f6f4ee', H='#c8c8d2', m='#b88ccc', M='#8a62a8', n='#62447e',
               p='#6e4c7e', P='#523864', q='#38264a', a='#f6f2e8', A='#d4ccbc', d='#5a3418')
NAN = [
    '........hhh...........',
    '.......hHHHh..........',
    '......hhhhhhh.........',
    '.....hhHHHHHhh........',
    '....hhHSSSSSHhh.......',
    '....hHSSSSSSSHh.......',
    '....hSSESSSESSh.......',
    '....hSSSSSSkSSs.......',
    '....hSrSSSSSrSs.......',
    '.....SSSSkkSSs........',
    '......sSSSSSs.........',
    '....mmmMmmmmMmmm......',
    '...mmMmmmmmmmmMmmn....',
    '..mmMmmmmaammmmMmnn...',
    '..mMmmmaaaaaammmMnn...',
    '..pPmmaaaaaaaammPPq...',
    '..pPpSSaaaaaaSSpPPq...',
    '..pPpSSaaaaaaSSpPPq...',
    '..pPppaaaaaaaapPPPq...',
    '..pPppaaaaaaaapPPPq...',
    '..pPppaAaaaaAapPPPq...',
    '.ppPppaaaaaaaapPPPqq..',
    '.ppPppaaaaaaaapPPPqq..',
    '.ppPppaAaaaaAapPPPqq..',
    '.ppPppaaaaaaaapPPPqq..',
    '.ppPpppaaaaaapPPPPqq..',
    'ppPPpppppppppppPPPqq..',
    'ppPPpppppppppppPPPqq..',
    'pPPpppppppppppppPPqq..',
    '.P.PP.PPP.PP.PP.PP....',
    '......ddd..ddd........',
    '......ddd..ddd........',
]
NAN_SWAY = {29: 'P.PP.PPP.PP.PP.PP.P...'}

# ---------------------------------------------------------------- Maud Ashdown
MAUD_PAL = dict(SKIN, r='#c86a4a', R='#9a4a32', h='#8a7a6a', c='#a8805a', C='#8a6440', D='#5e4228',
                a='#f2eee4', A='#d2cab8', f='#ffffff', d='#4a2c14')
MAUD = [
    '.......rrrrr..........',
    '......rRRRRRr.........',
    '.....rRRrrrRRr........',
    '.....rRhSSSShRr.......',
    '.....rhSSSSSShr.......',
    '......SSESSSES........',
    '......SSSSSSkS........',
    '......SSSSSSSs........',
    '.......SSkkSs.........',
    '........sSSs..........',
    '.......cCCCCc.........',
    '.....cCCCCCCCCD.......',
    '....cCCCCCCCCCCD......',
    '....cCCCCCCCCCCD......',
    '....SScCCCCCCcSS......',
    '....SScaaaaaacSS......',
    '....SS.afaaaaa.SS.....',
    '....SS.aaaafaa.SS.....',
    '.......aaaaaaa........',
    '......caaaaaaaD.......',
    '......caAaafaaD.......',
    '......caaaaaaaD.......',
    '.....ccaaaaaaaDD......',
    '.....ccaaafaaaDD......',
    '.....cCaaaaaaaCD......',
    '.....cCCaaaaaCCD......',
    '....cCCCCCCCCCCDD.....',
    '....cCCCCCCCCCCDD.....',
    '....cCCCCCCCCCCCD.....',
    '....C.CC.CCC.CC.C.....',
    '.......ddd..ddd.......',
    '.......ddd..ddd.......',
]
MAUD_SWAY = {29: '.....C.CC.CCC.CC.C....', 0: '........rrrr..........'}

# ---------------------------------------------------------------- Sergeant Pike
PIKE_PAL = dict(SKIN, i='#d8e0ec', I='#a4aec0', j='#6e7890', u='#8a6a4a', U='#5e4428',
                t='#4a7ab0', T='#355c8a', w='#e8ecf2', W='#b8c0cc', o='#7e8aa0', O='#5a6478',
                b='#5a3418', B='#3a2010', g='#ffe07a', d='#3a2010', x='#c8d2e0', m='#6a4a2a')
PIKE = [
    '...................x..',
    '..................xix.',
    '..................xix.',
    '...................i..',
    '.......iiiii.......u..',
    '.....iiIIIIIii.....u..',
    '....jjjjjjjjjjj....u..',
    '......SSSSSSS......u..',
    '......SESSSES......u..',
    '......SSSSSkS......u..',
    '......SmmmmmS......u..',
    '.......SSSSs.......u..',
    '.....ooTtttTo......u..',
    '....oOOTtwtTOo.....u..',
    '....oOtTtwwtTOo..SSu..',
    '....oOtTwwwwtTO..SSu..',
    '....OOtTtwwtTTO.OOOu..',
    '....OOtTttwtTTOOO..u..',
    '....SSbBBBgBBBb....u..',
    '....SS.tTtTtTT.....u..',
    '.......tTtTtTT.....u..',
    '.......tTtTtTT.....u..',
    '.......tTtTtTT.....u..',
    '.......tTt.tTT.....u..',
    '.......UUU.UUU.....u..',
    '.......UUU.UUU.....u..',
    '.......UUU.UUU.....u..',
    '.......UUU.UUU.....U..',
    '......dddd.dddd....U..',
    '......dddd.dddd.......',
]
PIKE_SWAY = {}

# ---------------------------------------------------------------- Father Odo
ODO_PAL = dict(SKIN, h='#7a5a3a', H='#5a3e24', r='#8a6a4a', R='#6e5236', Q='#4e3822', y='#e8d8a8',
               g='#ffe07a', G='#d8a03a', d='#3a2414', c='#f4ecd0', f='#ffcf60')
ODO = [
    '.......SSSSS..........',
    '......SSSSSSS.........',
    '.....hSSSSSSSh........',
    '.....hHSSSSSHh........',
    '.....hSSESSESh........',
    '.....hSSSSSkSs........',
    '......SSSSSSSs........',
    '......sSSkkSs.........',
    '.......sSSSs..........',
    '......rRRRRRr.........',
    '.....rRRRgRRRR........',
    '....rRrRgGgRRRQ.......',
    '....rRrRRgRRRRQ.......',
    '....rRrRRRRRRRQ.......',
    '....rRrRRRRRRSSQ..f...',
    '....rRryyyyyRSSQ..c...',
    '....rSSRRyRRRRRQ..c...',
    '....rSSRRyRRRRRQ..c...',
    '....rRRRRRRRRRRQ.SS...',
    '.....rRRRRRRRRQ.......',
    '.....rRRRRRRRRQ.......',
    '.....rRRRRRRRRQ.......',
    '.....rRRRRRRRRQQ......',
    '....rrRRRRRRRRRQ......',
    '....rRRRRRRRRRRQ......',
    '....rRRRRRRRRRRQQ.....',
    '...rrRRRRRRRRRRRQ.....',
    '...rRRRRRRRRRRRRQ.....',
    '...R.RR.RRR.RR.RQ.....',
    '.......dd...dd........',
    '.......dd...dd........',
]
ODO_SWAY = {28: '....R.RR.RRR.RR.R.....'}

# ---------------------------------------------------------------- Tobin the peddler
TOBIN_PAL = dict(SKIN, h='#7a4a2a', y='#c8a050', Y='#9a7430', Z='#6e5020', f='#e04a3a', F='#f0f0e0',
                 c='#4a8a4a', C='#356a35', D='#244a24', e='#c84a3a', E2='#8a2e22', b='#8a5a30', B='#5c3a1c',
                 p='#a87a4a', P='#7a5430', n='#c8ccd6', N='#8a90a0', d='#3a2010', l='#6a4a8a')
TOBIN_PAL['e'] = '#c84a3a'
TOBIN = [
    '........F.............',
    '.......fF.............',
    '......yyyyyy..........',
    '....yyYYYYYYyy........',
    '...YYYYYYYYYYYZ.......',
    '......hSSSSSh.........',
    '......SSESSES...pp....',
    '......SSSSSkS..pPPp...',
    '......SSkkkSs..pPPp...',
    '.......sSSSs...pPPpn..',
    '......cCeCCCD..pPPpN..',
    '.....cCCeCCCCDpPPPPn..',
    '....cCCCeCCcCDpPPPPp..',
    '....cCCeeCCcCDpPPPPp..',
    '....SSCCCCcCCCDpPPPp..',
    '....SSbBbBbBbBDpPPPp..',
    '.....cCClCCCCDDpppp...',
    '.....cCClCCCCDD.......',
    '.....cCCCCCCCDD.......',
    '......CCC.CCCD........',
    '......bbb.bbb.........',
    '......bbb.bbb.........',
    '......bbb.bbb.........',
    '.....dddd.dddd........',
    '.....dddd.dddd........',
]
TOBIN_SWAY = {0: '.......F..............', 1: '.......fF.............'}

# ---------------------------------------------------------------- Bram the smith
BRAM_PAL = dict(SKIN, h='#2a2226', H='#4a3e3a', l='#8a5a30', L='#6a4220', M='#4a2c14', t='#c8b496', T='#a8946e',
                i='#c4ccd8', I='#7e8898', w='#8a6a4a', d='#2a1a0e', b='#5a3a1c')
BRAM = [
    '.......SSSSS..........',
    '......SSSSSSS.........',
    '......SSSSSSSs........',
    '......SSESSESs........',
    '......SSSSSSkS........',
    '......hHSSSSHh........',
    '......hhhhhhhh........',
    '......hhhHhhhh........',
    '.......hhhhhh.........',
    '....SStttttttSS.......',
    '...SSStTttttTSSS......',
    '..SSSSlLlllllLSSS.....',
    '..SSSSlLlllllLSSSS....',
    '..sSS.lLlllllL.SSS....',
    '..sSS.lLlllllL.SSS....',
    '..sSS.lLllbllL.SSi....',
    '..SS..lLlllllL.SSii...',
    '......lLlllllL..wii...',
    '......lLlllllL..w.....',
    '......lLlllllL..w.....',
    '......lLlllllLM.......',
    '......TTTT.TTTT.......',
    '......TTTT.TTTT.......',
    '......TTTT.TTTT.......',
    '......TTTT.TTTT.......',
    '.....ddddd.ddddd......',
    '.....ddddd.ddddd......',
]
BRAM_SWAY = {}

# ---------------------------------------------------------------- the grey postman (the Unsent)
POST_PAL = {'g': '#b8bcc4', 'G': '#8e939c', 'H': '#6a6e78', 'K': '#3a3d46', 'k': '#2a2c34', 'E': '#e8eef8',
            's': '#c8b48a', 'S': '#9a8460', 'T': '#6e5c40', 'w': '#ece6d4', 'W': '#c8c0aa'}
POST = [
    '......KKKKKK..........',
    '.....KHHHHHHK.........',
    '....KHHHHHHHHK........',
    '...kkkkkkkkkkkk.......',
    '.....KkkkkkkK.........',
    '.....KkEkkEkK.........',
    '.....KkkkkkkK.........',
    '......KkkkkK..........',
    '.....gGGGGGGH.........',
    '....gGGGGGGGGH...ss...',
    '...gGGGgGGGGGHHsSSs...',
    '...gGGGgGGGGGHsSSSSs..',
    '...gGGGgGGGGGHsSwSSs..',
    '...gGGGgGGGGGHsSSWSS..',
    '...gGG.gGGGGGHsSwSST..',
    '...gG..gGGGGGHHsSSST..',
    '...gG..gGGGGGGHsSST...',
    '...HH..gGGGGGGH.TT....',
    '.......gGGGGGGH.......',
    '.......gGGGGGGH.......',
    '......gGGGGGGGHH......',
    '......gGGGGGGGHH......',
    '......gGGGGGGGGH......',
    '.....gGGGGGGGGGHH.....',
    '.....gGGGGGGGGGHH.....',
    '.....gGGGGGGGGGGH.....',
    '....gGGGGGGGGGGGHH....',
    '....gGGGGGGGGGGGHH....',
    '....g.GG.GGG.GG.H.....',
    '......................',
    '......................',
]
POST_SWAY = {28: '.....g.GG.GGG.GG.H....'}

VILLAGERS = {
    'nan': (NAN, NAN_PAL, 11, NAN_SWAY),
    'maud': (MAUD, MAUD_PAL, 10, MAUD_SWAY),
    'pike': (PIKE, PIKE_PAL, 18, PIKE_SWAY),
    'odo': (ODO, ODO_PAL, 9, ODO_SWAY),
    'tobin': (TOBIN, TOBIN_PAL, 10, TOBIN_SWAY),
    'bram': (BRAM, BRAM_PAL, 9, BRAM_SWAY),
    'postman': (POST, POST_PAL, 8, POST_SWAY),
}


def frames(name):
    rows, pal, split, sw = VILLAGERS[name]
    w = max(len(r) for r in rows)
    rows = [r.ljust(w, '.') for r in rows]
    sw = {k: v.ljust(w, '.') for k, v in sw.items()}
    return idle(rows, split, sw, w)


if __name__ == '__main__':
    import sys
    import npcart
    ims = [render(npcart.aldric(0).rows(), npcart.PAL, 0.22)]
    for n in VILLAGERS:
        pal = VILLAGERS[n][1]
        for f in (0, 2):
            ims.append(render(frames(n)[f].rows(), pal, 0.22))
    sheet(ims, scale=6).save(sys.argv[1])
    print('ok')
