import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Weather, STRIKE_STEP } from '../src/sim/weather';
import type { Strike, WeatherKind } from '../src/sim/weather';
import { Session } from '../src/server/Session';
import { DAY_LENGTH_S } from '../src/sim/daylight';
import { COMMANDS, DEV_COMMANDS } from '../src/net/commands';
import { LOOP_IDS, renderLoop } from '../src/phaser/audio/ambience';
import { RATE, peak } from '../src/phaser/audio/synth';
import { gameWith, run } from './helpers';

const kindOf = (w: Weather): WeatherKind => w.kind;

/** Run a weather `seconds` in steps of `dt`, gathering every strike as it happens. */
function watch(w: Weather, seconds: number, dt = 0.05): Strike[] {
  const seen: Strike[] = [];
  let last = w.strikes.at(-1)?.id ?? 0;
  for (let t = 0; t < seconds; t += dt) {
    w.advance(dt);
    for (const s of w.strikes) if (s.id > last) seen.push(s);
    last = w.strikes.at(-1)?.id ?? last;
  }
  return seen;
}

test('the weather starts dry, then rains on about half the days, with a storm on about one in five', () => {
  let wet = 0;
  let stormy = 0;
  let total = 0;
  let strikes = 0;
  let days = 0;
  let wetDays = 0;
  let stormDays = 0;
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const w = new Weather(seed);
    // the first four minutes of a game are always dry
    watch(w, 240, 0.5);
    assert.equal(w.kind, 'clear', `seed ${seed}: dry to begin with`);
    assert.equal(w.strikes.length, 0, `seed ${seed}: no lightning without a storm`);
    // then 4 hours: 24 days of 10 minutes
    for (let d = 0; d < 24; d++) {
      let rainedToday = false;
      let stormToday = false;
      for (let i = 0; i < DAY_LENGTH_S; i++) {
        const before = w.strikes.at(-1)?.id ?? 0;
        w.advance(1);
        strikes += (w.strikes.at(-1)?.id ?? 0) - before;
        total++;
        // (read through a function: after the assert above TypeScript thinks it stays 'clear')
        const kind = kindOf(w);
        if (kind !== 'clear') wet++;
        if (kind === 'storm') stormy++;
        if (kind === 'clear') assert.ok(w.storm < 0.35, 'no storm without rain');
        rainedToday ||= kind !== 'clear';
        stormToday ||= kind === 'storm';
      }
      days++;
      if (rainedToday) wetDays++;
      if (stormToday) stormDays++;
    }
  }
  const pct = (a: number, b: number) => Math.round((a / b) * 100);
  assert.ok(wetDays / days > 0.4 && wetDays / days < 0.75, `rain on ${pct(wetDays, days)}% of days`);
  assert.ok(stormDays / days > 0.1 && stormDays / days < 0.35, `a storm on ${pct(stormDays, days)}% of days`);
  assert.ok(wet / total > 0.08 && wet / total < 0.25, `raining ${pct(wet, total)}% of the time`);
  assert.ok(stormy > 0 && stormy < wet * 0.6, `storms are some of the rain (${pct(stormy, wet)}%)`);
  // a full storm strikes about every STRIKE_STEP / 0.8 seconds
  const perMinute = strikes / (stormy / 60);
  assert.ok(perMinute > 2 && perMinute < 12, `${perMinute.toFixed(1)} strikes a stormy minute`);
});

test('the same seed makes the same weather and the same lightning', () => {
  const a = new Weather(42);
  const b = new Weather(42);
  a.forced = b.forced = 'storm';
  const sa = watch(a, 120);
  const sb = watch(b, 120);
  assert.ok(sa.length > 5, 'a storm strikes');
  assert.deepEqual(sa, sb);
  assert.deepEqual(watch(new Weather(7), 3000, 1), watch(new Weather(7), 3000, 1));
});

test('holding the weather: it turns quickly, a storm has lightning, Auto goes back to the schedule', () => {
  const w = new Weather(3);
  w.forced = 'rain';
  watch(w, 8);
  assert.equal(w.kind, 'rain');
  assert.ok(w.rain > 0.7);
  w.forced = 'storm';
  const strikes = watch(w, 60);
  assert.equal(w.kind, 'storm');
  assert.ok(w.storm > 0.99 && w.rain > 0.99);
  assert.ok(strikes.length >= 4, `${strikes.length} strikes in a minute of storm`);
  assert.ok(strikes.every(s => s.u >= 0 && s.u < 1 && s.v >= 0 && s.v < 1));
  assert.ok(new Set(strikes.map(s => s.dist)).size > 1, 'near and far');
  // back to the schedule: still the first dry spell, so it clears up
  w.forced = null;
  watch(w, 60);
  assert.equal(w.kind, 'clear');
  assert.equal(watch(w, 60).length, 0);
});

test("a jump of the clock (joining a room mid-storm) doesn't replay the lightning missed", () => {
  const server = new Weather(9);
  server.forced = 'storm';
  watch(server, 600, 0.5);
  const client = new Weather(1234);
  client.follow(server.snapshot());
  const seen = watch(client, STRIKE_STEP * 2);
  watch(server, STRIKE_STEP * 2);
  assert.ok(seen.length <= 3, `${seen.length} strikes in two candidates' time`);
  // and from then on, the same strikes as the server
  const a = watch(server, 120);
  const b = watch(client, 120);
  assert.deepEqual(
    b.map(s => [s.dist, s.u, s.v]),
    a.map(s => [s.dist, s.u, s.v])
  );
});

test('the room is told when the weather turns, and the snapshot carries it', () => {
  const { game, heroes } = gameWith('Ana');
  const s = new Session(heroes[0]);
  const first = s.build(0.05);
  assert.deepEqual(first.wx, game.weather.snapshot(), 'the weather comes with the first picture');
  DEV_COMMANDS.setWeather(heroes[0], ['storm']);
  assert.equal(game.weather.forced, 'storm');
  run(game, 20);
  const said = heroes[0].logHistory.map(l => l.text);
  assert.ok(said.includes('It starts to rain.'), said.slice(-5).join(' | '));
  assert.ok(said.includes('Thunder rolls in: a storm.'));
  DEV_COMMANDS.setWeather(heroes[0], ['hail']);
  assert.equal(game.weather.forced, 'storm', 'no such weather');
  DEV_COMMANDS.setWeather(heroes[0], [null]);
  assert.equal(game.weather.forced, null);
  assert.equal(COMMANDS.setWeather, undefined, 'only with the dev tools on');
});

test('the rain and wind loops: their length, no clipping, and no seam where they come round', () => {
  for (const id of LOOP_IDS) {
    const d = renderLoop(id);
    assert.ok(d.every(Number.isFinite), `${id}: no NaN`);
    assert.ok(peak(d) <= 1, `${id}: under full scale`);
    assert.ok(Number.isInteger(d.length / RATE) || d.length > RATE * 5, `${id}: seconds long`);
    let step = 0;
    for (let i = 1; i < d.length; i++) step += Math.abs(d[i] - d[i - 1]);
    step /= d.length - 1;
    assert.ok(Math.abs(d[0] - d[d.length - 1]) < step * 6, `${id}: the end runs on into the start`);
  }
});
