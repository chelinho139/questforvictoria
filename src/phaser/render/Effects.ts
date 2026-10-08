import Phaser from 'phaser';
import type { Sim } from '../../sim/Sim';
import type { Fx } from '../../sim/types';
import { ISO_OX, isoX, isoY } from '../../sim/map';
import { hex } from '../config';
import { Tex } from './textures';
import { artScale } from './art';
import { DUEL_RING } from '../../sim/Duel';

const WHITE = 0xffffff;

/** The drawing calls effects use: a Phaser Graphics, or a 2D canvas standing in for one (3D views). */
export interface Gfx {
  clear(): unknown;
  fillStyle(color: number, alpha?: number): unknown;
  fillRect(x: number, y: number, w: number, h: number): unknown;
  fillCircle(x: number, y: number, r: number): unknown;
  fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): unknown;
  lineStyle(width: number, color: number, alpha?: number): unknown;
  lineBetween(x0: number, y0: number, x1: number, y1: number): unknown;
  strokeCircle(x: number, y: number, r: number): unknown;
  beginPath(): unknown;
  moveTo(x: number, y: number): unknown;
  lineTo(x: number, y: number): unknown;
  arc(x: number, y: number, r: number, a0: number, a1: number, anticlockwise?: boolean): unknown;
  strokePath(): unknown;
}

/** Where a world point (x, y) at height h (art px) is on screen, and how many screen px an art px is there. */
export type At = (x: number, y: number, h: number) => { x: number; y: number; k: number };

/** The isometric view: the projection, one to one. */
const isoAt: At = (x, y, h) => ({ x: isoX(x, y), y: isoY(x, y) - h, k: 1 });

/**
 * Draws the simulation's transient effects and particles every frame.
 *
 * Ground-plane effects (rings, slashes, particles) are drawn in world coordinates on a
 * Graphics object nested in two containers: the inner one rotates 45°, the outer one
 * scales (√2, √2/2). Together that is exactly the isometric projection, so circles
 * come out as ground ellipses. Billboard effects (dash ghosts, bolts, fireballs, a
 * sorceress's orbs, lightning and pillars of flame) are
 * drawn directly in screen space.
 */
export class Effects {
  private readonly flat: Phaser.GameObjects.Graphics;
  private readonly bill: Phaser.GameObjects.Graphics;
  private readonly ghosts = new Map<Fx, Phaser.GameObjects.Image[]>();
  /** Dev: draw the click-to-move route. */
  showPath = false;
  /** The click-to-move ring (off for a clean trailer shot: dev/Director.ts). */
  static showGoal = true;

  constructor(private readonly scene: Phaser.Scene, private readonly sim: Sim) {
    const outer = scene.add.container(ISO_OX, 0).setScale(Math.SQRT2, Math.SQRT1_2).setDepth(1e6);
    const inner = scene.add.container(0, 0).setRotation(Math.PI / 4);
    outer.add(inner);
    this.flat = scene.add.graphics();
    inner.add(this.flat);
    this.bill = scene.add.graphics().setDepth(1e6 + 1);
  }

  draw(): void {
    this.flat.clear();
    this.bill.clear();
    this.render(this.flat, this.bill, isoAt, true);
  }

  /**
   * The 3D views: ground effects onto `g` (in world px, a canvas laid on the ground), the
   * ones in the air onto `b` (screen px) through `at`.
   */
  draw3d(g: Gfx, b: Gfx, at: At): void {
    this.flat.clear();
    this.bill.clear();
    this.render(g, b, at, false);
  }

  private render(g: Gfx, b: Gfx, at: At, ghosts: boolean): void {

    for (const p of this.sim.parts) {
      g.fillStyle(hex(p.col), Math.max(0, p.life / p.max));
      const s = p.size;
      g.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
    }

    if (this.showPath && this.sim.path) {
      g.lineStyle(1.5, 0x3ddbd9, 0.9);
      g.beginPath();
      g.moveTo(this.sim.x, this.sim.y);
      for (const q of this.sim.path) g.lineTo(q.x, q.y);
      g.strokePath();
      g.fillStyle(0x3ddbd9, 1);
      for (const q of this.sim.path) g.fillRect(q.x - 2, q.y - 2, 4, 4);
    }

    // click-to-move destination: a small pulsing ring on the ground
    const goal = Effects.showGoal ? this.sim.moveGoal : null;
    if (goal) {
      const k = (Math.sin(this.scene.time.now / 140) + 1) / 2;
      g.lineStyle(2, hex('#f2c14e'), 0.45 + 0.35 * k);
      g.strokeCircle(goal.x, goal.y, 5 + 2 * k);
    }

    // bear traps: iron jaws open on the ground
    for (const tr of this.sim.traps) {
      g.lineStyle(1, hex('#4a3a2c'), 1);
      g.strokeCircle(tr.x, tr.y, 5);
      g.fillStyle(hex('#9aa0aa'), 1);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.fillRect(Math.round(tr.x + Math.cos(a) * 4) - 0.5, Math.round(tr.y + Math.sin(a) * 4) - 0.5, 1, 1);
      }
      g.fillStyle(hex('#c8a05a'), 1);
      g.fillRect(tr.x - 1, tr.y - 1, 2, 2);
    }

    // snares: a loop of cord in the grass, its peg and knot
    for (const sn of this.sim.snares) {
      g.lineStyle(1, hex('#8a7448'), 0.85);
      g.strokeCircle(sn.x, sn.y, 6);
      g.fillStyle(hex('#5a4630'), 1);
      g.fillRect(sn.x + 5, sn.y - 1, 2, 2);
      g.lineBetween(sn.x + 6, sn.y, sn.x + 10, sn.y - 3);
    }

    // whoever is held still: what holds them, round their feet and across them
    const held: { x: number; y: number; by: string }[] = [];
    if (this.sim.hero.heldT > 0) held.push({ x: this.sim.x, y: this.sim.y, by: this.sim.hero.heldBy });
    for (const o of this.sim.others) if (o.heldT > 0) held.push({ x: o.x, y: o.y, by: o.heldBy });
    for (const c of this.sim.companions) if (c.heldT > 0) held.push({ x: c.x, y: c.y, by: c.heldBy });
    for (const h of held) this.holding(g, b, at, h.x, h.y, h.by);

    // duels: each flag and the ring round it (brighter for your own), your opponent ringed red
    // at their feet, and stars over anyone stunned
    const duel = this.sim.duel;
    for (const [x, y, da, db, live] of this.sim.duelFlags)
      this.duelFlag(g, b, at, x, y, !!duel && (duel.id === da || duel.id === db), live === 1);
    const rv = this.sim.rival;
    if (rv && rv.alive && !rv.hid) {
      const k = (Math.sin(this.scene.time.now / 160) + 1) / 2;
      g.lineStyle(2, hex('#e0504b'), 0.55 + 0.35 * k);
      g.strokeCircle(rv.x, rv.y, 11 + k);
    }
    for (const h of [this.sim.hero, ...this.sim.others]) if (h.stunT > 0 && h.dead <= 0) this.stars(b, at, h.x, h.y);

    const live = new Set<Fx>();
    for (const f of this.sim.fx) {
      const p = f.t / f.dur;
      switch (f.type) {
        case 'stab': {
          const q = Math.min(1, p * 1.7);
          const ex = f.x0! + (f.x1! - f.x0!) * q;
          const ey = f.y0! + (f.y1! - f.y0!) * q;
          g.lineStyle(5 * (1 - p) + 1, hex('#bcd3ff'), 1 - p * 0.7);
          g.lineBetween(f.x0!, f.y0!, ex, ey);
          g.lineStyle(1.5, WHITE, 1 - p * 0.7);
          g.lineBetween(f.x0!, f.y0!, ex, ey);
          if (p > 0.45) this.star(g, f.x1!, f.y1!, 10 * (1 - p) + 3, WHITE, 2, 1 - p * 0.7);
          break;
        }
        case 'slash': {
          this.crescent(g, f.x!, f.y!, 16, f.rot!, hex(f.col!), p);
          if (f.double && p > 0.3) this.crescent(g, f.x!, f.y!, 16, f.rot! + Math.PI / 2, hex(f.col!), (p - 0.3) / 0.7);
          break;
        }
        case 'whirl': {
          const a = 1 - p;
          g.lineStyle(3, hex(f.col!), a);
          g.strokeCircle(f.x!, f.y!, 10 + (f.r! - 10) * p);
          for (let k = 0; k < 3; k++) {
            const ang = p * 16 + k * 2.09;
            this.arc(g, f.x!, f.y! - 8, 28, ang, ang + 1.5, 5, hex(f.col!), a);
            this.arc(g, f.x!, f.y! - 8, 28, ang + 0.3, ang + 1.2, 2, WHITE, a);
          }
          break;
        }
        case 'shout': {
          for (let k = 0; k < 3; k++) {
            const pk = p - k * 0.18;
            if (pk <= 0) continue;
            g.lineStyle(3, hex(f.col!), (1 - pk) * 0.9);
            g.strokeCircle(f.x!, f.y! - 10, 8 + pk * 52);
          }
          break;
        }
        case 'xslash': {
          const s = 20 + p * 8;
          g.lineStyle(6, hex(f.col!), 1 - p);
          g.lineBetween(f.x! - s, f.y! - s, f.x! + s, f.y! + s);
          if (p > 0.15) g.lineBetween(f.x! + s, f.y! - s, f.x! - s, f.y! + s);
          g.lineStyle(2, WHITE, 1 - p);
          g.lineBetween(f.x! - s, f.y! - s, f.x! + s, f.y! + s);
          if (p > 0.15) g.lineBetween(f.x! + s, f.y! - s, f.x! - s, f.y! + s);
          break;
        }
        case 'shield': {
          g.lineStyle(4, hex(f.col!), 1 - p);
          g.strokeCircle(f.x!, f.y! - 8, 14 + p * 18);
          const s = 8 + p * 6;
          g.lineStyle(3, hex(f.col!), 1 - p);
          g.lineBetween(f.x! - s, f.y! - 8 - s, f.x! + s, f.y! - 8 + s);
          g.lineBetween(f.x! + s, f.y! - 8 - s, f.x! - s, f.y! - 8 + s);
          break;
        }
        case 'ring': {
          g.lineStyle(f.lw ?? 3, hex(f.col!), 1 - p);
          g.strokeCircle(f.x!, f.y!, f.r0! + (f.r1! - f.r0!) * p);
          break;
        }
        case 'hit': {
          this.star(g, f.x!, f.y!, 12 * (1 - p) + 4, f.col ? hex(f.col) : WHITE, 2.5, 1 - p);
          break;
        }
        case 'swing': {
          const a0 = f.face! > 0 ? -1.3 + p * 1.2 : Math.PI + 1.3 - p * 1.2;
          const a1 = a0 + (f.face! > 0 ? 1.1 : -1.1);
          this.arc(g, f.x! + f.face! * 6, f.y! - 8, 22, Math.min(a0, a1), Math.max(a0, a1), 3, hex('#f4f1e6'), 1 - p);
          break;
        }
        case 'dash': {
          if (!ghosts) break;
          live.add(f);
          let imgs = this.ghosts.get(f);
          if (!imgs) {
            imgs = [];
            for (let k = 0; k < 4; k++)
              imgs.push(this.scene.add.image(0, 0, Tex.knight).setOrigin(0.5, 1).setScale(artScale(Tex.knight)).setDepth(1e6 + 2).setFlipX(f.face! < 0));
            this.ghosts.set(f, imgs);
          }
          const ax = isoX(f.x0!, f.y0!), ay = isoY(f.x0!, f.y0!);
          const bx = isoX(f.x1!, f.y1!), by = isoY(f.x1!, f.y1!);
          imgs.forEach((im, k) => {
            const q = k / 4;
            im.setPosition(ax + (bx - ax) * q, ay + (by - ay) * q + 8).setAlpha(0.55 * (1 - p) * (1 - q * 0.6));
          });
          break;
        }
        case 'bolt': {
          // the points are screen offsets from the target: across, and up into the sky
          const pt = (q: [number, number]) => {
            const s = at(f.x!, f.y!, f.y! - q[1]);
            return [s.x + (q[0] - f.x!) * s.k, s.y];
          };
          const pts = f.pts!.map(pt);
          const draw = (w: number, col: number) => {
            b.lineStyle(w, col, 1 - p * 0.8);
            b.beginPath();
            b.moveTo(pts[0][0], pts[0][1]);
            for (const q of pts) b.lineTo(q[0], q[1]);
            b.strokePath();
          };
          draw(5, hex(f.col!));
          draw(2, WHITE);
          const c = at(f.x!, f.y!, 0);
          b.fillStyle(hex(f.col!), (1 - p) * 0.7);
          b.fillCircle(c.x, c.y, (8 + p * 22) * c.k);
          break;
        }
        case 'arrow': {
          // an arrow on a shallow arc: dark shaft, steel head, fletching in the spell's colour
          const arc = Math.min(14, Math.hypot(isoX(f.x1!, f.y1!) - isoX(f.x0!, f.y0!), isoY(f.x1!, f.y1!) - isoY(f.x0!, f.y0!)) * 0.08);
          const lift = ghosts ? 0 : 12;
          const fly = (q: number): [number, number] => {
            const s = at(f.x0! + (f.x1! - f.x0!) * q, f.y0! + (f.y1! - f.y0!) * q, lift + Math.sin(q * Math.PI) * arc);
            return [s.x, s.y];
          };
          const [x, y] = fly(p);
          const [px, py] = fly(Math.max(0, p - 0.05));
          const d = Math.hypot(x - px, y - py) || 1;
          const dx = (x - px) / d;
          const dy = (y - py) / d;
          b.lineStyle(1, hex('#6b4a2b'), 1);
          b.lineBetween(Math.round(x - dx * 7), Math.round(y - dy * 7), Math.round(x), Math.round(y));
          b.fillStyle(hex('#d8dce4'), 1);
          b.fillRect(Math.round(x + dx) - 1, Math.round(y + dy) - 1, 2, 2);
          b.fillStyle(hex(f.col ?? '#e8dcc0'), 1);
          b.fillRect(Math.round(x - dx * 7) - 1, Math.round(y - dy * 7) - 1, 2, 2);
          break;
        }
        case 'orb': {
          // a sorceress's bolt: a glowing ball in the spell's colour, a fading tail behind it
          const lift = ghosts ? 0 : 12;
          const col = hex(f.col ?? '#c08aff');
          const fly = (q: number) => at(f.x0! + (f.x1! - f.x0!) * q, f.y0! + (f.y1! - f.y0!) * q, lift + Math.sin(q * Math.PI) * 6);
          for (let k = 4; k >= 1; k--) {
            const t = fly(Math.max(0, p - k * 0.05));
            b.fillStyle(col, 0.5 - k * 0.1);
            b.fillCircle(t.x, t.y, (4.5 - k * 0.6) * t.k);
          }
          const t = fly(p);
          b.fillStyle(col, 0.35);
          b.fillCircle(t.x, t.y, 6 * t.k);
          b.fillStyle(col, 1);
          b.fillCircle(t.x, t.y, 3.5 * t.k);
          b.fillStyle(WHITE, 1);
          b.fillCircle(t.x - 0.5 * t.k, t.y - 0.5 * t.k, 1.5 * t.k);
          break;
        }
        case 'zap': {
          // lightning from one to the next: a jagged line that flickers, white at its heart
          const a0 = at(f.x0!, f.y0!, 14);
          const a1 = at(f.x1!, f.y1!, 14);
          const n = 6;
          const pts: [number, number][] = [[a0.x, a0.y]];
          for (let i = 1; i < n; i++) {
            const q = i / n;
            pts.push([
              a0.x + (a1.x - a0.x) * q + (Math.random() * 10 - 5) * a1.k,
              a0.y + (a1.y - a0.y) * q + (Math.random() * 10 - 5) * a1.k,
            ]);
          }
          pts.push([a1.x, a1.y]);
          const draw = (w: number, col: number, alpha: number) => {
            b.lineStyle(w * a1.k, col, alpha);
            b.beginPath();
            b.moveTo(pts[0][0], pts[0][1]);
            for (const q of pts) b.lineTo(q[0], q[1]);
            b.strokePath();
          };
          draw(4, hex(f.col ?? '#bfe4ff'), (1 - p) * 0.8);
          draw(1.5, WHITE, 1 - p * 0.6);
          b.fillStyle(WHITE, (1 - p) * 0.8);
          b.fillCircle(a1.x, a1.y, (3 + p * 6) * a1.k);
          break;
        }
        case 'pillar': {
          // a pillar of flame: scorched ground, and tongues of fire licking up and fading
          const col = hex(f.col ?? '#ff8c42');
          const r = f.r ?? 30;
          g.fillStyle(col, 0.3 * (1 - p));
          g.fillCircle(f.x!, f.y!, r * (0.6 + 0.4 * p));
          const tongues = Math.max(4, Math.round(r / 6));
          for (let i = 0; i < tongues; i++) {
            const a = (i / tongues) * Math.PI * 2 + i * 0.7;
            const d = r * 0.65 * ((i * 37) % 10) / 10;
            const foot = at(f.x! + Math.cos(a) * d, f.y! + Math.sin(a) * d, 0);
            const h = (18 + ((i * 53) % 24)) * Math.sin(Math.min(1, p * 1.6) * Math.PI * 0.9 + 0.2);
            const top = at(f.x! + Math.cos(a) * d, f.y! + Math.sin(a) * d, h);
            b.lineStyle(5 * foot.k, col, 0.8 * (1 - p));
            b.lineBetween(foot.x, foot.y, top.x, top.y);
            b.lineStyle(2 * foot.k, hex('#ffe690'), 0.9 * (1 - p));
            b.lineBetween(foot.x, foot.y, (foot.x + top.x) / 2, (foot.y + top.y) / 2);
          }
          break;
        }
        case 'fireball': {
          const fly = (q: number) => at(f.x0! + (f.x1! - f.x0!) * q, f.y0! + (f.y1! - f.y0!) * q, Math.sin(q * Math.PI) * 24);
          for (let k = 3; k >= 0; k--) {
            const t = fly(Math.max(0, p - k * 0.06));
            b.fillStyle(k ? hex('#a78bfa') : hex('#c9b6ff'), k ? 0.35 - k * 0.08 : 1);
            b.fillCircle(t.x, t.y, (k ? 4 : 7) * t.k);
          }
          const t = fly(p);
          b.fillStyle(WHITE, 1);
          b.fillCircle(t.x, t.y, 3 * t.k);
          break;
        }
      }
    }
    // drop ghost sprites of dashes that ended
    for (const [f, imgs] of this.ghosts) {
      if (!live.has(f)) {
        imgs.forEach(i => i.destroy());
        this.ghosts.delete(f);
      }
    }
  }

  /**
   * What holds someone still, at their feet (on the ground, `g`) and across them (in the air,
   * `b`): a web's strands, a net's mesh, a snare's cord, black roots coiling up.
   */
  private holding(g: Gfx, b: Gfx, at: At, x: number, y: number, by: string): void {
    const t = this.scene.time.now / 1000;
    if (by === 'ice') {
      // frozen: a pale ring of frost, and shards of ice up the legs
      g.fillStyle(hex('#d8f0ff'), 0.35);
      g.fillCircle(x, y, 10);
      g.lineStyle(1.5, hex('#8ad4ff'), 0.9);
      g.strokeCircle(x, y, 10);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        const lo = at(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 0);
        const hi = at(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 9 + (i % 3) * 3);
        b.lineStyle(3 * lo.k, hex('#bfe4ff'), 0.85);
        b.lineBetween(lo.x, lo.y, hi.x, hi.y);
        b.lineStyle(1 * lo.k, WHITE, 0.9);
        b.lineBetween(lo.x, lo.y, hi.x, hi.y);
      }
      return;
    }
    if (by === 'roots') {
      g.lineStyle(2, hex('#2a2020'), 0.95);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        g.lineBetween(x + Math.cos(a) * 12, y + Math.sin(a) * 12, x + Math.cos(a + 0.5) * 4, y + Math.sin(a + 0.5) * 4);
      }
      for (let i = 0; i < 3; i++) {
        const lo = at(x + (i - 1) * 4, y, 2);
        const hi = at(x + (i - 1) * 3, y, 12 + i * 3 + Math.sin(t * 3 + i) * 1.5);
        b.lineStyle(2 * lo.k, hex('#2a2020'), 0.95);
        b.lineBetween(lo.x, lo.y, hi.x, hi.y);
      }
      return;
    }
    if (by === 'snare') {
      g.lineStyle(1.5, hex('#8a7448'), 1);
      g.strokeCircle(x, y, 5);
      const lo = at(x, y, 1);
      const hi = at(x + 10, y - 6, 5);
      b.lineStyle(1.5 * lo.k, hex('#8a7448'), 1);
      b.lineBetween(lo.x, lo.y, hi.x, hi.y);
      return;
    }
    // a web or a net: strands on the ground, and across the body
    const col = hex(by === 'net' ? '#b8a878' : '#e8e8f0');
    g.lineStyle(1, col, 0.8);
    g.strokeCircle(x, y, 9);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.lineBetween(x, y, x + Math.cos(a) * 12, y + Math.sin(a) * 12);
    }
    const foot = at(x, y, 0);
    b.lineStyle(1 * foot.k, col, 0.85);
    for (let i = 0; i < 4; i++) {
      const h0 = 3 + i * 5;
      const p0 = at(x - 8, y, h0);
      const p1 = at(x + 8, y, h0 + (by === 'net' ? 0 : 4));
      b.lineBetween(p0.x, p0.y, p1.x, p1.y);
    }
    if (by === 'net')
      for (let i = 0; i < 4; i++) {
        const p0 = at(x - 6 + i * 4, y, 2);
        const p1 = at(x - 6 + i * 4, y, 20);
        b.lineBetween(p0.x, p0.y, p1.x, p1.y);
      }
  }

  /**
   * A duel's flag: a pole with a red pennant rippling at the top, and round it on the ground a
   * ring of dashes slowly going round (gold in the count, red once they fight).
   */
  private duelFlag(g: Gfx, b: Gfx, at: At, x: number, y: number, own: boolean, live: boolean): void {
    const t = this.scene.time.now / 1000;
    const col = hex(live ? '#e0504b' : '#f2c14e');
    const n = 48;
    for (let i = 0; i < n; i += 2) {
      const a0 = (i / n) * Math.PI * 2 + t * 0.15;
      this.arc(g, x, y, DUEL_RING, a0, a0 + (Math.PI * 2) / n, 2, col, own ? 0.6 : 0.3);
    }
    g.fillStyle(hex('#3b2a1a'), 0.5);
    g.fillCircle(x, y, 3);
    const foot = at(x, y, 0);
    const top = at(x, y, 34);
    const k = top.k;
    b.lineStyle(2 * foot.k, hex('#5a3a1e'), 1);
    b.lineBetween(foot.x, foot.y, top.x, top.y);
    const ripple = Math.sin(t * 6) * 2 * k;
    b.fillStyle(hex('#b8392f'), 1);
    b.fillTriangle(top.x, top.y, top.x + 14 * k, top.y + 4.5 * k + ripple, top.x, top.y + 9 * k);
    b.fillStyle(hex('#f2c14e'), 1);
    b.fillRect(top.x - 1.5 * k, top.y - 3 * k, 3 * k, 3 * k);
  }

  /** Stunned: three little stars wheeling round over the head. */
  private stars(b: Gfx, at: At, x: number, y: number): void {
    const t = this.scene.time.now / 1000;
    b.fillStyle(hex('#fff0a0'), 1);
    for (let i = 0; i < 3; i++) {
      const a = t * 4 + (i * Math.PI * 2) / 3;
      const p = at(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 44);
      b.fillRect(p.x - 1.5 * p.k, p.y - 1.5 * p.k, 3 * p.k, 3 * p.k);
    }
  }

  private arc(g: Gfx, x: number, y: number, r: number, a0: number, a1: number, w: number, col: number, alpha: number): void {
    g.lineStyle(w, col, alpha);
    g.beginPath();
    g.arc(x, y, r, a0, a1, false);
    g.strokePath();
  }

  private star(g: Gfx, x: number, y: number, r: number, col: number, lw: number, alpha: number): void {
    g.lineStyle(lw, col, alpha);
    g.lineBetween(x - r, y, x + r, y);
    g.lineBetween(x, y - r, x, y + r);
    const q = r * 0.5;
    g.lineBetween(x - q, y - q, x + q, y + q);
    g.lineBetween(x - q, y + q, x + q, y - q);
  }

  private crescent(g: Gfx, x: number, y: number, r: number, rot: number, col: number, p: number): void {
    const a = Math.max(0, 1 - p);
    this.arc(g, x, y, r + p * 6, rot - 1.1, rot + 1.1, 7 * (1 - p) + 2, col, a);
    this.arc(g, x, y, r + p * 6, rot - 0.8, rot + 0.8, 2, WHITE, a);
  }

  destroy(): void {
    for (const imgs of this.ghosts.values()) imgs.forEach(i => i.destroy());
    this.ghosts.clear();
  }
}
