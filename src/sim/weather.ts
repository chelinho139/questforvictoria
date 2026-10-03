/**
 * The weather: dry spells, spells of rain, and now and then a storm with lightning. Engine-free,
 * ticked by Game like the day. The schedule comes from a seed and the weather's own clock, so a
 * server and its players' browsers (which get the seed, the clock and the levels every second)
 * see the same rain and the same lightning.
 */
export type WeatherKind = 'clear' | 'rain' | 'storm';
export const WEATHER_KINDS: WeatherKind[] = ['clear', 'rain', 'storm'];
export const WEATHER_NAMES: Record<WeatherKind, string> = { clear: 'Clear', rain: 'Rain', storm: 'Storm' };

/** Seconds between lightning candidates; each fires with a chance that grows with the storm. */
export const STRIKE_STEP = 7;

/**
 * A flash of lightning. `dist` sets how it is seen and heard: near strikes come down in sight
 * with a crack at once; mid ones light the sky and their thunder follows; far ones are a dim
 * flicker and a rumble long after.
 */
export interface Strike {
  id: number;
  dist: 'near' | 'mid' | 'far';
  /** Where it comes down, as fractions: across the view (0..1) and how far down it (0..1). */
  u: number;
  v: number;
  /** 0..1, for the flash's strength and the thunder's take. */
  power: number;
}

/** One stretch of weather: when it starts and ends (weather seconds), what it is, how hard it rains. */
interface Spell {
  i: number;
  start: number;
  end: number;
  kind: WeatherKind;
  level: number;
}

/** A number in 0..1 from a seed and two indices (the same everywhere). */
export function hash01(seed: number, a: number, b: number): number {
  let h = (seed ^ Math.imul(a + 0x9e37, 0x85ebca6b) ^ Math.imul(b + 0x7f4a, 0xc2b2ae35)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export class Weather {
  /** The weather's clock (seconds since this game began). */
  t = 0;
  /** How hard it rains (0 dry .. 1 pouring) and how stormy it is (0..1): eased toward the spell's. */
  rain = 0;
  storm = 0;
  /** The rain's slant: negative blows left on the screen, positive right. */
  wind = 0.2;
  /** Dev: weather held whatever the schedule says (null: the schedule). */
  forced: WeatherKind | null = null;
  /** Lightning lately (newest last; the screen keeps track of the ids it has shown). */
  readonly strikes: Strike[] = [];
  /** Named weather, with some give so it doesn't flip back and forth at the edges. */
  kind: WeatherKind = 'clear';
  private spell: Spell;
  /** The next lightning candidate to look at. */
  private nextK = 1;
  private nextId = 1;

  constructor(public seed = (Math.random() * 2 ** 31) | 0) {
    this.spell = this.spellAt(0);
  }

  /** Start from another seed (a server's): the schedule starts over from the clock as it is. */
  setSeed(seed: number): void {
    this.seed = seed;
    this.spell = this.spellAt(this.t);
  }

  /** The `i`th spell, starting at `start`: a dry one first, then wet and dry by turns. */
  private makeSpell(i: number, start: number): Spell {
    const h = (k: number) => hash01(this.seed, i, k);
    if (i === 0) return { i, start, end: start + 240 + 180 * h(0), kind: 'clear', level: 0 };
    // dry spells of 10 to 30 minutes: rain on a bit over half the days (a day is 10 minutes), a storm on one in five
    if (i % 2 === 0) return { i, start, end: start + 600 + 1200 * h(0), kind: 'clear', level: 0 };
    // a storm lasts longer: it needs time to build and blow over
    const storm = h(1) < 0.4;
    return { i, start, end: start + (storm ? 160 + 160 * h(0) : 100 + 140 * h(0)), kind: storm ? 'storm' : 'rain', level: storm ? 1 : 0.5 + 0.4 * h(2) };
  }

  /** The spell under weather time `t` (walking on from the one before, or from the start). */
  private spellAt(t: number): Spell {
    let s = this.spell && this.spell.start <= t ? this.spell : this.makeSpell(0, 0);
    while (t >= s.end) s = this.makeSpell(s.i + 1, s.end);
    return s;
  }

  /** What the weather is heading for now: rain and storm levels, and the wind's. */
  target(): { rain: number; storm: number; wind: number } {
    const f = this.forced;
    if (f) return { rain: f === 'clear' ? 0 : f === 'rain' ? 0.75 : 1, storm: f === 'storm' ? 1 : 0, wind: f === 'storm' ? 1 : 0.25 };
    const s = this.spell;
    const side = hash01(this.seed, s.i, 3) < 0.5 ? -1 : 1;
    if (s.kind === 'clear') return { rain: 0, storm: 0, wind: side * 0.2 };
    // a storm builds up after the rain has begun, and blows over before it stops
    const storm = s.kind === 'storm' && this.t >= s.start + 25 && this.t < s.end - 35 ? 1 : 0;
    return { rain: s.level, storm, wind: side * (0.25 + 0.75 * storm) };
  }

  /** The weather a spell brings, by name (what the schedule is heading for). */
  get coming(): WeatherKind {
    return this.forced ?? this.spell.kind;
  }

  advance(dt: number): void {
    if (!(dt > 0)) return;
    this.t += dt;
    this.spell = this.spellAt(this.t);
    const goal = this.target();
    // the schedule changes slowly; a dev switch quickly
    const k = this.forced ? 4 : 1;
    this.rain = ease(this.rain, goal.rain, (goal.rain > this.rain ? 1 / 18 : 1 / 25) * k * dt);
    this.storm = ease(this.storm, goal.storm, (goal.storm > this.storm ? 1 / 15 : 1 / 20) * k * dt);
    this.wind = ease(this.wind, goal.wind, 0.08 * k * dt);
    this.name();
    this.lightning();
  }

  /** Clear, rain or storm, by the levels, with thresholds that overlap. */
  private name(): void {
    const k = this.kind;
    if (this.storm > 0.35 || (k === 'storm' && this.storm > 0.15)) this.kind = 'storm';
    else if (this.rain > 0.15 || (k !== 'clear' && this.rain > 0.06)) this.kind = 'rain';
    else this.kind = 'clear';
  }

  /** Lightning: one candidate every STRIKE_STEP seconds (at a seeded moment in it), struck by chance. */
  private lightning(): void {
    const now = Math.floor(this.t / STRIKE_STEP);
    // a jump of the clock (joining a room) doesn't play back the storm missed
    if (now - this.nextK > 2) this.nextK = now;
    for (;;) {
      const k = this.nextK;
      const at = (k + 0.1 + 0.8 * hash01(this.seed, k, 101)) * STRIKE_STEP;
      if (at > this.t) break;
      this.nextK = k + 1;
      if (this.storm < 0.35 || hash01(this.seed, k, 102) >= 0.8 * this.storm) continue;
      const d = hash01(this.seed, k, 103);
      this.push({ dist: d < 0.3 ? 'near' : d < 0.68 ? 'mid' : 'far', u: hash01(this.seed, k, 104), v: hash01(this.seed, k, 105), power: hash01(this.seed, k, 106) });
    }
  }

  /** Dev: lightning now (only here: online, only this player sees it). */
  strikeNow(dist: Strike['dist'] = 'near'): void {
    this.push({ dist, u: 0.2 + Math.random() * 0.6, v: 0.25 + Math.random() * 0.5, power: Math.random() });
  }

  private push(s: Omit<Strike, 'id'>): void {
    this.strikes.push({ id: this.nextId++, ...s });
    if (this.strikes.length > 8) this.strikes.shift();
  }

  /** What a browser needs to follow the server's weather: [clock, seed, rain, storm, wind, forced]. */
  snapshot(): [number, number, number, number, number, number] {
    const r = (v: number) => Math.round(v * 1000) / 1000;
    return [r(this.t), this.seed, r(this.rain), r(this.storm), r(this.wind), this.forced ? WEATHER_KINDS.indexOf(this.forced) : -1];
  }

  /** Follow a server's weather (see snapshot). */
  follow([t, seed, rain, storm, wind, forced]: [number, number, number, number, number, number]): void {
    this.t = t;
    if (seed !== this.seed) this.setSeed(seed);
    else this.spell = this.spellAt(t);
    this.rain = rain;
    this.storm = storm;
    this.wind = wind;
    this.forced = WEATHER_KINDS[forced] ?? null;
    this.name();
  }
}

function ease(v: number, goal: number, step: number): number {
  return v < goal ? Math.min(goal, v + step) : Math.max(goal, v - step);
}
