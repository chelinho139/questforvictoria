import { BufferAttribute, BufferGeometry, Color, LineBasicMaterial, LineSegments } from 'three';
import type { Scene, Vector3 } from 'three';
import { boltLines } from '../render/WeatherFx';

/** The most drops and splashes drawn at once. */
const MAX_DROPS = 2400;
const MAX_SPLASHES = 600;
/** How high drops start (world units) and how fast they fall (units a second). */
const FALL_H = 260;
const FALL_V = 320;
/** Line segments for the bolts (a couple at once, forks included). */
const MAX_BOLT_SEGS = 96;
/** The 2D bolt shape is this many px tall; a 3D bolt is stretched to its own height. */
const BOLT_SHAPE_H = 300;

export interface RainView {
  /** The middle of the ground the rain covers (world px), and how far it reaches round it. */
  cx: number;
  cz: number;
  reach: number;
  /** Drops per 10 000 square units of ground at full rain. */
  density: number;
  rain: number;
  storm: number;
  wind: number;
  /** The camera's right, flat on the ground (splashes open across the screen). */
  right: Vector3;
  /** The rain's colour after the darkness of the hour. */
  col: Color;
}

/** A bolt in the world: where it strikes, how tall it is, which way is across the screen, its shape. */
export interface Bolt3D {
  x: number;
  z: number;
  height: number;
  right: Vector3;
  seed: number;
  /** World units to a screen pixel there (the glow is a pixel either side of the core). */
  px: number;
}

/**
 * Rain in the 3D views: streaks falling through a box of air round what the camera looks at
 * (drops that leave it come back in on the far side, so walking never empties the sky), a
 * little crown where each lands, and lightning bolts, all as one-pixel lines.
 */
export class Rain3D {
  private readonly drops = new Float32Array(MAX_DROPS * 4);
  private readonly splashes = new Float32Array(MAX_SPLASHES * 3);
  private nSplash = 0;
  private live = 0;
  private readonly dropPos = new Float32Array(MAX_DROPS * 6);
  private readonly splashPos = new Float32Array(MAX_SPLASHES * 12);
  private readonly boltPos = new Float32Array(MAX_BOLT_SEGS * 6);
  private readonly glowPos = new Float32Array(MAX_BOLT_SEGS * 12);
  private readonly dropGeo = new BufferGeometry();
  private readonly splashGeo = new BufferGeometry();
  private readonly boltGeo = new BufferGeometry();
  private readonly glowGeo = new BufferGeometry();
  private readonly dropMat = new LineBasicMaterial({ transparent: true, depthWrite: false });
  private readonly splashMat = new LineBasicMaterial({ transparent: true, depthWrite: false });
  private readonly boltMat = new LineBasicMaterial({ color: 0xffffff });
  private readonly glowMat = new LineBasicMaterial({ color: 0xb8ccff, transparent: true, opacity: 0.55, depthWrite: false });
  private readonly dropLines: LineSegments;
  private readonly splashLines: LineSegments;
  private readonly boltLines: LineSegments;
  private readonly glowLines: LineSegments;

  constructor(private readonly scene: Scene) {
    this.dropGeo.setAttribute('position', new BufferAttribute(this.dropPos, 3));
    this.splashGeo.setAttribute('position', new BufferAttribute(this.splashPos, 3));
    this.boltGeo.setAttribute('position', new BufferAttribute(this.boltPos, 3));
    this.glowGeo.setAttribute('position', new BufferAttribute(this.glowPos, 3));
    this.dropLines = this.lines(this.dropGeo, this.dropMat, 6);
    this.splashLines = this.lines(this.splashGeo, this.splashMat, 6);
    this.glowLines = this.lines(this.glowGeo, this.glowMat, 7);
    this.boltLines = this.lines(this.boltGeo, this.boltMat, 8);
  }

  private lines(g: BufferGeometry, m: LineBasicMaterial, order: number): LineSegments {
    const l = new LineSegments(g, m);
    l.frustumCulled = false;
    l.renderOrder = order;
    l.visible = false;
    this.scene.add(l);
    return l;
  }

  update(dt: number, v: RainView): void {
    const area = (2 * v.reach) ** 2;
    const n = Math.min(MAX_DROPS, Math.round((area / 10000) * v.density * v.rain * (1 + 0.5 * v.storm)));
    const d = this.drops;
    const x0 = v.cx - v.reach;
    const z0 = v.cz - v.reach;
    const span = 2 * v.reach;
    // new drops start anywhere in the air, so the rain fades in rather than arriving in a sheet
    for (let i = this.live; i < n; i++) this.respawn(i, x0, z0, span, Math.random() * FALL_H);
    this.live = Math.max(this.live, n);
    // the wind blows along the 2D view's screen right (world +x, -y), as the 2D rain slants
    const speed = FALL_V * (1 + 0.35 * v.storm);
    const wx = v.wind * 0.5 * Math.SQRT1_2;
    const wz = -v.wind * 0.5 * Math.SQRT1_2;
    const len = 9 + 7 * v.storm;
    const p = this.dropPos;
    for (let i = 0; i < n; i++) {
      const k = i * 4;
      d[k + 1] -= d[k + 3] * speed * dt;
      d[k] += wx * d[k + 3] * speed * dt;
      d[k + 2] += wz * d[k + 3] * speed * dt;
      if (d[k + 1] <= 0) {
        this.splash(d[k], d[k + 2]);
        this.respawn(i, x0, z0, span, FALL_H + d[k + 1]);
      }
      d[k] = x0 + mod(d[k] - x0, span);
      d[k + 2] = z0 + mod(d[k + 2] - z0, span);
      const j = i * 6;
      p[j] = d[k];
      p[j + 1] = d[k + 1];
      p[j + 2] = d[k + 2];
      p[j + 3] = d[k] - wx * len;
      p[j + 4] = d[k + 1] + len;
      p[j + 5] = d[k + 2] - wz * len;
    }
    this.dropGeo.setDrawRange(0, n * 2);
    this.dropGeo.attributes.position.needsUpdate = true;
    this.dropLines.visible = n > 0;
    this.dropMat.color.copy(v.col);
    this.dropMat.opacity = Math.min(0.6, 0.3 + 0.4 * v.rain);
    this.drawSplashes(dt, v.right, v.col);
  }

  private respawn(i: number, x0: number, z0: number, span: number, h: number): void {
    const k = i * 4;
    this.drops[k] = x0 + Math.random() * span;
    this.drops[k + 1] = h;
    this.drops[k + 2] = z0 + Math.random() * span;
    this.drops[k + 3] = 0.8 + Math.random() * 0.35;
  }

  private splash(x: number, z: number): void {
    if (this.nSplash >= MAX_SPLASHES) return;
    const k = this.nSplash++ * 3;
    this.splashes[k] = x;
    this.splashes[k + 1] = z;
    this.splashes[k + 2] = 0;
  }

  /** Each splash: two short strokes opening up and out, gone in a blink. */
  private drawSplashes(dt: number, right: Vector3, col: Color): void {
    const s = this.splashes;
    const p = this.splashPos;
    let out = 0;
    for (let i = 0; i < this.nSplash; i++) {
      const k = i * 3;
      const t = s[k + 2] + dt;
      if (t > 0.14) continue;
      const x = s[k];
      const z = s[k + 1];
      // keep it (packed to the front)
      const o = out * 3;
      s[o] = x;
      s[o + 1] = z;
      s[o + 2] = t;
      const spread = 1 + t * 22;
      const up = 1.5 + t * 14;
      const j = out * 12;
      for (const [side, at] of [
        [-1, 0],
        [1, 6],
      ]) {
        p[j + at] = x + right.x * side * spread * 0.4;
        p[j + at + 1] = up * 0.4;
        p[j + at + 2] = z + right.z * side * spread * 0.4;
        p[j + at + 3] = x + right.x * side * spread;
        p[j + at + 4] = up;
        p[j + at + 5] = z + right.z * side * spread;
      }
      out++;
    }
    this.nSplash = out;
    this.splashGeo.setDrawRange(0, out * 4);
    this.splashGeo.attributes.position.needsUpdate = true;
    this.splashLines.visible = out > 0;
    this.splashMat.color.copy(col);
    this.splashMat.opacity = 0.55;
  }

  /** The bolts seen this moment (none: none drawn): a white core, and a pale glow a pixel either side. */
  setBolts(bolts: Bolt3D[]): void {
    const p = this.boltPos;
    const q = this.glowPos;
    let n = 0;
    for (const b of bolts) {
      const k = b.height / BOLT_SHAPE_H;
      for (const line of boltLines(b.seed, 0, -BOLT_SHAPE_H, 0)) {
        for (let i = 1; i < line.length && n < MAX_BOLT_SEGS; i++, n++) {
          const j = n * 6;
          for (const [o, [dx, dy]] of [
            [0, line[i - 1]],
            [3, line[i]],
          ] as const) {
            // (wider zig-zags than the 2D shape: seen tall and far, it would look nearly straight)
            p[j + o] = b.x + b.right.x * dx * k * 1.8;
            p[j + o + 1] = -dy * k;
            p[j + o + 2] = b.z + b.right.z * dx * k * 1.8;
            for (const side of [-1, 1]) {
              const g = n * 12 + (side < 0 ? 0 : 6) + o;
              q[g] = p[j + o] + b.right.x * side * b.px;
              q[g + 1] = p[j + o + 1];
              q[g + 2] = p[j + o + 2] + b.right.z * side * b.px;
            }
          }
        }
      }
    }
    this.boltGeo.setDrawRange(0, n * 2);
    this.boltGeo.attributes.position.needsUpdate = true;
    this.boltLines.visible = n > 0;
    this.glowGeo.setDrawRange(0, n * 4);
    this.glowGeo.attributes.position.needsUpdate = true;
    this.glowLines.visible = n > 0;
  }

  /** No rain (indoors): hide it all and let the drops go. */
  clear(): void {
    this.live = 0;
    this.nSplash = 0;
    this.dropLines.visible = false;
    this.splashLines.visible = false;
  }

  destroy(): void {
    for (const l of [this.dropLines, this.splashLines, this.boltLines, this.glowLines]) this.scene.remove(l);
    this.dropGeo.dispose();
    this.splashGeo.dispose();
    this.boltGeo.dispose();
    this.glowGeo.dispose();
    this.glowMat.dispose();
    this.dropMat.dispose();
    this.splashMat.dispose();
    this.boltMat.dispose();
  }
}

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}
