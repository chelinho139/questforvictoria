import type { Shot, Director } from './types';
import type { Hero } from '../../../src/sim/Hero';
import type { Enemy } from '../../../src/sim/types';
import { KNIGHT2, RANGER2, party2, brawl, WARRIOR_FIGHT, ARCHER_FIGHT } from './kit';

/**
 * Act II for "Hold the Night": the Weepwood, Kilnholt and its ring of kilns, the King's Chase,
 * Heron Reach and the ford, the Lisle Barrow, the Weeping Bridge; wolves, spiders, the Tower Guard,
 * the outriders, Wren at the heroes' side; the Brood Mother, Bonespine, the Thane, Sir Garrick.
 */

/** A few quests from Act II on the tracker (the HUD shows them). */
function act2Quests(d: Director): void {
  for (const q of ['ring_of_kilns', 'wardens_trail', 'knight_carried']) d.sim.acceptQuest(q);
}

/** The first creature of a kind in the region. */
function boss(d: Director, kind: string): Enemy | undefined {
  return d.region.enemies.find(e => e.kind === kind);
}

/** Jump any ring of sound or shockwave as it reaches them. */
function jumpRings(d: Director, heroes: Hero[]): void {
  d.each(x => {
    for (const h of heroes) {
      if (h.airborne) continue;
      for (const ring of x.region.hazards) {
        const r = Math.hypot(h.x - ring.x, h.y - ring.y);
        if (ring.r > 0 && r - ring.r > 0 && r - ring.r < 26) h.jump();
      }
    }
  });
}

export const ACT2: Record<string, Shot> = {
  // ---------- glimpses ----------
  a2_dell: {
    dur: 7,
    seed: 201,
    note: "the spider dell in the Weepwood at dusk: webbed willows, the dark under them",
    setup(d) {
      d.go('weepwood', [40, 60]).time(0.8).weather('clear').hideHero([76, 62]).darkness(0.6);
      d.camAt([12, 33], 1.4).camTo([10, 32], 7, 1.6, 'slow');
    },
  },
  a2_hollow: {
    dur: 7,
    seed: 202,
    note: 'the Keening Hollow at night: mourners at the mounds, the Mourning Lights drifting',
    setup(d) {
      d.go('weepwood', [40, 60]).time(0.95).weather('clear').hideHero([76, 62]).darkness(0.4);
      d.camAt([14, 13], 1.8).camTo([13.5, 12.5], 7, 2, 'slow');
    },
  },
  a2_bridge_wide: {
    dur: 7,
    seed: 203,
    note: 'the Weeping Bridge under its dusk: the two great willows, the knight on the bridge',
    setup(d) {
      d.go('weepingbridge', [30, 50]).weather('clear').hideHero([5, 50]);
      d.camAt([30, 24], 1.5).camTo([30, 21], 7, 1.7, 'slow');
    },
  },
  // ---------- the interface in view ----------
  a2_kilnholt_dusk: {
    dur: 7,
    clean: false,
    seed: 204,
    note: 'UI: Kilnholt inside its ring of kilns as the day goes and the kilns glow',
    setup(d) {
      d.go('weepwood', [57, 27]).time(0.68, 22).weather('clear').darkness(0.7);
      d.dress(d.hero, { ...KNIGHT2, at: [57, 27] });
      act2Quests(d);
      d.camAt([57, 24], 1.3);
    },
  },
  a2_warrior_ford: {
    dur: 7,
    clean: false,
    settle: 0.3,
    seed: 205,
    note: 'UI: the knight at the ford against the Tower Guard: shields up, Shield Bash, crossbow bolts',
    setup(d) {
      d.go('heronreach', [38, 39]).time(0.55).weather('clear');
      d.dress(d.hero, { ...KNIGHT2, at: [38, 39] });
      act2Quests(d);
      d.playerLight = false;
      d.camFollow(d.hero, 0.4, 1.9, 30, -20);
      d.at(0.3, x => x.brain(x.hero, { spells: ['charge', 'shieldbash', 'whirlwind', 'mortal', 'sunder', 'thrust', 'slash'] }));
    },
  },
  a2_wolves: {
    dur: 7,
    clean: false,
    settle: 0.3,
    seed: 206,
    note: 'UI: a wolf pack and thornbacks close round the knight in the open wood; Whirlwind',
    setup(d) {
      d.go('weepwood', [66, 47]).time(0.6).weather('clear');
      d.dress(d.hero, { ...KNIGHT2, at: [66, 47] });
      act2Quests(d);
      d.playerLight = false;
      for (const at of [
        [63, 45],
        [69, 50],
        [64, 50],
      ] as [number, number][])
        d.spawn('thornback', at);
      d.camAt([66.5, 47], 1.9);
      d.at(0.2, x => x.brain(x.hero, { spells: ['whirlwind', 'warcry', 'mortal', 'thrust', 'slash'] }));
    },
  },
  a2_spider: {
    dur: 7,
    clean: false,
    seed: 207,
    note: 'UI: walking under the webbed willows a spider drops out of the canopy and webs the knight',
    setup(d) {
      d.go('weepwood', [20, 33]).time(0.62).weather('clear');
      d.dress(d.hero, { ...KNIGHT2, at: [20, 33] });
      act2Quests(d);
      d.playerLight = false;
      d.walk(d.hero, [13, 32]);
      d.camFollow(d.hero, 0.5, 2.1, -20, -10);
      d.at(2.2, x => x.brain(x.hero, { spells: ['mortal', 'thrust', 'slash', 'rend'] }));
    },
  },
  a2_outriders: {
    dur: 7,
    clean: false,
    settle: 0.3,
    seed: 208,
    note: "UI: the ranger against the goblin outriders' camp: wolf-riders, trappers, a volley",
    setup(d) {
      d.go('kingschase', [52, 27]).time(0.56).weather('clear');
      d.dress(d.hero, { ...RANGER2, at: [52, 27] });
      act2Quests(d);
      d.playerLight = false;
      d.camAt([56.5, 24], 1.8);
      d.at(0.2, x => x.brain(x.hero, { spells: ['volley', 'pierce', 'beartrap', 'deadeye', 'aimedshot', 'quickshot'], reach: 160 }));
    },
  },
  a2_wren: {
    dur: 7,
    clean: false,
    settle: 1.5,
    seed: 209,
    note: 'UI: Wren at the knight\'s side, shooting the wolves that come for him',
    setup(d) {
      d.go('weepwood', [51, 55]).time(0.6).weather('clear');
      d.flag('wren_follows');
      d.dress(d.hero, { ...KNIGHT2, at: [51, 55] });
      act2Quests(d);
      d.playerLight = false;
      d.camAt([52.5, 53], 2);
      d.at(0.1, x => x.brain(x.hero, { spells: ['mortal', 'thrust', 'slash', 'whirlwind'] }));
    },
  },
  a2_ride: {
    dur: 7,
    clean: false,
    seed: 210,
    note: "UI: on horseback along the King's Ride, past the old hunting lodge",
    setup(d) {
      d.go('kingschase', [18, 34]).time(0.64).weather('clear');
      d.clearEnemies();
      d.dress(d.hero, { ...KNIGHT2, at: [18, 34] });
      act2Quests(d);
      d.playerLight = false;
      d.hero.mounted = true;
      d.walk(d.hero, [52, 34]);
      d.camFollow(d.hero, 0.35, 1.6, 0, -40);
    },
  },
  a2_coop_kilns: {
    dur: 8,
    clean: false,
    settle: 0.5,
    seed: 211,
    note: 'UI: four friends hold the ring of kilns through the night; the dead and the Smotherers come for the fires',
    setup(d) {
      d.go('weepwood', [56, 27]).time(0.9).weather('clear').darkness(0.6);
      d.clearEnemies();
      const p = party2(d, [55, 27]);
      act2Quests(d);
      for (const [k, at] of [
        ['smotherer', [49, 31]],
        ['smotherer', [62, 32]],
        ['skeleton', [53, 33]],
        ['skeleton', [60, 34]],
        ['smotherer', [47, 25]],
      ] as ['smotherer' | 'skeleton', [number, number]][])
        d.spawn(k, at, { rise: k === 'skeleton' });
      d.at(0.3, x => brawl(x, p));
      d.camFollow(p[0], 0.7, 1.7, 0, 10);
    },
  },
  a2_broodmother: {
    dur: 8,
    clean: false,
    settle: 0.5,
    seed: 212,
    note: 'UI: the Brood Mother in the spider dell: she drops, sprays web, lays her egg sacs',
    setup(d) {
      d.go('weepwood', [12, 32]).time(0.62).weather('clear');
      const p = party2(d, [12, 32]);
      act2Quests(d);
      d.playerLight = false;
      const b = boss(d, 'broodmother');
      if (b) {
        b.hpMax = b.hp = 9000;
        b.aggro = true;
      }
      d.at(0.2, x => brawl(x, p));
      if (b) d.camFollow(b, 0.6, 1.9, 30, 30);
    },
  },
  a2_halt_scene: {
    dur: 7,
    clean: false,
    settle: 0.5,
    seed: 213,
    note: 'UI and the scene box: Sir Garrick on the Weeping Bridge. "Halt. No one crosses. By order of the King."',
    setup(d) {
      d.go('weepingbridge', [30, 27]).weather('clear');
      const p = party2(d, [29, 27]);
      act2Quests(d);
      d.flag('wren_follows');
      for (const h of p) h.face = -1;
      d.scene('bridge_halt');
      // the narrator's line, then the knight's (his voice, on film)
      d.at(0.6, x => x.sim.sceneNext());
      d.camAt([30, 20.9], 2).camTo([30, 20.6], 7, 2.2, 'slow');
    },
  },
  a2_garrick_fight: {
    dur: 8,
    clean: false,
    settle: 0.3,
    seed: 214,
    note: 'UI: the fight on the bridge, boss bar and all: Sir Garrick cuts, raises his shield, lunges',
    setup(d) {
      d.go('weepingbridge', [30, 24]).weather('clear');
      const p = party2(d, [30, 24]);
      act2Quests(d);
      const g = boss(d, 'garrick');
      if (g) {
        g.hpMax = g.hp = 12000;
        g.aggro = true;
      }
      d.at(0.1, x => brawl(x, p));
      d.camAt([30, 20.5], 1.9);
    },
  },
  a2_garrick_roots: {
    dur: 8,
    clean: false,
    settle: 0.3,
    seed: 215,
    note: "UI: black roots hold a hero and Garrick comes for them; Aldric's whistle stops him dead",
    setup(d) {
      d.go('weepingbridge', [30, 23]).weather('clear');
      const p = party2(d, [30, 23], { only: 2 });
      act2Quests(d);
      d.sim.addItem('aldric_whistle', 1);
      const g = boss(d, 'garrick');
      if (g) {
        g.hpMax = g.hp = 12000;
        // past two thirds: the roots
        d.region.hurtEnemy(g, 4300, 'aa', d.hero);
        g.aggro = true;
        g.castCd = 0.6;
      }
      // nothing that stuns him (a stun cuts the roots short)
      d.at(0.1, x => {
        x.brain(p[0], { spells: ['thrust', 'slash', 'rend', 'whirlwind'] });
        x.brain(p[1], { spells: ['aimedshot', 'barbed', 'quickshot'], reach: 150 });
      });
      // once the roots have someone, a moment later, the whistle
      let blown = false;
      let heldFor = 0;
      d.each((x, dt) => {
        if (blown) return;
        if (!p.some(h => h.heldBy === 'roots')) return;
        heldFor += dt;
        if (heldFor < 0.9) return;
        const i = x.sim.bag.findIndex(s => s?.id === 'aldric_whistle');
        if (i >= 0) {
          x.sim.useSlot(i);
          blown = true;
        }
      });
      d.camAt([30, 21], 2.2);
    },
  },
  a2_garrick_down: {
    dur: 7,
    clean: false,
    settle: 0.3,
    seed: 216,
    note: 'UI: the last blows on Sir Garrick, his shield gone into the river',
    setup(d) {
      d.go('weepingbridge', [30, 23]).weather('clear');
      const p = party2(d, [30, 23]);
      act2Quests(d);
      const g = boss(d, 'garrick');
      if (g) {
        g.hpMax = g.hp = 12000;
        d.region.hurtEnemy(g, 10600, 'aa', d.hero);
        g.aggro = true;
      }
      d.at(0.1, x => brawl(x, p));
      d.camAt([30, 21], 2);
    },
  },
  a2_kilnholt_hold: {
    dur: 8,
    clean: false,
    settle: 0.5,
    seed: 217,
    note: 'UI: night at Kilnholt, the kilns burning, the dead coming out of the dark for them',
    setup(d) {
      d.go('weepwood', [57, 26]).time(0.95).weather('clear').darkness(0.5);
      d.clearEnemies();
      d.flag('wren_follows');
      const p = party2(d, [57, 27], { only: 3 });
      act2Quests(d);
      for (const [k, at] of [
        ['skeleton', [54, 32]],
        ['skeleton', [61, 32]],
        ['smotherer', [50, 27]],
        ['skeleton', [57, 33]],
        ['smotherer', [65, 27]],
        ['skeleton', [53, 30]],
      ] as ['smotherer' | 'skeleton', [number, number]][])
        d.spawn(k, at, { rise: k === 'skeleton' });
      d.at(0.6, x => brawl(x, p));
      d.camAt([57.5, 28.5], 1.45).camTo([57.5, 28.8], 8, 1.55, 'slow');
    },
  },
  a2_bonespine: {
    dur: 7,
    clean: false,
    settle: 0.3,
    seed: 218,
    note: "UI: Bonespine, the old wolf, howls up his thornbacks and leaps at the one furthest off",
    setup(d) {
      d.go('kingschase', [14, 15]).time(0.6).weather('clear');
      const p = party2(d, [14, 14]);
      act2Quests(d);
      d.playerLight = false;
      const b = boss(d, 'bonespine');
      if (b) {
        b.hpMax = b.hp = 9000;
        b.aggro = true;
      }
      d.at(0.1, x => brawl(x, p));
      d.camAt([12, 12.5], 1.7);
    },
  },
  a2_thane: {
    dur: 8,
    clean: false,
    settle: 0.3,
    seed: 219,
    note: 'UI: the Thane under the Hill in the Lisle Barrow, stamping up his Sleepers',
    setup(d) {
      d.go('lislebarrow', [15, 14]);
      const p = party2(d, [14, 14]);
      act2Quests(d);
      const t = boss(d, 'thane');
      if (t) {
        t.hpMax = t.hp = 12000;
        d.region.hurtEnemy(t, 4500, 'aa', d.hero);
        t.aggro = true;
      }
      d.at(0.1, x => brawl(x, p));
      jumpRings(d, p);
      d.camAt([15, 11], 1.8);
    },
  },
  a2_bridge_final: {
    dur: 9,
    clean: false,
    seed: 220,
    note: 'UI: the four (and Wren) cross the Weeping Bridge north, toward the black vines',
    setup(d) {
      d.go('weepingbridge', [30, 25]).weather('clear').flag('garrick_down');
      d.clearEnemies();
      d.flag('wren_follows');
      const p = party2(d, [29, 24]);
      act2Quests(d);
      d.at(0.3, x => {
        p.forEach((h, i) => x.walk(h, [29 + (i % 2), 12 + Math.floor(i / 2)]));
      });
      d.camFollow(p[0], 0.9, 2, 0, 10);
    },
  },
};

export { WARRIOR_FIGHT, ARCHER_FIGHT };
