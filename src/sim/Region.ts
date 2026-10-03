import { KINDS, RESPAWN } from '../data/enemies';
import type { EnemyKind, CreatureSounds } from '../data/enemies';
import { T, Tile, rockCentre, RegionMap, parseLayout, isoX, isoSpeedFactor } from './map';
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
} from './types';
import type { Game } from './Game';
import type { Hero } from './Hero';

/** Seconds a night creature takes to climb out of the ground. */
export const RISE_DUR = 0.9;
/** Seconds, on average, between a wandering creature's idle calls. */
const IDLE_CALL = 18;

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
    this.structures = memory?.structures ?? [];
    this.drops = memory?.drops ?? [];
    for (const d of this.drops) this.nextDrop = Math.max(this.nextDrop, d.uid + 1);
    for (const st of this.structures)
      if (STRUCTURES[st.kind].solid) this.map.setBlocker(st.c, st.r, { x: st.x, y: st.y, r: 10 });
    this.props = (def.props ?? [])
      .filter(p => this.game.check(p.when))
      .map(p => ({ kind: p.kind, c: p.at[0], r: p.at[1] }));
    for (const p of this.props)
      for (const [c, r] of propSolidTiles(p.kind, p.c, p.r)) this.map.setPropSolid(c, r);
    this.trees = this.buildTrees();
    this.rocks = this.buildRocks();
    this.npcs = def.npcs.filter(n => this.game.check(n.when)).map(n => this.placeNpc(n.id, n.at));
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

  /** What to keep when the last hero leaves. */
  memory(): RegionMemory {
    return { structures: this.structures, drops: this.drops };
  }

  /** The heroes standing here. */
  heroes(): Hero[] {
    return this.game.heroes.filter(h => h.regionId === this.id);
  }

  /** Night here (or the Blackthorn is deep enough, ring 3 and on, that the dead walk anyway). */
  get isNight(): boolean {
    if ((this.def.ring ?? 0) >= 3) return true;
    const t = this.game.day.t;
    return t >= 0.8 || t < 0.23;
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
        if (t === Tile.Tree)
          out.push({
            c,
            r,
            x: c * T + T / 2,
            y: r * T + T / 2,
            hp: CHOP.hits,
            stumpT: 0,
            shakeT: 0,
          });
      })
    );
    return out;
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
    const e: Enemy = {
      id: this.nextEnemy++,
      kind,
      def: k,
      n: k.n,
      x,
      y,
      sx: x,
      sy: y,
      hp: k.hp,
      hpMax: k.hp,
      aggro: false,
      wanderT: 0,
      wx: 0,
      wy: 0,
      atkT: k.per,
      tele: false,
      castT: -1,
      castTotal: 2.2,
      castCd: 3,
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
    };
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
      .map(sp => this.spawnEnemy(sp.kind, sp.at[0] * T + T / 2, sp.at[1] * T + T / 2));
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
    const flat = (k: string) => k === 'page' || k === 'letter' || k === 'thorn';
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
    if (def.say) h.log(def.say, 't');
    if (def.once) {
      this.game.setFlag(`used:${this.id}:${o.id}`);
      this.objects = this.objects.filter(x => x !== o);
      if (o.kind !== 'page' && o.kind !== 'letter' && o.kind !== 'thorn')
        this.map.setBlocker(o.c, o.r, null);
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
          h.hurt(hz.dmg, hz.what);
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
        dmg: 16,
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
          sc.line = { who, text: st.say };
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
  /** A hero hits a creature: damage, phases, death and loot. Returns true when it died of it. */
  hurtEnemy(e: Enemy, v: number, cls: FloaterClass, by: Hero): boolean {
    if (!e.alive) return false;
    e.hp = Math.max(0, e.hp - v);
    const boss = e.def.boss;
    if (boss?.phases && e.hp > 0) {
      const phase = boss.phases.filter(f => e.hp / e.hpMax <= f).length;
      if (phase > e.phase) {
        e.phase = phase;
        this.events.emit('bossPhase', { kind: e.kind, phase });
      }
    }
    e.flash = 0.08;
    // passive creatures bolt; everything else fights back, and stays angry a while however
    // far away the hit came from (an archer can't shoot a slime from out of its sight for free)
    if (e.def.behavior === 'passive') e.fleeT = 3;
    else {
      e.aggro = true;
      e.foe ??= by.id;
      e.angerT = 10;
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
      return false;
    }
    this.cry(e, 'die');
    e.alive = false;
    e.dieT = 1;
    e.respawnT = RESPAWN * (1 + this.game.rng.next() / 2);
    e.castT = -1;
    e.foe = undefined;
    for (const h of this.heroes()) if (h.target === e) h.target = null;
    this.burst(e.x, e.y - 8, 14, '#f2c14e', 70, 0.7, 3, 60);
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
    if (dx) e.face = dx < 0 ? -1 : 1;
    e.walk += dt * 10;
  }

  /** Bring a dead enemy back at its post (night creatures climb out of the ground). */
  private respawn(e: Enemy): void {
    const id = e.id;
    Object.assign(e, this.spawnEnemy(e.kind, e.sx, e.sy), { id });
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
    if (Math.random() < dt / IDLE_CALL) this.cry(e, 'idle');
  }

  /** Set a bear trap at a hero's feet (their old one, if any, is taken up). */
  setTrap(h: Hero, hold: number): void {
    this.traps = this.traps.filter(t => t.owner !== h.id);
    this.traps.push({ id: this.nextTrap++, x: h.x, y: h.y, owner: h.id, t: 60, hold });
  }

  /** Traps spring on the first creature to step on them; unsprung ones rust away after a minute. */
  private updateTraps(dt: number): void {
    if (!this.traps.length) return;
    for (const tr of this.traps) {
      tr.t -= dt;
      const e = this.enemies.find(
        x => x.alive && x.riseT <= 0 && Math.hypot(x.x - tr.x, x.y - tr.y) < 12 * x.def.scale
      );
      if (!e) continue;
      tr.t = 0;
      e.rootT = Math.max(e.rootT, tr.hold);
      this.fx({ type: 'ring', x: tr.x, y: tr.y, r0: 4, r1: 22, col: '#c8a05a', lw: 3, dur: 0.35 });
      this.sound('trapSnap', tr.x, tr.y);
      this.burst(tr.x, tr.y - 4, 10, '#c8a05a', 80, 0.4, 2, 80);
      this.floater(e.x + 10, e.y - 14 * e.def.scale - 8, 'CAUGHT', 'name', '#c8a05a');
      const owner = this.heroes().find(h => h.id === tr.owner);
      if (owner) owner.dmgEnemy(e, 8, '');
    }
    this.traps = this.traps.filter(t => t.t > 0);
  }

  /**
   * The hero a creature is after: the one it fought last, or the nearest alive one it can
   * see (a camouflaged archer is nowhere to be seen).
   */
  private foeOf(e: Enemy, heroes: Hero[]): Hero | null {
    const kept = e.foe ? heroes.find(h => h.id === e.foe && !h.dead && h.hiddenT <= 0) : undefined;
    if (kept) return kept;
    if (e.foe) e.foe = undefined;
    let best: Hero | null = null;
    let bd = Infinity;
    for (const h of heroes) {
      if (h.dead || h.hiddenT > 0) continue;
      const d = Math.hypot(h.x - e.x, h.y - e.y);
      if (d < bd) {
        bd = d;
        best = h;
      }
    }
    return best;
  }

  private updateEnemy(e: Enemy, dt: number, heroes: Hero[]): void {
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
    const foe = this.foeOf(e, heroes);
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
    const d = foe ? Math.hypot(foe.x - e.x, foe.y - e.y) : Infinity;
    const hw = 6 * k.scale;
    const hh = 5 * k.scale;
    if (e.stunT > 0) {
      e.stunT -= dt;
      return;
    }
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
    if (e.castT > 0) {
      e.castT -= dt;
      if (e.castT <= 0 && foe) {
        const far = d >= (k.castRange ?? 0) + 50;
        const tx = foe.x;
        const ty = foe.y;
        this.fx({ type: 'fireball', x0: e.x, y0: e.y - 12, x1: tx, y1: ty - 8, dur: 0.35 });
        this.sound('fireball', e.x, e.y);
        this.after(0.35, () => {
          this.sound('fireballHit', tx, ty);
          this.burst(tx, ty - 8, 12, '#a78bfa', 100, 0.4, 3, 60);
          this.fx({ type: 'ring', x: tx, y: ty - 8, r0: 6, r1: 34, col: '#a78bfa', dur: 0.3 });
          if (!far && foe.regionId === this.id) foe.hurt(k.castDmg ?? 10, 'the fireball');
          else foe.log('The fireball misses.', 't');
        });
        e.castCd = 7;
      }
      return;
    }
    if (!e.aggro && foe && k.behavior === 'hostile' && d < k.aggro) {
      e.aggro = true;
      e.foe = foe.id;
      this.cry(e, 'notice');
    }
    if (e.kind === 'bellringer' && this.bellRinger(e, dt)) return;
    if (e.aggro && foe) {
      if (Math.hypot(e.x - e.sx, e.y - e.sy) > 380) {
        e.aggro = false;
        e.foe = undefined;
        e.hp = e.hpMax;
        foe.log(e.n + ' returns to its post.');
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
      e.castCd -= dt;
      if (k.cast && e.castCd <= 0 && d < (k.castRange ?? 0) && d > 50) {
        e.castT = e.castTotal;
        e.tele = false;
        this.cry(e, 'cast');
        foe.log(e.n + ' casts Fireball…', 'h');
        return;
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
        e.face = foe.x < e.x ? -1 : 1;
        e.atkT -= dt;
        if (e.atkT <= 0.7) e.tele = true;
        if (e.atkT <= 0) {
          this.cry(e, 'attack');
          if (Math.hypot(foe.x - e.x, foe.y - e.y) < k.range + 14)
            foe.hurt(k.atk, 'the ' + e.n + "'s hit");
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
    }
    // during a scene the fighting waits
    if (!this.scene) for (const e of this.enemies) this.updateEnemy(e, dt, here);
    if (this.enemies.some(e => e.temp && !e.alive && e.dieT <= 0))
      this.enemies = this.enemies.filter(e => !(e.temp && !e.alive && e.dieT <= 0));
    if (!this.scene) this.updateHazards(dt);
    if (!this.scene) this.updateTraps(dt);
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
