import type { RegionDef } from './types';

/**
 * Inside Millbrook's bell tower (ring 1, indoors): the ground floor, a narrow stair winding
 * up, and the belfry under the cracked bell, where the Bell-Ringer hauls on his rope. The
 * layout and props are written by tools/world/maps.py.
 */
export const belltower: RegionDef = {
  name: 'The Bell Tower',
  ring: 1,
  indoor: true,
  // a haunted belfry, not a warm room
  music: 'haunted',
  layout: [
    '&&&&&&&&&&&&&&&&&&&&',
    '&&&&&&&&#####&&&&&&&',
    '&&&&&####+++###&&&&&',
    '&&&&##++++++++###&&&',
    '&&&##+++++++++++##&&',
    '&&&#+++++++++++++##&',
    '&&&#++++++++++++++#&',
    '&&&#++++++++++++++#&',
    '&&&#++++++++++++++#&',
    '&&&#+++++++++++++##&',
    '&&&##+++++++++++##&&',
    '&&&&##+++++++++##&&&',
    '&&&&&#####++####&&&&',
    '&&&&&&&###++##&&&&&&',
    '&&&&&###+++++#&&&&&&',
    '&&&&&#++++++##&&&&&&',
    '&&&&&#++++###&&&&&&&',
    '&&&&&#+####&&&&&&&&&',
    '&&&&&#+###&&&&&&&&&&',
    '&&&&&#+++###&&&&&&&&',
    '&&&&&#+++++#&&&&&&&&',
    '&&&&####+++#####&&&&',
    '&&&&#++++++++++#&&&&',
    '&&&&#++++++++++#&&&&',
    '&&&&#++++++++++#&&&&',
    '&&&&#++++++++++#&&&&',
    '&&&&#++++++++++#&&&&',
    '&&&&#++++++++++#&&&&',
    '&&&&#++++++++++#&&&&',
    '&&&&#++++++++++#&&&&',
    '&&&&#####++#####&&&&',
    '&&&&&&&&#++#&&&&&&&&',
  ],
  spots: { start: [10, 28], door: [10, 28], belfry: [10, 11] },
  exits: [{ area: [9, 31, 10, 31], to: 'millbrook', at: 'chapelDoor' }],
  spawns: [{ kind: 'bellringer', at: [10, 8], when: { not: 'bellringer_down' } }],
  npcs: [],
  props: [
    { kind: 'bell', at: [9, 5] },
  ],
  lights: [
    [6, 23],
    [13, 23],
    [6, 16],
    [5, 6],
    [15, 6],
  ],
  triggers: [{ area: [3, 9, 17, 12], scene: 'belfry', when: { not: 'bellringer_down' } }],
};
