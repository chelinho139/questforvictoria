/**
 * The PC action bar: twelve slots, each with a fixed key. What sits in each slot is up to
 * you (drag spells there from the spellbook); see Sim.bar and data/spells.ts.
 */
export interface BarKey {
  /** Label shown on the slot. */
  bind: string;
  /** Phaser keyboard event suffix, e.g. 'ONE', 'Q'. */
  code: string;
}

export const BAR_KEYS: BarKey[] = [
  { bind: '1', code: 'ONE' },
  { bind: '2', code: 'TWO' },
  { bind: '3', code: 'THREE' },
  { bind: '4', code: 'FOUR' },
  { bind: '5', code: 'FIVE' },
  { bind: '6', code: 'SIX' },
  { bind: 'Q', code: 'Q' },
  { bind: 'E', code: 'E' },
  { bind: 'R', code: 'R' },
  { bind: 'F', code: 'F' },
  { bind: 'G', code: 'G' },
  { bind: 'M', code: 'M' },
];

/** Keys that aren't bar slots. */
export const PC_KEYS = {
  revStep: { bind: 'C', code: 'C' },
  revToggle: { bind: 'Z', code: 'Z' },
  revAuto: { bind: 'X', code: 'X' },
  target: { bind: 'Tab', code: 'TAB' },
  jump: { bind: 'Space', code: 'SPACE' },
  /** Dev convenience: scrub the clock through dawn / noon / sunset / night. */
  timeCycle: { bind: 'T', code: 'T' },
  /** Dev convenience: toggle the lighting effect. */
  lightToggle: { bind: 'L', code: 'L' },
  /** Art review: cycle the candidate art styles (Shift+Y goes back). */
  artStyle: { bind: 'Y', code: 'Y' },
  /** Art review: cycle the HD heroes (Shift+H goes back); switches to an HD style if needed. */
  hdHero: { bind: 'H', code: 'H' },
  /** Gather: chop the nearest tree or mine the nearest rock in reach (or click one). */
  gather: { bind: 'B', code: 'B' },
  /** Open or close the inventory (gear and bag). */
  inventory: { bind: 'I', code: 'I' },
  /** Open or close the spellbook (drag spells from it to the bar). */
  spellbook: { bind: 'P', code: 'P' },
  /** Open or close crafting (campfire, forge, cooking, smelting, smithing). */
  crafting: { bind: 'K', code: 'K' },
  /** Open or close the quest log. */
  journal: { bind: 'J', code: 'J' },
  /** Open or close the talent trees. */
  talents: { bind: 'N', code: 'N' },
  /** Open or close settings. */
  settings: { bind: 'O', code: 'O' },
  /** Open or close the controls list. */
  controls: { bind: '/', code: 'FORWARD_SLASH' },
  /** The view: isometric, the 3D diorama, or point of view (Shift goes back). */
  view: { bind: 'V', code: 'V' },
  /** Turn a 3D view. */
  turnLeft: { bind: ',', code: 'COMMA' },
  turnRight: { bind: '.', code: 'PERIOD' },
  /**
   * Turn in the point-of-view view (A and D step sideways there). These are bar keys too: in
   * that view they turn instead, and their slots cast with a click.
   */
  povTurnLeft: { bind: 'Q', code: 'Q' },
  povTurnRight: { bind: 'E', code: 'E' },
} as const;
