import { test } from 'node:test';
import assert from 'node:assert/strict';
import { faceToward } from '../src/sim/map';
import { testField, testKind, heroesIn, spawnBy, run } from './helpers';

/**
 * What the creatures of the wood do (data/enemies.ts, sim/Region.ts): shields, bolts, webs,
 * ambushes, snares, riders, eggs, howls, summons, leaps, lures, smothering fires, mourners'
 * wails and songs that raise the dead. Each is tried on a creature made for the test, in an
 * open test field, at noon.
 */

testField('t_field');

test('shields up: a blow from in front glances off, one from behind lands, and a stun drops it', () => {
  const kind = testKind('t_guard', { shield: { every: 6, up: 2, cut: 0.25 }, hp: 1000 });
  const { h } = heroesIn('t_field');
  const e = spawnBy(h, kind, 40);
  e.shieldT = 2;
  e.face = faceToward(e.x, e.y, h.x, h.y, 1);
  h.region.hurtEnemy(e, 100, '', h);
  assert.equal(e.hp, 975, 'from in front, a quarter');
  e.face = e.face === 1 ? -1 : 1;
  h.region.hurtEnemy(e, 100, '', h);
  assert.equal(e.hp, 875, 'from behind, all of it');
  e.face = faceToward(e.x, e.y, h.x, h.y, 1);
  e.stunT = 1;
  h.region.hurtEnemy(e, 100, '', h);
  assert.equal(e.hp, 775, 'stunned, the shield is down');
});

test('a crossbow bolt lands and slows; step aside before it arrives and it misses', () => {
  const kind = testKind('t_xbow', {
    missile: { col: '#888', speed: 300, slow: { t: 3, k: 0.4 } },
    range: 170,
    aggro: 220,
    per: 4,
  });
  const { game, h } = heroesIn('t_field');
  const speed = h.playerSpeed;
  const e = spawnBy(h, kind, 120);
  e.atkT = 0.05;
  run(game, 0.7);
  assert.ok(h.hp < h.hpMax, 'the bolt hit');
  assert.ok(h.slowT > 0 && h.playerSpeed < speed, 'and slowed');
  // the next one: it leaves, and the hero steps aside
  h.hp = h.hpMax;
  e.atkT = 0.05;
  game.tick(0.1);
  h.x -= 60;
  run(game, 0.6);
  assert.equal(h.hp, h.hpMax, 'missed');
});

test('a spider waits unseen in the canopy, drops on whoever walks under it, and a blow knocks it down early', () => {
  const kind = testKind('t_spider', { ambush: { r: 60 } });
  const { game, h } = heroesIn('t_field');
  const e = spawnBy(h, kind, 150);
  run(game, 1);
  assert.ok(e.hid, 'still up there');
  assert.equal(h.nearestEnemy(null, 400), null, "can't be targeted");
  h.x = e.x - 10;
  h.y = e.y;
  game.tick(0.05);
  assert.equal(e.hid, false, 'it drops');
  assert.ok((e.z ?? 0) > 0, 'from the canopy');
  run(game, 0.5);
  assert.equal(e.z, 0, 'and lands');
  assert.ok(h.hp < h.hpMax, 'on the hero');
  const other = spawnBy(h, kind, -200);
  h.region.hurtEnemy(other, 5, '', h);
  assert.equal(other.hid, false, 'struck while hidden, it falls');
});

test('a web holds a hero still (keys, clicks and the server all refuse to walk them), until it lets go', () => {
  const kind = testKind('t_weaver', {
    casts: [{ what: 'web', time: 0.5, cd: 9, range: 160, hold: 2, by: 'web' }],
    firstCast: 0,
    aggro: 220,
    spd: 0,
  });
  const { game, h } = heroesIn('t_field');
  spawnBy(h, kind, 110);
  run(game, 1.2);
  assert.ok(h.heldT > 0, 'webbed');
  assert.equal(h.heldBy, 'web');
  const x0 = h.x;
  h.inputMove = { x: 1, y: 0 };
  run(game, 0.3);
  assert.equal(h.x, x0, "the keys don't move them");
  h.inputMove = { x: 0, y: 0 };
  h.driven = 'remote';
  assert.equal(
    h.applyMove(h.x + 10, h.y, 1, 0, -1, false, 0.05),
    false,
    'nor does the server let their browser'
  );
  h.driven = 'local';
  h.dodge();
  assert.equal(h.x, x0, 'no dodging out of it');
  run(game, 2);
  assert.equal(h.heldT, 0, 'free again');
  h.inputMove = { x: 1, y: 0 };
  run(game, 0.3);
  assert.ok(h.x > x0, 'walking');
});

test('a web cast cut short (Interrupt, a stun) never lands', () => {
  const kind = testKind('t_weaver2', {
    casts: [{ what: 'web', time: 1, cd: 9, range: 160, hold: 2, by: 'web' }],
    firstCast: 0,
    aggro: 220,
    spd: 0,
  });
  const { game, h } = heroesIn('t_field');
  const e = spawnBy(h, kind, 110);
  run(game, 0.3);
  assert.ok(e.castT > 0, 'casting');
  // what Interrupt does to a cast
  e.castT = -1;
  e.stunT = 1;
  run(game, 1.5);
  assert.equal(h.heldT, 0);
});

test('a trapper lays snares between itself and its foe; stepping in one holds you, jumping clears it', () => {
  const kind = testKind('t_trapper', { snares: { every: 1, hold: 2, max: 2 }, aggro: 300, spd: 0 });
  const { game, h } = heroesIn('t_field');
  const e = spawnBy(h, kind, 150);
  run(game, 1.6);
  const R = h.region;
  assert.ok(R.snares.length >= 1, 'a snare in the grass');
  const s = R.snares[0];
  assert.ok(
    Math.hypot(s.x - h.x, s.y - h.y) < 60 && s.x > h.x && s.x < e.x,
    'between them, not underfoot'
  );
  h.jumpT = 0;
  h.x = s.x;
  h.y = s.y;
  game.tick(0.05);
  assert.equal(h.heldT, 0, 'jumped over it');
  h.jumpT = -1;
  game.tick(0.05);
  assert.ok(h.heldT > 0 && h.heldBy === 'snare', 'caught');
  assert.ok(!R.snares.includes(s), 'and it is sprung');
});

test("a rider's mount falls and the rider fights on, on foot", () => {
  const kind = testKind('t_rider', { rider: 'goblin', hp: 50 });
  const { game, h } = heroesIn('t_field');
  const e = spawnBy(h, kind, 60);
  assert.equal(h.region.hurtEnemy(e, 999, '', h), true);
  game.tick(0.05);
  const foot = h.region.enemies.find(o => o.kind === 'goblin');
  assert.ok(foot && foot.alive && foot.temp, 'a goblin on foot');
  assert.equal(foot.foe, h.id, 'after whoever brought the mount down');
});

test('an egg sleeps until a hero comes near, then hatches unless it is burned first', () => {
  const young = testKind('t_spiderling', { hp: 20 });
  const kind = testKind('t_egg', {
    behavior: 'inert',
    hatch: { into: young, n: 3, t: 4 },
    aggro: 80,
    hp: 20,
    spd: 0,
  });
  const { game, h } = heroesIn('t_field');
  const egg = spawnBy(h, kind, 200);
  run(game, 3);
  assert.equal(egg.hatchT, undefined, 'asleep while nobody is near');
  h.x = egg.x - 60;
  game.tick(0.05);
  assert.ok((egg.hatchT ?? 0) > 3, 'a hero near wakes it');
  run(game, 4.2);
  assert.equal(egg.alive, false);
  const hatched = h.region.enemies.filter(o => o.kind === young && o.alive);
  assert.equal(hatched.length, 3, 'three spiderlings');
  assert.ok(hatched.every(o => o.aggro && o.temp));
  // burned before it hatches: a kill, and nothing crawls out
  const egg2 = spawnBy(h, kind, -70);
  game.tick(0.05);
  const kills = h.kills;
  h.dmgEnemy(egg2, 999, '');
  run(game, 5);
  assert.equal(h.kills, kills + 1);
  assert.equal(h.region.enemies.filter(o => o.kind === young).length, 3, 'no more spiderlings');
});

test('one wolf howls and the pack comes running; one too far off stays where it is', () => {
  const kind = testKind('t_wolf', { howl: { r: 200 }, aggro: 100, spd: 0 });
  const { game, h } = heroesIn('t_field');
  const near = spawnBy(h, kind, 80);
  const pack = [spawnBy(h, kind, 240), spawnBy(h, kind, 240, 60)];
  const far = spawnBy(h, kind, -300, 200);
  game.tick(0.05);
  assert.ok(near.aggro);
  assert.ok(
    pack.every(o => o.aggro && o.foe === h.id),
    'the pack heard it'
  );
  assert.equal(far.aggro, false);
});

test('a caller summons help as it fights, never more than it may have at once', () => {
  const minion = testKind('t_minion', { aggro: 300 });
  const kind = testKind('t_caller', {
    summon: { kind: minion, n: 2, every: 5, max: 3 },
    aggro: 300,
    spd: 0,
    range: 20,
  });
  const { game, h } = heroesIn('t_field');
  spawnBy(h, kind, 100);
  run(game, 2.3);
  assert.equal(h.region.enemies.filter(o => o.kind === minion && o.alive).length, 2);
  run(game, 5);
  assert.equal(
    h.region.enemies.filter(o => o.kind === minion && o.alive).length,
    3,
    'three at most'
  );
});

test('a leaper crouches, leaps at the hero furthest off and lands on them; a stun in the crouch stops it', () => {
  const kind = testKind('t_leaper', {
    leap: { every: 6, range: 320, dmg: 25 },
    aggro: 400,
    spd: 0,
    range: 20,
    atk: 1,
  });
  const { game, heroes } = heroesIn('t_field', 2);
  const [near, far] = heroes;
  far.x += 200;
  const e = spawnBy(near, kind, -80);
  run(game, 3.1);
  assert.ok(e.leap, 'crouching');
  assert.equal(e.leap!.at, far.id, 'at the one furthest off');
  run(game, 1.2);
  assert.equal(e.leap, undefined, 'landed');
  assert.ok(Math.hypot(e.x - far.x, e.y - far.y) < 30, 'beside them');
  assert.ok(far.hp <= far.hpMax - 20, 'on them (less a little for armour)');
  // the next leap, broken in the crouch
  e.leapCd = 0;
  far.x += 200;
  game.tick(0.05);
  assert.ok(e.leap);
  e.stunT = 1;
  game.tick(0.05);
  assert.equal(e.leap, undefined, 'the stun broke the crouch');
});

test('a lure drifts away toward its place as you come near, blinks on when struck, and never fights', () => {
  const kind = testKind('t_light', { lure: { r: 120 }, spd: 50, hp: 60 });
  testField('t_lights', { spawns: [{ kind, at: [15, 10], to: [15, 3] }] });
  const { game, h } = heroesIn('t_lights');
  const e = h.region.enemies[0];
  const y0 = e.y;
  run(game, 2);
  assert.equal(e.y, y0, 'left alone, it stays');
  // come near and it drifts off north, toward its place, keeping just out of reach
  h.y = e.y + 100;
  run(game, 1);
  assert.ok(e.y < y0 - 10, 'drifting off');
  assert.ok(Math.hypot(h.x - e.x, h.y - e.y) <= 125, 'only just ahead');
  h.moveTo(e.lx!, e.ly!);
  run(game, 1.5);
  assert.ok(e.y < y0 - 60, 'follow it, and it leads you on');
  const at = { x: e.x, y: e.y };
  h.region.hurtEnemy(e, 1, '', h);
  assert.ok(Math.hypot(e.x - at.x, e.y - at.y) >= 30, 'struck, it blinks on');
  h.x = e.x;
  h.y = e.y + 20;
  run(game, 3);
  assert.equal(h.hp, h.hpMax, 'it never fights');
  assert.equal(e.aggro, false);
});

test('a smotherer goes for the fire before the hero, and puts it out unless it dies first', () => {
  const kind = testKind('t_smother', { smother: { t: 3 }, aggro: 300, spd: 80 });
  testField('t_kilns', {
    structures: [
      { kind: 'campfire', at: [10, 15] },
      { kind: 'campfire', at: [20, 15] },
    ],
  });
  const { game, h } = heroesIn('t_kilns');
  const R = h.region;
  const [west, east] = R.structures;
  assert.ok(west.fixed && R.burning(west), "the region's own fires burn");
  const a = spawnBy(h, kind, -150 + 60);
  run(game, 6);
  assert.equal(h.hp, h.hpMax, 'it never touched the hero');
  assert.ok(west.out, 'the fire is out');
  // the other one: killed while it lies on the fire, and the fire lives
  const b = spawnBy(h, kind, 150 - 60);
  run(game, 2.5);
  assert.ok(b.lying, 'lying on it');
  assert.ok((east.smother ?? 0) > 0, 'smothering');
  h.dmgEnemy(b, 9999, '');
  game.tick(0.05);
  assert.ok(R.burning(east), 'still burning');
  assert.equal(east.smother, 0);
  // a campfire someone built goes for good
  h.dmgEnemy(a, 9999, '');
  const built = R.build('campfire', 15, 18);
  const c = spawnBy(h, kind, 0, 60);
  run(game, 5);
  assert.equal(c.alive, true);
  assert.ok(!R.structures.includes(built), 'a built campfire is gone');
});

test("a mourner's wail heals the dead around it, and a song gets the fallen up again", () => {
  const dead = testKind('t_dead', { dead: true, hp: 500, spd: 0, aggro: 300, atk: 1 });
  const mourner = testKind('t_mourner', {
    dead: true,
    casts: [{ what: 'heal', time: 1, cd: 4, range: 400, amt: 50, r: 200 }],
    firstCast: 0,
    spd: 0,
    aggro: 300,
    atk: 1,
  });
  const { game, h } = heroesIn('t_field');
  const d = spawnBy(h, dead, 80);
  d.hp = 300;
  spawnBy(h, mourner, 120);
  run(game, 1.6);
  assert.equal(d.hp, 350, 'healed');

  const singer = testKind('t_singer', {
    casts: [{ what: 'raise', time: 1, cd: 4, range: 400, r: 200 }],
    firstCast: 0,
    spd: 0,
    aggro: 300,
    atk: 1,
  });
  const { game: g2, h: h2 } = heroesIn('t_field');
  const fallen = spawnBy(h2, dead, 80);
  spawnBy(h2, singer, 120);
  h2.region.hurtEnemy(fallen, 9999, '', h2);
  run(g2, 1.6);
  const raised = h2.region.enemies.filter(o => o.kind === dead && o.alive);
  assert.equal(raised.length, 1, 'the fallen one is up again');
  assert.ok(
    raised[0].temp && Math.hypot(raised[0].x - fallen.x, raised[0].y - fallen.y) < 1,
    'where it fell'
  );
});

test('the night comes earlier from ring 2, and under the grave-mist the dead walk by day', () => {
  testField('t_ring2', { ring: 2 });
  const night = testKind('t_night', { nightOnly: true, dead: true });
  testField('t_mist', { ring: 2, dusk: true });
  const { game: g1, h: a } = heroesIn('t_field');
  const { game: g2, h: b } = heroesIn('t_ring2');
  g1.day.t = g2.day.t = 0.78;
  assert.equal(a.region.isNight, false, 'ring 1: still day');
  assert.equal(b.region.isNight, true, 'ring 2: already night');
  const { game: g3, h: c } = heroesIn('t_mist');
  assert.equal(c.region.isNight, true, 'noon, under the mist');
  const e = spawnBy(c, night, 300);
  run(g3, 5);
  assert.ok(e.alive, "it doesn't crumble");
});
