/**
 * How hard a campaign is: chosen when it starts (a new single-player character, a room
 * opened online) and kept in its save; Settings › Difficulty changes it. Normal is the game
 * as balanced: the creatures there hit 30% harder and take 15% more killing than their own
 * numbers (data/enemies.ts) say, which playtesting found too easy. The others are mainly
 * about the creatures' blows (everything a creature does
 * to a hero or a companion: hits, bolts, leaps, fireballs, the bell's toll), and they take a
 * little more killing too (cows and deer stay as they are).
 */
export type Difficulty = 'normal' | 'hard' | 'nightmare';

export interface DifficultyDef {
  name: string;
  /** One line for the screens that choose it. */
  blurb: string;
  /** Creatures' damage, times this. */
  dmg: number;
  /** Creatures' health, times this. */
  hp: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  normal: { name: 'Normal', blurb: 'The adventure as it was made.', dmg: 1.3, hp: 1.15 },
  // hard and nightmare stay as much harder than normal as they were
  hard: { name: 'Hard', blurb: 'Creatures hit half again as hard, and take a little more killing.', dmg: 1.95, hp: 1.4 },
  nightmare: { name: 'Nightmare', blurb: 'Creatures hit twice as hard, and take half again as much killing.', dmg: 2.6, hp: 1.75 },
};

export const DIFFICULTY_IDS = Object.keys(DIFFICULTIES) as Difficulty[];

export function isDifficulty(v: unknown): v is Difficulty {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(DIFFICULTIES, v);
}
