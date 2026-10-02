import { fromRows, isoTile, hash } from './common';
import type { StyleKit } from './common';

/**
 * Soft pastel, after Hyper Light Drifter: flat shapes, no outlines, a pastel world with one
 * loud accent (magenta cloak, cyan light). Faces hidden in hoods; readability comes from
 * silhouette and colour, not detail. Drawn at 2×.
 */

const PAL = {
  m: '#e8578f', M: '#b0386c', h: '#2a1b3d', c: '#8af6ff', C: '#3ac2e0', d: '#3b2b52',
  w: '#fff4e6', l: '#e6d0ea', k: '#7a6a9a', p: '#ffb3c9', P: '#e07aa0', y: '#ffe38a',
  g: '#52d6c0', G: '#2ea694', W: '#ffffff',
};

const HERO_TOP = [
  '....mmmm.....',
  '...mmmmmm....',
  '..mmmmmmmm...',
  '..mmmhhhhm...',
  '..mmmhhhch...',
  '..mmmhhhhm...',
  '..mmmmhhm....',
  '.mmmmmmmmmm..',
  'mmmmmmmmmmy..',
  'mmmmmmmmMMcC.',
  'mmmmmmmmMMcC.',
  'mmmmmmmmMMcC.',
  '.mmmmmmmMMcC.',
  '.mmmmmmmMMcC.',
  '..mmmmmmMM.C.',
  '..MMMMMMMM...',
];
const HERO_LEGS = [
  ['...dd..dd....', '...dd..dd....', '..ddd..ddd...'],
  ['..dd....dd...', '..dd....dd...', '.ddd....ddd..'],
];

const COW_TOP = [
  '..............y..y..',
  '.wwwwwwwwwwww.wwwww.',
  'wwwkkkwwwwwwwwwwwhww',
  'wwwkkwwwwwkkwwwwwwpp',
  'wwwwwwwwwkkkwwwwwppp',
  'llllllllllllllll.pp.',
  '.llllllllllllll.....',
];
const COW_LEGS = [
  ['.ww.ll.....ww.ll....', '.ww.ll.....ww.ll....', '.dd.dd.....dd.dd....'],
  ['ww...ll...ww...ll...', 'ww...ll...ww...ll...', 'dd...dd...dd...dd...'],
];

const SKEL_TOP = [
  '...wwwww...',
  '..wwwwwww..',
  '..whmwwhm..',
  '..wwwwwww..',
  '...lwlwl...',
  '....www....',
  '..wwwwwww..',
  '.w.l.l.l.w.',
  '.w.wwwww.w.',
  '...l.l.l...',
  '....www....',
];
const SKEL_LEGS = [
  ['....w.w....', '....w.w....', '...ww.ww...'],
  ['...w...w...', '...w...w...', '..ww...ww..'],
];

export const PASTEL: StyleKit = {
  id: 'pastel',
  name: 'Soft pastel',
  blurb: 'Hyper Light Drifter vibe: flat shapes, no outlines, pastel world, one loud accent colour.',
  scale: 2,
  hero: () => HERO_LEGS.map(legs => fromRows([...HERO_TOP, ...legs], PAL)),
  cow: () => COW_LEGS.map(legs => fromRows([...COW_TOP, ...legs], PAL)),
  slime: () => fromRows(['....gggg....', '..gggWgggg..', '.ggWWggggggg', 'gggghgggghgg', 'gggggggggggg', 'GGGGGGGGGGGG', '.GGGGGGGGGG.'], PAL),
  skeleton: () => SKEL_LEGS.map(legs => fromRows([...SKEL_TOP, ...legs], PAL)),
  tree: () =>
    fromRows(
      [
        '.....ppppp......',
        '...ppWWppppp....',
        '..ppWWpppppppp..',
        '.ppppppppppppPp.',
        'pppppppppppPPPpp',
        'ppppppppppPPPPpp',
        'pppppppppPPPPPPp',
        '.ppppppPPPPPPPP.',
        '..PPPPPPPPPPPP..',
        '....PPPPPPPP....',
        '......dkd.......',
        '......dkd.......',
        '......dkd.......',
        '......dkd.......',
        '.....ddkdd......',
      ],
      PAL
    ),
  grass: () => isoTile(32, 16, (x, y) => (hash(x, y, 8) < 0.05 ? '#c4f2e2' : (x + y * 2) % 11 === 0 && hash(x, y, 9) < 0.5 ? '#94dcc2' : '#a8e8d0')),
  dirt: () => isoTile(32, 16, (x, y) => (hash(x, y, 10) < 0.15 ? '#e6c89e' : '#f0d6b0')),
};
