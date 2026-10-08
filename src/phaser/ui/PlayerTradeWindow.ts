import type { Sim } from '../../sim/Sim';
import type { TradeView, Offer } from '../../sim/Trade';
import { TRADE_ASK, tradable } from '../../sim/Trade';
import { ITEMS } from '../../data/items';
import type { ItemId } from '../../data/items';
import { openedLeft } from './panels';
import { paintIcon, describe } from './TradeWindow';

type Button = { label: string; cls?: string; act: () => void };

/**
 * Trading with another player on the screen. Asked from their card (DuelWindow): a bar at the
 * top says where the request stands (Accept / Decline, and the time running out, or Take back
 * for one you made), the duel bar's look. Once both agree, the table opens on the left: what
 * you give (click to take one back, shift-click the lot) and your gold, what they give, and your
 * bag (click to put one on the table, shift-click the whole lot). Accept when the table suits
 * you; any change takes both accepts back, and when both accept it changes hands.
 */
export class PlayerTradeWindow {
  private readonly bar: HTMLDivElement;
  private readonly barText: HTMLElement;
  private readonly barTime: HTMLElement;
  private readonly barFill: HTMLElement;
  private readonly barChoices: HTMLElement;
  private readonly root: HTMLDivElement;
  private readonly title: HTMLElement;
  private readonly giveH: HTMLElement;
  private readonly getH: HTMLElement;
  private readonly giveList: HTMLElement;
  private readonly getList: HTMLElement;
  private readonly bagList: HTMLElement;
  private readonly goldIn: HTMLInputElement;
  private readonly goldHave: HTMLElement;
  private readonly getGold: HTMLElement;
  private readonly readyBtn: HTMLButtonElement;
  private readonly note: HTMLElement;
  /** What the bar and the table show now (only a change touches the page). */
  private barKey = '';
  private tableKey = '';
  private top = -1;
  private open = false;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open && document.activeElement !== this.goldIn)
      this.sim.quitTrade();
  };

  constructor(
    private readonly sim: Sim,
    /** Where the request's bar goes, in page px from the top. */
    private readonly barTop: () => number = () => 40
  ) {
    const bar = (this.bar = document.createElement('div'));
    bar.className = 'duel-bar trade-bar';
    bar.hidden = true;
    bar.innerHTML = `<div class="duel-head"><b></b><span class="duel-time"></span></div>
      <div class="duel-track"><div class="duel-fill"></div></div><div class="duel-choices"></div>`;
    this.barText = bar.querySelector('.duel-head b')!;
    this.barTime = bar.querySelector('.duel-time')!;
    this.barFill = bar.querySelector('.duel-fill')!;
    this.barChoices = bar.querySelector('.duel-choices')!;

    const root = (this.root = document.createElement('div'));
    root.className = 'craft trade ptrade';
    root.hidden = true;
    root.innerHTML = `<header><span></span><button type="button" class="inv-x" title="Call off (Esc)">×</button></header>
      <div class="craft-list">
        <section class="ptrade-give"><h3><span>You give</span><em></em></h3><div class="ptrade-items"></div>
          <label class="ptrade-gold"><input type="number" min="0" step="1" inputmode="numeric" value="0"> gold <small></small></label></section>
        <section class="ptrade-get"><h3><span></span><em></em></h3><div class="ptrade-items"></div><p class="ptrade-gold-get"></p></section>
        <section><h3><span>Your bag</span><em>shift-click for the whole stack</em></h3><div class="ptrade-bag"></div></section>
      </div>
      <footer><p class="ptrade-note"></p><div class="duel-choices"><button type="button" class="new ptrade-ok"></button><button type="button" class="bye ptrade-off">Call off</button></div></footer>`;
    this.title = root.querySelector('header span')!;
    this.giveH = root.querySelector('.ptrade-give h3 em')!;
    this.getH = root.querySelector('.ptrade-get h3 em')!;
    this.giveList = root.querySelector('.ptrade-give .ptrade-items')!;
    this.getList = root.querySelector('.ptrade-get .ptrade-items')!;
    this.bagList = root.querySelector('.ptrade-bag')!;
    this.goldIn = root.querySelector('.ptrade-gold input')!;
    this.goldHave = root.querySelector('.ptrade-gold small')!;
    this.getGold = root.querySelector('.ptrade-gold-get')!;
    this.readyBtn = root.querySelector('.ptrade-ok')!;
    this.note = root.querySelector('.ptrade-note')!;
    root.querySelector('.inv-x')!.addEventListener('click', () => this.sim.quitTrade());
    root.querySelector('.ptrade-off')!.addEventListener('click', () => this.sim.quitTrade());
    this.readyBtn.addEventListener('click', () => {
      const v = this.sim.trading;
      if (v && v.st === 'open') this.sim.tradeReady(!v.give.ok);
    });
    const setGold = () => {
      const n = Math.max(0, Math.min(this.sim.gold, Math.floor(Number(this.goldIn.value) || 0)));
      this.goldIn.value = String(n);
      this.sim.tradeGold(n);
    };
    this.goldIn.addEventListener('change', setGold);
    this.goldIn.addEventListener('keydown', e => {
      // typing a number is not walking or casting
      e.stopPropagation();
      if (e.key === 'Enter' || e.key === 'Escape') this.goldIn.blur();
    });
    this.goldIn.addEventListener('blur', setGold);
    // a click here is not a click on the world
    for (const el of [bar, root]) {
      el.addEventListener('pointerdown', e => e.stopPropagation());
      document.body.append(el);
    }
    window.addEventListener('keydown', this.onKey);
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Every frame (GameScene.update): the bar and the table follow the trade. */
  update(): void {
    const v = this.sim.trading;
    this.updateBar(v && v.st === 'ask' ? v : null);
    this.updateTable(v && v.st === 'open' ? v : null);
  }

  private updateBar(v: TradeView | null): void {
    this.bar.hidden = !v;
    if (!v) {
      this.barKey = '';
      return;
    }
    const top = Math.round(this.barTop());
    if (top !== this.top) {
      this.top = top;
      this.bar.style.top = `${top}px`;
    }
    const key = `${v.mine}:${v.name}`;
    if (key !== this.barKey) {
      this.barKey = key;
      this.bar.classList.toggle('asked', !v.mine);
      this.barText.textContent = v.mine
        ? `Waiting for ${v.name} to answer…`
        : `${v.name} wants to trade with you`;
      this.buttons(
        v.mine
          ? [{ label: 'Take back', cls: 'bye', act: () => this.sim.quitTrade() }]
          : [
              { label: 'Trade', cls: 'new', act: () => this.sim.acceptTrade() },
              { label: 'Decline', cls: 'bye', act: () => this.sim.quitTrade() },
            ]
      );
    }
    this.barTime.textContent = `${Math.max(0, Math.ceil(v.t))} s`;
    this.barFill.style.width = `${Math.max(0, Math.min(1, v.t / TRADE_ASK)) * 100}%`;
  }

  private buttons(list: Button[]): void {
    this.barChoices.replaceChildren(
      ...list.map(b => {
        const el = document.createElement('button');
        el.type = 'button';
        el.textContent = b.label;
        if (b.cls) el.className = b.cls;
        el.addEventListener('click', b.act);
        return el;
      })
    );
  }

  private updateTable(v: TradeView | null): void {
    if (!v) {
      if (this.open) {
        this.open = false;
        this.root.hidden = true;
        this.tableKey = '';
      }
      return;
    }
    const s = this.sim;
    if (!this.open) {
      this.open = true;
      openedLeft({ isOpen: true, toggle: () => {} });
      this.root.hidden = false;
    }
    const bag = s.bag.map(st => (st ? `${st.id}:${st.n}` : '')).join(',');
    const key = `${JSON.stringify(v)}|${bag}|${s.gold}`;
    if (key === this.tableKey) return;
    this.tableKey = key;
    this.title.textContent = `Trade with ${v.name}`;
    this.root.querySelector('.ptrade-get h3 span')!.textContent = `${v.name} gives`;
    this.giveH.textContent = v.give.ok ? 'accepted ✓' : '';
    this.giveH.className = v.give.ok ? 'ok' : '';
    this.getH.textContent = v.get.ok ? 'accepted ✓' : 'not accepted yet';
    this.getH.className = v.get.ok ? 'ok' : '';
    // what I give: click takes one back, shift-click the lot
    this.giveList.replaceChildren(
      ...(v.give.items.length
        ? v.give.items.map(([id, n]) =>
            this.row(id, n, 'Take back', e => s.tradeItem(id, e.shiftKey ? 0 : n - 1))
          )
        : [this.none('Nothing yet: pick from your bag below.')])
    );
    if (document.activeElement !== this.goldIn) this.goldIn.value = String(v.give.gold);
    this.goldIn.max = String(s.gold);
    this.goldHave.textContent = `of ${s.gold}`;
    // what they give
    this.getList.replaceChildren(
      ...(v.get.items.length
        ? v.get.items.map(([id, n]) => this.row(id, n))
        : [this.none('Nothing yet.')])
    );
    this.getGold.textContent = v.get.gold ? `${v.get.gold} gold` : '';
    this.getGold.hidden = !v.get.gold;
    // my bag: what could go on the table, less what already is
    const have = new Map<ItemId, number>();
    for (const st of s.bag)
      if (st && tradable(st.id)) have.set(st.id, (have.get(st.id) ?? 0) + st.n);
    const offered = (id: ItemId) => v.give.items.find(([x]) => x === id)?.[1] ?? 0;
    const rows: HTMLElement[] = [];
    for (const [id, n] of have) {
      const left = n - offered(id);
      if (left > 0)
        rows.push(
          this.row(id, left, 'Offer', e => s.tradeItem(id, e.shiftKey ? n : offered(id) + 1))
        );
    }
    this.bagList.replaceChildren(
      ...(rows.length ? rows : [this.none('Nothing in your bag you could trade.')])
    );
    this.readyBtn.textContent = v.give.ok ? 'Take back accept' : 'Accept trade';
    this.readyBtn.classList.toggle('bye', v.give.ok);
    this.readyBtn.classList.toggle('new', !v.give.ok);
    this.note.textContent = this.noteFor(v.give, v.get, v.name);
  }

  private noteFor(give: Offer, get: Offer, name: string): string {
    if (give.ok && get.ok) return '';
    if (give.ok) return `Waiting for ${name} to accept…`;
    if (get.ok) return `${name} has accepted. Accept too and it's done.`;
    return 'Any change takes back both accepts.';
  }

  private none(text: string): HTMLElement {
    const p = document.createElement('p');
    p.className = 'trade-none';
    p.textContent = text;
    return p;
  }

  private row(id: ItemId, n: number, verb?: string, act?: (e: MouseEvent) => void): HTMLElement {
    const r = document.createElement('div');
    r.className = 'craft-row';
    const d = ITEMS[id];
    r.innerHTML = `<canvas class="craft-out" width="22" height="22"></canvas><div class="craft-mid"><b class="${d.fine ? 'fine' : ''}"></b></div>`;
    paintIcon(r.querySelector('canvas')!, id);
    const b = r.querySelector('b')!;
    b.textContent = d.name + (n > 1 ? ` ×${n}` : '');
    b.title = describe(id);
    if (verb && act) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = verb;
      btn.addEventListener('click', e => {
        btn.blur();
        act(e);
      });
      r.append(btn);
    }
    return r;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKey);
    this.bar.remove();
    this.root.remove();
  }
}
