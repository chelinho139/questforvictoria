import type { Sim } from '../../sim/Sim';
import { goalTarget } from '../../sim/Sim';
import { QUESTS, QUEST_IDS } from '../../data/quests';
import { NPCS } from '../../data/npcs';
import { PIXEL_SCALE } from '../config';
import { DIAL_R } from '../render/DayDial';

/**
 * Quests on screen: a small list under the day dial (active quests and their goals).
 * Clicking it opens the quest log (J).
 */
export class QuestTracker {
  private readonly root: HTMLDivElement;
  private readonly list: HTMLElement;
  private readonly offs: (() => void)[] = [];
  private readonly onResize = () => this.position();

  constructor(
    private readonly sim: Sim,
    private readonly openLog: () => void
  ) {
    const root = (this.root = document.createElement('div'));
    root.className = 'quests';
    root.innerHTML = `<header><span>Quests</span><em>J</em></header><div class="quests-list"></div>`;
    document.body.append(root);
    this.list = root.querySelector('.quests-list')!;
    root.addEventListener('click', () => this.openLog());
    root.addEventListener('pointerdown', e => e.stopPropagation());
    // flag and collect goals move with the story and the bag, not only with quest events
    for (const ev of ['quests', 'flags', 'bag'] as const) this.offs.push(this.sim.events.on(ev, () => this.render()));
    window.addEventListener('resize', this.onResize);
    this.position();
    this.render();
  }

  /** Under the day dial and its stats box, like the dev panel. */
  private position(): void {
    const k = PIXEL_SCALE / (window.devicePixelRatio || 1);
    this.root.style.top = Math.round((16 + 2 * DIAL_R + 58) * k) + 'px';
  }

  render(): void {
    const s = this.sim;
    // my quests still to hand in (the party's progress, my own turn-in)
    const mine = QUEST_IDS.filter(id => ['active', 'ready'].includes(s.questStatus(id)));
    const active = [...mine.filter(id => QUESTS[id].main), ...mine.filter(id => !QUESTS[id].main)];
    const goals = (id: string) =>
      QUESTS[id].goals
        .map((g, i) => {
          const t = goalTarget(g);
          const n = s.goalCount(id, i);
          return `<li class="${n >= t ? 'met' : ''}">${g.label}${t > 1 ? ` ${n}/${t}` : ''}</li>`;
        })
        .join('');
    const card = (id: string) => {
      const ready = s.questStatus(id) === 'ready';
      const q = QUESTS[id];
      return `<div class="quest${ready ? ' ready' : ''}"><b>${q.name}</b><ul>${goals(id)}</ul>${
        ready ? `<i>Return to ${NPCS[s.turnInOf(id)].name}</i>` : ''
      }</div>`;
    };
    this.list.innerHTML = active.length ? active.map(card).join('') : `<p class="none">No quests. Look for a gold ! over someone's head.</p>`;
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
    for (const off of this.offs) off();
    this.root.remove();
  }
}
