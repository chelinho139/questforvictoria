import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS } from '../src/data/items';
import type { ItemDef, ItemId } from '../src/data/items';
import { NPCS } from '../src/data/npcs';
import type { NpcDef, NpcId } from '../src/data/npcs';
import { RECIPES } from '../src/data/crafting';
import { testField, testKind, heroesIn, spawnBy, run, standBy } from './helpers';

/**
 * What places and the story do in the wood (sim/Region.ts, sim/Hero.ts, sim/Game.ts): a night
 * to hold round the fires, a region's own fires, things that cost something to use, waking by
 * a safe fire, traders whose stock grows, recipes you are taught, and a whistle that a knight
 * answers.
 */

const smotherer = testKind('t_smotherer', { smother: { t: 2 }, dead: true, aggro: 300, spd: 120 });
const ring = {
  structures: [
    { kind: 'campfire' as const, at: [10, 15] as [number, number] },
    { kind: 'campfire' as const, at: [20, 15] as [number, number] },
    { kind: 'campfire' as const, at: [15, 10] as [number, number] },
  ],
};

test('a night held: the dead come for the fires from dusk, and at dawn enough still burning wins it', () => {
  testField('t_hold', {
    ...ring,
    hold: {
      when: { flag: 't_watch' },
      fire: 'campfire',
      need: 2,
      spawns: { kind: smotherer, from: [[2, 2]], every: 1, max: 2 },
      flag: 't_held',
      won: 'The fires held.',
      lost: 'Too many fires went out.',
    },
  });
  const { game, h } = heroesIn('t_hold');
  game.day.t = 0.9;
  run(game, 3);
  assert.equal(h.region.enemies.length, 0, 'nothing comes before the watch starts');
  game.setFlag('t_watch');
  run(game, 4);
  const R = h.region;
  assert.ok(
    R.enemies.some(e => e.kind === smotherer && e.alive),
    'the dead come out of the dark'
  );
  assert.ok(R.enemies.filter(e => e.alive).length <= 2, 'never more than the most at once');
  // the hero keeps them off the fires; at dawn all three burn
  for (const e of R.enemies) if (e.alive) h.dmgEnemy(e, 9999, '');
  game.day.t = 0.26;
  game.tick(0.05);
  assert.equal(game.flags.t_held, 1, 'held');
  assert.ok(h.logHistory.some(l => l.text === 'The fires held.'));
  assert.ok(
    R.enemies.every(e => !e.alive),
    'and the dead go back to the earth'
  );
});

test('a night lost: too few fires burn at dawn, and they are lit again for the next night', () => {
  testField('t_lost', {
    ...ring,
    hold: {
      when: { flag: 't_watch' },
      fire: 'campfire',
      need: 3,
      spawns: { kind: smotherer, from: [[2, 2]], every: 1, max: 2 },
      flag: 't_held',
      won: 'The fires held.',
      lost: 'Too many fires went out.',
    },
  });
  const { game, h } = heroesIn('t_lost');
  game.setFlag('t_watch');
  game.day.t = 0.9;
  run(game, 2);
  const R = h.region;
  R.putOut(R.structures[0]);
  game.day.t = 0.26;
  game.tick(0.05);
  assert.equal(game.flags.t_held, undefined, 'lost');
  assert.ok(h.logHistory.some(l => l.text === 'Too many fires went out.'));
  assert.ok(
    R.structures.every(s => R.burning(s)),
    'all lit again by day'
  );
});

test("a region's own fires come with the story and are never saved", () => {
  testField('t_camp', {
    structures: [{ kind: 'campfire', at: [12, 12], when: { flag: 't_lit' } }],
  });
  const { game, h } = heroesIn('t_camp');
  assert.equal(h.region.structures.length, 0, 'cold until it is lit');
  game.setFlag('t_lit');
  run(game, 0.5);
  const [fire] = h.region.structures;
  assert.ok(fire?.fixed && fire.t === Infinity, 'burning, and for good');
  assert.equal(game.toSave(h).built.t_camp, undefined, 'nobody built it: not saved');
  h.region.build('campfire', 16, 16);
  assert.equal(game.toSave(h).built.t_camp?.length, 1, 'one built by the hero is');
});

test('using something can cost what is in the bag (three logs to light a hearth)', () => {
  testField('t_hearth', {
    objects: [
      {
        id: 'hearth',
        kind: 'chest',
        at: [16, 15],
        name: 'Hearth',
        cost: [['log', 3]],
        once: true,
        then: { flags: ['t_hearth_lit'] },
      },
    ],
  });
  const { game, h } = heroesIn('t_hearth');
  const R = h.region;
  const o = R.objects[0];
  R.use(o, h);
  assert.equal(game.flags.t_hearth_lit, undefined);
  assert.ok(h.logHistory.at(-1)?.text.includes('3 × wood log'), 'says what it needs');
  h.addItem('log', 4);
  R.use(o, h);
  assert.equal(game.flags.t_hearth_lit, 1, 'lit');
  assert.equal(h.count('log'), 1, 'three logs used');
});

test('a hero who falls wakes by a safe fire once it is lit, in this region or another', () => {
  testField('t_wake_b', { spots: { start: [15, 15], lodge: [5, 5] } });
  testField('t_wake', {
    spots: { start: [15, 15], camp: [5, 5] },
    wake: [
      {
        spot: 'lodge',
        region: 't_wake_b',
        when: { flag: 't_lodge' },
        say: 'You wake at the lodge.',
      },
      { spot: 'camp', when: { flag: 't_camp' }, say: 'You wake by the fire.' },
    ],
  });
  const { game, h } = heroesIn('t_wake');
  h.x += 100;
  h.hurt(99999, 'a test');
  run(game, 3);
  assert.equal(Math.floor(h.x / 32), 15, 'back on the road');
  game.setFlag('t_camp');
  h.hurt(99999, 'a test');
  run(game, 3);
  assert.deepEqual([Math.floor(h.x / 32), Math.floor(h.y / 32)], [5, 5], 'by the camp fire');
  assert.ok(h.logHistory.some(l => l.text === 'You wake by the fire.'));
  game.setFlag('t_lodge');
  h.hurt(99999, 'a test');
  run(game, 3);
  assert.equal(h.regionId, 't_wake_b', 'at the lodge, in another region');
});

test("a trader's stock grows with the story, and only what they stock can be bought", () => {
  (NPCS as Record<string, NpcDef>).t_trader = {
    name: 'Test trader',
    title: '',
    intro: [],
    greeting: '',
    shop: {
      name: 'Test stall',
      sells: ['bread'],
      more: [{ when: { flag: 't_steel' }, sells: ['bandage'] }],
    },
  };
  testField('t_market', { npcs: [{ id: 't_trader' as NpcId, at: [16, 15] }] });
  const { game, h } = heroesIn('t_market');
  standBy(h, 't_trader');
  h.gold = 100;
  assert.deepEqual(game.shopStock('t_trader' as NpcId, h), ['bread']);
  assert.equal(h.buy('t_trader' as NpcId, 'bandage'), false, 'not stocked yet');
  game.setFlag('t_steel');
  assert.deepEqual(game.shopStock('t_trader' as NpcId, h), ['bread', 'bandage']);
  assert.equal(h.buy('t_trader' as NpcId, 'bandage'), true);
});

test('a recipe has to be taught before it can be made', () => {
  RECIPES.push({
    id: 't_recipe',
    station: 'hand',
    makes: { item: 'bread' },
    needs: [['log', 1]],
    time: 1,
    when: { flag: 't_taught' },
  });
  const r = RECIPES.at(-1)!;
  testField('t_school');
  const { game, h } = heroesIn('t_school');
  h.addItem('log', 1);
  assert.equal(h.craftProblem(r), "You don't know how to make that yet.");
  game.setFlag('t_taught');
  assert.equal(h.craftProblem(r), null);
});

test('a whistle from the bag: nothing answers in an empty wood; a knight stops dead and his roots let go; it needs a breather between calls', () => {
  (ITEMS as Record<string, ItemDef>).t_whistle = {
    name: 'Test whistle',
    desc: '',
    stack: 1,
    col: '#fff',
    use: {
      cd: 30,
      call: 'warden',
      sound: 'wardenCall',
      say: 'You blow the whistle.',
      quiet: 'Nobody comes.',
    },
  };
  const whistle = 't_whistle' as ItemId;
  const knight = testKind('t_knight', {
    answers: { call: 'warden', stun: [4, 4, 2] },
    hp: 900,
    aggro: 0,
    spd: 0,
  });
  const rooted = testKind('t_rootknight', {
    answers: { call: 'warden', stun: [4], free: 'roots' },
    hp: 900,
    aggro: 0,
    spd: 0,
  });
  testField('t_bridge');
  const { game, h } = heroesIn('t_bridge');
  h.addItem(whistle, 1);
  const slot = () => h.bag.findIndex(s => s?.id === whistle);
  h.useSlot(slot());
  assert.equal(h.logHistory.at(-1)?.text, 'Nobody comes.');
  assert.ok((h.itemCd[whistle] ?? 0) > 29, 'a breather before the next call');
  assert.equal(h.count(whistle), 1, 'kept');
  const e = spawnBy(h, knight, 120);
  h.useSlot(slot());
  assert.equal(e.stunT, 0, 'too soon: nothing happens');
  run(game, 30.1);
  h.useSlot(slot());
  assert.ok(e.stunT > 3.9, 'he stops dead');
  e.stunT = 0;
  e.phase = 2;
  h.itemCd = {};
  h.useSlot(slot());
  assert.ok(e.stunT > 1.9 && e.stunT <= 2, 'for less, later in the fight');
  // the roots that hold a hero go slack
  const r = spawnBy(h, rooted, -120);
  h.hold(5, 'roots');
  h.itemCd = {};
  h.useSlot(slot());
  assert.ok(r.stunT > 0);
  assert.equal(h.heldT, 0, 'free');
});
