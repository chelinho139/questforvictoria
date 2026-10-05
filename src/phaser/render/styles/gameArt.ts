import type { NpcId } from '../../../data/npcs';
import { NPC_IDS } from '../../../data/npcs';
import { sprite, isoTile, hash } from './common';
import {
  HERO, HERO_LEGS, HOOD_ROWS, BIG_LEGS, COW, COW_LEGS, SLIME, CYPRESS, ROUND, SIL, INK_PAL, RICH_PAL,
} from './silhouetteRound';
import type { Pal } from './silhouetteRound';
import type { StyleArt, Frames, IsoTiles } from '../styleArt';
import { WALL_H, TOWER_H, TOWER_TOP } from '../styleArt';
import { ITEM_IDS } from '../../../data/items';
import { FLAT_CAMPFIRE, FLAT_FORGE, FLAT_PAL, kilnFrames } from '../structureArt';
import { creatureFrames, DRAWN_CREATURES } from '../creatureArt';
import { FLAT_NPCS, FLAT_NPC_PAL } from '../npcArt';
import type { ItemId } from '../../../data/items';

/**
 * In-game art for the Silhouette candidates. Silhouette, C2 (ink contrast) and C3 (rich
 * summer) share every shape and differ only in palette; S1h is the Silhouette world with
 * the big-head hooded hero. Everything is drawn at 4× with no outlines, like the board.
 */

type Rows = string[];

// ------------------------------------------------------------ helpers

export const frames = (rows: Rows, legs: Rows[], pal: Pal, scale: number): Frames => ({
  frames: legs.map(l => sprite([...rows, ...l], pal, 'none')),
  scale,
});
export const still = (rows: Rows, pal: Pal, scale: number): Frames => ({ frames: [sprite(rows, pal, 'none')], scale });

/** Nearest-neighbour upscale, so native pixel tiles become 64×32 game tiles. */
export function up(src: HTMLCanvasElement, s: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = src.width * s;
  cv.height = src.height * s;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.drawImage(src, 0, 0, cv.width, cv.height);
  return cv;
}

/**
 * Paint a w×h canvas (game pixels) in s×s cells whose edges fall on the world's pixel
 * grid: `oy` is the canvas top's world y modulo s. Each cell takes the colour sampled at
 * its centre, so smooth geometry comes out as crisp, chunky pixels.
 */
export function cells(w: number, h: number, s: number, oy: number, at: (x: number, y: number) => string | null): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  const y0 = oy === 0 ? 0 : oy - s;
  for (let y = y0; y < h; y += s)
    for (let x = 0; x < w; x += s) {
      const col = at(x + s / 2, y + s / 2);
      if (!col) continue;
      c.fillStyle = col;
      c.fillRect(x, Math.max(0, y), s, Math.min(y + s, h) - Math.max(0, y));
    }
  return cv;
}

export interface CastlePal {
  top: string;
  left: string;
  right: string;
  /** Mortar course colour; null for flat faces. */
  course: string | null;
  roof: [string, string, string, string];
  pole: string;
  flag: string;
}

const inTri = (px: number, py: number, a: number[], b: number[], c: number[]) => {
  const d1 = (px - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (py - b[1]);
  const d2 = (px - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (py - c[1]);
  const d3 = (px - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (py - a[1]);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};

/** Brick courses every 8 px down a face (v), with joints every 16 px along it (t), offset per course. */
function mortar(p: CastlePal, v: number, t: number): boolean {
  if (!p.course) return false;
  const course = Math.floor(v / 8);
  return v % 8 < 2 || (t + (course % 2) * 8) % 16 < 2;
}

/** Colour of an iso block (ground centre x,y, height H) at a point, or null outside it. */
function blockAt(px: number, py: number, x: number, y: number, H: number, p: CastlePal): string | null {
  if (Math.abs(px - x) / 32 + Math.abs(py - (y - H)) / 16 <= 1) return p.top;
  if (px >= x - 32 && px <= x) {
    const t = px - (x - 32);
    const yTop = y - H + t / 2;
    if (py >= yTop && py <= y + t / 2) return mortar(p, py - yTop, t) ? p.course! : p.left;
  }
  if (px >= x && px <= x + 32) {
    const t = px - x;
    const yTop = y - H + 16 - t / 2;
    if (py >= yTop && py <= y + 16 - t / 2) return mortar(p, py - yTop, t) ? p.course! : p.right;
  }
  return null;
}

/**
 * Castle wall, tower and ground shadow drawn in s×s pixels. Canvas sizes and anchors match
 * the renderer's (see WorldRenderer); both canvases start 2 px off the 4-px world grid.
 */
export function pixelCastle(s: number, p: CastlePal): { wall: HTMLCanvasElement; tower: HTMLCanvasElement; shadow: HTMLCanvasElement } {
  const oy = ((-34 % s) + s) % s; // wall and tower tops sit at world y 16n − 34 and 16n − 102
  const wall = cells(64, WALL_H + 32, s, oy, (px, py) => blockAt(px, py, 32, WALL_H + 16, WALL_H, p));
  const x = 32;
  const y = TOWER_TOP;
  const ax = x;
  const ay = y - TOWER_H - 16 - 30;
  const L = [x - 32, y - TOWER_H];
  const R = [x + 32, y - TOWER_H];
  const Tp = [x, y - TOWER_H - 16];
  const B = [x, y - TOWER_H + 16];
  const A = [ax, ay];
  const tower = cells(64, TOWER_TOP + 16, s, oy, (px, py) => {
    if (px >= ax && px < ax + s + 8 && py >= ay - 14 && py < ay - 8) return p.flag;
    if (px > ax - s && px <= ax && py >= ay - 14 && py < ay) return p.pole;
    if (inTri(px, py, L, B, A)) return p.roof[0];
    if (inTri(px, py, B, R, A)) return p.roof[1];
    if (inTri(px, py, L, Tp, A)) return p.roof[2];
    if (inTri(px, py, Tp, R, A)) return p.roof[3];
    return blockAt(px, py, x, y, TOWER_H, p);
  });
  const shadow = cells(64, 32, s, 0, (px, py) => (((px - 32) / 32) ** 2 + ((py - 16) / 16) ** 2 <= 1 ? '#000000' : null));
  return { wall, tower, shadow };
}

export interface GroundPal {
  grass: [string, string, string];
  dirt: [string, string];
  water: [string, string, string];
  flowers: [string, string, string];
  floor: [string, string];
  gate: [string, string];
}

/** Iso ground tiles drawn at 64/s × 32/s native pixels and upscaled to 64×32. */
export function pixelTiles(s: number, g: GroundPal): IsoTiles {
  const w = 64 / s;
  const h = 32 / s;
  const tile = (seed: number, fn: (x: number, y: number, r: number) => string) => up(isoTile(w, h, (x, y) => fn(x, y, hash(x, y, seed))), s);
  const grass = (v: number) =>
    tile(90 + v, (x, y, r) => (r < 0.1 ? g.grass[1] : v > 0 && hash(x, y, 95 + v) < 0.05 * v ? g.grass[2] : g.grass[0]));
  // a few flowers at fixed spots inside the diamond
  const blooms = [
    [0.3, 0.45],
    [0.55, 0.3],
    [0.62, 0.62],
    [0.42, 0.7],
  ].map(([fx, fy], i) => [Math.floor(fx * w), Math.floor(fy * h), i % 3]);
  return {
    grass: [0, 1, 2].map(grass),
    dirt: [0, 1].map(v => tile(100 + v, (_x, _y, r) => (r < 0.14 ? g.dirt[1] : g.dirt[0]))),
    water: [0, 1].map(f =>
      tile(110, (x, y, r) => {
        const wave = y % 2 === 1 && (x + y * 3 + f * 2) % Math.max(4, Math.round(w / 3)) === 0;
        return wave ? g.water[1] : r < 0.06 ? g.water[2] : g.water[0];
      })
    ),
    flower: tile(120, (x, y, r) => {
      const b = blooms.find(([bx, by]) => bx === x && by === y);
      return b ? g.flowers[b[2]] : r < 0.1 ? g.grass[1] : g.grass[0];
    }),
    floor: [0, 1].map(v => tile(130 + v, (x, y, r) => ((x + 2 * y) % Math.max(4, w / 2) === 0 ? g.floor[1] : r < 0.05 ? g.floor[1] : g.floor[0]))),
    gate: tile(140, (_x, _y, r) => (r < 0.12 ? g.gate[1] : g.gate[0])),
  };
}

// ------------------------------------------------------------ 4× creatures (new for the game)

const HORSE4 = [
  '............hh....',
  '...........mhhh...',
  '..........mmhhhhh.',
  '..........mhhH....',
  't.........mhhH....',
  'tt.hhsssshhhhH....',
  '.thhhhhhhhhhhH....',
  '..hhhhhhhhhhhH....',
  '..HhhhhhhhhhHH....',
];
const HORSE4_LEGS = [
  ['..h.h......h.h....', '..k.k......k.k....'],
  ['.h...h....h...h...', '.k...k....k...k...'],
];

const GOBLIN4 = ['....aaA....', 'aa.aaaaA.AA', '..aaaaeA...', '...aaaA....', '..cccccC.d.', '.ccccccCad.', '.ccccccC...'];
const GOBLIN4_LEGS = [
  ['..c...C....', '..l...l....'],
  ['....cC.....', '....ll.....'],
];

const SHAMAN4 = ['...hhH....o', '..hhhHH...k', 'aahhaeH...k', '..hhaaH...k', '..ccccCC.ak', '.cccccCC..k', '.cccccCC..k', '.ccccCCC..k'];
const SHAMAN4_LEGS = [['..l...l...k'], ['...l.l....k']];

const OGRE4 = [
  '....bbbB.....',
  '...bbbbbB....',
  '...bbbbeB....',
  '....bbbB.....',
  '..bbbbbbBBB..',
  '.bbbbbbbbBBB.',
  'bb.bbbbbbBBb.',
  'bb.cccccCC.b.',
  '...cccccCC.KK',
];
const OGRE4_LEGS = [
  ['...bb..BB..KK', '...ll..ll..KK'],
  ['....bbBB...KK', '....llll...KK'],
];

const SKELETON4 = ['..wwW..m', '.wwweW.m', '.wwwwW.m', '..wWW..m', '...W...m', '.wwWwwwg', '..wWw...', '...W....', '..wWw...'];
const SKELETON4_LEGS = [
  ['..w.w...', '..w.w...'],
  ['...ww...', '...ww...'],
];

const ROCK4 = ['...qrR...', '..qrrrRR.', '.qrrrrrRR', 'rrrrrRRRR', '.RRRRRRR.'];
// a mined-out rock: a few broken stones
const RUBBLE4 = ['..q.....', '.qrR.qR.', 'qrRRrrRR'];
// a felled tree's stump (pale cut on top) and items lying on the ground
const STUMP4 = ['.ooK.', 'KKKKK', 'KK.KK'];
const MEAT4 = ['.mmn', 'mmMn', 'b...'];
const LOG4 = ['wwwo', 'WWWo'];
const SACK4 = ['.m.', 'mMn', 'MMn'];

// ------------------------------------------------------------ palettes per family

interface FamilyPal {
  hero: Pal;
  goblin: Pal;
  shaman: Pal;
  ogre: Pal;
  skeleton: Pal;
  horse: Pal;
  rock: Pal;
  ground: GroundPal;
  castle: CastlePal;
  meat: Pal;
  log: Pal;
  sack: Pal;
}

const FAMILY: Record<'sil' | 'ink' | 'rich', FamilyPal> = {
  sil: {
    hero: SIL,
    goblin: { a: '#6f7c5c', A: '#5a664b', e: '#c9a24e', c: '#4f4540', C: '#403834', d: '#c8ccd0', l: '#1d1b22' },
    shaman: { h: '#574a62', H: '#463b50', a: '#6f7c5c', e: '#c9a24e', c: '#4f4540', C: '#403834', k: '#3a2e28', o: '#b8dcd4', l: '#1d1b22' },
    ogre: { b: '#7a6e62', B: '#655a50', e: '#c9a24e', c: '#4a3c34', C: '#3a2e28', l: '#1d1b22', K: '#4e4036' },
    skeleton: { w: '#d6d0c2', W: '#b4aea2', e: '#26242c', m: '#d0d6da', g: '#c9a24e' },
    horse: { h: '#5e4e46', H: '#4c3e38', m: '#26242c', t: '#26242c', k: '#1d1b22', s: '#8a5a4a' },
    rock: { q: '#8e948e', r: '#747a74', R: '#5c625c' },
    ground: {
      grass: ['#4a6454', '#56705f', '#3f574a'],
      dirt: ['#7c6c58', '#8c7c66'],
      water: ['#56727e', '#8aa6b2', '#4a6470'],
      flowers: ['#b89a9e', '#c8b890', '#d6d0c2'],
      floor: ['#6e746e', '#626862'],
      gate: ['#3a403c', '#30352f'],
    },
    castle: { top: '#9aa39c', left: '#7c867f', right: '#626b65', course: null, roof: ['#7a5660', '#5e4048', '#6a4a54', '#50363e'], pole: '#2a2226', flag: '#9a5a4a' },
    meat: { m: '#b87a6e', M: '#9a5a50', n: '#7a4a40', b: '#e6e0d2' },
    log: { w: '#7c6c58', W: '#5e4e46', o: '#c8b890' },
    sack: { m: '#b8a888', M: '#9a8a6a', n: '#7a6a50' },
  },
  ink: {
    hero: INK_PAL,
    goblin: { a: '#1e1e22', A: '#141416', e: '#c43a2e', c: '#1e1e22', C: '#141416', d: '#f4f0e6', l: '#141416' },
    shaman: { h: '#1e1e22', H: '#141416', a: '#1e1e22', e: '#c43a2e', c: '#1e1e22', C: '#141416', k: '#141416', o: '#c43a2e', l: '#141416' },
    ogre: { b: '#1e1e22', B: '#141416', e: '#c43a2e', c: '#1e1e22', C: '#141416', l: '#141416', K: '#1e1e22' },
    skeleton: { w: '#1e1e22', W: '#141416', e: '#f4f0e6', m: '#f4f0e6', g: '#c43a2e' },
    horse: { h: '#1e1e22', H: '#141416', m: '#141416', t: '#141416', k: '#141416', s: '#c43a2e' },
    rock: { q: '#2a2a2e', r: '#1e1e22', R: '#141416' },
    ground: {
      grass: ['#d6d0bc', '#cac3ad', '#bfb8a2'],
      dirt: ['#b9ae96', '#ada28a'],
      water: ['#2a2a2e', '#f4f0e6', '#1e1e22'],
      flowers: ['#c43a2e', '#141416', '#c43a2e'],
      floor: ['#c8c0aa', '#bcb49e'],
      gate: ['#1e1e22', '#141416'],
    },
    castle: { top: '#3a3a3e', left: '#1e1e22', right: '#141416', course: null, roof: ['#2a2a2e', '#141416', '#1e1e22', '#0e0e10'], pole: '#141416', flag: '#c43a2e' },
    meat: { m: '#c43a2e', M: '#96291f', n: '#141416', b: '#f4f0e6' },
    log: { w: '#1e1e22', W: '#141416', o: '#f4f0e6' },
    sack: { m: '#f4f0e6', M: '#1e1e22', n: '#141416' },
  },
  rich: {
    hero: RICH_PAL,
    goblin: { a: '#7ab848', A: '#5a9434', e: '#2a1c24', c: '#8a4a2a', C: '#6e3a20', d: '#eef4f8', l: '#2a1c24' },
    shaman: { h: '#7a3a9a', H: '#5e2a7a', a: '#7ab848', e: '#2a1c24', c: '#8a4a2a', C: '#6e3a20', k: '#6e4a2a', o: '#7af0ff', l: '#2a1c24' },
    ogre: { b: '#8a9a5a', B: '#6e7e44', e: '#2a1c24', c: '#8a4a2a', C: '#6e3a20', l: '#2a1c24', K: '#7a5230' },
    skeleton: { w: '#f6f0e2', W: '#d8d0c0', e: '#2a1c24', m: '#eef4f8', g: '#f0b840' },
    horse: { h: '#a0643a', H: '#7e4a2a', m: '#3a2418', t: '#3a2418', k: '#2a1c24', s: '#c0503a' },
    rock: { q: '#c8c8c0', r: '#a8a8a0', R: '#86867e' },
    ground: {
      grass: ['#3f9a60', '#4aa86c', '#358a54'],
      dirt: ['#b88a5a', '#c49868'],
      water: ['#3a98c8', '#8ad0f0', '#2a7aa8'],
      flowers: ['#f0b840', '#f07a8a', '#fff6e0'],
      floor: ['#b8b0a0', '#a8a090'],
      gate: ['#4a3a34', '#3a2c28'],
    },
    castle: { top: '#e2d4b4', left: '#ccb894', right: '#a8946e', course: null, roof: ['#d0583e', '#a8402e', '#bc4a34', '#8e3426'], pole: '#4a2c24', flag: '#f0b840' },
    meat: { m: '#f07a6a', M: '#c8483a', n: '#8a2a20', b: '#fff6e0' },
    log: { w: '#a0643a', W: '#7e4a2a', o: '#f0d090' },
    sack: { m: '#e0b880', M: '#c09060', n: '#8a6440' },
  },
};

/**
 * The 4× Silhouette-family style. `family` picks the palette; `hooded` swaps in S1h's
 * big-head hooded hero.
 */
export function silhouetteArt(family: 'sil' | 'ink' | 'rich', hooded = false): StyleArt {
  const P = FAMILY[family];
  const S = 4;
  return {
    heroes: () => ({
      knight: hooded ? frames(HOOD_ROWS, BIG_LEGS, P.hero, S) : frames(HERO, HERO_LEGS, P.hero, S),
      horse: frames(HORSE4, HORSE4_LEGS, P.horse, S),
    }),
    creatures: () => ({
      // Act II's creatures come in their HD drawings in every style
      ...Object.fromEntries(DRAWN_CREATURES.map(k => [k, { frames: creatureFrames(k), scale: 1 }])),
      goblin0: frames(GOBLIN4, GOBLIN4_LEGS, P.goblin, S),
      goblin1: frames(SHAMAN4, SHAMAN4_LEGS, P.shaman, S),
      goblin2: frames(OGRE4, OGRE4_LEGS, P.ogre, S),
      skeleton: frames(SKELETON4, SKELETON4_LEGS, P.skeleton, S),
      cow: frames(COW, COW_LEGS, P.hero, S),
      slime: still(SLIME, P.hero, S),
      // the backup styles have no hounds or bell-ringers: they borrow the skeleton
      bonehound: frames(SKELETON4, SKELETON4_LEGS, P.skeleton, S),
      bellringer: frames(SKELETON4, SKELETON4_LEGS, P.skeleton, S),
    }),
    forest: () => ({ tree: still(ROUND, P.hero, S), pine: still(CYPRESS, P.hero, S), rock: still(ROCK4, P.rock, S), stump: still(STUMP4, P.hero, S), rubble: still(RUBBLE4, P.rock, S) }),
    // the backup styles only have Aldric's flat drawing: everyone wears it
    npcs: () => Object.fromEntries(NPC_IDS.map(id => [id, { frames: (FLAT_NPCS[id] ?? FLAT_NPCS.aldric!).map(f => still(f, FLAT_NPC_PAL, S).frames[0]), scale: S }])) as Record<NpcId, Frames>,
    structures: () => ({
      campfire: { frames: FLAT_CAMPFIRE.map(f => still(f, FLAT_PAL, S).frames[0]), scale: S },
      forge: { frames: FLAT_FORGE.map(f => still(f, FLAT_PAL, S).frames[0]), scale: S },
      kiln: { frames: kilnFrames(), scale: 1 },
    }),
    // food and wood have their own chunky sprites; gear stays a sack at this resolution
    items: () => {
      const own: Partial<Record<ItemId, Frames>> = { meat: still(MEAT4, P.meat, S), log: still(LOG4, P.log, S) };
      const sack = still(SACK4, P.sack, S);
      return Object.fromEntries(ITEM_IDS.map(id => [id, own[id] ?? sack])) as Record<ItemId, Frames>;
    },
    castle: () => pixelCastle(S, P.castle),
    tiles: () => pixelTiles(S, P.ground),
    // hero rows 0–6 (head and chest) show above the saddle, which sits 5 rows below the horse's ears
    // the saddle (cols 5–8) sits 10 px behind the horse's centre, leaving the neck and head clear
    rider: hooded ? { rows: 6, below: 22, dx: -10 } : { rows: 7, below: 22, dx: -8 },
    portrait: hooded ? { x: 1, y: 0, w: 8, h: 5 } : { x: 2, y: 0, w: 4, h: 4 },
  };
}
