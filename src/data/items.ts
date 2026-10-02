/**
 * Items: what can sit in the bag, lie on the ground or be equipped. Food heals when eaten;
 * materials are kept for later (building, fires); gear goes in an equipment slot and adds
 * to the hero's stats.
 */
export type ItemId =
  | 'meat'
  | 'cooked_meat'
  | 'log'
  | 'stone'
  | 'iron_ore'
  | 'gold_nugget'
  | 'iron_bar'
  | 'gold_bar'
  | 'rusty_sword'
  | 'iron_sword'
  | 'woodcutter_axe'
  | 'pickaxe'
  | 'wooden_shield'
  | 'iron_shield'
  | 'leather_cap'
  | 'iron_helm'
  | 'leather_tunic'
  | 'chainmail'
  | 'cloth_trousers'
  | 'leather_trousers'
  | 'iron_greaves'
  | 'leather_boots'
  | 'swift_boots'
  | 'vigour_amulet'
  // Act I
  | 'edric_helm'
  | 'elowen_amulet'
  | 'bone_fang'
  | 'black_thorn'
  | 'bread'
  | 'bandage'
  | 'warm_cloak'
  | 'hound_trousers'
  | 'sexton_lantern';

export type Slot = 'head' | 'body' | 'legs' | 'feet' | 'weapon' | 'offhand' | 'trinket';

export const SLOTS: Slot[] = ['head', 'body', 'legs', 'feet', 'weapon', 'offhand', 'trinket'];

export const SLOT_NAMES: Record<Slot, string> = {
  head: 'Head',
  body: 'Body',
  legs: 'Legs',
  feet: 'Feet',
  weapon: 'Weapon',
  offhand: 'Off-hand',
  trinket: 'Trinket',
};

/** What gear adds. atk: damage per hit; armor: damage taken shrinks; hp: max health; speed, chop and mine: fractions (0.1 = +10%). */
export interface Stats {
  atk: number;
  armor: number;
  hp: number;
  speed: number;
  chop: number;
  mine: number;
  /** A wider pool of light around you at night (px). */
  light: number;
}

export const NO_STATS: Stats = { atk: 0, armor: 0, hp: 0, speed: 0, chop: 0, mine: 0, light: 0 };

export interface ItemDef {
  name: string;
  desc: string;
  /** Most of this item one bag slot holds. */
  stack: number;
  /** Health restored when eaten (food only). */
  heal?: number;
  /** Equipment slot, for gear. */
  slot?: Slot;
  stats?: Partial<Stats>;
  /** Fine gear is rarer and shows its name in colour. */
  fine?: boolean;
  /** Colour of its pickup text. */
  col: string;
  /** What traders charge for it (they pay about a third). Items without a price can't be sold. */
  price?: number;
  /** Drawn like this item (its icon and how it looks worn), for unique versions of common gear. */
  looks?: ItemId;
  /** One of a kind (a quest reward): fine colour, and a line saying so. */
  unique?: boolean;
}

const GEAR_COL = '#e8dcc0';
const FINE_COL = '#7ae0a0';

export const ITEMS: Record<ItemId, ItemDef> = {
  meat: { name: 'Raw meat', desc: 'Fresh from the meadow. Eat for 30 health, or cook it on a campfire.', stack: 20, heal: 30, col: '#f49088', price: 3 },
  cooked_meat: { name: 'Cooked meat', desc: 'Grilled over a campfire, hot and juicy. Restores 80 health.', stack: 20, heal: 80, col: '#e8a060', price: 8 },
  log: {
    name: 'Wood log',
    desc: 'Lumber from a felled tree. Save it for building and fires.',
    stack: 50,
    col: '#d0a868',
    price: 2,
  },
  stone: {
    name: 'Stone',
    desc: 'Rough stone from a mined rock. Save it for building.',
    stack: 50,
    col: '#c8ccd4',
    price: 2,
  },
  iron_ore: {
    name: 'Iron ore',
    desc: 'Rock shot through with rusty veins. A smith could make something of it.',
    stack: 50,
    col: '#f0a070',
    price: 6,
  },
  iron_bar: { name: 'Iron bar', desc: 'Smelted iron, ready for the anvil.', stack: 50, col: '#c8d2e0', price: 15 },
  gold_bar: { name: 'Gold bar', desc: 'A small, heavy bar of gold.', stack: 50, col: '#ffe07a', price: 60 },
  gold_nugget: {
    name: 'Gold nugget',
    desc: 'A rare glint from deep in the rock.',
    stack: 50,
    col: '#ffe07a',
    price: 25,
  },

  rusty_sword: {
    name: 'Rusty sword',
    desc: 'It has seen better days.',
    stack: 1,
    slot: 'weapon',
    stats: { atk: 2 },
    col: GEAR_COL,
    price: 4,
  },
  iron_sword: {
    name: 'Iron sword',
    desc: 'A well-balanced blade.',
    stack: 1,
    slot: 'weapon',
    stats: { atk: 6 },
    fine: true,
    col: FINE_COL,
    price: 60,
  },
  woodcutter_axe: {
    name: "Woodcutter's axe",
    desc: 'Fells trees twice as fast. Bites in a fight too.',
    stack: 1,
    slot: 'weapon',
    stats: { atk: 3, chop: 1 },
    col: GEAR_COL,
    price: 18,
  },
  pickaxe: {
    name: 'Pickaxe',
    desc: 'Mines rocks twice as fast. A crude weapon in a pinch.',
    stack: 1,
    slot: 'weapon',
    stats: { atk: 2, mine: 1 },
    col: GEAR_COL,
    price: 18,
  },
  wooden_shield: {
    name: 'Wooden shield',
    desc: 'Planks and an iron rim.',
    stack: 1,
    slot: 'offhand',
    stats: { armor: 3 },
    col: GEAR_COL,
    price: 14,
  },
  iron_shield: {
    name: 'Iron kite shield',
    desc: 'Heavy, and worth it.',
    stack: 1,
    slot: 'offhand',
    stats: { armor: 7 },
    fine: true,
    col: FINE_COL,
    price: 70,
  },
  leather_cap: {
    name: 'Leather cap',
    desc: 'Keeps the rain off, mostly.',
    stack: 1,
    slot: 'head',
    stats: { armor: 1 },
    col: GEAR_COL,
    price: 8,
  },
  iron_helm: {
    name: 'Iron helm',
    desc: 'A pointed helm with a riveted band and a nasal guard.',
    stack: 1,
    slot: 'head',
    stats: { armor: 4 },
    fine: true,
    col: FINE_COL,
    price: 45,
  },
  leather_tunic: {
    name: 'Leather tunic',
    desc: 'Sturdy hide over a wool shirt.',
    stack: 1,
    slot: 'body',
    stats: { armor: 2, hp: 10 },
    col: GEAR_COL,
    price: 14,
  },
  chainmail: {
    name: 'Chainmail',
    desc: 'Rings of iron, cold and reassuring.',
    stack: 1,
    slot: 'body',
    stats: { armor: 6, hp: 10 },
    fine: true,
    col: FINE_COL,
    price: 80,
  },
  cloth_trousers: {
    name: 'Cloth trousers',
    desc: 'Plain homespun, patched at the knee. Better than nothing.',
    stack: 1,
    slot: 'legs',
    stats: { armor: 1 },
    col: GEAR_COL,
    price: 3,
  },
  leather_trousers: {
    name: 'Leather trousers',
    desc: 'Patched at the knees.',
    stack: 1,
    slot: 'legs',
    stats: { armor: 2 },
    col: GEAR_COL,
    price: 12,
  },
  iron_greaves: {
    name: 'Iron greaves',
    desc: 'Plate for the shins.',
    stack: 1,
    slot: 'legs',
    stats: { armor: 4 },
    fine: true,
    col: FINE_COL,
    price: 50,
  },
  leather_boots: {
    name: 'Leather boots',
    desc: 'Broken in and comfortable.',
    stack: 1,
    slot: 'feet',
    stats: { armor: 1, speed: 0.05 },
    col: GEAR_COL,
    price: 10,
  },
  swift_boots: {
    name: 'Swift boots',
    desc: 'Light as a feather. Run faster.',
    stack: 1,
    slot: 'feet',
    stats: { speed: 0.15 },
    fine: true,
    col: FINE_COL,
    price: 90,
  },
  vigour_amulet: {
    name: 'Amulet of vigour',
    desc: 'A red stone that beats like a heart.',
    stack: 1,
    slot: 'trinket',
    stats: { hp: 25 },
    fine: true,
    col: FINE_COL,
    price: 120,
  },
  // ---- Act I: Millbrook
  edric_helm: {
    name: "Edric's helm",
    desc: "Aldric's brother's helm. The dent over the brow is from the first Hollow Night.",
    stack: 1,
    slot: 'head',
    stats: { armor: 5, hp: 5 },
    looks: 'iron_helm',
    unique: true,
    fine: true,
    col: FINE_COL,
  },
  elowen_amulet: {
    name: "Queen Elowen's amulet",
    desc: 'A red stone that beats like a heart. It was the old queen\'s.',
    stack: 1,
    slot: 'trinket',
    stats: { hp: 30 },
    looks: 'vigour_amulet',
    unique: true,
    fine: true,
    col: FINE_COL,
  },
  bone_fang: {
    name: 'Bone hound fang',
    desc: "A long yellow fang from one of the old King's hunting dogs.",
    stack: 50,
    col: '#e8dcc0',
    price: 4,
  },
  black_thorn: {
    name: 'Black thorn',
    desc: 'A thorn as long as a finger, cold to the touch. Nothing that grows should be this cold.',
    stack: 50,
    col: '#9a8aa8',
    price: 3,
  },
  bread: { name: 'Bread', desc: 'A round loaf from Millbrook. Restores 50 health.', stack: 20, heal: 50, col: '#e8b878', price: 5 },
  bandage: { name: 'Bandage', desc: 'Clean linen and a little salve. Restores 40 health.', stack: 20, heal: 40, col: '#f0ece0', price: 6 },
  warm_cloak: {
    name: 'Warm cloak',
    desc: "Thick grey wool with a hood. Maud's husband wore it to the mill on winter mornings.",
    stack: 1,
    slot: 'body',
    stats: { armor: 4, hp: 15 },
    looks: 'leather_tunic',
    unique: true,
    fine: true,
    col: FINE_COL,
  },
  hound_trousers: {
    name: 'Hound-leather trousers',
    desc: 'Cured from the hides the bone hounds left behind, when they still had hides.',
    stack: 1,
    slot: 'legs',
    stats: { armor: 3, speed: 0.03 },
    looks: 'leather_trousers',
    col: FINE_COL,
    fine: true,
    price: 35,
  },
  sexton_lantern: {
    name: "Sexton's lantern",
    desc: 'The old sexton carried it on his rounds of the churchyard. It still burns.',
    stack: 1,
    slot: 'trinket',
    stats: { armor: 2, light: 70 },
    unique: true,
    fine: true,
    col: FINE_COL,
  },
};

export const BAG_SLOTS = 24;

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];

/** What a creature drops when killed: [item, min, max, chance (default 1)]. */
export type Loot = [ItemId, number, number, number?][];

/**
 * What a new hero has: a rusty sword and cloth trousers, nothing else. Everything better is
 * earned: leather and wood (tier 1) from slimes and goblins, iron (tier 2) from skeletons at
 * night, ogres and shamans. Plate is a future tier.
 */
export const STARTER = {
  worn: { weapon: 'rusty_sword', legs: 'cloth_trousers' } as Partial<Record<Slot, ItemId>>,
  bag: [] as ItemId[],
};

/** Woodcutting: hits to fell a tree, seconds between chops, logs dropped, seconds to regrow. */
export const CHOP = {
  hits: 4,
  /** Without an axe every chop takes this many times longer. */
  noTool: 2,
  period: 0.7,
  logs: [2, 3] as [number, number],
  regrow: 90,
  reach: 30,
};

/** Mining: hits to break a rock, seconds between swings, stone dropped, ore and gold chances, seconds until the rock is back. */
export const MINE = {
  hits: 5,
  /** Without a pickaxe every swing takes this many times longer. */
  noTool: 3,
  period: 0.8,
  stone: [1, 2] as [number, number],
  ore: 0.35,
  gold: 0.05,
  regrow: 120,
  reach: 30,
};

/** One line per stat a piece of gear adds, for tooltips. */
export function statLines(s: Partial<Stats> | undefined): string[] {
  if (!s) return [];
  const out: string[] = [];
  if (s.atk) out.push(`+${s.atk} attack`);
  if (s.armor) out.push(`+${s.armor} armor`);
  if (s.hp) out.push(`+${s.hp} health`);
  if (s.speed) out.push(`+${Math.round(s.speed * 100)}% speed`);
  if (s.chop) out.push(`+${Math.round(s.chop * 100)}% chopping speed`);
  if (s.mine) out.push(`+${Math.round(s.mine * 100)}% mining speed`);
  if (s.light) out.push('Lights the dark around you');
  return out;
}
