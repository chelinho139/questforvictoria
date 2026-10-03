/**
 * Prints the balance tables in docs/archer.md: every scenario, each mirrored pair of builds,
 * warrior against archer, averaged over several seeds. Run: npx tsx tests/balance-report.ts
 */
import { fight, MIRROR } from './fight';
import type { Tier } from './fight';
import type { EnemyKind } from '../src/data/enemies';

export const SCENARIOS: { name: string; level: number; tier: Tier; foes: EnemyKind[] }[] = [
  { name: 'L1 slime', level: 1, tier: 0, foes: ['slime'] },
  { name: 'L3 goblin', level: 3, tier: 0, foes: ['goblin'] },
  { name: 'L6 two goblins', level: 6, tier: 1, foes: ['goblin', 'goblin'] },
  { name: 'L8 skeleton', level: 8, tier: 1, foes: ['skeleton'] },
  { name: 'L10 bonehounds ×2', level: 10, tier: 1, foes: ['bonehound', 'bonehound'] },
  { name: 'L12 shaman + goblin', level: 12, tier: 1, foes: ['shaman', 'goblin'] },
  { name: 'L15 ogre', level: 15, tier: 2, foes: ['ogre'] },
  { name: 'L18 three skeletons', level: 18, tier: 2, foes: ['skeleton', 'skeleton', 'skeleton'] },
  { name: 'L21 ogre + 2 goblins', level: 21, tier: 2, foes: ['ogre', 'goblin', 'goblin'] },
  { name: 'L25 two ogres', level: 25, tier: 2, foes: ['ogre', 'ogre'] },
];

const SEEDS = [11, 23, 37, 41, 59];

/** What a fight cost: the time it took, made dearer by the health it took (half your health doubles it). */
export function cost(m: { time: number; lost: number }): number {
  return m.time * (1 + 2 * m.lost);
}

export function measure(cls: 'warrior' | 'archer', build: string, sc: (typeof SCENARIOS)[number]) {
  let time = 0;
  let lost = 0;
  let deaths = 0;
  for (const seed of SEEDS) {
    const r = fight({ cls, level: sc.level, tier: sc.tier, build }, sc.foes, { seed });
    time += r.time;
    lost += r.hpLost;
    if (!r.won) deaths++;
  }
  return { time: time / SEEDS.length, lost: lost / SEEDS.length, deaths };
}

if (process.argv[1]?.endsWith('balance-report.ts')) {
  const pad = (v: string, w: number) => v.padEnd(w);
  let tw = 0;
  let tc = 0;
  for (const [wb, ab] of MIRROR) {
    console.log(`\n${wb} vs ${ab}`);
    console.log(
      pad('scenario', 22),
      pad('warrior s', 10),
      pad('archer s', 10),
      pad('time ×', 8),
      pad('w hp lost', 10),
      pad('a hp lost', 10),
      pad('cost ×', 8),
      'deaths w/a'
    );
    for (const sc of SCENARIOS) {
      const w = measure('warrior', wb, sc);
      const a = measure('archer', ab, sc);
      console.log(
        pad(sc.name, 22),
        pad(w.time.toFixed(1), 10),
        pad(a.time.toFixed(1), 10),
        pad((a.time / w.time).toFixed(2), 8),
        pad((w.lost * 100).toFixed(0) + '%', 10),
        pad((a.lost * 100).toFixed(0) + '%', 10),
        pad((cost(a) / cost(w)).toFixed(2), 8),
        `${w.deaths}/${a.deaths}`
      );
      tw += a.time / w.time;
      tc += cost(a) / cost(w);
    }
    console.log(
      pad('average', 22),
      pad('', 10),
      pad('', 10),
      pad((tw / SCENARIOS.length).toFixed(2), 8),
      pad('', 10),
      pad('', 10),
      (tc / SCENARIOS.length).toFixed(2)
    );
    tw = tc = 0;
  }
}
