import { sprite } from './common';
import type { StyleKit, Stroke } from './common';

/**
 * Eight character-design directions. Colour is held constant (one shared palette) so the
 * comparison is about form: proportions, head-to-body ratio, stroke, size and construction.
 * Each direction has a hero (2 walk frames), a cow and a slime. All face right.
 */

const P: Record<string, string> = {
  k: '#15121c', // ink
  h: '#7a4a2a', H: '#a8683c', j: '#4e2c16', // hair
  s: '#f6c9a0', S: '#d99a74', z: '#ffe2c4', // skin
  e: '#1e1a28', w: '#ffffff', // eye
  b: '#3f6fd0', B: '#6a94e8', n: '#2a4a98', // tunic / trousers
  m: '#dfe5ee', M: '#a4aec0', N: '#6a7488', // steel
  r: '#d8443a', R: '#9a2828', // cape
  l: '#8a5a32', L: '#5e3a1e', // leather
  g: '#f2c14e', // gold
  c: '#f5f1e8', C: '#cfc7b6', x: '#2a2630', p: '#f2a2aa', q: '#c8707c', o: '#efe0b4', // cow
  t: '#56c8e8', T: '#bff0ff', u: '#2e86b8', // slime
  W: '#f4f4f0', // mask / gloves
};

function frames(top: string[], legs: string[][], stroke: Stroke): HTMLCanvasElement[] {
  return legs.map(l => sprite([...top, ...l], P, stroke));
}

// ---------------------------------------------------------------- shared creature shapes
export const COW_ROUND = [
  '........o..o',
  '.......ccccc',
  '.......cwecc',
  '.ccxxccceecc',
  'cccxxcccpppp',
  'ccccccccpqpp',
  'cxxccccccc..',
  'cxccccccC...',
  '.CCCCCCC....',
];
export const COW_ROUND_LEGS = [
  ['.c.c..c.c...', '.L.L..L.L...'],
  ['c.c...c.c...', 'L.L...L.L...'],
];

const COW_TALL = [
  '............o..o',
  '...........ccccc',
  '.cccccxxcccccecc',
  'ccxxccxxccccccpp',
  'ccxxcccccccccpqp',
  'cccccccccxxcc.pp',
  'ccccccccxxxc....',
  '.CCCCCCCCCCC....',
];
const COW_TALL_LEGS = [
  ['.c.c.....c.c....', '.c.c.....c.c....', '.c.c.....c.c....', '.L.L.....L.L....'],
  ['c...c...c...c...', 'c...c...c...c...', 'c...c...c...c...', 'L...L...L...L...'],
];

export const SLIME_BIG = ['...tttt...', '.tTTtttt..', 'tTTtttttt.', 'ttwettwett', 'tteetteett', 'tpttttttpt', 'tttttttttt', '.uuuuuuuu.'];
const SLIME_REAL = ['....tttt....', '..tTTttttt..', '.tTTtttttttt', 'tTtttttetett', 'tttttttttttt', 'uttttttttttu', '.uuuuuuuuuu.'];

// ---------------------------------------------------------------- 1. chibi
const CHIBI = [
  '...hhhhhh...',
  '..hHHHHHHh..',
  '.hHHHHHHHHh.',
  '.hhhHhhhhhhh',
  '.hhsssssssh.',
  '.hswesswes..',
  '.hseessees..',
  '.hpsssssps..',
  '..hsssSss...',
  '...rbbbbs...',
  '..rrbgbbgm..',
];

// ---------------------------------------------------------------- 2. heroic tall
const HEROIC = [
  '....jhhj....',
  '...jhHHHj...',
  '...hHHHHhj..',
  '...hhhssss..',
  '...jhhswes..',
  '....hhssSs..',
  '.....ssSs...',
  '......sS....',
  '....MmmmM...',
  '...rMmmmMb..',
  '..rrbBbbbb..',
  '..rrbBbbnb..',
  '..rrbBbbnb..',
  '..rrnBbbnb..',
  '..rrnbbbns..',
  '..rrlgllggg.',
  '..rr.nnbb.m.',
  '..rr.nnbb.m.',
  '..rr.nn.bbm.',
  '...r.nn.bbm.',
  '...r.nn.bbm.',
  '...r.nn.bbm.',
  '...R.nn.bb..',
  '.....nn.bb..',
];

// ---------------------------------------------------------------- 3. cartoon thick-line
const CARTOON = [
  '....hhhhh.......',
  '..hhHHHHHhh.....',
  '.hHHHhhhhhhh....',
  '.hhhhsssssshh...',
  '.hhssssswwwsh...',
  '.hsssssswkwss...',
  '.hsssssswkwss...',
  '..sssssssssS....',
  '..SssskkksSS.m..',
  '....SSSSSS...m..',
  '...rbbbbbbb..m..',
  '..rrbbbbbbbWWWW.',
  '..rrbbgbbbWWWWW.',
  '...rbbbbbbWWWW..',
];

// ---------------------------------------------------------------- 4. comic ink
const INKED = [
  '.....hhhh.....',
  '...hhhhhhhh...',
  '..hhhhhhhhhhh.',
  '..hhhhkkkkkkk.',
  '..hhhksssssss.',
  '..hhhksssskss.',
  '..hhhksssssss.',
  '...hhkssskkk..',
  '....kkssssk...',
  '.....kkkkk....',
  '...rkmmmmmk...',
  '..rrkmmkmmmk..',
  '..rrkbbkbbbks.',
  '..rrkbbkbbbks.',
  '..rrkbbkbbbks.',
  '..rrkkkkkkkkm.',
  '..rrklgllllkm.',
  '..rr.kbk.kbkm.',
  '...r.kbk.kbkm.',
  '...r.kbk.kbk..',
];

// ---------------------------------------------------------------- 5. SNES JRPG
const JRPG = [
  '......H.....H...',
  '.....HhH...Hh...',
  '..H..HhhhHHhhH..',
  '..hHHhhhhhhhhh..',
  '.jhhhhhhhhhhhhH.',
  '.jjhhhhhssssshj.',
  '..jjhhhssswes...',
  '...jhhhsssees...',
  '....jhhssSss....',
  '......sSSs......',
  '....rrMmmMr.....',
  '...rrMmmmmMrs...',
  '...rrbBBbbbnss..',
  '...rrbBBbbbnsg..',
  '...rrbBbbbbn.m..',
  '...rrnbbbbnn.m..',
  '...rrlgllll..m..',
  '....rnnn.nnn.m..',
  '....rnnn.nnn.m..',
  '....rnnn.nnn....',
  '.....nnn.nnn....',
];

// ---------------------------------------------------------------- 6. voxel blocky
const VOXEL = [
  '...HHHHHHHH.....',
  '..HHHHHHHHjj....',
  '..hhhhhhhhjj....',
  '..hsssssshjj..m.',
  '..sseesseeSS..mM',
  '..sssssssSSS..mM',
  '..ssseeesSSS..mM',
  '..ssssssssSS..mM',
  '....BBBBBB....mM',
  '..BBbbbbbbnn..mM',
  '..bbbbbbbbnn..mM',
  'ssbbbbbbbbnnSSgg',
  'ssbbbbbbbbnnSSgg',
  'ssbbbbbbbbnnSS..',
  'SSllllllllLLSS..',
  '..bbbbbbbbnn....',
];

// ---------------------------------------------------------------- 7. masked wanderer
const MASKED = [
  'W..........W....',
  'W..........W....',
  'WW........WW....',
  '.WW......WW.....',
  '..WW....WW......',
  '..WWWWWWWW......',
  '.WWWWWWWWWW.....',
  '.WWkkWWkkWW.....',
  '.WWkkWWkkWW..m..',
  '.WWkkWWkkWW..m..',
  '.WWWWWWWWWW..m..',
  '..WWWWWWMM...m..',
  '...MWWWWM....m..',
  '...nnnnnnn...m..',
  '..nnnnnnnnn..m..',
  '..nnnnnnnnnnnN..',
  '.nnnnnnnnnnn.N..',
  '.nnnnnnnnnnn....',
  '..bnnnnnnnb.....',
];

// ---------------------------------------------------------------- 8. floating limbs
const FLOAT = [
  '.......hh.........',
  '......hHhh........',
  '.....hhhhhhh......',
  '....hhhhhhhhh...m.',
  '....hhsssssss...m.',
  '....hsssswess...m.',
  '....hsssseessS..m.',
  '.....ssssssSS...m.',
  '......SSSSS.....m.',
  '................m.',
  '...............ggg',
  '.......rbbbbr.....',
  'WW....rbbbbbbr..WW',
  'WW....rbbgbbbr..WW',
  '.......bbbbbb.....',
  '........bbbb......',
  '..................',
  '..................',
];

export const CHARACTER_KITS: StyleKit[] = [
  {
    id: 'chibi',
    name: '1 · Chibi',
    blurb: 'Huge head, big shiny eyes, tiny body. Cute and readable at a glance. 1px black outline, drawn at 3×.',
    scale: 3,
    hero: () => frames(CHIBI, [['...nn.nn.m..', '...LL.LL.m..'], ['..nn..nn.m..', '..LL..LL.m..']], 'black'),
    cow: () => frames(COW_ROUND, COW_ROUND_LEGS, 'black'),
    slime: () => sprite(SLIME_BIG, P, 'black'),
  },
  {
    id: 'heroic',
    name: '2 · Heroic tall',
    blurb: 'Slender, long legs, small head, long cape and blade. Self-coloured outline (no black). Serious, adventurous.',
    scale: 2,
    hero: () =>
      frames(
        HEROIC,
        [
          ['.....nn.bb..', '.....nn.bb..', '....LLL.lll.', '....LLL.llll'],
          ['....nn...bb.', '....nn...bb.', '...LLL...lll', '...LLL...lll'],
        ],
        'selout'
      ),
    cow: () => frames(COW_TALL, COW_TALL_LEGS, 'selout'),
    slime: () => sprite(SLIME_REAL, P, 'selout'),
  },
  {
    id: 'cartoon',
    name: '3 · Cartoon thick-line',
    blurb: 'Bold 2px black outline, rounded chunky shapes, one big expressive eye, oversized gloves and boots.',
    scale: 2,
    hero: () =>
      frames(
        CARTOON,
        [
          ['....nnn.nnn.....', '...LLLL.LLLL....', '..LLLLL.LLLLL...'],
          ['...nnn...nnn....', '..LLLL...LLLL...', '.LLLLL...LLLLL..'],
        ],
        'thick'
      ),
    cow: () => frames(COW_ROUND, COW_ROUND_LEGS, 'thick'),
    slime: () => sprite(SLIME_BIG, P, 'thick'),
  },
  {
    id: 'ink',
    name: '4 · Comic ink',
    blurb: 'Black outline plus inner ink lines between parts, flat single-tone fills. Graphic-novel look.',
    scale: 2,
    hero: () =>
      frames(
        INKED,
        [
          ['.....kbk.kbk..', '....kllk.kllk.', '....kkkk.kkkk.'],
          ['....kbk...kbk.', '...kllk...kllk', '...kkkk...kkkk'],
        ],
        'black'
      ),
    cow: () => frames(COW_TALL, COW_TALL_LEGS, 'black'),
    slime: () => sprite(SLIME_REAL, P, 'black'),
  },
  {
    id: 'jrpg',
    name: '5 · SNES JRPG',
    blurb: 'Spiky anime hair, three-tone soft shading, self-coloured outline, about three heads tall.',
    scale: 2,
    hero: () =>
      frames(
        JRPG,
        [
          ['.....LLL.LLL....', '....LLLL.LLLL...'],
          ['....LLL...LLL...', '...LLLL...LLLL..'],
        ],
        'selout'
      ),
    cow: () => frames(COW_TALL, COW_TALL_LEGS, 'selout'),
    slime: () => sprite(SLIME_REAL, P, 'selout'),
  },
  {
    id: 'voxel',
    name: '6 · Voxel blocky',
    blurb: 'Built from boxes: lit top, front face, shaded side. Fakes 3D and sits naturally in the isometric world.',
    scale: 2,
    hero: () =>
      frames(
        VOXEL,
        [
          ['..bbbbn.bbbbn...', '..bbbbn.bbbbn...', '..llllL.llllL...', '..llllL.llllL...'],
          ['.bbbbn...bbbbn..', '.bbbbn...bbbbn..', '.llllL...llllL..', '.llllL...llllL..'],
        ],
        'none'
      ),
    cow: () =>
      frames(
        [
          '............o..o',
          '.wwwwwwwwww.wwww',
          '.cccxxcccccCcccc',
          '.ccxxxcccccCccec',
          '.cccccccxxcCcppp',
          '.ccccccxxxcCcppp',
          '.CCCCCCCCCCCCCCC',
          '.CCCCCCCCCC.....',
        ],
        [
          ['.cC.cC..cC.cC...', '.cC.cC..cC.cC...', '.LL.LL..LL.LL...'],
          ['cC..cC..cC..cC..', 'cC..cC..cC..cC..', 'LL..LL..LL..LL..'],
        ],
        'none'
      ),
    slime: () => sprite(['..TTTTTTTT..', '.TTTTTTTTuu.', '.tttttttuuu.', '.tetttettuu.', '.tttttttuuu.', '.tttttttuuu.', '.tttttttuu..'], P, 'none'),
  },
  {
    id: 'masked',
    name: '7 · Masked wanderer',
    blurb: 'Pure silhouette: a big white horned mask with hollow eyes over a tiny cloaked body. Iconic, mysterious.',
    scale: 2,
    hero: () =>
      frames(
        MASKED,
        [
          ['....k..k......', '....k..k......', '...kk..kk.....'],
          ['...k....k.....', '...k....k.....', '..kk....kk....'],
        ],
        'black'
      ),
    cow: () => frames(COW_TALL, COW_TALL_LEGS, 'black'),
    slime: () => sprite(['....tttt....', '..tTTttttt..', '.tTWWWWWtttt', 'tTtWkWkWtttt', 'tttWWWWWtttt', 'uttttttttttu', '.uuuuuuuuuu.'], P, 'black'),
  },
  {
    id: 'float',
    name: '8 · Floating limbs',
    blurb: 'Rayman-style: no arms or legs, just head, torso, gloves and shoes floating apart. Playful, very animatable.',
    scale: 2,
    hero: () =>
      frames(
        FLOAT,
        [
          ['.....LLL..LLL.....', '....LLLL..LLLL....'],
          ['....LLL....LLL....', '...LLLL....LLLL...'],
        ],
        'black'
      ),
    cow: () =>
      frames(COW_ROUND, [
        ['............', '............', '.L.L..L.L...'],
        ['............', '............', 'L.L...L.L...'],
      ], 'black'),
    slime: () => sprite(SLIME_BIG, P, 'black'),
  },
];
