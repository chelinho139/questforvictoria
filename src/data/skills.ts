import { CLASSES } from './classes';

/** Spells on the global cooldown (the warrior's first, then the archer's, then the sorceress's). */
export type SkillKey =
  | 'thrust'
  | 'slash'
  | 'rend'
  | 'whirlwind'
  | 'warcry'
  | 'charge'
  | 'quickshot'
  | 'aimedshot'
  | 'barbed'
  | 'concussive'
  | 'mark'
  | 'volley'
  | 'spark'
  | 'firebolt'
  | 'ignite'
  | 'frostbolt'
  | 'arcanepower'
  | 'flamestrike';
/** Instant spells, off the global cooldown. */
export type ActionKey =
  | 'interrupt'
  | 'execute'
  | 'mortal'
  | 'target'
  | 'mount'
  | 'revive'
  // abilities you learn from talents
  | 'sunder'
  | 'deathblow'
  | 'bloodrage'
  | 'berserk'
  | 'shieldbash'
  | 'laststand'
  // the archer's
  | 'silence'
  | 'killshot'
  | 'pierce'
  | 'rapidfire'
  | 'deadeye'
  | 'beartrap'
  | 'predator'
  | 'disengage'
  | 'camouflage'
  // the sorceress's
  | 'counterspell'
  | 'incinerate'
  | 'chainlightning'
  | 'scorch'
  | 'pyroblast'
  | 'frostnova'
  | 'icyveins'
  | 'blink'
  | 'barrier';
export type Key = SkillKey | ActionKey;
/** Anything that can sit in a wheel, including the Rev toggle item. */
export type WheelKey = Key | 'rev';

export interface SkillDef {
  n: string;
  d: number; // damage
  c: number; // mana cost
  cd: number; // cooldown seconds
  col: string;
  range: number; // 0 = no target needed
  aoe?: number;
  /** Shot from a bow (or cast from a staff): it flies there, and the archer (or sorceress) stands still to shoot. */
  shot?: boolean;
  desc: string;
}

export interface ActionDef {
  n: string;
  col: string;
  cd: number;
  desc: string;
  /** Mana cost, if any. */
  c?: number;
}

export const SKILLS: Record<SkillKey, SkillDef> = {
  thrust: { n: 'Thrust', d: 5, c: 4, cd: 6, col: '#d3dcea', range: 56, desc: '5 dmg · 6 s' },
  slash: { n: 'Slash', d: 8, c: 5, cd: 9, col: '#ff8c42', range: 56, desc: '8 · combo · 9 s' },
  rend: { n: 'Rend', d: 3, c: 10, cd: 15, col: '#e0504b', range: 56, desc: '3 + bleed 8 s · 15 s' },
  whirlwind: { n: 'Whirlwind', d: 7, c: 20, cd: 14, col: '#3ddbd9', range: 0, aoe: 84, desc: '7 AoE · 14 s' },
  warcry: { n: 'War Cry', d: 0, c: 15, cd: 40, col: '#f2c14e', range: 0, desc: '+20% 15 s · 40 s' },
  charge: { n: 'Charge', d: 4, c: 10, cd: 20, col: '#a78bfa', range: 230, desc: '4 + stun · far · 20 s' },
  // the archer's: each mirrors a warrior spell's cost and cooldown, from 220 px away
  quickshot: {
    n: 'Quick Shot',
    d: 5,
    c: 4,
    cd: 6,
    col: '#d3dcea',
    range: 220,
    shot: true,
    desc: '5 dmg · 6 s',
  },
  aimedshot: {
    n: 'Aimed Shot',
    d: 8,
    c: 5,
    cd: 9,
    col: '#ff8c42',
    range: 220,
    shot: true,
    desc: '8 · ×1.5 after Quick Shot · 9 s',
  },
  barbed: {
    n: 'Barbed Arrow',
    d: 3,
    c: 10,
    cd: 15,
    col: '#e0504b',
    range: 220,
    shot: true,
    desc: '3 + bleed 8 s · 15 s',
  },
  concussive: {
    n: 'Concussive Shot',
    d: 4,
    c: 10,
    cd: 20,
    col: '#a78bfa',
    range: 220,
    shot: true,
    desc: '4 + slow 50% 6 s · 20 s',
  },
  mark: {
    n: "Hunter's Mark",
    d: 0,
    c: 15,
    cd: 40,
    col: '#f2c14e',
    range: 260,
    desc: '+20% to your mark 15 s · 40 s',
  },
  volley: {
    n: 'Volley',
    d: 7,
    c: 20,
    cd: 14,
    col: '#3ddbd9',
    range: 220,
    aoe: 70,
    shot: true,
    desc: '7 to all near the target · 14 s',
  },
  // the sorceress's: each mirrors an archer spell's cost and cooldown, cast from a staff
  spark: {
    n: 'Spark',
    d: 5,
    c: 4,
    cd: 6,
    col: '#ffd27a',
    range: 220,
    shot: true,
    desc: '5 dmg · 6 s',
  },
  firebolt: {
    n: 'Firebolt',
    d: 8,
    c: 5,
    cd: 9,
    col: '#ff7a3a',
    range: 220,
    shot: true,
    desc: '8 · ×1.5 after Spark · 9 s',
  },
  ignite: {
    n: 'Ignite',
    d: 3,
    c: 10,
    cd: 15,
    col: '#e0504b',
    range: 220,
    shot: true,
    desc: '3 + burn 8 s · 15 s',
  },
  frostbolt: {
    n: 'Frostbolt',
    d: 4,
    c: 10,
    cd: 20,
    col: '#8ad4ff',
    range: 220,
    shot: true,
    desc: '4 + slow 50% 6 s · 20 s',
  },
  arcanepower: {
    n: 'Arcane Power',
    d: 0,
    c: 15,
    cd: 40,
    col: '#c08aff',
    range: 0,
    desc: '+20% 15 s · 40 s',
  },
  flamestrike: {
    n: 'Flamestrike',
    d: 7,
    c: 20,
    cd: 14,
    col: '#ff8c42',
    range: 220,
    aoe: 70,
    shot: true,
    desc: '7 to all near the target · 14 s',
  },
};

export const ACTIONS: Record<ActionKey, ActionDef> = {
  interrupt: { n: 'Interrupt', col: '#3ddbd9', cd: 15, desc: 'cuts the cast · 15 s' },
  execute: { n: 'Execute', col: '#e0504b', cd: 20, desc: 'target < 25% and close · 20 s' },
  mortal: { n: 'Mortal Strike', col: '#f2c14e', cd: 30, desc: '12 + stun · 30 s' },
  target: { n: 'Switch target', col: '#f2c14e', cd: 0, desc: 'nearest enemy' },
  mount: { n: 'Mount', col: '#a78bfa', cd: 0, desc: '1 s still · ×1.8' },
  revive: { n: 'Revive', col: '#f2e08a', cd: 0, desc: 'a fallen friend · 8 s still' },
  sunder: { n: 'Sunder', col: '#c8d2e0', cd: 10, c: 8, desc: '6 · +20% taken 10 s · 10 s' },
  deathblow: { n: 'Deathblow', col: '#e0504b', cd: 20, c: 25, desc: '30 · resets on a kill · 20 s' },
  bloodrage: { n: 'Bloodrage', col: '#e0504b', cd: 30, desc: '−15% health → +40 mana · 30 s' },
  berserk: { n: 'Berserk', col: '#ff8c42', cd: 45, desc: '+50% swing, +20% dmg 10 s · 45 s' },
  shieldbash: { n: 'Shield Bash', col: '#93a0b8', cd: 12, c: 5, desc: '6 + stun 2 s · needs a shield · 12 s' },
  laststand: { n: 'Last Stand', col: '#6ccf6a', cd: 60, desc: 'heal 30%, −30% damage 8 s · 60 s' },
  silence: { n: 'Silencing Shot', col: '#3ddbd9', cd: 15, desc: 'cuts the cast · far · 15 s' },
  killshot: { n: 'Kill Shot', col: '#e0504b', cd: 20, desc: 'target < 25% · far · 20 s' },
  pierce: { n: 'Piercing Shot', col: '#f2c14e', cd: 30, desc: '12 through a line · 30 s' },
  rapidfire: { n: 'Rapid Fire', col: '#c8d2e0', cd: 10, c: 8, desc: '3 arrows × 4 · 10 s' },
  deadeye: { n: 'Deadeye', col: '#e0504b', cd: 20, c: 25, desc: '26 · resets on a kill · 20 s' },
  beartrap: { n: 'Bear Trap', col: '#c8a05a', cd: 20, c: 10, desc: 'trap: 8 + held 3 s · 20 s' },
  predator: { n: 'Predator', col: '#ff8c42', cd: 45, desc: '+50% shots, +20% dmg 10 s · 45 s' },
  disengage: { n: 'Disengage', col: '#6ccf6a', cd: 12, c: 5, desc: 'leap back · 12 s' },
  camouflage: { n: 'Camouflage', col: '#6ccf6a', cd: 60, desc: 'vanish, heal 20% · 60 s' },
  counterspell: { n: 'Counterspell', col: '#c08aff', cd: 15, desc: 'cuts the cast · far · 15 s' },
  incinerate: { n: 'Incinerate', col: '#e0504b', cd: 20, desc: 'target < 25% · far · 20 s' },
  chainlightning: { n: 'Chain Lightning', col: '#bfe4ff', cd: 30, desc: '12, leaps to 2 more · 30 s' },
  scorch: { n: 'Scorch', col: '#ff9a4a', cd: 10, c: 8, desc: '6 · +20% taken 10 s · 10 s' },
  pyroblast: { n: 'Pyroblast', col: '#e0504b', cd: 20, c: 25, desc: '26 · resets on a kill · 20 s' },
  frostnova: { n: 'Frost Nova', col: '#8ad4ff', cd: 20, c: 10, desc: '4 around you + frozen 3 s · 20 s' },
  icyveins: { n: 'Icy Veins', col: '#8ad4ff', cd: 45, desc: '+50% bolts, +20% dmg 10 s · 45 s' },
  blink: { n: 'Blink', col: '#c08aff', cd: 12, c: 5, desc: 'vanish and step back · 12 s' },
  barrier: { n: 'Arcane Barrier', col: '#c08aff', cd: 60, desc: 'heal 30%, −30% damage 8 s · 60 s' },
};

/** The Rev sequencer's presets (each class has its own: data/classes.ts). */
export const PRESETS: Record<string, SkillKey[]> = CLASSES.warrior.presets;

export const DEFAULT_WHEEL_1: ActionKey[] = CLASSES.warrior.wheel1;
export const DEFAULT_WHEEL_2: SkillKey[] = CLASSES.warrior.wheel2;

/** The instant spells that loose an arrow or a bolt (they need a bow or a staff, and planted feet). */
const SHOT_ACTIONS = new Set<string>([
  'silence',
  'killshot',
  'pierce',
  'rapidfire',
  'deadeye',
  'counterspell',
  'incinerate',
  'chainlightning',
  'scorch',
  'pyroblast',
]);

/** A spell that looses an arrow or a bolt: the archer needs a bow (the sorceress a staff) and has to stand still. */
export function isShot(k: string): boolean {
  return (k in SKILLS && !!SKILLS[k as SkillKey].shot) || SHOT_ACTIONS.has(k);
}

export function isSkill(k: string): k is SkillKey {
  return k in SKILLS;
}

export function isAction(k: string): k is ActionKey {
  return k in ACTIONS;
}
