import type { RegionDef } from './types';

/**
 * Inside the Lisle Barrow (levels 10–11): the long stone passage, side chambers with the dead
 * in their niches, and the round hall where the Thane under the Hill sits on his stone seat
 * (docs/act2.md, "Regions"). The layout and props are written by tools/world/maps.py.
 */
export const lislebarrow: RegionDef = {
  name: 'The Lisle Barrow',
  ring: 2,
  indoor: true,
  // the valley's oldest dead, under the hill
  music: 'deep',
  layout: [
    '&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&',
    '&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&',
    '&&&&&&&&&&&&&#####&&&&&&&&&&&&',
    '&&&&&&&&&#####+++####&&&&&&&&&',
    '&&&&&&&&##++++++++++###&&&&&&&',
    '&&&&&&&##+++++++++++++##&&&&&&',
    '&&&&&&##+++++++++++++++##&&&&&',
    '&&&&&&#+++++++++++++++++##&&&&',
    '&&&&&&#++++++++++++++++++#&&&&',
    '&&&&&&#++++++++++++++++++#&&&&',
    '&&&&&&#++++++++++++++++++#&&&&',
    '&&&&&&#+++++++++++++++++##&&&&',
    '&&&&&&##+++++++++++++++##&&&&&',
    '&&&&&&&#++++++++++++++##&&&&&&',
    '&&&&&&&###++++++++++###&&&&&&&',
    '&&&&##########+++####&&&&&&&&&',
    '&&&##++++++###+++#&&&&&&&&&&&&',
    '&&&#+++++++++++++#&&&&&&&&&&&&',
    '&&&##++++++++++++#&&&&&&&&&&&&',
    '&&&&###++####++++#&&&&&&&&&&&&',
    '&&&&&&####&&#++++#&#########&&',
    '&&&&&&&&&&&&#+++####+++++++#&&',
    '&&&&&&&&&&&&#++++++++++++++##&',
    '&&&&&###&&&&#+++####++++++++#&',
    '&&&&##+######++++++++++++++##&',
    '&&&##++++++##++++####+++++##&&',
    '&&&#+++++++++++++#&&###++##&&&',
    '&&&#++++++++#++++#&&&&####&&&&',
    '&&&#+++++++++++++#&&&&&&&&&&&&',
    '&&&##+++++####+++#&&&&&&&&&&&&',
    '&&&&##++###&&#+++#&&&&&&&&&&&&',
    '&&&&&####&&&&#+++#&&&&&&&&&&&&',
    '&&&&&&&&&&&&&#+++#&&&&&&&&&&&&',
    '&&&&&&&&&&&&&#+++#&&&&&&&&&&&&',
    '&&&&&&&&&&&&&#+++#&&&&&&&&&&&&',
    '&&&&&&&&&&&&&#+++#&&&&&&&&&&&&',
    '&&&&&&&&&&&&&#+++#&&&&&&&&&&&&',
    '&&&&&&&&&&&&&#+++#&&&&&&&&&&&&',
    '&&&&&&&&&&&&&#+++#&&&&&&&&&&&&',
    '&&&&&&&&&&&&&#+++#&&&&&&&&&&&&',
  ],
  spots: { start: [15, 36], door: [15, 36], hall: [15, 10] },
  exits: [{ area: [14, 39, 16, 39], to: 'heronreach', at: 'barrow_door' }],
  spawns: [
    // the Sleepers, older than Corvalis, woken by the crown with everyone else (and asleep again
    // once the Wardens' fire burns at the door)
    ...([
      [6, 27],
      [8, 26],
      [25, 23],
      [23, 22],
      [6, 17],
      [15, 24],
    ] as [number, number][]).map(at => ({ kind: 'sleeper' as const, at, when: { not: 'barrow_fire_lit' } })),
    // the Thane, on his stone seat at the end of the hall
    { kind: 'thane', at: [15, 7], when: { not: 'thane_down' } },
  ],
  npcs: [],
  props: [
    { kind: 'stone_seat', at: [14, 4] },
    { kind: 'niche', at: [4, 26] },
    { kind: 'niche', at: [4, 28] },
    { kind: 'niche', at: [27, 22] },
    { kind: 'niche', at: [27, 24] },
    { kind: 'niche', at: [4, 17] },
  ],
  lights: [
    [15, 33],
    [6, 27],
    [24, 23],
    [15, 10],
    [6, 17],
  ],
  wake: [{ spot: 'hearth', region: 'heronlodge', when: { flag: 'lodge_lit' }, say: 'You wake by the hearth in Heron Lodge, under forty names.' }],
  triggers: [{ area: [7, 3, 24, 14], scene: 'thane_wakes', when: { not: 'thane_down' } }],
};
