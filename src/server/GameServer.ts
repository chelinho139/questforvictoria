import type { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Game } from '../sim/Game';
import { mergeStory } from '../sim/save';
import type { SaveData } from '../sim/save';
import { REGIONS, START_REGION } from '../data/regions';
import { QUESTS } from '../data/quests';
import { CLASSES, isClass } from '../data/classes';
import { isDifficulty } from '../data/difficulty';
import type { Difficulty } from '../data/difficulty';
import { PROTOCOL, ROOM_MAX, TICK_HZ } from '../net/protocol';
import type { C2S, S2C, RoomInfo, CharInfo } from '../net/protocol';
import { COMMANDS, DEV_COMMANDS } from '../net/commands';
import { Session } from './Session';
import { Store } from './Store';
import type { AccountRecord, CharRecord } from './Store';

/** How often the characters in rooms are written to disk (only when something changed). */
const SAVE_EVERY_S = 5;
/**
 * A browser that hasn't answered for this long has gone (a dropped network). The server
 * pings every PING_MS at the WebSocket level, which the browser answers by itself even when
 * its tab is in the background (where its own timers slow to once a minute).
 */
const SILENT_MS = 45_000;
const PING_MS = 10_000;

interface Client {
  id: string;
  ws: WebSocket;
  account: AccountRecord | null;
  /** The character being played, while in a room. */
  char: CharRecord | null;
  room: Room | null;
  session: Session | null;
  /** The last save written for the character (without its time), to skip unchanged ones. */
  savedKey: string;
  /** Messages per second, to drop a browser that floods. */
  budget: number;
  lastSeen: number;
}

class Room {
  readonly game = new Game();
  readonly members = new Set<Client>();
  emptySince = Date.now();
  /** Where the party was last (for the room list, and where someone joining an empty room starts). */
  lastRegion = START_REGION;
  constructor(
    readonly id: string,
    readonly name: string,
    /** The character who opened it: their story is the room's. */
    readonly owner: string
  ) {}

  info(): RoomInfo {
    const heroes = this.game.heroes;
    const main = Object.keys(this.game.quests).filter(id => QUESTS[id].main);
    const lastMain = main[main.length - 1];
    return {
      id: this.id,
      name: this.name,
      players: heroes.map(h => ({ name: h.name, level: h.level })),
      max: ROOM_MAX,
      place: REGIONS[heroes[0]?.regionId || this.lastRegion]?.name ?? '',
      story: lastMain ? QUESTS[lastMain].name : 'Just beginning',
      difficulty: this.game.difficulty,
    };
  }
}

const clean = (s: unknown, max: number) =>
  typeof s === 'string'
    ? s
        .replace(/[\u0000-\u001f<>]/g, '')
        .trim()
        .slice(0, max)
    : '';

/**
 * The game server. A browser connects over a WebSocket at /ws with its account key, picks
 * one of its characters (kept on the server's disk, like Diablo II's), and hosts or joins a
 * room. Each room is one Game ticking TICK_HZ times a second; each player gets a snapshot of
 * what changed every tick. Characters are written back every few seconds, on leaving, and
 * when the server stops; rooms themselves come and go.
 */
export class GameServer {
  private readonly rooms = new Map<string, Room>();
  private readonly clients = new Set<Client>();
  private readonly store: Store;
  /** Characters in a room right now, so one can't play twice. */
  private readonly playing = new Map<string, Client>();
  private nextClient = 1;
  private timer: NodeJS.Timeout | null = null;
  private wss: WebSocketServer | null = null;
  private last = Date.now();
  private saveT = 0;
  private lastPing = Date.now();
  private readonly dev: boolean;

  constructor(opts: { dev?: boolean; dataDir: string }) {
    this.dev = opts.dev ?? false;
    this.store = new Store(opts.dataDir);
  }

  attach(http: HttpServer): void {
    // snapshots are repetitive JSON: compressed they are a fraction of the size
    const wss = new WebSocketServer({
      server: http,
      path: '/ws',
      maxPayload: 16 * 1024,
      perMessageDeflate: { threshold: 256 },
    });
    wss.on('connection', ws => this.connect(ws));
    this.wss = wss;
    this.timer = setInterval(() => this.loop(), 1000 / TICK_HZ);
  }

  /** Stop: write every character in a room, and let the browsers go (server.js calls this on SIGINT / SIGTERM). */
  close(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    console.log(`[game] stopping: saving ${this.playing.size} characters`);
    this.saveAll();
    for (const c of this.clients) c.ws.terminate();
    this.wss?.close();
  }

  private send(c: Client, m: S2C): void {
    if (c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify(m));
  }

  private connect(ws: WebSocket): void {
    const c: Client = {
      id: 'p' + this.nextClient++,
      ws,
      account: null,
      char: null,
      room: null,
      session: null,
      savedKey: '',
      budget: 200,
      lastSeen: Date.now(),
    };
    this.clients.add(c);
    ws.on('message', data => {
      c.lastSeen = Date.now();
      if (--c.budget < 0) return; // a flood: ignore until the budget refills
      let m: C2S;
      try {
        m = JSON.parse(String(data)) as C2S;
      } catch {
        return;
      }
      try {
        this.handle(c, m);
      } catch (err) {
        console.error('[game] message failed', m.t, err);
      }
    });
    ws.on('pong', () => (c.lastSeen = Date.now()));
    ws.on('close', () => {
      this.leave(c);
      this.clients.delete(c);
    });
    // a bad frame (too big, malformed): drop that browser, never the server
    ws.on('error', err => {
      console.warn(`[game] ${c.char?.name ?? c.id}: ${err.message}`);
      ws.terminate();
    });
  }

  private handle(c: Client, m: C2S): void {
    if (m.t === 'hello') return this.hello(c, m.v, m.account);
    const a = c.account;
    if (!a) return;
    switch (m.t) {
      case 'chars':
        return this.sendChars(c);
      case 'newChar': {
        const look = typeof m.look === 'string' && /^[a-z0-9]{1,16}$/.test(m.look) ? m.look : 'k1';
        const cls = isClass(m.cls) ? m.cls : 'warrior';
        const made = this.store.create(a, typeof m.name === 'string' ? m.name : '', look, cls);
        if (typeof made === 'string')
          return this.send(c, { t: 'error', msg: made, about: 'newChar' });
        console.log(`[game] new character ${made.name} (${made.cls})`);
        return this.sendChars(c, made.id);
      }
      case 'delChar': {
        const ch = this.store.charOf(a, String(m.id));
        if (!ch) return;
        if (this.playing.has(ch.id))
          return this.send(c, { t: 'error', msg: `${ch.name} is playing right now.` });
        this.store.remove(a, ch.id);
        console.log(`[game] deleted character ${ch.name}`);
        return this.sendChars(c);
      }
      case 'list':
        return this.send(c, { t: 'rooms', rooms: [...this.rooms.values()].map(r => r.info()) });
      case 'host': {
        const ch = this.pick(c, m.char);
        if (!ch) return;
        const room = new Room(this.roomId(), clean(m.name, 24) || `${ch.name}'s room`, ch.id);
        this.rooms.set(room.id, room);
        // as hard as asked; else as hard as their campaign
        const own = ch.save?.difficulty;
        const difficulty = isDifficulty(m.difficulty) ? m.difficulty : isDifficulty(own) ? own : 'normal';
        console.log(`[game] ${ch.name} opens room ${room.id} "${room.name}" (${difficulty})`);
        return this.enter(c, room, ch, true, difficulty);
      }
      case 'join': {
        const room = this.rooms.get(String(m.room));
        if (!room) return this.send(c, { t: 'error', msg: 'That room has closed.' });
        if (room.members.size >= ROOM_MAX)
          return this.send(c, { t: 'error', msg: 'That room is full.' });
        const ch = this.pick(c, m.char);
        if (!ch) return;
        return this.enter(c, room, ch, false);
      }
      case 'leave':
        this.leave(c);
        this.send(c, { t: 'left' });
        return this.sendChars(c);
      case 'move': {
        const s = c.session;
        if (!s || !c.room) return;
        const now = Date.now() / 1000;
        const dt = s.lastMoveAt ? Math.min(1, now - s.lastMoveAt) : 0.05;
        s.lastMoveAt = now;
        if (![m.x, m.y, m.walk, m.jumpT].every(Number.isFinite)) return;
        s.hero.applyMove(
          m.x,
          m.y,
          m.face === -1 ? -1 : 1,
          m.walk,
          Math.min(m.jumpT, 1),
          !!m.jumpFlip,
          dt
        );
        return;
      }
      case 'cmd': {
        const s = c.session;
        if (!s || typeof m.c !== 'string' || !Array.isArray(m.a)) return;
        // only the whitelist's own entries (not "constructor", "__proto__" and friends)
        const fn = Object.prototype.hasOwnProperty.call(COMMANDS, m.c)
          ? COMMANDS[m.c]
          : this.dev && Object.prototype.hasOwnProperty.call(DEV_COMMANDS, m.c)
            ? DEV_COMMANDS[m.c]
            : undefined;
        if (fn) fn(s.hero, m.a);
        return;
      }
      case 'ping':
        return this.send(c, { t: 'pong', n: m.n });
    }
  }

  private hello(c: Client, v: number, key: unknown): void {
    if (v !== PROTOCOL)
      return this.send(c, { t: 'error', msg: 'This game is out of date. Reload the page.' });
    if (typeof key !== 'string' || !/^[a-f0-9]{32,128}$/.test(key))
      return this.send(c, {
        t: 'error',
        msg: "This browser's key is unreadable. Reload the page.",
      });
    c.account = this.store.account(key);
    this.send(c, { t: 'welcome', id: c.id, chars: this.charInfos(c.account) });
  }

  private sendChars(c: Client, made?: string): void {
    if (c.account) this.send(c, { t: 'chars', chars: this.charInfos(c.account), made });
  }

  private charInfos(a: AccountRecord): CharInfo[] {
    return this.store.charsOf(a).map(ch => {
      const s = ch.save;
      const cls = isClass(ch.cls) ? ch.cls : 'warrior';
      return {
        id: ch.id,
        name: ch.name,
        look: ch.look,
        cls,
        level: s?.level ?? 1,
        equip: s?.equip ?? CLASSES[cls].starter,
        place: s ? (REGIONS[s.region]?.name ?? '') : 'The lakeshore',
        at: s?.at ?? 0,
        busy: this.playing.has(ch.id),
        difficulty: isDifficulty(s?.difficulty) ? s.difficulty : 'normal',
      };
    });
  }

  /** The character a browser wants to play: theirs, and not already playing somewhere. */
  private pick(c: Client, id: unknown): CharRecord | null {
    const ch = c.account && this.store.charOf(c.account, String(id));
    if (!ch) {
      this.send(c, { t: 'error', msg: 'Pick one of your characters first.' });
      return null;
    }
    const other = this.playing.get(ch.id);
    if (other && other !== c) {
      this.send(c, {
        t: 'error',
        msg: `${ch.name} is already playing (in another tab or browser).`,
      });
      return null;
    }
    return ch;
  }

  private roomId(): string {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (;;) {
      let id = '';
      for (let i = 0; i < 4; i++) id += abc[Math.floor(Math.random() * abc.length)];
      if (!this.rooms.has(id)) return id;
    }
  }

  /**
   * Put a character in a room. The one who opened it brings the whole campaign (their story,
   * where they stood, what they built), at the difficulty they chose for the room; anyone
   * joining brings themselves and arrives where the party is.
   */
  private enter(c: Client, room: Room, ch: CharRecord, opening: boolean, difficulty?: Difficulty): void {
    this.leave(c);
    const game = room.game;
    const where = game.heroes[0]?.regionId || room.lastRegion;
    const hero = game.addHero(c.id, ch.name, opening ? START_REGION : where);
    hero.driven = 'remote';
    hero.look = ch.look;
    hero.cls = isClass(ch.cls) ? ch.cls : 'warrior';
    if (ch.save) {
      if (opening) game.loadSave(ch.save, hero);
      else game.loadHero(ch.save, hero);
    } else {
      // a new character: their class's spells and starting kit (and the party's open quests)
      hero.resetHero();
      game.shareQuests(hero);
    }
    if (opening && difficulty) game.setDifficulty(difficulty);
    hero.log(`You join ${room.name}.`, 't');
    for (const o of game.heroes) if (o !== hero) o.log(`${hero.name} joins the room.`, 't');
    c.room = room;
    c.char = ch;
    c.session = new Session(hero);
    c.savedKey = '';
    room.members.add(c);
    this.playing.set(ch.id, c);
    console.log(`[game] ${ch.name} joins ${room.id} (${room.members.size} in it)`);
    this.send(c, { t: 'joined', room: room.info(), hero: hero.id });
  }

  private leave(c: Client): void {
    const room = c.room;
    if (!room || !c.session || !c.char) return;
    const hero = c.session.hero;
    // walking out of a duel loses it: settled first, so the save has it
    room.game.duels.left(hero);
    room.game.trades.left(hero);
    this.saveChar(c);
    if (hero.regionId) room.lastRegion = hero.regionId;
    c.session.dispose();
    room.game.removeHero(hero);
    room.members.delete(c);
    this.playing.delete(c.char.id);
    for (const o of room.game.heroes) o.log(`${hero.name} leaves the room.`, 't');
    if (!room.members.size) room.emptySince = Date.now();
    console.log(`[game] ${c.char.name} leaves ${room.id}`);
    c.room = null;
    c.session = null;
    c.char = null;
  }

  /**
   * Write a character as they are now: the hero, where they stand, and the story. The room's
   * owner takes the room's whole campaign; anyone else adds what they saw happen to the story
   * they already knew, and keeps their own campfires, clock and difficulty.
   */
  private saveChar(c: Client): void {
    const ch = c.char;
    const room = c.room;
    if (!ch || !room || !c.session) return;
    const now = room.game.toSave(c.session.hero);
    const before = ch.save;
    const guest = ch.id !== room.owner;
    const save: SaveData =
      before && guest
        ? { ...now, ...mergeStory(before, now), built: before.built, day: before.day }
        : now;
    // a guest's campaign stays as hard as they had it (a new character's: normal)
    if (guest) save.difficulty = before?.difficulty;
    const key = JSON.stringify({ ...save, at: 0 });
    if (key === c.savedKey) return;
    c.savedKey = key;
    ch.save = save;
    try {
      this.store.save(ch);
    } catch (err) {
      console.error(`[game] couldn't save ${ch.name}`, err);
    }
  }

  private saveAll(): void {
    for (const c of this.clients) this.saveChar(c);
  }

  private loop(): void {
    const now = Date.now();
    // at most a few ticks' worth at once, so a stall slows the world instead of spiralling
    const dt = Math.min(0.15, (now - this.last) / 1000);
    this.last = now;
    const ping = now - this.lastPing >= PING_MS;
    if (ping) this.lastPing = now;
    for (const c of this.clients) {
      c.budget = Math.min(200, c.budget + 20);
      // a browser that went quiet without closing (a dropped network): let its character go
      if (now - c.lastSeen > SILENT_MS) c.ws.terminate();
      else if (ping && c.ws.readyState === WebSocket.OPEN) c.ws.ping();
    }
    this.saveT += dt;
    if (this.saveT >= SAVE_EVERY_S) {
      this.saveT = 0;
      this.saveAll();
    }
    for (const room of this.rooms.values()) {
      if (!room.members.size) {
        // an empty room waits five minutes for someone to come back, then closes
        if (now - room.emptySince > 5 * 60_000) {
          this.rooms.delete(room.id);
          console.log(`[game] room ${room.id} closed`);
        }
        continue;
      }
      try {
        room.game.tick(dt);
      } catch (err) {
        console.error(`[game] room ${room.id} tick failed`, err);
      }
      for (const c of room.members) {
        if (!c.session) continue;
        try {
          this.send(c, { t: 'tick', ...c.session.build(dt) });
        } catch (err) {
          console.error(`[game] snapshot for ${c.char?.name ?? c.id} failed`, err);
        }
      }
    }
  }
}

/** Start the game server on an HTTP server (server.js calls this). */
export function attachGameServer(
  http: HttpServer,
  opts: { dev?: boolean; dataDir: string }
): GameServer {
  const gs = new GameServer(opts);
  gs.attach(http);
  return gs;
}
