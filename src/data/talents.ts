import type { ActionKey } from './skills';
import type { SpellKey } from './spells';
import type { ClassId } from './classes';

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
  return Math.round((100 * Math.pow(1.25, level - 1)) / 5) * 5;
}

/** Experience for things that are not kills or quests (kept small: the story and the fights carry levelling). */
export const XP_FOR = { tree: 3, rock: 4, craft: 2, build: 8 };

// ---------------------------------------------------------------- talents
export type TreeId = 'blade' | 'fury' | 'warden' | 'marksman' | 'hunter' | 'ranger';

export const TREES: Record<TreeId, { cls: ClassId; name: string; icon: string; blurb: string }> = {
  blade: {
    cls: 'warrior',
    name: 'Blade',
    icon: 'icon:thrust',
    blurb: 'One foe at a time: sharper hits, critical strikes, bleeding wounds.',
  },
  fury: {
    cls: 'warrior',
    name: 'Fury',
    icon: 'icon:warcry',
    blurb: 'Rage and momentum: faster swings, war cries, charges and whirlwinds.',
  },
  warden: {
    cls: 'warrior',
    name: 'Warden',
    icon: 'item:iron_shield',
    blurb: 'The old order: armour, health, second winds, food, and a life in the wilds.',
  },
  marksman: {
    cls: 'archer',
    name: 'Marksman',
    icon: 'icon:aimedshot',
    blurb: 'One arrow, one foe: harder shots, critical hits, reach, and the killing shot.',
  },
  hunter: {
    cls: 'archer',
    name: 'Hunter',
    icon: 'icon:mark',
    blurb: 'Prey and the chase: marks, snares, traps, bleeding arrows and a quick draw.',
  },
  ranger: {
    cls: 'archer',
    name: 'Ranger',
    icon: 'icon:volley',
    blurb: "The Wardens' scouts: volleys, nimble feet, living off the land, and vanishing.",
  },
};
export const TREE_IDS = Object.keys(TREES) as TreeId[];

/** A class's three trees, in order. */
export function treesOf(cls: ClassId): TreeId[] {
  return TREE_IDS.filter(t => TREES[t].cls === cls);
}

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
  // Marksman
  quickDmg: number; // flat Quick Shot damage
  aimedCombo: number; // added to Aimed Shot's ×1.5 after Quick Shot
  shotRange: number; // px farther for every arrow
  farShot: number; // damage at targets more than 150 px away
  pierceDmg: number;
  pierceCd: number; // seconds sooner
  critSlow: number; // seconds a crit slows the target
  // Hunter
  markDur: number;
  markBonus: number; // added to the Mark's +20%
  concCd: number;
  concSlow: number; // added to Concussive Shot's 50% slow
  trapCd: number;
  trapHold: number; // seconds longer
  markJump: number; // 1: the Mark jumps to the nearest enemy when the prey dies
  // Ranger
  evade: number; // chance to sidestep a blow
  volleyDmg: number;
  volleyReach: number;
  volleyCd: number;
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
  quickDmg: 0,
  aimedCombo: 0,
  shotRange: 0,
  farShot: 0,
  pierceDmg: 0,
  pierceCd: 0,
  critSlow: 0,
  markDur: 0,
  markBonus: 0,
  concCd: 0,
  concSlow: 0,
  trapCd: 0,
  trapHold: 0,
  markJump: 0,
  evade: 0,
  volleyDmg: 0,
  volleyReach: 0,
  volleyCd: 0,
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
  /** The spell this talent improves: no points in it until you know the spell. */
  spell?: SpellKey;
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
    { thrust: 2 },
    { spell: 'thrust' }
  ),
  lingering_rend: T(
    'blade',
    'Lingering Rend',
    'icon:rend',
    0,
    2,
    3,
    r => `Rend's bleed deals ${r} more damage every second.`,
    { rendTick: 1 },
    { spell: 'rend' }
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
    { slashCombo: 0.25 },
    { spell: 'slash' }
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
    { spell: 'rend', requires: 'lingering_rend' }
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
    { mortalDmg: 4, mortalCd: 4 },
    { spell: 'mortal' }
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
    { execThreshold: 0.05, execDmg: 0.1 },
    { spell: 'execute' }
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
    { warcryDur: 5 },
    { spell: 'warcry' }
  ),
  momentum: T(
    'fury',
    'Momentum',
    'icon:charge',
    0,
    2,
    3,
    r => `Charge is ready ${3 * r} s sooner.`,
    { chargeCd: 3 },
    { spell: 'charge' }
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
    { spell: 'warcry', requires: 'booming_voice' }
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
    { spell: 'charge', requires: 'momentum' }
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
    { whirlDmg: 2, whirlReach: 10 },
    { spell: 'whirlwind' }
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
    { rampage: 6 },
    { spell: 'warcry' }
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
    { spell: 'whirlwind', requires: 'improved_whirlwind' }
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
    { intCd: 4, intStun: 0.5 },
    { spell: 'interrupt' }
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

/**
 * The archer's trees mirror the warrior's: the same shape, the same points, and each talent a
 * counterpart of one there (Sharp Arrows ↔ Honed Edge, Rapid Fire ↔ Sunder, Deadeye ↔
 * Deathblow, Bear Trap ↔ Bloodrage, Predator ↔ Berserk, Disengage ↔ Shield Bash, Camouflage ↔
 * Last Stand). See docs/archer.md.
 */
Object.assign(TALENTS, {
  // ------------------------------------------------------------ Marksman: one arrow, one foe
  sharp_arrows: T(
    'marksman',
    'Sharp Arrows',
    'item:leather_quiver',
    0,
    0,
    5,
    r => `All your attacks deal ${(2.5 * r).toFixed(1).replace('.0', '')}% more damage.`,
    { dmg: 0.025 }
  ),
  quick_draw: T(
    'marksman',
    'Quick Draw',
    'icon:quickshot',
    0,
    1,
    3,
    r => `Quick Shot deals ${2 * r} more damage.`,
    { quickDmg: 2 },
    { spell: 'quickshot' }
  ),
  long_shot: T(
    'marksman',
    'Long Shot',
    'item:yew_longbow',
    0,
    2,
    3,
    r => `Your arrows reach ${15 * r} farther.`,
    { shotRange: 15 }
  ),
  eagle_eye: T(
    'marksman',
    'Eagle Eye',
    'icon:eye',
    1,
    0,
    5,
    r => `${pct(0.02 * r)} chance for any attack to be a critical hit (×1.6 damage).`,
    { crit: 0.02 }
  ),
  steady_aim: T(
    'marksman',
    'Steady Aim',
    'icon:aimedshot',
    1,
    1,
    2,
    r =>
      `Aimed Shot right after Quick Shot deals ×${(1.5 + 0.2 * r).toFixed(1)} damage instead of ×1.5.`,
    { aimedCombo: 0.2 },
    { spell: 'aimedshot' }
  ),
  far_sight: T(
    'marksman',
    'Far Sight',
    'item:hunting_bow',
    1,
    2,
    2,
    r => `Arrows at targets more than 150 away deal ${pct(0.05 * r)} more damage.`,
    { farShot: 0.05 },
    { requires: 'long_shot' }
  ),
  lethal_shots: T(
    'marksman',
    'Lethal Shots',
    'icon:flame',
    2,
    0,
    3,
    r => `Critical hits deal ×${(1.6 + 0.15 * r).toFixed(2)} instead of ×1.6.`,
    { critDmg: 0.15 },
    { requires: 'eagle_eye' }
  ),
  rapid_fire: T(
    'marksman',
    'Rapid Fire',
    'icon:rapidfire',
    2,
    1,
    1,
    () =>
      'Teaches Rapid Fire: three arrows in quick succession, 4 damage each. 8 mana, 10 s cooldown.',
    {},
    { grants: 'rapidfire' }
  ),
  ballistics: T(
    'marksman',
    'Ballistics',
    'icon:pierce',
    2,
    2,
    3,
    r => `Piercing Shot deals ${4 * r} more damage and is ready ${4 * r} s sooner.`,
    { pierceDmg: 4, pierceCd: 4 },
    { spell: 'pierce' }
  ),
  pinning_crits: T(
    'marksman',
    'Pinning Shots',
    'icon:concussive',
    3,
    0,
    1,
    () => 'Your critical hits slow the target by half for 4 s.',
    { critSlow: 4 },
    { requires: 'lethal_shots' }
  ),
  coup_de_grace: T(
    'marksman',
    'Coup de Grâce',
    'icon:killshot',
    3,
    1,
    2,
    r => `Kill Shot works below ${25 + 5 * r}% health and hits ${pct(0.1 * r)} harder.`,
    { execThreshold: 0.05, execDmg: 0.1 },
    { spell: 'killshot' }
  ),
  scavenger: T(
    'marksman',
    'Scavenger',
    'icon:talents',
    3,
    2,
    2,
    r => `Every kill gives you ${8 * r} mana.`,
    { killMana: 8 }
  ),
  deadeye: T(
    'marksman',
    'Deadeye',
    'icon:deadeye',
    4,
    1,
    1,
    () =>
      'Teaches Deadeye: one perfect shot for 26 damage; if it kills, it is ready again at once. 25 mana, 20 s cooldown.',
    {},
    { grants: 'deadeye' }
  ),

  // ------------------------------------------------------------ Hunter: prey and the chase
  hunting_arrows: T(
    'hunter',
    'Hunting Arrows',
    'item:worn_shortbow',
    0,
    0,
    5,
    r => `Your auto-shots deal ${r} more damage.`,
    { aaDmg: 1 }
  ),
  tracker: T(
    'hunter',
    'Tracker',
    'icon:mark',
    0,
    1,
    2,
    r => `Hunter's Mark lasts ${5 * r} s longer.`,
    { markDur: 5 },
    { spell: 'mark' }
  ),
  snaring: T(
    'hunter',
    'Snaring',
    'icon:concussive',
    0,
    2,
    3,
    r => `Concussive Shot is ready ${3 * r} s sooner.`,
    { concCd: 3 },
    { spell: 'concussive' }
  ),
  swift_hands: T(
    'hunter',
    'Swift Hands',
    'icon:rapidfire',
    1,
    0,
    3,
    r => `Your auto-shots come ${pct(0.15 * r)} faster.`,
    { aaSpeed: 0.15 },
    { requires: 'hunting_arrows' }
  ),
  hunters_instinct: T(
    'hunter',
    "Hunter's Instinct",
    'icon:mark',
    1,
    1,
    3,
    r => `Your Mark makes your prey take ${pct(0.2 + 0.05 * r)} more damage instead of 20%.`,
    { markBonus: 0.05 },
    { spell: 'mark', requires: 'tracker' }
  ),
  crippling: T(
    'hunter',
    'Crippling Shot',
    'icon:concussive',
    1,
    2,
    2,
    r => `Concussive Shot slows by ${pct(0.5 + 0.15 * r)} instead of half.`,
    { concSlow: 0.15 },
    { spell: 'concussive', requires: 'snaring' }
  ),
  serrated_heads: T(
    'hunter',
    'Serrated Heads',
    'icon:barbed',
    2,
    2,
    3,
    r => `Barbed Arrow's bleed deals ${r} more damage every second.`,
    { rendTick: 1 },
    { spell: 'barbed' }
  ),
  bear_trap: T(
    'hunter',
    'Bear Trap',
    'icon:beartrap',
    2,
    1,
    1,
    () =>
      'Teaches Bear Trap: set a trap at your feet; the first enemy to step on it takes 8 and is held fast for 3 s. 10 mana, 20 s cooldown.',
    {},
    { grants: 'beartrap' }
  ),
  hunters_feast: T(
    'hunter',
    "Hunter's Feast",
    'icon:secondwind',
    2,
    0,
    3,
    r => `Every arrow that hits heals you for ${r} health.`,
    { lifeOnHit: 1 }
  ),
  blood_scent: T(
    'hunter',
    'Blood Scent',
    'icon:flame',
    3,
    2,
    2,
    r => `Barbed Arrow bleeds ${3 * r} s longer.`,
    { rendDur: 3 },
    { spell: 'barbed', requires: 'serrated_heads' }
  ),
  trap_mastery: T(
    'hunter',
    'Trap Mastery',
    'icon:beartrap',
    3,
    1,
    1,
    () => 'Bear Trap is ready 8 s sooner and holds its catch 1 s longer.',
    { trapCd: 8, trapHold: 1 },
    { spell: 'beartrap', requires: 'bear_trap' }
  ),
  pack_hunter: T(
    'hunter',
    'Pack Hunter',
    'icon:mark',
    3,
    0,
    1,
    () =>
      'When your marked prey dies, the Mark jumps to the nearest enemy with the time it had left.',
    { markJump: 1 },
    { spell: 'mark', requires: 'hunters_feast' }
  ),
  predator: T(
    'hunter',
    'Predator',
    'icon:predator',
    4,
    1,
    1,
    () =>
      'Teaches Predator: for 10 s your auto-shots come 50% faster and you deal 20% more damage. 45 s cooldown.',
    {},
    { grants: 'predator' }
  ),

  // ------------------------------------------------------------ Ranger: the Wardens' scouts
  nimble: T(
    'ranger',
    'Nimble',
    'icon:disengage',
    0,
    0,
    5,
    r => `${pct(0.03 * r)} chance to sidestep a blow entirely.`,
    { evade: 0.03 }
  ),
  endurance: T('ranger', 'Endurance', 'icon:heart', 0, 1, 5, r => `${6 * r} more maximum health.`, {
    hp: 6,
  }),
  forager: T(
    'ranger',
    'Forager',
    'item:woodcutter_axe',
    0,
    2,
    3,
    r => `Chop and mine ${15 * r}% faster.`,
    { gather: 0.15 }
  ),
  volley_master: T(
    'ranger',
    'Volley Master',
    'icon:volley',
    1,
    0,
    3,
    r => `Volley deals ${2 * r} more damage and covers ${10 * r} wider.`,
    { volleyDmg: 2, volleyReach: 10 },
    { spell: 'volley' }
  ),
  living_off_the_land: T(
    'ranger',
    'Living off the Land',
    'icon:secondwind',
    1,
    1,
    3,
    r => `Every kill heals you for ${5 * r} health.`,
    { killHeal: 5 }
  ),
  keen_forager: T(
    'ranger',
    'Keen Forager',
    'item:pickaxe',
    1,
    2,
    2,
    r =>
      `${20 * r}% chance of an extra log when a tree falls, and of extra ore when a rock breaks.`,
    { prospect: 0.2 },
    { requires: 'forager' }
  ),
  disengage: T(
    'ranger',
    'Disengage',
    'icon:disengage',
    2,
    0,
    1,
    () =>
      'Teaches Disengage: leap back away from your target, out of its reach. 5 mana, 12 s cooldown.',
    {},
    { grants: 'disengage', requires: 'nimble' }
  ),
  rangers_rest: T(
    'ranger',
    "Ranger's Rest",
    'item:leather_cap',
    2,
    1,
    2,
    r => `Regain ${(0.5 * r).toFixed(1)} health every second.`,
    { regen: 0.5 }
  ),
  trail_rations: T(
    'ranger',
    'Trail Rations',
    'item:cooked_meat',
    2,
    2,
    2,
    r => `Food heals ${25 * r}% more.`,
    { food: 0.25 }
  ),
  storm_of_arrows: T(
    'ranger',
    'Storm of Arrows',
    'icon:volley',
    3,
    0,
    1,
    () => 'Volley is ready 6 s sooner.',
    { volleyCd: 6 },
    { spell: 'volley', requires: 'volley_master' }
  ),
  watchful_eye: T(
    'ranger',
    'Watchful Eye',
    'icon:silence',
    3,
    1,
    2,
    r => `Silencing Shot is ready ${4 * r} s sooner and stuns ${(0.5 * r).toFixed(1)} s longer.`,
    { intCd: 4, intStun: 0.5 },
    { spell: 'silence' }
  ),
  fleet_foot: T(
    'ranger',
    'Fleet Foot',
    'icon:mount',
    3,
    2,
    2,
    r => `Walk and ride ${5 * r}% faster, and mount ${(0.4 * r).toFixed(1)} s sooner.`,
    { moveSpeed: 0.05, mountTime: 0.4 }
  ),
  camouflage: T(
    'ranger',
    'Camouflage',
    'icon:camouflage',
    4,
    1,
    1,
    () =>
      'Teaches Camouflage: for 6 s creatures lose track of you, you heal 20% of your health, and your next shot is a critical hit. 60 s cooldown.',
    {},
    { grants: 'camouflage' }
  ),
} satisfies Record<string, TalentDef>);

/** The talent that teaches an ability, by ability. */
export const TALENT_FOR: Partial<Record<ActionKey, string>> = Object.fromEntries(
  Object.entries(TALENTS)
    .filter(([, t]) => t.grants)
    .map(([id, t]) => [t.grants, id])
);

export const TALENT_IDS = Object.keys(TALENTS);
