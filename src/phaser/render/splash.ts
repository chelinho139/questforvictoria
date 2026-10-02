import Phaser from 'phaser';
import { PixelCanvas } from './pixelPainter';
import { PIXEL_SCALE, logicalSize } from '../config';
import { UI, panel, uiText } from './uiKit';
import { Rng } from '../../sim/rng';

export const LOGO_KEY = 'logo';
const BG_KEY = 'splash-bg';

// ---------------------------------------------------------------- logo
/** Render text to a tight boolean mask (alpha thresholded, so edges stay pixel-crisp). */
function textMask(text: string, font: string, size: number, weight = 'normal'): { w: number; h: number; m: Uint8Array } {
  const cv = document.createElement('canvas');
  const c = cv.getContext('2d')!;
  c.font = `${weight} ${size}px ${font}`;
  const W = Math.ceil(c.measureText(text).width) + 8;
  const H = Math.ceil(size * 1.6);
  cv.width = W;
  cv.height = H;
  c.font = `${weight} ${size}px ${font}`;
  c.textBaseline = 'middle';
  c.fillStyle = '#fff';
  c.fillText(text, 4, H / 2);
  const d = c.getImageData(0, 0, W, H).data;
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (d[(y * W + x) * 4 + 3] >= 110) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) return { w: 1, h: 1, m: new Uint8Array(1) };
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = d[((y + y0) * W + x + x0) * 4 + 3] >= 110 ? 1 : 0;
  return { w, h, m };
}

/** Paint a mask as lettering: vertical colour ramp, lit top edge, two outlines, drop shadow. */
function letter(
  ctx: CanvasRenderingContext2D,
  mask: { w: number; h: number; m: Uint8Array },
  ox: number,
  oy: number,
  ramp: string[],
  top: string,
  rims: [string, string],
  shadow = 3
): void {
  const { w, h, m } = mask;
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1;
  // rims: ring 1 touches the letters (8-way), ring 2 touches ring 1 (4-way)
  const ring1 = new Set<number>();
  const ring2 = new Set<number>();
  const key = (x: number, y: number) => (y + 4) * (w + 8) + (x + 4);
  for (let y = -2; y < h + 2; y++)
    for (let x = -2; x < w + 2; x++) {
      if (at(x, y)) continue;
      let touch = false;
      for (let dy = -1; dy <= 1 && !touch; dy++) for (let dx = -1; dx <= 1 && !touch; dx++) if (at(x + dx, y + dy)) touch = true;
      if (touch) ring1.add(key(x, y));
    }
  for (let y = -3; y < h + 3; y++)
    for (let x = -3; x < w + 3; x++) {
      const k = key(x, y);
      if (at(x, y) || ring1.has(k)) continue;
      if (ring1.has(key(x - 1, y)) || ring1.has(key(x + 1, y)) || ring1.has(key(x, y - 1)) || ring1.has(key(x, y + 1))) ring2.add(k);
    }
  const each = (set: Set<number>, fn: (x: number, y: number) => void) => set.forEach(k => fn((k % (w + 8)) - 4, Math.floor(k / (w + 8)) - 4));
  const put = (x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox + x, oy + y, 1, 1);
  };
  if (shadow) {
    ctx.globalAlpha = 0.55;
    const sh = (x: number, y: number) => put(x, y + shadow, '#000');
    each(ring2, sh);
    each(ring1, sh);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (at(x, y)) sh(x, y);
    ctx.globalAlpha = 1;
  }
  each(ring2, (x, y) => put(x, y, rims[1]));
  each(ring1, (x, y) => put(x, y, rims[0]));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      const t = y / Math.max(1, h - 1);
      const c = !at(x, y - 1) ? top : ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))];
      put(x, y, c);
    }
}

function crest(): HTMLCanvasElement {
  const p = new PixelCanvas(30, 34);
  p.poly([[0, 0], [30, 0], [30, 17], [15, 34], [0, 17]], '#e8b04a');
  p.hline(0, 29, 0, '#ffe38a').vline(0, 0, 16, '#ffe38a');
  p.poly([[3, 3], [27, 3], [27, 16], [15, 29.5], [3, 16]], '#2a3f7a');
  p.poly([[3, 3], [15, 3], [15, 29.5], [3, 16]], '#c8392f');
  p.vline(3, 3, 15, '#e8584a').vline(26, 3, 15, '#1e2e5c');
  // emblem: a sword, point down
  p.px(15, 4, '#ffe38a').vline(15, 5, 7, '#6a4226');
  p.hline(11, 19, 8, '#ffe38a').hline(12, 18, 9, '#a8701e');
  p.vline(15, 10, 24, '#f4f8fc').vline(16, 10, 24, '#a9b6c8').px(15, 25, '#a9b6c8');
  return p.outline('#2a1406').toCanvas();
}

function crossedSwords(): HTMLCanvasElement {
  const p = new PixelCanvas(64, 40);
  const sword = (x0: number, y0: number, x1: number, y1: number) => {
    // blade from the tip (x1,y1) back to the guard near (x0,y0)
    p.line(x0, y0, x1, y1, '#c8d2de', 2);
    p.line(x0, y0, x1, y1, '#f4f8fc');
    const gx = x0 + (x1 - x0) * 0.1;
    const gy = y0 + (y1 - y0) * 0.1;
    const nx = -(y1 - y0);
    const ny = x1 - x0;
    const nl = Math.hypot(nx, ny);
    p.line(gx - (nx / nl) * 5, gy - (ny / nl) * 5, gx + (nx / nl) * 5, gy + (ny / nl) * 5, '#e8b04a', 2);
    p.line(x0, y0, x0 - (x1 - x0) * 0.08, y0 - (y1 - y0) * 0.08, '#6a4226', 2);
  };
  sword(8, 36, 56, 2);
  sword(56, 36, 8, 2);
  return p.outline('#2a1406').toCanvas();
}

/** Build the "Quest For Victoria" logo texture (call after fonts are loaded). */
export function buildLogo(scene: Phaser.Scene): void {
  if (scene.textures.exists(LOGO_KEY)) return;
  const W = 250;
  // title: Silkscreen Bold (open counters survive the thick outline, unlike rounder
  // faces whose C closes into an O), at the largest multiple of its 8px grid that fits
  let title = textMask('VICTORIA', 'Silkscreen', 16, 'bold');
  for (const size of [48, 40, 32, 24]) {
    const t = textMask('VICTORIA', 'Silkscreen', size, 'bold');
    if (t.w <= W - 24) {
      title = t;
      break;
    }
  }
  const sub = textMask('QUEST FOR', 'Silkscreen', 8);
  const H = 58 + title.h + 10;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;

  const swords = crossedSwords();
  c.drawImage(swords, Math.round((W - swords.width) / 2), 0);
  const cr = crest();
  c.drawImage(cr, Math.round((W - cr.width) / 2), 3);

  // ribbon with "QUEST FOR"
  const rw = sub.w + 26;
  const rx = Math.round((W - rw) / 2);
  const ry = 32;
  const band = (x: number, y: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
  };
  // tails, folded behind
  for (const side of [-1, 1]) {
    const tx = side < 0 ? rx - 12 : rx + rw;
    band(tx, ry + 4, 12, 11, '#3b0e0e');
    band(tx + 1, ry + 5, 10, 9, '#8a2020');
    // V-notch cut into the outer end of each tail
    c.clearRect(side < 0 ? tx : tx + 9, ry + 7, 3, 5);
  }
  band(rx - 1, ry - 1, rw + 2, 15, '#3b0e0e');
  band(rx, ry, rw, 13, '#c8392f');
  band(rx, ry, rw, 1, '#e8584a');
  band(rx, ry + 12, rw, 1, '#8a2020');
  letter(c, sub, rx + 13, ry + 3, ['#fff3d6'], '#ffffff', ['#5a1414', 'rgba(0,0,0,0)'], 0);

  letter(c, title, Math.round((W - title.w) / 2), 54, ['#fff2b0', '#ffd24a', '#f0a030', '#c86a18'], '#fffbe6', ['#5a2208', '#1e0c04'], 3);
  scene.textures.addCanvas(LOGO_KEY, cv);
}

// ---------------------------------------------------------------- splash screen
/** Night-sky loading screen: logo, castle on the hills, fireflies, progress bar, step label. */
export class Splash {
  private readonly bg: Phaser.GameObjects.Image;
  private readonly stars: Phaser.GameObjects.Graphics;
  private readonly flies: Phaser.GameObjects.Graphics;
  private readonly logo: Phaser.GameObjects.Image;
  private readonly frame: Phaser.GameObjects.NineSlice;
  private readonly inset: Phaser.GameObjects.NineSlice;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly version: Phaser.GameObjects.Text;
  private starPts: [number, number, number][] = [];
  private readonly fly: { x: number; y: number; ph: number; sp: number }[] = [];
  private shown = 0;
  private w = 0;
  private h = 0;
  private logoY = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.bg = scene.add.image(0, 0, '__DEFAULT').setOrigin(0);
    this.stars = scene.add.graphics();
    this.flies = scene.add.graphics().setDepth(5);
    this.logo = scene.add.image(0, 0, LOGO_KEY).setDepth(10);
    this.frame = panel(scene, UI.wood, 0, 0, 10, 10).setDepth(10);
    this.inset = panel(scene, UI.bar, 0, 0, 10, 10).setDepth(11);
    this.bar = scene.add.graphics().setDepth(12);
    this.label = uiText(scene, 0, 0, '', 12, '#fce6b4', { stroke: true, bold: true }).setOrigin(0.5, 0).setDepth(12);
    this.version = uiText(scene, 0, 0, 'v0.1 · early build', 10, '#8f86b8', { bold: true }).setOrigin(1, 1).setDepth(12);
    const rng = new Rng(2024);
    for (let i = 0; i < 18; i++) this.fly.push({ x: rng.next(), y: 0.72 + rng.next() * 0.24, ph: rng.next() * 6.28, sp: 0.4 + rng.next() * 0.6 });
    this.layout();
    // the logo drops in
    this.logo.setAlpha(0).setY(this.logoY - 12);
    scene.tweens.add({ targets: this.logo, alpha: 1, y: this.logoY, duration: 650, ease: 'Back.Out' });
  }

  layout(): void {
    const { w, h } = logicalSize(this.scene.scale);
    this.w = Math.ceil(w);
    this.h = Math.ceil(h);
    this.scene.cameras.main.setZoom(PIXEL_SCALE).centerOn(w / 2, h / 2);
    this.paintBackground();
    const k = Math.max(1, Math.floor(Math.min((w * 0.62) / this.logo.width, (h * 0.42) / this.logo.height)));
    this.logo.setScale(k);
    this.logoY = Math.round(h * 0.36);
    this.logo.setPosition(Math.round(w / 2), this.logoY);
    const bw = Math.min(260, Math.round(w * 0.5));
    const by = Math.round(this.logoY + (this.logo.height * k) / 2 + 22);
    this.frame.setPosition(Math.round(w / 2 - bw / 2 - 6), by - 6).setSize(bw + 12, 22);
    this.inset.setPosition(Math.round(w / 2 - bw / 2), by).setSize(bw, 10);
    this.label.setPosition(Math.round(w / 2), by + 22);
    this.version.setPosition(w - 8, h - 6);
    const rng = new Rng(77);
    this.starPts = [];
    for (let i = 0; i < 90; i++) this.starPts.push([Math.floor(rng.next() * this.w), Math.floor(rng.next() * this.h * 0.62), rng.next() * 6.28]);
  }

  /** Banded night sky, moon, three hill layers and a castle with lit windows. */
  private paintBackground(): void {
    const { w, h } = this;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const c = cv.getContext('2d')!;
    const bands = ['#080c22', '#0c1230', '#121a3e', '#1a2250', '#26285c', '#3a2e66', '#553668', '#6e3e66'];
    const horizon = h * 0.74;
    for (let y = 0; y < h; y++) {
      // dithered banding: pixel-art gradient instead of a smooth one
      const t = Math.min(1, y / horizon);
      const f = t * (bands.length - 1);
      const i = Math.floor(f);
      const frac = f - i;
      for (let x = 0; x < w; x++) {
        const pick = frac > ((x + y * 2) % 4) / 4 + 0.125 ? i + 1 : i;
        c.fillStyle = bands[Math.min(bands.length - 1, pick)];
        c.fillRect(x, y, 1, 1);
      }
    }
    // moon with a soft halo and a couple of craters
    const mx = Math.round(w * 0.8);
    const my = Math.round(h * 0.16);
    c.fillStyle = 'rgba(244,241,224,0.08)';
    c.beginPath();
    c.arc(mx, my, 26, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f4f1e0';
    c.beginPath();
    c.arc(mx, my, 13, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#d8d2bc';
    c.fillRect(mx - 5, my - 3, 3, 3);
    c.fillRect(mx + 3, my + 4, 4, 3);
    c.fillRect(mx + 2, my - 7, 2, 2);

    const rng = new Rng(9);
    const hill = (base: number, amp: number, freq: number, phase: number, col: string) => {
      c.fillStyle = col;
      for (let x = 0; x < w; x++) {
        const y = Math.round(base - amp * (0.6 * Math.sin(x * freq + phase) + 0.4 * Math.sin(x * freq * 2.3 + phase * 1.7)));
        c.fillRect(x, y, 1, h - y);
      }
    };
    hill(h * 0.74, 14, 0.012, 0.5, '#23265a');
    hill(h * 0.8, 12, 0.018, 2.1, '#191c44');
    // castle on the middle hill
    const cx = Math.round(w * 0.72);
    const cy = Math.round(h * 0.8 - 12 * (0.6 * Math.sin(cx * 0.018 + 2.1) + 0.4 * Math.sin(cx * 0.018 * 2.3 + 2.1 * 1.7)));
    c.fillStyle = '#10132e';
    c.fillRect(cx - 34, cy - 22, 68, 24);
    for (let x = cx - 34; x < cx + 34; x += 6) c.fillRect(x, cy - 26, 3, 4);
    for (const tx of [cx - 40, cx + 30]) {
      c.fillRect(tx, cy - 44, 12, 46);
      for (let x = tx; x < tx + 12; x += 4) c.fillRect(x, cy - 48, 2, 4);
    }
    c.fillRect(cx - 7, cy - 58, 14, 60);
    c.beginPath();
    c.moveTo(cx - 9, cy - 58);
    c.lineTo(cx, cy - 72);
    c.lineTo(cx + 9, cy - 58);
    c.fill();
    c.fillRect(cx, cy - 82, 1, 10);
    c.fillStyle = '#c8392f';
    c.fillRect(cx + 1, cy - 82, 6, 3);
    c.fillStyle = '#ffd866';
    for (const [x, y] of [[cx - 36, cy - 36], [cx + 34, cy - 30], [cx - 2, cy - 48], [cx + 2, cy - 36], [cx - 20, cy - 14], [cx + 12, cy - 14]]) c.fillRect(x, y, 2, 3);
    hill(h * 0.9, 10, 0.024, 4.2, '#0c0f26');
    // pines along the front hill
    c.fillStyle = '#0a0c1e';
    for (let i = 0; i < 24; i++) {
      const x = Math.floor(rng.next() * w);
      const base = Math.round(h * 0.9 - 10 * (0.6 * Math.sin(x * 0.024 + 4.2) + 0.4 * Math.sin(x * 0.024 * 2.3 + 4.2 * 1.7))) + 2;
      const th = 14 + Math.floor(rng.next() * 12);
      for (let j = 0; j < th; j++) {
        const half = Math.floor((j / th) * 6) + 1;
        c.fillRect(x - half, base - th + j, half * 2 + 1, 1);
      }
    }
    if (this.scene.textures.exists(BG_KEY)) this.scene.textures.remove(BG_KEY);
    this.scene.textures.addCanvas(BG_KEY, cv);
    this.bg.setTexture(BG_KEY);
  }

  setLabel(text: string): void {
    this.label.setText(text);
  }

  /** True once the bar has visibly reached the end. */
  get full(): boolean {
    return this.shown >= 0.995;
  }

  update(now: number, elapsed: number, progress: number): void {
    // ease toward real progress, but never faster than a steady fill, so it reads as loading
    const cap = Math.min(1, elapsed / 1100);
    this.shown += (Math.min(progress, cap) - this.shown) * 0.18;
    if (progress >= 1 && cap >= 1 && this.shown > 0.99) this.shown = 1;

    const g = this.stars;
    g.clear();
    for (const [x, y, ph] of this.starPts) {
      const a = 0.35 + 0.65 * Math.max(0, Math.sin(now / 520 + ph));
      g.fillStyle(0xffffff, a).fillRect(x, y, 1, 1);
    }
    const f = this.flies;
    f.clear();
    for (const fl of this.fly) {
      const x = ((fl.x * this.w + now * 0.006 * fl.sp) % (this.w + 20)) - 10;
      const y = fl.y * this.h + Math.sin(now / 700 + fl.ph) * 6;
      const a = 0.4 + 0.6 * Math.max(0, Math.sin(now / 380 + fl.ph * 2));
      f.fillStyle(0xd8ff7a, a * 0.35).fillRect(x - 1, y - 1, 3, 3);
      f.fillStyle(0xf4ffc0, a).fillRect(x, y, 1, 1);
    }

    const b = this.bar;
    b.clear();
    const w = Math.round((this.inset.width - 2) * this.shown);
    if (w > 0) {
      const x = this.inset.x + 1;
      const y = this.inset.y + 1;
      b.fillStyle(0xf2c14e, 1).fillRect(x, y, w, 8);
      b.fillStyle(0xffe38a, 1).fillRect(x, y, w, 2);
      b.fillStyle(0xa8701e, 1).fillRect(x, y + 7, w, 1);
      // a little shine that travels along the filled part
      const sx = x + ((now / 6) % Math.max(1, w + 20)) - 10;
      b.fillStyle(0xffffff, 0.45).fillRect(Math.max(x, sx), y + 1, Math.max(0, Math.min(3, x + w - sx)), 6);
    }
  }
}
