import { fromRows, isoTile, hash } from './common';
import type { StyleKit } from './common';

/**
 * Chunky 8-bit, in the spirit of Realm of the Mad God: tiny sprites (≈10px) drawn at 4×,
 * one bold black outline, flat saturated colours with at most one shade per material.
 */

const INK = '#17121e';

const HERO_PAL = {
  r: '#ee4438', s: '#dfe5ee', S: '#98a2b6', f: '#f7c79a', e: INK,
  b: '#3c6ee0', B: '#2a4aa8', g: '#f8d048', W: '#ffffff', l: '#7a4a28',
};
const HERO_TOP = [
  '..rr.....',
  '.sssss.W.',
  'sssssS.W.',
  'ssffef.W.',
  'sSffff.W.',
  '.bbbbbggg',
  'bbBbbbfl.',
  '.bbgbb.g.',
];
const HERO_LEGS = [
  ['.BB.BB...', '.ll.ll...'],
  ['BB...BB..', 'll...ll..'],
];

const COW_PAL = { w: '#f6f2e8', W: '#c9c2b2', k: '#2a2630', p: '#f4a2aa', d: '#9c4858', e: INK, h: '#efe0b4', f: '#5c4232' };
const COW_TOP = [
  '.........h.h',
  '.wwwkkwww.ww',
  'wwwwkkwwwwew',
  'wkwwwwwwwppp',
  'wkkwwwkkwppd',
  '.wwwwwwww...',
];
const COW_LEGS = [
  ['.w.W.w.W....', '.f.f.f.f....'],
  ['w..W..wW....', 'f..f..ff....'],
];

const SKEL_PAL = { b: '#f0ecdf', B: '#aaa293', k: INK, r: '#ff4a3a' };
const SKEL_TOP = [
  '.bbbbb..',
  'bbbbbbb.',
  'bkrbkrb.',
  'bbbbbbb.',
  '.bkbkb..',
  '...b....',
  '.bbbbb..',
  'b.bBb.b.',
];
const SKEL_LEGS = [
  ['..b.b...', '.bb.bb..'],
  ['.b...b..', 'bb...bb.'],
];

export const CHUNKY: StyleKit = {
  id: 'chunky',
  name: 'Chunky 8-bit',
  blurb: 'Realm of the Mad God vibe: tiny sprites at 4×, bold black outline, flat saturated colour.',
  scale: 4,
  hero: () => HERO_LEGS.map(legs => fromRows([...HERO_TOP, ...legs], HERO_PAL, INK)),
  cow: () => COW_LEGS.map(legs => fromRows([...COW_TOP, ...legs], COW_PAL, INK)),
  slime: () =>
    fromRows(
      ['...ggg...', '.gGGgggg.', 'gGGgggggg', 'gggeggegg', 'ggpggggpg', 'ggggggggg', '.ddddddd.'],
      { g: '#56d0f4', G: '#d4f6ff', e: INK, p: '#ff9ab8', d: '#2e8cc8' },
      INK
    ),
  skeleton: () => SKEL_LEGS.map(legs => fromRows([...SKEL_TOP, ...legs], SKEL_PAL, INK)),
  tree: () =>
    fromRows(
      [
        '...LLLL...',
        '..LHHLLL..',
        '.LHHLLLLL.',
        'LLHLLLLlLL',
        'LLLLLLllLL',
        'LLLLlLLLLL',
        '.LLlllLLL.',
        'LLLLLLLllL',
        'LlLLLLllLL',
        '.LLlLLLL..',
        '..LLLLL...',
        '....tT....',
        '....tT....',
        '....tT....',
        '...ttTT...',
      ],
      { L: '#48b848', H: '#9ae070', l: '#2c8a38', t: '#8a5a30', T: '#5e3a1c' },
      INK
    ),
  grass: () => isoTile(16, 8, (x, y) => (hash(x, y, 1) < 0.12 ? '#78c860' : hash(x, y, 2) < 0.25 ? '#4c9c3e' : '#5cb04a')),
  dirt: () => isoTile(16, 8, (x, y) => (hash(x, y, 3) < 0.2 ? '#a07448' : hash(x, y, 4) < 0.08 ? '#d0a878' : '#b88c58')),
};
