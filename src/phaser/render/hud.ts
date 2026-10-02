import Phaser from 'phaser';
import { Colors, Fonts, hex, PIXEL_SCALE } from '../config';

export type Graphics = Phaser.GameObjects.Graphics;
export type Text = Phaser.GameObjects.Text;

/** Crisp pixel-font text with a 1px drop shadow. */
export function makeText(scene: Phaser.Scene, x: number, y: number, str: string, font: 'display' | 'body', size: number, color: string): Text {
  return scene.add
    .text(x, y, str, { fontFamily: Fonts[font], fontSize: size + 'px', color })
    .setResolution(PIXEL_SCALE)
    .setShadow(0, 1, '#000', 0, false, true);
}

/** Framed status bar. */
export function drawBar(g: Graphics, x: number, y: number, w: number, h: number, frac: number, col: string): void {
  g.fillStyle(0x000000, 0.6).fillRect(x, y, w, h);
  g.lineStyle(1, hex(Colors.line2), 1).strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
  g.lineStyle(2, hex('#0a0d14'), 1).strokeRect(x, y, w, h);
  g.fillStyle(hex(col), 1).fillRect(x + 2, y + 2, Math.max(0, (w - 4) * Math.min(1, frac)), h - 4);
}

/** Pie slice from 12 o'clock, clockwise. */
export function drawPie(g: Graphics, cx: number, cy: number, r: number, frac: number, col: number, alpha: number): void {
  if (frac <= 0) return;
  g.fillStyle(col, alpha);
  g.beginPath();
  g.moveTo(cx, cy);
  g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, frac), false);
  g.closePath();
  g.fillPath();
}

/** Cooldown sweep clipped to a square slot: the dark part is what's still on cooldown. */
export function drawSquareSweep(g: Graphics, x: number, y: number, size: number, frac: number, alpha: number): void {
  if (frac <= 0) return;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const half = size / 2;
  const a0 = -Math.PI / 2;
  const a1 = a0 + Math.PI * 2 * Math.min(1, frac);
  // walk the ray from the centre to the square's edge for each sample angle
  const edge = (a: number) => {
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const t = half / Math.max(Math.abs(c), Math.abs(sn));
    return new Phaser.Math.Vector2(cx + c * t, cy + sn * t);
  };
  const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(cx, cy)];
  const steps = Math.max(2, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 48));
  for (let i = 0; i <= steps; i++) pts.push(edge(a0 + ((a1 - a0) * i) / steps));
  // exact corners so the fill hugs the square
  for (let k = 0; k < 4; k++) {
    const ca = -Math.PI / 4 + (k * Math.PI) / 2;
    if (ca > a0 && ca < a1) pts.push(edge(ca));
  }
  pts.sort((p, q) => (p === pts[0] ? -1 : q === pts[0] ? 1 : angleFrom(cx, cy, p, a0) - angleFrom(cx, cy, q, a0)));
  g.fillStyle(0x000000, alpha);
  g.fillPoints(pts, true);
}

function angleFrom(cx: number, cy: number, p: Phaser.Math.Vector2, a0: number): number {
  let a = Math.atan2(p.y - cy, p.x - cx) - a0;
  while (a < -1e-6) a += Math.PI * 2;
  return a;
}
