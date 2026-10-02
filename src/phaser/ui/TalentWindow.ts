import type Phaser from 'phaser';
import type { Sim } from '../../sim/Sim';
import { TALENTS, TALENT_IDS, TREES, TREE_IDS, TIERS, COLS, TIER_POINTS, xpToNext, MAX_LEVEL } from '../../data/talents';
import type { TreeId } from '../../data/talents';
import { Tex } from '../render/textures';

const CELL = 50;
const GAP = 14;

/** The texture for a talent or tree icon: 'icon:<key>' or 'item:<id>'. */
function texKey(icon: string): string {
  const [kind, id] = icon.split(':');
  return kind === 'item' ? Tex.item(id as never) : Tex.icon(id);
}

/**
 * Talents (N, or the star on the menu bar): the three trees side by side, Diablo 2 / WoW
 * style. Each talent shows its rank; a tier opens once enough points are in its tree, and
 * arrows show talents that need another one maxed first. Click to learn a rank; hover for
 * what this rank and the next one do. Reset gives every point back.
 */
export class TalentWindow {
  private readonly root: HTMLDivElement;
  private readonly tip: HTMLDivElement;
  private readonly cells = new Map<string, { el: HTMLButtonElement; rank: HTMLElement }>();
  private readonly arrows: { el: HTMLElement; req: string }[] = [];
  private readonly spentEls = new Map<TreeId, HTMLElement>();
  private readonly pointsEl: HTMLElement;
  private readonly levelEl: HTMLElement;
  private readonly resetBtn: HTMLButtonElement;
  private open = false;
  private hovered: string | null = null;
  private readonly offs: (() => void)[] = [];
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) this.toggle(false);
  };

  constructor(
    private readonly game: Phaser.Game,
    private readonly sim: Sim
  ) {
    const root = (this.root = document.createElement('div'));
    root.className = 'talents';
    root.hidden = true;
    root.innerHTML = `<header><span>Talents</span><em class="tal-level"></em><button type="button" class="inv-x" title="Close (N or Esc)">×</button></header>
      <div class="tal-trees"></div>
      <footer><span class="tal-points"></span><button type="button" class="tal-reset">Reset talents</button></footer>`;
    document.body.append(root);
    this.pointsEl = root.querySelector('.tal-points')!;
    this.levelEl = root.querySelector('.tal-level')!;
    this.resetBtn = root.querySelector('.tal-reset')!;
    this.resetBtn.addEventListener('click', () => {
      this.sim.resetTalents();
      this.resetBtn.blur();
    });
    root.querySelector('.inv-x')!.addEventListener('click', () => this.toggle(false));
    root.addEventListener('pointerdown', e => e.stopPropagation());
    const trees = root.querySelector('.tal-trees')!;
    for (const t of TREE_IDS) trees.append(this.tree(t));
    this.tip = document.createElement('div');
    this.tip.className = 'inv-tip tal-tip';
    this.tip.hidden = true;
    document.body.append(this.tip);
    this.offs.push(this.sim.events.on('talents', () => this.render()));
    this.offs.push(this.sim.events.on('level', () => this.render()));
    window.addEventListener('keydown', this.onKey);
  }

  private icon(icon: string, size: number): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const tm = this.game.textures;
    const key = texKey(icon);
    if (tm.exists(key)) {
      const src = tm.get(key).getSourceImage() as HTMLCanvasElement;
      const k = Math.max(1, Math.floor(size / Math.max(src.width, src.height)));
      const c = cv.getContext('2d')!;
      c.imageSmoothingEnabled = false;
      c.drawImage(src, Math.round((size - src.width * k) / 2), Math.round((size - src.height * k) / 2), src.width * k, src.height * k);
    }
    return cv;
  }

  private tree(t: TreeId): HTMLElement {
    const def = TREES[t];
    const box = document.createElement('section');
    box.className = `tal-tree tree-${t}`;
    const head = document.createElement('header');
    const name = document.createElement('b');
    name.textContent = def.name;
    const spent = document.createElement('em');
    this.spentEls.set(t, spent);
    head.append(this.icon(def.icon, 22), name, spent);
    const blurb = document.createElement('p');
    blurb.textContent = def.blurb;
    const grid = document.createElement('div');
    grid.className = 'tal-grid';
    grid.style.width = `${COLS * CELL + (COLS - 1) * GAP}px`;
    grid.style.height = `${TIERS * CELL + (TIERS - 1) * GAP}px`;
    // arrows first, so the talents sit on top of them
    for (const id of TALENT_IDS.filter(i => TALENTS[i].tree === t && TALENTS[i].requires)) {
      const d = TALENTS[id];
      const req = TALENTS[d.requires!];
      const a = document.createElement('i');
      a.className = 'tal-arrow';
      a.style.left = `${d.col * (CELL + GAP) + CELL / 2 - 3}px`;
      a.style.top = `${req.tier * (CELL + GAP) + CELL}px`;
      a.style.height = `${(d.tier - req.tier) * (CELL + GAP) - CELL}px`;
      grid.append(a);
      this.arrows.push({ el: a, req: d.requires! });
    }
    for (const id of TALENT_IDS.filter(i => TALENTS[i].tree === t)) {
      const d = TALENTS[id];
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'tal';
      el.style.left = `${d.col * (CELL + GAP)}px`;
      el.style.top = `${d.tier * (CELL + GAP)}px`;
      el.append(this.icon(d.icon, 44));
      const rank = document.createElement('span');
      el.append(rank);
      el.addEventListener('click', () => {
        this.sim.learnTalent(id);
        this.showTip(id);
        el.blur();
      });
      el.addEventListener('pointerenter', () => this.showTip(id));
      el.addEventListener('pointerleave', () => this.hideTip());
      grid.append(el);
      this.cells.set(id, { el, rank });
    }
    box.append(head, blurb, grid);
    return box;
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(force?: boolean): void {
    this.open = force ?? !this.open;
    this.root.hidden = !this.open;
    if (this.open) this.render();
    else this.hideTip();
  }

  private render(): void {
    if (!this.open) return;
    const s = this.sim;
    const pts = s.talentPoints;
    this.levelEl.textContent = s.level >= MAX_LEVEL ? `Level ${s.level} (max)` : `Level ${s.level} · ${s.xp} / ${xpToNext(s.level)} XP`;
    this.pointsEl.innerHTML = pts > 0 ? `<b>${pts}</b> point${pts > 1 ? 's' : ''} to spend` : 'No points to spend. Every level gives one.';
    this.resetBtn.disabled = s.talentsSpent() === 0;
    for (const t of TREE_IDS) this.spentEls.get(t)!.textContent = String(s.talentsSpent(t));
    for (const [id, v] of this.cells) {
      const d = TALENTS[id];
      const r = s.talents[id] ?? 0;
      const why = s.talentProblem(id);
      const tierOpen = s.talentsSpent(d.tree) >= d.tier * TIER_POINTS;
      const reqOk = !d.requires || (s.talents[d.requires] ?? 0) >= TALENTS[d.requires].ranks;
      v.rank.textContent = `${r}/${d.ranks}`;
      v.el.className = d.grants ? 'tal grant' : 'tal';
      if (r >= d.ranks) v.el.classList.add('max');
      else if (!tierOpen || !reqOk) v.el.classList.add('locked');
      else if (why === null) v.el.classList.add('open');
      if (r > 0 && r < d.ranks) v.el.classList.add('some');
    }
    for (const a of this.arrows) a.el.classList.toggle('lit', (s.talents[a.req] ?? 0) >= TALENTS[a.req].ranks);
    if (this.hovered) this.showTip(this.hovered);
  }

  private showTip(id: string): void {
    this.hovered = id;
    const s = this.sim;
    const d = TALENTS[id];
    const r = s.talents[id] ?? 0;
    const why = s.talentProblem(id);
    const now = r > 0 ? `<p>${d.desc(r)}</p>` : '';
    const next = r < d.ranks ? `<p class="tal-next">${r > 0 ? 'Next rank: ' : ''}${d.desc(r + 1)}</p>` : '';
    const foot = r >= d.ranks ? '' : why ? `<p class="tal-why">${why}</p>` : `<em>Click to learn</em>`;
    const grant = d.grants ? `<p class="tal-grant">✦ A new ability: it goes in your spellbook and on your bar.</p>` : '';
    this.tip.innerHTML = `<b class="${r >= d.ranks ? 'fine' : ''}">${d.name}</b><small>${TREES[d.tree].name} · Rank ${r}/${d.ranks}</small>${grant}${now}${next}${foot}`;
    this.tip.hidden = false;
    const cell = this.cells.get(id)!.el.getBoundingClientRect();
    const t = this.tip.getBoundingClientRect();
    const right = cell.right + 10 + t.width < window.innerWidth;
    this.tip.style.left = `${right ? cell.right + 10 : cell.left - 10 - t.width}px`;
    this.tip.style.top = `${Math.max(8, Math.min(window.innerHeight - t.height - 8, cell.top + cell.height / 2 - t.height / 2))}px`;
  }

  private hideTip(): void {
    this.hovered = null;
    this.tip.hidden = true;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKey);
    for (const off of this.offs) off();
    this.root.remove();
    this.tip.remove();
  }
}
