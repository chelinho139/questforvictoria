import { Sim } from '../sim/Sim';
import type { CheatSwitches } from '../sim/Sim';
import { Hero } from '../sim/Hero';
import type { Region } from '../sim/Region';
import { KINDS } from '../data/enemies';
import type { EnemyKind } from '../data/enemies';
import type { Key, WheelKey } from '../data/skills';
import type { NpcId } from '../data/npcs';
import type { ItemId, Slot } from '../data/items';
import { CHOP, MINE } from '../data/items';
import type { SpellKey } from '../data/spells';
import { STRUCTURES } from '../data/crafting';
import type { StructureKind } from '../data/crafting';
import { T } from '../sim/map';
import type { SaveData } from '../sim/save';
import type { Enemy, ButtonId, Stack, QuestProgress, SceneLine } from '../sim/types';
import type { Connection } from './Connection';
import type { Tick, RoomInfo, EnemySnap, HeroSnap } from './protocol';
import { TICK_HZ } from './protocol';
import { isShot } from '../data/skills';
import { AIM_HOLD } from '../data/classes';

/** Something drawn where the server last put it, gliding there between snapshots. */
interface Glide {
  _tx?: number;
  _ty?: number;
}

/**
 * The game as one player sees it when playing online. The server runs the real game; this
 * keeps a replica of the part the player can see (their region, the other heroes in it,
 * the story) from the server's snapshots, walks the player's own hero here (so it answers
 * the keys at once; the server checks every step) and sends everything else the player does
 * to the server as commands. The scenes, the HUD and the windows read it exactly as they
 * read the single-player Sim.
 */
export class NetSim extends Sim {
  override readonly online = true;
  room: RoomInfo;
  /** My hero's id on the server. */
  readonly serverId: string;
  private readonly offConn: () => void;
  private tpSeen = -1;
  private moveT = 0;
  private sentMove = '';
  private heartbeat = 0;
  /** The scene step last shown (a change tells the scene box). */
  private sceneKey = '';

  constructor(
    private readonly conn: Connection,
    joined: { room: RoomInfo; hero: string },
    first: Tick
  ) {
    super(true);
    this.room = joined.room;
    this.serverId = joined.hero;
    const h = this.hero;
    h.driven = 'replica';
    h.net = (c, a) => this.cmd(c, a);
    this.offConn = conn.on(m => {
      if (m.t === 'tick') this.apply(m);
      else if (m.t === 'error') this.hero.log(m.msg, 'h');
    });
    this.apply(first);
  }

  /** Leave the room and close the line. */
  disconnect(): void {
    this.offConn();
    this.conn.send({ t: 'leave' });
    this.conn.close();
  }

  get rtt(): number {
    return this.conn.rtt;
  }

  private cmd(c: string, a: unknown[] = []): void {
    this.conn.send({ t: 'cmd', c, a });
  }

  // ---------- the snapshots ----------
  private apply(t: Tick): void {
    const g = this.game;
    const h = this.hero;
    if (t.sy) {
      g.flags = t.sy.flags;
      g.quests = t.sy.quests as Record<string, QuestProgress>;
      g.journal = t.sy.journal;
    }
    if (t.dy) {
      g.day.t = t.dy[0];
      g.day.day = t.dy[1];
    }
    if (t.rg !== h.regionId) this.enter(t);
    const R = this.R;
    if (t.mf) {
      const f = t.mf;
      if (h.cls !== f.cls) {
        h.cls = f.cls;
        h.applyClass();
      }
      Object.assign(h, {
        level: f.level,
        xp: f.xp,
        gold: f.gold,
        kills: f.kills,
        perf: f.perf,
        look: f.look,
        name: f.name,
      });
      h.talents = f.talents;
      h.applyTalents();
      h.bag = f.bag as (Stack | null)[];
      h.equip = f.equip as Hero['equip'];
      h.applyGear();
      h.bar = f.bar as (SpellKey | null)[];
      h.met.clear();
      for (const id of f.met) h.met.add(id as NpcId);
      h.questLog.clear();
      for (const [id, st] of Object.entries(f.quests)) h.questLog.set(id, st);
    }
    const me = t.me;
    if (me.tp !== this.tpSeen) {
      // the server moved my hero (a charge, a dodge, a respawn, a refused step)
      this.tpSeen = me.tp;
      h.x = me.x;
      h.y = me.y;
      h.stopMoving();
    }
    Object.assign(h, {
      hp: me.hp,
      hpMax: me.hpMax,
      mp: me.mp,
      mpMax: me.mpMax,
      t: me.t,
      dead: me.dead,
      buffT: me.buffT,
      invT: me.invT,
      bleedT: me.bleedT,
      berserkT: me.berserkT,
      lastStandT: me.lastStandT,
      mortalCd: me.mortalCd,
      intCd: me.intCd,
      dodgeCd: me.dodgeCd,
      mounted: me.mounted,
      mountT: me.mountT,
      exiting: me.exiting,
      rev: me.rev,
      revAuto: me.revAuto,
      revEnabled: me.revEnabled,
      seqI: me.seqI,
      cds: me.cds,
      acd: me.acd,
      predatorT: me.predatorT,
      hiddenT: me.hiddenT,
    });
    // holding still to shoot: what the server says, or what this browser started itself
    h.aimT = Math.max(h.aimT, me.aimT);
    // the short animations count down here; a fresh one from the server restarts them
    if (me.atkAnimT > h.atkAnimT + 0.06) h.atkAnimT = me.atkAnimT;
    if (me.flash > h.flash + 0.02) h.flash = me.flash;
    if (me.shake > h.shake + 0.02) h.shake = me.shake;
    if (me.swing > h.swing + 0.02) h.swing = me.swing;
    this.syncEnemies(R, t.en);
    h.target = me.target ? (R.enemies.find(e => e.id === me.target && e.alive) ?? null) : null;
    this.syncHeroes(R, t.hs);
    if (t.wd)
      for (const [id, x, y, alpha, face] of t.wd) {
        const w = R.wanderers.find(o => o.id === id) as (typeof R.wanderers)[number] & Glide;
        if (!w) continue;
        w._tx = x;
        w._ty = y;
        w.alpha = alpha;
        w.face = face as 1 | -1;
      }
    if (t.dr) this.syncDrops(R, t.dr);
    if (t.tr) this.syncTrees(R, t.tr);
    if (t.rk) this.syncRocks(R, t.rk);
    if (t.st) this.syncStructures(R, t.st as [number, StructureKind, number, number, number][]);
    if (t.ob) this.syncObjects(R, t.ob as string[]);
    if (t.np) this.syncNpcs(R, t.np);
    if (t.tz) R.traps = t.tz.map(([x, y], i) => ({ id: i, x, y, owner: '', t: 60, hold: 0 }));
    if (t.hz)
      R.hazards = (t.hz as [number, number, number, number, number][]).map(
        ([x, y, r, speed, max]) => ({ x, y, r, speed, max, dmg: 0, hit: true, what: '' })
      );
    if (t.sc !== undefined)
      R.scene = t.sc as {
        id: string;
        i: number;
        t: number;
        line: SceneLine | null;
        look: { x: number; y: number } | null;
      } | null;
    // what happened: to me, around me, to us all (after the state, so listeners read it fresh)
    for (const [aud, name, p] of t.ev ?? []) {
      if (aud === 'h') {
        if (name === 'region') continue;
        if (name === 'log') {
          const l = p as { text: string; cls: '' | 'c' | 'h' | 't' };
          h.log(l.text, l.cls);
        } else h.events.emit(name as never, p as never);
      } else if (aud === 'r') {
        // the scene is told from its snapshot (below), which also covers arriving mid-scene
        if (name !== 'scene') R.events.emit(name as never, p as never);
      } else g.events.emit(name as never, p as never);
    }
    const sk = R.scene ? `${R.scene.id}:${R.scene.i}:${R.scene.line?.text ?? ''}` : '';
    if (sk !== this.sceneKey) {
      this.sceneKey = sk;
      this.events.emit('scene', {});
    }
  }

  /** A new region: build its replica (the ground, the buildings, the people) and stand in it. */
  private enter(t: Tick): void {
    const g = this.game;
    const h = this.hero;
    for (const r of g.regions.values()) r.events.clear();
    g.regions.clear();
    g.heroes = [h];
    h.regionId = t.rg;
    const R = g.region(t.rg);
    // its creatures and drops come from the server
    R.enemies = [];
    R.drops = [];
    h.arrived();
    h.x = t.me.x;
    h.y = t.me.y;
    this.tpSeen = t.me.tp;
    this.listenToRegion();
    h.events.emit('region', { id: t.rg });
  }

  private glide(o: { x: number; y: number } & Glide, x: number, y: number): void {
    // new, or far away (a respawn, a charge): jump there; otherwise glide
    if (o._tx === undefined || Math.hypot(o.x - x, o.y - y) > 160) {
      o.x = x;
      o.y = y;
    }
    o._tx = x;
    o._ty = y;
  }

  private syncEnemies(R: Region, list: EnemySnap[]): void {
    const by = new Map(R.enemies.map(e => [e.id, e as Enemy & Glide]));
    const next: Enemy[] = [];
    for (const [
      id,
      kind,
      x,
      y,
      hp,
      hpMax,
      flags,
      dieT,
      riseT,
      face,
      walk,
      castT,
      castTotal,
      stunT,
      phase,
      sunderT,
    ] of list) {
      let e = by.get(id);
      if (!e) {
        const def = KINDS[kind as EnemyKind];
        if (!def) continue;
        e = {
          id,
          kind: kind as EnemyKind,
          def,
          n: def.n,
          x,
          y,
          sx: x,
          sy: y,
          hp,
          hpMax,
          aggro: false,
          wanderT: 0,
          wx: 0,
          wy: 0,
          atkT: 0,
          tele: false,
          castT,
          castTotal,
          castCd: 0,
          stunT,
          sunderT,
          alive: true,
          respawnT: 0,
          dieT,
          flash: 0,
          face: 1,
          walk,
          riseT,
          crumbleT: -1,
          fleeT: 0,
          temp: false,
          phase,
          slowT: 0,
          slowK: 0,
          rootT: 0,
          markT: 0,
          markBy: '',
          markK: 0,
          angerT: 0,
        };
      }
      this.glide(e, x, y);
      Object.assign(e, {
        hp,
        hpMax,
        alive: !!(flags & 1),
        aggro: !!(flags & 2),
        tele: !!(flags & 4),
        temp: !!(flags & 8),
        dieT,
        riseT,
        face: face as 1 | -1,
        walk,
        castT,
        castTotal,
        stunT,
        phase,
        sunderT,
        // slowed, held by a trap, marked by me: shown, not simulated
        slowT: flags & 32 ? 1 : 0,
        rootT: flags & 64 ? 1 : 0,
        markT: flags & 128 ? 1 : 0,
        markBy: flags & 128 ? this.hero.id : '',
      });
      if (flags & 16) e.flash = Math.max(e.flash, 0.08);
      next.push(e);
    }
    R.enemies = next;
  }

  private syncHeroes(R: Region, list: HeroSnap[]): void {
    const g = this.game;
    const by = new Map(g.heroes.filter(o => o !== this.hero).map(o => [o.id, o as Hero & Glide]));
    const keep: Hero[] = [this.hero];
    for (const [
      id,
      name,
      look,
      x,
      y,
      face,
      walk,
      hp,
      hpMax,
      dead,
      flags,
      jumpT,
      atkAnimT,
      equip,
      level,
      cls,
    ] of list) {
      let o = by.get(id);
      if (!o) {
        o = new Hero(g, id, name) as Hero & Glide;
        o.regionId = R.id;
      }
      this.glide(o, x, y);
      const ids = equip.split(',');
      o.equip = {
        head: (ids[0] || null) as ItemId | null,
        body: (ids[1] || null) as ItemId | null,
        legs: (ids[2] || null) as ItemId | null,
        feet: (ids[3] || null) as ItemId | null,
        weapon: (ids[4] || null) as ItemId | null,
        offhand: (ids[5] || null) as ItemId | null,
        trinket: (ids[6] || null) as ItemId | null,
      };
      Object.assign(o, {
        name,
        look,
        face: face as 1 | -1,
        walk,
        hp,
        hpMax,
        dead,
        mounted: !!(flags & 1),
        jumpFlip: !!(flags & 2),
        jumpT,
        level,
        cls,
        hiddenT: flags & 8 ? 1 : 0,
      });
      if (atkAnimT > o.atkAnimT + 0.06) o.atkAnimT = atkAnimT;
      if (flags & 4) o.flash = Math.max(o.flash, 0.08);
      keep.push(o);
    }
    g.heroes = keep;
  }

  private syncDrops(R: Region, list: NonNullable<Tick['dr']>): void {
    const by = new Map(R.drops.map(d => [d.uid, d]));
    R.drops = list.map(([uid, id, n, x, y, z, age]) => {
      const d = by.get(uid) ?? {
        uid,
        owner: '',
        id: id as ItemId,
        n,
        x,
        y,
        z,
        vz: 0,
        vx: 0,
        vy: 0,
        age,
      };
      Object.assign(d, { n, x, y, z, age });
      return d;
    });
  }

  private syncTrees(R: Region, list: NonNullable<Tick['tr']>): void {
    const set = new Map(list.map(v => [v[0], v]));
    R.trees.forEach((t, i) => {
      const v = set.get(i);
      t.hp = v ? v[1] : CHOP.hits;
      t.stumpT = v ? v[2] : 0;
      t.shakeT = v ? v[3] : 0;
    });
  }

  private syncRocks(R: Region, list: NonNullable<Tick['rk']>): void {
    const set = new Map(list.map(v => [v[0], v]));
    R.rocks.forEach((k, i) => {
      const v = set.get(i);
      k.hp = v ? v[1] : MINE.hits;
      k.brokenT = v ? v[2] : 0;
      k.shakeT = v ? v[3] : 0;
      R.map.setRockBroken(k.c, k.r, k.brokenT > 0);
    });
  }

  private syncStructures(R: Region, list: [number, StructureKind, number, number, number][]): void {
    const by = new Map(R.structures.map(s => [s.id, s]));
    for (const s of R.structures) if (STRUCTURES[s.kind].solid) R.map.setBlocker(s.c, s.r, null);
    R.structures = list.map(([id, kind, c, r, t]) => {
      const s = by.get(id) ?? { id, kind, c, r, x: c * T + T / 2, y: r * T + T / 2, t };
      s.t = t < 0 ? Infinity : t;
      if (STRUCTURES[kind].solid) R.map.setBlocker(c, r, { x: s.x, y: s.y, r: 10 });
      return s;
    });
  }

  /** The people here (who is about can change with the story, and the server's region may be older). */
  private syncNpcs(R: Region, list: [string, number][]): void {
    const by = new Map(R.npcs.map(n => [n.id as string, n]));
    const ids = new Set(list.map(([id]) => id));
    for (const n of R.npcs)
      if (!ids.has(n.id)) R.map.setBlocker(Math.floor(n.x / T), Math.floor(n.y / T), null);
    R.npcs = list.flatMap(([id, face]) => {
      let n = by.get(id);
      if (!n) {
        const d = R.def.npcs.find(o => o.id === id);
        if (!d) return [];
        n = R.placeNpc(d.id, d.at);
      }
      n.face = face as 1 | -1;
      return [n];
    });
  }

  private syncObjects(R: Region, ids: string[]): void {
    const defs = R.def.objects ?? [];
    const flat = (k: string) => k === 'page' || k === 'letter' || k === 'thorn';
    for (const o of R.objects)
      if (!ids.includes(o.id) && !flat(o.kind)) R.map.setBlocker(o.c, o.r, null);
    R.objects = ids.flatMap(id => {
      const have = R.objects.find(o => o.id === id);
      if (have) return [have];
      const d = defs.find(o => o.id === id);
      if (!d) return [];
      const [c, r] = d.at;
      const x = c * T + T / 2;
      const y = r * T + T / 2;
      if (!flat(d.kind)) R.map.setBlocker(c, r, { x, y, r: 8 });
      return [{ id, kind: d.kind, name: d.name, c, r, x, y }];
    });
  }

  // ---------- the frame ----------
  override tick(dt: number): void {
    const h = this.hero;
    const R = this.R;
    // my hero walks here; the short timers count down (holding still to shoot among them:
    // the server's own countdown is for the server's copy, not this one)
    if (!h.dead) h.tickReplica(dt);
    h.aimT = Math.max(0, h.aimT - dt);
    h.atkAnimT = Math.max(0, h.atkAnimT - dt);
    h.flash = Math.max(0, h.flash - dt);
    h.shake = Math.max(0, h.shake - dt);
    h.swing = Math.max(0, h.swing - dt);
    // everyone else glides to where the server last saw them
    const k = Math.min(1, dt * 14);
    const glide = (o: { x: number; y: number } & Glide) => {
      if (o._tx === undefined || o._ty === undefined) return;
      o.x += (o._tx - o.x) * k;
      o.y += (o._ty - o.y) * k;
    };
    for (const e of R.enemies) {
      glide(e as Enemy & Glide);
      e.flash = Math.max(0, e.flash - dt);
    }
    for (const o of this.game.heroes) {
      if (o === h) continue;
      glide(o as Hero & Glide);
      o.atkAnimT = Math.max(0, o.atkAnimT - dt);
      o.flash = Math.max(0, o.flash - dt);
    }
    for (const w of R.wanderers) glide(w as (typeof R.wanderers)[number] & Glide);
    for (const e of R.enemies) if (e.dieT > 0 && !e.alive) e.dieT = Math.max(0, e.dieT - dt);
    this.game.day.advance(dt);
    this.updateFx(dt);
    // tell the server where my hero is (20 a second while it changes, and a heartbeat)
    this.moveT -= dt;
    this.heartbeat -= dt;
    if (this.moveT <= 0) {
      this.moveT = 1 / TICK_HZ;
      const m = {
        x: Math.round(h.x * 10) / 10,
        y: Math.round(h.y * 10) / 10,
        face: h.face,
        walk: Math.round(h.walk * 10) / 10,
        jumpT: Math.round(h.jumpT * 100) / 100,
        jumpFlip: h.jumpFlip,
      };
      const key = JSON.stringify(m);
      if (key !== this.sentMove || this.heartbeat <= 0) {
        this.sentMove = key;
        this.heartbeat = 1;
        this.conn.send({ t: 'move', ...m });
      }
    }
  }

  // ---------- what the player does: sent to the server ----------
  override enterRegion(id: string, spot: string): void {
    // through an exit the server already knows where to; otherwise it's the settings' region jump
    if (this.hero.exiting) this.cmd('travel');
    else this.cmd('enterRegion', [id, spot]);
  }
  override toSave(): SaveData {
    throw new Error('online games are kept on the server');
  }
  override loadSave(): boolean {
    return false;
  }
  override reset(): void {
    this.hero.log('Starting over is for single player.', 'h');
  }
  /** The line to the server dropped. */
  get lost(): boolean {
    return this.conn.closed;
  }
  override setDay(t: number): void {
    this.cmd('setDay', [t]);
  }
  override setDaySpeed(speed: number): void {
    // here too, so the clock runs at that speed between the server's corrections
    super.setDaySpeed(speed);
    this.cmd('daySpeed', [speed]);
  }
  override sceneNext(): void {
    this.cmd('sceneNext');
  }
  override touchWanderer(id: string): void {
    this.cmd('touchWanderer', [id]);
  }
  override spawnNear(kind: EnemyKind): void {
    this.cmd('spawnNear', [kind]);
  }
  override killAllEnemies(): void {
    this.cmd('killAllEnemies');
  }
  override respawnAllEnemies(): void {
    this.cmd('respawnAllEnemies');
  }
  override acceptQuest(id: string): void {
    this.cmd('acceptQuest', [id]);
  }
  override completeQuest(id: string): boolean {
    const ok = this.questStatus(id) === 'ready' && this.hero.nearNpc(this.turnInOf(id));
    if (ok) this.cmd('completeQuest', [id]);
    return ok;
  }
  override setTarget(e: Enemy | null): void {
    this.hero.target = e;
    this.cmd('setTarget', [e ? e.id : null]);
  }
  override cycleTarget(): void {
    this.cmd('cycleTarget');
  }
  override setRevEnabled(on: boolean): void {
    if (this.hero.revEnabled !== on) this.cmd('setRevEnabled', [on]);
  }
  override setRev(on: boolean): void {
    this.cmd('setRev', [on]);
  }
  override setRevAuto(on: boolean): void {
    this.cmd('setRevAuto', [on]);
  }
  override revStep(): void {
    this.cmd('revStep');
  }
  override castKey(k: Key): boolean {
    if (this.hero.inScene || !this.readyToShoot(k)) return false;
    this.cmd('castKey', [k]);
    return true;
  }

  /**
   * An archer's shot: like single player, the feet must be planted (a click-walk stops; keys
   * held down refuse), and the hero holds still for the draw. The server takes our word on it.
   */
  private readyToShoot(k: Key): boolean {
    const h = this.hero;
    if (h.cls !== 'archer' || !isShot(k)) return true;
    if (h.path) h.stopMoving();
    if (h.moving) {
      h.log('Stand still to shoot.', 'h');
      return false;
    }
    h.aimT = AIM_HOLD;
    return true;
  }
  override castSlot(i: number): void {
    this.cmd('castSlot', [i]);
  }
  override castBarSlot(i: number): void {
    const k = this.hero.bar[i];
    if (!this.hero.inScene && k && this.readyToShoot(k)) this.cmd('castBarSlot', [i]);
  }
  override setBarSlot(i: number, k: SpellKey | null): void {
    // drag and drop answers at once; the server agrees a moment later
    this.hero.setBarSlot(i, k);
    this.cmd('setBarSlot', [i, k]);
  }
  override setSeqPreset(name: string): void {
    this.cmd('setSeqPreset', [name]);
  }
  override tapButton(b: ButtonId): void {
    this.cmd('tapButton', [b]);
  }
  override pickFromWheel(b: ButtonId, k: WheelKey): void {
    this.cmd('pickFromWheel', [b, k]);
  }
  override mountToggle(): void {
    this.cmd('mountToggle');
  }
  override dodge(): void {
    this.cmd('dodge');
  }
  override talked(id: NpcId): boolean {
    const first = !this.hero.met.has(id);
    this.hero.met.add(id);
    this.cmd('talked', [id]);
    return first;
  }
  override useSlot(i: number): void {
    this.cmd('useSlot', [i]);
  }
  override equipFromBag(i: number): void {
    this.cmd('equipFromBag', [i]);
  }
  override unequip(slot: Slot): void {
    this.cmd('unequip', [slot]);
  }
  override buy(npc: NpcId, id: ItemId): boolean {
    this.cmd('buy', [npc, id]);
    return true;
  }
  override sell(npc: NpcId, slot: number, all = false): boolean {
    this.cmd('sell', [npc, slot, all]);
    return true;
  }
  override craft(id: string): boolean {
    this.cmd('craft', [id]);
    return true;
  }
  override learnTalent(id: string): boolean {
    const ok = !this.hero.talentProblem(id);
    if (ok) this.cmd('learnTalent', [id]);
    return ok;
  }
  override resetTalents(): void {
    this.cmd('resetTalents');
  }
  override gainXp(n: number): void {
    this.cmd('gainXp', [n]);
  }
  override healFull(): void {
    this.cmd('healFull');
  }
  override teleportToStart(): void {
    this.cmd('teleportToStart');
  }
  override dropRandomLoot(): void {
    this.cmd('dropRandomLoot');
  }

  protected override makeCheats(): CheatSwitches {
    const state: CheatSwitches = {
      god: false,
      infiniteMana: false,
      noCooldowns: false,
      moveSpeed: 1,
      freezeEnemies: false,
    };
    const send = () => this.cmd('cheats', [state]);
    const out = {} as CheatSwitches;
    for (const k of Object.keys(state) as (keyof CheatSwitches)[]) {
      Object.defineProperty(out, k, {
        enumerable: true,
        get: () => state[k],
        set: (v: never) => {
          if (state[k] === v) return;
          (state as unknown as Record<string, unknown>)[k] = v;
          // moving faster is walked here too
          if (k === 'moveSpeed') this.hero.cheats.moveSpeed = v as number;
          send();
        },
      });
    }
    return out;
  }
}
