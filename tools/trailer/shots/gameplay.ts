import type { Shot, Director } from './types';
import { KNIGHT, KNIGHT2, RANGER, party, brawl, WARRIOR_FIGHT, ARCHER_FIGHT } from './kit';

/**
 * Trailer 2, "Hold the Night": the game as you play it, interface and all. Gathering,
 * building and forging; both classes and their big spells; the horse; friends in co-op; the
 * day turning to night and the dead coming up; storms; the Bell-Ringer.
 */

/** A hero mid-campaign: a few quests on the tracker, things in the bag. */
function campaign(d: Director): void {
  for (const q of ['thorns_fences', 'kings_hounds', 'bell_tolls']) d.sim.acceptQuest(q);
  for (const [id, n] of [
    ['log', 9],
    ['stone', 12],
    ['iron_ore', 6],
    ['iron_bar', 4],
    ['meat', 4],
    ['cooked_meat', 3],
    ['bread', 2],
    ['bone_fang', 5],
  ] as const)
    d.sim.addItem(id, n);
}

/** The nearest standing tree or rock to a tile. */
function nearest<T extends { x: number; y: number }>(list: T[], at: [number, number]): T {
  const x = at[0] * 32 + 16;
  const y = at[1] * 32 + 16;
  return list.reduce((a, b) => (Math.hypot(b.x - x, b.y - y) < Math.hypot(a.x - x, a.y - y) ? b : a));
}

export const GAMEPLAY: Record<string, Shot> = {
  g_hud_walk: {
    dur: 6,
    clean: false,
    seed: 41,
    note: 'UI: the knight walks the Greenmarch at noon, the HUD all there',
    setup(d) {
      d.go('greenmarch', [30, 40]).time(0.47).weather('clear');
      d.dress(d.hero, { ...KNIGHT, at: [30, 40] });
      campaign(d);
      d.playerLight = false;
      d.walk(d.hero, [40, 47]);
      d.camFollow(d.hero, 0.25, 1.25);
    },
  },
  g_chop: {
    dur: 6,
    clean: false,
    seed: 42,
    note: 'UI: chopping a tree till it falls',
    setup(d) {
      d.go('greenmarch', [30, 44]).time(0.45).weather('clear');
      d.dress(d.hero, { ...KNIGHT, at: [30, 44] });
      d.hero.equip.weapon = 'woodcutter_axe';
      d.hero.applyGear();
      d.sim.events.emit('bag', {});
      campaign(d);
      d.playerLight = false;
      const tree = nearest(d.sim.trees, [30, 44]);
      d.hero.startChop(tree);
      d.camAt({ x: tree.x, y: tree.y }, 1.6);
      // then the next one along
      d.at(1.9, x => {
        const next = nearest(
          x.sim.trees.filter(t => t !== tree && t.stumpT <= 0),
          [Math.floor(tree.x / 32), Math.floor(tree.y / 32)]
        );
        x.hero.startChop(next);
        x.camTo({ x: (tree.x + next.x) / 2, y: (tree.y + next.y) / 2 }, 2.5, 1.6);
      });
    },
  },
  g_chop_rain: {
    dur: 6,
    clean: false,
    seed: 62,
    note: 'UI: chopping a tree till it falls, in the rain the storm leaves behind',
    setup(d) {
      d.go('greenmarch', [30, 44]).time(0.45).weather('rain');
      d.dress(d.hero, { ...KNIGHT, at: [30, 44] });
      d.hero.equip.weapon = 'woodcutter_axe';
      d.hero.applyGear();
      d.sim.events.emit('bag', {});
      campaign(d);
      d.playerLight = false;
      const tree = nearest(d.sim.trees, [30, 44]);
      d.hero.startChop(tree);
      d.camAt({ x: tree.x, y: tree.y }, 1.6);
      // then the next one along
      d.at(1.9, x => {
        const next = nearest(
          x.sim.trees.filter(t => t !== tree && t.stumpT <= 0),
          [Math.floor(tree.x / 32), Math.floor(tree.y / 32)]
        );
        x.hero.startChop(next);
        x.camTo({ x: (tree.x + next.x) / 2, y: (tree.y + next.y) / 2 }, 2.5, 1.6);
      });
    },
  },
  g_mine: {
    dur: 6,
    clean: false,
    seed: 43,
    note: 'UI: swinging a pickaxe at a boulder',
    setup(d) {
      d.go('greenmarch', [52, 26]).time(0.5).weather('clear');
      d.dress(d.hero, { ...KNIGHT, at: [52, 26] });
      d.hero.equip.weapon = 'pickaxe';
      d.hero.applyGear();
      d.sim.events.emit('bag', {});
      campaign(d);
      d.playerLight = false;
      const rock = nearest(d.sim.rocks, [52, 26]);
      d.hero.startMine(rock);
      d.camAt({ x: rock.x, y: rock.y }, 1.6);
    },
  },
  g_campfire: {
    dur: 7,
    clean: false,
    seed: 44,
    note: 'UI: building a campfire by hand, then cooking on it as the light goes',
    setup(d) {
      d.go('greenmarch', [29, 41]).time(0.76).weather('clear');
      d.dress(d.hero, { ...KNIGHT, at: [29, 41] });
      campaign(d);
      d.open('crafting');
      d.camAt(d.hero, 1.6);
      d.at(0.3, x => x.sim.craft('campfire'));
      d.at(4.0, x => x.sim.craft('cooked_meat', 3));
    },
  },
  g_forge: {
    dur: 7,
    clean: false,
    seed: 45,
    note: 'UI: forging an iron sword at the forge',
    setup(d) {
      d.go('greenmarch', [31, 44]).time(0.55).weather('clear');
      d.dress(d.hero, { ...KNIGHT, at: [31, 44] });
      campaign(d);
      d.sim.addItem('iron_bar', 6);
      d.build('forge', [32, 44]);
      d.open('crafting');
      d.camAt(d.hero, 1.6);
      d.at(0.3, x => x.sim.craft('iron_sword'));
    },
  },
  g_inventory: {
    dur: 6,
    clean: false,
    seed: 46,
    note: 'UI: the inventory open, putting on mail and a helm (they show on the hero)',
    setup(d) {
      d.go('greenmarch', [31, 44]).time(0.5).weather('clear');
      d.dress(d.hero, { ...KNIGHT2, at: [31, 44], equip: { ...KNIGHT2.equip, body: 'leather_tunic', head: null, offhand: 'wooden_shield' } });
      campaign(d);
      // Act II's steel and the Wardens' cloak
      d.sim.addItem('warden_cloak', 1);
      d.sim.addItem('steel_helm', 1);
      d.sim.addItem('steel_shield', 1);
      d.open('inventory');
      d.camAt(d.hero, 2.2);
      const wear = (id: string) => (x: Director) => {
        const i = x.sim.bag.findIndex(s => s?.id === id);
        if (i >= 0) x.sim.equipFromBag(i);
      };
      d.at(1.5, wear('warden_cloak'));
      d.at(3.0, wear('steel_helm'));
      d.at(4.5, wear('steel_shield'));
    },
  },
  g_talents: {
    dur: 5,
    clean: false,
    seed: 47,
    note: 'UI: the talent trees',
    setup(d) {
      d.go('greenmarch', [31, 44]).time(0.5).weather('clear');
      d.dress(d.hero, { ...KNIGHT, at: [31, 44], talents: { honed_edge: 3, keen_eye: 3, sunder: 1, battle_rage: 3, flurry: 2, toughness: 3, shield_wall: 2, shield_bash: 1 } });
      d.open('talents');
      d.camAt(d.hero, 1.5);
    },
  },
  g_warrior_charge: {
    dur: 6,
    clean: false,
    settle: 0.3,
    seed: 48,
    note: 'UI: the knight charges the goblin camp, whirls, cuts down the ogre',
    setup(d) {
      d.go('greenmarch', [51, 21]).time(0.55).weather('clear');
      d.dress(d.hero, { ...KNIGHT, at: [51, 21] });
      campaign(d);
      d.playerLight = false;
      d.spawn('ogre', [60, 19]);
      d.camFollow(d.hero, 0.4, 2, 30, 0);
      d.at(0.4, x => x.brain(x.hero, { spells: WARRIOR_FIGHT }));
    },
  },
  g_warrior_whirl: {
    dur: 6,
    clean: false,
    settle: 0.3,
    seed: 49,
    note: 'UI: surrounded by the dead at night, Whirlwind',
    setup(d) {
      d.go('greenmarch', [30, 44]).time(0.95).weather('clear').darkness(0.6);
      d.clearEnemies();
      d.dress(d.hero, { ...KNIGHT, at: [30, 44] });
      campaign(d);
      for (const [c, r] of [
        [31, 43],
        [29, 45],
        [31, 45],
        [29, 43],
        [32, 44],
        [28, 44],
      ] as [number, number][])
        d.spawn('skeleton', [c, r]);
      d.camAt(d.hero, 1.8);
      d.at(0.3, x => x.brain(x.hero, { spells: ['whirlwind', 'warcry', 'mortal', 'thrust', 'slash'] }));
    },
  },
  g_shaman: {
    dur: 6,
    clean: false,
    settle: 0.3,
    seed: 50,
    note: "UI: the goblin shaman's fireball, cut short by an Interrupt",
    setup(d) {
      d.go('greenmarch', [56, 20]).time(0.55).weather('clear');
      d.clearEnemies();
      d.dress(d.hero, { ...KNIGHT, at: [57, 20] });
      campaign(d);
      d.playerLight = false;
      const sh = d.spawn('shaman', [60, 18]);
      d.hero.setTarget(sh);
      d.camAt([58.5, 19], 1.8);
      d.each(x => {
        if (sh.alive && sh.castT > 0 && sh.castT < sh.castTotal - 0.9) x.hero.castKey('interrupt');
      });
      d.at(0.2, x => x.brain(x.hero, { spells: ['interrupt', 'thrust', 'slash', 'mortal'] }));
    },
  },
  g_archer_volley: {
    dur: 6,
    clean: false,
    settle: 0.3,
    seed: 51,
    note: 'UI: the ranger rains a volley on the goblin camp, then a piercing shot',
    setup(d) {
      d.go('greenmarch', [52, 23]).time(0.55).weather('clear');
      d.dress(d.hero, { ...RANGER, at: [52, 23] });
      campaign(d);
      d.playerLight = false;
      d.spawn('ogre', [60, 19]);
      d.camAt([56, 21.5], 1.9);
      d.at(0.3, x => x.brain(x.hero, { spells: ['volley', 'pierce', 'deadeye', 'aimedshot', 'quickshot'], reach: 150 }));
    },
  },
  g_archer_trap: {
    dur: 6,
    clean: false,
    settle: 0.3,
    seed: 52,
    note: 'UI: a bear trap snaps on a charging hound; the archer leaps back and shoots',
    setup(d) {
      d.go('millbrook', [47, 32]).time(0.93).weather('clear').darkness(0.6);
      d.clearEnemies();
      d.dress(d.hero, { ...RANGER, at: [47, 32] });
      campaign(d);
      d.sim.castKey('beartrap');
      d.walk(d.hero, [46, 30]);
      d.at(1.2, x => {
        const hd = x.spawn('bonehound', [51, 38]);
        hd.aggro = true;
      });
      d.at(1.0, x => x.brain(x.hero, { spells: ['concussive', 'aimedshot', 'barbed', 'quickshot'], reach: 150 }));
      d.camAt([47.5, 33], 1.8);
    },
  },
  g_mount: {
    dur: 6,
    clean: false,
    seed: 53,
    note: 'UI: whistling up the horse and riding off',
    setup(d) {
      d.go('greenmarch', [40, 31]).time(0.62).weather('clear');
      d.dress(d.hero, { ...KNIGHT, at: [40, 31] });
      campaign(d);
      d.playerLight = false;
      d.sim.castKey('mount');
      d.at(1.6, x => x.walk(x.hero, [58, 30]));
      d.camFollow(d.hero, 0.4, 1.5);
    },
  },
  g_coop: {
    dur: 7,
    clean: false,
    settle: 0.3,
    seed: 54,
    note: 'UI: four friends in co-op, names over their heads, against goblins and an ogre',
    setup(d) {
      d.go('greenmarch', [52, 22]).time(0.58).weather('clear');
      const p = party(d, [53, 21]);
      campaign(d);
      d.playerLight = false;
      d.spawn('ogre', [60, 19]);
      d.spawn('goblin', [58, 22]);
      d.at(0.3, x => brawl(x, p));
      d.camAt([56.5, 20.5], 1.8);
    },
  },
  g_daynight: {
    dur: 7,
    clean: false,
    seed: 55,
    note: 'UI: the day dial turns, the sun goes down, the dead come up',
    setup(d) {
      d.go('greenmarch', [12, 13]).time(0.7, 18).weather('clear').darkness(0.75);
      d.dress(d.hero, { ...KNIGHT, at: [12, 14] });
      campaign(d);
      d.hero.face = -1;
      d.camAt([10, 11], 1.3);
    },
  },
  g_storm: {
    dur: 7,
    clean: false,
    seed: 56,
    note: 'UI: a storm over Millbrook, lightning close by',
    setup(d) {
      d.go('millbrook', [38, 31]).time(0.6).weather('storm');
      d.dress(d.hero, { ...KNIGHT, at: [38, 31] });
      campaign(d);
      d.walk(d.hero, [38, 26]);
      d.camFollow(d.hero, 0.4, 1.3);
      d.at(1.5, x => x.strike('near'));
      d.at(5.0, x => x.strike('near'));
    },
  },
  g_storm_dusk: {
    dur: 7,
    clean: false,
    seed: 64,
    note: 'UI: a thunderstorm breaks over Millbrook as night falls: the day dial turning, the lit windows, lightning close by',
    setup(d) {
      d.go('millbrook', [36, 33]).time(0.74, 14).weather('storm').darkness(0.65);
      d.dress(d.hero, { ...KNIGHT, at: [36, 33] });
      campaign(d);
      d.walk(d.hero, [40, 25]);
      d.camFollow(d.hero, 0.6, 1.5, 0, -10);
      d.at(1.2, x => x.strike('near'));
      d.at(3.4, x => x.strike('mid'));
      d.at(5.2, x => x.strike('near'));
    },
  },
  g_hounds: {
    dur: 7,
    clean: false,
    settle: 0.3,
    seed: 57,
    note: 'UI: a pack of bone hounds comes howling out of the fields at the party',
    setup(d) {
      d.go('millbrook', [47, 31]).time(0.95).weather('clear').darkness(0.55);
      d.clearEnemies();
      const p = party(d, [47, 31]);
      campaign(d);
      d.build('campfire', [46, 32]);
      for (const at of [
        [53, 40],
        [55, 38],
        [51, 41],
        [56, 41],
        [54, 43],
      ] as [number, number][])
        d.spawn('bonehound', at).aggro = true;
      d.at(0.5, x => brawl(x, p));
      d.camAt([49, 33.8], 1.8);
    },
  },
  g_boss: {
    dur: 9,
    clean: false,
    settle: 0.3,
    seed: 58,
    note: 'UI: the Bell-Ringer, boss bar and all: the rings, the risen dead, the party fighting',
    setup(d) {
      d.go('belltower', [10, 12]);
      const p = party(d, [10, 12]);
      const boss = d.region.enemies.find(e => e.kind === 'bellringer');
      if (boss) {
        // tough enough to last the shot against four
        boss.hpMax = boss.hp = 9000;
        d.region.hurtEnemy(boss, 3400, 'aa', d.hero);
        boss.aggro = true;
      }
      d.at(0.2, x => brawl(x, p));
      d.each(x => {
        for (const h of p) {
          if (h.airborne) continue;
          for (const ring of x.region.hazards) {
            const r = Math.hypot(h.x - ring.x, h.y - ring.y);
            if (ring.r > 0 && r - ring.r > 0 && r - ring.r < 26) h.jump();
          }
        }
      });
      d.camAt([10, 9.5], 1.5);
    },
  },
  g_boss_down: {
    dur: 6,
    clean: false,
    settle: 0.3,
    seed: 59,
    note: 'UI: the last blows on the Bell-Ringer',
    setup(d) {
      d.go('belltower', [10, 11]);
      const p = party(d, [10, 11]);
      const boss = d.region.enemies.find(e => e.kind === 'bellringer');
      if (boss) {
        // a few seconds left in him
        boss.hpMax = boss.hp = 9000;
        d.region.hurtEnemy(boss, 7700, 'aa', d.hero);
        boss.aggro = true;
      }
      d.at(0.1, x => brawl(x, p));
      d.camAt([10, 9.5], 1.75);
    },
  },
  g_3d_diorama: {
    dur: 8,
    seed: 60,
    note: 'the 3D diorama view at the mill: it swings round as the knight crosses the bridge, tilts down and closes in',
    setup(d) {
      d.go('millbrook', [24, 30]).time(0.64).weather('clear');
      d.dress(d.hero, { ...KNIGHT, at: [24, 30] });
      d.camGame();
      d.view('diorama');
      d.cam3d({ yaw: Math.PI / 4 - 0.6, pitch: 0.62, zoom: 0.95 });
      d.walk(d.hero, [15, 29]);
      d.at(0, x => x.cam3dTo({ yaw: Math.PI / 4 + 1.5, pitch: 0.34, zoom: 1.7 }, 6.6, 'inOut'));
    },
  },
  g_3d_pov: {
    dur: 8,
    seed: 61,
    note: "the point-of-view camera: behind the knight down Millbrook's road past the mill, then through their eyes",
    setup(d) {
      d.go('millbrook', [33, 30]).time(0.66).weather('clear');
      d.dress(d.hero, { ...KNIGHT, at: [33, 30] });
      d.camGame();
      d.view('pov');
      d.cam3d({ yaw: 0, pitch: 0.3, dist: 120 });
      d.walk(d.hero, [12, 30]);
      d.at(0, x => x.cam3dTo({ pitch: 0.16, dist: 66 }, 5.5, 'inOut'));
      // then into their eyes at once (a glide would pass through the sprite), on a beat of the cut (night.ts)
      d.at(5.584, x => x.cam3d({ pitch: 0.03, dist: 0 }));
    },
  },
  g_3d_pov_rain: {
    dur: 8,
    seed: 63,
    note: "the point-of-view camera: behind the knight down Millbrook's road past the mill, then through their eyes, in the rain",
    setup(d) {
      d.go('millbrook', [33, 30]).time(0.66).weather('rain');
      d.dress(d.hero, { ...KNIGHT, at: [33, 30] });
      d.camGame();
      d.view('pov');
      d.cam3d({ yaw: 0, pitch: 0.3, dist: 120 });
      d.walk(d.hero, [12, 30]);
      d.at(0, x => x.cam3dTo({ pitch: 0.16, dist: 66 }, 5.5, 'inOut'));
      // then into their eyes at once (a glide would pass through the sprite), on a beat of the cut (night.ts)
      d.at(5.584, x => x.cam3d({ pitch: 0.03, dist: 0 }));
    },
  },
};

export { ARCHER_FIGHT };
