import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/sim/Game';
import type { Hero } from '../src/sim/Hero';
import { CLASSES, CLASS_IDS } from '../src/data/classes';
import type { ClassId } from '../src/data/classes';
import { TALENTS, TREES, treesOf, TIERS, COLS, MAX_LEVEL, xpToNext } from '../src/data/talents';
import { SPELLS, SPELL_ORDER, HOME_SLOT } from '../src/data/spells';
import { ITEMS, lootFor, canWield } from '../src/data/items';
import type { SpellKey } from '../src/data/spells';
import { SKILLS, ACTIONS, isSkill } from '../src/data/skills';
import type { EnemyKind } from '../src/data/enemies';
import type { Enemy } from '../src/sim/types';
import { skipScenes, run, make } from './helpers';

/** A hero of a class, alone in a quiet meadow (the region's creatures cleared away). */
function hero(cls: ClassId, level = 1): { game: Game; h: Hero } {
  const game = new Game();
  const h = game.addHero('h', 'Test');
  h.cls = cls;
  h.resetHero();
  skipScenes(game);
  h.region.enemies = [];
  h.level = level;
  h.applyGear();
  h.hp = h.hpMax;
  h.mp = h.mpMax;
  return { game, h };
}

/** A creature `dx` px east of the hero, standing still (frozen) unless told otherwise. */
function foe(h: Hero, kind: EnemyKind, dx: number): Enemy {
  const e = h.region.spawnEnemy(kind, h.x + dx, h.y, true);
  h.region.enemies.push(e);
  return e;
}

test('each class has three trees of the same shape as the warrior’s', () => {
  for (const cls of CLASS_IDS) {
    const trees = treesOf(cls);
    assert.equal(trees.length, 3, cls);
    for (const t of trees) {
      const ts = Object.entries(TALENTS).filter(([, d]) => d.tree === t);
      assert.equal(ts.length, 13, `${t} has 13 talents`);
      const slots = new Set(ts.map(([, d]) => `${d.tier},${d.col}`));
      assert.equal(slots.size, 13, `${t}: no two talents share a slot`);
      for (const [id, d] of ts) {
        assert.ok(d.tier < TIERS && d.col < COLS, id);
        if (d.requires) {
          const r = TALENTS[d.requires];
          assert.equal(r.tree, t, `${id} requires a talent in its own tree`);
          assert.equal(r.col, d.col, `${id}: the arrow goes straight down`);
          assert.ok(r.tier < d.tier, `${id}: requires one above`);
        }
      }
      const grants = ts.filter(([, d]) => d.grants);
      assert.equal(grants.length, 2, `${t} teaches two abilities`);
      assert.ok(
        grants.some(([, d]) => d.tier === TIERS - 1 && d.col === 1),
        `${t} ends in a capstone ability`
      );
      assert.equal(TREES[t].cls, cls);
    }
  }
  const points = (t: string) =>
    Object.values(TALENTS)
      .filter(d => d.tree === t)
      .reduce((a, d) => a + d.ranks, 0);
  assert.deepEqual(
    treesOf('archer').map(points),
    treesOf('warrior').map(points),
    'the archer’s trees hold as many points as the warrior’s'
  );
});

test('every spell is in the spellbook, and each class’s bar slots are its own', () => {
  for (const k of Object.keys(SPELLS) as SpellKey[]) assert.ok(SPELL_ORDER.includes(k), k);
  for (const cls of CLASS_IDS) {
    const homes = SPELL_ORDER.filter(k => SPELLS[k].cls === cls && HOME_SLOT[k] !== undefined).map(
      k => HOME_SLOT[k]
    );
    assert.equal(new Set(homes).size, homes.length, `${cls}: no two spells share a home slot`);
  }
  for (const t of Object.values(TALENTS))
    if (t.grants) assert.equal(SPELLS[t.grants].cls, TREES[t.tree].cls, t.name);
});

test('a class learns its own spells, and only its own', () => {
  const w = hero('warrior', 11).h;
  const a = hero('archer', 11).h;
  for (const k of ['quickshot', 'aimedshot', 'volley', 'pierce', 'killshot'] as SpellKey[]) {
    assert.ok(a.knows(k), `archer knows ${k}`);
    assert.equal(w.knows(k), false, `warrior doesn't know ${k}`);
  }
  for (const k of ['thrust', 'slash', 'whirlwind', 'mortal'] as SpellKey[])
    assert.equal(a.knows(k), false, k);
  assert.ok(a.knows('mount') && w.knows('mount'), 'both ride');
  assert.match(a.talentProblem('honed_edge')!, /another class/);
  assert.equal(a.talentProblem('sharp_arrows'), null);
});

test('a talent that names a spell waits for it', () => {
  const nameOf = (k: SpellKey) => (isSkill(k) ? SKILLS[k].n : ACTIONS[k].n);
  for (const [id, t] of Object.entries(TALENTS)) {
    if (t.spell) assert.equal(SPELLS[t.spell].cls, TREES[t.tree].cls, `${id} improves its class's spell`);
    if (t.grants) continue;
    const named = SPELL_ORDER.filter(k => t.desc(t.ranks).includes(nameOf(k)));
    if (named.length) assert.ok(t.spell && named.includes(t.spell), `${id} needs one of ${named}`);
  }
});

test('no points in Tracker before Hunter’s Mark', () => {
  const { h } = hero('archer', 2);
  assert.equal(h.knows('mark'), false);
  assert.match(h.talentProblem('tracker')!, /Hunter's Mark, learned at level 5/);
  assert.equal(h.talentProblem('hunting_arrows'), null, 'the tree still has something to take');
  while (h.level < 5) h.gainXp(xpToNext(h.level));
  assert.equal(h.talentProblem('tracker'), null);
  assert.ok(h.learnTalent('tracker'));
});

test('levelling up puts only your own class’s spells on the bar', () => {
  for (const cls of CLASS_IDS) {
    const { h } = hero(cls);
    while (h.level < MAX_LEVEL) h.gainXp(xpToNext(h.level));
    for (const k of h.bar) if (k) assert.ok(h.knows(k), `${cls} bar holds ${k}`);
    const own = SPELL_ORDER.filter(k => SPELLS[k].level && !SPELLS[k].talent && h.knows(k));
    for (const k of own) assert.ok(h.bar.includes(k), `${cls} gets ${k} on the bar`);
  }
});

test('each class starts with its own kit, and weapons stay with their class', () => {
  const a = hero('archer').h;
  const w = hero('warrior').h;
  assert.equal(a.equip.weapon, CLASSES.archer.starter.weapon);
  assert.equal(w.equip.weapon, CLASSES.warrior.starter.weapon);
  assert.ok(a.hasBow && !w.hasBow);
  assert.equal(a.hpMax, CLASSES.archer.hp, 'archers are lighter');
  assert.equal(canWield('iron_sword', 'archer'), false);
  assert.equal(canWield('yew_longbow', 'warrior'), false);
  assert.ok(
    canWield('pickaxe', 'archer') && canWield('chainmail', 'archer'),
    'tools and armour are for everyone'
  );
  a.give('iron_sword');
  a.equipFromBag(a.bag.findIndex(s => s?.id === 'iron_sword'));
  assert.equal(a.equip.weapon, CLASSES.archer.starter.weapon, 'the sword stays in the bag');
});

test('an archer can forge the iron sword Warden’s Steel asks for', () => {
  const { game, h } = hero('archer');
  h.questLog.set('stone_and_fire', 'done');
  game.acceptQuest('warden_steel', h);
  h.give('stone', 8);
  h.give('log', 3);
  h.give('iron_bar', 3);
  assert.ok(make(game, h, 'forge'), 'builds a forge');
  assert.ok(make(game, h, 'iron_sword'), 'forges a sword it cannot wield');
  assert.equal(h.count('iron_sword'), 1);
  assert.equal(game.questStatus('warden_steel', h), 'ready');
});

test('loot is something your class can use', () => {
  assert.equal(lootFor('iron_sword', 'archer'), 'yew_longbow');
  assert.equal(lootFor('iron_shield', 'archer'), 'hunters_quiver');
  assert.equal(lootFor('yew_longbow', 'warrior'), 'iron_sword');
  assert.equal(lootFor('chainmail', 'archer'), 'chainmail');
  assert.equal(lootFor('iron_sword', 'sorceress'), 'runed_staff');
  assert.equal(lootFor('hunters_quiver', 'sorceress'), 'crystal_orb');
  assert.equal(lootFor('warden_staff', 'archer'), 'warden_longbow');
  assert.equal(lootFor('willow_staff', 'warrior'), 'steel_sword');
  assert.equal(lootFor('ashwood_staff', 'warrior'), 'woodcutter_axe');
  for (const id of Object.keys(ITEMS) as (keyof typeof ITEMS)[]) {
    if (ITEMS[id].cls)
      for (const cls of CLASS_IDS) assert.ok(canWield(lootFor(id, cls), cls), `${id} for ${cls}`);
  }
});

test('an archer stands still to shoot: keys held refuse, a click-walk stops', () => {
  const { h } = hero('archer');
  const e = foe(h, 'cow', 150);
  h.setTarget(e);
  h.inputMove = { x: 1, y: 0 };
  assert.equal(h.castKey('quickshot'), false);
  h.inputMove = { x: 0, y: 0 };
  h.moveTo(h.x + 40, h.y, false);
  assert.ok(h.path);
  assert.ok(h.castKey('quickshot'), 'stops and shoots');
  assert.equal(h.path, null);
  assert.ok(h.aimT > 0, 'and holds still for the draw');
});

test('arrows fly: the hit lands when the arrow does', () => {
  const { game, h } = hero('archer');
  const e = foe(h, 'cow', 180);
  h.setTarget(e);
  const hp = e.hp;
  assert.ok(h.castKey('quickshot'));
  assert.equal(e.hp, hp, 'not yet');
  run(game, 0.5);
  assert.ok(e.hp < hp, 'now');
});

test('auto-shots: from afar, only while standing', () => {
  const { game, h } = hero('archer');
  const e = foe(h, 'cow', 180);
  h.setTarget(e);
  const hp = e.hp;
  h.inputMove = { x: 0, y: 1 };
  run(game, 3);
  // the cow wanders off a little, but no arrow has flown
  assert.equal(e.hp, hp, 'walking: no shots');
  h.inputMove = { x: 0, y: 0 };
  e.x = h.x + 150;
  e.y = h.y;
  run(game, 4);
  assert.ok(e.hp < hp, 'standing: shots');
});

test("Hunter's Mark: your prey takes more from you", () => {
  const hit = (marked: boolean) => {
    const { game, h } = hero('archer', 5);
    game.cheats.freezeEnemies = true;
    const e = foe(h, 'ogre', 150);
    h.setTarget(e);
    if (marked) {
      h.castKey('mark');
      h.t = 9;
    }
    const hp = e.hp;
    h.castKey('aimedshot');
    run(game, 0.5);
    return hp - e.hp;
  };
  const plain = hit(false);
  assert.ok(hit(true) >= Math.round(plain * 1.2) - 1, 'marked: about 20% more');
});

test('Concussive Shot slows, a bear trap holds and hurts', () => {
  const { game, h } = hero('archer', 3);
  const e = foe(h, 'goblin', 180);
  h.setTarget(e);
  h.castKey('concussive');
  run(game, 0.5);
  assert.ok(e.slowT > 0 && e.slowK >= 0.5, 'slowed');

  const t = hero('archer', 25);
  t.h.talents.bear_trap = 1;
  t.h.applyTalents();
  const g = foe(t.h, 'goblin', 100);
  t.h.setTarget(g);
  t.h.doAction('beartrap', false, 2, true);
  assert.equal(t.h.region.traps.length, 1);
  const hp = g.hp;
  g.x = t.h.x + 2;
  run(t.game, 0.2);
  assert.ok(g.rootT > 0, 'caught');
  assert.ok(g.hp < hp, 'and hurt');
  assert.equal(t.h.region.traps.length, 0, 'sprung');
});

test('Volley hits a group, Piercing Shot a line', () => {
  const { game, h } = hero('archer', 11);
  game.cheats.freezeEnemies = true;
  const group = [foe(h, 'ogre', 180), foe(h, 'ogre', 195)];
  group[1].y += 20;
  h.setTarget(group[0]);
  const hp = group.map(e => e.hp);
  h.castKey('volley');
  run(game, 0.6);
  assert.ok(
    group.every((e, i) => e.hp < hp[i]),
    'both under the volley'
  );

  const l = hero('archer', 11);
  l.game.cheats.freezeEnemies = true;
  // the arrow goes 60 past the target
  const line = [foe(l.h, 'ogre', 100), foe(l.h, 'ogre', 150)];
  l.h.setTarget(line[0]);
  const lhp = line.map(e => e.hp);
  l.h.castKey('pierce');
  run(l.game, 0.6);
  assert.ok(
    line.every((e, i) => e.hp < lhp[i]),
    'through both'
  );
});

test('Camouflage: what was after you loses the scent', () => {
  const { game, h } = hero('archer', 25);
  h.talents.camouflage = 1;
  h.applyTalents();
  const e = foe(h, 'goblin', 60);
  e.aggro = true;
  e.foe = h.id;
  h.doAction('camouflage', false, 2, true);
  run(game, 1);
  assert.equal(e.foe, undefined);
  assert.ok(h.hiddenT > 0);
});

test('Disengage leaps away from the target', () => {
  const { h } = hero('archer', 25);
  h.talents.disengage = 1;
  h.applyTalents();
  const e = foe(h, 'goblin', 30);
  h.setTarget(e);
  const d0 = h.dist(h, e);
  h.doAction('disengage', false, 2, true);
  assert.ok(h.dist(h, e) > d0 + 40);
});

test('a slime shot from afar comes for you anyway', () => {
  const { game, h } = hero('archer');
  const e = foe(h, 'slime', 195);
  h.setTarget(e);
  h.castKey('quickshot');
  run(game, 3);
  assert.ok(e.aggro && e.foe === h.id, 'angry at the archer');
  assert.ok(h.dist(h, e) < 150, 'and on its way');
});

test('the class is saved, and old saves are warriors', () => {
  const { game, h } = hero('archer', 4);
  const save = game.toSave(h);
  assert.equal(save.cls, 'archer');
  const g2 = new Game();
  const h2 = g2.addHero('h', 'Test');
  g2.loadSave(save, h2);
  assert.equal(h2.cls, 'archer');
  assert.ok(h2.knows('quickshot'));
  const old = { ...save };
  delete old.cls;
  g2.loadSave(old, h2);
  assert.equal(h2.cls, 'warrior');
  assert.ok(!h2.bar.some(k => k === 'quickshot'), "a warrior's bar has no archer spells");
});

test('a new game hears its region: arrows and numbers reach the screen', async () => {
  const { Sim } = await import('../src/sim/Sim');
  const s = new Sim();
  s.startAs('archer');
  skipScenes(s.game);
  const e = s.hero.region.spawnEnemy('cow', s.hero.x + 120, s.hero.y, true);
  s.hero.region.enemies.push(e);
  s.setTarget(e);
  const floaters: string[] = [];
  s.events.on('floater', f => void floaters.push(f.text));
  assert.ok(s.castKey('quickshot'));
  assert.ok(
    s.fx.some(f => f.type === 'arrow'),
    'the arrow is drawn'
  );
  s.tick(0.5);
  assert.ok(floaters.length > 0, 'the damage shows');
});

// ------------------------------------------------------------ the sorceress

test('a sorceress starts with a staff, the lightest of the three', () => {
  const { h } = hero('sorceress');
  assert.equal(h.equip.weapon, 'gnarled_staff');
  assert.ok(h.hasStaff && h.ranged && !h.hasBow);
  assert.equal(h.hpMax, CLASSES.sorceress.hp);
  assert.ok(CLASSES.sorceress.hp < CLASSES.archer.hp);
  assert.ok(h.knows('spark') && h.knows('firebolt') && !h.knows('quickshot'));
  assert.equal(h.aaReach, CLASSES.sorceress.aa.range);
  assert.equal(canWield('runed_staff', 'archer'), false);
  assert.equal(canWield('yew_longbow', 'sorceress'), false);
});

test('a sorceress stands still to cast, and her bolts fly', () => {
  const { game, h } = hero('sorceress');
  const e = foe(h, 'cow', 180);
  h.setTarget(e);
  h.inputMove = { x: 1, y: 0 };
  assert.equal(h.castKey('spark'), false, 'not on the move');
  h.inputMove = { x: 0, y: 0 };
  const hp = e.hp;
  const drawn: string[] = [];
  h.region.events.on('fx', f => void drawn.push(f.type));
  assert.ok(h.castKey('spark'));
  assert.ok(h.aimT > 0, 'holds still to cast');
  assert.ok(drawn.includes('orb'), 'a bolt is drawn');
  assert.equal(e.hp, hp, 'not yet');
  run(game, 0.6);
  assert.ok(e.hp < hp, 'now');
});

test('without a staff she cannot cast', () => {
  const { h } = hero('sorceress');
  const e = foe(h, 'cow', 150);
  h.setTarget(e);
  h.unequip('weapon');
  assert.equal(h.castKey('spark'), false);
  assert.match(h.canDo('spark')!, /staff/);
  assert.equal(h.aaReach, 48, 'she can only punch');
});

test('Firebolt burns hotter after a Spark; Ignite burns on', () => {
  const hit = (spark: boolean) => {
    const { game, h } = hero('sorceress', 2);
    game.cheats.freezeEnemies = true;
    const e = foe(h, 'ogre', 150);
    h.setTarget(e);
    // no bolts of her staff's own in the count
    h.aaT = 99;
    if (spark) {
      h.castKey('spark');
      run(game, 0.6);
      h.t = 9;
    }
    const hp = e.hp;
    h.castKey('firebolt');
    run(game, 0.5);
    return hp - e.hp;
  };
  assert.ok(hit(true) > hit(false), 'kindled');

  const { game, h } = hero('sorceress', 2);
  game.cheats.freezeEnemies = true;
  const e = foe(h, 'ogre', 150);
  h.setTarget(e);
  h.castKey('ignite');
  run(game, 0.5);
  assert.ok(h.bleedT > 0, 'burning');
  const hp = e.hp;
  run(game, 3);
  assert.ok(e.hp < hp, 'and it hurts');
});

test('Frostbolt slows; Frost Nova freezes everything near', () => {
  const { game, h } = hero('sorceress', 3);
  const e = foe(h, 'goblin', 180);
  h.setTarget(e);
  h.castKey('frostbolt');
  run(game, 0.6);
  assert.ok(e.slowT > 0 && e.slowK >= 0.5, 'slowed');

  const t = hero('sorceress', 25);
  t.h.talents.frost_nova = 1;
  t.h.applyTalents();
  const near = [foe(t.h, 'goblin', 30), foe(t.h, 'goblin', 50)];
  const far = foe(t.h, 'goblin', 150);
  const hp = near.map(g => g.hp);
  assert.ok(t.h.doAction('frostnova', false, 2, true));
  assert.ok(
    near.every((g, i) => g.rootT > 0 && g.hp < hp[i]),
    'frozen and hurt'
  );
  assert.equal(far.rootT, 0, 'out of reach');
});

test('Flamestrike burns a group; Chain Lightning leaps', () => {
  const { game, h } = hero('sorceress', 11);
  game.cheats.freezeEnemies = true;
  const group = [foe(h, 'ogre', 180), foe(h, 'ogre', 195)];
  group[1].y += 20;
  h.setTarget(group[0]);
  const hp = group.map(e => e.hp);
  h.castKey('flamestrike');
  run(game, 0.7);
  assert.ok(
    group.every((e, i) => e.hp < hp[i]),
    'both in the flames'
  );

  const c = hero('sorceress', 11);
  c.game.cheats.freezeEnemies = true;
  const chain = [foe(c.h, 'ogre', 120), foe(c.h, 'ogre', 180), foe(c.h, 'ogre', 240)];
  const lone = foe(c.h, 'ogre', 120);
  lone.y += 200;
  c.h.setTarget(chain[0]);
  const chp = chain.map(e => e.hp);
  assert.ok(c.h.castKey('chainlightning'));
  run(c.game, 0.5);
  assert.ok(
    chain.every((e, i) => e.hp < chp[i]),
    'leaps from one to the next'
  );
  assert.equal(lone.hp, lone.hpMax, 'not to one far away');
});

test('Counterspell cuts a cast short from afar', () => {
  const { game, h } = hero('sorceress', 6);
  const e = foe(h, 'shaman', 180);
  h.setTarget(e);
  assert.match(h.canDo('counterspell')!, /Nothing to counter/);
  e.castT = 1;
  assert.ok(h.castKey('counterspell'));
  run(game, 0.6);
  assert.ok(e.castT < 0 && e.stunT > 0, 'countered and stunned');
});

test('Blink steps back; Arcane Barrier heals and shields', () => {
  const { h } = hero('sorceress', 25);
  h.talents.blink = 1;
  h.talents.arcane_barrier = 1;
  h.applyTalents();
  const e = foe(h, 'goblin', 30);
  h.setTarget(e);
  const d0 = h.dist(h, e);
  assert.ok(h.doAction('blink', false, 2, true));
  assert.ok(h.dist(h, e) > d0 + 40);
  h.hp = 20;
  assert.ok(h.doAction('barrier', false, 2, true));
  assert.ok(h.hp > 20 && h.lastStandT > 0);
});

test('Pyroblast is ready again when it kills', () => {
  const { game, h } = hero('sorceress', 25);
  h.talents.pyroblast = 1;
  h.applyTalents();
  const e = foe(h, 'slime', 150);
  e.hp = 5;
  h.setTarget(e);
  assert.ok(h.doAction('pyroblast', false, 2, true));
  run(game, 0.5);
  assert.equal(e.alive, false);
  assert.equal(h.cdRemaining('pyroblast'), 0);
});

test('a sorceress is saved as one', () => {
  const { game, h } = hero('sorceress', 4);
  const save = game.toSave(h);
  assert.equal(save.cls, 'sorceress');
  const g2 = new Game();
  const h2 = g2.addHero('h', 'Test');
  g2.loadSave(save, h2);
  assert.equal(h2.cls, 'sorceress');
  assert.ok(h2.knows('frostbolt'));
});
