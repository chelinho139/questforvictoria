import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoSpeedFactor, isoX, isoY } from '../src/sim/map';
import { gameWith, run } from './helpers';

/** Walk with the keys held (screen right, screen down) for a while; where the hero ended up. */
function walk(mx: number, my: number, seconds = 0.5, flat = false) {
  const { game, heroes } = gameWith('Walker');
  const h = heroes[0];
  h.walkFlat = flat;
  const x0 = h.x;
  const y0 = h.y;
  h.inputMove = { x: mx, y: my };
  run(game, seconds);
  h.inputMove = { x: 0, y: 0 };
  return { h, dx: h.x - x0, dy: h.y - y0, sx: isoX(h.x, h.y) - isoX(x0, y0), sy: isoY(h.x, h.y) - isoY(x0, y0) };
}

test('a hero faces the way they walk on screen, diagonals too', () => {
  const s = Math.SQRT1_2;
  // up-right and down-right face right; up-left and down-left face left (by world x alone,
  // walking up-right faced left)
  assert.equal(walk(s, -s).h.face, 1);
  assert.equal(walk(s, s).h.face, 1);
  assert.equal(walk(-s, -s).h.face, -1);
  assert.equal(walk(-s, s).h.face, -1);
});

test('the keys walk the same speed every way on screen, or on the ground in the 3D views', () => {
  const s = Math.SQRT1_2;
  const screen = [walk(1, 0), walk(0, -1), walk(s, s)].map(w => Math.hypot(w.sx, w.sy));
  for (const d of screen) assert.ok(Math.abs(d - screen[0]) < 1, `screen distances ${screen}`);
  const ground = [walk(1, 0, 0.5, true), walk(0, -1, 0.5, true), walk(s, s, 0.5, true)].map(w => Math.hypot(w.dx, w.dy));
  for (const d of ground) assert.ok(Math.abs(d - ground[0]) < 1, `ground distances ${ground}`);
  // and on the ground that is the hero's speed, which on screen ranges with the direction
  assert.ok(isoSpeedFactor(1, 0) < 1 && isoSpeedFactor(s, s) > 1);
});
