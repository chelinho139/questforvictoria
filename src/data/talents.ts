import type { ActionKey } from './skills';
import type { SpellKey } from './spells';

/**
 * Levels and talents, in the spirit of Diablo 2 and classic WoW. You earn experience from
 * kills, quests, gathering and crafting; every level gives a talent point and a little
 * health. Talents sit in three trees of five tiers: a tier opens once you have spent
 * TIER_POINTS more points in that tree, some talents need another one maxed first (an
 * arrow), and each tree ends in a one-point capstone. Every talent changes real rules
 * (see TalentFx and where Sim reads `tal`).
 */

// ---------------------------------------------------------------- levels
export const MAX_LEVEL = 25;
/** Extra maximum health per level above 1. */
export const HP_PER_LEVEL = 5;

/** Experience needed to go from `level` to the next (quick at first, slower later). */
export function xpToNext(level: number): number {
  return Math.round((60 * Math.pow(1.25, level - 1)) / 5) * 5;
}

/** Experience for things that are not kills or quests (kept small: the story and the fights carry levelling). */
export const XP_FOR = { tree: 3, rock: 4, craft: 2, build: 8 };

// ---------------------------------------------------------------- talents
export type TreeId = 'blade' | 'fury' | 'warden';

export const TREES: Record<TreeId, { name: string; icon: string; blurb: string }> = {
  blade: {
    name: 'Blade',
    icon: 'icon:thrust',
    blurb: 'One foe at a time: sharper hits, critical strikes, bleeding wounds.',
  },
  fury: {
    name: 'Fury',
    icon: 'icon:warcry',
    blurb: 'Rage and momentum: faster swings, war cries, charges and whirlwinds.',
  },
  warden: {
    name: 'Warden',
    icon: 'item:iron_shield',
    blurb: 'The old order: armour, health, second winds, food, and a life in the wilds.',
  },
};
export const TREE_IDS = Object.keys(TREES) as TreeId[];

/** Points to spend in a tree before its next tier opens (tier t needs t × this). */
export const TIER_POINTS = 4;
export const TIERS = 5;
export const COLS = 3;

/**
 * Everything talents can change, summed over learned ranks. Fractions are bonuses
 * (0.1 = +10%); seconds and flat numbers are what they say.
 */
export interface TalentFx {
  // Blade
  dmg: number; // all damage
  crit: number; // chance to crit (×1.6)
  critDmg: number; // added to the ×1.6
  thrust: number; // flat Thrust damage
  slashCombo: number; // added to Slash's ×1.5 after Thrust
  rendTick: number; // bleed damage per second
  rendDur: number; // seconds
  mortalDmg: number;
  mortalCd: number; // seconds sooner
  execThreshold: number; // added to 25%
  execDmg: number;
  killMana: number;
  critBleed: number; // seconds of bleed on a crit
  // Fury
  aaDmg: number;
  aaSpeed: number;
  warcryDur: number;
  warcryBonus: number; // added to War Cry's +20%
  chargeCd: number;
  chargeStun: number;
  lifeOnHit: number;
  whirlDmg: number;
  whirlReach: number;
  whirlCd: number;
  enrage: number; // damage while below half health
  rampage: number; // seconds of War Cry per kill
  // Warden
  armor: number;
  hp: number;
  gather: number; // chop and mine speed
  shieldWall: number; // armor with a shield
  killHeal: number; // health per kill
  food: number;
  regen: number; // health per second
  intCd: number;
  intStun: number;
  prospect: number; // chance of an extra log or ore
  moveSpeed: number; // walking and riding
  mountTime: number;
  lastWarden: number; // 1: survive a killing blow once a minute
}

export const NO_FX: TalentFx = {
  dmg: 0,
  crit: 0,
  critDmg: 0,
  thrust: 0,
  slashCombo: 0,
  rendTick: 0,
  rendDur: 0,
  mortalDmg: 0,
  mortalCd: 0,
  execThreshold: 0,
  execDmg: 0,
  killMana: 0,
  critBleed: 0,
  aaDmg: 0,
  aaSpeed: 0,
  warcryDur: 0,
  warcryBonus: 0,
  chargeCd: 0,
  chargeStun: 0,
  lifeOnHit: 0,
  whirlDmg: 0,
  whirlReach: 0,
  whirlCd: 0,
  enrage: 0,
  rampage: 0,
  armor: 0,
  hp: 0,
  gather: 0,
  shieldWall: 0,
  killHeal: 0,
  food: 0,
  regen: 0,
  intCd: 0,
  intStun: 0,
  prospect: 0,
  moveSpeed: 0,
  mountTime: 0,
  lastWarden: 0,
};

export interface TalentDef {
  tree: TreeId;
  name: string;
  /** 'icon:<skill or ui icon>' or 'item:<item id>'. */
  icon: string;
  tier: number;
  col: number;
  ranks: number;
  /** A talent in the same column, one or more tiers up, that must be maxed first. */
  requires?: string;
  /** A new ability this talent teaches (see data/spells.ts). */
  grants?: SpellKey & ActionKey;
  /** What `r` ranks do (r ≥ 1). */
  desc: (r: number) => string;
  /** What each rank adds. */
  fx: Partial<TalentFx>;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const T = (
  tree: TreeId,
  name: string,
  icon: string,
  tier: number,
  col: number,
  ranks: number,
  desc: (r: number) => string,
  fx: Partial<TalentFx>,
  more: Partial<TalentDef> = {}
): TalentDef => ({
  tree,
  name,
  icon,
  tier,
  col,
  ranks,
  desc,
  fx,
  ...more,
});

/**
 * Each tree mixes passives with two abilities you can only learn here (marked `grants`):
 * one in tier 3 and the capstone.
 */
export const TALENTS: Record<string, TalentDef> = {
  // ------------------------------------------------------------ Blade: one foe at a time
  honed_edge: T(
    'blade',
    'Honed Edge',
    'item:stone',
    0,
    0,
    5,
    r => `All your attacks deal ${pct(0.03 * r)} more damage.`,
    { dmg: 0.03 }
  ),
  precise_thrust: T(
    'blade',
    'Precise Thrust',
    'icon:thrust',
    0,
    1,
    3,
    r => `Thrust deals ${2 * r} more damage.`,
    { thrust: 2 }
  ),
  lingering_rend: T(
    'blade',
    'Lingering Rend',
    'icon:rend',
    0,
    2,
    3,
    r => `Rend's bleed deals ${r} more damage every second.`,
    { rendTick: 1 }
  ),
  keen_eye: T(
    'blade',
    'Keen Eye',
    'icon:eye',
    1,
    0,
    5,
    r => `${pct(0.02 * r)} chance for any attack to be a critical hit (×1.6 damage).`,
    { crit: 0.02 }
  ),
  twin_cuts: T(
    'blade',
    'Twin Cuts',
    'icon:slash',
    1,
    1,
    2,
    r => `Slash right after Thrust deals ×${(1.5 + 0.25 * r).toFixed(2)} damage instead of ×1.5.`,
    { slashCombo: 0.25 }
  ),
  bloodletting: T(
    'blade',
    'Bloodletting',
    'icon:rend',
    1,
    2,
    2,
    r => `Rend bleeds for ${3 * r} s longer.`,
    { rendDur: 3 },
    { requires: 'lingering_rend' }
  ),
  brutal_strikes: T(
    'blade',
    'Brutal Strikes',
    'icon:target',
    2,
    0,
    3,
    r => `Critical hits deal ×${(1.6 + 0.2 * r).toFixed(1)} damage instead of ×1.6.`,
    { critDmg: 0.2 },
    { requires: 'keen_eye' }
  ),
  sunder: T(
    'blade',
    'Sunder',
    'icon:sunder',
    2,
    1,
    1,
    () =>
      'Teaches Sunder: strike for 6 and the target takes 20% more damage from you for 10 s. 8 mana, 10 s cooldown.',
    {},
    { grants: 'sunder' }
  ),
  improved_mortal: T(
    'blade',
    'Improved Mortal Strike',
    'icon:mortal',
    2,
    2,
    3,
    r => `Mortal Strike deals ${4 * r} more damage and is ready ${4 * r} s sooner.`,
    { mortalDmg: 4, mortalCd: 4 }
  ),
  wardens_edge: T(
    'blade',
    "Warden's Edge",
    'item:iron_sword',
    3,
    0,
    1,
    () => 'Your critical hits open a wound: the target bleeds for 4 s.',
    { critBleed: 4 },
    { requires: 'brutal_strikes' }
  ),
  executioner: T(
    'blade',
    'Executioner',
    'icon:execute',
    3,
    1,
    2,
    r => `Execute works on foes below ${25 + 5 * r}% health and hits ${10 * r}% harder.`,
    { execThreshold: 0.05, execDmg: 0.1 }
  ),
  reaping_blows: T(
    'blade',
    'Reaping Blows',
    'icon:rev',
    3,
    2,
    2,
    r => `Every kill gives back ${8 * r} mana.`,
    { killMana: 8 }
  ),
  deathblow: T(
    'blade',
    'Deathblow',
    'icon:deathblow',
    4,
    1,
    1,
    () =>
      'Teaches Deathblow: a finishing blow for 30 damage. If it kills, it is ready again at once. 25 mana, 20 s cooldown.',
    {},
    { grants: 'deathblow' }
  ),

  // ------------------------------------------------------------ Fury: rage and momentum
  battle_rage: T(
    'fury',
    'Battle Rage',
    'item:rusty_sword',
    0,
    0,
    5,
    r => `Auto-attacks deal ${r} more damage.`,
    { aaDmg: 1 }
  ),
  booming_voice: T(
    'fury',
    'Booming Voice',
    'icon:warcry',
    0,
    1,
    2,
    r => `War Cry lasts ${5 * r} s longer.`,
    { warcryDur: 5 }
  ),
  momentum: T(
    'fury',
    'Momentum',
    'icon:charge',
    0,
    2,
    3,
    r => `Charge is ready ${3 * r} s sooner.`,
    { chargeCd: 3 }
  ),
  flurry: T(
    'fury',
    'Flurry',
    'item:woodcutter_axe',
    1,
    0,
    3,
    r => `Auto-attacks swing ${10 * r}% faster.`,
    { aaSpeed: 0.1 },
    { requires: 'battle_rage' }
  ),
  commanding_shout: T(
    'fury',
    'Commanding Shout',
    'icon:warcry',
    1,
    1,
    3,
    r => `War Cry raises your damage by ${20 + 5 * r}% instead of 20%.`,
    { warcryBonus: 0.05 },
    { requires: 'booming_voice' }
  ),
  stunning_charge: T(
    'fury',
    'Stunning Charge',
    'icon:charge',
    1,
    2,
    2,
    r => `Charge stuns for ${(0.5 * r).toFixed(1)} s longer.`,
    { chargeStun: 0.5 },
    { requires: 'momentum' }
  ),
  bloodthirst: T(
    'fury',
    'Bloodthirst',
    'item:meat',
    2,
    0,
    3,
    r => `Every direct hit heals you for ${r} health.`,
    { lifeOnHit: 1 }
  ),
  bloodrage: T(
    'fury',
    'Bloodrage',
    'icon:bloodrage',
    2,
    1,
    1,
    () => 'Teaches Bloodrage: pay 15% of your health to gain 40 mana. 30 s cooldown.',
    {},
    { grants: 'bloodrage' }
  ),
  improved_whirlwind: T(
    'fury',
    'Improved Whirlwind',
    'icon:whirlwind',
    2,
    2,
    3,
    r => `Whirlwind deals ${2 * r} more damage and reaches ${10 * r} further.`,
    { whirlDmg: 2, whirlReach: 10 }
  ),
  enrage: T(
    'fury',
    'Enrage',
    'icon:flame',
    3,
    0,
    2,
    r => `Below half health you deal ${10 * r}% more damage.`,
    { enrage: 0.1 },
    { requires: 'bloodthirst' }
  ),
  rampage: T(
    'fury',
    'Rampage',
    'icon:flame',
    3,
    1,
    1,
    () => 'Every kill fires up War Cry for 6 s, or adds 6 s to it.',
    { rampage: 6 }
  ),
  cyclone: T(
    'fury',
    'Cyclone',
    'icon:whirlwind',
    3,
    2,
    1,
    () => 'Whirlwind is ready 6 s sooner.',
    { whirlCd: 6 },
    { requires: 'improved_whirlwind' }
  ),
  berserk: T(
    'fury',
    'Berserk',
    'icon:berserk',
    4,
    1,
    1,
    () =>
      'Teaches Berserk: for 10 s your auto-attacks swing 50% faster and you deal 20% more damage. 45 s cooldown.',
    {},
    { grants: 'berserk' }
  ),

  // ------------------------------------------------------------ Warden: armour, health and the wilds
  toughness: T('warden', 'Toughness', 'item:chainmail', 0, 0, 5, r => `${2 * r} more armor.`, {
    armor: 2,
  }),
  vitality: T('warden', 'Vitality', 'icon:heart', 0, 1, 5, r => `${6 * r} more maximum health.`, {
    hp: 6,
  }),
  woodsman: T(
    'warden',
    'Woodsman',
    'item:woodcutter_axe',
    0,
    2,
    3,
    r => `Chop and mine ${15 * r}% faster.`,
    { gather: 0.15 }
  ),
  shield_wall: T(
    'warden',
    'Shield Wall',
    'item:iron_shield',
    1,
    0,
    3,
    r => `With a shield equipped, ${3 * r} more armor.`,
    { shieldWall: 3 },
    { requires: 'toughness' }
  ),
  second_wind: T(
    'warden',
    'Second Wind',
    'icon:secondwind',
    1,
    1,
    3,
    r => `Every kill heals you for ${5 * r} health.`,
    { killHeal: 5 }
  ),
  prospector: T(
    'warden',
    'Prospector',
    'item:pickaxe',
    1,
    2,
    2,
    r =>
      `${20 * r}% chance of an extra log when a tree falls, and of extra ore when a rock breaks.`,
    { prospect: 0.2 },
    { requires: 'woodsman' }
  ),
  shield_bash: T(
    'warden',
    'Shield Bash',
    'icon:shieldbash',
    2,
    0,
    1,
    () =>
      'Teaches Shield Bash: slam your shield into the target for 6 damage, stunning it 2 s and stopping its spell. Needs a shield. 5 mana, 12 s cooldown.',
    {},
    { grants: 'shieldbash', requires: 'shield_wall' }
  ),
  steadfast: T(
    'warden',
    'Steadfast',
    'item:iron_helm',
    2,
    1,
    2,
    r => `Regain ${(0.5 * r).toFixed(1)} health every second.`,
    { regen: 0.5 }
  ),
  camp_cook: T(
    'warden',
    'Camp Cook',
    'item:cooked_meat',
    2,
    2,
    2,
    r => `Food heals ${25 * r}% more.`,
    { food: 0.25 }
  ),
  last_warden: T(
    'warden',
    'Last Warden',
    'item:vigour_amulet',
    3,
    0,
    1,
    () => 'Once a minute, a blow that would kill you leaves you at 1 health, untouchable for 2 s.',
    { lastWarden: 1 }
  ),
  watchful: T(
    'warden',
    'Watchful',
    'icon:interrupt',
    3,
    1,
    2,
    r => `Interrupt is ready ${4 * r} s sooner and stuns ${(0.5 * r).toFixed(1)} s longer.`,
    { intCd: 4, intStun: 0.5 }
  ),
  swift_feet: T(
    'warden',
    'Swift Feet',
    'icon:mount',
    3,
    2,
    2,
    r => `Walk and ride ${5 * r}% faster, and mount ${(0.4 * r).toFixed(1)} s sooner.`,
    { moveSpeed: 0.05, mountTime: 0.4 }
  ),
  last_stand: T(
    'warden',
    'Last Stand',
    'icon:laststand',
    4,
    1,
    1,
    () =>
      'Teaches Last Stand: heal 30% of your maximum health and take 30% less damage for 8 s. 60 s cooldown.',
    {},
    { grants: 'laststand' }
  ),
};

/** The talent that teaches an ability, by ability. */
export const TALENT_FOR: Partial<Record<ActionKey, string>> = Object.fromEntries(
  Object.entries(TALENTS)
    .filter(([, t]) => t.grants)
    .map(([id, t]) => [t.grants, id])
);

export const TALENT_IDS = Object.keys(TALENTS);
