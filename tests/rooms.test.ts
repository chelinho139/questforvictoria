import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameWith, run } from './helpers';

test('free roaming: heroes in different regions, each region running', () => {
  const { game, heroes } = gameWith('Ana', 'Bo');
  game.moveHero(heroes[1], 'millbrook', 'south');
  assert.equal(heroes[0].regionId, 'greenmarch');
  assert.equal(heroes[1].regionId, 'millbrook');
  assert.deepEqual([...game.regions.keys()].sort(), ['greenmarch', 'millbrook']);
  run(game, 5);
  assert.ok(game.regions.get('millbrook')!.enemies.length > 0);
});

test('a region closes when its last hero leaves, and remembers what was built', () => {
  const { game, heroes } = gameWith('Ana', 'Bo');
  const [a, b] = heroes;
  const r = a.region;
  r.build('campfire', Math.floor(a.x / 32) + 2, Math.floor(a.y / 32));
  game.moveHero(a, 'millbrook', 'south');
  assert.ok(game.regions.has('greenmarch'), 'Bo is still there');
  game.moveHero(b, 'millbrook', 'south');
  assert.equal(game.regions.has('greenmarch'), false);
  assert.equal(game.regionMemory.get('greenmarch')?.structures.length, 1);
  game.moveHero(a, 'greenmarch', 'start');
  assert.equal(a.region.structures.length, 1);
});

test("the server checks a browser's steps: walking yes, jumps and walls no", () => {
  const { heroes } = gameWith('Ana');
  const h = heroes[0];
  h.driven = 'remote';
  const { x, y } = h;
  assert.ok(h.applyMove(x + 5, y, 1, 1, -1, false, 0.05), 'a step');
  const tp = h.tp;
  assert.equal(h.applyMove(x + 600, y, 1, 1, -1, false, 0.05), false, 'too far for the time');
  assert.equal(h.tp, tp + 1, 'and the browser is told to snap back');
  assert.equal(h.applyMove(-500, -500, 1, 1, -1, false, 1), false, 'off the map');
  assert.deepEqual([h.x, h.y], [x + 5, y]);
});

test('loot is personal: only its owner can pick it up', () => {
  const { game, heroes } = gameWith('Ana', 'Bo');
  const [a, b] = heroes;
  const meatA = a.count('meat');
  const meatB = b.count('meat');
  // drop it away from everyone and let it land, then put both heroes on it
  a.region.spawnDrop(a.x + 120, a.y, 'meat', b.id);
  run(game, 0.6);
  const d = a.region.drops[0];
  a.x = b.x = d.x;
  a.y = b.y = d.y;
  run(game, 0.2);
  assert.equal(a.count('meat'), meatA);
  assert.equal(b.count('meat'), meatB + 1);
});

test('a hero dying in a room comes back on their own', () => {
  const { game, heroes } = gameWith('Ana', 'Bo');
  heroes[0].hurt(10_000, 'test');
  assert.ok(heroes[0].dead > 0);
  assert.equal(heroes[1].dead, 0);
  run(game, 15);
  assert.equal(heroes[0].dead, 0);
  assert.equal(heroes[0].hp, heroes[0].hpMax);
});
