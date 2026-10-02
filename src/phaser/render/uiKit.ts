import Phaser from 'phaser';
import { PixelCanvas } from './pixelPainter';
import { Fonts, PIXEL_SCALE } from '../config';

/**
 * Stardew-style UI kit, generated in code: parchment panels in wooden frames, inset
 * item slots, bar insets and small icons. Panels are 9-slice textures, so any size keeps
 * crisp borders; draw them 1 texel = 1 logical pixel like the rest of the pixel art.
 */

export const UI = {
  panel: 'ui-panel',
  wood: 'ui-wood',
  tag: 'ui-tag',
  slot: 'ui-slot',
  slotHot: 'ui-slot-hot',
  ring: 'ui-ring',
  bar: 'ui-bar',
  heart: 'ui-heart',
  mana: 'ui-mana',
  coin: 'ui-coin',
  skull: 'ui-skull',
  star: 'ui-star',
} as const;

/** 9-slice border widths for each panel texture. */
export const SLICE = {
  [UI.panel]: 5,
  [UI.wood]: 5,
  [UI.tag]: 3,
  [UI.slot]: 3,
  [UI.slotHot]: 3,
  [UI.ring]: 3,
  [UI.bar]: 2,
} as const;

/** Text colours that read on parchment. */
export const Ink = {
  dark: '#4a2410',
  mid: '#7a4a24',
  soft: '#9a6a40',
  red: '#b8302a',
  blue: '#2a5a9a',
  green: '#3a7a2a',
} as const;

type Layer = (L: number, light: boolean) => string | null;

/**
 * Square bevelled panel of size n. `layer(L, light)` returns the colour for ring L
 * (0 = outermost) on the lit (top/left) or shaded (bottom/right) side, or null for clear.
 * Corners are cut diagonally by `cut` pixels so panels look rounded.
 */
function bevel(n: number, cut: number, layer: Layer): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = n;
  cv.height = n;
  const c = cv.getContext('2d')!;
  const half = n / 2;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const dx = Math.min(x, n - 1 - x);
      const dy = Math.min(y, n - 1 - y);
      const L = Math.min(dx, dy, dx + dy - cut);
      if (L < 0) continue;
      const light = (y < half && dy === L) || (x < half && dx === L && !(y >= half && dy === L));
      const col = layer(L, light);
      if (!col) continue;
      c.fillStyle = col;
      c.fillRect(x, y, 1, 1);
    }
  return cv;
}

function icon(rows: string[], pal: Record<string, string>, outline = 'auto'): HTMLCanvasElement {
  const p = new PixelCanvas(rows[0].length, rows.length);
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch !== '.' && p.px(x, y, pal[ch])));
  return p.outline(outline, 0.3).toCanvas();
}

export function buildUiKit(scene: Phaser.Scene): void {
  const tm = scene.textures;
  const add = (key: string, cv: HTMLCanvasElement) => {
    if (!tm.exists(key)) tm.addCanvas(key, cv);
  };

  // parchment in a wooden frame
  add(UI.panel, bevel(16, 2, (L, lit) => {
    if (L === 0) return '#3b1f0e';
    if (L === 1) return lit ? '#d08a44' : '#6a3616';
    if (L === 2) return '#9a5626';
    if (L === 3) return '#5a2e12';
    if (L === 4) return lit ? '#fcecc4' : '#e3c186';
    return '#f4dba8';
  }));
  // plain wood (action bar backdrop)
  add(UI.wood, bevel(16, 2, (L, lit) => {
    if (L === 0) return '#2e1709';
    if (L === 1) return lit ? '#c07a3a' : '#5e2e10';
    if (L === 2) return '#8a4a1e';
    if (L === 3) return '#4a2410';
    if (L === 4) return lit ? '#86481e' : '#5e3014';
    return '#6e3a18';
  }));
  // small parchment tag (buff chips)
  add(UI.tag, bevel(8, 1, (L, lit) => {
    if (L === 0) return '#5a2e12';
    if (L === 1) return lit ? '#fcecc4' : '#e3c186';
    return '#f4dba8';
  }));
  // inset item slot, and its hovered version
  const slot = (fill: string) =>
    bevel(8, 1, (L, lit) => {
      if (L === 0) return '#5a2e12';
      if (L === 1) return lit ? '#c49860' : '#fff0c8';
      return fill;
    });
  add(UI.slot, slot('#ecd09a'));
  add(UI.slotHot, slot('#f8e4b4'));
  // selection ring: white so it can be tinted (red = next Rev step, gold = Rev on, …)
  add(UI.ring, bevel(8, 1, L => (L === 0 ? '#9a9a9a' : L === 1 ? '#ffffff' : null)));
  // dark inset behind health / mana bars
  add(UI.bar, bevel(6, 1, L => (L === 0 ? '#3b1f0e' : '#241208')));

  add(UI.heart, icon(['.hh...xx.', 'hhxx.xxxx', 'hxxxxxxxx', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '...xxx...', '....x....'], { h: '#ffb4ac', x: '#e0403a' }));
  add(UI.mana, icon(['...x...', '..xxx..', '..xxx..', '.hxxxx.', '.hxxxx.', 'xhxxxxx', 'xxxxxxd', '.xxxxd.', '..ddd..'], { h: '#bfe0ff', x: '#3f86e8', d: '#2a5eb0' }));
  add(UI.coin, icon(['..xxxx..', '.xhhxxx.', 'xhxxxdxx', 'xhxddxdx', 'xxxddxdx', 'xxxxxxdx', '.xxxxdd.', '..dddd..'], { h: '#fff3b0', x: '#f2c14e', d: '#b87a1c' }));
  add(UI.skull, icon(['.xxxxxx.', 'xxxxxxxx', 'xkkxxkkx', 'xkkxxkkx', 'xxxxxxxx', '.xxkkxx.', '.xkxkxk.', '..xxxx..'], { x: '#f4efe0', k: '#3a3228' }));
  add(UI.star, icon(['....x....', '....x....', '...xhx...', 'xxxxhxxxx', '.xxxxxxx.', '..xxxxx..', '..xx.xx..', '.xx...xx.', '.x.....x.'], { h: '#fff6c0', x: '#f2c14e' }));
}

/** A 9-slice panel from the kit, anchored top-left. */
export function panel(scene: Phaser.Scene, key: keyof typeof SLICE, x: number, y: number, w: number, h: number): Phaser.GameObjects.NineSlice {
  const b = SLICE[key];
  return scene.add.nineslice(x, y, key, undefined, w, h, b, b, b, b).setOrigin(0);
}

/**
 * UI text in Pixelify Sans. `stroke` gives it a dark outline for text drawn over the world
 * (Terraria style); text on parchment doesn't need one.
 */
export function uiText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  size: number,
  color: string,
  opts: { stroke?: boolean; bold?: boolean; font?: string } = {}
): Phaser.GameObjects.Text {
  const t = scene.add
    .text(x, y, str, {
      fontFamily: opts.font ?? Fonts.ui,
      fontSize: size + 'px',
      fontStyle: opts.bold ? 'bold' : 'normal',
      color,
    })
    .setResolution(PIXEL_SCALE);
  if (opts.stroke) t.setStroke('#1e0f06', Math.max(2, Math.round(size / 6))).setShadow(0, 1, '#1e0f06', 0, true, true);
  return t;
}
