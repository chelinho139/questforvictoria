import type { ItemId, Slot } from './items';
import type { SkillKey, ActionKey } from './skills';

/**
 * The classes a hero can be. A class decides the spells you learn, your talent trees, how
 * you auto-attack, which weapons you can hold, and what you start with. Armour is shared.
 * See docs/archer.md and docs/sorceress.md for the designs and the balance numbers.
 */
export type ClassId = 'warrior' | 'archer' | 'sorceress';

export interface ClassDef {
  name: string;
  /** One of them, and several, in a sentence ("a warrior", "warriors"). */
  one: string;
  many: string;
  /** One line for the character screens. */
  blurb: string;
  /** How the class plays, for the new-character screen. */
  about: string;
  /** Health at level 1 (each level adds HP_PER_LEVEL). */
  hp: number;
  /** Auto-attack: reach (world px), seconds between attacks, base damage, and whether it shoots (arrows, or bolts from a staff). */
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
    one: 'a warrior',
    many: 'warriors',
    blurb: 'Steel up close: armour, a shield and a blade.',
    about:
      'Fights face to face: charges in, cuts, bleeds and whirls, wears a shield and shrugs off blows. Learns Blade, Fury and Warden talents.',
    hp: 175,
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
    one: 'an archer',
    many: 'archers',
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
  sorceress: {
    name: 'Sorceress',
    one: 'a sorceress',
    many: 'sorceresses',
    blurb: 'Fire, frost and lightning from a staff.',
    about:
      'Fights from a distance with a staff and stands still to cast: bolts of fire and frost fly to their mark, flames fall on crowds and lightning leaps between foes. The lightest of the three, with no shield. Learns Fire, Frost and Arcane talents.',
    // the lightest: she pays for her reach and her crowds in health
    hp: 125,
    aa: { range: 200, period: 1.7, dmg: 4, ranged: true },
    starter: { weapon: 'gnarled_staff', legs: 'cloth_trousers' },
    presets: {
      mobs: ['frostbolt', 'spark', 'firebolt', 'flamestrike'],
      boss: ['arcanepower', 'spark', 'firebolt', 'ignite'],
      pvp: ['frostbolt', 'spark', 'ignite', 'firebolt'],
    },
    wheel1: ['counterspell', 'target', 'incinerate', 'chainlightning'],
    wheel2: ['firebolt', 'spark', 'ignite', 'frostbolt'],
  },
};

export const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

export function isClass(v: unknown): v is ClassId {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(CLASSES, v);
}

/** How far an archer's arrows fly to their mark (world px per second). */
export const ARROW_SPEED = 600;
/** How fast a sorceress's bolts fly (world px per second): slower than an arrow, so you see them go. */
export const BOLT_SPEED = 480;
/** After loosing an arrow (or a bolt), an archer (or a sorceress) holds still this long (the draw and release). */
export const AIM_HOLD = 0.3;
