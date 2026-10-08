import { PixelCanvas } from './pixelPainter';
import type { Tones } from './pixelPainter';

/**
 * The "HD" sprite set (shown recoloured as HD · Silhouette colours), painted in code with
 * three- and four-tone shading and a dark outline, plus walk frames. All sprites face
 * right; the renderer flips them. Each function returns one canvas per animation frame.
 * The hero and cow live in hdHero.ts (hand-placed pixels).
 */

const RED: Tones = ['#f0685a', '#c8392f', '#8a2020', '#5a1414'];
const GOLD: Tones = ['#ffe38a', '#e8b04a', '#a8701e'];
const LEATHER: Tones = ['#b07844', '#85532b', '#5a3418'];
const WOOD: Tones = ['#b88a58', '#8a5e34', '#5e3c1e'];
const CLOTH: Tones = ['#a8784a', '#7e552e', '#56381c'];

// ---------------------------------------------------------------- horse
const HIDE: Tones = ['#c68a58', '#9a6236', '#6e4222', '#4a2a14'];
const MANE: Tones = ['#6a4a2e', '#3a2414', '#24160c'];

/** Frames of the horse's trot (after the standing frame). */
export const HORSE_TROT = 8;

/**
 * How far the horse's body rises in each frame (px, frame 0 standing): a trot lifts it twice
 * a stride, and the rider rises with it (WorldRenderer.ride).
 */
export const HORSE_BOB = [0, ...Array.from({ length: HORSE_TROT }, (_, f) => Math.round((1 - Math.cos((4 * Math.PI * f) / HORSE_TROT)) / 2))];

/**
 * 48×32 horse with a red saddle blanket: a standing frame, then an 8-frame trot. The legs go
 * in diagonal pairs (near hind with far fore, then the other two), each bending at the knee
 * as it lifts and swings forward; the body rises twice a stride, the head nods against it,
 * and the mane and tail stream behind.
 */
export function horse(): HTMLCanvasElement[] {
  const frames: HTMLCanvasElement[] = [];
  for (let f = -1; f < HORSE_TROT; f++) {
    const stand = f < 0;
    const t = stand ? 0 : f / HORSE_TROT;
    const bob = HORSE_BOB[f + 1];
    const nod = stand ? 0 : Math.round(Math.sin(4 * Math.PI * t + 1.2));
    const p = new PixelCanvas(48, 32);
    // the legs: [hip x, near?, fore?, phase]; near hind and far fore together, then the others
    const legs: [number, boolean, boolean, number][] = [
      [16, false, false, 0.5],
      [34, false, true, 0],
      [13, true, false, 0],
      [31, true, true, 0.5],
    ];
    for (const [hx, near, fore, ph] of legs) {
      const a = 2 * Math.PI * (t + ph);
      const swing = stand ? 0 : Math.cos(a);
      const lift = stand ? 0 : Math.max(0, -Math.sin(a));
      const hipY = 19 - bob;
      const footX = Math.round(hx + 1 + swing * 4);
      const footY = Math.round(28 - lift * 3);
      // the knee (the hock, behind) bends as the leg lifts: forward on a foreleg, back on a hind
      const kneeX = Math.round((hx + 1 + footX) / 2 + (fore ? 1 : -1) * lift * 2);
      const kneeY = Math.round((hipY + footY) / 2 - lift);
      const hide = near ? HIDE[1] : HIDE[2];
      p.line(hx + 1, hipY, kneeX, kneeY, hide, 3);
      p.line(kneeX, kneeY, footX, footY - 1, hide, 2);
      if (near) p.line(hx, hipY, kneeX - 1, kneeY, HIDE[0]);
      p.rect(footX - 1, footY - 2, 3, 1, '#e8dcc8'); // white socks
      p.rect(footX - 1, footY - 1, 3, 2, '#2e2218');
    }
    // tail, streaming back and swinging with the stride
    const tail = stand ? 0 : Math.round(Math.sin(2 * Math.PI * t) * 1.5);
    p.line(10, 11 - bob, 5 - tail, 22 - bob, MANE[1], 2);
    p.line(9, 12 - bob, 6 - tail, 19 - bob, MANE[0]);
    // body, neck and head (the head nods against the body's rise)
    const hy = -bob + nod;
    p.blob(23, 15 - bob, 14, 7, HIDE);
    p.poly([[31, 13 - bob], [35, 3 + hy], [40, 3 + hy], [38, 15 - bob]], HIDE[1]);
    p.line(35, 3 + hy, 31, 12 - bob, HIDE[0]);
    p.blob(41, 6 + hy, 6, 3.5, HIDE);
    p.ellipse(45, 8 + hy, 2.5, 2, HIDE[2]);
    p.px(46, 8 + hy, '#241408');
    p.px(41, 5 + hy, '#140c06');
    p.poly([[37, 3 + hy], [38, -1 + hy], [40, 2 + hy]], HIDE[1]);
    // the mane lifts off the neck at the top of each stride
    const flow = stand ? 0 : bob;
    p.line(36, 1 + hy, 31 - flow, 12 - bob, MANE[1], 2);
    p.line(37, 1 + hy, 33 - flow, 8 - bob, MANE[0]);
    // saddle blanket and saddle
    const y0 = -bob;
    p.rect(18, 7 + y0, 11, 5, RED[1]);
    p.hline(18, 28, 7 + y0, RED[0]);
    p.hline(18, 28, 11 + y0, RED[3]);
    p.hline(18, 28, 12 + y0, GOLD[1]);
    p.rect(20, 5 + y0, 7, 3, LEATHER[1]);
    p.hline(20, 26, 5 + y0, LEATHER[0]);
    frames.push(p.outline().toCanvas());
  }
  return frames;
}

// ---------------------------------------------------------------- goblins
const GOB: Tones = ['#a4dc70', '#6fb448', '#487c2e', '#2e5020'];
const HOOD: Tones = ['#c4a0f4', '#8f62d6', '#5e3c9e', '#3e2670'];

interface GoblinOpts {
  hood?: boolean;
}

/** 24×24 goblin (or hooded shaman with a glowing staff). 2 walk frames. */
export function goblin(opts: GoblinOpts = {}): HTMLCanvasElement[] {
  const poses: [number, number][] = [[9, 13], [8, 14]];
  return poses.map(([bx, fx]) => {
    const p = new PixelCanvas(24, 24);
    const G = GOB;
    // legs and feet
    p.rect(bx, 19, 2, 4, G[2]).hline(bx - 1, bx + 1, 23, G[3]);
    p.rect(fx, 19, 2, 4, G[1]).vline(fx, 19, 22, G[0]).hline(fx, fx + 2, 23, G[2]);
    // back arm, body
    p.rect(7, 14, 2, 4, G[2]);
    p.blob(12, 16, 4, 4, G);
    if (opts.hood) {
      // robe down to the knees with gold trim
      p.rect(8, 13, 9, 8, HOOD[1]).vline(8, 13, 20, HOOD[0]).vline(16, 13, 20, HOOD[2]);
      p.hline(8, 16, 20, GOLD[1]);
    } else {
      p.rect(8, 17, 9, 3, CLOTH[1]).hline(8, 16, 17, CLOTH[0]);
      for (let x = 8; x <= 16; x += 2) p.px(x, 20, CLOTH[2]);
    }
    // head, ears, face
    p.blob(13, 8, 6, 5, G);
    p.poly([[8, 7], [1, 3], [3, 6], [8, 10]], G[1]);
    p.line(1, 3, 8, 7, G[0]);
    p.line(3, 5, 7, 8, '#c07a60');
    p.poly([[17, 6], [23, 3], [21, 7], [18, 9]], G[0]);
    p.hline(14, 18, 6, G[3]);
    p.rect(15, 7, 2, 2, '#ffe45a').px(16, 8, '#2a1a0a');
    p.rect(12, 7, 1, 2, '#d8b840');
    p.rect(19, 8, 2, 2, G[1]).px(20, 9, G[2]);
    p.hline(14, 18, 11, '#3a1a10');
    p.px(15, 11, '#f4f1e0').px(17, 11, '#f4f1e0');
    if (opts.hood) {
      // hood over the crown and down the back, face left open
      p.blob(12, 6, 7, 5, HOOD, (x, y) => y <= 6 || x <= 11);
      p.poly([[6, 5], [10, 4], [11, 13], [7, 13]], HOOD[1]);
      p.vline(6, 6, 12, HOOD[2]);
      // staff with a glowing orb
      p.vline(19, 5, 23, WOOD[1]).vline(20, 6, 23, WOOD[2]);
      p.blob(19.5, 3, 2.4, 2.4, ['#ffffff', '#d6c4ff', '#9a7ae0']);
      p.rect(17, 14, 3, 2, G[0]);
    } else {
      // arm and a knobbly club
      p.rect(15, 14, 2, 4, G[1]);
      p.rect(16, 17, 2, 2, G[0]);
      p.line(17, 18, 21, 11, WOOD[1], 2);
      p.blob(21, 10, 2.2, 2.2, WOOD);
    }
    return p.outline().toCanvas();
  });
}

const OGRE: Tones = ['#c8c88c', '#9c9c64', '#707046', '#4a4a2e'];

/** 32×32 ogre: olive hide, big belly, small tusked head, huge studded club. 2 walk frames. */
export function ogre(): HTMLCanvasElement[] {
  const poses: [number, number][] = [[0, 0], [-1, 2]];
  return poses.map(([bo, fo]) => {
    const p = new PixelCanvas(32, 32);
    const O = OGRE;
    // legs
    p.rect(9 + bo, 24, 4, 6, O[2]).rect(8 + bo, 30, 6, 1, O[3]);
    p.rect(17 + fo, 24, 5, 6, O[1]).vline(17 + fo, 24, 29, O[0]).rect(17 + fo, 30, 6, 1, O[2]);
    // back arm, torso, belly, loincloth
    p.blob(6, 17, 3, 6, [O[1], O[2], O[3]]);
    p.blob(15, 18, 9, 7.5, O);
    p.ellipse(16, 20, 5, 4, O[0]);
    p.hline(13, 19, 22, O[1]);
    p.rect(8, 23, 15, 4, CLOTH[1]).hline(8, 22, 23, LEATHER[2]).hline(8, 22, 26, CLOTH[2]);
    p.px(15, 24, GOLD[1]);
    // neck shadow, then a small head set forward on the shoulders
    p.hline(14, 21, 11, O[3]);
    p.blob(19, 6, 5.5, 5, O);
    p.hline(15, 21, 1, '#3a2a1a').px(16, 0, '#3a2a1a').px(19, 0, '#3a2a1a');
    p.hline(19, 24, 4, O[3]);
    p.rect(21, 5, 2, 2, '#fff2b0').px(22, 6, '#1a1008');
    p.rect(24, 6, 2, 2, O[1]).px(25, 7, O[2]);
    p.hline(19, 24, 9, '#3a1a10');
    p.vline(20, 7, 9, '#f4efe0').vline(23, 7, 9, '#f4efe0');
    // front arm, outlined against the belly, holding the club
    p.vline(21, 13, 22, O[3]);
    p.blob(24, 17, 3, 6, O);
    p.rect(23, 22, 3, 2, O[0]);
    p.line(25, 23, 28, 7, WOOD[1], 3);
    p.line(26, 23, 29, 8, WOOD[2]);
    p.blob(28.5, 5, 2.6, 3, WOOD);
    p.px(27, 3, '#c8ccd4').px(30, 5, '#c8ccd4').px(28, 7, '#c8ccd4');
    return p.outline().toCanvas();
  });
}

// ---------------------------------------------------------------- skeleton
const BONE: Tones = ['#f7f3e6', '#dcd4bf', '#a99f86', '#6e6656'];

/** 22×26 skeleton with glowing red eyes and a rusty sword. 2 walk frames. */
export function skeleton(): HTMLCanvasElement[] {
  const poses: [number, number][] = [[9, 13], [8, 14]];
  return poses.map(([bx, fx]) => {
    const p = new PixelCanvas(22, 26);
    const B = BONE;
    p.vline(bx, 19, 24, B[2]).px(bx, 21, B[1]).hline(bx - 1, bx + 1, 25, B[2]);
    p.vline(fx, 19, 24, B[1]).px(fx, 21, B[0]).hline(fx, fx + 2, 25, B[1]);
    p.rect(8, 17, 7, 2, B[1]).hline(8, 14, 17, B[0]).px(11, 18, '#2a2622');
    p.vline(7, 12, 17, B[2]).px(7, 18, B[3]);
    for (const y of [12, 14]) p.hline(8, 14, y, B[1]).px(8, y, B[2]).px(14, y, B[2]);
    p.hline(9, 13, 16, B[1]);
    for (let y = 11; y <= 17; y++) p.px(11, y, y % 2 ? B[0] : B[2]);
    // skull
    p.blob(12, 5, 5.5, 5, B);
    p.rect(11, 8, 6, 2, B[1]);
    for (let x = 11; x <= 16; x++) p.px(x, 9, x % 2 ? B[0] : B[3]);
    p.rect(13, 4, 2, 2, '#2a2622').px(14, 4, '#ff5a4a').px(13, 5, '#b8302a');
    p.rect(9, 4, 2, 2, '#2a2622').px(10, 4, '#d84838');
    p.px(16, 6, '#2a2622');
    // sword arm
    p.vline(15, 12, 17, B[1]);
    p.hline(15, 16, 18, B[0]);
    p.line(16, 17, 20, 8, '#9aa0aa');
    p.line(17, 17, 21, 8, '#5e646e');
    p.px(14, 17, '#7a5a3a').px(17, 19, '#7a5a3a');
    p.px(19, 11, '#a0582a').px(20, 9, '#a0582a');
    return p.outline().toCanvas();
  });
}

// ---------------------------------------------------------------- slime
const GOO: Tones = ['#b4f2ff', '#6ad0ea', '#3a9ccc', '#236e9a'];

/** 22×18 slime: glossy dome, big eyes, blush, tiny smile. */
export function slime(): HTMLCanvasElement[] {
  const p = new PixelCanvas(22, 18);
  p.blob(11, 10, 10, 8, GOO, (_x, y) => y <= 17);
  for (let x = 0; x < 22; x++) if (p.has(x, 17)) p.px(x, 17, GOO[3]);
  p.ellipse(6, 6, 2, 1.2, '#eafcff');
  p.px(9, 4, '#eafcff');
  p.rect(7, 9, 2, 3, '#12222c').rect(13, 9, 2, 3, '#12222c');
  p.px(7, 9, '#ffffff').px(13, 9, '#ffffff');
  p.hline(5, 6, 12, '#f59ab2').hline(15, 16, 12, '#f59ab2');
  p.px(10, 13, '#12222c').px(11, 14, '#12222c').px(12, 13, '#12222c');
  return [p.outline().toCanvas()];
}

// ---------------------------------------------------------------- scenery
const BARK: Tones = ['#9a6a40', '#74492a', '#50301a', '#36200f'];
const LEAF: Tones = ['#9ad860', '#62ae3e', '#3f8a30', '#2a6424'];
const LEAF_D: Tones = ['#62ae3e', '#3f8a30', '#2a6424', '#1c4a1c'];
const PINE: Tones = ['#7cc460', '#3f8f48', '#2a6a3a', '#1c4a2c'];

/** 32×48 round oak with layered leaf clusters. */
export function oak(): HTMLCanvasElement {
  const p = new PixelCanvas(32, 48);
  p.poly([[10, 47], [13, 42], [19, 42], [22, 47]], BARK[1]);
  p.rect(13, 26, 6, 19, BARK[1]).vline(13, 26, 44, BARK[0]).vline(18, 26, 44, BARK[2]);
  p.vline(15, 32, 36, BARK[2]).vline(16, 39, 43, BARK[2]).px(14, 30, BARK[2]);
  p.hline(10, 22, 47, BARK[3]);
  p.line(15, 30, 10, 24, BARK[1], 2);
  p.line(17, 29, 22, 23, BARK[1], 2);
  p.blob(16, 16, 14, 12, [LEAF[2], LEAF[2], LEAF[3], LEAF[3]]);
  p.blob(9, 23, 6, 4.5, LEAF_D);
  p.blob(23, 23, 6, 4.5, LEAF_D);
  p.blob(10, 16, 7, 6, LEAF);
  p.blob(22, 15, 7, 6, LEAF);
  p.blob(16, 9, 8, 6.5, LEAF);
  p.speckle(30, LEAF[3], 11, (_x, y) => y < 27);
  p.speckle(22, LEAF[0], 12, (x, y) => y < 19 && x < 21);
  return p.outline('auto', 0.35).toCanvas();
}

/** 32×48 stump left by a felled tree: roots, a short trunk and a ringed cut top. Same footprint as the oak. */
export function stump(): HTMLCanvasElement {
  const p = new PixelCanvas(32, 48);
  p.poly([[9, 47], [12, 41], [20, 41], [23, 47]], BARK[1]);
  p.rect(12, 38, 8, 7, BARK[1]).vline(12, 38, 45, BARK[0]).vline(19, 38, 45, BARK[2]);
  p.vline(15, 40, 45, BARK[2]).px(17, 42, BARK[2]).px(10, 46, BARK[0]).px(22, 46, BARK[2]);
  p.hline(9, 23, 47, BARK[3]);
  // the cut: pale wood with growth rings and a darker heart
  p.ellipse(16, 38, 4.5, 2, '#e8c890');
  p.ellipse(16, 38, 2.6, 1.2, '#c8a068');
  p.px(16, 38, '#a87848').px(13, 37, '#f4dca8');
  return p.outline('auto', 0.35).toCanvas();
}

/** 32×48 pine: three stacked tiers, lit on the left. */
export function pine(): HTMLCanvasElement {
  const p = new PixelCanvas(32, 48);
  p.rect(14, 36, 4, 11, BARK[1]).vline(14, 36, 46, BARK[0]).vline(17, 36, 46, BARK[2]);
  const tiers: [number, number, number][] = [
    [18, 38, 13],
    [10, 28, 11],
    [2, 18, 8],
  ];
  for (const [top, bottom, half] of tiers) {
    p.poly([[16, top], [16 - half - 0.5, bottom], [16 + half + 0.5, bottom]], PINE[1]);
    p.poly([[16, top], [16, bottom], [16 + half + 0.5, bottom]], PINE[2]);
    p.line(16, top, 16 - half, bottom - 1, PINE[0]);
    p.hline(16 - half, 16 + half, bottom - 1, PINE[3]);
  }
  p.speckle(18, PINE[0], 21, x => x < 16);
  p.speckle(18, PINE[3], 22, x => x > 16);
  return p.outline('auto', 0.35).toCanvas();
}

const STONE: Tones = ['#d4d8de', '#a8aeb8', '#7a808c', '#555a64'];

/** 32×22 mossy boulder with a smaller stone in front. */
export function rock(): HTMLCanvasElement {
  const p = new PixelCanvas(32, 22);
  const flat = (_x: number, y: number) => y <= 20;
  p.blob(14, 13, 12, 8, STONE, flat);
  p.blob(25, 16, 6, 5, STONE, flat);
  p.line(12, 8, 15, 12, STONE[3]).line(15, 12, 14, 15, STONE[3]);
  p.ellipse(9, 7, 3.5, 1.5, '#6aa048', (x, y) => p.has(x, y));
  p.speckle(6, '#8cc460', 5, (x, y) => y < 9 && x < 14);
  for (let x = 0; x < 32; x++) if (p.has(x, 20)) p.px(x, 20, STONE[3]);
  return p.outline('auto', 0.4).toCanvas();
}

/** A mined-out rock: a low heap of broken stones on the same 32×22 footprint as the boulder. */
export function rubble(): HTMLCanvasElement {
  const p = new PixelCanvas(32, 22);
  const flat = (_x: number, y: number) => y <= 20;
  p.blob(10, 18, 5, 3, STONE, flat);
  p.blob(19, 18.5, 4.5, 2.5, STONE, flat);
  p.blob(14.5, 16, 3.5, 2.4, STONE, flat);
  p.blob(25, 19, 2.5, 1.8, STONE, flat);
  p.px(5, 20, STONE[2]).px(28, 20, STONE[3]).px(16, 20, STONE[3]);
  for (let x = 0; x < 32; x++) if (p.has(x, 20)) p.px(x, 20, STONE[3]);
  return p.outline('auto', 0.4).toCanvas();
}

// ---------------------------------------------------------------- iso ground (64×32 diamonds)
function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function inDiamond(x: number, y: number, inset = 0): boolean {
  return Math.abs(x + 0.5 - 32) / (32 - inset * 2) + Math.abs(y + 0.5 - 16) / (16 - inset) <= 1;
}

function isoCanvas(paint: (c: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 32;
  const c = cv.getContext('2d')!;
  paint(c);
  // soft seam along the lower edges, like the classic tiles
  c.fillStyle = 'rgba(0,0,0,.14)';
  for (let x = 0; x < 64; x++) {
    const y = Math.floor(16 + (x < 32 ? x : 63 - x) / 2);
    if (inDiamond(x, y)) c.fillRect(x, y, 1, 1);
  }
  return cv;
}

function mottle(c: CanvasRenderingContext2D, tones: string[], seed: number, weights: number[]): void {
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 64; x++) {
      if (!inDiamond(x, y)) continue;
      // two octaves of hashed noise → patchy, not salt-and-pepper
      const n = hash(x >> 2, y >> 1, seed) * 0.6 + hash(x, y, seed + 7) * 0.4;
      let acc = 0;
      let i = 0;
      for (; i < weights.length - 1; i++) {
        acc += weights[i];
        if (n < acc) break;
      }
      c.fillStyle = tones[i];
      c.fillRect(x, y, 1, 1);
    }
}

export function isoGrass(v: number): HTMLCanvasElement {
  return isoCanvas(c => {
    mottle(c, ['#4e9038', '#5aa042', '#63aa48', '#6fb650'], 10 + v, [0.22, 0.4, 0.26, 0.12]);
    // grass tufts: a dark root with two light blades
    for (let i = 0; i < 9 + v * 2; i++) {
      const x = 6 + Math.floor(hash(i, v, 3) * 52);
      const y = 4 + Math.floor(hash(v, i, 4) * 24);
      if (!inDiamond(x, y, 2)) continue;
      c.fillStyle = '#3f7a2e';
      c.fillRect(x, y, 1, 1);
      c.fillStyle = '#86c85e';
      c.fillRect(x - 1, y - 1, 1, 1);
      c.fillRect(x + 1, y - 1, 1, 1);
      if (hash(x, y, 5) < 0.5) c.fillRect(x, y - 2, 1, 1);
    }
  });
}

export function isoDirt(v: number): HTMLCanvasElement {
  return isoCanvas(c => {
    mottle(c, ['#8a6a44', '#9a7a50', '#a8845a', '#b8946a'], 30 + v, [0.15, 0.3, 0.38, 0.17]);
    for (let i = 0; i < 7; i++) {
      const x = 6 + Math.floor(hash(i, v, 8) * 52);
      const y = 4 + Math.floor(hash(v, i, 9) * 24);
      if (!inDiamond(x, y, 2)) continue;
      c.fillStyle = '#c8aa80';
      c.fillRect(x, y, 2, 1);
      c.fillStyle = '#6e5234';
      c.fillRect(x, y + 1, 2, 1);
    }
  });
}

export function isoFlowers(): HTMLCanvasElement {
  const base = isoGrass(1);
  const c = base.getContext('2d')!;
  const petals = ['#f06a5a', '#f7d154', '#f4f1e6', '#d68bf0', '#6ab0f0'];
  for (let i = 0; i < 6; i++) {
    const x = 8 + Math.floor(hash(i, 2, 11) * 48);
    const y = 5 + Math.floor(hash(2, i, 12) * 22);
    if (!inDiamond(x, y, 3)) continue;
    c.fillStyle = '#3f7a2e';
    c.fillRect(x, y + 1, 1, 2);
    c.fillStyle = petals[i % petals.length];
    c.fillRect(x - 1, y, 1, 1);
    c.fillRect(x + 1, y, 1, 1);
    c.fillRect(x, y - 1, 1, 1);
    c.fillRect(x, y + 1, 1, 1);
    c.fillStyle = '#ffe45a';
    c.fillRect(x, y, 1, 1);
  }
  return base;
}

export function isoWater(frame: number): HTMLCanvasElement {
  return isoCanvas(c => {
    mottle(c, ['#2f6fb8', '#3a7cc8', '#4288d2'], 50, [0.3, 0.5, 0.2]);
    for (let i = 0; i < 6; i++) {
      const x = 6 + ((i * 17 + frame * 9) % 46);
      const y = 5 + ((i * 7 + frame * 3) % 22);
      if (!inDiamond(x, y, 2)) continue;
      c.fillStyle = '#7fb6ee';
      c.fillRect(x, y, 6, 1);
      c.fillStyle = '#5b98db';
      c.fillRect(x + 2, y + 1, 4, 1);
    }
    c.fillStyle = '#e0f0ff';
    c.fillRect(20 + frame * 14, 10 + frame * 6, 1, 1);
  });
}

export function isoFloor(v: number): HTMLCanvasElement {
  return isoCanvas(c => {
    mottle(c, ['#687180', '#727b8a', '#7c8594'], 70 + v, [0.3, 0.45, 0.25]);
    c.fillStyle = '#545c6a';
    // slab joints along both iso axes
    for (let x = 0; x < 64; x++) {
      const y1 = Math.round(8 + x / 2 - (v ? 8 : 0));
      const y2 = Math.round(24 - x / 2 + (v ? 0 : 0));
      if (inDiamond(x, y1, 1)) c.fillRect(x, y1, 1, 1);
      if (inDiamond(x, y2, 1)) c.fillRect(x, y2, 1, 1);
    }
    c.fillStyle = '#8e97a6';
    for (let i = 0; i < 5; i++) {
      const x = 10 + Math.floor(hash(i, v, 13) * 44);
      const y = 6 + Math.floor(hash(v, i, 14) * 20);
      if (inDiamond(x, y, 2)) c.fillRect(x, y, 2, 1);
    }
  });
}

export function isoGate(): HTMLCanvasElement {
  return isoCanvas(c => mottle(c, ['#2e333e', '#383e4a', '#424956'], 90, [0.3, 0.45, 0.25]));
}
