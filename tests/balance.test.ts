import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MIRROR } from './fight';
import { SCENARIOS, measure, cost } from './balance-report';
import type { ClassId } from '../src/data/classes';

/**
 * The classes stay fair: for each mirrored build (Blade–Marksman–Fire, Fury–Hunter–Frost,
 * Warden–Ranger–Arcane), the archer and the sorceress each clear the same fights as the
 * warrior in about the same time, at about the same cost in health, and nobody dies. `npx tsx
 * tests/balance-report.ts` prints the full tables (docs/archer.md and docs/sorceress.md
 * explain them).
 */
for (const [cls, col] of [
  ['archer', 1],
  ['sorceress', 2],
] as [ClassId, 1 | 2][]) {
  for (const pair of MIRROR) {
    const wb = pair[0];
    const rb = pair[col];
    test(`${wb} warrior and ${rb} ${cls} are a fair match`, () => {
      let time = 0;
      let price = 0;
      for (const sc of SCENARIOS) {
        const w = measure('warrior', wb, sc);
        const a = measure(cls, rb, sc);
        assert.equal(w.deaths + a.deaths, 0, `${sc.name}: nobody dies`);
        const t = a.time / w.time;
        assert.ok(
          t > 0.75 && t < 1.35,
          `${sc.name}: the ${cls} takes ${t.toFixed(2)}× the warrior's time`
        );
        time += t;
        price += cost(a) / cost(w);
      }
      time /= SCENARIOS.length;
      price /= SCENARIOS.length;
      assert.ok(
        time >= 0.95 && time <= 1.1,
        `on average the ${cls} takes ${time.toFixed(2)}× the time`
      );
      assert.ok(
        price >= 0.9 && price <= 1.1,
        `on average a fight costs the ${cls} ${price.toFixed(2)}× as much`
      );
    });
  }
}
