import type { SaveData } from '../sim/save';
import { SAVE_VERSION } from '../sim/save';
import { CHAR_MAX, CHAR_NAME } from '../net/protocol';
import type { CharInfo } from '../net/protocol';
import { REGIONS } from '../data/regions';
import { STARTER } from '../data/items';

/**
 * Single player's characters, in this browser: the list (localStorage `qfv-chars`) and one
 * campaign save per character (`qfv-save:<id>`). Like the server's characters for online
 * play, so both modes pick and make characters the same way.
 */
const LIST = 'qfv-chars';
const saveKey = (id: string) => `qfv-save:${id}`;
/** The one save from before characters (moved into the first character on first look). */
const OLD_SAVE = 'qfv-save';

export interface LocalChar {
  id: string;
  name: string;
  /** Which hero they look like (an HD hero id). */
  look: string;
  created: number;
}

function load(): LocalChar[] {
  try {
    const raw = localStorage.getItem(LIST);
    if (raw) return JSON.parse(raw) as LocalChar[];
    return migrate();
  } catch {
    return [];
  }
}

function store(list: LocalChar[]): void {
  try {
    localStorage.setItem(LIST, JSON.stringify(list));
  } catch {
    /* storage full or blocked */
  }
}

/** The save from before characters becomes the first character (its name and hero). */
function migrate(): LocalChar[] {
  const list: LocalChar[] = [];
  const old = localStorage.getItem(OLD_SAVE);
  if (old) {
    const c: LocalChar = {
      id: newId(),
      name: (localStorage.getItem('qfv-player-name') ?? '').trim() || 'Hero',
      look: localStorage.getItem('qfv-hd-hero') || 'k1',
      created: Date.now(),
    };
    localStorage.setItem(saveKey(c.id), old);
    // only once the copy is there
    if (localStorage.getItem(saveKey(c.id)) === old) {
      list.push(c);
      localStorage.removeItem(OLD_SAVE);
    }
  }
  store(list);
  return list;
}

function newId(): string {
  return 'l' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

export function localChars(): LocalChar[] {
  return load();
}

/** Make a character; a message instead if it can't be. */
export function createLocalChar(rawName: string, look: string): LocalChar | string {
  const list = load();
  const name = rawName.trim().replace(/\s+/g, ' ');
  if (list.length >= CHAR_MAX)
    return `You can keep ${CHAR_MAX} characters. Delete one to make another.`;
  if (!CHAR_NAME.test(name))
    return 'Names are 2 to 14 letters or digits (spaces, apostrophes and hyphens too).';
  const taken = list.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (taken) return `You already have a ${taken.name}. Try another name.`;
  const c: LocalChar = { id: newId(), name, look, created: Date.now() };
  list.push(c);
  store(list);
  return c;
}

/** Delete a character and their save. */
export function deleteLocalChar(id: string): void {
  store(load().filter(c => c.id !== id));
  try {
    localStorage.removeItem(saveKey(id));
  } catch {
    /* ignore */
  }
}

export function readSave(id: string): SaveData | null {
  try {
    const raw = localStorage.getItem(saveKey(id));
    if (!raw) return null;
    const d = JSON.parse(raw) as SaveData;
    return d && d.v === SAVE_VERSION ? d : null;
  } catch {
    return null;
  }
}

export function writeSave(id: string, d: SaveData): void {
  try {
    localStorage.setItem(saveKey(id), JSON.stringify(d));
  } catch {
    /* storage full or blocked: keep playing */
  }
}

/** The characters as the character screen shows them (like the server's list). */
export function localCharInfos(): CharInfo[] {
  return load().map(c => {
    const s = readSave(c.id);
    return {
      id: c.id,
      name: c.name,
      look: c.look,
      level: s?.level ?? 1,
      equip: s?.equip ?? STARTER.worn,
      place: s ? (REGIONS[s.region]?.name ?? '') : 'The lakeshore',
      at: s?.at ?? 0,
      busy: false,
    };
  });
}

/** The character played last (or made last), for Continue. */
export function lastLocalChar(): CharInfo | null {
  const list = localCharInfos();
  if (!list.length) return null;
  return list.reduce((a, b) => (b.at > a.at || (b.at === a.at && !a.at) ? b : a));
}
