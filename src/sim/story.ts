import type { Cond } from '../data/story';
import type { QuestStatus } from './types';

/** What a condition needs to know about the game (implemented by the Sim). */
export interface StoryState {
  flags: Record<string, number>;
  level: number;
  /** Night (or a region so deep in the Blackthorn that it is always night for the dead). */
  isNight: boolean;
  questStatus(id: string): QuestStatus;
}

/** Whether a story condition holds; no condition always holds. */
export function check(s: StoryState, c?: Cond): boolean {
  if (!c) return true;
  if ('flag' in c) return (s.flags[c.flag] ?? 0) > 0;
  if ('not' in c) return !((s.flags[c.not] ?? 0) > 0);
  if ('quest' in c) {
    const st = s.questStatus(c.quest);
    return Array.isArray(c.is) ? c.is.includes(st) : st === c.is;
  }
  if ('level' in c) return s.level >= c.level;
  if ('night' in c) return s.isNight === c.night;
  if ('all' in c) return c.all.every(x => check(s, x));
  return c.any.some(x => check(s, x));
}
