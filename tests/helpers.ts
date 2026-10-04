import { Game } from '../src/sim/Game';
import type { Hero } from '../src/sim/Hero';
import type { Enemy } from '../src/sim/types';
import { RECIPES } from '../src/data/crafting';
import { REGIONS } from '../src/data/regions';
import type { RegionDef } from '../src/data/regions';
import { KINDS } from '../src/data/enemies';
import type { EnemyDef, EnemyKind } from '../src/data/enemies';

/** A game with these heroes in it (in the Greenmarch), the opening scene clicked through. */
export function gameWith(...names: string[]): { game: Game; heroes: Hero[] } {
  const game = new Game();
  const heroes = names.map((n, i) => game.addHero('h' + i, n));
  skipScenes(game);
  return { game, heroes };
}

/** Click through any scene playing where the heroes are (some steps wait a moment, so the clock runs too). */
export function skipScenes(game: Game): void {
  for (let i = 0; i < 400; i++) {
    const h = game.heroes.find(x => x.inScene);
    if (!h) return;
    h.region.sceneNext();
    game.tick(0.25);
  }
  throw new Error('a scene never ended');
}

/** Put a hero right next to an NPC of their region (to talk, trade or hand a quest in). */
export function standBy(h: Hero, npc: string): void {
  const n = h.region.npcs.find(x => x.id === npc);
  if (!n) throw new Error(`no ${npc} in ${h.regionId}`);
  h.x = n.x + 14;
  h.y = n.y + 4;
}

/** Run the game for this many seconds, in server-sized steps. */
export function run(game: Game, seconds: number): void {
  for (let t = 0; t < seconds; t += 0.05) game.tick(0.05);
}

/** Make a recipe and wait until it's made (crafting takes time). False when it couldn't start. */
export function make(game: Game, h: Hero, id: string): boolean {
  if (!h.craft(id)) return false;
  run(game, RECIPES.find(r => r.id === id)!.time + 0.1);
  return true;
}

/** A localStorage for Node (the browser's single-player characters live there). */
export function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: k => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: k => void m.delete(k),
    key: i => [...m.keys()][i] ?? null,
  };
}

/**
 * An open field for testing (30 × 30 tiles of grass inside a hedge, `start` in the middle),
 * registered as region `id`, with `extra` on top.
 */
export function testField(id: string, extra: Partial<RegionDef> = {}): RegionDef {
  const layout = Array.from({ length: 30 }, (_, i) => (i === 0 || i === 29 ? 'T'.repeat(30) : 'T' + '.'.repeat(28) + 'T'));
  const def: RegionDef = { name: 'Test ' + id, ring: 1, layout, spots: { start: [15, 15] }, exits: [], spawns: [], npcs: [], ...extra };
  (REGIONS as Record<string, RegionDef>)[id] = def;
  return def;
}

/** A creature kind for testing: a plain hostile one with `extra` on top, registered as `name`. */
export function testKind(name: string, extra: Partial<EnemyDef> = {}): EnemyKind {
  (KINDS as Record<string, EnemyDef>)[name] = {
    n: name,
    hp: 200,
    atk: 10,
    per: 1.5,
    spd: 60,
    range: 36,
    aggro: 120,
    scale: 2,
    tex: 'goblin0',
    behavior: 'hostile',
    sounds: { hurt: 'goblinHurt', die: 'goblinDie' },
    gold: [0, 0],
    xp: 10,
    ...extra,
  };
  return name as EnemyKind;
}

/** A game with heroes standing in a region (a test field: no opening scene), at noon. */
export function heroesIn(region: string, n = 1): { game: Game; heroes: Hero[]; h: Hero } {
  const game = new Game();
  const heroes = Array.from({ length: n }, (_, i) => game.addHero('h' + i, 'Hero ' + i, region));
  skipScenes(game);
  game.day.t = 0.5;
  return { game, heroes, h: heroes[0] };
}

/** A creature of `kind` put down `dx`, `dy` px from a hero. */
export function spawnBy(h: Hero, kind: EnemyKind, dx: number, dy = 0): Enemy {
  const e = h.region.spawnEnemy(kind, h.x + dx, h.y + dy);
  h.region.enemies.push(e);
  return e;
}
