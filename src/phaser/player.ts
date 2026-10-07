import { keepNames } from '../i18n';

/** The name on the HUD: the character being played (single player's from before characters: localStorage `qfv-player-name`). */
const KEY = 'qfv-player-name';
export const DEFAULT_NAME = 'Hero';
export const NAME_MAX = 14;

/** The character being played (single player or online), for this visit. */
let playing: string | null = null;

export function playAs(name: string): void {
  playing = name;
  keepNames(name);
}

export function playerName(): string {
  if (playing) return playing;
  try {
    return (localStorage.getItem(KEY) ?? '').trim().slice(0, NAME_MAX) || DEFAULT_NAME;
  } catch {
    return DEFAULT_NAME;
  }
}
