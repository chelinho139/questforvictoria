import type { ItemId } from './items';
import type { Cond } from './story';

/**
 * Crafting: recipes made by hand, at a campfire (cooking) or at a forge (smelting ore into
 * bars, then smithing bars into weapons, tools and armour). Campfires and forges are
 * structures you build in the world first.
 */

export type StructureKind = 'campfire' | 'forge' | 'kiln';

export interface StructureDef {
  name: string;
  desc: string;
  /** Seconds it lasts once built (Infinity: until the world resets). */
  burn: number;
  /** Solid structures block movement (a small circle, like a rock). */
  solid: boolean;
  /** A fire: it lights the night, and the dead who smother fires go for it. */
  fire?: boolean;
}

export const STRUCTURES: Record<StructureKind, StructureDef> = {
  campfire: { name: 'Campfire', desc: 'Burns for three minutes and lights up the night. Cook raw food at it.', burn: 180, solid: false, fire: true },
  forge: { name: 'Forge', desc: 'A stone furnace and an anvil. Smelt ore into bars and smith gear here.', burn: Infinity, solid: true },
  // Kilnholt's ring of earth kilns (never built: a region's own fires, RegionStructure)
  kiln: { name: 'Kiln', desc: 'An earth kiln, smouldering day and night. The dead won\'t cross a ring of them.', burn: Infinity, solid: true, fire: true },
};

/** Where a recipe is made: anywhere by hand, or standing at a campfire or a forge. */
export type Station = 'hand' | StructureKind;

export const STATION_NAMES: Record<Station, string> = { hand: 'By hand', campfire: 'Campfire', forge: 'Forge', kiln: 'Kiln' };

/** How close (world px) you must stand to a campfire or forge to use it. */
export const STATION_REACH = 52;

export interface Recipe {
  id: string;
  station: Station;
  /** What it makes: an item (n of them), or a structure built in front of you. */
  makes: { item: ItemId; n?: number } | { build: StructureKind };
  needs: [ItemId, number][];
  /** Seconds it takes to make (standing still; the ingredients go when it's done). */
  time: number;
  /** Known only once this holds (someone has taught it); until then it isn't shown. */
  when?: Cond;
}

export const RECIPES: Recipe[] = [
  // by hand
  { id: 'campfire', station: 'hand', makes: { build: 'campfire' }, needs: [['log', 3]], time: 3 },
  { id: 'forge', station: 'hand', makes: { build: 'forge' }, needs: [['stone', 8], ['log', 2]], time: 6 },
  // cooking
  { id: 'cooked_meat', station: 'campfire', makes: { item: 'cooked_meat' }, needs: [['meat', 1]], time: 2 },
  // smelting
  { id: 'iron_bar', station: 'forge', makes: { item: 'iron_bar' }, needs: [['iron_ore', 2], ['log', 1]], time: 3 },
  { id: 'gold_bar', station: 'forge', makes: { item: 'gold_bar' }, needs: [['gold_nugget', 2], ['log', 1]], time: 3 },
  // smithing: weapons and tools first, then armour
  { id: 'iron_sword', station: 'forge', makes: { item: 'iron_sword' }, needs: [['iron_bar', 3], ['log', 1]], time: 6 },
  { id: 'woodcutter_axe', station: 'forge', makes: { item: 'woodcutter_axe' }, needs: [['iron_bar', 2], ['log', 2]], time: 5 },
  { id: 'pickaxe', station: 'forge', makes: { item: 'pickaxe' }, needs: [['iron_bar', 2], ['log', 2]], time: 5 },
  { id: 'wooden_shield', station: 'forge', makes: { item: 'wooden_shield' }, needs: [['log', 4], ['iron_bar', 1]], time: 4 },
  { id: 'iron_shield', station: 'forge', makes: { item: 'iron_shield' }, needs: [['iron_bar', 5]], time: 6 },
  // the archer's: staves bent over a fire, quivers banded at the forge
  { id: 'hunting_bow', station: 'campfire', makes: { item: 'hunting_bow' }, needs: [['log', 4]], time: 4 },
  { id: 'yew_longbow', station: 'campfire', makes: { item: 'yew_longbow' }, needs: [['log', 6], ['iron_bar', 2]], time: 6 },
  { id: 'leather_quiver', station: 'forge', makes: { item: 'leather_quiver' }, needs: [['log', 3], ['iron_bar', 1]], time: 4 },
  { id: 'hunters_quiver', station: 'forge', makes: { item: 'hunters_quiver' }, needs: [['iron_bar', 4], ['log', 1]], time: 5 },
  { id: 'iron_helm', station: 'forge', makes: { item: 'iron_helm' }, needs: [['iron_bar', 3]], time: 5 },
  { id: 'vigour_amulet', station: 'forge', makes: { item: 'vigour_amulet' }, needs: [['gold_bar', 2]], time: 6 },
  // Act II: the Weepwood's game, its wood and silk, and steel once Bram has taught it
  { id: 'roast_venison', station: 'campfire', makes: { item: 'roast_venison' }, needs: [['venison', 1]], time: 2 },
  { id: 'silk_recurve', station: 'campfire', makes: { item: 'silk_recurve' }, needs: [['black_willow', 3], ['spider_silk', 2]], time: 6 },
  { id: 'thornback_jerkin', station: 'forge', makes: { item: 'thornback_jerkin' }, needs: [['thornback_pelt', 3], ['spider_silk', 1]], time: 6 },
  { id: 'fang_necklace', station: 'forge', makes: { item: 'fang_necklace' }, needs: [['bone_fang', 6], ['gold_bar', 1]], time: 5 },
  { id: 'steel_bar', station: 'forge', makes: { item: 'steel_bar' }, needs: [['iron_bar', 1], ['charcoal', 2]], time: 4, when: { flag: 'steel_taught' } },
  { id: 'steel_sword', station: 'forge', makes: { item: 'steel_sword' }, needs: [['steel_bar', 3], ['log', 1]], time: 6, when: { flag: 'steel_taught' } },
  { id: 'steel_shield', station: 'forge', makes: { item: 'steel_shield' }, needs: [['steel_bar', 4], ['log', 1]], time: 6, when: { flag: 'steel_taught' } },
  { id: 'steel_helm', station: 'forge', makes: { item: 'steel_helm' }, needs: [['steel_bar', 3]], time: 5, when: { flag: 'steel_taught' } },
];
