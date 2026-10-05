import type { ItemId } from '../../data/items';
import type { StructureKind } from '../../data/crafting';
import type { NpcId } from '../../data/npcs';

/**
 * What one art style supplies to the game. Every style returns the same shape, so the
 * loader and the in-game style switch treat them alike. Parts are thunks, grouped the way
 * the loading screen shows its steps.
 */

/** Animation frames for one texture key and the scale they are drawn at. */
export interface Frames {
  frames: HTMLCanvasElement[];
  scale: number;
  /** Optional hero animations (idle, attack, jump, flip); see HeroAnim in hdHeroes.ts. */
  anims?: Partial<Record<string, HTMLCanvasElement[]>>;
}

/** 64×32 iso ground tiles at game resolution (pixel styles upscale theirs). */
export interface IsoTiles {
  grass: HTMLCanvasElement[];
  dirt: HTMLCanvasElement[];
  water: HTMLCanvasElement[];
  flower: HTMLCanvasElement;
  floor: HTMLCanvasElement[];
  gate: HTMLCanvasElement;
}

export type CreatureKey = 'goblin0' | 'goblin1' | 'goblin2' | 'skeleton' | 'cow' | 'slime' | 'bonehound' | 'bellringer';

/** How the rider (the hero cropped at the waist) sits on the horse. */
export interface RiderFit {
  /** Rows of the hero texture shown above the saddle. */
  rows: number;
  /** Where the slice's bottom sits below the horse's top edge, in game pixels. */
  below: number;
  /** Horizontal nudge in game pixels, multiplied by facing. */
  dx: number;
}

export interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StyleArt {
  heroes(): { knight: Frames; horse: Frames };
  /** The game's creatures by texture key: the eight below, and every hand-drawn one (creatureArt.ts). */
  creatures(): Record<CreatureKey, Frames> & Record<string, Frames>;
  forest(): { tree: Frames; pine: Frames; rock: Frames; stump: Frames; rubble: Frames };
  /** People in the world (idle frames). */
  npcs(): Record<NpcId, Frames>;
  /** Things you build: the campfire (flame frames) and the forge (glow frames). */
  structures(): Record<StructureKind, Frames>;
  /** Sprites for items lying on the ground, one per item. */
  items(): Record<ItemId, Frames>;
  castle(): { wall: HTMLCanvasElement; tower: HTMLCanvasElement; shadow: HTMLCanvasElement };
  tiles(): IsoTiles;
  rider: RiderFit;
  /** Head-and-shoulders crop of the hero texture for the HUD portrait. */
  portrait: Crop;
}

export const WALL_H = 34;
export const TOWER_H = 58;
/** Tower texture height above its ground point (block + roof + flag). */
export const TOWER_TOP = 118;
