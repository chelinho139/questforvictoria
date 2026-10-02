import { PixelCanvas } from '../pixelPainter';
import { sprite, isoTile, hash } from './common';
import type { StyleKit } from './common';
import { COW_ROUND, COW_ROUND_LEGS, SLIME_BIG } from './characters';

/**
 * Two directions from the user's references:
 * - Cozy island: the screenshot they shared. Chibi proportions (big head, fringe, two dot
 *   eyes, small body), a soft dark-brown outline instead of black, muted warm palette,
 *   and a lush, softly shaded world.
 * - Abstract pixel: no stroke at all; tall, thin, faceless figures built from a handful of
 *   big flat pixels (Superbrothers: Sword & Sworcery territory), abstract props.
 */

// ---------------------------------------------------------------- cozy island
const COZY: Record<string, string> = {
  j: '#3e2618', h: '#5a3a2a', H: '#7a5238',
  s: '#f4cda6', S: '#dba480', e: '#2e1e1e', w: '#ffffff',
  r: '#c85a4a', R: '#983e34',
  b: '#6d82a4', B: '#90a4c0', n: '#4d5d7c',
  l: '#5c4232', L: '#3e2c20',
  m: '#e6ecf2', g: '#e8b84a',
  c: '#f7f1e4', C: '#d8ccb6', x: '#4a3c3c', p: '#f0a8a8', q: '#c87880', o: '#eadcb0',
  t: '#7cc8e0', T: '#d2f2fa', u: '#4a92b4',
};

const COZY_HERO = [
  '....jhhhhj.....',
  '..jhhHHHHhhj...',
  '.jhHHHHHHHHhj..',
  '.hHHHhhhhHHHh..',
  '.hhhhhhhhhhhh..',
  '.hhsssssssshh..',
  '.hhsesssesSh.m.',
  '.hhsesssesSh.m.',
  '..hssssssSh..m.',
  '...SssssSS...m.',
  '...rrrrrRr..gmg',
  '..nBBbbbbnn.s..',
  '..nBbbbbbnss...',
  '..nbbbbbbn.....',
  '...lllllll.....',
];
const COZY_LEGS = [
  ['...ll...ll.....', '..LLL...LLL....'],
  ['..ll.....ll....', '.LLL.....LLL...'],
];

/** Bushy tree made of shaded leaf clumps, soft dark-green outline (like the reference's foliage). */
function cozyTree(): HTMLCanvasElement {
  const p = new PixelCanvas(28, 34);
  p.rect(12, 22, 4, 11, '#7a5234').vline(12, 22, 32, '#946a44').vline(15, 22, 32, '#5a3a22');
  p.hline(10, 17, 32, '#5a3a22').px(11, 31, '#7a5234').px(16, 31, '#7a5234');
  const LEAF = ['#8fd06a', '#5ea846', '#3f8a3a', '#2c6a30'];
  const clumps: [number, number, number][] = [
    [8, 17, 6],
    [20, 17, 6],
    [14, 20, 6],
    [7, 10, 6],
    [21, 10, 6],
    [14, 7, 7],
    [14, 14, 6],
  ];
  for (const [x, y, r] of clumps) p.blob(x, y, r, r * 0.85, LEAF);
  p.speckle(26, '#a8e07a', 31, (_x, y) => y < 16);
  p.speckle(18, '#2c6a30', 32, (_x, y) => y > 12 && y < 24);
  return p.outline('#23401f').toCanvas();
}

// ---------------------------------------------------------------- abstract pixel
const ABS: Record<string, string> = {
  h: '#2a2030', s: '#e8c8a8', b: '#4a5a78', B: '#6a7a98', M: '#9aa0aa', m: '#eef2f6', g: '#d8b05a',
  r: '#c84a3a', l: '#2a2030',
  c: '#ece6da', x: '#3a3440', o: '#d8cfb8', p: '#e0a0a0', e: '#2a2030',
  t: '#6ac0d8', u: '#4a98b8',
  G: '#5a8a64', F: '#3e6a4a', K: '#4a3a30',
};

const ABS_HERO = [
  '....hh..m',
  '....hs..m',
  '....ss..m',
  '...bbbb.m',
  '..MbbbbBm',
  '..MbbbBsg',
  '..MbbbB..',
  '..rbbbb..',
  '..rbbbb..',
  '...bbbb..',
];
const ABS_LEGS = [
  ['....b.b..', '....b.b..', '...ll.ll.'],
  ['...b...b.', '...b...b.', '..ll...ll'],
];

const ABS_COW_TOP = ['..........o.o', '.ccccxxcc.ccc', 'cccccxxccccce', 'cxxccccccccpp', 'cxxcccccccc..', '.cccccccccc..'];
const ABS_COW_LEGS = [
  ['.c.c....c.c..', '.c.c....c.c..'],
  ['c...c..c...c.', 'c...c..c...c.'],
];

export const REFERENCE_KITS: StyleKit[] = [
  {
    id: 'cozy',
    name: 'A · Cozy island (your reference)',
    blurb: 'Chibi hero with fringe and dot eyes, soft dark-brown outline, muted warm palette, lush clumped foliage. Drawn at 2×.',
    scale: 2,
    hero: () => COZY_LEGS.map(legs => sprite([...COZY_HERO, ...legs], COZY, 'soft')),
    cow: () => COW_ROUND_LEGS.map(legs => sprite([...COW_ROUND, ...legs], COZY, 'soft')),
    slime: () => sprite(SLIME_BIG, COZY, 'soft'),
    tree: cozyTree,
    grass: () =>
      isoTile(32, 16, (x, y) => {
        if (hash(x, y, 21) < 0.05) return '#7cc664';
        return hash(x >> 2, y >> 1, 22) < 0.3 ? '#539e44' : '#5fae4c';
      }),
    dirt: () => isoTile(32, 16, (x, y) => (hash(x, y, 23) < 0.06 ? '#e0c08a' : hash(x >> 2, y >> 1, 24) < 0.3 ? '#b88e5a' : '#c9a06a')),
  },
  {
    id: 'abstract',
    name: 'B · Abstract pixel (no stroke)',
    blurb: 'No outlines anywhere. Tall, thin, faceless figures from a handful of big flat pixels; props reduced to shapes. Drawn at 4×.',
    scale: 4,
    hero: () => ABS_LEGS.map(legs => sprite([...ABS_HERO, ...legs], ABS, 'none')),
    cow: () => ABS_COW_LEGS.map(legs => sprite([...ABS_COW_TOP, ...legs], ABS, 'none')),
    slime: () => sprite(['..tttt..', '.tttttt.', 'ttettett', 'tttttttt', '.uuuuuu.'], ABS, 'none'),
    tree: () =>
      sprite(
        ['...G...', '..GGF..', '..GGF..', '.GGGFF.', '.GGGFF.', '.GGGFF.', 'GGGGFFF', 'GGGGFFF', 'GGGGFFF', 'GGGGFFF', '.GGGFF.', '.GGGFF.', '..GGF..', '...K...', '...K...'],
        ABS,
        'none'
      ),
    grass: () => isoTile(16, 8, (x, y) => (hash(x, y, 25) < 0.12 ? '#5e8c50' : '#6a9a5a')),
    dirt: () => isoTile(16, 8, (x, y) => (hash(x, y, 26) < 0.15 ? '#a89070' : '#b8a07a')),
  },
];
