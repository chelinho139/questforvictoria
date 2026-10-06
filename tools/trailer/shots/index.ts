import type { Shot } from './types';
import { SCOUT } from './scout';
import { STORY } from './story';
import { GAMEPLAY } from './gameplay';
import { MYSTERY } from './mystery';
import { ACT2 } from './act2';
import { DEVLOG } from './devlog';

/** Every shot, by name (film.ts films them; the edit lists pick them). */
export const SHOTS: Record<string, Shot> = { ...SCOUT, ...STORY, ...GAMEPLAY, ...MYSTERY, ...ACT2, ...DEVLOG };
