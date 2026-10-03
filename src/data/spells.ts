import type { Key } from './skills';
import type { ClassId } from './classes';

/**
 * The spellbook: every spell you can put on your bar, how you get it, and what it does in
 * full. Class spells unlock at a level; talent spells come from a talent (data/talents.ts,
 * `grants`). Numbers here are the base values; talents change several of them.
 */

/** Everything that can sit on the bar (switching targets is a key, Tab, not a spell). */
export type SpellKey = Exclude<Key, 'target'>;

export interface SpellInfo {
  /** The class that learns it (none: everyone, like Mount). */
  cls?: ClassId;
  /** Learned at this level (class spells). */
  level?: number;
  /** Learned from this talent (talent spells). */
  talent?: string;
  /** The full explanation for the spellbook. */
  long: string;
  /** Off the global cooldown: usable between other attacks. */
  instant?: boolean;
}

export const SPELLS: Record<SpellKey, SpellInfo> = {
  thrust: {
    cls: 'warrior',
    level: 1,
    long: 'A quick stab at your target for 5 damage. Slash right after it hits much harder.',
  },
  slash: {
    cls: 'warrior',
    level: 1,
    long: 'A broad cut for 8 damage, ×1.5 when it follows a Thrust.',
  },
  rend: {
    cls: 'warrior',
    level: 2,
    long: 'A tearing cut for 3 damage that makes the target bleed for 2 every second for 8 s.',
  },
  charge: {
    cls: 'warrior',
    level: 3,
    long: 'Rush at a far-away target, strike it for 4 and stun it for 1.5 s.',
  },
  mount: {
    level: 4,
    instant: true,
    long: 'Call your horse: stand still for a second, then ride 1.8× as fast. Attacking knocks you out of the saddle.',
  },
  warcry: { cls: 'warrior', level: 5, long: 'A battle shout: you deal 20% more damage for 15 s.' },
  interrupt: {
    cls: 'warrior',
    level: 6,
    instant: true,
    long: "Cut short an enemy's spell (the shaman's bolt, say) and stun it for 1 s.",
  },
  execute: {
    cls: 'warrior',
    level: 7,
    instant: true,
    long: 'Finish off a target below 25% health: 30% of the health it has left, plus 8.',
  },
  whirlwind: {
    cls: 'warrior',
    level: 9,
    long: 'Spin with your blade out and hit every enemy around you for 7.',
  },
  mortal: {
    cls: 'warrior',
    level: 11,
    instant: true,
    long: 'A crushing blow for 12 damage that stuns the target for 0.6 s.',
  },
  sunder: {
    cls: 'warrior',
    talent: 'sunder',
    instant: true,
    long: "Strike for 6 and crack the target's guard: it takes 20% more damage from you for 10 s.",
  },
  deathblow: {
    cls: 'warrior',
    talent: 'deathblow',
    instant: true,
    long: 'A mighty finishing blow for 30 damage. If it kills, Deathblow is ready again at once.',
  },
  bloodrage: {
    cls: 'warrior',
    talent: 'bloodrage',
    instant: true,
    long: 'Pay 15% of your health in blood to gain 40 mana. Not below 20% health.',
  },
  berserk: {
    cls: 'warrior',
    talent: 'berserk',
    instant: true,
    long: 'Go berserk for 10 s: your auto-attacks swing 50% faster and you deal 20% more damage.',
  },
  shieldbash: {
    cls: 'warrior',
    talent: 'shield_bash',
    instant: true,
    long: 'Slam your shield into the target for 6 damage, stunning it for 2 s and stopping any spell. Needs a shield in your off hand.',
  },
  laststand: {
    cls: 'warrior',
    talent: 'last_stand',
    instant: true,
    long: 'Dig in: heal 30% of your maximum health and take 30% less damage for 8 s.',
  },
  // ------------------------------------------------------------ the archer's
  quickshot: {
    cls: 'archer',
    level: 1,
    long: 'A fast arrow for 5 damage. Aimed Shot right after it hits much harder.',
  },
  aimedshot: {
    cls: 'archer',
    level: 1,
    long: 'A careful arrow for 8 damage, ×1.5 when it follows a Quick Shot.',
  },
  barbed: {
    cls: 'archer',
    level: 2,
    long: 'A barbed arrow for 3 damage that makes the target bleed for 2 every second for 8 s.',
  },
  concussive: {
    cls: 'archer',
    level: 3,
    long: 'A blunt arrow for 4 damage that slows the target by half for 6 s: shoot it as they come for you.',
  },
  mark: {
    cls: 'archer',
    level: 5,
    long: "Mark your prey: for 15 s it takes 20% more damage from you. Marking costs nothing to aim, so it doesn't need you to stand still.",
  },
  silence: {
    cls: 'archer',
    level: 6,
    instant: true,
    long: "An arrow to the throat: cuts short an enemy's spell from afar and stuns it for 1 s.",
  },
  killshot: {
    cls: 'archer',
    level: 7,
    instant: true,
    long: 'Finish off a target below 25% health, from range: 30% of the health it has left, plus 8.',
  },
  volley: {
    cls: 'archer',
    level: 9,
    long: 'Rain arrows on your target: every enemy within 70 of it takes 7.',
  },
  pierce: {
    cls: 'archer',
    level: 11,
    instant: true,
    long: 'A heavy arrow for 12 damage that goes right through: it hits everything in a line to your target and a little beyond.',
  },
  rapidfire: {
    cls: 'archer',
    talent: 'rapid_fire',
    instant: true,
    long: 'Three arrows in quick succession, 4 damage each.',
  },
  deadeye: {
    cls: 'archer',
    talent: 'deadeye',
    instant: true,
    long: 'One perfect shot for 26 damage. If it kills, Deadeye is ready again at once.',
  },
  beartrap: {
    cls: 'archer',
    talent: 'bear_trap',
    instant: true,
    long: 'Set a trap at your feet. The first enemy to step on it takes 8 and is held fast for 3 s (it can still swing at you).',
  },
  predator: {
    cls: 'archer',
    talent: 'predator',
    instant: true,
    long: 'For 10 s your auto-shots come 50% faster and you deal 20% more damage.',
  },
  disengage: {
    cls: 'archer',
    talent: 'disengage',
    instant: true,
    long: 'Leap back away from your target, out of reach, ready to shoot again.',
  },
  camouflage: {
    cls: 'archer',
    talent: 'camouflage',
    instant: true,
    long: 'Melt into the wild for 6 s: creatures lose track of you and you heal 20% of your health. Your next shot within that time is a critical hit. Shooting ends it.',
  },
};

/** Spellbook order: class spells by level, then talent spells by tree (the warrior's, the archer's, then Mount). */
export const SPELL_ORDER: SpellKey[] = [
  'thrust',
  'slash',
  'rend',
  'charge',
  'mount',
  'warcry',
  'interrupt',
  'execute',
  'whirlwind',
  'mortal',
  'sunder',
  'deathblow',
  'bloodrage',
  'berserk',
  'shieldbash',
  'laststand',
  'quickshot',
  'aimedshot',
  'barbed',
  'concussive',
  'mark',
  'silence',
  'killshot',
  'volley',
  'pierce',
  'rapidfire',
  'deadeye',
  'beartrap',
  'predator',
  'disengage',
  'camouflage',
];

/** Where a spell goes on the bar when you learn it, if that slot is free (else the first free one). */
export const HOME_SLOT: Partial<Record<SpellKey, number>> = {
  thrust: 0,
  slash: 1,
  rend: 2,
  whirlwind: 3,
  warcry: 4,
  charge: 5,
  interrupt: 6,
  execute: 7,
  mortal: 9,
  mount: 11,
  quickshot: 0,
  aimedshot: 1,
  barbed: 2,
  volley: 3,
  mark: 4,
  concussive: 5,
  silence: 6,
  killshot: 7,
  pierce: 9,
};
