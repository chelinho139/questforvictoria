import type { Shot, Director } from './types';

/** Stills for finding places and looks (film with --still). */
const KIT_WARRIOR = { weapon: 'iron_sword', offhand: 'iron_shield', head: 'iron_helm', body: 'chainmail', legs: 'iron_greaves', feet: 'leather_boots' } as const;
const still = (fn: (d: Director) => void): Shot => ({ dur: 1, settle: 2, setup: fn });

export const SCOUT: Record<string, Shot> = {
  scout_shore_dawn: still(d => {
    d.dress(d.hero, { look: 'k3', level: 12, equip: KIT_WARRIOR, at: [27, 31] });
    d.go('greenmarch', [27, 31]).time(0.27).weather('clear');
    d.camAt([27, 29], 1);
  }),
  scout_lake_wide: still(d => {
    d.go('greenmarch', [27, 31]).time(0.72).weather('clear');
    d.camAt([30, 22], 0.5);
  }),
  scout_camp_dusk: still(d => {
    d.dress(d.hero, { look: 'k3', level: 12, equip: KIT_WARRIOR });
    d.go('greenmarch', [33, 38]).time(0.8).weather('clear');
    d.build('campfire', [34, 39]);
    d.camAt([34, 38], 2);
  }),
  scout_barrow_night: still(d => {
    d.dress(d.hero, { look: 'k3', level: 12, equip: KIT_WARRIOR });
    d.go('greenmarch', [10, 12]).time(0.92).weather('clear').darkness(0.75);
    d.clearEnemies();
    for (const at of [[7, 10], [9, 9], [11, 10], [8, 12]] as [number, number][]) d.spawn('skeleton', at, { rise: true });
    d.camAt([9, 10], 1.5);
  }),
  scout_goblins: still(d => {
    d.go('greenmarch', [52, 20]).time(0.5).weather('clear');
    d.camAt([59, 18], 1.5);
  }),
  scout_mill: still(d => {
    d.go('millbrook', [22, 28]).time(0.45).weather('clear');
    d.camAt([16, 25], 1.5);
  }),
  scout_square_rain: still(d => {
    d.dress(d.hero, { look: 'k3', level: 12, equip: KIT_WARRIOR });
    d.go('millbrook', [38, 29]).time(0.74).weather('rain');
    d.camAt([38, 27], 1.5);
  }),
  scout_churchyard_storm: still(d => {
    d.go('millbrook', [48, 18]).time(0.95).weather('storm').darkness(0.7);
    d.camAt([52, 11], 1.25);
  }),
  scout_thornwall: still(d => {
    d.go('millbrook', [40, 6]).time(0.76).weather('clear');
    d.camAt([40, 3], 1.5);
  }),
  scout_belfry: still(d => {
    d.dress(d.hero, { look: 'k3', level: 12, equip: KIT_WARRIOR });
    d.go('belltower', [10, 11]);
    d.camAt([10, 8], 1.5);
  }),
  scout_hero_close: still(d => {
    d.dress(d.hero, { look: 'k3', level: 12, equip: KIT_WARRIOR });
    d.go('greenmarch', [30, 33]).time(0.45).weather('clear');
    d.addHero({ cls: 'archer', look: 'hood', level: 12, equip: { weapon: 'yew_longbow', offhand: 'hunters_quiver', body: 'leather_tunic', legs: 'leather_trousers', feet: 'swift_boots', head: 'leather_cap' }, at: [31, 33] });
    d.addHero({ cls: 'warrior', look: 'masked', level: 12, equip: { weapon: 'iron_sword', body: 'chainmail', legs: 'iron_greaves' }, at: [30, 34] });
    d.addHero({ cls: 'archer', look: 'traveller', level: 12, equip: { weapon: 'hunting_bow', body: 'leather_tunic', legs: 'leather_trousers' }, at: [31, 34] });
    d.camAt([30.5, 33], 3);
  }),
};
