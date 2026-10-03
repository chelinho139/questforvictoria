import { SKILLS, ACTIONS, PRESETS } from '../data/skills';
import type { Key, WheelKey } from '../data/skills';
import { KINDS } from '../data/enemies';
import type { EnemyKind } from '../data/enemies';
import { NPCS } from '../data/npcs';
import type { NpcId } from '../data/npcs';
import { ITEMS, SLOTS } from '../data/items';
import type { ItemId, Slot } from '../data/items';
import { SPELLS } from '../data/spells';
import type { SpellKey } from '../data/spells';
import { TALENTS } from '../data/talents';
import { QUESTS } from '../data/quests';
import { REGIONS } from '../data/regions';
import type { Hero } from '../sim/Hero';
import type { ButtonId } from '../sim/types';

/** Argument checks: a command with arguments of the wrong kind is ignored. */
const int = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const str = (v: unknown): v is string => typeof v === 'string' && v.length < 64;
const bool = (v: unknown): v is boolean => typeof v === 'boolean';
/** A key of the table itself (`in` would also find "__proto__", "constructor" and friends). */
const has = (table: object, k: string): boolean => Object.prototype.hasOwnProperty.call(table, k);
const isKey = (v: unknown): v is Key => str(v) && (has(SKILLS, v) || has(ACTIONS, v));
const isWheelKey = (v: unknown): v is WheelKey => isKey(v) || v === 'rev';
const isNpc = (v: unknown): v is NpcId => str(v) && has(NPCS, v);
const isItem = (v: unknown): v is ItemId => str(v) && has(ITEMS, v);
const isSpell = (v: unknown): v is SpellKey => str(v) && has(SPELLS, v);
const isButton = (v: unknown): v is ButtonId => v === 1 || v === 2;

type Command = (h: Hero, a: unknown[]) => void;

/**
 * Everything a player's browser may ask its hero to do, by name. The server runs these and
 * nothing else; each checks its arguments, and the hero's own rules check the rest (range,
 * cooldowns, being next to someone).
 */
export const COMMANDS: Record<string, Command> = {
  // fighting
  castKey: (h, [k]) => isKey(k) && void h.castKey(k),
  castBarSlot: (h, [i]) => int(i, 0, 11) && h.castBarSlot(i),
  castSlot: (h, [i]) => int(i, 0, 11) && h.castSlot(i),
  tapButton: (h, [b]) => isButton(b) && h.tapButton(b),
  pickFromWheel: (h, [b, k]) => isButton(b) && isWheelKey(k) && h.pickFromWheel(b, k),
  setTarget: (h, [id]) => {
    if (id === null) return h.setTarget(null);
    const e = int(id, 0, 1e9) ? h.region.enemies.find(x => x.id === id && x.alive) : undefined;
    if (e) h.setTarget(e);
  },
  cycleTarget: h => h.cycleTarget(),
  mountToggle: h => h.mountToggle(),
  dodge: h => h.dodge(),
  // Rev
  setRevEnabled: (h, [on]) => bool(on) && h.setRevEnabled(on),
  setRev: (h, [on]) => bool(on) && h.setRev(on),
  setRevAuto: (h, [on]) => bool(on) && h.setRevAuto(on),
  revStep: h => h.revStep(),
  setSeqPreset: (h, [n]) => str(n) && has(PRESETS, n) && h.setSeqPreset(n),
  // the world (the browser walks over first; these check the hero is close enough)
  talkTo: (h, [id]) => isNpc(id) && h.talkTo(id),
  talked: (h, [id]) => isNpc(id) && void h.talked(id),
  asked: (h, [id, i]) => isNpc(id) && int(i, 0, 99) && h.asked(id, i),
  readDoc: (h, [id]) => str(id) && h.game.readDoc(id),
  useObject: (h, [id]) => str(id) && h.useObject(id),
  chop: (h, [c, r]) => {
    const t =
      int(c, 0, 999) && int(r, 0, 999)
        ? h.region.trees.find(x => x.c === c && x.r === r)
        : undefined;
    if (t) h.startChop(t);
  },
  mine: (h, [c, r]) => {
    const k =
      int(c, 0, 999) && int(r, 0, 999)
        ? h.region.rocks.find(x => x.c === c && x.r === r)
        : undefined;
    if (k) h.startMine(k);
  },
  touchWanderer: (h, [id]) => str(id) && h.region.touchWanderer(id, h),
  sceneNext: h => h.region.sceneNext(),
  /** Through an exit the hero walked into (after the browser's fade). */
  travel: h => {
    const ex = h.exiting;
    if (ex) h.game.moveHero(h, ex.to, ex.at);
  },
  // quests
  acceptQuest: (h, [id]) => str(id) && has(QUESTS, id) && h.game.acceptQuest(id, h),
  completeQuest: (h, [id]) => str(id) && has(QUESTS, id) && void h.game.completeQuest(id, h),
  // items, trade, crafting
  useSlot: (h, [i]) => int(i, 0, 99) && h.useSlot(i),
  equipFromBag: (h, [i]) => int(i, 0, 99) && h.equipFromBag(i),
  unequip: (h, [s]) => str(s) && (SLOTS as string[]).includes(s) && h.unequip(s as Slot),
  buy: (h, [npc, id]) => isNpc(npc) && isItem(id) && void h.buy(npc, id),
  sell: (h, [npc, i, all]) => isNpc(npc) && int(i, 0, 99) && void h.sell(npc, i, all === true),
  craft: (h, [id]) => str(id) && void h.craft(id),
  // spells and talents
  setBarSlot: (h, [i, k]) => int(i, 0, 11) && (k === null || isSpell(k)) && h.setBarSlot(i, k),
  learnTalent: (h, [id]) => str(id) && has(TALENTS, id) && void h.learnTalent(id),
  resetTalents: h => h.resetTalents(),
};

/** Dev commands: only in rooms opened with the dev tools on (the server's choice). */
export const DEV_COMMANDS: Record<string, Command> = {
  healFull: h => h.healFull(),
  teleportToStart: h => h.teleportToStart(),
  gainXp: (h, [n]) => int(n, 1, 100000) && h.gainXp(n),
  dropRandomLoot: h => h.dropRandomLoot(),
  spawnNear: (h, [k]) => str(k) && has(KINDS, k) && h.region.spawnNear(k as EnemyKind, h),
  killAllEnemies: h => {
    for (const e of h.region.enemies) if (e.alive) h.dmgEnemy(e, e.hp, 'crit');
  },
  respawnAllEnemies: h => h.region.respawnAll(),
  cheats: (h, [c]) => {
    if (!c || typeof c !== 'object') return;
    const o = c as Record<string, unknown>;
    if (bool(o.god)) h.cheats.god = o.god;
    if (bool(o.infiniteMana)) h.cheats.infiniteMana = o.infiniteMana;
    if (bool(o.noCooldowns)) h.cheats.noCooldowns = o.noCooldowns;
    if (typeof o.moveSpeed === 'number' && o.moveSpeed > 0 && o.moveSpeed <= 5)
      h.cheats.moveSpeed = o.moveSpeed;
    if (bool(o.freezeEnemies)) h.game.cheats.freezeEnemies = o.freezeEnemies;
  },
  setDay: (h, [t]) => typeof t === 'number' && t >= 0 && t < 1 && h.game.day.set(t),
  daySpeed: (h, [v]) => typeof v === 'number' && v >= 0 && v <= 100 && h.game.day.setSpeed(v),
  enterRegion: (h, [id, spot]) =>
    str(id) && has(REGIONS, id) && str(spot) && h.game.moveHero(h, id, spot),
  setFlag: (h, [name]) => str(name) && h.game.setFlag(name),
};
