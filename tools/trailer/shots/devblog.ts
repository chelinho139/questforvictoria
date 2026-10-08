import type { Shot, Director } from './types';
import type { Hero } from '../../../src/sim/Hero';
import type { HeroSetup } from '../../../src/phaser/dev/Director';
import { KNIGHT, RANGER } from './kit';

/**
 * Dev blog 2 (October 2026): what's new since the last one. Mostly the sorceress (her three
 * schools, her gear and talent trees, the three classes side by side), then the co-op revive,
 * the new level-up, the horse's trot, and Act I's new corner: Old Cobb, the thornlings and the
 * Old Briar. The interface is in view, as you play it.
 */

/** The sorceress the dev blog follows: red hair, Maud's grey cloak, the Warden staff and an orb, a spell from every tree. */
export const SORC: HeroSetup = {
  cls: 'sorceress',
  look: 'cute',
  name: 'Morwen',
  level: 20,
  equip: { weapon: 'warden_staff', offhand: 'crystal_orb', head: null, body: 'warm_cloak', legs: 'broodsilk_leggings', feet: 'warden_boots', trinket: 'thane_torc' },
  talents: { scorch: 1, pyroblast: 1, frost_nova: 1, icy_veins: 1, blink: 1, arcane_barrier: 1 },
};

/** A few quests on the tracker, things in the bag. */
function campaign(d: Director): void {
  for (const q of ['walking_hedge', 'kings_hounds', 'bell_tolls']) d.sim.acceptQuest(q);
  for (const [id, n] of [
    ['log', 6],
    ['iron_bar', 3],
    ['cooked_meat', 3],
    ['bread', 2],
    ['black_thorn', 4],
  ] as const)
    d.sim.addItem(id, n);
}

/** Cast this the moment a foe comes within `r` px (Frost Nova when the pack arrives). */
function whenClose(d: Director, key: 'frostnova', r: number): void {
  d.each(x => {
    const h = x.hero;
    if (h.canDo(key) !== null) return;
    if (x.region.enemies.some(e => e.alive && !e.hid && Math.hypot(e.x - h.x, e.y - h.y) < r)) h.castKey(key);
  });
}

export const DEVBLOG: Record<string, Shot> = {
  db_looks: {
    dur: 1,
    clean: false,
    note: 'check: the sorceress in each look',
    setup(d) {
      d.go('greenmarch', [30, 41]).time(0.55).weather('clear');
      d.clearEnemies();
      d.dress(d.hero, { ...SORC, at: [27, 41], look: 'masked', equip: { ...SORC.equip, head: null } });
      const outfits: [string, Partial<Record<string, string | null>>][] = [
        ['masked', { head: null, body: 'warm_cloak' }],
        ['masked', { head: null, body: 'leather_tunic' }],
        ['cute', { head: null }],
        ['cute', { head: null, body: 'warm_cloak' }],
        ['wanderer', { head: null }],
        ['traveller', { head: null }],
      ];
      outfits.forEach(([look, eq], i) => d.addHero({ ...SORC, look: look as never, name: look + i, equip: { ...SORC.equip, ...eq } as never, at: [28 + i, 41] }));
      d.camAt([30, 41], 2.4);
    },
  },
  db_reveal: {
    dur: 7,
    clean: true,
    settle: 0.4,
    seed: 101,
    note: 'clean: the sorceress steps out in the afternoon light and lights up two goblins',
    setup(d) {
      d.go('greenmarch', [30, 41]).time(0.6).weather('clear');
      d.clearEnemies();
      d.dress(d.hero, { ...SORC, at: [29, 42] });
      d.playerLight = false;
      d.spawn('goblin', [35, 40], { face: -1 });
      d.spawn('goblin', [36, 42], { face: -1 });
      d.walk(d.hero, [31, 41]);
      d.camAt([30.5, 41.5], 2.3);
      d.at(0.2, x => x.camTo([32, 41], 6, 1.8, 'slow'));
      d.at(1.4, x => x.brain(x.hero, { spells: ['firebolt', 'spark', 'ignite', 'scorch'], reach: 150 }));
    },
  },
  db_fire: {
    dur: 7,
    clean: false,
    settle: 0.3,
    seed: 102,
    note: 'UI: fire on the goblin camp: Ignite, Firebolt, Scorch and a Pyroblast',
    setup(d) {
      d.go('greenmarch', [52, 23]).time(0.55).weather('clear');
      d.clearEnemies();
      d.dress(d.hero, { ...SORC, at: [52, 23] });
      campaign(d);
      d.playerLight = false;
      const ogre = d.spawn('ogre', [59, 20]);
      ogre.hpMax = ogre.hp = 4000;
      d.spawn('goblin', [58, 22]);
      d.spawn('shaman', [60, 22]);
      d.camAt([55.5, 21.5], 1.9);
      d.at(0.2, x => x.brain(x.hero, { spells: ['pyroblast', 'ignite', 'scorch', 'firebolt', 'spark', 'incinerate'], reach: 160, foes: () => x.region.enemies.filter(e => e.kind === 'ogre' && e.alive) }));
    },
  },
  db_gear: {
    dur: 6,
    clean: false,
    seed: 103,
    note: 'UI: her own gear: the inventory open, a staff, an orb and a cloak going on',
    setup(d) {
      d.go('greenmarch', [31, 44]).time(0.5).weather('clear');
      d.dress(d.hero, { ...SORC, at: [31, 44], equip: { ...SORC.equip, weapon: 'gnarled_staff', offhand: 'hedge_grimoire', body: 'leather_tunic' } });
      campaign(d);
      d.sim.addItem('warden_staff', 1);
      d.sim.addItem('crystal_orb', 1);
      d.sim.addItem('warm_cloak', 1);
      d.sim.addItem('runed_staff', 1);
      d.sim.addItem('willow_staff', 1);
      d.open('inventory');
      d.camAt(d.hero, 2.4);
      const wear = (id: string) => (x: Director) => {
        const i = x.sim.bag.findIndex(s => s?.id === id);
        if (i >= 0) x.sim.equipFromBag(i);
      };
      d.at(1.3, wear('warden_staff'));
      d.at(2.6, wear('crystal_orb'));
      d.at(3.9, wear('warm_cloak'));
    },
  },
  db_talents: {
    dur: 6,
    clean: false,
    seed: 104,
    note: 'UI: her three talent trees: Fire, Frost and Arcane',
    setup(d) {
      d.go('greenmarch', [31, 44]).time(0.5).weather('clear');
      d.dress(d.hero, {
        ...SORC,
        at: [31, 44],
        talents: { burning_soul: 5, searing_focus: 3, bright_spark: 3, staff_lore: 3, quickened_casting: 2, shimmer: 2, clarity: 1 },
      });
      d.open('talents');
      d.camAt(d.hero, 1.6);
    },
  },
  db_frost: {
    dur: 7,
    clean: false,
    settle: 0.3,
    seed: 105,
    note: 'UI: night in Millbrook: the bone hounds come running into a Frost Nova; Frostbolts',
    setup(d) {
      d.go('millbrook', [47, 32]).time(0.93).weather('clear').darkness(0.55);
      d.clearEnemies();
      d.dress(d.hero, { ...SORC, at: [46, 32] });
      campaign(d);
      for (const [c, r] of [
        [53, 32],
        [54, 33],
        [52, 33],
        [54, 31],
      ] as [number, number][]) {
        const hd = d.spawn('bonehound', [c, r]);
        hd.aggro = true;
        hd.hpMax = hd.hp = 600;
      }
      d.camAt([49, 32], 1.9);
      whenClose(d, 'frostnova', 64);
      d.at(0.1, x => x.brain(x.hero, { spells: ['frostbolt', 'icyveins', 'firebolt', 'spark'], reach: 200 }));
    },
  },
  db_arcane: {
    dur: 7,
    clean: false,
    settle: 0.3,
    seed: 106,
    note: 'UI: the dead at night: Arcane Barrier, Flamestrike falling on the crowd, Chain Lightning leaping',
    setup(d) {
      d.go('greenmarch', [30, 44]).time(0.95).weather('clear').darkness(0.55);
      d.clearEnemies();
      d.dress(d.hero, { ...SORC, at: [28, 44] });
      campaign(d);
      for (const [c, r] of [
        [33, 43],
        [34, 44],
        [33, 45],
        [35, 43],
        [35, 45],
        [34, 42],
      ] as [number, number][]) {
        const s = d.spawn('skeleton', [c, r], { face: -1 });
        s.hpMax = s.hp = 900;
      }
      d.camAt([31, 44], 1.8);
      d.at(0.2, x => x.brain(x.hero, { spells: ['barrier', 'flamestrike', 'chainlightning', 'arcanepower', 'firebolt', 'spark'], reach: 170 }));
    },
  },
  db_trio: {
    dur: 7,
    clean: false,
    settle: 0.3,
    seed: 107,
    note: 'UI: the three classes together against the ogre and the goblins',
    setup(d) {
      d.go('greenmarch', [52, 22]).time(0.58).weather('clear');
      d.clearEnemies();
      const p: Hero[] = [d.dress(d.hero, { ...SORC, at: [52, 22] }), d.addHero({ ...KNIGHT, at: [53, 21] }), d.addHero({ ...RANGER, at: [54, 20] })];
      campaign(d);
      d.playerLight = false;
      const ogre = d.spawn('ogre', [59, 20]);
      ogre.hpMax = ogre.hp = 5000;
      d.spawn('goblin', [58, 22]);
      d.spawn('goblin', [60, 22]);
      d.at(0.3, x => {
        x.brain(p[0], { spells: ['flamestrike', 'chainlightning', 'ignite', 'firebolt', 'spark'], reach: 170 });
        x.brain(p[1], { spells: ['charge', 'whirlwind', 'mortal', 'thrust', 'slash', 'rend'] });
        x.brain(p[2], { spells: ['volley', 'pierce', 'aimedshot', 'barbed', 'quickshot'], reach: 190 });
      });
      d.camAt([56, 21], 1.75);
    },
  },
  db_revive: {
    dur: 5,
    clean: false,
    seed: 108,
    note: 'UI: co-op: a friend lies down; the sorceress kneels and casts the long Revive; he gets up',
    setup(d) {
      d.go('millbrook', [38, 28]).time(0.5).weather('clear');
      d.clearEnemies();
      d.dress(d.hero, { ...SORC, at: [38, 28] });
      campaign(d);
      d.playerLight = false;
      const k = d.addHero({ ...KNIGHT, at: [39, 28], god: true });
      k.hp = 0;
      k.dead = 0.05;
      k.down = true;
      d.camAt([38.5, 28], 2.4);
      d.at(0.4, x => {
        x.hero.castKey('revive');
        // the eight seconds, shortened for the cut
        (x.hero as unknown as { reviveT: number }).reviveT = 3.4;
      });
    },
  },
  db_levelup: {
    dur: 4.5,
    clean: false,
    seed: 109,
    note: 'UI: the new level-up: the fanfare, the splash and the gold badge',
    setup(d) {
      d.go('greenmarch', [31, 44]).time(0.5).weather('clear');
      d.clearEnemies();
      d.dress(d.hero, { ...SORC, level: 11, at: [31, 44] });
      campaign(d);
      d.playerLight = false;
      d.camAt(d.hero, 2.0);
      d.at(0.5, x => x.hero.gainXp(99999));
    },
  },
  db_horse: {
    dur: 5,
    clean: true,
    seed: 110,
    note: 'clean: the horse at a trot up the road into Millbrook',
    setup(d) {
      d.go('millbrook', [39, 50]).time(0.55).weather('clear');
      d.clearEnemies();
      d.dress(d.hero, { ...SORC, at: [39, 50] });
      d.playerLight = false;
      d.hero.mounted = true;
      d.walk(d.hero, [39, 36]);
      d.camFollow(d.hero, 0.15, 2.4);
    },
  },
  db_cobb: {
    dur: 5,
    clean: false,
    seed: 111,
    note: 'UI: Old Cobb at his hedge, the thornlings in the ash field behind him',
    setup(d) {
      d.go('millbrook', [34, 16]).time(0.5).weather('clear');
      d.dress(d.hero, { ...SORC, at: [34, 16] });
      d.playerLight = false;
      for (const e of d.region.enemies) if (e.kind === 'thornling') e.aggro = false;
      d.walk(d.hero, [31, 14]);
      d.camAt([31, 12], 1.5);
      d.at(0.2, x => x.camTo([30.5, 10.5], 4.8, 1.6, 'slow'));
    },
  },
  db_briar: {
    dur: 6,
    clean: false,
    settle: 0.3,
    seed: 112,
    note: 'UI: the Old Briar by the thorn wall, boss bar and all, roots and thornlings',
    setup(d) {
      d.go('millbrook', [30, 9]).time(0.5).weather('clear');
      d.clearEnemies();
      const p: Hero[] = [d.dress(d.hero, { ...SORC, at: [29, 9] }), d.addHero({ ...KNIGHT, at: [31, 8] })];
      campaign(d);
      d.playerLight = false;
      const b = d.spawn('old_briar', [30, 4]);
      b.hpMax = b.hp = 9000;
      b.aggro = true;
      d.spawn('thornling', [27, 6]);
      d.spawn('thornling', [33, 6]);
      d.at(0.2, x => {
        x.brain(p[0], { spells: ['flamestrike', 'ignite', 'firebolt', 'spark', 'chainlightning'], reach: 170, foes: () => x.region.enemies.filter(e => e.kind === 'old_briar' && e.alive) });
        x.brain(p[1], { spells: ['charge', 'whirlwind', 'mortal', 'thrust', 'slash'], foes: () => x.region.enemies.filter(e => e.kind === 'old_briar' && e.alive) });
      });
      d.camAt([30, 6.5], 1.7);
    },
  },
};
