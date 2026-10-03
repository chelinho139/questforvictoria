import type { Cond } from './story';
import type { ItemId, Slot } from './items';
import type { VoiceSound } from '../sim/types';

/**
 * Companions: someone from the story who walks with the heroes for a while and fights beside
 * them (sim/Companion.ts). They follow the nearest hero, shoot what the heroes fight, can't
 * die (badly hurt, they drop to one knee and are up again a little later), wait at home when
 * the heroes leave the places they go, and call out what they see.
 */
export type CompanionId = 'wren';

/**
 * What makes a companion speak up (a line picked at random, then not again for `cd`):
 * coming along into a region, going down and getting up, something dropping out of the trees,
 * a kill, a creature of a kind coming in sight (`see:<kind>`), walking past an object of a
 * kind (`near:<kind>`), and night falling.
 */
export type BarkOn =
  'join' | 'down' | 'up' | 'ambush' | 'kill' | 'night' | `see:${string}` | `near:${string}`;

export interface Bark {
  on: BarkOn;
  lines: string[];
  /** Seconds before this one can be said again (default 40). */
  cd?: number;
}

export interface CompanionDef {
  name: string;
  /** Her voice (a Speaker in phaser/audio/sounds.ts). */
  voice?: VoiceSound;
  /** How she is drawn: an HD hero look and what she wears (data/items.ts). */
  look: string;
  equip: Partial<Record<Slot, ItemId>>;
  /** With the heroes while this holds. */
  when: Cond;
  /** The regions she goes into with them. */
  regions: string[];
  /** Where she waits while no hero is in those regions. */
  home: { region: string; spot: string };
  /** Health at level 0 and per level of the heroes she walks with (the highest of them). */
  hp: [number, number];
  /** Her arrows: damage at level 0 and per level, seconds between shots, and how far she shoots. */
  shot: { dmg: [number, number]; period: number; range: number };
  /** Seconds on one knee once badly hurt. */
  down: number;
  barks: Bark[];
}

export const COMPANIONS: Record<CompanionId, CompanionDef> = {
  // Marcian's sister: from the thorn wall to the Weeping Bridge she walks the wood with you
  wren: {
    name: 'Wren',
    look: 'traveller',
    equip: {
      weapon: 'hunting_bow',
      offhand: 'leather_quiver',
      body: 'leather_tunic',
      legs: 'leather_trousers',
      feet: 'leather_boots',
    },
    when: { all: [{ flag: 'wren_follows' }, { not: 'wren_home' }] },
    regions: ['weepwood', 'kingschase', 'heronreach', 'heronlodge', 'lislebarrow', 'weepingbridge'],
    home: { region: 'weepwood', spot: 'wren_camp' },
    hp: [150, 18],
    // a little weaker than a hero's arrows
    shot: { dmg: [4, 1], period: 1.7, range: 190 },
    down: 10,
    barks: [
      {
        on: 'down',
        lines: [
          'Bloody— I’m fine. I’m FINE.',
          'Ow. Ow. Keep going, I’m up in a moment.',
          'Rot and thorns…',
        ],
        cd: 15,
      },
      { on: 'up', lines: ['Right. Where were we.', 'Up. Still here.', 'That one’s mine.'], cd: 15 },
      { on: 'ambush', lines: ['Spider. Up. UP.', 'Above you!', 'Look up!'], cd: 20 },
      {
        on: 'night',
        lines: ['It’s getting dark. Stay close.', 'Night. Watch the trees.'],
        cd: 120,
      },
    ],
  },
};

export const COMPANION_IDS = Object.keys(COMPANIONS) as CompanionId[];
