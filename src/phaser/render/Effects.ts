import Phaser from 'phaser';
import type { Sim } from '../../sim/Sim';
import type { Fx } from '../../sim/types';
import { ISO_OX, isoX, isoY } from '../../sim/map';
import { hex } from '../config';
import { Tex } from './textures';
import { artScale } from './art';

const WHITE = 0xffffff;

/**
 * Draws the simulation's transient effects and particles every frame.
 *
 * Ground-plane effects (rings, slashes, particles) are drawn in world coordinates on a
 * Graphics object nested in two containers: the inner one rotates 45°, the outer one
 * scales (√2, √2/2). Together that is exactly the isometric projection, so circles
 * come out as ground ellipses. Billboard effects (dash ghosts, bolts, fireballs) are
 * drawn directly in screen space.
 */
export class Effects {
  private readonly flat: Phaser.GameObjects.Graphics;
  private readonly bill: Phaser.GameObjects.Graphics;
  private readonly ghosts = new Map<Fx, Phaser.GameObjects.Image[]>();
  /** Dev: draw the click-to-move route. */
  showPath = false;

  constructor(private readonly scene: Phaser.Scene, private readonly sim: Sim) {
    const outer = scene.add.container(ISO_OX, 0).setScale(Math.SQRT2, Math.SQRT1_2).setDepth(1e6);
    const inner = scene.add.container(0, 0).setRotation(Math.PI / 4);
    outer.add(inner);
    this.flat = scene.add.graphics();
    inner.add(this.flat);
    this.bill = scene.add.graphics().setDepth(1e6 + 1);
  }

  draw(): void {
    const g = this.flat;
    const b = this.bill;
    g.clear();
    b.clear();

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
    const goal = this.sim.moveGoal;
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
          const ox = isoX(f.x!, f.y!) - f.x!;
          const oy = isoY(f.x!, f.y!) - f.y!;
          const pts = f.pts!;
          const draw = (w: number, col: number) => {
            b.lineStyle(w, col, 1 - p * 0.8);
            b.beginPath();
            b.moveTo(pts[0][0] + ox, pts[0][1] + oy);
            for (const q of pts) b.lineTo(q[0] + ox, q[1] + oy);
            b.strokePath();
          };
          draw(5, hex(f.col!));
          draw(2, WHITE);
          b.fillStyle(hex(f.col!), (1 - p) * 0.7);
          b.fillCircle(isoX(f.x!, f.y!), isoY(f.x!, f.y!), 8 + p * 22);
          break;
        }
        case 'arrow': {
          // an arrow on a shallow arc: dark shaft, steel head, fletching in the spell's colour
          const ax = isoX(f.x0!, f.y0!), ay = isoY(f.x0!, f.y0!);
          const bx = isoX(f.x1!, f.y1!), by = isoY(f.x1!, f.y1!);
          const arc = Math.min(14, Math.hypot(bx - ax, by - ay) * 0.08);
          const at = (q: number): [number, number] => [ax + (bx - ax) * q, ay + (by - ay) * q - Math.sin(q * Math.PI) * arc];
          const [x, y] = at(p);
          const [px, py] = at(Math.max(0, p - 0.05));
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
        case 'fireball': {
          const ax = isoX(f.x0!, f.y0!), ay = isoY(f.x0!, f.y0!);
          const bx = isoX(f.x1!, f.y1!), by = isoY(f.x1!, f.y1!);
          for (let k = 3; k >= 0; k--) {
            const q = Math.max(0, p - k * 0.06);
            const tx = ax + (bx - ax) * q;
            const ty = ay + (by - ay) * q - Math.sin(q * Math.PI) * 24;
            b.fillStyle(k ? hex('#a78bfa') : hex('#c9b6ff'), k ? 0.35 - k * 0.08 : 1);
            b.fillCircle(tx, ty, k ? 4 : 7);
          }
          const x = ax + (bx - ax) * p;
          const y = ay + (by - ay) * p - Math.sin(p * Math.PI) * 24;
          b.fillStyle(WHITE, 1);
          b.fillCircle(x, y, 3);
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

  private arc(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, a0: number, a1: number, w: number, col: number, alpha: number): void {
    g.lineStyle(w, col, alpha);
    g.beginPath();
    g.arc(x, y, r, a0, a1, false);
    g.strokePath();
  }

  private star(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, col: number, lw: number, alpha: number): void {
    g.lineStyle(lw, col, alpha);
    g.lineBetween(x - r, y, x + r, y);
    g.lineBetween(x, y - r, x, y + r);
    const q = r * 0.5;
    g.lineBetween(x - q, y - q, x + q, y + q);
    g.lineBetween(x - q, y + q, x + q, y - q);
  }

  private crescent(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, rot: number, col: number, p: number): void {
    const a = Math.max(0, 1 - p);
    this.arc(g, x, y, r + p * 6, rot - 1.1, rot + 1.1, 7 * (1 - p) + 2, col, a);
    this.arc(g, x, y, r + p * 6, rot - 0.8, rot + 0.8, 2, WHITE, a);
  }

  destroy(): void {
    for (const imgs of this.ghosts.values()) imgs.forEach(i => i.destroy());
    this.ghosts.clear();
  }
}
