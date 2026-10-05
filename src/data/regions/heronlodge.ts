import type { RegionDef } from './types';

/**
 * Inside Heron Lodge: the Wardens' waystation on the Lisle (docs/act2.md, "Regions"). The cold
 * hearth (Keep the Fire), the roll of names on the beam over it, bunks, a weapon rack and a
 * Warden's chest. The layout and props are written by tools/world/maps.py.
 */
export const heronlodge: RegionDef = {
  name: 'Heron Lodge',
  ring: 2,
  indoor: true,
  layout: [
    '&&&&&&&&&&&&&&&&',
    '&##############&',
    '&#____________#&',
    '&#____________#&',
    '&#____________#&',
    '&#____________#&',
    '&#____________#&',
    '&#____________#&',
    '&#____________#&',
    '&#____________#&',
    '&#____________#&',
    '&#____________#&',
    '&######__######&',
    '&&&&&&#__#&&&&&&',
  ],
  spots: { start: [7, 11], door: [7, 11], hearth: [7, 5] },
  exits: [{ area: [7, 13, 8, 13], to: 'heronreach', at: 'lodge_door' }],
  spawns: [],
  npcs: [],
  objects: [
    {
      id: 'hearth',
      kind: 'hearth',
      at: [7, 2],
      name: 'The hearth',
      once: true,
      cost: [['log', 3]],
      needSay: 'A big stone hearth, cold since the Wardens were sent home. Three logs would light it.',
      say: 'You lay the fire and light it. For the first time in seven years, there is smoke over Heron Lodge.',
      then: { flags: ['lodge_lit'] },
    },
    {
      id: 'roll',
      kind: 'beam',
      at: [10, 2],
      name: 'The roll of the Wardens',
      once: true,
      need: { flag: 'lodge_lit' },
      needSay: 'Names, cut into the beam over the hearth. Too dark to read without a fire.',
      then: { scene: 'the_roll' },
    },
    {
      id: 'warden_chest',
      kind: 'chest',
      at: [12, 4],
      name: "A Warden's chest",
      once: true,
      say: "In the Warden's chest: bandages, a tinderbox gone to rust, and a ration of smoked meat sealed in wax.",
      then: { items: ['bandage', 'bandage', 'smoked_venison'] },
    },
    {
      id: 'rack',
      kind: 'rack',
      at: [12, 8],
      name: 'The weapon rack',
      say: 'Two old spears. The good blades went with the Wardens when they were sent home.',
    },
  ],
  props: [
    { kind: 'bunks', at: [2, 4] },
    { kind: 'bunks', at: [2, 7] },
  ],
  structures: [{ kind: 'campfire', at: [7, 3], when: { flag: 'lodge_lit' } }],
  lights: [[3, 10]],
};
