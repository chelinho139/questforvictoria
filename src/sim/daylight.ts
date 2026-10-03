/**
 * Time of day. `t` is normalised in [0, 1): 0 = midnight, 0.25 = sunrise, 0.5 = noon,
 * 0.75 = sunset. Engine-free; the lighting renderer samples the gradient from it.
 */
export const DAY_LENGTH_S = 600; // 10 real minutes per in-game day

export class DayCycle {
  t: number;
  /** Day number, starting at 1; increases each time the clock passes midnight. */
  day = 1;
  paused = false;

  constructor(initialT = 0.42, public dayLengthS = DAY_LENGTH_S) {
    this.t = wrap01(initialT);
  }

  advance(dt: number): void {
    if (this.paused || !(dt > 0)) return;
    const next = this.t + dt / this.dayLengthS;
    if (next >= 1) this.day += Math.floor(next);
    this.t = wrap01(next);
  }

  set(t: number): void {
    this.t = wrap01(t);
  }

  /** How many times faster than the normal day the clock runs; 0 stops it. */
  setSpeed(speed: number): void {
    this.paused = speed === 0;
    if (speed > 0) this.dayLengthS = DAY_LENGTH_S / speed;
  }

  /** Clock text like "06:30". */
  get clock(): string {
    const mins = Math.floor(this.t * 24 * 60);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Name of the part of the day, as shown under the HUD dial. */
export function phaseName(t: number): string {
  const w = wrap01(t);
  if (w < 0.21) return 'Night';
  if (w < 0.3) return 'Dawn';
  if (w < 0.45) return 'Morning';
  if (w < 0.55) return 'Noon';
  if (w < 0.7) return 'Afternoon';
  if (w < 0.82) return 'Dusk';
  return 'Night';
}

/** Named times used by the T key to scrub the clock. */
export const DAY_PRESETS: { t: number; label: string }[] = [
  { t: 0.25, label: 'Dawn' },
  { t: 0.5, label: 'Noon' },
  { t: 0.78, label: 'Sunset' },
  { t: 0.0, label: 'Night' },
];

/**
 * Darkness colour to subtract from the scene at each time (0..255 per channel).
 * Reads inverted: bright R+G / low B eats warm tones, so night comes out blue;
 * bright B / low R eats cool tones, so dusk comes out golden; (0,0,0) is noon,
 * the scene renders as authored. Adapted from the realms engine's gradient.
 */
const GRADIENT: ({ t: number } & Rgb)[] = [
  { t: 0.0, r: 225, g: 205, b: 75 },
  { t: 0.2, r: 195, g: 180, b: 90 },
  { t: 0.24, r: 140, g: 150, b: 175 },
  { t: 0.27, r: 35, g: 105, b: 200 },
  { t: 0.33, r: 15, g: 35, b: 70 },
  { t: 0.5, r: 0, g: 0, b: 0 },
  { t: 0.66, r: 12, g: 30, b: 65 },
  { t: 0.74, r: 30, g: 95, b: 185 },
  { t: 0.8, r: 55, g: 120, b: 215 },
  { t: 0.86, r: 110, g: 125, b: 165 },
  { t: 0.93, r: 195, g: 175, b: 70 },
];

/** Sample the darkness gradient at time `t`, wrapping around midnight. */
export function ambientDarkness(t: number): Rgb {
  const w = wrap01(t);
  const keys = GRADIENT;
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (w >= last.t || w < first.t) {
    const span = 1 - last.t + first.t;
    const local = w >= last.t ? w - last.t : 1 - last.t + w;
    return lerp(last, first, span > 0 ? local / span : 0);
  }
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (w >= a.t && w < b.t) return lerp(a, b, (w - a.t) / (b.t - a.t));
  }
  return { r: first.r, g: first.g, b: first.b };
}

/**
 * The Blackthorn darkens the land ring by ring (docs/lore.md): rings 1 to 3 dim and sicken
 * the light (a little less red and blue taken away keeps a grey-green cast), ring 4 (and a
 * region under the grave-mist) never gets brighter than dusk, and Thornhallow (ring 5) is
 * always night.
 */
const RING_DIM: Rgb[] = [
  { r: 0, g: 0, b: 0 },
  { r: 22, g: 18, b: 14 },
  { r: 52, g: 28, b: 52 },
  { r: 84, g: 52, b: 80 },
];

export function ringDarkness(base: Rgb, ring: number, dusk = false): Rgb {
  // under the grave-mist (a region at dusk all day) it is as ring 4: never lighter than dusk
  if (ring >= 4 || dusk) {
    const floor = ring >= 5 ? ambientDarkness(0) : ambientDarkness(0.8);
    return { r: Math.max(base.r, floor.r + 30), g: Math.max(base.g, floor.g + 20), b: Math.max(base.b, floor.b) };
  }
  const d = RING_DIM[Math.max(0, ring)];
  return { r: Math.min(255, base.r + d.r), g: Math.min(255, base.g + d.g), b: Math.min(255, base.b + d.b) };
}

/**
 * The hour as the Blackthorn makes it look: from ring 2 the day is shorter (night comes
 * earlier and goes later, as Region.isNight has it), so the light is taken a little further
 * from noon.
 */
export function ringHour(t: number, ring: number): number {
  if (ring < 2) return t;
  const d = wrap01(t) - 0.5;
  return 0.5 + Math.max(-0.5, Math.min(0.5, d * 1.1));
}

/** 0 at noon, 1 at deepest night: handy for gameplay or UI that cares about darkness. */
export function darknessLevel(t: number): number {
  const c = ambientDarkness(t);
  return Math.max(c.r, c.g, c.b) / 255;
}

function lerp(a: Rgb, b: Rgb, k: number): Rgb {
  return { r: a.r + (b.r - a.r) * k, g: a.g + (b.g - a.g) * k, b: a.b + (b.b - a.b) * k };
}

function wrap01(t: number): number {
  const w = t - Math.floor(t);
  return w < 0 ? w + 1 : w;
}
