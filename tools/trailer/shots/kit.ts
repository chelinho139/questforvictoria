import type { Director } from './types';
import type { Hero } from '../../../src/sim/Hero';
import type { HeroSetup } from '../../../src/phaser/dev/Director';
import type { SpellKey } from '../../../src/data/spells';

/** The party the trailers follow, dressed for the road (iron for the knights, leather for the bows). */
export const KNIGHT: HeroSetup = {
  cls: 'warrior',
  look: 'k3',
  name: 'Edric',
  level: 14,
  equip: { weapon: 'iron_sword', offhand: 'iron_shield', head: 'iron_helm', body: 'chainmail', legs: 'iron_greaves', feet: 'leather_boots', trinket: 'elowen_amulet' },
  talents: { sunder: 1, deathblow: 1, bloodrage: 1, berserk: 1, shield_bash: 1, last_stand: 1 },
};
export const RANGER: HeroSetup = {
  cls: 'archer',
  look: 'hood',
  name: 'Wil',
  level: 14,
  equip: { weapon: 'yew_longbow', offhand: 'hunters_quiver', head: 'leather_cap', body: 'leather_tunic', legs: 'leather_trousers', feet: 'swift_boots' },
  talents: { rapid_fire: 1, deadeye: 1, bear_trap: 1, predator: 1, disengage: 1, camouflage: 1 },
};
export const SQUIRE: HeroSetup = {
  cls: 'warrior',
  look: 'k2',
  name: 'Bryn',
  level: 12,
  equip: { weapon: 'iron_sword', offhand: 'wooden_shield', head: 'leather_cap', body: 'leather_tunic', legs: 'leather_trousers', feet: 'leather_boots' },
  talents: { berserk: 1, sunder: 1 },
};
export const WANDERER: HeroSetup = {
  cls: 'archer',
  look: 'traveller',
  name: 'Ash',
  level: 12,
  equip: { weapon: 'hunting_bow', offhand: 'leather_quiver', body: 'leather_tunic', legs: 'hound_trousers', feet: 'leather_boots' },
  talents: { bear_trap: 1, rapid_fire: 1 },
};

/** What each class casts in a fight shot, the showiest first (the brain casts the first one ready). */
export const WARRIOR_FIGHT: SpellKey[] = ['charge', 'whirlwind', 'mortal', 'execute', 'deathblow', 'thrust', 'slash', 'rend'];
export const ARCHER_FIGHT: SpellKey[] = ['volley', 'pierce', 'killshot', 'aimedshot', 'barbed', 'quickshot'];

/** The four of them on the road, the knight being the camera's hero. Returns [knight, ranger, squire, wanderer]. */
export function party(d: Director, at: [number, number], o: { only?: number } = {}): Hero[] {
  const [c, r] = at;
  const out: Hero[] = [d.dress(d.hero, { ...KNIGHT, at: [c, r] })];
  const rest = [
    { ...RANGER, at: [c + 1, r] as [number, number] },
    { ...SQUIRE, at: [c, r + 1] as [number, number] },
    { ...WANDERER, at: [c + 1, r + 1] as [number, number] },
  ];
  for (const s of rest.slice(0, (o.only ?? 4) - 1)) out.push(d.addHero(s));
  return out;
}

/** Everyone in the list fights on their own. */
export function brawl(d: Director, heroes: Hero[]): void {
  for (const h of heroes) d.brain(h, { spells: h.cls === 'archer' ? ARCHER_FIGHT : WARRIOR_FIGHT });
}

/** Walk a group along together, each keeping their place beside the first. */
export function march(d: Director, heroes: Hero[], to: [number, number]): void {
  const offs: [number, number][] = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ];
  heroes.forEach((h, i) => d.walk(h, [to[0] + offs[i][0], to[1] + offs[i][1]]));
}

/** The same four in Act II: steel and the Wardens' gear, a few levels on. */
export const KNIGHT2: HeroSetup = {
  ...KNIGHT,
  level: 20,
  equip: { weapon: 'steel_sword', offhand: 'steel_shield', head: 'steel_helm', body: 'chainmail', legs: 'royal_greaves', feet: 'warden_boots', trinket: 'thane_torc' },
};
export const RANGER2: HeroSetup = {
  ...RANGER,
  level: 20,
  equip: { weapon: 'warden_longbow', offhand: 'hunters_quiver', head: 'warden_hood', body: 'thornback_jerkin', legs: 'broodsilk_leggings', feet: 'warden_boots', trinket: 'fang_necklace' },
};
export const SQUIRE2: HeroSetup = {
  ...SQUIRE,
  level: 18,
  equip: { weapon: 'warden_blade', offhand: 'steel_shield', head: 'bonespine_mantle', body: 'thornback_jerkin', legs: 'iron_greaves', feet: 'leather_boots' },
};
export const WANDERER2: HeroSetup = {
  ...WANDERER,
  level: 18,
  equip: { weapon: 'silk_recurve', offhand: 'leather_quiver', body: 'warden_cloak', legs: 'hound_trousers', feet: 'swift_boots' },
};

/** The four in Act II's gear. Returns [knight, ranger, squire, wanderer]. */
export function party2(d: Director, at: [number, number], o: { only?: number } = {}): Hero[] {
  const [c, r] = at;
  const out: Hero[] = [d.dress(d.hero, { ...KNIGHT2, at: [c, r] })];
  const rest = [
    { ...RANGER2, at: [c + 1, r] as [number, number] },
    { ...SQUIRE2, at: [c, r + 1] as [number, number] },
    { ...WANDERER2, at: [c + 1, r + 1] as [number, number] },
  ];
  for (const s of rest.slice(0, (o.only ?? 4) - 1)) out.push(d.addHero(s));
  return out;
}
