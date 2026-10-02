from tool import G, render, sheet

MEAT_PAL = {'M': '#f49088', 'm': '#d8504a', 'n': '#9a2a2a', 'f': '#fbe0cc', 'B': '#fffaf0', 'b': '#d8ccb0', 'c': '#b0a488'}
LOG_PAL = {'L': '#c08a58', 'd': '#8a5a30', 'D': '#5a3818', 'c': '#f0d49a', 'C': '#d0a868', 'r': '#a87848', 'x': '#7a4e28'}

MEAT_ICON = [
    '....................',
    '.........mmmm.......',
    '.......mMMMmmmn.....',
    '......mMMffMmmmn....',
    '.....mMMMMfMmmmnn...',
    '.....mMMfMMMmmmnn...',
    '....mMMMfMMmmmmnnn..',
    '....mMMMMMmmmfmnnn..',
    '....mMMMMmmmmmfnnn..',
    '....mmMMmmmmmmnnn...',
    '.....mmmmmmmnnnnn...',
    '.....bmmmmnnnnnn....',
    '....bBbnnnnnnnn.....',
    '...bBBb..nnnn.......',
    '..bBBb..............',
    '.bBBb...............',
    'bBBBbb..............',
    'BBbbBc..............',
    '.bb.bc..............',
    '....................',
]
LOG_ICON = [
    '....................',
    '..............cCCr..',
    '............ccCrrCr.',
    '..........LcCCrcCrCx',
    '........LLdcCrCrrCrx',
    '......LLddDcCrCrCCrx',
    '....LLddDDdcCrrrCrrx',
    '..LLdddDDddcCCrrCrx.',
    '.LdddDDdddDDcCCCrrx.',
    'LddDDdddDDddxcrrrx..',
    'LdDddDDddDdddxxxx...',
    'dDddddDddDDddD......',
    'DdDDddddDDddD.......',
    '.DDdDDdddDD.........',
    '..DDDDDDD...........',
    '....................',
]
MEAT_DROP = [
    '....mmmm....',
    '..mMMffmmn..',
    '.mMMMfMmmnn.',
    '.mMMMMmmnnn.',
    'bmmMmmmnnn..',
    'BBbmmnnnn...',
    'Bbb.........',
]
LOG_DROP = [
    '..........cCr.',
    '..LLLLLLLcCrCx',
    'LLddDDdddcrCrx',
    'dDddDDddDxcrx.',
    '.DDDDDDDDD....',
]

if __name__ == '__main__':
    sheet([render(MEAT_ICON, MEAT_PAL, k=0.3), render(LOG_ICON, LOG_PAL, k=0.3), render(MEAT_DROP, MEAT_PAL), render(LOG_DROP, LOG_PAL)], scale=8).save('items.png')
    print('ok')
