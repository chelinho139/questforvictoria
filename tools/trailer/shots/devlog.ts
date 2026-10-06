import type { Shot, Director } from './types';
import { KNIGHT, KNIGHT2, party, party2, brawl, march } from './kit';

/**
 * The cameras devlog: one world, three cameras. The isometric pixel art turning out to be real
 * 3D; the diorama turning, tilting and zooming; the point of view behind the hero and through
 * their eyes; one fight filmed in each view (for a split screen); night, rain and storm, fights
 * and both acts' places in 3D; switching views with V.
 *
 * yaw: which way the camera looks from (π/4 is the isometric view's angle; the point of view
 * looks toward -cos, -sin of it, so π/2 looks north up the map). pitch: how far above the ground.
 */
const ISO_YAW = Math.PI / 4;
const NORTH = Math.PI / 2;

/** The goblin camp fight, the same in every view (the split screen). */
function campFight(d: Director): void {
  d.go('greenmarch', [52, 22]).time(0.56).weather('clear');
  const p = party(d, [53, 21]);
  d.spawn('ogre', [60, 19]);
  d.spawn('goblin', [58, 22]);
  d.at(0.3, x => brawl(x, p));
}

export const DEVLOG: Record<string, Shot> = {
  // ---------- the reveal ----------
  dv_reveal: {
    dur: 10,
    seed: 301,
    note: 'Millbrook square in the isometric view; then the diorama takes over at the same angle and the world tilts and turns',
    setup(d) {
      d.go('millbrook', [35, 31]).time(0.58).weather('clear');
      d.dress(d.hero, { ...KNIGHT, at: [35, 31] });
      d.playerLight = false;
      d.walk(d.hero, [40, 25]);
      d.camGame();
      d.at(4.0, x => {
        x.view('diorama');
        x.cam3dTo({ yaw: ISO_YAW + 1.25, pitch: 0.42, zoom: 1.5 }, 5.6, 'inOut');
      });
    },
  },
  // ---------- the diorama ----------
  dv_dio_mill: {
    dur: 7,
    seed: 302,
    note: 'diorama: round the mill and its wheel as the knight crosses the bridge',
    setup(d) {
      d.go('millbrook', [24, 30]).time(0.62).weather('clear');
      d.dress(d.hero, { ...KNIGHT, at: [24, 30] });
      d.camGame();
      d.view('diorama');
      d.cam3d({ yaw: ISO_YAW - 0.9, pitch: 0.55, zoom: 1.1 });
      d.walk(d.hero, [15, 29]);
      d.at(0, x => x.cam3dTo({ yaw: ISO_YAW + 1.4, pitch: 0.32, zoom: 1.8 }, 7, 'inOut'));
    },
  },
  dv_dio_kilnholt: {
    dur: 7,
    seed: 303,
    note: 'diorama: Kilnholt from straight above, coming down to the ground as it turns',
    setup(d) {
      d.go('weepwood', [57, 27]).time(0.66).weather('clear').hideHero([57, 27]);
      d.camAt([57, 24]);
      d.view('diorama');
      d.cam3d({ yaw: ISO_YAW, pitch: 1.4, zoom: 0.75 });
      d.at(0, x => x.cam3dTo({ yaw: ISO_YAW + 1.7, pitch: 0.28, zoom: 1.45 }, 7, 'inOut'));
    },
  },
  // ---------- the point of view ----------
  dv_pov_road: {
    dur: 7,
    seed: 304,
    note: 'point of view: behind the knight, the party walking the north road out of the Greenmarch',
    setup(d) {
      d.go('greenmarch', [46, 31]).time(0.62).weather('clear');
      d.clearEnemies();
      const p = party(d, [46, 31]);
      d.camGame();
      d.view('pov');
      d.cam3d({ yaw: NORTH, pitch: 0.26, dist: 84 });
      d.at(0.2, x => march(x, p, [46, 12]));
      d.at(0, x => x.cam3dTo({ pitch: 0.2, dist: 66 }, 7, 'inOut'));
    },
  },
  dv_pov_ride: {
    dur: 7,
    seed: 305,
    note: "point of view: through the knight's eyes on horseback, down the King's Ride",
    setup(d) {
      d.go('kingschase', [16, 34]).time(0.6).weather('clear');
      d.clearEnemies();
      d.dress(d.hero, { ...KNIGHT2, at: [16, 34] });
      d.hero.mounted = true;
      d.camGame();
      d.view('pov');
      d.cam3d({ yaw: Math.PI, pitch: 0.05, dist: 0 });
      d.walk(d.hero, [56, 34]);
    },
  },
  // ---------- one fight, three cameras ----------
  dv_tri_iso: {
    dur: 9,
    seed: 306,
    note: 'split screen 1/3: the goblin camp fight, isometric',
    setup(d) {
      campFight(d);
      d.camAt([56.5, 20.5], 1.4);
    },
  },
  dv_tri_dio: {
    dur: 9,
    seed: 306,
    note: 'split screen 2/3: the same fight, diorama',
    setup(d) {
      campFight(d);
      d.camAt([56.5, 20.5]);
      d.view('diorama', true);
      d.cam3d({ yaw: ISO_YAW + 0.7, pitch: 0.5, zoom: 1.5 });
      d.at(0, x => x.cam3dTo({ yaw: ISO_YAW + 1.3 }, 9, 'linear'));
    },
  },
  dv_tri_pov: {
    dur: 9,
    seed: 306,
    note: 'split screen 3/3: the same fight, behind the knight',
    setup(d) {
      campFight(d);
      d.camGame();
      d.view('pov', true);
      d.cam3d({ yaw: ISO_YAW + 0.35, pitch: 0.4, dist: 100 });
    },
  },
  // ---------- night ----------
  dv_night_dio: {
    dur: 7,
    seed: 307,
    note: 'diorama at night: Millbrook square, its windows lit',
    setup(d) {
      d.go('millbrook', [39, 50]).time(0.94).weather('clear').hideHero([37, 27]).darkness(0.6);
      d.clearEnemies();
      d.camAt([37, 26]);
      d.view('diorama');
      d.cam3d({ yaw: ISO_YAW - 0.5, pitch: 0.6, zoom: 1.2 });
      d.at(0, x => x.cam3dTo({ yaw: ISO_YAW + 0.9, pitch: 0.4, zoom: 1.5 }, 7, 'inOut'));
    },
  },
  dv_night_pov: {
    dur: 7,
    seed: 308,
    note: "point of view at night: behind the knight into Kilnholt's ring of kilns",
    setup(d) {
      d.go('weepwood', [57, 33]).time(0.95).weather('clear').darkness(0.7);
      d.clearEnemies();
      d.dress(d.hero, { ...KNIGHT2, at: [57, 33] });
      d.camGame();
      d.view('pov');
      d.cam3d({ yaw: NORTH, pitch: 0.2, dist: 60 });
      d.walk(d.hero, [58, 25]);
    },
  },
  // ---------- weather ----------
  dv_rain_dio: {
    dur: 7,
    seed: 309,
    note: 'diorama in the rain: the chapel and its bell tower, turning',
    setup(d) {
      d.go('millbrook', [39, 50]).time(0.6).weather('rain').hideHero([30, 40]);
      d.clearEnemies();
      d.camAt([46, 11]);
      d.view('diorama');
      d.cam3d({ yaw: ISO_YAW - 0.7, pitch: 0.42, zoom: 1.2 });
      d.at(0, x => x.cam3dTo({ yaw: ISO_YAW + 0.6, pitch: 0.3, zoom: 1.4 }, 7, 'inOut'));
    },
  },
  dv_storm_pov: {
    dur: 7,
    seed: 310,
    note: 'point of view in a storm: up the north road toward the thorn wall, lightning on the horizon',
    setup(d) {
      d.go('millbrook', [39, 20]).time(0.8).weather('storm').darkness(0.6);
      d.clearEnemies();
      d.dress(d.hero, { ...KNIGHT, at: [39, 20] });
      d.camGame();
      d.view('pov');
      d.cam3d({ yaw: NORTH, pitch: 0.16, dist: 50 });
      d.walk(d.hero, [39, 9]);
      d.at(0.8, x => x.strike('far'));
      d.at(2.6, x => x.strike('mid'));
      d.at(4.6, x => x.strike('near'));
    },
  },
  // ---------- fights ----------
  dv_fight_dio: {
    dur: 7,
    seed: 311,
    settle: 0.3,
    note: 'diorama: the fight with Sir Garrick on the Weeping Bridge',
    setup(d) {
      d.go('weepingbridge', [30, 24]).weather('clear');
      const p = party2(d, [30, 24]);
      const g = d.region.enemies.find(e => e.kind === 'garrick');
      if (g) {
        g.hpMax = g.hp = 12000;
        g.aggro = true;
      }
      d.at(0.1, x => brawl(x, p));
      d.camAt([30, 21]);
      d.view('diorama');
      d.cam3d({ yaw: ISO_YAW + 1.0, pitch: 0.5, zoom: 1.6 });
      d.at(0, x => x.cam3dTo({ yaw: ISO_YAW + 1.8, pitch: 0.36 }, 7, 'inOut'));
    },
  },
  dv_fight_pov: {
    dur: 7,
    seed: 312,
    settle: 0.3,
    note: 'point of view: wolves and thornbacks close round the knight; Whirlwind',
    setup(d) {
      d.go('weepwood', [66, 47]).time(0.6).weather('clear');
      d.dress(d.hero, { ...KNIGHT2, at: [66, 47] });
      for (const at of [
        [63, 45],
        [69, 50],
        [64, 50],
      ] as [number, number][])
        d.spawn('thornback', at);
      d.at(0.2, x => x.brain(x.hero, { spells: ['whirlwind', 'warcry', 'mortal', 'thrust', 'slash'] }));
      d.camGame();
      d.view('pov');
      d.cam3d({ yaw: ISO_YAW, pitch: 0.34, dist: 64 });
      d.at(0, x => x.cam3dTo({ yaw: ISO_YAW + 1.2 }, 7, 'linear'));
    },
  },
  // ---------- everywhere ----------
  dv_bridge_pov: {
    dur: 7,
    seed: 313,
    note: "point of view: through the knight's eyes up to the Weeping Bridge and the knight who guards it",
    setup(d) {
      d.go('weepingbridge', [30, 44]).weather('clear');
      d.clearEnemies();
      d.spawn('garrick', [30, 19], { face: 1 });
      d.sim.cheats.freezeEnemies = true;
      d.dress(d.hero, { ...KNIGHT2, at: [30, 44] });
      d.camGame();
      d.view('pov');
      d.cam3d({ yaw: NORTH, pitch: 0.06, dist: 0 });
      d.walk(d.hero, [30, 24]);
    },
  },
  dv_tower_dio: {
    dur: 7,
    seed: 314,
    settle: 0.3,
    note: "diorama: inside the bell tower, the Bell-Ringer's belfry",
    setup(d) {
      d.go('belltower', [10, 12]);
      const p = party(d, [10, 12]);
      const b = d.region.enemies.find(e => e.kind === 'bellringer');
      if (b) {
        b.hpMax = b.hp = 9000;
        d.region.hurtEnemy(b, 3400, 'aa', d.hero);
        b.aggro = true;
      }
      d.at(0.1, x => brawl(x, p));
      d.camAt([10, 9]);
      d.view('diorama');
      d.cam3d({ yaw: ISO_YAW - 0.4, pitch: 0.7, zoom: 1.5 });
      d.at(0, x => x.cam3dTo({ yaw: ISO_YAW + 0.6, pitch: 0.5 }, 7, 'inOut'));
    },
  },
  dv_camp_dio: {
    dur: 7,
    seed: 315,
    note: "diorama: the goblin outriders' camp in the King's Chase, tents and wolf pens",
    setup(d) {
      d.go('kingschase', [40, 40]).time(0.55).weather('clear').hideHero([40, 40]);
      d.camAt([60, 22]);
      d.view('diorama');
      d.cam3d({ yaw: ISO_YAW + 1.3, pitch: 0.55, zoom: 1.1 });
      d.at(0, x => x.cam3dTo({ yaw: ISO_YAW - 0.2, pitch: 0.38, zoom: 1.4 }, 7, 'inOut'));
    },
  },
  // ---------- switching ----------
  dv_switch: {
    dur: 10,
    clean: false,
    seed: 316,
    note: 'UI: the knight in Millbrook square; V switches the view: diorama, point of view, back to isometric',
    setup(d) {
      d.go('millbrook', [37, 29]).time(0.6).weather('clear');
      d.dress(d.hero, { ...KNIGHT, at: [37, 29] });
      d.playerLight = false;
      d.camGame();
      d.hero.face = -1;
      d.at(2.2, x => x.view('diorama'));
      d.at(4.7, x => {
        x.view('pov');
        x.cam3d({ yaw: ISO_YAW + 0.3, pitch: 0.22, dist: 70 });
      });
      d.at(7.3, x => x.view('iso'));
    },
  },
};

export { KNIGHT2 };
