import { PixelCanvas } from './pixelPainter';
import type { Tones } from './pixelPainter';
import type { TreeKind } from '../../data/trees';

/**
 * The trees of the Weepwood (data/trees.ts), painted like the forest's oak (hdSprites.oak) on
 * the same footprint, trunk foot at the bottom centre: the black weeping willow, its bark gone
 * black and its fronds ending in thorns; the half-green willow at the edge of the wood; and the
 * old black oaks of the King's Chase. Each has a stump of its own for when it is felled. HD
 * colours; the game recolours them like every tree.
 */

const BARK: Tones = ['#9a6a40', '#74492a', '#50301a', '#36200f'];
const BLACK_BARK: Tones = ['#5a5462', '#3a3442', '#262230', '#16131c'];
const WILLOW: Tones = ['#b8e070', '#86c050', '#5a9a3a', '#3a7a2c'];
// the black willow's fronds: charcoal and plum, a sickly green going out of them
const BLACK_FROND: Tones = ['#6a6a5a', '#4a4650', '#34303c', '#221e28'];
const THORN = '#d8d0c0';
const BLACK_LEAF: Tones = ['#5e6a48', '#3e4836', '#2a3028', '#1a1e1a'];

/** Hanging fronds from a crown's rim: `tones` cycled, thorns pricking out of the dark ones. */
function fronds(
  p: PixelCanvas,
  cx: number,
  rim: number,
  half: number,
  n: number,
  len: number,
  pick: (i: number) => Tones,
  thorns: boolean,
  bottom: number
): void {
  for (let i = 0; i < n; i++) {
    const x0 = cx - half + (i * 2 * half) / (n - 1);
    const t = (x0 - cx) / half;
    const top = rim + Math.round(4 * (1 - t * t));
    const l = len + ((i * 37) % 7) - Math.round(6 * Math.abs(t));
    const tones = pick(i);
    const c = tones[i % 3];
    for (let y = top; y < Math.min(bottom, top + l); y++) {
      const x = Math.round(x0 + Math.sin(y / 6 + i) * 0.8 + (y - top) * t * 0.1);
      p.px(x, y, (y - top) % 5 === 0 ? tones[3] : c);
      if (thorns && (y - top) % 6 === 3) p.px(x + (i % 2 ? 1 : -1), y, THORN);
    }
  }
}

/** 36×52: a black weeping willow, thorned. */
export function blackWillow(): HTMLCanvasElement {
  const p = new PixelCanvas(36, 52);
  p.poly([[11, 51], [14, 45], [22, 45], [25, 51]], BLACK_BARK[1]);
  p.hline(9, 27, 51, BLACK_BARK[3]);
  p.rect(15, 24, 6, 23, BLACK_BARK[1]).vline(15, 24, 46, BLACK_BARK[0]).vline(20, 24, 46, BLACK_BARK[2]);
  p.vline(17, 30, 38, BLACK_BARK[2]).px(16, 41, BLACK_BARK[3]);
  p.line(16, 27, 9, 19, BLACK_BARK[1], 2);
  p.line(19, 27, 27, 18, BLACK_BARK[2], 2);
  p.blob(18, 14, 15, 10, [BLACK_FROND[2], BLACK_FROND[2], BLACK_FROND[3], BLACK_FROND[3]]);
  p.blob(11, 13, 7, 6, BLACK_FROND);
  p.blob(25, 12, 7, 6, BLACK_FROND);
  p.blob(18, 7, 8, 5, BLACK_FROND);
  fronds(p, 18, 16, 15, 14, 22, () => BLACK_FROND, true, 49);
  p.speckle(26, BLACK_FROND[3], 61, (_x, y) => y < 22);
  p.speckle(14, '#7a7a62', 62, (x, y) => y < 14 && x < 20);
  p.speckle(10, THORN, 63, (_x, y) => y > 8 && y < 22);
  return p.outline('auto', 0.35).toCanvas();
}

/** 36×52: a willow at the edge of the wood, still half green, the black coming into it. */
export function halfWillow(): HTMLCanvasElement {
  const p = new PixelCanvas(36, 52);
  p.poly([[11, 51], [14, 45], [22, 45], [25, 51]], BARK[1]);
  p.hline(9, 27, 51, BARK[3]);
  p.rect(15, 24, 6, 23, BARK[1]).vline(15, 24, 46, BARK[0]).vline(20, 24, 46, BLACK_BARK[2]);
  p.vline(17, 30, 40, BLACK_BARK[1]).px(16, 34, BLACK_BARK[2]);
  p.line(16, 27, 9, 19, BARK[1], 2);
  p.line(19, 27, 27, 18, BLACK_BARK[1], 2);
  p.blob(18, 14, 15, 10, [WILLOW[2], WILLOW[2], WILLOW[3], WILLOW[3]]);
  p.blob(11, 13, 7, 6, WILLOW);
  p.blob(25, 12, 7, 6, BLACK_FROND);
  p.blob(18, 7, 8, 5, WILLOW);
  // green fronds on the lit side, black ones creeping in from the right
  fronds(p, 18, 16, 15, 14, 21, i => (i > 8 || i % 4 === 2 ? BLACK_FROND : WILLOW), false, 49);
  p.speckle(24, WILLOW[3], 64, (_x, y) => y < 22);
  p.speckle(18, WILLOW[0], 65, (x, y) => y < 14 && x < 18);
  p.speckle(6, THORN, 66, (x, y) => x > 20 && y > 10 && y < 30);
  return p.outline('auto', 0.35).toCanvas();
}

/** 36×52: an old oak of the King's Chase gone black: gnarled boughs, a thin dark crown. */
export function blackOak(): HTMLCanvasElement {
  const p = new PixelCanvas(36, 52);
  p.poly([[10, 51], [14, 44], [22, 44], [26, 51]], BLACK_BARK[1]);
  p.line(13, 49, 7, 51, BLACK_BARK[1], 2);
  p.line(23, 49, 29, 51, BLACK_BARK[2], 2);
  p.hline(7, 29, 51, BLACK_BARK[3]);
  p.rect(14, 26, 8, 20, BLACK_BARK[1]).vline(14, 26, 45, BLACK_BARK[0]).vline(21, 26, 45, BLACK_BARK[2]);
  for (const [x, y0, y1] of [[16, 30, 38], [19, 34, 44], [17, 40, 46]] as const) p.vline(x, y0, y1, BLACK_BARK[2]);
  // gnarled boughs reaching past the crown
  p.line(15, 29, 6, 20, BLACK_BARK[1], 2).line(6, 20, 3, 13, BLACK_BARK[1]);
  p.line(20, 28, 30, 19, BLACK_BARK[2], 2).line(30, 19, 33, 12, BLACK_BARK[2]);
  p.line(18, 27, 18, 12, BLACK_BARK[1], 2);
  p.blob(18, 16, 14, 10, [BLACK_LEAF[2], BLACK_LEAF[2], BLACK_LEAF[3], BLACK_LEAF[3]]);
  p.blob(10, 17, 7, 5, BLACK_LEAF);
  p.blob(26, 16, 7, 5, BLACK_LEAF);
  p.blob(18, 9, 8, 5.5, BLACK_LEAF);
  // bare twigs out of the crown
  p.line(5, 12, 2, 8, BLACK_BARK[1]).line(31, 11, 34, 6, BLACK_BARK[2]).line(18, 5, 19, 1, BLACK_BARK[1]);
  p.speckle(22, BLACK_LEAF[3], 67, (_x, y) => y < 25);
  p.speckle(14, BLACK_LEAF[0], 68, (x, y) => y < 16 && x < 20);
  return p.outline('auto', 0.35).toCanvas();
}

/** A stump on the trees' footprint (36×52): `bark` tones, and the cut's colours. */
function stumpOf(bark: Tones, cut: [string, string, string, string]): HTMLCanvasElement {
  const p = new PixelCanvas(36, 52);
  p.poly([[11, 51], [14, 45], [22, 45], [25, 51]], bark[1]);
  p.rect(14, 42, 8, 7, bark[1]).vline(14, 42, 49, bark[0]).vline(21, 42, 49, bark[2]);
  p.vline(17, 44, 49, bark[2]).px(19, 46, bark[2]);
  p.hline(11, 25, 51, bark[3]);
  p.ellipse(18, 42, 4.5, 2, cut[0]);
  p.ellipse(18, 42, 2.6, 1.2, cut[1]);
  p.px(18, 42, cut[2]).px(15, 41, cut[3]);
  return p.outline('auto', 0.35).toCanvas();
}

/** The tree of each kind (the plain oak is hdSprites.oak). */
export const WOOD_TREES: Record<Exclude<TreeKind, 'oak'>, () => HTMLCanvasElement> = {
  blackwillow: blackWillow,
  willow: halfWillow,
  blackoak: blackOak,
};

/** And the stump each leaves: black willow cuts cold and blue-grey, hard as horn. */
export const WOOD_STUMPS: Record<Exclude<TreeKind, 'oak'>, () => HTMLCanvasElement> = {
  blackwillow: () => stumpOf(BLACK_BARK, ['#a8b4c4', '#7c8a9c', '#4e5a6a', '#d8e0ea']),
  willow: () => stumpOf(BARK, ['#e8c890', '#c8a068', '#a87848', '#f4dca8']),
  blackoak: () => stumpOf(BLACK_BARK, ['#c8b08a', '#9a8062', '#6a5440', '#e0ccaa']),
};
