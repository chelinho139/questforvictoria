import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMMANDS } from '../src/net/commands';
import type { Game } from '../src/sim/Game';
import type { Hero } from '../src/sim/Hero';
import { gameWith, run } from './helpers';

/** A hero alone on the road in the Greenmarch (no creatures to interrupt), with room to build. */
function alone(): { game: Game; h: Hero } {
  const { game, heroes } = gameWith('Ana');
  const h = heroes[0];
  h.region.enemies = [];
  return { game, h };
}

/** The same, standing next to a tree. */
function byATree(): { game: Game; h: Hero; tree: Hero['region']['trees'][number] } {
  const { game, h } = alone();
  const tree = h.region.trees.find(t => t.stumpT === 0)!;
  h.x = tree.x + 20;
  h.y = tree.y;
  return { game, h, tree };
}

/** What the hero is busy with (read fresh: an earlier assert doesn't pin it down). */
const busy = (h: Hero) => h.work;

/** Seconds to fell the tree, sending the chop command every `every` seconds (0: once). */
function fell(every: number): number {
  const { game, h, tree } = byATree();
  COMMANDS.chop(h, [tree.c, tree.r]);
  let t = 0;
  let since = 0;
  while (tree.stumpT === 0 && t < 30) {
    game.tick(0.05);
    t += 0.05;
    since += 0.05;
    if (every && since >= every && tree.stumpT === 0) {
      since = 0;
      COMMANDS.chop(h, [tree.c, tree.r]);
    }
  }
  return t;
}

test('clicking a tree over and over chops no faster than letting the hero work', () => {
  const steady = fell(0);
  assert.ok(steady > 1 && steady < 30, `the tree falls (${steady.toFixed(2)} s)`);
  for (const every of [0.1, 0.25, 0.5]) {
    const spam = fell(every);
    assert.ok(spam >= steady - 0.051, `clicking every ${every} s: ${spam.toFixed(2)} s, holding: ${steady.toFixed(2)} s`);
  }
});

test('the progress bar fills while chopping, and goes once the tree is down', () => {
  const { game, h, tree } = byATree();
  h.startChop(tree);
  game.tick(0.05);
  assert.equal(h.work?.kind, 'chop');
  let last = h.work!.p;
  while (tree.stumpT === 0) {
    game.tick(0.05);
    if (!h.work) break;
    assert.ok(h.work.p >= last - 1e-9 && h.work.p <= 1, `${h.work.p} after ${last}`);
    last = h.work.p;
  }
  assert.ok(last > 0.9, 'nearly full just before it falls');
  assert.equal(h.work, null);
});

test('making something takes time, and the ingredients go only when it is done', () => {
  const { game, h } = alone();
  h.give('log', 3);
  assert.ok(h.craft('campfire'));
  run(game, 1);
  assert.equal(h.region.structures.length, 0, 'not built yet');
  assert.equal(h.count('log'), 3, 'nothing used up yet');
  assert.equal(h.work?.kind, 'make');
  assert.ok(Math.abs(h.work!.p - 1 / 3) < 0.05, `a third of the way (${h.work!.p})`);
  run(game, 2.1);
  assert.equal(h.region.structures.length, 1, 'built');
  assert.equal(h.count('log'), 0);
  assert.equal(h.work, null);
});

test('stepping away or stopping puts the work down, and nothing is lost', () => {
  const { game, h } = alone();
  h.give('log', 3);
  assert.ok(h.craft('campfire'));
  run(game, 1);
  h.x += 20;
  run(game, 3);
  assert.equal(h.region.structures.length, 0);
  assert.equal(h.count('log'), 3);
  assert.equal(h.work, null);
  h.x -= 20;
  COMMANDS.craft(h, ['campfire', 1]);
  run(game, 1);
  assert.equal(busy(h)?.kind, 'make');
  COMMANDS.stopCraft(h, []);
  run(game, 3);
  assert.equal(h.region.structures.length, 0);
  assert.equal(h.count('log'), 3);
});

test('shift-click makes one after another while the ingredients last', () => {
  const { game, h } = alone();
  h.give('log', 3);
  h.give('meat', 3);
  assert.ok(h.craft('campfire'));
  run(game, 3.1);
  COMMANDS.craft(h, ['cooked_meat', 50]);
  run(game, 3 * 2 + 0.5);
  assert.equal(h.count('cooked_meat'), 3);
  assert.equal(h.count('meat'), 0);
  assert.equal(h.work, null, 'stops when the meat runs out');
});

test('two foods back to back, then you are full until one is digested', () => {
  const { game, h } = alone();
  h.give('cooked_meat', 5);
  const eat = () => h.useSlot(h.bag.findIndex(s => s?.id === 'cooked_meat'));
  h.hp = 10;
  eat();
  run(game, 1);
  eat();
  const after2 = h.hp;
  assert.equal(h.count('cooked_meat'), 3, 'two eaten');
  run(game, 1);
  h.hp = 10;
  eat();
  assert.equal(h.hp, 10, 'too full for a third');
  assert.equal(h.count('cooked_meat'), 3);
  assert.ok(h.logHistory.some(l => l.text.startsWith("You're too full to eat.")));
  assert.ok(after2 > 10);
  run(game, 44);
  eat();
  assert.ok(h.hp > 10, 'room for one more once the first is digested');
  assert.equal(h.count('cooked_meat'), 2);
});

test('a bandage is not food: no fuller for it, but one every 30 s', () => {
  const { game, h } = alone();
  h.give('bandage', 3);
  const use = () => h.useSlot(h.bag.findIndex(s => s?.id === 'bandage'));
  h.hp = 10;
  use();
  assert.equal(h.fullT, 0, 'not food');
  run(game, 1);
  const hp = h.hp;
  use();
  assert.equal(h.hp, hp, 'not yet');
  assert.equal(h.count('bandage'), 2);
  run(game, 30);
  use();
  assert.equal(h.count('bandage'), 1);
});
