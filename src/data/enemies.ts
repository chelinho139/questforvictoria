import type { Effect } from './story';
import type { Loot } from './items';

export type EnemyKind =
  | 'goblin'
  | 'shaman'
  | 'ogre'
  | 'skeleton'
  | 'cow'
  | 'slime'
  | 'dev_boss'
  | 'bonehound'
  | 'bellringer'
  // Act II: the wild of the Weepwood
  | 'wolf'
  | 'thornback'
  | 'bonespine'
  | 'boar'
  | 'deer'
  | 'spider'
  | 'spiderling'
  | 'eggsac'
  | 'broodmother'
  // the queen's dead
  | 'mourning_light'
  | 'mourner'
  | 'smotherer'
  | 'hanged_poacher'
  | 'tower_guard'
  | 'tower_crossbowman'
  | 'search_sergeant'
  | 'garrick'
  // the old dead
  | 'sleeper'
  | 'thane'
  // the Greyfang outriders
  | 'goblin_trapper'
  | 'wolf_rider'
  | 'outrider_chief';

/**
 * hostile: attacks anyone who comes within `aggro` range.
 * neutral: minds its own business until hit, then fights back; gives up once you are
 *          more than `aggro` away.
 * passive: never attacks; runs away when hit.
 * inert:   never moves or attacks (an egg sac): it only waits to be burned, or to hatch.
 */
export type Behavior = 'hostile' | 'neutral' | 'passive' | 'inert';

/** What holds a hero still: a spider's web, a goblin's net or snare, roots out of the ground. */
/** What holds a hero still: a web, a net, a snare, roots, or (a sorceress's Frost Nova, in a duel) ice. */
export type HeldKind = 'web' | 'net' | 'snare' | 'roots' | 'ice';

/**
 * A spell a creature casts: a cast bar you can interrupt (Interrupt, Silence, Shield Bash or
 * any stun), then what it does when the cast completes.
 *   fireball: a ball of fire at its foe for `dmg` (only from more than 50 away).
 *   heal:     every one of the dead within `r` (its own kind too) gets `amt` health back.
 *   raise:    every one of the dead that fell within `r` lately climbs back up.
 *   web:      a gob of web (or a net) at its foe that holds them `hold` seconds; with
 *             `cone`, everyone in front of it within `range` is held.
 */
export type CastDef = {
  time: number;
  cd: number;
  range: number;
  /** Only from this boss phase on (the Thane's song, once he is below half). */
  from?: number;
} & (
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
  | 'ringerDie'
  // Act II
  | 'wolfHowl'
  | 'wolfSnarl'
  | 'wolfYelp'
  | 'wolfDie'
  | 'boarGrunt'
  | 'boarSqueal'
  | 'deerBleat'
  | 'spiderHiss'
  | 'spiderHurt'
  | 'spiderDie'
  | 'eggBurst'
  | 'ghostWail'
  | 'ghostMoan'
  | 'ghostDie'
  | 'wispChime'
  | 'guardShout'
  | 'barrowGroan'
  | 'knightHalt';

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
   * of them at once), from boss phase `from` on (default the first). Several kinds take turns;
   * with `at` (tiles) they march in from there instead of rising round it.
   */
  summon?: { kind: EnemyKind | EnemyKind[]; n: number; every: number; max: number; from?: number; at?: [number, number][] };
  /** Leaps at the hero furthest from it within `range` (after a crouch you can see), every `every` seconds, for `dmg`. */
  leap?: { every: number; range: number; dmg: number };
  /**
   * A lure: it never fights. When a hero comes within `r` it drifts away toward its spawn's
   * `to`, always just ahead, and when struck it blinks further along.
   */
  lure?: { r: number };
  /**
   * Climbs back into the canopy when its boss phase reaches one of these (the Brood Mother below
   * half), to drop again somewhere else within `r` of its post.
   */
  climbs?: { phases: number[]; r: number };
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
  /** Seconds, on average, between its idle calls while it wanders (default 18). */
  idleEvery?: number;
  /** Squash-and-stretch hop instead of a walk bob. */
  bounce?: boolean;
  /** Floating text shown (sometimes) when hit. */
  hitSay?: string;
  /** What it calls out when it notices you (one picked; a boss always, others now and then). */
  calls?: string[];
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
    // a herd mooing every few seconds wears on the ear
    idleEvery: 60,
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
  // ---- Act II (docs/act2.md, "Enemies"): the wood hits harder than the fields
  // grey and lean, in threes and fours at the edge of the wood: the last ordinary danger
  wolf: {
    n: 'Wolf',
    sounds: { notice: 'wolfHowl', attack: 'wolfSnarl', hurt: 'wolfYelp', die: 'wolfDie' },
    hp: 140,
    atk: 12,
    per: 1.6,
    spd: 100,
    range: 30,
    aggro: 150,
    howl: { r: 220 },
    scale: 1.8,
    tex: 'wolf',
    behavior: 'hostile',
    gold: [0, 0],
    xp: 12,
    loot: [['meat', 1, 1, 0.35]],
  },
  // a wolf with a ridge of bone down its spine; when one howls, the pack comes
  thornback: {
    n: 'Thornback Wolf',
    sounds: { notice: 'wolfHowl', attack: 'wolfSnarl', hurt: 'wolfYelp', die: 'wolfDie' },
    hp: 160,
    atk: 11,
    per: 1.8,
    spd: 104,
    range: 32,
    aggro: 165,
    howl: { r: 280 },
    scale: 1.9,
    tex: 'thornback',
    behavior: 'hostile',
    gold: [0, 0],
    xp: 18,
    loot: [
      ['thornback_pelt', 1, 1, 0.5],
      ['meat', 1, 1, 0.3],
    ],
  },
  // the old thornback Marcian let out of a snare as a cub
  bonespine: {
    n: 'Bonespine',
    sounds: { notice: 'wolfHowl', attack: 'wolfSnarl', hurt: 'wolfYelp', die: 'wolfDie' },
    hp: 2000,
    atk: 15,
    per: 1.6,
    spd: 108,
    range: 42,
    aggro: 220,
    howl: { r: 400 },
    summon: { kind: 'thornback', n: 1, every: 20, max: 2 },
    leap: { every: 10, range: 340, dmg: 30 },
    scale: 2.8,
    tex: 'bonespine',
    behavior: 'hostile',
    gold: [0, 0],
    xp: 90,
    loot: [['thornback_pelt', 3, 3]],
    boss: { title: 'The old wolf of the Chase', flag: 'bonespine_down', phases: [0.5] },
  },
  // minds its own business until hit, then charges
  boar: {
    n: 'Boar',
    sounds: { idle: 'boarGrunt', notice: 'boarSqueal', attack: 'boarGrunt', hurt: 'boarSqueal', die: 'boarSqueal' },
    hp: 280,
    atk: 23,
    per: 2.1,
    spd: 92,
    range: 34,
    aggro: 220,
    scale: 1.8,
    tex: 'boar',
    behavior: 'neutral',
    gold: [0, 0],
    xp: 12,
    loot: [['meat', 1, 2]],
  },
  // not an enemy: it runs
  deer: {
    n: 'Deer',
    sounds: { idle: 'deerBleat', hurt: 'deerBleat', die: 'deerBleat' },
    hp: 70,
    atk: 0,
    per: 99,
    spd: 70,
    range: 0,
    aggro: 0,
    scale: 2,
    tex: 'deer',
    behavior: 'passive',
    gold: [0, 0],
    xp: 3,
    loot: [['venison', 1, 1]],
  },
  // waits in the canopy and drops on you; spits web that holds you still
  spider: {
    n: 'Weepwood Spider',
    sounds: { notice: 'spiderHiss', attack: 'spiderHiss', cast: 'spiderHiss', hurt: 'spiderHurt', die: 'spiderDie' },
    hp: 175,
    atk: 16,
    per: 1.6,
    spd: 86,
    range: 32,
    aggro: 150,
    ambush: { r: 80 },
    casts: [{ what: 'web', time: 0.9, cd: 9, range: 170, hold: 2, by: 'web' }],
    firstCast: 2,
    scale: 1.6,
    tex: 'spider',
    behavior: 'hostile',
    gold: [0, 0],
    xp: 16,
    loot: [['spider_silk', 1, 1, 0.6]],
  },
  // hatches from the egg sacs nobody burned: weak, quick, many
  spiderling: {
    n: 'Spiderling',
    sounds: { attack: 'spiderHiss', hurt: 'spiderHurt', die: 'spiderDie' },
    hp: 45,
    atk: 5,
    per: 1.3,
    spd: 118,
    range: 24,
    aggro: 220,
    scale: 0.9,
    tex: 'spiderling',
    behavior: 'hostile',
    gold: [0, 0],
    xp: 3,
  },
  // a sac of eggs in the web: burn it (strike it) before it hatches
  eggsac: {
    n: 'Egg Sac',
    sounds: { hurt: 'spiderHurt', die: 'eggBurst' },
    hp: 40,
    atk: 0,
    per: 99,
    spd: 0,
    range: 0,
    aggro: 100,
    hatch: { into: 'spiderling', n: 2, t: 7 },
    scale: 1.2,
    tex: 'eggsac',
    behavior: 'inert',
    gold: [0, 0],
    xp: 2,
  },
  // the spider dell's queen, the size of a cart
  broodmother: {
    n: 'The Brood Mother',
    sounds: { notice: 'spiderHiss', attack: 'spiderHiss', cast: 'spiderHiss', hurt: 'spiderHurt', die: 'spiderDie' },
    hp: 2000,
    atk: 13,
    per: 2.2,
    spd: 74,
    range: 50,
    aggro: 240,
    ambush: { r: 150 },
    casts: [{ what: 'web', time: 1.3, cd: 10, range: 150, hold: 2, by: 'web', cone: true }],
    firstCast: 4,
    summon: { kind: 'eggsac', n: 1, every: 16, max: 3 },
    climbs: { phases: [1], r: 200 },
    scale: 3,
    tex: 'broodmother',
    behavior: 'hostile',
    gold: [0, 0],
    xp: 90,
    loot: [['spider_silk', 3, 3]],
    boss: { title: 'Queen of the spider dell', flag: 'broodmother_down', phases: [0.5] },
  },
  // a will-o'-wisp: it drifts away, always just ahead, toward its hollow
  mourning_light: {
    n: 'Mourning Light',
    sounds: { notice: 'wispChime', hurt: 'wispChime', die: 'ghostDie' },
    hp: 70,
    atk: 0,
    per: 99,
    spd: 64,
    range: 0,
    aggro: 0,
    lure: { r: 150 },
    scale: 1.4,
    tex: 'mourning_light',
    behavior: 'hostile',
    dead: true,
    nightOnly: true,
    gold: [0, 0],
    xp: 12,
  },
  // a weeping ghost: its wail heals the dead around it
  mourner: {
    n: 'Mourner',
    sounds: { rise: 'ghostMoan', notice: 'ghostMoan', attack: 'ghostMoan', cast: 'ghostWail', hurt: 'ghostMoan', die: 'ghostDie' },
    hp: 160,
    atk: 10,
    per: 2.2,
    spd: 52,
    range: 36,
    aggro: 160,
    casts: [{ what: 'heal', time: 2.4, cd: 8, range: 400, amt: 70, r: 200 }],
    firstCast: 1.5,
    scale: 2,
    tex: 'mourner',
    behavior: 'hostile',
    dead: true,
    nightOnly: true,
    gold: [0, 2],
    xp: 20,
  },
  // a dead charcoal-burner who goes for fires before people
  smotherer: {
    n: 'Smotherer',
    sounds: { rise: 'boneRise', notice: 'ghostMoan', attack: 'skeletonAttack', hurt: 'skeletonHurt', die: 'ghostDie' },
    hp: 200,
    atk: 15,
    per: 2,
    spd: 58,
    range: 36,
    aggro: 90,
    smother: { t: 8 },
    scale: 2,
    tex: 'smotherer',
    behavior: 'hostile',
    dead: true,
    nightOnly: true,
    gold: [0, 2],
    xp: 8,
  },
  // the hanged, dropping from the Gallows Willow at dusk, still holding their bows
  hanged_poacher: {
    n: 'Hanged Poacher',
    sounds: { rise: 'boneRise', notice: 'skeletonNotice', attack: 'skeletonAttack', hurt: 'skeletonHurt', die: 'skeletonDie' },
    hp: 180,
    atk: 19,
    per: 2.4,
    spd: 58,
    range: 170,
    aggro: 210,
    missile: { col: '#d8cfa8', speed: 280 },
    scale: 2,
    tex: 'hanged_poacher',
    behavior: 'hostile',
    dead: true,
    nightOnly: true,
    gold: [1, 3],
    xp: 18,
  },
  // dead guards in rusted Thornhallow livery, searching the road for someone who ran
  tower_guard: {
    n: 'Tower Guard',
    sounds: { rise: 'boneRise', notice: 'guardShout', attack: 'skeletonAttack', hurt: 'skeletonHurt', die: 'skeletonDie' },
    hp: 300,
    atk: 17,
    per: 2.2,
    spd: 62,
    range: 40,
    aggro: 160,
    shield: { every: 6, up: 2, cut: 0.25 },
    calls: ['Search the road. She can\'t have got far.', 'Check the ditches!', 'She came this way. Search the road!'],
    scale: 2.2,
    tex: 'tower_guard',
    behavior: 'hostile',
    dead: true,
    gold: [2, 5],
    xp: 28,
    loot: [
      ['steel_helm', 1, 1, 0.02],
      ['steel_shield', 1, 1, 0.015],
      ['steel_sword', 1, 1, 0.01],
    ],
  },
  // shoots from behind the shields; a bolt slows whoever it hits
  tower_crossbowman: {
    n: 'Tower Crossbowman',
    sounds: { rise: 'boneRise', notice: 'guardShout', attack: 'skeletonAttack', hurt: 'skeletonHurt', die: 'skeletonDie' },
    hp: 200,
    atk: 16,
    per: 2.8,
    spd: 58,
    range: 190,
    aggro: 220,
    missile: { col: '#9a8a6a', speed: 340, slow: { t: 2.5, k: 0.4 } },
    calls: ['There! By the river!', 'Search the road. She can\'t have got far.'],
    scale: 2.2,
    tex: 'tower_crossbowman',
    behavior: 'hostile',
    dead: true,
    gold: [2, 4],
    xp: 24,
    loot: [['steel_helm', 1, 1, 0.02]],
  },
  // the search party's sergeant, with seven-year-old orders in his belt
  search_sergeant: {
    n: 'Sergeant of the Search',
    sounds: { rise: 'boneRise', notice: 'guardShout', attack: 'skeletonAttack', hurt: 'skeletonHurt', die: 'skeletonDie' },
    hp: 1100,
    atk: 22,
    per: 2,
    spd: 64,
    range: 42,
    aggro: 180,
    shield: { every: 5, up: 2, cut: 0.25 },
    calls: ['Search the road! Back in her room before my lord wakes!'],
    scale: 2.5,
    tex: 'tower_guard',
    behavior: 'hostile',
    dead: true,
    gold: [12, 12],
    xp: 50,
    loot: [['steel_shield', 1, 1, 0.1]],
    boss: { title: 'Still searching the road', flag: 'sergeant_down', onDeath: { docs: ['search_orders'] } },
  },
  // Sir Garrick Thorne, the Queen's Jailer, on the Weeping Bridge (his fight: Region.garrick)
  garrick: {
    n: 'Sir Garrick Thorne',
    sounds: { notice: 'knightHalt', attack: 'skeletonAttack', hurt: 'skeletonHurt', die: 'skeletonDie' },
    hp: 4200,
    atk: 20,
    per: 1.7,
    spd: 70,
    range: 44,
    aggro: 200,
    shield: { every: 7, up: 2.5, cut: 0.25 },
    calls: ['Halt. No one crosses. By order of the King.'],
    casts: [{ what: 'web', time: 1.2, cd: 13, range: 320, hold: 2.5, by: 'roots', from: 1 }],
    firstCast: 2,
    // the key: Tower Guard and crossbowmen march onto the bridge from both ends, two at a time
    summon: { kind: ['tower_guard', 'tower_crossbowman'], n: 2, every: 16, max: 4, from: 2, at: [[30, 25], [30, 13]] },
    answers: {
      call: 'warden',
      stun: [4, 4, 2],
      free: 'roots',
      say: 'At the Warden call Sir Garrick stops dead, his sword half raised.',
    },
    scale: 3,
    tex: 'garrick',
    behavior: 'hostile',
    dead: true,
    gold: [40, 40],
    xp: 250,
    boss: { title: "The Queen's Jailer", flag: 'garrick_down', phases: [0.66, 0.33], onDeath: { scene: 'garrick_falls' } },
  },
  // the valley's oldest dead, in green bronze and rotten furs: slow, heavy, hard to put down
  sleeper: {
    n: 'Sleeper',
    sounds: { rise: 'barrowGroan', notice: 'barrowGroan', attack: 'ogreAttack', hurt: 'skeletonHurt', die: 'skeletonDie' },
    hp: 500,
    atk: 27,
    per: 2.8,
    spd: 46,
    range: 42,
    aggro: 150,
    scale: 2.3,
    tex: 'sleeper',
    behavior: 'hostile',
    dead: true,
    gold: [3, 7],
    xp: 24,
    loot: [['gold_nugget', 1, 1, 0.08]],
  },
  // the Thane under the Hill: an old chieftain of the valley from before there was a Corvalis
  thane: {
    n: 'The Thane under the Hill',
    sounds: { notice: 'barrowGroan', attack: 'ogreAttack', cast: 'barrowGroan', hurt: 'skeletonHurt', die: 'barrowGroan' },
    hp: 3200,
    atk: 20,
    per: 3,
    spd: 50,
    range: 56,
    aggro: 260,
    summon: { kind: 'sleeper', n: 1, every: 18, max: 2 },
    casts: [{ what: 'raise', time: 4, cd: 12, range: 600, r: 600, from: 1 }],
    firstCast: 3,
    scale: 3,
    tex: 'thane',
    behavior: 'hostile',
    dead: true,
    gold: [30, 30],
    xp: 140,
    boss: { title: 'Who wakes us?', flag: 'thane_down', phases: [0.5], onDeath: { scene: 'thane_falls' } },
  },
  // lays snares in the grass, and throws a net
  goblin_trapper: {
    n: 'Goblin Trapper',
    sounds: { notice: 'goblinNotice', attack: 'goblinAttack', cast: 'goblinAttack', hurt: 'goblinHurt', die: 'goblinDie' },
    hp: 180,
    atk: 13,
    per: 2,
    spd: 74,
    range: 40,
    aggro: 160,
    snares: { every: 5, hold: 2, max: 3 },
    casts: [{ what: 'web', time: 1, cd: 11, range: 150, hold: 2, by: 'net' }],
    firstCast: 3,
    scale: 2,
    tex: 'goblin_trapper',
    behavior: 'hostile',
    gold: [1, 4],
    xp: 16,
    loot: [
      ['thornback_pelt', 1, 1, 0.15],
      ['leather_boots', 1, 1, 0.03],
    ],
  },
  // a goblin on a thornback: when the wolf dies the goblin fights on, on foot
  wolf_rider: {
    n: 'Goblin Wolf-Rider',
    sounds: { notice: 'wolfHowl', attack: 'wolfSnarl', hurt: 'wolfYelp', die: 'wolfDie' },
    hp: 200,
    atk: 16,
    per: 2,
    spd: 112,
    range: 38,
    aggro: 180,
    rider: 'goblin',
    scale: 2.4,
    tex: 'wolf_rider',
    behavior: 'hostile',
    gold: [0, 0],
    xp: 24,
    loot: [['thornback_pelt', 1, 1, 0.3]],
  },
  // the biggest of them, with a bone-and-feather headdress, and Pike's courier's bag
  outrider_chief: {
    n: 'Chief of the Outriders',
    sounds: { notice: 'wolfHowl', attack: 'goblinAttack', hurt: 'goblinHurt', die: 'goblinDie' },
    hp: 1200,
    atk: 16,
    per: 1.8,
    spd: 108,
    range: 44,
    aggro: 200,
    summon: { kind: 'goblin', n: 1, every: 16, max: 2 },
    scale: 2.8,
    tex: 'outrider_chief',
    behavior: 'hostile',
    gold: [25, 25],
    xp: 60,
    loot: [
      ['dispatch_bag', 1, 1],
      ['thornback_pelt', 2, 2],
    ],
    boss: { title: 'Greyfang outrider', flag: 'outrider_chief_down' },
  },
};
