import type { Hero } from '../sim/Hero';
import type { Region } from '../sim/Region';
import type {
  Tick,
  NetEvent,
  MeSnap,
  MeFull,
  EnemySnap,
  HeroSnap,
  DropSnap,
  CompanionSnap,
} from '../net/protocol';
import type { Companion } from '../sim/Companion';
import { MINE } from '../data/items';
import { treeHits } from '../data/trees';

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Everything a hero hears from the room it is in. */
const HERO_EVENTS = [
  'log',
  'banner',
  'castFlash',
  'nudge',
  'loadout',
  'died',
  'bag',
  'talk',
  'level',
  'talents',
  'respawned',
  'region',
  'exit',
  'trade',
  'sound',
] as const;
const REGION_EVENTS = [
  'floater',
  'fx',
  'burst',
  'scene',
  'sceneFade',
  'bossPhase',
  'shake',
  'sound',
  'say',
] as const;
const ROOM_EVENTS = ['quests', 'flags', 'journal'] as const;

/**
 * One player in a room, on the server: their hero, the events they should hear, and what
 * their browser has already been told (so each snapshot only carries what changed).
 */
export class Session {
  private events: NetEvent[] = [];
  private offs: (() => void)[] = [];
  private offRegion: (() => void)[] = [];
  private regionId = '';
  /** What was last sent of each part, as JSON. */
  private sent: Record<string, string> = {};
  private dayT = 0;
  /** When the last move arrived (seconds of server time), to check its speed. */
  lastMoveAt = 0;

  constructor(readonly hero: Hero) {
    for (const k of HERO_EVENTS)
      this.offs.push(hero.events.on(k, p => this.events.push(['h', k, p])));
    for (const k of ROOM_EVENTS)
      this.offs.push(hero.game.events.on(k, p => this.events.push(['g', k, p])));
    // hear the new region before the hero arrives in it (arriving can start a scene)
    this.offs.push(hero.events.on('region', () => this.listenToRegion()));
    this.listenToRegion();
  }

  private listenToRegion(): void {
    if (this.regionId === this.hero.regionId) return;
    for (const off of this.offRegion) off();
    this.offRegion = [];
    this.regionId = this.hero.regionId;
    // a new region: everything about the old one is stale
    this.sent = {};
    if (!this.regionId) return;
    const r = this.hero.region;
    for (const k of REGION_EVENTS)
      this.offRegion.push(r.events.on(k, p => this.events.push(['r', k, p])));
  }

  dispose(): void {
    for (const off of [...this.offs, ...this.offRegion]) off();
    this.offs = [];
    this.offRegion = [];
  }

  /** The snapshot for this tick (and the events since the last one). */
  build(dt: number): Tick {
    this.listenToRegion();
    const h = this.hero;
    const R = h.region;
    const tick: Tick = {
      rg: h.regionId,
      me: this.me(h),
      en: R.enemies.map(e => enemySnap(e, h.id)),
      hs: R.heroes()
        .filter(o => o !== h)
        .map(heroSnap),
    };
    const part = (key: keyof Tick, value: unknown) => {
      const json = JSON.stringify(value);
      if (this.sent[key] === json) return;
      this.sent[key] = json;
      (tick as unknown as Record<string, unknown>)[key] = value;
    };
    const cps = h.game.companionsIn(R.id);
    if (cps.length) tick.cp = cps.map(companionSnap);
    part('mf', this.meFull(h));
    if (R.wanderers.length)
      tick.wd = R.wanderers.map(w => [w.id, r1(w.x), r1(w.y), r2(w.alpha), w.face]);
    part('dr', R.drops.filter(d => !d.owner || d.owner === h.id).map(dropSnap));
    part('tr', changedTrees(R));
    part('rk', changedRocks(R));
    part(
      'st',
      R.structures.map(s => [s.id, s.kind, s.c, s.r, s.t === Infinity ? -1 : r1(s.t), s.out ? 1 : 0, r2(s.smother ?? 0)])
    );
    part(
      'ob',
      R.objects.map(o => o.id)
    );
    part(
      'np',
      R.npcs.map(n => [n.id, n.face])
    );
    part(
      'pr',
      R.props.map(p => [p.kind, p.c, p.r])
    );
    part(
      'hz',
      R.hazards.map(z => [r1(z.x), r1(z.y), r1(z.r), z.speed, z.max])
    );
    part(
      'tz',
      R.traps.map(t => [Math.round(t.x), Math.round(t.y)])
    );
    part(
      'sn',
      R.snares.map(s => [Math.round(s.x), Math.round(s.y)])
    );
    part('sc', R.scene);
    part('sy', { flags: h.game.flags, quests: h.game.quests, journal: h.game.journal });
    part('du', h.game.duels.view(h));
    part('dl', h.game.duels.flags(R.id));
    this.dayT -= dt;
    if (this.dayT <= 0 || this.sent.dy === undefined) {
      this.dayT = 1;
      this.sent.dy = '1';
      tick.dy = [Math.round(h.game.day.t * 1e5) / 1e5, h.game.day.day];
      tick.wx = h.game.weather.snapshot();
    }
    if (this.events.length) {
      tick.ev = this.events;
      this.events = [];
    }
    return tick;
  }

  private me(h: Hero): MeSnap {
    return {
      x: r1(h.x),
      y: r1(h.y),
      tp: h.tp,
      aimT: r2(h.aimT),
      predatorT: r1(h.predatorT),
      hiddenT: r1(h.hiddenT),
      heldT: r2(h.heldT),
      heldBy: h.heldBy,
      slowT: r1(h.slowT),
      slowK: h.slowK,
      stunT: r1(h.stunT),
      itemCd: Object.fromEntries(Object.entries(h.itemCd).map(([k, v]) => [k, r1(v ?? 0)])),
      hp: Math.round(h.hp),
      hpMax: h.hpMax,
      mp: r1(h.mp),
      mpMax: h.mpMax,
      t: r2(h.t),
      dead: r2(h.dead),
      flash: r2(h.flash),
      shake: r2(h.shake),
      buffT: r1(h.buffT),
      invT: r2(h.invT),
      bleedT: r1(h.bleedT),
      berserkT: r1(h.berserkT),
      lastStandT: r1(h.lastStandT),
      mortalCd: r1(h.mortalCd),
      intCd: r1(h.intCd),
      dodgeCd: r1(h.dodgeCd),
      atkAnimT: r2(h.atkAnimT),
      swing: r2(h.swing),
      mounted: h.mounted,
      mountT: r2(h.mountT),
      work: h.work && { ...h.work, p: r2(h.work.p) },
      target: h.target?.id ?? 0,
      cds: Object.fromEntries(
        Object.entries(h.cds)
          .filter(([, v]) => (v ?? 0) > 0)
          .map(([k, v]) => [k, r1(v ?? 0)])
      ),
      acd: Object.fromEntries(
        Object.entries(h.acd)
          .filter(([, v]) => (v ?? 0) > 0)
          .map(([k, v]) => [k, r1(v ?? 0)])
      ),
      exiting: h.exiting,
      rev: h.rev,
      revAuto: h.revAuto,
      revEnabled: h.revEnabled,
      seqI: h.seqI,
    };
  }

  private meFull(h: Hero): MeFull {
    return {
      cls: h.cls,
      level: h.level,
      xp: h.xp,
      gold: h.gold,
      kills: h.kills,
      perf: h.perf,
      look: h.look,
      name: h.name,
      talents: h.talents,
      bag: h.bag,
      equip: h.equip,
      bar: h.bar,
      met: [...h.met],
      quests: Object.fromEntries(h.questLog),
      duels: [h.duelsWon, h.duelsLost],
    };
  }
}

/**
 * A creature as one hero sees it (whether it bears their Mark is theirs to know). Its flags:
 * 1 alive, 2 fighting, 4 about to strike, 8 summoned, 16 just hit, 32 slowed, 64 held by a
 * trap, 128 marked by me, 256 shield up, 512 hidden in the canopy, 1024 hatching, 2048 lying
 * on a fire.
 */
function enemySnap(e: import('../sim/types').Enemy, me: string): EnemySnap {
  const flags =
    (e.alive ? 1 : 0) |
    (e.aggro ? 2 : 0) |
    (e.tele ? 4 : 0) |
    (e.temp ? 8 : 0) |
    (e.flash > 0 ? 16 : 0) |
    (e.slowT > 0 ? 32 : 0) |
    (e.rootT > 0 ? 64 : 0) |
    (e.markT > 0 && e.markBy === me ? 128 : 0) |
    ((e.shieldT ?? 0) > 0 && e.stunT <= 0 ? 256 : 0) |
    (e.hid ? 512 : 0) |
    (e.hatchT !== undefined ? 1024 : 0) |
    (e.lying ? 2048 : 0);
  return [
    e.id,
    e.kind,
    r1(e.x),
    r1(e.y),
    Math.round(e.hp),
    e.hpMax,
    flags,
    r2(e.dieT),
    r2(e.riseT),
    e.face,
    r1(e.walk),
    r2(e.castT),
    e.castTotal,
    r2(e.stunT),
    e.phase,
    r1(e.sunderT),
    r1(e.z ?? 0),
  ];
}

function companionSnap(c: Companion): CompanionSnap {
  return [
    c.cid,
    r1(c.x),
    r1(c.y),
    c.face,
    r1(c.walk),
    Math.round(c.hp),
    c.hpMax,
    r2(c.dead),
    r2(c.atkAnimT),
    (c.flash > 0 ? 1 : 0) | (c.slowT > 0 ? 2 : 0),
    c.heldBy,
    c.target?.id ?? 0,
  ];
}

/** Another hero as the ones beside them see it. Its flags: 1 mounted, 2 flipping, 4 just hit, 8 camouflaged, 16 stunned. */
function heroSnap(h: Hero): HeroSnap {
  // camouflaged archers show faintly to their friends
  const flags =
    (h.mounted ? 1 : 0) |
    (h.jumpFlip ? 2 : 0) |
    (h.flash > 0 ? 4 : 0) |
    (h.hiddenT > 0 ? 8 : 0) |
    (h.stunT > 0 ? 16 : 0);
  const equip = Object.values(h.equip)
    .map(v => v ?? '')
    .join(',');
  return [
    h.id,
    h.name,
    h.look,
    r1(h.x),
    r1(h.y),
    h.face,
    r1(h.walk),
    Math.round(h.hp),
    h.hpMax,
    r2(h.dead),
    flags,
    r2(h.jumpT),
    r2(h.atkAnimT),
    equip,
    h.level,
    h.cls,
    h.heldBy,
    h.duelsWon,
    h.duelsLost,
  ];
}

function dropSnap(d: import('../sim/types').Drop): DropSnap {
  return [d.uid, d.id, d.n, r1(d.x), r1(d.y), r1(d.z), r1(d.age)];
}

function changedTrees(R: Region): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  R.trees.forEach((t, i) => {
    if (t.stumpT > 0 || t.shakeT > 0 || t.hp < treeHits(t))
      out.push([i, t.hp, Math.ceil(t.stumpT), r2(t.shakeT)]);
  });
  return out;
}

function changedRocks(R: Region): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  R.rocks.forEach((k, i) => {
    if (k.brokenT > 0 || k.shakeT > 0 || k.hp < MINE.hits)
      out.push([i, k.hp, Math.ceil(k.brokenT), r2(k.shakeT)]);
  });
  return out;
}
