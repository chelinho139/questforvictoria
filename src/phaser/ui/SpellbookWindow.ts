import type Phaser from 'phaser';
import type { Sim } from '../../sim/Sim';
import { SKILLS, ACTIONS, isSkill } from '../../data/skills';
import { SPELLS, SPELL_ORDER } from '../../data/spells';
import type { SpellKey } from '../../data/spells';
import { TALENTS, TREES, TREE_IDS, TIER_POINTS } from '../../data/talents';
import { BAR_KEYS, PC_KEYS } from '../../data/actionBar';
import { Tex } from '../render/textures';
import { dragSpell } from './spellDrag';
import { dockLeft, undockLeft, openedLeft } from './panels';

const nameOf = (k: SpellKey) => (isSkill(k) ? SKILLS[k].n : ACTIONS[k].n);

/**
 * The spellbook (P, or the red tome on the menu bar), docked on the left: every spell
 * with what it does, what it costs and how you get it: class spells unlock at a level,
 * the rest come from talents. Drag a learned spell onto the action bar; while the book is
 * open you can also drag spells along the bar, or off it to take them away.
 */
export class SpellbookWindow {
  private readonly root: HTMLDivElement;
  private readonly list: HTMLElement;
  private open = false;
  private readonly offs: (() => void)[] = [];
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) this.toggle(false);
  };

  constructor(
    private readonly game: Phaser.Game,
    private readonly sim: Sim
  ) {
    const root = (this.root = document.createElement('div'));
    root.className = 'craft spellbook';
    root.hidden = true;
    root.innerHTML = `<header><span>Spellbook</span><button type="button" class="inv-x" title="Close (${PC_KEYS.spellbook.bind} or Esc)">×</button></header>
      <p class="sb-hint">Drag a spell onto your action bar. While the book is open, drag spells along the bar to move them, or off it to remove them.</p>
      <div class="craft-list"></div>`;
    document.body.append(root);
    this.list = root.querySelector('.craft-list')!;
    root.querySelector('.inv-x')!.addEventListener('click', () => this.toggle(false));
    root.addEventListener('pointerdown', e => e.stopPropagation());
    for (const ev of ['loadout', 'level', 'talents'] as const) this.offs.push(this.sim.events.on(ev, () => this.render()));
    window.addEventListener('keydown', this.onKey);
    dockLeft(this);
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(force?: boolean): void {
    this.open = force ?? !this.open;
    this.root.hidden = !this.open;
    if (this.open) {
      openedLeft(this);
      this.render();
    }
  }

  setBottom(px: number): void {
    this.root.style.bottom = Math.max(12, Math.round(px)) + 'px';
  }

  private iconSrc(k: SpellKey): HTMLCanvasElement | null {
    const tm = this.game.textures;
    const key = Tex.icon(k);
    return tm.exists(key) ? (tm.get(key).getSourceImage() as HTMLCanvasElement) : null;
  }

  /** Cost and cooldown, as talents have them now. */
  private meta(k: SpellKey): string {
    const s = this.sim;
    const cost = isSkill(k) ? SKILLS[k].c : (ACTIONS[k].c ?? 0);
    const cd = s.info(k).cd;
    const parts = [cost ? `${cost} mana` : 'no mana', cd ? `${cd} s cooldown` : 'no cooldown'];
    if (SPELLS[k].instant) parts.push('instant');
    return parts.join(' · ');
  }

  private row(k: SpellKey): HTMLElement {
    const s = this.sim;
    const info = SPELLS[k];
    const known = s.knows(k);
    const el = document.createElement('div');
    el.className = `sb-row${known ? '' : ' locked'}`;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 44;
    const src = this.iconSrc(k);
    if (src) {
      const c = cv.getContext('2d')!;
      c.imageSmoothingEnabled = false;
      c.drawImage(src, (44 - src.width * 2) / 2, (44 - src.height * 2) / 2, src.width * 2, src.height * 2);
    }
    if (known && src) {
      cv.title = 'Drag to your action bar';
      cv.addEventListener('pointerdown', e => {
        e.preventDefault();
        const bar = this.game.registry.get('hudBar') as { indexAt(x: number, y: number): number; highlight(i: number): void } | undefined;
        dragSpell(
          src,
          e,
          (x, y) => bar?.highlight(bar.indexAt(x, y)),
          (x, y) => {
            bar?.highlight(-1);
            const i = bar ? bar.indexAt(x, y) : -1;
            if (i >= 0) this.sim.setBarSlot(i, k);
          }
        );
      });
    }
    const slot = s.bar.indexOf(k);
    let status: string;
    if (info.talent) {
      const t = TALENTS[info.talent];
      status = known
        ? `<span class="sb-talent">Talent: ${t.name} (${TREES[t.tree].name})</span>`
        : `<span class="sb-lock">Learn it from the ${TREES[t.tree].name} talent ${t.name} (${t.tier * TIER_POINTS} points in ${TREES[t.tree].name})</span>`;
    } else status = known ? '' : `<span class="sb-lock">Unlocks at level ${info.level}</span>`;
    if (known) status += slot >= 0 ? `<span class="sb-bar">On your bar · key ${BAR_KEYS[slot].bind}</span>` : `<span class="sb-drag">Drag it to your bar</span>`;
    const body = document.createElement('div');
    body.innerHTML = `<b>${nameOf(k)}</b><small>${this.meta(k)}</small><p>${info.long}</p><div class="sb-status">${status}</div>`;
    el.append(cv, body);
    return el;
  }

  private render(): void {
    if (!this.open) return;
    const sec = (title: string, keys: SpellKey[], note = '') => {
      const s = document.createElement('section');
      s.innerHTML = `<h3><span>${title}</span><em>${note}</em></h3>`;
      for (const k of keys) s.append(this.row(k));
      return s;
    };
    const cls = SPELL_ORDER.filter(k => !SPELLS[k].talent);
    const sections = [sec('Warrior spells', cls, `Level ${this.sim.level}`)];
    for (const t of TREE_IDS) {
      const keys = SPELL_ORDER.filter(k => SPELLS[k].talent && TALENTS[SPELLS[k].talent!].tree === t);
      sections.push(sec(`${TREES[t].name} talents`, keys, 'from the talent tree'));
    }
    this.list.replaceChildren(...sections);
  }

  destroy(): void {
    undockLeft(this);
    window.removeEventListener('keydown', this.onKey);
    for (const off of this.offs) off();
    this.root.remove();
  }
}
