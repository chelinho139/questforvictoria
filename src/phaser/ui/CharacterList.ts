import { CHAR_MAX } from '../../net/protocol';
import type { CharInfo } from '../../net/protocol';
import { HD_HERO_IDS } from '../render/art';
import type { HdHeroId, HeroCanvases } from '../render/hdHeroes';
import { heroArt, paint } from './NewCharacter';
import { esc } from './html';
import { CLASSES } from '../../data/classes';
import { DIFFICULTIES } from '../../data/difficulty';
import { getLang, keepNames } from '../../i18n';

const when = (ms: number) =>
  ms
    ? 'played ' + new Date(ms).toLocaleString(getLang(), { dateStyle: 'medium', timeStyle: 'short' })
    : 'not played yet';

export interface CharacterListOpts {
  /** 'Single Player' or 'Multi Player', for the title. */
  mode: string;
  /** The line over the cards, with characters and without. */
  intro: { some: string; none: string };
  onNew: () => void;
  onDelete: (ch: CharInfo) => void;
  onPlay: (ch: CharInfo) => void;
  onBack: () => void;
}

/**
 * Your characters, the same for single player and multi player (Diablo II's character
 * screen): a card per character, playing their idle animation in their own look and gear,
 * with level, place and when they last played; a card to make a new one; Delete (asks once
 * more), Play and Back. Arrow keys pick, Enter plays, Esc goes back.
 */
export class CharacterList {
  private root: HTMLDivElement | null = null;
  private raf = 0;
  private chars: CharInfo[] = [];
  private sel = 0;
  private confirmDelete = false;
  private cards: { cv: HTMLCanvasElement; ch: CharInfo }[] = [];
  private readonly art = new Map<string, HeroCanvases>();
  private status!: HTMLElement;
  private grid!: HTMLElement;
  private foot!: HTMLElement;
  private readonly onKey = (e: KeyboardEvent) => {
    if (!this.root || this.root.hidden) return;
    if (document.activeElement instanceof HTMLInputElement) return;
    const n = this.chars.length;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 }[e.key];
    if (step && n) {
      e.preventDefault();
      this.select(Math.min(n - 1, Math.max(0, this.sel + step)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.play();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.opts.onBack();
    }
  };

  constructor(private readonly opts: CharacterListOpts) {}

  open(): void {
    const root = document.createElement('div');
    root.className = 'select';
    root.innerHTML = `
      <div class="select-panel" role="dialog" aria-labelledby="chars-title">
        <header id="chars-title">${esc(this.opts.mode)} · Your characters</header>
        <div class="lobby-body">
          <p class="lobby-status" role="status"></p>
          <div class="select-grid lobby-chars" role="listbox" aria-label="Your characters"></div>
        </div>
        <footer></footer>
      </div>`;
    document.body.append(root);
    this.root = root;
    this.status = root.querySelector('.lobby-status')!;
    this.grid = root.querySelector('.lobby-chars')!;
    this.foot = root.querySelector('footer')!;
    window.addEventListener('keydown', this.onKey);
    this.render();
    const tick = (now: number) => {
      this.draw(now);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** New characters to show; `select` picks one (the one just made). */
  setChars(chars: CharInfo[], select?: string): void {
    const keep = select ?? this.chars[this.sel]?.id;
    this.chars = chars;
    keepNames(...chars.map(c => c.name));
    const i = chars.findIndex(c => c.id === keep);
    this.sel = i >= 0 ? i : Math.min(this.sel, Math.max(0, chars.length - 1));
    this.render();
  }

  setStatus(text: string, bad = false): void {
    if (!this.root) return;
    this.status.textContent = text;
    this.status.classList.toggle('bad', bad);
  }

  /** While another screen is over it (making a character, the rooms). */
  hide(): void {
    if (this.root) this.root.hidden = true;
  }

  show(): void {
    if (this.root) this.root.hidden = false;
  }

  private render(): void {
    if (!this.root) return;
    this.confirmDelete = false;
    this.setStatus(this.chars.length ? this.opts.intro.some : this.opts.intro.none);
    this.grid.innerHTML = '';
    this.cards = [];
    this.chars.forEach((ch, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'select-card lobby-char';
      b.setAttribute('role', 'option');
      const cv = document.createElement('canvas');
      cv.width = 96;
      cv.height = 96;
      b.append(cv);
      // (how hard their campaign is, unless it's normal)
      const hard = ch.difficulty && ch.difficulty !== 'normal' ? `<small>${DIFFICULTIES[ch.difficulty].name}</small>` : '';
      b.insertAdjacentHTML(
        'beforeend',
        `<span translate="no">${esc(ch.name)}</span><small>Level ${ch.level} ${CLASSES[ch.cls]?.name ?? 'Warrior'}</small>${hard}<small>${esc(ch.place)}</small><small>${ch.busy ? 'playing right now' : when(ch.at)}</small>`
      );
      b.addEventListener('click', () => this.select(i));
      b.addEventListener('dblclick', () => this.play());
      this.grid.append(b);
      this.cards.push({ cv, ch });
    });
    if (this.chars.length < CHAR_MAX) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'select-card lobby-new';
      b.innerHTML = '<b>+</b><span>New character</span>';
      b.addEventListener('click', () => this.opts.onNew());
      this.grid.append(b);
    }
    this.foot.innerHTML = `<button type="button" class="lobby-back">← Back</button>${
      this.chars.length
        ? '<button type="button" class="lobby-del">Delete</button><button type="button" class="select-go lobby-play">Play ▸</button>'
        : ''
    }`;
    this.foot.querySelector('.lobby-back')!.addEventListener('click', () => this.opts.onBack());
    this.foot.querySelector('.lobby-del')?.addEventListener('click', () => this.remove());
    this.foot.querySelector('.lobby-play')?.addEventListener('click', () => this.play());
    this.select(this.sel);
  }

  private select(i: number): void {
    this.sel = i;
    this.confirmDelete = false;
    this.grid
      .querySelectorAll('.lobby-char')
      .forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    const ch = this.chars[i];
    const del = this.foot.querySelector<HTMLButtonElement>('.lobby-del');
    if (del) {
      del.textContent = 'Delete';
      del.classList.remove('warn');
    }
    const play = this.foot.querySelector<HTMLButtonElement>('.lobby-play');
    if (play) {
      play.disabled = !ch || ch.busy;
      play.textContent = ch ? `Play ${ch.name} ▸` : 'Play ▸';
    }
  }

  private remove(): void {
    const ch = this.chars[this.sel];
    if (!ch) return;
    const del = this.foot.querySelector<HTMLButtonElement>('.lobby-del')!;
    // asks once more, on the button itself
    if (!this.confirmDelete) {
      this.confirmDelete = true;
      del.textContent = `Delete ${ch.name} for good?`;
      del.classList.add('warn');
      return;
    }
    this.opts.onDelete(ch);
  }

  private play(): void {
    const ch = this.chars[this.sel];
    if (ch && !ch.busy) this.opts.onPlay(ch);
  }

  /** The cards' idle animations, in each character's own look and gear. */
  private draw(now: number): void {
    if (!this.root || this.root.hidden) return;
    for (const { cv, ch } of this.cards) {
      const key = ch.look + '|' + Object.values(ch.equip).join(',');
      let a = this.art.get(key);
      if (!a) {
        const look = (HD_HERO_IDS as string[]).includes(ch.look)
          ? (ch.look as HdHeroId)
          : HD_HERO_IDS[0];
        a = heroArt(look, ch.equip);
        this.art.set(key, a);
      }
      const idle = a.anims.idle;
      paint(cv, idle[Math.floor(now / 380) % idle.length], 2);
    }
  }

  close(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    this.root?.remove();
    this.root = null;
  }
}
