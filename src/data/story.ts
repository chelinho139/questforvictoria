import type { QuestStatus } from '../sim/types';
import type { ItemId } from './items';

/**
 * Story conditions: when an NPC stands somewhere, a topic can be asked, a creature
 * spawns, an exit opens or a scene plays. Evaluated by the sim (sim/story.ts).
 */
export type Cond =
  | { flag: string }
  | { not: string }
  | { quest: string; is: QuestStatus | QuestStatus[] }
  | { level: number }
  /** true: only at night; false: only by day. Checked when you arrive, and live for objects and wanderers. */
  | { night: boolean }
  | { all: Cond[] }
  | { any: Cond[] };

/** What happens: set or clear flags, find documents, get items, play a scene. */
export interface Effect {
  flags?: string[];
  clear?: string[];
  /** Documents added to the journal (data/docs.ts). */
  docs?: string[];
  items?: ItemId[];
  /** A scene to play (data/scenes.ts). */
  scene?: string;
}
