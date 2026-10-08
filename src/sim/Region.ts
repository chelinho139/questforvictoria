import { FLAT_OBJECTS } from '../data/regions/types';
import type { ObjectKind } from '../data/regions/types';
import { KINDS, RESPAWN } from '../data/enemies';
import type { EnemyDef, EnemyKind, CreatureSounds, CastDef } from '../data/enemies';
import { DIFFICULTIES } from '../data/difficulty';
import { T, Tile, rockCentre, RegionMap, parseLayout, isoX, isoSpeedFactor, faceToward } from './map';
import { findPath } from './pathfind';
import { propSolidTiles } from '../data/props';
import { REGIONS } from '../data/regions';
import type { RegionDef } from '../data/regions';
import { SCENES } from '../data/scenes';
import type { SceneStep } from '../data/scenes';
import { STRUCTURES } from '../data/crafting';
import type { StructureKind } from '../data/crafting';
import { NPCS } from '../data/npcs';
import type { NpcId } from '../data/npcs';
import { ITEMS, CHOP, MINE, lootFor } from '../data/items';
import { TREE_KINDS, TREE_CHARS } from '../data/trees';
import type { ItemId } from '../data/items';
import { Emitter } from './Emitter';
import type {
  Enemy,
  Fx,
  RegionEvents,
  FloaterClass,
  Drop,
  TreeState,
  RockState,
  Structure,
  NpcState,
  ObjectState,
  SceneLine,
  PropState,
  Hazard,
  Trap,
  WandererState,
  SoundId,
  Foe,
  Snare,
  Fallen,
} from './types';
import type { Game } from './Game';
import type { Hero } from './Hero';

/** Seconds a night creature takes to climb out of the ground. */
export const RISE_DUR = 0.9;
/** Seconds, on average, between a wandering creature's idle calls (unless its kind says otherwise: `idleEvery`). */
const IDLE_CALL = 18;
/** A creature dragged this far from its post gives up the chase and walks back. */
const LEASH = 380;
/** One that loses its foe (dead, gone, hidden) this far from its post walks back too. */
const STRAY = 150;
/** The walk home: how much faster than a stroll, and how long before it is simply there. */
const HOME_SPEED = 1.4;
const HOME_MAX = 8;
/** How high an ambusher drops from, and how fast it falls (px, px/s). */
const DROP_FROM = 70;
const DROP_SPEED = 240;
/** How long the dead who fell can still be sung up again (s), and how many raised walk at once. */
const FALLEN_KEEP = 90;
const RAISED_MAX = 6;
/** A creature's part in a fight, cleared when it walks home or comes back to life. */
const FIGHT_STATE: Partial<Enemy> = {
  casting: undefined,
  shieldT: undefined,
  shieldCd: undefined,
  hid: undefined,
  z: undefined,
  leap: undefined,
  leapCd: undefined,
  snareCd: undefined,
  hatchT: undefined,
  summonCd: undefined,
  blinkCd: undefined,
  fire: undefined,
  smotherT: undefined,
  lying: undefined,
  tollT: undefined,
  tollN: undefined,
};
/** What a creature says as it starts each kind of spell. */
const CAST_SAY: Record<CastDef['what'], string> = {
  fireball: 'casts Fireball…',
  heal: 'begins to wail…',
  raise: 'begins to sing…',
  web: 'spits web!',
};

interface Movable {
  x: number;
  y: number;
  face: 1 | -1;
  walk: number;
}

/** What a region keeps while nobody is in it: what was built and dropped there. */
export interface RegionMemory {
  structures: Structure[];
  drops: Drop[];
}

/**
 * One place in the world, live while somebody is in it: its map, its creatures and their
 * minds, trees, rocks, drops, buildings, people, objects, wanderers, rings of force, and the
 * scene playing there. Everyone standing in it sees what it emits through `events`.
 */
export class Region {
  readonly events = new Emitter<RegionEvents>();
  readonly def: RegionDef;
  readonly map: RegionMap;
  enemies: Enemy[] = [];
  trees: TreeState[] = [];
  rocks: RockState[] = [];
  /** Campfires and forges built here. */
  structures: Structure[] = [];
  /** Items lying on the ground (each owned by the hero who may pick it up, or by nobody). */
  drops: Drop[] = [];
  npcs: NpcState[] = [];
  /** Objects you can use here. */
  objects: ObjectState[] = [];
  /** Buildings and big props. */
  props: PropState[] = [];
  /** Rings of force spreading across the floor (the Bell-Ringer's tolls). */
  hazards: Hazard[] = [];
  /** Bear traps archers have set (one each): the first creature to step on one is caught. */
  traps: Trap[] = [];
  private nextTrap = 1;
  /** Snares goblin trappers have laid in the grass. */
  snares: Snare[] = [];
  private nextSnare = 1;
  /** The dead who fell here lately, for a song that raises them. */
  fallen: Fallen[] = [];
  /** Who walks this region's routes (the grey postman). */
  wanderers: WandererState[] = [];
  /** The scene playing here (data/scenes.ts), or null. Input and combat wait while it plays. */
  scene: {
    id: string;
    i: number;
    t: number;
    line: SceneLine | null;
    look: { x: number; y: number } | null;
  } | null = null;
  private sceneQueue: string[] = [];
  private storyT = 0;
  private wasNight = false;
  /** A night being held (RegionDef.hold): under way, and seconds to the next one out of the dark. */
  private holdOn = false;
  private holdT = 0;
  private nextEnemy = 1;
  private nextDrop = 1;
  /** Things that happen a moment later (a fireball landing). */
  private pending: { t: number; fn: () => void }[] = [];

  constructor(
    readonly game: Game,
    readonly id: string,
    memory?: RegionMemory
  ) {
    const def = REGIONS[id];
    if (!def) throw new Error(`no region '${id}'`);
    this.def = def;
    // the exits' tiles are the only walkable edge tiles
    const open: [number, number][] = [];
    for (const e of def.exits)
      for (let r = e.area[1]; r <= e.area[3]; r++)
        for (let c = e.area[0]; c <= e.area[2]; c++) open.push([c, r]);
    this.map = new RegionMap(parseLayout(def.layout, id), open);
    this.structures = (memory?.structures ?? []).filter(st => !st.fixed);
    this.drops = memory?.drops ?? [];
    for (const d of this.drops) this.nextDrop = Math.max(this.nextDrop, d.uid + 1);
    for (const st of this.structures)
      if (STRUCTURES[st.kind].solid) this.map.setBlocker(st.c, st.r, { x: st.x, y: st.y, r: 10 });
    this.setProps(
      (def.props ?? []).filter(p => this.game.check(p.when)).map(p => ({ kind: p.kind, c: p.at[0], r: p.at[1] }))
    );
    this.syncFixed();
    this.trees = this.buildTrees();
    this.rocks = this.buildRocks();
    this.syncNpcs();
    this.syncObjects();
    this.wasNight = this.isNight;
    this.enemies = this.spawns();
    this.wanderers = (def.wanderers ?? []).map(w => ({
      id: w.id,
      x: w.route[0][0] * T + T / 2,
      y: w.route[0][1] * T + T / 2,
      i: 1 % w.route.length,
      alpha: 0,
      goneT: 0,
      face: 1,
      walk: 0,
    }));
  }

  /** The props standing here (and the ground they cover). */
  setProps(list: PropState[]): void {
    for (const p of this.props) for (const [c, r] of propSolidTiles(p.kind, p.c, p.r)) this.map.clearPropSolid(c, r);
    this.props = list;
    for (const p of list) for (const [c, r] of propSolidTiles(p.kind, p.c, p.r)) this.map.setPropSolid(c, r);
  }

  /**
   * Props that go with the story leave as it moves on (the fallen willow once Kilnholt's saw
   * is through it, the mist once the last mark is read). They never come back.
   */
  private syncProps(): void {
    const defs = this.def.props ?? [];
    const keep = this.props.filter(p => {
      const d = defs.find(x => x.kind === p.kind && x.at[0] === p.c && x.at[1] === p.r);
      return !d?.when || this.game.check(d.when);
    });
    if (keep.length !== this.props.length) this.setProps(keep);
  }

  /** What to keep when the last hero leaves (the region's own fires come back as they were). */
  memory(): RegionMemory {
    return { structures: this.structures.filter(st => !st.fixed), drops: this.drops };
  }

  /** The heroes standing here. */
  heroes(): Hero[] {
    return this.game.heroes.filter(h => h.regionId === this.id);
  }

  /**
   * Night here (or the Blackthorn is deep enough, ring 3 and on, or the grave-mist thick
   * enough, that the dead walk anyway). From ring 2 the night comes earlier and goes later.
   */
  get isNight(): boolean {
    const ring = this.def.ring ?? 0;
    if (ring >= 3 || this.def.dusk) return true;
    const t = this.game.day.t;
    return ring >= 2 ? t >= 0.77 || t < 0.25 : t >= 0.8 || t < 0.23;
  }

  // ---------- what everyone here sees ----------
  floater(x: number, y: number, text: string, cls: FloaterClass = '', color?: string): void {
    this.events.emit('floater', { x, y, text, cls, color });
  }
  fx(f: Omit<Fx, 't' | 'onEnd'>): void {
    this.events.emit('fx', f);
  }
  /** A sound, heard from where it happened. */
  sound(id: SoundId, x: number, y: number): void {
    this.events.emit('sound', { id, x: Math.round(x), y: Math.round(y) });
  }
  /** A creature's sound, if it has one for this (data/enemies.ts). */
  private cry(e: Enemy, what: keyof CreatureSounds): void {
    const id = e.def.sounds[what];
    if (id) this.sound(id, e.x, e.y);
  }
  burst(
    x: number,
    y: number,
    n: number,
    col: string,
    spd: number,
    life: number,
    size = 3,
    g = 0
  ): void {
    this.events.emit('burst', { x, y, n, col, spd, life, size, g });
  }
  /** Run `fn` in `t` seconds (while the region is live). */
  after(t: number, fn: () => void): void {
    this.pending.push({ t, fn });
  }
  /** Tell everyone here. */
  logAll(text: string, cls: '' | 'c' | 'h' | 't' = ''): void {
    for (const h of this.heroes()) h.log(text, cls);
  }
  /** Someone says something out loud where they stand: shown over them, and in everyone's log. */
  say(who: string, text: string, x: number, y: number): void {
    this.events.emit('say', { who, text, x: Math.round(x), y: Math.round(y) });
    this.logAll(`${who}: “${text}”`);
  }

  /**
   * A call made from the bag (a Warden's whistle) by a hero: whatever here answers to it
   * (EnemyDef.answers) stops dead, and lets go of whoever it held. True if anything answered.
   */
  call(call: string, by: Hero): boolean {
    let any = false;
    for (const e of this.enemies) {
      const a = e.def.answers;
      if (!a || a.call !== call || !e.alive || e.hid || Math.hypot(e.x - by.x, e.y - by.y) > 600) continue;
      any = true;
      e.stunT = Math.max(e.stunT, a.stun[Math.min(e.phase, a.stun.length - 1)]);
      e.castT = -1;
      e.shieldT = 0;
      e.leap = undefined;
      e.z = 0;
      e.tele = false;
      this.floater(e.x, e.y - 14 * e.def.scale - 12, 'FROZEN', 'name', '#e8e4d8');
      if (a.say) this.say(e.n, a.say, e.x, e.y);
      if (a.free) for (const f of this.foes()) f.free(a.free);
    }
    return any;
  }

  // ---------- building the place ----------
  private buildRocks(): RockState[] {
    const out: RockState[] = [];
    this.map.grid.forEach((row, r) =>
      row.forEach((t, c) => {
        if (t === Tile.Rock)
          out.push({ c, r, ...rockCentre(c, r), hp: MINE.hits, brokenT: 0, shakeT: 0 });
      })
    );
    return out;
  }

  private buildTrees(): TreeState[] {
    const out: TreeState[] = [];
    this.map.grid.forEach((row, r) =>
      row.forEach((t, c) => {
        if (t !== Tile.Tree) return;
        const kind = TREE_CHARS[this.def.layout[r][c]] ?? 'oak';
        out.push({
          c,
          r,
          x: c * T + T / 2,
          y: r * T + T / 2,
          hp: TREE_KINDS[kind].hits ?? CHOP.hits,
          stumpT: 0,
          shakeT: 0,
          ...(kind !== 'oak' && { kind }),
        });
      })
    );
    return out;
  }

  /**
   * People come and go with the story and the night (Bess at the Keening Hollow only after
   * dark; Wren at the mill, then by the river). Someone listed twice stands at the first place
   * whose condition holds.
   */
  syncNpcs(): void {
    const where = new Map<NpcId, [number, number]>();
    for (const d of this.def.npcs) if (!where.has(d.id) && this.game.check(d.when, undefined, this)) where.set(d.id, d.at);
    for (const n of [...this.npcs]) {
      const at = where.get(n.id);
      const c = Math.floor(n.x / T);
      const r = Math.floor(n.y / T);
      if (at && at[0] === c && at[1] === r) continue;
      this.npcs = this.npcs.filter(x => x !== n);
      this.map.setBlocker(c, r, null);
    }
    for (const [id, at] of where) if (!this.npcs.some(n => n.id === id)) this.npcs.push(this.placeNpc(id, at));
  }

  /** Someone standing on a tile; each is solid, like a rock. */
  placeNpc(id: NpcId, [c, r]: [number, number]): NpcState {
    const x = c * T + T / 2;
    const y = r * T + T / 2;
    this.map.setBlocker(c, r, { x, y, r: 7 });
    return { id, x, y, face: -1 };
  }

  spawnEnemy(kind: EnemyKind, x: number, y: number, temp = false): Enemy {
    const k = KINDS[kind];
    const hp = this.maxHp(k);
    const e: Enemy = {
      id: this.nextEnemy++,
      kind,
      def: k,
      n: k.n,
      x,
      y,
      sx: x,
      sy: y,
      hp,
      hpMax: hp,
      aggro: false,
      wanderT: 0,
      wx: 0,
      wy: 0,
      atkT: k.per,
      tele: false,
      castT: -1,
      castTotal: 2.2,
      castCd: k.firstCast ?? 3,
      stunT: 0,
      sunderT: 0,
      alive: true,
      respawnT: 0,
      dieT: 0,
      flash: 0,
      face: 1,
      walk: 0,
      riseT: 0,
      crumbleT: -1,
      fleeT: 0,
      temp,
      phase: 0,
      slowT: 0,
      slowK: 0,
      rootT: 0,
      markT: 0,
      markBy: '',
      markK: 0,
      angerT: 0,
      homeT: 0,
    };
    // an ambusher waits unseen in the canopy; shields and snares start a little way off
    if (k.ambush) e.hid = true;
    if (k.shield) e.shieldCd = k.shield.every / 2;
    // night creatures placed during the day wait underground (staggered so they don't all rise at once)
    if (k.nightOnly && !temp && !this.isNight) {
      e.alive = false;
      e.respawnT = 0.5 + this.game.rng.next() * 4;
    }
    return e;
  }

  /** The creatures this region starts with (those whose condition holds). */
  spawns(): Enemy[] {
    return this.def.spawns
      .filter(sp => this.game.check(sp.when))
      .map(sp => {
        const e = this.spawnEnemy(sp.kind, sp.at[0] * T + T / 2, sp.at[1] * T + T / 2);
        if (sp.to) {
          e.lx = sp.to[0] * T + T / 2;
          e.ly = sp.to[1] * T + T / 2;
        }
        return e;
      });
  }

  // ---------- drops ----------
  /** An item pops out of (x, y) with a little hop and lands nearby; `owner` alone may pick it up ('' = anyone). */
  spawnDrop(x: number, y: number, id: ItemId, owner = '', n = 1): void {
    const rng = this.game.rng;
    const a = rng.next() * Math.PI * 2;
    const sp = 18 + rng.next() * 22;
    this.drops.push({
      uid: this.nextDrop++,
      owner,
      id,
      n,
      x,
      y,
      z: 4,
      vz: 70 + rng.next() * 30,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      age: 0,
    });
  }

  private updateDrops(dt: number): void {
    if (!this.drops.length) return;
    for (const d of this.drops) {
      d.age += dt;
      if (d.z > 0 || d.vz > 0) {
        d.vz -= 260 * dt;
        d.z = Math.max(0, d.z + d.vz * dt);
        if (!this.map.blocked(d.x + d.vx * dt, d.y + d.vy * dt, 3, 3)) {
          d.x += d.vx * dt;
          d.y += d.vy * dt;
        }
        if (d.z === 0) d.vz = d.vx = d.vy = 0;
      }
    }
    // walk over a landed item to pick it up; uncollected items fade after three minutes
    const heroes = this.heroes();
    const kept: Drop[] = [];
    for (const d of this.drops) {
      if (d.z === 0 && d.age > 0.45) {
        const h = heroes.find(
          x => !x.dead && (!d.owner || d.owner === x.id) && Math.hypot(d.x - x.x, d.y - x.y) < 20
        );
        if (h) {
          const left = h.addItem(d.id, d.n);
          const got = d.n - left;
          if (got > 0) {
            this.floater(h.x, h.y - 28, `+${got} ${ITEMS[d.id].name}`, 'name', ITEMS[d.id].col);
            h.log(`Picked up ${got > 1 ? got + ' × ' : ''}${ITEMS[d.id].name.toLowerCase()}.`);
            h.hear('pickup');
          } else if (d.age % 4 < dt) h.log('Your bag is full.', 'h');
          d.n = left;
        }
      }
      if (d.n > 0 && d.age < 180) kept.push(d);
    }
    this.drops = kept;
  }

  // ---------- building ----------
  build(kind: StructureKind, c: number, r: number): Structure {
    const x = c * T + T / 2;
    const y = r * T + T / 2;
    const def = STRUCTURES[kind];
    const s: Structure = { id: this.game.nextStructure++, kind, c, r, x, y, t: def.burn };
    this.structures.push(s);
    if (def.solid) this.map.setBlocker(c, r, { x, y, r: 10 });
    this.burst(x, y - 8, 12, kind === 'campfire' ? '#ffb03c' : '#a8aeb8', 70, 0.6, 2, -40);
    return s;
  }

  /** Campfires burn down and go out. */
  private updateStructures(dt: number): void {
    let gone = false;
    for (const s of this.structures) {
      if (s.t === Infinity) continue;
      s.t -= dt;
      if (s.t > 0) continue;
      gone = true;
      this.burst(s.x, s.y - 6, 10, '#8a8a8a', 30, 0.9, 2, -50);
      for (const h of this.heroes())
        if (Math.hypot(s.x - h.x, s.y - h.y) < 220) h.log('The campfire burns out.', 'h');
    }
    if (!gone) return;
    this.structures = this.structures.filter(s => s.t > 0);
    for (const h of this.heroes()) h.events.emit('bag', {});
  }

  /** The region's own fires come and go with the story (a camp's fire once it is lit). */
  private syncFixed(): void {
    (this.def.structures ?? []).forEach((d, i) => {
      // their ids are below zero, apart from anything built
      const id = -1 - i;
      const want = this.game.check(d.when, undefined, this);
      const have = this.structures.find(st => st.id === id);
      if (want && !have) {
        const [c, r] = d.at;
        const x = c * T + T / 2;
        const y = r * T + T / 2;
        this.structures.push({ id, kind: d.kind, c, r, x, y, t: Infinity, fixed: true });
        if (STRUCTURES[d.kind].solid) this.map.setBlocker(c, r, { x, y, r: 10 });
      } else if (!want && have) {
        this.structures = this.structures.filter(st => st !== have);
        if (STRUCTURES[d.kind].solid) this.map.setBlocker(have.c, have.r, null);
      }
    });
  }

  /**
   * A night being held (RegionDef.hold): from dusk, while its condition holds, the dead keep
   * coming out of the dark for the fires.
   */
  private updateHold(dt: number): void {
    const h = this.def.hold;
    if (!h || !this.isNight || !this.game.check(h.when, undefined, this)) return;
    if (!this.holdOn) {
      this.holdOn = true;
      this.holdT = 3;
    }
    this.holdT -= dt;
    if (this.holdT > 0) return;
    this.holdT = h.spawns.every;
    const sp = h.spawns;
    if (this.enemies.filter(e => e.temp && e.alive && e.kind === sp.kind).length >= sp.max) return;
    const [c, r] = sp.from[Math.floor(this.game.rng.next() * sp.from.length)];
    const e = this.spawnEnemy(sp.kind, c * T + T / 2, r * T + T / 2, true);
    if (e.def.nightOnly || e.def.dead) {
      e.riseT = RISE_DUR;
      this.cry(e, 'rise');
    }
    this.enemies.push(e);
  }

  /**
   * Dawn: a night held is won if enough of its fires still burn, lost otherwise (and its dead
   * go back to the earth); the region's own fires are tended by day and lit again.
   */
  private dawn(): void {
    const h = this.def.hold;
    if (h && this.holdOn) {
      this.holdOn = false;
      const lit = this.structures.filter(st => st.kind === h.fire && this.burning(st)).length;
      if (lit >= h.need) {
        this.game.setFlag(h.flag);
        this.logAll(h.won, 'c');
      } else this.logAll(h.lost, 'h');
      for (const e of this.enemies) if (e.temp && e.alive && e.kind === h.spawns.kind) this.crumble(e);
    }
    for (const st of this.structures) if (st.fixed) st.out = false;
  }

  private updateRocks(dt: number): void {
    for (const k of this.rocks) {
      if (k.shakeT > 0) k.shakeT = Math.max(0, k.shakeT - dt);
      if (k.brokenT <= 0) continue;
      k.brokenT = Math.max(0, k.brokenT - dt);
      if (k.brokenT > 0) continue;
      // grow back only when nobody is standing on the rubble
      this.map.setRockBroken(k.c, k.r, false);
      const inside =
        this.heroes().some(h => this.map.blocked(h.x, h.y, 9, 8)) ||
        this.enemies.some(
          e => e.alive && this.map.blocked(e.x, e.y, 6 * e.def.scale, 5 * e.def.scale)
        );
      if (inside) {
        this.map.setRockBroken(k.c, k.r, true);
        k.brokenT = 2;
      } else this.burst(k.x, k.y - 6, 8, '#a8aeb8', 40, 0.5, 2, -30);
    }
  }

  private updateTrees(dt: number): void {
    for (const t of this.trees) {
      if (t.shakeT > 0) t.shakeT = Math.max(0, t.shakeT - dt);
      if (t.stumpT > 0) {
        t.stumpT = Math.max(0, t.stumpT - dt);
        if (t.stumpT === 0) this.burst(t.x, t.y - 12, 10, '#62ae3e', 50, 0.6, 2, -40);
      }
    }
  }

  // ---------- objects you can use ----------
  /** Objects come and go with the story and the night: add those that should be here, remove the rest. */
  syncObjects(): void {
    const defs = this.def.objects ?? [];
    const flat = (k: ObjectKind) => FLAT_OBJECTS.has(k);
    for (const o of defs) {
      const want =
        this.game.check(o.when, undefined, this) &&
        !(o.once && this.game.flags[`used:${this.id}:${o.id}`]);
      const have = this.objects.find(x => x.id === o.id);
      if (want && !have) {
        const [c, r] = o.at;
        const x = c * T + T / 2;
        const y = r * T + T / 2;
        if (!flat(o.kind)) this.map.setBlocker(c, r, { x, y, r: 8 });
        this.objects.push({ id: o.id, kind: o.kind, name: o.name, c, r, x, y });
      } else if (!want && have) {
        this.objects = this.objects.filter(x => x !== have);
        if (!flat(have.kind)) this.map.setBlocker(have.c, have.r, null);
      }
    }
  }

  /** A hero uses an object they are standing at. */
  use(o: ObjectState, h: Hero): void {
    const def = (this.def.objects ?? []).find(x => x.id === o.id);
    if (!def) return;
    if (!this.game.check(def.need, h)) {
      h.log(def.needSay ?? 'Not now.', 't');
      return;
    }
    const short = (def.cost ?? []).find(([id, n]) => h.count(id) < n);
    if (short) {
      h.log(def.needSay ?? `You need ${short[1]} × ${ITEMS[short[0]].name.toLowerCase()}.`, 't');
      return;
    }
    for (const [id, n] of def.cost ?? []) h.removeItem(id, n);
    if (def.say) h.log(def.say, 't');
    if (def.once) {
      this.game.setFlag(`used:${this.id}:${o.id}`);
      this.objects = this.objects.filter(x => x !== o);
      if (!FLAT_OBJECTS.has(o.kind)) this.map.setBlocker(o.c, o.r, null);
      if (o.kind === 'thorn') this.burst(o.x, o.y - 6, 14, '#e09a48', 50, 0.8, 2, -50);
    }
    this.game.questEvent('interact', o.id, o.kind);
    this.game.applyEffect(def.then, h);
  }

  // ---------- the story as you play: night-only objects, scenes by place and time ----------
  /** A hero arrives: scenes that should play on arrival. */
  arrive(h: Hero): void {
    for (const on of this.def.onEnter ?? [])
      if (!this.game.flags['scene:' + on.scene] && this.game.check(on.when, h, this))
        this.playScene(on.scene);
  }

  private updateStory(dt: number): void {
    this.storyT -= dt;
    if (this.storyT > 0) return;
    this.storyT = 0.4;
    this.syncObjects();
    this.syncFixed();
    this.syncNpcs();
    this.syncProps();
    const heroes = this.heroes();
    for (const on of this.def.onEnter ?? [])
      if (!this.game.flags['scene:' + on.scene] && this.game.check(on.when, heroes[0], this))
        this.playScene(on.scene);
    for (const tr of this.def.triggers ?? []) {
      if (this.game.flags['scene:' + tr.scene]) continue;
      const inside = heroes.find(h => {
        const c = Math.floor(h.x / T);
        const r = Math.floor(h.y / T);
        return c >= tr.area[0] && c <= tr.area[2] && r >= tr.area[1] && r <= tr.area[3];
      });
      if (inside && this.game.check(tr.when, inside, this)) this.playScene(tr.scene);
    }
  }

  // ---------- wanderers (the grey postman) ----------
  private updateWanderers(dt: number): void {
    const defs = this.def.wanderers ?? [];
    const heroes = this.heroes();
    for (const w of this.wanderers) {
      const d = defs.find(x => x.id === w.id);
      if (!d) continue;
      const out = !this.game.check(d.when, undefined, this);
      if (w.goneT > 0) {
        w.goneT -= dt;
        w.alpha = 0;
        if (w.goneT <= 0) {
          // reappear further along the route, away from everyone
          let best = w.i;
          let bd = -1;
          d.route.forEach(([c, r], i) => {
            const near = Math.min(
              ...heroes.map(h => Math.hypot(c * T + T / 2 - h.x, r * T + T / 2 - h.y))
            );
            if (near > 200 && (bd < 0 || near < bd)) {
              bd = near;
              best = i;
            }
          });
          w.x = d.route[best][0] * T + T / 2;
          w.y = d.route[best][1] * T + T / 2;
          w.i = (best + 1) % d.route.length;
        }
        continue;
      }
      // the grey lantern: let anyone come close and it stops, as if turning to look, and goes out
      if (d.out && !out && w.alpha > 0.3 && heroes.some(h => Math.hypot(w.x - h.x, w.y - h.y) < d.out!.r)) {
        this.game.setFlag(d.out.flag);
        if (d.out.scene) this.playScene(d.out.scene);
        w.alpha = 0;
        w.goneT = 1;
        continue;
      }
      const near = heroes.find(h => Math.hypot(w.x - h.x, w.y - h.y) < 80);
      if (out || near) {
        w.alpha = Math.max(0, w.alpha - dt * 1.6);
        if (near && !out && near.wandererSaidT <= 0) {
          near.log(d.say, 't');
          near.wandererSaidT = 25;
        }
        if (w.alpha <= 0) w.goneT = out ? 1 : 9;
        continue;
      }
      w.alpha = Math.min(0.85, w.alpha + dt * 0.8);
      const [tc, tr] = d.route[w.i];
      const tx = tc * T + T / 2;
      const ty = tr * T + T / 2;
      const dd = Math.hypot(tx - w.x, ty - w.y);
      if (dd < 3) {
        w.i = (w.i + 1) % d.route.length;
        continue;
      }
      const sp = 22 * dt;
      w.x += ((tx - w.x) / dd) * sp;
      w.y += ((ty - w.y) / dd) * sp;
      w.walk += dt * 6;
      w.face = isoX(tx, ty) < isoX(w.x, w.y) ? -1 : 1;
    }
  }

  /** A hero clicks a wanderer: it turns its blank face to them, and that is all. */
  touchWanderer(id: string, h: Hero): void {
    const d = (this.def.wanderers ?? []).find(x => x.id === id);
    const w = this.wanderers.find(x => x.id === id);
    if (!d || !w || w.alpha <= 0) return;
    h.log(d.say, 't');
    h.wandererSaidT = 25;
    w.goneT = 0;
    w.alpha = Math.min(w.alpha, 0.5);
  }

  // ---------- hazards: rings of force (jump them) ----------
  private updateHazards(dt: number): void {
    if (!this.hazards.length) return;
    const heroes = this.heroes();
    for (const hz of this.hazards) {
      hz.r += hz.speed * dt;
      for (const h of heroes) {
        const d = Math.hypot(h.x - hz.x, h.y - hz.y);
        if (!hz.hit && !h.dead && !h.airborne && Math.abs(d - hz.r) < 9) {
          hz.hit = true;
          this.strike(h, hz.dmg, hz.what);
        }
      }
    }
    this.hazards = this.hazards.filter(hz => hz.r < hz.max);
  }

  private toll(e: Enemy, rings: number): void {
    for (const h of this.heroes()) {
      h.log('The bell tolls. Jump the ring of sound!', 'h');
      h.shake = 0.35;
    }
    for (let i = 0; i < rings; i++) {
      const delay = i * 0.55;
      const start = 14 - delay * 120;
      const max = 300;
      // a stroke of the bell for each ring
      if (i === 0) this.sound('bellToll', e.x, e.y);
      else this.after(delay, () => this.sound('bellToll', e.x, e.y));
      this.hazards.push({
        x: e.x,
        y: e.y,
        r: start,
        speed: 120,
        max,
        dmg: 22,
        hit: false,
        what: 'the toll of the bell',
      });
      this.fx({
        type: 'ring',
        x: e.x,
        y: e.y,
        r0: Math.max(0, start),
        r1: max,
        col: '#d8c070',
        lw: 4,
        dur: (max - start) / 120,
      });
    }
  }

  /** The Bell-Ringer: tolls rings of sound (phase 2 and 3) and calls the dead up out of the floor. */
  private bellRinger(e: Enemy, dt: number): boolean {
    if (!e.aggro || e.phase === 0) return false;
    e.tollT = (e.tollT ?? 1.5) - dt;
    if (e.tollT > 0) return false;
    e.tollN = (e.tollN ?? 0) + 1;
    e.tollT = e.phase === 1 ? 6 : 3.6;
    this.toll(e, e.phase === 1 ? 1 : 2);
    // every other toll, the dead answer
    if (e.phase === 1 ? e.tollN % 2 === 1 : e.tollN % 3 === 1) {
      const n = this.enemies.filter(o => o.temp && o.alive).length;
      for (let k = 0; k < Math.min(3, 6 - n); k++) {
        const a = this.game.rng.next() * Math.PI * 2;
        const x = e.x + Math.cos(a) * 90;
        const y = e.y + Math.sin(a) * 90;
        if (this.map.blocked(x, y, 12, 10)) continue;
        const sk = this.spawnEnemy('skeleton', x, y, true);
        sk.riseT = RISE_DUR;
        sk.aggro = true;
        this.enemies.push(sk);
        this.cry(sk, 'rise');
      }
      this.logAll('The dead climb up through the floorboards.', 'h');
    }
    // after a toll, out of breath: he stands for a moment
    e.stunT = e.phase === 2 ? 1.4 : 0.6;
    e.tele = false;
    return true;
  }

  /**
   * Sir Garrick, the Queen's Jailer: a disciplined swordsman. Two quick cuts, then a lunge,
   * given away by a step back (step aside). Below a third he throws his shield in the river and
   * fights faster. Returns true while a lunge has him.
   */
  private garrick(e: Enemy, dt: number, foe: Foe, d: number): boolean {
    if (!e.aggro) return false;
    if (e.phase >= 2 && !e.shieldGone) {
      e.shieldGone = true;
      e.shieldT = 0;
      this.burst(e.x + 20 * e.face, e.y - 20, 12, '#8a8f98', 90, 0.7, 3, -80);
      this.logAll('Sir Garrick throws his shield into the river. "I should have let her run."', 'h');
    }
    // faster, at the last
    if (e.shieldGone) e.atkT -= dt * 0.45;
    const L = e.lunge;
    if (L) {
      L.t += dt;
      if (L.t < L.wind) {
        // the step back: the tell
        this.moveEntity(e, -L.dx, -L.dy, 40, dt, 18, 15);
        return true;
      }
      if (L.t < L.wind + L.dur) {
        // the thrust: a long step forward, the point out in front
        this.moveEntity(e, L.dx, L.dy, 420, dt, 18, 15);
        if (!L.hit)
          for (const f of this.foes())
            if (!f.dead && Math.hypot(f.x - (e.x + L.dx * 24), f.y - (e.y + L.dy * 24)) < 34) {
              L.hit = true;
              this.strike(f, Math.round(e.def.atk * 2), "Sir Garrick's lunge");
            }
        return true;
      }
      e.lunge = undefined;
      e.tele = false;
      e.atkT = e.def.per;
      return true;
    }
    // after two cuts, the third is a lunge
    if ((e.cuts ?? 0) >= 2 && d < e.def.range + 60 && e.atkT <= 0.4 && e.castT <= 0) {
      e.cuts = 0;
      const dd = d || 1;
      e.lunge = { t: 0, wind: 0.6, dur: 0.22, dx: (foe.x - e.x) / dd, dy: (foe.y - e.y) / dd, hit: false };
      e.face = faceToward(e.x, e.y, foe.x, foe.y, e.face);
      e.tele = true;
      foe.log('Sir Garrick steps back, sword drawn back to lunge!', 'h');
      return true;
    }
    return false;
  }

  // ---------- scenes ----------
  /** Play a scene now (or after the one playing). Each scene plays once per game. */
  playScene(id: string): void {
    if (!SCENES[id] || this.game.flags['scene:' + id]) return;
    if (this.scene) {
      if (!this.sceneQueue.includes(id) && this.scene.id !== id) this.sceneQueue.push(id);
      return;
    }
    this.game.setFlag('scene:' + id);
    for (const h of this.heroes()) {
      h.stopMoving();
      h.chopTree = null;
      h.mineRock = null;
    }
    this.scene = { id, i: 0, t: 0, line: null, look: null };
    this.events.emit('scene', {});
  }

  /** Click / Space / Enter during a scene: the next line. */
  sceneNext(): void {
    const sc = this.scene;
    if (!sc || !sc.line) return;
    sc.line = null;
    sc.i++;
    sc.t = 0;
    this.events.emit('scene', {});
  }

  /** Cut a scene short (a save was loaded over it). */
  clearScene(): void {
    this.scene = null;
    this.sceneQueue = [];
    this.events.emit('scene', {});
  }

  private updateScene(dt: number): void {
    const sc = this.scene;
    if (!sc) return;
    const steps = SCENES[sc.id].steps;
    // run instant steps; stop at one that waits
    for (let guard = 0; guard < 64; guard++) {
      const st: SceneStep | undefined = steps[sc.i];
      if (!st) {
        this.scene = null;
        this.events.emit('scene', {});
        const next = this.sceneQueue.shift();
        if (next) this.playScene(next);
        return;
      }
      if ('say' in st) {
        if (!sc.line) {
          const who = st.who ? (st.who in NPCS ? NPCS[st.who as NpcId].name : st.who) : '';
          sc.line = { who, text: st.say, voice: st.voice };
          this.events.emit('scene', {});
        }
        return;
      }
      if ('wait' in st || 'fade' in st) {
        const dur = 'wait' in st ? st.wait : (st.s ?? 0.5);
        if (sc.t === 0 && 'fade' in st) this.events.emit('sceneFade', { dir: st.fade, s: dur });
        sc.t += dt;
        if (sc.t < dur) return;
        sc.t = 0;
        sc.i++;
        continue;
      }
      if ('look' in st)
        sc.look =
          st.look === 'player' ? null : { x: st.look[0] * T + T / 2, y: st.look[1] * T + T / 2 };
      else if ('banner' in st) for (const h of this.heroes()) h.banner(st.banner, 'cool');
      else if ('effect' in st) this.game.applyEffect(st.effect, this.heroes()[0]);
      sc.i++;
      this.events.emit('scene', {});
    }
  }

  // ---------- creatures ----------
  /**
   * A hero hits a creature (or `from`, a companion, does, for that hero): damage, phases, death
   * and loot. Returns true when it died of it.
   */
  hurtEnemy(e: Enemy, v: number, cls: FloaterClass, by: Hero, from: Foe = by): boolean {
    if (!e.alive) return false;
    if (e.homeT > 0) {
      this.evade(e, cls);
      return false;
    }
    // knocked out of the canopy before it could drop
    if (e.hid) this.reveal(e, from, DROP_FROM / 2);
    // shields up: a blow from in front mostly glances off (a bleed gets round it)
    const sh = e.def.shield;
    if (sh && cls !== 'dot' && (e.shieldT ?? 0) > 0 && e.stunT <= 0 && this.inFront(e, from)) {
      v = Math.max(1, Math.round(v * sh.cut));
      this.floater(e.x + 10, e.y - 14 * e.def.scale - 8, 'BLOCKED', 'name', '#c4cedc');
    }
    e.hp = Math.max(0, e.hp - v);
    const boss = e.def.boss;
    if (boss?.phases && e.hp > 0) {
      const phase = boss.phases.filter(f => e.hp / e.hpMax <= f).length;
      if (phase > e.phase) {
        e.phase = phase;
        this.events.emit('bossPhase', { kind: e.kind, phase });
        if (e.def.climbs?.phases.includes(phase)) this.climb(e);
      }
    }
    e.flash = 0.08;
    // passive creatures bolt; eggs and lures never fight; everything else fights back, and stays
    // angry a while however far away the hit came from (an archer can't shoot a slime from out
    // of its sight for free)
    if (e.def.behavior === 'passive') e.fleeT = 3;
    else if (e.def.behavior === 'inert') e.hatchT ??= e.def.hatch?.t;
    else if (!e.def.lure) {
      const was = e.aggro;
      e.aggro = true;
      e.foe ??= from.id;
      // Pell's horn: what you strike stays angry at you longer
      e.angerT = 10 + (from === by ? by.gear.anger : 0);
      if (!was) this.howl(e, from);
    }
    if (e.def.hitSay && Math.random() < 0.6)
      this.floater(e.x + 12, e.y - 14 * e.def.scale - 8, e.def.hitSay, 'name', '#f4f1e6');
    this.floater(e.x, e.y - 14 * e.def.scale, String(v), cls);
    this.burst(
      e.x,
      e.y - 8,
      cls === 'crit' ? 10 : 4,
      cls === 'crit' ? '#f2c14e' : '#fff',
      90,
      0.35,
      2,
      120
    );
    if (e.hp > 0) {
      // a bleed's ticks are quiet; a blow makes it cry out
      if (cls !== 'dot') this.cry(e, 'hurt');
      if (e.def.lure && cls !== 'dot') this.blink(e);
      return false;
    }
    this.cry(e, 'die');
    e.alive = false;
    e.dieT = 1;
    e.respawnT = RESPAWN * (1 + this.game.rng.next() / 2);
    e.castT = -1;
    e.foe = undefined;
    e.lying = false;
    e.leap = undefined;
    e.z = 0;
    for (const h of this.heroes()) if (h.target === e) h.target = null;
    this.burst(e.x, e.y - 8, 14, '#f2c14e', 70, 0.7, 3, 60);
    // the dead can be sung up again where they fell; a mount falls and its rider fights on
    if (e.def.dead && !e.def.boss) this.fallen.push({ kind: e.kind, x: e.x, y: e.y, t: 0 });
    if (e.def.rider) this.dismount(e, e.def.rider, from);
    if (boss) {
      this.game.setFlag(boss.flag);
      for (const h of this.heroes()) h.banner(`${e.n.toUpperCase()} DEFEATED`, 'cool');
      this.hazards = [];
      // its summons fall with it
      for (const o of this.enemies) if (o.temp && o.alive && o !== e) this.crumble(o);
      this.game.applyEffect(boss.onDeath, by);
    }
    this.game.questEvent('kill', e.kind);
    const rng = this.game.rng;
    for (const [id, lo, hi, chance = 1] of e.def.loot ?? []) {
      if (rng.next() >= chance) continue;
      const n = lo + Math.floor(rng.next() * (hi - lo + 1));
      // personal loot is something the killer's class can use (a sword drops as a bow for an archer)
      for (let k = 0; k < n; k++) this.spawnDrop(e.x, e.y, lootFor(id, by.cls), by.id);
    }
    return true;
  }

  /** Move along unit direction (dx,dy). `spd` is screen pixels per second, see isoSpeedFactor. */
  moveEntity(
    e: Movable,
    dx: number,
    dy: number,
    spd: number,
    dt: number,
    hw: number,
    hh: number
  ): void {
    const v = spd * isoSpeedFactor(dx, dy) * dt;
    const nx = e.x + dx * v;
    const ny = e.y + dy * v;
    if (!this.map.blocked(nx, e.y, hw, hh)) e.x = nx;
    if (!this.map.blocked(e.x, ny, hw, hh)) e.y = ny;
    e.face = faceToward(0, 0, dx, dy, e.face);
    e.walk += dt * 10;
  }

  /** Bring a dead enemy back at its post (night creatures climb out of the ground). */
  private respawn(e: Enemy): void {
    const { id, lx, ly } = e;
    Object.assign(e, FIGHT_STATE, this.spawnEnemy(e.kind, e.sx, e.sy), { id, lx, ly });
    if (e.def.nightOnly) {
      e.riseT = RISE_DUR;
      this.burst(e.x, e.y + 2, 12, '#6b4a2b', 50, 0.6, 3, -30);
      this.cry(e, 'rise');
    }
  }

  /** Dawn: a night creature falls apart and goes back underground. No gold, no kill. */
  crumble(e: Enemy): void {
    e.alive = false;
    e.dieT = 1;
    e.aggro = false;
    e.foe = undefined;
    e.castT = -1;
    e.crumbleT = -1;
    e.respawnT = 0.5 + this.game.rng.next() * 4;
    this.cry(e, 'die');
    for (const h of this.heroes())
      if (h.target === e) {
        h.target = null;
        h.seqI = 0;
      }
    this.burst(e.x, e.y - 8, 16, '#e8e4d8', 60, 0.8, 2, 80);
  }

  /** A blow (or a bleed) on a creature walking home doesn't land. */
  evade(e: Enemy, cls: FloaterClass): void {
    if (cls !== 'dot') this.floater(e.x, e.y - 14 * e.def.scale, 'EVADE', 'name', '#f4f1e6');
  }

  /** Give up the fight and head back to the post: untouchable, healing on the way. */
  private sendHome(e: Enemy): void {
    e.aggro = false;
    e.foe = undefined;
    e.tele = false;
    e.castT = -1;
    e.angerT = 0;
    e.homeT = HOME_MAX;
    const s = e.def.scale;
    e.homePath = findPath(this.map, e, { x: e.sx, y: e.sy }, 6 * s, 5 * s) ?? [{ x: e.sx, y: e.sy }];
  }

  /** The walk home. Once there (or once it has taken too long) it is whole and fresh again. */
  private goHome(e: Enemy, dt: number): void {
    const k = e.def;
    e.homeT -= dt;
    e.hp = Math.min(e.hpMax, e.hp + (e.hpMax * dt) / 2);
    const path = (e.homePath ??= [{ x: e.sx, y: e.sy }]);
    let budget = dt;
    while (budget > 0 && path.length) {
      const w = path[0];
      const dx = w.x - e.x;
      const dy = w.y - e.y;
      const d = Math.hypot(dx, dy);
      const v = k.spd * HOME_SPEED * isoSpeedFactor(dx / (d || 1), dy / (d || 1)) * budget;
      if (v < d) {
        this.moveEntity(e, dx / d, dy / d, k.spd * HOME_SPEED, budget, 6 * k.scale, 5 * k.scale);
        break;
      }
      // reach the bend, then spend what's left on the next leg
      e.x = w.x;
      e.y = w.y;
      budget *= 1 - d / v;
      path.shift();
    }
    if (path.length && e.homeT > 0) return;
    if (path.length) {
      // stuck on the way: it is simply back
      this.burst(e.x, e.y - 8, 8, '#b8956a', 50, 0.5, 2, -20);
      e.x = e.sx;
      e.y = e.sy;
    }
    Object.assign(e, { homeT: 0, homePath: undefined, hp: e.hpMax, atkT: k.per, castCd: k.firstCast ?? 3, wanderT: 1.5, walk: 0 });
    Object.assign(e, { stunT: 0, rootT: 0, slowT: 0, sunderT: 0, markT: 0 }, FIGHT_STATE);
    if (k.boss) Object.assign(e, { phase: 0, tollT: undefined, tollN: 0 });
  }

  /** Amble around home, idling about half the time. */
  private wander(e: Enemy, dt: number, hw: number, hh: number, speedK: number): void {
    const rng = this.game.rng;
    e.tele = false;
    e.wanderT -= dt;
    if (e.wanderT <= 0) {
      e.wanderT = 1 + rng.next() * 2.5;
      if (rng.next() < 0.5 || Math.hypot(e.x - e.sx, e.y - e.sy) > 90) {
        const a = Math.atan2(e.sy - e.y, e.sx - e.x) + (rng.next() - 0.5) * 2;
        e.wx = Math.cos(a);
        e.wy = Math.sin(a);
      } else {
        e.wx = 0;
        e.wy = 0;
      }
    }
    if (e.wx || e.wy) this.moveEntity(e, e.wx, e.wy, e.def.spd * speedK, dt, hw, hh);
    else e.walk = 0;
    // a moo, a blorp, about every IDLE_CALL seconds (only for the ear: the game's dice stay out of it)
    if (Math.random() < dt / (e.def.idleEvery ?? IDLE_CALL)) this.cry(e, 'idle');
  }

  /** Set a bear trap at a hero's feet (their old one, if any, is taken up). */
  setTrap(h: Hero, hold: number): void {
    this.traps = this.traps.filter(t => t.owner !== h.id);
    this.traps.push({ id: this.nextTrap++, x: h.x, y: h.y, owner: h.id, t: 60, hold });
  }

  /**
   * Traps spring on the first creature to step on them (or the archer's duel opponent);
   * unsprung ones rust away after a minute.
   */
  private updateTraps(dt: number): void {
    if (!this.traps.length) return;
    for (const tr of this.traps) {
      tr.t -= dt;
      const owner = this.heroes().find(h => h.id === tr.owner);
      const rival = owner?.rival;
      const e =
        this.enemies.find(
          x => x.alive && x.riseT <= 0 && Math.hypot(x.x - tr.x, x.y - tr.y) < 12 * x.def.scale
        ) ?? (rival && rival.alive && Math.hypot(rival.x - tr.x, rival.y - tr.y) < 12 ? rival : undefined);
      if (!e) continue;
      tr.t = 0;
      this.fx({ type: 'ring', x: tr.x, y: tr.y, r0: 4, r1: 22, col: '#c8a05a', lw: 3, dur: 0.35 });
      this.sound('trapSnap', tr.x, tr.y);
      this.burst(tr.x, tr.y - 4, 10, '#c8a05a', 80, 0.4, 2, 80);
      // a hero caught is snared (and says so); a creature is held fast where it stands
      if (e === rival) rival.hero.hold(tr.hold, 'snare');
      else {
        e.rootT = Math.max(e.rootT, tr.hold);
        this.floater(e.x + 10, e.y - 14 * e.def.scale - 8, 'CAUGHT', 'name', '#c8a05a');
      }
      if (owner) owner.dmgEnemy(e, 8, '');
    }
    this.traps = this.traps.filter(t => t.t > 0);
  }

  /**
   * Who a creature is after: the one it fought last, or the nearest one up and about it can
   * see (a camouflaged archer is nowhere to be seen).
   */
  private foeOf(e: Enemy, foes: Foe[]): Foe | null {
    const kept = e.foe ? foes.find(h => h.id === e.foe && !h.dead && h.hiddenT <= 0) : undefined;
    if (kept) return kept;
    if (e.foe) e.foe = undefined;
    let best: Foe | null = null;
    let bd = Infinity;
    for (const h of foes) {
      if (h.dead || h.hiddenT > 0) continue;
      const d = Math.hypot(h.x - e.x, h.y - e.y);
      if (d < bd) {
        bd = d;
        best = h;
      }
    }
    return best;
  }

  /** Everyone a creature here could fight: the heroes, and the companions walking with them. */
  foes(): Foe[] {
    return [...this.heroes(), ...this.game.companionsIn(this.id)];
  }

  /** A creature's blow (a hit, a bolt, a leap, a fireball, the toll) lands: as hard as the game's difficulty makes it. */
  private strike(f: Foe, v: number, src: string): void {
    f.hurt(v * DIFFICULTIES[this.game.difficulty].dmg, src);
  }

  /** A creature of this kind's health at the game's difficulty (cows and deer are as they are). */
  private maxHp(k: EnemyDef): number {
    return k.behavior === 'passive' ? k.hp : Math.round(k.hp * DIFFICULTIES[this.game.difficulty].hp);
  }

  /** The difficulty changed: every creature here takes its new health, as hurt as it was. */
  rescaleEnemies(): void {
    for (const e of this.enemies) {
      const max = this.maxHp(e.def);
      if (max === e.hpMax) continue;
      if (e.hp > 0) e.hp = Math.max(1, Math.round((e.hp * max) / e.hpMax));
      e.hpMax = max;
    }
  }

  /** Whether `f` stands in front of a creature (on the side it faces). */
  inFront(e: Enemy, f: { x: number; y: number }): boolean {
    return faceToward(e.x, e.y, f.x, f.y, e.face) === e.face;
  }

  /**
   * Back up into the canopy (the Brood Mother, hurt): gone from sight, to wait somewhere else
   * near its post until someone walks under it again.
   */
  climb(e: Enemy): void {
    const r = e.def.climbs?.r ?? 120;
    this.burst(e.x, e.y - 20, 12, '#3a4a2a', 70, 0.6, 2, -160);
    for (let i = 0; i < 12; i++) {
      const rng = this.game.rng;
      const a = rng.next() * Math.PI * 2;
      const x = e.sx + Math.cos(a) * r * (0.4 + 0.6 * rng.next());
      const y = e.sy + Math.sin(a) * r * (0.4 + 0.6 * rng.next());
      if (Math.hypot(x - e.x, y - e.y) < r * 0.5 || this.map.blocked(x, y, 6, 5)) continue;
      e.x = x;
      e.y = y;
      break;
    }
    Object.assign(e, { hid: true, z: 0, aggro: false, foe: undefined, castT: -1, leap: undefined, tele: false });
    for (const h of this.heroes()) h.log(`${e.n} climbs back up into the dark.`, 'h');
  }

  /** An ambusher drops out of the canopy onto `f` (from `z` px up). */
  reveal(e: Enemy, f: Foe | undefined, z = DROP_FROM): void {
    e.hid = false;
    e.z = z;
    e.aggro = true;
    if (f) e.foe = f.id;
    e.angerT = Math.max(e.angerT, 6);
    this.cry(e, 'notice');
    this.burst(e.x, e.y - z, 10, '#3a4a2a', 60, 0.6, 2, 120);
    for (const c of this.game.companionsIn(this.id)) c.bark('ambush');
  }

  /** It noticed `f` (or was hit by them): every creature that howls within reach comes too. */
  private howl(e: Enemy, f: Foe): void {
    const hw = e.def.howl;
    if (!hw) return;
    for (const o of this.enemies) {
      if (o === e || !o.alive || o.aggro || o.hid || !o.def.howl || o.homeT > 0) continue;
      if (Math.hypot(o.x - e.x, o.y - e.y) > hw.r) continue;
      o.aggro = true;
      o.foe = f.id;
    }
  }

  /** A lure struck: it blinks further along toward where it is going (or anywhere, once there). */
  private blink(e: Enemy): void {
    if ((e.blinkCd ?? 0) > 0) return;
    const rng = this.game.rng;
    const gx = e.lx ?? e.sx;
    const gy = e.ly ?? e.sy;
    const d = Math.hypot(gx - e.x, gy - e.y);
    const a = d > 40 ? Math.atan2(gy - e.y, gx - e.x) + (rng.next() - 0.5) * 0.8 : rng.next() * Math.PI * 2;
    for (const r of [90, 60, 30]) {
      const x = e.x + Math.cos(a) * r;
      const y = e.y + Math.sin(a) * r;
      if (this.map.blocked(x, y, 6, 5)) continue;
      this.burst(e.x, e.y - 10, 10, '#cfe8ff', 60, 0.5, 2, -20);
      e.x = x;
      e.y = y;
      e.blinkCd = 1.2;
      return;
    }
  }

  /** A mount falls: its rider fights on, on foot, where it fell. */
  private dismount(e: Enemy, kind: EnemyKind, f: Foe): void {
    const x = e.x;
    const y = e.y;
    this.after(0, () => {
      const r = this.spawnEnemy(kind, x, y, true);
      r.aggro = true;
      r.foe = f.id;
      r.angerT = 10;
      r.atkT = r.def.per;
      this.enemies.push(r);
      this.floater(x, y - 14 * r.def.scale - 8, 'ON FOOT', 'name', '#f4f1e6');
    });
  }

  /** A fire that is still burning (a campfire, a kiln). */
  burning(s: Structure): boolean {
    return !!STRUCTURES[s.kind].fire && !s.out && s.t > 0;
  }

  /** A fire goes out: a smothered kiln stays cold; a campfire is gone. */
  putOut(s: Structure): void {
    s.out = true;
    s.smother = 0;
    if (!s.fixed) {
      this.structures = this.structures.filter(x => x !== s);
      for (const h of this.heroes()) h.events.emit('bag', {});
    }
    this.burst(s.x, s.y - 8, 16, '#6a6a6a', 30, 1.2, 3, -40);
    this.sound('fireOut', s.x, s.y);
    this.logAll(`The ${STRUCTURES[s.kind].name.toLowerCase()} goes out.`, 'h');
  }

  /**
   * A smotherer goes for the nearest fire still burning and lies on it until it is out. True
   * while it is busy with one; with no fire left it fights like anything else.
   */
  private smother(e: Enemy, dt: number): boolean {
    const t = e.def.smother!.t;
    let s = e.fire !== undefined ? this.structures.find(x => x.id === e.fire && this.burning(x)) : undefined;
    if (!s) {
      e.lying = false;
      e.smotherT = 0;
      let bd = 900;
      for (const x of this.structures) {
        const d = Math.hypot(x.x - e.x, x.y - e.y);
        if (this.burning(x) && d < bd) {
          bd = d;
          s = x;
        }
      }
      e.fire = s?.id;
    }
    if (!s) return false;
    e.tele = false;
    const d = Math.hypot(s.x - e.x, s.y - e.y);
    if (!e.lying && d > 14) {
      const k = e.def;
      this.moveEntity(e, (s.x - e.x) / d, (s.y - e.y) / d, k.spd * (e.slowT > 0 ? 1 - e.slowK : 1), dt, 6 * k.scale, 5 * k.scale);
      return true;
    }
    if (!e.lying) {
      e.lying = true;
      this.burst(s.x, s.y - 6, 10, '#2a2a2a', 40, 0.8, 3, -30);
    }
    e.walk = 0;
    e.smotherT = (e.smotherT ?? 0) + dt;
    s.smother = Math.max(s.smother ?? 0, Math.min(1, e.smotherT / t));
    if (e.smotherT >= t) {
      this.putOut(s);
      e.lying = false;
      e.fire = undefined;
      e.smotherT = 0;
    }
    return true;
  }

  /** An egg: a hero near wakes it, and when its time is up it hatches. */
  private incubate(e: Enemy, dt: number, foes: Foe[]): void {
    e.tele = false;
    e.walk = 0;
    const h = e.def.hatch;
    if (!h) return;
    if (e.hatchT === undefined) {
      if (foes.some(f => !f.dead && Math.hypot(f.x - e.x, f.y - e.y) < e.def.aggro)) e.hatchT = h.t;
      return;
    }
    e.hatchT -= dt;
    if (e.hatchT > 0) return;
    // it splits open: no kill, no reward, only what crawls out
    e.hatchT = undefined;
    e.alive = false;
    e.dieT = 0.6;
    e.respawnT = RESPAWN * (1 + this.game.rng.next() / 2);
    this.cry(e, 'die');
    this.burst(e.x, e.y - 6, 14, '#d8d0b0', 70, 0.6, 2, 120);
    for (const o of this.heroes()) if (o.target === e) o.target = null;
    const f = this.nearestFoe(e, foes, Infinity);
    for (let i = 0; i < h.n; i++) {
      const a = (i / h.n) * Math.PI * 2 + this.game.rng.next();
      const x = e.x + Math.cos(a) * 14;
      const y = e.y + Math.sin(a) * 14;
      const s = this.spawnEnemy(h.into, this.map.blocked(x, y, 6, 5) ? e.x : x, this.map.blocked(x, y, 6, 5) ? e.y : y, true);
      if (f) {
        s.aggro = true;
        s.foe = f.id;
      }
      this.enemies.push(s);
    }
    this.logAll(`${e.n} hatches!`, 'h');
  }

  /**
   * A lure: it never fights. While someone is near it drifts away toward where it is going,
   * always just ahead; left alone a long while, it drifts back to its post.
   */
  private drift(e: Enemy, dt: number, foes: Foe[]): void {
    const k = e.def;
    e.tele = false;
    e.aggro = false;
    e.blinkCd = Math.max(0, (e.blinkCd ?? 0) - dt);
    const r = k.lure!.r;
    const near = this.nearestFoe(e, foes, r);
    const hw = 6 * k.scale;
    const hh = 5 * k.scale;
    const gx = near ? (e.lx ?? e.sx) : e.sx;
    const gy = near ? (e.ly ?? e.sy) : e.sy;
    const d = Math.hypot(gx - e.x, gy - e.y);
    if (near && d > 12) this.moveEntity(e, (gx - e.x) / d, (gy - e.y) / d, k.spd, dt, hw, hh);
    else if (near && !e.opened && e.lx !== undefined) {
      // followed all the way to its hollow: the graves open
      e.opened = true;
      for (let i = 0; i < 2; i++) {
        const a = this.game.rng.next() * Math.PI * 2;
        const x = e.x + Math.cos(a) * 60;
        const y = e.y + Math.sin(a) * 60;
        if (this.map.blocked(x, y, 12, 10)) continue;
        const sk = this.spawnEnemy('skeleton', x, y, true);
        sk.riseT = RISE_DUR;
        sk.aggro = true;
        sk.foe = near.id;
        this.enemies.push(sk);
        this.cry(sk, 'rise');
      }
      near.log('The light stops over the graves, and the earth heaves.', 'h');
    } else if (!near && d > 12 && !this.nearestFoe(e, foes, r * 2)) this.moveEntity(e, (gx - e.x) / d, (gy - e.y) / d, k.spd * 0.4, dt, hw, hh);
    else e.walk += dt * 2;
  }

  /** The nearest foe up and about within `max`. */
  private nearestFoe(e: { x: number; y: number }, foes: Foe[], max: number): Foe | undefined {
    let best: Foe | undefined;
    let bd = max;
    for (const f of foes) {
      if (f.dead || f.hiddenT > 0) continue;
      const d = Math.hypot(f.x - e.x, f.y - e.y);
      if (d < bd) {
        bd = d;
        best = f;
      }
    }
    return best;
  }

  /** In the air on a leap (after the crouch): landing hits whoever is under it. */
  private leaping(e: Enemy, dt: number, foes: Foe[]): void {
    const L = e.leap!;
    const k = e.def;
    L.t += dt;
    if (L.t < L.wind) {
      e.tele = true;
      e.walk = 0;
      return;
    }
    e.tele = false;
    const p = Math.min(1, (L.t - L.wind) / L.dur);
    const nx = L.x0 + (L.x1 - L.x0) * p;
    const ny = L.y0 + (L.y1 - L.y0) * p;
    const blocked = this.map.blocked(nx, ny, 6 * k.scale, 5 * k.scale);
    if (!blocked) {
      e.x = nx;
      e.y = ny;
    }
    e.z = 4 * 42 * p * (1 - p);
    e.face = faceToward(L.x0, L.y0, L.x1, L.y1, e.face);
    if (p < 1 && !blocked) return;
    e.z = 0;
    e.leap = undefined;
    e.atkT = k.per * 0.5;
    this.burst(e.x, e.y + 2, 14, '#8a7a5a', 80, 0.5, 3, -30);
    this.events.emit('shake', { s: 0.2 });
    for (const f of foes) if (!f.dead && !f.airborne && Math.hypot(f.x - e.x, f.y - e.y) < 30) this.strike(f, k.leap!.dmg, `${e.n}'s leap`);
  }

  /** Whether a creature's spell has something to do right now (its foe `d` away). */
  private castFits(e: Enemy, c: CastDef, d: number): boolean {
    if ((c.from ?? 0) > e.phase) return false;
    if (c.what === 'fireball') return d < c.range && d > 50;
    if (c.what === 'web') return d < c.range;
    if (c.what === 'heal')
      return this.enemies.some(o => o.alive && o.def.dead && o.hp < o.hpMax * 0.8 && Math.hypot(o.x - e.x, o.y - e.y) < c.r);
    const raised = this.enemies.filter(o => o.temp && o.alive && o.def.dead).length;
    return raised < RAISED_MAX && this.fallen.some(f => Math.hypot(f.x - e.x, f.y - e.y) < c.r);
  }

  /** A spell completes (its foe `d` away): fire, healing, the dead getting up, web. */
  private castLands(e: Enemy, c: CastDef, foe: Foe, d: number): void {
    if (c.what === 'fireball') {
      const far = d >= c.range + 50;
      const tx = foe.x;
      const ty = foe.y;
      this.fx({ type: 'fireball', x0: e.x, y0: e.y - 12, x1: tx, y1: ty - 8, dur: 0.35 });
      this.sound('fireball', e.x, e.y);
      this.after(0.35, () => {
        this.sound('fireballHit', tx, ty);
        this.burst(tx, ty - 8, 12, '#a78bfa', 100, 0.4, 3, 60);
        this.fx({ type: 'ring', x: tx, y: ty - 8, r0: 6, r1: 34, col: '#a78bfa', dur: 0.3 });
        if (!far && foe.regionId === this.id) this.strike(foe, c.dmg, 'the fireball');
        else foe.log('The fireball misses.', 't');
      });
    } else if (c.what === 'heal') {
      this.fx({ type: 'ring', x: e.x, y: e.y - 6, r0: 8, r1: c.r, col: '#b8c4d0', lw: 2, dur: 0.6 });
      for (const o of this.enemies) {
        if (!o.alive || !o.def.dead || o.hp >= o.hpMax || Math.hypot(o.x - e.x, o.y - e.y) > c.r) continue;
        const v = Math.min(c.amt, o.hpMax - o.hp);
        o.hp += v;
        this.floater(o.x, o.y - 14 * o.def.scale, '+' + v, 'heal');
      }
    } else if (c.what === 'raise') {
      this.fx({ type: 'ring', x: e.x, y: e.y - 6, r0: 8, r1: c.r, col: '#8fd8a0', lw: 2, dur: 0.8 });
      let room = RAISED_MAX - this.enemies.filter(o => o.temp && o.alive && o.def.dead).length;
      this.fallen = this.fallen.filter(f => {
        if (room <= 0 || Math.hypot(f.x - e.x, f.y - e.y) > c.r) return true;
        room--;
        const s = this.spawnEnemy(f.kind, f.x, f.y, true);
        s.riseT = RISE_DUR;
        s.aggro = true;
        s.foe = foe.id;
        this.enemies.push(s);
        this.cry(s, 'rise');
        return false;
      });
      this.logAll('The fallen get up again.', 'h');
    } else if (c.by === 'roots') {
      // black roots burst up out of the ground under its foe: step off the spot and they miss
      const tx = foe.x;
      const ty = foe.y;
      this.burst(tx, ty, 10, '#2a2230', 60, 0.6, 3, -60);
      this.after(0.35, () => {
        this.burst(tx, ty - 4, 14, '#3a2e40', 70, 0.7, 3, -90);
        if (foe.regionId !== this.id || foe.dead || Math.hypot(foe.x - tx, foe.y - ty) > 30) return;
        foe.hold(c.hold, c.by);
        // and he goes for the one they hold, the way it happened to Marcian
        e.foe = foe.id;
        e.angerT = Math.max(e.angerT, 6);
        for (const cp of this.game.companionsIn(this.id)) cp.bark('roots', true);
      });
    } else if (c.cone) {
      // a spray: everyone in front of it, close enough
      this.fx({ type: 'whirl', x: e.x, y: e.y - 6, r: c.range, col: '#e8e8f0', dur: 0.4 });
      for (const f of this.foes())
        if (!f.dead && Math.hypot(f.x - e.x, f.y - e.y) < c.range && this.inFront(e, f)) f.hold(c.hold, c.by);
    } else {
      // a gob of web (or a net) at where its foe stands: step aside and it misses
      const tx = foe.x;
      const ty = foe.y;
      const t = Math.max(0.12, d / 380);
      this.fx({ type: 'arrow', x0: e.x, y0: e.y - 8, x1: tx, y1: ty - 6, col: '#e8e8f0', dur: t });
      this.after(t, () => {
        this.burst(tx, ty - 6, 8, '#e8e8f0', 50, 0.5, 2, 60);
        if (foe.regionId === this.id && !foe.dead && Math.hypot(foe.x - tx, foe.y - ty) < 26) foe.hold(c.hold, c.by);
      });
    }
  }

  /** A creature that shoots: a bolt flies to where its foe stands, and hits if they are still there. */
  private shoot(e: Enemy, foe: Foe): void {
    const m = e.def.missile!;
    const tx = foe.x;
    const ty = foe.y;
    const t = Math.max(0.08, Math.hypot(tx - e.x, ty - e.y) / m.speed);
    this.fx({ type: 'arrow', x0: e.x + e.face * 6, y0: e.y - 10, x1: tx, y1: ty - 6, col: m.col, dur: t });
    this.after(t, () => {
      if (foe.regionId !== this.id || foe.dead || Math.hypot(foe.x - tx, foe.y - ty) > 28) return;
      this.strike(foe, e.def.atk, `the ${e.n}'s ${m.slow ? 'bolt' : 'arrow'}`);
      if (m.slow) foe.slow(m.slow.t, m.slow.k);
    });
  }

  /** Lay a snare in the grass between a trapper and its foe (never right under their feet). */
  private laySnare(e: Enemy, foe: Foe, d: number): void {
    const sn = e.def.snares!;
    if (this.snares.filter(s => s.by === e.id).length >= sn.max) return;
    const k = Math.min(1, 50 / Math.max(1, d));
    const x = foe.x + (e.x - foe.x) * k;
    const y = foe.y + (e.y - foe.y) * k;
    if (this.map.blocked(x, y, 4, 4)) return;
    this.snares.push({ id: this.nextSnare++, x, y, hold: sn.hold, by: e.id, t: 40 });
  }

  /** Snares spring on whoever steps in them (jump them, or walk round). */
  private updateSnares(dt: number): void {
    if (!this.snares.length) return;
    const foes = this.foes();
    for (const s of this.snares) {
      s.t -= dt;
      const f = foes.find(o => !o.dead && !o.airborne && Math.hypot(o.x - s.x, o.y - s.y) < 11);
      if (!f) continue;
      s.t = 0;
      f.hold(s.hold, 'snare');
      this.sound('trapSnap', s.x, s.y);
      this.burst(s.x, s.y - 4, 8, '#a8905a', 60, 0.4, 2, 80);
    }
    this.snares = this.snares.filter(s => s.t > 0);
  }

  /** Call up help: `n` more of its kind around it, up to the most it may have at once. */
  private summonHelp(e: Enemy, foe: Foe): void {
    const sm = e.def.summon!;
    const kinds = Array.isArray(sm.kind) ? sm.kind : [sm.kind];
    const alive = this.enemies.filter(o => o.temp && o.alive && kinds.includes(o.kind)).length;
    const n = Math.min(sm.n, sm.max - alive);
    for (let i = 0; i < n; i++) {
      const rng = this.game.rng;
      let x: number;
      let y: number;
      if (sm.at) {
        const [c, r] = sm.at[i % sm.at.length];
        x = c * T + T / 2 + (rng.next() - 0.5) * 20;
        y = r * T + T / 2 + (rng.next() - 0.5) * 20;
      } else {
        const a = rng.next() * Math.PI * 2;
        x = e.x + Math.cos(a) * 70;
        y = e.y + Math.sin(a) * 70;
      }
      if (this.map.blocked(x, y, 12, 10)) continue;
      const s = this.spawnEnemy(kinds[i % kinds.length], x, y, true);
      s.aggro = true;
      s.foe = foe.id;
      s.hid = false;
      if (s.def.nightOnly || s.def.dead) {
        s.riseT = RISE_DUR;
        this.cry(s, 'rise');
      } else this.burst(x, y + 2, 10, '#6b5a3a', 60, 0.5, 3, -20);
      this.enemies.push(s);
    }
  }

  private updateEnemy(e: Enemy, dt: number, foes: Foe[]): void {
    e.flash = Math.max(0, e.flash - dt);
    if (e.sunderT > 0) e.sunderT = Math.max(0, e.sunderT - dt);
    const k = e.def;
    const rng = this.game.rng;
    const nightBound = !!k.nightOnly && !e.temp;
    if (!e.alive) {
      if (e.dieT > 0) e.dieT -= dt;
      if (e.temp || e.def.boss) return; // dev spawns are removed once faded; bosses stay dead
      if (nightBound && !this.isNight) return; // stay underground until dusk
      e.respawnT -= dt;
      if (e.respawnT <= 0) this.respawn(e);
      return;
    }
    if (nightBound && !this.isNight) {
      if (e.crumbleT < 0) e.crumbleT = rng.next() * 3;
      e.crumbleT -= dt;
      if (e.crumbleT <= 0) {
        this.crumble(e);
        return;
      }
    }
    if (e.riseT > 0) {
      e.riseT -= dt;
      return;
    }
    e.slowT = Math.max(0, e.slowT - dt);
    e.rootT = Math.max(0, e.rootT - dt);
    e.angerT = Math.max(0, e.angerT - dt);
    if (e.markT > 0) e.markT = Math.max(0, e.markT - dt);
    // waiting unseen in the canopy until someone walks under it
    if (e.hid) {
      const f = k.ambush && this.nearestFoe(e, foes, k.ambush.r);
      if (f) this.reveal(e, f);
      return;
    }
    // dropping out of the canopy: it lands on whoever is under it
    if ((e.z ?? 0) > 0 && !e.leap) {
      e.z = Math.max(0, (e.z ?? 0) - DROP_SPEED * dt);
      if (e.z === 0) {
        this.burst(e.x, e.y + 2, 10, '#5a4a3a', 60, 0.4, 3, -20);
        for (const f of foes) if (!f.dead && Math.hypot(f.x - e.x, f.y - e.y) < 26) this.strike(f, k.atk, `the falling ${e.n.toLowerCase()}`);
      }
      return;
    }
    const foe = this.foeOf(e, foes);
    if (!foe) {
      e.aggro = false;
      e.foe = undefined;
      e.castT = -1;
    }
    if (this.game.cheats.freezeEnemies) {
      e.tele = false;
      e.walk = 0;
      return;
    }
    if (e.homeT > 0) {
      this.goHome(e, dt);
      return;
    }
    if (k.behavior === 'inert') return this.incubate(e, dt, foes);
    if (k.lure) return this.drift(e, dt, foes);
    // out of the fight and far from home (its foe died, left or hid): back to the post
    if (!e.aggro && !e.lying && k.behavior !== 'passive' && Math.hypot(e.x - e.sx, e.y - e.sy) > STRAY) {
      this.sendHome(e);
      return;
    }
    const d = foe ? Math.hypot(foe.x - e.x, foe.y - e.y) : Infinity;
    const hw = 6 * k.scale;
    const hh = 5 * k.scale;
    if (e.stunT > 0) {
      e.stunT -= dt;
      // a stun drops a raised shield, and breaks a crouch before it becomes a leap
      e.shieldT = 0;
      e.lunge = undefined;
      if (e.leap && e.leap.t < e.leap.wind) e.leap = undefined;
      if (!e.leap) return;
    }
    if (e.leap) return this.leaping(e, dt, foes);
    if (k.behavior === 'passive') {
      if (e.fleeT > 0 && foe) {
        e.fleeT -= dt;
        const dd = d || 1;
        this.moveEntity(e, (e.x - foe.x) / dd, (e.y - foe.y) / dd, k.spd * 1.8, dt, hw, hh);
      } else {
        e.fleeT = Math.max(0, e.fleeT - dt);
        this.wander(e, dt, hw, hh, 0.5);
      }
      return;
    }
    // fires first: while one burns, people can wait
    if (k.smother && this.smother(e, dt)) return;
    if (e.castT > 0) {
      e.castT -= dt;
      const c = k.casts?.[e.casting ?? 0];
      if (e.castT <= 0 && c) {
        if (foe) this.castLands(e, c, foe, d);
        e.castCd = c.cd;
      }
      return;
    }
    if (!e.aggro && foe && k.behavior === 'hostile' && d < k.aggro) {
      e.aggro = true;
      e.foe = foe.id;
      this.cry(e, 'notice');
      // what it calls out (the Tower Guard to each other: "Search the road!")
      if (k.calls && this.game.rng.next() < (k.boss ? 1 : 0.5))
        this.say(e.n, k.calls[Math.floor(this.game.rng.next() * k.calls.length)], e.x, e.y);
      this.howl(e, foe);
    }
    if (e.kind === 'bellringer' && this.bellRinger(e, dt)) return;
    if (e.kind === 'garrick' && foe && this.garrick(e, dt, foe, d)) return;
    if (e.aggro && foe) {
      if (Math.hypot(e.x - e.sx, e.y - e.sy) > LEASH) {
        this.sendHome(e);
        foe.log(e.n + ' gives up and returns to its post.');
        return;
      }
      // neutral creatures give up once you're out of reach (unless you just hit them)
      if (k.behavior === 'neutral' && d > k.aggro && e.angerT <= 0) {
        e.aggro = false;
        e.foe = undefined;
        e.tele = false;
        foe.log(e.n + ' loses interest.');
        return;
      }
      // shields up now and then
      if (k.shield && !e.shieldGone) {
        if ((e.shieldT ?? 0) > 0) e.shieldT = Math.max(0, (e.shieldT ?? 0) - dt);
        else {
          e.shieldCd = (e.shieldCd ?? k.shield.every) - dt;
          if (e.shieldCd <= 0) {
            e.shieldT = k.shield.up;
            e.shieldCd = k.shield.every;
          }
        }
      }
      if (k.summon && e.phase >= (k.summon.from ?? 0)) {
        e.summonCd = (e.summonCd ?? 2) - dt;
        if (e.summonCd <= 0) {
          e.summonCd = k.summon.every;
          this.summonHelp(e, foe);
        }
      }
      if (k.snares) {
        e.snareCd = (e.snareCd ?? k.snares.every / 2) - dt;
        if (e.snareCd <= 0 && d < 260) {
          e.snareCd = k.snares.every;
          this.laySnare(e, foe, d);
        }
      }
      if (k.leap) {
        e.leapCd = (e.leapCd ?? k.leap.every / 2) - dt;
        if (e.leapCd <= 0) {
          // at whoever is furthest away (but within reach)
          let at: Foe | undefined;
          let far = 60;
          for (const f of foes) {
            const fd = Math.hypot(f.x - e.x, f.y - e.y);
            if (!f.dead && f.hiddenT <= 0 && fd > far && fd < k.leap.range) {
              far = fd;
              at = f;
            }
          }
          if (at) {
            e.leapCd = k.leap.every;
            e.leap = { t: 0, wind: 0.55, dur: 0.45, x0: e.x, y0: e.y, x1: at.x, y1: at.y, at: at.id };
            e.tele = true;
            at.log(`${e.n} crouches to leap at you!`, 'h');
            return;
          }
        }
      }
      e.castCd -= dt;
      if (k.casts && e.castCd <= 0) {
        const i = k.casts.findIndex(c => this.castFits(e, c, d));
        if (i >= 0) {
          const c = k.casts[i];
          e.casting = i;
          e.castT = e.castTotal = c.time;
          e.tele = false;
          this.cry(e, 'cast');
          foe.log(`${e.n} ${CAST_SAY[c.what]}`, 'h');
          return;
        }
      }
      if (d > k.range) {
        e.tele = false;
        e.atkT = Math.min(e.atkT, k.per);
        // held by a trap: it strains where it stands; slowed: it limps
        if (e.rootT > 0) e.walk = 0;
        else {
          const spd = k.spd * (e.slowT > 0 ? 1 - e.slowK : 1);
          this.moveEntity(e, (foe.x - e.x) / d, (foe.y - e.y) / d, spd, dt, hw, hh);
        }
      } else {
        e.face = faceToward(e.x, e.y, foe.x, foe.y, e.face);
        e.atkT -= dt;
        if (e.atkT <= 0.7) e.tele = true;
        if (e.atkT <= 0) {
          if (e.kind === 'garrick') e.cuts = (e.cuts ?? 0) + 1;
          this.cry(e, 'attack');
          if (k.missile) this.shoot(e, foe);
          else if (Math.hypot(foe.x - e.x, foe.y - e.y) < k.range + 14)
            this.strike(foe, k.atk, 'the ' + e.n + "'s hit");
          else foe.log(e.n + ' hits the air.', 't');
          e.atkT = k.per;
          e.tele = false;
        }
      }
    } else this.wander(e, dt, hw, hh, 0.4);
  }

  // ---------- dev ----------
  /** Dev: drop a creature of any kind a short walk from a hero. */
  spawnNear(kind: EnemyKind, h: Hero): void {
    const k = KINDS[kind];
    const rng = this.game.rng;
    for (let i = 0; i < 16; i++) {
      const a = rng.next() * Math.PI * 2;
      const r = 70 + rng.next() * 40;
      const x = h.x + Math.cos(a) * r;
      const y = h.y + Math.sin(a) * r;
      if (this.map.blocked(x, y, 6 * k.scale, 5 * k.scale)) continue;
      const e = this.spawnEnemy(kind, x, y, true);
      if (k.nightOnly) e.riseT = RISE_DUR;
      this.enemies.push(e);
      this.burst(x, y + 2, 10, '#b8956a', 60, 0.5, 3, -20);
      h.log(k.n + ' appears.');
      return;
    }
    h.log('No room to spawn here.', 'h');
  }

  /** Dev: back to the starting creatures (drops anything spawned from the dev menu). */
  respawnAll(): void {
    this.enemies = this.spawns();
    for (const h of this.heroes()) {
      h.target = null;
      h.log('Creatures respawned.');
    }
  }

  // ---------- the region's tick ----------
  tick(dt: number): void {
    const heroes = this.heroes();
    for (const h of heroes) h.tick(dt);
    // heroes may have left (an exit, a respawn elsewhere): the rest runs for those still here
    const here = this.heroes();
    this.updateDrops(dt);
    this.updateTrees(dt);
    this.updateRocks(dt);
    this.updateStructures(dt);
    this.updateScene(dt);
    const night = this.isNight;
    if (night !== this.wasNight) {
      this.wasNight = night;
      this.logAll(
        night
          ? 'Night falls. The dead are stirring…'
          : 'Dawn breaks. The dead return to the earth.',
        night ? 'h' : 't'
      );
      if (!night) this.dawn();
    }
    if (!this.scene) this.updateHold(dt);
    // during a scene the fighting waits
    if (!this.scene) {
      const foes = [...here, ...this.game.companionsIn(this.id)];
      for (const c of this.game.companionsIn(this.id)) c.tick(dt);
      // how far each fire is smothered is worked out afresh from whoever lies on it
      for (const s of this.structures) s.smother = 0;
      for (const e of this.enemies) this.updateEnemy(e, dt, foes);
    }
    if (this.enemies.some(e => e.temp && !e.alive && e.dieT <= 0))
      this.enemies = this.enemies.filter(e => !(e.temp && !e.alive && e.dieT <= 0));
    if (!this.scene) this.updateHazards(dt);
    if (!this.scene) this.updateTraps(dt);
    if (!this.scene) this.updateSnares(dt);
    if (this.fallen.length) {
      for (const f of this.fallen) f.t += dt;
      this.fallen = this.fallen.filter(f => f.t < FALLEN_KEEP);
    }
    this.updateWanderers(dt);
    this.updateStory(dt);
    if (this.pending.length) {
      for (const p of this.pending) p.t -= dt;
      const due = this.pending.filter(p => p.t <= 0);
      this.pending = this.pending.filter(p => p.t > 0);
      for (const p of due) p.fn();
    }
  }
}
