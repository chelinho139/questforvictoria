import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/sim/Game';
import { SAVE_VERSION, mergeStory, readableSave } from '../src/sim/save';
import type { SaveData } from '../src/sim/save';
import { gameWith } from './helpers';

function played(): { game: Game; save: SaveData } {
  const { game, heroes } = gameWith('Wren');
  const h = heroes[0];
  h.gainXp(200);
  h.gold = 42;
  h.give('meat', 3);
  game.setFlag('heard_herald');
  game.acceptQuest('slime_meadow', h);
  return { game, save: game.toSave(h) };
}

test('a save comes back as it was: hero, story and place', () => {
  const { save } = played();
  const game = new Game();
  const h = game.addHero('h', 'Wren');
  assert.ok(game.loadSave(save, h));
  assert.equal(h.level, save.level);
  assert.equal(h.gold, 42);
  assert.equal(h.count('meat'), 3);
  assert.equal(game.flags.heard_herald, 1);
  assert.equal(game.quests.slime_meadow.state, 'active');
  assert.equal(h.regionId, save.region);
  assert.deepEqual([Math.round(h.x), Math.round(h.y)], [Math.round(save.x), Math.round(save.y)]);
});

test("saves this version can't read are refused", () => {
  const { save } = played();
  const game = new Game();
  const h = game.addHero('h', 'Wren');
  assert.equal(readableSave(null), false);
  assert.equal(game.loadSave({ ...save, v: SAVE_VERSION + 1 }, h), false);
  assert.equal(game.loadSave({ ...save, region: 'atlantis' }, h), false);
});

test('an old save loses quests and items the game no longer has', () => {
  const { save } = played();
  const old = structuredClone(save);
  old.quests.gone_quest = { state: 'active', count: [0] };
  old.bag[5] = { id: 'gone_item' as never, n: 1 };
  const game = new Game();
  const h = game.addHero('h', 'Wren');
  assert.ok(game.loadSave(old, h));
  assert.equal(game.quests.gone_quest, undefined);
  assert.equal(h.bag[5], null);
});

test("joining someone's game brings the hero, not their story or place", () => {
  const { save } = played();
  const { game, heroes } = gameWith('Host');
  const j = game.addHero('j', 'Wren');
  assert.ok(game.loadHero(save, j));
  assert.equal(j.level, save.level);
  assert.equal(j.gold, 42);
  assert.equal(j.hp, j.hpMax);
  assert.equal(game.flags.heard_herald, undefined);
  assert.equal(j.regionId, heroes[0].regionId);
});

test('the story a guest takes home: the room wins, done stays done, documents stack up', () => {
  const { save: own } = played();
  own.quests.slime_meadow = { state: 'done', count: [3] };
  own.journal = ['page_a'];
  own.flags = { mine: 1, shared: 1 };
  const room: SaveData = {
    ...own,
    quests: {
      slime_meadow: { state: 'active', count: [1] },
      warm_meal: { state: 'active', count: [0] },
    },
    flags: { shared: 0, theirs: 1 },
    journal: ['page_b', 'page_a'],
  };
  const merged = mergeStory(own, room);
  assert.equal(merged.quests.slime_meadow.state, 'done');
  assert.equal(merged.quests.warm_meal.state, 'active');
  assert.deepEqual(merged.flags, { mine: 1, shared: 0, theirs: 1 });
  assert.deepEqual(merged.journal, ['page_a', 'page_b']);
});
