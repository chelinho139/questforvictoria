import type { EnemyDef, EnemyKind } from '../data/enemies';
import type { Enemy, FloaterClass } from './types';
import type { Hero } from './Hero';
import type { Game } from './Game';

/** Seconds a challenge waits for its answer. */
export const DUEL_ASK = 30;
/** Seconds from the yes to the first blow: the count, 3, 2, 1. */
export const DUEL_COUNT = 3;
/** How close (world px) you stand to someone to challenge them, or to take up their challenge. */
export const DUEL_REACH = 260;
/**
 * The ring round the flag (world px; about the screen, standing at the flag): outside it for
 * DUEL_OUT seconds, you have fled the duel.
 */
export const DUEL_RING = 230;
export const DUEL_OUT = 10;
/** `MeSnap.target` when a hero's target is their duel opponent (creatures' ids start at 1). */
export const RIVAL_TARGET = -1;

/** A duel as one of the two in it sees it (the HUD shows it; online it comes in the snapshot). */
export interface DuelView {
  /** ask: a challenge waiting for its answer; count: the count before the fight; fight: under way. */
  st: 'ask' | 'count' | 'fight';
  /** The other one: their hero id and name. */
  id: string;
  name: string;
  /** I made the challenge. */
  mine: boolean;
  /** Seconds left: of the challenge, or of the count. */
  t: number;
  /** The flag (world px), from the yes on. */
  x: number;
  y: number;
  /** Seconds I have been outside the ring (0 inside it). */
  out: number;
}

/** A duel in a region, as everyone there sees it: the flag, who, and whether the fight is on. */
export type DuelFlag = [x: number, y: number, a: string, b: string, live: 0 | 1];

/** How a fight ended: on the last hit point, by yielding, by running off, by falling to something else. */
type Ending = 'beaten' | 'yielded' | 'fled' | 'fell';

/** What the rules of combat read off a creature's kind, for a hero standing in as one (see Rival). */
const HERO_DEF: EnemyDef = {
  n: 'Hero',
  hp: 1,
  atk: 0,
  per: 1,
  spd: 0,
  range: 0,
  aggro: 0,
  // floaters and marks sit over a hero's head
  scale: 1.5,
  tex: '',
  behavior: 'hostile',
  sounds: { hurt: 'goblinHurt', die: 'goblinDie' },
  gold: [0, 0],
  xp: 0,
};

/**
 * A duel opponent as the target of the hero fighting them. The rules of combat were written
 * for creatures (a spell lands on `tg: Enemy`), so the hero you duel stands in as one: where
 * they are, their health and whether they can be hit come straight off the hero; a stun or a
 * slow lands on them; your Hunter's Mark and Sunder stay here (they are yours, on them). Their
 * damage goes through the duel (Duels.strike), never through a region's creatures, and a Rival
 * is never in a region's `enemies`.
 */
export class Rival implements Enemy {
  readonly id = RIVAL_TARGET;
  readonly kind = 'rival' as EnemyKind;
  readonly def = HERO_DEF;
  // a creature's own workings: unused for a hero, here for the rules that set them
  sx = 0;
  sy = 0;
  aggro = true;
  wanderT = 0;
  wx = 0;
  wy = 0;
  atkT = 0;
  tele = false;
  castTotal = 1;
  castCd = 0;
  respawnT = 0;
  dieT = 0;
  riseT = 0;
  crumbleT = -1;
  fleeT = 0;
  temp = false;
  phase = 0;
  rootT = 0;
  angerT = 0;
  homeT = 0;
  /** Your Hunter's Mark and your Sunder on them (the duel wears them off). */
  markT = 0;
  markBy = '';
  markK = 0;
  sunderT = 0;

  constructor(
    readonly hero: Hero,
    /** Whether the fight is on (the duel's, or online, the last snapshot's). */
    private readonly live: () => boolean
  ) {}

  get n(): string {
    return this.hero.name;
  }
  get x(): number {
    return this.hero.x;
  }
  get y(): number {
    return this.hero.y;
  }
  get hp(): number {
    return this.hero.hp;
  }
  get hpMax(): number {
    return this.hero.hpMax;
  }
  get face(): 1 | -1 {
    return this.hero.face;
  }
  get walk(): number {
    return this.hero.walk;
  }
  get flash(): number {
    return this.hero.flash;
  }
  /** Fair game: the fight is on, and they are up and about. */
  get alive(): boolean {
    return this.live() && this.hero.dead <= 0 && !!this.hero.regionId;
  }
  /** Camouflaged: out of sight, so nobody's target (a blow round about still finds them). */
  get hid(): boolean {
    return this.hero.hiddenT > 0;
  }
  /** Heroes cast nothing slow: there is never anything to interrupt. */
  get castT(): number {
    return 0;
  }
  set castT(_: number) {}
  /** A stun lands on the hero (a shorter one never cuts a longer one short). */
  get stunT(): number {
    return this.hero.stunT;
  }
  set stunT(t: number) {
    if (this.alive && t > this.hero.stunT) this.hero.stun(t);
  }
  /** So does a slow. */
  get slowT(): number {
    return this.hero.slowT;
  }
  set slowT(t: number) {
    if (this.alive) this.hero.slowT = t;
  }
  get slowK(): number {
    return this.hero.slowK;
  }
  set slowK(k: number) {
    if (this.alive) this.hero.slowK = k;
  }
}

/**
 * Two heroes and the duel between them: first a challenge (`a` waits for `b`'s answer), then
 * the count, then the fight, round the flag planted between them.
 */
export class Duel {
  state: DuelView['st'] = 'ask';
  /** Seconds left: of the challenge, then of the count. */
  t = DUEL_ASK;
  /** The flag, planted between them at the yes. */
  x = 0;
  y = 0;
  /** Seconds each of them has been outside the ring. */
  readonly out = new Map<Hero, number>();
  /** The health and mana each had when the fight began: they are given back after it. */
  readonly before = new Map<Hero, { hp: number; mp: number }>();
  /** What each of them fights: the other, as a target (`a`'s Rival is `b`). */
  private readonly rivals: Map<Hero, Rival>;

  constructor(
    readonly a: Hero,
    readonly b: Hero
  ) {
    const live = () => this.state === 'fight';
    this.rivals = new Map([
      [a, new Rival(b, live)],
      [b, new Rival(a, live)],
    ]);
  }

  has(h: Hero): boolean {
    return h === this.a || h === this.b;
  }

  other(h: Hero): Hero {
    return h === this.a ? this.b : this.a;
  }

  /** The target `h` fights: the other one. */
  rivalFor(h: Hero): Rival {
    return this.rivals.get(h)!;
  }
}

/**
 * The room's duels (Game.duels), in the manner of WoW's: one hero challenges another standing
 * near, who has DUEL_ASK seconds to answer; a yes plants a flag between them, and after a count
 * of three they fight with everything they have. It ends when one is down to their last hit
 * point (nobody dies of a duel), yields, or strays from the flag for too long. Everyone there
 * hears who won, the winner and loser keep the tally, and both get back the health and mana
 * they began with. A hero is in one duel (or challenge) at a time.
 */
export class Duels {
  list: Duel[] = [];

  constructor(private readonly game: Game) {}

  /** The duel (or challenge) a hero is in. */
  of(h: Hero): Duel | null {
    return this.list.find(d => d.has(h)) ?? null;
  }

  /** `h` and `by` are fighting their duel right now. */
  fighting(h: Hero, by: Hero): boolean {
    const d = this.of(h);
    return !!d && d.state === 'fight' && by !== h && d.has(by);
  }

  /** Why `from` can't duel `to` right now (both up, out of a scene, near each other), or null. */
  problem(from: Hero, to: Hero | undefined): string | null {
    if (!to || to === from) return 'Pick someone to challenge.';
    if (from.dead > 0) return "You can't duel while you're down.";
    if (to.dead > 0) return `${to.name} is down.`;
    if (from.inScene) return 'Not now.';
    if (to.regionId !== from.regionId || Math.hypot(to.x - from.x, to.y - from.y) > DUEL_REACH)
      return `${to.name} is too far away.`;
    return null;
  }

  /** `from` challenges the hero with id `id` (who is asked; the duel waits for their yes). */
  challenge(from: Hero, id: string): void {
    const to = this.game.heroes.find(h => h.id === id);
    const mine = this.of(from);
    // challenged by the one you are challenging: that's a yes
    if (mine && mine.state === 'ask' && mine.b === from && mine.a === to) return this.accept(from);
    const why = mine
      ? mine.state === 'ask' && mine.a === from
        ? 'You have already challenged someone.'
        : "You're in a duel already."
      : (this.problem(from, to) ??
        (to && this.of(to) ? `${to.name} is busy with another duel.` : null));
    if (why || !to) {
      from.log(why ?? 'Pick someone to challenge.', 'h');
      from.hear('error');
      return;
    }
    this.list.push(new Duel(from, to));
    from.log(`You challenge ${to.name} to a duel.`, 't');
    to.log(`${from.name} challenges you to a duel!`, 'c');
    to.hear('duelAsk');
  }

  /** `h` takes up the challenge made to them: the flag goes in, and the count begins. */
  accept(h: Hero): void {
    const d = this.of(h);
    if (!d || d.state !== 'ask' || d.b !== h) return;
    const why = this.problem(h, d.a);
    if (why) {
      h.log(why, 'h');
      h.hear('error');
      return;
    }
    d.state = 'count';
    d.t = DUEL_COUNT;
    d.x = (d.a.x + d.b.x) / 2;
    d.y = (d.a.y + d.b.y) / 2;
    d.a.log(`${h.name} accepts. The duel begins in ${DUEL_COUNT}…`, 'c');
    h.log(`You accept. The duel begins in ${DUEL_COUNT}…`, 'c');
    for (const x of [d.a, d.b]) {
      x.banner(String(DUEL_COUNT));
      x.hear('duelCount');
    }
    for (const o of h.region.heroes())
      if (!d.has(o)) o.log(`${d.a.name} and ${h.name} are about to duel.`, 't');
    h.region.burst(d.x, d.y, 10, '#b8956a', 60, 0.5, 3, -20);
  }

  /** `h` says no: to a challenge (declining it, or taking yours back), to the count, or to the fight (yielding). */
  quit(h: Hero): void {
    const d = this.of(h);
    if (!d) return;
    const o = d.other(h);
    if (d.state === 'fight') return this.end(d, o, 'yielded');
    if (d.state === 'count') return this.drop(d, `${h.name} backs out of the duel.`);
    this.remove(d);
    if (h === d.b) {
      h.log(`You decline ${o.name}'s challenge.`, 't');
      o.log(`${h.name} declines your challenge.`, 'h');
    } else {
      h.log('You take back your challenge.', 't');
      o.log(`${h.name} takes back the challenge.`, 't');
    }
  }

  /** A hero leaves the room or the region: a challenge or a count is off, and a fight is lost. */
  left(h: Hero): void {
    const d = this.of(h);
    if (!d) return;
    if (d.state === 'fight') this.end(d, d.other(h), 'fled');
    else this.drop(d, d.state === 'ask' ? 'The challenge lapses.' : 'The duel is called off.');
  }

  /** `h` took the last blow they could: the fight is over, and lost. */
  beaten(h: Hero): void {
    const d = this.of(h);
    if (d && d.state === 'fight') this.end(d, d.other(h), 'beaten');
  }

  /**
   * `by` lands a blow (or a bleed's tick) on their opponent: their weapon, Sunder and life on
   * hit count as on a creature, then the opponent's armor and luck as against a creature's blow.
   */
  strike(by: Hero, r: Rival, v: number, cls: FloaterClass): void {
    const d = this.of(by);
    if (!d || d.state !== 'fight' || d.rivalFor(by) !== r || !r.alive) return;
    if (cls !== 'dot') v += by.gear.atk;
    if (r.sunderT > 0) v = Math.round(v * 1.2);
    if (cls !== 'dot' && by.tal.lifeOnHit && !by.dead)
      by.hp = Math.min(by.hpMax, by.hp + by.tal.lifeOnHit);
    r.hero.hurt(v, by.name, by);
  }

  /** Every server tick (Game.tick): challenges lapse, the count counts, fights are watched. */
  tick(dt: number): void {
    for (const d of [...this.list]) this.tickDuel(d, dt);
  }

  private tickDuel(d: Duel, dt: number): void {
    const { a, b } = d;
    if (!a.regionId || a.regionId !== b.regionId) return this.left(a.regionId ? b : a);
    if (d.state === 'ask') {
      d.t -= dt;
      if (d.t <= 0 || a.dead > 0 || b.dead > 0) this.drop(d, 'The challenge lapses.');
      return;
    }
    if (d.state === 'count') {
      if (a.dead > 0 || b.dead > 0 || a.inScene) return this.drop(d, 'The duel is called off.');
      const was = Math.ceil(d.t);
      d.t -= dt;
      if (d.t <= 0) return this.begin(d);
      const now = Math.ceil(d.t);
      if (now < was)
        for (const h of [a, b]) {
          h.banner(String(now));
          h.hear('duelCount');
        }
      return;
    }
    // the fight: something else bringing one of them down, or a scene, ends it
    const down = a.dead > 0 ? a : b.dead > 0 ? b : null;
    if (down) return this.end(d, d.other(down), 'fell');
    if (a.inScene) return this.drop(d, 'The duel is called off.');
    for (const h of [a, b]) {
      const r = d.rivalFor(h);
      r.markT = Math.max(0, r.markT - dt);
      r.sunderT = Math.max(0, r.sunderT - dt);
      const away = Math.hypot(h.x - d.x, h.y - d.y) > DUEL_RING;
      const was = d.out.get(h) ?? 0;
      if (away && !was)
        h.log(
          `You are leaving the duel! Back to the flag within ${DUEL_OUT} s or you forfeit.`,
          'h'
        );
      else if (!away && was) h.log('Back by the flag.', 't');
      const t = away ? was + dt : 0;
      d.out.set(h, t);
      if (t >= DUEL_OUT) return this.end(d, d.other(h), 'fled');
    }
  }

  /** The count is done: they fight (each with the other as their target, unless they have one). */
  private begin(d: Duel): void {
    d.state = 'fight';
    d.t = 0;
    for (const h of [d.a, d.b]) {
      d.before.set(h, { hp: h.hp, mp: h.mp });
      h.banner('FIGHT!', 'bad');
      if (!h.target) h.setTarget(d.rivalFor(h));
    }
    d.a.region.sound('duelStart', d.x, d.y);
  }

  /** A fight is over: `w` won. The tally, the news, and both put back as they were. */
  private end(d: Duel, w: Hero, how: Ending): void {
    const l = d.other(w);
    this.settle(d);
    // a duel lost to a goblin is not a duel lost
    const line =
      how === 'beaten'
        ? `${w.name} has defeated ${l.name} in a duel!`
        : how === 'yielded'
          ? `${l.name} yields. ${w.name} wins the duel!`
          : how === 'fled'
            ? `${l.name} has fled from ${w.name} in a duel.`
            : `${l.name} has fallen. The duel is over.`;
    // everyone where the winner stands hears it (and the loser, wherever they went)
    const here = w.regionId ? w.region.heroes() : [w];
    for (const h of here) h.log(line, 'c');
    if (!here.includes(l)) l.log(line, 'c');
    if (how === 'fell') return;
    w.duelsWon++;
    l.duelsLost++;
    w.banner('VICTORY!');
    w.hear('duelWin');
    l.banner('DEFEATED', 'bad');
    if (w.regionId) w.region.burst(w.x, w.y - 18, 16, '#f2c14e', 80, 0.8, 3, -60);
    if (how !== 'fled' && l.regionId === w.regionId)
      l.region.floater(l.x, l.y - 34, 'YIELDS', 'name', '#e8e4d8');
  }

  /** A challenge or a count that comes to nothing: both are told. */
  private drop(d: Duel, text: string): void {
    this.settle(d);
    for (const h of [d.a, d.b]) h.log(text, 't');
  }

  /**
   * Take a duel off the list. A fight is put away: each gets back the health and mana they
   * began with (unless they are down), loses what it left on them (a stun, a slow), and their
   * target if it was the other.
   */
  private settle(d: Duel): void {
    this.remove(d);
    for (const h of [d.a, d.b]) {
      const r = d.rivalFor(h);
      if (h.target === r) {
        h.target = null;
        h.seqI = 0;
        h.bleedT = 0;
      }
      const was = d.before.get(h);
      if (!was || h.dead > 0) continue;
      h.hp = Math.max(1, Math.min(h.hpMax, was.hp));
      h.mp = Math.min(h.mpMax, was.mp);
      h.stunT = 0;
      h.slowT = 0;
    }
  }

  private remove(d: Duel): void {
    this.list = this.list.filter(x => x !== d);
  }

  /** What `h` sees of their duel (or challenge), or null. */
  view(h: Hero): DuelView | null {
    const d = this.of(h);
    if (!d) return null;
    const o = d.other(h);
    return {
      st: d.state,
      id: o.id,
      name: o.name,
      mine: d.a === h,
      t: Math.round(d.t * 10) / 10,
      x: Math.round(d.x),
      y: Math.round(d.y),
      out: Math.round((d.out.get(h) ?? 0) * 10) / 10,
    };
  }

  /** The duels with a flag in region `id` (the count and the fight). */
  flags(id: string): DuelFlag[] {
    return this.list
      .filter(d => d.state !== 'ask' && d.a.regionId === id)
      .map(d => [Math.round(d.x), Math.round(d.y), d.a.id, d.b.id, d.state === 'fight' ? 1 : 0]);
  }
}
