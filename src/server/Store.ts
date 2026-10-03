import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { SaveData } from '../sim/save';
import { CHAR_MAX, CHAR_NAME } from '../net/protocol';
import type { ClassId } from '../data/classes';

/** An account: a browser's key opens it (only the key's hash is kept). */
export interface AccountRecord {
  id: string;
  created: number;
  /** Its characters, oldest first. */
  chars: string[];
}

/** A character kept on the server, played in any room. */
export interface CharRecord {
  id: string;
  account: string;
  name: string;
  look: string;
  /** Warrior or archer (characters from before classes: warriors). */
  cls?: ClassId;
  created: number;
  /** The hero and the story they know; null until first played. */
  save: SaveData | null;
}

/**
 * The server's disk: accounts and their characters, one JSON file each under `dir`
 * (accounts/, characters/; a deleted character moves to deleted/, in case). Everything is
 * read at start and kept in memory; each change is written at once, safely (a temporary
 * file renamed over the old one, so a crash never leaves half a file).
 */
export class Store {
  private readonly accounts = new Map<string, AccountRecord>();
  private readonly chars = new Map<string, CharRecord>();
  /** Lower-case name → character id: names are unique on the server. */
  private readonly names = new Map<string, string>();

  constructor(private readonly dir: string) {
    for (const sub of ['accounts', 'characters', 'deleted'])
      fs.mkdirSync(path.join(dir, sub), { recursive: true });
    for (const a of this.readAll<AccountRecord>('accounts')) this.accounts.set(a.id, a);
    for (const c of this.readAll<CharRecord>('characters')) {
      this.chars.set(c.id, c);
      this.names.set(c.name.toLowerCase(), c.id);
    }
    console.log(`[game] ${this.accounts.size} accounts, ${this.chars.size} characters in ${dir}`);
  }

  /** The account a browser's key opens, made on first use. */
  account(key: string): AccountRecord {
    const id = crypto.createHash('sha256').update(key).digest('hex').slice(0, 32);
    let a = this.accounts.get(id);
    if (!a) {
      a = { id, created: Date.now(), chars: [] };
      this.accounts.set(id, a);
      this.write('accounts', id, a);
    }
    return a;
  }

  charsOf(a: AccountRecord): CharRecord[] {
    return a.chars.flatMap(id => this.chars.get(id) ?? []);
  }

  /** One of this account's characters (undefined for anyone else's). */
  charOf(a: AccountRecord, id: string): CharRecord | undefined {
    return a.chars.includes(id) ? this.chars.get(id) : undefined;
  }

  /** Make a character; a message instead if it can't be. */
  create(
    a: AccountRecord,
    rawName: string,
    look: string,
    cls: ClassId = 'warrior'
  ): CharRecord | string {
    const name = rawName.trim().replace(/\s+/g, ' ');
    if (a.chars.length >= CHAR_MAX)
      return `You can keep ${CHAR_MAX} characters. Delete one to make another.`;
    if (!CHAR_NAME.test(name))
      return 'Names are 2 to 14 letters or digits (spaces, apostrophes and hyphens too).';
    const taken = this.chars.get(this.names.get(name.toLowerCase()) ?? '');
    if (taken) return `There is already a ${taken.name} on this server. Try another name.`;
    const c: CharRecord = {
      id: 'c' + crypto.randomBytes(6).toString('hex'),
      account: a.id,
      name,
      look,
      cls,
      created: Date.now(),
      save: null,
    };
    this.chars.set(c.id, c);
    this.names.set(name.toLowerCase(), c.id);
    a.chars.push(c.id);
    this.write('characters', c.id, c);
    this.write('accounts', a.id, a);
    return c;
  }

  /** Delete one of this account's characters (kept in deleted/, not lost). */
  remove(a: AccountRecord, id: string): boolean {
    const c = this.charOf(a, id);
    if (!c) return false;
    a.chars = a.chars.filter(x => x !== id);
    this.chars.delete(id);
    this.names.delete(c.name.toLowerCase());
    this.write('accounts', a.id, a);
    const from = path.join(this.dir, 'characters', id + '.json');
    fs.renameSync(from, path.join(this.dir, 'deleted', `${id}-${Date.now()}.json`));
    return true;
  }

  /** Write a character's latest state. */
  save(c: CharRecord): void {
    this.write('characters', c.id, c);
  }

  private write(kind: string, id: string, data: unknown): void {
    const file = path.join(this.dir, kind, id + '.json');
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, file);
  }

  private readAll<T>(kind: string): T[] {
    const dir = path.join(this.dir, kind);
    return fs
      .readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .flatMap(f => {
        try {
          return [JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as T];
        } catch (err) {
          console.warn(`[game] can't read ${kind}/${f}: ${(err as Error).message}`);
          return [];
        }
      });
  }
}
