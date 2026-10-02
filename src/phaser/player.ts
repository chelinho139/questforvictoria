/** The player's chosen name, kept across sessions (localStorage `qfv-player-name`). */
const KEY = 'qfv-player-name';
export const DEFAULT_NAME = 'Hero';
export const NAME_MAX = 14;

export function playerName(): string {
  try {
    return (localStorage.getItem(KEY) ?? '').trim().slice(0, NAME_MAX) || DEFAULT_NAME;
  } catch {
    return DEFAULT_NAME;
  }
}

export function setPlayerName(name: string): void {
  try {
    localStorage.setItem(KEY, name.trim().slice(0, NAME_MAX) || DEFAULT_NAME);
  } catch {
    /* ignore */
  }
}
