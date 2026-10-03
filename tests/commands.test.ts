import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMMANDS, DEV_COMMANDS } from '../src/net/commands';
import { gameWith } from './helpers';

/** Things a hostile or broken browser might send as arguments. */
const JUNK: unknown[][] = [
  [],
  [null],
  [-1],
  [1e9],
  ['x'.repeat(500)],
  [{}],
  [[1, 2]],
  ['__proto__'],
  [NaN],
  [true],
];

test('every command shrugs off junk arguments', () => {
  const { game, heroes } = gameWith('Ana');
  const h = heroes[0];
  for (const [name, fn] of Object.entries({ ...COMMANDS, ...DEV_COMMANDS }))
    for (const a of JUNK) assert.doesNotThrow(() => fn(h, a), `${name}(${JSON.stringify(a)})`);
  // and nothing silly happened
  assert.equal(h.regionId, 'greenmarch');
  assert.ok(h.gold < 1e6);
  assert.equal(game.heroes.length, 1);
});

test('commands do what they say with good arguments', () => {
  const { game, heroes } = gameWith('Ana');
  const h = heroes[0];
  COMMANDS.acceptQuest(h, ['slime_meadow']);
  assert.equal(h.questLog.get('slime_meadow'), 'active');
  const slime = h.region.enemies.find(e => e.alive)!;
  COMMANDS.setTarget(h, [slime.id]);
  assert.equal(h.target, slime);
  COMMANDS.setTarget(h, [null]);
  assert.equal(h.target, null);
  assert.equal(game.questStatus('slime_meadow', h), 'active');
});

test('travel only goes where the hero is actually leaving for', () => {
  const { heroes } = gameWith('Ana');
  const h = heroes[0];
  COMMANDS.travel(h, ['millbrook', 'south']);
  assert.equal(h.regionId, 'greenmarch', 'not standing in an exit');
  h.exiting = { to: 'millbrook', at: 'south' };
  COMMANDS.travel(h, []);
  assert.equal(h.regionId, 'millbrook');
});

test('dev commands are a separate list (the server only takes them in development)', () => {
  for (const name of ['gainXp', 'killAllEnemies', 'enterRegion', 'setFlag', 'cheats'])
    assert.equal(Object.prototype.hasOwnProperty.call(COMMANDS, name), false, name);
  const { heroes } = gameWith('Ana');
  DEV_COMMANDS.enterRegion(heroes[0], ['atlantis', 'start']);
  assert.equal(heroes[0].regionId, 'greenmarch');
});
