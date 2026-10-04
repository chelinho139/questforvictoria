import type { Effect } from './story';
import type { Loot } from './items';

export type EnemyKind = 'goblin' | 'shaman' | 'ogre' | 'skeleton' | 'cow' | 'slime' | 'dev_boss' | 'bonehound' | 'bellringer';

/**
 * hostile: attacks anyone who comes within `aggro` range.
 * neutral: minds its own business until hit, then fights back; gives up once you are
 *          more than `aggro` away.
 * passive: never attacks; runs away when hit.
 * inert:   never moves or attacks (an egg sac): it only waits to be burned, or to hatch.
 */
export type Behavior = 'hostile' | 'neutral' | 'passive' | 'inert';

/** What holds a hero still: a spider's web, a goblin's net or snare, roots out of the ground. */
export type HeldKind = 'web' | 'net' | 'snare' | 'roots';

/**
 * A spell a creature casts: a cast bar you can interrupt (Interrupt, Silence, Shield Bash or
 * any stun), then what it does when the cast completes.
 *   fireball: a ball of fire at its foe for `dmg` (only from more than 50 away).
 *   heal:     every one of the dead within `r` (its own kind too) gets `amt` health back.
 *   raise:    every one of the dead that fell within `r` lately climbs back up.
 *   web:      a gob of web (or a net) at its foe that holds them `hold` seconds; with
 *             `cone`, everyone in front of it within `range` is held.
 */
export type CastDef = { time: number; cd: number; range: number } & (
  | { what: 'fireball'; dmg: number }
  | { what: 'heal'; amt: number; r: number }
  | { what: 'raise'; r: number }
  | { what: 'web'; hold: number; by: HeldKind; cone?: boolean }
);

/** A creature's sounds (the recipes are in src/phaser/audio/sounds.ts). */
export type CreatureSound =
  | 'slimeIdle'
  | 'slimeAttack'
  | 'slimeHurt'
  | 'slimeDie'
  | 'cowIdle'
  | 'cowHurt'
  | 'cowDie'
  | 'goblinNotice'
  | 'goblinAttack'
  | 'goblinHurt'
  | 'goblinDie'
  | 'shamanNotice'
  | 'shamanAttack'
  | 'shamanCast'
  | 'shamanHurt'
  | 'shamanDie'
  | 'ogreNotice'
  | 'ogreAttack'
  | 'ogreHurt'
  | 'ogreDie'
  | 'boneRise'
  | 'skeletonNotice'
  | 'skeletonAttack'
  | 'skeletonHurt'
  | 'skeletonDie'
  | 'houndNotice'
  | 'houndAttack'
  | 'houndHurt'
  | 'houndDie'
  | 'ringerNotice'
  | 'ringerAttack'
  | 'ringerHurt'
  | 'ringerDie';

/**
 * What a creature sounds like: noticing you, attacking (the swing or bite; the blow landing
 * is the hero's own sound), hurt, dying (or crumbling at dawn), now and then while it
 * wanders, climbing out of the ground, and starting a spell.
 */
export interface CreatureSounds {
  notice?: CreatureSound;
  attack?: CreatureSound;
  hurt: CreatureSound;
  die: CreatureSound;
  idle?: CreatureSound;
  rise?: CreatureSound;
  cast?: CreatureSound;
}

export interface EnemyDef {
  n: string;
  hp: number;
  atk: number;
  per: number; // seconds between attacks
  spd: number;
  range: number;
  /** hostile: notice range. neutral: give-up distance. passive: unused. inert: how near a hero wakes it. */
  aggro: number;
  /** Its spells, tried in order whenever it is ready to cast (one cooldown between casts). */
  casts?: CastDef[];
  /** Seconds after noticing you before its first cast (default 3). */
  firstCast?: number;
  /** Shoots instead of striking: a bolt or arrow that flies at `speed` px/s (and slows whoever it hits). */
  missile?: { col: string; speed: number; slow?: { t: number; k: number } };
  /**
   * Shields up: every `every` seconds it raises its shield for `up` seconds, and blows from in
   * front of it do only `cut` of their damage. Any stun drops the shield.
   */
  shield?: { every: number; up: number; cut: number };
  /** Waits unseen (up in the canopy) until a hero comes within `r`, then drops on them. */
  ambush?: { r: number };
  /**
   * Lays snares in the grass between itself and its foe: one every `every` seconds (at most
   * `max` out at once); whoever steps in one is held `hold` seconds.
   */
  snares?: { every: number; hold: number; max: number };
  /** Rides a mount: when the mount falls, the rider fights on, on foot, as this kind. */
  rider?: EnemyKind;
  /** An egg: once a hero comes within `aggro` it starts to hatch, and `t` seconds later it is `n` of `into`. */
  hatch?: { into: EnemyKind; n: number; t: number };
  /** Howls when it notices a foe, and every creature that howls within `r` comes running. */
  howl?: { r: number };
  /**
   * Calls up help while it fights: `n` of `kind` every `every` seconds (never more than `max`
   * of them at once), from boss phase `from` on (default the first).
   */
  summon?: { kind: EnemyKind; n: number; every: number; max: number; from?: number };
  /** Leaps at the hero furthest from it within `range` (after a crouch you can see), every `every` seconds, for `dmg`. */
  leap?: { every: number; range: number; dmg: number };
  /**
   * A lure: it never fights. When a hero comes within `r` it drifts away toward its spawn's
   * `to`, always just ahead, and when struck it blinks further along.
   */
  lure?: { r: number };
  /** Goes for fires before people: walks to the nearest one burning and lies on it until, after `t` seconds, it is out. */
  smother?: { t: number };
  /** One of the dead: a mourner's wail heals it, and a song can raise it again. */
  dead?: boolean;
  /**
   * Answers a call made from the bag (Aldric's whistle: `call` 'warden'): it is stunned for
   * `stun` seconds (by boss phase: the last entry covers the phases after it), says `say`, and
   * whoever is held by `free` is let go.
   */
  answers?: { call: string; stun: number[]; say?: string; free?: HeldKind };
  scale: number;
  /** Texture key (built in phaser/render/textures.ts). */
  tex: string;
  behavior: Behavior;
  /** Rises from the ground at dusk and crumbles at dawn. */
  nightOnly?: boolean;
  sounds: CreatureSounds;
  /** Squash-and-stretch hop instead of a walk bob. */
  bounce?: boolean;
  /** Floating text shown (sometimes) when hit. */
  hitSay?: string;
  /** Coins on the body: a roll from min to max (beasts carry none). */
  gold: [number, number];
  /** Experience for the kill. */
  xp: number;
  /**
   * Items dropped on death. Gear is a lucky find (leather 1–4% a piece, iron 1–3%): the
   * forge, the traders and quest rewards are the main roads to better gear.
   */
  loot?: Loot;
  /**
   * A boss: a big health bar while you fight it, phases as its health falls (fractions,
   * highest first: [0.66, 0.33] means three phases), and a story flag set when it dies (it
   * never respawns once that flag is set; give its spawn `when: { not: flag }`).
   */
  boss?: { title: string; flag: string; phases?: number[]; onDeath?: Effect };
}

/** Seconds before a slain creature is back at its post (up to half as long again, so a camp doesn't all return at once). */
export const RESPAWN = 60;

export const KINDS: Record<EnemyKind, EnemyDef> = {
  goblin: {
    n: 'Goblin',
    sounds: { notice: 'goblinNotice', attack: 'goblinAttack', hurt: 'goblinHurt', die: 'goblinDie' },
    hp: 165,
    atk: 13,
    per: 2.2,
    spd: 68,
    range: 40,
    aggro: 96,
    scale: 2,
    tex: 'goblin0',
    behavior: 'hostile',
    gold: [1, 3],
    xp: 18,
    loot: [
      ['leather_cap', 1, 1, 0.04],
      ['leather_tunic', 1, 1, 0.03],
      ['leather_trousers', 1, 1, 0.04],
      ['leather_boots', 1, 1, 0.03],
      ['wooden_shield', 1, 1, 0.03],
      ['woodcutter_axe', 1, 1, 0.02],
      ['pickaxe', 1, 1, 0.02],
    ],
  },
  shaman: {
    n: 'Goblin Shaman',
    sounds: {
      notice: 'shamanNotice',
      attack: 'shamanAttack',
      cast: 'shamanCast',
      hurt: 'shamanHurt',
      die: 'shamanDie',
    },
    hp: 220,
    atk: 8,
    per: 2.6,
    spd: 58,
    range: 40,
    aggro: 150,
    casts: [{ what: 'fireball', time: 2.2, cd: 7, range: 150, dmg: 35 }],
    scale: 2,
    tex: 'goblin1',
    behavior: 'hostile',
    gold: [2, 5],
    xp: 26,
    loot: [
      ['vigour_amulet', 1, 1, 0.06],
      ['swift_boots', 1, 1, 0.04],
    ],
  },
  ogre: {
    n: 'Ogre',
    sounds: { notice: 'ogreNotice', attack: 'ogreAttack', hurt: 'ogreHurt', die: 'ogreDie' },
    hp: 660,
    atk: 22,
    per: 3.0,
    spd: 48,
    range: 50,
    aggro: 110,
    scale: 3,
    tex: 'goblin2',
    behavior: 'hostile',
    gold: [4, 8],
    xp: 60,
    loot: [
      ['iron_shield', 1, 1, 0.1],
      ['iron_sword', 1, 1, 0.07],
    ],
  },
  skeleton: {
    n: 'Skeleton',
    sounds: {
      rise: 'boneRise',
      notice: 'skeletonNotice',
      attack: 'skeletonAttack',
      hurt: 'skeletonHurt',
      die: 'skeletonDie',
    },
    hp: 175,
    atk: 17,
    per: 2.0,
    spd: 62,
    range: 40,
    aggro: 130,
    scale: 2,
    tex: 'skeleton',
    behavior: 'hostile',
    dead: true,
    nightOnly: true,
    gold: [1, 3],
    xp: 24,
    loot: [
      ['iron_helm', 1, 1, 0.03],
      ['chainmail', 1, 1, 0.015],
      ['iron_greaves', 1, 1, 0.025],
      ['iron_sword', 1, 1, 0.01],
    ],
  },
  cow: {
    n: 'Cow',
    sounds: { idle: 'cowIdle', hurt: 'cowHurt', die: 'cowDie' },
    hp: 60,
    atk: 0,
    per: 99,
    spd: 44,
    range: 0,
    aggro: 0,
    scale: 2,
    tex: 'cow',
    behavior: 'passive',
    hitSay: 'MOO!',
    gold: [0, 0],
    xp: 4,
    loot: [['meat', 1, 2]],
  },
  slime: {
    n: 'Slime',
    sounds: { idle: 'slimeIdle', attack: 'slimeAttack', hurt: 'slimeHurt', die: 'slimeDie' },
    hp: 100,
    atk: 8,
    per: 2.4,
    spd: 42,
    range: 36,
    aggro: 170,
    scale: 2,
    tex: 'slime',
    behavior: 'neutral',
    bounce: true,
    gold: [0, 1],
    xp: 10,
    loot: [
      ['leather_cap', 1, 1, 0.02],
      ['leather_tunic', 1, 1, 0.015],
      ['leather_trousers', 1, 1, 0.02],
      ['leather_boots', 1, 1, 0.02],
      ['wooden_shield', 1, 1, 0.015],
      ['woodcutter_axe', 1, 1, 0.01],
      ['pickaxe', 1, 1, 0.01],
    ],
  },
  // a test boss for the dev Test Field: three phases, a flag when it falls
  dev_boss: {
    n: 'Big Ogre',
    sounds: { notice: 'ogreNotice', attack: 'ogreAttack', hurt: 'ogreHurt', die: 'ogreDie' },
    hp: 600,
    atk: 4,
    per: 2.6,
    spd: 48,
    range: 44,
    aggro: 110,
    scale: 2.4,
    tex: 'goblin2',
    behavior: 'hostile',
    gold: [5, 5],
    xp: 60,
    boss: { title: 'A test of the boss bar', flag: 'dev_boss_down', phases: [0.66, 0.33] },
  },
  // ---- Act I
  // the skeletons of the old King's hunting dogs: fast, in packs, only at night
  bonehound: {
    n: 'Bone Hound',
    sounds: {
      rise: 'boneRise',
      notice: 'houndNotice',
      attack: 'houndAttack',
      hurt: 'houndHurt',
      die: 'houndDie',
    },
    hp: 85,
    atk: 17,
    per: 1.4,
    spd: 96,
    range: 30,
    aggro: 170,
    scale: 1.8,
    tex: 'bonehound',
    behavior: 'hostile',
    dead: true,
    nightOnly: true,
    gold: [0, 1],
    xp: 16,
    loot: [['bone_fang', 1, 1, 0.6]],
  },
  // Millbrook's old sexton, ringing the death knell backwards in the belfry
  bellringer: {
    n: 'The Bell-Ringer',
    sounds: { notice: 'ringerNotice', attack: 'ringerAttack', hurt: 'ringerHurt', die: 'ringerDie' },
    hp: 1300,
    atk: 11,
    per: 2.6,
    spd: 42,
    range: 46,
    aggro: 260,
    scale: 2.4,
    tex: 'bellringer',
    behavior: 'hostile',
    dead: true,
    gold: [30, 30],
    xp: 150,
    boss: { title: 'Old Hamm, sexton of Millbrook', flag: 'bellringer_down', phases: [0.66, 0.33], onDeath: { scene: 'bellringer_down' } },
  },
};
