/**
 * Buildings and big props placed in regions (data/regions `props`): what each covers on the
 * ground. Their art is drawn by tools/world (render/propArt.ts). A prop's anchor tile is the
 * north corner of its footprint, `w` tiles along x (columns) by `h` along y (rows).
 */

export type PropKind =
  | 'cottage'
  | 'cottage2'
  | 'nan_cottage'
  | 'mill'
  | 'chapel'
  | 'smithy'
  | 'stall'
  | 'well'
  | 'fence_x'
  | 'fence_y'
  | 'tent'
  | 'barrow'
  | 'barricade'
  | 'rockfall'
  | 'bell'
  | 'grave'
  | 'grave_cross'
  | 'thornwall'
  | 'hollow_oak'
  | 'willow'
  // Act II (tools/world/buildings2.py): the Weepwood and Kilnholt
  | 'leanto'
  | 'drying_rack'
  | 'hut'
  | 'hut2'
  | 'sawpit'
  | 'long_table'
  | 'thorn_tunnel'
  | 'fallen_willow'
  | 'spikes_s'
  | 'spikes_m'
  | 'spikes_l'
  | 'thicket'
  | 'webbed_willow'
  | 'mound_grave'
  | 'standing_stone'
  | 'boundary_stone'
  // the King's Chase
  | 'hunting_lodge'
  | 'kennels'
  | 'gallows_willow'
  | 'goblin_tent'
  | 'wolf_pen'
  | 'goblin_wall'
  // Heron Reach
  | 'heron_lodge'
  | 'outpost'
  | 'lisle_barrow'
  | 'mist'
  // the Weeping Bridge
  | 'bridge_parapet'
  | 'bridge_arch'
  | 'great_willow'
  | 'kings_post'
  | 'watchfire'
  | 'guard_leanto'
  | 'vines'
  // inside Heron Lodge and the Lisle Barrow
  | 'hearth_cold'
  | 'hearth_lit'
  | 'bunks'
  | 'niche'
  | 'stone_seat';

export interface PropDef {
  w: number;
  h: number;
  /** Which footprint tiles you can't walk on, one string per row ('#' solid, '.' free). Default: all. */
  solid?: string[];
  /** Its windows are lit at night (a warm light and the art's lit overlay). */
  lit?: boolean;
  /** An animation drawn over it (render/propArt.ts frames), and ms per frame. */
  anim?: { art: string; ms: number };
  /** For trees: the footprint tile the trunk stands on; it alone sorts against what walks round it. */
  core?: [number, number];
}

export const PROPS: Record<PropKind, PropDef> = {
  cottage: { w: 3, h: 2, lit: true },
  cottage2: { w: 3, h: 2, lit: true },
  nan_cottage: { w: 3, h: 2, lit: true },
  mill: { w: 4, h: 3, lit: true, anim: { art: 'mill_wheel', ms: 180 } },
  // the tower's door (row 5, columns 1–2) is left open: an exit into the bell tower stands there
  chapel: { w: 4, h: 6, lit: true, solid: ['####', '####', '####', '####', '####', '#..#'] },
  smithy: { w: 3, h: 2, lit: true },
  stall: { w: 2, h: 2 },
  well: { w: 1, h: 1 },
  fence_x: { w: 1, h: 1 },
  fence_y: { w: 1, h: 1 },
  tent: { w: 2, h: 2 },
  barrow: { w: 3, h: 3 },
  barricade: { w: 3, h: 1 },
  rockfall: { w: 3, h: 2 },
  bell: { w: 2, h: 2 },
  grave: { w: 1, h: 1 },
  grave_cross: { w: 1, h: 1 },
  thornwall: { w: 4, h: 1 },
  // the story trees by the lake (render/storyTrees.ts): only the trunk is solid
  hollow_oak: { w: 3, h: 3, solid: ['...', '.#.', '...'], core: [1, 1] },
  willow: { w: 3, h: 3, solid: ['...', '.#.', '...'], core: [1, 1] },
  // ---- Act II
  leanto: { w: 2, h: 1 },
  drying_rack: { w: 1, h: 1 },
  hut: { w: 3, h: 2, lit: true },
  hut2: { w: 3, h: 2, lit: true },
  sawpit: { w: 2, h: 2 },
  long_table: { w: 3, h: 1 },
  // the Lisle runs under the thorn wall: the arch stands over the water, its east end walkable
  thorn_tunnel: { w: 3, h: 2, solid: ['#..', '#..'] },
  fallen_willow: { w: 4, h: 1 },
  spikes_s: { w: 1, h: 1 },
  spikes_m: { w: 1, h: 1 },
  spikes_l: { w: 1, h: 1 },
  thicket: { w: 1, h: 1 },
  webbed_willow: { w: 3, h: 3, solid: ['...', '.#.', '...'], core: [1, 1] },
  mound_grave: { w: 1, h: 1 },
  standing_stone: { w: 1, h: 1 },
  boundary_stone: { w: 1, h: 1 },
  hunting_lodge: { w: 5, h: 3 },
  kennels: { w: 3, h: 2 },
  gallows_willow: { w: 3, h: 3, solid: ['...', '.#.', '...'], core: [1, 1] },
  goblin_tent: { w: 2, h: 2 },
  wolf_pen: { w: 2, h: 2 },
  goblin_wall: { w: 4, h: 1 },
  heron_lodge: { w: 4, h: 3, lit: true },
  // the open corner by the brazier
  outpost: { w: 2, h: 2, solid: ['##', '#.'] },
  // the door (row 3, column 1) is left open: an exit into the barrow stands there
  lisle_barrow: { w: 4, h: 4, solid: ['####', '####', '####', '#.##'] },
  mist: { w: 4, h: 1 },
  bridge_parapet: { w: 1, h: 5 },
  // the bridge's arch stands over the water; you walk on the deck above it
  bridge_arch: { w: 5, h: 1, solid: ['.....'] },
  great_willow: { w: 4, h: 4, solid: ['....', '.##.', '.##.', '....'], core: [1, 1] },
  kings_post: { w: 1, h: 1 },
  watchfire: { w: 1, h: 1 },
  guard_leanto: { w: 2, h: 1 },
  vines: { w: 4, h: 1 },
  hearth_cold: { w: 2, h: 1 },
  hearth_lit: { w: 2, h: 1 },
  bunks: { w: 2, h: 1 },
  niche: { w: 1, h: 1 },
  // you can stand on its step
  stone_seat: { w: 2, h: 2, solid: ['##', '..'] },
};

/** The footprint tiles of a prop at (c, r) that are solid. */
export function propSolidTiles(kind: PropKind, c: number, r: number): [number, number][] {
  const d = PROPS[kind];
  const out: [number, number][] = [];
  for (let dr = 0; dr < d.h; dr++)
    for (let dc = 0; dc < d.w; dc++) if (!d.solid || d.solid[dr]?.[dc] === '#') out.push([c + dc, r + dr]);
  return out;
}
