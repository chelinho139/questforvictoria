import { sprite, isoTile, hash } from './common';
import type { StyleKit } from './common';
import { SILHOUETTE } from './abstractStyles';

/**
 * Silhouette round: the user picked Silhouette and found earlier variants read as "the same
 * style in another season". Every kit here keeps the same daylight forest and changes one
 * axis on purpose:
 *   S · shape   — new character proportions (the cow, slime and trees follow the shape language)
 *   C · colour  — the original character under a different palette treatment
 *   D · detail  — twice the pixel resolution: 3-tone shading, folds, gear, textured ground
 */

type Rows = string[];
export type Pal = Record<string, string>;
const walk = (top: Rows, legs: Rows[], pal: Pal) => () => legs.map(l => sprite([...top, ...l], pal, 'none'));
const one = (rows: Rows, pal: Pal) => sprite(rows, pal, 'none');

// the original Silhouette sprites, so colour variants change nothing but colour
export const HERO = ['...hh...', '...hh..m', '...sh..m', '..cccC.m', '.ccccCCm', '.ccccCsg', '..cccC..', '..cccC..', '..cccC..', '..cccC..'];
export const HERO_LEGS = [
  ['..c..C..', '..l..l..'],
  ['...cC...', '...ll...'],
];
export const COW = ['..........o.o', '.wwwwwkkwwwww', 'wwkkwwkkwwwkw', 'wwkkwwwwwwwpp', '.wwwwwwwwww..'];
export const COW_LEGS = [
  ['.w.w....w.w..', '.k.k....k.k..'],
  ['w...w..w...w.', 'k...k..k...k.'],
];
export const SLIME = ['..tttt..', '.tttttt.', 'ttkttktt', 'tttttttt', '.TTTTTT.'];
export const CYPRESS = ['...G...', '...GF..', '..GGF..', '..GGF..', '..GGFF.', '.GGGFF.', '.GGGFF.', '.GGGFF.', '.GGGFF.', '.GGGFF.', '.GGGFF.', '..GGFF.', '..GGF..', '...GF..', '...K...', '...K...'];
export const ROUND = ['...GGF...', '..GGGFF..', '.GGGGGFF.', '.GGGGGFF.', 'GGGGGGFFF', 'GGGGGGFFF', 'GGGGGGFFF', '.GGGGGFF.', '.GGGGGFF.', '..GGGFF..', '...GFF...', '....K....', '....K....', '....K....'];

export const SIL: Pal = {
  h: '#1d1b22', s: '#d9b99b', c: '#46545c', C: '#38444c', m: '#d0d6da', g: '#c9a24e', l: '#1d1b22',
  w: '#d6d0c2', k: '#26242c', p: '#c89088', o: '#e6e0d2',
  t: '#8aa4ac', T: '#6a8890',
  G: '#3c5a4a', F: '#2c4438', K: '#2a2226',
  r: '#9a5a4a', e: '#e8e0d0',
};
const silGround = { grass: SILHOUETTE.grass, dirt: SILHOUETTE.dirt, bg: SILHOUETTE.bg };

// ============================================================ S · shape

const STRETCHED: StyleKit = {
  id: 'sr-stretched',
  name: 'S3 · Silhouette shape: stretched, 5+ heads',
  blurb: 'Taller and thinner than the original: a tiny head, a narrow cloak flaring at the hem and long stick legs. Long-legged cow, teardrop slime, tall cypresses.',
  scale: 4,
  ...silGround,
  hero: walk(
    ['...hh..m', '...hh..m', '...sh..m', '...cC..m', '..ccCC.m', '..ccCCsg', '..ccCC..', '.cccCC..', '.cccCC..', '.cccCCC.', '.cccCCC.', 'ccccCCC.'],
    [
      ['...c.C..', '...c.C..', '...c.C..', '..ll.l..'],
      ['...cC...', '...cC...', '...cC...', '...ll...'],
    ],
    SIL
  ),
  cow: walk(
    ['............o.o', '.wwwwwwkkwwwwww', 'wwkkwwwkkwwwwkw', 'wwkkwwwwwwwwwpp', '.wwwwwwwwwww...'],
    [
      ['.w.w......w.w..', '.w.w......w.w..', '.k.k......k.k..'],
      ['w...w....w...w.', 'w...w....w...w.', 'k...k....k...k.'],
    ],
    SIL
  ),
  slime: () => one(['...tt...', '..tttt..', '.tttttt.', '.tkttkt.', 'tttttttt', 'tttttttt', '.TTTTTT.'], SIL),
  trees: () => [one(CYPRESS, SIL), one(['..G..', '..GF.', '.GGF.', '.GGF.', '.GGFF', '.GGFF', 'GGGFF', 'GGGFF', 'GGGFF', 'GGGFF', '.GGFF', '.GGF.', '..GF.', '..K..', '..K..', '..K..'], SIL)],
};

// Proportion ladder, measured in head-heights (chibi 2-3 heads, stylised young ~3, the
// original ~4, stretched 5+). Original cow and slime so only the hero's proportions change.

// 1:2.5 cute: head about 2/5 of the height, dot eyes, short torso and legs
const CUTE_ROWS = ['...hhhh....', '..hhhhhh..m', '..hhhsss..m', '..hhsksk..m', '..hhssss..m', '...cccCCCsg', '...cccCC...', '..ccccCC...', '..ccccCC...', '..ccccCC...'];
const CUTE_LEGS = [
  ['...c..C....', '...l..l....'],
  ['....cC.....', '....ll.....'],
];
const CUTE: StyleKit = {
  id: 'sr-cute25',
  name: 'S1 · Silhouette shape: cute, 2.5 heads',
  blurb: 'Mildly cute: the head is about two fifths of the height, with dot eyes, a short cloak and short legs. Chibi range, but not extreme.',
  scale: 4,
  ...silGround,
  hero: walk(CUTE_ROWS, CUTE_LEGS, SIL),
  cow: walk(COW, COW_LEGS, SIL),
  slime: () => one(SLIME, SIL),
  trees: () => [one(CYPRESS, SIL), one(ROUND, SIL)],
};

// 1:3 young: head, torso and legs roughly a third each
const YOUNG: StyleKit = {
  id: 'sr-young3',
  name: 'S2 · Silhouette shape: young, 3 heads',
  blurb: 'Head, torso and legs about a third each: a youthful adventurer with one dot eye, between cute and the original.',
  scale: 4,
  ...silGround,
  hero: walk(
    ['...hhh...m', '..hhhhh..m', '..hhsks..m', '..hhsss..m', '...cccCCsg', '..cccCC...', '..cccCC...', '..cccCC...', '..cccCC...'],
    [
      ['..c..C....', '..c..C....', '..c..C....', '..l..l....'],
      ['...cC.....', '...cC.....', '...cC.....', '...ll.....'],
    ],
    SIL
  ),
  cow: walk(COW, COW_LEGS, SIL),
  slime: () => one(SLIME, SIL),
  trees: () => [one(CYPRESS, SIL), one(ROUND, SIL)],
};

// caped drifter, about 3.3 heads: a deep hood, a long cape streaming behind, a lowered blade
const DRIFTER: StyleKit = {
  id: 'sr-drifter',
  name: 'S4 · Silhouette shape: caped drifter',
  blurb: 'A new character, about 3.3 heads: a deep hood with a small face, a long cape streaming behind and a blade held low and forward.',
  scale: 4,
  ...silGround,
  hero: walk(
    ['.....hhh......', '....hhhhh.....', '....hhhss.....', '....hhhss.....', '..CCcccccC....', '.CCCcccccCC...', 'CCCCcccccCs...', 'CCC.cccccC.g..', 'CC..cccccC..m.', 'C...cccccC...m', '....ccccC.....'],
    [
      ['....c..C......', '....l..l......'],
      ['.....cC.......', '.....ll.......'],
    ],
    SIL
  ),
  cow: walk(COW, COW_LEGS, SIL),
  slime: () => one(SLIME, SIL),
  trees: () => [one(CYPRESS, SIL), one(ROUND, SIL)],
};

// scout, about 3.2 heads: a floppy pointed cap that trails back, one dot eye
const SCOUT: StyleKit = {
  id: 'sr-scout',
  name: 'S5 · Silhouette shape: scout',
  blurb: 'A new character, about 3.2 heads: a floppy pointed cap trailing back over dark hair, one dot eye and a slim tunic.',
  scale: 4,
  ...silGround,
  hero: walk(
    ['cc.........', '.cccc......', '..ccccc...m', '...hsss...m', '...hsks...m', '...cccCCCsg', '...cccCC...', '...cccCC...', '...cccCC...'],
    [
      ['...c..C....', '...c..C....', '...l..l....'],
      ['....cC.....', '....cC.....', '....ll.....'],
    ],
    SIL
  ),
  cow: walk(COW, COW_LEGS, SIL),
  slime: () => one(SLIME, SIL),
  trees: () => [one(CYPRESS, SIL), one(ROUND, SIL)],
};

// abstract: reduced to blocks; a floating face above a cloak bar, no limbs, the sword one line.
// It bobs instead of walking.
const ABSTRACT_HERO = ['...hs..', '...hs.m', '......m', '..ccC.m', '..ccC.m', '..ccC.g', '..ccC..', '..ccC..', '..ccC..', '..ccC..', '...c...'];
const ABSTRACT: StyleKit = {
  id: 'sr-abstract',
  name: 'S6 · Silhouette shape: abstract float',
  blurb: 'Reduced to blocks: a floating face above a cloak bar, no arms or legs, the sword a single line; it bobs instead of walking. A slab cow with a separate head, a slime with holes for eyes, bar and diamond trees.',
  scale: 4,
  ...silGround,
  hero: () => [one([...ABSTRACT_HERO, '.......'], SIL), one(['.......', ...ABSTRACT_HERO], SIL)],
  cow: walk(
    ['..........ww.', '.wwwwwwww.wwp', 'wwkkwwwww.ww.', 'wwwwwwwww....'],
    [['.w.w..w.w....'], ['w.w..w.w.....']],
    SIL
  ),
  slime: () => one(['.tttttt.', 'tt.tt.tt', 'tttttttt'], SIL),
  trees: () => [
    one(['.G.', 'GGF', 'GGF', 'GGF', 'GGF', 'GGF', 'GGF', 'GGF', 'GGF', 'GGF', 'GGF', 'GGF', '.F.', '.K.', '.K.'], SIL),
    one(['..G..', '.GGF.', 'GGGFF', 'GGGFF', 'GGGFF', '.GGF.', '..G..', '..K..', '..K..'], SIL),
  ],
};

// ------------------------------------------------------------ variants of the liked shapes

// Cute RPG proportions (Earthbound / overworld style): head about half the height and wider
// than the body, a short body, one-row legs.
const CUTE_RPG: StyleKit = {
  id: 'sr-cute-rpg',
  name: 'S1b · Silhouette shape: cute RPG, 2 heads',
  blurb: 'Classic cute RPG proportions: the head is about half the height and wider than the body, with wide-set dot eyes, a short cloak and one-row legs.',
  scale: 4,
  ...silGround,
  hero: walk(
    ['..hhhhh....', '.hhhhhhhh..', '.hhssssss.m', '.hhskssks.m', '..hssssss.m', '..cccCCCCsg', '..cccCCC...', '..cccCCC...'],
    [['...l..l....'], ['....ll.....']],
    SIL
  ),
  cow: walk(COW, COW_LEGS, SIL),
  slime: () => one(SLIME, SIL),
  trees: () => [one(CYPRESS, SIL), one(ROUND, SIL)],
};

const CUTE_HOOD: StyleKit = {
  id: 'sr-cute-hood',
  name: 'S1c · Silhouette shape: cute RPG, hooded',
  blurb: 'The same cute RPG proportions in a round hood that frames the face, with a tiny cape flaring at the hem.',
  scale: 4,
  ...silGround,
  hero: walk(
    ['...cccC....', '..ccccCC...', '.ccsssssC.m', '.ccsksskC.m', '..cssssC..m', '..cccCCCCsg', '.ccccCCCC..', '.ccccCCCC..'],
    [['...l..l....'], ['....ll.....']],
    SIL
  ),
  cow: walk(COW, COW_LEGS, SIL),
  slime: () => one(SLIME, SIL),
  trees: () => [one(CYPRESS, SIL), one(ROUND, SIL)],
};

// Slim cute: a smaller head (5 wide, 4 rows) on a narrow 3-pixel body with thin legs,
// about 2.5 heads tall. Cute through the head and eyes, not through bulk.
const SLIM_LEGS = [
  ['...c.C...', '...l.l...'],
  ['...cC....', '...ll....'],
];

const SLIM: StyleKit = {
  id: 'sr-slim',
  name: 'S1d · Silhouette shape: slim cute',
  blurb: 'A smaller head with two dot eyes on a narrow body and thin legs. Still cute, about 2.5 heads tall, but not chunky.',
  scale: 4,
  ...silGround,
  hero: walk(['...hhh...', '..hhhhh.m', '..hsksk.m', '...sss..m', '...cCCCsg', '...cCC...', '...cCC...', '...cCC...'], SLIM_LEGS, SIL),
  cow: walk(COW, COW_LEGS, SIL),
  slime: () => one(SLIME, SIL),
  trees: () => [one(CYPRESS, SIL), one(ROUND, SIL)],
};

const SLIM_HOOD: StyleKit = {
  id: 'sr-slim-hood',
  name: 'S1e · Silhouette shape: slim cute, hooded',
  blurb: 'The slim cute build in a small rounded hood with a face window and a narrow cape that flares slightly.',
  scale: 4,
  ...silGround,
  hero: walk(['...ccC...', '..cccCC.m', '..ckskC.m', '..csssC.m', '...cCCCsg', '..ccCCC..', '..ccCCC..', '...cCC...'], SLIM_LEGS, SIL),
  cow: walk(COW, COW_LEGS, SIL),
  slime: () => one(SLIME, SIL),
  trees: () => [one(CYPRESS, SIL), one(ROUND, SIL)],
};

const SLIM_SCARF: StyleKit = {
  id: 'sr-slim-scarf',
  name: 'S1f · Silhouette shape: slim cute, scarf',
  blurb: 'The slim cute build with a spiky tuft of hair and a rust scarf trailing behind.',
  scale: 4,
  ...silGround,
  hero: walk(['..h.hh...', '..hhhhh.m', '..hsksk.m', '...sss..m', '.rrrrrCsg', 'r..cCC...', '...cCC...', '...cCC...'], SLIM_LEGS, SIL),
  cow: walk(COW, COW_LEGS, SIL),
  slime: () => one(SLIME, SIL),
  trees: () => [one(CYPRESS, SIL), one(ROUND, SIL)],
};

// Big head, small body: a round 7-wide head over a short, slim 3-wide body and one-row legs.
// The head is over half the height, so the character is short and cute without being wide.
export const BIG_LEGS = [['...l.l....'], ['...ll.....']];

const BIG_HEAD: StyleKit = {
  id: 'sr-bighead',
  name: 'S1g · Silhouette shape: big head, small body',
  blurb: 'A big round head with wide-set dot eyes on a short, slim body: over half the height is head, but the body is only three pixels wide.',
  scale: 4,
  ...silGround,
  hero: walk(['..hhhhh...', '.hhhhhhh.m', '.hhsssss.m', '.hhsksks.m', '...ssss..m', '...ccCCCsg', '...ccC....', '...ccC....'], BIG_LEGS, SIL),
  cow: walk(COW, COW_LEGS, SIL),
  slime: () => one(SLIME, SIL),
  trees: () => [one(CYPRESS, SIL), one(ROUND, SIL)],
};

export const HOOD_ROWS = ['..ccccC...', '.cccccCC.m', '.ccssssC.m', '.ccksskC.m', '..cssssC.m', '...ccCCCsg', '...ccCC...', '...ccCC...'];
const BIG_HEAD_HOOD: StyleKit = {
  id: 'sr-bighead-hood',
  name: 'S1h · Silhouette shape: big head, hooded',
  blurb: 'The same big head in a round hood with a wide face window, over a slim body and a small cape.',
  scale: 4,
  ...silGround,
  hero: walk(HOOD_ROWS, BIG_LEGS, SIL),
  cow: walk(COW, COW_LEGS, SIL),
  slime: () => one(SLIME, SIL),
  trees: () => [one(CYPRESS, SIL), one(ROUND, SIL)],
};

const BIG_HEAD_SCARF: StyleKit = {
  id: 'sr-bighead-scarf',
  name: 'S1i · Silhouette shape: big head, scarf',
  blurb: 'The big head with a tuft of hair, over a slim body with a rust scarf trailing behind.',
  scale: 4,
  ...silGround,
  hero: walk(['.h.hhhh...', '.hhhhhhh.m', '.hhsssss.m', '.hhsksks.m', '...ssss..m', '.rrrrrCCsg', 'r..ccC....', '...ccC....'], BIG_LEGS, SIL),
  cow: walk(COW, COW_LEGS, SIL),
  slime: () => one(SLIME, SIL),
  trees: () => [one(CYPRESS, SIL), one(ROUND, SIL)],
};

const YOUNG_LEGS = [
  ['..c..C....', '..c..C....', '..c..C....', '..l..l....'],
  ['...cC.....', '...cC.....', '...cC.....', '...ll.....'],
];

const YOUNG_SCARF: StyleKit = {
  id: 'sr-young-scarf',
  name: 'S2b · Silhouette shape: young, scarf',
  blurb: 'The 3-head young adventurer with a rust scarf wrapped at the neck and trailing behind, and a buckled belt.',
  scale: 4,
  ...silGround,
  hero: walk(
    ['...hhh...m', '..hhhhh..m', '..hhsks..m', '..hhsss..m', '.rrrrrCCsg', 'r.cccCCC..', '..cccCCC..', '..cccgCC..', '..cccCCC..'],
    YOUNG_LEGS,
    SIL
  ),
  cow: walk(COW, COW_LEGS, SIL),
  slime: () => one(SLIME, SIL),
  trees: () => [one(CYPRESS, SIL), one(ROUND, SIL)],
};

const YOUNG_HAT: StyleKit = {
  id: 'sr-young-hat',
  name: 'S2c · Silhouette shape: young, explorer hat',
  blurb: 'The 3-head young adventurer under a pale wide-brim explorer hat, which gives a clear silhouette from far away.',
  scale: 4,
  ...silGround,
  hero: walk(
    ['...oow....', '..ooooww.m', 'ooooooowwm', '..hhsks..m', '..hhsss..m', '...cccCCsg', '..cccCC...', '..cccCC...', '..cccCC...', '..cccCC...'],
    YOUNG_LEGS,
    SIL
  ),
  cow: walk(COW, COW_LEGS, SIL),
  slime: () => one(SLIME, SIL),
  trees: () => [one(CYPRESS, SIL), one(ROUND, SIL)],
};

const ABS_COW = ['..........ww.', '.wwwwwwww.wwp', 'wwkkwwwww.ww.', 'wwwwwwwww....'];
const ABS_COW_LEGS = [['.w.w..w.w....'], ['w.w..w.w.....']];
const ABS_SLIME = ['.tttttt.', 'tt.tt.tt', 'tttttttt'];
const absTrees = () => absTreesIn(SIL);
const absTreesIn = (pal: Pal) => [
  one(['.G.', 'GGF', 'GGF', 'GGF', 'GGF', 'GGF', 'GGF', 'GGF', 'GGF', 'GGF', 'GGF', 'GGF', '.F.', '.K.', '.K.'], pal),
  one(['..G..', '.GGF.', 'GGGFF', 'GGGFF', 'GGGFF', '.GGF.', '..G..', '..K..', '..K..'], pal),
];

const ABS_CUTE_HERO = ['hhhhh..', 'hsksk.m', 'hssss.m', '......m', '.ccC..g', '.ccC...', '.ccC...', '..c....'];
const ABSTRACT_CUTE: StyleKit = {
  id: 'sr-abstract-cute',
  name: 'S6b · Silhouette shape: abstract, cute block',
  blurb: 'The abstract float at cute proportions: a big face block with two eye pixels hovering over a short cloak bar. Still no limbs; it bobs.',
  scale: 4,
  ...silGround,
  hero: () => [one([...ABS_CUTE_HERO, '.......'], SIL), one(['.......', ...ABS_CUTE_HERO], SIL)],
  cow: walk(ABS_COW, ABS_COW_LEGS, SIL),
  slime: () => one(ABS_SLIME, SIL),
  trees: absTrees,
};

const STACKED_ROWS = ['..hs..m', '..hs..m', '......m', '.ccCC.g', '.ccCC..', '.ccCC..', '.......'];
const STACKED_LEGS = [
  ['..c.C..', '..c.C..', '..l.l..'],
  ['...cC..', '...cC..', '...ll..'],
];
const ABSTRACT_STACKED: StyleKit = {
  id: 'sr-abstract-stacked',
  name: 'S6c · Silhouette shape: abstract, stacked',
  blurb: 'Head, torso and legs as three separate floating blocks at 3-head proportions. The leg block steps as it walks.',
  scale: 4,
  ...silGround,
  hero: walk(STACKED_ROWS, STACKED_LEGS, SIL),
  cow: walk(ABS_COW, ABS_COW_LEGS, SIL),
  slime: () => one(ABS_SLIME, SIL),
  trees: absTrees,
};

// ============================================================ C · colour (original sprites)

function colourKit(id: string, name: string, blurb: string, pal: Pal, bg: string, grass: [string, string], dirt: [string, string]): StyleKit {
  return {
    id,
    name,
    blurb,
    scale: 4,
    bg,
    hero: walk(HERO, HERO_LEGS, pal),
    cow: walk(COW, COW_LEGS, pal),
    slime: () => one(SLIME, pal),
    trees: () => [one(CYPRESS, pal), one(ROUND, pal)],
    grass: () => isoTile(16, 8, (x, y) => (hash(x, y, 81) < 0.12 ? grass[1] : grass[0])),
    dirt: () => isoTile(16, 8, (x, y) => (hash(x, y, 82) < 0.15 ? dirt[1] : dirt[0])),
  };
}

const MUTED = colourKit(
  'sr-muted',
  'C1 · Silhouette colour: muted fog',
  'The original character in a low-saturation palette: soft greys with only a hint of green, pale values and gentle contrast, like a faded print.',
  {
    h: '#3e4044', s: '#c8beb2', c: '#63686b', C: '#565b5e', m: '#d6d8d8', g: '#a89e84', l: '#3e4044',
    w: '#e4e1da', k: '#4a4b4e', p: '#b8a8a2', o: '#ecebe6',
    t: '#a4adad', T: '#8c9696',
    G: '#7a847c', F: '#6a746d', K: '#4e4a48',
  },
  '#d3d6d0',
  ['#9aa29b', '#a4aca5'],
  ['#bab4a8', '#c4beb2']
);

export const INK_PAL: Pal = {
  h: '#141416', s: '#141416', c: '#1e1e22', C: '#141416', m: '#f4f0e6', g: '#c43a2e', l: '#141416',
  w: '#f6f2e8', k: '#141416', p: '#d8b0a8', o: '#f6f2e8',
  t: '#c43a2e', T: '#96291f',
  G: '#1e1e22', F: '#141416', K: '#141416',
};
const INK_CONTRAST = colourKit(
  'sr-ink',
  'C2 · Silhouette colour: ink contrast',
  'Pure black shapes on a pale ground with a single red accent on the hilt and the slime. Reads by silhouette alone.',
  INK_PAL,
  '#ece6d6',
  ['#d6d0bc', '#cac3ad'],
  ['#b9ae96', '#ada28a']
);

export const RICH_PAL: Pal = {
  h: '#2a1c24', s: '#f0c8a0', c: '#2f6f9a', C: '#255a80', m: '#eef4f8', g: '#f0b840', l: '#2a1c24',
  w: '#f6f0e2', k: '#3a2830', p: '#f0a098', o: '#fff6e0',
  t: '#58c0d8', T: '#3a98b8',
  G: '#2e8a5a', F: '#1f6a44', K: '#4a2c24',
};
const RICH = colourKit(
  'sr-rich',
  'C3 · Silhouette colour: rich summer',
  'The original character in deep, saturated colour: emerald greens, a blue cloak, warm skin and a golden hilt. Same daylight, more punch.',
  RICH_PAL,
  '#9fd4c0',
  ['#3f9a60', '#4aa86c'],
  ['#b88a5a', '#c49868']
);

// ============================================================ D · detail (2× resolution)

const D_HERO = [
  '......hhH.....mM.',
  '.....hhhhH....mM.',
  '.....hhhsss...mM.',
  '.....hhsssS...mM.',
  '.....hhsss....mM.',
  '......hSS.....mM.',
  '....eecBCCD...mM.',
  '...eecccCCDD..mM.',
  '...ecccCCCDDC.mM.',
  '..eccccCCCDDCgggg',
  '..eccccCCCDD.Css.',
  '..cccccCCCDD..g..',
  '..ccbbbbbBbD.....',
  '..cccccCCCDD.....',
  '..eccccCCCDD.....',
  '.eccccDCCCDDD....',
  '.ecccDccCCDDD....',
  '.cccDcccCCDDD....',
  'ecccDccCCCDDDD...',
  'cccDDccCCCDDDD...',
];
const D_HERO_LEGS = [
  ['....pp..pp.......', '....pp..pp.......', '....pp..pp.......', '....lL..lL.......', '...lll..lll......'],
  ['.....ppp.........', '....pp.pp........', '...pp...pp.......', '...lL....lL......', '..lll....lll.....'],
];

const D_TRAVELLER = [
  '......hhh........',
  '.....hhhhH....K..',
  '....hhhhhHH...k..',
  '....hhhhDssS..k..',
  '.bb.hhhhDsss..k..',
  'bBBbhhhhDSS...k..',
  'bbbbrrrrrrrR..k..',
  'bBBbrRrrrrRRRsk..',
  'bbbbcccccCCR..k..',
  'bBBbcccccCCC..k..',
  'bbbbcccccCCCC.k..',
  '.bbbcccccCCCC.k..',
  '....bbbbbbBb..k..',
  '....cccccCCC..k..',
  '....cccccCCCC.k..',
  '...ccccccCCCC.k..',
  '...ccccccCCCCCk..',
];
const D_TRAVELLER_LEGS = [
  ['.....pp..pp...k..', '.....pp..pp...k..', '.....pp..pp...k..', '.....ll..ll...k..', '....lll..lll......'],
  ['......ppp.....k..', '.....pp.pp....k..', '....pp...pp...k..', '....ll....ll..k..', '...lll....lll.....'],
];

export const D_COW = [
  '...................o....o.',
  '...................wwwwww.',
  '..wwwwwkkkkwwwwww.wwwwwww.',
  '.wwwwwkkkkkkwwwwwWwwwewww.',
  'twwwwwkkkkkwwwwwwWwwwwwwww',
  'twwwwwwkkkwwwwkkkWwwwwpppp',
  'twwwwwwwwwwwwkkkkWwwwwpPpP',
  'tWWwwwwwwwwwwwkkwWWwwwwpp.',
  'kWWWWWWWWWWuuWWWWWW.......',
];
export const D_COW_LEGS = [
  ['..ww.ww.......ww.ww.......', '..ww.ww.......ww.ww.......', '..WW.WW.......WW.WW.......', '..hh.hh.......hh.hh.......'],
  ['.ww...ww.....ww...ww......', '.ww...ww....ww.....ww.....', 'WW.....WW...WW.....WW.....', 'hh.....hh...hh.....hh.....'],
];
export const D_SLIME = [
  '.....tttttt.....',
  '...ttWWttttttt..',
  '..tWWtttttttttt.',
  '.ttWttttttttttT.',
  '.tttteetttteetT.',
  'ttttteetttteettT',
  'tttttttttttttttT',
  'ttttttttttttttTT',
  '.TtttttttttttTT.',
  '..TTTTTTTTTTTT..',
];
export const D_CYPRESS = [
  '.....G......',
  '.....GF.....',
  '....GGF.....',
  '....GGFF....',
  '...LGGFF....',
  '...LGGFFD...',
  '...LGGGFD...',
  '..LLGGGFFD..',
  '..LGGGGFFD..',
  '..LLGGGFFDD.',
  '..LGGGGGFFD.',
  '.LLGGGGGFFD.',
  '.LGGGGGGFFDD',
  '.LLGGGGGFFDD',
  '.LGGGGGGFFFD',
  '.LLGGGGGFFDD',
  '.LGGGGGGGFDD',
  '.LLGGGGGFFDD',
  '..LGGGGGFFD.',
  '..LLGGGGFFD.',
  '..LGGGGFFDD.',
  '...LGGGFFD..',
  '...LLGGFDD..',
  '....LGGFD...',
  '.....GFD....',
  '.....KK.....',
  '.....KK.....',
  '.....KK.....',
];
export const D_ROUND = [
  '........LLGGF.........',
  '......LLGGGGGFF.......',
  '....LLGGGGGGGGFFD.....',
  '...LGGGGLLGGGGGFFD....',
  '..LGGGGLGGGGGGGFFFD...',
  '..LGGGGGGGGGFFGGFFD...',
  '.LLGGGGGGGGFFFGGGFFD..',
  '.LGGGGLLGGGGFFGGGGFFD.',
  'LGGGGLGGGGGGGGGGGGFFD.',
  'LGGGGGGGGGGGFFGGGGFFDD',
  'LGGGGGGGGGGFFFFGGFFFDD',
  '.GGGGGGFFGGGGFFFFFFDD.',
  '.LGGGGFFFFGGGGGFFFDDD.',
  '..GGGFFFFFFGGFFFFDDD..',
  '...FFFFFDFFFFFFDDDD...',
  '....DDFFDDFFFDDDD.....',
  '......DDD.KKDDD.......',
  '..........KK..........',
  '..........KK..........',
  '.........KKKK.........',
];

/** Ground at 2×: grass gets short vertical blades, dirt gets small pebbles. */
function detailGround(grass: [string, string, string], dirt: [string, string, string]) {
  return {
    grass: () =>
      isoTile(32, 16, (x, y) => {
        const r = hash(x, y >> 1, 71);
        return r < 0.07 ? grass[1] : r > 0.94 ? grass[2] : grass[0];
      }),
    dirt: () =>
      isoTile(32, 16, (x, y) => {
        const r = hash(x >> 1, y, 72);
        return r < 0.06 ? dirt[1] : r > 0.95 ? dirt[2] : dirt[0];
      }),
  };
}

const D_HERO_PAL: Pal = {
  h: '#1d1b22', H: '#3a3440', s: '#d9b99b', S: '#b8977c',
  e: '#5e6e76', c: '#4c5a62', C: '#404d55', D: '#323d45', B: '#c9a24e', b: '#2a2630',
  m: '#e2e6e9', M: '#a9b1b7', g: '#c9a24e', p: '#34383f', l: '#221f26', L: '#3a3540',
};
const D_COW_PAL: Pal = { w: '#dcd6c8', W: '#bdb6a8', k: '#2c2a32', t: '#2c2a32', o: '#ece6d6', e: '#1d1b22', p: '#c89088', P: '#a06a64', u: '#d8a8a0', h: '#2a2628' };
const D_SLIME_PAL: Pal = { t: '#8aa4ac', T: '#6a8890', W: '#c8dadf', e: '#26242c' };
const D_TREE_PAL: Pal = { L: '#557a62', G: '#44684f', F: '#365741', D: '#2a4535', K: '#2e2426' };

const DETAIL_WANDERER: StyleKit = {
  id: 'sr-detail',
  name: 'D1 · Silhouette detail: wanderer',
  blurb: 'The original wanderer at twice the resolution: a lit shoulder, cloak folds, a clasp and belt buckle, a shaded blade, boots. Shaded cypresses and oaks, grass blades and pebbles.',
  scale: 2,
  bg: '#a8b8ac',
  hero: walk(D_HERO, D_HERO_LEGS, D_HERO_PAL),
  cow: walk(D_COW, D_COW_LEGS, D_COW_PAL),
  slime: () => one(D_SLIME, D_SLIME_PAL),
  trees: () => [one(D_CYPRESS, D_TREE_PAL), one(D_ROUND, D_TREE_PAL)],
  ...detailGround(['#4a6454', '#5a765f', '#3e5648'], ['#7c6c58', '#8e7e68', '#6a5c4a']),
};

const DETAIL_TRAVELLER: StyleKit = {
  id: 'sr-traveller',
  name: 'D2 · Silhouette detail: traveller',
  blurb: 'A new character at twice the resolution in the muted palette: a deep hood, a rust scarf, a backpack with a bedroll and a walking staff.',
  scale: 2,
  bg: '#cfd2cc',
  hero: walk(D_TRAVELLER, D_TRAVELLER_LEGS, {
    h: '#6b6e62', H: '#5a5d52', D: '#3e4038', s: '#cdbfae', S: '#ad9f8e', r: '#8e5a4e', R: '#6f443b',
    b: '#7a6450', B: '#5f4c3c', c: '#5d6158', C: '#4c5048', p: '#42443e', l: '#2e2c2a', k: '#5c4632', K: '#a89a7a',
  }),
  cow: walk(D_COW, D_COW_LEGS, { w: '#d8d4ca', W: '#b8b4aa', k: '#4a4a4c', t: '#4a4a4c', o: '#e8e6e0', e: '#2e2c2a', p: '#b8a098', P: '#8e7872', u: '#c8b0a8', h: '#3a3836' }),
  slime: () => one(D_SLIME, { t: '#a0aaa8', T: '#848e8c', W: '#d4dad8', e: '#3a3a3a' }),
  trees: () => {
    const pal = { L: '#8a948a', G: '#7a857b', F: '#6a746b', D: '#5a635b', K: '#4e4845' };
    return [one(D_CYPRESS, pal), one(D_ROUND, pal)];
  },
  ...detailGround(['#8a928a', '#98a098', '#7c847c'], ['#aaa498', '#b8b2a6', '#9a9488']),
};

// ============================================================ V · shortlist variants
// Built only from what made the shortlist: the cute and hooded characters, the two abstract
// figures, the ink and rich palettes, and the 2× detail of the traveller.

// the ink palette with the face left pale, so cute faces and floating faces still read
const INK_FACE: Pal = { ...INK_PAL, s: '#f4f0e6' };
const inkWorld = { bg: INK_CONTRAST.bg, grass: INK_CONTRAST.grass, dirt: INK_CONTRAST.dirt };
const richWorld = { bg: RICH.bg, grass: RICH.grass, dirt: RICH.dirt };

const V_HOOD_RICH: StyleKit = {
  id: 'sv-hood-rich',
  name: 'V1 · Shortlist variant: hooded, rich summer',
  blurb: 'S1h, the big-head hooded character, in the Rich summer palette: a blue hood and cloak in a saturated green forest.',
  scale: 4,
  ...richWorld,
  hero: walk(HOOD_ROWS, BIG_LEGS, RICH_PAL),
  cow: walk(COW, COW_LEGS, RICH_PAL),
  slime: () => one(SLIME, RICH_PAL),
  trees: () => [one(CYPRESS, RICH_PAL), one(ROUND, RICH_PAL)],
};

const V_CUTE_INK: StyleKit = {
  id: 'sv-cute-ink',
  name: 'V2 · Shortlist variant: cute, ink contrast',
  blurb: 'S1, the 2.5-head cute character, drawn in Ink contrast: a black silhouette with a pale face and dot eyes, and red only on the hilt and the slime.',
  scale: 4,
  ...inkWorld,
  hero: walk(CUTE_ROWS, CUTE_LEGS, INK_FACE),
  cow: walk(COW, COW_LEGS, INK_PAL),
  slime: () => one(SLIME, INK_PAL),
  trees: () => [one(CYPRESS, INK_PAL), one(ROUND, INK_PAL)],
};

const V_STACKED_RICH: StyleKit = {
  id: 'sv-stacked-rich',
  name: 'V3 · Shortlist variant: stacked, rich summer',
  blurb: 'S6c, the stacked abstract figure, in the Rich summer palette: a blue torso block and a warm face block over bright grass.',
  scale: 4,
  ...richWorld,
  hero: walk(STACKED_ROWS, STACKED_LEGS, RICH_PAL),
  cow: walk(ABS_COW, ABS_COW_LEGS, RICH_PAL),
  slime: () => one(ABS_SLIME, RICH_PAL),
  trees: () => absTreesIn(RICH_PAL),
};

const V_FLOAT_INK: StyleKit = {
  id: 'sv-float-ink',
  name: 'V4 · Shortlist variant: float, ink contrast',
  blurb: 'S6, the abstract float, in Ink contrast: a black cloak bar under a pale floating face, the most graphic of the set.',
  scale: 4,
  ...inkWorld,
  hero: () => [one([...ABSTRACT_HERO, '.......'], INK_FACE), one(['.......', ...ABSTRACT_HERO], INK_FACE)],
  cow: walk(ABS_COW, ABS_COW_LEGS, INK_PAL),
  slime: () => one(ABS_SLIME, INK_PAL),
  trees: () => absTreesIn(INK_PAL),
};

// S1h redrawn at 2× (the D2 level of detail): a shaded hood with a dark rim around the face
// window, tall dot eyes and blush, a slim cloaked body with a belt, and boots.
export const V_HOOD_2X = [
  '......eeccC......m...',
  '....eeeccccCC....mM..',
  '...eecccccccCC...mM..',
  '..ecccDDDDDDDCC..mM..',
  '.eecccDssssssDCC.mM..',
  '.eecccDskssksDCC.mM..',
  '.eecccDskssksDCC.mM..',
  '.eecccDbssssbDCC.mM..',
  '..ecccDssssSSDC..mM..',
  '...cccDDDDDDDC...mM..',
  '......eccCCC....gggg.',
  '......eccCCCCCCCCss..',
  '......BBgBBB.....g...',
  '.....eccccCCC........',
  '.....eccccCCC........',
  '....eecccccCCC.......',
];
export const V_HOOD_2X_LEGS = [
  ['.......pp..pp........', '......lll..lll.......'],
  ['.........pp..........', '........llll.........'],
];
// the same head as a cute traveller: bedroll and backpack behind, rust scarf, walking staff
const V_TRAVELLER_2X = [
  '......eeccC.......Z..',
  '....eeeccccCC.....Z..',
  '...eecccccccCC....z..',
  '..ecccDDDDDDDCC...z..',
  '.eecccDssssssDCC..z..',
  '.eecccDskssksDCC..z..',
  '.eecccDskssksDCC..z..',
  '.eecccDussssuDCC..z..',
  'qqecccDssssSSDC...z..',
  'qqqcccDDDDDDDC....z..',
  'aAa..rrrrrRR......z..',
  'aAar..eccCCCCCCCCsz..',
  'aAa...BBgBBB......z..',
  'aAa..eccccCCC.....z..',
  '.AA..eccccCCC.....z..',
  '....eecccccCCC....z..',
];
const V_TRAVELLER_2X_LEGS = [
  ['.......pp..pp.....z..', '......lll..lll....z..'],
  ['.........pp.......z..', '........llll......z..'],
];

/** V5's colours (Rich summer at 2× detail), shared with the in-game V5 art. */
export const V5_PAL = {
  hero: {
    e: '#4f8fc0', c: '#2f6f9a', C: '#255a80', D: '#163a56', s: '#f0c8a0', S: '#d8a880', k: '#2a1c24', b: '#f09a8a',
    B: '#4a2c24', g: '#f0b840', m: '#eef4f8', M: '#b8c8d4', l: '#2a1c24', p: '#3a2830',
  } as Pal,
  cow: { w: '#f6f0e2', W: '#d8d0c0', k: '#3a2830', t: '#3a2830', o: '#fff6e0', e: '#2a1c24', p: '#f0a098', P: '#c87870', u: '#f0b8b0', h: '#3a2830' } as Pal,
  slime: { t: '#58c0d8', T: '#3a98b8', W: '#c8f0f8', e: '#1a2a30' } as Pal,
  tree: { L: '#4aa870', G: '#2e8a5a', F: '#1f6a44', D: '#16553a', K: '#4a2c24' } as Pal,
};

const V_HOOD_DETAIL: StyleKit = {
  id: 'sv-hood-detail',
  name: 'V5 · Shortlist variant: hooded, 2× detail, rich summer',
  blurb: 'S1h redrawn at twice the pixels, like D2: a shaded hood with a dark rim around the face window, tall dot eyes and blush, a belted cloak and boots, in Rich summer colours.',
  scale: 2,
  bg: RICH.bg,
  hero: walk(V_HOOD_2X, V_HOOD_2X_LEGS, V5_PAL.hero),
  cow: walk(D_COW, D_COW_LEGS, V5_PAL.cow),
  slime: () => one(D_SLIME, V5_PAL.slime),
  trees: () => [one(D_CYPRESS, V5_PAL.tree), one(D_ROUND, V5_PAL.tree)],
  ...detailGround(['#3f9a60', '#4aa86c', '#358a54'], ['#b88a5a', '#c49868', '#a87a4c']),
};

const V_TRAVELLER_DETAIL: StyleKit = {
  id: 'sv-traveller-detail',
  name: 'V6 · Shortlist variant: cute traveller, 2× detail',
  blurb: 'D2’s traveller gear on S1h’s big hooded head: bedroll and backpack, a rust scarf and a walking staff, at twice the pixels in D2’s muted palette.',
  scale: 2,
  bg: DETAIL_TRAVELLER.bg,
  hero: walk(V_TRAVELLER_2X, V_TRAVELLER_2X_LEGS, {
    e: '#7c7f72', c: '#6b6e62', C: '#5a5d52', D: '#3e4038', s: '#cdbfae', S: '#ad9f8e', k: '#2e2c2a', u: '#c09a8c',
    q: '#b8ad94', a: '#7a6450', A: '#5f4c3c', r: '#8e5a4e', R: '#6f443b', B: '#3e3a34', g: '#a89a7a',
    p: '#42443e', l: '#2e2c2a', z: '#5c4632', Z: '#a89a7a',
  }),
  cow: DETAIL_TRAVELLER.cow,
  slime: DETAIL_TRAVELLER.slime,
  trees: DETAIL_TRAVELLER.trees,
  grass: DETAIL_TRAVELLER.grass,
  dirt: DETAIL_TRAVELLER.dirt,
};

/** The round's rows, in board order; the share page groups by these too. */
export const SILHOUETTE_ROWS = {
  cute: [CUTE, CUTE_RPG, CUTE_HOOD],
  bigHead: [BIG_HEAD, BIG_HEAD_HOOD, BIG_HEAD_SCARF],
  slim: [SLIM, SLIM_HOOD, SLIM_SCARF],
  young: [YOUNG, YOUNG_SCARF, YOUNG_HAT],
  abstract: [ABSTRACT, ABSTRACT_CUTE, ABSTRACT_STACKED],
  colour: [MUTED, INK_CONTRAST, RICH],
  detail: [SILHOUETTE, DETAIL_WANDERER, DETAIL_TRAVELLER],
};
export const SILHOUETTE_ROUND: StyleKit[] = Object.values(SILHOUETTE_ROWS).flat();

/** The favourites so far, shown together after the round's rows. */
export const FAVOURITE_PICKS: StyleKit[] = [CUTE, BIG_HEAD_HOOD, ABSTRACT, ABSTRACT_STACKED, INK_CONTRAST, RICH, SILHOUETTE];

/** The shortlist view: the favourites plus D2, then six variants built from them. */
export const SHORTLIST: StyleKit[] = [...FAVOURITE_PICKS, DETAIL_TRAVELLER];
export const SHORTLIST_VARIANTS: StyleKit[] = [V_HOOD_RICH, V_CUTE_INK, V_STACKED_RICH, V_FLOAT_INK, V_HOOD_DETAIL, V_TRAVELLER_DETAIL];

/** Shapes from this round that the user passed on; kept for the earlier-rounds section. */
export const SILHOUETTE_SET_ASIDE: StyleKit[] = [STRETCHED, DRIFTER, SCOUT];
