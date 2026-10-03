import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MIRROR } from './fight';
import { SCENARIOS, measure, cost } from './balance-report';

/**
 * The classes stay fair: for each pair of mirrored builds (Blade–Marksman, Fury–Hunter,
 * Warden–Ranger), the archer clears the same fights in about the same time, at about the same
 * cost in health, and nobody dies. `npx tsx tests/balance-report.ts` prints the full tables
 * (docs/archer.md explains them).
 */
for (const [wb, ab] of MIRROR) {
  test(`${wb} warrior and ${ab} archer are a fair match`, () => {
    let time = 0;
    let price = 0;
    for (const sc of SCENARIOS) {
      const w = measure('warrior', wb, sc);
      const a = measure('archer', ab, sc);
      assert.equal(w.deaths + a.deaths, 0, `${sc.name}: nobody dies`);
      const t = a.time / w.time;
      assert.ok(
        t > 0.75 && t < 1.35,
        `${sc.name}: archer takes ${t.toFixed(2)}× the warrior's time`
      );
      time += t;
      price += cost(a) / cost(w);
    }
    time /= SCENARIOS.length;
    price /= SCENARIOS.length;
    assert.ok(
      time >= 0.95 && time <= 1.1,
      `on average the archer takes ${time.toFixed(2)}× the time`
    );
    assert.ok(
      price >= 0.9 && price <= 1.1,
      `on average a fight costs the archer ${price.toFixed(2)}× as much`
    );
  });
}
