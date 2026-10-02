import type { SaveData, SaveSummary } from '../sim/save';
import { SAVE_VERSION } from '../sim/save';

/** The one campaign save, in this browser (no server for now). */
const KEY = 'qfv-save';

export function readSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SaveData;
    return d && d.v === SAVE_VERSION ? d : null;
  } catch {
    return null;
  }
}

export function writeSave(d: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* storage full or blocked: keep playing */
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function saveSummary(): SaveSummary | null {
  const d = readSave();
  return d ? { level: d.level, region: d.region, at: d.at } : null;
}
