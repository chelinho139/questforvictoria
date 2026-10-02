export type SkillKey = 'thrust' | 'slash' | 'rend' | 'whirlwind' | 'warcry' | 'charge';
export type ActionKey =
  | 'interrupt'
  | 'execute'
  | 'mortal'
  | 'target'
  | 'mount'
  // abilities you learn from talents
  | 'sunder'
  | 'deathblow'
  | 'bloodrage'
  | 'berserk'
  | 'shieldbash'
  | 'laststand';
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
};

export const ACTIONS: Record<ActionKey, ActionDef> = {
  interrupt: { n: 'Interrupt', col: '#3ddbd9', cd: 15, desc: 'cuts the cast · 15 s' },
  execute: { n: 'Execute', col: '#e0504b', cd: 0, desc: 'target < 25% and close' },
  mortal: { n: 'Mortal Strike', col: '#f2c14e', cd: 30, desc: '12 + stun · 30 s' },
  target: { n: 'Switch target', col: '#f2c14e', cd: 0, desc: 'nearest enemy' },
  mount: { n: 'Mount', col: '#a78bfa', cd: 0, desc: '1 s still · ×1.8' },
  sunder: { n: 'Sunder', col: '#c8d2e0', cd: 10, c: 8, desc: '6 · +20% taken 10 s · 10 s' },
  deathblow: { n: 'Deathblow', col: '#e0504b', cd: 20, c: 25, desc: '30 · resets on a kill · 20 s' },
  bloodrage: { n: 'Bloodrage', col: '#e0504b', cd: 30, desc: '−15% health → +40 mana · 30 s' },
  berserk: { n: 'Berserk', col: '#ff8c42', cd: 45, desc: '+50% swing, +20% dmg 10 s · 45 s' },
  shieldbash: { n: 'Shield Bash', col: '#93a0b8', cd: 12, c: 5, desc: '6 + stun 2 s · needs a shield · 12 s' },
  laststand: { n: 'Last Stand', col: '#6ccf6a', cd: 60, desc: 'heal 30%, −30% damage 8 s · 60 s' },
};

export const PRESETS: Record<string, SkillKey[]> = {
  mobs: ['charge', 'thrust', 'slash', 'whirlwind'],
  boss: ['charge', 'warcry', 'thrust', 'slash'],
  pvp: ['charge', 'thrust', 'rend', 'slash'],
};

export const DEFAULT_WHEEL_1: ActionKey[] = ['interrupt', 'target', 'execute', 'mortal'];
export const DEFAULT_WHEEL_2: SkillKey[] = ['slash', 'thrust', 'rend', 'charge'];

export function isSkill(k: string): k is SkillKey {
  return k in SKILLS;
}

export function isAction(k: string): k is ActionKey {
  return k in ACTIONS;
}
