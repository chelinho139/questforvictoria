import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/sim/Game';
import type { ClassId } from '../src/data/classes';
import { Session } from '../src/server/Session';
import { SPELLS, SPELL_ORDER } from '../src/data/spells';
import type { SpellKey } from '../src/data/spells';
import type { SoundId } from '../src/sim/types';
import { SOUNDS, renderSound, allTakes } from '../src/phaser/audio/sounds';
import { KINDS } from '../src/data/enemies';
import type { EnemyKind } from '../src/data/enemies';
import { NPCS } from '../src/data/npcs';
import { RATE, loudness, peak } from '../src/phaser/audio/synth';
import { gameWith, skipScenes, run, standBy, make } from './helpers';
import type { Hero } from '../src/sim/Hero';
import { GCD } from '../src/sim/Hero';
import { TALENTS, xpToNext } from '../src/data/talents';

test('every sound renders: its length, its loudness against the others, no clipping, ending in silence', () => {
  // how loud each take came out for the loudness it asked for: about the same for all
  const per = new Map<string, number>();
  for (const [id, take] of allTakes()) {
    const d = renderSound(id, take);
    const name = `${id} (take ${take + 1})`;
    assert.equal(d.length, Math.ceil(SOUNDS[id].len * RATE), name);
    assert.ok(d.every(Number.isFinite), `${name}: no NaN`);
    assert.ok(peak(d) <= 1, `${name}: peaks under full scale`);
    assert.ok(Math.abs(d[d.length - 1]) < 1e-3, `${name}: ends in silence`);
    per.set(name, loudness(d) / SOUNDS[id].loud);
  }
  const mid = [...per.values()].sort((a, b) => a - b)[Math.floor(per.size / 2)];
  for (const [id, v] of per)
    assert.ok(Math.abs(v / mid - 1) < 0.1, `${id} is as loud as it should be`);
  assert.deepEqual(renderSound('warcry'), renderSound('warcry'), 'the same every time');
  assert.notDeepEqual(renderSound('aldricVoice', 0), renderSound('aldricVoice', 1), 'takes differ');
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
  const e = h.region.spawnEnemy('ogre', h.x + (cls === 'warrior' ? 30 : 120), h.y, true);
  h.region.enemies.push(e);
  h.setTarget(e);
  // the spells that need their moment: a wounded target, a spell to cut short
  if (k === 'execute' || k === 'killshot' || k === 'incinerate') e.hp = Math.round(e.hpMax * 0.1);
  if (k === 'interrupt' || k === 'silence' || k === 'counterspell') e.castT = 1;
  // Revive needs a friend lying at your feet
  if (k === 'revive') {
    const f = game.addHero('f', 'Friend');
    Object.assign(f, { x: h.x + 10, y: h.y, dead: 0.05, down: true });
  }
  const heard: SoundId[] = [];
  // the ogre's own cries are another test's business
  h.region.events.on('sound', p => {
    if (!p.id.startsWith('ogre')) heard.push(p.id);
  });
  return { game, h, e, heard };
}

/** The sound of each spell's arrow (or bolt) landing. */
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
  // the sorceress's bolts
  spark: 'hitFire',
  firebolt: 'hitFire',
  ignite: 'hitFire',
  frostbolt: 'hitFrost',
  counterspell: 'hitCounter',
  incinerate: 'hitPyroblast',
  flamestrike: 'hitFlamestrike',
  chainlightning: 'hitLightning',
  scorch: 'hitFire',
  pyroblast: 'hitPyroblast',
};

test('every spell sounds when cast, and its arrows when they land', () => {
  for (const k of SPELL_ORDER) {
    const { game, h, heard } = caster(k);
    assert.ok(h.castKey(k), `${k} casts`);
    assert.deepEqual(heard, [k] as SoundId[], `${k}: its own sound, once`);
    // no auto-attacks from here on (the spell's arrows still fly)
    h.setTarget(null);
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
  m.h.setTarget(null);
  m.h.castKey('mount');
  run(m.game, 1.2);
  m.h.castKey('mount');
  assert.deepEqual(m.heard, ['mount', 'mounted', 'dismount']);

  const t = caster('beartrap');
  t.h.setTarget(null);
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
  // a kill that pays (a slime carries a coin only half the time)
  const e = h.region.spawnEnemy('slime', h.x + 20, h.y, true);
  e.def = { ...e.def, gold: [2, 2] };
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

test('the interface: building, cooking, smelting, smithing, woodwork', () => {
  const { game, heroes } = gameWith('Ana');
  const [h] = heroes;
  h.region.enemies = [];
  const heard = ears(h);
  h.give('log', 20);
  h.give('stone', 8);
  h.give('iron_ore', 2);
  h.give('iron_bar', 3);
  h.give('meat');
  make(game, h, 'campfire');
  make(game, h, 'cooked_meat');
  make(game, h, 'hunting_bow');
  make(game, h, 'forge');
  make(game, h, 'iron_bar');
  make(game, h, 'iron_sword');
  make(game, h, 'iron_bar');
  assert.deepEqual(heard, ['build', 'cook', 'woodwork', 'build', 'smelt', 'smith', 'error']);
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
  // Bo is up, so Ana lies there until he revives her
  b.x = a.x + 10;
  b.y = a.y;
  assert.ok(b.castKey('revive'));
  run(game, 9);
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

/** A warrior alone in the meadow (the creatures cleared away), and everything heard there. */
function meadow(cls: ClassId = 'warrior') {
  const game = new Game();
  const h = game.addHero('h', 'Test');
  h.cls = cls;
  h.resetHero();
  skipScenes(game);
  h.region.enemies = [];
  const heard: SoundId[] = [];
  h.region.events.on('sound', p => heard.push(p.id));
  const spawn = (kind: EnemyKind, dx: number) => {
    const e = h.region.spawnEnemy(kind, h.x + dx, h.y, true);
    h.region.enemies.push(e);
    return e;
  };
  return { game, h, heard, spawn };
}

test('every creature cries out when hit and when it dies, but not at a bleed', () => {
  for (const kind of Object.keys(KINDS) as EnemyKind[]) {
    const { h, heard, spawn } = meadow();
    const e = spawn(kind, 30);
    // an ambusher out of the canopy already (knocked down, it would notice you first)
    e.hid = false;
    h.dmgEnemy(e, 1, 'dot');
    h.dmgEnemy(e, 1, '');
    h.dmgEnemy(e, 99999, '');
    assert.deepEqual(heard, [KINDS[kind].sounds.hurt, KINDS[kind].sounds.die], kind);
  }
});

test('a goblin notices you and attacks; the blow lands on you', () => {
  const { game, h, heard, spawn } = meadow();
  h.cheats.god = false;
  spawn('goblin', 60);
  run(game, 4);
  assert.equal(heard[0], 'goblinNotice');
  assert.ok(heard.includes('goblinAttack'));
  assert.ok(heard.includes('heroHurt'));
});

test("the shaman's fireball: the chant, the fire leaving, the fire landing", () => {
  const { game, h, heard, spawn } = meadow();
  // angry already, and ready to cast from where it stands
  const sh = spawn('shaman', 110);
  Object.assign(sh, { aggro: true, foe: h.id, castCd: 0 });
  run(game, 3);
  const at = (id: SoundId) => heard.indexOf(id);
  assert.ok(at('shamanCast') >= 0 && at('shamanCast') < at('fireball'), 'chant, then fire');
  assert.ok(at('fireball') < at('fireballHit'), 'and it lands');
});

test('the Bell-Ringer tolls, and the dead rise; at dawn they fall apart', () => {
  const { game, h, heard, spawn } = meadow();
  h.cheats.god = true;
  const ringer = spawn('bellringer', 40);
  ringer.phase = 1;
  ringer.aggro = true;
  ringer.foe = h.id;
  run(game, 2);
  assert.ok(heard.includes('bellToll'));
  assert.ok(heard.includes('boneRise'), 'skeletons climb up through the floor');
  const sk = spawn('skeleton', 80);
  h.region.crumble(sk);
  assert.equal(heard.at(-1), 'skeletonDie');
});

test('auto-attacks: a swing; a shot, and the arrow landing; a bolt, and its landing', () => {
  const w = meadow();
  const slime = w.spawn('slime', 20);
  w.h.setTarget(slime);
  run(w.game, 2);
  assert.ok(w.heard.includes('autoSwing'));

  const a = meadow('archer');
  const cow = a.spawn('cow', 150);
  a.game.cheats.freezeEnemies = true;
  a.h.setTarget(cow);
  run(a.game, 3);
  assert.ok(a.heard.includes('autoShot'));
  assert.ok(a.heard.indexOf('autoShot') < a.heard.indexOf('hitArrow'));

  const s = meadow('sorceress');
  const cow2 = s.spawn('cow', 150);
  s.game.cheats.freezeEnemies = true;
  s.h.setTarget(cow2);
  run(s.game, 3);
  assert.ok(s.heard.includes('autoCast'));
  assert.ok(s.heard.indexOf('autoCast') < s.heard.indexOf('hitBolt'));
});

test('felling a tree and breaking a rock', () => {
  const { game, h, heard } = meadow();
  const near = <T extends { x: number; y: number }>(list: T[]) =>
    list.reduce((a, b) =>
      Math.hypot(b.x - h.x, b.y - h.y) < Math.hypot(a.x - h.x, a.y - h.y) ? b : a
    );
  h.startChop(near(h.region.trees.filter(t => t.stumpT === 0)));
  run(game, 15);
  assert.equal(heard.filter(id => id === 'chop').length, 4, 'four chops');
  assert.equal(heard.at(-1), 'treeFall');
  heard.length = 0;
  h.startMine(near(h.region.rocks.filter(r => r.brokenT === 0)));
  run(game, 25);
  assert.equal(heard.filter(id => id === 'mine').length, 5, 'five swings');
  assert.equal(heard.at(-1), 'rockBreak');
});

test('everyone who talks has a voice of their own', () => {
  const voices = [...Object.keys(NPCS), 'bellringer'].map(who => `${who}Voice`);
  for (const v of voices) assert.ok(v in SOUNDS, v);
  assert.equal(new Set(voices.map(v => SOUNDS[v as SoundId].make)).size, voices.length);
});

test('a voice is a word or two, and a scene says aloud only the lines that matter', () => {
  for (const who of [...Object.keys(NPCS), 'bellringer'])
    for (let k = 0; k < (SOUNDS[`${who}Voice` as SoundId].takes ?? 1); k++) {
      const d = renderSound(`${who}Voice` as SoundId, k);
      const top = peak(d);
      let last = 0;
      for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > top * 0.05) last = i;
      // the Bell-Ringer echoes round his belfry
      const most = who === 'bellringer' || who === 'garrick' ? 1.3 : 0.85;
      assert.ok(last / RATE < most, `${who}Voice take ${k}: ${(last / RATE).toFixed(2)}s`);
    }
  // the opening scene: only Aldric's first words are heard
  const game = new Game();
  const h = game.addHero('h0', 'Ann');
  const lines: { text: string; voice?: boolean }[] = [];
  for (let i = 0; i < 400 && h.inScene; i++) {
    const line = h.region.scene?.line;
    if (line) {
      lines.push(line);
      h.region.sceneNext();
    }
    game.tick(0.25);
  }
  assert.ok(lines.length > 2);
  assert.deepEqual(
    lines.filter(l => l.voice).map(l => l.text),
    ['Breathe. Come on. Breathe, blast you.']
  );
});
