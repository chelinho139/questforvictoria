import { SKILLS, ACTIONS, PRESETS, DEFAULT_WHEEL_1, DEFAULT_WHEEL_2, isSkill } from '../data/skills';
import type { Key, SkillKey, ActionKey, WheelKey } from '../data/skills';
import { KINDS } from '../data/enemies';
import type { EnemyKind } from '../data/enemies';
import { T, blocked, isoX, isoDir, isoSpeedFactor, MAP, Tile, rockCentre, setRockBroken, setBlocker, tileObstructed, loadMap, parseLayout, setPropSolid } from './map';
import { propSolidTiles } from '../data/props';
import { REGIONS, START_REGION } from '../data/regions';
import type { RegionDef, RegionExit } from '../data/regions';
import { check } from './story';
import type { Cond, Effect } from '../data/story';
import { DOCS } from '../data/docs';
import { SCENES } from '../data/scenes';
import type { SceneStep } from '../data/scenes';
import { SAVE_VERSION } from './save';
import type { SaveData } from './save';
import { RECIPES, STRUCTURES, STATION_REACH, STATION_NAMES } from '../data/crafting';
import type { Recipe, StructureKind } from '../data/crafting';
import { NPCS } from '../data/npcs';
import type { NpcId } from '../data/npcs';
import { QUESTS, QUEST_IDS } from '../data/quests';
import { TALENTS, TREES, NO_FX, TIER_POINTS, MAX_LEVEL, HP_PER_LEVEL, XP_FOR, xpToNext } from '../data/talents';
import { SPELLS, SPELL_ORDER, HOME_SLOT } from '../data/spells';
import type { SpellKey } from '../data/spells';
import { BAR_KEYS } from '../data/actionBar';
import type { TalentFx, TreeId } from '../data/talents';
import { ITEMS, BAG_SLOTS, CHOP, MINE, STARTER, SLOTS, NO_STATS } from '../data/items';
import type { ItemId, Slot, Stats } from '../data/items';
import { Rng } from './rng';
import { Emitter } from './Emitter';
import { DayCycle } from './daylight';
import { findPath } from './pathfind';
import type { Pt } from './pathfind';
import type { Enemy, Fx, Particle, ButtonId, SimEvents, FloaterClass, LogClass, Stack, Drop, TreeState, RockState, Structure, NpcState, QuestProgress, QuestStatus, ObjectState, SceneLine, PropState, Hazard, WandererState } from './types';

export const GCD = 1.2;
/** Perfect-timing window (seconds after the GCD arc restarts). */
export const WIN = 0.3;
export const AA_RANGE = 48;
/** Seconds a night creature takes to climb out of the ground. */
export const RISE_DUR = 0.9;
export const JUMP_DUR = 0.38;
export const JUMP_HEIGHT = 16;
/** A flip is a slightly bigger, slower jump so the rotation reads. */
export const FLIP_DUR = 0.5;
export const FLIP_HEIGHT = 22;
export const FLIP_CHANCE = 0.2;
/** How long the hero's attack animation plays (wind-up, overhead, strike, follow-through). */
export const ATK_ANIM = 0.36;
export const AA_PERIOD = 1.3;

const ACTION_CD: Record<'mortal' | 'interrupt', number> = {
  mortal: 30,
  interrupt: 15,
};

interface Movable {
  x: number;
  y: number;
  face: 1 | -1;
  walk: number;
}

export interface KeyInfo {
  n: string;
  col: string;
  desc: string;
  cd: number;
  c?: number;
}

/**
 * The whole game state and rules. Ticked by the game scene, rendered by the
 * scenes, driven by input through its public methods. Knows nothing about Phaser.
 */
export class Sim {
  readonly events = new Emitter<SimEvents>();
  private rng = new Rng(99);

  // ---- player ----
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
  private lastWardenCd = 0;
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
  rev = false;
  revAuto = false;
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
  private wasNight = false;
  /** Current screen-space movement input, set by the scene every frame. */
  inputMove = { x: 0, y: 0 };
  /** 1 = normal; the HUD lowers it while a wheel is open. */
  timeScale = 1;

  // ---- loadout ----
  w1: ActionKey[] = DEFAULT_WHEEL_1.slice();
  w2: Key[] = DEFAULT_WHEEL_2.slice();
  seq: SkillKey[] = PRESETS.mobs.slice();
  seqI = 0;
  sel1: ActionKey = 'interrupt';
  sel2: Key = 'slash';

  /** Dev-menu switches. Not reset by reset(), so they survive a game reset. */
  readonly cheats = { god: false, infiniteMana: false, noCooldowns: false, freezeEnemies: false, moveSpeed: 1 };

  // ---- world ----
  readonly day = new DayCycle();
  enemies: Enemy[] = [];
  fx: Fx[] = [];
  parts: Particle[] = [];
  /** The bag: BAG_SLOTS slots, each empty or one stack. */
  bag: (Stack | null)[] = [];
  /** Items lying on the ground. */
  drops: Drop[] = [];
  /** Every choppable tree on the map. */
  trees: TreeState[] = [];
  /** Equipped gear, one item per slot. */
  equip: Record<Slot, ItemId | null> = { head: null, body: null, legs: null, feet: null, weapon: null, offhand: null, trinket: null };
  /** Totals of everything equipped (see gearStats). */
  gear: Stats = { ...NO_STATS };
  /** The tree being chopped (walking to it first if needed). */
  chopTree: TreeState | null = null;
  private chopT = 0;
  rocks: RockState[] = [];
  /** Campfires and forges built in the world. */
  structures: Structure[] = [];
  npcs: NpcState[] = [];
  /** Quests taken (by id): goal progress, and whether they were handed in. */
  quests: Record<string, QuestProgress> = {};
  /** Story flags: what has happened (see data/story.ts and sim/story.ts). */
  flags: Record<string, number> = {};
  /** The region you are in (data/regions). */
  region = '';
  /** What you left behind in each region you have been to: what you built and dropped. */
  readonly regionMemory = new Map<string, { structures: Structure[]; drops: Drop[] }>();
  /** Documents found (diary pages, letters, notes; data/docs.ts), in the order found. */
  journal: string[] = [];
  /** Objects you can use in this region. */
  objects: ObjectState[] = [];
  /** Buildings and big props in this region. */
  props: PropState[] = [];
  /** Rings of force spreading across the floor (the Bell-Ringer's tolls). */
  hazards: Hazard[] = [];
  /** Who walks this region's routes (the grey postman). */
  wanderers: WandererState[] = [];
  private storyT = 0;
  private wandererSaidT = 0;
  private useTarget: string | null = null;
  /** The scene playing (data/scenes.ts), or null. Input and combat wait while it plays. */
  scene: { id: string; i: number; t: number; line: SceneLine | null; look: { x: number; y: number } | null } | null = null;
  private sceneQueue: string[] = [];
  /** Set while travelling through an exit (the scene fades, then calls enterRegion). */
  exiting: RegionExit | null = null;
  /** Exits only fire once you have stepped clear of the one you arrived by. */
  private exitArmed = false;
  private lockedSaidT = 0;
  /** NPCs you have spoken to (they introduce themselves only once). */
  readonly met = new Set<NpcId>();
  /** Walking over to talk to this NPC. */
  private talkTarget: NpcId | null = null;
  private nextStructure = 1;
  /** The rock being mined (walking to it first if needed). */
  mineRock: RockState | null = null;
  private mineT = 0;
  private eatCd = 0;

  constructor() {
    this.reset();
  }

  get moving(): boolean {
    return this.inputMove.x !== 0 || this.inputMove.y !== 0 || this.path !== null;
  }

  reset(): void {
    Object.assign(this, {
      hp: 140, hpMax: 140, mp: 60, mpMax: 100, t: 9, buffT: 0, invT: 0, dodgeCd: 0, mortalCd: 0,
      intCd: 0, bleedT: 0, bleedTick: 0, aaT: 0, swing: 0, atkAnimT: 0, cds: {}, last: null,
      kills: 0, perf: 0, gold: 0, level: 1, xp: 0, talents: {}, tal: { ...NO_FX }, lastWardenCd: 0, acd: {}, berserkT: 0, lastStandT: 0, dead: 0, x: 0, y: 0,
      face: 1, walk: 0, flash: 0, shake: 0, target: null, rev: false, mounted: false, mountT: 0, dustT: 0,
      jumpT: -1, jumpFlip: false, lastMove: null, path: null, stuckT: 0, seqI: 0, sel1: 'interrupt', sel2: 'slash',
    });
    // a new hero knows a few spells; the rest unlock with levels and talents
    this.bar = new Array<SpellKey | null>(BAR_KEYS.length).fill(null);
    for (const k of SPELL_ORDER) if (this.knows(k)) this.placeSpell(k);
    this.w1 = DEFAULT_WHEEL_1.slice();
    this.w2 = DEFAULT_WHEEL_2.slice();
    this.seq = PRESETS.mobs.slice();
    this.fx = [];
    this.parts = [];
    this.bag = new Array<Stack | null>(BAG_SLOTS).fill(null);
    this.equip = { head: null, body: null, legs: null, feet: null, weapon: null, offhand: null, trinket: null };
    Object.assign(this.equip, STARTER.worn);
    for (const id of STARTER.bag) this.addItem(id, 1);
    this.applyGear();
    this.hp = this.hpMax;
    this.quests = {};
    this.met.clear();
    this.flags = {};
    this.journal = [];
    this.regionMemory.clear();
    this.region = '';
    this.eatCd = 0;
    this.enterRegion(START_REGION, 'start');
    this.log('An old man by the road waves you over. Click him to talk.', 'c');
    this.wasNight = this.isNight;
    this.log('Select an enemy to lock it.', '');
    this.events.emit('loadout', {});
  }

  private spawnEnemy(kind: EnemyKind, x: number, y: number, temp = false): Enemy {
    const k = KINDS[kind];
    const e: Enemy = {
      kind, def: k, n: k.n, x, y, sx: x, sy: y, hp: k.hp, hpMax: k.hp, aggro: false, wanderT: 0, wx: 0, wy: 0,
      atkT: k.per, tele: false, castT: -1, castTotal: 2.2, castCd: 3, stunT: 0, sunderT: 0, alive: true, respawnT: 0,
      dieT: 0, flash: 0, face: 1, walk: 0, riseT: 0, crumbleT: -1, fleeT: 0, temp, phase: 0,
    };
    // night creatures placed during the day wait underground (staggered so they don't all rise at once)
    if (k.nightOnly && !temp && !this.isNight) {
      e.alive = false;
      e.respawnT = 0.5 + this.rng.next() * 4;
    }
    return e;
  }

  // ---------- messaging ----------
  /** Last few log lines, so a HUD created after the first messages can show them. */
  readonly logHistory: { text: string; cls: LogClass }[] = [];
  log(text: string, cls: LogClass = ''): void {
    this.logHistory.push({ text, cls });
    while (this.logHistory.length > 5) this.logHistory.shift();
    this.events.emit('log', { text, cls });
  }
  private banner(text: string, cls: 'bad' | 'cool' | '' = ''): void {
    this.events.emit('banner', { text, cls });
  }
  private floater(x: number, y: number, text: string, cls: FloaterClass = '', color?: string): void {
    this.events.emit('floater', { x, y, text, cls, color });
  }
  private castFlash(btn: ButtonId, key: WheelKey, color: string): void {
    this.events.emit('castFlash', { btn, key, color });
  }
  private nudge(btn: ButtonId, key: WheelKey, err = false): void {
    this.events.emit('nudge', { btn, key, err });
  }

  // ---------- effects ----------
  addFx(f: Omit<Fx, 't'>): void {
    this.fx.push({ t: 0, ...f });
  }
  burst(x: number, y: number, n: number, col: string, spd: number, life: number, size = 3, g = 0): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = spd * (0.4 + Math.random() * 0.6);
      this.parts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.6 + Math.random() * 0.4), max: life, col, size, g,
      });
    }
  }
  private updateFx(dt: number): void {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      if (f.t >= f.dur) {
        this.fx.splice(i, 1);
        f.onEnd?.();
      }
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.g * dt;
      p.life -= dt;
      if (p.life <= 0) this.parts.splice(i, 1);
    }
  }
  private boltPts(x: number, y: number): [number, number][] {
    const pts: [number, number][] = [[x + (Math.random() * 30 - 15), y - 140]];
    for (let i = 1; i < 6; i++) pts.push([x + (Math.random() * 36 - 18) * (1 - i / 6), y - 140 + (i * 140) / 6]);
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
    for (const e of this.enemies) {
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
      return { n: s.n, col: s.col, desc: s.desc + (s.c ? ' · ' + s.c + ' mana' : ''), cd: this.skillCd(k), c: s.c };
    }
    if (k === 'rev') return { n: this.rev ? 'Rev · stop' : 'Rev', col: '#f2c14e', desc: 'each tap, the next step', cd: 0 };
    const a = ACTIONS[k];
    return k in ACTION_CD ? { ...a, cd: this.actionCd(k as keyof typeof ACTION_CD) } : a;
  }

  /** A skill's cooldown after talents. */
  skillCd(k: SkillKey): number {
    const cd = SKILLS[k].cd;
    if (k === 'charge') return Math.max(2, cd - this.tal.chargeCd);
    if (k === 'whirlwind') return Math.max(2, cd - this.tal.whirlCd);
    return cd;
  }

  /** An action's cooldown after talents. */
  actionCd(k: keyof typeof ACTION_CD): number {
    const less = { mortal: this.tal.mortalCd, interrupt: this.tal.intCd }[k];
    return Math.max(2, ACTION_CD[k] - less);
  }

  /** Everything that scales your damage: talents, War Cry, Enrage. */
  private dmgMult(): number {
    const cry = this.buffT > 0 ? 1.2 + this.tal.warcryBonus : 1;
    const rage = this.hp < this.hpMax / 2 ? 1 + this.tal.enrage : 1;
    const berserk = this.berserkT > 0 ? 1.2 : 1;
    return (1 + this.tal.dmg) * cry * rage * berserk;
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
      case 'mortal': return this.mortalCd;
      case 'interrupt': return this.intCd;
      default: return this.acd[k as ActionKey] ?? 0;
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
    switch (k) {
      case 'sunder':
      case 'deathblow':
        return close ? null : `${ACTIONS[k].n} needs a target close by.`;
      case 'shieldbash':
        return !this.equip.offhand ? 'Shield Bash needs a shield in your off hand.' : close ? null : 'Shield Bash needs a target close by.';
      case 'bloodrage':
        return this.hp > this.hpMax * 0.2 ? null : 'Too hurt for Bloodrage.';
      case 'interrupt': return tg && tg.alive && tg.castT > 0 ? null : 'Nothing to interrupt.';
      case 'execute':
        return tg && tg.alive && tg.hp / tg.hpMax < this.execThreshold && this.dist(this, tg) < 60
          ? null
          : `Execute needs a target below ${Math.round(this.execThreshold * 100)}% and close.`;
      case 'mortal': return tg && tg.alive && this.dist(this, tg) <= 60 ? null : 'Mortal Strike needs a target close by.';
      case 'target': return this.nearestEnemy(this.target) ? null : 'No other enemy nearby.';
      default: return null;
    }
  }

  private canCast(key: SkillKey): string | null {
    if (!this.knows(key)) return this.notLearned(key);
    const sk = SKILLS[key];
    const tg = this.target;
    const needT = sk.range > 0;
    const cd = this.cds[key] ?? 0;
    if (cd > 0) return sk.n + ' on cooldown (' + Math.ceil(cd) + ' s).';
    if (needT && (!tg || !tg.alive)) return 'Pick a target first.';
    if (needT && tg && this.dist(this, tg) > sk.range) return sk.n + ': out of range.';
    if (this.mp < sk.c) return 'Not enough mana for ' + sk.n + '.';
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
  /**
   * Rev (the skill sequencer) is an advanced option for higher levels: off until the player
   * turns it on (dev panel, Advanced). While off, Rev cannot be switched on.
   */
  revEnabled = false;
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
    this.log(on ? 'Rev auto: fires on its own every GCD.' : 'Rev manual: each tap fires the marked step.');
  }
  /** PC: fire the next Rev step, switching Rev on first if it was off. */
  revStep(): void {
    if (!this.revEnabled) return;
    if (!this.rev) this.setRev(true);
    this.revFire(true);
  }

  /** PC action bar: cast a key directly. Manual casts leave Rev as it is. */
  castKey(k: Key): boolean {
    if (this.scene) return false;
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
    const p = PRESETS[name];
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
    if (!this.doAction(k, true, b)) this.log(this.info(k).n + ' selected. Tap to cast when you can.');
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
    if (k !== 'bloodrage' && k !== 'laststand' && k !== 'berserk') {
      if (this.mounted) this.dismount('You dismount to attack.');
      this.mountT = 0;
    }
    const a = ACTIONS[k];
    this.floater(this.x, this.y - 36, a.n.toUpperCase(), 'name', a.col);
    this.castFlash(btn, k, a.col);
    this.nudge(btn, k);
    if (k === 'interrupt' && tg) {
      this.intCd = this.actionCd('interrupt');
      tg.castT = -1;
      tg.castCd = 6;
      tg.stunT = 1 + this.tal.intStun;
      this.banner('INTERRUPTED', 'cool');
      this.log('You interrupted the cast.', 't');
      this.addFx({ type: 'shield', x: tg.x, y: tg.y, col: '#3ddbd9', dur: 0.4 });
      this.burst(tg.x, tg.y - 8, 8, '#3ddbd9', 90, 0.4, 2, 0);
    } else if (k === 'execute' && tg) {
      this.addFx({ type: 'xslash', x: tg.x, y: tg.y - 6, col: '#e0504b', dur: 0.45 });
      this.burst(tg.x, tg.y - 6, 14, '#c8302a', 110, 0.6, 3, 200);
      this.shake = 0.15;
      this.dmgEnemy(tg, Math.round((Math.round(tg.hp * 0.3) + 8) * (1 + this.tal.execDmg) * this.dmgMult()), 'crit');
      this.banner('EXECUTE!', 'bad');
      this.log('Execution strike.', 'c');
    } else if (k === 'mortal' && tg) {
      this.mortalCd = this.actionCd('mortal');
      this.addFx({ type: 'bolt', x: tg.x, y: tg.y - 4, pts: this.boltPts(tg.x, tg.y - 4), col: '#f2c14e', dur: 0.4 });
      this.burst(tg.x, tg.y - 6, 16, '#f2c14e', 130, 0.5, 3, 100);
      this.shake = 0.22;
      this.dmgEnemy(tg, Math.round((12 + this.tal.mortalDmg) * this.dmgMult()), 'crit');
      if (this.tal.critBleed) this.bleedT = Math.max(this.bleedT, this.tal.critBleed);
      tg.stunT = 0.6;
      this.swing = 0.2;
      this.atkAnimT = ATK_ANIM;
      this.log('Mortal Strike.', 'c');
    } else this.talentAbility(k, tg);
    return true;
  }

  /** The abilities taught by talents (Sunder, Deathblow, Bloodrage, Berserk, Shield Bash, Last Stand). */
  private talentAbility(k: ActionKey, tg: Enemy | null): void {
    const a = ACTIONS[k];
    if (!(k in SPELLS) || !SPELLS[k as SpellKey].talent) return;
    this.acd[k] = a.cd;
    this.mp -= a.c ?? 0;
    const crit = this.rng.next() < this.tal.crit;
    const hit = (base: number) => Math.round(base * this.dmgMult() * (crit ? this.critMult : 1));
    if (k === 'sunder' && tg) {
      this.face = tg.x < this.x ? -1 : 1;
      this.addFx({ type: 'slash', x: tg.x, y: tg.y - 6, rot: 0.4, col: '#c8d2e0', dur: 0.35 });
      this.burst(tg.x, tg.y - 8, 10, '#c8d2e0', 90, 0.5, 2, 160);
      this.dmgEnemy(tg, hit(6), crit ? 'crit' : '');
      tg.sunderT = 10;
      this.atkAnimT = ATK_ANIM;
      this.log(`${tg.n} is sundered: it takes 20% more damage for 10 s.`, 'c');
    } else if (k === 'deathblow' && tg) {
      this.face = tg.x < this.x ? -1 : 1;
      this.addFx({ type: 'xslash', x: tg.x, y: tg.y - 6, col: '#e0504b', dur: 0.5 });
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
      this.addFx({ type: 'shout', x: this.x, y: this.y, col: '#ff8c42', dur: 0.7 });
      this.burst(this.x, this.y - 14, 14, '#ff8c42', 70, 0.7, 2, -50);
    } else if (k === 'shieldbash' && tg) {
      this.face = tg.x < this.x ? -1 : 1;
      this.addFx({ type: 'shield', x: tg.x, y: tg.y, col: '#c4cedc', dur: 0.4 });
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
      this.addFx({ type: 'ring', x: this.x, y: this.y - 8, r0: 8, r1: 40, col: '#6ccf6a', lw: 3, dur: 0.6 });
      this.log('Last Stand: you dig in.', 't');
    }
  }

  // ---------- spells and the action bar ----------
  /** Whether you have learned a spell (by level, or from its talent). */
  knows(k: SpellKey): boolean {
    const s = SPELLS[k];
    if (s.talent) return (this.talents[s.talent] ?? 0) > 0;
    return this.level >= (s.level ?? 1);
  }

  private notLearned(k: SpellKey): string {
    const s = SPELLS[k];
    const name = isSkill(k) ? SKILLS[k].n : ACTIONS[k].n;
    return s.talent ? `${name} comes from the ${TALENTS[s.talent].name} talent.` : `You learn ${name} at level ${s.level}.`;
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
    const why = this.canCast(key);
    if (why) {
      if (!quiet) {
        this.log(why, 'h');
        if (why.includes('range')) this.floater(this.x, this.y - 20, 'TOO FAR', 'hurt');
        this.nudge(btn, key, true);
      }
      return false;
    }
    if (this.mounted) this.dismount('You dismount to attack.');
    this.mountT = 0;
    this.mp -= sk.c;
    this.cds[key] = this.skillCd(key);
    const phase = (this.t - GCD) % GCD;
    const perfect = fromTap && phase < WIN;
    // a perfect-timed tap always crits; Keen Eye adds a chance for any hit
    const crit = perfect || this.rng.next() < this.tal.crit;
    const combo = key === 'slash' && this.last === 'thrust' ? 1.5 + this.tal.slashCombo : 1;
    const mult = this.dmgMult() * combo * (crit ? this.critMult : 1);
    const base = sk.d + (key === 'thrust' ? this.tal.thrust : 0) + (key === 'whirlwind' ? this.tal.whirlDmg : 0);
    this.floater(this.x, this.y - 36, sk.n.toUpperCase(), 'name', sk.col);
    this.castFlash(btn, key, sk.col);
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
      }
      this.face = tg.x < this.x ? -1 : 1;
      this.addFx({ type: 'dash', x0, y0, x1: this.x, y1: this.y, face: this.face, dur: 0.35 });
      this.burst(x0, y0 + 4, 8, '#b8956a', 60, 0.5, 3, -20);
      this.addFx({ type: 'hit', x: tg.x, y: tg.y - 8, col: sk.col, dur: 0.25 });
      this.shake = 0.12;
      this.dmgEnemy(tg, Math.round(base * mult), critCls);
      tg.stunT = 1.5 + this.tal.chargeStun;
      tg.tele = false;
      tg.atkT = Math.max(tg.atkT, 1.5);
    } else if (key === 'whirlwind') {
      let n = 0;
      const reach = (sk.aoe ?? 0) + this.tal.whirlReach;
      this.addFx({ type: 'whirl', x: this.x, y: this.y, r: reach, col: sk.col, dur: 0.5 });
      this.burst(this.x, this.y - 8, 12, sk.col, 140, 0.5, 2, 0);
      for (const e of this.enemies) {
        if (e.alive && this.dist(this, e) < reach) {
          this.dmgEnemy(e, Math.round(base * mult), critCls);
          n++;
        }
      }
      if (!n) this.log('Whirlwind hit nobody.');
    } else if (key === 'warcry') {
      this.buffT = 15 + this.tal.warcryDur;
      this.floater(this.x, this.y - 20, `+${Math.round((0.2 + this.tal.warcryBonus) * 100)}%`, 'heal');
      this.addFx({ type: 'shout', x: this.x, y: this.y, col: sk.col, dur: 0.7 });
      this.burst(this.x, this.y - 14, 8, sk.col, 50, 0.6, 2, -40);
    } else if (tg) {
      this.face = tg.x < this.x ? -1 : 1;
      if (key === 'thrust')
        this.addFx({ type: 'stab', x0: this.x + this.face * 8, y0: this.y - 8, x1: tg.x, y1: tg.y - 6, dur: 0.28 });
      else if (key === 'slash') this.addFx({ type: 'slash', x: tg.x, y: tg.y - 6, rot: -0.6, col: sk.col, double: true, dur: 0.45 });
      else if (key === 'rend') {
        this.addFx({ type: 'slash', x: tg.x, y: tg.y - 6, rot: 1.2, col: sk.col, dur: 0.3 });
        this.burst(tg.x, tg.y - 6, 10, '#c8302a', 80, 0.6, 2, 220);
      }
      this.dmgEnemy(tg, Math.round(base * mult), critCls);
      if (key === 'rend') this.bleedT = 8 + this.tal.rendDur;
    }
    if (crit && this.tal.critBleed && tg && tg.alive) this.bleedT = Math.max(this.bleedT, this.tal.critBleed);
    this.swing = 0.15;
    if (key !== 'warcry') this.atkAnimT = ATK_ANIM;
    if (perfect) {
      this.perf++;
      this.banner('PERFECT!');
      this.addFx({ type: 'ring', x: this.x, y: this.y - 8, r0: 12, r1: 44, col: '#f2c14e', lw: 4, dur: 0.4 });
    }
    this.last = key;
    this.t = 0;
    this.nudge(btn, key);
    this.events.emit('loadout', {});
    return true;
  }

  // ---------- damage ----------
  private dmgEnemy(e: Enemy, v: number, cls: FloaterClass): void {
    if (!e.alive) return;
    // weapons add to every direct hit (not to bleeding)
    if (cls !== 'dot') v += this.gear.atk;
    if (e.sunderT > 0) v = Math.round(v * 1.2);
    e.hp = Math.max(0, e.hp - v);
    const boss = e.def.boss;
    if (boss?.phases && e.hp > 0) {
      const phase = boss.phases.filter(f => e.hp / e.hpMax <= f).length;
      if (phase > e.phase) {
        e.phase = phase;
        this.events.emit('bossPhase', { kind: e.kind, phase });
      }
    }
    if (cls !== 'dot' && this.tal.lifeOnHit && !this.dead) this.hp = Math.min(this.hpMax, this.hp + this.tal.lifeOnHit);
    e.flash = 0.08;
    // passive creatures bolt; everything else fights back
    if (e.def.behavior === 'passive') e.fleeT = 3;
    else e.aggro = true;
    if (e.def.hitSay && Math.random() < 0.6) this.floater(e.x + 12, e.y - 14 * e.def.scale - 8, e.def.hitSay, 'name', '#f4f1e6');
    this.floater(e.x, e.y - 14 * e.def.scale, String(v), cls);
    this.burst(e.x, e.y - 8, cls === 'crit' ? 10 : 4, cls === 'crit' ? '#f2c14e' : '#fff', 90, 0.35, 2, 120);
    if (e.hp <= 0) {
      e.alive = false;
      e.dieT = 1;
      e.respawnT = 8;
      this.kills++;
      this.gold += e.def.gold;
      this.banner('+' + e.def.gold + ' GOLD');
      this.log(e.n + ' defeated.', 'c');
      e.castT = -1;
      if (this.target === e) {
        this.target = null;
        this.seqI = 0;
      }
      this.burst(e.x, e.y - 8, 14, '#f2c14e', 70, 0.7, 3, 60);
      if (boss) {
        this.setFlag(boss.flag);
        this.banner(`${e.n.toUpperCase()} DEFEATED`, 'cool');
        this.hazards = [];
        // its summons fall with it
        for (const o of this.enemies) if (o.temp && o.alive && o !== e) this.crumble(o);
        this.applyEffect(boss.onDeath);
      }
      this.questEvent('kill', e.kind);
      this.gainXp(e.def.xp, e.x, e.y);
      if (this.tal.killMana) this.mp = Math.min(this.mpMax, this.mp + this.tal.killMana);
      if (this.tal.killHeal && this.hp < this.hpMax) {
        const h = Math.min(this.tal.killHeal, this.hpMax - this.hp);
        this.hp += h;
        this.floater(this.x, this.y - 20, '+' + h, 'heal');
      }
      if (this.tal.rampage) this.buffT = Math.min(this.buffT + this.tal.rampage, 15 + this.tal.warcryDur);
      for (const [id, lo, hi, chance = 1] of e.def.loot ?? []) {
        if (this.rng.next() >= chance) continue;
        const n = lo + Math.floor(this.rng.next() * (hi - lo + 1));
        for (let k = 0; k < n; k++) this.spawnDrop(e.x, e.y, id);
      }
    }
  }

  private dmgPlayer(v: number, src: string): void {
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
      this.addFx({ type: 'shield', x: this.x, y: this.y, col: '#f2c14e', dur: 0.6 });
    }
    this.hp = Math.max(0, this.hp - v);
    this.flash = 0.08;
    this.shake = 0.15;
    this.floater(this.x, this.y - 20, '-' + v, 'hurt');
    this.addFx({ type: 'hit', x: this.x, y: this.y - 10, col: '#e0504b', dur: 0.2 });
    this.burst(this.x, this.y - 8, 6, '#e0504b', 80, 0.4, 2, 120);
    if (this.hp <= 0) {
      this.dead = 2.2;
      this.stopMoving();
      this.events.emit('died', {});
      this.log('You died. Respawning…', 'h');
    }
  }

  // ---------- mount / dodge ----------
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
    this.log('Mounting…');
  }
  private dismount(msg: string): void {
    if (!this.mounted) return;
    this.mounted = false;
    this.burst(this.x, this.y + 4, 8, '#b8956a', 60, 0.5, 3, -20);
    if (msg) this.log(msg);
  }
  private finishMount(): void {
    this.mounted = true;
    this.mountT = 0;
    this.burst(this.x, this.y + 4, 10, '#b8956a', 70, 0.5, 3, -20);
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
    if (this.scene) return;
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

  /** Dodge along the last movement direction (world space). */
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

  killAllEnemies(): void {
    for (const e of this.enemies) if (e.alive) this.dmgEnemy(e, e.hp, 'crit');
  }

  /** Back to the starting creatures (drops anything spawned from the dev menu). */
  respawnAllEnemies(): void {
    this.enemies = this.regionSpawns();
    this.target = null;
    this.log('Creatures respawned.');
  }

  teleportToStart(): void {
    this.stopMoving();
    this.placeAt(this.regionDef.spots.start);
  }

  /** The boss you are fighting (or about to), for the big health bar. */
  get activeBoss(): Enemy | null {
    for (const e of this.enemies) if (e.def.boss && e.alive && (e.aggro || this.dist(this, e) < 220)) return e;
    return null;
  }

  // ---------- saving ----------
  /** Everything worth keeping, as plain data (see sim/save.ts). */
  toSave(): SaveData {
    const built: Record<string, Structure[]> = {};
    for (const [id, m] of this.regionMemory) if (m.structures.length) built[id] = m.structures;
    if (this.structures.length) built[this.region] = this.structures;
    return {
      v: SAVE_VERSION,
      at: Date.now(),
      region: this.region,
      x: this.x,
      y: this.y,
      hp: this.hp,
      mp: this.mp,
      level: this.level,
      xp: this.xp,
      gold: this.gold,
      kills: this.kills,
      talents: { ...this.talents },
      bag: this.bag.map(st => (st ? { ...st } : null)),
      equip: { ...this.equip },
      bar: this.bar.slice(),
      quests: JSON.parse(JSON.stringify(this.quests)) as SaveData['quests'],
      flags: { ...this.flags },
      met: [...this.met],
      journal: this.journal.slice(),
      day: { t: this.day.t, day: this.day.day },
      built: JSON.parse(JSON.stringify(built)) as SaveData['built'],
    };
  }

  /** Start over from a save. Returns false (and leaves a new game) if it can't be read. */
  loadSave(d: SaveData): boolean {
    this.reset();
    if (!d || d.v !== SAVE_VERSION || !REGIONS[d.region]) return false;
    // a new game's opening scene may have started before the save was read
    this.scene = null;
    this.sceneQueue = [];
    this.events.emit('scene', {});
    this.level = d.level;
    this.xp = d.xp;
    this.gold = d.gold;
    this.kills = d.kills;
    this.talents = { ...d.talents };
    this.applyTalents();
    // items, gear and quests the game no longer has (from an older version) are dropped
    this.bag = d.bag.map(st => (st && ITEMS[st.id] ? { ...st } : null));
    this.equip = Object.fromEntries(Object.entries(d.equip).filter(([, id]) => !id || ITEMS[id as ItemId])) as typeof this.equip;
    this.applyGear();
    this.bar = d.bar.slice();
    this.quests = Object.fromEntries(Object.entries(d.quests).filter(([id]) => QUESTS[id]));
    this.flags = { ...d.flags };
    this.met.clear();
    for (const id of d.met) this.met.add(id);
    this.journal = d.journal.slice();
    this.day.t = d.day.t;
    this.day.day = d.day.day;
    this.regionMemory.clear();
    let next = 1;
    for (const [id, list] of Object.entries(d.built)) {
      this.regionMemory.set(id, { structures: list, drops: [] });
      for (const st of list) next = Math.max(next, st.id + 1);
    }
    this.nextStructure = next;
    this.region = '';
    this.enterRegion(d.region, 'start');
    // the map may have changed since the save: only stand where you can
    if (!blocked(d.x, d.y, 9, 8)) {
      this.x = d.x;
      this.y = d.y;
    }
    this.hp = Math.min(this.hpMax, Math.max(1, d.hp));
    this.mp = d.mp;
    this.events.emit('loadout', {});
    this.events.emit('quests', {});
    this.events.emit('bag', {});
    this.events.emit('talents', {});
    this.logHistory.length = 0;
    this.log('Welcome back.', 't');
    return true;
  }

  // ---------- regions ----------
  get regionDef(): RegionDef {
    return REGIONS[this.region];
  }

  /** Whether a story condition holds right now. */
  check(c?: Cond): boolean {
    return check(this, c);
  }

  setFlag(name: string, v = 1): void {
    if ((this.flags[name] ?? 0) === v) return;
    this.flags[name] = v;
    this.events.emit('flags', { name });
  }

  private placeAt([c, r]: [number, number]): void {
    this.x = c * T + T / 2;
    this.y = r * T + T / 2;
  }

  /** The creatures a region starts with (those whose condition holds). */
  private regionSpawns(): Enemy[] {
    return this.regionDef.spawns.filter(sp => this.check(sp.when)).map(sp => this.spawnEnemy(sp.kind, sp.at[0] * T + T / 2, sp.at[1] * T + T / 2));
  }

  /**
   * Travel to region `id`, arriving at its spot `spot`. What you built or dropped in the
   * region you leave is kept for when you come back; trees, rocks and creatures reset.
   */
  enterRegion(id: string, spot: string): void {
    const def = REGIONS[id];
    if (!def) throw new Error(`no region '${id}'`);
    if (this.region) this.regionMemory.set(this.region, { structures: this.structures, drops: this.drops });
    this.region = id;
    // the exits' tiles are the only walkable edge tiles
    const open: [number, number][] = [];
    for (const e of def.exits) for (let r = e.area[1]; r <= e.area[3]; r++) for (let c = e.area[0]; c <= e.area[2]; c++) open.push([c, r]);
    loadMap(parseLayout(def.layout, id), open);
    const mem = this.regionMemory.get(id);
    this.structures = mem?.structures ?? [];
    this.drops = mem?.drops ?? [];
    for (const st of this.structures) if (STRUCTURES[st.kind].solid) setBlocker(st.c, st.r, { x: st.x, y: st.y, r: 10 });
    this.props = (def.props ?? []).filter(p => this.check(p.when)).map(p => ({ kind: p.kind, c: p.at[0], r: p.at[1] }));
    for (const p of this.props) for (const [c, r] of propSolidTiles(p.kind, p.c, p.r)) setPropSolid(c, r);
    this.trees = buildTrees();
    this.rocks = buildRocks();
    this.npcs = def.npcs.filter(n => this.check(n.when)).map(n => placeNpc(n.id, n.at));
    this.buildObjects();
    this.useTarget = null;
    this.hazards = [];
    this.wanderers = (def.wanderers ?? []).map(w => ({ id: w.id, x: w.route[0][0] * T + T / 2, y: w.route[0][1] * T + T / 2, i: 1 % w.route.length, alpha: 0, goneT: 0, face: 1, walk: 0 }));
    this.enemies = this.regionSpawns();
    this.placeAt(def.spots[spot] ?? def.spots.start);
    this.stopMoving();
    this.target = null;
    this.chopTree = null;
    this.mineRock = null;
    this.chopT = 0;
    this.mineT = 0;
    this.talkTarget = null;
    this.exiting = null;
    this.exitArmed = false;
    this.events.emit('region', { id });
    for (const on of def.onEnter ?? []) if (!this.flags['scene:' + on.scene] && this.check(on.when)) this.playScene(on.scene);
  }

  // ---------- story: effects, the journal ----------
  /** Make things happen: flags, documents, items, a scene. */
  applyEffect(e?: Effect): void {
    if (!e) return;
    for (const f of e.flags ?? []) this.setFlag(f);
    for (const f of e.clear ?? []) this.setFlag(f, 0);
    for (const d of e.docs ?? []) this.findDoc(d);
    for (const id of e.items ?? []) if (this.addItem(id, 1)) this.spawnDrop(this.x, this.y, id);
    if (e.scene) this.playScene(e.scene);
  }

  /** Put a document in the journal (once). */
  findDoc(id: string): void {
    const d = DOCS[id];
    if (!d || this.journal.includes(id)) return;
    this.journal.push(id);
    this.log(`Added to your journal: ${d.title}. (J)`, 't');
    this.events.emit('journal', { doc: id });
  }

  // ---------- objects you can use ----------
  private buildObjects(): void {
    this.objects = [];
    this.syncObjects();
  }

  /** Objects come and go with the story and the night: add those that should be here, remove the rest. */
  private syncObjects(): void {
    const defs = this.regionDef.objects ?? [];
    const flat = (k: string) => k === 'page' || k === 'letter' || k === 'thorn';
    for (const o of defs) {
      const want = this.check(o.when) && !(o.once && this.flags[`used:${this.region}:${o.id}`]);
      const have = this.objects.find(x => x.id === o.id);
      if (want && !have) {
        const [c, r] = o.at;
        const x = c * T + T / 2;
        const y = r * T + T / 2;
        if (!flat(o.kind)) setBlocker(c, r, { x, y, r: 8 });
        this.objects.push({ id: o.id, kind: o.kind, name: o.name, c, r, x, y });
      } else if (!want && have) {
        this.objects = this.objects.filter(x => x !== have);
        if (!flat(have.kind)) setBlocker(have.c, have.r, null);
        if (this.useTarget === have.id) this.useTarget = null;
      }
    }
  }

  /** Walk over to an object and use it. */
  useObject(id: string): void {
    if (this.dead || this.scene) return;
    const o = this.objects.find(x => x.id === id);
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
    const o = this.objects.find(x => x.id === id);
    if (!o || Math.hypot(o.x - this.x, o.y - this.y) > TALK_REACH + 4) return;
    const def = (this.regionDef.objects ?? []).find(x => x.id === id);
    if (!def) return;
    this.face = o.x < this.x ? -1 : 1;
    if (!this.check(def.need)) {
      this.log(def.needSay ?? 'Not now.', 't');
      return;
    }
    if (def.say) this.log(def.say, 't');
    if (def.once) {
      this.setFlag(`used:${this.region}:${id}`);
      this.objects = this.objects.filter(x => x !== o);
      if (o.kind !== 'page' && o.kind !== 'letter' && o.kind !== 'thorn') setBlocker(o.c, o.r, null);
      if (o.kind === 'thorn') this.burst(o.x, o.y - 6, 14, '#e09a48', 50, 0.8, 2, -50);
    }
    this.questEvent('interact', id, o.kind);
    this.applyEffect(def.then);
  }

  // ---------- the story as you play: night-only objects, scenes by place and time ----------
  private updateStory(dt: number): void {
    this.storyT -= dt;
    if (this.storyT > 0) return;
    this.storyT = 0.4;
    this.syncObjects();
    const def = this.regionDef;
    for (const on of def.onEnter ?? []) if (!this.flags['scene:' + on.scene] && this.check(on.when)) this.playScene(on.scene);
    const c = Math.floor(this.x / T);
    const r = Math.floor(this.y / T);
    for (const tr of def.triggers ?? []) {
      if (this.flags['scene:' + tr.scene] || c < tr.area[0] || c > tr.area[2] || r < tr.area[1] || r > tr.area[3]) continue;
      if (this.check(tr.when)) this.playScene(tr.scene);
    }
  }

  // ---------- wanderers (the grey postman) ----------
  private updateWanderers(dt: number): void {
    this.wandererSaidT = Math.max(0, this.wandererSaidT - dt);
    const defs = this.regionDef.wanderers ?? [];
    for (const w of this.wanderers) {
      const d = defs.find(x => x.id === w.id);
      if (!d) continue;
      const out = !this.check(d.when);
      if (w.goneT > 0) {
        w.goneT -= dt;
        w.alpha = 0;
        if (w.goneT <= 0) {
          // reappear further along the route, away from you
          let best = w.i;
          let bd = -1;
          d.route.forEach(([c, r], i) => {
            const dd = Math.hypot(c * T + T / 2 - this.x, r * T + T / 2 - this.y);
            if (dd > 200 && (bd < 0 || dd < bd)) {
              bd = dd;
              best = i;
            }
          });
          w.x = d.route[best][0] * T + T / 2;
          w.y = d.route[best][1] * T + T / 2;
          w.i = (best + 1) % d.route.length;
        }
        continue;
      }
      const near = Math.hypot(w.x - this.x, w.y - this.y) < 80;
      if (out || near) {
        w.alpha = Math.max(0, w.alpha - dt * 1.6);
        if (near && !out && this.wandererSaidT <= 0) {
          this.log(d.say, 't');
          this.wandererSaidT = 25;
        }
        if (w.alpha <= 0) w.goneT = out ? 1 : 9;
        continue;
      }
      w.alpha = Math.min(0.85, w.alpha + dt * 0.8);
      const [tc, tr] = d.route[w.i];
      const tx = tc * T + T / 2;
      const ty = tr * T + T / 2;
      const dd = Math.hypot(tx - w.x, ty - w.y);
      if (dd < 3) {
        w.i = (w.i + 1) % d.route.length;
        continue;
      }
      const sp = 22 * dt;
      w.x += ((tx - w.x) / dd) * sp;
      w.y += ((ty - w.y) / dd) * sp;
      w.walk += dt * 6;
      w.face = isoX(tx, ty) < isoX(w.x, w.y) ? -1 : 1;
    }
  }

  /** Clicking a wanderer: it turns its blank face to you, and that is all. */
  touchWanderer(id: string): void {
    const d = (this.regionDef.wanderers ?? []).find(x => x.id === id);
    const w = this.wanderers.find(x => x.id === id);
    if (!d || !w || w.alpha <= 0) return;
    this.log(d.say, 't');
    this.wandererSaidT = 25;
    w.goneT = 0;
    w.alpha = Math.min(w.alpha, 0.5);
  }

  // ---------- hazards: rings of force (jump them) ----------
  private updateHazards(dt: number): void {
    if (!this.hazards.length) return;
    for (const h of this.hazards) {
      h.r += h.speed * dt;
      const d = Math.hypot(this.x - h.x, this.y - h.y);
      if (!h.hit && !this.dead && !this.airborne && Math.abs(d - h.r) < 9) {
        h.hit = true;
        this.dmgPlayer(h.dmg, h.what);
      }
    }
    this.hazards = this.hazards.filter(h => h.r < h.max);
  }

  private toll(e: Enemy, rings: number): void {
    this.log('The bell tolls. Jump the ring of sound!', 'h');
    this.shake = 0.35;
    for (let i = 0; i < rings; i++) {
      const delay = i * 0.55;
      const start = 14 - delay * 120;
      const max = 300;
      this.hazards.push({ x: e.x, y: e.y, r: start, speed: 120, max, dmg: 16, hit: false, what: 'the toll of the bell' });
      this.addFx({ type: 'ring', x: e.x, y: e.y, r0: Math.max(0, start), r1: max, col: '#d8c070', lw: 4, dur: (max - start) / 120 });
    }
  }

  /** The Bell-Ringer: tolls rings of sound (phase 2 and 3) and calls the dead up out of the floor. */
  private bellRinger(e: Enemy, dt: number): boolean {
    if (!e.aggro || e.phase === 0) return false;
    e.tollT = (e.tollT ?? 1.5) - dt;
    if (e.tollT > 0) return false;
    e.tollN = (e.tollN ?? 0) + 1;
    e.tollT = e.phase === 1 ? 6 : 3.6;
    this.toll(e, e.phase === 1 ? 1 : 2);
    // every other toll, the dead answer
    if (e.phase === 1 ? e.tollN % 2 === 1 : e.tollN % 3 === 1) {
      const n = this.enemies.filter(o => o.temp && o.alive).length;
      for (let k = 0; k < Math.min(3, 6 - n); k++) {
        const a = this.rng.next() * Math.PI * 2;
        const x = e.x + Math.cos(a) * 90;
        const y = e.y + Math.sin(a) * 90;
        if (blocked(x, y, 12, 10)) continue;
        const sk = this.spawnEnemy('skeleton', x, y, true);
        sk.riseT = RISE_DUR;
        sk.aggro = true;
        this.enemies.push(sk);
      }
      this.log('The dead climb up through the floorboards.', 'h');
    }
    // after a toll, out of breath: he stands for a moment
    e.stunT = e.phase === 2 ? 1.4 : 0.6;
    e.tele = false;
    return true;
  }

  // ---------- scenes ----------
  /** Play a scene now (or after the one playing). Each scene plays once per game. */
  playScene(id: string): void {
    if (!SCENES[id] || this.flags['scene:' + id]) return;
    if (this.scene) {
      if (!this.sceneQueue.includes(id) && this.scene.id !== id) this.sceneQueue.push(id);
      return;
    }
    this.setFlag('scene:' + id);
    this.stopMoving();
    this.chopTree = null;
    this.mineRock = null;
    this.scene = { id, i: 0, t: 0, line: null, look: null };
    this.events.emit('scene', {});
  }

  /** Click / Space / Enter during a scene: the next line. */
  sceneNext(): void {
    const sc = this.scene;
    if (!sc || !sc.line) return;
    sc.line = null;
    sc.i++;
    sc.t = 0;
    this.events.emit('scene', {});
  }

  private updateScene(dt: number): void {
    const sc = this.scene;
    if (!sc) return;
    const steps = SCENES[sc.id].steps;
    // run instant steps; stop at one that waits
    for (let guard = 0; guard < 64; guard++) {
      const st: SceneStep | undefined = steps[sc.i];
      if (!st) {
        this.scene = null;
        this.events.emit('scene', {});
        const next = this.sceneQueue.shift();
        if (next) this.playScene(next);
        return;
      }
      if ('say' in st) {
        if (!sc.line) {
          const who = st.who ? (st.who in NPCS ? NPCS[st.who as NpcId].name : st.who) : '';
          sc.line = { who, text: st.say };
          this.events.emit('scene', {});
        }
        return;
      }
      if ('wait' in st || 'fade' in st) {
        const dur = 'wait' in st ? st.wait : (st.s ?? 0.5);
        if (sc.t === 0 && 'fade' in st) this.events.emit('sceneFade', { dir: st.fade, s: dur });
        sc.t += dt;
        if (sc.t < dur) return;
        sc.t = 0;
        sc.i++;
        continue;
      }
      if ('look' in st) sc.look = st.look === 'player' ? null : { x: st.look[0] * T + T / 2, y: st.look[1] * T + T / 2 };
      else if ('banner' in st) this.banner(st.banner, 'cool');
      else if ('effect' in st) this.applyEffect(st.effect);
      sc.i++;
      this.events.emit('scene', {});
    }
  }

  /** Walking into an exit: ask the scene to travel (or say why it is closed). */
  private updateExits(dt: number): void {
    this.lockedSaidT = Math.max(0, this.lockedSaidT - dt);
    if (this.exiting || this.dead) return;
    const c = Math.floor(this.x / T);
    const r = Math.floor(this.y / T);
    const ex = this.regionDef.exits.find(e => c >= e.area[0] && c <= e.area[2] && r >= e.area[1] && r <= e.area[3]);
    if (!ex) {
      this.exitArmed = true;
      return;
    }
    if (!this.exitArmed) return;
    if (!this.check(ex.when)) {
      if (this.lockedSaidT <= 0) this.log(ex.locked ?? 'The way is closed.', 'h');
      this.lockedSaidT = 3;
      return;
    }
    this.exiting = ex;
    this.stopMoving();
    this.events.emit('exit', { to: ex.to, at: ex.at });
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
    if (this.gold < price) {
      this.log("You can't afford that.", 'h');
      return false;
    }
    if (this.addItem(id, 1) > 0) {
      this.log('Your bag is full.', 'h');
      return false;
    }
    this.gold -= price;
    this.log(`You buy the ${ITEMS[id].name.toLowerCase()} for ${price} gold.`, 'c');
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
    this.events.emit('bag', {});
    this.events.emit('trade', {});
    return true;
  }

  // ---------- crafting ----------
  /** The closest campfire or forge within reach, if any. */
  nearStation(kind: StructureKind): Structure | null {
    let best: Structure | null = null;
    let bd = STATION_REACH;
    for (const s of this.structures) {
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
    if (r.station !== 'hand' && !this.nearStation(r.station)) return `Stand at a ${STATION_NAMES[r.station].toLowerCase()}.`;
    for (const [id, n] of r.needs) {
      const have = this.count(id);
      if (have < n) return `Needs ${n - have} more ${ITEMS[id].name.toLowerCase()}.`;
    }
    if ('build' in r.makes && !this.buildSpot(r.makes.build)) return 'No room to build here.';
    return null;
  }

  /** Make a recipe: use up its ingredients, then hand over the item (or build the structure). */
  craft(id: string): boolean {
    const r = RECIPES.find(x => x.id === id);
    if (!r) return false;
    const why = this.craftProblem(r);
    if (why) {
      this.log(why, 'h');
      return false;
    }
    for (const [item, n] of r.needs) this.removeItem(item, n);
    this.atkAnimT = ATK_ANIM;
    if ('build' in r.makes) {
      const spot = this.buildSpot(r.makes.build);
      if (spot) this.build(r.makes.build, spot.c, spot.r);
      return true;
    }
    const { item, n = 1 } = r.makes;
    const left = this.addItem(item, n);
    for (let k = 0; k < left; k++) this.spawnDrop(this.x, this.y, item);
    const at = r.station === 'hand' ? this : (this.nearStation(r.station) ?? this);
    this.face = at.x < this.x ? -1 : at.x > this.x ? 1 : this.face;
    this.burst(at.x, at.y - 10, 8, r.station === 'hand' ? '#f2c14e' : '#ffa040', 60, 0.5, 2, -40);
    const name = ITEMS[item].name;
    this.floater(this.x, this.y - 28, `+${n} ${name}`, 'name', ITEMS[item].col);
    const a = /^[aeiou]/i.test(name) ? 'an' : 'a';
    const what = r.station === 'campfire' ? `You cook the ${ITEMS[r.needs[0][0]].name.toLowerCase()}.` : `You ${item.endsWith('_bar') ? 'smelt' : r.station === 'forge' ? 'forge' : 'make'} ${a} ${name.toLowerCase()}.`;
    this.log(what, 'c');
    this.questEvent('craft', r.id);
    this.gainXp(XP_FOR.craft);
    return true;
  }

  /** A free tile next to the player to build on, preferring the side they face. */
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
    const t = MAP[r]?.[c];
    if (t !== Tile.Grass && t !== Tile.Dirt && t !== Tile.Flower && t !== Tile.Floor) return false;
    // not on top of another structure, a person or a rock
    if (this.structures.some(s => s.c === c && s.r === r) || tileObstructed(c, r)) return false;
    // a solid forge must not land on top of the player
    if (STRUCTURES[kind].solid) {
      const dx = Math.max(0, Math.abs(c * T + T / 2 - this.x) - 9);
      const dy = Math.max(0, Math.abs(r * T + T / 2 - this.y) - 8);
      if (dx * dx + dy * dy < 14 * 14) return false;
    }
    return true;
  }

  private build(kind: StructureKind, c: number, r: number): void {
    const x = c * T + T / 2;
    const y = r * T + T / 2;
    const def = STRUCTURES[kind];
    this.structures.push({ id: this.nextStructure++, kind, c, r, x, y, t: def.burn });
    if (def.solid) setBlocker(c, r, { x, y, r: 10 });
    this.face = x < this.x ? -1 : 1;
    this.burst(x, y - 8, 12, kind === 'campfire' ? '#ffb03c' : '#a8aeb8', 70, 0.6, 2, -40);
    this.log(kind === 'campfire' ? 'You build a campfire. Cook raw food at it.' : 'You build a forge. Smelt ore and smith gear at it.', 'c');
    this.events.emit('bag', {});
    this.questEvent('build', kind);
    this.gainXp(XP_FOR.build, x, y);
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
      if (!s.level || s.level <= before || s.level > this.level) continue;
      const slot = this.placeSpell(k);
      const name = isSkill(k) ? SKILLS[k].n : ACTIONS[k].n;
      this.log(`New spell: ${name}${slot >= 0 ? ` (on your bar, key ${BAR_KEYS[slot].bind})` : ''}. See your spellbook (P).`, 't');
    }
    this.applyGear();
    this.hp = this.hpMax;
    this.mp = this.mpMax;
    this.banner(`LEVEL ${this.level}!`, 'cool');
    this.log(`You reach level ${this.level}. You have a talent point to spend (N).`, 'c');
    this.addFx({ type: 'ring', x: this.x, y: this.y - 8, r0: 10, r1: 60, col: '#c8a8ff', lw: 4, dur: 0.7 });
    this.burst(this.x, this.y - 14, 22, '#c8a8ff', 90, 1, 3, -80);
    this.events.emit('level', {});
  }

  /** Points spent, in one tree or in all. */
  talentsSpent(tree?: TreeId): number {
    let n = 0;
    for (const [id, r] of Object.entries(this.talents)) if (!tree || TALENTS[id].tree === tree) n += r;
    return n;
  }

  /** Points still to spend (one per level above 1). */
  get talentPoints(): number {
    return this.level - 1 - this.talentsSpent();
  }

  /** Why a talent can't take another rank now, or null if it can. */
  talentProblem(id: string): string | null {
    const t = TALENTS[id];
    if ((this.talents[id] ?? 0) >= t.ranks) return 'Fully learned.';
    const need = t.tier * TIER_POINTS;
    if (this.talentsSpent(t.tree) < need) return `Requires ${need} points in ${TREES[t.tree].name}.`;
    if (t.requires && (this.talents[t.requires] ?? 0) < TALENTS[t.requires].ranks) {
      const req = TALENTS[t.requires];
      return `Requires ${req.ranks}/${req.ranks} in ${req.name}.`;
    }
    if (this.talentPoints <= 0) return 'No talent points left. Gain a level to earn one.';
    return null;
  }

  learnTalent(id: string): boolean {
    if (this.talentProblem(id)) return false;
    this.talents[id] = (this.talents[id] ?? 0) + 1;
    this.applyTalents();
    const t = TALENTS[id];
    if (t.grants) {
      const slot = this.placeSpell(t.grants);
      this.log(`New ability: ${ACTIONS[t.grants].n}${slot >= 0 ? ` (on your bar, key ${BAR_KEYS[slot].bind})` : ''}.`, 'c');
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
  private applyTalents(): void {
    const fx = { ...NO_FX };
    for (const [id, r] of Object.entries(this.talents)) {
      for (const [k, v] of Object.entries(TALENTS[id].fx) as [keyof TalentFx, number][]) fx[k] += v * r;
    }
    this.tal = fx;
    this.applyGear();
    this.events.emit('talents', {});
  }

  // ---------- people and quests ----------
  /** Walk up to an NPC and talk (the game opens the dialog on the 'talk' event). */
  talkTo(id: NpcId): void {
    if (this.dead) return;
    const n = this.npcs.find(x => x.id === id);
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
    const n = this.npcs.find(x => x.id === id);
    return !!n && !this.dead && Math.hypot(n.x - this.x, n.y - this.y) <= TALK_REACH + 24;
  }

  private updateTalk(): void {
    const id = this.talkTarget;
    if (!id || this.path) return;
    this.talkTarget = null;
    const n = this.npcs.find(x => x.id === id);
    if (!n || Math.hypot(n.x - this.x, n.y - this.y) > TALK_REACH + 4) return;
    this.face = n.x < this.x ? -1 : 1;
    this.events.emit('talk', { npc: id });
  }

  /** How far along goal `i` of a quest is (bag contents and flags count live). */
  goalCount(id: string, i: number): number {
    const g = QUESTS[id].goals[i];
    const q = this.quests[id];
    if (!q) return 0;
    if (q.state === 'done') return goalTarget(g);
    if (g.kind === 'collect') return Math.min(this.count(g.item), g.n);
    if (g.kind === 'flag') return (this.flags[g.flag] ?? 0) > 0 ? 1 : 0;
    return q.count[i] ?? 0;
  }

  /** Where a quest stands for the player. */
  questStatus(id: string): QuestStatus {
    const q = this.quests[id];
    const def = QUESTS[id];
    if (q?.state === 'done') return 'done';
    if (q) return def.goals.every((g, i) => this.goalCount(id, i) >= goalTarget(g)) ? 'ready' : 'active';
    if (def.requires && this.quests[def.requires]?.state !== 'done') return 'locked';
    return check(this, def.when) ? 'available' : 'locked';
  }

  /** Who a quest is handed in to. */
  turnInOf(id: string): NpcId {
    return QUESTS[id].turnIn ?? QUESTS[id].giver;
  }

  /** Quests an NPC has something to do with: ones they give, and ones handed in to them. */
  questsOf(npc: NpcId): { id: string; status: QuestStatus }[] {
    return QUEST_IDS.filter(id => QUESTS[id].giver === npc || this.turnInOf(id) === npc)
      .map(id => ({ id, status: this.questStatus(id) }))
      .filter(q => (q.status === 'ready' ? this.turnInOf(q.id) === npc : QUESTS[q.id].giver === npc));
  }

  /** What floats over an NPC: ? (something to hand in), ! (a new quest), … (you are on it). */
  npcMark(npc: NpcId): '?' | '!' | '…' | null {
    const qs = this.questsOf(npc);
    if (qs.some(q => q.status === 'ready')) return '?';
    if (qs.some(q => q.status === 'available')) return '!';
    if (qs.some(q => q.status === 'active')) return '…';
    return null;
  }

  acceptQuest(id: string): void {
    if (this.questStatus(id) !== 'available') return;
    this.quests[id] = { state: 'active', count: QUESTS[id].goals.map(() => 0) };
    this.log(`New quest: ${QUESTS[id].name}.`, 'c');
    this.events.emit('quests', {});
    this.applyEffect(QUESTS[id].onAccept);
  }

  /** Hand a finished quest in (you must be next to whoever takes it). */
  completeQuest(id: string): boolean {
    const def = QUESTS[id];
    if (this.questStatus(id) !== 'ready' || !this.nearNpc(this.turnInOf(id))) return false;
    for (const g of def.goals) if (g.kind === 'collect' && g.take) this.removeItem(g.item, g.n);
    this.quests[id].state = 'done';
    this.gold += def.reward.gold;
    this.gainXp(def.reward.xp);
    for (const item of def.reward.items) if (this.addItem(item, 1)) this.spawnDrop(this.x, this.y, item);
    for (const d of def.reward.docs ?? []) this.findDoc(d);
    const got = [def.reward.gold ? `${def.reward.gold} gold` : '', def.reward.xp ? `${def.reward.xp} XP` : '', ...def.reward.items.map(i => ITEMS[i].name.toLowerCase())].filter(Boolean).join(', ');
    this.banner('QUEST COMPLETE');
    this.log(`Quest complete: ${def.name}.${got ? ` You receive ${got}.` : ''}`, 'c');
    this.burst(this.x, this.y - 18, 16, '#f2c14e', 80, 0.8, 3, -60);
    this.events.emit('quests', {});
    this.applyEffect(def.onDone);
    return true;
  }

  /** You spoke to someone: their first-meeting effects, and any quest that wanted it. */
  talked(id: NpcId): boolean {
    const first = !this.met.has(id);
    if (first) {
      this.met.add(id);
      this.applyEffect(NPCS[id].onMeet);
    }
    this.questEvent('talk', id);
    return first;
  }

  /** Progress active quests: a kill, a craft, a build, a talk, something used. */
  private questEvent(kind: 'kill' | 'craft' | 'build' | 'talk' | 'interact', key: string, sub = ''): void {
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
          (g.kind === 'interact' && kind === 'interact' && ('object' in g ? g.object === key : g.objectKind === sub));
        if (hit && q.count[i] < goalTarget(g)) {
          q.count[i]++;
          changed = true;
        }
      });
      if (before === 'active' && this.questStatus(id) === 'ready') {
        this.log(`${QUESTS[id].name}: done! Return to ${NPCS[this.turnInOf(id)].name}.`, 'c');
        this.lastStatus.set(id, 'ready');
      }
    }
    if (changed) this.events.emit('quests', {});
  }

  /**
   * Collect and flag goals change with your bag and the story, not with quest events:
   * notice when one of those makes a quest ready (or not), and tell everyone.
   */
  private readonly lastStatus = new Map<string, QuestStatus>();
  private watchQuests(): void {
    let changed = false;
    for (const id of Object.keys(this.quests)) {
      if (this.quests[id].state !== 'active') continue;
      const st = this.questStatus(id);
      const before = this.lastStatus.get(id);
      if (before && before !== st) {
        changed = true;
        if (st === 'ready') this.log(`${QUESTS[id].name}: done! Return to ${NPCS[this.turnInOf(id)].name}.`, 'c');
      }
      this.lastStatus.set(id, st);
    }
    if (changed) this.events.emit('quests', {});
  }

  /** Reach goals: being close enough to the place counts. */
  private updateQuestPlaces(): void {
    for (const id of Object.keys(this.quests)) {
      const q = this.quests[id];
      if (q.state !== 'active') continue;
      QUESTS[id].goals.forEach((g, i) => {
        if (g.kind !== 'reach' || q.count[i] >= 1) return;
        if (g.region && g.region !== this.region) return;
        const gx = g.at ? g.at[0] * T + T / 2 : (g.x ?? 0);
        const gy = g.at ? g.at[1] * T + T / 2 : (g.y ?? 0);
        if (Math.hypot(gx - this.x, gy - this.y) > g.r) return;
        q.count[i] = 1;
        this.log(`${QUESTS[id].name}: you have found it.`, 'c');
        this.events.emit('quests', {});
      });
    }
  }

  /** Campfires burn down and go out. */
  private updateStructures(dt: number): void {
    let gone = false;
    for (const s of this.structures) {
      if (s.t === Infinity) continue;
      s.t -= dt;
      if (s.t > 0) continue;
      gone = true;
      this.burst(s.x, s.y - 6, 10, '#8a8a8a', 30, 0.9, 2, -50);
      if (Math.hypot(s.x - this.x, s.y - this.y) < 220) this.log('The campfire burns out.', 'h');
    }
    if (!gone) return;
    this.structures = this.structures.filter(s => s.t > 0);
    this.events.emit('bag', {});
  }

  // ---------- equipment ----------
  /** Wear the gear in a bag slot; whatever was in that equipment slot goes back to the bag. */
  equipFromBag(i: number): void {
    const s = this.bag[i];
    if (!s || this.dead) return;
    const slot = ITEMS[s.id].slot;
    if (!slot) return;
    const old = this.equip[slot];
    this.equip[slot] = s.id;
    s.n--;
    this.bag[i] = s.n > 0 ? s : null;
    if (old) {
      if (!this.bag[i]) this.bag[i] = { id: old, n: 1 };
      else if (this.addItem(old, 1)) this.spawnDrop(this.x, this.y, old);
    }
    this.applyGear();
    this.log(`You equip the ${ITEMS[s.id].name.toLowerCase()}.`);
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
    this.events.emit('bag', {});
  }

  /** Recompute gear totals; max health follows (current health keeps its share). */
  private applyGear(): void {
    const g: Stats = { ...NO_STATS };
    for (const slot of SLOTS) {
      const id = this.equip[slot];
      const st = id ? ITEMS[id].stats : undefined;
      if (!st) continue;
      for (const k of Object.keys(g) as (keyof Stats)[]) g[k] += st[k] ?? 0;
    }
    this.gear = g;
    const max = 140 + HP_PER_LEVEL * (this.level - 1) + g.hp + this.tal.hp;
    if (this.hpMax !== max) {
      this.hp = Math.min(max, Math.round((this.hp * max) / Math.max(1, this.hpMax)));
      this.hpMax = max;
    }
  }

  /** Dev: a random item pops out a few steps away (walk over it to pick it up). */
  dropRandomLoot(): void {
    if (this.dead) return;
    const ids = Object.keys(ITEMS) as ItemId[];
    const id = ids[Math.floor(this.rng.next() * ids.length)];
    // somewhere open around the player, so it lands where it can be reached (else at their feet)
    let x = this.x;
    let y = this.y;
    for (let tries = 0; tries < 8; tries++) {
      const a = this.rng.next() * Math.PI * 2;
      const tx = this.x + Math.cos(a) * 34;
      const ty = this.y + Math.sin(a) * 34;
      if (!blocked(tx, ty, 3, 3)) {
        x = tx;
        y = ty;
        break;
      }
    }
    this.spawnDrop(x, y, id);
    this.log(`Dev: dropped ${ITEMS[id].name.toLowerCase()}.`);
  }

  /** An item pops out of (x, y) with a little hop and lands nearby. */
  private spawnDrop(x: number, y: number, id: ItemId, n = 1): void {
    const a = this.rng.next() * Math.PI * 2;
    const sp = 18 + this.rng.next() * 22;
    this.drops.push({ id, n, x, y, z: 4, vz: 70 + this.rng.next() * 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0 });
  }

  private updateDrops(dt: number): void {
    if (!this.drops.length) return;
    for (const d of this.drops) {
      d.age += dt;
      if (d.z > 0 || d.vz > 0) {
        d.vz -= 260 * dt;
        d.z = Math.max(0, d.z + d.vz * dt);
        if (!blocked(d.x + d.vx * dt, d.y + d.vy * dt, 3, 3)) {
          d.x += d.vx * dt;
          d.y += d.vy * dt;
        }
        if (d.z === 0) d.vz = d.vx = d.vy = 0;
      }
    }
    // walk over a landed item to pick it up; uncollected items fade after three minutes
    const kept: Drop[] = [];
    for (const d of this.drops) {
      const near = !this.dead && d.z === 0 && d.age > 0.45 && Math.hypot(d.x - this.x, d.y - this.y) < 20;
      if (near) {
        const left = this.addItem(d.id, d.n);
        const got = d.n - left;
        if (got > 0) {
          this.floater(this.x, this.y - 28, `+${got} ${ITEMS[d.id].name}`, 'name', ITEMS[d.id].col);
          this.log(`Picked up ${got > 1 ? got + ' × ' : ''}${ITEMS[d.id].name.toLowerCase()}.`);
        } else if (d.age % 4 < dt) this.log('Your bag is full.', 'h');
        d.n = left;
      }
      if (d.n > 0 && d.age < 180) kept.push(d);
    }
    this.drops = kept;
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
    const d = Math.hypot(tree.x - this.x, tree.y - this.y);
    if (d > CHOP.reach) {
      // stand on the near side of the trunk
      const k = (CHOP.reach - 10) / Math.max(1, d);
      if (!this.moveTo(tree.x + (this.x - tree.x) * k, tree.y + (this.y - tree.y) * k)) return;
    }
    this.chopTree = tree;
    this.chopT = 0.2;
  }

  /** B: chop the closest standing tree or mine the closest rock within reach. */
  gatherNearest(): void {
    // something to use within reach comes first (a page, a notice board)
    let near: ObjectState | null = null;
    let od = TALK_REACH + 12;
    for (const o of this.objects) {
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
    for (const t of this.trees) {
      const d = Math.hypot(t.x - this.x, t.y - this.y);
      if (t.stumpT === 0 && d < bd) {
        bd = d;
        tree = t;
      }
    }
    for (const k of this.rocks) {
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

  private updateChop(dt: number): void {
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
    this.chopT -= dt;
    if (this.chopT > 0) return;
    // an axe speeds chopping up; bare-handed (or with a sword) every chop takes twice as long
    this.chopT = (this.gear.chop > 0 ? CHOP.period / (1 + this.gear.chop) : CHOP.period * CHOP.noTool) / (1 + this.tal.gather);
    this.face = tr.x < this.x ? -1 : 1;
    this.atkAnimT = ATK_ANIM;
    tr.hp--;
    tr.shakeT = 0.25;
    this.burst(tr.x, tr.y - 10, 6, '#c8a070', 70, 0.45, 2, 160);
    if (tr.hp > 0) return;
    // timber: the tree becomes a stump and drops its logs
    tr.stumpT = CHOP.regrow;
    tr.hp = CHOP.hits;
    this.chopTree = null;
    this.shake = 0.12;
    this.burst(tr.x, tr.y - 24, 16, '#62ae3e', 90, 0.7, 3, 120);
    const [lo, hi] = CHOP.logs;
    const n = lo + Math.floor(this.rng.next() * (hi - lo + 1));
    for (let k = 0; k < n; k++) this.spawnDrop(tr.x, tr.y - 4, 'log');
    if (this.rng.next() < this.tal.prospect) this.spawnDrop(tr.x, tr.y - 4, 'log');
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
    this.mineRock = rock;
    this.mineT = 0.2;
  }

  private updateMine(dt: number): void {
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
    this.mineT -= dt;
    if (this.mineT > 0) return;
    // a pickaxe speeds mining up; without one every swing takes three times as long
    this.mineT = (this.gear.mine > 0 ? MINE.period / (1 + this.gear.mine) : MINE.period * MINE.noTool) / (1 + this.tal.gather);
    this.face = rk.x < this.x ? -1 : 1;
    this.atkAnimT = ATK_ANIM;
    rk.hp--;
    rk.shakeT = 0.2;
    this.burst(rk.x, rk.y - 8, 6, '#c4cad4', 80, 0.4, 2, 200);
    if (rk.hp > 0) return;
    // the rock breaks into rubble and gives up its stone (and maybe ore)
    rk.brokenT = MINE.regrow;
    rk.hp = MINE.hits;
    setRockBroken(rk.c, rk.r, true);
    this.mineRock = null;
    this.shake = 0.14;
    this.burst(rk.x, rk.y - 6, 18, '#a8aeb8', 100, 0.6, 3, 180);
    const [lo, hi] = MINE.stone;
    const n = lo + Math.floor(this.rng.next() * (hi - lo + 1));
    for (let k = 0; k < n; k++) this.spawnDrop(rk.x, rk.y - 4, 'stone');
    const ore = this.rng.next() < MINE.ore;
    const gold = this.rng.next() < MINE.gold;
    if (ore) this.spawnDrop(rk.x, rk.y - 4, 'iron_ore');
    if (this.rng.next() < this.tal.prospect) this.spawnDrop(rk.x, rk.y - 4, 'iron_ore');
    this.gainXp(XP_FOR.rock, rk.x, rk.y - 6);
    if (gold) this.spawnDrop(rk.x, rk.y - 4, 'gold_nugget');
    this.log(gold ? 'The rock splits, and something glints inside!' : ore ? 'The rock breaks, showing a vein of iron.' : 'The rock breaks apart.', 'c');
  }

  private updateRocks(dt: number): void {
    for (const k of this.rocks) {
      if (k.shakeT > 0) k.shakeT = Math.max(0, k.shakeT - dt);
      if (k.brokenT <= 0) continue;
      k.brokenT = Math.max(0, k.brokenT - dt);
      if (k.brokenT > 0) continue;
      // grow back only when nobody is standing on the rubble
      setRockBroken(k.c, k.r, false);
      const inside = blocked(this.x, this.y, 9, 8) || this.enemies.some(e => e.alive && blocked(e.x, e.y, 6 * e.def.scale, 5 * e.def.scale));
      if (inside) {
        setRockBroken(k.c, k.r, true);
        k.brokenT = 2;
      } else this.burst(k.x, k.y - 6, 8, '#a8aeb8', 40, 0.5, 2, -30);
    }
  }

  private updateTrees(dt: number): void {
    for (const t of this.trees) {
      if (t.shakeT > 0) t.shakeT = Math.max(0, t.shakeT - dt);
      if (t.stumpT > 0) {
        t.stumpT = Math.max(0, t.stumpT - dt);
        if (t.stumpT === 0) this.burst(t.x, t.y - 12, 10, '#62ae3e', 50, 0.6, 2, -40);
      }
    }
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
    if (this.scene) return false;
    if (this.dead) return false;
    this.chopTree = null;
    this.mineRock = null;
    this.talkTarget = null;
    const path = findPath({ x: this.x, y: this.y }, { x, y }, 9, 8);
    if (!path) {
      if (marker) this.log("Can't get there.", 'h');
      return false;
    }
    this.path = path;
    this.stuckT = 0;
    if (marker) {
      const g = path[path.length - 1];
      this.addFx({ type: 'ring', x: g.x, y: g.y, r0: 16, r1: 4, col: '#f2c14e', lw: 2, dur: 0.35 });
    }
    return true;
  }

  stopMoving(): void {
    this.path = null;
    this.stuckT = 0;
  }

  /** Advance along the path. Returns the direction moved, or null if nothing moved. */
  private followPath(dt: number): { x: number; y: number } | null {
    const path = this.path;
    if (!path) return null;
    const spd = this.playerSpeed;
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
      const step = spd * isoSpeedFactor(ux, uy) * budget;
      if (step >= d && !blocked(w.x, w.y, 9, 8)) {
        // reach the waypoint exactly, then spend what's left on the next leg
        this.x = w.x;
        this.y = w.y;
        if (ux) this.face = ux < 0 ? -1 : 1;
        this.walk += budget * 10 * (d / step);
        budget *= 1 - d / step;
        path.shift();
        this.stuckT = 0;
        continue;
      }
      const x0 = this.x;
      const y0 = this.y;
      this.moveEntity(this, ux, uy, spd, budget, 9, 8);
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
    const m = this.lastMove ?? { x: this.face, y: 0 };
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
      if (blocked(nx, ny, 9, 8)) break;
      this.x = nx;
      this.y = ny;
    }
    this.addFx({ type: 'dash', x0, y0, x1: this.x, y1: this.y, face: this.face, dur: 0.3 });
    this.burst(x0, y0 + 4, 6, '#b8956a', 50, 0.4, 3, -20);
    this.log('You dodge.', 't');
  }

  // ---------- movement / AI ----------
  /** Move along unit direction (dx,dy). `spd` is screen pixels per second, see isoSpeedFactor. */
  private moveEntity(e: Movable, dx: number, dy: number, spd: number, dt: number, hw: number, hh: number): void {
    const v = spd * isoSpeedFactor(dx, dy) * dt;
    const nx = e.x + dx * v;
    const ny = e.y + dy * v;
    if (!blocked(nx, e.y, hw, hh)) e.x = nx;
    if (!blocked(e.x, ny, hw, hh)) e.y = ny;
    if (dx) e.face = dx < 0 ? -1 : 1;
    e.walk += dt * 10;
  }

  /** Night (or the Blackthorn is deep enough, ring 3 and on, that the dead walk anyway). */
  get isNight(): boolean {
    if ((this.regionDef?.ring ?? 0) >= 3) return true;
    const t = this.day.t;
    return t >= 0.8 || t < 0.23;
  }

  /** Bring a dead enemy back at its post (night creatures climb out of the ground). */
  private respawn(e: Enemy): void {
    Object.assign(e, this.spawnEnemy(e.kind, e.sx, e.sy));
    if (e.def.nightOnly) {
      e.riseT = RISE_DUR;
      this.burst(e.x, e.y + 2, 12, '#6b4a2b', 50, 0.6, 3, -30);
    }
  }

  /** Dawn: a night creature falls apart and goes back underground. No gold, no kill. */
  private crumble(e: Enemy): void {
    e.alive = false;
    e.dieT = 1;
    e.aggro = false;
    e.castT = -1;
    e.crumbleT = -1;
    e.respawnT = 0.5 + this.rng.next() * 4;
    if (this.target === e) {
      this.target = null;
      this.seqI = 0;
    }
    this.burst(e.x, e.y - 8, 16, '#e8e4d8', 60, 0.8, 2, 80);
  }

  /** Amble around home, idling about half the time. */
  private wander(e: Enemy, dt: number, hw: number, hh: number, speedK: number): void {
    e.tele = false;
    e.wanderT -= dt;
    if (e.wanderT <= 0) {
      e.wanderT = 1 + this.rng.next() * 2.5;
      if (this.rng.next() < 0.5 || Math.hypot(e.x - e.sx, e.y - e.sy) > 90) {
        const a = Math.atan2(e.sy - e.y, e.sx - e.x) + (this.rng.next() - 0.5) * 2;
        e.wx = Math.cos(a);
        e.wy = Math.sin(a);
      } else {
        e.wx = 0;
        e.wy = 0;
      }
    }
    if (e.wx || e.wy) this.moveEntity(e, e.wx, e.wy, e.def.spd * speedK, dt, hw, hh);
    else e.walk = 0;
  }

  private updateEnemy(e: Enemy, dt: number): void {
    e.flash = Math.max(0, e.flash - dt);
    const k = e.def;
    const nightBound = !!k.nightOnly && !e.temp;
    if (!e.alive) {
      if (e.dieT > 0) e.dieT -= dt;
      if (e.temp || e.def.boss) return; // dev spawns are removed once faded; bosses stay dead
      if (nightBound && !this.isNight) return; // stay underground until dusk
      e.respawnT -= dt;
      if (e.respawnT <= 0) this.respawn(e);
      return;
    }
    if (nightBound && !this.isNight) {
      if (e.crumbleT < 0) e.crumbleT = this.rng.next() * 3;
      e.crumbleT -= dt;
      if (e.crumbleT <= 0) {
        this.crumble(e);
        return;
      }
    }
    if (e.riseT > 0) {
      e.riseT -= dt;
      return;
    }
    if (this.dead) {
      e.aggro = false;
      e.castT = -1;
    }
    if (this.cheats.freezeEnemies) {
      e.tele = false;
      e.walk = 0;
      return;
    }
    const d = this.dist(this, e);
    const hw = 6 * k.scale;
    const hh = 5 * k.scale;
    if (e.stunT > 0) {
      e.stunT -= dt;
      return;
    }
    if (k.behavior === 'passive') {
      if (e.fleeT > 0) {
        e.fleeT -= dt;
        const dd = d || 1;
        this.moveEntity(e, (e.x - this.x) / dd, (e.y - this.y) / dd, k.spd * 1.8, dt, hw, hh);
      } else this.wander(e, dt, hw, hh, 0.5);
      return;
    }
    if (e.castT > 0) {
      e.castT -= dt;
      if (e.castT <= 0) {
        const far = d >= (k.castRange ?? 0) + 50;
        this.addFx({
          type: 'fireball', x0: e.x, y0: e.y - 12, x1: this.x, y1: this.y - 8, dur: 0.35,
          onEnd: () => {
            this.burst(this.x, this.y - 8, 12, '#a78bfa', 100, 0.4, 3, 60);
            this.addFx({ type: 'ring', x: this.x, y: this.y - 8, r0: 6, r1: 34, col: '#a78bfa', dur: 0.3 });
            if (!far) this.dmgPlayer(k.n === 'Ogre' ? 14 : 10, 'the fireball');
            else this.log('The fireball misses.', 't');
          },
        });
        e.castCd = 7;
      }
      return;
    }
    if (!e.aggro && !this.dead && k.behavior === 'hostile' && d < k.aggro) e.aggro = true;
    if (e.kind === 'bellringer' && this.bellRinger(e, dt)) return;
    if (e.aggro) {
      if (Math.hypot(e.x - e.sx, e.y - e.sy) > 380) {
        e.aggro = false;
        e.hp = e.hpMax;
        this.log(e.n + ' returns to its post.');
        return;
      }
      // neutral creatures give up once you're out of reach
      if (k.behavior === 'neutral' && d > k.aggro) {
        e.aggro = false;
        e.tele = false;
        this.log(e.n + ' loses interest.');
        return;
      }
      e.castCd -= dt;
      if (k.cast && e.castCd <= 0 && d < (k.castRange ?? 0) && d > 50) {
        e.castT = e.castTotal;
        e.tele = false;
        this.log(e.n + ' casts Fireball…', 'h');
        return;
      }
      if (d > k.range) {
        e.tele = false;
        e.atkT = Math.min(e.atkT, k.per);
        this.moveEntity(e, (this.x - e.x) / d, (this.y - e.y) / d, k.spd, dt, hw, hh);
      } else {
        e.face = this.x < e.x ? -1 : 1;
        e.atkT -= dt;
        if (e.atkT <= 0.7) e.tele = true;
        if (e.atkT <= 0) {
          if (this.dist(this, e) < k.range + 14) this.dmgPlayer(k.atk, "the " + e.n + "'s hit");
          else this.log(e.n + ' hits the air.', 't');
          e.atkT = k.per;
          e.tele = false;
        }
      }
    } else this.wander(e, dt, hw, hh, 0.4);
  }

  /** Dev: drop a creature of any kind a short walk from the player. */
  spawnNear(kind: EnemyKind): void {
    const k = KINDS[kind];
    for (let i = 0; i < 16; i++) {
      const a = this.rng.next() * Math.PI * 2;
      const r = 70 + this.rng.next() * 40;
      const x = this.x + Math.cos(a) * r;
      const y = this.y + Math.sin(a) * r;
      if (blocked(x, y, 6 * k.scale, 5 * k.scale)) continue;
      const e = this.spawnEnemy(kind, x, y, true);
      if (k.nightOnly) e.riseT = RISE_DUR;
      this.enemies.push(e);
      this.burst(x, y + 2, 10, '#b8956a', 60, 0.5, 3, -20);
      this.log(k.n + ' appears.');
      return;
    }
    this.log('No room to spawn here.', 'h');
  }

  // ---------- main tick ----------
  /** Advance the simulation by `rawDt` seconds (already clamped by the caller). */
  tick(rawDt: number): void {
    const dt = rawDt * this.timeScale;
    this.day.advance(dt);
    this.t += dt;
    this.mp = Math.min(this.mpMax, this.mp + 3 * dt);
    if (this.tal.regen && !this.dead && this.hp < this.hpMax) this.hp = Math.min(this.hpMax, this.hp + this.tal.regen * dt);
    this.lastWardenCd = Math.max(0, this.lastWardenCd - dt);
    this.berserkT = Math.max(0, this.berserkT - dt);
    this.lastStandT = Math.max(0, this.lastStandT - dt);
    for (const k of Object.keys(this.acd) as ActionKey[]) this.acd[k] = Math.max(0, (this.acd[k] ?? 0) - dt);
    for (const e of this.enemies) if (e.sunderT > 0) e.sunderT = Math.max(0, e.sunderT - dt);
    this.buffT = Math.max(0, this.buffT - dt);
    this.invT = Math.max(0, this.invT - dt);
    this.dodgeCd = Math.max(0, this.dodgeCd - dt);
    this.mortalCd = Math.max(0, this.mortalCd - dt);
    this.intCd = Math.max(0, this.intCd - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.shake = Math.max(0, this.shake - dt);
    this.swing = Math.max(0, this.swing - dt);
    this.atkAnimT = Math.max(0, this.atkAnimT - dt);
    for (const k of Object.keys(this.cds) as SkillKey[]) this.cds[k] = Math.max(0, (this.cds[k] ?? 0) - dt);
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
        this.placeAt(this.regionDef.spots.start);
        this.target = null;
        this.stopMoving();
        this.events.emit('respawned', {});
        this.log('You respawn on the road.');
      }
    }

    // movement: keyboard (screen-space, converted to the ground plane) wins over click-to-move
    let mx = 0;
    let my = 0;
    const keyboard = !this.exiting && !this.scene && (this.inputMove.x !== 0 || this.inputMove.y !== 0);
    if (keyboard) {
      if (this.path) this.stopMoving();
      this.chopTree = null;
      this.mineRock = null;
      const d = isoDir(this.inputMove.x, this.inputMove.y);
      mx = d.x;
      my = d.y;
      if (!this.dead) this.moveEntity(this, mx, my, this.playerSpeed, dt, 9, 8);
    } else if (this.path && !this.dead) {
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
    if (this.mountT > 0) {
      this.mountT -= dt;
      if (mx || my) {
        this.mountT = 0;
        this.log('Stand still to mount.', 'h');
      } else if (this.mountT <= 0) this.finishMount();
    }

    // auto attack
    const tg = this.target;
    if (tg && !tg.alive) this.target = null;
    if (!this.dead && !this.mounted && tg && tg.alive) {
      const d = this.dist(this, tg);
      if (d < AA_RANGE) {
        this.aaT -= dt;
        if (this.aaT <= 0) {
          this.aaT = AA_PERIOD / (1 + this.tal.aaSpeed) / (this.berserkT > 0 ? 1.5 : 1);
          this.face = tg.x < this.x ? -1 : 1;
          this.addFx({ type: 'swing', x: this.x, y: this.y, face: this.face, dur: 0.18 });
          this.atkAnimT = ATK_ANIM;
          this.addFx({ type: 'hit', x: tg.x, y: tg.y - 6, col: '#d3dcea', dur: 0.18 });
          const crit = this.rng.next() < this.tal.crit;
          this.dmgEnemy(tg, Math.round((3 + this.tal.aaDmg) * this.dmgMult() * (crit ? this.critMult : 1)), crit ? 'crit' : 'aa');
          if (crit && this.tal.critBleed && tg.alive) this.bleedT = Math.max(this.bleedT, this.tal.critBleed);
        }
      } else this.aaT = Math.min(this.aaT, 0.4);
    }

    this.eatCd = Math.max(0, this.eatCd - dt);
    this.updateDrops(dt);
    this.updateTrees(dt);
    this.updateChop(dt);
    this.updateRocks(dt);
    this.updateStructures(dt);
    this.updateTalk();
    this.updateUse();
    this.updateQuestPlaces();
    this.watchQuests();
    this.updateExits(dt);
    this.updateScene(dt);
    this.updateMine(dt);

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

    const night = this.isNight;
    if (night !== this.wasNight) {
      this.wasNight = night;
      this.log(night ? 'Night falls. The dead are stirring…' : 'Dawn breaks. The dead return to the earth.', night ? 'h' : 't');
    }
    // during a scene the fighting waits
    if (!this.scene) for (const e of this.enemies) this.updateEnemy(e, dt);
    if (this.enemies.some(e => e.temp && !e.alive && e.dieT <= 0)) this.enemies = this.enemies.filter(e => !(e.temp && !e.alive && e.dieT <= 0));
    if (!this.scene) this.updateHazards(dt);
    this.updateWanderers(dt);
    this.updateStory(dt);
    this.updateFx(dt);

    // Rev auto: fires the next step by itself once the GCD has been up for a moment
    if (this.rev && this.revAuto && !this.dead && !this.mounted && this.mountT <= 0 && this.t >= GCD + 0.45 && this.target && this.target.alive) {
      this.revFire(false);
      this.t = Math.min(this.t, GCD);
    }
  }
}

/** How close (world px) you stand to talk to someone. */
export const TALK_REACH = 34;

/** A goal's count to reach (a place counts once). */
export function goalTarget(g: { kind: string; n?: number }): number {
  return g.kind === 'kill' || g.kind === 'craft' || g.kind === 'build' || g.kind === 'collect' || g.kind === 'interact' ? (g.n ?? 1) : 1;
}

/** Someone standing on a tile; each is solid, like a rock. */
function placeNpc(id: NpcId, [c, r]: [number, number]): NpcState {
  const x = c * T + T / 2;
  const y = r * T + T / 2;
  setBlocker(c, r, { x, y, r: 7 });
  return { id, x, y, face: -1 };
}

/** One RockState per rock tile on the map. */
function buildRocks(): RockState[] {
  const out: RockState[] = [];
  MAP.forEach((row, r) =>
    row.forEach((t, c) => {
      if (t === Tile.Rock) out.push({ c, r, ...rockCentre(c, r), hp: MINE.hits, brokenT: 0, shakeT: 0 });
    })
  );
  return out;
}

/** One TreeState per tree tile on the map. */
function buildTrees(): TreeState[] {
  const out: TreeState[] = [];
  MAP.forEach((row, r) =>
    row.forEach((t, c) => {
      if (t === Tile.Tree) out.push({ c, r, x: c * T + T / 2, y: r * T + T / 2, hp: CHOP.hits, stumpT: 0, shakeT: 0 });
    })
  );
  return out;
}
