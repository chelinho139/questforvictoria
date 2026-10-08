import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMMANDS } from '../src/net/commands';
import { Game } from '../src/sim/Game';
import { DUEL_ASK, DUEL_COUNT, DUEL_OUT, DUEL_REACH, DUEL_RING } from '../src/sim/Duel';
import { Session } from '../src/server/Session';
import { NetSim } from '../src/net/NetSim';
import type { Connection } from '../src/net/Connection';
import type { C2S, S2C } from '../src/net/protocol';
import type { Hero } from '../src/sim/Hero';
import { heroesIn, testField, run, spawnBy, testKind } from './helpers';

testField('duel_field');
testField('duel_other');
const DUMMY = testKind('duel_dummy', { behavior: 'passive', hp: 500 });

/** Three heroes on an open field: two a few steps apart, and one looking on. */
function three() {
  const { game, heroes } = heroesIn('duel_field', 3);
  const [a, b, c] = heroes;
  b.x = a.x + 40;
  c.x = a.x - 80;
  return { game, a, b, c };
}

/** `a` challenges `b`, `b` says yes, and the count runs out: they fight. */
function fighting() {
  const p = three();
  COMMANDS.duelChallenge(p.a, [p.b.id]);
  COMMANDS.duelAccept(p.b, []);
  run(p.game, DUEL_COUNT + 0.1);
  assert.equal(p.game.duels.view(p.a)?.st, 'fight');
  return p;
}

/** Ready to cast at once: off the global cooldown, nothing cooling down, mana full, every spell known. */
function ready(h: Hero): void {
  h.level = 25;
  h.t = 9;
  h.cds = {};
  h.mp = h.mpMax;
}

const lastLog = (h: Hero) => h.logHistory.map(l => l.text).join('\n');

test('a challenge waits for its answer; a yes plants the flag and counts three to the fight', () => {
  const { game, a, b } = three();
  COMMANDS.duelChallenge(a, [b.id]);
  assert.deepEqual(
    { st: game.duels.view(a)?.st, mine: game.duels.view(a)?.mine, them: game.duels.view(b)?.mine },
    { st: 'ask', mine: true, them: false }
  );
  assert.match(lastLog(b), /Hero 0 challenges you to a duel!/);
  COMMANDS.duelAccept(a, []);
  assert.equal(game.duels.view(a)?.st, 'ask', 'only the one challenged can say yes');
  COMMANDS.duelAccept(b, []);
  const v = game.duels.view(a)!;
  assert.equal(v.st, 'count');
  assert.deepEqual(
    [v.x, v.y],
    [Math.round(a.x + 20), Math.round(a.y)],
    'the flag goes in between them'
  );
  assert.deepEqual(game.duels.flags('duel_field'), [[v.x, v.y, a.id, b.id, 0]]);
  // in the count nothing lands
  const r = game.duels.of(a)!.rivalFor(a);
  a.dmgEnemy(r, 50, '');
  assert.equal(b.hp, b.hpMax);
  assert.equal(a.rival === null, true, 'nobody to fight yet');
  run(game, DUEL_COUNT + 0.1);
  assert.equal(game.duels.view(a)?.st, 'fight');
  assert.equal(a.rival?.hero, b);
  assert.equal(a.target, a.rival, 'each starts with the other as their target');
  assert.equal(b.target, b.rival);
});

test('blows land on the other through their armor; the fight ends on the last hit point, and nobody dies', () => {
  const { game, a, b, c } = fighting();
  ready(a);
  const hp = b.hp;
  assert.ok(a.castKey('thrust'));
  assert.ok(b.hp < hp, 'the thrust lands');
  assert.equal(c.hp, c.hpMax, 'nobody else is touched');
  // down to the edge, and the last blow
  b.hp = 3;
  ready(a);
  assert.ok(a.castKey('slash'));
  assert.equal(b.dead, 0, 'nobody dies of a duel');
  assert.equal(game.duels.of(a), null, 'it is over');
  assert.deepEqual([a.duelsWon, a.duelsLost, b.duelsWon, b.duelsLost], [1, 0, 0, 1]);
  assert.equal(b.hp, b.hpMax, 'and both are given back what they began with');
  assert.equal(a.target, null);
  assert.match(lastLog(c), /Hero 0 has defeated Hero 1 in a duel!/, 'everyone there hears it');
});

test('Whirlwind finds your opponent, but not the others standing by; a creature is fair game too', () => {
  const { game, a, b, c } = fighting();
  game.cheats.freezeEnemies = true;
  const dummy = spawnBy(a, DUMMY, -30, 10);
  c.x = a.x + 20;
  c.y = a.y + 30;
  ready(a);
  assert.ok(a.castKey('whirlwind'));
  assert.ok(b.hp < b.hpMax, 'the opponent');
  assert.ok(dummy.hp < dummy.hpMax, 'the creature');
  assert.equal(c.hp, c.hpMax, 'not a friend');
});

test('a Charge stuns: no walking, no spells, no swings, until it wears off', () => {
  const { game, a, b } = fighting();
  b.driven = 'remote';
  b.x = a.x + 150;
  ready(a);
  assert.ok(a.castKey('charge'));
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 40, 'the charge closes the gap');
  assert.ok(b.stunT > 0);
  ready(b);
  assert.equal(b.castKey('thrust'), false, 'no spells');
  assert.equal(b.applyMove(b.x + 10, b.y, 1, 1, -1, false, 0.05), false, 'no walking');
  const hp = a.hp;
  b.target = b.rival;
  run(game, 1);
  assert.equal(a.hp, hp, 'no swings');
  run(game, 1.5);
  assert.equal(b.stunT, 0, 'and it wears off');
  ready(b);
  assert.ok(b.castKey('thrust'));
});

test('a stun never lasts past the duel, nor does a slow', () => {
  const { game, a, b } = fighting();
  a.rival!.stunT = 5;
  a.rival!.slowT = 5;
  a.rival!.slowK = 0.5;
  assert.ok(b.stunT > 0 && b.slowT > 0);
  COMMANDS.duelQuit(b, []);
  assert.equal(game.duels.of(a), null);
  assert.deepEqual([b.stunT, b.slowT], [0, 0]);
  assert.deepEqual([a.duelsWon, b.duelsLost], [1, 1], 'yielding loses');
  assert.match(lastLog(a), /Hero 1 yields\. Hero 0 wins the duel!/);
});

test('straying from the flag for too long forfeits', () => {
  const { game, a, b } = fighting();
  a.target = b.target = null;
  const v = game.duels.view(b)!;
  b.x = v.x + DUEL_RING + 40;
  b.y = v.y;
  run(game, 0.1);
  assert.match(lastLog(b), /You are leaving the duel!/);
  assert.ok(game.duels.view(b)!.out > 0);
  run(game, DUEL_OUT - 1);
  assert.equal(game.duels.view(b)?.st, 'fight', 'not yet');
  // back in time, and the clock starts over
  b.x = v.x;
  run(game, 0.1);
  assert.equal(game.duels.view(b)!.out, 0);
  b.x = v.x + DUEL_RING + 40;
  run(game, DUEL_OUT + 0.2);
  assert.equal(game.duels.of(a), null);
  assert.deepEqual([a.duelsWon, b.duelsLost], [1, 1]);
  assert.match(lastLog(a), /Hero 1 has fled from Hero 0 in a duel\./);
});

test('a challenge can be declined, taken back, or left to lapse; none of it counts', () => {
  const { game, a, b } = three();
  COMMANDS.duelChallenge(a, [b.id]);
  COMMANDS.duelQuit(b, []);
  assert.equal(game.duels.of(a), null);
  assert.match(lastLog(a), /Hero 1 declines your challenge\./);
  COMMANDS.duelChallenge(a, [b.id]);
  COMMANDS.duelQuit(a, []);
  assert.equal(game.duels.of(b), null);
  COMMANDS.duelChallenge(a, [b.id]);
  run(game, DUEL_ASK + 0.1);
  assert.equal(game.duels.of(b), null);
  assert.match(lastLog(b), /The challenge lapses\./);
  COMMANDS.duelChallenge(a, [b.id]);
  COMMANDS.duelAccept(b, []);
  COMMANDS.duelQuit(a, []);
  assert.equal(game.duels.of(b), null, 'backing out of the count');
  assert.deepEqual([a.duelsWon, a.duelsLost, b.duelsWon, b.duelsLost], [0, 0, 0, 0]);
});

test('who you can challenge: someone near, here, and not in another duel', () => {
  const { game, a, b, c } = three();
  b.x = a.x + DUEL_REACH + 10;
  COMMANDS.duelChallenge(a, [b.id]);
  assert.equal(game.duels.of(a), null);
  assert.match(lastLog(a), /Hero 1 is too far away\./);
  b.x = a.x + 40;
  COMMANDS.duelChallenge(a, ['nobody']);
  COMMANDS.duelChallenge(a, [a.id]);
  assert.equal(game.duels.of(a), null, 'not nobody, nor yourself');
  COMMANDS.duelChallenge(a, [b.id]);
  COMMANDS.duelChallenge(c, [b.id]);
  assert.match(lastLog(c), /Hero 1 is busy with another duel\./);
  COMMANDS.duelChallenge(a, [c.id]);
  assert.match(lastLog(a), /You have already challenged someone\./);
  // two challenging each other: that's a yes
  COMMANDS.duelChallenge(b, [a.id]);
  assert.equal(game.duels.view(a)?.st, 'count');
  game.moveHero(c, 'duel_other', 'start');
  COMMANDS.duelChallenge(c, [a.id]);
  assert.equal(game.duels.list.length, 1, 'nor from another region');
});

test('walking off to another region, or out of the room, loses the fight', () => {
  let p = fighting();
  p.game.moveHero(p.b, 'duel_other', 'start');
  assert.equal(p.game.duels.of(p.a), null);
  assert.deepEqual([p.a.duelsWon, p.b.duelsLost], [1, 1]);
  p = fighting();
  p.game.removeHero(p.a);
  assert.equal(p.game.duels.of(p.b), null);
  assert.deepEqual([p.b.duelsWon, p.a.duelsLost], [1, 1]);
});

test('falling to something else ends a duel, and nobody wins it', () => {
  const { game, a, b } = fighting();
  b.hurt(10_000, 'a goblin');
  assert.ok(b.dead > 0, 'a creature still kills');
  run(game, 0.1);
  assert.equal(game.duels.of(a), null);
  assert.deepEqual([a.duelsWon, b.duelsLost], [0, 0]);
});

test("a camouflaged opponent can't be picked as a target, but a blow round about still finds them", () => {
  const { game, a, b } = fighting();
  b.hiddenT = 3;
  run(game, 0.05);
  assert.equal(a.target, null, 'lost from sight');
  COMMANDS.targetRival(a, []);
  assert.equal(a.target, null);
  a.cycleTarget();
  assert.equal(a.target, null);
  ready(a);
  assert.ok(a.castKey('whirlwind'));
  assert.ok(b.hp < b.hpMax);
  b.hiddenT = 0;
  COMMANDS.targetRival(a, []);
  assert.equal(a.target, a.rival);
});

test("an archer's bear trap catches the opponent", () => {
  const { game, a, b } = fighting();
  a.region.setTrap(a, 3);
  b.target = null;
  b.x = a.x;
  b.y = a.y + 4;
  run(game, 0.1);
  assert.ok(b.heldT > 0, 'held');
  assert.equal(b.heldBy, 'snare');
  assert.ok(b.hp < b.hpMax, 'and hurt');
  assert.equal(a.region.traps.length, 0, 'sprung');
});

test('the tally is kept with the character', () => {
  const { game, a } = three();
  a.duelsWon = 3;
  a.duelsLost = 1;
  const save = game.toSave(a);
  assert.deepEqual(save.duels, { won: 3, lost: 1 });
  const g2 = new Game();
  const h = g2.addHero('x', 'X');
  g2.loadHero(save, h);
  assert.deepEqual([h.duelsWon, h.duelsLost], [3, 1]);
  delete save.duels;
  g2.loadHero(save, h);
  assert.deepEqual([h.duelsWon, h.duelsLost], [0, 0], 'a save from before duels');
});

/**
 * Online: the browser's game (NetSim) against the server's, as in netsim.test.ts, with a
 * second hero on the server for the browser's hero to duel.
 */
function online() {
  const { game, heroes } = heroesIn('duel_field', 2);
  const [me, them] = heroes;
  me.driven = them.driven = 'remote';
  them.x = me.x + 40;
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
  const room = { id: 'TEST', name: 'Test', players: [], max: 8, place: '', story: '' };
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
  return { game, me, them, sim, frames };
}

test('online, the browser is asked, answers, and fights its opponent as a target', () => {
  const { game, me, them, sim, frames } = online();
  frames(0.1);
  const other = sim.others.find(o => o.id === them.id)!;
  assert.ok(other);
  COMMANDS.duelChallenge(them, [me.id]);
  frames(0.1);
  assert.deepEqual([sim.duel?.st, sim.duel?.mine, sim.duel?.name], ['ask', false, them.name]);
  sim.acceptDuel();
  frames(0.1);
  assert.equal(sim.duel?.st, 'count');
  assert.equal(sim.duelFlags.length, 1, 'the flag is there to see');
  frames(DUEL_COUNT);
  assert.equal(sim.duel?.st, 'fight');
  assert.equal(sim.rival?.hero, other, 'my opponent is the other hero I see');
  assert.equal(sim.rivalOf(other), sim.rival);
  assert.equal(sim.target, sim.rival, 'and my target');
  sim.setTarget(null);
  frames(0.1);
  assert.equal(me.target, null);
  sim.setTarget(sim.rivalOf(other));
  frames(0.1);
  assert.equal(me.target, me.rival, 'targeted on the server');
  assert.equal(sim.target?.hp, them.hp);
  // stunned: the browser's feet stop too
  them.rival!.stunT = 1;
  frames(0.1);
  assert.ok(sim.hero.stunT > 0);
  const x0 = sim.hero.x;
  sim.hero.inputMove = { x: 1, y: 0 };
  frames(0.3);
  assert.equal(sim.hero.x, x0);
  sim.hero.inputMove = { x: 0, y: 0 };
  COMMANDS.duelQuit(them, []);
  frames(0.1);
  assert.equal(sim.duel, null);
  assert.equal(sim.rival, null);
  assert.equal(sim.target, null);
  assert.deepEqual(sim.duelRecord, [1, 0]);
  assert.equal(other.duelsLost, 1, "and the other's tally shows");
  void game;
});
