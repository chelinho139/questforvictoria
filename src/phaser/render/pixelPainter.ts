/**
 * Tiny pixel-art painter used to build the HD sprite set in code. Work happens on an
 * integer colour buffer (0 = transparent); `toCanvas()` produces the final image.
 *
 * Conventions: light comes from the top-left; `outline()` adds the dark rim that gives
 * sprites their Terraria-like read against busy ground.
 */

/** Colour ramp: light, mid, dark, and optionally a deepest shade. */
export type Tones = string[];

function parse(c: string): number {
  const n = parseInt(c.slice(1), 16);
  return (0xff << 24) | n; // opaque, 0xAARRGGBB in a JS number (sign ignored, we only compare)
}

export class PixelCanvas {
  readonly w: number;
  readonly h: number;
  private readonly buf: Int32Array;
  /** Design coordinates are offset by `pad` so outlines have room around the art. */
  constructor(w: number, h: number, readonly pad = 1) {
    this.w = w + pad * 2;
    this.h = h + pad * 2;
    this.buf = new Int32Array(this.w * this.h);
  }

  private idx(x: number, y: number): number {
    const X = Math.round(x) + this.pad;
    const Y = Math.round(y) + this.pad;
    if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) return -1;
    return Y * this.w + X;
  }

  px(x: number, y: number, c: string): this {
    const i = this.idx(x, y);
    if (i >= 0) this.buf[i] = parse(c);
    return this;
  }

  has(x: number, y: number): boolean {
    const i = this.idx(x, y);
    return i >= 0 && this.buf[i] !== 0;
  }

  erase(x: number, y: number): this {
    const i = this.idx(x, y);
    if (i >= 0) this.buf[i] = 0;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: string): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
    return this;
  }

  hline(x0: number, x1: number, y: number, c: string): this {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.px(x, y, c);
    return this;
  }

  vline(x: number, y0: number, y1: number, c: string): this {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.px(x, y, c);
    return this;
  }

  /** Bresenham line, optionally `thick` pixels wide (extends downward). */
  line(x0: number, y0: number, x1: number, y1: number, c: string, thick = 1): this {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const X = Math.round(x1);
    const Y = Math.round(y1);
    const dx = Math.abs(X - x);
    const dy = -Math.abs(Y - y);
    const sx = x < X ? 1 : -1;
    const sy = y < Y ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      for (let t = 0; t < thick; t++) this.px(x, y + t, c);
      if (x === X && y === Y) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
    return this;
  }

  /** Flat filled ellipse. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string, clip?: (x: number, y: number) => boolean): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - (cx + 0.5)) / rx;
        const ny = (y + 0.5 - (cy + 0.5)) / ry;
        if (nx * nx + ny * ny <= 1 && (!clip || clip(x, y))) this.px(x, y, c);
      }
    return this;
  }

  /**
   * Ellipse shaded like a lit sphere: light from the top-left, a dark rim bottom-right.
   * `tones` go light → mid → dark → (deepest).
   */
  blob(cx: number, cy: number, rx: number, ry: number, tones: Tones, clip?: (x: number, y: number) => boolean): this {
    const [L, M, D, X] = tones;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - (cx + 0.5)) / rx;
        const ny = (y + 0.5 - (cy + 0.5)) / ry;
        const d = nx * nx + ny * ny;
        if (d > 1 || (clip && !clip(x, y))) continue;
        const lit = -(nx * 0.55 + ny * 0.8); // >0 facing the light
        let c = M;
        if (lit > 0.35 && d < 0.75) c = L;
        else if (lit < -0.3 || d > 0.82) c = X && lit < -0.55 ? X : D;
        this.px(x, y, c);
      }
    return this;
  }

  /** Filled polygon (even-odd scanline). */
  poly(pts: [number, number][], c: string): this {
    const ys = pts.map(p => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs: number[] = [];
      const sy = y + 0.5;
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= sy && y1 > sy) || (y1 <= sy && y0 > sy)) xs.push(x0 + ((sy - y0) / (y1 - y0)) * (x1 - x0));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, c);
    }
    return this;
  }

  /** Sprinkle `n` pixels of colour c on existing pixels that pass `where` (seeded). */
  speckle(n: number, c: string, seed: number, where: (x: number, y: number) => boolean): this {
    let s = seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0, tries = 0; i < n && tries < n * 20; tries++) {
      const x = Math.floor(rnd() * (this.w - this.pad * 2));
      const y = Math.floor(rnd() * (this.h - this.pad * 2));
      if (this.has(x, y) && where(x, y)) {
        this.px(x, y, c);
        i++;
      }
    }
    return this;
  }

  /**
   * Dark rim around the silhouette. 'auto' darkens the neighbouring colour (a hue-tinted
   * outline, the way Terraria sprites read); a hex string uses that colour.
   */
  outline(color: string | 'auto' = 'auto', k = 0.32): this {
    const src = this.buf.slice();
    const W = this.w;
    const H = this.h;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (src[y * W + x] !== 0) continue;
        let n = 0;
        if (x > 0 && src[y * W + x - 1]) n = src[y * W + x - 1];
        else if (x < W - 1 && src[y * W + x + 1]) n = src[y * W + x + 1];
        else if (y > 0 && src[(y - 1) * W + x]) n = src[(y - 1) * W + x];
        else if (y < H - 1 && src[(y + 1) * W + x]) n = src[(y + 1) * W + x];
        if (!n) continue;
        if (color === 'auto') {
          const r = Math.round(((n >> 16) & 255) * k);
          const g = Math.round(((n >> 8) & 255) * k);
          const b = Math.round((n & 255) * k);
          this.buf[y * W + x] = (0xff << 24) | (r << 16) | (g << 8) | b;
        } else this.buf[y * W + x] = parse(color);
      }
    return this;
  }

  clone(): PixelCanvas {
    const c = new PixelCanvas(this.w - this.pad * 2, this.h - this.pad * 2, this.pad);
    c.buf.set(this.buf);
    return c;
  }

  toCanvas(): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = this.w;
    cv.height = this.h;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(this.w, this.h);
    for (let i = 0; i < this.buf.length; i++) {
      const v = this.buf[i];
      if (!v) continue;
      img.data[i * 4] = (v >> 16) & 255;
      img.data[i * 4 + 1] = (v >> 8) & 255;
      img.data[i * 4 + 2] = v & 255;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }
}

/**
 * Scale2x (EPX) pixel-art upscale: doubles resolution while rounding off stair-steps,
 * then a dark outline. Used to lift the 12×12 action icons to 24×24.
 */
export function scale2x(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const s = src.getContext('2d')!.getImageData(0, 0, w, h).data;
  const at = (x: number, y: number) => {
    x = Math.max(0, Math.min(w - 1, x));
    y = Math.max(0, Math.min(h - 1, y));
    const i = (y * w + x) * 4;
    return s[i + 3] < 128 ? 0 : (0xff << 24) | (s[i] << 16) | (s[i + 1] << 8) | s[i + 2];
  };
  const pc = new PixelCanvas(w * 2, h * 2, 1);
  const put = (x: number, y: number, v: number) => {
    if (!v) return;
    pc.px(x, y, '#' + (v & 0xffffff).toString(16).padStart(6, '0'));
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const P = at(x, y);
      const A = at(x, y - 1);
      const B = at(x + 1, y);
      const C = at(x - 1, y);
      const D = at(x, y + 1);
      put(x * 2, y * 2, C === A && C !== D && A !== B ? A : P);
      put(x * 2 + 1, y * 2, A === B && A !== C && B !== D ? B : P);
      put(x * 2, y * 2 + 1, D === C && D !== B && C !== A ? C : P);
      put(x * 2 + 1, y * 2 + 1, B === D && B !== A && D !== C ? D : P);
    }
  return pc.outline('auto', 0.3).toCanvas();
}
