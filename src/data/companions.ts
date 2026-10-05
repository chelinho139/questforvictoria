import type { Cond } from './story';
import type { ItemId, Slot } from './items';
import type { VoiceSound } from '../sim/types';
import type { NpcId } from './npcs';

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
  'join' | 'down' | 'up' | 'ambush' | 'kill' | 'night' | 'roots' | `see:${string}` | `near:${string}`;

export interface Bark {
  on: BarkOn;
  lines: string[];
  /** Seconds before this one can be said again (default 40). */
  cd?: number;
}

export interface CompanionDef {
  name: string;
  /** Who she is when you talk to her (her dialog, her quests, her voice). */
  npc?: NpcId;
  /** Her voice (a Speaker in phaser/audio/sounds.ts). */
  voice?: VoiceSound;
  /** How she is drawn: her own frames (render/npcArt.ts), or else an HD hero look and what she wears (data/items.ts). */
  art?: 'wren';
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
    npc: 'wren',
    voice: 'wrenVoice',
    art: 'wren',
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
      // the first time the roots on the bridge hold someone
      { on: 'roots', lines: ['The whistle! Blow the whistle!'], cd: 45 },
      { on: 'join', lines: ['Stay on the path.', 'Right behind you.', 'Watch the willows.'], cd: 90 },
      { on: 'kill', lines: ['Got it.', 'Mine.', 'Stay down.', 'That’s for Marcian.'], cd: 45 },
      { on: 'see:mourning_light', lines: ['Don’t follow the lights.', 'Lights. Don’t look at them.'], cd: 60 },
      { on: 'see:wolf', lines: ['Wolves. Back to back.'], cd: 90 },
      { on: 'see:thornback', lines: ['Thornbacks. If one howls, the rest come.'], cd: 90 },
      { on: 'see:spider', lines: ['Mind the canopy. They drop.'], cd: 90 },
      { on: 'see:mourner', lines: ['Kill the weeping one first. It keeps the others up.'], cd: 90 },
      { on: 'see:tower_guard', lines: ['Wait for the shield to drop. Then hit him.'], cd: 90 },
      { on: 'see:deer', lines: ['Venison. Don’t tell Ada.'], cd: 120 },
      {
        on: 'near:mark',
        lines: ['That’s one of his marks.', 'There. In the bark. That’s Marcian’s.'],
        cd: 60,
      },
      {
        on: 'night',
        lines: ['It’s getting dark. Stay close.', 'Night. Watch the trees.'],
        cd: 120,
      },
    ],
  },
};

export const COMPANION_IDS = Object.keys(COMPANIONS) as CompanionId[];
