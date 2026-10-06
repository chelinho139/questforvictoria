import Phaser from 'phaser';
import { SceneKeys } from '../SceneKeys';
import type { Sim } from '../../sim/Sim';
import type { Hero } from '../../sim/Hero';
import { GCD } from '../../sim/Hero';
import type { Enemy, SoundId } from '../../sim/types';
import type { EnemyKind } from '../../data/enemies';
import type { StructureKind } from '../../data/crafting';
import type { ClassId } from '../../data/classes';
import type { ItemId, Slot } from '../../data/items';
import { SPELL_ORDER } from '../../data/spells';
import type { SpellKey } from '../../data/spells';
import type { WeatherKind, Strike } from '../../sim/weather';
import type { Sfx } from '../audio/Sfx';
import type { WeatherFx } from '../render/WeatherFx';
import type { WeatherAudio } from '../audio/WeatherAudio';
import type { HdHeroId } from '../render/hdHeroes';
import { SOUNDS } from '../audio/sounds';
import { SCENES } from '../../data/scenes';
import { RISE_DUR } from '../../sim/Region';
import { T, isoX, isoY } from '../../sim/map';
import { buildLogo, LOGO_KEY } from '../render/splash';
import { WorldRenderer } from '../render/WorldRenderer';
import { Effects } from '../render/Effects';
import { playAs } from '../player';
import type { ViewMode } from '../view3d/View3D';
import type { Lighting } from '../lighting/Lighting';

/**
 * The trailer director (dev only: `?director` in the address). It films the game rather than
 * playing it: the game runs on the director's clock, one frame at a time, so a shot comes out
 * at a steady 60 frames a second (or in slow motion) however long each frame takes to render
 * and capture. It hides the interface for clean shots, moves the camera, stages heroes and
 * creatures (and fights them with a small brain of their own), and writes down every sound
 * the shot makes with the moment it was heard, so the trailer's sound can be mixed afterwards
 * from the same recipes. tools/trailer/ drives it from Chrome; see tools/trailer/README.md.
 */

/** A point the camera can look at: a world point, a tile, or something that moves. */
export type Spot = { x: number; y: number } | [number, number] | Hero | Enemy;

/** A sound as it was heard: when (seconds into the shot), how loud, where and how fast. */
export type AudioEvent =
  | { t: number; id: SoundId; take: number; gain: number; pan: number; rate: number }
  | { t: number; loops: { rain: number; downpour: number; wind: number }; indoor: boolean };

/** How a staged hero fights: what it casts (first ready wins) and how close it stands. */
export interface Brain {
  spells: SpellKey[];
  /** Stand this far from the foe (an archer's bowshot; a warrior closes in). */
  reach?: number;
  /** Only fight these (else the nearest living creature). */
  foes?: () => Enemy[];
  /** Stop thinking (walk scripts take over). */
  off?: boolean;
  repathT?: number;
  /** Seconds before the next cast (a little after the global cooldown, as a player's hands would be). */
  waitT?: number;
}

export interface HeroSetup {
  cls?: ClassId;
  look?: HdHeroId;
  name?: string;
  level?: number;
  equip?: Partial<Record<Slot, ItemId | null>>;
  talents?: Record<string, number>;
  at?: [number, number];
  /** Immune to everything (the old way: "IMMUNE" over every blow, and no web or root takes). Default: stout. */
  god?: boolean;
}

interface CamMove {
  from: { x: number; y: number; zoom: number };
  to: Spot | null;
  zoom: number;
  t0: number;
  dur: number;
  ease: (k: number) => number;
}

/** The share of their health a stout hero never drops below. */
const STOUT = 0.45;

export const EASE = {
  linear: (k: number) => k,
  inOut: (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
  out: (k: number) => 1 - Math.pow(1 - k, 3),
  in: (k: number) => k * k * k,
  slow: (k: number) => 0.5 - Math.cos(Math.PI * k) / 2,
};

/** The director is on for this page. */
export function directorWanted(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('director');
  } catch {
    return false;
  }
}

/** The 3D view's camera settings the director moves (View3D's own fields). */
export interface Cam3d {
  yaw?: number;
  pitch?: number;
  zoom?: number;
  dist?: number;
}

interface View3dCam {
  mode: 'diorama' | 'pov';
  yaw: number;
  yawGoal: number;
  pitch: Record<'diorama' | 'pov', number>;
  zoom: number;
  dist: number;
  look(dx: number, dy: number): void;
}

/** The parts of the game scene the director works with. */
export interface DirectorStage {
  sim: Sim;
  sfx: Sfx;
  weather: WeatherFx;
  lighting: Lighting;
}

export class Director {
  /** Film frames a second. */
  fps = 60;
  /** Game seconds per film second (0.5: half speed). */
  speed = 1;
  /** Film seconds since the shot began (cues are in film time, so slow motion doesn't move them). */
  t = 0;
  /** The page's virtual clock, ms (what Phaser is told the time is). */
  private vt = 0;
  private cues: { t: number; fn: (d: Director) => void }[] = [];
  private every: ((d: Director, dt: number) => void)[] = [];
  /** Interface hidden: no HUD, no windows, no names or bars over heads. */
  clean = false;
  /** The camera, when the director holds it (null: the game's own, on the hero). */
  cam: { x: number; y: number; zoom: number } | null = null;
  private follow: { at: Spot; lag: number; dx: number; dy: number } | null = null;
  private move: CamMove | null = null;
  /** Slow drift added on top (screen px a second), for living still shots. */
  drift = { x: 0, y: 0, zoom: 0 };
  /** The small light the hero carries so night stays playable (a trailer's daylight looks better without it). */
  playerLight = true;
  /** Every sound heard since the shot began. */
  audio: AudioEvent[] = [];
  private lastAt = new Map<SoundId, number>();
  private lastLoops = '';
  readonly brains = new Map<Hero, Brain>();
  /** Heroes who take their blows (the bars go down, webs and roots hold them) but never fall below STOUT of their health. */
  private readonly stout = new Set<Hero>();
  /** The brains' own dice (not Math.random, which the renderer shares), so takes of a shot in different views stay in step. */
  private seed = 0x9e3779b9;
  private rand(): number {
    let t = (this.seed = (this.seed + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  private heroN = 0;

  constructor(
    readonly game: Phaser.Game,
    private readonly stage: () => DirectorStage
  ) {
    // the game no longer runs itself: frame() steps it
    game.loop.sleep();
    game.loop.wake = () => undefined;
    this.vt = game.loop.time || 1000;
    this.tapSounds();
    // no scene plays on its own (a shot can still play one with scene())
    for (const id of Object.keys(SCENES)) this.sim.game.flags['scene:' + id] = 1;
    this.sim.game.region(this.sim.region).clearScene();
    (window as unknown as { director: Director }).director = this;
  }

  get sim(): Sim {
    return this.stage().sim;
  }
  get hero(): Hero {
    return this.sim.hero;
  }
  get region() {
    return this.sim.game.region(this.sim.region);
  }

  // ---------- the clock ----------
  /** Advance the film by n frames; cues due run first. Returns the film time. */
  frame(n = 1): number {
    const dt = 1 / this.fps;
    for (let i = 0; i < n; i++) {
      this.runCues();
      for (const fn of this.every) fn(this, dt);
      this.thinkAll(dt * this.speed);
      const ms = 1000 * dt * this.speed;
      this.vt += ms;
      this.keepUp();
      this.game.step(this.vt, ms);
      this.keepUp();
      this.t += dt;
    }
    return this.t;
  }

  /** Stout heroes never drop below STOUT of their health (a quiet top-up, no heal shown). */
  private keepUp(): void {
    for (const h of this.stout) if (!h.dead && h.hp < h.hpMax * STOUT) h.hp = Math.ceil(h.hpMax * STOUT);
  }

  /** Run the game unfilmed for a while (things settle: lighting, rain, creatures getting into place). */
  settle(seconds: number): void {
    const keep = this.t;
    const cues = this.cues;
    this.cues = [];
    this.settling = true;
    this.frame(Math.round(seconds * this.fps));
    this.settling = false;
    this.cues = cues;
    this.t = keep;
    this.audio = [];
  }

  /** Running unfilmed (a camera move started for the shot waits for it). */
  private settling = false;

  /** Start the shot's clock (and its sound log) from zero. */
  rollCamera(): void {
    this.t = 0;
    this.audio = [];
    this.lastAt.clear();
    this.lastLoops = '';
    this.cues.sort((a, b) => a.t - b.t);
  }

  /** Do this `t` film seconds into the shot. */
  at(t: number, fn: (d: Director) => void): this {
    this.cues.push({ t, fn });
    this.cues.sort((a, b) => a.t - b.t);
    return this;
  }

  /** Do this every frame (film dt). */
  each(fn: (d: Director, dt: number) => void): this {
    this.every.push(fn);
    return this;
  }

  private runCues(): void {
    while (this.cues.length && this.cues[0].t <= this.t + 1e-6) this.cues.shift()!.fn(this);
  }

  // ---------- the interface ----------
  /** Empty the log (what setting up a shot said there isn't part of it). */
  clearLog(): void {
    this.hero.logHistory.length = 0;
    const hud = this.game.scene.getScene(SceneKeys.PcHud) as unknown as { logLines?: unknown[]; refreshLog?(): void } | null;
    if (hud?.logLines) hud.logLines.length = 0;
    hud?.refreshLog?.();
  }

  /** The 3D view's camera (its fields are the view's own: the director reaches past `private`). */
  private v3d(): View3dCam | null {
    return (this.game.registry.get('view3d') as unknown as View3dCam | null) ?? null;
  }

  /** The 3D view, while one is on: turn it (radians a second) and tilt it. */
  orbit(yawPerS: number, pitch?: number): this {
    this.each((_, dt) => this.v3d()?.look(-(yawPerS * dt) / 0.008, 0));
    if (pitch !== undefined) this.v3d()?.look(0, pitch / 0.006);
    return this;
  }

  /**
   * Set the 3D camera now: `yaw` round the hero, `pitch` above the ground (per mode), the
   * diorama's `zoom`, and how far behind the hero the point-of-view camera sits (`dist`; under 6:
   * through their eyes).
   */
  cam3d(o: Cam3d): this {
    const v = this.v3d();
    if (!v) return this;
    if (o.yaw !== undefined) v.yaw = v.yawGoal = o.yaw;
    if (o.pitch !== undefined) v.pitch[v.mode] = o.pitch;
    if (o.zoom !== undefined) v.zoom = o.zoom;
    if (o.dist !== undefined) v.dist = o.dist;
    return this;
  }

  /** Glide the 3D camera to these settings over `dur` film seconds. */
  cam3dTo(o: Cam3d, dur: number, ease: keyof typeof EASE = 'inOut'): this {
    const v = this.v3d();
    if (!v) return this;
    const from = { yaw: v.yaw, pitch: v.pitch[v.mode], zoom: v.zoom, dist: v.dist };
    const t0 = this.t;
    let done = false;
    this.each(d => {
      if (done) return;
      const k = Math.min(1, (d.t - t0) / dur);
      const e = EASE[ease](k);
      const at: Cam3d = {};
      for (const key of Object.keys(o) as (keyof Cam3d)[]) at[key] = from[key] + (o[key]! - from[key]) * e;
      d.cam3d(at);
      if (k >= 1) done = true;
    });
    return this;
  }

  setClean(on: boolean): void {
    this.clean = on;
    WorldRenderer.showUi = !on;
    Effects.showGoal = !on;
    document.body.classList.toggle('director-clean', on);
    this.hud();
  }

  /** Keep the HUD hidden while clean (the game scene shows it again whenever no scene plays). */
  hud(): void {
    const hud = this.game.scene.getScene(SceneKeys.PcHud);
    if (hud && this.clean && hud.sys.settings.visible) hud.sys.setVisible(false);
  }

  // ---------- the camera ----------
  /** Where a spot is on the 2D view (projected px): a tile's or point's ground, or someone's middle. */
  screenOf(s: Spot): { x: number; y: number } {
    const w = this.world(s);
    const lift = Array.isArray(s) || !('id' in s) ? 0 : 16;
    return { x: isoX(w.x, w.y), y: isoY(w.x, w.y) - lift };
  }

  /** A spot as a world point. */
  world(s: Spot): { x: number; y: number } {
    if (Array.isArray(s)) return { x: s[0] * T + T / 2, y: s[1] * T + T / 2 };
    return { x: s.x, y: s.y };
  }

  /** Hold the camera still on a spot (zoom 1: the game's own; 2: twice as close). */
  camAt(s: Spot, zoom = this.cam?.zoom ?? 1): this {
    const p = this.screenOf(s);
    this.cam = { x: p.x, y: p.y, zoom };
    this.follow = null;
    this.move = null;
    return this;
  }

  /** Glide from where the camera is to a spot (null: keep the place, change only the zoom) over `dur` film seconds. */
  camTo(to: Spot | null, dur: number, zoom = this.cam?.zoom ?? 1, ease: keyof typeof EASE = 'inOut'): this {
    const from = this.cam ?? { ...this.gameCam(), zoom: 1 };
    this.move = { from: { ...from }, to, zoom, t0: this.t, dur, ease: EASE[ease] };
    this.follow = null;
    return this;
  }

  /** Keep a moving thing in view; `lag` seconds to most of the way (0: locked on). */
  camFollow(at: Spot, lag = 0.25, zoom = this.cam?.zoom ?? 1, dx = 0, dy = 0): this {
    if (!this.cam) this.cam = { ...this.gameCam(), zoom };
    this.cam.zoom = zoom;
    this.follow = { at, lag, dx, dy };
    this.move = null;
    return this;
  }

  /** Back to the game's camera. */
  camGame(): this {
    this.cam = null;
    this.follow = null;
    this.move = null;
    return this;
  }

  private gameCam(): { x: number; y: number } {
    const c = this.game.scene.getScene(SceneKeys.Game).cameras.main;
    return { x: c.midPoint.x, y: c.midPoint.y };
  }

  /** The game scene asks each frame: where to look and how close (null: as the game would). Moves in film time. */
  camera(): { x: number; y: number; zoom: number } | null {
    this.hud();
    const dt = 1 / this.fps;
    const cam = this.cam;
    if (!cam) return null;
    const m = this.move;
    if (m) {
      const k = m.dur > 0 ? Math.min(1, (this.t - m.t0) / m.dur) : 1;
      const e = m.ease(k);
      const to = m.to ? this.screenOf(m.to) : m.from;
      cam.x = m.from.x + (to.x - m.from.x) * e;
      cam.y = m.from.y + (to.y - m.from.y) * e;
      cam.zoom = m.from.zoom + (m.zoom - m.from.zoom) * e;
      if (k >= 1 && !this.settling) this.move = null;
    } else if (this.follow) {
      const p = this.screenOf(this.follow.at);
      const k = this.follow.lag > 0 ? 1 - Math.exp(-dt / (this.follow.lag / 3)) : 1;
      cam.x += (p.x + this.follow.dx - cam.x) * k;
      cam.y += (p.y + this.follow.dy - cam.y) * k;
    }
    cam.x += this.drift.x * dt;
    cam.y += this.drift.y * dt;
    cam.zoom = Math.max(0.25, cam.zoom + this.drift.zoom * dt);
    return cam;
  }

  // ---------- the world ----------
  /** Take the hero (and the camera's world) to a region, standing on a tile. */
  go(region: string, at?: [number, number]): this {
    const sim = this.sim;
    if (sim.region !== region) sim.game.moveHero(sim.hero, region, 'start');
    if (at) sim.hero.placeAt(at);
    for (const id of Object.keys(SCENES)) sim.game.flags['scene:' + id] = 1;
    this.region.clearScene();
    return this;
  }

  /** Set story flags (Wren walks with the heroes once `wren_follows` is set). */
  flag(...names: string[]): this {
    for (const n of names) this.sim.setFlag(n);
    return this;
  }

  /** Time of day, 0..1 (0.5 noon, 0.75 dusk, 0 midnight), held there unless `speed` is given. */
  time(t: number, speed = 0): this {
    this.sim.setDay(t);
    this.sim.setDaySpeed(speed);
    return this;
  }

  /** Clear, rain or storm, at full strength at once. */
  weather(kind: WeatherKind, now = true): this {
    const w = this.sim.weather;
    w.forced = kind;
    if (now) {
      w.rain = kind === 'clear' ? 0 : kind === 'rain' ? 0.75 : 1;
      w.storm = kind === 'storm' ? 1 : 0;
      w.wind = kind === 'storm' ? 1 : 0.25;
    }
    return this;
  }

  /** How dark the night gets, 0..1 (1: as the game has it; a trailer's night can be kinder to the eye). */
  darkness(v: number): this {
    this.stage().lighting.setStrength(v);
    return this;
  }

  strike(dist: Strike['dist'] = 'near'): this {
    this.sim.weather.strikeNow(dist);
    return this;
  }

  /** The camera's hero out of the picture (a shot about others): unseen, unlit, and standing somewhere out of the way. */
  hideHero(at?: [number, number]): this {
    WorldRenderer.showPlayer = false;
    this.playerLight = false;
    this.hero.cheats.god = true;
    if (at) this.hero.placeAt(at);
    return this;
  }

  /** A campfire or a forge on a tile, as a hero would build it. */
  build(kind: StructureKind, at: [number, number]) {
    return this.region.build(kind, at[0], at[1]);
  }

  /** Every creature in the region gone (the shot brings its own). */
  clearEnemies(): this {
    this.region.enemies = [];
    for (const h of this.region.heroes()) h.target = null;
    return this;
  }

  /** A creature on a tile; `rise`: climbing out of the ground; `sx, sy`: a nudge within the tile (px). */
  spawn(kind: EnemyKind, at: [number, number], o: { rise?: boolean; sx?: number; sy?: number; face?: 1 | -1; asleep?: boolean } = {}): Enemy {
    const x = at[0] * T + T / 2 + (o.sx ?? 0);
    const y = at[1] * T + T / 2 + (o.sy ?? 0);
    const r = this.region;
    const e = r.spawnEnemy(kind, x, y, true);
    e.alive = true;
    e.respawnT = 0;
    if (o.rise) e.riseT = RISE_DUR;
    if (o.face) e.face = o.face;
    r.enemies.push(e);
    return e;
  }

  /** Dress a hero: class, look, level (its spells come with it), gear and talents. */
  dress(h: Hero, s: HeroSetup): Hero {
    if (s.cls && s.cls !== h.cls) {
      h.cls = s.cls;
      h.resetHero();
    }
    if (s.name) h.name = s.name;
    if (s.look) h.look = s.look;
    if (s.level && s.level > h.level) {
      h.level = s.level;
      h.bar = h.bar.map(() => null);
      for (const k of SPELL_ORDER) if (h.knows(k)) h.placeSpell(k);
    }
    if (s.talents) {
      h.talents = { ...s.talents };
      h.applyTalents();
      for (const k of SPELL_ORDER) if (h.knows(k)) h.placeSpell(k);
    }
    if (s.equip) {
      for (const [slot, id] of Object.entries(s.equip) as [Slot, ItemId | null][]) h.equip[slot] = id;
      h.applyGear();
    }
    h.hp = h.hpMax;
    h.mp = h.mpMax;
    if (s.at) h.placeAt(s.at);
    h.cheats.infiniteMana = true;
    h.cheats.god = !!s.god;
    if (s.god) this.stout.delete(h);
    else this.stout.add(h);
    // the hero the camera is on wears the look (and the name) on screen too
    if (h === this.hero && s.name) playAs(s.name);
    if (h === this.hero && s.look) (this.game.registry.get('setHdHero') as (id: HdHeroId) => void)?.(s.look);
    if (h === this.hero) this.sim.events.emit('bag', {});
    return h;
  }

  /** Another hero in the party, standing on a tile (a friend in co-op). */
  addHero(s: HeroSetup): Hero {
    const g = this.sim.game;
    const h = g.addHero('d' + ++this.heroN, s.name ?? 'Friend', this.sim.region, 'start');
    return this.dress(h, { ...s, cls: s.cls ?? 'warrior' });
  }

  /** Walk a hero to a tile (or a point), without the click ring. */
  walk(h: Hero, to: Spot): boolean {
    const w = this.world(to);
    return h.moveTo(w.x, w.y, false);
  }

  /** Let a hero fight on its own. */
  brain(h: Hero, b: Brain): this {
    this.brains.set(h, b);
    return this;
  }

  /** Play one of the story's scenes (its lines are hidden when clean; the voices still speak). */
  scene(id: string): this {
    delete this.sim.game.flags['scene:' + id];
    this.region.playScene(id);
    return this;
  }

  /** Someone speaks: their voice, as the dialog would play it. */
  say(voice: SoundId): this {
    this.stage().sfx.say(voice as never);
    return this;
  }

  private thinkAll(dt: number): void {
    for (const [h, b] of this.brains) if (!b.off && h.regionId) this.think(h, b, dt);
  }

  /** A hero's turn: find a foe, get into reach, and cast the first spell that's ready. */
  private think(h: Hero, b: Brain, dt: number): void {
    if (h.dead) return;
    const pool = (b.foes ? b.foes() : h.region.enemies).filter(e => e.alive && !e.hid && e.riseT <= 0);
    if (!h.target || !h.target.alive || !pool.includes(h.target)) {
      let best: Enemy | null = null;
      let bd = Infinity;
      for (const e of pool) {
        const d = Math.hypot(e.x - h.x, e.y - h.y);
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
      h.setTarget(best);
    }
    const tg = h.target;
    if (!tg) return;
    const d = Math.hypot(tg.x - h.x, tg.y - h.y);
    const reach = b.reach ?? (h.cls === 'archer' ? 170 : 30);
    b.repathT = (b.repathT ?? 0) - dt;
    // charge closes the gap at once
    if (h.cls === 'warrior' && d > 70 && b.spells.includes('charge') && !h.canDo('charge')) {
      h.castKey('charge');
      return;
    }
    if (d > reach) {
      if (b.repathT <= 0 || !h.path) {
        b.repathT = 0.3;
        h.moveTo(tg.x, tg.y, false);
      }
      if (d < reach + 12 && h.cls === 'archer') h.stopMoving();
      return;
    }
    if (h.path) h.stopMoving();
    b.waitT = (b.waitT ?? 0) - dt;
    if (b.waitT > 0) return;
    for (const k of b.spells) {
      if (k === 'charge') continue;
      if (!h.canDo(k) && h.castKey(k)) {
        b.waitT = GCD + 0.12 + this.rand() * 0.35;
        break;
      }
    }
  }

  /** Open one of the game's windows (for the shots that show the interface). */
  open(win: 'inventory' | 'crafting' | 'questLog' | 'talents' | 'spellbook', on = true): this {
    (this.game.registry.get(win) as { toggle(force?: boolean): void } | undefined)?.toggle(on);
    return this;
  }

  /**
   * The 2D view or one of the 3D ones (a 3D view looks where the director's camera holds, or at
   * the hero). `sameWalk`: the hero keeps the 2D view's walking pace (the 3D views walk at an even
   * pace over the ground), so a shot filmed in each view plays out the same.
   */
  view(mode: ViewMode, sameWalk = false): this {
    (this.game.registry.get('setView') as ((m: ViewMode) => void) | undefined)?.(mode);
    if (sameWalk) this.hero.walkFlat = false;
    return this;
  }

  // ---------- sound ----------
  /** Every sound the shot makes goes into the log, heard from the middle of the camera's view. */
  private tapSounds(): void {
    const { sfx, weather } = this.stage();
    const NEAR = 160;
    const FAR = 720;
    sfx.play = (id: SoundId, x?: number, y?: number) => {
      const def = SOUNDS[id];
      if (!def) return null;
      if (this.t - (this.lastAt.get(id) ?? -1) < (def.gap ?? 0.03)) return null;
      let gain = 1;
      let pan = 0;
      let rate = 1;
      if (x !== undefined && y !== undefined) {
        const c = this.gameCam();
        const zoom = this.cam?.zoom ?? 1;
        const dx = (isoX(x, y) - c.x) * zoom;
        const dy = (isoY(x, y) - c.y) * zoom;
        const d = Math.hypot(dx, dy);
        if (d >= FAR) return null;
        const k = d <= NEAR ? 1 : 1 - (d - NEAR) / (FAR - NEAR);
        gain = k * k;
        pan = Math.max(-1, Math.min(1, dx / 420)) * 0.7;
        rate = 1 + (Math.random() - 0.5) * 0.08;
      }
      this.lastAt.set(id, this.t);
      const take = Math.floor(Math.random() * (def.takes ?? 1));
      this.audio.push({ t: +this.t.toFixed(4), id, take, gain: +gain.toFixed(3), pan: +pan.toFixed(3), rate: +rate.toFixed(4) });
      return null;
    };
    const wa = (weather as unknown as { audio: WeatherAudio | null }).audio;
    if (wa) {
      wa.update = (rain: number, storm: number, indoor: boolean) => {
        const heavy = Math.max(storm, Math.min(1, Math.max(0, (rain - 0.7) / 0.3)));
        const loops = {
          rain: +(Math.min(1, rain * 1.5) * (1 - 0.45 * heavy)).toFixed(3),
          downpour: +(rain * heavy * 0.85).toFixed(3),
          wind: +Math.min(1, 0.1 * rain + 0.6 * storm).toFixed(3),
        };
        const key = JSON.stringify(loops) + indoor;
        if (key === this.lastLoops) return;
        this.lastLoops = key;
        this.audio.push({ t: +this.t.toFixed(4), loops, indoor });
      };
      wa.thunder = (id, delay, pan, take, gain = 1) => {
        const k = Math.max(0, Math.min((SOUNDS[id].takes ?? 1) - 1, take));
        this.audio.push({ t: +(this.t + Math.max(0, delay)).toFixed(4), id, take: k, gain, pan: Math.max(-0.8, Math.min(0.8, pan)), rate: +(0.94 + Math.random() * 0.1).toFixed(4) });
      };
    }
  }

  // ---------- stills ----------
  /** The logo, as a PNG data URL (for the title card). */
  logo(): string {
    const scene = this.game.scene.getScene(SceneKeys.Game);
    buildLogo(scene);
    const src = scene.textures.get(LOGO_KEY).getSourceImage() as HTMLCanvasElement;
    return src.toDataURL('image/png');
  }
}
