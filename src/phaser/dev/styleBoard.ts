import type { StyleKit, Overlay } from '../render/styles/common';
import { isoTile, hash } from '../render/styles/common';
import { CHUNKY } from '../render/styles/chunky';
import { RIMLIT } from '../render/styles/rimlit';
import { PASTEL } from '../render/styles/pastel';
import { CHARACTER_KITS } from '../render/styles/characters';
import { REFERENCE_KITS } from '../render/styles/references';
import { ABSTRACT_KITS } from '../render/styles/abstract';
import { ABSTRACT_STYLE_KITS } from '../render/styles/abstractStyles';
import { VARIANT_KITS } from '../render/styles/abstractVariants';
import { SILHOUETTE_ROUND, SILHOUETTE_SET_ASIDE, FAVOURITE_PICKS, SHORTLIST, SHORTLIST_VARIANTS } from '../render/styles/silhouetteRound';
import { hero as hdHero, cow as hdCow } from '../render/hdHero';
import * as HD from '../render/hdSprites';

/** The art currently in the game, wrapped as a kit so it can sit on the board for reference. */
const CURRENT: StyleKit = {
  id: 'current',
  name: 'Current (HD)',
  blurb: 'What the game uses today, for reference.',
  scale: 1,
  hero: hdHero,
  cow: hdCow,
  slime: () => HD.slime()[0],
  skeleton: HD.skeleton,
  tree: HD.oak,
  grass: () => HD.isoGrass(0),
  dirt: () => HD.isoDirt(0),
};

const TABS: { label: string; kits: StyleKit[]; perRow?: number }[] = [
  { label: 'Shortlist (14)', kits: [...SHORTLIST, ...SHORTLIST_VARIANTS], perRow: 4 }, // 8 shortlisted looks, then 6 variants of them
  { label: 'Silhouette round (21)', kits: [...SILHOUETTE_ROUND, ...FAVOURITE_PICKS], perRow: 3 }, // one row per entry in SILHOUETTE_ROWS, then the favourites
  { label: 'Set aside (3)', kits: SILHOUETTE_SET_ASIDE, perRow: 3 },
  { label: 'Variants of 1·2·3 (18)', kits: VARIANT_KITS, perRow: 3 }, // each family fills two rows
  { label: 'Abstract styles (8)', kits: ABSTRACT_STYLE_KITS },
  { label: 'Abstract places (8)', kits: ABSTRACT_KITS },
  { label: 'Your references (2)', kits: [...REFERENCE_KITS, CURRENT] },
  { label: 'Character design (8)', kits: [...CHARACTER_KITS, CURRENT] },
  { label: 'Colour & mood (3)', kits: [CHUNKY, RIMLIT, PASTEL, CURRENT] },
];

// neutral ground for kits that don't bring their own, so only the characters differ
const NEUTRAL_GRASS = () => isoTile(64, 32, (x, y) => (hash(x >> 1, y, 11) < 0.1 ? '#86b86c' : '#74a85c'));
const NEUTRAL_DIRT = () => isoTile(64, 32, (x, y) => (hash(x >> 1, y, 12) < 0.12 ? '#b89468' : '#c8a47a'));

/** Tree spots around the path for kits that bring a forest (grid cell i, j). */
const FOREST: [number, number][] = [[-1, -3], [1, -3], [-2, -1], [2, -2], [-3, 1], [3, -1], [-2, 2], [1, 2]];

export const K = 3; // canvas pixels per logical pixel
export const LINE_W = 300;
export const LINE_H = 120;
export const SCENE_W = 300;
export const SCENE_H = 190;

export interface Built {
  kit: StyleKit;
  hero: HTMLCanvasElement[];
  cow: HTMLCanvasElement[];
  slime: HTMLCanvasElement;
  skel: HTMLCanvasElement[] | null;
  tree: HTMLCanvasElement | null;
  trees: HTMLCanvasElement[] | null;
  grass: HTMLCanvasElement;
  dirt: HTMLCanvasElement;
  groundScale: number;
  line: HTMLCanvasElement;
  scene: HTMLCanvasElement;
}

function ctx(cv: HTMLCanvasElement): CanvasRenderingContext2D {
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.setTransform(K, 0, 0, K, 0, 0);
  return c;
}

/** Magnified lineup on a neutral background: hero idle, hero walking, cow, slime. */
export function drawLineup(b: Built, frame: number): void {
  const c = ctx(b.line);
  c.fillStyle = b.kit.bg ?? '#d8d2c2';
  c.fillRect(0, 0, LINE_W, LINE_H);
  c.fillStyle = 'rgba(0,0,0,0.14)';
  c.fillRect(0, LINE_H - 14, LINE_W, 14);
  const sprites = [b.hero[0], b.hero[frame % b.hero.length], b.cow[frame % b.cow.length], b.slime];
  // magnify so the tallest sprite fills the strip, whole numbers only (crisp pixels)
  const tallest = Math.max(...sprites.map(s => s.height));
  const gap = 10;
  const wide = sprites.reduce((a, s) => a + s.width, 0);
  // magnification in whole canvas pixels, so every sprite pixel stays crisp
  const mag = Math.max(1, Math.floor(Math.min((88 * K) / tallest, ((LINE_W - 20 - gap * (sprites.length - 1)) * K) / wide))) / K;
  const total = sprites.reduce((a, s) => a + s.width * mag, 0) + gap * (sprites.length - 1);
  let x = Math.round((LINE_W - total) / 2);
  for (const s of sprites) {
    c.drawImage(s, x, LINE_H - 14 - s.height * mag + 4, s.width * mag, s.height * mag);
    x += s.width * mag + gap;
  }
}

/** Small iso scene at in-game size: path, optional trees, hero, cow, slime, optional skeleton. */
export function drawScene(b: Built, frame: number): void {
  const { kit } = b;
  const c = ctx(b.scene);
  c.fillStyle = kit.bg ?? (kit.id === 'rimlit' ? '#070a10' : kit.id === 'pastel' ? '#5a4a78' : '#0c1018');
  c.fillRect(0, 0, SCENE_W, SCENE_H);
  const s = kit.scale;
  const gs = b.groundScale;
  const cx = SCENE_W / 2;
  const cy = 98;
  const at = (i: number, j: number) => ({ x: cx + (i - j) * 32, y: cy + (i + j) * 16 });
  for (let j = -3; j <= 3; j++)
    for (let i = -3; i <= 3; i++) {
      if (Math.abs(i) + Math.abs(j) > 4) continue;
      const p = at(i, j);
      const tile = i === 0 ? b.dirt : b.grass;
      c.drawImage(tile, p.x - 32, p.y - 16, tile.width * gs, tile.height * gs);
    }
  const put = (img: HTMLCanvasElement, i: number, j: number, flip = false) => {
    const p = at(i, j);
    const w = img.width * s;
    const h = img.height * s;
    c.save();
    c.translate(Math.round(p.x), Math.round(p.y + 6));
    if (flip) c.scale(-1, 1);
    c.drawImage(img, Math.round(-w / 2), -h, w, h);
    c.restore();
  };
  const f = (arr: HTMLCanvasElement[]) => arr[frame % arr.length];
  const items: [number, () => void][] = [
    [0, () => put(f(b.hero), 0, 0)],
    [3, () => put(f(b.cow), 2, 1, true)],
    [1, () => put(b.slime, -1, 2)],
  ];
  if (b.trees) {
    const trees = b.trees;
    FOREST.forEach(([i, j], n) => items.push([i + j - 0.1, () => put(trees[n % trees.length], i, j, n % 3 === 2)]));
  }
  if (b.tree && !b.trees) {
    const tree = b.tree;
    items.push([-3, () => put(tree, -2, -1)], [-2.5, () => put(tree, 1, -3)]);
  }
  if (b.skel) {
    const skel = b.skel;
    items.push([1, () => put(f(skel), 2, -1, true)]);
  }
  items.sort((a, z) => a[0] - z[0]).forEach(([, draw]) => draw());
  if (kit.overlay) drawOverlay(c, kit.overlay, at(0, 0), frame);
}

/** Atmosphere in chunky 4px blocks so it matches the art: ember light, snow, spores. */
function drawOverlay(c: CanvasRenderingContext2D, kind: Overlay, hero: { x: number; y: number }, frame: number): void {
  const B = 4;
  if (kind === 'ember') {
    for (let y = 0; y < SCENE_H; y += B)
      for (let x = 0; x < SCENE_W; x += B) {
        const d = Math.hypot(x + B / 2 - hero.x, (y + B / 2 - hero.y + 14) * 1.6);
        // darkness away from the light, a warm pool around the wanderer, lava glow rising from below
        const dark = Math.min(0.6, Math.max(0, (d - 44) / 140));
        const pool = Math.max(0, 1 - d / 46) * 0.22;
        const lava = Math.max(0, (y - SCENE_H * 0.62) / (SCENE_H * 0.38)) * 0.5;
        if (dark > 0.01) {
          c.fillStyle = `rgba(10,4,18,${dark.toFixed(3)})`;
          c.fillRect(x, y, B, B);
        }
        if (pool > 0.01) {
          c.fillStyle = `rgba(255,176,96,${pool.toFixed(3)})`;
          c.fillRect(x, y, B, B);
        }
        if (lava > 0.01) {
          c.fillStyle = `rgba(255,96,32,${lava.toFixed(3)})`;
          c.fillRect(x, y, B, B);
        }
      }
    return;
  }
  if (kind === 'glow') {
    for (let y = 0; y < SCENE_H; y += B)
      for (let x = 0; x < SCENE_W; x += B) {
        const d = Math.hypot(x + B / 2 - hero.x, (y + B / 2 - hero.y + 14) * 1.6);
        // night everywhere, a cool pool of light from the wanderer's blade and eyes
        const dark = Math.min(0.55, Math.max(0, (d - 40) / 130));
        const pool = Math.max(0, 1 - d / 50) * 0.16;
        if (dark > 0.01) {
          c.fillStyle = `rgba(2,4,8,${dark.toFixed(3)})`;
          c.fillRect(x, y, B, B);
        }
        if (pool > 0.01) {
          c.fillStyle = `rgba(120,240,224,${pool.toFixed(3)})`;
          c.fillRect(x, y, B, B);
        }
      }
    for (let i = 0; i < 16; i++) {
      if (hash(i, frame % 4, 5) < 0.3) continue; // fireflies blink
      const x = Math.floor((hash(i, 3, 77) * SCENE_W + Math.sin(frame * 0.3 + i) * 4) / B) * B;
      const y = Math.floor((hash(i, 4, 77) * SCENE_H * 0.8 + Math.cos(frame * 0.25 + i) * 4) / B) * B;
      c.fillStyle = 'rgba(255,214,120,0.9)';
      c.fillRect(x, y, B, B);
    }
    return;
  }
  const n = kind === 'snow' ? 46 : 22;
  for (let i = 0; i < n; i++) {
    const drift = kind === 'snow' ? frame * 3 : Math.sin(frame * 0.4 + i) * 3;
    const x = Math.floor((hash(i, 1, 99) * SCENE_W + (kind === 'snow' ? frame : 0)) % SCENE_W / B) * B;
    const y = Math.floor(((hash(i, 2, 99) * SCENE_H + drift) % SCENE_H + SCENE_H) % SCENE_H / B) * B;
    c.fillStyle = kind === 'snow' ? 'rgba(255,255,255,0.85)' : `rgba(200,255,120,${(0.35 + 0.5 * hash(i, frame % 5, 7)).toFixed(2)})`;
    c.fillRect(x, y, B, B);
  }
}

export function build(kit: StyleKit, line: HTMLCanvasElement, scene: HTMLCanvasElement): Built {
  const own = !!kit.grass;
  return {
    kit,
    hero: kit.hero(),
    cow: kit.cow(),
    slime: kit.slime(),
    skel: kit.skeleton ? kit.skeleton() : null,
    tree: kit.tree ? kit.tree() : null,
    trees: kit.trees ? kit.trees() : null,
    grass: own ? kit.grass!() : NEUTRAL_GRASS(),
    dirt: kit.dirt ? kit.dirt() : NEUTRAL_DIRT(),
    groundScale: own ? kit.scale : 1,
    line,
    scene,
  };
}

/**
 * Art direction board (dev tool): candidate styles side by side, animated, with the
 * current art for reference. Tabs switch between the character-design set and the
 * colour & mood set.
 */
export class StyleBoard {
  private root: HTMLDivElement | null = null;
  private grid: HTMLDivElement | null = null;
  private tabBtns: HTMLButtonElement[] = [];
  private timer = 0;
  private frame = 0;
  private built: Built[] = [];
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.close();
  };

  get isOpen(): boolean {
    return this.root !== null;
  }

  open(tab = 0): void {
    if (this.root) return;
    const root = document.createElement('div');
    root.className = 'styleboard';
    root.addEventListener('mousedown', e => e.stopPropagation());
    const head = document.createElement('header');
    const title = document.createElement('span');
    title.textContent = 'Art direction board';
    const tabs = document.createElement('nav');
    this.tabBtns = TABS.map((t, i) => {
      const b = document.createElement('button');
      b.textContent = t.label;
      b.addEventListener('click', () => this.show(i));
      tabs.append(b);
      return b;
    });
    const close = document.createElement('button');
    close.textContent = '×';
    close.title = 'Close (Esc)';
    close.addEventListener('click', () => this.close());
    head.append(title, tabs, close);
    root.append(head);
    this.grid = document.createElement('div');
    this.grid.className = 'styleboard-grid';
    root.append(this.grid);
    document.body.append(root);
    this.root = root;
    window.addEventListener('keydown', this.onKey);
    this.show(tab);
    this.timer = window.setInterval(() => {
      this.frame++;
      this.redraw();
    }, 300);
  }

  private show(tab: number): void {
    if (!this.grid) return;
    this.tabBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === tab)));
    this.grid.textContent = '';
    const per = TABS[tab].perRow;
    this.grid.style.gridTemplateColumns = per && window.innerWidth >= per * 280 ? `repeat(${per}, minmax(0, 1fr))` : '';
    this.built = TABS[tab].kits.map(kit => {
      const card = document.createElement('section');
      const h = document.createElement('h3');
      h.textContent = kit.name;
      const line = document.createElement('canvas');
      line.width = LINE_W * K;
      line.height = LINE_H * K;
      const scene = document.createElement('canvas');
      scene.width = SCENE_W * K;
      scene.height = SCENE_H * K;
      const p = document.createElement('p');
      p.textContent = kit.blurb;
      card.append(h, line, scene, p);
      this.grid!.append(card);
      return build(kit, line, scene);
    });
    this.redraw();
  }

  private redraw(): void {
    for (const b of this.built) {
      drawLineup(b, this.frame);
      drawScene(b, this.frame);
    }
  }

  close(): void {
    if (!this.root) return;
    window.clearInterval(this.timer);
    window.removeEventListener('keydown', this.onKey);
    this.root.remove();
    this.root = null;
    this.grid = null;
    this.built = [];
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }
}
