import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import type { AddressInfo } from 'net';
import WebSocket from 'ws';
import { GameServer } from '../src/server/GameServer';
import { PROTOCOL } from '../src/net/protocol';
import type { C2S, S2C } from '../src/net/protocol';

type Msg = S2C;

/** A test browser: sends messages, waits for the ones it wants. */
class Browser {
  private queue: Msg[] = [];
  private waiters: { test: (m: Msg) => boolean; resolve: (m: Msg) => void }[] = [];
  readonly key = crypto.randomBytes(32).toString('hex');
  closed = false;
  private constructor(readonly ws: WebSocket) {
    ws.on('message', data => {
      const m = JSON.parse(String(data)) as Msg;
      const i = this.waiters.findIndex(w => w.test(m));
      if (m.t === 'tick' && m.sc !== undefined) this.inScene = !!m.sc;
      if (i >= 0) this.waiters.splice(i, 1)[0].resolve(m);
      else if (m.t !== 'tick') this.queue.push(m);
    });
    ws.on('close', () => (this.closed = true));
  }
  /** A scene is playing where my hero is. */
  inScene = false;

  /** Click through a scene, a click at a time like a player (some steps wait a moment). */
  async skipScene(): Promise<void> {
    for (let i = 0; i < 80 && this.inScene; i++) {
      this.send({ t: 'cmd', c: 'sceneNext', a: [] });
      await new Promise(r => setTimeout(r, 100));
    }
    assert.equal(this.inScene, false, 'the scene ended');
  }

  static async open(port: number): Promise<Browser> {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    await new Promise((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });
    return new Browser(ws);
  }

  send(m: C2S | Record<string, unknown>): void {
    this.ws.send(JSON.stringify(m));
  }

  next<K extends Msg['t']>(
    t: K,
    test: (m: Extract<Msg, { t: K }>) => boolean = () => true,
    ms = 3000
  ): Promise<Extract<Msg, { t: K }>> {
    const pick = (m: Msg) => m.t === t && test(m as Extract<Msg, { t: K }>);
    const i = this.queue.findIndex(pick);
    if (i >= 0) return Promise.resolve(this.queue.splice(i, 1)[0] as Extract<Msg, { t: K }>);
    return new Promise((resolve, reject) => {
      const w = { test: pick, resolve: resolve as (m: Msg) => void };
      this.waiters.push(w);
      setTimeout(() => {
        this.waiters = this.waiters.filter(x => x !== w);
        reject(new Error(`no '${t}' within ${ms} ms`));
      }, ms);
    });
  }

  /** Say hello with this browser's key, and make a character. */
  async character(name: string, look = 'k1'): Promise<string> {
    this.send({ t: 'hello', v: PROTOCOL, account: this.key });
    await this.next('welcome');
    this.send({ t: 'newChar', name, look });
    const made = await this.next('chars', m => !!m.made);
    return made.made!;
  }

  close(): void {
    this.ws.close();
  }
}

let server: http.Server;
let game: GameServer;
let port = 0;
let dataDir = '';
const silence = { log: console.log, warn: console.warn };
const unique = (base: string) => base + crypto.randomBytes(2).toString('hex');

async function start(
  dev: boolean
): Promise<{ server: http.Server; game: GameServer; port: number }> {
  const s = http.createServer();
  const g = new GameServer({ dev, dataDir });
  g.attach(s);
  await new Promise<void>(r => s.listen(0, r));
  return { server: s, game: g, port: (s.address() as AddressInfo).port };
}

before(async () => {
  console.log = () => {};
  console.warn = () => {};
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qfv-server-'));
  ({ server, game, port } = await start(true));
});

after(() => {
  game.close();
  server.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log = silence.log;
  console.warn = silence.warn;
});

const saved = (id: string) =>
  JSON.parse(fs.readFileSync(path.join(dataDir, 'characters', id + '.json'), 'utf8'));

test('hello: an old game or a bad key is turned away', async () => {
  const b = await Browser.open(port);
  b.send({ t: 'hello', v: PROTOCOL - 1, account: b.key });
  assert.match((await b.next('error')).msg, /out of date/);
  b.send({ t: 'hello', v: PROTOCOL, account: 'not-a-key' });
  assert.match((await b.next('error')).msg, /unreadable/);
  b.send({ t: 'hello', v: PROTOCOL, account: b.key });
  assert.deepEqual((await b.next('welcome')).chars, []);
  b.close();
});

test('two players: host, see the room, join, see each other', async () => {
  const a = await Browser.open(port);
  const b = await Browser.open(port);
  const ca = await a.character(unique('Ana'));
  const cb = await b.character(unique('Bo'), 'k2');
  a.send({ t: 'host', name: 'Test room', char: ca });
  const joined = await a.next('joined');
  b.send({ t: 'list' });
  const rooms = await b.next('rooms');
  assert.ok(rooms.rooms.some(r => r.id === joined.room.id && r.players.length === 1));
  b.send({ t: 'join', room: joined.room.id, char: cb });
  await b.next('joined');
  const seen = await b.next('tick', m => m.hs.length === 1);
  assert.equal(seen.hs[0][2], 'k1', "Bo sees Ana's look");
  await a.next('tick', m => m.hs.length === 1 && m.hs[0][2] === 'k2');
  a.close();
  b.close();
});

test('a character plays in one room at a time, and only for its own account', async () => {
  const a = await Browser.open(port);
  const ca = await a.character(unique('Cy'));
  a.send({ t: 'host', name: 'Mine', char: ca });
  const joined = await a.next('joined');
  const tab2 = await Browser.open(port);
  tab2.send({ t: 'hello', v: PROTOCOL, account: a.key });
  const w = await tab2.next('welcome');
  assert.equal(w.chars[0].busy, true);
  tab2.send({ t: 'join', room: joined.room.id, char: ca });
  assert.match((await tab2.next('error')).msg, /already playing/);
  const other = await Browser.open(port);
  await other.character(unique('Di'));
  other.send({ t: 'join', room: joined.room.id, char: ca });
  assert.match((await other.next('error')).msg, /Pick one of your/);
  for (const x of [a, tab2, other]) x.close();
});

test('leaving saves the character; coming back, it is all there', async () => {
  const a = await Browser.open(port);
  const ca = await a.character(unique('Ed'));
  a.send({ t: 'host', name: 'Save test', char: ca });
  await a.next('joined');
  a.send({ t: 'cmd', c: 'gainXp', a: [500] });
  await a.next('tick', m => (m.mf?.level ?? 0) > 1);
  a.send({ t: 'leave' });
  await a.next('left');
  const chars = await a.next('chars');
  const level = chars.chars[0].level;
  assert.ok(level > 1);
  assert.equal(saved(ca).save.level, level);
  a.send({ t: 'host', name: 'Again', char: ca });
  await a.next('joined');
  await a.next('tick', m => m.mf?.level === level);
  a.close();
});

test('stopping the server saves everyone still playing', async () => {
  const own = await start(true);
  const a = await Browser.open(own.port);
  const ca = await a.character(unique('Fe'));
  a.send({ t: 'host', name: 'Shutdown', char: ca });
  await a.next('joined');
  a.send({ t: 'cmd', c: 'gainXp', a: [900] });
  const t = await a.next('tick', m => (m.mf?.level ?? 0) > 1);
  // before the 5-second save could happen
  own.game.close();
  own.server.close();
  assert.equal(saved(ca).save.level, t.mf!.level);
});

test('junk from a browser never takes the server down', async () => {
  const a = await Browser.open(port);
  const ca = await a.character(unique('Gus'));
  a.send({ t: 'host', name: 'Junk', char: ca });
  await a.next('joined');
  a.ws.send('{ not json');
  for (const c of ['__proto__', 'constructor', 'toString', 'nope'])
    for (const args of [[], ['__proto__'], [{ a: 1 }]]) a.send({ t: 'cmd', c, a: args });
  a.send({ t: 'move', x: 'far', y: null } as Record<string, unknown>);
  a.send({ t: 'cmd', c: 'castKey' });
  a.send({ t: 'nonsense' });
  await a.next('tick');
  assert.equal(a.closed, false);
  // too big: that browser is dropped, nobody else
  const big = await Browser.open(port);
  big.ws.send('x'.repeat(40_000));
  await new Promise(r => big.ws.once('close', r));
  const fresh = await Browser.open(port);
  fresh.send({ t: 'hello', v: PROTOCOL, account: fresh.key });
  await fresh.next('welcome');
  a.send({ t: 'ping', n: 1 });
  await a.next('pong');
  a.close();
  fresh.close();
});

test('moves are checked: an impossible one sends the hero back', async () => {
  const a = await Browser.open(port);
  const ca = await a.character(unique('Hal'));
  a.send({ t: 'host', name: 'Moves', char: ca });
  await a.next('joined');
  // the opening scene holds everyone still: click through it first
  await a.next('tick');
  await a.skipScene();
  const t0 = await a.next('tick');
  a.send({
    t: 'move',
    x: t0.me.x + 4000,
    y: t0.me.y,
    face: 1,
    walk: 1,
    jumpT: -1,
    jumpFlip: false,
  });
  const t1 = await a.next('tick', m => m.me.tp > t0.me.tp);
  assert.equal(t1.me.x, t0.me.x);
  a.close();
});

test('without dev mode, the cheats are not there', async () => {
  const prod = await start(false);
  const a = await Browser.open(prod.port);
  const ca = await a.character(unique('Ivy'));
  a.send({ t: 'host', name: 'Prod', char: ca });
  await a.next('joined');
  a.send({ t: 'cmd', c: 'gainXp', a: [5000] });
  await new Promise(r => setTimeout(r, 300));
  a.send({ t: 'leave' });
  await a.next('left');
  assert.equal((await a.next('chars')).chars[0].level, 1);
  a.close();
  prod.game.close();
  prod.server.close();
});

test('an archer online: the class comes through, and the arrows fly for everyone', async () => {
  const a = await Browser.open(port);
  a.send({ t: 'hello', v: PROTOCOL, account: a.key });
  await a.next('welcome');
  a.send({ t: 'newChar', name: unique('Ash'), look: 'k2', cls: 'archer' });
  const made = await a.next('chars', m => !!m.made);
  const info = made.chars.find(c => c.id === made.made)!;
  assert.equal(info.cls, 'archer');
  assert.equal(info.equip.weapon, 'worn_shortbow');
  a.send({ t: 'host', name: 'Archery', char: made.made! });
  await a.next('joined');
  const first = await a.next('tick', m => !!m.mf);
  assert.equal(first.mf!.cls, 'archer');
  assert.ok(first.mf!.bar.includes('quickshot'));
  await a.skipScene();
  a.send({ t: 'cmd', c: 'spawnNear', a: ['cow'] });
  const withCow = await a.next('tick', m => m.en.some(e => e[1] === 'cow' && e[6] & 8));
  const cow = withCow.en.filter(e => e[1] === 'cow' && e[6] & 8).pop()!;
  a.send({ t: 'cmd', c: 'setTarget', a: [cow[0]] });
  a.send({ t: 'cmd', c: 'castKey', a: ['quickshot'] });
  await a.next('tick', m =>
    (m.ev ?? []).some(e => e[1] === 'fx' && (e[2] as { type: string }).type === 'arrow')
  );
  a.close();
});
