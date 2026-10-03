import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/sim/Game';
import { Session } from '../src/server/Session';
import { NetSim } from '../src/net/NetSim';
import { COMMANDS } from '../src/net/commands';
import type { Connection } from '../src/net/Connection';
import type { C2S, S2C } from '../src/net/protocol';
import type { ClassId } from '../src/data/classes';
import { skipScenes } from './helpers';

/**
 * The browser's game (NetSim) against the server's (a Game and a Session), joined by a fake
 * line: what the browser sends is run on the server, and every server frame's snapshot goes
 * back to the browser, 20 a second, like the real thing.
 */
function online(cls: ClassId) {
  const game = new Game();
  const server = game.addHero('p1', 'Ash');
  server.driven = 'remote';
  server.cls = cls;
  server.resetHero();
  skipScenes(game);
  server.region.enemies = [];
  const cow = server.region.spawnEnemy('cow', server.x + 120, server.y, true);
  server.region.enemies.push(cow);
  const session = new Session(server);
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
  const sim = new NetSim(conn, { room, hero: 'p1' }, session.build(0.05));
  /** One server frame: run what the browser sent, tick, send the snapshot back, and let the browser draw a frame. */
  const frame = () => {
    for (const m of sent.splice(0)) {
      if (m.t === 'cmd') COMMANDS[m.c]?.(server, m.a);
      if (m.t === 'move') server.applyMove(m.x, m.y, m.face, m.walk, m.jumpT, m.jumpFlip, 0.05);
    }
    game.tick(0.05);
    const t = session.build(0.05);
    for (const h of handlers) h({ t: 'tick', ...t });
    sim.tick(0.05);
  };
  const run = (s: number) => {
    for (let i = 0; i < s * 20; i++) frame();
  };
  return { game, server, sim, cow, run };
}

test('online, an archer can walk again after shooting', () => {
  const { server, sim, cow, run } = online('archer');
  run(0.2);
  sim.setTarget(sim.enemies.find(e => e.id === cow.id)!);
  assert.ok(sim.castKey('aimedshot'));
  assert.ok(sim.hero.aimT > 0, 'holding still for the draw');
  run(1);
  assert.equal(sim.hero.aimT, 0, 'the hold is over');
  assert.ok(cow.hp < cow.hpMax, 'the arrow hit');
  const x0 = sim.hero.x;
  sim.hero.inputMove = { x: 1, y: 0 };
  run(0.6);
  sim.hero.inputMove = { x: 0, y: 0 };
  assert.ok(Math.abs(sim.hero.x - x0) > 20, 'walking in the browser');
  run(0.2);
  assert.ok(Math.abs(server.x - x0) > 20, 'and on the server');
});

test('online, an archer holding a movement key is told to stand still', () => {
  const { sim, cow, run } = online('archer');
  run(0.2);
  sim.setTarget(sim.enemies.find(e => e.id === cow.id)!);
  sim.hero.inputMove = { x: 0, y: 1 };
  assert.equal(sim.castKey('quickshot'), false);
});

test('online, a warrior swings and walks as before', () => {
  const { sim, run } = online('warrior');
  run(0.2);
  const x0 = sim.hero.x;
  sim.hero.inputMove = { x: -1, y: 0 };
  run(0.5);
  assert.ok(Math.abs(sim.hero.x - x0) > 20);
});
