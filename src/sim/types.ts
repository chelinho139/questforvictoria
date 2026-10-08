import type { PropKind } from '../data/props';
import type { ItemId } from '../data/items';
import type { StructureKind } from '../data/crafting';
import type { NpcId } from '../data/npcs';
import type { EnemyDef, EnemyKind, CreatureSound, HeldKind } from '../data/enemies';
import type { SkillKey, ActionKey, Key, WheelKey } from '../data/skills';
import type { ObjectKind } from '../data/regions/types';
import type { SpellKey } from '../data/spells';
import type { TreeKind } from '../data/trees';

export interface Enemy {
  /** Unique in its region (the network names creatures by it). */
  id: number;
  kind: EnemyKind;
  def: EnemyDef;
  n: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  hp: number;
  hpMax: number;
  aggro: boolean;
  wanderT: number;
  wx: number;
  wy: number;
  atkT: number;
  tele: boolean;
  castT: number;
  castTotal: number;
  castCd: number;
  stunT: number;
  /** Sundered: takes 20% more damage from the player for this long. */
  sunderT: number;
  alive: boolean;
  respawnT: number;
  dieT: number;
  flash: number;
  face: 1 | -1;
  walk: number;
  /** Seconds left of climbing out of the ground (night-only creatures). */
  riseT: number;
  /** Countdown to crumbling at dawn; -1 when not scheduled. */
  crumbleT: number;
  /** Seconds left of running away (passive creatures). */
  fleeT: number;
  /** Spawned from the dev menu: removed when it dies instead of respawning. */
  temp: boolean;
  /** Bosses: which phase it is in (0 first; see EnemyDef.boss.phases). */
  phase: number;
  /** The hero it is after (a hero id), while aggro. */
  foe?: string;
  /** Slowed (Concussive Shot, Pinning Shots): moves slowK slower for slowT seconds. */
  slowT: number;
  slowK: number;
  /** Held fast by a bear trap: can't move, can still swing. */
  rootT: number;
  /** Hunter's Mark: for markT seconds the hero markBy deals markK more damage to it. */
  markT: number;
  markBy: string;
  markK: number;
  /** Hit lately: keeps after whoever hit it, however far away they shot from. */
  angerT: number;
  /**
   * Gave up a chase and is walking back to its post: seconds left before it is simply there
   * (0 when it isn't). Meanwhile nothing touches it, and it heals as it goes.
   */
  homeT: number;
  /** Its way back, a few straight legs (pathfind.ts). */
  homePath?: { x: number; y: number }[];
  /** The Bell-Ringer: seconds to the next toll, and tolls so far. */
  tollT?: number;
  tollN?: number;
  /** The spell under way while castT > 0 (an index into its def's `casts`). */
  casting?: number;
  /** Shields up: seconds left raised, and seconds until it raises it again. */
  shieldT?: number;
  shieldCd?: number;
  /** An ambusher still waiting unseen in the canopy. */
  hid?: boolean;
  /** Height above the ground (dropping out of the canopy, in the air on a leap), px. */
  z?: number;
  /** A leap: seconds into it, the crouch and the flight, from where to where, and at whom. */
  leap?: { t: number; wind: number; dur: number; x0: number; y0: number; x1: number; y1: number; at: string };
  leapCd?: number;
  snareCd?: number;
  /** An egg hatching: seconds left (undefined while it sleeps). */
  hatchT?: number;
  summonCd?: number;
  /** Where a lure drifts to (its spawn's `to`), and how soon it can blink again. */
  lx?: number;
  ly?: number;
  blinkCd?: number;
  /** A smotherer: the fire it is going for (a structure id), and how long it has lain on it. */
  fire?: number;
  smotherT?: number;
  /** Lying down on a fire. */
  lying?: boolean;
  /** Sir Garrick: cuts since his last lunge; a lunge under way (the step back, then the thrust); his shield gone in the river. */
  cuts?: number;
  lunge?: { t: number; wind: number; dur: number; dx: number; dy: number; hit: boolean };
  shieldGone?: boolean;
  /** A lure that has led someone to its place, and the graves there have opened. */
  opened?: boolean;
}

/**
 * Someone a creature can fight: a hero, or a companion walking with them (sim/Companion.ts).
 * `dead` is above 0 while they are down (a hero's death screen, a companion on one knee).
 */
export interface Foe {
  readonly id: string;
  x: number;
  y: number;
  regionId: string;
  dead: number;
  hiddenT: number;
  /** Jumping clear of the ground (rings of force and snares pass under). */
  readonly airborne: boolean;
  hurt(v: number, src: string): void;
  log(text: string, cls?: LogClass): void;
  /** Held still (a web, a net, a snare, roots) for `t` seconds. */
  hold(t: number, by: HeldKind): void;
  /** Let go, if it is `by` that holds them. */
  free(by: HeldKind): void;
  /** Slowed by `k` (0.3 = 30% slower) for `t` seconds. */
  slow(t: number, k: number): void;
}

/** A snare a goblin trapper laid in the grass: whoever steps in it is held `hold` seconds. */
export interface Snare {
  id: number;
  x: number;
  y: number;
  hold: number;
  /** The creature that laid it (an enemy id). */
  by: number;
  /** Seconds before it is gone unsprung. */
  t: number;
}

/** One of the dead who fell lately (the Thane's song raises them where they fell). */
export interface Fallen {
  kind: EnemyKind;
  x: number;
  y: number;
  /** Seconds since it fell. */
  t: number;
}

/** A bear trap an archer set: the first creature to step on it is held `hold` seconds. */
export interface Trap {
  id: number;
  x: number;
  y: number;
  /** The archer who set it (a hero id): the damage is theirs. */
  owner: string;
  /** Seconds before it rusts away unsprung. */
  t: number;
  hold: number;
}

/** A ring of force spreading out from a point (the Bell-Ringer's tolls): jump it. */
export interface Hazard {
  x: number;
  y: number;
  r: number;
  speed: number;
  max: number;
  dmg: number;
  hit: boolean;
  what: string;
}

/** A wanderer in the world (the grey postman). */
export interface WandererState {
  id: 'postman' | 'lantern';
  x: number;
  y: number;
  /** Index of the route point it walks to. */
  i: number;
  /** 0 gone, 1 fully there. */
  alpha: number;
  /** Seconds left away after fading (it reappears further along). */
  goneT: number;
  face: 1 | -1;
  walk: number;
}

/** Visual effect record. Pure data; the renderer decides how to draw each type. */
export interface Fx {
  type:
    | 'stab'
    | 'slash'
    | 'whirl'
    | 'shout'
    | 'dash'
    | 'bolt'
    | 'xslash'
    | 'shield'
    | 'ring'
    | 'fireball'
    | 'hit'
    | 'swing'
    | 'arrow';
  t: number;
  dur: number;
  x?: number;
  y?: number;
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;
  col?: string;
  rot?: number;
  double?: boolean;
  r?: number;
  r0?: number;
  r1?: number;
  lw?: number;
  pts?: [number, number][];
  face?: 1 | -1;
  onEnd?: () => void;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  col: string;
  size: number;
  g: number;
}

export type ButtonId = 1 | 2;

/** One bag slot's contents. */
export interface Stack {
  id: ItemId;
  n: number;
}

/** Items lying on the ground, popping out with a little arc when dropped. */
export interface Drop {
  /** Unique in its region. */
  uid: number;
  /** Who may pick it up (personal loot): a hero id, or '' for anyone. */
  owner: string;
  id: ItemId;
  n: number;
  x: number;
  y: number;
  /** Height above the ground and vertical speed (the pop), and ground velocity. */
  z: number;
  vz: number;
  vx: number;
  vy: number;
  /** Seconds since it dropped. */
  age: number;
}

/** A tree that can be chopped: standing (stumpT 0) or a stump regrowing. */
/** Something built in the world (a campfire or a forge), standing on a tile. */
export interface Structure {
  id: number;
  kind: StructureKind;
  c: number;
  r: number;
  x: number;
  y: number;
  /** Seconds left before it is gone (a campfire burning down); Infinity for a forge. */
  t: number;
  /** Placed by the region (a kiln, a camp's fire), not built: never saved, and back as it was when the region is. */
  fixed?: boolean;
  /** A fire that has been put out (a kiln smothered). */
  out?: boolean;
  /** How far a smotherer lying on it has got (0–1). */
  smother?: number;
}

/** What a hero is busy with, for the progress bar over their head. */
export interface Work {
  kind: 'chop' | 'mine' | 'make';
  /** How far along: the tree felled, the rock broken, the thing made (0–1). */
  p: number;
  /** The recipe being made. */
  recipe?: string;
}

/** An object you can use in the world (data/regions RegionObject). */
export interface ObjectState {
  id: string;
  kind: ObjectKind;
  name: string;
  c: number;
  r: number;
  x: number;
  y: number;
}

/** A line spoken in a scene. */
export interface SceneLine {
  who: string;
  text: string;
  /** Said aloud, in the speaker's voice (only the lines that matter are). */
  voice?: boolean;
}

/** A building or big prop standing in the region (data/props.ts); (c, r) is its north corner. */
export interface PropState {
  kind: PropKind;
  c: number;
  r: number;
}

/** Someone standing in the world. */
export interface NpcState {
  id: NpcId;
  x: number;
  y: number;
  /** -1 faces left, 1 faces right (they turn to look at you). */
  face: number;
}

/** A quest you have taken: progress per goal, and whether it was handed in. */
export interface QuestProgress {
  state: 'active' | 'done';
  count: number[];
}

export type QuestStatus = 'locked' | 'available' | 'active' | 'ready' | 'done';

export interface RockState {
  c: number;
  r: number;
  /** Centre of the boulder. */
  x: number;
  y: number;
  hp: number;
  /** Seconds until a mined-out rock is back; 0 while it stands. */
  brokenT: number;
  /** Shake left after a swing. */
  shakeT: number;
}

export interface TreeState {
  c: number;
  r: number;
  x: number;
  y: number;
  hp: number;
  /** Seconds until a felled tree grows back; 0 while it stands. */
  stumpT: number;
  /** Shake left after a chop. */
  shakeT: number;
  /** What kind of tree (data/trees.ts; an oak when absent). */
  kind?: TreeKind;
}

export type LogClass = '' | 'c' | 'h' | 't';
export type BannerClass = '' | 'bad' | 'cool';
export type FloaterClass = '' | 'crit' | 'heal' | 'hurt' | 'dot' | 'aa' | 'name';

/** What one hero hears: their own messages, bag, cooldowns, level, travel. */
export interface HeroEvents extends Record<string, unknown> {
  log: { text: string; cls: LogClass };
  banner: { text: string; cls: BannerClass };
  castFlash: { btn: ButtonId; key: WheelKey; color: string };
  nudge: { btn: ButtonId; key: WheelKey; err: boolean };
  loadout: Record<string, never>;
  died: Record<string, never>;
  bag: Record<string, never>;
  talk: { npc: NpcId };
  level: Record<string, never>;
  talents: Record<string, never>;
  respawned: Record<string, never>;
  region: { id: string };
  exit: { to: string; at: string };
  trade: Record<string, never>;
  /** A sound for this hero alone: a level, a quest, loot, gold (Sfx plays it). */
  sound: { id: SoundId };
}

/**
 * A sound effect. The recipes are in src/phaser/audio/sounds.ts.
 *
 * A spell's key is the sound of casting it, and these follow it: an arrow landing (hit…), a
 * bear trap springing, the horse arriving and being left. Everyone nearby hears those, and
 * the world's sounds and the creatures' (data/enemies.ts) too.
 */
export type SoundId = SpellKey | FollowSound | WorldSound | CreatureSound | UiSound | VoiceSound | WeatherSound;
/** Out in the world, heard nearby: the auto-attacks, a blow landing on a hero, felling a tree, breaking a rock, the shaman's fireball, the bell, a fire smothered, a Warden's whistle, a duel's horn. */
export type WorldSound =
  | 'autoSwing'
  | 'autoShot'
  | 'heroHurt'
  | 'chop'
  | 'treeFall'
  | 'mine'
  | 'rockBreak'
  | 'fireball'
  | 'fireballHit'
  | 'bellToll'
  | 'fireOut'
  | 'wardenCall'
  | 'duelStart';
/** Thunder after lightning: a strike close by, one out of sight, one far off (the screen plays it, delayed, for everyone). */
export type WeatherSound = 'thunderNear' | 'thunder' | 'thunderFar';
/** Someone talking, in a conversation or a scene: each a voice of their own. */
export type VoiceSound = `${NpcId | 'bellringer' | 'thane'}Voice`;
export type FollowSound =
  | 'mounted'
  | 'dismount'
  | 'hitArrow'
  | 'hitAimed'
  | 'hitBarbed'
  | 'hitConcussive'
  | 'hitSilence'
  | 'hitKillshot'
  | 'hitVolley'
  | 'hitPierce'
  | 'hitDeadeye'
  | 'trapSnap';
/** What only the hero it happens to hears: the game telling them something. */
export type UiSound =
  | 'levelUp'
  | 'talent'
  | 'questAccept'
  | 'questReady'
  | 'questComplete'
  | 'journal'
  | 'pickup'
  | 'coins'
  | 'equip'
  | 'eat'
  | 'cook'
  | 'smelt'
  | 'smith'
  | 'woodwork'
  | 'build'
  | 'perfect'
  | 'error'
  | 'died'
  | 'respawn'
  | 'open'
  | 'close'
  // duels: challenged, the count, won
  | 'duelAsk'
  | 'duelCount'
  | 'duelWin';

/** What everyone in a region sees and hears: damage numbers, effects, sounds, scenes, bosses. */
export interface RegionEvents extends Record<string, unknown> {
  floater: { x: number; y: number; text: string; cls: FloaterClass; color?: string };
  fx: Omit<Fx, 't' | 'onEnd'>;
  burst: { x: number; y: number; n: number; col: string; spd: number; life: number; size: number; g: number };
  scene: Record<string, never>;
  sceneFade: { dir: 'out' | 'in'; s: number };
  bossPhase: { kind: EnemyKind; phase: number };
  /** Something big happened nearby (a toll): shake the camera. */
  shake: { s: number };
  /** A sound, from where it happened (it carries, fading with distance). */
  sound: { id: SoundId; x: number; y: number };
  /** Someone says something out loud where they stand (a companion calling out what she sees). */
  say: { who: string; text: string; x: number; y: number };
}

/** What the whole room shares: the story. */
export interface RoomEvents extends Record<string, unknown> {
  quests: Record<string, never>;
  flags: { name: string };
  journal: { doc: string };
}

export interface SimEvents extends Record<string, unknown> {
  log: { text: string; cls: LogClass };
  banner: { text: string; cls: BannerClass };
  floater: { x: number; y: number; text: string; cls: FloaterClass; color?: string };
  castFlash: { btn: ButtonId; key: WheelKey; color: string };
  nudge: { btn: ButtonId; key: WheelKey; err: boolean };
  /** Wheel contents, Rev sequence or selection changed. */
  loadout: Record<string, never>;
  died: Record<string, never>;
  /** Bag contents changed (pickup, eat, drop). */
  bag: Record<string, never>;
  /** The player reached an NPC to talk to: open the dialog. */
  talk: { npc: NpcId };
  /** A quest was accepted, progressed or handed in. */
  quests: Record<string, never>;
  /** Gained a level. */
  level: Record<string, never>;
  /** Learned or reset talents. */
  talents: Record<string, never>;
  respawned: Record<string, never>;
  /** Arrived in a region (the world was rebuilt around you). */
  region: { id: string };
  /** Walked into an exit: the scene fades out, then calls Sim.enterRegion(to, at). */
  exit: { to: string; at: string };
  /** A story flag changed. */
  flags: { name: string };
  /** A document went into the journal. */
  journal: { doc: string };
  /** You bought or sold something. */
  trade: Record<string, never>;
  /** A scene started, showed a line, moved the camera or ended (read Sim.scene for the state). */
  scene: Record<string, never>;
  /** A scene asks the screen to fade (seconds). */
  sceneFade: { dir: 'out' | 'in'; s: number };
  /** A boss moved to its next phase. */
  bossPhase: { kind: EnemyKind; phase: number };
  /** A sound: from somewhere nearby (a spell, an arrow landing), or just for you (no place). */
  sound: { id: SoundId; x?: number; y?: number };
  /** Someone says something out loud nearby (shown over them for a moment). */
  say: { who: string; text: string; x: number; y: number };
}

export interface Loadout {
  w1: ActionKey[];
  w2: Key[];
  seq: SkillKey[];
}
