import type { RiderFit, Crop } from './styleArt';
import type { HdHeroId, Gear } from './hdHeroes';

/**
 * Which art style is loaded, and per-texture facts the renderer needs: the display scale
 * and how many walk frames exist. The style is read at boot and can be switched in place
 * mid-game (see applyStyleTextures).
 */

export type SpriteStyle = 'hdsil' | 's1h' | 'c2' | 'c3' | 'sil';

export const STYLE_LABELS: Record<SpriteStyle, string> = {
  hdsil: 'HD · Silhouette colours',
  s1h: 'S1h · Big head, hooded',
  c2: 'C2 · Ink contrast',
  c3: 'C3 · Rich summer',
  sil: '1 · Silhouette',
};

/** The styles still in the running, in the order the V key cycles through them (first is the default). */
export const CANDIDATE_STYLES: SpriteStyle[] = ['hdsil', 's1h', 'c2', 'c3', 'sil'];

const ALL = Object.keys(STYLE_LABELS) as SpriteStyle[];
const STORAGE_KEY = 'qfv-art-style';
let current: SpriteStyle = CANDIDATE_STYLES[0];

export function readSpriteStyle(): SpriteStyle {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as SpriteStyle | null;
    return v && ALL.includes(v) ? v : CANDIDATE_STYLES[0];
  } catch {
    return CANDIDATE_STYLES[0];
  }
}

export function writeSpriteStyle(style: SpriteStyle): void {
  try {
    localStorage.setItem(STORAGE_KEY, style);
  } catch {
    /* ignore */
  }
}

export function spriteStyle(): SpriteStyle {
  return current;
}

export function setSpriteStyle(style: SpriteStyle): void {
  current = style;
}

/** Which hero the HD style (HD · Silhouette colours) draws. */
export const HD_HERO_LABELS: Record<HdHeroId, string> = {
  k1: 'K1 · Knight',
  k2: 'K2 · Squire',
  k3: 'K3 · Silver knight',
  hood: 'H1 · Sprout',
  wanderer: 'H2 · Wanderer',
  traveller: 'H3 · Traveller',
  cute: 'H4 · Cute',
  masked: 'H5 · Masked',
};
export const HD_HERO_IDS = Object.keys(HD_HERO_LABELS) as HdHeroId[];
const HERO_KEY = 'qfv-hd-hero';

export function hdHeroId(): HdHeroId {
  try {
    const v = localStorage.getItem(HERO_KEY) as HdHeroId | null;
    return v && HD_HERO_IDS.includes(v) ? v : HD_HERO_IDS[0];
  } catch {
    return HD_HERO_IDS[0];
  }
}

export function setHdHeroId(id: HdHeroId): void {
  try {
    localStorage.setItem(HERO_KEY, id);
  } catch {
    /* ignore */
  }
}

let gear: Gear = {};

/** What the hero wears, as the HD styles draw it (set from the sim's equipment). */
export function heroGear(): Gear {
  return gear;
}

/** Update the worn gear; true when anything changed (and the hero needs redrawing). */
export function setHeroGear(next: Gear): boolean {
  const keys = new Set([...Object.keys(gear), ...Object.keys(next)]) as Set<keyof Gear>;
  const changed = [...keys].some(k => (gear[k] ?? null) !== (next[k] ?? null));
  gear = { ...next };
  return changed;
}

/** Styles that draw the HD hero (and so honour the HD hero choice). */
export function isHdStyle(style: SpriteStyle): boolean {
  return style === 'hdsil';
}

interface ArtInfo {
  scale: number;
  frames: number;
  /** Frame counts of extra animation groups (idle, attack, jump, flip). */
  anims: Record<string, number>;
}

const ART = new Map<string, ArtInfo>();

export function registerArt(key: string, scale: number, frames = 1, anims: Record<string, number> = {}): void {
  ART.set(key, { scale, frames, anims });
}

/** Display scale for a texture key (1 if unknown). */
export function artScale(key: string): number {
  return ART.get(key)?.scale ?? 1;
}

export function artFrames(key: string): number {
  return ART.get(key)?.frames ?? 1;
}

/** Frame count of an animation group for a texture key (0 when the style has none). */
export function artAnim(key: string, group: string): number {
  return ART.get(key)?.anims[group] ?? 0;
}

/** Texture key of frame i of an animation group. */
export function animKey(key: string, group: string, i: number): string {
  return `${key}-${group}~${i}`;
}

/** Texture key of animation frame i (frame 0 is the base key). */
export function frameKey(key: string, i: number): string {
  return i > 0 ? `${key}~${i}` : key;
}

let rider: RiderFit = { rows: 23, below: 13, dx: 0 };
let portrait: Crop = { x: 2, y: 0, w: 16, h: 13 };

/** Set by the texture loader from the loaded style's art. */
export function setStyleFit(r: RiderFit, p: Crop): void {
  rider = r;
  portrait = p;
}

/** How the rider sits on the horse in the loaded style. */
export function riderFit(): RiderFit {
  return rider;
}

/** Head-and-shoulders crop of the hero texture for the HUD portrait. */
export function portraitCrop(): Crop {
  return portrait;
}
