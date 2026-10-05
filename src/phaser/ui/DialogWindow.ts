import type Phaser from 'phaser';
import type { Sim } from '../../sim/Sim';
import { goalTarget } from '../../sim/Sim';
import { NPCS } from '../../data/npcs';
import type { NpcId } from '../../data/npcs';
import { QUESTS } from '../../data/quests';
import { ITEMS, lootFor } from '../../data/items';
import type { ItemId } from '../../data/items';
import { itemIcon } from '../render/itemArt';
import { Tex } from '../render/textures';
import { artFrames, frameKey } from '../render/art';
import type { Sfx } from '../audio/Sfx';

type Choice = { label: string; cls?: string; act: () => void };

/**
 * Talking to someone: a box at the bottom of the screen with their portrait, what they
 * say, and your choices. Quests are offered here (Accept / Not now) and handed in here
 * (rewards shown); you can ask about their topic, if they have one. Walking away closes it.
 */
export class DialogWindow {
  private readonly root: HTMLDivElement;
  private readonly portrait: HTMLCanvasElement;
  private readonly nameEl: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly textEl: HTMLElement;
  private readonly extraEl: HTMLElement;
  private readonly choicesEl: HTMLElement;
  private npc: NpcId | null = null;
  private raf = 0;
  /** On the main menu (it refreshes when quests change, e.g. one becomes ready to hand in). */
  private atHome = false;
  private homeText = '';
  private readonly off: () => void;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.npc) this.close();
  };

  constructor(
    private readonly game: Phaser.Game,
    private readonly sim: Sim,
    private readonly sfx: Sfx,
    /** Open a trader's stall (the trade window). */
    private readonly onTrade: (id: NpcId) => void = () => {}
  ) {
    const root = (this.root = document.createElement('div'));
    root.className = 'talk';
    root.hidden = true;
    root.innerHTML = `<canvas width="66" height="66" aria-hidden="true"></canvas>
      <div class="talk-body"><header><b></b><span></span></header><p class="talk-text"></p><div class="talk-extra"></div><div class="talk-choices"></div></div>
      <button type="button" class="inv-x" title="Goodbye (Esc)">×</button>`;
    document.body.append(root);
    this.portrait = root.querySelector('canvas')!;
    this.nameEl = root.querySelector('header b')!;
    this.titleEl = root.querySelector('header span')!;
    this.textEl = root.querySelector('.talk-text')!;
    this.extraEl = root.querySelector('.talk-extra')!;
    this.choicesEl = root.querySelector('.talk-choices')!;
    root.querySelector('.inv-x')!.addEventListener('click', () => this.close());
    root.addEventListener('pointerdown', e => e.stopPropagation());
    window.addEventListener('keydown', this.onKey);
    const offQuests = this.sim.events.on('quests', () => {
      if (this.npc && this.atHome) this.home(this.homeText);
    });
    // a scene takes the stage: step out of the conversation
    const offScene = this.sim.events.on('scene', () => {
      if (this.sim.scene && this.npc) this.close();
    });
    this.off = () => (offQuests(), offScene());
  }

  get isOpen(): boolean {
    return this.npc !== null;
  }

  /** Start a conversation: an introduction the first time, then the usual greeting. */
  open(id: NpcId): void {
    this.npc = id;
    this.root.hidden = false;
    const def = NPCS[id];
    this.nameEl.textContent = def.name;
    this.titleEl.textContent = def.title;
    if (this.sim.talked(id)) this.pages(def.intro, () => this.home());
    else this.home(this.greeting(id));
    cancelAnimationFrame(this.raf);
    const tick = (now: number) => {
      if (!this.npc) return;
      // walking away ends the conversation
      if (!this.sim.nearNpc(this.npc)) {
        this.close();
        return;
      }
      this.drawPortrait(now);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  close(): void {
    this.npc = null;
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
  }

  /** The greeting that fits the story so far. */
  private greeting(id: NpcId): string {
    const def = NPCS[id];
    return def.greetings?.find(g => this.sim.check(g.when))?.text ?? def.greeting;
  }

  /** The main menu: quests to hand in first, then new ones, then ones in progress, topics, goodbye. */
  private home(text?: string): void {
    const id = this.npc;
    if (!id) return;
    const def = NPCS[id];
    const qs = this.sim.questsOf(id);
    const choices: Choice[] = [];
    for (const q of qs.filter(x => x.status === 'ready')) choices.push({ label: `? ${QUESTS[q.id].name}`, cls: 'ready', act: () => this.handIn(q.id) });
    for (const q of qs.filter(x => x.status === 'available')) choices.push({ label: `! ${QUESTS[q.id].name}`, cls: 'new', act: () => this.offer(q.id) });
    for (const q of qs.filter(x => x.status === 'active')) choices.push({ label: `${QUESTS[q.id].name} (in progress)`, act: () => this.progress(q.id) });
    if (def.shop) choices.push({ label: 'Let me see what you have.', cls: 'trade', act: () => (this.close(), this.onTrade(id)) });
    (def.topics ?? []).forEach((t, i) => {
      const asked = `asked:${id}:${i}`;
      if (!this.sim.check(t.when) || (t.once && this.sim.flags[asked])) return;
      choices.push({
        label: t.ask,
        act: () =>
          this.pages(t.pages, () => {
            this.sim.asked(id, i);
            this.home(this.greeting(id));
          }),
      });
    });
    choices.push({ label: 'Goodbye.', cls: 'bye', act: () => this.close() });
    const fallback = qs.length && qs.every(q => q.status === 'done') ? 'You have done all I could ask of you, friend. Rest when you can.' : this.greeting(id);
    this.say(text ?? fallback, choices);
    this.atHome = true;
    this.homeText = text ?? fallback;
  }

  /** Several pages of speech, then `then`. */
  private pages(list: string[], then: () => void, i = 0, extra = ''): void {
    const last = i >= list.length - 1;
    this.say(list[i], [{ label: last ? 'Continue' : 'Next', act: () => (last ? then() : this.pages(list, then, i + 1, extra)) }], last ? extra : '');
  }

  private offer(id: string): void {
    const q = QUESTS[id];
    const details = `<div class="talk-quest"><b>${q.name}</b><ul>${q.goals.map(g => `<li>${g.label}${goalTarget(g) > 1 ? ` 0/${goalTarget(g)}` : ''}</li>`).join('')}</ul>${this.rewards(q.reward.gold, q.reward.items, q.reward.xp)}</div>`;
    const accept: Choice[] = [
      { label: 'Accept', cls: 'new', act: () => (this.sim.acceptQuest(id), this.home('Good. Come back to me when it is done.')) },
      { label: 'Not now.', act: () => this.home() },
    ];
    // read through the offer, then decide
    const show = (i: number) => {
      const last = i >= q.offer.length - 1;
      this.say(q.offer[i], last ? accept : [{ label: 'Next', act: () => show(i + 1) }], last ? details : '');
    };
    show(0);
  }

  private progress(id: string): void {
    const q = QUESTS[id];
    const lines = q.goals
      .map((g, i) => {
        const t = goalTarget(g);
        const n = this.sim.goalCount(id, i);
        return `<li class="${n >= t ? 'met' : ''}">${n >= t ? '✓ ' : ''}${g.label}${t > 1 ? ` ${n}/${t}` : ''}</li>`;
      })
      .join('');
    this.say(q.waiting, [{ label: 'Back', act: () => this.home() }], `<div class="talk-quest"><b>${q.name}</b><ul>${lines}</ul></div>`);
  }

  private handIn(id: string): void {
    const q = QUESTS[id];
    if (!this.sim.completeQuest(id)) return this.home();
    this.say(q.done, [{ label: 'Thank you.', act: () => this.home() }], `<div class="talk-quest done"><b>Quest complete: ${q.name}</b>${this.rewards(q.reward.gold, q.reward.items, q.reward.xp)}</div>`);
  }

  private rewards(gold: number, items: ItemId[], xp = 0): string {
    // what this hero's class would get (a Warden's blade is a longbow for an archer)
    const parts = items.map(it => lootFor(it, this.sim.cls)).map(i => `<span class="reward"><canvas data-item="${i}" width="22" height="22"></canvas>${ITEMS[i].name}</span>`);
    if (gold) parts.unshift(`<span class="reward gold">${gold} gold</span>`);
    if (xp) parts.unshift(`<span class="reward xp">${xp} XP</span>`);
    return `<div class="talk-rewards"><em>Reward:</em> ${parts.join('')}</div>`;
  }

  private say(text: string, choices: Choice[], extra = ''): void {
    this.atHome = false;
    this.textEl.textContent = text;
    // each line in their own voice
    if (this.npc) this.sfx.say(`${this.npc}Voice`);
    this.extraEl.innerHTML = extra;
    this.extraEl.querySelectorAll<HTMLCanvasElement>('canvas[data-item]').forEach(cv => {
      const c = cv.getContext('2d')!;
      c.imageSmoothingEnabled = false;
      c.drawImage(itemIcon(cv.dataset.item as ItemId), 0, 0);
    });
    this.choicesEl.replaceChildren(
      ...choices.map(ch => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = ch.label;
        if (ch.cls) b.className = ch.cls;
        b.addEventListener('click', () => {
          b.blur();
          ch.act();
        });
        return b;
      })
    );
  }

  /** The speaker's idle animation, at 2×, from the live texture (so it matches the art style). */
  private drawPortrait(now: number): void {
    if (!this.npc) return;
    const tm = this.game.textures;
    const key = Tex.npc(this.npc);
    if (!tm.exists(key)) return;
    const fk = frameKey(key, Math.floor(now / 420) % Math.max(1, artFrames(key)));
    const src = (tm.exists(fk) ? tm.get(fk) : tm.get(key)).getSourceImage() as HTMLCanvasElement;
    const c = this.portrait.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, 66, 66);
    // head and shoulders, 2×
    const sw = Math.min(src.width, 33);
    c.drawImage(src, Math.round((src.width - sw) / 2) - 2, 0, sw, 33, 0, 0, sw * 2, 66);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.off();
    window.removeEventListener('keydown', this.onKey);
    this.root.remove();
  }
}
