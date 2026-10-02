/**
 * Ground tiles added for the campaign (Millbrook and beyond), drawn straight in the
 * Silhouette palette like the buildings, matching what the HD · Silhouette recolour makes of
 * the grass and dirt: a bridge deck, tilled fields, wilted crops, blighted grass touched by
 * the Blackthorn, and a cobbled square. 64×32 iso diamonds, lit from the top-left.
 */

function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function inDiamond(x: number, y: number, inset = 0): boolean {
  return Math.abs(x + 0.5 - 32) / (32 - inset * 2) + Math.abs(y + 0.5 - 16) / (16 - inset) <= 1;
}

type Paint = (x: number, y: number) => string | null;

function tile(paint: Paint): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 32;
  const c = cv.getContext('2d')!;
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 64; x++) {
      if (!inDiamond(x, y)) continue;
      const col = paint(x, y);
      if (!col) continue;
      c.fillStyle = col;
      c.fillRect(x, y, 1, 1);
    }
  // the same soft seam along the lower edges as the other tiles
  c.fillStyle = 'rgba(0,0,0,.14)';
  for (let x = 0; x < 64; x++) {
    const y = Math.floor(16 + (x < 32 ? x : 63 - x) / 2);
    if (inDiamond(x, y)) c.fillRect(x, y, 1, 1);
  }
  return cv;
}

/** Patchy two-octave noise in [0, 1). */
function noise(x: number, y: number, s: number): number {
  return hash(x >> 2, y >> 1, s) * 0.6 + hash(x, y, s + 7) * 0.4;
}

const GRASS = ['#4a6454', '#56705f', '#6e8a74'];
const EARTH = ['#3a2e2a', '#4a3c34', '#5e4e46', '#7c6c58', '#8c7c66', '#a8987e'];

/**
 * Iso tile axes: moving +1 along world x goes 2 px right and 1 px down; along world y,
 * 2 px left and 1 px down. Tile-local world coordinates of pixel (x, y):
 */
function local(x: number, y: number): { u: number; v: number } {
  // u along world x, v along world y, both 0..32 across the tile
  const a = (x + 0.5 - 32) / 2; // (u - v) / 2 * ... in px units
  const b = y + 0.5;
  return { u: a + b, v: b - a };
}

/** Smooth value noise over tile-local world coordinates (cells of `k` units), wrapping at 32. */
function smooth(u: number, w: number, k: number, s: number): number {
  const n = 32 / k;
  const fu = u / k;
  const fw = w / k;
  const iu = Math.floor(fu);
  const iw = Math.floor(fw);
  const tu = fu - iu;
  const tw = fw - iw;
  const at = (a: number, b: number) => hash(((a % n) + n) % n, ((b % n) + n) % n, s);
  const e = (t: number) => t * t * (3 - 2 * t);
  const top = at(iu, iw) + (at(iu + 1, iw) - at(iu, iw)) * e(tu);
  const bot = at(iu, iw + 1) + (at(iu + 1, iw + 1) - at(iu, iw + 1)) * e(tu);
  return top + (bot - top) * e(tw);
}

/** Grass greyed by the Blackthorn: ashen patches spreading through it, dead stalks. */
function blight(v: number): HTMLCanvasElement {
  const ash = ['#5c625c', '#747a74', '#8a9088'];
  const cv = tile((x, y) => {
    const { u, v: w } = local(x, y);
    // some tiles barely touched, some nearly all ash
    const lean = (hash(v, 9, 250) - 0.5) * 0.24;
    const p = smooth(u, w, 8, 200 + v) * 0.7 + smooth(u, w, 4, 220 + v) * 0.3 + lean;
    const n = hash(x, y, 230 + v);
    if (p > 0.58) return n < 0.25 ? ash[0] : n < 0.8 ? ash[1] : ash[2];
    if (p > 0.52) return n < 0.5 ? '#5e6a62' : ash[0];
    return n < 0.25 ? GRASS[0] : n < 0.75 ? GRASS[1] : '#64786a';
  });
  const c = cv.getContext('2d')!;
  // a few dead stalks
  for (let i = 0; i < 7; i++) {
    const x = 8 + Math.floor(hash(i, v, 240) * 48);
    const y = 5 + Math.floor(hash(v, i, 241) * 22);
    if (!inDiamond(x, y, 3)) continue;
    c.fillStyle = '#3a403c';
    c.fillRect(x, y - 2, 1, 3);
    c.fillStyle = '#9aa39c';
    c.fillRect(x + (hash(i, v, 242) < 0.5 ? -1 : 1), y - 3, 1, 1);
  }
  return cv;
}

/** A furrowed field, rows along world x; `wilted` turns the sprouts to dry stalks. */
function field(v: number, wilted: boolean): HTMLCanvasElement {
  const cv = tile((x, y) => {
    const { v: w } = local(x, y);
    const row = Math.floor(w / 4);
    const d = w - row * 4;
    const n = hash(x, y, 300 + v);
    if (d < 1.2) return n < 0.5 ? EARTH[1] : EARTH[0]; // furrow
    if (d < 2) return EARTH[2];
    return n < 0.3 ? EARTH[3] : EARTH[4]; // ridge, lit
  });
  const c = cv.getContext('2d')!;
  // sprouts on the ridges, in rows
  for (let i = 0; i < 26; i++) {
    const x = 6 + Math.floor(hash(i, v, 310) * 52);
    const y = 4 + Math.floor(hash(v, i, 311) * 24);
    if (!inDiamond(x, y, 2)) continue;
    const { v: w } = local(x, y);
    if (w - Math.floor(w / 4) * 4 < 2.2) continue;
    if (wilted) {
      c.fillStyle = '#6e5a30';
      c.fillRect(x, y - 1, 1, 2);
      c.fillStyle = '#a08440';
      c.fillRect(hash(i, 3, v) < 0.5 ? x - 1 : x + 1, y - 2, 1, 1);
    } else {
      c.fillStyle = '#3c5a4a';
      c.fillRect(x, y, 1, 1);
      c.fillStyle = '#6e8a74';
      c.fillRect(x - 1, y - 1, 1, 1);
      c.fillRect(x + 1, y - 1, 1, 1);
      c.fillStyle = '#a4b094';
      c.fillRect(x, y - 2, 1, 1);
    }
  }
  return cv;
}

/** Cobbles: rounded stones of different sizes (a jittered grid, nearest-point cells), dark
 * joints between them, each lit on its top-left and shaded on its bottom-right. */
function cobble(v: number): HTMLCanvasElement {
  const st = ['#5c625c', '#747a74', '#9aa39c', '#b2b8b0'];
  const G = 6;
  const n = 32 / G;
  const pt = (i: number, j: number) => {
    const wi = ((i % n) + n) % n;
    const wj = ((j % n) + n) % n;
    return { u: i * G + 1 + hash(wi, wj, 400 + v) * (G - 2), w: j * G + 1 + hash(wj, wi, 410 + v) * (G - 2), tone: hash(wi, wj, 420 + v) };
  };
  return tile((x, y) => {
    const { u, v: w } = local(x, y);
    const i0 = Math.floor(u / G);
    const j0 = Math.floor(w / G);
    let d1 = 1e9;
    let d2 = 1e9;
    let best = pt(i0, j0);
    for (let i = i0 - 1; i <= i0 + 1; i++)
      for (let j = j0 - 1; j <= j0 + 1; j++) {
        const p = pt(i, j);
        const d = (p.u - u) ** 2 + (p.w - w) ** 2;
        if (d < d1) {
          d2 = d1;
          d1 = d;
          best = p;
        } else if (d < d2) d2 = d;
      }
    if (Math.sqrt(d2) - Math.sqrt(d1) < 1.1) return '#3a403c';
    const base = best.tone < 0.5 ? 1 : 2;
    // lit from the top-left: toward -u (up-left on screen) and -w (up-right)
    const du = u - best.u;
    const dw = w - best.w;
    if (du + dw < -2.2) return st[base + 1];
    if (du + dw > 2.2) return st[base - 1];
    return st[base];
  });
}

/** A plank deck (the bridge over the Lisle): boards across world y, nails at their ends. */
function deck(v: number): HTMLCanvasElement {
  const wood = ['#3a2e2a', '#5e4e46', '#7c6c58', '#8c7c66', '#a8987e'];
  return tile((x, y) => {
    const { u, v: w } = local(x, y);
    const board = Math.floor(u / 5);
    const fu = u - board * 5;
    if (fu < 0.9) return wood[0];
    if (w < 1.5 || w > 30.5) return wood[1];
    if ((w > 3 && w < 4.2) || (w > 27.8 && w < 29)) return fu > 2 && fu < 3 ? '#5c625c' : wood[2];
    const n = hash(board, Math.floor(w / 6), 500 + v);
    if (fu < 1.8) return wood[4];
    return n < 0.4 ? wood[2] : wood[3];
  });
}

/** Rough flagstones (the bell tower floor). */
function flags(v: number): HTMLCanvasElement {
  const st = ['#38444c', '#46545c', '#5e6e76', '#747a74'];
  return tile((x, y) => {
    const { u, v: w } = local(x, y);
    const cu = Math.floor(u / 10);
    const cw = Math.floor(w / 8 + (cu % 2) * 0.5);
    const fu = u / 10 - cu;
    const fw = w / 8 + (cu % 2) * 0.5 - cw;
    if (fu < 0.07 || fw < 0.09) return st[0];
    const n = noise(x, y, 600 + v);
    const base = hash(cu, cw, 610 + v) < 0.5 ? 1 : 2;
    if (fu < 0.18 && fw < 0.3) return st[base + 1];
    return n < 0.2 ? st[base - 1] : st[base];
  });
}

export interface GroundTiles {
  blight: HTMLCanvasElement[];
  field: HTMLCanvasElement[];
  wilted: HTMLCanvasElement[];
  cobble: HTMLCanvasElement[];
  deck: HTMLCanvasElement[];
  flags: HTMLCanvasElement[];
}

let cache: GroundTiles | null = null;

/** The campaign's ground tiles (drawn once). */
export function groundTiles(): GroundTiles {
  return (cache ??= {
    blight: [0, 1, 2, 3, 4, 5, 6, 7].map(blight),
    field: [0, 1].map(v => field(v, false)),
    wilted: [0, 1].map(v => field(v, true)),
    cobble: [0, 1].map(cobble),
    deck: [0].map(deck),
    flags: [0, 1].map(flags),
  });
}
