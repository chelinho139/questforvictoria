import type { Key } from './skills';

/**
 * The spellbook: every spell you can put on your bar, how you get it, and what it does in
 * full. Class spells unlock at a level; talent spells come from a talent (data/talents.ts,
 * `grants`). Numbers here are the base values; talents change several of them.
 */

/** Everything that can sit on the bar (switching targets is a key, Tab, not a spell). */
export type SpellKey = Exclude<Key, 'target'>;

export interface SpellInfo {
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
    level: 1,
    long: 'A quick stab at your target for 5 damage. Slash right after it hits much harder.',
  },
  slash: { level: 1, long: 'A broad cut for 8 damage, ×1.5 when it follows a Thrust.' },
  rend: {
    level: 2,
    long: 'A tearing cut for 3 damage that makes the target bleed for 2 every second for 8 s.',
  },
  charge: { level: 3, long: 'Rush at a far-away target, strike it for 4 and stun it for 1.5 s.' },
  mount: {
    level: 4,
    instant: true,
    long: 'Call your horse: stand still for a second, then ride 1.8× as fast. Attacking knocks you out of the saddle.',
  },
  warcry: { level: 5, long: 'A battle shout: you deal 20% more damage for 15 s.' },
  interrupt: {
    level: 6,
    instant: true,
    long: "Cut short an enemy's spell (the shaman's bolt, say) and stun it for 1 s.",
  },
  execute: {
    level: 7,
    instant: true,
    long: 'Finish off a target below 25% health: 30% of the health it has left, plus 8.',
  },
  whirlwind: { level: 9, long: 'Spin with your blade out and hit every enemy around you for 7.' },
  mortal: {
    level: 11,
    instant: true,
    long: 'A crushing blow for 12 damage that stuns the target for 0.6 s.',
  },
  sunder: {
    talent: 'sunder',
    instant: true,
    long: "Strike for 6 and crack the target's guard: it takes 20% more damage from you for 10 s.",
  },
  deathblow: {
    talent: 'deathblow',
    instant: true,
    long: 'A mighty finishing blow for 30 damage. If it kills, Deathblow is ready again at once.',
  },
  bloodrage: {
    talent: 'bloodrage',
    instant: true,
    long: 'Pay 15% of your health in blood to gain 40 mana. Not below 20% health.',
  },
  berserk: {
    talent: 'berserk',
    instant: true,
    long: 'Go berserk for 10 s: your auto-attacks swing 50% faster and you deal 20% more damage.',
  },
  shieldbash: {
    talent: 'shield_bash',
    instant: true,
    long: 'Slam your shield into the target for 6 damage, stunning it for 2 s and stopping any spell. Needs a shield in your off hand.',
  },
  laststand: {
    talent: 'last_stand',
    instant: true,
    long: 'Dig in: heal 30% of your maximum health and take 30% less damage for 8 s.',
  },
};

/** Spellbook order: class spells by level, then talent spells by tree. */
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
};
