import type { EnemyKind } from '../enemies';
import type { NpcId } from '../npcs';
import type { Cond, Effect } from '../story';
import type { PropKind } from '../props';

/** How deep into the Blackthorn a region lies (docs/lore.md): 0 untouched to 5 Thornhallow. */
export type Ring = 0 | 1 | 2 | 3 | 4 | 5;

/** A tile [column, row]. */
export type At = [number, number];

export interface RegionSpawn {
  kind: EnemyKind;
  at: At;
  /** Only placed while this holds (checked when you enter the region). */
  when?: Cond;
}

export interface RegionNpc {
  id: NpcId;
  at: At;
  when?: Cond;
}

/** Walk into `area` (tiles, inclusive) to travel to region `to`, arriving at its spot `at`. */
export interface RegionExit {
  area: [number, number, number, number];
  to: string;
  at: string;
  when?: Cond;
  /** Said when the exit is closed (`when` fails). */
  locked?: string;
}

/** What an object looks like (each has a sprite in the HD art). */
export type ObjectKind = 'page' | 'board' | 'chest' | 'thorn' | 'letter';

/**
 * Something you can click (or use with the gather key) in the world: a page in the grass,
 * a notice board, a chest. Using it says `say`, applies `then` and, when `once`, it is gone
 * for good (remembered by the flag `used:<region>:<id>`).
 */
export interface RegionObject {
  id: string;
  kind: ObjectKind;
  at: At;
  name: string;
  say?: string;
  then?: Effect;
  once?: boolean;
  /** Shown only while this holds (checked as you play: a letter that is there only at night). */
  when?: Cond;
  /** It can only be used while this holds; otherwise it says `needSay`. */
  need?: Cond;
  needSay?: string;
}

/** Walk into `area` (tiles, inclusive) to play `scene` (once, while `when` holds). */
export interface RegionTrigger {
  area: [number, number, number, number];
  scene: string;
  when?: Cond;
}

/**
 * Someone who walks a route and can't be talked to (the grey postman): drawn from
 * render/npcArt.ts, fading as you come near, saying `say` when you try.
 */
export interface RegionWanderer {
  id: 'postman';
  route: At[];
  when?: Cond;
  say: string;
}

/** A building or big prop (data/props.ts); `at` is the north corner of its footprint. */
export interface RegionProp {
  kind: PropKind;
  at: At;
  when?: Cond;
}

export interface RegionDef {
  name: string;
  ring: Ring;
  /** One string per row, one character per tile (see TILE_CHARS in sim/map.ts). */
  layout: string[];
  /** Named tiles: `start` (new game and respawn) and the arrival points of exits. */
  spots: Record<string, At> & { start: At };
  exits: RegionExit[];
  spawns: RegionSpawn[];
  npcs: RegionNpc[];
  objects?: RegionObject[];
  props?: RegionProp[];
  triggers?: RegionTrigger[];
  wanderers?: RegionWanderer[];
  /** Indoors: as dim as dusk all day; lit only by `lights` (torches, tiles). */
  indoor?: boolean;
  lights?: At[];
  /** Scenes to play here (each once): on arrival, or as soon as `when` holds while you're here. */
  onEnter?: { scene: string; when?: Cond }[];
  /** Dev-only regions are reachable from the settings panel, never from play. */
  dev?: boolean;
}
