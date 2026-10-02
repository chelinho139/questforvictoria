import { PixelCanvas } from '../pixelPainter';

/**
 * A candidate art direction. Every sprite is authored as rows of palette letters at the
 * style's native resolution and shown at `scale` (all art in one style shares the scale,
 * so pixel sizes match across hero, creatures, props and ground).
 */
export interface StyleKit {
  id: string;
  name: string;
  blurb: string;
  scale: number;
  hero(): HTMLCanvasElement[];
  cow(): HTMLCanvasElement[];
  slime(): HTMLCanvasElement;
  skeleton?(): HTMLCanvasElement[];
  tree?(): HTMLCanvasElement;
  /** Tree variants; when present the board plants a whole forest around the path. */
  trees?(): HTMLCanvasElement[];
  /** Iso ground tiles at native size (64/scale × 32/scale). Shared neutral ground if absent. */
  grass?(): HTMLCanvasElement;
  dirt?(): HTMLCanvasElement;
  /** Backdrop colour behind the scene. */
  bg?: string;
  /** Atmosphere painted over the scene (lighting, weather). */
  overlay?: Overlay;
}

export type Overlay = 'ember' | 'snow' | 'spores' | 'glow';

/** How a sprite's silhouette is stroked. */
export type Stroke = 'none' | 'black' | 'thick' | 'selout' | 'soft';

export const INK = '#15121c';

/** Paint letter rows, then stroke the silhouette: none, 1px black, 2px black, or self-coloured. */
export function sprite(rows: string[], pal: Record<string, string>, stroke: Stroke): HTMLCanvasElement {
  const w = Math.max(...rows.map(r => r.length));
  const pad = stroke === 'thick' ? 2 : stroke === 'none' ? 0 : 1;
  const p = new PixelCanvas(w, rows.length, pad);
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch !== '.' && pal[ch] && p.px(x, y, pal[ch])));
  if (stroke === 'black') p.outline(INK);
  else if (stroke === 'thick') p.outline(INK).outline(INK);
  else if (stroke === 'selout') p.outline('auto', 0.42);
  else if (stroke === 'soft') p.outline('#2e1e1e');
  return p.toCanvas();
}

/** Paint letter rows with a palette; optional 1px outline around the silhouette. */
export function fromRows(rows: string[], pal: Record<string, string>, outline: string | null = null): HTMLCanvasElement {
  const w = Math.max(...rows.map(r => r.length));
  const p = new PixelCanvas(w, rows.length, outline ? 1 : 0);
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch !== '.' && pal[ch] && p.px(x, y, pal[ch])));
  if (outline) p.outline(outline);
  return p.toCanvas();
}

/** [shadow, base, rim] for a material in the rim-lit style. */
export type Material = [string, string, string];

/**
 * Rim-lit painting: each material pixel takes its rim colour when it faces open space to
 * the right or above (the backlight), its shadow colour when open space is to the left or
 * below, otherwise its base. Letters in `fixed` (eyes, glows) ignore lighting.
 */
export function litRows(rows: string[], mats: Record<string, Material>, fixed: Record<string, string>): HTMLCanvasElement {
  const w = Math.max(...rows.map(r => r.length));
  const h = rows.length;
  const at = (x: number, y: number) => (y >= 0 && y < h && x >= 0 && x < rows[y].length ? rows[y][x] : '.');
  const p = new PixelCanvas(w, h, 0);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ch = at(x, y);
      if (ch === '.') continue;
      if (fixed[ch]) {
        p.px(x, y, fixed[ch]);
        continue;
      }
      const m = mats[ch];
      if (!m) continue;
      const open = (dx: number, dy: number) => at(x + dx, y + dy) === '.';
      p.px(x, y, open(1, 0) || open(0, -1) ? m[2] : open(-1, 0) || open(0, 1) ? m[0] : m[1]);
    }
  return p.toCanvas();
}

/** Iso diamond tile of size w×h (2:1), colour chosen per pixel. */
export function isoTile(w: number, h: number, fill: (x: number, y: number) => string): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (Math.abs(x + 0.5 - w / 2) / (w / 2) + Math.abs(y + 0.5 - h / 2) / (h / 2) > 1) continue;
      c.fillStyle = fill(x, y);
      c.fillRect(x, y, 1, 1);
    }
  return cv;
}

/** Deterministic 0..1 hash for scattering tile details. */
export function hash(x: number, y: number, s = 0): number {
  let v = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  v = Math.imul(v ^ (v >>> 13), 1274126177);
  return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
}
