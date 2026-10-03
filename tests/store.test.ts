import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Store } from '../src/server/Store';
import { CHAR_MAX } from '../src/net/protocol';

let dir = '';
const quiet = () => {
  // the store reports what it loaded; keep the test output clean
  const log = console.log;
  console.log = () => {};
  return () => (console.log = log);
};

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qfv-store-'));
});

afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

function store(): Store {
  const restore = quiet();
  try {
    return new Store(dir);
  } finally {
    restore();
  }
}

test("an account is a browser's key, kept only as a hash", () => {
  const s = store();
  const key = 'ab'.repeat(32);
  const a = s.account(key);
  assert.equal(s.account(key), a, 'the same key opens the same account');
  assert.notEqual(s.account('cd'.repeat(32)).id, a.id);
  const files = fs.readdirSync(path.join(dir, 'accounts'));
  assert.equal(files.length, 2);
  assert.ok(!files.some(f => f.includes(key)), 'the key itself is never on disk');
});

test('characters: made, listed, and found only by their own account', () => {
  const s = store();
  const a = s.account('ab'.repeat(32));
  const b = s.account('cd'.repeat(32));
  const c = s.create(a, '  Ana   Lee ', 'k2');
  assert.ok(typeof c !== 'string');
  assert.equal(c.name, 'Ana Lee', 'spaces tidied');
  assert.deepEqual(
    s.charsOf(a).map(x => x.name),
    ['Ana Lee']
  );
  assert.equal(s.charOf(a, c.id), c);
  assert.equal(s.charOf(b, c.id), undefined);
});

test('names are unique on the server, and must look like names', () => {
  const s = store();
  const a = s.account('ab'.repeat(32));
  const b = s.account('cd'.repeat(32));
  s.create(a, 'Ana', 'k1');
  assert.match(s.create(b, 'ANA', 'k1') as string, /already a Ana/);
  for (const bad of ['', 'A', '<b>hi</b>', ' ', 'x'.repeat(15), '-Ana'])
    assert.equal(typeof s.create(a, bad, 'k1'), 'string', JSON.stringify(bad));
  for (const good of ["O'Hara", 'Zoë', 'Sir Bram-2'])
    assert.equal(typeof s.create(a, good, 'k1'), 'object', good);
});

test(`an account keeps up to ${CHAR_MAX} characters`, () => {
  const s = store();
  const a = s.account('ab'.repeat(32));
  for (let i = 0; i < CHAR_MAX; i++) assert.equal(typeof s.create(a, `Hero ${i}`, 'k1'), 'object');
  assert.match(s.create(a, 'One More', 'k1') as string, /keep 8/);
});

test('deleting moves the character aside (not lost) and frees the name', () => {
  const s = store();
  const a = s.account('ab'.repeat(32));
  const c = s.create(a, 'Ana', 'k1');
  assert.ok(typeof c !== 'string');
  assert.ok(s.remove(a, c.id));
  assert.deepEqual(s.charsOf(a), []);
  assert.equal(fs.readdirSync(path.join(dir, 'characters')).length, 0);
  assert.equal(fs.readdirSync(path.join(dir, 'deleted')).length, 1);
  assert.equal(typeof s.create(a, 'Ana', 'k1'), 'object');
});

test('everything is there again after a restart', () => {
  const s = store();
  const a = s.account('ab'.repeat(32));
  const c = s.create(a, 'Ana', 'k1');
  assert.ok(typeof c !== 'string');
  c.save = { level: 7 } as never;
  s.save(c);
  const again = store();
  const a2 = again.account('ab'.repeat(32));
  assert.deepEqual(
    again.charsOf(a2).map(x => [x.name, (x.save as { level: number }).level]),
    [['Ana', 7]]
  );
  assert.match(again.create(again.account('cd'.repeat(32)), 'ana', 'k1') as string, /already/);
});

test('a broken file is skipped, not fatal', () => {
  const s = store();
  s.create(s.account('ab'.repeat(32)), 'Ana', 'k1');
  fs.writeFileSync(path.join(dir, 'characters', 'broken.json'), '{ not json');
  const warn = console.warn;
  const warned: string[] = [];
  console.warn = (m: string) => void warned.push(m);
  try {
    const again = store();
    assert.equal(again.charsOf(again.account('ab'.repeat(32))).length, 1);
    assert.ok(warned.some(w => w.includes('broken.json')));
  } finally {
    console.warn = warn;
  }
});
