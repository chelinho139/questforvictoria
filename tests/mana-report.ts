/**
 * How far each class's mana runs down in the balance fights: the least mana left (as a share
 * of the most), averaged over the seeds. Run: npx tsx tests/mana-report.ts
 */
import { fight, MIRROR } from './fight';
import { SCENARIOS } from './balance-report';
import type { ClassId } from '../src/data/classes';

const SEEDS = [11, 23, 37];
const pad = (v: string, w: number) => v.padEnd(w);
const builds: [ClassId, string][] = [];
for (const [w, a, s] of MIRROR) builds.push(['warrior', w], ['archer', a], ['sorceress', s]);
console.log(pad('scenario', 22), ...builds.map(([, b]) => pad(b, 9)));
for (const sc of SCENARIOS) {
  const row = builds.map(([cls, build]) => {
    let low = 0;
    for (const seed of SEEDS)
      low += fight({ cls, level: sc.level, tier: sc.tier, build }, sc.foes, { seed }).mpLow;
    return pad(Math.round((low / SEEDS.length) * 100) + '%', 9);
  });
  console.log(pad(sc.name, 22), ...row);
}
