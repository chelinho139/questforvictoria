import Phaser from 'phaser';
import type { DayCycle } from '../../sim/daylight';
import { phaseName } from '../../sim/daylight';
import { Rng } from '../../sim/rng';
import { Colors, hex } from '../config';
import { Tex } from './textures';
import { makeText } from './hud';
import type { Graphics, Text } from './hud';

/** Inner radius of the sky window, in logical pixels. */
export const DIAL_R = 26;
/** The horizon sits this far below the dial centre. */
const HORIZON = 3;
/** Radius of the sun/moon orbit. Small enough that both stay inside the window. */
const ORBIT = DIAL_R * 0.62;

/** Sky colour through the day (0 = midnight, 0.5 = noon). */
const SKY: [number, string][] = [
  [0.0, '#0b1233'],
  [0.2, '#141c45'],
  [0.24, '#4a3a6e'],
  [0.27, '#e08a5a'],
  [0.32, '#8ec4e8'],
  [0.5, '#6fb6ec'],
  [0.68, '#86c0e6'],
  [0.75, '#e7964f'],
  [0.8, '#b8543f'],
  [0.86, '#3a2a5c'],
  [0.93, '#101838'],
];
const SKY_RGB = SKY.map(([t, c]) => {
  const n = parseInt(c.slice(1), 16);
  return { t, r: n >> 16, g: (n >> 8) & 255, b: n & 255 };
});

function skyColor(t: number): number {
  const k = SKY_RGB;
  let a = k[k.length - 1];
  let b = k[0];
  let span = 1 - a.t + b.t;
  let local = t >= a.t ? t - a.t : 1 - a.t + t;
  for (let i = 0; i < k.length - 1; i++) {
    if (t >= k[i].t && t < k[i + 1].t) {
      a = k[i];
      b = k[i + 1];
      span = b.t - a.t;
      local = t - a.t;
      break;
    }
  }
  const f = span > 0 ? local / span : 0;
  return Phaser.Display.Color.GetColor(
    Math.round(a.r + (b.r - a.r) * f),
    Math.round(a.g + (b.g - a.g) * f),
    Math.round(a.b + (b.b - a.b) * f)
  );
}

/**
 * 1 at night, 0 in daylight, with short ramps at dawn and dusk. Time-based on purpose:
 * the lighting darkness is also high at sunrise (it tints gold), which would put stars
 * in an orange sky.
 */
function nightFactor(t: number): number {
  if (t < 0.2 || t >= 0.88) return 1;
  if (t < 0.26) return 1 - (t - 0.2) / 0.06;
  if (t < 0.8) return 0;
  return (t - 0.8) / 0.08;
}

function mix(c1: number, c2: number, f: number): number {
  const r = (c1 >> 16) + (((c2 >> 16) - (c1 >> 16)) * f);
  const g = ((c1 >> 8) & 255) + ((((c2 >> 8) & 255) - ((c1 >> 8) & 255)) * f);
  const b = (c1 & 255) + (((c2 & 255) - (c1 & 255)) * f);
  return Phaser.Display.Color.GetColor(Math.round(r), Math.round(g), Math.round(b));
}

/**
 * Video-game style time-of-day dial: a round sky window where the sun and moon arc
 * over pixel hills. The sky shifts from blue through sunset orange to a starry night,
 * and a label underneath names the part of the day.
 */
export class DayDial {
  cx = 0;
  cy = 0;
  private readonly sky: Graphics;
  private readonly front: Graphics;
  private readonly sun: Phaser.GameObjects.Image;
  private readonly moon: Phaser.GameObjects.Image;
  private readonly label: Text;
  private readonly stars: [number, number, number][] = [];

  constructor(scene: Phaser.Scene, depth: number, opts: { labelColor?: string } = {}) {
    this.sky = scene.add.graphics().setDepth(depth);
    this.sun = scene.add.image(0, 0, Tex.sun).setDepth(depth + 1);
    this.moon = scene.add.image(0, 0, Tex.moon).setDepth(depth + 1);
    this.front = scene.add.graphics().setDepth(depth + 2);
    this.label = makeText(scene, 0, 0, '', 'display', 8, opts.labelColor ?? Colors.gold).setOrigin(0.5, 0).setDepth(depth + 3);
    if (opts.labelColor) this.label.setShadow(0, 0, '#000', 0, false, false);
    // fixed star field in the upper half of the window; third value is a twinkle phase
    const rng = new Rng(4711);
    while (this.stars.length < 14) {
      const x = Math.round((rng.next() * 2 - 1) * (DIAL_R - 4));
      const y = Math.round(-rng.next() * (DIAL_R - 4));
      if (Math.hypot(x, y) < DIAL_R - 3 && y < -2) this.stars.push([x, y, rng.next() * Math.PI * 2]);
    }
  }

  setPosition(cx: number, cy: number): void {
    this.cx = Math.round(cx);
    this.cy = Math.round(cy);
    this.label.setPosition(this.cx, this.cy + DIAL_R + 8);
  }

  /** Put the "MORNING · DAY 1" label somewhere else (e.g. inside an info box). */
  placeLabel(x: number, y: number): void {
    this.label.setPosition(Math.round(x), Math.round(y));
  }

  /** Bottom edge of the dial including its label, for laying out what goes below. */
  get bottom(): number {
    return this.cy + DIAL_R + 8 + 12;
  }

  contains(p: { x: number; y: number }): boolean {
    return Math.hypot(p.x - this.cx, p.y - this.cy) <= DIAL_R + 6;
  }

  update(day: DayCycle, now: number): void {
    const t = day.t;
    const { cx, cy } = this;
    const R = DIAL_R;
    const hy = cy + HORIZON;
    const night = nightFactor(t);

    // sky, stars, sun glow
    const g = this.sky;
    g.clear();
    g.fillStyle(skyColor(t), 1).fillCircle(cx, cy, R);
    if (night > 0) {
      for (const [sx, sy, ph] of this.stars) {
        const tw = 0.55 + 0.45 * Math.sin(now / 420 + ph);
        g.fillStyle(0xffffff, night * tw).fillRect(cx + sx, cy + sy, 1, 1);
      }
    }
    const th = (t - 0.5) * Math.PI * 2;
    const sunX = Math.round(cx + ORBIT * Math.sin(th));
    const sunY = Math.round(hy - ORBIT * Math.cos(th));
    const moonX = Math.round(cx - ORBIT * Math.sin(th));
    const moonY = Math.round(hy + ORBIT * Math.cos(th));
    g.fillStyle(0xfff3b0, 0.22).fillCircle(sunX, sunY, 9);
    g.fillStyle(0xe8ecf5, 0.12 * night).fillCircle(moonX, moonY, 8);
    this.sun.setPosition(sunX, sunY);
    this.moon.setPosition(moonX, moonY);

    // ground: two rows of hills in front of the sun/moon, hiding them below the horizon
    const f = this.front;
    f.clear();
    const back = mix(0x2c5a31, 0x0e1c18, night);
    const fore = mix(0x3f7a3a, 0x12241a, night);
    this.hills(f, cx, hy - 1, R, back, (x: number) => 4 + 2.5 * Math.sin(x * 0.28 + 1.2));
    this.hills(f, cx, hy + 2, R, fore, (x: number) => 2 + 1.5 * Math.sin(x * 0.45 - 0.6));

    // frame: wooden bezel lit from the top-left, dark rims, four gold studs
    f.lineStyle(5, 0x8a4a1e, 1).strokeCircle(cx, cy, R + 2.5);
    f.lineStyle(2, 0xc07a3a, 1);
    f.beginPath();
    f.arc(cx, cy, R + 3, Math.PI * 0.95, Math.PI * 1.7, false);
    f.strokePath();
    f.lineStyle(2, 0x5e2e10, 1);
    f.beginPath();
    f.arc(cx, cy, R + 2, Math.PI * -0.05, Math.PI * 0.7, false);
    f.strokePath();
    f.lineStyle(1, 0x2e1709, 1).strokeCircle(cx, cy, R + 5.5);
    f.lineStyle(1, 0x4a2410, 1).strokeCircle(cx, cy, R + 0.5);
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      const px = Math.round(cx + (R + 3) * Math.cos(a));
      const py = Math.round(cy + (R + 3) * Math.sin(a));
      f.fillStyle(0x2e1709, 1).fillRect(px - 2, py - 2, 4, 4);
      f.fillStyle(hex(Colors.gold), 1).fillRect(px - 1, py - 1, 2, 2);
    }
    // noon marker at the top of the bezel
    f.fillStyle(0x2e1709, 1).fillTriangle(cx - 4, cy - R - 8, cx + 4, cy - R - 8, cx, cy - R - 3);
    f.fillStyle(hex(Colors.gold), 1).fillTriangle(cx - 3, cy - R - 7, cx + 3, cy - R - 7, cx, cy - R - 4);

    this.label.setText(`${phaseName(t).toUpperCase()} · DAY ${day.day}`);
  }

  /**
   * Fill the part of the window below a hill line. `height(x)` is the hill height above
   * `baseY` at horizontal offset x; it tapers to zero at the window edge so the hill
   * meets the circle cleanly.
   */
  private hills(g: Graphics, cx: number, baseY: number, R: number, color: number, height: (x: number) => number): void {
    const dy = baseY - this.cy;
    const xr = Math.sqrt(Math.max(0, R * R - dy * dy));
    const pts: Phaser.Math.Vector2[] = [];
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const x = -xr + (2 * xr * i) / N;
      const taper = 1 - (x / xr) ** 2;
      pts.push(new Phaser.Math.Vector2(cx + x, baseY - height(x) * taper));
    }
    // back along the bottom of the circle, right to left
    const a0 = Math.asin(Math.max(-1, Math.min(1, dy / R)));
    for (let i = 0; i <= N; i++) {
      const a = a0 + ((Math.PI - 2 * a0) * i) / N;
      pts.push(new Phaser.Math.Vector2(cx + R * Math.cos(a), this.cy + R * Math.sin(a)));
    }
    g.fillStyle(color, 1).fillPoints(pts, true);
  }

  destroy(): void {
    this.sky.destroy();
    this.front.destroy();
    this.sun.destroy();
    this.moon.destroy();
    this.label.destroy();
  }
}
