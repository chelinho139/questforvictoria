import { sprite, isoTile, hash } from './common';
import type { StyleKit } from './common';

/**
 * Eight variations on the abstract pixel direction. Shared rules: no outlines, big flat
 * pixels at 4×, tall faceless figures, props reduced to shapes. Each variation changes the
 * hero archetype, the palette and the mood, and reinterprets the critters for its world.
 */

type Rows = string[];
const S = 4;

function kit(
  id: string,
  name: string,
  blurb: string,
  pal: Record<string, string>,
  parts: {
    hero: Rows;
    heroLegs: [Rows, Rows];
    cow: Rows;
    cowLegs: [Rows, Rows];
    slime: Rows;
    tree: Rows;
    grass: (x: number, y: number) => string;
    dirt: (x: number, y: number) => string;
    bg: string;
    overlay?: 'ember' | 'snow' | 'spores';
  }
): StyleKit {
  return {
    id,
    name,
    blurb,
    scale: S,
    hero: () => parts.heroLegs.map(l => sprite([...parts.hero, ...l], pal, 'none')),
    cow: () => parts.cowLegs.map(l => sprite([...parts.cow, ...l], pal, 'none')),
    slime: () => sprite(parts.slime, pal, 'none'),
    tree: () => sprite(parts.tree, pal, 'none'),
    grass: () => isoTile(16, 8, parts.grass),
    dirt: () => isoTile(16, 8, parts.dirt),
    bg: parts.bg,
    overlay: parts.overlay,
  };
}

const COW_LEGS_STD: [Rows, Rows] = [
  ['.l.l....l.l..', '.l.l....l.l..'],
  ['l...l..l...l.', 'l...l..l...l.'],
];

// ---------------------------------------------------------------- 1. Ember Abyss
const EMBER = kit(
  'ember',
  '1 · Ember Abyss (your reference)',
  'Dark navy-purple world, stone lit warm from below, lava glow. A cloaked wanderer with a pale glowing head; red-eyed grave beasts, lava slimes, dead spires.',
  {
    W: '#eef4ff', w: '#a8bce0', k: '#170c18', c: '#34182a', C: '#5e2c34', m: '#ffc080', M: '#ff7a3a', l: '#120814',
    r: '#ff3a2a', d: '#3a2c3a', D: '#6a4a4a', o: '#c8b8a8', y: '#ffb84a', Y: '#ff6a2a', e: '#170c18',
  },
  {
    hero: ['....WW.....', '....Ww.....', '...kCCk....', '..kcCCck...', '..ccCCcc...', '.kccCCccm..', '.kcCCCccm..', '.kcCCCcc.m.', '.kcCCCcc.m.', '..cCCccc..M', '..kccckk...'],
    heroLegs: [
      ['...l..l....', '...l..l....'],
      ['..l....l...', '..l....l...'],
    ],
    cow: ['..........o.o', '.DDDDDDDD.DDD', 'dDDDDDDDDdDDr', 'ddddddddddddd', 'dddddddddddd.', '.dddddddddd..'],
    cowLegs: COW_LEGS_STD,
    slime: ['..yyyy..', '.yYyyyy.', 'yyeyyeyy', 'yyyyyyyy', '.YYYYYY.'],
    tree: ['...M...', '...k...', '..kkM..', '...k.k.', '.k.kk..', '..kk...', '...k.kM', '...kk..', 'M.kk...', '.kkk...', '..kk...', '..kk...', '..kkk..', '.kkkkk.'],
    grass: (x, y) => ((x + 2 * y) % 8 === 0 ? '#221a32' : hash(x, y, 31) < 0.1 ? '#3c3050' : '#2c2440'),
    dirt: (x, y) => ((x + 2 * y) % 8 === 0 ? '#4a3c4c' : hash(x, y, 32) < 0.12 ? '#7a6068' : '#5a4a5a'),
    bg: '#0e0716',
    overlay: 'ember',
  }
);

// ---------------------------------------------------------------- 2. Dusk Knight (the original)
const DUSK = kit(
  'dusk',
  '2 · Dusk Knight',
  'The one you picked: slate knight with slab shield and raised blade, muted greens, cypress silhouettes.',
  {
    h: '#2a2030', s: '#e8c8a8', b: '#4a5a78', B: '#6a7a98', M: '#9aa0aa', m: '#eef2f6', g: '#d8b05a', r: '#c84a3a', l: '#2a2030',
    c: '#ece6da', x: '#3a3440', o: '#d8cfb8', p: '#e0a0a0', e: '#2a2030', t: '#6ac0d8', u: '#4a98b8', G: '#5a8a64', F: '#3e6a4a', K: '#4a3a30',
  },
  {
    hero: ['....hh..m', '....hs..m', '....ss..m', '...bbbb.m', '..MbbbbBm', '..MbbbBsg', '..MbbbB..', '..rbbbb..', '..rbbbb..', '...bbbb..'],
    heroLegs: [
      ['....b.b..', '....b.b..', '...ll.ll.'],
      ['...b...b.', '...b...b.', '..ll...ll'],
    ],
    cow: ['..........o.o', '.ccccxxcc.ccc', 'cccccxxccccce', 'cxxccccccccpp', 'cxxcccccccc..', '.cccccccccc..'],
    cowLegs: [
      ['.c.c....c.c..', '.c.c....c.c..'],
      ['c...c..c...c.', 'c...c..c...c.'],
    ],
    slime: ['..tttt..', '.tttttt.', 'ttettett', 'tttttttt', '.uuuuuu.'],
    tree: ['...G...', '..GGF..', '..GGF..', '.GGGFF.', '.GGGFF.', '.GGGFF.', 'GGGGFFF', 'GGGGFFF', 'GGGGFFF', 'GGGGFFF', '.GGGFF.', '.GGGFF.', '..GGF..', '...K...', '...K...'],
    grass: (x, y) => (hash(x, y, 25) < 0.12 ? '#5e8c50' : '#6a9a5a'),
    dirt: (x, y) => (hash(x, y, 26) < 0.15 ? '#a89070' : '#b8a07a'),
    bg: '#0c1018',
  }
);

// ---------------------------------------------------------------- 3. Frost Hunter
const FROST = kit(
  'frost',
  '3 · Frost Hunter',
  'Snowfield in cold blues. A fur-hooded hunter with red scarf and long spear; shaggy yaks, ice slimes, snow-capped pines, falling snow.',
  {
    f: '#f2f4f6', F: '#c8d0da', k: '#1c1e2a', b: '#3a3c50', B: '#50546c', r: '#d23a3a', l: '#7a5a40', m: '#e8f0f8', L: '#2a2a36',
    y: '#6a4a36', Y: '#8a6448', i: '#bfeaf8', I: '#8ccde8', w: '#ffffff', g: '#2a4a44', G: '#3a5e54',
  },
  {
    hero: ['.......m.', '...ff..m.', '..fkkf.l.', '..fkkF.l.', '..rrrr.l.', '.bBBbbbf.', '.bBBbbbl.', '.bBBbbbl.', '.bBbbbbl.', '.fffffff.'],
    heroLegs: [
      ['..L..L.l.', '..L..L.l.'],
      ['.L....Ll.', '.L....Ll.'],
    ],
    cow: ['..........f.f', '...YYYYYY.YY.', '.YYYyyyyyYYYk', 'YyyyyyyyyyyyY', 'yyyyyyyyyyyy.', 'yyyyyyyyyyy..', '.y.y.y.y.y...'],
    cowLegs: [
      ['.k.k....k.k..', '.k.k....k.k..'],
      ['k...k..k...k.', 'k...k..k...k.'],
    ],
    slime: ['..iiii..', '.iwiiiI.', 'iikiikII', 'iiiiiiII', '.IIIIII.'],
    tree: ['....f....', '...fGf...', '...gGg...', '..ffGff..', '..ggGgg..', '.gggGggg.', '.fffGfff.', '.ggGGGgg.', 'gggGGGggg', 'ffffGffff', 'gggGGGggg', '....k....', '....k....'],
    grass: (x, y) => (hash(x, y, 41) < 0.06 ? '#ffffff' : hash(x >> 1, y, 42) < 0.3 ? '#d2dee8' : '#e6eef4'),
    dirt: (x, y) => (hash(x, y, 43) < 0.2 ? '#a4b8cc' : '#b6c8d8'),
    bg: '#1a2230',
    overlay: 'snow',
  }
);

// ---------------------------------------------------------------- 4. Desert Pilgrim
const DESERT = kit(
  'desert',
  '4 · Desert Pilgrim',
  'Warm dunes at dusk. A tall red-hooded pilgrim with a gold scarf trailing behind; camels, sand slimes, cacti.',
  {
    r: '#a8322a', R: '#d0503a', g: '#f0c050', k: '#2a1a18', l: '#3a2420',
    c: '#d8a868', C: '#b88848', s: '#e0b070', S: '#c08a50', G: '#5a8a4a', H: '#4a7a3e',
  },
  {
    hero: ['......r....', '.....rR....', '.....rRr...', '.....kkR...', 'ggg.rrRRr..', '.ggrrrRRr..', '...rrrRRrr.', '...rrgRRrr.', '..rrrgRRrrr', '..rrrrRRrrr', '..ggggggggg'],
    heroLegs: [
      ['....l..l...', '....l..l...'],
      ['...l....l..', '...l....l..'],
    ],
    cow: ['...........cc.', '....cc....ccck', '...cccc...cc..', '.ccccccccccc..', 'Cccccccccccc..', '.CCCCCCCCCC...'],
    cowLegs: [
      ['.l.l.....l.l..', '.l.l.....l.l..', '.l.l.....l.l..'],
      ['l...l...l...l.', 'l...l...l...l.', 'l...l...l...l.'],
    ],
    slime: ['..ssss..', '.ssssSs.', 'sskssksS', 'ssssssSS', '.SSSSSS.'],
    tree: ['...G...', '..GHG..', '..GHG..', 'G.GHG..', 'G.GHG.G', 'GGGHG.G', '..GHGGG', '..GHG..', '..GHG..', '..GHG..', '..GHG..', '.GGHGG.'],
    grass: (x, y) => ((x + y * 2 + 16) % 6 === 0 ? '#d8aa74' : '#e8c08a'),
    dirt: (x, y) => (hash(x, y, 51) < 0.2 ? '#b8864e' : '#c8965e'),
    bg: '#b8583a',
  }
);

// ---------------------------------------------------------------- 5. Ink Samurai
const INK = kit(
  'ink',
  '5 · Ink Samurai',
  '1-bit paper and ink with a single red accent. A straw-hatted samurai with katana; ink cows, black slimes with white eyes, bamboo.',
  { k: '#141414', w: '#cfcabd', g: '#8a867c', r: '#c8281e', l: '#141414' },
  {
    hero: ['..kkkkkkk..', '....kkk....', '....kkk....', '...rrrrr...', '..kkkkkkk.g', '.kkkkkkk.g.', '.kkkkkkkg..', '..kkkkkr...', '..kkkkkk...', '..kk..kk...'],
    heroLegs: [
      ['..kk..kk...', '..k....k...'],
      ['.kk....kk..', '.k......k..'],
    ],
    cow: ['..........k.k', '.wwwwkkww.www', 'wwwwwkkwwwwwk', 'wkkwwwwwwwwgg', 'wkkwwwwwwww..', '.wwwwwwwwww..'],
    cowLegs: [
      ['.k.k....k.k..', '.k.k....k.k..'],
      ['k...k..k...k.', 'k...k..k...k.'],
    ],
    slime: ['..kkkk..', '.kkkkkk.', 'kkwkkwkk', 'kkkkkkkk', '.kkkkkk.'],
    tree: ['.k....kk.', 'kk..k..k.', '.k.kk..k.', '.k..k.kk.', '.k..k..k.', 'kk..k..k.', '.k..kk.kk', '.k..k..k.', '.kk.k..k.', '.k..k..k.', '.k..k..k.', '.k..k..k.'],
    grass: (x, y) => ((x + y) % 4 === 0 && hash(x, y, 61) < 0.5 ? '#c8c4b8' : '#f2efe6'),
    dirt: (x, y) => ((x + y) % 2 === 0 ? '#c8c4b8' : '#e2ded2'),
    bg: '#f2efe6',
  }
);

// ---------------------------------------------------------------- 6. Neon Night
const NEON = kit(
  'neon',
  '6 · Neon Night',
  'Dark city grid with neon edges. A cyber knight with glowing visor and magenta energy blade; robo-cows, neon slimes, crystal spires.',
  {
    k: '#141224', a: '#2c2a48', A: '#44407a', c: '#4af0ff', C: '#1a9ab0', p: '#ff3ad8', P: '#ff9af0', l: '#141224',
    m: '#5a5a78', M: '#7a7a9a', g: '#4aff8a', G: '#1ec864',
  },
  {
    hero: ['....aa....', '...aAAa...', '...ccca...', '...aAAa...', '..aaAAaa.P', '.aaaAAaa.p', '.aaaAAaacp', '.aaaAAaa.p', '..aaAAaa.p', '..aaaaaa..', '..ac..ca..'],
    heroLegs: [
      ['...a..a...', '..aa..aa..'],
      ['..a....a..', '.aa....aa.'],
    ],
    cow: ['..........c.c', '.MMMMppMM.MMM', 'mmmmmppmmmmmc', 'mppmmmmmmmmmm', 'mppmmmmmmmm..', '.mmmmmmmmmm..'],
    cowLegs: [
      ['.k.k....k.k..', '.k.k....k.k..'],
      ['k...k..k...k.', 'k...k..k...k.'],
    ],
    slime: ['..gggg..', '.gggggg.', 'ggkggkgg', 'gggggggg', '.GGGGGG.'],
    tree: ['...c...', '..cC...', '..cC...', '.ccCC..', '.ccCC.c', '.ccCC.C', 'ccCCC.C', 'ccCCCcC', '.cCCC..', '.cCCC..', '..CC...', '..kk...'],
    grass: (x, y) => (Math.abs(x + 0.5 - 8) / 8 + Math.abs(y + 0.5 - 4) / 4 > 0.78 ? '#6a2a9a' : hash(x, y, 71) < 0.08 ? '#241c48' : '#161230'),
    dirt: (x, y) => (Math.abs(x + 0.5 - 8) / 8 + Math.abs(y + 0.5 - 4) / 4 > 0.78 ? '#2a8aa0' : '#221a44'),
    bg: '#07050f',
  }
);

// ---------------------------------------------------------------- 7. Pastel Dream
const PASTEL_DREAM = kit(
  'dream',
  '7 · Pastel Dream',
  'Lilac and peach storybook. A tiny wizard under a huge floppy hat with a star wand; pastel cows, mint slimes, blossom clouds.',
  {
    h: '#5a4a9a', H: '#7a6ac0', k: '#3a2a5a', v: '#9a8ad0', V: '#b8aae4', g: '#f0c860', w: '#fff6c0', l: '#4a3a6a',
    c: '#fff6ea', p: '#e8b8d8', n: '#f6b0c8', e: '#6a5a8a', L: '#c8b8d8', m: '#9ae8d0', M: '#6ccab4', P: '#f6b4d0', Q: '#e894bc', T: '#9a7aa8',
  },
  {
    hero: ['......h....', '.....hH....', '....hhHh...', '...hhhHHh..', '..hhhhHHHh.', 'hhhhhhhhhhh', '....kkk....', '...vVVvv.w.', '..vvVVvvvg.', '..vvVVvv.g.', '..vvVVvv.g.', '..vvvvvv...'],
    heroLegs: [
      ['...l..l....', '...l..l....'],
      ['..l....l...', '..l....l...'],
    ],
    cow: ['..........L.L', '.ccccppcc.ccc', 'cccccppccccce', 'cppccccccccnn', 'cppcccccccc..', '.cccccccccc..'],
    cowLegs: [
      ['.L.L....L.L..', '.L.L....L.L..'],
      ['L...L..L...L.', 'L...L..L...L.'],
    ],
    slime: ['..mmmm..', '.mmmmmm.', 'mmemmemm', 'mmmmmmmm', '.MMMMMM.'],
    tree: ['...PPPPP...', '.PPPPPPPPP.', 'PPPPPPPPPQQ', 'PPPPPPPPQQQ', '.PPPPPQQQQ.', '..QQQQQQQ..', '.....T.....', '.....T.....', '.....T.....', '....TTT....'],
    grass: (x, y) => (hash(x, y, 81) < 0.12 ? '#dac6e2' : '#e6d4ec'),
    dirt: (x, y) => (hash(x, y, 82) < 0.12 ? '#ecd0bc' : '#f4dcc8'),
    bg: '#f3dcea',
  }
);

// ---------------------------------------------------------------- 8. Moss Spirit
const MOSS = kit(
  'moss',
  '8 · Moss Spirit',
  'Deep forest at night with drifting spores. An antlered bark spirit with a white mask and glowing orb staff; mossy beasts, firefly slimes, dark willows.',
  {
    a: '#c8b08a', W: '#ece4d0', k: '#141a14', b: '#2e3a2a', B: '#3e4e38', g: '#b8ff6a', G: '#6adc4a', l: '#1a221a', w: '#6a5038',
    d: '#5a5040', D: '#4a7a3a', f: '#8adc4a', F: '#5aaa3a', t: '#2a2418', v: '#1e3a26', V: '#2a4e30',
  },
  {
    hero: ['.a.....a...', '.aa...aa...', '..aa.aa.g..', '...aaa..G..', '...WWW..w..', '...kWk..w..', '..bBBbb.w..', '.bbBBbbbw..', '.bbBBbbbw..', '.bbBBbbbw..', '..bBBbb.w..', '..bbbbb....'],
    heroLegs: [
      ['...l..l....', '...l..l....'],
      ['..l....l...', '..l....l...'],
    ],
    cow: ['..........a.a', '.dddDDdd.ddd', 'dddddDDddddg', 'dDDdddddddddd', 'dDDdddddddd..', '.dddddddddd..'],
    cowLegs: [
      ['.l.l....l.l..', '.l.l....l.l..'],
      ['l...l..l...l.', 'l...l..l...l.'],
    ],
    slime: ['..ffff..', '.ffffff.', 'ffWffWff', 'ffffffff', '.FFFFFF.'],
    tree: ['...vvvvv...', '.vvVVVvvvv.', 'vvVVVgVvvvv', 'vVVVVVVvvgv', 'vv.VVVvv.vv', 'v..vtvv..v.', 'v...t...v..', '....t......', '....t......', '...ttt.....'],
    grass: (x, y) => (hash(x >> 1, y, 91) < 0.3 ? '#345a38' : '#2a4a30'),
    dirt: (x, y) => (hash(x, y, 92) < 0.15 ? '#2e261c' : '#3a3024'),
    bg: '#0a120e',
    overlay: 'spores',
  }
);

export const ABSTRACT_KITS: StyleKit[] = [EMBER, DUSK, FROST, DESERT, INK, NEON, PASTEL_DREAM, MOSS];
