import type { RegionDef } from './types';

/**
 * A small field for testing region travel, story flags and bosses. Reached only from the
 * settings panel; the gap in the east hedge leads back to the Greenmarch.
 */
export const devtest: RegionDef = {
  name: 'Test Field',
  ring: 2,
  dev: true,
  layout: [
    'TTTTTTTTTTTTTTTTTTTT',
    'T.........o........T',
    'T..*.....:::.......T',
    'T........:::...T...T',
    'T..o.....:::.......T',
    'T........::::::::::.',
    'T........::::::::::.',
    'T...T....:::.......T',
    'T........:::...*...T',
    'T..~~~...:::.......T',
    'T..~~~~..:::....o..T',
    'T...~~...:::.......T',
    'T........:::...T...T',
    'TTTTTTTTTTTTTTTTTTTT',
  ],
  spots: { start: [10, 10], west: [16, 5] },
  exits: [{ area: [19, 5, 19, 6], to: 'greenmarch', at: 'start' }],
  spawns: [
    { kind: 'slime', at: [5, 3] },
    { kind: 'goblin', at: [15, 10] },
    { kind: 'dev_boss', at: [6, 11], when: { not: 'dev_boss_down' } },
  ],
  npcs: [],
  objects: [
    { id: 'note', kind: 'page', at: [12, 8], name: 'A page', say: 'A page, half buried in the grass.', once: true, then: { docs: ['test_note'] } },
    { id: 'board', kind: 'board', at: [7, 2], name: 'Notice board', say: 'Nothing pinned here is worth reading yet.' },
    { id: 'chest', kind: 'chest', at: [16, 2], name: 'Chest', say: 'Inside: a little bread, wrapped in cloth.', once: true, then: { items: ['cooked_meat'], flags: ['dev_chest'] } },
  ],
  onEnter: [{ scene: 'dev_hello' }],
};
