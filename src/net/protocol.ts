/**
 * The messages between a browser and the game server (one WebSocket, JSON). The server is
 * the game: the browser sends what its player does and gets back what happened.
 *
 * Browser → server
 *   hello   my account key (kept in this browser) and which protocol I speak
 *   chars   my characters, please
 *   newChar make a character (name, look)
 *   delChar delete one of my characters
 *   list    the open rooms, please
 *   host    open a room with this name and difficulty, and put this character of mine in it
 *   join    put this character of mine in this room
 *   leave   take me out of my room
 *   move    where my hero is now (20 a second while it moves; my browser walks it)
 *   cmd     do this (a command from the whitelist in net/commands.ts, with its arguments;
 *           duels too: challenge, accept, quit, target my opponent)
 *   ping    are you there (the answer gives the round trip)
 *
 * Server → browser
 *   welcome hello back (my client id, and my characters)
 *   chars   my characters (after a change; `made` is the one just made)
 *   rooms   the open rooms
 *   joined  you are in a room, playing this hero
 *   left    you are out of your room
 *   tick    what changed, 20 a second while in a room (see Tick), and the events since the last one
 *   error   something you asked for could not be done (a message to show)
 *   pong    the answer to a ping
 */

import type { ItemId, Slot } from '../data/items';
import type { ClassId } from '../data/classes';
import type { Difficulty } from '../data/difficulty';
import type { Work } from '../sim/types';
import type { DuelView, DuelFlag } from '../sim/Duel';

/** Bump when a message changes shape: the server turns away a browser that speaks another. */
export const PROTOCOL = 7;

/** Players a room takes. */
export const ROOM_MAX = 8;

/** Server ticks (and snapshots) per second. */
export const TICK_HZ = 20;

/** Characters an account can keep. */
export const CHAR_MAX = 8;

/** A character's name: 2 to 14 letters, digits, spaces, apostrophes or hyphens, starting with a letter or digit. */
export const CHAR_NAME = /^[\p{L}\p{N}][\p{L}\p{N} '-]{1,13}$/u;

/** One of my characters, as the character screen shows it. */
export interface CharInfo {
  id: string;
  name: string;
  /** Which hero they look like (an HD hero id). */
  look: string;
  /** Warrior or archer. */
  cls: ClassId;
  level: number;
  /** What they wear, by slot (to draw them). */
  equip: Partial<Record<Slot, ItemId | null>>;
  /** Where they were last (a region name). */
  place: string;
  /** Last played (ms since 1970); 0 = never. */
  at: number;
  /** Playing right now (in another tab or browser). */
  busy: boolean;
  /** How hard their campaign is (online: the last room they opened). */
  difficulty: Difficulty;
}

export interface RoomInfo {
  id: string;
  name: string;
  players: { name: string; level: number }[];
  max: number;
  /** Where the party is (the first hero's region name). */
  place: string;
  /** How far the story has come (a short line). */
  story: string;
  difficulty: Difficulty;
}

export type C2S =
  | { t: 'hello'; v: number; account: string }
  | { t: 'chars' }
  | { t: 'newChar'; name: string; look: string; cls: ClassId }
  | { t: 'delChar'; id: string }
  | { t: 'list' }
  /** Without a difficulty, the room is as hard as the character's campaign. */
  | { t: 'host'; name: string; char: string; difficulty?: Difficulty }
  | { t: 'join'; room: string; char: string }
  | { t: 'leave' }
  | {
      t: 'move';
      x: number;
      y: number;
      face: 1 | -1;
      walk: number;
      jumpT: number;
      jumpFlip: boolean;
    }
  | { t: 'cmd'; c: string; a: unknown[] }
  | { t: 'ping'; n: number };

export type S2C =
  | { t: 'welcome'; id: string; chars: CharInfo[] }
  | { t: 'chars'; chars: CharInfo[]; made?: string }
  | { t: 'rooms'; rooms: RoomInfo[] }
  | { t: 'joined'; room: RoomInfo; hero: string }
  | { t: 'left' }
  | ({ t: 'tick' } & Tick)
  /** `about` says which request failed, when the screen that sent it should show the message. */
  | { t: 'error'; msg: string; about?: 'newChar' }
  | { t: 'pong'; n: number };

/** An event and who heard it: 'h' the hero, 'r' the region, 'g' the room. */
export type NetEvent = [aud: 'h' | 'r' | 'g', name: string, payload: unknown];

/**
 * One snapshot. `me`, `en` (creatures), `hs` (the other heroes here), `cp` (companions) and
 * `wd` (wanderers) come every tick; every other part only when it changed (absent = as before).
 */
export interface Tick {
  /** The hero's region (a change rebuilds the world). */
  rg: string;
  /** Vitals and state of my hero, every tick. */
  me: MeSnap;
  /** My hero's bag, gear, bar, talents, met people: when they change. */
  mf?: MeFull;
  en: EnemySnap[];
  hs: HeroSnap[];
  /** Companions walking with the heroes here (every tick while there are any). */
  cp?: CompanionSnap[];
  /** Snares in the grass: [x, y]. */
  sn?: [number, number][];
  wd?: [id: string, x: number, y: number, alpha: number, face: number][];
  dr?: DropSnap[];
  /** Trees and rocks that are not as they grew: [index, hp, stumpT/brokenT, shakeT]. */
  tr?: [number, number, number, number][];
  rk?: [number, number, number, number][];
  st?: unknown[];
  ob?: unknown[];
  np?: [string, number][];
  pr?: unknown[];
  hz?: unknown[];
  /** Bear traps: [x, y]. */
  tz?: [number, number][];
  sc?: unknown;
  /** The story: flags, quests, journal (when they change). */
  sy?: { flags: Record<string, number>; quests: Record<string, unknown>; journal: string[] };
  /** The day: [t, day number] (every second). */
  dy?: [number, number];
  /** The weather (with the day): [clock, seed, rain, storm, wind, forced] (Weather.snapshot). */
  wx?: [number, number, number, number, number, number];
  /** How hard the room is (when it changes). */
  df?: Difficulty;
  /** My duel, or the challenge I made or was made (null: none), when it changes. */
  du?: DuelView | null;
  /** The duels with a flag in my region (when they change). */
  dl?: DuelFlag[];
  ev?: NetEvent[];
}

export interface MeSnap {
  x: number;
  y: number;
  tp: number;
  /** The archer's: holding still to shoot, Predator, Camouflage. */
  aimT: number;
  predatorT: number;
  hiddenT: number;
  /** Held still (and by what), and slowed. */
  heldT: number;
  heldBy: string;
  slowT: number;
  slowK: number;
  /** Stunned (by a duel opponent). */
  stunT: number;
  /** Keepsakes waiting before they can be used again (by item id). */
  itemCd: Record<string, number>;
  hp: number;
  hpMax: number;
  mp: number;
  mpMax: number;
  t: number;
  dead: number;
  flash: number;
  shake: number;
  buffT: number;
  invT: number;
  bleedT: number;
  berserkT: number;
  lastStandT: number;
  mortalCd: number;
  intCd: number;
  dodgeCd: number;
  atkAnimT: number;
  swing: number;
  mounted: boolean;
  mountT: number;
  /** Chopping, mining or making something, and how far along (the progress bar). */
  work: Work | null;
  /** My target: a creature's id, RIVAL_TARGET (sim/Duel.ts) for my duel opponent, 0 for none. */
  target: number;
  cds: Record<string, number>;
  acd: Record<string, number>;
  exiting: { to: string; at: string } | null;
  rev: boolean;
  revAuto: boolean;
  revEnabled: boolean;
  seqI: number;
}

export interface MeFull {
  cls: ClassId;
  level: number;
  xp: number;
  gold: number;
  kills: number;
  perf: number;
  look: string;
  name: string;
  talents: Record<string, number>;
  bag: unknown[];
  equip: Record<string, string | null>;
  bar: (string | null)[];
  met: string[];
  /** My own quests: on them, or handed in (the room's progress is in `sy`). */
  quests: Record<string, 'active' | 'done'>;
  /** Duels won and lost. */
  duels: [won: number, lost: number];
}

export type EnemySnap = [
  id: number,
  kind: string,
  x: number,
  y: number,
  hp: number,
  hpMax: number,
  flags: number,
  dieT: number,
  riseT: number,
  face: number,
  walk: number,
  castT: number,
  castTotal: number,
  stunT: number,
  phase: number,
  sunderT: number,
  /** Up in the air: dropping from the canopy, or on a leap. */
  z: number,
];

export type CompanionSnap = [
  id: string,
  x: number,
  y: number,
  face: number,
  walk: number,
  hp: number,
  hpMax: number,
  /** Seconds left on one knee. */
  dead: number,
  atkAnimT: number,
  /** 1 flashing (just hit), 2 slowed. */
  flags: number,
  heldBy: string,
  /** What she is shooting at (an enemy id, 0 for nothing). */
  target: number,
];

export type HeroSnap = [
  id: string,
  name: string,
  look: string,
  x: number,
  y: number,
  face: number,
  walk: number,
  hp: number,
  hpMax: number,
  dead: number,
  flags: number,
  jumpT: number,
  atkAnimT: number,
  equip: string,
  level: number,
  cls: ClassId,
  /** What holds them still ('' while nothing does). */
  heldBy: string,
  /** Duels won and lost. */
  won: number,
  lost: number,
];

export type DropSnap = [
  uid: number,
  id: string,
  n: number,
  x: number,
  y: number,
  z: number,
  age: number,
];
