import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../src/server/Session';
import { gameWith, run } from './helpers';

test('the first snapshot has everything; later ones only what changed', () => {
  const { game, heroes } = gameWith('Ana', 'Bo');
  const s = new Session(heroes[0]);
  const first = s.build(0.05);
  assert.equal(first.rg, 'greenmarch');
  assert.ok(first.mf && first.sy && first.np && first.st, 'the whole picture to start with');
  assert.equal(first.hs.length, 1, 'the other hero');
  assert.equal(first.hs[0][1], 'Bo');

  game.tick(0.05);
  const quiet = s.build(0.05);
  assert.equal(quiet.mf, undefined);
  assert.equal(quiet.sy, undefined);
  assert.ok(quiet.me && quiet.en, 'position and creatures come every time');

  heroes[0].gold += 5;
  game.setFlag('test_flag');
  const changed = s.build(0.05);
  assert.equal(changed.mf?.gold, heroes[0].gold);
  assert.equal(changed.sy?.flags.test_flag, 1);
});

test("a hero's own quests travel in their snapshot", () => {
  const { game, heroes } = gameWith('Ana', 'Bo');
  const sb = new Session(heroes[1]);
  sb.build(0.05);
  game.acceptQuest('slime_meadow', heroes[0]);
  const t = sb.build(0.05);
  assert.deepEqual(t.mf?.quests, { slime_meadow: 'active' });
});

test('events reach whoever should hear them', () => {
  const { game, heroes } = gameWith('Ana', 'Bo');
  const [a, b] = heroes;
  const sa = new Session(a);
  const sb = new Session(b);
  sa.build(0.05);
  sb.build(0.05);
  a.log('only for Ana');
  game.acceptQuest('slime_meadow', a);
  const ta = sa.build(0.05);
  const tb = sb.build(0.05);
  const logs = (t: typeof ta) =>
    (t.ev ?? []).filter(e => e[1] === 'log').map(e => (e[2] as { text: string }).text);
  assert.ok(logs(ta).includes('only for Ana'));
  assert.equal(logs(tb).includes('only for Ana'), false);
  assert.ok(
    (tb.ev ?? []).some(e => e[0] === 'g' && e[1] === 'quests'),
    'the room hears about quests'
  );
});

test('a new region starts a fresh picture, and hears the arrival scene', () => {
  const { game, heroes } = gameWith('Ana');
  const s = new Session(heroes[0]);
  s.build(0.05);
  run(game, 0.1);
  s.build(0.05);
  game.moveHero(heroes[0], 'millbrook', 'south');
  const t = s.build(0.05);
  assert.equal(t.rg, 'millbrook');
  assert.ok(t.np && t.st && t.sy, 'everything again');
  // Millbrook greets newcomers with the herald
  assert.ok((t.ev ?? []).some(e => e[0] === 'r' && e[1] === 'scene'));
  s.dispose();
});
