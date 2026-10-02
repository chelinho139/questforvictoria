import { sprite, isoTile, hash } from './common';
import type { StyleKit } from './common';

/**
 * One forest, eight ways of drawing it. Every kit shows the same subjects (a sword-carrying
 * wanderer, a cow, a slime, a pine and a round tree, grass with a dirt path) and none uses
 * outlines. What changes is the rendering language: proportions, shading technique, palette
 * limits, pixel size and shape vocabulary.
 */

type Rows = string[];
const walk = (top: Rows, legs: Rows[], pal: Record<string, string>) => () => legs.map(l => sprite([...top, ...l], pal, 'none'));
const one = (rows: Rows, pal: Record<string, string>) => () => sprite(rows, pal, 'none');

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return [cv, cv.getContext('2d')!];
}

// ------------------------------------------------------------ 1. Silhouette
// Sword & Sworcery: tall, thin, faceless figures; two flat tones per object; misty greens.
const SIL: Record<string, string> = {
  h: '#1d1b22', s: '#d9b99b', c: '#46545c', C: '#38444c', m: '#d0d6da', g: '#c9a24e', l: '#1d1b22',
  w: '#d6d0c2', k: '#26242c', p: '#c89088', o: '#e6e0d2',
  t: '#8aa4ac', T: '#6a8890',
  G: '#3c5a4a', F: '#2c4438', K: '#2a2226',
};
const SILHOUETTE: StyleKit = {
  id: 'st-silhouette',
  name: '1 · Silhouette',
  blurb: 'Tall, thin, faceless figures in two flat tones. Cypress spires, misty muted greens. Calm and mysterious (Sword & Sworcery).',
  scale: 4,
  bg: '#a8b8ac',
  hero: walk(
    ['...hh...', '...hh..m', '...sh..m', '..cccC.m', '.ccccCCm', '.ccccCsg', '..cccC..', '..cccC..', '..cccC..', '..cccC..'],
    [['..c..C..', '..l..l..'], ['...cC...', '...ll...']],
    SIL
  ),
  cow: walk(
    ['..........o.o', '.wwwwwkkwwwww', 'wwkkwwkkwwwkw', 'wwkkwwwwwwwpp', '.wwwwwwwwww..'],
    [['.w.w....w.w..', '.k.k....k.k..'], ['w...w..w...w.', 'k...k..k...k.']],
    SIL
  ),
  slime: one(['..tttt..', '.tttttt.', 'ttkttktt', 'tttttttt', '.TTTTTT.'], SIL),
  trees: () => [
    sprite(['...G...', '...GF..', '..GGF..', '..GGF..', '..GGFF.', '.GGGFF.', '.GGGFF.', '.GGGFF.', '.GGGFF.', '.GGGFF.', '.GGGFF.', '..GGFF.', '..GGF..', '...GF..', '...K...', '...K...'], SIL, 'none'),
    sprite(['...GGF...', '..GGGFF..', '.GGGGGFF.', '.GGGGGFF.', 'GGGGGGFFF', 'GGGGGGFFF', 'GGGGGGFFF', '.GGGGGFF.', '.GGGGGFF.', '..GGGFF..', '...GFF...', '....K....', '....K....', '....K....'], SIL, 'none'),
  ],
  grass: () => isoTile(16, 8, (x, y) => (hash(x, y, 41) < 0.12 ? '#56705f' : '#4a6454')),
  dirt: () => isoTile(16, 8, (x, y) => (hash(x, y, 42) < 0.15 ? '#8c7c66' : '#7c6c58')),
};

// ------------------------------------------------------------ 2. Four shades
// Handheld-console limits: the whole world in four shades of one hue. Short, chunky hooded hero.
const MONO: Record<string, string> = { a: '#1a2a2e', b: '#3e5e56', c: '#80a47e', d: '#e2ecc6' };
const FOUR_SHADES: StyleKit = {
  id: 'st-mono',
  name: '2 · Four shades',
  blurb: 'The whole world in four shades of one green, like an old handheld. Short, chunky hooded hero; contrast does all the work.',
  scale: 4,
  bg: '#80a47e',
  hero: walk(
    ['...aaa....', '..aaaaa..d', '.aaddda..d', '.aaddda..d', '..aaaa...d', '..bbbb..aa', '.bbbbbbbb.', '.bbbbbb...', '..cccc....', '..bbbb....'],
    [['..b..b....', '..a..a....'], ['...bb.....', '...aa.....']],
    MONO
  ),
  cow: walk(
    ['..........a.a', '.dddddaadddd.', 'ddaaddaadddad', 'ddaaddddddddb', '.cccccccccc..'],
    [['.a.a....a.a..'], ['a...a..a...a.']],
    MONO
  ),
  slime: one(['..bbbb..', '.bcdbbb.', 'bbdbbdbb', 'bbbbbbbb', '.aaaaaa.'], MONO),
  trees: () => [
    sprite(['....a....', '...aaa...', '..abaaa..', '...aaa...', '..aaaaa..', '.abaaaaa.', '..aaaaa..', '.aaaaaaa.', 'abaaaaaaa', '....b....', '....b....'], MONO, 'none'),
    sprite(['..bbbb...', '.bcbbbb..', 'bccbbbba.', 'bcbbbbba.', 'bbbbbbba.', '.bbbbaa..', '..baaa...', '....a....', '....a....'], MONO, 'none'),
  ],
  grass: () => isoTile(16, 8, (x, y) => (hash(x, y, 43) < 0.1 ? MONO.b : MONO.c)),
  dirt: () => isoTile(16, 8, (x, y) => (hash(x, y, 44) < 0.12 ? MONO.c : MONO.d)),
};

// ------------------------------------------------------------ 3. Geometric
// Everything built from primitives (circle heads, triangle cloaks, stacked-triangle pines),
// each shape split into a lit half and a shaded half. Even the ground tiles are faceted.
const GEO: Record<string, string> = {
  h: '#f6d6b8', H: '#dcae8c', c: '#e8685a', C: '#b94a46', m: '#eef0f2', g: '#f2b84a', k: '#3a3a4a', K: '#2a2a38',
  w: '#fbf6ee', W: '#ddd4c6', p: '#f0a0a0',
  y: '#f5c04a', Y: '#d8962e',
  t: '#4aa08a', T: '#2e7466', o: '#e8b04a', O: '#c0823a', B: '#8a5a44',
};
const GEOMETRIC: StyleKit = {
  id: 'st-geo',
  name: '3 · Geometric',
  blurb: 'Built from shapes: circle head, triangle cloak, stacked-triangle pines, lollipop trees. Every shape and tile split into a lit and a shaded facet.',
  scale: 4,
  bg: '#f6eedf',
  hero: walk(
    ['...hhH...', '..hhhHH..', '..hhhHH.m', '...hhH..m', '...ccC..m', '...ccC..m', '..cccCCgg', '..cccCC..', '.ccccCCC.', '.ccccCCC.', 'cccccCCCC'],
    [['...k.K...'], ['....K....']],
    GEO
  ),
  cow: walk(
    ['..........k.k', 'wwwwwwwwwwwww', 'wwwkkwwwwwwkw', 'WWWkkWWWWWWWp', 'WWWWWWWWWW...'],
    [['.K.K....K.K..'], ['K...K..K...K.']],
    GEO
  ),
  slime: one(['...yyY...', '..yyyYY..', '.yyyyYYY.', 'yykyyYKYY', 'yyyyyYYYY'], GEO),
  trees: () => [
    sprite(['....t....', '...ttT...', '..tttTT..', '...ttT...', '..tttTT..', '.ttttTTT.', '..tttTT..', '.ttttTTT.', 'tttttTTTT', '....B....', '....B....'], GEO, 'none'),
    sprite(['...ooO...', '.ooooOOO.', 'oooooOOOO', 'oooooOOOO', 'oooooOOOO', '.ooooOOO.', '...ooO...', '....B....', '....B....', '....B....'], GEO, 'none'),
  ],
  grass: () => isoTile(16, 8, x => (x < 8 ? '#a8d4b0' : '#92c29c')),
  dirt: () => isoTile(16, 8, x => (x < 8 ? '#f2d2a4' : '#e0bc8c')),
};

// ------------------------------------------------------------ 4. Mega pixel
// Extreme reduction: a hero five pixels tall at 8×, a bright fantasy-console palette.
const PICO: Record<string, string> = {
  r: '#ff004d', p: '#ffccaa', w: '#fff1e8', o: '#ffa300', b: '#29adff', n: '#1d2b53',
  G: '#008751', g: '#00e436', K: '#ab5236', P: '#ff77a8', l: '#c2c3c7', L: '#5f574f',
};
const MEGA_PIXEL: StyleKit = {
  id: 'st-pico',
  name: '4 · Mega pixel',
  blurb: 'Extreme reduction: the hero is five pixels tall, drawn at 8×. Bright fantasy-console palette on deep blue. Readable at any size.',
  scale: 8,
  bg: '#1d2b53',
  hero: walk(['.rr.w', '.rp.w', 'bbbbo', '.bb..'], [['.b.b.'], ['.bb..']], PICO),
  cow: walk(['......l.', 'wwLwwwww', 'wLLwwwwP'], [['.w.w.w..'], ['w.w.w...']], PICO),
  slime: one(['.ggg.', 'gngng', 'ggggg'], PICO),
  trees: () => [
    sprite(['..g..', '.gGG.', '..G..', '.gGG.', 'gGGGG', '..K..'], PICO, 'none'),
    sprite(['.gGP.', 'gGGGG', 'GPGGG', '.GGG.', '..K..', '..K..'], PICO, 'none'),
  ],
  grass: () => isoTile(8, 4, (x, y) => (hash(x, y, 45) < 0.2 ? '#00e436' : '#008751')),
  dirt: () => isoTile(8, 4, (x, y) => (hash(x, y, 46) < 0.15 ? '#ffa300' : '#ab5236')),
};

// ------------------------------------------------------------ 5. Dither
// Two colours only; all shading is ordered dither. Shapes are authored in 2×2 cells and the
// dither runs at the finer pixel, so silhouettes stay chunky while shading reads as texture.
const INK_D = '#1e1c1a';
const PAPER = '#e9e3cc';
const BAYER = [
  [0, 2],
  [3, 1],
];
const lvl = (x: number, y: number, level: number) => (BAYER[y & 1][x & 1] < level ? PAPER : INK_D);
/** Digits 0 (ink) to 4 (paper); 1..3 are dithered in between. */
function dither(rows: Rows, sub = 2): HTMLCanvasElement {
  const w = Math.max(...rows.map(r => r.length));
  const [cv, c] = canvas(w * sub, rows.length * sub);
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      if (ch < '0' || ch > '4') return;
      for (let dy = 0; dy < sub; dy++)
        for (let dx = 0; dx < sub; dx++) {
          const px = x * sub + dx;
          const py = y * sub + dy;
          c.fillStyle = lvl(px, py, +ch);
          c.fillRect(px, py, 1, 1);
        }
    })
  );
  return cv;
}
const DITHER: StyleKit = {
  id: 'st-dither',
  name: '5 · Dither',
  blurb: 'Two colours, no exceptions. Light and shadow are ordered dither patterns, like an old Mac or Obra Dinn. Chunky shapes, fine texture.',
  scale: 2,
  bg: PAPER,
  hero: () =>
    [
      ['..0...0..', '.00...00.'],
      ['...0.0...', '...0.0...'],
    ].map(legs =>
      dither(['...000...', '..00000.4', '..04440.4', '..04440.4', '...000..4', '..2100000', '.2210000.', '.2210000.', '.2210000.', '..21000..', '..21000..', ...legs])
    ),
  cow: () =>
    [
      ['.0.0....0.0..', '.0.0....0.0..'],
      ['0...0..0...0.', '0...0..0...0.'],
    ].map(legs => dither(['..........0.0', '.44440044444.', '4400440044404', '4400444444422', '.33333333333.', ...legs])),
  slime: () => dither(['..2222..', '.243222.', '22022022', '22222222', '.111111.']),
  trees: () => [
    dither(['....0....', '...100...', '..21000..', '...100...', '..21000..', '.2110000.', '..21000..', '.2110000.', '211000000', '....0....', '....0....']),
    dither(['...2211...', '..322111..', '.33221110.', '.32221100.', '.22211100.', '..211100..', '...1100...', '....00....', '....00....', '....00....']),
  ],
  grass: () => isoTile(32, 16, (x, y) => lvl(x, y, hash(x >> 2, y >> 1, 47) < 0.25 ? 1 : 2)),
  dirt: () => isoTile(32, 16, (x, y) => (hash(x, y, 48) < 0.05 ? INK_D : PAPER)),
};

// ------------------------------------------------------------ 6. Glow
// Near-black silhouettes; the only colour is light: glowing eyes, a luminous scarf and blade,
// a moonlit rim on one edge, bioluminescent leaves and slimes.
const GLW: Record<string, string> = {
  k: '#0b0e12', K: '#22303c', e: '#8af5e6', E: '#d6fff8', s: '#5ad8c8', o: '#ffb24a',
  g: '#7cf07a', G: '#d8ffc8', f: '#6af0c0',
};
const GLOW: StyleKit = {
  id: 'st-glow',
  name: '6 · Glow',
  blurb: 'Black silhouettes where the only colour is light: glowing eyes and scarf, a moonlit rim, luminous leaves, fireflies. Moody night forest.',
  scale: 4,
  bg: '#05070a',
  overlay: 'glow',
  hero: walk(
    ['...kkk..E', '..kkkkK.E', '..kekeK.E', '..kkkkK.E', 'ss.kkK..E', '.sskkkkKe', '..kkkkK..', '..kkkkK..', '..kkkkK..', '..kkkkK..'],
    [['...k.K...', '...k.K...'], ['....kK...', '....kK...']],
    GLW
  ),
  cow: walk(
    ['..........K.K', '.KKKKKKKKKKK.', 'kkkkkkkkkkokk', 'kkkkkkkkkkkkk', '.kkkkkkkkkk..'],
    [['.k.k....k.k..', '.k.k....k.k..'], ['k...k..k...k.', 'k...k..k...k.']],
    GLW
  ),
  slime: one(['..gggg..', '.gGGggg.', 'ggkggkgg', 'gggggggg', '.gggggg.'], GLW),
  trees: () => [
    sprite(['...k...', '...kK..', '..kkK..', '..kfkK.', '.kkkkK.', '.kkkkK.', '.kkkfK.', '.kfkkK.', '.kkkkkK', '..kkkK.', '...kK..', '...k...', '...k...'], GLW, 'none'),
    sprite(['...kkkK..', '..kkkkkK.', '.kkfkkkkK', '.kkkkkfkK', 'kkkkkkkkK', '.kfkkkkK.', '..kkkkK..', '....k....', '....k....', '....k....'], GLW, 'none'),
  ],
  grass: () => isoTile(16, 8, (x, y) => (hash(x, y, 49) < 0.12 ? '#18262a' : '#111a1c')),
  dirt: () => isoTile(16, 8, (x, y) => (hash(x, y, 50) < 0.15 ? '#262c30' : '#1c2226')),
};

// ------------------------------------------------------------ 7. Soft shapes
// No shading at all: one flat colour per object, round chubby forms, candy pastels (Proteus).
const SOFT: Record<string, string> = {
  p: '#f8d4b8', b: '#7a88d8', w: '#ffffff', y: '#f8d070',
  P: '#f4a8c0', m: '#9ae0d0', M: '#6cb8ac',
  q: '#f8b4c8', e: '#a8dc98', t: '#c8a48c',
};
const SOFT_SHAPES: StyleKit = {
  id: 'st-soft',
  name: '7 · Soft shapes',
  blurb: 'No shading at all: one flat colour per object, round chubby forms, candy pastels. Lollipop trees in pink and green (Proteus).',
  scale: 4,
  bg: '#fdebdd',
  hero: walk(
    ['..ppp....', '.ppppp..w', '.ppppp..w', '..ppp...w', '.bbbbb.yy', 'bbbbbbb..', 'bbbbbbb..', '.bbbbb...'],
    [['..b.b....'], ['...b.....']],
    SOFT
  ),
  cow: walk(
    ['.........ww.', '.wwwwwwwwwww', 'wwwPPwwwwwww', 'wwwPPwwwwwwP', 'wwwwwwwwww..', '.wwwwwwwww..'],
    [['..w.w...w.w.'], ['.w...w.w...w']],
    SOFT
  ),
  slime: one(['..mmmm..', '.mmmmmm.', 'mmMmmMmm', 'mmmmmmmm', '.mmmmmm.'], SOFT),
  trees: () => [
    sprite(['...ee...', '..eeee..', '.eeeeee.', '.eeeeee.', 'eeeeeeee', 'eeeeeeee', 'eeeeeeee', '.eeeeee.', '..eeee..', '...tt...', '...tt...'], SOFT, 'none'),
    sprite(['..qqqq..', '.qqqqqq.', 'qqqqqqqq', 'qqqqqqqq', 'qqqqqqqq', '.qqqqqq.', '..qqqq..', '...tt...', '...tt...', '...tt...'], SOFT, 'none'),
  ],
  grass: () => isoTile(16, 8, (x, y) => (hash(x, y, 51) < 0.08 ? '#d6f2c8' : '#c2e8b0')),
  dirt: () => isoTile(16, 8, () => '#f6deb4'),
};

// ------------------------------------------------------------ 8. Beads
// Every pixel becomes a separate bead with a highlight, like fuse beads on a pegboard.
function mix(hex: string, to: number, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.round(((n >> s) & 255) * (1 - k) + to * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
function beads(src: HTMLCanvasElement): HTMLCanvasElement {
  const d = src.getContext('2d')!.getImageData(0, 0, src.width, src.height).data;
  const [cv, c] = canvas(src.width * 4, src.height * 4);
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++) {
      const i = (y * src.width + x) * 4;
      if (d[i + 3] < 128) continue;
      const hex = '#' + ((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).padStart(6, '0');
      c.fillStyle = hex;
      c.fillRect(x * 4, y * 4, 3, 3);
      c.fillStyle = mix(hex, 255, 0.45);
      c.fillRect(x * 4, y * 4, 1, 1);
      c.fillStyle = mix(hex, 0, 0.22);
      c.fillRect(x * 4 + 2, y * 4 + 2, 1, 1);
    }
  return cv;
}
const BEAD: Record<string, string> = {
  h: '#4a2e24', s: '#f7c89b', r: '#e8433a', R: '#b8302c', b: '#3a58b0', m: '#dfe6ea', g: '#f5b83a', k: '#2a2a30',
  w: '#f7f4ee', p: '#f59ab0', o: '#efe0b8',
  c: '#58c8e8', C: '#3a9ec8', W: '#ffffff',
  G: '#3fae5a', D: '#2a8a46', t: '#8a5a3a', O: '#f0902a', Q: '#c86a1a',
};
const BEADS: StyleKit = {
  id: 'st-bead',
  name: '8 · Beads',
  blurb: 'Every pixel is a separate bead with its own highlight, like fuse beads on a pegboard. Toy-box colours, handmade and tactile.',
  scale: 1,
  bg: '#ece4d6',
  hero: () =>
    [
      ['..b..b...', '.kk..kk..'],
      ['...bb....', '...kk....'],
    ].map(legs => beads(sprite(['..hhhh...', '.hhhhhh.m', '.hsksks.m', '..ssss..m', '.rrrrrr.g', 'srrrrrrs.', '.rrrrrr..', '.RRRRRR..', '..bbbb...', ...legs], BEAD, 'none'))),
  cow: () =>
    [
      ['.w.w....w.w..', '.k.k....k.k..'],
      ['w...w..w...w.', 'k...k..k...k.'],
    ].map(legs => beads(sprite(['..........o.o', '.wwwwkkwwwwww', 'wwkkwwkkwwwkw', 'wwkkwwwwwwwpp', '.wwwwwwwwww..', ...legs], BEAD, 'none'))),
  slime: () => beads(sprite(['..cccc..', '.cWcccc.', 'cckcckcc', 'cccccccc', '.CCCCCC.'], BEAD, 'none')),
  trees: () => [
    beads(sprite(['...G...', '..GGD..', '.GGGDD.', '..GGD..', '.GGGDD.', 'GGGGDDD', '...t...', '...t...'], BEAD, 'none')),
    beads(sprite(['..OOOO..', '.OOOOOQ.', 'OOOOOOQQ', 'OOOOOQQQ', '.OOOQQQ.', '..QQQQ..', '...tt...', '...tt...'], BEAD, 'none')),
  ],
  grass: () => beads(isoTile(16, 8, (x, y) => (hash(x, y, 52) < 0.15 ? '#7ed05a' : '#6cc24a'))),
  dirt: () => beads(isoTile(16, 8, (x, y) => (hash(x, y, 53) < 0.15 ? '#c89058' : '#dca468'))),
};

export { SILHOUETTE, FOUR_SHADES, GEOMETRIC };

export const ABSTRACT_STYLE_KITS: StyleKit[] = [SILHOUETTE, FOUR_SHADES, GEOMETRIC, MEGA_PIXEL, DITHER, GLOW, SOFT_SHAPES, BEADS];
