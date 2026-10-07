import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { translator, detectLang, setLang, getLang, t, onLang } from '../src/i18n';
import { memoryStorage } from './helpers';

// how text is looked up: exactly, in other capitals, by templates, line by line
const tr = translator({
  Wolf: 'Lobo',
  'Iron sword': 'Espada de hierro',
  'Cooked meat': 'Carne asada',
  '15 gold': '15 de oro',
  '{0} gold': '{0} de oro',
  '{0} defeated.': '{0} derrotado.',
  'Quest complete: {0}.': 'Misión completada: {0}.',
  'Quest complete: {0}. You receive {1}.': 'Misión completada: {0}. Recibes {1}.',
  'Slime in the Meadow': 'Limos en el prado',
  'You eat the {0}. +{1} health.': 'Comes: {0}. +{1} de salud.',
  '{0} on cooldown ({1} s).': '{0}: en recarga ({1} s).',
  Whirlwind: 'Torbellino',
  'Click to use': 'Haz clic para usar',
  Empty: '',
});

test('exact text, and anything unknown stays as it is', () => {
  assert.equal(tr('Wolf'), 'Lobo');
  assert.equal(tr('A wolf howls'), 'A wolf howls');
  assert.equal(tr('42'), '42');
  assert.equal(tr('Empty'), 'Empty', 'an empty translation counts as none');
});

test('spaces around the text are kept', () => {
  assert.equal(tr('  Wolf '), '  Lobo ');
});

test('capitals: all caps stay all caps, a word in lower case mid-sentence stays lower case', () => {
  assert.equal(tr('WHIRLWIND'), 'TORBELLINO');
  assert.equal(tr('whirlwind'), 'torbellino');
  assert.equal(tr('You eat the cooked meat. +12 health.'), 'Comes: carne asada. +12 de salud.');
});

test('templates fill their holes with translations, and the more specific one wins', () => {
  assert.equal(tr('Wolf defeated.'), 'Lobo derrotado.');
  assert.equal(tr('Quest complete: Slime in the Meadow.'), 'Misión completada: Limos en el prado.');
  assert.equal(
    tr('Quest complete: Slime in the Meadow. You receive 15 gold, Iron sword.'),
    'Misión completada: Limos en el prado. Recibes 15 de oro, Espada de hierro.'
  );
  assert.equal(tr('Whirlwind on cooldown (3 s).'), 'Torbellino: en recarga (3 s).');
  assert.equal(
    tr('Something unknown defeated.'),
    'Something unknown derrotado.',
    'what it cannot translate stays'
  );
});

test('text in several lines goes line by line', () => {
  assert.equal(tr('Iron sword\nClick to use'), 'Espada de hierro\nHaz clic para usar');
  assert.equal(tr('Iron sword\nsomething else'), 'Espada de hierro\nsomething else');
});

// choosing the language
const nav = globalThis as { navigator?: unknown; localStorage?: Storage };
const realNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
function computerSpeaks(...languages: string[]): void {
  Object.defineProperty(globalThis, 'navigator', {
    value: { languages, language: languages[0] },
    configurable: true,
  });
}
beforeEach(() => {
  nav.localStorage = memoryStorage();
});
afterEach(() => {
  if (realNavigator) Object.defineProperty(globalThis, 'navigator', realNavigator);
  setLang('en', false);
});

test('a computer in Spanish starts the game in Spanish; anything else, in English', () => {
  computerSpeaks('es-AR', 'en');
  assert.equal(detectLang(), 'es');
  computerSpeaks('es');
  assert.equal(detectLang(), 'es');
  computerSpeaks('fr-FR', 'es-ES');
  assert.equal(detectLang(), 'es', 'the first language the game speaks');
  computerSpeaks('en-US', 'es');
  assert.equal(detectLang(), 'en');
  computerSpeaks('de-DE');
  assert.equal(detectLang(), 'en');
});

test('the language chosen in settings wins over the computer, next time too', () => {
  computerSpeaks('es-MX');
  setLang('en');
  assert.equal(detectLang(), 'en');
  computerSpeaks('en-GB');
  setLang('es');
  assert.equal(detectLang(), 'es');
});

test('switching language changes t at once and tells whoever listens', () => {
  const heard: string[] = [];
  const off = onLang(l => heard.push(l));
  setLang('es', false);
  assert.equal(getLang(), 'es');
  assert.equal(t('Wolf'), 'Lobo');
  assert.equal(t('{0} gold', 12), '12 de oro', 'a template filled by the code');
  setLang('en', false);
  assert.equal(t('Wolf'), 'Wolf');
  assert.equal(t('{0} gold', 12), '12 gold');
  off();
  assert.deepEqual(heard, ['es', 'en']);
});

// ---------------------------------------------------------------- the dictionaries

import fs from 'node:fs';
import path from 'node:path';
import { translated } from '../src/i18n';
import { NPCS } from '../src/data/npcs';
import { QUESTS } from '../src/data/quests';
import { ITEMS } from '../src/data/items';
import { DOCS, DOC_KINDS } from '../src/data/docs';
import { SCENES } from '../src/data/scenes';
import { KINDS } from '../src/data/enemies';
import { REGIONS } from '../src/data/regions';
import { SPELLS } from '../src/data/spells';
import { SKILLS, ACTIONS } from '../src/data/skills';
import { TALENTS, TREES } from '../src/data/talents';
import { CLASSES } from '../src/data/classes';
import { COMPANIONS } from '../src/data/companions';
import { STRUCTURES } from '../src/data/crafting';

/** Fields that hold names for the code (ids, keys, art), never words for the screen. */
const CODE_FIELDS = new Set([
  'id',
  'kind',
  'tex',
  'icon',
  'col',
  'color',
  'flag',
  'flags',
  'giver',
  'turnIn',
  'requires',
  'enemy',
  'build',
  'recipe',
  'region',
  'npc',
  'item',
  'items',
  'object',
  'objectKind',
  'to',
  'at',
  'spot',
  'scene',
  'sounds',
  'music',
  'when',
  'need',
  'not',
  'quest',
  'is',
  'cls',
  'slot',
  'station',
  'grants',
  'talent',
  'tree',
  'call',
  'free',
  'by',
  'docs',
  'doc',
  'sells',
  'into',
  'rider',
  'fire',
  'art',
  'home',
  'regions',
  'look',
  'fade',
  'mood',
  'ring',
  'tile',
  'behavior',
  'mouth',
  'voice',
  'key',
  'bind',
  'set',
  'take',
  'give',
  'loot',
  'drop',
  'learn',
  'unlock',
  'wake',
]);

/** Every string a player can read in this data (functions of a rank are called for each rank). */
function words(x: unknown, out: Set<string>, field = ''): Set<string> {
  if (typeof x === 'string') {
    if (
      !CODE_FIELDS.has(field) &&
      /[A-Za-z]/.test(x) &&
      (/\s/.test(x) || /^[A-Z]/.test(x)) &&
      !/^[a-z0-9_:.\-]+$/.test(x)
    )
      out.add(x);
  } else if (Array.isArray(x)) for (const v of x) words(v, out, field);
  else if (x && typeof x === 'object')
    for (const [k, v] of Object.entries(x)) if (!CODE_FIELDS.has(k)) words(v, out, k);
  return out;
}

test('every name, line, description and document of the game has its Spanish', () => {
  const all = new Set<string>();
  for (const d of [
    NPCS,
    QUESTS,
    ITEMS,
    DOCS,
    DOC_KINDS,
    SCENES,
    KINDS,
    SPELLS,
    SKILLS,
    ACTIONS,
    TREES,
    CLASSES,
    COMPANIONS,
    STRUCTURES,
  ])
    words(d, all);
  for (const r of Object.values(REGIONS)) {
    const { name, exits, objects, wanderers, hold, wake } = r as unknown as Record<string, unknown>;
    words({ name, exits, objects, wanderers, hold, wake }, all);
  }
  for (const tal of Object.values(TALENTS)) {
    all.add(tal.name);
    for (let r = 1; r <= tal.ranks; r++) all.add(tal.desc(r));
  }
  const missing = [...all].filter(s => !translated(s, 'es'));
  assert.deepEqual(missing.slice(0, 30), [], `${missing.length} strings have no Spanish`);
});

const DIR = path.join(__dirname, '..', 'src', 'i18n', 'es');
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));
const dicts = files.map(
  f =>
    [f, JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) as Record<string, string>] as const
);

test('every entry is translated, with the same holes as its English', () => {
  for (const [f, d] of dicts) {
    for (const [en, es] of Object.entries(d)) {
      assert.ok(es, `${f}: "${en}" has no Spanish`);
      const holes = (s: string) =>
        [...s.matchAll(/\{(\d+)\}/g)]
          .map(m => m[1])
          .sort()
          .join();
      assert.equal(holes(es), holes(en), `${f}: "${en}" → "${es}" has other holes`);
    }
  }
});

test('the dictionaries agree: a text means the same everywhere', () => {
  const seen = new Map<string, [string, string]>();
  const clashes: string[] = [];
  for (const [f, d] of dicts) {
    for (const [en, es] of Object.entries(d)) {
      const was = seen.get(en.trim());
      if (was && was[1] !== es.trim())
        clashes.push(`"${en}": ${was[0]} "${was[1]}" vs ${f} "${es}"`);
      else seen.set(en.trim(), [f, es.trim()]);
    }
  }
  assert.deepEqual(clashes, []);
});
