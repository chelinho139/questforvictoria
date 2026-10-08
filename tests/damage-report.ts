/**
 * Each class's damage on a training dummy, by the real game's rules: a hero at a level, in that
 * level's gear and talent build, against a target that never moves or dies (and never drops
 * below 25%, so the finishers stay out of it), single target only. Three numbers per build:
 * auto-attacks alone, everything with endless mana (what the spells can do), and everything
 * within the class's own mana over a 30 s fight (what you really get).
 * Run: npx tsx tests/damage-report.ts
 */
import { Game } from '../src/sim/Game';
import { GCD } from '../src/sim/Hero';
import type { Hero } from '../src/sim/Hero';
import type { ClassId } from '../src/data/classes';
import type { Key } from '../src/data/skills';
import { isSkill } from '../src/data/skills';
import { DIFFICULTIES } from '../src/data/difficulty';
import { makeHero, MIRROR } from './fight';
import type { Tier } from './fight';

export const LEVELS: [number, Tier][] = [
  [1, 0],
  [3, 0],
  [6, 1],
  [10, 1],
  [15, 2],
  [20, 2],
  [25, 2],
];

/** Single-target priorities: buffs, instants, then the GCD rotation (the fight bots', without the AoE). */
const ROTATION: Record<ClassId, { instant: Key[]; gcd: (h: Hero) => Key[] }> = {
  warrior: {
    instant: ['mortal', 'deathblow', 'sunder', 'berserk'],
    gcd: h => [
      ...(h.buffT <= 0 ? (['warcry'] as Key[]) : []),
      ...(h.last === 'thrust' ? (['slash'] as Key[]) : []),
      'thrust',
      ...(h.bleedT <= 0 ? (['rend'] as Key[]) : []),
      'slash',
    ],
  },
  archer: {
    instant: ['pierce', 'deadeye', 'rapidfire', 'predator'],
    gcd: h => [
      ...(h.target && !(h.target.markT > 0 && h.target.markBy === h.id) ? (['mark'] as Key[]) : []),
      ...(h.last === 'quickshot' ? (['aimedshot'] as Key[]) : []),
      'quickshot',
      ...(h.bleedT <= 0 ? (['barbed'] as Key[]) : []),
      'aimedshot',
    ],
  },
  sorceress: {
    instant: ['chainlightning', 'pyroblast', 'scorch', 'icyveins'],
    gcd: h => [
      ...(h.buffT <= 0 ? (['arcanepower'] as Key[]) : []),
      ...(h.last === 'spark' ? (['firebolt'] as Key[]) : []),
      'spark',
      ...(h.bleedT <= 0 ? (['ignite'] as Key[]) : []),
      'firebolt',
    ],
  },
};

function tryCast(h: Hero, keys: Key[]): void {
  for (const k of keys) {
    if (!h.knows(k as never)) continue;
    if (isSkill(k) && h.t < GCD) continue;
    if (h.canDo(k) !== null) continue;
    if (h.doAction(k, false, 2, true)) return;
  }
}

/** Damage a second on the dummy over `secs`, with `spells` (false: auto-attacks only) and endless mana or not. */
export function dps(
  cls: ClassId,
  build: string,
  level: number,
  tier: Tier,
  opts: { spells?: boolean; endless?: boolean; secs?: number } = {}
): number {
  const normal = { ...DIFFICULTIES.normal };
  Object.assign(DIFFICULTIES.normal, { dmg: 1, hp: 1 });
  try {
    const game = new Game();
    game.cheats.freezeEnemies = true;
    const h = makeHero(game, { cls, level, tier, build });
    const R = h.region;
    R.enemies = [];
    const e = R.spawnEnemy('ogre', h.x + (cls === 'warrior' ? 30 : 150), h.y, true);
    e.hp = e.hpMax = 1e7;
    e.aggro = false;
    R.enemies.push(e);
    h.setTarget(e);
    h.cheats.infiniteMana = !!opts.endless;
    const secs = opts.secs ?? 30;
    const rot = ROTATION[cls];
    for (let t = 0; t < secs; t += 0.05) {
      if (opts.spells !== false) {
        tryCast(h, rot.instant);
        tryCast(h, rot.gcd(h));
      }
      game.tick(0.05);
    }
    return (1e7 - e.hp) / secs;
  } finally {
    Object.assign(DIFFICULTIES.normal, normal);
  }
}

if (process.argv[1]?.endsWith('damage-report.ts')) {
  const pad = (v: string | number, w: number) => String(v).padEnd(w);
  for (const trees of MIRROR) {
    console.log(`\n${trees.join(' / ')}   (damage a second: auto only | endless mana | own mana, 30 s)`);
    console.log(pad('level', 7), pad('warrior', 22), pad('archer', 22), pad('sorceress', 22), 'own mana: A/W  S/W');
    for (const [level, tier] of LEVELS) {
      const cols = (['warrior', 'archer', 'sorceress'] as ClassId[]).map((cls, i) => {
        const b = trees[i];
        return [dps(cls, b, level, tier, { spells: false }), dps(cls, b, level, tier, { endless: true }), dps(cls, b, level, tier)];
      });
      const f = (c: number[]) => c.map(v => v.toFixed(1)).join(' | ');
      console.log(
        pad(level, 7),
        pad(f(cols[0]), 22),
        pad(f(cols[1]), 22),
        pad(f(cols[2]), 22),
        (cols[1][2] / cols[0][2]).toFixed(2),
        ' ',
        (cols[2][2] / cols[0][2]).toFixed(2)
      );
    }
  }
}
