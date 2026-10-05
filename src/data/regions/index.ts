import type { RegionDef } from './types';
import { greenmarch } from './greenmarch';
import { devtest } from './devtest';
import { devyard } from './devyard';
import { millbrook } from './millbrook';
import { belltower } from './belltower';
import { weepwood } from './weepwood';
import { kingschase } from './kingschase';
import { heronreach } from './heronreach';
import { heronlodge } from './heronlodge';
import { lislebarrow } from './lislebarrow';
import { weepingbridge } from './weepingbridge';

export { FLAT_OBJECTS, GLINTING_OBJECTS } from './types';
export type { RegionDef, RegionExit, RegionSpawn, RegionNpc, RegionObject, RegionProp, RegionTrigger, RegionWanderer, RegionStructure, RegionHold, RegionWake, ObjectKind, Ring, At } from './types';

/** Every region of Corvalis (docs/lore.md, "Places"). The game starts in the Greenmarch. */
export const REGIONS: Record<string, RegionDef> = {
  greenmarch,
  millbrook,
  belltower,
  weepwood,
  kingschase,
  heronreach,
  heronlodge,
  lislebarrow,
  weepingbridge,
  devtest,
  devyard,
};
export type RegionId = keyof typeof REGIONS;
export const START_REGION = 'greenmarch';
