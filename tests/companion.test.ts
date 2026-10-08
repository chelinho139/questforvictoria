import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPANIONS } from '../src/data/companions';
import { Game } from '../src/sim/Game';
import { Session } from '../src/server/Session';
import { NetSim } from '../src/net/NetSim';
import { COMMANDS } from '../src/net/commands';
import type { Connection } from '../src/net/Connection';
import type { C2S, S2C } from '../src/net/protocol';
import { testField, testKind, heroesIn, spawnBy, run } from './helpers';

/**
 * A companion walking with the heroes (sim/Companion.ts, Game.placeCompanions): Wren, here
 * sent into test fields in place of the wood.
 */

testField('t_wood', { spots: { start: [15, 15], camp: [4, 4] } });
testField('t_wood2');
testField('t_town');
Object.assign(COMPANIONS.wren, {
  regions: ['t_wood', 't_wood2'],
  home: { region: 't_wood', spot: 'camp' },
});
const brute = testKind('t_brute', { hp: 400, atk: 12, aggro: 200 });

function withWren(region = 't_wood') {
  const { game, h, heroes } = heroesIn(region);
  game.setFlag('wren_follows');
  game.tick(0.05);
  return { game, h, heroes, wren: game.companions.find(c => c.cid === 'wren')! };
}

test('Wren is nowhere until the story brings her, then she walks with the hero and keeps up', () => {
  const { game, h } = heroesIn('t_wood');
  const wren = game.companions.find(c => c.cid === 'wren')!;
  run(game, 1);
  assert.equal(wren.regionId, '', 'not yet');
  game.setFlag('wren_follows');
  game.tick(0.05);
  assert.equal(wren.regionId, 't_wood');
  assert.ok(Math.hypot(wren.x - h.x, wren.y - h.y) < 40, 'at their side');
  h.moveTo(h.x + 200, h.y + 120);
  run(game, 5);
  assert.ok(Math.hypot(wren.x - h.x, wren.y - h.y) < 80, 'and keeps up');
});

test('she goes on with the heroes into the next part of the wood; when they leave it she waits at her camp till one comes back for her', () => {
  const { game, h, wren } = withWren();
  game.moveHero(h, 't_wood2', 'start');
  game.tick(0.05);
  assert.equal(wren.regionId, 't_wood2');
  assert.ok(Math.hypot(wren.x - h.x, wren.y - h.y) < 40, 'at their side');
  game.moveHero(h, 't_town', 'start');
  game.tick(0.05);
  assert.equal(wren.regionId, 't_wood', 'gone home');
  assert.deepEqual([Math.floor(wren.x / 32), Math.floor(wren.y / 32)], [4, 4], 'to her camp');
  // back in the wood, but far from the camp: she waits
  game.moveHero(h, 't_wood', 'start');
  run(game, 3);
  assert.deepEqual([Math.floor(wren.x / 32), Math.floor(wren.y / 32)], [4, 4], 'still waiting');
  game.moveHero(h, 't_wood2', 'start');
  run(game, 1);
  assert.equal(wren.regionId, 't_wood', "she doesn't come looking");
  game.moveHero(h, 't_wood', 'start');
  h.x = 6 * 32;
  h.y = 6 * 32;
  run(game, 3);
  assert.ok(Math.hypot(wren.x - h.x, wren.y - h.y) < 60, 'come for her, and she follows again');
  game.moveHero(h, 't_wood2', 'start');
  game.tick(0.05);
  assert.equal(wren.regionId, 't_wood2');
  game.setFlag('wren_home');
  game.tick(0.05);
  assert.equal(wren.regionId, '', 'her part is over');
});

test('she shoots what fights the heroes, and her kills are the hero’s', () => {
  const { game, h, wren } = withWren();
  run(game, 5);
  const e = spawnBy(h, brute, 140);
  e.hp = 8;
  const xp = h.xp + h.level * 1000;
  const kills = h.kills;
  run(game, 6);
  assert.equal(e.alive, false, 'she brought it down');
  assert.equal(h.kills, kills + 1, 'the kill is the hero’s');
  assert.ok(h.xp + h.level * 1000 > xp, 'and the experience');
  assert.equal(wren.target, null);
});

test('creatures can go for her; badly hurt she drops to one knee instead of dying, and gets up again', () => {
  const { game, h, wren } = withWren();
  run(game, 5);
  // something goes for her rather than the hero
  const e = h.region.spawnEnemy(brute, wren.x + 30, wren.y);
  h.region.enemies.push(e);
  e.aggro = true;
  e.foe = wren.id;
  run(game, 3);
  assert.ok(wren.hp < wren.hpMax, 'it went for her');
  wren.hurt(99999, 'a test');
  assert.ok(wren.dead > 0, 'down on one knee');
  assert.equal(wren.hp, 0);
  run(game, 1);
  assert.notEqual(e.foe, wren.id, 'left alone while she is down');
  run(game, 10);
  assert.equal(wren.dead, 0, 'up again');
  assert.ok(wren.hp >= wren.hpMax / 2 - 1);
});

test('a snare holds her too', () => {
  const { game, h, wren } = withWren();
  run(game, 5);
  wren.hold(3, 'snare');
  const at = { x: wren.x, y: wren.y };
  h.moveTo(h.x + 250, h.y);
  run(game, 2);
  assert.deepEqual({ x: wren.x, y: wren.y }, at, 'held where she stands');
  run(game, 4);
  assert.notDeepEqual({ x: wren.x, y: wren.y }, at, 'and after it, following');
});

test('online, she walks in the snapshots; and a held hero can’t walk in their own browser', () => {
  const game = new Game();
  const server = game.addHero('p1', 'Ash', 't_wood');
  server.driven = 'remote';
  game.setFlag('wren_follows');
  game.day.t = 0.5;
  const session = new Session(server);
  const handlers = new Set<(m: S2C) => void>();
  const sent: C2S[] = [];
  const conn = {
    rtt: 0,
    closed: false,
    on: (fn: (m: S2C) => void) => {
      handlers.add(fn);
      return () => handlers.delete(fn);
    },
    send: (m: C2S) => void sent.push(m),
    close: () => {},
  } as unknown as Connection;
  const room = { id: 'TEST', name: 'Test', players: [], max: 8, place: '', story: '', difficulty: 'normal' as const };
  const sim = new NetSim(conn, { room, hero: 'p1' }, session.build(0.05));
  const frame = () => {
    for (const m of sent.splice(0)) {
      if (m.t === 'cmd') COMMANDS[m.c]?.(server, m.a);
      if (m.t === 'move') server.applyMove(m.x, m.y, m.face, m.walk, m.jumpT, m.jumpFlip, 0.05);
    }
    game.tick(0.05);
    const t = session.build(0.05);
    for (const fn of handlers) fn({ t: 'tick', ...t });
    sim.tick(0.05);
  };
  for (let i = 0; i < 40; i++) frame();
  assert.equal(sim.companions.length, 1, 'Wren is here');
  const wren = game.companions[0];
  assert.ok(
    Math.hypot(sim.companions[0].x - wren.x, sim.companions[0].y - wren.y) < 20,
    'where the server has her'
  );
  server.hold(2, 'web');
  frame();
  assert.ok(sim.hero.heldT > 0 && sim.hero.heldBy === 'web', 'the browser knows');
  const x0 = sim.hero.x;
  sim.hero.inputMove = { x: 1, y: 0 };
  for (let i = 0; i < 10; i++) frame();
  assert.equal(sim.hero.x, x0, 'and its feet obey');
  for (let i = 0; i < 40; i++) frame();
  for (let i = 0; i < 10; i++) frame();
  assert.ok(sim.hero.x > x0, 'free, it walks');
  sim.hero.inputMove = { x: 0, y: 0 };
});
