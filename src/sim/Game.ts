import { REGIONS, START_REGION } from '../data/regions';
import { check } from './story';
import type { StoryState } from './story';
import type { Cond, Effect } from '../data/story';
import { DOCS } from '../data/docs';
import { NPCS } from '../data/npcs';
import type { NpcId } from '../data/npcs';
import { QUESTS, QUEST_IDS } from '../data/quests';
import { ITEMS, lootFor } from '../data/items';
import type { ItemId } from '../data/items';
import { SAVE_VERSION, readableSave } from './save';
import { isClass } from '../data/classes';
import { DIFFICULTIES, isDifficulty } from '../data/difficulty';
import type { Difficulty } from '../data/difficulty';
import { SPELLS } from '../data/spells';
import type { SaveData } from './save';
import { T } from './map';
import { Rng } from './rng';
import { Emitter } from './Emitter';
import { DayCycle } from './daylight';
import { Weather } from './weather';
import type { WeatherKind } from './weather';
import { Hero } from './Hero';
import { Companion } from './Companion';
import { COMPANION_IDS } from '../data/companions';
import { Region } from './Region';
import type { RegionMemory } from './Region';
import type { RoomEvents, QuestProgress, QuestStatus, Structure } from './types';

/** A goal's count to reach (a place counts once). */
export function goalTarget(g: { kind: string; n?: number }): number {
  return g.kind === 'kill' ||
    g.kind === 'craft' ||
    g.kind === 'build' ||
    g.kind === 'collect' ||
    g.kind === 'interact'
    ? (g.n ?? 1)
    : 1;
}

/**
 * One game: a room of heroes sharing one campaign. It holds the story they share (flags,
 * quests, the journal, the time of day), the regions somebody is standing in, and the heroes.
 * The same class runs inside the browser for single player and on the server for a room.
 */
export class Game {
  readonly events = new Emitter<RoomEvents>();
  readonly rng = new Rng(99);
  readonly day = new DayCycle();
  /** Rain and storms (the same for everyone in the room). */
  readonly weather = new Weather();
  heroes: Hero[] = [];
  /** Who walks with the heroes for a while (Wren in the wood): where they are follows the story. */
  companions: Companion[] = COMPANION_IDS.map(id => new Companion(this, id));
  /** The regions somebody is in, by id (built on arrival, put away when the last hero leaves). */
  readonly regions = new Map<string, Region>();
  /** What each region keeps while empty: what was built and dropped there. */
  readonly regionMemory = new Map<string, RegionMemory>();
  /** Story flags: what has happened (see data/story.ts and sim/story.ts). */
  flags: Record<string, number> = {};
  /** Quests taken (by id): goal progress, and whether they were handed in. */
  quests: Record<string, QuestProgress> = {};
  /** Documents found (diary pages, letters, notes; data/docs.ts), in the order found. */
  journal: string[] = [];
  nextStructure = 1;
  /** 1 = normal; single player lowers it while a wheel is open. */
  timeScale = 1;
  /** Dev switches for the whole game. */
  readonly cheats = { freezeEnemies: false };
  /** How hard the creatures are (data/difficulty.ts): chosen when the campaign starts, kept in its save. */
  difficulty: Difficulty = 'normal';
  private readonly lastStatus = new Map<string, QuestStatus>();

  /** The live region with this id (built if nobody was in it). */
  region(id: string): Region {
    let r = this.regions.get(id);
    if (!r) {
      r = new Region(this, id, this.regionMemory.get(id));
      this.regions.set(id, r);
    }
    return r;
  }

  /** A hero joins the game, standing at a region's spot. */
  addHero(id: string, name: string, regionId = START_REGION, spot = 'start'): Hero {
    const h = new Hero(this, id, name);
    this.heroes.push(h);
    this.shareQuests(h);
    this.moveHero(h, regionId, spot);
    return h;
  }

  removeHero(h: Hero): void {
    const from = h.regionId;
    this.heroes = this.heroes.filter(x => x !== h);
    h.regionId = '';
    if (from) this.closeIfEmpty(from);
  }

  /** Take a hero to region `id`, arriving at its spot `spot`. */
  moveHero(h: Hero, id: string, spot: string): void {
    const def = REGIONS[id];
    if (!def) throw new Error(`no region '${id}'`);
    const from = h.regionId;
    h.regionId = id;
    if (from && from !== id) this.closeIfEmpty(from);
    const r = this.region(id);
    h.placeAt(def.spots[spot] ?? def.spots.start);
    h.arrived();
    h.events.emit('region', { id });
    r.arrive(h);
  }

  /** Put a region away once nobody is in it: what was built and dropped stays; trees, rocks and creatures reset. */
  private closeIfEmpty(id: string): void {
    const r = this.regions.get(id);
    if (!r || this.heroes.some(h => h.regionId === id)) return;
    this.regionMemory.set(id, r.memory());
    r.events.clear();
    this.regions.delete(id);
  }

  /** The companions standing in a region. */
  companionsIn(id: string): Companion[] {
    return id ? this.companions.filter(c => c.regionId === id) : [];
  }

  /**
   * Where each companion is: with the heroes while the story has them along and a hero is in
   * one of the places they go (in that hero's region, at their side). Once the heroes leave
   * those places she goes home and waits there until one of them comes back for her
   * (Companion.waiting). Before and after her part of the story, nowhere at all.
   */
  private placeCompanions(): void {
    const level = Math.max(1, ...this.heroes.map(h => h.level));
    for (const c of this.companions) {
      const def = c.def;
      if (!this.check(def.when)) {
        c.regionId = '';
        c.waiting = false;
        continue;
      }
      c.scale(level);
      if (!c.waiting) {
        // still with somebody where she stands
        if (c.regionId && def.regions.includes(c.regionId) && this.heroes.some(h => h.regionId === c.regionId)) continue;
        // a hero has gone on into another of her places (or she has just come along): she goes with them
        const h = this.heroes.find(x => x.regionId && def.regions.includes(x.regionId));
        if (h) {
          c.regionId = h.regionId;
          c.joinAt(h);
          c.bark('join');
          continue;
        }
      }
      // nobody in the places she goes: home, to wait
      const home = REGIONS[def.home.region];
      if (!home) {
        c.regionId = '';
        continue;
      }
      if (c.waiting && c.regionId === def.home.region) continue;
      c.waiting = true;
      c.regionId = def.home.region;
      const [col, row] = home.spots[def.home.spot] ?? home.spots.start;
      c.placeAt(col * T + T / 2, row * T + T / 2);
      c.hp = c.hpMax;
      c.dead = 0;
    }
  }

  // ---------- the story ----------
  /** What a condition reads: the story, and a hero (their level, quests and bag) and place (the night). */
  private story(hero?: Hero, region?: Region): StoryState {
    const h = hero ?? this.heroes[0];
    const r = region ?? (h && h.regionId ? this.regions.get(h.regionId) : undefined);
    return {
      flags: this.flags,
      level: h?.level ?? 1,
      isNight: r?.isNight ?? false,
      questStatus: id => this.questStatus(id, h),
    };
  }

  /** Whether a story condition holds (for a hero, in a region). */
  check(c?: Cond, hero?: Hero, region?: Region): boolean {
    return check(this.story(hero, region), c);
  }

  setFlag(name: string, v = 1): void {
    if ((this.flags[name] ?? 0) === v) return;
    this.flags[name] = v;
    this.events.emit('flags', { name });
  }

  /** A page in the journal was opened: quests can ask for `read:<id>`. */
  readDoc(id: string): void {
    if (this.journal.includes(id)) this.setFlag('read:' + id);
  }

  /** Make things happen: flags, documents, items (to the hero it happened to), a scene (where they stand). */
  applyEffect(e: Effect | undefined, hero?: Hero): void {
    if (!e) return;
    for (const f of e.flags ?? []) this.setFlag(f);
    for (const f of e.clear ?? []) this.setFlag(f, 0);
    for (const d of e.docs ?? []) this.findDoc(d);
    if (hero) for (const id of e.items ?? []) hero.give(id);
    if (e.scene && hero?.regionId) hero.region.playScene(e.scene);
  }

  /** Put a document in the journal (once). */
  findDoc(id: string): void {
    const d = DOCS[id];
    if (!d || this.journal.includes(id)) return;
    this.journal.push(id);
    for (const h of this.heroes) {
      h.log(`Added to your journal: ${d.title}. (J)`, 't');
      h.hear('journal');
    }
    this.events.emit('journal', { doc: id });
  }

  /** What a trader sells today: their stock, and whatever the story has added to it. */
  shopStock(npc: NpcId, hero?: Hero): ItemId[] {
    const shop = NPCS[npc].shop;
    if (!shop) return [];
    return [...shop.sells, ...(shop.more ?? []).filter(m => this.check(m.when, hero)).flatMap(m => m.sells)];
  }

  /**
   * Make the game harder or easier. The creatures already out take their new health at once,
   * as hurt as they were; everyone in the game is told.
   */
  setDifficulty(d: Difficulty): void {
    if (d === this.difficulty) return;
    this.difficulty = d;
    for (const r of this.regions.values()) r.rescaleEnemies();
    for (const h of this.heroes) h.log(`Difficulty: ${DIFFICULTIES[d].name}. ${DIFFICULTIES[d].blurb}`, 't');
    this.events.emit('difficulty', { d });
  }

  // ---------- quests ----------
  /** How far along goal `i` of a quest is (a hero's bag and the flags count live). */
  goalCount(id: string, i: number, hero?: Hero): number {
    const g = QUESTS[id].goals[i];
    const q = this.quests[id];
    if (!q) return 0;
    if (hero?.questLog.get(id) === 'done' || (q.state === 'done' && !hero)) return goalTarget(g);
    // what to bring is in each hero's own bag, even once someone else has handed theirs in
    if (g.kind === 'collect') return Math.min((hero ?? this.heroes[0])?.count(g.item) ?? 0, g.n);
    if (q.state === 'done') return goalTarget(g);
    if (g.kind === 'flag') return (this.flags[g.flag] ?? 0) > 0 ? 1 : 0;
    return q.count[i] ?? 0;
  }

  /**
   * Where a quest stands. For a hero, their own quest: done once they have handed it in
   * (here or in any earlier game), ready while the room's progress is complete and they
   * haven't, even if someone else already has. Without a hero, the story's view (the room's).
   */
  questStatus(id: string, hero?: Hero): QuestStatus {
    const q = this.quests[id];
    const def = QUESTS[id];
    const mine = hero?.questLog.get(id);
    if (mine === 'done') return 'done';
    // finished before this hero took it up: the story has moved on without them
    if (q?.state === 'done' && !mine) return 'done';
    if (q && (mine === 'active' || !hero))
      return def.goals.every((g, i) => this.goalCount(id, i, hero) >= goalTarget(g))
        ? 'ready'
        : 'active';
    // the party is on it, and this hero can join in
    if (q) return 'available';
    if (def.requires && this.questStatus(def.requires, hero) !== 'done') return 'locked';
    return this.check(def.when, hero) ? 'available' : 'locked';
  }

  /** A hero arriving in the room takes up the quests the party is on (not ones they have handed in). */
  shareQuests(h: Hero): void {
    for (const [id, q] of Object.entries(this.quests))
      if (q.state === 'active' && !h.questLog.has(id)) h.questLog.set(id, 'active');
  }

  /** Who a quest is handed in to. */
  turnInOf(id: string): NpcId {
    return QUESTS[id].turnIn ?? QUESTS[id].giver;
  }

  /** Quests an NPC has something to do with: ones they give, and ones handed in to them. */
  questsOf(npc: NpcId, hero?: Hero): { id: string; status: QuestStatus }[] {
    return QUEST_IDS.filter(id => QUESTS[id].giver === npc || this.turnInOf(id) === npc)
      .map(id => ({ id, status: this.questStatus(id, hero) }))
      .filter(q =>
        q.status === 'ready' ? this.turnInOf(q.id) === npc : QUESTS[q.id].giver === npc
      );
  }

  /** What floats over an NPC: ? (something to hand in), ! (a new quest), … (you are on it). */
  npcMark(npc: NpcId, hero?: Hero): '?' | '!' | '…' | null {
    const qs = this.questsOf(npc, hero);
    if (qs.some(q => q.status === 'ready')) return '?';
    if (qs.some(q => q.status === 'available')) return '!';
    if (qs.some(q => q.status === 'active')) return '…';
    return null;
  }

  /** Take a quest: the whole party takes it with you (progress is shared; each hands it in for themselves). */
  acceptQuest(id: string, hero: Hero): void {
    if (this.questStatus(id, hero) !== 'available') return;
    const fresh = !this.quests[id];
    if (fresh) this.quests[id] = { state: 'active', count: QUESTS[id].goals.map(() => 0) };
    for (const h of fresh ? this.heroes : [hero]) {
      if (h.questLog.has(id)) continue;
      h.questLog.set(id, 'active');
      h.log(`New quest: ${QUESTS[id].name}.`, 'c');
      h.hear('questAccept');
    }
    this.events.emit('quests', {});
    if (fresh) this.applyEffect(QUESTS[id].onAccept, hero);
  }

  /** Hand a finished quest in (the hero must be next to whoever takes it). */
  completeQuest(id: string, hero: Hero): boolean {
    const def = QUESTS[id];
    if (this.questStatus(id, hero) !== 'ready' || !hero.nearNpc(this.turnInOf(id))) return false;
    for (const g of def.goals) if (g.kind === 'collect' && g.take) hero.removeItem(g.item, g.n);
    // the first to hand it in moves the story on; everyone else just gets their reward
    const first = this.quests[id].state !== 'done';
    this.quests[id].state = 'done';
    hero.questLog.set(id, 'done');
    hero.gold += def.reward.gold;
    hero.gainXp(def.reward.xp);
    // a reward is something the hero's class can use (a Warden's blade is a longbow for an archer)
    for (const item of def.reward.items) hero.give(lootFor(item as ItemId, hero.cls));
    for (const d of def.reward.docs ?? []) this.findDoc(d);
    const got = [
      def.reward.gold ? `${def.reward.gold} gold` : '',
      def.reward.xp ? `${def.reward.xp} XP` : '',
      ...def.reward.items.map(i => ITEMS[lootFor(i, hero.cls)].name.toLowerCase()),
    ]
      .filter(Boolean)
      .join(', ');
    hero.banner('QUEST COMPLETE');
    hero.hear('questComplete');
    hero.log(`Quest complete: ${def.name}.${got ? ` You receive ${got}.` : ''}`, 'c');
    hero.region.burst(hero.x, hero.y - 18, 16, '#f2c14e', 80, 0.8, 3, -60);
    this.events.emit('quests', {});
    if (first) this.applyEffect(def.onDone, hero);
    else for (const item of def.onDone?.items ?? []) hero.give(item);
    return true;
  }

  /** Progress active quests: a kill, a craft, a build, a talk, something used. */
  questEvent(kind: 'kill' | 'craft' | 'build' | 'talk' | 'interact', key: string, sub = ''): void {
    let changed = false;
    for (const id of Object.keys(this.quests)) {
      const q = this.quests[id];
      if (q.state !== 'active') continue;
      const before = this.questStatus(id);
      QUESTS[id].goals.forEach((g, i) => {
        const hit =
          (g.kind === 'kill' && kind === 'kill' && g.enemy === key) ||
          (g.kind === 'craft' && kind === 'craft' && g.recipe === key) ||
          (g.kind === 'build' && kind === 'build' && g.build === key) ||
          (g.kind === 'talk' && kind === 'talk' && g.npc === key) ||
          (g.kind === 'interact' &&
            kind === 'interact' &&
            ('object' in g ? g.object === key : g.objectKind === sub));
        if (hit && q.count[i] < goalTarget(g)) {
          q.count[i]++;
          changed = true;
        }
      });
      if (before === 'active' && this.questStatus(id) === 'ready') {
        for (const h of this.heroes) {
          h.log(`${QUESTS[id].name}: done! Return to ${NPCS[this.turnInOf(id)].name}.`, 'c');
          h.hear('questReady');
        }
        this.lastStatus.set(id, 'ready');
      }
    }
    if (changed) this.events.emit('quests', {});
  }

  /**
   * Collect and flag goals change with the bag and the story, not with quest events:
   * notice when one of those makes a quest ready (or not), and tell everyone.
   */
  private watchQuests(): void {
    let changed = false;
    for (const id of Object.keys(this.quests)) {
      if (this.quests[id].state !== 'active') continue;
      const st = this.questStatus(id);
      const before = this.lastStatus.get(id);
      if (before && before !== st) {
        changed = true;
        if (st === 'ready')
          for (const h of this.heroes) {
            h.log(`${QUESTS[id].name}: done! Return to ${NPCS[this.turnInOf(id)].name}.`, 'c');
            h.hear('questReady');
          }
      }
      this.lastStatus.set(id, st);
    }
    if (changed) this.events.emit('quests', {});
  }

  /** Reach goals: a hero close enough to the place counts. */
  questPlaces(h: Hero): void {
    for (const id of Object.keys(this.quests)) {
      const q = this.quests[id];
      if (q.state !== 'active') continue;
      QUESTS[id].goals.forEach((g, i) => {
        if (g.kind !== 'reach' || q.count[i] >= 1) return;
        if (g.region && g.region !== h.regionId) return;
        const gx = g.at ? g.at[0] * T + T / 2 : (g.x ?? 0);
        const gy = g.at ? g.at[1] * T + T / 2 : (g.y ?? 0);
        if (Math.hypot(gx - h.x, gy - h.y) > g.r) return;
        q.count[i] = 1;
        for (const x of this.heroes) x.log(`${QUESTS[id].name}: you have found it.`, 'c');
        this.events.emit('quests', {});
      });
    }
  }

  // ---------- the game's tick ----------
  /** Advance everything by `rawDt` seconds (already clamped by the caller). */
  tick(rawDt: number): void {
    const dt = rawDt * this.timeScale;
    this.day.advance(dt);
    const was = this.weather.kind;
    this.weather.advance(dt);
    if (this.weather.kind !== was) this.weatherChanged(was, this.weather.kind);
    this.placeCompanions();
    for (const r of [...this.regions.values()]) if (this.regions.has(r.id)) r.tick(dt);
    this.watchQuests();
  }

  /** Tell everyone the weather has turned. */
  private weatherChanged(was: WeatherKind, now: WeatherKind): void {
    const text =
      now === 'storm' ? 'Thunder rolls in: a storm.' : now === 'rain' ? (was === 'storm' ? 'The storm passes; the rain keeps on.' : 'It starts to rain.') : 'The rain stops.';
    for (const h of this.heroes) h.log(text, 't');
  }

  // ---------- saving (single player: one hero and the campaign) ----------
  /** Everything worth keeping, as plain data (see sim/save.ts). */
  toSave(h: Hero): SaveData {
    const built: Record<string, Structure[]> = {};
    for (const [id, m] of this.regionMemory) if (m.structures.length) built[id] = m.structures;
    for (const [id, r] of this.regions) {
      // a region's own fires aren't built by anyone: they aren't kept
      const mine = r.structures.filter(st => !st.fixed);
      if (mine.length) built[id] = mine;
    }
    return {
      v: SAVE_VERSION,
      at: Date.now(),
      cls: h.cls,
      region: h.regionId,
      x: h.x,
      y: h.y,
      hp: h.hp,
      mp: h.mp,
      level: h.level,
      xp: h.xp,
      gold: h.gold,
      kills: h.kills,
      talents: { ...h.talents },
      bag: h.bag.map(st => (st ? { ...st } : null)),
      equip: { ...h.equip },
      bar: h.bar.slice(),
      quests: this.heroQuests(h),
      flags: { ...this.flags },
      met: [...h.met],
      journal: this.journal.slice(),
      day: { t: this.day.t, day: this.day.day },
      built: JSON.parse(JSON.stringify(built)) as SaveData['built'],
      difficulty: this.difficulty,
    };
  }

  /**
   * The quests as this hero knows them, for their save: their own state (on it, or handed
   * in) with the room's progress; ones the room finished before they took them up are done.
   */
  private heroQuests(h: Hero): SaveData['quests'] {
    const out: SaveData['quests'] = {};
    for (const [id, q] of Object.entries(this.quests)) {
      const mine = h.questLog.get(id);
      if (mine) out[id] = { state: mine, count: q.count.slice() };
      else if (q.state === 'done') out[id] = { state: 'done', count: q.count.slice() };
    }
    for (const [id, st] of h.questLog)
      if (!out[id]) out[id] = { state: st, count: QUESTS[id].goals.map(() => 0) };
    return out;
  }

  /** Start the game over from a save, for this hero (the whole campaign and the hero). Returns false if it can't be read. */
  loadSave(d: SaveData, h: Hero): boolean {
    if (!readableSave(d) || !REGIONS[d.region]) return false;
    // close every region (a new game's opening scene may have started in one)
    for (const r of this.regions.values()) r.clearScene();
    this.regions.clear();
    this.regionMemory.clear();
    this.lastStatus.clear();
    for (const c of this.companions) Object.assign(c, { regionId: '', waiting: false });
    h.resetHero();
    h.regionId = '';
    this.setHero(d, h);
    this.quests = Object.fromEntries(Object.entries(d.quests).filter(([id]) => QUESTS[id]));
    for (const [id, q] of Object.entries(this.quests)) h.questLog.set(id, q.state);
    this.flags = { ...d.flags };
    this.journal = d.journal.slice();
    this.day.t = d.day.t;
    this.day.day = d.day.day;
    // before anyone arrives: the creatures are made for it
    this.difficulty = isDifficulty(d.difficulty) ? d.difficulty : 'normal';
    let next = 1;
    for (const [id, list] of Object.entries(d.built)) {
      this.regionMemory.set(id, { structures: list, drops: [] });
      for (const st of list) next = Math.max(next, st.id + 1);
    }
    this.nextStructure = next;
    this.moveHero(h, d.region, 'start');
    // the map may have changed since the save: only stand where you can
    if (!h.map.blocked(d.x, d.y, 9, 8)) {
      h.x = d.x;
      h.y = d.y;
    }
    h.hp = Math.min(h.hpMax, Math.max(1, d.hp));
    h.mp = d.mp;
    this.events.emit('quests', {});
    this.heroLoaded(h);
    h.logHistory.length = 0;
    h.log('Welcome back.', 't');
    return true;
  }

  /**
   * Give a hero what a save says they are (level, talents, gear, bag, gold, who they've met),
   * but not the story or where they stood: a hero joining someone else's game. False if the
   * save can't be read.
   */
  loadHero(d: SaveData, h: Hero): boolean {
    if (!readableSave(d)) return false;
    this.setHero(d, h);
    h.questLog.clear();
    for (const [id, q] of Object.entries(d.quests)) {
      if (!QUESTS[id]) continue;
      h.questLog.set(id, q.state);
      // a quest they're on that the party isn't: the party takes it up, with their progress
      if (q.state === 'active' && !this.quests[id])
        this.quests[id] = { state: 'active', count: q.count.slice() };
    }
    this.shareQuests(h);
    this.events.emit('quests', {});
    h.hp = h.hpMax;
    h.mp = h.mpMax;
    this.heroLoaded(h);
    return true;
  }

  private setHero(d: SaveData, h: Hero): void {
    h.cls = isClass(d.cls) ? d.cls : 'warrior';
    h.applyClass();
    h.level = d.level;
    h.xp = d.xp;
    h.gold = d.gold;
    h.kills = d.kills;
    h.talents = { ...d.talents };
    h.applyTalents();
    // items, gear and quests the game no longer has (from an older version) are dropped
    h.bag = d.bag.map(st => (st && ITEMS[st.id] ? { ...st } : null));
    h.equip = Object.fromEntries(
      Object.entries(d.equip).filter(([, id]) => !id || ITEMS[id as ItemId])
    ) as typeof h.equip;
    h.applyGear();
    // spells the hero no longer knows (another version's) leave the bar
    h.bar = d.bar.map(k =>
      k && Object.prototype.hasOwnProperty.call(SPELLS, k) && h.knows(k) ? k : null
    );
    h.met.clear();
    for (const id of d.met) if (NPCS[id]) h.met.add(id);
  }

  private heroLoaded(h: Hero): void {
    h.events.emit('loadout', {});
    h.events.emit('bag', {});
    h.events.emit('talents', {});
  }

  /** Start over: a fresh campaign (as hard as this one was), the hero new on the lakeshore. */
  reset(h: Hero): void {
    for (const r of this.regions.values()) r.clearScene();
    this.regions.clear();
    this.regionMemory.clear();
    this.lastStatus.clear();
    for (const c of this.companions) Object.assign(c, { regionId: '', waiting: false });
    this.flags = {};
    this.quests = {};
    this.journal = [];
    this.nextStructure = 1;
    h.resetHero();
    h.regionId = '';
    this.moveHero(h, START_REGION, 'start');
    // a fresh start (a new character is reset twice: as the Sim is made, and as their class)
    h.logHistory.length = 0;
    h.log('An old man by the road waves you over. Click him to talk.', 'c');
    h.log('Select an enemy to lock it.', '');
  }
}
