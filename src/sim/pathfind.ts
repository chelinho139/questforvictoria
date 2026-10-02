import { MAP, COLS, ROWS, T, isSolidTile, blocked, tileObstructed, edgeClosed, propAt } from './map';

export interface Pt {
  x: number;
  y: number;
}

/** Tiles further than this from the click are not considered as a fallback goal. */
const GOAL_SEARCH_RADIUS = 5;
/** Line-of-sight sampling step in world pixels. */
const LOS_STEP = 4;

function walkable(c: number, r: number): boolean {
  return !edgeClosed(c, r) && !isSolidTile(MAP[r][c]) && !propAt(c, r) && !tileObstructed(c, r);
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Closest point to `p` inside tile (c,r) where a box of half-size (hw,hh) fits entirely. */
function clampIntoTile(p: Pt, c: number, r: number, hw: number, hh: number): Pt {
  return {
    x: clamp(p.x, c * T + hw + 0.5, (c + 1) * T - hw - 0.5),
    y: clamp(p.y, r * T + hh + 0.5, (r + 1) * T - hh - 0.5),
  };
}

/**
 * Where to actually go for a click at `to`: the click itself if the box fits there,
 * otherwise the nearest standable point in a nearby walkable tile (e.g. the lakeshore
 * when the lake is clicked). Null if nothing walkable is close.
 */
export function resolveGoal(to: Pt, hw: number, hh: number): { pt: Pt; c: number; r: number } | null {
  const gc = Math.floor(to.x / T);
  const gr = Math.floor(to.y / T);
  if (walkable(gc, gr) && !blocked(to.x, to.y, hw, hh)) return { pt: { x: to.x, y: to.y }, c: gc, r: gr };
  let best: { pt: Pt; c: number; r: number } | null = null;
  let bd = Infinity;
  for (let r = gr - GOAL_SEARCH_RADIUS; r <= gr + GOAL_SEARCH_RADIUS; r++)
    for (let c = gc - GOAL_SEARCH_RADIUS; c <= gc + GOAL_SEARCH_RADIUS; c++) {
      if (!walkable(c, r)) continue;
      const pt = clampIntoTile(to, c, r, hw, hh);
      const d = Math.hypot(pt.x - to.x, pt.y - to.y);
      if (d < bd) {
        bd = d;
        best = { pt, c, r };
      }
    }
  return best;
}

/** True if a box of half-size (hw,hh) can slide in a straight line from a to b. */
export function clearLine(a: Pt, b: Pt, hw: number, hh: number): boolean {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(1, Math.ceil(d / LOS_STEP));
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    if (blocked(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, hw, hh)) return false;
  }
  return true;
}

const NEIGHBOURS: [number, number, number][] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

/**
 * World-space path for a box of half-size (hw,hh) from `from` to (near) `to`.
 * A* over the tile grid with 8-way moves (no cutting past solid corners), then
 * string-pulled so the result is a few straight legs. The last point is the resolved
 * goal. Returns null when there is no route.
 */
export function findPath(from: Pt, to: Pt, hw: number, hh: number): Pt[] | null {
  const goal = resolveGoal(to, hw, hh);
  if (!goal) return null;
  if (clearLine(from, goal.pt, hw, hh)) return [goal.pt];

  const sc = Math.floor(from.x / T);
  const sr = Math.floor(from.y / T);
  const N = COLS * ROWS;
  const idx = (c: number, r: number) => r * COLS + c;
  const g = new Float64Array(N).fill(Infinity);
  const f = new Float64Array(N).fill(Infinity);
  const parent = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const open: number[] = [];
  const h = (c: number, r: number) => {
    const dx = Math.abs(c - goal.c);
    const dy = Math.abs(r - goal.r);
    return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy); // octile
  };

  const start = idx(sc, sr);
  const target = idx(goal.c, goal.r);
  g[start] = 0;
  f[start] = h(sc, sr);
  open.push(start);
  let found = false;
  while (open.length) {
    // grid is ~1000 tiles: a linear scan for the best open node is plenty fast
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (cur === target) {
      found = true;
      break;
    }
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cc = cur % COLS;
    const cr = (cur - cc) / COLS;
    for (const [dc, dr, cost] of NEIGHBOURS) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (!walkable(nc, nr)) continue;
      if (dc && dr && (!walkable(cc + dc, cr) || !walkable(cc, cr + dr))) continue;
      const ni = idx(nc, nr);
      if (closed[ni]) continue;
      const ng = g[cur] + cost;
      if (ng < g[ni]) {
        g[ni] = ng;
        f[ni] = ng + h(nc, nr);
        parent[ni] = cur;
        open.push(ni);
      }
    }
  }
  if (!found) return null;

  // tile chain from goal back to start, as tile centres (start tile excluded)
  const pts: Pt[] = [];
  for (let i = target; i !== start && i !== -1; i = parent[i]) {
    const c = i % COLS;
    const r = (i - c) / COLS;
    pts.push({ x: c * T + T / 2, y: r * T + T / 2 });
  }
  pts.reverse();
  pts[pts.length - 1] = goal.pt;

  // string-pull: from each anchor, jump to the furthest point still in straight view
  const out: Pt[] = [];
  let anchor = from;
  let i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !clearLine(anchor, pts[j], hw, hh)) j--;
    out.push(pts[j]);
    anchor = pts[j];
    i = j + 1;
  }
  return out;
}
