import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/sim/Game';
import type { Hero } from '../src/sim/Hero';
import { QUESTS } from '../src/data/quests';
import { KINDS } from '../src/data/enemies';
import { T } from '../src/sim/map';
import { run, skipScenes, standBy } from './helpers';

/** A hero in Millbrook by day, with the Prologue (and The Road North) behind them. */
function inMillbrook(): { game: Game; h: Hero } {
  const game = new Game();
  const h = game.addHero('h0', 'Ann');
  skipScenes(game);
  const ids = Object.keys(QUESTS);
  for (const id of ids.slice(0, ids.indexOf('steward_bounty'))) {
    game.quests[id] = { state: 'done', count: QUESTS[id].goals.map(() => 0) };
    h.questLog.set(id, 'done');
  }
  game.day.t = 0.5;
  game.moveHero(h, 'millbrook', 'square');
  run(game, 1);
  skipScenes(game);
  return { game, h };
}

function kill(game: Game, h: Hero, kind: string, n: number): void {
  for (let i = 0; i < n; i++) {
    const e = h.region.spawnEnemy(kind as never, h.x + 40, h.y, true);
    h.region.enemies.push(e);
    e.hid = false;
    h.dmgEnemy(e, 999999, '');
  }
  run(game, 0.5);
  skipScenes(game);
}

test('Old Cobb the hedger stands north of the square, with thornlings in the ash field behind him', () => {
  const { game, h } = inMillbrook();
  assert.ok(h.region.npcs.some(n => n.id === 'cobb'), 'Cobb is there');
  const thorns = h.region.enemies.filter(e => e.kind === 'thornling');
  assert.ok(thorns.length >= 6, 'enough thornlings for his quest');
  // north of the square, by day as by night
  for (const e of thorns) assert.ok(e.y < 13 * T && e.alive, 'in the ash field, up by day');
  assert.ok(!h.region.enemies.some(e => e.kind === 'old_briar'), 'the Old Briar waits until Cobb asks');
  assert.equal(game.questStatus('walking_hedge', h), 'available');
  assert.equal(game.questStatus('root_branch', h), 'locked');
});

test('a thornling roots you where you stand', () => {
  const k = KINDS.thornling;
  assert.ok(k.casts?.some(c => c.what === 'web' && c.by === 'roots'));
  assert.equal(k.behavior, 'hostile');
  assert.ok(!k.nightOnly, 'it walks by day too');
});

test("Cobb's two quests: six thornlings, then five thorns and the Old Briar, who climbs out when asked", () => {
  const { game, h } = inMillbrook();
  game.acceptQuest('walking_hedge', h);
  kill(game, h, 'thornling', 6);
  standBy(h, 'cobb');
  assert.ok(game.completeQuest('walking_hedge', h));
  assert.equal(game.questStatus('root_branch', h), 'available');
  game.acceptQuest('root_branch', h);
  run(game, 1);
  const briar = h.region.enemies.find(e => e.kind === 'old_briar');
  assert.ok(briar && briar.alive, 'the Old Briar is out, without leaving and coming back');
  assert.ok(Math.abs(briar.y - (3 * T + T / 2)) < 2, 'up against the thorn wall');
  h.dmgEnemy(briar, 999999, '');
  run(game, 0.5);
  skipScenes(game);
  assert.ok(game.flags.briar_down, 'it stays dead');
  for (let i = 0; i < 5; i++) h.addItem('black_thorn', 1);
  standBy(h, 'cobb');
  assert.equal(game.questStatus('root_branch', h), 'ready');
  assert.ok(game.completeQuest('root_branch', h));
  assert.ok(h.count('swift_boots') > 0, 'a runner’s boots');
  // and it never comes back
  run(game, 2);
  assert.ok(!h.region.enemies.some(e => e.kind === 'old_briar' && e.alive));
});

test("the King's lead hound howls the pack in, and The King's Hounds wants it too", () => {
  const { game, h } = inMillbrook();
  const goals = QUESTS.kings_hounds.goals;
  assert.ok(goals.some(g => g.kind === 'kill' && g.enemy === 'leadhound'));
  game.day.t = 0.95;
  // out in the south-east field (creatures far from everyone sleep), at a distance
  h.x = 44 * T;
  h.y = 44 * T;
  // the first night's bell rings backwards (a scene) before anything stirs
  run(game, 1);
  skipScenes(game);
  run(game, 6);
  const R = h.region;
  const lead = R.enemies.find(e => e.kind === 'leadhound' && e.alive);
  assert.ok(lead, 'it runs at night');
  const pack = R.enemies.filter(e => e.kind === 'bonehound' && e.alive && Math.hypot(e.x - lead.x, e.y - lead.y) < 260);
  assert.ok(pack.length > 0, 'with its pack near');
  h.x = lead.x - 60;
  h.y = lead.y;
  run(game, 1.5);
  assert.ok(lead.aggro, 'it has seen you');
  assert.ok(pack.every(e => e.aggro), 'and the pack comes running');
});

test('Nan sends you to Old Cobb about the thorns', () => {
  const { game, h } = inMillbrook();
  game.quests.nans_pages = { state: 'done', count: [] };
  h.questLog.set('nans_pages', 'done');
  game.acceptQuest('thorns_fences', h);
  for (let i = 0; i < 6; i++) game.questEvent('interact', 'thorn' + i, 'thorn');
  h.addItem('black_thorn', 1);
  standBy(h, 'nan');
  assert.equal(game.questStatus('thorns_fences', h), 'active', 'not until you have asked Cobb');
  game.questEvent('talk', 'cobb');
  assert.equal(game.questStatus('thorns_fences', h), 'ready');
});

test("the grey postman's tracks run north into the thorns, and only show at night", () => {
  const { game, h } = inMillbrook();
  game.setFlag('scene:bell_backwards');
  game.quests.nans_pages = { state: 'done', count: [] };
  h.questLog.set('nans_pages', 'done');
  game.acceptQuest('letters_door', h);
  run(game, 1);
  const tracks = h.region.objects.find(o => o.id === 'postman_tracks');
  assert.ok(tracks, 'the dust is on the road while the quest is open');
  h.region.use(tracks, h);
  assert.ok(!game.flags.postman_north, 'nothing to read by day');
  game.day.t = 0.95;
  run(game, 1);
  h.region.use(h.region.objects.find(o => o.id === 'postman_tracks')!, h);
  assert.ok(game.flags.postman_north, 'they lead north at night');
});

test("Act I's side quests: Odo's restless dead, Tobin's larder and Bram's gate", () => {
  const { game, h } = inMillbrook();
  assert.equal(game.questStatus('restless_dead', h), 'locked', 'not before the first night');
  game.setFlag('scene:bell_backwards');
  for (const id of ['restless_dead', 'peddlers_larder', 'churchyard_gate']) assert.equal(game.questStatus(id, h), 'available', id);
  game.acceptQuest('restless_dead', h);
  kill(game, h, 'skeleton', 5);
  standBy(h, 'odo');
  assert.ok(game.completeQuest('restless_dead', h));
  game.acceptQuest('peddlers_larder', h);
  for (let i = 0; i < 4; i++) h.addItem('cooked_meat', 1);
  standBy(h, 'tobin');
  assert.ok(game.completeQuest('peddlers_larder', h));
  assert.equal(h.count('cooked_meat'), 0, 'Tobin took the meat');
  game.acceptQuest('churchyard_gate', h);
  for (let i = 0; i < 3; i++) h.addItem('iron_bar', 1);
  standBy(h, 'bram');
  assert.ok(game.completeQuest('churchyard_gate', h));
  assert.ok(h.count('iron_greaves') > 0);
  // with the bell silenced the graves stay shut, so Odo has nothing more to ask
  const later = inMillbrook();
  later.game.setFlag('scene:bell_backwards');
  later.game.setFlag('bellringer_down');
  assert.equal(later.game.questStatus('restless_dead', later.h), 'locked');
});

test('Act I has twice the quests it had before the Bell-Ringer: five new, and three old ones with more to them', () => {
  const ids = Object.keys(QUESTS);
  const act1 = ids.slice(ids.indexOf('steward_bounty'), ids.indexOf('seven_years'));
  assert.equal(act1.length, 12);
  // 460 XP before, across seven quests
  const xp = act1.reduce((a, id) => a + QUESTS[id].reward.xp, 0);
  assert.equal(xp, 935);
});
