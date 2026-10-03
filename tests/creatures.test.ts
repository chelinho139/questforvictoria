import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/sim/Game';
import type { Hero } from '../src/sim/Hero';
import type { Enemy } from '../src/sim/types';
import { ITEMS, sellValue } from '../src/data/items';
import type { ItemId } from '../src/data/items';
import { KINDS } from '../src/data/enemies';
import type { EnemyKind } from '../src/data/enemies';
import { NPCS } from '../src/data/npcs';
import type { NpcId } from '../src/data/npcs';
import { skipScenes, run, standBy } from './helpers';

/** A hero alone in the meadow (the region's creatures cleared away), in daylight. */
function alone(): { game: Game; h: Hero } {
  const game = new Game();
  const h = game.addHero('h', 'Test');
  skipScenes(game);
  h.region.enemies = [];
  h.hp = h.hpMax;
  return { game, h };
}

/** An open spot `d` px from (x, y), for a creature's box. */
function openSpot(h: Hero, x: number, y: number, d: number): { x: number; y: number } {
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const p = { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d };
    if (!h.region.map.blocked(p.x, p.y, 14, 12)) return p;
  }
  throw new Error('no open spot');
}

/** A goblin fighting the hero right where it stands, with its post `far` px away. */
function goblinFrom(h: Hero, far: number): Enemy {
  const at = openSpot(h, h.x, h.y, 30);
  const e = h.region.spawnEnemy('goblin', at.x, at.y);
  const post = openSpot(h, at.x, at.y, far);
  e.sx = post.x;
  e.sy = post.y;
  e.aggro = true;
  e.foe = h.id;
  h.region.enemies.push(e);
  return e;
}

test('a creature dragged too far from its post walks home, untouchable, and is whole again there', () => {
  const { game, h } = alone();
  const e = goblinFrom(h, 420);
  e.hp = 40;
  run(game, 0.1);
  assert.ok(e.homeT > 0, 'it gives up the chase');
  assert.equal(e.aggro, false);
  // blows don't land on the way (they used to be soaked by a reset to full health every frame)
  const before = e.hp;
  h.dmgEnemy(e, 30, '');
  assert.ok(e.hp >= before, 'the hit is evaded');
  assert.ok(e.alive);
  run(game, 9);
  assert.equal(e.homeT, 0, 'it is back');
  assert.equal(e.hp, e.hpMax);
  assert.ok(Math.hypot(e.x - e.sx, e.y - e.sy) < 4, 'at its post');
  // and it fights again once it is home
  e.hp = 100;
  h.dmgEnemy(e, 30, '');
  assert.equal(e.hp, 100 - 30 - h.gear.atk);
});

test('a creature left far from its post when its foe dies goes home too', () => {
  const { game, h } = alone();
  const e = goblinFrom(h, 220);
  run(game, 0.1);
  assert.equal(e.homeT, 0, 'within its leash it keeps fighting');
  h.hurt(9999, 'a test');
  run(game, 0.1);
  assert.ok(e.homeT > 0, 'nobody to fight: back to the post');
});

test('kills pay a few coins at most, and beasts none', () => {
  for (const [kind, k] of Object.entries(KINDS)) {
    if (k.boss) continue;
    assert.ok(k.gold[0] <= k.gold[1], kind);
    assert.ok(k.gold[1] <= 8, `${kind} carries at most a few coins`);
  }
  assert.deepEqual(KINDS.cow.gold, [0, 0]);
  const { game, h } = alone();
  let gold = 0;
  for (let i = 0; i < 40; i++) {
    const e = h.region.spawnEnemy('slime', h.x + 20, h.y, true);
    h.region.enemies.push(e);
    const g0 = h.gold;
    h.dmgEnemy(e, 9999, '');
    gold += h.gold - g0;
    run(game, 0.05);
  }
  assert.ok(gold > 0 && gold <= 40, `forty slimes paid ${gold}`);
});

test('traders pay a twentieth of the price, and nothing for what is worth less than a coin to them', () => {
  assert.equal(sellValue('iron_sword'), Math.floor(ITEMS.iron_sword.price! / 20));
  assert.equal(sellValue('log'), 0);
  assert.equal(sellValue('edric_helm'), 0, 'unique gear has no price');
  const { game, h } = alone();
  game.moveHero(h, 'millbrook', 'south');
  const trader = (Object.keys(NPCS) as NpcId[]).find(id => NPCS[id].shop && h.region.npcs.some(n => n.id === id));
  assert.ok(trader, 'a trader in Millbrook');
  standBy(h, trader);
  h.give('iron_sword');
  h.give('log');
  const g0 = h.gold;
  assert.equal(h.sell(trader, h.bag.findIndex(s => s?.id === 'log')), false);
  assert.equal(h.sell(trader, h.bag.findIndex(s => s?.id === 'iron_sword')), true);
  assert.equal(h.gold - g0, sellValue('iron_sword'));
});

/** Kills, on average, until every one of these items has dropped at least once (inclusion–exclusion over the chances). */
function killsForAll(kind: EnemyKind, items: ItemId[]): number {
  const p = items.map(id => KINDS[kind].loot!.find(([i]) => i === id)![3] ?? 1);
  let sum = 0;
  for (let mask = 1; mask < 1 << p.length; mask++) {
    const picked = p.filter((_, i) => mask & (1 << i));
    sum += (picked.length % 2 ? 1 : -1) / picked.reduce((a, b) => a + b, 0);
  }
  return sum;
}

test('gear is a lucky find: a full iron set takes many nights of skeletons', () => {
  // it used to take about 15 kills, a single night
  const iron = killsForAll('skeleton', ['iron_helm', 'chainmail', 'iron_greaves']);
  assert.ok(iron > 60, `a helm, chainmail and greaves in about ${iron.toFixed(0)} kills`);
  const leather = killsForAll('slime', ['leather_cap', 'leather_tunic', 'leather_trousers', 'leather_boots']);
  assert.ok(leather > 60, `the leather set in about ${leather.toFixed(0)} slimes`);
  for (const [kind, k] of Object.entries(KINDS))
    for (const [id, , , chance = 1] of k.loot ?? [])
      if (ITEMS[id].slot) assert.ok(chance <= 0.1, `${kind} drops ${id} ${chance * 100}% of the time`);
});
