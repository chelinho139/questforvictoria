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
 * back to the browser, 20 a second, like the real thing. `lag` is the line's delay each way,
 * in frames (0: instant).
 */
function online(cls: ClassId, lag = 0) {
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
    rtt: lag * 2 * 50,
    closed: false,
    on: (h: (m: S2C) => void) => {
      handlers.add(h);
      return () => handlers.delete(h);
    },
    send: (m: C2S) => void sent.push(m),
    close: () => {},
  } as unknown as Connection;
  const room = { id: 'TEST', name: 'Test', players: [], max: 8, place: '', story: '', difficulty: 'normal' as const };
  const sim = new NetSim(conn, { room, hero: 'p1' }, session.build(0.05));
  /** What is on the line each way, with the frame it arrives on. */
  const up: { at: number; m: C2S }[] = [];
  const down: { at: number; m: S2C }[] = [];
  let n = 0;
  /** One server frame: run what the browser sent, tick, send the snapshot back, and let the browser draw a frame. */
  const frame = () => {
    n++;
    for (const m of sent.splice(0)) up.push({ at: n + lag, m });
    while (up.length && up[0].at <= n) {
      const m = up.shift()!.m;
      if (m.t === 'cmd') COMMANDS[m.c]?.(server, m.a);
      if (m.t === 'move') server.applyMove(m.x, m.y, m.face, m.walk, m.jumpT, m.jumpFlip, 0.05);
    }
    game.tick(0.05);
    down.push({ at: n + lag, m: { t: 'tick', ...session.build(0.05) } });
    while (down.length && down[0].at <= n) {
      const m = down.shift()!.m;
      for (const h of handlers) h(m);
    }
    sim.tick(0.05);
  };
  const run = (s: number) => {
    for (let i = 0; i < s * 20; i++) frame();
  };
  return { game, server, sim, cow, conn, run, frame };
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

test('online, the ping does not stretch the hold after a shot, nor stop the feet mid-step', () => {
  // a slow line: 200 ms each way, so the server's word on the hold comes back 400 ms after the key
  const { server, sim, cow, run, frame } = online('archer', 4);
  run(1);
  // how far a second's walk goes on this line, with nothing in the way
  const start = sim.hero.x;
  sim.hero.inputMove = { x: 1, y: 0 };
  run(1);
  sim.hero.inputMove = { x: 0, y: 0 };
  const stride = Math.abs(sim.hero.x - start);
  run(1);
  sim.setTarget(sim.enemies.find(e => e.id === cow.id)!);
  assert.ok(sim.castKey('aimedshot'));
  assert.ok(sim.hero.aimT > 0, 'holding still for the draw');
  // the hold is the browser's own 0.3 s, however slow the line
  run(0.35);
  assert.equal(sim.hero.aimT, 0, 'the hold is over');
  // walk on: the server's late copy of the hold must not plant the feet again
  const x0 = sim.hero.x;
  sim.hero.inputMove = { x: 1, y: 0 };
  let held = 0;
  for (let i = 0; i < 20; i++) {
    frame();
    held = Math.max(held, sim.hero.aimT);
  }
  sim.hero.inputMove = { x: 0, y: 0 };
  assert.equal(held, 0, 'never held again');
  const walked = Math.abs(sim.hero.x - x0);
  assert.ok(
    walked > 0.95 * stride,
    `walked ${walked.toFixed(0)} of ${stride.toFixed(0)} in a second`
  );
  run(0.5);
  assert.ok(Math.abs(server.x - x0) > 0.95 * stride, 'and on the server');
  assert.ok(cow.hp < cow.hpMax, 'the arrow hit');
});

test("online, an auto-shot's hold reaches the browser once, shortened by the line, and not mid-step", () => {
  const { game, server, sim, cow, conn, run, frame } = online('archer', 2);
  // (a cow runs out of bowshot after the first arrow: this one stays)
  game.cheats.freezeEnemies = true;
  run(1);
  sim.setTarget(sim.enemies.find(e => e.id === cow.id)!);
  // standing still with a target, the server shoots on its own; each shot holds the browser
  // for a moment, less the time its news took to arrive (100 ms of a 200 ms round trip)
  let holds = 0;
  let longest = 0;
  for (let i = 0; i < 100; i++) {
    const before = sim.hero.aimT;
    frame();
    if (sim.hero.aimT > before) holds++;
    longest = Math.max(longest, sim.hero.aimT);
  }
  assert.ok(server.shots >= 2, `${server.shots} auto-shots`);
  assert.equal(holds, server.shots, 'one hold heard per shot');
  assert.ok(longest > 0 && longest <= 0.2 - conn.rtt / 2000 + 1e-9, `held ${longest.toFixed(2)} s at most`);
  // walking away: the news of a shot loosed as the feet left does not stop them
  run(0.5);
  sim.hero.inputMove = { x: -1, y: 0 };
  let held = 0;
  for (let i = 0; i < 20; i++) {
    frame();
    held = Math.max(held, sim.hero.aimT);
  }
  sim.hero.inputMove = { x: 0, y: 0 };
  assert.equal(held, 0, 'the feet were never planted again');
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

test('online, the browser has the same rain and the same lightning as the server', () => {
  const { game, sim, run } = online('warrior');
  game.weather.forced = 'storm';
  run(20);
  assert.equal(sim.weather.kind, 'storm');
  assert.ok(Math.abs(sim.weather.rain - game.weather.rain) < 0.01);
  assert.equal(sim.weather.seed, game.weather.seed);
  // from here on, strike for strike (the browser runs the same schedule between snapshots). The
  // browser is a frame ahead of the server, so a strike it has just made may still be to come
  // on the server: what counts as old is what the server has had already, not the browser.
  const key = (s: (typeof game.weather.strikes)[number]) => `${s.dist} ${s.u.toFixed(4)} ${s.v.toFixed(4)}`;
  const old = new Set(game.weather.strikes.map(key));
  const seen = (w: typeof game.weather, out: string[], last: { id: number }) => {
    for (const s of w.strikes) if (s.id > last.id && !old.has(key(s))) out.push(key(s));
    last.id = w.strikes.at(-1)?.id ?? last.id;
  };
  const a: string[] = [];
  const b: string[] = [];
  const la = { id: 0 };
  const lb = { id: 0 };
  for (let i = 0; i < 60; i++) {
    run(1);
    seen(game.weather, a, la);
    seen(sim.weather, b, lb);
  }
  assert.ok(a.length >= 3, `${a.length} strikes in a minute`);
  // (one at the very end may still be on its way to the server)
  assert.deepEqual(b.slice(0, a.length - 1), a.slice(0, a.length - 1));
});
