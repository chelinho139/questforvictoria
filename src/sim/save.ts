import type { ItemId, Slot } from '../data/items';
import type { SpellKey } from '../data/spells';
import type { NpcId } from '../data/npcs';
import type { Stack, Structure, QuestProgress } from './types';
import type { ClassId } from '../data/classes';

/** Bump when the shape changes in a way old saves can't be read as. */
export const SAVE_VERSION = 1;

/**
 * A saved campaign: everything that has to survive a reload. Creatures, trees and rocks
 * are not saved; they reset when you come back to a region.
 */
export interface SaveData {
  v: number;
  /** When it was saved (ms since 1970). */
  at: number;
  /** Warrior or archer (saves from before classes have none: warriors). */
  cls?: ClassId;
  region: string;
  x: number;
  y: number;
  hp: number;
  mp: number;
  level: number;
  xp: number;
  gold: number;
  kills: number;
  talents: Record<string, number>;
  bag: (Stack | null)[];
  equip: Record<Slot, ItemId | null>;
  bar: (SpellKey | null)[];
  quests: Record<string, QuestProgress>;
  flags: Record<string, number>;
  met: NpcId[];
  /** Documents found (diary pages, letters, notes), in the order found. */
  journal: string[];
  day: { t: number; day: number };
  /** What you built in each region (forges stay; campfires keep their burn time). */
  built: Record<string, Structure[]>;
  /** Duels won and lost (saves from before duels have none). */
  duels?: { won: number; lost: number };
}

/** A save this version of the game can read. */
export function readableSave(d: SaveData | null | undefined): d is SaveData {
  return !!d && d.v === SAVE_VERSION && typeof d.region === 'string' && !!d.quests && !!d.flags;
}

/**
 * The story a hero knows after playing in someone else's game: everything they knew, plus
 * what they saw happen there. The room's flags win (a flag can be cleared); a quest never
 * goes back from done; documents found are kept in the order found.
 */
export function mergeStory(own: SaveData, room: SaveData): Pick<SaveData, 'quests' | 'flags' | 'journal'> {
  const quests: SaveData['quests'] = { ...own.quests };
  for (const [id, q] of Object.entries(room.quests)) if (quests[id]?.state !== 'done') quests[id] = q;
  const journal = own.journal.slice();
  for (const id of room.journal) if (!journal.includes(id)) journal.push(id);
  return { quests, flags: { ...own.flags, ...room.flags }, journal };
}
