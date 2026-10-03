import Phaser from 'phaser';
import { ISO_OX } from '../../sim/map';
import { Rng } from '../../sim/rng';

const MARGIN = 260;
const COUNT = 9;
/** Wind in screen pixels per second. */
const WIND = { x: 14, y: 6 };
/** Where the cloud body sits relative to its shadow (fakes altitude). */
const LIFT = { x: -70, y: -110 };

interface Cloud {
  x: number;
  y: number;
  speed: number;
  shadow: Phaser.GameObjects.Image;
  body: Phaser.GameObjects.Image;
}

/**
 * Drifting clouds: a dark shadow on the ground (drawn above entities so it shades them)
 * and a faint bright body floating above it. Shapes are chunky pixel blobs stretched 2:1
 * to sit on the isometric ground.
 */
export class Clouds {
  private readonly clouds: Cloud[] = [];
  private readonly rng = new Rng(778);
  /** Projected extent of the current region (screen pixels). */
  private x0 = 0;
  private w = 0;
  private h = 0;

  constructor(scene: Phaser.Scene, cols: number, rows: number) {
    const rng = new Rng(777);
    const keys = [0, 1, 2].map(i => Clouds.texture(scene, i, rng));
    for (let i = 0; i < COUNT; i++) {
      const key = keys[i % keys.length];
      const scale = 0.8 + rng.next() * 0.9;
      const shadow = scene.add.image(0, 0, key).setTint(0x000000).setAlpha(0.2).setScale(scale).setDepth(9e4);
      const body = scene.add.image(0, 0, key).setTint(0xffffff).setAlpha(0.11).setScale(scale * 1.04).setDepth(1e5 + 2);
      this.clouds.push({
        x: 0,
        y: 0,
        speed: 0.8 + rng.next() * 0.5,
        shadow,
        body,
      });
    }
    this.relayout(cols, rows);
  }

  /** Spread the clouds over the region you are in (call after changing region). */
  relayout(cols: number, rows: number): void {
    this.x0 = ISO_OX - rows * 32;
    this.w = (cols + rows) * 32;
    this.h = (cols + rows) * 16 + 48;
    for (const cl of this.clouds) {
      cl.x = this.x0 - MARGIN + this.rng.next() * (this.w + MARGIN * 2);
      cl.y = -MARGIN + this.rng.next() * (this.h + MARGIN * 2);
    }
    this.place();
  }

  /** Pixel cloud: a few overlapping ellipses on a tiny canvas, scaled up nearest-neighbour. */
  private static texture(scene: Phaser.Scene, variant: number, rng: Rng): string {
    const key = 'cloud' + variant;
    if (scene.textures.exists(key)) return key;
    const w = 48;
    const h = 24;
    const cv = document.createElement('canvas');
    cv.width = w * 4;
    cv.height = h * 4;
    const small = document.createElement('canvas');
    small.width = w;
    small.height = h;
    const c = small.getContext('2d')!;
    c.fillStyle = '#fff';
    const n = 5 + Math.floor(rng.next() * 4);
    for (let i = 0; i < n; i++) {
      const rx = 6 + rng.next() * 10;
      const ry = rx * (0.4 + rng.next() * 0.2);
      const x = rx + rng.next() * (w - rx * 2);
      const y = ry + rng.next() * (h - ry * 2);
      c.beginPath();
      c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      c.fill();
    }
    const big = cv.getContext('2d')!;
    big.imageSmoothingEnabled = false;
    big.drawImage(small, 0, 0, w * 4, h * 4);
    scene.textures.addCanvas(key, cv);
    return key;
  }

  update(dt: number): void {
    for (const cl of this.clouds) {
      cl.x += WIND.x * cl.speed * dt;
      cl.y += WIND.y * cl.speed * dt;
      if (cl.x > this.x0 + this.w + MARGIN) cl.x -= this.w + MARGIN * 2;
      if (cl.y > this.h + MARGIN) cl.y -= this.h + MARGIN * 2;
    }
    this.place();
  }

  private place(): void {
    for (const cl of this.clouds) {
      cl.shadow.setPosition(Math.round(cl.x), Math.round(cl.y));
      cl.body.setPosition(Math.round(cl.x + LIFT.x), Math.round(cl.y + LIFT.y));
    }
  }

  private wanted = true;
  private suppressed = false;

  setVisible(v: boolean): void {
    this.wanted = v;
    this.show();
  }

  /** Hidden whatever the setting (a 3D view has no 2D sky to drift over). */
  setSuppressed(v: boolean): void {
    this.suppressed = v;
    this.show();
  }

  private show(): void {
    const v = this.wanted && !this.suppressed;
    for (const cl of this.clouds) {
      cl.shadow.setVisible(v);
      cl.body.setVisible(v);
    }
  }

  destroy(): void {
    for (const cl of this.clouds) {
      cl.shadow.destroy();
      cl.body.destroy();
    }
  }
}
