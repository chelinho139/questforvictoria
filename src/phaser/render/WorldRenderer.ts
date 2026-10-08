import { FLAT_OBJECTS, GLINTING_OBJECTS } from '../../data/regions/types';
import { KILN_OUT } from './structureArt';
import Phaser from 'phaser';
import type { Sim } from '../../sim/Sim';
import { RISE_DUR } from '../../sim/Sim';
import type { Enemy, Drop, Structure, NpcState, ObjectState, WandererState, Work } from '../../sim/types';
import type { Hero } from '../../sim/Hero';
import type { Companion } from '../../sim/Companion';
import { NPCS } from '../../data/npcs';
import { Tile, T, isoX, isoY } from '../../sim/map';
import { Fonts, hex, PIXEL_SCALE } from '../config';
import { Tex, WALL_H, TOWER_TOP, heroLookTexture, companionTexture, heroLookRider } from './textures';
import type { BuiltWorld } from './textures';
import type { RiderFit } from './styleArt';
import { artScale, artFrames, artAnim, frameKey, animKey, riderFit } from './art';
import { PROPS } from '../../data/props';
import { PROP_ART } from './propArt';
import { darknessLevel } from '../../sim/daylight';
import { keepAsIs } from '../../i18n/dom';

const OVERLAY_DEPTH = 1e5;

/** The progress bar over the hero, by what they are doing: wood, stone, the forge's glow. */
const WORK_COL: Record<Work['kind'], string> = { chop: '#c8a070', mine: '#c4cad4', make: '#ffa040', revive: '#f2e08a' };

/** A building's ground box (world px), its depth, and the screen box its art covers. */
interface PropBox {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  depth: number;
  sl: number;
  sr: number;
  st: number;
  sb: number;
}

/**
 * Where a sprite stands: the world point under it, the screen point that was drawn from
 * (sx, sy) and how far below that point its bottom rests (`foot`, screen px). The 3D views
 * stand the same sprite up on that point, lifted by however far it is drawn above its rest.
 */
export interface Pin {
  x: number;
  y: number;
  sx: number;
  sy: number;
  foot: number;
}

interface EnemyView {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  mark: Phaser.GameObjects.Text;
}

/** Places the static world and keeps enemy/player sprites in sync with the simulation. */
export class WorldRenderer {
  private readonly enemyViews = new Map<Enemy, EnemyView>();
  private readonly water: Phaser.GameObjects.Image[] = [];
  private readonly overlay: Phaser.GameObjects.Graphics;
  private readonly knight: Phaser.GameObjects.Image;
  private readonly horse: Phaser.GameObjects.Image;
  private readonly rider: Phaser.GameObjects.Image;
  private readonly playerShadow: Phaser.GameObjects.Image;
  private readonly buffMark: Phaser.GameObjects.Text;
  /** Tree sprites by tile ("c,r"): which texture they show now, so felling swaps in the stump. */
  private readonly treeViews = new Map<string, { img: Phaser.GameObjects.Image; key: string; stump: string; x: number; shown: string }>();
  /** Rocks by "c,r": the boulder becomes rubble while mined out. */
  private readonly rockViews = new Map<string, { img: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image; x: number; shown: string }>();
  private readonly dropViews = new Map<Drop, { img: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image }>();
  private readonly structureViews = new Map<Structure, { img: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image }>();
  private readonly objectViews = new Map<ObjectState, Phaser.GameObjects.Image>();
  private readonly wandererViews = new Map<WandererState, Phaser.GameObjects.Image>();
  /** The other players' heroes (online). */
  private readonly otherViews = new Map<
    Hero,
    {
      img: Phaser.GameObjects.Image;
      shadow: Phaser.GameObjects.Image;
      name: Phaser.GameObjects.Text;
      /** On horseback: the horse, and the hero cropped at the waist. */
      horse: Phaser.GameObjects.Image;
      rider: Phaser.GameObjects.Image;
      walkSeen: number;
      walkingT: number;
    }
  >();
  /** Companions walking with the heroes (Wren). */
  private readonly companionViews = new Map<
    Companion,
    { img: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image; name: Phaser.GameObjects.Text; mark: Phaser.GameObjects.Text; walkSeen: number; walkingT: number }
  >();
  private lastNow = 0;
  /** Crows perched about the region (RegionDef.crows): `t` seconds into flying off, or -1 perched. */
  private readonly crows: { wx: number; wy: number; up: number; img: Phaser.GameObjects.Image; t: number; dir: number }[] = [];
  private readonly npcViews = new Map<NpcState, { img: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image; name: Phaser.GameObjects.Text; mark: Phaser.GameObjects.Text }>();
  /** Static world sprites whose texture changes with the art style. */
  private readonly statics: { img: Phaser.GameObjects.Image; key: string; scaled: boolean }[] = [];
  /** Everything this renderer draws lives in one layer (depth-sorted inside it). */
  readonly layer: Phaser.GameObjects.Layer;
  /** The sprites that stand somewhere (people, creatures, trees, items, their shadows and names). */
  readonly pins = new Map<Phaser.GameObjects.GameObject, Pin>();
  /** Buildings, for sorting what stands in front of them (see depthAt). */
  private readonly propBoxes: PropBox[] = [];
  /** Each prop's images and box, by 'kind,c,r', so one that leaves with the story can go. */
  private readonly propViews = new Map<string, { imgs: Phaser.GameObjects.Image[]; box: PropBox }>();
  private propCount = 0;
  /** Lit windows: faded in as night falls. */
  private readonly litViews: Phaser.GameObjects.Image[] = [];
  /** Animations over buildings (the mill wheel). */
  private readonly animViews: { img: Phaser.GameObjects.Image; key: string; n: number; ms: number }[] = [];
  /** The hero's silhouette, shown through a building that hides them. */
  private readonly ghost: Phaser.GameObjects.Image;

  constructor(private readonly scene: Phaser.Scene, private readonly sim: Sim, world: BuiltWorld) {
    this.layer = scene.add.layer();
    const keep = (img: Phaser.GameObjects.Image, key: string, scaled = false) => {
      this.statics.push({ img, key, scaled });
      return img;
    };
    for (const g of world.ground) keep(this.image(g.x, g.y, g.key).setOrigin(0).setDepth(-1e6), g.key);
    for (const [wx, wy] of world.water) {
      const w = keep(this.image(isoX(wx, wy) - 32, isoY(wx, wy) - 16, Tex.water1).setOrigin(0).setDepth(-1e6 + 1).setVisible(false), Tex.water1);
      // from ring 2 the rivers run dark
      if (sim.regionDef.ring >= 2) w.setTint(0x5a6270);
      this.water.push(w);
    }
    // buildings first: trees and rocks beside them sort against their boxes
    for (const p of sim.props) {
      const def = PROPS[p.kind];
      const key = Tex.prop(p.kind);
      if (!scene.textures.exists(key)) continue;
      const left = isoX(p.c * T, (p.r + def.h) * T) - 1;
      const bottom = isoY((p.c + def.w) * T, (p.r + def.h) * T) + 1;
      // a tree sorts by its trunk tile; a building by its whole footprint
      const [cc, cr, cw, ch] = def.core ? [p.c + def.core[0], p.r + def.core[1], 1, 1] : [p.c, p.r, def.w, def.h];
      const x0 = cc * T;
      const y0 = cr * T;
      const x1 = (cc + cw) * T;
      const y1 = (cr + ch) * T;
      const depth = def.core ? x0 + y0 + T : x1 + y1;
      const img = this.image(left, bottom, key).setOrigin(0, 1).setDepth(depth);
      const box = { x0, x1, y0, y1, depth, sl: left, sr: left + img.width, st: bottom - img.height, sb: bottom };
      this.propBoxes.push(box);
      const imgs = [img];
      if (scene.textures.exists(Tex.propLit(p.kind))) {
        const lit = this.image(left, bottom, Tex.propLit(p.kind)).setOrigin(0, 1).setDepth(depth + 0.01).setAlpha(0);
        this.litViews.push(lit);
        imgs.push(lit);
      }
      if (def.anim) {
        const key = Tex.prop(def.anim.art);
        const n = PROP_ART[def.anim.art]?.frames?.length ?? 0;
        if (n) {
          const a = this.image(left, bottom, key + ':0').setOrigin(0, 1).setDepth(depth + 0.02);
          this.animViews.push({ img: a, key, n, ms: def.anim.ms });
          imgs.push(a);
        }
      }
      this.propViews.set(`${p.kind},${p.c},${p.r}`, { imgs, box });
    }
    this.propCount = sim.props.length;
    const kinds = new Map(sim.trees.filter(t => t.kind).map(t => [`${t.c},${t.r}`, t.kind!]));
    for (const o of world.objects) {
      const px = isoX(o.wx, o.wy);
      const py = isoY(o.wx, o.wy);
      const d = this.depthAt(o.wx, o.wy);
      if (o.kind === Tile.Tree) {
        // a tree of the Weepwood's kinds draws as itself; of the oaks, about one in three is a
        // pine, picked by tile so it never changes
        const tc = Math.floor(o.wx / T);
        const tr = Math.floor(o.wy / T);
        const kind = kinds.get(`${tc},${tr}`);
        const own = kind && scene.textures.exists(Tex.treeKind(kind));
        const key = own ? Tex.treeKind(kind) : (tc * 7 + tr * 13) % 3 === 0 ? Tex.pine : Tex.tree;
        const stump = own && scene.textures.exists(Tex.stumpKind(kind)) ? Tex.stumpKind(kind) : Tex.stump;
        const img = this.pin(keep(this.image(px, py + 6, key).setOrigin(0.5, 1).setScale(artScale(key)).setDepth(d), key, true), o.wx, o.wy, 6);
        this.treeViews.set(`${tc},${tr}`, { img, key, stump, x: px, shown: key });
      } else if (o.kind === Tile.Rock) {
        const shadow = this.pin(this.image(px, py + 4, Tex.shadow).setDisplaySize(32, 16).setAlpha(0.3).setDepth(d - 0.5), o.wx, o.wy, 4);
        const img = this.pin(keep(this.image(px, py + 7, Tex.rock).setOrigin(0.5, 1).setScale(artScale(Tex.rock)).setDepth(d), Tex.rock, true), o.wx, o.wy, 7);
        this.rockViews.set(`${Math.floor(o.wx / T)},${Math.floor(o.wy / T)}`, { img, shadow, x: px, shown: Tex.rock });
      } else if (o.kind === Tile.Wall && scene.textures.exists(Tex.prop('wallblock'))) {
        // interior walls: full height behind the room, cut low in front of it so you can see in
        const c = Math.floor(o.wx / T);
        const r = Math.floor(o.wy / T);
        const open = (cc: number, rr: number) => {
          const t = sim.map.tile(cc, rr);
          return t !== undefined && t !== Tile.Wall && t !== Tile.Void && t !== Tile.Tower;
        };
        // a back wall faces a room (floor to its south or east) and has no room close in front of
        // it (north or west, within two tiles); every other wall is cut low so you can see in
        const back = open(c, r + 1) || open(c + 1, r) || open(c + 1, r + 1);
        let front = false;
        for (let dr = 0; dr <= 2 && !front; dr++) for (let dc = 0; dc <= 2; dc++) if ((dr || dc) && open(c - dc, r - dr)) front = true;
        const key = Tex.prop(back && !front ? 'wallblock' : 'wallblock_lo');
        this.image(isoX(c * T, (r + 1) * T) - 1, isoY((c + 1) * T, (r + 1) * T) + 1, key).setOrigin(0, 1).setDepth(d);
      } else if (o.kind === Tile.Wall) keep(this.image(px - 32, py - WALL_H - 16, Tex.wall).setOrigin(0).setDepth(d), Tex.wall);
      else if (o.kind === Tile.Tower) keep(this.image(px - 32, py - TOWER_TOP, Tex.tower).setOrigin(0).setDepth(d), Tex.tower);
    }
    this.overlay = this.gfx().setDepth(OVERLAY_DEPTH);
    this.playerShadow = this.image(0, 0, Tex.shadow).setAlpha(0.3);
    this.knight = this.image(0, 0, Tex.knight).setOrigin(0.5, 1).setScale(artScale(Tex.knight));
    this.horse = this.image(0, 0, Tex.horse).setOrigin(0.5, 1).setScale(artScale(Tex.horse)).setVisible(false);
    // the rider is the knight sprite cropped at the waist
    this.rider = this.image(0, 0, Tex.knight).setOrigin(0.5, 1).setScale(artScale(Tex.knight)).setVisible(false);
    this.rider.setCrop(0, 0, this.rider.frame.width, riderFit().rows);
    this.buffMark = this.mark('9px', '#f2c14e').setText('▲');
    this.ghost = this.image(0, 0, Tex.knight).setOrigin(0.5, 1).setTintFill(0xe8dcc0).setAlpha(0.32).setDepth(OVERLAY_DEPTH - 1).setVisible(false);
  }

  /** True when something at world (x, y) stands behind a building that covers it on screen. */
  private hiddenByProp(x: number, y: number): boolean {
    const sx = isoX(x, y);
    const sy = isoY(x, y);
    for (const b of this.propBoxes) {
      if (sx < b.sl + 6 || sx > b.sr - 6 || sy - 20 < b.st || sy > b.sb) continue;
      if (x < b.x0 || y < b.y0) return true;
    }
    return false;
  }

  /**
   * After the art style changes (textures redrawn in place under the same keys): pick up
   * the new texture sizes, scales and the rider crop. Moving sprites refresh every frame.
   */
  refreshStyle(): void {
    for (const s of this.statics) {
      s.img.setTexture(s.key);
      if (s.scaled) s.img.setScale(artScale(s.key));
    }
    this.horse.setTexture(Tex.horse).setScale(artScale(Tex.horse));
    this.rider.setTexture(Tex.knight).setScale(artScale(Tex.knight));
    this.rider.setCrop(0, 0, this.rider.frame.width, riderFit().rows);
    // stumps and rubble re-apply on the next draw
    for (const v of this.treeViews.values()) v.shown = '';
    for (const v of this.rockViews.values()) v.shown = '';
  }

  /** The hero's own sprites (a first-person view hides them). */
  heroParts(): Phaser.GameObjects.GameObject[] {
    return [this.knight, this.horse, this.rider, this.playerShadow, this.buffMark];
  }

  /** Record where a sprite stands (see Pin); `sx`/`sy` default to the point's projection. */
  private pin<O extends Phaser.GameObjects.GameObject>(o: O, x: number, y: number, foot: number, sx = isoX(x, y), sy = isoY(x, y)): O {
    const p = this.pins.get(o);
    if (p) {
      p.x = x;
      p.y = y;
      p.sx = sx;
      p.sy = sy;
      p.foot = foot;
    } else this.pins.set(o, { x, y, sx, sy, foot });
    return o;
  }

  private image(x: number, y: number, key: string): Phaser.GameObjects.Image {
    const o = this.scene.add.image(x, y, key);
    this.layer.add(o);
    return o;
  }

  private gfx(): Phaser.GameObjects.Graphics {
    const o = this.scene.add.graphics();
    this.layer.add(o);
    return o;
  }

  private text(x: number, y: number, t: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
    const o = this.scene.add.text(x, y, t, style);
    this.layer.add(o);
    return o;
  }

  /** Remove everything this renderer drew (leaving a region). */
  destroy(): void {
    this.layer.destroy();
    this.pins.clear();
    this.enemyViews.clear();
    this.treeViews.clear();
    this.rockViews.clear();
    this.dropViews.clear();
    this.structureViews.clear();
    this.npcViews.clear();
    this.objectViews.clear();
    this.wandererViews.clear();
    this.otherViews.clear();
    this.companionViews.clear();
  }

  /** Every name, quest mark and telegraph made (so a clean shot can hide them all). */
  private readonly marks = new Set<Phaser.GameObjects.Text>();

  private mark(size: string, color: string): Phaser.GameObjects.Text {
    const m = this.text(0, 0, '', { fontFamily: Fonts.display, fontSize: size, color })
      .setResolution(PIXEL_SCALE)
      .setShadow(1, 1, '#000', 0, false, true)
      .setDepth(OVERLAY_DEPTH + 1)
      .setVisible(false);
    this.marks.add(m);
    m.once(Phaser.GameObjects.Events.DESTROY, () => this.marks.delete(m));
    return m;
  }

  /**
   * Depth for something standing at world (x, y): x + y, except that in front of a building
   * (past its south-east or south-west wall, and overlapping its art) it must draw over it.
   */
  depthAt(x: number, y: number, base = x + y): number {
    if (!this.propBoxes.length) return base;
    const sx = isoX(x, y);
    const sy = isoY(x, y);
    for (const b of this.propBoxes) {
      if (sx < b.sl - 16 || sx > b.sr + 16 || sy < b.st || sy > b.sb + 40) continue;
      if ((x >= b.x1 || y >= b.y1) && base <= b.depth) base = b.depth + 1 + (base - b.depth) * 0.001;
    }
    return base;
  }

  /** A prop left with the story (the fallen willow sawn through): its images and box go too. */
  private dropGoneProps(): void {
    if (this.sim.props.length === this.propCount) return;
    this.propCount = this.sim.props.length;
    const here = new Set(this.sim.props.map(p => `${p.kind},${p.c},${p.r}`));
    for (const [k, v] of this.propViews) {
      if (here.has(k)) continue;
      for (const img of v.imgs) img.setVisible(false).setAlpha(0);
      this.litViews.splice(0, this.litViews.length, ...this.litViews.filter(x => !v.imgs.includes(x)));
      this.animViews.splice(0, this.animViews.length, ...this.animViews.filter(x => !v.imgs.includes(x.img)));
      this.propBoxes.splice(this.propBoxes.indexOf(v.box), 1);
      this.propViews.delete(k);
    }
  }

  /** Names, bars, marks and brackets over heads (off for a clean trailer shot: dev/Director.ts). */
  static showUi = true;
  /** The hero the camera belongs to (off when a trailer shot is about other people: dev/Director.ts). */
  static showPlayer = true;

  draw(now: number): void {
    this.drawWorld(now);
    if (WorldRenderer.showUi) return;
    this.overlay.clear();
    for (const m of this.marks) m.setVisible(false);
  }

  private drawWorld(now: number): void {
    this.dropGoneProps();
    const wf = Math.floor(now / 450) % 2 === 1;
    if (this.litViews.length) {
      const k = Math.max(0, Math.min(1, (darknessLevel(this.sim.day.t) - 0.25) / 0.4));
      const lit = this.sim.regionDef.ring >= 4 || this.sim.regionDef.dusk ? 1 : k;
      for (const v of this.litViews) v.setAlpha(lit);
    }
    for (const a of this.animViews) a.img.setTexture(a.key + ':' + (Math.floor(now / a.ms) % a.n));
    for (const w of this.water) w.setVisible(wf);
    const g = this.overlay;
    g.clear();
    for (const e of this.sim.enemies) this.drawEnemy(e, now, g);
    this.dropStaleViews();
    this.drawTrees();
    this.drawRocks();
    this.drawStructures(now);
    this.drawObjects(now);
    this.drawNpcs(now);
    const dt = this.lastNow ? Math.min(0.1, (now - this.lastNow) / 1000) : 0;
    this.lastNow = now;
    this.drawCrows(now, dt);
    this.drawOthers(now, dt, g);
    this.drawCompanions(now, dt, g);
    this.drawWanderers(now);
    this.drawDrops(now);
    this.drawPlayer(now, g);
  }

  /**
   * Crows, since the bells: perched on the trees, turning their heads now and then; when a hero
   * comes near one lifts off and flies away north, and is gone until you come back.
   */
  private drawCrows(now: number, dt: number): void {
    if (!this.crows.length && !this.crowsMade) {
      this.crowsMade = true;
      if (!this.scene.textures.exists(frameKey('crow', 0))) return;
      for (const [c, r] of this.sim.regionDef.crows ?? []) {
        const wx = c * T + T / 2;
        const wy = r * T + T / 2;
        // up in a tree, or on the ground
        const up = this.sim.map.tile(c, r) === Tile.Tree ? 34 : 0;
        const img = this.image(isoX(wx, wy), isoY(wx, wy) + 6 - up, frameKey('crow', 0)).setOrigin(0.5, 1);
        img.setDepth(this.depthAt(wx, wy) + (up ? 1 : 0));
        this.crows.push({ wx, wy, up, img, t: -1, dir: c % 2 ? 1 : -1 });
      }
    }
    const h = this.sim.hero;
    this.crows.forEach((cr, i) => {
      if (cr.t < 0) {
        // perched: now and then it turns its head
        cr.img.setTexture(frameKey('crow', Math.floor(now / 1700 + i * 0.37) % 3 === 0 ? 1 : 0)).setFlipX(cr.dir < 0);
        if (Math.hypot(h.x - cr.wx, h.y - cr.wy) < 150) cr.t = 0;
        return;
      }
      if (cr.t > 2.4) return;
      cr.t += dt;
      // off it goes, flapping, up and away
      const x = isoX(cr.wx, cr.wy) + cr.dir * 46 * cr.t;
      const y = isoY(cr.wx, cr.wy) + 6 - cr.up - 70 * cr.t - 18 * cr.t * cr.t;
      cr.img
        .setTexture(frameKey('crow', 2 + (Math.floor(now / 90) % 2)))
        .setPosition(Math.round(x), Math.round(y))
        .setDepth(OVERLAY_DEPTH - 1)
        .setAlpha(Math.max(0, Math.min(1, (2.4 - cr.t) / 0.8)));
      if (cr.t > 2.4) cr.img.setVisible(false);
    });
  }

  private crowsMade = false;

  /** The other players' heroes: their look and gear, walking, swinging, jumping; a name and a health bar. */
  private drawOthers(now: number, dt: number, g: Phaser.GameObjects.Graphics): void {
    const others = this.sim.others;
    for (const [o, v] of this.otherViews) {
      if (others.includes(o)) continue;
      for (const x of [v.img, v.shadow, v.name, v.horse, v.rider]) {
        this.pins.delete(x);
        x.destroy();
      }
      this.otherViews.delete(o);
    }
    for (const o of others) {
      const key = heroLookTexture(this.scene, o.look, o.equip);
      let v = this.otherViews.get(o);
      if (!v) {
        v = {
          img: this.image(0, 0, key).setOrigin(0.5, 1),
          shadow: this.image(0, 0, Tex.shadow).setAlpha(0.3),
          name: this.mark('8px', '#bfe0ff').setOrigin(0.5, 1),
          horse: this.image(0, 0, Tex.horse).setOrigin(0.5, 1).setVisible(false),
          rider: this.image(0, 0, key).setOrigin(0.5, 1).setVisible(false),
          walkSeen: o.walk,
          walkingT: 0,
        };
        this.otherViews.set(o, v);
      }
      // walking while its walk counter keeps moving
      if (o.walk !== v.walkSeen) {
        v.walkSeen = o.walk;
        v.walkingT = 0.2;
      } else v.walkingT = Math.max(0, v.walkingT - dt);
      const n = (group: string) => artAnim(key, group);
      const jp = o.jumpT >= 0 ? Math.min(1, o.jumpT / 0.38) : -1;
      let fk: string;
      if (jp >= 0 && n('jump')) fk = animKey(key, 'jump', jp < 0.35 ? 0 : Math.min(n('jump') - 1, jp < 0.7 ? 1 : n('jump') - 1));
      else if (o.atkAnimT > 0 && n(hitAnim(o))) {
        const g = hitAnim(o);
        fk = animKey(key, g, Math.min(n(g) - 1, Math.floor((1 - o.atkAnimT / 0.36) * n(g))));
      }
      else if (v.walkingT > 0 && artFrames(key) > 1) fk = frameKey(key, Math.floor(now / 95) % artFrames(key));
      else if (n('idle')) fk = animKey(key, 'idle', Math.floor(now / 380) % n('idle'));
      else fk = frameKey(key, 0);
      const qx = isoX(o.x, o.y);
      const qy = isoY(o.x, o.y);
      const z = jp >= 0 ? 16 * 4 * jp * (1 - jp) : 0;
      const depth = this.depthAt(o.x, o.y);
      this.pin(v.img, o.x, o.y, 8);
      this.pin(v.shadow, o.x, o.y, 5);
      this.pin(v.name, o.x, o.y, 8);
      this.pin(v.horse, o.x, o.y, 4);
      this.pin(v.rider, o.x, o.y, 4);
      if (o.mounted && !o.dead) {
        const walking = v.walkingT > 0;
        const lift = this.trot(walking, now) + z;
        const rc = heroLookRider(o.look);
        v.img.setVisible(false);
        v.horse.setScale(artScale(Tex.horse));
        v.rider.setTexture(key).setCrop(0, 0, v.rider.frame.width, rc.rows);
        const top = this.ride(v.horse, v.rider, rc, 1, qx, qy - lift, o.face, walking, now, o.hiddenT > 0 ? 0.45 : 1, depth);
        v.shadow.setPosition(qx, qy + 5).setDisplaySize(40, 20).setDepth(depth - 0.5);
        this.nameAndHealth(o, v.name, g, qx, top);
        continue;
      }
      v.horse.setVisible(false);
      v.rider.setVisible(false);
      v.img
        .setVisible(true)
        .setTexture(fk)
        .setPosition(Math.round(qx), Math.round(qy + 8 - z))
        .setFlipX(o.face < 0)
        .setDepth(depth)
        .setAlpha(o.dead ? 0.35 : o.hiddenT > 0 ? 0.45 : 1)
        .setRotation(o.dead ? 1.3 : 0);
      if (o.flash > 0) v.img.setTintFill(0xffffff);
      else v.img.clearTint();
      v.shadow.setPosition(qx, qy + 5).setDisplaySize(26, 13).setDepth(depth - 0.5);
      this.nameAndHealth(o, v.name, g, qx, qy + 8 - z - v.img.frame.height);
    }
  }

  /**
   * Companions: drawn like a hero in their look and gear, walking, shooting, idling; down on
   * one knee when badly hurt; their name and a health bar over their head.
   */
  private drawCompanions(now: number, dt: number, g: Phaser.GameObjects.Graphics): void {
    const here = this.sim.companions;
    for (const [c, v] of this.companionViews) {
      if (here.includes(c)) continue;
      for (const x of [v.img, v.shadow, v.name, v.mark]) {
        this.pins.delete(x);
        x.destroy();
      }
      this.companionViews.delete(c);
    }
    for (const c of here) {
      const key = c.def.art ? companionTexture(this.scene, c.def.art) : heroLookTexture(this.scene, c.def.look, c.def.equip);
      let v = this.companionViews.get(c);
      if (!v) {
        v = {
          img: this.image(0, 0, key).setOrigin(0.5, 1),
          shadow: this.image(0, 0, Tex.shadow).setAlpha(0.3),
          name: this.mark('8px', '#c8f0b8').setOrigin(0.5, 1),
          mark: this.mark('24px', '#f2c14e').setOrigin(0.5, 1),
          walkSeen: c.walk,
          walkingT: 0,
        };
        this.companionViews.set(c, v);
      }
      if (c.walk !== v.walkSeen) {
        v.walkSeen = c.walk;
        v.walkingT = 0.2;
      } else v.walkingT = Math.max(0, v.walkingT - dt);
      const n = (group: string) => artAnim(key, group);
      let fk: string;
      // down on one knee: her own kneeling frame, or else a hero's squashed lower
      const kneel = c.dead > 0 && n('kneel') > 0;
      if (kneel) fk = animKey(key, 'kneel', 0);
      else if (c.atkAnimT > 0 && n('shoot')) fk = animKey(key, 'shoot', Math.min(n('shoot') - 1, Math.floor((1 - c.atkAnimT / 0.36) * n('shoot'))));
      else if (v.walkingT > 0 && artFrames(key) > 1) fk = frameKey(key, Math.floor(now / 95) % artFrames(key));
      else if (n('idle')) fk = animKey(key, 'idle', Math.floor(now / 380) % n('idle'));
      else fk = frameKey(key, 0);
      const qx = isoX(c.x, c.y);
      const qy = isoY(c.x, c.y);
      const depth = this.depthAt(c.x, c.y);
      for (const o of [v.img, v.shadow, v.name, v.mark]) this.pin(o, c.x, c.y, 8);
      const down = c.dead > 0 && !kneel;
      v.img
        .setTexture(fk)
        .setScale(1, down ? 0.78 : 1)
        .setPosition(Math.round(qx), Math.round(qy + 8))
        .setFlipX(c.face < 0)
        .setDepth(depth)
        .setAlpha(c.dead > 0 ? 0.85 : 1);
      if (c.flash > 0) v.img.setTintFill(0xffffff);
      else v.img.clearTint();
      v.shadow.setPosition(qx, qy + 5).setDisplaySize(26, 13).setDepth(depth - 0.5);
      const top = qy + 8 - v.img.frame.height * (down ? 0.78 : 1);
      v.name.setText(c.name).setPosition(Math.round(qx), Math.round(top - 6)).setVisible(true);
      // her quests show over her head like anyone's (! new, ? to hand in)
      const m = c.def.npc ? this.sim.npcMark(c.def.npc) : null;
      v.mark
        .setText(m ?? '')
        .setColor(m === '…' ? '#c8c0a8' : '#f2c14e')
        .setPosition(Math.round(qx), Math.round(top - 15 + Math.sin(now / 260) * 1.5))
        .setVisible(!!m);
      const w = 22;
      const x0 = Math.round(qx - w / 2);
      const y0 = Math.round(top - 4);
      g.fillStyle(hex('#0a0d14')).fillRect(x0 - 1, y0 - 1, w + 2, 4);
      const knee = c.dead > 0;
      g.fillStyle(hex(knee ? '#c8a05a' : '#5fc46a')).fillRect(x0, y0, Math.round(knee ? w * (1 - c.dead / c.def.down) : (w * Math.max(0, c.hp)) / Math.max(1, c.hpMax)), 2);
    }
  }

  /**
   * Another player's name and level over their head (at screen y `top`), with a small health bar
   * under it: red for the one you are about to fight, or fighting, in a duel.
   */
  private nameAndHealth(o: Hero, name: Phaser.GameObjects.Text, g: Phaser.GameObjects.Graphics, qx: number, top: number): void {
    const d = this.sim.duel;
    const foe = !!d && d.st !== 'ask' && d.id === o.id;
    const col = foe ? '#ff8a80' : '#bfe0ff';
    if (name.style.color !== col) name.setColor(col);
    keepAsIs(name).setText(`${o.name} · ${o.level}`).setPosition(Math.round(qx), Math.round(top - 6)).setVisible(true);
    const w = 22;
    const x0 = Math.round(qx - w / 2);
    const y0 = Math.round(top - 4);
    g.fillStyle(hex('#0a0d14')).fillRect(x0 - 1, y0 - 1, w + 2, 4);
    g.fillStyle(hex(foe ? '#e0504b' : '#5fc46a')).fillRect(x0, y0, Math.round((w * Math.max(0, o.hp)) / Math.max(1, o.hpMax)), 2);
  }

  /** The grey postman: walking his round, fading as you come near. */
  private drawWanderers(now: number): void {
    for (const w of this.sim.wanderers) {
      const key = Tex.wanderer(w.id);
      let v = this.wandererViews.get(w);
      if (!v) {
        v = this.image(0, 0, key).setOrigin(0.5, 1);
        this.wandererViews.set(w, v);
      }
      const frames = artFrames(key);
      const qx = isoX(w.x, w.y);
      const qy = isoY(w.x, w.y);
      // he glides: a slow bob instead of steps
      const bob = Math.round(Math.sin(now / 380 + w.x) * 1.5);
      this.pin(v, w.x, w.y, 4);
      v.setTexture(frameKey(key, frames > 1 ? Math.floor(now / 520) % frames : 0))
        .setPosition(Math.round(qx), Math.round(qy + 4 + bob))
        .setFlipX(w.face < 0)
        .setAlpha(w.alpha)
        .setVisible(w.alpha > 0.02)
        .setDepth(this.depthAt(w.x, w.y));
    }
  }

  /** Pages, notice boards and chests; a page glints now and then so it can be spotted. */
  private drawObjects(now: number): void {
    for (const [o, img] of this.objectViews) {
      if (this.sim.objects.includes(o)) continue;
      this.pins.delete(img);
      img.destroy();
      this.objectViews.delete(o);
    }
    for (const o of this.sim.objects) {
      const key = Tex.object(o.kind);
      let img = this.objectViews.get(o);
      if (!img) {
        const flat = FLAT_OBJECTS.has(o.kind);
        img = this.pin(this.image(isoX(o.x, o.y), isoY(o.x, o.y) + (flat ? 4 : 7), key).setOrigin(0.5, 1).setDepth(this.depthAt(o.x, o.y, flat ? o.x + o.y - 8 : o.x + o.y)), o.x, o.y, flat ? 4 : 7);
        this.objectViews.set(o, img);
      }
      const glint = GLINTING_OBJECTS.has(o.kind) && Math.floor(now / 160) % 16 === 0;
      img.setTexture(frameKey(key, glint ? 1 : 0)).setScale(artScale(key));
    }
  }

  /** Felled trees show a stump until they regrow; a tree being chopped shakes. */
  private drawTrees(): void {
    for (const t of this.sim.trees) {
      const v = this.treeViews.get(`${t.c},${t.r}`);
      if (!v) continue;
      const want = t.stumpT > 0 ? v.stump : v.key;
      if (v.shown !== want) {
        v.img.setTexture(want).setScale(artScale(want));
        v.shown = want;
      }
      v.img.x = v.x + (t.shakeT > 0 ? Math.round(Math.sin(t.shakeT * 70) * 1.5) : 0);
    }
  }

  private drawRocks(): void {
    for (const k of this.sim.rocks) {
      const v = this.rockViews.get(`${k.c},${k.r}`);
      if (!v) continue;
      const want = k.brokenT > 0 ? Tex.rubble : Tex.rock;
      if (v.shown !== want) {
        v.img.setTexture(want).setScale(artScale(want));
        v.shadow.setAlpha(want === Tex.rubble ? 0.15 : 0.3);
        v.shown = want;
      }
      v.img.x = v.x + (k.shakeT > 0 ? Math.round(Math.sin(k.shakeT * 90) * 1.5) : 0);
    }
  }

  /** People: an idle loop, turning to face you, a name plate and a quest mark (! new, ? to hand in). */
  private drawNpcs(now: number): void {
    const s = this.sim;
    const live = new Set(s.npcs);
    for (const [n, v] of this.npcViews) {
      if (live.has(n)) continue;
      for (const o of [v.img, v.shadow, v.name, v.mark]) {
        this.pins.delete(o);
        o.destroy();
      }
      this.npcViews.delete(n);
    }
    for (const n of s.npcs) {
      const key = Tex.npc(n.id);
      const qx = isoX(n.x, n.y);
      const qy = isoY(n.x, n.y);
      let v = this.npcViews.get(n);
      if (!v) {
        v = {
          shadow: this.image(qx, qy + 5, Tex.shadow).setDisplaySize(24, 12).setAlpha(0.3).setDepth(this.depthAt(n.x, n.y) - 0.5),
          img: this.image(qx, qy + 6, key).setOrigin(0.5, 1),
          name: this.mark('8px', '#fce6b4').setText(NPCS[n.id].name).setOrigin(0.5, 1),
          mark: this.mark('24px', '#f2c14e').setOrigin(0.5, 1),
        };
        this.npcViews.set(n, v);
      }
      for (const o of [v.img, v.shadow, v.name, v.mark]) this.pin(o, n.x, n.y, 6);
      const frames = artFrames(key);
      const sc = artScale(key);
      v.img.setTexture(frameKey(key, frames > 1 ? Math.floor(now / 420) % frames : 0)).setScale(sc).setDepth(this.depthAt(n.x, n.y));
      // look at the player when they are close
      if (Math.hypot(s.x - n.x, s.y - n.y) < 140) n.face = isoX(s.x, s.y) < qx ? -1 : 1;
      v.img.setFlipX(n.face < 0);
      const top = qy + 6 - v.img.frame.height * sc;
      v.name.setPosition(Math.round(qx), Math.round(top - 2)).setVisible(true);
      const m = s.npcMark(n.id);
      const bob = Math.round(Math.sin(now / 260) * 1.5);
      v.mark
        .setText(m ?? '')
        .setColor(m === '…' ? '#c8c0a8' : '#f2c14e')
        .setPosition(Math.round(qx), Math.round(top - 11 + bob))
        .setVisible(!!m);
    }
  }

  /** Campfires (flames flicker, and the fire fades as it burns out) and forges (the mouth glows). */
  private drawStructures(now: number): void {
    const live = new Set(this.sim.structures);
    for (const [s, v] of this.structureViews) {
      if (live.has(s)) continue;
      this.pins.delete(v.img);
      this.pins.delete(v.shadow);
      v.img.destroy();
      v.shadow.destroy();
      this.structureViews.delete(s);
    }
    for (const s of this.sim.structures) {
      const key = Tex.structure(s.kind);
      let v = this.structureViews.get(s);
      const qx = isoX(s.x, s.y);
      const qy = isoY(s.x, s.y);
      if (!v) {
        v = {
          shadow: this.image(qx, qy + 3, Tex.shadow).setAlpha(0.3),
          img: this.image(qx, qy, key).setOrigin(0.5, 1),
        };
        this.structureViews.set(s, v);
      }
      this.pin(v.img, s.x, s.y, s.kind === 'campfire' ? 6 : 9);
      this.pin(v.shadow, s.x, s.y, 3);
      // a kiln's last frame is it gone cold; the others smoulder
      const kiln = s.kind === 'kiln';
      const n = kiln ? Math.min(KILN_OUT, artFrames(key)) : artFrames(key);
      const f = n > 1 ? Math.floor(now / (s.kind === 'campfire' ? 120 : 260) + s.id) % n : 0;
      const k = frameKey(key, f);
      const sc = artScale(key);
      v.img.setTexture(k).setScale(sc);
      const w = v.img.frame.width * sc;
      const fade = s.t < 6 ? Math.max(0.15, s.t / 6) : 1;
      // a fire put out goes dark and still; one being smothered dims as it goes
      if (s.out && kiln && artFrames(key) > KILN_OUT) v.img.setTexture(frameKey(key, KILN_OUT)).clearTint();
      else if (s.out) v.img.setTexture(frameKey(key, 0)).setTint(0x404040);
      else if ((s.smother ?? 0) > 0) v.img.setTint(Phaser.Display.Color.GetColor(255, Math.round(255 - 150 * (s.smother ?? 0)), Math.round(255 - 150 * (s.smother ?? 0))));
      else v.img.clearTint();
      v.img.setPosition(Math.round(qx), Math.round(qy + (s.kind === 'campfire' ? 6 : 9))).setDepth(this.depthAt(s.x, s.y)).setAlpha(fade);
      v.shadow.setDisplaySize(w * 0.85, w * 0.35).setDepth(this.depthAt(s.x, s.y) - 0.5);
    }
  }

  /** Items on the ground: they hop out, land with a shadow and bob gently until picked up. */
  private drawDrops(now: number): void {
    const live = new Set(this.sim.drops);
    for (const [d, v] of this.dropViews) {
      if (live.has(d)) continue;
      this.pins.delete(v.img);
      this.pins.delete(v.shadow);
      v.img.destroy();
      v.shadow.destroy();
      this.dropViews.delete(d);
    }
    for (const d of this.sim.drops) {
      let v = this.dropViews.get(d);
      const key = Tex.drop(d.id);
      if (!v) {
        v = {
          shadow: this.image(0, 0, Tex.shadow).setAlpha(0.25),
          img: this.image(0, 0, key).setOrigin(0.5, 1),
        };
        this.dropViews.set(d, v);
      }
      const qx = isoX(d.x, d.y);
      const qy = isoY(d.x, d.y);
      this.pin(v.img, d.x, d.y, 2);
      this.pin(v.shadow, d.x, d.y, 2);
      const s = artScale(key);
      const w = v.img.setTexture(key).frame.width * s;
      const bob = d.z === 0 ? Math.round(Math.sin(now / 300 + d.x) * 1.2) : 0;
      const fade = d.age > 170 ? Math.max(0, (180 - d.age) / 10) : 1;
      v.img.setScale(s).setPosition(Math.round(qx), Math.round(qy + 2 - d.z - bob)).setDepth(this.depthAt(d.x, d.y)).setAlpha(fade);
      v.shadow.setPosition(qx, qy + 2).setDisplaySize(w * 0.8, w * 0.35).setDepth(this.depthAt(d.x, d.y) - 0.5).setAlpha(0.25 * fade);
    }
  }

  /** Remove sprites for enemies the sim no longer has (dev spawns that died, respawn-all, reset). */
  private dropStaleViews(): void {
    const live = new Set(this.sim.enemies);
    for (const [e, v] of this.enemyViews) {
      if (live.has(e)) continue;
      for (const o of [v.sprite, v.shadow, v.mark]) this.pins.delete(o);
      v.sprite.destroy();
      v.shadow.destroy();
      v.mark.destroy();
      this.enemyViews.delete(e);
    }
  }

  private drawEnemy(e: Enemy, now: number, g: Phaser.GameObjects.Graphics): void {
    let v = this.enemyViews.get(e);
    if (!v) {
      v = {
        shadow: this.image(0, 0, Tex.shadow).setAlpha(0.3),
        sprite: this.image(0, 0, e.def.tex).setOrigin(0.5, 1),
        mark: this.mark('18px', '#f2c14e'),
      };
      this.enemyViews.set(e, v);
    }
    // an ambusher up in the canopy can't be seen until it drops
    const visible = (e.alive || e.dieT > 0) && !e.hid;
    v.sprite.setVisible(visible);
    v.shadow.setVisible(visible);
    v.mark.setVisible(false);
    if (!visible) return;

    const key = e.def.tex;
    const s = artScale(key);
    const frames = artFrames(key);
    const fi = frames > 1 && e.alive && e.walk > 0 ? Math.floor(e.walk / 2.5) % frames : 0;
    v.sprite.setTexture(frameKey(key, fi));
    const fw = v.sprite.frame.width;
    const fh = v.sprite.frame.height;
    const w = fw * s;
    const h = fh * s;
    const qx = isoX(e.x, e.y);
    const qy = isoY(e.x, e.y);
    for (const o of [v.sprite, v.shadow, v.mark]) this.pin(o, e.x, e.y, 6);
    // up in the air (dropping out of the canopy, or on a leap); an egg about to hatch shudders;
    // a smotherer lies flat on its fire (its bars come down with it)
    const z = Math.round(e.z ?? 0);
    const shudder = e.hatchT !== undefined && e.alive ? Math.round(Math.sin(now / 45) * 1.5) : 0;
    const lying = !!e.lying && e.alive;
    // lying, the body is turned about its feet and lies off to the side it faces
    const x = lying ? qx + e.face * (h * 0.5 + w * 0.3) - w / 2 : qx - w / 2;
    const y = lying ? qy - 8 : qy - h + 6 - z;
    const depth = this.depthAt(e.x, e.y);

    // walk bob (smaller when there are real walk frames), or a squash-and-stretch hop
    let bob = e.walk ? Math.round(Math.abs(Math.sin(e.walk)) * (frames > 1 ? 1 : 2)) : 0;
    let sx = s;
    let sy = s;
    if (e.def.bounce && e.alive) {
      const ph = e.walk ? e.walk * 0.9 : now / 260;
      const k = Math.sin(ph);
      sx = s * (1 - 0.1 * k);
      sy = s * (1 + 0.12 * k);
      bob = e.walk ? Math.round(Math.max(0, k) * 4) : 0;
    }

    // night creatures climb out of the ground and sink back into it: crop the sprite at
    // ground level instead of fading it, so it reads as emerging from the earth
    const sinking = !e.alive && !!e.def.nightOnly;
    const buried = e.riseT > 0 ? e.riseT / RISE_DUR : sinking ? 1 - Math.max(0, e.dieT) : 0;
    const hidden = Math.round(fh * buried);
    if (hidden > 0) v.sprite.setCrop(0, 0, fw, fh - hidden);
    else v.sprite.setCrop();

    const lift = Math.max(0.45, 1 - z / 120);
    v.shadow.setPosition(qx, qy + 3).setDisplaySize((w + 2) * lift, ((w + 2) / 2) * lift).setDepth(depth - 0.5).setAlpha(0.3 * (1 - buried));
    v.sprite
      .setScale(sx, sy)
      .setPosition(qx + shudder + (lying ? e.face * w * 0.3 : 0), qy + 6 - bob - z + (e.stunT > 0 ? 3 : 0) + hidden * sy + (lying ? 4 : 0))
      .setFlipX(e.face < 0)
      .setDepth(depth)
      .setAlpha(e.alive || sinking ? 1 : Math.max(0, e.dieT))
      .setRotation(lying ? e.face * 1.45 : e.alive || sinking ? 0 : 0.7);
    if (e.flash > 0) v.sprite.setTintFill(0xffffff);
    else v.sprite.clearTint();
    if (!e.alive || e.riseT > 0) return;

    // health / cast bars
    g.fillStyle(hex('#0a0d14')).fillRect(x - 1, y - 10, w + 2, 5);
    g.fillStyle(hex('#e0504b')).fillRect(x, y - 9, Math.round((w * e.hp) / e.hpMax), 3);
    if (e.castT > 0) {
      g.fillStyle(hex('#0a0d14')).fillRect(x - 1, y - 16, w + 2, 5);
      g.fillStyle(hex('#a78bfa')).fillRect(x, y - 15, Math.round(w * (1 - e.castT / e.castTotal)), 3);
    }
    // marks: telegraph, stun, casting
    if (e.tele && e.stunT <= 0) {
      v.mark.setText('!').setFontSize(18).setColor('#f2c14e').setPosition(qx - 5, y - 34).setVisible(true);
    } else if (e.stunT > 0) {
      v.mark.setText('zzz').setFontSize(9).setColor('#93a0b8').setPosition(qx - 9, y - 22).setVisible(true);
    } else if (e.castT > 0) {
      v.mark.setText('✦').setFontSize(12).setColor('#a78bfa').setPosition(x + w + 2, y - 4).setVisible(true);
    }
    if (e.aggro && !e.tele && e.castT <= 0 && e.stunT <= 0) g.fillStyle(hex('#e0504b')).fillRect(qx - 2, y - 15, 4, 4);
    // shield up: a kite shield held out on the side it faces
    if ((e.shieldT ?? 0) > 0 && e.stunT <= 0) this.shieldMark(g, Math.round(qx + e.face * (w * 0.42)), Math.round(y + h * 0.42));

    if (this.sim.target === e) {
      const p = Math.sin(now / 180) * 2;
      const m = 5 + p;
      const bx = x - 4 - p;
      const by = y - 4 - p;
      const bw = w + 8 + 2 * p;
      const bh = h + 8 + 2 * p;
      this.bracket(g, bx, by, bw, bh, m, 0x000000, 4);
      this.bracket(g, bx, by, bw, bh, m, hex('#f2c14e'), 2);
      g.fillStyle(hex('#f2c14e')).fillTriangle(qx - 5, by - 12, qx + 5, by - 12, qx, by - 5);
    }
  }

  /** A small kite shield, steel with a dark rim, centred on (x, y): a creature's shield is up. */
  private shieldMark(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(hex('#1a1d24')).fillRect(x - 4, y - 6, 9, 9).fillTriangle(x - 4, y + 3, x + 5, y + 3, x + 0.5, y + 8);
    g.fillStyle(hex('#c4cedc')).fillRect(x - 3, y - 5, 7, 7).fillTriangle(x - 3, y + 2, x + 4, y + 2, x + 0.5, y + 6);
    g.fillStyle(hex('#8a94a6')).fillRect(x, y - 5, 1, 10);
  }

  private bracket(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, m: number, col: number, lw: number): void {
    g.lineStyle(lw, col, 1);
    const seg = (pts: [number, number][]) => {
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.strokePath();
    };
    seg([[x, y + m], [x, y], [x + m, y]]);
    seg([[x + w - m, y], [x + w, y], [x + w, y + m]]);
    seg([[x + w, y + h - m], [x + w, y + h], [x + w - m, y + h]]);
    seg([[x + m, y + h], [x, y + h], [x, y + h - m]]);
  }

  /**
   * Where the hero stands on screen this frame, in whole pixels; the camera centres on the same
   * point, so the hero holds still while the world scrolls. Rounding x and y on their own made
   * a diagonal walk step x on one frame and y on another, and the hero shimmered against the
   * ground: instead round the axis that moves faster and slide along the line of travel to it
   * (like a line drawn pixel by pixel), so both axes step together.
   */
  heroScreen(): { x: number; y: number } {
    const s = this.sim;
    const qx = isoX(s.x, s.y);
    const qy = isoY(s.x, s.y);
    const m = s.moving ? s.hero.lastMove : null;
    if (!m) return { x: Math.round(qx), y: Math.round(qy) };
    // the walk's direction on screen
    const vx = m.x - m.y;
    const vy = (m.x + m.y) / 2;
    if (Math.abs(vx) >= Math.abs(vy)) {
      const x = Math.round(qx);
      return { x, y: Math.round(qy + ((x - qx) * vy) / vx) };
    }
    const y = Math.round(qy);
    return { x: Math.round(qx + ((y - qy) * vx) / vy), y };
  }

  private drawPlayer(now: number, g: Phaser.GameObjects.Graphics): void {
    if (!WorldRenderer.showPlayer) {
      for (const o of [this.knight, this.playerShadow, this.horse, this.rider, this.buffMark, this.ghost]) o.setVisible(false);
      return;
    }
    const s = this.sim;
    const { x: qx, y: qy } = this.heroScreen();
    const depth = this.depthAt(s.x, s.y);
    this.pin(this.knight, s.x, s.y, 8, qx, qy);
    this.pin(this.playerShadow, s.x, s.y, 5, qx, qy);
    this.pin(this.horse, s.x, s.y, 4, qx, qy);
    this.pin(this.rider, s.x, s.y, 4, qx, qy);
    this.pin(this.buffMark, s.x, s.y, 8, qx, qy);
    const alpha = s.invT > 0 ? 0.5 : 1;
    const flipX = s.face < 0;
    const ks = artScale(Tex.knight);
    const walking = s.moving && !s.airborne;
    // jump: lift the body, shrink the shadow, stretch going up and squash on landing
    const z = Math.round(s.jumpZ);
    const jp = s.jumpP;
    // a backflip tumbles through drawn frames when the style has them; otherwise it is a straight jump
    const tumbling = s.airborne && s.jumpFlip && artAnim(Tex.knight, 'flip') > 0;
    const stretch = s.airborne && !tumbling ? 1 + 0.08 * (1 - 2 * jp) : 1;
    const shadowK = 1 - (z / 22) * 0.45;
    this.buffMark.setVisible(s.buffT > 0).setDepth(depth + 0.1);

    if (s.mounted) {
      const lift = this.trot(walking, now) + z;
      this.playerShadow.setPosition(qx, qy + 5).setDisplaySize(40 * shadowK, 20 * shadowK).setDepth(depth - 0.5);
      this.knight.setVisible(false);
      this.ride(this.horse, this.rider, riderFit(), ks, qx, qy - lift, s.face, walking, now, alpha, depth);
      this.buffMark.setPosition(qx + 18, qy - 28 - lift);
      this.ghost.setVisible(false);
      return;
    }

    const kf = artFrames(Tex.knight);
    // 6-frame walks carry their own body bob; shorter ones get a small one here
    const bob = walking ? Math.round(Math.abs(Math.sin(now / 90)) * (kf > 4 ? 0 : kf > 1 ? 1 : 2)) : 0;
    const lift = bob + z;
    // the standing frame's height (the current frame may be a tumble frame of another size)
    const kh = this.scene.textures.getFrame(Tex.knight).height * ks;
    const y = qy + 8 - kh - z;
    this.playerShadow.setPosition(qx, qy + 5).setDisplaySize(26 * shadowK, 13 * shadowK).setDepth(depth - 0.5);
    this.horse.setVisible(false);
    this.rider.setVisible(false);
    this.knight
      .setTexture(this.heroFrame(now, walking, kf, tumbling, jp))
      .setVisible(true)
      .setFlipX(flipX)
      // camouflaged: a faint shape among the leaves
      .setAlpha(this.sim.hero.hiddenT > 0 ? alpha * 0.45 : alpha)
      .setDepth(depth);
    if (tumbling) {
      // tumble frames are the tucked body turned in 90° steps: hold them around the body centre
      this.knight.setOrigin(0.5, 0.5).setPosition(qx, qy + 8 - lift - kh / 2).setRotation(0);
      this.knight.setScale(ks);
    } else {
      // fallen: lying where you fell
      this.knight.setOrigin(0.5, 1).setPosition(qx, qy + 8 - lift).setRotation(s.dead > 0 ? 1.3 : 0);
      this.knight.setScale(ks / stretch, ks * stretch);
    }
    // behind a house: a faint silhouette shows where you are
    const hidden = !tumbling && this.hiddenByProp(s.x, s.y);
    this.ghost.setVisible(hidden);
    if (hidden) this.ghost.setTexture(this.knight.texture.key, this.knight.frame.name).setPosition(this.knight.x, this.knight.y).setScale(this.knight.scaleX, this.knight.scaleY).setFlipX(flipX);
    // mounting, chopping, mining or making something: how far along
    const work = s.mountT > 0 ? { p: 1 - s.mountT, col: '#a78bfa' } : s.work ? { p: s.work.p, col: WORK_COL[s.work.kind] } : null;
    if (work) {
      g.fillStyle(hex('#0a0d14')).fillRect(qx - 16, y - 12, 32, 6);
      g.fillStyle(hex(work.col)).fillRect(qx - 15, y - 11, Math.round(30 * Math.min(1, Math.max(0, work.p))), 4);
    }
    this.buffMark.setPosition(qx + 14, y - 4);
  }

  /** How high a trotting horse lifts its rider this frame. */
  private trot(walking: boolean, now: number): number {
    return walking ? Math.round(Math.abs(Math.sin(now / 70)) * 3) : 0;
  }

  /**
   * A hero on horseback, standing at (qx, qy) (already lifted by the trot and any jump): the
   * horse, walking while it moves, and the rider (a hero sprite of scale `ks`, cropped at the
   * waist by `rc`) in the saddle. Returns the screen y of the rider's head.
   */
  private ride(
    horse: Phaser.GameObjects.Image,
    rider: Phaser.GameObjects.Image,
    rc: RiderFit,
    ks: number,
    qx: number,
    qy: number,
    face: 1 | -1,
    walking: boolean,
    now: number,
    alpha: number,
    depth: number
  ): number {
    const hs = artScale(Tex.horse);
    const hf = artFrames(Tex.horse);
    horse
      .setTexture(frameKey(Tex.horse, walking && hf > 1 ? Math.floor(now / 110) % hf : 0))
      .setVisible(true)
      .setPosition(qx, qy + 4)
      .setFlipX(face < 0)
      .setAlpha(alpha)
      .setDepth(depth);
    // put the bottom of the cropped rider slice just below the horse's top edge
    const horseTop = qy + 4 - horse.frame.height * hs;
    const hiddenBelow = (rider.frame.height - rc.rows) * ks;
    const y = horseTop + rc.below + hiddenBelow;
    rider
      .setVisible(true)
      .setPosition(qx + rc.dx * face, y)
      .setFlipX(face < 0)
      .setAlpha(alpha)
      .setDepth(depth + 0.05);
    return y - rider.frame.height * ks;
  }

  /**
   * Which hero frame to show: tumble and jump frames in the air, attack frames while
   * swinging, the walk cycle when moving, the idle loop when standing. Styles without a
   * group fall back to the walk frames.
   */
  private heroFrame(now: number, walking: boolean, kf: number, tumbling: boolean, jp: number): string {
    const s = this.sim;
    const K = Tex.knight;
    const n = (group: string) => artAnim(K, group);
    if (tumbling) return animKey(K, 'flip', Math.min(3, Math.max(0, Math.floor(((jp - 0.12) / 0.76) * 4))));
    if (s.airborne) {
      const j = n('jump');
      return j ? animKey(K, 'jump', jp < 0.35 ? 0 : jp < 0.7 ? Math.min(1, j - 1) : j - 1) : frameKey(K, 0);
    }
    const hit = hitAnim(s.hero);
    if (s.attackP >= 0 && n(hit)) return animKey(K, hit, Math.min(n(hit) - 1, Math.floor(s.attackP * n(hit))));
    if (walking && kf > 1) return frameKey(K, Math.floor(now / (kf > 4 ? 95 : 120)) % kf);
    if (n('idle')) return animKey(K, 'idle', Math.floor(now / 380) % n('idle'));
    return frameKey(K, 0);
  }
}

/** The animation a hero attacks with: an archer with a bow shoots, a sorceress with a staff casts (her 'shoot' frames), everyone else swings. */
function hitAnim(h: { ranged: boolean }): 'shoot' | 'attack' {
  return h.ranged ? 'shoot' : 'attack';
}
