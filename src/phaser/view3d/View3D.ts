import Phaser from 'phaser';
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  GreaterDepth,
  Group,
  LinearMipmapLinearFilter,
  LinearSRGBColorSpace,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Texture,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from 'three';
import type { Camera, ShaderMaterial } from 'three';
import type { Sim } from '../../sim/Sim';
import type { WorldRenderer, Pin } from '../render/WorldRenderer';
import type { BuiltWorld } from '../render/textures';
import type { Lighting } from '../lighting/Lighting';
import type { Effects } from '../render/Effects';
import { Tex } from '../render/textures';
import { artScale } from '../render/art';
import { PROPS } from '../../data/props';
import { PROP_ART } from '../render/propArt';
import { T, Tile, fromIso, isoX, isoY } from '../../sim/map';
import { PIXEL_SCALE, hex } from '../config';
import { darknessLevel } from '../../sim/daylight';
import { LIGHT, MAX_LIGHTS, billboardMaterial, flatMaterial, groundMaterial, twoSided, voxelMaterial } from './materials';
import { loadVoxels, voxelGeometry } from './voxels';
import type { VoxelSet } from './voxels';
import { CanvasGfx } from './CanvasGfx';
import { SceneKeys } from '../SceneKeys';

/** How the world is seen: the 2D isometric art, a turnable 3D diorama, or close behind the hero. */
export type ViewMode = 'iso' | 'diorama' | 'pov';
/** The views in the order V (and the view button) steps through them. */
export const VIEW_MODES: ViewMode[] = ['iso', 'diorama', 'pov'];
export const VIEW_NAMES: Record<ViewMode, string> = { iso: 'Isometric', diorama: 'Diorama (3D)', pov: 'Point of view (3D)' };

/**
 * World units per art px. The 2D art is a 2:1 projection seen from 30° above, one art px per
 * world px across the ground's diagonal: a sprite W px wide is W/√2 world px across, and an
 * upright H px tall is H·√(2/3) world px high. At the diorama's starting angle everything
 * then lands on screen exactly where the 2D view draws it.
 */
const HK = Math.SQRT1_2;
const ZK = Math.sqrt(2 / 3);
/** The diorama's starting angle: the 2D art's (the camera south-east of the hero, 30° up). */
const ISO_YAW = Math.PI / 4;
const ISO_PITCH = Math.PI / 6;

interface Bill {
  mesh: Mesh;
  mat: ShaderMaterial;
  text: boolean;
  /** Last ground point, to turn a walker the way it moves when the view is turned. */
  lx: number;
  ly: number;
  faceR: boolean;
  /** The 2D view's flip last frame (a change is a standing turn, to a target or a speaker). */
  flip2d: boolean;
  /** Its walk on the ground (world px a second), smoothed over a few frames. */
  vx: number;
  vy: number;
  /** Seconds before it may turn again (a path that zig-zags round something must not flicker it). */
  holdT: number;
  /** Text: what its canvas last showed (redrawn when this changes). */
  sig: string;
  seen: boolean;
  /** The hero's own sprites: a faint silhouette drawn where a building hides them. */
  ghost: Mesh | null;
}

interface Shadow {
  mesh: Mesh;
  mat: ShaderMaterial;
  seen: boolean;
}

/** An interior wall tile: tall, or cut low when it stands between the camera and a room. */
interface WallTile {
  c: number;
  r: number;
  hi: Mesh;
  lo: Mesh | null;
}

/**
 * The world in 3D, drawn under the Phaser canvas (which keeps the HUD, and goes see-through
 * where the 2D world was). It reads the same simulation and stands up the very sprites the 2D
 * renderer animates (WorldRenderer pins where each stands), on a ground made of the 2D ground
 * art laid flat, among voxel buildings (tools/world/voxels.py).
 */
export class View3D {
  readonly canvas: HTMLCanvasElement;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly ortho = new OrthographicCamera(-1, 1, 1, -1, 1, 6000);
  private readonly persp = new PerspectiveCamera(55, 1, 2, 5000);
  private cam: Camera = this.ortho;
  mode: Exclude<ViewMode, 'iso'> = 'diorama';
  /** Which way the camera looks from: the direction from the hero to the camera, round the up axis. */
  yaw = ISO_YAW;
  /** The diorama turns in steps: where it is turning to. */
  private yawGoal = ISO_YAW;
  /** How far above the ground the camera looks down, per mode. */
  private pitch = { diorama: ISO_PITCH, pov: 0.2 };
  /** Diorama zoom (1 = the 2D view's scale) and how far behind the hero the PoV camera sits. */
  private zoom = 1;
  private dist = 96;
  /** Render at the game's chunky pixel size (true) or the screen's own. */
  chunky = true;
  /** The camera's right, flat on the ground (x, world y): screen right in a turned view. */
  private readonly right = new Vector3(1, 0, 0);
  /** How much the 2D art's "right" still points right on screen (1 in the 2D view's angle). */
  private r0 = 1;
  private world: WorldRenderer | null = null;
  private readonly region = new Group();
  private readonly bills = new Map<Phaser.GameObjects.GameObject, Bill>();
  private readonly shadows = new Map<Phaser.GameObjects.GameObject, Shadow>();
  private readonly textures = new Map<CanvasImageSource, { tex: Texture; w: number; h: number }>();
  private readonly quad = new BufferGeometry();
  private readonly flatQuad = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly voxMat = voxelMaterial();
  private readonly wheelMat = twoSided(voxelMaterial());
  private readonly geoms = new Map<string, BufferGeometry>();
  private voxels: VoxelSet | null = null;
  /** The models have arrived (or failed to: then every building is its 2D art, stood up). */
  private voxelsTried = false;
  /** Ground chunks with water: their two frames (the second drawn into a copy, see setRegion). */
  private waterChunks: { mat: ShaderMaterial; a: Texture; b: Texture }[] = [];
  /** Canvases made for one region (the water's second frames), let go with it. */
  private regionCanvases: HTMLCanvasElement[] = [];
  private readonly anims: { meshes: Mesh[]; ms: number }[] = [];
  private walls: WallTile[] = [];
  private wallKey = '';
  private readonly outside: Mesh;
  private readonly outsideCol = new Color();
  private readonly fx = new CanvasGfx(512);
  private readonly fxTex: CanvasTexture;
  private readonly fxMesh: Mesh;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private fxShown = false;
  /** The PoV sky: a gradient from the top of the screen down to the horizon (the fog's colour). */
  private readonly skyCanvas = document.createElement('canvas');
  private readonly skyTex: CanvasTexture;
  private skyKey = '';
  /** How far the diorama camera was nudged onto whole pixels this frame (the hero goes with it). */
  private readonly snap = new Vector3();
  private heroSet = new Set<Phaser.GameObjects.GameObject>();
  /** This frame's length (s). */
  private dt = 1 / 60;
  private built: BuiltWorld | null = null;
  private dragging = false;
  private readonly onWheel: (e: WheelEvent) => void;
  /** The point the camera follows (world px), and how high (world units). */
  private readonly at = new Vector3();
  private destroyed = false;

  constructor(
    private readonly phaser: Phaser.Scene,
    private readonly sim: Sim,
    private readonly lighting: Lighting,
    private readonly effects: Effects
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'view3d';
    const host = phaser.game.canvas.parentElement ?? document.body;
    host.insertBefore(this.canvas, phaser.game.canvas);
    this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    // colours pass through untouched, like the 2D canvas
    this.renderer.outputColorSpace = LinearSRGBColorSpace;
    this.scene.add(this.region);
    this.quad.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]), 3));
    this.quad.setIndex([0, 1, 2, 0, 2, 3]);
    // the land past the region's edge, a little below the ground
    this.outside = new Mesh(new PlaneGeometry(40000, 40000).rotateX(-Math.PI / 2), flatMaterial(this.outsideCol));
    this.outside.position.y = -0.6;
    this.outside.renderOrder = -2;
    this.scene.add(this.outside);
    // the effects canvas, laid on the ground round the hero (its first row is its north edge)
    this.fxTex = new CanvasTexture(this.fx.canvas);
    this.fxTex.magFilter = NearestFilter;
    this.fxTex.minFilter = NearestFilter;
    this.fxTex.generateMipmaps = false;
    this.fxMesh = new Mesh(this.flatQuad, groundMaterial(this.fxTex, { cut: 0.01 }));
    this.fxMesh.scale.set(this.fx.size, 1, this.fx.size);
    this.fxMesh.position.y = 0.4;
    this.fxMesh.renderOrder = 1;
    this.scene.add(this.fxMesh);
    this.skyCanvas.width = 1;
    this.skyCanvas.height = 64;
    this.skyTex = new CanvasTexture(this.skyCanvas);
    this.onWheel = e => this.wheel(e);
    phaser.game.canvas.addEventListener('wheel', this.onWheel, { passive: true });
    this.resize();
    void loadVoxels().then(v => {
      if (this.destroyed) return;
      this.voxels = v;
      this.voxelsTried = true;
      if (this.built) this.buildProps();
    });
  }

  // ---------- the region ----------
  /** A new region (or the first): lay its ground, put up its buildings and walls. */
  setRegion(world: WorldRenderer, built: BuiltWorld): void {
    this.world = world;
    this.built = built;
    for (const b of this.bills.values()) this.dropBill(b);
    this.bills.clear();
    for (const s of this.shadows.values()) this.dropShadow(s);
    this.shadows.clear();
    this.clearRegion();
    const map = this.sim.map;
    const clip = new Vector4(0, 0, map.w, map.h);
    // the 2D ground art is the ground seen at 2:1, so each chunk lies flat as the parallelogram
    // its corners project back to (an affine map: the pixels land exactly where they belong)
    const water1 = built.water.length && this.phaser.textures.exists(Tex.water1) ? (this.phaser.textures.get(Tex.water1).getSourceImage() as HTMLCanvasElement) : null;
    for (const g of built.ground) {
      const src = this.phaser.textures.get(g.key).getSourceImage() as HTMLCanvasElement;
      // (each region redraws the same chunk canvases: upload them again)
      const tex = this.canvasTexture(src, true);
      tex.needsUpdate = true;
      const mat = groundMaterial(tex, { clip });
      const mesh = new Mesh(this.isoQuad(g.x, g.y, src.width, src.height), mat);
      mesh.renderOrder = -1;
      this.region.add(mesh);
      // the water's second frame, drawn into a copy of the chunk where the 2D view draws it over
      // the ground; the frames then swap as whole textures (laid tile by tile, seen low and far,
      // every tile's edge showed as a seam)
      if (!water1) continue;
      let alt: HTMLCanvasElement | null = null;
      for (const [wx, wy] of built.water) {
        const x = isoX(wx, wy) - 32 - g.x;
        const y = isoY(wx, wy) - 16 - g.y;
        if (x + water1.width <= 0 || y + water1.height <= 0 || x >= src.width || y >= src.height) continue;
        if (!alt) {
          alt = document.createElement('canvas');
          alt.width = src.width;
          alt.height = src.height;
          alt.getContext('2d')!.drawImage(src, 0, 0);
        }
        alt.getContext('2d')!.drawImage(water1, x, y);
      }
      if (alt) {
        this.regionCanvases.push(alt);
        this.waterChunks.push({ mat, a: tex, b: this.canvasTexture(alt, true) });
      }
    }
    const indoor = !!this.sim.regionDef.indoor;
    this.outsideCol.set(indoor ? '#0b1220' : '#2f4a3c');
    if (this.voxelsTried) this.buildProps();
  }

  /** The 2D chunk at projected (x, y), w × h px, as a flat quad on the ground. */
  private isoQuad(x: number, y: number, w: number, h: number): BufferGeometry {
    const pos: number[] = [];
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
      const p = fromIso(x + u * w, y + v * h);
      pos.push(p.x, 0, p.y);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    g.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
    // seen from above, (0,0) (1,0) (1,1) runs clockwise in world x/y: wind it the other way
    g.setIndex([0, 2, 1, 0, 3, 2]);
    return g;
  }

  private geom(kind: string): BufferGeometry | null {
    let g = this.geoms.get(kind);
    if (!g) {
      const m = this.voxels?.[kind];
      if (!m) return null;
      g = voxelGeometry(m, ZK);
      this.geoms.set(kind, g);
    }
    return g;
  }

  /** The buildings (voxel models, or their art stood up where there is none) and interior walls. */
  private buildProps(): void {
    const built = this.built;
    if (!built) return;
    for (const p of this.sim.props) {
      const def = PROPS[p.kind];
      const g = this.geom(p.kind);
      if (g) {
        const mesh = new Mesh(g, this.voxMat);
        mesh.position.set(p.c * T, 0, p.r * T);
        this.region.add(mesh);
        if (def.anim) {
          const n = PROP_ART[def.anim.art]?.frames?.length ?? 0;
          const meshes: Mesh[] = [];
          for (let i = 0; i < n; i++) {
            const ag = this.geom(`${def.anim.art}~${i}`);
            if (!ag) continue;
            const am = new Mesh(ag, this.wheelMat);
            am.position.copy(mesh.position);
            this.region.add(am);
            meshes.push(am);
          }
          if (meshes.length) this.anims.push({ meshes, ms: def.anim.ms });
        }
        continue;
      }
      // painted props (the story trees), or any building without a model: its 2D art, stood up
      const key = Tex.prop(p.kind);
      if (!this.phaser.textures.exists(key)) continue;
      const src = this.phaser.textures.get(key).getSourceImage() as HTMLCanvasElement;
      const [cc, cr] = def.core ?? [def.w / 2 - 0.5, def.h / 2 - 0.5];
      const gx = (p.c + cc + 0.5) * T;
      const gy = (p.r + cr + 0.5) * T;
      // the art's bottom is the footprint's south corner, some way in front of the trunk
      const below = isoY((p.c + def.w) * T, (p.r + def.h) * T) + 1 - isoY(gx, gy);
      const left = isoX(p.c * T, (p.r + def.h) * T) - 1;
      const mat = billboardMaterial();
      const u = mat.uniforms;
      u.map.value = this.canvasTexture(src);
      u.uSize.value.set(src.width, src.height);
      u.uOrigin.value.set((isoX(gx, gy) - left) / src.width, below / src.height);
      u.uK.value.set(HK, ZK);
      u.uRight.value = this.right;
      const mesh = new Mesh(this.quad, mat);
      mesh.frustumCulled = false;
      mesh.position.set(gx, 0, gy);
      this.region.add(mesh);
    }
    // interior walls: stone blocks, cut low where they would hide the room
    for (const o of built.objects) {
      if (o.kind !== Tile.Wall && o.kind !== Tile.Tower) continue;
      const hi = this.geom('wallblock');
      if (!hi) continue;
      const c = Math.floor(o.wx / T);
      const r = Math.floor(o.wy / T);
      const mk = (g: BufferGeometry) => {
        const m = new Mesh(g, this.voxMat);
        m.position.set(c * T, 0, r * T);
        this.region.add(m);
        return m;
      };
      const lo = this.geom('wallblock_lo');
      this.walls.push({ c, r, hi: mk(hi), lo: lo ? mk(lo) : null });
    }
    this.wallKey = '';
  }

  private clearRegion(): void {
    for (const o of [...this.region.children]) {
      this.region.remove(o);
      const m = o as Mesh;
      // shared geometry (voxel models, the sprite quad) stays; region-own geometry goes
      if (m.geometry && m.geometry !== this.quad && ![...this.geoms.values()].includes(m.geometry)) m.geometry.dispose();
      const mat = m.material as ShaderMaterial | undefined;
      if (mat && mat !== this.voxMat && mat !== this.wheelMat) mat.dispose();
    }
    this.waterChunks = [];
    for (const c of this.regionCanvases) {
      this.textures.get(c)?.tex.dispose();
      this.textures.delete(c);
    }
    this.regionCanvases = [];
    this.anims.length = 0;
    this.walls = [];
  }

  // ---------- textures ----------
  /** A texture of a canvas (one per canvas); `mip`: smoothed when far or turned (the ground), else crisp. */
  private canvasTexture(src: CanvasImageSource, mip = false): Texture {
    const w = (src as HTMLCanvasElement).width;
    const h = (src as HTMLCanvasElement).height;
    const have = this.textures.get(src);
    if (have && have.w === w && have.h === h) return have.tex;
    // a canvas that changed size needs a new texture (the old storage is the old size)
    have?.tex.dispose();
    const tex = new CanvasTexture(src as HTMLCanvasElement);
    tex.magFilter = NearestFilter;
    tex.minFilter = mip ? LinearMipmapLinearFilter : NearestFilter;
    tex.generateMipmaps = mip;
    tex.flipY = false;
    this.textures.set(src, { tex, w, h });
    return tex;
  }

  /** Art redrawn in place (new gear, another art style): upload every texture again. */
  refreshTextures(): void {
    for (const t of this.textures.values()) t.tex.needsUpdate = true;
  }

  // ---------- modes and the camera ----------
  setMode(mode: Exclude<ViewMode, 'iso'>): void {
    this.mode = mode;
    this.cam = mode === 'pov' ? this.persp : this.ortho;
    // the PoV view starts behind the hero, looking the way the diorama did
    this.yawGoal = this.yaw;
  }

  /** `,` / `.`: the diorama turns a quarter of a quarter turn (eased); PoV turns while held. */
  turnStep(dir: 1 | -1): void {
    if (this.mode !== 'diorama') return;
    const step = Math.PI / 4;
    this.yawGoal = Math.round(this.yawGoal / step) * step + dir * step;
  }

  /** Right-drag: turn round the hero, and tilt. */
  look(dx: number, dy: number): void {
    this.yaw -= dx * 0.008;
    this.yawGoal = this.yaw;
    const lim = this.mode === 'pov' ? [-0.25, 1.2] : [0.12, 1.45];
    this.pitch[this.mode] = Math.max(lim[0], Math.min(lim[1], this.pitch[this.mode] + dy * 0.006));
  }

  setDragging(v: boolean): void {
    this.dragging = v;
  }

  private wheel(e: WheelEvent): void {
    const k = Math.exp(Math.sign(e.deltaY) * 0.12);
    if (this.mode === 'diorama') this.zoom = Math.max(0.35, Math.min(4, this.zoom / k));
    else this.dist = Math.max(0, Math.min(320, this.dist < 6 && k > 1 ? 12 : this.dist * k));
    if (this.mode === 'pov' && this.dist < 6) this.dist = 0;
  }

  /** Back to the 2D view's angle and scale. */
  resetCamera(): void {
    this.yaw = this.yawGoal = ISO_YAW;
    this.pitch = { diorama: ISO_PITCH, pov: 0.2 };
    this.zoom = 1;
    this.dist = 96;
  }

  /**
   * The keys as a walk direction on the ground. `mx`/`my` are the keys on screen (right, down):
   * the diorama walks relative to the screen; in PoV W/S walk forward and back and A/D step
   * sideways, while `turn` (Q/E, or , and .) turns the view.
   */
  steer(mx: number, my: number, turn: number, dt: number): { x: number; y: number } {
    const ox = Math.cos(this.yaw);
    const oy = Math.sin(this.yaw);
    // forward is away from the camera; right is the screen's right on the ground
    const fx = -ox;
    const fy = -oy;
    const rx = oy;
    const ry = -ox;
    if (this.mode === 'pov' && turn) {
      this.yaw += turn * 2.4 * dt;
      this.yawGoal = this.yaw;
    }
    const x = mx * rx - my * fx;
    const y = mx * ry - my * fy;
    const l = Math.hypot(x, y);
    return l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(this.chunky ? dpr / PIXEL_SCALE : dpr);
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
  }

  setChunky(v: boolean): void {
    this.chunky = v;
    this.resize();
  }

  /** Logical (HUD) size of the view. */
  private view(): { w: number; h: number } {
    return { w: this.phaser.scale.width / PIXEL_SCALE, h: this.phaser.scale.height / PIXEL_SCALE };
  }

  private placeCamera(dt: number): void {
    // ease toward a step turn
    let d = this.yawGoal - this.yaw;
    if (Math.abs(d) > 1e-4) this.yaw += d * Math.min(1, dt * 9);
    else this.yaw = this.yawGoal;
    const { w, h } = this.view();
    const ox = Math.cos(this.yaw);
    const oy = Math.sin(this.yaw);
    this.right.set(oy, 0, -ox);
    this.r0 = (oy + ox) * Math.SQRT1_2;
    const shake = this.sim.shake > 0 ? (Math.random() * 6 - 3) * HK : 0;
    const p = this.pitch[this.mode];
    if (this.mode === 'diorama') {
      const cam = this.ortho;
      const s = Math.SQRT2 * this.zoom;
      cam.left = -w / 2 / s;
      cam.right = w / 2 / s;
      cam.top = h / 2 / s;
      cam.bottom = -h / 2 / s;
      cam.updateProjectionMatrix();
      const far = 2000;
      const t = this.at;
      cam.position.set(t.x + ox * Math.cos(p) * far + this.right.x * shake, t.y + Math.sin(p) * far, t.z + oy * Math.cos(p) * far + this.right.z * shake);
      cam.up.set(0, 1, 0);
      cam.lookAt(t.x + this.right.x * shake, t.y, t.z + this.right.z * shake);
      // the hero sits 20 px above the middle of the screen, as in 2D
      cam.translateY(-20 / s);
      cam.updateMatrixWorld();
      // move in whole screen pixels, as the 2D camera does, so the ground's pixels never crawl
      // (the hero moves with the camera, so they hold still on screen)
      const buf = this.renderer.getDrawingBufferSize(new Vector2()).x / w;
      const px = 1 / (s * buf);
      const e = cam.matrixWorld.elements;
      const R = new Vector3(e[0], e[1], e[2]);
      const U = new Vector3(e[4], e[5], e[6]);
      const a = cam.position.dot(R);
      const b = cam.position.dot(U);
      const da = Math.round(a / px) * px - a;
      const db = Math.round(b / px) * px - b;
      this.snap.copy(R).multiplyScalar(da).addScaledVector(U, db);
      cam.position.add(this.snap);
      cam.updateMatrixWorld();
      LIGHT.uFog.value.set(0, 0);
      return;
    }
    this.snap.set(0, 0, 0);
    const cam = this.persp;
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    const head = new Vector3(this.at.x, 26, this.at.z);
    if (this.dist < 6) {
      // through the hero's eyes
      cam.position.set(this.at.x - ox * 4, 30, this.at.z - oy * 4);
      cam.lookAt(this.at.x - ox * 100, 30 - Math.tan(p) * 100, this.at.z - oy * 100);
    } else {
      const d = this.dist;
      cam.position.set(head.x + ox * Math.cos(p) * d, head.y + Math.sin(p) * d + 6, head.z + oy * Math.cos(p) * d);
      cam.lookAt(head.x - ox * 24, head.y, head.z - oy * 24);
    }
    if (shake) cam.position.addScaledVector(this.right, shake);
    cam.updateMatrixWorld();
    LIGHT.uFog.value.set(this.dist + 260, this.dist + 1100);
  }

  // ---------- projection (the HUD's picking and floaters) ----------
  /** World point (x, y) at height `h` art px to HUD (logical) px, and HUD px per art px there. */
  toScreen(x: number, y: number, h = 0): { x: number; y: number; k: number } {
    const { w, h: vh } = this.view();
    const v = new Vector3(x, h * ZK, y).project(this.cam);
    const v2 = new Vector3(x, (h + 10) * ZK, y).project(this.cam);
    const sx = ((v.x + 1) / 2) * w;
    const sy = ((1 - v.y) / 2) * vh;
    const k = Math.abs(((v.y - v2.y) / 2) * vh) / 10;
    // behind the camera: far off screen
    if (v.z > 1) return { x: -1e5, y: -1e5, k: 0 };
    return { x: sx, y: sy, k: k || 1 };
  }

  /** HUD (logical) px to the ground point under it, or null for the sky. */
  toGround(px: number, py: number): { x: number; y: number } | null {
    const { w, h } = this.view();
    const nx = (px / w) * 2 - 1;
    const ny = 1 - (py / h) * 2;
    const a = new Vector3(nx, ny, -1).unproject(this.cam);
    const b = new Vector3(nx, ny, 1).unproject(this.cam);
    const dy = b.y - a.y;
    if (Math.abs(dy) < 1e-6) return null;
    const t = -a.y / dy;
    if (t < 0) return null;
    return { x: a.x + (b.x - a.x) * t, y: a.z + (b.z - a.z) * t };
  }

  // ---------- each frame ----------
  /** Draw the world; `look` is the world point to follow (the hero, or what a scene shows). */
  update(now: number, dt: number, look: { x: number; y: number }): void {
    const world = this.world;
    if (!world) return;
    this.dt = dt;
    this.at.set(look.x, 0, look.y);
    if (this.mode === 'pov' && this.sim.path && !this.dragging && this.sim.moving && this.dist >= 6) {
      // walking by clicks: the camera swings round behind the hero
      const m = this.sim.hero.lastMove;
      if (m) {
        const want = Math.atan2(-m.y, -m.x);
        let d = want - this.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        // only while walking more or less away from the camera: walking toward it, swinging
        // round would turn the point you steer at too, and the two chase each other
        if (Math.abs(d) < 1.2) {
          this.yaw += d * Math.min(1, dt * 1.8);
          this.yawGoal = this.yaw;
        }
      }
    }
    this.placeCamera(dt);
    this.light();
    this.syncSprites(world);
    this.drawEffects();
    const wave = Math.floor(now / 450) % 2 === 1;
    for (const w of this.waterChunks) w.mat.uniforms.map.value = wave ? w.b : w.a;
    for (const a of this.anims) {
      const f = Math.floor(now / a.ms) % a.meshes.length;
      a.meshes.forEach((m, i) => (m.visible = i === f));
    }
    this.cutWalls();
    // lit windows: the same fade as the 2D view's
    const k = Math.max(0, Math.min(1, (darknessLevel(this.sim.day.t) - 0.25) / 0.4));
    const night = this.sim.regionDef.ring >= 4 ? 1 : k;
    this.voxMat.uniforms.uNight.value = night;
    this.wheelMat.uniforms.uNight.value = night;
    this.renderer.render(this.scene, this.cam);
  }

  /** The darkness of the hour and the nearest lights, into the shared uniforms; the sky to match. */
  private light(): void {
    const L = this.lighting;
    const on = L.isEnabled();
    const amb = L.ambient();
    LIGHT.uAmb.value.set(amb.r / 255, amb.g / 255, amb.b / 255);
    LIGHT.uStrength.value = on ? L.getStrength() : 0;
    const t = this.at;
    const near = L.lights
      .map(l => {
        const g = l.wx !== undefined && l.wy !== undefined ? { x: l.wx, y: l.wy } : fromIso(l.x, l.y);
        return { l, g, d: Math.hypot(g.x - t.x, g.y - t.z) };
      })
      .filter(o => o.l.radius > 0 && o.d < 1400)
      .sort((a, b) => a.d - b.d)
      .slice(0, MAX_LIGHTS);
    near.forEach(({ l, g }, i) => {
      LIGHT.uL.value[i].set(g.x, g.y, l.radius, L.lightAlpha(l));
      LIGHT.uLC.value[i].set(Math.min(l.r, amb.r / 255), Math.min(l.g, amb.g / 255), Math.min(l.b, amb.b / 255));
    });
    LIGHT.uNL.value = near.length;
    // the sky (PoV) and the void round an indoor region, darkened like everything else
    const k = on ? L.getStrength() : 0;
    const dim = (hexCol: string) => {
      const c = new Color(hexCol);
      c.r = Math.max(0, c.r - (amb.r / 255) ** 2 * k);
      c.g = Math.max(0, c.g - (amb.g / 255) ** 2 * k);
      c.b = Math.max(0, c.b - (amb.b / 255) ** 2 * k);
      return c;
    };
    if (this.mode !== 'pov' || this.sim.regionDef.indoor) {
      const v = dim('#0b1220');
      this.scene.background = v;
      LIGHT.uFogCol.value.copy(v);
      return;
    }
    // a pale haze at the horizon (where the fog meets it), deeper blue overhead; at night both
    // sink toward the 2D view's night navy
    const night = darknessLevel(this.sim.day.t) * k;
    const top = dim('#5d8fc4').lerp(new Color('#070b16'), night * 0.85);
    const low = dim('#b4cfe0').lerp(new Color('#0e1626'), night * 0.8);
    LIGHT.uFogCol.value.copy(low);
    const key = top.getHexString() + low.getHexString();
    if (key !== this.skyKey) {
      this.skyKey = key;
      const c = this.skyCanvas.getContext('2d')!;
      const g = c.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, '#' + top.getHexString());
      g.addColorStop(0.75, '#' + low.getHexString());
      g.addColorStop(1, '#' + low.getHexString());
      c.fillStyle = g;
      c.fillRect(0, 0, 1, 64);
      this.skyTex.needsUpdate = true;
    }
    this.scene.background = this.skyTex;
  }

  // ---------- sprites ----------
  private syncSprites(world: WorldRenderer): void {
    for (const b of this.bills.values()) b.seen = false;
    for (const s of this.shadows.values()) s.seen = false;
    this.heroSet = new Set(world.heroParts());
    const hideHero = this.mode === 'pov' && this.dist < 6 ? this.heroSet : null;
    for (const o of world.layer.getChildren()) {
      const pin = world.pins.get(o);
      if (!pin) continue;
      const img = o as Phaser.GameObjects.Image;
      if (!img.visible || img.alpha <= 0.01 || hideHero?.has(o)) continue;
      if (img.texture?.key === Tex.shadow) this.shadow(img, pin);
      else this.billboard(img, pin);
    }
    for (const [o, b] of this.bills) {
      if (b.seen) continue;
      b.mesh.visible = false;
      if (b.ghost) b.ghost.visible = false;
      if (!o.active) {
        this.dropBill(b);
        this.bills.delete(o);
      }
    }
    for (const [o, s] of this.shadows) {
      if (s.seen) continue;
      s.mesh.visible = false;
      if (!o.active) {
        this.dropShadow(s);
        this.shadows.delete(o);
      }
    }
  }

  private billboard(img: Phaser.GameObjects.Image, pin: Pin): void {
    const text = img instanceof Phaser.GameObjects.Text;
    let b = this.bills.get(img);
    if (!b) {
      const mat = billboardMaterial();
      mat.uniforms.uRight.value = this.right;
      mat.uniforms.uK.value.set(HK, ZK);
      const mesh = new Mesh(this.quad, mat);
      mesh.frustumCulled = false;
      if (text) {
        // names and marks stay readable over everything, like the 2D view's overlay
        mat.depthTest = false;
        mat.uniforms.uLit.value = 0;
        mat.uniforms.uText.value = 1;
        mesh.renderOrder = 10;
      }
      this.scene.add(mesh);
      b = { mesh, mat, text, lx: pin.x, ly: pin.y, faceR: (img.flipX ? -1 : 1) * this.r0 >= 0, flip2d: img.flipX, vx: 0, vy: 0, holdT: 0, sig: '', seen: true, ghost: null };
      if (!text && this.heroSet.has(img)) {
        // behind a building: a pale silhouette, drawn only where something nearer hides the hero
        const gm = billboardMaterial();
        gm.uniforms = { ...gm.uniforms, ...mat.uniforms, uTint: { value: new Vector4(0.91, 0.86, 0.75, 1) }, uAlpha: { value: 0.32 }, uLit: { value: 0 } };
        gm.depthFunc = GreaterDepth;
        gm.depthWrite = false;
        b.ghost = new Mesh(this.quad, gm);
        b.ghost.frustumCulled = false;
        b.ghost.renderOrder = 5;
        this.scene.add(b.ghost);
      }
      this.bills.set(img, b);
    }
    b.seen = true;
    b.mesh.visible = true;
    const u = b.mat.uniforms;
    const frame = img.frame;
    const src = frame.source.image as HTMLCanvasElement;
    const tex = this.canvasTexture(src);
    if (text) {
      const t = img as unknown as Phaser.GameObjects.Text;
      const sig = `${t.text}|${t.style.color}|${src.width}x${src.height}`;
      if (sig !== b.sig) {
        b.sig = sig;
        tex.needsUpdate = true;
      }
    }
    u.map.value = tex;
    // (a Text's source keeps a stale size: the canvas has the real one)
    const sw = src.width || frame.source.width;
    const sh = src.height || frame.source.height;
    u.uUv.value.set(frame.cutX / sw, frame.cutY / sh, (frame.cutX + frame.cutWidth) / sw, (frame.cutY + frame.cutHeight) / sh);
    const dw = Math.abs(img.displayWidth);
    const dh = Math.abs(img.displayHeight);
    u.uSize.value.set(dw, dh);
    u.uOrigin.value.set(img.originX, 1 - img.originY);
    u.uRot.value = img.rotation;
    u.uAlpha.value = img.alpha;
    // a white flash (hit) fills the sprite with its tint
    if (img.isTinted && img.tintFill) {
      const c = img.tintTopLeft;
      u.uTint.value.set(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255, 1);
    } else u.uTint.value.w = 0;
    const crop = (img as unknown as { _crop?: { x: number; y: number; width: number; height: number } })._crop;
    if (img.isCropped && crop) {
      const fw = frame.cutWidth;
      const fh = frame.cutHeight;
      u.uCrop.value.set(crop.x / fw, crop.y / fh, (crop.x + crop.width) / fw, (crop.y + crop.height) / fh);
    } else u.uCrop.value.set(0, 0, 1, 1);
    // facing, however the view is turned: walking, the way it goes across the screen (straight
    // toward or away from the camera keeps the facing it had: the sideways part is then too
    // small to trust, and its sign flickered frame to frame); standing, it keeps its facing
    // until the 2D view turns it (to a target, to someone talking), read from this side
    if (!text) {
      const dt = Math.max(1e-3, this.dt);
      const k = Math.min(1, dt * 20);
      b.vx += ((pin.x - b.lx) / dt - b.vx) * k;
      b.vy += ((pin.y - b.ly) / dt - b.vy) * k;
      b.holdT = Math.max(0, b.holdT - dt);
      const m = Math.hypot(b.vx, b.vy);
      const side = b.vx * this.right.x + b.vy * this.right.z;
      if (m > 8) {
        const want = side > 0;
        if (Math.abs(side) > 0.4 * m && want !== b.faceR && b.holdT <= 0) {
          b.faceR = want;
          b.holdT = 0.25;
        }
      } else if (img.flipX !== b.flip2d && Math.abs(this.r0) > 0.3) b.faceR = (img.flipX ? -1 : 1) * this.r0 > 0;
      b.flip2d = img.flipX;
    }
    b.lx = pin.x;
    b.ly = pin.y;
    u.uFlip.value = text ? 0 : b.faceR ? 0 : 1;
    // stand it on its pin: across by how far off its point it is drawn, up by how far above its rest
    const across = (img.x - pin.sx) * HK;
    const up = (pin.sy + pin.foot - img.y) * ZK;
    const f = this.footShift(pin);
    b.mesh.position.set(pin.x + this.right.x * across + f.x, up, pin.y + this.right.z * across + f.y);
    if (text) {
      // names and marks keep the 2D view's size on screen however far off they are
      if (this.mode === 'pov') {
        const d = this.persp.position.distanceTo(b.mesh.position);
        const k = (2 * d * Math.tan((this.persp.fov * Math.PI) / 360)) / this.view().h;
        u.uK.value.set(k, k);
      } else {
        // upright, so seen from above it is foreshortened: stretch it back
        const k = 1 / (Math.SQRT2 * this.zoom);
        u.uK.value.set(k, k / Math.cos(this.pitch.diorama));
      }
    }
    if (b.ghost) {
      b.mesh.position.add(this.snap);
      b.ghost.position.copy(b.mesh.position);
      b.ghost.visible = this.mode === 'diorama' && img.rotation === 0;
    }
  }

  private dropBill(b: Bill): void {
    this.scene.remove(b.mesh);
    b.mat.dispose();
    if (b.ghost) {
      this.scene.remove(b.ghost);
      (b.ghost.material as ShaderMaterial).dispose();
    }
  }

  /** A shadow: the 2D view's 2:1 ellipse is a circle on the ground. */
  private shadow(img: Phaser.GameObjects.Image, pin: Pin): void {
    let s = this.shadows.get(img);
    if (!s) {
      const src = img.frame.source.image as HTMLCanvasElement;
      const mat = groundMaterial(this.canvasTexture(src), { cut: 0.01 });
      mat.depthWrite = false;
      const mesh = new Mesh(this.flatQuad, mat);
      mesh.renderOrder = 0;
      this.scene.add(mesh);
      s = { mesh, mat, seen: true };
      this.shadows.set(img, s);
    }
    s.seen = true;
    s.mesh.visible = true;
    s.mat.uniforms.uAlpha.value = img.alpha;
    const d = Math.abs(img.displayWidth) * HK;
    s.mesh.scale.set(d, 1, Math.abs(img.displayHeight) * 2 * HK);
    // the ellipse lies along the 2D view's screen axes (its width along world x - y)
    s.mesh.rotation.y = Math.PI / 4;
    const f = this.footShift(pin);
    s.mesh.position.set(pin.x + f.x, 0.2, pin.y + f.y);
    if (this.heroSet.has(img)) s.mesh.position.add(this.snap);
  }

  /**
   * The 2D view draws a sprite `foot` px below its point, so its feet land a little in front of
   * where it stands: stand it that much nearer the camera, on the ground (at the 2D angle,
   * exactly the same place on screen).
   */
  private footShift(pin: Pin): { x: number; y: number } {
    const d = pin.foot * Math.SQRT2;
    return { x: Math.cos(this.yaw) * d, y: Math.sin(this.yaw) * d };
  }

  private dropShadow(s: Shadow): void {
    this.scene.remove(s.mesh);
    s.mat.dispose();
  }

  // ---------- effects ----------
  private drawEffects(): void {
    const g = this.fx;
    g.centre(this.sim.x, this.sim.y);
    g.clear();
    const o = this.ensureOverlay();
    o?.clear();
    this.effects.draw3d(g, o ?? g, (x, y, h) => this.toScreen(x, y, h));
    // upload only while something is (or was just) drawn
    if (g.dirty || this.fxShown) this.fxTex.needsUpdate = true;
    this.fxShown = g.dirty;
    this.fxMesh.position.set(g.x0 + g.size / 2, 0.4, g.y0 + g.size / 2);
    if (o) this.drawBars(o);
  }

  private ensureOverlay(): Phaser.GameObjects.Graphics | null {
    if (this.overlay?.active) return this.overlay;
    const hud = this.phaser.scene.get(SceneKeys.PcHud);
    if (!hud || !hud.sys.isActive()) return null;
    this.overlay = hud.add.graphics().setDepth(1);
    return this.overlay;
  }

  /** Health and cast bars over creatures and other players, the target's brackets, the hero's work bar. */
  private drawBars(g: Phaser.GameObjects.Graphics): void {
    const s = this.sim;
    for (const e of s.enemies) {
      if (!e.alive || e.riseT > 0) continue;
      const key = e.def.tex;
      const fr = this.phaser.textures.getFrame(key);
      const h = (fr?.height ?? 24) * artScale(key);
      const w0 = (fr?.width ?? 24) * artScale(key);
      const top = this.toScreen(e.x, e.y, h - 6);
      const foot = this.toScreen(e.x, e.y, -6);
      if (top.k <= 0) continue;
      const k = top.k;
      const w = w0 * k;
      const x = top.x - w / 2;
      const y = top.y;
      g.fillStyle(hex('#0a0d14')).fillRect(x - 1, y - 10, w + 2, 5);
      g.fillStyle(hex('#e0504b')).fillRect(x, y - 9, Math.round((w * e.hp) / e.hpMax), 3);
      if (e.castT > 0) {
        g.fillStyle(hex('#0a0d14')).fillRect(x - 1, y - 16, w + 2, 5);
        g.fillStyle(hex('#a78bfa')).fillRect(x, y - 15, Math.round(w * (1 - e.castT / e.castTotal)), 3);
      }
      if (e.aggro && !e.tele && e.castT <= 0 && e.stunT <= 0) g.fillStyle(hex('#e0504b')).fillRect(top.x - 2, y - 15, 4, 4);
      if (s.target === e) {
        const p = Math.sin(this.phaser.time.now / 180) * 2;
        const m = 5 + p;
        const bx = x - 4 - p;
        const by = y - 4 - p;
        const bw = w + 8 + 2 * p;
        const bh = foot.y - y + 8 + 2 * p;
        for (const [col, lw] of [[0x000000, 4], [hex('#f2c14e'), 2]] as const) {
          g.lineStyle(lw, col, 1);
          g.strokePoints([{ x: bx, y: by + m }, { x: bx, y: by }, { x: bx + m, y: by }]);
          g.strokePoints([{ x: bx + bw - m, y: by }, { x: bx + bw, y: by }, { x: bx + bw, y: by + m }]);
          g.strokePoints([{ x: bx + bw, y: by + bh - m }, { x: bx + bw, y: by + bh }, { x: bx + bw - m, y: by + bh }]);
          g.strokePoints([{ x: bx + m, y: by + bh }, { x: bx, y: by + bh }, { x: bx, y: by + bh - m }]);
        }
        g.fillStyle(hex('#f2c14e')).fillTriangle(top.x - 5, by - 12, top.x + 5, by - 12, top.x, by - 5);
      }
    }
    for (const o of s.others) {
      const top = this.toScreen(o.x, o.y, 44);
      if (top.k <= 0) continue;
      const w = 22;
      g.fillStyle(hex('#0a0d14')).fillRect(Math.round(top.x - w / 2) - 1, top.y - 1, w + 2, 4);
      g.fillStyle(hex('#5fc46a')).fillRect(Math.round(top.x - w / 2), top.y, Math.round((w * Math.max(0, o.hp)) / Math.max(1, o.hpMax)), 2);
    }
    const work = s.mountT > 0 ? { p: 1 - s.mountT, col: '#a78bfa' } : s.work ? { p: s.work.p, col: s.work.kind === 'chop' ? '#c8a070' : s.work.kind === 'mine' ? '#c4cad4' : '#ffa040' } : null;
    if (work && !(this.mode === 'pov' && this.dist < 6)) {
      const top = this.toScreen(s.x, s.y, 50);
      g.fillStyle(hex('#0a0d14')).fillRect(top.x - 16, top.y - 6, 32, 6);
      g.fillStyle(hex(work.col)).fillRect(top.x - 15, top.y - 5, Math.round(30 * Math.min(1, Math.max(0, work.p))), 4);
    }
  }

  // ---------- interior walls ----------
  /** A wall between the camera and a room is cut low, so you can see in (as the 2D view does for its one angle). */
  private cutWalls(): void {
    if (!this.walls.length) return;
    const ox = Math.cos(this.yaw);
    const oy = Math.sin(this.yaw);
    const sx = Math.abs(ox) < 0.38 ? 0 : -Math.sign(ox);
    const sy = Math.abs(oy) < 0.38 ? 0 : -Math.sign(oy);
    const key = `${sx},${sy}`;
    if (key === this.wallKey) return;
    this.wallKey = key;
    const map = this.sim.map;
    const open = (c: number, r: number) => {
      const t = map.tile(c, r);
      return t !== undefined && t !== Tile.Wall && t !== Tile.Void && t !== Tile.Tower;
    };
    for (const w of this.walls) {
      let front = false;
      for (let dr = 0; dr <= 2 && !front; dr++)
        for (let dc = 0; dc <= 2; dc++) {
          if (!dr && !dc) continue;
          if ((dc && !sx) || (dr && !sy)) continue;
          if (open(w.c + dc * sx, w.r + dr * sy)) front = true;
        }
      const back = open(w.c - sx, w.r - sy) || open(w.c - sx, w.r) || open(w.c, w.r - sy);
      const low = !(back && !front) && !!w.lo;
      w.hi.visible = !low;
      if (w.lo) w.lo.visible = low;
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.phaser.game.canvas.removeEventListener('wheel', this.onWheel);
    this.clearRegion();
    for (const b of this.bills.values()) this.dropBill(b);
    for (const s of this.shadows.values()) this.dropShadow(s);
    this.bills.clear();
    this.shadows.clear();
    for (const g of this.geoms.values()) g.dispose();
    for (const t of this.textures.values()) t.tex.dispose();
    this.overlay?.destroy();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
