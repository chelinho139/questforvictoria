import type { ItemId } from './items';
import { CHOP } from './items';

/**
 * The kinds of tree a region can grow, by how its layout spells them (data/regions, one
 * character per tile; every one of them is a Tile.Tree to the map): what felling one gives,
 * and how many blows it takes.
 */
export type TreeKind = 'oak' | 'blackwillow' | 'willow' | 'blackoak';

export interface TreeDef {
  name: string;
  /** What it drops when felled (2–3 of them). */
  gives: ItemId;
  /** Chops to fell it (an oak takes CHOP.hits). */
  hits?: number;
}

export const TREE_KINDS: Record<TreeKind, TreeDef> = {
  oak: { name: 'tree', gives: 'log' },
  // the Weepwood's willows gone black: hard as horn and cold to the touch
  blackwillow: { name: 'black willow', gives: 'black_willow', hits: 6 },
  // the willows at the edge of the wood, still half green: ordinary logs, for fires
  willow: { name: 'willow', gives: 'log' },
  // the King's Chase: old oaks gone black
  blackoak: { name: 'black oak', gives: 'log', hits: 5 },
};

/** Layout characters of the trees (TILE_CHARS maps each to Tile.Tree). */
export const TREE_CHARS: Record<string, TreeKind> = { T: 'oak', Y: 'blackwillow', y: 'willow', K: 'blackoak' };

/** Chops to fell this tree. */
export function treeHits(t: { kind?: TreeKind }): number {
  return TREE_KINDS[t.kind ?? 'oak'].hits ?? CHOP.hits;
}
