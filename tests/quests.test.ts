import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/sim/Game';
import { QUESTS } from '../src/data/quests';
import { gameWith, standBy, skipScenes } from './helpers';

// Aldric's first quest: kill 3 slimes, for 15 gold, 20 XP and leather boots.
const Q = 'slime_meadow';
const NEXT = Object.keys(QUESTS).find(id => QUESTS[id].requires === Q)!;

function slimesSlain(game: Game, n = 3): void {
  for (let i = 0; i < n; i++) game.questEvent('kill', 'slime');
}

test('a quest taken by one hero is taken by the whole party', () => {
  const { game, heroes } = gameWith('Ana', 'Bo');
  const [a, b] = heroes;
  assert.equal(game.questStatus(Q, a), 'available');
  game.acceptQuest(Q, a);
  assert.equal(a.questLog.get(Q), 'active');
  assert.equal(b.questLog.get(Q), 'active');
  assert.equal(game.questStatus(Q, b), 'active');
});

test("anyone's kills count for everyone", () => {
  const { game, heroes } = gameWith('Ana', 'Bo');
  game.acceptQuest(Q, heroes[0]);
  slimesSlain(game, 2);
  assert.equal(game.questStatus(Q, heroes[1]), 'active');
  slimesSlain(game, 1);
  assert.equal(game.questStatus(Q, heroes[0]), 'ready');
  assert.equal(game.questStatus(Q, heroes[1]), 'ready');
});

test('each hero hands the quest in for their own reward, once', () => {
  const { game, heroes } = gameWith('Ana', 'Bo');
  const [a, b] = heroes;
  game.acceptQuest(Q, a);
  slimesSlain(game);
  standBy(a, 'aldric');
  standBy(b, 'aldric');
  const goldB = b.gold;
  const bootsB = b.count('leather_boots');

  assert.ok(game.completeQuest(Q, a));
  assert.equal(game.questStatus(Q, a), 'done');
  // still Bo's to hand in: Aldric shows him a ?
  assert.equal(game.questStatus(Q, b), 'ready');
  assert.equal(game.npcMark('aldric', b), '?');

  assert.ok(game.completeQuest(Q, b));
  assert.equal(b.gold, goldB + QUESTS[Q].reward.gold);
  assert.equal(b.count('leather_boots'), bootsB + 1);

  assert.equal(game.completeQuest(Q, a), false);
  assert.equal(game.completeQuest(Q, b), false);
});

test('handing in needs the quest giver close by', () => {
  const { game, heroes } = gameWith('Ana');
  game.acceptQuest(Q, heroes[0]);
  slimesSlain(game);
  heroes[0].x += 400;
  assert.equal(game.completeQuest(Q, heroes[0]), false);
});

test("the next quest opens for each hero when they've handed in theirs", () => {
  const { game, heroes } = gameWith('Ana', 'Bo');
  const [a, b] = heroes;
  game.acceptQuest(Q, a);
  slimesSlain(game);
  standBy(a, 'aldric');
  game.completeQuest(Q, a);
  assert.notEqual(game.questStatus(NEXT, a), 'locked');
  assert.equal(game.questStatus(NEXT, b), 'locked');
  standBy(b, 'aldric');
  game.completeQuest(Q, b);
  assert.notEqual(game.questStatus(NEXT, b), 'locked');
});

test('a late joiner takes up open quests, not ones finished before they came', () => {
  const { game, heroes } = gameWith('Ana');
  const [a] = heroes;
  game.acceptQuest(Q, a);
  slimesSlain(game);
  standBy(a, 'aldric');
  game.completeQuest(Q, a);
  game.acceptQuest(NEXT, a);
  const c = game.addHero('c', 'Cy');
  skipScenes(game);
  assert.equal(c.questLog.get(NEXT), 'active');
  assert.equal(c.questLog.has(Q), false);
  assert.equal(game.questStatus(Q, c), 'done');
});

test('leaving without handing in: the character keeps it ready, even in their own game', () => {
  const { game, heroes } = gameWith('Di', 'Ed');
  const [d, e] = heroes;
  game.acceptQuest(Q, d);
  slimesSlain(game);
  standBy(d, 'aldric');
  game.completeQuest(Q, d);
  const save = game.toSave(e);
  assert.equal(save.quests[Q].state, 'active');
  assert.deepEqual(save.quests[Q].count, [3]);

  const own = new Game();
  const e2 = own.addHero('e', 'Ed');
  own.loadSave(save, e2);
  assert.equal(own.questStatus(Q, e2), 'ready');
});

test('a hero who handed a quest in before gets no second reward in another room', () => {
  const first = gameWith('Bo');
  const [b] = first.heroes;
  first.game.acceptQuest(Q, b);
  slimesSlain(first.game);
  standBy(b, 'aldric');
  first.game.completeQuest(Q, b);
  const save = first.game.toSave(b);

  const other = gameWith('Fe');
  other.game.acceptQuest(Q, other.heroes[0]);
  slimesSlain(other.game);
  const b2 = other.game.addHero('b', 'Bo');
  other.game.loadHero(save, b2);
  assert.equal(other.game.questStatus(Q, b2), 'done');
  standBy(b2, 'aldric');
  assert.equal(other.game.completeQuest(Q, b2), false);
});

test("a joiner's open quest comes with them, progress and all", () => {
  const first = gameWith('Bo');
  first.game.acceptQuest(Q, first.heroes[0]);
  slimesSlain(first.game, 2);
  const save = first.game.toSave(first.heroes[0]);

  const other = gameWith('Fe');
  const b2 = other.game.addHero('b', 'Bo');
  other.game.loadHero(save, b2);
  assert.deepEqual(other.game.quests[Q], { state: 'active', count: [2] });
  // the room's own hero can join in
  assert.equal(other.game.questStatus(Q, other.heroes[0]), 'available');
});

test('single player: take it, do it, hand it in, and it is saved done', () => {
  const { game, heroes } = gameWith('Hero');
  const [h] = heroes;
  game.acceptQuest(Q, h);
  slimesSlain(game);
  standBy(h, 'aldric');
  assert.ok(game.completeQuest(Q, h));
  assert.equal(game.toSave(h).quests[Q].state, 'done');
});

test('the proclamation The Road North asks you to read has a quest mark until you read it', () => {
  const { game, heroes } = gameWith('Ana');
  const h = heroes[0];
  for (const id of ['slime_meadow', 'warm_meal', 'goblin_raiders', 'hollow_night']) {
    if (!QUESTS[id]) continue;
    game.quests[id] = { state: 'done', count: [] };
    h.questLog.set(id, 'done');
  }
  assert.equal(game.objectWanted('proclamation', h), false, 'no mark before the quest');
  assert.equal(game.questStatus('road_north', h), 'available');
  game.acceptQuest('road_north', h);
  assert.equal(game.objectWanted('proclamation', h), true, 'marked while the quest wants it');
  game.questEvent('interact', 'proclamation');
  assert.equal(game.objectWanted('proclamation', h), false, 'gone once it is read');
});

test('Father Odo keeps the tower key until the village speaks for you', () => {
  const { game, heroes } = gameWith('Ana');
  const h = heroes[0];
  game.flags['scene:bell_backwards'] = 1;
  assert.equal(game.questStatus('bell_tolls', h), 'locked', 'not to a stranger');
  for (const id of ['nans_pages', 'thorns_fences', 'letters_door', 'steward_bounty']) {
    game.quests[id] = { state: 'done', count: [] };
    h.questLog.set(id, 'done');
  }
  assert.equal(game.questStatus('bell_tolls', h), 'locked', 'the hounds still run');
  game.quests.kings_hounds = { state: 'done', count: [] };
  h.questLog.set('kings_hounds', 'done');
  assert.equal(game.questStatus('bell_tolls', h), 'available', 'now he gives you the key');
});
