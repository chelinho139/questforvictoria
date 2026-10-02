import { PixelCanvas } from './pixelPainter';
import type { Tones } from './pixelPainter';

/**
 * The two trees of the story on the shores of Lake Ellory, painted like the forest's oaks
 * (hdSprites.oak) but much older and bigger: the hollow oak where Marcian and Victoria left
 * notes and feathers, and Marcian's willow on the north shore. HD colours; the game
 * recolours them like every tree. Drawn with the trunk's foot at the bottom centre.
 */

const BARK: Tones = ['#9a6a40', '#74492a', '#50301a', '#36200f'];
const LEAF: Tones = ['#9ad860', '#62ae3e', '#3f8a30', '#2a6424'];
const LEAF_D: Tones = ['#62ae3e', '#3f8a30', '#2a6424', '#1c4a1c'];
const WILLOW: Tones = ['#b8e070', '#86c050', '#5a9a3a', '#3a7a2c'];

/** 80×104: a broad old oak, its trunk split by a dark hollow, roots gripping the bank. */
export function hollowOak(): HTMLCanvasElement {
  const p = new PixelCanvas(80, 104);
  // roots
  p.poly([[22, 103], [30, 92], [50, 92], [58, 103]], BARK[1]);
  p.line(30, 98, 18, 103, BARK[1], 3);
  p.line(50, 98, 62, 103, BARK[2], 3);
  p.line(36, 100, 30, 103, BARK[2], 2);
  p.hline(16, 64, 103, BARK[3]);
  // the trunk: thick, lit on the left, furrowed
  p.rect(30, 52, 20, 44, BARK[1]);
  p.rect(30, 52, 3, 44, BARK[0]);
  p.rect(46, 52, 4, 44, BARK[2]);
  for (const [x, y0, y1] of [[35, 56, 70], [41, 60, 76], [38, 80, 92], [44, 70, 84], [33, 74, 86]] as const) p.vline(x, y0, y1, BARK[2]);
  // the hollow, a feather tucked inside it
  p.ellipse(39, 76, 4.5, 7, BARK[3]);
  p.ellipse(39, 77, 3.2, 5.6, '#1a0f08');
  p.line(38, 74, 40, 80, '#e8e4d8', 1).px(41, 81, '#b8b4a8');
  // boughs into the crown
  p.line(34, 56, 18, 42, BARK[1], 4);
  p.line(46, 55, 62, 40, BARK[2], 4);
  p.line(40, 54, 40, 36, BARK[1], 4);
  // the crown: big layered clusters, darker below
  p.blob(40, 32, 34, 26, [LEAF[2], LEAF[2], LEAF[3], LEAF[3]]);
  p.blob(16, 46, 13, 9, LEAF_D);
  p.blob(64, 45, 13, 9, LEAF_D);
  p.blob(40, 50, 14, 8, LEAF_D);
  p.blob(20, 32, 14, 12, LEAF);
  p.blob(60, 30, 14, 12, LEAF);
  p.blob(40, 18, 17, 13, LEAF);
  p.blob(28, 12, 10, 8, LEAF);
  p.blob(54, 14, 10, 8, LEAF);
  p.speckle(110, LEAF[3], 41, (_x, y) => y < 56);
  p.speckle(80, LEAF[0], 42, (x, y) => y < 36 && x < 50);
  return p.outline('auto', 0.35).toCanvas();
}

/** 76×98: a weeping willow, a soft crown and long fronds trailing almost to the ground. */
export function willow(): HTMLCanvasElement {
  const p = new PixelCanvas(76, 98);
  // trunk and roots
  p.poly([[28, 97], [33, 88], [43, 88], [48, 97]], BARK[1]);
  p.hline(24, 52, 97, BARK[3]);
  p.rect(33, 40, 10, 50, BARK[1]);
  p.vline(33, 40, 89, BARK[0]).vline(42, 40, 89, BARK[2]).vline(37, 52, 70, BARK[2]);
  p.line(36, 44, 24, 30, BARK[1], 3);
  p.line(40, 44, 52, 30, BARK[2], 3);
  // the crown
  p.blob(38, 24, 30, 18, [WILLOW[2], WILLOW[2], WILLOW[3], WILLOW[3]]);
  p.blob(24, 22, 13, 10, WILLOW);
  p.blob(52, 21, 13, 10, WILLOW);
  p.blob(38, 13, 15, 10, WILLOW);
  // fronds: strands hanging from the rim of the crown, swaying, gaps between them
  for (let i = 0; i < 26; i++) {
    const x0 = 9 + i * 2.3;
    const t = (x0 - 38) / 30; // -1 .. 1 across the crown
    const top = 30 + Math.round(10 * (1 - t * t));
    const len = 34 + Math.round(((i * 37) % 11) * 2.2) + Math.round(16 * (1 - Math.abs(t)));
    const c = i % 3 === 0 ? WILLOW[0] : i % 3 === 1 ? WILLOW[1] : WILLOW[2];
    for (let y = top; y < Math.min(95, top + len); y++) {
      const x = Math.round(x0 + Math.sin(y / 9 + i) * 1.2 + (y - top) * t * 0.12);
      p.px(x, y, (y - top) % 7 === 0 ? WILLOW[3] : c);
      if (i % 2 === 0 && y < top + len - 6) p.px(x + 1, y, WILLOW[3]);
    }
  }
  p.speckle(60, WILLOW[3], 51, (_x, y) => y < 40);
  p.speckle(50, WILLOW[0], 52, (x, y) => y < 28 && x < 48);
  return p.outline('auto', 0.35).toCanvas();
}
