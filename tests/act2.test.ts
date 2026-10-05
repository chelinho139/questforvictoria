import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/sim/Game';
import type { Hero } from '../src/sim/Hero';
import { QUESTS, QUEST_IDS } from '../src/data/quests';
import { NPCS, NPC_IDS } from '../src/data/npcs';
import type { NpcId } from '../src/data/npcs';
import { REGIONS } from '../src/data/regions';
import { KINDS } from '../src/data/enemies';
import { SCENES } from '../src/data/scenes';
import { DOCS } from '../src/data/docs';
import { ITEMS } from '../src/data/items';
import { PROPS, propSolidTiles } from '../src/data/props';
import { COMPANIONS } from '../src/data/companions';
import { parseLayout, isSolidTile, T } from '../src/sim/map';
import { skipScenes, run } from './helpers';

/**
 * Act II (docs/act2.md): the data holds together (everyone and everything stands somewhere
 * you can reach, every quest's people and things exist), and the main story can be played
 * from Wren on the mill step to the lamp.
 */

const ACT2_REGIONS = ['weepwood', 'kingschase', 'heronreach', 'heronlodge', 'lislebarrow', 'weepingbridge'];

test('every Act II region is whole: its layout, spots, exits, people and things stand where you can get to them', () => {
  for (const id of ACT2_REGIONS) {
    const r = REGIONS[id];
    assert.ok(r, id);
    const grid = parseLayout(r.layout, id);
    const solid = new Set<string>();
    for (const p of r.props ?? []) {
      assert.ok(PROPS[p.kind], `${id}: prop ${p.kind}`);
      for (const [c, rr] of propSolidTiles(p.kind, p.at[0], p.at[1])) solid.add(`${c},${rr}`);
    }
    const free = ([c, rr]: [number, number], what: string) => {
      const t = grid[rr]?.[c];
      assert.ok(t !== undefined, `${id}: ${what} is on the map`);
      assert.ok(!isSolidTile(t), `${id}: ${what} is not in water or a wall`);
      assert.ok(!solid.has(`${c},${rr}`), `${id}: ${what} is not under a prop`);
    };
    for (const [name, at] of Object.entries(r.spots)) free(at, `spot ${name}`);
    for (const n of r.npcs) {
      assert.ok(NPCS[n.id], `${id}: ${n.id}`);
      free(n.at, `npc ${n.id}`);
    }
    for (const s of r.spawns) {
      assert.ok(KINDS[s.kind], `${id}: ${s.kind}`);
      free(s.at, `${s.kind} at ${s.at}`);
    }
    for (const o of r.objects ?? []) free(o.at, `object ${o.id}`);
    for (const e of r.exits) {
      if (REGIONS[e.to]) assert.ok(REGIONS[e.to].spots[e.at], `${id} → ${e.to}: spot ${e.at}`);
      else assert.ok(e.when && e.locked, `${id} → ${e.to}: a road to a later act stays closed`);
    }
  }
});

test('Act II: every quest has its people, its things and its rewards', () => {
  const placed = new Set<NpcId>();
  for (const r of Object.values(REGIONS)) for (const n of r.npcs) placed.add(n.id);
  for (const c of Object.values(COMPANIONS)) if (c.npc) placed.add(c.npc);
  const objects = new Set<string>();
  const kinds = new Set<string>();
  for (const r of Object.values(REGIONS))
    for (const o of r.objects ?? []) {
      objects.add(o.id);
      kinds.add(o.kind);
    }
  for (const id of QUEST_IDS) {
    const q = QUESTS[id];
    assert.ok(placed.has(q.giver), `${id}: ${q.giver} stands somewhere`);
    assert.ok(placed.has(q.turnIn ?? q.giver), `${id}: hand-in`);
    if (q.requires) assert.ok(QUESTS[q.requires], `${id} requires ${q.requires}`);
    for (const it of q.reward.items) assert.ok(ITEMS[it], `${id}: ${it}`);
    for (const d of q.reward.docs ?? []) assert.ok(DOCS[d], `${id}: ${d}`);
    for (const g of q.goals) {
      if (g.kind === 'interact' && 'object' in g) assert.ok(objects.has(g.object), `${id}: object ${g.object}`);
      if (g.kind === 'interact' && 'objectKind' in g) assert.ok(kinds.has(g.objectKind), `${id}: objects of kind ${g.objectKind}`);
      if (g.kind === 'kill') assert.ok(KINDS[g.enemy], `${id}: ${g.enemy}`);
      if (g.kind === 'talk') assert.ok(placed.has(g.npc), `${id}: ${g.npc}`);
      if (g.kind === 'reach' && g.region) assert.ok(REGIONS[g.region], `${id}: ${g.region}`);
    }
    for (const sc of [q.onAccept?.scene, q.onDone?.scene]) if (sc) assert.ok(SCENES[sc], `${id}: scene ${sc}`);
  }
  // 26 Act II quests: 9 on the main story (720 XP) and 17 on the side (910 XP)
  const act2 = QUEST_IDS.slice(QUEST_IDS.indexOf('seven_years'));
  assert.equal(act2.length, 26);
  const xp = (main: boolean) => act2.filter(id => !!QUESTS[id].main === main).reduce((a, id) => a + QUESTS[id].reward.xp, 0);
  assert.equal(xp(true), 720);
  assert.equal(xp(false), 910);
  for (const id of NPC_IDS) assert.ok(placed.has(id), `${id} stands somewhere`);
});

/** A hero who has played Act I through. */
function afterActOne(): { game: Game; h: Hero } {
  const game = new Game();
  const h = game.addHero('h0', 'Ann');
  skipScenes(game);
  for (const id of QUEST_IDS.slice(0, QUEST_IDS.indexOf('seven_years'))) {
    game.quests[id] = { state: 'done', count: QUESTS[id].goals.map(() => 0) };
    h.questLog.set(id, 'done');
  }
  for (const f of ['act1_done', 'scene:herald', 'scene:bell_backwards', 'bellringer_down', 'scene:lake_wake']) game.setFlag(f);
  game.day.t = 0.5;
  return { game, h };
}

/** Go somewhere and let the story there catch up (scenes clicked through). */
function go(game: Game, h: Hero, region: string, spot: string): void {
  game.moveHero(h, region, spot);
  run(game, 1);
  skipScenes(game);
}

/** Stand by whoever takes this quest in (a person here, or Wren walking with you) and hand it in. */
function handIn(game: Game, h: Hero, id: string): void {
  const who = game.turnInOf(id);
  const p = h.person(who);
  assert.ok(p, `${who} is here to take ${id}`);
  h.x = p.x + 14;
  h.y = p.y + 4;
  assert.equal(game.questStatus(id, h), 'ready', `${id} is ready`);
  assert.ok(game.completeQuest(id, h), `${id} handed in`);
  run(game, 0.5);
  skipScenes(game);
}

function take(game: Game, h: Hero, id: string): void {
  assert.equal(game.questStatus(id, h), 'available', `${id} is offered`);
  game.acceptQuest(id, h);
  run(game, 0.5);
  skipScenes(game);
}

function use(game: Game, h: Hero, id: string): void {
  const o = h.region.objects.find(x => x.id === id);
  assert.ok(o, `${id} is here in ${h.regionId}`);
  h.region.use(o, h);
  run(game, 0.5);
  skipScenes(game);
}

function stand(game: Game, h: Hero, c: number, r: number): void {
  h.x = c * T + T / 2;
  h.y = r * T + T / 2;
  run(game, 1);
  skipScenes(game);
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

test('the Act II story, from Wren on the mill step to the lamp', () => {
  const { game, h } = afterActOne();
  h.cheats.god = true;
  // 1. Wren comes home
  go(game, h, 'millbrook', 'square');
  assert.ok(game.flags['scene:wren_mill'], 'Wren on the mill step');
  assert.ok(h.region.npcs.some(n => n.id === 'wren'));
  take(game, h, 'seven_years');
  // 2. Wren and the Warden
  go(game, h, 'greenmarch', 'north');
  stand(game, h, 34, 37);
  assert.ok(game.flags['scene:wren_aldric']);
  handIn(game, h, 'seven_years');
  assert.equal(h.count('aldric_whistle'), 1, "Aldric's whistle");
  // 3–4. the hollow oak
  take(game, h, 'feathers_oak');
  stand(game, h, 13, 25);
  use(game, h, 'hollow');
  for (const d of ['feather_key', 'v_note_1', 'v_note_2', 'crow_feather']) assert.ok(game.journal.includes(d), d);
  game.readDoc('feather_key');
  run(game, 0.5);
  handIn(game, h, 'feathers_oak');
  assert.ok(game.flags['scene:crow_feather']);
  take(game, h, 'keep_fire');
  // 5. through the thorns
  take(game, h, 'through_thorns');
  go(game, h, 'millbrook', 'square');
  const wren = h.region.npcs.find(n => n.id === 'wren');
  assert.ok(wren && Math.floor(wren.y / T) < 10, 'Wren waits by the river at the thorn wall');
  const lead = NPCS.wren.topics!.findIndex(t => t.ask.startsWith('Lead the way'));
  h.asked('wren', lead);
  assert.ok(game.flags.wren_follows && game.flags.river_path_open);
  go(game, h, 'weepwood', 'river');
  assert.ok(game.flags.weepwood_found);
  assert.ok(game.companionsIn('weepwood').length, 'Wren walks with you');
  h.addItem('log', 6);
  stand(game, h, 21, 52);
  use(game, h, 'wren_firepit');
  handIn(game, h, 'through_thorns');
  // 6–8. Kilnholt and the night of the ring
  stand(game, h, 57, 24);
  assert.ok(game.flags.kilnholt_found);
  take(game, h, 'ring_of_kilns');
  game.day.t = 0.9;
  run(game, 1);
  assert.ok(game.flags['scene:smothering'], 'at dusk they come out of the trees');
  skipScenes(game);
  run(game, 20);
  assert.ok(h.region.enemies.some(e => e.kind === 'smotherer' && e.alive), 'the dead come for the kilns');
  for (const e of h.region.enemies) if (e.alive && e.kind === 'smotherer') h.dmgEnemy(e, 99999, '');
  game.day.t = 0.26;
  run(game, 1);
  skipScenes(game);
  assert.ok(game.flags.kilns_held, 'the ring held');
  handIn(game, h, 'ring_of_kilns');
  take(game, h, 'last_round');
  assert.ok(game.journal.includes('logbook'), "Marcian's logbook");
  game.readDoc('logbook');
  const saw = NPCS.ada.topics!.findIndex(t => t.ask.startsWith('Can you clear'));
  h.asked('ada', saw);
  run(game, 1);
  assert.ok(!h.region.props.some(p => p.kind === 'fallen_willow'), 'the willow is sawn through');
  handIn(game, h, 'last_round');
  // the lantern in the trees, once
  game.day.t = 0.9;
  stand(game, h, 43, 46);
  run(game, 3);
  stand(game, h, 43, 40);
  run(game, 3);
  skipScenes(game);
  assert.ok(game.flags.lantern_out, 'the lantern went out');
  game.day.t = 0.5;
  run(game, 1);
  // 7. the Warden's trail
  take(game, h, 'wardens_trail');
  for (const [id, c, r] of [
    ['mark1', 24, 52],
    ['mark3', 43, 13],
  ] as [string, number, number][]) {
    stand(game, h, c, r);
    use(game, h, id);
  }
  stand(game, h, 18, 39);
  use(game, h, 'mark2');
  go(game, h, 'heronreach', 'south');
  stand(game, h, 25, 31);
  use(game, h, 'mark4');
  handIn(game, h, 'wardens_trail');
  // Keep the Fire: the lodge's hearth and the roll
  go(game, h, 'heronlodge', 'door');
  stand(game, h, 7, 4);
  use(game, h, 'hearth');
  run(game, 1);
  assert.ok(h.region.structures.some(s => s.kind === 'campfire'), 'the hearth burns');
  use(game, h, 'roll');
  assert.ok(game.journal.includes('warden_roll'));
  // 9. the ford
  go(game, h, 'heronreach', 'lodge_door');
  take(game, h, 'the_ford');
  kill(game, h, 'tower_guard', 4);
  stand(game, h, 36, 33);
  use(game, h, 'mark_heron');
  stand(game, h, 41, 8);
  use(game, h, 'mark_last');
  run(game, 1);
  assert.ok(game.flags.mist_open && !h.region.props.some(p => p.kind === 'mist'), 'the mist parts');
  handIn(game, h, 'the_ford');
  // 11–13. the bridge, the knight, the confession
  take(game, h, 'knight_carried');
  go(game, h, 'weepingbridge', 'south');
  assert.ok(h.region.isNight || h.region.def.dusk, 'dusk all day under the mist');
  stand(game, h, 30, 27);
  assert.ok(game.flags['scene:bridge_halt']);
  const knight = h.region.enemies.find(e => e.kind === 'garrick');
  assert.ok(knight, 'Sir Garrick on the bridge');
  h.dmgEnemy(knight, 999999, '');
  run(game, 1);
  skipScenes(game);
  assert.ok(game.flags.garrick_down && game.flags.garrick_confessed, 'he falls, and tells it all');
  assert.ok(game.journal.includes('lace_2'), 'a second scrap of lace');
  handIn(game, h, 'knight_carried');
  assert.equal(h.count('marcian_whistle'), 1);
  assert.ok(h.region.npcs.some(n => n.id === 'garrick'), 'his ghost stays on the bridge');
  // 14. the lamp
  take(game, h, 'lamp_burns');
  run(game, 0.5);
  assert.equal(game.companionsIn('weepingbridge').length, 0, 'Wren goes home');
  go(game, h, 'millbrook', 'square');
  const maud = h.region.npcs.find(n => n.id === 'maud')!;
  h.x = maud.x + 14;
  h.y = maud.y + 4;
  h.talked('maud');
  handIn(game, h, 'lamp_burns');
  assert.ok(game.flags.act2_done, 'ACT II COMPLETE');
  assert.ok(h.region.npcs.some(n => n.id === 'wren'), 'Wren home at the mill');
});

test("Sir Garrick: a step back before the lunge; roots that hold one hero, and he goes for them; the whistle stops him dead and frees them; at the last his shield goes in the river and the guard marches in", () => {
  const { game, h } = afterActOne();
  for (const f of ['scene:bridge_halt', 'scene:into_reach']) game.setFlag(f);
  go(game, h, 'weepingbridge', 'landing');
  h.cheats.god = true;
  const g = h.region.enemies.find(e => e.kind === 'garrick')!;
  assert.ok(g, 'on the bridge');
  h.x = g.x;
  h.y = g.y + 36;
  // the watch: cuts, and every third blow a lunge, given away by a step back
  let tell = false;
  for (let i = 0; i < 300 && !tell; i++) {
    game.tick(0.05);
    if (g.lunge && g.lunge.t < g.lunge.wind) tell = true;
  }
  assert.ok(tell, 'he steps back before he lunges');
  assert.ok(h.logHistory.some(l => l.text.includes('steps back')), 'and you are told');
  // the bridge: black roots hold the hero, and he comes for them
  // (a bleed, so a raised shield doesn't turn it)
  h.region.hurtEnemy(g, Math.ceil(g.hpMax * 0.4), 'dot', h);
  assert.equal(g.phase, 1);
  g.castCd = 0;
  // (no god mode now: it would shrug the roots off; health topped up instead)
  h.cheats.god = false;
  for (let i = 0; i < 300 && !(h.heldT > 0); i++) {
    h.hp = h.hpMax;
    game.tick(0.05);
  }
  assert.equal(h.heldBy, 'roots', 'the roots hold you');
  assert.equal(g.foe, h.id, 'and he comes for you');
  // the whistle: he stops dead, and the roots go slack
  h.addItem('aldric_whistle', 1);
  h.itemCd = {};
  h.useSlot(h.bag.findIndex(s => s?.id === 'aldric_whistle'));
  assert.ok(g.stunT > 3.9, 'stopped dead for four seconds');
  assert.equal(h.heldT, 0, 'free');
  // the key: below a third the shield goes in the river, and the Tower Guard march in
  g.stunT = 0;
  h.cheats.god = true;
  h.region.hurtEnemy(g, g.hp - Math.floor(g.hpMax * 0.3), 'dot', h);
  assert.equal(g.phase, 2);
  run(game, 3);
  assert.ok(g.shieldGone && (g.shieldT ?? 0) === 0, 'the shield is gone');
  const guard = h.region.enemies.filter(e => e.temp && e.alive && (e.kind === 'tower_guard' || e.kind === 'tower_crossbowman'));
  assert.ok(guard.length >= 1, 'the guard comes onto the bridge');
  // the whistle still stops him, for less
  h.itemCd = {};
  g.stunT = 0;
  h.useSlot(h.bag.findIndex(s => s?.id === 'aldric_whistle'));
  assert.ok(g.stunT > 1.9 && g.stunT <= 2, 'two seconds now');
});

test('the Brood Mother drops out of the dark, and hurt below half climbs back up to drop again somewhere else', () => {
  const { game, h } = afterActOne();
  for (const f of ['scene:into_weepwood', 'scene:kiln_ring']) game.setFlag(f);
  go(game, h, 'weepwood', 'river');
  h.cheats.god = true;
  const m = h.region.enemies.find(e => e.kind === 'broodmother')!;
  assert.ok(m.hid, 'up in the dark at the back of the dell');
  h.x = m.x + 100;
  h.y = m.y;
  run(game, 2);
  assert.ok(!m.hid && m.aggro, 'she drops');
  h.region.hurtEnemy(m, Math.ceil(m.hpMax * 0.55), '', h);
  assert.ok(m.hid, 'climbs back up');
  assert.ok(Math.hypot(m.x - h.x, m.y - h.y) > 30, 'somewhere else');
  assert.ok(h.logHistory.some(l => l.text.includes('climbs back up')));
});
