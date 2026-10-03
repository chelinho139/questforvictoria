import type { Sim } from '../../sim/Sim';
import { goalTarget } from '../../sim/Sim';
import { QUESTS, QUEST_IDS } from '../../data/quests';
import { NPCS } from '../../data/npcs';
import { ITEMS } from '../../data/items';
import type { ItemId } from '../../data/items';
import { itemIcon } from '../render/itemArt';
import { dockLeft, undockLeft, openedLeft } from './panels';
import { DOCS, DOC_KINDS } from '../../data/docs';
import type { DocKind } from '../../data/docs';

/**
 * The quest log (J, or the scroll on the menu bar), docked on the left. The Quests tab:
 * quests in progress with their story, goals and rewards; quests waiting to be picked up
 * and who gives them; and the ones you have finished. The Journal tab: every document
 * found (diary pages, letters, proclamations, notes, lace), to read again.
 */
export class QuestWindow {
  private readonly root: HTMLDivElement;
  private readonly list: HTMLElement;
  private open = false;
  private tab: 'quests' | 'journal' = 'quests';
  /** The document being read in the Journal tab. */
  private reading: string | null = null;
  private readonly tabsEl: HTMLElement;
  private readonly offs: (() => void)[] = [];
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) this.toggle(false);
  };

  constructor(private readonly sim: Sim) {
    const root = (this.root = document.createElement('div'));
    root.className = 'craft qlog';
    root.hidden = true;
    root.innerHTML = `<header><span>Quests</span><button type="button" class="inv-x" title="Close (J or Esc)">×</button></header><nav class="qtabs"></nav><div class="craft-list"></div><footer>Quests come from people with a gold ! over their head.</footer>`;
    document.body.append(root);
    this.list = root.querySelector('.craft-list')!;
    this.tabsEl = root.querySelector('.qtabs')!;
    root.querySelector('.inv-x')!.addEventListener('click', () => this.toggle(false));
    root.addEventListener('pointerdown', e => e.stopPropagation());
    this.list.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-doc]');
      if (b) {
        this.reading = b.dataset.doc ?? null;
        if (this.reading) this.sim.readDoc(this.reading);
        this.render();
      } else if ((e.target as HTMLElement).closest('.doc-back')) {
        this.reading = null;
        this.render();
      }
    });
    for (const ev of ['quests', 'bag', 'flags', 'journal'] as const) this.offs.push(this.sim.events.on(ev, () => this.render()));
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

  /** Keep the panel above the action bar (bottom in CSS pixels). */
  setBottom(px: number): void {
    this.root.style.bottom = Math.max(12, Math.round(px)) + 'px';
  }

  /** Show a tab (the Journal opens on a document when given one). */
  show(tab: 'quests' | 'journal', doc?: string): void {
    this.tab = tab;
    this.reading = doc ?? null;
    if (doc) this.sim.readDoc(doc);
    this.toggle(true);
    this.render();
  }

  private renderTabs(): void {
    const unread = this.sim.journal.filter(id => !this.sim.flags['read:' + id]).length;
    this.tabsEl.innerHTML = `<button type="button" data-tab="quests" class="${this.tab === 'quests' ? 'on' : ''}">Quests</button><button type="button" data-tab="journal" class="${this.tab === 'journal' ? 'on' : ''}">Journal <em>${this.sim.journal.length}</em>${unread ? '<i class="dot"></i>' : ''}</button>`;
    this.tabsEl.querySelectorAll<HTMLButtonElement>('button').forEach(b =>
      b.addEventListener('click', () => {
        this.tab = b.dataset.tab as 'quests' | 'journal';
        this.reading = null;
        b.blur();
        this.render();
      })
    );
    this.root.querySelector('header span')!.textContent = this.tab === 'quests' ? 'Quests' : 'Journal';
    this.root.querySelector('footer')!.textContent = this.tab === 'quests' ? 'Quests come from people with a gold ! over their head.' : 'Everything you find to read is kept here.';
  }

  private renderJournal(): void {
    const s = this.sim;
    if (this.reading && DOCS[this.reading]) {
      const d = DOCS[this.reading];
      this.list.innerHTML = `<button type="button" class="doc-back">← All documents</button><article class="doc doc-${d.kind}"><h4>${d.title}</h4>${d.from ? `<small>${d.from}</small>` : ''}${d.text.map(p => `<p>${p}</p>`).join('')}</article>`;
      return;
    }
    if (!s.journal.length) {
      this.list.innerHTML = `<p class="qnone">Nothing yet. Pages, letters and notes you find will be kept here.</p>`;
      return;
    }
    const kinds = Object.keys(DOC_KINDS) as DocKind[];
    this.list.innerHTML = kinds
      .map(k => {
        const ids = s.journal.filter(id => DOCS[id]?.kind === k);
        if (!ids.length) return '';
        const rows = ids.map(id => `<button type="button" class="doc-row${s.flags['read:' + id] ? '' : ' new'}" data-doc="${id}"><b>${DOCS[id].title}</b>${DOCS[id].from ? `<small>${DOCS[id].from}</small>` : ''}</button>`).join('');
        return `<section><h3><span>${DOC_KINDS[k]}</span><em>${ids.length}</em></h3>${rows}</section>`;
      })
      .join('');
  }

  private render(): void {
    if (!this.open) return;
    this.renderTabs();
    if (this.tab === 'journal') return this.renderJournal();
    const s = this.sim;
    const by = (st: string) => QUEST_IDS.filter(id => s.questStatus(id) === st);
    const main = (ids: string[]) => [...ids.filter(id => QUESTS[id].main), ...ids.filter(id => !QUESTS[id].main)];
    const active = main([...by('ready'), ...by('active')]);
    const available = by('available');
    const done = by('done');
    const locked = by('locked').length;
    const rewards = (id: string) => {
      const r = QUESTS[id].reward;
      const items = r.items.map(i => `<span class="reward"><canvas data-item="${i}" width="22" height="22"></canvas>${ITEMS[i].name}</span>`).join('');
      return `<div class="talk-rewards"><em>Reward:</em> ${r.xp ? `<span class="reward xp">${r.xp} XP</span>` : ''}${r.gold ? `<span class="reward gold">${r.gold} gold</span>` : ''}${items}</div>`;
    };
    const card = (id: string) => {
      const q = QUESTS[id];
      const st = s.questStatus(id);
      const giver = NPCS[q.giver].name;
      const turnIn = NPCS[s.turnInOf(id)].name;
      const goals =
        st === 'available'
          ? ''
          : `<ul>${q.goals
              .map((g, i) => {
                const t = goalTarget(g);
                const n = s.goalCount(id, i);
                return `<li class="${n >= t ? 'met' : ''}">${n >= t ? '✓ ' : ''}${g.label}${t > 1 ? ` ${n}/${t}` : ''}</li>`;
              })
              .join('')}</ul>`;
      const note = st === 'ready' ? `<i class="go">Done! Go to ${turnIn} to hand it in.</i>` : st === 'available' ? `<i>Talk to ${giver} to start it.</i>` : `<i>From ${giver}</i>`;
      return `<div class="qcard ${st}"><b>${st === 'ready' ? '? ' : st === 'available' ? '! ' : ''}${q.name}</b><p>${q.summary}</p>${goals}${rewards(id)}${note}</div>`;
    };
    const sec = (title: string, body: string, n?: number) => `<section><h3><span>${title}</span><em>${n ?? ''}</em></h3>${body}</section>`;
    let html = sec('In progress', active.length ? active.map(card).join('') : `<p class="qnone">Nothing right now.</p>`, active.length);
    if (available.length) html += sec('To pick up', available.map(card).join(''), available.length);
    html += sec(
      'Completed',
      (done.length ? done.map(id => `<div class="qdone">✓ ${QUESTS[id].name}</div>`).join('') : `<p class="qnone">None yet.</p>`) +
        (locked ? `<p class="qnone">${locked} more quest${locked > 1 ? 's' : ''} will open up as you go.</p>` : ''),
      done.length
    );
    this.list.innerHTML = html;
    this.list.querySelectorAll<HTMLCanvasElement>('canvas[data-item]').forEach(cv => {
      const c = cv.getContext('2d')!;
      c.imageSmoothingEnabled = false;
      c.drawImage(itemIcon(cv.dataset.item as ItemId), 0, 0);
    });
  }

  destroy(): void {
    undockLeft(this);
    window.removeEventListener('keydown', this.onKey);
    for (const off of this.offs) off();
    this.root.remove();
  }
}
