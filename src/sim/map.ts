export const T = 32;

export const Tile = {
  Grass: 0,
  Dirt: 1,
  Water: 2,
  Tree: 3,
  Rock: 4,
  Flower: 5,
  Wall: 6,
  Tower: 7,
  Gate: 8,
  Floor: 9,
  // the campaign's ground (render/groundArt.ts)
  Bridge: 10,
  Field: 11,
  Wilted: 12,
  Blight: 13,
  Cobble: 14,
  Flags: 15,
  /** Solid rock round an interior: nothing is drawn. */
  Void: 16,
} as const;
export type TileId = (typeof Tile)[keyof typeof Tile];

/** How region layouts (data/regions) spell each tile, one character per tile. */
export const TILE_CHARS: Record<string, TileId> = {
  '.': Tile.Grass,
  ':': Tile.Dirt,
  '~': Tile.Water,
  T: Tile.Tree,
  o: Tile.Rock,
  '*': Tile.Flower,
  '#': Tile.Wall,
  X: Tile.Tower,
  G: Tile.Gate,
  _: Tile.Floor,
  '=': Tile.Bridge,
  f: Tile.Field,
  w: Tile.Wilted,
  ',': Tile.Blight,
  c: Tile.Cobble,
  '+': Tile.Flags,
  '&': Tile.Void,
};

/** Turn a region layout into tiles. Every row must be the same width. */
export function parseLayout(rows: string[], name = 'layout'): number[][] {
  const w = rows[0]?.length ?? 0;
  return rows.map((row, r) => {
    if (row.length !== w) throw new Error(`${name}: row ${r} is ${row.length} wide, expected ${w}`);
    return [...row].map((ch, c) => {
      const t = TILE_CHARS[ch];
      if (t === undefined) throw new Error(`${name}: unknown tile '${ch}' at ${c},${r}`);
      return t;
    });
  });
}

/** Tiles that block their whole square. Rocks are not among them: see the rock colliders below. */
export function isSolidTile(t: number): boolean {
  return t === Tile.Water || t === Tile.Wall || t === Tile.Tower || t === Tile.Void;
}

// ---------- rocks ----------
/**
 * A rock blocks a small circle around its boulder (the sprite is much smaller than a
 * tile), so you can walk right up to it. Rocks mined down to rubble don't block at all.
 */
export const ROCK_R = 9;
/** The boulder sits a little south of its tile centre (world px along x and y). */
const ROCK_OFF = 2;

/** Centre of the rock on tile (c, r). */
export function rockCentre(c: number, r: number): { x: number; y: number } {
  return { x: c * T + T / 2 + ROCK_OFF, y: r * T + T / 2 + ROCK_OFF };
}

/**
 * One region's ground and everything solid on it: the tiles, the exits through its edge,
 * buildings, mined rocks and things built or standing there. Every region the game has
 * open has its own (a server holds many at once).
 */
export class RegionMap {
  readonly grid: number[][];
  readonly cols: number;
  readonly rows: number;
  /** Size in world pixels. */
  readonly w: number;
  readonly h: number;
  /** Edge tiles you may walk onto (the exits); every other edge tile is a wall. */
  private readonly openEdge = new Set<number>();
  /** Tiles under buildings and big props (data/props.ts). */
  private readonly propSolid = new Set<number>();
  private readonly brokenRocks = new Set<number>();
  /** Solid things built or standing in the world (a forge, a person): a circle to collide with, keyed by their tile. */
  private readonly blockers = new Map<number, { x: number; y: number; r: number }>();

  /** `open` lists the edge tiles that are exits, so you can walk onto them. */
  constructor(grid: number[][], open: [number, number][] = []) {
    this.grid = grid;
    this.rows = grid.length;
    this.cols = grid[0].length;
    this.w = this.cols * T;
    this.h = this.rows * T;
    for (const [c, r] of open) this.openEdge.add(r * this.cols + c);
  }

  tile(c: number, r: number): number | undefined {
    return this.grid[r]?.[c];
  }

  /** Off the map, or on its edge where there is no exit. */
  edgeClosed(c: number, r: number): boolean {
    if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) return true;
    const edge = r === 0 || c === 0 || r === this.rows - 1 || c === this.cols - 1;
    return edge && !this.openEdge.has(r * this.cols + c);
  }

  /** Mark a tile as covered by a building. */
  setPropSolid(c: number, r: number): void {
    this.propSolid.add(r * this.cols + c);
  }

  /** True when a building stands on tile (c, r). */
  propAt(c: number, r: number): boolean {
    return this.propSolid.has(r * this.cols + c);
  }

  /** True while the rock on tile (c, r) stands (it is not rubble). */
  rockStands(c: number, r: number): boolean {
    return this.grid[r]?.[c] === Tile.Rock && !this.brokenRocks.has(r * this.cols + c);
  }

  /** Mined to rubble (or grown back). */
  setRockBroken(c: number, r: number, broken: boolean): void {
    if (broken) this.brokenRocks.add(r * this.cols + c);
    else this.brokenRocks.delete(r * this.cols + c);
  }

  setBlocker(c: number, r: number, b: { x: number; y: number; r: number } | null): void {
    if (b) this.blockers.set(r * this.cols + c, b);
    else this.blockers.delete(r * this.cols + c);
  }

  /** True when pathfinding must go around tile (c, r): a standing rock or something built there. */
  tileObstructed(c: number, r: number): boolean {
    return this.rockStands(c, r) || this.blockers.has(r * this.cols + c);
  }

  /** A tile a walker may step on (for pathfinding). */
  walkable(c: number, r: number): boolean {
    return !this.edgeClosed(c, r) && !isSolidTile(this.grid[r][c]) && !this.propAt(c, r) && !this.tileObstructed(c, r);
  }

  /**
   * True if a mover at (x,y) touches a standing rock. Against rocks a mover counts only its
   * feet (a box at most 5×4), so it stops where the sprites meet, not a body-width early.
   */
  private hitsRock(x: number, y: number, bw: number, bh: number): boolean {
    const hw = Math.min(bw, 5);
    const hh = Math.min(bh, 4);
    const reach = ROCK_R + ROCK_OFF + 4;
    const c0 = Math.floor((x - hw - reach) / T);
    const c1 = Math.floor((x + hw + reach) / T);
    const r0 = Math.floor((y - hh - reach) / T);
    const r1 = Math.floor((y + hh + reach) / T);
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        const b = this.blockers.get(r * this.cols + c);
        const k = b ?? (this.rockStands(c, r) ? rockCentre(c, r) : null);
        if (!k) continue;
        const rad = b ? b.r : ROCK_R;
        const dx = Math.max(0, Math.abs(k.x - x) - hw);
        const dy = Math.max(0, Math.abs(k.y - y) - hh);
        if (dx * dx + dy * dy < rad * rad) return true;
      }
    return false;
  }

  solidAt(x: number, y: number): boolean {
    const c = Math.floor(x / T);
    const r = Math.floor(y / T);
    if (this.edgeClosed(c, r)) return true;
    return isSolidTile(this.grid[r][c]) || this.propSolid.has(r * this.cols + c);
  }

  /** True if a box of half-size (hw,hh) centred at (x,y) overlaps something solid. */
  blocked(x: number, y: number, hw: number, hh: number): boolean {
    return (
      this.solidAt(x - hw, y - hh) ||
      this.solidAt(x + hw, y - hh) ||
      this.solidAt(x - hw, y + hh) ||
      this.solidAt(x + hw, y + hh) ||
      this.hitsRock(x, y, hw, hh)
    );
  }
}

// ---------- isometric projection ----------
/**
 * Screen x of the world origin. Fixed (wide enough for a region up to 200 rows deep) so the
 * projection never changes when you change region; the ground is drawn where it falls.
 */
export const ISO_OX = 200 * 32;

export function isoX(wx: number, wy: number): number {
  return wx - wy + ISO_OX;
}
export function isoY(wx: number, wy: number): number {
  return (wx + wy) / 2;
}

/**
 * Speed multiplier that makes a unit world direction cover the same number of screen
 * pixels per second whichever way it points. The 2:1 projection stretches east-west
 * and squashes north-south; this cancels that so movement feels even on screen.
 */
export function isoSpeedFactor(dx: number, dy: number): number {
  const l = Math.hypot(dx - dy, (dx + dy) / 2);
  return l > 0 ? 1 / l : 1;
}

/**
 * Which way a sprite at (x, y) faces to look at (tx, ty): -1 left, 1 right on screen.
 * Compares screen x (x - y), not world x: by world x a hero walking up-right faced left.
 * Straight up or down the screen keeps `cur`.
 */
export function faceToward(x: number, y: number, tx: number, ty: number, cur: 1 | -1): 1 | -1 {
  const d = tx - ty - (x - y);
  return d < -1e-6 ? -1 : d > 1e-6 ? 1 : cur;
}

/** Inverse of isoX/isoY: projected (screen-space world) coordinates back to world. */
export function fromIso(sx: number, sy: number): { x: number; y: number } {
  const a = sx - ISO_OX; // x - y
  const b = 2 * sy; // x + y
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/** Convert a screen-space direction into a world-space direction (normalised). */
export function isoDir(mx: number, my: number): { x: number; y: number } {
  const wx = (mx + 2 * my) / 2;
  const wy = (2 * my - mx) / 2;
  const l = Math.hypot(wx, wy) || 1;
  return { x: wx / l, y: wy / l };
}
