import type Phaser from 'phaser';
import type { Sim } from '../../sim/Sim';
import { ITEMS, statLines } from '../../data/items';
import type { ItemId } from '../../data/items';
import { RECIPES, STRUCTURES, STATION_NAMES } from '../../data/crafting';
import type { Recipe, Station } from '../../data/crafting';
import { itemIcon } from '../render/itemArt';
import { Tex } from '../render/textures';
import { dockLeft, undockLeft, openedLeft } from './panels';
import { canWield } from '../../data/items';

const STATIONS: Station[] = ['hand', 'campfire', 'forge'];

const icons = new Map<ItemId, HTMLCanvasElement>();
function icon(id: ItemId): HTMLCanvasElement {
  let cv = icons.get(id);
  if (!cv) {
    cv = itemIcon(id);
    icons.set(id, cv);
  }
  return cv;
}

/** Draw `src` into `target` at 1×, centred (pixel art stays crisp). */
function blit(target: HTMLCanvasElement, src: CanvasImageSource & { width: number; height: number }): void {
  const c = target.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, target.width, target.height);
  c.drawImage(src, Math.round((target.width - src.width) / 2), Math.round((target.height - src.height) / 2));
}

/** The button's word for a recipe: build, cook, smelt, forge or make. */
function verb(r: Recipe): string {
  if ('build' in r.makes) return 'Build';
  if (r.station === 'campfire') return 'Cook';
  if (r.station === 'forge') return r.makes.item.endsWith('_bar') ? 'Smelt' : 'Forge';
  return 'Make';
}

interface RowView {
  r: Recipe;
  btn: HTMLButtonElement;
  needs: { id: ItemId; n: number; el: HTMLElement; count: HTMLElement }[];
}

/**
 * The crafting window, docked on the left (the inventory sits on the right). Recipes are
 * grouped by where they are made: by hand, at a campfire (cooking) or at a forge (smelting
 * and smithing). Each shows what it needs (have / need) and why it can't be made yet.
 * K or the hammer button toggles it; Esc closes. Shift-click makes as many as you can.
 */
export class CraftingWindow {
  private readonly root: HTMLDivElement;
  private readonly tip: HTMLDivElement;
  private readonly rows: RowView[] = [];
  private readonly stationState = new Map<Station, HTMLElement>();
  private open = false;
  private timer = 0;
  private readonly off: () => void;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) this.toggle(false);
  };

  constructor(
    private readonly game: Phaser.Game,
    private readonly sim: Sim
  ) {
    const root = (this.root = document.createElement('div'));
    root.className = 'craft';
    root.hidden = true;
    root.innerHTML = `<header><span>Crafting</span><button type="button" class="inv-x" title="Close (K or Esc)">×</button></header><div class="craft-list"></div><footer>Shift-click to make as many as you can.</footer>`;
    document.body.append(root);
    root.querySelector('.inv-x')!.addEventListener('click', () => this.toggle(false));
    root.addEventListener('pointerdown', e => e.stopPropagation());
    const list = root.querySelector('.craft-list')!;
    for (const st of STATIONS) {
      const sec = document.createElement('section');
      const h = document.createElement('h3');
      h.innerHTML = `<span>${STATION_NAMES[st]}</span><em></em>`;
      sec.append(h);
      this.stationState.set(st, h.querySelector('em')!);
      // every recipe, your class's or not: a quest may ask for a sword, or a friend may want one
      for (const r of RECIPES.filter(x => x.station === st)) sec.append(this.row(r));
      list.append(sec);
    }
    this.tip = document.createElement('div');
    this.tip.className = 'inv-tip';
    this.tip.hidden = true;
    document.body.append(this.tip);
    this.off = this.sim.events.on('bag', () => this.render());
    window.addEventListener('keydown', this.onKey);
    dockLeft(this);
  }

  private row(r: Recipe): HTMLElement {
    const el = document.createElement('div');
    el.className = 'craft-row';
    const out = document.createElement('canvas');
    out.width = out.height = 36;
    out.className = 'craft-out';
    if ('build' in r.makes) {
      const key = Tex.structure(r.makes.build);
      const tm = this.game.textures;
      if (tm.exists(key)) blit(out, tm.get(key).getSourceImage() as HTMLCanvasElement);
    } else blit(out, icon(r.makes.item));
    const mid = document.createElement('div');
    mid.className = 'craft-mid';
    const name = document.createElement('b');
    name.textContent = 'build' in r.makes ? STRUCTURES[r.makes.build].name : (r.makes.n ?? 1) > 1 ? `${r.makes.n} × ${ITEMS[r.makes.item].name}` : ITEMS[r.makes.item].name;
    const needsEl = document.createElement('div');
    needsEl.className = 'craft-needs';
    const needs = r.needs.map(([id, n]) => {
      const span = document.createElement('span');
      span.className = 'need';
      span.title = ITEMS[id].name;
      const cv = document.createElement('canvas');
      cv.width = cv.height = 22;
      blit(cv, icon(id));
      const count = document.createElement('i');
      span.append(cv, count);
      needsEl.append(span);
      return { id, n, el: span, count };
    });
    mid.append(name, needsEl);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = verb(r);
    btn.addEventListener('click', e => {
      // while it's being made the button stops it; shift keeps going while the ingredients last
      if (this.making(r)) this.sim.stopCraft();
      else this.sim.craft(r.id, e.shiftKey ? 50 : 1);
      this.render();
      btn.blur();
    });
    el.append(out, mid, btn);
    out.addEventListener('pointerenter', () => this.showTip(out, r));
    out.addEventListener('pointerleave', () => (this.tip.hidden = true));
    name.addEventListener('pointerenter', () => this.showTip(name, r));
    name.addEventListener('pointerleave', () => (this.tip.hidden = true));
    this.rows.push({ r, btn, needs });
    return el;
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(force?: boolean): void {
    this.open = force ?? !this.open;
    this.root.hidden = !this.open;
    if (!this.open) {
      this.tip.hidden = true;
      window.clearInterval(this.timer);
      return;
    }
    openedLeft(this);
    this.render();
    // standing next to a campfire or forge changes what can be made
    this.timer = window.setInterval(() => this.render(), 250);
  }

  /** Keep the panel above the action bar (bottom in CSS pixels). */
  setBottom(px: number): void {
    this.root.style.bottom = Math.max(12, Math.round(px)) + 'px';
  }

  private render(): void {
    if (!this.open) return;
    const s = this.sim;
    for (const st of STATIONS) {
      const el = this.stationState.get(st)!;
      if (st === 'hand') {
        el.textContent = '';
        continue;
      }
      const near = !!s.nearStation(st);
      const built = s.structures.some(x => x.kind === st);
      el.textContent = near ? 'nearby' : built ? 'walk over to it' : `build a ${STATION_NAMES[st].toLowerCase()} first`;
      el.className = near ? 'ok' : '';
    }
    for (const v of this.rows) {
      for (const n of v.needs) {
        const have = s.count(n.id);
        n.count.textContent = `${Math.min(have, 999)}/${n.n}`;
        n.el.classList.toggle('short', have < n.n);
      }
      if (this.making(v.r)) {
        v.btn.textContent = 'Stop';
        v.btn.disabled = false;
        v.btn.title = 'Stop making it (nothing is used up)';
        continue;
      }
      const why = s.craftProblem(v.r);
      v.btn.textContent = verb(v.r);
      v.btn.disabled = why !== null;
      v.btn.title = why ?? `Takes ${v.r.time} s${v.r.station === 'hand' ? '' : '. Shift-click: as many as you can'}`;
    }
  }

  /** Whether this recipe is what the hero is making right now. */
  private making(r: Recipe): boolean {
    const w = this.sim.work;
    return w?.kind === 'make' && w.recipe === r.id;
  }

  private showTip(anchor: HTMLElement, r: Recipe): void {
    if ('build' in r.makes) {
      const d = STRUCTURES[r.makes.build];
      this.tip.innerHTML = `<b>${d.name}</b><p>${d.desc}</p><em>Built next to you</em>`;
    } else {
      const d = ITEMS[r.makes.item];
      const lines = statLines(d.stats).map(l => `<li>${l}</li>`).join('');
      const other = canWield(r.makes.item, this.sim.cls) ? '' : `<em>For ${d.cls === 'archer' ? 'archers' : 'warriors'}</em>`;
      this.tip.innerHTML = `<b class="${d.fine ? 'fine' : ''}">${d.name}</b>${lines ? `<ul>${lines}</ul>` : ''}<p>${d.desc}</p>${other}`;
    }
    this.tip.hidden = false;
    const a = anchor.getBoundingClientRect();
    const p = this.root.getBoundingClientRect();
    const t = this.tip.getBoundingClientRect();
    this.tip.style.left = Math.min(window.innerWidth - t.width - 8, p.right + 10) + 'px';
    this.tip.style.top = Math.max(8, Math.min(window.innerHeight - t.height - 8, a.top + a.height / 2 - t.height / 2)) + 'px';
  }

  destroy(): void {
    undockLeft(this);
    window.clearInterval(this.timer);
    window.removeEventListener('keydown', this.onKey);
    this.off();
    this.root.remove();
    this.tip.remove();
  }
}
