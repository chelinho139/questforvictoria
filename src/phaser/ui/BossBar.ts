import type { Sim } from '../../sim/Sim';

/** The boss you are fighting: its name, title and a long health bar across the top. */
export class BossBar {
  private readonly root: HTMLDivElement;
  private readonly nameEl: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly fill: HTMLElement;
  private shown = '';

  constructor(private readonly sim: Sim) {
    const root = (this.root = document.createElement('div'));
    root.className = 'boss';
    root.hidden = true;
    root.innerHTML = `<div class="boss-head"><b></b><span></span></div><div class="boss-track"><div class="boss-fill"></div></div>`;
    document.body.append(root);
    this.nameEl = root.querySelector('b')!;
    this.titleEl = root.querySelector('span')!;
    this.fill = root.querySelector('.boss-fill')!;
  }

  /** Every frame. */
  update(): void {
    const b = this.sim.scene ? null : this.sim.activeBoss;
    this.root.hidden = !b;
    if (!b || !b.def.boss) return;
    const key = b.n + b.def.boss.title;
    if (key !== this.shown) {
      this.shown = key;
      this.nameEl.textContent = b.n;
      this.titleEl.textContent = b.def.boss.title;
    }
    this.fill.style.width = `${Math.max(0, (b.hp / b.hpMax) * 100)}%`;
  }

  destroy(): void {
    this.root.remove();
  }
}
