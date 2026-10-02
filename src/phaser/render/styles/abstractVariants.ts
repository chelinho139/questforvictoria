import { sprite, isoTile, hash } from './common';
import type { StyleKit } from './common';
import { SILHOUETTE, FOUR_SHADES, GEOMETRIC } from './abstractStyles';

/**
 * Three variants each of the styles the user liked (Silhouette, Four shades, Geometric).
 * Each keeps its family's rendering rules but changes the character's shape, the palette
 * and the tree shapes.
 */

type Rows = string[];
type Pal = Record<string, string>;
const walk = (top: Rows, legs: Rows[], pal: Pal) => () => legs.map(l => sprite([...top, ...l], pal, 'none'));
const one = (rows: Rows, pal: Pal) => sprite(rows, pal, 'none');

// shared bodies within a family, so variants differ where it matters
const SIL_COW = ['..........o.o', '.wwwwwkkwwwww', 'wwkkwwkkwwwkw', 'wwkkwwwwwwwpp', '.wwwwwwwwww..'];
const SIL_COW_LEGS = [
  ['.w.w....w.w..', '.k.k....k.k..'],
  ['w...w..w...w.', 'k...k..k...k.'],
];
const SIL_SLIME = ['..tttt..', '.tttttt.', 'ttkttktt', 'tttttttt', '.TTTTTT.'];

const MONO_COW = ['..........a.a', '.dddddaadddd.', 'ddaaddaadddad', 'ddaaddddddddb', '.cccccccccc..'];
const MONO_COW_LEGS = [['.a.a....a.a..'], ['a...a..a...a.']];
const MONO_SLIME = ['..bbbb..', '.bcdbbb.', 'bbdbbdbb', 'bbbbbbbb', '.aaaaaa.'];
const MONO_PINE = ['....a....', '...aaa...', '..abaaa..', '...aaa...', '..aaaaa..', '.abaaaaa.', '..aaaaa..', '.aaaaaaa.', 'abaaaaaaa', '....b....', '....b....'];
const monoGround = (pal: Pal) => ({
  grass: () => isoTile(16, 8, (x, y) => (hash(x, y, 61) < 0.1 ? pal.b : pal.c)),
  dirt: () => isoTile(16, 8, (x, y) => (hash(x, y, 62) < 0.12 ? pal.c : pal.d)),
});

const GEO_COW = ['..........k.k', 'wwwwwwwwwwwww', 'wwwkkwwwwwwkw', 'WWWkkWWWWWWWp', 'WWWWWWWWWW...'];
const GEO_COW_LEGS = [['.K.K....K.K..'], ['K...K..K...K.']];
const GEO_SLIME = ['...yyY...', '..yyyYY..', '.yyyyYYY.', 'yykyyYKYY', 'yyyyyYYYY'];
const facets = (l: string, d: string) => () => isoTile(16, 8, x => (x < 8 ? l : d));

// ============================================================ Silhouette variants

// 1b: long-coated wanderer under a wide-brim hat; sunset peach mist, violet shapes.
const DUSK: Pal = {
  h: '#2a1e34', s: '#e8b894', c: '#4a3452', C: '#3a2842', m: '#f4d8c0', g: '#e89a4a', l: '#2a1e34',
  w: '#e8c8b0', k: '#3a2842', p: '#d88a7a', o: '#f0dcc8',
  t: '#d88a6a', T: '#b86a54',
  G: '#5a3a5a', F: '#48304a', K: '#2a1e2a',
};
const SIL_DUSK: StyleKit = {
  id: 'v-sil-dusk',
  name: '1b · Silhouette: dusk wanderer',
  blurb: 'Long flared coat and a wide-brim hat against a peach sunset. Poplars and flat-topped umbrella trees in violet.',
  scale: 4,
  bg: '#f0b890',
  hero: walk(
    ['...hhh....', '...hhh...m', '.hhhhhhh.m', '...sh....m', '..cccC...m', '.ccccCC.sg', '.ccccCC...', '.ccccCC...', '.ccccCCC..', 'cccccCCC..', 'cccccCCCC.'],
    [['..l...l...'], ['...l.l....']],
    DUSK
  ),
  cow: walk(SIL_COW, SIL_COW_LEGS, DUSK),
  slime: () => one(SIL_SLIME, DUSK),
  trees: () => [
    one(['...G...', '..GGF..', '..GGF..', '.GGGFF.', '.GGGFF.', '.GGGFF.', '.GGGFF.', '.GGGFF.', '..GGF..', '..GGF..', '...GF..', '...K...', '...K...'], DUSK),
    one(['...GGGGFF...', '.GGGGGGGFFF.', 'GGGGGGGGGFFF', '.....K......', '.....K......', '....K.......', '....K.......', '....K.......'], DUSK),
  ],
  grass: () => isoTile(16, 8, (x, y) => (hash(x, y, 63) < 0.12 ? '#8a5c70' : '#7a5064')),
  dirt: () => isoTile(16, 8, (x, y) => (hash(x, y, 64) < 0.15 ? '#c08070' : '#b07464')),
};

// 1c: very tall knight with a plumed helm, red cape and thin legs; cold blue fog, birches.
const FOG: Pal = {
  r: '#b8423e', h: '#e6e8ea', H: '#aab2ba', k: '#1e2632', n: '#2a3442', N: '#1e2632', m: '#f2f4f6', g: '#c8a050', l: '#1e2632',
  w: '#dcdcd6', p: '#c89088', o: '#eceae4',
  t: '#a8c0cc', T: '#88a0ae',
  G: '#4a5a60', F: '#3a4850', W: '#eceae4', K: '#3a4048',
};
const SIL_FOG: StyleKit = {
  id: 'v-sil-fog',
  name: '1c · Silhouette: fog knight',
  blurb: 'An even taller knight: plumed helm with a visor slit, red cape, stick-thin legs. Cold blue fog, white birches and low dark bushes.',
  scale: 4,
  bg: '#c8d0d8',
  hero: walk(
    ['...rr....', '....rr...', '...hhH..m', '...hkH..m', '...hhH..m', '..nnnnN.m', '.rnnnnNNg', '.rnnnnN..', 'rrnnnnN..', 'rr.nnN...'],
    [['r..n.N...', '...n.N...', '...l.l...'], ['r...nN...', '....nN...', '....ll...']],
    FOG
  ),
  cow: walk(SIL_COW, SIL_COW_LEGS, FOG),
  slime: () => one(SIL_SLIME, FOG),
  trees: () => [
    one(['..G.G..', '.GGGGG.', 'GGGWGGG', '.GGWGG.', '..GWG..', '...W...', '...K...', '...W...', '...W...', '...WK..', '...W...', '...W...', '...K...', '...W...'], FOG),
    one(['..GGGF..', '.GGGGGFF', 'GGGGGGFF', 'GGGGGFFF', '.GGGFFF.'], FOG),
  ],
  grass: () => isoTile(16, 8, (x, y) => (hash(x, y, 65) < 0.12 ? '#7a8892' : '#6e7c86')),
  dirt: () => isoTile(16, 8, (x, y) => (hash(x, y, 66) < 0.15 ? '#9a948a' : '#8c867c')),
};

// 1d: pointed-hood pilgrim with a void for a face and a lantern staff; ochre autumn haze.
const LANTERN: Pal = {
  c: '#6a5040', C: '#58422f', v: '#1a1210', k: '#3a2a20', y: '#f8d070', l: '#2a1e16',
  w: '#a8704a', p: '#d8a080', o: '#f0e4c8',
  t: '#d8a040', T: '#b88030',
  G: '#a0502e', F: '#7a3a22', K: '#3a2a20',
};
const SIL_LANTERN: StyleKit = {
  id: 'v-sil-lantern',
  name: '1d · Silhouette: lantern pilgrim',
  blurb: 'A robed pilgrim with a pointed hood, a dark void for a face and a lantern staff instead of a sword. Ochre haze, rust conifers, bare trees.',
  scale: 4,
  bg: '#d8c0a0',
  hero: walk(
    ['...c....y', '...cc...y', '..cccC..k', '..cvvC..k', '..cvvC..k', '..ccccCCk', '.ccccCC.k', '.ccccCC.k', '.ccccCC.k', 'cccccCCCk', 'cccccCCCk'],
    [['..l..l..k'], ['...ll...k']],
    LANTERN
  ),
  cow: walk(SIL_COW, SIL_COW_LEGS, { ...LANTERN, k: '#6a4028' }),
  slime: () => one(SIL_SLIME, { ...LANTERN, k: '#3a2a20' }),
  trees: () => [
    one(['....F....', '...GFF...', '..GGFFF..', '...GFF...', '..GGGFF..', '.GGGGFFF.', '...GGF...', '..GGGFFF.', '.GGGGGFFF', 'GGGGGGFFF', '....K....', '....K....'], LANTERN),
    one(['.K...K...', '..K.K..KG', 'KG.K..K..', '.K.K.K...', '..KKK.G..', '...K.....', '...K.....', '...K.....'], LANTERN),
  ],
  grass: () => isoTile(16, 8, (x, y) => (hash(x, y, 67) < 0.12 ? '#9a8250' : '#8a7444')),
  dirt: () => isoTile(16, 8, (x, y) => (hash(x, y, 68) < 0.15 ? '#b8987a' : '#a88a6c')),
};

// ============================================================ Four shades variants

// 2b: sepia amber; a tiny body under a huge bucket helm.
const AMBER: Pal = { a: '#2a1a10', b: '#6a4424', c: '#b8844a', d: '#f0d8a8' };
const MONO_AMBER: StyleKit = {
  id: 'v-mono-amber',
  name: '2b · Four shades: amber helm',
  blurb: 'Sepia amber tones. A tiny body under a huge bucket helm with a visor slit. Broad oaks next to the pines.',
  scale: 4,
  bg: AMBER.c,
  hero: walk(
    ['..bbbbb...', '.bbdbbbb..', '.bbbbbbb.d', '.baaaaab.d', '.bbbbbbb.d', '..bbbbb.aa', '.aaaaaaaa.', '.aaaaaa...', '..dddd....'],
    [['..a..a....', '..a..a....'], ['...aa.....', '...aa.....']],
    AMBER
  ),
  cow: walk(MONO_COW, MONO_COW_LEGS, AMBER),
  slime: () => one(MONO_SLIME, AMBER),
  trees: () => [
    one(MONO_PINE, AMBER),
    one(['...bbbb...', '.bbdbbbbb.', 'bbddbbbbba', 'bbdbbbbbba', 'bbbbbbbbaa', '.bbbbbbaa.', '..baaaaa..', '....aa....', '....aa....', '....aa....'], AMBER),
  ],
  ...monoGround(AMBER),
};

// 2c: indigo night; a wizard in a tall pointed hat with a star staff.
const INDIGO: Pal = { a: '#101428', b: '#2c3868', c: '#5a70b0', d: '#c8d4f4' };
const MONO_INDIGO: StyleKit = {
  id: 'v-mono-indigo',
  name: '2c · Four shades: indigo wizard',
  blurb: 'Four shades of midnight blue. A wizard in a tall pointed hat and long robe, holding a star staff. Moonlit spruces.',
  scale: 4,
  bg: INDIGO.c,
  hero: walk(
    ['....a.....', '...aa...d.', '...aaa.ddd', '..aaaa..d.', 'aaaaaaaab.', '..dddd..b.', '.bbbbbbbb.', '.bbbbbb.b.', '.bbbbbb.b.', 'bbbbbbb.b.', 'bbbbbbb.b.'],
    [['.a...a..b.'], ['..a.a...b.']],
    INDIGO
  ),
  cow: walk(MONO_COW, MONO_COW_LEGS, INDIGO),
  slime: () => one(MONO_SLIME, INDIGO),
  trees: () => [
    one(MONO_PINE, INDIGO),
    one(['...a...', '..aaa..', '..daa..', '.aaaaa.', '.daaaa.', '..aaa..', '.aaaaa.', 'daaaaaa', 'aaaaaaa', '...b...', '...b...'], INDIGO),
  ],
  ...monoGround(INDIGO),
};

// 2d: rose and plum; a cat-eared adventurer with a tail, big head and small body.
const ROSE: Pal = { a: '#2a1426', b: '#6a2c52', c: '#c06a8a', d: '#f8d0d8' };
const MONO_ROSE: StyleKit = {
  id: 'v-mono-rose',
  name: '2d · Four shades: rose cat',
  blurb: 'Rose and plum. A cat-eared adventurer with a big head, small body and a tail. Blossom trees next to the pines.',
  scale: 4,
  bg: ROSE.c,
  hero: walk(
    ['.a....a...', '.aa..aa..d', '.aaaaaa..d', 'aaddddaa.d', 'aaddddaa.d', '.aaaaaa.bb', '..bbbbbb..', 'a.bbbbb...', 'aabbbbb...', '..bbbb....'],
    [['..a..a....'], ['...aa.....']],
    ROSE
  ),
  cow: walk(MONO_COW, MONO_COW_LEGS, ROSE),
  slime: () => one(MONO_SLIME, ROSE),
  trees: () => [
    one(MONO_PINE, ROSE),
    one(['..dddd...', '.ddbdddd.', 'dddddbddd', 'dbdddddbd', 'ddddbdddd', '.ddddddd.', '..ddddd..', '....a....', '....a....', '....a....'], ROSE),
  ],
  ...monoGround(ROSE),
};

// ============================================================ Geometric variants

// 3b: cubes; every shape is a box with a lit top, a lit left face and a shaded right face.
const CUBE: Pal = {
  t: '#fbe4cc', h: '#f0c8a0', H: '#c89878', u: '#8ab8f0', b: '#4a7ad0', B: '#2e56a0', m: '#eef2f6', g: '#f0b040', k: '#3a3a4a', K: '#262632',
  v: '#ffffff', w: '#e6e0d6', W: '#bcb4a8', p: '#f0a0a0',
  y: '#b8f0a0', s: '#70c860', S: '#48a048',
  G: '#9ce07a', e: '#5aac50', E: '#3a8040', r: '#b08060', R: '#80563e',
};
const bevel = (face: string, edge: string) => () =>
  isoTile(16, 8, (x, y) => (Math.abs(x + 0.5 - 8) / 8 + Math.abs(y + 0.5 - 4) / 4 > 0.78 ? edge : face));
const GEO_CUBE: StyleKit = {
  id: 'v-geo-cube',
  name: '3b · Geometric: cubes',
  blurb: 'Everything is a box: cube head, block body, block trees and a cube slime. Lit top, lit left face, shaded right face. Bevelled tiles.',
  scale: 4,
  bg: '#e8f0f4',
  hero: walk(
    ['..tttt...', '..hhHH...', '..hhHH..m', '..hhHH..m', '.uuuuuu.m', '.bbbBBB.m', '.bbbBBBgg', '.bbbBBB..', '.bbbBBB..'],
    [['..k..K...', '..k..K...'], ['...kK....', '...kK....']],
    CUBE
  ),
  cow: walk(
    ['..........k.k', 'vvvvvvvvvvvvv', 'wwwkkwwwwwWWW', 'wwwkkwwwwwWkW', 'wwwwwwwwwwWWp', 'wwwwwwwwww...'],
    [['.K.K....K.K..'], ['K...K..K...K.']],
    CUBE
  ),
  slime: () => one(['.yyyyyy.', 'yyyyyyyy', 'ssksSSKS', 'ssssSSSS', 'ssssSSSS'], CUBE),
  trees: () => [
    one(['...GG...', '...eE...', '..GGGG..', '..eeEE..', '.GGGGGG.', '.eeeEEE.', '.eeeEEE.', 'GGGGGGGG', 'eeeeEEEE', 'eeeeEEEE', '...rR...', '...rR...'], CUBE),
    one(['.GGGGGG.', 'GGGGGGGG', 'eeeeEEEE', 'eeeeEEEE', 'eeeeEEEE', 'eeeeEEEE', '...rR...', '...rR...', '...rR...'], CUBE),
  ],
  grass: bevel('#b0dc98', '#98c884'),
  dirt: bevel('#e8c898', '#d4b080'),
};

// 3c: capsules and circles; round head, pill body, ball slime, stacked-ball trees.
const CAPSULE: Pal = {
  h: '#ffe0c8', H: '#e8b898', c: '#50b8a8', C: '#2e8c80', m: '#ffffff', g: '#ff8a70', k: '#35404a', K: '#252e36',
  w: '#fbf8f2', W: '#dcd4c8', p: '#ff9a8a',
  y: '#ff9a80', Y: '#e0705a',
  t: '#6ac89a', T: '#3e9a74', o: '#ffc070', O: '#e89a48', B: '#9a6a4a',
};
const GEO_CAPSULE: StyleKit = {
  id: 'v-geo-capsule',
  name: '3c · Geometric: capsules',
  blurb: 'Everything is round: ball head, pill-shaped body, a ball slime, stacked-ball and lollipop trees. Still lit left, shaded right. Mint and coral.',
  scale: 4,
  bg: '#eaf6f0',
  hero: walk(
    ['...hhH...', '..hhhHH..', '..hhhHH.m', '...hhH..m', '..cccCC.m', '.ccccCCCg', '.ccccCCC.', '.ccccCCC.', '.ccccCCC.', '..cccCC..'],
    [['...k.K...'], ['....K....']],
    CAPSULE
  ),
  cow: walk(
    ['..wwwwwww.ww.', '.wwwkkwwwwwww', 'wwwwkkwwwwwkw', 'WWWWWWWWWWWWp', '.WWWWWWWWWWW.', '..WWWWWWW....'],
    [['..K.K..K.K...'], ['.K...K.K...K.']],
    CAPSULE
  ),
  slime: () => one(['...yyY...', '.yyyyYYY.', 'yykyyYKYY', 'yyyyyYYYY', '.yyyyYYY.', '...yyY...'], CAPSULE),
  trees: () => [
    one(['...tT...', '..ttTT..', '...tT...', '..ttTT..', '.tttTTT.', '..ttTT..', '.tttTTT.', 'ttttTTTT', '.tttTTT.', '...BB...', '...BB...'], CAPSULE),
    one(['...ooO...', '.ooooOOO.', 'oooooOOOO', 'oooooOOOO', 'oooooOOOO', '.ooooOOO.', '...ooO...', '....B....', '....B....', '....B....'], CAPSULE),
  ],
  grass: facets('#bfe8d0', '#a8d8bc'),
  dirt: facets('#ffe0c0', '#f0c8a0'),
};

// 3d: night; a kite-shaped cloak under a triangle hood with gold eyes, spires and diamond trees.
const KITE: Pal = {
  h: '#3a4a8a', H: '#26305e', f: '#ffd070', c: '#4a5aa0', C: '#2e3870', m: '#e8ecff', g: '#ffc850', k: '#1a1e3a', K: '#10132a',
  w: '#8a94c0', W: '#5a6490', p: '#ffc850',
  y: '#ffd070', Y: '#e0a040',
  t: '#3e6a8a', T: '#28486a', o: '#ffc850', O: '#d89a30', B: '#1a1e3a',
};
const GEO_KITE: StyleKit = {
  id: 'v-geo-kite',
  name: '3d · Geometric: night kite',
  blurb: 'Night version: a kite-shaped cloak under a triangle hood with two gold eyes. Navy and gold, tall spires and golden diamond trees.',
  scale: 4,
  bg: '#141830',
  hero: walk(
    ['....h....', '...hhH...', '..hhhHH.m', '..hfhfH.m', '...hhH..m', '...ccC..m', '..cccCCgg', '.ccccCCC.', 'cccccCCCC', '.ccccCCC.', '..cccCC..', '...ccC...'],
    [['...k.K...'], ['....K....']],
    KITE
  ),
  cow: walk(GEO_COW, GEO_COW_LEGS, KITE),
  slime: () => one(GEO_SLIME, KITE),
  trees: () => [
    one(['....t....', '....t....', '...ttT...', '...ttT...', '...ttT...', '..tttTT..', '..tttTT..', '..tttTT..', '.ttttTTT.', '.ttttTTT.', '....B....', '....B....'], KITE),
    one(['....o....', '...ooO...', '..oooOO..', '.ooooOOO.', 'oooooOOOO', '.ooooOOO.', '..oooOO..', '...ooO...', '....B....', '....B....', '....B....'], KITE),
  ],
  grass: facets('#2e3a66', '#26305a'),
  dirt: facets('#5a4c6a', '#4c405c'),
};

// ============================================================ Cute variants
// Big heads (about half the body), dot or 2×2 cartoon eyes, blush, stubby limbs. Each family
// keeps its own rendering rules; the cow and slime get chibi versions to match.

// chibi cow: big head with eyes and a wide muzzle, short body. w body, k spots, e eyes,
// p muzzle, o horns (letters remapped per palette)
const CUTE_COW = ['......o....o', '......wwwwww', '.wwkkwwewwew', 'wwwkkwwwwwww', 'wwwwwwwppppw', '.wwwwwwpppp.'];
const CUTE_COW_LEGS = [
  ['.w.w...w.w..', '.k.k...k.k..'],
  ['w...w.w...w.', 'k...k.k...k.'],
];
// big-eyed slime: t body, T base, e pupils, W eye glint, b blush
const CUTE_SLIME = ['...tttt...', '.tttttttt.', 'tteWtteWtt', 'tteetteett', 'tbttttttbt', '.TTTTTTTT.'];

// 1e: mushroom-cap kid; muted silhouette palette, now with a face.
const MUSH: Pal = {
  r: '#b85a4a', R: '#98483c', d: '#ecdcc8', s: '#e8c8a8', S: '#d0ac8c', e: '#2a2228', b: '#e89a8a',
  c: '#5a6a60', C: '#4a5850', m: '#d0d6da', g: '#c9a24e', l: '#2a2228',
  w: '#d6d0c2', k: '#26242c', p: '#e0b0a4', o: '#e6e0d2',
  t: '#8aa4ac', T: '#6a8890', W: '#ffffff',
};
const SIL_MUSH: StyleKit = {
  id: 'v-sil-mush',
  name: '1e · Silhouette cute: mushroom kid',
  blurb: 'Big-headed kid under a spotted mushroom cap, dot eyes and blush, stubby body. Keeps the misty two-tone world and cypress spires.',
  scale: 4,
  bg: '#a8b8ac',
  hero: walk(
    ['....rrrR....', '..rrdrrrRR..', '.rrrrrrdrRR.', 'rrdrrrrrrRRR', 'rrrrrrrrRRRR', '..ssssssS..m', '..sesssesS.m', '..sbsssbsS.m', '...ssssSS..m', '..ccccCCCsgg', '..ccccCCC...'],
    [['...l..l.....'], ['....ll......']],
    MUSH
  ),
  cow: walk(CUTE_COW, CUTE_COW_LEGS, MUSH),
  slime: () => one(CUTE_SLIME, MUSH),
  trees: () => SILHOUETTE.trees!(),
  grass: SILHOUETTE.grass,
  dirt: SILHOUETTE.dirt,
};

// 1f: tiny knight inside a huge round helm with two big eye holes and a plume.
const ROUNDHELM: Pal = {
  r: '#d8a04a', h: '#c8d0d4', H: '#a4aeb4', e: '#1e2428', W: '#ffffff', c: '#3a6a70', C: '#2e5a5e', m: '#eef2f4', g: '#d8a04a', l: '#1e2428',
  w: '#e4e2da', k: '#2a3438', p: '#e0b0a8', o: '#eceae4',
  t: '#9ccac4', T: '#78aaa4', b: '#e8a8a0',
  G: '#4a5a60', F: '#3a4850', K: '#3a4048',
};
const SIL_ROUNDHELM: StyleKit = {
  id: 'v-sil-roundhelm',
  name: '1f · Silhouette cute: round-helm knight',
  blurb: 'A tiny knight almost all helmet: a huge round helm with two big eye holes and a yellow plume, stubby teal body. Cold fog, birches.',
  scale: 4,
  bg: '#c8d0d8',
  hero: walk(
    ['.....rr.....', '....rr......', '...hhhhHH...', '..hhhhhhHH..', '.hhhhhhhhHH.', '.hhWehhWeHH.', '.hheehheeHHm', '.hhhhhhhhHHm', '..hhhhhhHH.m', '..ccccCCCHgg', '..ccccCCC...'],
    [['...l...l....'], ['....l.l.....']],
    ROUNDHELM
  ),
  cow: walk(CUTE_COW, CUTE_COW_LEGS, ROUNDHELM),
  slime: () => one(CUTE_SLIME, ROUNDHELM),
  trees: () => SIL_FOG.trees!(),
  grass: SIL_FOG.grass,
  dirt: SIL_FOG.dirt,
};

// four-shade palettes for the cute cow and slime: body d, spots a, muzzle c, horns b
const monoCute = (P: Pal): Pal => ({ ...P, w: P.d, k: P.a, e: P.a, p: P.c, o: P.b, t: P.b, T: P.a, W: P.d });

// 2e: frog-hood kid; hood with two bulging frog eyes on top, round face with big eyes.
const FROG: Pal = { a: '#1a2a24', b: '#3a6a44', c: '#8ab860', d: '#eaf4c8' };
const MONO_FROG: StyleKit = {
  id: 'v-mono-frog',
  name: '2e · Four shades cute: frog-hood kid',
  blurb: 'A kid in a frog hood with two bulging eyes on top, a round face with big dark eyes and blush. Four shades of spring green.',
  scale: 4,
  bg: FROG.c,
  hero: walk(
    ['.bbb..bbb...', '.bda..bda...', 'bbbbbbbbbb..', 'bbddddddbb.d', 'bdaddddadb.d', 'bdcddddcdb.d', '.bbddddbb..d', '.bbbbbbbbbaa', '..bddddb....', '..bbbbbb....'],
    [['..a..a......'], ['...aa.......']],
    FROG
  ),
  cow: walk(CUTE_COW, CUTE_COW_LEGS, monoCute(FROG)),
  slime: () => one(CUTE_SLIME, monoCute(FROG)),
  trees: () => [one(MONO_PINE, FROG), one(['..bbbb...', '.bcbbbb..', 'bccbbbba.', 'bcbbbbba.', 'bbbbbbba.', '.bbbbaa..', '..baaa...', '....a....', '....a....'], FROG)],
  ...monoGround(FROG),
};

// 2f: beanie kid; knit hat with a pompom, wide face with tall eyes, scarf trailing behind.
const BEANIE: Pal = { a: '#2a1418', b: '#7a2a2a', c: '#d0704a', d: '#f8e0c0' };
const MONO_BEANIE: StyleKit = {
  id: 'v-mono-beanie',
  name: '2f · Four shades cute: beanie kid',
  blurb: 'A round-faced kid in a pompom beanie with tall cartoon eyes and a scarf flying behind. Four shades of autumn red and cream.',
  scale: 4,
  bg: BEANIE.c,
  hero: walk(
    ['....dd......', '...bbbbb....', '..bbbbbbb...', '.bdbdbdbdb..', '.ddddddddd.d', '.dadddddad.d', '.dadddddad.d', '.dcdddddcd.d', '..ddddddd.aa', '.bbbbbbbbbb.', 'b.aaaaaaa...', 'b.aaaaaaa...'],
    [['...b..b.....'], ['....bb......']],
    BEANIE
  ),
  cow: walk(CUTE_COW, CUTE_COW_LEGS, monoCute(BEANIE)),
  slime: () => one(CUTE_SLIME, monoCute(BEANIE)),
  trees: () => MONO_AMBER.trees!().map((_, i) =>
    one(i === 0 ? MONO_PINE : ['...bbbb...', '.bbdbbbbb.', 'bbddbbbbba', 'bbdbbbbbba', 'bbbbbbbbaa', '.bbbbbbaa.', '..baaaaa..', '....aa....', '....aa....', '....aa....'], BEANIE)
  ),
  ...monoGround(BEANIE),
};

// geometric chibi cow and slime: lit top half / left, shaded bottom half / right
const GEO_CUTE_COW = ['......k....k', '......wwwwww', '.wwkkwwewwew', 'wwwkkwwwwwww', 'WWWWWWWppppW', '.WWWWWWpppp.'];
const GEO_CUTE_COW_LEGS = [['.K.K...K.K..'], ['K...K.K...K.']];
const GEO_CUTE_SLIME = ['...yyYY...', '.yyyyYYYY.', 'yyeWyYeWYY', 'yyeeyYeeYY', 'ybyyyYYYbY', '.yyyyYYYY.'];

// 3e: big round head with huge white cartoon eyes, a tuft of yellow hair, triangle cape.
const BIGEYE: Pal = {
  y: '#ffd84a', Y: '#e8b830', h: '#ffe2c4', H: '#f0c4a0', W: '#ffffff', e: '#2a2a3a', b: '#ffa0a0',
  c: '#6aaaf0', C: '#4a82d0', m: '#9aa8c8', g: '#ff8a5a', k: '#3a3a4a', K: '#2a2a38',
  w: '#fbf8f2', p: '#ffb0a8',
  t: '#6ac89a', T: '#3e9a74', o: '#ffc070', O: '#e89a48', B: '#9a6a4a',
};
const GEO_BIGEYE: StyleKit = {
  id: 'v-geo-bigeye',
  name: '3e · Geometric cute: big-eyed kid',
  blurb: 'A huge round head with big white cartoon eyes, a yellow hair tuft and blush, over a small triangle cape. Sunny faceted meadow.',
  scale: 4,
  bg: '#f2f8ff',
  hero: walk(
    ['...yyyY.....', '..yyyyyYY...', '.hhhhhHHHH..', 'hhWWhhHWWHH.', 'hhWehhHWeHHm', 'hhbhhhHHbHHm', '.hhhhhHHHH.m', '..hhhHHH...m', '...ccCC...gg', '..cccCCC....', '.ccccCCCC...'],
    [['...k..K.....'], ['....kK......']],
    BIGEYE
  ),
  cow: walk(GEO_CUTE_COW, GEO_CUTE_COW_LEGS, { ...BIGEYE, W: '#e0d8cc', k: '#3a3a4a' }),
  slime: () => one(GEO_CUTE_SLIME, { ...BIGEYE, y: '#8ce0a0', Y: '#5cbc7a' }),
  trees: () => GEO_CAPSULE.trees!(),
  grass: facets('#c8eab0', '#b4dc9c'),
  dirt: facets('#fff0d0', '#f4dcb4'),
};

// 3f: bean knight; the whole character is one bean with a face, a little crown and nub feet.
const BEAN: Pal = {
  p: '#c4acf4', P: '#9a80dc', e: '#2a2440', g: '#ffd060', G: '#e0a830', b: '#ffa0c0', m: '#a898c8', k: '#4a3a6a', K: '#3a2c58',
  w: '#fff8f4', W: '#e4d8e8', W2: '#ffffff',
  y: '#ffb0d0', Y: '#e888b0',
  t: '#7cc8b8', T: '#50a090', o: '#ffb0d0', O: '#e888b0', B: '#8a6a8a',
};
const GEO_BEAN: StyleKit = {
  id: 'v-geo-bean',
  name: '3f · Geometric cute: bean knight',
  blurb: 'The whole hero is one lilac bean with a face, a tiny gold crown and nub feet, holding a little sword. Lilac and pink lollipop world.',
  scale: 4,
  bg: '#f8f0ff',
  hero: walk(
    ['...g.g.g....', '...gggGG....', '..ppppPPP...', '.pppppPPPP.m', '.pepppPePP.m', 'ppepppPePPPm', 'pbpppPPPbPPm', 'pppppPPPPPgg', 'pppppPPPPP..', '.ppppPPPP...', '..pppPPP....'],
    [['...k..K.....'], ['....kK......']],
    BEAN
  ),
  cow: walk(GEO_CUTE_COW, GEO_CUTE_COW_LEGS, { ...BEAN, p: '#ffb0c8' }),
  slime: () => one(GEO_CUTE_SLIME, { ...BEAN, W: '#ffffff' }),
  trees: () => [
    one(['....t....', '...ttT...', '..tttTT..', '...ttT...', '..tttTT..', '.ttttTTT.', '..tttTT..', '.ttttTTT.', 'tttttTTTT', '....B....', '....B....'], BEAN),
    one(['...ooO...', '.ooooOOO.', 'oooooOOOO', 'oooooOOOO', 'oooooOOOO', '.ooooOOO.', '...ooO...', '....B....', '....B....', '....B....'], BEAN),
  ],
  grass: facets('#dcecc8', '#c8e0b4'),
  dirt: facets('#fde8f0', '#f4d4e0'),
};

/** Board order: each family's original first, then its variants (three, then two cute ones). */
export const VARIANT_KITS: StyleKit[] = [
  SILHOUETTE, SIL_DUSK, SIL_FOG, SIL_LANTERN, SIL_MUSH, SIL_ROUNDHELM,
  FOUR_SHADES, MONO_AMBER, MONO_INDIGO, MONO_ROSE, MONO_FROG, MONO_BEANIE,
  GEOMETRIC, GEO_CUBE, GEO_CAPSULE, GEO_KITE, GEO_BIGEYE, GEO_BEAN,
];
