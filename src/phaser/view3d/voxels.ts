import { BufferAttribute, BufferGeometry } from 'three';

/**
 * The buildings as voxel models (tools/world/voxels.py writes public/voxels.json): faces of
 * 5 bytes (x, y, z from the origin, direction +x -x +y -y +z -z, palette index), the faces lit
 * windows recolour at night, in the prop's own footprint coordinates (world px, z up).
 */
export interface VoxelModel {
  w: number;
  h: number;
  o: [number, number];
  n: number;
  pal: string[];
  f: string;
  lit?: string;
}

export type VoxelSet = Record<string, VoxelModel>;

let loading: Promise<VoxelSet | null> | null = null;

/** Fetch the models once (they are only needed when a 3D view is first opened). */
export function loadVoxels(): Promise<VoxelSet | null> {
  loading ??= fetch('voxels.json')
    .then(r => (r.ok ? (r.json() as Promise<VoxelSet>) : null))
    .catch(() => null);
  return loading;
}

/** A face's brightness by the way it faces: a little edge on every voxel (the colours already carry the art's light). */
const FACE_K = [0.86, 0.95, 0.95, 0.86, 1.0, 0.6];

/**
 * Corners of a unit cube's face in three.js axes (x, up, world y), wound to face out. Direction
 * order follows the file: +x, -x, +y, -y (world y is three's z), +z, -z (up is three's y).
 */
const CORNERS: number[][][] = [
  [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
  [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],
  [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
  [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]],
  [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]],
  [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
];

function bytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The model as one mesh: world px across, `zk` world units per art px upward. */
export function voxelGeometry(m: VoxelModel, zk: number): BufferGeometry {
  const f = bytes(m.f);
  const n = m.n;
  const pal = m.pal.map(rgb);
  // night colours: the same faces, some recoloured
  const night = new Int16Array(n).fill(-1);
  if (m.lit) {
    const l = bytes(m.lit);
    for (let i = 0; i + 4 < l.length; i += 5) night[l[i] | (l[i + 1] << 8) | (l[i + 2] << 16) | (l[i + 3] << 24)] = l[i + 4];
  }
  const pos = new Float32Array(n * 12);
  const col = new Uint8Array(n * 12);
  const colLit = new Uint8Array(n * 12);
  const index = new Uint32Array(n * 6);
  const [ox, oy] = m.o;
  for (let i = 0; i < n; i++) {
    const x = f[i * 5] + ox;
    const y = f[i * 5 + 1] + oy;
    const z = f[i * 5 + 2];
    const d = f[i * 5 + 3];
    const c = pal[f[i * 5 + 4]];
    const cn = night[i] >= 0 ? pal[night[i]] : c;
    const k = FACE_K[d];
    const corners = CORNERS[d];
    for (let v = 0; v < 4; v++) {
      const [cx, cy, cz] = corners[v];
      const at = (i * 4 + v) * 3;
      pos[at] = x + cx;
      pos[at + 1] = (z + cy) * zk;
      pos[at + 2] = y + cz;
      for (let ch = 0; ch < 3; ch++) {
        col[at + ch] = Math.round(c[ch] * k);
        colLit[at + ch] = Math.round(cn[ch] * k);
      }
    }
    const b = i * 4;
    index.set([b, b + 1, b + 2, b, b + 2, b + 3], i * 6);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('col', new BufferAttribute(col, 3, true));
  g.setAttribute('colLit', new BufferAttribute(colLit, 3, true));
  g.setIndex(new BufferAttribute(index, 1));
  g.computeBoundingSphere();
  return g;
}
