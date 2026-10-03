import Phaser from 'phaser';
import type { Sim } from '../../sim/Sim';
import type { Strike } from '../../sim/weather';
import { Tile, fromIso, T } from '../../sim/map';
import type { WeatherAudio } from '../audio/WeatherAudio';

/** Drops at full rain, per 10 000 square px of the view (a storm adds half again). */
const DENSITY = 20;
/** How high above its splash a drop starts (screen px), and how fast it falls (px a second). */
const FALL_H = 230;
const FALL_V = 380;
const SPLASHES = 260;
/** The rain's colour, and the bolt's core and glow. */
const RAIN = 0xc6d8ec;
const BOLT = 0xffffff;
const GLOW = 0xb8ccff;

interface Drop {
  /** Where it lands, in the 2D view's projected px. */
  gx: number;
  gy: number;
  /** How high above that it is now. */
  h: number;
  speed: number;
  /** 0 far (short, faint) .. 2 near (long, brighter). */
  tier: number;
}

interface Splash {
  x: number;
  y: number;
  t: number;
  water: boolean;
}

/** A bolt coming down: where (view fractions), its shape's seed, and how long ago it struck. */
export interface Bolt {
  u: number;
  v: number;
  seed: number;
  t: number;
  /** Seen far off (a thinner bolt, low on the horizon in point of view). */
  far: boolean;
}

/** One flash: how bright it gets and how it flickers. */
interface Flash {
  t: number;
  peak: number;
  dist: Strike['dist'];
}

/**
 * The weather on screen (sim/weather.ts says what it is): rain falling and splashing in the 2D
 * view, the gloom of an overcast sky and the flash of lightning (which the lighting reads, in 2D
 * and 3D), bolts coming down, and the thunder after (WeatherAudio). The 3D views draw their own
 * rain (view3d/Rain3D.ts) from the same numbers.
 */
export class WeatherFx {
  /** 0..1: how much the overcast sky darkens the day. */
  gloom = 0;
  /** 0..1: lightning lighting everything up this moment. */
  flash = 0;
  /** Screen px the camera jolts by (a strike close by). */
  shake = 0;
  /** The bolts seen this moment. */
  readonly bolts: Bolt[] = [];
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly veil: Phaser.GameObjects.Rectangle;
  private readonly drops: Drop[] = [];
  private readonly splashes: Splash[] = [];
  private readonly flashes: Flash[] = [];
  private shakeT = 0;
  /** The newest strike already shown. */
  private seen = 0;
  private audio: WeatherAudio | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sim: Sim
  ) {
    // above the world and the cloud shadows, under the clouds themselves and the effects
    this.g = scene.add.graphics().setDepth(9.5e4);
    // the flash's pale veil over the whole view (2D or 3D; under the HUD, which is another scene)
    this.veil = scene.add.rectangle(0, 0, 10, 10, 0xe8f0ff, 1).setOrigin(0).setScrollFactor(0).setDepth(2e6).setAlpha(0).setVisible(false);
    // don't show the strikes of before
    this.seen = sim.weather.strikes.at(-1)?.id ?? 0;
  }

  setAudio(a: WeatherAudio | null): void {
    this.audio = a;
  }

  /** Each frame: follow the weather, show the lightning, play the thunder; draw the rain unless a 3D view does. */
  update(dt: number, draw2d: boolean): void {
    const w = this.sim.weather;
    const indoor = !!this.sim.regionDef.indoor;
    const want = Math.min(1, 0.7 * w.rain + 0.45 * w.storm);
    this.gloom += (want * (indoor ? 0.35 : 1) - this.gloom) * Math.min(1, dt * 2);
    for (const s of w.strikes) if (s.id > this.seen) this.strike(s, indoor);
    if (w.strikes.length) this.seen = Math.max(this.seen, w.strikes[w.strikes.length - 1].id);
    // the flash: the brightest flicker going
    let f = 0;
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const fl = this.flashes[i];
      fl.t += dt;
      const v = flicker(fl.t, fl.dist) * fl.peak;
      if (fl.t > 1.2) this.flashes.splice(i, 1);
      else f = Math.max(f, v);
    }
    this.flash = f * (indoor ? 0.35 : 1);
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.t += dt;
      if (b.t > 0.32) this.bolts.splice(i, 1);
    }
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.shake = this.shakeT > 0 ? (Math.random() * 2 - 1) * 2 * (this.shakeT / 0.3) : 0;
    this.audio?.update(w.rain, w.storm, indoor);
    const cam = this.scene.cameras.main;
    if (this.veil.width !== cam.width || this.veil.height !== cam.height) this.veil.setSize(cam.width, cam.height);
    this.veil.setVisible(this.flash > 0.01).setAlpha(this.flash * 0.28);
    this.g.clear();
    if (!draw2d) return;
    this.drawRain(dt, indoor ? 0 : w.rain, w.storm, w.wind);
    for (const b of this.bolts) if (!b.far) this.drawBolt(b);
  }

  /** Lightning: a flash (a bolt if it's close), and its thunder on the way. */
  private strike(s: Strike, indoor: boolean): void {
    const peak = s.dist === 'near' ? 0.85 + 0.15 * s.power : s.dist === 'mid' ? 0.45 + 0.2 * s.power : 0.18 + 0.12 * s.power;
    this.flashes.push({ t: 0, peak, dist: s.dist });
    if (!indoor && s.dist !== 'far') this.bolts.push({ u: s.u, v: s.v, seed: s.id * 7919 + 13, t: 0, far: s.dist === 'mid' });
    if (s.dist === 'near' && !indoor) this.shakeT = 0.3;
    // the thunder follows the light: at once when it's close, seconds later from far away
    const delay = s.dist === 'near' ? 0.05 + 0.3 * s.v : s.dist === 'mid' ? 0.7 + 1.1 * s.power : 1.8 + 2 * s.v;
    const id = s.dist === 'near' ? 'thunderNear' : s.dist === 'mid' ? 'thunder' : 'thunderFar';
    this.audio?.thunder(id, delay, (s.u - 0.5) * 1.6, s.power < 0.5 ? 0 : 1);
  }

  // ---------- the 2D view ----------
  private drawRain(dt: number, rain: number, storm: number, wind: number): void {
    const view = this.scene.cameras.main.worldView;
    const slant = wind * 0.55;
    // the volume the drops live in: the view, plus room above for their fall and to the side for the slant
    const x0 = view.x - Math.abs(slant) * FALL_H - 8;
    const y0 = view.y;
    const W = view.width + Math.abs(slant) * FALL_H * 2 + 16;
    const H = view.height + FALL_H;
    const n = Math.round(((view.width * view.height) / 10000) * DENSITY * rain * (1 + 0.5 * storm));
    while (this.drops.length < n) this.drops.push(this.newDrop(x0, y0, W, H, Math.random() * FALL_H));
    const speedK = 1 + 0.35 * storm;
    const lenK = 1 + 0.4 * storm;
    const g = this.g;
    for (let i = 0; i < n; i++) {
      const d = this.drops[i];
      // the view moved: drops that fall out of the volume come back in on the other side
      d.gx = x0 + mod(d.gx - x0, W);
      d.gy = y0 + mod(d.gy - y0, H);
      d.h -= d.speed * speedK * dt;
      if (d.h <= 0) {
        this.splash(d.gx, d.gy);
        Object.assign(d, this.newDrop(x0, y0, W, H, FALL_H + d.h));
      }
      const len = Math.round((5 + d.tier * 3) * lenK);
      const alpha = 0.34 + d.tier * 0.15;
      // the head, and the streak above it back along the way it came
      const hx = Math.round(d.gx - slant * d.h);
      const hy = Math.round(d.gy - d.h);
      g.fillStyle(RAIN, alpha);
      let runX = hx;
      let runTop = hy;
      for (let k = 1; k <= len; k++) {
        const x = Math.round(hx - slant * k);
        if (x !== runX) {
          g.fillRect(runX, hy - k + 1, 1, runTop - (hy - k + 1) + 1);
          runX = x;
          runTop = hy - k;
        }
      }
      g.fillRect(runX, hy - len, 1, runTop - (hy - len) + 1);
    }
    this.drawSplashes(dt);
  }

  private newDrop(x0: number, y0: number, W: number, H: number, h: number): Drop {
    const tier = Math.random() < 0.45 ? 0 : Math.random() < 0.65 ? 1 : 2;
    return { gx: x0 + Math.random() * W, gy: y0 + Math.random() * H, h, speed: FALL_V * (0.8 + 0.12 * tier + Math.random() * 0.15), tier };
  }

  private splash(x: number, y: number): void {
    if (this.splashes.length >= SPLASHES) return;
    const p = fromIso(x, y);
    const t = this.sim.map.tile(Math.floor(p.x / T), Math.floor(p.y / T));
    // off the map: nothing to land on
    if (t === undefined || t === Tile.Void) return;
    this.splashes.push({ x: Math.round(x), y: Math.round(y), t: 0, water: t === Tile.Water });
  }

  /** Splashes: a tiny crown on the ground, a widening ring on water. */
  private drawSplashes(dt: number): void {
    const g = this.g;
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      s.t += dt;
      if (s.water) {
        if (s.t > 0.45) {
          this.splashes.splice(i, 1);
          continue;
        }
        const r = 1 + Math.floor((s.t / 0.45) * 4);
        g.fillStyle(RAIN, 0.5 * (1 - s.t / 0.45));
        g.fillRect(s.x - r * 2, s.y, 1, 1).fillRect(s.x + r * 2, s.y, 1, 1);
        g.fillRect(s.x - r, s.y - r / 2, r * 2 + 1, 1).fillRect(s.x - r, s.y + r / 2, r * 2 + 1, 1);
        continue;
      }
      if (s.t > 0.16) {
        this.splashes.splice(i, 1);
        continue;
      }
      g.fillStyle(RAIN, 0.65);
      if (s.t < 0.05) g.fillRect(s.x, s.y - 1, 1, 1).fillRect(s.x - 1, s.y - 2, 1, 1).fillRect(s.x + 1, s.y - 2, 1, 1);
      else if (s.t < 0.1) g.fillRect(s.x - 2, s.y - 3, 1, 1).fillRect(s.x + 2, s.y - 3, 1, 1);
      else g.fillRect(s.x - 3, s.y - 1, 1, 1).fillRect(s.x + 3, s.y - 1, 1, 1);
    }
  }

  /** A bolt from above the view down to where it strikes, in whole pixels: a white core in a pale glow. */
  private drawBolt(b: Bolt): void {
    if (!boltShows(b.t)) return;
    const view = this.scene.cameras.main.worldView;
    const gx = Math.round(view.x + view.width * (0.12 + 0.76 * b.u));
    const gy = Math.round(view.y + view.height * (0.3 + 0.5 * b.v));
    const g = this.g;
    for (const line of boltLines(b.seed, gx, view.y - 12, gy)) {
      g.fillStyle(GLOW, 0.45);
      plot(line, (x, y) => g.fillRect(x - 1, y, 3, 1));
      g.fillStyle(BOLT, 1);
      plot(line, (x, y) => g.fillRect(x, y, 1, 1));
    }
  }

  destroy(): void {
    this.g.destroy();
    this.veil.destroy();
  }
}

/** How bright a flash is `t` seconds in: a near strike flickers twice; far ones glow once, softly. */
export function flicker(t: number, dist: Strike['dist']): number {
  if (dist === 'far') return t < 0.35 ? Math.sin((t / 0.35) * Math.PI) : 0;
  if (t < 0.05) return 1;
  if (t < 0.09) return 0.25;
  if (t < 0.15) return 0.85;
  return Math.max(0, 0.85 * Math.exp(-(t - 0.15) * 7));
}

/** A bolt is drawn while its flash is up (and blinks out in the dip between the flickers). */
export function boltShows(t: number): boolean {
  return t < 0.3 && !(t >= 0.05 && t < 0.09);
}

/**
 * The bolt's shape, from a seed: a jagged line from (x, top) down to (gx, gy) and a fork or
 * two, as polylines. The same seed always makes the same bolt (both views draw it).
 */
export function boltLines(seed: number, gx: number, top: number, gy: number): [number, number][][] {
  let s = seed >>> 0 || 1;
  const rnd = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
  const steps = 12;
  const main: [number, number][] = [];
  let x = gx + (rnd() - 0.5) * 60;
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const y = top + (gy - top) * p;
    // wander, but home in on the strike point
    x += (rnd() - 0.5) * 26 * (1 - p);
    main.push([Math.round(x + (gx - x) * p * p), Math.round(y)]);
  }
  main[steps] = [gx, gy];
  const lines = [main];
  const forks = 1 + Math.floor(rnd() * 2);
  for (let f = 0; f < forks; f++) {
    const at = 3 + Math.floor(rnd() * 6);
    let [fx, fy] = main[at];
    const dir = rnd() < 0.5 ? -1 : 1;
    const fork: [number, number][] = [[fx, fy]];
    const segs = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < segs; i++) {
      fx += dir * (4 + rnd() * 12);
      fy += 8 + rnd() * 14;
      fork.push([Math.round(fx), Math.round(fy)]);
    }
    lines.push(fork);
  }
  return lines;
}

/** Every pixel along a polyline. */
function plot(pts: [number, number][], put: (x: number, y: number) => void): void {
  for (let i = 1; i < pts.length; i++) {
    let [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      put(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
}

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}
