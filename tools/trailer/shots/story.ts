import type { Shot } from './types';
import { KNIGHT, RANGER, party, brawl, march, WARRIOR_FIGHT, ARCHER_FIGHT } from './kit';

/**
 * Trailer 1, "The Mirror": the story as everyone believes it, told over the land, with no
 * interface at all. Greenmarch at dawn, Millbrook by day, the thorns at dusk, the dead at
 * night, the heroes on the road and the fights, the bell.
 */
export const STORY: Record<string, Shot> = {
  s1_lake_dawn: {
    dur: 8,
    seed: 11,
    note: 'Lake Ellory at dawn, wide, drifting east over the still water',
    setup(d) {
      d.go('greenmarch', [27, 31]).time(0.3).weather('clear').hideHero([4, 56]);
      d.camAt([22, 21], 0.75).camTo([33, 18], 8, 0.8, 'slow');
    },
  },
  s1_shore_wake: {
    dur: 7,
    seed: 12,
    note: 'the hero on the shore where the lake gave them back, bare, then walking up from the water',
    setup(d) {
      d.go('greenmarch', [27, 30]).time(0.31).weather('clear');
      d.dress(d.hero, { look: 'k3', name: 'Edric', god: true });
      d.playerLight = false;
      d.hero.face = -1;
      d.camAt([26.5, 29.2], 3).camTo([26.8, 29.6], 3.2, 3.2, 'slow');
      d.at(3.2, x => {
        x.walk(x.hero, [29, 33]);
        x.camFollow(x.hero, 1.2, 3.2);
      });
    },
  },
  s1_aldric_camp: {
    dur: 7,
    seed: 13,
    note: "Aldric's camp in the morning: the fire, the tent, the old warden, the hero coming up the path",
    setup(d) {
      d.go('greenmarch', [31, 35]).time(0.33).weather('clear');
      d.dress(d.hero, { look: 'k3', name: 'Edric' });
      d.playerLight = false;
      d.build('campfire', [34, 38]);
      d.camAt([34.5, 37], 2).camTo([35, 37.5], 7, 2.2, 'slow');
      d.walk(d.hero, [33, 37]);
    },
  },
  s1_mill: {
    dur: 7,
    seed: 14,
    note: 'the mill on the Lisle, its wheel turning, Maud at the door, midday',
    setup(d) {
      d.go('millbrook', [39, 50]).time(0.46).weather('clear').hideHero([60, 52]);
      d.camAt([14, 26], 1.75).camTo([16, 26.5], 7, 1.85, 'slow');
    },
  },
  s1_village: {
    dur: 7,
    seed: 15,
    note: "Millbrook square in the morning: the well, the herald, Tobin's stall, the smithy",
    setup(d) {
      d.go('millbrook', [39, 50]).time(0.38).weather('clear').hideHero([60, 52]);
      d.camAt([35, 25], 1.5).camTo([39, 24], 7, 1.5, 'slow');
    },
  },
  s1_nan: {
    dur: 6,
    seed: 16,
    note: "Nan Merrow outside her cottage, the queen's old nurse, in the late afternoon",
    setup(d) {
      d.go('millbrook', [39, 50]).time(0.64).weather('clear').hideHero([60, 52]);
      d.camAt([6, 27.5], 2.6).camTo(null, 6, 3, 'slow');
    },
  },
  s1_thornwall_dusk: {
    dur: 8,
    seed: 17,
    note: 'the black thorn wall across the north road at dusk, panning along it',
    setup(d) {
      d.go('millbrook', [39, 50]).time(0.86).weather('clear').hideHero([60, 52]).darkness(0.8);
      d.camAt([37, 4.2], 1.7).camTo([42, 4.2], 8, 1.8, 'slow');
    },
  },
  s1_barrow_nightfall: {
    dur: 8,
    seed: 18,
    note: 'time-lapse: the sun goes down over the old barrow and the dead climb out of it',
    setup(d) {
      d.go('greenmarch', [27, 31]).time(0.74, 22).weather('clear').hideHero([30, 50]).darkness(0.75);
      d.camAt([8, 9], 1.4).camTo([8.5, 9.5], 8, 1.6, 'slow');
    },
  },
  s1_skeleton_rise: {
    dur: 6,
    settle: 0.5,
    seed: 19,
    note: 'close: a skeleton heaving itself out of the ground, slow motion',
    setup(d) {
      d.go('greenmarch', [27, 31]).time(0.93).weather('clear').hideHero([30, 50]).darkness(0.7);
      d.clearEnemies();
      d.speed = 0.45;
      d.camAt([9, 11], 3).camTo(null, 6, 3.4, 'slow');
      d.at(0.3, x => x.spawn('skeleton', [9, 11], { rise: true, face: -1 }));
      d.at(1.6, x => x.spawn('skeleton', [10, 10], { rise: true, sx: 10 }));
    },
  },
  s1_storm_square: {
    dur: 7,
    seed: 20,
    note: 'a storm over Millbrook square at night, lightning',
    setup(d) {
      d.go('millbrook', [39, 50]).time(0.9).weather('storm').hideHero([60, 52]).darkness(0.6);
      d.camAt([37, 26], 1.3).camTo([38, 27], 7, 1.4, 'slow');
      d.at(1.2, x => x.strike('near'));
      d.at(4.6, x => x.strike('mid'));
    },
  },
  s1_hounds: {
    dur: 6,
    settle: 0.5,
    seed: 21,
    note: "the old King's bone hounds running through the wilted fields at night",
    setup(d) {
      d.go('millbrook', [39, 50]).time(0.92).weather('rain').darkness(0.6).hideHero([40, 32]);
      d.clearEnemies();
      const pack = [
        [54, 44],
        [56, 42],
        [55, 46],
        [57, 45],
        [58, 43],
      ] as [number, number][];
      const hounds = pack.map(at => d.spawn('bonehound', at));
      d.camFollow(hounds[0], 0.6, 2.2, -50, -10);
      d.at(0.2, () => {
        for (const h of hounds) h.aggro = true;
      });
    },
  },
  s1_churchyard: {
    dur: 8,
    settle: 0.5,
    seed: 22,
    note: 'the churchyard in the storm: the earth heaves, the dead climb out between the graves',
    setup(d) {
      d.go('millbrook', [39, 50]).time(0.94).weather('storm').hideHero([40, 30]).darkness(0.6);
      d.clearEnemies();
      d.camAt([52, 11], 1.4).camTo([53, 11.5], 8, 1.6, 'slow');
      const graves: [number, number][] = [
        [51, 9],
        [55, 9],
        [53, 12],
        [57, 12],
        [51, 13],
      ];
      graves.forEach((g, i) => d.at(0.4 + i * 0.9, x => x.spawn('skeleton', g, { rise: true })));
      d.at(2.2, x => x.strike('near'));
      d.at(6.4, x => x.strike('mid'));
    },
  },
  s1_party_road: {
    dur: 8,
    seed: 23,
    note: 'the four heroes on the north road at golden hour',
    setup(d) {
      d.go('greenmarch', [46, 26]).time(0.64).weather('clear');
      const p = party(d, [46, 26]);
      d.playerLight = false;
      march(d, p, [46, 12]);
      d.camFollow(p[0], 0.5, 3, 10, -10);
    },
  },
  s1_ride: {
    dur: 6,
    seed: 24,
    note: 'the knight on horseback along the lakeside road at sunset',
    setup(d) {
      d.go('greenmarch', [40, 31]).time(0.71).weather('clear');
      d.dress(d.hero, KNIGHT);
      d.playerLight = false;
      d.hero.mounted = true;
      d.walk(d.hero, [60, 30]);
      d.camFollow(d.hero, 0.3, 2.8);
    },
  },
  s1_charge: {
    dur: 6,
    settle: 0.3,
    seed: 25,
    note: 'the knight charges into the goblin camp',
    setup(d) {
      d.go('greenmarch', [50, 22]).time(0.56).weather('clear');
      d.dress(d.hero, { ...KNIGHT, at: [51, 21] });
      d.playerLight = false;
      d.camAt([55, 19.5], 2.6).camFollow(d.hero, 0.35, 2.6, 20, 0);
      d.at(0.6, x => x.brain(x.hero, { spells: WARRIOR_FIGHT }));
    },
  },
  s1_volley: {
    dur: 6,
    settle: 0.3,
    seed: 26,
    note: 'arrows rain on the goblins: the ranger looses a volley',
    setup(d) {
      d.go('greenmarch', [50, 22]).time(0.56).weather('clear').hideHero([40, 40]);
      const r = d.addHero({ ...RANGER, at: [53, 23] });
      d.camAt([56.5, 21], 2.2);
      d.at(0.2, x => x.brain(r, { spells: ['volley', 'pierce', 'aimedshot', 'quickshot'], reach: 150 }));
    },
  },
  s1_fight_night: {
    dur: 9,
    settle: 0.5,
    seed: 27,
    note: 'the party holds the fields at night against the dead and the hounds',
    setup(d) {
      d.go('millbrook', [48, 30]).time(0.95).weather('clear').darkness(0.55);
      d.clearEnemies();
      const p = party(d, [49, 31]);
      d.build('campfire', [50, 33]);
      for (const [at, k] of [
        [[52, 37], 'skeleton'],
        [[47, 38], 'skeleton'],
        [[55, 35], 'bonehound'],
        [[53, 39], 'bonehound'],
        [[45, 36], 'skeleton'],
        [[50, 39], 'bonehound'],
      ] as [[number, number], 'skeleton' | 'bonehound'][])
        d.spawn(k, at);
      d.at(0.4, x => brawl(x, p));
      d.camFollow(p[0], 0.6, 2.2, 0, 10);
    },
  },
  s1_campfire_night: {
    dur: 8,
    seed: 28,
    note: 'the party round a campfire at night; the dark beyond the firelight moves',
    setup(d) {
      d.go('greenmarch', [33, 40]).time(0.97).weather('clear').darkness(0.85);
      d.clearEnemies();
      const p = party(d, [33, 40]);
      d.build('campfire', [34, 41]);
      // round the fire, facing it
      const seats: [number, number, 1 | -1][] = [
        [33, 40, 1],
        [35, 40, -1],
        [33, 42, 1],
        [35, 42, -1],
      ];
      p.forEach((h, i) => {
        h.placeAt([seats[i][0], seats[i][1]]);
        h.face = seats[i][2];
      });
      d.camAt([34, 41], 2.6).camTo([34, 41.2], 8, 3, 'slow');
      d.at(3, x => {
        for (const at of [
          [37, 38],
          [31, 44],
          [37, 44],
        ] as [number, number][])
          x.spawn('skeleton', at, { rise: true });
      });
    },
  },
  s1_bell_toll: {
    dur: 9,
    settle: 0.5,
    seed: 29,
    note: 'the belfry: the Bell-Ringer tolls, the ring of sound spreads, the knight jumps it',
    setup(d) {
      d.go('belltower', [10, 12]);
      d.dress(d.hero, { ...KNIGHT, at: [10, 12] });
      const boss = d.region.enemies.find(e => e.kind === 'bellringer');
      if (boss) d.region.hurtEnemy(boss, Math.round(boss.hpMax * 0.4), 'aa', d.hero);
      d.brain(d.hero, { spells: ['mortal', 'thrust', 'slash', 'rend', 'deathblow'] });
      d.each(x => {
        // jump the rings as they come
        if (x.hero.airborne) return;
        for (const ring of x.region.hazards) {
          const r = Math.hypot(x.hero.x - ring.x, x.hero.y - ring.y);
          if (ring.r > 0 && r - ring.r > 0 && r - ring.r < 26) x.hero.jump();
        }
      });
      d.camAt([10, 9], 1.6).camTo([10, 9.5], 9, 1.75, 'slow');
    },
  },
  s1_final_thorns: {
    dur: 8,
    seed: 30,
    note: 'the party before the thorn wall at night in the storm; lightning',
    setup(d) {
      d.go('millbrook', [37, 6]).time(0.96).weather('storm').darkness(0.5);
      d.clearEnemies();
      const p = party(d, [37, 6]);
      for (const h of p) h.face = 1;
      d.camAt([37.5, 5], 2.4).camTo([37.5, 4.6], 8, 2.7, 'slow');
      d.at(2.5, x => x.strike('near'));
      d.at(6.2, x => x.strike('near'));
    },
  },
  s1_hero_portrait: {
    dur: 6,
    seed: 31,
    note: 'close portrait: the knight in the rain, lightning',
    setup(d) {
      d.go('millbrook', [46, 16]).time(0.95).weather('rain').darkness(0.55);
      d.clearEnemies();
      d.dress(d.hero, { ...KNIGHT, at: [46, 16] });
      d.hero.face = -1;
      d.camAt([46, 15.4], 4.2).camTo([46, 15.5], 6, 4.7, 'slow');
      d.at(3, x => x.strike('mid'));
    },
  },
};

export { ARCHER_FIGHT };
