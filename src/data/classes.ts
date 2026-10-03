import type { ItemId, Slot } from './items';
import type { SkillKey, ActionKey } from './skills';

/**
 * The classes a hero can be. A class decides the spells you learn, your talent trees, how
 * you auto-attack, which weapons you can hold, and what you start with. Armour is shared.
 * See docs/archer.md for the design and the balance numbers.
 */
export type ClassId = 'warrior' | 'archer';

export interface ClassDef {
  name: string;
  /** One line for the character screens. */
  blurb: string;
  /** How the class plays, for the new-character screen. */
  about: string;
  /** Health at level 1 (each level adds HP_PER_LEVEL). */
  hp: number;
  /** Auto-attack: reach (world px), seconds between attacks, base damage, and whether it shoots arrows. */
  aa: { range: number; period: number; dmg: number; ranged: boolean };
  /** What a new hero of this class wears. */
  starter: Partial<Record<Slot, ItemId>>;
  /** The Rev sequencer's presets, and the mobile wheels' first picks. */
  presets: Record<string, SkillKey[]>;
  wheel1: ActionKey[];
  wheel2: SkillKey[];
}

export const CLASSES: Record<ClassId, ClassDef> = {
  warrior: {
    name: 'Warrior',
    blurb: 'Steel up close: armour, a shield and a blade.',
    about:
      'Fights face to face: charges in, cuts, bleeds and whirls, wears a shield and shrugs off blows. Learns Blade, Fury and Warden talents.',
    hp: 160,
    aa: { range: 48, period: 1.3, dmg: 3, ranged: false },
    starter: { weapon: 'rusty_sword', legs: 'cloth_trousers' },
    presets: {
      mobs: ['charge', 'thrust', 'slash', 'whirlwind'],
      boss: ['charge', 'warcry', 'thrust', 'slash'],
      pvp: ['charge', 'thrust', 'rend', 'slash'],
    },
    wheel1: ['interrupt', 'target', 'execute', 'mortal'],
    wheel2: ['slash', 'thrust', 'rend', 'charge'],
  },
  archer: {
    name: 'Archer',
    blurb: 'Arrows from afar: plant your feet and shoot.',
    about:
      'Fights from a distance and stands still to shoot: every arrow flies to its mark, so creatures take hits on the way in. Lighter than a warrior, with no shield. Learns Marksman, Hunter and Ranger talents.',
    // lighter than a warrior: creatures take hits on the way in, so the archer pays for range in health
    hp: 130,
    aa: { range: 200, period: 1.7, dmg: 4, ranged: true },
    starter: { weapon: 'worn_shortbow', legs: 'cloth_trousers' },
    presets: {
      mobs: ['concussive', 'quickshot', 'aimedshot', 'volley'],
      boss: ['mark', 'quickshot', 'aimedshot', 'barbed'],
      pvp: ['concussive', 'quickshot', 'barbed', 'aimedshot'],
    },
    wheel1: ['silence', 'target', 'killshot', 'pierce'],
    wheel2: ['aimedshot', 'quickshot', 'barbed', 'concussive'],
  },
};

export const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

export function isClass(v: unknown): v is ClassId {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(CLASSES, v);
}

/** How far an archer's arrows fly to their mark (world px per second). */
export const ARROW_SPEED = 600;
/** After loosing an arrow, an archer holds still this long (the draw and release). */
export const AIM_HOLD = 0.3;
