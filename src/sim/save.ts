import type { ItemId, Slot } from '../data/items';
import type { SpellKey } from '../data/spells';
import type { NpcId } from '../data/npcs';
import type { Stack, Structure, QuestProgress } from './types';

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
}

/** A short line for the start screen: who, how far, where. */
export interface SaveSummary {
  level: number;
  region: string;
  at: number;
}
