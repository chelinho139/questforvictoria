import { ITEMS } from '../data/items';
import type { ItemId } from '../data/items';
import type { Stack } from './types';
import type { Hero } from './Hero';
import type { Game } from './Game';
import { DUEL_REACH } from './Duel';

/** Seconds a trade request waits for its answer. */
export const TRADE_ASK = 30;
/** How close (world px) you stand to someone to ask them to trade, or to take up their request. */
export const TRADE_REACH = DUEL_REACH;
/** Wander further than this from each other with the trade open, and it is off. */
export const TRADE_LEAVE = TRADE_REACH * 1.5;

/** One side of a trade: so many of these items, and so much gold. */
export interface Offer {
  items: [id: ItemId, n: number][];
  gold: number;
  /** They have pressed Accept on the trade as it stands. */
  ok: boolean;
}

/** A trade as one of the two in it sees it (the HUD shows it; online it comes in the snapshot). */
export interface TradeView {
  /** ask: a request waiting for its answer; open: both at the table. */
  st: 'ask' | 'open';
  /** The other one: their hero id and name. */
  id: string;
  name: string;
  /** I asked. */
  mine: boolean;
  /** Seconds left of the request. */
  t: number;
  /** What I put on the table, and what they do. */
  give: Offer;
  get: Offer;
}

/** An item can change hands if a trader would deal in it (keepsakes and quest rewards stay with you). */
export function tradable(id: ItemId): boolean {
  return !!ITEMS[id].price;
}

/** Whether a bag, giving up `out` and taking in `inc`, has room for it all. */
function fits(bag: (Stack | null)[], out: Offer['items'], inc: Offer['items']): boolean {
  const b = bag.map(s => (s ? { ...s } : null));
  for (const [id, n0] of out) {
    let n = n0;
    for (let i = b.length - 1; i >= 0 && n > 0; i--) {
      const s = b[i];
      if (!s || s.id !== id) continue;
      const k = Math.min(n, s.n);
      s.n -= k;
      n -= k;
      if (s.n <= 0) b[i] = null;
    }
  }
  for (const [id, n0] of inc) {
    const max = ITEMS[id].stack;
    let n = n0;
    for (const s of b)
      if (n && s && s.id === id && s.n < max) {
        const k = Math.min(n, max - s.n);
        s.n += k;
        n -= k;
      }
    for (let i = 0; i < b.length && n; i++)
      if (!b[i]) {
        const k = Math.min(n, max);
        b[i] = { id, n: k };
        n -= k;
      }
    if (n) return false;
  }
  return true;
}

/** "2 × raw meat, an iron sword and 40 gold" (or "nothing"). */
function describe(o: Offer): string {
  const parts = o.items.map(([id, n]) =>
    n > 1 ? `${n} × ${ITEMS[id].name.toLowerCase()}` : `the ${ITEMS[id].name.toLowerCase()}`
  );
  if (o.gold) parts.push(`${o.gold} gold`);
  if (!parts.length) return 'nothing';
  return parts.length === 1
    ? parts[0]
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** Two heroes and the trade between them: first `a` asks and waits for `b`, then both at the table. */
export class Trade {
  state: TradeView['st'] = 'ask';
  /** Seconds left of the request. */
  t = TRADE_ASK;
  /** What each puts on the table. */
  readonly offers: Map<Hero, Offer>;

  constructor(
    readonly a: Hero,
    readonly b: Hero
  ) {
    this.offers = new Map([
      [a, { items: [], gold: 0, ok: false }],
      [b, { items: [], gold: 0, ok: false }],
    ]);
  }

  has(h: Hero): boolean {
    return h === this.a || h === this.b;
  }

  other(h: Hero): Hero {
    return h === this.a ? this.b : this.a;
  }

  offer(h: Hero): Offer {
    return this.offers.get(h)!;
  }

  /** Something on the table changed: both have to look again and accept anew. */
  unready(): void {
    for (const o of this.offers.values()) o.ok = false;
  }
}

/**
 * Trading between heroes (Game.trades), in the manner of WoW's: one asks another standing near,
 * who has TRADE_ASK seconds to answer; a yes opens the table, where each puts items from their
 * bag and gold. Any change takes back both accepts; once both accept what is on the table, it
 * changes hands at once (if both still have it and both have room). Walking off, a scene or a
 * duel calls it off. A hero is in one trade (or request) at a time.
 */
export class Trades {
  list: Trade[] = [];

  constructor(private readonly game: Game) {}

  /** The trade (or request) a hero is in. */
  of(h: Hero): Trade | null {
    return this.list.find(t => t.has(h)) ?? null;
  }

  /** Why `from` can't trade with `to` right now (both up, out of a scene and a duel, near each other), or null. */
  problem(from: Hero, to: Hero | undefined): string | null {
    if (!to || to === from) return 'Pick someone to trade with.';
    if (from.dead > 0) return "You can't trade while you're down.";
    if (to.dead > 0) return `${to.name} is down.`;
    if (from.inScene || to.inScene) return 'Not now.';
    const d = this.game.duels.of(from);
    if (d && d.state !== 'ask') return 'Not in the middle of a duel.';
    const e = this.game.duels.of(to);
    if (e && e.state !== 'ask') return `${to.name} is in a duel.`;
    if (to.regionId !== from.regionId || Math.hypot(to.x - from.x, to.y - from.y) > TRADE_REACH)
      return `${to.name} is too far away.`;
    return null;
  }

  /** `from` asks the hero with id `id` to trade (who is asked; the table waits for their yes). */
  ask(from: Hero, id: string): void {
    const to = this.game.heroes.find(h => h.id === id);
    const mine = this.of(from);
    // asked by the one you are asking: that's a yes
    if (mine && mine.state === 'ask' && mine.b === from && mine.a === to) return this.accept(from);
    const why = mine
      ? mine.state === 'ask' && mine.a === from
        ? 'You have already asked someone to trade.'
        : "You're trading already."
      : (this.problem(from, to) ?? (to && this.of(to) ? `${to.name} is busy trading.` : null));
    if (why || !to) {
      from.log(why ?? 'Pick someone to trade with.', 'h');
      from.hear('error');
      return;
    }
    this.list.push(new Trade(from, to));
    from.log(`You ask ${to.name} to trade.`, 't');
    to.log(`${from.name} wants to trade with you.`, 'c');
    to.hear('questReady');
  }

  /** `h` takes up the request made to them: the table opens for both. */
  accept(h: Hero): void {
    const t = this.of(h);
    if (!t || t.state !== 'ask' || t.b !== h) return;
    const why = this.problem(h, t.a);
    if (why) {
      h.log(why, 'h');
      h.hear('error');
      return;
    }
    t.state = 'open';
    t.t = 0;
    t.a.log(`${h.name} agrees to trade.`, 't');
    h.log(`You trade with ${t.a.name}.`, 't');
  }

  /** `h` says no: to a request (declining it, or taking theirs back), or walks away from the table. */
  quit(h: Hero): void {
    const t = this.of(h);
    if (!t) return;
    const o = t.other(h);
    this.remove(t);
    if (t.state === 'open') {
      h.log('You call off the trade.', 't');
      o.log(`${h.name} calls off the trade.`, 'h');
    } else if (h === t.b) {
      h.log(`You turn down ${o.name}'s offer to trade.`, 't');
      o.log(`${h.name} doesn't want to trade.`, 'h');
    } else {
      h.log('You take back your offer to trade.', 't');
      o.log(`${h.name} no longer wants to trade.`, 't');
    }
  }

  /** A hero leaves the room or the region: their trade is off. */
  left(h: Hero): void {
    const t = this.of(h);
    if (t)
      this.drop(t, t.state === 'ask' ? 'The offer to trade lapses.' : 'The trade is called off.');
  }

  /** `h` puts `n` of an item on the table (0 takes it off), as much as their bag holds. */
  setItem(h: Hero, id: ItemId, n: number): void {
    const t = this.of(h);
    if (!t || t.state !== 'open') return;
    if (!tradable(id)) {
      h.log(`The ${ITEMS[id].name.toLowerCase()} stays with you.`, 'h');
      h.hear('error');
      return;
    }
    const o = t.offer(h);
    const k = Math.max(0, Math.min(Math.floor(n), h.count(id)));
    const i = o.items.findIndex(([x]) => x === id);
    if ((i < 0 ? 0 : o.items[i][1]) === k) return;
    if (i >= 0 && !k) o.items.splice(i, 1);
    else if (i >= 0) o.items[i][1] = k;
    else if (k) o.items.push([id, k]);
    t.unready();
  }

  /** `h` puts this much gold on the table (as much as they have). */
  setGold(h: Hero, n: number): void {
    const t = this.of(h);
    if (!t || t.state !== 'open') return;
    const o = t.offer(h);
    const g = Math.max(0, Math.min(Math.floor(n), h.gold));
    if (g === o.gold) return;
    o.gold = g;
    t.unready();
  }

  /** `h` accepts the table as it stands (or takes their accept back). Both accepting: it changes hands. */
  setReady(h: Hero, on: boolean): void {
    const t = this.of(h);
    if (!t || t.state !== 'open') return;
    t.offer(h).ok = on;
    if (t.offer(t.a).ok && t.offer(t.b).ok) this.close(t);
  }

  /** Every server tick (Game.tick): requests lapse, the table is watched. */
  tick(dt: number): void {
    for (const t of [...this.list]) this.tickTrade(t, dt);
  }

  private tickTrade(t: Trade, dt: number): void {
    const { a, b } = t;
    if (!a.regionId || a.regionId !== b.regionId) return this.left(a.regionId ? b : a);
    if (t.state === 'ask') {
      t.t -= dt;
      if (t.t <= 0 || a.dead > 0 || b.dead > 0) this.drop(t, 'The offer to trade lapses.');
      return;
    }
    const d = this.game.duels.of(a) ?? this.game.duels.of(b);
    if (a.dead > 0 || b.dead > 0 || a.inScene || b.inScene || (d && d.state !== 'ask'))
      return this.drop(t, 'The trade is called off.');
    if (Math.hypot(a.x - b.x, a.y - b.y) > TRADE_LEAVE)
      return this.drop(t, 'You walked away: the trade is called off.');
    // what is no longer in the bag (eaten, sold, spent) comes off the table
    for (const h of [a, b]) {
      const o = t.offer(h);
      for (const [id, n] of [...o.items]) if (h.count(id) < n) this.setItem(h, id, h.count(id));
      if (h.gold < o.gold) this.setGold(h, h.gold);
    }
  }

  /** Both accepted: everything changes hands at once, or nothing does. */
  private close(t: Trade): void {
    const { a, b } = t;
    const oa = t.offer(a);
    const ob = t.offer(b);
    const short = [a, b].find(h => {
      const o = t.offer(h);
      return h.gold < o.gold || o.items.some(([id, n]) => h.count(id) < n);
    });
    const full =
      !short && [a, b].find(h => !fits(h.bag, t.offer(h).items, t.offer(t.other(h)).items));
    if (short || full) {
      t.unready();
      for (const h of [a, b]) {
        h.log(
          short
            ? `${short === h ? "You don't" : `${short.name} doesn't`} have all that any more.`
            : `${full === h ? 'Your bag is' : `${(full as Hero).name}'s bag is`} too full for the trade.`,
          'h'
        );
        h.hear('error');
      }
      return;
    }
    this.remove(t);
    for (const [h, o] of [
      [a, oa],
      [b, ob],
    ] as const) {
      for (const [id, n] of o.items) h.removeItem(id, n);
      h.gold -= o.gold;
    }
    for (const [h, o] of [
      [a, ob],
      [b, oa],
    ] as const) {
      for (const [id, n] of o.items) h.addItem(id, n);
      h.gold += o.gold;
    }
    for (const h of [a, b]) {
      const mine = t.offer(h);
      const theirs = t.offer(t.other(h));
      h.log(
        `Trade done with ${t.other(h).name}: you give ${describe(mine)} and get ${describe(theirs)}.`,
        'c'
      );
      h.hear('coins');
      h.events.emit('bag', {});
    }
  }

  /** A request or a table that comes to nothing: both are told. */
  private drop(t: Trade, text: string): void {
    this.remove(t);
    for (const h of [t.a, t.b]) h.log(text, 't');
  }

  private remove(t: Trade): void {
    this.list = this.list.filter(x => x !== t);
  }

  /** What `h` sees of their trade (or request), or null. */
  view(h: Hero): TradeView | null {
    const t = this.of(h);
    if (!t) return null;
    const o = t.other(h);
    const copy = (x: Offer): Offer => ({
      items: x.items.map(([id, n]) => [id, n]),
      gold: x.gold,
      ok: x.ok,
    });
    return {
      st: t.state,
      id: o.id,
      name: o.name,
      mine: t.a === h,
      t: Math.ceil(t.t),
      give: copy(t.offer(h)),
      get: copy(t.offer(o)),
    };
  }
}
