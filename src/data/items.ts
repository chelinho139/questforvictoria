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
  | 'sexton_lantern'
  // Act II
  | 'aldric_whistle'
  | 'marcian_whistle'
  | 'thornback_pelt'
  | 'spider_silk'
  | 'black_willow'
  | 'charcoal'
  | 'steel_bar'
  | 'venison'
  | 'roast_venison'
  | 'smoked_venison'
  | 'dunn_pie'
  | 'flour_sack'
  | 'dispatch_bag'
  | 'warden_cloak'
  | 'warden_hood'
  | 'warden_boots'
  | 'warden_blade'
  | 'warden_longbow'
  | 'steel_sword'
  | 'steel_shield'
  | 'steel_helm'
  | 'silk_recurve'
  | 'thornback_jerkin'
  | 'fang_necklace'
  | 'broodsilk_leggings'
  | 'pell_horn'
  | 'bonespine_mantle'
  | 'thane_torc'
  | 'royal_greaves'
  // the archer's
  | 'worn_shortbow'
  | 'hunting_bow'
  | 'yew_longbow'
  | 'leather_quiver'
  | 'hunters_quiver';

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
  /** Creatures you hit stay angry at you this many seconds longer. */
  anger: number;
}

export const NO_STATS: Stats = { atk: 0, armor: 0, hp: 0, speed: 0, chop: 0, mine: 0, light: 0, anger: 0 };

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
  /** What traders charge for it (they pay a twentieth, SELL_CUT). Items without a price can't be sold. */
  price?: number;
  /** Drawn like this item (its icon and how it looks worn), for unique versions of common gear. */
  looks?: ItemId;
  /** One of a kind (a quest reward): fine colour, and a line saying so. */
  unique?: boolean;
  /** Only this class can wield it (weapons and off-hands; armour is for everyone). */
  cls?: ClassId;
  /**
   * A keepsake you can use from the bag (Aldric's whistle): it makes `sound`, says `say`, and
   * calls `call` (whatever answers to it does; EnemyDef.answers), or says `quiet` when nothing
   * does. Then `cd` seconds before it can be used again.
   */
  use?: { cd: number; call: string; sound: SoundId; say: string; quiet: string };
}

import type { ClassId } from './classes';
import type { SoundId } from '../sim/types';

const GEAR_COL = '#e8dcc0';
const FINE_COL = '#7ae0a0';

export const ITEMS: Record<ItemId, ItemDef> = {
  meat: { name: 'Raw meat', desc: 'Fresh from the meadow. Eat for 30 health, or cook it on a campfire.', stack: 20, heal: 30, col: '#f49088', price: 4 },
  cooked_meat: { name: 'Cooked meat', desc: 'Grilled over a campfire, hot and juicy. Restores 80 health.', stack: 20, heal: 80, col: '#e8a060', price: 12 },
  log: {
    name: 'Wood log',
    desc: 'Lumber from a felled tree. Save it for building and fires.',
    stack: 50,
    col: '#d0a868',
    price: 3,
  },
  stone: {
    name: 'Stone',
    desc: 'Rough stone from a mined rock. Save it for building.',
    stack: 50,
    col: '#c8ccd4',
    price: 3,
  },
  iron_ore: {
    name: 'Iron ore',
    desc: 'Rock shot through with rusty veins. A smith could make something of it.',
    stack: 50,
    col: '#f0a070',
    price: 12,
  },
  iron_bar: { name: 'Iron bar', desc: 'Smelted iron, ready for the anvil.', stack: 50, col: '#c8d2e0', price: 40 },
  gold_bar: { name: 'Gold bar', desc: 'A small, heavy bar of gold.', stack: 50, col: '#ffe07a', price: 150 },
  gold_nugget: {
    name: 'Gold nugget',
    desc: 'A rare glint from deep in the rock.',
    stack: 50,
    col: '#ffe07a',
    price: 60,
  },

  rusty_sword: {
    name: 'Rusty sword',
    desc: 'It has seen better days.',
    stack: 1,
    slot: 'weapon',
    stats: { atk: 2 },
    col: GEAR_COL,
    price: 12,
    cls: 'warrior',
  },
  iron_sword: {
    name: 'Iron sword',
    desc: 'A well-balanced blade.',
    stack: 1,
    slot: 'weapon',
    stats: { atk: 6 },
    fine: true,
    col: FINE_COL,
    price: 190,
    cls: 'warrior',
  },
  woodcutter_axe: {
    name: "Woodcutter's axe",
    desc: 'Fells trees twice as fast. Bites in a fight too.',
    stack: 1,
    slot: 'weapon',
    stats: { atk: 3, chop: 1 },
    col: GEAR_COL,
    price: 55,
  },
  pickaxe: {
    name: 'Pickaxe',
    desc: 'Mines rocks twice as fast. A crude weapon in a pinch.',
    stack: 1,
    slot: 'weapon',
    stats: { atk: 2, mine: 1 },
    col: GEAR_COL,
    price: 55,
  },
  wooden_shield: {
    name: 'Wooden shield',
    desc: 'Planks and an iron rim.',
    stack: 1,
    slot: 'offhand',
    stats: { armor: 3 },
    col: GEAR_COL,
    price: 40,
    cls: 'warrior',
  },
  iron_shield: {
    name: 'Iron kite shield',
    desc: 'Heavy, and worth it.',
    stack: 1,
    slot: 'offhand',
    stats: { armor: 7 },
    fine: true,
    col: FINE_COL,
    price: 210,
    cls: 'warrior',
  },
  worn_shortbow: {
    name: 'Worn shortbow',
    desc: 'Patched with twine. It still shoots straight, mostly.',
    stack: 1,
    slot: 'weapon',
    stats: { atk: 2 },
    col: GEAR_COL,
    price: 12,
    cls: 'archer',
  },
  hunting_bow: {
    name: 'Hunting bow',
    desc: 'Ash, horn and gut: a poacher’s favourite.',
    stack: 1,
    slot: 'weapon',
    stats: { atk: 3 },
    col: GEAR_COL,
    price: 55,
    cls: 'archer',
  },
  yew_longbow: {
    name: 'Yew longbow',
    desc: 'As tall as you are, and it hits like a hammer.',
    stack: 1,
    slot: 'weapon',
    stats: { atk: 6 },
    fine: true,
    col: FINE_COL,
    price: 190,
    cls: 'archer',
  },
  leather_quiver: {
    name: 'Leather quiver',
    desc: 'Arrows at hand: you shoot a little harder.',
    stack: 1,
    slot: 'offhand',
    stats: { atk: 1 },
    col: GEAR_COL,
    price: 40,
    cls: 'archer',
  },
  hunters_quiver: {
    name: "Hunter's quiver",
    desc: 'Iron-banded, with broadheads fletched in grey goose, and a strap of boiled leather across the chest.',
    stack: 1,
    slot: 'offhand',
    stats: { atk: 1, hp: 15 },
    fine: true,
    col: FINE_COL,
    price: 210,
    cls: 'archer',
  },
  leather_cap: {
    name: 'Leather cap',
    desc: 'Keeps the rain off, mostly.',
    stack: 1,
    slot: 'head',
    stats: { armor: 1 },
    col: GEAR_COL,
    price: 25,
  },
  iron_helm: {
    name: 'Iron helm',
    desc: 'A pointed helm with a riveted band and a nasal guard.',
    stack: 1,
    slot: 'head',
    stats: { armor: 4 },
    fine: true,
    col: FINE_COL,
    price: 140,
  },
  leather_tunic: {
    name: 'Leather tunic',
    desc: 'Sturdy hide over a wool shirt.',
    stack: 1,
    slot: 'body',
    stats: { armor: 2, hp: 10 },
    col: GEAR_COL,
    price: 45,
  },
  chainmail: {
    name: 'Chainmail',
    desc: 'Rings of iron, cold and reassuring.',
    stack: 1,
    slot: 'body',
    stats: { armor: 6, hp: 10 },
    fine: true,
    col: FINE_COL,
    price: 250,
  },
  cloth_trousers: {
    name: 'Cloth trousers',
    desc: 'Plain homespun, patched at the knee. Better than nothing.',
    stack: 1,
    slot: 'legs',
    stats: { armor: 1 },
    col: GEAR_COL,
    price: 10,
  },
  leather_trousers: {
    name: 'Leather trousers',
    desc: 'Patched at the knees.',
    stack: 1,
    slot: 'legs',
    stats: { armor: 2 },
    col: GEAR_COL,
    price: 35,
  },
  iron_greaves: {
    name: 'Iron greaves',
    desc: 'Plate for the shins.',
    stack: 1,
    slot: 'legs',
    stats: { armor: 4 },
    fine: true,
    col: FINE_COL,
    price: 150,
  },
  leather_boots: {
    name: 'Leather boots',
    desc: 'Broken in and comfortable.',
    stack: 1,
    slot: 'feet',
    stats: { armor: 1, speed: 0.05 },
    col: GEAR_COL,
    price: 30,
  },
  swift_boots: {
    name: 'Swift boots',
    desc: 'Light as a feather. Run faster.',
    stack: 1,
    slot: 'feet',
    stats: { speed: 0.15 },
    fine: true,
    col: FINE_COL,
    price: 280,
  },
  vigour_amulet: {
    name: 'Amulet of vigour',
    desc: 'A red stone that beats like a heart.',
    stack: 1,
    slot: 'trinket',
    stats: { hp: 25 },
    fine: true,
    col: FINE_COL,
    price: 360,
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
    price: 20,
  },
  black_thorn: {
    name: 'Black thorn',
    desc: 'A thorn as long as a finger, cold to the touch. Nothing that grows should be this cold.',
    stack: 50,
    col: '#9a8aa8',
    price: 5,
  },
  bread: { name: 'Bread', desc: 'A round loaf from Millbrook. Restores 50 health.', stack: 20, heal: 50, col: '#e8b878', price: 8 },
  bandage: { name: 'Bandage', desc: 'Clean linen and a little salve. Restores 40 health.', stack: 20, heal: 40, col: '#f0ece0', price: 10 },
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
    price: 110,
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
  // ---- Act II: the Weepwood
  aldric_whistle: {
    name: "Aldric's bone whistle",
    desc: "Every Warden carries one. Blow it if you're in trouble. Nobody will come. There's nobody left. Blow it anyway.",
    stack: 1,
    unique: true,
    fine: true,
    col: FINE_COL,
    use: {
      cd: 30,
      call: 'warden',
      sound: 'wardenCall',
      say: 'You blow the Warden call. It goes high and thin over the trees.',
      quiet: 'Nobody answers. There is nobody left to.',
    },
  },
  marcian_whistle: {
    name: "Marcian's bone whistle",
    desc: "Small and yellow with age, a nick cut in it by a boy's knife. Wren will want it, one day.",
    stack: 1,
    unique: true,
    fine: true,
    col: FINE_COL,
  },
  thornback_pelt: {
    name: 'Thornback pelt',
    desc: 'Coarse grey fur with a ridge of bone spines down it. Three would make a jerkin.',
    stack: 20,
    col: '#a8a4a0',
    price: 20,
  },
  spider_silk: { name: 'Spider silk', desc: 'A skein of Weepwood silk, strong as wire and cold to the touch.', stack: 50, col: '#e8e8f0', price: 20 },
  black_willow: {
    name: 'Black willow',
    desc: "Wood from the Weepwood's willows gone black: hard as horn and cold to the touch. A bowyer's dream.",
    stack: 50,
    col: '#9aa0b8',
    price: 12,
  },
  charcoal: { name: 'Charcoal', desc: "Kilnholt's charcoal, burned slow in an earth kiln. Steel wants it.", stack: 50, col: '#a0a0a0', price: 10 },
  steel_bar: { name: 'Steel bar', desc: 'Iron forged with charcoal: harder, brighter, lighter.', stack: 50, col: '#dce6f2', price: 120 },
  venison: {
    name: 'Venison',
    desc: "A haunch of the King's deer. Eat it raw for 30 health, or roast it on a campfire.",
    stack: 20,
    heal: 30,
    col: '#e07a6a',
    price: 6,
  },
  roast_venison: { name: 'Roast venison', desc: 'Venison roasted over a fire, dripping. Restores 90 health.', stack: 20, heal: 90, col: '#e8a060', price: 18 },
  smoked_venison: {
    name: 'Smoked venison',
    desc: 'Strips of venison smoked over a slow fire, the way Wren does it. Restores 90 health.',
    stack: 20,
    heal: 90,
    col: '#c8885a',
    price: 22,
  },
  dunn_pie: {
    name: "Mother Dunn's pie",
    desc: 'Venison and onion under a crust as thick as your thumb. Restores 130 health.',
    stack: 20,
    heal: 130,
    col: '#e8b878',
    price: 32,
  },
  flour_sack: { name: 'Sack of flour', desc: "Maud's flour, for Mother Dunn at Kilnholt.", stack: 10, col: '#f0ece0' },
  dispatch_bag: {
    name: 'Dispatch bag',
    desc: "A courier's satchel with the Steward's seal on the flap, still buckled.",
    stack: 1,
    col: '#e8c890',
  },
  warden_cloak: {
    name: "Warden's cloak",
    desc: 'Grey-green wool with the Warden badge at the throat, a feather in a ring. Better than mail, and warmer.',
    stack: 1,
    slot: 'body',
    stats: { armor: 8, hp: 25 },
    unique: true,
    fine: true,
    col: FINE_COL,
  },
  warden_hood: {
    name: "Warden's hood",
    desc: 'Grey-green wool, oiled against the rain. From a Warden cache, under an owl.',
    stack: 1,
    slot: 'head',
    stats: { armor: 4, hp: 15 },
    unique: true,
    fine: true,
    col: FINE_COL,
  },
  warden_boots: {
    name: "Warden's boots",
    desc: 'Soft boots for long rounds through wet woods. You walk a little quicker in them.',
    stack: 1,
    slot: 'feet',
    stats: { armor: 2, speed: 0.1 },
    unique: true,
    fine: true,
    col: FINE_COL,
  },
  warden_blade: {
    name: "Warden's blade",
    desc: "A plain straight sword from the lodge's rack, the grip wrapped in green. Forty Wardens carried its like.",
    stack: 1,
    slot: 'weapon',
    stats: { atk: 10 },
    unique: true,
    fine: true,
    col: FINE_COL,
    cls: 'warrior',
  },
  warden_longbow: {
    name: "Warden's longbow",
    desc: "A long grey-green bow from the lodge's rack. It still pulls true.",
    stack: 1,
    slot: 'weapon',
    stats: { atk: 10 },
    unique: true,
    fine: true,
    col: FINE_COL,
    cls: 'archer',
  },
  steel_sword: {
    name: 'Steel sword',
    desc: 'Bright steel with a gilded guard. It keeps an edge through a night of skeletons.',
    stack: 1,
    slot: 'weapon',
    stats: { atk: 9 },
    fine: true,
    col: FINE_COL,
    price: 420,
    cls: 'warrior',
  },
  steel_shield: {
    name: 'Steel kite shield',
    desc: 'Steel over oak, a dark green field and a silver boss.',
    stack: 1,
    slot: 'offhand',
    stats: { armor: 10 },
    fine: true,
    col: FINE_COL,
    price: 420,
    cls: 'warrior',
  },
  steel_helm: {
    name: 'Steel helm',
    desc: 'A bright steel helm with a nasal guard.',
    stack: 1,
    slot: 'head',
    stats: { armor: 6 },
    fine: true,
    col: FINE_COL,
    price: 300,
  },
  silk_recurve: {
    name: 'Silk-strung recurve',
    desc: 'Black willow limbs and a Weepwood silk string. It throws an arrow like a sling throws a stone.',
    stack: 1,
    slot: 'weapon',
    stats: { atk: 9 },
    fine: true,
    col: FINE_COL,
    price: 420,
    cls: 'archer',
  },
  thornback_jerkin: {
    name: 'Thornback jerkin',
    desc: 'Thornback hide with the spines left on at the shoulders. Lighter than mail, and nothing wants to bite it.',
    stack: 1,
    slot: 'body',
    stats: { armor: 6, hp: 15, speed: 0.05 },
    fine: true,
    col: FINE_COL,
    price: 300,
  },
  fang_necklace: {
    name: 'Fang necklace',
    desc: "Six of the old King's hounds' fangs on a cord, a gold bead between each.",
    stack: 1,
    slot: 'trinket',
    stats: { atk: 2, hp: 15 },
    fine: true,
    col: FINE_COL,
    price: 320,
  },
  broodsilk_leggings: {
    name: 'Broodsilk leggings',
    desc: "Woven at Kilnholt from the Brood Mother's silk. Light as cloth, tough as leather.",
    stack: 1,
    slot: 'legs',
    stats: { armor: 5, speed: 0.05 },
    unique: true,
    fine: true,
    col: FINE_COL,
  },
  pell_horn: {
    name: "Pell's hunting horn",
    desc: "Grandad Pell's old horn. What you strike won't let you go so easily after: it hears the hunt in you, he says.",
    stack: 1,
    slot: 'trinket',
    stats: { hp: 20, anger: 6 },
    unique: true,
    fine: true,
    col: FINE_COL,
  },
  bonespine_mantle: {
    name: 'Bonespine mantle',
    desc: "The old wolf's skull and spined hide, worn over the head. Marcian let him go, once.",
    stack: 1,
    slot: 'head',
    stats: { armor: 6, hp: 20 },
    unique: true,
    fine: true,
    col: FINE_COL,
  },
  thane_torc: {
    name: "The Thane's torc",
    desc: 'Green bronze, twisted like rope. Older than Corvalis.',
    stack: 1,
    slot: 'trinket',
    stats: { hp: 30, armor: 4 },
    unique: true,
    fine: true,
    col: FINE_COL,
  },
  royal_greaves: {
    name: 'Royal guard greaves',
    desc: "Plate from the King's own guard, rusted at every joint. The first plate you have worn.",
    stack: 1,
    slot: 'legs',
    stats: { armor: 8, hp: 10 },
    unique: true,
    fine: true,
    col: FINE_COL,
  },
};

export const BAG_SLOTS = 24;

/** Traders pay a twentieth of an item's price (a 190-gold sword fetches 9). */
export const SELL_CUT = 20;

/** What a trader pays for one (0: not worth a coin to them, or not for sale at all). */
export function sellValue(id: ItemId): number {
  return Math.floor((ITEMS[id].price ?? 0) / SELL_CUT);
}

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];

/** What a creature drops when killed: [item, min, max, chance (default 1)]. */
export type Loot = [ItemId, number, number, number?][];

/**
 * What a new hero has: a rusty sword and cloth trousers, nothing else. Everything better is
 * earned: leather and wood (tier 1) from slimes and goblins, iron (tier 2) from skeletons at
 * night, ogres and shamans. Plate is a future tier.
 */
/**
 * The same piece of loot for the other class: a sword drops as a bow for an archer, a shield
 * as a quiver (and back), so personal loot is always something you can use.
 */
export const CLASS_TWIN: Partial<Record<ItemId, ItemId>> = {
  rusty_sword: 'worn_shortbow',
  worn_shortbow: 'rusty_sword',
  iron_sword: 'yew_longbow',
  yew_longbow: 'iron_sword',
  wooden_shield: 'leather_quiver',
  leather_quiver: 'wooden_shield',
  iron_shield: 'hunters_quiver',
  hunters_quiver: 'iron_shield',
  // the hunting bow's warrior counterpart is the axe (which stays an axe: it's a tool for anyone)
  hunting_bow: 'woodcutter_axe',
  warden_blade: 'warden_longbow',
  warden_longbow: 'warden_blade',
  steel_sword: 'silk_recurve',
  silk_recurve: 'steel_sword',
  // there is no steel quiver: an archer finds the hunter's quiver instead
  steel_shield: 'hunters_quiver',
};

/** Loot as a hero of this class finds it. */
export function lootFor(id: ItemId, cls: ClassId): ItemId {
  const d = ITEMS[id];
  return d.cls && d.cls !== cls ? (CLASS_TWIN[id] ?? id) : id;
}

/** Whether a hero of this class can wear or wield it. */
export function canWield(id: ItemId, cls: ClassId): boolean {
  const d = ITEMS[id];
  return !d.cls || d.cls === cls;
}

/** The warrior's starting kit (each class's is in data/classes.ts). */
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
  regrow: 40,
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
  regrow: 75,
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
  if (s.anger) out.push('What you strike stays angry at you longer');
  return out;
}
