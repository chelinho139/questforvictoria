import { MEAL } from '../../sim/Hero';
import type Phaser from 'phaser';
import type { Sim } from '../../sim/Sim';
import { ITEMS, SLOTS, SLOT_NAMES, statLines } from '../../data/items';
import type { ItemId, Slot } from '../../data/items';
import { itemIcon } from '../render/itemArt';
import { Tex } from '../render/textures';
import { artAnim, animKey, frameKey } from '../render/art';
import { playerName } from '../player';
import { CLASSES } from '../../data/classes';

/** Equipment slots on the paper doll, placed on a 3-column grid (weapon and off-hand are tall, like Diablo 2). */
const DOLL: Record<Slot, string> = {
  weapon: 'weap',
  head: 'head',
  offhand: 'off',
  body: 'body',
  trinket: 'trink',
  legs: 'legs',
  feet: 'feet',
};

const icons = new Map<ItemId, HTMLCanvasElement>();
function icon(id: ItemId): HTMLCanvasElement {
  let cv = icons.get(id);
  if (!cv) {
    cv = itemIcon(id);
    icons.set(id, cv);
  }
  return cv;
}

/** Draw a canvas into a slot canvas at a whole-number scale, centred. */
function blit(target: HTMLCanvasElement, src: HTMLCanvasElement | null, scale: number): void {
  const c = target.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, target.width, target.height);
  if (!src) return;
  const w = src.width * scale;
  const h = src.height * scale;
  c.drawImage(src, Math.round((target.width - w) / 2), Math.round((target.height - h) / 2), w, h);
}

/**
 * The inventory, Diablo 2 style: a panel docked on the right with the hero and their
 * stats, a paper doll of equipment slots and the bag below. Hidden until opened (I, or the
 * bag button by the action bar); Esc or I closes it. Click an item in the bag to equip or
 * eat it, click worn gear to take it off.
 */
export class InventoryWindow {
  private readonly root: HTMLDivElement;
  private readonly tip: HTMLDivElement;
  private readonly heroCv: HTMLCanvasElement;
  private readonly statsEl: HTMLElement;
  private readonly goldEl: HTMLElement;
  private readonly dollSlots = new Map<Slot, { el: HTMLButtonElement; cv: HTMLCanvasElement }>();
  private readonly bagSlots: { el: HTMLButtonElement; cv: HTMLCanvasElement; n: HTMLElement }[] = [];
  private raf = 0;
  private open = false;
  private lastStats = '';
  private readonly off: () => void;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) this.toggle(false);
  };

  constructor(
    private readonly game: Phaser.Game,
    private readonly sim: Sim
  ) {
    const root = (this.root = document.createElement('div'));
    root.className = 'inv';
    root.hidden = true;
    root.innerHTML = `
      <header><span>Inventory</span><button type="button" class="inv-x" title="Close (I or Esc)">×</button></header>
      <div class="inv-hero">
        <canvas width="96" height="96" aria-hidden="true"></canvas>
        <div class="inv-who"><b class="inv-name" translate="no"></b><span class="inv-lv"></span><ul class="inv-stats"></ul></div>
      </div>
      <div class="inv-doll"></div>
      <div class="inv-bag-head"><span>Bag</span><span class="inv-gold"></span></div>
      <div class="inv-bag"></div>`;
    document.body.append(root);
    this.heroCv = root.querySelector('.inv-hero canvas')!;
    this.statsEl = root.querySelector('.inv-stats')!;
    this.goldEl = root.querySelector('.inv-gold')!;
    root.querySelector('.inv-x')!.addEventListener('click', () => this.toggle(false));
    root.addEventListener('pointerdown', e => e.stopPropagation());

    const doll = root.querySelector('.inv-doll')!;
    for (const slot of SLOTS) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'inv-slot inv-eq';
      el.style.gridArea = DOLL[slot];
      el.dataset.label = SLOT_NAMES[slot];
      const cv = document.createElement('canvas');
      cv.width = cv.height = 44;
      el.append(cv);
      el.addEventListener('click', () => this.sim.unequip(slot));
      el.addEventListener('pointerenter', () => this.showTip(el, this.sim.equip[slot], 'worn', slot));
      el.addEventListener('pointerleave', () => this.hideTip());
      doll.append(el);
      this.dollSlots.set(slot, { el, cv });
    }
    const bag = root.querySelector('.inv-bag')!;
    this.sim.bag.forEach((_, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'inv-slot';
      const cv = document.createElement('canvas');
      cv.width = cv.height = 44;
      const n = document.createElement('i');
      el.append(cv, n);
      el.addEventListener('click', () => {
        this.sim.useSlot(i);
        this.showTip(el, this.sim.bag[i]?.id ?? null, 'bag');
      });
      el.addEventListener('pointerenter', () => this.showTip(el, this.sim.bag[i]?.id ?? null, 'bag'));
      el.addEventListener('pointerleave', () => this.hideTip());
      bag.append(el);
      this.bagSlots.push({ el, cv, n });
    });

    this.tip = document.createElement('div');
    this.tip.className = 'inv-tip';
    this.tip.hidden = true;
    document.body.append(this.tip);

    this.off = this.sim.events.on('bag', () => this.render());
    window.addEventListener('keydown', this.onKey);
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(force?: boolean): void {
    this.open = force ?? !this.open;
    this.root.hidden = !this.open;
    if (!this.open) {
      this.hideTip();
      cancelAnimationFrame(this.raf);
      return;
    }
    this.render();
    const tick = (now: number) => {
      this.animate(now);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** Keep the panel above the action bar (bottom in CSS pixels). */
  setBottom(px: number): void {
    this.root.style.bottom = Math.max(12, Math.round(px)) + 'px';
  }

  private render(): void {
    if (!this.open) return;
    this.root.querySelector('.inv-name')!.textContent = playerName();
    for (const slot of SLOTS) {
      const v = this.dollSlots.get(slot)!;
      const id = this.sim.equip[slot];
      blit(v.cv, id ? icon(id) : null, 2);
      v.el.classList.toggle('filled', !!id);
      v.el.classList.toggle('fine', !!id && !!ITEMS[id].fine);
    }
    this.sim.bag.forEach((st, i) => {
      const v = this.bagSlots[i];
      blit(v.cv, st ? icon(st.id) : null, 2);
      v.n.textContent = st && st.n > 1 ? String(st.n) : '';
      v.el.classList.toggle('filled', !!st);
      v.el.classList.toggle('fine', !!st && !!ITEMS[st.id].fine);
    });
    this.renderStats();
  }

  private renderStats(): void {
    const s = this.sim;
    const g = s.gear;
    const armor = s.armor;
    const cut = Math.round(100 - 10000 / (100 + armor * 6));
    const crit = Math.round(s.tal.crit * 100);
    const rows: [string, string][] = [
      ['Attack', `+${g.atk}`],
      ['Armor', `${armor}${armor ? ` (−${cut}% dmg)` : ''}`],
      ['Critical hits', crit ? `${crit}%` : '—'],
      ['Health', `${Math.round(s.hp)} / ${s.hpMax}`],
      ['Speed', `${g.speed ? '+' + Math.round(g.speed * 100) + '%' : '—'}`],
      ['Chopping', `${g.chop ? '+' + Math.round(g.chop * 100) + '%' : '—'}`],
      ['Mining', `${g.mine ? '+' + Math.round(g.mine * 100) + '%' : '—'}`],
    ];
    const key = rows.map(r => r.join(':')).join('|') + '|' + s.gold + '|' + s.level;
    if (key === this.lastStats) return;
    this.lastStats = key;
    this.root.querySelector('.inv-lv')!.textContent = `${CLASSES[s.cls].name} · Lv ${s.level}`;
    this.statsEl.innerHTML = rows.map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join('');
    this.goldEl.textContent = `${s.gold} gold`;
  }

  /** The hero's idle loop (or standing frame) from the live textures, so it matches the art style. */
  private animate(now: number): void {
    const tm = this.game.textures;
    const n = artAnim(Tex.knight, 'idle');
    const key = n ? animKey(Tex.knight, 'idle', Math.floor(now / 380) % n) : frameKey(Tex.knight, 0);
    const src = tm.exists(key) ? (tm.get(key).getSourceImage() as HTMLCanvasElement) : null;
    const scale = src ? Math.max(1, Math.floor(Math.min(90 / src.width, 90 / src.height))) : 1;
    blit(this.heroCv, src, scale);
    this.renderStats();
  }

  private showTip(anchor: HTMLElement, id: ItemId | null, where: 'bag' | 'worn', slot?: Slot): void {
    if (!id) {
      if (where === 'worn' && slot) {
        this.tip.innerHTML = `<b>${SLOT_NAMES[slot]}</b><p>Nothing worn. Click gear in the bag to equip it.</p>`;
        this.place(anchor);
      } else this.hideTip();
      return;
    }
    const d = ITEMS[id];
    const lines = statLines(d.stats).map(l => `<li>${l}</li>`).join('');
    let compare = '';
    if (where === 'bag' && d.slot) {
      const worn = this.sim.equip[d.slot];
      compare = worn ? `<p class="inv-cmp">Replaces ${ITEMS[worn].name}${statLines(ITEMS[worn].stats).length ? ' (' + statLines(ITEMS[worn].stats).join(', ') + ')' : ''}</p>` : '';
    }
    const wait = Math.ceil(this.sim.hero.itemCd[id] ?? 0);
    // food waits for room in your stomach; a bandage, for the last one
    const full = Math.ceil(this.sim.hero.fullT - MEAL);
    const hint =
      where === 'worn'
        ? 'Click to take off'
        : d.slot
          ? 'Click to equip'
          : d.use
            ? wait > 0
              ? `Ready again in ${wait} s`
              : 'Click to use'
            : id === 'bandage'
              ? wait > 0
                ? `Ready again in ${wait} s`
                : 'Click to use'
              : d.heal
                ? full > 0
                  ? `Too full: eat again in ${full} s`
                  : 'Click to eat'
                : '';
    this.tip.innerHTML =
      `<b class="${d.fine ? 'fine' : ''}">${d.name}</b>` +
      (d.slot ? `<small>${SLOT_NAMES[d.slot]}${d.unique ? ' · Unique' : ''}</small>` : '') +
      (lines ? `<ul>${lines}</ul>` : '') +
      `<p>${d.desc}</p>${compare}` +
      (hint ? `<em>${hint}</em>` : '');
    this.place(anchor);
  }

  /** Tooltips open to the left of the panel, level with the hovered slot. */
  private place(anchor: HTMLElement): void {
    this.tip.hidden = false;
    const r = anchor.getBoundingClientRect();
    const panel = this.root.getBoundingClientRect();
    const tr = this.tip.getBoundingClientRect();
    this.tip.style.left = Math.max(8, panel.left - tr.width - 10) + 'px';
    this.tip.style.top = Math.max(8, Math.min(window.innerHeight - tr.height - 8, r.top + r.height / 2 - tr.height / 2)) + 'px';
  }

  private hideTip(): void {
    this.tip.hidden = true;
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    this.off();
    this.root.remove();
    this.tip.remove();
  }
}
