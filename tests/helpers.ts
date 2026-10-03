import { Game } from '../src/sim/Game';
import type { Hero } from '../src/sim/Hero';
import { RECIPES } from '../src/data/crafting';

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
