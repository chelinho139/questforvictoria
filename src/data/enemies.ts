import type { Effect } from './story';
import type { Loot } from './items';

export type EnemyKind = 'goblin' | 'shaman' | 'ogre' | 'skeleton' | 'cow' | 'slime' | 'dev_boss' | 'bonehound' | 'bellringer';

/**
 * hostile: attacks anyone who comes within `aggro` range.
 * neutral: minds its own business until hit, then fights back; gives up once you are
 *          more than `aggro` away.
 * passive: never attacks; runs away when hit.
 */
export type Behavior = 'hostile' | 'neutral' | 'passive';

export interface EnemyDef {
  n: string;
  hp: number;
  atk: number;
  per: number; // seconds between attacks
  spd: number;
  range: number;
  /** hostile: notice range. neutral: give-up distance. passive: unused. */
  aggro: number;
  cast?: boolean;
  castRange?: number;
  scale: number;
  /** Texture key (built in phaser/render/textures.ts). */
  tex: string;
  behavior: Behavior;
  /** Rises from the ground at dusk and crumbles at dawn. */
  nightOnly?: boolean;
  /** Squash-and-stretch hop instead of a walk bob. */
  bounce?: boolean;
  /** Floating text shown (sometimes) when hit. */
  hitSay?: string;
  gold: number;
  /** Experience for the kill. */
  xp: number;
  /** Items dropped on death. */
  loot?: Loot;
  /**
   * A boss: a big health bar while you fight it, phases as its health falls (fractions,
   * highest first: [0.66, 0.33] means three phases), and a story flag set when it dies (it
   * never respawns once that flag is set; give its spawn `when: { not: flag }`).
   */
  boss?: { title: string; flag: string; phases?: number[]; onDeath?: Effect };
}

export const KINDS: Record<EnemyKind, EnemyDef> = {
  goblin: {
    n: 'Goblin',
    hp: 150,
    atk: 3,
    per: 2.2,
    spd: 68,
    range: 40,
    aggro: 96,
    scale: 2,
    tex: 'goblin0',
    behavior: 'hostile',
    gold: 10,
    xp: 18,
    loot: [
      ['leather_cap', 1, 1, 0.15],
      ['leather_tunic', 1, 1, 0.12],
      ['leather_trousers', 1, 1, 0.15],
      ['leather_boots', 1, 1, 0.12],
      ['wooden_shield', 1, 1, 0.1],
      ['woodcutter_axe', 1, 1, 0.08],
      ['pickaxe', 1, 1, 0.08],
    ],
  },
  shaman: {
    n: 'Goblin Shaman',
    hp: 200,
    atk: 2,
    per: 2.6,
    spd: 58,
    range: 40,
    aggro: 150,
    cast: true,
    castRange: 150,
    scale: 2,
    tex: 'goblin1',
    behavior: 'hostile',
    gold: 18,
    xp: 26,
    loot: [
      ['vigour_amulet', 1, 1, 0.25],
      ['swift_boots', 1, 1, 0.15],
    ],
  },
  ogre: {
    n: 'Ogre',
    hp: 600,
    atk: 6,
    per: 3.0,
    spd: 48,
    range: 50,
    aggro: 110,
    scale: 3,
    tex: 'goblin2',
    behavior: 'hostile',
    gold: 40,
    xp: 60,
    loot: [
      ['iron_shield', 1, 1, 0.35],
      ['iron_sword', 1, 1, 0.25],
    ],
  },
  skeleton: {
    n: 'Skeleton',
    hp: 160,
    atk: 4,
    per: 2.0,
    spd: 62,
    range: 40,
    aggro: 130,
    scale: 2,
    tex: 'skeleton',
    behavior: 'hostile',
    nightOnly: true,
    gold: 14,
    xp: 24,
    loot: [
      ['iron_helm', 1, 1, 0.15],
      ['chainmail', 1, 1, 0.1],
      ['iron_greaves', 1, 1, 0.12],
      ['iron_sword', 1, 1, 0.06],
    ],
  },
  cow: {
    n: 'Cow',
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
    gold: 2,
    xp: 4,
    loot: [['meat', 1, 2]],
  },
  slime: {
    n: 'Slime',
    hp: 90,
    atk: 2,
    per: 2.4,
    spd: 42,
    range: 36,
    aggro: 170,
    scale: 2,
    tex: 'slime',
    behavior: 'neutral',
    bounce: true,
    gold: 6,
    xp: 10,
    loot: [
      ['leather_cap', 1, 1, 0.07],
      ['leather_tunic', 1, 1, 0.06],
      ['leather_trousers', 1, 1, 0.07],
      ['leather_boots', 1, 1, 0.07],
      ['wooden_shield', 1, 1, 0.06],
      ['woodcutter_axe', 1, 1, 0.04],
      ['pickaxe', 1, 1, 0.04],
    ],
  },
  // a test boss for the dev Test Field: three phases, a flag when it falls
  dev_boss: {
    n: 'Big Ogre',
    hp: 600,
    atk: 4,
    per: 2.6,
    spd: 48,
    range: 44,
    aggro: 110,
    scale: 2.4,
    tex: 'goblin2',
    behavior: 'hostile',
    gold: 50,
    xp: 60,
    boss: { title: 'A test of the boss bar', flag: 'dev_boss_down', phases: [0.66, 0.33] },
  },
  // ---- Act I
  // the skeletons of the old King's hunting dogs: fast, in packs, only at night
  bonehound: {
    n: 'Bone Hound',
    hp: 85,
    atk: 4,
    per: 1.4,
    spd: 96,
    range: 30,
    aggro: 170,
    scale: 1.8,
    tex: 'bonehound',
    behavior: 'hostile',
    nightOnly: true,
    gold: 5,
    xp: 16,
    loot: [['bone_fang', 1, 1, 0.6]],
  },
  // Millbrook's old sexton, ringing the death knell backwards in the belfry
  bellringer: {
    n: 'The Bell-Ringer',
    hp: 1300,
    atk: 8,
    per: 2.6,
    spd: 42,
    range: 46,
    aggro: 260,
    scale: 2.4,
    tex: 'bellringer',
    behavior: 'hostile',
    gold: 80,
    xp: 150,
    boss: { title: 'Old Hamm, sexton of Millbrook', flag: 'bellringer_down', phases: [0.66, 0.33], onDeath: { scene: 'bellringer_down' } },
  },
};
