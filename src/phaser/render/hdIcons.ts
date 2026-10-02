import { PixelCanvas } from './pixelPainter';
import { skullIcon } from './uiIcons';
import { SKILL_ICONS } from './skillIcons';

/**
 * Action icons, 20×20 (22×22 with the outline). The skills are hand-placed pixel art from
 * tools/heroes/skillicons.py (skillIcons.ts); Execute is the skull; the crosshair and Rev
 * are drawn here. Keys match the skill/action keys in data/skills.ts.
 */

const GOLD = ['#fff0a0', '#f2c14e', '#b8801e'];
const RED = ['#ff9a8a', '#e0403a', '#9a1e1e'];

type Painter = (p: PixelCanvas) => void;

function make(paint: Painter, k = 0.3): HTMLCanvasElement {
  const p = new PixelCanvas(20, 20);
  paint(p);
  return p.outline('auto', k).toCanvas();
}

/** Pixels of an annulus (r0..r1) around (cx,cy), optionally limited to an angle range. */
function ring(p: PixelCanvas, cx: number, cy: number, r0: number, r1: number, color: (x: number, y: number, a: number) => string | null, a0 = -Math.PI, a1 = Math.PI): void {
  for (let y = Math.floor(cy - r1 - 1); y <= Math.ceil(cy + r1 + 1); y++)
    for (let x = Math.floor(cx - r1 - 1); x <= Math.ceil(cx + r1 + 1); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      if (d < r0 || d > r1 || a < a0 || a > a1) continue;
      const c = color(x, y, a);
      if (c) p.px(x, y, c);
    }
}

export const HD_ICONS: Record<string, () => HTMLCanvasElement> = {
  ...SKILL_ICONS,
  execute: () => skullIcon(),

  // crosshair
  target: () =>
    make(p => {
      ring(p, 10, 10, 5.4, 7.4, (x, y) => (x + y < 18 ? RED[0] : x + y > 22 ? RED[2] : RED[1]));
      for (const [x, y, w, h] of [[9, 0, 2, 5], [9, 15, 2, 5], [0, 9, 5, 2], [15, 9, 5, 2]] as [number, number, number, number][]) {
        p.rect(x, y, w, h, '#f4f1e6');
      }
      p.rect(9, 9, 2, 2, GOLD[1]).px(9, 9, GOLD[0]);
    }),

  // two thick gold arcs chasing each other clockwise around a circle
  rev: () =>
    make(p => {
      const cx = 10;
      const cy = 10;
      const r0 = 5.4;
      const r1 = 7.6;
      const col = (x: number, y: number) => (x + y < 17 ? GOLD[0] : x + y > 23 ? GOLD[2] : GOLD[1]);
      const arcs: [number, number][] = [
        [-Math.PI + 0.35, -0.55],
        [0.35, Math.PI - 0.55],
      ];
      for (const [a0, a1] of arcs) {
        ring(p, cx, cy, r0, r1, col, a0, a1);
        // arrowhead at the clockwise end, pointing along the circle
        const rm = (r0 + r1) / 2;
        const ex = cx + rm * Math.cos(a1);
        const ey = cy + rm * Math.sin(a1);
        const tx = -Math.sin(a1);
        const ty = Math.cos(a1);
        const nx = Math.cos(a1);
        const ny = Math.sin(a1);
        p.poly(
          [
            [ex + tx * 3.4, ey + ty * 3.4],
            [ex + nx * 2.9, ey + ny * 2.9],
            [ex - nx * 2.9, ey - ny * 2.9],
          ],
          GOLD[1]
        );
      }
    }),
};
