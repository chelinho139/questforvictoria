import ES from './es';

/**
 * The game's languages. The game itself (the simulation, the server, the data) speaks
 * English; what reaches the screen goes through `t`, which looks it up in the chosen
 * language's dictionary (src/i18n/<lang>/*.json, keyed by the English text; see
 * src/i18n/README.md). The browser translates on its own: every Phaser text and every
 * text in the page's windows (src/i18n/dom.ts), so text made by the server translates too.
 *
 * A dictionary entry with {0}, {1}… is a template: it matches text built around names and
 * numbers ("{0} defeated." matches "Wolf defeated."), and what fills each hole is translated
 * in turn ("Lobo derrotado."). Anything not in the dictionary shows as it is, in English.
 */
export type Lang = 'en' | 'es';
export const LANGS: readonly Lang[] = ['en', 'es'];
/** Each language in its own words (never translated). */
export const LANG_NAMES: Record<Lang, string> = { en: 'English', es: 'Español' };

const DICTS: Record<Exclude<Lang, 'en'>, Record<string, string>> = { es: ES };

/** Where the player's choice is kept. */
const STORE_KEY = 'qfv-lang';

interface Template {
  re: RegExp;
  out: string;
  /** Spans lines: only these are tried on text in several lines, which otherwise goes line by line. */
  lines: boolean;
  /** How much of it is words, not holes: the more, the more specific (tried first). */
  weight: number;
}

interface Table {
  /** Every entry, templates too, by its trimmed key (for t(template, ...args)). */
  raw: Map<string, string>;
  exact: Map<string, string>;
  /** Lowercased keys, for text shown in capitals or in lower case. */
  lower: Map<string, string>;
  templates: Template[];
}

const tables = new Map<Lang, Table>();
let lang: Lang = 'en';
let table: Table | null = null;
const cache = new Map<string, string>();
const listeners = new Set<(l: Lang) => void>();
/** Text that reached `t` with no translation (for qfvI18n.missing() in the browser). */
const missed = new Set<string>();
/** Names people chose (characters, rooms): never translated, whatever they look like. */
const kept = new Set<string>();

const HOLE = /\{(\d+)\}/g;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function build(dict: Record<string, string>): Table {
  const raw = new Map<string, string>();
  const exact = new Map<string, string>();
  const lower = new Map<string, string>();
  const templates: Template[] = [];
  for (const [k, v] of Object.entries(dict)) {
    if (!v) continue;
    const key = k.trim();
    raw.set(key, v.trim());
    if (/\{\d+\}/.test(key)) {
      const words = key.replace(HOLE, '');
      // a template needs something of its own to be told apart ("{0} {1}" would match anything);
      // one of only signs ("{0}  [{1}]") is tried last, to translate the parts around them
      if (!words.replace(/[\s,]/g, '')) continue;
      const holes: number[] = [];
      const src = key
        .split(HOLE)
        .map((part, i) => (i % 2 ? (holes.push(Number(part)), '(.+?)') : escapeRe(part)))
        .join('');
      const out = v
        .trim()
        .replace(HOLE, (_, n: string) => `\u0000${holes.indexOf(Number(n))}\u0000`);
      templates.push({
        re: new RegExp(`^${src}$`, 's'),
        out,
        lines: key.includes('\n'),
        weight: /[A-Za-z]/.test(words) ? words.length : words.replace(/\s/g, '').length / 100,
      });
    } else {
      exact.set(key, v);
      lower.set(key.toLowerCase(), v);
    }
  }
  templates.sort((a, b) => b.weight - a.weight);
  return { raw, exact, lower, templates };
}

function tableOf(l: Lang): Table | null {
  if (l === 'en') return null;
  let tb = tables.get(l);
  if (!tb) tables.set(l, (tb = build(DICTS[l])));
  return tb;
}

/** Give `to` the case of `from`: all capitals stay capitals, and the first letter keeps its case. */
function caseLike(from: string, to: string): string {
  const letters = from.replace(/[^\p{L}]/gu, '');
  if (letters.length > 1 && letters === letters.toUpperCase()) return to.toUpperCase();
  const f = from.match(/\p{L}/u)?.[0];
  const i = to.search(/\p{L}/u);
  if (!f || i < 0) return to;
  const first = f === f.toUpperCase() ? to[i].toUpperCase() : to[i].toLowerCase();
  return to.slice(0, i) + first + to.slice(i + 1);
}

/** The translation of one trimmed piece of text, or null. */
function lookup(tb: Table, s: string, depth: number): string | null {
  const hit = tb.exact.get(s);
  if (hit !== undefined) return hit;
  const low = tb.lower.get(s.toLowerCase());
  if (low !== undefined) return caseLike(s, low);
  if (depth > 3) return null;
  const lines = s.includes('\n');
  for (const tp of tb.templates) {
    if (lines && !tp.lines) continue;
    const m = tp.re.exec(s);
    if (m)
      return tp.out.replace(/\u0000(\d+)\u0000/g, (_, i: string) =>
        fill(tb, m[Number(i) + 1], depth + 1)
      );
  }
  // text in lines: each on its own
  if (lines) {
    const out = s.split('\n').map(x => tr(tb, x, depth + 1));
    return out.join('\n') === s ? null : out.join('\n');
  }
  return null;
}

/**
 * What fills a template's hole: a name, a number, or a list of them ("+3 attack, +1 armor":
 * each item on its own, before any template could take the whole list for one).
 */
function fill(tb: Table, s: string, depth: number): string {
  if (!s.includes(', ') || kept.has(s.trim())) return tr(tb, s, depth, false);
  const whole = tb.exact.get(s.trim()) ?? tb.lower.get(s.trim().toLowerCase());
  if (whole !== undefined) return tr(tb, s, depth, false);
  const parts = s.split(', ').map(x => tr(tb, x, depth, false));
  return parts.join(', ') !== s ? parts.join(', ') : tr(tb, s, depth, false);
}

function tr(tb: Table, s: string, depth: number, note = true): string {
  if (!/[A-Za-z]/.test(s) || kept.has(s.trim())) return s;
  const lead = s.match(/^\s*/)![0];
  const trail = s.slice(lead.length).match(/\s*$/)![0];
  const core = s.slice(lead.length, s.length - trail.length);
  const out = lookup(tb, core, depth);
  if (out === null) {
    if (note && missed.size < 5000) missed.add(core);
    return s;
  }
  return lead + out + trail;
}

/**
 * The text in the player's language. With `args`, `s` is a template ("{0} defeated.") and
 * they fill its holes (each translated too, if it's text).
 */
export function t(s: string, ...args: (string | number)[]): string {
  if (args.length) {
    const tmpl = table?.raw.get(s.trim()) ?? s;
    return tmpl.replace(HOLE, (m, n: string) => {
      const a = args[Number(n)];
      return a === undefined ? m : typeof a === 'number' ? String(a) : t(a);
    });
  }
  if (!table || !s) return s;
  let out = cache.get(s);
  if (out === undefined) {
    out = tr(table, s, 0);
    if (cache.size > 20000) cache.clear();
    cache.set(s, out);
  }
  return out;
}

/** A translator over a dictionary of its own (for tests and tools). */
export function translator(dict: Record<string, string>): (s: string) => string {
  const tb = build(dict);
  return s => tr(tb, s, 0, false);
}

/** Is there a translation for this text (exactly, in other capitals, or by a template)? */
export function translated(s: string, l: Lang = lang): boolean {
  const tb = tableOf(l);
  return !tb || !/[A-Za-z]/.test(s) || lookup(tb, s.trim(), 0) !== null;
}

/**
 * Leave these as they are in every language, alone or inside other text: names players
 * chose for their characters and rooms (a hero called Wolf is not "Lobo").
 */
export function keepNames(...names: string[]): void {
  let added = false;
  for (const n of names) {
    const k = n.trim();
    if (k && !kept.has(k)) (kept.add(k), (added = true));
  }
  if (added) cache.clear();
}

export function getLang(): Lang {
  return lang;
}

export function isLang(s: unknown): s is Lang {
  return typeof s === 'string' && (LANGS as readonly string[]).includes(s);
}

/** Switch language (and, with `save`, remember the choice in this browser). */
export function setLang(l: Lang, save = true): void {
  if (save) {
    try {
      localStorage.setItem(STORE_KEY, l);
    } catch {
      // private mode: the choice lasts until the page closes
    }
  }
  if (l === lang && (l === 'en' || table)) return;
  lang = l;
  table = tableOf(l);
  cache.clear();
  missed.clear();
  if (typeof document !== 'undefined') document.documentElement.lang = l;
  for (const fn of listeners) fn(l);
}

/** Call `fn` whenever the language changes; returns how to stop. */
export function onLang(fn: (l: Lang) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * The language to start in: the one chosen before in this browser, else the first of the
 * computer's languages the game speaks (Spanish for any es-…), else English.
 */
export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    // no storage: go by the computer's languages
  }
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const prefs = nav ? (nav.languages?.length ? nav.languages : [nav.language]) : [];
  for (const p of prefs) {
    const base = (p ?? '').toLowerCase().split(/[-_]/)[0];
    if (isLang(base)) return base;
  }
  return 'en';
}

/** Text that had no translation since the language was set (most recent last). */
export function missing(): string[] {
  return [...missed];
}
