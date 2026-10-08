import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMMANDS } from '../src/net/commands';
import { TRADE_ASK, TRADE_LEAVE, TRADE_REACH } from '../src/sim/Trade';
import { BAG_SLOTS } from '../src/data/items';
import { DUEL_COUNT } from '../src/sim/Duel';
import { Session } from '../src/server/Session';
import { NetSim } from '../src/net/NetSim';
import type { Connection } from '../src/net/Connection';
import type { C2S, S2C } from '../src/net/protocol';
import type { Hero } from '../src/sim/Hero';
import { heroesIn, testField, run } from './helpers';

testField('trade_field');
testField('trade_other');

/** Two heroes a few steps apart on an open field, with empty bags, some meat and gold each. */
function two() {
  const { game, heroes } = heroesIn('trade_field', 2);
  const [a, b] = heroes;
  b.x = a.x + 40;
  for (const h of [a, b]) {
    h.bag = new Array(BAG_SLOTS).fill(null);
    h.gold = 100;
  }
  a.addItem('meat', 5);
  a.addItem('iron_sword', 1);
  b.addItem('iron_bar', 3);
  return { game, a, b };
}

/** `a` asks `b`, and `b` says yes: both at the table. */
function atTable() {
  const p = two();
  COMMANDS.tradeAsk(p.a, [p.b.id]);
  COMMANDS.tradeAccept(p.b, []);
  assert.equal(p.game.trades.view(p.a)?.st, 'open');
  return p;
}

const log = (h: Hero) => h.logHistory.map(l => l.text).join('\n');

test('a request waits for its answer; a yes opens the table for both', () => {
  const { game, a, b } = two();
  COMMANDS.tradeAsk(a, [b.id]);
  assert.deepEqual(
    [game.trades.view(a)?.st, game.trades.view(a)?.mine, game.trades.view(b)?.mine],
    ['ask', true, false]
  );
  assert.match(log(b), /Hero 0 wants to trade with you/);
  COMMANDS.tradeAccept(a, []);
  assert.equal(game.trades.view(a)?.st, 'ask', 'only the one asked can say yes');
  COMMANDS.tradeAccept(b, []);
  assert.equal(game.trades.view(b)?.st, 'open');
});

test('both put things on the table and accept: it changes hands', () => {
  const { game, a, b } = atTable();
  COMMANDS.tradeItem(a, ['meat', 3]);
  COMMANDS.tradeItem(a, ['iron_sword', 1]);
  COMMANDS.tradeGold(a, [25]);
  COMMANDS.tradeItem(b, ['iron_bar', 2]);
  const v = game.trades.view(b)!;
  assert.deepEqual(v.get.items, [
    ['meat', 3],
    ['iron_sword', 1],
  ]);
  assert.equal(v.get.gold, 25);
  COMMANDS.tradeReady(a, [true]);
  assert.equal(game.trades.view(b)?.get.ok, true);
  assert.equal(a.count('meat'), 5, 'nothing moves until both accept');
  COMMANDS.tradeReady(b, [true]);
  assert.equal(game.trades.of(a), null, 'done');
  assert.deepEqual(
    [a.count('meat'), a.count('iron_sword'), a.count('iron_bar'), a.gold],
    [2, 0, 2, 75]
  );
  assert.deepEqual(
    [b.count('meat'), b.count('iron_sword'), b.count('iron_bar'), b.gold],
    [3, 1, 1, 125]
  );
  assert.match(log(a), /Trade done with Hero 1/);
});

test('any change takes back both accepts', () => {
  const { game, a, b } = atTable();
  COMMANDS.tradeItem(a, ['meat', 1]);
  COMMANDS.tradeReady(a, [true]);
  COMMANDS.tradeItem(b, ['iron_bar', 1]);
  assert.equal(game.trades.view(a)?.give.ok, false, 'their change takes back my accept');
  COMMANDS.tradeReady(a, [true]);
  COMMANDS.tradeGold(a, [10]);
  assert.equal(game.trades.view(a)?.give.ok, false, 'and so does mine');
  COMMANDS.tradeReady(b, [true]);
  assert.ok(game.trades.of(a), 'one accept is not enough');
});

test('you can only offer what you have, and never a keepsake or a quest reward', () => {
  const { game, a, b } = atTable();
  COMMANDS.tradeItem(a, ['meat', 50]);
  COMMANDS.tradeGold(a, [5000]);
  COMMANDS.tradeItem(a, ['iron_bar', 2]);
  a.addItem('aldric_whistle', 1);
  COMMANDS.tradeItem(a, ['aldric_whistle', 1]);
  const v = game.trades.view(a)!;
  assert.deepEqual(v.give.items, [['meat', 5]]);
  assert.equal(v.give.gold, 100);
  // eating what is on the table takes it off
  a.hp = 10;
  a.useSlot(a.bag.findIndex(s => s?.id === 'meat'));
  run(game, 0.1);
  assert.deepEqual(game.trades.view(b)!.get.items, [['meat', 4]]);
});

test('no room in the bag: nothing changes hands, and the accepts are taken back', () => {
  const { game, a, b } = atTable();
  b.bag = new Array(BAG_SLOTS).fill(null).map(() => ({ id: 'stone' as const, n: 50 }));
  COMMANDS.tradeItem(a, ['iron_sword', 1]);
  COMMANDS.tradeReady(a, [true]);
  COMMANDS.tradeReady(b, [true]);
  assert.ok(game.trades.of(a), 'still at the table');
  assert.equal(a.count('iron_sword'), 1);
  assert.equal(game.trades.view(a)?.give.ok, false);
  assert.match(log(a), /Hero 1's bag is too full/);
  // giving something up in return makes the room
  b.bag[0] = { id: 'iron_bar', n: 1 };
  COMMANDS.tradeItem(b, ['iron_bar', 1]);
  COMMANDS.tradeReady(a, [true]);
  COMMANDS.tradeReady(b, [true]);
  assert.equal(game.trades.of(a), null);
  assert.deepEqual([a.count('iron_bar'), b.count('iron_sword')], [1, 1]);
});

test('a request can be declined, taken back, or left to lapse', () => {
  const { game, a, b } = two();
  COMMANDS.tradeAsk(a, [b.id]);
  COMMANDS.tradeQuit(b, []);
  assert.equal(game.trades.of(a), null);
  assert.match(log(a), /doesn't want to trade/);
  COMMANDS.tradeAsk(a, [b.id]);
  COMMANDS.tradeQuit(a, []);
  assert.equal(game.trades.of(b), null);
  COMMANDS.tradeAsk(a, [b.id]);
  run(game, TRADE_ASK + 0.1);
  assert.equal(game.trades.of(a), null);
  assert.match(log(b), /The offer to trade lapses/);
  // asked by the one you are asking: that's a yes
  COMMANDS.tradeAsk(a, [b.id]);
  COMMANDS.tradeAsk(b, [a.id]);
  assert.equal(game.trades.view(a)?.st, 'open');
});

test('who you can trade with: someone near, here, and not in a duel', () => {
  const { game, a, b } = two();
  b.x = a.x + TRADE_REACH + 10;
  COMMANDS.tradeAsk(a, [b.id]);
  assert.equal(game.trades.of(a), null);
  assert.match(log(a), /too far away/);
  b.x = a.x + 40;
  COMMANDS.duelChallenge(a, [b.id]);
  COMMANDS.duelAccept(b, []);
  COMMANDS.tradeAsk(a, [b.id]);
  assert.equal(game.trades.of(a), null, 'not with a duel on');
  run(game, DUEL_COUNT + 0.1);
  COMMANDS.duelQuit(a, []);
  COMMANDS.tradeAsk(a, [b.id]);
  assert.ok(game.trades.of(a));
});

test('walking away, or off to another region, calls the trade off', () => {
  const { game, a, b } = atTable();
  b.x = a.x + TRADE_LEAVE + 10;
  run(game, 0.1);
  assert.equal(game.trades.of(a), null);
  assert.match(log(a), /walked away/);
  b.x = a.x + 40;
  COMMANDS.tradeAsk(a, [b.id]);
  COMMANDS.tradeAccept(b, []);
  game.moveHero(b, 'trade_other', 'start');
  assert.equal(game.trades.of(a), null);
  COMMANDS.tradeQuit(a, []);
});

test('online, the browser is asked, answers, and trades at the table', () => {
  const { game, heroes } = heroesIn('trade_field', 2);
  const [me, them] = heroes;
  me.driven = them.driven = 'remote';
  them.x = me.x + 40;
  for (const h of [me, them]) {
    h.bag = new Array(BAG_SLOTS).fill(null);
    h.gold = 50;
  }
  me.addItem('meat', 4);
  them.addItem('iron_bar', 2);
  const session = new Session(me);
  const handlers = new Set<(m: S2C) => void>();
  const sent: C2S[] = [];
  const conn = {
    rtt: 0,
    closed: false,
    on: (h: (m: S2C) => void) => {
      handlers.add(h);
      return () => handlers.delete(h);
    },
    send: (m: C2S) => void sent.push(m),
    close: () => {},
  } as unknown as Connection;
  const room = {
    id: 'TEST',
    name: 'Test',
    players: [],
    max: 8,
    place: '',
    story: '',
    difficulty: 'normal' as const,
  };
  const sim = new NetSim(conn, { room, hero: me.id }, session.build(0.05));
  const frames = (s: number) => {
    for (let i = 0; i < s * 20; i++) {
      for (const m of sent.splice(0)) {
        if (m.t === 'cmd') COMMANDS[m.c]?.(me, m.a);
        if (m.t === 'move') me.applyMove(m.x, m.y, m.face, m.walk, m.jumpT, m.jumpFlip, 0.05);
      }
      game.tick(0.05);
      const t = session.build(0.05);
      for (const h of handlers) h({ t: 'tick', ...t });
      sim.tick(0.05);
    }
  };
  frames(0.1);
  COMMANDS.tradeAsk(them, [me.id]);
  frames(0.1);
  assert.deepEqual(
    [sim.trading?.st, sim.trading?.mine, sim.trading?.name],
    ['ask', false, them.name]
  );
  sim.acceptTrade();
  frames(0.1);
  assert.equal(sim.trading?.st, 'open');
  sim.tradeItem('meat', 2);
  sim.tradeGold(10);
  COMMANDS.tradeItem(them, ['iron_bar', 2]);
  frames(0.1);
  assert.deepEqual(sim.trading?.give.items, [['meat', 2]]);
  assert.deepEqual(sim.trading?.get.items, [['iron_bar', 2]]);
  COMMANDS.tradeReady(them, [true]);
  sim.tradeReady(true);
  frames(0.1);
  assert.equal(sim.trading, null);
  assert.deepEqual([sim.gold, sim.hero.count('meat'), sim.hero.count('iron_bar')], [40, 2, 2]);
  assert.deepEqual([them.gold, them.count('meat')], [60, 2]);
});
