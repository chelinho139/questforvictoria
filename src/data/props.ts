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
  | 'willow';

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
};

/** The footprint tiles of a prop at (c, r) that are solid. */
export function propSolidTiles(kind: PropKind, c: number, r: number): [number, number][] {
  const d = PROPS[kind];
  const out: [number, number][] = [];
  for (let dr = 0; dr < d.h; dr++)
    for (let dc = 0; dc < d.w; dc++) if (!d.solid || d.solid[dr]?.[dc] === '#') out.push([c + dc, r + dr]);
  return out;
}
