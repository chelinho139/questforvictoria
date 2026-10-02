/**
 * Recolour finished sprites into the Silhouette palette while keeping every pixel's
 * position: each colour is sorted into a family by hue (greens, blues, reds, browns, skin,
 * neutrals…) and replaced by the entry of that family's Silhouette ramp closest in
 * lightness. Used to give the HD art the Silhouette mood without redrawing it.
 */

type Rgb = [number, number, number];

const hexRgb = (h: string): Rgb => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

function hsl([r, g, b]: Rgb): [number, number, number] {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  h *= 60;
  return [h, s, l];
}

/** Silhouette ramps, dark to light (the board's misty muted palette). */
const RAMPS = {
  foliage: ['#24352c', '#2c4438', '#3c5a4a', '#4a6454', '#56705f', '#6e8a74'],
  olive: ['#2e3428', '#434c38', '#5a664b', '#6f7c5c', '#8a9878', '#a4b094'],
  stone: ['#1d1b22', '#3a403c', '#5c625c', '#747a74', '#9aa39c', '#c8ccc6', '#e6e0d2'],
  slate: ['#1d1b22', '#2e3840', '#38444c', '#46545c', '#5e6e76', '#8a98a0'],
  teal: ['#3e5660', '#6a8890', '#8aa4ac', '#a8c0c6'],
  plum: ['#2e2632', '#463b50', '#574a62', '#6e6078', '#8a7e94'],
  rust: ['#3a2226', '#5e3a36', '#7a4a40', '#9a5a4a', '#b87a68'],
  pink: ['#9a6e68', '#b88a80', '#c89088', '#dcb0a8'],
  skin: ['#8a6e5a', '#b8977c', '#d9b99b', '#e8d0b8'],
  ochre: ['#6e5a30', '#a08440', '#c9a24e', '#d8c070'],
  earth: ['#2a2226', '#4a3c34', '#5e4e46', '#7c6c58', '#8c7c66', '#a8987e'],
};
type Ramp = keyof typeof RAMPS;

const RAMP_RGB = Object.fromEntries(
  Object.entries(RAMPS).map(([k, v]) => [k, v.map(c => ({ rgb: hexRgb(c), l: hsl(hexRgb(c))[2] }))])
) as Record<Ramp, { rgb: Rgb; l: number }[]>;

export interface RegradeOpts {
  /** Creatures use olive so they stand out from the grass; plants and ground use foliage. */
  greens?: 'foliage' | 'olive';
}

function family([h, s, l]: [number, number, number], o: RegradeOpts): Ramp {
  if (s < 0.12 || l > 0.9) return 'stone';
  if (h >= 70 && h < 170) return o.greens ?? 'foliage';
  if (h >= 170 && h < 200) return 'teal';
  if (h >= 200 && h < 255) return l > 0.85 ? 'stone' : 'slate';
  if (h >= 255 && h < 320) return 'plum';
  if (h >= 320 || h < 12) return l > 0.68 ? 'pink' : 'rust';
  // 12°–70°: skin, gold or earth
  if (l > 0.62 && h < 42 && s > 0.3) return 'skin';
  if (h >= 38 && s > 0.55 && l > 0.45) return 'ochre';
  return 'earth';
}

/** Map one colour: its family's ramp entry nearest in (slightly compressed) lightness. */
function mapColour(rgb: Rgb, o: RegradeOpts): Rgb {
  const c = hsl(rgb);
  const ramp = RAMP_RGB[family(c, o)];
  const target = 0.1 + 0.8 * c[2]; // a little less contrast: the misty Silhouette look
  let best = ramp[0];
  for (const e of ramp) if (Math.abs(e.l - target) < Math.abs(best.l - target)) best = e;
  return best.rgb;
}

/** A recoloured copy of a canvas. Transparent pixels stay transparent. */
export function regrade(src: HTMLCanvasElement, o: RegradeOpts = {}): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = src.width;
  cv.height = src.height;
  const c = cv.getContext('2d')!;
  c.drawImage(src, 0, 0);
  const img = c.getImageData(0, 0, cv.width, cv.height);
  const d = img.data;
  const cache = new Map<number, Rgb>();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    let out = cache.get(key);
    if (!out) {
      out = mapColour([d[i], d[i + 1], d[i + 2]], o);
      cache.set(key, out);
    }
    d[i] = out[0];
    d[i + 1] = out[1];
    d[i + 2] = out[2];
  }
  c.putImageData(img, 0, 0);
  return cv;
}
