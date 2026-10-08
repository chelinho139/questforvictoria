import type { Edit } from './types';
import { MIRROR } from './mirror';
import { NIGHT } from './night';
import { BELL } from './bell';
import { NIGHT2 } from './night2';
import { NIGHT3 } from './night3';
import { DEVBLOG } from './devblog';

/** The trailers, by the name edit.ts is given. */
export const EDITS: Record<string, Edit> = { mirror: MIRROR, night: NIGHT, bell: BELL, night2: NIGHT2, night3: NIGHT3, devblog: DEVBLOG };
