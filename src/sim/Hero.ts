import { SKILLS, ACTIONS, isSkill, isShot } from '../data/skills';
import { CLASSES, AIM_HOLD, ARROW_SPEED } from '../data/classes';
import type { ClassId } from '../data/classes';
import type { Key, SkillKey, ActionKey, WheelKey } from '../data/skills';
import { T, isoDir, isoSpeedFactor, Tile, faceToward } from './map';
import type { RegionMap } from './map';
import { RECIPES, STRUCTURES, STATION_REACH, STATION_NAMES } from '../data/crafting';
import type { Recipe, StructureKind } from '../data/crafting';
import { NPCS } from '../data/npcs';
import type { NpcId } from '../data/npcs';
import {
  TALENTS,
  TREES,
  NO_FX,
  TIER_POINTS,
  MAX_LEVEL,
  HP_PER_LEVEL,
  XP_FOR,
  xpToNext,
} from '../data/talents';
import type { TalentFx, TreeId } from '../data/talents';
import { SPELLS, SPELL_ORDER, HOME_SLOT } from '../data/spells';
import type { SpellKey } from '../data/spells';
import { BAR_KEYS } from '../data/actionBar';
import { ITEMS, BAG_SLOTS, CHOP, MINE, STARTER, SLOTS, NO_STATS, canWield } from '../data/items';
import type { ItemId, Slot, Stats } from '../data/items';
import { Emitter } from './Emitter';
import { findPath } from './pathfind';
import type { Pt } from './pathfind';
import type {
  Enemy,
  ButtonId,
  HeroEvents,
  FloaterClass,
  LogClass,
  BannerClass,
  Stack,
  TreeState,
  RockState,
  Structure,
  ObjectState,
  QuestProgress,
  SoundId,
  UiSound,
  Work,
} from './types';
import type { Game } from './Game';
import type { Region } from './Region';

export const GCD = 1.2;
/** Perfect-timing window (seconds after the GCD arc restarts). */
export const WIN = 0.3;
export const AA_RANGE = 48;
export const JUMP_DUR = 0.38;
export const JUMP_HEIGHT = 16;
/** A flip is a slightly bigger, slower jump so the rotation reads. */
export const FLIP_DUR = 0.5;
export const FLIP_HEIGHT = 22;
export const FLIP_CHANCE = 0.2;
/** How long the hero's attack animation plays (wind-up, overhead, strike, follow-through). */
export const ATK_ANIM = 0.36;
export const AA_PERIOD = 1.3;
/** How close (world px) you stand to talk to someone. */
export const TALK_REACH = 34;

const ACTION_CD: Record<'mortal' | 'interrupt', number> = {
  mortal: 30,
  interrupt: 15,
};

export interface KeyInfo {
  n: string;
  col: string;
  desc: string;
  cd: number;
  c?: number;
}

/**
 * One player's hero: where they stand, their health and mana, gear, bag, level, talents,
 * cooldowns and what they are doing (walking a path, chopping, talking). Its methods are
 * everything a player can do. A hero belongs to a Game (the room) and stands in one of its
 * Regions; it hears its own messages through `events`.
 */
export class Hero {
  readonly events = new Emitter<HeroEvents>();
  /** Last few log lines, so a HUD created after the first messages can show them. */
  readonly logHistory: { text: string; cls: LogClass }[] = [];
  /** The region it stands in (an id in Game.regions). */
  regionId = '';
  /** Which HD hero it looks like (render/hdHeroes ids). */
  look = 'k1';
  /**
   * Who moves it. 'local': single player, the game moves it. 'remote': on the server, for a
   * player whose browser moves it (positions arrive, checked). 'replica': in that browser,
   * the player's own hero (it walks here; everything else it does goes to the server).
   */
  driven: 'local' | 'remote' | 'replica' = 'local';
  /** Counts teleports (a charge, a dodge, a respawn, a new region): the browser snaps to the server when it changes. */
  tp = 0;
  /** A replica's line to the server: send a command. */
  net: ((c: string, a: unknown[]) => void) | null = null;
  /** Seconds since a remote hero last moved (from the positions its browser sends). */
  stillT = 0;

  hp = 140;
  hpMax = 140;
  mp = 60;
  mpMax = 100;
  /** Seconds since last cast; >= GCD means ready. */
  t = 9;
  buffT = 0;
  invT = 0;
  dodgeCd = 0;
  mortalCd = 0;
  intCd = 0;
  bleedT = 0;
  bleedTick = 0;
  aaT = 0;
  swing = 0;
  /** Seconds left of the attack animation (see attackP). */
  atkAnimT = 0;
  cds: Partial<Record<SkillKey, number>> = {};
  last: SkillKey | null = null;
  kills = 0;
  perf = 0;
  gold = 0;
  /** Character level and experience towards the next one. */
  level = 1;
  xp = 0;
  /** Learned talent ranks by id. */
  talents: Record<string, number> = {};
  /** What the learned talents add up to (read throughout the rules). */
  tal: TalentFx = { ...NO_FX };
  /** Last Warden's cooldown. */
  lastWardenCd = 0;
  /** Cooldowns of the talent abilities. */
  acd: Partial<Record<ActionKey, number>> = {};
  /** Berserk and Last Stand running. */
  berserkT = 0;
  lastStandT = 0;
  /** The action bar: what sits in each of its twelve slots. */
  bar: (SpellKey | null)[] = new Array<SpellKey | null>(BAR_KEYS.length).fill(null);
  /** Seconds left in the death screen; 0 = alive. */
  dead = 0;
  x = 0;
  y = 0;
  face: 1 | -1 = 1;
  walk = 0;
  flash = 0;
  shake = 0;
  target: Enemy | null = null;
  /** Warrior or archer: the spells, talents, auto-attack and weapons this hero has. */
  cls: ClassId = 'warrior';
  /** An archer holds still this long after loosing an arrow (the draw and release). */
  aimT = 0;
  /** Predator: faster auto-shots and harder hits. */
  predatorT = 0;
  /** Camouflage: creatures lose track of you, and your next shot is a critical hit. */
  hiddenT = 0;
  rev = false;
  revAuto = false;
  /** Rev (the skill sequencer) is an advanced option: off until the player turns it on. */
  revEnabled = false;
  mounted = false;
  mountT = 0;
  dustT = 0;
  /** Seconds into the current jump; -1 when on the ground. */
  jumpT = -1;
  /** True when the current jump is a flip. */
  jumpFlip = false;
  lastMove: { x: number; y: number } | null = null;
  /** Click-to-move waypoints (world space), null when not auto-walking. */
  path: Pt[] | null = null;
  private stuckT = 0;
  /** Current screen-space movement input, set by the scene every frame. */
  inputMove = { x: 0, y: 0 };

  // ---- loadout ----
  w1: ActionKey[] = CLASSES.warrior.wheel1.slice();
  w2: Key[] = CLASSES.warrior.wheel2.slice();
  seq: SkillKey[] = CLASSES.warrior.presets.mobs.slice();
  seqI = 0;
  sel1: ActionKey = 'interrupt';
  sel2: Key = 'slash';

  /** Dev-menu switches for this hero. Not reset by reset(). */
  readonly cheats = { god: false, infiniteMana: false, noCooldowns: false, moveSpeed: 1 };

  /** The bag: BAG_SLOTS slots, each empty or one stack. */
  bag: (Stack | null)[] = [];
  /** Equipped gear, one item per slot. */
  equip: Record<Slot, ItemId | null> = {
    head: null,
    body: null,
    legs: null,
    feet: null,
    weapon: null,
    offhand: null,
    trinket: null,
  };
  /** Totals of everything equipped (see applyGear). */
  gear: Stats = { ...NO_STATS };
  /** NPCs this hero has spoken to (they introduce themselves only once). */
  readonly met = new Set<NpcId>();
  /**
   * This hero's own quests: the ones they're on, and the ones they have handed in. Progress
   * (kills, places) is the room's; handing in is each hero's own, for their own reward.
   */
  readonly questLog = new Map<string, QuestProgress['state']>();

  /** The tree being chopped (walking to it first if needed). */
  chopTree: TreeState | null = null;
  /** The rock being mined (walking to it first if needed). */
  mineRock: RockState | null = null;
  /** Seconds until the next swing at a tree or rock lands, and how long that wait is. Starting again never hurries it. */
  private gatherT = 0;
  private gatherLen = 1;
  /** What is being made: seconds left on this one, how many more after it, and where you stand to make it. */
  private making: { r: Recipe; t: number; more: number; x: number; y: number } | null = null;
  /** What you are busy with, for the progress bar (worked out each tick; online, from the server). */
  work: Work | null = null;
  private eatCd = 0;
  /** Walking over to talk to this NPC, or to use this object. */
  private talkTarget: NpcId | null = null;
  private useTarget: string | null = null;
  /** Set while travelling through an exit (the screen fades, then the hero moves region). */
  exiting: { to: string; at: string } | null = null;
  /** Exits only fire once you have stepped clear of the one you arrived by. */
  private exitArmed = false;
  private lockedSaidT = 0;
  /** Seconds before the grey postman's line can be said to this hero again. */
  wandererSaidT = 0;

  constructor(
    readonly game: Game,
    readonly id: string,
    public name: string
  ) {
    this.resetHero();
  }

  get region(): Region {
    return this.game.region(this.regionId);
  }

  get map(): RegionMap {
    return this.region.map;
  }

  /** A scene is playing where this hero stands: input and fighting wait. */
  get inScene(): boolean {
    return !!this.regionId && !!this.region.scene;
  }

  get moving(): boolean {
    return this.inputMove.x !== 0 || this.inputMove.y !== 0 || this.path !== null;
  }

  /** A new hero: nearly naked, level 1, a few spells. */
  resetHero(): void {
    Object.assign(this, {
      hp: 140,
      hpMax: 140,
      mp: 60,
      mpMax: 100,
      t: 9,
      buffT: 0,
      invT: 0,
      dodgeCd: 0,
      mortalCd: 0,
      intCd: 0,
      bleedT: 0,
      bleedTick: 0,
      aaT: 0,
      swing: 0,
      atkAnimT: 0,
      cds: {},
      last: null,
      kills: 0,
      perf: 0,
      gold: 0,
      level: 1,
      xp: 0,
      talents: {},
      tal: { ...NO_FX },
      lastWardenCd: 0,
      acd: {},
      berserkT: 0,
      lastStandT: 0,
      dead: 0,
      face: 1,
      walk: 0,
      flash: 0,
      shake: 0,
      target: null,
      rev: false,
      mounted: false,
      mountT: 0,
      dustT: 0,
      jumpT: -1,
      jumpFlip: false,
      lastMove: null,
      path: null,
      stuckT: 0,
      seqI: 0,
      sel1: 'interrupt',
      sel2: 'slash',
      chopTree: null,
      mineRock: null,
      making: null,
      work: null,
      talkTarget: null,
      useTarget: null,
      exiting: null,
      eatCd: 0,
      aimT: 0,
      predatorT: 0,
      hiddenT: 0,
    });
    this.questLog.clear();
    this.bar = new Array<SpellKey | null>(BAR_KEYS.length).fill(null);
    for (const k of SPELL_ORDER) if (this.knows(k)) this.placeSpell(k);
    this.applyClass();
    this.bag = new Array<Stack | null>(BAG_SLOTS).fill(null);
    this.equip = {
      head: null,
      body: null,
      legs: null,
      feet: null,
      weapon: null,
      offhand: null,
      trinket: null,
    };
    Object.assign(this.equip, CLASSES[this.cls].starter);
    for (const id of STARTER.bag) this.addItem(id, 1);
    this.met.clear();
    this.applyGear();
    this.hp = this.hpMax;
    this.events.emit('loadout', {});
  }

  /** The class's loadout: the mobile wheels and the Rev sequence start with its spells. */
  applyClass(): void {
    const C = CLASSES[this.cls];
    this.w1 = C.wheel1.slice();
    this.w2 = C.wheel2.slice();
    this.sel1 = C.wheel1[0];
    this.sel2 = C.wheel2[0];
    this.seq = C.presets.mobs.slice();
    this.seqI = 0;
  }

  /** Holding a bow (an archer without one can only punch). */
  get hasBow(): boolean {
    const w = this.equip.weapon;
    return !!w && ITEMS[w].cls === 'archer';
  }

  /** Feet planted: not walking. An archer only shoots like this. */
  get planted(): boolean {
    return this.driven === 'remote' ? this.stillT >= 0.12 : !this.moving;
  }

  /** How far the auto-attack reaches: a sword's length, or (an archer with a bow) a bowshot. */
  get aaReach(): number {
    const aa = CLASSES[this.cls].aa;
    return aa.ranged && this.hasBow ? this.reach(aa.range) : AA_RANGE;
  }

  /** How far this hero's arrows (or a spell's) reach. */
  reach(range: number): number {
    return range + (CLASSES[this.cls].aa.ranged ? this.tal.shotRange : 0);
  }

  // ---------- messaging ----------
  log(text: string, cls: LogClass = ''): void {
    this.logHistory.push({ text, cls });
    while (this.logHistory.length > 5) this.logHistory.shift();
    this.events.emit('log', { text, cls });
  }
  banner(text: string, cls: BannerClass = ''): void {
    this.events.emit('banner', { text, cls });
  }
  private floater(
    x: number,
    y: number,
    text: string,
    cls: FloaterClass = '',
    color?: string
  ): void {
    this.region.floater(x, y, text, cls, color);
  }
  private castFlash(btn: ButtonId, key: WheelKey, color: string): void {
    this.events.emit('castFlash', { btn, key, color });
  }
  private nudge(btn: ButtonId, key: WheelKey, err = false): void {
    this.events.emit('nudge', { btn, key, err });
  }
  /**
   * A sound everyone nearby hears (from the hero, unless it happened somewhere else). Online
   * the server's hero makes it; the browser's copy only hears it, or it would sound twice.
   */
  private sound(id: SoundId, x = this.x, y = this.y): void {
    if (this.driven !== 'replica') this.region.sound(id, x, y);
  }
  /** A sound for this hero alone, wherever they are: a level, a quest, loot, gold. */
  hear(id: UiSound): void {
    if (this.driven !== 'replica') this.events.emit('sound', { id });
  }
  private burst(
    x: number,
    y: number,
    n: number,
    col: string,
    spd: number,
    life: number,
    size = 3,
    g = 0
  ): void {
    this.region.burst(x, y, n, col, spd, life, size, g);
  }

  private boltPts(x: number, y: number): [number, number][] {
    const pts: [number, number][] = [[x + (Math.random() * 30 - 15), y - 140]];
    for (let i = 1; i < 6; i++)
      pts.push([x + (Math.random() * 36 - 18) * (1 - i / 6), y - 140 + (i * 140) / 6]);
    pts.push([x, y]);
    return pts;
  }

  // ---------- helpers ----------
  dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  nearestEnemy(excl: Enemy | null, max = 260): Enemy | null {
    let best: Enemy | null = null;
    let bd = max;
    for (const e of this.region.enemies) {
      if (!e.alive || e === excl) continue;
      const d = this.dist(this, e);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  setTarget(e: Enemy | null): void {
    if (this.target !== e) this.seqI = 0;
    this.target = e;
    if (e) this.log('Target: ' + e.n + '.');
  }

  cycleTarget(): void {
    const t = this.nearestEnemy(this.target);
    if (t) this.setTarget(t);
  }

  info(k: WheelKey): KeyInfo {
    if (isSkill(k)) {
      const s = SKILLS[k];
      return {
        n: s.n,
        col: s.col,
        desc: s.desc + (s.c ? ' · ' + s.c + ' mana' : ''),
        cd: this.skillCd(k),
        c: s.c,
      };
    }
    if (k === 'rev')
      return {
        n: this.rev ? 'Rev · stop' : 'Rev',
        col: '#f2c14e',
        desc: 'each tap, the next step',
        cd: 0,
      };
    const a = ACTIONS[k];
    return { ...a, cd: this.abilityCd(k) };
  }

  /** A skill's cooldown after talents. */
  skillCd(k: SkillKey): number {
    const cd = SKILLS[k].cd;
    if (k === 'charge') return Math.max(2, cd - this.tal.chargeCd);
    if (k === 'whirlwind') return Math.max(2, cd - this.tal.whirlCd);
    if (k === 'concussive') return Math.max(2, cd - this.tal.concCd);
    if (k === 'volley') return Math.max(2, cd - this.tal.volleyCd);
    return cd;
  }

  /** An instant spell's cooldown after talents (Silencing Shot shares Interrupt's). */
  abilityCd(k: ActionKey): number {
    if (k === 'mortal' || k === 'interrupt') return this.actionCd(k);
    if (k === 'silence') return this.actionCd('interrupt');
    if (k === 'pierce') return Math.max(2, ACTIONS.pierce.cd - this.tal.pierceCd);
    if (k === 'beartrap') return Math.max(2, ACTIONS.beartrap.cd - this.tal.trapCd);
    return ACTIONS[k].cd;
  }

  /** An action's cooldown after talents. */
  actionCd(k: keyof typeof ACTION_CD): number {
    const less = { mortal: this.tal.mortalCd, interrupt: this.tal.intCd }[k];
    return Math.max(2, ACTION_CD[k] - less);
  }

  /**
   * Everything that scales your damage: talents, War Cry, Enrage, Berserk and Predator, and
   * against a particular creature, your Hunter's Mark on it.
   */
  private dmgMult(e?: Enemy): number {
    const cry = this.buffT > 0 ? 1.2 + this.tal.warcryBonus : 1;
    const rage = this.hp < this.hpMax / 2 ? 1 + this.tal.enrage : 1;
    const frenzy = this.berserkT > 0 || this.predatorT > 0 ? 1.2 : 1;
    const marked = e && e.markT > 0 && e.markBy === this.id ? 1 + e.markK : 1;
    return (1 + this.tal.dmg) * cry * rage * frenzy * marked;
  }

  /** Damage of a critical hit, as a multiplier. */
  get critMult(): number {
    return 1.6 + this.tal.critDmg;
  }

  /** Armor from gear and talents (Shield Wall needs something in the off hand). */
  get armor(): number {
    return this.gear.armor + this.tal.armor + (this.equip.offhand ? this.tal.shieldWall : 0);
  }

  /** Execute's health threshold (25%, more with Executioner). */
  get execThreshold(): number {
    return 0.25 + this.tal.execThreshold;
  }

  cdRemaining(k: WheelKey): number {
    if (isSkill(k)) return this.cds[k] ?? 0;
    switch (k) {
      case 'mortal':
        return this.mortalCd;
      case 'interrupt':
      case 'silence':
        return this.intCd;
      default:
        return this.acd[k as ActionKey] ?? 0;
    }
  }

  /** On cooldown or unaffordable: shown greyed in wheels. */
  unavailable(k: WheelKey): boolean {
    if (this.cdRemaining(k) > 0) return true;
    if (isSkill(k) && this.mp < SKILLS[k].c) return true;
    if (!isSkill(k) && k !== 'rev' && this.mp < (ACTIONS[k].c ?? 0)) return true;
    return false;
  }

  /** Reason the key can't be used right now, or null if it can. */
  canDo(k: WheelKey): string | null {
    if (k === 'rev') return null;
    if (k !== 'target' && !this.knows(k)) return this.notLearned(k);
    if (isSkill(k)) return this.canCast(k);
    const tg = this.target;
    const rem = this.cdRemaining(k);
    if (rem > 0) return ACTIONS[k].n + ' on cooldown (' + Math.ceil(rem) + ' s).';
    if (this.mp < (ACTIONS[k].c ?? 0)) return 'Not enough mana for ' + ACTIONS[k].n + '.';
    const close = !!tg && tg.alive && this.dist(this, tg) <= 60;
    // the archer's shots: a bow, feet planted, and the target within an arrow's reach
    if (isShot(k)) {
      const why = this.shotProblem();
      if (why) return why;
      if (k !== 'silence' && (!tg || !tg.alive)) return 'Pick a target first.';
      if (tg && tg.alive && this.dist(this, tg) > this.reach(k === 'deadeye' ? 260 : 220))
        return `${ACTIONS[k].n}: out of range.`;
    }
    switch (k) {
      case 'silence':
        return tg && tg.alive && tg.castT > 0 ? null : 'Nothing to silence.';
      case 'killshot':
        return tg && tg.alive && tg.hp / tg.hpMax < this.execThreshold
          ? null
          : `Kill Shot needs a target below ${Math.round(this.execThreshold * 100)}%.`;
      case 'sunder':
      case 'deathblow':
        return close ? null : `${ACTIONS[k].n} needs a target close by.`;
      case 'shieldbash':
        return !this.equip.offhand
          ? 'Shield Bash needs a shield in your off hand.'
          : close
            ? null
            : 'Shield Bash needs a target close by.';
      case 'bloodrage':
        return this.hp > this.hpMax * 0.2 ? null : 'Too hurt for Bloodrage.';
      case 'interrupt':
        return tg && tg.alive && tg.castT > 0 ? null : 'Nothing to interrupt.';
      case 'execute':
        return tg && tg.alive && tg.hp / tg.hpMax < this.execThreshold && this.dist(this, tg) < 60
          ? null
          : `Execute needs a target below ${Math.round(this.execThreshold * 100)}% and close.`;
      case 'mortal':
        return tg && tg.alive && this.dist(this, tg) <= 60
          ? null
          : 'Mortal Strike needs a target close by.';
      case 'target':
        return this.nearestEnemy(this.target) ? null : 'No other enemy nearby.';
      default:
        return null;
    }
  }

  private canCast(key: SkillKey): string | null {
    if (!this.knows(key)) return this.notLearned(key);
    const sk = SKILLS[key];
    const tg = this.target;
    const needT = sk.range > 0;
    const cd = this.cds[key] ?? 0;
    if (cd > 0) return sk.n + ' on cooldown (' + Math.ceil(cd) + ' s).';
    if (sk.shot) {
      const why = this.shotProblem();
      if (why) return why;
    }
    if (needT && (!tg || !tg.alive)) return 'Pick a target first.';
    if (needT && tg && this.dist(this, tg) > this.reach(sk.range)) return sk.n + ': out of range.';
    if (this.mp < sk.c) return 'Not enough mana for ' + sk.n + '.';
    return null;
  }

  /** Why an archer can't loose an arrow right now (no bow, or walking), or null. */
  private shotProblem(): string | null {
    if (!this.hasBow) return 'You need a bow to shoot.';
    // the browser stops its hero before it asks, so the server takes its word on a cast
    if (this.driven !== 'remote' && !this.planted) return 'Stand still to shoot.';
    return null;
  }

  // ---------- Rev ----------
  revList(): SkillKey[] {
    return this.seq.length ? this.seq : ['thrust'];
  }
  revIdx(): number {
    this.seqI %= this.revList().length;
    return this.seqI;
  }
  revPick(): SkillKey {
    return this.revList()[this.revIdx()];
  }
  setRevEnabled(on: boolean): void {
    if (this.revEnabled === on) return;
    this.revEnabled = on;
    if (!on && this.rev) this.setRev(false);
    this.events.emit('loadout', {});
  }
  setRev(on: boolean): void {
    if (on && !this.revEnabled) return;
    this.rev = on;
    this.seqI = 0;
    this.events.emit('loadout', {});
    this.log(on ? 'Rev on: each tap fires the next step of your list.' : 'Rev off.', on ? 'c' : '');
  }
  setRevAuto(on: boolean): void {
    if (!this.revEnabled) return;
    this.revAuto = on;
    this.log(
      on ? 'Rev auto: fires on its own every GCD.' : 'Rev manual: each tap fires the marked step.'
    );
  }
  /** PC: fire the next Rev step, switching Rev on first if it was off. */
  revStep(): void {
    if (!this.revEnabled) return;
    if (!this.rev) this.setRev(true);
    this.revFire(true);
  }

  /** PC action bar: cast a key directly. Manual casts leave Rev as it is. */
  castKey(k: Key): boolean {
    if (this.inScene) return false;
    return this.doAction(k, true, 2);
  }

  private revFire(fromTap: boolean): boolean {
    const l = this.revList();
    const i = this.revIdx();
    if (this.cast(l[i], fromTap, 2, !fromTap)) {
      this.seqI = (i + 1) % l.length;
      return true;
    }
    return false;
  }
  setSeqPreset(name: string): void {
    const p = CLASSES[this.cls].presets[name];
    if (!p) return;
    this.seq = p.slice();
    this.seqI = 0;
    this.events.emit('loadout', {});
    this.log('Preset ' + name + ' loaded.');
  }

  // ---------- buttons ----------
  /** Quick tap on a button: fires its remembered action (or the next Rev step). */
  tapButton(b: ButtonId): void {
    if (b === 2) {
      if (this.rev) this.revFire(true);
      else this.doAction(this.sel2, true, 2);
    } else this.doAction(this.sel1, true, 1);
  }

  /** Picking an item from a wheel: remembers it for the button, then fires it. */
  pickFromWheel(b: ButtonId, k: WheelKey): void {
    if (k === 'rev') {
      this.setRev(!this.rev);
      return;
    }
    if (b === 2 && this.rev) {
      this.rev = false;
      this.log('Rev off: you picked ' + this.info(k).n + ' by hand.');
    }
    if (b === 2) this.sel2 = k;
    else if (!isSkill(k)) this.sel1 = k;
    this.events.emit('loadout', {});
    if (!this.doAction(k, true, b))
      this.log(this.info(k).n + ' selected. Tap to cast when you can.');
  }

  /** Keyboard 1-5: cast wheel-2 slot directly. */
  castSlot(i: number): void {
    const key = this.w2[i];
    if (!key) return;
    if (this.rev) {
      this.rev = false;
      this.log('Rev off: you picked ' + this.info(key).n + ' by hand.');
    }
    this.sel2 = key;
    this.doAction(key, true, 2);
  }

  doAction(k: Key, fromTap: boolean, btn: ButtonId, quiet = false): boolean {
    if (isSkill(k)) return this.cast(k, fromTap, btn, quiet);
    if (this.dead) return false;
    const tg = this.target;
    const why = this.canDo(k);
    if (why) {
      if (!quiet) {
        this.log(why, 'h');
        this.nudge(btn, k, true);
        this.hear('error');
      }
      return false;
    }
    if (k === 'target') {
      const e = this.nearestEnemy(this.target)!;
      this.target = e;
      this.seqI = 0;
      this.log('Target: ' + e.n + '.');
      return true;
    }
    if (k === 'mount') {
      this.mountToggle();
      return true;
    }
    if (!['bloodrage', 'laststand', 'berserk', 'predator', 'camouflage'].includes(k)) {
      if (this.mounted) this.dismount('You dismount to attack.');
      this.mountT = 0;
    }
    const a = ACTIONS[k];
    const R = this.region;
    this.floater(this.x, this.y - 36, a.n.toUpperCase(), 'name', a.col);
    this.castFlash(btn, k, a.col);
    this.sound(k);
    this.nudge(btn, k);
    if (k === 'interrupt' && tg) {
      this.intCd = this.actionCd('interrupt');
      tg.castT = -1;
      tg.castCd = 6;
      tg.stunT = 1 + this.tal.intStun;
      this.banner('INTERRUPTED', 'cool');
      this.log('You interrupted the cast.', 't');
      R.fx({ type: 'shield', x: tg.x, y: tg.y, col: '#3ddbd9', dur: 0.4 });
      this.burst(tg.x, tg.y - 8, 8, '#3ddbd9', 90, 0.4, 2, 0);
    } else if (k === 'execute' && tg) {
      R.fx({ type: 'xslash', x: tg.x, y: tg.y - 6, col: '#e0504b', dur: 0.45 });
      this.burst(tg.x, tg.y - 6, 14, '#c8302a', 110, 0.6, 3, 200);
      this.shake = 0.15;
      this.dmgEnemy(
        tg,
        Math.round((Math.round(tg.hp * 0.3) + 8) * (1 + this.tal.execDmg) * this.dmgMult()),
        'crit'
      );
      this.banner('EXECUTE!', 'bad');
      this.log('Execution strike.', 'c');
    } else if (k === 'mortal' && tg) {
      this.mortalCd = this.actionCd('mortal');
      R.fx({
        type: 'bolt',
        x: tg.x,
        y: tg.y - 4,
        pts: this.boltPts(tg.x, tg.y - 4),
        col: '#f2c14e',
        dur: 0.4,
      });
      this.burst(tg.x, tg.y - 6, 16, '#f2c14e', 130, 0.5, 3, 100);
      this.shake = 0.22;
      this.dmgEnemy(tg, Math.round((12 + this.tal.mortalDmg) * this.dmgMult()), 'crit');
      if (this.tal.critBleed) this.bleedT = Math.max(this.bleedT, this.tal.critBleed);
      tg.stunT = 0.6;
      this.swing = 0.2;
      this.atkAnimT = ATK_ANIM;
      this.log('Mortal Strike.', 'c');
    } else if (k === 'silence' && tg) {
      this.intCd = this.actionCd('interrupt');
      this.loose(
        tg,
        e => {
          e.castT = -1;
          e.castCd = 6;
          e.stunT = Math.max(e.stunT, 1 + this.tal.intStun);
          this.dmgEnemy(e, Math.round(2 * this.dmgMult(e)), '');
          this.banner('SILENCED', 'cool');
          R.fx({ type: 'shield', x: e.x, y: e.y, col: '#3ddbd9', dur: 0.4 });
        },
        '#3ddbd9',
        false,
        'hitSilence'
      );
    } else if (k === 'killshot' && tg) {
      this.loose(
        tg,
        e => {
          R.fx({ type: 'xslash', x: e.x, y: e.y - 6, col: '#e0504b', dur: 0.4 });
          this.burst(e.x, e.y - 6, 14, '#c8302a', 110, 0.6, 3, 200);
          this.dmgEnemy(
            e,
            Math.round((Math.round(e.hp * 0.3) + 8) * (1 + this.tal.execDmg) * this.dmgMult(e)),
            'crit'
          );
          this.banner('KILL SHOT!', 'bad');
        },
        '#e0504b',
        false,
        'hitKillshot'
      );
    } else if (k === 'pierce' && tg) {
      this.acd.pierce = this.abilityCd('pierce');
      this.pierce(tg);
    } else this.talentAbility(k, tg);
    return true;
  }

  /** The abilities taught by talents (Sunder, Deathblow, Bloodrage, Berserk, Shield Bash, Last Stand). */
  private talentAbility(k: ActionKey, tg: Enemy | null): void {
    const a = ACTIONS[k];
    if (!(k in SPELLS) || !SPELLS[k as SpellKey].talent) return;
    const R = this.region;
    this.acd[k] = this.abilityCd(k);
    this.mp -= a.c ?? 0;
    const crit = this.game.rng.next() < this.tal.crit;
    const hit = (base: number, e?: Enemy) =>
      Math.round(base * this.dmgMult(e) * (crit ? this.critMult : 1));
    if (k === 'sunder' && tg) {
      this.face = faceToward(this.x, this.y, tg.x, tg.y, this.face);
      R.fx({ type: 'slash', x: tg.x, y: tg.y - 6, rot: 0.4, col: '#c8d2e0', dur: 0.35 });
      this.burst(tg.x, tg.y - 8, 10, '#c8d2e0', 90, 0.5, 2, 160);
      this.dmgEnemy(tg, hit(6), crit ? 'crit' : '');
      tg.sunderT = 10;
      this.atkAnimT = ATK_ANIM;
      this.log(`${tg.n} is sundered: it takes 20% more damage for 10 s.`, 'c');
    } else if (k === 'deathblow' && tg) {
      this.face = faceToward(this.x, this.y, tg.x, tg.y, this.face);
      R.fx({ type: 'xslash', x: tg.x, y: tg.y - 6, col: '#e0504b', dur: 0.5 });
      this.burst(tg.x, tg.y - 6, 18, '#c8302a', 130, 0.6, 3, 200);
      this.shake = 0.25;
      this.dmgEnemy(tg, hit(30), 'crit');
      this.atkAnimT = ATK_ANIM;
      if (!tg.alive) {
        this.acd.deathblow = 0;
        this.log('Deathblow! It is ready again.', 'c');
      }
    } else if (k === 'bloodrage') {
      const cost = Math.min(Math.round(this.hpMax * 0.15), Math.floor(this.hp) - 1);
      this.hp -= cost;
      this.mp = Math.min(this.mpMax, this.mp + 40);
      this.floater(this.x, this.y - 20, '-' + cost, 'hurt');
      this.floater(this.x + 14, this.y - 30, '+40 MANA', 'name', '#7ab8ff');
      this.burst(this.x, this.y - 12, 12, '#c8302a', 60, 0.6, 2, -30);
    } else if (k === 'berserk') {
      this.berserkT = 10;
      this.floater(this.x, this.y - 20, 'BERSERK', 'name', '#ff8c42');
      R.fx({ type: 'shout', x: this.x, y: this.y, col: '#ff8c42', dur: 0.7 });
      this.burst(this.x, this.y - 14, 14, '#ff8c42', 70, 0.7, 2, -50);
    } else if (k === 'shieldbash' && tg) {
      this.face = faceToward(this.x, this.y, tg.x, tg.y, this.face);
      R.fx({ type: 'shield', x: tg.x, y: tg.y, col: '#c4cedc', dur: 0.4 });
      this.burst(tg.x, tg.y - 8, 10, '#fff0a0', 90, 0.4, 2, 60);
      this.shake = 0.15;
      this.dmgEnemy(tg, hit(6), crit ? 'crit' : '');
      tg.stunT = Math.max(tg.stunT, 2);
      if (tg.castT > 0) this.banner('INTERRUPTED', 'cool');
      tg.castT = -1;
      tg.castCd = Math.max(tg.castCd, 4);
      this.atkAnimT = ATK_ANIM;
    } else if (k === 'laststand') {
      const h = Math.min(Math.round(this.hpMax * 0.3), this.hpMax - this.hp);
      this.hp += h;
      this.lastStandT = 8;
      this.floater(this.x, this.y - 20, '+' + h, 'heal');
      R.fx({
        type: 'ring',
        x: this.x,
        y: this.y - 8,
        r0: 8,
        r1: 40,
        col: '#6ccf6a',
        lw: 3,
        dur: 0.6,
      });
      this.log('Last Stand: you dig in.', 't');
    } else if (k === 'rapidfire' && tg) {
      // three arrows, a beat apart
      for (let i = 0; i < 3; i++)
        R.after(i * 0.18, () => {
          if (tg.alive && this.regionId === R.id && !this.dead)
            this.loose(
              tg,
              e => this.dmgEnemy(e, hit(4, e), crit ? 'crit' : ''),
              '#c8d2e0',
              false,
              'hitArrow'
            );
        });
    } else if (k === 'deadeye' && tg) {
      this.loose(
        tg,
        e => {
          this.burst(e.x, e.y - 6, 18, '#c8302a', 130, 0.6, 3, 200);
          this.shake = 0.2;
          this.dmgEnemy(e, hit(26, e), 'crit');
          if (!e.alive) {
            this.acd.deadeye = 0;
            this.log('Deadeye! It is ready again.', 'c');
          }
        },
        '#e0504b',
        false,
        'hitDeadeye'
      );
    } else if (k === 'beartrap') {
      R.setTrap(this, 3 + this.tal.trapHold);
      this.burst(this.x, this.y + 2, 8, '#c8a05a', 50, 0.5, 2, -20);
      this.log('You set a bear trap.', 't');
    } else if (k === 'predator') {
      this.predatorT = 10;
      this.floater(this.x, this.y - 20, 'PREDATOR', 'name', '#ff8c42');
      R.fx({ type: 'shout', x: this.x, y: this.y, col: '#ff8c42', dur: 0.7 });
      this.burst(this.x, this.y - 14, 14, '#ff8c42', 70, 0.7, 2, -50);
    } else if (k === 'disengage') {
      this.disengage(tg);
    } else if (k === 'camouflage') {
      this.hiddenT = 6;
      const h = Math.min(Math.round(this.hpMax * 0.2), this.hpMax - this.hp);
      this.hp += h;
      if (h) this.floater(this.x, this.y - 20, '+' + h, 'heal');
      // whatever was after you loses the scent
      for (const e of R.enemies)
        if (e.foe === this.id) {
          e.foe = undefined;
          e.aggro = false;
          e.tele = false;
        }
      this.target = null;
      this.burst(this.x, this.y - 10, 14, '#6ccf6a', 60, 0.8, 2, -20);
      this.log('You melt into the wild.', 't');
    }
  }

  /** Piercing Shot: one heavy arrow through everything in a line to the target and a little beyond. */
  private pierce(tg: Enemy): void {
    const R = this.region;
    const d = this.dist(this, tg) || 1;
    const ux = (tg.x - this.x) / d;
    const uy = (tg.y - this.y) / d;
    const len = d + 60;
    const x0 = this.x;
    const y0 = this.y;
    this.face = faceToward(this.x, this.y, tg.x, tg.y, this.face);
    R.fx({
      type: 'arrow',
      x0: x0 + this.face * 6,
      y0: y0 - 10,
      x1: x0 + ux * len,
      y1: y0 + uy * len - 6,
      col: '#f2c14e',
      dur: len / ARROW_SPEED,
    });
    const dmg = 12 + this.tal.pierceDmg;
    for (const e of R.enemies) {
      if (!e.alive) continue;
      const along = (e.x - x0) * ux + (e.y - y0) * uy;
      const off = Math.abs((e.x - x0) * uy - (e.y - y0) * ux);
      if (along < 0 || along > len || off > 12 * e.def.scale) continue;
      R.after(along / ARROW_SPEED, () => {
        if (e.alive && this.regionId === R.id) {
          R.sound('hitPierce', e.x, e.y);
          this.dmgEnemy(e, Math.round(dmg * this.dmgMult(e)), 'crit');
          if (this.tal.critBleed) this.bleedT = Math.max(this.bleedT, this.tal.critBleed);
        }
      });
    }
    this.aimT = AIM_HOLD;
    this.atkAnimT = ATK_ANIM;
    this.hiddenT = 0;
    this.shake = 0.12;
    this.log('Piercing Shot.', 'c');
  }

  /** Disengage: leap back away from the target (or from where you face), stopping short of walls. */
  private disengage(tg: Enemy | null): void {
    const R = this.region;
    // back along the screen (screen-right is world (+1, -1))
    let ux = -this.face * Math.SQRT1_2;
    let uy = this.face * Math.SQRT1_2;
    if (tg) {
      const d = this.dist(this, tg) || 1;
      ux = (this.x - tg.x) / d;
      uy = (this.y - tg.y) / d;
    }
    const x0 = this.x;
    const y0 = this.y;
    let best = 0;
    for (let s = 10; s <= 90; s += 10) {
      if (this.map.blocked(x0 + ux * s, y0 + uy * s, 9, 8)) break;
      best = s;
    }
    this.stopMoving();
    if (best) {
      this.x = x0 + ux * best;
      this.y = y0 + uy * best;
      this.tp++;
    }
    this.invT = Math.max(this.invT, 0.25);
    R.fx({ type: 'dash', x0, y0, x1: this.x, y1: this.y, face: this.face, dur: 0.3 });
    this.burst(x0, y0 + 4, 8, '#6ccf6a', 60, 0.5, 3, -20);
  }

  // ---------- spells and the action bar ----------
  /** Whether you have learned a spell (by level, or from its talent). */
  knows(k: SpellKey): boolean {
    const s = SPELLS[k];
    if (s.cls && s.cls !== this.cls) return false;
    if (s.talent) return (this.talents[s.talent] ?? 0) > 0;
    return this.level >= (s.level ?? 1);
  }

  private notLearned(k: SpellKey): string {
    const s = SPELLS[k];
    const name = isSkill(k) ? SKILLS[k].n : ACTIONS[k].n;
    if (s.cls && s.cls !== this.cls)
      return `${name} is ${s.cls === 'archer' ? 'an archer' : 'a warrior'}'s spell.`;
    return s.talent
      ? `${name} comes from the ${TALENTS[s.talent].name} talent.`
      : `You learn ${name} at level ${s.level}.`;
  }

  /** Put a spell on the bar: its usual slot if free, else the first free one. */
  placeSpell(k: SpellKey): number {
    if (this.bar.includes(k)) return this.bar.indexOf(k);
    const home = HOME_SLOT[k];
    const i = home !== undefined && !this.bar[home] ? home : this.bar.indexOf(null);
    if (i >= 0) {
      this.bar[i] = k;
      this.events.emit('loadout', {});
    }
    return i;
  }

  /** Drop a spell into a slot (it leaves any slot it was in); null empties the slot. */
  setBarSlot(i: number, k: SpellKey | null): void {
    if (i < 0 || i >= this.bar.length) return;
    if (k && !this.knows(k)) return;
    if (k) {
      const was = this.bar.indexOf(k);
      if (was >= 0) this.bar[was] = this.bar[i];
    }
    this.bar[i] = k;
    this.events.emit('loadout', {});
  }

  /** Use whatever sits in a bar slot. */
  castBarSlot(i: number): void {
    const k = this.bar[i];
    if (k) this.castKey(k);
  }

  private cast(key: SkillKey, fromTap: boolean, btn: ButtonId, quiet: boolean): boolean {
    if (this.dead) return false;
    if (this.t < GCD) {
      this.nudge(btn, key);
      return false;
    }
    const sk = SKILLS[key];
    // an archer walking somewhere stops to shoot (keys held down have to let go first)
    if (sk.shot && this.path && this.driven !== 'remote') this.stopMoving();
    const why = this.canCast(key);
    if (why) {
      if (!quiet) {
        this.log(why, 'h');
        if (why.includes('range')) this.floater(this.x, this.y - 20, 'TOO FAR', 'hurt');
        this.nudge(btn, key, true);
        this.hear('error');
      }
      return false;
    }
    const R = this.region;
    if (this.mounted) this.dismount('You dismount to attack.');
    this.mountT = 0;
    this.mp -= sk.c;
    this.cds[key] = this.skillCd(key);
    const phase = (this.t - GCD) % GCD;
    const perfect = fromTap && phase < WIN;
    // a perfect-timed tap always crits (so does the first shot out of Camouflage); Keen Eye
    // and Eagle Eye add a chance for any hit
    const crit = perfect || (!!sk.shot && this.hiddenT > 0) || this.game.rng.next() < this.tal.crit;
    const combo =
      key === 'slash' && this.last === 'thrust'
        ? 1.5 + this.tal.slashCombo
        : key === 'aimedshot' && this.last === 'quickshot'
          ? 1.5 + this.tal.aimedCombo
          : 1;
    const scale = combo * (crit ? this.critMult : 1);
    const mult = this.dmgMult(this.target ?? undefined) * scale;
    const base =
      sk.d +
      (key === 'thrust' ? this.tal.thrust : 0) +
      (key === 'whirlwind' ? this.tal.whirlDmg : 0) +
      (key === 'quickshot' ? this.tal.quickDmg : 0) +
      (key === 'volley' ? this.tal.volleyDmg : 0);
    this.floater(this.x, this.y - 36, sk.n.toUpperCase(), 'name', sk.col);
    this.castFlash(btn, key, sk.col);
    this.sound(key);
    const tg = this.target;
    const critCls: FloaterClass = crit ? 'crit' : '';
    if (key === 'charge' && tg) {
      this.stopMoving();
      const d = this.dist(this, tg);
      const x0 = this.x;
      const y0 = this.y;
      if (d > 30) {
        this.x = tg.x - ((tg.x - this.x) / d) * 28;
        this.y = tg.y - ((tg.y - this.y) / d) * 28;
        this.tp++;
      }
      this.face = faceToward(this.x, this.y, tg.x, tg.y, this.face);
      R.fx({ type: 'dash', x0, y0, x1: this.x, y1: this.y, face: this.face, dur: 0.35 });
      this.burst(x0, y0 + 4, 8, '#b8956a', 60, 0.5, 3, -20);
      R.fx({ type: 'hit', x: tg.x, y: tg.y - 8, col: sk.col, dur: 0.25 });
      this.shake = 0.12;
      this.dmgEnemy(tg, Math.round(base * mult), critCls);
      tg.stunT = 1.5 + this.tal.chargeStun;
      tg.tele = false;
      tg.atkT = Math.max(tg.atkT, 1.5);
    } else if (key === 'whirlwind') {
      let n = 0;
      const reach = (sk.aoe ?? 0) + this.tal.whirlReach;
      R.fx({ type: 'whirl', x: this.x, y: this.y, r: reach, col: sk.col, dur: 0.5 });
      this.burst(this.x, this.y - 8, 12, sk.col, 140, 0.5, 2, 0);
      for (const e of R.enemies) {
        if (e.alive && this.dist(this, e) < reach) {
          this.dmgEnemy(e, Math.round(base * mult), critCls);
          n++;
        }
      }
      if (!n) this.log('Whirlwind hit nobody.');
    } else if (key === 'warcry') {
      this.buffT = 15 + this.tal.warcryDur;
      this.floater(
        this.x,
        this.y - 20,
        `+${Math.round((0.2 + this.tal.warcryBonus) * 100)}%`,
        'heal'
      );
      R.fx({ type: 'shout', x: this.x, y: this.y, col: sk.col, dur: 0.7 });
      this.burst(this.x, this.y - 14, 8, sk.col, 50, 0.6, 2, -40);
    } else if (key === 'mark' && tg) {
      tg.markT = 15 + this.tal.markDur;
      tg.markBy = this.id;
      tg.markK = 0.2 + this.tal.markBonus;
      this.face = faceToward(this.x, this.y, tg.x, tg.y, this.face);
      R.fx({ type: 'ring', x: tg.x, y: tg.y - 10, r0: 20, r1: 6, col: sk.col, lw: 2, dur: 0.5 });
      this.floater(tg.x, tg.y - 14 * tg.def.scale - 12, 'MARKED', 'name', sk.col);
      this.log(
        `${tg.n} is marked: it takes ${Math.round(tg.markK * 100)}% more damage from you for ${Math.round(tg.markT)} s.`,
        'c'
      );
    } else if (key === 'volley' && tg) {
      // the arrows come down all around where the target stood
      const reach = (sk.aoe ?? 0) + this.tal.volleyReach;
      const cx = tg.x;
      const cy = tg.y;
      for (let i = 0; i < 4; i++) {
        const a = this.game.rng.next() * Math.PI * 2;
        const r = this.game.rng.next() * reach * 0.8;
        R.fx({
          type: 'arrow',
          x0: this.x,
          y0: this.y - 10,
          x1: cx + Math.cos(a) * r,
          y1: cy + Math.sin(a) * r,
          col: sk.col,
          dur: this.dist(this, tg) / ARROW_SPEED + 0.04 * i,
        });
      }
      this.loose(
        tg,
        () => {
          R.sound('hitVolley', cx, cy);
          R.fx({ type: 'ring', x: cx, y: cy, r0: 6, r1: reach, col: sk.col, lw: 2, dur: 0.4 });
          this.burst(cx, cy - 6, 14, sk.col, 120, 0.5, 2, 160);
          for (const e of R.enemies)
            if (e.alive && Math.hypot(e.x - cx, e.y - cy) < reach)
              this.dmgEnemy(e, Math.round(base * this.dmgMult(e) * scale), critCls);
        },
        sk.col,
        true
      );
    } else if (sk.shot && tg) {
      // one arrow: Quick Shot, Aimed Shot, Barbed Arrow, Concussive Shot
      const far = this.dist(this, tg) > 150 ? 1 + this.tal.farShot : 1;
      this.loose(
        tg,
        e => {
          this.dmgEnemy(e, Math.round(base * this.dmgMult(e) * scale * far), critCls);
          if (key === 'barbed') {
            this.bleedT = 8 + this.tal.rendDur;
            this.burst(e.x, e.y - 6, 8, '#c8302a', 70, 0.5, 2, 200);
          }
          if (key === 'concussive') {
            e.slowT = 6;
            e.slowK = Math.min(0.8, 0.5 + this.tal.concSlow);
            this.floater(e.x + 10, e.y - 14 * e.def.scale - 8, 'SLOWED', 'name', sk.col);
          }
          if (crit && this.tal.critSlow) {
            e.slowT = Math.max(e.slowT, this.tal.critSlow);
            e.slowK = Math.max(e.slowK, 0.5);
          }
        },
        sk.col,
        false,
        key === 'aimedshot'
          ? 'hitAimed'
          : key === 'barbed'
            ? 'hitBarbed'
            : key === 'concussive'
              ? 'hitConcussive'
              : 'hitArrow'
      );
    } else if (tg) {
      this.face = faceToward(this.x, this.y, tg.x, tg.y, this.face);
      if (key === 'thrust')
        R.fx({
          type: 'stab',
          x0: this.x + this.face * 8,
          y0: this.y - 8,
          x1: tg.x,
          y1: tg.y - 6,
          dur: 0.28,
        });
      else if (key === 'slash')
        R.fx({
          type: 'slash',
          x: tg.x,
          y: tg.y - 6,
          rot: -0.6,
          col: sk.col,
          double: true,
          dur: 0.45,
        });
      else if (key === 'rend') {
        R.fx({ type: 'slash', x: tg.x, y: tg.y - 6, rot: 1.2, col: sk.col, dur: 0.3 });
        this.burst(tg.x, tg.y - 6, 10, '#c8302a', 80, 0.6, 2, 220);
      }
      this.dmgEnemy(tg, Math.round(base * mult), critCls);
      if (key === 'rend') this.bleedT = 8 + this.tal.rendDur;
    }
    if (crit && this.tal.critBleed && tg && tg.alive)
      this.bleedT = Math.max(this.bleedT, this.tal.critBleed);
    this.swing = 0.15;
    if (key !== 'warcry' && key !== 'mark') this.atkAnimT = ATK_ANIM;
    if (perfect) {
      this.perf++;
      this.banner('PERFECT!');
      this.hear('perfect');
      R.fx({
        type: 'ring',
        x: this.x,
        y: this.y - 8,
        r0: 12,
        r1: 44,
        col: '#f2c14e',
        lw: 4,
        dur: 0.4,
      });
    }
    this.last = key;
    this.t = 0;
    this.nudge(btn, key);
    this.events.emit('loadout', {});
    return true;
  }

  /**
   * Loose an arrow at a creature: it flies from the bow to where the creature stands, and
   * `hit` happens when it lands, if the creature is still alive (or always, for a volley's
   * area), with the sound `land` if it has one (a spell's arrow). The archer holds still for
   * the draw, and shooting ends Camouflage.
   */
  private loose(
    tg: Enemy,
    hit: (e: Enemy) => void,
    col = '#e8dcc0',
    always = false,
    land?: SoundId
  ): void {
    const R = this.region;
    const t = Math.max(0.08, this.dist(this, tg) / ARROW_SPEED);
    this.face = faceToward(this.x, this.y, tg.x, tg.y, this.face);
    R.fx({
      type: 'arrow',
      x0: this.x + this.face * 6,
      y0: this.y - 10,
      x1: tg.x,
      y1: tg.y - 6,
      col,
      dur: t,
    });
    R.after(t, () => {
      if (this.regionId !== R.id) return;
      if (!always && !(tg.alive && R.enemies.includes(tg))) return;
      if (land) R.sound(land, tg.x, tg.y);
      hit(tg);
    });
    this.aimT = AIM_HOLD;
    this.atkAnimT = ATK_ANIM;
    this.hiddenT = 0;
  }

  // ---------- damage ----------
  /** This hero hits a creature: the region settles what happens to it; the hero's talents and rewards apply. */
  dmgEnemy(e: Enemy, v: number, cls: FloaterClass): void {
    if (!e.alive) return;
    // weapons add to every direct hit (not to bleeding)
    if (cls !== 'dot') v += this.gear.atk;
    if (e.sunderT > 0) v = Math.round(v * 1.2);
    if (cls !== 'dot' && this.tal.lifeOnHit && !this.dead)
      this.hp = Math.min(this.hpMax, this.hp + this.tal.lifeOnHit);
    if (!this.region.hurtEnemy(e, v, cls, this)) return;
    // the kill: gold, XP and the talents that feed on kills
    this.kills++;
    this.gold += e.def.gold;
    this.banner('+' + e.def.gold + ' GOLD');
    if (e.def.gold) this.hear('coins');
    this.log(e.n + ' defeated.', 'c');
    if (this.target === e) {
      this.target = null;
      this.seqI = 0;
    }
    this.gainXp(e.def.xp, e.x, e.y);
    if (this.tal.killMana) this.mp = Math.min(this.mpMax, this.mp + this.tal.killMana);
    if (this.tal.killHeal && this.hp < this.hpMax) {
      const h = Math.min(this.tal.killHeal, this.hpMax - this.hp);
      this.hp += h;
      this.floater(this.x, this.y - 20, '+' + h, 'heal');
    }
    if (this.tal.rampage)
      this.buffT = Math.min(this.buffT + this.tal.rampage, 15 + this.tal.warcryDur);
    // Pack Hunter: the Mark jumps to the nearest enemy, with the time it had left
    if (this.tal.markJump && e.markBy === this.id && e.markT > 0) {
      let next: Enemy | null = null;
      let nd = 300;
      for (const o of this.region.enemies) {
        const d = Math.hypot(o.x - e.x, o.y - e.y);
        if (o !== e && o.alive && d < nd) {
          nd = d;
          next = o;
        }
      }
      if (next) {
        Object.assign(next, { markT: e.markT, markBy: this.id, markK: e.markK });
        this.floater(next.x, next.y - 14 * next.def.scale - 12, 'MARKED', 'name', '#f2c14e');
      }
      e.markT = 0;
    }
  }

  /** A creature (or a toll, a fireball) hits this hero. */
  hurt(v: number, src: string): void {
    if (this.dead) return;
    if (this.cheats.god) {
      this.floater(this.x, this.y - 20, 'IMMUNE', 'heal');
      return;
    }
    if (this.invT > 0) {
      this.floater(this.x, this.y - 20, 'DODGED', 'heal');
      this.log('You dodged ' + src + '.', 't');
      return;
    }
    if (this.tal.evade && this.game.rng.next() < this.tal.evade) {
      this.floater(this.x, this.y - 20, 'SIDESTEP', 'heal');
      return;
    }
    if (this.mountT > 0) {
      this.mountT = 0;
      this.log('Mounting interrupted.', 'h');
    }
    if (this.mounted) this.dismount('Knocked off your mount.');
    // armor: each point takes off a little, and a hit always does at least 1
    if (this.lastStandT > 0) v *= 0.7;
    v = Math.max(1, Math.round((v * 100) / (100 + this.armor * 6)));
    // Last Warden: once a minute, a killing blow leaves you standing
    if (this.hp - v <= 0 && this.tal.lastWarden && this.lastWardenCd <= 0) {
      v = Math.max(0, Math.floor(this.hp) - 1);
      this.invT = 2;
      this.lastWardenCd = 60;
      this.banner('LAST WARDEN!', 'cool');
      this.log('You refuse to fall.', 't');
      this.region.fx({ type: 'shield', x: this.x, y: this.y, col: '#f2c14e', dur: 0.6 });
    }
    this.hp = Math.max(0, this.hp - v);
    this.flash = 0.08;
    this.shake = 0.15;
    this.floater(this.x, this.y - 20, '-' + v, 'hurt');
    this.sound('heroHurt');
    this.region.fx({ type: 'hit', x: this.x, y: this.y - 10, col: '#e0504b', dur: 0.2 });
    this.burst(this.x, this.y - 8, 6, '#e0504b', 80, 0.4, 2, 120);
    if (this.hp <= 0) {
      this.dead = 2.2;
      this.stopMoving();
      this.events.emit('died', {});
      this.hear('died');
      this.log('You died. Respawning…', 'h');
    }
  }

  // ---------- mount / jump ----------
  mountToggle(): void {
    if (this.dead) return;
    if (this.mounted) {
      this.dismount('You dismount.');
      return;
    }
    if (this.mountT > 0) {
      this.mountT = 0;
      this.log('Mount cancelled.');
      return;
    }
    this.mountT = Math.max(0.1, 1 - this.tal.mountTime);
    this.sound('mount');
    this.log('Mounting…');
  }
  private dismount(msg: string): void {
    if (!this.mounted) return;
    this.mounted = false;
    this.burst(this.x, this.y + 4, 8, '#b8956a', 60, 0.5, 3, -20);
    this.sound('dismount');
    if (msg) this.log(msg);
  }
  private finishMount(): void {
    this.mounted = true;
    this.mountT = 0;
    this.burst(this.x, this.y + 4, 10, '#b8956a', 70, 0.5, 3, -20);
    this.sound('mounted');
    this.floater(this.x, this.y - 36, 'MOUNTED', 'name', '#a78bfa');
    this.log('Mounted. Speed ×1.8. Attacking dismounts you.', 't');
  }

  /** Attack animation progress 0..1, or -1 when not attacking. */
  get attackP(): number {
    return this.atkAnimT > 0 ? 1 - this.atkAnimT / ATK_ANIM : -1;
  }

  get airborne(): boolean {
    return this.jumpT >= 0;
  }

  private get jumpDur(): number {
    return this.jumpFlip ? FLIP_DUR : JUMP_DUR;
  }

  /** Jump progress 0..1, or 0 on the ground. */
  get jumpP(): number {
    return this.jumpT >= 0 ? Math.min(1, this.jumpT / this.jumpDur) : 0;
  }

  /** Height above the ground in pixels (parabolic). */
  get jumpZ(): number {
    const p = this.jumpP;
    return (this.jumpFlip ? FLIP_HEIGHT : JUMP_HEIGHT) * 4 * p * (1 - p);
  }

  jump(): void {
    if (this.inScene) return;
    if (this.dead || this.airborne) return;
    if (this.mountT > 0) {
      this.mountT = 0;
      this.log('Mount cancelled.');
    }
    // one jump in five is a flip (never on horseback)
    this.jumpFlip = !this.mounted && Math.random() < FLIP_CHANCE;
    this.jumpT = 0;
    this.burst(this.x, this.y + 4, 4, '#b8956a', 40, 0.35, 2, -10);
  }

  // ---------- dev helpers ----------
  /** Screen pixels per second, including mount and the dev speed multiplier. */
  get playerSpeed(): number {
    const ride = this.mounted ? 215 : 118;
    return ride * this.cheats.moveSpeed * (1 + this.gear.speed) * (1 + this.tal.moveSpeed);
  }

  healFull(): void {
    if (this.dead) return;
    this.hp = this.hpMax;
    this.mp = this.mpMax;
    this.floater(this.x, this.y - 20, 'FULL', 'heal');
  }

  teleportToStart(): void {
    this.stopMoving();
    this.placeAt(this.region.def.spots.start);
  }

  /** The boss you are fighting (or about to), for the big health bar. */
  get activeBoss(): Enemy | null {
    for (const e of this.region.enemies)
      if (e.def.boss && e.alive && (e.aggro || this.dist(this, e) < 220)) return e;
    return null;
  }

  // ---------- regions ----------
  /** Stand on a tile. */
  placeAt([c, r]: [number, number]): void {
    this.x = c * T + T / 2;
    this.y = r * T + T / 2;
    this.tp++;
  }

  /** Arrived in a region (Game.moveHero): clear what belonged to the old one. */
  arrived(): void {
    this.stopMoving();
    this.target = null;
    this.chopTree = null;
    this.mineRock = null;
    this.making = null;
    this.talkTarget = null;
    this.useTarget = null;
    this.exiting = null;
    this.exitArmed = false;
  }

  /** Walking into an exit: ask to travel (or say why it is closed). */
  private updateExits(dt: number): void {
    this.lockedSaidT = Math.max(0, this.lockedSaidT - dt);
    if (this.exiting || this.dead) return;
    const c = Math.floor(this.x / T);
    const r = Math.floor(this.y / T);
    const ex = this.region.def.exits.find(
      e => c >= e.area[0] && c <= e.area[2] && r >= e.area[1] && r <= e.area[3]
    );
    if (!ex) {
      this.exitArmed = true;
      return;
    }
    if (!this.exitArmed) return;
    if (!this.game.check(ex.when, this)) {
      if (this.lockedSaidT <= 0) this.log(ex.locked ?? 'The way is closed.', 'h');
      this.lockedSaidT = 3;
      return;
    }
    this.exiting = { to: ex.to, at: ex.at };
    this.stopMoving();
    this.events.emit('exit', { to: ex.to, at: ex.at });
  }

  // ---------- objects you can use ----------
  /** Walk over to an object and use it. */
  useObject(id: string): void {
    if (this.dead || this.inScene) return;
    const o = this.region.objects.find(x => x.id === id);
    if (!o) return;
    this.chopTree = null;
    this.mineRock = null;
    const d = Math.hypot(o.x - this.x, o.y - this.y);
    if (d > TALK_REACH) {
      const k = (TALK_REACH - 10) / Math.max(1, d);
      if (!this.moveTo(o.x + (this.x - o.x) * k, o.y + (this.y - o.y) * k)) return;
    }
    this.useTarget = id;
  }

  private updateUse(): void {
    const id = this.useTarget;
    if (!id || this.path) return;
    this.useTarget = null;
    const o = this.region.objects.find(x => x.id === id);
    if (!o || Math.hypot(o.x - this.x, o.y - this.y) > TALK_REACH + 4) return;
    this.face = faceToward(this.x, this.y, o.x, o.y, this.face);
    if (this.driven === 'replica') this.net?.('useObject', [id]);
    else this.region.use(o, this);
  }

  // ---------- items ----------
  /** Put items in the bag, filling existing stacks first. Returns how many did not fit. */
  addItem(id: ItemId, n: number): number {
    const max = ITEMS[id].stack;
    let left = n;
    for (const s of this.bag) {
      if (!left) break;
      if (s && s.id === id && s.n < max) {
        const k = Math.min(left, max - s.n);
        s.n += k;
        left -= k;
      }
    }
    for (let i = 0; i < this.bag.length && left; i++) {
      if (this.bag[i]) continue;
      const k = Math.min(left, max);
      this.bag[i] = { id, n: k };
      left -= k;
    }
    if (left !== n) this.events.emit('bag', {});
    return left;
  }

  /** Give an item, or drop it at your feet if the bag is full. */
  give(id: ItemId, n = 1): void {
    const left = this.addItem(id, n);
    for (let k = 0; k < left; k++) this.region.spawnDrop(this.x, this.y, id, this.id);
  }

  /** How many of an item the bag holds. */
  count(id: ItemId): number {
    return this.bag.reduce((n, s) => n + (s && s.id === id ? s.n : 0), 0);
  }

  /** Use the item in a bag slot: food is eaten (heals), materials just say what they are for. */
  useSlot(i: number): void {
    const s = this.bag[i];
    if (!s || this.dead) return;
    const def = ITEMS[s.id];
    if (def.slot) {
      this.equipFromBag(i);
      return;
    }
    if (!def.heal) {
      this.log(`${def.name}: ${def.desc}`);
      return;
    }
    if (this.eatCd > 0) return;
    if (this.hp >= this.hpMax) {
      this.log("You're not hungry.", 'h');
      return;
    }
    const h = Math.min(Math.round(def.heal * (1 + this.tal.food)), this.hpMax - this.hp);
    this.hp += h;
    this.eatCd = 0.8;
    s.n--;
    if (s.n <= 0) this.bag[i] = null;
    this.floater(this.x, this.y - 20, '+' + h, 'heal');
    this.burst(this.x, this.y - 14, 6, '#f49088', 40, 0.5, 2, -30);
    this.log(`You eat the ${def.name.toLowerCase()}. +${h} health.`, 't');
    this.hear('eat');
    this.events.emit('bag', {});
  }

  /** Take n of an item out of the bag (the last stacks first). */
  removeItem(id: ItemId, n: number): void {
    for (let i = this.bag.length - 1; i >= 0 && n > 0; i--) {
      const s = this.bag[i];
      if (!s || s.id !== id) continue;
      const k = Math.min(n, s.n);
      s.n -= k;
      n -= k;
      if (s.n <= 0) this.bag[i] = null;
    }
    this.events.emit('bag', {});
  }

  // ---------- trade ----------
  /** What a trader pays for one: a third of its price, at least 1 (0: nobody buys it). */
  sellValue(id: ItemId): number {
    const p = ITEMS[id].price;
    return p ? Math.max(1, Math.floor(p / 3)) : 0;
  }

  /** Buy one of an item from a trader you are standing next to. */
  buy(npc: NpcId, id: ItemId): boolean {
    const shop = NPCS[npc].shop;
    const price = ITEMS[id].price ?? 0;
    if (!shop?.sells.includes(id) || !this.nearNpc(npc) || this.dead) return false;
    if (!canWield(id, this.cls)) {
      this.log(`That's for ${ITEMS[id].cls === 'archer' ? 'archers' : 'warriors'}.`, 'h');
      return false;
    }
    if (this.gold < price) {
      this.log("You can't afford that.", 'h');
      this.hear('error');
      return false;
    }
    if (this.addItem(id, 1) > 0) {
      this.log('Your bag is full.', 'h');
      return false;
    }
    this.gold -= price;
    this.log(`You buy the ${ITEMS[id].name.toLowerCase()} for ${price} gold.`, 'c');
    this.hear('coins');
    this.events.emit('bag', {});
    this.events.emit('trade', {});
    return true;
  }

  /** Sell what is in a bag slot (one, or the whole stack) to a trader you are standing next to. */
  sell(npc: NpcId, slot: number, all = false): boolean {
    const s = this.bag[slot];
    if (!s || !NPCS[npc].shop || !this.nearNpc(npc) || this.dead) return false;
    const v = this.sellValue(s.id);
    if (!v) {
      this.log(`Nobody would buy the ${ITEMS[s.id].name.toLowerCase()}. Better keep it.`, 'h');
      return false;
    }
    const n = all ? s.n : 1;
    const name = ITEMS[s.id].name.toLowerCase();
    s.n -= n;
    if (s.n <= 0) this.bag[slot] = null;
    this.gold += v * n;
    this.log(`You sell ${n > 1 ? n + ' × ' : 'the '}${name} for ${v * n} gold.`, 'c');
    this.hear('coins');
    this.events.emit('bag', {});
    this.events.emit('trade', {});
    return true;
  }

  // ---------- crafting ----------
  /** The closest campfire or forge within reach, if any. */
  nearStation(kind: StructureKind): Structure | null {
    let best: Structure | null = null;
    let bd = STATION_REACH;
    for (const s of this.region.structures) {
      if (s.kind !== kind) continue;
      const d = Math.hypot(s.x - this.x, s.y - this.y);
      if (d <= bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  /** Why a recipe can't be made right now, or null if it can. */
  craftProblem(r: Recipe): string | null {
    if (this.dead) return 'You are dead.';
    if (r.station !== 'hand' && !this.nearStation(r.station))
      return `Stand at a ${STATION_NAMES[r.station].toLowerCase()}.`;
    for (const [id, n] of r.needs) {
      const have = this.count(id);
      if (have < n) return `Needs ${n - have} more ${ITEMS[id].name.toLowerCase()}.`;
    }
    if ('build' in r.makes && !this.buildSpot(r.makes.build)) return 'No room to build here.';
    return null;
  }

  /** Start making a recipe (`n` of them, one after another): `time` seconds each, standing where you are. */
  craft(id: string, n = 1): boolean {
    const r = RECIPES.find(x => x.id === id);
    if (!r) return false;
    const why = this.craftProblem(r);
    if (why) {
      this.log(why, 'h');
      this.hear('error');
      return false;
    }
    this.stopMoving();
    this.chopTree = null;
    this.mineRock = null;
    this.making = { r, t: r.time, more: Math.max(0, Math.min(49, n - 1)), x: this.x, y: this.y };
    this.updateWork();
    return true;
  }

  /** Put down what you were making (nothing is used up). */
  stopCraft(): void {
    this.making = null;
    this.updateWork();
  }

  /** Keep working: stepping away, mounting or running short stops you; each one done starts the next. */
  private updateCraft(dt: number): void {
    const m = this.making;
    if (!m) return;
    const why =
      this.mounted || Math.hypot(this.x - m.x, this.y - m.y) > 12
        ? 'You stop working.'
        : this.craftProblem(m.r);
    if (why) {
      this.making = null;
      this.log(why, 'h');
      return;
    }
    m.t -= dt;
    if (m.t > 0) return;
    this.finishCraft(m.r);
    if (m.more > 0 && this.craftProblem(m.r) === null) {
      m.more--;
      m.t = m.r.time;
    } else this.making = null;
  }

  /** Done: use up the ingredients and hand over the item (or build the structure). */
  private finishCraft(r: Recipe): void {
    for (const [item, n] of r.needs) this.removeItem(item, n);
    this.atkAnimT = ATK_ANIM;
    if ('build' in r.makes) {
      const spot = this.buildSpot(r.makes.build);
      if (spot) this.build(r.makes.build, spot.c, spot.r);
      return;
    }
    const { item, n = 1 } = r.makes;
    this.give(item, n);
    const at = r.station === 'hand' ? this : (this.nearStation(r.station) ?? this);
    this.face = faceToward(this.x, this.y, at.x, at.y, this.face);
    this.burst(at.x, at.y - 10, 8, r.station === 'hand' ? '#f2c14e' : '#ffa040', 60, 0.5, 2, -40);
    const name = ITEMS[item].name;
    this.floater(this.x, this.y - 28, `+${n} ${name}`, 'name', ITEMS[item].col);
    const a = /^[aeiou]/i.test(name) ? 'an' : 'a';
    const what =
      ITEMS[item].heal
        ? `You cook the ${ITEMS[r.needs[0][0]].name.toLowerCase()}.`
        : `You ${item.endsWith('_bar') ? 'smelt' : r.station === 'forge' ? 'forge' : 'make'} ${a} ${name.toLowerCase()}.`;
    this.log(what, 'c');
    // food sizzles on the fire, ore melts down, the forge rings, the rest (bows) is woodwork
    this.hear(
      ITEMS[item].heal
        ? 'cook'
        : item.endsWith('_bar')
          ? 'smelt'
          : r.station === 'forge'
            ? 'smith'
            : 'woodwork'
    );
    this.game.questEvent('craft', r.id);
    this.gainXp(XP_FOR.craft);
  }

  /** A free tile next to the hero to build on, preferring the side they face. */
  private buildSpot(kind: StructureKind): { c: number; r: number } | null {
    const pc = Math.floor(this.x / T);
    const pr = Math.floor(this.y / T);
    // screen-right is world (+1, -1)
    const fx = this.face;
    const fy = -this.face;
    let best: { c: number; r: number } | null = null;
    let bs = -Infinity;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dc && !dr) continue;
        const c = pc + dc;
        const r = pr + dr;
        if (!this.canBuildOn(c, r, kind)) continue;
        const score = dc * fx + dr * fy;
        if (score > bs) {
          bs = score;
          best = { c, r };
        }
      }
    return best;
  }

  private canBuildOn(c: number, r: number, kind: StructureKind): boolean {
    const t = this.map.tile(c, r);
    if (t !== Tile.Grass && t !== Tile.Dirt && t !== Tile.Flower && t !== Tile.Floor) return false;
    // not on top of another structure, a person or a rock
    if (this.region.structures.some(s => s.c === c && s.r === r) || this.map.tileObstructed(c, r))
      return false;
    // a solid forge must not land on top of anyone
    if (STRUCTURES[kind].solid) {
      for (const h of this.region.heroes()) {
        const dx = Math.max(0, Math.abs(c * T + T / 2 - h.x) - 9);
        const dy = Math.max(0, Math.abs(r * T + T / 2 - h.y) - 8);
        if (dx * dx + dy * dy < 14 * 14) return false;
      }
    }
    return true;
  }

  private build(kind: StructureKind, c: number, r: number): void {
    const s = this.region.build(kind, c, r);
    this.face = faceToward(this.x, this.y, s.x, s.y, this.face);
    this.log(
      kind === 'campfire'
        ? 'You build a campfire. Cook raw food at it.'
        : 'You build a forge. Smelt ore and smith gear at it.',
      'c'
    );
    this.hear('build');
    this.events.emit('bag', {});
    this.game.questEvent('build', kind);
    this.gainXp(XP_FOR.build, s.x, s.y);
  }

  // ---------- levels and talents ----------
  /** Experience; enough of it raises your level (a talent point, more health, a full heal). */
  gainXp(n: number, x = this.x, y = this.y): void {
    if (n <= 0 || this.level >= MAX_LEVEL) return;
    const before = this.level;
    this.xp += n;
    this.floater(x + 10, y - 30, `+${n} XP`, 'name', '#c8a8ff');
    let up = false;
    while (this.level < MAX_LEVEL && this.xp >= xpToNext(this.level)) {
      this.xp -= xpToNext(this.level);
      this.level++;
      up = true;
    }
    if (this.level >= MAX_LEVEL) this.xp = 0;
    if (!up) return;
    for (const k of SPELL_ORDER) {
      const s = SPELLS[k];
      if (!s.level || s.level <= before || s.level > this.level || !this.knows(k)) continue;
      const slot = this.placeSpell(k);
      const name = isSkill(k) ? SKILLS[k].n : ACTIONS[k].n;
      this.log(
        `New spell: ${name}${slot >= 0 ? ` (on your bar, key ${BAR_KEYS[slot].bind})` : ''}. See your spellbook (P).`,
        't'
      );
    }
    this.applyGear();
    this.hp = this.hpMax;
    this.mp = this.mpMax;
    this.banner(`LEVEL ${this.level}!`, 'cool');
    this.hear('levelUp');
    this.log(`You reach level ${this.level}. You have a talent point to spend (N).`, 'c');
    this.region.fx({
      type: 'ring',
      x: this.x,
      y: this.y - 8,
      r0: 10,
      r1: 60,
      col: '#c8a8ff',
      lw: 4,
      dur: 0.7,
    });
    this.burst(this.x, this.y - 14, 22, '#c8a8ff', 90, 1, 3, -80);
    this.events.emit('level', {});
  }

  /** Points spent, in one tree or in all. */
  talentsSpent(tree?: TreeId): number {
    let n = 0;
    for (const [id, r] of Object.entries(this.talents))
      if (!tree || TALENTS[id].tree === tree) n += r;
    return n;
  }

  /** Points still to spend (one per level above 1). */
  get talentPoints(): number {
    return this.level - 1 - this.talentsSpent();
  }

  /** Why a talent can't take another rank now, or null if it can. */
  talentProblem(id: string): string | null {
    const t = TALENTS[id];
    if (TREES[t.tree].cls !== this.cls) return `${TREES[t.tree].name} is another class's tree.`;
    if ((this.talents[id] ?? 0) >= t.ranks) return 'Fully learned.';
    const need = t.tier * TIER_POINTS;
    if (this.talentsSpent(t.tree) < need)
      return `Requires ${need} points in ${TREES[t.tree].name}.`;
    if (t.requires && (this.talents[t.requires] ?? 0) < TALENTS[t.requires].ranks) {
      const req = TALENTS[t.requires];
      return `Requires ${req.ranks}/${req.ranks} in ${req.name}.`;
    }
    // no sharpening a spell you haven't learned yet
    if (t.spell && !this.knows(t.spell)) {
      const k = t.spell;
      const name = isSkill(k) ? SKILLS[k].n : ACTIONS[k].n;
      return SPELLS[k].level ? `Requires ${name}, learned at level ${SPELLS[k].level}.` : `Requires ${name}.`;
    }
    if (this.talentPoints <= 0) return 'No talent points left. Gain a level to earn one.';
    return null;
  }

  learnTalent(id: string): boolean {
    if (this.talentProblem(id)) return false;
    this.talents[id] = (this.talents[id] ?? 0) + 1;
    this.applyTalents();
    this.hear('talent');
    const t = TALENTS[id];
    if (t.grants) {
      const slot = this.placeSpell(t.grants);
      this.log(
        `New ability: ${ACTIONS[t.grants].n}${slot >= 0 ? ` (on your bar, key ${BAR_KEYS[slot].bind})` : ''}.`,
        'c'
      );
    } else this.log(`Talent: ${t.name} (${this.talents[id]}/${t.ranks}).`, 'c');
    return true;
  }

  /** Give every point back (free, for now). */
  resetTalents(): void {
    if (!this.talentsSpent()) return;
    this.talents = {};
    this.applyTalents();
    // abilities taught by talents leave the bar with them
    this.bar = this.bar.map(k => (k && !this.knows(k) ? null : k));
    this.events.emit('loadout', {});
    this.log('Talents reset. Every point is back to spend.', 't');
  }

  /** Sum the learned ranks into `tal`, then refresh what depends on it (health). */
  applyTalents(): void {
    const fx = { ...NO_FX };
    for (const [id, r] of Object.entries(this.talents)) {
      for (const [k, v] of Object.entries(TALENTS[id].fx) as [keyof TalentFx, number][])
        fx[k] += v * r;
    }
    this.tal = fx;
    this.applyGear();
    this.events.emit('talents', {});
  }

  // ---------- people ----------
  /** Walk up to an NPC and talk (the game opens the dialog on the 'talk' event). */
  talkTo(id: NpcId): void {
    if (this.dead) return;
    const n = this.region.npcs.find(x => x.id === id);
    if (!n) return;
    this.chopTree = null;
    this.mineRock = null;
    const d = Math.hypot(n.x - this.x, n.y - this.y);
    if (d > TALK_REACH) {
      const k = (TALK_REACH - 10) / Math.max(1, d);
      if (!this.moveTo(n.x + (this.x - n.x) * k, n.y + (this.y - n.y) * k)) return;
    }
    this.talkTarget = id;
  }

  /** Close enough to keep a conversation going. */
  nearNpc(id: NpcId): boolean {
    const n = this.region.npcs.find(x => x.id === id);
    return !!n && !this.dead && Math.hypot(n.x - this.x, n.y - this.y) <= TALK_REACH + 24;
  }

  private updateTalk(): void {
    const id = this.talkTarget;
    if (!id || this.path) return;
    this.talkTarget = null;
    const n = this.region.npcs.find(x => x.id === id);
    if (!n || Math.hypot(n.x - this.x, n.y - this.y) > TALK_REACH + 4) return;
    this.face = faceToward(this.x, this.y, n.x, n.y, this.face);
    if (this.driven === 'replica') this.net?.('talkTo', [id]);
    else this.events.emit('talk', { npc: id });
  }

  /** You spoke to someone: their first-meeting effects, and any quest that wanted it. */
  talked(id: NpcId): boolean {
    const first = !this.met.has(id);
    if (first) {
      this.met.add(id);
      this.game.applyEffect(NPCS[id].onMeet, this);
    }
    this.game.questEvent('talk', id);
    return first;
  }

  /** You heard someone out on one of their topics: it counts as asked, and its effect plays. */
  asked(id: NpcId, i: number): void {
    const t = NPCS[id].topics?.[i];
    const flag = `asked:${id}:${i}`;
    if (!t || !this.game.check(t.when, this) || (t.once && this.game.flags[flag])) return;
    this.game.setFlag(flag);
    this.game.applyEffect(t.then, this);
  }

  /** Reach goals: being close enough to the place counts. */
  private updateQuestPlaces(): void {
    this.game.questPlaces(this);
  }

  // ---------- equipment ----------
  /** Wear the gear in a bag slot; whatever was in that equipment slot goes back to the bag. */
  equipFromBag(i: number): void {
    const s = this.bag[i];
    if (!s || this.dead) return;
    const slot = ITEMS[s.id].slot;
    if (!slot) return;
    if (!canWield(s.id, this.cls)) {
      this.log(
        `Only ${ITEMS[s.id].cls === 'archer' ? 'an archer' : 'a warrior'} can use the ${ITEMS[s.id].name.toLowerCase()}.`,
        'h'
      );
      return;
    }
    const old = this.equip[slot];
    this.equip[slot] = s.id;
    s.n--;
    this.bag[i] = s.n > 0 ? s : null;
    if (old) {
      if (!this.bag[i]) this.bag[i] = { id: old, n: 1 };
      else this.give(old);
    }
    this.applyGear();
    this.log(`You equip the ${ITEMS[s.id].name.toLowerCase()}.`);
    this.hear('equip');
    this.events.emit('bag', {});
  }

  /** Take off the gear in an equipment slot and put it in the bag (if there is room). */
  unequip(slot: Slot): void {
    const id = this.equip[slot];
    if (!id || this.dead) return;
    if (this.addItem(id, 1)) {
      this.log('Your bag is full.', 'h');
      return;
    }
    this.equip[slot] = null;
    this.applyGear();
    this.log(`You take off the ${ITEMS[id].name.toLowerCase()}.`);
    this.hear('equip');
    this.events.emit('bag', {});
  }

  /** Recompute gear totals; max health follows (current health keeps its share). */
  applyGear(): void {
    const g: Stats = { ...NO_STATS };
    for (const slot of SLOTS) {
      const id = this.equip[slot];
      const st = id ? ITEMS[id].stats : undefined;
      if (!st) continue;
      for (const k of Object.keys(g) as (keyof Stats)[]) g[k] += st[k] ?? 0;
    }
    this.gear = g;
    const max = CLASSES[this.cls].hp + HP_PER_LEVEL * (this.level - 1) + g.hp + this.tal.hp;
    if (this.hpMax !== max) {
      this.hp = Math.min(max, Math.round((this.hp * max) / Math.max(1, this.hpMax)));
      this.hpMax = max;
    }
  }

  /** Dev: a random item pops out a few steps away (walk over it to pick it up). */
  dropRandomLoot(): void {
    if (this.dead) return;
    const rng = this.game.rng;
    const ids = Object.keys(ITEMS) as ItemId[];
    const id = ids[Math.floor(rng.next() * ids.length)];
    // somewhere open around the hero, so it lands where it can be reached (else at their feet)
    let x = this.x;
    let y = this.y;
    for (let tries = 0; tries < 8; tries++) {
      const a = rng.next() * Math.PI * 2;
      const tx = this.x + Math.cos(a) * 34;
      const ty = this.y + Math.sin(a) * 34;
      if (!this.map.blocked(tx, ty, 3, 3)) {
        x = tx;
        y = ty;
        break;
      }
    }
    this.region.spawnDrop(x, y, id, this.id);
    this.log(`Dev: dropped ${ITEMS[id].name.toLowerCase()}.`);
  }

  // ---------- woodcutting ----------
  /** Chop a tree: walk next to it first if needed, then swing until it falls. */
  startChop(tree: TreeState): void {
    if (this.dead) return;
    if (tree.stumpT > 0) {
      this.log('Just a stump. It will grow back.', 'h');
      return;
    }
    if (this.mounted) this.dismount('You dismount to chop.');
    this.mineRock = null;
    this.making = null;
    const d = Math.hypot(tree.x - this.x, tree.y - this.y);
    if (d > CHOP.reach) {
      // stand on the near side of the trunk
      const k = (CHOP.reach - 10) / Math.max(1, d);
      if (!this.moveTo(tree.x + (this.x - tree.x) * k, tree.y + (this.y - tree.y) * k)) return;
    }
    this.chopTree = tree;
    this.windUp();
  }

  /** A moment to get the first swing in; clicking again never cuts a swing short. */
  private windUp(): void {
    if (this.gatherT < 0.2) this.gatherT = this.gatherLen = 0.2;
  }

  /** B: use the nearest object, else chop the closest standing tree or mine the closest rock within reach. */
  gatherNearest(): void {
    // something to use within reach comes first (a page, a notice board)
    let near: ObjectState | null = null;
    let od = TALK_REACH + 12;
    for (const o of this.region.objects) {
      const d = Math.hypot(o.x - this.x, o.y - this.y);
      if (d < od) {
        od = d;
        near = o;
      }
    }
    if (near) return this.useObject(near.id);
    let tree: TreeState | null = null;
    let rock: RockState | null = null;
    let bd = CHOP.reach + 8;
    for (const t of this.region.trees) {
      const d = Math.hypot(t.x - this.x, t.y - this.y);
      if (t.stumpT === 0 && d < bd) {
        bd = d;
        tree = t;
      }
    }
    for (const k of this.region.rocks) {
      const d = Math.hypot(k.x - this.x, k.y - this.y);
      if (k.brokenT === 0 && d < Math.min(bd, MINE.reach + 8)) {
        bd = d;
        rock = k;
        tree = null;
      }
    }
    if (rock) this.startMine(rock);
    else if (tree) this.startChop(tree);
    else this.log('Nothing to gather within reach. Walk up to a tree or rock, or click it.', 'h');
  }

  private updateChop(): void {
    const tr = this.chopTree;
    if (!tr) return;
    if (this.dead || tr.stumpT > 0 || this.mounted) {
      this.chopTree = null;
      return;
    }
    if (this.path) return; // still walking over
    if (Math.hypot(tr.x - this.x, tr.y - this.y) > CHOP.reach + 8) {
      this.chopTree = null;
      return;
    }
    if (this.driven === 'replica') {
      // arrived: the server does the chopping
      this.net?.('chop', [tr.c, tr.r]);
      this.chopTree = null;
      return;
    }
    if (this.gatherT > 0) return;
    // an axe speeds chopping up; bare-handed (or with a sword) every chop takes twice as long
    this.gatherT = this.gatherLen =
      (this.gear.chop > 0 ? CHOP.period / (1 + this.gear.chop) : CHOP.period * CHOP.noTool) /
      (1 + this.tal.gather);
    this.face = faceToward(this.x, this.y, tr.x, tr.y, this.face);
    this.atkAnimT = ATK_ANIM;
    tr.hp--;
    tr.shakeT = 0.25;
    this.sound('chop', tr.x, tr.y);
    this.burst(tr.x, tr.y - 10, 6, '#c8a070', 70, 0.45, 2, 160);
    if (tr.hp > 0) return;
    // timber: the tree becomes a stump and drops its logs
    this.sound('treeFall', tr.x, tr.y);
    const rng = this.game.rng;
    tr.stumpT = CHOP.regrow;
    tr.hp = CHOP.hits;
    this.chopTree = null;
    this.shake = 0.12;
    this.burst(tr.x, tr.y - 24, 16, '#62ae3e', 90, 0.7, 3, 120);
    const [lo, hi] = CHOP.logs;
    const n = lo + Math.floor(rng.next() * (hi - lo + 1));
    for (let k = 0; k < n; k++) this.region.spawnDrop(tr.x, tr.y - 4, 'log', this.id);
    if (rng.next() < this.tal.prospect) this.region.spawnDrop(tr.x, tr.y - 4, 'log', this.id);
    this.gainXp(XP_FOR.tree, tr.x, tr.y - 10);
    this.log('Timber! The tree falls.', 'c');
  }

  // ---------- mining ----------
  /** Mine a rock: walk up to it first if needed, then swing until it breaks. */
  startMine(rock: RockState): void {
    if (this.dead) return;
    if (rock.brokenT > 0) {
      this.log('Just rubble. The rock will be back.', 'h');
      return;
    }
    if (this.mounted) this.dismount('You dismount to mine.');
    const d = Math.hypot(rock.x - this.x, rock.y - this.y);
    if (d > MINE.reach) {
      const k = (MINE.reach - 6) / Math.max(1, d);
      if (!this.moveTo(rock.x + (this.x - rock.x) * k, rock.y + (this.y - rock.y) * k)) return;
    }
    this.chopTree = null;
    this.making = null;
    this.mineRock = rock;
    this.windUp();
  }

  private updateMine(): void {
    const rk = this.mineRock;
    if (!rk) return;
    if (this.dead || rk.brokenT > 0 || this.mounted) {
      this.mineRock = null;
      return;
    }
    if (this.path) return; // still walking over
    if (Math.hypot(rk.x - this.x, rk.y - this.y) > MINE.reach + 8) {
      this.mineRock = null;
      return;
    }
    if (this.driven === 'replica') {
      this.net?.('mine', [rk.c, rk.r]);
      this.mineRock = null;
      return;
    }
    if (this.gatherT > 0) return;
    // a pickaxe speeds mining up; without one every swing takes three times as long
    this.gatherT = this.gatherLen =
      (this.gear.mine > 0 ? MINE.period / (1 + this.gear.mine) : MINE.period * MINE.noTool) /
      (1 + this.tal.gather);
    this.face = faceToward(this.x, this.y, rk.x, rk.y, this.face);
    this.atkAnimT = ATK_ANIM;
    rk.hp--;
    rk.shakeT = 0.2;
    this.sound('mine', rk.x, rk.y);
    this.burst(rk.x, rk.y - 8, 6, '#c4cad4', 80, 0.4, 2, 200);
    if (rk.hp > 0) return;
    // the rock breaks into rubble and gives up its stone (and maybe ore)
    this.sound('rockBreak', rk.x, rk.y);
    const rng = this.game.rng;
    rk.brokenT = MINE.regrow;
    rk.hp = MINE.hits;
    this.map.setRockBroken(rk.c, rk.r, true);
    this.mineRock = null;
    this.shake = 0.14;
    this.burst(rk.x, rk.y - 6, 18, '#a8aeb8', 100, 0.6, 3, 180);
    const [lo, hi] = MINE.stone;
    const n = lo + Math.floor(rng.next() * (hi - lo + 1));
    for (let k = 0; k < n; k++) this.region.spawnDrop(rk.x, rk.y - 4, 'stone', this.id);
    const ore = rng.next() < MINE.ore;
    const gold = rng.next() < MINE.gold;
    if (ore) this.region.spawnDrop(rk.x, rk.y - 4, 'iron_ore', this.id);
    if (rng.next() < this.tal.prospect) this.region.spawnDrop(rk.x, rk.y - 4, 'iron_ore', this.id);
    this.gainXp(XP_FOR.rock, rk.x, rk.y - 6);
    if (gold) this.region.spawnDrop(rk.x, rk.y - 4, 'gold_nugget', this.id);
    this.log(
      gold
        ? 'The rock splits, and something glints inside!'
        : ore
          ? 'The rock breaks, showing a vein of iron.'
          : 'The rock breaks apart.',
      'c'
    );
  }

  /** The progress bar: how much of the tree is down, the rock broken or the thing made (filling smoothly between swings). */
  private updateWork(): void {
    const swing = 1 - this.gatherT / this.gatherLen;
    const m = this.making;
    const tr = this.chopTree;
    const rk = this.mineRock;
    if (m) this.work = { kind: 'make', recipe: m.r.id, p: 1 - m.t / m.r.time };
    else if (tr && !this.path) this.work = { kind: 'chop', p: (CHOP.hits - tr.hp + swing) / CHOP.hits };
    else if (rk && !this.path) this.work = { kind: 'mine', p: (MINE.hits - rk.hp + swing) / MINE.hits };
    else this.work = null;
  }

  // ---------- click to move ----------
  /** Final destination of the current click-to-move, if any. */
  get moveGoal(): Pt | null {
    return this.path && this.path.length ? this.path[this.path.length - 1] : null;
  }

  /**
   * Walk to world point (x,y), routing around water, rocks and walls. `marker` shows the
   * click ring (off while the mouse is held and the goal just follows the cursor).
   */
  moveTo(x: number, y: number, marker = true): boolean {
    if (this.inScene) return false;
    if (this.dead) return false;
    // the server never walks a remote hero: its player's browser does
    if (this.driven === 'remote') return false;
    this.chopTree = null;
    this.mineRock = null;
    this.talkTarget = null;
    const path = findPath(this.map, { x: this.x, y: this.y }, { x, y }, 9, 8);
    if (!path) {
      if (marker) this.log("Can't get there.", 'h');
      return false;
    }
    this.path = path;
    this.stuckT = 0;
    if (marker) {
      const g = path[path.length - 1];
      this.region.fx({
        type: 'ring',
        x: g.x,
        y: g.y,
        r0: 16,
        r1: 4,
        col: '#f2c14e',
        lw: 2,
        dur: 0.35,
      });
    }
    return true;
  }

  stopMoving(): void {
    this.path = null;
    this.stuckT = 0;
  }

  /**
   * Walk the same speed every way across the ground (the 3D views) rather than every way across
   * the 2D screen (isoSpeedFactor). Only how this hero's player sees it: the rules don't change.
   */
  walkFlat = false;

  /** Speed multiplier for a walk along world (dx, dy): see walkFlat. */
  private walkK(dx: number, dy: number): number {
    return this.walkFlat ? 1 / isoSpeedFactor(dx, dy) : 1;
  }

  /** Advance along the path. Returns the direction moved, or null if nothing moved. */
  private followPath(dt: number): { x: number; y: number } | null {
    const path = this.path;
    if (!path) return null;
    const base = this.playerSpeed;
    let budget = dt;
    let dir: { x: number; y: number } | null = null;
    // loop so a short leg doesn't waste the rest of the frame's movement
    while (budget > 0 && path.length) {
      const w = path[0];
      const dx = w.x - this.x;
      const dy = w.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.5) {
        path.shift();
        continue;
      }
      const ux = dx / d;
      const uy = dy / d;
      dir = { x: ux, y: uy };
      const spd = base * this.walkK(ux, uy);
      const step = spd * isoSpeedFactor(ux, uy) * budget;
      if (step >= d && !this.map.blocked(w.x, w.y, 9, 8)) {
        // reach the waypoint exactly, then spend what's left on the next leg
        this.x = w.x;
        this.y = w.y;
        this.face = faceToward(0, 0, ux, uy, this.face);
        this.walk += budget * 10 * (d / step);
        budget *= 1 - d / step;
        path.shift();
        this.stuckT = 0;
        continue;
      }
      const x0 = this.x;
      const y0 = this.y;
      this.region.moveEntity(this, ux, uy, spd, budget, 9, 8);
      // wall sliding can stall us against a corner; give up rather than jitter forever
      const moved = Math.hypot(this.x - x0, this.y - y0);
      this.stuckT = moved < step * 0.25 ? this.stuckT + budget : 0;
      if (this.stuckT > 0.4) {
        this.stopMoving();
        return dir;
      }
      budget = 0;
    }
    if (!path.length) this.stopMoving();
    return dir;
  }

  dodge(): void {
    if (this.dodgeCd > 0 || this.dead) return;
    this.stopMoving();
    const m = this.lastMove ?? { x: this.face, y: -this.face };
    const l = Math.hypot(m.x, m.y) || 1;
    const dx = m.x / l;
    const dy = m.y / l;
    this.dodgeCd = 2;
    this.invT = 0.5;
    const x0 = this.x;
    const y0 = this.y;
    const step = 5 * isoSpeedFactor(dx, dy);
    for (let i = 0; i < 12; i++) {
      const nx = this.x + dx * step;
      const ny = this.y + dy * step;
      if (this.map.blocked(nx, ny, 9, 8)) break;
      this.x = nx;
      this.y = ny;
    }
    this.tp++;
    this.region.fx({ type: 'dash', x0, y0, x1: this.x, y1: this.y, face: this.face, dur: 0.3 });
    this.burst(x0, y0 + 4, 6, '#b8956a', 50, 0.4, 3, -20);
    this.log('You dodge.', 't');
  }

  // ---------- the hero's tick ----------
  /** Walk: keyboard (screen-space, onto the ground plane) wins over click-to-move; and the jump. Returns true if it moved. */
  tickMove(dt: number): boolean {
    let mx = 0;
    let my = 0;
    // an archer drawing a bow holds still (the keys can stay down; the feet don't move)
    const drawing = this.aimT > 0;
    const keyboard =
      !drawing &&
      !this.exiting &&
      !this.inScene &&
      (this.inputMove.x !== 0 || this.inputMove.y !== 0);
    if (keyboard) {
      if (this.path) this.stopMoving();
      this.chopTree = null;
      this.mineRock = null;
      const d = isoDir(this.inputMove.x, this.inputMove.y);
      mx = d.x;
      my = d.y;
      if (!this.dead) this.region.moveEntity(this, mx, my, this.playerSpeed * this.walkK(mx, my), dt, 9, 8);
    } else if (this.path && !this.dead && !drawing) {
      const d = this.followPath(dt);
      if (d) {
        mx = d.x;
        my = d.y;
      }
    }
    if (!this.dead && (mx || my)) {
      this.lastMove = { x: mx, y: my };
      if (this.mounted) {
        this.dustT -= dt;
        if (this.dustT <= 0) {
          this.dustT = 0.12;
          this.burst(this.x - mx * 10, this.y + 6, 2, '#b8956a', 25, 0.45, 3, -15);
        }
      }
    }
    if (this.jumpT >= 0) {
      this.jumpT += dt;
      if (this.jumpT >= this.jumpDur) {
        this.jumpT = -1;
        this.jumpFlip = false;
        this.burst(this.x, this.y + 4, 8, '#b8956a', 60, 0.4, 3, -20);
      }
    }
    return !!(mx || my);
  }

  /** A replica in its player's browser: walk, and arrive where it was going (sending what it meant to do). */
  tickReplica(dt: number): void {
    this.tickMove(dt);
    this.updateChop();
    this.updateTalk();
    this.updateUse();
    this.updateMine();
  }

  /**
   * A remote hero's position from its browser: accepted when it could have walked there
   * since the last one (speed, with some slack, and not through anything solid). Returns
   * false when it had to be refused (the browser is told where the hero really is).
   */
  applyMove(
    x: number,
    y: number,
    face: 1 | -1,
    walk: number,
    jumpT: number,
    jumpFlip: boolean,
    dt: number
  ): boolean {
    if (this.dead || this.inScene || this.exiting) return false;
    const d = Math.hypot(x - this.x, y - this.y);
    const max = this.playerSpeed * 1.6 * Math.max(dt, 0.05) + 24;
    if (d > max || this.map.blocked(x, y, 9, 8)) {
      this.tp++;
      return false;
    }
    if (d > 0.5) {
      this.stillT = 0;
      this.chopTree = d > 2 ? null : this.chopTree;
      this.mineRock = d > 2 ? null : this.mineRock;
    }
    this.x = x;
    this.y = y;
    this.face = face;
    this.walk = walk;
    this.jumpT = jumpT;
    this.jumpFlip = jumpFlip;
    return true;
  }

  /** Advance this hero by dt seconds (the region ticks it, then the world around it). */
  tick(dt: number): void {
    this.t += dt;
    this.mp = Math.min(this.mpMax, this.mp + 3 * dt);
    if (this.tal.regen && !this.dead && this.hp < this.hpMax)
      this.hp = Math.min(this.hpMax, this.hp + this.tal.regen * dt);
    this.lastWardenCd = Math.max(0, this.lastWardenCd - dt);
    this.berserkT = Math.max(0, this.berserkT - dt);
    this.predatorT = Math.max(0, this.predatorT - dt);
    this.hiddenT = Math.max(0, this.hiddenT - dt);
    this.aimT = Math.max(0, this.aimT - dt);
    this.lastStandT = Math.max(0, this.lastStandT - dt);
    for (const k of Object.keys(this.acd) as ActionKey[])
      this.acd[k] = Math.max(0, (this.acd[k] ?? 0) - dt);
    this.buffT = Math.max(0, this.buffT - dt);
    this.invT = Math.max(0, this.invT - dt);
    this.dodgeCd = Math.max(0, this.dodgeCd - dt);
    this.mortalCd = Math.max(0, this.mortalCd - dt);
    this.intCd = Math.max(0, this.intCd - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.shake = Math.max(0, this.shake - dt);
    this.swing = Math.max(0, this.swing - dt);
    this.atkAnimT = Math.max(0, this.atkAnimT - dt);
    this.wandererSaidT = Math.max(0, this.wandererSaidT - dt);
    for (const k of Object.keys(this.cds) as SkillKey[])
      this.cds[k] = Math.max(0, (this.cds[k] ?? 0) - dt);
    if (this.cheats.infiniteMana) this.mp = this.mpMax;
    if (this.cheats.noCooldowns) {
      this.cds = {};
      this.mortalCd = this.intCd = this.dodgeCd = 0;
      this.acd = {};
    }

    if (this.dead) {
      this.dead -= dt;
      if (this.dead <= 0) {
        this.dead = 0;
        this.hp = this.hpMax;
        this.mp = 60;
        this.placeAt(this.region.def.spots.start);
        this.target = null;
        this.stopMoving();
        this.events.emit('respawned', {});
        this.hear('respawn');
        this.log('You respawn on the road.');
      }
    }

    // a remote hero's browser moves it; otherwise it walks here
    const moved = this.driven === 'remote' ? this.stillT < 0.15 : this.tickMove(dt);
    this.stillT += dt;
    if (this.mountT > 0) {
      this.mountT -= dt;
      if (moved) {
        this.mountT = 0;
        this.log('Stand still to mount.', 'h');
      } else if (this.mountT <= 0) this.finishMount();
    }

    // auto attack
    const tg = this.target;
    if (tg && (!tg.alive || !this.region.enemies.includes(tg))) this.target = null;
    if (!this.dead && !this.mounted && !this.inScene && tg && tg.alive) {
      const d = this.dist(this, tg);
      const aa = CLASSES[this.cls].aa;
      const shoots = aa.ranged && this.hasBow;
      if (shoots && d < this.reach(aa.range) && this.planted && this.hiddenT <= 0) {
        this.aaT -= dt;
        if (this.aaT <= 0) {
          this.aaT = aa.period / (1 + this.tal.aaSpeed) / (this.predatorT > 0 ? 1.5 : 1);
          const crit = this.game.rng.next() < this.tal.crit;
          const far = d > 150 ? 1 + this.tal.farShot : 1;
          this.loose(
            tg,
            e => {
              this.dmgEnemy(
                e,
                Math.round(
                  (aa.dmg + this.tal.aaDmg) * this.dmgMult(e) * far * (crit ? this.critMult : 1)
                ),
                crit ? 'crit' : 'aa'
              );
              if (crit && this.tal.critSlow) {
                e.slowT = Math.max(e.slowT, this.tal.critSlow);
                e.slowK = Math.max(e.slowK, 0.5);
              }
            },
            undefined,
            false,
            'hitArrow'
          );
          this.sound('autoShot');
          // a plain auto-shot only holds you still for a moment
          this.aimT = Math.min(this.aimT, 0.2);
        }
      } else if (shoots) this.aaT = Math.min(this.aaT, 0.5);
      else if (d < AA_RANGE) {
        this.aaT -= dt;
        if (this.aaT <= 0) {
          this.aaT = AA_PERIOD / (1 + this.tal.aaSpeed) / (this.berserkT > 0 ? 1.5 : 1);
          this.face = faceToward(this.x, this.y, tg.x, tg.y, this.face);
          this.region.fx({ type: 'swing', x: this.x, y: this.y, face: this.face, dur: 0.18 });
          this.sound('autoSwing');
          this.atkAnimT = ATK_ANIM;
          this.region.fx({ type: 'hit', x: tg.x, y: tg.y - 6, col: '#d3dcea', dur: 0.18 });
          const crit = this.game.rng.next() < this.tal.crit;
          this.dmgEnemy(
            tg,
            Math.round((3 + this.tal.aaDmg) * this.dmgMult() * (crit ? this.critMult : 1)),
            crit ? 'crit' : 'aa'
          );
          if (crit && this.tal.critBleed && tg.alive)
            this.bleedT = Math.max(this.bleedT, this.tal.critBleed);
        }
      } else this.aaT = Math.min(this.aaT, 0.4);
    }

    this.eatCd = Math.max(0, this.eatCd - dt);
    this.gatherT = Math.max(0, this.gatherT - dt);
    this.updateChop();
    this.updateTalk();
    this.updateUse();
    this.updateQuestPlaces();
    this.updateExits(dt);
    this.updateMine();
    this.updateCraft(dt);
    this.updateWork();

    // bleed
    if (tg && tg.alive && this.bleedT > 0) {
      this.bleedT -= dt;
      this.bleedTick += dt;
      if (this.bleedTick >= 1) {
        this.bleedTick -= 1;
        this.dmgEnemy(tg, 2 + this.tal.rendTick, 'dot');
        this.burst(tg.x, tg.y - 4, 3, '#c8302a', 30, 0.5, 2, 160);
      }
    } else this.bleedT = 0;

    // Rev auto: fires the next step by itself once the GCD has been up for a moment
    if (
      this.rev &&
      this.revAuto &&
      !this.dead &&
      !this.mounted &&
      this.mountT <= 0 &&
      this.t >= GCD + 0.45 &&
      this.target &&
      this.target.alive
    ) {
      this.revFire(false);
      this.t = Math.min(this.t, GCD);
    }
  }
}
