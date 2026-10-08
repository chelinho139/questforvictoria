import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '../src/sim/Sim';
import { KINDS } from '../src/data/enemies';
import type { EnemyKind } from '../src/data/enemies';
import { DIFFICULTIES, DIFFICULTY_IDS } from '../src/data/difficulty';
import type { Difficulty } from '../src/data/difficulty';
import { COMMANDS, DEV_COMMANDS } from '../src/net/commands';
import { Session } from '../src/server/Session';
import { createLocalChar, localCharInfos, writeSave } from '../src/phaser/saveStore';
import type { LocalChar } from '../src/phaser/saveStore';
import { testField, testKind, heroesIn, spawnBy, gameWith, memoryStorage } from './helpers';

/**
 * How hard a campaign is (data/difficulty.ts): the creatures' blows and health, kept in the
 * save, chosen for a new single-player character, and online the room's (in the snapshots,
 * and changed by a dev command). Tried on creatures made for the test, in an open field.
 */

testField('d_field');
const brute = testKind('d_brute', { atk: 20, hp: 200 });
const bowman = testKind('d_bowman', { atk: 20, missile: { col: '#888', speed: 300 }, range: 170, aggro: 220, per: 4 });

/** What a blow of `v` takes off a hero (after armour), on a hero of their own. */
function blowOf(v: number): number {
  const { h } = heroesIn('d_field');
  const full = h.hp;
  h.hurt(v, 'a test');
  return full - h.hp;
}

/** What a creature's first blow takes off a hero, at this difficulty. */
function firstBlow(d: Difficulty, kind: EnemyKind, dx: number): number {
  const { game, h } = heroesIn('d_field');
  game.setDifficulty(d);
  const e = spawnBy(h, kind, dx);
  e.atkT = 0.05;
  const full = h.hp;
  for (let i = 0; i < 100 && h.hp === full; i++) game.tick(0.05);
  return full - h.hp;
}

test('normal hits as the creatures always have; hard half again as hard, nightmare twice', () => {
  assert.deepEqual(
    DIFFICULTY_IDS.map(d => DIFFICULTIES[d].dmg),
    [1, 1.5, 2]
  );
  for (const d of DIFFICULTY_IDS) {
    const k = DIFFICULTIES[d].dmg;
    assert.equal(firstBlow(d, brute, 24), blowOf(20 * k), `a blow, ${d}`);
    assert.equal(firstBlow(d, bowman, 120), blowOf(20 * k), `a bolt, ${d}`);
  }
});

test('creatures take more killing on hard and nightmare (cows as they are), and a change mid-fight leaves them as hurt as they were', () => {
  const { game, h } = heroesIn('d_field');
  game.setDifficulty('nightmare');
  const e = spawnBy(h, brute, 60);
  const cow = spawnBy(h, 'cow', -60);
  assert.deepEqual([e.hp, e.hpMax], [300, 300]);
  assert.equal(cow.hpMax, KINDS.cow.hp);
  e.hp = 150;
  game.setDifficulty('hard');
  assert.deepEqual([e.hp, e.hpMax], [120, 240]);
  game.setDifficulty('normal');
  assert.deepEqual([e.hp, e.hpMax], [100, 200]);
  assert.equal(cow.hpMax, KINDS.cow.hp);
  assert.ok(h.logHistory.some(l => l.text.startsWith('Difficulty: Normal.')), 'everyone is told');
});

test('the difficulty is kept in the save: loading brings it back (an old save is normal), starting over keeps it, and a guest leaves it at home', () => {
  const { game, heroes: [h] } = gameWith('Ann');
  game.setDifficulty('hard');
  const save = game.toSave(h);
  assert.equal(save.difficulty, 'hard');
  const other = gameWith('Ann');
  const h2 = other.heroes[0];
  assert.ok(other.game.loadSave(save, h2));
  assert.equal(other.game.difficulty, 'hard');
  const fighter = h2.region.enemies.find(e => e.def.behavior !== 'passive');
  assert.ok(fighter, 'a creature that fights');
  assert.equal(fighter.hpMax, Math.round(fighter.def.hp * DIFFICULTIES.hard.hp), 'the creatures arrive at it');
  const old = { ...save };
  delete old.difficulty;
  assert.ok(other.game.loadSave(old, h2));
  assert.equal(other.game.difficulty, 'normal', 'a save from before difficulty');
  game.reset(h);
  assert.equal(game.difficulty, 'hard', 'starting over');
  const room = gameWith('Host');
  room.game.setDifficulty('nightmare');
  assert.ok(room.game.loadHero(save, room.game.addHero('g', 'Ann')));
  assert.equal(room.game.difficulty, 'nightmare', "joining someone's game doesn't change theirs");
});

test('single player: a new character is made at the difficulty chosen, their card says it, and their game starts at it', () => {
  (globalThis as { localStorage?: Storage }).localStorage = memoryStorage();
  const made = createLocalChar('Nell', 'k1', 'archer', 'nightmare') as LocalChar;
  assert.equal(typeof made, 'object');
  const [info] = localCharInfos();
  assert.equal(info.difficulty, 'nightmare');
  const sim = new Sim();
  sim.startAs(info.cls, info.difficulty);
  assert.equal(sim.difficulty, 'nightmare');
  assert.equal(sim.hero.cls, 'archer');
  // changed in the settings: the game says so (and saves), and the card follows the save
  let heard = 0;
  sim.events.on('difficulty', () => heard++);
  sim.setDifficulty('hard');
  assert.equal(heard, 1);
  writeSave(made.id, sim.toSave());
  assert.equal(localCharInfos()[0].difficulty, 'hard');
  createLocalChar('Old', 'k1');
  assert.equal(localCharInfos()[1].difficulty, 'normal', 'made without one: normal');
});

test('online: the snapshot says how hard the room is when that changes, and only the dev command changes it (for everyone)', () => {
  const { game, heroes: [a, b] } = gameWith('A', 'B');
  const s = new Session(a);
  assert.equal(s.build(0.05).df, 'normal', 'the first snapshot');
  assert.equal(s.build(0.05).df, undefined, 'then only when it changes');
  DEV_COMMANDS.setDifficulty(b, ['nightmare']);
  assert.equal(game.difficulty, 'nightmare');
  assert.equal(s.build(0.05).df, 'nightmare');
  DEV_COMMANDS.setDifficulty(b, ['impossible']);
  assert.equal(game.difficulty, 'nightmare', 'junk is ignored');
  assert.ok(!Object.prototype.hasOwnProperty.call(COMMANDS, 'setDifficulty'), 'not a player command');
  s.dispose();
});
