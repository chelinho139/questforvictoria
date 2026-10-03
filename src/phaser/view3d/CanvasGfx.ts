import type { Gfx } from '../render/Effects';

/**
 * A 2D canvas that takes the drawing calls of a Phaser Graphics (the subset effects use), in
 * world px. The 3D views lay it on the ground under the hero: rings, slashes, particles and
 * the click marker are drawn onto it exactly as the 2D view draws them on its ground plane.
 */
export class CanvasGfx implements Gfx {
  readonly canvas: HTMLCanvasElement;
  private readonly c: CanvasRenderingContext2D;
  /** The world point at the canvas's top-left corner. */
  x0 = 0;
  y0 = 0;
  /** Set by drawing since the last clear (an empty canvas needn't be uploaded). */
  dirty = false;

  constructor(readonly size: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = size;
    this.c = this.canvas.getContext('2d')!;
    this.c.lineCap = 'round';
  }

  /** Centre the canvas on world (x, y) (snapped to whole tiles, so lines never crawl) and clear it. */
  centre(x: number, y: number): void {
    this.x0 = Math.round((x - this.size / 2) / 32) * 32;
    this.y0 = Math.round((y - this.size / 2) / 32) * 32;
  }

  clear(): this {
    const c = this.c;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.size, this.size);
    c.setTransform(1, 0, 0, 1, -this.x0, -this.y0);
    this.dirty = false;
    return this;
  }

  fillStyle(color: number, alpha = 1): this {
    this.c.fillStyle = rgba(color, alpha);
    return this;
  }

  lineStyle(width: number, color: number, alpha = 1): this {
    this.c.lineWidth = width;
    this.c.strokeStyle = rgba(color, alpha);
    return this;
  }

  fillRect(x: number, y: number, w: number, h: number): this {
    this.c.fillRect(x, y, w, h);
    this.dirty = true;
    return this;
  }

  fillCircle(x: number, y: number, r: number): this {
    this.c.beginPath();
    this.c.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    this.c.fill();
    this.dirty = true;
    return this;
  }

  fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): this {
    const c = this.c;
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.lineTo(x2, y2);
    c.closePath();
    c.fill();
    this.dirty = true;
    return this;
  }

  lineBetween(x0: number, y0: number, x1: number, y1: number): this {
    const c = this.c;
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
    this.dirty = true;
    return this;
  }

  strokeCircle(x: number, y: number, r: number): this {
    this.c.beginPath();
    this.c.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    this.c.stroke();
    this.dirty = true;
    return this;
  }

  beginPath(): this {
    this.c.beginPath();
    return this;
  }

  moveTo(x: number, y: number): this {
    this.c.moveTo(x, y);
    return this;
  }

  lineTo(x: number, y: number): this {
    this.c.lineTo(x, y);
    return this;
  }

  arc(x: number, y: number, r: number, a0: number, a1: number, anticlockwise = false): this {
    this.c.arc(x, y, Math.max(0, r), a0, a1, anticlockwise);
    return this;
  }

  strokePath(): this {
    this.c.stroke();
    this.dirty = true;
    return this;
  }
}

function rgba(color: number, alpha: number): string {
  return `rgba(${(color >> 16) & 255},${(color >> 8) & 255},${color & 255},${Math.max(0, Math.min(1, alpha))})`;
}
