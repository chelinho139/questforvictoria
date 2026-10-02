import { litRows, isoTile, hash } from './common';
import type { StyleKit, Material } from './common';

/**
 * Rim-lit, a nod to Dead Cells: dark, moody bodies with no black outline; a strong
 * backlight catches the top/right edges in colour (cool on cloth, warm on metal), and
 * eyes and blades glow. Drawn at 2×.
 */

const HERO_MATS: Record<string, Material> = {
  H: ['#101820', '#1e3040', '#6fd6ff'],
  A: ['#241a12', '#4a3622', '#ffb050'],
  S: ['#340a0e', '#6e1820', '#ff6450'],
  P: ['#0e0e16', '#1e1e2a', '#6870a0'],
  B: ['#120c08', '#2a1c12', '#b07a44'],
  X: ['#5a7a98', '#a8c8e4', '#ffffff'],
  G: ['#4a3010', '#9a6c1c', '#ffd460'],
};
const HERO_FIXED = { F: '#05070a', E: '#ffc840' };
const HERO_TOP = [
  '.....HHHH......',
  '....HHHHHH.....',
  '...HHHHHHHH....',
  '...HHHHFFFH....',
  '..HHHHFFFEH....',
  '..HHHHFFFFH....',
  '..HHHHHFFH.....',
  '.SSSSSSSSS.....',
  '.HHSSSSSSAAA...',
  'HHHHAAAAAAAA...',
  'HHHHAAAAAAAG...',
  'HHHHAAAAAAGGG..',
  '.HHHAAAAAAAXX..',
  '.HHHPPPPPP.XX..',
  '..HHPPPPPP.XX..',
];
const HERO_LEGS = [
  ['..HHPP..PP.XX..', '...HPP..PP.XX..', '...HPP..PP.XX..', '....BB..BB..X..', '...BBB..BBB....'],
  ['..HPP....PP.X..', '..HPP....PP.X..', '..PP......PPX..', '.BB.......BB...', 'BBB.......BBB..'],
];

const COW_MATS: Record<string, Material> = {
  W: ['#5a5650', '#a8a298', '#fff4dc'],
  K: ['#0c0a0c', '#1c1a20', '#5a6478'],
  N: ['#5a2a30', '#b86a74', '#ffc0c0'],
  O: ['#6a6048', '#b0a47c', '#fff0c0'],
  Q: ['#140e0a', '#2a1c12', '#8a6040'],
};
const COW_TOP = [
  '..............O..O..',
  '.WWWWWWWWWWWW.WWWWW.',
  'WWWKKKWWWWWWWWWWWeWW',
  'WWWKKWWWWWKKWWWWWWNN',
  'WWWWWWWWWKKKWWWWWNNN',
  'WKWWWWWWWWWWWWWW.NN.',
  '.WWWWWWWWWWWWWW.....',
];
const COW_LEGS = [
  ['.WW.WW.....WW.WW....', '.WW.WW.....WW.WW....', '.QQ.QQ.....QQ.QQ....'],
  ['WW...WW...WW...WW...', 'WW...WW...WW...WW...', 'QQ...QQ...QQ...QQ...'],
];

const BONE: Record<string, Material> = { b: ['#4a4638', '#9a9480', '#fff8e0'] };
const SKEL_FIXED = { k: '#050505', r: '#ff4030' };
const SKEL_TOP = [
  '...bbbbb...',
  '..bbbbbbb..',
  '..bkrbbkr..',
  '..bbbbbbb..',
  '...bkbkb...',
  '....bbb....',
  '..bbbbbbb..',
  '.b.b.b.b.b.',
  '.b.bbbbb.b.',
  '...b.b.b...',
  '....bbb....',
];
const SKEL_LEGS = [
  ['....b.b....', '....b.b....', '...bb.bb...'],
  ['...b...b...', '...b...b...', '..bb...bb..'],
];

export const RIMLIT: StyleKit = {
  id: 'rimlit',
  name: 'Rim-lit',
  blurb: 'Dead Cells nod: dark moody bodies, no black outline, coloured backlight on the edges, glowing eyes and steel.',
  scale: 2,
  hero: () => HERO_LEGS.map(legs => litRows([...HERO_TOP, ...legs], HERO_MATS, HERO_FIXED)),
  cow: () => COW_LEGS.map(legs => litRows([...COW_TOP, ...legs], COW_MATS, { e: '#0a0a0a' })),
  slime: () =>
    litRows(
      ['....GGGG....', '..GGGGGGGG..', '.GGGGGGGGGG.', 'GGGGeGGGeGGG', 'GGGGGGGGGGGG', 'GGGGGGGGGGGG', '.GGGGGGGGGG.'],
      { G: ['#0e3a3a', '#1c7a78', '#7affe8'] },
      { e: '#ffe070' }
    ),
  skeleton: () => SKEL_LEGS.map(legs => litRows([...SKEL_TOP, ...legs], BONE, SKEL_FIXED)),
  tree: () =>
    litRows(
      [
        '.....LLLLL......',
        '...LLLLLLLLL....',
        '..LLLLLLLLLLL...',
        '.LLLLLLLLLLLLL..',
        'LLLLLLLLLLLLLLL.',
        'LLLLLLLLLLLLLLLL',
        'LLLLLLLLLLLLLLLL',
        '.LLLLLLLLLLLLLL.',
        '..LLLLLLLLLLLL..',
        '....LLLLLLLL....',
        '......TTT.......',
        '......TTT.......',
        '......TTT.......',
        '......TTT.......',
        '.....TTTTT......',
      ],
      { L: ['#0c2018', '#18382a', '#6adca0'], T: ['#140c08', '#2a1a10', '#a06a40'] },
      {}
    ),
  grass: () => isoTile(32, 16, (x, y) => (hash(x, y, 5) < 0.06 ? '#4a8a6a' : hash(x, y, 6) < 0.3 ? '#243a30' : '#1c2e26')),
  dirt: () => isoTile(32, 16, (x, y) => (hash(x, y, 7) < 0.25 ? '#2e241c' : '#3a2c22')),
};
