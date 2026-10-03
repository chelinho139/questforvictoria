import Phaser from 'phaser';
import { ICONS, ICON_PAL, SUN, MOON } from '../../data/pixelart';
import type { SpriteMap } from '../../data/pixelart';
import { SKILLS, ACTIONS } from '../../data/skills';
import { T, Tile, isoX, isoY, ISO_OX } from '../../sim/map';
import type { RegionMap } from '../../sim/map';
import * as HD from './hdSprites';
import { cow as hdCow } from './hdHero';
import { HD_ICONS } from './hdIcons';
import { scale2x } from './pixelPainter';
import { registerArt, frameKey, animKey, spriteStyle, setStyleFit, hdHeroId, heroGear, HD_HERO_IDS } from './art';
import { HD_HEROES, hdHeroFrames } from './hdHeroes';
import type { HdHeroId } from './hdHeroes';
import { itemIcon, itemDrop, backpackIcon, hammerIcon } from './itemArt';
import { campfireFrames, forgeFrames } from './structureArt';
import { npcFrames } from './npcArt';
import { creatureFrames } from './creatureArt';
import { scrollIcon, cogIcon, bookIcon, eyeIcon, flameIcon, heartIcon, starIcon, spellbookIcon, view_isoIcon, view_3dIcon, view_povIcon } from './uiIcons';
import { SKILL_ICONS } from './skillIcons';
import type { NpcId } from '../../data/npcs';
import { NPC_IDS } from '../../data/npcs';
import type { StructureKind } from '../../data/crafting';
import { ITEM_IDS, SLOTS } from '../../data/items';
import type { ItemId, Slot } from '../../data/items';
import type { SpriteStyle } from './art';
import type { StyleArt, Frames, IsoTiles, RiderFit } from './styleArt';
import { WALL_H, TOWER_H, TOWER_TOP } from './styleArt';
import { silhouetteArt } from './styles/gameArt';
import { regrade } from './regrade';
import { OBJECT_FRAMES } from './objectArt';
import { PROP_ART } from './propArt';
import { groundTiles } from './groundArt';
import { hollowOak, willow } from './storyTrees';
import type { RegradeOpts } from './regrade';

export const Tex = {
  knight: 'knight',
  horse: 'horse',
  goblin: (i: number) => 'goblin' + i,
  icon: (key: string) => 'icon:' + key,
  tree: 'tree',
  pine: 'tree-pine',
  rock: 'rock',
  stump: 'tree-stump',
  rubble: 'rock-rubble',
  /** An item lying on the ground (style art) and its bag icon (shared). */
  drop: (id: string) => 'drop:' + id,
  structure: (kind: StructureKind) => 'build:' + kind,
  npc: (id: NpcId) => 'npc:' + id,
  object: (kind: string) => 'obj:' + kind,
  prop: (kind: string) => 'prop:' + kind,
  wanderer: (id: string) => 'wanderer:' + id,
  propLit: (kind: string) => 'prop:' + kind + ':lit',
  item: (id: string) => 'item:' + id,
  wall: 'wall',
  tower: 'tower',
  water1: 'water1',
  shadow: 'shadow',
  sun: 'sun',
  moon: 'moon',
} as const;

export { WALL_H, TOWER_H, TOWER_TOP };

export interface WorldObject {
  kind: number;
  wx: number;
  wy: number;
}

export interface BuiltWorld {
  objects: WorldObject[];
  /** World-space centres of water tiles (for the animated second frame). */
  water: [number, number][];
  /** The ground, pre-rendered in chunks (texture key and top-left in projected pixels). */
  ground: { key: string; x: number; y: number }[];
}

/** Ground chunks stay under this size so every GPU can hold them as textures. */
const CHUNK = 2048;
/** The tile set of the loaded style (kept so each region's ground can be built on arrival). */
let styleTiles: IsoTiles | null = null;
/** How many ground chunk textures the last region used (extras are removed). */
let groundChunks = 0;

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  return [cv, c];
}

function px(c: CanvasRenderingContext2D, x: number, y: number, col: string, w = 1, h = 1): void {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
}

function shade(hexCol: string, amt: number): string {
  const n = parseInt(hexCol.slice(1), 16);
  const cl = (v: number) => Math.max(0, Math.min(255, v));
  const r = cl((n >> 16) + amt);
  const g = cl(((n >> 8) & 255) + amt);
  const b = cl((n & 255) + amt);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export function drawIcon(map: string[], col: string): HTMLCanvasElement {
  const [cv, c] = canvas(12, 12);
  const L = shade(col, 55);
  const D = shade(col, -55);
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < 12; x++) {
      const ch = map[y][x];
      if (ch === '.') continue;
      c.fillStyle = ch === 'x' ? col : ch === 'l' ? L : ch === 'd' ? D : ICON_PAL[ch];
      c.fillRect(x, y, 1, 1);
    }
  return cv;
}

function sprite(map: SpriteMap, tint?: string | null): HTMLCanvasElement {
  const w = map.rows[0].length;
  const h = map.rows.length;
  const [cv, c] = canvas(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ch = map.rows[y][x];
      if (ch === '.') continue;
      c.fillStyle = map.pal[ch];
      c.fillRect(x, y, 1, 1);
    }
  if (tint) {
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = tint;
    c.fillRect(0, 0, w, h);
  }
  return cv;
}

// ---------- iso diamond outline (castle block tops) ----------
function diamond(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  c.beginPath();
  c.moveTo(x + w / 2, y);
  c.lineTo(x + w, y + h / 2);
  c.lineTo(x + w / 2, y + h);
  c.lineTo(x, y + h / 2);
  c.closePath();
}

/**
 * Set a sprite whose foot is its bottom centre onto a prop canvas for a w×h footprint (left
 * edge the west corner - 1, bottom the south corner + 1), its foot on the footprint's centre.
 */
function propCanvas(src: HTMLCanvasElement, w: number, h: number): HTMLCanvasElement {
  const W = (w + h) * 32 + 2;
  const footX = 1 + ((w + h) * 32) / 2;
  const below = ((w + h) * 16) / 2 + 1;
  const [cv, c] = canvas(W, src.height + below);
  c.drawImage(src, Math.round(footX - src.width / 2), 0);
  return cv;
}

/** Paint palette-indexed rows ('.' is transparent) at 1×, as they are (already outlined). */
function paintRows(rows: string[], pal: Record<string, string>): HTMLCanvasElement {
  const w = Math.max(1, ...rows.map(r => r.length));
  const [cv, c] = canvas(w, rows.length);
  const img = c.createImageData(w, rows.length);
  const rgb: Record<string, number> = {};
  for (const [k, v] of Object.entries(pal)) rgb[k] = parseInt(v.slice(1), 16);
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      const n = rgb[r[x]];
      if (n === undefined) continue;
      const i = (y * w + x) * 4;
      img.data[i] = n >> 16;
      img.data[i + 1] = (n >> 8) & 255;
      img.data[i + 2] = n & 255;
      img.data[i + 3] = 255;
    }
  });
  c.putImageData(img, 0, 0);
  return cv;
}

// ---------- isometric blocks (walls, towers) ----------
function face(c: CanvasRenderingContext2D, pts: [number, number][], col: string): void {
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
  c.fill();
}

/** Draw an iso block whose ground diamond centre is (x,y) and height H. */
function block(c: CanvasRenderingContext2D, x: number, y: number, H: number, top: string, left: string, right: string): void {
  face(c, [[x - 32, y], [x, y + 16], [x, y + 16 - H], [x - 32, y - H]], left);
  face(c, [[x + 32, y], [x, y + 16], [x, y + 16 - H], [x + 32, y - H]], right);
  c.strokeStyle = 'rgba(0,0,0,.28)';
  c.lineWidth = 1;
  c.beginPath();
  for (let k = 8; k < H; k += 8) {
    c.moveTo(x - 32, y - H + k);
    c.lineTo(x, y - H + 16 + k);
    c.moveTo(x + 32, y - H + k);
    c.lineTo(x, y - H + 16 + k);
  }
  c.stroke();
  face(c, [[x, y - H - 16], [x + 32, y - H], [x, y - H + 16], [x - 32, y - H]], top);
  c.strokeStyle = 'rgba(0,0,0,.35)';
  c.lineWidth = 1;
  diamond(c, x - 32, y - H - 16, 64, 32);
  c.stroke();
}

function wallCanvas(): HTMLCanvasElement {
  const [cv, c] = canvas(64, WALL_H + 32);
  block(c, 32, WALL_H + 16, WALL_H, '#a5aab5', '#8b909c', '#5f6570');
  return cv;
}

function towerCanvas(): HTMLCanvasElement {
  const [cv, c] = canvas(64, TOWER_TOP + 16);
  const x = 32;
  const y = TOWER_TOP;
  block(c, x, y, TOWER_H, '#a5aab5', '#8b909c', '#5f6570');
  const ax = x;
  const ay = y - TOWER_H - 16 - 30;
  face(c, [[x - 32, y - TOWER_H], [x, y - TOWER_H - 16], [ax, ay]], '#c2453d');
  face(c, [[x, y - TOWER_H - 16], [x + 32, y - TOWER_H], [ax, ay]], '#8e2d28');
  face(c, [[x - 32, y - TOWER_H], [x, y - TOWER_H + 16], [ax, ay]], '#a3352f');
  face(c, [[x, y - TOWER_H + 16], [x + 32, y - TOWER_H], [ax, ay]], '#6e2320');
  px(c, ax - 1, ay - 14, '#5c3d23', 2, 14);
  px(c, ax + 1, ay - 14, '#e0504b', 10, 6);
  return cv;
}

function shadowCanvas(): HTMLCanvasElement {
  const [cv, c] = canvas(64, 32);
  c.fillStyle = '#000';
  c.beginPath();
  c.ellipse(32, 16, 32, 16, 0, 0, Math.PI * 2);
  c.fill();
  return cv;
}

/**
 * Pre-render the current region's isometric ground (sim/map.ts MAP), sliced into chunk
 * textures, and collect the standing objects. Call on arrival in a region.
 */
export function buildRegionGround(scene: Phaser.Scene, map: RegionMap): BuiltWorld {
  const { grid: MAP, cols: COLS, rows: ROWS } = map;
  const tiles = styleTiles;
  if (!tiles) throw new Error('buildRegionGround: style textures not built yet');
  const ox = ISO_OX - ROWS * 32;
  const W = (COLS + ROWS) * 32;
  const H = (COLS + ROWS) * 16 + 48;
  const [cv, c] = canvas(W, H);
  const objects: WorldObject[] = [];
  const water: [number, number][] = [];
  for (let r = 0; r < ROWS; r++)
    for (let col = 0; col < COLS; col++) {
      const t = MAP[r][col];
      const wx = col * T + 16;
      const wy = r * T + 16;
      const x = isoX(wx, wy) - 32 - ox;
      const y = isoY(wx, wy) - 16;
      let tl: HTMLCanvasElement;
      if (t === Tile.Void) continue;
      if (t === Tile.Dirt) tl = tiles.dirt[(r + col) % 2];
      else if (t === Tile.Water) {
        tl = tiles.water[0];
        water.push([wx, wy]);
      } else if (t === Tile.Flower) tl = tiles.flower;
      else if (t === Tile.Floor) tl = tiles.floor[(r + col) % 2];
      else if (t === Tile.Gate) tl = tiles.gate;
      else if (t === Tile.Wall || t === Tile.Tower) tl = groundTiles().flags[0];
      else if (t >= Tile.Bridge) {
        const g = groundTiles();
        const set = t === Tile.Bridge ? g.deck : t === Tile.Field ? g.field : t === Tile.Wilted ? g.wilted : t === Tile.Blight ? g.blight : t === Tile.Cobble ? g.cobble : g.flags;
        tl = set[Math.floor(((Math.imul(r * 73856093 ^ col * 19349663, 2654435761) >>> 0) / 4294967296) * set.length)];
      } else tl = tiles.grass[(r * 7 + col * 3) % 3];
      c.drawImage(tl, x, y);
      if (t === Tile.Tree || t === Tile.Rock || t === Tile.Wall || t === Tile.Tower) objects.push({ kind: t, wx, wy });
    }
  objects.sort((a, b) => a.wx + a.wy - (b.wx + b.wy));
  // slice into chunks
  const ground: BuiltWorld['ground'] = [];
  let i = 0;
  for (let y0 = 0; y0 < H; y0 += CHUNK)
    for (let x0 = 0; x0 < W; x0 += CHUNK) {
      const [piece, pc] = canvas(Math.min(CHUNK, W - x0), Math.min(CHUNK, H - y0));
      pc.drawImage(cv, -x0, -y0);
      const key = `ground:${i++}`;
      putTexture(scene, key, piece);
      ground.push({ key, x: ox + x0, y: y0 });
    }
  for (let k = i; k < groundChunks; k++) if (scene.textures.exists(`ground:${k}`)) scene.textures.remove(`ground:${k}`);
  groundChunks = i;
  return { objects, water, ground };
}

export interface TextureJob {
  /** Shown on the loading screen while this step runs. */
  label: string;
  run: () => void;
}

// ------------------------------------------------------------ the art of each style

function hdArt(): StyleArt {
  const one = (cv: HTMLCanvasElement): Frames => ({ frames: [cv], scale: 1 });
  // the hero is one of the HD heroes (three knights, five board-inspired heroes)
  const id = hdHeroId();
  const h = HD_HEROES[id];
  return {
    heroes: () => {
      // wearing the sim's gear (the hero's own weapon only on the start screen)
      const f = hdHeroFrames(id, heroGear());
      return { knight: { frames: f.walk, anims: f.anims, scale: 1 }, horse: { frames: HD.horse(), scale: 1 } };
    },
    creatures: () => ({
      goblin0: { frames: HD.goblin(), scale: 1 },
      goblin1: { frames: HD.goblin({ hood: true }), scale: 1 },
      goblin2: { frames: HD.ogre(), scale: 1 },
      skeleton: { frames: HD.skeleton(), scale: 1 },
      cow: { frames: hdCow(), scale: 1 },
      slime: { frames: HD.slime(), scale: 1 },
      bonehound: { frames: creatureFrames('bonehound'), scale: 1 },
      bellringer: { frames: creatureFrames('bellringer'), scale: 1 },
    }),
    forest: () => ({ tree: one(HD.oak()), pine: one(HD.pine()), rock: one(HD.rock()), stump: one(HD.stump()), rubble: one(HD.rubble()) }),
    structures: () => ({ campfire: { frames: campfireFrames(), scale: 1 }, forge: { frames: forgeFrames(), scale: 1 } }),
    npcs: () => Object.fromEntries(NPC_IDS.map(id => [id, { frames: npcFrames(id), scale: 1 }])) as Record<NpcId, Frames>,
    // every item lies on the ground as itself, so you know what it is before picking it up
    items: () => Object.fromEntries(ITEM_IDS.map(id => [id, one(itemDrop(id))])) as Record<ItemId, Frames>,
    castle: () => ({ wall: wallCanvas(), tower: towerCanvas(), shadow: shadowCanvas() }),
    tiles: hdIsoTiles,
    rider: h.rider,
    portrait: h.portrait,
  };
}

/**
 * The HD art recoloured into the Silhouette palette: every HD shape and shading step is
 * kept; only the colours move to Silhouette's misty, muted ramps (see regrade.ts).
 */
function hdSilhouetteArt(): StyleArt {
  const hd = hdArt();
  const re = (f: Frames, o: RegradeOpts = {}): Frames => ({
    frames: f.frames.map(cv => regrade(cv, o)),
    anims: f.anims && Object.fromEntries(Object.entries(f.anims).map(([k, a]) => [k, a?.map(cv => regrade(cv, o))])),
    scale: f.scale,
  });
  const creature: RegradeOpts = { greens: 'olive' };
  return {
    ...hd,
    heroes: () => {
      const h = hd.heroes();
      return { knight: re(h.knight), horse: re(h.horse) };
    },
    creatures: () => {
      const c = hd.creatures();
      return Object.fromEntries(Object.entries(c).map(([k, f]) => [k, re(f, creature)])) as ReturnType<StyleArt['creatures']>;
    },
    forest: () => {
      const f = hd.forest();
      return { tree: re(f.tree), pine: re(f.pine), rock: re(f.rock), stump: re(f.stump), rubble: re(f.rubble) };
    },
    npcs: () => {
      const n = hd.npcs();
      return Object.fromEntries(NPC_IDS.map(id => [id, re(n[id])])) as Record<NpcId, Frames>;
    },
    structures: () => {
      const s = hd.structures();
      return { campfire: re(s.campfire), forge: re(s.forge) };
    },
    items: () => {
      return Object.fromEntries(Object.entries(hd.items()).map(([id, f]) => [id, re(f)])) as Record<ItemId, Frames>;
    },
    castle: () => {
      const c = hd.castle();
      return { wall: regrade(c.wall), tower: regrade(c.tower), shadow: c.shadow };
    },
    tiles: () => {
      const t = hd.tiles();
      const r = (cv: HTMLCanvasElement) => regrade(cv);
      return { grass: t.grass.map(r), dirt: t.dirt.map(r), water: t.water.map(r), flower: r(t.flower), floor: t.floor.map(r), gate: r(t.gate) };
    },
  };
}

export function styleArt(style: SpriteStyle): StyleArt {
  switch (style) {
    case 'sil':
      return silhouetteArt('sil');
    case 's1h':
      return silhouetteArt('sil', true);
    case 'c2':
      return silhouetteArt('ink');
    case 'c3':
      return silhouetteArt('rich');
    case 'hdsil':
      return hdSilhouetteArt();
  }
}

/**
 * Put a canvas under a texture key. A key that already exists is redrawn in place (resized
 * if needed), so every sprite that shows it stays valid: that is what lets the art style
 * change mid-game without rebuilding the scene.
 */
function putTexture(scene: Phaser.Scene, key: string, cv: HTMLCanvasElement): void {
  const tm = scene.textures;
  const tex = tm.exists(key) ? tm.get(key) : null;
  if (!tex) {
    tm.addCanvas(key, cv);
    return;
  }
  if (!(tex instanceof Phaser.Textures.CanvasTexture)) throw new Error(`texture ${key} is not a canvas texture`);
  tex.setSize(cv.width, cv.height);
  tex.context.clearRect(0, 0, cv.width, cv.height);
  tex.context.imageSmoothingEnabled = false;
  tex.context.drawImage(cv, 0, 0);
  tex.refresh();
}

/** Put every frame (and animation group) of a sprite under its texture keys. */
function putFramesOf(scene: Phaser.Scene, key: string, f: Frames): void {
  f.frames.forEach((cv, i) => putTexture(scene, frameKey(key, i), cv));
  const counts: Record<string, number> = {};
  for (const [group, list] of Object.entries(f.anims ?? {})) {
    list?.forEach((cv, i) => putTexture(scene, animKey(key, group, i), cv));
    counts[group] = list?.length ?? 0;
  }
  registerArt(key, f.scale, f.frames.length, counts);
}

/** The loading steps for one style's art (hero, creatures, forest, castle, ground). */
function styleJobs(scene: Phaser.Scene, style: SpriteStyle): TextureJob[] {
  const art = styleArt(style);
  const put = (key: string, cv: HTMLCanvasElement) => putTexture(scene, key, cv);
  const putFrames = (key: string, f: Frames) => putFramesOf(scene, key, f);
  return [
    {
      label: 'Polishing armour…',
      run: () => {
        const h = art.heroes();
        putFrames(Tex.knight, h.knight);
        putFrames(Tex.horse, h.horse);
        setStyleFit(art.rider, art.portrait);
      },
    },
    {
      label: 'Waking the slimes…',
      run: () => {
        // keys match EnemyDef.tex in data/enemies.ts
        for (const [key, f] of Object.entries(art.creatures())) putFrames(key, f);
      },
    },
    {
      label: 'Growing the forest…',
      run: () => {
        const f = art.forest();
        putFrames(Tex.tree, f.tree);
        putFrames(Tex.pine, f.pine);
        putFrames(Tex.rock, f.rock);
        putFrames(Tex.stump, f.stump);
        putFrames(Tex.rubble, f.rubble);
        for (const [kind, fr] of Object.entries(art.structures())) putFrames(Tex.structure(kind as StructureKind), fr);
        for (const [id, fr] of Object.entries(art.npcs())) putFrames(Tex.npc(id as NpcId), fr);

        for (const [id, fr] of Object.entries(art.items())) putFrames(Tex.drop(id), fr);
        // objects you can use (only drawn in the HD art; the backup styles show them as-is)
        const re = style === 'hdsil' ? (cv: HTMLCanvasElement) => regrade(cv) : (cv: HTMLCanvasElement) => cv;
        for (const [kind, frames] of Object.entries(OBJECT_FRAMES)) putFrames(Tex.object(kind), { frames: frames().map(re), scale: 1 });
        // wanderers (the grey postman): HD art in every style, recoloured for HD · Silhouette
        putFrames(Tex.wanderer('postman'), { frames: npcFrames('postman').map(re), scale: 1 });
        // buildings are drawn straight in the Silhouette palette (no recolour), lit windows separate
        for (const [kind, a] of Object.entries(PROP_ART)) {
          put(Tex.prop(kind), paintRows(a.rows, a.pal));
          if (a.lit) put(Tex.propLit(kind), paintRows(a.lit, a.pal));
          a.frames?.forEach((f, i) => put(Tex.prop(kind) + ':' + i, paintRows(f, a.pal)));
        }
        // the story trees, painted like the forest (recoloured with it), set on a 3×3 footprint
        const tree = (cv: HTMLCanvasElement) => propCanvas(style === 'hdsil' ? regrade(cv) : cv, 3, 3);
        put(Tex.prop('hollow_oak'), tree(hollowOak()));
        put(Tex.prop('willow'), tree(willow()));
      },
    },
    {
      label: 'Raising the castle…',
      run: () => {
        const c = art.castle();
        put(Tex.wall, c.wall);
        put(Tex.tower, c.tower);
        put(Tex.shadow, c.shadow);
      },
    },
    {
      label: 'Laying the land…',
      run: () => {
        const tiles = art.tiles();
        styleTiles = tiles;
        put(Tex.water1, tiles.water[1]);
      },
    },
  ];
}

/** The touch HUD's menu button: three bars (22×22 with the outline). */
function menuIcon(): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 22;
  const c = cv.getContext('2d')!;
  for (const y of [4, 9, 14]) {
    c.fillStyle = '#2a1406';
    c.fillRect(3, y, 16, 5);
    c.fillStyle = '#8a5a36';
    c.fillRect(4, y + 1, 14, 3);
    c.fillStyle = '#c08a58';
    c.fillRect(4, y + 1, 14, 1);
  }
  return cv;
}

/**
 * Every texture the game uses, as a list of steps so the loading screen can run them
 * across frames and show progress. Call `result()` after all jobs have run.
 */
export function textureJobs(scene: Phaser.Scene): TextureJob[] {
  const tm = scene.textures;
  const add = (key: string, cv: HTMLCanvasElement) => {
    if (!tm.exists(key)) tm.addCanvas(key, cv);
  };

  const icon = (key: string, col: string) => {
    // hand-drawn HD icons; Scale2x of the small source art only for icons without one
    const drawn = HD_ICONS[key];
    add(Tex.icon(key), drawn ? drawn() : scale2x(drawIcon(ICONS[key], col)));
  };

  const jobs: TextureJob[] = [
    {
      label: 'Sharpening swords…',
      run: () => {
        for (const key of Object.keys(SKILLS) as (keyof typeof SKILLS)[]) icon(key, SKILLS[key].col);
        for (const key of Object.keys(ACTIONS) as (keyof typeof ACTIONS)[]) icon(key, ACTIONS[key].col);
        icon('rev', '#f2c14e');
        for (const id of ITEM_IDS) add(Tex.item(id), itemIcon(id));
        add(Tex.icon('bag'), backpackIcon());
        add(Tex.icon('craft'), hammerIcon());
        add(Tex.icon('quests'), scrollIcon());
        add(Tex.icon('settings'), cogIcon());
        add(Tex.icon('help'), bookIcon());
        add(Tex.icon('view_iso'), view_isoIcon());
        add(Tex.icon('view_diorama'), view_3dIcon());
        add(Tex.icon('view_pov'), view_povIcon());
        add(Tex.icon('menu'), menuIcon());
        add(Tex.icon('talents'), starIcon());
        add(Tex.icon('spellbook'), spellbookIcon());
        add(Tex.icon('eye'), eyeIcon());
        add(Tex.icon('flame'), flameIcon());
        add(Tex.icon('heart'), heartIcon());
        add(Tex.icon('secondwind'), SKILL_ICONS.secondwind());
        add(Tex.sun, sprite(SUN));
        add(Tex.moon, sprite(MOON));
      },
    },
    ...styleJobs(scene, spriteStyle()),
  ];
  return jobs;
}

/**
 * Redraw every style-dependent texture for `style`, synchronously and in place. The world
 * layout does not change, so callers only need to refresh sprite scales and crops.
 */
export function applyStyleTextures(scene: Phaser.Scene, style: SpriteStyle): void {
  for (const j of styleJobs(scene, style)) j.run();
}

/**
 * Redraw only the hero's frames in place (after a change of gear). Only the HD styles
 * draw gear; other styles keep their hero.
 */
export function applyHeroTextures(scene: Phaser.Scene, style: SpriteStyle): void {
  putFramesOf(scene, Tex.knight, styleArt(style).heroes().knight);
}

/**
 * Frames for another player's hero, in their look and gear, drawn the way the game draws
 * heroes (HD, recoloured for HD · Silhouette). Built the first time and kept; returns the
 * texture key (walk frames, and idle / attack / jump / flip animations, like Tex.knight).
 */
export function heroLookTexture(scene: Phaser.Scene, look: string, equip: Partial<Record<Slot, ItemId | null>>): string {
  const id = lookId(look);
  const key = `hero:${id}:${SLOTS.map(s => equip[s] ?? '').join(',')}`;
  if (scene.textures.exists(frameKey(key, 0))) return key;
  const f = hdHeroFrames(id, equip);
  const re = spriteStyle() === 'hdsil' ? (cv: HTMLCanvasElement) => regrade(cv) : (cv: HTMLCanvasElement) => cv;
  putFramesOf(scene, key, {
    frames: f.walk.map(re),
    anims: Object.fromEntries(Object.entries(f.anims).map(([k, list]) => [k, list.map(re)])),
    scale: 1,
  });
  return key;
}

/** How another player's hero sits a horse: the rider crop of their look (see heroLookTexture). */
export function heroLookRider(look: string): RiderFit {
  return HD_HEROES[lookId(look)].rider;
}

function lookId(look: string): HdHeroId {
  return (HD_HERO_IDS as string[]).includes(look) ? (look as HdHeroId) : 'k1';
}

/** HD iso tile set. */
function hdIsoTiles(): IsoTiles {
  return {
    grass: [0, 1, 2].map(v => HD.isoGrass(v)),
    dirt: [0, 1].map(v => HD.isoDirt(v)),
    water: [0, 1].map(f => HD.isoWater(f)),
    flower: HD.isoFlowers(),
    floor: [0, 1].map(v => HD.isoFloor(v)),
    gate: HD.isoGate(),
  };
}

/** Build everything synchronously (no loading screen). */
export function buildTextures(scene: Phaser.Scene): void {
  for (const j of textureJobs(scene)) j.run();
}
