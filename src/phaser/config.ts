import Phaser from 'phaser';

/** Which HUD and key map to run. Mobile keeps the one-thumb wheel HUD. */
export const PLATFORM: 'pc' | 'mobile' = 'pc';

/**
 * A phone or tablet (a finger, not a mouse). The PC HUD folds its menu bar into one button
 * so the action bar gets the whole bottom edge, and nothing is drawn smaller than the
 * page's own pixels. `?touch` in the address forces it on a desktop (`?touch=0` turns it off).
 */
export const TOUCH: boolean = (() => {
  if (typeof window === 'undefined') return false;
  const q = new URLSearchParams(window.location.search).get('touch');
  if (q !== null) return q !== '0';
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
})();

export const Fonts = {
  display: 'Silkscreen, "Courier New", monospace',
  body: 'VT323, "Courier New", monospace',
  /** PC HUD text: a friendlier, more readable pixel face. */
  ui: '"Pixelify Sans", VT323, monospace',
  /** Big titles and banners (used bold). */
  title: '"Pixelify Sans", Silkscreen, sans-serif',
} as const;

export const Colors = {
  bg: '#0c1018',
  ink: '#ebe5d4',
  muted: '#93a0b8',
  dim: '#5d6b85',
  line2: '#3a4966',
  ember: '#ff8c42',
  teal: '#3ddbd9',
  gold: '#f2c14e',
  hp: '#e0504b',
  mp: '#4a7fe0',
  ok: '#6ccf6a',
  purple: '#a78bfa',
} as const;

const colorCache = new Map<string, number>();
/** '#rgb' / '#rrggbb' string to Phaser numeric colour, cached. */
export function hex(col: string): number {
  let v = colorCache.get(col);
  if (v === undefined) {
    v = Phaser.Display.Color.HexStringToColor(col).color;
    colorCache.set(col, v);
  }
  return v;
}

function dpr(): number {
  return window.devicePixelRatio || 1;
}

/** Canvas size in physical pixels (even numbers keep pixel art aligned). */
export function physicalSize(): { w: number; h: number } {
  const d = dpr();
  return { w: Math.round(window.innerWidth * d) & ~1, h: Math.round(window.innerHeight * d) & ~1 };
}

/** Target logical height; the integer camera zoom is picked to get close to it. */
const TARGET_LOGICAL_H = 540;

/**
 * Integer factor between logical pixels (what scenes lay out in) and canvas pixels.
 * Updated on resize; both scene cameras zoom by it so pixel art stays crisp.
 */
export let PIXEL_SCALE = 1;

export function computePixelScale(): number {
  const { w, h } = physicalSize();
  if (!TOUCH) return Math.max(1, Math.round(h / TARGET_LOGICAL_H));
  // a phone: its shorter side decides (it may be held upright), and a logical pixel is never
  // smaller than a page pixel (at the PC rule a small phone drew everything at half size)
  return Math.max(1, Math.round(dpr()), Math.round(Math.min(w, h) / TARGET_LOGICAL_H));
}

/** Logical view size for the current canvas and pixel scale. */
export function logicalSize(scale: Phaser.Scale.ScaleManager): { w: number; h: number } {
  return { w: scale.width / PIXEL_SCALE, h: scale.height / PIXEL_SCALE };
}

export function createConfig(scenes: (typeof Phaser.Scene)[]): Phaser.Types.Core.GameConfig {
  const { w, h } = physicalSize();
  PIXEL_SCALE = computePixelScale();
  return {
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#0b1220',
    width: w,
    height: h,
    render: { pixelArt: true, antialias: false, roundPixels: true },
    // see-through where nothing is drawn: the 3D views draw the world on a canvas underneath
    transparent: true,
    // We size the canvas in physical pixels ourselves and shrink it to CSS size with zoom.
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr() },
    input: { activePointers: 3 },
    fps: { smoothStep: false },
    scene: scenes,
  };
}

/** Resize the canvas to the window. Scenes react to the scale manager's resize event. */
export function applyResize(scale: Phaser.Scale.ScaleManager): void {
  const { w, h } = physicalSize();
  PIXEL_SCALE = computePixelScale();
  scale.setGameSize(w, h);
  // after the size: with scale mode NONE, Phaser only writes the canvas's CSS size when the
  // zoom is set, so zooming first would show the previous size (a maximize fires one resize)
  scale.setZoom(1 / dpr());
}
