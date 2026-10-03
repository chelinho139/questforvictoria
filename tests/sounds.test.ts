import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/sim/Game';
import { Session } from '../src/server/Session';
import { SPELLS, SPELL_ORDER } from '../src/data/spells';
import type { SpellKey } from '../src/data/spells';
import type { SoundId } from '../src/sim/types';
import { SOUNDS, renderSound } from '../src/phaser/audio/sounds';
import { RATE, loudness, peak } from '../src/phaser/audio/synth';
import { gameWith, skipScenes, run, standBy, make } from './helpers';
import type { Hero } from '../src/sim/Hero';
import { GCD } from '../src/sim/Hero';
import { TALENTS, xpToNext } from '../src/data/talents';

test('every sound renders: its length, its loudness against the others, no clipping, ending in silence', () => {
  const ids = Object.keys(SOUNDS) as SoundId[];
  // how loud each came out for the loudness it asked for: about the same for all
  const per = new Map<SoundId, number>();
  for (const id of ids) {
    const d = renderSound(id);
    assert.equal(d.length, Math.ceil(SOUNDS[id].len * RATE), id);
    assert.ok(d.every(Number.isFinite), `${id}: no NaN`);
    assert.ok(peak(d) <= 1, `${id}: peaks under full scale`);
    assert.ok(Math.abs(d[d.length - 1]) < 1e-3, `${id}: ends in silence`);
    per.set(id, loudness(d) / SOUNDS[id].loud);
  }
  const mid = [...per.values()].sort((a, b) => a - b)[Math.floor(per.size / 2)];
  for (const [id, v] of per)
    assert.ok(Math.abs(v / mid - 1) < 0.1, `${id} is as loud as it should be`);
  assert.deepEqual(renderSound('warcry'), renderSound('warcry'), 'the same every time');
});

/** A hero who knows spell `k` (level 25, its talent, a shield for Shield Bash), with an ogre to use it on. */
function caster(k: SpellKey) {
  const cls = SPELLS[k].cls ?? 'warrior';
  const game = new Game();
  const h = game.addHero('h', 'Test');
  h.cls = cls;
  h.resetHero();
  skipScenes(game);
  h.region.enemies = [];
  game.cheats.freezeEnemies = true;
  h.level = 25;
  const t = SPELLS[k].talent;
  if (t) h.talents[t] = 1;
  h.applyTalents();
  if (k === 'shieldbash') h.equip.offhand = 'wooden_shield';
  h.applyGear();
  h.hp = h.hpMax;
  h.mp = h.mpMax;
  const e = h.region.spawnEnemy('ogre', h.x + (cls === 'archer' ? 120 : 30), h.y, true);
  h.region.enemies.push(e);
  h.setTarget(e);
  // the spells that need their moment: a wounded target, a spell to cut short
  if (k === 'execute' || k === 'killshot') e.hp = Math.round(e.hpMax * 0.1);
  if (k === 'interrupt' || k === 'silence') e.castT = 1;
  const heard: SoundId[] = [];
  h.region.events.on('sound', p => heard.push(p.id));
  return { game, h, e, heard };
}

/** The sound of each spell's arrow landing. */
const LANDS: Partial<Record<SpellKey, SoundId>> = {
  quickshot: 'hitArrow',
  aimedshot: 'hitAimed',
  barbed: 'hitBarbed',
  concussive: 'hitConcussive',
  silence: 'hitSilence',
  killshot: 'hitKillshot',
  volley: 'hitVolley',
  pierce: 'hitPierce',
  rapidfire: 'hitArrow',
  deadeye: 'hitDeadeye',
};

test('every spell sounds when cast, and its arrows when they land', () => {
  for (const k of SPELL_ORDER) {
    const { game, h, heard } = caster(k);
    assert.ok(h.castKey(k), `${k} casts`);
    assert.deepEqual(heard, [k] as SoundId[], `${k}: its own sound, once`);
    const land = LANDS[k];
    if (land) {
      assert.ok(!heard.includes(land), `${k}: not before the arrow lands`);
      run(game, 1);
      assert.equal(heard.filter(s => s === land).length, k === 'rapidfire' ? 3 : 1, `${k} lands`);
    }
  }
});

test('the horse comes and goes; a bear trap springs', () => {
  const m = caster('mount');
  m.h.castKey('mount');
  run(m.game, 1.2);
  m.h.castKey('mount');
  assert.deepEqual(m.heard, ['mount', 'mounted', 'dismount']);

  const t = caster('beartrap');
  t.h.castKey('beartrap');
  t.e.x = t.h.x + 2;
  run(t.game, 0.2);
  assert.deepEqual(t.heard, ['beartrap', 'trapSnap']);
});

test('online, a sound reaches everyone in the region, from where it was made', () => {
  const { heroes } = gameWith('Ana', 'Bo');
  const [a, b] = heroes;
  const sb = new Session(b);
  sb.build(0.05);
  a.region.sound('slash', 100.4, 200.6);
  const ev = (sb.build(0.05).ev ?? []).find(e => e[1] === 'sound');
  assert.deepEqual(ev, ['r', 'sound', { id: 'slash', x: 100, y: 201 }]);
});

/** What a hero hears for themselves (the interface's sounds). */
function ears(h: Hero): SoundId[] {
  const heard: SoundId[] = [];
  h.events.on('sound', p => heard.push(p.id));
  return heard;
}

test('the interface: a level, a talent, gold, loot, gear, food, a mistake', () => {
  const { game, heroes } = gameWith('Ana');
  const [h] = heroes;
  const heard = ears(h);
  h.gainXp(xpToNext(h.level));
  h.learnTalent(Object.keys(TALENTS).find(t => !h.talentProblem(t))!);
  const e = h.region.spawnEnemy('slime', h.x + 20, h.y, true);
  h.region.enemies.push(e);
  h.dmgEnemy(e, 9999, '');
  h.region.spawnDrop(h.x, h.y, 'log', h.id);
  run(game, 1);
  h.give('wooden_shield');
  h.useSlot(h.bag.findIndex(s => s?.id === 'wooden_shield'));
  h.unequip('offhand');
  h.give('meat');
  h.hp = 10;
  h.useSlot(h.bag.findIndex(s => s?.id === 'meat'));
  h.castKey('quickshot');
  const e2 = h.region.spawnEnemy('slime', h.x + 20, h.y, true);
  h.region.enemies.push(e2);
  h.setTarget(e2);
  // a tap right on the beat of the global cooldown
  h.t = GCD;
  h.castKey('thrust');
  assert.deepEqual(heard, [
    'levelUp',
    'talent',
    'coins',
    'pickup',
    'equip',
    'equip',
    'eat',
    'error',
    'perfect',
  ]);
});

test('the interface: building, cooking, smithing', () => {
  const { game, heroes } = gameWith('Ana');
  const [h] = heroes;
  h.region.enemies = [];
  const heard = ears(h);
  h.give('log', 20);
  h.give('stone', 8);
  h.give('iron_ore', 2);
  h.give('meat');
  make(game, h, 'campfire');
  make(game, h, 'cooked_meat');
  make(game, h, 'forge');
  make(game, h, 'iron_bar');
  make(game, h, 'iron_bar');
  assert.deepEqual(heard, ['build', 'cook', 'build', 'smith', 'error']);
});

test('the interface: a quest taken, done and handed in, and the journal; the party hears its quests', () => {
  const { game, heroes } = gameWith('Ana', 'Bo');
  const [a, b] = heroes;
  const ha = ears(a);
  const hb = ears(b);
  game.acceptQuest('slime_meadow', a);
  for (let i = 0; i < 3; i++) game.questEvent('kill', 'slime');
  standBy(a, 'aldric');
  assert.ok(game.completeQuest('slime_meadow', a));
  game.findDoc('bounty_notice');
  assert.deepEqual(ha.slice(0, 3), ['questAccept', 'questReady', 'questComplete']);
  assert.ok(ha.includes('journal'));
  assert.deepEqual(hb, ['questAccept', 'questReady', 'journal'], 'Bo hands nothing in');
});

test('dying and coming back; only you hear your level; a save loads in silence', () => {
  const { game, heroes } = gameWith('Ana', 'Bo');
  const [a, b] = heroes;
  const ha = ears(a);
  const hb = ears(b);
  a.hurt(9999, 'a test');
  run(game, 3);
  a.gainXp(xpToNext(a.level));
  assert.deepEqual(ha, ['died', 'respawn', 'levelUp']);
  assert.deepEqual(hb, []);

  const save = game.toSave(a);
  const g2 = new Game();
  const h2 = g2.addHero('h', 'Ana');
  const h2heard = ears(h2);
  g2.loadSave(save, h2);
  assert.deepEqual(h2heard, []);
});

test('online, your own sounds reach you and nobody else', () => {
  const { heroes } = gameWith('Ana', 'Bo');
  const [a, b] = heroes;
  const sa = new Session(a);
  const sb = new Session(b);
  sa.build(0.05);
  sb.build(0.05);
  a.hear('levelUp');
  const mine = (sa.build(0.05).ev ?? []).filter(e => e[1] === 'sound');
  assert.deepEqual(mine, [['h', 'sound', { id: 'levelUp' }]]);
  assert.equal((sb.build(0.05).ev ?? []).filter(e => e[1] === 'sound').length, 0);
});
