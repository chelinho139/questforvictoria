import { COMPANIONS } from '../data/companions';
import type { CompanionId, CompanionDef, BarkOn } from '../data/companions';
import type { HeldKind } from '../data/enemies';
import { ARROW_SPEED } from '../data/classes';
import { T, faceToward } from './map';
import { findPath, clearLine } from './pathfind';
import type { Pt } from './pathfind';
import type { Enemy, Foe } from './types';
import type { Game } from './Game';
import type { Hero } from './Hero';
import type { Region } from './Region';

/** She keeps about this far from the hero she follows (px). */
const FOLLOW = 44;
/** Further than this from them she stops shooting and catches up. */
const CATCH_UP = 120;
/** Further than this (or stuck a while) she is simply at their side again. */
const LOST = 520;
/** Waiting at home, she comes along again once a hero comes this close (px). */
const FETCH = 260;
/** Her pace (screen px/s): a little quicker than a hero on foot, so she keeps up. */
const SPEED = 128;
/** How far she looks for creatures to call out or shoot. */
const SIGHT = 230;
/** Her armour: blows on her shrink like on a hero wearing this much. */
const ARMOR = 6;
/** Seconds she holds still to draw and loose. */
const DRAW = 0.35;

/**
 * A companion walking with the heroes (data/companions.ts): Wren in the Weepwood. She follows
 * the nearest hero, shoots what the heroes fight (her kills are that hero's), drops to one knee
 * when badly hurt instead of dying, can be held like a hero (a web, a snare) and calls out
 * what she sees. The Game decides which region she is in (Game.placeCompanions); the region
 * she stands in ticks her.
 */
export class Companion implements Foe {
  /** Her name among the creatures' foes (heroes have their own ids). */
  readonly id: string;
  /** The region she stands in ('' while she isn't with anyone). */
  regionId = '';
  x = 0;
  y = 0;
  face: 1 | -1 = 1;
  walk = 0;
  hp = 1;
  hpMax = 1;
  /** Seconds left on one knee (creatures leave her be meanwhile). */
  dead = 0;
  hiddenT = 0;
  heldT = 0;
  heldBy: HeldKind | '' = '';
  slowT = 0;
  slowK = 0;
  flash = 0;
  /** Seconds to her next shot, her shooting animation, and holding still for the draw. */
  atkT = 0;
  atkAnimT = 0;
  aimT = 0;
  target: Enemy | null = null;
  /** The hero she follows (an id). */
  lead = '';
  /** Gone home to wait (the heroes left the places she goes): she stays put until one comes back for her. */
  waiting = false;
  private path: Pt[] | null = null;
  private pathT = 0;
  private stuckT = 0;
  private readonly barkCd = new Map<string, number>();
  /** Creatures she has called out already (by id), and objects she has walked past. */
  private readonly seen = new Set<string>();
  private wasNight = false;

  constructor(
    readonly game: Game,
    readonly cid: CompanionId
  ) {
    this.id = 'cp:' + cid;
  }

  get def(): CompanionDef {
    return COMPANIONS[this.cid];
  }
  get name(): string {
    return this.def.name;
  }
  get airborne(): boolean {
    return false;
  }
  get region(): Region {
    return this.game.region(this.regionId);
  }

  /** Her strength follows the heroes she walks with (the highest level among them). */
  scale(level: number): void {
    const max = this.def.hp[0] + this.def.hp[1] * level;
    if (max === this.hpMax) return;
    const k = this.hp / this.hpMax;
    this.hpMax = max;
    this.hp = Math.max(1, Math.round(max * k));
  }

  /** Stand on a spot, fresh (arriving somewhere, or home). */
  placeAt(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.path = null;
    this.stuckT = 0;
    this.target = null;
    this.seen.clear();
  }

  /** At a hero's side: the first open spot round them. */
  joinAt(h: { x: number; y: number }): void {
    const R = this.region;
    for (let i = 0; i < 12; i++) {
      const a = Math.PI * 0.75 + (i / 12) * Math.PI * 2;
      const x = h.x + Math.cos(a) * 26;
      const y = h.y + Math.sin(a) * 26;
      if (R.map.blocked(x, y, 9, 8)) continue;
      return this.placeAt(x, y);
    }
    this.placeAt(h.x, h.y);
  }

  // ---------- as a foe ----------
  hurt(v: number, src: string): void {
    if (this.dead > 0 || !this.regionId) return;
    const R = this.region;
    v = Math.max(1, Math.round((v * 100) / (100 + ARMOR * 6)));
    this.hp = Math.max(0, this.hp - v);
    this.flash = 0.08;
    R.floater(this.x, this.y - 20, '-' + v, 'hurt');
    R.sound('heroHurt', this.x, this.y);
    R.burst(this.x, this.y - 8, 6, '#e0504b', 80, 0.4, 2, 120);
    if (this.hp > 0) return;
    // badly hurt: down on one knee, swearing, and up again in a moment
    this.dead = this.def.down;
    this.heldT = 0;
    this.heldBy = '';
    this.path = null;
    this.target = null;
    this.aimT = 0;
    R.logAll(`${this.name} is down (${src}). She'll be up in a moment.`, 'h');
    this.bark('down', true);
  }

  log(): void {
    // she reads nothing: what happens to her is said in the heroes' logs
  }

  hold(t: number, by: HeldKind): void {
    if (this.dead > 0 || !this.regionId) return;
    this.heldT = Math.max(this.heldT, t);
    this.heldBy = by;
    this.path = null;
  }

  free(by: HeldKind): void {
    if (this.heldBy === by) {
      this.heldT = 0;
      this.heldBy = '';
    }
  }

  slow(t: number, k: number): void {
    if (this.dead > 0) return;
    this.slowT = Math.max(this.slowT, t);
    this.slowK = Math.max(this.slowT > t ? this.slowK : 0, k);
  }

  /**
   * Speak up (data/companions.ts barks): a line picked at random, unless she said one for
   * this lately. `force` speaks even over another line still fresh.
   */
  bark(on: BarkOn, force = false): void {
    const b = this.def.barks.find(x => x.on === on);
    if (!b || !this.regionId) return;
    if ((this.barkCd.get(on) ?? 0) > 0) return;
    if (!force && (this.barkCd.get('*') ?? 0) > 0) return;
    this.barkCd.set(on, b.cd ?? 40);
    this.barkCd.set('*', 4);
    // which line is only for the ear: the game's dice stay out of it
    const line = b.lines[Math.floor(Math.random() * b.lines.length)];
    const R = this.region;
    R.say(this.name, line, this.x, this.y);
    if (this.def.voice) R.sound(this.def.voice, this.x, this.y);
  }

  // ---------- her tick ----------
  tick(dt: number): void {
    const R = this.region;
    this.flash = Math.max(0, this.flash - dt);
    this.atkAnimT = Math.max(0, this.atkAnimT - dt);
    this.aimT = Math.max(0, this.aimT - dt);
    this.slowT = Math.max(0, this.slowT - dt);
    if (this.heldT > 0) {
      this.heldT = Math.max(0, this.heldT - dt);
      if (this.heldT === 0) this.heldBy = '';
    }
    for (const [k, v] of this.barkCd) this.barkCd.set(k, v - dt);
    if (this.dead > 0) {
      this.dead -= dt;
      this.walk = 0;
      if (this.dead > 0) return;
      this.dead = 0;
      this.hp = Math.round(this.hpMax / 2);
      this.bark('up', true);
      return;
    }
    const heroes = R.heroes().filter(h => !h.dead);
    const lead = this.nearest(heroes);
    if (!lead) {
      this.walk = 0;
      return;
    }
    if (this.waiting) {
      this.walk = 0;
      if (Math.hypot(lead.x - this.x, lead.y - this.y) > FETCH) return;
      this.waiting = false;
      this.bark('join');
    }
    this.lead = lead.id;
    const dl = Math.hypot(lead.x - this.x, lead.y - this.y);
    if (dl > LOST || this.stuckT > 2) return this.joinAt(lead);
    this.callOut(R);
    // fighting: stand and shoot while the hero is close
    this.target = this.pickTarget(R, heroes, lead);
    const tg = this.target;
    const range = this.def.shot.range;
    if (tg && dl < CATCH_UP && Math.hypot(tg.x - this.x, tg.y - this.y) < range) {
      this.walk = 0;
      this.face = faceToward(this.x, this.y, tg.x, tg.y, this.face);
      this.atkT -= dt;
      if (this.atkT <= 0) {
        this.atkT = this.def.shot.period;
        this.loose(tg, lead);
      }
      return;
    }
    this.atkT = Math.min(this.atkT, 0.6);
    if (this.heldT > 0 || this.aimT > 0) {
      this.walk = 0;
      return;
    }
    if (dl > FOLLOW + 10) this.follow(lead, dt);
    else {
      this.walk = 0;
      this.path = null;
      this.stuckT = 0;
    }
  }

  private nearest(heroes: Hero[]): Hero | null {
    let best: Hero | null = null;
    let bd = Infinity;
    for (const h of heroes) {
      const d = Math.hypot(h.x - this.x, h.y - this.y);
      if (d < bd) {
        bd = d;
        best = h;
      }
    }
    return best;
  }

  /**
   * What to shoot: whatever is fighting one of the heroes (or her), nearest first; else what
   * the hero she follows is fighting. Never what can't be seen or what walks home.
   */
  private pickTarget(R: Region, heroes: Hero[], lead: Hero): Enemy | null {
    const ok = (e: Enemy) =>
      e.alive &&
      !e.hid &&
      e.riseT <= 0 &&
      e.homeT <= 0 &&
      Math.hypot(e.x - this.x, e.y - this.y) < SIGHT;
    const ours = new Set<string>([this.id, ...heroes.map(h => h.id)]);
    let best: Enemy | null = null;
    let bd = Infinity;
    for (const e of R.enemies) {
      if (!ok(e) || !e.aggro || !e.foe || !ours.has(e.foe)) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    if (best) return best;
    const t = lead.target;
    return t && ok(t) && R.enemies.includes(t) ? t : null;
  }

  /** An arrow at a creature: it flies, and lands for her damage (the kill is the hero's she follows). */
  private loose(tg: Enemy, lead: Hero): void {
    const R = this.region;
    const t = Math.max(0.08, Math.hypot(tg.x - this.x, tg.y - this.y) / ARROW_SPEED);
    R.fx({
      type: 'arrow',
      x0: this.x + this.face * 6,
      y0: this.y - 10,
      x1: tg.x,
      y1: tg.y - 6,
      col: '#e8dcc0',
      dur: t,
    });
    R.sound('autoShot', this.x, this.y);
    this.atkAnimT = 0.36;
    this.aimT = DRAW;
    const level = Math.max(1, ...R.heroes().map(h => h.level));
    const dmg = Math.round(this.def.shot.dmg[0] + this.def.shot.dmg[1] * level);
    R.after(t, () => {
      if (this.regionId !== R.id || !tg.alive || !R.enemies.includes(tg)) return;
      // the kill goes to the hero she follows (or whoever is still here)
      const by = R.heroes().find(h => h.id === lead.id) ?? R.heroes()[0];
      if (!by) return;
      R.sound('hitArrow', tg.x, tg.y);
      if (R.hurtEnemy(tg, dmg, 'aa', by, this)) {
        by.killed(tg);
        this.bark('kill');
      }
    });
  }

  /** Walk after the hero: straight at them when the way is clear, round things on a path otherwise. */
  private follow(lead: Hero, dt: number): void {
    const R = this.region;
    const spd = SPEED * (this.slowT > 0 ? 1 - this.slowK : 1);
    const x0 = this.x;
    const y0 = this.y;
    const goal = {
      x:
        lead.x +
        ((this.x - lead.x) * FOLLOW) / Math.max(1, Math.hypot(this.x - lead.x, this.y - lead.y)),
      y:
        lead.y +
        ((this.y - lead.y) * FOLLOW) / Math.max(1, Math.hypot(this.x - lead.x, this.y - lead.y)),
    };
    if (clearLine(R.map, this, goal, 9, 8)) {
      this.path = null;
      const d = Math.hypot(goal.x - this.x, goal.y - this.y);
      if (d > 1) R.moveEntity(this, (goal.x - this.x) / d, (goal.y - this.y) / d, spd, dt, 9, 8);
    } else {
      this.pathT -= dt;
      if (!this.path || this.pathT <= 0) {
        this.path = findPath(R.map, this, goal, 9, 8);
        this.pathT = 0.6;
      }
      const w = this.path?.[0];
      if (w) {
        const d = Math.hypot(w.x - this.x, w.y - this.y);
        if (d < 6) this.path!.shift();
        else R.moveEntity(this, (w.x - this.x) / d, (w.y - this.y) / d, spd, dt, 9, 8);
      }
    }
    const moved = Math.hypot(this.x - x0, this.y - y0);
    this.stuckT = moved < spd * dt * 0.2 ? this.stuckT + dt : 0;
  }

  /** What she sees: creatures of kinds she has something to say about, objects she knows, nightfall. */
  private callOut(R: Region): void {
    if (R.isNight && !this.wasNight) this.bark('night');
    this.wasNight = R.isNight;
    for (const e of R.enemies) {
      const key = 'e' + e.id;
      if (!e.alive || e.hid || this.seen.has(key) || Math.hypot(e.x - this.x, e.y - this.y) > SIGHT)
        continue;
      this.seen.add(key);
      this.bark(`see:${e.kind}`);
    }
    for (const o of R.objects) {
      const key = 'o' + o.id;
      if (this.seen.has(key) || Math.hypot(o.x - this.x, o.y - this.y) > 2.2 * T) continue;
      this.seen.add(key);
      this.bark(`near:${o.kind}`);
    }
  }
}
