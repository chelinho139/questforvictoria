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

test('alone, a fallen hero comes back on their own', () => {
  const { game, heroes } = gameWith('Ana');
  heroes[0].hurt(10_000, 'test');
  assert.ok(heroes[0].dead > 0);
  run(game, 3);
  assert.equal(heroes[0].dead, 0);
  assert.equal(heroes[0].hp, heroes[0].hpMax);
});

test('with a friend up, a fallen hero lies there; once nobody is standing, all wake at camp', () => {
  const { game, heroes } = gameWith('Ana', 'Bo');
  const [a, b] = heroes;
  a.hurt(10_000, 'test');
  run(game, 15);
  assert.ok(a.dead > 0 && a.down, 'still down, waiting');
  assert.equal(b.dead, 0);
  b.x = a.x + 120;
  assert.match(b.canDo('revive')!, /fallen friend/, 'too far to revive');
  b.hurt(10_000, 'test');
  run(game, 3);
  assert.deepEqual([a.dead, b.dead, a.down, b.down], [0, 0, false, false], 'both back');
  assert.equal(a.hp, a.hpMax);
});

test('Revive: a long cast by the fallen friend brings them back with some health', () => {
  const { game, heroes } = gameWith('Ana', 'Bo');
  const [a, b] = heroes;
  a.hurt(10_000, 'test');
  run(game, 3);
  b.x = a.x + 20;
  b.y = a.y;
  assert.ok(b.castKey('revive'));
  assert.equal(b.work?.kind, 'revive', 'a progress bar');
  run(game, 5);
  assert.ok(a.down, 'not yet');
  run(game, 3.5);
  assert.equal(a.down, false);
  assert.equal(a.dead, 0);
  assert.equal(a.hp, Math.round(a.hpMax * 0.4));
});

test('Revive is broken by a step or a blow', () => {
  const { game, heroes } = gameWith('Ana', 'Bo');
  const [a, b] = heroes;
  a.hurt(10_000, 'test');
  run(game, 3);
  b.x = a.x + 20;
  b.y = a.y;
  assert.ok(b.castKey('revive'));
  run(game, 2);
  b.moveTo(b.x + 60, b.y, false);
  run(game, 0.3);
  assert.equal(b.reviveT, 0, 'a step breaks it');
  b.stopMoving();
  b.x = a.x + 20;
  b.y = a.y;
  run(game, 0.3);
  assert.ok(b.castKey('revive'));
  run(game, 2);
  b.hurt(5, 'a goblin');
  assert.equal(b.reviveT, 0, 'a blow breaks it');
  assert.ok(a.down, 'still down');
});

test('more heroes, tougher creatures: health and blows scale with the heroes in the region, both ways', async () => {
  const { DIFFICULTIES } = await import('../src/data/difficulty');
  const { game, heroes } = gameWith('Ana');
  const [a] = heroes;
  run(game, 0.1);
  const R = a.region;
  const e = R.spawnEnemy('goblin', a.x + 200, a.y, true);
  R.enemies.push(e);
  const solo = Math.round(e.def.hp * DIFFICULTIES.normal.hp);
  assert.equal(e.hpMax, solo, 'one hero: as it is');
  e.hp = Math.round(solo / 2);
  const b = game.addHero('h1', 'Bo');
  run(game, 0.1);
  assert.equal(R.party, 2);
  assert.equal(e.hpMax, Math.round(e.def.hp * DIFFICULTIES.normal.hp * 1.6), 'two heroes: 1.6× health');
  assert.ok(Math.abs(e.hp / e.hpMax - 0.5) < 0.02, 'as hurt as it was');
  assert.ok(a.logHistory.some(l => l.text.startsWith('2 heroes here')), 'everyone is told');
  // a blow lands 10% harder (on a hero with no armour)
  const full = b.hp;
  (R as unknown as { strike(f: unknown, v: number, s: string): void }).strike(b, 20, 'a test');
  const two = full - b.hp;
  game.removeHero(b);
  run(game, 0.1);
  assert.equal(R.party, 1);
  assert.equal(e.hpMax, solo, 'alone again');
  const full2 = a.hp;
  (R as unknown as { strike(f: unknown, v: number, s: string): void }).strike(a, 20, 'a test');
  assert.ok(two > full2 - a.hp, 'two heroes take harder blows than one');
});

test('fall in the bell tower and you wake on the road into Millbrook, not at the foot of his stair', () => {
  const { game, heroes } = gameWith('Ana');
  const [a] = heroes;
  game.moveHero(a, 'belltower', 'door');
  run(game, 0.2);
  a.hurt(10_000, 'the bell');
  run(game, 3);
  assert.equal(a.dead, 0);
  assert.equal(a.regionId, 'millbrook');
});
