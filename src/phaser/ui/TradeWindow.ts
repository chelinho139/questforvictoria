import type { Sim } from '../../sim/Sim';
import { ITEMS, SLOT_NAMES, statLines } from '../../data/items';
import type { ItemId } from '../../data/items';
import { NPCS } from '../../data/npcs';
import type { NpcId } from '../../data/npcs';
import { itemIcon } from '../render/itemArt';
import { dockLeft, undockLeft, openedLeft } from './panels';
import { canWield } from '../../data/items';

/** Draw an item's icon into a canvas at 1× (pixel art stays crisp). */
export function paintIcon(cv: HTMLCanvasElement, id: ItemId): void {
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, cv.width, cv.height);
  const src = itemIcon(id);
  c.drawImage(src, Math.round((cv.width - src.width) / 2), Math.round((cv.height - src.height) / 2));
}

/** What an item is, for the hover title: name, slot, stats and description. */
export function describe(id: ItemId): string {
  const d = ITEMS[id];
  return [d.name + (d.slot ? ` (${SLOT_NAMES[d.slot]})` : ''), ...statLines(d.stats), d.heal ? `Restores ${d.heal} health` : '', d.desc].filter(Boolean).join('\n');
}

/**
 * Buying and selling, docked on the left like crafting. Opened from a trader's dialog
 * ("Let me see what you have."): what they sell, at its price, then everything in your bag
 * they would buy, at a twentieth of its price. Shift-click sells the whole stack. Walking away
 * or Esc closes it.
 */
export class TradeWindow {
  private readonly root: HTMLDivElement;
  private readonly title: HTMLElement;
  private readonly buyList: HTMLElement;
  private readonly sellList: HTMLElement;
  private readonly goldEl: HTMLElement;
  private npc: NpcId | null = null;
  private raf = 0;
  private readonly offs: (() => void)[] = [];
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.npc) this.toggle(false);
  };

  constructor(private readonly sim: Sim) {
    const root = (this.root = document.createElement('div'));
    root.className = 'craft trade';
    root.hidden = true;
    root.innerHTML = `<header><span></span><button type="button" class="inv-x" title="Close (Esc)">×</button></header>
      <div class="craft-list"><section><h3><span>For sale</span></h3><div class="trade-buy"></div></section>
      <section><h3><span>Sell from your bag</span><em>a twentieth of the price</em></h3><div class="trade-sell"></div></section></div>
      <footer><b class="trade-gold"></b> · Shift-click to sell a whole stack.</footer>`;
    document.body.append(root);
    this.title = root.querySelector('header span')!;
    this.buyList = root.querySelector('.trade-buy')!;
    this.sellList = root.querySelector('.trade-sell')!;
    this.goldEl = root.querySelector('.trade-gold')!;
    root.querySelector('.inv-x')!.addEventListener('click', () => this.toggle(false));
    root.addEventListener('pointerdown', e => e.stopPropagation());
    window.addEventListener('keydown', this.onKey);
    this.offs.push(this.sim.events.on('bag', () => this.npc && this.render()));
    this.offs.push(this.sim.events.on('trade', () => this.npc && this.render()));
    this.offs.push(this.sim.events.on('scene', () => this.sim.scene && this.npc && this.toggle(false)));
    dockLeft(this);
  }

  get isOpen(): boolean {
    return this.npc !== null;
  }

  /** Open the trader's stall. */
  open(npc: NpcId): void {
    const shop = NPCS[npc].shop;
    if (!shop) return;
    openedLeft(this);
    this.npc = npc;
    this.title.textContent = shop.name;
    this.root.hidden = false;
    this.render();
    cancelAnimationFrame(this.raf);
    const tick = () => {
      if (!this.npc) return;
      if (!this.sim.nearNpc(this.npc)) return this.toggle(false);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  toggle(force?: boolean): void {
    if (force === true) return;
    this.npc = null;
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
  }

  private row(id: ItemId, label: string, price: number, verb: string, can: boolean, act: (e: MouseEvent) => void, n = 0): HTMLElement {
    const r = document.createElement('div');
    r.className = 'craft-row';
    const d = ITEMS[id];
    r.innerHTML = `<canvas class="craft-out" width="22" height="22"></canvas><div class="craft-mid"><b class="${d.fine ? 'fine' : ''}"></b><span class="trade-price"></span></div><button type="button"></button>`;
    paintIcon(r.querySelector('canvas')!, id);
    const b = r.querySelector('b')!;
    b.textContent = label + (n > 1 ? ` ×${n}` : '');
    b.title = describe(id);
    r.querySelector('.trade-price')!.textContent = `${price} gold`;
    const btn = r.querySelector('button')!;
    btn.textContent = verb;
    btn.disabled = !can;
    btn.addEventListener('click', e => {
      btn.blur();
      act(e);
    });
    return r;
  }

  private render(): void {
    const npc = this.npc;
    if (!npc) return;
    const s = this.sim;
    this.goldEl.textContent = `${s.gold} gold`;
    this.buyList.replaceChildren(
      // only what your class can use (a smith sells swords to warriors, bows to archers)
      ...s.shopStock(npc).filter(id => canWield(id, s.cls)).map(id => {
        const p = ITEMS[id].price ?? 0;
        return this.row(id, ITEMS[id].name, p, 'Buy', s.gold >= p, () => s.buy(npc, id));
      })
    );
    const rows: HTMLElement[] = [];
    s.bag.forEach((st, i) => {
      if (!st) return;
      const v = s.sellValue(st.id);
      if (!v) return;
      rows.push(this.row(st.id, ITEMS[st.id].name, v, 'Sell', true, e => s.sell(npc, i, e.shiftKey), st.n));
    });
    if (!rows.length) {
      const p = document.createElement('p');
      p.className = 'trade-none';
      p.textContent = 'Nothing in your bag to sell.';
      rows.push(p);
    }
    this.sellList.replaceChildren(...rows);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    for (const off of this.offs) off();
    window.removeEventListener('keydown', this.onKey);
    undockLeft(this);
    this.root.remove();
  }
}
