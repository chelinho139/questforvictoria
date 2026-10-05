import type { Shot } from './types';
import { KNIGHT, party, brawl } from './kit';

/**
 * Trailer 3, "Every Bell": a slow teaser in the dark, no interface. The bell that tolls
 * backwards, the grey postman and his letter, Nan, the proclamation and the hand that signed
 * it, the Bell-Ringer; then the fighting in flashes, and the line that hints at who is behind it.
 */
export const MYSTERY: Record<string, Shot> = {
  m_bell_tower: {
    dur: 9,
    seed: 71,
    note: "the chapel's bell tower at night in the rain, pushing slowly in",
    setup(d) {
      d.go('millbrook', [39, 50]).time(0.96).weather('rain').hideHero([30, 40]).darkness(0.65);
      d.clearEnemies();
      d.camAt([45, 10], 1.6).camTo([45, 9.5], 9, 2.1, 'slow');
      d.at(6.5, x => x.strike('far'));
    },
  },
  m_churchyard_slow: {
    dur: 8,
    settle: 0.3,
    seed: 72,
    note: 'slow motion: the dead heave up between the graves; lightning',
    setup(d) {
      d.go('millbrook', [39, 50]).time(0.97).weather('storm').hideHero([30, 40]).darkness(0.6);
      d.clearEnemies();
      d.speed = 0.4;
      d.camAt([53, 11], 2.4).camTo([53.5, 11.5], 8, 2.7, 'slow');
      const graves: [number, number][] = [
        [53, 12],
        [55, 10],
        [51, 10],
      ];
      graves.forEach((g, i) => d.at(0.2 + i * 1.6, x => x.spawn('skeleton', g, { rise: true })));
      d.at(3.1, x => x.strike('near'));
    },
  },
  m_postman: {
    dur: 10,
    seed: 73,
    note: 'the grey postman walking his round of the lanes, his faint cold light',
    setup(d) {
      d.go('millbrook', [39, 50]).time(0.98).weather('rain').hideHero([56, 52]).darkness(0.7);
      d.clearEnemies();
      const w = d.region.wanderers[0];
      if (w) {
        w.x = 31 * 32 + 16;
        w.y = 33 * 32 + 16;
        w.i = 8;
        w.alpha = 0.85;
        w.goneT = 0;
        d.camFollow(w, 1.2, 2.6, 0, -6);
      }
    },
  },
  m_letter: {
    dur: 7,
    seed: 74,
    note: 'a letter on a doorstep at night, sealed, seven years old',
    setup(d) {
      d.go('millbrook', [39, 50]).time(0.99).weather('rain').hideHero([56, 52]).darkness(0.6);
      d.clearEnemies();
      d.camAt([26, 26.6], 3.6).camTo([26, 26.8], 7, 4.2, 'slow');
    },
  },
  m_proclamation: {
    dur: 7,
    seed: 75,
    note: "the Hollow King's proclamation on its board by the camp, at dusk",
    setup(d) {
      d.go('greenmarch', [27, 31]).time(0.96).weather('rain').hideHero([10, 55]).darkness(0.6);
      d.camAt([32, 34.6], 3.6).camTo([32, 34.8], 7, 4.2, 'slow');
    },
  },
  m_nan_night: {
    dur: 7,
    seed: 76,
    note: "Nan outside her cottage at night, the window lit behind her",
    setup(d) {
      d.go('millbrook', [39, 50]).time(0.93).weather('rain').hideHero([56, 52]).darkness(0.55);
      d.clearEnemies();
      d.camAt([6, 27.4], 3).camTo([6, 27.6], 7, 3.5, 'slow');
    },
  },
  m_ringer: {
    dur: 8,
    seed: 77,
    note: 'the Bell-Ringer under the cracked bell, alone, hauling a rope that is not there',
    setup(d) {
      d.go('belltower', [10, 28]).hideHero([10, 28]);
      d.camAt([10, 8], 2.4).camTo([10, 7.8], 8, 2.9, 'slow');
    },
  },
  m_thorns_storm: {
    dur: 8,
    seed: 78,
    note: 'the thorn wall at night in the storm; lightning shows it',
    setup(d) {
      d.go('millbrook', [39, 50]).time(0.97).weather('storm').hideHero([56, 52]).darkness(0.45);
      d.clearEnemies();
      d.camAt([36, 4.2], 2).camTo([41, 4.2], 8, 2.1, 'slow');
      d.at(1.8, x => x.strike('near'));
      d.at(5.6, x => x.strike('mid'));
    },
  },
  m_hollow_oak: {
    dur: 7,
    seed: 79,
    note: 'the hollow oak by the lake at dusk, where they left each other feathers',
    setup(d) {
      d.go('greenmarch', [27, 31]).time(0.66).weather('clear').hideHero([40, 55]);
      d.camAt([10.5, 21], 2.4).camTo([10.5, 21.3], 7, 2.8, 'slow');
    },
  },
  m_willow: {
    dur: 7,
    seed: 80,
    note: "the willow on the north shore at night, over the still water",
    setup(d) {
      d.go('greenmarch', [27, 31]).time(0.02).weather('clear').hideHero([40, 55]).darkness(0.6);
      d.clearEnemies();
      d.camAt([28, 9], 2).camTo([28.5, 9.5], 7, 2.3, 'slow');
    },
  },
  m_lake_rain: {
    dur: 8,
    seed: 81,
    note: 'Lake Ellory at night in the rain, wide',
    setup(d) {
      d.go('greenmarch', [27, 31]).time(0.95).weather('rain').hideHero([40, 55]).darkness(0.55);
      d.clearEnemies();
      d.camAt([24, 20], 1).camTo([32, 19], 8, 1.1, 'slow');
    },
  },
  m_fight_ringer: {
    dur: 5,
    settle: 0.3,
    seed: 82,
    note: 'flash: the knight against the Bell-Ringer, close',
    setup(d) {
      d.go('belltower', [10, 11]);
      d.dress(d.hero, { ...KNIGHT, at: [10, 10] });
      const boss = d.region.enemies.find(e => e.kind === 'bellringer');
      if (boss) {
        d.region.hurtEnemy(boss, Math.round(boss.hpMax * 0.4), 'aa', d.hero);
        boss.aggro = true;
      }
      d.brain(d.hero, { spells: ['mortal', 'deathblow', 'thrust', 'slash'] });
      d.camFollow(d.hero, 0.2, 2.8, 0, -14);
    },
  },
  m_fight_whirl: {
    dur: 5,
    settle: 0.3,
    seed: 83,
    note: 'flash: Whirlwind among the dead in the rain, close',
    setup(d) {
      d.go('millbrook', [52, 18]).time(0.97).weather('storm').darkness(0.55);
      d.clearEnemies();
      d.dress(d.hero, { ...KNIGHT, at: [52, 18] });
      for (const [c, r] of [
        [53, 17],
        [51, 19],
        [53, 19],
        [51, 17],
      ] as [number, number][])
        d.spawn('skeleton', [c, r]);
      d.brain(d.hero, { spells: ['whirlwind', 'mortal', 'thrust'] });
      d.camAt(d.hero, 3);
      d.at(2, x => x.strike('near'));
    },
  },
  m_fight_hounds: {
    dur: 5,
    settle: 0.3,
    seed: 84,
    note: 'flash: the party in the firelight, hounds leaping out of the dark',
    setup(d) {
      d.go('millbrook', [47, 31]).time(0.97).weather('rain').darkness(0.6);
      d.clearEnemies();
      const p = party(d, [47, 31]);
      d.build('campfire', [48, 32]);
      for (const at of [
        [51, 36],
        [52, 34],
        [50, 37],
      ] as [number, number][])
        d.spawn('bonehound', at).aggro = true;
      d.at(0.2, x => brawl(x, p));
      d.camAt([48.5, 32.5], 2.4);
    },
  },
  m_party_chapel: {
    dur: 7,
    seed: 85,
    note: 'the four at the chapel door at night, looking up at the tower',
    setup(d) {
      d.go('millbrook', [46, 16]).time(0.97).weather('rain').darkness(0.55);
      d.clearEnemies();
      const p = party(d, [46, 16]);
      for (const h of p) h.face = -1;
      d.camAt([46, 14.5], 2.4).camTo([46, 14], 7, 2.8, 'slow');
      d.at(4.5, x => x.strike('far'));
    },
  },
};
