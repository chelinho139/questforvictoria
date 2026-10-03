import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  localChars,
  localCharInfos,
  createLocalChar,
  deleteLocalChar,
  readSave,
  writeSave,
  lastLocalChar,
} from '../src/phaser/saveStore';
import { gameWith, memoryStorage } from './helpers';

// single player's characters live in the browser's localStorage
beforeEach(() => {
  (globalThis as { localStorage?: Storage }).localStorage = memoryStorage();
});

function aSave(level = 3) {
  const { game, heroes } = gameWith('x');
  heroes[0].gainXp(level > 1 ? 400 : 0);
  return game.toSave(heroes[0]);
}

test('the save from before characters becomes the first character', () => {
  const old = aSave();
  localStorage.setItem('qfv-save', JSON.stringify(old));
  localStorage.setItem('qfv-player-name', 'sandro');
  localStorage.setItem('qfv-hd-hero', 'k3');
  const [c] = localChars();
  assert.equal(c.name, 'sandro');
  assert.equal(c.look, 'k3');
  assert.deepEqual(readSave(c.id), old);
  assert.equal(localStorage.getItem('qfv-save'), null, 'moved, not copied');
  assert.equal(localChars().length, 1, 'only once');
});

test('no old save: no characters to start with', () => {
  assert.deepEqual(localChars(), []);
  assert.equal(lastLocalChar(), null);
});

test('characters: made, each with their own save, deleted with it', () => {
  const a = createLocalChar('Wren', 'k2');
  const b = createLocalChar('Ash', 'hood');
  assert.ok(typeof a !== 'string' && typeof b !== 'string');
  writeSave(a.id, aSave());
  assert.equal(readSave(b.id), null, "Ash hasn't played");
  const infos = localCharInfos();
  assert.deepEqual(
    infos.map(i => [i.name, i.place]),
    [
      ['Wren', 'The Greenmarch'],
      ['Ash', 'The lakeshore'],
    ]
  );
  deleteLocalChar(a.id);
  assert.deepEqual(
    localChars().map(c => c.name),
    ['Ash']
  );
  assert.equal(localStorage.getItem(`qfv-save:${a.id}`), null);
});

test('names: unique in this browser, and must look like names', () => {
  createLocalChar('Wren', 'k2');
  assert.match(createLocalChar('wren', 'k1') as string, /already have a Wren/);
  assert.equal(typeof createLocalChar('<x>', 'k1'), 'string');
});

test('Continue picks the character played last', () => {
  const a = createLocalChar('Wren', 'k2');
  const b = createLocalChar('Ash', 'hood');
  assert.ok(typeof a !== 'string' && typeof b !== 'string');
  assert.equal(lastLocalChar()?.name, 'Ash', 'nobody played yet: the newest');
  writeSave(a.id, { ...aSave(), at: 2000 });
  writeSave(b.id, { ...aSave(), at: 1000 });
  assert.equal(lastLocalChar()?.name, 'Wren');
});
