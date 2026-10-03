/**
 * A fight simulator for balancing the classes: the real game code, a hero of a class played
 * by a simple bot against real creatures, timed. The warrior walks in and fights; the archer
 * plants its feet once in range and shoots (no kiting: archers stand still to shoot). Neither
 * bot times the GCD perfectly (no perfect-tap crits), so the comparison is about the classes.
 */
import { Game } from '../src/sim/Game';
import { Rng } from '../src/sim/rng';
import type { Hero } from '../src/sim/Hero';
import { GCD } from '../src/sim/Hero';
import type { Enemy } from '../src/sim/types';
import type { ClassId } from '../src/data/classes';
import type { EnemyKind } from '../src/data/enemies';
import type { ItemId, Slot } from '../src/data/items';
import type { Key } from '../src/data/skills';
import { isSkill } from '../src/data/skills';
import { skipScenes } from './helpers';

export type Tier = 0 | 1 | 2;

/** What a hero wears at each gear tier (0: the start; 1: leather and the first real weapon; 2: iron). */
export const KITS: Record<ClassId, Record<Tier, Partial<Record<Slot, ItemId>>>> = {
  warrior: {
    0: { weapon: 'rusty_sword', legs: 'cloth_trousers' },
    1: {
      weapon: 'woodcutter_axe',
      offhand: 'wooden_shield',
      head: 'leather_cap',
      body: 'leather_tunic',
      legs: 'leather_trousers',
      feet: 'leather_boots',
    },
    2: {
      weapon: 'iron_sword',
      offhand: 'iron_shield',
      head: 'iron_helm',
      body: 'chainmail',
      legs: 'iron_greaves',
      feet: 'leather_boots',
      trinket: 'vigour_amulet',
    },
  },
  archer: {
    0: { weapon: 'worn_shortbow', legs: 'cloth_trousers' },
    1: {
      weapon: 'hunting_bow',
      offhand: 'leather_quiver',
      head: 'leather_cap',
      body: 'leather_tunic',
      legs: 'leather_trousers',
      feet: 'leather_boots',
    },
    2: {
      weapon: 'yew_longbow',
      offhand: 'hunters_quiver',
      head: 'iron_helm',
      body: 'chainmail',
      legs: 'iron_greaves',
      feet: 'leather_boots',
      trinket: 'vigour_amulet',
    },
  },
};

const n = (id: string, k: number) => Array<string>(k).fill(id);

/**
 * Talent builds, as the order points are spent (the first allowed one each level). The
 * archer's mirror the warrior's tree for tree.
 */
export const BUILDS: Record<ClassId, Record<string, string[]>> = {
  warrior: {
    blade: [
      ...n('honed_edge', 5),
      ...n('keen_eye', 5),
      ...n('twin_cuts', 2),
      ...n('precise_thrust', 3),
      ...n('brutal_strikes', 3),
      'sunder',
      ...n('improved_mortal', 3),
      ...n('executioner', 2),
      'wardens_edge',
      'deathblow',
    ],
    fury: [
      ...n('battle_rage', 5),
      ...n('flurry', 3),
      ...n('booming_voice', 2),
      ...n('commanding_shout', 3),
      ...n('bloodthirst', 3),
      'bloodrage',
      ...n('enrage', 2),
      'rampage',
      ...n('improved_whirlwind', 3),
      'berserk',
    ],
    warden: [
      ...n('toughness', 5),
      ...n('vitality', 5),
      ...n('second_wind', 3),
      ...n('shield_wall', 3),
      'shield_bash',
      ...n('steadfast', 2),
      'last_warden',
      ...n('watchful', 2),
      ...n('swift_feet', 2),
      'last_stand',
    ],
  },
  archer: {
    marksman: [
      ...n('sharp_arrows', 5),
      ...n('eagle_eye', 5),
      ...n('steady_aim', 2),
      ...n('quick_draw', 3),
      ...n('lethal_shots', 3),
      'rapid_fire',
      ...n('ballistics', 3),
      ...n('coup_de_grace', 2),
      'pinning_crits',
      'deadeye',
    ],
    hunter: [
      ...n('hunting_arrows', 5),
      ...n('swift_hands', 3),
      ...n('tracker', 2),
      ...n('hunters_instinct', 3),
      ...n('hunters_feast', 3),
      'bear_trap',
      'pack_hunter',
      'trap_mastery',
      ...n('serrated_heads', 3),
      'predator',
      ...n('blood_scent', 2),
    ],
    ranger: [
      ...n('nimble', 5),
      ...n('endurance', 5),
      ...n('living_off_the_land', 3),
      ...n('volley_master', 3),
      'disengage',
      ...n('rangers_rest', 2),
      'storm_of_arrows',
      ...n('watchful_eye', 2),
      ...n('fleet_foot', 2),
      'camouflage',
    ],
  },
};

/** The warrior and archer builds that face each other (tree for tree). */
export const MIRROR: [string, string][] = [
  ['blade', 'marksman'],
  ['fury', 'hunter'],
  ['warden', 'ranger'],
];

export interface Setup {
  cls: ClassId;
  level: number;
  tier: Tier;
  build: string;
}

/** A hero of this class at this level, in this gear, with this build's talents. */
export function makeHero(game: Game, s: Setup): Hero {
  const h = game.addHero('bot', 'Bot');
  h.cls = s.cls;
  h.resetHero();
  skipScenes(game);
  h.level = s.level;
  const order = BUILDS[s.cls][s.build];
  for (let p = 0; p < s.level - 1; p++) {
    const next = order.find(id => h.talentProblem(id) === null);
    if (next) h.learnTalent(next);
  }
  for (const slot of Object.keys(h.equip) as Slot[]) h.equip[slot] = null;
  Object.assign(h.equip, KITS[s.cls][s.tier]);
  h.applyGear();
  h.applyTalents();
  h.hp = h.hpMax;
  h.mp = h.mpMax;
  for (let i = 0; i < h.bar.length; i++) h.bar[i] = null;
  return h;
}

export interface FightResult {
  won: boolean;
  /** Seconds from the first creature noticing (or being shot) to the last falling. */
  time: number;
  /** Health lost, as a share of the hero's maximum. */
  hpLost: number;
  died: boolean;
}

const WARRIOR_INSTANT: Key[] = [
  'execute',
  'mortal',
  'deathblow',
  'sunder',
  'shieldbash',
  'berserk',
];
const ARCHER_INSTANT: Key[] = ['killshot', 'pierce', 'deadeye', 'rapidfire', 'predator'];

/** One fight: the hero against these creatures, which wait `gap` px away in a loose group. */
export function fight(
  s: Setup,
  foes: EnemyKind[],
  opts: { gap?: number; seed?: number; maxT?: number } = {}
): FightResult {
  const game = new Game();
  if (opts.seed !== undefined) (game as { rng: Rng }).rng = new Rng(opts.seed);
  const h = makeHero(game, s);
  const R = h.region;
  R.enemies = [];
  const gap = opts.gap ?? 210;
  const list: Enemy[] = [];
  foes.forEach((kind, i) => {
    const e = R.spawnEnemy(
      kind,
      h.x + gap + (i % 2) * 24,
      h.y + (i - (foes.length - 1) / 2) * 26,
      true
    );
    e.aggro = false;
    R.enemies.push(e);
    list.push(e);
  });
  const hp0 = h.hpMax;
  let low = h.hp;
  let t = 0;
  let pathT = 0;
  const maxT = opts.maxT ?? 240;
  const dt = 0.05;
  while (t < maxT) {
    const alive = list.filter(e => e.alive);
    if (!alive.length) return { won: true, time: t, hpLost: (hp0 - low) / hp0, died: false };
    if (h.dead) return { won: false, time: t, hpLost: 1, died: true };
    const tg = alive.reduce((a, b) => (h.dist(h, a) <= h.dist(h, b) ? a : b));
    if (h.target !== tg) h.setTarget(tg);
    const d = h.dist(h, tg);
    pathT -= dt;
    if (s.cls === 'warrior') warrior(h, tg, d, alive);
    else archer(h, tg, d, alive);
    function warrior(hero: Hero, e: Enemy, dist: number, all: Enemy[]): void {
      if (dist > 42) {
        if (hero.canDo('charge') === null && dist > 70 && hero.t >= GCD)
          hero.doAction('charge', false, 2, true);
        else if (pathT <= 0) {
          hero.moveTo(e.x, e.y, false);
          pathT = 0.3;
        }
        return;
      }
      if (hero.path) hero.stopMoving();
      if (hero.hp < hero.hpMax * 0.35) tryCast(hero, ['laststand']);
      if (hero.mp < 20) tryCast(hero, ['bloodrage']);
      tryCast(hero, WARRIOR_INSTANT);
      const near = all.filter(x => hero.dist(hero, x) < 84).length;
      const gcd: Key[] = [];
      if (hero.buffT <= 0) gcd.push('warcry');
      if (near >= 2) gcd.push('whirlwind');
      if (hero.last === 'thrust') gcd.push('slash');
      gcd.push('thrust');
      if (hero.bleedT <= 0) gcd.push('rend');
      gcd.push('slash');
      tryCast(hero, gcd);
    }
    function archer(hero: Hero, e: Enemy, dist: number, all: Enemy[]): void {
      const reach = hero.reach(200) - 10;
      if (dist > reach) {
        if (pathT <= 0) {
          hero.moveTo(e.x, e.y, false);
          pathT = 0.3;
        }
        return;
      }
      if (hero.path) hero.stopMoving();
      if (hero.knows('beartrap') && hero.cdRemaining('beartrap') <= 0 && dist > 60)
        tryCast(hero, ['beartrap']);
      tryCast(hero, ARCHER_INSTANT);
      const near = all.filter(
        x => Math.hypot(x.x - e.x, x.y - e.y) < 70 + hero.tal.volleyReach
      ).length;
      const gcd: Key[] = [];
      if (!(e.markT > 0 && e.markBy === hero.id)) gcd.push('mark');
      if (e.slowT <= 0 && dist > 70) gcd.push('concussive');
      if (near >= 2) gcd.push('volley');
      if (hero.last === 'quickshot') gcd.push('aimedshot');
      gcd.push('quickshot');
      if (hero.bleedT <= 0) gcd.push('barbed');
      gcd.push('aimedshot');
      tryCast(hero, gcd);
    }
    game.tick(dt);
    low = Math.min(low, h.hp);
    t += dt;
  }
  return { won: false, time: maxT, hpLost: (hp0 - low) / hp0, died: false };
}

/** Use the first of these that can be used now (spells on the global cooldown wait for it). */
function tryCast(h: Hero, keys: Key[]): void {
  for (const k of keys) {
    if (!h.knows(k as never)) continue;
    if (isSkill(k) && h.t < GCD) continue;
    if (h.canDo(k) !== null) continue;
    if (h.doAction(k, false, 2, true)) return;
  }
}
