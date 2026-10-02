import type { ItemId } from './items';

/**
 * Crafting: recipes made by hand, at a campfire (cooking) or at a forge (smelting ore into
 * bars, then smithing bars into weapons, tools and armour). Campfires and forges are
 * structures you build in the world first.
 */

export type StructureKind = 'campfire' | 'forge';

export interface StructureDef {
  name: string;
  desc: string;
  /** Seconds it lasts once built (Infinity: until the world resets). */
  burn: number;
  /** Solid structures block movement (a small circle, like a rock). */
  solid: boolean;
}

export const STRUCTURES: Record<StructureKind, StructureDef> = {
  campfire: { name: 'Campfire', desc: 'Burns for three minutes and lights up the night. Cook raw food at it.', burn: 180, solid: false },
  forge: { name: 'Forge', desc: 'A stone furnace and an anvil. Smelt ore into bars and smith gear here.', burn: Infinity, solid: true },
};

/** Where a recipe is made: anywhere by hand, or standing at a campfire or a forge. */
export type Station = 'hand' | StructureKind;

export const STATION_NAMES: Record<Station, string> = { hand: 'By hand', campfire: 'Campfire', forge: 'Forge' };

/** How close (world px) you must stand to a campfire or forge to use it. */
export const STATION_REACH = 52;

export interface Recipe {
  id: string;
  station: Station;
  /** What it makes: an item (n of them), or a structure built in front of you. */
  makes: { item: ItemId; n?: number } | { build: StructureKind };
  needs: [ItemId, number][];
}

export const RECIPES: Recipe[] = [
  // by hand
  { id: 'campfire', station: 'hand', makes: { build: 'campfire' }, needs: [['log', 3]] },
  { id: 'forge', station: 'hand', makes: { build: 'forge' }, needs: [['stone', 8], ['log', 2]] },
  // cooking
  { id: 'cooked_meat', station: 'campfire', makes: { item: 'cooked_meat' }, needs: [['meat', 1]] },
  // smelting
  { id: 'iron_bar', station: 'forge', makes: { item: 'iron_bar' }, needs: [['iron_ore', 2], ['log', 1]] },
  { id: 'gold_bar', station: 'forge', makes: { item: 'gold_bar' }, needs: [['gold_nugget', 2], ['log', 1]] },
  // smithing: weapons and tools first, then armour
  { id: 'iron_sword', station: 'forge', makes: { item: 'iron_sword' }, needs: [['iron_bar', 3], ['log', 1]] },
  { id: 'woodcutter_axe', station: 'forge', makes: { item: 'woodcutter_axe' }, needs: [['iron_bar', 2], ['log', 2]] },
  { id: 'pickaxe', station: 'forge', makes: { item: 'pickaxe' }, needs: [['iron_bar', 2], ['log', 2]] },
  { id: 'wooden_shield', station: 'forge', makes: { item: 'wooden_shield' }, needs: [['log', 4], ['iron_bar', 1]] },
  { id: 'iron_shield', station: 'forge', makes: { item: 'iron_shield' }, needs: [['iron_bar', 5]] },
  { id: 'iron_helm', station: 'forge', makes: { item: 'iron_helm' }, needs: [['iron_bar', 3]] },
  { id: 'vigour_amulet', station: 'forge', makes: { item: 'vigour_amulet' }, needs: [['gold_bar', 2]] },
];
